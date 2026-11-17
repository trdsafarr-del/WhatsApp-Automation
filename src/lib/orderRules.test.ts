import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  buildDailyReportSummary,
  buildDeployEnvSnippet,
  buildOrdersPdfSummaryAndRows,
  buildProfitLossReport,
  buildSettlementAndDelaySummary,
  calculateOrderPnl,
  calculateUnitEconomicsSimulation,
  computeBillableParcelWeightGrams,
  computeIncrementalRtoLegCost,
  computeMetaAdDaysInRange,
  computeOrderMetrics,
  detectHostRuntimeKind,
  extractCleanIndianPincode,
  extractShopifyCustomerPhone,
  extractShopifyTrackingInfo,
  filterOrdersByIstDateRange,
  formatIstDateDisplay,
  formatOrderTemplate,
  formatPollPayload,
  getDispatchStatusInfo,
  getIstDateKey,
  getIstMonthKey,
  getMonthIstDateBounds,
  getOrderDeliveryDelayInfo,
  getOrderSettlementInfo,
  getSyncStartCutoffIso,
  getWhatsAppDisplayState,
  hasConfiguredShopify,
  hasHighRtoTag,
  hasOrderTrackingAdded,
  inferInitialPollStatus,
  isHostHeartbeatRecent,
  isOrderDelivered,
  isOrderDispatched,
  isOrderDispatchedToday,
  isOrderInTransit,
  isOrderNotConfirmedOnWhatsApp,
  isOrderOnOrAfterStartDate,
  isOrderReadyToDispatch,
  isOrderRtoReturn,
  isOrderTrackingAdded,
  isTransientWhatsAppError,
  isWhatsAppConnectionReplaced,
  mergeProgressedOrderRecords,
  mergeShopifyTags,
  normalizePhoneToWhatsAppJid,
  parseDelhiveryBillingCsv,
  readCleanEnvVar,
  resolvePollVoteAction,
  selectPriorityAuthFiles,
  shiftMonthKey,
  shouldAutoDispatchPoll,
  shouldAutoSendTracking,
  shouldBackupWhatsAppAuth,
  shouldFetchFullRemoteDb,
  shouldPreserveRecentLocalNote,
  shouldPreserveRecentLocalTags,
  shouldSkipAutoRestoreForRemoteHost,
  splitDelhiveryChargeWithGst,
} from './orderRules.js';
import { buildMonthlyExcelWorkbook } from './exportExcelReport.js';
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
      activeHostKind: 'railway',
      hostKind: 'serverless',
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

  // A paused Railway server viewing itself MUST report Session Paused (never fake WA Live)
  const pausedRailway = getWhatsAppDisplayState(
    {
      status: 'disconnected',
      phoneNumber: '+919266424088',
      connectedAt: '2026-11-13T10:30:00.000Z',
      lastHeartbeatAt: '2026-11-13T11:59:10.000Z',
      remoteSessionActive: true,
      activeHostKind: 'railway',
      hostKind: 'railway',
      sessionPersisted: true,
      isServerless: false,
    },
    now
  );
  assert.equal(pausedRailway.isLinked, false);
  assert.equal(pausedRailway.isHostLive, false);
  assert.equal(pausedRailway.statusLabel, 'Session Paused');
  assert.equal(pausedRailway.sidebarLabel, 'Paused');

  const remoteStale = getWhatsAppDisplayState(
    {
      status: 'disconnected',
      phoneNumber: '+919266424088',
      connectedAt: '2026-11-13T10:30:00.000Z',
      lastHeartbeatAt: '2026-11-13T11:40:00.000Z',
      remoteSessionActive: true,
      activeHostKind: 'railway',
      hostKind: 'serverless',
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
  // Confirmed/label-added orders without pickup belong in Tracking Added, NOT In Transit
  const labelAddedOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'confirmed',
  };
  assert.equal(isOrderRtoReturn(labelAddedOrder), false);
  assert.equal(isOrderDelivered(labelAddedOrder), false);
  assert.equal(isOrderTrackingAdded(labelAddedOrder), true);
  assert.equal(isOrderInTransit(labelAddedOrder), false);
  assert.deepEqual(getDispatchStatusInfo(labelAddedOrder), {
    code: 'tracking_added',
    label: 'Tracking Added',
  });

  // Once courier picks up parcel (picked_up / in_transit / out_for_delivery), it moves from Tracking Added -> In Transit
  const pickedUpOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'picked_up',
  };
  assert.equal(isOrderTrackingAdded(pickedUpOrder), false);
  assert.equal(isOrderInTransit(pickedUpOrder), true);
  assert.deepEqual(getDispatchStatusInfo(pickedUpOrder), {
    code: 'in_transit',
    label: 'In Transit',
  });

  const outForDeliveryOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'out_for_delivery',
  };
  assert.equal(isOrderTrackingAdded(outForDeliveryOrder), false);
  assert.equal(isOrderInTransit(outForDeliveryOrder), true);
  assert.equal(getDispatchStatusInfo(outForDeliveryOrder).label, 'Out for Delivery');

  const deliveredOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'delivered',
  };
  assert.equal(isOrderDelivered(deliveredOrder), true);
  assert.equal(isOrderTrackingAdded(deliveredOrder), false);
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
  assert.equal(isOrderTrackingAdded(deliveredByTag), false);
  assert.equal(isOrderInTransit(deliveredByTag), false);

  // Actual RTO tags & failure shipment_status -> RTO Return (never Tracking Added/In Transit/Delivered)
  const rtoFailureOrder: OrderRecord = {
    ...fulfilledGeneric,
    shipmentStatus: 'failure',
  };
  assert.equal(isOrderRtoReturn(rtoFailureOrder), true);
  assert.equal(isOrderTrackingAdded(rtoFailureOrder), false);
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
    labelAddedOrder,
    outForDeliveryOrder,
    deliveredOrder,
    rtoFailureOrder,
  ]);
  assert.equal(pdfReport.trackingAdded, 1);
  assert.equal(pdfReport.inTransit, 1);
  assert.equal(pdfReport.delivered, 1);
  assert.equal(pdfReport.rtoReturn, 1);
});

