/* ===== itemart.js — 절차적 아이템/스킬/UI 스프라이트 ===== */
import { shade } from '../engine/core/color.js';
import { TAU, clamp } from '../engine/core/math.js';
import { RNG } from '../engine/core/rng.js';
import { tr } from './lang.js';
import { T } from './data.js';
import { ITEMS } from './data/items.js';
import { PETS } from './data/pets.js';

export const S32 = 32;
export const sh2 = (c, m) => shade(c, m);

/* ---------------- 아이템 명세 ---------------- */
export const ISPEC = {
  /* 근접 */
  sword_wood: { k: 'sword', c: '#a3814f', g: '#6a4a28', grip: '#4a3122', w: 3 },
  sword_copper: { k: 'sword', c: '#c0762f', g: '#8a5520', grip: '#4a3122', w: 3.5 },
  sword_iron: { k: 'sword', c: '#b8bcc4', g: '#6a6e76', grip: '#4a3122', w: 4 },
  sword_bone: { k: 'sword', c: '#e0d8bd', g: '#9c9280', grip: '#5a4a3a', w: 4, jag: 1 },
  sword_mythril: { k: 'sword', c: '#5fd0c0', g: '#2a8a80', grip: '#3a4a52', w: 4, glow: '#5fd0c0' },
  sword_dawn: { k: 'sword', c: '#ffd98a', g: '#d89428', grip: '#7a4a1a', w: 5.5, glow: '#ffb24a' },
  scythe_void: { k: 'scythe', c: '#b48aff', shaft: '#2e2438', glow: '#a06fff' },

  /* 원거리 */
  bow_hunt: { k: 'bow', c: '#7a5734', s: '#d8cbb0' },
  bow_copper: { k: 'bow', c: '#c0762f', s: '#e0d5b8' },
  bow_iron: { k: 'bow', c: '#b8bcc4', s: '#e8e0c8' },
  bow_storm: { k: 'bow', c: '#7fd0e8', s: '#ffffff', glow: '#7fd0e8' },
  bow_starfall: { k: 'bow', c: '#ffe08a', s: '#fff6d0', glow: '#ffd24a' },

  /* 마법 */
  staff_branch: { k: 'staff', c: '#6a4a28', head: '#8fbf5a', style: 'orb' },
  staff_flame: { k: 'staff', c: '#5a3c22', head: '#ff8a3a', style: 'orb', glow: '#ff8a3a' },
  staff_frost: { k: 'staff', c: '#7a8a96', head: '#9fe0ff', style: 'crystal', glow: '#9fe0ff' },
  staff_soul: { k: 'staff', c: '#4a4452', head: '#c49fff', style: 'orb', glow: '#c49fff' },
  staff_abyss: { k: 'staff', c: '#2e2438', head: '#a06fff', style: 'claw', glow: '#a06fff' },

  /* 도구 */
  rod_basic: { k: 'fishrod', c: '#c8c0a8' },
  rod_adv: { k: 'fishrod', c: '#8fd0e8', glow: '#8fd0e8' },
  fish_common: { k: 'fishitem', c: '#8a9ab0' },
  fish_silver: { k: 'fishitem', c: '#c8d0dc', glow: '#e8eef5' },
  fish_deep: { k: 'fishitem', c: '#7a5a9c', glow: '#a878e0' },
  ring_angler: { k: 'ring', c: '#8a6a4a', gem: '#4f9cf0' },
  /* 물에서만 나오는 일곱 */
  tide_pearl: { k: 'crystal', c: '#dfe9f5', glow: 1 },
  sunken_coin: { k: 'coin', c: '#c8a850' },
  lantern_fry: { k: 'fishitem', c: '#e8c86a', glow: '#ffe08a' },
  river_scale: { k: 'shard', c: '#7fc8b0' },
  drowned_cell: { k: 'cell', c: '#5a7a8a' },
  coolant_vial: { k: 'potion', c: '#6fd8e0', glow: '#9fe8ff' },
  rust_sinker: { k: 'pellet', c: '#8a6a4a' },
  knot_angler: { k: 'amulet', c: '#c8b08a', gem: '#5fc4c4' },
  /* 물에서만 나오는 무기·장신구 열둘 (세션마다 여섯) — 기존 그림에 색만 갈아 끼운다. */
  /* ★ 칸 이름을 그림 쪽이 쓰는 것과 맞춰야 한다 — staff 는 head + style('orb'|'crystal'|'claw'), bow 는 c + s(시위 색)다. */
  spear_river: { k: 'spear', c: '#7fc8d8', glow: '#a8e8f0' },
  bow_reed: { k: 'bow', c: '#a8b878', s: '#e8e0c0' },
  staff_current: { k: 'staff', c: '#5a7a6a', head: '#9fe0ff', style: 'crystal', glow: '#9fe0ff' },
  harpoon_cool: { k: 'spear', c: '#8fd0e0', glow: '#bfeaf5' },
  gun_pressure: { k: 'bow', c: '#6fb8d8', s: '#d8f4ff', glow: '#9fe0ff' },
  staff_deluge: { k: 'staff', c: '#2e4458', head: '#7fe0ff', style: 'claw', glow: '#7fe0ff' },
  charm_float: { k: 'sigil', c: '#e8c86a', glow: '#ffe08a' },
  ring_ripple: { k: 'ring', c: '#8fb8c8', gem: '#7fd8e8' },
  amul_river: { k: 'amulet', c: '#7fc8b0', gem: '#a8e8d0' },
  charm_conden: { k: 'sigil', c: '#6fd8e0', glow: '#9fe8ff' },
  ring_sluice: { k: 'ring', c: '#8a8a96', gem: '#5fa8c8' },
  amul_undertow: { k: 'amulet', c: '#4a6a8a', gem: '#7f9fd8' },
  pick_copper: { k: 'pick', c: '#c0762f' },
  pick_sharp: { k: 'pick', c: '#d9903f' },      // 날을 세운 구리 — 조금 더 밝다
  pick_iron: { k: 'pick', c: '#b8bcc4' },
  pick_mythril: { k: 'pick', c: '#5fd0c0', glow: '#5fd0c0' },
  pick_soul: { k: 'pick', c: '#c49fff', glow: '#c49fff' },
  axe_iron: { k: 'axe', c: '#b8bcc4' },

  /* 방어구 */
  helm_cloth: { k: 'helm', c: '#9c8a68', soft: 1 },
  helm_copper: { k: 'helm', c: '#c0762f' },
  helm_iron: { k: 'helm', c: '#b8bcc4' },
  helm_mythril: { k: 'helm', c: '#5fd0c0', crest: '#2a8a80', glow: '#5fd0c0' },
  helm_soul: { k: 'helm', c: '#c9a9ff', crest: '#ffe08a', glow: '#c49fff' },
  chest_cloth: { k: 'chest', c: '#9c8a68', soft: 1 },
  chest_copper: { k: 'chest', c: '#c0762f' },
  chest_iron: { k: 'chest', c: '#b8bcc4' },
  chest_river: { k: 'chest', c: '#7fc8b0', glow: '#a8e8d0' },
  chest_mythril: { k: 'chest', c: '#5fd0c0', glow: '#5fd0c0' },
  chest_soul: { k: 'chest', c: '#c9a9ff', glow: '#c49fff' },
  boots_cloth: { k: 'boots', c: '#9c8a68', soft: 1 },
  boots_copper: { k: 'boots', c: '#c0762f' },
  boots_iron: { k: 'boots', c: '#b8bcc4' },
  boots_mythril: { k: 'boots', c: '#5fd0c0', glow: '#5fd0c0' },
  boots_soul: { k: 'boots', c: '#c9a9ff', glow: '#c49fff' },

  /* 장신구 */
  band_worn: { k: 'ring', c: '#8a6a4a', gem: '#5a4530' },
  ring_vigor: { k: 'ring', c: '#d8b13d', gem: '#e05050' },
  ring_focus: { k: 'ring', c: '#c8ccd4', gem: '#4f9cf0' },
  amul_swift: { k: 'amulet', c: '#c8ccd4', gem: '#7fe0a0', shape: 'wing' },
  amul_ember: { k: 'amulet', c: '#c0762f', gem: '#ff6a2a', shape: 'drop' },
  charm_cloud: { k: 'cloud' },
  charm_leech: { k: 'sigil', c: '#c8433c' },
  charm_star: { k: 'star', c: '#ffe58a', glow: '#ffd24a', big: 1 },
  charm_hawk: { k: 'feather', c: '#c8a06a' },
  ring_brand: { k: 'ring', c: '#c0762f', gem: '#ff6a2a' },

  /* 유적 유물 여덟 — 유적마다 하나씩. */
  relic_frostpane:  { k: 'crystal', c: '#9fe0ff', glow: 1 },
  relic_sundial:    { k: 'amulet', c: '#d8b13d', gem: '#ffe08a', shape: 'drop' },
  relic_lastlamp:   { k: 'torchitem' },
  relic_rotcore:    { k: 'heart', c: '#7a9c4a', glow: '#a8d060' },
  relic_sporebell:  { k: 'wisp', c: '#7fd8c0', glow: 1 },
  relic_frostmark:  { k: 'sigil', c: '#bcd8f0' },
  relic_mazeeye:    { k: 'sigil', c: '#c8a04a' },
  relic_hollowseed: { k: 'crystal', c: '#6a4a8a', glow: 1 },
  /* 유적의 맥박 — 결정·물약·북, 그리고 탐사 기록 S 의 인장 여섯(유물과 같은 색 갈래) */
  cave_moss:    { k: 'weed_icon', c: '#6fa05a' },
  moss_poultice: { k: 'potion', c: '#7fb86a', sq: 1 },
  /* 유적 재료 열 가지 — 그림이 없어 가방에서 빈 칸으로 나오던 것(CLAUDE.md §1-6). */
  neverthaw:    { k: 'crystal', c: '#bfe8ff', glow: 1 },                 // 얼음 던전
  warden_seal:  { k: 'sigil', c: '#8fb8d8', glow: '#dff2ff' },
  sealed_ash:   { k: 'sack', c: '#b89a6a', glow: '#e8d0a0' },            // 피라미드
  caged_sun:    { k: 'star', c: '#ffd24a', glow: '#fff0a0', big: 1 },
  deep_ember:   { k: 'ore', c: '#e8843a', glow: '#ffb45a' },             // 버려진 광산
  foreman_tag:  { k: 'coin', c: '#a8805a' },
  blight_spawn: { k: 'egg', c: '#8a4a80' },                              // 부패한 둥지
  nest_crown:   { k: 'crown', c: '#6a3a7a', gem: '#e8303c' },
  spore_dust:   { k: 'gel', c: '#8fe0c4' },                              // 포자 굴
  cap_signet:   { k: 'sigil', c: '#5fa88a', glow: '#9fe8c8' },
  pulse_shard:  { k: 'shard', c: '#e8404c' },
  tonic_hush:   { k: 'potion', c: '#8fb8d8', sq: 1 },
  drum_pulse:   { k: 'heart', c: '#c8433c', glow: '#ff7a6a' },
  seal_mine:    { k: 'amulet', c: '#a0784a', gem: '#ffb84a' },
  seal_ice:     { k: 'amulet', c: '#9fc8e0', gem: '#e8f6ff' },
  seal_pyramid: { k: 'amulet', c: '#d8b13d', gem: '#ffe08a', shape: 'wing' },
  seal_spore:   { k: 'amulet', c: '#5fa88a', gem: '#9fe8c8' },
  seal_blight:  { k: 'amulet', c: '#6a3a7a', gem: '#e8303c', shape: 'drop' },
  seal_abyss:   { k: 'amulet', c: '#2f6a8a', gem: '#7fe0ff', shape: 'drop' },
  ruinmap_ice:    { k: 'sigil', c: '#9fe0ff' },
  ruinmap_spore:  { k: 'sigil', c: '#7fd8c0' },
  ruinmap_blight: { k: 'sigil', c: '#9a5fd8' },
  charm_conduit: { k: 'cell', c: '#4f9cf0', fill: 1, glow: '#8fd0f0' },
  charm_zenith: { k: 'amulet', c: '#bcd8f0', gem: '#e8f0fa', shape: 'wing' },

  /* 소비 — 병 크기(sz)로 작은/일반/큰을 가른다. */
  potion_hp_small: { k: 'potion', c: '#e0483c', sz: 'sm' },
  potion_hp: { k: 'potion', c: '#e0483c' },
  potion_hp_greater: { k: 'potion', c: '#ff6a5a', sq: 1, sz: 'lg' },
  potion_mp_small: { k: 'potion', c: '#4f8fe0', sz: 'sm' },
  potion_mp: { k: 'potion', c: '#4f8fe0' },
  potion_mp_greater: { k: 'potion', c: '#6fb0ff', sq: 1, sz: 'lg' },
  potion_str: { k: 'potion', c: '#e08a2a', sq: 1 },
  potion_str_greater: { k: 'potion', c: '#ff9c3a', sq: 1, sz: 'lg' },
  potion_iron: { k: 'potion', c: '#a8a49a', sq: 1 },
  potion_iron_greater: { k: 'potion', c: '#c8c4ba', sq: 1, sz: 'lg' },
  food_stew: { k: 'stew' },
  raw_meat: { k: 'gel', c: '#c8524a' },

  /* 펫 알 */
  egg_common: { k: 'egg', c: '#a8967a' },
  egg_rare: { k: 'egg', c: '#6fa8d8', glow: '#6fa8d8' },
  egg_epic: { k: 'egg', c: '#b17fe0', glow: '#b17fe0' },
  pet_candy: { k: 'candy', c: '#e05a8a' },
  coconut: { k: 'coconut_i', c: '#6a4a2a' },
  glacium_ore: { k: 'ore', c: '#bfeaf7', glow: '#bfeaf7' },
  tide_ore: { k: 'ore', c: '#54d0b4', glow: '#54d0b4' },
  glacium_bar: { k: 'bar', c: '#bfeaf7', glow: '#8fd8ee' },
  tide_bar: { k: 'bar', c: '#54d0b4', glow: '#3fb89c' },
  meteorite: { k: 'meteorite', c: '#4a4448' },
  star_crystal: { k: 'crystal', c: '#ffe6a8', glow: 1 },
  det_metal: { k: 'detector', c: '#9fd8e8' },
  det_mob: { k: 'detector', c: '#e08a6a' },

  /* 채집물 */
  wildflower: { k: 'wildflower', c: '#d87ab0' },
  weed: { k: 'weed_icon', c: '#5a8f3a' },
  cactus_flesh: { k: 'cactus', c: '#4a8a4a' },
  mushroom: { k: 'mushroom', c: '#e0402c' },

  /* 재료 · 설치물 */
  wood: { k: 'log', c: '#7a5734' },
  stone: { k: 'block', tile: T.STONE },
  limestone: { k: 'block', tile: T.LIMESTONE },
  granite: { k: 'block', tile: T.GRANITE },
  dirt: { k: 'block', tile: T.DIRT },
  sand: { k: 'block', tile: T.SAND },
  ash: { k: 'block', tile: T.ASH },
  plank: { k: 'block', tile: T.PLANK },
  brick: { k: 'block', tile: T.BRICK },
  obsidian: { k: 'block', tile: T.OBSIDIAN },
  torch: { k: 'torchitem' },
  platform: { k: 'platformitem' },
  copper_ore: { k: 'ore', c: '#c0762f' },
  iron_ore: { k: 'ore', c: '#a89c8e' },
  gold_ore: { k: 'ore', c: '#e0b93d' },
  mythril_ore: { k: 'ore', c: '#49b0a4' },
  hell_ore: { k: 'ore', c: '#e0561c', glow: 1 },
  copper_bar: { k: 'bar', c: '#c0762f' },
  iron_bar: { k: 'bar', c: '#b8bcc4' },
  gold_bar: { k: 'bar', c: '#e0b93d' },
  mythril_bar: { k: 'bar', c: '#5fd0c0', glow: 1 },
  ebon_chunk: { k: 'rock', c: '#6a4a92' },
  ice_shard: { k: 'shard', c: '#9fe0ff' },
  crystal: { k: 'crystal', c: '#7fd8e8', glow: 1 },
  slime_gel: { k: 'gel', c: '#6f9bc0' },
  bone_frag: { k: 'bone' },
  corrupt_ess: { k: 'wisp', c: '#9a5fd8', glow: 1 },
  frost_core: { k: 'shard', c: '#8fd0e8', glow: 1 },
  void_frag: { k: 'shard', c: '#a06fff', glow: 1 },
  soul_shard: { k: 'wisp', c: '#c49fff', glow: 1 },
  star_heart: { k: 'star', c: '#ffe58a', glow: '#ffd24a', big: 1 },

  /* 소환 */
  sum_slime: { k: 'crown', c: '#d8b13d', gem: '#4f7fc0' },
  sum_bone: { k: 'skull' },
  sum_heart: { k: 'heart', c: '#a03f6c' },
  sum_frost: { k: 'crown', c: '#9fe0ff', gem: '#ffffff', glow: '#9fe0ff' },
  sum_void: { k: 'drop', c: '#a06fff', glow: '#a06fff' },

  /* --- 몬스터 전리품 --- */
  ash_feather: { k: 'feather', c: '#9a9aa2' },
  spider_silk: { k: 'wisp', c: '#cfc8dc' },
  lost_lamp: { k: 'torchitem' },
  venom_sting: { k: 'shard', c: '#8fd06a' },
  ice_fang: { k: 'shard', c: '#cfeaf8' },
  moss_core: { k: 'gel', c: '#6aa84a' },
  crystal_claw: { k: 'crystal', c: '#7fd8e8', glow: 1 },
  lava_gel: { k: 'gel', c: '#e0703a' },
  cloud_jelly: { k: 'gel', c: '#dfe9f5' },
  archive_seal: { k: 'runefrag', c: '#c8b98a' },

  /* --- 전리품 무기 --- */
  bow_crow: { k: 'bow', c: '#5a5a62', s: '#c8c8d0' },
  dagger_venom: { k: 'sword', c: '#8fd06a', g: '#4a6a32', grip: '#3a3a2a', w: 2.6 },
  bow_silk: { k: 'bow', c: '#b8b0c8', s: '#f0ecf8' },
  axe_frost: { k: 'axe', c: '#a8dcf0' },
  staff_moss: { k: 'staff', c: '#4a3a22', head: '#7fc45a', style: 'orb' },
  hammer_lava: { k: 'hammer', c: '#e0703a', glow: '#ff8a3a' },
  staff_archive: { k: 'staff', c: '#7a6a4a', head: '#e8d8a0', style: 'crystal', glow: '#ffe08a' },
  charm_prism: { k: 'shard', c: '#9fd8f0', glow: 1 },
  charm_lamp: { k: 'torchitem' },

  /* --- 2부 --- */
  sword_aether: { k: 'sword', c: '#9fe8dc', g: '#3f8f86', grip: '#3a4a52', w: 4.5, glow: '#8fe0d8' },
  bow_gale: { k: 'bow', c: '#bcd8f0', s: '#ffffff', glow: '#bcd8f0' },
  staff_storm: { k: 'staff', c: '#4a5a6e', head: '#9fd8ff', style: 'claw', glow: '#9fd8ff' },
  sword_first: { k: 'sword', c: '#fff0b8', g: '#d8a94b', grip: '#7a5a28', w: 6, glow: '#ffe08a' },
  helm_aether: { k: 'helm', c: '#9fe8dc', crest: '#d8a94b', glow: '#8fe0d8' },
  chest_aether: { k: 'chest', c: '#9fe8dc', glow: '#8fe0d8' },
  boots_aether: { k: 'boots', c: '#9fe8dc', glow: '#8fe0d8' },
  charm_feather: { k: 'feather', c: '#dfe9f5' },
  charm_rune: { k: 'rune', c: '#8fe0d8' },
  cloud_block: { k: 'block', tile: T.CLOUD },
  skystone: { k: 'block', tile: T.SKYSTONE },
  ruin_brick: { k: 'block', tile: T.RUINBRICK },
  aether_shard: { k: 'shard', c: '#8fe0d8', glow: 1 },
  sky_feather: { k: 'feather', c: '#cfe4f5' },
  rune_frag: { k: 'runefrag', c: '#7fb8d8' },
  ruin_key: { k: 'key', c: '#d8b13d' },
  sum_storm: { k: 'horn', c: '#c8b98a' },
  sum_keeper: { k: 'key', c: '#9fe8dc', glow: '#8fe0d8' },

  /* --- 종장 --- */
  star_whole: { k: 'star', c: '#fff4cf', glow: '#ffe08a', big: 1 },
  charm_dawn: { k: 'star', c: '#ffd8a0', glow: '#ff9a3a', big: 1 },
  sum_pursuer: { k: 'sigil', c: '#6a4a92' },

  /* --- 지하 공창 --- */
  steel_plate: { k: 'block', tile: T.STEELPLATE },
  power_core: { k: 'crystal', c: '#e8a53a', glow: 1 },
  conduit_part: { k: 'bar', c: '#8a6a3a' },
  blueprint_frag: { k: 'runefrag', c: '#7a9fc0' },
  blueprint_core: { k: 'sigil', c: '#7a9fc0' },
  gear_basic: { k: 'ring', c: '#8a8a96', gem: '#4a4a52' },
  pick_drill: { k: 'pick', c: '#c8a06a', glow: '#e8a53a' },

  /* --- 동력 자원 · 중간재 --- */
  coal: { k: 'rock', c: '#2e2c32' },
  lead_ore: { k: 'ore', c: '#8e8ea4' },
  lead_bar: { k: 'bar', c: '#8e8ea4' },
  crude_oil: { k: 'barrel', c: '#3a352c', fluid: '#15130f' },
  refined_oil: { k: 'barrel', c: '#5a6a4a', fluid: '#c8b04a' },
  polymer: { k: 'pellet', c: '#d8dce4' },
  fuel_brick: { k: 'fuelbrick', c: '#3a3630' },
  wire: { k: 'wire', c: '#c0762f' },
  circuit: { k: 'circuit', c: '#3a7a4a', trace: '#e0b93d' },
  motor: { k: 'motor', c: '#8a8a96', trim: '#c0762f' },
  machine_frame: { k: 'frame', c: '#8a8a96' },
  battery_empty: { k: 'cell', c: '#5a5a66', fill: 0 },
  battery_cell: { k: 'cell', c: '#4a7a6a', fill: 1, glow: '#6fe0c0' },
  rivet: { k: 'rivet', c: '#b8bcc4' },

  /* --- 기계 (타일 그림을 그대로 아이콘으로 쓴다) --- */
  m_belt: { k: 'machine', tile: T.M_BELT },
  m_drill: { k: 'machine', tile: T.M_DRILL },
  m_drill_e: { k: 'machine', tile: T.M_DRILL_E, glow: '#4a8ab0' },
  m_drill_x: { k: 'machine', tile: T.M_DRILL_X, glow: '#8fe0ff' },
  m_pump: { k: 'machine', tile: T.M_PUMP },
  m_smelter: { k: 'machine', tile: T.M_SMELTER },
  m_press: { k: 'machine', tile: T.M_PRESS },
  m_refinery: { k: 'machine', tile: T.M_REFINERY },
  m_assembler: { k: 'machine', tile: T.M_ASSEMBLER },
  m_crate: { k: 'machine', tile: T.M_CRATE },
  /* 손으로 놓는 설치물 — 세계에 그려지는 모습과 같은 실루엣을 쓴다(아이콘만 보고 "이게 그 작업대"라고 알아볼 수 있어야 한다) */
  station_work: { k: 'stationic', m: 'work' },
  station_forge: { k: 'stationic', m: 'forge' },
  crate_wood: { k: 'stationic', m: 'crate' },
  crate_gold: { k: 'stationic', m: 'crate', gold: 1 },
  door_wood: { k: 'doorit' },
  m_gen: { k: 'machine', tile: T.M_GEN, glow: '#e8842a' },
  m_battery: { k: 'machine', tile: T.M_BATTERY, glow: '#6fe0c0' },
  m_pole: { k: 'machine', tile: T.M_POLE },
  m_sorter: { k: 'machine', tile: T.M_SORTER },
  m_turret: { k: 'machine', tile: T.M_TURRET },
  m_trap: { k: 'machine', tile: T.M_TRAP, glow: '#9fd8ff' },
  m_switch: { k: 'machine', tile: T.M_SWITCH, glow: '#e0563c' },

  /* --- 동력 장비 --- */
  pick_arc: { k: 'pick', c: '#7fd0e8', glow: '#9fd8ff' },
  saw_auto: { k: 'sawblade', c: '#c8ccd4', glow: '#e0b93d' },
  gun_rail: { k: 'railgun', c: '#8a8a96', glow: '#9fd8ff' },
  helm_exo: { k: 'helm', c: '#8fa8b8', crest: '#6fe0c0', glow: '#6fe0c0' },
  chest_exo: { k: 'chest', c: '#8fa8b8', glow: '#6fe0c0' },
  boots_exo: { k: 'boots', c: '#8fa8b8', glow: '#6fe0c0' },
  charm_cap: { k: 'cell', c: '#e0b93d', fill: 1, glow: '#ffe08a' },

  /* --- 정글 · 버섯 골짜기 --- */
  mud: { k: 'block', tile: T.MUD },
  fern_frond: { k: 'weed_icon', c: '#4a8a3a' },
  orchid: { k: 'wildflower', c: '#c85a9a' },
  lily_pad: { k: 'wildflower', c: '#e888c0' },
  glowcap: { k: 'mushroom', c: '#6fe0c0', glow: 1 },
  vine_coil: { k: 'wire', c: '#3f7a34' },
  leaf_oak: { k: 'leafitem', sh: 'oak', c: '#6f8a3a', st: '#5a3c22' },
  leaf_pine: { k: 'leafitem', sh: 'needle', c: '#2f6a4a', st: '#5a3c22' },
  leaf_jungle: { k: 'leafitem', sh: 'broad', c: '#3f8a34', st: '#2a4a1e' },
  leaf_corrupt: { k: 'leafitem', sh: 'curl', c: '#7a4a9a', st: '#3a2448' },
  leaf_sky: { k: 'leafitem', sh: 'star', c: '#6ec49a', st: '#3f7a5a' },
  leaf_palm: { k: 'leafitem', sh: 'palm', c: '#5f9a3a', st: '#6a5030' },
  spore_sac: { k: 'gel', c: '#6fe0c0' },
  food_curry: { k: 'bowl', c: '#8a6a4a', soup: '#c8843a', bits: '#4a8a3a' },
  potion_glow: { k: 'potion', c: '#6fe0c0', glow: 1 },
  potion_glow_greater: { k: 'potion', c: '#9ff5d8', glow: 1, sz: 'lg' },
  charm_canopy: { k: 'feather', c: '#4a8a3a' },
  charm_spore: { k: 'crystal', c: '#6fe0c0', glow: 1 },

  /* --- 유적 --- */
  icebrick: { k: 'block', tile: T.ICEBRICK },
  sandbrick: { k: 'block', tile: T.SANDBRICK },
  m_dart: { k: 'machine', tile: T.M_DART },
  m_flame: { k: 'machine', tile: T.M_FLAME, glow: '#e8842a' },
  m_frost: { k: 'machine', tile: T.M_FROST, glow: '#9fd8ff' },
  frozen_core: { k: 'shard', c: '#9fd8f0', glow: 1 },
  sun_disc: { k: 'coin', c: '#e0b93d' },
  rust_gear: { k: 'ring', c: '#8a6a4a', gem: '#5a3a24' },
  blight_bile: { k: 'gel', c: '#7a3f9c' },
  heartwood: { k: 'log', c: '#3f7a34' },
  queen_spore: { k: 'gel', c: '#6fe0c0' },
  charm_delver: { k: 'sigil', c: '#8a8478' },

  /* --- 폭주로 --- */
  core_shard: { k: 'shard', c: '#e8b04a', glow: 1 },
  sword_arc: { k: 'sword', c: '#3a3a44', g: '#e0d030', grip: '#2a2a30', w: 4.2, glow: '#f0e070' },
  stop_core: { k: 'stopcore', c: '#c03a30' },
  hepha_heart: { k: 'heart', c: '#c8a05a' },
  charm_govern: { k: 'ring', c: '#c8ccd4', gem: '#e8b04a' },
  hammer_still: { k: 'hammer', c: '#8a8a96', glow: '#9fd8ff' },

  /* --- 세션 2 종장: 설계실 --- */
  archestone: { k: 'block', c: '#cfc7b8' },
  draft_glass: { k: 'shard', c: '#8fd8e8', glow: 1 },
  proto_ash: { k: 'sigil', c: '#b8b0a0' },
  atelier_key: { k: 'sigil', c: '#e0c878' },
  arche_core: { k: 'heart', c: '#e8dcc0' },
  blade_arche: { k: 'sword', c: '#f0e8d0', g: '#c8a05a', grip: '#8a7a5a', w: 5.5, glow: '#ffe8a0' },
  tome_origin: { k: 'staff', c: '#8a7a5a', head: '#e8dcc0', style: 'crystal', glow: '#ffe8a0' },
  charm_maker: { k: 'rune', c: '#e8dcc0' },

  /* --- 특별 유적 ① 부유 성채 --- */
  orbit_plate: { k: 'block', c: '#8fa8c8' },
  orbit_gear: { k: 'ring', c: '#8fa8c8', gem: '#7fe0ff' },
  void_lens: { k: 'crystal', c: '#7fe0ff', glow: 1 },
  star_ash: { k: 'star', c: '#dfe9f5', glow: '#bfe4ff' },
  lance_orbit: { k: 'spear', c: '#bcd8f0', glow: '#7fe0ff' },
  bow_meridian: { k: 'bow', c: '#8fa8c8', s: '#dfe9f5' },
  charm_orbit: { k: 'sigil', c: '#7fe0ff' },
  /* --- 특별 유적 ② 무너진 갱 --- */
  deep_stone: { k: 'block', c: '#3a3630' },
  deep_alloy: { k: 'bar', c: '#5a5450' },
  miner_tag: { k: 'sigil', c: '#8a7a58' },
  gloom_pearl: { k: 'shard', c: '#1a1820' },
  drill_abyss: { k: 'pick', c: '#4a4a52', glow: '#8a6ad0' },
  hammer_cave: { k: 'hammer', c: '#4a4238' },
  charm_lamp2: { k: 'torchitem' },
  /* --- 제트팩 --- */
  jetpack: { k: 'cell', c: '#c86a3a', fill: 1, glow: '#ffb04a' },

  /* --- 무기 다양화 (몬스터 전리품 위주로 늘린 것들) --- */
  spear_reed: { k: 'spear', c: '#8a9a6a' },
  mace_iron: { k: 'hammer', c: '#8a8a92' },
  dagger_frost: { k: 'sword', c: '#bfe8ff', g: '#5a8aa0', grip: '#3a4a52', w: 2.4, glow: '#9fe0ff' },
  spear_venom: { k: 'spear', c: '#7a9c4a', glow: '#a8d060' },
  mace_thorn: { k: 'hammer', c: '#6a3a54', glow: '#c85a9a' },
  mace_lava: { k: 'hammer', c: '#c85a2a', glow: '#ff8a3a' },
  dagger_void: { k: 'sword', c: '#7a5aa8', g: '#3a2a52', grip: '#241c30', w: 2.6, glow: '#a06fff' },
  spear_storm: { k: 'spear', c: '#dce8f4', glow: '#bcd8f0' },
  mace_ruin: { k: 'hammer', c: '#8a7a5a', glow: '#e8d8a0' },
  crossbow_bone: { k: 'bow', c: '#d8d0b8', s: '#8a8270' },
  bow_venom: { k: 'bow', c: '#7a9c4a', s: '#c8e090', glow: '#a8d060' },
  crossbow_iron: { k: 'bow', c: '#8a8a92', s: '#c8c8d0' },
  bow_ash: { k: 'bow', c: '#8a5a3a', s: '#ff8a3a', glow: '#ff8a3a' },
  crossbow_mythril: { k: 'bow', c: '#7fd0c0', s: '#c8f0e8', glow: '#7fd0c0' },
  bow_void: { k: 'bow', c: '#6a4a8a', s: '#b48aff', glow: '#a06fff' },
  gun_scrap: { k: 'railgun', c: '#7a7268', glow: '#e0b93d' },
  crossbow_first: { k: 'bow', c: '#fff0b8', s: '#ffe08a', glow: '#ffe08a' },
  orb_ember: { k: 'staff', c: '#6a4a28', head: '#ff8a3a', style: 'orb', glow: '#ff8a3a' },
  tome_bone: { k: 'staff', c: '#5a5248', head: '#d8d0b8', style: 'crystal' },
  orb_venom: { k: 'staff', c: '#3a4a2a', head: '#a8d060', style: 'orb', glow: '#a8d060' },
  tome_ash: { k: 'staff', c: '#4a3a2a', head: '#ff8a3a', style: 'crystal', glow: '#ff8a3a' },
  orb_storm: { k: 'staff', c: '#3a3a52', head: '#bcd8f0', style: 'orb', glow: '#9fd8ff' },
  tome_void: { k: 'staff', c: '#2e2438', head: '#b48aff', style: 'crystal', glow: '#a06fff' },
  orb_core: { k: 'staff', c: '#5a4a30', head: '#e8b04a', style: 'orb', glow: '#f0e070' },
  tome_first: { k: 'staff', c: '#7a6a4a', head: '#fff0b8', style: 'crystal', glow: '#ffe08a' },

  /* --- 마을 건축 (타일 그림을 그대로 아이콘으로) --- */
  thatch: { k: 'block', tile: T.THATCH },
  rooftile: { k: 'block', tile: T.ROOFTILE },
  timberwall: { k: 'block', tile: T.TIMBERWALL },
  wallstone: { k: 'block', tile: T.WALLSTONE },
  battlement: { k: 'block', tile: T.BATTLEMENT },
  window: { k: 'block', tile: T.WINDOW },
  fence: { k: 'block', tile: T.FENCE },
  lamppost: { k: 'block', tile: T.LAMPPOST, glow: '#e8c86a' },
  banner: { k: 'block', tile: T.BANNER },
  haybale: { k: 'block', tile: T.HAYBALE },
  sandbag: { k: 'block', tile: T.SANDBAG },
  m_windmill: { k: 'machine', tile: T.M_WINDMILL },
  m_mill: { k: 'machine', tile: T.M_MILL },
  m_oven: { k: 'machine', tile: T.M_OVEN, glow: '#e8842a' },

  /* --- 농업 --- */
  hoe_iron: { k: 'hoe', c: '#b8bcc4' },
  /* 낫 — 이미 있는 낫 그림(scythe_void가 쓰는 것)에 색만 갈아 끼운다 */
  scythe_iron: { k: 'scythe', c: '#c8ccd4', shaft: '#6a4a2a' },
  scythe_star: { k: 'scythe', c: '#a8e0ff', shaft: '#4a4a6a', glow: '#9fe8ff' },
  seed_wheat: { k: 'seed', c: '#c8a850' },
  seed_starroot: { k: 'seed', c: '#8fd0a0' },
  seed_ashcap: { k: 'seed', c: '#c0705a' },
  seed_bloodbean: { k: 'seed', c: '#c04a44' },
  seed_bonebloom: { k: 'seed', c: '#e0dcc8' },
  seed_frostherb: { k: 'seed', c: '#a8e0e8' },
  seed_emberpod: { k: 'seed', c: '#e8842a', glow: '#ffb85a' },
  wheat: { k: 'wheatitem', c: '#e0c058' },
  starroot: { k: 'rootitem', c: '#8fd0a0', glow: '#bfe8cf' },
  bloodbean: { k: 'gel', c: '#c04a44' },
  bonebloom: { k: 'wildflower', c: '#e8e4d4', glow: '#fff8e8' },
  frostherb: { k: 'weed_icon', c: '#a8e0e8', glow: '#d8f4ff' },
  emberpod: { k: 'sack', c: '#e8842a', glow: '#ffb85a' },
  flour: { k: 'flouritem', c: '#e8dcc0' },
  fertilizer: { k: 'compost', c: '#5a4632' },

  /* --- 음식 --- */
  food_bread: { k: 'bread', c: '#c89050' },
  food_pie: { k: 'pie', c: '#d8a860', fill: '#a04a3a' },
  food_mstew: { k: 'bowl', c: '#8a6a4a', soup: '#6a5a3a', bits: '#d8503c' },
  food_soup: { k: 'bowl', c: '#c8ccd4', soup: '#8fd0a0', bits: '#e8dcc0' },
  food_tea: { k: 'teacup', c: '#e8e0d0', tea: '#d87ab0' },
  food_jelly: { k: 'jelly', c: '#7fc07a' },
  food_feast: { k: 'feast', c: '#d8a860', glow: '#ffd88a' },

  /* --- 가방 --- */
  bag_pouch: { k: 'sack', c: '#cfc8dc', strap: '#7a7160' },
  bag_satchel: { k: 'sack', c: '#8a6a4a', strap: '#4a3a28' },
  bag_pack: { k: 'sack', c: '#cfe8ff', strap: '#8fb8d8', glow: '#dfe9f5' },
  bag_vault: { k: 'sack', c: '#7a7160', strap: '#3a3550', glow: '#a06fff' },

  /* ================= 바다 · 빙하 ================= */
  /* 산소통 — 셋이 한눈에 구분되게 색과 발광을 계단으로 준다 */
  tank_air: { k: 'cell', c: '#8fb8c8', fill: 1 },
  tank_deep: { k: 'cell', c: '#4f9cc0', fill: 1, glow: '#8fd0e8' },
  tank_abyss: { k: 'cell', c: '#7f8fe0', fill: 1, glow: '#bfd4ff' },
  /* 4단계 설비 */
  m_pressor: { k: 'machine', tile: T.M_PRESSOR, glow: '#8fd0e8' },
  m_desal: { k: 'machine', tile: T.M_DESAL, glow: '#8fd4ef' },
  m_belt_f: { k: 'machine', tile: T.M_BELT_F, glow: '#bfe8ff' },
  m_battery_hi: { k: 'machine', tile: T.M_BATTERY_HI, glow: '#6fe0c0' },
  /* 바다 무기 */
  spear_tide: { k: 'spear', c: '#7fc8e8', shaft: '#4a5a62', glow: '#8fd4ef' },
  blade_shark: { k: 'sword', c: '#d8d0bd', g: '#8a8270', grip: '#3a4a52', w: 4, jag: 1 },
  bow_harpoon: { k: 'bow', c: '#5a6a72', s: '#cfe0e8' },
  orb_abyss: { k: 'staff', c: '#3a4a5a', head: '#7fb8e8', style: 'orb', glow: '#7fb8e8' },
  hammer_tide: { k: 'hammer', c: '#5f9cc0', glow: '#8fd4ef' },
  gun_harpoon: { k: 'railgun', c: '#5a6a72', glow: '#8fd0e8' },
  tome_abyss: { k: 'staff', c: '#2e3a4a', head: '#8fb8e8', style: 'crystal', glow: '#7fb8e8' },
  pick_abyss: { k: 'pick', c: '#5f9cc0', glow: '#8fd4ef' },
  /* 바다 방어구·장신구 */
  helm_diver: { k: 'helm', c: '#7fa8c0' },
  chest_scale: { k: 'chest', c: '#6a9ab0' },
  chest_abyss: { k: 'chest', c: '#4a6a8a' },
  boots_fin: { k: 'boots', c: '#5f9cc0' },
  ring_pearl: { k: 'ring', c: '#c8c0a8', gem: '#dff2ff' },
  charm_ink: { k: 'sigil', c: '#3a2e44', glow: '#7a4a7a' },
  charm_core: { k: 'cell', c: '#8fd0e8', fill: 1, glow: '#bfe8ff' },
  bag_abyss: { k: 'sack', c: '#4a6a7a', strap: '#8fb8c8', glow: '#8fd0e8' },
  /* 바다 재료 */
  crab_shell: { k: 'shield', c: '#c86a4a' },
  shark_tooth: { k: 'shard', c: '#e8e0c8' },
  ink_sac: { k: 'gel', c: '#3a2e44' },
  jelly_lamp: { k: 'jelly', c: '#8fd0e8', glow: '#bfe8ff' },
  abyss_pearl: { k: 'crystal', c: '#dfe9ff', glow: 1 },
  kelp: { k: 'weed_icon', c: '#3f7a5a' },
  rope_kelp: { k: 'wire', c: '#5a7a4a' },
  sea_salt: { k: 'pellet', c: '#eef4f8' },
  gunpowder: { k: 'pellet', c: '#4a4238' },
  sulfur: { k: 'ore', c: '#7a7268', o: '#d8c04a', glow: '#e8d86a' },
  bomb_small: { k: 'bomb', c: '#3a3630', fuse: '#c8a04a' },
  bomb_big: { k: 'bomb', c: '#5a2e2a', fuse: '#e8842a', glow: '#ff9a3a' },
  bomb_dig: { k: 'bomb', c: '#4a4a52', fuse: '#8fd0e8', glow: '#8fd0e8' },
  pressure_plate_m: { k: 'block', tile: T.STEELPLATE },
  abyss_core: { k: 'crystal', c: '#8fd0e8', glow: 1 },
  tide_heart: { k: 'heart', c: '#4f9cc0', glow: '#8fd4ef' },
  keeper_seal: { k: 'sigil', c: '#5f9cc0', glow: '#8fd0e8' },
  sum_tide: { k: 'crown', c: '#7fc8e8', gem: '#dff2ff', glow: '#8fd4ef' },
  /* 윤슬의 좌판 전용 — 그림이 없으면 상점 칸이 통째로 빈칸으로 뜬다 */
  amul_scale: { k: 'amulet', c: '#7fb8d8', gem: '#dff2ff', glow: '#8fd0e8' },
  charm_bell: { k: 'sigil', c: '#c8b06a', glow: '#ffe08a' },
  ring_deep: { k: 'ring', c: '#4a6a8a', gem: '#8fd4ef' },
  sigil_current: { k: 'whirl', c: '#5f9cc0', glow: '#8fd4ef' },
  mace_bell: { k: 'hammer', c: '#c8b06a', glow: '#ffe08a' },
  harpoon_lamp: { k: 'bow', c: '#5a6a72', s: '#ffe08a', glow: '#ffe08a' },
};

