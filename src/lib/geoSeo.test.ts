import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GEO_SEO_CONFIG,
  SITEMAP_URLS_PER_SHARD,
  buildBakeryStorefrontSchema,
  buildGeoSeoPageData,
  buildGeoSitemapShardXml,
  buildProxyGeoSitemapShardXml,
  buildProxySitemapIndexXml,
  buildSitemapIndexXml,
  buildStorefrontProxyPageUrl,
  buildStorefrontZoneStripData,
  calculateDistanceKm,
  getCoveredLocalities,
  getGeoSeoRefAtIndex,
  getGeoSeoStats,
  normalizeShopifyProxyPrefix,
  optimizeShopifyImageUrl,
  queryGeoSeoPages,
  renderGeoSeoDirectoryHtml,
  renderGeoSeoDirectoryLiquidFragment,
  renderGeoSeoLandingHtml,
  renderGeoSeoShopifyLiquidFragment,
  resolveGeoSeoPageBySlug,
} from './geoSeo';
import { createSampleCatalogProducts } from './storefrontRules';
import { verifyShopifyProxySignature } from '../../server/shopify';

test('calculateDistanceKm computes accurate Faridabad sector distances', () => {
  const sec31 = DEFAULT_GEO_SEO_CONFIG.hubs[0]; // Sector 31
  const sec35 = DEFAULT_GEO_SEO_CONFIG.hubs[2]; // Sector 35
  const d = calculateDistanceKm(sec31.lat, sec31.lng, sec35.lat, sec35.lng);
  assert.ok(d > 1.5 && d < 2.5, `Expected ~1.9 km between Sec 31 & Sec 35, got ${d}`);
  assert.equal(calculateDistanceKm(sec31.lat, sec31.lng, sec31.lat, sec31.lng), 0);
});

test('getCoveredLocalities merges 5km zones around Sector 31, 88, 35 & 42', () => {
  const covered = getCoveredLocalities(DEFAULT_GEO_SEO_CONFIG);
  assert.ok(covered.length >= 65, `Expected >= 65 covered localities, got ${covered.length}`);
  assert.ok(
    covered.every((c) => c.distanceKm <= 5.0),
    'All default Faridabad localities must sit within 5km of at least one hub'
  );

  // Far-away coordinates (Mumbai) should be excluded when added to localities
  const withFar = {
    ...DEFAULT_GEO_SEO_CONFIG,
    localities: [
      ...DEFAULT_GEO_SEO_CONFIG.localities,
      {
        id: 'loc-far',
        name: 'Bandra West',
        slug: 'bandra-west',
        pincode: '400050',
        lat: 19.0596,
        lng: 72.8295,
      },
    ],
  };
  const filtered = getCoveredLocalities(withFar);
  assert.equal(
    filtered.some((c) => c.locality.id === 'loc-far'),
    false,
    'Outside 5km radius localities must be excluded'
  );
});

test('getGeoSeoStats generates 10,000+ programmatic pages by default', () => {
  const stats = getGeoSeoStats(DEFAULT_GEO_SEO_CONFIG);
  assert.equal(stats.activeHubsCount, 4);
  assert.ok(stats.totalPages >= 10_000, `Expected >= 10,000 pages, got ${stats.totalPages}`);
  assert.equal(stats.sitemapShardCount, Math.ceil(stats.totalPages / SITEMAP_URLS_PER_SHARD));
});

test('bidirectional O(1) index <-> slug resolution works across Tiers 1, 2 & 3', () => {
  const stats = getGeoSeoStats(DEFAULT_GEO_SEO_CONFIG);

  const testIndices = [
    0, // Tier 1: Sector 31 hub
    3, // Tier 1: Sector 42 hub
    4, // Tier 2 first entry
    stats.tier1Count + Math.floor(stats.tier2Count / 2), // Tier 2 middle
    stats.tier1Count + stats.tier2Count, // Tier 3 first entry
    stats.totalPages - 1, // Tier 3 last entry
  ];

  for (const idx of testIndices) {
    const ref = getGeoSeoRefAtIndex(DEFAULT_GEO_SEO_CONFIG, idx);
    assert.ok(ref, `Missing ref at index ${idx}`);
    const back = resolveGeoSeoPageBySlug(DEFAULT_GEO_SEO_CONFIG, ref.slug);
    assert.ok(back, `Slug did not resolve back: ${ref.slug}`);
    assert.equal(back.slug, ref.slug);
    assert.equal(back.tier, ref.tier);
  }

  assert.equal(resolveGeoSeoPageBySlug(DEFAULT_GEO_SEO_CONFIG, 'non-existent-city-slug'), null);
});

