import {
  extractShopifyTrackingInfo,
  inferInitialPollStatus,
  isOrderOnOrAfterStartDate,
  shouldAutoDispatchPoll,
  shouldAutoSendTracking,
  shouldPreserveRecentLocalTags,
} from '../src/lib/orderRules.js';
import {
  fetchShopifyOrders,
  hasLiveShopifyCredentials,
  parseShopifyRawOrder,
} from './shopify.js';
import { store } from './store.js';
import { whatsappManager } from './whatsapp.js';

let syncInFlight: Promise<{
  ok: boolean;
  importedCount: number;
  dispatchedCount: number;
  trackingSentCount: number;
  error?: string;
}> | null = null;
let lastAutoSyncAtMs = 0;

/**
 * Syncs latest orders from Shopify Admin API into the persistent store,
 * refreshes external Shopify tags & fulfillment tracking on existing orders,
 * automatically dispatches WhatsApp Polls for newly arrived eligible orders,
 * and sends tracking link WhatsApp messages when tracking is added.
 */
export async function syncShopifyOrdersNow(
  source: 'manual' | 'auto'
): Promise<{
  ok: boolean;
  importedCount: number;
  dispatchedCount: number;
  trackingSentCount: number;
  error?: string;
}> {
  if (syncInFlight) {
    return syncInFlight;
  }

  const now = Date.now();
  if (source === 'auto' && now - lastAutoSyncAtMs < 25_000) {
    return { ok: true, importedCount: 0, dispatchedCount: 0, trackingSentCount: 0 };
  }

  syncInFlight = (async () => {
    try {
      await store.ensureHydrated();
      const settings = store.getSettings();
      if (!hasLiveShopifyCredentials(settings)) {
        return {
          ok: false,
          importedCount: 0,
          dispatchedCount: 0,
          trackingSentCount: 0,
          error: 'Configure your .myshopify.com domain and credentials first.',
        };
      }

      if (source === 'auto') {
        lastAutoSyncAtMs = Date.now();
      }

      const fetched = await fetchShopifyOrders(settings);
      if (!fetched.ok) {
        return {
          ok: false,
          importedCount: 0,
          dispatchedCount: 0,
          trackingSentCount: 0,
          error: fetched.error,
        };
      }

      let importedCount = 0;
      let dispatchedCount = 0;
      let trackingSentCount = 0;

      for (const raw of fetched.orders) {
        const orderCreatedAt = raw.created_at || new Date().toISOString();
        if (!isOrderOnOrAfterStartDate(orderCreatedAt, settings.syncStartDate)) {
          continue;
        }
        const existing = store.getOrderByShopifyId(String(raw.id));
        const parsed = parseShopifyRawOrder(raw, settings);
        const tracking = extractShopifyTrackingInfo(raw);

        if (!existing) {
          store.upsertOrder(parsed);
          importedCount += 1;

          if (shouldAutoDispatchPoll(parsed, settings)) {
            await whatsappManager.dispatchOrderPoll(parsed);
            dispatchedCount += 1;
          }

          if (
            whatsappManager.isConnected() &&
            shouldAutoSendTracking(undefined, parsed, settings, tracking.fulfilledAt)
          ) {
            await whatsappManager.dispatchTrackingMessage(parsed);
            trackingSentCount += 1;
          }
        } else {
          const prevTrackingSnapshot = {
            trackingUrl: existing.trackingUrl,
            trackingNumber: existing.trackingNumber,
            trackingSentValue: existing.trackingSentValue,
          };

          const preserveLocalDecision = shouldPreserveRecentLocalTags(existing);

          // Keep Shopify tags, contact, delivery, and tracking metadata synced without clobbering fresh local updates
          let changed = false;
          if (!preserveLocalDecision && raw.tags !== undefined && existing.shopifyTags !== raw.tags) {
            existing.shopifyTags = raw.tags;
            changed = true;
          }
          if (!preserveLocalDecision) {
            const externalStatus = inferInitialPollStatus(raw, settings);
            if (
              raw.cancelled_at &&
              existing.pollStatus !== 'cancelled_by_user'
            ) {
              existing.pollStatus = 'cancelled_by_user';
              changed = true;
            } else if (
              (existing.pollStatus === 'queued' || existing.pollStatus === 'poll_sent') &&
              (externalStatus === 'confirmed' || externalStatus === 'cancelled_by_user')
            ) {
              existing.pollStatus = externalStatus;
              changed = true;
            }
          }
          if (!existing.customerPhone && parsed.customerPhone) {
            existing.customerPhone = parsed.customerPhone;
            changed = true;
          }
          if (!existing.paymentMethod && parsed.paymentMethod) {
            existing.paymentMethod = parsed.paymentMethod;
            changed = true;
          }
          if (!existing.deliverySummary && parsed.deliverySummary) {
            existing.deliverySummary = parsed.deliverySummary;
            changed = true;
          }
          if (parsed.orderNote && existing.orderNote !== parsed.orderNote) {
            existing.orderNote = parsed.orderNote;
            changed = true;
          }
          if (parsed.financialStatus && existing.financialStatus !== parsed.financialStatus) {
            existing.financialStatus = parsed.financialStatus;
            changed = true;
          }
          if (parsed.trackingUrl && existing.trackingUrl !== parsed.trackingUrl) {
            existing.trackingUrl = parsed.trackingUrl;
            changed = true;
          }
          if (parsed.trackingNumber && existing.trackingNumber !== parsed.trackingNumber) {
            existing.trackingNumber = parsed.trackingNumber;
            changed = true;
          }
          if (parsed.trackingCompany && existing.trackingCompany !== parsed.trackingCompany) {
            existing.trackingCompany = parsed.trackingCompany;
            changed = true;
          }
          if (changed) {
            store.upsertOrder(existing);
          }

          if (whatsappManager.isConnected() && shouldAutoDispatchPoll(existing, settings)) {
            await whatsappManager.dispatchOrderPoll(existing);
            dispatchedCount += 1;
          }

          if (
            whatsappManager.isConnected() &&
            shouldAutoSendTracking(prevTrackingSnapshot, existing, settings, tracking.fulfilledAt)
          ) {
            await whatsappManager.dispatchTrackingMessage(existing);
            trackingSentCount += 1;
          }
        }
      }

      return { ok: true, importedCount, dispatchedCount, trackingSentCount };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}
