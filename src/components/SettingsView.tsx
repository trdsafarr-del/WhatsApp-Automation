import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Save, Store, AlertCircle } from 'lucide-react';
import type { AppSettings } from '../lib/types';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (next: Partial<AppSettings>) => Promise<boolean>;
  onTestShopify: () => Promise<{ ok: boolean; shopName?: string; error?: string }>;
}

export function SettingsView({ settings, onSave, onTestShopify }: SettingsViewProps) {
  const [form, setForm] = useState<AppSettings>(settings);
  const [isDirty, setIsDirty] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isDirty) {
      setForm(settings);
    }
  }, [settings, isDirty]);

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveNotice(null);
    const ok = await onSave(form);
    setIsSaving(false);
    if (ok) {
      setIsDirty(false);
      setSaveNotice('Shopify credentials and poll rules saved.');
    } else {
      setSaveNotice('Failed to save settings.');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const saved = await onSave(form);
    if (saved) setIsDirty(false);
    const res = await onTestShopify();
    setIsTesting(false);
    setTestResult({
      ok: res.ok,
      message: res.ok
        ? `Connected to Shopify store: ${res.shopName}`
        : res.error || 'Connection failed',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Shopify Dev Dashboard Credentials */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Store className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Shopify Store &amp; Dev Dashboard Credentials
              </h2>
              <p className="text-xs text-slate-500">
                Paste your Client ID &amp; Client Secret from dev.shopify.com so OrderPulse can tag orders automatically.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isTesting}
            onClick={() => void handleTest()}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isTesting ? 'Testing...' : 'Test Shopify Connection'}
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
              testResult.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="shop-name" className="block text-sm font-medium text-slate-700">
              Store Display Name
            </label>
            <input
              id="shop-name"
              type="text"
              value={form.shopName}
              onChange={(e) => updateField('shopName', e.target.value)}
              placeholder="Broomies Bakery"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="shopify-domain" className="block text-sm font-medium text-slate-700">
              Shopify Store Domain (.myshopify.com)
            </label>
            <input
              id="shopify-domain"
              type="text"
              value={form.shopifyStoreDomain}
              onChange={(e) => updateField('shopifyStoreDomain', e.target.value)}
              placeholder="broomies-bakery.myshopify.com"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
            {form.shopifyStoreDomain.trim() &&
              !form.shopifyStoreDomain.toLowerCase().includes('.myshopify.com') &&
              !form.shopifyStoreDomain.toLowerCase().includes('admin.shopify.com/store/') && (
                <p className="mt-1 text-xs text-amber-700">
                  Use your <span className="font-mono">.myshopify.com</span> domain (not your custom website URL like .in/.com).
                </p>
              )}
          </div>

          <div>
            <label htmlFor="shopify-client-id" className="block text-sm font-medium text-slate-700">
              App Client ID (from dev.shopify.com)
            </label>
            <input
              id="shopify-client-id"
              type="text"
              value={form.shopifyClientId}
              onChange={(e) => updateField('shopifyClientId', e.target.value)}
              placeholder="Paste Client ID"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="shopify-client-secret" className="block text-sm font-medium text-slate-700">
              App Client Secret (from dev.shopify.com)
            </label>
            <div className="relative mt-1.5">
              <input
                id="shopify-client-secret"
                type={showClientSecret ? 'text' : 'password'}
                value={form.shopifyClientSecret}
                onChange={(e) => updateField('shopifyClientSecret', e.target.value)}
                placeholder="shpss_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-10 pl-3 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
              <button
                type="button"
                aria-label={showClientSecret ? 'Hide Client Secret' : 'Show Client Secret'}
                onClick={() => setShowClientSecret((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              >
                {showClientSecret ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="shopify-secret" className="block text-sm font-medium text-slate-700">
              Webhook Signing Secret (from Shopify Admin Webhooks)
            </label>
            <input
              id="shopify-secret"
              type="password"
              value={form.shopifyWebhookSecret}
              onChange={(e) => updateField('shopifyWebhookSecret', e.target.value)}
              placeholder="Optional if using Client Secret"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="shopify-token" className="block text-sm font-medium text-slate-700">
              Direct Admin Token (Optional, Legacy shpat_ only)
            </label>
            <input
              id="shopify-token"
              type="password"
              value={form.shopifyAccessToken}
              onChange={(e) => updateField('shopifyAccessToken', e.target.value)}
              placeholder="Leave blank when using Client ID + Secret"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Poll Template & Auto-Tagging Rules */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            WhatsApp Poll Template &amp; Auto-Tag Rules
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Customize the poll sent to every new Shopify order and the exact tags written back to Shopify.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="poll-template" className="block text-sm font-medium text-slate-700">
              Poll Prompt Message
            </label>
            <textarea
              id="poll-template"
              rows={3}
              value={form.pollMessageTemplate}
              onChange={(e) => updateField('pollMessageTemplate', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
            <p className="mt-1.5 font-mono text-xs text-slate-500">
              Variables: {'{{customer_name}}'} · {'{{order_number}}'} · {'{{total_price}}'} · {'{{items_summary}}'} · {'{{shop_name}}'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="confirm-option" className="block text-sm font-medium text-slate-700">
                Poll Option 1 (Confirm Button)
              </label>
              <input
                id="confirm-option"
                type="text"
                value={form.confirmOptionLabel}
                onChange={(e) => updateField('confirmOptionLabel', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="confirm-tag" className="block text-sm font-medium text-slate-700">
                Shopify Tag on Confirm
              </label>
              <input
                id="confirm-tag"
                type="text"
                value={form.confirmTag}
                onChange={(e) => updateField('confirmTag', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cancel-option" className="block text-sm font-medium text-slate-700">
                Poll Option 2 (Cancel Button)
              </label>
              <input
                id="cancel-option"
                type="text"
                value={form.cancelOptionLabel}
                onChange={(e) => updateField('cancelOptionLabel', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cancel-tag" className="block text-sm font-medium text-slate-700">
                Shopify Tag on Cancel
              </label>
              <input
                id="cancel-tag"
                type="text"
                value={form.cancelTag}
                onChange={(e) => updateField('cancelTag', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="waiting-tag" className="block text-sm font-medium text-slate-700">
                Shopify Tag When Poll Sent
              </label>
              <input
                id="waiting-tag"
                type="text"
                value={form.waitingTag}
                onChange={(e) => updateField('waitingTag', e.target.value)}
                placeholder="waiting for confirmation"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="sync-start-date" className="block text-sm font-medium text-slate-700">
                Start From Date (Skip Older Orders)
              </label>
              <input
                id="sync-start-date"
                type="date"
                value={form.syncStartDate || '2026-11-13'}
                onChange={(e) => updateField('syncStartDate', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="country-code" className="block text-sm font-medium text-slate-700">
                Default Country Code (for 10-digit phones)
              </label>
              <input
                id="country-code"
                type="text"
                value={form.defaultCountryCode}
                onChange={(e) => updateField('defaultCountryCode', e.target.value)}
                placeholder="91"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="confirm-reply-msg" className="block text-sm font-medium text-slate-700">
                Confirmation WhatsApp Reply (When Customer Clicks Confirm)
              </label>
              <textarea
                id="confirm-reply-msg"
                rows={2}
                value={form.confirmReplyMessage}
                onChange={(e) => updateField('confirmReplyMessage', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cancel-reply-msg" className="block text-sm font-medium text-slate-700">
                Cancellation WhatsApp Reply (When Customer Clicks Cancel)
              </label>
              <textarea
                id="cancel-reply-msg"
                rows={2}
                value={form.cancelReplyMessage}
                onChange={(e) => updateField('cancelReplyMessage', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tracking-template" className="block text-sm font-medium text-slate-700">
              Tracking Link WhatsApp Message (When Tracking Added in Shopify)
            </label>
            <textarea
              id="tracking-template"
              rows={2}
              value={form.trackingMessageTemplate}
              onChange={(e) => updateField('trackingMessageTemplate', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
            <p className="mt-1.5 font-mono text-xs text-slate-500">
              Variables: {'{{tracking_link}}'} · {'{{tracking_url}}'} · {'{{tracking_number}}'} · {'{{tracking_company}}'} · {'{{order_number}}'} · {'{{customer_name}}'}
            </p>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.autoSendPollOnNewOrder}
                onChange={(e) =>
                  updateField('autoSendPollOnNewOrder', e.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
              />
              <span>Automatically dispatch WhatsApp Poll when a new Shopify order arrives</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.autoSendTrackingMessage}
                onChange={(e) =>
                  updateField('autoSendTrackingMessage', e.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
              />
              <span>Automatically send WhatsApp message with tracking link when tracking is added in Shopify</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.autoCancelInShopify}
                onChange={(e) =>
                  updateField('autoCancelInShopify', e.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
              />
              <span>Also mark the order as Cancelled inside Shopify when customer clicks Cancel Order</span>
            </label>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? 'Saving...' : 'Save Automation Rules'}
        </button>
      </div>
    </form>
  );
}
