import crypto from 'node:crypto';
import {
  DEFAULT_SETTINGS,
  extractCleanIndianPincode,
  extractShopifyCustomerPhone,
  extractShopifyTrackingInfo,
  getSyncStartCutoffIso,
  inferInitialPollStatus,
  type ShopifyFulfillmentSource,
} from '../src/lib/orderRules.js';
import type { AppSettings, OrderRecord } from '../src/lib/types.js';

export interface ShopifyRawOrder {
  id: number | string;
  name?: string;
  order_number?: number;
  created_at?: string;
  cancelled_at?: string | null;
  total_price?: string;
  total_weight?: number;
  currency?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  payment_gateway_names?: string[];
  tags?: string;
  note?: string | null;
  note_attributes?: Array<{
    name?: string;
    value?: string | number | null;
  }>;
  phone?: string | null;
  email?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string | null;
    email?: string | null;
    default_address?: {
      phone?: string | null;
    } | null;
  } | null;
  shipping_address?: {
    name?: string;
    phone?: string | null;
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
  } | null;
  billing_address?: {
    name?: string;
    phone?: string | null;
  } | null;
  line_items?: Array<{
    title?: string;
    quantity?: number;
    variant_title?: string | null;
  }>;
  fulfillments?: ShopifyFulfillmentSource[] | null;
}

const SHOPIFY_API_VERSION = '2025-01';

// In-memory cache for Dev Dashboard 24h client_credentials access tokens
let cachedToken: {
  cacheKey: string;
  accessToken: string;
  expiresAtMs: number;
} | null = null;

