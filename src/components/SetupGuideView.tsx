import React, { useState } from 'react';
import { Check, Copy, GitBranch, Server, ShoppingBag } from 'lucide-react';

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
  const healthUrl = `${origin}/api/health`;

  return (
    <div className="space-y-6">
      {/* Part 1: Shopify Installation */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <ShoppingBag className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              01. How to Install & Connect in Shopify
            </h2>
            <p className="text-xs text-slate-500">
              Takes 3 minutes inside your Shopify Admin panel — no Shopify App Store review required.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-5 text-sm text-slate-700">
          <li>
            <p className="font-semibold text-slate-900">
              Step 1: Create a Custom App in Shopify Admin
            </p>
            <p className="mt-1 leading-relaxed">
              Open your Shopify Admin → <span className="font-medium text-slate-900">Settings → Apps and sales channels → Develop apps</span> → click <span className="font-medium text-slate-900">Create an app</span> (name it <span className="font-mono text-xs">OrderPulse WhatsApp</span>).
            </p>
          </li>

          <li>
            <p className="font-semibold text-slate-900">
              Step 2: Enable Order Read & Write Scopes
            </p>
            <p className="mt-1 leading-relaxed">
              Go to <span className="font-medium text-slate-900">Configuration → Admin API integration → Configure</span> and enable: <span className="font-mono text-xs text-slate-900">read_orders</span> and <span className="font-mono text-xs text-slate-900">write_orders</span>. Click <span className="font-medium text-slate-900">Save</span>, then click <span className="font-medium text-slate-900">Install app</span> and copy the <span className="font-mono text-xs text-slate-900">shpat_...</span> Admin API Access Token into the <span className="font-medium text-slate-900">Automation & Shopify</span> tab.
            </p>
          </li>

          <li className="space-y-2.5">
            <p className="font-semibold text-slate-900">
              Step 3: Add the Automatic Order Webhook in Shopify
            </p>
            <p className="leading-relaxed">
              In Shopify Admin go to <span className="font-medium text-slate-900">Settings → Notifications → Webhooks → Create webhook</span>. Choose Event: <span className="font-mono text-xs text-slate-900">Order creation</span>, Format: <span className="font-mono text-xs text-slate-900">JSON</span>, and paste this exact URL:
            </p>
            <CopyField label="Shopify Order Creation Webhook URL" value={shopifyWebhookUrl} />
            <p className="text-xs text-slate-500">
              Copy the Webhook Signing Secret shown at the bottom of Shopify&apos;s Webhooks section and save it in Automation & Shopify settings for HMAC security verification.
            </p>
          </li>
        </ol>
      </section>

      {/* Part 2: GitHub + Vercel + 24/7 QR Architecture */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <GitBranch className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              02. GitHub Push & Vercel Deployment (24/7 QR Note)
            </h2>
            <p className="text-xs text-slate-500">
              This repository already includes <span className="font-mono">vercel.json</span> and <span className="font-mono">api/index.ts</span> for Vercel.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-5 text-sm text-slate-700">
          <div className="rounded-lg bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950">
            <p className="font-semibold">
              Important Engineering Truth for 24/7 WhatsApp QR on Vercel:
            </p>
            <p className="mt-1">
              Vercel runs on serverless functions that shut down after 60 seconds and have no permanent disk. So Vercel alone cannot keep a WhatsApp Web QR socket logged in 24/7. You have two clean options:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                <span className="font-semibold">Option A (Recommended for 100% Free WhatsApp Web QR 24/7):</span> Push this repo to GitHub, deploy the Dashboard + Webhooks on <span className="font-semibold">Vercel</span>, and deploy the exact same repo on <span className="font-semibold">Render / Railway / Fly.io / VPS</span> (running <span className="font-mono">npm start</span>) with persistent disk so WhatsApp QR stays logged in 24/7 without ever disconnecting. Paste that server URL into <span className="font-mono">WHATSAPP_WORKER_URL</span>!
              </li>
              <li>
                <span className="font-semibold">Option B (100% Pure Vercel Serverless):</span> Connect your <span className="font-semibold">Meta Official WhatsApp Cloud API</span> credentials in Settings — no QR socket needed, runs 24/7 natively on Vercel!
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="font-semibold text-slate-900">Push to GitHub & Import to Vercel</p>
            <CopyField
              label="Git Push Commands"
              value="git init && git add . && git commit -m 'OrderPulse Shopify WhatsApp' && git branch -M main && git remote add origin <YOUR_GITHUB_REPO_URL> && git push -u origin main"
            />
            <p className="text-xs text-slate-500">
              On Vercel, import the GitHub repo, add <span className="font-mono">SHOPIFY_STORE_DOMAIN</span>, <span className="font-mono">SHOPIFY_ACCESS_TOKEN</span>, and <span className="font-mono">SHOPIFY_WEBHOOK_SECRET</span> in Environment Variables, and deploy.
            </p>
          </div>

          <div className="space-y-2.5 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="font-semibold text-slate-900">
                24/7 Keep-Alive Uptime Endpoint
              </p>
            </div>
            <p className="text-xs text-slate-600">
              If hosting the Node QR worker on Render free tier or Railway, add a free 5-minute monitor on UptimeRobot pointing to:
            </p>
            <CopyField label="Healthcheck URL" value={healthUrl} />
          </div>
        </div>
      </section>
    </div>
  );
}
