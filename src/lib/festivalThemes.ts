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

/**
 * Compiles non-destructive, scoped CSS for the Shopify storefront bridge.
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
  --color-button: ${primaryRgb};
  --color-button-text: ${primaryTextRgb};
  --color-link: ${primaryRgb};
  --color-badge-background: ${accentRgb};
  --color-badge-foreground: ${textRgb};
  ${isFull ? `--color-background: ${pageBgRgb}; --gradient-background: ${p.pageBg}; --color-foreground: ${textRgb};` : ''}
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

/* Header & Navigation */
.header-wrapper,
header.header,
.site-header,
sticky-header {
  background-color: ${p.headerBg} !important;
  color: ${p.headerText} !important;
  border-bottom: 2px solid ${p.accent} !important;
}

.header-wrapper a,
.header-wrapper .header__menu-item,
.header-wrapper .header__icon,
.header-wrapper summary,
.header-wrapper .h2,
.site-header a {
  color: ${p.headerText} !important;
}

/* Announcement Banner */
#orderpulse-festival-banner {
  background: linear-gradient(90deg, ${p.bannerBg}, ${p.accent}, ${p.bannerBg});
  color: ${p.bannerText};
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
`;

  const fullSurfaceRules = isFull
    ? `
/* Full Storefront Surface & Card Theme */
html,
body,
main#MainContent,
.content-for-layout,
.shopify-section .gradient {
  background-color: ${p.pageBg} !important;
  color: ${p.textColor} !important;
}

.card,
.card-wrapper,
.product-card,
.product-grid-item,
.collection-hero,
.multicolumn-card,
.rich-text__blocks {
  background-color: ${p.surfaceBg} !important;
  border: 1px solid ${p.borderColor} !important;
  border-radius: 12px !important;
}

.card__heading,
.card__heading a,
.product__title,
.product__title h1,
.price-item,
h1, h2, h3 {
  color: ${p.textColor};
}

/* Footer */
footer.footer,
.site-footer,
.shopify-section-group-footer-group {
  background-color: ${p.footerBg} !important;
  color: ${p.footerText} !important;
  border-top: 2px solid ${p.accent} !important;
}

footer.footer a,
footer.footer h2,
footer.footer p,
.site-footer a {
  color: ${p.footerText} !important;
}
`
    : '';

  const fxRules = normalized.enableFestiveEffects
    ? `
@keyframes opFestFloat {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
  15% { opacity: 0.78; }
  85% { opacity: 0.65; }
  100% { transform: translateY(105vh) rotate(220deg); opacity: 0; }
}
#orderpulse-festival-fx {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147482000;
  overflow: hidden;
}
.op-fest-particle {
  position: absolute;
  top: -14px;
  border-radius: 999px;
  animation: opFestFloat linear infinite;
}
`
    : '';

  return `${baseVars}${fullSurfaceRules}${fxRules}`.trim();
}
