import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  IndianRupee,
  MessageSquare,
  RefreshCw,
  Save,
  Store,
  Truck,
} from 'lucide-react';
import type { AppSettings } from '../lib/types';

export type SettingsTab = 'credentials' | 'polls' | 'dispatch' | 'delhivery';

interface SettingsViewProps {
  settings: AppSettings;
  initialTab?: SettingsTab;
  onSave: (next: Partial<AppSettings>) => Promise<boolean>;
  onTestShopify: () => Promise<{ ok: boolean; shopName?: string; error?: string }>;
  onTestDelhivery?: () => Promise<{
    ok: boolean;
    sampleAmount?: number;
    detectedOriginPin?: string;
    warning?: string;
    error?: string;
  }>;
  onSyncDelhivery?: () => Promise<{
    ok: boolean;
    trackedCount?: number;
    chargesUpdatedCount?: number;
    detectedOriginPin?: string;
    warning?: string;
    error?: string;
  }>;
}

export function SettingsView({
  settings,
  initialTab,
  onSave,
  onTestShopify,
  onTestDelhivery,
  onSyncDelhivery,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'credentials');
  const [form, setForm] = useState<AppSettings>(settings);
  const [isDirty, setIsDirty] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showDelhiveryToken, setShowDelhiveryToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingDelhivery, setIsTestingDelhivery] = useState(false);
  const [isSyncingDelhivery, setIsSyncingDelhivery] = useState(false);
  const [delhiveryResult, setDelhiveryResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
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

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
      setSaveNotice('Shopify credentials and automation rules saved.');
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

  const handleTestDelhivery = async () => {
    if (!onTestDelhivery) return;
    setIsTestingDelhivery(true);
    setDelhiveryResult(null);
    const saved = await onSave(form);
    if (saved) setIsDirty(false);
    const res = await onTestDelhivery();
    setIsTestingDelhivery(false);
    setDelhiveryResult({
      ok: res.ok,
      message: res.ok
        ? `Delhivery One token verified.${res.detectedOriginPin ? ` Pickup PIN detected: ${res.detectedOriginPin}.` : ''}${typeof res.sampleAmount === 'number' ? ` Sample 500g charge: INR ${res.sampleAmount}.` : ''}${res.warning ? ` Note: ${res.warning}` : ''}`
        : res.error || 'Delhivery One verification failed.',
    });
  };

  const handleSyncDelhivery = async () => {
    if (!onSyncDelhivery) return;
    setIsSyncingDelhivery(true);
    setDelhiveryResult(null);
    const saved = await onSave(form);
    if (saved) setIsDirty(false);
    const res = await onSyncDelhivery();
    setIsSyncingDelhivery(false);
    setDelhiveryResult({
      ok: res.ok,
      message: res.ok
        ? `Synced Delhivery One: ${res.trackedCount ?? 0} AWBs updated, ${res.chargesUpdatedCount ?? 0} shipping charges pulled.${res.warning ? ` Note: ${res.warning}` : ''}`
        : res.error || 'Delhivery One sync failed.',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Clean Tab Strip for Settings Sections */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-900/75 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:p-4">
        <div
          role="tablist"
          aria-label="Automation Settings Sections"
          className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-1 sm:flex-wrap"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'credentials'}
            onClick={() => setActiveTab('credentials')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
              activeTab === 'credentials'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Store className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            Shopify Credentials
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'polls'}
            onClick={() => setActiveTab('polls')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
              activeTab === 'polls'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            WhatsApp Polls &amp; Tags
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dispatch'}
            onClick={() => setActiveTab('dispatch')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
              activeTab === 'dispatch'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Truck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            Dispatch &amp; Replies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'delhivery'}
            onClick={() => setActiveTab('delhivery')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
              activeTab === 'delhivery'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <IndianRupee className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            Delhivery One &amp; P&amp;L
          </button>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="hidden items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0 sm:inline-flex sm:text-sm"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? 'Saving...' : isDirty ? 'Save Unsaved Changes' : 'Save Automation Rules'}
        </button>
      </div>

      {saveNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>{saveNotice}</span>
        </div>
      )}

      {activeTab === 'credentials' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Store className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  Shopify Store &amp; Dev Dashboard Credentials
                </h2>
                <p className="text-xs text-slate-400">
                  Paste your Client ID &amp; Client Secret from dev.shopify.com so OrderPulse can tag orders automatically.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isTesting}
              onClick={() => void handleTest()}
              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 sm:min-h-0 sm:w-auto"
            >
              {isTesting ? 'Testing...' : 'Test Shopify Connection'}
            </button>
          </div>

          {testResult && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
                testResult.ok
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/35 bg-rose-500/10 text-rose-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="shop-name" className="block text-sm font-medium text-slate-200">
                Store Display Name
              </label>
              <input
                id="shop-name"
                type="text"
                value={form.shopName}
                onChange={(e) => updateField('shopName', e.target.value)}
                placeholder="Broomies Bakery"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="shopify-domain" className="block text-sm font-medium text-slate-200">
                Shopify Store Domain (.myshopify.com)
              </label>
              <input
                id="shopify-domain"
                type="text"
                value={form.shopifyStoreDomain}
                onChange={(e) => updateField('shopifyStoreDomain', e.target.value)}
                placeholder="broomies-bakery.myshopify.com"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {form.shopifyStoreDomain.trim() &&
                !form.shopifyStoreDomain.toLowerCase().includes('.myshopify.com') &&
                !form.shopifyStoreDomain.toLowerCase().includes('admin.shopify.com/store/') && (
                  <p className="mt-1 text-xs text-amber-300">
                    Use your <span className="font-mono">.myshopify.com</span> domain (not your custom website URL like .in/.com).
                  </p>
                )}
            </div>

            <div>
              <label htmlFor="shopify-client-id" className="block text-sm font-medium text-slate-200">
                App Client ID (from dev.shopify.com)
              </label>
              <input
                id="shopify-client-id"
                type="text"
                value={form.shopifyClientId}
                onChange={(e) => updateField('shopifyClientId', e.target.value)}
                placeholder="Paste Client ID"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="shopify-client-secret" className="block text-sm font-medium text-slate-200">
                App Client Secret (from dev.shopify.com)
              </label>
              <div className="relative mt-1.5">
                <input
                  id="shopify-client-secret"
                  type={showClientSecret ? 'text' : 'password'}
                  value={form.shopifyClientSecret}
                  onChange={(e) => updateField('shopifyClientSecret', e.target.value)}
                  placeholder="shpss_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2 pr-10 pl-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showClientSecret ? 'Hide Client Secret' : 'Show Client Secret'}
                  onClick={() => setShowClientSecret((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
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
              <label htmlFor="shopify-secret" className="block text-sm font-medium text-slate-200">
                Webhook Signing Secret (from Shopify Admin Webhooks)
              </label>
              <input
                id="shopify-secret"
                type="password"
                value={form.shopifyWebhookSecret}
                onChange={(e) => updateField('shopifyWebhookSecret', e.target.value)}
                placeholder="Optional if using Client Secret"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="shopify-token" className="block text-sm font-medium text-slate-200">
                Direct Admin Token (Optional, Legacy shpat_ only)
              </label>
              <input
                id="shopify-token"
                type="password"
                value={form.shopifyAccessToken}
                onChange={(e) => updateField('shopifyAccessToken', e.target.value)}
                placeholder="Leave blank when using Client ID + Secret"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'polls' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-semibold text-white">
              WhatsApp Poll Template &amp; Auto-Tag Rules
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Customize the interactive poll sent to every new Shopify order and the exact tags written back to Shopify.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="poll-template" className="block text-sm font-medium text-slate-200">
                Poll Prompt Message
              </label>
              <textarea
                id="poll-template"
                rows={3}
                value={form.pollMessageTemplate}
                onChange={(e) => updateField('pollMessageTemplate', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1.5 font-mono text-xs text-slate-400">
                Variables: {'{{customer_name}}'} · {'{{order_number}}'} · {'{{total_price}}'} · {'{{items_summary}}'} · {'{{shop_name}}'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="confirm-option" className="block text-sm font-medium text-slate-200">
                  Poll Option 1 (Confirm Button)
                </label>
                <input
                  id="confirm-option"
                  type="text"
                  value={form.confirmOptionLabel}
                  onChange={(e) => updateField('confirmOptionLabel', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="confirm-tag" className="block text-sm font-medium text-slate-200">
                  Shopify Tag on Confirm
                </label>
                <input
                  id="confirm-tag"
                  type="text"
                  value={form.confirmTag}
                  onChange={(e) => updateField('confirmTag', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cancel-option" className="block text-sm font-medium text-slate-200">
                  Poll Option 2 (Cancel Button)
                </label>
                <input
                  id="cancel-option"
                  type="text"
                  value={form.cancelOptionLabel}
                  onChange={(e) => updateField('cancelOptionLabel', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cancel-tag" className="block text-sm font-medium text-slate-200">
                  Shopify Tag on Cancel
                </label>
                <input
                  id="cancel-tag"
                  type="text"
                  value={form.cancelTag}
                  onChange={(e) => updateField('cancelTag', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="waiting-tag" className="block text-sm font-medium text-slate-200">
                Shopify Tag When Poll Sent
              </label>
              <input
                id="waiting-tag"
                type="text"
                value={form.waitingTag}
                onChange={(e) => updateField('waitingTag', e.target.value)}
                placeholder="waiting for confirmation"
                className="mt-1.5 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.autoSendPollOnNewOrder}
                  onChange={(e) =>
                    updateField('autoSendPollOnNewOrder', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Automatically dispatch WhatsApp Poll when a new Shopify order arrives</span>
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.autoCancelInShopify}
                  onChange={(e) =>
                    updateField('autoCancelInShopify', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Also mark the order as Cancelled inside Shopify when customer clicks Cancel Order</span>
              </label>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'dispatch' && (
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-semibold text-white">
              Dispatch Tracking, Replies &amp; Sync Cutoff
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configure automated confirmation replies, dispatch tracking messages, and order sync cutoffs.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="sync-start-date" className="block text-sm font-medium text-slate-200">
                  Start From Date (Skip Older Orders)
                </label>
                <input
                  id="sync-start-date"
                  type="date"
                  value={form.syncStartDate || '2026-11-13'}
                  onChange={(e) => updateField('syncStartDate', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="country-code" className="block text-sm font-medium text-slate-200">
                  Default Country Code (for 10-digit phones)
                </label>
                <input
                  id="country-code"
                  type="text"
                  value={form.defaultCountryCode}
                  onChange={(e) => updateField('defaultCountryCode', e.target.value)}
                  placeholder="91"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="confirm-reply-msg" className="block text-sm font-medium text-slate-200">
                  Confirmation WhatsApp Reply (When Customer Clicks Confirm)
                </label>
                <textarea
                  id="confirm-reply-msg"
                  rows={2}
                  value={form.confirmReplyMessage}
                  onChange={(e) => updateField('confirmReplyMessage', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cancel-reply-msg" className="block text-sm font-medium text-slate-200">
                  Cancellation WhatsApp Reply (When Customer Clicks Cancel)
                </label>
                <textarea
                  id="cancel-reply-msg"
                  rows={2}
                  value={form.cancelReplyMessage}
                  onChange={(e) => updateField('cancelReplyMessage', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tracking-template" className="block text-sm font-medium text-slate-200">
                Tracking Link WhatsApp Message (When Tracking Added in Shopify)
              </label>
              <textarea
                id="tracking-template"
                rows={2}
                value={form.trackingMessageTemplate}
                onChange={(e) => updateField('trackingMessageTemplate', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1.5 font-mono text-xs text-slate-400">
                Variables: {'{{tracking_link}}'} · {'{{tracking_url}}'} · {'{{tracking_number}}'} · {'{{tracking_company}}'} · {'{{order_number}}'} · {'{{customer_name}}'}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.autoSendTrackingMessage}
                  onChange={(e) =>
                    updateField('autoSendTrackingMessage', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Automatically send WhatsApp message with tracking link when tracking is added in Shopify</span>
              </label>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'delhivery' && (
        <section className="space-y-6 rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Truck className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  Delhivery One API &amp; Profit / Loss Unit Economics
                </h2>
                <p className="text-xs text-slate-400">
                  Pull live AWB status (Delivered / In Transit / RTO) &amp; pincode-wise freight charges directly from Delhivery One.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onTestDelhivery && (
                <button
                  type="button"
                  disabled={isTestingDelhivery}
                  onClick={() => void handleTestDelhivery()}
                  className="min-h-[40px] rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isTestingDelhivery ? 'Testing...' : 'Test Delhivery Token'}
                </button>
              )}
              {onSyncDelhivery && (
                <button
                  type="button"
                  disabled={isSyncingDelhivery}
                  onClick={() => void handleSyncDelhivery()}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncingDelhivery ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {isSyncingDelhivery ? 'Syncing...' : 'Sync Delhivery Now'}
                </button>
              )}
            </div>
          </div>

          {delhiveryResult && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
                delhiveryResult.ok
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/35 bg-rose-500/10 text-rose-200'
              }`}
            >
              {delhiveryResult.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              )}
              <span>{delhiveryResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="delhivery-token" className="block text-sm font-medium text-slate-200">
                Delhivery One API Token
              </label>
              <div className="relative mt-1.5">
                <input
                  id="delhivery-token"
                  type={showDelhiveryToken ? 'text' : 'password'}
                  value={form.delhiveryApiToken || ''}
                  onChange={(e) => updateField('delhiveryApiToken', e.target.value)}
                  placeholder="Paste Delhivery API Token from one.delhivery.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2 pr-10 pl-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showDelhiveryToken ? 'Hide Delhivery Token' : 'Show Delhivery Token'}
                  onClick={() => setShowDelhiveryToken((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
                >
                  {showDelhiveryToken ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Find in Delhivery One (<span className="font-mono text-slate-300">one.delhivery.com</span>) → Settings → API Setup → Live Token.
              </p>
            </div>

            <div>
              <label htmlFor="delhivery-pickup-pincode" className="block text-sm font-medium text-slate-200">
                Warehouse Pickup Pincode (Auto-detects from Shopify if blank)
              </label>
              <input
                id="delhivery-pickup-pincode"
                type="text"
                maxLength={6}
                value={form.delhiveryPickupPincode || ''}
                onChange={(e) => updateField('delhiveryPickupPincode', e.target.value)}
                placeholder="Auto-detected from Shopify Store ZIP"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Automatically fetched from Shopify Locations/Shop ZIP if left blank; overrides only if you ship from a different pin.
              </p>
            </div>

            <div>
              <label htmlFor="delhivery-billing-mode" className="block text-sm font-medium text-slate-200">
                Shipping Service Mode
              </label>
              <select
                id="delhivery-billing-mode"
                value={form.delhiveryBillingMode || 'E'}
                onChange={(e) =>
                  updateField('delhiveryBillingMode', e.target.value === 'S' ? 'S' : 'E')
                }
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="E">Express (Air / Standard D2C)</option>
                <option value="S">Surface (Heavy / Ground)</option>
              </select>
            </div>

            <div>
              <label htmlFor="delhivery-default-weight" className="block text-sm font-medium text-slate-200">
                Fallback Parcel Weight (if Shopify &amp; Delhivery miss weight)
              </label>
              <input
                id="delhivery-default-weight"
                type="number"
                min={50}
                step={50}
                value={form.delhiveryDefaultWeightGrams ?? 500}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  updateField('delhiveryDefaultWeightGrams', Number.isFinite(val) && val > 0 ? val : 500);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="pickup-sla-hours" className="block text-sm font-medium text-slate-200">
                Courier Pickup SLA Alert (Hours)
              </label>
              <input
                id="pickup-sla-hours"
                type="number"
                min={6}
                max={168}
                step={6}
                value={form.pickupSlaHours ?? 48}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  updateField('pickupSlaHours', Number.isFinite(val) && val > 0 ? val : 48);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="delivery-sla-days" className="block text-sm font-medium text-slate-200">
                Delivery SLA Alert Limit (Days)
              </label>
              <input
                id="delivery-sla-days"
                type="number"
                min={1}
                max={30}
                step={1}
                value={form.deliverySlaDays ?? 4}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  updateField('deliverySlaDays', Number.isFinite(val) && val > 0 ? val : 4);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Business Unit Economics Rules */}
          <div className="border-t border-slate-800 pt-5">
            <h3 className="text-sm font-semibold text-white">
              Product COGS, Packaging &amp; Marketing Cost (Your Business Costs)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Courier freight, COD &amp; RTO fees are pulled automatically from Delhivery One (and optional Wallet CSV). Enter only your internal product &amp; box costs below.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="cogs-pct" className="block text-xs font-medium text-slate-300">
                  Product COGS (% of Order Value)
                </label>
                <input
                  id="cogs-pct"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={form.cogsPercent ?? 35}
                  onChange={(e) => updateField('cogsPercent', Number.parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="pack-cost" className="block text-xs font-medium text-slate-300">
                  Box / Packaging Cost (INR / Order)
                </label>
                <input
                  id="pack-cost"
                  type="number"
                  min={0}
                  step="1"
                  value={form.packagingCostPerOrder ?? 25}
                  onChange={(e) =>
                    updateField('packagingCostPerOrder', Number.parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="daily-meta-ads" className="block text-xs font-medium text-orange-300">
                  Daily Meta Ads Spend (INR / Day)
                </label>
                <input
                  id="daily-meta-ads"
                  type="number"
                  min={0}
                  step="50"
                  value={form.dailyMetaAdsSpend ?? 500}
                  onChange={(e) =>
                    updateField('dailyMetaAdsSpend', Number.parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-orange-500/40 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="mkt-cost" className="block text-xs font-medium text-slate-300">
                  Ad / Marketing Cost (INR / Order)
                </label>
                <input
                  id="mkt-cost"
                  type="number"
                  min={0}
                  step="5"
                  value={form.marketingCostPerOrder ?? 0}
                  onChange={(e) =>
                    updateField('marketingCostPerOrder', Number.parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="pg-pct" className="block text-xs font-medium text-slate-300">
                  Prepaid Payment Gateway Fee (%)
                </label>
                <input
                  id="pg-pct"
                  type="number"
                  min={0}
                  max={20}
                  step="0.1"
                  value={form.prepaidGatewayPercent ?? 2}
                  onChange={(e) =>
                    updateField('prepaidGatewayPercent', Number.parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-xs font-medium text-slate-300">
                Offline Fallback Defaults (used only when Delhivery One API isn&apos;t linked yet)
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="fwd-fallback" className="block text-xs font-medium text-slate-400">
                    Fallback Forward Shipping (INR)
                  </label>
                  <input
                    id="fwd-fallback"
                    type="number"
                    min={0}
                    step="1"
                    value={form.fallbackForwardShippingCost ?? 75}
                    onChange={(e) =>
                      updateField(
                        'fallbackForwardShippingCost',
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="rto-fallback" className="block text-xs font-medium text-slate-400">
                    Fallback RTO Return Leg (INR)
                  </label>
                  <input
                    id="rto-fallback"
                    type="number"
                    min={0}
                    step="1"
                    value={form.fallbackRtoShippingCost ?? 75}
                    onChange={(e) =>
                      updateField(
                        'fallbackRtoShippingCost',
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cod-fallback" className="block text-xs font-medium text-slate-400">
                    Fallback COD Remittance Fee (INR)
                  </label>
                  <input
                    id="cod-fallback"
                    type="number"
                    min={0}
                    step="1"
                    value={form.fallbackCodFee ?? 25}
                    onChange={(e) =>
                      updateField('fallbackCodFee', Number.parseFloat(e.target.value) || 0)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* Mobile Thumb-Zone Save Button */}
      <button
        type="submit"
        disabled={isSaving}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50 sm:hidden"
      >
        <Save className="h-4 w-4" aria-hidden="true" />
        {isSaving ? 'Saving...' : isDirty ? 'Save Unsaved Changes' : 'Save Automation Rules'}
      </button>
    </form>
  );
}