test('Daily report summary, IST date-range filter, and WhatsApp/tracking report classifiers compute accurate counts', () => {
  const baseOrder: OrderRecord = {
    id: 'rep-1',
    shopifyOrderId: '201',
    orderNumber: '#1401',
    customerName: 'Rohan Sharma',
    customerPhone: '+919876543210',
    customerEmail: '',
    totalPrice: '1000.00',
    currency: 'INR',
    lineItemsSummary: '1x Almond Cookies',
    financialStatus: 'pending',
    fulfillmentStatus: null,
    shipmentStatus: null,
    trackingCompany: '',
    trackingNumber: '',
    trackingUrl: '',
    shopifyTags: 'cod, waiting for confirmation',
    pollStatus: 'poll_sent',
    whatsappMessageId: 'msg-1',
    pollQuestion: 'Confirm?',
    pollSentAt: '2026-11-15T06:00:00.000Z',
    respondedAt: null,
    responseChannel: 'whatsapp_poll',
    shopifySynced: true,
    createdAt: '2026-11-15T05:30:00.000Z', // 2026-11-15 11:00 IST
    events: [],
  };

  const nov15ConfirmedReady: OrderRecord = {
    ...baseOrder,
    id: 'rep-2',
    orderNumber: '#1402',
    pollStatus: 'confirmed',
    shopifyTags: 'cod, confirm',
    totalPrice: '1500.00',
    createdAt: '2026-11-15T10:00:00.000Z', // 2026-11-15 15:30 IST
  };

  const nov15ConfirmedTrackingAdded: OrderRecord = {
    ...baseOrder,
    id: 'rep-3',
    orderNumber: '#1403',
    pollStatus: 'confirmed',
    fulfillmentStatus: 'fulfilled',
    shipmentStatus: 'confirmed',
    trackingCompany: 'Delhivery',
    trackingNumber: 'DLV100',
    totalPrice: '2000.00',
    createdAt: '2026-11-14T20:00:00.000Z', // 2026-11-15 01:30 IST
  };

  const nov14Cancelled: OrderRecord = {
    ...baseOrder,
    id: 'rep-4',
    orderNumber: '#1404',
    pollStatus: 'cancelled_by_user',
    shopifyTags: 'cancelled by user',
    totalPrice: '800.00',
    createdAt: '2026-11-14T12:00:00.000Z', // 2026-11-14 17:30 IST
  };

  const nov14InTransit: OrderRecord = {
    ...baseOrder,
    id: 'rep-5',
    orderNumber: '#1405',
    pollStatus: 'confirmed',
    fulfillmentStatus: 'fulfilled',
    shipmentStatus: 'in_transit',
    trackingNumber: 'DLV200',
    totalPrice: '1200.00',
    createdAt: '2026-11-14T14:00:00.000Z', // 2026-11-14 19:30 IST
  };

  assert.equal(isOrderNotConfirmedOnWhatsApp(baseOrder), true);
  assert.equal(isOrderNotConfirmedOnWhatsApp(nov15ConfirmedReady), false);
  assert.equal(isOrderNotConfirmedOnWhatsApp(nov14Cancelled), false);

  assert.equal(hasOrderTrackingAdded(nov15ConfirmedReady), false);
  assert.equal(hasOrderTrackingAdded(nov15ConfirmedTrackingAdded), true);
  assert.equal(hasOrderTrackingAdded(nov14InTransit), true);

  assert.equal(formatIstDateDisplay('2026-11-15'), '15 Nov 2026');

  const all = [
    baseOrder,
    nov15ConfirmedReady,
    nov15ConfirmedTrackingAdded,
    nov14Cancelled,
    nov14InTransit,
  ];

  const onlyNov15 = filterOrdersByIstDateRange(all, '2026-11-15', '2026-11-15');
  assert.equal(onlyNov15.length, 3);

  const summaryNov15 = buildDailyReportSummary(onlyNov15);
  assert.equal(summaryNov15.totals.totalOrders, 3);
  assert.equal(summaryNov15.totals.confirmedOrders, 2);
  assert.equal(summaryNov15.totals.cancelledOrders, 0);
  assert.equal(summaryNov15.totals.notConfirmedOnWhatsApp, 1);
  assert.equal(summaryNov15.totals.trackingAddedTotal, 1);
  assert.equal(summaryNov15.totals.trackingPendingPickup, 1);
  assert.equal(summaryNov15.totals.readyToDispatch, 1);
  assert.equal(summaryNov15.totals.totalValue, 4500);
  assert.equal(summaryNov15.totals.confirmedValue, 3500);
  assert.equal(summaryNov15.totals.notConfirmedValue, 1000);
  assert.equal(summaryNov15.totals.cancelledValue, 0);
  assert.equal(summaryNov15.dailyRows.length, 1);
  assert.equal(summaryNov15.dailyRows[0].dateKey, '2026-11-15');

  const fullSummary = buildDailyReportSummary(all);
  assert.equal(fullSummary.dailyRows.length, 2);
  assert.equal(fullSummary.dailyRows[0].dateKey, '2026-11-15');
  assert.equal(fullSummary.dailyRows[1].dateKey, '2026-11-14');
  assert.equal(fullSummary.totals.trackingAddedTotal, 2);
  assert.equal(fullSummary.totals.inTransitCount, 1);
  assert.equal(fullSummary.totals.cancelledOrders, 1);
  assert.equal(fullSummary.totals.cancelledValue, 800);
});