test('buildGeoSeoPageData creates valid SEO meta, Broomies links, and Bakery GeoCircle JSON-LD', () => {
  const ref = resolveGeoSeoPageBySlug(
    DEFAULT_GEO_SEO_CONFIG,
    'custom-cakes-in-sector-88-faridabad-same-day-delivery'
  );
  assert.ok(ref, 'Expected Sector 88 custom cakes same-day page to resolve');
  const products = createSampleCatalogProducts('Broomies Bakery');
  const data = buildGeoSeoPageData(
    DEFAULT_GEO_SEO_CONFIG,
    ref,
    products,
    'https://whatsa86.vercel.app'
  );

  assert.equal(data.primaryWebsiteUrl, 'https://broomiesbakery.in');
  assert.equal(
    data.proxyPageUrl,
    'https://broomiesbakery.in/apps/cakes/custom-cakes-in-sector-88-faridabad-same-day-delivery'
  );
  assert.ok(data.seoTitle.length <= 64, `Title too long: ${data.seoTitle.length}`);
  assert.ok(data.metaDescription.length <= 160, `Description too long: ${data.metaDescription.length}`);
  assert.ok(data.h1.includes('Sector 88'));
  assert.equal(data.pincode, '121002');
  assert.ok(data.matchedProducts.length > 0);

  const bakerySchema = buildBakeryStorefrontSchema(DEFAULT_GEO_SEO_CONFIG);
  assert.equal(bakerySchema['@type'], 'Bakery');
  assert.equal(bakerySchema.url, 'https://broomiesbakery.in');
  const areaServed = bakerySchema.areaServed as Array<{ '@type': string }>;
  assert.equal(areaServed.filter((a) => a['@type'] === 'GeoCircle').length, 4);
});

test('queryGeoSeoPages & XML sitemaps slice accurately across shards', () => {
  const res = queryGeoSeoPages(DEFAULT_GEO_SEO_CONFIG, {
    q: 'ready to eat cakes',
    hubId: 'hub-sec-31',
    page: 1,
    limit: 10,
  });
  assert.ok(res.totalMatched > 0);
  assert.equal(res.items.length, 10);

  const stats = getGeoSeoStats(DEFAULT_GEO_SEO_CONFIG);
  const indexXml = buildSitemapIndexXml('https://whatsa86.vercel.app', stats.totalPages);
  assert.ok(indexXml.includes('<sitemapindex'));
  assert.ok(indexXml.includes('/sitemap-geo/1.xml'));
  assert.ok(indexXml.includes(`/sitemap-geo/${stats.sitemapShardCount}.xml`));

  const shard1 = buildGeoSitemapShardXml('https://whatsa86.vercel.app', DEFAULT_GEO_SEO_CONFIG, 1);
  assert.ok(shard1.includes('<urlset'));
  assert.ok(shard1.includes('https://whatsa86.vercel.app/seo/faridabad'));
  assert.ok(shard1.includes('cakes-near-sector-31-faridabad'));
});

test('renderGeoSeoLandingHtml & Directory match Broomies Bakery sky-blue Dawn card layout', () => {
  const ref = resolveGeoSeoPageBySlug(
    DEFAULT_GEO_SEO_CONFIG,
    'custom-cakes-in-sector-31-faridabad'
  );
  assert.ok(ref);
  const products = createSampleCatalogProducts('Broomies Bakery');
  const data = buildGeoSeoPageData(
    DEFAULT_GEO_SEO_CONFIG,
    ref,
    products,
    'https://whatsa86.vercel.app'
  );
  const html = renderGeoSeoLandingHtml(data, DEFAULT_GEO_SEO_CONFIG, '+919266424088');
  assert.ok(html.includes('#77c5ee'));
  assert.ok(html.includes('Choose options'));
  assert.ok(html.includes('From Rs.'));
  assert.ok(html.includes('Theme Cakes'));
  assert.ok(html.includes('Chat on WhatsApp'));
  assert.ok(html.includes('https://wa.me/919266424088'));

  const dirHtml = renderGeoSeoDirectoryHtml(DEFAULT_GEO_SEO_CONFIG, 'https://whatsa86.vercel.app');
  assert.ok(dirHtml.includes('#77c5ee'));
  assert.ok(dirHtml.includes('Sector 31'));
  assert.ok(dirHtml.includes('Chat on WhatsApp'));
});

