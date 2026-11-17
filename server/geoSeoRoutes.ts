import type { Express, Request, Response } from 'express';
import {
  buildGeoSeoPageData,
  buildGeoSitemapShardXml,
  buildProxyGeoSitemapShardXml,
  buildProxySitemapIndexXml,
  buildSitemapIndexXml,
  buildTier1Slug,
  buildTier2Slug,
  getCoveredLocalities,
  getGeoSeoStats,
  normalizeShopifyProxyPrefix,
  normalizeWebsiteBaseUrl,
  queryGeoSeoPages,
  renderGeoSeoDirectoryHtml,
  renderGeoSeoDirectoryLiquidFragment,
  renderGeoSeoLandingHtml,
  renderGeoSeoShopifyLiquidFragment,
  resolveGeoSeoPageBySlug,
} from '../src/lib/geoSeo.js';
import { normalizeStorefrontOrigin } from '../src/lib/storefrontRules.js';
import type { GeoSeoConfig, ProductCatalogItem } from '../src/lib/types.js';
import { upsertShopifyStorePage, verifyShopifyProxySignature } from './shopify.js';
import { store } from './store.js';

interface PublicStorefrontCatalogCache {
  siteUrl: string;
  fetchedAt: number;
  items: ProductCatalogItem[];
}

let publicCatalogCache: PublicStorefrontCatalogCache | null = null;
const PUBLIC_CATALOG_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchPublicStorefrontProducts(siteUrl: string): Promise<ProductCatalogItem[]> {
  const cleanSite = normalizeWebsiteBaseUrl(siteUrl);
  const now = Date.now();
  if (
    publicCatalogCache &&
    publicCatalogCache.siteUrl === cleanSite &&
    now - publicCatalogCache.fetchedAt < PUBLIC_CATALOG_CACHE_TTL_MS
  ) {
    return publicCatalogCache.items;
  }

  try {
    const res = await fetch(`${cleanSite}/products.json?limit=250`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) {
      return publicCatalogCache?.items || [];
    }
    const payload = (await res.json()) as {
      products?: Array<{
        id?: number | string;
        title?: string;
        handle?: string;
        product_type?: string;
        vendor?: string;
        tags?: string[] | string;
        images?: Array<{ src?: string; alt?: string | null }>;
        variants?: Array<{ price?: string }>;
      }>;
    };
    const rawList = Array.isArray(payload.products) ? payload.products : [];
    const mapped: ProductCatalogItem[] = rawList
      .filter((p) => p && p.handle && p.title)
      .map((p) => {
        const firstImage = Array.isArray(p.images) ? p.images[0] : undefined;
        const firstVariant = Array.isArray(p.variants) ? p.variants[0] : undefined;
        const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : String(p.tags || '');
        return {
          id: `sf-${String(p.id || p.handle)}`,
          shopifyProductId: String(p.id || p.handle),
          handle: String(p.handle),
          title: String(p.title),
          productType: String(p.product_type || 'Cake'),
          vendor: String(p.vendor || 'Broomies Bakery'),
          price: String(firstVariant?.price || '800.00'),
          currency: 'INR',
          imageUrl: firstImage?.src || '',
          imageAlt: firstImage?.alt || String(p.title),
          status: 'active',
          pincodeMode: 'all_india',
          allowedPincodes: [],
          blockedPincodes: [],
          allowCod: true,
          estimatedDeliveryDays: 1,
          tags: tagsStr,
          seoTitle: '',
          seoDescription: '',
          updatedAt: new Date(now).toISOString(),
        };
      });

    publicCatalogCache = {
      siteUrl: cleanSite,
      fetchedAt: now,
      items: mapped,
    };
    return mapped;
  } catch {
    return publicCatalogCache?.items || [];
  }
}

async function getEnrichedGeoProducts(geoConfig: GeoSeoConfig): Promise<ProductCatalogItem[]> {
  const local = store.getProducts();
  if (local.length >= 60) {
    return local;
  }

  const livePublic = await fetchPublicStorefrontProducts(geoConfig.primaryWebsiteUrl);
  if (livePublic.length === 0) {
    return local;
  }

  const seenHandles = new Set(local.map((p) => (p.handle || '').toLowerCase()).filter(Boolean));
  const merged = [...local];
  for (const item of livePublic) {
    const h = (item.handle || '').toLowerCase();
    if (h && !seenHandles.has(h)) {
      seenHandles.add(h);
      merged.push(item);
    }
  }
  return merged;
}

