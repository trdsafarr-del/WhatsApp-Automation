import {
  computeBillableParcelWeightGrams,
  computeIncrementalRtoLegCost,
  extractCleanIndianPincode,
  parseDelhiveryBillingCsv,
  splitDelhiveryChargeWithGst,
} from '../src/lib/orderRules.js';
import type {
  AppSettings,
  DelhiveryServiceabilityResult,
  OrderRecord,
} from '../src/lib/types.js';
import { fetchShopifyOriginPincode, hasLiveShopifyCredentials } from './shopify.js';

const DELHIVERY_BASE_URL = 'https://track.delhivery.com';

export function hasDelhiveryCredentials(
  settings: Pick<AppSettings, 'delhiveryApiToken'>
): boolean {
  return Boolean((settings.delhiveryApiToken || '').trim());
}

/**
 * Maps Delhivery status strings & codes to Shopify-compatible shipmentStatus labels
 * consumed by OrderPulse's In Transit, Delivered, Tracking Added, and RTO Return classifiers.
 */
export function mapDelhiveryStatusToShipmentStatus(
  statusText?: string | null,
  statusCode?: string | null,
  instructions?: string | null
): string | null {
  const combined = `${statusText || ''} ${instructions || ''}`.trim().toLowerCase();
  const code = (statusCode || '').trim().toUpperCase();

  if (
    combined.includes('rto') ||
    combined.includes('return to origin') ||
    combined.includes('returned') ||
    code === 'RT' ||
    code === 'RTO'
  ) {
    return 'rto_initiated';
  }
  if (combined.includes('delivered') || code === 'DL') {
    return 'delivered';
  }
  if (combined.includes('out for delivery') || combined.includes('dispatched') && combined.includes('delivery') || code === 'OFD') {
    return 'out_for_delivery';
  }
  if (
    combined.includes('undelivered') ||
    combined.includes('delivery attempted') ||
    combined.includes('not available') ||
    combined.includes('door closed') ||
    combined.includes('rescheduled') ||
    code === 'UD'
  ) {
    return 'attempted_delivery';
  }
  if (combined.includes('picked up')) {
    return 'picked_up';
  }
  if (
    combined.includes('in transit') ||
    combined.includes('reached') ||
    combined.includes('left origin') ||
    combined.includes('connected') ||
    code === 'IT'
  ) {
    return 'in_transit';
  }
  if (combined.includes('manifested') || combined.includes('pending')) {
    return 'confirmed';
  }
  return null;
}

export interface DelhiveryTrackingSnapshot {
  awb: string;
  shipmentStatus: string | null;
  rawStatus: string;
  chargedWeightGrams: number | null;
  destination: string;
  origin: string;
  destinationPincode: string;
  pickedUpAt: string | null;
  expectedDeliveryAt: string | null;
  deliveredAt: string | null;
  deliveryAttemptsCount: number | null;
  lastScanLocation: string | null;
  lastScanRemark: string | null;
  lastScanAt: string | null;
}

function normalizeDelhiveryIso(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed.includes('T') || trimmed.includes('+') ? trimmed : `${trimmed}+05:30`);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

interface DelhiveryTrackingApiResponse {
  ShipmentData?: Array<{
    Shipment?: {
      AWB?: string;
      Status?: {
        Status?: string;
        StatusCode?: string;
        StatusLocation?: string;
        StatusDateTime?: string;
        Instructions?: string;
      };
      PickUpDate?: string | null;
      ExpectedDeliveryDate?: string | null;
      PromisedDeliveryDate?: string | null;
      DeliveryDate?: string | null;
      DispatchCount?: number | string | null;
      Origin?: string;
      Destination?: string;
      ChargedWeight?: number | string | null;
      Weight?: number | string | null;
      Consignee?: {
        PinCode?: number | string | null;
      } | null;
    };
  }>;
  Error?: string;
}

