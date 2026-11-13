import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  LayoutList,
  Menu,
  QrCode,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { OrdersView } from './components/OrdersView';
import { SettingsView } from './components/SettingsView';
import { SetupGuideView } from './components/SetupGuideView';
import { WhatsAppQrView } from './components/WhatsAppQrView';
import { DEFAULT_SETTINGS } from './lib/orderRules';
import type {
  AppSettings,
  DashboardPayload,
  OrderMetrics,
  OrderRecord,
  WhatsAppEngineMode,
  WhatsAppState,
} from './lib/types';

type ActiveTab = 'orders' | 'whatsapp' | 'settings' | 'setup';

const EMPTY_METRICS: OrderMetrics = {
  totalOrders: 0,
  pendingPolls: 0,
  confirmedCount: 0,
  cancelledCount: 0,
  confirmationRate: 0,
  avgResponseMinutes: null,
};

const EMPTY_WHATSAPP: WhatsAppState = {
  status: 'disconnected',
  mode: 'baileys_qr',
  phoneNumber: null,
  pushName: null,
  qrDataUrl: null,
  qrRaw: null,
  connectedAt: null,
  lastHeartbeatAt: null,
  reconnectCount: 0,
  sessionPersisted: false,
  lastError: null,
};

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'orders', label: 'Orders & Polls', icon: LayoutList },
  { id: 'whatsapp', label: 'WhatsApp QR', icon: QrCode },
  { id: 'settings', label: 'Automation & Shopify', icon: SlidersHorizontal },
  { id: 'setup', label: 'Install & Deploy', icon: BookOpen },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics>(EMPTY_METRICS);
  const [whatsapp, setWhatsapp] = useState<WhatsAppState>(EMPTY_WHATSAPP);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = (await res.json()) as DashboardPayload;
      setOrders(data.orders);
      setMetrics(data.metrics);
      setWhatsapp(data.whatsapp);
      setCloudSyncEnabled(Boolean(data.cloudSyncEnabled));
      setSettings((prev) =>
        JSON.stringify(prev) === JSON.stringify(data.settings) ? prev : data.settings
      );
      setSelectedOrderId((prev) =>
        prev && data.orders.some((o) => o.id === prev) ? prev : data.orders[0]?.id || null
      );
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  // Refresh immediately when returning to the app on phone/desktop
  useEffect(() => {
    const handleFocus = () => {
      if (activeTab !== 'settings') {
        void fetchDashboard();
      }
    };
    const handleVisibility = () => {
      if (!document.hidden && activeTab !== 'settings') {
        void fetchDashboard();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchDashboard, activeTab]);

  // Poll backend smoothly while QR is waiting or on live views, pausing while editing Settings
  useEffect(() => {
    if (activeTab === 'settings') return;
    const intervalMs =
      whatsapp.status === 'qr_ready' || whatsapp.status === 'connecting' ? 2500 : 8000;
    const timer = setInterval(() => {
      void fetchDashboard();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [fetchDashboard, whatsapp.status, activeTab]);

  const handleVoteOrder = async (orderId: string, option: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          orders: OrderRecord[];
          metrics: OrderMetrics;
        };
        setOrders(data.orders);
        setMetrics(data.metrics);
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleResendPoll = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/resend-poll`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          orders: OrderRecord[];
          metrics: OrderMetrics;
        };
        setOrders(data.orders);
        setMetrics(data.metrics);
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSendTracking = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/send-tracking`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          orders: OrderRecord[];
          metrics: OrderMetrics;
        };
        setOrders(data.orders);
        setMetrics(data.metrics);
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSyncShopify = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/shopify/sync', { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        importedCount?: number;
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
        error?: string;
      };
      if (!res.ok) {
        setSyncMessage(data.error || 'Shopify credentials required in Automation & Shopify tab.');
      } else {
        if (data.orders) setOrders(data.orders);
        if (data.metrics) setMetrics(data.metrics);
        setSyncMessage(`Synced Shopify orders (${data.importedCount ?? 0} new orders imported).`);
      }
    } catch {
      setSyncMessage('Network error syncing Shopify orders.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWhatsAppConnect = async (mode: WhatsAppEngineMode, fresh = false) => {
    setWhatsappBusy(true);
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, fresh }),
      });
      if (res.ok) {
        const data = (await res.json()) as { whatsapp: WhatsAppState };
        setWhatsapp(data.whatsapp);
      }
    } finally {
      setWhatsappBusy(false);
    }
  };

  const handleWhatsAppPairingCode = async (phoneNumber: string) => {
    setWhatsappBusy(true);
    try {
      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = (await res.json()) as { whatsapp?: WhatsAppState };
      if (data.whatsapp) {
        setWhatsapp(data.whatsapp);
      }
    } finally {
      setWhatsappBusy(false);
    }
  };

  const handleWhatsAppRestart = async () => {
    setWhatsappBusy(true);
    try {
      const res = await fetch('/api/whatsapp/restart', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { whatsapp: WhatsAppState };
        setWhatsapp(data.whatsapp);
      }
    } finally {
      setWhatsappBusy(false);
    }
  };

  const handleWhatsAppDisconnect = async () => {
    setWhatsappBusy(true);
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { whatsapp: WhatsAppState };
        setWhatsapp(data.whatsapp);
      }
    } finally {
      setWhatsappBusy(false);
    }
  };

  const handleSaveSettings = async (next: Partial<AppSettings>): Promise<boolean> => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { settings: AppSettings };
    setSettings(data.settings);
    void fetchDashboard();
    return true;
  };

  const handleTestShopify = async () => {
    const res = await fetch('/api/shopify/test', { method: 'POST' });
    return (await res.json()) as { ok: boolean; shopName?: string; error?: string };
  };

  const isShopifyLinked = Boolean(
    settings.shopifyStoreDomain.trim() &&
      (settings.shopifyAccessToken.trim() ||
        (settings.shopifyClientId.trim() && settings.shopifyClientSecret.trim()))
  );

  const whatsappLabel =
    whatsapp.status === 'connected'
      ? 'Connected'
      : whatsapp.remoteSessionActive && whatsapp.isServerless
        ? 'Synced (Host Session)'
        : whatsapp.status === 'qr_ready'
          ? 'Scan QR'
          : whatsapp.status === 'connecting'
            ? 'Connecting...'
            : 'Unlinked';

  const connectionSummary = (
    <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-400">
      <p className="font-medium text-slate-200">WhatsApp: {whatsappLabel}</p>
      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
        {whatsapp.phoneNumber || 'Tap WhatsApp QR to link'}
      </p>
      <p className="mt-2.5 font-medium text-slate-200">
        Shopify: {isShopifyLinked ? 'Linked' : 'Not Configured'}
      </p>
      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
        {isShopifyLinked
          ? settings.shopifyStoreDomain.replace(/^https?:\/\//i, '')
          : 'Open Automation & Shopify'}
      </p>
      <p className="mt-2.5 text-[11px] text-slate-500">
        Storage:{' '}
        {cloudSyncEnabled
          ? 'Cloud Redis Synced'
          : whatsapp.isServerless
            ? 'Temporary Serverless (/tmp)'
            : 'Persistent Server Disk'}
      </p>
    </div>
  );

  const pageMeta: Record<ActiveTab, { breadcrumb: string; title: string }> = {
    orders: {
      breadcrumb: `${settings.shopName} / Orders & Polls`,
      title: 'Live Shopify Order Confirmation Queue',
    },
    whatsapp: {
      breadcrumb: `${settings.shopName} / WhatsApp QR`,
      title: '24/7 WhatsApp Linked Device Session',
    },
    settings: {
      breadcrumb: `${settings.shopName} / Automation`,
      title: 'Shopify Credentials & Auto-Tagging Rules',
    },
    setup: {
      breadcrumb: `${settings.shopName} / Install & Deploy`,
      title: 'Shopify App Setup & GitHub to Vercel Guide',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            OrderPulse
          </span>
        </div>

        <nav aria-label="Primary Navigation" className="flex-1 space-y-1 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {connectionSummary}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-slate-900 text-slate-100">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
              <span className="font-display text-lg font-bold text-white">OrderPulse</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Mobile Navigation" className="flex-1 space-y-1 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                      active ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            {connectionSummary}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                {pageMeta[activeTab].breadcrumb}
              </p>
              <h1 className="truncate font-display text-sm font-semibold text-slate-900 sm:text-lg">
                {pageMeta[activeTab].title}
              </h1>
            </div>
          </div>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              setActiveTab('orders');
              void handleSyncShopify();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0 sm:text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isSyncing ? 'Syncing...' : 'Sync Shopify'}
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <div className="mx-auto max-w-7xl space-y-4">
            {!isLoading && whatsapp.isServerless && !cloudSyncEnabled && (
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 sm:flex-row sm:items-center">
                <p className="leading-relaxed">
                  <span className="font-semibold">Vercel Temporary Storage Active:</span> Without Redis (<span className="font-mono">KV_REST_API_URL</span> or <span className="font-mono">UPSTASH_REDIS_REST_URL</span>), refreshing resets temporary data and WhatsApp cannot stay connected 24/7 on Vercel alone. Connect free Upstash Redis in Vercel Env Vars or deploy on Railway/Render.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('setup')}
                  className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 whitespace-nowrap"
                >
                  Open Setup Guide
                </button>
              </div>
            )}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">
                Failed to load dashboard state: {loadError}
              </div>
            ) : activeTab === 'orders' ? (
              <OrdersView
                orders={orders}
                metrics={metrics}
                settings={settings}
                selectedOrderId={selectedOrderId}
                onSelectOrder={setSelectedOrderId}
                onVoteOrder={handleVoteOrder}
                onResendPoll={handleResendPoll}
                onSendTracking={handleSendTracking}
                onSyncShopify={handleSyncShopify}
                onOpenSettings={() => setActiveTab('settings')}
                busyOrderId={busyOrderId}
                isSyncing={isSyncing}
                syncMessage={syncMessage}
              />
            ) : activeTab === 'whatsapp' ? (
              <WhatsAppQrView
                whatsapp={whatsapp}
                onConnect={handleWhatsAppConnect}
                onRequestPairingCode={handleWhatsAppPairingCode}
                onRestart={handleWhatsAppRestart}
                onDisconnect={handleWhatsAppDisconnect}
                isBusy={whatsappBusy}
              />
            ) : activeTab === 'settings' ? (
              <SettingsView
                settings={settings}
                onSave={handleSaveSettings}
                onTestShopify={handleTestShopify}
              />
            ) : (
              <SetupGuideView />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
