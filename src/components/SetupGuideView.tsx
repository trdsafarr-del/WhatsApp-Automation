import React, { useState } from 'react';
import { Check, Copy, GitBranch, ShoppingBag } from 'lucide-react';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="rounded-lg bg-slate-100/80 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
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
      <p className="mt-1.5 break-all font-mono text-xs text-slate-900">{value}</p>
    </div>
  );
}

export function SetupGuideView() {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://your-app.vercel.app';

  const shopifyWebhookUrl = `${origin}/api/webhooks/shopify/orders-create`;
  const shopifyOrderUpdatedWebhookUrl = `${origin}/api/webhooks/shopify/orders-updated`;

  return (
    <div className="space-y-6">
      {/* Part 1: Shopify Dev Dashboard Installation */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <ShoppingBag className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              01. How to Setup in Shopify Dev Dashboard (dev.shopify.com)
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

      {/* Part 2: GitHub + Deploy */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <GitBranch className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              02. GitHub Push &amp; 24/7 Hosting
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
                <span className="font-semibold">Same Data Across All Devices &amp; Zero WhatsApp Logout:</span> Deploy this repo on a persistent Node host (<span className="font-semibold">Railway, Render, Fly.io, or VPS</span>) with start command <span className="font-mono">npm start</span> and persistent disk at <span className="font-mono">/app/data</span>. All phones/laptops share the same database and WhatsApp stays connected 24/7.
              </li>
              <li>
                <span className="font-semibold">Optional Cloud Backup Across Redeploys / Serverless:</span> Add free <span className="font-mono">UPSTASH_REDIS_REST_URL</span> + <span className="font-mono">UPSTASH_REDIS_REST_TOKEN</span> (or Vercel Marketplace <span className="font-mono">KV_REST_API_URL</span> + <span className="font-mono">KV_REST_API_TOKEN</span>) environment variables so orders, Shopify credentials, and WhatsApp session keys automatically sync across every device and refresh.
              </li>
              <li>
                <span className="font-semibold">Vercel Note:</span> Vercel serverless functions sleep after 60s, so a live WhatsApp QR socket cannot stay open 24/7 on Vercel alone — use Railway/Render/VPS for 24/7 automatic WhatsApp poll delivery &amp; reply listening.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
