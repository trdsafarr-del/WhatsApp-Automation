import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  buildDeployEnvSnippet,
  buildOrdersPdfSummaryAndRows,
  computeOrderMetrics,
  extractShopifyCustomerPhone,
  extractShopifyTrackingInfo,
  formatOrderTemplate,
  formatPollPayload,
  getDispatchStatusInfo,
  getIstDateKey,
  getSyncStartCutoffIso,
  getWhatsAppDisplayState,
  hasConfiguredShopify,
  hasHighRtoTag,
  inferInitialPollStatus,
  isHostHeartbeatRecent,
  isOrderDelivered,
  isOrderDispatched,
  isOrderDispatchedToday,
  isOrderInTransit,
  isOrderOnOrAfterStartDate,
  isOrderReadyToDispatch,
  isOrderRtoReturn,
  isTransientWhatsAppError,
  isWhatsAppConnectionReplaced,
  mergeShopifyTags,
  normalizePhoneToWhatsAppJid,
  readCleanEnvVar,
  resolvePollVoteAction,
  selectPriorityAuthFiles,
  shouldAutoDispatchPoll,
  shouldAutoSendTracking,
  shouldPreserveRecentLocalTags,
} from './orderRules.js';
import type { OrderRecord } from './types.js';

test('normalizePhoneToWhatsAppJid formats Indian and international numbers', () => {
  assert.equal(normalizePhoneToWhatsAppJid('+91 98765-43210'), '919876543210@s.whatsapp.net');
  assert.equal(normalizePhoneToWhatsAppJid('09876543210', '91'), '919876543210@s.whatsapp.net');
  assert.equal(normalizePhoneToWhatsAppJid('9876543210', '91'), '919876543210@s.whatsapp.net');
  assert.equal(normalizePhoneToWhatsAppJid('+1 (415) 555-2671', '91'), '14155552671@s.whatsapp.net');
  assert.equal(normalizePhoneToWhatsAppJid('12345'), null);
});

