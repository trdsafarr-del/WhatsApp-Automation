import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  ExternalLink,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { DEFAULT_GEO_SEO_CONFIG, getGeoSeoStats } from '../lib/geoSeo';
import {
  buildProductJsonLd,
  computeSeoAudit,
  computeStoreSeoSummary,
  renderBulkSeoTemplate,
  slugifyProductHandle,
} from '../lib/storefrontRules';
import type {
  AppSettings,
  GeoSeoConfig,
  ProductCatalogItem,
  StorefrontConfig,
} from '../lib/types';
import { GeoSeoMatrixPanel } from './GeoSeoMatrixPanel';

interface SeoManagerViewProps {
  products: ProductCatalogItem[];
  storefrontConfig: StorefrontConfig;
  geoSeoConfig?: GeoSeoConfig;
  settings: AppSettings;
  onProductsUpdated: (products: ProductCatalogItem[]) => void;
  onStorefrontConfigUpdated: (config: StorefrontConfig) => void;
  onGeoSeoConfigUpdated?: (config: GeoSeoConfig) => void;
}

export function SeoManagerView({
  products,
  storefrontConfig,
  geoSeoConfig = DEFAULT_GEO_SEO_CONFIG,
  settings,
  onProductsUpdated,
  onStorefrontConfigUpdated,
  onGeoSeoConfigUpdated,
}: SeoManagerViewProps) {
  const [seoMode, setSeoMode] = useState<'geo_matrix' | 'product_audit'>('geo_matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'needs_attention' | 'missing_alt' | 'good'>(
    'all'
  );
  const [selectedId, setSelectedId] = useState<string | null>(products[0]?.id || null);

  // Selected product SEO fields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [handle, setHandle] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Bulk SEO templates
  const [titleTemplate, setTitleTemplate] = useState(storefrontConfig.seoTitleTemplate);
  const [descTemplate, setDescTemplate] = useState(storefrontConfig.seoDescriptionTemplate);
  const [onlyMissingBulk, setOnlyMissingBulk] = useState(true);
  const [pushBulkToShopify, setPushBulkToShopify] = useState(false);
  const [runningBulk, setRunningBulk] = useState(false);

  // Sync & Schema state
  const [syncingShopify, setSyncingShopify] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [enableJsonLd, setEnableJsonLd] = useState(storefrontConfig.enableJsonLdSchema);
  const [showSchemaPreview, setShowSchemaPreview] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setTitleTemplate(storefrontConfig.seoTitleTemplate);
    setDescTemplate(storefrontConfig.seoDescriptionTemplate);
    setEnableJsonLd(storefrontConfig.enableJsonLdSchema);
  }, [storefrontConfig]);

  useEffect(() => {
    if (!selectedId && products.length > 0) {
      setSelectedId(products[0].id);
    } else if (selectedId && !products.some((p) => p.id === selectedId)) {
      setSelectedId(products[0]?.id || null);
    }
  }, [products, selectedId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setSeoTitle(selectedProduct.seoTitle || '');
    setSeoDescription(selectedProduct.seoDescription || '');
    setHandle(selectedProduct.handle || '');
    setImageAlt(selectedProduct.imageAlt || '');
  }, [selectedProduct]);

  const summary = useMemo(() => computeStoreSeoSummary(products), [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const audit = computeSeoAudit(p);
      if (auditFilter === 'good' && audit.status !== 'good') return false;
      if (auditFilter === 'needs_attention' && audit.status === 'good') return false;
      if (auditFilter === 'missing_alt' && audit.hasAltText) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.seoTitle.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, auditFilter]);

  const liveAudit = useMemo(() => {
    if (!selectedProduct) return null;
    return computeSeoAudit({
      ...selectedProduct,
      seoTitle,
      seoDescription,
      handle,
      imageAlt,
    });
  }, [selectedProduct, seoTitle, seoDescription, handle, imageAlt]);

  const storeHost = useMemo(() => {
    const raw = (settings.shopifyStoreDomain || '').trim();
    if (!raw) return 'your-store.myshopify.com';
    return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  }, [settings.shopifyStoreDomain]);

  const jsonLdPreview = useMemo(() => {
    if (!selectedProduct) return '';
    return JSON.stringify(
      buildProductJsonLd(
        {
          ...selectedProduct,
          seoTitle,
          seoDescription,
          handle,
          imageAlt,
        },
        storeHost,
        settings.shopName
      ),
      null,
      2
    );
  }, [selectedProduct, seoTitle, seoDescription, handle, imageAlt, storeHost, settings.shopName]);

  const handleSyncShopifyProducts = async () => {
    setSyncingShopify(true);
    setBanner(null);
    try {
      const res = await fetch('/api/products/sync-shopify', { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        totalCount?: number;
        importedCount?: number;
        products?: ProductCatalogItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setBanner({ ok: false, text: data.error || 'Could not sync Shopify products.' });
        return;
      }
      if (data.products) onProductsUpdated(data.products);
      setBanner({
        ok: true,
        text: `Synced ${data.totalCount ?? 0} Shopify products for SEO management.`,
      });
    } finally {
      setSyncingShopify(false);
    }
  };

  const handleLoadSamples = async () => {
    setLoadingSamples(true);
    setBanner(null);
    try {
      const res = await fetch('/api/products/load-samples', { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; products?: ProductCatalogItem[] };
      if (res.ok && data.products) {
        onProductsUpdated(data.products);
        setBanner({
          ok: true,
          text: 'Loaded 3 sample products so you can audit and optimize SEO immediately.',
        });
      }
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleSaveProductSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSavingProduct(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(selectedProduct.id)}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoTitle,
          seoDescription,
          handle,
          imageAlt,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        shopifySynced?: boolean;
        shopifyError?: string;
        products?: ProductCatalogItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setBanner({ ok: false, text: data.error || 'Failed to save SEO changes.' });
        return;
      }
      if (data.products) onProductsUpdated(data.products);
      setBanner({
        ok: data.shopifySynced !== false || !data.shopifyError,
        text: data.shopifySynced
          ? `SEO saved & pushed live to Shopify for "${selectedProduct.title}".`
          : `SEO saved locally${data.shopifyError ? ` (${data.shopifyError})` : ''}.`,
      });
    } catch {
      setBanner({ ok: false, text: 'Network error saving SEO update.' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleFillSelectedFromTemplate = () => {
    if (!selectedProduct) return;
    setSeoTitle(renderBulkSeoTemplate(titleTemplate, selectedProduct, settings.shopName, 60));
    setSeoDescription(
      renderBulkSeoTemplate(descTemplate, selectedProduct, settings.shopName, 160)
    );
    if (!imageAlt.trim()) {
      setImageAlt(selectedProduct.title);
    }
  };

  const handleApplyBulkSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningBulk(true);
    setBanner(null);
    try {
      await fetch('/api/storefront/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoTitleTemplate: titleTemplate,
          seoDescriptionTemplate: descTemplate,
          enableJsonLdSchema: enableJsonLd,
        }),
      }).then(async (r) => {
        if (r.ok) {
          const cfgData = (await r.json()) as { storefrontConfig?: StorefrontConfig };
          if (cfgData.storefrontConfig) onStorefrontConfigUpdated(cfgData.storefrontConfig);
        }
      });

      const res = await fetch('/api/products/bulk-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlyMissing: onlyMissingBulk,
          titleTemplate,
          descriptionTemplate: descTemplate,
          pushToShopify: pushBulkToShopify,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        updatedCount?: number;
        shopifySyncedCount?: number;
        products?: ProductCatalogItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setBanner({ ok: false, text: data.error || 'Bulk SEO update failed.' });
        return;
      }
      if (data.products) onProductsUpdated(data.products);
      setBanner({
        ok: true,
        text: `Bulk SEO applied to ${data.updatedCount ?? 0} products${
          pushBulkToShopify ? ` (${data.shopifySyncedCount ?? 0} synced to Shopify)` : ''
        }.`,
      });
    } finally {
      setRunningBulk(false);
    }
  };

  const toggleJsonLd = async (checked: boolean) => {
    setEnableJsonLd(checked);
    const res = await fetch('/api/storefront/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enableJsonLdSchema: checked }),
    });
    if (res.ok) {
      const data = (await res.json()) as { storefrontConfig?: StorefrontConfig };
      if (data.storefrontConfig) onStorefrontConfigUpdated(data.storefrontConfig);
    }
  };

  const geoStats = useMemo(() => getGeoSeoStats(geoSeoConfig), [geoSeoConfig]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-white sm:text-lg">
            Broomies Bakery Geo-SEO &amp; Product Schema Studio
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Manage {geoStats.totalPages.toLocaleString()}+ Faridabad 5 km Zone Landing Pages for{' '}
            <span className="font-mono text-emerald-300">{geoSeoConfig.primaryWebsiteUrl}</span> plus
            live Shopify catalog SEO.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/90 p-1">
            <button
              type="button"
              onClick={() => setSeoMode('geo_matrix')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                seoMode === 'geo_matrix'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Geo-SEO ({geoStats.totalPages.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => setSeoMode('product_audit')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                seoMode === 'product_audit'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Product SEO ({products.length})
            </button>
          </div>
          {seoMode === 'product_audit' && (
            <>
              <button
                type="button"
                disabled={loadingSamples}
                onClick={() => void handleLoadSamples()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                {loadingSamples ? 'Loading...' : 'Load Samples'}
              </button>
              <button
                type="button"
                disabled={syncingShopify}
                onClick={() => void handleSyncShopifyProducts()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncingShopify ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {syncingShopify ? 'Syncing...' : 'Sync Shopify'}
              </button>
            </>
          )}
        </div>
      </div>

      {seoMode === 'geo_matrix' ? (
        <GeoSeoMatrixPanel
          geoSeoConfig={geoSeoConfig}
          onGeoSeoConfigUpdated={(next) => {
            if (onGeoSeoConfigUpdated) onGeoSeoConfigUpdated(next);
          }}
        />
      ) : (
        <div className="space-y-5">

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

      {/* SEO Audit KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Catalog SEO Score
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {summary.avgScore}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Across {summary.totalProducts} items</p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            SEO Healthy (85+)
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {summary.goodCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Ready for Google ranking</p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Needs Attention
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-300 tabular-nums">
            {summary.needsWorkCount + summary.missingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Missing or short meta tags</p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Missing Alt Text
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-rose-300 tabular-nums">
            {summary.missingAltCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Image accessibility & Google Images</p>
        </div>
      </div>

      {/* Bulk SEO Template Generator */}
      <form
        onSubmit={handleApplyBulkSeo}
        className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold text-white">
              Bulk SEO Auto-Template & JSON-LD Schema
            </h3>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={enableJsonLd}
              onChange={(e) => void toggleJsonLd(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            <span>Auto-Inject Product JSON-LD Rich Schema on Storefront</span>
          </label>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="block text-xs text-slate-300">
            Bulk SEO Title Formula (variables: {'{{title}}'}, {'{{shop_name}}'}, {'{{product_type}}'}, {'{{price}}'})
            <input
              type="text"
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Bulk Meta Description Formula
            <input
              type="text"
              value={descTemplate}
              onChange={(e) => setDescTemplate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyMissingBulk}
                onChange={(e) => setOnlyMissingBulk(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span>Only fill missing SEO fields</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={pushBulkToShopify}
                onChange={(e) => setPushBulkToShopify(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span>Also push updates to Shopify</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={runningBulk || products.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            {runningBulk ? 'Applying...' : 'Apply Bulk SEO Template'}
          </button>
        </div>
      </form>

      {/* Main Split Editor */}
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
          <p className="font-display text-base font-semibold text-white">
            Sync Shopify Products or Load Samples to Audit SEO
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Once loaded, you can edit Google Search titles, descriptions, handles, alt texts, and sync them back to Shopify.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left: Product SEO List */}
          <div className="space-y-3 lg:col-span-5">
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3 backdrop-blur-md">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SEO catalog..."
                    aria-label="Search SEO products"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2 pr-3 pl-8 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <select
                  aria-label="Filter by SEO audit status"
                  value={auditFilter}
                  onChange={(e) =>
                    setAuditFilter(
                      e.target.value as 'all' | 'needs_attention' | 'missing_alt' | 'good'
                    )
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">All ({products.length})</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="missing_alt">Missing Alt Text</option>
                  <option value="good">Healthy (85+)</option>
                </select>
              </div>
            </div>

            <div className="max-h-[580px] space-y-2 overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const audit = computeSeoAudit(p);
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                      active
                        ? 'border-emerald-500/70 bg-emerald-950/30'
                        : 'border-slate-800/90 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{p.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {p.seoTitle || 'No SEO title yet'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                          audit.status === 'good'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : audit.status === 'needs_work'
                              ? 'bg-amber-500/20 text-amber-200'
                              : 'bg-rose-500/20 text-rose-200'
                        }`}
                      >
                        {audit.score}%
                      </span>
                    </div>
                    {audit.issues.length > 0 && (
                      <p className="mt-1.5 truncate text-[11px] text-amber-300/90">
                        {audit.issues[0]}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: SERP Preview & SEO Editor */}
          <div className="lg:col-span-7">
            {selectedProduct && liveAudit ? (
              <form
                onSubmit={handleSaveProductSeo}
                className="space-y-4 rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">
                      {selectedProduct.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Live SEO Score:{' '}
                      <span
                        className={`font-mono font-bold ${
                          liveAudit.status === 'good'
                            ? 'text-emerald-400'
                            : liveAudit.status === 'needs_work'
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }`}
                      >
                        {liveAudit.score}/100
                      </span>
                      {(seoTitle !== (selectedProduct.seoTitle || '') ||
                        seoDescription !== (selectedProduct.seoDescription || '') ||
                        handle !== (selectedProduct.handle || '') ||
                        imageAlt !== (selectedProduct.imageAlt || '')) && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                          Unsaved draft
                        </span>
                      )}
                      {selectedProduct.shopifySyncedAt && (
                        <span className="ml-2 text-emerald-300">· Synced to Shopify</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillSelectedFromTemplate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                  >
                    <Wand2 className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                    Auto-Fill from Template
                  </button>
                </div>

                {/* Google SERP Preview */}
                <div className="rounded-xl border border-slate-700/80 bg-white p-4 text-slate-900">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Google Search Preview
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-800">
                    <span className="truncate font-mono">
                      https://{storeHost}/products/{handle || selectedProduct.handle}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                  </div>
                  <p className="mt-1 line-clamp-1 text-base font-medium text-[#1a0dab]">
                    {seoTitle.trim() || selectedProduct.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#4d5156]">
                    {seoDescription.trim() ||
                      'Add a compelling meta description (70–160 characters) so shoppers click your listing on Google Search.'}
                  </p>
                </div>

                {/* SEO Title */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="seo-title-input" className="font-medium text-slate-200">
                      SEO Page Title
                    </label>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        seoTitle.trim().length >= 25 && seoTitle.trim().length <= 60
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {seoTitle.trim().length} / 60 chars
                    </span>
                  </div>
                  <input
                    id="seo-title-input"
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="e.g. Artisan Belgian Chocolate Cake 500g | Same-Day Delivery"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="seo-desc-input" className="font-medium text-slate-200">
                      Meta Description
                    </label>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        seoDescription.trim().length >= 70 && seoDescription.trim().length <= 160
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {seoDescription.trim().length} / 160 chars
                    </span>
                  </div>
                  <textarea
                    id="seo-desc-input"
                    rows={3}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Write a clear 70–160 char summary with price, benefits & delivery promise..."
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* URL Handle & Alt Text */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="seo-handle-input" className="font-medium text-slate-200">
                        URL Handle
                      </label>
                      <button
                        type="button"
                        onClick={() => setHandle(slugifyProductHandle(selectedProduct.title))}
                        className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        Auto-Slug
                      </button>
                    </div>
                    <input
                      id="seo-handle-input"
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="seo-alt-input"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Featured Image Alt Text
                    </label>
                    <input
                      id="seo-alt-input"
                      type="text"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      placeholder="Describe product photo for Google Images"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Issues Checklist */}
                {liveAudit.issues.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                    <p className="font-semibold">Recommendations:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px]">
                      {liveAudit.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* JSON-LD Preview Toggle & Save Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSchemaPreview((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    <Code2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                    {showSchemaPreview ? 'Hide JSON-LD Schema' : 'Preview JSON-LD Schema'}
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    {savingProduct ? 'Saving & Syncing...' : 'Save & Sync to Shopify'}
                  </button>
                </div>

                {showSchemaPreview && (
                  <pre className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-black/60 p-3 font-mono text-[11px] text-sky-300">
                    {jsonLdPreview}
                  </pre>
                )}
              </form>
            ) : null}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