test('Multi-host Railway session guard and non-regressive order merge keep 24/7 dispatch uninterrupted', () => {
  assert.equal(detectHostRuntimeKind({ RAILWAY_ENVIRONMENT: 'production' }), 'railway');
  assert.equal(detectHostRuntimeKind({ VERCEL: '1' }), 'serverless');
  assert.equal(detectHostRuntimeKind({ NODE_ENV: 'production' }), 'cloud');
  assert.equal(detectHostRuntimeKind({ NODE_ENV: 'development' }), 'dev_preview');

  const now = Date.parse('2026-11-15T12:00:00.000Z');
  // Dev preview MUST skip auto-connecting when Railway is live and heartbeating
  assert.equal(
    shouldSkipAutoRestoreForRemoteHost(
      {
        currentHost: 'dev_preview',
        activeHostKind: 'railway',
        lastHeartbeatAt: '2026-11-15T11:58:00.000Z',
      },
      now
    ),
    true
  );
  // Railway itself MUST still auto-restore on boot even if activeHostKind was railway
  assert.equal(
    shouldSkipAutoRestoreForRemoteHost(
      {
        currentHost: 'railway',
        activeHostKind: 'railway',
        lastHeartbeatAt: '2026-11-15T11:58:00.000Z',
      },
      now
    ),
    false
  );
  // If heartbeat is stale (>4m), dev preview can restore
  assert.equal(
    shouldSkipAutoRestoreForRemoteHost(
      {
        currentHost: 'dev_preview',
        activeHostKind: 'railway',
        lastHeartbeatAt: '2026-11-15T11:40:00.000Z',
      },
      now
    ),
    false
  );

  // Non-regressive order merge keeps poll_sent/confirmed over stale queued snapshot
  const sentOrder: OrderRecord = {
    id: 'ord-merge-1',
    shopifyOrderId: '999',
    orderNumber: '#1341',
    customerName: 'Snehal',
    customerPhone: '+917039155606',
    customerEmail: '',
    totalPrice: '950.00',
    currency: 'INR',
    lineItemsSummary: '1x Cookies',
    financialStatus: 'paid',
    shopifyTags: 'Magic, waiting for confirmation',
    pollStatus: 'poll_sent',
    whatsappMessageId: 'wa-msg-1',
    pollQuestion: 'Confirm?',
    pollSentAt: '2026-11-15T11:35:41.000Z',
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt: '2026-11-15T11:15:00.000Z',
    events: [
      { id: 'e1', timestamp: '2026-11-15T11:35:41.000Z', actor: 'whatsapp', message: 'Poll sent' },
    ],
  };
  const staleQueuedOrder: OrderRecord = {
    ...sentOrder,
    pollStatus: 'queued',
    whatsappMessageId: null,
    pollSentAt: null,
    trackingUrl: 'https://track.example/1',
    events: [
      { id: 'e0', timestamp: '2026-11-15T11:15:00.000Z', actor: 'shopify', message: 'Order read' },
    ],
  };

  const merged = mergeProgressedOrderRecords(staleQueuedOrder, sentOrder);
  assert.equal(merged.pollStatus, 'poll_sent');
  assert.equal(merged.whatsappMessageId, 'wa-msg-1');
  assert.equal(merged.trackingUrl, 'https://track.example/1');
  assert.equal(merged.events.length, 2);

  // Order note preservation & fresher remark merge
  assert.equal(
    shouldPreserveRecentLocalNote({ noteUpdatedAt: '2026-11-15T11:59:10.000Z' }, now),
    true
  );
  assert.equal(
    shouldPreserveRecentLocalNote({ noteUpdatedAt: '2026-11-15T11:50:00.000Z' }, now),
    false
  );
  assert.equal(shouldPreserveRecentLocalNote({ noteUpdatedAt: null }, now), false);

  const olderNoteOrder: OrderRecord = {
    ...sentOrder,
    orderNote: 'Old note',
    noteUpdatedAt: '2026-11-15T11:00:00.000Z',
  };
  const fresherNoteOrder: OrderRecord = {
    ...staleQueuedOrder,
    orderNote: 'Call before delivery · urgent',
    noteUpdatedAt: '2026-11-15T11:55:00.000Z',
  };
  const mergedWithNote = mergeProgressedOrderRecords(olderNoteOrder, fresherNoteOrder);
  assert.equal(mergedWithNote.orderNote, 'Call before delivery · urgent');
  assert.equal(mergedWithNote.noteUpdatedAt, '2026-11-15T11:55:00.000Z');
});