export function normalizeShopifyDomain(domain: string): string {
  const trimmed = domain.trim();
  const adminMatch = trimmed.match(/admin\.shopify\.com\/store\/([a-zA-Z0-9-]+)/i);
  if (adminMatch) {
    return `${adminMatch[1].toLowerCase()}.myshopify.com`;
  }
  return trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
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

function inferPaymentMethod(raw: ShopifyRawOrder): string {
  const gateways = Array.isArray(raw.payment_gateway_names)
    ? raw.payment_gateway_names.join(' ').toLowerCase()
    : '';
  const tags = (raw.tags || '').toLowerCase();
  if (
    gateways.includes('cod') ||
    gateways.includes('cash on delivery') ||
    tags.includes('cod') ||
    raw.financial_status === 'pending'
  ) {
    return 'COD';
  }
  if (raw.financial_status === 'paid') {
    return 'Prepaid';
  }
  return (raw.financial_status || 'Pending').toUpperCase();
}

export function parseShopifyRawOrder(
  raw: ShopifyRawOrder,
  settings: Pick<AppSettings, 'confirmTag' | 'cancelTag'> = DEFAULT_SETTINGS
): OrderRecord {
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

  const customerPhone = extractShopifyCustomerPhone(raw);
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

  const deliveryParts = [
    raw.shipping_address?.address1?.trim(),
    raw.shipping_address?.city?.trim(),
    raw.shipping_address?.zip?.trim(),
  ].filter(Boolean);
  const deliverySummary = deliveryParts.join(', ');
  const paymentMethod = inferPaymentMethod(raw);
  const destinationPincode =
    extractCleanIndianPincode(raw.shipping_address?.zip) ||
    extractCleanIndianPincode(deliverySummary);
  const orderWeightGrams =
    typeof raw.total_weight === 'number' && Number.isFinite(raw.total_weight) && raw.total_weight > 0
      ? Math.round(raw.total_weight)
      : undefined;
  const orderNote = raw.note?.trim() || '';
  const tracking = extractShopifyTrackingInfo(raw);
  const initialPollStatus = inferInitialPollStatus(raw, settings);

  const now = new Date().toISOString();
  const createdAt = raw.created_at || now;

  return {
    id: `ord-${shopifyOrderId}`,
    shopifyOrderId,
    orderNumber,
    customerName: fullName,
    customerPhone,
    customerEmail,
    totalPrice: raw.total_price || '0.00',
    currency: raw.currency || 'INR',
    lineItemsSummary,
    financialStatus: raw.financial_status || 'pending',
    fulfillmentStatus: raw.fulfillment_status || null,
    shipmentStatus: tracking.shipmentStatus || null,
    fulfilledAt: tracking.fulfilledAt || null,
    paymentMethod,
    deliverySummary,
    destinationPincode,
    orderWeightGrams,
    orderNote,
    trackingNumber: tracking.trackingNumber || undefined,
    trackingUrl: tracking.trackingUrl || undefined,
    trackingCompany: tracking.trackingCompany || undefined,
    trackingSentAt: null,
    trackingSentValue: null,
    shopifyTags: raw.tags || '',
    pollStatus: initialPollStatus,
    whatsappMessageId: null,
    whatsappTargetJid: null,
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
        message: `Shopify order ${orderNumber} read (${paymentMethod} · ${customerPhone || 'no phone'})`,
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

  if (!domain.endsWith('.myshopify.com')) {
    return {
      error: `Custom storefront domain "${domain}" cannot be used for Shopify Admin API. Enter your ".myshopify.com" domain instead (look at your Shopify Admin URL: admin.shopify.com/store/YOUR-HANDLE → YOUR-HANDLE.myshopify.com).`,
    };
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
      if (body.includes('<!DOCTYPE') || body.includes('<html')) {
        return {
          error: `Shopify rejected the request (${res.status}). Check that "${domain}" is your exact .myshopify.com domain and the app is installed on that store.`,
        };
      }
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

export async function fetchShopifyOriginPincode(settings: AppSettings): Promise<string> {
  if (!hasLiveShopifyCredentials(settings)) return '';
  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  const auth = await resolveShopifyAccessToken(settings);
  if (!auth.token) return '';

  try {
    const locRes = await fetch(
      `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/locations.json`,
      {
        headers: {
          'X-Shopify-Access-Token': auth.token,
          'Content-Type': 'application/json',
        },
      }
    );
    if (locRes.ok) {
      const locData = (await locRes.json()) as {
        locations?: Array<{ zip?: string | null; active?: boolean }>;
      };
      const list = Array.isArray(locData.locations) ? locData.locations : [];
      const activeFirst = [
        ...list.filter((l) => l.active !== false),
        ...list.filter((l) => l.active === false),
      ];
      for (const loc of activeFirst) {
        const pin = extractCleanIndianPincode(loc.zip);
        if (pin) return pin;
      }
    }
  } catch {
    // Fallback to shop.json
  }

  try {
    const shopRes = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': auth.token,
        'Content-Type': 'application/json',
      },
    });
    if (shopRes.ok) {
      const shopData = (await shopRes.json()) as { shop?: { zip?: string | null } };
      return extractCleanIndianPincode(shopData.shop?.zip);
    }
  } catch {
    // Ignore errors safely
  }
  return '';
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
    const cutoffIso = getSyncStartCutoffIso(settings.syncStartDate);
    const createdAtParam = cutoffIso
      ? `&created_at_min=${encodeURIComponent(cutoffIso)}`
      : '';
    const res = await fetch(
      `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250${createdAtParam}`,
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

export async function updateShopifyOrderNote(
  settings: AppSettings,
  shopifyOrderId: string,
  note: string
): Promise<{ synced: boolean; error?: string }> {
  if (!hasLiveShopifyCredentials(settings)) {
    return {
      synced: false,
      error: 'Shopify credentials are not configured yet (saved locally only).',
    };
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
            note,
          },
        }),
      }
    );

    if (!updateRes.ok) {
      const text = await updateRes.text();
      return {
        synced: false,
        error: `Shopify note update ${updateRes.status}: ${text.slice(0, 180)}`,
      };
    }

    return { synced: true };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'Failed updating Shopify order note',
    };
  }
}

export interface ShopifyFetchedProduct {
  shopifyProductId: string;
  title: string;
  handle: string;
  status: 'active' | 'draft' | 'archived';
  productType: string;
  vendor: string;
  imageUrl: string;
  imageAlt: string;
  price: string;
  currency: string;
  seoTitle: string;
  seoDescription: string;
  tags: string;
}

