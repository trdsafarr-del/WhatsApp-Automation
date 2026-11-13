import type { AppSettings, OrderMetrics, OrderRecord, PollStatus } from './types.js';

export const DEFAULT_SETTINGS: AppSettings = {
  shopName: 'Broomies Bakery',
  shopifyStoreDomain: '',
  shopifyClientId: '',
  shopifyClientSecret: '',
  shopifyAccessToken: '',
  shopifyWebhookSecret: '',
  whatsappMode: 'baileys_qr',
  defaultCountryCode: '91',
  autoSendPollOnNewOrder: true,
  autoCancelInShopify: false,
  pollMessageTemplate:
    'Hi {{customer_name}}, thank you for your order {{order_number}} ({{total_price}}) at {{shop_name}} for {{items_summary}}. Please tap an option below to confirm or cancel your order:',
  confirmOptionLabel: 'Confirm Order',
  cancelOptionLabel: 'Cancel Order',
  confirmTag: 'confirm',
  cancelTag: 'cancelled by user',
};

/**
 * Normalizes a customer phone string into a WhatsApp JID (`<digits>@s.whatsapp.net`).
 * Handles formats like `+91 98765-43210`, `09876543210`, `9876543210`, `+1 (415) 555-2671`.
 */
export function normalizePhoneToWhatsAppJid(
  phone: string,
  defaultCountryCode = '91'
): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (!digits || digits.length < 7) return null;

  const cleanCC = defaultCountryCode.replace(/\D/g, '') || '91';

  // Strip leading single zero on local mobile numbers (e.g. 09876543210 -> 9876543210)
  if (!hasPlus && digits.startsWith('0') && digits.length >= 10) {
    digits = digits.slice(1);
  }

  // If 10 digits without country code, prepend default country code
  if (!hasPlus && digits.length === 10) {
    digits = `${cleanCC}${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return `${digits}@s.whatsapp.net`;
}

/**
 * Extracts a clean display phone number from a JID or raw phone string.
 */
export function formatJidToDisplayPhone(jidOrPhone: string): string {
  const raw = jidOrPhone.split('@')[0].split(':')[0];
  const digits = raw.replace(/\D/g, '');
  if (!digits) return jidOrPhone;
  return `+${digits}`;
}

/**
 * Renders the poll question text and selectable options for an order.
 */
export function formatPollPayload(
  order: Pick<
    OrderRecord,
    'customerName' | 'orderNumber' | 'totalPrice' | 'currency' | 'lineItemsSummary'
  >,
  settings: Pick<
    AppSettings,
    'shopName' | 'pollMessageTemplate' | 'confirmOptionLabel' | 'cancelOptionLabel'
  >
): { question: string; options: [string, string] } {
  const formattedTotal = `${order.currency} ${order.totalPrice}`.trim();
  const question = settings.pollMessageTemplate
    .replaceAll('{{customer_name}}', order.customerName || 'Customer')
    .replaceAll('{{order_number}}', order.orderNumber)
    .replaceAll('{{total_price}}', formattedTotal)
    .replaceAll('{{items_summary}}', order.lineItemsSummary || 'your items')
    .replaceAll('{{shop_name}}', settings.shopName || 'our store');

  return {
    question: question.slice(0, 255),
    options: [
      settings.confirmOptionLabel.trim() || 'Confirm Order',
      settings.cancelOptionLabel.trim() || 'Cancel Order',
    ],
  };
}

export interface PollVoteResolution {
  decision: 'confirm' | 'cancel';
  tagToAdd: string;
  opposingTag: string;
  newStatus: PollStatus;
}

/**
 * Resolves a WhatsApp poll option vote or text fallback reply into a Shopify tag action.
 */
export function resolvePollVoteAction(
  input: string,
  settings: Pick<
    AppSettings,
    'confirmOptionLabel' | 'cancelOptionLabel' | 'confirmTag' | 'cancelTag'
  >
): PollVoteResolution | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  const confirmLabel = (settings.confirmOptionLabel || 'Confirm Order').trim().toLowerCase();
  const cancelLabel = (settings.cancelOptionLabel || 'Cancel Order').trim().toLowerCase();
  const confirmTag = settings.confirmTag.trim() || 'confirm';
  const cancelTag = settings.cancelTag.trim() || 'cancelled by user';

  const isConfirm =
    normalized === confirmLabel ||
    normalized === '1' ||
    normalized === 'confirm' ||
    normalized === 'confirmed' ||
    normalized === 'yes' ||
    normalized.includes('confirm order');

  const isCancel =
    normalized === cancelLabel ||
    normalized === '2' ||
    normalized === 'cancel' ||
    normalized === 'cancelled' ||
    normalized === 'canceled' ||
    normalized === 'no' ||
    normalized.includes('cancel order');

  if (isConfirm && !isCancel) {
    return {
      decision: 'confirm',
      tagToAdd: confirmTag,
      opposingTag: cancelTag,
      newStatus: 'confirmed',
    };
  }

  if (isCancel && !isConfirm) {
    return {
      decision: 'cancel',
      tagToAdd: cancelTag,
      opposingTag: confirmTag,
      newStatus: 'cancelled_by_user',
    };
  }

  return null;
}

/**
 * Safely merges a new Shopify tag into an order's comma-separated tags string,
 * removing an opposing tag if the customer changed their selection.
 */
export function mergeShopifyTags(
  existingTags: string,
  tagToAdd: string,
  opposingTag?: string
): string {
  const parsed = existingTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const opposingLower = opposingTag?.trim().toLowerCase();
  const filtered = parsed.filter(
    (t) => !opposingLower || t.toLowerCase() !== opposingLower
  );

  const cleanNew = tagToAdd.trim();
  if (cleanNew && !filtered.some((t) => t.toLowerCase() === cleanNew.toLowerCase())) {
    filtered.push(cleanNew);
  }

  return filtered.join(', ');
}

/**
 * Computes summary metrics for the dashboard KPI strip.
 */
export function computeOrderMetrics(orders: OrderRecord[]): OrderMetrics {
  const totalOrders = orders.length;
  const pendingPolls = orders.filter(
    (o) => o.pollStatus === 'poll_sent' || o.pollStatus === 'queued'
  ).length;
  const confirmedCount = orders.filter((o) => o.pollStatus === 'confirmed').length;
  const cancelledCount = orders.filter((o) => o.pollStatus === 'cancelled_by_user').length;

  const decided = confirmedCount + cancelledCount;
  const confirmationRate = decided > 0 ? Math.round((confirmedCount / decided) * 100) : 0;

  const responseDurationsMs: number[] = [];
  for (const order of orders) {
    if (order.pollSentAt && order.respondedAt) {
      const sent = Date.parse(order.pollSentAt);
      const responded = Date.parse(order.respondedAt);
      if (Number.isFinite(sent) && Number.isFinite(responded) && responded >= sent) {
        responseDurationsMs.push(responded - sent);
      }
    }
  }

  const avgResponseMinutes =
    responseDurationsMs.length > 0
      ? Math.max(
          1,
          Math.round(
            responseDurationsMs.reduce((sum, ms) => sum + ms, 0) /
              responseDurationsMs.length /
              60000
          )
        )
      : null;

  return {
    totalOrders,
    pendingPolls,
    confirmedCount,
    cancelledCount,
    confirmationRate,
    avgResponseMinutes,
  };
}

export interface ShopifyPhoneSource {
  phone?: string | null;
  cancelled_at?: string | null;
  tags?: string;
  customer?: {
    phone?: string | null;
    default_address?: {
      phone?: string | null;
    } | null;
  } | null;
  shipping_address?: {
    phone?: string | null;
  } | null;
  billing_address?: {
    phone?: string | null;
  } | null;
  note_attributes?: Array<{
    name?: string;
    value?: string | number | null;
  }>;
}

/**
 * Extracts the best available customer phone number from a Shopify order payload,
 * checking shipping address, customer profile, default address, billing address,
 * and checkout note_attributes (commonly used by Indian COD / third-party checkouts).
 */
export function extractShopifyCustomerPhone(raw: ShopifyPhoneSource): string {
  const candidates: Array<string | null | undefined> = [
    raw.shipping_address?.phone,
    raw.customer?.phone,
    raw.customer?.default_address?.phone,
    raw.phone,
    raw.billing_address?.phone,
  ];

  if (Array.isArray(raw.note_attributes)) {
    for (const attr of raw.note_attributes) {
      const key = (attr.name || '').toLowerCase();
      if (
        key.includes('phone') ||
        key.includes('mobile') ||
        key.includes('whatsapp') ||
        key.includes('contact')
      ) {
        candidates.push(attr.value != null ? String(attr.value) : null);
      }
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.replace(/\D/g, '').length >= 7) {
        return trimmed;
      }
    }
  }
  return '';
}

/**
 * Infers initial PollStatus from existing Shopify tags or cancellation state so
 * already-confirmed or already-cancelled orders are not re-polled.
 */
export function inferInitialPollStatus(
  raw: Pick<ShopifyPhoneSource, 'tags' | 'cancelled_at'>,
  settings: Pick<AppSettings, 'confirmTag' | 'cancelTag'>
): PollStatus {
  if (raw.cancelled_at) return 'cancelled_by_user';

  const tags = (raw.tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const confirmTag = (settings.confirmTag || 'confirm').trim().toLowerCase();
  const cancelTag = (settings.cancelTag || 'cancelled by user').trim().toLowerCase();

  if (cancelTag && tags.includes(cancelTag)) return 'cancelled_by_user';
  if (confirmTag && tags.includes(confirmTag)) return 'confirmed';
  return 'queued';
}

/**
 * Determines whether a newly ingested order should automatically trigger a WhatsApp Poll.
 * Skips already-decided orders and stale historical orders (> 24h old on sync).
 */
export function shouldAutoDispatchPoll(
  order: Pick<OrderRecord, 'pollStatus' | 'createdAt'>,
  settings: Pick<AppSettings, 'autoSendPollOnNewOrder'>,
  nowMs = Date.now()
): boolean {
  if (!settings.autoSendPollOnNewOrder) return false;
  if (order.pollStatus !== 'queued') return false;

  const createdMs = Date.parse(order.createdAt);
  if (!Number.isFinite(createdMs)) return true;

  const MAX_AUTO_POLL_AGE_MS = 24 * 60 * 60 * 1000;
  return nowMs - createdMs <= MAX_AUTO_POLL_AGE_MS;
}