test('extractCleanIndianPincode, calculateOrderPnl, buildProfitLossReport, and Delhivery charge preservation work accurately', () => {
  assert.equal(extractCleanIndianPincode('Chitradurga, 577522'), '577522');
  assert.equal(extractCleanIndianPincode('110001'), '110001');
  assert.equal(extractCleanIndianPincode('No pin here'), '');

  const costAssumptions = {
    cogsPercent: 35,
    packagingCostPerOrder: 25,
    fallbackForwardShippingCost: 75,
    fallbackRtoShippingCost: 75,
    fallbackCodFee: 25,
    prepaidGatewayPercent: 2,
    marketingCostPerOrder: 0,
  };

  const baseOrder: OrderRecord = {
    id: 'pnl-1',
    shopifyOrderId: '501',
    orderNumber: '#1501',
    customerName: 'Asha',
    customerPhone: '+919876543210',
    customerEmail: '',
    totalPrice: '1000.00',
    currency: 'INR',
    lineItemsSummary: '1x Cookies',
    financialStatus: 'pending',
    paymentMethod: 'COD',
    fulfillmentStatus: 'fulfilled',
    shipmentStatus: 'delivered',
    shopifyTags: 'cod, confirm',
    pollStatus: 'confirmed',
    whatsappMessageId: null,
    pollQuestion: '',
    pollSentAt: null,
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt: '2026-11-15T06:00:00.000Z',
    events: [],
    delhiveryShippingCost: 82,
    delhiveryCodFee: 30,
    delhiveryRtoCost: 0,
    delhiveryChargeSource: 'delhivery_api',
  };

  // 1) Delivered COD with live Delhivery API charge:
  // Rev 1000 - COGS 350 - Pack 25 - Fwd 82 - COD 30 = Net Profit 513
  const deliveredPnl = calculateOrderPnl(baseOrder, costAssumptions);
  assert.equal(deliveredPnl.outcome, 'delivered');
  assert.equal(deliveredPnl.chargeSource, 'delhivery_api');
  assert.equal(deliveredPnl.realizedRevenue, 1000);
  assert.equal(deliveredPnl.cogsCost, 350);
  assert.equal(deliveredPnl.forwardShippingCost, 82);
  assert.equal(deliveredPnl.paymentOrCodFee, 30);
  assert.equal(deliveredPnl.netProfit, 513);

  // 2) RTO Return with Delhivery API forward + return freight:
  // Rev 0 - (Fwd 80 + RTO 80 + Pack 25) = Net Loss -185
  const rtoOrder: OrderRecord = {
    ...baseOrder,
    id: 'pnl-2',
    orderNumber: '#1502',
    shipmentStatus: 'rto_delivered',
    delhiveryShippingCost: 80,
    delhiveryRtoCost: 80,
    delhiveryCodFee: 0,
    delhiveryChargeSource: 'delhivery_api',
  };
  const rtoPnl = calculateOrderPnl(rtoOrder, costAssumptions);
  assert.equal(rtoPnl.outcome, 'rto_return');
  assert.equal(rtoPnl.realizedRevenue, 0);
  assert.equal(rtoPnl.totalCost, 185);
  assert.equal(rtoPnl.netProfit, -185);

  // 3) In-Transit Prepaid using fallback shipping + 2% PG fee (excluded from realized revenue, included in expected):
  // Expected Rev 1000 - COGS 350 - Pack 25 - Fwd 75 - PG 20 = Est. +530
  const inTransitPrepaid: OrderRecord = {
    ...baseOrder,
    id: 'pnl-3',
    orderNumber: '#1503',
    paymentMethod: 'Prepaid',
    financialStatus: 'paid',
    shipmentStatus: 'in_transit',
    delhiveryShippingCost: null,
    delhiveryCodFee: null,
    delhiveryRtoCost: null,
    delhiveryChargeSource: null,
  };
  const transitPnl = calculateOrderPnl(inTransitPrepaid, costAssumptions);
  assert.equal(transitPnl.outcome, 'in_transit');
  assert.equal(transitPnl.chargeSource, 'estimated');
  assert.equal(transitPnl.realizedRevenue, 0);
  assert.equal(transitPnl.expectedRevenue, 1000);
  assert.equal(transitPnl.paymentOrCodFee, 20);
  assert.equal(transitPnl.netProfit, 530);

  // 4) Cancelled via WhatsApp -> ₹0 cost, saves fwd+rto+pack = 175
  const cancelledOrder: OrderRecord = {
    ...baseOrder,
    id: 'pnl-4',
    orderNumber: '#1504',
    pollStatus: 'cancelled_by_user',
    fulfillmentStatus: null,
    shipmentStatus: null,
    delhiveryShippingCost: null,
    delhiveryCodFee: null,
    delhiveryRtoCost: null,
    delhiveryChargeSource: null,
  };

  const report = buildProfitLossReport(
    [baseOrder, rtoOrder, inTransitPrepaid, cancelledOrder],
    costAssumptions,
    100 // Period ad spend extra
  );
  assert.equal(report.deliveredCount, 1);
  assert.equal(report.rtoCount, 1);
  assert.equal(report.inTransitCount, 1);
  assert.equal(report.cancelledCount, 1);
  assert.equal(report.delhiverySyncedCount, 2);
  assert.equal(report.realizedRevenue, 1000);
  assert.equal(report.inTransitExpectedRevenue, 1000);
  assert.equal(report.totalRtoLoss, 185);
  // Realized Net = (513 - 185) - 100 extra ads = 228
  assert.equal(report.netRealizedProfit, 228);
  assert.equal(report.projectedNetProfit, 758); // 228 + 530 transit expected
  assert.equal(report.whatsappRtoSavings, 175); // 1 * (75 + 75 + 25)
  assert.equal(report.dailyPnlRows.length, 1);

  // Non-regressive merge retains Delhivery shipping charges even if Shopify refresh arrives without them
  const freshShopifyCopy: OrderRecord = {
    ...baseOrder,
    delhiveryShippingCost: null,
    delhiveryCodFee: null,
    delhiveryRtoCost: null,
    delhiveryChargeSource: null,
    delhiveryLastSyncedAt: null,
  };
  const mergedDelhivery = mergeProgressedOrderRecords(freshShopifyCopy, baseOrder);
  assert.equal(mergedDelhivery.delhiveryShippingCost, 82);
  assert.equal(mergedDelhivery.delhiveryCodFee, 30);
  assert.equal(mergedDelhivery.delhiveryChargeSource, 'delhivery_api');
});

