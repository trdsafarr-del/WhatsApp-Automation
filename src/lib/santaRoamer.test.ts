import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SANTA_ROAM_SCENES,
  buildFlyingSleighSantaSvg,
  buildParachuteSantaSvg,
  buildPeekingSantaSvg,
  buildSantaRoamerCss,
  buildSantaRoamerHtml,
  buildSantaRoamerRuntimeJs,
  buildWalkingSantaSvg,
  pickNextSantaScene,
  shouldEnableSantaRoamer,
} from './santaRoamer';
import {
  DEFAULT_FESTIVAL_THEME_CONFIG,
  buildFestivalThemePayload,
  rewriteShopifyHtmlForFestivalPreview,
} from './festivalThemes';

test('pickNextSantaScene never repeats the exact same scene twice in a row', () => {
  const fixedRolls = [0, 0.15, 0.35, 0.55, 0.78, 0.99];
  for (const prev of SANTA_ROAM_SCENES) {
    for (const r of fixedRolls) {
      const next = pickNextSantaScene(prev.id, () => r);
      assert.notEqual(next.id, prev.id);
    }
  }
});

test('shouldEnableSantaRoamer activates only for enabled Christmas with effects or 3D articles', () => {
  assert.equal(
    shouldEnableSantaRoamer('christmas', {
      enabled: true,
      enableFestiveEffects: true,
      show3DArticles: true,
    }),
    true
  );
  assert.equal(
    shouldEnableSantaRoamer('christmas', {
      enabled: true,
      enableFestiveEffects: false,
      show3DArticles: true,
    }),
    true
  );
  assert.equal(
    shouldEnableSantaRoamer('christmas', {
      enabled: false,
      enableFestiveEffects: true,
      show3DArticles: true,
    }),
    false
  );
  assert.equal(
    shouldEnableSantaRoamer('diwali', {
      enabled: true,
      enableFestiveEffects: true,
      show3DArticles: true,
    }),
    false
  );
});

test('Santa SVG sprites, CSS keyframes, and runtime choreography generate cleanly', () => {
  const walk = buildWalkingSantaSvg();
  const peek = buildPeekingSantaSvg();
  const chute = buildParachuteSantaSvg();
  const sleigh = buildFlyingSleighSantaSvg();

  assert.ok(walk.includes('op-santa-leg-l'));
  assert.ok(walk.includes('op-santa-leg-r'));
  assert.ok(walk.includes('op-santa-arm-wave'));
  assert.ok(walk.includes('op-santa-sack'));
  assert.ok(peek.includes('op-santa-svg-peek'));
  assert.ok(chute.includes('op-santa-svg-chute'));
  assert.ok(sleigh.includes('op-santa-reindeer-b'));

  const html = buildSantaRoamerHtml('christmas', {
    enabled: true,
    enableFestiveEffects: true,
    show3DArticles: true,
  });
  assert.ok(html.includes('op-santa-stage'));
  assert.ok(html.includes('op-santa-actor'));

  const css = buildSantaRoamerCss('christmas', {
    enabled: true,
    enableFestiveEffects: true,
    show3DArticles: true,
  });
  assert.ok(css.includes('opSantaWalkLtr'));
  assert.ok(css.includes('opSantaPeekLeft'));
  assert.ok(css.includes('opSantaPeekRight'));
  assert.ok(css.includes('opSantaParachuteDrop'));
  assert.ok(css.includes('opSantaSleighSwoopLtr'));
  assert.ok(css.includes('opSantaBurstFly'));

  const runtimeJs = buildSantaRoamerRuntimeJs();
  assert.ok(runtimeJs.includes('mountFestivalRoamer'));
  assert.ok(runtimeJs.includes('stopSantaRoamer'));
  assert.ok(runtimeJs.includes('spawnSantaBurst'));
});

test('buildFestivalThemePayload and preview HTML include Roaming Santa when Christmas ON and clear when OFF', () => {
  const onPayload = buildFestivalThemePayload({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: true,
    selectedFestivalId: 'christmas',
  });
  assert.ok(onPayload.roamerHtml.includes('op-santa-stage'));
  assert.ok(onPayload.css.includes('#orderpulse-festival-roamer'));

  const offPayload = buildFestivalThemePayload({
    ...DEFAULT_FESTIVAL_THEME_CONFIG,
    enabled: false,
    selectedFestivalId: 'christmas',
  });
  assert.equal(offPayload.roamerHtml, '');
  assert.equal(offPayload.css, '');

  const sampleHtml = '<!doctype html><html><head><title>Store</title></head><body><main>Hi</main></body></html>';
  const festiveHtml = rewriteShopifyHtmlForFestivalPreview(sampleHtml, 'https://broomiesbakery.in', {
    mode: 'festive',
    payload: onPayload,
  });
  assert.ok(festiveHtml.includes('mountFestivalRoamer'));
  assert.ok(festiveHtml.includes('op-santa-stage'));

  const originalHtml = rewriteShopifyHtmlForFestivalPreview(sampleHtml, 'https://broomiesbakery.in', {
    mode: 'original',
    payload: onPayload,
  });
  assert.ok(originalHtml.includes('"enabled":false'));
  assert.ok(!originalHtml.includes('#orderpulse-festival-roamer'));
});
