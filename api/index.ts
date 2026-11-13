import express, { type NextFunction, type Request, type Response } from 'express';
import { computeOrderMetrics, shouldAutoDispatchPoll } from '../src/lib/orderRules.js';
import type { AppSettings, OrderRecord } from '../src/lib/types.js';
import {
  hasLiveShopifyCredentials,
  parseShopifyRawOrder,
  testShopifyConnection,
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
  const state = await whatsappManager.connect(mode);
  res.json({ whatsapp: state });
});

app.post('/api/whatsapp/restart', async (_req: Request, res: Response) => {
  await store.ensureHydrated();
  const currentMode = store.getWhatsAppMeta().mode;
  const state = await whatsappManager.connect(currentMode);
  res.json({ whatsapp: state });
});

app.post('/api/whatsapp/disconnect', async (_req: Request, res: Response) => {
  const state = await whatsappManager.disconnect(true);
  res.json({ whatsapp: state });
});

app.post('/api/settings', async (req: Request, res: Response) => {
  await store.ensureHydrated();
  const body = (req.body || {}) as Partial<AppSettings>;
  const updated = store.updateSettings(body);
  res.json({ settings: updated });
});

app.post('/api/shopify/test', async (_req: Request, res: Response) => {
  await store.ensureHydrated();
  const result = await testShopifyConnection(store.getSettings());
  res.status(result.ok ? 200 : 400).json(result);
});

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

  res.status(200).json({ ok: true, order: store.getOrderById(order.id) });
});

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

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

export default app;
