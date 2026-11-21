import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FESTIVAL_THEME_CONFIG,
  FESTIVAL_THEME_PRESETS,
  buildFestivalPreviewUrl,
  buildFestivalStorefrontCss,
  buildFestivalThemePayload,
  detectActiveFestivalForDate,
  normalizeFestivalThemeConfig,
  normalizeShopPreviewOrigin,
  resolveEffectiveFestivalPreset,
  rewriteShopifyHtmlForFestivalPreview,
  sanitizePreviewPath,
} from './festivalThemes';
import {
  type FestivalFeaturedProduct,
  selectBestFestivalProducts,
} from './festivalShowcase';

test('detectActiveFestivalForDate resolves exact Indian & global festival windows in IST', () => {
  assert.equal(detectActiveFestivalForDate('2026-11-08T10:00:00+05:30'), 'diwali');
  assert.equal(detectActiveFestivalForDate('2026-03-08T10:00:00+05:30'), 'holi');
  assert.equal(detectActiveFestivalForDate('2026-12-20T10:00:00+05:30'), 'christmas');
  assert.equal(detectActiveFestivalForDate('2026-12-30T10:00:00+05:30'), 'new_year');
  assert.equal(detectActiveFestivalForDate('2027-01-02T10:00:00+05:30'), 'new_year');
  assert.equal(detectActiveFestivalForDate('2026-02-14T10:00:00+05:30'), 'valentine');
  assert.equal(detectActiveFestivalForDate('2026-08-22T10:00:00+05:30'), 'raksha_bandhan');
  assert.equal(detectActiveFestivalForDate('2026-08-15T10:00:00+05:30'), 'independence_day');
  // Mid-November right after Diwali should auto-select upcoming Christmas
  assert.equal(detectActiveFestivalForDate('2026-11-20T10:00:00+05:30'), 'christmas');
});

test('buildFestivalStorefrontCss returns empty string when OFF (100% original theme restore)', () => {
  const offCss = buildFestivalStorefrontCss({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: false,
    selectedFestivalId: 'diwali',
  });
  assert.equal(offCss, '');
});

test('buildFestivalStorefrontCss emits scoped festival palette CSS when ON and honors intensity & fx flags', () => {
  const fullDiwali = buildFestivalStorefrontCss({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'diwali',
    intensity: 'full',
    enableFestiveEffects: true,
  });
  assert.ok(fullDiwali.includes('#9A1B2F'));
  assert.ok(fullDiwali.includes('#FFF8EC'));
  assert.ok(fullDiwali.includes('main#MainContent'));
  assert.ok(fullDiwali.includes('#orderpulse-festival-fx'));

  const subtleHoli = buildFestivalStorefrontCss({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'holi',
    intensity: 'subtle',
    enableFestiveEffects: false,
  });
  assert.ok(subtleHoli.includes('#C2185B'));
  assert.ok(!subtleHoli.includes('main#MainContent'));
  assert.ok(!subtleHoli.includes('#orderpulse-festival-fx'));
});

test('resolveEffectiveFestivalPreset handles auto-detect, explicit selection, and custom banner text', () => {
  const autoRes = resolveEffectiveFestivalPreset(
    {
      ...DEFAULT_FESTIVAL_THEME_CONFIG,
      enabled: true,
      selectedFestivalId: 'auto',
      customBannerText: '',
    },
    '2026-11-08T10:00:00+05:30'
  );
  assert.equal(autoRes.isAutoDetected, true);
  assert.equal(autoRes.preset.id, 'diwali');
  assert.ok(autoRes.effectiveBannerText.toLowerCase().includes('diwali'));

  const customRes = resolveEffectiveFestivalPreset({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'eid',
    customBannerText: 'Flat 20% Off Eid Hampers Today!',
  });
  assert.equal(customRes.isAutoDetected, false);
  assert.equal(customRes.preset.id, 'eid');
  assert.equal(customRes.effectiveBannerText, 'Flat 20% Off Eid Hampers Today!');
});

