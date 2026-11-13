import { shouldAutoDispatchPoll } from '../src/lib/orderRules.js';
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
  error?: string;
}> | null = null;
let lastAutoSyncAtMs = 0;

/**
 * Syncs latest orders from Shopify Admin API into the persistent store,
 * refreshes external Shopify tags on existing orders, and automatically
 * dispatches WhatsApp Polls for newly arrived eligible orders.
 */
export async function syncShopifyOrdersNow(
  source: 'manual' | 'auto'
): Promise<{
  ok: boolean;
  importedCount: number;
  dispatchedCount: number;
  error?: string;
}> {
  if (syncInFlight) {
    return syncInFlight;
  }

  const now = Date.now();
  if (source === 'auto' && now - lastAutoSyncAtMs < 25_000) {
    return { ok: true, importedCount: 0, dispatchedCount: 0 };
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
          error: fetched.error,
        };
      }

      let importedCount = 0;
      let dispatchedCount = 0;

      for (const raw of fetched.orders) {
        const existing = store.getOrderByShopifyId(String(raw.id));
        const parsed = parseShopifyRawOrder(raw, settings);

        if (!existing) {
          store.upsertOrder(parsed);
          importedCount += 1;

          if (shouldAutoDispatchPoll(parsed, settings)) {
            await whatsappManager.dispatchOrderPoll(parsed);
            dispatchedCount += 1;
          }
        } else {
          // Keep Shopify tags & payment/delivery metadata synced if updated in Shopify Admin
          let changed = false;
          if (raw.tags !== undefined && existing.shopifyTags !== raw.tags) {
            existing.shopifyTags = raw.tags;
            changed = true;
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
          if (changed) {
            store.upsertOrder(existing);
          }

          if (shouldAutoDispatchPoll(existing, settings)) {
            await whatsappManager.dispatchOrderPoll(existing);
            dispatchedCount += 1;
          }
        }
      }

      return { ok: true, importedCount, dispatchedCount };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}
