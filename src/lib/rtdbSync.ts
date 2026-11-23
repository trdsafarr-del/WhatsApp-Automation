import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import {
  computeContentSignature,
  stripUndefinedDeep,
  toSafeFirestoreDocId,
} from './firestorePayload';
import { hasConfiguredShopify, mergeProgressedOrderRecords } from './orderRules';
import {
  rtdb,
  rtdbAuth,
  rtdbGoogleProvider,
} from './rtdb';
import type {
  AppSettings,
  GeoSeoConfig,
  OrderRecord,
  ProductCatalogItem,
  StorefrontConfig,
  WhatsAppState,
} from './types';

export interface RtdbWhatsAppMeta {
  mode: WhatsAppState['mode'];
  connectedAt: string | null;
  lastHeartbeatAt?: string | null;
  activeHostKind?: string | null;
  phoneNumber: string | null;
  pushName: string | null;
  status?: WhatsAppState['status'];
}

export interface RtdbCloudSnapshot {
  settings?: AppSettings;
  storefrontConfig?: StorefrontConfig;
  geoSeoConfig?: GeoSeoConfig;
  whatsappMeta?: RtdbWhatsAppMeta;
  orders: OrderRecord[];
  products: ProductCatalogItem[];
}

export interface RtdbSyncTracker {
  initialLoaded: boolean;
  configExists: boolean;
  configSignature: string | null;
  whatsappLiveSignature: string | null;
  remoteWhatsappMeta: RtdbWhatsAppMeta | null;
  remoteOrdersById: Map<string, OrderRecord>;
  orderSignatures: Map<string, string>;
  productSignatures: Map<string, string>;
  permissionBlocked: boolean;
}

export function createRtdbSyncTracker(): RtdbSyncTracker {
  return {
    initialLoaded: false,
    configExists: false,
    configSignature: null,
    whatsappLiveSignature: null,
    remoteWhatsappMeta: null,
    remoteOrdersById: new Map<string, OrderRecord>(),
    orderSignatures: new Map<string, string>(),
    productSignatures: new Map<string, string>(),
    permissionBlocked: false,
  };
}

export async function signInRtdbWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(rtdbAuth, rtdbGoogleProvider);
  return cred.user;
}

export async function signOutRtdb(): Promise<void> {
  await signOut(rtdbAuth);
}

/**
 * Normalizes a Firebase RTDB key (no `.`, `#`, `$`, `[`, `]`, `/`).
 */
export function toSafeRtdbKey(raw: string, fallbackPrefix = 'item'): string {
  return toSafeFirestoreDocId(raw, fallbackPrefix);
}

/**
 * Resolves which whatsappMeta should be written to RTDB `config.whatsappMeta` so a
 * disconnected mirror host (e.g. AI Studio preview) NEVER overwrites a live Railway session.
 */
export function selectEffectiveRtdbWhatsappMeta(
  local: Pick<
    WhatsAppState,
    | 'status'
    | 'mode'
    | 'connectedAt'
    | 'lastHeartbeatAt'
    | 'activeHostKind'
    | 'hostKind'
    | 'phoneNumber'
    | 'pushName'
    | 'remoteSessionActive'
  >,
  remote: RtdbWhatsAppMeta | null
): RtdbWhatsAppMeta {
  const isLocalLive = local.status === 'connected' && Boolean(local.phoneNumber);
  if (isLocalLive) {
    return {
      mode: local.mode || 'baileys_qr',
      connectedAt: local.connectedAt || null,
      lastHeartbeatAt: local.lastHeartbeatAt || new Date().toISOString(),
      activeHostKind: local.hostKind || local.activeHostKind || null,
      phoneNumber: local.phoneNumber || null,
      pushName: local.pushName || null,
    };
  }

  const hasConnectedRemote = Boolean(
    remote && remote.phoneNumber && (remote.connectedAt || remote.activeHostKind)
  );
  const remoteIsDifferentHost = Boolean(
    remote?.activeHostKind && local.hostKind && remote.activeHostKind !== local.hostKind
  );
  if (hasConnectedRemote && (remoteIsDifferentHost || !local.phoneNumber)) {
    return {
      mode: remote!.mode || 'baileys_qr',
      connectedAt: remote!.connectedAt || null,
      lastHeartbeatAt: remote!.lastHeartbeatAt || null,
      activeHostKind: remote!.activeHostKind || null,
      phoneNumber: remote!.phoneNumber || null,
      pushName: remote!.pushName || null,
    };
  }

  return {
    mode: local.mode || 'baileys_qr',
    connectedAt: local.connectedAt || null,
    lastHeartbeatAt: local.lastHeartbeatAt || null,
    activeHostKind: local.activeHostKind || null,
    phoneNumber: local.phoneNumber || null,
    pushName: local.pushName || null,
  };
}

