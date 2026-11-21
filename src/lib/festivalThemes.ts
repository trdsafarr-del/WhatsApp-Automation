import {
  type FestivalFeaturedProduct,
  buildFestival3DBackgroundHtml,
  buildFestivalGarlandHtml,
  buildFestivalHeroBannerHtml,
  buildFestivalParticlesHtml,
  buildFestivalShowcaseCss,
  selectBestFestivalProducts,
} from './festivalShowcase.js';
import {
  buildSantaRoamerCss,
  buildSantaRoamerHtml,
  buildSantaRoamerRuntimeJs,
} from './santaRoamer.js';
import {
  buildWinterCardSnowCss,
  buildWinterCardSnowRuntimeJs,
} from './winterCardSnow.js';

export type { FestivalFeaturedProduct };

export type FestivalPresetId =
  | 'diwali'
  | 'holi'
  | 'navratri'
  | 'raksha_bandhan'
  | 'eid'
  | 'janmashtami'
  | 'independence_day'
  | 'christmas'
  | 'new_year'
  | 'valentine'
  | 'mothers_day';

export type FestivalThemeId = 'auto' | FestivalPresetId;

export type FestivalThemeIntensity = 'subtle' | 'full';

export interface FestivalThemeConfig {
  enabled: boolean;
  selectedFestivalId: FestivalThemeId;
  showAnnouncementBar: boolean;
  customBannerText: string;
  enableFestiveEffects: boolean;
  showHeroBanner?: boolean;
  show3DArticles?: boolean;
  show3DBackground?: boolean;
  show3DCardSnow?: boolean;
  featuredProductHandles?: string[];
  intensity: FestivalThemeIntensity;
  updatedAt?: string;
}

export interface FestivalPalette {
  pageBg: string;
  surfaceBg: string;
  surfaceAltBg: string;
  textColor: string;
  mutedTextColor: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  headerBg: string;
  headerText: string;
  footerBg: string;
  footerText: string;
  bannerBg: string;
  bannerText: string;
  borderColor: string;
}

export interface FestivalThemePreset {
  id: FestivalPresetId;
  name: string;
  shortName: string;
  seasonLabel: string;
  tagline: string;
  defaultBannerText: string;
  badgeText: string;
  effectStyle: 'sparkle' | 'confetti' | 'snow' | 'petals';
  palette: FestivalPalette;
}

export const DEFAULT_FESTIVAL_THEME_CONFIG: FestivalThemeConfig = {
  enabled: false,
  selectedFestivalId: 'auto',
  showAnnouncementBar: true,
  customBannerText: '',
  enableFestiveEffects: true,
  showHeroBanner: true,
  show3DArticles: true,
  show3DBackground: true,
  show3DCardSnow: true,
  featuredProductHandles: [],
  intensity: 'full',
};

