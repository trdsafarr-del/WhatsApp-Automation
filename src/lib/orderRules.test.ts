import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  computeOrderMetrics,
  extractShopifyCustomerPhone,
  formatPollPayload,
  inferInitialPollStatus,
  mergeShopifyTags,
  normalizePhoneToWhatsAppJid,
  resolvePollVoteAction,
  shouldAutoDispatchPoll,
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

test('mergeShopifyTags preserves existing tags, avoids duplicates, and removes opposing tag', () => {
  assert.equal(mergeShopifyTags('COD, Priority', 'confirm', 'cancelled by user'), 'COD, Priority, confirm');
  assert.equal(
    mergeShopifyTags('COD, confirm, Priority', 'cancelled by user', 'confirm'),
    'COD, Priority, cancelled by user'
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
});
