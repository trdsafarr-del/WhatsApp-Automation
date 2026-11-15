import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileDown,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  Tag,
  Truck,
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

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <section aria-label="Order Confirmation Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-5 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400">Total Shopify Orders</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white">
            {metrics.totalOrders}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.avgResponseMinutes !== null
              ? `Avg reply ${metrics.avgResponseMinutes} min`
              : 'Waiting for replies'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-5 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400">Awaiting Poll Tap</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-amber-300">
            {metrics.pendingPolls}
          </p>
          <p className="mt-1 text-xs text-slate-400">Active WhatsApp polls</p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-5 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400">Tagged &ldquo;{settings.confirmTag}&rdquo;</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-400">
            {metrics.confirmedCount}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            {metrics.confirmationRate}% confirm rate · {readyToDispatchCount} ready today
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-5 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400">Tagged &ldquo;{settings.cancelTag}&rdquo;</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-rose-400">
            {metrics.cancelledCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Customer cancelled via poll</p>
        </div>
      </section>

      {(syncMessage || pdfFeedback) && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200 backdrop-blur-md">
          {pdfFeedback || syncMessage}
        </div>
      )}

      {/* Workspace Filter & Action Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
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
              className="w-full rounded-lg border border-slate-800 bg-slate-900/85 py-2 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter orders by poll or dispatch status"
            className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/85 p-1 backdrop-blur-md"
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
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => void onSyncShopify()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/85 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isSyncing ? 'Syncing...' : 'Sync Shopify'}
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Orders Table + Live Poll Inspector */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/75 backdrop-blur-md">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
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
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Shopify Orders'}
                </button>
                {orders.length === 0 && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap"
                  >
                    Configure Shopify
                  </button>
                )}
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Right Column: Order & Customer WhatsApp Poll Simulator */}
        <div className="min-w-0">
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

              {/* High RTO Alert Banner in Inspector */}
              {hasHighRtoTag(selectedOrder.shopifyTags) && (
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
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
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
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    inspectorTab === 'activity'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  Activity Log ({selectedOrder.events.length})
                </button>
              </div>

              {inspectorTab === 'details' ? (
                <>
                  {/* Order Items, Today Dispatch, Delivery, Note, Tracking & Current Shopify Tag */}
                  <div className="mt-4 space-y-2.5 border-b border-slate-800 pb-4 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-slate-400">Items</span>
                      <span className="text-right font-medium text-slate-100">
                        {selectedOrder.lineItemsSummary}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400">Today Dispatch</span>
                      <DispatchStatusDisplay order={selectedOrder} />
                    </div>
                    {selectedOrder.paymentMethod && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Payment</span>
                        <span className="font-mono text-xs font-medium text-slate-200">
                          {selectedOrder.paymentMethod}
                        </span>
                      </div>
                    )}
                    {selectedOrder.deliverySummary && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-400">Delivery</span>
                        <span className="text-right text-xs text-slate-300">
                          {selectedOrder.deliverySummary}
                        </span>
                      </div>
                    )}
                    {(selectedOrder.trackingUrl || selectedOrder.trackingNumber) && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-400">Tracking</span>
                        <div className="text-right text-xs">
                          <p className="font-mono font-medium text-slate-100">
                            {[selectedOrder.trackingCompany, selectedOrder.trackingNumber]
                              .filter(Boolean)
                              .join(' · ') || 'Fulfilled'}
                          </p>
                          {selectedOrder.trackingUrl && (
                            <a
                              href={selectedOrder.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-block break-all text-emerald-400 underline-offset-2 hover:underline"
                            >
                              {selectedOrder.trackingUrl}
                            </a>
                          )}
                          {selectedOrder.trackingSentAt && (
                            <p className="mt-0.5 text-[11px] text-emerald-400">
                              WhatsApp tracking sent at {formatRelativeTime(selectedOrder.trackingSentAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedOrder.orderNote && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-400">Order Note</span>
                        <span className="text-right text-xs font-medium text-amber-300">
                          {selectedOrder.orderNote}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                        Shopify Order Tags
                      </span>
                      <span
                        data-testid="selected-order-tags"
                        className="text-right font-mono text-xs font-semibold text-slate-100"
                      >
                        {selectedOrder.shopifyTags || 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Interactive WhatsApp Poll Preview */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                        Customer WhatsApp Poll Preview
                      </h4>
                      <StatusDisplay status={selectedOrder.pollStatus} />
                    </div>

                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/35 p-4">
                      <p className="text-sm leading-relaxed text-slate-200">
                        {selectedOrder.pollQuestion ||
                          `Hi ${selectedOrder.customerName}, confirm or cancel order ${selectedOrder.orderNumber}?`}
                      </p>

                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          disabled={busyOrderId === selectedOrder.id}
                          onClick={() =>
                            void onVoteOrder(selectedOrder.id, settings.confirmOptionLabel)
                          }
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                            selectedOrder.pollStatus === 'confirmed'
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
                          disabled={busyOrderId === selectedOrder.id}
                          onClick={() =>
                            void onVoteOrder(selectedOrder.id, settings.cancelOptionLabel)
                          }
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                            selectedOrder.pollStatus === 'cancelled_by_user'
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
                        Manual override: click either option above to update the Shopify order tag immediately.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* Chronological Automation Audit Trail */
                <div className="mt-4">
                  {selectedOrder.events.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">
                      No automation events logged yet for this order.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-800">
                      {selectedOrder.events.map((evt) => (
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
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 text-sm text-slate-400 backdrop-blur-md">
              Select an order from the table to inspect its WhatsApp poll and Shopify tag log.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