test('formatPollPayload interpolates order variables cleanly', () => {
  const payload = formatPollPayload(
    {
      customerName: 'Aarav Mehta',
      orderNumber: '#1048',
      totalPrice: '2499.00',
      currency: 'INR',
      lineItemsSummary: '1x Linen Kurta',
    },
    DEFAULT_SETTINGS
  );

  assert.match(payload.question, /Aarav Mehta/);
  assert.match(payload.question, /#1048/);
  assert.match(payload.question, /INR 2499\.00/);
  assert.deepEqual(payload.options, ['Confirm Order', 'Cancel Order']);
});

test('resolvePollVoteAction maps Confirm Order and Cancel Order to expected Shopify tags', () => {
  const confirmResult = resolvePollVoteAction('Confirm Order', DEFAULT_SETTINGS);
  assert.deepEqual(confirmResult, {
    decision: 'confirm',
    tagToAdd: 'confirm',
    opposingTag: 'cancelled by user',
    newStatus: 'confirmed',
  });

  const cancelResult = resolvePollVoteAction('Cancel Order', DEFAULT_SETTINGS);
  assert.deepEqual(cancelResult, {
    decision: 'cancel',
    tagToAdd: 'cancelled by user',
    opposingTag: 'confirm',
    newStatus: 'cancelled_by_user',
  });

  assert.equal(resolvePollVoteAction('1', DEFAULT_SETTINGS)?.decision, 'confirm');
  assert.equal(resolvePollVoteAction('2', DEFAULT_SETTINGS)?.decision, 'cancel');
  assert.equal(resolvePollVoteAction('random message', DEFAULT_SETTINGS), null);
});

test('mergeShopifyTags preserves existing tags, avoids duplicates, and removes multiple superseded tags', () => {
  assert.equal(mergeShopifyTags('COD, Priority', 'confirm', 'cancelled by user'), 'COD, Priority, confirm');
  assert.equal(
    mergeShopifyTags('COD, confirm, Priority', 'cancelled by user', 'confirm'),
    'COD, Priority, cancelled by user'
  );
  assert.equal(
    mergeShopifyTags(
      'COD, waiting for confirmation, Priority',
      'confirm',
      ['cancelled by user', 'waiting for confirmation']
    ),
    'COD, Priority, confirm'
  );
  assert.equal(mergeShopifyTags('confirm', 'confirm', 'cancelled by user'), 'confirm');
});

test('computeOrderMetrics computes counts and confirmation rate accurately', () => {
  const baseOrder: Omit<OrderRecord, 'id' | 'pollStatus' | 'pollSentAt' | 'respondedAt'> = {
    shopifyOrderId: '1',
    orderNumber: '#1001',
    customerName: 'Test',
    customerPhone: '+919876543210',
    customerEmail: 'test@example.com',
    totalPrice: '1000',
    currency: 'INR',
    lineItemsSummary: 'Item',
    financialStatus: 'pending',
    shopifyTags: 'COD',
    whatsappMessageId: 'msg-1',
    pollQuestion: 'Confirm?',
    responseChannel: 'whatsapp_poll',
    shopifySynced: true,
    createdAt: '2026-11-12T10:00:00.000Z',
    events: [],
  };

  const orders: OrderRecord[] = [
    {
      ...baseOrder,
      id: '1',
      pollStatus: 'confirmed',
      pollSentAt: '2026-11-12T10:00:00.000Z',
      respondedAt: '2026-11-12T10:04:00.000Z',
    },
    {
      ...baseOrder,
      id: '2',
      pollStatus: 'confirmed',
      pollSentAt: '2026-11-12T10:00:00.000Z',
      respondedAt: '2026-11-12T10:06:00.000Z',
    },
    {
      ...baseOrder,
      id: '3',
      pollStatus: 'cancelled_by_user',
      pollSentAt: '2026-11-12T10:00:00.000Z',
      respondedAt: '2026-11-12T10:02:00.000Z',
    },
    {
      ...baseOrder,
      id: '4',
      pollStatus: 'poll_sent',
      pollSentAt: '2026-11-12T10:10:00.000Z',
      respondedAt: null,
    },
  ];

  const metrics = computeOrderMetrics(orders);
  assert.equal(metrics.totalOrders, 4);
  assert.equal(metrics.pendingPolls, 1);
  assert.equal(metrics.confirmedCount, 2);
  assert.equal(metrics.cancelledCount, 1);
  assert.equal(metrics.confirmationRate, 67);
  assert.equal(metrics.avgResponseMinutes, 4);
});

test('extractShopifyCustomerPhone inspects default_address and note_attributes', () => {
  assert.equal(
    extractShopifyCustomerPhone({
      customer: { default_address: { phone: '9876543210' } },
    }),
    '9876543210'
  );
  assert.equal(
    extractShopifyCustomerPhone({
      note_attributes: [{ name: 'WhatsApp Number', value: '+91 98111 22333' }],
    }),
    '+91 98111 22333'
  );
  assert.equal(extractShopifyCustomerPhone({}), '');
});

test('inferInitialPollStatus and shouldAutoDispatchPoll handle existing tags and age window', () => {
  assert.equal(inferInitialPollStatus({ tags: 'COD, confirm' }, DEFAULT_SETTINGS), 'confirmed');
  assert.equal(
    inferInitialPollStatus({ tags: 'COD, cancelled by user' }, DEFAULT_SETTINGS),
    'cancelled_by_user'
  );
  assert.equal(
    inferInitialPollStatus({ tags: 'COD, waiting for confirmation' }, DEFAULT_SETTINGS),
    'poll_sent'
  );
  assert.equal(
    inferInitialPollStatus({ tags: 'COD', cancelled_at: '2026-11-12T10:00:00Z' }, DEFAULT_SETTINGS),
    'cancelled_by_user'
  );
  assert.equal(inferInitialPollStatus({ tags: 'COD' }, DEFAULT_SETTINGS), 'queued');

  const now = Date.parse('2026-11-13T12:00:00.000Z');
  assert.equal(
    shouldAutoDispatchPoll(
      { pollStatus: 'queued', createdAt: '2026-11-13T11:30:00.000Z' },
      DEFAULT_SETTINGS,
      now
    ),
    true
  );
  assert.equal(
    shouldAutoDispatchPoll(
      { pollStatus: 'queued', createdAt: '2026-11-10T11:30:00.000Z' },
      DEFAULT_SETTINGS,
      now
    ),
    false
  );
  assert.equal(
    shouldAutoDispatchPoll(
      { pollStatus: 'confirmed', createdAt: '2026-11-13T11:30:00.000Z' },
      DEFAULT_SETTINGS,
      now
    ),
    false
  );
  assert.equal(
    shouldAutoDispatchPoll(
      { pollStatus: 'queued', createdAt: '2026-11-13T11:30:00.000Z', financialStatus: 'voided' },
      DEFAULT_SETTINGS,
      now
    ),
    false
  );
  assert.equal(
    shouldAutoDispatchPoll(
      { pollStatus: 'queued', createdAt: '2026-11-13T11:30:00.000Z', financialStatus: 'refunded' },
      DEFAULT_SETTINGS,
      now
    ),
    false
  );
});

test('extractShopifyTrackingInfo, shouldAutoSendTracking, and formatOrderTemplate handle tracking updates', () => {
  const tracking = extractShopifyTrackingInfo({
    fulfillments: [
      { status: 'cancelled', tracking_number: 'OLD', tracking_url: 'https://track.old/1' },
      {
        status: 'success',
        tracking_company: 'BlueDart',
        tracking_number: 'BD123456',
        tracking_url: 'https://bluedart.com/track/BD123456',
        created_at: '2026-11-13T11:50:00.000Z',
      },
    ],
  });
  assert.equal(tracking.trackingCompany, 'BlueDart');
  assert.equal(tracking.trackingNumber, 'BD123456');
  assert.equal(tracking.trackingUrl, 'https://bluedart.com/track/BD123456');

  const now = Date.parse('2026-11-13T12:00:00.000Z');
  // Adding tracking to an existing older order triggers auto-send
  assert.equal(
    shouldAutoSendTracking(
      { trackingUrl: '', trackingNumber: '', trackingSentValue: null },
      {
        customerPhone: '+919876543210',
        createdAt: '2026-11-05T10:00:00.000Z',
        trackingUrl: tracking.trackingUrl,
        trackingNumber: tracking.trackingNumber,
        trackingSentValue: null,
      },
      DEFAULT_SETTINGS,
      tracking.fulfilledAt,
      now
    ),
    true
  );

  // Already sent same tracking link -> does not double-send
  assert.equal(
    shouldAutoSendTracking(
      { trackingUrl: tracking.trackingUrl, trackingNumber: tracking.trackingNumber, trackingSentValue: tracking.trackingUrl },
      {
        customerPhone: '+919876543210',
        createdAt: '2026-11-05T10:00:00.000Z',
        trackingUrl: tracking.trackingUrl,
        trackingNumber: tracking.trackingNumber,
        trackingSentValue: tracking.trackingUrl,
      },
      DEFAULT_SETTINGS,
      tracking.fulfilledAt,
      now
    ),
    false
  );

  const rendered = formatOrderTemplate(
    DEFAULT_SETTINGS.trackingMessageTemplate,
    {
      customerName: 'Akash Bhatt',
      orderNumber: '#1313',
      totalPrice: '1075.00',
      currency: 'INR',
      lineItemsSummary: '1x Cookies',
      trackingCompany: 'BlueDart',
      trackingNumber: 'BD123456',
      trackingUrl: 'https://bluedart.com/track/BD123456',
    },
    DEFAULT_SETTINGS
  );
  assert.match(rendered, /via BlueDart/);
  assert.match(rendered, /https:\/\/bluedart\.com\/track\/BD123456/);
});

test('getSyncStartCutoffIso and isOrderOnOrAfterStartDate filter old orders accurately', () => {
  assert.equal(getSyncStartCutoffIso('2026-11-13'), '2026-11-12T18:30:00.000Z');
  assert.equal(isOrderOnOrAfterStartDate('2026-11-13T13:07:51+05:30', '2026-11-13'), true);
  assert.equal(isOrderOnOrAfterStartDate('2026-11-12T23:59:59+05:30', '2026-11-13'), false);

  const now = Date.parse('2026-11-13T12:00:00.000Z');
  assert.equal(
    shouldAutoDispatchPoll(
      { pollStatus: 'queued', createdAt: '2026-11-12T23:50:00+05:30' },
      { autoSendPollOnNewOrder: true, syncStartDate: '2026-11-13' },
      now
    ),
    false
  );
  assert.equal(
    shouldAutoDispatchPoll(
      { pollStatus: 'queued', createdAt: '2026-11-13T00:05:00+05:30' },
      { autoSendPollOnNewOrder: true, syncStartDate: '2026-11-13' },
      now
    ),
    true
  );
});

test('isTransientWhatsAppError, shouldPreserveRecentLocalTags, and selectPriorityAuthFiles enforce zero data loss', () => {
  assert.equal(isTransientWhatsAppError('Connection Closed'), true);
  assert.equal(isTransientWhatsAppError('Timed Out waiting for socket'), true);
  assert.equal(isTransientWhatsAppError('Recipient not on WhatsApp'), false);

  const now = Date.parse('2026-11-13T12:00:00.000Z');
  assert.equal(
    shouldPreserveRecentLocalTags(
      { respondedAt: '2026-11-13T11:59:10.000Z', pollSentAt: null },
      now
    ),
    true
  );
  assert.equal(
    shouldPreserveRecentLocalTags(
      { respondedAt: '2026-11-13T11:50:00.000Z', pollSentAt: null },
      now
    ),
    false
  );

  const picked = selectPriorityAuthFiles(
    [
      { name: 'pre-key-999.json', size: 400 },
      { name: 'session-9198.json', size: 1200 },
      { name: 'creds.json', size: 2200 },
      { name: 'app-state-sync-key-1.json', size: 500 },
      { name: 'lid-mapping-1.json', size: 300 },
      { name: 'pre-key-giant.json', size: 5000 },
    ],
    4500
  );
  assert.equal(picked[0], 'creds.json');
  assert.ok(picked.includes('app-state-sync-key-1.json'));
  assert.ok(picked.includes('lid-mapping-1.json'));
  assert.ok(picked.includes('session-9198.json'));
  assert.equal(picked.includes('pre-key-giant.json'), false);
});

test('hasConfiguredShopify and buildDeployEnvSnippet prepare clean deploy variables', () => {
  assert.equal(
    hasConfiguredShopify({
      shopifyStoreDomain: 'https://broomiesbakery.myshopify.com',
      shopifyClientId: 'cid',
      shopifyClientSecret: 'csec',
      shopifyAccessToken: '',
    }),
    true
  );
  assert.equal(
    hasConfiguredShopify({
      shopifyStoreDomain: '',
      shopifyClientId: 'cid',
      shopifyClientSecret: 'csec',
      shopifyAccessToken: '',
    }),
    false
  );

  const snippet = buildDeployEnvSnippet({
    shopName: 'Broomies Bakery',
    shopifyStoreDomain: 'https://broomiesbakery.myshopify.com/',
    shopifyClientId: 'cid123',
    shopifyClientSecret: 'sec456',
    shopifyWebhookSecret: '',
    shopifyAccessToken: '',
    syncStartDate: '2026-11-13',
  });
  assert.match(snippet, /SHOPIFY_STORE_DOMAIN=broomiesbakery\.myshopify\.com/);
  assert.match(snippet, /SHOPIFY_CLIENT_ID=cid123/);
  assert.match(snippet, /SYNC_START_DATE=2026-11-13/);
});

test('isHostHeartbeatRecent and getWhatsAppDisplayState handle cloud-synced Vercel host sessions', () => {
  const now = Date.parse('2026-11-13T12:00:00.000Z');
  assert.equal(isHostHeartbeatRecent('2026-11-13T11:58:30.000Z', now), true);
  assert.equal(isHostHeartbeatRecent('2026-11-13T11:50:00.000Z', now), false);
  assert.equal(isHostHeartbeatRecent(null, now), false);

  const remoteLive = getWhatsAppDisplayState(
    {
      status: 'disconnected',
      phoneNumber: '+919266424088',
      connectedAt: '2026-11-13T10:30:00.000Z',
      lastHeartbeatAt: '2026-11-13T11:59:10.000Z',
      remoteSessionActive: true,
      sessionPersisted: true,
      isServerless: true,
    },
    now
  );
  assert.equal(remoteLive.isLinked, true);
  assert.equal(remoteLive.isRemoteLinked, true);
  assert.equal(remoteLive.isLocalConnected, false);
  assert.equal(remoteLive.isHostLive, true);
  assert.equal(remoteLive.statusLabel, 'Connected on Host · Live');
  assert.equal(remoteLive.sidebarLabel, 'Connected (Host)');

  const remoteStale = getWhatsAppDisplayState(
    {
      status: 'disconnected',
      phoneNumber: '+919266424088',
      connectedAt: '2026-11-13T10:30:00.000Z',
      lastHeartbeatAt: '2026-11-13T11:40:00.000Z',
      remoteSessionActive: true,
      sessionPersisted: true,
      isServerless: true,
    },
    now
  );
  assert.equal(remoteStale.isLinked, true);
  assert.equal(remoteStale.isHostLive, false);
  assert.equal(remoteStale.statusLabel, 'Session Saved · Cloud Synced');
  assert.equal(remoteStale.sidebarLabel, 'Synced (Host Session)');

  const unlinked = getWhatsAppDisplayState(
    {
      status: 'disconnected',
      phoneNumber: null,
      connectedAt: null,
      remoteSessionActive: false,
      isServerless: true,
    },
    now
  );
  assert.equal(unlinked.isLinked, false);
  assert.equal(unlinked.statusLabel, 'Not Linked');
  assert.equal(unlinked.sidebarLabel, 'Unlinked');

  assert.equal(isWhatsAppConnectionReplaced(440), true);
  assert.equal(isWhatsAppConnectionReplaced(515), false);
  assert.equal(isWhatsAppConnectionReplaced(undefined), false);

  assert.equal(
    readCleanEnvVar(
      { ' UPSTASH_REDIS_REST_URL ': '"https://demo.upstash.io/"' },
      ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']
    ),
    'https://demo.upstash.io/'
  );
  assert.equal(
    readCleanEnvVar(
      { KV_REST_API_TOKEN: " 'tok_123' " },
      ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']
    ),
    'tok_123'
  );
  assert.equal(readCleanEnvVar({}, ['UPSTASH_REDIS_REST_URL']), '');
});

test('Today Dispatch and PDF summary helpers classify confirmed un-dispatched vs fulfilled orders accurately', () => {
  const baseOrder: OrderRecord = {
    id: 'ord-1',
    shopifyOrderId: '1',
    orderNumber: '#1315',
    customerName: 'Lakshmi p Blgr',
    customerPhone: '+918951722802',
    customerEmail: '',
    totalPrice: '1075.00',
    currency: 'INR',
    lineItemsSummary: '1x Chocolate Cookies Tin (500g)',
    financialStatus: 'pending',
    fulfillmentStatus: null,
    deliverySummary: 'Chitradurga, 577522',
    shopifyTags: 'cod, confirm',
    pollStatus: 'confirmed',
    whatsappMessageId: 'msg-1',
    pollQuestion: 'Confirm?',
    pollSentAt: '2026-11-13T06:00:00.000Z',
    respondedAt: '2026-11-13T06:10:00.000Z',
    responseChannel: 'whatsapp_poll',
    shopifySynced: true,
    createdAt: '2026-11-13T05:55:00.000Z',
    events: [],
  };

  // Confirmed and no tracking/fulfillment -> Ready to dispatch today
  assert.equal(isOrderDispatched(baseOrder), false);
  assert.equal(isOrderReadyToDispatch(baseOrder), true);
  assert.deepEqual(getDispatchStatusInfo(baseOrder), {
    code: 'ready',
    label: 'Dispatch Today',
  });

  // Confirmed and tracking added -> Already dispatched
  const shippedOrder: OrderRecord = {
    ...baseOrder,
    id: 'ord-2',
    orderNumber: '#1314',
    trackingUrl: 'https://track.example/123',
  };
  assert.equal(isOrderDispatched(shippedOrder), true);
  assert.equal(isOrderReadyToDispatch(shippedOrder), false);
  assert.deepEqual(getDispatchStatusInfo(shippedOrder), {
    code: 'dispatched',
    label: 'Dispatched',
  });

  // Confirmed and marked fulfilled in Shopify -> Dispatched even without tracking URL
  const fulfilledNoUrl: OrderRecord = {
    ...baseOrder,
    id: 'ord-3',
    orderNumber: '#1313',
    fulfillmentStatus: 'fulfilled',
  };
  assert.equal(isOrderDispatched(fulfilledNoUrl), true);

  // Pending / cancelled orders are not Ready to dispatch
  const pendingOrder: OrderRecord = {
    ...baseOrder,
    id: 'ord-4',
    orderNumber: '#1312',
    pollStatus: 'poll_sent',
    shopifyTags: 'waiting for confirmation',
  };
  const cancelledOrder: OrderRecord = {
    ...baseOrder,
    id: 'ord-5',
    orderNumber: '#1311',
    pollStatus: 'cancelled_by_user',
    shopifyTags: 'cancelled by user',
  };

  const report = buildOrdersPdfSummaryAndRows([
    baseOrder,
    shippedOrder,
    pendingOrder,
    cancelledOrder,
  ]);
  assert.equal(report.total, 4);
  assert.equal(report.confirmed, 2);
  assert.equal(report.readyToDispatch, 1);
  assert.equal(report.dispatched, 1);
  assert.equal(report.pending, 1);
  assert.equal(report.cancelled, 1);
  assert.equal(report.rows[0].itemsSummary, '1x Chocolate Cookies Tin (500g)');
  assert.equal(report.rows[0].dispatchStatus, 'Dispatch Today');
  assert.equal(report.rows[0].highRto, false);

  assert.equal(hasHighRtoTag('cod, HIGH RTO Risk, Magic, RTO Risk - low'), true);
  assert.equal(hasHighRtoTag('High RTO, confirm'), true);
  assert.equal(hasHighRtoTag('RTO Risk - High'), true);
  assert.equal(hasHighRtoTag('cod, MEDIUM RTO Risk, RTO Risk - low'), false);
  assert.equal(hasHighRtoTag(''), false);

  const highRtoOrder: OrderRecord = {
    ...baseOrder,
    id: 'ord-6',
    orderNumber: '#1318',
    shopifyTags: 'cod, HIGH RTO Risk, Magic, waiting for confirmation',
  };
  const rtoReport = buildOrdersPdfSummaryAndRows([highRtoOrder]);
  assert.equal(rtoReport.rows[0].highRto, true);

  // Today Dispatched (IST date matching)
  const todayNov15Ms = Date.parse('2026-11-15T08:15:00.000Z'); // 13:45 IST on 2026-11-15
  assert.equal(getIstDateKey('2026-11-15T00:22:39+05:30'), '2026-11-15');
  assert.equal(
    isOrderDispatchedToday(
      {
        ...shippedOrder,
        trackingSentAt: '2026-11-15T08:12:34.171Z',
        createdAt: '2026-11-14T13:56:15+05:30',
      },
      todayNov15Ms
    ),
    true
  );
  assert.equal(
    isOrderDispatchedToday(
      {
        ...shippedOrder,
        trackingSentAt: '2026-11-14T05:49:57.276Z',
        createdAt: '2026-11-14T10:37:32+05:30',
      },
      todayNov15Ms
    ),
    false
  );
  assert.equal(
    isOrderDispatchedToday(
      {
        ...fulfilledNoUrl,
        fulfilledAt: '2026-11-15T06:00:00.000Z',
        createdAt: '2026-11-14T10:00:00+05:30',
      },
      todayNov15Ms
    ),
    true
  );
  assert.equal(isOrderDispatchedToday(baseOrder, todayNov15Ms), false);
});

test('In Transit, Delivered, and RTO Return classifiers handle Shopify shipment_status and courier tags without false-positives on RTO Risk', () => {
  const trackingWithShipment = extractShopifyTrackingInfo({
    fulfillments: [
      {
        status: 'success',
        shipment_status: 'in_transit',
        tracking_company: 'Delhivery',
        tracking_number: 'DLV9988',
        tracking_url: 'https://www.delhivery.com/track/package/DLV9988',
      },
    ],
  });
  assert.equal(trackingWithShipment.shipmentStatus, 'in_transit');

  const fulfilledGeneric: OrderRecord = {
    id: 'ord-transit-1',
    shopifyOrderId: '101',
    orderNumber: '#1330',
    customerName: 'Junaid Alam',
    customerPhone: '+917535924844',
    customerEmail: '',
    totalPrice: '1075.00',
    currency: 'INR',
    lineItemsSummary: '1x Cookies',
    financialStatus: 'pending',
    fulfillmentStatus: 'fulfilled',
    shipmentStatus: null,
    trackingCompany: 'Delhivery',
    trackingNumber: 'DLV9988',
    shopifyTags: 'cod, confirm, HIGH RTO Risk, RTO Risk - low',
    pollStatus: 'confirmed',
    whatsappMessageId: null,
    pollQuestion: '',
    pollSentAt: null,
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt: '2026-11-15T06:00:00.000Z',
    events: [],
  };

  // Pre-dispatch HIGH RTO Risk / RTO Risk - low MUST NOT trigger RTO Return
  assert.equal(isOrderRtoReturn(fulfilledGeneric), false);
  assert.equal(isOrderDelivered(fulfilledGeneric), false);
  assert.equal(isOrderInTransit(fulfilledGeneric), true);

  const outForDeliveryOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'out_for_delivery',
  };
  assert.equal(isOrderInTransit(outForDeliveryOrder), true);
  assert.equal(getDispatchStatusInfo(outForDeliveryOrder).label, 'Out for Delivery');

  const deliveredOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'delivered',
  };
  assert.equal(isOrderDelivered(deliveredOrder), true);
  assert.equal(isOrderInTransit(deliveredOrder), false);
  assert.equal(isOrderRtoReturn(deliveredOrder), false);
  assert.deepEqual(getDispatchStatusInfo(deliveredOrder), {
    code: 'delivered',
    label: 'Delivered',
  });

  const deliveredByTag: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: null,
    shopifyTags: 'cod, confirm, delivered',
  };
  assert.equal(isOrderDelivered(deliveredByTag), true);
  assert.equal(isOrderInTransit(deliveredByTag), false);

  // Actual RTO tags & failure shipment_status -> RTO Return (never Delivered/In Transit)
  const rtoFailureOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'failure',
  };
  assert.equal(isOrderRtoReturn(rtoFailureOrder), true);
  assert.equal(isOrderInTransit(rtoFailureOrder), false);
  assert.equal(isOrderDelivered(rtoFailureOrder), false);
  assert.deepEqual(getDispatchStatusInfo(rtoFailureOrder), {
    code: 'rto_return',
    label: 'RTO Return',
  });

  const rtoDeliveredTagOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: null,
    shopifyTags: 'cod, confirm, RTO Delivered',
  };
  assert.equal(isOrderRtoReturn(rtoDeliveredTagOrder), true);
  assert.equal(isOrderDelivered(rtoDeliveredTagOrder), false);
  assert.equal(isOrderInTransit(rtoDeliveredTagOrder), false);

  const pdfReport = buildOrdersPdfSummaryAndRows([
    outForDeliveryOrder,
    deliveredOrder,
    rtoFailureOrder,
  ]);
  assert.equal(pdfReport.inTransit, 1);
  assert.equal(pdfReport.delivered, 1);
  assert.equal(pdfReport.rtoReturn, 1);
});
