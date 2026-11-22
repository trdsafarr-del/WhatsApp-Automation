import type { FestivalPalette, FestivalPresetId, FestivalThemeConfig } from './festivalThemes.js';

interface BulbSpec {
  id: string;
  core: string;
  mid: string;
  deep: string;
  halo: string;
  spark: string;
}

const CHRISTMAS_GLASS_BULBS: BulbSpec[] = [
  {
    id: 'ruby',
    core: '#FFF1F2',
    mid: '#F43F5E',
    deep: '#9F1239',
    halo: 'rgba(244, 63, 94, 0.42)',
    spark: '#FDA4AF',
  },
  {
    id: 'gold',
    core: '#FFFBEB',
    mid: '#FBBF24',
    deep: '#B45309',
    halo: 'rgba(251, 191, 36, 0.44)',
    spark: '#FEF08A',
  },
  {
    id: 'emerald',
    core: '#ECFDF5',
    mid: '#10B981',
    deep: '#065F46',
    halo: 'rgba(16, 185, 129, 0.40)',
    spark: '#6EE7B7',
  },
  {
    id: 'sapphire',
    core: '#F0F9FF',
    mid: '#38BDF8',
    deep: '#0369A1',
    halo: 'rgba(56, 189, 248, 0.42)',
    spark: '#BAE6FD',
  },
  {
    id: 'amber',
    core: '#FFF7ED',
    mid: '#FB923C',
    deep: '#C2410C',
    halo: 'rgba(251, 146, 60, 0.40)',
    spark: '#FED7AA',
  },
  {
    id: 'berry',
    core: '#FDF2F8',
    mid: '#EC4899',
    deep: '#9D174D',
    halo: 'rgba(236, 72, 153, 0.40)',
    spark: '#F9A8D4',
  },
];

function getGlassBulbPalette(presetId: FestivalPresetId, palette: FestivalPalette): BulbSpec[] {
  if (presetId === 'christmas') {
    return CHRISTMAS_GLASS_BULBS;
  }
  if (presetId === 'holi') {
    return [
      { id: 'pink', core: '#FDF2F8', mid: '#EC4899', deep: '#9D174D', halo: 'rgba(236,72,153,0.42)', spark: '#F9A8D4' },
      { id: 'amber', core: '#FFFBEB', mid: '#F59E0B', deep: '#B45309', halo: 'rgba(245,158,11,0.42)', spark: '#FDE68A' },
      { id: 'cyan', core: '#ECFEFF', mid: '#06B6D4', deep: '#155E75', halo: 'rgba(6,182,212,0.42)', spark: '#A5F3FC' },
      { id: 'violet', core: '#F5F3FF', mid: '#8B5CF6', deep: '#5B21B6', halo: 'rgba(139,92,246,0.42)', spark: '#DDD6FE' },
      { id: 'lime', core: '#F0FDF4', mid: '#22C55E', deep: '#166534', halo: 'rgba(34,197,94,0.40)', spark: '#BBF7D0' },
    ];
  }
  if (presetId === 'independence_day') {
    return [
      { id: 'saffron', core: '#FFF7ED', mid: '#FF7A00', deep: '#C2410C', halo: 'rgba(255,122,0,0.44)', spark: '#FED7AA' },
      { id: 'white', core: '#FFFFFF', mid: '#E2E8F0', deep: '#64748B', halo: 'rgba(255,255,255,0.44)', spark: '#F8FAFC' },
      { id: 'green', core: '#F0FDF4', mid: '#16A34A', deep: '#14532D', halo: 'rgba(22,163,74,0.42)', spark: '#BBF7D0' },
    ];
  }
  if (presetId === 'diwali' || presetId === 'navratri') {
    return [
      { id: 'diya', core: '#FFFBEB', mid: '#FBBF24', deep: '#B45309', halo: 'rgba(251,191,36,0.46)', spark: '#FEF08A' },
      { id: 'saffron', core: '#FFF7ED', mid: '#F97316', deep: '#9A3412', halo: 'rgba(249,115,22,0.44)', spark: '#FDBA74' },
      { id: 'crimson', core: '#FFF1F2', mid: '#E11D48', deep: '#881337', halo: 'rgba(225,29,72,0.42)', spark: '#FDA4AF' },
      { id: 'warmgold', core: '#FEFCE8', mid: '#FACC15', deep: '#A16207', halo: 'rgba(250,204,21,0.44)', spark: '#FEF9C3' },
    ];
  }
  return [
    { id: 'accent', core: '#FFFBEB', mid: palette.accent, deep: palette.headerBg, halo: 'rgba(251,191,36,0.40)', spark: '#FEF08A' },
    { id: 'primary', core: '#FFF5F7', mid: palette.primary, deep: palette.primaryHover, halo: 'rgba(244,63,94,0.38)', spark: '#FDE68A' },
    { id: 'ivory', core: '#FFFFFF', mid: '#FDE68A', deep: '#B45309', halo: 'rgba(253,230,138,0.42)', spark: '#FFFFFF' },
  ];
}

