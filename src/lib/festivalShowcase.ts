import { buildInteractive3DStringLightsHtml } from './christmasStringLights.js';
import type {
  FestivalPresetId,
  FestivalThemeConfig,
  FestivalThemePreset,
} from './festivalThemes.js';

export interface FestivalFeaturedProduct {
  id: string;
  title: string;
  handle: string;
  price: string;
  currency: string;
  imageUrl: string;
  productType?: string;
  tags?: string;
}

export interface FestivalHeroCopy {
  eyebrow: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaPath: string;
  articleLabel: string;
}

export interface Festival3DBackgroundSpec {
  label: string;
  isDarkCanvas: boolean;
  baseGradient: string;
  auroraGradient: string;
  orb1: string;
  orb2: string;
  orb3: string;
  orb4: string;
  prismColor: string;
  gridColor: string;
  glowShadow: string;
  cardTintBg: string;
  btnDepth: string;
}

export function getFestival3DBackgroundSpec(
  presetId: FestivalPresetId
): Festival3DBackgroundSpec {
  switch (presetId) {
    case 'christmas':
      return {
        label: '3D Blown-Glass String Lights (Pop Sound), Snowy Pine Forest, Hanging Baubles & Starry Winter Sky',
        isDarkCanvas: true,
        baseGradient:
          'linear-gradient(180deg, #061822 0%, #0B2E36 36%, #0E3F33 72%, #07221B 100%)',
        auroraGradient:
          'radial-gradient(ellipse 75% 45% at 22% 18%, rgba(225,29,72,0.22) 0%, transparent 65%), radial-gradient(ellipse 72% 45% at 78% 20%, rgba(251,191,36,0.22) 0%, transparent 65%), radial-gradient(ellipse 80% 50% at 50% 62%, rgba(16,185,129,0.22) 0%, transparent 70%)',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(254,240,138,0.62), rgba(245,158,11,0.24) 55%, rgba(245,158,11,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(254,205,211,0.52), rgba(225,29,72,0.22) 55%, rgba(136,19,55,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(187,247,208,0.48), rgba(16,185,129,0.20) 55%, rgba(6,78,59,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.54), rgba(186,230,253,0.18) 55%, rgba(14,116,144,0) 100%)',
        prismColor: 'rgba(254, 240, 138, 0.30)',
        gridColor: 'rgba(255, 255, 255, 0.08)',
        glowShadow: 'rgba(5, 22, 26, 0.44)',
        cardTintBg: 'rgba(255, 253, 249, 0.97)',
        btnDepth: '#780F22',
      };
    case 'diwali':
      return {
        label: '3D Hanging Brass Kandil Lanterns, Lit Diyas, Golden Fireworks & Warm Velvet Aura',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(155deg, #FFF7E0 0%, #FDE6BF 48%, #FCD6C8 100%)',
        auroraGradient:
          'conic-gradient(from 90deg at 50% 45%, rgba(217,145,0,0.22), rgba(154,27,47,0.18), rgba(251,191,36,0.22), rgba(234,88,12,0.16), rgba(217,145,0,0.22))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(254,240,138,0.92), rgba(217,145,0,0.45) 55%, rgba(146,64,14,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(253,164,175,0.82), rgba(154,27,47,0.38) 55%, rgba(92,15,30,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(254,215,170,0.88), rgba(234,88,12,0.38) 55%, rgba(154,52,18,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(255,251,235,0.90), rgba(245,158,11,0.34) 55%, rgba(180,83,9,0) 100%)',
        prismColor: 'rgba(217, 145, 0, 0.22)',
        gridColor: 'rgba(154, 27, 47, 0.11)',
        glowShadow: 'rgba(154, 27, 47, 0.24)',
        cardTintBg: 'rgba(255, 252, 246, 0.94)',
        btnDepth: '#5E0E1B',
      };
    case 'holi':
      return {
        label: '3D Gulal Color Cloud Bursts, Festive Bunting & Rainbow Splash Depth',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(145deg, #FFF0F8 0%, #FEF6D8 48%, #E6FAFE 100%)',
        auroraGradient:
          'conic-gradient(from 45deg at 50% 45%, rgba(236,72,153,0.22), rgba(245,158,11,0.20), rgba(6,182,212,0.20), rgba(139,92,246,0.20), rgba(236,72,153,0.22))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(249,168,212,0.92), rgba(236,72,153,0.48) 55%, rgba(157,23,77,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(254,240,138,0.92), rgba(245,158,11,0.46) 55%, rgba(180,83,9,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(165,243,252,0.92), rgba(6,182,212,0.44) 55%, rgba(21,94,117,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(221,214,254,0.92), rgba(139,92,246,0.42) 55%, rgba(91,33,182,0) 100%)',
        prismColor: 'rgba(236, 72, 153, 0.20)',
        gridColor: 'rgba(139, 92, 246, 0.12)',
        glowShadow: 'rgba(194, 24, 91, 0.24)',
        cardTintBg: 'rgba(255, 253, 255, 0.94)',
        btnDepth: '#7E0E39',
      };
    case 'eid':
      return {
        label: '3D Starry Emerald Eid Sky, Crescent Moon & Swaying Golden Fanoos Lanterns',
        isDarkCanvas: true,
        baseGradient:
          'linear-gradient(180deg, #06281C 0%, #0B4631 45%, #0F5E42 82%, #073323 100%)',
        auroraGradient:
          'radial-gradient(ellipse 75% 45% at 75% 18%, rgba(250,204,21,0.22) 0%, transparent 65%), radial-gradient(ellipse 75% 50% at 25% 65%, rgba(16,185,129,0.22) 0%, transparent 70%)',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(254,240,138,0.55), rgba(200,150,46,0.20) 55%, rgba(133,77,14,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(167,243,208,0.45), rgba(15,106,74,0.20) 55%, rgba(6,40,28,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(254,249,195,0.45), rgba(217,160,23,0.18) 55%, rgba(113,63,18,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(209,250,229,0.40), rgba(5,150,105,0.16) 55%, rgba(6,78,59,0) 100%)',
        prismColor: 'rgba(250, 204, 21, 0.26)',
        gridColor: 'rgba(250, 204, 21, 0.10)',
        glowShadow: 'rgba(4, 24, 17, 0.42)',
        cardTintBg: 'rgba(252, 255, 253, 0.96)',
        btnDepth: '#063B28',
      };
    case 'valentine':
      return {
        label: '3D Velvet Rose Bokeh, Floating Ruby Hearts & Romantic Silk Depth',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(145deg, #FFF0F4 0%, #FFE4EC 50%, #FFF5F8 100%)',
        auroraGradient:
          'conic-gradient(from 60deg at 50% 45%, rgba(225,29,72,0.18), rgba(251,113,133,0.22), rgba(244,63,94,0.16), rgba(190,18,60,0.16), rgba(225,29,72,0.18))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(254,205,211,0.92), rgba(225,29,72,0.42) 55%, rgba(136,19,55,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(253,164,175,0.90), rgba(244,63,94,0.38) 55%, rgba(159,18,57,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(254,240,138,0.86), rgba(245,158,11,0.32) 55%, rgba(180,83,9,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(252,231,243,0.90), rgba(219,39,119,0.34) 55%, rgba(131,24,67,0) 100%)',
        prismColor: 'rgba(225, 29, 72, 0.18)',
        gridColor: 'rgba(190, 18, 60, 0.11)',
        glowShadow: 'rgba(190, 18, 60, 0.24)',
        cardTintBg: 'rgba(255, 251, 253, 0.94)',
        btnDepth: '#7F0D2A',
      };
    case 'navratri':
      return {
        label: '3D Temple Marigold Lanterns, Glowing Diyas & Sindoor Crimson Radiance',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(145deg, #FFF5E8 0%, #FFE8CC 50%, #FDE3DC 100%)',
        auroraGradient:
          'conic-gradient(from 75deg at 50% 45%, rgba(234,88,12,0.22), rgba(200,30,30,0.18), rgba(245,158,11,0.20), rgba(127,29,29,0.16), rgba(234,88,12,0.22))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(254,215,170,0.92), rgba(234,88,12,0.44) 55%, rgba(154,52,18,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(254,202,202,0.90), rgba(200,30,30,0.40) 55%, rgba(127,29,29,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(254,240,138,0.92), rgba(245,158,11,0.40) 55%, rgba(180,83,9,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(255,237,213,0.90), rgba(249,115,22,0.34) 55%, rgba(194,65,12,0) 100%)',
        prismColor: 'rgba(234, 88, 12, 0.20)',
        gridColor: 'rgba(200, 30, 30, 0.11)',
        glowShadow: 'rgba(185, 28, 28, 0.24)',
        cardTintBg: 'rgba(255, 252, 247, 0.94)',
        btnDepth: '#7F1212',
      };
    case 'new_year':
      return {
        label: '3D Midnight Celebration Sky, Golden Fireworks Bursts & Champagne Sparkle',
        isDarkCanvas: true,
        baseGradient:
          'linear-gradient(180deg, #070B18 0%, #101A36 48%, #162246 82%, #0B1226 100%)',
        auroraGradient:
          'radial-gradient(ellipse 75% 45% at 25% 20%, rgba(250,204,21,0.22) 0%, transparent 65%), radial-gradient(ellipse 75% 45% at 75% 28%, rgba(99,102,241,0.22) 0%, transparent 65%)',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(254,240,138,0.55), rgba(202,138,4,0.22) 55%, rgba(113,63,18,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(199,210,254,0.45), rgba(79,70,229,0.20) 55%, rgba(30,27,75,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(254,249,195,0.45), rgba(234,179,8,0.18) 55%, rgba(133,77,14,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(226,232,240,0.40), rgba(148,163,184,0.16) 55%, rgba(15,23,42,0) 100%)',
        prismColor: 'rgba(250, 204, 21, 0.26)',
        gridColor: 'rgba(250, 204, 21, 0.10)',
        glowShadow: 'rgba(2, 6, 23, 0.48)',
        cardTintBg: 'rgba(255, 255, 255, 0.96)',
        btnDepth: '#020617',
      };
    case 'independence_day':
      return {
        label: '3D Tricolor Saffron-White-Green Waves & Chakra Blue Aurora',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(155deg, #FFF1DF 0%, #FFFFFF 50%, #E4FAEC 100%)',
        auroraGradient:
          'conic-gradient(from 90deg at 50% 45%, rgba(255,111,0,0.20), rgba(19,136,8,0.18), rgba(11,37,89,0.16), rgba(255,153,51,0.18), rgba(255,111,0,0.20))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(254,215,170,0.92), rgba(255,111,0,0.44) 55%, rgba(154,52,18,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(187,247,208,0.92), rgba(19,136,8,0.42) 55%, rgba(20,83,45,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(191,219,254,0.90), rgba(11,37,89,0.34) 55%, rgba(7,25,61,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(255,237,213,0.90), rgba(249,115,22,0.34) 55%, rgba(194,65,12,0) 100%)',
        prismColor: 'rgba(255, 111, 0, 0.18)',
        gridColor: 'rgba(11, 37, 89, 0.11)',
        glowShadow: 'rgba(19, 136, 8, 0.24)',
        cardTintBg: 'rgba(255, 255, 255, 0.94)',
        btnDepth: '#094E04',
      };
    case 'janmashtami':
      return {
        label: '3D Peacock Sapphire Nebula, Flute Gold Orbs & Lotus Depth',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(145deg, #EEF5FF 0%, #FBF8EC 50%, #E7F3FF 100%)',
        auroraGradient:
          'conic-gradient(from 110deg at 50% 45%, rgba(22,75,138,0.20), rgba(217,155,22,0.20), rgba(14,165,233,0.18), rgba(13,43,84,0.16), rgba(22,75,138,0.20))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(191,219,254,0.92), rgba(22,75,138,0.42) 55%, rgba(13,43,84,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(254,240,138,0.92), rgba(217,155,22,0.42) 55%, rgba(133,77,14,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(165,243,252,0.92), rgba(14,165,233,0.36) 55%, rgba(3,105,161,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(187,247,208,0.88), rgba(16,185,129,0.32) 55%, rgba(6,95,70,0) 100%)',
        prismColor: 'rgba(22, 75, 138, 0.18)',
        gridColor: 'rgba(22, 75, 138, 0.12)',
        glowShadow: 'rgba(13, 43, 84, 0.24)',
        cardTintBg: 'rgba(252, 254, 255, 0.94)',
        btnDepth: '#09254A',
      };
    case 'mothers_day':
      return {
        label: '3D Orchid Blossom Aurora, Lilac Silk Orbs & Floral Corner Motifs',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(145deg, #FAF0FF 0%, #FFF2F8 50%, #F4E8FF 100%)',
        auroraGradient:
          'conic-gradient(from 135deg at 50% 45%, rgba(134,25,143,0.18), rgba(219,39,119,0.18), rgba(192,132,252,0.20), rgba(162,28,175,0.16), rgba(134,25,143,0.18))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(245,208,254,0.92), rgba(134,25,143,0.40) 55%, rgba(74,18,89,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(251,207,232,0.92), rgba(219,39,119,0.38) 55%, rgba(131,24,67,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(233,213,255,0.92), rgba(168,85,247,0.34) 55%, rgba(88,28,135,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(254,240,138,0.88), rgba(245,158,11,0.30) 55%, rgba(180,83,9,0) 100%)',
        prismColor: 'rgba(134, 25, 143, 0.18)',
        gridColor: 'rgba(134, 25, 143, 0.11)',
        glowShadow: 'rgba(134, 25, 143, 0.24)',
        cardTintBg: 'rgba(255, 252, 255, 0.94)',
        btnDepth: '#520D57',
      };
    case 'raksha_bandhan':
    default:
      return {
        label: '3D Roseberry & Silk Gold Festive Aura with Floral Corners',
        isDarkCanvas: false,
        baseGradient:
          'linear-gradient(145deg, #FFF0F5 0%, #FDF4E3 50%, #FFE4EC 100%)',
        auroraGradient:
          'conic-gradient(from 80deg at 50% 45%, rgba(184,29,83,0.18), rgba(212,148,26,0.20), rgba(244,63,94,0.16), rgba(107,18,53,0.16), rgba(184,29,83,0.18))',
        orb1: 'radial-gradient(circle at 30% 28%, rgba(253,164,175,0.92), rgba(184,29,83,0.42) 55%, rgba(107,18,53,0) 100%)',
        orb2: 'radial-gradient(circle at 30% 28%, rgba(254,240,138,0.92), rgba(212,148,26,0.42) 55%, rgba(146,64,14,0) 100%)',
        orb3: 'radial-gradient(circle at 32% 28%, rgba(251,207,232,0.92), rgba(219,39,119,0.36) 55%, rgba(131,24,67,0) 100%)',
        orb4: 'radial-gradient(circle at 32% 28%, rgba(254,243,199,0.92), rgba(245,158,11,0.34) 55%, rgba(180,83,9,0) 100%)',
        prismColor: 'rgba(212, 148, 26, 0.20)',
        gridColor: 'rgba(184, 29, 83, 0.11)',
        glowShadow: 'rgba(184, 29, 83, 0.24)',
        cardTintBg: 'rgba(255, 252, 254, 0.94)',
        btnDepth: '#6E0D30',
      };
  }
}

/**
 * Generates an unmistakable, richly illustrated 3D Christmas Winter Wonderland scenic backdrop:
 * - Starry winter Christmas Eve night sky with twinkling golden stars
 * - Glowing full winter moon & gliding Santa Claus sleigh + reindeer silhouette
 * - Top-left & top-right snow-dusted evergreen pine boughs with holly berries & swaying 3D glossy baubles
 * - Bottom panorama of layered snow-capped Christmas pine trees, twinkling warm lights,
 *   decorated corner Christmas trees with star toppers, wrapped gifts & rolling glistening snow drifts
 * - Ambient background crystal snowflakes & warm Christmas bokeh glints
 */
function buildChristmasScenicBgHtml(): string {
  const starCoords = [
    [5, 8, 3, '0s'],
    [12, 15, 2.5, '0.6s'],
    [19, 6, 3.5, '1.2s'],
    [28, 12, 2.5, '1.8s'],
    [35, 7, 3, '0.4s'],
    [43, 16, 2.5, '1.5s'],
    [52, 9, 3.5, '0.9s'],
    [61, 14, 2.5, '2.1s'],
    [69, 6, 3, '0.3s'],
    [76, 11, 2.5, '1.7s'],
    [88, 9, 3.5, '1.1s'],
    [94, 17, 2.5, '0.5s'],
    [8, 32, 2.5, '1.4s'],
    [91, 34, 3, '0.8s'],
    [4, 52, 2.5, '2.0s'],
    [95, 50, 2.5, '1.0s'],
  ] as const;

  const starsHtml = starCoords
    .map(
      ([x, y, sz, delay]) =>
        `<span class="op-xmas-star" style="left:${x}%;top:${y}%;width:${sz * 3}px;height:${sz * 3}px;animation-delay:${delay};"></span>`
    )
    .join('');

  // Left & Right hanging 3D glossy Christmas ornaments from snowy pine boughs
  const cornerLeftSvg = `<svg class="op-xmas-corner op-xmas-corner-left" viewBox="0 0 320 340" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opBgRedBauble" cx="32%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FECDD3"/>
      <stop offset="32%" stop-color="#E11D48"/>
      <stop offset="76%" stop-color="#9F1239"/>
      <stop offset="100%" stop-color="#4C0519"/>
    </radialGradient>
    <radialGradient id="opBgGoldBauble" cx="32%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FEF9C3"/>
      <stop offset="38%" stop-color="#F59E0B"/>
      <stop offset="82%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#451A03"/>
    </radialGradient>
    <radialGradient id="opBgGreenBauble" cx="32%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#BBF7D0"/>
      <stop offset="40%" stop-color="#16A34A"/>
      <stop offset="82%" stop-color="#14532D"/>
      <stop offset="100%" stop-color="#052E16"/>
    </radialGradient>
  </defs>
  <!-- Snowy Pine Bough -->
  <path d="M-10 -8 C40 16 115 30 220 12 C180 42 108 62 28 66 L-10 46 Z" fill="#14532D"/>
  <path d="M-8 12 C56 34 128 40 200 22 C164 56 96 76 18 82 L-10 68 Z" fill="#166534" opacity="0.95"/>
  <path d="M4 22 Q74 36 164 20" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" opacity="0.72"/>
  <!-- Holly Berries -->
  <circle cx="52" cy="46" r="5.5" fill="#EF4444"/>
  <circle cx="62" cy="51" r="5" fill="#DC2626"/>
  <circle cx="57" cy="40" r="4.5" fill="#F87171"/>
  <circle cx="144" cy="34" r="5" fill="#EF4444"/>
  <circle cx="152" cy="39" r="4.5" fill="#DC2626"/>
  <!-- Swaying Bauble 1 (Large Glossy Crimson) -->
  <g class="op-xmas-sway-a" style="transform-origin:78px 46px;">
    <line x1="78" y1="46" x2="78" y2="152" stroke="#FDE047" stroke-width="2.2" opacity="0.88"/>
    <rect x="69" y="148" width="18" height="12" rx="3" fill="#F59E0B"/>
    <circle cx="78" cy="196" r="40" fill="url(#opBgRedBauble)"/>
    <ellipse cx="64" cy="180" rx="9" ry="15" transform="rotate(-24 64 180)" fill="#FFFFFF" opacity="0.34"/>
    <path d="M78 174 V218 M56 196 H100 M63 181 L93 211 M93 181 L63 211" stroke="#FEF08A" stroke-width="2.2" stroke-linecap="round" opacity="0.82"/>
  </g>
  <!-- Swaying Bauble 2 (Champagne Gold) -->
  <g class="op-xmas-sway-b" style="transform-origin:164px 32px;">
    <line x1="164" y1="32" x2="164" y2="108" stroke="#FDE047" stroke-width="2" opacity="0.85"/>
    <rect x="157" y="104" width="14" height="10" rx="3" fill="#FEF08A"/>
    <circle cx="164" cy="142" r="30" fill="url(#opBgGoldBauble)"/>
    <ellipse cx="153" cy="131" rx="7" ry="11" transform="rotate(-24 153 131)" fill="#FFFFFF" opacity="0.4"/>
    <path d="M137 142 Q164 155 191 142" stroke="#FFFBEB" stroke-width="2.4" opacity="0.72"/>
  </g>
  <!-- Swaying Bauble 3 (3D Golden Jingle Bell & Holly Ribbon) -->
  <g class="op-xmas-sway-a" style="transform-origin:24px 66px;">
    <line x1="24" y1="66" x2="24" y2="214" stroke="#FDE047" stroke-width="1.9" opacity="0.82"/>
    <path d="M12 222 C12 208 36 208 36 222 L43 246 C32 252 16 252 5 246 Z" fill="url(#opBgGoldBauble)"/>
    <ellipse cx="24" cy="246" rx="18" ry="5" fill="#78350F" opacity="0.78"/>
    <circle cx="24" cy="250" r="5" fill="#FEF08A"/>
    <ellipse cx="18" cy="226" rx="3.5" ry="9" transform="rotate(-12 18 226)" fill="#FFFFFF" opacity="0.45"/>
    <circle cx="24" cy="212" r="4.5" fill="#EF4444"/>
  </g>
</svg>`;

  const cornerRightSvg = `<svg class="op-xmas-corner op-xmas-corner-right" viewBox="0 0 320 340" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opBgRedBaubleR" cx="32%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FECDD3"/>
      <stop offset="32%" stop-color="#E11D48"/>
      <stop offset="76%" stop-color="#9F1239"/>
      <stop offset="100%" stop-color="#4C0519"/>
    </radialGradient>
    <radialGradient id="opBgGoldBaubleR" cx="32%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FEF9C3"/>
      <stop offset="38%" stop-color="#F59E0B"/>
      <stop offset="82%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#451A03"/>
    </radialGradient>
  </defs>
  <!-- Snowy Pine Bough -->
  <path d="M330 -8 C280 16 205 30 100 12 C140 42 212 62 292 66 L330 46 Z" fill="#14532D"/>
  <path d="M328 12 C264 34 192 40 120 22 C156 56 224 76 302 82 L330 68 Z" fill="#166534" opacity="0.95"/>
  <path d="M316 22 Q246 36 156 20" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" opacity="0.72"/>
  <circle cx="268" cy="46" r="5.5" fill="#EF4444"/>
  <circle cx="258" cy="51" r="5" fill="#DC2626"/>
  <circle cx="176" cy="34" r="5" fill="#EF4444"/>
  <!-- Swaying Bauble Right 1 (Glossy Crimson) -->
  <g class="op-xmas-sway-b" style="transform-origin:244px 48px;">
    <line x1="244" y1="48" x2="244" y2="164" stroke="#FDE047" stroke-width="2.2" opacity="0.88"/>
    <rect x="235" y="160" width="18" height="12" rx="3" fill="#F59E0B"/>
    <circle cx="244" cy="206" r="38" fill="url(#opBgRedBaubleR)"/>
    <ellipse cx="231" cy="191" rx="8.5" ry="14" transform="rotate(-24 231 191)" fill="#FFFFFF" opacity="0.34"/>
    <path d="M214 206 Q244 222 274 206" stroke="#FEF08A" stroke-width="2.6" opacity="0.82"/>
  </g>
  <!-- Swaying Star Ornament -->
  <g class="op-xmas-sway-a" style="transform-origin:158px 30px;">
    <line x1="158" y1="30" x2="158" y2="104" stroke="#FDE047" stroke-width="2" opacity="0.85"/>
    <circle cx="158" cy="134" r="34" fill="#FEF08A" opacity="0.18"/>
    <path d="M158 100 L166 122 L190 123 L171 137 L178 160 L158 146 L138 160 L145 137 L126 123 L150 122 Z" fill="url(#opBgGoldBaubleR)"/>
  </g>
</svg>`;

  // Glowing full moon + Santa Claus Sleigh & Reindeer gliding across the starry sky
  const moonAndSleighHtml = `<div class="op-xmas-moon" aria-hidden="true"></div>
<div class="op-xmas-sleigh" aria-hidden="true">
  <svg viewBox="0 0 280 76" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g fill="#FEF9C3" opacity="0.88">
      <!-- Sleigh -->
      <path d="M16 54 C36 58 68 58 84 46 L88 42 C72 52 38 52 22 48 C18 47 14 42 18 39 C13 40 10 51 16 54 Z"/>
      <path d="M26 44 L22 26 C34 26 42 32 54 34 L72 28 L76 44 Z"/>
      <!-- Santa + Gift Sack -->
      <circle cx="46" cy="22" r="6.5"/>
      <path d="M41 18 C43 11 52 10 55 15 L49 18 Z"/>
      <circle cx="34" cy="27" r="7.5"/>
      <!-- Reins -->
      <path d="M74 34 Q118 42 162 32 T240 28" stroke="#FDE047" stroke-width="1.3" fill="none" opacity="0.72"/>
      <!-- Reindeer 1 -->
      <path d="M138 40 C145 34 156 34 162 38 L168 30 L172 32 L166 42 L169 52 L165 53 L161 44 L148 44 L144 54 L140 53 L143 43 L135 45 Z"/>
      <path d="M169 30 L174 22 M171 27 L176 26" stroke="#FEF9C3" stroke-width="1.6" stroke-linecap="round"/>
      <!-- Reindeer 2 -->
      <path d="M188 35 C195 29 206 29 212 33 L218 25 L222 27 L216 37 L219 47 L215 48 L211 39 L198 39 L194 49 L190 48 L193 38 L185 40 Z"/>
      <path d="M219 25 L224 17 M221 22 L226 21" stroke="#FEF9C3" stroke-width="1.6" stroke-linecap="round"/>
      <!-- Lead Reindeer (Rudolph) -->
      <path d="M236 30 C243 24 254 24 260 28 L266 20 L270 22 L264 32 L267 42 L263 43 L259 34 L246 34 L242 44 L238 43 L241 33 L233 35 Z"/>
      <path d="M267 20 L272 12 M269 17 L274 16" stroke="#FEF9C3" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="272" cy="23" r="3" fill="#EF4444"/>
    </g>
  </svg>
</div>`;

  // Full-width Snowy Christmas Pine Forest, Snow Hills, Decorated Christmas Trees & Gifts Panorama
  const forestPanoramaSvg = `<svg class="op-xmas-forest" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="opSnowHillBack" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1E4E5F" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#0E2E3A" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="opSnowDriftMid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#DBEAFE"/>
      <stop offset="60%" stop-color="#EFF6FF"/>
      <stop offset="100%" stop-color="#BFDBFE"/>
    </linearGradient>
    <linearGradient id="opSnowDriftFront" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#DBEAFE"/>
    </linearGradient>
    <linearGradient id="opPineRich" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#15803D"/>
      <stop offset="100%" stop-color="#052E16"/>
    </linearGradient>
    <linearGradient id="opPineDeep" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#166534"/>
      <stop offset="100%" stop-color="#06281A"/>
    </linearGradient>
  </defs>

  <!-- Distant Snowy Mountains & Far Pine Silhouettes -->
  <path d="M0 205 Q220 120 460 185 T960 170 T1440 195 L1440 300 L0 300 Z" fill="url(#opSnowHillBack)"/>
  <g fill="#0A332A" opacity="0.78">
    <polygon points="180,210 210,126 240,210"/>
    <polygon points="225,215 262,112 299,215"/>
    <polygon points="340,220 370,145 400,220"/>
    <polygon points="520,225 552,155 584,225"/>
    <polygon points="860,225 894,150 928,225"/>
    <polygon points="1030,220 1068,136 1106,220"/>
    <polygon points="1170,215 1208,118 1246,215"/>
    <polygon points="1245,215 1280,132 1315,215"/>
  </g>

  <!-- Mid Snowy Rolling Hill -->
  <path d="M0 245 Q310 195 660 236 T1440 228 L1440 300 L0 300 Z" fill="url(#opSnowDriftMid)" opacity="0.88"/>

  <!-- Left Hero Decorated 3D Christmas Tree -->
  <g transform="translate(26, 26)">
    <rect x="64" y="206" width="22" height="36" rx="4" fill="#5C2D16"/>
    <path d="M75 112 L10 212 Q75 224 140 212 Z" fill="url(#opPineDeep)"/>
    <path d="M75 72 L22 162 Q75 174 128 162 Z" fill="url(#opPineRich)"/>
    <path d="M75 34 L34 114 Q75 124 116 114 Z" fill="url(#opPineRich)"/>
    <!-- Snow Caps on Tree Branches -->
    <path d="M75 34 L56 72 Q75 80 94 72 Z" fill="#F0F9FF" opacity="0.88"/>
    <path d="M40 112 Q75 126 110 112" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" opacity="0.72"/>
    <path d="M24 160 Q75 176 126 160" stroke="#E0F2FE" stroke-width="5.5" stroke-linecap="round" opacity="0.7"/>
    <!-- Tree Garland & Baubles -->
    <path d="M46 98 Q75 112 104 96" stroke="#FDE047" stroke-width="3" fill="none"/>
    <path d="M32 146 Q75 162 118 144" stroke="#FDE047" stroke-width="3.2" fill="none"/>
    <path d="M22 194 Q75 212 128 192" stroke="#FDE047" stroke-width="3.5" fill="none"/>
    <circle cx="60" cy="96" r="5.5" fill="#EF4444" class="op-xmas-twinkle"/>
    <circle cx="92" cy="100" r="5" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="48" cy="146" r="6" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="76" cy="142" r="6" fill="#EF4444" class="op-xmas-twinkle"/>
    <circle cx="104" cy="148" r="5.5" fill="#38BDF8" class="op-xmas-twinkle"/>
    <circle cx="42" cy="192" r="6.5" fill="#EF4444" class="op-xmas-twinkle"/>
    <circle cx="78" cy="196" r="6.5" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="112" cy="192" r="6" fill="#EF4444" class="op-xmas-twinkle"/>
    <!-- Glowing Star Topper -->
    <circle cx="75" cy="26" r="18" fill="#FEF08A" opacity="0.34"/>
    <path d="M75 8 L80 20 L93 21 L83 29 L86 42 L75 34 L64 42 L67 29 L57 21 L70 20 Z" fill="#FDE047"/>
    <!-- Gift Boxes under Left Tree -->
    <rect x="112" y="210" width="32" height="28" rx="4" fill="#DC2626"/>
    <rect x="125" y="210" width="6" height="28" fill="#FDE047"/>
    <rect x="112" y="221" width="32" height="5" fill="#FDE047"/>
    <rect x="148" y="218" width="24" height="22" rx="4" fill="#15803D"/>
    <rect x="157" y="218" width="5" height="22" fill="#EF4444"/>
  </g>

  <!-- Secondary Mid-Left Snowy Pine -->
  <g transform="translate(178, 92)">
    <path d="M46 20 L6 138 Q46 146 86 138 Z" fill="url(#opPineDeep)"/>
    <path d="M46 20 L28 66 Q46 72 64 66 Z" fill="#E0F2FE" opacity="0.82"/>
    <circle cx="34" cy="96" r="4" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="58" cy="112" r="4" fill="#EF4444" class="op-xmas-twinkle"/>
  </g>

  <!-- Right Hero Decorated 3D Christmas Tree -->
  <g transform="translate(1254, 18)">
    <rect x="68" y="212" width="24" height="38" rx="4" fill="#5C2D16"/>
    <path d="M80 112 L10 218 Q80 232 150 218 Z" fill="url(#opPineDeep)"/>
    <path d="M80 70 L22 166 Q80 178 138 166 Z" fill="url(#opPineRich)"/>
    <path d="M80 30 L36 116 Q80 126 124 116 Z" fill="url(#opPineRich)"/>
    <path d="M80 30 L59 70 Q80 78 101 70 Z" fill="#F0F9FF" opacity="0.88"/>
    <path d="M42 114 Q80 128 118 114" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" opacity="0.72"/>
    <path d="M24 164 Q80 180 136 164" stroke="#E0F2FE" stroke-width="5.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M48 96 Q80 112 112 96" stroke="#FDE047" stroke-width="3" fill="none"/>
    <path d="M34 148 Q80 166 126 148" stroke="#FDE047" stroke-width="3.2" fill="none"/>
    <path d="M22 198 Q80 218 138 198" stroke="#FDE047" stroke-width="3.5" fill="none"/>
    <circle cx="64" cy="96" r="5.5" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="96" cy="100" r="5.5" fill="#EF4444" class="op-xmas-twinkle"/>
    <circle cx="50" cy="148" r="6" fill="#EF4444" class="op-xmas-twinkle"/>
    <circle cx="80" cy="146" r="6" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="112" cy="150" r="5.5" fill="#38BDF8" class="op-xmas-twinkle"/>
    <circle cx="44" cy="198" r="6.5" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="82" cy="202" r="6.5" fill="#EF4444" class="op-xmas-twinkle"/>
    <circle cx="118" cy="198" r="6" fill="#FDE047" class="op-xmas-twinkle"/>
    <circle cx="80" cy="22" r="19" fill="#FEF08A" opacity="0.34"/>
    <path d="M80 4 L85 17 L99 18 L88 26 L92 39 L80 31 L68 39 L72 26 L61 18 L75 17 Z" fill="#FDE047"/>
    <!-- Gift Boxes under Right Tree -->
    <rect x="-12" y="216" width="34" height="30" rx="4" fill="#DC2626"/>
    <rect x="2" y="216" width="6" height="30" fill="#FDE047"/>
    <rect x="-12" y="228" width="34" height="5" fill="#FDE047"/>
    <rect x="26" y="224" width="24" height="22" rx="4" fill="#F59E0B"/>
    <rect x="35" y="224" width="5" height="22" fill="#B91C1C"/>
  </g>

  <!-- Secondary Mid-Right Snowy Pine -->
  <g transform="translate(1152, 98)">
    <path d="M44 18 L6 134 Q44 142 82 134 Z" fill="url(#opPineDeep)"/>
    <path d="M44 18 L27 62 Q44 68 61 62 Z" fill="#E0F2FE" opacity="0.82"/>
    <circle cx="34" cy="96" r="4" fill="#EF4444" class="op-xmas-twinkle"/>
    <circle cx="56" cy="110" r="4" fill="#FDE047" class="op-xmas-twinkle"/>
  </g>

  <!-- Foreground Glistening Snow Drifts -->
  <path d="M0 264 Q240 232 520 266 T1120 258 T1440 250 L1440 300 L0 300 Z" fill="url(#opSnowDriftFront)"/>
</svg>`;

  return `${starsHtml}${moonAndSleighHtml}${cornerLeftSvg}${cornerRightSvg}${forestPanoramaSvg}`;
}

/**
 * Generates authentic festive corner & horizon scenery for Diwali / Navratri, Holi, Eid & New Year.
 */
function buildOtherFestivalScenicBgHtml(presetId: FestivalPresetId): string {
  if (presetId === 'diwali' || presetId === 'navratri') {
    const lanternSvg = (cls: string) => `<svg class="op-xmas-corner ${cls}" viewBox="0 0 240 290" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="op-xmas-sway-a" style="transform-origin:84px 0px;">
    <line x1="84" y1="0" x2="84" y2="66" stroke="#D97706" stroke-width="3"/>
    <polygon points="56,66 112,66 128,118 106,166 62,166 40,118" fill="#F59E0B" stroke="#9A1B2F" stroke-width="3"/>
    <ellipse cx="84" cy="116" rx="18" ry="26" fill="#FEF9C3" opacity="0.85"/>
    <line x1="68" y1="166" x2="64" y2="210" stroke="#9A1B2F" stroke-width="3" stroke-linecap="round"/>
    <line x1="84" y1="166" x2="84" y2="224" stroke="#D97706" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="100" y1="166" x2="104" y2="210" stroke="#9A1B2F" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g class="op-xmas-sway-b" style="transform-origin:174px 0px;">
    <line x1="174" y1="0" x2="174" y2="96" stroke="#D97706" stroke-width="2.4"/>
    <polygon points="154,96 194,96 206,134 190,168 158,168 142,134" fill="#9A1B2F" stroke="#F59E0B" stroke-width="2.6"/>
    <ellipse cx="174" cy="132" rx="12" ry="18" fill="#FEF08A" opacity="0.85"/>
    <line x1="174" y1="168" x2="174" y2="206" stroke="#D97706" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`;
    const diyaRowSvg = `<svg class="op-xmas-forest" viewBox="0 0 1440 160" preserveAspectRatio="xMidYMax slice" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M0 132 Q360 100 720 128 T1440 122 L1440 160 L0 160 Z" fill="#9A1B2F" opacity="0.16"/>
  ${[110, 310, 560, 880, 1130, 1330]
    .map(
      (x) => `<g transform="translate(${x}, 54)">
    <circle cx="34" cy="24" r="30" fill="#FDE047" opacity="0.28"/>
    <path d="M34 4 C42 18 44 30 39 38 C36 42 32 42 29 38 C24 30 26 18 34 4 Z" fill="#F97316"/>
    <path d="M34 16 C38 24 38 31 35 35 C34 37 33 37 32 35 C29 31 30 24 34 16 Z" fill="#FFFBEB"/>
    <path d="M8 44 C12 66 24 74 34 74 C44 74 56 66 60 44 Z" fill="#B45309"/>
    <ellipse cx="34" cy="44" rx="26" ry="7" fill="#7C2D12"/>
  </g>`
    )
    .join('')}
</svg>`;
    return `${lanternSvg('op-xmas-corner-left')}${lanternSvg('op-xmas-corner-right')}${diyaRowSvg}`;
  }

  if (presetId === 'eid') {
    const stars = [
      [10, 10],
      [22, 16],
      [38, 9],
      [54, 14],
      [68, 8],
      [88, 12],
      [94, 22],
    ]
      .map(
        ([x, y], i) =>
          `<span class="op-xmas-star" style="left:${x}%;top:${y}%;width:10px;height:10px;animation-delay:${(i * 0.4).toFixed(1)}s;"></span>`
      )
      .join('');
    const crescent = `<svg class="op-xmas-corner op-xmas-corner-right" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="155" cy="96" r="56" fill="#FDE047" opacity="0.16"/>
  <path d="M174 44 C138 44 112 72 112 108 C112 144 138 168 174 164 C150 152 140 132 140 108 C140 80 152 56 174 44 Z" fill="#FDE047"/>
</svg>`;
    const mosqueHorizon = `<svg class="op-xmas-forest" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M0 165 Q240 135 480 160 T960 154 T1440 165 L1440 200 L0 200 Z" fill="#041F15" opacity="0.88"/>
  <path d="M90 168 C90 112 140 86 170 60 C200 86 250 112 250 168 Z" fill="#063424"/>
  <rect x="64" y="88" width="14" height="84" fill="#063424"/>
  <path d="M1190 168 C1190 112 1240 86 1270 60 C1300 86 1350 112 1350 168 Z" fill="#063424"/>
  <rect x="1364" y="88" width="14" height="84" fill="#063424"/>
</svg>`;
    return `${stars}${crescent}${mosqueHorizon}`;
  }

  if (presetId === 'new_year') {
    const bursts = `<svg class="op-xmas-corner op-xmas-corner-left" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="#FDE047" stroke-width="2.5" stroke-linecap="round" opacity="0.72">
    <line x1="110" y1="110" x2="110" y2="38"/><line x1="110" y1="110" x2="110" y2="182"/>
    <line x1="110" y1="110" x2="38" y2="110"/><line x1="110" y1="110" x2="182" y2="110"/>
    <line x1="110" y1="110" x2="58" y2="58"/><line x1="110" y1="110" x2="162" y2="162"/>
    <line x1="110" y1="110" x2="162" y2="58"/><line x1="110" y1="110" x2="58" y2="162"/>
  </g>
</svg>
<svg class="op-xmas-corner op-xmas-corner-right" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" opacity="0.72">
    <line x1="150" y1="120" x2="150" y2="46"/><line x1="150" y1="120" x2="150" y2="194"/>
    <line x1="150" y1="120" x2="76" y2="120"/><line x1="150" y1="120" x2="224" y2="120"/>
    <line x1="150" y1="120" x2="98" y2="68"/><line x1="150" y1="120" x2="202" y2="172"/>
    <line x1="150" y1="120" x2="202" y2="68"/><line x1="150" y1="120" x2="98" y2="172"/>
  </g>
</svg>`;
    return bursts;
  }

  return '';
}

/**
 * Generates the fixed full-viewport 3D animated festive background canvas HTML
 * with authentic festival-specific scenery (Christmas Winter Wonderland pine forest,
 * swaying 3D baubles, Santa sleigh & starry sky; Diwali hanging lanterns & lit diyas; etc.).
 */
export function buildFestival3DBackgroundHtml(preset: FestivalThemePreset): string {
  const spec = getFestival3DBackgroundSpec(preset.id);
  const scenicLayer =
    preset.id === 'christmas'
      ? buildChristmasScenicBgHtml()
      : buildOtherFestivalScenicBgHtml(preset.id);

  return `<div class="op-bg3d-stage" data-festival-bg="${escapeHtml(preset.id)}" data-dark-canvas="${spec.isDarkCanvas ? '1' : '0'}" style="background:${spec.baseGradient};">
  <div class="op-bg3d-aurora" style="background:${spec.auroraGradient};"></div>
  <span class="op-bg3d-orb op-bg3d-orb-1" style="background:${spec.orb1};"></span>
  <span class="op-bg3d-orb op-bg3d-orb-2" style="background:${spec.orb2};"></span>
  <span class="op-bg3d-orb op-bg3d-orb-3" style="background:${spec.orb3};"></span>
  <span class="op-bg3d-orb op-bg3d-orb-4" style="background:${spec.orb4};"></span>
  ${scenicLayer}
</div>`;
}

const FESTIVAL_KEYWORDS: Record<FestivalPresetId, string[]> = {
  christmas: [
    'plum',
    'christmas',
    'cake',
    'brownie',
    'chocolate',
    'cookie',
    'tin',
    'hamper',
    'gift',
    'basket',
    'muffin',
    'truffle',
    'feast',
    'deluxe',
  ],
  diwali: [
    'hamper',
    'gift',
    'basket',
    'box',
    'mithai',
    'cookie',
    'tin',
    'chocolate',
    'brownie',
    'royal',
    'feast',
    'jute',
    'rose',
    'assorted',
  ],
  holi: [
    'hamper',
    'feast',
    'combo',
    'box',
    'sweet',
    'cookie',
    'brownie',
    'muffin',
    'cake',
    'basket',
    'deluxe',
    'chocolate',
  ],
  navratri: [
    'hamper',
    'basket',
    'gift',
    'box',
    'sweet',
    'cake',
    'cookie',
    'brownie',
    'muffin',
    'royal',
    'feast',
  ],
  raksha_bandhan: [
    'hamper',
    'rose',
    'gift',
    'basket',
    'chocolate',
    'brownie',
    'cookie',
    'tin',
    'cake',
    'box',
  ],
  eid: [
    'hamper',
    'royal',
    'feast',
    'basket',
    'gift',
    'cake',
    'brownie',
    'chocolate',
    'cookie',
    'deluxe',
    'box',
  ],
  janmashtami: [
    'hamper',
    'sweet',
    'cake',
    'muffin',
    'chocolate',
    'cookie',
    'basket',
    'box',
    'gift',
  ],
  independence_day: [
    'hamper',
    'feast',
    'combo',
    'deluxe',
    'basket',
    'box',
    'cake',
    'brownie',
    'cookie',
  ],
  new_year: [
    'party',
    'feast',
    'hamper',
    'cake',
    'brownie',
    'chocolate',
    'deluxe',
    'basket',
    'cookie',
    'combo',
  ],
  valentine: [
    'rose',
    'pink',
    'hamper',
    'chocolate',
    'brownie',
    'cake',
    'truffle',
    'gift',
    'heart',
    'basket',
  ],
  mothers_day: [
    'rose',
    'pink',
    'hamper',
    'basket',
    'cake',
    'brownie',
    'chocolate',
    'cookie',
    'gift',
    'muffin',
  ],
};

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPriceInr(price: string, currency = 'INR'): string {
  const num = Number.parseFloat(String(price || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return '';
  const sym = currency.toUpperCase() === 'INR' ? '₹' : `${currency} `;
  return `${sym}${Math.round(num).toLocaleString('en-IN')}`;
}

/**
 * Automatically selects the best real storefront products for a given festival banner.
 * Prioritizes manually pinned handles first, then ranks by festival relevance,
 * gift/hamper/bakery quality, real product photo presence, and title diversity.
 */
export function selectBestFestivalProducts(
  catalog: FestivalFeaturedProduct[],
  presetId: FestivalPresetId,
  pinnedHandles: string[] = [],
  maxCount = 3
): FestivalFeaturedProduct[] {
  const valid = (catalog || []).filter(
    (p) => Boolean(p && p.title && p.handle && p.imageUrl && /^https?:\/\//i.test(p.imageUrl))
  );
  if (valid.length === 0) return [];

  const byHandle = new Map<string, FestivalFeaturedProduct>();
  for (const item of valid) {
    const key = item.handle.trim().toLowerCase();
    if (!byHandle.has(key)) byHandle.set(key, item);
  }

  const chosen: FestivalFeaturedProduct[] = [];
  const usedHandles = new Set<string>();

  for (const rawHandle of pinnedHandles || []) {
    const key = String(rawHandle || '').trim().toLowerCase();
    const hit = byHandle.get(key);
    if (hit && !usedHandles.has(key)) {
      chosen.push(hit);
      usedHandles.add(key);
      if (chosen.length >= maxCount) return chosen;
    }
  }

  const keywords = FESTIVAL_KEYWORDS[presetId] || FESTIVAL_KEYWORDS.diwali;
  const scored = Array.from(byHandle.values())
    .filter((p) => !usedHandles.has(p.handle.trim().toLowerCase()))
    .map((p) => {
      const haystack = `${p.title} ${p.productType || ''} ${p.tags || ''}`.toLowerCase();
      let score = 10;
      for (let i = 0; i < keywords.length; i += 1) {
        if (haystack.includes(keywords[i])) {
          // Earlier keywords carry stronger festival affinity
          score += Math.max(4, 18 - i);
        }
      }
      if (/hamper|basket|gift|tin|cake|brownie|truffle|assorted/.test(haystack)) {
        score += 14;
      }
      const priceNum = Number.parseFloat(String(p.price || '0').replace(/[^\d.]/g, '')) || 0;
      if (priceNum >= 350 && priceNum <= 3000) score += 10;
      else if (priceNum >= 180) score += 5;
      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title));

  // Encourage real category diversity (e.g. 1 Hamper + 1 Cookie Tin + 1 Cake/Brownie/Combo)
  const classifyBucket = (title: string): string => {
    const t = title.toLowerCase();
    if (/hamper|basket|gift/.test(t)) return 'hamper';
    if (/cookie|tin/.test(t)) return 'cookie_tin';
    if (/cake|plum/.test(t)) return 'cake';
    if (/brownie|truffle|tub|dessert/.test(t)) return 'dessert';
    if (/muffin|cupcake/.test(t)) return 'muffin';
    if (/combo|box|feast|pack/.test(t)) return 'box';
    return t.split(/[-–|:(]/)[0].trim().slice(0, 18);
  };

  const pickedBuckets = new Set<string>(chosen.map((c) => classifyBucket(c.title)));
  for (const entry of scored) {
    if (chosen.length >= maxCount) break;
    const bucket = classifyBucket(entry.product.title);
    if (pickedBuckets.has(bucket) && scored.length > maxCount + 2) {
      continue;
    }
    chosen.push(entry.product);
    usedHandles.add(entry.product.handle.trim().toLowerCase());
    if (bucket) pickedBuckets.add(bucket);
  }

  // Fill any remaining slots if diversity skipped items
  for (const entry of scored) {
    if (chosen.length >= maxCount) break;
    const key = entry.product.handle.trim().toLowerCase();
    if (!usedHandles.has(key)) {
      chosen.push(entry.product);
      usedHandles.add(key);
    }
  }

  return chosen.slice(0, maxCount);
}

export function getFestivalHeroCopy(
  presetId: FestivalPresetId,
  shopName = 'Broomies Bakery'
): FestivalHeroCopy {
  const brand = shopName.trim() || 'Broomies Bakery';
  switch (presetId) {
    case 'christmas':
      return {
        eyebrow: 'Merry Christmas · Limited Festive Bake',
        headline: 'Warm Christmas Hampers, Cakes & Festive Treats',
        subheadline: `Handcrafted fresh at ${brand} with festive gift wrapping & fast delivery right to your doorstep.`,
        ctaLabel: 'Shop Christmas Gifts',
        ctaPath: '/collections/all',
        articleLabel: 'Interactive 3D Glass String Lights (Pop Sound), Roaming Santa, 3D Tree & Baubles',
      };
    case 'diwali':
      return {
        eyebrow: 'Shubh Deepavali · Royal Gift Collection',
        headline: 'Light Up Diwali with Luxury Bakery Gift Hampers',
        subheadline: `Celebrate the Festival of Lights with handcrafted ${brand} gift baskets, brownies & cookie tins.`,
        ctaLabel: 'Explore Diwali Hampers',
        ctaPath: '/collections/all',
        articleLabel: '3D Glowing Brass Diyas, Marigold Toran & Gold Lanterns',
      };
    case 'holi':
      return {
        eyebrow: 'Happy Holi · Festival of Colors',
        headline: 'Colorful Celebration Boxes & Festive Bakery Delights',
        subheadline: `Splash joy into every gathering with vibrant ${brand} hampers & freshly baked party treats.`,
        ctaLabel: 'Shop Holi Specials',
        ctaPath: '/collections/all',
        articleLabel: '3D Gulal Color Bowls, Festive Splashes & Color Bunting',
      };
    case 'navratri':
      return {
        eyebrow: 'Shubh Navratri · Festive Edition',
        headline: 'Celebrate Nine Nights with Freshly Baked Gift Boxes',
        subheadline: `Pure eggless ${brand} festive hampers crafted for family gatherings & gifting.`,
        ctaLabel: 'Shop Navratri Picks',
        ctaPath: '/collections/all',
        articleLabel: '3D Temple Diya, Decorative Kalash & Festive Toran',
      };
    case 'raksha_bandhan':
      return {
        eyebrow: 'Happy Raksha Bandhan · Sibling Gift Edit',
        headline: 'Sweeten Every Bond with Handcrafted Rakhi Hampers',
        subheadline: `Send love in ribbon-wrapped ${brand} gift baskets & rich artisanal treats.`,
        ctaLabel: 'Send Rakhi Hampers',
        ctaPath: '/collections/all',
        articleLabel: '3D Silk Gold Rakhi Medallion, Gift Box & Rose Petals',
      };
    case 'eid':
      return {
        eyebrow: 'Eid Mubarak · Royal Crescent Collection',
        headline: 'Share the Sweetness of Eid with Luxury Hampers',
        subheadline: `Curated ${brand} gift baskets, rich brownies & celebration boxes for warm Eid feasts.`,
        ctaLabel: 'Shop Eid Hampers',
        ctaPath: '/collections/all',
        articleLabel: '3D Golden Crescent Moon, Glowing Fanoos Lanterns & Stars',
      };
    case 'janmashtami':
      return {
        eyebrow: 'Happy Janmashtami · Sweet Celebration',
        headline: 'Festive Celebration Hampers & Handcrafted Treats',
        subheadline: `Fresh eggless treats from ${brand} crafted for joyful family celebrations.`,
        ctaLabel: 'Shop Celebration Boxes',
        ctaPath: '/collections/all',
        articleLabel: '3D Peacock Feather Medallion, Golden Flute & Sparkles',
      };
    case 'independence_day':
      return {
        eyebrow: 'Celebrating India · Tricolor Festive Deals',
        headline: 'Freshly Baked Celebration Boxes for Every Table',
        subheadline: `Enjoy handcrafted ${brand} hampers & gourmet combos made fresh in India.`,
        ctaLabel: 'Explore Festive Deals',
        ctaPath: '/collections/all',
        articleLabel: '3D Tricolor Ribbons, Festive Chakra & Confetti',
      };
    case 'new_year':
      return {
        eyebrow: 'Happy New Year · Party & Gifting Edit',
        headline: 'Ring In the New Year with Celebration Hampers',
        subheadline: `Host unforgettable parties with ${brand} dessert baskets, cakes & gourmet snack boxes.`,
        ctaLabel: 'Shop New Year Boxes',
        ctaPath: '/collections/all',
        articleLabel: '3D Champagne Starburst, Fireworks & Gold Confetti',
      };
    case 'valentine':
      return {
        eyebrow: "Valentine's Week · Baked with Love",
        headline: 'Romantic Rose Hampers & Chocolate Indulgence',
        subheadline: `Surprise someone special with handcrafted ${brand} rose hampers, brownies & sweet boxes.`,
        ctaLabel: "Shop Valentine's Gifts",
        ctaPath: '/collections/all',
        articleLabel: '3D Glossy Ruby Hearts, Velvet Gift Box & Rose Petals',
      };
    case 'mothers_day':
    default:
      return {
        eyebrow: "Happy Mother's Day · For Mom with Love",
        headline: 'Handcrafted Floral Hampers & Sweet Surprises for Mom',
        subheadline: `Make her day unforgettable with fresh ${brand} gift baskets & artisanal bakes.`,
        ctaLabel: "Shop Mother's Day Gifts",
        ctaPath: '/collections/all',
        articleLabel: '3D Blooming Orchid Bouquet, Silk Gift Box & Petals',
      };
  }
}

/**
 * Generates bespoke 3D-shaded inline SVG festival art objects (primary hero centerpiece + secondary floating prop).
 * Uses multi-stop radial lighting, specular reflections, soft 3D drop shadows & CSS 3D depth transforms.
 */
export function buildFestival3DArtSvgs(presetId: FestivalPresetId): {
  primarySvg: string;
  secondarySvg: string;
  floatingBadgeSvg: string;
} {
  switch (presetId) {
    case 'christmas':
      return {
        // 3D Layered Pine Christmas Tree with 3D glowing gold star & glossy red/gold baubles
        primarySvg: `<svg viewBox="0 0 180 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opXmasPine1" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#4ADE80"/>
      <stop offset="55%" stop-color="#15803D"/>
      <stop offset="100%" stop-color="#064E3B"/>
    </radialGradient>
    <radialGradient id="opXmasPine2" cx="30%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#22C55E"/>
      <stop offset="58%" stop-color="#166534"/>
      <stop offset="100%" stop-color="#052E16"/>
    </radialGradient>
    <radialGradient id="opXmasGold" cx="32%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </radialGradient>
    <radialGradient id="opXmasRed" cx="32%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#FDA4AF"/>
      <stop offset="40%" stop-color="#E11D48"/>
      <stop offset="100%" stop-color="#881337"/>
    </radialGradient>
    <linearGradient id="opXmasTrunk" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#92400E"/>
      <stop offset="50%" stop-color="#78350F"/>
      <stop offset="100%" stop-color="#451A03"/>
    </linearGradient>
    <filter id="op3dDrop" x="-20%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity="0.32"/>
    </filter>
  </defs>
  <ellipse cx="90" cy="176" rx="54" ry="10" fill="rgba(0,0,0,0.22)"/>
  <g filter="url(#op3dDrop)">
    <rect x="77" y="142" width="26" height="32" rx="5" fill="url(#opXmasTrunk)"/>
    <path d="M90 88 C62 104 34 128 24 148 C56 156 124 156 156 148 C146 128 118 104 90 88 Z" fill="url(#opXmasPine2)"/>
    <path d="M90 58 C66 74 44 96 35 114 C64 122 116 122 145 114 C136 96 114 74 90 58 Z" fill="url(#opXmasPine1)"/>
    <path d="M90 30 C72 46 56 66 49 82 C72 88 108 88 131 82 C124 66 108 46 90 30 Z" fill="url(#opXmasPine1)"/>
    <!-- Garland ribbon -->
    <path d="M56 79 Q90 92 124 77" stroke="#FDE047" stroke-width="3.2" stroke-linecap="round" opacity="0.9"/>
    <path d="M43 111 Q90 128 137 109" stroke="#FDE047" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>
    <path d="M33 144 Q90 160 147 142" stroke="#FDE047" stroke-width="3.8" stroke-linecap="round" opacity="0.88"/>
    <!-- 3D Glossy Baubles -->
    <circle cx="74" cy="70" r="7.5" fill="url(#opXmasRed)"/>
    <circle cx="71.5" cy="67.5" r="2.1" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="107" cy="74" r="7" fill="url(#opXmasGold)"/>
    <circle cx="104.8" cy="71.8" r="1.9" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="62" cy="105" r="8.5" fill="url(#opXmasGold)"/>
    <circle cx="59.5" cy="102.5" r="2.2" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="93" cy="101" r="8.5" fill="url(#opXmasRed)"/>
    <circle cx="90.5" cy="98.5" r="2.2" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="122" cy="106" r="8" fill="url(#opXmasRed)"/>
    <circle cx="119.8" cy="103.8" r="2" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="54" cy="138" r="9" fill="url(#opXmasRed)"/>
    <circle cx="51" cy="135" r="2.4" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="92" cy="136" r="9.5" fill="url(#opXmasGold)"/>
    <circle cx="89" cy="133" r="2.5" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="128" cy="139" r="9" fill="url(#opXmasGold)"/>
    <circle cx="125" cy="136" r="2.4" fill="#FFFFFF" opacity="0.8"/>
    <!-- Glowing 3D Star Topper -->
    <circle cx="90" cy="24" r="18" fill="#FEF08A" opacity="0.3"/>
    <path d="M90 6 L94.8 18.2 L108 18.8 L97.6 26.8 L101.2 39.4 L90 32 L78.8 39.4 L82.4 26.8 L72 18.8 L85.2 18.2 Z" fill="url(#opXmasGold)"/>
  </g>
</svg>`,
        // 3D Glossy Christmas Gift Box
        secondarySvg: `<svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="opGiftFront" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F43F5E"/>
      <stop offset="100%" stop-color="#9F1239"/>
    </linearGradient>
    <linearGradient id="opGiftSide" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#BE123C"/>
      <stop offset="100%" stop-color="#701A2C"/>
    </linearGradient>
    <linearGradient id="opGiftGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="55%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>
  <ellipse cx="55" cy="99" rx="34" ry="7" fill="rgba(0,0,0,0.22)"/>
  <polygon points="18,46 58,34 94,46 54,58" fill="#FB7185"/>
  <polygon points="18,46 54,58 54,94 18,80" fill="url(#opGiftFront)"/>
  <polygon points="54,58 94,46 94,80 54,94" fill="url(#opGiftSide)"/>
  <!-- Gold Ribbons -->
  <polygon points="33,51 43,54 43,90 33,86" fill="url(#opGiftGold)"/>
  <polygon points="70,53 80,50 80,85 70,88" fill="url(#opGiftGold)"/>
  <polygon points="34,40 46,37 78,49 66,53" fill="url(#opGiftGold)"/>
  <!-- 3D Bow Loops -->
  <path d="M55 39 C40 20 24 27 32 39 C38 45 48 43 55 39 Z" fill="url(#opGiftGold)"/>
  <path d="M55 39 C70 20 86 27 78 39 C72 45 62 43 55 39 Z" fill="url(#opGiftGold)"/>
  <circle cx="55" cy="39" r="6" fill="#FEF08A"/>
</svg>`,
        // 3D Glass Ornament Bauble
        floatingBadgeSvg: `<svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opBauble" cx="32%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FECDD3"/>
      <stop offset="35%" stop-color="#E11D48"/>
      <stop offset="100%" stop-color="#881337"/>
    </radialGradient>
  </defs>
  <rect x="33" y="10" width="14" height="10" rx="3" fill="#F59E0B"/>
  <circle cx="40" cy="8" r="5" stroke="#FDE047" stroke-width="2.5"/>
  <circle cx="40" cy="52" r="30" fill="url(#opBauble)"/>
  <ellipse cx="29" cy="40" rx="7" ry="11" transform="rotate(-24 29 40)" fill="#FFFFFF" opacity="0.4"/>
  <path d="M40 36 V68 M24 52 H56 M29 41 L51 63 M51 41 L29 63" stroke="#FEF08A" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
</svg>`,
      };

    case 'diwali':
    case 'navratri':
      return {
        // 3D Brass & Terracotta Glowing Diya with animated golden flame
        primarySvg: `<svg viewBox="0 0 180 175" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opFlameGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#F59E0B" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="opFlame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="35%" stop-color="#FEF08A"/>
      <stop offset="75%" stop-color="#F97316"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
    <radialGradient id="opDiyaBowl" cx="35%" cy="25%" r="80%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="45%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#7C2D12"/>
    </radialGradient>
  </defs>
  <circle cx="90" cy="56" r="52" fill="url(#opFlameGlow)" class="op-3d-flame-glow"/>
  <ellipse cx="90" cy="156" rx="58" ry="11" fill="rgba(0,0,0,0.24)"/>
  <!-- Animated 3D Flame -->
  <g class="op-3d-flame">
    <path d="M90 14 C107 40 112 62 103 78 C98 87 82 87 77 78 C68 62 73 40 90 14 Z" fill="url(#opFlame)"/>
    <path d="M90 38 C98 52 99 66 94 74 C91 78 89 78 86 74 C81 66 82 52 90 38 Z" fill="#FFFBEB"/>
  </g>
  <!-- 3D Ornate Diya Bowl -->
  <path d="M22 96 C26 138 56 154 90 154 C124 154 154 138 158 96 C130 112 50 112 22 96 Z" fill="url(#opDiyaBowl)"/>
  <ellipse cx="90" cy="96" rx="68" ry="18" fill="#92400E"/>
  <ellipse cx="90" cy="96" rx="58" ry="13" fill="#FDE68A" opacity="0.35"/>
  <path d="M36 116 Q90 134 144 116" stroke="#FEF08A" stroke-width="3.5" stroke-dasharray="7 6" stroke-linecap="round"/>
  <circle cx="60" cy="134" r="4" fill="#FEF08A"/>
  <circle cx="90" cy="141" r="5" fill="#FEF08A"/>
  <circle cx="120" cy="134" r="4" fill="#FEF08A"/>
</svg>`,
        // 3D Royal Gold Hanging Kandil Lantern
        secondarySvg: `<svg viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opLanternBody" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#9A1B2F"/>
    </radialGradient>
  </defs>
  <line x1="55" y1="4" x2="55" y2="24" stroke="#FDE047" stroke-width="3"/>
  <polygon points="34,26 76,26 88,60 72,94 38,94 22,60" fill="url(#opLanternBody)" stroke="#FDE047" stroke-width="2.5"/>
  <ellipse cx="55" cy="60" rx="14" ry="20" fill="#FFFBEB" opacity="0.55"/>
  <line x1="42" y1="94" x2="40" y2="118" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
  <line x1="55" y1="94" x2="55" y2="124" stroke="#FDE047" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="68" y1="94" x2="70" y2="118" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
</svg>`,
        floatingBadgeSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="40" cy="40" r="30" fill="#F59E0B" opacity="0.24"/>
  <path d="M40 8 L47 33 L72 40 L47 47 L40 72 L33 47 L8 40 L33 33 Z" fill="#FDE047"/>
  <circle cx="40" cy="40" r="8" fill="#FFFFFF"/>
</svg>`,
      };

    case 'holi':
      return {
        // 3D Gulal Color Bowls & Vibrant Splashes
        primarySvg: `<svg viewBox="0 0 180 170" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opHoliPink" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F9A8D4"/>
      <stop offset="50%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#9D174D"/>
    </radialGradient>
    <radialGradient id="opHoliAmber" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="55%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </radialGradient>
    <radialGradient id="opHoliCyan" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#A5F3FC"/>
      <stop offset="50%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#155E75"/>
    </radialGradient>
  </defs>
  <circle cx="48" cy="48" r="24" fill="#EC4899" opacity="0.28"/>
  <circle cx="132" cy="46" r="26" fill="#F59E0B" opacity="0.28"/>
  <circle cx="92" cy="34" r="20" fill="#06B6D4" opacity="0.28"/>
  <!-- Floating 3D Color Orbs -->
  <circle cx="38" cy="42" r="10" fill="url(#opHoliPink)"/>
  <circle cx="142" cy="38" r="11" fill="url(#opHoliAmber)"/>
  <circle cx="92" cy="24" r="9" fill="url(#opHoliCyan)"/>
  <!-- Center 3D Gulal Heap + Brass Bowl -->
  <path d="M40 102 Q90 36 140 102 Z" fill="url(#opHoliPink)"/>
  <path d="M22 108 Q54 68 82 108 Z" fill="url(#opHoliAmber)"/>
  <path d="M98 108 Q128 68 158 108 Z" fill="url(#opHoliCyan)"/>
  <path d="M26 104 C30 144 58 158 90 158 C122 158 150 144 154 104 Z" fill="#F8FAFC" stroke="#F3B8D8" stroke-width="3"/>
  <path d="M36 124 Q90 140 144 124" stroke="#C2185B" stroke-width="4" stroke-linecap="round"/>
</svg>`,
        secondarySvg: `<svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="38" cy="44" r="24" fill="#EC4899"/>
  <ellipse cx="30" cy="35" rx="5" ry="9" transform="rotate(-20 30 35)" fill="#FFFFFF" opacity="0.45"/>
  <circle cx="72" cy="52" r="22" fill="#F59E0B"/>
  <ellipse cx="65" cy="43" rx="4" ry="8" transform="rotate(-20 65 43)" fill="#FFFFFF" opacity="0.45"/>
  <circle cx="52" cy="72" r="20" fill="#8B5CF6"/>
  <ellipse cx="46" cy="64" rx="4" ry="7" transform="rotate(-20 46 64)" fill="#FFFFFF" opacity="0.45"/>
</svg>`,
        floatingBadgeSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="40" cy="40" r="26" fill="#EC4899"/>
  <circle cx="24" cy="24" r="9" fill="#F59E0B"/>
  <circle cx="60" cy="26" r="7" fill="#06B6D4"/>
  <circle cx="58" cy="58" r="8" fill="#8B5CF6"/>
</svg>`,
      };

    case 'eid':
      return {
        // 3D Golden Crescent Moon & Glowing Fanoos
        primarySvg: `<svg viewBox="0 0 180 175" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opEidGold" cx="30%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="55%" stop-color="#D4A017"/>
      <stop offset="100%" stop-color="#854D0E"/>
    </radialGradient>
  </defs>
  <circle cx="88" cy="86" r="64" fill="#FDE047" opacity="0.16"/>
  <path d="M108 24 C66 24 34 56 34 96 C34 136 66 164 108 160 C82 148 70 124 70 96 C70 64 84 38 108 24 Z" fill="url(#opEidGold)"/>
  <path d="M126 42 L131 56 L146 57 L134 66 L138 80 L126 72 L114 80 L118 66 L106 57 L121 56 Z" fill="#FEF08A"/>
  <circle cx="146" cy="108" r="6" fill="#FEF08A" opacity="0.85"/>
  <circle cx="122" cy="126" r="4.5" fill="#FDE047" opacity="0.75"/>
</svg>`,
        secondarySvg: `<svg viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <line x1="55" y1="6" x2="55" y2="24" stroke="#FDE047" stroke-width="3"/>
  <path d="M36 32 Q55 16 74 32 L82 88 L28 88 Z" fill="#0F6A4A" stroke="#FDE047" stroke-width="3"/>
  <ellipse cx="55" cy="60" rx="14" ry="18" fill="#FEF08A" opacity="0.8"/>
  <rect x="34" y="88" width="42" height="12" rx="4" fill="#D4A017"/>
</svg>`,
        floatingBadgeSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M40 8 L48 31 L72 34 L53 49 L59 72 L40 59 L21 72 L27 49 L8 34 L32 31 Z" fill="#FDE047"/>
</svg>`,
      };

    case 'valentine':
    case 'mothers_day':
      return {
        primarySvg: `<svg viewBox="0 0 180 170" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opHeart3d" cx="32%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FDA4AF"/>
      <stop offset="40%" stop-color="#E11D48"/>
      <stop offset="100%" stop-color="#881337"/>
    </radialGradient>
  </defs>
  <ellipse cx="90" cy="156" rx="48" ry="9" fill="rgba(0,0,0,0.2)"/>
  <path d="M90 148 C90 148 24 106 24 58 C24 32 45 16 67 16 C80 16 88 24 90 32 C92 24 100 16 113 16 C135 16 156 32 156 58 C156 106 90 148 90 148 Z" fill="url(#opHeart3d)"/>
  <ellipse cx="56" cy="48" rx="12" ry="20" transform="rotate(-28 56 48)" fill="#FFFFFF" opacity="0.38"/>
</svg>`,
        secondarySvg: `<svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="20" y="42" width="70" height="50" rx="10" fill="#BE123C"/>
  <rect x="48" y="42" width="14" height="50" fill="#FDE047"/>
  <rect x="20" y="60" width="70" height="12" fill="#FDE047"/>
  <path d="M55 42 C38 22 24 30 34 42 Z" fill="#FDE047"/>
  <path d="M55 42 C72 22 86 30 76 42 Z" fill="#FDE047"/>
</svg>`,
        floatingBadgeSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M40 66 C40 66 12 48 12 29 C12 18 21 11 30 11 C36 11 39 15 40 18 C41 15 44 11 50 11 C59 11 68 18 68 29 C68 48 40 66 40 66 Z" fill="#FB7185"/>
</svg>`,
      };

    default:
      // Rakhi, Janmashtami, Independence Day, New Year — 3D Royal Starburst Medallion & Gift Box
      return {
        primarySvg: `<svg viewBox="0 0 180 175" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opStarGold" cx="35%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </radialGradient>
  </defs>
  <circle cx="90" cy="86" r="64" fill="#FDE047" opacity="0.18"/>
  <path d="M90 12 L106 60 L158 62 L117 94 L132 146 L90 116 L48 146 L63 94 L22 62 L74 60 Z" fill="url(#opStarGold)"/>
  <circle cx="90" cy="84" r="24" fill="#FFFBEB" opacity="0.45"/>
</svg>`,
        secondarySvg: `<svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="20" y="42" width="70" height="50" rx="10" fill="#B81D53"/>
  <rect x="48" y="42" width="14" height="50" fill="#FDE047"/>
  <path d="M55 42 C38 22 24 30 34 42 Z" fill="#FDE047"/>
  <path d="M55 42 C72 22 86 30 76 42 Z" fill="#FDE047"/>
</svg>`,
        floatingBadgeSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M40 8 L47 33 L72 40 L47 47 L40 72 L33 47 L8 40 L33 33 Z" fill="#FDE047"/>
</svg>`,
      };
  }
}

/**
 * Generates the top hanging 3D festive garland (twinkling Christmas fairy lights,
 * Diwali marigold & diya toran, Eid crescents, Holi color bunting, etc.).
 */
export function buildFestivalGarlandHtml(preset: FestivalThemePreset): string {
  return buildInteractive3DStringLightsHtml(preset.id, preset.palette);
}

/**
 * Generates rich festive particles (real 6-point snowflakes for Christmas,
 * glowing gold embers for Diwali, colorful gulal splashes for Holi, hearts for Valentine's, etc.).
 */
export function buildFestivalParticlesHtml(preset: FestivalThemePreset): string {
  const p = preset.palette;
  const count = preset.effectStyle === 'snow' ? 20 : 14;
  const items: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const left = Math.round(((i * 9.7 + 3.5) % 94) + 3);
    const dur = (8.5 + (i % 6) * 1.4).toFixed(1);
    const delay = ((i % 8) * 0.85).toFixed(1);
    const mobileHiddenCls = i >= 12 ? ' op-snow-desktop-only' : '';

    if (preset.effectStyle === 'snow') {
      const layer = i % 3; // 0 = foreground crisp crystal, 1 = mid crystal, 2 = soft snow orb
      if (layer === 0) {
        const size = 16 + (i % 3) * 4;
        items.push(
          `<span class="op-fest-particle op-fest-snow op-snow-layer-near${mobileHiddenCls}" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${(8.2 + (i % 4) * 1.3).toFixed(1)}s;animation-delay:${delay}s;">` +
            `<svg viewBox="0 0 28 28" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"><path d="M14 2v24M2 14h24M5.5 5.5l17 17M22.5 5.5l-17 17M14 6l-2.4-2M14 6l2.4-2M14 22l-2.4 2M14 22l2.4 2"/><circle cx="14" cy="14" r="2" fill="#E0F2FE" stroke="none"/></svg>` +
          `</span>`
        );
      } else if (layer === 1) {
        const size = 11 + (i % 3) * 3;
        items.push(
          `<span class="op-fest-particle op-fest-snow op-snow-layer-mid${mobileHiddenCls}" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;">` +
            `<svg viewBox="0 0 24 24" fill="none" stroke="#E0F2FE" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1"/></svg>` +
          `</span>`
        );
      } else {
        const size = 5 + (i % 3) * 2;
        items.push(
          `<span class="op-fest-particle op-fest-snow-orb${mobileHiddenCls}" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${(11.0 + (i % 5) * 1.5).toFixed(1)}s;animation-delay:${delay}s;"></span>`
        );
      }
    } else if (preset.id === 'valentine' || preset.id === 'mothers_day') {
      const size = 12 + (i % 4) * 4;
      const col = i % 2 === 0 ? '#FB7185' : p.accent;
      items.push(
        `<span class="op-fest-particle op-fest-shape" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;">` +
          `<svg viewBox="0 0 24 24" fill="${col}"><path d="M12 21s-7-4.5-9.5-9C.8 8.7 2.8 5 6.5 5c2.1 0 3.7 1.1 5.5 3 1.8-1.9 3.4-3 5.5-3 3.7 0 5.7 3.7 4 7-2.5 4.5-9.5 9-9.5 9z"/></svg>` +
        `</span>`
      );
    } else if (preset.effectStyle === 'sparkle') {
      const size = 10 + (i % 4) * 4;
      const col = i % 2 === 0 ? '#FEF08A' : p.accent;
      items.push(
        `<span class="op-fest-particle op-fest-shape" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;">` +
          `<svg viewBox="0 0 24 24" fill="${col}"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>` +
        `</span>`
      );
    } else {
      const colors =
        preset.id === 'holi'
          ? ['#EC4899', '#F59E0B', '#06B6D4', '#8B5CF6', '#22C55E']
          : [p.accent, p.primary, '#FEF08A', '#FFFFFF'];
      const col = colors[i % colors.length];
      const size = 7 + (i % 4) * 3;
      items.push(
        `<span class="op-fest-particle" style="left:${left}%;width:${size}px;height:${size}px;background:${col};box-shadow:0 0 8px ${col};animation-duration:${dur}s;animation-delay:${delay}s;"></span>`
      );
    }
  }

  return items.join('');
}

/**
 * Generates the complete Auto-Product 3D Festive Hero Showcase Banner HTML
 * using real Shopify storefront products & 3D festive art objects.
 */
export function buildFestivalHeroBannerHtml(options: {
  preset: FestivalThemePreset;
  config: FestivalThemeConfig;
  products: FestivalFeaturedProduct[];
  shopName?: string;
}): string {
  const { preset, config, products, shopName } = options;
  if (!config.enabled || !config.showHeroBanner) return '';

  const p = preset.palette;
  const copy = getFestivalHeroCopy(preset.id, shopName);
  const art = buildFestival3DArtSvgs(preset.id);

  const productCardsHtml = products
    .slice(0, 3)
    .map((item, idx) => {
      const priceText = formatPriceInr(item.price, item.currency);
      const tiltClass = idx === 0 ? 'op-prod-card-1' : idx === 1 ? 'op-prod-card-2' : 'op-prod-card-3';
      return `<a href="/products/${encodeURIComponent(item.handle)}" class="op-fest-prod-card ${tiltClass}">
  <div class="op-fest-prod-img-wrap">
    <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="eager" />
    <span class="op-fest-prod-pill">${escapeHtml(preset.badgeText)}</span>
  </div>
  <div class="op-fest-prod-meta">
    <div class="op-fest-prod-title">${escapeHtml(item.title)}</div>
    <div class="op-fest-prod-row">
      <span class="op-fest-prod-price">${escapeHtml(priceText || 'Festive Pick')}</span>
      <span class="op-fest-prod-cta">Shop &rarr;</span>
    </div>
  </div>
</a>`;
    })
    .join('');

  const artStageHtml = config.show3DArticles
    ? `<div class="op-fest-3d-props" aria-hidden="true">
  <div class="op-3d-prop-primary">${art.primarySvg}</div>
  <div class="op-3d-prop-secondary">${art.secondarySvg}</div>
  <div class="op-3d-prop-float">${art.floatingBadgeSvg}</div>
</div>`
    : '';

  return `<section class="op-fest-hero-shell" data-festival="${escapeHtml(preset.id)}" style="--op-h-bg1:${p.headerBg};--op-h-bg2:${p.footerBg};--op-h-primary:${p.primary};--op-h-primary-text:${p.primaryText};--op-h-accent:${p.accent};--op-h-text:${p.headerText};--op-h-surface:${p.surfaceBg};--op-h-ink:${p.textColor};--op-h-border:${p.borderColor};">
  <div class="op-fest-hero-glow" aria-hidden="true"></div>
  <div class="op-fest-hero-inner">
    <div class="op-fest-hero-copy">
      <div class="op-fest-eyebrow">
        <span class="op-fest-eyebrow-dot"></span>
        <span>${escapeHtml(copy.eyebrow)}</span>
      </div>
      <h2 class="op-fest-headline">${escapeHtml(copy.headline)}</h2>
      <p class="op-fest-subhead">${escapeHtml(copy.subheadline)}</p>
      <div class="op-fest-actions">
        <a href="${escapeHtml(copy.ctaPath)}" class="op-fest-cta-btn">${escapeHtml(copy.ctaLabel)} &rarr;</a>
        <span class="op-fest-tagline">${escapeHtml(preset.name)}</span>
      </div>
      ${artStageHtml}
    </div>
    ${
      productCardsHtml
        ? `<div class="op-fest-hero-products">
      <div class="op-fest-products-label">Auto-Picked ${escapeHtml(preset.shortName)} Bestsellers</div>
      <div class="op-fest-products-grid">${productCardsHtml}</div>
    </div>`
        : ''
    }
  </div>
</section>`;
}

/**
 * Generates scoped CSS for the 3D Hero Showcase Banner, Hanging Garland, and 3D Animations.
 */
export function buildFestivalShowcaseCss(
  preset: FestivalThemePreset,
  config: FestivalThemeConfig
): string {
  if (!config.enabled) return '';
  const p = preset.palette;
  const bg3d = getFestival3DBackgroundSpec(preset.id);
  const use3DBg = config.show3DBackground !== false;

  const darkCanvasContrastCss = bg3d.isDarkCanvas
    ? `
/* High-Contrast Snow-White Typography over Dark Festive Sky + Crisp Dark Ink Inside Light Cards & Surfaces */
main#MainContent h1,
main#MainContent h2,
main#MainContent h3,
main#MainContent .title,
main#MainContent .collection__title h2,
main#MainContent .collection__title .title,
main#MainContent .title-wrapper-with-link h2,
main#MainContent .title-wrapper-with-link a,
main#MainContent .collection__view-all a,
main#MainContent .collection__description,
main#MainContent .slider-counter,
main#MainContent .slider-button,
main#MainContent .facets__heading,
main#MainContent .facets__summary,
main#MainContent .facets__summary span,
main#MainContent .facets__summary svg,
main#MainContent .facet-filters__label,
main#MainContent .facet-filters__label label,
main#MainContent .product-count__text,
main#MainContent .mobile-facets__open,
main#MainContent .mobile-facets__open span,
main#MainContent .mobile-facets__open svg,
main#MainContent .pagination__item,
main#MainContent .pagination__item svg,
main#MainContent .breadcrumbs,
main#MainContent .breadcrumbs a,
main#MainContent .title-wrapper-with-link p,
main#MainContent .rte:not(.card .rte):not(.product__info-wrapper .rte):not(.rich-text__blocks .rte) {
  color: #FFFDF7 !important;
  text-shadow: 0 2px 12px rgba(4, 15, 24, 0.58) !important;
}

main#MainContent .cart__contents,
main#MainContent .cart__footer,
main#MainContent .customer,
main#MainContent .contact {
  background: ${bg3d.cardTintBg} !important;
  border: 1.5px solid ${p.borderColor} !important;
  border-radius: 16px !important;
  padding: 18px !important;
}

main#MainContent .card,
main#MainContent .card h1,
main#MainContent .card h2,
main#MainContent .card h3,
main#MainContent .card .card__heading,
main#MainContent .card .card__heading a,
main#MainContent .card .price,
main#MainContent .card .price-item,
main#MainContent .card .caption-with-letter-spacing,
main#MainContent .card p,
main#MainContent .card span:not(.badge),
main#MainContent .banner__box,
main#MainContent .banner__box h1,
main#MainContent .banner__box h2,
main#MainContent .banner__box p,
main#MainContent .banner__box span,
main#MainContent .multicolumn-card h3,
main#MainContent .multicolumn-card p,
main#MainContent .multicolumn-card a,
main#MainContent .rich-text__blocks h1,
main#MainContent .rich-text__blocks h2,
main#MainContent .rich-text__blocks h3,
main#MainContent .rich-text__blocks p,
main#MainContent .rich-text__blocks a:not(.button),
main#MainContent .collection-hero h1,
main#MainContent .collection-hero p,
main#MainContent .collection-hero .collection-hero__description,
main#MainContent .product__info-wrapper,
main#MainContent .product__info-wrapper h1,
main#MainContent .product__info-wrapper h2,
main#MainContent .product__info-wrapper h3,
main#MainContent .product__info-wrapper .price-item,
main#MainContent .product__info-wrapper .product__description,
main#MainContent .product__info-wrapper .product__text,
main#MainContent .product__info-wrapper .product__tax,
main#MainContent .product__info-wrapper .broomies-usp,
main#MainContent .product__info-wrapper .broomies-usp span,
main#MainContent .product__info-wrapper .cake-offer-box,
main#MainContent .product__info-wrapper .cake-offer-box b,
main#MainContent .product__info-wrapper .benefits-grid,
main#MainContent .product__info-wrapper .benefits-grid *,
main#MainContent .product__info-wrapper .accordion__title,
main#MainContent .product__info-wrapper .accordion__content,
main#MainContent .product__info-wrapper .product-description-toggle,
main#MainContent .product__info-wrapper .share-button__button,
main#MainContent .product__info-wrapper p,
main#MainContent .product__info-wrapper li,
main#MainContent .product__info-wrapper b,
main#MainContent .product__info-wrapper strong,
main#MainContent .product__info-wrapper i,
main#MainContent .product__info-wrapper em,
main#MainContent .product__info-wrapper small,
main#MainContent .product__info-wrapper label,
main#MainContent .product__info-wrapper a:not(.button),
main#MainContent .product__info-wrapper span:not(.badge):not(.button span),
main#MainContent .product__info-wrapper .quantity__button,
main#MainContent .product__info-wrapper .quantity__button svg,
main#MainContent .product__info-wrapper .share-button__button svg,
main#MainContent .cart__contents h1,
main#MainContent .cart__contents h2,
main#MainContent .cart__contents h3,
main#MainContent .cart__contents p,
main#MainContent .cart__contents a:not(.button),
main#MainContent .cart__contents span:not(.badge):not(.button span),
main#MainContent .cart__contents td,
main#MainContent .cart__contents th,
main#MainContent .cart__contents dt,
main#MainContent .cart__contents dd,
main#MainContent .cart__contents label,
main#MainContent .cart__contents input,
main#MainContent .cart__contents .quantity__button,
main#MainContent .cart__contents .quantity__button svg,
main#MainContent .cart__contents .cart-remove-button,
main#MainContent .cart__contents .cart-remove-button svg,
main#MainContent .cart__footer h2,
main#MainContent .cart__footer p,
main#MainContent .cart__footer small,
main#MainContent .cart__footer span:not(.button span),
main#MainContent .customer h1,
main#MainContent .customer h2,
main#MainContent .customer p,
main#MainContent .customer a:not(.button),
main#MainContent .customer label,
main#MainContent .contact h1,
main#MainContent .contact h2,
main#MainContent .contact p,
main#MainContent .contact label {
  color: ${p.textColor} !important;
  text-shadow: none !important;
}
main#MainContent .product__info-wrapper .product-form__input input[type="radio"] + label {
  background: #FFFFFF !important;
  color: ${p.textColor} !important;
  border-color: ${p.borderColor} !important;
}
main#MainContent .product__info-wrapper .product-form__input input[type="radio"]:checked + label {
  background: ${p.primary} !important;
  color: ${p.primaryText} !important;
  border-color: ${p.primary} !important;
}
main#MainContent .product__info-wrapper .quantity__input,
main#MainContent .product__info-wrapper input:not([type="checkbox"]):not([type="radio"]),
main#MainContent .product__info-wrapper select,
main#MainContent .product__info-wrapper textarea {
  color: ${p.textColor} !important;
  background-color: #FFFFFF !important;
}
`
    : '';

  const bg3dCss = use3DBg
    ? `
/* Full-Website 3D Animated Festive Scenic Background & 3D Depth Color Palette */
@keyframes opBg3dDriftA {
  0%, 100% { transform: translate3d(0px, 0px, 0px) scale(1); }
  50% { transform: translate3d(36px, -28px, 32px) scale(1.08); }
}
@keyframes opBg3dDriftB {
  0%, 100% { transform: translate3d(0px, 0px, 0px) scale(1.03); }
  50% { transform: translate3d(-40px, 26px, 24px) scale(0.94); }
}
@keyframes opBg3dDriftC {
  0%, 100% { transform: translate3d(0px, 0px, 0px) scale(0.96); }
  50% { transform: translate3d(24px, 30px, 40px) scale(1.1); }
}
@keyframes opBg3dAurora {
  0%, 100% { transform: translate3d(-3%, -1%, 0) scale(1.04); opacity: 0.85; }
  50% { transform: translate3d(3%, 2%, 0) scale(1.12); opacity: 1; }
}
@keyframes opXmasStarTwinkle {
  0%, 100% { opacity: 0.35; transform: scale(0.75); }
  50% { opacity: 1; transform: scale(1.25); }
}
@keyframes opXmasSwayA {
  0%, 100% { transform: rotate(-3.2deg); }
  50% { transform: rotate(3.6deg); }
}
@keyframes opXmasSwayB {
  0%, 100% { transform: rotate(3.4deg); }
  50% { transform: rotate(-3.2deg); }
}
@keyframes opXmasSleighGlide {
  0% { transform: translate3d(-24vw, 16px, 0) rotate(-4deg); opacity: 0; }
  8% { opacity: 0.92; }
  50% { transform: translate3d(42vw, -18px, 0) rotate(2deg); opacity: 0.95; }
  92% { opacity: 0.9; }
  100% { transform: translate3d(114vw, -4px, 0) rotate(-3deg); opacity: 0; }
}
@keyframes opXmasTreeLight {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

:root,
html,
body,
body.gradient {
  background: ${bg3d.baseGradient} !important;
  background-color: ${bg3d.isDarkCanvas ? '#081B29' : p.pageBg} !important;
  --gradient-background: transparent !important;
}

main#MainContent,
.content-for-layout,
main#MainContent .shopify-section,
main#MainContent .shopify-section > .gradient,
main#MainContent .shopify-section > .color-scheme-1,
main#MainContent .shopify-section > .color-scheme-2,
main#MainContent .color-scheme-1.gradient,
main#MainContent .color-scheme-2.gradient,
main#MainContent .collection.gradient,
main#MainContent .collection-list-wrapper.gradient,
main#MainContent .rich-text.gradient,
main#MainContent .multicolumn.gradient,
main#MainContent .section-template--padding {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  position: relative;
  z-index: 1;
}

#orderpulse-festival-bg-3d {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100lvh;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  contain: layout style paint;
}
#orderpulse-festival-bg-3d .op-bg3d-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
#orderpulse-festival-bg-3d .op-bg3d-aurora {
  position: absolute;
  inset: -12%;
  opacity: 0.78;
  animation: opBg3dAurora 20s ease-in-out infinite;
  will-change: transform;
}
#orderpulse-festival-bg-3d .op-bg3d-orb {
  position: absolute;
  border-radius: 999px;
  opacity: ${bg3d.isDarkCanvas ? '0.42' : '0.48'};
}
#orderpulse-festival-bg-3d .op-bg3d-orb-1 {
  width: 320px;
  height: 320px;
  top: -60px;
  left: -50px;
  animation: opBg3dDriftA 18s ease-in-out infinite;
}
#orderpulse-festival-bg-3d .op-bg3d-orb-2 {
  width: 380px;
  height: 380px;
  top: 10%;
  right: -85px;
  animation: opBg3dDriftB 20s ease-in-out infinite;
}
#orderpulse-festival-bg-3d .op-bg3d-orb-3 {
  width: 280px;
  height: 280px;
  bottom: 12%;
  left: 14%;
  animation: opBg3dDriftC 16s ease-in-out infinite;
}
#orderpulse-festival-bg-3d .op-bg3d-orb-4 {
  width: 240px;
  height: 240px;
  bottom: 18%;
  right: 16%;
  animation: opBg3dDriftA 19s ease-in-out infinite reverse;
}

/* Christmas & Festival Authentic Scenic Layers */
#orderpulse-festival-bg-3d .op-xmas-star {
  position: absolute;
  border-radius: 999px;
  background: radial-gradient(circle, #FFFFFF 0%, #FEF08A 45%, transparent 72%);
  animation: opXmasStarTwinkle 3.4s ease-in-out infinite;
}
#orderpulse-festival-bg-3d .op-xmas-moon {
  position: absolute;
  top: 17%;
  right: 7%;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  background: radial-gradient(circle at 36% 34%, #FFFBEB 0%, #FEF08A 58%, #FDE047 100%);
  box-shadow: 0 0 36px rgba(254, 240, 138, 0.42);
  opacity: 0.92;
}
#orderpulse-festival-bg-3d .op-xmas-sleigh {
  position: absolute;
  top: 19%;
  left: 0;
  width: 240px;
  height: 66px;
  animation: opXmasSleighGlide 28s linear infinite;
  will-change: transform;
}
#orderpulse-festival-bg-3d .op-xmas-sleigh svg {
  width: 100%;
  height: 100%;
  display: block;
}
#orderpulse-festival-bg-3d .op-xmas-corner {
  position: absolute;
  top: clamp(92px, 11vh, 136px);
  width: clamp(175px, 19vw, 275px);
  height: auto;
  opacity: 0.96;
}
#orderpulse-festival-bg-3d .op-xmas-corner-left {
  left: 0;
}
#orderpulse-festival-bg-3d .op-xmas-corner-right {
  right: 0;
}
#orderpulse-festival-bg-3d .op-xmas-sway-a {
  animation: opXmasSwayA 5.6s ease-in-out infinite;
}
#orderpulse-festival-bg-3d .op-xmas-sway-b {
  animation: opXmasSwayB 6.4s ease-in-out infinite;
}
#orderpulse-festival-bg-3d .op-xmas-forest {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: clamp(160px, 27vh, 285px);
  display: block;
}
#orderpulse-festival-bg-3d .op-xmas-twinkle {
  animation: opXmasTreeLight 2.4s ease-in-out infinite;
}

@media (max-width: 768px) {
  #orderpulse-festival-bg-3d .op-bg3d-aurora,
  #orderpulse-festival-bg-3d .op-bg3d-orb,
  #orderpulse-festival-bg-3d .op-xmas-star,
  #orderpulse-festival-bg-3d .op-xmas-sway-a,
  #orderpulse-festival-bg-3d .op-xmas-sway-b,
  #orderpulse-festival-bg-3d .op-xmas-twinkle {
    animation: none !important;
    will-change: auto !important;
  }
  #orderpulse-festival-bg-3d .op-xmas-sleigh {
    display: none !important;
  }
  #orderpulse-festival-bg-3d .op-xmas-corner {
    width: 138px;
    opacity: 0.85;
  }
  #orderpulse-festival-bg-3d .op-xmas-moon {
    width: 62px;
    height: 62px;
    top: 6%;
    right: 8%;
  }
  #orderpulse-festival-bg-3d .op-xmas-forest {
    height: 150px;
  }
}

/* Crisp 3D Festive Cards & Glossy Buttons (Zero backdrop-filter GPU bottleneck, buttery hover on desktop) */
main#MainContent .card,
main#MainContent .card-wrapper .card,
main#MainContent .product-card,
main#MainContent .product-grid-item,
main#MainContent .multicolumn-card,
main#MainContent .collection-hero,
main#MainContent .rich-text__blocks,
main#MainContent .product__info-wrapper {
  background: ${bg3d.cardTintBg} !important;
  border: 1.5px solid ${p.borderColor} !important;
  border-top: 3px solid ${p.accent} !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  opacity: 1 !important;
  box-shadow: 0 12px 26px -10px ${bg3d.glowShadow}, 0 3px 8px -2px rgba(0, 0, 0, 0.12) !important;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
}
main#MainContent .product__info-wrapper {
  background: rgba(255, 253, 250, 0.98) !important;
  padding: 22px 24px !important;
  opacity: 1 !important;
}
@media (max-width: 768px) {
  main#MainContent .product__info-wrapper {
    padding: 16px !important;
  }
}
main#MainContent .card .card__content,
main#MainContent .card-wrapper .card .card__content {
  padding: 12px 14px 14px !important;
}
@media (hover: hover) and (pointer: fine) {
  main#MainContent .card:hover,
  main#MainContent .card-wrapper:hover .card,
  main#MainContent .product-card:hover,
  main#MainContent .multicolumn-card:hover {
    transform: translate3d(0, -4px, 0) !important;
  }
}

${darkCanvasContrastCss}

.button,
.button--primary,
button[name="add"],
.product-form__submit,
.cart__checkout-button,
a.button--primary {
  background: linear-gradient(180deg, ${p.primary} 0%, ${p.primaryHover} 100%) !important;
  color: ${p.primaryText} !important;
  box-shadow: 0 4px 0 ${bg3d.btnDepth}, 0 8px 18px ${bg3d.glowShadow} !important;
  border-radius: 10px !important;
}
@media (hover: hover) and (pointer: fine) {
  .button:hover,
  .button--primary:hover,
  button[name="add"]:hover,
  .product-form__submit:hover,
  .cart__checkout-button:hover {
    transform: translate3d(0, -2px, 0) !important;
  }
}

body .header-wrapper,
body .shopify-section-group-header-group .header-wrapper,
body .shopify-section-group-header-group .header-wrapper.gradient,
body header.header {
  background: linear-gradient(135deg, ${p.headerBg} 0%, ${p.footerBg} 50%, ${p.headerBg} 100%) !important;
  box-shadow: 0 6px 20px ${bg3d.glowShadow} !important;
}
body footer.footer,
body .shopify-section-group-footer-group,
body .shopify-section-group-footer-group footer.footer {
  background: linear-gradient(160deg, ${p.headerBg} 0%, ${p.footerBg} 75%) !important;
  position: relative;
  z-index: 1;
}
`
    : '';

  return `${bg3dCss}
/* OrderPulse Silky-Smooth 60fps Festive Animations, Hanging Lights & Hero Banner */
@keyframes op3dFloatPrimary {
  0%, 100% { transform: translate3d(0, 0px, 0); }
  50% { transform: translate3d(0, -7px, 0); }
}
@keyframes op3dFloatSecondary {
  0%, 100% { transform: translate3d(0, 1px, 0); }
  50% { transform: translate3d(0, -6px, 0); }
}
@keyframes op3dOrbitBadge {
  0%, 100% { transform: translate3d(0, 0px, 0); }
  50% { transform: translate3d(0, -7px, 0); }
}
@keyframes opFlameFlicker {
  0%, 100% { transform: scaleY(1); transform-origin: 90px 82px; }
  50% { transform: scaleY(1.06); transform-origin: 90px 82px; }
}
@keyframes opLightTwinkle {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes opSnowDrift {
  0% { transform: translate3d(0, -24px, 0) rotate(0deg); opacity: 0; }
  12% { opacity: 0.88; }
  50% { transform: translate3d(18px, 52vh, 0) rotate(180deg); opacity: 0.84; }
  88% { opacity: 0.6; }
  100% { transform: translate3d(-10px, 106vh, 0) rotate(360deg); opacity: 0; }
}
@keyframes opSnowDriftNear {
  0% { transform: translate3d(0, -28px, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.92; }
  50% { transform: translate3d(-20px, 52vh, 0) rotate(180deg); opacity: 0.88; }
  88% { opacity: 0.65; }
  100% { transform: translate3d(16px, 106vh, 0) rotate(360deg); opacity: 0; }
}
@keyframes opSnowOrbDrift {
  0% { transform: translate3d(0, -16px, 0); opacity: 0; }
  15% { opacity: 0.68; }
  50% { transform: translate3d(12px, 52vh, 0); opacity: 0.6; }
  88% { opacity: 0.4; }
  100% { transform: translate3d(-10px, 106vh, 0); opacity: 0; }
}

#orderpulse-festival-garland {
  position: relative;
  z-index: 2147482400;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
  background: linear-gradient(180deg, ${p.headerBg} 0%, rgba(0, 0, 0, 0) 100%);
  height: 30px;
}
#orderpulse-festival-garland .op-garland-wire {
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  width: 100%;
  border-top: 2px dashed rgba(255, 255, 255, 0.35);
}
#orderpulse-festival-garland .op-garland-drop {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}
#orderpulse-festival-garland .op-garland-bulb {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: block;
  animation: opLightTwinkle 2.2s ease-in-out infinite;
}

#orderpulse-festival-hero {
  width: 100%;
  max-width: 1280px;
  margin: 16px auto 22px;
  padding: 0 16px;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
#orderpulse-festival-hero .op-fest-hero-shell {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: radial-gradient(circle at 18% 15%, var(--op-h-primary) 0%, var(--op-h-bg1) 50%, var(--op-h-bg2) 100%);
  color: var(--op-h-text);
  border: 2px solid var(--op-h-accent);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 250, 230, 0.35);
  padding: 26px 28px;
  perspective: 1100px;
}
#orderpulse-festival-hero .op-fest-hero-shell::after {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(254, 240, 138, 0.85) 50%, transparent 100%);
  pointer-events: none;
}
#orderpulse-festival-hero .op-fest-hero-glow {
  position: absolute;
  inset: -40% -20% auto auto;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  background: radial-gradient(circle, var(--op-h-accent) 0%, transparent 70%);
  opacity: 0.24;
  pointer-events: none;
}
#orderpulse-festival-hero .op-fest-hero-inner {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.25fr);
  gap: 24px;
  align-items: center;
}
#orderpulse-festival-hero .op-fest-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--op-h-text) !important;
}
#orderpulse-festival-hero .op-fest-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--op-h-accent);
  box-shadow: 0 0 10px var(--op-h-accent);
}
#orderpulse-festival-hero .op-fest-headline {
  margin: 12px 0 8px;
  font-size: clamp(22px, 2.8vw, 34px);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--op-h-text) !important;
}
#orderpulse-festival-hero .op-fest-subhead {
  margin: 0 0 16px;
  font-size: 13.5px;
  line-height: 1.5;
  opacity: 0.92;
  color: var(--op-h-text) !important;
  max-width: 48ch;
}
#orderpulse-festival-hero .op-fest-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
#orderpulse-festival-hero .op-fest-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 20px;
  border-radius: 10px;
  background: var(--op-h-accent) !important;
  color: ${p.bannerText} !important;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  transition: transform 0.2s ease, filter 0.2s ease;
}
#orderpulse-festival-hero .op-fest-cta-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
}
#orderpulse-festival-hero .op-fest-tagline {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.85;
  color: var(--op-h-text) !important;
}
#orderpulse-festival-hero .op-fest-3d-props {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 16px;
  transform-style: preserve-3d;
}
#orderpulse-festival-hero .op-3d-prop-primary {
  width: 108px;
  height: 108px;
  flex-shrink: 0;
  animation: op3dFloatPrimary 5.8s ease-in-out infinite;
}
#orderpulse-festival-hero .op-3d-prop-secondary {
  width: 74px;
  height: 74px;
  flex-shrink: 0;
  animation: op3dFloatSecondary 5.0s ease-in-out infinite;
}
#orderpulse-festival-hero .op-3d-prop-float {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  margin-bottom: 18px;
  animation: op3dOrbitBadge 4.4s ease-in-out infinite;
}
#orderpulse-festival-hero .op-3d-prop-primary svg,
#orderpulse-festival-hero .op-3d-prop-secondary svg,
#orderpulse-festival-hero .op-3d-prop-float svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
#orderpulse-festival-hero .op-3d-flame {
  animation: opFlameFlicker 1.6s ease-in-out infinite;
}
#orderpulse-festival-hero .op-fest-products-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
  opacity: 0.9;
  color: var(--op-h-text) !important;
}
#orderpulse-festival-hero .op-fest-products-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
#orderpulse-festival-hero .op-fest-prod-card {
  display: flex;
  flex-direction: column;
  background: var(--op-h-surface) !important;
  color: var(--op-h-ink) !important;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid rgba(254, 240, 138, 0.48);
  text-decoration: none !important;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.85);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  transform-style: preserve-3d;
}
@media (hover: hover) and (pointer: fine) {
  #orderpulse-festival-hero .op-fest-prod-card:hover {
    transform: translate3d(0, -5px, 0) rotateX(2deg);
  }
}
#orderpulse-festival-hero .op-fest-prod-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: ${p.surfaceAltBg};
  overflow: hidden;
}
#orderpulse-festival-hero .op-fest-prod-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
#orderpulse-festival-hero .op-fest-prod-pill {
  position: absolute;
  top: 7px;
  left: 7px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--op-h-accent);
  color: ${p.bannerText};
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
#orderpulse-festival-hero .op-fest-prod-meta {
  padding: 9px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}
#orderpulse-festival-hero .op-fest-prod-title {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--op-h-ink) !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
#orderpulse-festival-hero .op-fest-prod-row {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
#orderpulse-festival-hero .op-fest-prod-price {
  font-size: 12px;
  font-weight: 800;
  color: var(--op-h-primary) !important;
}
#orderpulse-festival-hero .op-fest-prod-cta {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--op-h-primary) !important;
}
.op-fest-snow,
.op-fest-shape {
  background: transparent !important;
  box-shadow: none !important;
  animation-name: opSnowDrift !important;
  will-change: transform;
  backface-visibility: hidden;
}
.op-fest-snow.op-snow-layer-near {
  animation-name: opSnowDriftNear !important;
}
.op-fest-snow.op-snow-layer-mid {
  opacity: 0.82;
}
.op-fest-snow-orb {
  border-radius: 999px !important;
  background: radial-gradient(circle at 35% 35%, #FFFFFF 0%, #DBEAFE 70%, rgba(186, 230, 253, 0) 100%) !important;
  box-shadow: none !important;
  animation-name: opSnowOrbDrift !important;
  will-change: transform;
  backface-visibility: hidden;
}
.op-fest-snow svg,
.op-fest-shape svg {
  width: 100%;
  height: 100%;
  display: block;
}

@media (max-width: 900px) {
  #orderpulse-festival-hero .op-fest-hero-inner {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  #orderpulse-festival-hero .op-fest-hero-shell {
    padding: 20px 16px;
  }
  #orderpulse-festival-hero .op-fest-products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  #orderpulse-festival-hero .op-3d-prop-primary {
    width: 72px;
    height: 72px;
  }
  #orderpulse-festival-hero .op-3d-prop-secondary {
    width: 52px;
    height: 52px;
  }
}
@media (max-width: 768px) {
  .op-snow-desktop-only {
    display: none !important;
  }
  #orderpulse-festival-hero .op-3d-prop-primary,
  #orderpulse-festival-hero .op-3d-prop-secondary,
  #orderpulse-festival-hero .op-3d-prop-float {
    animation: none !important;
  }
}
@media (max-width: 520px) {
  #orderpulse-festival-hero .op-fest-products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  #orderpulse-festival-hero .op-prod-card-3 {
    display: none;
  }
}
`.trim();
}
