import type {
  DelhiveryServiceabilityResult,
  ProductCatalogItem,
  StorefrontConfig,
} from './types.js';

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  pincodeGateEnabled: true,
  hideUnavailableProducts: true,
  showDeliveryEstimateOnPdp: true,
  defaultDeliveryDays: 4,
  pincodePromptTitle: 'Check product availability at your pincode',
  unavailableBadgeText: 'Not deliverable to this pincode',
  seoTitleTemplate: '{{title}} | Buy Online at Best Price - {{shop_name}}',
  seoDescriptionTemplate:
    'Shop {{title}} at {{shop_name}}. Fast pan-India delivery, secure COD & online payments. Order now for {{price}}.',
  enableJsonLdSchema: true,
  storefrontAppUrl: '',
};

export const INDIAN_PINCODE_PRESETS: Array<{
  id: string;
  label: string;
  pincodes: string[];
}> = [
  {
    id: 'mumbai_metro',
    label: 'Mumbai Metro',
    pincodes: ['400001', '400011', '400050', '400053', '400070', '400076', '400601'],
  },
  {
    id: 'delhi_ncr',
    label: 'Delhi NCR',
    pincodes: ['110001', '110016', '110025', '110092', '122001', '122002', '201301'],
  },
  {
    id: 'bengaluru',
    label: 'Bengaluru',
    pincodes: ['560001', '560008', '560034', '560038', '560066', '560076', '560102'],
  },
  {
    id: 'hyderabad',
    label: 'Hyderabad',
    pincodes: ['500001', '500016', '500032', '500034', '500081', '500084'],
  },
];

/**
 * Parses comma, space, newline, or semicolon separated text into unique valid 6-digit Indian pincodes.
 */
