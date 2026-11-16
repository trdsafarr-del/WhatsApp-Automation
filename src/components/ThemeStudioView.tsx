import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  LayoutTemplate,
  MapPin,
  Palette,
  SearchCheck,
  Sparkles,
  Type,
} from 'lucide-react';

interface ThemeStudioViewProps {
  onOpenPincodeCatalog: () => void;
  onOpenSeoManager: () => void;
}

export function ThemeStudioView({
  onOpenPincodeCatalog,
  onOpenSeoManager,
}: ThemeStudioViewProps) {
  const plannedModules = [
    {
      title: 'Brand Palette & Typography Override',
      desc: 'Customize primary colors, buttons, corner radius, and Google Fonts across your existing Shopify theme without breaking checkout.',
      icon: Palette,
    },
    {
      title: 'Announcement Bar & Hero Section Builder',
      desc: 'Publish festive offers, COD availability banners, and custom hero layouts directly from OrderPulse.',
      icon: LayoutTemplate,
    },
    {
      title: 'Sticky Add-to-Cart & Trust Badges',
      desc: 'Boost mobile conversion with sticky purchase bars, Delhivery express badges, and WhatsApp support floating widgets.',
      icon: Sparkles,
    },
    {
      title: 'Section Order & Custom CSS Studio',
      desc: 'Inject clean scoped CSS & Liquid blocks via the same OrderPulse Storefront Bridge you already use for Pincode & SEO.',
      icon: Type,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-5 backdrop-blur-md sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
              Phase 1 (Coming Next)
            </span>
            <h2 className="mt-2 font-display text-lg font-bold text-white sm:text-xl">
              Visual Theme & Storefront UI Customizer
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">
              Pincode Catalog & SEO Manager are now live in your sidebar. Next, we will unlock Theme Studio right here so you can customize your existing Shopify theme’s colors, banners, sections, and CSS from one dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenPincodeCatalog}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Open Pincode Catalog
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenSeoManager}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
              <SearchCheck className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              Open SEO Manager
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {plannedModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.title}
              className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-slate-700 bg-slate-800/90 p-2 text-emerald-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-white">{mod.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{mod.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-5 backdrop-blur-md">
        <h3 className="font-display text-sm font-semibold text-white">
          Shopify API Scopes Checklist (Zero Impact on Existing Orders/WhatsApp)
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            'read_orders, write_orders, read_locations — Already active for Orders & Delhivery',
            'read_products, write_products — Needed for live Product Sync & SEO Push',
            'read_script_tags, write_script_tags — Optional (or paste 1-line Liquid snippet)',
            'read_themes, write_themes — Needed when we build Theme Studio next',
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-300"
            >
              <CheckCircle2
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