export async function fetchShopifyProducts(
  settings: AppSettings
): Promise<{ ok: boolean; products: ShopifyFetchedProduct[]; error?: string }> {
  if (!hasLiveShopifyCredentials(settings)) {
    return {
      ok: false,
      products: [],
      error: 'Configure your Shopify Store Domain and credentials in Automation & Shopify first.',
    };
  }

  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  const auth = await resolveShopifyAccessToken(settings);
  if (!auth.token) {
    return { ok: false, products: [], error: auth.error };
  }

  const query = `
    query OrderPulseProducts($first: Int!, $after: String) {
      products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            legacyResourceId
            title
            handle
            status
            productType
            vendor
            tags
            seo {
              title
              description
            }
            featuredImage {
              url
              altText
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  try {
    const allProducts: ShopifyFetchedProduct[] = [];
    let afterCursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;

    while (hasNextPage && pageCount < 5) {
      pageCount += 1;
      const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': auth.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables: { first: 100, after: afterCursor } }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          ok: false,
          products: [],
          error: `Shopify GraphQL ${res.status}: ${text.slice(0, 180)}`,
        };
      }

      const json = (await res.json()) as {
        data?: {
          products?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
            edges?: Array<{
              node?: {
                legacyResourceId?: string;
                title?: string;
                handle?: string;
                status?: string;
                productType?: string;
                vendor?: string;
                tags?: string[];
                seo?: { title?: string | null; description?: string | null } | null;
                featuredImage?: { url?: string | null; altText?: string | null } | null;
                priceRangeV2?: {
                  minVariantPrice?: { amount?: string; currencyCode?: string };
                } | null;
              };
            }>;
          };
        };
        errors?: Array<{ message?: string; extensions?: { code?: string } }>;
      };

      if (Array.isArray(json.errors) && json.errors.length > 0) {
        const msg = json.errors.map((e) => e.message).filter(Boolean).join('; ');
        if (msg.toLowerCase().includes('access denied') || msg.toLowerCase().includes('read_products')) {
          return {
            ok: false,
            products: [],
            error:
              'Shopify app is missing "read_products" permission. Add read_products & write_products scopes in dev.shopify.com and re-approve the app.',
          };
        }
        return { ok: false, products: [], error: msg || 'Shopify GraphQL returned errors.' };
      }

      const edges = json.data?.products?.edges || [];
      for (const edge of edges) {
        const n = edge.node;
        if (!n?.legacyResourceId) continue;
        const rawStatus = (n.status || 'ACTIVE').toLowerCase();
        const status: ShopifyFetchedProduct['status'] =
          rawStatus === 'draft' ? 'draft' : rawStatus === 'archived' ? 'archived' : 'active';
        allProducts.push({
          shopifyProductId: String(n.legacyResourceId),
          title: n.title || 'Untitled Product',
          handle: n.handle || '',
          status,
          productType: n.productType || '',
          vendor: n.vendor || '',
          imageUrl: n.featuredImage?.url || '',
          imageAlt: n.featuredImage?.altText || '',
          price: n.priceRangeV2?.minVariantPrice?.amount || '0.00',
          currency: n.priceRangeV2?.minVariantPrice?.currencyCode || 'INR',
          seoTitle: n.seo?.title || '',
          seoDescription: n.seo?.description || '',
          tags: Array.isArray(n.tags) ? n.tags.join(', ') : '',
        });
      }

      hasNextPage = Boolean(json.data?.products?.pageInfo?.hasNextPage);
      afterCursor = json.data?.products?.pageInfo?.endCursor || null;
      if (!afterCursor) break;
    }

    return { ok: true, products: allProducts };
  } catch (err) {
    return {
      ok: false,
      products: [],
      error: err instanceof Error ? err.message : 'Network error fetching Shopify products',
    };
  }
}

export async function updateShopifyProductSeo(
  settings: AppSettings,
  input: {
    shopifyProductId: string;
    handle: string;
    seoTitle: string;
    seoDescription: string;
    imageAlt?: string;
  }
): Promise<{ synced: boolean; error?: string }> {
  if (!hasLiveShopifyCredentials(settings)) {
    return {
      synced: false,
      error: 'Shopify credentials not configured (saved locally only).',
    };
  }
  if (!/^\d+$/.test(input.shopifyProductId.trim())) {
    return {
      synced: false,
      error: 'Sample/local product saved locally (sync real Shopify products to push live).',
    };
  }

  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  const auth = await resolveShopifyAccessToken(settings);
  if (!auth.token) {
    return { synced: false, error: auth.error };
  }

  const mutation = `
    mutation OrderPulseUpdateSeo($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          handle
          seo {
            title
            description
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': auth.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            id: `gid://shopify/Product/${input.shopifyProductId.trim()}`,
            handle: input.handle.trim() || undefined,
            seo: {
              title: input.seoTitle.trim(),
              description: input.seoDescription.trim(),
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { synced: false, error: `Shopify GraphQL ${res.status}: ${text.slice(0, 180)}` };
    }

    const json = (await res.json()) as {
      data?: {
        productUpdate?: {
          userErrors?: Array<{ message?: string }>;
        };
      };
      errors?: Array<{ message?: string }>;
    };

    if (Array.isArray(json.errors) && json.errors.length > 0) {
      const msg = json.errors.map((e) => e.message).filter(Boolean).join('; ');
      if (msg.toLowerCase().includes('access denied') || msg.toLowerCase().includes('write_products')) {
        return {
          synced: false,
          error: 'Missing "write_products" scope in Shopify app (saved locally only).',
        };
      }
      return { synced: false, error: msg };
    }

    const userErrors = json.data?.productUpdate?.userErrors || [];
    if (userErrors.length > 0) {
      return {
        synced: false,
        error: userErrors.map((e) => e.message).filter(Boolean).join('; '),
      };
    }

    // Best-effort featured image alt text update via REST if provided
    if (typeof input.imageAlt === 'string' && input.imageAlt.trim()) {
      try {
        const imgListRes = await fetch(
          `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/products/${input.shopifyProductId.trim()}/images.json`,
          {
            headers: {
              'X-Shopify-Access-Token': auth.token,
              'Content-Type': 'application/json',
            },
          }
        );
        if (imgListRes.ok) {
          const imgListData = (await imgListRes.json()) as {
            images?: Array<{ id?: number | string }>;
          };
          const firstImageId = imgListData.images?.[0]?.id;
          if (firstImageId) {
            await fetch(
              `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/products/${input.shopifyProductId.trim()}/images/${firstImageId}.json`,
              {
                method: 'PUT',
                headers: {
                  'X-Shopify-Access-Token': auth.token,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  image: {
                    id: firstImageId,
                    alt: input.imageAlt.trim(),
                  },
                }),
              }
            );
          }
        }
      } catch {
        // Non-fatal if image alt update fails
      }
    }

    return { synced: true };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'Failed pushing SEO update to Shopify',
    };
  }
}

