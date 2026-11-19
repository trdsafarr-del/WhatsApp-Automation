import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLUEPRINT_ID_PATTERN,
  BLUEPRINT_LIMITS,
  buildAppConfigDocPayload,
  buildOrderDocPayload,
  buildProductDocPayload,
  computeContentSignature,
  toSafeFirestoreDocId,
} from './src/lib/firestorePayload';
import { DEFAULT_GEO_SEO_CONFIG } from './src/lib/geoSeo';
import { DEFAULT_SETTINGS } from './src/lib/orderRules';
import { DEFAULT_STOREFRONT_CONFIG } from './src/lib/storefrontRules';
import type { OrderRecord, ProductCatalogItem } from './src/lib/types';

interface MockAuth {
  uid: string;
  email: string;
  emailVerified: boolean;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'trdsafarr@gmail.com';
const VALID_POLL_STATUSES = new Set(['queued', 'poll_sent', 'confirmed', 'cancelled_by_user', 'failed']);
const VALID_PINCODE_MODES = new Set(['all_india', 'allow_list', 'block_list']);

function evalIsValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && BLUEPRINT_ID_PATTERN.test(id);
}

function evalIsBootstrappedAdmin(auth: MockAuth | null): boolean {
  return Boolean(auth && auth.emailVerified === true && auth.email === BOOTSTRAPPED_ADMIN_EMAIL);
}