/* ---------------- 스킬 아이콘 명세 ---------------- */
export const SKSPEC = {
  s_cleave: { k: 'slash', c: '#ff9a4a' },
  s_toughen: { k: 'shield', c: '#c8433c' },
  s_charge: { k: 'impact', c: '#ff6a4a' },
  s_bloodlust: { k: 'blood', c: '#c8433c' },
  s_whirl: { k: 'whirl', c: '#ffcf6a' },
  s_titan: { k: 'titan', c: '#c88a5a' },
  s_dash: { k: 'dash', c: '#8fe0a0' },
  s_eagle: { k: 'target', c: '#5fc45f' },
  s_volley: { k: 'volley', c: '#8fd06a' },
  s_swift: { k: 'wind', c: '#7fe0b0' },
  s_rain: { k: 'rain', c: '#ffe08a' },
  s_hunter: { k: 'eye', c: '#5fc45f' },
  s_fireball: { k: 'flame', c: '#ff8a3a' },
  s_wisdom: { k: 'book', c: '#4f9cf0' },
  s_heal: { k: 'heal', c: '#9ff09f' },
  s_nova: { k: 'snow', c: '#9fe0ff' },
  s_wolf: { k: 'wolf', c: '#9fd8ff' },
  s_arch: { k: 'rune', c: '#a06fff' },
  /* 분기 색을 따라간다 (검투사 붉은 계열 · 유격 초록 계열 · 비전 푸른/보라 계열) */
  s_guard: { k: 'bulwark', c: '#d8a05a' },
  s_quake: { k: 'quake', c: '#c8845a' },
  s_warcry: { k: 'shout', c: '#e8a04a' },
  s_undying: { k: 'lifebeat', c: '#e05a6a' },
  s_pierce: { k: 'pierce', c: '#9fe07a' },
  s_smoke: { k: 'smoke', c: '#b8c8b0' },
  s_mark: { k: 'mark', c: '#e8d05a' },
  s_tempest: { k: 'tempest', c: '#8fe0c8' },
  s_barrier: { k: 'barrier', c: '#6fb8ff' },
  s_chain: { k: 'chain', c: '#ffe86a' },
  s_blink: { k: 'blink', c: '#c08fff' },
  s_meteor: { k: 'meteor', c: '#ffb04a' }
};