test('parseDelhiveryBillingCsv, payment settlement ledger, and delivery delay SLA tracker work accurately', () => {
  const walletAndRemitCsv = [
    'AWB Number,Order ID,Transaction Type,Forward Charge,RTO Charge,COD Charge,UTR,Remittance Amount',
    'DLV111,#1601,Freight Debit,78,0,28,,',
    'DLV111,#1601,COD Remittance,0,0,0,UTR998877,1200',
    'DLV222,#1602,RTO Freight,74,74,0,,',
  ].join('\n');

  const parsedEntries = parseDelhiveryBillingCsv(walletAndRemitCsv);
  assert.equal(parsedEntries.length, 2);
  assert.deepEqual(parsedEntries[0], {
    awb: 'DLV111',
    orderNumber: '#1601',
    forwardShippingCost: 78,
    rtoShippingCost: 0,
    codFee: 28,
    utrNumber: 'UTR998877',
    remittedAmount: 1200,
  });
  assert.deepEqual(parsedEntries[1], {
    awb: 'DLV222',
    orderNumber: '#1602',
    forwardShippingCost: 74,
    rtoShippingCost: 74,
    codFee: 0,
  });

  const nowMs = Date.parse('2026-11-15T12:00:00.000Z');
  const commonBase: OrderRecord = {
    id: 'sd-1',
    shopifyOrderId: '601',
    orderNumber: '#1601',
    customerName: 'Kavita',
    customerPhone: '+919876543210',
    customerEmail: '',
    totalPrice: '1200.00',
    currency: 'INR',
    lineItemsSummary: '1x Gift Box',
    financialStatus: 'pending',
    paymentMethod: 'COD',
    fulfillmentStatus: 'fulfilled',
    shipmentStatus: 'delivered',
    shopifyTags: 'cod, confirm',
    pollStatus: 'confirmed',
    whatsappMessageId: null,
    pollQuestion: '',
    pollSentAt: null,
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt: '2026-11-08T06:00:00.000Z',
    pickedUpAt: '2026-11-08T10:00:00.000Z',
    expectedDeliveryAt: '2026-11-12T10:00:00.000Z',
    deliveredAt: '2026-11-11T14:00:00.000Z', // 3.1d <= 4d SLA & before EDD -> On Time
    events: [],
  };

  // 1) Delivered COD pending remittance (waiting 4 days)
  const pendingCodOrder: OrderRecord = {
    ...commonBase,
    settlementStatus: null,
  };
  const pendingSettle = getOrderSettlementInfo(pendingCodOrder, nowMs);
  assert.equal(pendingSettle.status, 'pending_remittance');
  assert.equal(pendingSettle.pendingAmount, 1200);
  assert.equal(pendingSettle.daysSinceDelivery, 3);
  const onTimeDelay = getOrderDeliveryDelayInfo(pendingCodOrder, DEFAULT_SETTINGS, nowMs);
  assert.equal(onTimeDelay.state, 'delivered_on_time');
  assert.equal(onTimeDelay.isActiveDelay, false);

  // 2) Settled COD with UTR
  const settledCodOrder: OrderRecord = {
    ...commonBase,
    id: 'sd-2',
    orderNumber: '#1602',
    settlementStatus: 'settled',
    settledAmount: 1200,
    settlementReference: 'UTR998877',
    deliveredAt: '2026-11-14T10:00:00.000Z', // 6d > 4d SLA & past EDD -> Delivered Late
  };
  assert.equal(getOrderSettlementInfo(settledCodOrder, nowMs).status, 'settled');
  assert.equal(getOrderDeliveryDelayInfo(settledCodOrder, DEFAULT_SETTINGS, nowMs).state, 'delivered_late');

  // 3) Pickup Delayed (> 48h still awaiting pickup)
  const pickupDelayedOrder: OrderRecord = {
    ...commonBase,
    id: 'sd-3',
    orderNumber: '#1603',
    paymentMethod: 'Prepaid',
    financialStatus: 'paid',
    shipmentStatus: 'confirmed',
    trackingNumber: 'DLV333',
    fulfilledAt: '2026-11-12T06:00:00.000Z', // 78h ago
    pickedUpAt: null,
    deliveredAt: null,
    expectedDeliveryAt: null,
  };
  assert.equal(getOrderSettlementInfo(pickupDelayedOrder, nowMs).status, 'settled');
  const pickupDelayInfo = getOrderDeliveryDelayInfo(pickupDelayedOrder, DEFAULT_SETTINGS, nowMs);
  assert.equal(pickupDelayInfo.state, 'pickup_delayed');
  assert.equal(pickupDelayInfo.isActiveDelay, true);

  // 4) NDR Attempt / In Transit stuck
  const ndrOrder: OrderRecord = {
    ...commonBase,
    id: 'sd-4',
    orderNumber: '#1604',
    shipmentStatus: 'attempted_delivery',
    deliveryAttemptsCount: 2,
    deliveredAt: null,
    totalPrice: '900.00',
  };
  const ndrDelay = getOrderDeliveryDelayInfo(ndrOrder, DEFAULT_SETTINGS, nowMs);
  assert.equal(ndrDelay.state, 'ndr_attempt');
  assert.equal(ndrDelay.isActiveDelay, true);
  assert.equal(getOrderSettlementInfo(ndrOrder, nowMs).status, 'in_transit');

  // 5) Summary totals & non-regressive retention of settled UTR and wallet source
  const summary = buildSettlementAndDelaySummary(
    [pendingCodOrder, settledCodOrder, pickupDelayedOrder, ndrOrder],
    DEFAULT_SETTINGS,
    nowMs
  );
  assert.equal(summary.pendingCodRemittanceTotal, 1200);
  assert.equal(summary.codSettledTotal, 1200);
  assert.equal(summary.prepaidSettledTotal, 1200);
  assert.equal(summary.settledTotal, 2400);
  assert.equal(summary.inTransitCodTotal, 900);
  assert.equal(summary.activeDelayedCount, 2);
  assert.equal(summary.pickupDelayedCount, 1);
  assert.equal(summary.ndrAttemptCount, 1);
  assert.equal(summary.deliveredOnTimeCount, 1);
  assert.equal(summary.deliveredLateCount, 1);
  assert.equal(summary.onTimeDeliveryRate, 50);

  const staleOrder = {
    ...pendingCodOrder,
    settlementStatus: null,
    settlementReference: null,
    pickedUpAt: null,
    delhiveryChargeSource: null,
  } as OrderRecord;
  const enrichedSettled: OrderRecord = {
    ...settledCodOrder,
    id: pendingCodOrder.id,
    pickedUpAt: '2026-11-08T10:00:00.000Z',
    delhiveryChargeSource: 'delhivery_wallet',
    delhiveryShippingCost: 78,
  };
  const mergedSettle = mergeProgressedOrderRecords(staleOrder, enrichedSettled);
  assert.equal(mergedSettle.settlementStatus, 'settled');
  assert.equal(mergedSettle.settlementReference, 'UTR998877');
  assert.equal(mergedSettle.pickedUpAt, '2026-11-08T10:00:00.000Z');
  assert.equal(mergedSettle.delhiveryChargeSource, 'delhivery_wallet');
  assert.equal(mergedSettle.delhiveryShippingCost, 78);
});

