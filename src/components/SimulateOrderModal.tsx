import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SimulateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    customerName: string;
    customerPhone: string;
    lineItemsSummary: string;
    totalPrice: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function SimulateOrderModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: SimulateOrderModalProps) {
  const [customerName, setCustomerName] = useState('Vikramaditya Rao');
  const [customerPhone, setCustomerPhone] = useState('+91 98450 91234');
  const [lineItemsSummary, setLineItemsSummary] = useState('Selvedge Denim Jacket (L)');
  const [totalPrice, setTotalPrice] = useState('2799.00');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Customer name and WhatsApp phone number are required.');
      return;
    }
    setError(null);
    await onSubmit({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      lineItemsSummary: lineItemsSummary.trim() || '1x Store Item',
      totalPrice: totalPrice.trim() || '999.00',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulate-order-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2
              id="simulate-order-title"
              className="text-lg font-semibold text-slate-900"
            >
              Simulate Incoming Shopify Order
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Triggers the live order creation pipeline and dispatches a WhatsApp confirmation poll automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="sim-customer-name"
              className="block text-sm font-medium text-slate-700"
            >
              Customer Name
            </label>
            <input
              id="sim-customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              placeholder="e.g. Aarav Mehta"
              required
            />
          </div>

          <div>
            <label
              htmlFor="sim-customer-phone"
              className="block text-sm font-medium text-slate-700"
            >
              Customer WhatsApp Number (with country code)
            </label>
            <input
              id="sim-customer-phone"
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              placeholder="+91 98450 91234"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              If WhatsApp QR is linked, the poll will be sent directly to this real phone number.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="sim-items"
                className="block text-sm font-medium text-slate-700"
              >
                Order Item Summary
              </label>
              <input
                id="sim-items"
                type="text"
                value={lineItemsSummary}
                onChange={(e) => setLineItemsSummary(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="sim-total"
                className="block text-sm font-medium text-slate-700"
              >
                Total (INR)
              </label>
              <input
                id="sim-total"
                type="text"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isSubmitting ? 'Dispatching Poll...' : 'Create Order & Send Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
