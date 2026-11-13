import crypto from 'node:crypto';
import type { AppSettings, OrderRecord } from '../src/lib/types.js';

export interface ShopifyRawOrder {
  id: number | string;
  name?: string;
  order_number?: number;
  created_at?: string;
  total_price?: string;
  currency?: string;
  financial_status?: string;
  tags?: string;
  phone?: string | null;
  email?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string | null;
    email?: string | null;
  };
  shipping_address?: {
    name?: string;
    phone?: string | null;
  };
  billing_address?: {
    name?: string;
    phone?: string | null;
  };
  line_items?: Array<{
    title?: string;
    quantity?: number;
    variant_title?: string | null;
  }>;
}

const SHOPIFY_API_VERSION = '2025-01';

// In-memory cache for Dev Dashboard 24h client_credentials access tokens
let cachedToken: {
  cacheKey: string;
  accessToken: string;
  expiresAtMs: number;
} | null = null;

export function normalizeShopifyDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
}

export function verifyShopifyWebhookHmac(
  rawBody: Buffer | string,
  hmacHeader: string | undefined,
  secret: string
): boolean {
  if (!secret.trim()) {
    return true;
  }
  if (!hmacHeader) return false;
  const computed = crypto
    .createHmac('sha256', secret.trim())
    .update(rawBody)
    .digest('base64');

  const computedBuf = Buffer.from(computed);
  const headerBuf = Buffer.from(hmacHeader);
  if (computedBuf.length !== headerBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, headerBuf);
}

export function parseShopifyRawOrder(raw: ShopifyRawOrder): OrderRecord {
  const shopifyOrderId = String(raw.id);
  const orderNumber =
    raw.name || (raw.order_number ? `#${raw.order_number}` : `#${shopifyOrderId.slice(-4)}`);

  const first = raw.customer?.first_name?.trim() || '';
  const last = raw.customer?.last_name?.trim() || '';
  const fullName =
    `${first} ${last}`.trim() ||
    raw.shipping_address?.name?.trim() ||
    raw.billing_address?.name?.trim() ||
    'Shopify Customer';

  const customerPhone =
    raw.shipping_address?.phone ||
    raw.customer?.phone ||
    raw.phone ||
    raw.billing_address?.phone ||
    '';

  const customerEmail = raw.email || raw.customer?.email || '';

  const lineItemsSummary =
    Array.isArray(raw.line_items) && raw.line_items.length > 0
      ? raw.line_items
          .map((item) => {
            const qty = item.quantity ?? 1;
            const variant = item.variant_title ? ` (${item.variant_title})` : '';
            return `${qty}x ${item.title || 'Item'}${variant}`;
          })
          .join(', ')
      : 'Order items';

  const now = new Date().toISOString();
  const createdAt = raw.created_at || now;

  return {
    id: `ord-${shopifyOrderId}`,
    shopifyOrderId,
    orderNumber,
    customerName: fullName,
    customerPhone: customerPhone.trim(),
    customerEmail,
    totalPrice: raw.total_price || '0.00',
    currency: raw.currency || 'INR',
    lineItemsSummary,
    financialStatus: raw.financial_status || 'pending',
    shopifyTags: raw.tags || '',
    pollStatus: 'queued',
    whatsappMessageId: null,
    pollQuestion: '',
    pollSentAt: null,
    respondedAt: null,
    responseChannel: null,
    shopifySynced: true,
    createdAt,
    events: [
      {
        id: `evt-${Date.now()}-init`,
        timestamp: now,
        actor: 'shopify',
        message: `Shopify order ${orderNumber} ingested (${raw.financial_status || 'pending'})`,
      },
    ],
  };
}

export function hasLiveShopifyCredentials(settings: AppSettings): boolean {
  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  if (!domain) return false;
  return Boolean(
    settings.shopifyAccessToken.trim() ||
      (settings.shopifyClientId.trim() && settings.shopifyClientSecret.trim())
  );
}

/**
 * Resolves an Admin API access token either from direct `shpat_` token
 * or automatically via Shopify Dev Dashboard `client_credentials` exchange.
 */
