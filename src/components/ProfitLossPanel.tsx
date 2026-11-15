import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
} from 'lucide-react';
import {
  buildProfitLossReport,
  type CostAssumptions,
  type PnlOutcomeCategory,
} from '../lib/orderRules';
import type { AppSettings, OrderRecord } from '../lib/types';

interface ProfitLossPanelProps {
  orders: OrderRecord[];
  settings: AppSettings;
  periodLabel: string;
  onSaveSettings: (next: Partial<AppSettings>) => Promise<boolean>;
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
  onSaveSettings,
  onSyncDelhivery,
  onImportDelhiveryCsv,
  onOpenDelhiverySettings,
  onInspectOrder,
}: ProfitLossPanelProps) {
  const [costForm, setCostForm] = useState<CostAssumptions>({
    cogsPercent: settings.cogsPercent ?? 35,
    packagingCostPerOrder: settings.packagingCostPerOrder ?? 25,
    fallbackForwardShippingCost: settings.fallbackForwardShippingCost ?? 75,
    fallbackRtoShippingCost: settings.fallbackRtoShippingCost ?? 75,
    fallbackCodFee: settings.fallbackCodFee ?? 25,
    prepaidGatewayPercent: settings.prepaidGatewayPercent ?? 2,
    marketingCostPerOrder: settings.marketingCostPerOrder ?? 0,
  });
  const [periodAdSpend, setPeriodAdSpend] = useState<number>(0);
  const [costDirty, setCostDirty] = useState(false);
  const [isSavingCosts, setIsSavingCosts] = useState(false);
  const [costNotice, setCostNotice] = useState<string | null>(null);
  const [isSyncingDelhivery, setIsSyncingDelhivery] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [delhiveryStatus, setDelhiveryStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | PnlOutcomeCategory>('all');
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showFallbackRates, setShowFallbackRates] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!costDirty) {
      setCostForm({
        cogsPercent: settings.cogsPercent ?? 35,
        packagingCostPerOrder: settings.packagingCostPerOrder ?? 25,
        fallbackForwardShippingCost: settings.fallbackForwardShippingCost ?? 75,
        fallbackRtoShippingCost: settings.fallbackRtoShippingCost ?? 75,
        fallbackCodFee: settings.fallbackCodFee ?? 25,
        prepaidGatewayPercent: settings.prepaidGatewayPercent ?? 2,
        marketingCostPerOrder: settings.marketingCostPerOrder ?? 0,
      });
    }
  }, [settings, costDirty]);

  const pnl = useMemo(
    () => buildProfitLossReport(orders, costForm, periodAdSpend),
    [orders, costForm, periodAdSpend]
  );

  const filteredOrderRows = useMemo(() => {
    if (outcomeFilter === 'all') return pnl.orderRows;
    return pnl.orderRows.filter((row) => row.outcome === outcomeFilter);
  }, [pnl.orderRows, outcomeFilter]);

  const updateCostField = (key: keyof CostAssumptions, rawVal: string) => {
    const parsed = Number.parseFloat(rawVal);
    setCostDirty(true);
    setCostForm((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }));
  };

  const handleSaveCostRules = async () => {
    setIsSavingCosts(true);
    setCostNotice(null);
    const ok = await onSaveSettings(costForm);
    setIsSavingCosts(false);
    if (ok) {
      setCostDirty(false);
      setCostNotice('Unit economics & cost rules saved.');
      window.setTimeout(() => setCostNotice(null), 3500);
    } else {
      setCostNotice('Failed to save cost rules.');
    }
  };

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
      label: 'Marketing / Ad Spend',
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
              onClick={() => setShowAssumptions((prev) => !prev)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                showAssumptions
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-700 bg-slate-950/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showAssumptions ? 'Hide Business Costs' : 'Adjust Business Costs'}
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

        {showAssumptions && (
          <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Product COGS %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={costForm.cogsPercent}
                  onChange={(e) => updateCostField('cogsPercent', e.target.value)}
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
                  onChange={(e) => updateCostField('packagingCostPerOrder', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Ad Cost ₹/Order</span>
                <input
                  type="number"
                  min={0}
                  step="5"
                  value={costForm.marketingCostPerOrder}
                  onChange={(e) => updateCostField('marketingCostPerOrder', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Extra Period Ad Spend ₹</span>
                <input
                  type="number"
                  min={0}
                  step="50"
                  value={periodAdSpend}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value);
                    setPeriodAdSpend(Number.isFinite(v) && v >= 0 ? v : 0);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </label>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
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
                  Offline Fallback Rates (used only when Delhivery AWB rate isn&apos;t fetched yet)
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  Fwd ₹{costForm.fallbackForwardShippingCost} · RTO ₹{costForm.fallbackRtoShippingCost} · COD ₹{costForm.fallbackCodFee}
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
                      onChange={(e) => updateCostField('fallbackForwardShippingCost', e.target.value)}
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
                      onChange={(e) => updateCostField('fallbackRtoShippingCost', e.target.value)}
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
                      onChange={(e) => updateCostField('fallbackCodFee', e.target.value)}
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
                      onChange={(e) => updateCostField('prepaidGatewayPercent', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {costNotice || 'Shipping & COD fees come directly from Delhivery One API/Wallet CSV. Save your COGS & packaging here.'}
              </span>
              <button
                type="button"
                disabled={isSavingCosts}
                onClick={() => void handleSaveCostRules()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {isSavingCosts ? 'Saving...' : costDirty ? 'Save Cost Rules' : 'Saved'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 5-Column Financial KPI Summary */}
      <section
        aria-label="Profit and Loss Key Metrics"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5"
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
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
              isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatInr(pnl.netRealizedProfit, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300 tabular-nums">
            {pnl.netMarginPct}% margin · {formatInr(pnl.avgProfitPerDelivered, pnl.currency)}/delv
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">Delivered Revenue</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-white">
            {formatInr(pnl.realizedRevenue, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-indigo-300 tabular-nums">
            +{formatInr(pnl.inTransitExpectedRevenue, pnl.currency)} in transit ({pnl.inTransitCount})
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">Total Costs Deducted</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-amber-300">
            {formatInr(pnl.totalRealizedCosts, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            COGS {formatInr(pnl.totalCogs, pnl.currency)} · Ship {formatInr(pnl.totalForwardShipping, pnl.currency)}
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-rose-200/90 sm:text-xs">RTO Direct Loss</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-rose-400">
            {formatInr(-pnl.totalRtoLoss, pnl.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            {pnl.rtoCount} RTO orders (2-way freight + pack)
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5 backdrop-blur-md sm:col-span-1 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-cyan-200/90 sm:text-xs">
              WhatsApp RTO Saved
            </p>
            <ShieldCheck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-cyan-300">
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
                    const netLabel = formatInr(
                      day.realizedRevenue > 0 || day.rtoLoss > 0
                        ? day.netRealizedProfit
                        : day.projectedNetProfit,
                      pnl.currency
                    );

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
                            day.netRealizedProfit < 0
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
