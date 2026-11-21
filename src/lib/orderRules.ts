import type {
  AppSettings,
  MetaAdsRateEntry,
  OrderMetrics,
  OrderRecord,
  PollStatus,
} from './types.js';

export const DEFAULT_META_ADS_RATE_HISTORY: MetaAdsRateEntry[] = [
  { effectiveFrom: '2026-11-13', dailySpend: 500 },
  { effectiveFrom: '2026-11-16', dailySpend: 900 },
  { effectiveFrom: '2026-11-19', dailySpend: 1500 },
];

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
  autoCancelInShopify: true,
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
  delhiveryApiToken: '',
  delhiveryPickupPincode: '',
  delhiveryBillingMode: 'E',
  delhiveryDefaultWeightGrams: 500,
  cogsPercent: 35,
  packagingCostPerOrder: 25,
  fallbackForwardShippingCost: 75,
  fallbackRtoShippingCost: 75,
  fallbackCodFee: 25,
  prepaidGatewayPercent: 2,
  marketingCostPerOrder: 0,
  dailyMetaAdsSpend: 1500,
  metaAdsRateHistory: DEFAULT_META_ADS_RATE_HISTORY,
  deliverySlaDays: 4,
  pickupSlaHours: 48,
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
  shipment_status?: string | null;
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
  shipmentStatus: string | null;
}

/**
 * Extracts the newest active fulfillment tracking URL/number and shipment status from a Shopify order payload.
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
      shipmentStatus: null,
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
    const shipmentStatus = f.shipment_status?.trim() || null;

    if (value) {
      return {
        trackingNumber: num,
        trackingUrl: url,
        trackingCompany: company,
        trackingValue: value,
        fulfilledAt: f.created_at || null,
        shipmentStatus,
      };
    }
  }

  const fallback = candidates.find((f) => f.shipment_status?.trim() || f.created_at);
  return {
    trackingNumber: '',
    trackingUrl: '',
    trackingCompany: '',
    trackingValue: '',
    fulfilledAt: fallback?.created_at || null,
    shipmentStatus: fallback?.shipment_status?.trim() || null,
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
 * Prevents a slower in-flight Shopify fetch from overwriting a fresher local order remark update.
 */
export function shouldPreserveRecentLocalNote(
  order: Pick<OrderRecord, 'noteUpdatedAt'>,
  nowMs = Date.now(),
  graceWindowMs = 90_000
): boolean {
  if (!order.noteUpdatedAt) return false;
  const noteMs = Date.parse(order.noteUpdatedAt);
  if (!Number.isFinite(noteMs)) return false;
  return nowMs - noteMs >= 0 && nowMs - noteMs < graceWindowMs;
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

/**
 * Checks whether the persistent WhatsApp host server reported a heartbeat recently.
 */
export function isHostHeartbeatRecent(
  lastHeartbeatAt?: string | null,
  nowMs = Date.now(),
  maxAgeMs = 180_000
): boolean {
  if (!lastHeartbeatAt) return false;
  const hbMs = Date.parse(lastHeartbeatAt);
  if (!Number.isFinite(hbMs)) return false;
  return nowMs - hbMs <= maxAgeMs;
}

export interface WhatsAppDisplaySummary {
  isLocalConnected: boolean;
  isRemoteLinked: boolean;
  isLinked: boolean;
  isHostLive: boolean;
  remoteHostLabel: string | null;
  statusLabel: string;
  sidebarLabel: string;
  persistenceLabel: string;
}

export function formatWhatsAppHostLabel(hostKind?: string | null): string | null {
  if (!hostKind) return null;
  const clean = hostKind.trim().toLowerCase();
  if (clean === 'railway') return 'Railway';
  if (clean === 'cloud') return 'Cloud Host';
  if (clean === 'dev_preview') return 'AI Studio';
  if (clean === 'serverless') return 'Vercel';
  return hostKind;
}

/**
 * Computes consistent UI display states across local Node hosts, Railway, AI Studio,
 * and serverless dashboards (Vercel), treating a cloud-synced session from another active host
 * as linked rather than "Not Linked".
 */
export function getWhatsAppDisplayState(
  whatsapp: {
    status: string;
    phoneNumber?: string | null;
    connectedAt?: string | null;
    lastHeartbeatAt?: string | null;
    sessionPersisted?: boolean;
    remoteSessionActive?: boolean;
    activeHostKind?: string | null;
    hostKind?: string | null;
    isServerless?: boolean;
    qrDataUrl?: string | null;
  },
  nowMs = Date.now()
): WhatsAppDisplaySummary {
  const isLocalConnected = whatsapp.status === 'connected';
  const hasRemoteMeta = Boolean(
    whatsapp.remoteSessionActive || (whatsapp.connectedAt && whatsapp.phoneNumber)
  );
  const isDifferentActiveHost = Boolean(
    whatsapp.activeHostKind &&
      whatsapp.hostKind &&
      whatsapp.activeHostKind !== whatsapp.hostKind
  );
  const isMirrorHost = Boolean(
    whatsapp.isServerless ||
      isDifferentActiveHost ||
      (!whatsapp.hostKind && Boolean(whatsapp.remoteSessionActive))
  );
  const isRemoteLinked =
    isMirrorHost && !isLocalConnected && hasRemoteMeta && Boolean(whatsapp.phoneNumber);
  const isLinked = isLocalConnected || isRemoteLinked;
  const isHostLive =
    isLocalConnected || (isRemoteLinked && isHostHeartbeatRecent(whatsapp.lastHeartbeatAt, nowMs));
  const remoteHostLabel = isRemoteLinked
    ? formatWhatsAppHostLabel(whatsapp.activeHostKind) || 'Host'
    : null;

  const isQrReady = whatsapp.status === 'qr_ready' && Boolean(whatsapp.qrDataUrl);
  const isConnecting = whatsapp.status === 'connecting';
  const isSavedButPaused =
    !isLinked && !isQrReady && !isConnecting && Boolean(whatsapp.sessionPersisted || hasRemoteMeta);

  const statusLabel = isLocalConnected
    ? 'Connected · 24/7 Active'
    : isRemoteLinked
      ? isHostLive
        ? 'Connected on Host · Live'
        : 'Session Saved · Cloud Synced'
      : isQrReady
        ? 'Scan QR Now'
        : isConnecting
          ? 'Connecting...'
          : isSavedButPaused
            ? 'Session Paused'
            : 'Not Linked';

  const sidebarLabel = isLocalConnected
    ? 'Connected'
    : isRemoteLinked
      ? isHostLive
        ? 'Connected (Host)'
        : 'Synced (Host Session)'
      : isQrReady
        ? 'Scan QR'
        : isConnecting
          ? 'Connecting...'
          : isSavedButPaused
            ? 'Paused'
            : 'Unlinked';

  const persistenceLabel = isLocalConnected
    ? whatsapp.sessionPersisted
      ? 'Saved (Auto-Restore on Boot)'
      : 'Active in Memory'
    : isRemoteLinked
      ? `Live Synced via Firebase RTDB (${remoteHostLabel} Active)`
      : isSavedButPaused
        ? 'Saved (Socket Paused — Click Restore)'
        : 'Not Saved';

  return {
    isLocalConnected,
    isRemoteLinked,
    isLinked,
    isHostLive,
    remoteHostLabel,
    statusLabel,
    sidebarLabel,
    persistenceLabel,
  };
}

/**
 * Identifies WhatsApp Web 440 (connectionReplaced) close events so a displaced
 * host pauses auto-reconnect instead of fighting another active server (e.g. Railway).
 */
export function isWhatsAppConnectionReplaced(statusCode?: number | null): boolean {
  return statusCode === 440;
}

/**
 * Safely reads an environment variable while handling accidental surrounding quotes
 * or leading/trailing whitespace in key names or values pasted into hosting dashboards.
 */
export function readCleanEnvVar(
  env: Record<string, string | undefined>,
  candidateKeys: string[]
): string {
  for (const targetKey of candidateKeys) {
    let raw = env[targetKey];
    if (raw === undefined) {
      const matchedKey = Object.keys(env).find((k) => k.trim() === targetKey);
      if (matchedKey) raw = env[matchedKey];
    }
    if (typeof raw !== 'string') continue;
    let cleaned = raw.trim();
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length >= 2)
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    if (cleaned) return cleaned;
  }
  return '';
}

export type DispatchStatusCode =
  | 'ready'
  | 'tracking_added'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'rto_return'
  | 'cancelled'
  | 'pending';

