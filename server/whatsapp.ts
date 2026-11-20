import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import {
  DEFAULT_SETTINGS,
  classifyWhatsAppDisconnect,
  detectHostRuntimeKind,
  formatJidToDisplayPhone,
  formatOrderTemplate,
  formatPollPayload,
  isTransientWhatsAppError,
  mergeShopifyTags,
  normalizePhoneToWhatsAppJid,
  resolvePollVoteAction,
  shouldAutoDispatchPoll,
  shouldSkipAutoRestoreForRemoteHost,
} from '../src/lib/orderRules.js';
import type { OrderRecord, WhatsAppEngineMode, WhatsAppState } from '../src/lib/types.js';
import { hasLiveShopifyCredentials, updateShopifyOrderTags } from './shopify.js';
import { store } from './store.js';

function decodeBinaryBuffer(val: unknown): Buffer | null {
  if (!val) return null;
  if (Buffer.isBuffer(val)) return val;
  if (val instanceof Uint8Array) return Buffer.from(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    return Buffer.from(trimmed, 'base64');
  }
  if (typeof val === 'object') {
    const obj = val as { type?: string; data?: unknown };
    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return Buffer.from(obj.data as number[]);
    }
    const numericKeys = Object.keys(obj)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    if (numericKeys.length > 0) {
      return Buffer.from(numericKeys.map((k) => Number((obj as Record<string, unknown>)[k])));
    }
  }
  return null;
}

const AUTH_DIR = process.env.VERCEL
  ? '/tmp/orderpulse-data/wa-auth'
  : process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR, 'wa-auth')
    : path.resolve(process.cwd(), 'data', 'wa-auth');
const CREDS_BACKUP_PATH = path.join(path.dirname(AUTH_DIR), 'wa-auth-creds.backup.json');

class WhatsAppManager {
  private sock: WASocket | null = null;
  private status: WhatsAppState['status'] = 'disconnected';
  private qrDataUrl: string | null = null;
  private qrRaw: string | null = null;
  private pairingCode: string | null = null;
  private lastHeartbeatAt: string | null = null;
  private reconnectCount = 0;
  private consecutiveBadSessions = 0;
  private lastError: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private queueFlushTimer: NodeJS.Timeout | null = null;
  private authBackupTimer: NodeJS.Timeout | null = null;
  private credsSaveQueue: Promise<void> = Promise.resolve();
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private initialWaiters: Array<() => void> = [];

  private inFlightDispatches = new Set<string>();
  private inFlightTracking = new Set<string>();

  constructor() {
    void this.restorePersistedSession();
  }

  isConnected(): boolean {
    return Boolean(this.sock && this.status === 'connected');
  }

  private hasSavedAuth(): boolean {
    return fs.existsSync(path.join(AUTH_DIR, 'creds.json')) || fs.existsSync(CREDS_BACKUP_PATH);
  }

