import type { FestivalPresetId, FestivalThemeConfig } from './festivalThemes.js';

export type SantaRoamSceneId =
  | 'walk_ltr'
  | 'walk_rtl'
  | 'peek_right'
  | 'peek_left'
  | 'parachute_drop'
  | 'sleigh_swoop';

export interface SantaRoamSceneSpec {
  id: SantaRoamSceneId;
  label: string;
  durationMs: number;
  weight: number;
}

export const SANTA_ROAM_SCENES: SantaRoamSceneSpec[] = [
  { id: 'walk_ltr', label: 'Walking Left to Right', durationMs: 12500, weight: 22 },
  { id: 'peek_right', label: 'Peeking from Right Edge', durationMs: 5200, weight: 18 },
  { id: 'parachute_drop', label: 'Parachuting with Gifts', durationMs: 10500, weight: 16 },
  { id: 'walk_rtl', label: 'Walking Right to Left', durationMs: 12500, weight: 20 },
  { id: 'peek_left', label: 'Peeking from Left Edge', durationMs: 5200, weight: 16 },
  { id: 'sleigh_swoop', label: 'Flying Sleigh & Rudolph Swoop', durationMs: 9200, weight: 16 },
];

export const SANTA_SPEECH_LINES: string[] = [
  'Ho Ho Ho! Merry Christmas!',
  'Santa brought fresh festive treats!',
  'Ho Ho Ho! Surprise Gift Time!',
  'Warm Cakes & Holiday Cheer!',
  'Jingle Bells! Happy Holidays!',
];

/**
 * Picks the next Santa roaming scene so Santa never repeats the exact same
 * entrance twice in a row and feels genuinely unpredictable ("kabhi bhi kahi se aata hai").
 */
export function pickNextSantaScene(
  previousSceneId: SantaRoamSceneId | null,
  rng: () => number = Math.random
): SantaRoamSceneSpec {
  const candidates = SANTA_ROAM_SCENES.filter((s) => s.id !== previousSceneId);
  const pool = candidates.length > 0 ? candidates : SANTA_ROAM_SCENES;
  const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
  const roll = Math.max(0, Math.min(0.999999, rng())) * totalWeight;
  let acc = 0;
  for (const scene of pool) {
    acc += scene.weight;
    if (roll < acc) return scene;
  }
  return pool[0];
}

export function shouldEnableSantaRoamer(
  presetId: FestivalPresetId,
  config: Pick<FestivalThemeConfig, 'enabled' | 'enableFestiveEffects' | 'show3DArticles'>
): boolean {
  if (!config.enabled) return false;
  if (presetId !== 'christmas') return false;
  return config.enableFestiveEffects !== false || config.show3DArticles !== false;
}

/**
 * Articulated 3D-shaded Walking Santa Claus SVG with swinging legs/boots,
 * waving mitten arm, bouncy hat pom-pom & overflowing Christmas gift sack.
 */
