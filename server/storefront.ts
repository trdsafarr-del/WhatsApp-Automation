import type { Express, Request, Response } from 'express';
import {
  buildProductJsonLd,
  computeSeoAudit,
  createSampleCatalogProducts,
  evaluateProductForPincode,
  normalizeIndianPincode,
  parsePincodeListInput,
  renderBulkSeoTemplate,
  slugifyProductHandle,
} from '../src/lib/storefrontRules.js';
import type { PincodeRuleMode, ProductCatalogItem, StorefrontConfig } from '../src/lib/types.js';
import { checkDelhiveryPincodeServiceability } from './delhivery.js';
import {
  fetchShopifyProducts,
  installShopifyScriptTag,
  updateShopifyProductSeo,
} from './shopify.js';
import { store } from './store.js';

function setPublicCors(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildStorefrontWidgetScript(origin: string): string {
  const safeOrigin = JSON.stringify(origin);
  return `(function () {
  var APP_ORIGIN = ${safeOrigin};
  var STORAGE_KEY = 'orderpulse_customer_pincode';
  var rootEl = document.getElementById('orderpulse-pincode-bar');
  if (rootEl && rootEl.getAttribute('data-app-origin')) {
    APP_ORIGIN = rootEl.getAttribute('data-app-origin').replace(/\\/+$/, '');
  }

  function getSavedPin() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
  }
  function savePin(pin) {
    try { localStorage.setItem(STORAGE_KEY, pin); } catch (e) {}
  }

  function injectBanner(config, savedPin, delhivery) {
    if (config && config.pincodeGateEnabled === false) return;
    var host = document.getElementById('orderpulse-pincode-bar');
    if (!host) {
      host = document.createElement('div');
      host.id = 'orderpulse-pincode-bar';
      document.body.insertBefore(host, document.body.firstChild);
    }
    var statusText = '';
    if (savedPin) {
      var loc = delhivery && delhivery.city ? ' (' + delhivery.city + ')' : '';
      statusText = delhivery && delhivery.serviceable === false
        ? 'Not serviceable at ' + savedPin + loc
        : 'Delivering to ' + savedPin + loc;
    }
    host.innerHTML =
      '<div style="background:#0f172a;color:#f8fafc;padding:8px 14px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;border-bottom:1px solid #1e293b;">' +
      '<span>' + ((config && config.pincodePromptTitle) || 'Check delivery availability') + '</span>' +
      '<form id="op-pin-form" style="display:inline-flex;gap:6px;align-items:center;">' +
      '<input id="op-pin-input" type="text" maxlength="6" inputmode="numeric" placeholder="Enter 6-digit pincode" value="' + (savedPin || '') + '" style="padding:5px 10px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#fff;width:150px;font-size:13px;" />' +
      '<button type="submit" style="padding:5px 12px;border-radius:6px;border:none;background:#10b981;color:#fff;font-weight:600;cursor:pointer;font-size:12px;">Check</button>' +
      '</form>' +
      (statusText ? '<span id="op-pin-status" style="color:#6ee7b7;font-weight:500;">' + statusText + '</span>' : '') +
      '</div>';

    var form = document.getElementById('op-pin-form');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var input = document.getElementById('op-pin-input');
        var val = (input && input.value ? input.value : '').replace(/\\D/g, '');
        if (!/^[1-9]\\d{5}$/.test(val)) {
          alert('Please enter a valid 6-digit Indian pincode.');
          return;
        }
        savePin(val);
        runCheck(val);
      });
    }
  }

  function applyCatalogAvailability(payload) {
    var config = payload.storefrontConfig || {};
    var byHandle = {};
    (payload.products || []).forEach(function (p) {
      if (p.handle) byHandle[p.handle] = p;
    });

    var links = document.querySelectorAll('a[href*="/products/"]');
    links.forEach(function (link) {
      var match = (link.getAttribute('href') || '').match(/\\/products\\/([^/?#]+)/);
      if (!match) return;
      var handle = decodeURIComponent(match[1]);
      var info = byHandle[handle];
      if (!info) return;
      var card = link.closest('.product-card, .card-wrapper, .grid__item, .product-item, li, article') || link.parentElement;
      if (!card) return;
      if (!info.available) {
        if (config.hideUnavailableProducts) {
          card.style.display = 'none';
        } else {
          card.style.opacity = '0.55';
          if (!card.querySelector('.op-unavail-badge')) {
            var badge = document.createElement('div');
            badge.className = 'op-unavail-badge';
            badge.textContent = config.unavailableBadgeText || 'Not deliverable to this pincode';
            badge.style.cssText = 'margin-top:6px;padding:4px 8px;border-radius:4px;background:#7f1d1d;color:#fecaca;font-size:11px;font-weight:600;';
            card.appendChild(badge);
          }
        }
      } else {
        card.style.display = '';
        card.style.opacity = '';
        var oldBadge = card.querySelector('.op-unavail-badge');
        if (oldBadge) oldBadge.remove();
      }
    });

    var pdpMatch = window.location.pathname.match(/\\/products\\/([^/?#]+)/);
    if (pdpMatch) {
      var pdpHandle = decodeURIComponent(pdpMatch[1]);
      var pdpInfo = byHandle[pdpHandle];
      if (pdpInfo) {
        var atcBtn = document.querySelector('form[action*="/cart/add"] button[type="submit"], button[name="add"]');
        if (atcBtn) {
          var noteEl = document.getElementById('op-pdp-delivery-note');
          if (!noteEl) {
            noteEl = document.createElement('div');
            noteEl.id = 'op-pdp-delivery-note';
            noteEl.style.cssText = 'margin:10px 0;padding:10px 12px;border-radius:8px;font-size:13px;font-family:system-ui,sans-serif;';
            atcBtn.parentElement.insertBefore(noteEl, atcBtn);
          }
          if (!pdpInfo.available) {
            atcBtn.disabled = true;
            atcBtn.style.opacity = '0.5';
            noteEl.style.background = '#450a0a';
            noteEl.style.color = '#fecaca';
            noteEl.style.border = '1px solid #991b1b';
            noteEl.textContent = pdpInfo.reason || 'Not deliverable to this pincode';
          } else {
            atcBtn.disabled = false;
            atcBtn.style.opacity = '';
            noteEl.style.background = '#052e16';
            noteEl.style.color = '#a7f3d0';
            noteEl.style.border = '1px solid #065f46';
            noteEl.textContent = pdpInfo.reason || 'Available for delivery';
          }
        }
        if (pdpInfo.jsonLd && config.enableJsonLdSchema !== false && !document.getElementById('op-jsonld-schema')) {
          var ld = document.createElement('script');
          ld.id = 'op-jsonld-schema';
          ld.type = 'application/ld+json';
          ld.textContent = JSON.stringify(pdpInfo.jsonLd);
          document.head.appendChild(ld);
        }
      }
    }
  }

  function runCheck(pincode) {
    var url = APP_ORIGIN + '/api/storefront/pincode-check?pincode=' + encodeURIComponent(pincode || '');
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) return;
        injectBanner(data.storefrontConfig, pincode, data.delhivery);
        if (pincode) {
          applyCatalogAvailability(data);
        }
      })
      .catch(function () {});
  }

  var initialPin = getSavedPin();
  runCheck(initialPin);
})();`;
}

export function registerStorefrontRoutes(app: Express) {
  app.options('/api/storefront/*', (_req: Request, res: Response) => {
    setPublicCors(res);
    res.sendStatus(204);
  });

  // Public Storefront Pincode Check & Product Filter API (CORS-enabled for Shopify theme)
  app.get('/api/storefront/pincode-check', async (req: Request, res: Response) => {
    setPublicCors(res);
    await store.ensureHydrated();
    const rawPin = String(req.query.pincode || '');
    const pincode = normalizeIndianPincode(rawPin);
    const settings = store.getSettings();
    const storefrontConfig = store.getStorefrontConfig();
    const products = store.getProducts();

    const delhivery = pincode
      ? await checkDelhiveryPincodeServiceability(settings.delhiveryApiToken, pincode)
      : null;

    const evaluated = products.map((product) => {
      const check = pincode
        ? evaluateProductForPincode(product, pincode, storefrontConfig, delhivery)
        : {
            productId: product.id,
            shopifyProductId: product.shopifyProductId,
            handle: product.handle,
            title: product.title,
            available: true,
            codAvailable: product.allowCod,
            estimatedDays: product.estimatedDeliveryDays ?? storefrontConfig.defaultDeliveryDays,
            reason: 'Enter pincode to verify exact delivery ETA.',
          };
      return {
        ...check,
        jsonLd: storefrontConfig.enableJsonLdSchema
          ? buildProductJsonLd(product, settings.shopifyStoreDomain, settings.shopName)
          : undefined,
      };
    });

    res.json({
      ok: true,
      pincode,
      delhivery,
      storefrontConfig,
      products: evaluated,
    });
  });

  // Public Storefront Bridge Script served directly to the customer's Shopify storefront
  app.get('/api/storefront/widget.js', async (req: Request, res: Response) => {
    setPublicCors(res);
    await store.ensureHydrated();
    const config = store.getStorefrontConfig();
    const host = req.get('host') || 'localhost:3000';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const derivedOrigin = `${proto}://${host}`;
    const origin = (config.storefrontAppUrl || derivedOrigin).replace(/\/+$/, '');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(buildStorefrontWidgetScript(origin));
  });

  // Sync live catalog from Shopify Admin GraphQL API (preserving existing local pincode rules)
  app.post('/api/products/sync-shopify', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    const settings = store.getSettings();
    const fetched = await fetchShopifyProducts(settings);
    if (!fetched.ok) {
      res.status(400).json({ ok: false, error: fetched.error });
      return;
    }

    const existingMap = new Map<string, ProductCatalogItem>();
    for (const item of store.getProducts()) {
      existingMap.set(item.shopifyProductId, item);
    }

    const now = new Date().toISOString();
    let newCount = 0;

    const merged: ProductCatalogItem[] = fetched.products.map((sp) => {
      const prev = existingMap.get(sp.shopifyProductId);
      if (!prev) newCount += 1;
      return {
        id: prev?.id || `prod-${sp.shopifyProductId}`,
        shopifyProductId: sp.shopifyProductId,
        title: sp.title,
        handle: sp.handle,
        status: sp.status,
        productType: sp.productType,
        vendor: sp.vendor,
        imageUrl: sp.imageUrl,
        imageAlt: sp.imageAlt || prev?.imageAlt || '',
        price: sp.price,
        currency: sp.currency,
        seoTitle: sp.seoTitle || prev?.seoTitle || '',
        seoDescription: sp.seoDescription || prev?.seoDescription || '',
        tags: sp.tags,
        pincodeMode: prev?.pincodeMode || 'all_india',
        allowedPincodes: prev?.allowedPincodes || [],
        blockedPincodes: prev?.blockedPincodes || [],
        allowCod: prev?.allowCod ?? true,
        estimatedDeliveryDays: prev?.estimatedDeliveryDays ?? null,
        updatedAt: now,
        shopifySyncedAt: now,
      };
    });

    // Preserve any local-only custom items that are not in Shopify yet
    const fetchedIds = new Set(fetched.products.map((p) => p.shopifyProductId));
    for (const prev of store.getProducts()) {
      if (!fetchedIds.has(prev.shopifyProductId) && !/^\d+$/.test(prev.shopifyProductId)) {
        merged.push(prev);
      }
    }

    store.setProducts(merged);
    await store.flushRemote();
    res.json({
      ok: true,
      importedCount: newCount,
      totalCount: merged.length,
      products: store.getProducts(),
    });
  });

  // Load deterministic sample products so users can test Pincode & SEO workflows immediately
  app.post('/api/products/load-samples', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    const settings = store.getSettings();
    const samples = createSampleCatalogProducts(settings.shopName);
    const existing = store.getProducts();
    const existingIds = new Set(existing.map((p) => p.shopifyProductId));
    const combined = [
      ...existing,
      ...samples.filter((s) => !existingIds.has(s.shopifyProductId)),
    ];
    store.setProducts(combined);
    await store.flushRemote();
    res.json({ ok: true, products: store.getProducts() });
  });

  // Add a product manually to Pincode & SEO catalog
  app.post('/api/products', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const body = (req.body || {}) as Partial<ProductCatalogItem> & {
      allowedPincodesText?: string;
      blockedPincodesText?: string;
    };
    const title = String(body.title || '').trim();
    if (!title) {
      res.status(400).json({ ok: false, error: 'Product title is required.' });
      return;
    }

    const now = new Date().toISOString();
    const idSlug = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const mode: PincodeRuleMode =
      body.pincodeMode === 'allow_list' || body.pincodeMode === 'block_list'
        ? body.pincodeMode
        : 'all_india';

    const allowedPincodes = Array.isArray(body.allowedPincodes)
      ? parsePincodeListInput(body.allowedPincodes.join(','))
      : parsePincodeListInput(body.allowedPincodesText || '');
    const blockedPincodes = Array.isArray(body.blockedPincodes)
      ? parsePincodeListInput(body.blockedPincodes.join(','))
      : parsePincodeListInput(body.blockedPincodesText || '');

    const product: ProductCatalogItem = {
      id: `prod-local-${idSlug}`,
      shopifyProductId: `local-${idSlug}`,
      title,
      handle: slugifyProductHandle(body.handle || title) || `product-${idSlug}`,
      status: body.status === 'draft' || body.status === 'archived' ? body.status : 'active',
      productType: String(body.productType || 'General').trim(),
      vendor: String(body.vendor || store.getSettings().shopName || 'Store').trim(),
      imageUrl: String(body.imageUrl || '').trim(),
      imageAlt: String(body.imageAlt || '').trim(),
      price: String(body.price || '499.00').trim(),
      currency: String(body.currency || 'INR').trim() || 'INR',
      seoTitle: String(body.seoTitle || '').trim(),
      seoDescription: String(body.seoDescription || '').trim(),
      tags: String(body.tags || '').trim(),
      pincodeMode: mode,
      allowedPincodes,
      blockedPincodes,
      allowCod: body.allowCod !== false,
      estimatedDeliveryDays:
        typeof body.estimatedDeliveryDays === 'number' && Number.isFinite(body.estimatedDeliveryDays)
          ? Math.max(1, Math.min(30, Math.round(body.estimatedDeliveryDays)))
          : null,
      updatedAt: now,
      shopifySyncedAt: null,
    };

    store.upsertProduct(product);
    await store.flushRemote();
    res.json({ ok: true, product, products: store.getProducts() });
  });

  // Update Pincode availability rules for a product
  app.put('/api/products/:id/pincode', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const product = store.getProductById(String(req.params.id));
    if (!product) {
      res.status(404).json({ ok: false, error: 'Product not found' });
      return;
    }

    const body = (req.body || {}) as {
      pincodeMode?: PincodeRuleMode;
      allowedPincodes?: string[] | string;
      blockedPincodes?: string[] | string;
      allowCod?: boolean;
      estimatedDeliveryDays?: number | null;
    };

    const nextMode: PincodeRuleMode =
      body.pincodeMode === 'allow_list' ||
      body.pincodeMode === 'block_list' ||
      body.pincodeMode === 'all_india'
        ? body.pincodeMode
        : product.pincodeMode;

    const nextAllowed =
      body.allowedPincodes !== undefined
        ? parsePincodeListInput(
            Array.isArray(body.allowedPincodes)
              ? body.allowedPincodes.join(',')
              : body.allowedPincodes
          )
        : product.allowedPincodes;

    const nextBlocked =
      body.blockedPincodes !== undefined
        ? parsePincodeListInput(
            Array.isArray(body.blockedPincodes)
              ? body.blockedPincodes.join(',')
              : body.blockedPincodes
          )
        : product.blockedPincodes;

    const updated: ProductCatalogItem = {
      ...product,
      pincodeMode: nextMode,
      allowedPincodes: nextAllowed,
      blockedPincodes: nextBlocked,
      allowCod: typeof body.allowCod === 'boolean' ? body.allowCod : product.allowCod,
      estimatedDeliveryDays:
        body.estimatedDeliveryDays === null
          ? null
          : typeof body.estimatedDeliveryDays === 'number' &&
              Number.isFinite(body.estimatedDeliveryDays)
            ? Math.max(1, Math.min(30, Math.round(body.estimatedDeliveryDays)))
            : product.estimatedDeliveryDays,
      updatedAt: new Date().toISOString(),
    };

    store.upsertProduct(updated);
    await store.flushRemote();
    res.json({ ok: true, product: updated, products: store.getProducts() });
  });

  // Update SEO metadata for a product and push live to Shopify Admin API
  app.put('/api/products/:id/seo', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const product = store.getProductById(String(req.params.id));
    if (!product) {
      res.status(404).json({ ok: false, error: 'Product not found' });
      return;
    }

    const body = (req.body || {}) as {
      seoTitle?: string;
      seoDescription?: string;
      handle?: string;
      imageAlt?: string;
    };

    const nextHandle =
      body.handle !== undefined
        ? slugifyProductHandle(body.handle) || product.handle
        : product.handle;

    const updated: ProductCatalogItem = {
      ...product,
      seoTitle: body.seoTitle !== undefined ? String(body.seoTitle).trim() : product.seoTitle,
      seoDescription:
        body.seoDescription !== undefined
          ? String(body.seoDescription).trim()
          : product.seoDescription,
      handle: nextHandle,
      imageAlt: body.imageAlt !== undefined ? String(body.imageAlt).trim() : product.imageAlt,
      updatedAt: new Date().toISOString(),
    };

    const settings = store.getSettings();
    const shopifyRes = await updateShopifyProductSeo(settings, {
      shopifyProductId: updated.shopifyProductId,
      handle: updated.handle,
      seoTitle: updated.seoTitle,
      seoDescription: updated.seoDescription,
      imageAlt: updated.imageAlt,
    });

    if (shopifyRes.synced) {
      updated.shopifySyncedAt = new Date().toISOString();
    }

    store.upsertProduct(updated);
    await store.flushRemote();
    res.json({
      ok: true,
      shopifySynced: shopifyRes.synced,
      shopifyError: shopifyRes.error,
      product: updated,
      products: store.getProducts(),
    });
  });

  // Apply bulk SEO templates to missing or selected products
  app.post('/api/products/bulk-seo', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const body = (req.body || {}) as {
      onlyMissing?: boolean;
      productIds?: string[];
      titleTemplate?: string;
      descriptionTemplate?: string;
      pushToShopify?: boolean;
    };

    const settings = store.getSettings();
    const config = store.getStorefrontConfig();
    const titleTpl = body.titleTemplate || config.seoTitleTemplate;
    const descTpl = body.descriptionTemplate || config.seoDescriptionTemplate;
    const targetIds = Array.isArray(body.productIds) ? new Set(body.productIds) : null;
    const onlyMissing = body.onlyMissing !== false;

    const products = store.getProducts();
    let updatedCount = 0;
    let shopifySyncedCount = 0;
    const now = new Date().toISOString();

    for (const p of products) {
      if (targetIds && !targetIds.has(p.id)) continue;
      const audit = computeSeoAudit(p);
      const nextTitle =
        !onlyMissing || !p.seoTitle.trim()
          ? renderBulkSeoTemplate(titleTpl, p, settings.shopName, 60)
          : p.seoTitle;
      const nextDesc =
        !onlyMissing || !p.seoDescription.trim()
          ? renderBulkSeoTemplate(descTpl, p, settings.shopName, 160)
          : p.seoDescription;
      const nextAlt = !p.imageAlt.trim() ? p.title : p.imageAlt;

      if (
        nextTitle !== p.seoTitle ||
        nextDesc !== p.seoDescription ||
        nextAlt !== p.imageAlt ||
        audit.score < 100
      ) {
        const nextProduct: ProductCatalogItem = {
          ...p,
          seoTitle: nextTitle,
          seoDescription: nextDesc,
          imageAlt: nextAlt,
          updatedAt: now,
        };
        if (body.pushToShopify) {
          const pushRes = await updateShopifyProductSeo(settings, {
            shopifyProductId: nextProduct.shopifyProductId,
            handle: nextProduct.handle,
            seoTitle: nextProduct.seoTitle,
            seoDescription: nextProduct.seoDescription,
            imageAlt: nextProduct.imageAlt,
          });
          if (pushRes.synced) {
            nextProduct.shopifySyncedAt = now;
            shopifySyncedCount += 1;
          }
        }
        store.upsertProduct(nextProduct);
        updatedCount += 1;
      }
    }

    await store.flushRemote();
    res.json({
      ok: true,
      updatedCount,
      shopifySyncedCount,
      products: store.getProducts(),
    });
  });

  app.delete('/api/products/:id', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const removed = store.deleteProduct(String(req.params.id));
    if (!removed) {
      res.status(404).json({ ok: false, error: 'Product not found' });
      return;
    }
    await store.flushRemote();
    res.json({ ok: true, products: store.getProducts() });
  });

  // Update Storefront & SEO Studio Configuration
  app.post('/api/storefront/config', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const body = (req.body || {}) as Partial<StorefrontConfig>;
    const cur = store.getStorefrontConfig();
    const updated = store.updateStorefrontConfig({
      pincodeGateEnabled:
        typeof body.pincodeGateEnabled === 'boolean'
          ? body.pincodeGateEnabled
          : cur.pincodeGateEnabled,
      hideUnavailableProducts:
        typeof body.hideUnavailableProducts === 'boolean'
          ? body.hideUnavailableProducts
          : cur.hideUnavailableProducts,
      showDeliveryEstimateOnPdp:
        typeof body.showDeliveryEstimateOnPdp === 'boolean'
          ? body.showDeliveryEstimateOnPdp
          : cur.showDeliveryEstimateOnPdp,
      defaultDeliveryDays:
        typeof body.defaultDeliveryDays === 'number' && Number.isFinite(body.defaultDeliveryDays)
          ? Math.max(1, Math.min(30, Math.round(body.defaultDeliveryDays)))
          : cur.defaultDeliveryDays,
      pincodePromptTitle:
        typeof body.pincodePromptTitle === 'string'
          ? body.pincodePromptTitle.trim() || cur.pincodePromptTitle
          : cur.pincodePromptTitle,
      unavailableBadgeText:
        typeof body.unavailableBadgeText === 'string'
          ? body.unavailableBadgeText.trim() || cur.unavailableBadgeText
          : cur.unavailableBadgeText,
      seoTitleTemplate:
        typeof body.seoTitleTemplate === 'string'
          ? body.seoTitleTemplate.trim() || cur.seoTitleTemplate
          : cur.seoTitleTemplate,
      seoDescriptionTemplate:
        typeof body.seoDescriptionTemplate === 'string'
          ? body.seoDescriptionTemplate.trim() || cur.seoDescriptionTemplate
          : cur.seoDescriptionTemplate,
      enableJsonLdSchema:
        typeof body.enableJsonLdSchema === 'boolean'
          ? body.enableJsonLdSchema
          : cur.enableJsonLdSchema,
      storefrontAppUrl:
        typeof body.storefrontAppUrl === 'string'
          ? body.storefrontAppUrl.trim().replace(/\/+$/, '')
          : cur.storefrontAppUrl,
    });
    await store.flushRemote();
    res.json({ ok: true, storefrontConfig: updated });
  });

  // Attempt 1-click Shopify ScriptTag installation for the Storefront widget
  app.post('/api/storefront/install-shopify', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const config = store.getStorefrontConfig();
    const host = req.get('host') || 'localhost:3000';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const origin = (config.storefrontAppUrl || `${proto}://${host}`).replace(/\/+$/, '');
    const widgetUrl = `${origin}/api/storefront/widget.js`;
    const result = await installShopifyScriptTag(store.getSettings(), widgetUrl);
    res.status(result.ok ? 200 : 400).json({ ...result, widgetUrl });
  });
}