export async function testDelhiveryConnection(
  settings: AppSettings
): Promise<{ ok: boolean; error?: string; sampleAmount?: number; detectedOriginPin?: string }> {
  const token = (settings.delhiveryApiToken || '').trim();
  if (!token) {
    return { ok: false, error: 'Enter your Delhivery One API Token first.' };
  }

  let originPin = extractCleanIndianPincode(settings.delhiveryPickupPincode);
  if (!originPin && hasLiveShopifyCredentials(settings)) {
    originPin = await fetchShopifyOriginPincode(settings);
  }
  const testOrigin = originPin || '110001';
  const url = `${DELHIVERY_BASE_URL}/api/kinko/v1/invoice/charges/.json?md=E&cgm=500&o_pin=${testOrigin}&d_pin=400001&ss=Delivered&pt=Pre-paid`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
        Accept: 'application/json',
      },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Invalid or unauthorized Delhivery One API token.' };
    }
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Delhivery API ${res.status}: ${body.slice(0, 160)}` };
    }
    const data = (await res.json()) as unknown;
    const item = Array.isArray(data) ? data[0] : data;
    const totalAmount =
      item && typeof item === 'object' && 'total_amount' in item
        ? Number((item as { total_amount?: unknown }).total_amount)
        : undefined;
    return {
      ok: true,
      sampleAmount: Number.isFinite(totalAmount) ? totalAmount : undefined,
      detectedOriginPin: originPin || undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error connecting to Delhivery One',
    };
  }
}

export async function fetchDelhiveryTrackingBatch(
  token: string,
  waybills: string[]
): Promise<Map<string, DelhiveryTrackingSnapshot>> {
  const result = new Map<string, DelhiveryTrackingSnapshot>();
  const cleanBills = Array.from(new Set(waybills.map((w) => w.trim()).filter(Boolean)));
  if (!token || cleanBills.length === 0) return result;

  for (let i = 0; i < cleanBills.length; i += 25) {
    const chunk = cleanBills.slice(i, i + 25);
    const url = `${DELHIVERY_BASE_URL}/api/v1/packages/json/?waybill=${encodeURIComponent(chunk.join(','))}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as DelhiveryTrackingApiResponse;
      const list = Array.isArray(data.ShipmentData) ? data.ShipmentData : [];
      for (const entry of list) {
        const s = entry?.Shipment;
        if (!s?.AWB) continue;
        const awb = String(s.AWB).trim();
        const weightKg = Number.parseFloat(String(s.ChargedWeight ?? s.Weight ?? ''));
        const chargedWeightGrams =
          Number.isFinite(weightKg) && weightKg > 0 ? Math.round(weightKg * 1000) : null;
        const consigneePin = extractCleanIndianPincode(
          s.Consignee?.PinCode ? String(s.Consignee.PinCode) : ''
        );
        const shipmentStatus = mapDelhiveryStatusToShipmentStatus(
          s.Status?.Status,
          s.Status?.StatusCode,
          s.Status?.Instructions
        );
        const attempts = Number.parseInt(String(s.DispatchCount ?? ''), 10);
        const lastScanAt = normalizeDelhiveryIso(s.Status?.StatusDateTime);
        const deliveredAt =
          shipmentStatus === 'delivered'
            ? normalizeDelhiveryIso(s.DeliveryDate) || lastScanAt
            : null;
        result.set(awb, {
          awb,
          shipmentStatus,
          rawStatus: s.Status?.Status || '',
          chargedWeightGrams,
          destination: s.Destination || '',
          origin: s.Origin || '',
          destinationPincode: consigneePin,
          pickedUpAt: normalizeDelhiveryIso(s.PickUpDate),
          expectedDeliveryAt:
            normalizeDelhiveryIso(s.ExpectedDeliveryDate) ||
            normalizeDelhiveryIso(s.PromisedDeliveryDate),
          deliveredAt,
          deliveryAttemptsCount: Number.isFinite(attempts) && attempts > 0 ? attempts : null,
          lastScanLocation: s.Status?.StatusLocation?.trim() || null,
          lastScanRemark:
            (s.Status?.Instructions || s.Status?.Status || '').trim() || null,
          lastScanAt,
        });
      }
    } catch {
      // Skip failing batch safely
    }
  }

  return result;
}

export interface DelhiveryPackingSlipSnapshot {
  awb: string;
  deadWeightGrams: number | null;
  volumetricWeightGrams: number | null;
  billableWeightGrams: number | null;
  mot: 'E' | 'S' | null;
  paymentType: 'Pre-paid' | 'COD' | null;
  codAmount: number;
  originPincode: string;
  destPincode: string;
  promisedDeliveryAt: string | null;
}

