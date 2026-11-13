import express, { type NextFunction, type Request, type Response } from 'express';
import { computeOrderMetrics } from '../src/lib/orderRules.js';
import type { AppSettings, OrderRecord } from '../src/lib/types.js';
import {
  fetchShopifyOrders,
  parseShopifyRawOrder,
  testShopifyConnection,
  verifyShopifyWebhookHmac,
  type ShopifyRawOrder,
} from '../server/shopify.js';
import { store } from '../server/store.js';
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

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    whatsappStatus: whatsappManager.getState().status,
    timestamp: new Date().toISOString(),
  });
});

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

app.post('/api/settings', (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<AppSettings>;
  const updated = store.updateSettings(body);
  res.json({ settings: updated });
});

app.post('/api/shopify/test', async (_req: Request, res: Response) => {
  const result = await testShopifyConnection(store.getSettings());
  res.status(result.ok ? 200 : 400).json(result);
});

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

  const order: OrderRecord = parseShopifyRawOrder(payload);
  store.upsertOrder(order);

  if (settings.autoSendPollOnNewOrder) {
    await whatsappManager.dispatchOrderPoll(order);
  }

  res.status(200).json({ ok: true, order: store.getOrderById(order.id) });
});

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
    shipping_address: { name: customerName, phone: customerPhone },
    line_items: [{ title: parsedTitle, quantity: parsedQty }],
  };

  const parsed = parseShopifyRawOrder(raw);
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

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

export default app;
