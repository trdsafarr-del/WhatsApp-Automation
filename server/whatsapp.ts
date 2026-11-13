import fs from 'node:fs';
import path from 'node:path';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import {
  formatJidToDisplayPhone,
  formatPollPayload,
  mergeShopifyTags,
  normalizePhoneToWhatsAppJid,
  resolvePollVoteAction,
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
  private lastHeartbeatAt: string | null = null;
  private reconnectCount = 0;
  private lastError: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isInitializing = false;

  constructor() {
    this.restorePersistedSession();
  }

  private hasSavedAuth(): boolean {
    return fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  }

  private restorePersistedSession() {
    if (!process.env.VERCEL && this.hasSavedAuth()) {
      // Auto-restore 24/7 WhatsApp Web QR session without requiring re-scan
      void this.connect('baileys_qr');
    }
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
      connectedAt: meta.connectedAt,
      lastHeartbeatAt: this.lastHeartbeatAt,
      reconnectCount: this.reconnectCount,
      sessionPersisted: this.hasSavedAuth(),
      lastError: this.lastError,
    };
  }

  async connect(requestedMode?: WhatsAppEngineMode): Promise<WhatsAppState> {
    const mode: WhatsAppEngineMode = requestedMode || 'baileys_qr';
    store.updateWhatsAppMeta({ mode });
    store.updateSettings({ whatsappMode: mode });
    this.lastError = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Real Baileys WhatsApp Web QR Multi-Device Session
    if (this.isInitializing) return this.getState();
    this.isInitializing = true;
    this.status = 'connecting';
    this.qrDataUrl = null;
    this.qrRaw = null;
    if (!this.hasSavedAuth()) {
      store.updateWhatsAppMeta({
        mode: 'baileys_qr',
        connectedAt: null,
        phoneNumber: null,
        pushName: null,
      });
    }

    try {
      await this.closeSocketOnly();
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const [baileys, pinoMod, qrMod] = await Promise.all([
        import('@whiskeysockets/baileys'),
        import('pino'),
        import('qrcode'),
      ]);
      const makeWASocket = baileys.default;
      const {
        DisconnectReason,
        fetchLatestBaileysVersion,
        getAggregateVotesInPollMessage,
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
        markOnlineOnConnect: true,
        syncFullHistory: false,
        browser: ['OrderPulse Shopify', 'Chrome', '128.0.0'],
        keepAliveIntervalMs: 30_000,
        getMessage: async (key) => {
          if (!key.id) return undefined;
          const cached = store.getPollMessage(key.id) as WAMessage | undefined;
          return cached?.message || undefined;
        },
      });

      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);

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
        }

        if (connection === 'open') {
          const now = new Date().toISOString();
          this.status = 'connected';
          this.qrDataUrl = null;
          this.qrRaw = null;
          this.lastHeartbeatAt = now;
          this.lastError = null;
          const userId = sock.user?.id || '';
          store.updateWhatsAppMeta({
            mode: 'baileys_qr',
            connectedAt: now,
            phoneNumber: userId ? formatJidToDisplayPhone(userId) : 'Linked Device',
            pushName: sock.user?.name || 'WhatsApp Business',
          });
          this.startHeartbeat();
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

          if (isLoggedOut) {
            this.clearAuthFiles();
            this.status = 'disconnected';
            this.qrDataUrl = null;
            this.qrRaw = null;
            this.lastError = 'Device logged out from WhatsApp phone. Scan QR again to relink.';
            store.updateWhatsAppMeta({
              connectedAt: null,
              phoneNumber: null,
              pushName: null,
            });
          } else if (!process.env.VERCEL && store.getWhatsAppMeta().mode === 'baileys_qr') {
            // Auto-reconnect 24/7 for transient drops, stream errors (515), or timeouts
            this.reconnectCount += 1;
            this.status = 'connecting';
            this.lastError = errMessage;
            const delayMs = Math.min(30_000, 3_000 * Math.min(this.reconnectCount, 6));
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              if (store.getWhatsAppMeta().mode === 'baileys_qr') {
                void this.connect('baileys_qr');
              }
            }, delayMs);
          }
        }
      });

      // Listen for native WhatsApp Poll vote updates
      sock.ev.on('messages.update', async (updates) => {
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
              sock.user?.id
            );

            // Pick the option that currently has a voter
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

      // Listen for fallback text replies ("1", "2", "confirm", "cancel")
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

          const senderDigits = msg.key.remoteJid.split('@')[0].replace(/\D/g, '');
          if (!senderDigits) continue;
          const order = store.findLatestPendingOrderByPhone(senderDigits);
          if (order) {
            await this.applyVoteToOrder(order.id, text, 'whatsapp_text');
          }
        }
      });
    } catch (err) {
      this.status = 'error';
      this.lastError =
        err instanceof Error
          ? err.message
          : 'Unable to start WhatsApp Web QR socket in this network environment.';
    } finally {
      this.isInitializing = false;
    }

    return this.getState();
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
    }
    this.status = 'disconnected';
    this.qrDataUrl = null;
    this.qrRaw = null;
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

    // Live Baileys WhatsApp Web Socket
    if (this.sock && this.status === 'connected') {
      try {
        const sent = await this.sock.sendMessage(jid, {
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

    // If WhatsApp isn't connected yet, keep order queued so user can resend after linking QR
    order.pollStatus = 'queued';
    store.upsertOrder(order);
    store.appendOrderEvent(order.id, {
      actor: 'system',
      message: 'WhatsApp QR not linked yet — order queued. Scan WhatsApp QR to dispatch.',
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
      message: `Customer clicked "${optionDisplay}" (${channel.replace('_', ' ')})`,
    });

    store.appendOrderEvent(order.id, {
      actor: 'shopify',
      message: shopifyResult.error
        ? `Local tag updated to "${resolution.tagToAdd}", Shopify API sync failed: ${shopifyResult.error}`
        : hasLiveShopify
          ? `Shopify order ${order.orderNumber} tagged with "${resolution.tagToAdd}" via Admin API`
          : `Shopify order ${order.orderNumber} tagged with "${resolution.tagToAdd}"`,
    });

    return store.getOrderById(order.id) || order;
  }
}

export const whatsappManager = new WhatsAppManager();
