import type { FestivalPresetId, FestivalThemeConfig } from './festivalThemes.js';

export const WINTER_CARD_SELECTOR = [
  'main#MainContent .card',
  'main#MainContent .product-card',
  'main#MainContent .product-grid-item',
  'main#MainContent .multicolumn-card',
  'main#MainContent .collection-hero',
  'main#MainContent .rich-text__blocks',
  'main#MainContent .product__info-wrapper',
  'main#MainContent .banner__box',
  '#orderpulse-festival-hero .op-fest-prod-card',
  '#orderpulse-festival-hero .op-fest-hero-shell',
].join(', ');

export function isWinterSnowPreset(presetId: FestivalPresetId): boolean {
  return presetId === 'christmas' || presetId === 'new_year';
}

export function shouldEnableWinterCardSnow(
  presetId: FestivalPresetId,
  config: Pick<FestivalThemeConfig, 'enabled' | 'show3DCardSnow'>
): boolean {
  if (!config.enabled) return false;
  if (config.show3DCardSnow === false) return false;
  return isWinterSnowPreset(presetId);
}

/**
 * Generates 3 organic, volumetric 3D sculpted snowdrift + crystal icicle SVG caps
 * with baked-in vector depth shadows (zero expensive CSS filter:drop-shadow repaints)
 * so every card looks naturally blanketed in 3D winter snow while running at 60fps on mobile.
 */
export function buildCardSnowCapSvg(variant: 0 | 1 | 2): string {
  const idSuffix = `v${variant}`;

  const shapes: Record<
    0 | 1 | 2,
    {
      shadowPath: string;
      icicles: string;
      underbodyPath: string;
      mainSnowPath: string;
      highlightPath: string;
    }
  > = {
    0: {
      shadowPath:
        'M2 23 C36 33 78 27 122 25 C166 23 206 34 252 28 C294 22 328 31 358 23 L358 17 L2 17 Z',
      icicles: `
        <path class="op-snow-icicle" d="M44 24 L49 43 C50 46 52 46 53 43 L58 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M126 22 L129 35 C130 37 131.5 37 132.5 35 L136 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M226 25 L231 46 C232 49 234 49 235 46 L240 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M312 22 L316 38 C317 40.5 318.5 40.5 319.5 38 L323 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
      `,
      underbodyPath:
        'M0 19 C14 7 42 3 78 7 C110 10 134 2 176 4 C216 6 244 13 282 7 C316 2 344 6 360 18 L360 24 C340 29 318 22 292 26 C260 31 232 32 204 26 C174 20 144 27 110 25 C78 23 50 31 24 26 C12 24 4 22 0 19 Z',
      mainSnowPath:
        'M0 16 C12 5 42 1 80 5 C112 8 138 0 178 2 C218 4 244 10 282 5 C318 0 346 4 360 15 L360 20 C342 25 320 19 294 22 C262 27 234 27 204 22 C174 17 142 23 110 21 C78 19 52 27 24 22 C12 20 4 19 0 16 Z',
      highlightPath:
        'M16 10 C42 4 68 5 96 8 M136 6 C164 2 194 4 222 8 M264 8 C294 3 324 4 344 10',
    },
    1: {
      shadowPath:
        'M2 23 C44 29 84 34 134 24 C180 16 226 32 274 29 C310 26 336 29 358 22 L358 17 L2 17 Z',
      icicles: `
        <path class="op-snow-icicle" d="M68 25 L72 41 C73 44 75 44 76 41 L80 25 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M168 22 L173 45 C174 48 176 48 177 45 L182 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M276 24 L280 40 C281 42.5 282.5 42.5 283.5 40 L287 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
      `,
      underbodyPath:
        'M0 18 C18 6 52 2 92 8 C126 13 156 3 196 5 C236 7 262 2 302 6 C330 9 348 9 360 18 L360 24 C338 28 312 24 282 28 C250 32 216 26 184 22 C154 19 124 31 86 29 C54 27 26 24 0 21 Z',
      mainSnowPath:
        'M0 15 C18 3 52 0 92 5 C126 10 156 1 196 3 C236 5 262 0 302 4 C330 7 348 7 360 15 L360 20 C338 24 312 20 282 24 C250 28 216 22 184 19 C154 16 124 27 86 25 C54 23 26 20 0 18 Z',
      highlightPath:
        'M22 9 C52 3 80 5 106 9 M154 7 C184 3 216 5 244 8 M274 6 C302 4 328 6 346 11',
    },
    2: {
      shadowPath:
        'M2 22 C38 30 76 22 118 28 C162 34 202 22 248 26 C292 30 330 28 358 22 L358 16 L2 16 Z',
      icicles: `
        <path class="op-snow-icicle" d="M34 23 L38 38 C39 41 40.5 41 41.5 38 L45 23 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M108 24 L113 45 C114 48 116 48 117 45 L122 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M204 22 L208 36 C209 38.5 210.5 38.5 211.5 36 L215 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M292 25 L297 44 C298 47 300 47 301 44 L306 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
      `,
      underbodyPath:
        'M0 18 C22 5 54 1 94 4 C132 7 156 12 198 6 C236 1 268 7 306 5 C334 3 350 9 360 18 L360 23 C338 28 310 30 278 26 C244 22 214 25 182 29 C148 33 114 23 82 25 C50 27 22 26 0 21 Z',
      mainSnowPath:
        'M0 15 C22 3 54 0 94 2 C132 5 156 9 198 4 C236 0 268 5 306 3 C334 1 350 7 360 15 L360 19 C338 24 310 26 278 22 C244 19 214 21 182 25 C148 29 114 19 82 21 C50 23 22 22 0 18 Z',
      highlightPath:
        'M18 8 C48 3 78 3 108 6 M168 8 C198 4 228 3 256 6 M288 6 C314 4 334 6 348 11',
    },
  };

  const s = shapes[variant];

  return `<svg class="op-winter-snow-svg" viewBox="0 0 360 52" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="opSnowMain_${idSuffix}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="56%" stop-color="#F3FAFF"/>
      <stop offset="86%" stop-color="#DBEFFE"/>
      <stop offset="100%" stop-color="#BFDBFE"/>
    </linearGradient>
    <linearGradient id="opSnowUnder_${idSuffix}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0F2FE"/>
      <stop offset="65%" stop-color="#93C5FD"/>
      <stop offset="100%" stop-color="#60A5FA"/>
    </linearGradient>
    <linearGradient id="opIcicleGrad_${idSuffix}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.96"/>
      <stop offset="45%" stop-color="#BAE6FD" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.62"/>
    </linearGradient>
  </defs>
  <path d="${s.shadowPath}" fill="rgba(12, 42, 74, 0.2)"/>
  ${s.icicles}
  <path d="${s.underbodyPath}" fill="url(#opSnowUnder_${idSuffix})"/>
  <path d="${s.mainSnowPath}" fill="url(#opSnowMain_${idSuffix})"/>
  <path d="${s.highlightPath}" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.95"/>
</svg>`;
}