export const FESTIVAL_THEME_PRESETS: FestivalThemePreset[] = [
  {
    id: 'diwali',
    name: 'Diwali Festival of Lights',
    shortName: 'Diwali',
    seasonLabel: 'Oct – Nov',
    tagline: 'Royal maroon surfaces, warm diya gold buttons & festive glow',
    defaultBannerText: 'Happy Diwali! Fresh Festive Hampers & Mithai Boxes — Express Pan-India Delivery',
    badgeText: 'Diwali Special',
    effectStyle: 'sparkle',
    palette: {
      pageBg: '#FFF8EC',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#FDF0D5',
      textColor: '#2B140E',
      mutedTextColor: '#6E473B',
      primary: '#9A1B2F',
      primaryHover: '#7D1425',
      primaryText: '#FFF8EC',
      accent: '#D99100',
      accentSoft: '#FCE8B2',
      headerBg: '#5C0F1E',
      headerText: '#FFF4D6',
      footerBg: '#3D0914',
      footerText: '#F8DFC0',
      bannerBg: '#D99100',
      bannerText: '#2A0A0A',
      borderColor: '#EBC999',
    },
  },
  {
    id: 'holi',
    name: 'Holi Festival of Colors',
    shortName: 'Holi',
    seasonLabel: 'Mar',
    tagline: 'Vibrant gulal magenta, marigold amber & bright festive cards',
    defaultBannerText: 'Happy Holi! Celebrate with Fresh Festive Treats & Color-Special Gift Boxes',
    badgeText: 'Holi Edition',
    effectStyle: 'confetti',
    palette: {
      pageBg: '#FFF7FB',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#FCE7F3',
      textColor: '#26122B',
      mutedTextColor: '#6B4670',
      primary: '#C2185B',
      primaryHover: '#A0124A',
      primaryText: '#FFFFFF',
      accent: '#F59E0B',
      accentSoft: '#FEF3C7',
      headerBg: '#6A0DAD',
      headerText: '#FFFFFF',
      footerBg: '#3B0764',
      footerText: '#F5D0FE',
      bannerBg: '#EC4899',
      bannerText: '#FFFFFF',
      borderColor: '#F3B8D8',
    },
  },
  {
    id: 'navratri',
    name: 'Navratri & Durga Puja',
    shortName: 'Navratri',
    seasonLabel: 'Sep – Oct',
    tagline: 'Sindoor crimson, temple marigold & warm ivory backdrop',
    defaultBannerText: 'Shubh Navratri! Order Festive Hampers & Freshly Baked Celebration Boxes',
    badgeText: 'Navratri Pick',
    effectStyle: 'sparkle',
    palette: {
      pageBg: '#FFF7ED',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#FFEDD5',
      textColor: '#2E1109',
      mutedTextColor: '#7C412B',
      primary: '#C81E1E',
      primaryHover: '#A51616',
      primaryText: '#FFFBEB',
      accent: '#EA580C',
      accentSoft: '#FED7AA',
      headerBg: '#7F1D1D',
      headerText: '#FEF3C7',
      footerBg: '#450A0A',
      footerText: '#FDE68A',
      bannerBg: '#EA580C',
      bannerText: '#FFFFFF',
      borderColor: '#F7C59F',
    },
  },
  {
    id: 'raksha_bandhan',
    name: 'Raksha Bandhan',
    shortName: 'Rakhi',
    seasonLabel: 'Aug',
    tagline: 'Festive roseberry, silk gold & warm celebratory warmth',
    defaultBannerText: 'Happy Raksha Bandhan! Send Fresh Rakhi Gift Hampers Across India',
    badgeText: 'Rakhi Gift',
    effectStyle: 'petals',
    palette: {
      pageBg: '#FFF5F7',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#FFE4EA',
      textColor: '#2E1020',
      mutedTextColor: '#744058',
      primary: '#B81D53',
      primaryHover: '#961542',
      primaryText: '#FFFFFF',
      accent: '#D4941A',
      accentSoft: '#FEF0C7',
      headerBg: '#6B1235',
      headerText: '#FFF3E0',
      footerBg: '#420A20',
      footerText: '#F9D6E2',
      bannerBg: '#D4941A',
      bannerText: '#2A0A14',
      borderColor: '#F2BDD0',
    },
  },
  {
    id: 'eid',
    name: 'Eid Mubarak',
    shortName: 'Eid',
    seasonLabel: 'Mar – Jun',
    tagline: 'Royal emerald green, crescent gold & alabaster ivory',
    defaultBannerText: 'Eid Mubarak! Celebrate Together with Luxury Festive Gift Boxes & Sweet Treats',
    badgeText: 'Eid Special',
    effectStyle: 'sparkle',
    palette: {
      pageBg: '#F4FAF7',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#E1F4EA',
      textColor: '#0E241C',
      mutedTextColor: '#3C6254',
      primary: '#0F6A4A',
      primaryHover: '#0A5239',
      primaryText: '#FFFFFF',
      accent: '#C8962E',
      accentSoft: '#FAF0D1',
      headerBg: '#093E2B',
      headerText: '#F7E7B4',
      footerBg: '#06281C',
      footerText: '#D4EFE3',
      bannerBg: '#C8962E',
      bannerText: '#082418',
      borderColor: '#B8DFCE',
    },
  },
  {
    id: 'janmashtami',
    name: 'Krishna Janmashtami',
    shortName: 'Janmashtami',
    seasonLabel: 'Aug – Sep',
    tagline: 'Peacock sapphire blue, flute gold & soft lotus cream',
    defaultBannerText: 'Happy Janmashtami! Fresh Celebration Boxes & Handcrafted Sweet Hampers',
    badgeText: 'Janmashtami',
    effectStyle: 'sparkle',
    palette: {
      pageBg: '#F4F8FF',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#E3EEFF',
      textColor: '#0E1C36',
      mutedTextColor: '#455B82',
      primary: '#164B8A',
      primaryHover: '#0F3869',
      primaryText: '#FFFFFF',
      accent: '#D99B16',
      accentSoft: '#FEF3C7',
      headerBg: '#0D2B54',
      headerText: '#FDE68A',
      footerBg: '#081B36',
      footerText: '#D5E5FF',
      bannerBg: '#D99B16',
      bannerText: '#0B1A33',
      borderColor: '#BFD6F8',
    },
  },
  {
    id: 'independence_day',
    name: 'Independence & Republic Day',
    shortName: 'Tricolor',
    seasonLabel: 'Jan / Aug',
    tagline: 'Tricolor saffron, chakra navy & India green accents',
    defaultBannerText: 'Celebrating India! Enjoy Special Tricolor Festive Deals & Pan-India Delivery',
    badgeText: 'India Special',
    effectStyle: 'confetti',
    palette: {
      pageBg: '#FCFBF8',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#FFF3E4',
      textColor: '#121D33',
      mutedTextColor: '#4A5770',
      primary: '#138808',
      primaryHover: '#0E6B06',
      primaryText: '#FFFFFF',
      accent: '#FF6F00',
      accentSoft: '#FFE8D1',
      headerBg: '#0B2559',
      headerText: '#FFFFFF',
      footerBg: '#07193D',
      footerText: '#E2E8F0',
      bannerBg: '#FF6F00',
      bannerText: '#FFFFFF',
      borderColor: '#CBD5E1',
    },
  },
  {
    id: 'christmas',
    name: 'Merry Christmas',
    shortName: 'Christmas',
    seasonLabel: 'Dec',
    tagline: 'Winter pine green, holly berry red & crisp snow cream',
    defaultBannerText: 'Merry Christmas! Fresh Plum Cakes, Cookie Tins & Festive Gift Boxes Ready to Ship',
    badgeText: 'Christmas Special',
    effectStyle: 'snow',
    palette: {
      pageBg: '#FBF8F3',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#F3ECE1',
      textColor: '#1C241E',
      mutedTextColor: '#546158',
      primary: '#B31B2C',
      primaryHover: '#8F1322',
      primaryText: '#FFFFFF',
      accent: '#166534',
      accentSoft: '#DCFCE7',
      headerBg: '#11422A',
      headerText: '#FFF8EB',
      footerBg: '#0A2B1B',
      footerText: '#E2EFE7',
      bannerBg: '#B31B2C',
      bannerText: '#FFFFFF',
      borderColor: '#DFD4C3',
    },
  },
  {
    id: 'new_year',
    name: 'Happy New Year',
    shortName: 'New Year',
    seasonLabel: 'Dec – Jan',
    tagline: 'Midnight celebration slate, champagne gold & sleek contrast',
    defaultBannerText: 'Happy New Year! Kick Off the Celebration with Freshly Baked Party Boxes',
    badgeText: 'New Year 2027',
    effectStyle: 'confetti',
    palette: {
      pageBg: '#F8F9FC',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#EEF1F7',
      textColor: '#0F172A',
      mutedTextColor: '#475569',
      primary: '#1E293B',
      primaryHover: '#0F172A',
      primaryText: '#FDE68A',
      accent: '#CA8A04',
      accentSoft: '#FEF9C3',
      headerBg: '#0B1120',
      headerText: '#F8FAFC',
      footerBg: '#070B14',
      footerText: '#CBD5E1',
      bannerBg: '#CA8A04',
      bannerText: '#0B1120',
      borderColor: '#D6DCE8',
    },
  },
  {
    id: 'valentine',
    name: "Valentine's Week",
    shortName: "Valentine's",
    seasonLabel: 'Feb',
    tagline: 'Velvet rose crimson, soft blush surfaces & romantic accents',
    defaultBannerText: "Happy Valentine's Day! Sweet Gift Boxes & Artisanal Treats Made with Love",
    badgeText: 'Love Edition',
    effectStyle: 'petals',
    palette: {
      pageBg: '#FFF5F7',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#FFE4E9',
      textColor: '#2E0F19',
      mutedTextColor: '#753B4E',
      primary: '#BE123C',
      primaryHover: '#9F1239',
      primaryText: '#FFFFFF',
      accent: '#E11D48',
      accentSoft: '#FFE4E6',
      headerBg: '#6B0F26',
      headerText: '#FFF1F2',
      footerBg: '#440817',
      footerText: '#FECDD3',
      bannerBg: '#E11D48',
      bannerText: '#FFFFFF',
      borderColor: '#F5B8C6',
    },
  },
  {
    id: 'mothers_day',
    name: "Mother's Day",
    shortName: "Mother's Day",
    seasonLabel: 'May',
    tagline: 'Blossom orchid plum, soft lilac tint & warm cream cards',
    defaultBannerText: "Happy Mother's Day! Surprise Mom with Fresh Handcrafted Hampers",
    badgeText: 'For Mom',
    effectStyle: 'petals',
    palette: {
      pageBg: '#FCF7FF',
      surfaceBg: '#FFFFFF',
      surfaceAltBg: '#F4E8FF',
      textColor: '#261433',
      mutedTextColor: '#664B7A',
      primary: '#86198F',
      primaryHover: '#701A75',
      primaryText: '#FFFFFF',
      accent: '#DB2777',
      accentSoft: '#FCE7F3',
      headerBg: '#4A1259',
      headerText: '#FDF4FF',
      footerBg: '#2E0938',
      footerText: '#F5D0FE',
      bannerBg: '#A21CAF',
      bannerText: '#FFFFFF',
      borderColor: '#E4C2F5',
    },
  },
];

const PRESET_MAP = new Map<FestivalPresetId, FestivalThemePreset>(
  FESTIVAL_THEME_PRESETS.map((p) => [p.id, p])
);

export function getFestivalPresetById(id: FestivalPresetId): FestivalThemePreset {
  return PRESET_MAP.get(id) || FESTIVAL_THEME_PRESETS[0];
}

export function isValidFestivalThemeId(value: unknown): value is FestivalThemeId {
  return (
    value === 'auto' ||
    (typeof value === 'string' && PRESET_MAP.has(value as FestivalPresetId))
  );
}

export function normalizeFestivalThemeConfig(
  raw?: Partial<FestivalThemeConfig> | null
): FestivalThemeConfig {
  const src = raw && typeof raw === 'object' ? raw : {};
  const featuredProductHandles = Array.isArray(src.featuredProductHandles)
    ? Array.from(
        new Set(
          src.featuredProductHandles
            .map((h) => String(h || '').trim())
            .filter((h) => h.length > 0 && h.length <= 160)
        )
      ).slice(0, 6)
    : [];
  return {
    enabled: Boolean(src.enabled),
    selectedFestivalId: isValidFestivalThemeId(src.selectedFestivalId)
      ? src.selectedFestivalId
      : DEFAULT_FESTIVAL_THEME_CONFIG.selectedFestivalId,
    showAnnouncementBar:
      typeof src.showAnnouncementBar === 'boolean'
        ? src.showAnnouncementBar
        : DEFAULT_FESTIVAL_THEME_CONFIG.showAnnouncementBar,
    customBannerText:
      typeof src.customBannerText === 'string' ? src.customBannerText.trim().slice(0, 180) : '',
    enableFestiveEffects:
      typeof src.enableFestiveEffects === 'boolean'
        ? src.enableFestiveEffects
        : DEFAULT_FESTIVAL_THEME_CONFIG.enableFestiveEffects,
    showHeroBanner:
      typeof src.showHeroBanner === 'boolean'
        ? src.showHeroBanner
        : DEFAULT_FESTIVAL_THEME_CONFIG.showHeroBanner,
    show3DArticles:
      typeof src.show3DArticles === 'boolean'
        ? src.show3DArticles
        : DEFAULT_FESTIVAL_THEME_CONFIG.show3DArticles,
    show3DBackground:
      typeof src.show3DBackground === 'boolean'
        ? src.show3DBackground
        : DEFAULT_FESTIVAL_THEME_CONFIG.show3DBackground,
    show3DCardSnow:
      typeof src.show3DCardSnow === 'boolean'
        ? src.show3DCardSnow
        : DEFAULT_FESTIVAL_THEME_CONFIG.show3DCardSnow,
    featuredProductHandles,
    intensity: src.intensity === 'subtle' ? 'subtle' : 'full',
    updatedAt: typeof src.updatedAt === 'string' ? src.updatedAt : undefined,
  };
}

