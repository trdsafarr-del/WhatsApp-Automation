import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gift,
  Link2,
  MapPin,
  Monitor,
  Palette,
  Pin,
  Power,
  RefreshCw,
  RotateCcw,
  SearchCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { dashboardFetch } from '../lib/dashboardAuth';
import {
  getFestival3DBackgroundSpec,
  getFestivalHeroCopy,
  selectBestFestivalProducts,
} from '../lib/festivalShowcase';
import {
  DEFAULT_FESTIVAL_THEME_CONFIG,
  FESTIVAL_THEME_PRESETS,
  type FestivalFeaturedProduct,
  type FestivalThemeConfig,
  type FestivalThemeId,
  type FestivalThemeIntensity,
  buildFestivalPreviewUrl,
  buildFestivalThemePayload,
  getFestivalPresetById,
  normalizeFestivalThemeConfig,
  normalizeShopPreviewOrigin,
  resolveEffectiveFestivalPreset,
  sanitizePreviewPath,
} from '../lib/festivalThemes';
import type { AppSettings, StorefrontConfig } from '../lib/types';

interface ThemeStudioViewProps {
  storefrontConfig: StorefrontConfig;
  settings: AppSettings;
  onStorefrontConfigUpdated: (config: StorefrontConfig) => void;
  onOpenPincodeCatalog: () => void;
  onOpenSeoManager: () => void;
}