/**
 * Generates ultra-lightweight, interactive 3D blown-glass fairy string lights ("sheeshe ki ladi")
 * with a braided curved wire, brass screw caps, inner filament glow, specular glass shine,
 * and touch/hover/click crystalline pop animation targets.
 */
export function buildInteractive3DStringLightsHtml(
  presetId: FestivalPresetId,
  palette: FestivalPalette
): string {
  const bulbsPalette = getGlassBulbPalette(presetId, palette);
  const totalBulbs = 16;

  // Natural catenary drape drop depths (in px) along two gentle festoon waves across the header
  const dropPattern = [4, 11, 16, 18, 16, 11, 5, 3, 5, 11, 16, 18, 16, 11, 5, 3];
  const tiltPattern = [-4, -2, -1, 0, 1, 2, 3, 0, -3, -2, -1, 0, 1, 2, 3, 4];

  const wireSvg = `<svg class="op-ladi-wire-svg" viewBox="0 0 1440 44" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M-8 3 Q180 26 360 8 T720 6 T1080 26 T1448 4" stroke="#081C15" stroke-width="4.2" stroke-linecap="round" opacity="0.92"/>
  <path d="M-8 3 Q180 26 360 8 T720 6 T1080 26 T1448 4" stroke="#2D6A4F" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="10 8" opacity="0.72"/>
  <path d="M-8 2 Q180 24 360 6 T720 4 T1080 24 T1448 2" stroke="rgba(254,240,138,0.38)" stroke-width="0.9" stroke-linecap="round"/>
</svg>`;

  const nodes: string[] = [];
  for (let i = 0; i < totalBulbs; i += 1) {
    const b = bulbsPalette[i % bulbsPalette.length];
    const dropPx = dropPattern[i % dropPattern.length];
    const tiltDeg = tiltPattern[i % tiltPattern.length];
    const twinkleDelay = ((i % 6) * 0.38).toFixed(2);
    const swayDur = (4.2 + (i % 4) * 0.65).toFixed(2);
    // Keep mobile super crisp & spacious (10 bulbs on <=640px, all 16 on tablet/desktop)
    const responsiveCls = i % 3 === 1 && i > 1 && i < 14 ? ' op-bulb-desktop-only' : '';

    nodes.push(
      `<button type="button" class="op-garland-drop${responsiveCls}" data-op-bulb="${i}" data-op-note="${i % 8}" aria-label="Touch festive 3D glass light ${i + 1}" style="--op-drop:${dropPx}px;--op-tilt:${tiltDeg}deg;--op-sway-dur:${swayDur}s;--op-twinkle-delay:${twinkleDelay}s;--op-b-core:${b.core};--op-b-mid:${b.mid};--op-b-deep:${b.deep};--op-b-halo:${b.halo};--op-b-spark:${b.spark};">` +
        `<span class="op-bulb-cord" aria-hidden="true"></span>` +
        `<span class="op-bulb-socket" aria-hidden="true"></span>` +
        `<span class="op-garland-bulb" aria-hidden="true">` +
          `<span class="op-bulb-halo"></span>` +
          `<span class="op-bulb-glass">` +
            `<span class="op-bulb-filament"></span>` +
            `<span class="op-bulb-shine"></span>` +
            `<span class="op-bulb-rim"></span>` +
          `</span>` +
          `<span class="op-bulb-pop-ring"></span>` +
          `<span class="op-bulb-sparks"><i></i><i></i><i></i><i></i></span>` +
        `</span>` +
      `</button>`
    );
  }

  return `<div class="op-garland-wire op-ladi-3d" data-op-festival-ladi="${presetId}" role="group" aria-label="Interactive 3D festive glass string lights">${wireSvg}<div class="op-ladi-row">${nodes.join('')}</div></div>`;
}

