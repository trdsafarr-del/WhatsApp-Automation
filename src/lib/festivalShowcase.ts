import type {
  FestivalPresetId,
  FestivalThemeConfig,
  FestivalThemePreset,
} from './festivalThemes';

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
        articleLabel: '3D Christmas Tree, Glowing Ornaments & Gift Boxes',
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
  const p = preset.palette;
  const bulbColors =
    preset.id === 'christmas'
      ? ['#EF4444', '#FDE047', '#22C55E', '#38BDF8', '#F43F5E', '#FBBF24']
      : preset.id === 'holi'
        ? ['#EC4899', '#F59E0B', '#06B6D4', '#8B5CF6', '#22C55E', '#F43F5E']
        : preset.id === 'independence_day'
          ? ['#FF6F00', '#FFFFFF', '#138808']
          : [p.accent, '#FEF08A', p.primary, '#FFFFFF'];

  const nodes: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const col = bulbColors[i % bulbColors.length];
    const delay = ((i % 6) * 0.28).toFixed(2);
    const drop = i % 2 === 0 ? 10 : 16;
    nodes.push(
      `<span class="op-garland-drop" style="padding-top:${drop}px;animation-delay:${delay}s;">` +
        `<span class="op-garland-bulb" style="background:${col};box-shadow:0 0 12px ${col};animation-delay:${delay}s;"></span>` +
      `</span>`
    );
  }

  return `<div class="op-garland-wire" aria-hidden="true">${nodes.join('')}</div>`;
}

/**
 * Generates rich festive particles (real 6-point snowflakes for Christmas,
 * glowing gold embers for Diwali, colorful gulal splashes for Holi, hearts for Valentine's, etc.).
 */
export function buildFestivalParticlesHtml(preset: FestivalThemePreset): string {
  const p = preset.palette;
  const count = 18;
  const items: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const left = Math.round(((i * 5.7 + 3) % 94) + 3);
    const dur = (7.5 + (i % 6) * 1.5).toFixed(1);
    const delay = ((i % 7) * 0.85).toFixed(1);

    if (preset.effectStyle === 'snow') {
      const size = 14 + (i % 4) * 5;
      items.push(
        `<span class="op-fest-particle op-fest-snow" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;">` +
          `<svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1"/></svg>` +
        `</span>`
      );
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

  return `
/* OrderPulse 3D Festive Animations, Hanging Lights & Auto-Product Hero Banner */
@keyframes op3dFloatPrimary {
  0%, 100% { transform: translate3d(0, 0px, 0) rotateY(-8deg) rotateZ(-1.5deg); }
  50% { transform: translate3d(0, -10px, 18px) rotateY(8deg) rotateZ(2deg); }
}
@keyframes op3dFloatSecondary {
  0%, 100% { transform: translate3d(0, 2px, 0) rotateY(10deg) rotateZ(2deg); }
  50% { transform: translate3d(0, -8px, 12px) rotateY(-10deg) rotateZ(-3deg); }
}
@keyframes op3dOrbitBadge {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-6deg) scale(1); }
  50% { transform: translate3d(0, -12px, 20px) rotate(8deg) scale(1.06); }
}
@keyframes opFlameFlicker {
  0%, 100% { transform: scaleY(1) skewX(0deg); transform-origin: 90px 82px; }
  35% { transform: scaleY(1.07) skewX(-2.5deg); transform-origin: 90px 82px; }
  70% { transform: scaleY(0.95) skewX(2.5deg); transform-origin: 90px 82px; }
}
@keyframes opLightTwinkle {
  0%, 100% { opacity: 0.55; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.18); }
}
@keyframes opSnowDrift {
  0% { transform: translate3d(0, -24px, 0) rotate(0deg); opacity: 0; }
  12% { opacity: 0.92; }
  50% { transform: translate3d(18px, 50vh, 0) rotate(180deg); opacity: 0.85; }
  88% { opacity: 0.72; }
  100% { transform: translate3d(-14px, 106vh, 0) rotate(360deg); opacity: 0; }
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
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.22);
  padding: 26px 28px;
  perspective: 1100px;
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
  animation: op3dFloatPrimary 5.2s ease-in-out infinite;
  filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.32));
}
#orderpulse-festival-hero .op-3d-prop-secondary {
  width: 74px;
  height: 74px;
  flex-shrink: 0;
  animation: op3dFloatSecondary 4.4s ease-in-out infinite;
  filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.28));
}
#orderpulse-festival-hero .op-3d-prop-float {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  margin-bottom: 18px;
  animation: op3dOrbitBadge 3.8s ease-in-out infinite;
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.25));
}
#orderpulse-festival-hero .op-3d-prop-primary svg,
#orderpulse-festival-hero .op-3d-prop-secondary svg,
#orderpulse-festival-hero .op-3d-prop-float svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
#orderpulse-festival-hero .op-3d-flame {
  animation: opFlameFlicker 1.3s ease-in-out infinite;
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
  perspective: 900px;
}
#orderpulse-festival-hero .op-fest-prod-card {
  display: flex;
  flex-direction: column;
  background: var(--op-h-surface) !important;
  color: var(--op-h-ink) !important;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  text-decoration: none !important;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.24);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
#orderpulse-festival-hero .op-fest-prod-card:hover {
  transform: translateY(-6px) rotateX(3deg) scale(1.02);
  box-shadow: 0 20px 36px rgba(0, 0, 0, 0.34);
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