export function buildWalkingSantaSvg(): string {
  return `<svg class="op-santa-svg op-santa-svg-walk" viewBox="0 0 180 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opSantaSuit" cx="35%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#FF4D5E"/>
      <stop offset="52%" stop-color="#D91B30"/>
      <stop offset="100%" stop-color="#8A0C1B"/>
    </radialGradient>
    <radialGradient id="opSantaFace" cx="40%" cy="35%" r="68%">
      <stop offset="0%" stop-color="#FFE6D5"/>
      <stop offset="70%" stop-color="#FBCBA9"/>
      <stop offset="100%" stop-color="#E8A982"/>
    </radialGradient>
    <linearGradient id="opSantaSack" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#B45309"/>
      <stop offset="55%" stop-color="#92400E"/>
      <stop offset="100%" stop-color="#5B2108"/>
    </linearGradient>
    <linearGradient id="opSantaGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="55%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="opSantaBoot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
  </defs>

  <!-- Soft snow shadow -->
  <ellipse class="op-santa-shadow" cx="92" cy="189" rx="44" ry="8" fill="#041520" opacity="0.34"/>

  <!-- Gift Sack slung over Santa's back -->
  <g class="op-santa-sack">
    <!-- Mini presents poking out top of sack -->
    <rect x="24" y="62" width="22" height="20" rx="3" fill="#16A34A" transform="rotate(-14 35 72)"/>
    <rect x="33" y="61" width="4.5" height="21" fill="#FDE047" transform="rotate(-14 35 72)"/>
    <rect x="44" y="56" width="18" height="18" rx="3" fill="#2563EB" transform="rotate(10 53 65)"/>
    <rect x="51" y="56" width="4" height="18" fill="#FDE047" transform="rotate(10 53 65)"/>
    <!-- Candy cane -->
    <path d="M56 76 V54 C56 46 66 46 66 53" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
    <path d="M56 72 V54 C56 46 66 46 66 53" stroke="#EF4444" stroke-width="5" stroke-dasharray="4 5" stroke-linecap="round"/>
    <!-- Sack body -->
    <path d="M22 92 C14 114 18 144 40 150 C62 154 78 136 74 106 C71 86 58 76 42 78 C30 80 25 84 22 92 Z" fill="url(#opSantaSack)"/>
    <path d="M36 80 C46 86 58 86 67 80" stroke="#FDE047" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="36" cy="112" rx="8" ry="16" transform="rotate(-18 36 112)" fill="#FDBA74" opacity="0.16"/>
  </g>

  <!-- Back Leg (Articulated walking stride) -->
  <g class="op-santa-leg-l">
    <rect x="74" y="142" width="20" height="32" rx="8" fill="#991B1B"/>
    <rect x="72" y="164" width="24" height="8" rx="4" fill="#FFFDF9"/>
    <path d="M72 170 H102 C106 170 108 175 106 181 C104 185 98 186 90 186 H72 C69 186 68 183 68 179 V173 C68 171 70 170 72 170 Z" fill="url(#opSantaBoot)"/>
  </g>

  <!-- Front Leg (Articulated walking stride) -->
  <g class="op-santa-leg-r">
    <rect x="96" y="142" width="20" height="32" rx="8" fill="#B91C1C"/>
    <rect x="94" y="164" width="24" height="8" rx="4" fill="#FFFDF9"/>
    <path d="M94 170 H126 C130 170 132 175 130 181 C128 185 122 186 114 186 H94 C91 186 90 183 90 179 V173 C90 171 92 170 94 170 Z" fill="url(#opSantaBoot)"/>
  </g>

  <!-- Back Arm holding sack strap -->
  <path d="M74 94 C58 98 52 108 58 118 C64 125 74 122 80 112" fill="url(#opSantaSuit)" stroke="#8A0C1B" stroke-width="1.5"/>
  <circle cx="56" cy="114" r="9" fill="#166534"/>

  <!-- Plump 3D Santa Torso / Velvet Coat -->
  <g class="op-santa-body">
    <path d="M62 88 C58 112 58 136 66 152 H128 C136 136 136 110 128 88 C118 76 74 76 62 88 Z" fill="url(#opSantaSuit)"/>
    <!-- Coat white fur center stripe & bottom trim -->
    <rect x="91" y="84" width="12" height="68" rx="6" fill="#FFFFFF" opacity="0.96"/>
    <rect x="59" y="142" width="76" height="14" rx="7" fill="#FFFFFF"/>
    <!-- Wide Black Leather Belt & Gleaming Gold Buckle -->
    <rect x="60" y="118" width="74" height="13" rx="4" fill="#111827"/>
    <rect x="86" y="114" width="22" height="21" rx="4" fill="url(#opSantaGold)"/>
    <rect x="91" y="119" width="12" height="11" rx="2" fill="#111827"/>
    <!-- Coat highlight -->
    <ellipse cx="78" cy="103" rx="8" ry="14" transform="rotate(-12 78 103)" fill="#FFFFFF" opacity="0.18"/>
  </g>

  <!-- Waving Front Arm -->
  <g class="op-santa-arm-wave">
    <path d="M120 96 C136 92 148 80 154 66" stroke="url(#opSantaSuit)" stroke-width="19" stroke-linecap="round"/>
    <circle cx="151" cy="70" r="10.5" fill="#FFFFFF"/>
    <!-- Cheerful green mitten waving -->
    <circle cx="158" cy="59" r="10" fill="#15803D"/>
    <circle cx="150" cy="57" r="4.5" fill="#16A34A"/>
  </g>

  <!-- Santa Head, Rosy Face, Lush Beard & Bouncy Hat -->
  <g class="op-santa-head">
    <!-- Head base -->
    <circle cx="98" cy="60" r="24" fill="url(#opSantaFace)"/>
    <!-- Rosy cheeks -->
    <ellipse cx="86" cy="65" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.55"/>
    <ellipse cx="111" cy="65" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.55"/>
    <!-- Twinkling eyes -->
    <circle cx="90" cy="56" r="3" fill="#0F172A"/>
    <circle cx="107" cy="56" r="3" fill="#0F172A"/>
    <circle cx="91" cy="55" r="1.1" fill="#FFFFFF"/>
    <circle cx="108" cy="55" r="1.1" fill="#FFFFFF"/>
    <!-- Fluffy white eyebrows -->
    <path d="M84 50 Q90 47 95 50" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M102 50 Q107 47 113 50" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
    <!-- Lush 3D White Beard -->
    <path d="M74 63 C70 84 82 104 99 106 C116 104 126 84 122 63 C114 68 106 70 98 70 C90 70 82 68 74 63 Z" fill="#FFFFFF"/>
    <path d="M80 76 C84 92 92 98 99 99 C106 98 114 92 117 76" stroke="#E2E8F0" stroke-width="2" fill="none" opacity="0.8"/>
    <!-- Cheerful Moustache & Smile -->
    <path d="M98 67 C92 64 82 67 80 73 C86 76 93 74 98 71 C103 74 110 76 116 73 C114 67 104 64 98 67 Z" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
    <path d="M93 75 Q98 81 104 75" stroke="#BE123C" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <!-- Cute round button nose -->
    <circle cx="98.5" cy="63" r="4.8" fill="#F43F5E"/>
    <circle cx="97" cy="61.5" r="1.6" fill="#FFE4E6"/>

    <!-- Santa Red Hat + Fluffy Brim + Bouncing Pom-Pom -->
    <path d="M72 46 C76 22 102 14 120 26 C128 32 134 38 136 46 C124 44 118 42 114 36 C108 42 86 44 72 46 Z" fill="url(#opSantaSuit)"/>
    <rect x="70" y="39" width="56" height="12" rx="6" fill="#FFFFFF"/>
    <g class="op-santa-pom">
      <circle cx="138" cy="46" r="8.5" fill="#FFFFFF"/>
      <circle cx="136" cy="44" r="3" fill="#F1F5F9"/>
    </g>
  </g>
</svg>`;
}

/**
 * Playful Santa peeking unexpectedly out from the left or right viewport edge,
 * waving hello with a cute wrapped Christmas present!
 */
