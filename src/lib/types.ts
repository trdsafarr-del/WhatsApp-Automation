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

export type WhatsAppEngineMode = 'baileys_qr';

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
  fulfillmentStatus?: string | null;
  shipmentStatus?: string | null;
  fulfilledAt?: string | null;
  shopifyCancelledAt?: string | null;
  paymentMethod?: string;
  deliverySummary?: string;
  destinationPincode?: string;
  orderWeightGrams?: number;
  orderNote?: string;
  noteUpdatedAt?: string | null;
  trackingNumber?: string;
  trackingUrl?: string;
  trackingCompany?: string;
  trackingSentAt?: string | null;
  trackingSentValue?: string | null;
  delhiveryShippingCost?: number | null;
  delhiveryCodFee?: number | null;
  delhiveryRtoCost?: number | null;
  delhiveryChargeSource?: 'delhivery_api' | 'delhivery_wallet' | 'estimated' | null;
  delhiveryChargedWeightGrams?: number | null;
  delhiveryLastSyncedAt?: string | null;
  settlementStatus?: 'settled' | 'pending_remittance' | 'in_transit' | 'no_payout' | null;
  settledAmount?: number | null;
  settledAt?: string | null;
  settlementReference?: string | null;
  pickedUpAt?: string | null;
  expectedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  deliveryAttemptsCount?: number | null;
  lastCourierScanLocation?: string | null;
  lastCourierScanRemark?: string | null;
  lastCourierScanAt?: string | null;
  shopifyTags: string;
  pollStatus: PollStatus;
  whatsappMessageId: string | null;
  whatsappTargetJid?: string | null;
  pollQuestion: string;
  pollSentAt: string | null;
  respondedAt: string | null;
  responseChannel: 'whatsapp_poll' | 'whatsapp_text' | 'manual' | null;
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
  autoSendTrackingMessage: boolean;
  pollMessageTemplate: string;
  confirmOptionLabel: string;
  cancelOptionLabel: string;
  waitingTag: string;
  confirmTag: string;
  cancelTag: string;
  confirmReplyMessage: string;
  cancelReplyMessage: string;
  trackingMessageTemplate: string;
  syncStartDate: string;
  delhiveryApiToken: string;
  delhiveryPickupPincode: string;
  delhiveryBillingMode: 'E' | 'S';
  delhiveryDefaultWeightGrams: number;
  cogsPercent: number;
  packagingCostPerOrder: number;
  fallbackForwardShippingCost: number;
  fallbackRtoShippingCost: number;
  fallbackCodFee: number;
  prepaidGatewayPercent: number;
  marketingCostPerOrder: number;
  dailyMetaAdsSpend?: number;
  deliverySlaDays?: number;
  pickupSlaHours?: number;
}

export interface WhatsAppState {
  status: WhatsAppConnectionStatus;
  mode: WhatsAppEngineMode;
  phoneNumber: string | null;
  pushName: string | null;
  qrDataUrl: string | null;
  qrRaw: string | null;
  pairingCode?: string | null;
  isServerless?: boolean;
  connectedAt: string | null;
  lastHeartbeatAt: string | null;
  reconnectCount: number;
  sessionPersisted: boolean;
  remoteSessionActive?: boolean;
  activeHostKind?: string | null;
  hostKind?: string | null;
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

export type PincodeRuleMode = 'all_india' | 'allow_list' | 'block_list';

export interface ProductCatalogItem {
  id: string;
  shopifyProductId: string;
  title: string;
  handle: string;
  status: 'active' | 'draft' | 'archived';
  productType: string;
  vendor: string;
  imageUrl: string;
  imageAlt: string;
  price: string;
  currency: string;
  seoTitle: string;
  seoDescription: string;
  tags: string;
  pincodeMode: PincodeRuleMode;
  allowedPincodes: string[];
  blockedPincodes: string[];
  allowCod: boolean;
  estimatedDeliveryDays: number | null;
  updatedAt: string;
  shopifySyncedAt?: string | null;
}

export interface StorefrontConfig {
  pincodeGateEnabled: boolean;
  autoDetectPincode: boolean;
  hideUnavailableProducts: boolean;
  showDeliveryEstimateOnPdp: boolean;
  defaultDeliveryDays: number;
  pincodePromptTitle: string;
  unavailableBadgeText: string;
  seoTitleTemplate: string;
  seoDescriptionTemplate: string;
  enableJsonLdSchema: boolean;
  storefrontAppUrl: string;
}

export interface PincodeAutoDetectResult {
  ok: boolean;
  detected: boolean;
  pincode: string;
  city: string;
  state: string;
  source: 'vercel_edge' | 'ip_geo' | 'gps_nominatim' | 'india_post' | 'none';
  reason?: string;
}

export interface DelhiveryServiceabilityResult {
  pincode: string;
  serviceable: boolean;
  codAvailable: boolean;
  prepaidAvailable: boolean;
  pickupAvailable: boolean;
  city: string;
  state: string;
  remarks: string;
  source: 'delhivery_api' | 'rules_only';
}

export interface GeoZoneHub {
  id: string;
  name: string;
  slug: string;
  pincode: string;
  lat: number;
  lng: number;
  radiusKm: number;
  enabled: boolean;
}

export interface GeoLocality {
  id: string;
  name: string;
  slug: string;
  pincode: string;
  lat: number;
  lng: number;
  areaType?: 'sector' | 'colony' | 'society' | 'landmark';
}

export interface GeoCakeCategory {
  id: string;
  name: string;
  slug: string;
  keywords: string[];
  matchTerms: string[];
  enabled: boolean;
}

export interface GeoIntentModifier {
  id: string;
  label: string;
  slug: string;
  shortDesc: string;
  enabled: boolean;
}

export interface GeoSeoConfig {
  enabled: boolean;
  primaryWebsiteUrl: string;
  brandName: string;
  cityName: string;
  stateName: string;
  combineAllHubsIntoSingleZone: boolean;
  includeTier2Matrix: boolean;
  includeTier3Matrix: boolean;
  injectStorefrontGeoSchema: boolean;
  shopifyProxyPrefix?: string;
  showStorefrontZoneFooter?: boolean;
  hubs: GeoZoneHub[];
  localities: GeoLocality[];
  categories: GeoCakeCategory[];
  modifiers: GeoIntentModifier[];
  updatedAt: string;
}

export interface DashboardPayload {
  orders: OrderRecord[];
  whatsapp: WhatsAppState;
  settings: AppSettings;
  metrics: OrderMetrics;
  products?: ProductCatalogItem[];
  storefrontConfig?: StorefrontConfig;
  geoSeoConfig?: GeoSeoConfig;
  cloudSyncEnabled?: boolean;
  upstashQuotaExceeded?: boolean;
  serverTime: string;
}

