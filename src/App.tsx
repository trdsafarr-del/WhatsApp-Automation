import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  LayoutList,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Pin,
  PinOff,
  QrCode,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { OrdersView } from './components/OrdersView';
import { ReportsView } from './components/ReportsView';
import { SettingsView, type SettingsTab } from './components/SettingsView';
import { SetupGuideView } from './components/SetupGuideView';
import { WhatsAppQrView } from './components/WhatsAppQrView';
import { DEFAULT_SETTINGS, getWhatsAppDisplayState, hasHighRtoTag } from './lib/orderRules';
import type {
  AppSettings,
  DashboardPayload,
  OrderMetrics,
  OrderRecord,
  WhatsAppEngineMode,
  WhatsAppState,
} from './lib/types';

type ActiveTab = 'orders' | 'reports' | 'whatsapp' | 'settings' | 'setup';

const SIDEBAR_PIN_STORAGE_KEY = 'orderpulse_sidebar_pinned';

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

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'orders', label: 'Orders & Polls', shortLabel: 'Orders', icon: LayoutList },
  { id: 'reports', label: 'Daily Reports & PDF', shortLabel: 'Reports', icon: BarChart3 },
  { id: 'whatsapp', label: 'WhatsApp QR', shortLabel: 'WhatsApp', icon: QrCode },
  { id: 'settings', label: 'Automation & Shopify', shortLabel: 'Automation', icon: SlidersHorizontal },
  { id: 'setup', label: 'Install & Deploy', shortLabel: 'Deploy Guide', icon: BookOpen },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('credentials');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);

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

  const sidebarExpanded = sidebarPinned || sidebarHovered;

  const toggleSidebarPin = () => {
    setSidebarPinned((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      if (!next) {
        setSidebarHovered(false);
      }
      return next;
    });
  };

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

  const handleSaveOrderRemark = async (
    orderId: string,
    remark: string
  ): Promise<{ ok: boolean; shopifySynced?: boolean; error?: string }> => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/remark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        shopifySynced?: boolean;
        shopifyError?: string;
        error?: string;
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
      };
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to save remark.' };
      }
      if (data.orders) setOrders(data.orders);
      if (data.metrics) setMetrics(data.metrics);
      return {
        ok: true,
        shopifySynced: data.shopifySynced,
        error: data.shopifyError,
      };
    } catch {
      return { ok: false, error: 'Network error while saving remark.' };
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

  const handleWhatsAppPause = async () => {
    setWhatsappBusy(true);
    try {
      const res = await fetch('/api/whatsapp/pause', { method: 'POST' });
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

  const handleTestDelhivery = async () => {
    try {
      const res = await fetch('/api/delhivery/test', { method: 'POST' });
      const data = (await res.json()) as {
        ok: boolean;
        sampleAmount?: number;
        detectedOriginPin?: string;
        warning?: string;
        error?: string;
      };
      if (data.ok && data.detectedOriginPin) {
        void fetchDashboard();
      }
      return data;
    } catch {
      return { ok: false, error: 'Network error testing Delhivery One token.' };
    }
  };

  const handleSyncDelhivery = async () => {
    try {
      const res = await fetch('/api/delhivery/sync', { method: 'POST' });
      const data = (await res.json()) as {
        ok: boolean;
        trackedCount?: number;
        chargesUpdatedCount?: number;
        detectedOriginPin?: string;
        warning?: string;
        settings?: AppSettings;
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
        error?: string;
      };
      if (data.settings) setSettings(data.settings);
      if (data.orders) setOrders(data.orders);
      if (data.metrics) setMetrics(data.metrics);
      return data;
    } catch {
      return { ok: false, error: 'Network error syncing Delhivery One.' };
    }
  };

  const handleImportDelhiveryCsv = async (csvText: string) => {
    try {
      const res = await fetch('/api/delhivery/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        updatedCount?: number;
        parsedCount?: number;
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
        error?: string;
      };
      if (data.orders) setOrders(data.orders);
      if (data.metrics) setMetrics(data.metrics);
      return data;
    } catch {
      return { ok: false, error: 'Network error importing Delhivery CSV.' };
    }
  };

  const handleSettleOrder = async (
    orderId: string,
    params: { settled: boolean; reference?: string; amount?: number }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
      };
      if (data.orders) setOrders(data.orders);
      if (data.metrics) setMetrics(data.metrics);
      return true;
    } catch {
      return false;
    }
  };

  const handleSettleBulk = async (orderIds: string[], reference?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/orders/settle-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds, reference }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
      };
      if (data.orders) setOrders(data.orders);
      if (data.metrics) setMetrics(data.metrics);
      return true;
    } catch {
      return false;
    }
  };

  const isShopifyLinked = Boolean(
    settings.shopifyStoreDomain.trim() &&
      (settings.shopifyAccessToken.trim() ||
        (settings.shopifyClientId.trim() && settings.shopifyClientSecret.trim()))
  );

  const waDisplay = getWhatsAppDisplayState(whatsapp);
  const highRtoCount = orders.filter((o) => hasHighRtoTag(o.shopifyTags)).length;

  const connectionSummary = (
    <div className="border-t border-slate-800/80 px-4 py-4 text-xs text-slate-400">
      <p className="font-medium text-slate-200">WhatsApp: {waDisplay.sidebarLabel}</p>
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
      breadcrumb: `${settings.shopName} / Orders & Dispatch`,
      title: 'Live Order Confirmation & Dispatch Queue',
    },
    reports: {
      breadcrumb: `${settings.shopName} / Reports & Analytics`,
      title: 'Date-Wise Order, Confirmation & Tracking Reports',
    },
    whatsapp: {
      breadcrumb: `${settings.shopName} / WhatsApp QR`,
      title: '24/7 WhatsApp Linked Device Session',
    },
    settings: {
      breadcrumb: `${settings.shopName} / Automation & Rules`,
      title: 'Shopify Credentials, Polls & Tracking Rules',
    },
    setup: {
      breadcrumb: `${settings.shopName} / Install & Deploy`,
      title: 'Shopify App, Env Sync & 24/7 Deployment Guide',
    },
  };

  return (
    <div
      className={`relative min-h-screen overflow-x-clip bg-[#060a13] text-slate-100 transition-[padding] duration-200 ${
        sidebarPinned ? 'lg:pl-64' : 'lg:pl-[68px]'
      }`}
    >
      {/* Animated Ambient Dark Background Canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="ambient-bg-grid absolute -inset-12 opacity-70" />
        <div className="ambient-orb-emerald absolute -top-44 -left-32 h-[560px] w-[560px] rounded-full" />
        <div className="ambient-orb-sky absolute top-1/4 -right-40 h-[540px] w-[540px] rounded-full" />
        <div className="ambient-orb-amber absolute -bottom-48 left-1/3 h-[500px] w-[500px] rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/80" />
      </div>

      {/* Desktop Auto-Hide Sidebar (hover left rail to expand, or pin open) */}
      <aside
        data-testid="desktop-sidebar"
        data-expanded={sidebarExpanded ? 'true' : 'false'}
        data-pinned={sidebarPinned ? 'true' : 'false'}
        onMouseEnter={() => {
          if (!sidebarPinned) setSidebarHovered(true);
        }}
        onMouseLeave={() => {
          if (!sidebarPinned) setSidebarHovered(false);
        }}
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-800/90 bg-slate-950/90 text-slate-100 backdrop-blur-xl transition-[width,box-shadow] duration-200 ease-out lg:flex ${
          sidebarExpanded ? 'w-64 shadow-2xl shadow-black/60' : 'w-[68px]'
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-slate-800/80 ${
            sidebarExpanded ? 'justify-between px-5' : 'justify-center px-2'
          }`}
        >
          {sidebarExpanded ? (
            <>
              <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
                OrderPulse
              </span>
              <button
                type="button"
                onClick={toggleSidebarPin}
                title={sidebarPinned ? 'Switch to Auto-Hide Sidebar' : 'Pin Sidebar Open'}
                aria-label={sidebarPinned ? 'Switch to Auto-Hide Sidebar' : 'Pin Sidebar Open'}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                {sidebarPinned ? (
                  <PinOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Pin className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleSidebarPin}
              title="OrderPulse — Hover or click to pin sidebar"
              aria-label="Pin Sidebar Open"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 font-display text-sm font-bold text-white shadow-sm shadow-emerald-950/60 transition-colors hover:bg-emerald-500"
            >
              OP
            </button>
          )}
        </div>

        <nav aria-label="Primary Navigation" className="flex-1 space-y-1.5 px-2.5 py-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={!sidebarExpanded ? item.label : undefined}
                onClick={() => {
                  setActiveTab(item.id);
                  if (!sidebarPinned) setSidebarHovered(false);
                }}
                className={`flex w-full items-center rounded-lg py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  sidebarExpanded ? 'gap-3 px-3' : 'justify-center px-2'
                } ${
                  active
                    ? 'bg-emerald-600/90 text-white shadow-sm shadow-emerald-950/50'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {sidebarExpanded && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {sidebarExpanded ? (
          connectionSummary
        ) : (
          <div className="flex flex-col items-center gap-3 border-t border-slate-800/80 py-4 font-mono text-[10px] text-slate-400">
            <span
              title={`WhatsApp: ${waDisplay.sidebarLabel}`}
              className={`font-semibold ${
                waDisplay.isLinked ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              WA
            </span>
            <span
              title={`Shopify: ${isShopifyLinked ? 'Linked' : 'Not Configured'}`}
              className={`font-semibold ${
                isShopifyLinked ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              SHP
            </span>
          </div>
        )}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
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
                      active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
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

      {/* Main Workspace Area (no z-index so fixed z-50 child sheets overlay the bottom nav) */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Clean 3-Zone Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/80 px-3.5 backdrop-blur-xl sm:h-16 sm:gap-4 sm:px-6">
          {/* Zone 1: Sidebar Toggle + Breadcrumb / Title */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={toggleSidebarPin}
              title={sidebarPinned ? 'Auto-Hide Sidebar' : 'Pin Sidebar Open'}
              aria-label={sidebarPinned ? 'Auto-Hide Sidebar' : 'Pin Sidebar Open'}
              className="hidden rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white lg:inline-flex"
            >
              {sidebarPinned ? (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeft className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 sm:gap-2 sm:text-xs">
                <span className="truncate">{pageMeta[activeTab].breadcrumb}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-medium whitespace-nowrap shrink-0 ${
                    waDisplay.isHostLive ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {waDisplay.isHostLive
                    ? 'WA Live'
                    : waDisplay.statusLabel === 'Session Paused'
                      ? 'WA Paused'
                      : 'WA Unlinked'}
                </span>
              </div>
              <h1 className="truncate font-display text-sm font-semibold text-white sm:text-base">
                {pageMeta[activeTab].title}
              </h1>
            </div>
          </div>

          {/* Zone 2: Well-Maintained Top Workspace Tabs */}
          <nav
            aria-label="Dashboard Sections"
            className="hidden items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1 xl:flex"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-emerald-400' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{item.shortLabel}</span>
                  {item.id === 'orders' && highRtoCount > 0 && (
                    <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                      ({orders.length})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              setActiveTab('orders');
              void handleSyncShopify();
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="sm:hidden">{isSyncing ? 'Syncing' : 'Sync'}</span>
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Shopify'}</span>
          </button>
        </header>

        {/* Tablet/Medium Sub-bar Tab Switcher (hidden on phones because mobile uses Bottom Nav Bar) */}
        <div className="hidden border-b border-slate-800/80 bg-slate-950/75 px-6 py-2 backdrop-blur-xl lg:block xl:hidden">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/90 p-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-emerald-400' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <main className="flex-1 p-3.5 pb-24 sm:p-6 sm:pb-24 lg:pb-6">
          <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-5">
            {!isLoading && whatsapp.isServerless && !cloudSyncEnabled && (
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 backdrop-blur-md sm:flex-row sm:items-center">
                <p className="leading-relaxed">
                  <span className="font-semibold text-amber-100">Fresh Vercel Deploy Detected:</span> Shopify credentials saved in AI Studio stay on that server until you add <span className="font-mono text-amber-100">SHOPIFY_*</span> Env Vars or free Redis (<span className="font-mono text-amber-100">KV_REST_API_URL</span> / <span className="font-mono text-amber-100">UPSTASH_REDIS_REST_URL</span>) in Vercel Project Settings.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('setup')}
                  className="shrink-0 rounded-lg border border-amber-400/40 bg-slate-900/80 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-slate-800 whitespace-nowrap"
                >
                  Open Setup Guide
                </button>
              </div>
            )}

            {!isLoading &&
              !whatsapp.isServerless &&
              !waDisplay.isHostLive &&
              whatsapp.sessionPersisted &&
              whatsapp.status !== 'connecting' && (
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/12 px-4 py-3 text-xs text-amber-100 backdrop-blur-md sm:flex-row sm:items-center">
                  <p className="leading-relaxed">
                    <span className="font-semibold text-amber-200">
                      WhatsApp Socket Paused on This Server:
                    </span>{' '}
                    Queued orders will automatically send once WhatsApp is resumed here.
                  </p>
                  <button
                    type="button"
                    disabled={whatsappBusy}
                    onClick={() => void handleWhatsAppRestart()}
                    className="shrink-0 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
                  >
                    {whatsappBusy ? 'Connecting...' : 'Resume WhatsApp Now'}
                  </button>
                </div>
              )}

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-900/70 sm:h-28"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-5 text-sm text-rose-200 sm:p-6">
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
                onSaveRemark={handleSaveOrderRemark}
                onSyncShopify={handleSyncShopify}
                onOpenSettings={() => setActiveTab('settings')}
                busyOrderId={busyOrderId}
                isSyncing={isSyncing}
                syncMessage={syncMessage}
              />
            ) : activeTab === 'reports' ? (
              <ReportsView
                orders={orders}
                settings={settings}
                onInspectOrder={(orderId) => {
                  setSelectedOrderId(orderId);
                  setActiveTab('orders');
                }}
                onSaveSettings={handleSaveSettings}
                onSyncDelhivery={handleSyncDelhivery}
                onImportDelhiveryCsv={handleImportDelhiveryCsv}
                onSettleOrder={handleSettleOrder}
                onSettleBulk={handleSettleBulk}
                onOpenDelhiverySettings={() => {
                  setSettingsInitialTab('delhivery');
                  setActiveTab('settings');
                }}
              />
            ) : activeTab === 'whatsapp' ? (
              <WhatsAppQrView
                whatsapp={whatsapp}
                onConnect={handleWhatsAppConnect}
                onRequestPairingCode={handleWhatsAppPairingCode}
                onRestart={handleWhatsAppRestart}
                onPause={handleWhatsAppPause}
                onDisconnect={handleWhatsAppDisconnect}
                isBusy={whatsappBusy}
              />
            ) : activeTab === 'settings' ? (
              <SettingsView
                settings={settings}
                initialTab={settingsInitialTab}
                onSave={handleSaveSettings}
                onTestShopify={handleTestShopify}
                onTestDelhivery={handleTestDelhivery}
                onSyncDelhivery={handleSyncDelhivery}
              />
            ) : (
              <SetupGuideView
                settings={settings}
                cloudSyncEnabled={cloudSyncEnabled}
                whatsapp={whatsapp}
              />
            )}
          </div>
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar (Thumb Zone) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        data-testid="mobile-bottom-nav"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl pb-safe lg:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-stretch">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const mobileLabel =
              item.id === 'setup' ? 'Guide' : item.shortLabel;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-medium transition-colors active:scale-95 ${
                  active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-emerald-400"
                  />
                )}
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  {item.id === 'orders' && orders.length > 0 && (
                    <span className="ml-0.5 font-mono text-[9px] font-semibold tabular-nums text-amber-300">
                      {orders.length}
                    </span>
                  )}
                </div>
                <span className="max-w-full truncate whitespace-nowrap leading-none">{mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
