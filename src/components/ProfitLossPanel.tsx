import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  IndianRupee,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
} from 'lucide-react';
import {
  buildProfitLossReport,
  calculateUnitEconomicsSimulation,
  DEFAULT_META_ADS_RATE_HISTORY,
  getIstDateKey,
  normalizeMetaAdsRateHistory,
  type CostAssumptions,
  type PnlOutcomeCategory,
} from '../lib/orderRules';
import type { AppSettings, MetaAdsRateEntry, OrderRecord } from '../lib/types';

interface ProfitLossPanelProps {
  orders: OrderRecord[];
  settings: AppSettings;
  periodLabel: string;
  costForm: CostAssumptions;
  periodAdSpend: number;
  adDaysCount?: number;
  autoAdDays?: number;
  metaAdDateKeys?: string[];
  isAdDaysOverridden?: boolean;
  costDirty: boolean;
  isSavingCosts: boolean;
  costNotice: string | null;
  onUpdateCostField: (key: keyof CostAssumptions, rawVal: string) => void;
  onUpdateMetaAdsRateHistory?: (nextHistory: MetaAdsRateEntry[]) => void;
  onUpdatePeriodAdSpend: (rawVal: string) => void;
  onUpdateAdDays?: (days: number) => void;
  onResetAdDays?: () => void;
  onSaveCostRules: () => Promise<void>;
  onExportPnlPdf?: () => void;
  onExportMonthlyExcel?: () => void;
  onSyncDelhivery: () => Promise<{
    ok: boolean;
    trackedCount?: number;
    chargesUpdatedCount?: number;
    warning?: string;
    error?: string;
  }>;
  onImportDelhiveryCsv?: (csvText: string) => Promise<{
    ok: boolean;
    updatedCount?: number;
    parsedCount?: number;
    error?: string;
  }>;
  onOpenDelhiverySettings: () => void;
  onInspectOrder: (orderId: string) => void;
}

function formatInr(amount: number, currency = 'INR'): string {
  const prefix = currency === 'INR' ? '₹' : `${currency} `;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('en-IN');
  return amount < 0 ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
}

