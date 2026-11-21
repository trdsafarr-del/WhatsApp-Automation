import type { Express, Request, Response } from 'express';
import {
  type FestivalFeaturedProduct,
  buildFestivalThemePayload,
  isValidFestivalThemeId,
  normalizeFestivalThemeConfig,
  normalizeShopPreviewOrigin,
  rewriteShopifyHtmlForFestivalPreview,
  sanitizePreviewPath,
} from '../src/lib/festivalThemes.js';
import { buildSantaRoamerRuntimeJs } from '../src/lib/santaRoamer.js';
import { buildBakeryStorefrontSchema } from '../src/lib/geoSeo.js';
import {
  buildProductJsonLd,
  computeSeoAudit,
  createSampleCatalogProducts,
  evaluateProductForPincode,
  extractClientIpFromHeaders,
  extractPincodeFromIpGeo,
  extractPincodeFromReverseGeocode,
  normalizeIndianPincode,
  normalizeStorefrontOrigin,
  parsePincodeListInput,
  renderBulkSeoTemplate,
  slugifyProductHandle,
} from '../src/lib/storefrontRules.js';
import type {
  PincodeAutoDetectResult,
  PincodeRuleMode,
  ProductCatalogItem,
  StorefrontConfig,
} from '../src/lib/types.js';
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

const ipGeoCache = new Map<string, { result: PincodeAutoDetectResult; expiresAtMs: number }>();
const indiaPostPinCache = new Map<string, { city: string; state: string; expiresAtMs: number }>();
const indiaPostCityCache = new Map<
  string,
  { pincode: string; city: string; state: string; expiresAtMs: number }
>();
const storefrontHtmlPreviewCache = new Map<
  string,
  { html: string; finalOrigin: string; expiresAtMs: number }
>();
const storefrontLiveProductsCache = new Map<
  string,
  { products: FestivalFeaturedProduct[]; expiresAtMs: number }
>();

async function fetchLiveStorefrontCatalogForBanner(
  storeOrigin: string,
  localProducts: ProductCatalogItem[]
): Promise<FestivalFeaturedProduct[]> {
  const merged = new Map<string, FestivalFeaturedProduct>();

  for (const p of localProducts || []) {
    if (p.status === 'active' && p.handle && p.imageUrl && /^https?:\/\//i.test(p.imageUrl)) {
      merged.set(p.handle.toLowerCase(), {
        id: p.id,
        title: p.title,
        handle: p.handle,
        price: p.price,
        currency: p.currency || 'INR',
        imageUrl: p.imageUrl,
        productType: p.productType,
        tags: p.tags,
      });
    }
  }

  const cleanOrigin = normalizeShopPreviewOrigin(storeOrigin);
  const now = Date.now();
  let cached = storefrontLiveProductsCache.get(cleanOrigin);
  if (!cached || cached.expiresAtMs <= now) {
    try {
      const res = await fetch(`${cleanOrigin}/products.json?limit=50`, {
        redirect: 'follow',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'OrderPulse-Storefront/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          products?: Array<{
            id?: number | string;
            title?: string;
            handle?: string;
            product_type?: string;
            tags?: string[] | string;
            images?: Array<{ src?: string }>;
            variants?: Array<{ price?: string }>;
          }>;
        };
        const liveList: FestivalFeaturedProduct[] = [];
        for (const raw of json.products || []) {
          const img = raw.images?.[0]?.src || '';
          const handle = String(raw.handle || '').trim();
          const title = String(raw.title || '').trim();
          if (!handle || !title || !img) continue;
          liveList.push({
            id: `shopify-${raw.id ?? handle}`,
            title,
            handle,
            price: String(raw.variants?.[0]?.price || ''),
            currency: 'INR',
            imageUrl: img,
            productType: String(raw.product_type || ''),
            tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : String(raw.tags || ''),
          });
        }
        cached = { products: liveList, expiresAtMs: now + 5 * 60_000 };
        storefrontLiveProductsCache.set(cleanOrigin, cached);
      }
    } catch {
      // Non-fatal fallback to local synced catalog
    }
  }

  for (const item of cached?.products || []) {
    const key = item.handle.toLowerCase();
    if (!merged.has(key)) merged.set(key, item);
  }

  return Array.from(merged.values());
}

async function lookupIndiaPostByPincode(
  pincode: string
): Promise<{ city: string; state: string } | null> {
  const clean = normalizeIndianPincode(pincode);
  if (!clean) return null;
  const cached = indiaPostPinCache.get(clean);
  if (cached && cached.expiresAtMs > Date.now()) {
    return { city: cached.city, state: cached.state };
  }
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Array<{
      Status?: string;
      PostOffice?: Array<{ District?: string; Division?: string; State?: string }>;
    }>;
    const po = raw?.[0]?.PostOffice?.[0];
    if (!po) return null;
    const city = String(po.District || po.Division || '').trim();
    const state = String(po.State || '').trim();
    if (city || state) {
      indiaPostPinCache.set(clean, { city, state, expiresAtMs: Date.now() + 60 * 60_000 });
      return { city, state };
    }
  } catch {
    // Non-fatal fallback
  }
  return null;
}