test('normalizeFestivalThemeConfig safely sanitizes invalid inputs and exposes 11 presets', () => {
  assert.equal(FESTIVAL_THEME_PRESETS.length, 11);
  const cleaned = normalizeFestivalThemeConfig({
    enabled: true,
    selectedFestivalId: 'invalid_fest' as unknown as 'auto',
    intensity: 'weird' as unknown as 'full',
    customBannerText: '  Festive Sale!  ',
  });
  assert.equal(cleaned.enabled, true);
  assert.equal(cleaned.selectedFestivalId, 'auto');
  assert.equal(cleaned.intensity, 'full');
  assert.equal(cleaned.customBannerText, 'Festive Sale!');
});

test('live storefront preview URL normalization, path safety, and real HTML rewriting work cleanly', () => {
  assert.equal(
    normalizeShopPreviewOrigin('https://https://broomiesbakery.myshopify.com/'),
    'https://broomiesbakery.myshopify.com'
  );
  assert.equal(
    normalizeShopPreviewOrigin('broomiesbakery.in/collections/all'),
    'https://broomiesbakery.in'
  );
  assert.equal(sanitizePreviewPath('/collections/all'), '/collections/all');
  assert.equal(sanitizePreviewPath('//evil.com/x'), '/');
  assert.equal(sanitizePreviewPath('https://evil.com/x'), '/');

  const url = buildFestivalPreviewUrl(
    'https://faridabad.broomiesbakery.in/',
    { ...DEFAULT_FESTIVAL_THEME_CONFIG, selectedFestivalId: 'diwali', intensity: 'full' },
    'festive',
    '/collections/all'
  );
  assert.ok(url.startsWith('https://faridabad.broomiesbakery.in/api/storefront/preview?'));
  assert.ok(url.includes('mode=festive'));
  assert.ok(url.includes('festival=diwali'));
  assert.ok(url.includes('path=%2Fcollections%2Fall'));

  const payload = buildFestivalThemePayload({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'diwali',
  });
  const sampleHtml =
    '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="frame-ancestors \'none\'" /><title>Broomies Bakery</title><script>function asyncLoad(){var urls=["https:\\/\\/broo.up.railway.app\\/api\\/storefront\\/widget.js?shop=test.myshopify.com"];}</script></head><body><header class="header-wrapper">Broomies</header></body></html>';

  const festiveHtml = rewriteShopifyHtmlForFestivalPreview(sampleHtml, 'https://broomiesbakery.in', {
    mode: 'festive',
    payload,
  });
  assert.ok(festiveHtml.includes('<base href="https://broomiesbakery.in/" />'));
  assert.ok(!festiveHtml.includes('Content-Security-Policy'));
  assert.ok(!festiveHtml.includes('widget.js'));
  assert.ok(festiveHtml.includes('id="orderpulse-festival-theme-css"'));
  assert.ok(festiveHtml.includes('#9A1B2F'));
  assert.ok(festiveHtml.includes('ORDERPULSE_FESTIVAL_PREVIEW_UPDATE'));

  const originalHtml = rewriteShopifyHtmlForFestivalPreview(sampleHtml, 'https://broomiesbakery.in', {
    mode: 'original',
    payload,
  });
  assert.ok(originalHtml.includes('<base href="https://broomiesbakery.in/" />'));
  assert.ok(!originalHtml.includes('<style id="orderpulse-festival-theme-css">'));
});

test('selectBestFestivalProducts auto-picks festival-matched real products and honors manual pins', () => {
  const catalog: FestivalFeaturedProduct[] = [
    {
      id: '1',
      title: 'Plain Whole Wheat Toast',
      handle: 'plain-toast',
      price: '120',
      currency: 'INR',
      imageUrl: 'https://cdn.shopify.com/s/files/1/toast.jpg',
    },
    {
      id: '2',
      title: 'Christmas Rich Plum Cake & Brownie Gift Hamper',
      handle: 'christmas-plum-cake-hamper',
      price: '1450',
      currency: 'INR',
      imageUrl: 'https://cdn.shopify.com/s/files/1/plum-hamper.jpg',
    },
    {
      id: '3',
      title: 'Square Jute Basket Festive Gift Hamper',
      handle: 'square-jute-basket-hamper',
      price: '2000',
      currency: 'INR',
      imageUrl: 'https://cdn.shopify.com/s/files/1/jute-hamper.jpg',
    },
    {
      id: '4',
      title: 'Assorted Chocolate Cookie Tin',
      handle: 'chocolate-cookie-tin',
      price: '850',
      currency: 'INR',
      imageUrl: 'https://cdn.shopify.com/s/files/1/cookie-tin.jpg',
    },
    {
      id: '5',
      title: 'Broken Image Item',
      handle: 'broken-item',
      price: '500',
      currency: 'INR',
      imageUrl: '',
    },
  ];

  const christmasPicks = selectBestFestivalProducts(catalog, 'christmas', [], 3);
  assert.equal(christmasPicks.length, 3);
  assert.equal(christmasPicks[0].handle, 'christmas-plum-cake-hamper');
  assert.ok(christmasPicks.every((p) => Boolean(p.imageUrl)));

  const pinned = selectBestFestivalProducts(catalog, 'christmas', ['plain-toast'], 3);
  assert.equal(pinned[0].handle, 'plain-toast');
  assert.equal(pinned.length, 3);
});