/**
 * Generates silky-smooth, zero-lag CSS for 3D sculpted snow buildup on every storefront card:
 * - Zero box-shadow pulse, zero glare sweep, zero dust puff, zero drop-shadow filter chains
 * - Pure GPU-composited hover lift on pointer devices only (zero mobile scroll/touch jank)
 */
export function buildWinterCardSnowCss(
  presetId: FestivalPresetId,
  config: FestivalThemeConfig
): string {
  if (!shouldEnableWinterCardSnow(presetId, config)) return '';

  return `
/* OrderPulse 3D Winter Card Snow Accumulation (Silky-Smooth 60fps Mobile & Desktop) */
main#MainContent .grid,
main#MainContent .product-grid,
main#MainContent .collection-list,
main#MainContent .multicolumn-list,
#orderpulse-festival-hero .op-fest-products-grid {
  row-gap: 28px !important;
  padding-top: 14px !important;
}

main#MainContent .card,
main#MainContent .card-wrapper .card,
main#MainContent .product-card,
main#MainContent .product-grid-item,
main#MainContent .multicolumn-card,
main#MainContent .collection-hero,
main#MainContent .rich-text__blocks,
main#MainContent .product__info-wrapper,
main#MainContent .banner__box,
#orderpulse-festival-hero .op-fest-prod-card {
  position: relative !important;
  overflow: visible !important;
  opacity: 1 !important;
  border-top: 2px solid rgba(255, 255, 255, 0.96) !important;
  border-color: rgba(186, 230, 253, 0.78) !important;
  box-shadow:
    0 12px 26px -10px rgba(4, 18, 32, 0.36),
    0 0 0 1px rgba(224, 242, 254, 0.65) !important;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
}

/* Never let Shopify Dawn .scroll-trigger.animate--slide-in / .animate--fade-in freeze product details at opacity: 0.01 */
main#MainContent .product__info-wrapper,
main#MainContent .product__info-wrapper.scroll-trigger,
main#MainContent .product__info-wrapper.animate--slide-in,
main#MainContent .scroll-trigger.animate--slide-in,
main#MainContent .scroll-trigger.animate--fade-in {
  opacity: 1 !important;
  transform: none !important;
}

/* Keep product media corners crisp inside overflow:visible snow-capped cards */
main#MainContent .card .card__inner,
main#MainContent .card .card__media,
main#MainContent .card-wrapper .card .card__inner,
main#MainContent .card-wrapper .card .card__media,
#orderpulse-festival-hero .op-fest-prod-img-wrap {
  overflow: hidden !important;
  border-top-left-radius: 14px !important;
  border-top-right-radius: 14px !important;
}

#orderpulse-festival-hero .op-fest-hero-shell {
  position: relative !important;
  overflow: visible !important;
  margin-top: 14px !important;
  box-shadow:
    0 20px 42px rgba(2, 12, 24, 0.38),
    0 0 0 1.5px rgba(224, 242, 254, 0.42) !important;
}

/* Buttery-smooth GPU-only card lift on desktop pointer devices; zero sticky hover jitter on mobile */
@media (hover: hover) and (pointer: fine) {
  main#MainContent .card:hover,
  main#MainContent .card-wrapper:hover .card,
  main#MainContent .product-card:hover,
  main#MainContent .product-grid-item:hover,
  main#MainContent .multicolumn-card:hover,
  #orderpulse-festival-hero .op-fest-prod-card:hover {
    transform: translate3d(0, -4px, 0) !important;
  }
}

/* 3D Sculpted Snow Pillow & Crystal Icicles resting on top of every card */
.op-winter-snow-cap {
  position: absolute !important;
  top: -13px !important;
  left: -4px !important;
  right: -4px !important;
  height: 36px !important;
  pointer-events: none !important;
  z-index: 12 !important;
  contain: layout style !important;
}

#orderpulse-festival-hero .op-fest-hero-shell > .op-winter-snow-cap {
  top: -15px !important;
  left: -5px !important;
  right: -5px !important;
  height: 44px !important;
}

#orderpulse-festival-hero .op-fest-prod-card > .op-winter-snow-cap {
  top: -11px !important;
  left: -3px !important;
  right: -3px !important;
  height: 30px !important;
}

.op-winter-snow-cap .op-winter-snow-svg {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  overflow: visible !important;
}

/* Soft snow-rim highlight along header bottom edge in winter */
body .header-wrapper,
body header.header {
  box-shadow:
    0 6px 20px rgba(4, 18, 28, 0.36),
    inset 0 -2px 6px rgba(224, 242, 254, 0.22) !important;
}

@media (max-width: 768px) {
  .op-winter-snow-cap {
    top: -10px !important;
    height: 28px !important;
  }
  #orderpulse-festival-hero .op-fest-hero-shell > .op-winter-snow-cap {
    top: -12px !important;
    height: 34px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  main#MainContent .card,
  #orderpulse-festival-hero .op-fest-prod-card {
    transition: none !important;
  }
}
`.trim();
}