  private parseCredsRegistered(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        registered?: boolean;
        me?: { id?: string };
      };
      // In Baileys v7, QR-paired sessions populate `creds.me.id` while leaving `registered` false
      return Boolean(raw.registered || raw.me?.id);
    } catch {
      return false;
    }
  }

  /**
   * Atomically mirrors valid registered creds.json so a crash or restart mid-write
   * can never corrupt creds.json and force a logout.
   */
  private writeAtomicCredsBackup() {
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (!this.parseCredsRegistered(credsPath)) return;
    try {
      const content = fs.readFileSync(credsPath, 'utf8');
      const dir = path.dirname(CREDS_BACKUP_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmp = `${CREDS_BACKUP_PATH}.tmp`;
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, CREDS_BACKUP_PATH);
    } catch {
      // Non-fatal backup error
    }
  }

  private recoverCredsFromBackupIfCorrupt(): boolean {
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (this.parseCredsRegistered(credsPath)) return true;
    if (!this.parseCredsRegistered(CREDS_BACKUP_PATH)) return false;
    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      const content = fs.readFileSync(CREDS_BACKUP_PATH, 'utf8');
      const tmp = `${credsPath}.tmp`;
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, credsPath);
      return true;
    } catch {
      return false;
    }
  }

  private isAuthRegistered(): boolean {
    if (this.parseCredsRegistered(path.join(AUTH_DIR, 'creds.json'))) {
      return true;
    }
    return this.recoverCredsFromBackupIfCorrupt();
  }

  private notifyWaiters() {
    if (this.initialWaiters.length === 0) return;
    const waiters = this.initialWaiters.splice(0);
    for (const resolve of waiters) {
      resolve();
    }
  }

  private waitForQrOrOpen(timeoutMs = 8000): Promise<void> {
    if (this.status === 'qr_ready' || this.status === 'connected' || this.status === 'error') {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      this.initialWaiters.push(finish);
    });
  }

  private async restorePersistedSession() {
    if (process.env.VERCEL) return;
    await store.ensureHydrated();
    const meta = store.getWhatsAppMeta();
    const currentHost = detectHostRuntimeKind();
    if (
      shouldSkipAutoRestoreForRemoteHost({
        currentHost,
        activeHostKind: meta.activeHostKind,
        lastHeartbeatAt: meta.lastHeartbeatAt,
      })
    ) {
      // Leave the 24/7 Railway / cloud production WhatsApp socket undisturbed
      return;
    }

    this.recoverCredsFromBackupIfCorrupt();
    if (!this.isAuthRegistered() && store.isCloudSyncEnabled()) {
      await store.restoreAuthFiles(AUTH_DIR);
    }
    if (this.hasSavedAuth() && this.isAuthRegistered()) {
      this.writeAtomicCredsBackup();
      if (store.isCloudSyncEnabled()) {
        void store.backupAuthFiles(AUTH_DIR, { force: true });
      }
      // Auto-restore 24/7 WhatsApp Web QR session without requiring re-scan
      void this.connect('baileys_qr');
    } else if (this.hasSavedAuth() && !this.isAuthRegistered()) {
      // Clean up half-finished unregistered pairing files from an interrupted QR scan
      this.clearAuthFiles();
    }
  }

  private scheduleAuthBackup(force = false) {
    if (!store.isCloudSyncEnabled()) return;
    if (this.authBackupTimer) clearTimeout(this.authBackupTimer);
    this.authBackupTimer = setTimeout(() => {
      void store.backupAuthFiles(AUTH_DIR, { force });
    }, force ? 1500 : 8_000);
  }

  private startHeartbeat() {
    if (process.env.VERCEL) return;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.status !== 'connected') return;
      const now = new Date().toISOString();
      this.lastHeartbeatAt = now;
      store.recordWhatsAppHeartbeat({
        lastHeartbeatAt: now,
        activeHostKind: detectHostRuntimeKind(),
      });
    }, 90_000);

    if (this.queueFlushTimer) clearInterval(this.queueFlushTimer);
    this.queueFlushTimer = setInterval(() => {
      if (this.isConnected() && store.getQueuedOrders().length > 0) {
        void this.flushQueuedOrders();
      }
    }, 15_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.queueFlushTimer) {
      clearInterval(this.queueFlushTimer);
      this.queueFlushTimer = null;
    }
  }

  getState(): WhatsAppState {
    const meta = store.getWhatsAppMeta();
    const hostKind = detectHostRuntimeKind();
    const localRegistered = this.hasSavedAuth() && this.isAuthRegistered();
    const isDifferentCloudHost =
      Boolean(meta.activeHostKind) &&
      meta.activeHostKind !== hostKind &&
      (meta.activeHostKind === 'railway' || meta.activeHostKind === 'cloud');
    const remoteSessionActive =
      Boolean(meta.connectedAt && meta.phoneNumber) &&
      (Boolean(process.env.VERCEL) || isDifferentCloudHost);
    return {
      status: this.status,
      mode: meta.mode,
      phoneNumber: localRegistered || remoteSessionActive ? meta.phoneNumber : null,
      pushName: localRegistered || remoteSessionActive ? meta.pushName : null,
      qrDataUrl: this.qrDataUrl,
      qrRaw: this.qrRaw,
      pairingCode: this.pairingCode,
      isServerless: Boolean(process.env.VERCEL),
      connectedAt: localRegistered || remoteSessionActive ? meta.connectedAt : null,
      lastHeartbeatAt:
        this.lastHeartbeatAt || (localRegistered || remoteSessionActive ? meta.lastHeartbeatAt : null) || null,
      reconnectCount: this.reconnectCount,
      sessionPersisted: localRegistered || remoteSessionActive,
      cloudAuthBackupEnabled: store.isCloudSyncEnabled(),
      remoteSessionActive,
      activeHostKind: meta.activeHostKind || null,
      hostKind,
      lastError: this.lastError,
    };
  }

  async connect(
    requestedMode?: WhatsAppEngineMode,
    options?: { fresh?: boolean; waitForQr?: boolean; fromReconnect?: boolean }
  ): Promise<WhatsAppState> {
    const mode: WhatsAppEngineMode = requestedMode || 'baileys_qr';
    store.updateWhatsAppMeta({ mode });
    store.updateSettings({ whatsappMode: mode });
    this.lastError = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.isInitializing) {
      if (options?.fromReconnect && this.initPromise) {
        // Wait for current socket setup to finish, then run the reconnect cleanly (never drop 515!)
        await this.initPromise.catch(() => {});
      } else {
        if (options?.waitForQr !== false) {
          await this.waitForQrOrOpen();
        }
        return this.getState();
      }
    }

    this.isInitializing = true;
    this.status = 'connecting';
    this.qrDataUrl = null;
    this.qrRaw = null;
    if (options?.fresh) {
      this.pairingCode = null;
      this.reconnectCount = 0;
      this.consecutiveBadSessions = 0;
    }

    let resolveInit!: () => void;
    this.initPromise = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });

    try {
      // Wait for any in-flight creds.json save (especially during 515 post-scan restart)
      await this.credsSaveQueue;
      await this.closeSocketOnly();

      // Clean stale unregistered pairing files when user explicitly requests a fresh QR
      if (options?.fresh) {
        this.clearAuthFiles();
        void store.clearRemoteAuth();
      } else {
        this.recoverCredsFromBackupIfCorrupt();
      }

      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      // Never pull stale cloud auth back in when the user explicitly asked for a fresh QR login
      if (!options?.fresh && !this.isAuthRegistered() && store.isCloudSyncEnabled()) {
        await store.restoreAuthFiles(AUTH_DIR);
      }

      if (!this.isAuthRegistered()) {
        store.updateWhatsAppMeta({
          mode: 'baileys_qr',
          connectedAt: null,
          lastHeartbeatAt: null,
          phoneNumber: null,
          pushName: null,
        });
      }

      const [baileys, pinoMod, qrMod] = await Promise.all([
        import('@whiskeysockets/baileys'),
        import('pino'),
        import('qrcode'),
      ]);
      const makeWASocket = baileys.default;
      const {
        Browsers,
        DisconnectReason,
        decryptPollVote,
        fetchLatestBaileysVersion,
        fetchLatestWaWebVersion,
        getAggregateVotesInPollMessage,
        jidNormalizedUser,
        makeCacheableSignalKeyStore,
        normalizeMessageContent,
        useMultiFileAuthState,
      } = baileys;
      const logger = pinoMod.default({ level: 'silent' });
      const QRCode = qrMod.default;

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      let version: [number, number, number] | undefined;
      try {
        // Prefer live WhatsApp Web version directly from web.whatsapp.com (avoids stale Baileys manifest causing QR handshake failures)
        const waWeb = await Promise.race([
          fetchLatestWaWebVersion({}),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('WA Web version timeout')), 4000)
          ),
        ]);
        if (Array.isArray(waWeb?.version) && waWeb.version.length === 3) {
          version = waWeb.version;
        }
      } catch {
        // Fall through to Baileys manifest fallback
      }
      if (!version) {
        try {
          const fetched = await Promise.race([
            fetchLatestBaileysVersion(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Version check timeout')), 4000)
            ),
          ]);
          version = fetched.version;
        } catch {
          // Fallback to Baileys default version if version check endpoints are unreachable
        }
      }

      const sock = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: false,
        syncFullHistory: false,
        browser: Browsers.macOS('Chrome'),
        connectTimeoutMs: 45_000,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 20_000,
        retryRequestDelayMs: 500,
        getMessage: async (key) => {
          if (!key.id) return undefined;
          const cached = store.getPollMessage(key.id) as WAMessage | undefined;
          return cached?.message || undefined;
        },
      });

      this.sock = sock;

      sock.ev.on('creds.update', () => {
        if (this.sock !== sock) return;
        this.credsSaveQueue = this.credsSaveQueue
          .then(() => saveCreds())
          .then(() => {
            this.writeAtomicCredsBackup();
            this.scheduleAuthBackup();
          })
          .catch(() => {
            // Keep queue healthy
          });
      });

      sock.ev.on('connection.update', async (update) => {
        if (this.sock !== sock) return;
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRaw = qr;
          this.qrDataUrl = await QRCode.toDataURL(qr, {
            width: 380,
            margin: 4,
            errorCorrectionLevel: 'L',
            color: { dark: '#000000', light: '#ffffff' },
          });
          this.status = 'qr_ready';
          this.lastError = null;
          this.notifyWaiters();
        }

        if (connection === 'open') {
          const now = new Date().toISOString();
          this.status = 'connected';
          this.reconnectCount = 0;
          this.consecutiveBadSessions = 0;
          this.qrDataUrl = null;
          this.qrRaw = null;
          this.pairingCode = null;
          this.lastHeartbeatAt = now;
          this.lastError = null;
          const userId = sock.user?.id || '';
          store.updateWhatsAppMeta({
            mode: 'baileys_qr',
            connectedAt: now,
            lastHeartbeatAt: now,
            activeHostKind: detectHostRuntimeKind(),
            phoneNumber: userId ? formatJidToDisplayPhone(userId) : 'Linked Device',
            pushName: sock.user?.name || 'WhatsApp Business',
          });
          this.writeAtomicCredsBackup();
          this.scheduleAuthBackup(true);
          this.startHeartbeat();
          this.notifyWaiters();
          void this.flushQueuedOrders();
        }

        if (connection === 'close') {
          this.stopHeartbeat();
          const statusCode = (
            lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
          )?.output?.statusCode;
          const errMessage =
            lastDisconnect?.error instanceof Error
              ? lastDisconnect.error.message
              : 'WhatsApp socket closed';

          const action = classifyWhatsAppDisconnect({
            statusCode,
            errMessage,
            isAuthRegistered: this.isAuthRegistered(),
            consecutiveBadSessions: this.consecutiveBadSessions,
          });

          if (action === 'logout_clear_auth') {
            this.consecutiveBadSessions = 0;
            this.clearAuthFiles();
            void store.clearRemoteAuth();
            this.status = 'disconnected';
            this.qrDataUrl = null;
            this.qrRaw = null;
            this.pairingCode = null;
            this.lastError =
              statusCode === DisconnectReason.loggedOut
                ? 'Device logged out from WhatsApp phone. Click Generate WhatsApp QR to link again.'
                : 'Session expired or mismatched. Click Generate WhatsApp QR to link fresh.';
            store.updateWhatsAppMeta({
              connectedAt: null,
              lastHeartbeatAt: null,
              phoneNumber: null,
              pushName: null,
            });
            this.notifyWaiters();
          } else if (action === 'pause_keep_auth') {
            // Another persistent host (e.g. Railway / preview tab) took over this WhatsApp session; pause without wiping auth
            this.status = 'disconnected';
            this.qrDataUrl = null;
            this.qrRaw = null;
            this.pairingCode = null;
            this.lastError =
              'WhatsApp session was replaced by another server instance. Keep only one 24/7 server active at a time, or click Restore Saved Session when ready.';
            this.notifyWaiters();
          } else if (action === 'restart_immediate') {
            // Normal post-QR-scan handshake (515): flush creds.json and reconnect immediately without error flash
            this.status = 'connecting';
            this.lastError = null;
            await this.credsSaveQueue;
            this.writeAtomicCredsBackup();
            if (!process.env.VERCEL) {
              if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
              this.reconnectTimer = setTimeout(() => {
                void this.connect('baileys_qr', { waitForQr: false, fromReconnect: true });
              }, 250);
            }
          } else if (action === 'reconnect_bad_session') {
            // Transient 500 badSession: retry up to 3 times without wiping saved credentials
            this.consecutiveBadSessions += 1;
            this.reconnectCount += 1;
            this.status = 'connecting';
            this.lastError = null;
            await this.credsSaveQueue;
            this.writeAtomicCredsBackup();
            if (!process.env.VERCEL) {
              const delayMs = this.consecutiveBadSessions === 1 ? 3_000 : this.consecutiveBadSessions === 2 ? 7_000 : 15_000;
              if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
              this.reconnectTimer = setTimeout(() => {
                void this.connect('baileys_qr', { waitForQr: false, fromReconnect: true });
              }, delayMs);
            }
            this.notifyWaiters();
          } else if (action === 'qr_timeout_clear_unregistered') {
            // Stop cleanly when QR wasn't scanned within timeout instead of spinning forever
            this.clearAuthFiles();
            this.status = 'disconnected';
            this.qrDataUrl = null;
            this.qrRaw = null;
            this.pairingCode = null;
            this.lastError = 'QR code expired without scanning. Click Generate WhatsApp QR to get a new one.';
            this.notifyWaiters();
          } else if (!process.env.VERCEL) {
            // Auto-reconnect 24/7 for transient drops without logging out
            this.reconnectCount += 1;
            this.status = 'connecting';
            this.lastError = errMessage;
            await this.credsSaveQueue;
            this.writeAtomicCredsBackup();
            const delayMs = Math.min(30_000, 2_500 * Math.min(this.reconnectCount, 6));
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              void this.connect('baileys_qr', { waitForQr: false, fromReconnect: true });
            }, delayMs);
            this.notifyWaiters();
          } else {
            this.notifyWaiters();
          }
        }
      });

      // Listen for native WhatsApp Poll vote updates (for Baileys builds that emit messages.update)
      sock.ev.on('messages.update', async (updates) => {
        const normalizedSelfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : undefined;
        for (const { key, update } of updates) {
          if (!update.pollUpdates || !key.id) continue;
          const pollCreationMsg = store.getPollMessage(key.id) as WAMessage | undefined;
          if (!pollCreationMsg) continue;

          try {
            const votes = getAggregateVotesInPollMessage(
              {
                message: pollCreationMsg.message,
                pollUpdates: update.pollUpdates,
              },
              normalizedSelfJid || sock.user?.id
            );

            const selected = votes.find((v) => v.voters && v.voters.length > 0);
            if (!selected) continue;

            const order = store.getOrderByWhatsAppMessageId(key.id);
            if (order) {
              await this.applyVoteToOrder(
                order.id,
                selected.name,
                'whatsapp_poll',
                key.remoteJid || undefined
              );
            }
          } catch {
            // Ignore undecryptable duplicate vote events
          }
        }
      });

      // Listen for encrypted WhatsApp Poll taps (Baileys v7 emits pollUpdateMessage here) AND text/button replies
      sock.ev.on('messages.upsert', async ({ messages }) => {
        const settings = store.getSettings();
        for (const msg of messages) {
          if (!msg.message || !msg.key.remoteJid) continue;
          const normalizedContent = normalizeMessageContent(msg.message);

          if (normalizedContent?.pollUpdateMessage) {
            await this.handleIncomingPollUpdate(sock, msg, normalizedContent.pollUpdateMessage, {
              decryptPollVote,
              getAggregateVotesInPollMessage,
              jidNormalizedUser,
            });
            continue;
          }

          if (msg.key.fromMe) continue;

          const text =
            normalizedContent?.conversation ||
            normalizedContent?.extendedTextMessage?.text ||
            normalizedContent?.buttonsResponseMessage?.selectedDisplayText ||
            normalizedContent?.templateButtonReplyMessage?.selectedDisplayText ||
            normalizedContent?.listResponseMessage?.title ||
            '';
          if (!text.trim()) continue;

          const resolution = resolvePollVoteAction(text, settings);
          if (!resolution) continue;

          const keyWithAlt = msg.key as typeof msg.key & {
            remoteJidAlt?: string;
            participantAlt?: string;
          };
          const preferredReplyJid = msg.key.remoteJid;
          const resolvedJid =
            keyWithAlt.remoteJidAlt || keyWithAlt.participantAlt || msg.key.remoteJid;
          const senderDigits = resolvedJid.split('@')[0].split(':')[0].replace(/\D/g, '');
          if (!senderDigits) continue;

          const order = store.findLatestPendingOrderByPhone(senderDigits);
          if (order) {
            await this.applyVoteToOrder(order.id, text, 'whatsapp_text', preferredReplyJid);
          }
        }
      });

      // Release initialization lock BEFORE waiting for QR/open so a fast 515 post-scan restart is never blocked
      this.isInitializing = false;
      this.initPromise = null;
      resolveInit();

      if (options?.waitForQr !== false) {
        await this.waitForQrOrOpen(8000);
      }
    } catch (err) {
      this.isInitializing = false;
      this.initPromise = null;
      resolveInit();
      this.status = 'error';
      this.lastError =
        err instanceof Error
          ? err.message
          : 'Unable to start WhatsApp Web QR socket in this network environment.';
      if (!process.env.VERCEL && this.isAuthRegistered()) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          void this.connect('baileys_qr', { waitForQr: false, fromReconnect: true });
        }, 10_000);
      }
      this.notifyWaiters();
    }

    return this.getState();
  }

  /**
   * Alternative 8-digit Pairing Code login ("Link with phone number instead")
   * when camera QR scanning is inconvenient or failing.
   */
  async requestPairingCode(rawPhoneNumber: string): Promise<WhatsAppState> {
    const settings = store.getSettings();
    const jid = normalizePhoneToWhatsAppJid(rawPhoneNumber, settings.defaultCountryCode);
    if (!jid) {
      this.lastError = 'Enter a valid WhatsApp phone number with country code (e.g. 919876543210).';
      return this.getState();
    }
    const digits = jid.split('@')[0];

    await this.connect('baileys_qr', { fresh: true, waitForQr: true });
    if (!this.sock) {
      this.lastError = 'Unable to open WhatsApp socket for pairing code.';
      return this.getState();
    }
    if (this.status === 'connected') {
      return this.getState();
    }

    try {
      const code = await this.sock.requestPairingCode(digits);
      this.pairingCode = code;
      this.qrDataUrl = null;
      this.qrRaw = null;
      this.status = 'qr_ready';
      this.lastError = null;
    } catch (err) {
      this.lastError =
        err instanceof Error ? err.message : 'Failed to generate 8-digit WhatsApp pairing code.';
    }

    return this.getState();
  }

  async flushQueuedOrders(): Promise<void> {
    if (!this.sock || this.status !== 'connected') return;
    const settings = store.getSettings();
    const queued = store.getQueuedOrders();
    for (const order of queued) {
      if (shouldAutoDispatchPoll(order, settings)) {
        await this.dispatchOrderPoll(order);
      }
    }
  }

  async shutdownGracefully(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.authBackupTimer) {
      clearTimeout(this.authBackupTimer);
      this.authBackupTimer = null;
    }
    await this.credsSaveQueue;
    this.writeAtomicCredsBackup();
    if (this.isAuthRegistered()) {
      await store.backupAuthFiles(AUTH_DIR, { force: true });
    }
    await this.closeSocketOnly();
  }

  private async closeSocketOnly() {
    this.stopHeartbeat();
    const prevSock = this.sock;
    this.sock = null;
    if (prevSock) {
      try {
        prevSock.ev.removeAllListeners('connection.update');
        prevSock.ev.removeAllListeners('creds.update');
        prevSock.ev.removeAllListeners('messages.update');
        prevSock.ev.removeAllListeners('messages.upsert');
        prevSock.end(undefined);
      } catch {
        // Ignore close errors
      }
    }
  }

  private clearAuthFiles() {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(CREDS_BACKUP_PATH)) {
      fs.rmSync(CREDS_BACKUP_PATH, { force: true });
    }
  }

  async disconnect(clearAuth = true): Promise<WhatsAppState> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (clearAuth && this.sock) {
      try {
        await this.sock.logout();
      } catch {
        // Proceed with local cleanup
      }
    }
    await this.closeSocketOnly();
    if (clearAuth) {
      this.clearAuthFiles();
      void store.clearRemoteAuth();
    }
    this.status = 'disconnected';
    this.qrDataUrl = null;
    this.qrRaw = null;
    this.pairingCode = null;
    this.lastHeartbeatAt = null;
    if (clearAuth) {
      this.lastError = null;
      store.updateWhatsAppMeta({
        connectedAt: null,
        lastHeartbeatAt: null,
        phoneNumber: null,
        pushName: null,
      });
    } else {
      const runtime = detectHostRuntimeKind();
      this.lastError =
        runtime === 'dev_preview'
          ? 'Dev preview socket paused so your 24/7 Railway server stays connected.'
          : 'WhatsApp socket is paused on this server. Click Restore Saved Session to resume 24/7 dispatch.';
    }
    return this.getState();
  }

  private async handleIncomingPollUpdate(
    sock: WASocket,
    msg: WAMessage,
    pollUpdate: NonNullable<NonNullable<WAMessage['message']>['pollUpdateMessage']>,
    helpers: {
      decryptPollVote: (
        vote: { encPayload: Uint8Array; encIv: Uint8Array },
        ctx: {
          pollCreatorJid: string;
          pollMsgId: string;
          pollEncKey: Uint8Array;
          voterJid: string;
        }
      ) => { selectedOptions?: Uint8Array[] | null };
      getAggregateVotesInPollMessage: (
        params: {
          message: WAMessage['message'];
          pollUpdates: Array<{ pollUpdateMessageKey: WAMessage['key']; vote: { selectedOptions?: Uint8Array[] | null } }>;
        },
        meId?: string
      ) => Array<{ name: string; voters: string[] }>;
      jidNormalizedUser: (jid?: string) => string;
    }
  ): Promise<void> {
    const pollCreationKey = pollUpdate.pollCreationMessageKey;
    const pollMsgId = pollCreationKey?.id;
    if (!pollMsgId || !pollUpdate.vote) return;

    const pollCreationMsg = store.getPollMessage(pollMsgId) as WAMessage | undefined;
    if (!pollCreationMsg?.message) return;

    const creationMsgAny = pollCreationMsg.message as {
      messageContextInfo?: { messageSecret?: unknown };
      pollCreationMessage?: {
        options?: Array<{ optionName?: string | null }>;
        contextInfo?: { messageSecret?: unknown };
      };
      pollCreationMessageV2?: {
        options?: Array<{ optionName?: string | null }>;
        contextInfo?: { messageSecret?: unknown };
      };
      pollCreationMessageV3?: {
        options?: Array<{ optionName?: string | null }>;
        contextInfo?: { messageSecret?: unknown };
      };
    };

    const rawSecret =
      creationMsgAny.messageContextInfo?.messageSecret ||
      creationMsgAny.pollCreationMessageV3?.contextInfo?.messageSecret ||
      creationMsgAny.pollCreationMessageV2?.contextInfo?.messageSecret ||
      creationMsgAny.pollCreationMessage?.contextInfo?.messageSecret;

    const pollEncKey = decodeBinaryBuffer(rawSecret);
    const encPayload = decodeBinaryBuffer(pollUpdate.vote.encPayload);
    const encIv = decodeBinaryBuffer(pollUpdate.vote.encIv);
    if (!pollEncKey || !encPayload || !encIv) return;

    const { decryptPollVote, getAggregateVotesInPollMessage, jidNormalizedUser } = helpers;
    const keyWithAlt = msg.key as typeof msg.key & {
      remoteJidAlt?: string;
      participantAlt?: string;
    };

    const creatorCandidates = Array.from(
      new Set(
        [
          sock.user?.id ? jidNormalizedUser(sock.user.id) : '',
          sock.user?.lid ? jidNormalizedUser(sock.user.lid) : '',
          pollCreationMsg.key?.participant ? jidNormalizedUser(pollCreationMsg.key.participant) : '',
          pollCreationMsg.key?.remoteJid ? jidNormalizedUser(pollCreationMsg.key.remoteJid) : '',
        ].filter(Boolean)
      )
    );

    const voterCandidates = Array.from(
      new Set(
        [
          msg.key.remoteJid ? jidNormalizedUser(msg.key.remoteJid) : '',
          keyWithAlt.remoteJidAlt ? jidNormalizedUser(keyWithAlt.remoteJidAlt) : '',
          msg.key.participant ? jidNormalizedUser(msg.key.participant) : '',
          keyWithAlt.participantAlt ? jidNormalizedUser(keyWithAlt.participantAlt) : '',
          pollCreationKey?.remoteJid ? jidNormalizedUser(pollCreationKey.remoteJid) : '',
          pollCreationMsg.key?.remoteJid ? jidNormalizedUser(pollCreationMsg.key.remoteJid) : '',
          sock.user?.id ? jidNormalizedUser(sock.user.id) : '',
          sock.user?.lid ? jidNormalizedUser(sock.user.lid) : '',
        ].filter(Boolean)
      )
    );

    let decryptedVote: { selectedOptions?: Uint8Array[] | null } | null = null;
    outer: for (const pollCreatorJid of creatorCandidates) {
      for (const voterJid of voterCandidates) {
        try {
          decryptedVote = decryptPollVote(
            { encPayload, encIv },
            { pollEncKey, pollMsgId, pollCreatorJid, voterJid }
          );
          if (decryptedVote) break outer;
        } catch {
          // Try next JID combination (PN vs LID)
        }
      }
    }

    if (!decryptedVote?.selectedOptions || decryptedVote.selectedOptions.length === 0) {
      return;
    }

    const pollOptions =
      creationMsgAny.pollCreationMessageV3?.options ||
      creationMsgAny.pollCreationMessageV2?.options ||
      creationMsgAny.pollCreationMessage?.options ||
      [];

    let selectedName = '';
    for (const rawOpt of decryptedVote.selectedOptions) {
      const optBuf = decodeBinaryBuffer(rawOpt);
      if (!optBuf) continue;
      for (const opt of pollOptions) {
        const optionName = opt.optionName || '';
        if (!optionName) continue;
        const hash = crypto.createHash('sha256').update(Buffer.from(optionName)).digest();
        if (hash.equals(optBuf)) {
          selectedName = optionName;
          break;
        }
      }
      if (selectedName) break;
    }

    if (!selectedName) {
      const selfNorm = sock.user?.id ? jidNormalizedUser(sock.user.id) : undefined;
      const votes = getAggregateVotesInPollMessage(
        {
          message: pollCreationMsg.message,
          pollUpdates: [{ pollUpdateMessageKey: msg.key, vote: decryptedVote }],
        },
        selfNorm
      );
      selectedName = votes.find((v) => v.voters && v.voters.length > 0)?.name || '';
    }

    if (!selectedName) return;

    const resolvedAlt =
      keyWithAlt.remoteJidAlt || keyWithAlt.participantAlt || msg.key.remoteJid || '';
    const senderDigits = resolvedAlt.split('@')[0].split(':')[0].replace(/\D/g, '');
    const order =
      store.getOrderByWhatsAppMessageId(pollMsgId) ||
      (senderDigits ? store.findLatestPendingOrderByPhone(senderDigits) : undefined);

    if (order) {
      await this.applyVoteToOrder(
        order.id,
        selectedName,
        'whatsapp_poll',
        msg.key.remoteJid || undefined
      );
    }
  }

  async dispatchOrderPoll(order: OrderRecord): Promise<OrderRecord> {
    if (this.inFlightDispatches.has(order.id)) {
      return store.getOrderById(order.id) || order;
    }

    this.inFlightDispatches.add(order.id);
    try {
      const current = store.getOrderById(order.id) || order;
      const settings = store.getSettings();
      const { question, options } = formatPollPayload(current, settings);
      const jid = normalizePhoneToWhatsAppJid(
        current.customerPhone,
        settings.defaultCountryCode
      );

      current.pollQuestion = question;

      if (!jid) {
        current.pollStatus = 'failed';
        store.upsertOrder(current);
        store.appendOrderEvent(current.id, {
          actor: 'system',
          message: `Cannot send WhatsApp Poll: invalid phone number "${current.customerPhone || 'empty'}"`,
        });
        return store.getOrderById(current.id) || current;
      }

      if (this.sock && this.status === 'connected') {
        try {
          let targetJid = jid;
          try {
            const check = await this.sock.onWhatsApp(jid);
            if (Array.isArray(check) && check[0]?.jid) {
              targetJid = check[0].jid;
            }
          } catch {
            // Proceed with normalized JID if onWhatsApp lookup is unavailable
          }

          const sent = await this.sock.sendMessage(targetJid, {
            poll: {
              name: question,
              values: options,
              selectableCount: 1,
            },
          });
          const msgId = sent?.key?.id || `WA-${Date.now()}`;
          if (sent && sent.key?.id) {
            store.savePollMessage(sent.key.id, sent);
          }

          const waitingTag = (settings.waitingTag || 'waiting for confirmation').trim();
          const hasLiveShopify = hasLiveShopifyCredentials(settings);
          let nextTags = current.shopifyTags;
          let shopifySynced = true;
          let tagError: string | undefined;

          if (waitingTag) {
            nextTags = mergeShopifyTags(current.shopifyTags, waitingTag);
            if (hasLiveShopify) {
              const tagRes = await updateShopifyOrderTags(
                settings,
                current.shopifyOrderId,
                nextTags,
                false
              );
              shopifySynced = tagRes.synced;
              tagError = tagRes.error;
            }
          }

          current.whatsappMessageId = msgId;
          current.whatsappTargetJid = targetJid;
          current.pollStatus = 'poll_sent';
          current.pollSentAt = new Date().toISOString();
          current.shopifyTags = nextTags;
          current.shopifySynced = shopifySynced || !hasLiveShopify;
          store.upsertOrder(current);
          store.appendOrderEvent(current.id, {
            actor: 'whatsapp',
            message: `WhatsApp Poll ("${options[0]}" / "${options[1]}") sent to ${current.customerPhone}`,
          });
          if (waitingTag) {
            store.appendOrderEvent(current.id, {
              actor: 'shopify',
              message: tagError
                ? `Local tag set to "${waitingTag}", Shopify sync failed: ${tagError}`
                : hasLiveShopify
                  ? `Shopify order ${current.orderNumber} tagged with "${waitingTag}" via Admin API`
                  : `Order tagged with "${waitingTag}"`,
            });
          }
          return store.getOrderById(current.id) || current;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'failed';
          const transient = !this.isConnected() || isTransientWhatsAppError(errMsg);
          current.pollStatus = transient ? 'queued' : 'failed';
          store.upsertOrder(current);
          store.appendOrderEvent(current.id, {
            actor: 'system',
            message: transient
              ? `Temporary WhatsApp socket drop (${errMsg}) — order kept in queue for automatic retry.`
              : `Baileys send error: ${errMsg}`,
          });
          return store.getOrderById(current.id) || current;
        }
      }

      current.pollStatus = 'queued';
      store.upsertOrder(current);
      const lastEventMsg = current.events[current.events.length - 1]?.message || '';
      if (!lastEventMsg.startsWith('WhatsApp QR not linked yet')) {
        store.appendOrderEvent(current.id, {
          actor: 'system',
          message: 'WhatsApp QR not linked yet — order queued and will send automatically once linked.',
        });
      }
      return store.getOrderById(current.id) || current;
    } finally {
      this.inFlightDispatches.delete(order.id);
    }
  }

  async dispatchTrackingMessage(order: OrderRecord): Promise<OrderRecord> {
    if (this.inFlightTracking.has(order.id)) {
      return store.getOrderById(order.id) || order;
    }

    this.inFlightTracking.add(order.id);
    try {
      const current = store.getOrderById(order.id) || order;
      const settings = store.getSettings();
      const trackingValue = (current.trackingUrl || current.trackingNumber || '').trim();
      if (!trackingValue) {
        return current;
      }

      const phoneJid = normalizePhoneToWhatsAppJid(
        current.customerPhone,
        settings.defaultCountryCode
      );
      let targetJid = current.whatsappTargetJid || phoneJid;
      if (!targetJid) {
        store.appendOrderEvent(current.id, {
          actor: 'system',
          message: `Cannot send tracking link: invalid phone number "${current.customerPhone || 'empty'}"`,
        });
        return store.getOrderById(current.id) || current;
      }

      if (!this.sock || this.status !== 'connected') {
        store.appendOrderEvent(current.id, {
          actor: 'system',
          message: 'WhatsApp QR not linked yet — connect WhatsApp to send tracking update.',
        });
        return store.getOrderById(current.id) || current;
      }

      if (phoneJid) {
        try {
          const check = await this.sock.onWhatsApp(phoneJid);
          if (Array.isArray(check) && check[0]?.jid) {
            targetJid = check[0].jid;
          }
        } catch {
          // Keep existing JID
        }
      }

      const messageText = formatOrderTemplate(
        settings.trackingMessageTemplate || DEFAULT_SETTINGS.trackingMessageTemplate,
        current,
        settings
      );

      await this.sock.sendMessage(targetJid, { text: messageText });
      current.whatsappTargetJid = targetJid;
      current.trackingSentAt = new Date().toISOString();
      current.trackingSentValue = trackingValue;
      store.upsertOrder(current);
      store.appendOrderEvent(current.id, {
        actor: 'whatsapp',
        message: `Tracking update sent on WhatsApp to ${current.customerPhone} (${trackingValue})`,
      });
      return store.getOrderById(current.id) || current;
    } catch (err) {
      store.appendOrderEvent(order.id, {
        actor: 'system',
        message: `Tracking WhatsApp send error: ${err instanceof Error ? err.message : 'failed'}`,
      });
      return store.getOrderById(order.id) || order;
    } finally {
      this.inFlightTracking.delete(order.id);
    }
  }

  async applyVoteToOrder(
    orderId: string,
    selectedOption: string,
    channel: 'whatsapp_poll' | 'whatsapp_text' | 'manual',
    preferredReplyJid?: string
  ): Promise<OrderRecord | null> {
    const order = store.getOrderById(orderId);
    if (!order) return null;

    const settings = store.getSettings();
    const resolution = resolvePollVoteAction(selectedOption, settings);
    if (!resolution) return order;

    const updatedTags = mergeShopifyTags(order.shopifyTags, resolution.tagToAdd, [
      resolution.opposingTag,
      settings.waitingTag || 'waiting for confirmation',
    ]);

    const shouldCancelInShopify =
      resolution.decision === 'cancel' && settings.autoCancelInShopify;

    const shopifyResult = await updateShopifyOrderTags(
      settings,
      order.shopifyOrderId,
      updatedTags,
      shouldCancelInShopify
    );

    const hasLiveShopify = hasLiveShopifyCredentials(settings);
    order.shopifyTags = updatedTags;
    order.pollStatus = resolution.newStatus;
    order.respondedAt = new Date().toISOString();
    order.responseChannel = channel;
    order.shopifySynced = shopifyResult.synced || !hasLiveShopify;
    if (shouldCancelInShopify && shopifyResult.cancelledInShopify && !order.shopifyCancelledAt) {
      order.shopifyCancelledAt = new Date().toISOString();
    }
    if (preferredReplyJid) {
      order.whatsappTargetJid = preferredReplyJid;
    }
    store.upsertOrder(order);

    const optionDisplay =
      resolution.decision === 'confirm'
        ? settings.confirmOptionLabel
        : settings.cancelOptionLabel;

    store.appendOrderEvent(order.id, {
      actor: 'customer',
      message: `Customer selected "${optionDisplay}" (${channel.replace('_', ' ')})`,
    });

    store.appendOrderEvent(order.id, {
      actor: 'shopify',
      message: shopifyResult.error
        ? `Local tag updated to "${resolution.tagToAdd}", Shopify API sync failed: ${shopifyResult.error}`
        : hasLiveShopify
          ? `Shopify order ${order.orderNumber} tagged with "${resolution.tagToAdd}" via Admin API`
          : `Shopify order ${order.orderNumber} tagged with "${resolution.tagToAdd}"`,
    });

    if (shouldCancelInShopify && hasLiveShopify && shopifyResult.synced) {
      store.appendOrderEvent(order.id, {
        actor: 'shopify',
        message: shopifyResult.cancelledInShopify
          ? shopifyResult.alreadyCancelled
            ? `Shopify order ${order.orderNumber} was already cancelled in Shopify`
            : `Shopify order ${order.orderNumber} cancelled in Shopify (inventory restocked)`
          : `Shopify order cancellation failed for ${order.orderNumber}: ${shopifyResult.cancelError || 'unknown error'}`,
      });
    }

    if (
      (channel === 'whatsapp_poll' || channel === 'whatsapp_text') &&
      this.sock &&
      this.status === 'connected'
    ) {
      const phoneJid = normalizePhoneToWhatsAppJid(
        order.customerPhone,
        settings.defaultCountryCode
      );
      const replyJid = preferredReplyJid || order.whatsappTargetJid || phoneJid;
      if (replyJid) {
        const replyTemplate =
          resolution.decision === 'confirm'
            ? settings.confirmReplyMessage || DEFAULT_SETTINGS.confirmReplyMessage
            : settings.cancelReplyMessage || DEFAULT_SETTINGS.cancelReplyMessage;
        const replyText = formatOrderTemplate(replyTemplate, order, settings);

        let sentOk = false;
        try {
          await this.sock.sendMessage(replyJid, { text: replyText });
          sentOk = true;
        } catch {
          if (phoneJid && phoneJid !== replyJid) {
            try {
              await this.sock.sendMessage(phoneJid, { text: replyText });
              sentOk = true;
            } catch {
              sentOk = false;
            }
          }
        }

        if (sentOk) {
          store.appendOrderEvent(order.id, {
            actor: 'whatsapp',
            message:
              resolution.decision === 'confirm'
                ? `Confirmation WhatsApp message sent to ${order.customerPhone}`
                : `Cancellation WhatsApp message sent to ${order.customerPhone}`,
          });
        }
      }
    }

    return store.getOrderById(order.id) || order;
  }
}

export const whatsappManager = new WhatsAppManager();
