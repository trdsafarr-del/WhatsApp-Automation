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
 * Generates 3 organic, volumetric 3D sculpted snowdrift + hanging crystal icicle SVG caps
 * so adjacent storefront cards each look naturally snow-blanketed rather than identical clones.
 */
export function buildCardSnowCapSvg(variant: 0 | 1 | 2): string {
  const idSuffix = `v${variant}`;

  // 3 distinct puffy snow-mound silhouettes + organic hanging icicles + sunlit specular ridges
  const shapes: Record<
    0 | 1 | 2,
    {
      shadowPath: string;
      icicles: string;
      underbodyPath: string;
      mainSnowPath: string;
      highlightPath: string;
      sparkles: Array<[number, number, string]>;
    }
  > = {
    0: {
      shadowPath:
        'M2 22 C36 33 78 27 122 25 C166 23 206 34 252 28 C294 22 328 31 358 23 L358 17 L2 17 Z',
      icicles: `
        <path class="op-snow-icicle" d="M44 24 L49 44 C50 47 52 47 53 44 L58 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle op-snow-icicle-b" d="M126 22 L129 36 C130 38 131.5 38 132.5 36 L136 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M226 25 L231 47 C232 50 234 50 235 47 L240 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle op-snow-icicle-b" d="M312 22 L316 39 C317 41.5 318.5 41.5 319.5 39 L323 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
      `,
      underbodyPath:
        'M0 19 C14 7 42 3 78 7 C110 10 134 2 176 4 C216 6 244 13 282 7 C316 2 344 6 360 18 L360 24 C340 29 318 22 292 26 C260 31 232 32 204 26 C174 20 144 27 110 25 C78 23 50 31 24 26 C12 24 4 22 0 19 Z',
      mainSnowPath:
        'M0 16 C12 5 42 1 80 5 C112 8 138 0 178 2 C218 4 244 10 282 5 C318 0 346 4 360 15 L360 20 C342 25 320 19 294 22 C262 27 234 27 204 22 C174 17 142 23 110 21 C78 19 52 27 24 22 C12 20 4 19 0 16 Z',
      highlightPath:
        'M16 10 C42 4 68 5 96 8 M136 6 C164 2 194 4 222 8 M264 8 C294 3 324 4 344 10',
      sparkles: [
        [68, 12, '0s'],
        [182, 9, '1.1s'],
        [298, 11, '2.2s'],
      ],
    },
    1: {
      shadowPath:
        'M2 23 C44 29 84 34 134 24 C180 16 226 32 274 29 C310 26 336 29 358 22 L358 17 L2 17 Z',
      icicles: `
        <path class="op-snow-icicle op-snow-icicle-b" d="M68 25 L72 42 C73 45 75 45 76 42 L80 25 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M168 22 L173 46 C174 49 176 49 177 46 L182 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle op-snow-icicle-b" d="M276 24 L280 41 C281 43.5 282.5 43.5 283.5 41 L287 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
      `,
      underbodyPath:
        'M0 18 C18 6 52 2 92 8 C126 13 156 3 196 5 C236 7 262 2 302 6 C330 9 348 9 360 18 L360 24 C338 28 312 24 282 28 C250 32 216 26 184 22 C154 19 124 31 86 29 C54 27 26 24 0 21 Z',
      mainSnowPath:
        'M0 15 C18 3 52 0 92 5 C126 10 156 1 196 3 C236 5 262 0 302 4 C330 7 348 7 360 15 L360 20 C338 24 312 20 282 24 C250 28 216 22 184 19 C154 16 124 27 86 25 C54 23 26 20 0 18 Z',
      highlightPath:
        'M22 9 C52 3 80 5 106 9 M154 7 C184 3 216 5 244 8 M274 6 C302 4 328 6 346 11',
      sparkles: [
        [94, 13, '0.5s'],
        [214, 10, '1.6s'],
        [318, 12, '2.5s'],
      ],
    },
    2: {
      shadowPath:
        'M2 22 C38 30 76 22 118 28 C162 34 202 22 248 26 C292 30 330 28 358 22 L358 16 L2 16 Z',
      icicles: `
        <path class="op-snow-icicle" d="M34 23 L38 39 C39 42 40.5 42 41.5 39 L45 23 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle op-snow-icicle-b" d="M108 24 L113 46 C114 49 116 49 117 46 L122 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle" d="M204 22 L208 37 C209 39.5 210.5 39.5 211.5 37 L215 22 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
        <path class="op-snow-icicle op-snow-icicle-b" d="M292 25 L297 45 C298 48 300 48 301 45 L306 24 Z" fill="url(#opIcicleGrad_${idSuffix})"/>
      `,
      underbodyPath:
        'M0 18 C22 5 54 1 94 4 C132 7 156 12 198 6 C236 1 268 7 306 5 C334 3 350 9 360 18 L360 23 C338 28 310 30 278 26 C244 22 214 25 182 29 C148 33 114 23 82 25 C50 27 22 26 0 21 Z',
      mainSnowPath:
        'M0 15 C22 3 54 0 94 2 C132 5 156 9 198 4 C236 0 268 5 306 3 C334 1 350 7 360 15 L360 19 C338 24 310 26 278 22 C244 19 214 21 182 25 C148 29 114 19 82 21 C50 23 22 22 0 18 Z',
      highlightPath:
        'M18 8 C48 3 78 3 108 6 M168 8 C198 4 228 3 256 6 M288 6 C314 4 334 6 348 11',
      sparkles: [
        [52, 11, '0.8s'],
        [156, 13, '1.9s'],
        [266, 9, '0.2s'],
      ],
    },
  };

  const s = shapes[variant];
  const sparklesSvg = s.sparkles
    .map(
      ([cx, cy, delay]) =>
        `<g class="op-snow-sparkle" style="transform-origin:${cx}px ${cy}px;animation-delay:${delay};">` +
        `<path d="M${cx} ${cy - 4.5} L${cx + 1.1} ${cy - 1.1} L${cx + 4.5} ${cy} L${cx + 1.1} ${cy + 1.1} L${cx} ${cy + 4.5} L${cx - 1.1} ${cy + 1.1} L${cx - 4.5} ${cy} L${cx - 1.1} ${cy - 1.1} Z" fill="#FFFFFF"/>` +
        `</g>`
    )
    .join('');

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
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.58"/>
    </linearGradient>
  </defs>
  <path d="${s.shadowPath}" fill="rgba(12, 42, 74, 0.22)"/>
  ${s.icicles}
  <path d="${s.underbodyPath}" fill="url(#opSnowUnder_${idSuffix})"/>
  <path d="${s.mainSnowPath}" fill="url(#opSnowMain_${idSuffix})"/>
  <path d="${s.highlightPath}" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.95"/>
  ${sparklesSvg}
</svg>`;
}

/**
 * Generates CSS for realistic 3D sculpted snow buildup on every storefront card,
 * translucent hanging icicles, icy specular hover sweep, and smooth winter micro-animations.
 */
export function buildWinterCardSnowCss(
  presetId: FestivalPresetId,
  config: FestivalThemeConfig
): string {
  if (!shouldEnableWinterCardSnow(presetId, config)) return '';

  return `
/* OrderPulse 3D Winter Card Snow Accumulation, Crystal Icicles & Frosted Animations */
@keyframes opSnowCapSettle {
  0% { opacity: 0; transform: translate3d(0, -10px, 0) scaleY(0.86); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scaleY(1); }
}
@keyframes opIcicleShimmer {
  0%, 100% { opacity: 0.84; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.22); }
}
@keyframes opSnowSparkleTwinkle {
  0%, 100% { opacity: 0.25; transform: scale(0.65) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.22) rotate(35deg); }
}
@keyframes opCardIceSheenSweep {
  0% { transform: translate3d(-145%, 0, 0) skewX(-22deg); opacity: 0; }
  18% { opacity: 0.55; }
  55% { opacity: 0.35; }
  100% { transform: translate3d(245%, 0, 0) skewX(-22deg); opacity: 0; }
}
@keyframes opCardFrostPulse {
  0%, 100% {
    box-shadow:
      0 18px 36px -10px rgba(4, 18, 32, 0.44),
      0 0 0 1px rgba(224, 242, 254, 0.72),
      inset 0 2px 0 rgba(255, 255, 255, 0.94),
      inset 0 -3px 10px rgba(147, 197, 253, 0.22);
  }
  50% {
    box-shadow:
      0 20px 40px -10px rgba(4, 18, 32, 0.5),
      0 0 18px rgba(186, 230, 253, 0.36),
      inset 0 2px 0 rgba(255, 255, 255, 0.98),
      inset 0 -3px 12px rgba(125, 211, 252, 0.3);
  }
}
@keyframes opSnowDustPuff {
  0% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.7); }
  25% { opacity: 0.95; }
  100% { opacity: 0; transform: translate3d(var(--op-dx, 14px), -22px, 0) scale(1.25); }
}

