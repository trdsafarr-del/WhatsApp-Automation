import type { Express, Request, Response } from 'express';
import {
  buildGeoSeoPageData,
  buildGeoSitemapShardXml,
  buildSitemapIndexXml,
  buildTier1Slug,
  getCoveredLocalities,
  getGeoSeoStats,
  normalizeWebsiteBaseUrl,
  queryGeoSeoPages,
  renderGeoSeoDirectoryHtml,
  renderGeoSeoLandingHtml,
  resolveGeoSeoPageBySlug,
} from '../src/lib/geoSeo.js';
import { normalizeStorefrontOrigin } from '../src/lib/storefrontRules.js';
import type { GeoSeoConfig } from '../src/lib/types.js';
import { upsertShopifyStorePage } from './shopify.js';
import { store } from './store.js';

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
    const pageData = buildGeoSeoPageData(geoConfig, ref, store.getProducts(), host);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderGeoSeoLandingHtml(pageData, geoConfig, waPhone));
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

  // Dashboard API: Push Unified Zone Pillar Pages directly into broomiesbakery.in/pages/...
  app.post('/api/seo/push-shopify-pages', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const settings = store.getSettings();
    const geoConfig = store.getGeoSeoConfig();
    const covered = getCoveredLocalities(geoConfig);
    const activeHubs = (geoConfig.hubs || []).filter((h) => h.enabled);
    const host = resolvePublicSeoHost(req);
    const siteUrl = normalizeWebsiteBaseUrl(geoConfig.primaryWebsiteUrl);

    const results: Array<{ handle: string; ok: boolean; action?: string; error?: string }> = [];

    // 1. Unified Super-Zone Directory Pillar Page on broomiesbakery.in/pages/faridabad-cake-delivery-zones
    const directoryHtml = `
      <div class="broomies-geo-pillar">
        <p><strong>${geoConfig.brandName}</strong> delivers custom designer cakes &amp; fresh ready-to-eat cakes across our unified 5 km delivery zone covering <strong>${activeHubs.map((h) => `${h.name} (${h.pincode})`).join(', ')}</strong> in ${geoConfig.cityName}.</p>
        <h2>Covered Sectors &amp; Colonies (Within 5 km Radius)</h2>
        <ul>
          ${covered
            .slice(0, 40)
            .map(
              (c) =>
                `<li><a href="${host}/seo/faridabad/${c.locality.slug ? `custom-cakes-in-${c.locality.slug}-faridabad` : ''}">${c.locality.name} (${c.locality.pincode})</a> — ${c.distanceKm.toFixed(1)} km from ${c.nearestHub.name} Hub</li>`
            )
            .join('')}
        </ul>
        <p><a href="${host}/seo/faridabad">View All ${getGeoSeoStats(geoConfig).totalPages.toLocaleString()} Faridabad Cake Delivery Pages</a> | <a href="${siteUrl}/collections/all">Shop Cakes Online</a></p>
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
                  `<li><a href="${host}/seo/faridabad/custom-cakes-in-${s.locality.slug}-faridabad">Custom Cakes in ${s.locality.name}</a> · <a href="${host}/seo/faridabad/ready-to-eat-cakes-in-${s.locality.slug}-faridabad">Ready to Eat Cakes in ${s.locality.name}</a> (${s.distanceKm.toFixed(1)} km)</li>`
              )
              .join('')}
          </ul>
          <p><a href="${siteUrl}/collections/all">Browse &amp; Order Fresh Cakes on ${geoConfig.brandName}</a></p>
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

    const okCount = results.filter((r) => r.ok).length;
    res.json({
      ok: okCount > 0,
      pushedCount: okCount,
      results,
      error: okCount === 0 ? results[0]?.error : undefined,
    });
  });

  // Dashboard API: Export Priority Geo-SEO Matrix CSV (up to 1,000 rows)
  app.get('/api/seo/export-csv', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const geoConfig = store.getGeoSeoConfig();
    const host = resolvePublicSeoHost(req);
    const result = queryGeoSeoPages(geoConfig, { page: 1, limit: 100 });
    const rows = [
      'Slug,URL,Title,Target Keyword,Nearest Hub,Locality,Pincode,Distance (km),Category',
    ];
    for (const item of result.items) {
      const cells = [
        item.slug,
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