interface FestivalCalendarWindow {
  id: FestivalPresetId;
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
  peakMonth: number;
  peakDay: number;
}

// Annual IST festival windows (covering active & pre-festival shopping days)
const FESTIVAL_CALENDAR_WINDOWS: FestivalCalendarWindow[] = [
  { id: 'new_year', startMonth: 12, startDay: 27, endMonth: 1, endDay: 5, peakMonth: 1, peakDay: 1 },
  { id: 'independence_day', startMonth: 1, startDay: 20, endMonth: 1, endDay: 27, peakMonth: 1, peakDay: 26 },
  { id: 'valentine', startMonth: 2, startDay: 7, endMonth: 2, endDay: 15, peakMonth: 2, peakDay: 14 },
  { id: 'holi', startMonth: 2, startDay: 25, endMonth: 3, endDay: 20, peakMonth: 3, peakDay: 10 },
  { id: 'eid', startMonth: 3, startDay: 21, endMonth: 4, endDay: 12, peakMonth: 3, peakDay: 31 },
  { id: 'mothers_day', startMonth: 5, startDay: 1, endMonth: 5, endDay: 15, peakMonth: 5, peakDay: 10 },
  { id: 'independence_day', startMonth: 8, startDay: 8, endMonth: 8, endDay: 16, peakMonth: 8, peakDay: 15 },
  { id: 'raksha_bandhan', startMonth: 8, startDay: 17, endMonth: 8, endDay: 30, peakMonth: 8, peakDay: 24 },
  { id: 'janmashtami', startMonth: 8, startDay: 31, endMonth: 9, endDay: 8, peakMonth: 9, peakDay: 4 },
  { id: 'navratri', startMonth: 9, startDay: 25, endMonth: 10, endDay: 22, peakMonth: 10, peakDay: 12 },
  { id: 'diwali', startMonth: 10, startDay: 23, endMonth: 11, endDay: 16, peakMonth: 11, peakDay: 8 },
  { id: 'christmas', startMonth: 12, startDay: 1, endMonth: 12, endDay: 26, peakMonth: 12, peakDay: 25 },
];

function toMonthDayOrdinal(month: number, day: number): number {
  return month * 100 + day;
}

function getIstMonthDay(dateOrIso?: Date | string): { month: number; day: number } {
  const ms =
    dateOrIso instanceof Date
      ? dateOrIso.getTime()
      : typeof dateOrIso === 'string'
        ? Date.parse(dateOrIso)
        : Date.now();
  const safeMs = Number.isFinite(ms) ? ms : Date.now();
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const ist = new Date(safeMs + IST_OFFSET_MS);
  return {
    month: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
  };
}

/**
 * Automatically detects the active festival for a given IST date, or returns the
 * nearest upcoming festival if today is between festival windows.
 */
export function detectActiveFestivalForDate(dateOrIso?: Date | string): FestivalPresetId {
  const { month, day } = getIstMonthDay(dateOrIso);
  const currentOrd = toMonthDayOrdinal(month, day);

  for (const win of FESTIVAL_CALENDAR_WINDOWS) {
    const startOrd = toMonthDayOrdinal(win.startMonth, win.startDay);
    const endOrd = toMonthDayOrdinal(win.endMonth, win.endDay);
    if (startOrd <= endOrd) {
      if (currentOrd >= startOrd && currentOrd <= endOrd) {
        return win.id;
      }
    } else {
      // Crosses year boundary (Dec 27 - Jan 5)
      if (currentOrd >= startOrd || currentOrd <= endOrd) {
        return win.id;
      }
    }
  }

  // Otherwise pick the nearest upcoming festival window
  let bestId: FestivalPresetId = 'christmas';
  let bestDelta = Number.POSITIVE_INFINITY;
  const approxDayOfYear = (m: number, d: number) => (m - 1) * 31 + d;
  const nowDoy = approxDayOfYear(month, day);

  for (const win of FESTIVAL_CALENDAR_WINDOWS) {
    const peakDoy = approxDayOfYear(win.peakMonth, win.peakDay);
    let delta = peakDoy - nowDoy;
    if (delta < 0) delta += 372;
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = win.id;
    }
  }

  return bestId;
}

export function resolveEffectiveFestivalPreset(
  config: FestivalThemeConfig,
  now?: Date | string
): {
  preset: FestivalThemePreset;
  isAutoDetected: boolean;
  autoDetectedId: FestivalPresetId;
  effectiveBannerText: string;
} {
  const normalized = normalizeFestivalThemeConfig(config);
  const autoDetectedId = detectActiveFestivalForDate(now);
  const isAutoDetected = normalized.selectedFestivalId === 'auto';
  const effectiveId: FestivalPresetId = isAutoDetected
    ? autoDetectedId
    : (normalized.selectedFestivalId as FestivalPresetId);
  const preset = getFestivalPresetById(effectiveId);
  const effectiveBannerText =
    normalized.customBannerText.trim() || preset.defaultBannerText;

  return {
    preset,
    isAutoDetected,
    autoDetectedId,
    effectiveBannerText,
  };
}

function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '15, 23, 42';
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export interface FestivalThemeRuntimePayload {
  enabled: boolean;
  presetId: FestivalPresetId;
  presetName: string;
  badgeText: string;
  showAnnouncementBar: boolean;
  bannerText: string;
  enableFestiveEffects: boolean;
  showHeroBanner: boolean;
  show3DArticles: boolean;
  show3DBackground: boolean;
  show3DCardSnow: boolean;
  effectStyle: FestivalThemePreset['effectStyle'];
  palette: FestivalPalette;
  featuredProducts: FestivalFeaturedProduct[];
  background3DHtml: string;
  heroBannerHtml: string;
  garlandHtml: string;
  particlesHtml: string;
  roamerHtml: string;
  css: string;
}

export function normalizeShopPreviewOrigin(rawDomain?: string | null): string {
  const cleaned = String(rawDomain || '')
    .trim()
    .replace(/^(https?:\/\/)+/i, '')
    .replace(/\/+.*$/, '')
    .trim();
  if (!cleaned || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) {
    return 'https://broomiesbakery.in';
  }
  return `https://${cleaned}`;
}

export function sanitizePreviewPath(rawPath?: string | null): string {
  const trimmed = String(rawPath || '/').trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }
  // Keep only safe relative path + query without control characters
  const safe = trimmed.replace(/[\r\n\t\0]/g, '').slice(0, 300);
  if (safe.includes('://')) return '/';
  return safe || '/';
}

