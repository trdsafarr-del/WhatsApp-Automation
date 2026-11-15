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
  statusLabel: string;
  sidebarLabel: string;
  persistenceLabel: string;
}

/**
 * Computes consistent UI display states across local Node hosts and serverless dashboards (Vercel),
 * treating a cloud-synced host session with a saved phone/connectedAt as linked rather than "Not Linked".
 */
export function getWhatsAppDisplayState(
  whatsapp: {
    status: string;
    phoneNumber?: string | null;
    connectedAt?: string | null;
    lastHeartbeatAt?: string | null;
    sessionPersisted?: boolean;
    remoteSessionActive?: boolean;
    isServerless?: boolean;
    qrDataUrl?: string | null;
  },
  nowMs = Date.now()
): WhatsAppDisplaySummary {
  const isLocalConnected = whatsapp.status === 'connected';
  const hasRemoteMeta = Boolean(
    whatsapp.remoteSessionActive || (whatsapp.connectedAt && whatsapp.phoneNumber)
  );
  const isRemoteLinked = !isLocalConnected && hasRemoteMeta && Boolean(whatsapp.phoneNumber);
  const isLinked = isLocalConnected || isRemoteLinked;
  const isHostLive =
    isLocalConnected || (isRemoteLinked && isHostHeartbeatRecent(whatsapp.lastHeartbeatAt, nowMs));

  const isQrReady = whatsapp.status === 'qr_ready' && Boolean(whatsapp.qrDataUrl);
  const isConnecting = whatsapp.status === 'connecting';

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
          : 'Unlinked';

  const persistenceLabel = isLocalConnected
    ? whatsapp.sessionPersisted
      ? 'Saved (Auto-Restore on Boot)'
      : 'Active in Memory'
    : isRemoteLinked
      ? 'Saved in Cloud Redis (Host Linked)'
      : 'Not Saved';

  return {
    isLocalConnected,
    isRemoteLinked,
    isLinked,
    isHostLive,
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

/**
 * Checks whether an order has actually entered RTO / Return (excluding pre-dispatch RTO Risk tags).
 */
export function isOrderRtoReturn(
  order: Pick<OrderRecord, 'fulfillmentStatus' | 'shipmentStatus' | 'shopifyTags'>
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

  const tags = parseNormalizedTags(order.shopifyTags);
  return tags.some((tag) => {
    if (tag.includes('risk')) return false;
    return (
      tag === 'rto' ||
      tag.startsWith('rto ') ||
      tag.startsWith('rto_') ||
      tag.startsWith('rto-') ||
      tag.includes('return to origin') ||
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
  order: Pick<OrderRecord, 'fulfillmentStatus' | 'shipmentStatus' | 'shopifyTags'>
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
  >
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
  >
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
  >
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
  >
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

