import fs from 'node:fs';
import path from 'node:path';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import {
  formatJidToDisplayPhone,
  formatPollPayload,
  mergeShopifyTags,
  normalizePhoneToWhatsAppJid,
  resolvePollVoteAction,
  shouldAutoDispatchPoll,
} from '../src/lib/orderRules.js';
import type { OrderRecord, WhatsAppEngineMode, WhatsAppState } from '../src/lib/types.js';
import { hasLiveShopifyCredentials, updateShopifyOrderTags } from './shopify.js';
import { store } from './store.js';

const AUTH_DIR = process.env.VERCEL
  ? '/tmp/orderpulse-data/wa-auth'
  : path.resolve(process.cwd(), 'data', 'wa-auth');

class WhatsAppManager {
  private sock: WASocket | null = null;
  private status: WhatsAppState['status'] = 'disconnected';
  private qrDataUrl: string | null = null;
  private qrRaw: string | null = null;
  private pairingCode: string | null = null;
  private lastHeartbeatAt: string | null = null;
  private reconnectCount = 0;
  private lastError: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private authBackupTimer: NodeJS.Timeout | null = null;
  private credsSaveQueue: Promise<void> = Promise.resolve();
  private isInitializing = false;
  private initialWaiters: Array<() => void> = [];

  constructor() {
    void this.restorePersistedSession();
  }

  private hasSavedAuth(): boolean {
    return fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  }

  private isAuthRegistered(): boolean {
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;
    try {
      const raw = JSON.parse(fs.readFileSync(credsPath, 'utf8')) as { registered?: boolean };
      return Boolean(raw.registered);
    } catch {
      return false;
    }
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
    if (!this.hasSavedAuth() && store.isCloudSyncEnabled()) {
      await store.restoreAuthFiles(AUTH_DIR);
    }
    if (this.hasSavedAuth() && this.isAuthRegistered()) {
      // Auto-restore 24/7 WhatsApp Web QR session without requiring re-scan
      void this.connect('baileys_qr');
    } else if (this.hasSavedAuth() && !this.isAuthRegistered()) {
      // Clean up half-finished unregistered pairing files from an interrupted QR scan
      this.clearAuthFiles();
    }
  }

  private scheduleAuthBackup() {
    if (!store.isCloudSyncEnabled()) return;
    if (this.authBackupTimer) clearTimeout(this.authBackupTimer);
    this.authBackupTimer = setTimeout(() => {
      void store.backupAuthFiles(AUTH_DIR);
    }, 1500);
  }