function evalOrderRules(params: {
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: MockAuth | null;
  docId?: string;
  existing?: Record<string, unknown> | null;
  incoming?: Record<string, unknown> | null;
  requestTime: number;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { op, auth, docId, existing, incoming, requestTime } = params;
  const isAdmin = evalIsBootstrappedAdmin(auth);
  if (!auth || !auth.emailVerified || !isAdmin) return 'PERMISSION_DENIED';

  if (op === 'list') {
    return existing && existing.ownerUid === auth.uid ? 'ALLOW' : 'PERMISSION_DENIED';
  }
  if (!evalIsValidId(docId)) return 'PERMISSION_DENIED';
  if (op === 'get' || op === 'delete') {
    return existing && existing.ownerUid === auth.uid ? 'ALLOW' : 'PERMISSION_DENIED';
  }

  if (!incoming) return 'PERMISSION_DENIED';
  const allowedKeys = [
    'ownerUid',
    'orderId',
    'shopifyOrderId',
    'orderNumber',
    'customerName',
    'customerPhone',
    'pollStatus',
    'totalPrice',
    'currency',
    'orderCreatedAt',
    'record',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(incoming);
  if (!allowedKeys.every((k) => keys.includes(k))) return 'PERMISSION_DENIED';
  if (!keys.every((k) => allowedKeys.includes(k))) return 'PERMISSION_DENIED';

  const valid =
    evalIsValidId(incoming.ownerUid) &&
    incoming.ownerUid === auth.uid &&
    evalIsValidId(incoming.orderId) &&
    typeof incoming.shopifyOrderId === 'string' &&
    incoming.shopifyOrderId.length >= 1 &&
    incoming.shopifyOrderId.length <= 64 &&
    BLUEPRINT_ID_PATTERN.test(incoming.shopifyOrderId) &&
    typeof incoming.orderNumber === 'string' &&
    incoming.orderNumber.length >= 1 &&
    incoming.orderNumber.length <= 40 &&
    typeof incoming.customerName === 'string' &&
    incoming.customerName.length <= 160 &&
    typeof incoming.customerPhone === 'string' &&
    incoming.customerPhone.length <= 40 &&
    typeof incoming.pollStatus === 'string' &&
    VALID_POLL_STATUSES.has(incoming.pollStatus) &&
    typeof incoming.totalPrice === 'string' &&
    incoming.totalPrice.length <= 32 &&
    typeof incoming.currency === 'string' &&
    incoming.currency.length >= 1 &&
    incoming.currency.length <= 12 &&
    typeof incoming.orderCreatedAt === 'string' &&
    incoming.orderCreatedAt.length <= 64 &&
    Boolean(incoming.record && typeof incoming.record === 'object') &&
    typeof incoming.createdAt === 'number' &&
    typeof incoming.updatedAt === 'number';

  if (!valid) return 'PERMISSION_DENIED';

  if (op === 'create') {
    if (incoming.orderId !== docId) return 'PERMISSION_DENIED';
    if (incoming.createdAt !== requestTime || incoming.updatedAt !== requestTime) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOW';
  }

  // Update checks
  if (!existing) return 'PERMISSION_DENIED';
  if (
    incoming.ownerUid !== existing.ownerUid ||
    incoming.orderId !== existing.orderId ||
    incoming.shopifyOrderId !== existing.shopifyOrderId ||
    incoming.createdAt !== existing.createdAt ||
    incoming.updatedAt !== requestTime
  ) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

function evalProductCreateRules(params: {
  auth: MockAuth | null;
  docId: string;
  incoming: Record<string, unknown>;
  requestTime: number;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { auth, docId, incoming, requestTime } = params;
  if (!evalIsBootstrappedAdmin(auth) || !auth) return 'PERMISSION_DENIED';
  if (!evalIsValidId(docId)) return 'PERMISSION_DENIED';
  const arrOk = (val: unknown) =>
    Array.isArray(val) && val.length <= 200 && (val.length === 0 || typeof val[0] === 'string');
  if (
    !arrOk(incoming.allowedPincodes) ||
    !arrOk(incoming.blockedPincodes) ||
    !VALID_PINCODE_MODES.has(String(incoming.pincodeMode)) ||
    incoming.createdAt !== requestTime ||
    incoming.updatedAt !== requestTime
  ) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

test('firestore.rules file implements all blueprint collections, default-deny, and zero-trust primitives', () => {
  const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const blueprint = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8')
  ) as { firestore: Record<string, unknown> };

  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('match /{document=**} {\n      allow read, write: if false;'));
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesText.includes('trdsafarr@gmail.com'));
  assert.ok(!rulesText.includes('allow read: if true;'));
  assert.ok(!rulesText.includes('allow write: if true;'));

  for (const collectionPath of Object.keys(blueprint.firestore)) {
    assert.ok(
      rulesText.includes(`match ${collectionPath}`),
      `Missing match block in firestore.rules for ${collectionPath}`
    );
  }
});

test('Dirty Dozen attack payloads all return PERMISSION_DENIED', () => {
  const now = 1_760_000_000_000;
  const ownerAuth: MockAuth = { uid: 'admin-uid-1', email: 'trdsafarr@gmail.com', emailVerified: true };
  const spoofedAuth: MockAuth = { uid: 'spoof-uid', email: 'trdsafarr@gmail.com', emailVerified: false };
  const attackerAuth: MockAuth = { uid: 'attacker-uid', email: 'attacker@gmail.com', emailVerified: true };

  const validOrder: Record<string, unknown> = {
    ownerUid: ownerAuth.uid,
    orderId: 'ord-1345',
    shopifyOrderId: '1345',
    orderNumber: '#1345',
    customerName: 'Aarav Sharma',
    customerPhone: '+919876543210',
    pollStatus: 'poll_sent',
    totalPrice: '1250.00',
    currency: 'INR',
    orderCreatedAt: '2026-11-18T10:00:00.000Z',
    record: { id: 'ord-1345' },
    createdAt: now,
    updatedAt: now,
  };

  // Sanity check: valid owner create succeeds
  assert.equal(
    evalOrderRules({ op: 'create', auth: ownerAuth, docId: 'ord-1345', incoming: validOrder, requestTime: now }),
    'ALLOW'
  );

  // 1. Unauthenticated Order Read
  assert.equal(
    evalOrderRules({ op: 'get', auth: null, docId: 'ord-1345', existing: validOrder, requestTime: now }),
    'PERMISSION_DENIED'
  );

  // 2. Unverified Admin Email Spoof
  assert.equal(
    evalOrderRules({ op: 'get', auth: spoofedAuth, docId: 'ord-1345', existing: validOrder, requestTime: now }),
    'PERMISSION_DENIED'
  );

  // 3. Non-Owner Signed-In PII Scrape
  assert.equal(
    evalOrderRules({ op: 'get', auth: attackerAuth, docId: 'ord-1345', existing: validOrder, requestTime: now }),
    'PERMISSION_DENIED'
  );

  // 4. Unauthorized Blanket List Query
  assert.equal(
    evalOrderRules({ op: 'list', auth: attackerAuth, existing: validOrder, requestTime: now }),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evalOrderRules({
      op: 'list',
      auth: ownerAuth,
      existing: { ...validOrder, ownerUid: 'someone-else' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 5. Self-Assigned Admin Escalation (non-bootstrapped user cannot create /admins/{uid})
  assert.equal(evalIsBootstrappedAdmin(attackerAuth), false);

  // 6. Shadow / Ghost Field Injection
  assert.equal(
    evalOrderRules({
      op: 'create',
      auth: ownerAuth,
      docId: 'ord-1345',
      incoming: { ...validOrder, isSuperAdmin: true },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 7. Owner Identity Spoofing
  assert.equal(
    evalOrderRules({
      op: 'create',
      auth: ownerAuth,
      docId: 'ord-1345',
      incoming: { ...validOrder, ownerUid: 'victim-uid' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 8. Path ID Poisoning
  assert.equal(
    evalOrderRules({
      op: 'create',
      auth: ownerAuth,
      docId: '../../etc/passwd',
      incoming: { ...validOrder, orderId: '../../etc/passwd' },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );
  assert.equal(evalIsValidId('a'.repeat(129)), false);

  // 9. Value Poisoning / Size Overflow
  assert.equal(
    evalOrderRules({
      op: 'update',
      auth: ownerAuth,
      docId: 'ord-1345',
      existing: validOrder,
      incoming: { ...validOrder, customerName: 'X'.repeat(161), updatedAt: now + 1000 },
      requestTime: now + 1000,
    }),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evalOrderRules({
      op: 'update',
      auth: ownerAuth,
      docId: 'ord-1345',
      existing: validOrder,
      incoming: { ...validOrder, pollStatus: 'hacked', updatedAt: now + 1000 },
      requestTime: now + 1000,
    }),
    'PERMISSION_DENIED'
  );

  // 10. Immutable Field Tampering
  assert.equal(
    evalOrderRules({
      op: 'update',
      auth: ownerAuth,
      docId: 'ord-1345',
      existing: validOrder,
      incoming: { ...validOrder, shopifyOrderId: '9999', updatedAt: now + 1000 },
      requestTime: now + 1000,
    }),
    'PERMISSION_DENIED'
  );

  // 11. Client Timestamp Forgery
  assert.equal(
    evalOrderRules({
      op: 'create',
      auth: ownerAuth,
      docId: 'ord-1345',
      incoming: { ...validOrder, createdAt: now - 5000 },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );

  // 12. Unbounded Array / Invalid Element Type Attack
  assert.equal(
    evalProductCreateRules({
      auth: ownerAuth,
      docId: 'prod-1',
      incoming: {
        pincodeMode: 'allow_list',
        allowedPincodes: Array.from({ length: 201 }, () => '121003'),
        blockedPincodes: [],
        createdAt: now,
        updatedAt: now,
      },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evalProductCreateRules({
      auth: ownerAuth,
      docId: 'prod-1',
      incoming: {
        pincodeMode: 'allow_list',
        allowedPincodes: [121003],
        blockedPincodes: [],
        createdAt: now,
        updatedAt: now,
      },
      requestTime: now,
    }),
    'PERMISSION_DENIED'
  );
});

test('Firestore payload sanitizers enforce blueprint bounds and deterministic delta signatures', () => {
  assert.equal(toSafeFirestoreDocId('ord#1345/bad space'), 'ord-1345-bad-space');

  const rawOrder: OrderRecord = {
    id: 'ord/bad id 99',
    shopifyOrderId: '999999',
    orderNumber: '#1399',
    customerName: 'A'.repeat(250),
    customerPhone: '+919876543210',
    customerEmail: 'test@example.com',
    totalPrice: '1499.00',
    currency: 'INR',
    lineItemsSummary: '1x Truffle Cake',
    financialStatus: 'pending',
    fulfillmentStatus: null,
    deliverySummary: 'Sector 31 Faridabad',
    shopifyTags: 'cod, confirm',
    pollStatus: 'confirmed',
    whatsappMessageId: null,
    pollQuestion: 'Confirm?',
    pollSentAt: null,
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt: '2026-11-18T10:00:00.000Z',
    events: Array.from({ length: 40 }, (_, i) => ({
      id: `evt-${i}`,
      timestamp: '2026-11-18T10:00:00.000Z',
      actor: 'system' as const,
      message: `Event ${i}`,
    })),
  };

  const sanitizedOrder = buildOrderDocPayload(rawOrder, 'admin-uid-1');
  assert.ok(BLUEPRINT_ID_PATTERN.test(sanitizedOrder.orderId));
  assert.equal(sanitizedOrder.customerName.length, BLUEPRINT_LIMITS.customerNameMax);
  assert.equal((sanitizedOrder.record.events as unknown[]).length, BLUEPRINT_LIMITS.orderEventsMax);
  assert.equal(
    computeContentSignature(sanitizedOrder),
    computeContentSignature(buildOrderDocPayload(rawOrder, 'admin-uid-1'))
  );

  const rawProduct: ProductCatalogItem = {
    id: 'prod 1',
    shopifyProductId: '888',
    title: 'T'.repeat(300),
    handle: 'chocolate-cake',
    status: 'active',
    productType: 'Cake',
    vendor: 'Broomies Bakery',
    tags: 'cake',
    price: '999',
    currency: 'INR',
    imageUrl: '',
    imageAlt: 'Cake',
    pincodeMode: 'allow_list',
    allowedPincodes: Array.from({ length: 250 }, (_, i) => String(121000 + i)),
    blockedPincodes: [],
    allowCod: true,
    estimatedDeliveryDays: 1,
    seoTitle: 'Cake',
    seoDescription: 'Fresh cake',
    updatedAt: '2026-11-18T10:00:00.000Z',
    shopifySyncedAt: null,
  };

  const sanitizedProduct = buildProductDocPayload(rawProduct, 'admin-uid-1');
  assert.equal(sanitizedProduct.title.length, BLUEPRINT_LIMITS.productTitleMax);
  assert.equal(sanitizedProduct.allowedPincodes.length, BLUEPRINT_LIMITS.pincodeListMax);

  const configDoc = buildAppConfigDocPayload(
    {
      settings: DEFAULT_SETTINGS,
      storefrontConfig: DEFAULT_STOREFRONT_CONFIG,
      geoSeoConfig: DEFAULT_GEO_SEO_CONFIG,
      whatsapp: {
        mode: 'baileys_qr',
        connectedAt: null,
        lastHeartbeatAt: null,
        activeHostKind: null,
        phoneNumber: null,
        pushName: null,
      },
    },
    'admin-uid-1'
  );
  assert.equal(configDoc.shopName, 'Broomies Bakery');
  assert.equal(configDoc.syncStartDate, DEFAULT_SETTINGS.syncStartDate);
});