export function buildFestivalThemePayload(
  config: FestivalThemeConfig,
  options?:
    | Date
    | string
    | {
        now?: Date | string;
        catalogProducts?: FestivalFeaturedProduct[];
        shopName?: string;
      }
): FestivalThemeRuntimePayload {
  const opts =
    options instanceof Date || typeof options === 'string'
      ? { now: options }
      : options || {};
  const normalized = normalizeFestivalThemeConfig(config);
  const resolved = resolveEffectiveFestivalPreset(normalized, opts.now);
  const featuredProducts = selectBestFestivalProducts(
    opts.catalogProducts || [],
    resolved.preset.id,
    normalized.featuredProductHandles || [],
    3
  );
  const baseCss = buildFestivalStorefrontCss(normalized, opts.now);
  const showcaseCss = normalized.enabled
    ? buildFestivalShowcaseCss(resolved.preset, normalized)
    : '';
  const roamerCss = normalized.enabled
    ? buildSantaRoamerCss(resolved.preset.id, normalized)
    : '';
  const cardSnowCss = normalized.enabled
    ? buildWinterCardSnowCss(resolved.preset.id, normalized)
    : '';
  const combinedCss = [baseCss, showcaseCss, roamerCss, cardSnowCss].filter(Boolean).join('\n\n');

  return {
    enabled: normalized.enabled,
    presetId: resolved.preset.id,
    presetName: resolved.preset.name,
    badgeText: resolved.preset.badgeText,
    showAnnouncementBar: normalized.showAnnouncementBar,
    bannerText: resolved.effectiveBannerText,
    enableFestiveEffects: normalized.enableFestiveEffects,
    showHeroBanner: normalized.showHeroBanner !== false,
    show3DArticles: normalized.show3DArticles !== false,
    show3DBackground: normalized.show3DBackground !== false,
    show3DCardSnow: normalized.show3DCardSnow !== false,
    effectStyle: resolved.preset.effectStyle,
    palette: resolved.preset.palette,
    featuredProducts,
    background3DHtml:
      normalized.enabled && normalized.show3DBackground !== false
        ? buildFestival3DBackgroundHtml(resolved.preset)
        : '',
    heroBannerHtml: normalized.enabled
      ? buildFestivalHeroBannerHtml({
          preset: resolved.preset,
          config: normalized,
          products: featuredProducts,
          shopName: opts.shopName,
        })
      : '',
    garlandHtml:
      normalized.enabled && normalized.show3DArticles !== false
        ? buildFestivalGarlandHtml(resolved.preset)
        : '',
    particlesHtml:
      normalized.enabled && normalized.enableFestiveEffects
        ? buildFestivalParticlesHtml(resolved.preset)
        : '',
    roamerHtml: normalized.enabled
      ? buildSantaRoamerHtml(resolved.preset.id, normalized)
      : '',
    css: combinedCss,
  };
}

export function buildFestivalPreviewUrl(
  baseOrigin: string,
  config: FestivalThemeConfig,
  mode: 'festive' | 'original',
  pagePath = '/'
): string {
  const normalized = normalizeFestivalThemeConfig(config);
  const safePath = sanitizePreviewPath(pagePath);
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('festival', normalized.selectedFestivalId);
  params.set('intensity', normalized.intensity);
  params.set('banner', normalized.showAnnouncementBar ? '1' : '0');
  params.set('fx', normalized.enableFestiveEffects ? '1' : '0');
  params.set('hero', normalized.showHeroBanner !== false ? '1' : '0');
  params.set('art3d', normalized.show3DArticles !== false ? '1' : '0');
  params.set('bg3d', normalized.show3DBackground !== false ? '1' : '0');
  params.set('snowcards', normalized.show3DCardSnow !== false ? '1' : '0');
  if ((normalized.featuredProductHandles || []).length > 0) {
    params.set('picks', (normalized.featuredProductHandles || []).slice(0, 3).join(','));
  }
  if (normalized.customBannerText.trim()) {
    params.set('bannerText', normalized.customBannerText.trim());
  }
  if (safePath !== '/') {
    params.set('path', safePath);
  }
  const cleanOrigin = String(baseOrigin || '').replace(/\/+$/, '');
  return `${cleanOrigin}/api/storefront/preview?${params.toString()}`;
}

/**
 * Compiles non-destructive, scoped CSS for the Shopify storefront bridge (Dawn 16+ & standard themes).
 * Returns an empty string when `enabled` is false so toggling OFF removes all overrides
 * and restores the original Shopify theme cleanly.
 */
