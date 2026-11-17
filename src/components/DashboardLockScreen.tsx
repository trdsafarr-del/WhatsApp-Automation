import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { dashboardFetch } from '../lib/dashboardAuth';
import { LiveAmbientBackground } from './LiveAmbientBackground';

interface DashboardLockScreenProps {
  onUnlocked: (token: string) => void;
}

export function DashboardLockScreen({ onUnlocked }: DashboardLockScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcode.trim();
    if (!trimmed) {
      setErrorMsg('Please enter the dashboard password.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await dashboardFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: trimmed }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Incorrect password. Please try again.');
        return;
      }
      setPasscode('');
      onUnlocked(data.token || '');
    } catch {
      setErrorMsg('Unable to verify password right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <LiveAmbientBackground mode="hyper4d" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800/90 bg-slate-950/88 p-6 shadow-2xl shadow-black/70 backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-400">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Broomies Bakery · OrderPulse
            </p>
            <h1 className="font-display text-xl font-bold text-white">Dashboard Protected</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Enter admin password to access Shopify orders, WhatsApp QR, settings, and Geo-SEO controls.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="op-dashboard-password"
              className="block text-xs font-medium text-slate-300"
            >
              Admin Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="op-dashboard-password"
                type={showPasscode ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/95 py-3 pr-11 pl-4 font-mono text-base tracking-widest text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
              />
              <button
                type="button"
                aria-label={showPasscode ? 'Hide password' : 'Show password'}
                onClick={() => setShowPasscode((prev) => !prev)}
                className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
              >
                {showPasscode ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/12 px-3.5 py-2.5 text-xs font-medium text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>{submitting ? 'Verifying...' : 'Unlock Dashboard'}</span>
          </button>
        </form>

        <p className="mt-5 border-t border-slate-800/80 pt-4 text-center text-[11px] text-slate-500">
          Public storefront pincode check &amp; broomiesbakery.in SEO pages remain live automatically.
        </p>
      </div>
    </div>
  );
}
