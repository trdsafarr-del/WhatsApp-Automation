import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  FileDown,
  FileSpreadsheet,
  FilterX,
  IndianRupee,
  Package,
  RotateCcw,
  Search,
  Tag,
  TrendingUp,
  Truck,
  XCircle,
} from 'lucide-react';
import { exportDailyReportToPdf } from '../lib/exportDailyReportPdf';
import { exportMonthlyReportToExcel } from '../lib/exportExcelReport';
import { exportProfitLossReportToPdf } from '../lib/exportProfitLossPdf';
import { ProfitLossPanel } from './ProfitLossPanel';
import { SettlementDelayPanel } from './SettlementDelayPanel';
import {
  buildDailyReportSummary,
  computeMetaAdDateKeysInRange,
  DEFAULT_META_ADS_RATE_HISTORY,
  filterOrdersByIstDateRange,
  formatIstDateDisplay,
  getDispatchStatusInfo,
  getIstDateKey,
  getIstMonthKey,
  getMonthIstDateBounds,
  hasHighRtoTag,
  hasOrderTrackingAdded,
  isOrderDelivered,
  isOrderInTransit,
  isOrderNotConfirmedOnWhatsApp,
  isOrderRtoReturn,
  normalizeMetaAdsRateHistory,
  shiftMonthKey,
  type CostAssumptions,
} from '../lib/orderRules';
import type { AppSettings, MetaAdsRateEntry, OrderRecord } from '../lib/types';

interface ReportsViewProps {
  orders: OrderRecord[];
  settings: AppSettings;
  onInspectOrder: (orderId: string) => void;
  onSaveSettings: (next: Partial<AppSettings>) => Promise<boolean>;
  onSyncDelhivery: () => Promise<{
    ok: boolean;
    trackedCount?: number;
    chargesUpdatedCount?: number;
    warning?: string;
    error?: string;
  }>;
  onImportDelhiveryCsv: (csvText: string) => Promise<{
    ok: boolean;
    updatedCount?: number;
    parsedCount?: number;
    error?: string;
  }>;
  onSettleOrder: (
    orderId: string,
    params: { settled: boolean; reference?: string; amount?: number }
  ) => Promise<boolean>;
  onSettleBulk: (orderIds: string[], reference?: string) => Promise<boolean>;
  onOpenDelhiverySettings: () => void;
}

type ReportSectionTab = 'dispatch' | 'pnl' | 'settlement_delays';
type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'this_month'
  | 'last_month'
  | 'month'
  | 'all'
  | 'custom';
type ReportCategoryFilter =
  | 'all'
  | 'not_confirmed'
  | 'confirmed'
  | 'cancelled'
  | 'tracking_added'
  | 'in_transit'
  | 'delivered'
  | 'rto_return';

