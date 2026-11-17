import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  computeOrderMetrics,
  detectHostRuntimeKind,
  extractShopifyTrackingInfo,
  shouldAutoDispatchPoll,
  shouldAutoSendTracking,
  shouldPreserveRecentLocalNote,
} from './src/lib/orderRules.js';
import type { AppSettings } from './src/lib/types.js';
import {
  hasLiveShopifyCredentials,
  parseShopifyRawOrder,
  testShopifyConnection,
  updateShopifyOrderNote,
  verifyShopifyWebhookHmac,
  type ShopifyRawOrder,
} from './server/shopify.js';
import {
  hasDelhiveryCredentials,
  importDelhiveryBillingCsvToOrders,
  syncDelhiveryOrdersNow,
  testDelhiveryConnection,
} from './server/delhivery.js';
import { store } from './server/store.js';
import { registerDashboardAuth } from './server/auth.js';
import { registerGeoSeoRoutes } from './server/geoSeoRoutes.js';
import { registerStorefrontRoutes } from './server/storefront.js';
import { syncShopifyOrdersNow } from './server/sync.js';
import { whatsappManager } from './server/whatsapp.js';

const PORT = Number(process.env.PORT) || 3000;

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

async function startServer() {
  await store.ensureHydrated(true);

  const app = express();

  app.use(
    express.json({
      limit: '4mb',
      verify: (req: RawBodyRequest, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Protect all admin / dashboard / mutation /api/* routes with password lock (storefront & proxy remain public)
  registerDashboardAuth(app);

  // Healthcheck for uptime monitors (UptimeRobot / Cron-Job.org 24/7 keep-alive)
  app.get('/api/health', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    res.json({
      ok: true,
      whatsappStatus: whatsappManager.getState().status,
      cloudSyncEnabled: store.isCloudSyncEnabled(),
      timestamp: new Date().toISOString(),
    });
  });

  // Full dashboard snapshot (shared across all devices)
  app.get('/api/dashboard', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    if (hasLiveShopifyCredentials(store.getSettings())) {
      void syncShopifyOrdersNow('auto');
    }
    const orders = store.getOrders();
    res.json({
      orders,
      whatsapp: whatsappManager.getState(),
      settings: store.getSettings(),
      metrics: computeOrderMetrics(orders),
      products: store.getProducts(),
      storefrontConfig: store.getStorefrontConfig(),
      geoSeoConfig: store.getGeoSeoConfig(),
      cloudSyncEnabled: store.isCloudSyncEnabled(),
      serverTime: new Date().toISOString(),
    });
  });

  registerStorefrontRoutes(app);
  registerGeoSeoRoutes(app);

  // WhatsApp QR / Session controls
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
    const runtime = detectHostRuntimeKind();
    if (runtime === 'railway' || runtime === 'cloud') {
      res.json({ whatsapp: whatsappManager.getState() });
      return;
    }
    const state = await whatsappManager.disconnect(false);
    res.json({ whatsapp: state });
  });

  // Save Shopify & Poll automation settings
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
      delhiveryApiToken: body.delhiveryApiToken ?? cur.delhiveryApiToken,
      delhiveryPickupPincode: body.delhiveryPickupPincode ?? cur.delhiveryPickupPincode,
      delhiveryBillingMode:
        body.delhiveryBillingMode === 'S' || body.delhiveryBillingMode === 'E'
          ? body.delhiveryBillingMode
          : cur.delhiveryBillingMode,
      delhiveryDefaultWeightGrams:
        typeof body.delhiveryDefaultWeightGrams === 'number' &&
        Number.isFinite(body.delhiveryDefaultWeightGrams)
          ? Math.max(50, body.delhiveryDefaultWeightGrams)
          : cur.delhiveryDefaultWeightGrams,
      cogsPercent:
        typeof body.cogsPercent === 'number' && Number.isFinite(body.cogsPercent)
          ? Math.max(0, Math.min(100, body.cogsPercent))
          : cur.cogsPercent,
      packagingCostPerOrder:
        typeof body.packagingCostPerOrder === 'number' &&
        Number.isFinite(body.packagingCostPerOrder)
          ? Math.max(0, body.packagingCostPerOrder)
          : cur.packagingCostPerOrder,
      fallbackForwardShippingCost:
        typeof body.fallbackForwardShippingCost === 'number' &&
        Number.isFinite(body.fallbackForwardShippingCost)
          ? Math.max(0, body.fallbackForwardShippingCost)
          : cur.fallbackForwardShippingCost,
      fallbackRtoShippingCost:
        typeof body.fallbackRtoShippingCost === 'number' &&
        Number.isFinite(body.fallbackRtoShippingCost)
          ? Math.max(0, body.fallbackRtoShippingCost)
          : cur.fallbackRtoShippingCost,
      fallbackCodFee:
        typeof body.fallbackCodFee === 'number' && Number.isFinite(body.fallbackCodFee)
          ? Math.max(0, body.fallbackCodFee)
          : cur.fallbackCodFee,
      prepaidGatewayPercent:
        typeof body.prepaidGatewayPercent === 'number' &&
        Number.isFinite(body.prepaidGatewayPercent)
          ? Math.max(0, Math.min(25, body.prepaidGatewayPercent))
          : cur.prepaidGatewayPercent,
      marketingCostPerOrder:
        typeof body.marketingCostPerOrder === 'number' &&
        Number.isFinite(body.marketingCostPerOrder)
          ? Math.max(0, body.marketingCostPerOrder)
          : cur.marketingCostPerOrder,
      dailyMetaAdsSpend:
        typeof body.dailyMetaAdsSpend === 'number' &&
        Number.isFinite(body.dailyMetaAdsSpend)
          ? Math.max(0, body.dailyMetaAdsSpend)
          : cur.dailyMetaAdsSpend ?? 500,
      deliverySlaDays:
        typeof body.deliverySlaDays === 'number' && Number.isFinite(body.deliverySlaDays)
          ? Math.max(1, Math.min(30, body.deliverySlaDays))
          : cur.deliverySlaDays ?? 4,
      pickupSlaHours:
        typeof body.pickupSlaHours === 'number' && Number.isFinite(body.pickupSlaHours)
          ? Math.max(6, Math.min(168, body.pickupSlaHours))
          : cur.pickupSlaHours ?? 48,
    });
    const tokenChanged =
      typeof body.delhiveryApiToken === 'string' &&
      body.delhiveryApiToken.trim() !== (cur.delhiveryApiToken || '').trim();
    if (tokenChanged && hasDelhiveryCredentials(updated)) {
      void syncDelhiveryOrdersNow(
        store.getOrders(),
        store.getSettings(),
        (order) => store.upsertOrder(order),
        (pin) => store.updateSettings({ delhiveryPickupPincode: pin })
      );
    }
    res.json({ settings: updated });
  });

  // Test Delhivery One API token
  app.post('/api/delhivery/test', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    const result = await testDelhiveryConnection(store.getSettings());
    if (result.ok && result.detectedOriginPin && !store.getSettings().delhiveryPickupPincode) {
      store.updateSettings({ delhiveryPickupPincode: result.detectedOriginPin });
    }
    res.status(result.ok ? 200 : 400).json(result);
  });

  // Sync live Delhivery One tracking & shipping/RTO/COD invoice charges
  app.post('/api/delhivery/sync', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    const result = await syncDelhiveryOrdersNow(
      store.getOrders(),
      store.getSettings(),
      (order) => store.upsertOrder(order),
      (pin) => store.updateSettings({ delhiveryPickupPincode: pin })
    );
    await store.flushRemote();
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const orders = store.getOrders();
    res.json({
      ok: true,
      trackedCount: result.trackedCount,
      chargesUpdatedCount: result.chargesUpdatedCount,
      detectedOriginPin: result.detectedOriginPin,
      warning: result.warning,
      settings: store.getSettings(),
      orders,
      metrics: computeOrderMetrics(orders),
    });
  });

  // Import exact per-AWB deductions from Delhivery One Wallet / Passbook / Invoice CSV
  app.post('/api/delhivery/import-csv', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const csvText = typeof req.body?.csvText === 'string' ? req.body.csvText : '';
    if (!csvText.trim()) {
      res.status(400).json({ ok: false, error: 'Upload a valid Delhivery One CSV file.' });
      return;
    }
    const result = importDelhiveryBillingCsvToOrders(csvText, store.getOrders(), (order) =>
      store.upsertOrder(order)
    );
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    await store.flushRemote();
    const orders = store.getOrders();
    res.json({
      ok: true,
      updatedCount: result.updatedCount,
      parsedCount: result.parsedCount,
      orders,
      metrics: computeOrderMetrics(orders),
    });
  });

  // Test live Shopify Admin API connection
  app.post('/api/shopify/test', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    const result = await testShopifyConnection(store.getSettings());
    res.status(result.ok ? 200 : 400).json(result);
  });

  // Pull recent orders from Shopify Admin API & automatically dispatch polls
  app.post('/api/shopify/sync', async (_req: Request, res: Response) => {
    const result = await syncShopifyOrdersNow('manual');
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

  // Official Shopify Webhook: orders/create
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

    const order = parseShopifyRawOrder(payload, settings);
    store.upsertOrder(order);

    if (shouldAutoDispatchPoll(order, settings)) {
      await whatsappManager.dispatchOrderPoll(order);
    }

    res.status(200).json({ ok: true, order: store.getOrderById(order.id) });
  });

  // Official Shopify Webhook: orders/updated or orders/fulfilled (instant tracking link detection)
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

    res.status(200).json({ ok: true, order: store.getOrderById(existing.id) });
  });

  // Resend WhatsApp Poll for an order
  app.post('/api/orders/:id/resend-poll', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const order = store.getOrderById(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const updated = await whatsappManager.dispatchOrderPoll(order);
    const allOrders = store.getOrders();
    res.json({
      ok: true,
      order: updated,
      orders: allOrders,
      metrics: computeOrderMetrics(allOrders),
    });
  });

  // Send / Resend Tracking Link on WhatsApp for an order
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
    const allOrders = store.getOrders();
    res.json({
      ok: true,
      order: updated,
      orders: allOrders,
      metrics: computeOrderMetrics(allOrders),
    });
  });

  // Manual tag override for an order
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
    const allOrders = store.getOrders();
    res.json({
      ok: true,
      order: updated,
      orders: allOrders,
      metrics: computeOrderMetrics(allOrders),
    });
  });

  // Save order remark & sync directly into Shopify Admin Order Notes
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

  // Mark / undo COD payment remittance settlement for an order
  app.post('/api/orders/:id/settle', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const order = store.getOrderById(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const settled = req.body?.settled !== false;
    const reference =
      typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    const amountRaw = Number(req.body?.amount);
    const defaultVal = Number.parseFloat(order.totalPrice || '0') || 0;

    if (settled) {
      order.settlementStatus = 'settled';
      order.settledAmount =
        Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : defaultVal;
      order.settledAt = new Date().toISOString();
      order.settlementReference = reference || order.settlementReference || 'Manual Bank Settlement';
      store.appendOrderEvent(order.id, {
        actor: 'system',
        message: `Payment marked settled (${order.currency} ${order.settledAmount}${reference ? ` · UTR: ${reference}` : ''})`,
      });
    } else {
      order.settlementStatus = 'pending_remittance';
      order.settledAmount = null;
      order.settledAt = null;
      order.settlementReference = null;
      store.appendOrderEvent(order.id, {
        actor: 'system',
        message: 'Payment settlement status reverted to Pending COD Remittance',
      });
    }

    store.upsertOrder(order);
    await store.flushRemote();
    const allOrders = store.getOrders();
    res.json({
      ok: true,
      order: store.getOrderById(order.id),
      orders: allOrders,
      metrics: computeOrderMetrics(allOrders),
    });
  });

  // Bulk mark COD orders as settled with shared UTR / remittance ref
  app.post('/api/orders/settle-bulk', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const orderIds = Array.isArray(req.body?.orderIds)
      ? req.body.orderIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    const reference =
      typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    for (const id of orderIds) {
      const order = store.getOrderById(id);
      if (!order) continue;
      const val = Number.parseFloat(order.totalPrice || '0') || 0;
      order.settlementStatus = 'settled';
      order.settledAmount = val;
      order.settledAt = nowIso;
      order.settlementReference = reference || 'Bulk Bank Settlement';
      store.upsertOrder(order);
      store.appendOrderEvent(order.id, {
        actor: 'system',
        message: `COD Remittance settled (${order.currency} ${val}${reference ? ` · UTR: ${reference}` : ''})`,
      });
      updatedCount += 1;
    }

    await store.flushRemote();
    const allOrders = store.getOrders();
    res.json({
      ok: true,
      updatedCount,
      orders: allOrders,
      metrics: computeOrderMetrics(allOrders),
    });
  });

  // Frontend Vite middleware (dev) or static dist (production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 24/7 automatic Shopify order sync on boot + every 30s so new orders are picked up even without webhooks
  if (!process.env.VERCEL) {
    setTimeout(() => {
      if (hasLiveShopifyCredentials(store.getSettings())) {
        void syncShopifyOrdersNow('auto');
      } else if (whatsappManager.isConnected()) {
        void whatsappManager.flushQueuedOrders();
      }
    }, 2_000);
    setInterval(() => {
      if (hasLiveShopifyCredentials(store.getSettings())) {
        void syncShopifyOrdersNow('auto');
      } else if (whatsappManager.isConnected()) {
        void whatsappManager.flushQueuedOrders();
      }
    }, 30_000);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`OrderPulse server running on http://0.0.0.0:${PORT}`);
  });

  const handleShutdown = async () => {
    await whatsappManager.shutdownGracefully();
    await store.flushRemote();
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.once('SIGTERM', () => {
    void handleShutdown();
  });
  process.once('SIGINT', () => {
    void handleShutdown();
  });
}

startServer();