async function lookupIndiaPostByCity(
  cityName: string
): Promise<{ pincode: string; city: string; state: string } | null> {
  const cleanCity = (cityName || '').replace(/[^a-zA-Z\s-]/g, '').trim();
  if (cleanCity.length < 3) return null;
  const cacheKey = cleanCity.toLowerCase();
  const cached = indiaPostCityCache.get(cacheKey);
  if (cached && cached.expiresAtMs > Date.now()) {
    return { pincode: cached.pincode, city: cached.city, state: cached.state };
  }
  try {
    const res = await fetch(
      `https://api.postalpincode.in/postoffice/${encodeURIComponent(cleanCity)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as Array<{
      Status?: string;
      PostOffice?: Array<{
        Name?: string;
        Pincode?: string;
        District?: string;
        State?: string;
        DeliveryStatus?: string;
      }>;
    }>;
    const offices = raw?.[0]?.PostOffice;
    if (!Array.isArray(offices) || offices.length === 0) return null;
    const preferred =
      offices.find(
        (o) =>
          normalizeIndianPincode(o.Pincode || '') &&
          String(o.DeliveryStatus || '').toLowerCase() === 'delivery'
      ) || offices.find((o) => normalizeIndianPincode(o.Pincode || ''));
    const pin = preferred ? normalizeIndianPincode(preferred.Pincode || '') : '';
    if (!pin) return null;
    const result = {
      pincode: pin,
      city: String(preferred?.District || cleanCity).trim(),
      state: String(preferred?.State || '').trim(),
    };
    indiaPostCityCache.set(cacheKey, { ...result, expiresAtMs: Date.now() + 60 * 60_000 });
    return result;
  } catch {
    return null;
  }
}

async function detectPincodeFromIp(clientIp: string): Promise<PincodeAutoDetectResult> {
  const cacheKey = clientIp || '__self__';
  const cached = ipGeoCache.get(cacheKey);
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.result;
  }

  const endpoints = clientIp
    ? [
        `https://ipwho.is/${encodeURIComponent(clientIp)}`,
        `https://ipapi.co/${encodeURIComponent(clientIp)}/json/`,
      ]
    : ['https://ipwho.is/', 'https://ipapi.co/json/'];

  let fallbackIndiaCity = '';
  let fallbackIndiaState = '';

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'OrderPulse-Storefront/1.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as unknown;
      const parsed = extractPincodeFromIpGeo(json);
      if (parsed.isIndia && parsed.pincode) {
        const hit: PincodeAutoDetectResult = {
          ok: true,
          detected: true,
          pincode: parsed.pincode,
          city: parsed.city,
          state: parsed.state,
          source: 'ip_geo',
        };
        ipGeoCache.set(cacheKey, { result: hit, expiresAtMs: Date.now() + 15 * 60_000 });
        return hit;
      }
      if (parsed.isIndia && parsed.city && !fallbackIndiaCity) {
        fallbackIndiaCity = parsed.city;
        fallbackIndiaState = parsed.state;
      }
    } catch {
      // Try next geo provider
    }
  }

  if (fallbackIndiaCity) {
    const cityPin = await lookupIndiaPostByCity(fallbackIndiaCity);
    if (cityPin) {
      const hit: PincodeAutoDetectResult = {
        ok: true,
        detected: true,
        pincode: cityPin.pincode,
        city: cityPin.city || fallbackIndiaCity,
        state: cityPin.state || fallbackIndiaState,
        source: 'india_post',
      };
      ipGeoCache.set(cacheKey, { result: hit, expiresAtMs: Date.now() + 15 * 60_000 });
      return hit;
    }
  }

  const miss: PincodeAutoDetectResult = {
    ok: true,
    detected: false,
    pincode: '',
    city: fallbackIndiaCity,
    state: fallbackIndiaState,
    source: 'none',
    reason: 'Could not auto-detect an Indian pincode from network IP — use GPS or enter manually.',
  };
  ipGeoCache.set(cacheKey, { result: miss, expiresAtMs: Date.now() + 2 * 60_000 });
  return miss;
}

