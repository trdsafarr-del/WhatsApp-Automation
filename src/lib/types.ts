export type PollStatus =
  | 'queued'
  | 'poll_sent'
  | 'confirmed'
  | 'cancelled_by_user'
  | 'failed';

export type WhatsAppConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_ready'
  | 'connected'
  | 'error';

export type WhatsAppEngineMode = 'baileys_qr' | 'sandbox';

export interface OrderEvent {
  id: string;
  timestamp: string;
  actor: 'shopify' | 'whatsapp' | 'customer' | 'system';
  message: string;
}

export interface OrderRecord {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  totalPrice: string;
  currency: string;
  lineItemsSummary: string;
  financialStatus: string;
  shopifyTags: string;
  pollStatus: PollStatus;
  whatsappMessageId: string | null;
  pollQuestion: string;
  pollSentAt: string | null;
  respondedAt: string | null;
  responseChannel: 'whatsapp_poll' | 'whatsapp_text' | 'simulator' | null;
  shopifySynced: boolean;
  createdAt: string;
  events: OrderEvent[];
}

export interface AppSettings {
  shopName: string;
  shopifyStoreDomain: string;
  shopifyClientId: string;
  shopifyClientSecret: string;
  shopifyAccessToken: string;
  shopifyWebhookSecret: string;
  whatsappMode: WhatsAppEngineMode;
  defaultCountryCode: string;
  autoSendPollOnNewOrder: boolean;
  autoCancelInShopify: boolean;
  pollMessageTemplate: string;
  confirmOptionLabel: string;
  cancelOptionLabel: string;
  confirmTag: string;
  cancelTag: string;
}

export interface WhatsAppState {
  status: WhatsAppConnectionStatus;
  mode: WhatsAppEngineMode;
  phoneNumber: string | null;
  pushName: string | null;
  qrDataUrl: string | null;
  qrRaw: string | null;
  connectedAt: string | null;
  lastHeartbeatAt: string | null;
  reconnectCount: number;
  sessionPersisted: boolean;
  lastError: string | null;
}

export interface OrderMetrics {
  totalOrders: number;
  pendingPolls: number;
  confirmedCount: number;
  cancelledCount: number;
  confirmationRate: number;
  avgResponseMinutes: number | null;
}

export interface DashboardPayload {
  orders: OrderRecord[];
  whatsapp: WhatsAppState;
  settings: AppSettings;
  metrics: OrderMetrics;
  serverTime: string;
}
