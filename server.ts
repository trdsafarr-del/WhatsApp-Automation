import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  computeOrderMetrics,
  extractShopifyTrackingInfo,
  shouldAutoDispatchPoll,
  shouldAutoSendTracking,
} from './src/lib/orderRules.js';
import type { AppSettings } from './src/lib/types.js';
import {
  hasLiveShopifyCredentials,
  parseShopifyRawOrder,
  testShopifyConnection,
  verifyShopifyWebhookHmac,
  type ShopifyRawOrder,
} from './server/shopify.js';
import { store } from './server/store.js';
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
      verify: (req: RawBodyRequest, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

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
      cloudSyncEnabled: store.isCloudSyncEnabled(),
      serverTime: new Date().toISOString(),
    });
  });

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
    });
    res.json({ settings: updated });
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
    if (parsed.fulfillmentStatus !== undefined) existing.fulfillmentStatus = parsed.fulfillmentStatus;
    if (parsed.fulfilledAt) existing.fulfilledAt = parsed.fulfilledAt;
    if (parsed.trackingUrl) existing.trackingUrl = parsed.trackingUrl;
    if (parsed.trackingNumber) existing.trackingNumber = parsed.trackingNumber;
    if (parsed.trackingCompany) existing.trackingCompany = parsed.trackingCompany;
    store.upsertOrder(existing);

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
      }
    }, 2_000);
    setInterval(() => {
      if (hasLiveShopifyCredentials(store.getSettings())) {
        void syncShopifyOrdersNow('auto');
      }
    }, 30_000);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OrderPulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
