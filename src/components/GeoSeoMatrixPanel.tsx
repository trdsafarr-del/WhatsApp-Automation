import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
  Plus,
  Radar,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_GEO_SEO_CONFIG,
  getCoveredLocalities,
  getGeoSeoStats,
  normalizeShopifyProxyPrefix,
  normalizeWebsiteBaseUrl,
  slugifyGeoPart,
  slugifyLocalityPart,
} from '../lib/geoSeo';
import type {
  GeoCakeCategory,
  GeoIntentModifier,
  GeoLocality,
  GeoSeoConfig,
  GeoZoneHub,
} from '../lib/types';

interface GeoSeoMatrixPanelProps {
  geoSeoConfig: GeoSeoConfig;
  onGeoSeoConfigUpdated: (config: GeoSeoConfig) => void;
}

interface QueriedPageItem {
  index: number;
  tier: 1 | 2 | 3;
  slug: string;
  title: string;
  keyword: string;
  hubName: string;
  localityName: string;
  pincode: string;
  distanceKm: number;
  categoryName: string;
}

interface InspectedPagePayload {
  slug: string;
  pageUrl: string;
  proxyPageUrl?: string;
  primaryWebsiteUrl: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  pincode: string;
  distanceKm: number;
  nearestHub: GeoZoneHub;
  targetKeywords: string[];
  faqs: Array<{ question: string; answer: string }>;
  jsonLdGraph: Record<string, unknown>;
}

type MatrixSubTab = 'explorer' | 'zones' | 'keywords' | 'sitemaps';

