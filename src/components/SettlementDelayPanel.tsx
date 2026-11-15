import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  RefreshCw,
  Save,
  Settings2,
  Truck,
  Upload,
} from 'lucide-react';
import {
  buildSettlementAndDelaySummary,
  type SettlementDelayOrderRow,
} from '../lib/orderRules';
import type { AppSettings, OrderRecord } from '../lib/types';

interface SettlementDelayPanelProps {
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
  onInspectOrder: (orderId: string) => void;
}

type SettlementDelayFilter =
  | 'all'
  | 'pending_remittance'
  | 'settled'
  | 'delayed'
  | 'delivered_late';

function formatInr(amount: number, currency = 'INR'): string {
  const prefix = currency === 'INR' ? '₹' : `${currency} `;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('en-IN');
  return amount < 0 ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
}

export function SettlementDelayPanel({
  orders,
  settings,
  periodLabel,
  onSaveSettings,
  onSyncDelhivery,
  onImportDelhiveryCsv,
  onSettleOrder,
  onSettleBulk,
  onInspectOrder,
}: SettlementDelayPanelProps) {
  const [filter, setFilter] = useState<SettlementDelayFilter>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkUtr, setBulkUtr] = useState('');
  const [isSettlingId, setIsSettlingId] = useState<string | null>(null);
  const [isBulkSettling, setIsBulkSettling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ ok: boolean; message: string } | null>(null);
  const [showSlaConfig, setShowSlaConfig] = useState(false);
  const [slaDays, setSlaDays] = useState<number>(settings.deliverySlaDays ?? 4);
  const [pickupHours, setPickupHours] = useState<number>(settings.pickupSlaHours ?? 48);
  const [isSavingSla, setIsSavingSla] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(
    () => buildSettlementAndDelaySummary(orders, settings),
    [orders, settings]
  );

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'pending_remittance':
        return summary.rows.filter((r) => r.settlement.status === 'pending_remittance');
      case 'settled':
        return summary.rows.filter((r) => r.settlement.status === 'settled');
      case 'delayed':
        return summary.rows.filter((r) => r.delay.isActiveDelay);
      case 'delivered_late':
        return summary.rows.filter((r) => r.delay.state === 'delivered_late');
      default:
        return summary.rows;
    }
  }, [summary.rows, filter]);

  const pendingCodIds = useMemo(
    () =>
      summary.rows
        .filter((r) => r.settlement.status === 'pending_remittance')
        .map((r) => r.order.id),
    [summary.rows]
  );

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatusBanner(null);
    const res = await onSyncDelhivery();
    setIsSyncing(false);
    setStatusBanner({
      ok: res.ok,
      message: res.ok
        ? `Delhivery One synced: ${res.trackedCount ?? 0} AWBs tracked (EDD, scans, pickup & delivery time updated).${res.warning ? ` Note: ${res.warning}` : ''}`
        : res.error || 'Could not sync Delhivery One.',
    });
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsImportingCsv(true);
    setStatusBanner(null);
    try {
      const text = await file.text();
      const res = await onImportDelhiveryCsv(text);
      setStatusBanner({
        ok: res.ok,
        message: res.ok
          ? `CSV Imported: ${res.updatedCount ?? 0} orders updated out of ${res.parsedCount ?? 0} rows.`
          : res.error || 'Failed to parse CSV.',
      });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleToggleSingleSettle = async (row: SettlementDelayOrderRow) => {
    setIsSettlingId(row.order.id);
    const currentlySettled = row.settlement.status === 'settled';
    await onSettleOrder(row.order.id, {
      settled: !currentlySettled,
      amount: row.settlement.orderValue,
    });
    setIsSettlingId(null);
  };

  const handleBulkSettle = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkSettling(true);
    const ok = await onSettleBulk(selectedOrderIds, bulkUtr.trim() || undefined);
    setIsBulkSettling(false);
    if (ok) {
      setSelectedOrderIds([]);
      setBulkUtr('');
      setStatusBanner({
        ok: true,
        message: 'Selected COD orders marked settled in bank ledger.',
      });
    }
  };

  const handleSaveSla = async () => {
    setIsSavingSla(true);
    const ok = await onSaveSettings({
      deliverySlaDays: Math.max(1, slaDays),
      pickupSlaHours: Math.max(6, pickupHours),
    });
    setIsSavingSla(false);
    if (ok) {
      setShowSlaConfig(false);
      setStatusBanner({ ok: true, message: 'Delivery & Pickup SLA rules saved.' });
    }
  };

  const totalCashPipeline = Math.max(
    summary.settledTotal +
      summary.pendingCodRemittanceTotal +
      summary.inTransitCodTotal +
      summary.rtoNoPayoutValue,
    1
  );

  const totalDelayEvaluated = Math.max(
    summary.activeDelayedCount + summary.deliveredOnTimeCount + summary.deliveredLateCount,
    1
  );

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="settlement-delay-panel">
      {/* Control Strip */}
      <section className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Payment Settlement &amp; Courier Delay Monitor · {periodLabel}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Track COD bank remittances (UTR), prepaid payouts, pickup lag (&gt;{settings.pickupSlaHours ?? 48}h), and delivery SLA breaches (&gt;{settings.deliverySlaDays ?? 4}d).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void handleCsvFileChange(e)}
            />
            <button
              type="button"
              onClick={() => setShowSlaConfig((v) => !v)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              SLA Rules
            </button>
            <button
              type="button"
              disabled={isImportingCsv}
              onClick={() => csvInputRef.current?.click()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              {isImportingCsv ? 'Importing CSV...' : 'Import COD / Wallet CSV'}
            </button>
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => void handleSync()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isSyncing ? 'Syncing Delhivery...' : 'Sync Delhivery Delays'}
            </button>
          </div>
        </div>

        {statusBanner && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
              statusBanner.ok
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/35 bg-rose-500/10 text-rose-200'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{statusBanner.message}</span>
          </div>
        )}

        {showSlaConfig && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4">
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400">Pickup SLA Limit (Hours)</span>
              <input
                type="number"
                min={6}
                max={168}
                value={pickupHours}
                onChange={(e) => setPickupHours(Number.parseInt(e.target.value, 10) || 48)}
                className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400">Delivery SLA Limit (Days)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={slaDays}
                onChange={(e) => setSlaDays(Number.parseInt(e.target.value, 10) || 4)}
                className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled={isSavingSla}
              onClick={() => void handleSaveSla()}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {isSavingSla ? 'Saving...' : 'Save SLA Rules'}
            </button>
          </div>
        )}
      </section>

      {/* 5-Card Cashflow Settlement + Delivery SLA KPI Strip */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-emerald-200/90 sm:text-xs">
              Settled in Bank
            </p>
            <Banknote className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-emerald-400">
            {formatInr(summary.settledTotal, summary.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300 tabular-nums">
            Prepaid {formatInr(summary.prepaidSettledTotal, summary.currency)} · COD {formatInr(summary.codSettledTotal, summary.currency)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3.5 backdrop-blur-md sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-amber-200/90 sm:text-xs">
              COD Pending Remittance
            </p>
            <Clock className="h-4 w-4 text-amber-300" aria-hidden="true" />
          </div>
          <p
            data-testid="cod-pending-remittance-value"
            className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-amber-300"
          >
            {formatInr(summary.pendingCodRemittanceTotal, summary.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300 tabular-nums">
            {summary.pendingCodRemittanceCount} delivered COD
            {summary.avgCodRemittanceWaitDays !== null
              ? ` · Avg ${summary.avgCodRemittanceWaitDays}d wait`
              : ''}
          </p>
        </div>

        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <p className="text-[11px] font-medium text-indigo-200/90 sm:text-xs">
            COD In Transit (Uncollected)
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-indigo-300">
            {formatInr(summary.inTransitCodTotal, summary.currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            {summary.inTransitCodCount} COD parcels · RTO ₹0: {summary.rtoCount}
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 backdrop-blur-md sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-rose-200/90 sm:text-xs">
              Delayed / Stuck Parcels
            </p>
            <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden="true" />
          </div>
          <p
            data-testid="delayed-parcels-count"
            className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-rose-400"
          >
            {summary.activeDelayedCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-300 tabular-nums">
            {formatInr(summary.stuckOrderValue, summary.currency)} stuck · {summary.ndrAttemptCount} NDR
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5 backdrop-blur-md sm:col-span-1 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-medium text-cyan-200/90 sm:text-xs">
              On-Time Delivery SLA
            </p>
            <Truck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-cyan-300">
            {summary.onTimeDeliveryRate}%
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
            {summary.avgTransitDays !== null ? `Avg ${summary.avgTransitDays}d` : 'No delivered'} · {summary.deliveredLateCount} delivered late
          </p>
        </div>
      </section>

      {/* 2-Column Visual Settlement Cashflow & Delay Breakdown */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <h3 className="border-b border-slate-800 pb-3 text-sm font-semibold text-white">
            Payment &amp; COD Settlement Pipeline
          </h3>
          <div className="mt-4 space-y-3 text-xs">
            {[
              {
                label: `Prepaid Paid (${summary.prepaidSettledCount})`,
                value: summary.prepaidSettledTotal,
                barClass: 'bg-emerald-500',
                textClass: 'text-emerald-300',
              },
              {
                label: `COD Settled to Bank (${summary.codSettledCount})`,
                value: summary.codSettledTotal,
                barClass: 'bg-teal-400',
                textClass: 'text-teal-300',
              },
              {
                label: `COD Pending Remittance (${summary.pendingCodRemittanceCount})`,
                value: summary.pendingCodRemittanceTotal,
                barClass: 'bg-amber-400',
                textClass: 'text-amber-300',
              },
              {
                label: `COD In Transit (${summary.inTransitCodCount})`,
                value: summary.inTransitCodTotal,
                barClass: 'bg-indigo-400',
                textClass: 'text-indigo-300',
              },
              {
                label: `RTO Returned — No Payout (${summary.rtoCount})`,
                value: summary.rtoNoPayoutValue,
                barClass: 'bg-rose-500',
                textClass: 'text-rose-300',
              },
            ].map((item) => {
              const pct = Math.min(100, Math.round((item.value / totalCashPipeline) * 100));
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">{item.label}</span>
                    <span className={`font-mono font-semibold tabular-nums ${item.textClass}`}>
                      {formatInr(item.value, summary.currency)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      style={{ width: `${item.value > 0 ? Math.max(pct, 2) : 0}%` }}
                      className={`h-full rounded-full ${item.barClass}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-md sm:p-5">
          <h3 className="border-b border-slate-800 pb-3 text-sm font-semibold text-white">
            Delivery SLA &amp; Courier Delay Breakdown
          </h3>
          <div className="mt-4 space-y-3 text-xs">
            {[
              {
                label: 'Delivered On-Time (Within SLA / EDD)',
                count: summary.deliveredOnTimeCount,
                barClass: 'bg-emerald-500',
                textClass: 'text-emerald-300',
              },
              {
                label: `Pickup Delayed (> ${settings.pickupSlaHours ?? 48}h waiting courier)`,
                count: summary.pickupDelayedCount,
                barClass: 'bg-amber-400',
                textClass: 'text-amber-300',
              },
              {
                label: `Transit Delayed (> ${settings.deliverySlaDays ?? 4}d or Past EDD)`,
                count: summary.transitDelayedCount,
                barClass: 'bg-orange-400',
                textClass: 'text-orange-300',
              },
              {
                label: 'NDR / Re-Attempt Delivery Failed',
                count: summary.ndrAttemptCount,
                barClass: 'bg-rose-500',
                textClass: 'text-rose-300',
              },
              {
                label: 'Delivered Late (Past SLA)',
                count: summary.deliveredLateCount,
                barClass: 'bg-indigo-400',
                textClass: 'text-indigo-300',
              },
            ].map((item) => {
              const pct = Math.min(100, Math.round((item.count / totalDelayEvaluated) * 100));
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">{item.label}</span>
                    <span className={`font-mono font-semibold tabular-nums ${item.textClass}`}>
                      {item.count} orders
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      style={{ width: `${item.count > 0 ? Math.max(pct, 3) : 0}%` }}
                      className={`h-full rounded-full ${item.barClass}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bulk COD Settlement Action Bar */}
      {pendingCodIds.length > 0 && (
        <section className="flex flex-col gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/8 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-100">
            <span className="font-semibold">
              {pendingCodIds.length} COD order{pendingCodIds.length === 1 ? '' : 's'} delivered — select checkboxes to mark bank remittance received:
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedOrderIds(
                  selectedOrderIds.length === pendingCodIds.length ? [] : pendingCodIds
                )
              }
              className="rounded border border-amber-400/40 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:bg-slate-800"
            >
              {selectedOrderIds.length === pendingCodIds.length ? 'Clear All' : 'Select All Pending COD'}
            </button>
          </div>
          {selectedOrderIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={bulkUtr}
                onChange={(e) => setBulkUtr(e.target.value)}
                placeholder="UTR / Bank Ref (optional)"
                className="min-h-[34px] rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1 font-mono text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={isBulkSettling}
                onClick={() => void handleBulkSettle()}
                className="min-h-[34px] rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
              >
                {isBulkSettling ? 'Settling...' : `Mark ${selectedOrderIds.length} COD Settled`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Filter Tabs + Audit Ledger */}
      <section className="space-y-3">
        <div
          role="tablist"
          aria-label="Filter Settlement and Delay Orders"
          className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/85 p-1"
        >
          {(
            [
              { id: 'all', label: `All (${summary.rows.length})` },
              {
                id: 'pending_remittance',
                label: `COD Pending (${summary.pendingCodRemittanceCount})`,
              },
              { id: 'settled', label: `Settled (${summary.settledCount})` },
              { id: 'delayed', label: `Delayed / Stuck (${summary.activeDelayedCount})` },
              { id: 'delivered_late', label: `Delivered Late (${summary.deliveredLateCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                filter === tab.id
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 px-6 py-10 text-center text-sm text-slate-400">
            No orders match this settlement/delay filter for {periodLabel}.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="space-y-2.5 md:hidden">
              {filteredRows.map((row) => {
                const isCodPending = row.settlement.status === 'pending_remittance';
                const canToggleSettle =
                  isCodPending ||
                  (row.settlement.status === 'settled' && row.settlement.paymentMode === 'COD');
                return (
                  <div
                    key={row.order.id}
                    className={`rounded-xl border p-3.5 ${
                      row.delay.isActiveDelay
                        ? 'border-rose-500/40 bg-rose-500/5'
                        : 'border-slate-800/90 bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectOrder(row.order.id)}
                        className="text-left"
                      >
                        <span className="font-mono text-sm font-bold text-white">
                          {row.order.orderNumber}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">{row.order.customerName}</span>
                      </button>
                      <span className="font-mono text-xs font-semibold text-white tabular-nums">
                        {formatInr(row.settlement.orderValue, summary.currency)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span
                        className={
                          row.settlement.status === 'settled'
                            ? 'font-medium text-emerald-400'
                            : row.settlement.status === 'pending_remittance'
                              ? 'font-medium text-amber-300'
                              : row.settlement.status === 'no_payout'
                                ? 'font-medium text-rose-400'
                                : 'text-slate-400'
                        }
                      >
                        {row.settlement.label}
                        {row.settlement.reference ? ` · ${row.settlement.reference}` : ''}
                      </span>

                      <span
                        className={
                          row.delay.isActiveDelay
                            ? 'font-semibold text-rose-400'
                            : row.delay.state === 'delivered_late'
                              ? 'font-medium text-amber-300'
                              : 'text-slate-300'
                        }
                      >
                        {row.delay.label}
                      </span>
                    </div>

                    {row.delay.reason && (
                      <p className="mt-1 text-[11px] text-slate-400">{row.delay.reason}</p>
                    )}

                    {canToggleSettle && (
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2">
                        <label className="flex items-center gap-2 text-[11px] text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(row.order.id)}
                            onChange={() => toggleSelectOrder(row.order.id)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                          />
                          Select for UTR batch
                        </label>
                        <button
                          type="button"
                          disabled={isSettlingId === row.order.id}
                          onClick={() => void handleToggleSingleSettle(row)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-slate-800"
                        >
                          {isSettlingId === row.order.id
                            ? 'Updating...'
                            : isCodPending
                              ? 'Mark COD Settled'
                              : 'Undo Settled'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Ledger Table */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-md md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                      <th className="w-9 px-3 py-3" aria-label="Select" />
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Order &amp; AWB</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Customer</th>
                      <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Order Value</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Payment Settlement</th>
                      <th className="px-3 py-3 text-right font-medium whitespace-nowrap">Courier Spend</th>
                      <th className="px-3 py-3 font-medium whitespace-nowrap">Delivery SLA / Delay</th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredRows.map((row) => {
                      const isCodPending = row.settlement.status === 'pending_remittance';
                      const canToggleSettle =
                        isCodPending ||
                        (row.settlement.status === 'settled' &&
                          row.settlement.paymentMode === 'COD');
                      return (
                        <tr
                          key={row.order.id}
                          className={`transition-colors ${
                            row.delay.isActiveDelay
                              ? 'bg-rose-500/8 hover:bg-rose-500/14'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="px-3 py-3">
                            {isCodPending ? (
                              <input
                                type="checkbox"
                                aria-label={`Select ${row.order.orderNumber}`}
                                checked={selectedOrderIds.includes(row.order.id)}
                                onChange={() => toggleSelectOrder(row.order.id)}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                              />
                            ) : null}
                          </td>
                          <td
                            onClick={() => onInspectOrder(row.order.id)}
                            className="cursor-pointer px-3 py-3 whitespace-nowrap"
                          >
                            <div className="font-mono font-semibold text-white">
                              {row.order.orderNumber}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {row.order.trackingNumber || row.dateLabel}
                            </div>
                          </td>
                          <td
                            onClick={() => onInspectOrder(row.order.id)}
                            className="cursor-pointer px-3 py-3 whitespace-nowrap"
                          >
                            <div className="font-medium text-slate-100">{row.order.customerName}</div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {row.settlement.paymentMode} · {row.dateLabel}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-medium text-slate-100 tabular-nums whitespace-nowrap">
                            {formatInr(row.settlement.orderValue, summary.currency)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div
                              className={`font-medium ${
                                row.settlement.status === 'settled'
                                  ? 'text-emerald-400'
                                  : row.settlement.status === 'pending_remittance'
                                    ? 'text-amber-300'
                                    : row.settlement.status === 'no_payout'
                                      ? 'text-rose-400'
                                      : 'text-slate-300'
                              }`}
                            >
                              {row.settlement.label}
                              {row.settlement.daysSinceDelivery !== null && isCodPending
                                ? ` (${row.settlement.daysSinceDelivery}d wait)`
                                : ''}
                            </div>
                            {row.settlement.reference && (
                              <div className="font-mono text-[11px] text-slate-400">
                                Ref: {row.settlement.reference}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                            <div className="text-slate-200">
                              {row.shippingAndCodCost > 0
                                ? formatInr(row.shippingAndCodCost, summary.currency)
                                : '—'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {row.order.delhiveryChargeSource === 'delhivery_wallet'
                                ? 'Wallet CSV'
                                : row.order.delhiveryChargeSource === 'delhivery_api'
                                  ? 'Delhivery API'
                                  : 'Unfetched'}
                            </div>
                          </td>
                          <td
                            onClick={() => onInspectOrder(row.order.id)}
                            className="cursor-pointer px-3 py-3"
                          >
                            <div
                              className={`font-medium whitespace-nowrap ${
                                row.delay.isActiveDelay
                                  ? 'text-rose-400'
                                  : row.delay.state === 'delivered_late'
                                    ? 'text-amber-300'
                                    : row.delay.state === 'delivered_on_time'
                                      ? 'text-emerald-400'
                                      : 'text-slate-300'
                              }`}
                            >
                              {row.delay.label}
                            </div>
                            {row.delay.reason && (
                              <div className="max-w-[260px] truncate text-[11px] text-slate-400">
                                {row.delay.reason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {canToggleSettle ? (
                              <button
                                type="button"
                                disabled={isSettlingId === row.order.id}
                                onClick={() => void handleToggleSingleSettle(row)}
                                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                                  isCodPending
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                                    : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                                }`}
                              >
                                {isSettlingId === row.order.id
                                  ? 'Saving...'
                                  : isCodPending
                                    ? 'Mark Settled'
                                    : 'Undo'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onInspectOrder(row.order.id)}
                                className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                              >
                                Inspect
                              </button>
                            )}
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
    </div>
  );
}
