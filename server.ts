import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { computeOrderMetrics } from './src/lib/orderRules.js';
import type { AppSettings, OrderRecord } from './src/lib/types.js';
import {
  fetchShopifyOrders,
  parseShopifyRawOrder,
  testShopifyConnection,
  verifyShopifyWebhookHmac,
  type ShopifyRawOrder,
} from './server/shopify.js';
import { store } from './server/store.js';
import { whatsappManager } from './server/whatsapp.js';

const PORT = Number(process.env.PORT) || 3000;

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

async function startServer() {
  const app = express();

  app.use(
    express.json({
      verify: (req: RawBodyRequest, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Healthcheck for uptime monitors (UptimeRobot / Cron-Job.org 24/7 keep-alive)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      whatsappStatus: whatsappManager.getState().status,
      timestamp: new Date().toISOString(),
    });
  });

  // Full dashboard snapshot
  app.get('/api/dashboard', (_req: Request, res: Response) => {
    const orders = store.getOrders();
    res.json({
      orders,
      whatsapp: whatsappManager.getState(),
      settings: store.getSettings(),
      metrics: computeOrderMetrics(orders),
      serverTime: new Date().toISOString(),
    });
  });

  // WhatsApp QR / Session controls
  app.post('/api/whatsapp/connect', async (req: Request, res: Response) => {
    const mode = req.body?.mode as AppSettings['whatsappMode'] | undefined;
    const state = await whatsappManager.connect(mode);
    res.json({ whatsapp: state });
  });

  app.post('/api/whatsapp/restart', async (_req: Request, res: Response) => {
    const currentMode = store.getWhatsAppMeta().mode;
    const state = await whatsappManager.connect(currentMode);
    res.json({ whatsapp: state });
  });

  app.post('/api/whatsapp/disconnect', async (_req: Request, res: Response) => {
    const state = await whatsappManager.disconnect(true);
    res.json({ whatsapp: state });
  });

  // Save Shopify & Poll automation settings
  app.post('/api/settings', (req: Request, res: Response) => {
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
      pollMessageTemplate: body.pollMessageTemplate ?? cur.pollMessageTemplate,
      confirmOptionLabel: body.confirmOptionLabel ?? cur.confirmOptionLabel,
      cancelOptionLabel: body.cancelOptionLabel ?? cur.cancelOptionLabel,
      confirmTag: body.confirmTag ?? cur.confirmTag,
      cancelTag: body.cancelTag ?? cur.cancelTag,
    });
    res.json({ settings: updated });
  });

  // Test live Shopify Admin API connection
  app.post('/api/shopify/test', async (_req: Request, res: Response) => {
    const result = await testShopifyConnection(store.getSettings());
    res.status(result.ok ? 200 : 400).json(result);
  });

  // Pull recent orders from Shopify Admin API & optionally send polls
  app.post('/api/shopify/sync', async (_req: Request, res: Response) => {
    const settings = store.getSettings();
    const fetched = await fetchShopifyOrders(settings);
    if (!fetched.ok) {
      res.status(400).json(fetched);
      return;
    }

    let importedCount = 0;
    for (const raw of fetched.orders) {
      const existing = store.getOrderByShopifyId(String(raw.id));
      if (!existing) {
        const parsed = parseShopifyRawOrder(raw);
        store.upsertOrder(parsed);
        importedCount += 1;
        if (settings.autoSendPollOnNewOrder) {
          await whatsappManager.dispatchOrderPoll(parsed);
        }
      }
    }

    const orders = store.getOrders();
    res.json({
      ok: true,
      importedCount,
      orders,
      metrics: computeOrderMetrics(orders),
    });
  });

  // Official Shopify Webhook: orders/create
  app.post('/api/webhooks/shopify/orders-create', async (req: RawBodyRequest, res: Response) => {
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

    const order = parseShopifyRawOrder(payload);
    store.upsertOrder(order);

    if (settings.autoSendPollOnNewOrder) {
      await whatsappManager.dispatchOrderPoll(order);
    }

    res.status(200).json({ ok: true, order: store.getOrderById(order.id) });
  });

  // Resend WhatsApp Poll for an order
  app.post('/api/orders/:id/resend-poll', async (req: Request, res: Response) => {
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

  // Manual tag override for an order
  app.post('/api/orders/:id/vote', async (req: Request, res: Response) => {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OrderPulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