test('buildFestivalThemePayload renders 3D Christmas/Diwali articles, auto-product hero banner, and clears cleanly when OFF', () => {
  const sampleProducts: FestivalFeaturedProduct[] = [
    {
      id: '10',
      title: 'White Jute Pink Rose Hamper',
      handle: 'white-jute-pink-rose-hamper',
      price: '1400',
      currency: 'INR',
      imageUrl: 'https://cdn.shopify.com/s/files/1/rose-hamper.jpg',
    },
    {
      id: '11',
      title: 'Square Jute Basket Hamper',
      handle: 'square-jute-basket-hamper',
      price: '2000',
      currency: 'INR',
      imageUrl: 'https://cdn.shopify.com/s/files/1/square-hamper.jpg',
    },
  ];

  const xmasPayload = buildFestivalThemePayload(
    {
      ...DEFAULT_FESTIVAL_THEME_CONFIG,
      enabled: true,
      selectedFestivalId: 'christmas',
      showHeroBanner: true,
      show3DArticles: true,
      enableFestiveEffects: true,
    },
    { catalogProducts: sampleProducts, shopName: 'Broomies Bakery' }
  );

  assert.equal(xmasPayload.featuredProducts.length, 2);
  assert.ok(xmasPayload.heroBannerHtml.includes('opXmasPine1'));
  assert.ok(xmasPayload.heroBannerHtml.includes('/products/white-jute-pink-rose-hamper'));
  assert.ok(xmasPayload.heroBannerHtml.includes('https://cdn.shopify.com/s/files/1/rose-hamper.jpg'));
  assert.ok(xmasPayload.garlandHtml.includes('op-garland-bulb'));
  assert.ok(xmasPayload.particlesHtml.includes('op-fest-snow'));
  assert.ok(xmasPayload.background3DHtml.includes('op-bg3d-stage'));
  assert.ok(xmasPayload.background3DHtml.includes('data-festival-bg="christmas"'));
  assert.ok(xmasPayload.background3DHtml.includes('data-dark-canvas="1"'));
  assert.ok(xmasPayload.background3DHtml.includes('op-xmas-forest'));
  assert.ok(xmasPayload.background3DHtml.includes('op-xmas-corner-left'));
  assert.ok(xmasPayload.background3DHtml.includes('op-xmas-sleigh'));
  assert.ok(xmasPayload.css.includes('#orderpulse-festival-hero'));
  assert.ok(xmasPayload.css.includes('#orderpulse-festival-bg-3d'));
  assert.ok(xmasPayload.css.includes('opXmasSleighGlide'));

  const diwaliPayload = buildFestivalThemePayload(
    {
      ...DEFAULT_FESTIVAL_THEME_CONFIG,
      enabled: true,
      selectedFestivalId: 'diwali',
      showHeroBanner: true,
      show3DArticles: true,
      show3DBackground: true,
    },
    { catalogProducts: sampleProducts }
  );
  assert.ok(diwaliPayload.heroBannerHtml.includes('op-3d-flame'));
  assert.ok(diwaliPayload.heroBannerHtml.includes('opDiyaBowl'));
  assert.ok(diwaliPayload.background3DHtml.includes('data-festival-bg="diwali"'));
  assert.ok(diwaliPayload.background3DHtml.includes('op-xmas-corner-left'));

  const offPayload = buildFestivalThemePayload(
    {
      ...DEFAULT_FESTIVAL_THEME_CONFIG,
      enabled: false,
      selectedFestivalId: 'christmas',
    },
    { catalogProducts: sampleProducts }
  );
  assert.equal(offPayload.css, '');
  assert.equal(offPayload.background3DHtml, '');
  assert.equal(offPayload.heroBannerHtml, '');
  assert.equal(offPayload.garlandHtml, '');
  assert.equal(offPayload.particlesHtml, '');
});

