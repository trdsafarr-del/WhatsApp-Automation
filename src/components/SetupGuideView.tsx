import React, { useState } from 'react';
import { Check, Cloud, Copy, Eye, EyeOff, GitBranch, ShoppingBag } from 'lucide-react';
import { buildDeployEnvSnippet, hasConfiguredShopify } from '../lib/orderRules';
import type { AppSettings, WhatsAppState } from '../lib/types';

interface SetupGuideViewProps {
  settings: AppSettings;
  cloudSyncEnabled: boolean;
  whatsapp: WhatsAppState;
}

type GuideTab = 'sync' | 'shopify' | 'railway';

function CopyField({
  label,
  value,
  secretMask,
}: {
  label: string;
  value: string;
  secretMask?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  const displayedValue = secretMask && !revealed ? secretMask : value;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {secretMask && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
            >
              {revealed ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Hide Secrets
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Show Secrets
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-100">
        {displayedValue}
      </pre>
    </div>
  );
}

export function SetupGuideView({
  settings,
  cloudSyncEnabled,
  whatsapp,
}: SetupGuideViewProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('sync');

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://your-app.vercel.app';

  const shopifyWebhookUrl = `${origin}/api/webhooks/shopify/orders-create`;
  const shopifyOrderUpdatedWebhookUrl = `${origin}/api/webhooks/shopify/orders-updated`;

  const shopifyConfigured = hasConfiguredShopify(settings);
  const rawEnvSnippet = buildDeployEnvSnippet(settings);
  const maskedEnvSnippet = buildDeployEnvSnippet({
    ...settings,
    shopifyClientSecret: settings.shopifyClientSecret ? '••••••••••••••••••••••••' : '',
    shopifyWebhookSecret: settings.shopifyWebhookSecret ? '••••••••••••••••••••••••' : '',
    shopifyAccessToken: settings.shopifyAccessToken ? '••••••••••••••••••••••••' : '',
  });

  return (
    <div className="space-y-5">
      {/* Guide Tab Strip */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
        <div
          role="tablist"
          aria-label="Deployment Guide Sections"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sync'}
            onClick={() => setActiveTab('sync')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sync'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Cloud className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            01. Env &amp; Redis Sync
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shopify'}
            onClick={() => setActiveTab('shopify')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'shopify'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            02. Shopify App &amp; Webhooks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'railway'}
            onClick={() => setActiveTab('railway')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'railway'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            03. Railway 24/7 Hosting
          </button>
        </div>
      </div>

      {activeTab === 'sync' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
            <Cloud className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Keep Shopify &amp; WhatsApp Synced Across Deployments
              </h2>
              <p className="text-xs text-slate-400">
                Use Upstash Redis + Env Vars so your store, orders, and linked WhatsApp session stay synced across AI Studio, Vercel, and Railway.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <p className="leading-relaxed">
              Settings saved in the dashboard are stored in <span className="font-mono text-xs text-white">data/db.json</span> on the current server&apos;s disk (which is excluded from GitHub for security). When you deploy to <span className="font-mono text-xs text-white">vercel.app</span>, Vercel starts empty unless you add your Environment Variables or Upstash Redis once:
            </p>

            {shopifyConfigured ? (
              <CopyField
                label="Copy & Paste into Vercel → Settings → Environment Variables (then Redeploy)"
                value={rawEnvSnippet}
                secretMask={maskedEnvSnippet}
              />
            ) : (
              <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
                <p className="font-semibold text-amber-100">Shopify credentials are not saved on this deployment yet.</p>
                <p className="mt-1">
                  Go to <span className="font-semibold text-white">Automation &amp; Shopify</span> to paste your Store Domain, Client ID, and Client Secret — OR paste <span className="font-mono text-white">SHOPIFY_STORE_DOMAIN</span>, <span className="font-mono text-white">SHOPIFY_CLIENT_ID</span>, and <span className="font-mono text-white">SHOPIFY_CLIENT_SECRET</span> directly in your Vercel Project Settings → Environment Variables, then redeploy.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-300">
              <p className="font-semibold text-white">
                Current Sync Status: {cloudSyncEnabled ? 'Cloud Redis Synced' : whatsapp.isServerless ? 'Temporary Vercel /tmp Storage' : 'Local Server Disk Only'}
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4">
                <li>
                  <span className="font-semibold text-white">Step A (Shopify Forever Linked):</span> Paste the variables above into Vercel → <span className="font-medium text-slate-200">Settings → Environment Variables</span> and click <span className="font-medium text-slate-200">Redeploy</span>. Shopify stays connected across every deploy.
                </li>
                <li>
                  <span className="font-semibold text-white">Step B (Same Live Orders &amp; WhatsApp Everywhere):</span> In Vercel → <span className="font-medium text-slate-200">Storage → Browse Marketplace → Upstash Redis</span> (free tier), connect Redis so <span className="font-mono text-emerald-300">KV_REST_API_URL</span> &amp; <span className="font-mono text-emerald-300">KV_REST_API_TOKEN</span> (or <span className="font-mono text-emerald-300">UPSTASH_REDIS_REST_*</span>) are added automatically. Put the exact same 2 Redis env vars on your 24/7 Node host (Railway / Render).
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'shopify' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
            <ShoppingBag className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Shopify Dev Dashboard App &amp; Webhooks Setup
              </h2>
              <p className="text-xs text-slate-400">
                Follow these exact steps from dev.shopify.com and your Store Admin Webhooks panel.
              </p>
            </div>
          </div>

          <ol className="mt-5 space-y-5 text-sm text-slate-300">
            <li>
              <p className="font-semibold text-white">
                Step 1: Click &ldquo;Create app&rdquo; on dev.shopify.com
              </p>
              <p className="mt-1 leading-relaxed text-slate-400">
                On <span className="font-mono text-xs text-slate-200">dev.shopify.com/dashboard/.../apps</span>, click the <span className="font-medium text-white">Create app</span> button (top right) → choose <span className="font-medium text-white">Start from Dev Dashboard</span> → name it <span className="font-mono text-xs text-emerald-300">orderpulse-whatsapp</span>.
              </p>
            </li>

            <li>
              <p className="font-semibold text-white">
                Step 2: Add Scopes &amp; Install on Your Store
              </p>
              <p className="mt-1 leading-relaxed text-slate-400">
                In your new app version settings, add Access Scopes: <span className="font-mono text-xs text-emerald-300">read_orders</span> and <span className="font-mono text-xs text-emerald-300">write_orders</span> → click <span className="font-medium text-white">Release</span> → click <span className="font-medium text-white">Install</span> and select your store (e.g. <span className="font-medium text-white">Broomies Bakery</span>).
              </p>
            </li>

            <li>
              <p className="font-semibold text-white">
                Step 3: Copy Client ID &amp; Client Secret into OrderPulse
              </p>
              <p className="mt-1 leading-relaxed text-slate-400">
                Open <span className="font-medium text-white">Settings</span> inside your app on <span className="font-mono text-xs text-slate-200">dev.shopify.com</span>, copy the <span className="font-medium text-white">Client ID</span> and <span className="font-medium text-white">Client Secret</span>, and paste them along with your <span className="font-mono text-xs text-slate-200">.myshopify.com</span> domain in the <span className="font-medium text-white">Automation &amp; Shopify</span> tab. Click <span className="font-medium text-white">Test Shopify Connection</span>.
              </p>
            </li>

            <li className="space-y-2.5">
              <p className="font-semibold text-white">
                Step 4: Add Automatic Webhooks in Shopify Store Admin
              </p>
              <p className="leading-relaxed text-slate-400">
                Open your Store Admin (<span className="font-mono text-xs text-slate-200">admin.shopify.com</span>) → <span className="font-medium text-white">Settings → Notifications → Webhooks → Create webhook</span>. Add <span className="font-mono text-xs text-emerald-300">Order creation</span> (JSON) and optionally <span className="font-mono text-xs text-emerald-300">Order update</span> for instant tracking WhatsApp delivery (auto-sync also checks every 30s):
              </p>
              <CopyField label="Shopify Order Creation Webhook URL" value={shopifyWebhookUrl} />
              <CopyField label="Shopify Order Update / Tracking Webhook URL (Optional)" value={shopifyOrderUpdatedWebhookUrl} />
              <p className="text-xs text-slate-400">
                Paste the signing secret shown at the bottom of Shopify&apos;s Webhooks page into <span className="font-medium text-slate-200">Webhook Signing Secret</span> in Automation &amp; Shopify settings.
              </p>
            </li>
          </ol>
        </section>
      )}

      {activeTab === 'railway' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
            <GitBranch className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-white">
                GitHub Push &amp; 24/7 Railway + Vercel Hosting (When Laptop Is Off)
              </h2>
              <p className="text-xs text-slate-400">
                Includes <span className="font-mono text-slate-200">Dockerfile</span> &amp; <span className="font-mono text-slate-200">railway.json</span> for 24/7 Railway hosting and <span className="font-mono text-slate-200">vercel.json</span> for Vercel dashboard sync.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <CopyField
              label="Push Latest Code to GitHub"
              value="git add . && git commit -m 'OrderPulse 24/7 Railway + Vercel sync' && git push"
            />

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-300">
              <p className="font-semibold text-white">
                Railway 24/7 Setup Steps (Takes ~3 Minutes):
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                <li>
                  Open <span className="font-mono text-emerald-300">railway.app</span> → <span className="font-medium text-white">New Project → Deploy from GitHub Repo</span> → select this repository.
                </li>
                <li>
                  In your Railway Service → <span className="font-medium text-white">Variables</span> tab, add: <span className="font-mono text-emerald-300">NODE_ENV=production</span>, <span className="font-mono text-emerald-300">UPSTASH_REDIS_REST_URL</span>, and <span className="font-mono text-emerald-300">UPSTASH_REDIS_REST_TOKEN</span>.
                </li>
                <li>
                  In Railway → <span className="font-medium text-white">Settings → Deploy</span>, ensure <span className="font-semibold text-white">Serverless / Sleep Mode is OFF</span> so WhatsApp stays active 24/7 even when no browser tab is open.
                </li>
                <li>
                  Update your Shopify Store Admin webhooks (<span className="font-mono text-emerald-300">orders/create</span> &amp; <span className="font-mono text-emerald-300">orders/updated</span>) to your Railway URL so new orders and tracking links trigger 24/7.
                </li>
              </ol>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
              <p className="font-semibold text-amber-100">
                Important Rule (Railway + Vercel Together):
              </p>
              <ul className="mt-1.5 list-disc space-y-1.5 pl-4">
                <li>
                  <span className="font-semibold text-white">Keep Railway as your 1 Always-On WhatsApp Socket:</span> WhatsApp allows only one active Baileys socket per linked device session at a time. Once Railway is live, click <span className="font-semibold text-white">Pause Here (Let Railway Run 24/7)</span> in the WhatsApp QR tab on AI Studio so Railway holds the socket cleanly while Vercel mirrors live data via Upstash Redis.
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