export function buildPeekingSantaSvg(): string {
  return `<svg class="op-santa-svg op-santa-svg-peek" viewBox="0 0 150 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opSantaPeekRed" cx="35%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#FF4D5E"/>
      <stop offset="55%" stop-color="#D91B30"/>
      <stop offset="100%" stop-color="#8A0C1B"/>
    </radialGradient>
    <radialGradient id="opSantaPeekSkin" cx="42%" cy="36%" r="68%">
      <stop offset="0%" stop-color="#FFE6D5"/>
      <stop offset="100%" stop-color="#F6BE99"/>
    </radialGradient>
  </defs>
  <!-- Santa Torso Edge -->
  <path d="M0 98 C24 88 58 92 78 106 C92 116 96 138 92 158 H0 Z" fill="url(#opSantaPeekRed)"/>
  <rect x="0" y="128" width="90" height="12" rx="4" fill="#111827"/>
  <rect x="38" y="124" width="18" height="19" rx="3" fill="#F59E0B"/>
  <rect x="42" y="128" width="10" height="11" rx="2" fill="#111827"/>
  <!-- Waving Hand & Gift Box -->
  <g class="op-santa-arm-wave">
    <path d="M74 114 C96 108 114 96 122 80" stroke="url(#opSantaPeekRed)" stroke-width="18" stroke-linecap="round"/>
    <circle cx="118" cy="84" r="10" fill="#FFFFFF"/>
    <circle cx="126" cy="72" r="10" fill="#15803D"/>
    <circle cx="118" cy="70" r="4.5" fill="#16A34A"/>
  </g>
  <!-- Cute Mini Gift held at edge -->
  <rect x="14" y="114" width="26" height="24" rx="4" fill="#16A34A"/>
  <rect x="24" y="114" width="6" height="24" fill="#FDE047"/>
  <rect x="14" y="123" width="26" height="5" fill="#FDE047"/>
  <!-- Smiling Santa Head -->
  <circle cx="62" cy="68" r="27" fill="url(#opSantaPeekSkin)"/>
  <ellipse cx="48" cy="74" rx="6" ry="3.8" fill="#FB7185" opacity="0.58"/>
  <ellipse cx="77" cy="74" rx="6" ry="3.8" fill="#FB7185" opacity="0.58"/>
  <circle cx="53" cy="63" r="3.4" fill="#0F172A"/>
  <circle cx="72" cy="63" r="3.4" fill="#0F172A"/>
  <circle cx="54" cy="62" r="1.2" fill="#FFFFFF"/>
  <circle cx="73" cy="62" r="1.2" fill="#FFFFFF"/>
  <path d="M46 56 Q53 52 59 56" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M66 56 Q72 52 79 56" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M35 72 C32 96 46 116 64 118 C82 116 94 96 90 72 C80 78 71 80 63 80 C54 80 44 78 35 72 Z" fill="#FFFFFF"/>
  <path d="M63 75 C56 72 45 75 43 82 C50 86 58 83 63 80 C68 83 76 86 83 82 C81 75 70 72 63 75 Z" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
  <path d="M57 84 Q63 91 70 84" stroke="#BE123C" stroke-width="2.8" stroke-linecap="round" fill="none"/>
  <circle cx="63" cy="71" r="5.2" fill="#F43F5E"/>
  <circle cx="61.2" cy="69.5" r="1.7" fill="#FFE4E6"/>
  <!-- Santa Hat -->
  <path d="M34 52 C40 22 74 12 96 28 C106 36 112 44 114 54 C100 50 92 48 86 42 C78 48 52 50 34 52 Z" fill="url(#opSantaPeekRed)"/>
  <rect x="31" y="45" width="64" height="13" rx="6.5" fill="#FFFFFF"/>
  <g class="op-santa-pom">
    <circle cx="116" cy="54" r="9.5" fill="#FFFFFF"/>
  </g>
</svg>`;
}

/**
 * Parachuting Santa gently floating down from the top sky under a
 * red-and-white candy-cane striped Christmas parachute carrying a gift!
 */
export function buildParachuteSantaSvg(): string {
  return `<svg class="op-santa-svg op-santa-svg-chute" viewBox="0 0 170 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="opChuteRed" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#FF4D5E"/>
      <stop offset="65%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#881337"/>
    </radialGradient>
  </defs>
  <!-- Candy-cane Striped Parachute Canopy -->
  <path d="M18 76 C18 28 50 10 85 10 C120 10 152 28 152 76 C136 66 118 66 106 76 C96 66 74 66 64 76 C52 66 34 66 18 76 Z" fill="url(#opChuteRed)"/>
  <path d="M52 16 C44 36 42 54 44 70 C54 66 60 70 64 76 C64 52 68 28 74 11 C66 12 58 13 52 16 Z" fill="#FFFFFF" opacity="0.95"/>
  <path d="M96 11 C102 28 106 52 106 76 C110 70 116 66 126 70 C128 54 126 36 118 16 C112 13 104 12 96 11 Z" fill="#FFFFFF" opacity="0.95"/>
  <path d="M18 76 C34 66 52 66 64 76 C74 66 96 66 106 76 C118 66 136 66 152 76" stroke="#FDE047" stroke-width="2.6" fill="none"/>
  <!-- Gold Parachute Cords -->
  <line x1="24" y1="74" x2="72" y2="142" stroke="#FDE047" stroke-width="1.8" opacity="0.88"/>
  <line x1="64" y1="74" x2="78" y2="142" stroke="#FDE047" stroke-width="1.8" opacity="0.88"/>
  <line x1="106" y1="74" x2="92" y2="142" stroke="#FDE047" stroke-width="1.8" opacity="0.88"/>
  <line x1="146" y1="74" x2="98" y2="142" stroke="#FDE047" stroke-width="1.8" opacity="0.88"/>

  <!-- Dangling Santa holding parachute & gift -->
  <g transform="translate(46, 118)">
    <!-- Legs dangling -->
    <rect x="24" y="66" width="12" height="22" rx="5" fill="#B91C1C"/>
    <rect x="42" y="66" width="12" height="22" rx="5" fill="#991B1B"/>
    <ellipse cx="30" cy="90" rx="9" ry="5.5" fill="#0F172A"/>
    <ellipse cx="48" cy="90" rx="9" ry="5.5" fill="#0F172A"/>
    <!-- Coat -->
    <rect x="18" y="34" width="42" height="38" rx="14" fill="url(#opChuteRed)"/>
    <rect x="18" y="52" width="42" height="8" rx="2" fill="#111827"/>
    <rect x="33" y="49" width="12" height="13" rx="2" fill="#F59E0B"/>
    <!-- Arms up gripping harness -->
    <path d="M22 42 L14 22" stroke="#DC2626" stroke-width="10" stroke-linecap="round"/>
    <path d="M56 42 L64 22" stroke="#DC2626" stroke-width="10" stroke-linecap="round"/>
    <circle cx="14" cy="21" r="6" fill="#15803D"/>
    <circle cx="64" cy="21" r="6" fill="#15803D"/>
    <!-- Head & Beard -->
    <circle cx="39" cy="22" r="15" fill="#FBCBA9"/>
    <circle cx="34" cy="19" r="2.2" fill="#0F172A"/>
    <circle cx="44" cy="19" r="2.2" fill="#0F172A"/>
    <path d="M24 24 C23 38 30 47 39 48 C48 47 55 38 54 24 Z" fill="#FFFFFF"/>
    <circle cx="39" cy="24" r="3.2" fill="#F43F5E"/>
    <!-- Hat -->
    <path d="M23 13 C26 -2 46 -6 56 6 L62 14 Z" fill="url(#opChuteRed)"/>
    <rect x="22" y="9" width="34" height="7" rx="3.5" fill="#FFFFFF"/>
    <circle cx="62" cy="14" r="5" fill="#FFFFFF"/>
    <!-- Gift box dangling under Santa -->
    <rect x="50" y="54" width="24" height="22" rx="4" fill="#16A34A"/>
    <rect x="59" y="54" width="5" height="22" fill="#FDE047"/>
    <rect x="50" y="62" width="24" height="5" fill="#FDE047"/>
  </g>
</svg>`;
}

