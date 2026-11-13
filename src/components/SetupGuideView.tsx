import React, { useState } from 'react';
import { Check, Cloud, Copy, Eye, EyeOff, GitBranch, ShoppingBag } from 'lucide-react';
import { buildDeployEnvSnippet, hasConfiguredShopify } from '../lib/orderRules';
import type { AppSettings, WhatsAppState } from '../lib/types';

interface SetupGuideViewProps {
  settings: AppSettings;
  cloudSyncEnabled: boolean;
  whatsapp: WhatsAppState;
}

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
    <div className="rounded-lg bg-slate-100/80 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {secretMask && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
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
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
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
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-900">
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
    <div className="space-y-6">
      {/* Part 1: Why Deploy Shows "Not Configured" & 1-Click Fix */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <Cloud className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              01. Keep Shopify Linked After Deploy (Vercel / Railway / All Devices)
            </h2>
            <p className="text-xs text-slate-500">
              Why credentials saved on your dev workspace don&apos;t automatically appear on a fresh Vercel deploy — and how to sync them permanently.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-700">
          <p className="leading-relaxed">
            Settings saved in the dashboard are stored in <span className="font-mono text-xs text-slate-900">data/db.json</span> on the current server&apos;s disk (which is excluded from GitHub for security). When you deploy to <span className="font-mono text-xs text-slate-900">vercel.app</span>, Vercel starts empty unless you add your Environment Variables or Upstash Redis once:
          </p>

          {shopifyConfigured ? (
            <CopyField
              label="Copy & Paste into Vercel → Settings → Environment Variables (then Redeploy)"
              value={rawEnvSnippet}
              secretMask={maskedEnvSnippet}
            />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
              <p className="font-semibold">Shopify credentials are not saved on this deployment yet.</p>
              <p className="mt-1">
                Go to <span className="font-semibold">Automation &amp; Shopify</span> to paste your Store Domain, Client ID, and Client Secret — OR paste <span className="font-mono">SHOPIFY_STORE_DOMAIN</span>, <span className="font-mono">SHOPIFY_CLIENT_ID</span>, and <span className="font-mono">SHOPIFY_CLIENT_SECRET</span> directly in your Vercel Project Settings → Environment Variables, then redeploy.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
            <p className="font-semibold text-slate-900">
              Current Sync Status: {cloudSyncEnabled ? 'Cloud Redis Synced' : whatsapp.isServerless ? 'Temporary Vercel /tmp Storage' : 'Local Server Disk Only'}
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              <li>
                <span className="font-semibold text-slate-900">Step A (Shopify Forever Linked):</span> Paste the variables above into Vercel → <span className="font-medium">Settings → Environment Variables</span> and click <span className="font-medium">Redeploy</span>. Shopify stays connected across every deploy.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Step B (Same Live Orders &amp; WhatsApp Everywhere):</span> In Vercel → <span className="font-medium">Storage → Browse Marketplace → Upstash Redis</span> (free tier), connect Redis so <span className="font-mono">KV_REST_API_URL</span> &amp; <span className="font-mono">KV_REST_API_TOKEN</span> (or <span className="font-mono">UPSTASH_REDIS_REST_*</span>) are added automatically. Put the exact same 2 Redis env vars on your 24/7 Node host (Railway / Render).
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Part 2: Shopify Dev Dashboard Installation */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <ShoppingBag className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              02. How to Setup in Shopify Dev Dashboard (dev.shopify.com)
            </h2>
            <p className="text-xs text-slate-500">
              Follow these exact steps from the Shopify Dev Dashboard Apps page.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-5 text-sm text-slate-700">
          <li>
            <p className="font-semibold text-slate-900">
              Step 1: Click &ldquo;Create app&rdquo; on dev.shopify.com
            </p>
            <p className="mt-1 leading-relaxed">
              On <span className="font-mono text-xs text-slate-900">dev.shopify.com/dashboard/.../apps</span>, click the <span className="font-medium text-slate-900">Create app</span> button (top right) → choose <span className="font-medium text-slate-900">Start from Dev Dashboard</span> → name it <span className="font-mono text-xs text-slate-900">orderpulse-whatsapp</span>.
            </p>
          </li>

          <li>
            <p className="font-semibold text-slate-900">
              Step 2: Add Scopes &amp; Install on Your Store
            </p>
            <p className="mt-1 leading-relaxed">
              In your new app version settings, add Access Scopes: <span className="font-mono text-xs text-slate-900">read_orders</span> and <span className="font-mono text-xs text-slate-900">write_orders</span> → click <span className="font-medium text-slate-900">Release</span> → click <span className="font-medium text-slate-900">Install</span> and select your store (e.g. <span className="font-medium text-slate-900">Broomies Bakery</span>).
            </p>
          </li>

          <li>
            <p className="font-semibold text-slate-900">
              Step 3: Copy Client ID &amp; Client Secret into OrderPulse
            </p>
            <p className="mt-1 leading-relaxed">
              Open <span className="font-medium text-slate-900">Settings</span> inside your app on <span className="font-mono text-xs text-slate-900">dev.shopify.com</span>, copy the <span className="font-medium text-slate-900">Client ID</span> and <span className="font-medium text-slate-900">Client Secret</span>, and paste them along with your <span className="font-mono text-xs text-slate-900">.myshopify.com</span> domain in the <span className="font-medium text-slate-900">Automation &amp; Shopify</span> tab. Click <span className="font-medium text-slate-900">Test Shopify Connection</span>.
            </p>
          </li>

          <li className="space-y-2.5">
            <p className="font-semibold text-slate-900">
              Step 4: Add Automatic Webhooks in Shopify Store Admin
            </p>
            <p className="leading-relaxed">
              Open your Store Admin (<span className="font-mono text-xs text-slate-900">admin.shopify.com</span>) → <span className="font-medium text-slate-900">Settings → Notifications → Webhooks → Create webhook</span>. Add <span className="font-mono text-xs text-slate-900">Order creation</span> (JSON) and optionally <span className="font-mono text-xs text-slate-900">Order update</span> for instant tracking WhatsApp delivery (auto-sync also checks every 30s):
            </p>
            <CopyField label="Shopify Order Creation Webhook URL" value={shopifyWebhookUrl} />
            <CopyField label="Shopify Order Update / Tracking Webhook URL (Optional)" value={shopifyOrderUpdatedWebhookUrl} />
            <p className="text-xs text-slate-500">
              Paste the signing secret shown at the bottom of Shopify&apos;s Webhooks page into <span className="font-medium text-slate-700">Webhook Signing Secret</span> in Automation &amp; Shopify settings.
            </p>
          </li>
        </ol>
      </section>

      {/* Part 3: GitHub + 24/7 Node Hosting */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <GitBranch className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              03. GitHub Push &amp; 24/7 Background Hosting (When Laptop Is Off)
            </h2>
            <p className="text-xs text-slate-500">
              Includes <span className="font-mono">vercel.json</span> for Vercel and <span className="font-mono">npm start</span> for 24/7 Node hosting.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-700">
          <CopyField
            label="Push to GitHub"
            value="git init && git add . && git commit -m 'OrderPulse Shopify WhatsApp' && git branch -M main && git remote add origin <YOUR_GITHUB_REPO_URL> && git push -u origin main"
          />

          <div className="rounded-lg bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950">
            <p className="font-semibold">
              Multi-Device Data + 24/7 Never-Logout WhatsApp Hosting (Important):
            </p>
            <ul className="mt-1.5 list-disc space-y-1.5 pl-4">
              <li>
                <span className="font-semibold">24/7 WhatsApp + Background Sync Even When Laptop Is Off:</span> Deploy this repo on a persistent Node host (<span className="font-semibold">Railway, Render, Fly.io, or VPS</span>) with start command <span className="font-mono">npm start</span> and persistent disk at <span className="font-mono">/app/data</span>. All phones/laptops share the same database and WhatsApp stays connected 24/7.
              </li>
              <li>
                <span className="font-semibold">Vercel Note:</span> Vercel serverless functions stop after each request, so a live WhatsApp QR socket cannot stay open 24/7 on <span className="font-mono">vercel.app</span> alone. Connect Upstash Redis on both Vercel &amp; Railway/Render so Vercel always stays in sync with your 24/7 Node host.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

