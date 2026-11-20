import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  MapPin,
  Palette,
  Power,
  RotateCcw,
  SearchCheck,
  ShoppingBag,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { dashboardFetch } from '../lib/dashboardAuth';
import {
  DEFAULT_FESTIVAL_THEME_CONFIG,
  FESTIVAL_THEME_PRESETS,
  type FestivalThemeConfig,
  type FestivalThemeId,
  type FestivalThemeIntensity,
  getFestivalPresetById,
  normalizeFestivalThemeConfig,
  resolveEffectiveFestivalPreset,
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
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(savedFestival);
  }, [savedFestival]);

  const resolved = useMemo(() => resolveEffectiveFestivalPreset(draft), [draft]);
  const autoPreset = useMemo(
    () => getFestivalPresetById(resolved.autoDetectedId),
    [resolved.autoDetectedId]
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
    void persistFestivalTheme(
      nextConfig,
      nextConfig.enableFestiveEffects
        ? 'Subtle festive animation effects enabled.'
        : 'Festive animation effects turned off.'
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

  const previewPalette = showFestivePreview
    ? resolved.preset.palette
    : {
        pageBg: '#FFFFFF',
        surfaceBg: '#FFFFFF',
        surfaceAltBg: '#F8FAFC',
        textColor: '#111827',
        mutedTextColor: '#6B7280',
        primary: '#111827',
        primaryHover: '#1F2937',
        primaryText: '#FFFFFF',
        accent: '#E5E7EB',
        accentSoft: '#F3F4F6',
        headerBg: '#FFFFFF',
        headerText: '#111827',
        footerBg: '#F9FAFB',
        footerText: '#374151',
        bannerBg: '#111827',
        bannerText: '#FFFFFF',
        borderColor: '#E5E7EB',
      };

  const shopDomain = settings.shopifyStoreDomain || 'broomiesbakery.in';
  const shopDisplayName = settings.shopName || 'Broomies Bakery';

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

      {/* Main 12-Col Studio: Preview first on narrow/split-screen viewports, side-by-side at lg+ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Left: Festival Selector & Customization */}
        <div className="order-2 space-y-5 lg:order-1 lg:col-span-7">
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

          {/* Fine-Tuning Options */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5">
            <h3 className="font-display text-sm font-semibold text-white">
              Festive Styling &amp; Announcement Bar
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Intensity Selector */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold text-slate-200">Color Theme Coverage</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Choose full page re-theming or subtle festive accents only.
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

              {/* Banner & Effects Toggles */}
              <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
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
                    <p className="text-xs font-semibold text-slate-200">Festive Sparkle / Snow FX</p>
                    <p className="text-[11px] text-slate-400">Light non-blocking particles</p>
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
              </div>
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

        {/* Right (top on mobile/split-screen): Live Interactive Shopify Storefront Preview */}
        <div className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2 lg:col-span-5">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">
                  Live Shopify Storefront Preview
                </h3>
                <p className="text-[11px] text-slate-400">
                  {showFestivePreview
                    ? draft.enabled
                      ? `Live on Store: ${resolved.preset.name} (${draft.intensity === 'full' ? 'Full Colors' : 'Accents Only'})`
                      : `Previewing ${resolved.preset.name} — Flip ON to publish live`
                    : 'Previewing Original Unmodified Shopify Theme'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
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

            {/* Browser Chrome Mockup */}
            <div
              data-testid="festival-storefront-preview"
              className="overflow-hidden rounded-xl border border-slate-700/80 shadow-xl transition-colors duration-300"
              style={{
                backgroundColor:
                  showFestivePreview && draft.intensity === 'subtle'
                    ? '#FFFFFF'
                    : previewPalette.pageBg,
                color:
                  showFestivePreview && draft.intensity === 'subtle'
                    ? '#111827'
                    : previewPalette.textColor,
              }}
            >
              {/* Browser URL Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-3 py-2 text-[10px] text-slate-400">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="truncate font-mono text-[10px] text-slate-300">
                    https://{shopDomain}
                  </span>
                </div>
                {showFestivePreview && !draft.enabled && (
                  <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-300">
                    PREVIEW ONLY
                  </span>
                )}
              </div>

              {/* Optional Festive Announcement Bar */}
              {showFestivePreview && draft.showAnnouncementBar && (
                <div
                  className="px-3 py-1.5 text-center text-[10px] font-semibold leading-snug"
                  style={{
                    backgroundColor: previewPalette.bannerBg,
                    color: previewPalette.bannerText,
                  }}
                >
                  <span className="mr-1.5 rounded bg-black/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    {resolved.preset.badgeText}
                  </span>
                  {resolved.effectiveBannerText}
                </div>
              )}

              {/* Mini Store Header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 transition-colors duration-300"
                style={{
                  backgroundColor: previewPalette.headerBg,
                  color: previewPalette.headerText,
                  borderBottom: `2px solid ${showFestivePreview ? previewPalette.accent : '#E5E7EB'}`,
                }}
              >
                <span className="text-xs font-bold tracking-tight">{shopDisplayName}</span>
                <div className="flex items-center gap-3 text-[10px] opacity-90">
                  <span>Shop</span>
                  <span>Hampers</span>
                  <span>Track</span>
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>

              {/* Mini Store Body */}
              <div className="space-y-3 p-4">
                {/* Hero Block */}
                <div
                  className="rounded-lg p-3.5 transition-colors duration-300"
                  style={{
                    backgroundColor:
                      showFestivePreview && draft.intensity === 'full'
                        ? previewPalette.surfaceAltBg
                        : '#F8FAFC',
                    border: `1px solid ${
                      showFestivePreview && draft.intensity === 'full'
                        ? previewPalette.borderColor
                        : '#E5E7EB'
                    }`,
                  }}
                >
                  <span
                    className="inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: showFestivePreview ? previewPalette.accent : '#E5E7EB',
                      color: showFestivePreview ? previewPalette.bannerText : '#111827',
                    }}
                  >
                    {showFestivePreview ? resolved.preset.badgeText : 'Freshly Baked'}
                  </span>
                  <p className="mt-1.5 text-sm font-bold leading-snug">
                    {showFestivePreview
                      ? `${resolved.preset.shortName} Artisanal Gift Collection`
                      : 'Signature Artisanal Cookie Tins & Cakes'}
                  </p>
                  <p
                    className="mt-0.5 text-[11px]"
                    style={{
                      color:
                        showFestivePreview && draft.intensity === 'full'
                          ? previewPalette.mutedTextColor
                          : '#6B7280',
                    }}
                  >
                    Handcrafted daily with pan-India express shipping &amp; COD confirmation.
                  </p>
                  <span
                    className="mt-2.5 inline-block rounded-md px-3 py-1.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: previewPalette.primary,
                      color: previewPalette.primaryText,
                    }}
                  >
                    Shop Collection
                  </span>
                </div>

                {/* Product Cards Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { name: 'Chocolate Cookies Tin', price: '₹1,075' },
                    { name: 'Assorted Festive Box', price: '₹1,450' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="rounded-lg p-2.5 transition-colors duration-300"
                      style={{
                        backgroundColor:
                          showFestivePreview && draft.intensity === 'full'
                            ? previewPalette.surfaceBg
                            : '#FFFFFF',
                        border: `1px solid ${
                          showFestivePreview && draft.intensity === 'full'
                            ? previewPalette.borderColor
                            : '#E5E7EB'
                        }`,
                      }}
                    >
                      <div
                        className="flex h-14 items-center justify-center rounded-md text-[10px] font-semibold"
                        style={{
                          backgroundColor:
                            showFestivePreview && draft.intensity === 'full'
                              ? previewPalette.accentSoft
                              : '#F3F4F6',
                          color:
                            showFestivePreview && draft.intensity === 'full'
                              ? previewPalette.primary
                              : '#4B5563',
                        }}
                      >
                        Product Photo
                      </div>
                      <p className="mt-2 truncate text-[11px] font-semibold">{item.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold">{item.price}</span>
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: previewPalette.primary,
                            color: previewPalette.primaryText,
                          }}
                        >
                          Add
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini Store Footer */}
              <div
                className="flex items-center justify-between px-4 py-2 text-[10px] transition-colors duration-300"
                style={{
                  backgroundColor:
                    showFestivePreview && draft.intensity === 'full'
                      ? previewPalette.footerBg
                      : '#F9FAFB',
                  color:
                    showFestivePreview && draft.intensity === 'full'
                      ? previewPalette.footerText
                      : '#4B5563',
                  borderTop: `2px solid ${
                    showFestivePreview && draft.intensity === 'full'
                      ? previewPalette.accent
                      : '#E5E7EB'
                  }`,
                }}
              >
                <span>© {shopDisplayName}</span>
                <span>{showFestivePreview && draft.enableFestiveEffects ? 'FX Active' : 'Fast COD'}</span>
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
