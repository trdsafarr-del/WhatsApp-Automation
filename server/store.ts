import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS } from '../src/lib/orderRules.js';
import type { AppSettings, OrderEvent, OrderRecord, WhatsAppState } from '../src/lib/types.js';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/orderpulse-data'
  : path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const POLL_CACHE_PATH = path.join(DATA_DIR, 'poll-messages.json');

const LEGACY_SEED_ORDER_IDS = new Set(['ord-1049', 'ord-1050', 'ord-1051', 'ord-1052']);
const REDIS_DB_KEY = 'orderpulse:v1:db';
const REDIS_POLL_KEY = 'orderpulse:v1:polls';
const REDIS_WA_AUTH_KEY = 'orderpulse:v1:wa_auth';

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

function getUpstashConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url, token };
}

async function upstashGet(key: string): Promise<string | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    return typeof data.result === 'string' ? data.result : null;
  } catch {
    return null;
  }
}

async function upstashSet(key: string, value: string): Promise<void> {
  const cfg = getUpstashConfig();
  if (!cfg) return;
  try {
    await fetch(cfg.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', key, value]),
    });
  } catch {
    // Keep local disk persistence intact even if remote sync fails momentarily
  }
}

async function upstashDel(key: string): Promise<void> {
  const cfg = getUpstashConfig();
  if (!cfg) return;
  try {
    await fetch(cfg.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', key]),
    });
  } catch {
    // Ignore remote delete error
  }
}

class PersistentStore {
  private state: DatabaseState;
  private pollMessages: Record<string, unknown> = {};
  private lastHydratedAtMs = 0;
  private hydratePromise: Promise<void> | null = null;

  constructor() {
    ensureDataDir();
    this.state = this.loadState();
    this.pollMessages = this.loadPollCache();
  }

  isCloudSyncEnabled(): boolean {
    return getUpstashConfig() !== null;
  }

  /**
   * Hydrates state from Upstash Redis (when configured) so all devices and
   * serverless containers always read and write the exact same orders, settings,
   * poll mappings, and WhatsApp session metadata.
   */
  async ensureHydrated(force = false): Promise<void> {
    if (!this.isCloudSyncEnabled()) return;
    const now = Date.now();
    // On Vercel serverless, re-sync frequently across containers; locally hydrate on boot
    const ttlMs = process.env.VERCEL ? 2_000 : 60_000;
    if (!force && this.lastHydratedAtMs > 0 && now - this.lastHydratedAtMs < ttlMs) {
      return;
    }
    if (this.hydratePromise) {
      return this.hydratePromise;
    }

    this.hydratePromise = (async () => {
      try {
        const [remoteDbRaw, remotePollsRaw] = await Promise.all([
          upstashGet(REDIS_DB_KEY),
          upstashGet(REDIS_POLL_KEY),
        ]);

        if (remoteDbRaw) {
          const parsed = JSON.parse(remoteDbRaw) as Partial<DatabaseState>;
          const cleanedOrders = Array.isArray(parsed.orders)
            ? parsed.orders.filter((o) => !LEGACY_SEED_ORDER_IDS.has(o.id))
            : [];
          this.state = {
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
          this.writeLocalState(this.state);
        }

        if (remotePollsRaw) {
          const parsedPolls = JSON.parse(remotePollsRaw) as Record<string, unknown>;
          if (parsedPolls && typeof parsedPolls === 'object') {
            this.pollMessages = parsedPolls;
            this.writeLocalPollCache();
          }
        }
        this.lastHydratedAtMs = Date.now();
      } catch {
        // Fallback safely to local disk cache
      } finally {
        this.hydratePromise = null;
      }
    })();

    return this.hydratePromise;
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
          this.writeLocalState(loaded);
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
    this.writeLocalState(initial);
    return initial;
  }

  private writeLocalState(nextState: DatabaseState) {
    ensureDataDir();
    const tmp = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(nextState, null, 2), 'utf8');
    fs.renameSync(tmp, DB_PATH);
  }

  private persistState(nextState: DatabaseState) {
    this.writeLocalState(nextState);
    if (this.isCloudSyncEnabled()) {
      void upstashSet(REDIS_DB_KEY, JSON.stringify(nextState));
    }
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

  private writeLocalPollCache() {
    ensureDataDir();
    const tmp = `${POLL_CACHE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.pollMessages), 'utf8');
    fs.renameSync(tmp, POLL_CACHE_PATH);
  }

  private persistPollCache() {
    this.writeLocalPollCache();
    if (this.isCloudSyncEnabled()) {
      void upstashSet(REDIS_POLL_KEY, JSON.stringify(this.pollMessages));
    }
  }

  /**
   * Backs up Baileys multi-file auth credentials (data/wa-auth/*) to Upstash Redis
   * so WhatsApp never logs out across server redeploys or container restarts.
   */
  async backupAuthFiles(authDir: string): Promise<void> {
    if (!this.isCloudSyncEnabled() || !fs.existsSync(authDir)) return;
    try {
      const entries = fs.readdirSync(authDir);
      const bundle: Record<string, string> = {};
      for (const name of entries) {
        const fullPath = path.join(authDir, name);
        if (fs.statSync(fullPath).isFile()) {
          bundle[name] = fs.readFileSync(fullPath, 'utf8');
        }
      }
      if (Object.keys(bundle).length > 0) {
        await upstashSet(REDIS_WA_AUTH_KEY, JSON.stringify(bundle));
      }
    } catch {
      // Ignore transient backup error
    }
  }

  async restoreAuthFiles(authDir: string): Promise<boolean> {
    if (!this.isCloudSyncEnabled()) return false;
    try {
      const raw = await upstashGet(REDIS_WA_AUTH_KEY);
      if (!raw) return false;
      const bundle = JSON.parse(raw) as Record<string, string>;
      if (!bundle || typeof bundle !== 'object' || !bundle['creds.json']) {
        return false;
      }
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
      for (const [name, content] of Object.entries(bundle)) {
        if (name.includes('/') || name.includes('..')) continue;
        fs.writeFileSync(path.join(authDir, name), content, 'utf8');
      }
      return true;
    } catch {
      return false;
    }
  }

  async clearRemoteAuth(): Promise<void> {
    await upstashDel(REDIS_WA_AUTH_KEY);
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

  getQueuedOrders(): OrderRecord[] {
    return this.state.orders.filter((o) => o.pollStatus === 'queued');
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
      if (orderDigits.length < 7 || phoneDigits.length < 7) return false;
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
    // Keep orders sorted newest first
    this.state.orders.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
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