/* Give storefront grids breathing room above cards so 3D sculpted snow mounds never clip */
main#MainContent .grid,
main#MainContent .product-grid,
main#MainContent .collection-list,
main#MainContent .multicolumn-list,
#orderpulse-festival-hero .op-fest-products-grid {
  row-gap: 28px !important;
  padding-top: 14px !important;
}

/* Allow 3D sculpted snowdrift pillows to sit cleanly above card top edges while preserving crisp rounded photo corners */
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
  border-top: 2px solid rgba(255, 255, 255, 0.96) !important;
  border-color: rgba(186, 230, 253, 0.78) !important;
  animation: opCardFrostPulse 6.5s ease-in-out infinite;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease !important;
  will-change: transform;
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
    0 26px 56px rgba(2, 12, 24, 0.45),
    0 0 0 1.5px rgba(224, 242, 254, 0.42),
    inset 0 2px 0 rgba(255, 255, 255, 0.5) !important;
}

main#MainContent .card:hover,
main#MainContent .card-wrapper:hover .card,
main#MainContent .product-card:hover,
main#MainContent .product-grid-item:hover,
main#MainContent .multicolumn-card:hover,
#orderpulse-festival-hero .op-fest-prod-card:hover {
  transform: translateY(-7px) perspective(900px) rotateX(2.2deg) scale(1.015) !important;
  box-shadow:
    0 28px 50px -12px rgba(4, 18, 32, 0.55),
    0 0 24px rgba(186, 230, 253, 0.52),
    inset 0 2px 0 rgba(255, 255, 255, 1) !important;
}