function mergeSnapshotWhatsappMeta(
  configMeta?: RtdbWhatsAppMeta,
  liveMeta?: RtdbWhatsAppMeta
): RtdbWhatsAppMeta | undefined {
  if (!configMeta && !liveMeta) return undefined;
  const base = configMeta || {
    mode: 'baileys_qr' as const,
    connectedAt: null,
    lastHeartbeatAt: null,
    activeHostKind: null,
    phoneNumber: null,
    pushName: null,
  };
  if (!liveMeta) return base;

  const liveHasPhone = Boolean(liveMeta.phoneNumber && (liveMeta.connectedAt || liveMeta.lastHeartbeatAt));
  if (liveHasPhone) {
    return {
      mode: liveMeta.mode || base.mode || 'baileys_qr',
      connectedAt: liveMeta.connectedAt || base.connectedAt || null,
      lastHeartbeatAt: liveMeta.lastHeartbeatAt || base.lastHeartbeatAt || null,
      activeHostKind: liveMeta.activeHostKind || base.activeHostKind || null,
      phoneNumber: liveMeta.phoneNumber || base.phoneNumber || null,
      pushName: liveMeta.pushName || base.pushName || null,
      status: liveMeta.status,
    };
  }
  return {
    ...base,
    lastHeartbeatAt: liveMeta.lastHeartbeatAt || base.lastHeartbeatAt || null,
    activeHostKind: liveMeta.activeHostKind || base.activeHostKind || null,
  };
}

function buildRtdbConfigNode(params: {
  settings: AppSettings;
  storefrontConfig: StorefrontConfig;
  geoSeoConfig: GeoSeoConfig;
  whatsapp: Pick<
    WhatsAppState,
    'mode' | 'connectedAt' | 'activeHostKind' | 'phoneNumber' | 'pushName'
  >;
}) {
  return stripUndefinedDeep({
    settings: { ...params.settings },
    storefrontConfig: { ...params.storefrontConfig },
    geoSeoConfig: { ...params.geoSeoConfig },
    whatsappMeta: {
      mode: params.whatsapp.mode || 'baileys_qr',
      connectedAt: params.whatsapp.connectedAt || null,
      lastHeartbeatAt: null,
      activeHostKind: params.whatsapp.activeHostKind || null,
      phoneNumber: params.whatsapp.phoneNumber || null,
      pushName: params.whatsapp.pushName || null,
    },
  });
}

function sanitizeOrderForRtdb(order: OrderRecord): OrderRecord {
  const safeId = toSafeRtdbKey(order.id || `ord-${order.shopifyOrderId}`, 'ord');
  const boundedEvents = Array.isArray(order.events) ? order.events.slice(-25) : [];
  return stripUndefinedDeep({
    ...order,
    id: safeId,
    events: boundedEvents,
  });
}

function sanitizeProductForRtdb(product: ProductCatalogItem): ProductCatalogItem {
  const safeId = toSafeRtdbKey(product.id || `prod-${product.shopifyProductId}`, 'prod');
  return stripUndefinedDeep({
    ...product,
    id: safeId,
    title: product.title || 'Untitled Product',
    handle: product.handle || '',
    productType: product.productType || '',
    pincodeMode: product.pincodeMode || 'all_india',
    allowCod: product.allowCod !== false,
    estimatedDeliveryDays:
      typeof product.estimatedDeliveryDays === 'number' ? product.estimatedDeliveryDays : null,
    allowedPincodes: Array.isArray(product.allowedPincodes) ? product.allowedPincodes : [],
    blockedPincodes: Array.isArray(product.blockedPincodes) ? product.blockedPincodes : [],
  });
}

function sanitizeGeoSeoFromRtdb(geoSeo?: GeoSeoConfig): GeoSeoConfig | undefined {
  if (!geoSeo || typeof geoSeo !== 'object') return undefined;
  return {
    ...geoSeo,
    hubs: Array.isArray(geoSeo.hubs) ? geoSeo.hubs : [],
    localities: Array.isArray(geoSeo.localities) ? geoSeo.localities : [],
    modifiers: Array.isArray(geoSeo.modifiers) ? geoSeo.modifiers : [],
    categories: Array.isArray(geoSeo.categories)
      ? geoSeo.categories.map((cat) => ({
          ...cat,
          keywords: Array.isArray(cat.keywords) ? cat.keywords : [],
        }))
      : [],
  };
}