export function buildFestivalStorefrontCss(
  config: FestivalThemeConfig,
  now?: Date | string
): string {
  const normalized = normalizeFestivalThemeConfig(config);
  if (!normalized.enabled) return '';

  const { preset } = resolveEffectiveFestivalPreset(normalized, now);
  const p = preset.palette;
  const pageBgRgb = hexToRgbTriplet(p.pageBg);
  const textRgb = hexToRgbTriplet(p.textColor);
  const primaryRgb = hexToRgbTriplet(p.primary);
  const primaryTextRgb = hexToRgbTriplet(p.primaryText);
  const accentRgb = hexToRgbTriplet(p.accent);
  const isFull = normalized.intensity === 'full';

  const baseVars = `
/* OrderPulse 1-Click Festival Theme: ${preset.name} (${normalized.intensity}) */
:root,
[class*="color-scheme-"],
.color-background-1,
.color-background-2 {
  --op-fest-page-bg: ${p.pageBg};
  --op-fest-surface: ${p.surfaceBg};
  --op-fest-surface-alt: ${p.surfaceAltBg};
  --op-fest-text: ${p.textColor};
  --op-fest-muted: ${p.mutedTextColor};
  --op-fest-primary: ${p.primary};
  --op-fest-primary-hover: ${p.primaryHover};
  --op-fest-primary-text: ${p.primaryText};
  --op-fest-accent: ${p.accent};
  --op-fest-border: ${p.borderColor};
  --color-button: ${primaryRgb} !important;
  --color-button-text: ${primaryTextRgb} !important;
  --color-link: ${primaryRgb} !important;
  --color-badge-background: ${accentRgb} !important;
  --color-badge-foreground: ${textRgb} !important;
  ${isFull ? `--color-background: ${pageBgRgb} !important; --gradient-background: ${p.pageBg} !important; --color-foreground: ${textRgb} !important;` : ''}
}

/* Primary Buttons & CTAs */
.button,
.button--primary,
button[name="add"],
.product-form__submit,
.cart__checkout-button,
.shopify-payment-button__button--unbranded,
a.button--primary {
  background-color: ${p.primary} !important;
  background-image: none !important;
  color: ${p.primaryText} !important;
  border-color: ${p.primary} !important;
  transition: background-color 0.2s ease, transform 0.15s ease !important;
}

.button:hover,
.button--primary:hover,
button[name="add"]:hover,
.product-form__submit:hover,
.cart__checkout-button:hover {
  background-color: ${p.primaryHover} !important;
}

/* Badges & Sale Tags */
.badge,
.price__badge-sale,
.card__badge .badge {
  background-color: ${p.accent} !important;
  color: ${p.bannerText} !important;
  border-color: ${p.accent} !important;
}

/* Announcement Banner */
#orderpulse-festival-banner {
  background: linear-gradient(90deg, ${p.bannerBg}, ${p.accent}, ${p.bannerBg}) !important;
  color: ${p.bannerText} !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
`;

  const fullSurfaceRules = isFull
    ? `
/* Full Storefront Surface & Card Theme (scoped to main content so header/footer keep distinct palettes) */
html,
body,
main#MainContent,
.content-for-layout,
main#MainContent .shopify-section > .gradient,
main#MainContent .color-scheme-1,
main#MainContent .color-scheme-2,
main#MainContent .collection.gradient,
main#MainContent .rich-text.gradient,
main#MainContent .multicolumn.gradient {
  background-color: ${p.pageBg} !important;
  background-image: none !important;
  color: ${p.textColor} !important;
}

main#MainContent .banner__box,
main#MainContent .card,
main#MainContent .card-wrapper .card,
main#MainContent .product-card,
main#MainContent .product-grid-item,
main#MainContent .collection-hero,
main#MainContent .multicolumn-card,
main#MainContent .rich-text__blocks {
  background-color: ${p.surfaceBg} !important;
  border: 1px solid ${p.borderColor} !important;
  border-radius: 12px !important;
}

main#MainContent .card__heading,
main#MainContent .card__heading a,
main#MainContent .product__title,
main#MainContent .product__title h1,
main#MainContent .price-item,
main#MainContent h1,
main#MainContent h2,
main#MainContent h3 {
  color: ${p.textColor} !important;
}

main#MainContent .product__info-wrapper,
main#MainContent .product__info-wrapper.scroll-trigger,
main#MainContent .scroll-trigger.animate--slide-in,
main#MainContent .scroll-trigger.animate--fade-in {
  opacity: 1 !important;
}
`
    : '';

  const headerAndFooterRules = `
/* Header, Announcement Utility Bar & Navigation (placed after main rules so Dawn .color-scheme-1 never overrides headerBg) */
body .header-wrapper,
body .shopify-section-group-header-group .header-wrapper,
body .shopify-section-group-header-group .header-wrapper.gradient,
body .section-header .header-wrapper,
body header.header,
body .site-header,
body sticky-header {
  background-color: ${p.headerBg} !important;
  background-image: none !important;
  color: ${p.headerText} !important;
  border-bottom: 2px solid ${p.accent} !important;
}

body .utility-bar,
body .shopify-section-group-header-group .utility-bar,
body .announcement-bar-section .utility-bar {
  background-color: ${p.footerBg} !important;
  background-image: none !important;
  color: ${p.headerText} !important;
}

body .header-wrapper a,
body .header-wrapper span,
body .header-wrapper .header__menu-item,
body .header-wrapper .header__icon,
body .header-wrapper summary,
body .header-wrapper .h2,
body .header-wrapper svg,
body .utility-bar a,
body .utility-bar p,
body .utility-bar span,
body .site-header a {
  color: ${p.headerText} !important;
}

body .header-wrapper .cart-count-bubble,
body .header-wrapper .cart-count-bubble span {
  background-color: ${p.primary} !important;
  color: ${p.primaryText} !important;
}

/* Global High-Contrast Guarantee for Sidebar Menu Drawer, Dropdowns, Search Modal, Cart Drawer & Filter Drawers
   (In Shopify Dawn, #menu-drawer, .header__submenu, .mega-menu__content, .search-modal & .predictive-search
   live INSIDE .header-wrapper, so they must explicitly override light header text with crisp dark ink.) */
body .header-wrapper #menu-drawer,
body .header-wrapper .menu-drawer,
body .header-wrapper .menu-drawer__inner-container,
body .header-wrapper .menu-drawer__navigation-container,
body .header-wrapper .menu-drawer__navigation,
body .header-wrapper .menu-drawer__submenu,
body .header-wrapper .menu-drawer__inner-submenu,
body .header-wrapper .menu-drawer__utility-links,
body .header-wrapper .header__submenu,
body .header-wrapper .mega-menu__content,
body .header-wrapper .list-menu--disclosure,
body .header-wrapper .search-modal,
body .header-wrapper .search-modal__content,
body .header-wrapper .predictive-search,
body .header-wrapper .predictive-search__results-groups-wrapper,
body .header-wrapper .disclosure__list-wrapper,
body .cart-notification,
body .cart-notification__header,
body cart-drawer .drawer__inner,
body .cart-drawer .drawer__inner,
body .cart-drawer__empty-content,
body .mobile-facets__inner,
body .mobile-facets__submenu,
body .mobile-facets__header,
body .mobile-facets__footer,
body .facets__display,
body .quick-add-modal__content,
body .product-popup-modal__content {
  background-color: ${p.surfaceBg} !important;
  background-image: none !important;
  color: ${p.textColor} !important;
  --color-foreground: ${textRgb} !important;
  --color-background: ${pageBgRgb} !important;
}

body .header-wrapper #menu-drawer a,
body .header-wrapper #menu-drawer span,
body .header-wrapper #menu-drawer p,
body .header-wrapper #menu-drawer li,
body .header-wrapper #menu-drawer summary,
body .header-wrapper #menu-drawer button,
body .header-wrapper #menu-drawer svg,
body .header-wrapper #menu-drawer .menu-drawer__menu-item,
body .header-wrapper #menu-drawer .menu-drawer__close-button,
body .header-wrapper #menu-drawer .menu-drawer__account,
body .header-wrapper #menu-drawer .list-social__link,
body .header-wrapper .menu-drawer a,
body .header-wrapper .menu-drawer span,
body .header-wrapper .menu-drawer summary,
body .header-wrapper .menu-drawer button,
body .header-wrapper .menu-drawer svg,
body .header-wrapper .header__submenu a,
body .header-wrapper .header__submenu span,
body .header-wrapper .header__submenu summary,
body .header-wrapper .header__submenu svg,
body .header-wrapper .mega-menu__content a,
body .header-wrapper .mega-menu__content span,
body .header-wrapper .mega-menu__content p,
body .header-wrapper .mega-menu__content h2,
body .header-wrapper .mega-menu__content h3,
body .header-wrapper .mega-menu__content svg,
body .header-wrapper .list-menu--disclosure a,
body .header-wrapper .list-menu--disclosure span,
body .header-wrapper .disclosure__list-wrapper a,
body .header-wrapper .disclosure__list-wrapper span,
body .header-wrapper .search-modal label,
body .header-wrapper .search-modal input,
body .header-wrapper .search-modal button,
body .header-wrapper .search-modal svg,
body .header-wrapper .search-modal a,
body .header-wrapper .search-modal span,
body .header-wrapper .predictive-search a,
body .header-wrapper .predictive-search span,
body .header-wrapper .predictive-search p,
body .header-wrapper .predictive-search h2,
body .header-wrapper .predictive-search h3,
body .header-wrapper .predictive-search svg,
body .cart-notification h2,
body .cart-notification h3,
body .cart-notification p,
body .cart-notification a:not(.button),
body .cart-notification span:not(.button span),
body .cart-notification button:not(.button),
body .cart-notification svg,
body cart-drawer .drawer__inner h2,
body cart-drawer .drawer__inner h3,
body cart-drawer .drawer__inner p,
body cart-drawer .drawer__inner a:not(.button),
body cart-drawer .drawer__inner span:not(.badge),
body cart-drawer .drawer__inner label,
body cart-drawer .drawer__inner td,
body cart-drawer .drawer__inner th,
body cart-drawer .drawer__inner input,
body cart-drawer .drawer__inner .drawer__close,
body cart-drawer .drawer__inner .drawer__close svg,
body cart-drawer .drawer__inner .quantity__button,
body cart-drawer .drawer__inner .quantity__button svg,
body cart-drawer .drawer__inner .cart-remove-button,
body cart-drawer .drawer__inner .cart-remove-button svg,
body .mobile-facets__inner h2,
body .mobile-facets__inner p,
body .mobile-facets__inner a,
body .mobile-facets__inner span,
body .mobile-facets__inner label,
body .mobile-facets__inner summary,
body .mobile-facets__inner button:not(.button),
body .mobile-facets__inner svg,
body .facets__display span,
body .facets__display label,
body .facets__display a,
body .facets__display p,
body .facets__display input,
body .quick-add-modal__content h1,
body .quick-add-modal__content h2,
body .quick-add-modal__content p,
body .quick-add-modal__content span:not(.badge),
body .quick-add-modal__content label,
body .quick-add-modal__content a:not(.button),
body .quick-add-modal__content .quick-add-modal__toggle,
body .quick-add-modal__content .quick-add-modal__toggle svg,
body .product-popup-modal__content h1,
body .product-popup-modal__content h2,
body .product-popup-modal__content p,
body .product-popup-modal__content a:not(.button) {
  color: ${p.textColor} !important;
  text-shadow: none !important;
}

body .header-wrapper #menu-drawer .menu-drawer__menu-item {
  border-bottom: 1px solid ${p.borderColor} !important;
  font-weight: 600 !important;
}

body .header-wrapper #menu-drawer .menu-drawer__menu-item--active,
body .header-wrapper #menu-drawer .menu-drawer__menu-item:hover,
body .header-wrapper #menu-drawer .menu-drawer__menu-item:focus,
body .header-wrapper .header__submenu .header__menu-item:hover {
  background-color: ${p.surfaceAltBg} !important;
  color: ${p.primary} !important;
}

body .header-wrapper #menu-drawer .menu-drawer__utility-links {
  background-color: ${p.surfaceAltBg} !important;
  border-top: 1px solid ${p.borderColor} !important;
}

body .header-wrapper .header__submenu,
body .header-wrapper .mega-menu__content,
body .header-wrapper .list-menu--disclosure,
body .header-wrapper .predictive-search,
body .cart-notification {
  border: 1px solid ${p.borderColor} !important;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16) !important;
}

/* Primary Buttons always keep readable button text & icons even inside drawers/modals */
body .button,
body .button span,
body .button svg,
body .button--primary,
body .button--primary span,
body .button--primary svg,
body .cart__checkout-button,
body .cart__checkout-button span,
body button[name="add"],
body button[name="add"] span {
  color: ${p.primaryText} !important;
}

/* Form inputs & selects stay crisp dark ink on white background everywhere */
body input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
body textarea,
body select {
  background-color: #FFFFFF !important;
  color: ${p.textColor} !important;
  border-color: ${p.borderColor} !important;
}
body input::placeholder,
body textarea::placeholder {
  color: ${p.mutedTextColor} !important;
  opacity: 0.9 !important;
}
body .field__label,
body .customer .field label {
  color: ${p.mutedTextColor} !important;
}

/* Keep Santa Roamer out of the way while a customer has the sidebar menu, cart drawer, or search open */
body:has(#Details-menu-drawer-container[open]) #orderpulse-festival-roamer,
body:has(.menu-drawer-container[open]) #orderpulse-festival-roamer,
body:has(cart-drawer.active) #orderpulse-festival-roamer,
body:has(details-modal details[open]) #orderpulse-festival-roamer,
body:has(.mobile-facets__disclosure[open]) #orderpulse-festival-roamer {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.2s ease !important;
}

${
  isFull
    ? `
/* Footer */
body footer.footer,
body .site-footer,
body .shopify-section-group-footer-group,
body .shopify-section-group-footer-group .gradient,
body .shopify-section-group-footer-group footer.footer {
  background-color: ${p.footerBg} !important;
  background-image: none !important;
  color: ${p.footerText} !important;
  border-top: 2px solid ${p.accent} !important;
}

body footer.footer a,
body footer.footer h2,
body footer.footer p,
body footer.footer span,
body footer.footer li,
body footer.footer svg,
body .site-footer a {
  color: ${p.footerText} !important;
}

body footer.footer input:not([type="submit"]):not([type="button"]) {
  background-color: #FFFFFF !important;
  color: ${p.textColor} !important;
}
body footer.footer .field__label {
  color: ${p.mutedTextColor} !important;
}
body footer.footer .newsletter-form__button,
body footer.footer .newsletter-form__button svg {
  color: ${p.textColor} !important;
}
`
    : ''
}
`;

  const fxRules = normalized.enableFestiveEffects
    ? `
@keyframes opFestFloat {
  0% { transform: translate3d(0, -14px, 0) rotate(0deg); opacity: 0; }
  15% { opacity: 0.78; }
  85% { opacity: 0.65; }
  100% { transform: translate3d(0, 105vh, 0) rotate(220deg); opacity: 0; }
}
#orderpulse-festival-fx {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100lvh;
  pointer-events: none;
  z-index: 2147482000;
  overflow: hidden;
  contain: layout style;
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.op-fest-particle {
  position: absolute;
  top: -14px;
  border-radius: 999px;
  animation: opFestFloat linear infinite;
  will-change: transform;
  backface-visibility: hidden;
}
@media (prefers-reduced-motion: reduce) {
  #orderpulse-festival-fx {
    display: none !important;
  }
}
`
    : '';

  return `${baseVars}${fullSurfaceRules}${headerAndFooterRules}${fxRules}`.trim();
}