test('Christmas & New Year themes keep crisp 3D card snow caps with ultra-smooth 60fps CSS and no heavy janky card animations', () => {
  const xmasSnow = buildFestivalThemePayload({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'christmas',
    show3DCardSnow: true,
    enableFestiveEffects: true,
  });

  assert.equal(xmasSnow.show3DCardSnow, true);
  assert.ok(xmasSnow.css.includes('.op-winter-snow-cap'));
  assert.ok(xmasSnow.css.includes('height: 100lvh;'));
  assert.ok(xmasSnow.css.includes('(hover: hover) and (pointer: fine)'));

  // Heavy / ugly janky animations and mobile GPU-killing filters must be absent
  assert.equal(xmasSnow.css.includes('backdrop-filter: blur'), false);
  assert.equal(xmasSnow.css.includes('opCardFrostPulse'), false);
  assert.equal(xmasSnow.css.includes('opCardIceSheenSweep'), false);
  assert.equal(xmasSnow.css.includes('opSnowDustPuff'), false);
  assert.equal(xmasSnow.css.includes('opIcicleShimmer'), false);
  assert.equal(xmasSnow.css.includes('op-winter-ice-sheen'), false);
  assert.equal(xmasSnow.css.includes('op-winter-snow-dust'), false);

  // Smooth GPU-composited snowfall capped for mobile
  assert.ok(xmasSnow.particlesHtml.includes('op-snow-layer-near'));
  assert.ok(xmasSnow.particlesHtml.includes('op-snow-layer-mid'));
  assert.ok(xmasSnow.particlesHtml.includes('op-fest-snow-orb'));
  assert.ok(xmasSnow.particlesHtml.includes('op-snow-desktop-only'));

  const snowDisabled = buildFestivalThemePayload({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'christmas',
    show3DCardSnow: false,
  });
  assert.equal(snowDisabled.show3DCardSnow, false);
  assert.equal(snowDisabled.css.includes('.op-winter-snow-cap'), false);

  const previewHtml = rewriteShopifyHtmlForFestivalPreview(
    '<!doctype html><html><head></head><body><main id="MainContent"><div class="card">Cake</div></main></body></html>',
    'https://broomiesbakery.in',
    { mode: 'festive', payload: xmasSnow }
  );
  assert.ok(previewHtml.includes('mountWinterCardSnow'));
  assert.ok(previewHtml.includes('op-winter-snow-cap'));
  assert.ok(previewHtml.includes('data-op-sig'));
});

test('Festival CSS guarantees crisp readable text inside mobile sidebar drawer, dropdowns, search modal, and cart drawer', () => {
  const xmas = buildFestivalThemePayload({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'christmas',
    intensity: 'full',
  });

  // Sidebar menu drawer inside .header-wrapper must override headerText with crisp dark ink on opaque surface
  assert.ok(xmas.css.includes('body .header-wrapper #menu-drawer'));
  assert.ok(xmas.css.includes('body .header-wrapper #menu-drawer .menu-drawer__menu-item'));
  assert.ok(xmas.css.includes('body .header-wrapper .header__submenu a'));
  assert.ok(xmas.css.includes('body .header-wrapper .search-modal input'));
  assert.ok(xmas.css.includes('body cart-drawer .drawer__inner'));
  assert.ok(xmas.css.includes('body .mobile-facets__inner'));
  // Santa roamer hides cleanly whenever the mobile menu drawer or cart drawer is open
  assert.ok(xmas.css.includes('body:has(#Details-menu-drawer-container[open]) #orderpulse-festival-roamer'));
});