export async function installShopifyScriptTag(
  settings: AppSettings,
  widgetSrc: string
): Promise<{ ok: boolean; alreadyInstalled?: boolean; error?: string }> {
  if (!hasLiveShopifyCredentials(settings)) {
    return { ok: false, error: 'Configure Shopify credentials first.' };
  }
  const domain = normalizeShopifyDomain(settings.shopifyStoreDomain);
  const auth = await resolveShopifyAccessToken(settings);
  if (!auth.token) {
    return { ok: false, error: auth.error };
  }

  try {
    const listRes = await fetch(
      `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/script_tags.json`,
      {
        headers: {
          'X-Shopify-Access-Token': auth.token,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!listRes.ok) {
      const body = await listRes.text();
      if (listRes.status === 403) {
        return {
          ok: false,
          error:
            'Shopify app does not have "write_script_tags" scope. Use the 1-line Liquid Snippet copy-paste option below instead (works on all themes without extra scopes).',
        };
      }
      return { ok: false, error: `Shopify ScriptTag API ${listRes.status}: ${body.slice(0, 160)}` };
    }

    const existing = (await listRes.json()) as {
      script_tags?: Array<{ id?: number; src?: string }>;
    };
    const tags = existing.script_tags || [];
    const already = tags.some((st) => st.src === widgetSrc);
    if (already) {
      return { ok: true, alreadyInstalled: true };
    }

    const prevOrderPulseTag = tags.find(
      (st) => st.id && typeof st.src === 'string' && st.src.includes('/api/storefront/widget.js')
    );
    if (prevOrderPulseTag?.id) {
      const updateRes = await fetch(
        `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/script_tags/${prevOrderPulseTag.id}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': auth.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            script_tag: {
              id: prevOrderPulseTag.id,
              src: widgetSrc,
            },
          }),
        }
      );
      if (updateRes.ok) {
        return { ok: true };
      }
    }

    const createRes = await fetch(
      `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/script_tags.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': auth.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script_tag: {
            event: 'onload',
            src: widgetSrc,
          },
        }),
      }
    );

    if (!createRes.ok) {
      const body = await createRes.text();
      return { ok: false, error: `ScriptTag install failed (${createRes.status}): ${body.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error installing Shopify ScriptTag',
    };
  }
}