export function ThemeStudioView({
  storefrontConfig,
  settings,
  onStorefrontConfigUpdated,
  onOpenPincodeCatalog,
  onOpenSeoManager,
}: ThemeStudioViewProps) {
  const savedFestival = useMemo(
    () => normalizeFestivalThemeConfig(storefrontConfig.festivalTheme),
    [storefrontConfig.festivalTheme]
  );

  const [draft, setDraft] = useState<FestivalThemeConfig>(savedFestival);
  const [previewMode, setPreviewMode] = useState<'festive' | 'original'>(
    savedFestival.enabled ? 'festive' : 'original'
  );
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewPath, setPreviewPath] = useState<string>('/');
  const [iframeRefreshNonce, setIframeRefreshNonce] = useState<number>(0);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [copiedPreviewLink, setCopiedPreviewLink] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveCatalog, setLiveCatalog] = useState<FestivalFeaturedProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [showProductPicker, setShowProductPicker] = useState<boolean>(false);

  useEffect(() => {
    setDraft(savedFestival);
  }, [savedFestival]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    dashboardFetch('/api/storefront/festival-products')
      .then((res) => res.json())
      .then((data: { ok?: boolean; products?: FestivalFeaturedProduct[] }) => {
        if (!cancelled && data.ok && Array.isArray(data.products)) {
          setLiveCatalog(data.products);
        }
      })
      .catch(() => {
        // Non-fatal; preview server also fetches live catalog
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved = useMemo(() => resolveEffectiveFestivalPreset(draft), [draft]);
  const autoPreset = useMemo(
    () => getFestivalPresetById(resolved.autoDetectedId),
    [resolved.autoDetectedId]
  );
  const activeHeroCopy = useMemo(
    () => getFestivalHeroCopy(resolved.preset.id, settings.shopName),
    [resolved.preset.id, settings.shopName]
  );
  const active3DBgSpec = useMemo(
    () => getFestival3DBackgroundSpec(resolved.preset.id),
    [resolved.preset.id]
  );
  const activeFeaturedProducts = useMemo(
    () =>
      selectBestFestivalProducts(
        liveCatalog,
        resolved.preset.id,
        draft.featuredProductHandles || [],
        3
      ),
    [liveCatalog, resolved.preset.id, draft.featuredProductHandles]
  );

  const persistFestivalTheme = async (
    nextFestival: FestivalThemeConfig,
    feedbackLabel: string
  ) => {
    const normalized = normalizeFestivalThemeConfig(nextFestival);
    setDraft(normalized);
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await dashboardFetch('/api/storefront/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...storefrontConfig,
          festivalTheme: normalized,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        storefrontConfig?: StorefrontConfig;
      };
      if (!res.ok || !data.ok || !data.storefrontConfig) {
        throw new Error(data.error || `Failed to save theme (${res.status})`);
      }
      onStorefrontConfigUpdated(data.storefrontConfig);
      setStatusMessage(feedbackLabel);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save festival theme.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMasterToggle = () => {
    const nextEnabled = !draft.enabled;
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      enabled: nextEnabled,
    };
    const nextResolved = resolveEffectiveFestivalPreset(nextConfig);
    setPreviewMode(nextEnabled ? 'festive' : 'original');
    void persistFestivalTheme(
      nextConfig,
      nextEnabled
        ? `${nextResolved.preset.name} theme applied live to your Shopify storefront.`
        : 'Festival theme turned OFF — original Shopify theme restored.'
    );
  };

  const handleRestoreOriginal = () => {
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      enabled: false,
    };
    setPreviewMode('original');
    void persistFestivalTheme(
      nextConfig,
      'Original Shopify theme restored with zero leftover styles.'
    );
  };

  const handleSelectFestival = (festivalId: FestivalThemeId) => {
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      selectedFestivalId: festivalId,
    };
    const nextResolved = resolveEffectiveFestivalPreset(nextConfig);
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      nextConfig.enabled
        ? `Switched live Shopify theme to ${nextResolved.preset.name}.`
        : `Previewing ${nextResolved.preset.name}. Flip the switch ON to publish live.`
    );
  };

  const handleIntensityChange = (intensity: FestivalThemeIntensity) => {
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      intensity,
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      intensity === 'full'
        ? 'Full storefront festival color palette enabled.'
        : 'Subtle festive accent mode (header, buttons & badges) enabled.'
    );
  };

  const handleToggleAnnouncementBar = () => {
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      showAnnouncementBar: !draft.showAnnouncementBar,
    };
    void persistFestivalTheme(
      nextConfig,
      nextConfig.showAnnouncementBar
        ? 'Festive announcement bar enabled.'
        : 'Festive announcement bar hidden.'
    );
  };

  const handleToggleEffects = () => {
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      enableFestiveEffects: !draft.enableFestiveEffects,
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      nextConfig.enableFestiveEffects
        ? 'Festive snowfall, sparkles & floating particle animations enabled.'
        : 'Festive animation particles turned off.'
    );
  };

  const handleToggleHeroBanner = () => {
    const nextShow = draft.showHeroBanner === false;
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      showHeroBanner: nextShow,
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      nextShow
        ? 'Auto 3D Product Hero Banner enabled with your top store products.'
        : 'Auto 3D Product Hero Banner hidden.'
    );
  };

  const handleToggle3DArticles = () => {
    const nextShow = draft.show3DArticles === false;
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      show3DArticles: nextShow,
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      nextShow
        ? '3D festive articles & twinkling hanging lights enabled.'
        : '3D festive articles & hanging lights hidden.'
    );
  };

  const handleToggle3DBackground = () => {
    const nextShow = draft.show3DBackground === false;
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      show3DBackground: nextShow,
      intensity: nextShow ? 'full' : draft.intensity,
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      nextShow
        ? 'Full-website 3D animated background & 3D festive depth colors enabled.'
        : '3D animated background layer disabled.'
    );
  };

  const handleToggle3DCardSnow = () => {
    const nextShow = draft.show3DCardSnow === false;
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      show3DCardSnow: nextShow,
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      nextShow
        ? '3D sculpted snow caps & icicles enabled on all storefront cards (60fps smooth mode).'
        : '3D snow accumulation on cards turned off.'
    );
  };

  const handleToggleFeaturedProduct = (handle: string) => {
    const clean = handle.trim();
    if (!clean) return;
    const current = [...(draft.featuredProductHandles || [])];
    const existsIdx = current.findIndex((h) => h.toLowerCase() === clean.toLowerCase());
    let nextHandles: string[];
    if (existsIdx >= 0) {
      nextHandles = current.filter((_, idx) => idx !== existsIdx);
    } else if (current.length >= 3) {
      nextHandles = [...current.slice(1), clean];
    } else {
      nextHandles = [...current, clean];
    }
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      featuredProductHandles: nextHandles,
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      nextHandles.length > 0
        ? `Pinned ${nextHandles.length} custom product${nextHandles.length > 1 ? 's' : ''} into the 3D festive hero banner.`
        : 'Switched back to automatic best-product selection.'
    );
  };

  const handleResetAutoPickProducts = () => {
    const nextConfig: FestivalThemeConfig = {
      ...draft,
      featuredProductHandles: [],
    };
    setPreviewMode('festive');
    void persistFestivalTheme(
      nextConfig,
      `Auto-picking the best ${resolved.preset.shortName} products from your store automatically.`
    );
  };

  const handleSaveBannerText = (e: React.FormEvent) => {
    e.preventDefault();
    void persistFestivalTheme(draft, 'Custom festive banner message saved.');
  };

  const handleResetDefaults = () => {
    setPreviewMode('original');
    void persistFestivalTheme(
      { ...DEFAULT_FESTIVAL_THEME_CONFIG },
      'Theme settings reset and original Shopify theme restored.'
    );
  };

  const showFestivePreview = draft.enabled ? previewMode !== 'original' : previewMode === 'festive';

  const normalizedStoreOrigin = useMemo(
    () => normalizeShopPreviewOrigin(settings.shopifyStoreDomain),
    [settings.shopifyStoreDomain]
  );

  const livePreviewPayload = useMemo(
    () =>
      buildFestivalThemePayload(
        {
          ...draft,
          enabled: showFestivePreview,
        },
        {
          catalogProducts: liveCatalog,
          shopName: settings.shopName,
        }
      ),
    [draft, showFestivePreview, liveCatalog, settings.shopName]
  );

  // Stable iframe src — only reloads when storefront path or manual Refresh changes;
  // theme/festival/color/banner updates stream instantaneously via postMessage with zero flicker!
  const iframeSrc = useMemo(() => {
    const base = buildFestivalPreviewUrl(
      '',
      draft,
      showFestivePreview ? 'festive' : 'original',
      previewPath
    );
    return iframeRefreshNonce > 0 ? `${base}&refresh=1&r=${iframeRefreshNonce}` : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPath, iframeRefreshNonce]);

  // Shareable absolute preview link reflecting the exact current festival & options
  const shareablePreviewLink = useMemo(() => {
    const publicBase =
      (storefrontConfig.storefrontAppUrl || '').trim().replace(/\/+$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return buildFestivalPreviewUrl(
      publicBase,
      draft,
      showFestivePreview ? 'festive' : 'original',
      previewPath
    );
  }, [storefrontConfig.storefrontAppUrl, draft, showFestivePreview, previewPath]);

  const relativePreviewLink = useMemo(
    () =>
      buildFestivalPreviewUrl(
        '',
        draft,
        showFestivePreview ? 'festive' : 'original',
        previewPath
      ),
    [draft, showFestivePreview, previewPath]
  );

  // Push live theme changes straight into the loaded real website iframe instantaneously
  const pushLivePreviewToIframe = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'ORDERPULSE_FESTIVAL_PREVIEW_UPDATE',
          payload: livePreviewPayload,
        },
        '*'
      );
    } catch {
      // Non-fatal if iframe is mid-navigation
    }
  };

  useEffect(() => {
    pushLivePreviewToIframe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePreviewPayload]);

  // Listen when user clicks a product/collection link inside the live real website preview
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (!ev.data || ev.data.type !== 'ORDERPULSE_PREVIEW_NAVIGATE') return;
      const nextPath = sanitizePreviewPath(ev.data.path);
      setIframeLoading(true);
      setPreviewPath(nextPath);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleCopyPreviewLink = async () => {
    try {
      await navigator.clipboard.writeText(shareablePreviewLink);
      setCopiedPreviewLink(true);
      setTimeout(() => setCopiedPreviewLink(false), 2200);
    } catch {
      setStatusMessage(`Preview link: ${shareablePreviewLink}`);
    }
  };

  const handleNavigatePreviewPath = (nextPath: string) => {
    const clean = sanitizePreviewPath(nextPath);
    if (clean === previewPath) {
      setIframeLoading(true);
      setIframeRefreshNonce((n) => n + 1);
      return;
    }
    setIframeLoading(true);
    setPreviewPath(clean);
  };

  return (
    <div className="space-y-5">
      {/* Master 1-Click Festival Theme ON/OFF Control Bar */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-5 backdrop-blur-md sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="festival-theme-live-status"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                  draft.enabled
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/35'
                    : 'bg-slate-800 text-slate-300 ring-1 ring-inset ring-slate-700'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    draft.enabled ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                {draft.enabled
                  ? `Festival Theme ON · ${resolved.preset.shortName}`
                  : 'OFF · Original Shopify Theme Active'}
              </span>
              {draft.selectedFestivalId === 'auto' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/12 px-2 py-1 text-[11px] font-medium text-amber-300">
                  <Wand2 className="h-3 w-3" aria-hidden="true" />
                  Auto-Detected: {autoPreset.shortName}
                </span>
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-white sm:text-xl">
              1-Click Festival Theme Studio
            </h2>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Turn ON to instantly transform your Shopify storefront colors &amp; festive banner for the active festival. Turn OFF anytime to immediately restore your original Shopify theme untouched.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Master ON / OFF Switch */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5">
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Storefront Theme
                </p>
                <p
                  className={`text-xs font-semibold ${
                    draft.enabled ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {draft.enabled ? 'ON (Festive)' : 'OFF (Original)'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.enabled}
                aria-label="Toggle Festival Theme on Shopify Storefront"
                data-testid="festival-theme-master-toggle"
                disabled={isSaving}
                onClick={handleMasterToggle}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/70 disabled:opacity-60 ${
                  draft.enabled
                    ? 'border-emerald-400/60 bg-emerald-600'
                    : 'border-slate-600 bg-slate-800'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white text-slate-900 shadow-sm transition-transform ${
                    draft.enabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
            </div>

            {draft.enabled ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleRestoreOriginal}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Restore Original Shopify Theme
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleMasterToggle}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Apply {resolved.preset.shortName} Theme Now
              </button>
            )}
          </div>
        </div>

        {(statusMessage || errorMessage) && (
          <div
            role="status"
            className={`mt-4 flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-xs ${
              errorMessage
                ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage || statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusMessage(null);
                setErrorMessage(null);
              }}
              className="text-[11px] font-medium underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Main 12-Col Studio: Real Website Preview first on narrow screens, 6/6 side-by-side at lg+ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Left: Festival Selector & Customization */}
        <div className="order-2 space-y-5 lg:order-1 lg:col-span-6">
          {/* Auto-Detect + Festival Preset Grid */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Choose Festival Color Theme
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                11 Indian &amp; Global Presets + Auto Calendar
              </span>
            </div>

            {/* Auto-Detect Festival Option */}
            <button
              type="button"
              data-testid="festival-preset-auto"
              aria-label="Select Auto-Detect Active Festival theme"
              disabled={isSaving}
              onClick={() => handleSelectFestival('auto')}
              className={`mt-4 flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${
                draft.selectedFestivalId === 'auto'
                  ? 'border-emerald-400/70 bg-emerald-500/10 ring-1 ring-emerald-400/30'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-amber-500/15 p-2 text-amber-300">
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Auto-Detect Active Festival (Recommended)
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                      Now: {autoPreset.name}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Automatically updates your storefront palette for every upcoming Indian &amp; global festival window in IST.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {[
                  autoPreset.palette.headerBg,
                  autoPreset.palette.primary,
                  autoPreset.palette.accent,
                ].map((hex) => (
                  <span
                    key={hex}
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {draft.selectedFestivalId === 'auto' && (
                  <Check className="ml-1 h-4 w-4 text-emerald-400" aria-hidden="true" />
                )}
              </div>
            </button>

            {/* 11 Festival Preset Cards */}
            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {FESTIVAL_THEME_PRESETS.map((preset) => {
                const isSelected = draft.selectedFestivalId === preset.id;
                const isActiveNow =
                  draft.enabled && resolved.preset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`festival-preset-${preset.id}`}
                    aria-label={`Select ${preset.name} theme`}
                    disabled={isSaving}
                    onClick={() => handleSelectFestival(preset.id)}
                    className={`group flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-400/75 bg-slate-800/90 ring-1 ring-emerald-400/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/90'
                    }`}
                  >
                    <div>
                      {/* 4-Color Palette Bar */}
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-white/10">
                        <span
                          className="flex-1"
                          style={{ backgroundColor: preset.palette.headerBg }}
                        />
                        <span
                          className="flex-1"
                          style={{ backgroundColor: preset.palette.primary }}
                        />
                        <span
                          className="flex-1"
                          style={{ backgroundColor: preset.palette.accent }}
                        />
                        <span
                          className="flex-1"
                          style={{ backgroundColor: preset.palette.pageBg }}
                        />
                      </div>

                      <div className="mt-2.5 flex items-start justify-between gap-1.5">
                        <span className="text-xs font-semibold text-white">
                          {preset.shortName}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                          {preset.seasonLabel}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                        {preset.tagline}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-1.5 text-[10px]">
                      <span
                        className={
                          isActiveNow
                            ? 'font-semibold text-emerald-400'
                            : isSelected
                              ? 'font-medium text-sky-300'
                              : 'text-slate-500 group-hover:text-slate-300'
                        }
                      >
                        {isActiveNow
                          ? 'Live on Store'
                          : isSelected
                            ? 'Selected'
                            : 'Select preset'}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine-Tuning: 3D Articles, Auto Hero Banner & Festive Animations */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-white">
                3D Festive Articles, Animations &amp; Auto Banner
              </h3>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <Box className="h-3 w-3" aria-hidden="true" />
                {activeHeroCopy.articleLabel}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Left Column: Color Coverage + 3D Hero/Articles Switches */}
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold text-slate-200">Color Theme Coverage</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Full store re-theming or subtle festive accents only.
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-800 bg-slate-900 p-1">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleIntensityChange('full')}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        draft.intensity === 'full'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Full Storefront
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleIntensityChange('subtle')}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        draft.intensity === 'subtle'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Accents Only
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        Auto 3D Product Hero Banner
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Auto-builds banner with your best products
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      data-testid="toggle-festival-hero-banner"
                      aria-checked={draft.showHeroBanner !== false}
                      aria-label="Toggle Auto 3D Product Hero Banner"
                      disabled={isSaving}
                      onClick={handleToggleHeroBanner}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        draft.showHeroBanner !== false
                          ? 'border-emerald-400/60 bg-emerald-600'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draft.showHeroBanner !== false ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        3D Articles &amp; Hanging Lights
                      </p>
                      <p className="text-[11px] text-slate-400">
                        3D tree, diyas, gifts &amp; twinkling garland
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      data-testid="toggle-festival-3d-articles"
                      aria-checked={draft.show3DArticles !== false}
                      aria-label="Toggle 3D Festive Articles and Hanging Lights"
                      disabled={isSaving}
                      onClick={handleToggle3DArticles}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        draft.show3DArticles !== false
                          ? 'border-emerald-400/60 bg-emerald-600'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draft.show3DArticles !== false ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        3D Snow &amp; Icicles on All Cards
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Crisp 3D snowdrift caps &amp; icicles with smooth 60fps hover lift
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      data-testid="toggle-festival-3d-card-snow"
                      aria-checked={draft.show3DCardSnow !== false}
                      aria-label="Toggle 3D Snow and Icicles on All Storefront Cards"
                      disabled={isSaving}
                      onClick={handleToggle3DCardSnow}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        draft.show3DCardSnow !== false
                          ? 'border-emerald-400/60 bg-emerald-600'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draft.show3DCardSnow !== false ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Announcement Bar + Snow/Sparkle FX */}
              <div className="flex flex-col justify-between space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Top Festive Banner</p>
                      <p className="text-[11px] text-slate-400">Show dismissible greeting bar</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.showAnnouncementBar}
                      aria-label="Toggle Festive Announcement Bar"
                      disabled={isSaving}
                      onClick={handleToggleAnnouncementBar}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        draft.showAnnouncementBar
                          ? 'border-emerald-400/60 bg-emerald-600'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draft.showAnnouncementBar ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        Snowfall, Petals &amp; Sparkle FX
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Animated festive particles on storefront
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.enableFestiveEffects}
                      aria-label="Toggle Festive Animation Effects"
                      disabled={isSaving}
                      onClick={handleToggleEffects}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        draft.enableFestiveEffects
                          ? 'border-emerald-400/60 bg-emerald-600'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draft.enableFestiveEffects ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        3D Animated Background &amp; Colors
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Full-site 3D orbs, aurora &amp; 3D depth cards
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      data-testid="toggle-festival-3d-background"
                      aria-checked={draft.show3DBackground !== false}
                      aria-label="Toggle 3D Animated Background and 3D Colors"
                      disabled={isSaving}
                      onClick={handleToggle3DBackground}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        draft.show3DBackground !== false
                          ? 'border-emerald-400/60 bg-emerald-600'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draft.show3DBackground !== false ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-md border border-slate-800/90 bg-slate-900/70 p-2.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Gift className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                    Active {resolved.preset.shortName} 3D Pack
                  </div>
                  <p className="mt-1 leading-relaxed">{activeHeroCopy.articleLabel}</p>
                  <p className="mt-1 border-t border-slate-800/80 pt-1 text-[10.5px] text-emerald-300/90">
                    3D BG: {active3DBgSpec.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-Picked 3D Banner Products Card */}
            <div
              data-testid="festival-auto-products-section"
              className="mt-4 rounded-xl border border-slate-800 bg-slate-950/75 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Auto-Picked 3D Banner Products ({resolved.preset.shortName})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(draft.featuredProductHandles || []).length > 0
                        ? 'Using your pinned products + auto-filled bestsellers from your live store.'
                        : 'Automatically picked best gift hampers & bakery hits from your live Shopify catalog.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {(draft.featuredProductHandles || []).length > 0 && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleResetAutoPickProducts}
                      className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
                    >
                      Auto-Pick Best
                    </button>
                  )}
                  {liveCatalog.length > 0 && (
                    <button
                      type="button"
                      data-testid="toggle-product-picker-btn"
                      onClick={() => setShowProductPicker((prev) => !prev)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                    >
                      {showProductPicker
                        ? 'Hide Catalog'
                        : `Customize Picks (${liveCatalog.length})`}
                    </button>
                  )}
                </div>
              </div>

              {catalogLoading ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  Loading live products from your Shopify store...
                </div>
              ) : activeFeaturedProducts.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {activeFeaturedProducts.map((prod) => {
                    const isPinned = (draft.featuredProductHandles || []).some(
                      (h) => h.toLowerCase() === prod.handle.toLowerCase()
                    );
                    const numericPrice = Number.parseFloat(
                      String(prod.price || '0').replace(/[^\d.]/g, '')
                    );
                    return (
                      <div
                        key={prod.handle}
                        data-testid="festival-auto-product-card"
                        className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/90 p-2"
                      >
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="h-12 w-12 shrink-0 rounded-md border border-slate-700/70 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                            {prod.title}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-bold text-emerald-300">
                              {Number.isFinite(numericPrice) && numericPrice > 0
                                ? `₹${Math.round(numericPrice).toLocaleString('en-IN')}`
                                : 'Featured'}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                isPinned
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-emerald-500/15 text-emerald-300'
                              }`}
                            >
                              {isPinned ? 'Pinned' : 'Auto'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2.5 text-xs text-slate-400">
                  Sync your Shopify catalog to automatically populate real product cards in the 3D banner.
                </p>
              )}

              {showProductPicker && liveCatalog.length > 0 && (
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <p className="mb-2 text-[11px] text-slate-400">
                    Click up to 3 products below to pin them into your 3D festive banner:
                  </p>
                  <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                    {liveCatalog.slice(0, 24).map((prod) => {
                      const isPinned = (draft.featuredProductHandles || []).some(
                        (h) => h.toLowerCase() === prod.handle.toLowerCase()
                      );
                      const numericPrice = Number.parseFloat(
                        String(prod.price || '0').replace(/[^\d.]/g, '')
                      );
                      return (
                        <button
                          key={prod.handle}
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleToggleFeaturedProduct(prod.handle)}
                          className={`flex items-center gap-2 rounded-lg border p-1.5 text-left transition-colors ${
                            isPinned
                              ? 'border-emerald-400/70 bg-emerald-500/15 text-white'
                              : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                          }`}
                        >
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            className="h-9 w-9 shrink-0 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium">{prod.title}</p>
                            <p className="font-mono text-[10px] text-slate-400">
                              {Number.isFinite(numericPrice) && numericPrice > 0
                                ? `₹${Math.round(numericPrice).toLocaleString('en-IN')}`
                                : ''}
                            </p>
                          </div>
                          <Pin
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isPinned ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Announcement Text */}
            <form onSubmit={handleSaveBannerText} className="mt-3.5">
              <label
                htmlFor="festival-custom-banner"
                className="block text-xs font-medium text-slate-300"
              >
                Custom Festive Announcement Text (optional — leave blank for automatic festival greeting)
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="festival-custom-banner"
                  type="text"
                  maxLength={180}
                  value={draft.customBannerText}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, customBannerText: e.target.value }))
                  }
                  placeholder={resolved.preset.defaultBannerText}
                  className="min-h-[40px] flex-1 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[40px] rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right (top on mobile/split-screen): REAL Live Website Preview + Shareable Preview Link */}
        <div className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2 lg:col-span-6">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-white">
                  Live Website Preview (Real Storefront)
                </h3>
                <p className="text-[11px] text-slate-400">
                  {showFestivePreview
                    ? draft.enabled
                      ? `Live on Store: ${resolved.preset.name} (${draft.intensity === 'full' ? 'Full Colors' : 'Accents Only'})`
                      : `Previewing ${resolved.preset.name} on your real website — Flip ON to publish live`
                    : 'Showing your real unmodified Shopify website'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <div
                  role="group"
                  aria-label="Storefront Preview Mode"
                  className="inline-flex rounded-lg border border-slate-800 bg-slate-950/90 p-0.5 text-[10px] font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewMode('festive')}
                    className={`rounded-md px-2 py-1 transition-colors ${
                      showFestivePreview
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Festive
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('original')}
                    className={`rounded-md px-2 py-1 transition-colors ${
                      !showFestivePreview
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Original
                  </button>
                </div>
                <div
                  role="group"
                  aria-label="Preview Device Size"
                  className="inline-flex rounded-lg border border-slate-800 bg-slate-950/90 p-0.5"
                >
                  <button
                    type="button"
                    aria-label="Desktop website preview"
                    title="Desktop view"
                    onClick={() => setPreviewViewport('desktop')}
                    className={`rounded-md p-1 transition-colors ${
                      previewViewport === 'desktop'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mobile website preview"
                    title="Mobile view"
                    onClick={() => setPreviewViewport('mobile')}
                    className={`rounded-md p-1 transition-colors ${
                      previewViewport === 'mobile'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <span
                  data-testid="festival-preview-mode"
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    showFestivePreview
                      ? draft.enabled
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-amber-500/15 text-amber-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {showFestivePreview ? resolved.preset.id.toUpperCase() : 'ORIGINAL'}
                </span>
              </div>
            </div>

            {/* Shareable Live Preview Link Bar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                <span
                  data-testid="festival-preview-link-text"
                  className="truncate font-mono text-[11px] text-slate-300"
                  title={shareablePreviewLink}
                >
                  {shareablePreviewLink}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  data-testid="copy-preview-link-btn"
                  onClick={() => void handleCopyPreviewLink()}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-slate-700"
                >
                  {copiedPreviewLink ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      Copy Link
                    </>
                  )}
                </button>
                <a
                  href={relativePreviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="open-full-preview-link"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Open Live Preview
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* Real Website Browser Chrome & Embedded Live Storefront Iframe */}
            <div
              data-testid="festival-storefront-preview"
              className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 shadow-xl"
            >
              {/* Browser URL Bar + Page Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-3 py-2 text-[10px] text-slate-400">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                  </div>
                  <span
                    data-testid="preview-store-url-bar"
                    className="truncate font-mono text-[10px] text-slate-200"
                  >
                    {normalizedStoreOrigin}
                    {previewPath === '/' ? '' : previewPath}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Home', path: '/' },
                    { label: 'Collections', path: '/collections' },
                    { label: 'All Products', path: '/collections/all' },
                  ].map((nav) => (
                    <button
                      key={nav.path}
                      type="button"
                      onClick={() => handleNavigatePreviewPath(nav.path)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        previewPath === nav.path
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {nav.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Reload live website preview"
                    title="Reload live store page"
                    onClick={() => {
                      setIframeLoading(true);
                      setIframeRefreshNonce((n) => n + 1);
                    }}
                    className="ml-0.5 rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${iframeLoading ? 'animate-spin text-emerald-400' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {showFestivePreview && !draft.enabled && (
                    <span className="ml-1 shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-300">
                      PREVIEW ONLY
                    </span>
                  )}
                </div>
              </div>

              {/* Embedded Real Live Storefront Viewport */}
              <div
                className={`relative w-full bg-slate-900/90 ${
                  previewViewport === 'mobile' ? 'flex justify-center py-3' : ''
                }`}
              >
                {iframeLoading && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-lg">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      Loading live website ({normalizedStoreOrigin.replace(/^https?:\/\//, '')})...
                    </div>
                  </div>
                )}

                <iframe
                  ref={iframeRef}
                  data-testid="real-storefront-preview-iframe"
                  title={`Live website preview of ${normalizedStoreOrigin}`}
                  src={iframeSrc}
                  onLoad={() => {
                    setIframeLoading(false);
                    pushLivePreviewToIframe();
                  }}
                  className={`block border-0 bg-white transition-all duration-200 ${
                    previewViewport === 'mobile'
                      ? 'h-[600px] w-[390px] max-w-full rounded-2xl border-4 border-slate-800 shadow-2xl'
                      : 'h-[560px] w-full'
                  }`}
                />
              </div>
            </div>

            {/* Zero-Risk Original Restore Guarantee */}
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              <p className="font-semibold text-white">
                Safe 1-Click Restore (Zero Liquid File Edits)
              </p>
              <p className="mt-1 leading-relaxed text-slate-400">
                OrderPulse injects festive styles cleanly through your live Storefront Bridge (<span className="font-mono text-[11px] text-slate-200">/api/storefront/widget.js</span>) without touching your Shopify theme code. Turning the switch <span className="font-semibold text-white">OFF</span> removes every injected style &amp; banner immediately.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenPincodeCatalog}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                >
                  <MapPin className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  Storefront Bridge Setup
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onOpenSeoManager}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                >
                  <SearchCheck className="h-3 w-3 text-sky-400" aria-hidden="true" />
                  SEO Manager
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleResetDefaults}
                  className="ml-auto text-[11px] font-medium text-slate-400 hover:text-white"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
