import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import {
  computeContentSignature,
  stripUndefinedDeep,
  toSafeFirestoreDocId,
} from './firestorePayload';
import { hasConfiguredShopify } from './orderRules';
import {
  isAuthorizedRtdbAdmin,
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

export interface RtdbCloudSnapshot {
  settings?: AppSettings;
  storefrontConfig?: StorefrontConfig;
  geoSeoConfig?: GeoSeoConfig;
  whatsappMeta?: {
    mode: WhatsAppState['mode'];
    connectedAt: string | null;
    lastHeartbeatAt?: string | null;
    activeHostKind?: string | null;
    phoneNumber: string | null;
    pushName: string | null;
  };
  orders: OrderRecord[];
  products: ProductCatalogItem[];
}

export interface RtdbSyncTracker {
  initialLoaded: boolean;
  configExists: boolean;
  configSignature: string | null;
  orderSignatures: Map<string, string>;
  productSignatures: Map<string, string>;
  permissionBlocked: boolean;
}

export function createRtdbSyncTracker(): RtdbSyncTracker {
  return {
    initialLoaded: false,
    configExists: false,
    configSignature: null,
    orderSignatures: new Map<string, string>(),
    productSignatures: new Map<string, string>(),
    permissionBlocked: false,
  };
}

export async function signInRtdbWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(rtdbAuth, rtdbGoogleProvider);
  if (!isAuthorizedRtdbAdmin(cred.user)) {
    await signOut(rtdbAuth);
    throw new Error('Please sign in with a verified Google account to access Realtime Database.');
  }
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
    allowedPincodes: Array.isArray(product.allowedPincodes) ? product.allowedPincodes : [],
    blockedPincodes: Array.isArray(product.blockedPincodes) ? product.blockedPincodes : [],
  });
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
          whatsappMeta?: RtdbCloudSnapshot['whatsappMeta'];
        };
        orders?: Record<string, OrderRecord>;
        products?: Record<string, ProductCatalogItem>;
      };

      const configNode = raw.config;
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
      if (raw.orders && typeof raw.orders === 'object') {
        for (const [key, item] of Object.entries(raw.orders)) {
          if (item && typeof item === 'object' && item.orderNumber) {
            const cleanOrder = sanitizeOrderForRtdb(item);
            ordersList.push(cleanOrder);
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
        geoSeoConfig: configNode?.geoSeoConfig,
        whatsappMeta: configNode?.whatsappMeta,
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

  const serverHasShopify = hasConfiguredShopify(state.settings);
  if (serverHasShopify || (!tracker.configExists && state.orders.length > 0)) {
    const configNode = buildRtdbConfigNode({
      settings: state.settings,
      storefrontConfig: state.storefrontConfig,
      geoSeoConfig: state.geoSeoConfig,
      whatsapp: state.whatsapp,
    });
    const sig = computeContentSignature(configNode);
    if (sig !== tracker.configSignature) {
      patch['config'] = configNode;
      nextConfigSig = sig;
    }
  }

  for (const order of state.orders) {
    const cleanOrder = sanitizeOrderForRtdb(order);
    const key = cleanOrder.id;
    const sig = computeContentSignature(cleanOrder);
    if (tracker.orderSignatures.get(key) === sig) continue;
    patch[`orders/${key}`] = cleanOrder;
    nextOrderSigs.push([key, sig]);
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
    for (const [key, sig] of nextOrderSigs) {
      tracker.orderSignatures.set(key, sig);
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
