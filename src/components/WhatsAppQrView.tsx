import React, { useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Power,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { getWhatsAppDisplayState } from '../lib/orderRules';
import type { WhatsAppEngineMode, WhatsAppState } from '../lib/types';

interface WhatsAppQrViewProps {
  whatsapp: WhatsAppState;
  onConnect: (mode: WhatsAppEngineMode, fresh?: boolean) => Promise<void>;
  onRequestPairingCode: (phoneNumber: string) => Promise<void>;
  onRestart: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  isBusy: boolean;
}

export function WhatsAppQrView({
  whatsapp,
  onConnect,
  onRequestPairingCode,
  onRestart,
  onDisconnect,
  isBusy,
}: WhatsAppQrViewProps) {
  const [pairingPhone, setPairingPhone] = useState('');
  const display = getWhatsAppDisplayState(whatsapp);
  const isQrReady = whatsapp.status === 'qr_ready' && Boolean(whatsapp.qrDataUrl);
  const isConnecting = whatsapp.status === 'connecting';

  const formattedPairingCode = whatsapp.pairingCode
    ? whatsapp.pairingCode.length === 8
      ? `${whatsapp.pairingCode.slice(0, 4)}-${whatsapp.pairingCode.slice(4)}`
      : whatsapp.pairingCode
    : null;

  const showLinkedCard =
    display.isLinked && !isQrReady && !isConnecting && !formattedPairingCode;

  return (
    <div className="space-y-6">
      {/* Engine Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Official WhatsApp Web QR Connection
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Link once via official WhatsApp Linked Devices QR or 8-digit phone pairing code. Credentials stay saved so you never have to re-scan on server restarts.
          </p>
        </div>

        {whatsapp.isServerless && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-lg border p-3.5 text-xs ${
              display.isRemoteLinked
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
          >
            {display.isRemoteLinked ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-semibold">
                {display.isRemoteLinked
                  ? `Cloud-Synced Host Session Linked (${whatsapp.phoneNumber})`
                  : 'Serverless Environment Detected (Vercel)'}
              </p>
              <p className="mt-0.5 leading-relaxed">
                {display.isRemoteLinked
                  ? 'Your WhatsApp login session is synced from Cloud Redis—no QR re-scan is needed here. Vercel serverless stops functions between requests, so keep your persistent Node host (Railway / Render / AI Studio) active for 24/7 message sending & listening.'
                  : <>Vercel stops serverless functions after each request, so live WhatsApp QR pairing and 24/7 message listening cannot stay open on <span className="font-mono">vercel.app</span> alone. Run this app on Railway, Render, Fly.io, or a VPS (<span className="font-mono">npm start</span>) to link WhatsApp QR permanently.</>}
              </p>
            </div>
          </div>
        )}
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
                display.isLinked
                  ? 'text-emerald-700'
                  : isQrReady
                    ? 'text-amber-700'
                    : 'text-slate-600'
              }`}
            >
              {display.statusLabel}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            {showLinkedCard ? (
              <div className="w-full space-y-5 text-left" data-testid="whatsapp-linked-card">
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
                      {display.persistenceLabel}
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

                {display.isRemoteLinked && (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
                    {whatsapp.isServerless
                      ? 'Already logged in on your host server and synced to this dashboard via Upstash Redis.'
                      : 'Saved session credentials found in Redis. Click Restore Saved Session if the socket is idle.'}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {display.isLocalConnected ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onRestart()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Refresh Socket (Stay Logged In)
                    </button>
                  ) : !whatsapp.isServerless ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onConnect('baileys_qr', false)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Restore Saved Session
                    </button>
                  ) : null}

                  {!whatsapp.isServerless && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onDisconnect()}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 whitespace-nowrap shrink-0"
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden="true" />
                      Logout Device
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full space-y-5">
                {formattedPairingCode ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
                    <p className="text-xs font-medium text-emerald-900">
                      Enter this 8-character code in WhatsApp → Linked Devices → Link with phone number instead:
                    </p>
                    <p
                      data-testid="whatsapp-pairing-code"
                      className="mt-3 font-mono text-3xl font-bold tracking-[0.2em] text-slate-900"
                    >
                      {formattedPairingCode}
                    </p>
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
                    <div className="mx-auto max-w-sm space-y-1 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">
                        Open WhatsApp → Settings → Linked Devices → Link a Device
                      </p>
                      <p className="text-xs text-slate-500">
                        After scanning, wait 3–5 seconds while the secure session completes.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <Smartphone className="h-8 w-8 text-slate-400" aria-hidden="true" />
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        {isConnecting ? 'Completing WhatsApp handshake...' : 'QR Session Idle'}
                      </p>
                    </div>
                  </div>
                )}

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
                    onClick={() => void onConnect('baileys_qr', true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    {isBusy
                      ? 'Generating...'
                      : isQrReady
                        ? 'Reset & Fresh QR'
                        : 'Generate WhatsApp QR'}
                  </button>
                </div>

                {/* Alternative 8-digit Pairing Code Option */}
                <div className="border-t border-slate-200 pt-4 text-left">
                  <label
                    htmlFor="wa-pairing-phone"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    Or link using your phone number (8-digit pairing code)
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    If camera QR scan is not working on your phone, enter your WhatsApp number with country code (e.g. <span className="font-mono">919876543210</span>).
                  </p>
                  <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="wa-pairing-phone"
                      type="tel"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder="919876543210"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isBusy || !pairingPhone.trim()}
                      onClick={() => void onRequestPairingCode(pairingPhone)}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      Get Pairing Code
                    </button>
                  </div>
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
                1. One-Time QR / Pairing Login (No Repeated Scanning)
              </h4>
              <p className="mt-1 leading-relaxed">
                Multi-device encryption keys are saved continuously to <span className="font-mono text-xs text-slate-800">data/wa-auth</span> (and backed up to Upstash Redis when configured). Whenever the server restarts, it automatically restores your WhatsApp link without logging out.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-900">
                2. Seamless 515 Handshake &amp; Auto-Reconnect
              </h4>
              <p className="mt-1 leading-relaxed">
                Post-scan stream restarts (code 515), transient drops, or idle timeouts flush <span className="font-mono text-xs text-slate-800">creds.json</span> before reconnecting automatically. Auth keys are cleared only if you tap Logout on your phone or dashboard.
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