interface DelhiveryPackingSlipApiResponse {
  packages?: Array<{
    wbn?: string | null;
    weight?: number | string | null;
    shipment_length?: number | string | null;
    shipment_width?: number | string | null;
    shipment_height?: number | string | null;
    mot?: string | null;
    pt?: string | null;
    cod?: number | string | null;
    rpin?: number | string | null;
    pin?: number | string | null;
    pdd?: string | null;
  }>;
}

/**
 * Queries Delhivery Packing Slip API (`/api/p/packing_slip?wbns=...`) which exposes the
 * exact manifested dead weight (grams), parcel LxWxH dimensions, transport mode (E/S),
 * payment type (Pre-paid/COD), warehouse return PIN, and promised delivery date.
 */
export async function fetchDelhiveryPackingSlipBatch(
  token: string,
  waybills: string[]
): Promise<Map<string, DelhiveryPackingSlipSnapshot>> {
  const result = new Map<string, DelhiveryPackingSlipSnapshot>();
  const cleanBills = Array.from(new Set(waybills.map((w) => w.trim()).filter(Boolean)));
  if (!token || cleanBills.length === 0) return result;

  for (let i = 0; i < cleanBills.length; i += 25) {
    const chunk = cleanBills.slice(i, i + 25);
    const url = `${DELHIVERY_BASE_URL}/api/p/packing_slip?wbns=${encodeURIComponent(chunk.join(','))}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as DelhiveryPackingSlipApiResponse;
      const list = Array.isArray(data.packages) ? data.packages : [];
      for (const pkg of list) {
        const awb = String(pkg?.wbn || '').trim();
        if (!awb) continue;

        const deadRaw = Number.parseFloat(String(pkg.weight ?? ''));
        const lengthRaw = Number.parseFloat(String(pkg.shipment_length ?? ''));
        const widthRaw = Number.parseFloat(String(pkg.shipment_width ?? ''));
        const heightRaw = Number.parseFloat(String(pkg.shipment_height ?? ''));
        const weights = computeBillableParcelWeightGrams(
          Number.isFinite(deadRaw) ? deadRaw : null,
          Number.isFinite(lengthRaw) ? lengthRaw : null,
          Number.isFinite(widthRaw) ? widthRaw : null,
          Number.isFinite(heightRaw) ? heightRaw : null
        );

        const rawMot = String(pkg.mot || '').trim().toUpperCase();
        const mot: 'E' | 'S' | null = rawMot === 'S' ? 'S' : rawMot === 'E' ? 'E' : null;

        const rawPt = String(pkg.pt || '').trim().toLowerCase();
        const paymentType: 'Pre-paid' | 'COD' | null = rawPt.includes('cod')
          ? 'COD'
          : rawPt.includes('pre')
            ? 'Pre-paid'
            : null;

        const codRaw = Number.parseFloat(String(pkg.cod ?? ''));
        const codAmount = Number.isFinite(codRaw) && codRaw > 0 ? codRaw : 0;

        result.set(awb, {
          awb,
          deadWeightGrams: weights.deadWeightGrams,
          volumetricWeightGrams: weights.volumetricWeightGrams,
          billableWeightGrams: weights.billableWeightGrams,
          mot,
          paymentType,
          codAmount,
          originPincode: extractCleanIndianPincode(pkg.rpin != null ? String(pkg.rpin) : ''),
          destPincode: extractCleanIndianPincode(pkg.pin != null ? String(pkg.pin) : ''),
          promisedDeliveryAt: normalizeDelhiveryIso(typeof pkg.pdd === 'string' ? pkg.pdd : null),
        });
      }
    } catch {
      // Skip failing batch safely
    }
  }

  return result;
}

export interface DelhiveryChargeEstimate {
  totalAmount: number;
  grossAmount: number;
  codCharge: number;
  freightCharge: number;
  includesForwardInRto: boolean;
}

export async function fetchDelhiveryInvoiceCharge(
  token: string,
  params: {
    mode: 'E' | 'S';
    weightGrams: number;
    originPin: string;
    destPin: string;
    status: 'Delivered' | 'RTO';
    paymentType: 'Pre-paid' | 'COD';
    codAmount?: number;
  }
): Promise<DelhiveryChargeEstimate | null> {
  if (!token || !params.originPin || !params.destPin) return null;
  const search = new URLSearchParams({
    md: params.mode,
    cgm: String(Math.max(100, Math.round(params.weightGrams || 500))),
    o_pin: params.originPin,
    d_pin: params.destPin,
    ss: params.status,
    pt: params.paymentType,
  });
  if (params.paymentType === 'COD' && params.codAmount && params.codAmount > 0) {
    search.set('cod', String(Math.round(params.codAmount)));
  }

  try {
    const res = await fetch(
      `${DELHIVERY_BASE_URL}/api/kinko/v1/invoice/charges/.json?${search.toString()}`,
      {
        headers: {
          Authorization: `Token ${token}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    const item = Array.isArray(raw) ? raw[0] : raw;
    if (!item || typeof item !== 'object') return null;

    const record = item as Record<string, unknown>;
    const total = Number(record.total_amount);
    const gross = Number(record.gross_amount ?? 0);
    const cod = Number(record.charge_COD ?? 0);
    const dl = Number(record.charge_DL ?? 0);
    const rto = Number(record.charge_RTO ?? 0);
    if (!Number.isFinite(total) || total <= 0) return null;

    const split = splitDelhiveryChargeWithGst(
      total,
      Number.isFinite(gross) && gross > 0 ? gross : null,
      Number.isFinite(cod) && cod > 0 ? cod : 0
    );

    return {
      totalAmount: split.totalAmount,
      grossAmount: Number.isFinite(gross) && gross > 0 ? Math.round(gross * 100) / 100 : split.totalAmount,
      codCharge: split.codFee,
      freightCharge: split.shippingCost,
      includesForwardInRto: Number.isFinite(dl) && dl > 0 && Number.isFinite(rto) && rto > 0,
    };
  } catch {
    return null;
  }
}

