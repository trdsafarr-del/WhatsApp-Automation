import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Cloud,
  CloudOff,
  Layers,
  LayoutList,
  Lock,
  MapPin,
  Menu,
  Palette,
  PanelLeft,
  PanelLeftClose,
  Pin,
  PinOff,
  QrCode,
  RefreshCw,
  SearchCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DashboardLockScreen } from './components/DashboardLockScreen';
import { LiveAmbientBackground, type BackgroundMode } from './components/LiveAmbientBackground';
import { OrdersView } from './components/OrdersView';
import { PincodeCatalogView } from './components/PincodeCatalogView';
import { ReportsView } from './components/ReportsView';
import { SeoManagerView } from './components/SeoManagerView';
import { SettingsView, type SettingsTab } from './components/SettingsView';
import { SetupGuideView } from './components/SetupGuideView';
import { ThemeStudioView } from './components/ThemeStudioView';
import { WhatsAppQrView } from './components/WhatsAppQrView';
import {
  AUTH_LOCKED_EVENT,
  clearDashboardToken,
  dashboardFetch,
  saveDashboardToken,
} from './lib/dashboardAuth';
import { rtdbProjectMeta } from './lib/rtdb';
import {
  createRtdbSyncTracker,
  isRtdbPermissionDenied,
  subscribeToRtdbCloudData,
  syncDeltaToRtdb,
  type RtdbCloudSnapshot,
} from './lib/rtdbSync';
import { DEFAULT_GEO_SEO_CONFIG } from './lib/geoSeo';
import {
  computeOrderMetrics,
  DEFAULT_SETTINGS,
  getWhatsAppDisplayState,
  hasConfiguredShopify,
  hasHighRtoTag,
  mergeProgressedOrderRecords,
} from './lib/orderRules';
import { DEFAULT_STOREFRONT_CONFIG } from './lib/storefrontRules';
import type {
  AppSettings,
  DashboardPayload,
  GeoSeoConfig,
  OrderMetrics,
  OrderRecord,
  ProductCatalogItem,
  StorefrontConfig,
  WhatsAppEngineMode,
  WhatsAppState,
} from './lib/types';

type ActiveTab =
  | 'orders'
  | 'reports'
  | 'pincode'
  | 'seo'
  | 'theme'
  | 'whatsapp'
  | 'settings'
  | 'setup';

const SIDEBAR_PIN_STORAGE_KEY = 'orderpulse_sidebar_pinned';
const BG_MODE_STORAGE_KEY = 'orderpulse_bg_mode';

const BG_MODE_OPTIONS: Array<{ id: BackgroundMode; label: string; short: string }> = [
  { id: 'hyper4d', label: '4D Hyper', short: '4D' },
  { id: 'orbit3d', label: '3D Orbit', short: '3D' },
  { id: 'flow2d', label: '2D Mesh', short: '2D' },
  { id: 'minimal', label: 'Calm', short: 'Off' },
];

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

type NavSection = 'operations' | 'storefront' | 'system';

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  shortLabel: string;
  section: NavSection;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'orders', label: 'Orders & Polls', shortLabel: 'Orders', section: 'operations', icon: LayoutList },
  { id: 'reports', label: 'Daily Reports & PDF', shortLabel: 'Reports', section: 'operations', icon: BarChart3 },
  { id: 'whatsapp', label: 'WhatsApp QR', shortLabel: 'WhatsApp', section: 'operations', icon: QrCode },
  { id: 'pincode', label: 'Pincode Catalog', shortLabel: 'Pincode', section: 'storefront', icon: MapPin },
  { id: 'seo', label: 'SEO Manager', shortLabel: 'SEO', section: 'storefront', icon: SearchCheck },
  { id: 'theme', label: 'Theme Studio', shortLabel: 'Theme', section: 'storefront', badge: 'Next', icon: Palette },
  { id: 'settings', label: 'Automation & Shopify', shortLabel: 'Automation', section: 'system', icon: SlidersHorizontal },
  { id: 'setup', label: 'Install & Deploy', shortLabel: 'Guide', section: 'system', icon: BookOpen },
];