function shiftIstDateKey(baseDateKey: string, deltaDays: number): string {
  const ms = Date.parse(`${baseDateKey}T12:00:00+05:30`);
  if (!Number.isFinite(ms)) return baseDateKey;
  const shifted = new Date(ms + deltaDays * 24 * 60 * 60 * 1000);
  return getIstDateKey(shifted) || baseDateKey;
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function pctOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function ReportsView({
  orders,
  settings,
  onInspectOrder,
  onSaveSettings,
  onSyncDelhivery,
  onImportDelhiveryCsv,
  onSettleOrder,
  onSettleBulk,
  onOpenDelhiverySettings,
}: ReportsViewProps) {
  const todayIst = useMemo(() => getIstDateKey(new Date()) || '2026-11-15', []);
  const yesterdayIst = useMemo(() => shiftIstDateKey(todayIst, -1), [todayIst]);
  const last7StartIst = useMemo(() => shiftIstDateKey(todayIst, -6), [todayIst]);
  const currentMonthIst = useMemo(() => getIstMonthKey(new Date()) || todayIst.slice(0, 7), [todayIst]);
  const lastMonthIst = useMemo(() => shiftMonthKey(currentMonthIst, -1), [currentMonthIst]);

  const [reportTab, setReportTab] = useState<ReportSectionTab>('dispatch');
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const initialMonthBounds = useMemo(
    () => getMonthIstDateBounds(currentMonthIst),
    [currentMonthIst]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthIst);
  const [fromDate, setFromDate] = useState<string>(
    initialMonthBounds?.fromDate || last7StartIst
  );
  const [toDate, setToDate] = useState<string>(initialMonthBounds?.toDate || todayIst);
  const [category, setCategory] = useState<ReportCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highRtoOnly, setHighRtoOnly] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const resolveInitialMetaAds = (s: AppSettings) => {
    const hasCustomHistory =
      Array.isArray(s.metaAdsRateHistory) && s.metaAdsRateHistory.length > 0;
    const history = hasCustomHistory ? s.metaAdsRateHistory! : DEFAULT_META_ADS_RATE_HISTORY;
    const normalized = normalizeMetaAdsRateHistory(history);
    const latestRate =
      normalized.length > 0
        ? normalized[normalized.length - 1].dailySpend
        : s.dailyMetaAdsSpend ?? 1500;
    return {
      dailyMetaAdsSpend: hasCustomHistory ? s.dailyMetaAdsSpend ?? latestRate : latestRate,
      metaAdsRateHistory: history,
    };
  };

  const [costForm, setCostForm] = useState<CostAssumptions>(() => ({
    cogsPercent: settings.cogsPercent ?? 35,
    packagingCostPerOrder: settings.packagingCostPerOrder ?? 25,
    fallbackForwardShippingCost: settings.fallbackForwardShippingCost ?? 75,
    fallbackRtoShippingCost: settings.fallbackRtoShippingCost ?? 75,
    fallbackCodFee: settings.fallbackCodFee ?? 25,
    prepaidGatewayPercent: settings.prepaidGatewayPercent ?? 2,
    marketingCostPerOrder: settings.marketingCostPerOrder ?? 0,
    ...resolveInitialMetaAds(settings),
  }));
  const [periodAdSpend, setPeriodAdSpend] = useState<number>(0);
  const [adDaysOverride, setAdDaysOverride] = useState<number | null>(null);
  const [costDirty, setCostDirty] = useState(false);
  const [isSavingCosts, setIsSavingCosts] = useState(false);
  const [costNotice, setCostNotice] = useState<string | null>(null);

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
        ...resolveInitialMetaAds(settings),
      });
    }
  }, [settings, costDirty]);

  const handleUpdateCostField = (key: keyof CostAssumptions, rawVal: string) => {
    const parsed = Number.parseFloat(rawVal);
    const cleanVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setCostDirty(true);
    setCostForm((prev) => {
      if (key === 'dailyMetaAdsSpend') {
        const baseHistory = normalizeMetaAdsRateHistory(
          prev.metaAdsRateHistory && prev.metaAdsRateHistory.length > 0
            ? prev.metaAdsRateHistory
            : DEFAULT_META_ADS_RATE_HISTORY
        );
        const updatedHistory = normalizeMetaAdsRateHistory([
          ...baseHistory.filter((item) => item.effectiveFrom !== todayIst),
          { effectiveFrom: todayIst, dailySpend: cleanVal },
        ]);
        return {
          ...prev,
          dailyMetaAdsSpend: cleanVal,
          metaAdsRateHistory: updatedHistory,
        };
      }
      return {
        ...prev,
        [key]: cleanVal,
      };
    });
  };

  const handleUpdateMetaAdsRateHistory = (nextHistory: MetaAdsRateEntry[]) => {
    const normalized = normalizeMetaAdsRateHistory(nextHistory);
    setCostDirty(true);
    setCostForm((prev) => ({
      ...prev,
      metaAdsRateHistory: nextHistory,
      dailyMetaAdsSpend:
        normalized.length > 0
          ? normalized[normalized.length - 1].dailySpend
          : prev.dailyMetaAdsSpend,
    }));
  };

  const handleUpdatePeriodAdSpend = (rawVal: string) => {
    const parsed = Number.parseFloat(rawVal);
    setPeriodAdSpend(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
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

  const handleSelectMonth = (monthKey: string) => {
    const bounds = getMonthIstDateBounds(monthKey);
    if (!bounds) return;
    setAdDaysOverride(null);
    setSelectedMonth(monthKey);
    setFromDate(bounds.fromDate);
    setToDate(bounds.toDate);
    setPreset(
      monthKey === currentMonthIst
        ? 'this_month'
        : monthKey === lastMonthIst
          ? 'last_month'
          : 'month'
    );
  };

  const handleSelectPreset = (
    next: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'last_month' | 'all'
  ) => {
    if (next === 'this_month') {
      handleSelectMonth(currentMonthIst);
      return;
    }
    if (next === 'last_month') {
      handleSelectMonth(lastMonthIst);
      return;
    }
    setAdDaysOverride(null);
    setPreset(next);
    if (next === 'today') {
      setFromDate(todayIst);
      setToDate(todayIst);
    } else if (next === 'yesterday') {
      setFromDate(yesterdayIst);
      setToDate(yesterdayIst);
    } else if (next === 'last_7_days') {
      setFromDate(last7StartIst);
      setToDate(todayIst);
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  const handleSelectSingleDay = (dateKey: string) => {
    if (!dateKey || dateKey === 'Unknown') return;
    if (fromDate === dateKey && toDate === dateKey) {
      handleSelectPreset('this_month');
      return;
    }
    setAdDaysOverride(null);
    setPreset(dateKey === todayIst ? 'today' : dateKey === yesterdayIst ? 'yesterday' : 'custom');
    setFromDate(dateKey);
    setToDate(dateKey);
  };

  const dateFilteredOrders = useMemo(
    () => filterOrdersByIstDateRange(orders, fromDate, toDate),
    [orders, fromDate, toDate]
  );

  const autoMetaAdDateKeys = useMemo(
    () =>
      computeMetaAdDateKeysInRange({
        orders: dateFilteredOrders,
        fromDate,
        toDate,
        syncStartDate: settings.syncStartDate,
        todayIst,
      }),
    [dateFilteredOrders, fromDate, toDate, settings.syncStartDate, todayIst]
  );
  const autoMetaAdDays = autoMetaAdDateKeys.length;
  const activeAdDays = adDaysOverride ?? autoMetaAdDays;

  const { totals, dailyRows } = useMemo(
    () => buildDailyReportSummary(dateFilteredOrders),
    [dateFilteredOrders]
  );

  const categoryFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dateFilteredOrders.filter((order) => {
      if (highRtoOnly && !hasHighRtoTag(order.shopifyTags)) return false;

      const matchesCategory = (() => {
        switch (category) {
          case 'not_confirmed':
            return isOrderNotConfirmedOnWhatsApp(order);
          case 'confirmed':
            return order.pollStatus === 'confirmed';
          case 'cancelled':
            return order.pollStatus === 'cancelled_by_user';
          case 'tracking_added':
            return hasOrderTrackingAdded(order);
          case 'in_transit':
            return isOrderInTransit(order);
          case 'delivered':
            return isOrderDelivered(order);
          case 'rto_return':
            return isOrderRtoReturn(order);
          default:
            return true;
        }
      })();

      if (!matchesCategory) return false;
      if (!q) return true;

      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (order.customerPhone || '').toLowerCase().includes(q) ||
        (order.trackingNumber || '').toLowerCase().includes(q) ||
        (order.lineItemsSummary || '').toLowerCase().includes(q)
      );
    });
  }, [dateFilteredOrders, category, searchQuery, highRtoOnly]);

  const periodLabel = useMemo(() => {
    if (!fromDate && !toDate) return 'All Synced Dates';
    if (fromDate && toDate && fromDate === toDate) {
      return formatIstDateDisplay(fromDate);
    }
    if (fromDate && toDate && fromDate.slice(0, 7) === toDate.slice(0, 7)) {
      const bounds = getMonthIstDateBounds(fromDate.slice(0, 7));
      if (bounds && bounds.fromDate === fromDate && bounds.toDate === toDate) {
        return bounds.monthLabel;
      }
    }
    return `${fromDate ? formatIstDateDisplay(fromDate) : 'Start'} – ${
      toDate ? formatIstDateDisplay(toDate) : 'Today'
    }`;
  }, [fromDate, toDate]);

  const isSingleDayFocused = Boolean(fromDate && toDate && fromDate === toDate);

  function showExportToast(message: string) {
    setExportFeedback(message);
    window.setTimeout(() => {
      setExportFeedback((prev) => (prev === message ? null : prev));
    }, 4500);
  }

  function triggerPdfDownload(targetOrders: OrderRecord[], labelSuffix?: string) {
    if (targetOrders.length === 0) return;
    const activePeriod = labelSuffix ? `${periodLabel} · ${labelSuffix}` : periodLabel;
    const filename = exportDailyReportToPdf(targetOrders, settings.shopName, activePeriod);
    showExportToast(`Executive PDF Report downloaded: ${filename}`);
  }

  function triggerPnlPdfDownload() {
    if (dateFilteredOrders.length === 0) return;
    const filename = exportProfitLossReportToPdf({
      orders: dateFilteredOrders,
      shopName: settings.shopName,
      periodLabel,
      costAssumptions: costForm,
      periodAdSpend,
      adDaysCount: activeAdDays,
      metaAdDateKeys: autoMetaAdDateKeys,
    });
    showExportToast(`Profit & Loss PDF downloaded: ${filename}`);
  }

  async function triggerExcelDownload() {
    if (dateFilteredOrders.length === 0 || isExportingExcel) return;
    setIsExportingExcel(true);
    try {
      const filename = await exportMonthlyReportToExcel({
        orders: dateFilteredOrders,
        settings,
        costAssumptions: costForm,
        periodAdSpend,
        adDaysCount: activeAdDays,
        metaAdDateKeys: autoMetaAdDateKeys,
        periodLabel,
      });
      showExportToast(`Colorful Excel Workbook with Charts (.xlsx) downloaded: ${filename}`);
    } finally {
      setIsExportingExcel(false);
    }
  }

  const confirmedPct = pctOf(totals.confirmedOrders, totals.totalOrders);
  const notConfirmedPct = pctOf(totals.notConfirmedOnWhatsApp, totals.totalOrders);
  const cancelledPct = Math.max(0, 100 - confirmedPct - notConfirmedPct);

  const trackingPct = pctOf(totals.trackingAddedTotal, totals.totalOrders);
  const inTransitPct = pctOf(totals.inTransitCount, totals.totalOrders);
  const deliveredPct = pctOf(totals.deliveredCount, totals.totalOrders);
  const rtoPct = pctOf(totals.rtoReturnCount, totals.totalOrders);

  const dispatchChartDays = useMemo(
    () => [...dailyRows].reverse().slice(-14),
    [dailyRows]
  );
  const dispatchChartMaxOrders = useMemo(
    () => Math.max(4, ...dispatchChartDays.map((d) => d.totalOrders)),
    [dispatchChartDays]
  );

  const paymentMixStats = useMemo(() => {
    let codCount = 0;
    let codVal = 0;
    let prepaidCount = 0;
    let prepaidVal = 0;

    for (const o of dateFilteredOrders) {
      const val = Number.parseFloat(o.totalPrice || '0') || 0;
      const pm = (o.paymentMethod || '').trim().toLowerCase();
      const isCod =
        pm.includes('cod') ||
        pm.includes('cash') ||
        (!pm.includes('prepaid') && !pm.includes('paid') && (o.financialStatus || '').toLowerCase() === 'pending');
      if (isCod) {
        codCount += 1;
        codVal += val;
      } else {
        prepaidCount += 1;
        prepaidVal += val;
      }
    }

    const total = Math.max(1, codCount + prepaidCount);
    const codPct = Math.round((codCount / total) * 100);
    const prepaidPct = Math.max(0, 100 - codPct);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const codDash = (codCount / total) * circumference;
    const prepaidDash = (prepaidCount / total) * circumference;

    return {
      codCount,
      codVal: Math.round(codVal),
      codPct,
      prepaidCount,
      prepaidVal: Math.round(prepaidVal),
      prepaidPct,
      radius,
      circumference,
      codDash,
      prepaidDash,
      avgOrderVal:
        dateFilteredOrders.length > 0
          ? Math.round((codVal + prepaidVal) / dateFilteredOrders.length)
          : 0,
    };
  }, [dateFilteredOrders]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Executive Report Header & Date Filter Bar */}
      <section
        aria-label="Date Filter and Report Export"
        className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/80 shadow-xl shadow-black/25 backdrop-blur-md"
      >
        {/* Statement Header Strip */}
        <div className="flex flex-col gap-3 border-b border-slate-800/80 bg-slate-950/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-sm font-semibold text-white sm:text-base">
                {settings.shopName} ·{' '}
                {reportTab === 'pnl'
                  ? 'Profit & Loss Statement'
                  : reportTab === 'settlement_delays'
                    ? 'Payment Settlements & Delivery Delays'
                    : 'Order & Dispatch Report'}
              </h2>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-300">
                {periodLabel}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {reportTab === 'pnl'
                ? 'Visual revenue, COGS, Delhivery One shipping & RTO loss breakdown for the selected IST date range.'
                : reportTab === 'settlement_delays'
                  ? 'Track Prepaid vs COD bank remittance UTRs, pending COD cashflow, pickup lag & courier delivery SLA delays.'
                  : 'Date-wise IST (+05:30) analytics across Shopify orders, WhatsApp confirmations, tracking & courier movement.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Report Type"
              className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/90 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={reportTab === 'dispatch'}
                onClick={() => setReportTab('dispatch')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  reportTab === 'dispatch'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Truck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Orders &amp; Dispatch
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={reportTab === 'pnl'}
                onClick={() => setReportTab('pnl')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  reportTab === 'pnl'
                    ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/40'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <IndianRupee className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Profit &amp; Loss
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={reportTab === 'settlement_delays'}
                onClick={() => setReportTab('settlement_delays')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  reportTab === 'settlement_delays'
                    ? 'bg-amber-400/20 text-amber-200 ring-1 ring-inset ring-amber-400/40'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Banknote className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                Settlement &amp; Delays
              </button>
            </div>

            {reportTab === 'dispatch' && (category !== 'all' || highRtoOnly || searchQuery.trim()) ? (
              <button
                type="button"
                onClick={() => triggerPdfDownload(categoryFilteredOrders, category.replaceAll('_', ' ').toUpperCase())}
                disabled={categoryFilteredOrders.length === 0}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-50 whitespace-nowrap"
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Filtered PDF ({categoryFilteredOrders.length})
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void triggerExcelDownload()}
              disabled={dateFilteredOrders.length === 0 || isExportingExcel}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:opacity-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              {isExportingExcel ? 'Building Excel...' : 'Export Excel (.xlsx)'}
            </button>

            <button
              type="button"
              onClick={reportTab === 'pnl' ? triggerPnlPdfDownload : () => triggerPdfDownload(dateFilteredOrders)}
              disabled={dateFilteredOrders.length === 0}
              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap sm:flex-initial sm:text-sm"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              {reportTab === 'pnl'
                ? `Export P&L PDF (${dateFilteredOrders.length})`
                : `Export Report PDF (${dateFilteredOrders.length})`}
            </button>
          </div>
        </div>

        {/* Date Preset, Month Selector & Calendar Range Controls */}
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label="Quick Date Presets"
            className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-1"
          >
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last_7_days', label: 'Last 7 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'all', label: 'All Dates' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.id)}
                className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  preset === item.id
                    ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/40'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                Month
              </span>
              <input
                aria-label="Select Month"
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) handleSelectMonth(val);
                }}
                className="min-w-0 bg-transparent text-right font-mono text-xs text-slate-100 focus:outline-none sm:text-left [color-scheme:dark]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                From
              </span>
              <input
                aria-label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setAdDaysOverride(null);
                  setPreset('custom');
                  const val = e.target.value;
                  setFromDate(val);
                  if (toDate && val && val > toDate) setToDate(val);
                }}
                className="min-w-0 bg-transparent text-right font-mono text-xs text-slate-100 focus:outline-none sm:text-left [color-scheme:dark]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                To
              </span>
              <input
                aria-label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setAdDaysOverride(null);
                  setPreset('custom');
                  const val = e.target.value;
                  setToDate(val);
                  if (fromDate && val && val < fromDate) setFromDate(val);
                }}
                className="min-w-0 bg-transparent text-right font-mono text-xs text-slate-100 focus:outline-none sm:text-left [color-scheme:dark]"
              />
            </label>
          </div>
        </div>
      </section>

      {exportFeedback && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200 backdrop-blur-md sm:text-sm">
          {exportFeedback}
        </div>
      )}

      {reportTab === 'pnl' ? (
        <ProfitLossPanel
          orders={dateFilteredOrders}
          settings={settings}
          periodLabel={periodLabel}
          costForm={costForm}
          periodAdSpend={periodAdSpend}
          adDaysCount={activeAdDays}
          autoAdDays={autoMetaAdDays}
          metaAdDateKeys={autoMetaAdDateKeys}
          isAdDaysOverridden={adDaysOverride !== null}
          costDirty={costDirty}
          isSavingCosts={isSavingCosts}
          costNotice={costNotice}
          onUpdateCostField={handleUpdateCostField}
          onUpdateMetaAdsRateHistory={handleUpdateMetaAdsRateHistory}
          onUpdatePeriodAdSpend={handleUpdatePeriodAdSpend}
          onUpdateAdDays={(days) => setAdDaysOverride(days)}
          onResetAdDays={() => setAdDaysOverride(null)}
          onSaveCostRules={handleSaveCostRules}
          onExportPnlPdf={triggerPnlPdfDownload}
          onExportMonthlyExcel={triggerExcelDownload}
          onSyncDelhivery={onSyncDelhivery}
          onImportDelhiveryCsv={onImportDelhiveryCsv}
          onOpenDelhiverySettings={onOpenDelhiverySettings}
          onInspectOrder={onInspectOrder}
        />
      ) : reportTab === 'settlement_delays' ? (
        <SettlementDelayPanel
          orders={dateFilteredOrders}
          settings={settings}
          periodLabel={periodLabel}
          onSaveSettings={onSaveSettings}
          onSyncDelhivery={onSyncDelhivery}
          onImportDelhiveryCsv={onImportDelhiveryCsv}
          onSettleOrder={onSettleOrder}
          onSettleBulk={onSettleBulk}
          onInspectOrder={onInspectOrder}
        />
      ) : (
        <>
      {/* 6-Card Executive KPI Strip (Orders + Revenue Value) */}
      <section
        aria-label="Selected Period Metrics"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6"
      >
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">Orders Aaye</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-white">
            {totals.totalOrders}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-slate-300 tabular-nums">
            {totals.currency} {totals.totalValue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-emerald-200/90 sm:text-xs">
            WhatsApp Confirmed
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-emerald-400">
            {totals.confirmedOrders}{' '}
            <span className="text-xs font-medium text-emerald-300/80">
              ({totals.confirmationRate}%)
            </span>
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-emerald-300/80 tabular-nums">
            {totals.currency} {totals.confirmedValue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-amber-200/90 sm:text-xs">
            No WhatsApp Confirm
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-amber-300">
            {totals.notConfirmedOnWhatsApp}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-amber-200/75 tabular-nums">
            {totals.currency} {totals.notConfirmedValue.toLocaleString('en-IN')} pending
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-rose-200/90 sm:text-xs">Cancelled Orders</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-rose-400">
            {totals.cancelledOrders}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-rose-300/75 tabular-nums">
            {totals.currency} {totals.cancelledValue.toLocaleString('en-IN')} lost
          </p>
        </div>

        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-cyan-200/90 sm:text-xs">Tracking Added</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-cyan-300">
            {totals.trackingAddedTotal}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            {totals.trackingPendingPickup} wait pickup · {totals.readyToDispatch} dispatch ready
          </p>
        </div>

        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-indigo-200/90 sm:text-xs">Courier Progress</p>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {totals.inTransitCount}{' '}
            <span className="text-xs font-normal text-indigo-300">Transit</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            {totals.deliveredCount} Delivered · {totals.rtoReturnCount} RTO · {totals.highRtoCount} High RTO
          </p>
        </div>
      </section>

      {/* 2-Column Executive Visual Funnel & Conversion Analytics */}
      <section
        aria-label="Visual Funnel Analytics"
        className="grid gap-4 lg:grid-cols-2"
      >
        {/* Left: WhatsApp Confirmation Funnel */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">WhatsApp Confirmation Breakdown</h3>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {totals.totalOrders} Orders Total
            </span>
          </div>

          {/* Stacked Proportion Bar */}
          <div
            aria-hidden="true"
            className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-800"
          >
            {totals.confirmedOrders > 0 && (
              <div
                style={{ width: `${confirmedPct}%` }}
                className="bg-emerald-500 transition-all duration-300"
              />
            )}
            {totals.notConfirmedOnWhatsApp > 0 && (
              <div
                style={{ width: `${notConfirmedPct}%` }}
                className="bg-amber-400 transition-all duration-300"
              />
            )}
            {totals.cancelledOrders > 0 && (
              <div
                style={{ width: `${cancelledPct}%` }}
                className="bg-rose-500 transition-all duration-300"
              />
            )}
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            <button
              type="button"
              onClick={() => setCategory('confirmed')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-left transition-colors hover:border-emerald-500/40"
            >
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Confirmed on WhatsApp
              </span>
              <span className="font-mono tabular-nums text-emerald-400">
                {totals.confirmedOrders} ({confirmedPct}%) · {totals.currency}{' '}
                {totals.confirmedValue.toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('not_confirmed')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-left transition-colors hover:border-amber-400/40"
            >
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                No WhatsApp Confirm (Pending)
              </span>
              <span className="font-mono tabular-nums text-amber-300">
                {totals.notConfirmedOnWhatsApp} ({notConfirmedPct}%) · {totals.currency}{' '}
                {totals.notConfirmedValue.toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('cancelled')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-left transition-colors hover:border-rose-500/40"
            >
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Cancelled by Customer
              </span>
              <span className="font-mono tabular-nums text-rose-400">
                {totals.cancelledOrders} ({cancelledPct}%) · {totals.currency}{' '}
                {totals.cancelledValue.toLocaleString('en-IN')}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Tracking & Courier Fulfillment Funnel */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">Tracking &amp; Courier Fulfillment</h3>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {totals.readyToDispatch} Waiting Dispatch
            </span>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            {[
              {
                label: 'Tracking Added (AWB / Fulfilled)',
                count: totals.trackingAddedTotal,
                pct: trackingPct,
                barClass: 'bg-cyan-400',
                textClass: 'text-cyan-300',
                cat: 'tracking_added' as const,
              },
              {
                label: 'Picked Up · In Transit',
                count: totals.inTransitCount,
                pct: inTransitPct,
                barClass: 'bg-indigo-400',
                textClass: 'text-indigo-300',
                cat: 'in_transit' as const,
              },
              {
                label: 'Delivered Successfully',
                count: totals.deliveredCount,
                pct: deliveredPct,
                barClass: 'bg-teal-400',
                textClass: 'text-teal-300',
                cat: 'delivered' as const,
              },
              {
                label: 'RTO / Returned',
                count: totals.rtoReturnCount,
                pct: rtoPct,
                barClass: 'bg-rose-500',
                textClass: 'text-rose-300',
                cat: 'rto_return' as const,
              },
            ].map((row) => (
              <button
                key={row.cat}
                type="button"
                onClick={() => setCategory(row.cat)}
                className="block w-full text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-300 group-hover:text-white">
                    {row.label}
                  </span>
                  <span className={`font-mono font-semibold tabular-nums ${row.textClass}`}>
                    {row.count} ({row.pct}%)
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    style={{ width: `${row.pct}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${row.barClass}`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2-Column Visual Charts: Daily Orders & WA Confirmation Chart + Payment Mode Split Donut */}
      <section aria-label="Visual Order and Payment Charts" className="grid gap-4 lg:grid-cols-2">
        {/* Left: Daily Orders & WhatsApp Confirmation Stacked SVG Bar Chart */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">
              Daily Orders &amp; WhatsApp Trend Chart
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                Confirmed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-400" />
                Pending WA
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                Cancelled
              </span>
            </div>
          </div>

          {dispatchChartDays.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-slate-400">
              No daily order data available for {periodLabel}.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <svg
                role="img"
                aria-label="Daily orders and WhatsApp confirmation stacked chart"
                viewBox={`0 0 ${Math.max(420, dispatchChartDays.length * 64)} 215`}
                className="h-52 w-full min-w-[340px]"
              >
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = 172 - ratio * 136;
                  return (
                    <line
                      key={ratio}
                      x1={8}
                      y1={y}
                      x2={Math.max(412, dispatchChartDays.length * 64 - 8)}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.14)"
                      strokeDasharray="3 3"
                    />
                  );
                })}
                <line
                  x1={8}
                  y1={172}
                  x2={Math.max(412, dispatchChartDays.length * 64 - 8)}
                  y2={172}
                  stroke="rgba(148, 163, 184, 0.35)"
                />

                {dispatchChartDays.map((day, idx) => {
                  const slotW = Math.max(
                    56,
                    Math.floor(Math.max(404, dispatchChartDays.length * 64) / dispatchChartDays.length)
                  );
                  const cx = 8 + idx * slotW + slotW / 2;
                  const barW = Math.min(26, slotW * 0.52);

                  const confH =
                    day.confirmedOrders > 0
                      ? Math.max(3, Math.round((day.confirmedOrders / dispatchChartMaxOrders) * 136))
                      : 0;
                  const pendH =
                    day.notConfirmedOnWhatsApp > 0
                      ? Math.max(3, Math.round((day.notConfirmedOnWhatsApp / dispatchChartMaxOrders) * 136))
                      : 0;
                  const cancH =
                    day.cancelledOrders > 0
                      ? Math.max(3, Math.round((day.cancelledOrders / dispatchChartMaxOrders) * 136))
                      : 0;

                  const confY = 172 - confH;
                  const pendY = confY - pendH;
                  const cancY = pendY - cancH;
                  const shortDate = day.dateLabel.replace(/ \d{4}$/, '');

                  return (
                    <g
                      key={day.dateKey}
                      onClick={() => handleSelectSingleDay(day.dateKey)}
                      className="cursor-pointer"
                    >
                      {confH > 0 && (
                        <rect x={cx - barW / 2} y={confY} width={barW} height={confH} fill="#10b981" />
                      )}
                      {pendH > 0 && (
                        <rect x={cx - barW / 2} y={pendY} width={barW} height={pendH} fill="#fbbf24" />
                      )}
                      {cancH > 0 && (
                        <rect x={cx - barW / 2} y={cancY} width={barW} height={cancH} fill="#f43f5e" />
                      )}
                      <text
                        x={cx}
                        y={Math.max(18, cancY - 6)}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="600"
                        fill="#e2e8f0"
                      >
                        {day.totalOrders} ({day.confirmationRate}%)
                      </text>
                      <text x={cx} y={190} textAnchor="middle" fontSize="10" fill="#94a3b8">
                        {shortDate}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          <p className="mt-2 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
            Click any day bar to isolate that day&apos;s orders, WA replies, and PDF/Excel report.
          </p>
        </div>

        {/* Right: COD vs Prepaid Order Share Donut & RTO Risk Radar */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">
              COD vs Prepaid Mix &amp; RTO Risk Radar
            </h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              Avg Order {totals.currency} {paymentMixStats.avgOrderVal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative flex shrink-0 items-center justify-center">
              <svg
                role="img"
                aria-label="COD vs Prepaid share donut"
                viewBox="0 0 140 140"
                className="h-36 w-36 -rotate-90"
              >
                <circle
                  cx="70"
                  cy="70"
                  r={paymentMixStats.radius}
                  fill="none"
                  stroke="rgba(30, 41, 59, 0.9)"
                  strokeWidth="20"
                />
                {paymentMixStats.codCount > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={paymentMixStats.radius}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="20"
                    strokeDasharray={`${paymentMixStats.codDash} ${paymentMixStats.circumference}`}
                    strokeDashoffset={0}
                  />
                )}
                {paymentMixStats.prepaidCount > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={paymentMixStats.radius}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="20"
                    strokeDasharray={`${paymentMixStats.prepaidDash} ${paymentMixStats.circumference}`}
                    strokeDashoffset={-paymentMixStats.codDash}
                  />
                )}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  COD Share
                </span>
                <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                  {paymentMixStats.codPct}%
                </span>
              </div>
            </div>

            <div className="w-full flex-1 space-y-3 text-xs">
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-amber-200">
                    <span className="h-2.5 w-2.5 rounded-xs bg-amber-400" />
                    COD Orders
                  </span>
                  <span className="font-mono font-semibold text-amber-300 tabular-nums">
                    {paymentMixStats.codCount} ({paymentMixStats.codPct}%)
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-300 tabular-nums">
                  Value: {totals.currency} {paymentMixStats.codVal.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-emerald-200">
                    <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                    Prepaid Orders
                  </span>
                  <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                    {paymentMixStats.prepaidCount} ({paymentMixStats.prepaidPct}%)
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-300 tabular-nums">
                  Value: {totals.currency} {paymentMixStats.prepaidVal.toLocaleString('en-IN')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHighRtoOnly((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-rose-500/25 bg-rose-500/8 px-3 py-2 text-left transition-colors hover:border-rose-400/50"
              >
                <span className="font-medium text-rose-200">High RTO Risk Flagged</span>
                <span className="font-mono font-semibold text-rose-300 tabular-nums">
                  {totals.highRtoCount} orders ({pctOf(totals.highRtoCount, totals.totalOrders)}%)
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Date-Wise Performance Ledger Table */}
      <section className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Date-Wise Performance Ledger</h2>
            <p className="text-xs text-slate-400">
              {isSingleDayFocused
                ? 'Focused on single day. Click the highlighted row or "Show Last 7 Days" to expand.'
                : 'Tap any date row to focus only that day and export its dedicated PDF.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSingleDayFocused && (
              <button
                type="button"
                onClick={() => handleSelectPreset('last_7_days')}
                className="rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
              >
                Show Last 7 Days
              </button>
            )}
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {dailyRows.length} {dailyRows.length === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </div>

        {dailyRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            No orders found for the selected date range. Try choosing &ldquo;Last 7 Days&rdquo; or &ldquo;All Dates&rdquo;.
          </div>
        ) : (
          <>
            {/* Mobile Date Cards */}
            <div className="divide-y divide-slate-800/80 md:hidden">
              {dailyRows.map((row) => {
                const isSelected = isSingleDayFocused && fromDate === row.dateKey;
                return (
                  <button
                    key={row.dateKey}
                    type="button"
                    onClick={() => handleSelectSingleDay(row.dateKey)}
                    className={`w-full p-4 text-left transition-colors ${
                      isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-white">
                        {row.dateLabel}
                        {isSelected && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                            Focused
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                        {row.totalOrders} Orders · {row.currency} {row.totalValue.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        style={{ width: `${row.confirmationRate}%` }}
                        className="h-full rounded-full bg-emerald-400"
                      />
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs tabular-nums">
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5">
                        <span className="text-slate-400">Confirmed: </span>
                        <span className="font-mono font-semibold text-emerald-400">
                          {row.confirmedOrders} ({row.confirmationRate}%)
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5">
                        <span className="text-slate-400">Cancelled: </span>
                        <span className="font-mono font-semibold text-rose-400">
                          {row.cancelledOrders}
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5">
                        <span className="text-slate-400">No WA Confirm: </span>
                        <span className="font-mono font-semibold text-amber-300">
                          {row.notConfirmedOnWhatsApp}
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5">
                        <span className="text-slate-400">Tracking Added: </span>
                        <span className="font-mono font-semibold text-cyan-300">
                          {row.trackingAddedTotal}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop Breakdown Table with Confirm % Progress Bar & Grand Total Footer */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Date (IST)</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Orders Aaye</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Confirmed</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">No WA Confirm</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Cancelled</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Tracking Added</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">In Transit</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Delivered</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">RTO Return</th>
                    <th className="px-3 py-3 text-right font-medium whitespace-nowrap">High RTO</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Confirm %</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {dailyRows.map((row) => {
                    const isSelected = isSingleDayFocused && fromDate === row.dateKey;
                    return (
                      <tr
                        key={row.dateKey}
                        onClick={() => handleSelectSingleDay(row.dateKey)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/12 hover:bg-emerald-500/18'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            {row.dateLabel}
                            {isSelected && (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                                Focused
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-white tabular-nums">
                          {row.totalOrders}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-400 tabular-nums">
                          {row.confirmedOrders}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-amber-300 tabular-nums">
                          {row.notConfirmedOnWhatsApp}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-rose-400 tabular-nums">
                          {row.cancelledOrders}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-cyan-300 tabular-nums">
                          {row.trackingAddedTotal}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-indigo-300 tabular-nums">
                          {row.inTransitCount}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-teal-300 tabular-nums">
                          {row.deliveredCount}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-rose-300 tabular-nums">
                          {row.rtoReturnCount}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-amber-200 tabular-nums">
                          {row.highRtoCount}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800">
                              <div
                                style={{ width: `${row.confirmationRate}%` }}
                                className="h-full rounded-full bg-emerald-400"
                              />
                            </div>
                            <span className="font-mono text-slate-300 tabular-nums">
                              {row.confirmationRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-100 tabular-nums whitespace-nowrap">
                          {row.currency} {row.totalValue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {dailyRows.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-700 bg-slate-950/80 font-semibold text-white">
                      <td className="px-4 py-3 whitespace-nowrap">Grand Total ({dailyRows.length} Days)</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{totals.totalOrders}</td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-400 tabular-nums">
                        {totals.confirmedOrders}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-amber-300 tabular-nums">
                        {totals.notConfirmedOnWhatsApp}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-rose-400 tabular-nums">
                        {totals.cancelledOrders}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-cyan-300 tabular-nums">
                        {totals.trackingAddedTotal}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-indigo-300 tabular-nums">
                        {totals.inTransitCount}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-teal-300 tabular-nums">
                        {totals.deliveredCount}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-rose-300 tabular-nums">
                        {totals.rtoReturnCount}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-amber-200 tabular-nums">
                        {totals.highRtoCount}
                      </td>
                      <td className="px-3 py-3 font-mono text-emerald-300 tabular-nums">
                        {totals.confirmationRate}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {totals.currency} {totals.totalValue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </section>

      {/* Order-by-Order Audit Register with Search, High RTO Toggle & Status Tabs */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Filter report orders by status"
            className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/85 p-1 backdrop-blur-md"
          >
            {(
              [
                { id: 'all', label: `All (${dateFilteredOrders.length})` },
                { id: 'not_confirmed', label: `No WA Confirm (${totals.notConfirmedOnWhatsApp})` },
                { id: 'confirmed', label: `Confirmed (${totals.confirmedOrders})` },
                { id: 'cancelled', label: `Cancelled (${totals.cancelledOrders})` },
                { id: 'tracking_added', label: `Tracking Added (${totals.trackingAddedTotal})` },
                { id: 'in_transit', label: `In Transit (${totals.inTransitCount})` },
                { id: 'delivered', label: `Delivered (${totals.deliveredCount})` },
                { id: 'rto_return', label: `RTO Return (${totals.rtoReturnCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={category === tab.id}
                onClick={() => setCategory(tab.id)}
                className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  category === tab.id
                    ? tab.id === 'not_confirmed'
                      ? 'bg-amber-400/20 text-amber-200 ring-1 ring-inset ring-amber-400/40'
                      : tab.id === 'confirmed'
                        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/40'
                        : tab.id === 'cancelled' || tab.id === 'rto_return'
                          ? 'bg-rose-500/20 text-rose-200 ring-1 ring-inset ring-rose-400/40'
                          : tab.id === 'tracking_added'
                            ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-inset ring-cyan-400/40'
                            : tab.id === 'in_transit'
                              ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/40'
                              : tab.id === 'delivered'
                                ? 'bg-teal-500/20 text-teal-200 ring-1 ring-inset ring-teal-400/40'
                                : 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 sm:w-60 sm:flex-initial">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search #order, customer, AWB..."
                className="min-h-[38px] w-full rounded-lg border border-slate-800 bg-slate-900/85 py-1.5 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => setHighRtoOnly((prev) => !prev)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                highRtoOnly
                  ? 'border-amber-400/50 bg-amber-400/20 text-amber-200'
                  : 'border-slate-800 bg-slate-900/85 text-slate-300 hover:text-white'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              High RTO ({totals.highRtoCount})
            </button>

            {(category !== 'all' || highRtoOnly || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setCategory('all');
                  setHighRtoOnly(false);
                  setSearchQuery('');
                }}
                title="Clear table filters"
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/85 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>

        {categoryFilteredOrders.length === 0 ? (
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 px-6 py-10 text-center text-sm text-slate-400 backdrop-blur-md">
            No orders match this filter for {periodLabel}.
          </div>
        ) : (
          <>
            {/* Mobile Order Cards */}
            <div className="space-y-2.5 md:hidden">
              {categoryFilteredOrders.map((order) => {
                const dispatchInfo = getDispatchStatusInfo(order);
                const isHighRto = hasHighRtoTag(order.shopifyTags);
                const notConfirmed = isOrderNotConfirmedOnWhatsApp(order);
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onInspectOrder(order.id)}
                    className={`w-full rounded-xl border p-3.5 text-left backdrop-blur-md transition-colors ${
                      isHighRto
                        ? 'border-amber-400/45 bg-amber-400/12'
                        : 'border-slate-800/90 bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold text-white">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          · {formatTimeOnly(order.createdAt)}
                        </span>
                        {isHighRto && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            High RTO
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-semibold text-white tabular-nums">
                        {order.currency} {order.totalPrice}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-100">
                      {order.customerName}{' '}
                      <span className="font-mono text-xs text-slate-400">
                        · {order.customerPhone || 'No phone'}
                      </span>
                    </p>
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-300">
                      <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                      <span>{order.lineItemsSummary}</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          order.pollStatus === 'confirmed'
                            ? 'text-emerald-400'
                            : order.pollStatus === 'cancelled_by_user'
                              ? 'text-rose-400'
                              : 'text-amber-300'
                        }`}
                      >
                        {order.pollStatus === 'confirmed' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : order.pollStatus === 'cancelled_by_user' ? (
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {notConfirmed
                          ? 'No WA Confirm'
                          : order.pollStatus === 'confirmed'
                            ? 'Confirmed'
                            : 'Cancelled'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-300">
                        {dispatchInfo.code === 'rto_return' ? (
                          <RotateCcw className="h-3 w-3 text-rose-400" aria-hidden="true" />
                        ) : dispatchInfo.code === 'tracking_added' ? (
                          <Tag className="h-3 w-3 text-cyan-400" aria-hidden="true" />
                        ) : (
                          <Truck className="h-3 w-3 text-indigo-400" aria-hidden="true" />
                        )}
                        {dispatchInfo.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop Detailed Orders Table */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-md md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Order</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Customer</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Item Name</th>
                      <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Amount</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">WhatsApp Status</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Courier / Tracking</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">AWB / Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {categoryFilteredOrders.map((order) => {
                      const dispatchInfo = getDispatchStatusInfo(order);
                      const isHighRto = hasHighRtoTag(order.shopifyTags);
                      const notConfirmed = isOrderNotConfirmedOnWhatsApp(order);
                      const dateKey = getIstDateKey(order.createdAt);
                      return (
                        <tr
                          key={order.id}
                          onClick={() => onInspectOrder(order.id)}
                          className={`cursor-pointer transition-colors ${
                            isHighRto
                              ? 'bg-amber-400/12 hover:bg-amber-400/18'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-white whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{order.orderNumber}</span>
                              {isHighRto && (
                                <AlertTriangle
                                  aria-label="High RTO Risk"
                                  className="h-3.5 w-3.5 text-amber-300"
                                />
                              )}
                            </div>
                            <div className="font-sans text-[11px] font-normal text-slate-400 tabular-nums">
                              {dateKey ? formatIstDateDisplay(dateKey) : ''} · {formatTimeOnly(order.createdAt)}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="font-medium text-slate-100">{order.customerName}</div>
                            <div className="font-mono text-slate-400 tabular-nums">
                              {order.customerPhone || 'No phone'}
                            </div>
                          </td>
                          <td className="max-w-[240px] px-3 py-3 text-slate-200">
                            {order.lineItemsSummary}
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-medium text-slate-100 tabular-nums whitespace-nowrap">
                            {order.currency} {order.totalPrice}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {order.pollStatus === 'confirmed' ? (
                              <span className="font-medium text-emerald-400">Confirmed</span>
                            ) : order.pollStatus === 'cancelled_by_user' ? (
                              <span className="font-medium text-rose-400">Cancelled</span>
                            ) : (
                              <span className="font-medium text-amber-300">
                                {notConfirmed ? 'No WA Confirm' : order.pollStatus}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`font-medium ${
                                dispatchInfo.code === 'tracking_added'
                                  ? 'text-cyan-300'
                                  : dispatchInfo.code === 'in_transit'
                                    ? 'text-indigo-300'
                                    : dispatchInfo.code === 'delivered'
                                      ? 'text-teal-300'
                                      : dispatchInfo.code === 'rto_return'
                                        ? 'text-rose-300'
                                        : dispatchInfo.code === 'ready'
                                          ? 'text-emerald-300'
                                          : 'text-slate-400'
                              }`}
                            >
                              {dispatchInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                            {[order.trackingCompany, order.trackingNumber].filter(Boolean).join(' · ') || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
        </>
      )}
    </div>
  );
}
