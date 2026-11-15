import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileDown,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  Tag,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { getDispatchStatusInfo, hasHighRtoTag, isOrderReadyToDispatch } from '../lib/orderRules';
import { exportOrdersToPdf } from '../lib/exportOrdersPdf';
import type { AppSettings, OrderMetrics, OrderRecord, PollStatus } from '../lib/types';

interface OrdersViewProps {
  orders: OrderRecord[];
  metrics: OrderMetrics;
  settings: AppSettings;
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  onVoteOrder: (orderId: string, option: string) => Promise<void>;
  onResendPoll: (orderId: string) => Promise<void>;
  onSendTracking: (orderId: string) => Promise<void>;
  onSyncShopify: () => Promise<void>;
  onOpenSettings: () => void;
  busyOrderId: string | null;
  isSyncing: boolean;
  syncMessage: string | null;
}

type FilterTab = 'all' | 'today_dispatch' | 'high_rto' | 'pending' | 'confirmed' | 'cancelled';
type InspectorTab = 'details' | 'activity';

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusDisplay({ status }: { status: PollStatus }) {
  switch (status) {
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Confirmed
        </span>
      );
    case 'cancelled_by_user':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Cancelled by User
        </span>
      );
    case 'poll_sent':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Poll Sent
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Queued
        </span>
      );
  }
}

function DispatchStatusDisplay({ order }: { order: OrderRecord }) {
  const info = getDispatchStatusInfo(order);
  switch (info.code) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 whitespace-nowrap">
          <PackageCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
          {info.label}
        </span>
      );
    case 'dispatched':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/35 bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300 whitespace-nowrap">
          <Truck className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
          {info.label}
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {info.label}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {info.label}
        </span>
      );
  }
}