function resolvePublicSeoHost(req: Request): string {
  const sfConfig = store.getStorefrontConfig();
  return normalizeStorefrontOrigin(
    sfConfig.storefrontAppUrl,
    req.get('host'),
    req.headers['x-forwarded-proto'],
    req.protocol
  );
}

export function registerGeoSeoRoutes(app: Express) {
  // Search Engine Robots Directive linking XML Sitemap Index
  app.get('/robots.txt', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const host = resolvePublicSeoHost(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(
      `User-agent: *\nAllow: /seo/\nAllow: /sitemap.xml\nAllow: /sitemap-geo/\nSitemap: ${host}/sitemap.xml\n`
    );
  });

  // Master XML Sitemap Index (<sitemapindex>) referencing all 5,000-URL shards
  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoConfig = store.getGeoSeoConfig();
    const stats = getGeoSeoStats(geoConfig);
    const host = resolvePublicSeoHost(req);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(buildSitemapIndexXml(host, stats.totalPages));
  });

  // Sharded Geo-SEO Sitemaps (/sitemap-geo/1.xml, /sitemap-geo/2.xml, ...)
  app.get('/sitemap-geo/:shard', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const shardRaw = String(req.params.shard || '1').replace(/\.xml$/i, '');
    const shardNum = Number.parseInt(shardRaw, 10);
    const geoConfig = store.getGeoSeoConfig();
    const stats = getGeoSeoStats(geoConfig);
    if (!Number.isFinite(shardNum) || shardNum < 1 || shardNum > stats.sitemapShardCount) {
      res.status(404).type('text/plain').send('Sitemap shard not found');
      return;
    }
    const host = resolvePublicSeoHost(req);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(buildGeoSitemapShardXml(host, geoConfig, shardNum));
  });

  // Master Faridabad Unified Cake Zones Directory Page (internal link hub for Googlebot)
  app.get('/seo/faridabad', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoConfig = store.getGeoSeoConfig();
    const host = resolvePublicSeoHost(req);
    const waPhone = store.getWhatsAppMeta()?.phoneNumber || undefined;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderGeoSeoDirectoryHtml(geoConfig, host, waPhone));
  });

  // 10,000+ Dynamic Programmatic Geo-SEO Landing Pages
  app.get('/seo/faridabad/:slug', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const slug = String(req.params.slug || '').trim();
    const geoConfig = store.getGeoSeoConfig();
    if (!geoConfig.enabled) {
      res.status(404).send('Geo-SEO pages are currently paused in OrderPulse SEO Manager.');
      return;
    }
    const ref = resolveGeoSeoPageBySlug(geoConfig, slug);
    if (!ref) {
      res.status(404).type('text/html').send(
        `<!DOCTYPE html><html><head><title>Page Not Found</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>Faridabad Cake Zone Page Not Found</h1><p><a href="/seo/faridabad">Browse All Faridabad Cake Zones</a></p></body></html>`
      );
      return;
    }
    const host = resolvePublicSeoHost(req);
    const waPhone = store.getWhatsAppMeta()?.phoneNumber || undefined;
    const products = await getEnrichedGeoProducts(geoConfig);
    const pageData = buildGeoSeoPageData(geoConfig, ref, products, host);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderGeoSeoLandingHtml(pageData, geoConfig, waPhone));
  });

  // =========================================================================
  // SHOPIFY APP PROXY ROUTES — Hosts all 16,436+ pages on broomiesbakery.in
  // Mapping in Shopify Dev Dashboard:
  //   Subpath prefix: apps | Subpath: cakes
  //   Proxy URL: https://faridabad.broomiesbakery.in/api/shopify-proxy
  // =========================================================================
  const inspectShopifyProxySignature = (req: Request): 'valid' | 'mismatch' | 'unsigned' => {
    const settings = store.getSettings();
    const secret = (settings.shopifyClientSecret || settings.shopifyWebhookSecret || '').trim();
    const hasSig = typeof req.query.signature === 'string' && req.query.signature.length > 0;
    if (!hasSig || !secret) {
      return 'unsigned';
    }
    const valid = verifyShopifyProxySignature(req.query as Record<string, unknown>, secret);
    if (!valid) {
      console.warn('[shopify-proxy] Signature mismatch on public read-only proxy route; serving page cleanly to avoid Shopify 404 masking.');
    }
    return valid ? 'valid' : 'mismatch';
  };

  const resolveEffectiveProxyConfig = (req: Request, base: GeoSeoConfig): GeoSeoConfig => {
    const pathPrefixQuery = typeof req.query.path_prefix === 'string' ? req.query.path_prefix : '';
    const effectivePrefix = pathPrefixQuery
      ? normalizeShopifyProxyPrefix(pathPrefixQuery)
      : normalizeShopifyProxyPrefix(base.shopifyProxyPrefix);
    return {
      ...base,
      shopifyProxyPrefix: effectivePrefix,
    };
  };

  // Domain-hosted Master XML Sitemap Index: https://broomiesbakery.in/apps/cakes/sitemap.xml
  app.get('/api/shopify-proxy/sitemap.xml', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const sigStatus = inspectShopifyProxySignature(req);
    const geoConfig = resolveEffectiveProxyConfig(req, store.getGeoSeoConfig());
    res.setHeader('X-OrderPulse-Proxy-Sig', sigStatus);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(buildProxySitemapIndexXml(geoConfig));
  });

  // Domain-hosted Geo-SEO XML Sitemap Shards: https://broomiesbakery.in/apps/cakes/sitemap-geo/1.xml
  app.get('/api/shopify-proxy/sitemap-geo/:shard', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const sigStatus = inspectShopifyProxySignature(req);
    const shardRaw = String(req.params.shard || '1').replace(/\.xml$/i, '');
    const shardNum = Number.parseInt(shardRaw, 10);
    const geoConfig = resolveEffectiveProxyConfig(req, store.getGeoSeoConfig());
    const stats = getGeoSeoStats(geoConfig);
    res.setHeader('X-OrderPulse-Proxy-Sig', sigStatus);
    if (!Number.isFinite(shardNum) || shardNum < 1 || shardNum > stats.sitemapShardCount) {
      res.status(404).type('text/plain').send('Proxy sitemap shard not found');
      return;
    }
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(buildProxyGeoSitemapShardXml(geoConfig, shardNum));
  });

  // Root Storefront Zone Directory on broomiesbakery.in/apps/cakes
  app.get('/api/shopify-proxy', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const sigStatus = inspectShopifyProxySignature(req);
    const geoConfig = resolveEffectiveProxyConfig(req, store.getGeoSeoConfig());
    const waPhone = store.getWhatsAppMeta()?.phoneNumber || undefined;
    res.setHeader('X-OrderPulse-Proxy-Sig', sigStatus);
    res.setHeader('Content-Type', 'application/liquid; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderGeoSeoDirectoryLiquidFragment(geoConfig, waPhone));
  });

  // All 16,436+ Cake Landing Pages rendered inside broomiesbakery.in/apps/cakes/:slug
  app.get('/api/shopify-proxy/:slug', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const sigStatus = inspectShopifyProxySignature(req);
    const slug = String(req.params.slug || '').replace(/^\/+|\/+$/g, '').trim();
    const geoConfig = resolveEffectiveProxyConfig(req, store.getGeoSeoConfig());
    const proxyPrefix = normalizeShopifyProxyPrefix(geoConfig.shopifyProxyPrefix);
    const waPhone = store.getWhatsAppMeta()?.phoneNumber || undefined;
    res.setHeader('X-OrderPulse-Proxy-Sig', sigStatus);

    if (!slug) {
      res.setHeader('Content-Type', 'application/liquid; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(renderGeoSeoDirectoryLiquidFragment(geoConfig, waPhone));
      return;
    }

    if (!geoConfig.enabled) {
      res.status(404).setHeader('Content-Type', 'application/liquid; charset=utf-8').send(
        `<div style="padding:40px;text-align:center;"><h1>Faridabad Cake Zones Paused</h1><p><a href="/collections/all">Browse All Cakes</a></p></div>`
      );
      return;
    }

    const ref = resolveGeoSeoPageBySlug(geoConfig, slug);
    if (!ref) {
      res.status(404).setHeader('Content-Type', 'application/liquid; charset=utf-8').send(
        `<div style="padding:40px;text-align:center;"><h1>Cake Delivery Zone Not Found</h1><p><a href="${proxyPrefix}">Browse All Faridabad Cake Zones</a> · <a href="/collections/all">Shop Cakes</a></p></div>`
      );
      return;
    }

    const host = resolvePublicSeoHost(req);
    const products = await getEnrichedGeoProducts(geoConfig);
    const pageData = buildGeoSeoPageData(geoConfig, ref, products, host, {
      useProxyCanonical: true,
    });
    res.setHeader('Content-Type', 'application/liquid; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderGeoSeoShopifyLiquidFragment(pageData, geoConfig, waPhone));
  });

  // Diagnostic API: Live probe of both Vercel App Proxy endpoint & custom Shopify domain route
  app.get('/api/seo/test-proxy', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoConfig = store.getGeoSeoConfig();
    const siteUrl = normalizeWebsiteBaseUrl(geoConfig.primaryWebsiteUrl);
    const proxyPrefix = normalizeShopifyProxyPrefix(geoConfig.shopifyProxyPrefix);
    const sampleSlug = 'cakes-near-sector-31-faridabad';
    const storefrontTestUrl = `${siteUrl}${proxyPrefix}/${sampleSlug}`;
    const backendOrigin = resolvePublicSeoHost(req);
    const backendTestUrl = `${backendOrigin}/api/shopify-proxy/${sampleSlug}`;

    let storefrontStatus = 0;
    let storefrontOk = false;
    let storefrontContentLength = 0;
    let storefrontError = '';

    try {
      const probe = await fetch(storefrontTestUrl, {
        method: 'GET',
        headers: { Accept: 'text/html' },
        signal: AbortSignal.timeout(5000),
      });
      storefrontStatus = probe.status;
      const body = await probe.text();
      storefrontContentLength = body.length;
      storefrontOk = probe.ok && (body.includes('bb-proxy-wrap') || body.includes('Broomies Bakery'));
    } catch (err) {
      storefrontError = err instanceof Error ? err.message : 'Request failed';
    }

    let backendOk = false;
    let backendStatus = 0;
    try {
      const bProbe = await fetch(backendTestUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      backendStatus = bProbe.status;
      backendOk = bProbe.ok;
    } catch {
      backendOk = false;
    }

    let diagnosticHint = '';
    if (storefrontOk) {
      diagnosticHint = `Shopify App Proxy live hai! ${storefrontTestUrl} 200 OK render kar raha hai.`;
    } else if (storefrontStatus === 404 && storefrontContentLength === 0) {
      diagnosticHint =
        'Shopify abhi /apps/cakes par empty HTTP 404 de raha hai — iska matlab dev.shopify.com me App Proxy wala version abhi Released/Active nahi hua hai, ya Subpath/Proxy URL me mismatch hai.';
    } else if (storefrontStatus === 404) {
      diagnosticHint = `Shopify ne HTTP 404 return kiya (${storefrontError || 'route not active'}). Dev Dashboard me Version Release verify karein.`;
    } else {
      diagnosticHint = storefrontError || `Storefront returned HTTP ${storefrontStatus}.`;
    }

    res.json({
      ok: true,
      storefrontTestUrl,
      storefrontStatus,
      storefrontOk,
      storefrontContentLength,
      backendTestUrl,
      backendStatus,
      backendOk,
      diagnosticHint,
    });
  });

  // Dashboard API: Read Geo-SEO Config & Stats
  app.get('/api/seo/geo-config', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoSeoConfig = store.getGeoSeoConfig();
    res.json({
      ok: true,
      geoSeoConfig,
      stats: getGeoSeoStats(geoSeoConfig),
      coveredLocalities: getCoveredLocalities(geoSeoConfig),
    });
  });

  // Dashboard API: Save Geo-SEO Zones, Localities, Categories, Modifiers & Target URL
  app.post('/api/seo/geo-config', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const body = (req.body || {}) as Partial<GeoSeoConfig>;
    const cur = store.getGeoSeoConfig();

    const updated = store.updateGeoSeoConfig({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : cur.enabled,
      primaryWebsiteUrl:
        typeof body.primaryWebsiteUrl === 'string' && body.primaryWebsiteUrl.trim()
          ? normalizeWebsiteBaseUrl(body.primaryWebsiteUrl)
          : cur.primaryWebsiteUrl,
      brandName:
        typeof body.brandName === 'string' && body.brandName.trim()
          ? body.brandName.trim()
          : cur.brandName,
      cityName:
        typeof body.cityName === 'string' && body.cityName.trim()
          ? body.cityName.trim()
          : cur.cityName,
      stateName:
        typeof body.stateName === 'string' && body.stateName.trim()
          ? body.stateName.trim()
          : cur.stateName,
      combineAllHubsIntoSingleZone:
        typeof body.combineAllHubsIntoSingleZone === 'boolean'
          ? body.combineAllHubsIntoSingleZone
          : cur.combineAllHubsIntoSingleZone,
      includeTier2Matrix:
        typeof body.includeTier2Matrix === 'boolean'
          ? body.includeTier2Matrix
          : cur.includeTier2Matrix,
      includeTier3Matrix:
        typeof body.includeTier3Matrix === 'boolean'
          ? body.includeTier3Matrix
          : cur.includeTier3Matrix,
      injectStorefrontGeoSchema:
        typeof body.injectStorefrontGeoSchema === 'boolean'
          ? body.injectStorefrontGeoSchema
          : cur.injectStorefrontGeoSchema,
      shopifyProxyPrefix:
        typeof body.shopifyProxyPrefix === 'string' && body.shopifyProxyPrefix.trim()
          ? normalizeShopifyProxyPrefix(body.shopifyProxyPrefix)
          : normalizeShopifyProxyPrefix(cur.shopifyProxyPrefix),
      showStorefrontZoneFooter:
        typeof body.showStorefrontZoneFooter === 'boolean'
          ? body.showStorefrontZoneFooter
          : cur.showStorefrontZoneFooter ?? true,
      hubs: Array.isArray(body.hubs) && body.hubs.length > 0 ? body.hubs : cur.hubs,
      localities:
        Array.isArray(body.localities) && body.localities.length > 0
          ? body.localities
          : cur.localities,
      categories:
        Array.isArray(body.categories) && body.categories.length > 0
          ? body.categories
          : cur.categories,
      modifiers:
        Array.isArray(body.modifiers) && body.modifiers.length > 0
          ? body.modifiers
          : cur.modifiers,
    });

    await store.flushRemote();
    res.json({
      ok: true,
      geoSeoConfig: updated,
      stats: getGeoSeoStats(updated),
      coveredLocalities: getCoveredLocalities(updated),
    });
  });

  // Dashboard API: Query & paginate across 10,000+ generated landing pages
  app.get('/api/seo/pages', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoSeoConfig = store.getGeoSeoConfig();
    const q = String(req.query.q || '');
    const hubId = String(req.query.hubId || '');
    const categoryId = String(req.query.categoryId || '');
    const page = Number.parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = Number.parseInt(String(req.query.limit || '20'), 10) || 20;

    const result = queryGeoSeoPages(geoSeoConfig, {
      q,
      hubId,
      categoryId,
      page,
      limit,
    });

    res.json({
      ok: true,
      stats: getGeoSeoStats(geoSeoConfig),
      hostOrigin: resolvePublicSeoHost(req),
      ...result,
    });
  });

  // Dashboard API: Inspect full Schema JSON-LD & SEO payload of any landing page slug
  app.get('/api/seo/page-inspect/:slug', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoSeoConfig = store.getGeoSeoConfig();
    const slug = String(req.params.slug || '');
    const ref = resolveGeoSeoPageBySlug(geoSeoConfig, slug);
    if (!ref) {
      res.status(404).json({ ok: false, error: 'Landing page slug not found in active zone matrix.' });
      return;
    }
    const host = resolvePublicSeoHost(req);
    const pageData = buildGeoSeoPageData(geoSeoConfig, ref, store.getProducts(), host);
    res.json({ ok: true, pageData });
  });

  // Dashboard API: Push Unified Zone Pillar & Priority Local Pages directly into broomiesbakery.in/pages/...
  app.post('/api/seo/push-shopify-pages', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const body = (req.body || {}) as { includePriorityLocalPages?: boolean };
    const settings = store.getSettings();
    const geoConfig = store.getGeoSeoConfig();
    const covered = getCoveredLocalities(geoConfig);
    const activeHubs = (geoConfig.hubs || []).filter((h) => h.enabled);
    const activeCats = (geoConfig.categories || []).filter((c) => c.enabled);
    const siteUrl = normalizeWebsiteBaseUrl(geoConfig.primaryWebsiteUrl);
    const proxyPrefix = normalizeShopifyProxyPrefix(geoConfig.shopifyProxyPrefix);

    const results: Array<{ handle: string; ok: boolean; action?: string; error?: string }> = [];

    // 1. Unified Super-Zone Directory Pillar Page on broomiesbakery.in/pages/faridabad-cake-delivery-zones
    const directoryHtml = `
      <div class="broomies-geo-pillar">
        <p><strong>${geoConfig.brandName}</strong> delivers custom designer cakes &amp; fresh ready-to-eat cakes across our unified 5 km delivery zone covering <strong>${activeHubs.map((h) => `${h.name} (${h.pincode})`).join(', ')}</strong> in ${geoConfig.cityName}.</p>
        <h2>Covered Sectors &amp; Colonies (Within 5 km Radius)</h2>
        <ul>
          ${covered
            .slice(0, 45)
            .map(
              (c) =>
                `<li><a href="${proxyPrefix}/custom-cakes-in-${c.locality.slug}-faridabad">${c.locality.name} (${c.locality.pincode})</a> — ${c.distanceKm.toFixed(1)} km from ${c.nearestHub.name} Hub</li>`
            )
            .join('')}
        </ul>
        <p><a href="${proxyPrefix}">View All ${getGeoSeoStats(geoConfig).totalPages.toLocaleString()} Faridabad Cake Delivery Pages</a> | <a href="/collections/all">Shop Cakes Online</a></p>
      </div>
    `;

    const mainPush = await upsertShopifyStorePage(settings, {
      title: `Custom & Ready to Eat Cakes in Faridabad | ${geoConfig.brandName}`,
      handle: 'faridabad-cake-delivery-zones',
      bodyHtml: directoryHtml,
      metaTitle: `Custom & Ready to Eat Cakes Faridabad | ${geoConfig.brandName}`,
      metaDescription: `Order fresh custom cakes & ready to eat cakes in Faridabad Sector 31, 88, 35 & 42 (5 km zone). Same-day & midnight delivery at ${siteUrl.replace(/^https?:\/\//, '')}.`,
    });
    results.push({ handle: 'faridabad-cake-delivery-zones', ...mainPush });

    // If Shopify lacks write_content permission, stop immediately with clear message
    if (!mainPush.ok && mainPush.error?.includes('write_content')) {
      res.status(400).json({ ok: false, error: mainPush.error, results });
      return;
    }

    // 2. Push one dedicated Shopify Page per active 5km Zone Hub (Sector 31, 88, 35, 42)
    for (const hub of activeHubs) {
      const hubSectors = covered.filter((c) => c.matchingHubIds.includes(hub.id));
      const handle = buildTier1Slug(hub, geoConfig.cityName);
      const hubBody = `
        <div class="broomies-geo-hub">
          <p>Freshly baked <strong>Custom Cakes</strong>, <strong>Ready to Eat Cakes</strong>, Birthday Cakes, and Eggless Designer Cakes delivered within <strong>${hub.radiusKm} km of ${hub.name}, ${geoConfig.cityName} (${hub.pincode})</strong>.</p>
          <h3>Nearby Covered Locations (${hubSectors.length} Areas)</h3>
          <ul>
            ${hubSectors
              .map(
                (s) =>
                  `<li><a href="${proxyPrefix}/custom-cakes-in-${s.locality.slug}-faridabad">Custom Cakes in ${s.locality.name}</a> · <a href="${proxyPrefix}/ready-to-eat-cakes-in-${s.locality.slug}-faridabad">Ready to Eat Cakes in ${s.locality.name}</a> (${s.distanceKm.toFixed(1)} km)</li>`
              )
              .join('')}
          </ul>
          <p><a href="/collections/all">Browse &amp; Order Fresh Cakes on ${geoConfig.brandName}</a></p>
        </div>
      `;
      const pushRes = await upsertShopifyStorePage(settings, {
        title: `Custom & Ready to Eat Cakes Near ${hub.name} ${geoConfig.cityName} (${hub.radiusKm} km)`,
        handle,
        bodyHtml: hubBody,
        metaTitle: `Cakes Near ${hub.name} ${geoConfig.cityName} | ${geoConfig.brandName}`,
        metaDescription: `Order fresh custom cakes & ready to eat cakes within ${hub.radiusKm} km of ${hub.name}, ${geoConfig.cityName} (${hub.pincode}). Fast doorstep & midnight delivery.`,
      });
      results.push({ handle, ...pushRes });
    }

    // 3. Optional Priority Sector x Custom/Ready-to-Eat Native /pages/... push (top 16 priority pages)
    if (body.includePriorityLocalPages) {
      const priorityLocalities = activeHubs
        .map((hub) => covered.find((c) => c.locality.slug === hub.slug) || covered.find((c) => c.nearestHub.id === hub.id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
      const priorityCats = activeCats.slice(0, 4); // Custom Cakes, Ready to Eat Cakes, Birthday Cakes, Eggless Fresh Cakes
      for (const cov of priorityLocalities) {
        for (const cat of priorityCats) {
          const handle = buildTier2Slug(cat, cov.locality, geoConfig.cityName);
          const localBody = `
            <div class="broomies-geo-local">
              <p>Order freshly baked <strong>${cat.name}</strong> in <strong>${cov.locality.name}, ${geoConfig.cityName} (${cov.locality.pincode})</strong> — delivered directly from our nearby <strong>${cov.nearestHub.name} Kitchen Hub (${cov.distanceKm.toFixed(1)} km away)</strong>.</p>
              <p><a href="/collections/all">Shop ${cat.name} Online</a> | <a href="${proxyPrefix}/${handle}">View Live ${cov.locality.name} Cake Menu</a></p>
            </div>
          `;
          const pushRes = await upsertShopifyStorePage(settings, {
            title: `${cat.name} in ${cov.locality.name}, ${geoConfig.cityName} (${cov.locality.pincode})`,
            handle,
            bodyHtml: localBody,
            metaTitle: `${cat.name} in ${cov.locality.name} ${geoConfig.cityName} | ${geoConfig.brandName}`,
            metaDescription: `Fresh ${cat.name.toLowerCase()} delivered in ${cov.locality.name} (${cov.locality.pincode}), ${cov.distanceKm.toFixed(1)} km from ${cov.nearestHub.name}. Order on ${siteUrl.replace(/^https?:\/\//, '')}.`,
          });
          results.push({ handle, ...pushRes });
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    res.json({
      ok: okCount > 0,
      pushedCount: okCount,
      results,
      error: okCount === 0 ? results[0]?.error : undefined,
    });
  });

  // Dashboard API: Export Priority Geo-SEO Matrix CSV
  app.get('/api/seo/export-csv', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoConfig = store.getGeoSeoConfig();
    const host = resolvePublicSeoHost(req);
    const siteUrl = normalizeWebsiteBaseUrl(geoConfig.primaryWebsiteUrl);
    const proxyPrefix = normalizeShopifyProxyPrefix(geoConfig.shopifyProxyPrefix);
    const result = queryGeoSeoPages(geoConfig, { page: 1, limit: 100 });
    const rows = [
      'Slug,ShopifyDomainURL,DirectURL,Title,Target Keyword,Nearest Hub,Locality,Pincode,Distance (km),Category',
    ];
    for (const item of result.items) {
      const cells = [
        item.slug,
        `${siteUrl}${proxyPrefix}/${item.slug}`,
        `${host}/seo/faridabad/${item.slug}`,
        item.title,
        item.keyword,
        item.hubName,
        item.localityName,
        item.pincode,
        String(item.distanceKm),
        item.categoryName,
      ].map((c) => `"${String(c || '').replace(/"/g, '""')}"`);
      rows.push(cells.join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="broomies-faridabad-geo-seo-pages.csv"');
    res.send(rows.join('\n'));
  });
}
