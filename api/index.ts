import express, { type NextFunction, type Request, type Response } from 'express';
import {
  computeOrderMetrics,
  extractShopifyTrackingInfo,
  shouldAutoDispatchPoll,
  shouldAutoSendTracking,
  shouldPreserveRecentLocalNote,
} from '../src/lib/orderRules.js';
import type { AppSettings, OrderRecord } from '../src/lib/types.js';
import {
  hasLiveShopifyCredentials,
  parseShopifyRawOrder,
  testShopifyConnection,
  updateShopifyOrderNote,
  verifyShopifyWebhookHmac,
  type ShopifyRawOrder,
} from '../server/shopify.js';
import { store } from '../server/store.js';
import { syncShopifyOrdersNow } from '../server/sync.js';
import { whatsappManager } from '../server/whatsapp.js';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const app = express();

app.use(
  express.json({
    verify: (req: RawBodyRequest, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/api/health', async (_req: Request, res: Response) => {
  await store.ensureHydrated();
  res.json({
    ok: true,
    whatsappStatus: whatsappManager.getState().status,
    cloudSyncEnabled: store.isCloudSyncEnabled(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/dashboard', async (_req: Request, res: Response) => {
  await store.ensureHydrated();
  if (hasLiveShopifyCredentials(store.getSettings())) {
    await syncShopifyOrdersNow('auto');
    await store.flushRemote();
  }
  const orders = store.getOrders();
  res.json({
    orders,
    whatsapp: whatsappManager.getState(),
    settings: store.getSettings(),
    metrics: computeOrderMetrics(orders),
    cloudSyncEnabled: store.isCloudSyncEnabled(),
    serverTime: new Date().toISOString(),
  });
});

app.post('/api/whatsapp/connect', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const mode = req.body?.mode as AppSettings['whatsappMode'] | undefined;
  const fresh = Boolean(req.body?.fresh);
  const state = await whatsappManager.connect(mode, { fresh, waitForQr: true });
  res.json({ whatsapp: state });
});

app.post('/api/whatsapp/pairing-code', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const phoneNumber = String(req.body?.phoneNumber || '');
  const state = await whatsappManager.requestPairingCode(phoneNumber);
  res.status(state.lastError ? 400 : 200).json({ whatsapp: state });
});

app.post('/api/whatsapp/restart', async (_req: Request, res: Response) => {
  await store.ensureHydrated();
  const currentMode = store.getWhatsAppMeta().mode;
  const state = await whatsappManager.connect(currentMode, { waitForQr: true });
  res.json({ whatsapp: state });
});

app.post('/api/whatsapp/disconnect', async (_req: Request, res: Response) => {
  const state = await whatsappManager.disconnect(true);
  res.json({ whatsapp: state });
});

app.post('/api/whatsapp/pause', async (_req: Request, res: Response) => {
  const state = await whatsappManager.disconnect(false);
  res.json({ whatsapp: state });
});

app.post('/api/settings', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const body = (req.body || {}) as Partial<AppSettings>;
  const cur = store.getSettings();
  const updated = store.updateSettings({
    shopName: body.shopName ?? cur.shopName,
    shopifyStoreDomain: body.shopifyStoreDomain ?? cur.shopifyStoreDomain,
    shopifyClientId: body.shopifyClientId ?? cur.shopifyClientId,
    shopifyClientSecret: body.shopifyClientSecret ?? cur.shopifyClientSecret,
    shopifyAccessToken: body.shopifyAccessToken ?? cur.shopifyAccessToken,
    shopifyWebhookSecret: body.shopifyWebhookSecret ?? cur.shopifyWebhookSecret,
    whatsappMode: body.whatsappMode ?? cur.whatsappMode,
    defaultCountryCode: body.defaultCountryCode ?? cur.defaultCountryCode,
    autoSendPollOnNewOrder:
      typeof body.autoSendPollOnNewOrder === 'boolean'
        ? body.autoSendPollOnNewOrder
        : cur.autoSendPollOnNewOrder,
    autoCancelInShopify:
      typeof body.autoCancelInShopify === 'boolean'
        ? body.autoCancelInShopify
        : cur.autoCancelInShopify,
    autoSendTrackingMessage:
      typeof body.autoSendTrackingMessage === 'boolean'
        ? body.autoSendTrackingMessage
        : cur.autoSendTrackingMessage,
    pollMessageTemplate: body.pollMessageTemplate ?? cur.pollMessageTemplate,
    confirmOptionLabel: body.confirmOptionLabel ?? cur.confirmOptionLabel,
    cancelOptionLabel: body.cancelOptionLabel ?? cur.cancelOptionLabel,
    waitingTag: body.waitingTag ?? cur.waitingTag,
    confirmTag: body.confirmTag ?? cur.confirmTag,
    cancelTag: body.cancelTag ?? cur.cancelTag,
    confirmReplyMessage: body.confirmReplyMessage ?? cur.confirmReplyMessage,
    cancelReplyMessage: body.cancelReplyMessage ?? cur.cancelReplyMessage,
    trackingMessageTemplate: body.trackingMessageTemplate ?? cur.trackingMessageTemplate,
    syncStartDate: body.syncStartDate ?? cur.syncStartDate,
  });
  await store.flushRemote();
  res.json({ settings: updated });
});

app.post('/api/shopify/test', async (_req: Request, res: Response) => {
  await store.ensureHydrated();
  const result = await testShopifyConnection(store.getSettings());
  res.status(result.ok ? 200 : 400).json(result);
});

app.post('/api/shopify/sync', async (_req: Request, res: Response) => {
  const result = await syncShopifyOrdersNow('manual');
  await store.flushRemote();
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  const orders = store.getOrders();
  res.json({
    ok: true,
    importedCount: result.importedCount,
    dispatchedCount: result.dispatchedCount,
    orders,
    metrics: computeOrderMetrics(orders),
  });
});

app.post('/api/webhooks/shopify/orders-create', async (req: RawBodyRequest, res: Response) => {
  await store.ensureHydrated();
  const settings = store.getSettings();
  const hmac = req.header('X-Shopify-Hmac-Sha256');
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const secret = settings.shopifyWebhookSecret || settings.shopifyClientSecret;

  if (!verifyShopifyWebhookHmac(rawBody, hmac, secret)) {
    res.status(401).json({ error: 'Invalid Shopify HMAC signature' });
    return;
  }

  const payload = (req.body || {}) as ShopifyRawOrder;
  if (!payload.id) {
    res.status(400).json({ error: 'Missing Shopify order id' });
    return;
  }

  const existing = store.getOrderByShopifyId(String(payload.id));
  if (existing) {
    res.json({ ok: true, duplicate: true, order: existing });
    return;
  }

  const order: OrderRecord = parseShopifyRawOrder(payload, settings);
  store.upsertOrder(order);

  if (shouldAutoDispatchPoll(order, settings)) {
    await whatsappManager.dispatchOrderPoll(order);
  }
  await store.flushRemote();

  res.status(200).json({ ok: true, order: store.getOrderById(order.id) });
});

app.post('/api/webhooks/shopify/orders-updated', async (req: RawBodyRequest, res: Response) => {
  await store.ensureHydrated();
  const settings = store.getSettings();
  const hmac = req.header('X-Shopify-Hmac-Sha256');
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const secret = settings.shopifyWebhookSecret || settings.shopifyClientSecret;

  if (!verifyShopifyWebhookHmac(rawBody, hmac, secret)) {
    res.status(401).json({ error: 'Invalid Shopify HMAC signature' });
    return;
  }

  const payload = (req.body || {}) as ShopifyRawOrder;
  if (!payload.id) {
    res.status(400).json({ error: 'Missing Shopify order id' });
    return;
  }

  const tracking = extractShopifyTrackingInfo(payload);
  const parsed = parseShopifyRawOrder(payload, settings);
  const existing = store.getOrderByShopifyId(String(payload.id));

  if (!existing) {
    store.upsertOrder(parsed);
    if (shouldAutoDispatchPoll(parsed, settings)) {
      await whatsappManager.dispatchOrderPoll(parsed);
    }
    if (whatsappManager.isConnected() && shouldAutoSendTracking(undefined, parsed, settings, tracking.fulfilledAt)) {
      await whatsappManager.dispatchTrackingMessage(parsed);
    }
    await store.flushRemote();
    res.status(200).json({ ok: true, order: store.getOrderById(parsed.id) });
    return;
  }

  const prevSnapshot = {
    trackingUrl: existing.trackingUrl,
    trackingNumber: existing.trackingNumber,
    trackingSentValue: existing.trackingSentValue,
  };
  if (payload.tags !== undefined) existing.shopifyTags = payload.tags;
  if (!shouldPreserveRecentLocalNote(existing) && payload.note !== undefined) {
    existing.orderNote = parsed.orderNote;
  }
  if (parsed.fulfillmentStatus !== undefined) existing.fulfillmentStatus = parsed.fulfillmentStatus;
  if (parsed.shipmentStatus !== undefined) existing.shipmentStatus = parsed.shipmentStatus;
  if (parsed.fulfilledAt) existing.fulfilledAt = parsed.fulfilledAt;
  if (parsed.trackingUrl) existing.trackingUrl = parsed.trackingUrl;
  if (parsed.trackingNumber) existing.trackingNumber = parsed.trackingNumber;
  if (parsed.trackingCompany) existing.trackingCompany = parsed.trackingCompany;
  store.upsertOrder(existing);

  if (whatsappManager.isConnected() && shouldAutoDispatchPoll(existing, settings)) {
    await whatsappManager.dispatchOrderPoll(existing);
  }

  if (
    whatsappManager.isConnected() &&
    shouldAutoSendTracking(prevSnapshot, existing, settings, tracking.fulfilledAt)
  ) {
    await whatsappManager.dispatchTrackingMessage(existing);
  }

  await store.flushRemote();
  res.status(200).json({ ok: true, order: store.getOrderById(existing.id) });
});

app.post('/api/orders/:id/resend-poll', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const order = store.getOrderById(String(req.params.id));
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const updated = await whatsappManager.dispatchOrderPoll(order);
  await store.flushRemote();
  const allOrders = store.getOrders();
  res.json({
    ok: true,
    order: updated,
    orders: allOrders,
    metrics: computeOrderMetrics(allOrders),
  });
});

app.post('/api/orders/:id/send-tracking', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const order = store.getOrderById(String(req.params.id));
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (!order.trackingUrl && !order.trackingNumber) {
    res.status(400).json({ error: 'No tracking link or tracking number found on this order yet.' });
    return;
  }
  const updated = await whatsappManager.dispatchTrackingMessage(order);
  await store.flushRemote();
  const allOrders = store.getOrders();
  res.json({
    ok: true,
    order: updated,
    orders: allOrders,
    metrics: computeOrderMetrics(allOrders),
  });
});