/**
 * Vibrant 3D-colored Santa in Crimson-Gold Sleigh pulled by Rudolph with glowing red nose!
 */
export function buildFlyingSleighSantaSvg(): string {
  return `<svg class="op-santa-svg op-santa-svg-sleigh" viewBox="0 0 320 118" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="opSleighCrimson" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="60%" stop-color="#B91C1C"/>
      <stop offset="100%" stop-color="#7F1D1D"/>
    </linearGradient>
    <linearGradient id="opSleighGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <!-- Golden Stardust Trail -->
  <circle cx="14" cy="76" r="4" fill="#FEF08A" opacity="0.8"/>
  <circle cx="32" cy="84" r="3" fill="#FDE047" opacity="0.7"/>
  <circle cx="24" cy="64" r="2.5" fill="#FFFFFF" opacity="0.85"/>
  <circle cx="48" cy="74" r="3.5" fill="#FEF08A" opacity="0.65"/>

  <!-- Gift pile in back of sleigh -->
  <rect x="56" y="42" width="22" height="22" rx="3" fill="#16A34A" transform="rotate(-10 67 53)"/>
  <rect x="65" y="42" width="4.5" height="22" fill="#FDE047" transform="rotate(-10 67 53)"/>
  <rect x="74" y="38" width="20" height="20" rx="3" fill="#2563EB" transform="rotate(8 84 48)"/>
  <rect x="82" y="38" width="4" height="20" fill="#FDE047" transform="rotate(8 84 48)"/>

  <!-- Santa seated & waving in Sleigh -->
  <circle cx="108" cy="40" r="12" fill="#FBCBA9"/>
  <path d="M96 42 C96 54 102 60 108 61 C114 60 120 54 120 42 Z" fill="#FFFFFF"/>
  <circle cx="105" cy="38" r="1.8" fill="#0F172A"/>
  <circle cx="112" cy="38" r="1.8" fill="#0F172A"/>
  <circle cx="109" cy="42" r="2.6" fill="#F43F5E"/>
  <path d="M95 34 C98 20 112 18 122 28 L126 34 Z" fill="#DC2626"/>
  <rect x="94" y="30" width="28" height="6" rx="3" fill="#FFFFFF"/>
  <circle cx="127" cy="34" r="4.5" fill="#FFFFFF"/>
  <path d="M95 54 H122 V72 H95 Z" fill="#DC2626"/>
  <g class="op-santa-arm-wave" style="transform-origin:118px 58px;">
    <path d="M118 58 L134 42" stroke="#DC2626" stroke-width="8" stroke-linecap="round"/>
    <circle cx="135" cy="40" r="5.5" fill="#15803D"/>
  </g>

  <!-- Crimson & Gold Sleigh Body + Runners -->
  <path d="M46 92 C78 100 126 98 150 80 L156 74 C132 90 84 92 54 84 C46 82 44 74 50 70 C40 72 38 88 46 92 Z" fill="url(#opSleighGold)"/>
  <path d="M56 80 L48 52 C68 52 80 62 100 64 L132 54 L140 80 Z" fill="url(#opSleighCrimson)" stroke="#FDE047" stroke-width="2.5"/>
  <path d="M54 64 Q94 74 136 62" stroke="#FDE047" stroke-width="2.4" fill="none"/>

  <!-- Golden Reins -->
  <path d="M134 62 Q180 72 224 56 T278 44" stroke="#FDE047" stroke-width="2.2" fill="none"/>

  <!-- Reindeer 1 (Dasher) -->
  <g class="op-santa-reindeer-a">
    <ellipse cx="212" cy="66" rx="20" ry="10" fill="#92400E"/>
    <path d="M226 60 L236 44 L244 48 L234 66 Z" fill="#92400E"/>
    <ellipse cx="242" cy="46" rx="8" ry="6" fill="#A16207"/>
    <path d="M239 40 L244 28 M242 35 L248 33 M236 40 L234 30" stroke="#FDE68A" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M200 72 L192 88 M208 74 L212 90 M222 72 L232 88 M228 70 L240 84" stroke="#78350F" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="224" y="54" width="12" height="4" rx="2" fill="#EF4444"/>
  </g>

  <!-- Lead Reindeer (Rudolph with glowing bright red nose!) -->
  <g class="op-santa-reindeer-b">
    <ellipse cx="272" cy="56" rx="21" ry="10.5" fill="#A16207"/>
    <path d="M286 50 L296 34 L305 38 L294 56 Z" fill="#A16207"/>
    <ellipse cx="303" cy="36" rx="8.5" ry="6.2" fill="#B45309"/>
    <circle cx="304" cy="34" r="1.8" fill="#0F172A"/>
    <!-- Glowing Rudolph Red Nose -->
    <circle cx="312" cy="37" r="7" fill="#EF4444" opacity="0.38"/>
    <circle cx="312" cy="37" r="3.6" fill="#FF2E43"/>
    <path d="M299 30 L304 18 M302 25 L309 23 M296 30 L293 20" stroke="#FDE68A" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M260 62 L252 78 M268 64 L272 80 M282 62 L292 78 M288 60 L300 74" stroke="#78350F" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="284" y="44" width="12" height="4.5" rx="2" fill="#16A34A"/>
    <circle cx="290" cy="49" r="3" fill="#FDE047"/>
  </g>
</svg>`;
}