export function OrdersView({
  orders,
  metrics,
  settings,
  selectedOrderId,
  onSelectOrder,
  onVoteOrder,
  onResendPoll,
  onSendTracking,
  onSyncShopify,
  onOpenSettings,
  busyOrderId,
  isSyncing,
  syncMessage,
}: OrdersViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('details');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  const readyToDispatchCount = useMemo(
    () => orders.filter(isOrderReadyToDispatch).length,
    [orders]
  );

  const highRtoCount = useMemo(
    () => orders.filter((o) => hasHighRtoTag(o.shopifyTags)).length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter === 'today_dispatch' && !isOrderReadyToDispatch(order)) {
        return false;
      }
      if (filter === 'high_rto' && !hasHighRtoTag(order.shopifyTags)) {
        return false;
      }
      if (filter === 'pending' && order.pollStatus !== 'poll_sent' && order.pollStatus !== 'queued') {
        return false;
      }
      if (filter === 'confirmed' && order.pollStatus !== 'confirmed') {
        return false;
      }
      if (filter === 'cancelled' && order.pollStatus !== 'cancelled_by_user') {
        return false;
      }
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.toLowerCase().includes(q) ||
        order.lineItemsSummary.toLowerCase().includes(q) ||
        order.shopifyTags.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, search]);

  const activeFilterLabel = useMemo(() => {
    switch (filter) {
      case 'today_dispatch':
        return `Today Dispatch (${readyToDispatchCount})`;
      case 'high_rto':
        return `High RTO Risk (${highRtoCount})`;
      case 'pending':
        return 'Pending Confirmation';
      case 'confirmed':
        return 'Confirmed Orders';
      case 'cancelled':
        return 'Cancelled Orders';
      default:
        return 'All Orders';
    }
  }, [filter, readyToDispatchCount, highRtoCount]);

  function handleExportPdf() {
    if (filteredOrders.length === 0) return;
    const filename = exportOrdersToPdf(filteredOrders, settings.shopName, activeFilterLabel);
    setPdfFeedback(`PDF downloaded: ${filename}`);
    window.setTimeout(() => {
      setPdfFeedback((prev) => (prev === `PDF downloaded: ${filename}` ? null : prev));
    }, 3500);
  }

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || orders[0] || null;

  const openMobileOrder = (orderId: string) => {
    onSelectOrder(orderId);
    setMobileSheetOpen(true);
  };

  const renderInspectorPanel = (order: OrderRecord, isMobileSheet = false) => (
    <>
      {hasHighRtoTag(order.shopifyTags) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <span>High RTO Risk Order — Verify address &amp; confirmation carefully</span>
        </div>
      )}

      {/* Inspector Section Tabs */}
      <div
        role="tablist"
        aria-label="Order Inspector Sections"
        className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={inspectorTab === 'details'}
          onClick={() => setInspectorTab('details')}
          className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            inspectorTab === 'details'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Details &amp; Poll
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={inspectorTab === 'activity'}
          onClick={() => setInspectorTab('activity')}
          className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            inspectorTab === 'activity'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Activity Log ({order.events.length})
        </button>
      </div>

      {inspectorTab === 'details' ? (
        <>
          <div className="mt-4 space-y-2.5 border-b border-slate-800 pb-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-slate-400">Items</span>
              <span className="text-right font-medium text-slate-100">
                {order.lineItemsSummary}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="shrink-0 text-slate-400">Today Dispatch</span>
              <DispatchStatusDisplay order={order} />
            </div>
            {order.paymentMethod && (
              <div className="flex items-center justify-between gap-4">
                <span className="shrink-0 text-slate-400">Payment</span>
                <span className="font-mono text-xs font-medium text-slate-200">
                  {order.paymentMethod}
                </span>
              </div>
            )}
            {order.deliverySummary && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-slate-400">Delivery</span>
                <span className="text-right text-xs leading-relaxed text-slate-300">
                  {order.deliverySummary}
                </span>
              </div>
            )}
            {(order.trackingUrl || order.trackingNumber) && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-slate-400">Tracking</span>
                <div className="text-right text-xs">
                  <p className="font-mono font-medium text-slate-100">
                    {[order.trackingCompany, order.trackingNumber]
                      .filter(Boolean)
                      .join(' · ') || 'Fulfilled'}
                  </p>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-block break-all text-emerald-400 underline-offset-2 hover:underline"
                    >
                      {order.trackingUrl}
                    </a>
                  )}
                  {order.trackingSentAt && (
                    <p className="mt-0.5 text-[11px] text-emerald-400">
                      WhatsApp tracking sent at {formatRelativeTime(order.trackingSentAt)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {order.orderNote && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-slate-400">Order Note</span>
                <span className="text-right text-xs font-medium text-amber-300">
                  {order.orderNote}
                </span>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex shrink-0 items-center gap-1.5 text-slate-400">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                Shopify Tags
              </span>
              <span
                data-testid={isMobileSheet ? 'mobile-selected-order-tags' : 'selected-order-tags'}
                className="text-right font-mono text-xs font-semibold text-slate-100"
              >
                {order.shopifyTags || 'None'}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Customer WhatsApp Poll Preview
              </h4>
              <StatusDisplay status={order.pollStatus} />
            </div>

            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/35 p-4">
              <p className="text-sm leading-relaxed text-slate-200">
                {order.pollQuestion ||
                  `Hi ${order.customerName}, confirm or cancel order ${order.orderNumber}?`}
              </p>

              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  disabled={busyOrderId === order.id}
                  onClick={() => void onVoteOrder(order.id, settings.confirmOptionLabel)}
                  className={`flex min-h-[46px] w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    order.pollStatus === 'confirmed'
                      ? 'border-emerald-500 bg-emerald-600 text-white'
                      : 'border-slate-700 bg-slate-900/90 text-slate-100 hover:border-emerald-500/60 hover:bg-emerald-950/60'
                  }`}
                >
                  <span className="shrink-0">{settings.confirmOptionLabel}</span>
                  <span className="truncate font-mono text-[11px] opacity-85">
                    → tag: {settings.confirmTag}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={busyOrderId === order.id}
                  onClick={() => void onVoteOrder(order.id, settings.cancelOptionLabel)}
                  className={`flex min-h-[46px] w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    order.pollStatus === 'cancelled_by_user'
                      ? 'border-rose-500 bg-rose-600 text-white'
                      : 'border-slate-700 bg-slate-900/90 text-slate-100 hover:border-rose-500/60 hover:bg-rose-950/50'
                  }`}
                >
                  <span className="shrink-0">{settings.cancelOptionLabel}</span>
                  <span className="truncate font-mono text-[11px] opacity-85">
                    → tag: {settings.cancelTag}
                  </span>
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Manual override: tap either option above to update the Shopify order tag immediately.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4">
          {order.events.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              No automation events logged yet for this order.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {order.events.map((evt) => (
                <li key={evt.id} className="flex items-start justify-between gap-3 py-2.5 text-xs">
                  <span className="leading-relaxed text-slate-300">{evt.message}</span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                    {formatRelativeTime(evt.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 4-Column KPI Strip */}
      <section aria-label="Order Confirmation Summary" className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3.5 backdrop-blur-md sm:p-5">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">Total Shopify Orders</p>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-white sm:mt-2 sm:text-2xl">
            {metrics.totalOrders}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
            {metrics.avgResponseMinutes !== null
              ? `Avg reply ${metrics.avgResponseMinutes} min`
              : 'Waiting for replies'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3.5 backdrop-blur-md sm:p-5">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">Awaiting Poll Tap</p>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-amber-300 sm:mt-2 sm:text-2xl">
            {metrics.pendingPolls}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">Active WhatsApp polls</p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3.5 backdrop-blur-md sm:p-5">
          <p className="truncate text-[11px] font-medium text-slate-400 sm:text-xs">
            Tagged &ldquo;{settings.confirmTag}&rdquo;
          </p>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-emerald-400 sm:mt-2 sm:text-2xl">
            {metrics.confirmedCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 tabular-nums sm:text-xs">
            {metrics.confirmationRate}% rate · {readyToDispatchCount} ready today
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3.5 backdrop-blur-md sm:p-5">
          <p className="truncate text-[11px] font-medium text-slate-400 sm:text-xs">
            Tagged &ldquo;{settings.cancelTag}&rdquo;
          </p>
          <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-rose-400 sm:mt-2 sm:text-2xl">
            {metrics.cancelledCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">Cancelled via poll</p>
        </div>
      </section>

      {(syncMessage || pdfFeedback) && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200 backdrop-blur-md sm:text-sm">
          {pdfFeedback || syncMessage}
        </div>
      )}

      {/* Workspace Filter & Action Toolbar */}
      <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="order-search" className="sr-only">
              Search orders
            </label>
            <input
              id="order-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, item, name, phone..."
              className="min-h-[44px] w-full rounded-lg border border-slate-800 bg-slate-900/85 py-2 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none sm:min-h-0"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter orders by poll or dispatch status"
            className="no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/85 p-1 backdrop-blur-md sm:flex-wrap"
          >
            {(
              [
                { id: 'all', label: `All (${orders.length})` },
                { id: 'today_dispatch', label: `Today Dispatch (${readyToDispatchCount})` },
                { id: 'high_rto', label: `High RTO (${highRtoCount})` },
                { id: 'pending', label: 'Pending' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'cancelled', label: 'Cancelled' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  filter === tab.id
                    ? tab.id === 'high_rto'
                      ? 'bg-amber-400/20 text-amber-200 ring-1 ring-inset ring-amber-400/40'
                      : 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0 sm:flex sm:items-center">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filteredOrders.length === 0}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50 whitespace-nowrap shrink-0 sm:min-h-0"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => void onSyncShopify()}
            disabled={isSyncing}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/85 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 sm:min-h-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isSyncing ? 'Syncing...' : 'Sync Shopify'}
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Mobile Cards (< md) + Desktop Table (>= md) + Side Poll Inspector */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/90 bg-slate-900/75 px-6 py-14 text-center backdrop-blur-md sm:py-16">
              <p className="text-sm font-medium text-white">
                {orders.length === 0 ? 'No Shopify orders yet' : 'No matching orders found'}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                {orders.length === 0
                  ? 'Save your Shopify .myshopify.com credentials in Automation & Shopify, then click Sync Shopify Orders or receive a live order webhook.'
                  : 'Try clearing your search or status filter to view all synced Shopify orders.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void onSyncShopify()}
                  className="min-h-[44px] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Shopify Orders'}
                </button>
                {orders.length === 0 && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap"
                  >
                    Configure Shopify
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Phone-Native Rich Order Cards (Zero Horizontal Scroll) */}
              <div className="space-y-3 md:hidden" data-testid="mobile-order-cards">
                {filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const isHighRto = hasHighRtoTag(order.shopifyTags);
                  return (
                    <button
                      key={order.id}
                      type="button"
                      data-high-rto={isHighRto ? 'true' : undefined}
                      onClick={() => openMobileOrder(order.id)}
                      className={`w-full rounded-xl border p-4 text-left backdrop-blur-md transition-colors active:scale-[0.99] ${
                        isHighRto
                          ? isSelected
                            ? 'border-amber-400/75 bg-amber-400/20'
                            : 'border-amber-400/45 bg-amber-400/12 hover:bg-amber-400/18'
                          : isSelected
                            ? 'border-emerald-500/60 bg-emerald-500/10'
                            : 'border-slate-800/90 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Row: Order # + High RTO + Price */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`font-mono text-sm font-bold tabular-nums ${
                              isHighRto ? 'text-amber-200' : 'text-white'
                            }`}
                          >
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-slate-400 tabular-nums">
                            · {formatRelativeTime(order.createdAt)}
                          </span>
                          {isHighRto && (
                            <span className="inline-flex items-center gap-0.5 rounded border border-amber-400/50 bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-amber-200 uppercase">
                              <AlertTriangle className="h-2.5 w-2.5 text-amber-300" aria-hidden="true" />
                              High RTO
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-sm font-semibold tabular-nums text-white shrink-0">
                          {order.currency} {order.totalPrice}
                        </span>
                      </div>

                      {/* Customer & Phone */}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm font-semibold text-slate-100">
                          {order.customerName}
                        </span>
                        <span className="font-mono text-xs text-slate-400 tabular-nums">
                          {order.customerPhone || 'No phone'}
                        </span>
                      </div>

                      {/* Item Name Clearly Visible */}
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-slate-800/80 bg-slate-950/55 px-3 py-2 text-xs text-slate-200">
                        <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                        <span className="leading-snug font-medium">
                          {order.lineItemsSummary || '—'}
                        </span>
                      </div>

                      {/* Poll Status + Today Dispatch */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        <StatusDisplay status={order.pollStatus} />
                        <DispatchStatusDisplay order={order} />
                      </div>

                      {/* Address / Payment + Tap Cue */}
                      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-800/70 pt-2.5 text-[11px] text-slate-400">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {order.deliverySummary ? (
                            <>
                              <MapPin className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                              <span className="truncate">{order.deliverySummary}</span>
                            </>
                          ) : (
                            <span className="truncate font-mono">
                              {order.shopifyTags ? order.shopifyTags.replaceAll(',', ' ·') : 'No tags'}
                            </span>
                          )}
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-emerald-400">
                          Details
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop / Tablet Full 7-Column Table */}
              <div className="hidden overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/75 backdrop-blur-md md:block">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium text-slate-400">
                        <th className="px-3 py-3 whitespace-nowrap">Order</th>
                        <th className="px-3 py-3 whitespace-nowrap">Customer</th>
                        <th className="px-3 py-3 whitespace-nowrap">Item Name</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Amount</th>
                        <th className="px-3 py-3 whitespace-nowrap">Poll Status</th>
                        <th className="px-3 py-3 whitespace-nowrap">Today Dispatch</th>
                        <th className="px-3 py-3 whitespace-nowrap">Shopify Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredOrders.map((order) => {
                        const isSelected = selectedOrder?.id === order.id;
                        const isHighRto = hasHighRtoTag(order.shopifyTags);
                        const rowClass = isHighRto
                          ? isSelected
                            ? 'bg-amber-400/20 ring-1 ring-inset ring-amber-400/60'
                            : 'bg-amber-400/12 hover:bg-amber-400/18'
                          : isSelected
                            ? 'bg-emerald-500/10'
                            : 'hover:bg-slate-800/50';

                        return (
                          <tr
                            key={order.id}
                            data-high-rto={isHighRto ? 'true' : undefined}
                            className={`transition-colors ${rowClass}`}
                          >
                            <td className="px-3 py-3 font-mono text-xs font-semibold tabular-nums text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectOrder(order.id)}
                                  className={`text-left underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                                    isHighRto ? 'text-amber-200' : 'text-white'
                                  }`}
                                >
                                  {order.orderNumber}
                                </button>
                                {isHighRto && (
                                  <span
                                    title="High RTO Risk Tag"
                                    className="inline-flex items-center gap-0.5 rounded border border-amber-400/40 bg-amber-400/20 px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-tight text-amber-200 uppercase"
                                  >
                                    <AlertTriangle className="h-2.5 w-2.5 text-amber-300" aria-hidden="true" />
                                    High RTO
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 font-sans text-[11px] font-normal text-slate-400 tabular-nums whitespace-nowrap">
                                {formatRelativeTime(order.createdAt)}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-slate-100 whitespace-nowrap">{order.customerName}</div>
                              <div className="font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                                {order.customerPhone || 'No phone'}
                              </div>
                            </td>
                            <td className="min-w-[135px] max-w-[180px] px-3 py-3 text-xs leading-snug font-medium text-slate-200">
                              {order.lineItemsSummary || '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs font-medium tabular-nums text-slate-100 whitespace-nowrap">
                              {order.currency} {order.totalPrice}
                            </td>
                            <td className="px-3 py-3">
                              <StatusDisplay status={order.pollStatus} />
                            </td>
                            <td className="px-3 py-3">
                              <DispatchStatusDisplay order={order} />
                            </td>
                            <td className="min-w-[110px] max-w-[165px] px-3 py-3">
                              <span
                                className={`font-mono text-xs ${
                                  isHighRto ? 'font-semibold text-amber-200' : 'text-slate-400'
                                }`}
                              >
                                {order.shopifyTags ? order.shopifyTags.replaceAll(',', ' ·') : '—'}
                              </span>
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
        </div>

        {/* Desktop / Tablet Right Column: Order & Customer WhatsApp Poll Inspector */}
        <div className="hidden min-w-0 md:block">
          {selectedOrder ? (
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 backdrop-blur-md">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono font-semibold text-white">
                      {selectedOrder.orderNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedOrder.financialStatus.toUpperCase()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-slate-200">
                      {selectedOrder.currency} {selectedOrder.totalPrice}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-white">
                    {selectedOrder.customerName}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                    {selectedOrder.customerPhone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  {(selectedOrder.trackingUrl || selectedOrder.trackingNumber) && (
                    <button
                      type="button"
                      onClick={() => void onSendTracking(selectedOrder.id)}
                      disabled={busyOrderId === selectedOrder.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                      {selectedOrder.trackingSentAt ? 'Resend Tracking' : 'Send Tracking'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void onResendPoll(selectedOrder.id)}
                    disabled={busyOrderId === selectedOrder.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Resend Poll
                  </button>
                </div>
              </div>

              {renderInspectorPanel(selectedOrder, false)}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 text-sm text-slate-400 backdrop-blur-md">
              Select an order from the table to inspect its WhatsApp poll and Shopify tag log.
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-Up Order Detail Bottom Sheet */}
      {mobileSheetOpen && selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Order ${selectedOrder.orderNumber} details`}
          data-testid="mobile-order-sheet"
          className="fixed inset-0 z-50 flex items-end md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileSheetOpen(false)}
          />
          <div className="mobile-sheet-enter relative z-10 flex max-h-[88vh] w-full flex-col rounded-t-3xl border-t border-slate-700/80 bg-slate-950/95 shadow-2xl">
            {/* Drag Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1 w-10 rounded-full bg-slate-700" aria-hidden="true" />
            </div>

            {/* Sticky Sheet Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono font-semibold text-white">
                    {selectedOrder.orderNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedOrder.financialStatus.toUpperCase()}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {selectedOrder.currency} {selectedOrder.totalPrice}
                  </span>
                </div>
                <h3 className="mt-0.5 truncate text-base font-semibold text-white">
                  {selectedOrder.customerName}
                </h3>
                <p className="font-mono text-xs text-slate-400 tabular-nums">
                  {selectedOrder.customerPhone}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close order details"
                onClick={() => setMobileSheetOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Sheet Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-5">
              {renderInspectorPanel(selectedOrder, true)}
            </div>

            {/* Thumb-Zone Bottom Sheet Action Bar */}
            <div className="flex items-center gap-2 border-t border-slate-800 bg-slate-950/95 px-4 py-3 pb-safe">
              {(selectedOrder.trackingUrl || selectedOrder.trackingNumber) && (
                <button
                  type="button"
                  onClick={() => void onSendTracking(selectedOrder.id)}
                  disabled={busyOrderId === selectedOrder.id}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50 whitespace-nowrap"
                >
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  {selectedOrder.trackingSentAt ? 'Resend Track' : 'Send Track'}
                </button>
              )}
              <button
                type="button"
                onClick={() => void onResendPoll(selectedOrder.id)}
                disabled={busyOrderId === selectedOrder.id}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Resend Poll
              </button>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