export function isRtdbPermissionDenied(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return msg.includes('permission_denied') || msg.includes('permission denied');
}

/**
 * Subscribes to `/orderpulse` on Firebase Realtime Database.
 * Uses a single persistent WebSocket connection (no per-operation daily quota limits).
 */
export function subscribeToRtdbCloudData(
  tracker: RtdbSyncTracker,
  onSnapshotUpdate: (snapshot: RtdbCloudSnapshot) => void,
  onFatalError: (err: Error) => void
): () => void {
  const rootRef = ref(rtdb, 'orderpulse');
  let stopped = false;
  let unsub = () => {};

  const stop = () => {
    if (stopped) return;
    stopped = true;
    unsub();
  };

  unsub = onValue(
    rootRef,
    (snap) => {
      tracker.initialLoaded = true;
      tracker.permissionBlocked = false;

      const raw = (snap.val() || {}) as {
        config?: {
          settings?: AppSettings;
          storefrontConfig?: StorefrontConfig;
          geoSeoConfig?: GeoSeoConfig;
          whatsappMeta?: RtdbWhatsAppMeta;
        };
        whatsappLive?: RtdbWhatsAppMeta;
        orders?: Record<string, OrderRecord>;
        products?: Record<string, ProductCatalogItem>;
      };

      const configNode = raw.config;
      const mergedWhatsappMeta = mergeSnapshotWhatsappMeta(
        configNode?.whatsappMeta,
        raw.whatsappLive
      );
      tracker.remoteWhatsappMeta = mergedWhatsappMeta || null;
      if (raw.whatsappLive) {
        tracker.whatsappLiveSignature = computeContentSignature(
          stripUndefinedDeep(raw.whatsappLive)
        );
      }

      if (configNode && configNode.settings) {
        tracker.configExists = true;
        if (configNode.storefrontConfig && configNode.geoSeoConfig) {
          const normalizedConfig = buildRtdbConfigNode({
            settings: configNode.settings,
            storefrontConfig: configNode.storefrontConfig,
            geoSeoConfig: configNode.geoSeoConfig,
            whatsapp: {
              mode: configNode.whatsappMeta?.mode || 'baileys_qr',
              connectedAt: configNode.whatsappMeta?.connectedAt || null,
              activeHostKind: configNode.whatsappMeta?.activeHostKind || null,
              phoneNumber: configNode.whatsappMeta?.phoneNumber || null,
              pushName: configNode.whatsappMeta?.pushName || null,
            },
          });
          tracker.configSignature = computeContentSignature(normalizedConfig);
        }
      } else {
        tracker.configExists = false;
        tracker.configSignature = null;
      }

      const ordersList: OrderRecord[] = [];
      tracker.orderSignatures.clear();
      tracker.remoteOrdersById.clear();
      if (raw.orders && typeof raw.orders === 'object') {
        for (const [key, item] of Object.entries(raw.orders)) {
          if (item && typeof item === 'object' && item.orderNumber) {
            const cleanOrder = sanitizeOrderForRtdb(item);
            ordersList.push(cleanOrder);
            tracker.remoteOrdersById.set(key, cleanOrder);
            tracker.orderSignatures.set(key, computeContentSignature(cleanOrder));
          }
        }
      }
      ordersList.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      const productsList: ProductCatalogItem[] = [];
      tracker.productSignatures.clear();
      if (raw.products && typeof raw.products === 'object') {
        for (const [key, item] of Object.entries(raw.products)) {
          if (item && typeof item === 'object' && item.title) {
            const cleanProduct = sanitizeProductForRtdb(item);
            productsList.push(cleanProduct);
            tracker.productSignatures.set(key, computeContentSignature(cleanProduct));
          }
        }
      }

      onSnapshotUpdate({
        settings: configNode?.settings,
        storefrontConfig: configNode?.storefrontConfig,
        geoSeoConfig: sanitizeGeoSeoFromRtdb(configNode?.geoSeoConfig),
        whatsappMeta: mergedWhatsappMeta,
        orders: ordersList,
        products: productsList,
      });
    },
    (error) => {
      if (isRtdbPermissionDenied(error)) {
        tracker.permissionBlocked = true;
        stop();
      }
      onFatalError(error instanceof Error ? error : new Error(String(error)));
    }
  );

  return () => {
    stop();
  };
}

/**
 * Delta-syncs ONLY changed config, orders, or products to Firebase Realtime Database
 * in a single atomic multi-path `update()`. Unchanged records write 0 bytes.
 */
