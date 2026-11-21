import type {
  AppSettings,
  GeoSeoConfig,
  OrderRecord,
  ProductCatalogItem,
  StorefrontConfig,
  WhatsAppState,
} from './types.js';

export const BLUEPRINT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const BLUEPRINT_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})?$/;

export const BLUEPRINT_LIMITS = {
  idMax: 128,
  shopifyIdMax: 64,
  shopNameMax: 120,
  shopifyDomainMax: 160,
  syncStartDateMax: 20,
  orderNumberMax: 40,
  customerNameMax: 160,
  customerPhoneMax: 40,
  totalPriceMax: 32,
  currencyMax: 12,
  orderCreatedAtMax: 64,
  productTitleMax: 240,
  productHandleMax: 200,
  pincodeListMax: 200,
  orderEventsMax: 25,
} as const;

const VALID_POLL_STATUSES = new Set([
  'queued',
  'poll_sent',
  'confirmed',
  'cancelled_by_user',
  'failed',
]);

const VALID_PINCODE_MODES = new Set(['all_india', 'allow_list', 'block_list']);

function clampStr(value: unknown, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
  const finalStr = str || fallback;
  return finalStr.length > maxLen ? finalStr.slice(0, maxLen) : finalStr;
}

/**
 * Recursively strips `undefined` values so Firestore native Map/List writes never reject.
 */
export function stripUndefinedDeep<T>(input: T): T {
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (val !== undefined) {
        out[key] = stripUndefinedDeep(val);
      }
    }
    return out as T;
  }
  return input;
}

/**
 * Normalizes any identifier to satisfy `isValidId()` (`^[a-zA-Z0-9_-]+$`, 1..128 chars).
 */
