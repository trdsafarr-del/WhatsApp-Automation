import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { computeOrderMetrics } from './src/lib/orderRules';
import type { AppSettings, OrderRecord } from './src/lib/types';
import {
  fetchShopifyOrders,
  parseShopifyRawOrder,
  testShopifyConnection,
  verifyShopifyWebhookHmac,
  type ShopifyRawOrder,
} from './server/shopify';
import { store } from './server/store';
import { whatsappManager } from './server/whatsapp';

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
    const updated = store.updateSettings({
      shopName: body.shopName ?? store.getSettings().shopName,
      shopifyStoreDomain: body.shopifyStoreDomain ?? store.getSettings().shopifyStoreDomain,
      shopifyAccessToken: body.shopifyAccessToken ?? store.getSettings().shopifyAccessToken,
      shopifyWebhookSecret: body.shopifyWebhookSecret ?? store.getSettings().shopifyWebhookSecret,
      whatsappMode: body.whatsappMode ?? store.getSettings().whatsappMode,
      whatsappWorkerUrl: body.whatsappWorkerUrl ?? store.getSettings().whatsappWorkerUrl,
      cloudApiToken: body.cloudApiToken ?? store.getSettings().cloudApiToken,
      cloudApiPhoneNumberId:
        body.cloudApiPhoneNumberId ?? store.getSettings().cloudApiPhoneNumberId,
      defaultCountryCode: body.defaultCountryCode ?? store.getSettings().defaultCountryCode,
      autoSendPollOnNewOrder:
        typeof body.autoSendPollOnNewOrder === 'boolean'
          ? body.autoSendPollOnNewOrder
          : store.getSettings().autoSendPollOnNewOrder,
      autoCancelInShopify:
        typeof body.autoCancelInShopify === 'boolean'
          ? body.autoCancelInShopify
          : store.getSettings().autoCancelInShopify,
      pollMessageTemplate: body.pollMessageTemplate ?? store.getSettings().pollMessageTemplate,
      confirmOptionLabel: body.confirmOptionLabel ?? store.getSettings().confirmOptionLabel,
      cancelOptionLabel: body.cancelOptionLabel ?? store.getSettings().cancelOptionLabel,
      confirmTag: body.confirmTag ?? store.getSettings().confirmTag,
      cancelTag: body.cancelTag ?? store.getSettings().cancelTag,
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

    if (!verifyShopifyWebhookHmac(rawBody, hmac, settings.shopifyWebhookSecret)) {
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

  // Meta WhatsApp Cloud API Webhook (verification + button click handler)
  app.get('/api/webhooks/whatsapp-cloud', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'orderpulse_verify')) {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  });

  app.post('/api/webhooks/whatsapp-cloud', async (req: Request, res: Response) => {
    try {
      const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
      const messages = entry?.messages;
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          const from = String(msg.from || '').replace(/\D/g, '');
          const replyTitle =
            msg.interactive?.button_reply?.title ||
            msg.text?.body ||
            '';
          if (from && replyTitle) {
            const order = store.findLatestPendingOrderByPhone(from);
            if (order) {
              await whatsappManager.applyVoteToOrder(order.id, replyTitle, 'whatsapp_poll');
            }
          }
        }
      }
    } catch {
      // Acknowledge webhook to prevent Meta retry storm
    }
    res.sendStatus(200);
  });

  // Simulate an incoming Shopify Order & auto-dispatch WhatsApp Poll
  app.post('/api/orders/simulate', async (req: Request, res: Response) => {
    const orders = store.getOrders();
    const highestNum = orders.reduce((max, o) => {
      const n = Number(o.orderNumber.replace(/\D/g, ''));
      return Number.isFinite(n) && n > max ? n : max;
    }, 1052);

    const nextNum = highestNum + 1;
    const customerName =
      (typeof req.body?.customerName === 'string' && req.body.customerName.trim()) ||
      'Vikramaditya Rao';
    const customerPhone =
      (typeof req.body?.customerPhone === 'string' && req.body.customerPhone.trim()) ||
      '+91 98450 91234';
    const rawItemsInput =
      (typeof req.body?.lineItemsSummary === 'string' && req.body.lineItemsSummary.trim()) ||
      'Selvedge Denim Jacket (L)';
    const qtyMatch = rawItemsInput.match(/^(\d+)\s*x\s+(.+)$/i);
    const parsedQty = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1;
    const parsedTitle = qtyMatch ? qtyMatch[2].trim() : rawItemsInput;
    const totalPrice =
      (typeof req.body?.totalPrice === 'string' && req.body.totalPrice.trim()) || '2799.00';

    const raw: ShopifyRawOrder = {
      id: Date.now(),
      name: `#${nextNum}`,
      order_number: nextNum,
      created_at: new Date().toISOString(),
      total_price: totalPrice,
      currency: 'INR',
      financial_status: 'pending',
      tags: 'COD',
      customer: {
        first_name: customerName.split(' ')[0],
        last_name: customerName.split(' ').slice(1).join(' '),
        phone: customerPhone,
        email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      },
      shipping_address: {
        name: customerName,
        phone: customerPhone,
      },
      line_items: [{ title: parsedTitle, quantity: parsedQty }],
    };

    const parsed: OrderRecord = parseShopifyRawOrder(raw);
    store.upsertOrder(parsed);

    const updated = await whatsappManager.dispatchOrderPoll(parsed);
    const allOrders = store.getOrders();
    res.json({
      ok: true,
      order: updated,
      orders: allOrders,
      metrics: computeOrderMetrics(allOrders),
    });
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

  // Customer Poll click simulation (or manual override via exact same vote handler)
  app.post('/api/orders/:id/vote', async (req: Request, res: Response) => {
    const option = String(req.body?.option || '');
    const updated = await whatsappManager.applyVoteToOrder(
      String(req.params.id),
      option,
      'simulator'
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