/**
 * Generates pure ES5-compatible browser runtime code that attaches sculpted 3D snow caps
 * onto every storefront card with zero MutationObserver feedback loops and zero extra hover bloat.
 */
export function buildWinterCardSnowRuntimeJs(): string {
  const capVariants = [
    buildCardSnowCapSvg(0),
    buildCardSnowCapSvg(1),
    buildCardSnowCapSvg(2),
  ];

  return `
  var OP_SNOW_CAP_SVGS = ${JSON.stringify(capVariants)};
  var OP_SNOW_CARD_SELECTOR = ${JSON.stringify(WINTER_CARD_SELECTOR)};
  var opSnowObserver = null;
  var opSnowTimer = null;
  var opSnowActive = false;
  var opSnowMutating = false;

  function isOrderPulseSnowOwnNode(node) {
    if (!node || node.nodeType !== 1) return false;
    var id = node.id || '';
    if (id.indexOf('orderpulse-festival-') === 0 || id === 'op-pdp-delivery-note' || id === 'orderpulse-pincode-bar') {
      return true;
    }
    var cls = typeof node.className === 'string' ? node.className : '';
    if (
      cls.indexOf('op-winter-snow-cap') >= 0 ||
      cls.indexOf('op-santa-') >= 0 ||
      cls.indexOf('op-checkout-pincode-box') >= 0
    ) {
      return true;
    }
    return false;
  }

  function removeWinterCardSnow() {
    opSnowActive = false;
    if (opSnowTimer) {
      clearTimeout(opSnowTimer);
      opSnowTimer = null;
    }
    if (opSnowObserver) {
      try { opSnowObserver.disconnect(); } catch (e) {}
      opSnowObserver = null;
    }
    opSnowMutating = true;
    try {
      var nodes = document.querySelectorAll('.op-winter-snow-cap, .op-winter-ice-sheen, .op-winter-snow-dust');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] && nodes[i].parentNode) {
          nodes[i].parentNode.removeChild(nodes[i]);
        }
      }
      var capped = document.querySelectorAll('[data-op-snow-capped="1"]');
      for (var j = 0; j < capped.length; j++) {
        try { capped[j].removeAttribute('data-op-snow-capped'); } catch (e) {}
      }
    } finally {
      opSnowMutating = false;
    }
  }

  function hasDirectSnowCap(card) {
    if (!card || !card.children) return false;
    for (var c = 0; c < card.children.length; c++) {
      var child = card.children[c];
      if (child && child.classList && child.classList.contains('op-winter-snow-cap')) {
        return true;
      }
    }
    return false;
  }

  function decorateSnowCardsNow() {
    if (!opSnowActive || !document.body || opSnowMutating) return;
    var candidates;
    try {
      candidates = document.querySelectorAll(OP_SNOW_CARD_SELECTOR);
    } catch (e) {
      return;
    }
    opSnowMutating = true;
    try {
      var idx = 0;
      for (var i = 0; i < candidates.length; i++) {
        var card = candidates[i];
        if (!card || card.nodeType !== 1) continue;
        if (card.getAttribute('data-op-snow-capped') === '1' && hasDirectSnowCap(card)) {
          idx++;
          continue;
        }
        var isHeroProd = card.classList && card.classList.contains('op-fest-prod-card');
        if (!isHeroProd && card.parentElement && card.parentElement.closest) {
          var ancestor = card.parentElement.closest(OP_SNOW_CARD_SELECTOR);
          if (ancestor && (!ancestor.classList || !ancestor.classList.contains('op-fest-hero-shell'))) {
            continue;
          }
        }
        var variant = idx % OP_SNOW_CAP_SVGS.length;
        idx++;
        card.setAttribute('data-op-snow-capped', '1');

        if (!hasDirectSnowCap(card)) {
          var cap = document.createElement('div');
          cap.className = 'op-winter-snow-cap';
          cap.setAttribute('data-snow-variant', String(variant));
          cap.setAttribute('aria-hidden', 'true');
          cap.innerHTML = OP_SNOW_CAP_SVGS[variant];
          card.insertBefore(cap, card.firstChild);
        }
      }
    } finally {
      opSnowMutating = false;
    }
  }

  function mountWinterCardSnow(ft) {
    var shouldEnable = Boolean(
      ft &&
      ft.enabled &&
      ft.show3DCardSnow !== false &&
      (ft.presetId === 'christmas' || ft.presetId === 'new_year')
    );
    if (!shouldEnable) {
      removeWinterCardSnow();
      return;
    }
    opSnowActive = true;
    decorateSnowCardsNow();
    if (!opSnowObserver && typeof MutationObserver !== 'undefined' && document.body) {
      var observeRoot = document.querySelector('main#MainContent, main') || document.body;
      opSnowObserver = new MutationObserver(function (mutations) {
        if (!opSnowActive || opSnowMutating) return;
        var hasExternalAddition = false;
        for (var m = 0; m < mutations.length; m++) {
          var added = mutations[m].addedNodes;
          if (!added || !added.length) continue;
          for (var n = 0; n < added.length; n++) {
            var nd = added[n];
            if (nd && nd.nodeType === 1 && !isOrderPulseSnowOwnNode(nd)) {
              hasExternalAddition = true;
              break;
            }
          }
          if (hasExternalAddition) break;
        }
        if (!hasExternalAddition) return;
        if (opSnowTimer) clearTimeout(opSnowTimer);
        opSnowTimer = setTimeout(decorateSnowCardsNow, 350);
      });
      opSnowObserver.observe(observeRoot, { childList: true, subtree: true });
    }
  }
`;
}