/* ---------------- 버프 / UI / NPC ---------------- */
export const BFSPEC = {
  rage: { k: 'impact', c: '#e0603c' },
  iron: { k: 'shield', c: '#a8a49a' },
  well: { k: 'stew' },
  frostbite: { k: 'snow', c: '#9fe0ff' },
  burn: { k: 'flame', c: '#ff8a3a' },
  swift_kill: { k: 'wind', c: '#9fe0c0' },
  wish: { k: 'coin', c: '#ffd85a' }        // 분수대에 던진 금화
};
export const UISPEC = {
  sun: { k: 'sun' }, moon: { k: 'moon' }, coin: { k: 'coin' }, chat: { k: 'chat' },
  equip: { k: 'equipui' }, trash: { k: 'trashui' },
  /* 장비 칸이 비었을 때 흐리게 깔리는 실루엣 — 어느 칸에 뭘 끼우는지 글자 없이 보이게 */
  slot_weapon: { k: 'slotic', m: 'weapon' },
  slot_helm: { k: 'slotic', m: 'helm' },
  slot_chest: { k: 'slotic', m: 'chest' },
  slot_boots: { k: 'slotic', m: 'boots' },
  slot_acc: { k: 'slotic', m: 'acc' },
  slot_bag: { k: 'slotic', m: 'bag' },
  slot_pet: { k: 'slotic', m: 'pet' },
  slot_util: { k: 'slotic', m: 'util' },
  /* 패널 제목 앞 아이콘 — '장비'(equip)만 있었고 나머지 두 제목은 글자뿐이라 줄이 안 맞았다 */
  bagui: { k: 'bagui' }, statui: { k: 'statui' },
  /* 탭(패널) 제목 · 화면 아래 탭 단추 아이콘 — 모두 같은 금빛·가죽빛 한 벌(bagui 와 같은 색)이라 나란히 둬도 한 식구로 읽힌다 */
  p_skill: { k: 'pskill' }, p_quest: { k: 'pquest' }, p_craft: { k: 'pcraft' }, p_chest: { k: 'pchest' },
  p_vault: { k: 'pvault' }, p_board: { k: 'pboard' }, p_town: { k: 'ptown' }, p_mach: { k: 'pmach' },
  p_reforge: { k: 'preforge' }, p_anvil: { k: 'panvil' }, p_map: { k: 'pmap' }, p_menu: { k: 'pmenu' },
  /* 새 게임 · 슬롯 · 타이틀 — 난이도는 MODES 색, 나머지는 탭 아이콘과 같은 금빛 한 벌 */
  mode_normal: { k: 'ng', g: 'shield', c: '#8fb87a' }, mode_hard: { k: 'ng', g: 'swords', c: '#e0a03a' },
  mode_impossible: { k: 'ng', g: 'skull', c: '#d0564c' },
  size_s: { k: 'ng', g: 'land', n: 1 }, size_m: { k: 'ng', g: 'land', n: 2 }, size_l: { k: 'ng', g: 'land', n: 3 },
  ng_char: { k: 'ng', g: 'hood' }, ng_mode: { k: 'ng', g: 'sword' }, ng_world: { k: 'ng', g: 'globe' },
  ng_name: { k: 'ng', g: 'quill' }, ng_seed: { k: 'ng', g: 'seed' },
  ng_start: { k: 'ng', g: 'play' }, ng_cancel: { k: 'ng', g: 'cross' }, ng_new: { k: 'ng', g: 'compass' },
  t_single: { k: 'ng', g: 'sword' }, t_settings: { k: 'ng', g: 'gear' }, t_credits: { k: 'ng', g: 'scroll' },
  t_quit: { k: 'ng', g: 'door' },
  u_resume: { k: 'ng', g: 'play' }, u_save: { k: 'ng', g: 'disk' }, u_export: { k: 'ng', g: 'export' }, u_title: { k: 'ng', g: 'home' },
  s_disp: { k: 'ng', g: 'speaker' }, s_noti: { k: 'ng', g: 'bell' }, s_keys: { k: 'ng', g: 'keys' }, s_hud: { k: 'ng', g: 'layout' }
};
/* 펫 생김새 — 색은 PETS의 c를 그대로 쓰고, 여기서는 실루엣만 고른다. */
export const PET_FORM = {
  ember_squirrel: 'beast', glass_moth: 'moth', pebble_kin: 'rock', dust_sparrow: 'bird',
  frost_kit: 'beast', ash_owl: 'bird', cinder_toad: 'rock', thorn_wisp: 'wisp',
  star_sprite: 'wisp', ember_drake: 'drake', void_hatchling: 'wisp', storm_falcon: 'bird'
};
export const NPCSPEC = {
  elara: { hair: '#d8c07a', skin: '#e8c39a', cloth: '#c8a06a', long: 1 },
  borin: { hair: '#6a4a2a', skin: '#d8b088', cloth: '#8a6a4a', beard: 1 },
  mira: { hair: '#6a4a92', skin: '#e0bfa0', cloth: '#8f6fd8', long: 1, hat: 1 },
  old: { hair: '#c8c8c8', skin: '#d8c0aa', cloth: '#9a9a9a', beard: 1, old: 1 },
  tamer: { hair: '#3a2a1e', skin: '#c89468', cloth: '#b8804a', long: 1 },
  trainer: { hair: '#4a4a42', skin: '#c89468', cloth: '#5a6a5a', beard: 1 },
  haran: { hair: '#7a3a22', skin: '#dcb08c', cloth: '#c06a3a', beard: 1 },
  seira: { hair: '#4a5a72', skin: '#e0bfa0', cloth: '#7a8fb8', long: 1 },
  kade: { hair: '#5a5a62', skin: '#d0a880', cloth: '#8a8a96' }
};