function buildStorefrontWidgetScript(origin: string): string {
  const safeOrigin = JSON.stringify(origin);
  return `(function () {
  var APP_ORIGIN = ${safeOrigin};
  var STORAGE_KEY = 'orderpulse_customer_pincode';
  var SOURCE_KEY = 'orderpulse_customer_pincode_source';
  var rootEl = document.getElementById('orderpulse-pincode-bar');
  if (rootEl && rootEl.getAttribute('data-app-origin')) {
    APP_ORIGIN = rootEl.getAttribute('data-app-origin').replace(/\\/+$/, '');
  }

  var lastPayload = null;
  var isDetectingGps = false;
  var inlineNote = '';
  var activeEditScope = '';
  var observerAttached = false;
  var observerTimer = null;

  var PIN_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  var PENCIL_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';

  function getSavedPin() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
  }
  function getSavedSource() {
    try { return localStorage.getItem(SOURCE_KEY) || ''; } catch (e) { return ''; }
  }
  function savePin(pin, source) {
    try {
      localStorage.setItem(STORAGE_KEY, pin);
      if (source) localStorage.setItem(SOURCE_KEY, source);
    } catch (e) {}
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatLocationLabel(delhivery) {
    if (!delhivery) return '';
    var parts = [];
    if (delhivery.city) parts.push(delhivery.city);
    if (delhivery.state) parts.push(delhivery.state);
    return parts.length ? ' (' + parts.join(', ') + ')' : '';
  }

  function hideTopBanner() {
    var host = document.getElementById('orderpulse-pincode-bar');
    if (host) {
      host.style.display = 'none';
      host.innerHTML = '';
    }
  }

  function injectBanner(config, savedPin, delhivery, customMsg) {
    if (config && config.pincodeGateEnabled === false) {
      hideTopBanner();
      return;
    }
    if (!document.body) return;

    // Auto-hide the header bar once a valid pincode is fetched/saved so the storefront header stays clean
    if (savedPin && !customMsg) {
      hideTopBanner();
      return;
    }

    var host = document.getElementById('orderpulse-pincode-bar');
    if (!host) {
      host = document.createElement('div');
      host.id = 'orderpulse-pincode-bar';
      document.body.insertBefore(host, document.body.firstChild);
    }
    host.style.display = '';

    var statusText = customMsg || inlineNote || '';
    var statusColor = '#6ee7b7';
    if (savedPin && delhivery && delhivery.serviceable === false) {
      statusColor = '#fca5a5';
    }

    host.innerHTML =
      '<div style="background:#0f172a;color:#f8fafc;padding:8px 14px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;border-bottom:1px solid #1e293b;">' +
      '<span style="font-weight:500;">' + escapeHtml((config && config.pincodePromptTitle) || 'Check delivery availability') + '</span>' +
      '<form id="op-pin-form" style="display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;">' +
      '<input id="op-pin-input" type="text" maxlength="6" inputmode="numeric" placeholder="Enter 6-digit pincode" value="' + escapeHtml(savedPin || '') + '" style="padding:5px 10px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#fff;width:140px;font-size:13px;" />' +
      '<button type="submit" style="padding:5px 12px;border-radius:6px;border:none;background:#10b981;color:#fff;font-weight:600;cursor:pointer;font-size:12px;">Check</button>' +
      '<button type="button" id="op-pin-detect" style="padding:5px 10px;border-radius:6px;border:1px solid #38bdf8;background:#0c4a6e;color:#e0f2fe;font-weight:600;cursor:pointer;font-size:12px;">' +
      (isDetectingGps ? 'Detecting...' : 'Auto-Fetch PIN') +
      '</button>' +
      '</form>' +
      (statusText ? '<span id="op-pin-status" style="color:' + statusColor + ';font-weight:500;">' + escapeHtml(statusText) + '</span>' : '') +
      '</div>';

    var form = document.getElementById('op-pin-form');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        inlineNote = '';
        var input = document.getElementById('op-pin-input');
        var val = (input && input.value ? input.value : '').replace(/\\D/g, '');
        if (!/^[1-9]\\d{5}$/.test(val)) {
          inlineNote = 'Please enter a valid 6-digit Indian pincode.';
          injectBanner(config, savedPin, delhivery, inlineNote);
          return;
        }
        savePin(val, 'manual');
        runCheck(val);
      });
    }

    var detectBtn = document.getElementById('op-pin-detect');
    if (detectBtn) {
      detectBtn.addEventListener('click', function () {
        detectPinViaGps(config, '');
      });
    }
  }

  function detectPinViaIp(config, silent, scope) {
    return fetch(APP_ORIGIN + '/api/storefront/auto-pincode')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.detected && data.pincode) {
          inlineNote = '';
          activeEditScope = '';
          savePin(data.pincode, 'auto_ip');
          runCheck(data.pincode);
          return true;
        }
        if (!silent) {
          inlineNote = 'Could not auto-fetch pincode — please enter your 6-digit PIN.';
          if (scope && lastPayload) {
            renderAllActionBoxes(lastPayload);
          } else {
            injectBanner(config, getSavedPin(), lastPayload ? lastPayload.delhivery : null, inlineNote);
          }
        }
        return false;
      })
      .catch(function () {
        return false;
      });
  }

  function detectPinViaGps(config, scope, skipIpFallback) {
    if (isDetectingGps) return;
    if (!navigator.geolocation) {
      if (skipIpFallback) return;
      isDetectingGps = true;
      inlineNote = 'Auto-detecting location...';
      if (scope && lastPayload) renderAllActionBoxes(lastPayload);
      else injectBanner(config, getSavedPin(), lastPayload ? lastPayload.delhivery : null, inlineNote);
      detectPinViaIp(config, false, scope).finally(function () {
        isDetectingGps = false;
      });
      return;
    }

    isDetectingGps = true;
    if (!skipIpFallback) {
      inlineNote = 'Fetching your exact pincode...';
      if (scope && lastPayload) renderAllActionBoxes(lastPayload);
      else injectBanner(config, getSavedPin(), lastPayload ? lastPayload.delhivery : null, inlineNote);
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        fetch(
          APP_ORIGIN +
            '/api/storefront/reverse-pincode?lat=' +
            encodeURIComponent(lat) +
            '&lon=' +
            encodeURIComponent(lon)
        )
          .then(function (r) { return r.json(); })
          .then(function (data) {
            isDetectingGps = false;
            if (data && data.detected && data.pincode) {
              inlineNote = '';
              activeEditScope = '';
              savePin(data.pincode, 'auto_gps');
              runCheck(data.pincode);
            } else if (!skipIpFallback) {
              detectPinViaIp(config, false, scope);
            }
          })
          .catch(function () {
            isDetectingGps = false;
            if (!skipIpFallback) detectPinViaIp(config, false, scope);
          });
      },
      function () {
        if (skipIpFallback) {
          isDetectingGps = false;
          return;
        }
        detectPinViaIp(config, false, scope).finally(function () {
          isDetectingGps = false;
        });
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    );
  }

  function renderPincodeActionBox(box, scope, opts) {
    var payload = lastPayload || {};
    var config = payload.storefrontConfig || {};
    var savedPin = payload.pincode || getSavedPin();
    var delhivery = payload.delhivery || null;
    var loc = formatLocationLabel(delhivery);
    var isEditing = activeEditScope === scope || !savedPin;
    var isAvailable = opts.available !== false && (!delhivery || delhivery.serviceable !== false);

    var bg = !savedPin
      ? '#f8fafc'
      : isAvailable
        ? '#f0fdf4'
        : '#fef2f2';
    var border = !savedPin
      ? '#cbd5e1'
      : isAvailable
        ? '#bbf7d0'
        : '#fecaca';
    var textCol = !savedPin
      ? '#0f172a'
      : isAvailable
        ? '#14532d'
        : '#991b1b';
    var subCol = !savedPin
      ? '#475569'
      : isAvailable
        ? '#166534'
        : '#b91c1c';

    box.style.cssText =
      'margin:0 0 12px 0;padding:10px 12px;border-radius:10px;border:1px solid ' +
      border +
      ';background:' +
      bg +
      ';color:' +
      textCol +
      ';font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.35;box-sizing:border-box;width:100%;';

    if (isEditing) {
      box.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">' +
        '<span style="font-weight:600;font-size:12px;display:inline-flex;align-items:center;gap:5px;">' +
        PIN_SVG +
        '<span>' + (savedPin ? 'Change delivery pincode' : 'Enter delivery pincode') + '</span>' +
        '</span>' +
        (savedPin
          ? '<button type="button" class="op-box-cancel" aria-label="Cancel pincode edit" style="border:none;background:transparent;color:' + subCol + ';cursor:pointer;font-size:14px;padding:2px 6px;">✕</button>'
          : '') +
        '</div>' +
        '<form class="op-box-form" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' +
        '<input class="op-box-input" type="text" maxlength="6" inputmode="numeric" placeholder="6-digit PIN" value="' +
        escapeHtml(savedPin || '') +
        '" style="flex:1 1 110px;min-width:100px;padding:7px 10px;border-radius:7px;border:1px solid #94a3b8;background:#ffffff;color:#0f172a;font-size:13px;font-weight:600;" />' +
        '<button type="submit" style="padding:7px 12px;border-radius:7px;border:none;background:#0f172a;color:#ffffff;font-weight:600;cursor:pointer;font-size:12px;">Save</button>' +
        '<button type="button" class="op-box-gps" style="padding:7px 10px;border-radius:7px;border:1px solid #0284c7;background:#e0f2fe;color:#075985;font-weight:600;cursor:pointer;font-size:12px;">' +
        (isDetectingGps ? 'Detecting...' : 'Auto-Fetch') +
        '</button>' +
        '</form>' +
        (inlineNote
          ? '<div style="margin-top:5px;font-size:11px;color:#b91c1c;font-weight:500;">' + escapeHtml(inlineNote) + '</div>'
          : '');

      var form = box.querySelector('.op-box-form');
      var input = box.querySelector('.op-box-input');
      var gpsBtn = box.querySelector('.op-box-gps');
      var cancelBtn = box.querySelector('.op-box-cancel');

      if (form) {
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          inlineNote = '';
          var val = (input && input.value ? input.value : '').replace(/\\D/g, '');
          if (!/^[1-9]\\d{5}$/.test(val)) {
            inlineNote = 'Enter a valid 6-digit Indian pincode.';
            renderPincodeActionBox(box, scope, opts);
            return;
          }
          activeEditScope = '';
          savePin(val, 'manual');
          runCheck(val);
        });
      }
      if (gpsBtn) {
        gpsBtn.addEventListener('click', function () {
          detectPinViaGps(config, scope);
        });
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          inlineNote = '';
          activeEditScope = '';
          renderAllActionBoxes(lastPayload);
        });
      }
      return;
    }

    var headline = 'Delivering to ' + escapeHtml(savedPin) + escapeHtml(loc);
    if (!isAvailable) {
      headline = 'Unavailable at ' + escapeHtml(savedPin) + escapeHtml(loc);
    }

    var subline = opts.subline || '';
    if (!subline && config.showDeliveryEstimateOnPdp !== false) {
      subline = isAvailable
        ? 'Est. delivery in ~' + (config.defaultDeliveryDays || 4) + ' days'
        : 'Delivery not available for this pincode';
    }

    box.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
      '<div style="min-width:0;">' +
      '<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;">' +
      PIN_SVG +
      '<span class="op-pin-label" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
      headline +
      '</span>' +
      '</div>' +
      (subline
        ? '<div style="margin-top:2px;margin-left:21px;font-size:11.5px;color:' + subCol + ';font-weight:500;">' +
          escapeHtml(subline) +
          '</div>'
        : '') +
      '</div>' +
      '<button type="button" class="op-pin-pencil" aria-label="Change delivery pincode" title="Change pincode" style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;padding:5px 8px;border-radius:7px;border:1px solid ' +
      border +
      ';background:#ffffff;color:#0f172a;cursor:pointer;font-size:11px;font-weight:600;">' +
      PENCIL_SVG +
      '</button>' +
      '</div>';

    var pencilBtn = box.querySelector('.op-pin-pencil');
    if (pencilBtn) {
      pencilBtn.addEventListener('click', function () {
        inlineNote = '';
        activeEditScope = scope;
        renderAllActionBoxes(lastPayload);
        var nextInput = box.querySelector('.op-box-input');
        if (nextInput) nextInput.focus();
      });
    }
  }

  function renderPdpAndCheckoutWidgets(payload) {
    if (!payload) return;
    if (payload.bakeryGeoSchema && !document.getElementById('op-geo-bakery-schema')) {
      var geoLd = document.createElement('script');
      geoLd.id = 'op-geo-bakery-schema';
      geoLd.type = 'application/ld+json';
      geoLd.textContent = JSON.stringify(payload.bakeryGeoSchema);
      document.head.appendChild(geoLd);
    }
    var staleStrip = document.getElementById('op-geo-zone-strip');
    if (staleStrip && staleStrip.parentNode) {
      staleStrip.parentNode.removeChild(staleStrip);
    }
    var config = payload.storefrontConfig || {};
    if (config.pincodeGateEnabled === false) return;

    var byHandle = {};
    (payload.products || []).forEach(function (p) {
      if (p.handle) byHandle[p.handle] = p;
    });

    // 1) Product Page (PDP): place Pincode + Pencil box directly ABOVE Add-to-Cart / Buy Now buttons
    var pdpMatch = window.location.pathname.match(/\\/products\\/([^/?#]+)/);
    if (pdpMatch) {
      var pdpHandle = decodeURIComponent(pdpMatch[1]);
      var pdpInfo = byHandle[pdpHandle] || null;
      var atcForm = document.querySelector(
        'form[action*="/cart/add"][data-type="add-to-cart-form"], form[action*="/cart/add"]:not([id*="installment"])'
      );
      var atcBtn = atcForm
        ? atcForm.querySelector('button[name="add"], button[type="submit"].product-form__submit, button[type="submit"]')
        : document.querySelector('form[action*="/cart/add"]:not([id*="installment"]) button[type="submit"], button[name="add"]');

      if (atcBtn) {
        var btnGroup = atcBtn.closest('.product-form__buttons') || atcBtn.parentElement;
        var pdpBox = document.getElementById('op-pdp-delivery-note');
        if (!pdpBox && btnGroup && btnGroup.parentElement) {
          pdpBox = document.createElement('div');
          pdpBox.id = 'op-pdp-delivery-note';
          if (btnGroup.classList && btnGroup.classList.contains('product-form__buttons')) {
            btnGroup.parentElement.insertBefore(pdpBox, btnGroup);
          } else {
            atcBtn.parentElement.insertBefore(pdpBox, atcBtn);
          }
        }

        var pdpAvailable = !pdpInfo || pdpInfo.available !== false;
        var buyNowWrap = atcForm ? atcForm.querySelector('.shopify-payment-button, [data-shopify="payment-button"]') : null;
        if (!pdpAvailable) {
          atcBtn.disabled = true;
          atcBtn.style.opacity = '0.5';
          if (buyNowWrap) {
            buyNowWrap.style.pointerEvents = 'none';
            buyNowWrap.style.opacity = '0.45';
          }
        } else {
          atcBtn.disabled = false;
          atcBtn.style.opacity = '';
          if (buyNowWrap) {
            buyNowWrap.style.pointerEvents = '';
            buyNowWrap.style.opacity = '';
          }
        }

        if (pdpBox) {
          renderPincodeActionBox(pdpBox, 'pdp', {
            available: pdpAvailable,
            subline: pdpInfo ? pdpInfo.reason : '',
          });
        }
      }

      if (pdpInfo && pdpInfo.jsonLd && config.enableJsonLdSchema !== false && !document.getElementById('op-jsonld-schema')) {
        var ld = document.createElement('script');
        ld.id = 'op-jsonld-schema';
        ld.type = 'application/ld+json';
        ld.textContent = JSON.stringify(pdpInfo.jsonLd);
        document.head.appendChild(ld);
      }
    }

    // 2) Cart Page & Cart Drawer: place Pincode + Pencil box directly ABOVE Checkout button
    var checkoutBtns = document.querySelectorAll(
      'button[name="checkout"], input[name="checkout"], .cart__checkout-button, #CartDrawer-Checkout'
    );
    checkoutBtns.forEach(function (chkBtn, idx) {
      if (chkBtn.closest('#orderpulse-pincode-bar')) return;
      var container = chkBtn.closest('.cart__ctas, .cart__checkout-wrapper') || chkBtn.parentElement;
      if (!container || !container.parentElement) return;

      var scopeKey = 'checkout-' + idx;
      var box = container.previousElementSibling;
      if (!box || !box.classList || !box.classList.contains('op-checkout-pincode-box')) {
        box = container.parentElement.querySelector('.op-checkout-pincode-box');
      }
      if (!box) {
        box = document.createElement('div');
        box.className = 'op-checkout-pincode-box';
        if (container.classList && (container.classList.contains('cart__ctas') || container.classList.contains('cart__checkout-wrapper'))) {
          container.parentElement.insertBefore(box, container);
        } else {
          chkBtn.parentElement.insertBefore(box, chkBtn);
        }
      }

      // Check if any product inside the same cart drawer/form is unavailable for this pincode
      var cartRoot = chkBtn.closest('cart-drawer, cart-items, form[action*="/cart"], .cart-drawer, .drawer, main') || document;
      var cartLinks = cartRoot.querySelectorAll('a[href*="/products/"]');
      var blockedTitle = '';
      cartLinks.forEach(function (cl) {
        if (blockedTitle) return;
        var m = (cl.getAttribute('href') || '').match(/\\/products\\/([^/?#]+)/);
        if (!m) return;
        var item = byHandle[decodeURIComponent(m[1])];
        if (item && item.available === false) {
          blockedTitle = item.title || 'An item in your cart';
        }
      });

      var delhiveryOk = !payload.delhivery || payload.delhivery.serviceable !== false;
      var cartOk = delhiveryOk && !blockedTitle;
      if (!cartOk && payload.pincode) {
        chkBtn.disabled = true;
        chkBtn.style.opacity = '0.5';
      } else {
        chkBtn.disabled = false;
        chkBtn.style.opacity = '';
      }

      renderPincodeActionBox(box, scopeKey, {
        available: cartOk,
        subline: blockedTitle
          ? blockedTitle + ' is not deliverable to this pincode'
          : !delhiveryOk
            ? (payload.delhivery && payload.delhivery.remarks) || 'Area currently unserviceable'
            : config.showDeliveryEstimateOnPdp !== false
              ? 'Est. delivery in ~' + (config.defaultDeliveryDays || 4) + ' days'
              : '',
      });
    });
  }

  function renderAllActionBoxes(payload) {
    renderPdpAndCheckoutWidgets(payload);
  }

  function applyCatalogAvailability(payload) {
    var config = payload.storefrontConfig || {};
    var byHandle = {};
    (payload.products || []).forEach(function (p) {
      if (p.handle) byHandle[p.handle] = p;
    });

    var links = document.querySelectorAll('a[href*="/products/"]');
    links.forEach(function (link) {
      if (link.closest('cart-drawer, .cart-drawer, .cart-items, #CartDrawer')) return;
      var match = (link.getAttribute('href') || '').match(/\\/products\\/([^/?#]+)/);
      if (!match) return;
      var handle = decodeURIComponent(match[1]);
      var info = byHandle[handle];
      if (!info) return;
      var card = link.closest('.grid__item, .product-grid-item, product-component, .product-card, .card-wrapper, .product-item, article, li') || link.parentElement;
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

    renderPdpAndCheckoutWidgets(payload);
  }

  function ensureDomObserver() {
    if (observerAttached || typeof MutationObserver === 'undefined' || !document.body) return;
    observerAttached = true;
    var observer = new MutationObserver(function () {
      if (!lastPayload) return;
      if (observerTimer) clearTimeout(observerTimer);
      observerTimer = setTimeout(function () {
        if (lastPayload.pincode) {
          applyCatalogAvailability(lastPayload);
        } else {
          renderPdpAndCheckoutWidgets(lastPayload);
        }
      }, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function trySilentGrantedGpsUpgrade(config) {
    if (!navigator.geolocation || !navigator.permissions || !navigator.permissions.query) return;
    try {
      navigator.permissions.query({ name: 'geolocation' }).then(function (perm) {
        if (perm && perm.state === 'granted') {
          detectPinViaGps(config, '', true);
        }
      }).catch(function () {});
    } catch (e) {}
  }

  var autoAttempted = false;
${buildSantaRoamerRuntimeJs()}

  function removeFestivalTheme() {
    stopSantaRoamer();
    var ids = [
      'orderpulse-festival-theme-css',
      'orderpulse-festival-bg-3d',
      'orderpulse-festival-banner',
      'orderpulse-festival-garland',
      'orderpulse-festival-hero',
      'orderpulse-festival-fx',
      'orderpulse-festival-roamer'
    ];
    for (var k = 0; k < ids.length; k++) {
      var node = document.getElementById(ids[k]);
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }
    try {
      document.documentElement.removeAttribute('data-orderpulse-festival');
    } catch (e) {}
  }

  function applyFestivalTheme(ft) {
    if (document.querySelector('script[data-op-festival-preview-bridge="1"]')) {
      return;
    }
    if (!ft || !ft.enabled || !ft.css) {
      removeFestivalTheme();
      return;
    }

    var styleEl = document.getElementById('orderpulse-festival-theme-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'orderpulse-festival-theme-css';
      (document.head || document.documentElement).appendChild(styleEl);
    }
    if (styleEl.textContent !== ft.css) {
      styleEl.textContent = ft.css;
    }

    try {
      document.documentElement.setAttribute('data-orderpulse-festival', ft.presetId || 'festive');
    } catch (e) {}

    var existingBg3d = document.getElementById('orderpulse-festival-bg-3d');
    if (ft.show3DBackground && ft.background3DHtml && document.body) {
      if (!existingBg3d) {
        existingBg3d = document.createElement('div');
        existingBg3d.id = 'orderpulse-festival-bg-3d';
        existingBg3d.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(existingBg3d, document.body.firstChild);
      }
      existingBg3d.innerHTML = ft.background3DHtml;
    } else if (existingBg3d && existingBg3d.parentNode) {
      existingBg3d.parentNode.removeChild(existingBg3d);
    }

    var bannerDismissKey = 'op_fest_banner_closed_' + (ft.presetId || 'festive');
    var bannerDismissed = false;
    try {
      bannerDismissed = sessionStorage.getItem(bannerDismissKey) === '1';
    } catch (e) {}

    var existingBanner = document.getElementById('orderpulse-festival-banner');
    if (ft.showAnnouncementBar && ft.bannerText && !bannerDismissed && document.body) {
      if (!existingBanner) {
        existingBanner = document.createElement('div');
        existingBanner.id = 'orderpulse-festival-banner';
        existingBanner.style.cssText =
          'position:relative;z-index:2147482500;width:100%;padding:9px 38px 9px 14px;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:600;line-height:1.4;letter-spacing:0.01em;box-sizing:border-box;';
        document.body.insertBefore(existingBanner, document.body.firstChild);
      }
      var safeBadge = String(ft.badgeText || '').replace(/</g, '&lt;');
      var safeText = String(ft.bannerText || '').replace(/</g, '&lt;');
      existingBanner.innerHTML =
        (safeBadge
          ? '<span style="display:inline-block;margin-right:8px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.16);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">' +
            safeBadge +
            '</span>'
          : '') +
        '<span>' +
        safeText +
        '</span>' +
        '<button type="button" id="op-fest-banner-close" aria-label="Close festive banner" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:inherit;font-size:16px;font-weight:700;cursor:pointer;padding:2px 6px;opacity:0.8;">&times;</button>';
      var closeBtn = document.getElementById('op-fest-banner-close');
      if (closeBtn) {
        closeBtn.onclick = function () {
          try {
            sessionStorage.setItem(bannerDismissKey, '1');
          } catch (e) {}
          if (existingBanner && existingBanner.parentNode) {
            existingBanner.parentNode.removeChild(existingBanner);
          }
        };
      }
    } else if (existingBanner && existingBanner.parentNode) {
      existingBanner.parentNode.removeChild(existingBanner);
    }

    var existingGarland = document.getElementById('orderpulse-festival-garland');
    if (ft.show3DArticles && ft.garlandHtml && document.body) {
      if (!existingGarland) {
        existingGarland = document.createElement('div');
        existingGarland.id = 'orderpulse-festival-garland';
        var headerGroup = document.querySelector('.shopify-section-group-header-group, header.header, .header-wrapper');
        if (headerGroup && headerGroup.parentNode) {
          headerGroup.parentNode.insertBefore(existingGarland, headerGroup.nextSibling);
        } else {
          document.body.insertBefore(existingGarland, document.body.firstChild);
        }
      }
      existingGarland.innerHTML = ft.garlandHtml;
    } else if (existingGarland && existingGarland.parentNode) {
      existingGarland.parentNode.removeChild(existingGarland);
    }

    // Show Auto-Product 3D Hero Showcase Banner on homepage & collections
    var isHomeOrCollection = window.location.pathname === '/' || window.location.pathname.indexOf('/collections') === 0;
    var existingHero = document.getElementById('orderpulse-festival-hero');
    if (ft.showHeroBanner && ft.heroBannerHtml && isHomeOrCollection && document.body) {
      if (!existingHero) {
        existingHero = document.createElement('div');
        existingHero.id = 'orderpulse-festival-hero';
        var mainEl = document.querySelector('main#MainContent, main, .content-for-layout');
        if (mainEl) {
          mainEl.insertBefore(existingHero, mainEl.firstChild);
        } else {
          document.body.insertBefore(existingHero, document.body.firstChild);
        }
      }
      existingHero.innerHTML = ft.heroBannerHtml;
    } else if (existingHero && existingHero.parentNode) {
      existingHero.parentNode.removeChild(existingHero);
    }

    var existingFx = document.getElementById('orderpulse-festival-fx');
    if (ft.enableFestiveEffects && ft.particlesHtml && document.body) {
      if (!existingFx) {
        existingFx = document.createElement('div');
        existingFx.id = 'orderpulse-festival-fx';
        existingFx.setAttribute('aria-hidden', 'true');
        document.body.appendChild(existingFx);
      }
      existingFx.innerHTML = ft.particlesHtml;
    } else if (existingFx && existingFx.parentNode) {
      existingFx.parentNode.removeChild(existingFx);
    }

    mountFestivalRoamer(ft);
  }

  function runCheck(pincode, isInitialBoot) {
    var url = APP_ORIGIN + '/api/storefront/pincode-check?pincode=' + encodeURIComponent(pincode || '');
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) return;
        lastPayload = data;
        var cfg = data.storefrontConfig || {};
        applyFestivalTheme(data.festivalThemePayload || null);

        if (!pincode && isInitialBoot && !autoAttempted && cfg.autoDetectPincode !== false) {
          autoAttempted = true;
          hideTopBanner();
          renderPdpAndCheckoutWidgets(data);
          ensureDomObserver();
          detectPinViaIp(cfg, true).then(function (found) {
            if (!found) {
              injectBanner(cfg, '', data.delhivery);
            }
          });
          return;
        }

        injectBanner(cfg, pincode, data.delhivery);
        if (pincode) {
          applyCatalogAvailability(data);
        } else {
          renderPdpAndCheckoutWidgets(data);
        }
        ensureDomObserver();
      })
      .catch(function () {});
  }

  function bootstrapStorefront() {
    var savedPin = getSavedPin();
    if (savedPin) {
      runCheck(savedPin, false);
      if (getSavedSource() === 'auto_ip') {
        trySilentGrantedGpsUpgrade({});
      }
      return;
    }

    runCheck('', true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapStorefront);
  } else {
    bootstrapStorefront();
  }
})();`;
}

