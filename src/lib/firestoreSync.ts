import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isFirestoreQuotaExceededMessage,
  OperationType,
} from './firebase';
import {
  buildAppConfigDocPayload,
  buildOrderDocPayload,
  buildProductDocPayload,
  computeContentSignature,
} from './firestorePayload';
import { hasConfiguredShopify } from './orderRules';
import type {
  AppSettings,
  GeoSeoConfig,
  OrderRecord,
  ProductCatalogItem,
  StorefrontConfig,
  WhatsAppState,
} from './types';

export interface CloudBackupSnapshot {
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

export interface FirestoreSyncTracker {
  configExists: boolean;
  configSignature: string | null;
  orderIds: Set<string>;
  orderSignatures: Map<string, string>;
  productIds: Set<string>;
  productSignatures: Map<string, string>;
  initialConfigLoaded: boolean;
  initialOrdersLoaded: boolean;
  initialProductsLoaded: boolean;
  quotaPaused: boolean;
}

export function createSyncTracker(): FirestoreSyncTracker {
  return {
    configExists: false,
    configSignature: null,
    orderIds: new Set<string>(),
    orderSignatures: new Map<string, string>(),
    productIds: new Set<string>(),
    productSignatures: new Map<string, string>(),
    initialConfigLoaded: false,
    initialOrdersLoaded: false,
    initialProductsLoaded: false,
    quotaPaused: false,
  };
}

export async function signInWithGooglePopup(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribes to per-document Firestore collections strictly scoped to the verified owner's UID.
 * Only attaches listeners after Firebase Auth confirms a signed-in verified user.
 */
export function subscribeToOwnerCloudData(
  uid: string,
  tracker: FirestoreSyncTracker,
  onSnapshotUpdate: (snapshot: CloudBackupSnapshot) => void,
  onFatalError: (err: Error) => void
): () => void {
  const latest: CloudBackupSnapshot = {
    orders: [],
    products: [],
  };

  const emitIfReady = () => {
    if (tracker.initialConfigLoaded && tracker.initialOrdersLoaded && tracker.initialProductsLoaded) {
      onSnapshotUpdate({
        ...latest,
        orders: [...latest.orders],
        products: [...latest.products],
      });
    }
  };

  let unsubConfig = () => {};
  let unsubOrders = () => {};
  let unsubProducts = () => {};
  let stopped = false;

  const stopAllListeners = () => {
    if (stopped) return;
    stopped = true;
    unsubConfig();
    unsubOrders();
    unsubProducts();
  };

  const handleListenerError = (error: unknown, op: OperationType, path: string) => {
    const rawMsg = error instanceof Error ? error.message : String(error);
    if (isFirestoreQuotaExceededMessage(rawMsg)) {
      tracker.quotaPaused = true;
      stopAllListeners();
    }
    try {
      handleFirestoreError(error, op, path);
    } catch (wrapped) {
      onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
    }
  };

  const configPath = 'appConfigs/main';
  unsubConfig = onSnapshot(
    doc(db, 'appConfigs', 'main'),
    (snap) => {
      tracker.initialConfigLoaded = true;
      if (snap.exists()) {
        tracker.configExists = true;
        const data = snap.data() as {
          settings?: AppSettings;
          storefrontConfig?: StorefrontConfig;
          geoSeoConfig?: GeoSeoConfig;
          whatsappMeta?: CloudBackupSnapshot['whatsappMeta'];
        };
        latest.settings = data.settings;
        latest.storefrontConfig = data.storefrontConfig;
        latest.geoSeoConfig = data.geoSeoConfig;
        latest.whatsappMeta = data.whatsappMeta;
        if (data.settings && data.storefrontConfig && data.geoSeoConfig) {
          const payload = buildAppConfigDocPayload(
            {
              settings: data.settings,
              storefrontConfig: data.storefrontConfig,
              geoSeoConfig: data.geoSeoConfig,
              whatsapp: {
                mode: data.whatsappMeta?.mode || 'baileys_qr',
                connectedAt: data.whatsappMeta?.connectedAt || null,
                lastHeartbeatAt: null,
                activeHostKind: data.whatsappMeta?.activeHostKind || null,
                phoneNumber: data.whatsappMeta?.phoneNumber || null,
                pushName: data.whatsappMeta?.pushName || null,
              },
            },
            uid
          );
          tracker.configSignature = computeContentSignature(payload);
        }
      } else {
        tracker.configExists = false;
      }
      emitIfReady();
    },
    (error) => handleListenerError(error, OperationType.GET, configPath)
  );

  const ordersPath = 'orders';
  const ordersQuery = query(collection(db, 'orders'), where('ownerUid', '==', uid));
  unsubOrders = onSnapshot(
    ordersQuery,
    (snap) => {
      tracker.initialOrdersLoaded = true;
      const list: OrderRecord[] = [];
      tracker.orderIds.clear();
      snap.forEach((docSnap) => {
        tracker.orderIds.add(docSnap.id);
        const data = docSnap.data() as { record?: OrderRecord };
        if (data.record && typeof data.record === 'object') {
          list.push(data.record);
          const payload = buildOrderDocPayload(data.record, uid);
          tracker.orderSignatures.set(docSnap.id, computeContentSignature(payload));
        }
      });
      list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      latest.orders = list;
      emitIfReady();
    },
    (error) => handleListenerError(error, OperationType.LIST, ordersPath)
  );

  const productsPath = 'products';
  const productsQuery = query(collection(db, 'products'), where('ownerUid', '==', uid));
  unsubProducts = onSnapshot(
    productsQuery,
    (snap) => {
      tracker.initialProductsLoaded = true;
      const list: ProductCatalogItem[] = [];
      tracker.productIds.clear();
      snap.forEach((docSnap) => {
        tracker.productIds.add(docSnap.id);
        const data = docSnap.data() as { record?: ProductCatalogItem };
        if (data.record && typeof data.record === 'object') {
          list.push(data.record);
          const payload = buildProductDocPayload(data.record, uid);
          tracker.productSignatures.set(docSnap.id, computeContentSignature(payload));
        }
      });
      latest.products = list;
      emitIfReady();
    },
    (error) => handleListenerError(error, OperationType.LIST, productsPath)
  );

  return () => {
    stopAllListeners();
  };
}

/**
 * Delta-syncs only modified config, orders, and products to Firestore per document
 * (avoiding monolithic 500 KB blob rewrites and preventing bandwidth exhaustion).
 */
export async function syncDeltaToFirestore(
  uid: string,
  state: {
    settings: AppSettings;
    storefrontConfig: StorefrontConfig;
    geoSeoConfig: GeoSeoConfig;
    whatsapp: WhatsAppState;
    orders: OrderRecord[];
    products: ProductCatalogItem[];
  },
  tracker: FirestoreSyncTracker
): Promise<{ writtenDocs: number }> {
  if (
    tracker.quotaPaused ||
    !tracker.initialConfigLoaded ||
    !tracker.initialOrdersLoaded ||
    !tracker.initialProductsLoaded
  ) {
    return { writtenDocs: 0 };
  }

  let writtenDocs = 0;

  // 1. Config document (never overwrite a populated Firestore config with an empty cold-server config)
  const serverHasShopify = hasConfiguredShopify(state.settings);
  if (serverHasShopify || !tracker.configExists) {
    const configPayload = buildAppConfigDocPayload(
      {
        settings: state.settings,
        storefrontConfig: state.storefrontConfig,
        geoSeoConfig: state.geoSeoConfig,
        whatsapp: state.whatsapp,
      },
      uid
    );
    const nextSig = computeContentSignature(configPayload);
    if (nextSig !== tracker.configSignature && (serverHasShopify || state.orders.length > 0)) {
      const configRef = doc(db, 'appConfigs', 'main');
      try {
        if (!tracker.configExists) {
          await setDoc(configRef, {
            ...configPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          tracker.configExists = true;
        } else {
          const { ownerUid: _ignoreOwner, ...updatable } = configPayload;
          await updateDoc(configRef, {
            ...updatable,
            updatedAt: serverTimestamp(),
          });
        }
        tracker.configSignature = nextSig;
        writtenDocs += 1;
      } catch (error) {
        if (isFirestoreQuotaExceededMessage(error instanceof Error ? error.message : String(error))) {
          tracker.quotaPaused = true;
        }
        handleFirestoreError(
          error,
          tracker.configExists ? OperationType.UPDATE : OperationType.CREATE,
          'appConfigs/main'
        );
      }
    }
  }

  // 2. Delta batch writes for changed orders & products (chunked to <= 350 ops per batch)
  type PendingOp =
    | { kind: 'create'; path: string; ref: ReturnType<typeof doc>; data: Record<string, unknown>; onDone: () => void }
    | { kind: 'update'; path: string; ref: ReturnType<typeof doc>; data: Record<string, unknown>; onDone: () => void };

  const ops: PendingOp[] = [];

  for (const order of state.orders) {
    const payload = buildOrderDocPayload(order, uid);
    const sig = computeContentSignature(payload);
    if (tracker.orderSignatures.get(payload.orderId) === sig) continue;

    const ref = doc(db, 'orders', payload.orderId);
    const exists = tracker.orderIds.has(payload.orderId);
    if (!exists) {
      ops.push({
        kind: 'create',
        path: `orders/${payload.orderId}`,
        ref,
        data: {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        onDone: () => {
          tracker.orderIds.add(payload.orderId);
          tracker.orderSignatures.set(payload.orderId, sig);
        },
      });
    } else {
      const {
        ownerUid: _o,
        orderId: _oid,
        shopifyOrderId: _soid,
        ...updatable
      } = payload;
      ops.push({
        kind: 'update',
        path: `orders/${payload.orderId}`,
        ref,
        data: {
          ...updatable,
          updatedAt: serverTimestamp(),
        },
        onDone: () => {
          tracker.orderSignatures.set(payload.orderId, sig);
        },
      });
    }
  }

  for (const product of state.products) {
    const payload = buildProductDocPayload(product, uid);
    const sig = computeContentSignature(payload);
    if (tracker.productSignatures.get(payload.productId) === sig) continue;

    const ref = doc(db, 'products', payload.productId);
    const exists = tracker.productIds.has(payload.productId);
    if (!exists) {
      ops.push({
        kind: 'create',
        path: `products/${payload.productId}`,
        ref,
        data: {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        onDone: () => {
          tracker.productIds.add(payload.productId);
          tracker.productSignatures.set(payload.productId, sig);
        },
      });
    } else {
      const {
        ownerUid: _o,
        productId: _pid,
        shopifyProductId: _spid,
        ...updatable
      } = payload;
      ops.push({
        kind: 'update',
        path: `products/${payload.productId}`,
        ref,
        data: {
          ...updatable,
          updatedAt: serverTimestamp(),
        },
        onDone: () => {
          tracker.productSignatures.set(payload.productId, sig);
        },
      });
    }
  }

  const CHUNK_SIZE = 350;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.kind === 'create') {
        batch.set(op.ref, op.data);
      } else {
        batch.update(op.ref, op.data);
      }
    }
    try {
      await batch.commit();
      for (const op of chunk) {
        op.onDone();
      }
      writtenDocs += chunk.length;
    } catch (error) {
      if (isFirestoreQuotaExceededMessage(error instanceof Error ? error.message : String(error))) {
        tracker.quotaPaused = true;
      }
      handleFirestoreError(error, OperationType.WRITE, chunk[0]?.path || 'orders');
    }
  }

  return { writtenDocs };
}
