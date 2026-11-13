import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS } from '../src/lib/orderRules.js';
import type { AppSettings, OrderEvent, OrderRecord, WhatsAppState } from '../src/lib/types.js';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/orderpulse-data'
  : path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const POLL_CACHE_PATH = path.join(DATA_DIR, 'poll-messages.json');

export interface DatabaseState {
  settings: AppSettings;
  orders: OrderRecord[];
  whatsappMeta: {
    mode: WhatsAppState['mode'];
    sandboxConnected: boolean;
    connectedAt: string | null;
    phoneNumber: string | null;
    pushName: string | null;
  };
}

function createSeedOrders(): OrderRecord[] {
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  return [
    {
      id: 'ord-1052',
      shopifyOrderId: '58912041052',
      orderNumber: '#1052',
      customerName: 'Riya Sharma',
      customerPhone: '+91 98201 44120',
      customerEmail: 'riya.sharma@example.com',
      totalPrice: '1890.00',
      currency: 'INR',
      lineItemsSummary: '1x Handloom Cotton Kurta (M)',
      financialStatus: 'pending',
      shopifyTags: 'COD',
      pollStatus: 'poll_sent',
      whatsappMessageId: 'WA-POLL-1052',
      pollQuestion:
        'Hi Riya Sharma, thank you for your order #1052 (INR 1890.00) at UrbanCraft India for 1x Handloom Cotton Kurta (M). Please tap an option below to confirm or cancel your order:',
      pollSentAt: iso(8),
      respondedAt: null,
      responseChannel: null,
      shopifySynced: true,
      createdAt: iso(9),
      events: [
        {
          id: 'evt-1052-1',
          timestamp: iso(9),
          actor: 'shopify',
          message: 'Shopify webhook orders/create received (#1052 · COD)',
        },
        {
          id: 'evt-1052-2',
          timestamp: iso(8),
          actor: 'whatsapp',
          message: 'WhatsApp Poll dispatched to +91 98201 44120 (awaiting customer tap)',
        },
      ],
    },
    {
      id: 'ord-1051',
      shopifyOrderId: '58912041051',
      orderNumber: '#1051',
      customerName: 'Kabir Verma',
      customerPhone: '+91 98112 77091',
      customerEmail: 'kabir.verma@example.com',
      totalPrice: '3450.00',
      currency: 'INR',
      lineItemsSummary: '2x Merino Crewneck Tee, 1x Canvas Tote',
      financialStatus: 'pending',
      shopifyTags: 'COD, confirm',
      pollStatus: 'confirmed',
      whatsappMessageId: 'WA-POLL-1051',
      pollQuestion:
        'Hi Kabir Verma, thank you for your order #1051 (INR 3450.00) at UrbanCraft India for 2x Merino Crewneck Tee, 1x Canvas Tote. Please tap an option below to confirm or cancel your order:',
      pollSentAt: iso(42),
      respondedAt: iso(39),
      responseChannel: 'whatsapp_poll',
      shopifySynced: true,
      createdAt: iso(43),
      events: [
        {
          id: 'evt-1051-1',
          timestamp: iso(43),
          actor: 'shopify',
          message: 'Shopify webhook orders/create received (#1051 · COD)',
        },
        {
          id: 'evt-1051-2',
          timestamp: iso(42),
          actor: 'whatsapp',
          message: 'WhatsApp Poll dispatched to +91 98112 77091',
        },
        {
          id: 'evt-1051-3',
          timestamp: iso(39),
          actor: 'customer',
          message: 'Customer voted "Confirm Order" in WhatsApp Poll',
        },
        {
          id: 'evt-1051-4',
          timestamp: iso(39),
          actor: 'shopify',
          message: 'Shopify order #1051 tagged with "confirm"',
        },
      ],
    },
    {
      id: 'ord-1050',
      shopifyOrderId: '58912041050',
      orderNumber: '#1050',
      customerName: 'Ananya Nair',
      customerPhone: '+91 99450 31822',
      customerEmail: 'ananya.nair@example.com',
      totalPrice: '1299.00',
      currency: 'INR',
      lineItemsSummary: '1x Brass Desk Lamp',
      financialStatus: 'pending',
      shopifyTags: 'COD, cancelled by user',
      pollStatus: 'cancelled_by_user',
      whatsappMessageId: 'WA-POLL-1050',
      pollQuestion:
        'Hi Ananya Nair, thank you for your order #1050 (INR 1299.00) at UrbanCraft India for 1x Brass Desk Lamp. Please tap an option below to confirm or cancel your order:',
      pollSentAt: iso(115),
      respondedAt: iso(111),
      responseChannel: 'whatsapp_poll',
      shopifySynced: true,
      createdAt: iso(116),
      events: [
        {
          id: 'evt-1050-1',
          timestamp: iso(116),
          actor: 'shopify',
          message: 'Shopify webhook orders/create received (#1050 · COD)',
        },
        {
          id: 'evt-1050-2',
          timestamp: iso(115),
          actor: 'whatsapp',
          message: 'WhatsApp Poll dispatched to +91 99450 31822',
        },
        {
          id: 'evt-1050-3',
          timestamp: iso(111),
          actor: 'customer',
          message: 'Customer voted "Cancel Order" in WhatsApp Poll',
        },
        {
          id: 'evt-1050-4',
          timestamp: iso(111),
          actor: 'shopify',
          message: 'Shopify order #1050 tagged with "cancelled by user"',
        },
      ],
    },
    {
      id: 'ord-1049',
      shopifyOrderId: '58912041049',
      orderNumber: '#1049',
      customerName: 'Devansh Kapoor',
      customerPhone: '+91 97118 60442',
      customerEmail: 'devansh.k@example.com',
      totalPrice: '4250.00',
      currency: 'INR',
      lineItemsSummary: '1x Leather Messenger Bag',
      financialStatus: 'paid',
      shopifyTags: 'Prepaid, confirm',
      pollStatus: 'confirmed',
      whatsappMessageId: 'WA-POLL-1049',
      pollQuestion:
        'Hi Devansh Kapoor, thank you for your order #1049 (INR 4250.00) at UrbanCraft India for 1x Leather Messenger Bag. Please tap an option below to confirm or cancel your order:',
      pollSentAt: iso(240),
      respondedAt: iso(235),
      responseChannel: 'whatsapp_poll',
      shopifySynced: true,
      createdAt: iso(241),
      events: [
        {
          id: 'evt-1049-1',
          timestamp: iso(241),
          actor: 'shopify',
          message: 'Shopify webhook orders/create received (#1049 · Prepaid)',
        },
        {
          id: 'evt-1049-2',
          timestamp: iso(240),
          actor: 'whatsapp',
          message: 'WhatsApp Poll dispatched to +91 97118 60442',
        },
        {
          id: 'evt-1049-3',
          timestamp: iso(235),
          actor: 'customer',
          message: 'Customer voted "Confirm Order" in WhatsApp Poll',
        },
        {
          id: 'evt-1049-4',
          timestamp: iso(235),
          actor: 'shopify',
          message: 'Shopify order #1049 tagged with "confirm"',
        },
      ],
    },
  ];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hydrateEnvDefaults(settings: AppSettings): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    shopifyStoreDomain:
      settings.shopifyStoreDomain || process.env.SHOPIFY_STORE_DOMAIN || '',
    shopifyClientId:
      settings.shopifyClientId || process.env.SHOPIFY_CLIENT_ID || '',
    shopifyClientSecret:
      settings.shopifyClientSecret || process.env.SHOPIFY_CLIENT_SECRET || '',
    shopifyAccessToken:
      settings.shopifyAccessToken || process.env.SHOPIFY_ACCESS_TOKEN || '',
    shopifyWebhookSecret:
      settings.shopifyWebhookSecret || process.env.SHOPIFY_WEBHOOK_SECRET || '',
  };
}