test('computeBillableParcelWeightGrams and splitDelhiveryChargeWithGst handle volumetric weight and GST split accurately', () => {
  // Single tin box: 550g dead vs 14x14x9cm (353g volumetric) -> 550g billable
  const singleTin = computeBillableParcelWeightGrams(550, 14, 14, 9);
  assert.deepEqual(singleTin, {
    deadWeightGrams: 550,
    volumetricWeightGrams: 353,
    billableWeightGrams: 550,
  });

  // Two-tin box (#1339): 1000g dead vs 24x24x11cm (1267g volumetric) -> 1267g billable
  const doubleTin = computeBillableParcelWeightGrams(1000, 24, 24, 11);
  assert.deepEqual(doubleTin, {
    deadWeightGrams: 1000,
    volumetricWeightGrams: 1267,
    billableWeightGrams: 1267,
  });

  // Live Kinko COD breakdown: total=130.01, gross=110.17, charge_COD=40 -> COD+GST=47.20, freight+GST=82.81
  const codSplit = splitDelhiveryChargeWithGst(130.01, 110.17, 40);
  assert.equal(codSplit.totalAmount, 130.01);
  assert.equal(codSplit.codFee, 47.2);
  assert.equal(codSplit.shippingCost, 82.81);
  assert.equal(Math.round((codSplit.shippingCost + codSplit.codFee) * 100) / 100, 130.01);

  // Prepaid breakdown: total=148.86, gross=126.16, charge_COD=0 -> codFee=0, shippingCost=148.86
  const prepaidSplit = splitDelhiveryChargeWithGst(148.86, 126.16, 0);
  assert.deepEqual(prepaidSplit, {
    totalAmount: 148.86,
    shippingCost: 148.86,
    codFee: 0,
  });

  // RTO two-way Kinko quote (Zone C: ss=RTO 278.57 includes fwd 148.86 + return 129.71)
  assert.equal(computeIncrementalRtoLegCost(278.57, 148.86, true), 129.71);
  // Zone E (#1327): ss=RTO 583.43 includes fwd 304.47 + return 278.96
  assert.equal(computeIncrementalRtoLegCost(583.43, 304.47, true), 278.96);
  // If charge_DL was 0 in ss=RTO, keep return leg untouched
  assert.equal(computeIncrementalRtoLegCost(129.71, 148.86, false), 129.71);
});

