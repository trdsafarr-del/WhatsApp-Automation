import React, { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  Check,
  Cloud,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  LogOut,
  Server,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { RECOMMENDED_RTDB_RULES_JSON, rtdbProjectMeta } from '../lib/rtdb';
import { buildDeployEnvSnippet, hasConfiguredShopify } from '../lib/orderRules';
import type { AppSettings, WhatsAppState } from '../lib/types';

interface SetupGuideViewProps {
  settings: AppSettings;
  cloudSyncEnabled: boolean;
  upstashQuotaExceeded?: boolean;
  whatsapp: WhatsAppState;
  firebaseUser?: FirebaseUser | null;
  rtdbSyncState?: 'idle' | 'syncing' | 'synced' | 'error';
  cloudSummary?: {
    loaded: boolean;
    hasShopify: boolean;
    orders: number;
    products: number;
  };
  googleAuthBusy?: boolean;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
}

type GuideTab = 'sync' | 'shopify' | 'railway' | 'oracle';

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
  upstashQuotaExceeded = false,
  whatsapp,
  firebaseUser = null,
  rtdbSyncState = 'idle',
  cloudSummary,
  googleAuthBusy = false,
  onGoogleSignIn,
  onGoogleSignOut,
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

  const rawOracleEnvSnippet = [
    'NODE_ENV=production',
    'PORT=3000',
    rawEnvSnippet,
    'UPSTASH_REDIS_REST_URL=paste_your_upstash_url_here',
    'UPSTASH_REDIS_REST_TOKEN=paste_your_upstash_token_here',
    'DASHBOARD_PASSCODE=your_admin_passcode',
  ]
    .filter(Boolean)
    .join('\n');

  const maskedOracleEnvSnippet = [
    'NODE_ENV=production',
    'PORT=3000',
    maskedEnvSnippet,
    'UPSTASH_REDIS_REST_URL=paste_your_upstash_url_here',
    'UPSTASH_REDIS_REST_TOKEN=••••••••••••••••••••••••',
    'DASHBOARD_PASSCODE=••••',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Guide Tab Strip */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3 backdrop-blur-md sm:p-4">
        <div
          role="tablist"
          aria-label="Deployment Guide Sections"
          className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-1 sm:flex-wrap"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sync'}
            onClick={() => setActiveTab('sync')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
              activeTab === 'sync'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Cloud className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            01. Firebase RTDB &amp; Env
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shopify'}
            onClick={() => setActiveTab('shopify')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
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
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
              activeTab === 'railway'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            03. Railway 24/7 Hosting
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'oracle'}
            onClick={() => setActiveTab('oracle')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
              activeTab === 'oracle'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Server className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            04. Oracle 24/7 Free VM
          </button>
        </div>
      </div>

      {activeTab === 'sync' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-2.5 sm:items-center">
              <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400 sm:mt-0" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  Firebase Realtime Database Sync (No Daily Read/Write Op Cap)
                </h2>
                <p className="text-xs text-slate-400">
                  Syncs changed orders, products, and store config over a single WebSocket via per-key delta patches — free Spark tier includes 10 GB/month downloads and 1 GB storage.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {firebaseUser ? (
                <button
                  type="button"
                  disabled={googleAuthBusy}
                  onClick={() => onGoogleSignOut?.()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Sign Out Google
                </button>
              ) : (
                <button
                  type="button"
                  disabled={googleAuthBusy}
                  onClick={() => onGoogleSignIn?.()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
                >
                  <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                  {googleAuthBusy ? 'Connecting...' : 'Sign in with Google'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-4 text-xs leading-relaxed text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Firebase RTDB Project: <span className="font-mono text-white">{rtdbProjectMeta.projectId}</span>
                  </p>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-slate-400">
                    {rtdbProjectMeta.databaseURL}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                    firebaseUser
                      ? rtdbSyncState === 'error'
                        ? 'bg-rose-500/20 text-rose-200'
                        : 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {firebaseUser
                    ? rtdbSyncState === 'syncing'
                      ? 'Syncing...'
                      : rtdbSyncState === 'error'
                        ? 'Rules Needed'
                        : `Connected (${firebaseUser.email})`
                    : 'Not Signed In'}
                </span>
              </div>
              {firebaseUser && cloudSummary?.loaded && (
                <p className="mt-2 font-mono text-[11px] text-emerald-200/90">
                  Cloud Backup in RTDB: Shopify {cloudSummary.hasShopify ? 'Saved' : 'Empty'} · {cloudSummary.orders} orders · {cloudSummary.products} products
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={rtdbProjectMeta.rulesConsoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-600/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-600/30"
                >
                  1. Open RTDB Rules
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <a
                  href={rtdbProjectMeta.authProvidersConsoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                >
                  2. Enable Google Sign-In
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <a
                  href={rtdbProjectMeta.authDomainsConsoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                >
                  3. Add Authorized Domains
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
              <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-slate-300">
                <li>
                  <span className="font-semibold text-white">Publish Verified-Gmail RTDB Rules:</span> Open <span className="font-mono text-emerald-300">Realtime Database → Rules</span> above, paste the exact JSON rule below (allows any verified Gmail login on <span className="font-mono text-white">/orderpulse</span> while blocking unauthenticated access at root), and click <span className="font-semibold text-white">Publish</span>.
                </li>
                <li>
                  <span className="font-semibold text-white">Enable Google Auth &amp; Domains:</span> Turn on <span className="font-semibold text-white">Google</span> under <span className="font-mono text-emerald-300">Authentication → Sign-in method</span>, and add <span className="font-mono text-white">faridabad.broomiesbakery.in</span> under <span className="font-mono text-emerald-300">Authentication → Settings → Authorized domains</span>.
                </li>
                <li>
                  <span className="font-semibold text-white">Sync Once &amp; Restore Anywhere:</span> Click <span className="font-semibold text-emerald-300">RTDB Sync</span> on AI Studio (where your existing orders &amp; Shopify config live), then click <span className="font-semibold text-emerald-300">RTDB Sync</span> on <span className="font-mono text-white">faridabad.broomiesbakery.in</span> — everything restores live.
                </li>
              </ol>
            </div>

            <CopyField
              label="Step 1: Paste in Firebase Console -> Realtime Database -> Rules -> Publish (Any Verified Gmail)"
              value={RECOMMENDED_RTDB_RULES_JSON}
            />

            {shopifyConfigured ? (
              <CopyField
                label="Recommended: Also Paste into Vercel -> Settings -> Environment Variables (keeps Shopify API live on cold requests)"
                value={rawEnvSnippet}
                secretMask={maskedEnvSnippet}
              />
            ) : (
              <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
                <p className="font-semibold text-amber-100">Shopify credentials are not saved on this deployment yet.</p>
                <p className="mt-1">
                  Click <span className="font-semibold text-white">Sign in with Google</span> above to auto-restore from Firebase Realtime Database, OR paste <span className="font-mono text-white">SHOPIFY_STORE_DOMAIN</span>, <span className="font-mono text-white">SHOPIFY_CLIENT_ID</span>, and <span className="font-mono text-white">SHOPIFY_CLIENT_SECRET</span> in Vercel Project Settings → Environment Variables and redeploy.
                </p>
              </div>
            )}

            <CopyField
              label="Optional 24/7 Server-Side RTDB Env Vars (for Vercel / Railway zero-login backend sync)"
              value={`FIREBASE_RTDB_URL=${rtdbProjectMeta.databaseURL}\nFIREBASE_RTDB_SECRET=paste_database_secret_from_firebase_project_settings_service_accounts`}
            />

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-300">
              <p className="font-semibold text-white">
                Current Storage Status:{' '}
                {firebaseUser
                  ? 'Firebase Realtime Database (Per-Key Delta Sync)'
                  : upstashQuotaExceeded
                    ? 'Upstash Redis Bandwidth Exhausted (Switch to Firebase RTDB above)'
                    : cloudSyncEnabled
                      ? 'Server Cloud DB Active'
                      : whatsapp.isServerless
                        ? 'Temporary Vercel /tmp Storage'
                        : 'Local Server Disk Only'}
              </p>
              <p className="mt-1.5 text-slate-400">
                Tip: If your Upstash free 10 GB monthly limit is finished, you can safely remove <span className="font-mono text-slate-200">UPSTASH_REDIS_REST_URL</span> / <span className="font-mono text-slate-200">KV_REST_API_URL</span> from Vercel and use Firebase Realtime Database (<span className="font-mono text-slate-200">{rtdbProjectMeta.projectId}</span>) + Vercel <span className="font-mono text-slate-200">SHOPIFY_*</span> env vars.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'shopify' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
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
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
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

      {activeTab === 'oracle' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
            <Server className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Oracle Cloud (OCI Mumbai) Always-Free 24/7 Hosting
              </h2>
              <p className="text-xs text-slate-400">
                Run WhatsApp Baileys, 30s Shopify auto-sync, and Geo-SEO pages 24/7 on a free Ubuntu VM with PM2 + Nginx HTTPS.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-300">
              <p className="font-semibold text-white">
                Step 1: Create Always-Free VM &amp; Open OCI Firewall (Ports 80, 443, 3000)
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                <li>
                  In Oracle Cloud Home → <span className="font-medium text-white">Compute → Create a VM instance</span> → choose <span className="font-mono text-emerald-300">Ubuntu 22.04 Minimal</span> (or <span className="font-mono text-emerald-300">24.04</span>) and shape <span className="font-mono text-emerald-300">VM.Standard.A1.Flex</span> (2 OCPU, 12 GB RAM — Always Free; or <span className="font-mono text-slate-200">VM.Standard.E2.1.Micro</span> if A1 capacity is full).
                </li>
                <li>
                  Click <span className="font-medium text-white">Save Private Key</span> (<span className="font-mono text-slate-200">.key</span>) before clicking Create, then copy the instance <span className="font-medium text-white">Public IPv4 Address</span>.
                </li>
                <li>
                  Open Instance → <span className="font-medium text-white">Subnet → Default Security List → Add Ingress Rules</span>: Source CIDR <span className="font-mono text-emerald-300">0.0.0.0/0</span>, Destination Ports <span className="font-mono text-emerald-300">80,443,3000</span> (TCP).
                </li>
              </ol>
            </div>

            <CopyField
              label="Step 2: SSH Into Ubuntu & Install Node 22 + PM2 + Nginx + Open Ubuntu Firewall"
              value={`sudo apt update && sudo apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save || sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null`}
            />

            <CopyField
              label="Step 3: Clone Repo & Create .env on Oracle VM"
              value={rawOracleEnvSnippet}
              secretMask={maskedOracleEnvSnippet}
            />

            <CopyField
              label="Step 4: Build & Start 24/7 Auto-Boot Process with PM2"
              value={`git clone <YOUR_GITHUB_REPO_URL> orderpulse && cd orderpulse
npm install
npm run build
cat << 'EOF' > ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'orderpulse',
    script: './node_modules/.bin/tsx',
    args: 'server.ts',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
};
EOF
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup`}
            />

            <CopyField
              label="Step 5: Point faridabad.broomiesbakery.in DNS A-Record to Oracle IP & Enable Free SSL"
              value={`sudo tee /etc/nginx/sites-available/orderpulse >/dev/null << 'EOF'
server {
    listen 80;
    server_name faridabad.broomiesbakery.in;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/orderpulse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d faridabad.broomiesbakery.in`}
            />
          </div>
        </section>
      )}
    </div>
  );
}
