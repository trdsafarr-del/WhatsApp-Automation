import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  buildShopifyLiquidSnippet,
  evaluateProductForPincode,
  INDIAN_PINCODE_PRESETS,
  normalizeIndianPincode,
  parsePincodeListInput,
} from '../lib/storefrontRules';
import type {
  AppSettings,
  DelhiveryServiceabilityResult,
  PincodeRuleMode,
  ProductCatalogItem,
  StorefrontConfig,
} from '../lib/types';

interface PincodeCatalogViewProps {
  products: ProductCatalogItem[];
  storefrontConfig: StorefrontConfig;
  settings: AppSettings;
  onProductsUpdated: (products: ProductCatalogItem[]) => void;
  onStorefrontConfigUpdated: (config: StorefrontConfig) => void;
}

interface PincodeCheckResponse {
  ok: boolean;
  pincode: string;
  delhivery: DelhiveryServiceabilityResult | null;
  products: Array<{
    productId: string;
    available: boolean;
    codAvailable: boolean;
    estimatedDays: number | null;
    reason: string;
  }>;
}

export function PincodeCatalogView({
  products,
  storefrontConfig,
  settings,
  onProductsUpdated,
  onStorefrontConfigUpdated,
}: PincodeCatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | PincodeRuleMode>('all');
  const [selectedId, setSelectedId] = useState<string | null>(products[0]?.id || null);

  // Live pincode simulator state
  const [testPincode, setTestPincode] = useState('400001');
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinCheckResult, setPinCheckResult] = useState<PincodeCheckResponse | null>(null);
  const [pinCheckError, setPinCheckError] = useState<string | null>(null);

  // Selected product rule editor state
  const [editMode, setEditMode] = useState<PincodeRuleMode>('all_india');
  const [editAllowedText, setEditAllowedText] = useState('');
  const [editBlockedText, setEditBlockedText] = useState('');
  const [editAllowCod, setEditAllowCod] = useState(true);
  const [editEstDays, setEditEstDays] = useState<string>('4');
  const [savingRule, setSavingRule] = useState(false);

  // Sync / sample / manual add state
  const [syncingShopify, setSyncingShopify] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('499');
  const [newType, setNewType] = useState('General');
  const [newPinMode, setNewPinMode] = useState<PincodeRuleMode>('all_india');
  const [newPinList, setNewPinList] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Storefront bridge settings state
  const [bridgeForm, setBridgeForm] = useState<StorefrontConfig>(storefrontConfig);
  const [savingBridge, setSavingBridge] = useState(false);
  const [installingScript, setInstallingScript] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    setBridgeForm(storefrontConfig);
  }, [storefrontConfig]);

  useEffect(() => {
    if (!selectedId && products.length > 0) {
      setSelectedId(products[0].id);
    } else if (selectedId && !products.some((p) => p.id === selectedId)) {
      setSelectedId(products[0]?.id || null);
    }
  }, [products, selectedId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setEditMode(selectedProduct.pincodeMode);
    setEditAllowedText(selectedProduct.allowedPincodes.join(', '));
    setEditBlockedText(selectedProduct.blockedPincodes.join(', '));
    setEditAllowCod(selectedProduct.allowCod);
    setEditEstDays(
      selectedProduct.estimatedDeliveryDays !== null
        ? String(selectedProduct.estimatedDeliveryDays)
        : String(storefrontConfig.defaultDeliveryDays || 4)
    );
  }, [selectedProduct, storefrontConfig.defaultDeliveryDays]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (modeFilter !== 'all' && p.pincodeMode !== modeFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.productType.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, modeFilter]);

  const stats = useMemo(() => {
    const allIndia = products.filter((p) => p.pincodeMode === 'all_india').length;
    const restricted = products.length - allIndia;
    return {
      total: products.length,
      allIndia,
      restricted,
    };
  }, [products]);

  const activeEvaluationMap = useMemo(() => {
    const map = new Map<
      string,
      { available: boolean; codAvailable: boolean; estimatedDays: number | null; reason: string }
    >();
    if (pinCheckResult?.products) {
      for (const item of pinCheckResult.products) {
        map.set(item.productId, item);
      }
    }
    return map;
  }, [pinCheckResult]);

  const parsedAllowedPreview = useMemo(
    () => parsePincodeListInput(editAllowedText),
    [editAllowedText]
  );
  const parsedBlockedPreview = useMemo(
    () => parsePincodeListInput(editBlockedText),
    [editBlockedText]
  );

  const appOrigin = useMemo(() => {
    if (bridgeForm.storefrontAppUrl.trim()) return bridgeForm.storefrontAppUrl.trim();
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://your-app.vercel.app';
  }, [bridgeForm.storefrontAppUrl]);

  const liquidSnippet = useMemo(() => buildShopifyLiquidSnippet(appOrigin), [appOrigin]);

  const handleSyncShopifyProducts = async () => {
    setSyncingShopify(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/products/sync-shopify', { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        importedCount?: number;
        totalCount?: number;
        products?: ProductCatalogItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatusBanner({
          ok: false,
          text: data.error || 'Could not sync Shopify products.',
        });
        return;
      }
      if (data.products) onProductsUpdated(data.products);
      setStatusBanner({
        ok: true,
        text: `Synced ${data.totalCount ?? 0} Shopify products (${data.importedCount ?? 0} newly imported).`,
      });
    } catch {
      setStatusBanner({ ok: false, text: 'Network error syncing Shopify products.' });
    } finally {
      setSyncingShopify(false);
    }
  };

  const handleLoadSamples = async () => {
    setLoadingSamples(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/products/load-samples', { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; products?: ProductCatalogItem[] };
      if (res.ok && data.products) {
        onProductsUpdated(data.products);
        setStatusBanner({
          ok: true,
          text: 'Loaded 3 sample products so you can test Pincode Filtering & SEO right away.',
        });
      }
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleRunPincodeCheck = async (pinOverride?: string) => {
    const cleanPin = normalizeIndianPincode(pinOverride ?? testPincode);
    if (!cleanPin) {
      setPinCheckError('Enter a valid 6-digit Indian pincode (e.g. 400001).');
      return;
    }
    if (pinOverride) setTestPincode(cleanPin);
    setCheckingPin(true);
    setPinCheckError(null);
    try {
      const res = await fetch(
        `/api/storefront/pincode-check?pincode=${encodeURIComponent(cleanPin)}`
      );
      const data = (await res.json()) as PincodeCheckResponse;
      if (res.ok && data.ok) {
        setPinCheckResult(data);
      } else {
        setPinCheckError('Failed to evaluate pincode availability.');
      }
    } catch {
      setPinCheckError('Network error checking pincode serviceability.');
    } finally {
      setCheckingPin(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSavingRule(true);
    setStatusBanner(null);
    try {
      const estNum = Number.parseInt(editEstDays, 10);
      const res = await fetch(`/api/products/${encodeURIComponent(selectedProduct.id)}/pincode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincodeMode: editMode,
          allowedPincodes: parsePincodeListInput(editAllowedText),
          blockedPincodes: parsePincodeListInput(editBlockedText),
          allowCod: editAllowCod,
          estimatedDeliveryDays: Number.isFinite(estNum) && estNum > 0 ? estNum : null,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        products?: ProductCatalogItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatusBanner({ ok: false, text: data.error || 'Failed to save pincode rule.' });
        return;
      }
      if (data.products) onProductsUpdated(data.products);
      setStatusBanner({
        ok: true,
        text: `Saved pincode availability rules for "${selectedProduct.title}".`,
      });
      if (pinCheckResult?.pincode) {
        void handleRunPincodeCheck(pinCheckResult.pincode);
      }
    } catch {
      setStatusBanner({ ok: false, text: 'Network error saving pincode rule.' });
    } finally {
      setSavingRule(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingProduct(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          price: newPrice.trim() || '499.00',
          productType: newType.trim() || 'General',
          pincodeMode: newPinMode,
          allowedPincodesText: newPinMode === 'allow_list' ? newPinList : '',
          blockedPincodesText: newPinMode === 'block_list' ? newPinList : '',
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        product?: ProductCatalogItem;
        products?: ProductCatalogItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatusBanner({ ok: false, text: data.error || 'Failed to add product.' });
        return;
      }
      if (data.products) onProductsUpdated(data.products);
      if (data.product) setSelectedId(data.product.id);
      setNewTitle('');
      setNewPinList('');
      setShowAddModal(false);
      setStatusBanner({ ok: true, text: `Added "${data.product?.title}" to Pincode Catalog.` });
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      const data = (await res.json()) as { products?: ProductCatalogItem[] };
      if (data.products) onProductsUpdated(data.products);
      setStatusBanner({ ok: true, text: `Removed "${title}" from local catalog.` });
    }
  };

  const handleSaveBridgeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBridge(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/storefront/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bridgeForm),
      });
      const data = (await res.json()) as { ok?: boolean; storefrontConfig?: StorefrontConfig };
      if (res.ok && data.storefrontConfig) {
        onStorefrontConfigUpdated(data.storefrontConfig);
        setStatusBanner({ ok: true, text: 'Storefront pincode widget settings saved.' });
      }
    } finally {
      setSavingBridge(false);
    }
  };

  const handleInstallScriptTag = async () => {
    setInstallingScript(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/storefront/install-shopify', { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        alreadyInstalled?: boolean;
        error?: string;
      };
      if (res.ok && data.ok) {
        setStatusBanner({
          ok: true,
          text: data.alreadyInstalled
            ? 'OrderPulse Pincode Widget ScriptTag is already active on your Shopify store!'
            : 'Installed OrderPulse Pincode Widget ScriptTag onto your Shopify storefront!',
        });
      } else {
        setStatusBanner({
          ok: false,
          text: data.error || 'Could not install ScriptTag — use the 1-line Liquid snippet below.',
        });
      }
    } finally {
      setInstallingScript(false);
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(liquidSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const appendPresetToRule = (pincodes: string[]) => {
    if (editMode === 'block_list') {
      const merged = Array.from(new Set([...parsePincodeListInput(editBlockedText), ...pincodes]));
      setEditBlockedText(merged.join(', '));
    } else {
      if (editMode === 'all_india') setEditMode('allow_list');
      const merged = Array.from(new Set([...parsePincodeListInput(editAllowedText), ...pincodes]));
      setEditAllowedText(merged.join(', '));
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md lg:flex-row lg:items-center sm:p-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-white sm:text-lg">
            Pincode-Based Product Catalog & Serviceability
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Control which products appear or allow checkout at each Indian pincode, synced with live Delhivery One checks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddModal((v) => !v)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            Add Product
          </button>
          <button
            type="button"
            disabled={loadingSamples}
            onClick={() => void handleLoadSamples()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            {loadingSamples ? 'Loading...' : 'Load Sample Catalog'}
          </button>
          <button
            type="button"
            disabled={syncingShopify}
            onClick={() => void handleSyncShopifyProducts()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncingShopify ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {syncingShopify ? 'Syncing...' : 'Sync Shopify Products'}
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs ${
            statusBanner.ok
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
        >
          {statusBanner.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          )}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Quick Add Product Drawer/Form */}
      {showAddModal && (
        <form
          onSubmit={handleCreateProduct}
          className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-4 backdrop-blur-md sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">
              Add Product to Pincode Catalog
            </h3>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs text-slate-300">
              Product Title
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Fresh Mango Cheesecake"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Price (INR)
              <input
                type="text"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="499"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Category / Type
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="Bakery"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Pincode Rule Mode
              <select
                value={newPinMode}
                onChange={(e) => setNewPinMode(e.target.value as PincodeRuleMode)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="all_india">All India</option>
                <option value="allow_list">Allowed Pincodes Only</option>
                <option value="block_list">Block Specific Pincodes</option>
              </select>
            </label>
          </div>
          {newPinMode !== 'all_india' && (
            <label className="mt-3 block text-xs text-slate-300">
              {newPinMode === 'allow_list'
                ? 'Allowed Pincodes (comma or space separated)'
                : 'Blocked Pincodes (comma or space separated)'}
              <input
                type="text"
                value={newPinList}
                onChange={(e) => setNewPinList(e.target.value)}
                placeholder="400001, 400050, 110001"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={creatingProduct}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {creatingProduct ? 'Adding...' : 'Save New Product'}
            </button>
          </div>
        </form>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Catalog Products
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {stats.total}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Synced + local items</p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            All-India Rules
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {stats.allIndia}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Deliverable pan-India</p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Zone Restricted
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-300 tabular-nums">
            {stats.restricted}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Allow-list / Block-list</p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Storefront Gate
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {bridgeForm.pincodeGateEnabled ? (
              <span className="text-emerald-400">Active</span>
            ) : (
              <span className="text-slate-400">Paused</span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {bridgeForm.hideUnavailableProducts ? 'Hiding unavailable items' : 'Showing badge'}
          </p>
        </div>
      </div>

      {/* Live Pincode Simulator */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="font-display text-sm font-semibold text-white">
                Live Storefront Pincode Simulator
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Test any 6-digit pincode to preview exactly which products show or hide for that customer
              {settings.delhiveryApiToken ? ' (live Delhivery One API check enabled).' : ' (catalog rules mode).'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                aria-label="Test 6-digit Indian pincode"
                value={testPincode}
                onChange={(e) => setTestPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="400001"
                className="w-28 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={checkingPin}
                onClick={() => void handleRunPincodeCheck()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 whitespace-nowrap"
              >
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                {checkingPin ? 'Checking...' : 'Simulate Customer View'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Quick test:</span>
              {['400001', '110001', '700001', '190001'].map((pin) => (
                <button
                  key={pin}
                  type="button"
                  onClick={() => void handleRunPincodeCheck(pin)}
                  className="rounded-md border border-slate-700/80 bg-slate-800/70 px-2 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-600 hover:text-white"
                >
                  {pin}
                </button>
              ))}
            </div>
          </div>
        </div>

        {pinCheckError && (
          <p className="mt-3 text-xs text-rose-300">{pinCheckError}</p>
        )}

        {pinCheckResult && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-white">
                PIN {pinCheckResult.pincode}
              </span>
              {pinCheckResult.delhivery?.city && (
                <span className="text-slate-300">
                  · {pinCheckResult.delhivery.city}, {pinCheckResult.delhivery.state}
                </span>
              )}
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  pinCheckResult.delhivery?.serviceable === false
                    ? 'bg-rose-500/20 text-rose-200'
                    : 'bg-emerald-500/20 text-emerald-200'
                }`}
              >
                {pinCheckResult.delhivery?.source === 'delhivery_api'
                  ? pinCheckResult.delhivery.serviceable
                    ? `Delhivery Serviceable · ${pinCheckResult.delhivery.codAvailable ? 'COD + Prepaid' : 'Prepaid Only'}`
                    : 'Unserviceable by Delhivery'
                  : 'Evaluated by Catalog Rules'}
              </span>
            </div>
            <div className="font-mono text-slate-300 tabular-nums">
              {pinCheckResult.products.filter((p) => p.available).length} visible /{' '}
              {pinCheckResult.products.filter((p) => !p.available).length} hidden
            </div>
          </div>
        )}
      </div>

      {/* Main Split Workspace: Product List + Rule Editor */}
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-500" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-semibold text-white">
            No Products Loaded Yet
          </h3>
          <p className="mx-auto mt-1 max-w-lg text-xs text-slate-400">
            Click <strong className="text-slate-200">Sync Shopify Products</strong> to import your live catalog (requires{' '}
            <code className="font-mono text-emerald-300">read_products</code> scope), or click{' '}
            <strong className="text-slate-200">Load Sample Catalog</strong> to test pincode filtering immediately.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleSyncShopifyProducts()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Sync Shopify Products
            </button>
            <button
              type="button"
              onClick={() => void handleLoadSamples()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              Load Sample Catalog
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left: Product List */}
          <div className="space-y-3 lg:col-span-5">
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3 backdrop-blur-md">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    aria-label="Search products for pincode rules"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2 pr-3 pl-8 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <select
                  aria-label="Filter by pincode rule mode"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value as 'all' | PincodeRuleMode)}
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">All Rules ({products.length})</option>
                  <option value="all_india">All India</option>
                  <option value="allow_list">Allowed Only</option>
                  <option value="block_list">Blocked List</option>
                </select>
              </div>
            </div>

            <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isSelected = p.id === selectedId;
                const evalInfo = activeEvaluationMap.get(p.id);
                const ruleBadge =
                  p.pincodeMode === 'allow_list'
                    ? `${p.allowedPincodes.length} Allowed PINs`
                    : p.pincodeMode === 'block_list'
                      ? `${p.blockedPincodes.length} Blocked PINs`
                      : 'All India';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'border-emerald-500/70 bg-emerald-950/30 shadow-sm'
                        : 'border-slate-800/90 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{p.title}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                          /products/{p.handle} · {p.currency} {p.price}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
                          p.pincodeMode === 'allow_list'
                            ? 'bg-amber-500/20 text-amber-200'
                            : p.pincodeMode === 'block_list'
                              ? 'bg-sky-500/20 text-sky-200'
                              : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {ruleBadge}
                      </span>
                    </div>

                    {evalInfo && (
                      <div
                        className={`mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] ${
                          evalInfo.available
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : 'bg-rose-500/15 text-rose-200'
                        }`}
                      >
                        {evalInfo.available ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">{evalInfo.reason}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Rule Editor */}
          <div className="lg:col-span-7">
            {selectedProduct ? (
              <form
                onSubmit={handleSaveRule}
                className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">
                      {selectedProduct.title}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      ID: {selectedProduct.shopifyProductId} · {selectedProduct.productType || 'Product'}
                    </p>
                  </div>
                  {!/^\d+$/.test(selectedProduct.shopifyProductId) && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteProduct(selectedProduct.id, selectedProduct.title)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>

                {/* Rule Mode Selector */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-300">Availability Rule Mode</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        {
                          id: 'all_india',
                          title: 'All India',
                          desc: 'Visible & purchasable on every serviceable pincode',
                        },
                        {
                          id: 'allow_list',
                          title: 'Allowed Pincodes Only',
                          desc: 'Show ONLY in selected pincodes (great for fresh/local items)',
                        },
                        {
                          id: 'block_list',
                          title: 'Block Specific Pincodes',
                          desc: 'Available everywhere EXCEPT blocked remote/ODA pincodes',
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditMode(opt.id)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          editMode === opt.id
                            ? 'border-emerald-500 bg-emerald-500/15 text-white'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <p className="text-xs font-semibold">{opt.title}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {editMode !== 'all_india' && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="pincode-rule-textarea"
                        className="text-xs font-medium text-slate-300"
                      >
                        {editMode === 'allow_list'
                          ? `Allowed Pincodes (${parsedAllowedPreview.length} valid 6-digit PINs)`
                          : `Blocked Pincodes (${parsedBlockedPreview.length} valid 6-digit PINs)`}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {INDIAN_PINCODE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => appendPresetToRule(preset.pincodes)}
                            className="rounded border border-slate-700 bg-slate-800/90 px-2 py-1 text-[10px] font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-200"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      id="pincode-rule-textarea"
                      rows={4}
                      value={editMode === 'allow_list' ? editAllowedText : editBlockedText}
                      onChange={(e) =>
                        editMode === 'allow_list'
                          ? setEditAllowedText(e.target.value)
                          : setEditBlockedText(e.target.value)
                      }
                      placeholder="Paste 6-digit Indian pincodes separated by comma, space, or newline (e.g. 400001, 400050, 110001)"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-200">
                    <span>Allow COD for this product</span>
                    <input
                      type="checkbox"
                      checked={editAllowCod}
                      onChange={(e) => setEditAllowCod(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </label>
                  <label className="block rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-xs text-slate-300">
                    Estimated Dispatch / Delivery Days
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={editEstDays}
                      onChange={(e) => setEditEstDays(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                </div>

                {/* Live Rule Preview for active test pincode */}
                {normalizeIndianPincode(testPincode) && (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/75 p-3 text-xs">
                    <span className="font-semibold text-slate-300">
                      Instant Rule Preview for PIN {normalizeIndianPincode(testPincode)}:
                    </span>{' '}
                    {(() => {
                      const preview = evaluateProductForPincode(
                        {
                          ...selectedProduct,
                          pincodeMode: editMode,
                          allowedPincodes: parsedAllowedPreview,
                          blockedPincodes: parsedBlockedPreview,
                          allowCod: editAllowCod,
                          estimatedDeliveryDays: Number.parseInt(editEstDays, 10) || null,
                        },
                        testPincode,
                        bridgeForm
                      );
                      return (
                        <span className={preview.available ? 'text-emerald-300' : 'text-rose-300'}>
                          {preview.available ? 'AVAILABLE — ' : 'HIDDEN / BLOCKED — '}
                          {preview.reason}
                        </span>
                      );
                    })()}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingRule}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    {savingRule ? 'Saving...' : 'Save Pincode Rule'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* Storefront Bridge Config & 1-Line Shopify Snippet */}
      <form
        onSubmit={handleSaveBridgeConfig}
        className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-md sm:p-5"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <h3 className="font-display text-sm font-semibold text-white">
                Live Shopify Storefront Bridge (Auto-Filter & Delivery Bar)
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Connects your live Shopify website to this dashboard so unavailable products automatically hide or block Add-to-Cart based on customer pincode.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={installingScript}
              onClick={() => void handleInstallScriptTag()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${installingScript ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {installingScript ? 'Installing...' : '1-Click Shopify ScriptTag Install'}
            </button>
            <button
              type="submit"
              disabled={savingBridge}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {savingBridge ? 'Saving...' : 'Save Widget Settings'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-200">
            <span>Enable Pincode Bar on Storefront</span>
            <input
              type="checkbox"
              checked={bridgeForm.pincodeGateEnabled}
              onChange={(e) =>
                setBridgeForm((prev) => ({ ...prev, pincodeGateEnabled: e.target.checked }))
              }
              className="h-4 w-4 accent-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-200">
            <span>Hide Unavailable Cards Completely</span>
            <input
              type="checkbox"
              checked={bridgeForm.hideUnavailableProducts}
              onChange={(e) =>
                setBridgeForm((prev) => ({ ...prev, hideUnavailableProducts: e.target.checked }))
              }
              className="h-4 w-4 accent-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-200">
            <span>Show Delivery ETA on Product Page</span>
            <input
              type="checkbox"
              checked={bridgeForm.showDeliveryEstimateOnPdp}
              onChange={(e) =>
                setBridgeForm((prev) => ({ ...prev, showDeliveryEstimateOnPdp: e.target.checked }))
              }
              className="h-4 w-4 accent-emerald-500"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs text-slate-300">
            Pincode Bar Prompt Text
            <input
              type="text"
              value={bridgeForm.pincodePromptTitle}
              onChange={(e) =>
                setBridgeForm((prev) => ({ ...prev, pincodePromptTitle: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Unavailable Badge Text (when not hidden)
            <input
              type="text"
              value={bridgeForm.unavailableBadgeText}
              onChange={(e) =>
                setBridgeForm((prev) => ({ ...prev, unavailableBadgeText: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Public App URL (for live store script)
            <input
              type="url"
              value={bridgeForm.storefrontAppUrl}
              onChange={(e) =>
                setBridgeForm((prev) => ({ ...prev, storefrontAppUrl: e.target.value }))
              }
              placeholder={typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Liquid Snippet Box */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/90 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>
                1-Time Shopify Theme Snippet (Online Store → Themes → Edit Code → snippets/orderpulse-bridge.liquid)
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleCopySnippet()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
            >
              {copiedSnippet ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  Copy Liquid Snippet
                </>
              )}
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800/80 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
            {liquidSnippet}
          </pre>
        </div>
      </form>
    </div>
  );
}
