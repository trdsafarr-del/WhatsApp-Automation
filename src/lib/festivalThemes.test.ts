import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FESTIVAL_THEME_CONFIG,
  FESTIVAL_THEME_PRESETS,
  buildFestivalStorefrontCss,
  detectActiveFestivalForDate,
  normalizeFestivalThemeConfig,
  resolveEffectiveFestivalPreset,
} from './festivalThemes';

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