function escapeHtmlAttr(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeJsonForScriptTag(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Rewrites a live fetched Shopify storefront HTML page so it renders cleanly inside
 * OrderPulse's live preview iframe or standalone shareable preview link, with real
 * store assets loading from the store origin and live festival CSS/banner/FX preview.
 */
export function rewriteShopifyHtmlForFestivalPreview(
  rawHtml: string,
  storefrontOrigin: string,
  options: {
    mode: 'festive' | 'original';
    payload: FestivalThemeRuntimePayload;
    currentPath?: string;
  }
): string {
  const cleanOrigin = normalizeShopPreviewOrigin(storefrontOrigin);
  const safeBaseHref = escapeHtmlAttr(`${cleanOrigin}/`);
  const effectivePayload: FestivalThemeRuntimePayload =
    options.mode === 'festive'
      ? options.payload
      : {
          ...options.payload,
          enabled: false,
          css: '',
          background3DHtml: '',
          heroBannerHtml: '',
          garlandHtml: '',
          particlesHtml: '',
          roamerHtml: '',
        };

  // Strip any meta CSP that could block embedded preview frames
  let html = String(rawHtml || '').replace(
    /<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
    ''
  );

  // Strip Shopify ScriptTag asyncLoad entries for our live storefront widget.js (which use
  // JSON-escaped `\/` slashes and would otherwise load the live OFF state and erase preview CSS)
  html = html
    .replace(/"https?:\\?\/\\?\/[^"]*?storefront\\?\/widget\.js[^"]*"\s*,?/gi, '')
    .replace(/,\s*\]/g, ']');

  // Strip cross-origin tracking/pixel/checkout scripts AND any direct live widget.js script tags
  html = html.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    (tag) => {
      if (
        /web-pixels|webPixelsManager|trekkie|monorail|magic-checkout|razorpay|shop-js|shop\.app|perf-kit|storefront-renderer|analytics|facebook\.net|gtag|googletagmanager|storefront(?:\\?\/)widget\.js|orderpulse.*widget\.js/i.test(
          tag
        )
      ) {
        return '';
      }
      return tag;
    }
  );

  // Remove existing <base> tags to prevent conflicts with our storefront origin <base>
  html = html.replace(/<base\b[^>]*>/gi, '');

  const baseTag = `<base href="${safeBaseHref}" />`;
  const initialStyleTag =
    effectivePayload.enabled && effectivePayload.css
      ? `<style id="orderpulse-festival-theme-css">${effectivePayload.css.replace(/<\/style>/gi, '<\\/style>')}</style>`
      : '';

  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, (match) => `${match}\n${baseTag}`);
  } else {
    html = `<head>${baseTag}</head>${html}`;
  }

  // Place our festival <style> right before </head> so it ALWAYS wins the CSS cascade
  // over Dawn's inline :root/--gradient-background style blocks!
  if (initialStyleTag) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${initialStyleTag}\n</head>`);
    } else {
      html = `${initialStyleTag}\n${html}`;
    }
  }

  const bridgeScript = `