export function ProfitLossPanel({
  orders,
  settings,
  periodLabel,
  costForm,
  periodAdSpend,
  adDaysCount,
  autoAdDays,
  metaAdDateKeys,
  isAdDaysOverridden,
  costDirty,
  isSavingCosts,
  costNotice,
  onUpdateCostField,
  onUpdateMetaAdsRateHistory,
  onUpdatePeriodAdSpend,
  onUpdateAdDays,
  onResetAdDays,
  onSaveCostRules,
  onExportPnlPdf,
  onExportMonthlyExcel,
  onSyncDelhivery,
  onImportDelhiveryCsv,
  onOpenDelhiverySettings,
  onInspectOrder,
}: ProfitLossPanelProps) {
  const [isSyncingDelhivery, setIsSyncingDelhivery] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [delhiveryStatus, setDelhiveryStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | PnlOutcomeCategory>('all');
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showFallbackRates, setShowFallbackRates] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const [simInput, setSimInput] = useState({
    sellingPrice: 1050,
    cogsCost: Math.round(1050 * ((costForm.cogsPercent || 35) / 100)),
    forwardShipping: costForm.fallbackForwardShippingCost || 120,
    rtoShipping: costForm.fallbackRtoShippingCost || 110,
    packagingCost: costForm.packagingCostPerOrder || 25,
    paymentOrCodFee: costForm.fallbackCodFee || 47,
    adSpendPerOrder: costForm.marketingCostPerOrder || 0,
    expectedRtoPercent: 15,
  });

  const pnl = useMemo(
    () => buildProfitLossReport(orders, costForm, periodAdSpend, adDaysCount, metaAdDateKeys),
    [orders, costForm, periodAdSpend, adDaysCount, metaAdDateKeys]
  );

  const activeMetaHistory = useMemo(
    () =>
      normalizeMetaAdsRateHistory(
        costForm.metaAdsRateHistory && costForm.metaAdsRateHistory.length > 0
          ? costForm.metaAdsRateHistory
          : DEFAULT_META_ADS_RATE_HISTORY
      ),
    [costForm.metaAdsRateHistory]
  );

  const simResult = useMemo(() => calculateUnitEconomicsSimulation(simInput), [simInput]);

  const handleLoadStoreAverages = () => {
    const shipped = pnl.orderRows.filter(
      (r) => r.outcome === 'delivered' || r.outcome === 'in_transit' || r.outcome === 'rto_return'
    );
    const count = shipped.length;
    if (count === 0) return;
    const avgSp = Math.round(shipped.reduce((s, r) => s + r.orderValue, 0) / count);
    const avgFwd = Math.round(shipped.reduce((s, r) => s + r.forwardShippingCost, 0) / count);
    const rtoShipped = shipped.filter((r) => r.rtoShippingCost > 0);
    const avgRto =
      rtoShipped.length > 0
        ? Math.round(rtoShipped.reduce((s, r) => s + r.rtoShippingCost, 0) / rtoShipped.length)
        : Math.round(avgFwd * 0.9);
    const avgFee = Math.round(shipped.reduce((s, r) => s + r.paymentOrCodFee, 0) / count);
    const observedRtoPct = Math.round((pnl.rtoCount / count) * 100);
    const estimatedCpaPerOrder =
      pnl.totalMarketingCost > 0
        ? Math.round(pnl.totalMarketingCost / Math.max(1, count))
        : costForm.marketingCostPerOrder || 0;
    setSimInput({
      sellingPrice: avgSp || 1050,
      cogsCost: Math.round((avgSp || 1050) * ((costForm.cogsPercent || 35) / 100)),
      forwardShipping: avgFwd || costForm.fallbackForwardShippingCost || 120,
      rtoShipping: avgRto || costForm.fallbackRtoShippingCost || 110,
      packagingCost: costForm.packagingCostPerOrder || 25,
      paymentOrCodFee: avgFee || 25,
      adSpendPerOrder: estimatedCpaPerOrder,
      expectedRtoPercent: observedRtoPct > 0 ? observedRtoPct : 15,
    });
  };

  const filteredOrderRows = useMemo(() => {
    if (outcomeFilter === 'all') return pnl.orderRows;
    return pnl.orderRows.filter((row) => row.outcome === outcomeFilter);
  }, [pnl.orderRows, outcomeFilter]);

  const handleSyncDelhivery = async () => {
    setIsSyncingDelhivery(true);
    setDelhiveryStatus(null);
    const res = await onSyncDelhivery();
    setIsSyncingDelhivery(false);
    setDelhiveryStatus({
      ok: res.ok,
      message: res.ok
        ? `Delhivery One synced: ${res.trackedCount ?? 0} AWBs tracked, ${res.chargesUpdatedCount ?? 0} parcel charges fetched.${res.warning ? ` Note: ${res.warning}` : ''}`
        : res.error || 'Could not sync Delhivery One.',
    });
  };

  const handleImportCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImportDelhiveryCsv) return;
    setIsImportingCsv(true);
    setDelhiveryStatus(null);
    try {
      const text = await file.text();
      const res = await onImportDelhiveryCsv(text);
      setDelhiveryStatus({
        ok: res.ok,
        message: res.ok
          ? `Delhivery Wallet CSV imported: ${res.updatedCount ?? 0} orders locked to exact billed charges (${res.parsedCount ?? 0} rows read).`
          : res.error || 'Could not import Delhivery Wallet CSV.',
      });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const hasDelhiveryToken = Boolean(settings.delhiveryApiToken?.trim());
  const isProfitPositive = pnl.netRealizedProfit >= 0;

  // Waterfall bar breakdown (normalized to max(realizedRevenue, totalRealizedCosts, 1))
  const waterfallMax = Math.max(
    pnl.realizedRevenue,
    pnl.totalRealizedCosts,
    Math.abs(pnl.netRealizedProfit),
    1
  );

  const waterfallSteps = [
    {
      label: 'Delivered Revenue',
      amount: pnl.realizedRevenue,
      colorClass: 'bg-emerald-500',
      textClass: 'text-emerald-300',
      sign: '+',
    },
    {
      label: `Product COGS (${costForm.cogsPercent}%)`,
      amount: pnl.totalCogs,
      colorClass: 'bg-amber-400',
      textClass: 'text-amber-200',
      sign: '-',
    },
    {
      label: 'Forward Shipping',
      amount: pnl.totalForwardShipping,
      colorClass: 'bg-sky-400',
      textClass: 'text-sky-300',
      sign: '-',
    },
    {
      label: 'RTO Return Freight',
      amount: pnl.totalRtoShippingCost,
      colorClass: 'bg-rose-500',
      textClass: 'text-rose-300',
      sign: '-',
    },
    {
      label: 'Packaging & Boxes',
      amount: pnl.totalPackagingCost,
      colorClass: 'bg-indigo-400',
      textClass: 'text-indigo-300',
      sign: '-',
    },
    {
      label: 'COD & Gateway Fees',
      amount: pnl.totalPaymentFees,
      colorClass: 'bg-cyan-400',
      textClass: 'text-cyan-300',
      sign: '-',
    },
    {
      label:
        pnl.metaAdsBreakdownLabel
          ? `Meta Ads & Marketing (${pnl.metaAdsBreakdownLabel})`
          : pnl.dailyMetaAdsRate > 0
            ? `Meta Ads & Marketing (${pnl.metaAdDaysCount}d × ₹${pnl.dailyMetaAdsRate}/d)`
            : 'Marketing / Ad Spend',
      amount: pnl.totalMarketingCost,
      colorClass: 'bg-orange-400',
      textClass: 'text-orange-300',
      sign: '-',
    },
  ];

  // Daily chart data (chronological order left-to-right, up to 14 days)
  const chartDays = useMemo(
    () => [...pnl.dailyPnlRows].reverse().slice(-14),
    [pnl.dailyPnlRows]
  );
  const chartMaxVal = useMemo(() => {
    let maxV = 1;
    for (const d of chartDays) {
      maxV = Math.max(maxV, d.realizedRevenue, d.expectedTransitRevenue, d.totalCosts);
    }
    return maxV;
  }, [chartDays]);

  // Cost & Margin Donut Chart slices
  const donutMetrics = useMemo(() => {
    const rawSlices = [
      { label: 'Product COGS', value: pnl.totalCogs, stroke: '#fbbf24', dotClass: 'bg-amber-400', textClass: 'text-amber-300' },
      { label: 'Forward Shipping', value: pnl.totalForwardShipping, stroke: '#38bdf8', dotClass: 'bg-sky-400', textClass: 'text-sky-300' },
      { label: 'RTO Freight', value: pnl.totalRtoShippingCost, stroke: '#f43f5e', dotClass: 'bg-rose-500', textClass: 'text-rose-300' },
      { label: 'Packaging', value: pnl.totalPackagingCost, stroke: '#818cf8', dotClass: 'bg-indigo-400', textClass: 'text-indigo-300' },
      { label: 'COD / PG Fees', value: pnl.totalPaymentFees, stroke: '#22d3ee', dotClass: 'bg-cyan-400', textClass: 'text-cyan-300' },
      { label: 'Marketing / Ads', value: pnl.totalMarketingCost, stroke: '#fb923c', dotClass: 'bg-orange-400', textClass: 'text-orange-300' },
      {
        label: 'Net Profit Retained',
        value: Math.max(0, pnl.netRealizedProfit),
        stroke: '#10b981',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-300',
      },
    ].filter((s) => s.value > 0);

    const total = rawSlices.reduce((s, x) => s + x.value, 0);
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    const arcs = rawSlices.map((s) => {
      const pct = total > 0 ? s.value / total : 0;
      const dashLen = pct * circumference;
      const dashOffset = -offsetAcc;
      offsetAcc += dashLen;
      return {
        ...s,
        pctLabel: Math.round(pct * 100),
        dashArray: `${dashLen} ${circumference}`,
        dashOffset,
      };
    });

    return { total, radius, circumference, arcs };
  }, [pnl]);

  // COD vs Prepaid Profitability Split
  const modeSplit = useMemo(() => {
    const init = {
      count: 0,
      delivered: 0,
      inTransit: 0,
      rto: 0,
      cancelled: 0,
      revenue: 0,
      shippingAndFee: 0,
      netRealized: 0,
      projectedProfit: 0,
    };
    const cod = { ...init };
    const prepaid = { ...init };

    for (const r of pnl.orderRows) {
      const bucket = r.paymentMethod === 'COD' ? cod : prepaid;
      bucket.count += 1;
      if (r.outcome === 'delivered') {
        bucket.delivered += 1;
        bucket.revenue += r.realizedRevenue;
        bucket.shippingAndFee += r.forwardShippingCost + r.paymentOrCodFee;
        bucket.netRealized += r.netProfit;
        bucket.projectedProfit += r.netProfit;
      } else if (r.outcome === 'rto_return') {
        bucket.rto += 1;
        bucket.shippingAndFee += r.forwardShippingCost + r.rtoShippingCost;
        bucket.netRealized += r.netProfit;
        bucket.projectedProfit += r.netProfit;
      } else if (r.outcome === 'in_transit') {
        bucket.inTransit += 1;
        bucket.shippingAndFee += r.forwardShippingCost + r.paymentOrCodFee;
        bucket.projectedProfit += r.netProfit;
      } else if (r.outcome === 'cancelled') {
        bucket.cancelled += 1;
      }
    }
    return { cod, prepaid };
  }, [pnl.orderRows]);

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="profit-loss-panel">
      {/* Delhivery One Integration & Unit Economics Bar */}
      <section className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">
                Delhivery One Courier Costs &amp; Unit Economics · {periodLabel}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {hasDelhiveryToken
                ? `Delhivery One connected (${pnl.delhiverySyncedCount}/${pnl.totalOrders} orders using Delhivery manifested weights & rate-card tariff incl. 18% GST). Upload Wallet Passbook CSV for exact rupee reconciliation.`
                : 'Connect Delhivery One API Token or upload Wallet Passbook CSV to pull exact per-parcel freight, COD & RTO charges automatically.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onExportMonthlyExcel && (
              <button
                type="button"
                onClick={onExportMonthlyExcel}
                disabled={orders.length === 0}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/12 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20 disabled:opacity-50 whitespace-nowrap"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                Export Excel (.xlsx)
              </button>
            )}

            {onExportPnlPdf && (
              <button
                type="button"
                onClick={onExportPnlPdf}
                disabled={orders.length === 0}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
              >
                <FileDown className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                Export P&amp;L PDF
              </button>
            )}

            {onImportDelhiveryCsv && (
              <>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void handleImportCsvChange(e)}
                />
                <button
                  type="button"
                  disabled={isImportingCsv}
                  onClick={() => csvInputRef.current?.click()}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  {isImportingCsv ? 'Importing CSV...' : 'Import Wallet CSV'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowSimulator((prev) => !prev)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                showSimulator
                  ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-200'
                  : 'border-slate-700 bg-slate-950/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calculator className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
              Margin Calculator
            </button>

            <button
              type="button"
              aria-expanded={showAssumptions}
              onClick={() => setShowAssumptions((prev) => !prev)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                showAssumptions
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-700 bg-slate-950/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cost Inputs{costDirty ? ' •' : ''}</span>
              {showAssumptions ? (
                <ChevronDown className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              )}
            </button>

            {hasDelhiveryToken ? (
              <button
                type="button"
                disabled={isSyncingDelhivery}
                onClick={() => void handleSyncDelhivery()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncingDelhivery ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {isSyncingDelhivery ? 'Fetching Delhivery...' : 'Sync Delhivery One'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenDelhiverySettings}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap"
              >
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                Connect Delhivery One
              </button>
            )}
          </div>
        </div>

        {delhiveryStatus && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
              delhiveryStatus.ok
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/35 bg-rose-500/10 text-rose-200'
            }`}
          >
            {delhiveryStatus.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            )}
            <span>{delhiveryStatus.message}</span>
          </div>
        )}

        {showSimulator && (
          <div className="mt-4 space-y-3 border-t border-slate-800 pt-4" data-testid="unit-margin-simulator">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-white">
                  What-If Order Margin &amp; Breakeven Calculator
                </h4>
                <p className="text-[11px] text-slate-400">
                  Calculate profit per order, max Meta/Google CPA breakeven, and safe RTO % limit before running ads.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadStoreAverages}
                disabled={pnl.totalOrders === 0}
                className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                Load Store Averages
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {(
                [
                  { key: 'sellingPrice', label: 'Selling Price ₹' },
                  { key: 'cogsCost', label: 'Product Cost ₹' },
                  { key: 'forwardShipping', label: 'Fwd Ship ₹' },
                  { key: 'rtoShipping', label: 'RTO Return ₹' },
                  { key: 'packagingCost', label: 'Packaging ₹' },
                  { key: 'paymentOrCodFee', label: 'COD/PG Fee ₹' },
                  { key: 'adSpendPerOrder', label: 'Ad Spend ₹/Ord' },
                  { key: 'expectedRtoPercent', label: 'Expected RTO %' },
                ] as const
              ).map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[11px] font-medium text-slate-300">{field.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={field.key === 'expectedRtoPercent' ? 100 : undefined}
                    value={simInput[field.key]}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      setSimInput((prev) => ({
                        ...prev,
                        [field.key]: Number.isFinite(v) && v >= 0 ? v : 0,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-indigo-400 focus:outline-none tabular-nums"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-slate-800/80 pt-3 sm:grid-cols-5">
              <div>
                <p className="text-[11px] text-slate-400">Profit if Delivered</p>
                <p
                  className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                    simResult.profitIfDelivered >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatInr(simResult.profitIfDelivered, pnl.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Loss if RTO</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-rose-400 tabular-nums">
                  {formatInr(simResult.lossIfRto, pnl.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">
                  Blended Profit ({simInput.expectedRtoPercent}% RTO)
                </p>
                <p
                  className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                    simResult.blendedProfitPerOrder >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}
                >
                  {formatInr(simResult.blendedProfitPerOrder, pnl.currency)} ({simResult.marginPercent}%)
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Max CPA Breakeven</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-cyan-300 tabular-nums">
                  {formatInr(simResult.maxCpaBreakeven, pnl.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Safe RTO % Limit</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-amber-300 tabular-nums">
                  {simResult.breakevenRtoPercent}%
                </p>
              </div>
            </div>
          </div>
        )}

        {!showAssumptions && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
              <span>
                COGS <strong className="text-slate-200">{costForm.cogsPercent}%</strong>
              </span>
              <span>
                Pack <strong className="text-slate-200">{formatInr(costForm.packagingCostPerOrder, pnl.currency)}</strong>
              </span>
              <span className="text-orange-300">
                Meta Ads{' '}
                <strong>
                  {pnl.metaAdsBreakdownLabel
                    ? `${pnl.metaAdsBreakdownLabel} = ${formatInr(pnl.totalDailyMetaAds, pnl.currency)}`
                    : `${formatInr(pnl.dailyMetaAdsRate, pnl.currency)}/d × ${pnl.metaAdDaysCount}d = ${formatInr(pnl.totalDailyMetaAds, pnl.currency)}`}
                </strong>
              </span>
              <span>
                Prepaid PG <strong className="text-slate-200">{costForm.prepaidGatewayPercent}%</strong>
              </span>
              {periodAdSpend > 0 && (
                <span>
                  Extra <strong className="text-slate-200">{formatInr(periodAdSpend, pnl.currency)}</strong>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAssumptions(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 hover:text-emerald-200"
            >
              Edit Cost Rules
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {showAssumptions && (
          <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Product COGS %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={costForm.cogsPercent}
                  onChange={(e) => onUpdateCostField('cogsPercent', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Packaging ₹/Order</span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={costForm.packagingCostPerOrder}
                  onChange={(e) => onUpdateCostField('packagingCostPerOrder', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-orange-300">Current Meta Ads ₹/Day</span>
                <input
                  type="number"
                  min={0}
                  step="50"
                  value={costForm.dailyMetaAdsSpend ?? 1500}
                  onChange={(e) => onUpdateCostField('dailyMetaAdsSpend', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-orange-500/40 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-orange-400 focus:outline-none tabular-nums"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-1 text-[11px] font-medium text-orange-200">
                  <span>Meta Ad Days</span>
                  {isAdDaysOverridden && onResetAdDays ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onResetAdDays();
                      }}
                      className="text-[10px] font-normal text-cyan-300 underline hover:text-cyan-200"
                    >
                      Auto ({autoAdDays ?? pnl.metaAdDaysCount})
                    </button>
                  ) : (
                    <span className="text-[10px] font-normal text-slate-400">Auto</span>
                  )}
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={adDaysCount ?? pnl.metaAdDaysCount}
                  onChange={(e) => {
                    if (!onUpdateAdDays) return;
                    const parsed = Number.parseInt(e.target.value, 10);
                    onUpdateAdDays(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
                  }}
                  className="mt-1 w-full rounded-lg border border-orange-500/40 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-orange-400 focus:outline-none tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Ad Cost ₹/Order</span>
                <input
                  type="number"
                  min={0}
                  step="5"
                  value={costForm.marketingCostPerOrder}
                  onChange={(e) => onUpdateCostField('marketingCostPerOrder', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Extra Ad / Overhead ₹</span>
                <input
                  type="number"
                  min={0}
                  step="50"
                  value={periodAdSpend}
                  onChange={(e) => onUpdatePeriodAdSpend(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </label>
            </div>

            {onUpdateMetaAdsRateHistory && (
              <div className="rounded-lg border border-orange-500/25 bg-slate-950/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-orange-200">
                      Date-Wise Meta Ads Daily Spend History
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Past days stay locked at their old budget (₹500 → ₹900) while new dates use ₹1,500/day automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const todayKey = getIstDateKey(new Date()) || '2026-11-19';
                      const nextDate = activeMetaHistory.some((r) => r.effectiveFrom === todayKey)
                        ? `${todayKey.slice(0, 8)}${String(
                            Math.min(28, Number.parseInt(todayKey.slice(8, 10), 10) + 1)
                          ).padStart(2, '0')}`
                        : todayKey;
                      onUpdateMetaAdsRateHistory([
                        ...activeMetaHistory,
                        { effectiveFrom: nextDate, dailySpend: costForm.dailyMetaAdsSpend ?? 1500 },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-orange-500/35 bg-orange-500/15 px-2.5 py-1 text-[11px] font-medium text-orange-200 hover:bg-orange-500/25"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Add Rate Change
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {activeMetaHistory.map((tier, idx) => (
                    <div
                      key={`${tier.effectiveFrom}-${idx}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5"
                    >
                      <input
                        type="date"
                        aria-label={`Meta Ads tier ${idx + 1} start date`}
                        value={tier.effectiveFrom}
                        onChange={(e) => {
                          const next = activeMetaHistory.map((item, i) =>
                            i === idx ? { ...item, effectiveFrom: e.target.value } : item
                          );
                          onUpdateMetaAdsRateHistory(next);
                        }}
                        className="w-32 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 font-mono text-[11px] text-slate-200 focus:border-orange-400 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-500">₹</span>
                      <input
                        type="number"
                        min={0}
                        step="50"
                        aria-label={`Meta Ads tier ${idx + 1} daily spend`}
                        value={tier.dailySpend}
                        onChange={(e) => {
                          const parsed = Number.parseFloat(e.target.value);
                          const next = activeMetaHistory.map((item, i) =>
                            i === idx
                              ? { ...item, dailySpend: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 }
                              : item
                          );
                          onUpdateMetaAdsRateHistory(next);
                        }}
                        className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-orange-200 focus:border-orange-400 focus:outline-none tabular-nums"
                      />
                      {activeMetaHistory.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove Meta Ads tier ${tier.effectiveFrom}`}
                          onClick={() => {
                            const next = activeMetaHistory.filter((_, i) => i !== idx);
                            onUpdateMetaAdsRateHistory(next);
                          }}
                          className="ml-auto rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pnl.totalDailyMetaAds > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/25 bg-orange-500/8 px-3 py-2 text-xs">
                <span className="text-orange-200">
                  Daily Meta Ads Spend deducted from Profit &amp; Daily Chart ({pnl.metaAdDaysCount}d):
                </span>
                <span className="font-mono font-semibold text-orange-300 tabular-nums">
                  {pnl.metaAdsBreakdownLabel
                    ? `${pnl.metaAdsBreakdownLabel} = ${formatInr(pnl.totalDailyMetaAds, pnl.currency)}`
                    : `${formatInr(pnl.dailyMetaAdsRate, pnl.currency)}/day × ${pnl.metaAdDaysCount}d = ${formatInr(pnl.totalDailyMetaAds, pnl.currency)}`}
                  {periodAdSpend > 0 ? ` + ${formatInr(periodAdSpend, pnl.currency)} extra` : ''}
                </span>
              </div>
            )}

            <div className="border-t border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => setShowFallbackRates((prev) => !prev)}
                className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-300 hover:text-white"
              >
                <span className="inline-flex items-center gap-1.5">
                  {showFallbackRates ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  )}
                  Prepaid PG % &amp; Offline Fallback Rates (when Delhivery AWB isn&apos;t synced yet)
                </span>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  PG {costForm.prepaidGatewayPercent}% · Fwd ₹{costForm.fallbackForwardShippingCost} · RTO ₹{costForm.fallbackRtoShippingCost}
                </span>
              </button>

              {showFallbackRates && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="block">
                    <span className="text-[11px] font-medium text-slate-400">Fallback Fwd Ship ₹</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={costForm.fallbackForwardShippingCost}
                      onChange={(e) => onUpdateCostField('fallbackForwardShippingCost', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-medium text-slate-400">Fallback RTO Leg ₹</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={costForm.fallbackRtoShippingCost}
                      onChange={(e) => onUpdateCostField('fallbackRtoShippingCost', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-medium text-slate-400">Fallback COD Fee ₹</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={costForm.fallbackCodFee}
                      onChange={(e) => onUpdateCostField('fallbackCodFee', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-medium text-slate-400">Prepaid PG Fee %</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step="0.1"
                      value={costForm.prepaidGatewayPercent}
                      onChange={(e) => onUpdateCostField('prepaidGatewayPercent', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {costNotice || 'Change any cost above to recalculate Monthly P&L live. Included in Excel & PDF exports.'}
              </span>
              <button
                type="button"
                disabled={isSavingCosts}
                onClick={() => void onSaveCostRules()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {isSavingCosts ? 'Saving...' : costDirty ? 'Save Cost Rules' : 'Saved'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 6-Column Financial KPI Summary */}
      <section
        aria-label="Profit and Loss Key Metrics"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 xl:grid-cols-6"
      >
        <div
          className={`rounded-xl border p-3.5 backdrop-blur-md sm:p-4 ${
            isProfitPositive
              ? 'border-emerald-500/35 bg-emerald-500/8'
              : 'border-rose-500/35 bg-rose-500/8'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-slate-300 sm:text-xs">
              Net Realized {isProfitPositive ? 'Profit' : 'Loss'}
            </p>
            {isProfitPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" aria-hidden="true" />
            )}
          </div>
          <p
            data-testid="pnl-net-profit-value"
            className={`mt-1.5 font-mono text-xl font-semibold tabular-nums sm:text-2xl ${
              isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatInr(pnl.netRealizedProfit, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300 tabular-nums">
            {pnl.netMarginPct}% margin · {formatInr(pnl.avgProfitPerDelivered, pnl.currency)}/delv
          </p>
        </div>

        <div
          className={`rounded-xl border p-3.5 backdrop-blur-md sm:p-4 ${
            pnl.projectedNetProfit >= 0
              ? 'border-indigo-400/40 bg-indigo-500/10'
              : 'border-rose-500/30 bg-rose-500/8'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-indigo-200 sm:text-xs">
              Expected Profit (No RTO)
            </p>
            <Truck className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          </div>
          <p
            data-testid="pnl-expected-profit-value"
            className={`mt-1.5 font-mono text-xl font-semibold tabular-nums sm:text-2xl ${
              pnl.projectedNetProfit >= 0 ? 'text-indigo-200' : 'text-rose-300'
            }`}
          >
            {formatInr(pnl.projectedNetProfit, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-indigo-200/80 tabular-nums">
            +{formatInr(pnl.projectedTransitProfit, pnl.currency)} if {pnl.inTransitCount} transit deliver · auto-deducts RTO
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">Delivered Revenue</p>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-white sm:text-2xl">
            {formatInr(pnl.realizedRevenue, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-indigo-300 tabular-nums">
            +{formatInr(pnl.inTransitExpectedRevenue, pnl.currency)} in transit ({pnl.inTransitCount})
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">Total Costs Deducted</p>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-amber-300 sm:text-2xl">
            {formatInr(pnl.totalRealizedCosts, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            COGS {formatInr(pnl.totalCogs, pnl.currency)} · 2-Way Ship {formatInr(pnl.totalForwardShipping + pnl.totalRtoShippingCost, pnl.currency)}
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-rose-200/90 sm:text-xs">RTO Direct Loss</p>
          <p
            data-testid="pnl-rto-loss-value"
            className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-rose-400 sm:text-2xl"
          >
            {formatInr(-pnl.totalRtoLoss, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400 tabular-nums">
            {pnl.rtoCount} RTO · Fwd {formatInr(pnl.totalRtoForwardShipping, pnl.currency)} + Ret {formatInr(pnl.totalRtoShippingCost, pnl.currency)} + Pack {formatInr(pnl.totalRtoPackagingCost, pnl.currency)}
          </p>
        </div>

        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-cyan-200/90 sm:text-xs">
              WhatsApp RTO Saved
            </p>
            <ShieldCheck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-cyan-300 sm:text-2xl">
            {formatInr(pnl.whatsappRtoSavings, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            {pnl.cancelledCount} fake/cancelled caught pre-ship
          </p>
        </div>
      </section>

      {/* 2-Column Visual Charts: P&L Cost Waterfall + Daily Profit vs Cost Bar Chart */}
      <section aria-label="Visual Profit and Loss Charts" className="grid gap-4 lg:grid-cols-2">
        {/* Left: Waterfall P&L Visual */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">Revenue to Net Profit Waterfall</h3>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {pnl.deliveredCount} Delv · {pnl.rtoCount} RTO
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {waterfallSteps.map((step) => {
              const widthPct = Math.min(100, Math.round((step.amount / waterfallMax) * 100));
              const shareOfRev =
                pnl.realizedRevenue > 0
                  ? Math.round((step.amount / pnl.realizedRevenue) * 100)
                  : 0;
              return (
                <div key={step.label} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">{step.label}</span>
                    <span className={`font-mono font-semibold tabular-nums ${step.textClass}`}>
                      {step.sign}
                      {formatInr(step.amount, pnl.currency)}
                      {pnl.realizedRevenue > 0 ? ` (${shareOfRev}%)` : ''}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                    <div
                      style={{ width: `${step.amount > 0 ? Math.max(widthPct, 2) : 0}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${step.colorClass}`}
                    />
                  </div>
                </div>
              );
            })}

            {/* Final Net Result Row */}
            <div className="mt-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-white">
                  Net Realized {isProfitPositive ? 'Profit' : 'Loss'}
                </span>
                <span
                  className={`font-mono tabular-nums ${
                    isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatInr(pnl.netRealizedProfit, pnl.currency)}
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{
                    width: `${
                      pnl.netRealizedProfit !== 0
                        ? Math.min(
                            100,
                            Math.max(4, Math.round((Math.abs(pnl.netRealizedProfit) / waterfallMax) * 100))
                          )
                        : 0
                    }%`,
                  }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isProfitPositive ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </div>
              {pnl.inTransitCount > 0 && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg border border-indigo-500/25 bg-indigo-500/8 px-3 py-2 text-xs">
                  <span className="text-indigo-200">
                    Projected Net Profit if {pnl.inTransitCount} In-Transit Deliver:
                  </span>
                  <span className="font-mono font-semibold text-indigo-300 tabular-nums">
                    {formatInr(pnl.projectedNetProfit, pnl.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Daily Visual Revenue vs Costs & Net Profit Bar Chart (SVG) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                Daily Revenue vs Costs Visual Chart
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                  Delivered Rev
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-indigo-400/70" />
                  In Transit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-400" />
                  Costs + RTO
                </span>
              </div>
            </div>

            {chartDays.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-xs text-slate-400">
                No order data available for the selected date range.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <svg
                  role="img"
                  aria-label="Daily revenue vs costs bar chart"
                  viewBox={`0 0 ${Math.max(420, chartDays.length * 76)} 220`}
                  className="h-56 w-full min-w-[360px]"
                >
                  {/* Baseline & Grid Lines */}
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = 176 - ratio * 140;
                    return (
                      <line
                        key={ratio}
                        x1={8}
                        y1={y}
                        x2={Math.max(412, chartDays.length * 76 - 8)}
                        y2={y}
                        stroke="rgba(148, 163, 184, 0.14)"
                        strokeDasharray="3 3"
                      />
                    );
                  })}
                  <line
                    x1={8}
                    y1={176}
                    x2={Math.max(412, chartDays.length * 76 - 8)}
                    y2={176}
                    stroke="rgba(148, 163, 184, 0.35)"
                  />

                  {chartDays.map((day, idx) => {
                    const slotWidth = Math.max(66, Math.floor(Math.max(404, chartDays.length * 76) / chartDays.length));
                    const centerX = 8 + idx * slotWidth + slotWidth / 2;
                    const barW = 14;
                    const revH = Math.round((day.realizedRevenue / chartMaxVal) * 140);
                    const transitH = Math.round((day.expectedTransitRevenue / chartMaxVal) * 140);
                    const costH = Math.round((day.totalCosts / chartMaxVal) * 140);
                    const shortDate = day.dateLabel.replace(/ \d{4}$/, '');
                    const displayedNet =
                      day.realizedRevenue > 0 || day.rtoLoss > 0
                        ? day.netRealizedProfit
                        : day.projectedNetProfit;
                    const netLabel = formatInr(displayedNet, pnl.currency);

                    return (
                      <g key={day.dateKey}>
                        {/* Delivered Revenue Bar */}
                        <rect
                          x={centerX - barW - 7}
                          y={176 - Math.max(revH, day.realizedRevenue > 0 ? 4 : 0)}
                          width={barW}
                          height={Math.max(revH, day.realizedRevenue > 0 ? 4 : 0)}
                          rx={3}
                          fill="#10b981"
                        />
                        {/* In-Transit Expected Revenue Bar */}
                        <rect
                          x={centerX - 5}
                          y={176 - Math.max(transitH, day.expectedTransitRevenue > 0 ? 4 : 0)}
                          width={barW}
                          height={Math.max(transitH, day.expectedTransitRevenue > 0 ? 4 : 0)}
                          rx={3}
                          fill="rgba(129, 140, 248, 0.78)"
                        />
                        {/* Total Cost + RTO Bar */}
                        <rect
                          x={centerX + barW - 1}
                          y={176 - Math.max(costH, day.totalCosts > 0 ? 4 : 0)}
                          width={barW}
                          height={Math.max(costH, day.totalCosts > 0 ? 4 : 0)}
                          rx={3}
                          fill="#fb7185"
                        />
                        {/* Net Readout Top */}
                        <text
                          x={centerX}
                          y={20}
                          textAnchor="middle"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="600"
                          fill={
                            displayedNet < 0
                              ? '#fda4af'
                              : day.realizedRevenue > 0
                                ? '#6ee7b7'
                                : '#a5b4fc'
                          }
                        >
                          {netLabel}
                        </text>
                        {/* Date X-Axis Label */}
                        <text
                          x={centerX}
                          y={196}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#94a3b8"
                        >
                          {shortDate}
                        </text>
                        <text
                          x={centerX}
                          y={210}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#64748b"
                        >
                          {day.totalOrders} ord
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          <p className="mt-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
            Emerald = Delivered Revenue · Indigo = Expected from Active Transit · Rose = Realized COGS, Freight &amp; RTO Loss.
          </p>
        </div>
      </section>

      {/* 2nd Row Visual Charts: Cost & Margin Donut + COD vs Prepaid Profitability */}
      <section aria-label="Cost Mix and Payment Mode Analytics" className="grid gap-4 lg:grid-cols-2">
        {/* Left: SVG Donut Cost & Net Margin Breakdown */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">Cost Structure &amp; Margin Donut</h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {pnl.netMarginPct}% Net Margin
            </span>
          </div>

          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative flex shrink-0 items-center justify-center">
              <svg
                role="img"
                aria-label="Cost and profit mix donut chart"
                viewBox="0 0 150 150"
                className="h-40 w-40 -rotate-90"
              >
                <circle
                  cx="75"
                  cy="75"
                  r={donutMetrics.radius}
                  fill="none"
                  stroke="rgba(30, 41, 59, 0.9)"
                  strokeWidth="22"
                />
                {donutMetrics.arcs.map((arc) => (
                  <circle
                    key={arc.label}
                    cx="75"
                    cy="75"
                    r={donutMetrics.radius}
                    fill="none"
                    stroke={arc.stroke}
                    strokeWidth="22"
                    strokeDasharray={arc.dashArray}
                    strokeDashoffset={arc.dashOffset}
                  />
                ))}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Net Margin
                </span>
                <span
                  className={`font-mono text-lg font-bold tabular-nums ${
                    pnl.netRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {pnl.netMarginPct}%
                </span>
              </div>
            </div>

            <div className="w-full flex-1 space-y-2 text-xs">
              {donutMetrics.arcs.length === 0 ? (
                <p className="text-slate-400">
                  Delivered or RTO orders will populate your exact cost &amp; profit share here.
                </p>
              ) : (
                donutMetrics.arcs.map((arc) => (
                  <div
                    key={arc.label}
                    className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-1.5 last:border-b-0 last:pb-0"
                  >
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className={`h-2.5 w-2.5 rounded-xs ${arc.dotClass}`} />
                      {arc.label}
                    </span>
                    <span className={`font-mono font-semibold tabular-nums ${arc.textClass}`}>
                      {formatInr(arc.value, pnl.currency)} ({arc.pctLabel}%)
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: COD vs Prepaid Unit Economics Comparison */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">COD vs Prepaid Profitability</h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {modeSplit.cod.count} COD · {modeSplit.prepaid.count} Prepaid
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  title: 'COD Orders',
                  data: modeSplit.cod,
                  accentBorder: 'border-amber-500/30 bg-amber-500/5',
                  titleColor: 'text-amber-300',
                  barColor: 'bg-amber-400',
                },
                {
                  title: 'Prepaid Orders',
                  data: modeSplit.prepaid,
                  accentBorder: 'border-emerald-500/30 bg-emerald-500/5',
                  titleColor: 'text-emerald-300',
                  barColor: 'bg-emerald-400',
                },
              ] as const
            ).map((card) => {
              const totalModeOrders = Math.max(1, modeSplit.cod.count + modeSplit.prepaid.count);
              const sharePct = Math.round((card.data.count / totalModeOrders) * 100);
              return (
                <div key={card.title} className={`rounded-xl border p-3.5 ${card.accentBorder}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${card.titleColor}`}>{card.title}</span>
                    <span className="font-mono text-xs font-semibold text-white tabular-nums">
                      {card.data.count} ({sharePct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div style={{ width: `${sharePct}%` }} className={`h-full rounded-full ${card.barColor}`} />
                  </div>
                  <div className="mt-3 space-y-1.5 text-[11px] tabular-nums">
                    <div className="flex justify-between text-slate-300">
                      <span>Delivered / Transit / RTO</span>
                      <span className="font-mono text-white">
                        {card.data.delivered} / {card.data.inTransit} /{' '}
                        <span className="text-rose-300">{card.data.rto}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Delivered Revenue</span>
                      <span className="font-mono text-slate-100">
                        {formatInr(card.data.revenue, pnl.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Ship + COD/PG Fees</span>
                      <span className="font-mono text-amber-200">
                        {formatInr(card.data.shippingAndFee, pnl.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5 font-semibold">
                      <span className="text-slate-200">Projected / Realized Profit</span>
                      <span
                        className={`font-mono ${
                          card.data.projectedProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
                        }`}
                      >
                        {formatInr(card.data.projectedProfit, pnl.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Order-by-Order Profit & Loss Audit Table */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Order-by-Order Profit &amp; Loss Breakdown</h3>
            <p className="text-xs text-slate-400">
              Tap any order row to inspect Shopify tags, courier tracking &amp; remarks. Note: Delhivery Tariff bills in 500g slabs incl. 18% GST (550g = 1kg slab).
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter Profit and Loss orders by outcome"
            className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/85 p-1"
          >
            {(
              [
                { id: 'all', label: `All (${pnl.totalOrders})` },
                { id: 'delivered', label: `Delivered (${pnl.deliveredCount})` },
                { id: 'in_transit', label: `In Transit (${pnl.inTransitCount})` },
                { id: 'rto_return', label: `RTO Loss (${pnl.rtoCount})` },
                { id: 'cancelled', label: `Cancelled (${pnl.cancelledCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={outcomeFilter === tab.id}
                onClick={() => setOutcomeFilter(tab.id)}
                className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  outcomeFilter === tab.id
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrderRows.length === 0 ? (
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 px-6 py-10 text-center text-sm text-slate-400">
            No orders in this outcome category for {periodLabel}.
          </div>
        ) : (
          <>
            {/* Mobile P&L Order Cards */}
            <div className="space-y-2.5 md:hidden">
              {filteredOrderRows.map((row) => (
                <button
                  key={row.orderId}
                  type="button"
                  onClick={() => onInspectOrder(row.orderId)}
                  className="w-full rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 text-left transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {row.orderNumber}{' '}
                      <span className="font-sans text-xs font-normal text-slate-400">
                        · {row.outcomeLabel}
                      </span>
                    </span>
                    <span
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        row.netProfit > 0
                          ? 'text-emerald-400'
                          : row.netProfit < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {row.outcome === 'in_transit' ? 'Est. ' : ''}
                      {formatInr(row.netProfit, row.currency)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {row.customerName} · {row.paymentMethod} · Order {formatInr(row.orderValue, row.currency)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>
                      COGS {formatInr(row.cogsCost, row.currency)} · Ship{' '}
                      {formatInr(row.forwardShippingCost + row.rtoShippingCost, row.currency)} · Fee/Pack{' '}
                      {formatInr(row.packagingCost + row.paymentOrCodFee, row.currency)}
                    </span>
                    <span
                      className={
                        row.chargeSource === 'delhivery_wallet'
                          ? 'text-cyan-300'
                          : row.chargeSource === 'delhivery_api'
                            ? 'text-emerald-300'
                            : 'text-slate-500'
                      }
                    >
                      {row.chargeSource === 'delhivery_wallet'
                        ? 'Wallet CSV (Exact)'
                        : row.chargeSource === 'delhivery_api'
                          ? `Tariff${row.chargedWeightGrams ? ` · ${row.chargedWeightGrams}g` : ''}`
                          : row.chargeSource === 'estimated'
                            ? 'Est. Fallback'
                            : '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop P&L Order Table */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-md md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Order</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Customer / Mode</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Order Value</th>
                      <th className="px-3 py-3 text-right font-medium whitespace-nowrap">COGS</th>
                      <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Shipping + RTO</th>
                      <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Pack + COD/PG</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Rate Source</th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Net Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredOrderRows.map((row) => (
                      <tr
                        key={row.orderId}
                        onClick={() => onInspectOrder(row.orderId)}
                        className="cursor-pointer transition-colors hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-white whitespace-nowrap">
                          <div>{row.orderNumber}</div>
                          <div className="font-sans text-[11px] font-normal text-slate-400">
                            {row.dateLabel}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-medium text-slate-100">{row.customerName}</div>
                          <div className="font-mono text-[11px] text-slate-400">{row.paymentMethod}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              row.outcome === 'delivered'
                                ? 'text-emerald-400'
                                : row.outcome === 'rto_return'
                                  ? 'text-rose-400'
                                  : row.outcome === 'in_transit'
                                    ? 'text-indigo-300'
                                    : 'text-slate-400'
                            }`}
                          >
                            {row.outcomeLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-100 tabular-nums whitespace-nowrap">
                          {formatInr(row.orderValue, row.currency)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                          {formatInr(row.cogsCost, row.currency)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                          {formatInr(row.forwardShippingCost + row.rtoShippingCost, row.currency)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                          {formatInr(row.packagingCost + row.paymentOrCodFee + row.marketingCost, row.currency)}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">
                          <span
                            className={
                              row.chargeSource === 'delhivery_wallet'
                                ? 'font-semibold text-cyan-300'
                                : row.chargeSource === 'delhivery_api'
                                  ? 'font-semibold text-emerald-300'
                                  : 'text-slate-500'
                            }
                          >
                            {row.chargeSource === 'delhivery_wallet'
                              ? 'Wallet CSV (Exact)'
                              : row.chargeSource === 'delhivery_api'
                                ? `Tariff${row.chargedWeightGrams ? ` · ${row.chargedWeightGrams}g` : ''}`
                                : row.chargeSource === 'estimated'
                                  ? 'Est. Fallback'
                                  : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                          <span
                            className={
                              row.outcome === 'in_transit'
                                ? 'text-indigo-300'
                                : row.netProfit > 0
                                  ? 'text-emerald-400'
                                  : row.netProfit < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-500'
                            }
                          >
                            {row.outcome === 'in_transit' ? 'Est. ' : ''}
                            {formatInr(row.netProfit, row.currency)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