function looksLikeDelhiveryOrder(order: OrderRecord): boolean {
  const company = (order.trackingCompany || '').toLowerCase();
  const url = (order.trackingUrl || '').toLowerCase();
  if (company.includes('delhivery') || url.includes('delhivery')) return true;
  // Standard Delhivery 12-15 digit AWB if courier company isn't filled yet
  const awb = (order.trackingNumber || '').trim();
  return !company && /^\d{12,15}$/.test(awb);
}

/**
 * Syncs AWB tracking statuses and exact forward/RTO/COD Delhivery One charges across orders.
 */
export async function syncDelhiveryOrdersNow(
  orders: OrderRecord[],
  settings: AppSettings,
  saveOrder: (order: OrderRecord) => void,
  savePickupPincode?: (pincode: string) => void
): Promise<{
  ok: boolean;
  trackedCount: number;
  chargesUpdatedCount: number;
  detectedOriginPin?: string;
  warning?: string;
  error?: string;
}> {
  const token = (settings.delhiveryApiToken || '').trim();
  if (!token) {
    return {
      ok: false,
      trackedCount: 0,
      chargesUpdatedCount: 0,
      error: 'Configure your Delhivery One API Token in Automation & Shopify -> Delhivery One & P&L.',
    };
  }

  let originPin = extractCleanIndianPincode(settings.delhiveryPickupPincode);
  let detectedOriginPin = '';
  if (!originPin && hasLiveShopifyCredentials(settings)) {
    originPin = await fetchShopifyOriginPincode(settings);
    if (originPin) {
      detectedOriginPin = originPin;
      savePickupPincode?.(originPin);
    }
  }

  const candidateOrders = orders.filter(
    (o) => Boolean(o.trackingNumber?.trim()) && looksLikeDelhiveryOrder(o)
  );
  const waybills = candidateOrders
    .map((o) => o.trackingNumber!.trim())
    .filter(Boolean);

  const [trackingMap, packingSlipMap] = await Promise.all([
    fetchDelhiveryTrackingBatch(token, waybills),
    fetchDelhiveryPackingSlipBatch(token, waybills),
  ]);

  if (!originPin) {
    for (const slip of packingSlipMap.values()) {
      if (slip.originPincode) {
        originPin = slip.originPincode;
        detectedOriginPin = originPin;
        savePickupPincode?.(originPin);
        break;
      }
    }
  }

  const chargeCache = new Map<string, DelhiveryChargeEstimate | null>();
  const nowIso = new Date().toISOString();

  let trackedCount = 0;
  let chargesUpdatedCount = 0;

  for (const order of orders) {
    const awb = (order.trackingNumber || '').trim();
    const track = awb ? trackingMap.get(awb) : undefined;
    const slip = awb ? packingSlipMap.get(awb) : undefined;
    let modified = false;

    if (track) {
      trackedCount += 1;
      if (track.shipmentStatus && order.shipmentStatus !== track.shipmentStatus) {
        order.shipmentStatus = track.shipmentStatus;
        modified = true;
      }
      if (track.destinationPincode && !order.destinationPincode) {
        order.destinationPincode = track.destinationPincode;
        modified = true;
      }
      if (!order.trackingCompany) {
        order.trackingCompany = 'Delhivery';
        modified = true;
      }
      if (track.pickedUpAt && order.pickedUpAt !== track.pickedUpAt) {
        order.pickedUpAt = track.pickedUpAt;
        modified = true;
      }
      if (track.expectedDeliveryAt && order.expectedDeliveryAt !== track.expectedDeliveryAt) {
        order.expectedDeliveryAt = track.expectedDeliveryAt;
        modified = true;
      }
      if (track.deliveredAt && order.deliveredAt !== track.deliveredAt) {
        order.deliveredAt = track.deliveredAt;
        modified = true;
      }
      if (
        track.deliveryAttemptsCount &&
        order.deliveryAttemptsCount !== track.deliveryAttemptsCount
      ) {
        order.deliveryAttemptsCount = track.deliveryAttemptsCount;
        modified = true;
      }
      if (track.lastScanLocation && order.lastCourierScanLocation !== track.lastScanLocation) {
        order.lastCourierScanLocation = track.lastScanLocation;
        modified = true;
      }
      if (track.lastScanRemark && order.lastCourierScanRemark !== track.lastScanRemark) {
        order.lastCourierScanRemark = track.lastScanRemark;
        modified = true;
      }
      if (track.lastScanAt && order.lastCourierScanAt !== track.lastScanAt) {
        order.lastCourierScanAt = track.lastScanAt;
        modified = true;
      }
    }

    if (slip) {
      if (slip.destPincode && !order.destinationPincode) {
        order.destinationPincode = slip.destPincode;
        modified = true;
      }
      if (slip.promisedDeliveryAt && !order.expectedDeliveryAt) {
        order.expectedDeliveryAt = slip.promisedDeliveryAt;
        modified = true;
      }
    }

    // Prefer Delhivery hub ChargedWeight if present, else Delhivery manifested packing-slip billable weight
    const delhiveryWeightGrams =
      track?.chargedWeightGrams || slip?.billableWeightGrams || slip?.deadWeightGrams || null;
    if (delhiveryWeightGrams && order.delhiveryChargedWeightGrams !== delhiveryWeightGrams) {
      order.delhiveryChargedWeightGrams = delhiveryWeightGrams;
      modified = true;
    }

    const orderOriginPin = slip?.originPincode || originPin;
    const destPin =
      extractCleanIndianPincode(order.destinationPincode) ||
      slip?.destPincode ||
      extractCleanIndianPincode(order.deliverySummary);

    // Keep official Delhivery Wallet/Passbook CSV deductions untouched once imported
    if (
      order.delhiveryChargeSource !== 'delhivery_wallet' &&
      orderOriginPin &&
      destPin &&
      (awb || order.fulfillmentStatus === 'fulfilled')
    ) {
      const weightGrams =
        delhiveryWeightGrams ||
        order.delhiveryChargedWeightGrams ||
        order.orderWeightGrams ||
        settings.delhiveryDefaultWeightGrams ||
        500;
      const isCodFromOrder =
        (order.paymentMethod || '').toLowerCase().includes('cod') ||
        order.financialStatus === 'pending';
      const pt: 'COD' | 'Pre-paid' =
        slip?.paymentType || (isCodFromOrder ? 'COD' : 'Pre-paid');
      const isCod = pt === 'COD';
      const codAmount = isCod
        ? slip?.codAmount && slip.codAmount > 0
          ? slip.codAmount
          : Number.parseFloat(order.totalPrice || '0') || 0
        : 0;
      const billingMode: 'E' | 'S' = slip?.mot || settings.delhiveryBillingMode || 'E';

      const fwdKey = `${orderOriginPin}|${destPin}|${weightGrams}|${billingMode}|Delivered|${pt}|${Math.round(codAmount)}`;
      let fwdEst = chargeCache.get(fwdKey);
      if (fwdEst === undefined) {
        fwdEst = await fetchDelhiveryInvoiceCharge(token, {
          mode: billingMode,
          weightGrams,
          originPin: orderOriginPin,
          destPin,
          status: 'Delivered',
          paymentType: pt,
          codAmount,
        });
        chargeCache.set(fwdKey, fwdEst);
      }

      const rtoKey = `${orderOriginPin}|${destPin}|${weightGrams}|${billingMode}|RTO|Pre-paid|0`;
      let rtoEst = chargeCache.get(rtoKey);
      if (rtoEst === undefined) {
        rtoEst = await fetchDelhiveryInvoiceCharge(token, {
          mode: billingMode,
          weightGrams,
          originPin: orderOriginPin,
          destPin,
          status: 'RTO',
          paymentType: 'Pre-paid',
        });
        chargeCache.set(rtoKey, rtoEst);
      }

      if (fwdEst) {
        const nextShip = fwdEst.freightCharge;
        const nextCod = isCod
          ? fwdEst.codCharge > 0
            ? fwdEst.codCharge
            : settings.fallbackCodFee
          : 0;
        const nextRto = rtoEst
          ? computeIncrementalRtoLegCost(
              rtoEst.totalAmount,
              nextShip,
              rtoEst.includesForwardInRto
            )
          : order.delhiveryRtoCost ?? null;

        order.delhiveryShippingCost = nextShip;
        order.delhiveryCodFee = nextCod;
        if (nextRto !== null) {
          order.delhiveryRtoCost = nextRto;
        }
        order.delhiveryChargeSource = 'delhivery_api';
        order.delhiveryLastSyncedAt = nowIso;
        chargesUpdatedCount += 1;
        modified = true;
      }
    }

    if (modified) {
      saveOrder(order);
    }
  }

  const warning = !originPin
    ? 'AWB tracking updated, but Warehouse Pickup Pincode is missing — add your 6-digit pickup pincode once in Delhivery One Settings (or Shopify Locations) so Delhivery API can fetch per-parcel freight.'
    : undefined;

  return {
    ok: true,
    trackedCount,
    chargesUpdatedCount,
    detectedOriginPin: detectedOriginPin || undefined,
    warning,
  };
}