export async function syncDeltaToRtdb(
  state: {
    settings: AppSettings;
    storefrontConfig: StorefrontConfig;
    geoSeoConfig: GeoSeoConfig;
    whatsapp: WhatsAppState;
    orders: OrderRecord[];
    products: ProductCatalogItem[];
  },
  tracker: RtdbSyncTracker
): Promise<{ writtenPaths: number }> {
  if (!tracker.initialLoaded || tracker.permissionBlocked) {
    return { writtenPaths: 0 };
  }

  const patch: Record<string, unknown> = {};
  const nextOrderSigs: Array<[string, string]> = [];
  const nextProductSigs: Array<[string, string]> = [];
  let nextConfigSig: string | null = null;
  let nextWaLiveSig: string | null = null;

  const effectiveWaMeta = selectEffectiveRtdbWhatsappMeta(
    state.whatsapp,
    tracker.remoteWhatsappMeta
  );

  // If THIS host has an active local WhatsApp socket, broadcast live heartbeat + phone to `/orderpulse/whatsappLive`
  if (state.whatsapp.status === 'connected' && state.whatsapp.phoneNumber) {
    const livePayload = stripUndefinedDeep({
      mode: state.whatsapp.mode || 'baileys_qr',
      status: 'connected' as const,
      phoneNumber: state.whatsapp.phoneNumber,
      pushName: state.whatsapp.pushName || null,
      connectedAt: state.whatsapp.connectedAt || null,
      lastHeartbeatAt: state.whatsapp.lastHeartbeatAt || new Date().toISOString(),
      activeHostKind: state.whatsapp.hostKind || state.whatsapp.activeHostKind || null,
    });
    const liveSig = computeContentSignature(livePayload);
    if (liveSig !== tracker.whatsappLiveSignature) {
      patch['whatsappLive'] = livePayload;
      nextWaLiveSig = liveSig;
    }
  }

  const serverHasShopify = hasConfiguredShopify(state.settings);
  if (serverHasShopify || (!tracker.configExists && state.orders.length > 0)) {
    const configNode = buildRtdbConfigNode({
      settings: state.settings,
      storefrontConfig: state.storefrontConfig,
      geoSeoConfig: state.geoSeoConfig,
      whatsapp: effectiveWaMeta,
    });
    const sig = computeContentSignature(configNode);
    if (sig !== tracker.configSignature) {
      patch['config'] = configNode;
      nextConfigSig = sig;
    }
  }

  const nextRemoteOrders: Array<[string, OrderRecord]> = [];
  for (const order of state.orders) {
    const cleanOrder = sanitizeOrderForRtdb(order);
    const key = cleanOrder.id;
    const remoteOrder = tracker.remoteOrdersById.get(key);
    const safeOrder = remoteOrder
      ? sanitizeOrderForRtdb(mergeProgressedOrderRecords(cleanOrder, remoteOrder))
      : cleanOrder;
    const sig = computeContentSignature(safeOrder);
    if (tracker.orderSignatures.get(key) === sig) continue;
    patch[`orders/${key}`] = safeOrder;
    nextOrderSigs.push([key, sig]);
    nextRemoteOrders.push([key, safeOrder]);
  }

  for (const product of state.products) {
    const cleanProduct = sanitizeProductForRtdb(product);
    const key = cleanProduct.id;
    const sig = computeContentSignature(cleanProduct);
    if (tracker.productSignatures.get(key) === sig) continue;
    patch[`products/${key}`] = cleanProduct;
    nextProductSigs.push([key, sig]);
  }

  const changedCount = Object.keys(patch).length;
  if (changedCount === 0) {
    return { writtenPaths: 0 };
  }

  patch['meta'] = {
    rev: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    updatedAt: new Date().toISOString(),
  };

  try {
    await update(ref(rtdb, 'orderpulse'), patch);
    if (nextConfigSig) {
      tracker.configExists = true;
      tracker.configSignature = nextConfigSig;
    }
    if (nextWaLiveSig) {
      tracker.whatsappLiveSignature = nextWaLiveSig;
    }
    for (const [key, sig] of nextOrderSigs) {
      tracker.orderSignatures.set(key, sig);
    }
    for (const [key, savedOrder] of nextRemoteOrders) {
      tracker.remoteOrdersById.set(key, savedOrder);
    }
    for (const [key, sig] of nextProductSigs) {
      tracker.productSignatures.set(key, sig);
    }
    return { writtenPaths: changedCount };
  } catch (error) {
    if (isRtdbPermissionDenied(error)) {
      tracker.permissionBlocked = true;
    }
    throw error;
  }
}