test('Monthly IST helpers, unit economics breakeven simulator, and colorful 5-sheet ExcelJS workbook with formulas work accurately', async () => {
  // 1) IST month boundary & shift checks
  // 2026-10-31T19:30:00Z = 2026-11-01 01:00 IST -> 2026-11
  assert.equal(getIstMonthKey('2026-10-31T19:30:00.000Z'), '2026-11');
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
  assert.equal(shiftMonthKey('2026-12', 1), '2027-01');

  const novBounds = getMonthIstDateBounds('2026-11');
  assert.deepEqual(novBounds, {
    fromDate: '2026-11-01',
    toDate: '2026-11-30',
    monthLabel: 'November 2026',
  });
  const leapFebBounds = getMonthIstDateBounds('2024-02');
  assert.equal(leapFebBounds?.fromDate, '2024-02-01');
  assert.equal(leapFebBounds?.toDate, '2024-02-29');

  // 2) Unit economics simulator
  // SP=1000, COGS=350, Pack=25, Fwd=75, RTO=75, Fee=25, Ads=100
  // Delv Profit = 1000 - (350+75+25+25+100) = 425, RTO Loss = -(75+75+25+100) = -275
  // At 20% RTO: 0.8 * 425 + 0.2 * (-275) = 340 - 55 = 285 blended profit (29% margin)
  // Breakeven Max CPA = 0.8 * 525 + 0.2 * (-175) = 420 - 35 = 385
  // Breakeven RTO % = 425 / (425 - (-275)) = 425 / 700 = 60.7%
  const sim = calculateUnitEconomicsSimulation({
    sellingPrice: 1000,
    cogsCost: 350,
    forwardShipping: 75,
    rtoShipping: 75,
    packagingCost: 25,
    paymentOrCodFee: 25,
    adSpendPerOrder: 100,
    expectedRtoPercent: 20,
  });
  assert.equal(sim.profitIfDelivered, 425);
  assert.equal(sim.lossIfRto, -275);
  assert.equal(sim.blendedProfitPerOrder, 285);
  assert.equal(sim.marginPercent, 29);
  assert.equal(sim.maxCpaBreakeven, 385);
  assert.equal(sim.breakevenRtoPercent, 60.7);

  // 3) Colorful 5-Sheet ExcelJS Workbook generation with live Excel formulas
  const costs = {
    cogsPercent: 35,
    packagingCostPerOrder: 25,
    fallbackForwardShippingCost: 75,
    fallbackRtoShippingCost: 75,
    fallbackCodFee: 25,
    prepaidGatewayPercent: 2,
    marketingCostPerOrder: 50,
  };
  const delvOrder: OrderRecord = {
    id: 'xl-1',
    shopifyOrderId: '901',
    orderNumber: '#1901',
    customerName: 'Meera Nair',
    customerPhone: '+919876543210',
    customerEmail: 'meera@example.com',
    totalPrice: '1000.00',
    currency: 'INR',
    lineItemsSummary: '1x Cookies Tin',
    financialStatus: 'pending',
    paymentMethod: 'COD',
    fulfillmentStatus: 'fulfilled',
    shipmentStatus: 'delivered',
    shopifyTags: 'cod, confirm',
    pollStatus: 'confirmed',
    whatsappMessageId: null,
    pollQuestion: '',
    pollSentAt: null,
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt: '2026-11-10T08:00:00.000Z',
    delhiveryShippingCost: 80,
    delhiveryCodFee: 30,
    delhiveryRtoCost: 0,
    delhiveryChargeSource: 'delhivery_api',
    delhiveryChargedWeightGrams: 550,
    orderNote: 'Fresh batch',
    events: [],
  };
  const rtoOrder: OrderRecord = {
    ...delvOrder,
    id: 'xl-2',
    shopifyOrderId: '902',
    orderNumber: '#1902',
    customerName: 'Vikram Rao',
    shipmentStatus: 'rto_delivered',
    delhiveryShippingCost: 80,
    delhiveryCodFee: 0,
    delhiveryRtoCost: 70,
    delhiveryChargeSource: 'delhivery_wallet',
    orderNote: 'Customer unavailable',
  };

  const { workbook, filename } = buildMonthlyExcelWorkbook({
    orders: [delvOrder, rtoOrder],
    settings: DEFAULT_SETTINGS,
    costAssumptions: costs,
    periodAdSpend: 500,
    periodLabel: 'November 2026',
  });

  assert.equal(filename, 'Broomies-Bakery-Excel-Report-November-2026.xlsx');
  assert.deepEqual(
    workbook.worksheets.map((ws) => ws.name),
    ['P&L Summary', 'Order-wise P&L', 'Daily Breakdown', 'Order Register', 'Visual Charts']
  );

  const pnlReport = buildProfitLossReport([delvOrder, rtoOrder], costs, 500);
  const wsSummary = workbook.getWorksheet('P&L Summary');
  assert.ok(wsSummary);
  assert.equal(wsSummary.properties.tabColor?.argb, 'FF059669');
  assert.equal((wsSummary.getCell('B15').value as { formula?: string }).formula, 'SUM(B9:B14)');
  assert.equal((wsSummary.getCell('B16').value as { formula?: string }).formula, 'B8-B15');
  assert.equal(
    (wsSummary.getCell('B16').value as { result?: number }).result,
    pnlReport.netRealizedProfit
  );

  const wsOrderPnl = workbook.getWorksheet('Order-wise P&L');
  assert.ok(wsOrderPnl);
  assert.equal((wsOrderPnl.getCell('U4').value as { formula?: string }).formula, 'SUM(O4:T4)');
  assert.match((wsOrderPnl.getCell('V4').value as { formula?: string }).formula || '', /^IF\(/);
  assert.equal((wsOrderPnl.getCell('V6').value as { formula?: string }).formula, 'SUM(V4:V5)');
  // Outcome cell F4 ("Delivered") has emerald fill
  assert.equal((wsOrderPnl.getCell('F4').fill as { fgColor?: { argb?: string } }).fgColor?.argb, 'FFD1FAE5');

  const wsDaily = workbook.getWorksheet('Daily Breakdown');
  assert.ok(wsDaily);
  assert.equal((wsDaily.getCell('B5').value as { formula?: string }).formula, 'SUM(B4:B4)');
  assert.equal((wsDaily.getCell('Q5').value as { formula?: string }).formula, 'SUM(Q4:Q4)');

  const wsRegister = workbook.getWorksheet('Order Register');
  assert.ok(wsRegister);
  assert.equal(wsRegister.getCell('A4').value, '#1901');
  assert.equal(wsRegister.getCell('R4').value, 'Fresh batch');

  // Verify valid .xlsx zip buffer output
  const outBuf = Buffer.from(await workbook.xlsx.writeBuffer());
  assert.ok(outBuf.length > 5000);
  assert.equal(outBuf.subarray(0, 2).toString('utf8'), 'PK');
});

test('Daily Meta Ads ₹500/day billing days and Profit & Loss + Excel deductions work accurately', async () => {
  const sampleNov13: OrderRecord = {
    id: 'ma-1',
    shopifyOrderId: '951',
    orderNumber: '#1951',
    customerName: 'Riya',
    customerPhone: '+919876543210',
    customerEmail: '',
    totalPrice: '1000.00',
    currency: 'INR',
    lineItemsSummary: '1x Cookies',
    financialStatus: 'paid',
    paymentMethod: 'Prepaid',
    fulfillmentStatus: 'fulfilled',
    shipmentStatus: 'delivered',
    shopifyTags: 'confirm',
    pollStatus: 'confirmed',
    whatsappMessageId: null,
    pollQuestion: '',
    pollSentAt: null,
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt: '2026-11-13T08:00:00.000Z',
    delhiveryShippingCost: 80,
    delhiveryCodFee: 0,
    delhiveryRtoCost: 0,
    delhiveryChargeSource: 'delhivery_api',
    events: [],
  };
  const sampleNov14: OrderRecord = {
    ...sampleNov13,
    id: 'ma-2',
    shopifyOrderId: '952',
    orderNumber: '#1952',
    createdAt: '2026-11-14T08:00:00.000Z',
  };
  const sampleNov15: OrderRecord = {
    ...sampleNov13,
    id: 'ma-3',
    shopifyOrderId: '953',
    orderNumber: '#1953',
    createdAt: '2026-11-15T08:00:00.000Z',
  };

  const allOrders = [sampleNov13, sampleNov14, sampleNov15];

  // Single day (Today) -> 1 day
  assert.equal(
    computeMetaAdDaysInRange({
      orders: [sampleNov15],
      fromDate: '2026-11-15',
      toDate: '2026-11-15',
      syncStartDate: '2026-11-13',
      todayIst: '2026-11-15',
    }),
    1
  );

  // This Month (Nov 1..30) on 2026-11-15 with syncStartDate=2026-11-13 -> clipped to 3 active days (Nov 13, 14, 15)
  assert.equal(
    computeMetaAdDaysInRange({
      orders: allOrders,
      fromDate: '2026-11-01',
      toDate: '2026-11-30',
      syncStartDate: '2026-11-13',
      todayIst: '2026-11-15',
    }),
    3
  );

  // Past full month (Oct 1..31) -> 31 days
  assert.equal(
    computeMetaAdDaysInRange({
      orders: [],
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
      syncStartDate: '2026-11-13',
      todayIst: '2026-11-15',
    }),
    31
  );

  // Each order: 1000 - 350 COGS - 25 Pack - 80 Ship - 20 PG(2%) = 525 pre-Meta profit
  // 3 days total = 1575 - 1500 (3 * 500/day) = +75 netRealizedProfit
  // Each daily row: 525 - 500 = +25 netRealizedProfit
  const costsWithMeta = {
    cogsPercent: 35,
    packagingCostPerOrder: 25,
    fallbackForwardShippingCost: 75,
    fallbackRtoShippingCost: 75,
    fallbackCodFee: 25,
    prepaidGatewayPercent: 2,
    marketingCostPerOrder: 0,
    dailyMetaAdsSpend: 500,
  };
  const pnlWithMeta = buildProfitLossReport(allOrders, costsWithMeta, 0, 3);
  assert.equal(pnlWithMeta.dailyMetaAdsRate, 500);
  assert.equal(pnlWithMeta.metaAdDaysCount, 3);
  assert.equal(pnlWithMeta.totalDailyMetaAds, 1500);
  assert.equal(pnlWithMeta.totalMarketingCost, 1500);
  assert.equal(pnlWithMeta.netRealizedProfit, 75);
  assert.equal(pnlWithMeta.dailyPnlRows.length, 3);
  assert.equal(pnlWithMeta.dailyPnlRows[0].netRealizedProfit, 25);

  const inTransitOrder: OrderRecord = {
    ...sampleNov15,
    id: 'ma-4',
    shopifyOrderId: '954',
    orderNumber: '#1954',
    shipmentStatus: 'in_transit',
    delhiveryShippingCost: 90,
    createdAt: '2026-11-15T09:00:00.000Z',
  };

  const { workbook } = buildMonthlyExcelWorkbook({
    orders: [...allOrders, inTransitOrder],
    settings: DEFAULT_SETTINGS,
    costAssumptions: costsWithMeta,
    periodAdSpend: 0,
    adDaysCount: 3,
    periodLabel: 'November 2026',
  });
  const wsSummary = workbook.getWorksheet('P&L Summary');
  assert.ok(wsSummary);
  assert.equal(wsSummary.getCell('B14').value, 1500);
  assert.equal((wsSummary.getCell('B16').value as { result?: number }).result, 75);

  const wsOrderPnl = workbook.getWorksheet('Order-wise P&L');
  assert.ok(wsOrderPnl);
  // Row 8 is TOTAL (4 orders: 3 delivered + 1 in_transit): COGS = 4 * 350 = 1400, Fwd = 3*80 + 90 = 330
  assert.equal((wsOrderPnl.getCell('O8').value as { formula?: string }).formula, 'SUM(O4:O7)');
  assert.equal((wsOrderPnl.getCell('O8').value as { result?: number }).result, 1400);
  assert.equal((wsOrderPnl.getCell('Q8').value as { result?: number }).result, 330);
});

test('Upstash Redis bandwidth guards skip unchanged full DB pulls and throttle frequent auth backups', () => {
  assert.equal(
    shouldFetchFullRemoteDb({ localRev: 'rev-100', remoteRev: 'rev-100', force: false }),
    false
  );
  assert.equal(
    shouldFetchFullRemoteDb({ localRev: 'rev-100', remoteRev: 'rev-101', force: false }),
    true
  );
  assert.equal(
    shouldFetchFullRemoteDb({ localRev: null, remoteRev: 'rev-100', force: false }),
    true
  );
  assert.equal(
    shouldFetchFullRemoteDb({ localRev: 'rev-100', remoteRev: 'rev-100', force: true }),
    true
  );

  const t0 = Date.parse('2026-11-17T10:00:00.000Z');
  assert.equal(shouldBackupWhatsAppAuth({ lastBackupAtMs: 0, nowMs: t0 }), true);
  assert.equal(
    shouldBackupWhatsAppAuth({ lastBackupAtMs: t0, nowMs: t0 + 60_000 }),
    false
  );
  assert.equal(
    shouldBackupWhatsAppAuth({ lastBackupAtMs: t0, nowMs: t0 + 60_000, force: true }),
    true
  );
  assert.equal(
    shouldBackupWhatsAppAuth({ lastBackupAtMs: t0, nowMs: t0 + 16 * 60_000 }),
    true
  );
});