export function registerStorefrontRoutes(app: Express) {
  app.options('/api/storefront/*', (_req: Request, res: Response) => {
    setPublicCors(res);
    res.sendStatus(204);
  });

  // Public Auto-Fetch Pincode via Vercel Edge Geo headers + Visitor IP + India Post fallback
  app.get('/api/storefront/auto-pincode', async (req: Request, res: Response) => {
    setPublicCors(res);

    const vercelCountry = String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase();
    const vercelPostal = normalizeIndianPincode(
      String(req.headers['x-vercel-ip-postal-code'] || '')
    );
    const vercelCityRaw = String(req.headers['x-vercel-ip-city'] || '').trim();
    const vercelCity = vercelCityRaw ? decodeURIComponent(vercelCityRaw) : '';
    const vercelRegion = String(req.headers['x-vercel-ip-country-region'] || '').trim();

    if (vercelCountry === 'IN' && vercelPostal) {
      res.json({
        ok: true,
        detected: true,
        pincode: vercelPostal,
        city: vercelCity,
        state: vercelRegion,
        source: 'vercel_edge',
      } satisfies PincodeAutoDetectResult);
      return;
    }

    if (vercelCountry === 'IN' && vercelCity) {
      const cityLookup = await lookupIndiaPostByCity(vercelCity);
      if (cityLookup) {
        res.json({
          ok: true,
          detected: true,
          pincode: cityLookup.pincode,
          city: cityLookup.city || vercelCity,
          state: cityLookup.state || vercelRegion,
          source: 'vercel_edge',
        } satisfies PincodeAutoDetectResult);
        return;
      }
    }

    const overrideIp = String(req.query.ip || '').trim();
    const clientIp = overrideIp || extractClientIpFromHeaders(req.headers);
    const detected = await detectPincodeFromIp(clientIp);
    res.json(detected);
  });

  // Public GPS Reverse-Geocode Pincode Lookup (Nominatim + India Post fallback)
  app.get('/api/storefront/reverse-pincode', async (req: Request, res: Response) => {
    setPublicCors(res);
    const lat = Number.parseFloat(String(req.query.lat || ''));
    const lon = Number.parseFloat(String(req.query.lon || ''));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      res.status(400).json({
        ok: false,
        detected: false,
        pincode: '',
        city: '',
        state: '',
        source: 'none',
        reason: 'Invalid latitude or longitude coordinates.',
      } satisfies PincodeAutoDetectResult);
      return;
    }

    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&zoom=18`;
      const nomRes = await fetch(nomUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'OrderPulse-Storefront/1.0',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (nomRes.ok) {
        const nomJson = (await nomRes.json()) as unknown;
        const parsed = extractPincodeFromReverseGeocode(nomJson);
        if (parsed.pincode) {
          res.json({
            ok: true,
            detected: true,
            pincode: parsed.pincode,
            city: parsed.city,
            state: parsed.state,
            source: 'gps_nominatim',
          } satisfies PincodeAutoDetectResult);
          return;
        }
        if (parsed.city) {
          const cityPin = await lookupIndiaPostByCity(parsed.city);
          if (cityPin) {
            res.json({
              ok: true,
              detected: true,
              pincode: cityPin.pincode,
              city: cityPin.city || parsed.city,
              state: cityPin.state || parsed.state,
              source: 'india_post',
            } satisfies PincodeAutoDetectResult);
            return;
          }
        }
      }
    } catch {
      // Fall back cleanly below
    }

    res.json({
      ok: true,
      detected: false,
      pincode: '',
      city: '',
      state: '',
      source: 'none',
      reason: 'Could not resolve an Indian pincode from GPS coordinates.',
    } satisfies PincodeAutoDetectResult);
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

    let delhivery = pincode
      ? await checkDelhiveryPincodeServiceability(settings.delhiveryApiToken, pincode)
      : null;

    // Enrich missing city/state from India Post when Delhivery token isn't configured or city is empty
    if (pincode && delhivery && !delhivery.city) {
      const indiaPost = await lookupIndiaPostByPincode(pincode);
      if (indiaPost) {
        delhivery = {
          ...delhivery,
          city: indiaPost.city || delhivery.city,
          state: indiaPost.state || delhivery.state,
        };
      }
    }

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

    const geoConfig = store.getGeoSeoConfig();
    const bakeryGeoSchema =
      geoConfig.enabled && geoConfig.injectStorefrontGeoSchema !== false
        ? buildBakeryStorefrontSchema(geoConfig)
        : undefined;

    const festivalTheme = normalizeFestivalThemeConfig(storefrontConfig.festivalTheme);
    const liveCatalog = festivalTheme.enabled
      ? await fetchLiveStorefrontCatalogForBanner(settings.shopifyStoreDomain, products)
      : [];
    const festivalThemePayload = buildFestivalThemePayload(festivalTheme, {
      catalogProducts: liveCatalog,
      shopName: settings.shopName,
    });

    res.json({
      ok: true,
      pincode,
      delhivery,
      storefrontConfig,
      bakeryGeoSchema,
      festivalThemePayload,
      products: evaluated,
    });
  });

  // Live catalog products for Theme Studio auto-product 3D banner picker
  app.get('/api/storefront/festival-products', async (_req: Request, res: Response) => {
    await store.ensureHydrated();
    const settings = store.getSettings();
    const liveCatalog = await fetchLiveStorefrontCatalogForBanner(
      settings.shopifyStoreDomain,
      store.getProducts()
    );
    res.json({ ok: true, products: liveCatalog });
  });

  // Live Real Shopify Website Preview Proxy (renders actual merchant storefront with live festival theme preview)
  app.get('/api/storefront/preview', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const settings = store.getSettings();
    const storefrontConfig = store.getStorefrontConfig();
    const savedTheme = normalizeFestivalThemeConfig(storefrontConfig.festivalTheme);

    const storeOrigin = normalizeShopPreviewOrigin(settings.shopifyStoreDomain);
    const pagePath = sanitizePreviewPath(String(req.query.path || '/'));
    const forceRefresh = String(req.query.refresh || '') === '1';

    const modeParam = String(req.query.mode || '').toLowerCase();
    const mode: 'festive' | 'original' =
      modeParam === 'original'
        ? 'original'
        : modeParam === 'festive'
          ? 'festive'
          : savedTheme.enabled
            ? 'festive'
            : 'original';

    const festivalParam = String(req.query.festival || '').trim();
    const intensityParam = String(req.query.intensity || '').trim();
    const bannerParam = req.query.banner;
    const fxParam = req.query.fx;
    const heroParam = req.query.hero;
    const art3dParam = req.query.art3d;
    const bg3dParam = req.query.bg3d;
    const picksParam =
      typeof req.query.picks === 'string' && req.query.picks.trim()
        ? req.query.picks
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    const bannerTextParam =
      typeof req.query.bannerText === 'string' ? req.query.bannerText.trim().slice(0, 180) : undefined;

    const previewConfig = normalizeFestivalThemeConfig({
      ...savedTheme,
      enabled: mode === 'festive',
      selectedFestivalId: isValidFestivalThemeId(festivalParam)
        ? festivalParam
        : savedTheme.selectedFestivalId,
      intensity:
        intensityParam === 'subtle' || intensityParam === 'full'
          ? intensityParam
          : savedTheme.intensity,
      showAnnouncementBar:
        bannerParam === '0' ? false : bannerParam === '1' ? true : savedTheme.showAnnouncementBar,
      enableFestiveEffects:
        fxParam === '0' ? false : fxParam === '1' ? true : savedTheme.enableFestiveEffects,
      showHeroBanner:
        heroParam === '0' ? false : heroParam === '1' ? true : savedTheme.showHeroBanner,
      show3DArticles:
        art3dParam === '0' ? false : art3dParam === '1' ? true : savedTheme.show3DArticles,
      show3DBackground:
        bg3dParam === '0' ? false : bg3dParam === '1' ? true : savedTheme.show3DBackground,
      featuredProductHandles:
        picksParam !== undefined ? picksParam : savedTheme.featuredProductHandles,
      customBannerText: bannerTextParam !== undefined ? bannerTextParam : savedTheme.customBannerText,
    });

    const liveCatalog = await fetchLiveStorefrontCatalogForBanner(
      storeOrigin,
      store.getProducts()
    );
    const payload = buildFestivalThemePayload(previewConfig, {
      catalogProducts: liveCatalog,
      shopName: settings.shopName,
    });
    const targetUrl = `${storeOrigin}${pagePath}`;
    const cacheKey = targetUrl;
    const now = Date.now();
    let cached = !forceRefresh ? storefrontHtmlPreviewCache.get(cacheKey) : undefined;

    if (!cached || cached.expiresAtMs <= now) {
      try {
        const upstream = await fetch(targetUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9',
          },
          signal: AbortSignal.timeout(12_000),
        });
        if (!upstream.ok) {
          throw new Error(`Shopify storefront responded with HTTP ${upstream.status}`);
        }
        const rawHtml = await upstream.text();
        let finalOrigin = storeOrigin;
        try {
          if (upstream.url) {
            finalOrigin = new URL(upstream.url).origin;
          }
        } catch {
          // Keep normalized store origin
        }
        cached = {
          html: rawHtml,
          finalOrigin,
          expiresAtMs: now + 90_000,
        };
        storefrontHtmlPreviewCache.set(cacheKey, cached);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to load live Shopify website';
        res.status(502).setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Storefront Preview Error</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:24px;text-align:center;"><div><h2 style="margin:0 0 8px;font-size:18px;">Unable to load live store preview</h2><p style="margin:0 0 14px;font-size:13px;color:#94a3b8;">${msg.replace(/</g, '&lt;')}</p><p style="margin:0;font-size:12px;color:#64748b;">Target store: ${storeOrigin.replace(/</g, '&lt;')}</p></div></body></html>`);
        return;
      }
    }

    const rewritten = rewriteShopifyHtmlForFestivalPreview(cached.html, cached.finalOrigin, {
      mode,
      payload,
      currentPath: pagePath,
    });

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(rewritten);
  });

  // Public Storefront Bridge Script served directly to the customer's Shopify storefront
  app.get('/api/storefront/widget.js', async (req: Request, res: Response) => {
    setPublicCors(res);
    await store.ensureHydrated();
    const config = store.getStorefrontConfig();
    const origin = normalizeStorefrontOrigin(
      config.storefrontAppUrl,
      req.get('host'),
      req.headers['x-forwarded-proto'],
      req.protocol
    );
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
      autoDetectPincode:
        typeof body.autoDetectPincode === 'boolean'
          ? body.autoDetectPincode
          : cur.autoDetectPincode,
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
          ? body.storefrontAppUrl.trim()
            ? normalizeStorefrontOrigin(body.storefrontAppUrl)
            : ''
          : cur.storefrontAppUrl,
      festivalTheme:
        body.festivalTheme !== undefined
          ? normalizeFestivalThemeConfig({
              ...cur.festivalTheme,
              ...body.festivalTheme,
              updatedAt: new Date().toISOString(),
            })
          : normalizeFestivalThemeConfig(cur.festivalTheme),
    });
    await store.flushRemote();
    res.json({ ok: true, storefrontConfig: updated });
  });

  // Attempt 1-click Shopify ScriptTag installation for the Storefront widget
  app.post('/api/storefront/install-shopify', async (req: Request, res: Response) => {
    await store.ensureHydrated();
    const body = (req.body || {}) as { storefrontAppUrl?: string };
    let config = store.getStorefrontConfig();

    const submittedUrl =
      typeof body.storefrontAppUrl === 'string' ? body.storefrontAppUrl.trim() : '';
    if (submittedUrl) {
      const normalizedSubmitted = normalizeStorefrontOrigin(submittedUrl);
      if (normalizedSubmitted !== config.storefrontAppUrl) {
        config = store.updateStorefrontConfig({ storefrontAppUrl: normalizedSubmitted });
        await store.flushRemote();
      }
    }

    const origin = normalizeStorefrontOrigin(
      config.storefrontAppUrl,
      req.get('host'),
      req.headers['x-forwarded-proto'],
      req.protocol
    );

    if (!/^https:\/\//i.test(origin)) {
      res.status(400).json({
        ok: false,
        error:
          'Shopify ScriptTag requires a live HTTPS URL (http://localhost cannot be installed). Enter your live HTTPS URL (e.g. https://faridabad.broomiesbakery.in) in "Public App URL" below and click Install again.',
        storefrontConfig: config,
      });
      return;
    }

    const widgetUrl = `${origin}/api/storefront/widget.js`;
    const result = await installShopifyScriptTag(store.getSettings(), widgetUrl);
    res.status(result.ok ? 200 : 400).json({ ...result, widgetUrl, storefrontConfig: config });
  });
}