<script data-op-festival-preview-bridge="1">
(function () {
  var INITIAL_PAYLOAD = ${safeJsonForScriptTag(effectivePayload)};
  var STORE_ORIGIN = ${safeJsonForScriptTag(cleanOrigin)};
${buildSantaRoamerRuntimeJs()}
${buildWinterCardSnowRuntimeJs()}

  var opPreviewThemeSig = '';

  function buildThemeSig(ft) {
    if (!ft || !ft.enabled) return 'off';
    return [
      ft.presetId || '',
      ft.css ? ft.css.length : 0,
      ft.show3DBackground ? 1 : 0,
      ft.showAnnouncementBar ? 1 : 0,
      ft.bannerText || '',
      ft.badgeText || '',
      ft.showHeroBanner ? 1 : 0,
      ft.heroBannerHtml ? ft.heroBannerHtml.length : 0,
      ft.show3DArticles ? 1 : 0,
      ft.enableFestiveEffects ? 1 : 0,
      ft.show3DCardSnow !== false ? 1 : 0,
      ft.roamerHtml ? ft.roamerHtml.length : 0
    ].join('|');
  }

  function removeFestivalPreview() {
    opPreviewThemeSig = 'off';
    stopSantaRoamer();
    removeWinterCardSnow();
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
      var el = document.getElementById(ids[k]);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    try { document.documentElement.removeAttribute('data-orderpulse-festival'); } catch (e) {}
  }

  function applyFestivalPreview(ft) {
    if (!ft || !ft.enabled || !ft.css) {
      removeFestivalPreview();
      return;
    }
    var nextSig = buildThemeSig(ft);
    if (nextSig === opPreviewThemeSig && document.getElementById('orderpulse-festival-theme-css')) {
      mountWinterCardSnow(ft);
      return;
    }
    opPreviewThemeSig = nextSig;

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

    // 0. Full-Website 3D Animated Festive Background Layer (idempotent — zero flicker)
    var existingBg3d = document.getElementById('orderpulse-festival-bg-3d');
    if (ft.show3DBackground && ft.background3DHtml && document.body) {
      var bgSig = (ft.presetId || '') + ':' + ft.background3DHtml.length;
      if (!existingBg3d) {
        existingBg3d = document.createElement('div');
        existingBg3d.id = 'orderpulse-festival-bg-3d';
        existingBg3d.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(existingBg3d, document.body.firstChild);
      }
      if (existingBg3d.getAttribute('data-op-sig') !== bgSig) {
        existingBg3d.setAttribute('data-op-sig', bgSig);
        existingBg3d.innerHTML = ft.background3DHtml;
      }
    } else if (existingBg3d && existingBg3d.parentNode) {
      existingBg3d.parentNode.removeChild(existingBg3d);
    }

    // 1. Top Festive Announcement Bar
    var existingBanner = document.getElementById('orderpulse-festival-banner');
    if (ft.showAnnouncementBar && ft.bannerText && document.body) {
      var bannerSig = (ft.badgeText || '') + '|' + (ft.bannerText || '');
      if (!existingBanner) {
        existingBanner = document.createElement('div');
        existingBanner.id = 'orderpulse-festival-banner';
        existingBanner.style.cssText =
          'position:relative;z-index:2147482500;width:100%;padding:9px 38px 9px 14px;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:600;line-height:1.4;letter-spacing:0.01em;box-sizing:border-box;';
        document.body.insertBefore(existingBanner, document.body.firstChild);
      }
      if (existingBanner.getAttribute('data-op-sig') !== bannerSig) {
        existingBanner.setAttribute('data-op-sig', bannerSig);
        var safeBadge = String(ft.badgeText || '').replace(/</g, '&lt;');
        var safeText = String(ft.bannerText || '').replace(/</g, '&lt;');
        existingBanner.innerHTML =
          (safeBadge
            ? '<span style="display:inline-block;margin-right:8px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.16);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">' +
              safeBadge +
              '</span>'
            : '') +
          '<span>' + safeText + '</span>';
      }
    } else if (existingBanner && existingBanner.parentNode) {
      existingBanner.parentNode.removeChild(existingBanner);
    }

    // 2. Hanging 3D Festive Lights / Garland directly below the header
    var existingGarland = document.getElementById('orderpulse-festival-garland');
    if (ft.show3DArticles && ft.garlandHtml && document.body) {
      var garlandSig = (ft.presetId || '') + ':' + ft.garlandHtml.length;
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
      if (existingGarland.getAttribute('data-op-sig') !== garlandSig) {
        existingGarland.setAttribute('data-op-sig', garlandSig);
        existingGarland.innerHTML = ft.garlandHtml;
      }
    } else if (existingGarland && existingGarland.parentNode) {
      existingGarland.parentNode.removeChild(existingGarland);
    }

    // 3. Auto-Product 3D Festive Hero Showcase Banner at the top of MainContent
    var existingHero = document.getElementById('orderpulse-festival-hero');
    if (ft.showHeroBanner && ft.heroBannerHtml && document.body) {
      var heroSig = (ft.presetId || '') + ':' + ft.heroBannerHtml.length + ':' + (ft.show3DArticles ? 1 : 0);
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
      if (existingHero.getAttribute('data-op-sig') !== heroSig) {
        existingHero.setAttribute('data-op-sig', heroSig);
        existingHero.innerHTML = ft.heroBannerHtml;
      }
    } else if (existingHero && existingHero.parentNode) {
      existingHero.parentNode.removeChild(existingHero);
    }

    // 4. Smooth Animated Snowflakes / Sparkles / Gulal / Hearts FX
    var existingFx = document.getElementById('orderpulse-festival-fx');
    if (ft.enableFestiveEffects && ft.particlesHtml && document.body) {
      var fxSig = (ft.presetId || '') + ':' + ft.particlesHtml.length;
      if (!existingFx) {
        existingFx = document.createElement('div');
        existingFx.id = 'orderpulse-festival-fx';
        existingFx.setAttribute('aria-hidden', 'true');
        document.body.appendChild(existingFx);
      }
      if (existingFx.getAttribute('data-op-sig') !== fxSig) {
        existingFx.setAttribute('data-op-sig', fxSig);
        existingFx.innerHTML = ft.particlesHtml;
      }
    } else if (existingFx && existingFx.parentNode) {
      existingFx.parentNode.removeChild(existingFx);
    }

    // 5. Roaming Interactive 3D Santa Claus Character
    mountFestivalRoamer(ft);

    // 6. 3D Sculpted Snow Accumulation & Crystal Icicles on Every Card
    mountWinterCardSnow(ft);
  }

  function bootPreview() {
    applyFestivalPreview(INITIAL_PAYLOAD);
    // Keep internal storefront link clicks inside the live preview proxy
    document.addEventListener('click', function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!target) return;
      var href = target.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        var resolved = new URL(href, STORE_ORIGIN + '/');
        var storeHost = new URL(STORE_ORIGIN).hostname.replace(/^www\\./, '');
        var linkHost = resolved.hostname.replace(/^www\\./, '');
        if (linkHost === storeHost) {
          ev.preventDefault();
          var nextPath = (resolved.pathname || '/') + (resolved.search || '');
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'ORDERPULSE_PREVIEW_NAVIGATE', path: nextPath }, '*');
          } else {
            var cur = new URL(window.location.href);
            cur.searchParams.set('path', nextPath);
            window.location.href = cur.toString();
          }
        }
      } catch (e) {}
    }, true);
  }

  window.addEventListener('message', function (ev) {
    if (!ev || !ev.data || ev.data.type !== 'ORDERPULSE_FESTIVAL_PREVIEW_UPDATE') return;
    applyFestivalPreview(ev.data.payload || null);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPreview);
  } else {
    bootPreview();
  }
})();
</script>`;

  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${bridgeScript}\n</body>`);
  } else {
    html = `${html}\n${bridgeScript}`;
  }

  return html;
}

export const ORDERPULSE_FESTIVAL_SNIPPET_KEY = 'snippets/orderpulse-festival-theme.liquid';

const THEME_LIQUID_START_MARKER = '{% comment %}ORDERPULSE_FESTIVAL_START{% endcomment %}';
const THEME_LIQUID_END_MARKER = '{% comment %}ORDERPULSE_FESTIVAL_END{% endcomment %}';
const THEME_LIQUID_RENDER_TAG = `${THEME_LIQUID_START_MARKER}{% render 'orderpulse-festival-theme' %}${THEME_LIQUID_END_MARKER}`;

export function computeFestivalPayloadSig(ft: FestivalThemeRuntimePayload | null | undefined): string {
  if (!ft || !ft.enabled || !ft.css) return 'off';
  return [
    ft.presetId || '',
    ft.css ? ft.css.length : 0,
    ft.show3DBackground ? 1 : 0,
    ft.showAnnouncementBar ? 1 : 0,
    ft.bannerText || '',
    ft.badgeText || '',
    ft.showHeroBanner ? 1 : 0,
    ft.heroBannerHtml ? ft.heroBannerHtml.length : 0,
    ft.show3DArticles ? 1 : 0,
    ft.enableFestiveEffects ? 1 : 0,
    ft.show3DCardSnow !== false ? 1 : 0,
    ft.roamerHtml ? ft.roamerHtml.length : 0,
  ].join('|');
}

/**
 * Idempotently injects or cleanly removes the marked OrderPulse festival render tag
 * right before </head> inside Shopify's layout/theme.liquid.
 */
export function patchThemeLiquidWithFestivalSnippet(
  themeLiquid: string,
  enabled: boolean
): { updated: string; changed: boolean } {
  const original = String(themeLiquid || '');
  const markerRegex =
    /\r?\n?\{%\s*comment\s*%\}ORDERPULSE_FESTIVAL_START\{%\s*endcomment\s*%\}[\s\S]*?\{%\s*comment\s*%\}ORDERPULSE_FESTIVAL_END\{%\s*endcomment\s*%\}/g;

  if (!enabled) {
    const cleaned = original.replace(markerRegex, '');
    return { updated: cleaned, changed: cleaned !== original };
  }

  if (markerRegex.test(original)) {
    const replaced = original.replace(markerRegex, `\n${THEME_LIQUID_RENDER_TAG}`);
    return { updated: replaced, changed: replaced !== original };
  }

  if (/<\/head>/i.test(original)) {
    const injected = original.replace(/<\/head>/i, `  ${THEME_LIQUID_RENDER_TAG}\n</head>`);
    return { updated: injected, changed: injected !== original };
  }

  const appended = `${original}\n${THEME_LIQUID_RENDER_TAG}`;
  return { updated: appended, changed: appended !== original };
}

