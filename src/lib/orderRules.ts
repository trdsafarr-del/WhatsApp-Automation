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
  autoSendTrackingMessage: true,
  pollMessageTemplate:
    'Hi {{customer_name}}, thank you for your order {{order_number}} ({{total_price}}) at {{shop_name}} for {{items_summary}}. Please tap an option below to confirm or cancel your order:',
  confirmOptionLabel: 'Confirm Order',
  cancelOptionLabel: 'Cancel Order',
  waitingTag: 'waiting for confirmation',
  confirmTag: 'confirm',
  cancelTag: 'cancelled by user',
  confirmReplyMessage:
    'Thank you {{customer_name}}! Your order {{order_number}} ({{total_price}}) at {{shop_name}} is confirmed. We will pack & dispatch it soon!',
  cancelReplyMessage:
    'Your order {{order_number}} at {{shop_name}} has been cancelled as requested. Let us know if you need any help.',
  trackingMessageTemplate:
    'Hi {{customer_name}}, your order {{order_number}} at {{shop_name}} has been shipped{{tracking_company_phrase}}! Track your order here: {{tracking_link}}',
  syncStartDate: '2026-11-13',
};

/**
 * Converts a YYYY-MM-DD date string (IST +05:30 start of day) into a UTC ISO string.
 */