test('Shopify App Proxy prefix, Liquid fragments, proxy XML sitemaps, and HMAC signature verification work cleanly', () => {
  assert.equal(normalizeShopifyProxyPrefix(''), '/apps/cakes');
  assert.equal(normalizeShopifyProxyPrefix('a/cakes/'), '/a/cakes');
  assert.equal(normalizeShopifyProxyPrefix('custom-cakes'), '/apps/custom-cakes');

  assert.equal(
    buildStorefrontProxyPageUrl(DEFAULT_GEO_SEO_CONFIG, 'custom-cakes-in-sector-31-faridabad'),
    'https://broomiesbakery.in/apps/cakes/custom-cakes-in-sector-31-faridabad'
  );

  const strip = buildStorefrontZoneStripData(DEFAULT_GEO_SEO_CONFIG);
  assert.equal(strip.directoryHref, '/apps/cakes');
  assert.equal(strip.hubLinks.length, 4);
  assert.ok(strip.hubLinks[0].href.startsWith('/apps/cakes/'));

  const ref = resolveGeoSeoPageBySlug(
    DEFAULT_GEO_SEO_CONFIG,
    'ready-to-eat-cakes-in-sector-35-faridabad'
  );
  assert.ok(ref);
  const products = createSampleCatalogProducts('Broomies Bakery');
  const proxyData = buildGeoSeoPageData(
    DEFAULT_GEO_SEO_CONFIG,
    ref,
    products,
    'https://whatsa86.vercel.app',
    { useProxyCanonical: true }
  );
  assert.equal(
    proxyData.canonicalUrl,
    'https://broomiesbakery.in/apps/cakes/ready-to-eat-cakes-in-sector-35-faridabad'
  );
  assert.ok(proxyData.siblingCategoryLinks[0].href.startsWith('/apps/cakes/'));

  const liquid = renderGeoSeoShopifyLiquidFragment(proxyData, DEFAULT_GEO_SEO_CONFIG, '+919266424088');
  assert.ok(!liquid.includes('<!DOCTYPE html'), 'Liquid fragment must omit DOCTYPE so Shopify wraps theme');
  assert.ok(!liquid.includes('<body'), 'Liquid fragment must omit body tag');
  assert.ok(liquid.includes('Choose options'));
  assert.ok(liquid.includes('/products/'));
  assert.ok(liquid.includes('application/ld+json'));
  assert.ok(!liquid.includes('Popular Searches:'), 'Spammy Popular Searches line must stay removed');
  assert.ok(!liquid.includes('Express Radius'), 'Technical Express Radius text must stay removed');

  // Verify 30 products render cleanly when 40 products exist in catalog
  const expandedCatalog = Array.from({ length: 40 }, (_, i) => ({
    ...products[i % products.length],
    id: `exp-${i}`,
    handle: `custom-cake-${i}`,
    title: `Broomies Custom Cake #${i + 1}`,
    imageUrl: `https://cdn.shopify.com/s/files/1/cake-${i}.png?v=1`,
    pincodeMode: 'all_india' as const,
  }));
  const richData = buildGeoSeoPageData(
    DEFAULT_GEO_SEO_CONFIG,
    ref,
    expandedCatalog,
    'https://faridabad.broomiesbakery.in',
    { useProxyCanonical: true }
  );
  assert.equal(richData.matchedProducts.length, 30);

  assert.equal(
    optimizeShopifyImageUrl('https://cdn.shopify.com/s/files/1/cake.png?v=123', 480),
    'https://cdn.shopify.com/s/files/1/cake.png?v=123&width=480'
  );
  const richLiquid = renderGeoSeoShopifyLiquidFragment(
    richData,
    DEFAULT_GEO_SEO_CONFIG,
    '+919266424088'
  );
  assert.ok(richLiquid.includes('content-visibility: auto'));
  assert.ok(richLiquid.includes('loading="lazy"'));
  assert.ok(richLiquid.includes('width=480'));

  const dirLiquid = renderGeoSeoDirectoryLiquidFragment(DEFAULT_GEO_SEO_CONFIG, '+919266424088');
  assert.ok(!dirLiquid.includes('<!DOCTYPE html'));
  assert.ok(dirLiquid.includes('/apps/cakes/cakes-near-sector-31-faridabad'));

  const proxyIdxXml = buildProxySitemapIndexXml(DEFAULT_GEO_SEO_CONFIG);
  assert.ok(proxyIdxXml.includes('https://broomiesbakery.in/apps/cakes/sitemap-geo/1.xml'));

  const proxyShard1 = buildProxyGeoSitemapShardXml(DEFAULT_GEO_SEO_CONFIG, 1);
  assert.ok(proxyShard1.includes('https://broomiesbakery.in/apps/cakes/cakes-near-sector-31-faridabad'));

  // Verify official Shopify App Proxy HMAC-SHA256 query signature check
  const secret = 'shpss_test_secret_12345';
  const params = {
    extra: ['1', '2'],
    shop: 'broomies-bakery.myshopify.com',
    path_prefix: '/apps/cakes',
    timestamp: '1700000000',
  };
  const baseStr = 'extra=1,2path_prefix=/apps/cakesshop=broomies-bakery.myshopify.comtimestamp=1700000000';
  const validSig = crypto.createHmac('sha256', secret).update(baseStr).digest('hex');

  assert.equal(verifyShopifyProxySignature({ ...params, signature: validSig }, secret), true);
  assert.equal(
    verifyShopifyProxySignature({ ...params, shop: 'evil.myshopify.com', signature: validSig }, secret),
    false
  );
  assert.equal(verifyShopifyProxySignature({ ...params, signature: '0'.repeat(64) }, secret), false);
});