/* 3D Sculpted Snow Pillow & Translucent Crystal Icicles resting on top of every card */
.op-winter-snow-cap {
  position: absolute !important;
  top: -13px !important;
  left: -4px !important;
  right: -4px !important;
  height: 36px !important;
  pointer-events: none !important;
  z-index: 12 !important;
  filter: drop-shadow(0 5px 7px rgba(12, 38, 68, 0.28)) drop-shadow(0 -1px 3px rgba(255, 255, 255, 0.72));
  animation: opSnowCapSettle 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
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

.op-winter-snow-cap .op-snow-icicle {
  animation: opIcicleShimmer 3.2s ease-in-out infinite;
}
.op-winter-snow-cap .op-snow-icicle-b {
  animation-delay: 1.4s;
}
.op-winter-snow-cap .op-snow-sparkle {
  animation: opSnowSparkleTwinkle 2.8s ease-in-out infinite;
}

/* Subtle glossy frost sheen sweep across cards on hover */
.op-winter-ice-sheen {
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  overflow: hidden !important;
  pointer-events: none !important;
  z-index: 9 !important;
}
.op-winter-ice-sheen::before {
  content: "" !important;
  position: absolute !important;
  top: -10% !important;
  bottom: -10% !important;
  left: 0 !important;
  width: 46% !important;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(224, 242, 254, 0.42) 48%,
    rgba(255, 255, 255, 0.72) 52%,
    rgba(255, 255, 255, 0) 100%
  ) !important;
  transform: translate3d(-145%, 0, 0) skewX(-22deg);
  opacity: 0;
}
[data-op-snow-capped="1"]:hover > .op-winter-ice-sheen::before {
  animation: opCardIceSheenSweep 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Tiny snow dust sparkle puff when hovering a snow-capped card */
.op-winter-snow-dust {
  position: absolute !important;
  top: -10px !important;
  left: 14% !important;
  right: 14% !important;
  height: 22px !important;
  pointer-events: none !important;
  z-index: 13 !important;
}
.op-winter-snow-dust span {
  position: absolute !important;
  width: 6px !important;
  height: 6px !important;
  border-radius: 999px !important;
  background: radial-gradient(circle, #FFFFFF 0%, #BAE6FD 65%, transparent 100%) !important;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.9) !important;
  opacity: 0;
}
[data-op-snow-capped="1"]:hover > .op-winter-snow-dust span {
  animation: opSnowDustPuff 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Soft snow-rim highlight along header bottom edge in winter */
body .header-wrapper,
body header.header {
  box-shadow:
    0 8px 26px rgba(4, 18, 28, 0.42),
    inset 0 -3px 8px rgba(224, 242, 254, 0.25) !important;
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
  .op-winter-snow-cap,
  .op-winter-snow-cap .op-snow-icicle,
  .op-winter-snow-cap .op-snow-sparkle,
  .op-winter-ice-sheen::before,
  .op-winter-snow-dust span {
    animation: none !important;
    transition: none !important;
  }
}
`.trim();
}

/**
 * Generates pure ES5-compatible browser runtime code that attaches sculpted 3D snow caps,
 * translucent hanging icicles, frost sheen, and hover snow-dust sparkles onto every card
 * across the storefront (and watches dynamically added collection/slider cards).
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
  }

  function decorateSnowCardsNow() {
    if (!opSnowActive || !document.body) return;
    var candidates;
    try {
      candidates = document.querySelectorAll(OP_SNOW_CARD_SELECTOR);
    } catch (e) {
      return;
    }
    var idx = 0;
    for (var i = 0; i < candidates.length; i++) {
      var card = candidates[i];
      if (!card || card.nodeType !== 1) continue;
      if (card.getAttribute('data-op-snow-capped') === '1') {
        idx++;
        continue;
      }
      // Avoid double snow-caps on nested cards inside an already snow-capped card (except hero product cards)
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

      var cap = document.createElement('div');
      cap.className = 'op-winter-snow-cap';
      cap.setAttribute('data-snow-variant', String(variant));
      cap.setAttribute('aria-hidden', 'true');
      cap.innerHTML = OP_SNOW_CAP_SVGS[variant];
      card.insertBefore(cap, card.firstChild);

      var sheen = document.createElement('div');
      sheen.className = 'op-winter-ice-sheen';
      sheen.setAttribute('aria-hidden', 'true');
      card.appendChild(sheen);

      var dust = document.createElement('div');
      dust.className = 'op-winter-snow-dust';
      dust.setAttribute('aria-hidden', 'true');
      dust.innerHTML =
        '<span style="left:12%;--op-dx:-12px;animation-delay:0s;"></span>' +
        '<span style="left:48%;--op-dx:6px;animation-delay:0.08s;"></span>' +
        '<span style="left:82%;--op-dx:14px;animation-delay:0.15s;"></span>';
      card.appendChild(dust);
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
      opSnowObserver = new MutationObserver(function () {
        if (!opSnowActive) return;
        if (opSnowTimer) clearTimeout(opSnowTimer);
        opSnowTimer = setTimeout(decorateSnowCardsNow, 180);
      });
      opSnowObserver.observe(document.body, { childList: true, subtree: true });
    }
  }
`;
}