export function toSafeFirestoreDocId(raw: string, fallbackPrefix = 'doc'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BLUEPRINT_LIMITS.idMax);
  if (cleaned && BLUEPRINT_ID_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`.slice(0, BLUEPRINT_LIMITS.idMax);
}

export interface SanitizedAppConfigFields {
  ownerUid: string;
  shopName: string;
  shopifyStoreDomain: string;
  syncStartDate: string;
  settings: Record<string, unknown>;
  storefrontConfig: Record<string, unknown>;
  geoSeoConfig: Record<string, unknown>;
  whatsappMeta: Record<string, unknown>;
}

export function buildAppConfigDocPayload(
  params: {
    settings: AppSettings;
    storefrontConfig: StorefrontConfig;
    geoSeoConfig: GeoSeoConfig;
    whatsapp: Pick<
      WhatsAppState,
      'mode' | 'connectedAt' | 'lastHeartbeatAt' | 'activeHostKind' | 'phoneNumber' | 'pushName'
    >;
  },
  ownerUid: string
): SanitizedAppConfigFields {
  const safeOwnerUid = toSafeFirestoreDocId(ownerUid, 'owner');
  const rawDate = clampStr(params.settings.syncStartDate, BLUEPRINT_LIMITS.syncStartDateMax);
  const syncStartDate = BLUEPRINT_DATE_PATTERN.test(rawDate) ? rawDate : '';

  return {
    ownerUid: safeOwnerUid,
    shopName: clampStr(params.settings.shopName, BLUEPRINT_LIMITS.shopNameMax, 'Broomies Bakery'),
    shopifyStoreDomain: clampStr(params.settings.shopifyStoreDomain, BLUEPRINT_LIMITS.shopifyDomainMax),
    syncStartDate,
    settings: stripUndefinedDeep({ ...params.settings }) as Record<string, unknown>,
    storefrontConfig: stripUndefinedDeep({ ...params.storefrontConfig }) as Record<string, unknown>,
    geoSeoConfig: stripUndefinedDeep({ ...params.geoSeoConfig }) as Record<string, unknown>,
    whatsappMeta: stripUndefinedDeep({
      mode: params.whatsapp.mode || 'baileys_qr',
      connectedAt: params.whatsapp.connectedAt || null,
      lastHeartbeatAt: null,
      activeHostKind: params.whatsapp.activeHostKind || null,
      phoneNumber: params.whatsapp.phoneNumber || null,
      pushName: params.whatsapp.pushName || null,
    }),
  };
}

export interface SanitizedOrderFields {
  ownerUid: string;
  orderId: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pollStatus: OrderRecord['pollStatus'];
  totalPrice: string;
  currency: string;
  orderCreatedAt: string;
  record: Record<string, unknown>;
}

export function buildOrderDocPayload(order: OrderRecord, ownerUid: string): SanitizedOrderFields {
  const safeOwnerUid = toSafeFirestoreDocId(ownerUid, 'owner');
  const orderId = toSafeFirestoreDocId(order.id || `ord-${order.shopifyOrderId}`, 'ord');
  const shopifyOrderId = toSafeFirestoreDocId(
    order.shopifyOrderId || orderId,
    'shop'
  ).slice(0, BLUEPRINT_LIMITS.shopifyIdMax);
  const pollStatus = VALID_POLL_STATUSES.has(order.pollStatus) ? order.pollStatus : 'queued';

  const boundedEvents = Array.isArray(order.events)
    ? order.events.slice(-BLUEPRINT_LIMITS.orderEventsMax)
    : [];

  return {
    ownerUid: safeOwnerUid,
    orderId,
    shopifyOrderId,
    orderNumber: clampStr(order.orderNumber, BLUEPRINT_LIMITS.orderNumberMax, '#0'),
    customerName: clampStr(order.customerName, BLUEPRINT_LIMITS.customerNameMax),
    customerPhone: clampStr(order.customerPhone, BLUEPRINT_LIMITS.customerPhoneMax),
    pollStatus,
    totalPrice: clampStr(order.totalPrice, BLUEPRINT_LIMITS.totalPriceMax, '0'),
    currency: clampStr(order.currency, BLUEPRINT_LIMITS.currencyMax, 'INR'),
    orderCreatedAt: clampStr(
      order.createdAt,
      BLUEPRINT_LIMITS.orderCreatedAtMax,
      new Date().toISOString()
    ),
    record: stripUndefinedDeep({
      ...order,
      id: orderId,
      shopifyOrderId,
      pollStatus,
      events: boundedEvents,
    }) as Record<string, unknown>,
  };
}

export interface SanitizedProductFields {
  ownerUid: string;
  productId: string;
  shopifyProductId: string;
  title: string;
  handle: string;
  pincodeMode: ProductCatalogItem['pincodeMode'];
  allowedPincodes: string[];
  blockedPincodes: string[];
  record: Record<string, unknown>;
}

export function buildProductDocPayload(
  product: ProductCatalogItem,
  ownerUid: string
): SanitizedProductFields {
  const safeOwnerUid = toSafeFirestoreDocId(ownerUid, 'owner');
  const productId = toSafeFirestoreDocId(product.id || `prod-${product.shopifyProductId}`, 'prod');
  const shopifyProductId = toSafeFirestoreDocId(
    product.shopifyProductId || productId,
    'sp'
  ).slice(0, BLUEPRINT_LIMITS.shopifyIdMax);
  const pincodeMode = VALID_PINCODE_MODES.has(product.pincodeMode)
    ? product.pincodeMode
    : 'all_india';

  const allowedPincodes = (Array.isArray(product.allowedPincodes) ? product.allowedPincodes : [])
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .slice(0, BLUEPRINT_LIMITS.pincodeListMax);

  const blockedPincodes = (Array.isArray(product.blockedPincodes) ? product.blockedPincodes : [])
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .slice(0, BLUEPRINT_LIMITS.pincodeListMax);

  return {
    ownerUid: safeOwnerUid,
    productId,
    shopifyProductId,
    title: clampStr(product.title, BLUEPRINT_LIMITS.productTitleMax, 'Untitled Product'),
    handle: clampStr(product.handle, BLUEPRINT_LIMITS.productHandleMax),
    pincodeMode,
    allowedPincodes,
    blockedPincodes,
    record: stripUndefinedDeep({
      ...product,
      id: productId,
      shopifyProductId,
      pincodeMode,
      allowedPincodes,
      blockedPincodes,
    }) as Record<string, unknown>,
  };
}

function canonicalizeForSignature(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeForSignature(item));
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) {
        sorted[key] = canonicalizeForSignature(v);
      }
    }
    return sorted;
  }
  return value;
}

export function computeContentSignature(value: unknown): string {
  return JSON.stringify(canonicalizeForSignature(value));
}