/**
 * Generates the initial HTML markup for the Roaming Santa Claus stage container.
 */
export function buildSantaRoamerHtml(
  presetId: FestivalPresetId,
  config: Pick<FestivalThemeConfig, 'enabled' | 'enableFestiveEffects' | 'show3DArticles'>
): string {
  if (!shouldEnableSantaRoamer(presetId, config)) return '';
  return `<div class="op-santa-stage" data-santa-stage="1" data-active-scene="idle">
  <div class="op-santa-actor op-santa-hidden" role="button" tabindex="0" aria-label="Roaming Santa Claus — click for Christmas surprise">
    <div class="op-santa-bubble" aria-hidden="true">Ho Ho Ho! Merry Christmas!</div>
    <div class="op-santa-sprite"></div>
  </div>
  <div class="op-santa-bursts" aria-hidden="true"></div>
</div>`;
}

/**
 * Generates scoped CSS animations for all 6 roaming Santa scenes, articulated
 * walking legs, waving mitten, bouncy pom-pom, speech bubbles, and click gift bursts.
 */
export function buildSantaRoamerCss(
  presetId: FestivalPresetId,
  config: Pick<FestivalThemeConfig, 'enabled' | 'enableFestiveEffects' | 'show3DArticles'>
): string {
  if (!shouldEnableSantaRoamer(presetId, config)) return '';

  return `
/* OrderPulse Roaming Interactive 3D Santa Claus ("Chalta Firta Ghumta Santa") */
@keyframes opSantaWalkLtr {
  0% { transform: translate3d(-180px, 0, 0); opacity: 0; }
  5% { opacity: 1; }
  94% { opacity: 1; }
  100% { transform: translate3d(calc(100vw + 180px), 0, 0); opacity: 0; }
}
@keyframes opSantaWalkRtl {
  0% { transform: translate3d(calc(100vw + 180px), 0, 0); opacity: 0; }
  5% { opacity: 1; }
  94% { opacity: 1; }
  100% { transform: translate3d(-180px, 0, 0); opacity: 0; }
}
@keyframes opSantaWalkBounce {
  0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
  50% { transform: translateY(-9px) rotate(2deg); }
}
@keyframes opSantaStrideL {
  0%, 100% { transform: rotate(-18deg); }
  50% { transform: rotate(20deg); }
}
@keyframes opSantaStrideR {
  0%, 100% { transform: rotate(20deg); }
  50% { transform: rotate(-18deg); }
}
@keyframes opSantaWave {
  0%, 100% { transform: rotate(-10deg); }
  50% { transform: rotate(18deg); }
}
@keyframes opSantaPom {
  0%, 100% { transform: translateY(0px) rotate(-4deg); }
  50% { transform: translateY(-4px) rotate(8deg); }
}
@keyframes opSantaPeekLeft {
  0% { transform: translate3d(-135px, 0, 0) rotate(-6deg); opacity: 0; }
  18% { transform: translate3d(-8px, 0, 0) rotate(2deg); opacity: 1; }
  36% { transform: translate3d(-14px, -4px, 0) rotate(-1deg); opacity: 1; }
  76% { transform: translate3d(-6px, 0, 0) rotate(2deg); opacity: 1; }
  100% { transform: translate3d(-140px, 6px, 0) rotate(-8deg); opacity: 0; }
}
@keyframes opSantaPeekRight {
  0% { transform: translate3d(135px, 0, 0) rotate(6deg); opacity: 0; }
  18% { transform: translate3d(8px, 0, 0) rotate(-2deg); opacity: 1; }
  36% { transform: translate3d(14px, -4px, 0) rotate(1deg); opacity: 1; }
  76% { transform: translate3d(6px, 0, 0) rotate(-2deg); opacity: 1; }
  100% { transform: translate3d(140px, 6px, 0) rotate(8deg); opacity: 0; }
}
@keyframes opSantaParachuteDrop {
  0% { transform: translate3d(0, -240px, 0); opacity: 0; }
  10% { opacity: 1; }
  88% { opacity: 1; }
  100% { transform: translate3d(0, calc(100vh + 220px), 0); opacity: 0; }
}
@keyframes opSantaParachuteSway {
  0%, 100% { transform: translateX(-28px) rotate(-9deg); }
  50% { transform: translateX(28px) rotate(9deg); }
}
@keyframes opSantaSleighSwoopLtr {
  0% { transform: translate3d(-340px, 24px, 0) rotate(-6deg) scale(0.92); opacity: 0; }
  10% { opacity: 1; }
  48% { transform: translate3d(44vw, -34px, 0) rotate(3deg) scale(1.04); opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translate3d(calc(100vw + 340px), -12px, 0) rotate(-4deg) scale(0.94); opacity: 0; }
}
@keyframes opSantaSleighSwoopRtl {
  0% { transform: translate3d(calc(100vw + 340px), 24px, 0) rotate(6deg) scale(0.92); opacity: 0; }
  10% { opacity: 1; }
  48% { transform: translate3d(44vw, -34px, 0) rotate(-3deg) scale(1.04); opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translate3d(-340px, -12px, 0) rotate(4deg) scale(0.94); opacity: 0; }
}
@keyframes opSantaReindeerGallop {
  0%, 100% { transform: translateY(0px) rotate(-3deg); }
  50% { transform: translateY(-7px) rotate(4deg); }
}
@keyframes opSantaBubblePop {
  0%, 10% { opacity: 0; transform: translate(-50%, 8px) scale(0.84); }
  18%, 80% { opacity: 1; transform: translate(-50%, 0px) scale(1); }
  90%, 100% { opacity: 0; transform: translate(-50%, -6px) scale(0.92); }
}
@keyframes opSantaBubbleEdge {
  0%, 10% { opacity: 0; transform: translateY(8px) scale(0.84); }
  18%, 80% { opacity: 1; transform: translateY(0px) scale(1); }
  90%, 100% { opacity: 0; transform: translateY(-6px) scale(0.92); }
}
@keyframes opSantaCheerJump {
  0%, 100% { transform: scale(1) translateY(0); }
  35% { transform: scale(1.14) translateY(-18px) rotate(-4deg); }
  65% { transform: scale(1.06) translateY(-6px) rotate(4deg); }
}
@keyframes opSantaBurstFly {
  0% { transform: translate3d(0, 0, 0) scale(0.5) rotate(0deg); opacity: 1; }
  100% { transform: translate3d(var(--op-bx, 40px), var(--op-by, -60px), 0) scale(1.15) rotate(220deg); opacity: 0; }
}

#orderpulse-festival-roamer {
  position: fixed;
  inset: 0;
  z-index: 2147482150;
  pointer-events: none;
  overflow: hidden;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
#orderpulse-festival-roamer .op-santa-stage {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
#orderpulse-festival-roamer .op-santa-actor {
  position: fixed;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  will-change: transform, opacity;
  filter: drop-shadow(0 12px 20px rgba(4, 15, 24, 0.42));
}
#orderpulse-festival-roamer .op-santa-hidden {
  opacity: 0;
  pointer-events: none;
  transform: translate3d(-9999px, -9999px, 0);
}
#orderpulse-festival-roamer .op-santa-sprite {
  display: block;
  position: relative;
}
#orderpulse-festival-roamer .op-santa-svg {
  display: block;
  width: 100%;
  height: auto;
}
#orderpulse-festival-roamer .op-santa-bubble {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 4px);
  transform: translate(-50%, 0);
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #FFFDF7 0%, #FEF3C7 100%);
  color: #881337 !important;
  border: 2px solid #D97706;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
  pointer-events: none;
  z-index: 4;
  animation: opSantaBubblePop var(--op-santa-dur, 5.2s) ease-in-out both;
}
#orderpulse-festival-roamer .op-santa-bubble::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  border-width: 6px 6px 0 6px;
  border-style: solid;
  border-color: #D97706 transparent transparent transparent;
}
#orderpulse-festival-roamer .op-santa-bubble-force {
  animation: none !important;
  opacity: 1 !important;
  transform: translate(-50%, -2px) scale(1.05) !important;
}

/* Articulated character sub-animations */
#orderpulse-festival-roamer .op-santa-leg-l {
  transform-origin: 84px 146px;
  animation: opSantaStrideL 0.62s ease-in-out infinite;
}
#orderpulse-festival-roamer .op-santa-leg-r {
  transform-origin: 106px 146px;
  animation: opSantaStrideR 0.62s ease-in-out infinite;
}
#orderpulse-festival-roamer .op-santa-arm-wave {
  transform-origin: 122px 96px;
  animation: opSantaWave 0.72s ease-in-out infinite;
}
#orderpulse-festival-roamer .op-santa-pom {
  transform-origin: 130px 44px;
  animation: opSantaPom 0.62s ease-in-out infinite;
}
#orderpulse-festival-roamer .op-santa-reindeer-a {
  transform-origin: 215px 65px;
  animation: opSantaReindeerGallop 0.78s ease-in-out infinite;
}
#orderpulse-festival-roamer .op-santa-reindeer-b {
  transform-origin: 275px 55px;
  animation: opSantaReindeerGallop 0.78s ease-in-out 0.28s infinite;
}
#orderpulse-festival-roamer .op-santa-cheer .op-santa-sprite {
  animation: opSantaCheerJump 0.55s ease-out !important;
}

/* Scene 1: Walking Left -> Right along bottom snow */
#orderpulse-festival-roamer .op-scene-walk_ltr {
  bottom: 8px;
  left: 0;
  width: clamp(104px, 10vw, 136px);
  animation: opSantaWalkLtr var(--op-santa-dur, 12.5s) linear forwards;
}
#orderpulse-festival-roamer .op-scene-walk_ltr .op-santa-sprite {
  animation: opSantaWalkBounce 0.62s ease-in-out infinite;
}

/* Scene 2: Walking Right -> Left along bottom snow (sprite flipped, speech bubble upright!) */
#orderpulse-festival-roamer .op-scene-walk_rtl {
  bottom: 8px;
  left: 0;
  width: clamp(104px, 10vw, 136px);
  animation: opSantaWalkRtl var(--op-santa-dur, 12.5s) linear forwards;
}
#orderpulse-festival-roamer .op-scene-walk_rtl .op-santa-svg {
  transform: scaleX(-1);
}
#orderpulse-festival-roamer .op-scene-walk_rtl .op-santa-sprite {
  animation: opSantaWalkBounce 0.62s ease-in-out infinite;
}

/* Scene 3: Peeking unexpectedly from Left viewport edge */
#orderpulse-festival-roamer .op-scene-peek_left {
  left: 0;
  top: var(--op-santa-top, 46%);
  width: clamp(108px, 10.5vw, 138px);
  animation: opSantaPeekLeft var(--op-santa-dur, 5.2s) cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
#orderpulse-festival-roamer .op-scene-peek_left .op-santa-bubble {
  left: 14px;
  right: auto;
  transform: none;
  animation-name: opSantaBubbleEdge;
}
#orderpulse-festival-roamer .op-scene-peek_left .op-santa-bubble::after {
  left: 34px;
  transform: none;
}
#orderpulse-festival-roamer .op-scene-peek_left .op-santa-bubble-force {
  transform: translateY(-2px) scale(1.05) !important;
}

/* Scene 4: Peeking unexpectedly from Right viewport edge */
#orderpulse-festival-roamer .op-scene-peek_right {
  right: 0;
  top: var(--op-santa-top, 42%);
  width: clamp(108px, 10.5vw, 138px);
  animation: opSantaPeekRight var(--op-santa-dur, 5.2s) cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
#orderpulse-festival-roamer .op-scene-peek_right .op-santa-svg {
  transform: scaleX(-1);
}
#orderpulse-festival-roamer .op-scene-peek_right .op-santa-bubble {
  left: auto;
  right: 14px;
  transform: none;
  animation-name: opSantaBubbleEdge;
}
#orderpulse-festival-roamer .op-scene-peek_right .op-santa-bubble::after {
  left: auto;
  right: 34px;
  transform: none;
}
#orderpulse-festival-roamer .op-scene-peek_right .op-santa-bubble-force {
  transform: translateY(-2px) scale(1.05) !important;
}

/* Scene 5: Parachuting gently down from top sky */
#orderpulse-festival-roamer .op-scene-parachute_drop {
  top: 0;
  left: var(--op-santa-left, 72%);
  width: clamp(104px, 10vw, 134px);
  animation: opSantaParachuteDrop var(--op-santa-dur, 10.5s) linear forwards;
}
#orderpulse-festival-roamer .op-scene-parachute_drop .op-santa-sprite {
  animation: opSantaParachuteSway 2.8s ease-in-out infinite;
}

/* Scene 6: Close-up Colorful 3D Sleigh & Rudolph Swoop */
#orderpulse-festival-roamer .op-scene-sleigh_swoop {
  top: var(--op-santa-top, 22%);
  left: 0;
  width: clamp(210px, 22vw, 290px);
  animation: opSantaSleighSwoopLtr var(--op-santa-dur, 9.2s) ease-in-out forwards;
}
#orderpulse-festival-roamer .op-scene-sleigh_swoop.op-santa-rtl {
  animation-name: opSantaSleighSwoopRtl;
}
#orderpulse-festival-roamer .op-scene-sleigh_swoop.op-santa-rtl .op-santa-svg {
  transform: scaleX(-1);
}

/* Interactive Click Gift & Star Burst */
#orderpulse-festival-roamer .op-santa-bursts {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
#orderpulse-festival-roamer .op-santa-burst-dot {
  position: fixed;
  font-size: 18px;
  line-height: 1;
  pointer-events: none;
  animation: opSantaBurstFly 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35));
}

@media (max-width: 768px) {
  #orderpulse-festival-roamer .op-scene-walk_ltr,
  #orderpulse-festival-roamer .op-scene-walk_rtl {
    width: 92px;
  }
  #orderpulse-festival-roamer .op-scene-peek_left,
  #orderpulse-festival-roamer .op-scene-peek_right {
    width: 94px;
  }
  #orderpulse-festival-roamer .op-scene-parachute_drop {
    width: 90px;
  }
  #orderpulse-festival-roamer .op-scene-sleigh_swoop {
    width: 195px;
  }
  #orderpulse-festival-roamer .op-santa-bubble {
    font-size: 10.5px;
    padding: 4px 9px;
  }
}
`.trim();
}

function safeInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Generates a self-contained vanilla JS function body (`window.__opMountSantaRoamer`)
 * shared identically by both the live dashboard preview iframe AND live Shopify `widget.js`.
 * Handles dynamic multi-direction surprise Santa appearances, click gift bursts,
 * and 100% leak-free cleanup when the festival theme is turned OFF.
 */
export function buildSantaRoamerRuntimeJs(): string {
  const spritesJson = safeInlineJson({
    walk: buildWalkingSantaSvg(),
    peek: buildPeekingSantaSvg(),
    chute: buildParachuteSantaSvg(),
    sleigh: buildFlyingSleighSantaSvg(),
  });
  const scenesJson = safeInlineJson(SANTA_ROAM_SCENES);
  const linesJson = safeInlineJson(SANTA_SPEECH_LINES);

  return `
  var OP_SANTA_SPRITES = ${spritesJson};
  var OP_SANTA_SCENES = ${scenesJson};
  var OP_SANTA_LINES = ${linesJson};
  var opSantaTimer = null;
  var opSantaLastScene = null;
  var opSantaLineIdx = 0;

  function stopSantaRoamer() {
    if (opSantaTimer) {
      clearTimeout(opSantaTimer);
      opSantaTimer = null;
    }
    var host = document.getElementById('orderpulse-festival-roamer');
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }

  function pickSantaScene(prevId) {
    var pool = [];
    var total = 0;
    for (var i = 0; i < OP_SANTA_SCENES.length; i++) {
      if (OP_SANTA_SCENES[i].id !== prevId) {
        pool.push(OP_SANTA_SCENES[i]);
        total += OP_SANTA_SCENES[i].weight;
      }
    }
    if (!pool.length) pool = OP_SANTA_SCENES;
    var r = Math.random() * (total || 1);
    var acc = 0;
    for (var j = 0; j < pool.length; j++) {
      acc += pool[j].weight;
      if (r < acc) return pool[j];
    }
    return pool[0];
  }

  function spawnSantaBurst(host, clientX, clientY) {
    var burstWrap = host.querySelector('.op-santa-bursts');
    if (!burstWrap) return;
    var icons = ['\\u2728', '\\uD83C\\uDF81', '\\u2B50', '\\uD83C\\uDF84', '\\u2744', '\\uD83C\\uDF81', '\\u2728', '\\u2B50'];
    for (var i = 0; i < icons.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'op-santa-burst-dot';
      dot.textContent = icons[i];
      var angle = (Math.PI * 2 * i) / icons.length + (Math.random() * 0.4 - 0.2);
      var dist = 48 + Math.random() * 54;
      dot.style.left = clientX + 'px';
      dot.style.top = clientY + 'px';
      dot.style.setProperty('--op-bx', Math.round(Math.cos(angle) * dist) + 'px');
      dot.style.setProperty('--op-by', Math.round(Math.sin(angle) * dist - 26) + 'px');
      burstWrap.appendChild(dot);
      (function (el) {
        setTimeout(function () {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 1050);
      })(dot);
    }
  }

  function runSantaScene(host, forcedSceneId) {
    if (!host || !document.body.contains(host)) return;
    var stage = host.querySelector('.op-santa-stage');
    var actor = host.querySelector('.op-santa-actor');
    var sprite = host.querySelector('.op-santa-sprite');
    var bubble = host.querySelector('.op-santa-bubble');
    if (!stage || !actor || !sprite || !bubble) return;

    var chosen = null;
    if (forcedSceneId) {
      for (var k = 0; k < OP_SANTA_SCENES.length; k++) {
        if (OP_SANTA_SCENES[k].id === forcedSceneId) {
          chosen = OP_SANTA_SCENES[k];
          break;
        }
      }
    }
    if (!chosen) chosen = pickSantaScene(opSantaLastScene);
    opSantaLastScene = chosen.id;

    var spriteKey = 'walk';
    if (chosen.id === 'peek_left' || chosen.id === 'peek_right') spriteKey = 'peek';
    else if (chosen.id === 'parachute_drop') spriteKey = 'chute';
    else if (chosen.id === 'sleigh_swoop') spriteKey = 'sleigh';

    sprite.innerHTML = OP_SANTA_SPRITES[spriteKey] || OP_SANTA_SPRITES.walk;

    var line = OP_SANTA_LINES[opSantaLineIdx % OP_SANTA_LINES.length];
    opSantaLineIdx += 1;
    bubble.textContent = line;
    bubble.classList.remove('op-santa-bubble-force');

    // Reset animation cleanly so every new entrance plays from 0%
    actor.className = 'op-santa-actor op-santa-hidden';
    actor.style.removeProperty('--op-santa-top');
    actor.style.removeProperty('--op-santa-left');
    actor.style.setProperty('--op-santa-dur', (chosen.durationMs / 1000).toFixed(2) + 's');

    if (chosen.id === 'peek_left' || chosen.id === 'peek_right') {
      var randTop = 26 + Math.floor(Math.random() * 42);
      actor.style.setProperty('--op-santa-top', randTop + '%');
    } else if (chosen.id === 'parachute_drop') {
      var randLeft = 14 + Math.floor(Math.random() * 68);
      actor.style.setProperty('--op-santa-left', randLeft + '%');
    } else if (chosen.id === 'sleigh_swoop') {
      var skyTop = 16 + Math.floor(Math.random() * 24);
      actor.style.setProperty('--op-santa-top', skyTop + '%');
    }

    // Force layout reflow before attaching active scene class
    void actor.offsetWidth;

    var extraDir = chosen.id === 'sleigh_swoop' && Math.random() > 0.5 ? ' op-santa-rtl' : '';
    actor.className = 'op-santa-actor op-scene-' + chosen.id + extraDir;
    stage.setAttribute('data-active-scene', chosen.id);

    if (opSantaTimer) clearTimeout(opSantaTimer);
    var pauseMs = 1500 + Math.floor(Math.random() * 1400);
    opSantaTimer = setTimeout(function () {
      runSantaScene(host, null);
    }, chosen.durationMs + pauseMs);
  }

  function mountFestivalRoamer(ft) {
    if (!ft || !ft.enabled || !ft.roamerHtml || !document.body) {
      stopSantaRoamer();
      return;
    }
    var host = document.getElementById('orderpulse-festival-roamer');
    var isNew = false;
    if (!host) {
      host = document.createElement('div');
      host.id = 'orderpulse-festival-roamer';
      document.body.appendChild(host);
      isNew = true;
    }
    if (isNew || host.getAttribute('data-preset') !== (ft.presetId || '')) {
      if (opSantaTimer) {
        clearTimeout(opSantaTimer);
        opSantaTimer = null;
      }
      host.setAttribute('data-preset', ft.presetId || '');
      host.innerHTML = ft.roamerHtml;
      var actor = host.querySelector('.op-santa-actor');
      if (actor) {
        var cheerHandler = function (ev) {
          var rect = actor.getBoundingClientRect();
          var cx = (ev && typeof ev.clientX === 'number' && ev.clientX > 0)
            ? ev.clientX
            : rect.left + rect.width / 2;
          var cy = (ev && typeof ev.clientY === 'number' && ev.clientY > 0)
            ? ev.clientY
            : rect.top + rect.height / 2;
          actor.classList.remove('op-santa-cheer');
          void actor.offsetWidth;
          actor.classList.add('op-santa-cheer');
          var bubble = host.querySelector('.op-santa-bubble');
          if (bubble) {
            bubble.textContent = 'Ho Ho Ho! Merry Christmas!';
            bubble.classList.add('op-santa-bubble-force');
          }
          spawnSantaBurst(host, cx, cy);
        };
        actor.addEventListener('click', cheerHandler);
        actor.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            cheerHandler(ev);
          }
        });
      }
      // Start Santa's first lively walking entrance almost immediately (450ms)
      opSantaLastScene = null;
      opSantaTimer = setTimeout(function () {
        runSantaScene(host, 'walk_ltr');
      }, 450);

      try {
        window.__opSantaTriggerScene = function (sceneId) {
          var currentHost = document.getElementById('orderpulse-festival-roamer');
          if (currentHost) runSantaScene(currentHost, sceneId || null);
        };
      } catch (e) {}
    }
  }
`;
}
