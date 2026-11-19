import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SETTINGS,
  hasConfiguredShopify,
  isOrderOnOrAfterStartDate,
  mergeProgressedOrderRecords,
  readCleanEnvVar,
  selectPriorityAuthFiles,
  shouldBackupWhatsAppAuth,
  shouldFetchFullRemoteDb,
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
const REDIS_DB_REV_KEY = 'orderpulse:v1:db_rev';
const REDIS_POLL_KEY = 'orderpulse:v1:polls';
const REDIS_WA_AUTH_KEY = 'orderpulse:v1:wa_auth';
const REDIS_WA_CREDS_KEY = 'orderpulse:v1:wa_creds';
const REDIS_HEARTBEAT_KEY = 'orderpulse:v1:wa_heartbeat';

function nextDbRevision(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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

let upstashQuotaBlockedUntilMs = 0;

function isUpstashCircuitOpen(): boolean {
  return upstashQuotaBlockedUntilMs > Date.now();
}

function inspectUpstashErrorResponse(status: number, bodyText = ''): void {
  const lower = bodyText.toLowerCase();
  if (
    status === 429 ||
    status === 402 ||
    lower.includes('bandwidth') ||
    lower.includes('max daily request') ||
    lower.includes('limit exceeded') ||
    lower.includes('quota')
  ) {
    upstashQuotaBlockedUntilMs = Date.now() + 30 * 60 * 1000;
  }
}

async function upstashGet(key: string): Promise<string | null> {
  const cfg = getUpstashConfig();
  if (!cfg || isUpstashCircuitOpen()) return null;
  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      inspectUpstashErrorResponse(res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = (await res.json()) as { result?: string | null; error?: string };
    if (data.error) {
      inspectUpstashErrorResponse(429, data.error);
      return null;
    }
    return typeof data.result === 'string' ? data.result : null;
  } catch {
    return null;
  }
}

async function upstashMGet(keys: string[]): Promise<Array<string | null>> {
  const cfg = getUpstashConfig();
  if (!cfg || keys.length === 0 || isUpstashCircuitOpen()) return keys.map(() => null);
  try {
    const encoded = keys.map((k) => encodeURIComponent(k)).join('/');
    const res = await fetch(`${cfg.url}/mget/${encoded}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      inspectUpstashErrorResponse(res.status, await res.text().catch(() => ''));
      return keys.map(() => null);
    }
    const data = (await res.json()) as { result?: Array<string | null>; error?: string };
    if (data.error) {
      inspectUpstashErrorResponse(429, data.error);
      return keys.map(() => null);
    }
    return Array.isArray(data.result)
      ? keys.map((_, idx) => (typeof data.result?.[idx] === 'string' ? data.result[idx] : null))
      : keys.map(() => null);
  } catch {
    return keys.map(() => null);
  }
}

async function upstashSet(key: string, value: string): Promise<void> {
  const cfg = getUpstashConfig();
  if (!cfg || isUpstashCircuitOpen()) return;
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', key, value]),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      inspectUpstashErrorResponse(res.status, await res.text().catch(() => ''));
    }
  } catch {
    // Keep local disk persistence intact even if remote sync fails momentarily
  }
}

async function upstashPipelineSet(pairs: Array<[string, string]>): Promise<void> {
  const cfg = getUpstashConfig();
  if (!cfg || pairs.length === 0 || isUpstashCircuitOpen()) return;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pairs.map(([key, value]) => ['SET', key, value])),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      inspectUpstashErrorResponse(res.status, await res.text().catch(() => ''));
    }
  } catch {
    if (!isUpstashCircuitOpen()) {
      for (const [key, value] of pairs) {
        await upstashSet(key, value);
      }
    }
  }
}

async function upstashDel(key: string): Promise<void> {
  const cfg = getUpstashConfig();
  if (!cfg || isUpstashCircuitOpen()) return;
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', key]),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      inspectUpstashErrorResponse(res.status, await res.text().catch(() => ''));
    }
  } catch {
    // Ignore remote delete error
  }
}

class PersistentStore {
  private state: DatabaseState;
  private pollMessages: Record<string, unknown> = {};
  private lastHydratedAtMs = 0;
  private lastSyncedRev: string | null = null;
  private pollsHydrated = false;
  private hydratePromise: Promise<void> | null = null;
  private remoteSyncQueue: Promise<void> = Promise.resolve();
  private pendingDbFlushTimer: NodeJS.Timeout | null = null;
  private pendingPollFlushTimer: NodeJS.Timeout | null = null;
  private lastAuthBackupAtMs = 0;
  private lastAuthBackupDigest: string | null = null;

  constructor() {
    ensureDataDir();
    this.state = this.loadState();
    this.pollMessages = this.loadPollCache();
  }

  isCloudSyncEnabled(): boolean {
    return getUpstashConfig() !== null;
  }

  private flushPendingDbNow() {
    if (this.pendingDbFlushTimer) {
      clearTimeout(this.pendingDbFlushTimer);
      this.pendingDbFlushTimer = null;
    }
    if (!this.isCloudSyncEnabled()) return;
    const rev = nextDbRevision();
    this.lastSyncedRev = rev;
    const payload = JSON.stringify(this.state);
    this.remoteSyncQueue = this.remoteSyncQueue
      .then(() =>
        upstashPipelineSet([
          [REDIS_DB_KEY, payload],
          [REDIS_DB_REV_KEY, rev],
        ])
      )
      .catch(() => {
        // Keep queue healthy even if a transient network error occurs
      });
  }

  private flushPendingPollsNow() {
    if (this.pendingPollFlushTimer) {
      clearTimeout(this.pendingPollFlushTimer);
      this.pendingPollFlushTimer = null;
    }
    if (!this.isCloudSyncEnabled()) return;
    const payload = JSON.stringify(this.pollMessages);
    this.remoteSyncQueue = this.remoteSyncQueue
      .then(() => upstashSet(REDIS_POLL_KEY, payload))
      .catch(() => {
        // Keep queue healthy
      });
  }

  async flushRemote(): Promise<void> {
    if (this.pendingDbFlushTimer) {
      this.flushPendingDbNow();
    }
    if (this.pendingPollFlushTimer) {
      this.flushPendingPollsNow();
    }
    await this.remoteSyncQueue;
  }

  /**
   * Hydrates state from Upstash Redis (when configured) using a lightweight ~100-byte
   * revision + heartbeat check first so unchanged polls/storefront hits avoid downloading ~400 KB.
   */
  async ensureHydrated(force = false): Promise<void> {
    if (!this.isCloudSyncEnabled()) return;
    const now = Date.now();
    // Re-check remote revision every 15s on Vercel serverless, 5m on persistent servers
    const ttlMs = process.env.VERCEL ? 15_000 : 300_000;
    if (!force && this.lastHydratedAtMs > 0 && now - this.lastHydratedAtMs < ttlMs) {
      return;
    }
    if (this.hydratePromise) {
      return this.hydratePromise;
    }

    this.hydratePromise = (async () => {
      try {
        await this.flushRemote();
        const [remoteRev, remoteHeartbeatRaw] = await upstashMGet([
          REDIS_DB_REV_KEY,
          REDIS_HEARTBEAT_KEY,
        ]);

        let heartbeatMeta: { lastHeartbeatAt?: string | null; activeHostKind?: string | null } | null =
          null;
        if (remoteHeartbeatRaw) {
          try {
            heartbeatMeta = JSON.parse(remoteHeartbeatRaw) as {
              lastHeartbeatAt?: string | null;
              activeHostKind?: string | null;
            };
            if (heartbeatMeta && typeof heartbeatMeta === 'object') {
              const curHbMs = this.state.whatsappMeta.lastHeartbeatAt
                ? Date.parse(this.state.whatsappMeta.lastHeartbeatAt)
                : 0;
              const remHbMs = heartbeatMeta.lastHeartbeatAt
                ? Date.parse(heartbeatMeta.lastHeartbeatAt)
                : 0;
              if (Number.isFinite(remHbMs) && remHbMs > (Number.isFinite(curHbMs) ? curHbMs : 0)) {
                this.state.whatsappMeta = {
                  ...this.state.whatsappMeta,
                  lastHeartbeatAt: heartbeatMeta.lastHeartbeatAt || null,
                  activeHostKind:
                    heartbeatMeta.activeHostKind || this.state.whatsappMeta.activeHostKind || null,
                };
              }
            }
          } catch {
            heartbeatMeta = null;
          }
        }

        const needDbFetch = shouldFetchFullRemoteDb({
          localRev: this.lastSyncedRev,
          remoteRev,
          force,
        });
        const needPollsFetch = !process.env.VERCEL && (force || !this.pollsHydrated);

        if (!needDbFetch && !needPollsFetch) {
          this.lastHydratedAtMs = Date.now();
          return;
        }

        const [remoteDbRaw, remotePollsRaw] = await Promise.all([
          needDbFetch ? upstashGet(REDIS_DB_KEY) : Promise.resolve(null),
          needPollsFetch ? upstashGet(REDIS_POLL_KEY) : Promise.resolve(null),
        ]);

        if (needDbFetch) {
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
            const parsedHbMs = parsed.whatsappMeta?.lastHeartbeatAt
              ? Date.parse(parsed.whatsappMeta.lastHeartbeatAt)
              : 0;
            const hbKeyMs = heartbeatMeta?.lastHeartbeatAt
              ? Date.parse(heartbeatMeta.lastHeartbeatAt)
              : 0;
            const bestHeartbeatAt =
              Number.isFinite(hbKeyMs) && hbKeyMs > (Number.isFinite(parsedHbMs) ? parsedHbMs : 0)
                ? heartbeatMeta?.lastHeartbeatAt || null
                : parsed.whatsappMeta?.lastHeartbeatAt || null;
            const bestHostKind =
              (Number.isFinite(hbKeyMs) && hbKeyMs > (Number.isFinite(parsedHbMs) ? parsedHbMs : 0)
                ? heartbeatMeta?.activeHostKind
                : parsed.whatsappMeta?.activeHostKind) ||
              heartbeatMeta?.activeHostKind ||
              null;

            this.state = {
              settings: mergedSettings,
              orders: cleanedOrders,
              products: Array.from(mergedProductsMap.values()),
              storefrontConfig: mergedStorefrontConfig,
              geoSeoConfig: mergedGeoSeoConfig,
              whatsappMeta: {
                mode: 'baileys_qr',
                connectedAt: parsed.whatsappMeta?.connectedAt || null,
                lastHeartbeatAt: bestHeartbeatAt,
                activeHostKind: bestHostKind,
                phoneNumber: parsed.whatsappMeta?.phoneNumber || null,
                pushName: parsed.whatsappMeta?.pushName || null,
              },
            };
            this.writeLocalState(this.state);

            if (!remoteRev) {
              const seedRev = nextDbRevision();
              await upstashSet(REDIS_DB_REV_KEY, seedRev);
              this.lastSyncedRev = seedRev;
            } else {
              this.lastSyncedRev = remoteRev;
            }
          } else if (
            hasConfiguredShopify(this.state.settings) ||
            this.state.orders.length > 0 ||
            this.state.products.length > 0 ||
            this.state.whatsappMeta.phoneNumber
          ) {
            // First time Redis is connected on an already-configured host: seed Redis immediately
            const seedRev = nextDbRevision();
            await upstashPipelineSet([
              [REDIS_DB_KEY, JSON.stringify(this.state)],
              [REDIS_DB_REV_KEY, seedRev],
            ]);
            this.lastSyncedRev = seedRev;
          }
        }

        if (needPollsFetch) {
          this.pollsHydrated = true;
          if (remotePollsRaw) {
            const parsedPolls = JSON.parse(remotePollsRaw) as Record<string, unknown>;
            if (parsedPolls && typeof parsedPolls === 'object') {
              this.pollMessages = parsedPolls;
              this.writeLocalPollCache();
            }
          } else if (Object.keys(this.pollMessages).length > 0) {
            await upstashSet(REDIS_POLL_KEY, JSON.stringify(this.pollMessages));
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
    if (!this.isCloudSyncEnabled()) return;
    if (process.env.VERCEL) {
      this.flushPendingDbNow();
      return;
    }
    if (this.pendingDbFlushTimer) clearTimeout(this.pendingDbFlushTimer);
    this.pendingDbFlushTimer = setTimeout(() => {
      this.flushPendingDbNow();
    }, 450);
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
    if (!this.isCloudSyncEnabled()) return;
    if (process.env.VERCEL) {
      this.flushPendingPollsNow();
      return;
    }
    if (this.pendingPollFlushTimer) clearTimeout(this.pendingPollFlushTimer);
    this.pendingPollFlushTimer = setTimeout(() => {
      this.flushPendingPollsNow();
    }, 1000);
  }

  /**
   * Records host WhatsApp heartbeat into a tiny (~80-byte) Redis key without re-uploading
   * the entire db.json payload on every tick.
   */
  recordWhatsAppHeartbeat(meta: {
    lastHeartbeatAt: string | null;
    activeHostKind: string | null;
  }) {
    this.state.whatsappMeta = {
      ...this.state.whatsappMeta,
      lastHeartbeatAt: meta.lastHeartbeatAt,
      activeHostKind: meta.activeHostKind,
    };
    if (this.isCloudSyncEnabled()) {
      const payload = JSON.stringify(meta);
      this.remoteSyncQueue = this.remoteSyncQueue
        .then(() => upstashSet(REDIS_HEARTBEAT_KEY, payload))
        .catch(() => {
          // Ignore transient heartbeat write errors
        });
    }
  }

  /**
   * Backs up Baileys multi-file auth credentials (data/wa-auth/*) to Upstash Redis
   * using a 15-minute steady-state throttle and SHA-256 content dedupe so creds.update
   * bursts do not consume gigabytes of Redis bandwidth.
   */
  async backupAuthFiles(authDir: string, options?: { force?: boolean }): Promise<void> {
    if (!this.isCloudSyncEnabled() || !fs.existsSync(authDir)) return;
    if (
      !shouldBackupWhatsAppAuth({
        lastBackupAtMs: this.lastAuthBackupAtMs,
        force: options?.force,
      })
    ) {
      return;
    }
    try {
      const credsPath = path.join(authDir, 'creds.json');
      const credsContent = fs.existsSync(credsPath) ? fs.readFileSync(credsPath, 'utf8') : '';

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
      const bundleJson = Object.keys(bundle).length > 0 ? JSON.stringify(bundle) : '';
      if (!credsContent && !bundleJson) return;

      const digest = crypto
        .createHash('sha256')
        .update(credsContent)
        .update('|')
        .update(bundleJson)
        .digest('hex');

      if (digest === this.lastAuthBackupDigest) {
        this.lastAuthBackupAtMs = Date.now();
        return;
      }

      const pairs: Array<[string, string]> = [];
      if (credsContent) pairs.push([REDIS_WA_CREDS_KEY, credsContent]);
      if (bundleJson) pairs.push([REDIS_WA_AUTH_KEY, bundleJson]);

      await upstashPipelineSet(pairs);
      this.lastAuthBackupAtMs = Date.now();
      this.lastAuthBackupDigest = digest;
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
    this.lastAuthBackupAtMs = 0;
    this.lastAuthBackupDigest = null;
    await Promise.all([
      upstashDel(REDIS_WA_AUTH_KEY),
      upstashDel(REDIS_WA_CREDS_KEY),
      upstashDel(REDIS_HEARTBEAT_KEY),
    ]);
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

  isUpstashQuotaExceeded(): boolean {
    return isUpstashCircuitOpen();
  }

  /**
   * Hydrates a cold or Redis-depleted server (e.g. Vercel) from a verified Google Firebase
   * Firestore backup sent by the authenticated admin dashboard without regressing newer orders.
   */
  restoreFromCloudBackup(payload: {
    settings?: Partial<AppSettings>;
    orders?: OrderRecord[];
    products?: ProductCatalogItem[];
    storefrontConfig?: Partial<StorefrontConfig>;
    geoSeoConfig?: Partial<GeoSeoConfig>;
    whatsappMeta?: Partial<DatabaseState['whatsappMeta']>;
  }): { restoredOrders: number; restoredProducts: number; restoredSettings: boolean } {
    let restoredSettings = false;
    if (payload.settings && typeof payload.settings === 'object') {
      const mergedSettings = hydrateEnvDefaults({
        ...DEFAULT_SETTINGS,
        ...this.state.settings,
        ...payload.settings,
        shopifyStoreDomain:
          this.state.settings.shopifyStoreDomain || payload.settings.shopifyStoreDomain || '',
        shopifyClientId:
          this.state.settings.shopifyClientId || payload.settings.shopifyClientId || '',
        shopifyClientSecret:
          this.state.settings.shopifyClientSecret || payload.settings.shopifyClientSecret || '',
        shopifyAccessToken:
          this.state.settings.shopifyAccessToken || payload.settings.shopifyAccessToken || '',
        shopifyWebhookSecret:
          this.state.settings.shopifyWebhookSecret || payload.settings.shopifyWebhookSecret || '',
        whatsappMode: 'baileys_qr',
      });
      this.state.settings = mergedSettings;
      restoredSettings = hasConfiguredShopify(mergedSettings);
    }

    if (payload.storefrontConfig && typeof payload.storefrontConfig === 'object') {
      this.state.storefrontConfig = {
        ...this.getStorefrontConfig(),
        ...payload.storefrontConfig,
      };
    }

    if (payload.geoSeoConfig && typeof payload.geoSeoConfig === 'object') {
      this.state.geoSeoConfig = {
        ...this.getGeoSeoConfig(),
        ...payload.geoSeoConfig,
        showStorefrontZoneFooter: false,
      };
    }

    if (payload.whatsappMeta && typeof payload.whatsappMeta === 'object') {
      this.state.whatsappMeta = {
        ...this.state.whatsappMeta,
        phoneNumber: this.state.whatsappMeta.phoneNumber || payload.whatsappMeta.phoneNumber || null,
        pushName: this.state.whatsappMeta.pushName || payload.whatsappMeta.pushName || null,
        connectedAt: this.state.whatsappMeta.connectedAt || payload.whatsappMeta.connectedAt || null,
        lastHeartbeatAt:
          this.state.whatsappMeta.lastHeartbeatAt || payload.whatsappMeta.lastHeartbeatAt || null,
        activeHostKind:
          this.state.whatsappMeta.activeHostKind || payload.whatsappMeta.activeHostKind || null,
      };
    }

    let restoredOrders = 0;
    if (Array.isArray(payload.orders) && payload.orders.length > 0) {
      const mergedMap = new Map<string, OrderRecord>();
      for (const existingOrder of this.state.orders) {
        mergedMap.set(existingOrder.shopifyOrderId || existingOrder.id, existingOrder);
      }
      for (const incomingOrder of payload.orders) {
        if (!incomingOrder || typeof incomingOrder !== 'object') continue;
        if (
          LEGACY_SEED_ORDER_IDS.has(incomingOrder.id) ||
          !isOrderOnOrAfterStartDate(incomingOrder.createdAt, this.state.settings.syncStartDate)
        ) {
          continue;
        }
        const key = incomingOrder.shopifyOrderId || incomingOrder.id;
        const prev = mergedMap.get(key);
        mergedMap.set(key, prev ? mergeProgressedOrderRecords(prev, incomingOrder) : incomingOrder);
        if (!prev) restoredOrders += 1;
      }
      this.state.orders = Array.from(mergedMap.values()).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    }

    let restoredProducts = 0;
    if (Array.isArray(payload.products) && payload.products.length > 0) {
      const prodMap = new Map<string, ProductCatalogItem>();
      for (const existingProd of this.getProducts()) {
        prodMap.set(existingProd.shopifyProductId || existingProd.id, existingProd);
      }
      for (const incomingProd of payload.products) {
        if (!incomingProd || typeof incomingProd !== 'object') continue;
        const key = incomingProd.shopifyProductId || incomingProd.id;
        if (!prodMap.has(key)) {
          prodMap.set(key, incomingProd);
          restoredProducts += 1;
        }
      }
      this.state.products = Array.from(prodMap.values());
    }

    this.writeLocalState(this.state);
    return { restoredOrders, restoredProducts, restoredSettings };
  }
}

export const store = new PersistentStore();