export function getSyncStartCutoffIso(syncStartDate?: string): string | null {
  const clean = (syncStartDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const ms = Date.parse(`${clean}T00:00:00+05:30`);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Checks whether an order timestamp falls on or after the configured syncStartDate (IST).
 */
export function isOrderOnOrAfterStartDate(
  createdAt: string,
  syncStartDate?: string
): boolean {
  const cutoffIso = getSyncStartCutoffIso(syncStartDate);
  if (!cutoffIso) return true;
  const orderMs = Date.parse(createdAt);
  const cutoffMs = Date.parse(cutoffIso);
  if (!Number.isFinite(orderMs) || !Number.isFinite(cutoffMs)) return true;
  return orderMs >= cutoffMs;
}

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
 * Interpolates template placeholders for polls, confirmation/cancellation replies, and tracking messages.
 */
export function formatOrderTemplate(
  template: string,
  order: Pick<
    OrderRecord,
    | 'customerName'
    | 'orderNumber'
    | 'totalPrice'
    | 'currency'
    | 'lineItemsSummary'
    | 'trackingNumber'
    | 'trackingUrl'
    | 'trackingCompany'
  >,
  settings: Pick<AppSettings, 'shopName'>
): string {
  const formattedTotal = `${order.currency} ${order.totalPrice}`.trim();
  const trackingLink =
    order.trackingUrl?.trim() ||
    (order.trackingNumber?.trim() ? `Tracking ID: ${order.trackingNumber.trim()}` : '');
  const trackingCompany = order.trackingCompany?.trim() || '';
  const trackingCompanyPhrase = trackingCompany ? ` via ${trackingCompany}` : '';

  return template
    .replaceAll('{{customer_name}}', order.customerName || 'Customer')
    .replaceAll('{{order_number}}', order.orderNumber)
    .replaceAll('{{total_price}}', formattedTotal)
    .replaceAll('{{items_summary}}', order.lineItemsSummary || 'your items')
    .replaceAll('{{shop_name}}', settings.shopName || 'our store')
    .replaceAll('{{tracking_url}}', order.trackingUrl?.trim() || trackingLink)
    .replaceAll('{{tracking_number}}', order.trackingNumber?.trim() || '')
    .replaceAll('{{tracking_company}}', trackingCompany)
    .replaceAll('{{tracking_company_phrase}}', trackingCompanyPhrase)
    .replaceAll('{{tracking_link}}', trackingLink);
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
  const question = formatOrderTemplate(settings.pollMessageTemplate, order, settings);

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
 * removing one or more opposing/superseded tags (e.g. "waiting for confirmation").
 */
export function mergeShopifyTags(
  existingTags: string,
  tagToAdd: string,
  tagsToRemove?: string | string[]
): string {
  const parsed = existingTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const removeList = (Array.isArray(tagsToRemove) ? tagsToRemove : [tagsToRemove])
    .map((t) => (t || '').trim().toLowerCase())
    .filter(Boolean);
  const removeSet = new Set(removeList);

  const filtered = parsed.filter((t) => !removeSet.has(t.toLowerCase()));

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
 * already-confirmed, already-cancelled, or already-waiting orders are not re-polled.
 */
export function inferInitialPollStatus(
  raw: Pick<ShopifyPhoneSource, 'tags' | 'cancelled_at'>,
  settings: Pick<AppSettings, 'confirmTag' | 'cancelTag'> & { waitingTag?: string }
): PollStatus {
  if (raw.cancelled_at) return 'cancelled_by_user';

  const tags = (raw.tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const confirmTag = (settings.confirmTag || 'confirm').trim().toLowerCase();
  const cancelTag = (settings.cancelTag || 'cancelled by user').trim().toLowerCase();
  const waitingTag = (settings.waitingTag || 'waiting for confirmation').trim().toLowerCase();

  if (cancelTag && tags.includes(cancelTag)) return 'cancelled_by_user';
  if (confirmTag && tags.includes(confirmTag)) return 'confirmed';
  if (waitingTag && tags.includes(waitingTag)) return 'poll_sent';
  return 'queued';
}

export interface ShopifyFulfillmentSource {
  status?: string | null;
  created_at?: string | null;
  tracking_number?: string | null;
  tracking_numbers?: Array<string | null> | null;
  tracking_url?: string | null;
  tracking_urls?: Array<string | null> | null;
  tracking_company?: string | null;
}

export interface ExtractedTrackingInfo {
  trackingNumber: string;
  trackingUrl: string;
  trackingCompany: string;
  trackingValue: string;
  fulfilledAt: string | null;
}

/**
 * Extracts the newest active fulfillment tracking URL/number from a Shopify order payload.
 */
export function extractShopifyTrackingInfo(raw: {
  fulfillments?: ShopifyFulfillmentSource[] | null;
}): ExtractedTrackingInfo {
  if (!Array.isArray(raw.fulfillments) || raw.fulfillments.length === 0) {
    return {
      trackingNumber: '',
      trackingUrl: '',
      trackingCompany: '',
      trackingValue: '',
      fulfilledAt: null,
    };
  }

  // Prefer active non-cancelled fulfillments, newest first
  const candidates = [...raw.fulfillments]
    .reverse()
    .filter((f) => (f.status || '').toLowerCase() !== 'cancelled');

  for (const f of candidates) {
    const url =
      f.tracking_url?.trim() ||
      (Array.isArray(f.tracking_urls)
        ? f.tracking_urls.find((u) => typeof u === 'string' && u.trim())?.trim() || ''
        : '');
    const num =
      f.tracking_number?.trim() ||
      (Array.isArray(f.tracking_numbers)
        ? f.tracking_numbers.find((n) => typeof n === 'string' && n.trim())?.trim() || ''
        : '');
    const company = f.tracking_company?.trim() || '';
    const value = url || num;

    if (value) {
      return {
        trackingNumber: num,
        trackingUrl: url,
        trackingCompany: company,
        trackingValue: value,
        fulfilledAt: f.created_at || null,
      };
    }
  }

  return {
    trackingNumber: '',
    trackingUrl: '',
    trackingCompany: '',
    trackingValue: '',
    fulfilledAt: null,
  };
}

/**
 * Determines whether a newly ingested order should automatically trigger a WhatsApp Poll.
 * Skips already-decided/voided/refunded orders, orders before syncStartDate, and > 24h stale orders.
 */
export function shouldAutoDispatchPoll(
  order: Pick<OrderRecord, 'pollStatus' | 'createdAt'> & { financialStatus?: string },
  settings: Pick<AppSettings, 'autoSendPollOnNewOrder'> & { syncStartDate?: string },
  nowMs = Date.now()
): boolean {
  if (!settings.autoSendPollOnNewOrder) return false;
  if (order.pollStatus !== 'queued') return false;
  if (!isOrderOnOrAfterStartDate(order.createdAt, settings.syncStartDate)) return false;

  const fin = (order.financialStatus || '').trim().toLowerCase();
  if (fin === 'voided' || fin === 'refunded') return false;

  const createdMs = Date.parse(order.createdAt);
  if (!Number.isFinite(createdMs)) return true;

  const MAX_AUTO_POLL_AGE_MS = 24 * 60 * 60 * 1000;
  return nowMs - createdMs <= MAX_AUTO_POLL_AGE_MS;
}

/**
 * Determines whether adding/updating a tracking link on an order should send a WhatsApp tracking update.
 * Fires whenever tracking appears/changes on a known order, or on a newly ingested recent fulfillment (< 24h).
 */
export function shouldAutoSendTracking(
  prevOrder: Pick<OrderRecord, 'trackingUrl' | 'trackingNumber' | 'trackingSentValue'> | undefined,
  nextOrder: Pick<
    OrderRecord,
    'trackingUrl' | 'trackingNumber' | 'trackingSentValue' | 'customerPhone' | 'createdAt'
  >,
  settings: Pick<AppSettings, 'autoSendTrackingMessage'>,
  fulfilledAt?: string | null,
  nowMs = Date.now()
): boolean {
  if (!settings.autoSendTrackingMessage) return false;
  if (!nextOrder.customerPhone.trim()) return false;

  const nextVal = (nextOrder.trackingUrl || nextOrder.trackingNumber || '').trim();
  if (!nextVal) return false;

  const alreadySentVal = (
    nextOrder.trackingSentValue ||
    prevOrder?.trackingSentValue ||
    ''
  ).trim();
  if (alreadySentVal === nextVal) return false;

  if (prevOrder) {
    const prevVal = (prevOrder.trackingUrl || prevOrder.trackingNumber || '').trim();
    return prevVal !== nextVal;
  }

  // First time seeing this order: only notify if fulfillment/order is recent (< 24h)
  const refTimeMs = Date.parse(fulfilledAt || nextOrder.createdAt);
  if (!Number.isFinite(refTimeMs)) return true;
  const MAX_TRACKING_AGE_MS = 24 * 60 * 60 * 1000;
  return nowMs - refTimeMs <= MAX_TRACKING_AGE_MS;
}

/**
 * Classifies whether a WhatsApp send error is transient (socket drop / timeout / reconnect)
 * so the order remains queued for automatic retry rather than permanently failing.
 */
export function isTransientWhatsAppError(message: string): boolean {
  const lower = (message || '').toLowerCase();
  if (!lower) return true;
  return (
    lower.includes('connection closed') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('not connected') ||
    lower.includes('socket') ||
    lower.includes('restart required') ||
    lower.includes('stream errored') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('precondition')
  );
}

/**
 * Prevents a slower in-flight Shopify fetch from overwriting a fresher local tag update
 * (e.g. a WhatsApp poll send or customer confirmation click within the last 90 seconds).
 */
export function shouldPreserveRecentLocalTags(
  order: Pick<OrderRecord, 'respondedAt' | 'pollSentAt'>,
  nowMs = Date.now(),
  graceWindowMs = 90_000
): boolean {
  const timestamps = [order.respondedAt, order.pollSentAt]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((v) => Date.parse(v))
    .filter((ms) => Number.isFinite(ms));

  if (timestamps.length === 0) return false;
  const latestMs = Math.max(...timestamps);
  return nowMs - latestMs >= 0 && nowMs - latestMs < graceWindowMs;
}

/**
 * Selects critical WhatsApp Baileys auth files (creds, app-state-sync, lid-mapping, device-list,
 * and compact sessions) within a byte budget so cloud Redis backups never fail on thousands of pre-keys.
 */
export function selectPriorityAuthFiles(
  entries: Array<{ name: string; size: number }>,
  maxTotalBytes = 650_000
): string[] {
  const priorityScore = (name: string): number => {
    if (name === 'creds.json') return 0;
    if (name.startsWith('app-state-sync-')) return 1;
    if (name.startsWith('lid-mapping-')) return 2;
    if (name.startsWith('device-list-')) return 3;
    if (name.startsWith('session-')) return 4;
    if (name.startsWith('sender-key-')) return 5;
    if (name.startsWith('pre-key-')) return 6;
    return 7;
  };

  const sorted = [...entries].sort((a, b) => {
    const pa = priorityScore(a.name);
    const pb = priorityScore(b.name);
    if (pa !== pb) return pa - pb;
    return a.size - b.size;
  });

  const selected: string[] = [];
  let usedBytes = 0;

  for (const entry of sorted) {
    if (entry.name.includes('/') || entry.name.includes('..')) continue;
    // Skip stale bulk pre-keys once critical session files are captured if approaching budget
    if (priorityScore(entry.name) >= 6 && usedBytes > maxTotalBytes * 0.65) {
      continue;
    }
    if (usedBytes + entry.size > maxTotalBytes && selected.length > 0) {
      continue;
    }
    selected.push(entry.name);
    usedBytes += entry.size;
  }

  return selected;
}

/**
 * Normalizes a store domain string for checking/displaying and builds deployment env vars.
 */
export function hasConfiguredShopify(
  settings: Pick<
    AppSettings,
    'shopifyStoreDomain' | 'shopifyClientId' | 'shopifyClientSecret' | 'shopifyAccessToken'
  >
): boolean {
  const domain = (settings.shopifyStoreDomain || '').trim();
  if (!domain) return false;
  return Boolean(
    settings.shopifyAccessToken.trim() ||
      (settings.shopifyClientId.trim() && settings.shopifyClientSecret.trim())
  );
}

/**
 * Generates clean Environment Variable lines for pasting into Vercel / Railway / Render
 * so Shopify credentials and date cutoffs persist automatically after every deploy.
 */
export function buildDeployEnvSnippet(
  settings: Pick<
    AppSettings,
    | 'shopName'
    | 'shopifyStoreDomain'
    | 'shopifyClientId'
    | 'shopifyClientSecret'
    | 'shopifyWebhookSecret'
    | 'shopifyAccessToken'
    | 'syncStartDate'
  >
): string {
  const domain = (settings.shopifyStoreDomain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();

  const lines = [
    `SHOPIFY_SHOP_NAME=${settings.shopName || 'Broomies Bakery'}`,
    `SHOPIFY_STORE_DOMAIN=${domain}`,
    `SHOPIFY_CLIENT_ID=${(settings.shopifyClientId || '').trim()}`,
    `SHOPIFY_CLIENT_SECRET=${(settings.shopifyClientSecret || '').trim()}`,
  ];

  if (settings.shopifyWebhookSecret?.trim()) {
    lines.push(`SHOPIFY_WEBHOOK_SECRET=${settings.shopifyWebhookSecret.trim()}`);
  }
  if (settings.shopifyAccessToken?.trim()) {
    lines.push(`SHOPIFY_ACCESS_TOKEN=${settings.shopifyAccessToken.trim()}`);
  }
  if (settings.syncStartDate?.trim()) {
    lines.push(`SYNC_START_DATE=${settings.syncStartDate.trim()}`);
  }

  return lines.join('\n');
}