function mergeOrderLists(primary: OrderRecord[], secondary: OrderRecord[]): OrderRecord[] {
  const map = new Map<string, OrderRecord>();
  for (const order of secondary) {
    map.set(order.id, order);
  }
  for (const order of primary) {
    const existing = map.get(order.id);
    map.set(order.id, existing ? mergeProgressedOrderRecords(order, existing) : order);
  }
  return Array.from(map.values()).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

const SIDEBAR_SECTIONS: Array<{ id: NavSection; title: string }> = [
  { id: 'operations', title: 'Operations' },
  { id: 'storefront', title: 'Storefront & SEO' },
  { id: 'system', title: 'System' },
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
  const [bgMode, setBgMode] = useState<BackgroundMode>(() => {
    if (typeof window === 'undefined') return 'hyper4d';
    try {
      const saved = window.localStorage.getItem(BG_MODE_STORAGE_KEY);
      if (saved === 'hyper4d' || saved === 'orbit3d' || saved === 'flow2d' || saved === 'minimal') {
        return saved;
      }
      return 'hyper4d';
    } catch {
      return 'hyper4d';
    }
  });

  const handleChangeBgMode = (next: BackgroundMode) => {
    setBgMode(next);
    try {
      window.localStorage.setItem(BG_MODE_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  const handleCycleBgMode = () => {
    const idx = BG_MODE_OPTIONS.findIndex((m) => m.id === bgMode);
    const next = BG_MODE_OPTIONS[(idx + 1) % BG_MODE_OPTIONS.length];
    handleChangeBgMode(next.id);
  };

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics>(EMPTY_METRICS);
  const [whatsapp, setWhatsapp] = useState<WhatsAppState>(EMPTY_WHATSAPP);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig>(
    DEFAULT_STOREFRONT_CONFIG
  );
  const [geoSeoConfig, setGeoSeoConfig] = useState<GeoSeoConfig>(DEFAULT_GEO_SEO_CONFIG);
  const [authState, setAuthState] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [upstashQuotaExceeded, setUpstashQuotaExceeded] = useState(false);
  const [rtdbSyncState, setRtdbSyncState] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');
  const [rtdbError, setRtdbError] = useState<string | null>(null);
  const [rtdbPermissionDenied, setRtdbPermissionDenied] = useState(false);
  const [rtdbReconnectTick, setRtdbReconnectTick] = useState(0);
  const [cloudReadyTick, setCloudReadyTick] = useState(0);
  const [cloudSummary, setCloudSummary] = useState({
    loaded: false,
    hasShopify: false,
    orders: 0,
    products: 0,
  });

  const syncTrackerRef = useRef(createRtdbSyncTracker());
  const cloudSnapshotRef = useRef<RtdbCloudSnapshot | null>(null);
  const restoringFromCloudRef = useRef(false);
  const lastRestoredKeyRef = useRef('');
  const latestStateRef = useRef({
    orders,
    products,
    settings,
    storefrontConfig,
    geoSeoConfig,
    whatsapp,
  });
  latestStateRef.current = {
    orders,
    products,
    settings,
    storefrontConfig,
    geoSeoConfig,
    whatsapp,
  };

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
      const res = await dashboardFetch('/api/dashboard');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = (await res.json()) as DashboardPayload;
      const current = latestStateRef.current;
      const cloud = cloudSnapshotRef.current;
      const serverHasShopify = hasConfiguredShopify(data.settings);
      const localOrCloudHasShopify =
        hasConfiguredShopify(current.settings) ||
        Boolean(cloud?.settings && hasConfiguredShopify(cloud.settings));
      const isColdServerlessReply =
        Boolean(data.whatsapp?.isServerless || data.upstashQuotaExceeded) &&
        !serverHasShopify &&
        data.orders.length === 0;

      const mergeWithCloudWa = (serverWa: WhatsAppState): WhatsAppState => {
        if (serverWa.status === 'connected') return serverWa;
        const cWa = cloud?.whatsappMeta;
        if (cWa?.phoneNumber && (cWa.connectedAt || cWa.activeHostKind || cWa.lastHeartbeatAt)) {
          const isDifferentHost = Boolean(
            cWa.activeHostKind && serverWa.hostKind && cWa.activeHostKind !== serverWa.hostKind
          );
          if (!serverWa.phoneNumber || isDifferentHost || serverWa.isServerless) {
            return {
              ...serverWa,
              mode: cWa.mode || serverWa.mode,
              phoneNumber: cWa.phoneNumber || serverWa.phoneNumber,
              pushName: cWa.pushName ?? serverWa.pushName,
              connectedAt: cWa.connectedAt || serverWa.connectedAt,
              lastHeartbeatAt: cWa.lastHeartbeatAt || serverWa.lastHeartbeatAt,
              activeHostKind: cWa.activeHostKind || serverWa.activeHostKind,
              remoteSessionActive: Boolean(serverWa.isServerless || isDifferentHost || !serverWa.hostKind),
              sessionPersisted: true,
            };
          }
        }
        return serverWa;
      };

      // Never let a cold/empty Vercel container wipe out Firestore-restored orders, products, or Shopify settings
      if (isColdServerlessReply && (localOrCloudHasShopify || current.orders.length > 0)) {
        setWhatsapp(mergeWithCloudWa(data.whatsapp));
        setCloudSyncEnabled(Boolean(data.cloudSyncEnabled));
        setUpstashQuotaExceeded(Boolean(data.upstashQuotaExceeded));
        setLoadError(null);
        return;
      }

      const mergedOrders =
        data.orders.length > 0 || current.orders.length === 0
          ? cloud && cloud.orders.length > 0 && data.orders.length < cloud.orders.length
            ? mergeOrderLists(data.orders, cloud.orders)
            : data.orders
          : current.orders;

      setOrders(mergedOrders);
      setMetrics(
        mergedOrders === data.orders ? data.metrics : computeOrderMetrics(mergedOrders)
      );
      setWhatsapp(mergeWithCloudWa(data.whatsapp));
      if (Array.isArray(data.products) && (data.products.length > 0 || current.products.length === 0)) {
        setProducts(data.products);
      }
      if (data.storefrontConfig) {
        setStorefrontConfig((prev) =>
          JSON.stringify(prev) === JSON.stringify(data.storefrontConfig)
            ? prev
            : data.storefrontConfig!
        );
      }
      if (data.geoSeoConfig) {
        setGeoSeoConfig((prev) =>
          JSON.stringify(prev) === JSON.stringify(data.geoSeoConfig)
            ? prev
            : data.geoSeoConfig!
        );
      }
      setCloudSyncEnabled(Boolean(data.cloudSyncEnabled));
      setUpstashQuotaExceeded(Boolean(data.upstashQuotaExceeded));
      if (serverHasShopify || !localOrCloudHasShopify) {
        setSettings((prev) =>
          JSON.stringify(prev) === JSON.stringify(data.settings) ? prev : data.settings
        );
      }
      setSelectedOrderId((prev) =>
        prev && mergedOrders.some((o) => o.id === prev) ? prev : mergedOrders[0]?.id || null
      );
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      try {
        const res = await dashboardFetch('/api/auth/status');
        const data = (await res.json()) as { authenticated?: boolean };
        if (!active) return;
        setAuthState(data.authenticated ? 'unlocked' : 'locked');
        if (!data.authenticated) setIsLoading(false);
      } catch {
        if (!active) return;
        setAuthState('locked');
        setIsLoading(false);
      }
    };
    void checkAuth();

    const handleAuthLocked = () => {
      setAuthState('locked');
      setIsLoading(false);
    };
    window.addEventListener(AUTH_LOCKED_EVENT, handleAuthLocked);
    return () => {
      active = false;
      window.removeEventListener(AUTH_LOCKED_EVENT, handleAuthLocked);
    };
  }, []);

  const handleLockDashboard = async () => {
    clearDashboardToken();
    setAuthState('locked');
    try {
      await dashboardFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Already locked locally
    }
  };

  const handleReconnectRtdb = () => {
    setRtdbError(null);
    setRtdbPermissionDenied(false);
    setRtdbSyncState('syncing');
    setRtdbReconnectTick((n) => n + 1);
  };

  // Auto-subscribe to Firebase Realtime Database (/orderpulse) immediately once dashboard is unlocked (zero Google login needed)
  useEffect(() => {
    if (authState !== 'unlocked') {
      syncTrackerRef.current = createRtdbSyncTracker();
      cloudSnapshotRef.current = null;
      lastRestoredKeyRef.current = '';
      setCloudReadyTick(0);
      setCloudSummary({ loaded: false, hasShopify: false, orders: 0, products: 0 });
      setRtdbSyncState('idle');
      setRtdbError(null);
      setRtdbPermissionDenied(false);
      return;
    }

    syncTrackerRef.current = createRtdbSyncTracker();
    setRtdbSyncState('syncing');
    setRtdbError(null);
    setRtdbPermissionDenied(false);

    let initialSignalled = false;

    const handleCloudSnapshot = (cloud: RtdbCloudSnapshot) => {
      cloudSnapshotRef.current = cloud;
      const cloudHasShopify = Boolean(cloud.settings && hasConfiguredShopify(cloud.settings));
      setCloudSummary({
        loaded: true,
        hasShopify: cloudHasShopify,
        orders: cloud.orders.length,
        products: cloud.products.length,
      });

      if (!initialSignalled) {
        initialSignalled = true;
        setCloudReadyTick((n) => n + 1);
      }

      const current = latestStateRef.current;
      const serverHasShopify = hasConfiguredShopify(current.settings);
      const cloudHasMoreOrders = cloud.orders.length > current.orders.length;
      const cloudHasMoreProducts = cloud.products.length > current.products.length;

      const cloudWa = cloud.whatsappMeta;
      const cloudWaConnected = Boolean(
        cloudWa?.phoneNumber && (cloudWa.connectedAt || cloudWa.activeHostKind || cloudWa.lastHeartbeatAt)
      );
      const localWaConnected = current.whatsapp.status === 'connected';
      const cloudWaChanged =
        !localWaConnected &&
        cloudWaConnected &&
        (current.whatsapp.phoneNumber !== cloudWa?.phoneNumber ||
          current.whatsapp.pushName !== (cloudWa?.pushName ?? null) ||
          current.whatsapp.connectedAt !== (cloudWa?.connectedAt ?? null) ||
          current.whatsapp.activeHostKind !== (cloudWa?.activeHostKind ?? null) ||
          (Boolean(cloudWa?.lastHeartbeatAt) &&
            current.whatsapp.lastHeartbeatAt !== cloudWa?.lastHeartbeatAt) ||
          !current.whatsapp.remoteSessionActive);

      const curFestUpdatedMs = current.storefrontConfig.festivalTheme?.updatedAt
        ? Date.parse(current.storefrontConfig.festivalTheme.updatedAt)
        : 0;
      const cloudFestUpdatedMs = cloud.storefrontConfig?.festivalTheme?.updatedAt
        ? Date.parse(cloud.storefrontConfig.festivalTheme.updatedAt)
        : 0;
      const cloudHasNewerFestivalTheme =
        Boolean(cloud.storefrontConfig?.festivalTheme) &&
        Number.isFinite(cloudFestUpdatedMs) &&
        cloudFestUpdatedMs > (Number.isFinite(curFestUpdatedMs) ? curFestUpdatedMs : 0);

      const needsRestore =
        (cloudHasShopify && !serverHasShopify) ||
        cloudHasMoreOrders ||
        cloudHasMoreProducts ||
        cloudWaChanged ||
        cloudHasNewerFestivalTheme;

      // Hydrate React UI immediately from RTDB so AI Studio & Vercel reflect Railway live state in 0ms
      if (cloudHasShopify && !serverHasShopify && cloud.settings) {
        setSettings(cloud.settings);
      }
      if (cloudHasMoreOrders) {
        const merged = mergeOrderLists(current.orders, cloud.orders);
        setOrders(merged);
        setMetrics(computeOrderMetrics(merged));
        setSelectedOrderId((prev) =>
          prev && merged.some((o) => o.id === prev) ? prev : merged[0]?.id || null
        );
      }
      if (cloudHasMoreProducts) {
        setProducts(cloud.products);
      }
      if (cloud.storefrontConfig && (!serverHasShopify || cloudHasNewerFestivalTheme)) {
        setStorefrontConfig(cloud.storefrontConfig);
      }
      if (cloud.geoSeoConfig && !serverHasShopify) {
        setGeoSeoConfig(cloud.geoSeoConfig);
      }
      if (cloudWaChanged && cloudWa) {
        setWhatsapp((prev) => {
          if (prev.status === 'connected') return prev;
          const isDifferentHost = Boolean(
            cloudWa.activeHostKind && prev.hostKind && cloudWa.activeHostKind !== prev.hostKind
          );
          return {
            ...prev,
            mode: cloudWa.mode || prev.mode,
            phoneNumber: cloudWa.phoneNumber || prev.phoneNumber,
            pushName: cloudWa.pushName ?? prev.pushName,
            connectedAt: cloudWa.connectedAt || prev.connectedAt,
            lastHeartbeatAt: cloudWa.lastHeartbeatAt || prev.lastHeartbeatAt,
            activeHostKind: cloudWa.activeHostKind || prev.activeHostKind,
            remoteSessionActive: Boolean(prev.isServerless || isDifferentHost || !prev.hostKind),
            sessionPersisted: true,
          };
        });
      }

      const restoreKey = [
        cloudHasShopify ? '1' : '0',
        cloud.orders.length,
        cloud.products.length,
        cloud.orders[0]?.id || '',
        cloud.orders[0]?.respondedAt || '',
        cloudWa?.phoneNumber || '',
        cloudWa?.activeHostKind || '',
        cloudWa?.connectedAt || '',
        cloudWa?.lastHeartbeatAt || '',
        cloud.storefrontConfig?.festivalTheme?.updatedAt || '',
      ].join(':');

      if (needsRestore && !restoringFromCloudRef.current && restoreKey !== lastRestoredKeyRef.current) {
        restoringFromCloudRef.current = true;
        lastRestoredKeyRef.current = restoreKey;
        setRtdbSyncState('syncing');

        void dashboardFetch('/api/sync/restore-from-cloud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: cloud.settings,
            orders: cloud.orders,
            products: cloud.products,
            storefrontConfig: cloud.storefrontConfig,
            geoSeoConfig: cloud.geoSeoConfig,
            whatsappMeta: cloud.whatsappMeta,
          }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(`Restore failed (${res.status})`);
            const data = (await res.json()) as {
              orders?: OrderRecord[];
              metrics?: OrderMetrics;
              settings?: AppSettings;
              products?: ProductCatalogItem[];
              storefrontConfig?: StorefrontConfig;
              geoSeoConfig?: GeoSeoConfig;
              whatsapp?: WhatsAppState;
            };
            if (Array.isArray(data.orders)) {
              setOrders(data.orders);
              setSelectedOrderId((prev) =>
                prev && data.orders!.some((o) => o.id === prev) ? prev : data.orders![0]?.id || null
              );
            }
            if (data.metrics) setMetrics(data.metrics);
            if (data.settings) setSettings(data.settings);
            if (Array.isArray(data.products)) setProducts(data.products);
            if (data.storefrontConfig) setStorefrontConfig(data.storefrontConfig);
            if (data.geoSeoConfig) setGeoSeoConfig(data.geoSeoConfig);
            if (data.whatsapp) setWhatsapp(data.whatsapp);
            setRtdbSyncState('synced');
            setRtdbError(null);
            setRtdbPermissionDenied(false);
          })
          .catch((err) => {
            setRtdbSyncState('error');
            setRtdbError(
              err instanceof Error
                ? err.message
                : 'Unable to restore data from Firebase Realtime Database.'
            );
          })
          .finally(() => {
            restoringFromCloudRef.current = false;
          });
      } else if (!restoringFromCloudRef.current) {
        setRtdbSyncState('synced');
      }
    };

    const handleFatalError = (err: Error) => {
      const permDenied = isRtdbPermissionDenied(err);
      setRtdbSyncState('error');
      setRtdbPermissionDenied(permDenied);
      setRtdbError(
        permDenied
          ? `Realtime Database (${rtdbProjectMeta.projectId}) is in locked mode. Open RTDB Rules, paste the admin rule from the Guide tab, and click Publish.`
          : err.message
      );
    };

    const unsubscribe = subscribeToRtdbCloudData(
      syncTrackerRef.current,
      handleCloudSnapshot,
      handleFatalError
    );

    return () => {
      unsubscribe();
    };
  }, [authState, rtdbReconnectTick]);

  // Delta-sync ONLY changed orders/products/config from active server to Firebase Realtime Database
  useEffect(() => {
    if (
      authState !== 'unlocked' ||
      isLoading ||
      cloudReadyTick === 0 ||
      rtdbPermissionDenied
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (restoringFromCloudRef.current || syncTrackerRef.current.permissionBlocked) return;
      void syncDeltaToRtdb(
        {
          settings,
          storefrontConfig,
          geoSeoConfig,
          whatsapp: latestStateRef.current.whatsapp,
          orders,
          products,
        },
        syncTrackerRef.current
      )
        .then(({ writtenPaths }) => {
          if (writtenPaths > 0) {
            setRtdbSyncState('synced');
            setRtdbError(null);
            setRtdbPermissionDenied(false);
          }
        })
        .catch((err) => {
          const permDenied = isRtdbPermissionDenied(err);
          const msg = err instanceof Error ? err.message : String(err);
          setRtdbSyncState('error');
          setRtdbPermissionDenied(permDenied);
          setRtdbError(
            permDenied
              ? `Realtime Database (${rtdbProjectMeta.projectId}) rules need updating. Open RTDB Rules, paste the zero-login rule from Guide, and click Publish.`
              : msg
          );
        });
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [
    authState,
    isLoading,
    cloudReadyTick,
    rtdbPermissionDenied,
    orders,
    products,
    settings,
    storefrontConfig,
    geoSeoConfig,
    whatsapp.status,
    whatsapp.phoneNumber,
    whatsapp.lastHeartbeatAt,
  ]);

  useEffect(() => {
    if (authState !== 'unlocked') return;
    void fetchDashboard();
  }, [authState, fetchDashboard]);

  // Refresh immediately when returning to the app on phone/desktop
  useEffect(() => {
    if (authState !== 'unlocked') return;
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
  }, [authState, fetchDashboard, activeTab]);

  // Poll backend smoothly while QR is waiting or on live views, pausing while editing Settings
  useEffect(() => {
    if (authState !== 'unlocked' || activeTab === 'settings') return;
    const intervalMs =
      whatsapp.status === 'qr_ready' || whatsapp.status === 'connecting' ? 2500 : 8000;
    const timer = setInterval(() => {
      void fetchDashboard();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [authState, fetchDashboard, whatsapp.status, activeTab]);

  const handleVoteOrder = async (orderId: string, option: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await dashboardFetch(`/api/orders/${encodeURIComponent(orderId)}/vote`, {
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
      const res = await dashboardFetch(`/api/orders/${encodeURIComponent(orderId)}/resend-poll`, {
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
      const res = await dashboardFetch(`/api/orders/${encodeURIComponent(orderId)}/send-tracking`, {
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
      const res = await dashboardFetch(`/api/orders/${encodeURIComponent(orderId)}/remark`, {
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

  const handleCancelOrderInShopify = async (
    orderId: string
  ): Promise<{ ok: boolean; alreadyCancelled?: boolean; error?: string }> => {
    setBusyOrderId(orderId);
    try {
      const res = await dashboardFetch(
        `/api/orders/${encodeURIComponent(orderId)}/cancel-shopify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refund: false }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        alreadyCancelled?: boolean;
        error?: string;
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
      };
      if (data.orders) setOrders(data.orders);
      if (data.metrics) setMetrics(data.metrics);
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || 'Shopify rejected order cancellation.' };
      }
      return { ok: true, alreadyCancelled: data.alreadyCancelled };
    } catch {
      return { ok: false, error: 'Network error while cancelling order in Shopify.' };
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSyncShopify = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const current = latestStateRef.current;
      const payload = hasConfiguredShopify(current.settings)
        ? { settings: current.settings, orders: current.orders }
        : undefined;
      const res = await dashboardFetch('/api/shopify/sync', {
        method: 'POST',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        importedCount?: number;
        cancelledInShopifyCount?: number;
        orders?: OrderRecord[];
        metrics?: OrderMetrics;
        error?: string;
      };
      if (!res.ok) {
        setSyncMessage(data.error || 'Shopify credentials required in Automation & Shopify tab.');
      } else {
        if (data.orders) setOrders(data.orders);
        if (data.metrics) setMetrics(data.metrics);
        const cancelNote =
          data.cancelledInShopifyCount && data.cancelledInShopifyCount > 0
            ? ` · ${data.cancelledInShopifyCount} cancelled in Shopify`
            : '';
        setSyncMessage(
          `Synced Shopify orders (${data.importedCount ?? 0} new orders imported${cancelNote}).`
        );
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
      const res = await dashboardFetch('/api/whatsapp/connect', {
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
      const res = await dashboardFetch('/api/whatsapp/pairing-code', {
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
      const res = await dashboardFetch('/api/whatsapp/restart', { method: 'POST' });
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
      const res = await dashboardFetch('/api/whatsapp/disconnect', { method: 'POST' });
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
      const res = await dashboardFetch('/api/whatsapp/pause', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { whatsapp: WhatsAppState };
        setWhatsapp(data.whatsapp);
      }
    } finally {
      setWhatsappBusy(false);
    }
  };

  const handleSaveSettings = async (next: Partial<AppSettings>): Promise<boolean> => {
    const res = await dashboardFetch('/api/settings', {
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
    const current = latestStateRef.current;
    const payload = hasConfiguredShopify(current.settings)
      ? { settings: current.settings }
      : undefined;
    const res = await dashboardFetch('/api/shopify/test', {
      method: 'POST',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    return (await res.json()) as { ok: boolean; shopName?: string; error?: string };
  };

  const handleTestDelhivery = async () => {
    try {
      const res = await dashboardFetch('/api/delhivery/test', { method: 'POST' });
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
      const res = await dashboardFetch('/api/delhivery/sync', { method: 'POST' });
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
      const res = await dashboardFetch('/api/delhivery/import-csv', {
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
      const res = await dashboardFetch(`/api/orders/${encodeURIComponent(orderId)}/settle`, {
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
      const res = await dashboardFetch('/api/orders/settle-bulk', {
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
        {rtdbSyncState === 'synced'
          ? 'Firebase RTDB Live (Auto)'
          : rtdbSyncState === 'syncing'
            ? 'Firebase RTDB Connecting...'
            : rtdbSyncState === 'error'
              ? 'Firebase RTDB Rules Needed'
              : upstashQuotaExceeded
                ? 'Upstash Limit Reached'
                : cloudSyncEnabled
                  ? 'Cloud DB Synced'
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
    pincode: {
      breadcrumb: `${settings.shopName} / Storefront & SEO`,
      title: 'Pincode-Based Product Catalog & Delivery Filter',
    },
    seo: {
      breadcrumb: `${settings.shopName} / Storefront & SEO`,
      title: 'Product SEO Audit, SERP Preview & Schema Manager',
    },
    theme: {
      breadcrumb: `${settings.shopName} / Storefront & SEO`,
      title: '1-Click Festival Theme Engine & Original Theme Restore',
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

  if (authState === 'checking') {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#050912] text-slate-300">
        <LiveAmbientBackground mode={bgMode} />
        <div className="relative z-10 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/85 px-5 py-3 text-xs font-medium backdrop-blur-md">
          <Lock className="h-4 w-4 animate-pulse text-emerald-400" aria-hidden="true" />
          <span>Checking dashboard access...</span>
        </div>
      </div>
    );
  }

  if (authState === 'locked') {
    return (
      <DashboardLockScreen
        onUnlocked={(token) => {
          if (token) saveDashboardToken(token);
          setIsLoading(true);
          setAuthState('unlocked');
        }}
      />
    );
  }

  return (
    <div
      className={`relative min-h-screen overflow-x-clip bg-[#050912] text-slate-100 transition-[padding] duration-200 ${
        sidebarPinned ? 'lg:pl-64' : 'lg:pl-[68px]'
      }`}
    >
      {/* Live 4D / 3D / 2D Interactive Ambient Background */}
      <LiveAmbientBackground mode={bgMode} />

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

        <nav
          aria-label="Primary Navigation"
          className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4 no-scrollbar"
        >
          {SIDEBAR_SECTIONS.map((section) => {
            const sectionItems = NAV_ITEMS.filter((i) => i.section === section.id);
            return (
              <div key={section.id} className="space-y-1">
                {sidebarExpanded && (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {section.title}
                  </p>
                )}
                {sectionItems.map((item) => {
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
                      className={`flex w-full items-center rounded-lg py-2 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                        sidebarExpanded ? 'justify-between gap-2 px-3' : 'justify-center px-2'
                      } ${
                        active
                          ? 'bg-emerald-600/90 text-white shadow-sm shadow-emerald-950/50'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {sidebarExpanded && <span className="truncate">{item.label}</span>}
                      </span>
                      {sidebarExpanded && item.badge && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {sidebarExpanded ? (
          <>
            <div className="border-t border-slate-800/80 px-4 py-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  Live Background
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {BG_MODE_OPTIONS.find((m) => m.id === bgMode)?.label}
                </span>
              </div>
              <div
                role="group"
                aria-label="Live Background Style"
                className="mt-2 grid grid-cols-4 gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1"
              >
                {BG_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleChangeBgMode(opt.id)}
                    className={`rounded-md py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      bgMode === opt.id
                        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/40'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
            </div>
            {connectionSummary}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 border-t border-slate-800/80 py-4 font-mono text-[10px] text-slate-400">
            <button
              type="button"
              onClick={handleCycleBgMode}
              title={`Live Background: ${BG_MODE_OPTIONS.find((m) => m.id === bgMode)?.label} (click to switch)`}
              aria-label="Switch Live Background Mode"
              className="flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Layers className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-[9px] font-semibold">
                {BG_MODE_OPTIONS.find((m) => m.id === bgMode)?.short}
              </span>
            </button>
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
            <nav
              aria-label="Mobile Navigation"
              className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
            >
              {SIDEBAR_SECTIONS.map((section) => {
                const sectionItems = NAV_ITEMS.filter((i) => i.section === section.id);
                return (
                  <div key={section.id} className="space-y-1">
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {section.title}
                    </p>
                    {sectionItems.map((item) => {
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
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                            active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{item.label}</span>
                          </span>
                          {item.badge && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
            <div className="border-t border-slate-800/80 px-4 py-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  Live Background
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {BG_MODE_OPTIONS.find((m) => m.id === bgMode)?.label}
                </span>
              </div>
              <div
                role="group"
                aria-label="Mobile Live Background Style"
                className="mt-2 grid grid-cols-4 gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1"
              >
                {BG_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleChangeBgMode(opt.id)}
                    className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      bgMode === opt.id
                        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/40'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
            </div>
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
                  data-testid="header-whatsapp-badge"
                  className={`font-medium whitespace-nowrap shrink-0 ${
                    waDisplay.isHostLive || waDisplay.isRemoteLinked
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {waDisplay.isLocalConnected
                    ? 'WA Live'
                    : waDisplay.isRemoteLinked
                      ? waDisplay.remoteHostLabel
                        ? `WA Live · ${waDisplay.remoteHostLabel}`
                        : 'WA Live'
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

          {/* Zone 2: Well-Maintained Top Workspace Tabs (hidden when left sidebar is pinned open) */}
          {!sidebarPinned && (
            <nav
              aria-label="Dashboard Sections"
              className="hidden items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900/90 p-1 xl:flex"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
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
                      <span className="font-mono text-[10px] text-amber-300 tabular-nums">
                        ({orders.length})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Zone 3: Firebase Realtime Database Auto-Sync Status + Lock + Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (rtdbSyncState === 'error') {
                  handleReconnectRtdb();
                } else {
                  setActiveTab('setup');
                }
              }}
              title={
                rtdbSyncState === 'error'
                  ? `Firebase RTDB (${rtdbProjectMeta.projectId}) needs rules — click to retry`
                  : `Firebase Realtime DB Auto-Sync (${rtdbProjectMeta.projectId}) — no login needed`
              }
              aria-label="Firebase Realtime Database Sync Status"
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:px-3 ${
                rtdbSyncState === 'error'
                  ? 'border-rose-500/40 bg-rose-950/50 text-rose-200 hover:bg-rose-900/50'
                  : rtdbSyncState === 'synced'
                    ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/50'
                    : 'border-slate-700/80 bg-slate-900/85 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {rtdbSyncState === 'error' ? (
                <CloudOff className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
              ) : (
                <Cloud
                  className={`h-3.5 w-3.5 ${
                    rtdbSyncState === 'synced' ? 'text-emerald-400' : 'text-sky-400'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className="hidden md:inline">
                {rtdbSyncState === 'syncing'
                  ? 'RTDB Syncing...'
                  : rtdbSyncState === 'synced'
                    ? 'RTDB Live'
                    : rtdbSyncState === 'error'
                      ? 'Retry RTDB'
                      : 'RTDB Auto'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void handleLockDashboard()}
              title="Lock Dashboard"
              aria-label="Lock Dashboard"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/85 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 sm:px-3"
            >
              <Lock className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span className="hidden sm:inline">Lock</span>
            </button>
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
          </div>
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
            {rtdbError && (
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-950/45 px-4 py-3 text-xs text-rose-100 backdrop-blur-md sm:flex-row sm:items-center">
                <p className="leading-relaxed break-words">
                  <span className="font-semibold text-rose-200">
                    {rtdbPermissionDenied
                      ? 'Firebase Realtime Database Rules Required:'
                      : 'Firebase RTDB Sync Notice:'}
                  </span>{' '}
                  {rtdbError}
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {rtdbPermissionDenied && (
                    <>
                      <a
                        href={rtdbProjectMeta.rulesConsoleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 whitespace-nowrap"
                      >
                        Open RTDB Rules
                      </a>
                      <button
                        type="button"
                        onClick={() => setActiveTab('setup')}
                        className="rounded-lg border border-emerald-400/40 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-slate-800 whitespace-nowrap"
                      >
                        Copy Rules in Guide
                      </button>
                      <button
                        type="button"
                        onClick={handleReconnectRtdb}
                        className="rounded-lg border border-sky-400/40 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-slate-800 whitespace-nowrap"
                      >
                        Retry Sync
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setRtdbError(null)}
                    className="rounded-lg border border-rose-400/35 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-slate-800 whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {!isLoading &&
              rtdbSyncState === 'synced' &&
              cloudSummary.loaded &&
              !cloudSummary.hasShopify &&
              !isShopifyLinked && (
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-sky-500/35 bg-sky-950/35 px-4 py-3 text-xs text-sky-100 backdrop-blur-md sm:flex-row sm:items-center">
                  <p className="leading-relaxed">
                    <span className="font-semibold text-sky-200">
                      Firebase Realtime DB Live (Cloud Backup Empty Yet):
                    </span>{' '}
                    Open your active AI Studio / Railway dashboard once (it auto-uploads your Shopify store &amp; orders with zero login), or save your Shopify credentials below.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                  >
                    Configure Shopify
                  </button>
                </div>
              )}

            {!isLoading && whatsapp.isServerless && !cloudSyncEnabled && rtdbSyncState !== 'synced' && !upstashQuotaExceeded && (
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 backdrop-blur-md sm:flex-row sm:items-center">
                <p className="leading-relaxed">
                  <span className="font-semibold text-amber-100">Fresh Vercel Deploy Detected:</span> Publish the zero-login Firebase RTDB rule in <span className="font-semibold text-white">Guide</span> to auto-restore your Shopify store &amp; orders without signing in, or add <span className="font-mono text-amber-100">SHOPIFY_*</span> Env Vars in Vercel Settings.
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReconnectRtdb}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                  >
                    Retry RTDB Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('setup')}
                    className="rounded-lg border border-amber-400/40 bg-slate-900/80 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-slate-800 whitespace-nowrap"
                  >
                    Setup Guide
                  </button>
                </div>
              </div>
            )}

            {!isLoading &&
              !whatsapp.isServerless &&
              !waDisplay.isLinked &&
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
                onCancelInShopify={handleCancelOrderInShopify}
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
            ) : activeTab === 'pincode' ? (
              <PincodeCatalogView
                products={products}
                storefrontConfig={storefrontConfig}
                settings={settings}
                onProductsUpdated={setProducts}
                onStorefrontConfigUpdated={setStorefrontConfig}
              />
            ) : activeTab === 'seo' ? (
              <SeoManagerView
                products={products}
                storefrontConfig={storefrontConfig}
                geoSeoConfig={geoSeoConfig}
                settings={settings}
                onProductsUpdated={setProducts}
                onStorefrontConfigUpdated={setStorefrontConfig}
                onGeoSeoConfigUpdated={setGeoSeoConfig}
              />
            ) : activeTab === 'theme' ? (
              <ThemeStudioView
                storefrontConfig={storefrontConfig}
                settings={settings}
                onStorefrontConfigUpdated={setStorefrontConfig}
                onOpenPincodeCatalog={() => setActiveTab('pincode')}
                onOpenSeoManager={() => setActiveTab('seo')}
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
                upstashQuotaExceeded={upstashQuotaExceeded}
                whatsapp={whatsapp}
                rtdbSyncState={rtdbSyncState}
                cloudSummary={cloudSummary}
                onReconnectRtdb={handleReconnectRtdb}
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
          {(
            [
              { id: 'orders', label: 'Orders', icon: LayoutList },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
              { id: 'pincode', label: 'Pincode', icon: MapPin },
              { id: 'seo', label: 'SEO', icon: SearchCheck },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
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
                <span className="max-w-full truncate whitespace-nowrap leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="More pages"
            className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-medium transition-colors active:scale-95 ${
              activeTab === 'whatsapp' ||
              activeTab === 'theme' ||
              activeTab === 'settings' ||
              activeTab === 'setup'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-full truncate whitespace-nowrap leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