class PersistentStore {
  private state: DatabaseState;
  private pollMessages: Record<string, unknown> = {};

  constructor() {
    ensureDataDir();
    this.state = this.loadState();
    this.pollMessages = this.loadPollCache();
  }

  private loadState(): DatabaseState {
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Partial<DatabaseState>;
        return {
          settings: hydrateEnvDefaults({
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
          }),
          orders: Array.isArray(parsed.orders) ? parsed.orders : createSeedOrders(),
          whatsappMeta: {
            mode: parsed.whatsappMeta?.mode || 'baileys_qr',
            sandboxConnected: Boolean(parsed.whatsappMeta?.sandboxConnected),
            connectedAt: parsed.whatsappMeta?.connectedAt || null,
            phoneNumber: parsed.whatsappMeta?.phoneNumber || null,
            pushName: parsed.whatsappMeta?.pushName || null,
          },
        };
      } catch {
        // Fallback cleanly to fresh seed state if file is corrupted
      }
    }

    const initial: DatabaseState = {
      settings: hydrateEnvDefaults(DEFAULT_SETTINGS),
      orders: createSeedOrders(),
      whatsappMeta: {
        mode: 'baileys_qr',
        sandboxConnected: false,
        connectedAt: null,
        phoneNumber: null,
        pushName: null,
      },
    };
    this.persistState(initial);
    return initial;
  }

  private persistState(nextState: DatabaseState) {
    ensureDataDir();
    const tmp = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(nextState, null, 2), 'utf8');
    fs.renameSync(tmp, DB_PATH);
  }

  private loadPollCache(): Record<string, unknown> {
    if (fs.existsSync(POLL_CACHE_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(POLL_CACHE_PATH, 'utf8')) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }

  private persistPollCache() {
    ensureDataDir();
    const tmp = `${POLL_CACHE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.pollMessages), 'utf8');
    fs.renameSync(tmp, POLL_CACHE_PATH);
  }

  getSettings(): AppSettings {
    return this.state.settings;
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.state.settings = {
      ...this.state.settings,
      ...partial,
    };
    this.persistState(this.state);
    return this.state.settings;
  }

  getOrders(): OrderRecord[] {
    return this.state.orders;
  }

  getOrderById(id: string): OrderRecord | undefined {
    return this.state.orders.find((o) => o.id === id);
  }

  getOrderByShopifyId(shopifyOrderId: string): OrderRecord | undefined {
    return this.state.orders.find((o) => o.shopifyOrderId === shopifyOrderId);
  }

  getOrderByWhatsAppMessageId(messageId: string): OrderRecord | undefined {
    return this.state.orders.find((o) => o.whatsappMessageId === messageId);
  }

  findLatestPendingOrderByPhone(phoneDigits: string): OrderRecord | undefined {
    return this.state.orders.find((o) => {
      if (o.pollStatus !== 'poll_sent' && o.pollStatus !== 'queued') return false;
      const orderDigits = o.customerPhone.replace(/\D/g, '');
      return (
        orderDigits.endsWith(phoneDigits.slice(-10)) ||
        phoneDigits.endsWith(orderDigits.slice(-10))
      );
    });
  }

  upsertOrder(order: OrderRecord): OrderRecord {
    const idx = this.state.orders.findIndex(
      (o) => o.id === order.id || o.shopifyOrderId === order.shopifyOrderId
    );
    if (idx >= 0) {
      this.state.orders[idx] = order;
    } else {
      this.state.orders.unshift(order);
    }
    this.persistState(this.state);
    return order;
  }

  appendOrderEvent(orderId: string, event: Omit<OrderEvent, 'id' | 'timestamp'>): OrderRecord | null {
    const order = this.getOrderById(orderId);
    if (!order) return null;
    const fullEvent: OrderEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    order.events.push(fullEvent);
    this.persistState(this.state);
    return order;
  }

  getWhatsAppMeta() {
    return this.state.whatsappMeta;
  }

  updateWhatsAppMeta(partial: Partial<DatabaseState['whatsappMeta']>) {
    this.state.whatsappMeta = {
      ...this.state.whatsappMeta,
      ...partial,
    };
    this.persistState(this.state);
  }

  savePollMessage(messageId: string, messagePayload: unknown) {
    this.pollMessages[messageId] = messagePayload;
    // Keep last 500 poll messages to bound disk size
    const keys = Object.keys(this.pollMessages);
    if (keys.length > 500) {
      for (const oldKey of keys.slice(0, keys.length - 500)) {
        delete this.pollMessages[oldKey];
      }
    }
    this.persistPollCache();
  }

  getPollMessage(messageId: string): unknown | undefined {
    return this.pollMessages[messageId];
  }
}

export const store = new PersistentStore();