/* ================= 업적 아이콘 ================= */
export const GLSPEC = {};
for (const g of ['shard', 'house', 'wall', 'wave', 'crown', 'sword', 'trophy', 'field',
  'factory', 'anvil', 'pit', 'down', 'cloud', 'tablet', 'bubble', 'skull', 'redmoon',
  'key', 'candle', 'bed', 'scroll', 'sun', 'coin', 'coins', 'paw', 'hands', 'receipt',
  'clock', 'clock2', 'clock3', 'lung', 'grave', 'star', 'hidden'])
  GLSPEC[g] = { k: 'gl', g };

/* 장식 아이템(ITEMS 의 deco: 1)은 하나하나 적지 않고 제 타일 그림을 쓴다 — 장식을 더할 때 그림을 빠뜨리는 일(CLAUDE.md §1-6)이 원리적으로 안 생긴다. */
for (const k in ITEMS) if (ITEMS[k].deco && !ISPEC[k])
  ISPEC[k] = { k: ITEMS[k].tile === T.MOSSSTONE ? 'block' : 'deco', tile: ITEMS[k].tile };
/* 그림 PNG 만 있는 아이템(manifest items.files)도 아틀라스 칸이 있어야 PNG 가 그 칸에 덮인다 — 칸이 없으면 가방에 빈 칸으로
   나왔다(뱃사람의 나침반이 그랬다). 절차 그림이 없는 아이템엔 수수한 조각 그림을 칸 삼아 둔다. */
