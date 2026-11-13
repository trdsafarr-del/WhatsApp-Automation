import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Send,
  Tag,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { AppSettings, OrderMetrics, OrderRecord, PollStatus } from '../lib/types';

interface OrdersViewProps {
  orders: OrderRecord[];
  metrics: OrderMetrics;
  settings: AppSettings;
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  onVoteOrder: (orderId: string, option: string) => Promise<void>;
  onResendPoll: (orderId: string) => Promise<void>;
  onSyncShopify: () => Promise<void>;
  onOpenSettings: () => void;
  busyOrderId: string | null;
  isSyncing: boolean;
  syncMessage: string | null;
}

type FilterTab = 'all' | 'pending' | 'confirmed' | 'cancelled';

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
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Confirmed
        </span>
      );
    case 'cancelled_by_user':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Cancelled by User
        </span>
      );
    case 'poll_sent':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Poll Sent
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Queued
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
  onSyncShopify,
  onOpenSettings,
  busyOrderId,
  isSyncing,
  syncMessage,
}: OrdersViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
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
        order.shopifyTags.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, search]);

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || orders[0] || null;

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <section aria-label="Order Confirmation Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Shopify Orders</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {metrics.totalOrders}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.avgResponseMinutes !== null
              ? `Avg reply ${metrics.avgResponseMinutes} min`
              : 'Waiting for replies'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Awaiting Poll Tap</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-amber-700">
            {metrics.pendingPolls}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active WhatsApp polls</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Tagged &ldquo;{settings.confirmTag}&rdquo;</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-700">
            {metrics.confirmedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {metrics.confirmationRate}% confirm rate
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Tagged &ldquo;{settings.cancelTag}&rdquo;</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-red-700">
            {metrics.cancelledCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Customer cancelled via poll</p>
        </div>
      </section>

      {syncMessage && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {syncMessage}
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
              placeholder="Search order #, name, phone..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter orders by poll status"
            className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1"
          >
            {(
              [
                { id: 'all', label: 'All' },
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
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
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
            onClick={() => void onSyncShopify()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isSyncing ? 'Syncing...' : 'Sync Shopify'}
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Orders Table (7 cols) + Live Poll Inspector (5 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-7">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-900">
                {orders.length === 0 ? 'No Shopify orders yet' : 'No matching orders found'}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {orders.length === 0
                  ? 'Save your Shopify .myshopify.com credentials in Automation & Shopify, then click Sync Shopify Orders or receive a live order webhook.'
                  : 'Try clearing your search or status filter to view all synced Shopify orders.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void onSyncShopify()}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Shopify Orders'}
                </button>
                {orders.length === 0 && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
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
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Poll Status</th>
                    <th className="px-4 py-3">Shopify Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order.id)}
                            className="text-left underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-700"
                          >
                            {order.orderNumber}
                          </button>
                          <div className="mt-0.5 font-sans text-[11px] font-normal text-slate-500 tabular-nums whitespace-nowrap">
                            {formatRelativeTime(order.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 whitespace-nowrap">{order.customerName}</div>
                          <div className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                            {order.customerPhone || 'No phone'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-medium tabular-nums text-slate-900 whitespace-nowrap">
                          {order.currency} {order.totalPrice}
                        </td>
                        <td className="px-4 py-3">
                          <StatusDisplay status={order.pollStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-700">
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
        <div className="xl:col-span-5">
          {selectedOrder ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedOrder.orderNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedOrder.financialStatus.toUpperCase()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {selectedOrder.currency} {selectedOrder.totalPrice}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {selectedOrder.customerName}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-slate-600 tabular-nums">
                    {selectedOrder.customerPhone}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void onResendPoll(selectedOrder.id)}
                  disabled={busyOrderId === selectedOrder.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Resend Poll
                </button>
              </div>

              {/* Order Items & Current Shopify Tag */}
              <div className="mt-4 space-y-2 border-b border-slate-200 pb-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Items</span>
                  <span className="text-right font-medium text-slate-800">
                    {selectedOrder.lineItemsSummary}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    Shopify Order Tags
                  </span>
                  <span
                    data-testid="selected-order-tags"
                    className="font-mono text-xs font-semibold text-slate-900"
                  >
                    {selectedOrder.shopifyTags || 'None'}
                  </span>
                </div>
              </div>

              {/* Interactive WhatsApp Poll Preview */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Customer WhatsApp Poll Preview
                  </h4>
                  <StatusDisplay status={selectedOrder.pollStatus} />
                </div>

                <div className="mt-3 rounded-xl bg-emerald-50/70 p-4">
                  <p className="text-sm leading-relaxed text-slate-800">
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
                      className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedOrder.pollStatus === 'confirmed'
                          ? 'border-emerald-600 bg-emerald-700 text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-600 hover:bg-emerald-50/60'
                      }`}
                    >
                      <span>{settings.confirmOptionLabel}</span>
                      <span className="font-mono text-xs opacity-85">
                        → tag: {settings.confirmTag}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={busyOrderId === selectedOrder.id}
                      onClick={() =>
                        void onVoteOrder(selectedOrder.id, settings.cancelOptionLabel)
                      }
                      className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedOrder.pollStatus === 'cancelled_by_user'
                          ? 'border-red-600 bg-red-700 text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-red-500 hover:bg-red-50/60'
                      }`}
                    >
                      <span>{settings.cancelOptionLabel}</span>
                      <span className="font-mono text-xs opacity-85">
                        → tag: {settings.cancelTag}
                      </span>
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Manual override: click either option above to update the Shopify order tag immediately.
                  </p>
                </div>
              </div>

              {/* Chronological Automation Audit Trail */}
              <div className="mt-5 border-t border-slate-200 pt-4">
                <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Automation Log
                </h4>
                <ul className="mt-3 space-y-2.5">
                  {selectedOrder.events.map((evt) => (
                    <li key={evt.id} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-slate-700">{evt.message}</span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                        {formatRelativeTime(evt.timestamp)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Select an order from the table to inspect its WhatsApp poll and Shopify tag log.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
