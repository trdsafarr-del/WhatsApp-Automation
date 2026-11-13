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
    connectedAt: string | null;
    phoneNumber: string | null;
    pushName: string | null;
  };
}

const LEGACY_SEED_ORDER_IDS = new Set(['ord-1049', 'ord-1050', 'ord-1051', 'ord-1052']);

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
        const cleanedOrders = Array.isArray(parsed.orders)
          ? parsed.orders.filter((o) => !LEGACY_SEED_ORDER_IDS.has(o.id))
          : [];
        const loaded: DatabaseState = {
          settings: hydrateEnvDefaults({
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
            whatsappMode: 'baileys_qr',
          }),
          orders: cleanedOrders,
          whatsappMeta: {
            mode: 'baileys_qr',
            connectedAt: parsed.whatsappMeta?.connectedAt || null,
            phoneNumber: parsed.whatsappMeta?.phoneNumber || null,
            pushName: parsed.whatsappMeta?.pushName || null,
          },
        };
        if (Array.isArray(parsed.orders) && cleanedOrders.length !== parsed.orders.length) {
          this.persistState(loaded);
        }
        return loaded;
      } catch {
        // Fallback cleanly to empty state if file is corrupted
      }
    }

    const initial: DatabaseState = {
      settings: hydrateEnvDefaults(DEFAULT_SETTINGS),
      orders: [],
      whatsappMeta: {
        mode: 'baileys_qr',
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
