import React from 'react';
import {
  CheckCircle2,
  Power,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import type { WhatsAppEngineMode, WhatsAppState } from '../lib/types';

interface WhatsAppQrViewProps {
  whatsapp: WhatsAppState;
  onConnect: (mode: WhatsAppEngineMode) => Promise<void>;
  onRestart: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  isBusy: boolean;
}

export function WhatsAppQrView({
  whatsapp,
  onConnect,
  onRestart,
  onDisconnect,
  isBusy,
}: WhatsAppQrViewProps) {
  const isConnected = whatsapp.status === 'connected';
  const isQrReady = whatsapp.status === 'qr_ready' && Boolean(whatsapp.qrDataUrl);
  const isConnecting = whatsapp.status === 'connecting';

  return (
    <div className="space-y-6">
      {/* Engine Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Official WhatsApp Web QR Connection
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Link once via official WhatsApp Linked Devices QR. Credentials stay saved on disk so you never have to re-scan on server restarts.
          </p>
        </div>
      </div>

      {/* 2-Column QR Scanner & 24/7 Session Persistence Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Live QR Display / Active Linked Device */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <QrCode className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900">
                Scan Official WhatsApp QR
              </h3>
            </div>
            <span
              data-testid="whatsapp-connection-status"
              className={`text-xs font-semibold ${
                isConnected
                  ? 'text-emerald-700'
                  : isQrReady
                    ? 'text-amber-700'
                    : 'text-slate-600'
              }`}
            >
              {isConnected
                ? 'Connected · 24/7 Active'
                : isQrReady
                  ? 'Scan QR Now'
                  : isConnecting
                    ? 'Generating QR...'
                    : 'Not Linked'}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            {isConnected ? (
              <div className="w-full space-y-5 text-left">
                <div className="flex items-start gap-3 rounded-xl bg-emerald-50/70 p-4">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {whatsapp.pushName || 'WhatsApp Linked Device'}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-slate-700 tabular-nums">
                      {whatsapp.phoneNumber || 'Active Session'}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-slate-100 text-sm">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Session Persistence</dt>
                    <dd className="font-medium text-emerald-700">
                      {whatsapp.sessionPersisted ? 'Saved (Auto-Restore on Boot)' : 'Active in Memory'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Connected At</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-800">
                      {whatsapp.connectedAt
                        ? new Date(whatsapp.connectedAt).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Last Keep-Alive Heartbeat</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-800">
                      {whatsapp.lastHeartbeatAt
                        ? new Date(whatsapp.lastHeartbeatAt).toLocaleTimeString()
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Auto-Reconnect Counter</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-800">
                      {whatsapp.reconnectCount}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void onRestart()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Refresh Socket (Stay Logged In)
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void onDisconnect()}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 whitespace-nowrap shrink-0"
                  >
                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                    Logout Device
                  </button>
                </div>
              </div>
            ) : isQrReady && whatsapp.qrDataUrl ? (
              <div className="space-y-4">
                <div className="inline-block rounded-xl border border-slate-200 bg-white p-3">
                  <img
                    src={whatsapp.qrDataUrl}
                    alt="Official WhatsApp Web QR Code"
                    referrerPolicy="no-referrer"
                    className="h-60 w-60 object-contain"
                  />
                </div>
                <div className="max-w-sm space-y-1 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">
                    Open WhatsApp → Settings → Linked Devices → Link a Device
                  </p>
                  <p className="text-xs text-slate-500">
                    Scan once. Your session credentials stay saved automatically for 24/7 operation.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void onConnect('baileys_qr')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Regenerate QR
                </button>
              </div>
            ) : (
              <div className="w-full space-y-5 py-4">
                <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <Smartphone className="h-8 w-8 text-slate-400" aria-hidden="true" />
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    {isConnecting ? 'Connecting to WhatsApp...' : 'QR Session Idle'}
                  </p>
                </div>

                {whatsapp.lastError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{whatsapp.lastError}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void onConnect('baileys_qr')}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    {isConnecting ? 'Waiting for QR...' : 'Generate WhatsApp QR'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: 24/7 Persistence Architecture & Guarantees */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900">
              24/7 Always-On Session Architecture
            </h3>
          </div>

          <div className="mt-5 space-y-5 text-sm text-slate-600">
            <div>
              <h4 className="font-medium text-slate-900">
                1. One-Time QR Login (No Repeated Scanning)
              </h4>
              <p className="mt-1 leading-relaxed">
                Multi-device encryption keys are saved continuously to <span className="font-mono text-xs text-slate-800">data/wa-auth</span>. Whenever the server restarts, it automatically restores your WhatsApp link without logging out.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-900">
                2. Auto-Reconnect & 45s Keep-Alive Heartbeat
              </h4>
              <p className="mt-1 leading-relaxed">
                Transient network drops, stream resets (code 515), or idle timeouts automatically trigger exponential-backoff reconnection. Auth keys are cleared only if you manually tap Logout.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-900">
                3. Native WhatsApp Poll + Text Reply Fallback
              </h4>
              <p className="mt-1 leading-relaxed">
                Customers receive a native 1-tap WhatsApp Poll (<span className="font-medium text-slate-800">Confirm Order</span> / <span className="font-medium text-slate-800">Cancel Order</span>). If a customer replies with text (<span className="font-mono text-xs">1</span>, <span className="font-mono text-xs">2</span>, <span className="font-mono text-xs">confirm</span>, <span className="font-mono text-xs">cancel</span>), OrderPulse still detects it and updates Shopify tags automatically.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-800">
                24/7 Hosting Note
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                For 24/7 QR uptime without logging out, run this app on a persistent Node host (Render / Railway / Fly.io / VPS) where <span className="font-mono text-slate-800">data/wa-auth</span> stays saved on disk. See the <span className="font-medium text-slate-900">Install &amp; Deploy</span> tab for exact steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