for (const k in ITEMS) if (!ISPEC[k] && !ITEMS[k].tile)
  ISPEC[k] = { k: 'shard', c: '#9a9aa2' };

/* 업적 → 그림. */
export const ACH_ART = {
  a_ch1: 'g:shard', a_village: 'g:house', a_session2: 'g:wall', a_session3: 'g:wave',
  a_first_boss: 'g:crown', a_five_hearts: 'g:shard', a_story_bosses: 'g:sword',
  a_all_bosses: 'g:trophy',

  a_first_crop: 'i:seed_wheat', a_first_cook: 'i:food_bread', a_harvest: 'i:wheat',
  a_three_crops: 'i:starroot', a_cook: 'i:food_stew', a_feast: 'i:food_feast',
  a_farm_1000: 'g:field',

  a_first_mach: 'i:m_belt', a_power: 'i:m_gen', a_first_line: 'i:m_assembler',
  a_smart: 'i:m_press', a_lv4_mach: 'i:m_battery_hi', a_factory: 'g:factory',
  a_belt: 'i:m_belt_f',

  a_first_pick: 'i:pick_copper', a_wood_200: 'i:wood', a_first_fish: 'i:fish_common',
  a_gunpowder: 'i:gunpowder', a_fish: 'i:fish_deep', a_abyss_gear: 'i:spear_tide',
  a_mine_2000: 'i:pick_iron', a_enh10: 'g:anvil', a_mine_20000: 'g:pit',

  a_cave: 'i:torch', a_deep: 'g:down', a_hell: 'i:hell_ore', a_sky: 'g:cloud',
  a_lore: 'g:tablet', a_seafloor: 'i:abyss_pearl', a_yunseul: 'g:bubble',

  a_isle: 'g:trophy', a_kill_50: 'i:sword_copper', a_kill_300: 'g:skull', a_bloodmoon: 'g:redmoon',
  a_ruin_bosses: 'g:key', a_secret_bosses: 'g:candle', a_kill_3000: 'g:skull',
  a_fault: 'i:stone', a_cave_kinds: 'i:crystal',
  a_pulse_rage: 'i:pulse_shard', a_survey_s: 'i:seal_pyramid', a_echo5: 'i:drum_pulse',

  a_inn: 'g:bed', a_village4: 'g:house', a_side10: 'g:scroll', a_day50: 'g:sun',
  a_gold: 'g:coin', a_pet_max: 'g:paw', a_gold10m: 'g:coins',

  a_trade1: 'g:hands', a_play1h: 'g:clock', a_drown: 'g:lung', a_trade100: 'g:receipt',
  a_play10h: 'g:clock2', a_die20: 'g:grave', a_play100h: 'g:clock3', a_level100: 'g:star'
};

