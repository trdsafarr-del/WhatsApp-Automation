import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SETTINGS,
  hasConfiguredShopify,
  isOrderOnOrAfterStartDate,
  mergeProgressedOrderRecords,
  readCleanEnvVar,
  selectPriorityAuthFiles,
} from '../src/lib/orderRules.js';
import { DEFAULT_GEO_SEO_CONFIG } from '../src/lib/geoSeo.js';
import {
  DEFAULT_STOREFRONT_CONFIG,
} from '../src/lib/storefrontRules.js';
import type {
  AppSettings,
  GeoSeoConfig,
  OrderEvent,
  OrderRecord,
  ProductCatalogItem,
  StorefrontConfig,
  WhatsAppState,
} from '../src/lib/types.js';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/orderpulse-data'
  : process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const DB_BACKUP_PATH = path.join(DATA_DIR, 'db.backup.json');
const POLL_CACHE_PATH = path.join(DATA_DIR, 'poll-messages.json');
const POLL_BACKUP_PATH = path.join(DATA_DIR, 'poll-messages.backup.json');

const LEGACY_SEED_ORDER_IDS = new Set(['ord-1049', 'ord-1050', 'ord-1051', 'ord-1052']);
const REDIS_DB_KEY = 'orderpulse:v1:db';
const REDIS_POLL_KEY = 'orderpulse:v1:polls';
const REDIS_WA_AUTH_KEY = 'orderpulse:v1:wa_auth';
const REDIS_WA_CREDS_KEY = 'orderpulse:v1:wa_creds';

export interface DatabaseState {
  settings: AppSettings;
  orders: OrderRecord[];
  products: ProductCatalogItem[];
  storefrontConfig: StorefrontConfig;
  geoSeoConfig: GeoSeoConfig;
  whatsappMeta: {
    mode: WhatsAppState['mode'];
    connectedAt: string | null;
    lastHeartbeatAt?: string | null;
    activeHostKind?: string | null;
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
    shopName:
      settings.shopName || process.env.SHOPIFY_SHOP_NAME || DEFAULT_SETTINGS.shopName,
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
    syncStartDate:
      settings.syncStartDate || process.env.SYNC_START_DATE || DEFAULT_SETTINGS.syncStartDate,
    delhiveryApiToken:
      settings.delhiveryApiToken || process.env.DELHIVERY_API_TOKEN || '',
    delhiveryPickupPincode:
      settings.delhiveryPickupPincode || process.env.DELHIVERY_PICKUP_PINCODE || '',
  };
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = readCleanEnvVar(process.env, [
    'UPSTASH_REDIS_REST_URL',
    'KV_REST_API_URL',
  ]).replace(/\/+$/, '');
  const token = readCleanEnvVar(process.env, [
    'UPSTASH_REDIS_REST_TOKEN',
    'KV_REST_API_TOKEN',
  ]);
  if (!url || !token) return null;
  return { url, token };
}