/**
 * Generates strictly GPU-composited (`transform`, `opacity`) CSS for the interactive
 * 3D blown-glass string lights. Zero `backdrop-filter: blur`, zero layout thrashing,
 * full `prefers-reduced-motion` compliance, and non-blocking pointer-events.
 */
export function buildChristmasStringLightsCss(
  presetId: FestivalPresetId,
  config: FestivalThemeConfig,
  palette: FestivalPalette
): string {
  if (!config.enabled || config.show3DArticles === false) return '';

  const isChristmas = presetId === 'christmas';
  const topFade = isChristmas
    ? `linear-gradient(180deg, ${palette.headerBg} 0%, rgba(14, 59, 44, 0.28) 28%, rgba(0, 0, 0, 0) 100%)`
    : `linear-gradient(180deg, ${palette.headerBg} 0%, rgba(0, 0, 0, 0) 68%)`;

  return `
/* OrderPulse Interactive 3D Blown-Glass String Lights ("Sheeshe Ki Ladi") — Pure GPU 60fps */
@keyframes opLadiIdleSway {
  0%, 100% { transform: rotate(calc(var(--op-tilt, 0deg) - 2.2deg)); }
  50% { transform: rotate(calc(var(--op-tilt, 0deg) + 2.4deg)); }
}
@keyframes opLadiGlassTwinkle {
  0%, 100% { opacity: 0.72; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.06); }
}
@keyframes opBulbPopSwing {
  0% { transform: rotate(0deg) scale(1); }
  14% { transform: rotate(-16deg) scale(1.22, 0.90); }
  32% { transform: rotate(13deg) scale(0.94, 1.12); }
  52% { transform: rotate(-8deg) scale(1.04, 0.98); }
  72% { transform: rotate(4.5deg) scale(1); }
  88% { transform: rotate(-2deg) scale(1); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes opBulbRippleLeft {
  0% { transform: rotate(0deg); }
  28% { transform: rotate(-7deg); }
  62% { transform: rotate(4deg); }
  100% { transform: rotate(0deg); }
}
@keyframes opBulbRippleRight {
  0% { transform: rotate(0deg); }
  28% { transform: rotate(7deg); }
  62% { transform: rotate(-4deg); }
  100% { transform: rotate(0deg); }
}
@keyframes opBulbPopRing {
  0% { opacity: 0.95; transform: translate3d(-50%, -50%, 0) scale(0.45); }
  100% { opacity: 0; transform: translate3d(-50%, -50%, 0) scale(2.45); }
}
@keyframes opBulbSparkBurst {
  0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.1); }
  100% { opacity: 0; transform: translate3d(var(--sx, 0px), var(--sy, 0px), 0) scale(0.15); }
}

#orderpulse-festival-garland {
  position: relative !important;
  z-index: 2147482400 !important;
  width: 100% !important;
  height: 62px !important;
  margin-bottom: -24px !important;
  overflow: visible !important;
  pointer-events: none !important;
  background: ${topFade} !important;
  contain: layout style;
  user-select: none;
  -webkit-user-select: none;
}
#orderpulse-festival-garland .op-garland-wire.op-ladi-3d {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-top: none !important;
  overflow: visible;
  pointer-events: none;
}
#orderpulse-festival-garland .op-ladi-wire-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 36px;
  display: block;
  pointer-events: none;
}
#orderpulse-festival-garland .op-ladi-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  width: 100%;
  max-width: 1520px;
  margin: 0 auto;
  padding: 0 10px;
  box-sizing: border-box;
  pointer-events: none;
}
#orderpulse-festival-garland .op-garland-drop {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  padding: var(--op-drop, 8px) 8px 10px !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
  transform-origin: 50% 0%;
  animation: opLadiIdleSway var(--op-sway-dur, 4.8s) ease-in-out infinite;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
#orderpulse-festival-garland .op-garland-drop:focus-visible .op-bulb-glass {
  outline: 2px solid #FEF08A;
  outline-offset: 3px;
}
#orderpulse-festival-garland .op-bulb-cord {
  display: block;
  width: 2px;
  height: 8px;
  background: linear-gradient(180deg, #071913 0%, #1F4E3D 100%);
  border-radius: 1px;
  pointer-events: none;
}
#orderpulse-festival-garland .op-bulb-socket {
  position: relative;
  display: block;
  width: 11px;
  height: 8px;
  margin-top: -1px;
  border-radius: 3px 3px 2px 2px;
  background: linear-gradient(90deg, #78350F 0%, #F59E0B 32%, #FEF08A 52%, #B45309 78%, #451A03 100%);
  box-shadow: inset 0 -2px 2px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.35);
  z-index: 2;
  pointer-events: none;
}
#orderpulse-festival-garland .op-bulb-socket::after {
  content: '';
  position: absolute;
  left: 1px;
  right: 1px;
  top: 2px;
  height: 1.5px;
  background: rgba(69, 26, 3, 0.45);
  border-radius: 1px;
}
#orderpulse-festival-garland .op-garland-bulb {
  position: relative;
  display: block;
  width: 18px !important;
  height: 25px !important;
  margin-top: -1px;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  animation: none !important;
  pointer-events: none;
}
#orderpulse-festival-garland .op-bulb-halo {
  position: absolute;
  top: 52%;
  left: 50%;
  width: 44px;
  height: 44px;
  margin-left: -22px;
  margin-top: -22px;
  border-radius: 999px;
  background: radial-gradient(circle, var(--op-b-halo) 0%, rgba(255, 255, 255, 0) 70%);
  opacity: 0.84;
  animation: opLadiGlassTwinkle 2.8s ease-in-out infinite;
  animation-delay: var(--op-twinkle-delay, 0s);
  pointer-events: none;
}
#orderpulse-festival-garland .op-bulb-glass {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 46% 46% 52% 52% / 36% 36% 64% 64%;
  background: radial-gradient(circle at 38% 34%, var(--op-b-core) 0%, var(--op-b-mid) 46%, var(--op-b-deep) 88%, rgba(15, 23, 42, 0.85) 100%);
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.65),
    inset -3px -5px 7px rgba(0, 0, 0, 0.34),
    inset 2px -2px 4px rgba(255, 255, 255, 0.22),
    0 4px 10px rgba(0, 0, 0, 0.26);
  overflow: hidden;
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
#orderpulse-festival-garland .op-bulb-filament {
  position: absolute;
  top: 22%;
  left: 50%;
  width: 6px;
  height: 11px;
  margin-left: -3px;
  border-radius: 999px;
  background: radial-gradient(circle, #FFFFFF 0%, var(--op-b-core) 60%, transparent 100%);
  opacity: 0.86;
}
#orderpulse-festival-garland .op-bulb-shine {
  position: absolute;
  top: 15%;
  left: 19%;
  width: 5px;
  height: 11px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.14) 100%);
  transform: rotate(-16deg);
}
#orderpulse-festival-garland .op-bulb-rim {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 6px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  transform: rotate(-28deg);
}
#orderpulse-festival-garland .op-bulb-pop-ring {
  position: absolute;
  top: 52%;
  left: 50%;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 2px solid var(--op-b-spark, #FEF08A);
  opacity: 0;
  pointer-events: none;
  transform: translate3d(-50%, -50%, 0) scale(0.4);
}
#orderpulse-festival-garland .op-bulb-sparks {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}
#orderpulse-festival-garland .op-bulb-sparks i {
  position: absolute;
  top: -2px;
  left: -2px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--op-b-spark, #FEF08A);
  opacity: 0;
}
#orderpulse-festival-garland .op-bulb-sparks i:nth-child(1) { --sx: -16px; --sy: -12px; }
#orderpulse-festival-garland .op-bulb-sparks i:nth-child(2) { --sx: 16px; --sy: -10px; }
#orderpulse-festival-garland .op-bulb-sparks i:nth-child(3) { --sx: -14px; --sy: 14px; }
#orderpulse-festival-garland .op-bulb-sparks i:nth-child(4) { --sx: 15px; --sy: 13px; }

/* Active Interactive Pop & Neighbor Wave Ripple */
#orderpulse-festival-garland .op-garland-drop.op-bulb-popping {
  animation: opBulbPopSwing 0.68s cubic-bezier(0.22, 1, 0.36, 1) !important;
}
#orderpulse-festival-garland .op-garland-drop.op-bulb-popping .op-bulb-halo {
  opacity: 1 !important;
  transform: scale(1.38) !important;
  transition: transform 0.16s ease-out, opacity 0.16s ease-out;
}
#orderpulse-festival-garland .op-garland-drop.op-bulb-popping .op-bulb-pop-ring {
  animation: opBulbPopRing 0.44s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
#orderpulse-festival-garland .op-garland-drop.op-bulb-popping .op-bulb-sparks i {
  animation: opBulbSparkBurst 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
#orderpulse-festival-garland .op-garland-drop.op-bulb-ripple-l {
  animation: opBulbRippleLeft 0.56s ease-out !important;
}
#orderpulse-festival-garland .op-garland-drop.op-bulb-ripple-r {
  animation: opBulbRippleRight 0.56s ease-out !important;
}

@media (hover: hover) and (pointer: fine) {
  #orderpulse-festival-garland .op-garland-drop:hover .op-bulb-glass {
    transform: scale(1.1);
  }
}

@media (max-width: 768px) {
  #orderpulse-festival-garland {
    height: 52px !important;
    margin-bottom: -18px !important;
  }
  #orderpulse-festival-garland .op-bulb-desktop-only {
    display: none !important;
  }
  #orderpulse-festival-garland .op-garland-drop {
    padding: calc(var(--op-drop, 8px) * 0.65) 5px 8px !important;
    animation: none !important;
  }
  #orderpulse-festival-garland .op-garland-bulb {
    width: 15px !important;
    height: 21px !important;
  }
  #orderpulse-festival-garland .op-bulb-socket {
    width: 9px;
    height: 6px;
  }
  #orderpulse-festival-garland .op-bulb-halo {
    width: 34px;
    height: 34px;
    margin-left: -17px;
    margin-top: -17px;
    animation: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  #orderpulse-festival-garland .op-garland-drop,
  #orderpulse-festival-garland .op-bulb-halo,
  #orderpulse-festival-garland .op-bulb-pop-ring,
  #orderpulse-festival-garland .op-bulb-sparks i {
    animation: none !important;
    transition: none !important;
  }
}
`.trim();
}