async function resolveShopifyAccessToken(
  settings: AppSettings
): Promise<{ token?: string; error?: string }> {
  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  if (!domain) {
    return { error: 'Enter your Shopify Store Domain (e.g. your-store.myshopify.com).' };
  }

  if (settings.shopifyAccessToken.trim()) {
    return { token: settings.shopifyAccessToken.trim() };
  }

  const clientId = settings.shopifyClientId.trim();
  const clientSecret = settings.shopifyClientSecret.trim();
  if (!clientId || !clientSecret) {
    return {
      error:
        'Enter your App Client ID and Client Secret from dev.shopify.com (or a direct Admin API token).',
    };
  }

  const cacheKey = `${domain}:${clientId}:${clientSecret}`;
  if (
    cachedToken &&
    cachedToken.cacheKey === cacheKey &&
    Date.now() < cachedToken.expiresAtMs - 60_000
  ) {
    return { token: cachedToken.accessToken };
  }

  try {
    const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        error: `Shopify OAuth token exchange failed (${res.status}): ${body.slice(0, 180)}`,
      };
    }

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      return { error: 'Shopify did not return an access_token. Make sure the app is installed on your store.' };
    }

    const ttlMs = (data.expires_in ?? 86400) * 1000;
    cachedToken = {
      cacheKey,
      accessToken: data.access_token,
      expiresAtMs: Date.now() + ttlMs,
    };
    return { token: data.access_token };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Network error exchanging Shopify credentials',
    };
  }
}

export async function testShopifyConnection(
  settings: AppSettings
): Promise<{ ok: boolean; shopName?: string; error?: string }> {
  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  const auth = await resolveShopifyAccessToken(settings);
  if (!auth.token) {
    return { ok: false, error: auth.error };
  }

  try {
    const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': auth.token,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: `Shopify API ${res.status}: ${body.slice(0, 180)}`,
      };
    }

    const data = (await res.json()) as { shop?: { name?: string } };
    return { ok: true, shopName: data.shop?.name || domain };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error connecting to Shopify',
    };
  }
}

export async function fetchShopifyOrders(
  settings: AppSettings
): Promise<{ ok: boolean; orders: ShopifyRawOrder[]; error?: string }> {
  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  const auth = await resolveShopifyAccessToken(settings);
  if (!auth.token) {
    return { ok: false, orders: [], error: auth.error };
  }

  try {
    const res = await fetch(
      `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=25`,
      {
        headers: {
          'X-Shopify-Access-Token': auth.token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        orders: [],
        error: `Shopify API ${res.status}: ${text.slice(0, 180)}`,
      };
    }

    const data = (await res.json()) as { orders?: ShopifyRawOrder[] };
    return { ok: true, orders: Array.isArray(data.orders) ? data.orders : [] };
  } catch (err) {
    return {
      ok: false,
      orders: [],
      error: err instanceof Error ? err.message : 'Failed to fetch Shopify orders',
    };
  }
}

export async function updateShopifyOrderTags(
  settings: AppSettings,
  shopifyOrderId: string,
  newTags: string,
  shouldCancelOrder: boolean
): Promise<{ synced: boolean; error?: string }> {
  if (!hasLiveShopifyCredentials(settings)) {
    return { synced: false };
  }

  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  const auth = await resolveShopifyAccessToken(settings);
  if (!auth.token) {
    return { synced: false, error: auth.error };
  }

  try {
    const updateRes = await fetch(
      `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopifyOrderId}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': auth.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: {
            id: Number(shopifyOrderId) || shopifyOrderId,
            tags: newTags,
          },
        }),
      }
    );

    if (!updateRes.ok) {
      const text = await updateRes.text();
      return {
        synced: false,
        error: `Shopify tag update ${updateRes.status}: ${text.slice(0, 180)}`,
      };
    }

    if (shouldCancelOrder) {
      await fetch(
        `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopifyOrderId}/cancel.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': auth.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'customer' }),
        }
      );
    }

    return { synced: true };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'Failed updating Shopify order tags',
    };
  }
}