function dedupeOrderEvents(orders: OrderRecord[]): { cleaned: OrderRecord[]; changed: boolean } {
  let changed = false;
  const cleaned = orders.map((order) => {
    if (!Array.isArray(order.events) || order.events.length <= 1) return order;
    const deduped: OrderEvent[] = [];
    for (const evt of order.events) {
      const prev = deduped[deduped.length - 1];
      if (
        prev &&
        prev.message.startsWith('WhatsApp QR not linked yet') &&
        evt.message.startsWith('WhatsApp QR not linked yet')
      ) {
        changed = true;
        continue;
      }
      deduped.push(evt);
    }
    return deduped.length === order.events.length ? order : { ...order, events: deduped };
  });
  return { cleaned, changed };
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
  private remoteSyncQueue: Promise<void> = Promise.resolve();

  constructor() {
    ensureDataDir();
    this.state = this.loadState();
    this.pollMessages = this.loadPollCache();
  }

  isCloudSyncEnabled(): boolean {
    return getUpstashConfig() !== null;
  }

  async flushRemote(): Promise<void> {
    await this.remoteSyncQueue;
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
        await this.flushRemote();
        const [remoteDbRaw, remotePollsRaw] = await Promise.all([
          upstashGet(REDIS_DB_KEY),
          upstashGet(REDIS_POLL_KEY),
        ]);

        if (remoteDbRaw) {
          const parsed = JSON.parse(remoteDbRaw) as Partial<DatabaseState>;
          const mergedSettings = hydrateEnvDefaults({
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
            whatsappMode: 'baileys_qr',
          });
          const remoteOrders = Array.isArray(parsed.orders)
            ? parsed.orders.filter(
                (o) =>
                  !LEGACY_SEED_ORDER_IDS.has(o.id) &&
                  isOrderOnOrAfterStartDate(o.createdAt, mergedSettings.syncStartDate)
              )
            : [];
          const mergedByKey = new Map<string, OrderRecord>();
          for (const remote of remoteOrders) {
            mergedByKey.set(remote.shopifyOrderId || remote.id, remote);
          }
          for (const local of this.state.orders) {
            if (
              LEGACY_SEED_ORDER_IDS.has(local.id) ||
              !isOrderOnOrAfterStartDate(local.createdAt, mergedSettings.syncStartDate)
            ) {
              continue;
            }
            const key = local.shopifyOrderId || local.id;
            const prev = mergedByKey.get(key);
            mergedByKey.set(key, prev ? mergeProgressedOrderRecords(local, prev) : local);
          }
          const combinedOrders = Array.from(mergedByKey.values()).sort(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
          );
          const { cleaned: cleanedOrders } = dedupeOrderEvents(combinedOrders);
          const remoteProducts = Array.isArray(parsed.products) ? parsed.products : [];
          const mergedProductsMap = new Map<string, ProductCatalogItem>();
          for (const rp of remoteProducts) {
            mergedProductsMap.set(rp.shopifyProductId || rp.id, rp);
          }
          for (const lp of this.state.products) {
            const key = lp.shopifyProductId || lp.id;
            const prev = mergedProductsMap.get(key);
            if (!prev || Date.parse(lp.updatedAt || '0') > Date.parse(prev.updatedAt || '0')) {
              mergedProductsMap.set(key, lp);
            }
          }
          const mergedStorefrontConfig: StorefrontConfig = {
            ...DEFAULT_STOREFRONT_CONFIG,
            ...(parsed.storefrontConfig || {}),
          };
          const mergedGeoSeoConfig: GeoSeoConfig = {
            ...DEFAULT_GEO_SEO_CONFIG,
            ...(parsed.geoSeoConfig || {}),
          };
          this.state = {
            settings: mergedSettings,
            orders: cleanedOrders,
            products: Array.from(mergedProductsMap.values()),
            storefrontConfig: mergedStorefrontConfig,
            geoSeoConfig: mergedGeoSeoConfig,
            whatsappMeta: {
              mode: 'baileys_qr',
              connectedAt: parsed.whatsappMeta?.connectedAt || null,
              lastHeartbeatAt: parsed.whatsappMeta?.lastHeartbeatAt || null,
              activeHostKind: parsed.whatsappMeta?.activeHostKind || null,
              phoneNumber: parsed.whatsappMeta?.phoneNumber || null,
              pushName: parsed.whatsappMeta?.pushName || null,
            },
          };
          this.writeLocalState(this.state);
        } else if (
          hasConfiguredShopify(this.state.settings) ||
          this.state.orders.length > 0 ||
          this.state.products.length > 0 ||
          this.state.whatsappMeta.phoneNumber
        ) {
          // First time Redis is connected on an already-configured host: seed Redis immediately
          await upstashSet(REDIS_DB_KEY, JSON.stringify(this.state));
        }

        if (remotePollsRaw) {
          const parsedPolls = JSON.parse(remotePollsRaw) as Record<string, unknown>;
          if (parsedPolls && typeof parsedPolls === 'object') {
            this.pollMessages = parsedPolls;
            this.writeLocalPollCache();
          }
        } else if (Object.keys(this.pollMessages).length > 0) {
          await upstashSet(REDIS_POLL_KEY, JSON.stringify(this.pollMessages));
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

  private tryParseStateFile(filePath: string): { state: DatabaseState; needsRewrite: boolean } | null {
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      const mergedSettings = hydrateEnvDefaults({
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
        whatsappMode: 'baileys_qr',
      });
      const nonSeedOrders = Array.isArray(parsed.orders)
        ? parsed.orders.filter(
            (o) =>
              !LEGACY_SEED_ORDER_IDS.has(o.id) &&
              isOrderOnOrAfterStartDate(o.createdAt, mergedSettings.syncStartDate)
          )
        : [];
      const { cleaned: cleanedOrders, changed: eventsDeduped } =
        dedupeOrderEvents(nonSeedOrders);
      const loaded: DatabaseState = {
        settings: mergedSettings,
        orders: cleanedOrders,
        products: Array.isArray(parsed.products) ? parsed.products : [],
        storefrontConfig: {
          ...DEFAULT_STOREFRONT_CONFIG,
          ...(parsed.storefrontConfig || {}),
        },
        geoSeoConfig: {
          ...DEFAULT_GEO_SEO_CONFIG,
          ...(parsed.geoSeoConfig || {}),
        },
        whatsappMeta: {
          mode: 'baileys_qr',
          connectedAt: parsed.whatsappMeta?.connectedAt || null,
          lastHeartbeatAt: parsed.whatsappMeta?.lastHeartbeatAt || null,
          activeHostKind: parsed.whatsappMeta?.activeHostKind || null,
          phoneNumber: parsed.whatsappMeta?.phoneNumber || null,
          pushName: parsed.whatsappMeta?.pushName || null,
        },
      };
      const needsRewrite =
        eventsDeduped ||
        !parsed.settings?.syncStartDate ||
        !parsed.storefrontConfig ||
        !parsed.geoSeoConfig ||
        (Array.isArray(parsed.orders) && cleanedOrders.length !== parsed.orders.length);
      return { state: loaded, needsRewrite };
    } catch {
      return null;
    }
  }

  private loadState(): DatabaseState {
    const primary = this.tryParseStateFile(DB_PATH);
    if (primary) {
      if (primary.needsRewrite) {
        this.writeLocalState(primary.state);
      }
      return primary.state;
    }

    const backup = this.tryParseStateFile(DB_BACKUP_PATH);
    if (backup) {
      this.writeLocalState(backup.state);
      return backup.state;
    }

    const initial: DatabaseState = {
      settings: hydrateEnvDefaults(DEFAULT_SETTINGS),
      orders: [],
      products: [],
      storefrontConfig: { ...DEFAULT_STOREFRONT_CONFIG },
      geoSeoConfig: { ...DEFAULT_GEO_SEO_CONFIG },
      whatsappMeta: {
        mode: 'baileys_qr',
        connectedAt: null,
        lastHeartbeatAt: null,
        activeHostKind: null,
        phoneNumber: null,
        pushName: null,
      },
    };
    this.writeLocalState(initial);
    return initial;
  }

  private writeLocalState(nextState: DatabaseState) {
    ensureDataDir();
    const serialized = JSON.stringify(nextState, null, 2);
    const tmp = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmp, serialized, 'utf8');
    fs.renameSync(tmp, DB_PATH);

    const backupTmp = `${DB_BACKUP_PATH}.tmp`;
    fs.writeFileSync(backupTmp, serialized, 'utf8');
    fs.renameSync(backupTmp, DB_BACKUP_PATH);
  }

  private persistState(nextState: DatabaseState) {
    this.writeLocalState(nextState);
    if (this.isCloudSyncEnabled()) {
      const payload = JSON.stringify(nextState);
      this.remoteSyncQueue = this.remoteSyncQueue
        .then(() => upstashSet(REDIS_DB_KEY, payload))
        .catch(() => {
          // Keep queue healthy even if a transient network error occurs
        });
    }
  }

  private loadPollCache(): Record<string, unknown> {
    for (const filePath of [POLL_CACHE_PATH, POLL_BACKUP_PATH]) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        // Try backup if primary poll cache was truncated mid-write
      }
    }
    return {};
  }

  private writeLocalPollCache() {
    ensureDataDir();
    const serialized = JSON.stringify(this.pollMessages);
    const tmp = `${POLL_CACHE_PATH}.tmp`;
    fs.writeFileSync(tmp, serialized, 'utf8');
    fs.renameSync(tmp, POLL_CACHE_PATH);

    const backupTmp = `${POLL_BACKUP_PATH}.tmp`;
    fs.writeFileSync(backupTmp, serialized, 'utf8');
    fs.renameSync(backupTmp, POLL_BACKUP_PATH);
  }

  private persistPollCache() {
    this.writeLocalPollCache();
    if (this.isCloudSyncEnabled()) {
      const payload = JSON.stringify(this.pollMessages);
      this.remoteSyncQueue = this.remoteSyncQueue
        .then(() => upstashSet(REDIS_POLL_KEY, payload))
        .catch(() => {
          // Keep queue healthy
        });
    }
  }

  /**
   * Backs up Baileys multi-file auth credentials (data/wa-auth/*) to Upstash Redis
   * within a safe size budget so WhatsApp stays logged in across server restarts & redeploys.
   */
  async backupAuthFiles(authDir: string): Promise<void> {
    if (!this.isCloudSyncEnabled() || !fs.existsSync(authDir)) return;
    try {
      const credsPath = path.join(authDir, 'creds.json');
      if (fs.existsSync(credsPath)) {
        const credsContent = fs.readFileSync(credsPath, 'utf8');
        await upstashSet(REDIS_WA_CREDS_KEY, credsContent);
      }

      const entries = fs.readdirSync(authDir);
      const fileEntries: Array<{ name: string; size: number }> = [];
      for (const name of entries) {
        const fullPath = path.join(authDir, name);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          fileEntries.push({ name, size: stat.size });
        }
      }

      const pickedNames = selectPriorityAuthFiles(fileEntries, 650_000);
      const bundle: Record<string, string> = {};
      for (const name of pickedNames) {
        bundle[name] = fs.readFileSync(path.join(authDir, name), 'utf8');
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
      const [rawBundle, rawCreds] = await Promise.all([
        upstashGet(REDIS_WA_AUTH_KEY),
        upstashGet(REDIS_WA_CREDS_KEY),
      ]);
      const bundle = rawBundle ? (JSON.parse(rawBundle) as Record<string, string>) : {};
      const credsContent = rawCreds || bundle['creds.json'];
      if (!credsContent) {
        return false;
      }
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
      for (const [name, content] of Object.entries(bundle)) {
        if (name.includes('/') || name.includes('..')) continue;
        fs.writeFileSync(path.join(authDir, name), content, 'utf8');
      }
      fs.writeFileSync(path.join(authDir, 'creds.json'), credsContent, 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  async clearRemoteAuth(): Promise<void> {
    await Promise.all([upstashDel(REDIS_WA_AUTH_KEY), upstashDel(REDIS_WA_CREDS_KEY)]);
  }

  getSettings(): AppSettings {
    return this.state.settings;
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.state.settings = {
      ...this.state.settings,
      ...partial,
    };
    if (partial.syncStartDate !== undefined) {
      this.state.orders = this.state.orders.filter((o) =>
        isOrderOnOrAfterStartDate(o.createdAt, this.state.settings.syncStartDate)
      );
    }
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

  getProducts(): ProductCatalogItem[] {
    return Array.isArray(this.state.products) ? this.state.products : [];
  }

  getProductById(id: string): ProductCatalogItem | undefined {
    return this.getProducts().find((p) => p.id === id || p.shopifyProductId === id);
  }

  upsertProduct(product: ProductCatalogItem): ProductCatalogItem {
    if (!Array.isArray(this.state.products)) {
      this.state.products = [];
    }
    const idx = this.state.products.findIndex(
      (p) => p.id === product.id || p.shopifyProductId === product.shopifyProductId
    );
    if (idx >= 0) {
      this.state.products[idx] = product;
    } else {
      this.state.products.unshift(product);
    }
    this.persistState(this.state);
    return product;
  }

  setProducts(products: ProductCatalogItem[]): ProductCatalogItem[] {
    this.state.products = products;
    this.persistState(this.state);
    return this.state.products;
  }

  deleteProduct(id: string): boolean {
    const prevLen = this.getProducts().length;
    this.state.products = this.getProducts().filter((p) => p.id !== id && p.shopifyProductId !== id);
    if (this.state.products.length !== prevLen) {
      this.persistState(this.state);
      return true;
    }
    return false;
  }

  getStorefrontConfig(): StorefrontConfig {
    return {
      ...DEFAULT_STOREFRONT_CONFIG,
      ...(this.state.storefrontConfig || {}),
    };
  }

  updateStorefrontConfig(partial: Partial<StorefrontConfig>): StorefrontConfig {
    this.state.storefrontConfig = {
      ...this.getStorefrontConfig(),
      ...partial,
    };
    this.persistState(this.state);
    return this.state.storefrontConfig;
  }

  getGeoSeoConfig(): GeoSeoConfig {
    return {
      ...DEFAULT_GEO_SEO_CONFIG,
      ...(this.state.geoSeoConfig || {}),
    };
  }

  updateGeoSeoConfig(partial: Partial<GeoSeoConfig>): GeoSeoConfig {
    this.state.geoSeoConfig = {
      ...this.getGeoSeoConfig(),
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.persistState(this.state);
    return this.state.geoSeoConfig;
  }
}

export const store = new PersistentStore();
