import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Power,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { getWhatsAppDisplayState } from '../lib/orderRules';
import type { WhatsAppEngineMode, WhatsAppState } from '../lib/types';

interface WhatsAppQrViewProps {
  whatsapp: WhatsAppState;
  onConnect: (mode: WhatsAppEngineMode, fresh?: boolean) => Promise<void>;
  onRequestPairingCode: (phoneNumber: string) => Promise<void>;
  onRestart: () => Promise<void>;
  onPause: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  isBusy: boolean;
}

type LinkMethodTab = 'qr' | 'phone';

export function WhatsAppQrView({
  whatsapp,
  onConnect,
  onRequestPairingCode,
  onRestart,
  onPause,
  onDisconnect,
  isBusy,
}: WhatsAppQrViewProps) {
  const [linkMethod, setLinkMethod] = useState<LinkMethodTab>('qr');
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
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 backdrop-blur-md">
        <div>
          <h2 className="text-base font-semibold text-white">
            Official WhatsApp Web QR Connection
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Link once via official WhatsApp Linked Devices QR or 8-digit phone pairing code. Credentials stay saved so you never have to re-scan on server restarts.
          </p>
        </div>

        {whatsapp.isServerless && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-lg border p-3.5 text-xs ${
              display.isRemoteLinked
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/35 bg-amber-500/10 text-amber-200'
            }`}
          >
            {display.isRemoteLinked ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-semibold text-white">
                {display.isRemoteLinked
                  ? `Cloud-Synced Host Session Linked (${whatsapp.phoneNumber})`
                  : 'Serverless Environment Detected (Vercel)'}
              </p>
              <p className="mt-0.5 leading-relaxed">
                {display.isRemoteLinked
                  ? 'Your WhatsApp login session is synced from Cloud Redis—no QR re-scan is needed here. Vercel serverless stops functions between requests, so keep your persistent Node host (Railway / Render / AI Studio) active for 24/7 message sending & listening.'
                  : <>Vercel stops serverless functions after each request, so live WhatsApp QR pairing and 24/7 message listening cannot stay open on <span className="font-mono text-white">vercel.app</span> alone. Run this app on Railway, Render, Fly.io, or a VPS (<span className="font-mono text-white">npm start</span>) to link WhatsApp QR permanently.</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2-Column QR Scanner & 24/7 Session Persistence Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Live QR Display / Active Linked Device */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 backdrop-blur-md lg:col-span-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <QrCode className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-white">
                WhatsApp Linked Device
              </h3>
            </div>
            <span
              data-testid="whatsapp-connection-status"
              className={`text-xs font-semibold ${
                display.isLinked
                  ? 'text-emerald-400'
                  : isQrReady
                    ? 'text-amber-300'
                    : 'text-slate-400'
              }`}
            >
              {display.statusLabel}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            {showLinkedCard ? (
              <div className="w-full space-y-5 text-left" data-testid="whatsapp-linked-card">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 text-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {whatsapp.pushName || 'WhatsApp Linked Device'}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-emerald-200 tabular-nums">
                      {whatsapp.phoneNumber || 'Active Session'}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-slate-800 text-sm">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-400">Session Persistence</dt>
                    <dd className="font-medium text-emerald-400">
                      {display.persistenceLabel}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-400">Connected At</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-200">
                      {whatsapp.connectedAt
                        ? new Date(whatsapp.connectedAt).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-400">Last Keep-Alive Heartbeat</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-200">
                      {whatsapp.lastHeartbeatAt
                        ? new Date(whatsapp.lastHeartbeatAt).toLocaleTimeString()
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-400">Auto-Reconnect Counter</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-200">
                      {whatsapp.reconnectCount}
                    </dd>
                  </div>
                </dl>

                {display.isRemoteLinked && (
                  <p className="rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs leading-relaxed text-slate-400">
                    {whatsapp.isServerless
                      ? 'Already logged in on your host server and synced to this dashboard via Upstash Redis.'
                      : 'Saved session credentials found in Redis. Click Restore Saved Session if the socket is idle.'}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {display.isLocalConnected ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void onRestart()}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Refresh Socket (Stay Logged In)
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void onPause()}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/25 whitespace-nowrap shrink-0"
                      >
                        Pause Here (Let Railway Run 24/7)
                      </button>
                    </>
                  ) : !whatsapp.isServerless ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onConnect('baileys_qr', false)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0"
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
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 whitespace-nowrap shrink-0"
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden="true" />
                      Logout Device
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full space-y-5">
                {/* Method Switcher Tabs when Unlinked */}
                <div
                  role="tablist"
                  aria-label="WhatsApp Linking Method"
                  className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={linkMethod === 'qr'}
                    onClick={() => setLinkMethod('qr')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      linkMethod === 'qr'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    Scan QR Code
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={linkMethod === 'phone'}
                    onClick={() => setLinkMethod('phone')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      linkMethod === 'phone'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <KeyRound className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    8-Digit Phone Code
                  </button>
                </div>

                {formattedPairingCode ? (
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5">
                    <p className="text-xs font-medium text-emerald-200">
                      Enter this 8-character code in WhatsApp → Linked Devices → Link with phone number instead:
                    </p>
                    <p
                      data-testid="whatsapp-pairing-code"
                      className="mt-3 font-mono text-3xl font-bold tracking-[0.2em] text-white"
                    >
                      {formattedPairingCode}
                    </p>
                  </div>
                ) : linkMethod === 'qr' ? (
                  <div className="space-y-4">
                    {isQrReady && whatsapp.qrDataUrl ? (
                      <div className="space-y-4">
                        <div className="inline-block rounded-xl border border-slate-700 bg-white p-3 shadow-lg">
                          <img
                            src={whatsapp.qrDataUrl}
                            alt="Official WhatsApp Web QR Code"
                            referrerPolicy="no-referrer"
                            className="h-60 w-60 object-contain"
                          />
                        </div>
                        <div className="mx-auto max-w-sm space-y-1 text-sm text-slate-300">
                          <p className="font-medium text-white">
                            Open WhatsApp → Settings → Linked Devices → Link a Device
                          </p>
                          <p className="text-xs text-slate-400">
                            After scanning, wait 3–5 seconds while the secure session completes.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4">
                          <Smartphone className="h-8 w-8 text-slate-500" aria-hidden="true" />
                          <p className="mt-2 text-xs font-medium text-slate-400">
                            {isConnecting ? 'Completing WhatsApp handshake...' : 'QR Session Idle'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void onConnect('baileys_qr', true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <QrCode className="h-4 w-4" aria-hidden="true" />
                        {isBusy
                          ? 'Generating...'
                          : isQrReady
                            ? 'Reset & Fresh QR'
                            : 'Generate WhatsApp QR'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left">
                    <label
                      htmlFor="wa-pairing-phone"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      Link using your WhatsApp phone number
                    </label>
                    <p className="mt-1 text-xs text-slate-400">
                      Enter your WhatsApp number with country code (e.g. <span className="font-mono text-slate-200">919876543210</span>).
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        id="wa-pairing-phone"
                        type="tel"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        placeholder="919876543210"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isBusy || !pairingPhone.trim()}
                        onClick={() => void onRequestPairingCode(pairingPhone)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        Get Pairing Code
                      </button>
                    </div>
                  </div>
                )}

                {whatsapp.lastError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-left text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <span>{whatsapp.lastError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: 24/7 Persistence Architecture & Guarantees */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-6 backdrop-blur-md lg:col-span-6">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">
              24/7 Always-On Session Architecture
            </h3>
          </div>

          <div className="mt-5 space-y-5 text-sm text-slate-300">
            <div>
              <h4 className="font-medium text-white">
                1. One-Time QR / Pairing Login (No Repeated Scanning)
              </h4>
              <p className="mt-1 leading-relaxed text-slate-400">
                Multi-device encryption keys are saved continuously to <span className="font-mono text-xs text-slate-200">data/wa-auth</span> (and backed up to Upstash Redis when configured). Whenever the server restarts, it automatically restores your WhatsApp link without logging out.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white">
                2. Seamless 515 Handshake &amp; Auto-Reconnect
              </h4>
              <p className="mt-1 leading-relaxed text-slate-400">
                Post-scan stream restarts (code 515), transient drops, or idle timeouts flush <span className="font-mono text-xs text-slate-200">creds.json</span> before reconnecting automatically. Auth keys are cleared only if you tap Logout on your phone or dashboard.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white">
                3. Native WhatsApp Poll + Text Reply Fallback
              </h4>
              <p className="mt-1 leading-relaxed text-slate-400">
                Customers receive a native 1-tap WhatsApp Poll (<span className="font-medium text-slate-200">Confirm Order</span> / <span className="font-medium text-slate-200">Cancel Order</span>). If a customer replies with text (<span className="font-mono text-xs text-slate-200">1</span>, <span className="font-mono text-xs text-slate-200">2</span>, <span className="font-mono text-xs text-slate-200">confirm</span>, <span className="font-mono text-xs text-slate-200">cancel</span>), OrderPulse still detects it and updates Shopify tags automatically.
              </p>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <p className="text-xs font-semibold text-slate-200">
                24/7 Hosting Note
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                For 24/7 QR uptime without logging out, run this app on a persistent Node host (Render / Railway / Fly.io / VPS) where <span className="font-mono text-slate-200">data/wa-auth</span> stays saved on disk. See the <span className="font-medium text-slate-200">Install &amp; Deploy</span> tab for exact steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