/**
 * Matches exported Delhivery One Wallet / Passbook / Billing CSV rows against orders
 * by AWB or Shopify order number and locks exact per-parcel deductions.
 */
export function importDelhiveryBillingCsvToOrders(
  csvText: string,
  orders: OrderRecord[],
  saveOrder: (order: OrderRecord) => void
): { ok: boolean; updatedCount: number; parsedCount: number; error?: string } {
  const entries = parseDelhiveryBillingCsv(csvText);
  if (entries.length === 0) {
    return {
      ok: false,
      updatedCount: 0,
      parsedCount: 0,
      error: 'Could not find AWB/Waybill or Charge columns in that CSV. Export Wallet Passbook or Invoice CSV from one.delhivery.com.',
    };
  }

  const byAwb = new Map<string, OrderRecord>();
  const byOrderNum = new Map<string, OrderRecord>();
  for (const order of orders) {
    const awb = (order.trackingNumber || '').trim();
    if (awb) byAwb.set(awb, order);
    const numKey = order.orderNumber.replace(/^#/, '').trim().toLowerCase();
    if (numKey) byOrderNum.set(numKey, order);
  }

  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  for (const entry of entries) {
    const matched =
      (entry.awb ? byAwb.get(entry.awb) : undefined) ||
      (entry.orderNumber
        ? byOrderNum.get(entry.orderNumber.replace(/^#/, '').trim().toLowerCase())
        : undefined);
    if (!matched) continue;

    if (entry.forwardShippingCost > 0) {
      matched.delhiveryShippingCost = entry.forwardShippingCost;
    }
    if (entry.rtoShippingCost > 0) {
      matched.delhiveryRtoCost = entry.rtoShippingCost;
    }
    if (entry.codFee > 0) {
      matched.delhiveryCodFee = entry.codFee;
    }
    if (
      entry.forwardShippingCost > 0 ||
      entry.rtoShippingCost > 0 ||
      entry.codFee > 0
    ) {
      matched.delhiveryChargeSource = 'delhivery_wallet';
    }
    if (entry.utrNumber || (entry.remittedAmount ?? 0) > 0) {
      const fallbackAmt = Number.parseFloat(matched.totalPrice || '0') || 0;
      matched.settlementStatus = 'settled';
      matched.settledAmount =
        entry.remittedAmount && entry.remittedAmount > 0 ? entry.remittedAmount : fallbackAmt;
      matched.settledAt = nowIso;
      if (entry.utrNumber) {
        matched.settlementReference = entry.utrNumber;
      }
    }
    matched.delhiveryLastSyncedAt = nowIso;
    saveOrder(matched);
    updatedCount += 1;
  }

  return {
    ok: true,
    updatedCount,
    parsedCount: entries.length,
  };
}

const pincodeCache = new Map<
  string,
  { result: DelhiveryServiceabilityResult; expiresAtMs: number }
>();

/**
 * Checks live Delhivery One pincode serviceability (`/c/api/pin-codes/json/?filter_codes=...`)
 * with a 10-minute in-memory cache so Storefront widget checks stay sub-5ms on repeat visits.
 */
export async function checkDelhiveryPincodeServiceability(
  token: string,
  rawPincode: string
): Promise<DelhiveryServiceabilityResult> {
  const pincode = extractCleanIndianPincode(rawPincode);
  if (!pincode) {
    return {
      pincode: rawPincode,
      serviceable: false,
      codAvailable: false,
      prepaidAvailable: false,
      pickupAvailable: false,
      city: '',
      state: '',
      remarks: 'Invalid 6-digit Indian pincode.',
      source: 'rules_only',
    };
  }

  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return {
      pincode,
      serviceable: true,
      codAvailable: true,
      prepaidAvailable: true,
      pickupAvailable: false,
      city: '',
      state: '',
      remarks: 'Evaluated via catalog rules (Delhivery token not configured).',
      source: 'rules_only',
    };
  }

  const cacheKey = `${cleanToken.slice(-8)}:${pincode}`;
  const cached = pincodeCache.get(cacheKey);
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.result;
  }

  try {
    const res = await fetch(
      `${DELHIVERY_BASE_URL}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`,
      {
        headers: {
          Authorization: `Token ${cleanToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      return {
        pincode,
        serviceable: true,
        codAvailable: true,
        prepaidAvailable: true,
        pickupAvailable: false,
        city: '',
        state: '',
        remarks: `Delhivery API ${res.status} — evaluated with catalog rules.`,
        source: 'rules_only',
      };
    }

    const data = (await res.json()) as {
      delivery_codes?: Array<{
        postal_code?: {
          pin?: number | string;
          city?: string;
          state_code?: string;
          cod?: string;
          pre_paid?: string;
          pickup?: string;
          is_oda?: string;
          remarks?: string;
        };
      }>;
    };

    const entry = data.delivery_codes?.[0]?.postal_code;
    if (!entry) {
      const result: DelhiveryServiceabilityResult = {
        pincode,
        serviceable: false,
        codAvailable: false,
        prepaidAvailable: false,
        pickupAvailable: false,
        city: '',
        state: '',
        remarks: `Pincode ${pincode} is currently unserviceable by Delhivery.`,
        source: 'delhivery_api',
      };
      pincodeCache.set(cacheKey, { result, expiresAtMs: Date.now() + 10 * 60_000 });
      return result;
    }

    const codAvailable = String(entry.cod || '').toUpperCase() === 'Y';
    const prepaidAvailable = String(entry.pre_paid || '').toUpperCase() === 'Y';
    const pickupAvailable = String(entry.pickup || '').toUpperCase() === 'Y';
    const remarks = String(entry.remarks || '').trim();
    const serviceable =
      (codAvailable || prepaidAvailable) && !remarks.toLowerCase().includes('embargo');

    const result: DelhiveryServiceabilityResult = {
      pincode,
      serviceable,
      codAvailable,
      prepaidAvailable,
      pickupAvailable,
      city: String(entry.city || '').trim(),
      state: String(entry.state_code || '').trim(),
      remarks:
        remarks ||
        (serviceable
          ? entry.is_oda === 'Y'
            ? 'Serviceable (Out of Delivery Area — extra transit time)'
            : 'Serviceable via Delhivery'
          : 'Not serviceable'),
      source: 'delhivery_api',
    };
    pincodeCache.set(cacheKey, { result, expiresAtMs: Date.now() + 10 * 60_000 });
    return result;
  } catch {
    return {
      pincode,
      serviceable: true,
      codAvailable: true,
      prepaidAvailable: true,
      pickupAvailable: false,
      city: '',
      state: '',
      remarks: 'Delhivery check timed out — evaluated with catalog rules.',
      source: 'rules_only',
    };
  }
}