export function parsePincodeListInput(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const tokens = raw.split(/[\s,;|]+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    const clean = token.trim();
    if (/^[1-9]\d{5}$/.test(clean) && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}

/**
 * Validates and normalizes a single 6-digit Indian pincode.
 */
export function normalizeIndianPincode(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  return /^[1-9]\d{5}$/.test(digits) ? digits : '';
}

export interface ProductPincodeEvaluation {
  productId: string;
  shopifyProductId: string;
  handle: string;
  title: string;
  available: boolean;
  codAvailable: boolean;
  estimatedDays: number | null;
  reason: string;
}

/**
 * Evaluates whether a product is deliverable to a given 6-digit pincode,
 * combining product-level pincode rules with live Delhivery serviceability (when available).
 */
export function evaluateProductForPincode(
  product: ProductCatalogItem,
  rawPincode: string,
  config: Pick<StorefrontConfig, 'defaultDeliveryDays'> = DEFAULT_STOREFRONT_CONFIG,
  delhivery?: DelhiveryServiceabilityResult | null
): ProductPincodeEvaluation {
  const pincode = normalizeIndianPincode(rawPincode);
  const estimatedDays = product.estimatedDeliveryDays ?? config.defaultDeliveryDays ?? 4;

  if (!pincode) {
    return {
      productId: product.id,
      shopifyProductId: product.shopifyProductId,
      handle: product.handle,
      title: product.title,
      available: false,
      codAvailable: false,
      estimatedDays: null,
      reason: 'Enter a valid 6-digit Indian pincode.',
    };
  }

  if (product.status === 'archived') {
    return {
      productId: product.id,
      shopifyProductId: product.shopifyProductId,
      handle: product.handle,
      title: product.title,
      available: false,
      codAvailable: false,
      estimatedDays: null,
      reason: 'Product is archived.',
    };
  }

  if (product.pincodeMode === 'allow_list') {
    const allowedSet = new Set(product.allowedPincodes);
    if (!allowedSet.has(pincode)) {
      return {
        productId: product.id,
        shopifyProductId: product.shopifyProductId,
        handle: product.handle,
        title: product.title,
        available: false,
        codAvailable: false,
        estimatedDays: null,
        reason: `Restricted item — not in the ${product.allowedPincodes.length} allowed pincode(s).`,
      };
    }
  } else if (product.pincodeMode === 'block_list') {
    const blockedSet = new Set(product.blockedPincodes);
    if (blockedSet.has(pincode)) {
      return {
        productId: product.id,
        shopifyProductId: product.shopifyProductId,
        handle: product.handle,
        title: product.title,
        available: false,
        codAvailable: false,
        estimatedDays: null,
        reason: `Pincode ${pincode} is in this product's blocked list.`,
      };
    }
  }

  if (delhivery && delhivery.source === 'delhivery_api' && !delhivery.serviceable) {
    return {
      productId: product.id,
      shopifyProductId: product.shopifyProductId,
      handle: product.handle,
      title: product.title,
      available: false,
      codAvailable: false,
      estimatedDays: null,
      reason: delhivery.remarks || `Delhivery currently does not service ${pincode}.`,
    };
  }

  const codAvailable = Boolean(
    product.allowCod && (!delhivery || delhivery.codAvailable)
  );
  const locationLabel =
    delhivery && delhivery.city
      ? `${delhivery.city}${delhivery.state ? `, ${delhivery.state}` : ''}`
      : pincode;

  return {
    productId: product.id,
    shopifyProductId: product.shopifyProductId,
    handle: product.handle,
    title: product.title,
    available: true,
    codAvailable,
    estimatedDays,
    reason: `Deliverable to ${locationLabel} in ~${estimatedDays} day${estimatedDays === 1 ? '' : 's'}${codAvailable ? ' (COD available)' : ' (Prepaid only)'}`,
  };
}

export interface ProductSeoAudit {
  score: number;
  titleLength: number;
  descriptionLength: number;
  hasAltText: boolean;
  hasCleanHandle: boolean;
  status: 'good' | 'needs_work' | 'missing';
  issues: string[];
}

/**
 * Computes a deterministic 0-100 SEO audit score for a Shopify product.
 */
export function computeSeoAudit(product: ProductCatalogItem): ProductSeoAudit {
  const title = (product.seoTitle || '').trim();
  const desc = (product.seoDescription || '').trim();
  const alt = (product.imageAlt || '').trim();
  const handle = (product.handle || '').trim();
  const issues: string[] = [];

  let score = 0;

  if (!title) {
    issues.push('Missing SEO title');
  } else if (title.length >= 25 && title.length <= 60) {
    score += 35;
  } else {
    score += 18;
    if (title.length < 25) {
      issues.push('SEO title is short (< 25 chars)');
    } else {
      issues.push('SEO title exceeds 60 chars (may truncate on Google)');
    }
  }

  if (!desc) {
    issues.push('Missing meta description');
  } else if (desc.length >= 70 && desc.length <= 160) {
    score += 35;
  } else {
    score += 18;
    if (desc.length < 70) {
      issues.push('Meta description is short (< 70 chars)');
    } else {
      issues.push('Meta description exceeds 160 chars');
    }
  }

  const hasCleanHandle = Boolean(handle && /^[a-z0-9-]+$/.test(handle) && handle.length <= 80);
  if (hasCleanHandle) {
    score += 15;
  } else {
    issues.push(handle ? 'URL handle has uppercase/special chars or is too long' : 'Missing URL handle');
  }

  const hasAltText = Boolean(alt);
  if (hasAltText) {
    score += 15;
  } else {
    issues.push('Missing image alt text');
  }

  const status: ProductSeoAudit['status'] =
    score >= 85 ? 'good' : score >= 45 ? 'needs_work' : 'missing';

  return {
    score,
    titleLength: title.length,
    descriptionLength: desc.length,
    hasAltText,
    hasCleanHandle,
    status,
    issues,
  };
}

export interface StoreSeoSummary {
  totalProducts: number;
  avgScore: number;
  goodCount: number;
  needsWorkCount: number;
  missingCount: number;
  missingAltCount: number;
}

export function computeStoreSeoSummary(products: ProductCatalogItem[]): StoreSeoSummary {
  if (products.length === 0) {
    return {
      totalProducts: 0,
      avgScore: 0,
      goodCount: 0,
      needsWorkCount: 0,
      missingCount: 0,
      missingAltCount: 0,
    };
  }

  let totalScore = 0;
  let goodCount = 0;
  let needsWorkCount = 0;
  let missingCount = 0;
  let missingAltCount = 0;

  for (const product of products) {
    const audit = computeSeoAudit(product);
    totalScore += audit.score;
    if (audit.status === 'good') goodCount += 1;
    else if (audit.status === 'needs_work') needsWorkCount += 1;
    else missingCount += 1;
    if (!audit.hasAltText) missingAltCount += 1;
  }

  return {
    totalProducts: products.length,
    avgScore: Math.round(totalScore / products.length),
    goodCount,
    needsWorkCount,
    missingCount,
    missingAltCount,
  };
}

/**
 * Renders bulk SEO templates using product fields and shop name.
 */
export function renderBulkSeoTemplate(
  template: string,
  product: Pick<ProductCatalogItem, 'title' | 'productType' | 'vendor' | 'price' | 'currency'>,
  shopName: string,
  maxLength?: number
): string {
  const formattedPrice = `${product.currency || 'INR'} ${product.price || '0'}`.trim();
  const rendered = (template || '')
    .replaceAll('{{title}}', (product.title || '').trim())
    .replaceAll('{{product_type}}', (product.productType || 'Collection').trim())
    .replaceAll('{{vendor}}', (product.vendor || shopName || 'Store').trim())
    .replaceAll('{{price}}', formattedPrice)
    .replaceAll('{{shop_name}}', (shopName || 'Our Store').trim())
    .replace(/\s+/g, ' ')
    .trim();

  if (maxLength && rendered.length > maxLength) {
    return `${rendered.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }
  return rendered;
}

/**
 * Slugifies a product title into a clean Shopify-safe URL handle.
 */
export function slugifyProductHandle(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Builds Schema.org Product JSON-LD structured data for rich Google Search snippets.
 */
export function buildProductJsonLd(
  product: ProductCatalogItem,
  storeDomain: string,
  shopName: string
): Record<string, unknown> {
  const cleanDomain = (storeDomain || 'your-store.myshopify.com')
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
  const url = `https://${cleanDomain}/products/${product.handle || ''}`;
  const numericPrice = Number.parseFloat(product.price || '0');

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.seoTitle || product.title,
    description: product.seoDescription || `${product.title} available at ${shopName}`,
    image: product.imageUrl ? [product.imageUrl] : [],
    brand: {
      '@type': 'Brand',
      name: product.vendor || shopName,
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: product.currency || 'INR',
      price: Number.isFinite(numericPrice) ? numericPrice.toFixed(2) : '0.00',
      availability:
        product.status === 'active'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };
}

/**
 * Generates the 1-time Shopify Liquid snippet that connects the store's existing theme
 * to the OrderPulse Storefront Pincode Filter & SEO Bridge.
 */
export function buildShopifyLiquidSnippet(appOrigin: string): string {
  const cleanOrigin = (appOrigin || 'https://YOUR-ORDERPULSE-URL.vercel.app').replace(/\/+$/, '');
  return `{% comment %}
  OrderPulse Storefront Bridge — Pincode Catalog Filter & Live SEO Schema
  Paste once into Snippets -> orderpulse-bridge.liquid and render in theme.liquid before </body>:
  {% render 'orderpulse-bridge' %}
{% endcomment %}
<div id="orderpulse-pincode-bar" data-app-origin="${cleanOrigin}" data-page-type="{{ request.page_type }}" data-product-handle="{{ product.handle | escape }}"></div>
<script src="${cleanOrigin}/api/storefront/widget.js" defer></script>`;
}

export function createSampleCatalogProducts(shopName: string): ProductCatalogItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'prod-sample-101',
      shopifyProductId: 'sample-101',
      title: 'Artisan Belgian Chocolate Cake (500g)',
      handle: 'artisan-belgian-chocolate-cake-500g',
      status: 'active',
      productType: 'Fresh Bakery',
      vendor: shopName || 'Broomies Bakery',
      imageUrl: '',
      imageAlt: 'Artisan Belgian Chocolate Cake 500g fresh bakery box',
      price: '799.00',
      currency: 'INR',
      seoTitle: 'Artisan Belgian Chocolate Cake 500g | Same-Day Delivery',
      seoDescription:
        'Order freshly baked Artisan Belgian Chocolate Cake (500g) crafted with pure cocoa. Check instant pincode delivery & COD availability at checkout.',
      tags: 'fresh, perishable, cake',
      pincodeMode: 'allow_list',
      allowedPincodes: ['400001', '400011', '400050', '400053', '110001', '560001'],
      blockedPincodes: [],
      allowCod: true,
      estimatedDeliveryDays: 1,
      updatedAt: now,
      shopifySyncedAt: null,
    },
    {
      id: 'prod-sample-102',
      shopifyProductId: 'sample-102',
      title: 'Roasted Almond Butter Cookies Tin (350g)',
      handle: 'roasted-almond-butter-cookies-tin',
      status: 'active',
      productType: 'Cookies & Gifts',
      vendor: shopName || 'Broomies Bakery',
      imageUrl: '',
      imageAlt: '',
      price: '549.00',
      currency: 'INR',
      seoTitle: 'Roasted Almond Butter Cookies',
      seoDescription: '',
      tags: 'pan-india, gift-tin, cookies',
      pincodeMode: 'all_india',
      allowedPincodes: [],
      blockedPincodes: ['799001'],
      allowCod: true,
      estimatedDeliveryDays: 4,
      updatedAt: now,
      shopifySyncedAt: null,
    },
    {
      id: 'prod-sample-103',
      shopifyProductId: 'sample-103',
      title: 'Signature Hazelnut Truffle Jar (250g)',
      handle: 'signature-hazelnut-truffle-jar',
      status: 'active',
      productType: 'Spreads & Jars',
      vendor: shopName || 'Broomies Bakery',
      imageUrl: '',
      imageAlt: 'Signature Hazelnut Truffle Jar 250g glass jar',
      price: '449.00',
      currency: 'INR',
      seoTitle: 'Signature Hazelnut Truffle Jar 250g | Gourmet Spread',
      seoDescription:
        'Rich roasted hazelnut & dark chocolate truffle jar made in small batches. Pan-India shipping via Delhivery with prepaid & COD options.',
      tags: 'pan-india, truffle, jar',
      pincodeMode: 'block_list',
      allowedPincodes: [],
      blockedPincodes: ['190001', '194101'],
      allowCod: true,
      estimatedDeliveryDays: 3,
      updatedAt: now,
      shopifySyncedAt: null,
    },
  ];
}