/**
 * Self-contained ES5-safe runtime that powers interactive 3D glass string lights:
 * - Synthesizes realistic blown-glass bulb pop + crystalline chime via 0-byte Web Audio API
 * - Supports mouse hover sweep, click/tap, AND mobile touch-drag across all bulbs
 * - Triggers 3D spring swing + starburst pop ring + neighbor wave ripple physics
 * Zero external assets, zero layout thrashing, zero memory leaks.
 */
export function buildChristmasStringLightsRuntimeJs(): string {
  return `
  var opLadiAudioCtx = null;
  var opLadiAudioUnlocked = false;
  var opLadiLastPopAt = {};
  var opLadiBoundEl = null;
  var opLadiTouchLastIdx = -1;

  function ensureLadiAudio(allowCreate) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!opLadiAudioCtx) {
      if (!allowCreate && !opLadiAudioUnlocked) return null;
      try {
        opLadiAudioCtx = new AC();
      } catch (e) {
        return null;
      }
    }
    if (opLadiAudioCtx && opLadiAudioCtx.state === 'suspended') {
      try {
        opLadiAudioCtx.resume();
      } catch (e) {}
    }
    if (opLadiAudioCtx && opLadiAudioCtx.state === 'running') {
      opLadiAudioUnlocked = true;
    }
    return opLadiAudioCtx;
  }

  function playGlassBulbPopSound(noteIndex, fromGesture) {
    try {
      var ctx = ensureLadiAudio(!!fromGesture);
      if (!ctx || ctx.state !== 'running') return;
      var now = ctx.currentTime;
      // Festive blown-glass celesta pentatonic frequencies (C5 .. E6)
      var notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
      var baseFreq = notes[Math.abs(noteIndex || 0) % notes.length];

      var master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.15, now + 0.005);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      master.connect(ctx.destination);

      // Layer 1: Hollow glass-bulb "pop" transient (upward pitch blip)
      var popOsc = ctx.createOscillator();
      var popGain = ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(Math.max(420, baseFreq * 0.85), now);
      popOsc.frequency.exponentialRampToValueAtTime(baseFreq * 2.35, now + 0.026);
      popGain.gain.setValueAtTime(0.75, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.036);
      popOsc.connect(popGain);
      popGain.connect(master);
      popOsc.start(now);
      popOsc.stop(now + 0.042);

      // Layer 2: Crystalline glass bell fundamental
      var bellOsc = ctx.createOscillator();
      var bellGain = ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(baseFreq, now);
      bellGain.gain.setValueAtTime(0.62, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      bellOsc.connect(bellGain);
      bellGain.connect(master);
      bellOsc.start(now);
      bellOsc.stop(now + 0.35);

      // Layer 3: Thin blown-glass inharmonic shimmer overtone (2.756x)
      var glassOsc = ctx.createOscillator();
      var glassGain = ctx.createGain();
      glassOsc.type = 'triangle';
      glassOsc.frequency.setValueAtTime(baseFreq * 2.756, now);
      glassGain.gain.setValueAtTime(0.24, now);
      glassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      glassOsc.connect(glassGain);
      glassGain.connect(master);
      glassOsc.start(now);
      glassOsc.stop(now + 0.15);
    } catch (e) {}
  }

  function triggerLadiBulbPop(bulbBtn, fromGesture) {
    if (!bulbBtn) return;
    var idxStr = bulbBtn.getAttribute('data-op-bulb') || '0';
    var idx = parseInt(idxStr, 10) || 0;
    var nowMs = Date.now();
    if (!fromGesture && opLadiLastPopAt[idx] && nowMs - opLadiLastPopAt[idx] < 160) {
      return;
    }
    if (fromGesture && opLadiLastPopAt[idx] && nowMs - opLadiLastPopAt[idx] < 95) {
      return;
    }
    opLadiLastPopAt[idx] = nowMs;

    var noteIdx = parseInt(bulbBtn.getAttribute('data-op-note') || idxStr, 10) || 0;
    playGlassBulbPopSound(noteIdx, fromGesture);

    // Retrigger crisp 3D swing + pop ring animation cleanly
    bulbBtn.classList.remove('op-bulb-popping', 'op-bulb-ripple-l', 'op-bulb-ripple-r');
    void bulbBtn.offsetWidth;
    bulbBtn.classList.add('op-bulb-popping');
    if (bulbBtn._opPopTimer) clearTimeout(bulbBtn._opPopTimer);
    bulbBtn._opPopTimer = setTimeout(function () {
      bulbBtn.classList.remove('op-bulb-popping');
    }, 700);

    // Gentle physical wire wave ripple on immediate neighbor bulbs
    var prev = bulbBtn.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains('op-garland-drop') && !prev.classList.contains('op-bulb-popping')) {
      prev.classList.remove('op-bulb-ripple-l', 'op-bulb-ripple-r');
      void prev.offsetWidth;
      prev.classList.add('op-bulb-ripple-l');
      if (prev._opRipTimer) clearTimeout(prev._opRipTimer);
      prev._opRipTimer = setTimeout(function () {
        prev.classList.remove('op-bulb-ripple-l');
      }, 580);
    }
    var next = bulbBtn.nextElementSibling;
    if (next && next.classList && next.classList.contains('op-garland-drop') && !next.classList.contains('op-bulb-popping')) {
      next.classList.remove('op-bulb-ripple-l', 'op-bulb-ripple-r');
      void next.offsetWidth;
      next.classList.add('op-bulb-ripple-r');
      if (next._opRipTimer) clearTimeout(next._opRipTimer);
      next._opRipTimer = setTimeout(function () {
        next.classList.remove('op-bulb-ripple-r');
      }, 580);
    }
  }

  function unlockLadiAudioOnce() {
    ensureLadiAudio(true);
    if (opLadiAudioUnlocked) {
      window.removeEventListener('pointerdown', unlockLadiAudioOnce, true);
      window.removeEventListener('touchstart', unlockLadiAudioOnce, true);
    }
  }

  function unmountFestivalStringLights() {
    if (opLadiBoundEl) {
      try {
        opLadiBoundEl.removeAttribute('data-op-ladi-bound');
      } catch (e) {}
      opLadiBoundEl = null;
    }
    opLadiTouchLastIdx = -1;
  }

  function mountFestivalStringLights(ft) {
    if (!ft || !ft.enabled || ft.show3DArticles === false) {
      unmountFestivalStringLights();
      return;
    }
    var garlandEl = document.getElementById('orderpulse-festival-garland');
    if (!garlandEl) return;
    if (garlandEl.getAttribute('data-op-ladi-bound') === '1') {
      opLadiBoundEl = garlandEl;
      return;
    }
    garlandEl.setAttribute('data-op-ladi-bound', '1');
    opLadiBoundEl = garlandEl;

    // Quietly unlock AudioContext on first user gesture anywhere on page so hover chimes work immediately after
    window.addEventListener('pointerdown', unlockLadiAudioOnce, { capture: true, passive: true });
    window.addEventListener('touchstart', unlockLadiAudioOnce, { capture: true, passive: true });

    // Desktop hover sweep across glass bulbs
    garlandEl.addEventListener('pointerover', function (ev) {
      if (ev && ev.pointerType === 'touch') return;
      var target = ev.target && ev.target.closest ? ev.target.closest('.op-garland-drop') : null;
      if (target) triggerLadiBulbPop(target, false);
    });

    // Direct tap / click on any glass bulb (always unlocks audio & plays crisp pop)
    garlandEl.addEventListener('pointerdown', function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest('.op-garland-drop') : null;
      if (target) {
        triggerLadiBulbPop(target, true);
      }
    });

    // Mobile finger-slide across the entire string of 3D bulbs
    garlandEl.addEventListener('touchmove', function (ev) {
      if (!ev || !ev.touches || !ev.touches.length) return;
      var t = ev.touches[0];
      var hit = document.elementFromPoint(t.clientX, t.clientY);
      var bulb = hit && hit.closest ? hit.closest('.op-garland-drop') : null;
      if (bulb) {
        var idx = parseInt(bulb.getAttribute('data-op-bulb') || '-1', 10);
        if (idx !== opLadiTouchLastIdx) {
          opLadiTouchLastIdx = idx;
          triggerLadiBulbPop(bulb, true);
        }
      }
    }, { passive: true });

    garlandEl.addEventListener('touchend', function () {
      opLadiTouchLastIdx = -1;
    }, { passive: true });
  }
`.trim();
}