/* ================= 아틀라스 ================= */
/** 그림 갈래(spec.k) → 그리는 법 — art/items/*.js 가 채운다. this 는 Art, H 는 paint 의 인자·도우미 */
export const ITEM_PAINT = {};

export const Art: Bag = {
  atlas: null, cells: {}, urls: {}, ready: false, COLS: 16,

  build() {
    const keys = [];
    for (const id in ISPEC) keys.push(['i:' + id, ISPEC[id]]);
    for (const id in SKSPEC) keys.push(['s:' + id, SKSPEC[id]]);
    for (const id in BFSPEC) keys.push(['b:' + id, BFSPEC[id]]);
    for (const id in UISPEC) keys.push(['u:' + id, UISPEC[id]]);
    for (const id in GLSPEC) keys.push(['g:' + id, GLSPEC[id]]);
    for (const id in NPCSPEC) keys.push(['n:' + id, { k: 'npc', p: NPCSPEC[id] }]);
    /* 펫 — PETS를 그대로 훑어 그린다. */
    for (const id in PETS) {
      const spec = { k: 'pet', c: PETS[id].c, form: PET_FORM[id] || 'beast', r: PETS[id].r };
      keys.push(['p:' + id, spec]);
      keys.push(['i:pet_' + id, spec]);
    }

    const cols = this.COLS, rows = Math.ceil(keys.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * S32; cv.height = rows * S32;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const rng = new RNG('ashfall-itemart-1');

    keys.forEach(([key, spec], n) => {
      const cx = n % cols, cy = (n / cols) | 0;
      this.cells[key] = [cx, cy];
      g.save();
      g.translate(cx * S32, cy * S32);
      /* ★ 한 칸이 터져도 나머지는 그린다. */
      try {
        this.paint(g, spec, rng);
      } catch (e) {
        console.warn(`${tr('[아이콘]')} ` + key + ` ${tr('를 그리지 못했습니다:')}`, e && e.message);
      }
      g.restore();
      // 펫은 형태(네발·새·정령…)마다 그림이 칸 안에서 치우쳐 있어서, 슬롯에 나란히 놓으면 저마다 다른 높이로 떠 보인다.
      if (spec.k === 'pet' || (spec.k === 'slotic' && spec.m === 'pet')) this.centerCell(g, cx * S32, cy * S32);
      this.outline(g, cx * S32, cy * S32);
    });

    this.atlas = cv;
    this.ready = true;
  },

  /** 손그림 아이콘이 로드되면 절차 생성 아틀라스의 해당 칸을 덮어 그린다. */
  /* ★ file:// 로 열었을 때는 손그림을 아틀라스에 얹지 않는다. */
  noTaint: (typeof location !== 'undefined' && location.protocol === 'file:'),
  applySprite(key, img) {
    if (this.noTaint) return false;
    if (!this.atlas || !img || !img.width) return false;
    const c = this.cells[key];
    if (!c) return false;
    const g = this.atlas.getContext('2d', { willReadFrequently: true });
    g.save();
    g.imageSmoothingEnabled = false;
    g.clearRect(c[0] * S32, c[1] * S32, S32, S32);
    g.drawImage(img, c[0] * S32, c[1] * S32, S32, S32);
    g.restore();
    delete this.urls[key];
    return true;
  },
  applyItemSprite(id, img) { return this.applySprite('i:' + id, img); },

  /** 칸 안에서 실제로 칠해진 부분을 재서 한가운데로 옮긴다. */
  centerCell(g, ox, oy) {
    const img = g.getImageData(ox, oy, S32, S32), d = img.data;
    let x0 = S32, y0 = S32, x1 = -1, y1 = -1;
    for (let y = 0; y < S32; y++) for (let x = 0; x < S32; x++) {
      if (d[(y * S32 + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 < 0) return;                                   // 빈 칸
    let dx = Math.round((S32 - 1 - x1 - x0) / 2), dy = Math.round((S32 - 1 - y1 - y0) / 2);
    dx = clamp(dx, -x0, S32 - 1 - x1);
    dy = clamp(dy, -y0, S32 - 1 - y1);
    if (!dx && !dy) return;
    g.clearRect(ox, oy, S32, S32);
    g.putImageData(img, ox + dx, oy + dy, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  },

  /** 투명 픽셀 중 불투명과 인접한 곳에 어두운 테두리 — 어두운 UI에서 형태가 살아난다 */
  outline(g, ox, oy) {
    const img = g.getImageData(ox, oy, S32, S32);
    const d = img.data, src = new Uint8ClampedArray(d);
    const A = (x, y) => (x < 0 || y < 0 || x >= S32 || y >= S32) ? 0 : src[(y * S32 + x) * 4 + 3];
    for (let y = 0; y < S32; y++) for (let x = 0; x < S32; x++) {
      const k = (y * S32 + x) * 4;
      if (src[k + 3] > 10) continue;
      if (A(x - 1, y) > 120 || A(x + 1, y) > 120 || A(x, y - 1) > 120 || A(x, y + 1) > 120) {
        d[k] = 10; d[k + 1] = 8; d[k + 2] = 14; d[k + 3] = 240;
      }
    }
    g.putImageData(img, ox, oy);
  },

  /* ---- 조회 ---- */
  has(key) { return !!this.cells[key]; },
  url(key) {
    if (this.urls[key]) return this.urls[key];
    const c = this.cells[key];
    if (!c) return '';
    const t = document.createElement('canvas');
    t.width = S32; t.height = S32;
    t.getContext('2d').drawImage(this.atlas, c[0] * S32, c[1] * S32, S32, S32, 0, 0, S32, S32);
    return this.urls[key] = t.toDataURL();
  },
  itemUrl(id) { return this.url('i:' + id); },
  skillUrl(id) { return this.url('s:' + id); },
  buffUrl(id) { return this.url('b:' + id); },
  uiUrl(id) { return this.url('u:' + id); },
  /** 업적 아이콘 — 아이템 그림이든 새로 그린 것이든 키 하나로 받는다 */
  achUrl(id) { return this.url(ACH_ART[id] || 'g:star'); },
  achHiddenUrl() { return this.url('g:hidden'); },
  npcUrl(id) { return this.url('n:' + id); },
  /** 캔버스에 직접 그리기 */
  draw(ctx, key, x, y, size) {
    const c = this.cells[key];
    if (!c) return;
    ctx.drawImage(this.atlas, c[0] * S32, c[1] * S32, S32, S32, x, y, size, size);
  },
  drawItem(ctx, id, x, y, size) { this.draw(ctx, 'i:' + id, x, y, size); },

  /* ================= 페인터 ================= */
  paint(g, s, rng) {
    // 공통 도우미 (좌표계 0..32)
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const poly = (pts, c) => {
      g.fillStyle = c; g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath(); g.fill();
    };
    const circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const ell = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
    const stroke = (c, w, fn) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); fn(); g.stroke(); };
    // 부드러운 방사형 후광 — 단색 원판은 테두리가 생겨 디스크처럼 보인다
    const glow = (x, y, r, c, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, c);
      gr.addColorStop(.55, c);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.globalAlpha = (a || .3) * .62; g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
    };

    const paint = ITEM_PAINT[s.k];
    if (paint) paint.call(this, { g, s, rng, P, poly, circ, ell, stroke, glow });
  }
};