  private startHeartbeat() {
    if (process.env.VERCEL) return;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(async () => {
      if (this.status !== 'connected') return;
      this.lastHeartbeatAt = new Date().toISOString();
      if (this.sock) {
        try {
          await this.sock.sendPresenceUpdate('available');
        } catch {
          // Connection listener handles reconnect if socket dropped
        }
      }
    }, 45_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getState(): WhatsAppState {
    const meta = store.getWhatsAppMeta();
    return {
      status: this.status,
      mode: meta.mode,
      phoneNumber: meta.phoneNumber,
      pushName: meta.pushName,
      qrDataUrl: this.qrDataUrl,
      qrRaw: this.qrRaw,
      pairingCode: this.pairingCode,
      isServerless: Boolean(process.env.VERCEL),
      connectedAt: meta.connectedAt,
      lastHeartbeatAt: this.lastHeartbeatAt,
      reconnectCount: this.reconnectCount,
      sessionPersisted: this.hasSavedAuth() && this.isAuthRegistered(),
      lastError: this.lastError,
    };
  }

  async connect(
    requestedMode?: WhatsAppEngineMode,
    options?: { fresh?: boolean; waitForQr?: boolean }
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
      if (options?.waitForQr !== false) {
        await this.waitForQrOrOpen();
      }
      return this.getState();
    }

    this.isInitializing = true;
    this.status = 'connecting';
    this.qrDataUrl = null;
    this.qrRaw = null;
    if (options?.fresh) {
      this.pairingCode = null;
    }

    try {
      // Wait for any in-flight creds.json save (especially during 515 post-scan restart)
      await this.credsSaveQueue;
      await this.closeSocketOnly();

      // Clean stale unregistered pairing files when user explicitly requests a fresh QR
      if (options?.fresh || (this.hasSavedAuth() && !this.isAuthRegistered() && !this.pairingCode)) {
        // Only wipe if not currently mid-handshake (`reconnectCount` > 0 or 515 keeps creds)
        if (options?.fresh) {
          this.clearAuthFiles();
        }
      }

      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      if (!this.hasSavedAuth() && store.isCloudSyncEnabled()) {
        await store.restoreAuthFiles(AUTH_DIR);
      }

      if (!this.isAuthRegistered()) {
        store.updateWhatsAppMeta({
          mode: 'baileys_qr',
          connectedAt: null,
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
        fetchLatestBaileysVersion,
        getAggregateVotesInPollMessage,
        jidNormalizedUser,
        makeCacheableSignalKeyStore,
        useMultiFileAuthState,
      } = baileys;
      const logger = pinoMod.default({ level: 'silent' });
      const QRCode = qrMod.default;

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      let version: [number, number, number] | undefined;
      try {
        const fetched = await fetchLatestBaileysVersion();
        version = fetched.version;
      } catch {
        // Fallback to Baileys default version if version check endpoint is unreachable
      }

      const sock = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        browser: Browsers.macOS('Chrome'),
        connectTimeoutMs: 45_000,
        keepAliveIntervalMs: 30_000,
        qrTimeout: 60_000,
        getMessage: async (key) => {
          if (!key.id) return undefined;
          const cached = store.getPollMessage(key.id) as WAMessage | undefined;
          return cached?.message || undefined;
        },
      });

      this.sock = sock;

      sock.ev.on('creds.update', () => {
        this.credsSaveQueue = this.credsSaveQueue
          .then(() => saveCreds())
          .then(() => {
            this.scheduleAuthBackup();
          })
          .catch(() => {
            // Keep queue healthy
          });
      });

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRaw = qr;
          this.qrDataUrl = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          this.status = 'qr_ready';
          this.lastError = null;
          this.notifyWaiters();
        }

        if (connection === 'open') {
          const now = new Date().toISOString();
          this.status = 'connected';
          this.reconnectCount = 0;
          this.qrDataUrl = null;
          this.qrRaw = null;
          this.pairingCode = null;
          this.lastHeartbeatAt = now;
          this.lastError = null;
          const userId = sock.user?.id || '';
          store.updateWhatsAppMeta({
            mode: 'baileys_qr',
            connectedAt: now,
            phoneNumber: userId ? formatJidToDisplayPhone(userId) : 'Linked Device',
            pushName: sock.user?.name || 'WhatsApp Business',
          });
          this.scheduleAuthBackup();
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

          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const isRestartRequired = statusCode === DisconnectReason.restartRequired;
          const isQrTimeout =
            !this.isAuthRegistered() &&
            (errMessage.toLowerCase().includes('qr refs attempts ended') ||
              statusCode === DisconnectReason.timedOut);
          const isBadSession =
            statusCode === DisconnectReason.badSession ||
            statusCode === DisconnectReason.multideviceMismatch;

          if (isLoggedOut || isBadSession) {
            this.clearAuthFiles();
            void store.clearRemoteAuth();
            this.status = 'disconnected';
            this.qrDataUrl = null;
            this.qrRaw = null;
            this.pairingCode = null;
            this.lastError = isLoggedOut
              ? 'Device logged out from WhatsApp phone. Click Generate WhatsApp QR to link again.'
              : 'Session expired or mismatched. Click Generate WhatsApp QR to link fresh.';
            store.updateWhatsAppMeta({
              connectedAt: null,
              phoneNumber: null,
              pushName: null,
            });
            this.notifyWaiters();
          } else if (isRestartRequired) {
            // Normal post-QR-scan handshake: flush creds.json and reconnect immediately without error flash
            this.status = 'connecting';
            this.lastError = null;
            await this.credsSaveQueue;
            if (!process.env.VERCEL) {
              if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
              this.reconnectTimer = setTimeout(() => {
                void this.connect('baileys_qr', { waitForQr: false });
              }, 250);
            }
          } else if (isQrTimeout) {
            // Stop cleanly when QR wasn't scanned within 60s instead of spinning forever
            this.clearAuthFiles();
            this.status = 'disconnected';
            this.qrDataUrl = null;
            this.qrRaw = null;
            this.pairingCode = null;
            this.lastError = 'QR code expired after 60s without scanning. Click Generate WhatsApp QR to get a new one.';
            this.notifyWaiters();
          } else if (!process.env.VERCEL) {
            // Auto-reconnect 24/7 for transient drops without logging out
            this.reconnectCount += 1;
            this.status = 'connecting';
            this.lastError = errMessage;
            const delayMs = Math.min(30_000, 2_500 * Math.min(this.reconnectCount, 6));
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              void this.connect('baileys_qr', { waitForQr: false });
            }, delayMs);
            this.notifyWaiters();
          } else {
            this.notifyWaiters();
          }
        }
      });

      // Listen for native WhatsApp Poll vote updates
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
              await this.applyVoteToOrder(order.id, selected.name, 'whatsapp_poll');
            }
          } catch {
            // Ignore undecryptable duplicate vote events
          }
        }
      });

      // Listen for fallback text replies ("1", "2", "confirm", "cancel", "yes", "no")
      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (msg.key.fromMe || !msg.message || !msg.key.remoteJid) continue;
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';
          if (!text.trim()) continue;

          const settings = store.getSettings();
          const resolution = resolvePollVoteAction(text, settings);
          if (!resolution) continue;

          const keyWithAlt = msg.key as typeof msg.key & {
            remoteJidAlt?: string;
            participantAlt?: string;
          };
          const resolvedJid =
            keyWithAlt.remoteJidAlt || keyWithAlt.participantAlt || msg.key.remoteJid;
          const senderDigits = resolvedJid.split('@')[0].replace(/\D/g, '');
          if (!senderDigits) continue;

          const order = store.findLatestPendingOrderByPhone(senderDigits);
          if (order) {
            await this.applyVoteToOrder(order.id, text, 'whatsapp_text');
          }
        }
      });

      if (options?.waitForQr !== false) {
        await this.waitForQrOrOpen(8000);
      }
    } catch (err) {
      this.status = 'error';
      this.lastError =
        err instanceof Error
          ? err.message
          : 'Unable to start WhatsApp Web QR socket in this network environment.';
      this.notifyWaiters();
    } finally {
      this.isInitializing = false;
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

  private async closeSocketOnly() {
    this.stopHeartbeat();
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.end(undefined);
      } catch {
        // Ignore close errors
      }
      this.sock = null;
    }
  }

  private clearAuthFiles() {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
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
    this.lastError = null;
    store.updateWhatsAppMeta({
      connectedAt: null,
      phoneNumber: null,
      pushName: null,
    });
    return this.getState();
  }

  async dispatchOrderPoll(order: OrderRecord): Promise<OrderRecord> {
    const settings = store.getSettings();
    const { question, options } = formatPollPayload(order, settings);
    const jid = normalizePhoneToWhatsAppJid(
      order.customerPhone,
      settings.defaultCountryCode
    );

    order.pollQuestion = question;

    if (!jid) {
      order.pollStatus = 'failed';
      store.upsertOrder(order);
      store.appendOrderEvent(order.id, {
        actor: 'system',
        message: `Cannot send WhatsApp Poll: invalid phone number "${order.customerPhone || 'empty'}"`,
      });
      return store.getOrderById(order.id) || order;
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
        order.whatsappMessageId = msgId;
        order.pollStatus = 'poll_sent';
        order.pollSentAt = new Date().toISOString();
        store.upsertOrder(order);
        store.appendOrderEvent(order.id, {
          actor: 'whatsapp',
          message: `WhatsApp Poll ("${options[0]}" / "${options[1]}") sent to ${order.customerPhone}`,
        });
        return store.getOrderById(order.id) || order;
      } catch (err) {
        order.pollStatus = 'failed';
        store.upsertOrder(order);
        store.appendOrderEvent(order.id, {
          actor: 'system',
          message: `Baileys send error: ${err instanceof Error ? err.message : 'failed'}`,
        });
        return store.getOrderById(order.id) || order;
      }
    }

    order.pollStatus = 'queued';
    store.upsertOrder(order);
    store.appendOrderEvent(order.id, {
      actor: 'system',
      message: 'WhatsApp QR not linked yet — order queued and will send automatically once linked.',
    });
    return store.getOrderById(order.id) || order;
  }

  async applyVoteToOrder(
    orderId: string,
    selectedOption: string,
    channel: 'whatsapp_poll' | 'whatsapp_text' | 'manual'
  ): Promise<OrderRecord | null> {
    const order = store.getOrderById(orderId);
    if (!order) return null;

    const settings = store.getSettings();
    const resolution = resolvePollVoteAction(selectedOption, settings);
    if (!resolution) return order;

    const updatedTags = mergeShopifyTags(
      order.shopifyTags,
      resolution.tagToAdd,
      resolution.opposingTag
    );

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

    if (
      (channel === 'whatsapp_poll' || channel === 'whatsapp_text') &&
      this.sock &&
      this.status === 'connected'
    ) {
      const jid = normalizePhoneToWhatsAppJid(
        order.customerPhone,
        settings.defaultCountryCode
      );
      if (jid) {
        const replyText =
          resolution.decision === 'confirm'
            ? `Thank you ${order.customerName}! Your order ${order.orderNumber} at ${settings.shopName} is confirmed.`
            : `Your order ${order.orderNumber} at ${settings.shopName} has been marked as cancelled as requested.`;
        try {
          await this.sock.sendMessage(jid, { text: replyText });
        } catch {
          // Non-fatal if acknowledgement message cannot be sent
        }
      }
    }

    return store.getOrderById(order.id) || order;
  }
}

export const whatsappManager = new WhatsAppManager();