export function GeoSeoMatrixPanel({
  geoSeoConfig,
  onGeoSeoConfigUpdated,
}: GeoSeoMatrixPanelProps) {
  const [draft, setDraft] = useState<GeoSeoConfig>(geoSeoConfig || DEFAULT_GEO_SEO_CONFIG);
  const [subTab, setSubTab] = useState<MatrixSubTab>('explorer');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Explorer query state
  const [searchQuery, setSearchQuery] = useState('');
  const [hubFilter, setHubFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [loadingPages, setLoadingPages] = useState(false);
  const [totalMatched, setTotalMatched] = useState(0);
  const [queriedItems, setQueriedItems] = useState<QueriedPageItem[]>([]);
  const [hostOrigin, setHostOrigin] = useState('');

  // Inspector state
  const [inspecting, setInspecting] = useState(false);
  const [inspectedPage, setInspectedPage] = useState<InspectedPagePayload | null>(null);

  // Add hub / locality / category / modifier inputs
  const [newHubName, setNewHubName] = useState('');
  const [newHubPin, setNewHubPin] = useState('');
  const [newHubRadius, setNewHubRadius] = useState('5');
  const [newHubLat, setNewHubLat] = useState('28.4350');
  const [newHubLng, setNewHubLng] = useState('77.3100');

  const [newLocName, setNewLocName] = useState('');
  const [newLocPin, setNewLocPin] = useState('121003');
  const [newLocLat, setNewLocLat] = useState('28.4420');
  const [newLocLng, setNewLocLng] = useState('77.3150');

  const [newCatName, setNewCatName] = useState('');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [newModLabel, setNewModLabel] = useState('');

  // Shopify Pillar Push state
  const [pushingShopify, setPushingShopify] = useState(false);

  useEffect(() => {
    setDraft(geoSeoConfig || DEFAULT_GEO_SEO_CONFIG);
  }, [geoSeoConfig]);

  const liveStats = useMemo(() => getGeoSeoStats(draft), [draft]);
  const coveredLocalities = useMemo(() => getCoveredLocalities(draft), [draft]);

  const persistConfig = async (nextConfig: GeoSeoConfig, successMsg?: string) => {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch('/api/seo/geo-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextConfig),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        geoSeoConfig?: GeoSeoConfig;
        stats?: ReturnType<typeof getGeoSeoStats>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.geoSeoConfig) {
        setBanner({ ok: false, text: data.error || 'Could not save Geo-SEO configuration.' });
        return;
      }
      onGeoSeoConfigUpdated(data.geoSeoConfig);
      setDraft(data.geoSeoConfig);
      setBanner({
        ok: true,
        text:
          successMsg ||
          `Saved Geo-SEO Matrix — ${(data.stats?.totalPages || liveStats.totalPages).toLocaleString()} landing pages active for ${data.geoSeoConfig.primaryWebsiteUrl}.`,
      });
    } catch {
      setBanner({ ok: false, text: 'Network error saving Geo-SEO configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const fetchPages = useCallback(
    async (pageToLoad: number) => {
      setLoadingPages(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          hubId: hubFilter,
          categoryId: catFilter,
          page: String(pageToLoad),
          limit: '15',
        });
        const res = await fetch(`/api/seo/pages?${params.toString()}`);
        const data = (await res.json()) as {
          ok?: boolean;
          totalMatched?: number;
          items?: QueriedPageItem[];
          hostOrigin?: string;
        };
        if (res.ok && data.ok) {
          setTotalMatched(data.totalMatched ?? 0);
          setQueriedItems(Array.isArray(data.items) ? data.items : []);
          if (data.hostOrigin) setHostOrigin(data.hostOrigin);
        }
      } finally {
        setLoadingPages(false);
      }
    },
    [searchQuery, hubFilter, catFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPages(pageNum);
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchPages, pageNum, geoSeoConfig]);

  const handleInspectSlug = async (slug: string) => {
    setInspecting(true);
    try {
      const res = await fetch(`/api/seo/page-inspect/${encodeURIComponent(slug)}`);
      const data = (await res.json()) as { ok?: boolean; pageData?: InspectedPagePayload };
      if (res.ok && data.ok && data.pageData) {
        setInspectedPage(data.pageData);
      }
    } finally {
      setInspecting(false);
    }
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleAddHub = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHubName.trim();
    const lat = Number.parseFloat(newHubLat);
    const lng = Number.parseFloat(newHubLng);
    const radiusKm = Math.max(1, Math.min(25, Number.parseFloat(newHubRadius) || 5));
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const hub: GeoZoneHub = {
      id: `hub-${slugifyGeoPart(name)}-${Date.now().toString(36).slice(-3)}`,
      name,
      slug: slugifyLocalityPart(name),
      pincode: newHubPin.trim() || '121003',
      lat,
      lng,
      radiusKm,
      enabled: true,
    };
    const next = { ...draft, hubs: [...draft.hubs, hub] };
    setDraft(next);
    setNewHubName('');
    setNewHubPin('');
    void persistConfig(next, `Added ${name} (${radiusKm} km hub) to Unified Faridabad Zone.`);
  };

  const handleAddLocality = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLocName.trim();
    const lat = Number.parseFloat(newLocLat);
    const lng = Number.parseFloat(newLocLng);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const loc: GeoLocality = {
      id: `loc-${slugifyLocalityPart(name)}-${Date.now().toString(36).slice(-3)}`,
      name,
      slug: slugifyLocalityPart(name),
      pincode: newLocPin.trim() || '121003',
      lat,
      lng,
      areaType: 'sector',
    };
    const next = { ...draft, localities: [loc, ...draft.localities] };
    setDraft(next);
    setNewLocName('');
    void persistConfig(next, `Added locality "${name}" to Faridabad matrix.`);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    const kw = newCatKeywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const cat: GeoCakeCategory = {
      id: `cat-${slugifyGeoPart(name)}-${Date.now().toString(36).slice(-3)}`,
      name,
      slug: slugifyGeoPart(name),
      keywords: kw.length > 0 ? kw : [name.toLowerCase()],
      matchTerms: name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2),
      enabled: true,
    };
    const next = { ...draft, categories: [cat, ...draft.categories] };
    setDraft(next);
    setNewCatName('');
    setNewCatKeywords('');
    void persistConfig(next, `Added cake keyword cluster "${name}".`);
  };

  const handleAddModifier = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newModLabel.trim();
    if (!label) return;
    const mod: GeoIntentModifier = {
      id: `mod-${slugifyGeoPart(label)}-${Date.now().toString(36).slice(-3)}`,
      label,
      slug: slugifyGeoPart(label),
      shortDesc: `${label} across ${draft.cityName} bakery zones`,
      enabled: true,
    };
    const next = { ...draft, modifiers: [...draft.modifiers, mod] };
    setDraft(next);
    setNewModLabel('');
    void persistConfig(next, `Added search intent "${label}".`);
  };

  const handlePushShopifyPages = async (includePriorityLocalPages = false) => {
    setPushingShopify(true);
    setBanner(null);
    try {
      const res = await fetch('/api/seo/push-shopify-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includePriorityLocalPages }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        pushedCount?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setBanner({
          ok: false,
          text: data.error || 'Could not push Pillar Pages to Shopify storefront.',
        });
        return;
      }
      setBanner({
        ok: true,
        text: `Published ${data.pushedCount ?? 0} Faridabad Cake Zone pages directly onto ${cleanSiteUrl}/pages/...`,
      });
    } catch {
      setBanner({ ok: false, text: 'Network error pushing Shopify pillar pages.' });
    } finally {
      setPushingShopify(false);
    }
  };

  const resolvedOrigin = useMemo(() => {
    if (hostOrigin) return hostOrigin.replace(/\/+$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://whatsa86.vercel.app';
  }, [hostOrigin]);

  const cleanSiteUrl = useMemo(
    () => normalizeWebsiteBaseUrl(draft.primaryWebsiteUrl),
    [draft.primaryWebsiteUrl]
  );
  const proxyPrefix = useMemo(
    () => normalizeShopifyProxyPrefix(draft.shopifyProxyPrefix),
    [draft.shopifyProxyPrefix]
  );
  const [proxyRootPart, proxySubPart] = useMemo(() => {
    const parts = proxyPrefix.replace(/^\/+/, '').split('/');
    return [parts[0] || 'apps', parts[1] || 'cakes'];
  }, [proxyPrefix]);
  const proxyTargetOrigin = /^https:\/\//i.test(resolvedOrigin)
    ? resolvedOrigin
    : 'https://whatsa86.vercel.app';
  const proxyTargetEndpoint = `${proxyTargetOrigin}/api/shopify-proxy`;

  const totalExplorerPages = Math.max(1, Math.ceil(totalMatched / 15));

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium text-slate-400">Live Geo-SEO Pages</p>
          <p
            data-testid="geo-total-pages"
            className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums"
          >
            {liveStats.totalPages.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
            {liveStats.tier1Count} hubs · {liveStats.tier2Count.toLocaleString()} sector ·{' '}
            {liveStats.tier3Count.toLocaleString()} intent
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium text-slate-400">Unified Zone Hubs</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {liveStats.activeHubsCount} Hubs
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {draft.hubs
              .filter((h) => h.enabled)
              .map((h) => h.name)
              .join(' · ')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium text-slate-400">Covered Faridabad Sectors</p>
          <p className="mt-1 font-mono text-2xl font-bold text-sky-400 tabular-nums">
            {liveStats.coveredLocalitiesCount} Areas
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Verified within 5 km Haversine radius
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium text-slate-400">XML Sitemap Shards</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {liveStats.sitemapShardCount} Files
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">5,000 URLs/shard · /sitemap.xml</p>
        </div>
      </div>

      {/* Primary Bakery Website & Global Zone Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void persistConfig(draft);
        }}
        className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-white">
              Target Storefront & Unified Zone Controls
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              All 10,000+ Geo-SEO pages link shoppers &amp; schema directly to your live storefront.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/seo/faridabad"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
            >
              <ExternalLink className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              Open Directory
            </a>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? 'Saving...' : 'Save Geo-SEO Config'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs text-slate-300">
            Primary Bakery Website URL
            <input
              type="url"
              value={draft.primaryWebsiteUrl}
              onChange={(e) => setDraft({ ...draft, primaryWebsiteUrl: e.target.value })}
              placeholder="https://broomiesbakery.in"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Shopify App Proxy Path
            <input
              type="text"
              value={draft.shopifyProxyPrefix || '/apps/cakes'}
              onChange={(e) => setDraft({ ...draft, shopifyProxyPrefix: e.target.value })}
              placeholder="/apps/cakes"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 font-mono text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Primary City
            <input
              type="text"
              value={draft.cityName}
              onChange={(e) => setDraft({ ...draft, cityName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-300">
            State / Region
            <input
              type="text"
              value={draft.stateName}
              onChange={(e) => setDraft({ ...draft, stateName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
            <span>Enable 10,000+ Geo-SEO Pages &amp; Sitemaps</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.injectStorefrontGeoSchema}
              onChange={(e) =>
                setDraft({ ...draft, injectStorefrontGeoSchema: e.target.checked })
              }
              className="h-4 w-4 accent-emerald-500"
            />
            <span>Inject Bakery + 5 km GeoCircle Schema onto broomiesbakery.in</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.showStorefrontZoneFooter !== false}
              onChange={(e) =>
                setDraft({ ...draft, showStorefrontZoneFooter: e.target.checked })
              }
              className="h-4 w-4 accent-emerald-500"
            />
            <span>Show Faridabad 5 km Zone Strip Above Footer</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.includeTier3Matrix}
              onChange={(e) => setDraft({ ...draft, includeTier3Matrix: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
            <span>Include Long-Tail Intent Matrix (10,000+ URLs)</span>
          </label>
        </div>
      </form>

      {/* Host All 16,436 Pages Directly On broomiesbakery.in via Shopify App Proxy */}
      <div className="rounded-xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/35 via-slate-900/90 to-slate-900/90 p-4 backdrop-blur-md sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-500/20 pb-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-white">
              Host All {liveStats.totalPages.toLocaleString()} Pages Directly on{' '}
              <span className="font-mono text-emerald-300">
                {cleanSiteUrl.replace(/^https?:\/\//, '')}
                {proxyPrefix}/...
              </span>{' '}
              (Shopify App Proxy)
            </h3>
            <p className="mt-0.5 text-xs text-slate-300">
              In <span className="font-mono text-slate-100">dev.shopify.com &rarr; Create version &rarr; App proxy</span>, fill these exact 3 fields and click{' '}
              <strong className="text-white">Release</strong>. Every page loads inside Broomies Bakery&apos;s own Shopify theme &amp; domain:
            </p>
          </div>
          <a
            href="/api/shopify-proxy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Preview Shopify Liquid Fragment
          </a>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-3">
            <p className="text-[11px] font-medium text-slate-400">1. Subpath prefix (Dropdown)</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="font-mono text-xs font-semibold text-emerald-300">
                {proxyRootPart}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy('proxy-root', proxyRootPart)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                {copiedKey === 'proxy-root' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-3">
            <p className="text-[11px] font-medium text-slate-400">2. Subpath (Text Box)</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="font-mono text-xs font-semibold text-emerald-300">
                {proxySubPart}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy('proxy-sub', proxySubPart)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                {copiedKey === 'proxy-sub' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-3">
            <p className="text-[11px] font-medium text-slate-400">3. Proxy URL</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="truncate font-mono text-xs font-semibold text-sky-300">
                {proxyTargetEndpoint}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy('proxy-url', proxyTargetEndpoint)}
                className="shrink-0 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                {copiedKey === 'proxy-url' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs ${
            banner.ok
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
        >
          {banner.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Segmented Navigation inside Geo-SEO */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
        {(
          [
            { id: 'explorer', label: `Landing Pages (${liveStats.totalPages.toLocaleString()})`, icon: Globe },
            { id: 'zones', label: `5 km Zone Hubs & Sectors (${liveStats.coveredLocalitiesCount})`, icon: Radar },
            { id: 'keywords', label: `Cake Keywords (${liveStats.activeCategoriesCount} × ${liveStats.activeModifiersCount})`, icon: Layers },
            { id: 'sitemaps', label: 'Sitemaps & Storefront Sync', icon: Send },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: 10,000+ Landing Pages Explorer */}
      {subTab === 'explorer' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
            <div className="grid gap-3 md:grid-cols-12">
              <div className="relative md:col-span-5">
                <Search
                  className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPageNum(1);
                  }}
                  placeholder="Search custom cakes, ready to eat cakes, sector 88, 121002..."
                  aria-label="Search Geo-SEO landing pages"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/85 py-2 pr-3 pl-8 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  aria-label="Filter by zone hub"
                  value={hubFilter}
                  onChange={(e) => {
                    setHubFilter(e.target.value);
                    setPageNum(1);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All 5 km Zones (Unified)</option>
                  {draft.hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.radiusKm} km · {h.pincode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <select
                  aria-label="Filter by cake category"
                  value={catFilter}
                  onChange={(e) => {
                    setCatFilter(e.target.value);
                    setPageNum(1);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Cake Categories</option>
                  {draft.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end md:col-span-1">
                <button
                  type="button"
                  onClick={() => void fetchPages(pageNum)}
                  title="Refresh pages"
                  aria-label="Refresh Geo-SEO page list"
                  className="inline-flex h-[34px] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingPages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/75 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Landing Page &amp; Slug</th>
                    <th className="px-4 py-3">Target Keyword</th>
                    <th className="px-4 py-3">Zone Hub &amp; Distance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {queriedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                        {loadingPages
                          ? 'Loading matching landing pages...'
                          : 'No matching landing pages for this filter.'}
                      </td>
                    </tr>
                  ) : (
                    queriedItems.map((item) => {
                      const shopifyDomainUrl = `${cleanSiteUrl}${proxyPrefix}/${item.slug}`;
                      return (
                        <tr key={item.slug} className="hover:bg-slate-800/35">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-white">{item.title}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-emerald-300">
                              {cleanSiteUrl.replace(/^https?:\/\//, '')}{proxyPrefix}/{item.slug}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            <p>{item.keyword}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {item.categoryName} · Tier {item.tier}
                            </p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-medium text-emerald-300">{item.hubName} Zone</p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                              {item.distanceKm.toFixed(1)} km · PIN {item.pincode}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleInspectSlug(item.slug)}
                                disabled={inspecting}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                              >
                                <Code2 className="h-3 w-3 text-sky-400" aria-hidden="true" />
                                Inspect
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopy(item.slug, shopifyDomainUrl)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                              >
                                {copiedKey === item.slug ? (
                                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                                ) : (
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                )}
                                {copiedKey === item.slug ? 'Copied' : 'URL'}
                              </button>
                              <a
                                href={`/seo/faridabad/${item.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
                              >
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                Open
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
              <span className="tabular-nums">
                Showing page {pageNum} of {totalExplorerPages.toLocaleString()} (
                {totalMatched.toLocaleString()} matched URLs)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageNum <= 1}
                  onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pageNum >= totalExplorerPages}
                  onClick={() => setPageNum((p) => Math.min(totalExplorerPages, p + 1))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Unified 5km Zone Hubs & Faridabad Localities */}
      {subTab === 'zones' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {draft.hubs.map((hub) => {
              const hubSectorsCount = coveredLocalities.filter((c) =>
                c.matchingHubIds.includes(hub.id)
              ).length;
              return (
                <div
                  key={hub.id}
                  className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold text-white">
                        {hub.name} Hub ({hub.pincode})
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                        {hubSectorsCount} Faridabad localities within {hub.radiusKm} km · GPS{' '}
                        {hub.lat.toFixed(4)}, {hub.lng.toFixed(4)}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={hub.enabled}
                        onChange={(e) => {
                          const next = {
                            ...draft,
                            hubs: draft.hubs.map((h) =>
                              h.id === hub.id ? { ...h, enabled: e.target.checked } : h
                            ),
                          };
                          setDraft(next);
                        }}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      <span>Active</span>
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block text-[11px] text-slate-400">
                      Delivery Radius (km)
                      <input
                        type="number"
                        min={1}
                        max={25}
                        step={0.5}
                        value={hub.radiusKm}
                        onChange={(e) => {
                          const val = Math.max(0.5, Number.parseFloat(e.target.value) || 5);
                          setDraft({
                            ...draft,
                            hubs: draft.hubs.map((h) =>
                              h.id === hub.id ? { ...h, radiusKm: val } : h
                            ),
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 font-mono text-xs text-white"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-400">
                      Hub Pincode
                      <input
                        type="text"
                        maxLength={6}
                        value={hub.pincode}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            hubs: draft.hubs.map((h) =>
                              h.id === hub.id ? { ...h, pincode: e.target.value } : h
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 font-mono text-xs text-white"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleAddHub}
            className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4"
          >
            <h4 className="font-display text-xs font-semibold text-white">
              Add Another Bakery Hub to Unified Zone
            </h4>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-6">
              <input
                type="text"
                placeholder="Hub name (e.g. NIT 5)"
                value={newHubName}
                onChange={(e) => setNewHubName(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-2 text-xs text-white sm:col-span-2"
              />
              <input
                type="text"
                placeholder="PIN (121001)"
                value={newHubPin}
                onChange={(e) => setNewHubPin(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-2 font-mono text-xs text-white"
              />
              <input
                type="number"
                step="0.5"
                placeholder="Radius km"
                value={newHubRadius}
                onChange={(e) => setNewHubRadius(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-2 font-mono text-xs text-white"
              />
              <input
                type="text"
                placeholder="Lat / Lng"
                value={`${newHubLat}, ${newHubLng}`}
                onChange={(e) => {
                  const [la, ln] = e.target.value.split(',').map((s) => s.trim());
                  if (la) setNewHubLat(la);
                  if (ln) setNewHubLng(ln);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-2 font-mono text-xs text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Hub
              </button>
            </div>
          </form>

          {/* Localities Table + Add Custom Locality */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <h4 className="font-display text-sm font-semibold text-white">
                  Covered Faridabad Sectors, Colonies &amp; Societies ({coveredLocalities.length})
                </h4>
                <p className="text-xs text-slate-400">
                  Automatically mapped to nearest Hub using real Haversine GPS distance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void persistConfig(draft)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                Apply Radius &amp; Save
              </button>
            </div>

            <form onSubmit={handleAddLocality} className="mb-3 grid gap-2 sm:grid-cols-5">
              <input
                type="text"
                placeholder="Locality name (e.g. RPS Palms)"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-2 text-xs text-white sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Pincode (121002)"
                value={newLocPin}
                onChange={(e) => setNewLocPin(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-2 font-mono text-xs text-white"
              />
              <input
                type="text"
                placeholder="Lat, Lng (28.4231, 77.3490)"
                value={`${newLocLat}, ${newLocLng}`}
                onChange={(e) => {
                  const [la, ln] = e.target.value.split(',').map((s) => s.trim());
                  if (la) setNewLocLat(la);
                  if (ln) setNewLocLng(ln);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950/90 px-2.5 py-2 font-mono text-xs text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Sector
              </button>
            </form>

            <div className="grid max-h-[340px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {coveredLocalities.map((cov) => (
                <div
                  key={cov.locality.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/75 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{cov.locality.name}</p>
                    <p className="truncate font-mono text-[11px] text-slate-400 tabular-nums">
                      {cov.nearestHub.name} · {cov.distanceKm.toFixed(1)} km · PIN{' '}
                      {cov.locality.pincode}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${cov.locality.name}`}
                    onClick={() => {
                      const next = {
                        ...draft,
                        localities: draft.localities.filter((l) => l.id !== cov.locality.id),
                      };
                      setDraft(next);
                      void persistConfig(next);
                    }}
                    className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Cake Categories & Search Intent Keywords */}
      {subTab === 'keywords' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Categories */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4">
            <div className="flex items-center justify-between gap-2 pb-3">
              <div>
                <h4 className="font-display text-sm font-semibold text-white">
                  Cake Keyword Clusters ({draft.categories.length})
                </h4>
                <p className="text-xs text-slate-400">
                  Covers Custom Cakes, Ready to Eat Cakes &amp; specialty search terms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void persistConfig(draft)}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Save Changes
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="mb-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cake keyword (e.g. Dry Fruit Tea Cakes)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Keyword
                </button>
              </div>
              <input
                type="text"
                placeholder="Related terms (comma separated, optional)"
                value={newCatKeywords}
                onChange={(e) => setNewCatKeywords(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs text-slate-300"
              />
            </form>

            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {draft.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/75 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{cat.name}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {cat.keywords.join(' · ')}
                    </p>
                  </div>
                  <label className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={cat.enabled}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          categories: draft.categories.map((c) =>
                            c.id === cat.id ? { ...c, enabled: e.target.checked } : c
                          ),
                        })
                      }
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span>Active</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Search Intent Modifiers */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4">
            <div className="flex items-center justify-between gap-2 pb-3">
              <div>
                <h4 className="font-display text-sm font-semibold text-white">
                  Delivery &amp; Intent Multipliers ({draft.modifiers.length})
                </h4>
                <p className="text-xs text-slate-400">
                  Each enabled intent multiplies Sector × Cake pages for long-tail Google ranking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void persistConfig(draft)}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Save Changes
              </button>
            </div>

            <form onSubmit={handleAddModifier} className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="New intent (e.g. 30 Min Express)"
                value={newModLabel}
                onChange={(e) => setNewModLabel(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Intent
              </button>
            </form>

            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {draft.modifiers.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/75 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{mod.label}</p>
                    <p className="truncate text-[11px] text-slate-400">{mod.shortDesc}</p>
                  </div>
                  <label className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          modifiers: draft.modifiers.map((m) =>
                            m.id === mod.id ? { ...m, enabled: e.target.checked } : m
                          ),
                        })
                      }
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span>Active</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: XML Sitemaps, Search Console & Shopify Sync */}
      {subTab === 'sitemaps' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-800/90 bg-slate-900/75 p-5">
            <h4 className="font-display text-sm font-semibold text-white">
              XML Sitemaps &amp; Crawl Endpoints
            </h4>
            <p className="text-xs leading-relaxed text-slate-400">
              Submit <span className="font-mono text-emerald-300">{proxyPrefix}/sitemap.xml</span> on{' '}
              <span className="font-mono text-slate-200">{cleanSiteUrl.replace(/^https?:\/\//, '')}</span> inside Google
              Search Console so Google discovers &amp; indexes all{' '}
              <span className="font-mono text-white tabular-nums">
                {liveStats.totalPages.toLocaleString()}
              </span>{' '}
              Faridabad landing pages directly on your own Shopify domain.
            </p>

            <div className="space-y-2.5 text-xs">
              {[
                {
                  key: 'proxy-sitemap',
                  label: 'Shopify Domain Sitemap Index (Submit in Search Console)',
                  displayUrl: `${cleanSiteUrl}${proxyPrefix}/sitemap.xml`,
                  openHref: '/api/shopify-proxy/sitemap.xml',
                },
                {
                  key: 'proxy-shard1',
                  label: 'Shopify Domain Shard #1 (First 5,000 Pages)',
                  displayUrl: `${cleanSiteUrl}${proxyPrefix}/sitemap-geo/1.xml`,
                  openHref: '/api/shopify-proxy/sitemap-geo/1.xml',
                },
                {
                  key: 'proxy-dir',
                  label: 'Shopify Domain Unified Zone Directory',
                  displayUrl: `${cleanSiteUrl}${proxyPrefix}`,
                  openHref: '/api/shopify-proxy',
                },
                {
                  key: 'sitemap',
                  label: 'Direct App Sitemap Index (Backup Mirror)',
                  displayUrl: `${resolvedOrigin}/sitemap.xml`,
                  openHref: '/sitemap.xml',
                },
              ].map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{entry.label}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-emerald-300">
                      {entry.displayUrl}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleCopy(entry.key, entry.displayUrl)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                    >
                      {copiedKey === entry.key ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={entry.openHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-sky-300 hover:bg-slate-700"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800/90 bg-slate-900/75 p-5">
            <h4 className="font-display text-sm font-semibold text-white">
              Direct Sync to {cleanSiteUrl}
            </h4>
            <p className="text-xs leading-relaxed text-slate-400">
              All {liveStats.totalPages.toLocaleString()} pages load at{' '}
              <span className="font-mono text-emerald-300">
                {cleanSiteUrl}
                {proxyPrefix}/...
              </span>{' '}
              once Shopify App Proxy is saved. You can also publish native Shopify{' '}
              <span className="font-mono text-slate-200">/pages/...</span> entries directly into your store:
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={pushingShopify}
                onClick={() => void handlePushShopifyPages(false)}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                {pushingShopify
                  ? 'Pushing Pages...'
                  : 'Push 5 Zone Pillar Pages (/pages)'}
              </button>
              <button
                type="button"
                disabled={pushingShopify}
                onClick={() => void handlePushShopifyPages(true)}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                {pushingShopify ? 'Pushing...' : 'Push Pillar + Top 16 Local Pages'}
              </button>
              <a
                href="/api/seo/export-csv"
                download="broomies-faridabad-geo-seo-pages.csv"
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                Download Matrix CSV
              </a>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/75 p-3.5 text-xs text-slate-300">
              <p className="font-semibold text-white">
                How All {liveStats.totalPages.toLocaleString()} Pages Rank Under {cleanSiteUrl}:
              </p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11.5px] text-slate-400">
                <li>
                  Set App Proxy in <span className="font-mono text-slate-200">dev.shopify.com</span>:{' '}
                  <span className="font-mono text-emerald-300">{proxyRootPart}</span> /{' '}
                  <span className="font-mono text-emerald-300">{proxySubPart}</span> &rarr;{' '}
                  <span className="font-mono text-sky-300">{proxyTargetEndpoint}</span> and click Release.
                </li>
                <li>
                  Open Google Search Console for <span className="font-mono text-slate-200">broomiesbakery.in</span> &rarr; Sitemaps &rarr; submit{' '}
                  <span className="font-mono text-emerald-300">{proxyPrefix.replace(/^\//, '')}/sitemap.xml</span>.
                </li>
                <li>
                  Storefront Bridge (<span className="font-mono text-slate-200">widget.js</span>) injects Bakery + 4x 5 km GeoCircle JSON-LD and the Zone Link Strip right on your homepage &amp; footer.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inspector for Selected Landing Page JSON-LD & Meta */}
      {inspectedPage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Inspect Geo-SEO Landing Page"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 text-xs text-slate-200 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <p className="font-mono text-[11px] text-emerald-400">
                  {inspectedPage.nearestHub.name} Zone · {inspectedPage.distanceKm.toFixed(1)} km ·
                  PIN {inspectedPage.pincode}
                </p>
                <h4 className="mt-0.5 font-display text-base font-semibold text-white">
                  {inspectedPage.h1}
                </h4>
              </div>
              <button
                type="button"
                aria-label="Close inspector"
                onClick={() => setInspectedPage(null)}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-800 bg-white p-3.5 text-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Google SERP Preview
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-emerald-800">
                  {inspectedPage.proxyPageUrl || inspectedPage.pageUrl}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#1a0dab]">
                  {inspectedPage.seoTitle}
                </p>
                <p className="mt-0.5 text-xs text-[#4d5156]">{inspectedPage.metaDescription}</p>
              </div>

              <div>
                <p className="font-semibold text-white">Target Local Keywords</p>
                <p className="mt-1 text-slate-400">{inspectedPage.targetKeywords.join(' · ')}</p>
              </div>

              <div>
                <p className="font-semibold text-white">
                  Embedded Schema.org JSON-LD (Bakery + 4x 5 km GeoCircle + FAQPage + ItemList)
                </p>
                <pre className="mt-1.5 max-h-60 overflow-auto rounded-lg border border-slate-800 bg-black/70 p-3 font-mono text-[11px] text-sky-300">
                  {JSON.stringify(inspectedPage.jsonLdGraph, null, 2)}
                </pre>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <a
                  href={`/api/shopify-proxy/${inspectedPage.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 font-medium text-sky-300 hover:bg-slate-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Preview Shopify Liquid
                </a>
                <a
                  href={`/seo/faridabad/${inspectedPage.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Open Rendered HTML Page
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