function parseNormalizedTags(shopifyTags?: string | null): string[] {
  if (!shopifyTags) return [];
  return shopifyTags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks whether a Shopify order has already been dispatched/fulfilled
 * (via Shopify fulfillment_status or attached/sent tracking number/URL).
 */
export function isOrderDispatched(
  order: Pick<
    OrderRecord,
    'fulfillmentStatus' | 'trackingNumber' | 'trackingUrl' | 'trackingSentAt' | 'trackingSentValue'
  >
): boolean {
  const fStatus = (order.fulfillmentStatus || '').trim().toLowerCase();
  if (fStatus === 'fulfilled') return true;
  return Boolean(
    order.trackingUrl?.trim() ||
      order.trackingNumber?.trim() ||
      order.trackingSentAt ||
      order.trackingSentValue?.trim()
  );
}

function hasRtoReturnNoteSignal(rawText?: string | null): boolean {
  if (!rawText) return false;
  const text = rawText.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return false;

  // Exclude pre-dispatch risk notes like "high rto not picking the call" or "LOW RTO Risk"
  if (/\b(?:high|low|medium|moderate)\s+rto\b/.test(text) || /\brto\s*[-:]?\s*risk\b/.test(text)) {
    return false;
  }

  return (
    text === 'rto' ||
    text === 'returned' ||
    text === 'rto return' ||
    /\bin[\s-]*transit\s+for\s+return\b/.test(text) ||
    /\breturn(?:ed)?\s+to\s+(?:origin|shipper|seller|warehouse|sender)\b/.test(text) ||
    /\brto\s+(?:initiated|in[\s-]*transit|delivered|returned|dispatch(?:ed)?|manifested|marked|booked|pending|complete(?:d)?|received|return)\b/.test(
      text
    ) ||
    /\breturn\s+(?:initiated|in[\s-]*transit|delivered|picked(?:\s*up)?|completed|received)\b/.test(
      text
    ) ||
    /\b(?:shipment|order|parcel|package)\s+returned\b/.test(text) ||
    /\bundelivered[\s:-]+return\b/.test(text)
  );
}

/**
 * Checks whether an order has actually entered RTO / Return (excluding pre-dispatch RTO Risk tags/notes).
 */
export function isOrderRtoReturn(
  order: Pick<OrderRecord, 'fulfillmentStatus' | 'shipmentStatus' | 'shopifyTags'> & {
    orderNote?: string | null;
    lastCourierScanRemark?: string | null;
  }
): boolean {
  const ship = (order.shipmentStatus || '').trim().toLowerCase();
  if (
    ship === 'failure' ||
    ship === 'rto' ||
    ship === 'rto_initiated' ||
    ship === 'rto_in_transit' ||
    ship === 'rto_delivered' ||
    ship === 'returned'
  ) {
    return true;
  }

  const fStatus = (order.fulfillmentStatus || '').trim().toLowerCase();
  if (fStatus === 'restocked' || fStatus === 'returned' || fStatus === 'rto') {
    return true;
  }

  if (
    hasRtoReturnNoteSignal(order.orderNote) ||
    hasRtoReturnNoteSignal(order.lastCourierScanRemark)
  ) {
    return true;
  }

  const tags = parseNormalizedTags(order.shopifyTags);
  return tags.some((tag) => {
    if (tag.includes('risk')) return false;
    return (
      tag === 'rto' ||
      tag.startsWith('rto ') ||
      tag.startsWith('rto_') ||
      tag.startsWith('rto-') ||
      tag.includes('return to origin') ||
      tag.includes('in transit for return') ||
      tag === 'returned' ||
      tag === 'return' ||
      tag.includes('order returned') ||
      tag.includes('shipment returned') ||
      tag.includes('ndr rto')
    );
  });
}

/**
 * Checks whether an order has been delivered to the customer (and is not an RTO return).
 */
export function isOrderDelivered(
  order: Pick<OrderRecord, 'fulfillmentStatus' | 'shipmentStatus' | 'shopifyTags'> & {
    orderNote?: string | null;
    lastCourierScanRemark?: string | null;
  }
): boolean {
  if (isOrderRtoReturn(order)) return false;

  const ship = (order.shipmentStatus || '').trim().toLowerCase();
  if (ship === 'delivered') return true;

  const tags = parseNormalizedTags(order.shopifyTags);
  return tags.some((tag) => {
    if (tag.includes('undelivered') || tag.includes('not delivered') || tag.includes('rto')) {
      return false;
    }
    return tag === 'delivered' || tag === 'order delivered' || tag === 'shipment delivered';
  });
}

function hasPickedUpOrTransitSignal(
  order: Pick<OrderRecord, 'shipmentStatus' | 'shopifyTags'>
): boolean {
  const ship = (order.shipmentStatus || '').trim().toLowerCase();
  if (
    ship === 'picked_up' ||
    ship === 'in_transit' ||
    ship === 'out_for_delivery' ||
    ship === 'attempted_delivery'
  ) {
    return true;
  }

  const tags = parseNormalizedTags(order.shopifyTags);
  return tags.some(
    (tag) =>
      tag === 'picked up' ||
      tag === 'picked_up' ||
      tag === 'picked-up' ||
      tag === 'in transit' ||
      tag === 'in_transit' ||
      tag === 'in-transit' ||
      tag === 'out for delivery' ||
      tag === 'out_for_delivery' ||
      tag === 'ofd' ||
      tag === 'attempted delivery' ||
      tag === 'shipped'
  );
}

function hasPrePickupTrackingStatus(order: Pick<OrderRecord, 'shipmentStatus'>): boolean {
  const ship = (order.shipmentStatus || '').trim().toLowerCase();
  return (
    ship === 'confirmed' ||
    ship === 'label_printed' ||
    ship === 'label_purchased' ||
    ship === 'ready_for_pickup'
  );
}

/**
 * Checks whether an order has tracking/label added in Shopify and is waiting for courier pickup
 * (not yet picked up / in transit, not delivered, and not RTO return).
 */
export function isOrderTrackingAdded(
  order: Pick<
    OrderRecord,
    | 'fulfillmentStatus'
    | 'shipmentStatus'
    | 'shopifyTags'
    | 'trackingNumber'
    | 'trackingUrl'
    | 'trackingSentAt'
    | 'trackingSentValue'
  > & { orderNote?: string | null; lastCourierScanRemark?: string | null }
): boolean {
  if (isOrderRtoReturn(order) || isOrderDelivered(order)) return false;
  if (hasPickedUpOrTransitSignal(order)) return false;
  return isOrderDispatched(order) || hasPrePickupTrackingStatus(order);
}

/**
 * Checks whether an order has been picked up and is actively In Transit
 * (picked_up / in_transit / out_for_delivery / attempted_delivery, and not Delivered or RTO Return).
 */
export function isOrderInTransit(
  order: Pick<
    OrderRecord,
    | 'fulfillmentStatus'
    | 'shipmentStatus'
    | 'shopifyTags'
    | 'trackingNumber'
    | 'trackingUrl'
    | 'trackingSentAt'
    | 'trackingSentValue'
  > & { orderNote?: string | null; lastCourierScanRemark?: string | null }
): boolean {
  if (isOrderRtoReturn(order) || isOrderDelivered(order)) return false;
  return hasPickedUpOrTransitSignal(order);
}

/**
 * Converts an ISO timestamp or Date into a YYYY-MM-DD calendar date in IST (+05:30).
 */
export function getIstDateKey(value: string | Date): string | null {
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const IST_OFFSET_MS = 330 * 60 * 1000;
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Converts an ISO timestamp or Date into YYYY-MM in IST (+05:30).
 */
export function getIstMonthKey(value: string | Date): string | null {
  const dateKey = getIstDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : null;
}

/**
 * Shifts a YYYY-MM month key backward/forward cleanly across year boundaries.
 */
export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const match = monthKey.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const year = Number.parseInt(match[1], 10);
  const monthIdx = Number.parseInt(match[2], 10) - 1;
  const dt = new Date(Date.UTC(year, monthIdx + deltaMonths, 1));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Computes exact IST month start/end YYYY-MM-DD dates and display label (e.g. "November 2026").
 */
export function getMonthIstDateBounds(
  monthKey: string
): { fromDate: string; toDate: string; monthLabel: string } | null {
  const match = monthKey.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');
  const labelDt = new Date(Date.UTC(year, month - 1, 15));
  const monthLabel = labelDt.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return {
    fromDate: `${year}-${mm}-01`,
    toDate: `${year}-${mm}-${dd}`,
    monthLabel,
  };
}

/**
 * Checks whether an order is confirmed by the customer AND still waiting to be dispatched today.
 */
export function isOrderReadyToDispatch(
  order: Pick<
    OrderRecord,
    | 'pollStatus'
    | 'fulfillmentStatus'
    | 'shipmentStatus'
    | 'shopifyTags'
    | 'trackingNumber'
    | 'trackingUrl'
    | 'trackingSentAt'
    | 'trackingSentValue'
  > & { orderNote?: string | null; lastCourierScanRemark?: string | null }
): boolean {
  return (
    order.pollStatus === 'confirmed' &&
    !isOrderDispatched(order) &&
    !isOrderDelivered(order) &&
    !isOrderRtoReturn(order)
  );
}

/**
 * Checks whether an order has been dispatched/fulfilled on today's IST calendar date.
 */
export function isOrderDispatchedToday(
  order: Pick<
    OrderRecord,
    | 'fulfillmentStatus'
    | 'fulfilledAt'
    | 'trackingNumber'
    | 'trackingUrl'
    | 'trackingSentAt'
    | 'trackingSentValue'
    | 'respondedAt'
    | 'createdAt'
  >,
  nowMs = Date.now()
): boolean {
  if (!isOrderDispatched(order)) return false;
  const todayKey = getIstDateKey(new Date(nowMs));
  if (!todayKey) return false;
  const refTimestamp =
    order.fulfilledAt || order.trackingSentAt || order.respondedAt || order.createdAt;
  if (!refTimestamp) return false;
  return getIstDateKey(refTimestamp) === todayKey;
}

/**
 * Returns a concise status code and label for the "Today Dispatch" / Shipment column.
 */
export function getDispatchStatusInfo(
  order: Pick<
    OrderRecord,
    | 'pollStatus'
    | 'fulfillmentStatus'
    | 'shipmentStatus'
    | 'shopifyTags'
    | 'trackingNumber'
    | 'trackingUrl'
    | 'trackingSentAt'
    | 'trackingSentValue'
  > & { orderNote?: string | null; lastCourierScanRemark?: string | null }
): { code: DispatchStatusCode; label: string } {
  if (isOrderRtoReturn(order)) {
    return { code: 'rto_return', label: 'RTO Return' };
  }
  if (isOrderDelivered(order)) {
    return { code: 'delivered', label: 'Delivered' };
  }
  const ship = (order.shipmentStatus || '').trim().toLowerCase();
  if (ship === 'out_for_delivery') {
    return { code: 'in_transit', label: 'Out for Delivery' };
  }
  if (hasPickedUpOrTransitSignal(order)) {
    return { code: 'in_transit', label: 'In Transit' };
  }
  if (hasPrePickupTrackingStatus(order)) {
    return { code: 'tracking_added', label: 'Tracking Added' };
  }
  if (isOrderDispatched(order)) {
    return { code: 'dispatched', label: 'Dispatched' };
  }
  if (isOrderReadyToDispatch(order)) {
    return { code: 'ready', label: 'Dispatch Today' };
  }
  if (order.pollStatus === 'cancelled_by_user') {
    return { code: 'cancelled', label: 'Cancelled' };
  }
  return { code: 'pending', label: 'Awaiting Confirm' };
}

/**
 * Detects whether an order's Shopify tags contain a High RTO indicator
 * (e.g. "HIGH RTO Risk", "High RTO", "high_rto", "RTO Risk - High")
 * without matching low/medium RTO tags.
 */
export function hasHighRtoTag(shopifyTags?: string | null): boolean {
  if (!shopifyTags) return false;
  const tags = parseNormalizedTags(shopifyTags);

  return tags.some(
    (tag) =>
      tag.includes('high rto') ||
      tag.includes('high_rto') ||
      tag.includes('high-rto') ||
      tag.includes('rto risk - high') ||
      tag.includes('rto risk: high') ||
      tag.includes('rto high')
  );
}

export interface PdfOrderRowData {
  orderNumber: string;
  dateTimeLabel: string;
  customerLabel: string;
  itemsSummary: string;
  amountLabel: string;
  confirmStatus: string;
  dispatchStatus: string;
  dispatchCode: DispatchStatusCode;
  deliverySummary: string;
  shopifyTags: string;
  highRto: boolean;
}

export interface PdfReportSummary {
  total: number;
  confirmed: number;
  readyToDispatch: number;
  trackingAdded: number;
  dispatched: number;
  inTransit: number;
  delivered: number;
  rtoReturn: number;
  pending: number;
  cancelled: number;
  rows: PdfOrderRowData[];
}

/**
 * Computes summary counters and formatted table rows for the Export PDF dispatch report.
 */
export function buildOrdersPdfSummaryAndRows(orders: OrderRecord[]): PdfReportSummary {
  let confirmed = 0;
  let readyToDispatch = 0;
  let trackingAdded = 0;
  let dispatched = 0;
  let inTransit = 0;
  let delivered = 0;
  let rtoReturn = 0;
  let pending = 0;
  let cancelled = 0;

  const rows: PdfOrderRowData[] = orders.map((order) => {
    if (order.pollStatus === 'confirmed') confirmed += 1;
    else if (order.pollStatus === 'cancelled_by_user') cancelled += 1;
    else if (order.pollStatus === 'poll_sent' || order.pollStatus === 'queued') pending += 1;

    const dispatchInfo = getDispatchStatusInfo(order);
    if (
      dispatchInfo.code === 'dispatched' ||
      dispatchInfo.code === 'tracking_added' ||
      dispatchInfo.code === 'in_transit'
    ) {
      dispatched += 1;
    }
    if (dispatchInfo.code === 'ready') readyToDispatch += 1;
    if (isOrderTrackingAdded(order)) trackingAdded += 1;
    if (isOrderInTransit(order)) inTransit += 1;
    if (isOrderDelivered(order)) delivered += 1;
    if (isOrderRtoReturn(order)) rtoReturn += 1;

    const confirmStatus =
      order.pollStatus === 'confirmed'
        ? 'Confirmed'
        : order.pollStatus === 'cancelled_by_user'
          ? 'Cancelled'
          : order.pollStatus === 'poll_sent'
            ? 'Poll Sent'
            : order.pollStatus === 'failed'
              ? 'Failed'
              : 'Queued';

    const parsedDate = new Date(order.createdAt);
    const dateTimeLabel = Number.isNaN(parsedDate.getTime())
      ? order.createdAt
      : parsedDate.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

    return {
      orderNumber: order.orderNumber,
      dateTimeLabel,
      customerLabel: `${order.customerName}\n${order.customerPhone || 'No phone'}`,
      itemsSummary: order.lineItemsSummary || '—',
      amountLabel: `${order.currency} ${order.totalPrice}`,
      confirmStatus,
      dispatchStatus: dispatchInfo.label,
      dispatchCode: dispatchInfo.code,
      deliverySummary: order.deliverySummary || '—',
      shopifyTags: order.shopifyTags || '—',
      highRto: hasHighRtoTag(order.shopifyTags),
    };
  });

  return {
    total: orders.length,
    confirmed,
    readyToDispatch,
    trackingAdded,
    dispatched,
    inTransit,
    delivered,
    rtoReturn,
    pending,
    cancelled,
    rows,
  };
}

/**
 * Checks whether the customer has NOT confirmed (or cancelled) via WhatsApp yet
 * (poll_sent, queued, or failed).
 */
export function isOrderNotConfirmedOnWhatsApp(
  order: Pick<OrderRecord, 'pollStatus'>
): boolean {
  return (
    order.pollStatus === 'poll_sent' ||
    order.pollStatus === 'queued' ||
    order.pollStatus === 'failed'
  );
}

/**
 * Checks whether tracking / fulfillment has been added to an order (including awaiting pickup,
 * in transit, delivered, or fulfilled).
 */
export function hasOrderTrackingAdded(
  order: Pick<
    OrderRecord,
    | 'fulfillmentStatus'
    | 'shipmentStatus'
    | 'shopifyTags'
    | 'trackingNumber'
    | 'trackingUrl'
    | 'trackingSentAt'
    | 'trackingSentValue'
  >
): boolean {
  return (
    isOrderDispatched(order) ||
    isOrderTrackingAdded(order) ||
    isOrderInTransit(order) ||
    isOrderDelivered(order)
  );
}

/**
 * Filters orders whose createdAt IST calendar date falls within [fromDate, toDate] inclusive.
 */
export function filterOrdersByIstDateRange(
  orders: OrderRecord[],
  fromDate?: string,
  toDate?: string
): OrderRecord[] {
  const from = (fromDate || '').trim();
  const to = (toDate || '').trim();
  if (!from && !to) return orders;

  return orders.filter((order) => {
    const key = getIstDateKey(order.createdAt);
    if (!key) return false;
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  });
}

/**
 * Formats a YYYY-MM-DD calendar date into human-readable format (e.g. "15 Nov 2026").
 */
export function formatIstDateDisplay(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey;
  const ms = Date.parse(`${dateKey}T12:00:00+05:30`);
  if (!Number.isFinite(ms)) return dateKey;
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export interface DailyReportRow {
  dateKey: string;
  dateLabel: string;
  totalOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  notConfirmedOnWhatsApp: number;
  readyToDispatch: number;
  trackingAddedTotal: number;
  trackingPendingPickup: number;
  inTransitCount: number;
  deliveredCount: number;
  rtoReturnCount: number;
  highRtoCount: number;
  confirmationRate: number;
  totalValue: number;
  confirmedValue: number;
  cancelledValue: number;
  notConfirmedValue: number;
  currency: string;
}

export interface DailyReportSummary {
  totals: DailyReportRow;
  dailyRows: DailyReportRow[];
}

/**
 * Groups orders by IST calendar date and computes aggregate + per-day KPIs for Reports & PDF export.
 */
export function buildDailyReportSummary(orders: OrderRecord[]): DailyReportSummary {
  const buckets = new Map<string, OrderRecord[]>();
  for (const order of orders) {
    const key = getIstDateKey(order.createdAt) || 'Unknown';
    const list = buckets.get(key);
    if (list) list.push(order);
    else buckets.set(key, [order]);
  }

  const summarizeBucket = (dateKey: string, dateLabel: string, list: OrderRecord[]): DailyReportRow => {
    let confirmedOrders = 0;
    let cancelledOrders = 0;
    let notConfirmedOnWhatsApp = 0;
    let readyToDispatch = 0;
    let trackingAddedTotal = 0;
    let trackingPendingPickup = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let rtoReturnCount = 0;
    let highRtoCount = 0;
    let totalValue = 0;
    let confirmedValue = 0;
    let cancelledValue = 0;
    let notConfirmedValue = 0;
    let currency = 'INR';

    for (const order of list) {
      if (order.currency) currency = order.currency;
      const numeric = Number.parseFloat(order.totalPrice || '0');
      const orderVal = Number.isFinite(numeric) ? numeric : 0;
      totalValue += orderVal;

      if (order.pollStatus === 'confirmed') {
        confirmedOrders += 1;
        confirmedValue += orderVal;
      } else if (order.pollStatus === 'cancelled_by_user') {
        cancelledOrders += 1;
        cancelledValue += orderVal;
      } else {
        notConfirmedOnWhatsApp += 1;
        notConfirmedValue += orderVal;
      }

      if (isOrderReadyToDispatch(order)) readyToDispatch += 1;
      if (hasOrderTrackingAdded(order)) trackingAddedTotal += 1;
      if (isOrderTrackingAdded(order)) trackingPendingPickup += 1;
      if (isOrderInTransit(order)) inTransitCount += 1;
      if (isOrderDelivered(order)) deliveredCount += 1;
      if (isOrderRtoReturn(order)) rtoReturnCount += 1;
      if (hasHighRtoTag(order.shopifyTags)) highRtoCount += 1;
    }

    const decided = confirmedOrders + cancelledOrders;
    const confirmationRate = decided > 0 ? Math.round((confirmedOrders / decided) * 100) : 0;

    return {
      dateKey,
      dateLabel,
      totalOrders: list.length,
      confirmedOrders,
      cancelledOrders,
      notConfirmedOnWhatsApp,
      readyToDispatch,
      trackingAddedTotal,
      trackingPendingPickup,
      inTransitCount,
      deliveredCount,
      rtoReturnCount,
      highRtoCount,
      confirmationRate,
      totalValue: Math.round(totalValue * 100) / 100,
      confirmedValue: Math.round(confirmedValue * 100) / 100,
      cancelledValue: Math.round(cancelledValue * 100) / 100,
      notConfirmedValue: Math.round(notConfirmedValue * 100) / 100,
      currency,
    };
  };

  const dailyRows = Array.from(buckets.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => summarizeBucket(key, formatIstDateDisplay(key), list));

  const totals = summarizeBucket('ALL', 'Selected Period', orders);

  return {
    totals,
    dailyRows,
  };
}

export type HostRuntimeKind = 'railway' | 'cloud' | 'dev_preview' | 'serverless';

/**
 * Identifies whether the current Node process is running on Railway, another 24/7 cloud host,
 * Vercel serverless, or a temporary local/AI Studio dev preview.
 */
export function detectHostRuntimeKind(
  env: Record<string, string | undefined> = process.env
): HostRuntimeKind {
  if (env.VERCEL) return 'serverless';
  if (env.RAILWAY_ENVIRONMENT || env.RAILWAY_SERVICE_ID || env.RAILWAY_PROJECT_ID) {
    return 'railway';
  }
  if (env.RENDER || env.FLY_APP_NAME || env.NODE_ENV === 'production') {
    return 'cloud';
  }
  return 'dev_preview';
}

/**
 * Prevents a temporary dev preview server from auto-connecting Baileys and stealing
 * the single active WhatsApp Web socket away from a live 24/7 Railway/cloud host.
 */
export function shouldSkipAutoRestoreForRemoteHost(
  params: {
    currentHost: HostRuntimeKind;
    activeHostKind?: string | null;
    lastHeartbeatAt?: string | null;
  },
  nowMs = Date.now()
): boolean {
  if (params.currentHost !== 'dev_preview') return false;
  const remoteIsProduction =
    params.activeHostKind === 'railway' || params.activeHostKind === 'cloud';
  if (!remoteIsProduction) return false;
  return isHostHeartbeatRecent(params.lastHeartbeatAt, nowMs, 240_000);
}

const POLL_PROGRESSION_RANK: Record<OrderRecord['pollStatus'], number> = {
  queued: 1,
  failed: 2,
  poll_sent: 3,
  confirmed: 4,
  cancelled_by_user: 4,
};

/**
 * Merges two snapshots of the same order without ever regressing a progressed pollStatus
 * (e.g. keeps poll_sent/confirmed even if another serverless container wrote queued earlier).
 */
export function mergeProgressedOrderRecords(
  primary: OrderRecord,
  secondary: OrderRecord
): OrderRecord {
  const rankPrimary = POLL_PROGRESSION_RANK[primary.pollStatus] ?? 0;
  const rankSecondary = POLL_PROGRESSION_RANK[secondary.pollStatus] ?? 0;

  let winner = primary;
  let loser = secondary;
  if (rankSecondary > rankPrimary) {
    winner = secondary;
    loser = primary;
  } else if (rankSecondary === rankPrimary) {
    const score = (o: OrderRecord) =>
      (o.respondedAt ? 8 : 0) +
      (o.pollSentAt ? 4 : 0) +
      (o.trackingSentAt ? 2 : 0) +
      (o.events?.length || 0) * 0.01;
    if (score(secondary) > score(primary)) {
      winner = secondary;
      loser = primary;
    }
  }

  const seenEvents = new Set<string>();
  const mergedEvents = [...(winner.events || []), ...(loser.events || [])]
    .filter((evt) => {
      const key = `${evt.actor}|${evt.message}|${evt.timestamp.slice(0, 16)}`;
      if (seenEvents.has(key)) return false;
      seenEvents.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const winnerNoteMs = winner.noteUpdatedAt ? Date.parse(winner.noteUpdatedAt) : 0;
  const loserNoteMs = loser.noteUpdatedAt ? Date.parse(loser.noteUpdatedAt) : 0;
  const preferLoserNote =
    Number.isFinite(loserNoteMs) &&
    loserNoteMs > (Number.isFinite(winnerNoteMs) ? winnerNoteMs : 0);

  const winnerShipMs = winner.shopifyShipmentSyncedAt
    ? Date.parse(winner.shopifyShipmentSyncedAt)
    : 0;
  const loserShipMs = loser.shopifyShipmentSyncedAt
    ? Date.parse(loser.shopifyShipmentSyncedAt)
    : 0;
  const hasWinnerShipSync = Number.isFinite(winnerShipMs) && winnerShipMs > 0;
  const hasLoserShipSync = Number.isFinite(loserShipMs) && loserShipMs > 0;

  let resolvedFulfillmentStatus: string | null;
  let resolvedShipmentStatus: string | null;
  let resolvedShopifyShipmentSyncedAt: string | null;
  let resolvedDeliveredAt: string | null;

  if (hasWinnerShipSync || hasLoserShipSync) {
    const shipSource =
      hasLoserShipSync && (!hasWinnerShipSync || loserShipMs > winnerShipMs) ? loser : winner;
    resolvedFulfillmentStatus = shipSource.fulfillmentStatus ?? null;
    resolvedShipmentStatus = shipSource.shipmentStatus ?? null;
    resolvedShopifyShipmentSyncedAt = shipSource.shopifyShipmentSyncedAt ?? null;
    const isAuthoritativelyDelivered =
      (resolvedShipmentStatus || '').trim().toLowerCase() === 'delivered';
    resolvedDeliveredAt = isAuthoritativelyDelivered
      ? shipSource.deliveredAt || winner.deliveredAt || loser.deliveredAt || null
      : null;
  } else {
    resolvedFulfillmentStatus = winner.fulfillmentStatus || loser.fulfillmentStatus || null;
    resolvedShipmentStatus = winner.shipmentStatus || loser.shipmentStatus || null;
    resolvedShopifyShipmentSyncedAt = null;
    resolvedDeliveredAt = winner.deliveredAt || loser.deliveredAt || null;
  }

  return {
    ...winner,
    orderNote: preferLoserNote
      ? loser.orderNote || ''
      : winner.orderNote ?? loser.orderNote ?? '',
    noteUpdatedAt: preferLoserNote
      ? loser.noteUpdatedAt || null
      : winner.noteUpdatedAt || loser.noteUpdatedAt || null,
    shopifyTags:
      winner.shopifyTags && winner.shopifyTags.length >= (loser.shopifyTags?.length || 0)
        ? winner.shopifyTags
        : loser.shopifyTags || winner.shopifyTags,
    fulfillmentStatus: resolvedFulfillmentStatus,
    shipmentStatus: resolvedShipmentStatus,
    shopifyShipmentSyncedAt: resolvedShopifyShipmentSyncedAt,
    fulfilledAt: winner.fulfilledAt || loser.fulfilledAt || null,
    shopifyCancelledAt: winner.shopifyCancelledAt || loser.shopifyCancelledAt || null,
    trackingUrl: winner.trackingUrl || loser.trackingUrl || '',
    trackingNumber: winner.trackingNumber || loser.trackingNumber || '',
    trackingCompany: winner.trackingCompany || loser.trackingCompany || '',
    trackingSentAt: winner.trackingSentAt || loser.trackingSentAt || null,
    trackingSentValue: winner.trackingSentValue || loser.trackingSentValue || null,
    destinationPincode: winner.destinationPincode || loser.destinationPincode || '',
    orderWeightGrams: winner.orderWeightGrams || loser.orderWeightGrams,
    delhiveryShippingCost:
      winner.delhiveryShippingCost ?? loser.delhiveryShippingCost ?? null,
    delhiveryCodFee: winner.delhiveryCodFee ?? loser.delhiveryCodFee ?? null,
    delhiveryRtoCost: winner.delhiveryRtoCost ?? loser.delhiveryRtoCost ?? null,
    delhiveryChargeSource:
      winner.delhiveryChargeSource || loser.delhiveryChargeSource || null,
    delhiveryChargedWeightGrams:
      winner.delhiveryChargedWeightGrams ?? loser.delhiveryChargedWeightGrams ?? null,
    delhiveryLastSyncedAt:
      winner.delhiveryLastSyncedAt || loser.delhiveryLastSyncedAt || null,
    settlementStatus:
      winner.settlementStatus === 'settled' || loser.settlementStatus === 'settled'
        ? 'settled'
        : winner.settlementStatus || loser.settlementStatus || null,
    settledAmount: winner.settledAmount ?? loser.settledAmount ?? null,
    settledAt: winner.settledAt || loser.settledAt || null,
    settlementReference: winner.settlementReference || loser.settlementReference || null,
    pickedUpAt: winner.pickedUpAt || loser.pickedUpAt || null,
    expectedDeliveryAt: winner.expectedDeliveryAt || loser.expectedDeliveryAt || null,
    deliveredAt: resolvedDeliveredAt,
    deliveryAttemptsCount:
      Math.max(winner.deliveryAttemptsCount ?? 0, loser.deliveryAttemptsCount ?? 0) || null,
    lastCourierScanLocation:
      winner.lastCourierScanLocation || loser.lastCourierScanLocation || null,
    lastCourierScanRemark:
      winner.lastCourierScanRemark || loser.lastCourierScanRemark || null,
    lastCourierScanAt: winner.lastCourierScanAt || loser.lastCourierScanAt || null,
    whatsappMessageId: winner.whatsappMessageId || loser.whatsappMessageId || null,
    whatsappTargetJid: winner.whatsappTargetJid || loser.whatsappTargetJid || null,
    pollSentAt: winner.pollSentAt || loser.pollSentAt || null,
    respondedAt: winner.respondedAt || loser.respondedAt || null,
    responseChannel: winner.responseChannel || loser.responseChannel || null,
    events: mergedEvents,
  };
}

function buildOrderSyncStateKey(order: OrderRecord): string {
  return [
    order.pollStatus,
    order.respondedAt || '',
    order.pollSentAt || '',
    order.shopifyTags || '',
    order.fulfillmentStatus || '',
    order.shipmentStatus || '',
    order.shopifyShipmentSyncedAt || '',
    order.deliveredAt || '',
    order.trackingNumber || '',
    order.trackingUrl || '',
    order.trackingSentAt || '',
    order.shopifyCancelledAt || '',
    order.orderNote || '',
    order.settlementStatus || '',
    order.events?.length || 0,
  ].join('|');
}

/**
 * Detects whether an incoming cloud RTDB order list adds new orders OR updates any existing
 * order (e.g. Pending -> Confirmed from WhatsApp poll, or healed Shopify shipment status),
 * even when both lists have the exact same number of orders.
 */
export function hasCloudOrderChanges(
  localOrders: OrderRecord[],
  cloudOrders: OrderRecord[]
): boolean {
  if (cloudOrders.length === 0) return false;
  if (cloudOrders.length > localOrders.length) return true;

  const localByKey = new Map<string, OrderRecord>();
  for (const order of localOrders) {
    localByKey.set(order.id, order);
    if (order.shopifyOrderId) {
      localByKey.set(`shopify:${order.shopifyOrderId}`, order);
    }
  }

  for (const cloudOrder of cloudOrders) {
    const localOrder =
      localByKey.get(cloudOrder.id) ||
      (cloudOrder.shopifyOrderId
        ? localByKey.get(`shopify:${cloudOrder.shopifyOrderId}`)
        : undefined);
    if (!localOrder) return true;

    const merged = mergeProgressedOrderRecords(localOrder, cloudOrder);
    if (buildOrderSyncStateKey(merged) !== buildOrderSyncStateKey(localOrder)) {
      return true;
    }
  }

  return false;
}

/**
 * Builds a compact deterministic fingerprint across ALL orders' live progression states so
 * cloud-to-server restore triggers whenever ANY order changes (not only orders[0]).
 */
export function computeOrdersProgressFingerprint(orders: OrderRecord[]): string {
  if (orders.length === 0) return 'empty';
  let hash = 2166136261;
  const sorted = [...orders].sort((a, b) => a.id.localeCompare(b.id));
  for (const order of sorted) {
    const chunk = `${order.id}=${buildOrderSyncStateKey(order)};`;
    for (let i = 0; i < chunk.length; i += 1) {
      hash ^= chunk.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return `${orders.length}-${(hash >>> 0).toString(36)}`;
}

/**
 * Extracts a clean 6-digit Indian pincode from a shipping zip or delivery summary string.
 */
export function extractCleanIndianPincode(raw?: string | null): string {
  if (!raw) return '';
  const match = raw.match(/\b(\d{6})\b/);
  return match ? match[1] : '';
}

export interface BillableWeightResult {
  deadWeightGrams: number | null;
  volumetricWeightGrams: number | null;
  billableWeightGrams: number | null;
}

/**
 * Computes dead weight, volumetric weight (L * W * H / 5000 in grams),
 * and Delhivery's billable weight = max(deadWeight, volumetricWeight).
 */
export function computeBillableParcelWeightGrams(
  deadWeightGrams?: number | null,
  lengthCm?: number | null,
  widthCm?: number | null,
  heightCm?: number | null
): BillableWeightResult {
  const dead =
    typeof deadWeightGrams === 'number' && Number.isFinite(deadWeightGrams) && deadWeightGrams > 0
      ? Math.round(deadWeightGrams)
      : null;

  const hasDims =
    typeof lengthCm === 'number' &&
    Number.isFinite(lengthCm) &&
    lengthCm > 0 &&
    typeof widthCm === 'number' &&
    Number.isFinite(widthCm) &&
    widthCm > 0 &&
    typeof heightCm === 'number' &&
    Number.isFinite(heightCm) &&
    heightCm > 0;

  const vol = hasDims
    ? Math.round((((lengthCm as number) * (widthCm as number) * (heightCm as number)) / 5000) * 1000)
    : null;

  const billable =
    dead !== null && vol !== null ? Math.max(dead, vol) : dead ?? vol ?? null;

  return {
    deadWeightGrams: dead,
    volumetricWeightGrams: vol,
    billableWeightGrams: billable,
  };
}

/**
 * Splits a Delhivery Kinko invoice response cleanly into GST-inclusive forward freight
 * and GST-inclusive COD fee so shippingCost + codFee === totalAmount without attributing
 * COD GST into freight charges.
 */
export function splitDelhiveryChargeWithGst(
  totalAmount: number,
  grossAmount?: number | null,
  preTaxCodCharge?: number | null
): { totalAmount: number; shippingCost: number; codFee: number } {
  const cleanTotal =
    Number.isFinite(totalAmount) && totalAmount > 0 ? round2(totalAmount) : 0;
  const cleanCodPreTax =
    typeof preTaxCodCharge === 'number' && Number.isFinite(preTaxCodCharge) && preTaxCodCharge > 0
      ? preTaxCodCharge
      : 0;
  const cleanGross =
    typeof grossAmount === 'number' && Number.isFinite(grossAmount) && grossAmount > 0
      ? grossAmount
      : 0;

  if (cleanTotal <= 0) {
    return { totalAmount: 0, shippingCost: 0, codFee: 0 };
  }

  if (cleanCodPreTax <= 0) {
    return { totalAmount: cleanTotal, shippingCost: cleanTotal, codFee: 0 };
  }

  const gstMultiplier =
    cleanGross > 0 && cleanTotal >= cleanGross ? cleanTotal / cleanGross : 1;
  const codFee = Math.min(cleanTotal, round2(cleanCodPreTax * gstMultiplier));
  const shippingCost = round2(Math.max(0, cleanTotal - codFee));

  return {
    totalAmount: cleanTotal,
    shippingCost,
    codFee,
  };
}

/**
 * Extracts the incremental RTO return-leg charge from Delhivery Kinko's `ss=RTO` quote.
 * Delhivery Kinko includes both `charge_DL` (forward) and `charge_RTO` (return) inside
 * `total_amount` when `ss=RTO`, so subtracting the GST-inclusive forward freight avoids
 * double-counting forward shipping in Order P&L.
 */
export function computeIncrementalRtoLegCost(
  rtoTotalAmount: number,
  forwardFreightCost: number,
  includesForwardCharge = true
): number {
  const cleanRtoTotal =
    Number.isFinite(rtoTotalAmount) && rtoTotalAmount > 0 ? round2(rtoTotalAmount) : 0;
  if (cleanRtoTotal <= 0) return 0;
  if (!includesForwardCharge) return cleanRtoTotal;
  const cleanFwd =
    Number.isFinite(forwardFreightCost) && forwardFreightCost > 0
      ? round2(forwardFreightCost)
      : 0;
  const diff = round2(cleanRtoTotal - cleanFwd);
  return diff > 0 ? diff : cleanRtoTotal;
}

export interface UnitEconomicsSimulationInput {
  sellingPrice: number;
  cogsCost: number;
  forwardShipping: number;
  rtoShipping: number;
  packagingCost: number;
  paymentOrCodFee: number;
  adSpendPerOrder: number;
  expectedRtoPercent: number;
}

export interface UnitEconomicsSimulationResult {
  profitIfDelivered: number;
  lossIfRto: number;
  blendedProfitPerOrder: number;
  marginPercent: number;
  maxCpaBreakeven: number;
  breakevenRtoPercent: number;
}

/**
 * Interactive single-order / blended-RTO profit & breakeven calculator for unit-economics planning.
 */
export function calculateUnitEconomicsSimulation(
  input: UnitEconomicsSimulationInput
): UnitEconomicsSimulationResult {
  const sp = Math.max(0, Number(input.sellingPrice) || 0);
  const cogs = Math.max(0, Number(input.cogsCost) || 0);
  const fwd = Math.max(0, Number(input.forwardShipping) || 0);
  const rto = Math.max(0, Number(input.rtoShipping) || 0);
  const pack = Math.max(0, Number(input.packagingCost) || 0);
  const fee = Math.max(0, Number(input.paymentOrCodFee) || 0);
  const ads = Math.max(0, Number(input.adSpendPerOrder) || 0);
  const rtoRate = Math.max(0, Math.min(100, Number(input.expectedRtoPercent) || 0)) / 100;

  const profitIfDelivered = round2(sp - (cogs + fwd + pack + fee + ads));
  const lossIfRto = round2(-(fwd + rto + pack + ads));
  const blendedProfitPerOrder = round2(
    (1 - rtoRate) * profitIfDelivered + rtoRate * lossIfRto
  );
  const marginPercent = sp > 0 ? Math.round((blendedProfitPerOrder * 100) / sp) : 0;

  // Max ad spend per shipped order before blended profit crosses below 0
  const preAdProfitIfDelv = sp - (cogs + fwd + pack + fee);
  const preAdLossIfRto = -(fwd + rto + pack);
  const maxCpaBreakeven = round2(
    Math.max(0, (1 - rtoRate) * preAdProfitIfDelv + rtoRate * preAdLossIfRto)
  );

  // Solve (1 - r) * profitIfDelivered + r * lossIfRto = 0 -> r = profitIfDelivered / (profitIfDelivered - lossIfRto)
  let breakevenRtoPercent = 0;
  const spread = profitIfDelivered - lossIfRto;
  if (profitIfDelivered > 0 && spread > 0) {
    breakevenRtoPercent = Math.min(
      100,
      Math.max(0, Math.round((profitIfDelivered / spread) * 1000) / 10)
    );
  }

  return {
    profitIfDelivered,
    lossIfRto,
    blendedProfitPerOrder,
    marginPercent,
    maxCpaBreakeven,
    breakevenRtoPercent,
  };
}

export type PnlOutcomeCategory =
  | 'delivered'
  | 'in_transit'
  | 'ready_or_pending'
  | 'rto_return'
  | 'cancelled';

export interface OrderPnlBreakdown {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  dateKey: string;
  dateLabel: string;
  customerName: string;
  paymentMethod: string;
  currency: string;
  outcome: PnlOutcomeCategory;
  outcomeLabel: string;
  orderValue: number;
  realizedRevenue: number;
  expectedRevenue: number;
  cogsCost: number;
  packagingCost: number;
  forwardShippingCost: number;
  rtoShippingCost: number;
  paymentOrCodFee: number;
  marketingCost: number;
  totalCost: number;
  netProfit: number;
  chargeSource: 'delhivery_api' | 'delhivery_wallet' | 'estimated' | 'none';
  chargedWeightGrams?: number | null;
}

export interface DailyPnlRow {
  dateKey: string;
  dateLabel: string;
  totalOrders: number;
  deliveredOrders: number;
  inTransitOrders: number;
  rtoOrders: number;
  cancelledOrders: number;
  realizedRevenue: number;
  expectedTransitRevenue: number;
  metaAdsCost?: number;
  totalCosts: number;
  rtoLoss: number;
  netRealizedProfit: number;
  projectedNetProfit: number;
}

export interface ProfitLossReportSummary {
  currency: string;
  totalOrders: number;
  deliveredCount: number;
  inTransitCount: number;
  readyOrPendingCount: number;
  rtoCount: number;
  cancelledCount: number;
  delhiverySyncedCount: number;
  grossOrderValue: number;
  realizedRevenue: number;
  inTransitExpectedRevenue: number;
  totalCogs: number;
  totalPackagingCost: number;
  totalForwardShipping: number;
  totalRtoForwardShipping: number;
  totalRtoShippingCost: number;
  totalRtoPackagingCost: number;
  totalRtoLoss: number;
  totalPaymentFees: number;
  totalMarketingCost: number;
  dailyMetaAdsRate: number;
  metaAdDaysCount: number;
  totalDailyMetaAds: number;
  metaAdsBreakdownLabel: string;
  totalRealizedCosts: number;
  netRealizedProfit: number;
  projectedTransitProfit: number;
  projectedNetProfit: number;
  netMarginPct: number;
  avgProfitPerDelivered: number;
  whatsappRtoSavings: number;
  dailyPnlRows: DailyPnlRow[];
  orderRows: OrderPnlBreakdown[];
}

export type CostAssumptions = Pick<
  AppSettings,
  | 'cogsPercent'
  | 'packagingCostPerOrder'
  | 'fallbackForwardShippingCost'
  | 'fallbackRtoShippingCost'
  | 'fallbackCodFee'
  | 'prepaidGatewayPercent'
  | 'marketingCostPerOrder'
  | 'dailyMetaAdsSpend'
  | 'metaAdsRateHistory'
>;

/**
 * Normalizes, deduplicates by date, and sorts Meta Ads rate history entries chronologically.
 */
export function normalizeMetaAdsRateHistory(
  entries?: MetaAdsRateEntry[] | null
): MetaAdsRateEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const byDate = new Map<string, number>();
  for (const entry of entries) {
    if (!entry || typeof entry.effectiveFrom !== 'string') continue;
    const cleanDate = entry.effectiveFrom.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) continue;
    const spend = Number(entry.dailySpend);
    if (!Number.isFinite(spend) || spend < 0) continue;
    byDate.set(cleanDate, Math.round(spend * 100) / 100);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([effectiveFrom, dailySpend]) => ({ effectiveFrom, dailySpend }));
}

/**
 * Resolves the active daily Meta Ads spend for a given IST calendar date (YYYY-MM-DD),
 * supporting historical stepped budgets (e.g. ₹500 -> ₹900 -> ₹1500 from 2026-11-19).
 */
export function resolveDailyMetaAdsRateForDate(
  dateKey: string,
  costSettings: Pick<CostAssumptions, 'dailyMetaAdsSpend' | 'metaAdsRateHistory'>
): number {
  const fallbackRate = Math.max(0, Number(costSettings.dailyMetaAdsSpend) || 0);
  const history = normalizeMetaAdsRateHistory(costSettings.metaAdsRateHistory);
  if (history.length === 0) return fallbackRate;

  const cleanDate = (dateKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return history[history.length - 1]?.dailySpend ?? fallbackRate;
  }

  let matched: number | null = null;
  for (const tier of history) {
    if (tier.effectiveFrom <= cleanDate) {
      matched = tier.dailySpend;
    } else {
      break;
    }
  }
  return matched !== null ? matched : history[0].dailySpend;
}

/**
 * Returns every IST calendar date (YYYY-MM-DD) inside the active Meta Ads billing window.
 */
export function computeMetaAdDateKeysInRange(params: {
  orders: OrderRecord[];
  fromDate?: string;
  toDate?: string;
  syncStartDate?: string;
  todayIst?: string;
}): string[] {
  const today = params.todayIst || getIstDateKey(new Date()) || '2026-11-19';
  const from = (params.fromDate || '').trim();
  const to = (params.toDate || '').trim();
  const syncStart = (params.syncStartDate || '').trim();

  if (from && to && from === to) return [from];

  const orderDates = params.orders
    .map((o) => getIstDateKey(o.createdAt))
    .filter((d): d is string => Boolean(d))
    .sort();
  const earliestOrder = orderDates[0] || '';
  const latestOrder = orderDates[orderDates.length - 1] || '';

  let effStart = from || earliestOrder || syncStart || today;
  let effEnd = to || (latestOrder && latestOrder > today ? latestOrder : today);

  if (from && from <= today && effEnd > today) {
    effEnd = today;
  }

  if (
    syncStart &&
    syncStart > effStart &&
    syncStart <= effEnd &&
    (!earliestOrder || earliestOrder >= syncStart)
  ) {
    effStart = syncStart;
  }

  const startMs = Date.parse(`${effStart}T00:00:00+05:30`);
  const endMs = Date.parse(`${effEnd}T00:00:00+05:30`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    const uniqueOrderDates = Array.from(new Set(orderDates)).sort();
    return uniqueOrderDates.length > 0 ? uniqueOrderDates : [today];
  }

  const dayCount = Math.min(366, Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1));
  const keys: string[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const key = getIstDateKey(new Date(startMs + i * 86_400_000));
    if (key) keys.push(key);
  }
  return keys.length > 0 ? keys : [today];
}

/**
 * Calculates how many active Meta Ads billing days fall inside the selected date filter,
 * capping future dates at Today (IST) and clipping prior to store syncStartDate when applicable.
 */
export function computeMetaAdDaysInRange(params: {
  orders: OrderRecord[];
  fromDate?: string;
  toDate?: string;
  syncStartDate?: string;
  todayIst?: string;
}): number {
  return computeMetaAdDateKeysInRange(params).length;
}

function formatMetaAdsBreakdownLabel(
  tierSegments: Array<{ days: number; rate: number }>,
  currency = 'INR'
): string {
  const prefix = currency === 'INR' ? '₹' : `${currency} `;
  const nonZero = tierSegments.filter((s) => s.days > 0 && s.rate > 0);
  if (nonZero.length === 0) return '';
  return nonZero
    .map((s) => `${s.days}d×${prefix}${Math.round(s.rate).toLocaleString('en-IN')}`)
    .join(' + ');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isCodPaymentMethod(order: Pick<OrderRecord, 'paymentMethod' | 'financialStatus'>): boolean {
  const pm = (order.paymentMethod || '').trim().toLowerCase();
  if (pm.includes('cod') || pm.includes('cash')) return true;
  if (pm.includes('prepaid') || pm.includes('paid')) return false;
  return (order.financialStatus || '').trim().toLowerCase() === 'pending';
}

/**
 * Calculates per-order unit economics & net Profit/Loss using synced Delhivery One charges
 * when available, falling back cleanly to the configured shipping/COGS/packaging/COD rules.
 */
export function calculateOrderPnl(
  order: OrderRecord,
  costSettings: CostAssumptions
): OrderPnlBreakdown {
  const parsedVal = Number.parseFloat(order.totalPrice || '0');
  const orderValue = Number.isFinite(parsedVal) && parsedVal > 0 ? round2(parsedVal) : 0;
  const dateKey = getIstDateKey(order.createdAt) || 'Unknown';
  const dateLabel = dateKey === 'Unknown' ? 'Unknown' : formatIstDateDisplay(dateKey);
  const isCod = isCodPaymentMethod(order);

  const cogsPct = Math.max(0, Math.min(100, Number(costSettings.cogsPercent) || 0));
  const packCost = Math.max(0, Number(costSettings.packagingCostPerOrder) || 0);
  const fwdShipping =
    typeof order.delhiveryShippingCost === 'number' &&
    Number.isFinite(order.delhiveryShippingCost) &&
    order.delhiveryShippingCost > 0
      ? order.delhiveryShippingCost
      : Math.max(0, Number(costSettings.fallbackForwardShippingCost) || 0);
  const rtoReturnLeg =
    typeof order.delhiveryRtoCost === 'number' &&
    Number.isFinite(order.delhiveryRtoCost) &&
    order.delhiveryRtoCost > 0
      ? order.delhiveryRtoCost
      : Math.max(0, Number(costSettings.fallbackRtoShippingCost) || 0);
  const codFee = isCod
    ? typeof order.delhiveryCodFee === 'number' && Number.isFinite(order.delhiveryCodFee)
      ? Math.max(0, order.delhiveryCodFee)
      : Math.max(0, Number(costSettings.fallbackCodFee) || 0)
    : 0;
  const pgFee = !isCod
    ? round2((orderValue * Math.max(0, Number(costSettings.prepaidGatewayPercent) || 0)) / 100)
    : 0;
  const marketingCost = Math.max(0, Number(costSettings.marketingCostPerOrder) || 0);

  const source: 'delhivery_api' | 'delhivery_wallet' | 'estimated' =
    order.delhiveryChargeSource === 'delhivery_wallet'
      ? 'delhivery_wallet'
      : order.delhiveryChargeSource === 'delhivery_api'
        ? 'delhivery_api'
        : 'estimated';
  const chargedWeightGrams =
    order.delhiveryChargedWeightGrams ?? order.orderWeightGrams ?? null;

  if (order.pollStatus === 'cancelled_by_user') {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      dateKey,
      dateLabel,
      customerName: order.customerName,
      paymentMethod: isCod ? 'COD' : 'Prepaid',
      currency: order.currency || 'INR',
      outcome: 'cancelled',
      outcomeLabel: 'Cancelled',
      orderValue,
      realizedRevenue: 0,
      expectedRevenue: 0,
      cogsCost: 0,
      packagingCost: 0,
      forwardShippingCost: 0,
      rtoShippingCost: 0,
      paymentOrCodFee: 0,
      marketingCost: 0,
      totalCost: 0,
      netProfit: 0,
      chargeSource: 'none',
    };
  }

  if (isOrderRtoReturn(order)) {
    const totalCost = round2(fwdShipping + rtoReturnLeg + packCost + marketingCost);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      dateKey,
      dateLabel,
      customerName: order.customerName,
      paymentMethod: isCod ? 'COD' : 'Prepaid',
      currency: order.currency || 'INR',
      outcome: 'rto_return',
      outcomeLabel: 'RTO Return',
      orderValue,
      realizedRevenue: 0,
      expectedRevenue: 0,
      cogsCost: 0,
      packagingCost: round2(packCost),
      forwardShippingCost: round2(fwdShipping),
      rtoShippingCost: round2(rtoReturnLeg),
      paymentOrCodFee: 0,
      marketingCost: round2(marketingCost),
      totalCost,
      netProfit: round2(-totalCost),
      chargeSource: source,
      chargedWeightGrams,
    };
  }

  if (isOrderDelivered(order)) {
    const cogsCost = round2((orderValue * cogsPct) / 100);
    const paymentOrCodFee = round2(isCod ? codFee : pgFee);
    const totalCost = round2(cogsCost + packCost + fwdShipping + paymentOrCodFee + marketingCost);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      dateKey,
      dateLabel,
      customerName: order.customerName,
      paymentMethod: isCod ? 'COD' : 'Prepaid',
      currency: order.currency || 'INR',
      outcome: 'delivered',
      outcomeLabel: 'Delivered',
      orderValue,
      realizedRevenue: orderValue,
      expectedRevenue: orderValue,
      cogsCost,
      packagingCost: round2(packCost),
      forwardShippingCost: round2(fwdShipping),
      rtoShippingCost: 0,
      paymentOrCodFee,
      marketingCost: round2(marketingCost),
      totalCost,
      netProfit: round2(orderValue - totalCost),
      chargeSource: source,
      chargedWeightGrams,
    };
  }

  // Orders fulfilled / tracking added / in transit (not yet delivered or RTO)
  const dispatched = isOrderDispatched(order) || isOrderInTransit(order) || isOrderTrackingAdded(order);
  if (dispatched) {
    const cogsCost = round2((orderValue * cogsPct) / 100);
    const paymentOrCodFee = round2(isCod ? codFee : pgFee);
    const totalCost = round2(cogsCost + packCost + fwdShipping + paymentOrCodFee + marketingCost);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      dateKey,
      dateLabel,
      customerName: order.customerName,
      paymentMethod: isCod ? 'COD' : 'Prepaid',
      currency: order.currency || 'INR',
      outcome: 'in_transit',
      outcomeLabel: isOrderInTransit(order) ? 'In Transit' : 'Tracking Added',
      orderValue,
      realizedRevenue: 0,
      expectedRevenue: orderValue,
      cogsCost,
      packagingCost: round2(packCost),
      forwardShippingCost: round2(fwdShipping),
      rtoShippingCost: 0,
      paymentOrCodFee,
      marketingCost: round2(marketingCost),
      totalCost,
      netProfit: round2(orderValue - totalCost),
      chargeSource: source,
      chargedWeightGrams,
    };
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    dateKey,
    dateLabel,
    customerName: order.customerName,
    paymentMethod: isCod ? 'COD' : 'Prepaid',
    currency: order.currency || 'INR',
    outcome: 'ready_or_pending',
    outcomeLabel: order.pollStatus === 'confirmed' ? 'Ready to Dispatch' : 'Awaiting Confirm',
    orderValue,
    realizedRevenue: 0,
    expectedRevenue: 0,
    cogsCost: 0,
    packagingCost: 0,
    forwardShippingCost: 0,
    rtoShippingCost: 0,
    paymentOrCodFee: 0,
    marketingCost: 0,
    totalCost: 0,
    netProfit: 0,
    chargeSource: 'none',
  };
}

/**
 * Aggregates Profit & Loss totals, daily breakdown rows, and WhatsApp RTO savings
 * across the given orders and cost settings.
 */
export function buildProfitLossReport(
  orders: OrderRecord[],
  costSettings: CostAssumptions,
  periodAdSpendExtra = 0,
  adDaysOverride?: number,
  metaAdDateKeys?: string[]
): ProfitLossReportSummary {
  const extraAds = Math.max(0, Number(periodAdSpendExtra) || 0);
  const normalizedHistory = normalizeMetaAdsRateHistory(costSettings.metaAdsRateHistory);
  const dailyMetaAdsRate =
    normalizedHistory.length > 0
      ? normalizedHistory[normalizedHistory.length - 1].dailySpend
      : Math.max(0, Number(costSettings.dailyMetaAdsSpend) || 0);
  const orderRows = orders.map((o) => calculateOrderPnl(o, costSettings));

  let currency = 'INR';
  let deliveredCount = 0;
  let inTransitCount = 0;
  let readyOrPendingCount = 0;
  let rtoCount = 0;
  let cancelledCount = 0;
  let delhiverySyncedCount = 0;

  let grossOrderValue = 0;
  let realizedRevenue = 0;
  let inTransitExpectedRevenue = 0;

  let totalCogs = 0;
  let totalPackagingCost = 0;
  let totalForwardShipping = 0;
  let totalRtoForwardShipping = 0;
  let totalRtoShippingCost = 0;
  let totalRtoPackagingCost = 0;
  let totalRtoLoss = 0;
  let totalPaymentFees = 0;
  let totalMarketingCost = 0;
  let projectedTransitProfit = 0;

  const dailyMap = new Map<string, DailyPnlRow>();

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];
    const row = orderRows[i];
    if (order.currency) currency = order.currency;
    if (
      order.delhiveryChargeSource === 'delhivery_api' ||
      order.delhiveryChargeSource === 'delhivery_wallet'
    ) {
      delhiverySyncedCount += 1;
    }

    grossOrderValue += row.orderValue;

    let day = dailyMap.get(row.dateKey);
    if (!day) {
      day = {
        dateKey: row.dateKey,
        dateLabel: row.dateLabel,
        totalOrders: 0,
        deliveredOrders: 0,
        inTransitOrders: 0,
        rtoOrders: 0,
        cancelledOrders: 0,
        realizedRevenue: 0,
        expectedTransitRevenue: 0,
        metaAdsCost: 0,
        totalCosts: 0,
        rtoLoss: 0,
        netRealizedProfit: 0,
        projectedNetProfit: 0,
      };
      dailyMap.set(row.dateKey, day);
    }

    day.totalOrders += 1;

    if (row.outcome === 'delivered') {
      deliveredCount += 1;
      realizedRevenue += row.realizedRevenue;
      totalCogs += row.cogsCost;
      totalPackagingCost += row.packagingCost;
      totalForwardShipping += row.forwardShippingCost;
      totalPaymentFees += row.paymentOrCodFee;
      totalMarketingCost += row.marketingCost;

      day.deliveredOrders += 1;
      day.realizedRevenue += row.realizedRevenue;
      day.totalCosts += row.totalCost;
      day.netRealizedProfit += row.netProfit;
      day.projectedNetProfit += row.netProfit;
    } else if (row.outcome === 'rto_return') {
      rtoCount += 1;
      totalPackagingCost += row.packagingCost;
      totalForwardShipping += row.forwardShippingCost;
      totalRtoForwardShipping += row.forwardShippingCost;
      totalRtoShippingCost += row.rtoShippingCost;
      totalRtoPackagingCost += row.packagingCost;
      totalMarketingCost += row.marketingCost;
      totalRtoLoss += row.totalCost;

      day.rtoOrders += 1;
      day.totalCosts += row.totalCost;
      day.rtoLoss += row.totalCost;
      day.netRealizedProfit += row.netProfit; // negative
      day.projectedNetProfit += row.netProfit;
    } else if (row.outcome === 'in_transit') {
      inTransitCount += 1;
      inTransitExpectedRevenue += row.expectedRevenue;
      projectedTransitProfit += row.netProfit;

      day.inTransitOrders += 1;
      day.expectedTransitRevenue += row.expectedRevenue;
      day.projectedNetProfit += row.netProfit;
    } else if (row.outcome === 'cancelled') {
      cancelledCount += 1;
      day.cancelledOrders += 1;
    } else {
      readyOrPendingCount += 1;
    }
  }

  // Deduct each active day's date-effective Daily Meta Ads spend from its Daily P&L row
  for (const day of dailyMap.values()) {
    const dayRate = resolveDailyMetaAdsRateForDate(day.dateKey, costSettings);
    day.metaAdsCost = round2(dayRate);
    if (dayRate > 0) {
      day.totalCosts += dayRate;
      day.netRealizedProfit -= dayRate;
      day.projectedNetProfit -= dayRate;
    }
  }

  // Compute total Daily Meta Ads across the active billing window using exact date-wise rates
  const cleanDateKeys = Array.isArray(metaAdDateKeys)
    ? Array.from(new Set(metaAdDateKeys.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort()
    : [];
  const hasExplicitOverride =
    typeof adDaysOverride === 'number' && Number.isFinite(adDaysOverride) && adDaysOverride >= 0;

  let metaAdDaysCount = 0;
  let totalDailyMetaAds = 0;
  const tierSegments: Array<{ days: number; rate: number }> = [];

  const accumulateDateKeys = (keys: string[]) => {
    for (const dKey of keys) {
      const rate = resolveDailyMetaAdsRateForDate(dKey, costSettings);
      totalDailyMetaAds += rate;
      const last = tierSegments[tierSegments.length - 1];
      if (last && last.rate === rate) {
        last.days += 1;
      } else {
        tierSegments.push({ days: 1, rate });
      }
    }
    metaAdDaysCount = keys.length;
  };

  if (cleanDateKeys.length > 0 && (!hasExplicitOverride || Math.round(adDaysOverride!) === cleanDateKeys.length)) {
    accumulateDateKeys(cleanDateKeys);
  } else if (hasExplicitOverride) {
    const targetDays = Math.round(adDaysOverride!);
    if (cleanDateKeys.length > 0 && targetDays <= cleanDateKeys.length && targetDays > 0) {
      accumulateDateKeys(cleanDateKeys.slice(cleanDateKeys.length - targetDays));
    } else if (cleanDateKeys.length > 0 && targetDays > cleanDateKeys.length) {
      accumulateDateKeys(cleanDateKeys);
      const extraDays = targetDays - cleanDateKeys.length;
      totalDailyMetaAds += extraDays * dailyMetaAdsRate;
      const last = tierSegments[tierSegments.length - 1];
      if (last && last.rate === dailyMetaAdsRate) {
        last.days += extraDays;
      } else {
        tierSegments.push({ days: extraDays, rate: dailyMetaAdsRate });
      }
      metaAdDaysCount = targetDays;
    } else {
      metaAdDaysCount = targetDays;
      totalDailyMetaAds = dailyMetaAdsRate * targetDays;
      if (targetDays > 0 && dailyMetaAdsRate > 0) {
        tierSegments.push({ days: targetDays, rate: dailyMetaAdsRate });
      }
    }
  } else {
    const mapKeys = Array.from(dailyMap.keys()).sort();
    accumulateDateKeys(mapKeys);
  }

  totalDailyMetaAds = round2(totalDailyMetaAds);
  const metaAdsBreakdownLabel = formatMetaAdsBreakdownLabel(tierSegments, currency);

  const totalRealizedCosts = round2(
    totalCogs +
      totalPackagingCost +
      totalForwardShipping +
      totalRtoShippingCost +
      totalPaymentFees +
      totalMarketingCost +
      totalDailyMetaAds +
      extraAds
  );

  const netRealizedProfit = round2(realizedRevenue - totalRealizedCosts);
  const projectedNetProfit = round2(netRealizedProfit + projectedTransitProfit);
  const netMarginPct =
    realizedRevenue > 0 ? Math.round((netRealizedProfit / realizedRevenue) * 100) : 0;
  const avgProfitPerDelivered =
    deliveredCount > 0 ? round2(netRealizedProfit / deliveredCount) : 0;

  const perOrderPreventedLoss =
    Math.max(0, Number(costSettings.fallbackForwardShippingCost) || 0) +
    Math.max(0, Number(costSettings.fallbackRtoShippingCost) || 0) +
    Math.max(0, Number(costSettings.packagingCostPerOrder) || 0);
  const whatsappRtoSavings = round2(cancelledCount * perOrderPreventedLoss);

  const dailyPnlRows = Array.from(dailyMap.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((d) => ({
      ...d,
      realizedRevenue: round2(d.realizedRevenue),
      expectedTransitRevenue: round2(d.expectedTransitRevenue),
      metaAdsCost: round2(d.metaAdsCost || 0),
      totalCosts: round2(d.totalCosts),
      rtoLoss: round2(d.rtoLoss),
      netRealizedProfit: round2(d.netRealizedProfit),
      projectedNetProfit: round2(d.projectedNetProfit),
    }));

  return {
    currency,
    totalOrders: orders.length,
    deliveredCount,
    inTransitCount,
    readyOrPendingCount,
    rtoCount,
    cancelledCount,
    delhiverySyncedCount,
    grossOrderValue: round2(grossOrderValue),
    realizedRevenue: round2(realizedRevenue),
    inTransitExpectedRevenue: round2(inTransitExpectedRevenue),
    totalCogs: round2(totalCogs),
    totalPackagingCost: round2(totalPackagingCost),
    totalForwardShipping: round2(totalForwardShipping),
    totalRtoForwardShipping: round2(totalRtoForwardShipping),
    totalRtoShippingCost: round2(totalRtoShippingCost),
    totalRtoPackagingCost: round2(totalRtoPackagingCost),
    totalRtoLoss: round2(totalRtoLoss),
    totalPaymentFees: round2(totalPaymentFees),
    totalMarketingCost: round2(totalMarketingCost + totalDailyMetaAds + extraAds),
    dailyMetaAdsRate,
    metaAdDaysCount,
    totalDailyMetaAds,
    metaAdsBreakdownLabel,
    totalRealizedCosts,
    netRealizedProfit,
    projectedTransitProfit: round2(projectedTransitProfit),
    projectedNetProfit,
    netMarginPct,
    avgProfitPerDelivered,
    whatsappRtoSavings,
    dailyPnlRows,
    orderRows,
  };
}

export interface ParsedDelhiveryLedgerEntry {
  awb: string;
  orderNumber: string;
  forwardShippingCost: number;
  rtoShippingCost: number;
  codFee: number;
  utrNumber?: string;
  remittedAmount?: number;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseNumericCharge(raw?: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]|INR|Rs\.?/gi, '').trim();
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

/**
 * Parses a Delhivery One Wallet / Passbook / Invoice / COD Remittance CSV export
 * into per-AWB or per-Order actual billed charges and optional UTR COD remittance payouts.
 */
export function parseDelhiveryBillingCsv(csvText: string): ParsedDelhiveryLedgerEntry[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const findCol = (patterns: RegExp[]): number =>
    headers.findIndex((h) => patterns.some((p) => p.test(h)));

  const awbCol = findCol([/^awb/, /waybill/, /tracking/]);
  const orderCol = findCol([/order.?id/, /order.?num/, /reference/, /ref.?no/]);
  const fwdCol = findCol([/forward/, /freight/, /shipping.?charge/, /dl.?charge/, /base.?charge/]);
  const rtoCol = findCol([/^rto/, /rto.?charge/, /return.?charge/]);
  const codCol = findCol([/^cod.?charge/, /cod.?fee/]);
  const totalCol = findCol([/total.?amount/, /total.?charge/, /^debit$/, /^amount$/, /^charge$/, /billed/]);
  const typeCol = findCol([/transaction.?type/, /charge.?type/, /^type$/, /description/, /remarks/, /status/]);
  const utrCol = findCol([/\butr\b/, /remittance.?id/, /bank.?ref/, /settlement.?ref/]);
  const remitCol = findCol([
    /remit.*amount/,
    /remitted/,
    /cod.?collected/,
    /cod.?amount/,
    /cod.?value/,
    /payout/,
    /settled.?amount/,
  ]);

  if (awbCol === -1 && orderCol === -1) return [];

  const map = new Map<string, ParsedDelhiveryLedgerEntry>();

  for (let i = 1; i < lines.length; i += 1) {
    const row = splitCsvLine(lines[i]);
    const awb = awbCol >= 0 ? (row[awbCol] || '').trim() : '';
    const orderNumber = orderCol >= 0 ? (row[orderCol] || '').trim() : '';
    if (!awb && !orderNumber) continue;

    const key = awb ? `awb:${awb}` : `ord:${orderNumber.replace(/^#/, '')}`;
    const existing = map.get(key) || {
      awb,
      orderNumber,
      forwardShippingCost: 0,
      rtoShippingCost: 0,
      codFee: 0,
    };

    const fwd = fwdCol >= 0 ? parseNumericCharge(row[fwdCol]) : 0;
    const rto = rtoCol >= 0 ? parseNumericCharge(row[rtoCol]) : 0;
    const cod = codCol >= 0 ? parseNumericCharge(row[codCol]) : 0;
    const total = totalCol >= 0 ? parseNumericCharge(row[totalCol]) : 0;
    const txType = (typeCol >= 0 ? row[typeCol] || '' : '').toLowerCase();
    const utr = utrCol >= 0 ? (row[utrCol] || '').trim() : '';
    const remittedAmt = remitCol >= 0 ? parseNumericCharge(row[remitCol]) : 0;

    if (utr || remittedAmt > 0 || txType.includes('remit')) {
      if (utr) existing.utrNumber = utr;
      if (remittedAmt > 0) {
        existing.remittedAmount = round2((existing.remittedAmount || 0) + remittedAmt);
      } else if (total > 0 && txType.includes('remit')) {
        existing.remittedAmount = round2((existing.remittedAmount || 0) + total);
      }
    }

    if (fwd > 0 || rto > 0 || cod > 0) {
      existing.forwardShippingCost = round2(existing.forwardShippingCost + fwd);
      existing.rtoShippingCost = round2(existing.rtoShippingCost + rto);
      existing.codFee = round2(existing.codFee + cod);
    } else if (total > 0 && !txType.includes('remit')) {
      if (txType.includes('refund') || txType.includes('credit') || txType.includes('recharge')) {
        // Skip wallet top-ups if no UTR attached
      } else if (txType.includes('rto') || txType.includes('return')) {
        existing.rtoShippingCost = round2(existing.rtoShippingCost + total);
      } else if (txType.includes('cod')) {
        existing.codFee = round2(existing.codFee + total);
      } else {
        existing.forwardShippingCost = round2(existing.forwardShippingCost + total);
      }
    }

    if (
      existing.forwardShippingCost > 0 ||
      existing.rtoShippingCost > 0 ||
      existing.codFee > 0 ||
      existing.utrNumber ||
      (existing.remittedAmount ?? 0) > 0
    ) {
      map.set(key, existing);
    }
  }

  return Array.from(map.values());
}

export type OrderSettlementCategory =
  | 'settled'
  | 'pending_remittance'
  | 'in_transit'
  | 'no_payout'
  | 'unshipped';

export interface OrderSettlementInfo {
  status: OrderSettlementCategory;
  label: string;
  paymentMode: 'COD' | 'Prepaid';
  orderValue: number;
  settledAmount: number;
  pendingAmount: number;
  daysSinceDelivery: number | null;
  reference: string;
  settledAt: string | null;
}

/**
 * Classifies each order's cashflow / bank settlement state (Prepaid paid vs COD pending remittance vs Settled).
 */
export function getOrderSettlementInfo(
  order: OrderRecord,
  nowMs = Date.now()
): OrderSettlementInfo {
  const parsed = Number.parseFloat(order.totalPrice || '0');
  const orderValue = Number.isFinite(parsed) && parsed > 0 ? round2(parsed) : 0;
  const isCod = isCodPaymentMethod(order);
  const paymentMode: 'COD' | 'Prepaid' = isCod ? 'COD' : 'Prepaid';

  if (order.pollStatus === 'cancelled_by_user' || isOrderRtoReturn(order)) {
    return {
      status: 'no_payout',
      label: isOrderRtoReturn(order) ? 'RTO (No Payout)' : 'Cancelled (₹0)',
      paymentMode,
      orderValue,
      settledAmount: 0,
      pendingAmount: 0,
      daysSinceDelivery: null,
      reference: order.settlementReference || '',
      settledAt: null,
    };
  }

  const delivered = isOrderDelivered(order);
  const deliveryRefIso = order.deliveredAt || order.lastCourierScanAt || order.respondedAt;
  const deliveryMs = deliveryRefIso ? Date.parse(deliveryRefIso) : Number.NaN;
  const daysSinceDelivery =
    delivered && Number.isFinite(deliveryMs) && nowMs >= deliveryMs
      ? Math.max(0, Math.floor((nowMs - deliveryMs) / 86_400_000))
      : null;

  if (order.settlementStatus === 'settled') {
    const settledAmt =
      typeof order.settledAmount === 'number' && Number.isFinite(order.settledAmount)
        ? round2(order.settledAmount)
        : orderValue;
    return {
      status: 'settled',
      label: isCod ? 'COD Settled (Bank)' : 'Prepaid Settled',
      paymentMode,
      orderValue,
      settledAmount: settledAmt,
      pendingAmount: 0,
      daysSinceDelivery,
      reference: order.settlementReference || '',
      settledAt: order.settledAt || null,
    };
  }

  if (!isCod && (order.financialStatus === 'paid' || delivered)) {
    return {
      status: 'settled',
      label: 'Prepaid Paid',
      paymentMode,
      orderValue,
      settledAmount: orderValue,
      pendingAmount: 0,
      daysSinceDelivery,
      reference: order.settlementReference || 'Shopify Prepaid',
      settledAt: order.createdAt,
    };
  }

  if (isCod && delivered) {
    return {
      status: 'pending_remittance',
      label: 'COD Pending Remittance',
      paymentMode,
      orderValue,
      settledAmount: 0,
      pendingAmount: orderValue,
      daysSinceDelivery,
      reference: '',
      settledAt: null,
    };
  }

  if (isOrderInTransit(order) || isOrderTrackingAdded(order) || isOrderDispatched(order)) {
    return {
      status: 'in_transit',
      label: isCod ? 'COD In Transit' : 'Prepaid In Transit',
      paymentMode,
      orderValue,
      settledAmount: 0,
      pendingAmount: 0,
      daysSinceDelivery: null,
      reference: '',
      settledAt: null,
    };
  }

  return {
    status: 'unshipped',
    label: 'Awaiting Dispatch',
    paymentMode,
    orderValue,
    settledAmount: 0,
    pendingAmount: 0,
    daysSinceDelivery: null,
    reference: '',
    settledAt: null,
  };
}

export type DeliveryDelayState =
  | 'delivered_on_time'
  | 'delivered_late'
  | 'ndr_attempt'
  | 'transit_delayed'
  | 'pickup_delayed'
  | 'on_time'
  | 'rto_return'
  | 'unshipped';

export interface OrderDeliveryDelayInfo {
  state: DeliveryDelayState;
  isActiveDelay: boolean;
  isDelayedAny: boolean;
  label: string;
  reason: string;
  transitDays: number | null;
  hoursSinceTracking: number | null;
}

/**
 * Evaluates courier SLA, pickup lag, Delhivery Expected Delivery Date breaches, and NDR attempts.
 */
export function getOrderDeliveryDelayInfo(
  order: OrderRecord,
  settings: Pick<AppSettings, 'deliverySlaDays' | 'pickupSlaHours'>,
  nowMs = Date.now()
): OrderDeliveryDelayInfo {
  const slaDays = Math.max(1, Number(settings.deliverySlaDays) || 4);
  const pickupSlaHours = Math.max(12, Number(settings.pickupSlaHours) || 48);

  if (isOrderRtoReturn(order)) {
    return {
      state: 'rto_return',
      isActiveDelay: false,
      isDelayedAny: false,
      label: 'RTO Returned',
      reason: order.lastCourierScanRemark || 'Returned to origin',
      transitDays: null,
      hoursSinceTracking: null,
    };
  }

  if (order.pollStatus === 'cancelled_by_user') {
    return {
      state: 'unshipped',
      isActiveDelay: false,
      isDelayedAny: false,
      label: 'Cancelled',
      reason: 'Cancelled before shipping',
      transitDays: null,
      hoursSinceTracking: null,
    };
  }

  const startIso =
    order.pickedUpAt || order.fulfilledAt || order.trackingSentAt || order.respondedAt || order.createdAt;
  const startMs = Date.parse(startIso);
  const validStart = Number.isFinite(startMs);
  const eddMs = order.expectedDeliveryAt ? Date.parse(order.expectedDeliveryAt) : Number.NaN;

  if (isOrderDelivered(order)) {
    const endIso = order.deliveredAt || order.lastCourierScanAt || order.respondedAt || order.createdAt;
    const endMs = Date.parse(endIso);
    const transitDays =
      validStart && Number.isFinite(endMs) && endMs >= startMs
        ? Math.max(0, Math.round(((endMs - startMs) / 86_400_000) * 10) / 10)
        : null;
    const breachedEdd = Number.isFinite(eddMs) && Number.isFinite(endMs) && endMs > eddMs;
    const breachedSla = transitDays !== null && transitDays > slaDays;
    const late = breachedEdd || breachedSla;
    return {
      state: late ? 'delivered_late' : 'delivered_on_time',
      isActiveDelay: false,
      isDelayedAny: late,
      label: late ? 'Delivered Late' : 'Delivered On-Time',
      reason: breachedEdd
        ? 'Delivered after Delhivery EDD'
        : breachedSla
          ? `Took ${transitDays}d (> ${slaDays}d SLA)`
          : transitDays !== null
            ? `Delivered in ${transitDays}d`
            : 'Delivered within SLA',
      transitDays,
      hoursSinceTracking: null,
    };
  }

  if (isOrderInTransit(order)) {
    const transitDays =
      validStart && nowMs >= startMs
        ? Math.max(0, Math.round(((nowMs - startMs) / 86_400_000) * 10) / 10)
        : 0;
    const attempts = order.deliveryAttemptsCount ?? 0;
    const ship = (order.shipmentStatus || '').toLowerCase();

    if (ship === 'attempted_delivery' || attempts > 1) {
      return {
        state: 'ndr_attempt',
        isActiveDelay: true,
        isDelayedAny: true,
        label: attempts > 1 ? `NDR (${attempts} Attempts)` : 'NDR / Attempted',
        reason: order.lastCourierScanRemark || 'Delivery failed/attempted — needs customer follow-up',
        transitDays,
        hoursSinceTracking: null,
      };
    }

    if (Number.isFinite(eddMs) && nowMs > eddMs) {
      return {
        state: 'transit_delayed',
        isActiveDelay: true,
        isDelayedAny: true,
        label: 'Past Delhivery EDD',
        reason: order.lastCourierScanLocation
          ? `Still at ${order.lastCourierScanLocation} (${transitDays}d)`
          : `Exceeded expected delivery date (${transitDays}d)`,
        transitDays,
        hoursSinceTracking: null,
      };
    }

    if (transitDays > slaDays) {
      return {
        state: 'transit_delayed',
        isActiveDelay: true,
        isDelayedAny: true,
        label: `Slow Transit (${transitDays}d)`,
        reason: order.lastCourierScanLocation
          ? `In transit > ${slaDays}d · Last scan: ${order.lastCourierScanLocation}`
          : `In transit ${transitDays}d (> ${slaDays}d SLA)`,
        transitDays,
        hoursSinceTracking: null,
      };
    }

    return {
      state: 'on_time',
      isActiveDelay: false,
      isDelayedAny: false,
      label: 'In Transit (On Time)',
      reason: order.lastCourierScanLocation
        ? `At ${order.lastCourierScanLocation} (${transitDays}d)`
        : `Moving normally (${transitDays}d)`,
      transitDays,
      hoursSinceTracking: null,
    };
  }

  if (isOrderTrackingAdded(order) || isOrderDispatched(order)) {
    const trackIso = order.fulfilledAt || order.trackingSentAt || order.createdAt;
    const trackMs = Date.parse(trackIso);
    const hoursSinceTracking =
      Number.isFinite(trackMs) && nowMs >= trackMs
        ? Math.max(0, Math.round((nowMs - trackMs) / 3_600_000))
        : 0;
    const transitDays = Math.round((hoursSinceTracking / 24) * 10) / 10;

    if (hoursSinceTracking >= pickupSlaHours) {
      return {
        state: 'pickup_delayed',
        isActiveDelay: true,
        isDelayedAny: true,
        label: `Pickup Delayed (${hoursSinceTracking}h)`,
        reason: `AWB created ${hoursSinceTracking}h ago, still not picked up by courier`,
        transitDays,
        hoursSinceTracking,
      };
    }

    return {
      state: 'on_time',
      isActiveDelay: false,
      isDelayedAny: false,
      label: 'Awaiting Pickup',
      reason: `Label added ${hoursSinceTracking}h ago`,
      transitDays,
      hoursSinceTracking,
    };
  }

  return {
    state: 'unshipped',
    isActiveDelay: false,
    isDelayedAny: false,
    label: order.pollStatus === 'confirmed' ? 'Ready to Dispatch' : 'Awaiting Confirm',
    reason: '',
    transitDays: null,
    hoursSinceTracking: null,
  };
}

export interface SettlementDelayOrderRow {
  order: OrderRecord;
  dateLabel: string;
  settlement: OrderSettlementInfo;
  delay: OrderDeliveryDelayInfo;
  shippingAndCodCost: number;
}

export interface SettlementDelaySummary {
  currency: string;
  settledTotal: number;
  settledCount: number;
  codSettledTotal: number;
  codSettledCount: number;
  prepaidSettledTotal: number;
  prepaidSettledCount: number;
  pendingCodRemittanceTotal: number;
  pendingCodRemittanceCount: number;
  avgCodRemittanceWaitDays: number | null;
  inTransitCodTotal: number;
  inTransitCodCount: number;
  rtoNoPayoutValue: number;
  rtoCount: number;
  activeDelayedCount: number;
  pickupDelayedCount: number;
  transitDelayedCount: number;
  ndrAttemptCount: number;
  stuckOrderValue: number;
  deliveredOnTimeCount: number;
  deliveredLateCount: number;
  onTimeDeliveryRate: number;
  avgTransitDays: number | null;
  rows: SettlementDelayOrderRow[];
}

/**
 * Computes combined Payment Settlement (COD remittance vs Prepaid) and Delivery Delay/SLA analytics.
 */
export function buildSettlementAndDelaySummary(
  orders: OrderRecord[],
  settings: AppSettings,
  nowMs = Date.now()
): SettlementDelaySummary {
  let currency = 'INR';
  let settledTotal = 0;
  let settledCount = 0;
  let codSettledTotal = 0;
  let codSettledCount = 0;
  let prepaidSettledTotal = 0;
  let prepaidSettledCount = 0;
  let pendingCodRemittanceTotal = 0;
  let pendingCodRemittanceCount = 0;
  let codWaitDaysSum = 0;
  let codWaitDaysN = 0;
  let inTransitCodTotal = 0;
  let inTransitCodCount = 0;
  let rtoNoPayoutValue = 0;
  let rtoCount = 0;

  let activeDelayedCount = 0;
  let pickupDelayedCount = 0;
  let transitDelayedCount = 0;
  let ndrAttemptCount = 0;
  let stuckOrderValue = 0;
  let deliveredOnTimeCount = 0;
  let deliveredLateCount = 0;
  let transitDaysSum = 0;
  let transitDaysN = 0;

  const rows: SettlementDelayOrderRow[] = [];

  for (const order of orders) {
    if (order.currency) currency = order.currency;
    const settlement = getOrderSettlementInfo(order, nowMs);
    const delay = getOrderDeliveryDelayInfo(order, settings, nowMs);
    const dateKey = getIstDateKey(order.createdAt) || 'Unknown';
    const dateLabel = dateKey === 'Unknown' ? 'Unknown' : formatIstDateDisplay(dateKey);

    const fwd = order.delhiveryShippingCost ?? 0;
    const rto = order.delhiveryRtoCost ?? 0;
    const cod = order.delhiveryCodFee ?? 0;
    const shippingAndCodCost = round2(
      isOrderRtoReturn(order) ? fwd + rto : fwd + (settlement.paymentMode === 'COD' ? cod : 0)
    );

    if (settlement.status === 'settled') {
      settledTotal += settlement.settledAmount;
      settledCount += 1;
      if (settlement.paymentMode === 'COD') {
        codSettledTotal += settlement.settledAmount;
        codSettledCount += 1;
      } else {
        prepaidSettledTotal += settlement.settledAmount;
        prepaidSettledCount += 1;
      }
    } else if (settlement.status === 'pending_remittance') {
      pendingCodRemittanceTotal += settlement.pendingAmount;
      pendingCodRemittanceCount += 1;
      if (settlement.daysSinceDelivery !== null) {
        codWaitDaysSum += settlement.daysSinceDelivery;
        codWaitDaysN += 1;
      }
    } else if (settlement.status === 'in_transit' && settlement.paymentMode === 'COD') {
      inTransitCodTotal += settlement.orderValue;
      inTransitCodCount += 1;
    }

    if (isOrderRtoReturn(order)) {
      rtoCount += 1;
      rtoNoPayoutValue += settlement.orderValue;
    }

    if (delay.isActiveDelay) {
      activeDelayedCount += 1;
      stuckOrderValue += settlement.orderValue;
      if (delay.state === 'pickup_delayed') pickupDelayedCount += 1;
      if (delay.state === 'transit_delayed') transitDelayedCount += 1;
      if (delay.state === 'ndr_attempt') ndrAttemptCount += 1;
    }

    if (delay.state === 'delivered_on_time') {
      deliveredOnTimeCount += 1;
      if (delay.transitDays !== null) {
        transitDaysSum += delay.transitDays;
        transitDaysN += 1;
      }
    } else if (delay.state === 'delivered_late') {
      deliveredLateCount += 1;
      if (delay.transitDays !== null) {
        transitDaysSum += delay.transitDays;
        transitDaysN += 1;
      }
    }

    rows.push({
      order,
      dateLabel,
      settlement,
      delay,
      shippingAndCodCost,
    });
  }

  const deliveredTotal = deliveredOnTimeCount + deliveredLateCount;
  const onTimeDeliveryRate =
    deliveredTotal > 0 ? Math.round((deliveredOnTimeCount / deliveredTotal) * 100) : 0;

  return {
    currency,
    settledTotal: round2(settledTotal),
    settledCount,
    codSettledTotal: round2(codSettledTotal),
    codSettledCount,
    prepaidSettledTotal: round2(prepaidSettledTotal),
    prepaidSettledCount,
    pendingCodRemittanceTotal: round2(pendingCodRemittanceTotal),
    pendingCodRemittanceCount,
    avgCodRemittanceWaitDays:
      codWaitDaysN > 0 ? Math.round((codWaitDaysSum / codWaitDaysN) * 10) / 10 : null,
    inTransitCodTotal: round2(inTransitCodTotal),
    inTransitCodCount,
    rtoNoPayoutValue: round2(rtoNoPayoutValue),
    rtoCount,
    activeDelayedCount,
    pickupDelayedCount,
    transitDelayedCount,
    ndrAttemptCount,
    stuckOrderValue: round2(stuckOrderValue),
    deliveredOnTimeCount,
    deliveredLateCount,
    onTimeDeliveryRate,
    avgTransitDays:
      transitDaysN > 0 ? Math.round((transitDaysSum / transitDaysN) * 10) / 10 : null,
    rows,
  };
}

/**
 * Decides whether the full remote DB JSON blob must be downloaded from Upstash Redis.
 * When a lightweight (~25-byte) revision token matches what we already loaded, skip the ~400 KB pull.
 */
export function shouldFetchFullRemoteDb(params: {
  localRev: string | null;
  remoteRev: string | null;
  force?: boolean;
}): boolean {
  if (params.force) return true;
  if (!params.remoteRev || !params.localRev) return true;
  return params.remoteRev !== params.localRev;
}

/**
 * Throttles Baileys multi-file auth bundle (~400-650 KB) uploads to Upstash Redis
 * so frequent creds.update events do not burn gigabytes of Redis bandwidth.
 */
export function shouldBackupWhatsAppAuth(params: {
  lastBackupAtMs: number;
  force?: boolean;
  nowMs?: number;
  minIntervalMs?: number;
}): boolean {
  if (params.force) return true;
  const nowMs = params.nowMs ?? Date.now();
  const minIntervalMs = params.minIntervalMs ?? 15 * 60 * 1000;
  if (!params.lastBackupAtMs || params.lastBackupAtMs <= 0) return true;
  return nowMs - params.lastBackupAtMs >= minIntervalMs;
}

/**
 * Checks whether an open, unfulfilled, unpaid (COD) order that was already tagged as
 * `cancelled by user` should be automatically cancelled in Shopify during sync reconciliation.
 * Never auto-cancels already-cancelled, fulfilled, or prepaid (`paid`) orders during background sync.
 */
export function shouldAutoCancelOpenShopifyOrder(
  order: Pick<
    OrderRecord,
    'pollStatus' | 'shopifyTags' | 'shopifyCancelledAt' | 'fulfillmentStatus' | 'financialStatus'
  >,
  settings: Pick<AppSettings, 'autoCancelInShopify' | 'cancelTag'>
): boolean {
  if (!settings.autoCancelInShopify) return false;
  if (order.pollStatus !== 'cancelled_by_user') return false;
  if (order.shopifyCancelledAt) return false;

  const fulfillment = (order.fulfillmentStatus || '').trim().toLowerCase();
  if (fulfillment) return false;

  const financial = (order.financialStatus || '').trim().toLowerCase();
  if (financial === 'paid' || financial === 'partially_paid' || financial === 'refunded') {
    return false;
  }

  const cancelTag = (settings.cancelTag || 'cancelled by user').trim().toLowerCase();
  if (!cancelTag) return false;

  const tags = (order.shopifyTags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return tags.includes(cancelTag);
}

export type WhatsAppDisconnectAction =
  | 'restart_immediate'
  | 'pause_keep_auth'
  | 'reconnect_bad_session'
  | 'logout_clear_auth'
  | 'qr_timeout_clear_unregistered'
  | 'reconnect';

/**
 * Classifies a Baileys WhatsApp Web socket close event so transient glitches (such as
 * 500 badSession, 515 restartRequired, 408/428/503 drops, or 440/conflict handoffs)
 * NEVER accidentally wipe saved WhatsApp credentials and force repeated re-scans.
 */
export function classifyWhatsAppDisconnect(params: {
  statusCode?: number;
  errMessage?: string;
  isAuthRegistered: boolean;
  consecutiveBadSessions: number;
}): WhatsAppDisconnectAction {
  const code = params.statusCode;
  const lowerMsg = (params.errMessage || '').trim().toLowerCase();

  // 515: normal post-QR-scan stream restart
  if (code === 515) {
    return 'restart_immediate';
  }

  // 440 or conflict/replaced: another server instance briefly held the session — pause without wiping auth
  if (
    code === 440 ||
    isWhatsAppConnectionReplaced(code) ||
    lowerMsg.includes('conflict') ||
    lowerMsg.includes('connection replaced') ||
    lowerMsg.includes('replaced')
  ) {
    return 'pause_keep_auth';
  }

  // 500 (badSession): frequently transient in Baileys v6/v7 — retry up to 3 times before clearing auth
  if (code === 500) {
    return params.consecutiveBadSessions < 3 ? 'reconnect_bad_session' : 'logout_clear_auth';
  }

  // 401 (loggedOut) or 411 (multideviceMismatch): true phone-side unlink / invalid session
  if (code === 401 || code === 411) {
    return 'logout_clear_auth';
  }

  // Unregistered QR window timed out without being scanned
  if (
    !params.isAuthRegistered &&
    (lowerMsg.includes('qr refs attempts ended') || code === 408)
  ) {
    return 'qr_timeout_clear_unregistered';
  }

  // All other close codes (408 registered, 428, 503, network resets) -> auto-reconnect keeping auth
  return 'reconnect';
}