app.post('/api/orders/:id/vote', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const option = String(req.body?.option || '');
  const updated = await whatsappManager.applyVoteToOrder(
    String(req.params.id),
    option,
    'manual'
  );
  if (!updated) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  await store.flushRemote();
  const allOrders = store.getOrders();
  res.json({
    ok: true,
    order: updated,
    orders: allOrders,
    metrics: computeOrderMetrics(allOrders),
  });
});

app.post('/api/orders/:id/remark', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const order = store.getOrderById(String(req.params.id));
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const rawRemark = typeof req.body?.remark === 'string'
    ? req.body.remark
    : typeof req.body?.note === 'string'
      ? req.body.note
      : '';
  const cleanRemark = rawRemark.trim();

  order.orderNote = cleanRemark;
  order.noteUpdatedAt = new Date().toISOString();
  store.upsertOrder(order);

  const settings = store.getSettings();
  const shopifyResult = await updateShopifyOrderNote(
    settings,
    order.shopifyOrderId,
    cleanRemark
  );

  if (shopifyResult.synced) {
    order.shopifySynced = true;
    store.upsertOrder(order);
  }

  const preview = cleanRemark.length > 100 ? `${cleanRemark.slice(0, 100)}…` : cleanRemark;
  store.appendOrderEvent(order.id, {
    actor: 'system',
    message: cleanRemark
      ? shopifyResult.synced
        ? `Remark saved & synced to Shopify Notes: "${preview}"`
        : `Remark saved locally${shopifyResult.error ? ` (Shopify Notes sync issue: ${shopifyResult.error})` : ''}: "${preview}"`
      : shopifyResult.synced
        ? 'Order remark cleared in dashboard & Shopify Notes'
        : `Order remark cleared locally${shopifyResult.error ? ` (Shopify Notes sync issue: ${shopifyResult.error})` : ''}`,
  });

  await store.flushRemote();
  const allOrders = store.getOrders();
  res.json({
    ok: true,
    shopifySynced: shopifyResult.synced,
    shopifyError: shopifyResult.error,
    order: store.getOrderById(order.id),
    orders: allOrders,
    metrics: computeOrderMetrics(allOrders),
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

export default app;