/**
 * Generates a self-contained Shopify Liquid snippet (`snippets/orderpulse-festival-theme.liquid`)
 * that pre-bakes the active festival CSS directly into <head> (0ms first-paint, zero delay!)
 * and mounts the 3D background, garland, hero banner, snow, card snow caps, and Santa roamer
 * immediately on DOMContentLoaded without waiting for window.onload or any API fetch.
 */
export function buildBakedShopifyFestivalSnippet(payload: FestivalThemeRuntimePayload): string {
  if (!payload || !payload.enabled || !payload.css) {
    return '{% comment %}OrderPulse Festival Theme OFF{% endcomment %}';
  }

  const bakedSig = computeFestivalPayloadSig(payload);
  const safeCss = payload.css.replace(/<\/style>/gi, '<\\/style>').replace(/\{%/g, '{ %').replace(/%\}/g, '% }');
  const runtimePayload = {
    enabled: true,
    presetId: payload.presetId,
    presetName: payload.presetName,
    badgeText: payload.badgeText,
    bannerText: payload.bannerText,
    showAnnouncementBar: payload.showAnnouncementBar,
    enableFestiveEffects: payload.enableFestiveEffects,
    showHeroBanner: payload.showHeroBanner,
    show3DArticles: payload.show3DArticles,
    show3DBackground: payload.show3DBackground,
    show3DCardSnow: payload.show3DCardSnow,
    background3DHtml: payload.background3DHtml,
    heroBannerHtml: payload.heroBannerHtml,
    garlandHtml: payload.garlandHtml,
    particlesHtml: payload.particlesHtml,
    roamerHtml: payload.roamerHtml,
  };
  const safeRuntimeJson = safeJsonForScriptTag(runtimePayload)
    .replace(/\{%/g, '\\u007b%')
    .replace(/%\}/g, '%\\u007d');
  const safeSantaJs = buildSantaRoamerRuntimeJs().replace(/<\/script>/gi, '<\\/script>');
  const safeSnowJs = buildWinterCardSnowRuntimeJs().replace(/<\/script>/gi, '<\\/script>');

  return `{% comment %}Auto-generated by OrderPulse Theme Studio — 0ms Pre-Applied Festival Theme (${payload.presetId}){% endcomment %}
{% raw %}
<style id="orderpulse-festival-theme-css" data-op-baked="1">${safeCss}</style>
<script id="orderpulse-festival-baked-boot" data-op-baked="1">
(function () {
  if (document.querySelector('script[data-op-festival-preview-bridge="1"]')) return;
  var FT = ${safeRuntimeJson};
  var BAKED_SIG = ${safeJsonForScriptTag(bakedSig)};
  try {
    document.documentElement.setAttribute('data-orderpulse-festival', FT.presetId || 'festive');
    window.__OP_BAKED_THEME_SIG = BAKED_SIG;
  } catch (e) {}

  ${safeSantaJs}
  ${safeSnowJs}

  function mountBakedTheme() {
    if (!document.body || !FT || !FT.enabled) return;
    if (document.querySelector('script[data-op-festival-preview-bridge="1"]')) return;

    if (FT.show3DBackground && FT.background3DHtml) {
      var bgSig = (FT.presetId || '') + ':' + FT.background3DHtml.length;
      var bgEl = document.getElementById('orderpulse-festival-bg-3d');
      if (!bgEl) {
        bgEl = document.createElement('div');
        bgEl.id = 'orderpulse-festival-bg-3d';
        bgEl.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(bgEl, document.body.firstChild);
      }
      if (bgEl.getAttribute('data-op-sig') !== bgSig) {
        bgEl.setAttribute('data-op-sig', bgSig);
        bgEl.innerHTML = FT.background3DHtml;
      }
    }

    var bannerDismissKey = 'op_fest_banner_closed_' + (FT.presetId || 'festive');
    var dismissed = false;
    try { dismissed = sessionStorage.getItem(bannerDismissKey) === '1'; } catch (e) {}
    if (FT.showAnnouncementBar && FT.bannerText && !dismissed) {
      var bannerSig = (FT.badgeText || '') + '|' + (FT.bannerText || '');
      var bEl = document.getElementById('orderpulse-festival-banner');
      if (!bEl) {
        bEl = document.createElement('div');
        bEl.id = 'orderpulse-festival-banner';
        bEl.style.cssText = 'position:relative;z-index:2147482500;width:100%;padding:9px 38px 9px 14px;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:600;line-height:1.4;letter-spacing:0.01em;box-sizing:border-box;';
        document.body.insertBefore(bEl, document.body.firstChild);
      }
      if (bEl.getAttribute('data-op-sig') !== bannerSig) {
        bEl.setAttribute('data-op-sig', bannerSig);
        var sb = String(FT.badgeText || '').replace(/</g, '&lt;');
        var st = String(FT.bannerText || '').replace(/</g, '&lt;');
        bEl.innerHTML = (sb ? '<span style="display:inline-block;margin-right:8px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.16);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">' + sb + '</span>' : '') +
          '<span>' + st + '</span>' +
          '<button type="button" id="op-fest-banner-close" aria-label="Close festive banner" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:inherit;font-size:16px;font-weight:700;cursor:pointer;padding:2px 6px;opacity:0.8;">&times;</button>';
        var cBtn = document.getElementById('op-fest-banner-close');
        if (cBtn) {
          cBtn.onclick = function () {
            try { sessionStorage.setItem(bannerDismissKey, '1'); } catch (e) {}
            if (bEl && bEl.parentNode) bEl.parentNode.removeChild(bEl);
          };
        }
      }
    }

    if (FT.show3DArticles && FT.garlandHtml) {
      var gSig = (FT.presetId || '') + ':' + FT.garlandHtml.length;
      var gEl = document.getElementById('orderpulse-festival-garland');
      if (!gEl) {
        gEl = document.createElement('div');
        gEl.id = 'orderpulse-festival-garland';
        var hGroup = document.querySelector('.shopify-section-group-header-group, header.header, .header-wrapper');
        if (hGroup && hGroup.parentNode) hGroup.parentNode.insertBefore(gEl, hGroup.nextSibling);
        else document.body.insertBefore(gEl, document.body.firstChild);
      }
      if (gEl.getAttribute('data-op-sig') !== gSig) {
        gEl.setAttribute('data-op-sig', gSig);
        gEl.innerHTML = FT.garlandHtml;
      }
    }

    var isHomeOrCol = window.location.pathname === '/' || window.location.pathname.indexOf('/collections') === 0;
    if (FT.showHeroBanner && FT.heroBannerHtml && isHomeOrCol) {
      var heroSig = (FT.presetId || '') + ':' + FT.heroBannerHtml.length + ':' + (FT.show3DArticles ? 1 : 0);
      var heroEl = document.getElementById('orderpulse-festival-hero');
      if (!heroEl) {
        heroEl = document.createElement('div');
        heroEl.id = 'orderpulse-festival-hero';
        var mainEl = document.querySelector('main#MainContent, main, .content-for-layout');
        if (mainEl) mainEl.insertBefore(heroEl, mainEl.firstChild);
        else document.body.insertBefore(heroEl, document.body.firstChild);
      }
      if (heroEl.getAttribute('data-op-sig') !== heroSig) {
        heroEl.setAttribute('data-op-sig', heroSig);
        heroEl.innerHTML = FT.heroBannerHtml;
      }
    }

    if (FT.enableFestiveEffects && FT.particlesHtml) {
      var fxSig = (FT.presetId || '') + ':' + FT.particlesHtml.length;
      var fxEl = document.getElementById('orderpulse-festival-fx');
      if (!fxEl) {
        fxEl = document.createElement('div');
        fxEl.id = 'orderpulse-festival-fx';
        fxEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(fxEl);
      }
      if (fxEl.getAttribute('data-op-sig') !== fxSig) {
        fxEl.setAttribute('data-op-sig', fxSig);
        fxEl.innerHTML = FT.particlesHtml;
      }
    }

    try { mountFestivalRoamer(FT); } catch (e) {}
    try { mountWinterCardSnow(FT); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBakedTheme);
  } else {
    mountBakedTheme();
  }
})();
</script>
{% endraw %}`;
}


