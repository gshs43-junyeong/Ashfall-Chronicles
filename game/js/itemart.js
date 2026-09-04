/* ===== itemart.js — 절차적 아이템/스킬/UI 스프라이트 =====
   32×32 셀 아틀라스에 코드로 직접 그린다. 외부 이미지 의존 없음.
   DOM(인벤토리·트리·핫바)에는 셀을 잘라 data URL로, 캔버스(드롭·장착 무기)에는 blit으로 쓴다. */
'use strict';

const S32 = 32;
const sh2 = (c, m) => shade(c, m);

/* ---------------- 아이템 명세 ---------------- */
const ISPEC = {
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
  pick_copper: { k: 'pick', c: '#c0762f' },
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

  /* 유적 유물 여덟 — 유적마다 하나씩. 색으로도 어느 유적 것인지 알아보게 갈랐다 */
  relic_frostpane:  { k: 'crystal', c: '#9fe0ff', glow: 1 },
  relic_sundial:    { k: 'amulet', c: '#d8b13d', gem: '#ffe08a', shape: 'drop' },
  relic_lastlamp:   { k: 'torchitem' },
  relic_rotcore:    { k: 'heart', c: '#7a9c4a', glow: '#a8d060' },
  relic_sporebell:  { k: 'wisp', c: '#7fd8c0', glow: 1 },
  relic_frostmark:  { k: 'sigil', c: '#bcd8f0' },
  relic_mazeeye:    { k: 'sigil', c: '#c8a04a' },
  relic_hollowseed: { k: 'crystal', c: '#6a4a8a', glow: 1 },
  charm_conduit: { k: 'cell', c: '#4f9cf0', fill: 1, glow: '#8fd0f0' },
  charm_zenith: { k: 'amulet', c: '#bcd8f0', gem: '#e8f0fa', shape: 'wing' },

  /* 소비 — 병 크기(sz)로 작은/일반/큰을 가른다. 치유·마나는 원형 병, 비약류는 각진 병으로
     이미 나뉘어 있었으니 그 구분은 그대로 두고 크기만 얹었다. */
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

  /* 채집물 */
  wildflower: { k: 'wildflower', c: '#d87ab0' },
  weed: { k: 'weed_icon', c: '#5a8f3a' },
  cactus_flesh: { k: 'cactus', c: '#4a8a4a' },
  mushroom: { k: 'mushroom', c: '#e0402c' },

  /* 재료 · 설치물 */
  wood: { k: 'log', c: '#7a5734' },
  stone: { k: 'block', tile: T.STONE },
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

  /* --- 세션 2: 지하 공창 --- */
  steel_plate: { k: 'block', tile: T.STEELPLATE },
  power_core: { k: 'crystal', c: '#e8a53a', glow: 1 },
  conduit_part: { k: 'bar', c: '#8a6a3a' },
  blueprint_frag: { k: 'runefrag', c: '#7a9fc0' },
  blueprint_core: { k: 'sigil', c: '#7a9fc0' },
  gear_basic: { k: 'ring', c: '#8a8a96', gem: '#4a4a52' },
  pick_drill: { k: 'pick', c: '#c8a06a', glow: '#e8a53a' },

  /* --- 3단계: 동력 자원 · 중간재 --- */
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

  /* --- 3단계: 기계 (타일 그림을 그대로 아이콘으로 쓴다) --- */
  m_belt: { k: 'machine', tile: T.M_BELT },
  m_drill: { k: 'machine', tile: T.M_DRILL },
  m_drill_e: { k: 'machine', tile: T.M_DRILL_E, glow: '#4a8ab0' },
  m_pump: { k: 'machine', tile: T.M_PUMP },
  m_smelter: { k: 'machine', tile: T.M_SMELTER },
  m_press: { k: 'machine', tile: T.M_PRESS },
  m_refinery: { k: 'machine', tile: T.M_REFINERY },
  m_assembler: { k: 'machine', tile: T.M_ASSEMBLER },
  m_crate: { k: 'machine', tile: T.M_CRATE },
  /* 손으로 놓는 설치물 — 세계에 그려지는 모습과 같은 실루엣을 쓴다(아이콘만 보고
     "이게 그 작업대"라고 알아볼 수 있어야 한다) */
  station_work: { k: 'stationic', m: 'work' },
  station_forge: { k: 'stationic', m: 'forge' },
  crate_wood: { k: 'stationic', m: 'crate' },
  crate_gold: { k: 'stationic', m: 'crate', gold: 1 },
  m_gen: { k: 'machine', tile: T.M_GEN, glow: '#e8842a' },
  m_battery: { k: 'machine', tile: T.M_BATTERY, glow: '#6fe0c0' },
  m_pole: { k: 'machine', tile: T.M_POLE },
  m_sorter: { k: 'machine', tile: T.M_SORTER },
  m_turret: { k: 'machine', tile: T.M_TURRET },
  m_trap: { k: 'machine', tile: T.M_TRAP, glow: '#9fd8ff' },
  m_switch: { k: 'machine', tile: T.M_SWITCH, glow: '#e0563c' },

  /* --- 3단계: 동력 장비 --- */
  pick_arc: { k: 'pick', c: '#7fd0e8', glow: '#9fd8ff' },
  saw_auto: { k: 'sawblade', c: '#c8ccd4', glow: '#e0b93d' },
  gun_rail: { k: 'railgun', c: '#8a8a96', glow: '#9fd8ff' },
  helm_exo: { k: 'helm', c: '#8fa8b8', crest: '#6fe0c0', glow: '#6fe0c0' },
  chest_exo: { k: 'chest', c: '#8fa8b8', glow: '#6fe0c0' },
  boots_exo: { k: 'boots', c: '#8fa8b8', glow: '#6fe0c0' },
  charm_cap: { k: 'cell', c: '#e0b93d', fill: 1, glow: '#ffe08a' },

  /* --- 5단계: 정글 · 버섯 골짜기 --- */
  mud: { k: 'block', tile: T.MUD },
  fern_frond: { k: 'weed_icon', c: '#4a8a3a' },
  orchid: { k: 'wildflower', c: '#c85a9a' },
  lily_pad: { k: 'wildflower', c: '#e888c0' },
  glowcap: { k: 'mushroom', c: '#6fe0c0', glow: 1 },
  vine_coil: { k: 'wire', c: '#3f7a34' },
  spore_sac: { k: 'gel', c: '#6fe0c0' },
  food_curry: { k: 'bowl', c: '#8a6a4a', soup: '#c8843a', bits: '#4a8a3a' },
  potion_glow: { k: 'potion', c: '#6fe0c0', glow: 1 },
  potion_glow_greater: { k: 'potion', c: '#9ff5d8', glow: 1, sz: 'lg' },
  charm_canopy: { k: 'feather', c: '#4a8a3a' },
  charm_spore: { k: 'crystal', c: '#6fe0c0', glow: 1 },

  /* --- 6단계: 유적 --- */
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

  /* --- 7단계: 폭주로 --- */
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

  /* --- 4단계: 마을 건축 (타일 그림을 그대로 아이콘으로) --- */
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

  /* --- 4단계: 농업 --- */
  hoe_iron: { k: 'hoe', c: '#b8bcc4' },
  seed_wheat: { k: 'seed', c: '#c8a850' },
  seed_starroot: { k: 'seed', c: '#8fd0a0' },
  seed_ashcap: { k: 'seed', c: '#c0705a' },
  wheat: { k: 'wheatitem', c: '#e0c058' },
  starroot: { k: 'rootitem', c: '#8fd0a0', glow: '#bfe8cf' },
  flour: { k: 'flouritem', c: '#e8dcc0' },
  fertilizer: { k: 'compost', c: '#5a4632' },

  /* --- 4단계: 음식 --- */
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
  bag_vault: { k: 'sack', c: '#7a7160', strap: '#3a3550', glow: '#a06fff' }
};

/* ---------------- 스킬 아이콘 명세 ---------------- */
const SKSPEC = {
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
  s_arch: { k: 'rune', c: '#a06fff' }
};

/* ---------------- 버프 / UI / NPC ---------------- */
const BFSPEC = {
  rage: { k: 'impact', c: '#e0603c' },
  iron: { k: 'shield', c: '#a8a49a' },
  well: { k: 'stew' },
  frostbite: { k: 'snow', c: '#9fe0ff' },
  burn: { k: 'flame', c: '#ff8a3a' },
  swift_kill: { k: 'wind', c: '#9fe0c0' },
  wish: { k: 'coin', c: '#ffd85a' }        // 분수대에 던진 금화
};
const UISPEC = {
  sun: { k: 'sun' }, moon: { k: 'moon' }, coin: { k: 'coin' }, chat: { k: 'chat' },
  equip: { k: 'equipui' }, trash: { k: 'trashui' },
  /* 장비 칸이 비었을 때 흐리게 깔리는 실루엣 — 어느 칸에 뭘 끼우는지 글자 없이 보이게 */
  slot_weapon: { k: 'slotic', m: 'weapon' },
  slot_helm: { k: 'slotic', m: 'helm' },
  slot_chest: { k: 'slotic', m: 'chest' },
  slot_boots: { k: 'slotic', m: 'boots' },
  slot_acc: { k: 'slotic', m: 'acc' },
  slot_bag: { k: 'slotic', m: 'bag' },
  slot_pet: { k: 'slotic', m: 'pet' }
};
/* 펫 생김새 — 색은 PETS의 c를 그대로 쓰고, 여기서는 실루엣만 고른다.
   beast(네발) · moth(날개벌레) · bird(새) · rock(둥근 돌) · wisp(불꽃) · drake(뿔 달린 새끼용) */
const PET_FORM = {
  ember_squirrel: 'beast', glass_moth: 'moth', pebble_kin: 'rock', dust_sparrow: 'bird',
  frost_kit: 'beast', ash_owl: 'bird', cinder_toad: 'rock', thorn_wisp: 'wisp',
  star_sprite: 'wisp', ember_drake: 'drake', void_hatchling: 'wisp', storm_falcon: 'bird'
};
const NPCSPEC = {
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

/* ================= 아틀라스 ================= */
const Art = {
  atlas: null, cells: {}, urls: {}, ready: false, COLS: 16,

  build() {
    const keys = [];
    for (const id in ISPEC) keys.push(['i:' + id, ISPEC[id]]);
    for (const id in SKSPEC) keys.push(['s:' + id, SKSPEC[id]]);
    for (const id in BFSPEC) keys.push(['b:' + id, BFSPEC[id]]);
    for (const id in UISPEC) keys.push(['u:' + id, UISPEC[id]]);
    for (const id in NPCSPEC) keys.push(['n:' + id, { k: 'npc', p: NPCSPEC[id] }]);
    /* 펫 — PETS를 그대로 훑어 그린다. 'p:'는 세계에 떠다니는 그림, 'i:pet_xxx'는
       가방/장비창 아이콘이고 둘 다 같은 페인터를 쓴다(같은 생김새라야 알아본다). */
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
      this.paint(g, spec, rng);
      g.restore();
      // 펫은 형태(네발·새·정령…)마다 그림이 칸 안에서 치우쳐 있어서, 슬롯에 나란히 놓으면
      // 저마다 다른 높이로 떠 보인다. 좌표를 형태별로 손보는 대신 실제로 칠해진 영역을
      // 재서 칸 한가운데로 맞춘다 — 나중에 종류를 더 그려도 저절로 정렬된다.
      // 빈 펫 칸의 발자국 실루엣(slotic/pet)도 같은 문제라 함께 맞춘다 — 손으로 잡은
      // 좌표가 칸 중심에서 왼쪽으로 약 1.85px 치우쳐 있었다(장비 칸(vault 실루엣들)은
      // 지적된 적이 없어 건드리지 않는다).
      if (spec.k === 'pet' || (spec.k === 'slotic' && spec.m === 'pet')) this.centerCell(g, cx * S32, cy * S32);
      this.outline(g, cx * S32, cy * S32);
    });

    this.atlas = cv;
    this.ready = true;
  },

  /** 손그림 아이콘이 로드되면 절차 생성 아틀라스의 해당 칸을 덮어 그린다.
      아틀라스만 갈아 끼우면 itemUrl(DOM)과 drawItem(캔버스)이 둘 다 자동으로 새 그림을 쓴다.
      urls 캐시는 이미 만들어진 data URL이 남아 있을 수 있으므로 같이 지운다. */
  applySprite(key, img) {
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

  /** 칸 안에서 실제로 칠해진 부분을 재서 한가운데로 옮긴다.
      putImageData는 덮어쓰기라 옮길 때 옆 칸을 건드릴 수 있어서, 잉크가 있는 사각형만
      골라(dirty rect) 쓰고 그 범위가 칸을 벗어나지 않게 이동량을 제한한다. */
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

    switch (s.k) {

      /* ---------- 무기 ---------- */
      case 'sword': {
        const bw = s.w, base = s.c, lt = sh2(base, 1.3), dk = sh2(base, .68);
        if (s.glow) glow(16, 11, 11, s.glow, .22);
        poly([[16, 1], [16 + bw, 8], [16 + bw - .5, 20], [16 - bw + .5, 20], [16 - bw, 8]], base);
        poly([[16, 2], [16, 20], [16 - bw + 1, 20], [16 - bw + 1, 8.5]], lt);
        poly([[16, 2], [16, 20], [16 + bw - 1, 20], [16 + bw - 1, 8.5]], dk);
        P(15.4, 3, 1.2, 17, sh2(base, 1.5));
        if (s.jag) for (let y = 9; y < 20; y += 3.4) {
          poly([[16 - bw, y], [16 - bw - 2, y + 1], [16 - bw, y + 2]], base);
          poly([[16 + bw, y + 1.7], [16 + bw + 2, y + 2.7], [16 + bw, y + 3.7]], base);
        }
        const gd = s.g;
        P(6.5, 20, 19, 3, gd); P(6.5, 20, 19, 1, sh2(gd, 1.35));
        poly([[6.5, 20], [4, 21.5], [6.5, 23]], gd);
        poly([[25.5, 20], [28, 21.5], [25.5, 23]], gd);
        P(14, 23, 4, 6, s.grip);
        P(14, 24.5, 4, 1, sh2(s.grip, .55)); P(14, 26.5, 4, 1, sh2(s.grip, .55));
        circ(16, 29.6, 2.3, gd); circ(15.4, 29, .8, sh2(gd, 1.4));
        break;
      }

      case 'scythe': {
        if (s.glow) glow(14, 14, 13, s.glow, .22);
        // 초승달 날: 바깥 호와 안쪽 호 사이를 채운다
        g.fillStyle = s.c; g.beginPath();
        g.arc(16, 20, 14, Math.PI, Math.PI * 1.61, false);
        g.arc(16, 22, 10, Math.PI * 1.61, Math.PI, true);
        g.closePath(); g.fill();
        g.fillStyle = sh2(s.c, 1.4); g.beginPath();
        g.arc(16, 20, 14, Math.PI, Math.PI * 1.61, false);
        g.arc(16, 21, 12.2, Math.PI * 1.61, Math.PI, true);
        g.closePath(); g.fill();
        // 자루
        stroke(s.shaft, 3.2, () => { g.moveTo(26, 30); g.lineTo(19.5, 8); });
        stroke(sh2(s.shaft, 2.4), 1.1, () => { g.moveTo(25.1, 29.4); g.lineTo(18.7, 8.6); });
        circ(20, 7.6, 2.4, sh2(s.shaft, 2));
        break;
      }

      case 'bow': {
        if (s.glow) glow(14, 16, 13, s.glow, .2);
        const a = 1.0, cxx = 23, r = 15;
        // 활대(왼쪽으로 볼록)
        stroke(s.c, 3.4, () => { g.arc(cxx, 16, r, Math.PI - a, Math.PI + a); });
        stroke(sh2(s.c, 1.45), 1.2, () => { g.arc(cxx, 16, r - 1.4, Math.PI - a * .88, Math.PI + a * .88); });
        const ex = cxx - r * Math.cos(a);
        const ey1 = 16 - r * Math.sin(a), ey2 = 16 + r * Math.sin(a);
        // 시위
        stroke(s.s, 1.3, () => { g.moveTo(ex, ey1); g.lineTo(ex, ey2); });
        circ(ex, ey1, 1.3, sh2(s.c, .7)); circ(ex, ey2, 1.3, sh2(s.c, .7));
        // 그립
        P(cxx - r - 1.4, 13, 3.4, 6, '#4a3122');
        // 메긴 화살
        stroke('#8a6a45', 1.8, () => { g.moveTo(ex - 1, 16); g.lineTo(27, 16); });
        poly([[30, 16], [25, 13.4], [25, 18.6]], '#d0d4dc');
        poly([[ex - 1, 16], [ex + 4, 12.8], [ex + 4, 19.2]], sh2(s.c, 1.5));
        break;
      }

      case 'staff': {
        const hd = s.head;
        if (s.glow) glow(19, 8, 11, s.glow, .26);
        stroke(s.c, 3, () => { g.moveTo(11, 30); g.lineTo(18, 12); });
        stroke(sh2(s.c, 1.45), 1, () => { g.moveTo(10.3, 29.4); g.lineTo(17.3, 12.4); });
        if (s.style === 'crystal') {
          poly([[19, 2], [23, 9], [19, 15], [15, 9]], hd);
          poly([[19, 2], [19, 15], [15, 9]], sh2(hd, 1.4));
          P(18.3, 4, 1.2, 7, sh2(hd, 1.7));
        } else if (s.style === 'claw') {
          stroke(sh2(s.c, 1.6), 2, () => { g.moveTo(14, 12); g.lineTo(13, 4); });
          stroke(sh2(s.c, 1.6), 2, () => { g.moveTo(23, 11); g.lineTo(25, 4); });
          circ(19, 8, 4.6, hd); circ(19, 8, 3, sh2(hd, 1.4)); circ(17.6, 6.6, 1.2, '#ffffff');
        } else {
          circ(19, 8, 5, hd); circ(19, 8, 3.4, sh2(hd, 1.35));
          circ(17.4, 6.4, 1.4, '#ffffff');
          stroke(sh2(s.c, 1.3), 1.6, () => { g.arc(19, 8, 6.4, 2.2, 4.6); });
        }
        break;
      }

      case 'spear': {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .7);
        if (s.glow) glow(16, 10, 11, s.glow, .22);
        // 자루
        stroke('#6a4a28', 2.6, () => { g.moveTo(16, 31); g.lineTo(16, 10); });
        stroke('#8f6740', 1, () => { g.moveTo(15.3, 30.4); g.lineTo(15.3, 10.4); });
        // 창날 — 길고 좁은 삼각형
        poly([[16, 1], [20, 12], [16, 9], [12, 12]], c);
        poly([[16, 1], [16, 9], [12, 12]], dk);
        poly([[16, 1], [18, 8], [16, 9]], lt);
        // 날개 장식
        poly([[16, 10], [22, 13], [16, 12]], sh2(c, .85));
        poly([[16, 10], [10, 13], [16, 12]], sh2(c, .85));
        break;
      }

      /* ---------- 낚싯대: 대각선 장대 + 늘어진 줄과 찌 ---------- */
      case 'fishrod': {
        const c = s.c;
        stroke('#6a4a28', 2.2, () => { g.moveTo(5, 29); g.lineTo(27, 4); });
        stroke('#9a7a4a', 0.8, () => { g.moveTo(6, 27.6); g.lineTo(26.2, 5.4); });
        stroke(c, 1, () => { g.moveTo(27, 4); g.quadraticCurveTo(24, 16, 17, 22); });
        circ(17, 22, 1.6, c);
        if (s.glow) glow(27, 4, 6, s.glow, .3);
        break;
      }

      /* ---------- 물고기: 타원 몸통 + 꼬리 삼각형 ---------- */
      case 'fishitem': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .7);
        ell(15, 17, 9, 5.4, c);
        ell(13, 15, 4, 2.2, lt);
        poly([[24, 17], [30, 12], [30, 22]], dk);
        poly([[6.5, 17], [2, 14], [2, 20]], dk);
        circ(9, 15.5, 1, '#1a1a1a');
        if (s.glow) glow(15, 17, 10, s.glow, .25);
        break;
      }

      case 'pick': {
        const c = s.c, lt = sh2(c, 1.4);
        if (s.glow) glow(16, 13, 13, s.glow, .2);
        // 자루
        stroke('#6a4a28', 3.4, () => { g.moveTo(16, 30); g.lineTo(16, 12); });
        stroke('#8f6740', 1.2, () => { g.moveTo(15, 29.2); g.lineTo(15, 13); });
        // 머리: 위로 볼록한 두꺼운 호
        stroke(c, 4.6, () => { g.arc(16, 20, 13, Math.PI + .34, TAU - .34); });
        stroke(lt, 1.7, () => { g.arc(16, 20, 14.4, Math.PI + .6, TAU - 1.0); });
        // 뾰족한 양 끝
        poly([[3.6, 14.2], [1, 17.6], [6, 17.4]], c);
        poly([[28.4, 14.2], [31, 17.6], [26, 17.4]], sh2(c, .78));
        // 자루 결합부
        P(13.4, 10.6, 5.2, 5.4, sh2(c, .82));
        P(13.4, 10.6, 5.2, 1.4, lt);
        break;
      }

      case 'axe': {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .72);
        // 자루
        stroke('#6a4a28', 3.4, () => { g.moveTo(20, 30); g.lineTo(20, 3); });
        stroke('#8f6740', 1.2, () => { g.moveTo(19, 29.2); g.lineTo(19, 4); });
        // 날: 왼쪽이 볼록한 날, 자루 쪽은 오목하게 파여 도끼 실루엣이 된다
        g.fillStyle = c; g.beginPath();
        g.moveTo(19.5, 7);
        g.lineTo(12, 7);
        g.quadraticCurveTo(3.5, 14.5, 10.5, 23);
        g.lineTo(19.5, 23);
        g.quadraticCurveTo(15.5, 15, 19.5, 7);
        g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath();
        g.moveTo(17.5, 9);
        g.lineTo(12.5, 9);
        g.quadraticCurveTo(6.5, 14.5, 11.5, 21);
        g.lineTo(16, 21);
        g.quadraticCurveTo(13, 15, 17.5, 9);
        g.closePath(); g.fill();
        // 날 끝 광택
        stroke(sh2(c, 1.7), 1.6, () => { g.moveTo(11.6, 7.8); g.quadraticCurveTo(4.6, 14.5, 11.2, 22.2); });
        stroke(dk, 1.2, () => { g.moveTo(19.5, 23); g.quadraticCurveTo(15.5, 15, 19.5, 7); });
        break;
      }

      /* ---------- 방어구 ---------- */
      case 'helm': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        if (s.glow) glow(16, 15, 12, s.glow, .18);
        if (s.crest) { P(15, 2, 2, 6, s.crest); P(13.4, 3.5, 5.2, 2, s.crest); }
        g.fillStyle = c; g.beginPath(); g.arc(16, 16, 10, Math.PI, 0); g.fill();
        P(6, 16, 20, 6, c);
        g.fillStyle = lt; g.beginPath(); g.arc(16, 16, 10, Math.PI, Math.PI * 1.45); g.fill();
        P(6, 16, 5, 6, lt);
        if (s.soft) { P(6, 20, 20, 2, dk); P(9, 13, 14, 2.4, dk); }
        else { P(8, 13.5, 16, 3.2, '#1a1a22'); P(15.2, 13.5, 1.6, 3.2, c); P(6, 21, 20, 1.6, dk); }
        P(6, 16, 20, 1, sh2(c, 1.5));
        break;
      }

      case 'chest': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        if (s.glow) glow(16, 17, 13, s.glow, .18);
        poly([[9, 8], [23, 8], [25, 14], [23, 27], [9, 27], [7, 14]], c);
        poly([[9, 8], [16, 8], [16, 27], [9, 27], [7, 14]], lt);
        circ(8, 10.5, 4, dk); circ(24, 10.5, 4, dk);
        circ(8, 10.5, 4, s.soft ? dk : c); circ(24, 10.5, 4, s.soft ? dk : sh2(c, .8));
        circ(7.2, 9.4, 1.6, lt);
        P(15.4, 9, 1.2, 18, dk);
        if (s.soft) { P(9, 20, 14, 1.6, dk); P(9, 23.5, 14, 1.6, dk); }
        else { P(8, 17, 16, 1.4, dk); P(8, 22, 16, 1.4, dk); }
        break;
      }

      case 'boots': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .6);
        if (s.glow) glow(16, 18, 12, s.glow, .18);
        const boot = (bx) => {
          poly([[bx, 9], [bx + 8, 9], [bx + 8, 21], [bx + 12, 21], [bx + 12, 26], [bx, 26]], c);
          poly([[bx, 9], [bx + 3.5, 9], [bx + 3.5, 26], [bx, 26]], lt);
          P(bx, 23.5, 12, 2.5, dk);
          P(bx, 12.5, 8, 1.6, dk);
        };
        boot(2); boot(17);
        break;
      }

      /* ---------- 장신구 ---------- */
      case 'ring': {
        stroke(s.c, 3.4, () => { g.arc(16, 20, 8, 0, TAU); });
        stroke(sh2(s.c, 1.45), 1.2, () => { g.arc(16, 20, 8, 2.4, 4.2); });
        poly([[16, 4], [21, 9.5], [16, 15], [11, 9.5]], s.gem);
        poly([[16, 4], [16, 15], [11, 9.5]], sh2(s.gem, 1.45));
        P(14.6, 7, 1.4, 1.4, '#ffffff');
        break;
      }

      case 'amulet': {
        stroke(s.c, 1.6, () => { g.arc(16, 15, 10, Math.PI * 1.15, Math.PI * 1.85); });
        stroke(s.c, 1.6, () => { g.moveTo(6.4, 12.4); g.lineTo(11, 19); });
        stroke(s.c, 1.6, () => { g.moveTo(25.6, 12.4); g.lineTo(21, 19); });
        if (s.shape === 'wing') {
          poly([[16, 17], [24, 19], [16, 27], [8, 19]], s.gem);
          poly([[16, 17], [16, 27], [8, 19]], sh2(s.gem, 1.4));
        } else {
          g.fillStyle = s.gem; g.beginPath();
          g.moveTo(16, 16); g.quadraticCurveTo(23, 22, 16, 28);
          g.quadraticCurveTo(9, 22, 16, 16); g.closePath(); g.fill();
          circ(14.2, 23, 1.6, sh2(s.gem, 1.5));
        }
        P(14.8, 16.5, 2.4, 2.4, sh2(s.c, 1.2));
        break;
      }

      case 'cloud': {
        glow(16, 16, 12, '#cfe8ff', .18);
        circ(11, 18, 6, '#e0ecfa'); circ(20, 18, 7, '#e0ecfa'); circ(15.5, 13.5, 6.5, '#f2f7ff');
        P(6, 18, 20, 5, '#e0ecfa');
        circ(13, 12, 3, '#ffffff');
        stroke('#9fc0e8', 1.4, () => { g.moveTo(11, 25); g.lineTo(9, 29); });
        stroke('#9fc0e8', 1.4, () => { g.moveTo(21, 25); g.lineTo(23, 29); });
        break;
      }

      case 'sigil': {
        glow(16, 16, 11, s.c, .18);
        stroke(sh2(s.c, .7), 2, () => { g.arc(16, 16, 10, 0, TAU); });
        g.fillStyle = s.c; g.beginPath();
        g.moveTo(16, 7); g.quadraticCurveTo(23, 15, 16, 23);
        g.quadraticCurveTo(9, 15, 16, 7); g.closePath(); g.fill();
        circ(14, 16, 1.8, sh2(s.c, 1.6));
        break;
      }

      case 'star': {
        const R = s.big ? 13 : 11, r = R * .42;
        if (s.glow) glow(16, 16, R + 3, s.glow, .3);
        g.fillStyle = s.c; g.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5;
          const x = 16 + Math.cos(a) * rad, y = 16 + Math.sin(a) * rad;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        g.fillStyle = sh2(s.c, 1.35); g.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = (i % 2 ? r : R) * .6, a = -Math.PI / 2 + i * Math.PI / 5;
          const x = 16 + Math.cos(a) * rad, y = 16 + Math.sin(a) * rad;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        break;
      }

      /* ---------- 소비 ---------- */
      case 'potion': {
        const liq = s.c;
        // sz: 'sm'(작은) | undefined(보통) | 'lg'(큰) — 병 밑동(16,29)을 기준점 삼아 통째로
        // 축소/확대한다. 그림을 새로 그리지 않고 같은 원본을 스케일만 달리해 3단계를 낸다.
        const scale = s.sz === 'sm' ? 0.72 : s.sz === 'lg' ? 1.22 : 1;
        if (scale !== 1) { g.save(); g.translate(16, 29); g.scale(scale, scale); g.translate(-16, -29); }
        P(13, 4, 6, 4, '#7a5734'); P(13, 4, 6, 1.4, '#9c7248');
        P(13.5, 8, 5, 5, '#b9cede');
        if (s.sq) {
          P(8, 13, 16, 15, '#b9cede');
          P(9.4, 17, 13.2, 9.6, liq);
          P(9.4, 17, 13.2, 1.4, sh2(liq, 1.4));
          P(10, 14, 2.4, 12, 'rgba(255,255,255,.35)');
        } else {
          circ(16, 20, 8.4, '#b9cede');
          circ(16, 21, 7, liq);
          P(9, 21, 14, 6.4, liq);
          circ(16, 21, 7, liq);
          ell(16, 14.6, 6.4, 2.2, sh2(liq, 1.35));
          ell(12.4, 17.4, 2, 3, 'rgba(255,255,255,.4)');
          circ(19, 23, 1.4, sh2(liq, 1.5));
          circ(14.5, 25, 1, sh2(liq, 1.5));
        }
        // 큰 병에는 허리끈, 작은 병에는 코르크가 아니라 짧은 마개로 크기 차이를 한 번 더 강조
        if (s.sz === 'lg') P(9, 19, 14, 2, 'rgba(0,0,0,.18)');
        if (scale !== 1) g.restore();
        break;
      }

      case 'stew': {
        g.fillStyle = '#8a6a4a'; g.beginPath();
        g.moveTo(4, 15); g.lineTo(28, 15);
        g.quadraticCurveTo(26, 28, 16, 28);
        g.quadraticCurveTo(6, 28, 4, 15); g.closePath(); g.fill();
        ell(16, 15, 12, 3.4, '#c8763a');
        ell(16, 15, 12, 3.4, '#b8632e');
        ell(13, 14.2, 2.4, 1.2, '#e0a050'); ell(19, 15.6, 2, 1, '#8fbf5a');
        P(4, 17, 24, 1.6, '#6a4a2a');
        stroke('#c8c0b0', 1.4, () => { g.moveTo(12, 9); g.quadraticCurveTo(14, 6, 12, 3); });
        stroke('#c8c0b0', 1.4, () => { g.moveTo(19, 9); g.quadraticCurveTo(21, 6, 19, 3); });
        break;
      }

      /* ---------- 재료 ---------- */
      case 'log': {
        const c = s.c, lt = sh2(c, 1.25), dk = sh2(c, .7);
        P(7, 10, 20, 13, c);
        P(7, 10, 20, 2.4, lt); P(7, 20.6, 20, 2.4, dk);
        for (let i = 0; i < 4; i++) P(10 + i * 4, 13, 1, 6, dk);
        ell(7, 16.5, 3.2, 6.5, sh2(c, 1.15));
        ell(7, 16.5, 2.1, 4.3, sh2(c, .85));
        ell(7, 16.5, 1, 2, sh2(c, 1.3));
        break;
      }

      case 'block': {
        if (TileArt.ready) g.drawImage(TileArt.atlas, 0, s.tile * TS, TS, TS, 4, 5, 24, 24);
        else P(4, 5, 24, 24, TILE_DEF[s.tile].c || '#666');
        P(4, 5, 24, 2, 'rgba(255,255,255,.22)');
        P(4, 27, 24, 2, 'rgba(0,0,0,.3)');
        P(26, 5, 2, 24, 'rgba(0,0,0,.22)');
        break;
      }

      /* ---------- 3단계: 기계 ----------
         타일 아틀라스에 이미 종류별로 다르게 그려 둔 그림을 그대로 키워 쓴다.
         받침대를 깔아 "설치하는 물건"이라는 걸 블록 아이콘과 구분한다. */
      case 'machine': {
        if (s.glow) glow(16, 15, 13, s.glow, .24);
        P(4, 26, 24, 3, '#3a3a44'); P(4, 26, 24, 1, '#5a5a66');
        if (TileArt.ready) g.drawImage(TileArt.atlas, 0, s.tile * TS, TS, TS, 5, 4, 22, 22);
        else P(5, 4, 22, 22, TILE_DEF[s.tile].c || '#666');
        P(3, 28, 26, 2, 'rgba(0,0,0,.35)');
        break;
      }

      /* ---------- 3단계: 자원 · 부품 ---------- */
      case 'barrel': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        P(7, 7, 18, 21, c);
        P(7, 7, 2.4, 21, lt); P(22.6, 7, 2.4, 21, dk);
        ell(16, 7, 9, 3.2, lt);
        ell(16, 7, 6.4, 2.1, s.fluid);
        P(7, 12, 18, 2, dk); P(7, 21, 18, 2, dk);
        P(11, 16, 10, 4, s.fluid);
        break;
      }

      case 'pellet': {
        const c = s.c;
        for (const [x, y, r] of [[12, 14, 4.4], [21, 12, 3.8], [17, 21, 4.6], [10, 22, 3.4], [23, 20, 3.2]]) {
          circ(x, y, r, c);
          circ(x - r * .3, y - r * .35, r * .38, sh2(c, 1.25));
          circ(x + r * .35, y + r * .4, r * .3, sh2(c, .7));
        }
        break;
      }

      case 'fuelbrick': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .6);
        poly([[5, 12], [27, 12], [27, 25], [5, 25]], c);
        poly([[5, 12], [27, 12], [24, 8], [8, 8]], lt);
        P(5, 22, 22, 3, dk);
        for (let i = 0; i < 3; i++) P(8 + i * 7, 14, 4, 7, sh2(c, .78));
        P(9, 15, 2, 2, '#e8842a'); P(23, 18, 2, 2, '#e8842a');
        break;
      }

      case 'wire': {
        const c = s.c, lt = sh2(c, 1.35);
        for (let i = 0; i < 3; i++) {
          const y = 9 + i * 6;
          stroke(c, 3.2, () => { g.moveTo(5, y); g.bezierCurveTo(12, y - 4, 20, y + 4, 27, y); });
          stroke(lt, 1.1, () => { g.moveTo(5, y - .8); g.bezierCurveTo(12, y - 4.8, 20, y + 3.2, 27, y - .8); });
        }
        break;
      }

      case 'circuit': {
        const c = s.c, tr = s.trace;
        P(5, 6, 22, 21, sh2(c, .72));
        P(5, 6, 22, 2, sh2(c, 1.3));
        P(5, 6, 2, 21, sh2(c, 1.1));
        // 배선
        stroke(tr, 1.4, () => { g.moveTo(9, 10); g.lineTo(9, 18); g.lineTo(18, 18); g.lineTo(18, 24); });
        stroke(tr, 1.4, () => { g.moveTo(23, 10); g.lineTo(14, 10); g.lineTo(14, 14); });
        for (const [x, y] of [[9, 10], [18, 24], [23, 10], [14, 14]]) circ(x, y, 1.5, tr);
        P(19, 13, 6, 6, '#1a1a1f');                       // 칩
        P(20, 14, 4, 4, '#33333d');
        break;
      }

      case 'motor': {
        const c = s.c, lt = sh2(c, 1.32), dk = sh2(c, .62);
        P(8, 9, 16, 15, c);
        P(8, 9, 16, 2, lt); P(8, 22, 16, 2, dk);
        for (let i = 0; i < 4; i++) P(10 + i * 4, 11, 1.6, 11, dk);   // 냉각 핀
        P(24, 14, 5, 5, s.trim);                                       // 축
        P(3, 14, 5, 5, sh2(c, .8));
        circ(16, 16.5, 3, sh2(c, 1.5)); circ(16, 16.5, 1.2, dk);
        break;
      }

      case 'frame': {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .55), dk2 = sh2(c, .35);
        // 비스듬히 세운 열린 골조 — 안이 비어 있어 "아직 뭔가 들어갈 자리"로 읽힌다
        const off = 5;
        // 뒤쪽 사각
        P(9, 4, 19, 3, dk); P(9, 21, 19, 3, dk2);
        P(9, 4, 3, 20, dk); P(25, 4, 3, 20, dk2);
        // 잇는 대각 기둥
        for (const [x, y] of [[5, 9], [22, 9], [5, 26], [22, 26]])
          stroke(dk, 2.4, () => { g.moveTo(x + 1.5, y + 1.5); g.lineTo(x + off, y - off + 1.5); });
        // 앞쪽 사각
        P(4, 9, 19, 3.4, c); P(4, 9, 19, 1.3, lt);
        P(4, 25, 19, 3.4, c); P(4, 27.4, 19, 1, dk);
        P(4, 9, 3.4, 20, c); P(4, 9, 1.3, 20, lt);
        P(19.6, 9, 3.4, 20, c); P(21.8, 9, 1.2, 20, dk);
        for (const [x, y] of [[5.7, 10.7], [21.3, 10.7], [5.7, 26.7], [21.3, 26.7]]) circ(x, y, 1.4, dk2);
        break;
      }

      case 'cell': {
        const c = s.c;
        if (s.glow && s.fill) glow(16, 17, 12, s.glow, .26);
        P(13, 3, 6, 3, '#8a8a96');                          // 단자
        P(8, 6, 16, 23, sh2(c, .5));
        P(8, 6, 16, 2, sh2(c, .9));
        P(10, 9, 12, 17, '#14161a');
        if (s.fill) {
          P(11, 11, 10, 13, c);
          P(11, 11, 10, 2, sh2(c, 1.5));
          P(14, 14, 4, 7, sh2(c, 1.8));                     // 번개 표식
        } else {
          P(11, 21, 10, 3, sh2(c, 1.1));
          stroke(sh2(c, 1.3), 1.6, () => { g.moveTo(12, 13); g.lineTo(20, 19); g.moveTo(20, 13); g.lineTo(12, 19); });
        }
        break;
      }

      case 'rivet': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .65);
        for (const [x, y] of [[10, 8], [21, 13], [12, 21]]) {
          ell(x, y, 4.2, 2.2, lt);
          P(x - 1.6, y, 3.2, 9, c);
          P(x - 1.6, y, 1.2, 9, lt);
          poly([[x - 1.6, y + 9], [x + 1.6, y + 9], [x, y + 12]], dk);
        }
        break;
      }

      case 'sawblade': {
        const c = s.c, dk = sh2(c, .6);
        if (s.glow) glow(16, 16, 13, s.glow, .22);
        for (let k = 0; k < 12; k++) {
          const a = k * TAU / 12;
          poly([[16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13],
                [16 + Math.cos(a + .22) * 10, 16 + Math.sin(a + .22) * 10],
                [16 + Math.cos(a - .22) * 10, 16 + Math.sin(a - .22) * 10]], c);
        }
        circ(16, 16, 10.5, c);
        circ(16, 16, 9, sh2(c, 1.3));
        circ(16, 16, 4.5, dk);
        circ(16, 16, 2.4, '#1a1a1f');
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .4;
          circ(16 + Math.cos(a) * 6.6, 16 + Math.sin(a) * 6.6, 1.2, dk);
        }
        break;
      }

      /* ---------- 4단계: 농업 ---------- */
      case 'hoe': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .65);
        P(17, 4, 3, 22, '#6a4a28');                        // 자루
        P(17, 4, 1.2, 22, '#8f6740');
        poly([[6, 5], [19, 5], [19, 9], [10, 9], [10, 13], [6, 13]], c);   // 날
        poly([[6, 5], [19, 5], [19, 6.4], [7.4, 6.4]], lt);
        P(7, 11, 3, 2, dk);
        break;
      }

      case 'seed': {
        const c = s.c;
        P(6, 12, 20, 14, '#7a5a3a');                       // 씨앗 봉지
        P(6, 12, 20, 2, '#9a7a52');
        poly([[6, 12], [26, 12], [23, 7], [9, 7]], '#8a6a44');
        P(13, 5, 6, 3, '#5a4028');
        for (const [x, y] of [[11, 17], [16, 20], [21, 17], [14, 24], [19, 24]]) {
          ell(x, y, 2.6, 1.8, c);
          ell(x - .7, y - .5, 1, .8, sh2(c, 1.4));
        }
        break;
      }

      case 'wheatitem': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .7);
        for (const [x, tilt] of [[11, -.16], [21, .16], [16, 0]]) {
          stroke(dk, 1.8, () => { g.moveTo(x + tilt * 14, 30); g.lineTo(x - tilt * 4, 12); });
          for (let k = 0; k < 5; k++) {                    // 이삭
            const y = 11 + k * 3.4;
            P(x - 3.4 - tilt * 4, y, 7, 2.6, c);
            P(x - 3.4 - tilt * 4, y, 7, 1, lt);
          }
          P(x - 1 - tilt * 4, 7, 2, 5, dk);
        }
        break;
      }

      case 'rootitem': {
        const c = s.c;
        if (s.glow) glow(16, 20, 11, s.glow, .24);
        poly([[16, 30], [11, 16], [16, 11], [21, 16]], c);  // 뿌리
        poly([[16, 30], [11, 16], [16, 13]], sh2(c, 1.3));
        for (let k = 0; k < 3; k++) P(11 + k, 18 + k * 3.4, 10 - k * 2, 1, sh2(c, .68));
        for (const a of [-.7, 0, .7]) {                     // 잎
          poly([[16, 12], [16 + Math.sin(a) * 9, 12 - Math.cos(a) * 9],
                [16 + Math.sin(a) * 7 + 3, 12 - Math.cos(a) * 6]], '#5fa85a');
        }
        P(15, 8, 2, 5, '#4a8a48');
        break;
      }

      case 'flouritem': {
        const c = s.c, dk = sh2(c, .72);
        P(8, 9, 16, 20, '#d8cbaa');                         // 종이 자루
        poly([[8, 9], [24, 9], [21, 5], [11, 5]], '#c8bb9a');
        P(8, 9, 16, 1.4, sh2('#d8cbaa', 1.2));
        P(11, 3, 10, 3, '#b8ab8a');
        P(11, 14, 10, 8, sh2('#d8cbaa', .84));              // 표지
        for (let i = 0; i < 12; i++) P(9 + (i * 7) % 14, 24 + (i % 3), 2, 1, c);   // 흘린 가루
        break;
      }

      case 'compost': {
        const c = s.c;
        for (const [x, y, r] of [[12, 20, 6], [20, 19, 5.5], [16, 24, 5]]) {
          circ(x, y, r, c);
          circ(x - r * .3, y - r * .35, r * .4, sh2(c, 1.3));
        }
        for (const [x, y] of [[10, 15], [18, 13], [22, 16]]) {   // 삐져나온 지푸라기
          stroke('#9a8a5a', 1.4, () => { g.moveTo(x, y + 5); g.lineTo(x + 2, y); });
        }
        circ(14, 19, 1.2, '#6a8a4a'); circ(19, 22, 1, '#6a8a4a');
        break;
      }

      /* ---------- 4단계: 음식 ---------- */
      case 'bread': {
        const c = s.c, lt = sh2(c, 1.28), dk = sh2(c, .68);
        ell(16, 19, 12, 8.5, c);
        ell(16, 17, 11, 7, lt);
        for (let k = 0; k < 3; k++)                          // 칼집
          stroke(dk, 1.8, () => { g.moveTo(9 + k * 5, 15); g.lineTo(13 + k * 5, 11); });
        ell(16, 26, 11, 3, dk);
        break;
      }

      case 'pie': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .66);
        ell(16, 25, 13, 4, dk);                              // 파이 접시
        poly([[3, 25], [29, 25], [26, 14], [6, 14]], c);
        P(6, 12, 20, 3, s.fill);                             // 속
        poly([[3, 25], [29, 25], [29, 22], [3, 22]], lt);
        for (let k = 0; k < 4; k++) P(7 + k * 5, 14, 2.4, 8, lt);   // 격자
        ell(16, 13, 10, 3, lt);
        break;
      }

      case 'bowl': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .66);
        ell(16, 18, 12, 4, s.soup);                          // 국물
        ell(16, 17, 10, 3, sh2(s.soup, 1.25));
        for (const [x, y] of [[12, 17], [19, 18], [16, 16]]) ell(x, y, 2.4, 1.4, s.bits);
        poly([[4, 18], [28, 18], [24, 27], [8, 27]], c);     // 그릇
        poly([[4, 18], [28, 18], [28, 20], [4, 20]], lt);
        poly([[8, 27], [24, 27], [22, 29], [10, 29]], dk);
        stroke('#c8c8d0', 1.2, () => { g.moveTo(11, 13); g.bezierCurveTo(13, 9, 9, 8, 11, 5); });   // 김
        stroke('#c8c8d0', 1.2, () => { g.moveTo(20, 13); g.bezierCurveTo(22, 9, 18, 8, 20, 5); });
        break;
      }

      case 'teacup': {
        const c = s.c, dk = sh2(c, .7);
        ell(16, 27, 11, 3, dk);                              // 받침
        poly([[8, 13], [24, 13], [21, 25], [11, 25]], c);
        ell(16, 13, 8, 3, s.tea);
        ell(16, 13, 6.4, 2.2, sh2(s.tea, 1.3));
        stroke(c, 2.4, () => { g.arc(24, 17, 4, -1.1, 1.1); });   // 손잡이
        stroke('#c8c8d0', 1.1, () => { g.moveTo(15, 9); g.bezierCurveTo(17, 6, 13, 5, 15, 2); });
        break;
      }

      case 'jelly': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .68);
        poly([[7, 27], [25, 27], [22, 10], [10, 10]], c);    // 젤리 틀
        poly([[10, 10], [22, 10], [21, 14], [11, 14]], lt);
        poly([[7, 27], [25, 27], [24, 24], [8, 24]], dk);
        ell(16, 10, 6, 2.4, lt);
        P(12, 15, 2.4, 8, sh2(c, 1.6));                      // 하이라이트
        break;
      }

      case 'feast': {
        const c = s.c;
        if (s.glow) glow(16, 18, 13, s.glow, .26);
        P(3, 22, 26, 6, '#8a6a44');                          // 상
        P(3, 22, 26, 1.6, '#a88a5c');
        ell(10, 19, 6, 4, c); ell(10, 17.5, 5, 3, sh2(c, 1.25));       // 빵
        ell(22, 20, 6, 3.4, '#c8ccd4');                                 // 그릇
        ell(22, 19, 5, 2.4, '#8fd0a0');
        poly([[13, 21], [21, 21], [19, 12], [15, 12]], '#b8583c');      // 고기
        ell(17, 12, 2.4, 1.6, '#d8734c');
        P(16.4, 6, 1.2, 6, '#c8c8d0');                                  // 촛불
        ell(17, 6, 1.6, 2.4, '#ffd88a');
        break;
      }

      case 'stopcore': {
        // 「멈춰라」 하나만 크게 적어 넣은 물건 — 붉은 정지 표식
        const c = s.c;
        glow(16, 16, 13, c, .22);
        P(6, 6, 20, 20, '#2a2620');
        P(6, 6, 20, 2, '#4a4238');
        poly([[11, 5], [21, 5], [27, 11], [27, 21], [21, 27], [11, 27], [5, 21], [5, 11]], c);
        poly([[12, 7], [20, 7], [25, 12], [25, 20], [20, 25], [12, 25], [7, 20], [7, 12]], sh2(c, 1.25));
        P(10, 14, 12, 4, '#f0e0d0');                    // 가로줄 하나 = 정지
        for (const [x, y] of [[9, 9], [21, 9], [9, 21], [21, 21]]) circ(x, y, 1.3, '#3a2622');
        break;
      }

      case 'railgun': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .6);
        if (s.glow) glow(24, 12, 11, s.glow, .26);
        P(4, 16, 22, 6, c); P(4, 16, 22, 1.6, lt); P(4, 20.4, 22, 1.6, dk);
        P(9, 10, 16, 4, c); P(9, 10, 16, 1.4, lt);          // 위쪽 레일
        P(24, 11, 6, 10, dk);                               // 총구부
        P(26, 13, 3, 6, s.glow || '#9fd8ff');
        poly([[6, 22], [12, 22], [10, 29], [5, 29]], sh2(c, .78));   // 손잡이
        P(14, 22, 3, 4, dk);
        break;
      }

      case 'torchitem': {
        glow(16, 9, 9, '#ffb24a', .3);
        P(14, 13, 4, 17, '#6a4a28'); P(14, 13, 1.4, 17, '#8f6740');
        g.fillStyle = '#e06a16'; g.beginPath();
        g.moveTo(16, 2); g.quadraticCurveTo(23, 9, 16, 15);
        g.quadraticCurveTo(9, 9, 16, 2); g.closePath(); g.fill();
        g.fillStyle = '#f7a92c'; g.beginPath();
        g.moveTo(16, 5); g.quadraticCurveTo(20.5, 10, 16, 13.5);
        g.quadraticCurveTo(11.5, 10, 16, 5); g.closePath(); g.fill();
        ell(16, 10, 1.6, 2.6, '#ffe98c');
        break;
      }

      case 'platformitem': {
        P(3, 12, 26, 6, '#8a6640');
        P(3, 12, 26, 1.4, '#b08a58'); P(3, 16.6, 26, 1.4, '#5a4028');
        P(9, 18, 2.4, 8, '#6a4a28'); P(21, 18, 2.4, 8, '#6a4a28');
        break;
      }

      case 'ore': {
        const c = s.c;
        if (s.glow) glow(16, 17, 12, c, .22);
        poly([[8, 12], [13, 6], [21, 7], [26, 14], [23, 24], [12, 25], [6, 19]], '#5d5d63');
        poly([[8, 12], [13, 6], [21, 7], [17, 15], [9, 17]], '#72727a');
        const nug = [[12, 12, 5, 4], [18, 15, 5, 4], [13, 19, 4, 3.4], [20, 20, 4, 3]];
        for (const [x, y, w, h] of nug) {
          P(x, y, w, h, c);
          P(x, y, w - 1, 1.2, sh2(c, 1.45));
          P(x + 1, y + h - 1, w - 1, 1, sh2(c, .6));
        }
        break;
      }

      case 'bar': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        if (s.glow) glow(16, 18, 12, c, .2);
        // 아래 잉곳
        poly([[5, 21], [27, 21], [24, 28], [8, 28]], c);
        poly([[5, 21], [27, 21], [25.5, 18.5], [6.5, 18.5]], lt);
        P(8, 24, 16, 1.2, dk);
        // 위 잉곳
        poly([[9, 12.5], [23, 12.5], [21, 18.5], [11, 18.5]], c);
        poly([[9, 12.5], [23, 12.5], [21.8, 10.5], [10.2, 10.5]], lt);
        P(12, 15, 8, 1.2, dk);
        break;
      }

      case 'rock': {
        const c = s.c;
        poly([[8, 11], [14, 5], [23, 8], [26, 17], [20, 26], [10, 24], [5, 16]], c);
        poly([[8, 11], [14, 5], [23, 8], [18, 15], [10, 17]], sh2(c, 1.3));
        poly([[20, 26], [26, 17], [22, 16], [17, 24]], sh2(c, .7));
        P(12, 13, 2, 2, sh2(c, 1.5)); P(19, 19, 2, 2, sh2(c, 1.5));
        break;
      }

      case 'shard': {
        const c = s.c;
        if (s.glow) glow(16, 16, 12, c, .28);
        poly([[16, 2], [23, 13], [18, 30], [12, 26], [9, 12]], c);
        poly([[16, 2], [16, 30], [12, 26], [9, 12]], sh2(c, 1.4));
        P(15, 6, 1.6, 16, sh2(c, 1.75));
        break;
      }

      case 'crystal': {
        const c = s.c;
        if (s.glow) glow(16, 17, 13, c, .26);
        poly([[16, 3], [24, 11], [24, 24], [16, 30], [8, 24], [8, 11]], c);
        poly([[16, 3], [16, 30], [8, 24], [8, 11]], sh2(c, 1.35));
        poly([[16, 3], [24, 11], [16, 15], [8, 11]], sh2(c, 1.6));
        P(12, 14, 1.6, 9, sh2(c, 1.8));
        break;
      }

      case 'gel': {
        const c = s.c;
        g.fillStyle = c; g.beginPath();
        g.moveTo(4, 24); g.quadraticCurveTo(3, 10, 16, 8);
        g.quadraticCurveTo(29, 10, 28, 24);
        g.quadraticCurveTo(16, 29, 4, 24); g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.3); g.beginPath();
        g.moveTo(7, 20); g.quadraticCurveTo(6, 12, 16, 10.5);
        g.quadraticCurveTo(20, 11, 21, 14);
        g.quadraticCurveTo(13, 14, 7, 20); g.closePath(); g.fill();
        ell(11.5, 14.5, 3, 2, 'rgba(255,255,255,.55)');
        circ(21, 21, 1.6, sh2(c, .7));
        break;
      }

      case 'bone': {
        const c = '#e8e2cd', d = '#bdb59c';
        P(13, 9, 6, 15, c);
        circ(11, 9, 4, c); circ(21, 9, 4, c);
        circ(11, 24, 4, c); circ(21, 24, 4, c);
        P(13, 9, 2, 15, '#f5f1e4');
        circ(21, 9, 2, d); circ(21, 24, 2, d);
        break;
      }

      case 'egg': {
        const c = s.c;
        if (s.glow) glow(16, 18, 13, s.glow, .32);
        ell(16, 19, 8.5, 11.5, c);
        ell(13.4, 13.5, 3, 4, sh2(c, 1.4));
        circ(13, 17, 1.3, sh2(c, .6)); circ(19, 15, 1.1, sh2(c, .6));
        circ(18, 23, 1.3, sh2(c, .6)); circ(12.5, 24, 1, sh2(c, .6));
        break;
      }

      case 'wisp': {
        const c = s.c;
        glow(16, 16, 13, c, .3);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 3); g.quadraticCurveTo(24, 13, 16, 29);
        g.quadraticCurveTo(8, 13, 16, 3); g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.5); g.beginPath();
        g.moveTo(16, 7); g.quadraticCurveTo(20, 14, 16, 24);
        g.quadraticCurveTo(12, 14, 16, 7); g.closePath(); g.fill();
        circ(16, 15, 2.2, '#ffffff');
        circ(23, 8, 1.4, c); circ(9, 22, 1.2, c);
        break;
      }

      /* ---------- 소환 ---------- */
      case 'crown': {
        const c = s.c;
        if (s.glow) glow(16, 16, 12, s.glow, .24);
        poly([[5, 24], [5, 12], [10, 17], [16, 8], [22, 17], [27, 12], [27, 24]], c);
        poly([[5, 24], [5, 12], [10, 17], [16, 8], [16, 24]], sh2(c, 1.3));
        P(5, 22, 22, 3.4, sh2(c, .78));
        P(5, 22, 22, 1, sh2(c, 1.4));
        circ(16, 12, 2.2, s.gem); circ(8, 15, 1.6, s.gem); circ(24, 15, 1.6, s.gem);
        break;
      }

      case 'skull': {
        const c = '#e8e2cd';
        circ(16, 14, 10, c);
        P(9, 18, 14, 7, c);
        poly([[11, 24], [21, 24], [20, 29], [12, 29]], c);
        circ(11.6, 13, 3.4, '#1a1620'); circ(20.4, 13, 3.4, '#1a1620');
        circ(10.8, 12.2, 1, '#c8433c'); circ(19.6, 12.2, 1, '#c8433c');
        poly([[16, 17], [18.4, 21], [13.6, 21]], '#1a1620');
        P(12, 25.5, 1.4, 3.5, '#1a1620'); P(15.3, 25.5, 1.4, 3.5, '#1a1620'); P(18.6, 25.5, 1.4, 3.5, '#1a1620');
        circ(12, 9, 3, '#f5f1e4');
        break;
      }

      case 'heart': {
        const c = s.c;
        glow(16, 17, 13, c, .24);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 28);
        g.bezierCurveTo(2, 18, 6, 5, 16, 12);
        g.bezierCurveTo(26, 5, 30, 18, 16, 28);
        g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.35); g.beginPath();
        g.moveTo(16, 24);
        g.bezierCurveTo(7, 17, 9, 9, 15, 14);
        g.closePath(); g.fill();
        ell(11.5, 13.5, 2.4, 1.6, 'rgba(255,255,255,.5)');
        stroke(sh2(c, .6), 1.4, () => { g.moveTo(16, 13); g.lineTo(16, 24); });
        break;
      }

      case 'drop': {
        const c = s.c;
        if (s.glow) glow(16, 18, 13, s.glow, .3);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 3);
        g.bezierCurveTo(24, 15, 26, 20, 16, 29);
        g.bezierCurveTo(6, 20, 8, 15, 16, 3);
        g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.4); g.beginPath();
        g.moveTo(16, 8);
        g.bezierCurveTo(20, 16, 21, 20, 16, 25);
        g.bezierCurveTo(11, 20, 12, 16, 16, 8);
        g.closePath(); g.fill();
        ell(13, 19, 2, 3, 'rgba(255,255,255,.55)');
        break;
      }

      case 'sack': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .65);
        if (s.glow) glow(16, 18, 12, s.glow, .2);
        // 몸통
        g.fillStyle = c; g.beginPath();
        g.moveTo(9, 13); g.quadraticCurveTo(6, 22, 9, 28);
        g.quadraticCurveTo(16, 31, 23, 28);
        g.quadraticCurveTo(26, 22, 23, 13);
        g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath();
        g.moveTo(10, 14); g.quadraticCurveTo(8, 21, 10, 26);
        g.quadraticCurveTo(13, 27, 15, 26);
        g.quadraticCurveTo(13, 20, 13, 14);
        g.closePath(); g.fill();
        // 덮개
        P(8, 10, 16, 6, dk);
        P(8, 10, 16, 2, s.strap);
        // 어깨끈
        stroke(s.strap, 2, () => { g.moveTo(11, 10); g.quadraticCurveTo(6, 4, 12, 2); });
        stroke(s.strap, 2, () => { g.moveTo(21, 10); g.quadraticCurveTo(26, 4, 20, 2); });
        // 버클
        P(14, 15, 4, 3, s.strap);
        break;
      }

      case 'hammer': {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .68);
        if (s.glow) glow(16, 11, 13, s.glow, .24);
        stroke('#6a4a28', 3.6, () => { g.moveTo(16, 30); g.lineTo(16, 16); });
        stroke('#8f6740', 1.2, () => { g.moveTo(15, 29); g.lineTo(15, 17); });
        // 망치 머리
        P(5, 5, 22, 12, c);
        P(5, 5, 22, 3, lt);
        P(5, 14, 22, 3, dk);
        P(5, 5, 3, 12, sh2(c, 1.15));
        P(24, 5, 3, 12, dk);
        for (let i = 0; i < 5; i++) P(rng.range(7, 24), rng.range(7, 14), 2, 2, rng.chance(.5) ? lt : dk);
        break;
      }

      /* ---------- 2부 전용 ---------- */
      case 'feather': {
        const c = s.c, dk = sh2(c, .72), lt = sh2(c, 1.12);
        glow(16, 16, 12, c, .18);
        stroke(sh2(c, .55), 1.6, () => { g.moveTo(23, 3); g.lineTo(9, 29); });
        // 깃가지
        for (let i = 0; i < 13; i++) {
          const t = i / 12;
          const x = 23 - t * 14, y = 3 + t * 26;
          const len = Math.sin(t * Math.PI) * 8 + 1.5;
          stroke(i % 2 ? c : lt, 1.6, () => { g.moveTo(x, y); g.lineTo(x - len, y - len * .35); });
          stroke(i % 2 ? dk : c, 1.6, () => { g.moveTo(x, y); g.lineTo(x + len * .8, y + len * .3); });
        }
        break;
      }
      case 'wildflower': {
        const c = s.c;
        stroke('#4a7a34', 2, () => { g.moveTo(16, 28); g.lineTo(16, 16); });
        P(14, 22, 2, 5, sh2('#4a7a34', .8));
        for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) circ(16 + dx, 13 + dy, 3.2, c);
        circ(16, 13, 2, '#ffe58a');
        break;
      }
      case 'weed_icon': {
        for (let i = 0; i < 4; i++) {
          const bx = 8 + i * 5, h = 10 + (i % 2) * 6;
          stroke(sh2(s.c, .8 + i * .1), 2.2, () => { g.moveTo(bx, 28); g.quadraticCurveTo(bx + 3, 28 - h * .6, bx - 2, 28 - h); });
        }
        break;
      }
      case 'cactus': {
        const c = s.c;
        P(13, 8, 6, 20, c);
        P(6, 14, 5, 10, c); P(21, 12, 5, 12, c);
        P(13, 8, 2, 20, sh2(c, 1.3));
        for (let i = 0; i < 5; i++) circ(13 + (i % 2) * 6, 10 + i * 4, .8, '#e8dcc0');
        break;
      }
      case 'mushroom': {
        const c = s.c;
        P(14, 16, 4, 12, '#e8dcc0');
        g.fillStyle = c; g.beginPath(); g.ellipse(16, 14, 10, 7, 0, Math.PI, 2 * Math.PI); g.fill();
        circ(11, 11, 1.4, '#fff'); circ(19, 10, 1.6, '#fff'); circ(16, 8, 1.2, '#fff');
        break;
      }
      case 'runefrag': {
        const c = s.c;
        glow(16, 16, 11, c, .2);
        poly([[16, 3], [26, 12], [21, 27], [10, 25], [6, 11]], sh2(c, .8));
        poly([[16, 3], [16, 26], [10, 25], [6, 11]], c);
        const gl = sh2(c, 1.7);
        P(12, 10, 1.6, 10, gl); P(12, 10, 7, 1.6, gl); P(12, 15, 5, 1.6, gl);
        break;
      }
      case 'key': {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .7);
        if (s.glow) glow(16, 16, 12, s.glow, .22);
        stroke(dk, 4.4, () => { g.arc(16, 9, 5.6, 0, TAU); });
        stroke(c, 2.6, () => { g.arc(16, 9, 5.6, 0, TAU); });
        stroke(lt, 1.2, () => { g.arc(16, 9, 5.6, 2.4, 4.2); });
        P(14.6, 14, 2.8, 15, c);
        P(14.6, 14, 1, 15, lt);
        P(17.4, 22, 4.4, 2.4, c); P(17.4, 26, 3.2, 2.4, c);
        break;
      }
      case 'horn': {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        g.fillStyle = c; g.beginPath();
        g.moveTo(28, 6);
        g.bezierCurveTo(14, 6, 4, 14, 5, 24);
        g.bezierCurveTo(9, 26, 13, 22, 14, 17);
        g.bezierCurveTo(18, 13, 24, 12, 29, 12);
        g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath();
        g.moveTo(27, 7.5);
        g.bezierCurveTo(15, 7.5, 6.5, 15, 7, 22);
        g.bezierCurveTo(9, 21, 11, 18, 12.5, 15.5);
        g.bezierCurveTo(17, 11.5, 23, 10.5, 27, 10.5);
        g.closePath(); g.fill();
        P(26, 5, 4, 8, dk);
        stroke(dk, 1.4, () => { g.moveTo(10, 21); g.lineTo(13, 24); });
        break;
      }

      /* ---------- 스킬 아이콘 ---------- */
      case 'slash': {
        const c = s.c;
        stroke(c, 4, () => { g.arc(16, 18, 11, -2.5, -.3); });
        stroke(sh2(c, 1.5), 1.6, () => { g.arc(16, 18, 11, -2.3, -.55); });
        stroke(sh2(c, .7), 2.4, () => { g.arc(16, 22, 9, -2.4, -.5); });
        poly([[27, 15], [30, 10], [25, 12]], sh2(c, 1.4));
        break;
      }
      case 'shield': {
        const c = s.c;
        poly([[16, 3], [27, 8], [26, 20], [16, 29], [6, 20], [5, 8]], c);
        poly([[16, 3], [16, 29], [6, 20], [5, 8]], sh2(c, 1.3));
        poly([[16, 8], [22, 11], [21, 19], [16, 24], [11, 19], [10, 11]], sh2(c, .65));
        P(15.2, 10, 1.6, 12, sh2(c, 1.6));
        break;
      }
      case 'impact': {
        const c = s.c;
        glow(16, 16, 12, c, .22);
        g.fillStyle = c; g.beginPath();
        for (let i = 0; i < 12; i++) {
          const r = i % 2 ? 5 : 14, a = -Math.PI / 2 + i * Math.PI / 6;
          const x = 16 + Math.cos(a) * r, y = 16 + Math.sin(a) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        circ(16, 16, 5, sh2(c, 1.45));
        circ(16, 16, 2.2, '#ffffff');
        break;
      }
      case 'blood': {
        const c = s.c;
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 4);
        g.bezierCurveTo(25, 16, 25, 22, 16, 28);
        g.bezierCurveTo(7, 22, 7, 16, 16, 4);
        g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.4); g.beginPath();
        g.moveTo(16, 10); g.bezierCurveTo(20, 17, 20, 21, 16, 24);
        g.bezierCurveTo(12, 21, 12, 17, 16, 10); g.closePath(); g.fill();
        ell(13, 20, 1.8, 2.6, 'rgba(255,255,255,.45)');
        break;
      }
      case 'whirl': {
        const c = s.c;
        for (let i = 0; i < 3; i++) {
          const a0 = i * TAU / 3;
          stroke(i ? sh2(c, .8) : c, 2.6, () => { g.arc(16, 16, 6 + i * 3.6, a0, a0 + 2.1); });
        }
        circ(16, 16, 2.6, sh2(c, 1.5));
        break;
      }
      case 'titan': {
        const c = s.c;
        poly([[8, 10], [24, 10], [26, 28], [6, 28]], c);
        poly([[8, 10], [16, 10], [16, 28], [6, 28]], sh2(c, 1.25));
        poly([[10, 4], [22, 4], [24, 10], [8, 10]], sh2(c, .75));
        circ(12, 17, 2, sh2(c, .55)); circ(20, 17, 2, sh2(c, .55));
        P(11, 23, 10, 1.6, sh2(c, .55));
        break;
      }
      case 'dash': {
        const c = s.c;
        for (let i = 0; i < 3; i++) {
          const y = 10 + i * 6, w = 16 - i * 3;
          P(4, y, w, 2.6, i === 1 ? c : sh2(c, .72));
        }
        poly([[20, 6], [30, 16], [20, 26], [20, 20], [24, 16], [20, 12]], c);
        poly([[20, 6], [30, 16], [24, 16], [20, 12]], sh2(c, 1.35));
        break;
      }
      case 'target': {
        const c = s.c;
        stroke(c, 2.4, () => { g.arc(16, 16, 11, 0, TAU); });
        stroke(sh2(c, .75), 2, () => { g.arc(16, 16, 6, 0, TAU); });
        circ(16, 16, 2.4, c);
        stroke(c, 2, () => { g.moveTo(16, 1); g.lineTo(16, 6); });
        stroke(c, 2, () => { g.moveTo(16, 26); g.lineTo(16, 31); });
        stroke(c, 2, () => { g.moveTo(1, 16); g.lineTo(6, 16); });
        stroke(c, 2, () => { g.moveTo(26, 16); g.lineTo(31, 16); });
        break;
      }
      case 'volley': {
        const c = s.c;
        for (let i = -1; i <= 1; i++) {
          const a = -0.5 + i * 0.42;
          const x0 = 5, y0 = 16 - i * 2, x1 = x0 + Math.cos(a) * 22, y1 = y0 + Math.sin(a) * 22;
          stroke(i === 0 ? c : sh2(c, .75), 2, () => { g.moveTo(x0, y0); g.lineTo(x1, y1); });
          poly([[x1, y1], [x1 - 4.5, y1 + 1], [x1 - 3, y1 + 4]], sh2(c, 1.35));
        }
        break;
      }
      case 'wind': {
        const c = s.c;
        stroke(c, 2.4, () => { g.moveTo(3, 11); g.lineTo(20, 11); g.quadraticCurveTo(26, 11, 24, 6); });
        stroke(sh2(c, .8), 2.4, () => { g.moveTo(5, 18); g.lineTo(24, 18); g.quadraticCurveTo(30, 18, 27, 24); });
        stroke(sh2(c, .65), 2.2, () => { g.moveTo(3, 25); g.lineTo(16, 25); });
        break;
      }
      case 'rain': {
        const c = s.c;
        for (let i = 0; i < 3; i++) {
          const x = 7 + i * 9, y0 = 2 + (i % 2) * 4;
          stroke(i === 1 ? c : sh2(c, .78), 2, () => { g.moveTo(x, y0); g.lineTo(x, y0 + 16); });
          poly([[x, y0 + 18], [x - 3.2, y0 + 13], [x + 3.2, y0 + 13]], sh2(c, 1.35));
        }
        glow(16, 28, 8, c, .22);
        break;
      }
      case 'eye': {
        const c = s.c;
        g.fillStyle = '#f2ece0'; g.beginPath();
        g.moveTo(2, 16); g.quadraticCurveTo(16, 4, 30, 16);
        g.quadraticCurveTo(16, 28, 2, 16); g.closePath(); g.fill();
        circ(16, 16, 6.4, c);
        circ(16, 16, 3, '#1a1620');
        circ(13.8, 13.6, 1.6, '#ffffff');
        stroke(sh2(c, .6), 1.6, () => { g.moveTo(2, 16); g.quadraticCurveTo(16, 4, 30, 16); });
        break;
      }
      case 'flame': {
        const c = s.c;
        glow(16, 18, 12, c, .26);
        g.fillStyle = sh2(c, .8); g.beginPath();
        g.moveTo(16, 2); g.quadraticCurveTo(29, 15, 22, 25);
        g.quadraticCurveTo(16, 31, 10, 25);
        g.quadraticCurveTo(3, 15, 16, 2); g.closePath(); g.fill();
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 8); g.quadraticCurveTo(24, 17, 20, 24);
        g.quadraticCurveTo(16, 28, 12, 24);
        g.quadraticCurveTo(8, 17, 16, 8); g.closePath(); g.fill();
        ell(16, 22, 3.4, 4.4, '#ffe98c');
        break;
      }
      case 'book': {
        const c = s.c;
        poly([[3, 8], [15, 6], [15, 26], [3, 27]], c);
        poly([[29, 8], [17, 6], [17, 26], [29, 27]], sh2(c, .78));
        P(15, 6, 2, 20, sh2(c, .5));
        for (let i = 0; i < 3; i++) { P(5, 12 + i * 4, 8, 1.2, sh2(c, 1.5)); P(19, 12 + i * 4, 8, 1.2, sh2(c, 1.3)); }
        glow(16, 8, 7, '#ffe08a', .28);
        break;
      }
      case 'heal': {
        const c = s.c;
        glow(16, 16, 13, c, .28);
        P(13, 5, 6, 22, c);
        P(5, 13, 22, 6, c);
        P(14.2, 5, 1.8, 22, sh2(c, 1.4));
        P(5, 14.2, 22, 1.8, sh2(c, 1.4));
        circ(26, 6, 2, '#ffffff'); circ(6, 25, 1.5, '#ffffff');
        break;
      }
      case 'snow': {
        const c = s.c;
        glow(16, 16, 12, c, .24);
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3;
          const dx = Math.cos(a) * 13, dy = Math.sin(a) * 13;
          stroke(c, 2.2, () => { g.moveTo(16 - dx, 16 - dy); g.lineTo(16 + dx, 16 + dy); });
          for (const t of [-1, 1]) {
            const bx = 16 + dx * .55 * t, by = 16 + dy * .55 * t;
            stroke(c, 1.6, () => {
              g.moveTo(bx, by);
              g.lineTo(bx + Math.cos(a + 0.9) * 5 * t, by + Math.sin(a + 0.9) * 5 * t);
            });
            stroke(c, 1.6, () => {
              g.moveTo(bx, by);
              g.lineTo(bx + Math.cos(a - 0.9) * 5 * t, by + Math.sin(a - 0.9) * 5 * t);
            });
          }
        }
        circ(16, 16, 2.4, '#ffffff');
        break;
      }
      case 'wolf': {
        const c = s.c;
        glow(16, 17, 12, c, .2);
        poly([[6, 12], [8, 3], [13, 9]], c);
        poly([[26, 12], [24, 3], [19, 9]], c);
        poly([[7, 11], [25, 11], [23, 22], [16, 29], [9, 22]], c);
        poly([[7, 11], [16, 11], [16, 29], [9, 22]], sh2(c, 1.25));
        circ(12, 17, 1.8, '#1a2230'); circ(20, 17, 1.8, '#1a2230');
        poly([[16, 22], [18.4, 25], [13.6, 25]], '#1a2230');
        break;
      }
      case 'rune': {
        const c = s.c;
        glow(16, 16, 13, c, .26);
        stroke(c, 2, () => { g.arc(16, 16, 12, 0, TAU); });
        stroke(sh2(c, .75), 1.4, () => { g.arc(16, 16, 8, 0, TAU); });
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6;
          P(16 + Math.cos(a) * 12 - 1.2, 16 + Math.sin(a) * 12 - 1.2, 2.4, 2.4, sh2(c, 1.4));
        }
        poly([[16, 8], [21, 16], [16, 24], [11, 16]], sh2(c, 1.3));
        circ(16, 16, 2, '#ffffff');
        break;
      }

      /* ---------- UI ---------- */
      case 'sun': {
        glow(16, 16, 13, '#ffe9a8', .3);
        circ(16, 16, 8, '#ffdf80');
        circ(16, 16, 6, '#fff0c0');
        for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8;
          stroke('#ffdf80', 2.2, () => {
            g.moveTo(16 + Math.cos(a) * 10, 16 + Math.sin(a) * 10);
            g.lineTo(16 + Math.cos(a) * 14, 16 + Math.sin(a) * 14);
          });
        }
        break;
      }
      case 'moon': {
        glow(16, 16, 12, '#dfe8f5', .2);
        circ(15, 16, 10, '#dfe8f5');
        circ(20, 13, 9, 'rgba(0,0,0,0)');
        g.globalCompositeOperation = 'destination-out';
        circ(21, 13, 9, '#000');
        g.globalCompositeOperation = 'source-over';
        circ(11, 19, 1.8, '#c2cddd'); circ(14, 12, 1.3, '#c2cddd');
        break;
      }
      case 'coin': {
        circ(16, 16, 11, '#c8952a');
        circ(16, 16, 9, '#e8c04a');
        circ(16, 16, 6.5, '#d8a93a');
        P(14.6, 10, 2.8, 12, '#f5deA0');
        P(11, 14.6, 10, 2.8, '#f5dea0');
        ell(12, 11, 2.6, 1.6, 'rgba(255,255,255,.45)');
        break;
      }
      case 'chat': {
        g.fillStyle = '#e8dcc0'; g.beginPath();
        g.moveTo(5, 6); g.lineTo(27, 6); g.lineTo(27, 21); g.lineTo(15, 21);
        g.lineTo(10, 27); g.lineTo(10, 21); g.lineTo(5, 21); g.closePath(); g.fill();
        circ(11, 13.5, 1.8, '#4a4438'); circ(16, 13.5, 1.8, '#4a4438'); circ(21, 13.5, 1.8, '#4a4438');
        break;
      }
      case 'equipui': {
        // 장비 칸의 빈 상태에서도 역할이 읽히도록, 갑옷과 방패를 겹친 작은 문장으로 그린다.
        glow(16, 16, 13, '#d8a94b', .15);
        poly([[9, 8], [23, 8], [26, 14], [23, 27], [9, 27], [6, 14]], '#8c7651');
        poly([[9, 8], [16, 8], [16, 27], [9, 27], [6, 14]], '#c8aa70');
        P(8, 16, 16, 2, '#5c4930'); P(15, 9, 2, 17, '#5c4930');
        poly([[20, 5], [28, 8], [27, 17], [24, 22], [20, 17]], '#5d7892');
        poly([[20, 6], [23.8, 8.3], [23.8, 19.8], [20, 17]], '#9fc4dc');
        P(21.5, 10, 1.5, 7, '#e8dcc0'); P(19, 12.5, 6.5, 1.5, '#e8dcc0');
        break;
      }
      case 'trashui': {
        // 파괴 행동임을 직관적으로 보이되, 공포감을 과하게 주지 않는 오래된 금속 휴지통.
        P(8, 10, 16, 18, '#6d4b47'); P(9.5, 11, 13, 16, '#9b6156');
        P(7, 7, 18, 4, '#b87466'); P(9, 5, 14, 2.5, '#7d514a');
        P(13, 3, 6, 2.5, '#b87466'); P(8, 27, 16, 2, '#4a302e');
        P(12, 13, 2, 10, '#5a3935'); P(17, 13, 2, 10, '#5a3935');
        P(21, 13, 1.5, 10, '#5a3935');
        P(10.5, 11.5, 2, 1.5, '#e6a28e');
        break;
      }

      /* ---------- 장비 칸 실루엣 ----------
         빈 칸에만 깔리므로 단색 윤곽으로만 그린다. 아이템이 들어오면 가려진다. */
      case 'slotic': {
        const c = '#6a6250', l = '#8e8672';
        switch (s.m) {
          case 'weapon':                                   // 검
            poly([[16, 3], [19, 9], [19, 21], [13, 21], [13, 9]], c);
            P(15.2, 4, 1.6, 16, l);
            P(9, 21, 14, 2.6, c);                          // 날밑
            P(15, 23.6, 2, 6, c); P(13.5, 28.5, 5, 2, c);  // 자루
            break;
          case 'helm':                                     // 투구
            poly([[7, 20], [7, 13], [10, 8], [22, 8], [25, 13], [25, 20]], c);
            poly([[9, 19], [9, 14], [11, 10], [16, 10], [16, 19]], l);
            P(15, 12, 2, 9, '#3d382d');                    // 면갑 틈
            P(7, 20, 18, 2.4, c);
            break;
          case 'chest':                                    // 흉갑
            poly([[8, 8], [24, 8], [26, 13], [23, 26], [9, 26], [6, 13]], c);
            poly([[8, 8], [16, 8], [16, 26], [9, 26], [6, 13]], l);
            P(12, 6, 8, 3, c);                             // 목깃
            P(15.2, 10, 1.6, 15, '#3d382d');
            break;
          case 'boots':                                    // 장화 두 짝
            for (const bx of [7, 17]) {
              P(bx, 8, 7, 13, c);
              P(bx, 8, 2.4, 13, l);
              poly([[bx, 21], [bx + 9, 21], [bx + 9, 25], [bx, 25]], c);
              P(bx, 24, 9, 1.6, '#3d382d');
            }
            break;
          case 'acc':                                      // 반지
            stroke(c, 3.4, () => { g.arc(16, 19, 7.5, 0, TAU); });
            stroke(l, 1.2, () => { g.arc(16, 19, 7.5, Math.PI * 1.1, Math.PI * 1.7); });
            poly([[16, 3], [20, 8], [16, 13], [12, 8]], c);   // 보석
            poly([[16, 3], [16, 13], [12, 8]], l);
            break;
          case 'bag':                                      // 배낭
            poly([[8, 11], [24, 11], [26, 27], [6, 27]], c);
            poly([[8, 11], [16, 11], [16, 27], [6, 27]], l);
            stroke(c, 2.2, () => { g.moveTo(11, 11); g.bezierCurveTo(11, 4, 21, 4, 21, 11); });   // 손잡이
            P(13, 17, 6, 5, '#3d382d');                    // 잠금쇠
            break;
          case 'pet':                                      // 발자국 — 어느 칸이 펫인지
            ell(12, 20, 5.5, 6.5, c);                      // 발바닥
            for (const [tx, ty, r] of [[7, 11, 2.4], [12, 8.5, 2.6], [17.5, 10, 2.4], [21.5, 14, 2.2]])
              circ(tx, ty, r, l);                          // 발가락
            break;
        }
        break;
      }

      /* ---------- 손으로 놓는 설치물 ----------
         세계에 그려지는 모습(game.js render)과 같은 실루엣이라 아이콘만 봐도 무엇인지 안다 */
      case 'stationic': {
        if (s.m === 'work') {                             // 작업대 — 상판 + 다리 두 개
          P(3, 9, 26, 4, '#9c7a4a');
          P(3, 13, 26, 3, '#7a5734');
          P(6, 16, 5, 12, '#7a5734'); P(21, 16, 5, 12, '#7a5734');
          P(6, 25, 20, 3, '#5c4026');
        } else if (s.m === 'forge') {                     // 용광로 — 막힌 몸통 + 불구멍
          P(4, 4, 24, 5, '#33333a');
          P(4, 9, 24, 19, '#4a4a52');
          P(6, 10, 20, 2, '#5c5c66');
          P(9, 19, 14, 7, '#ff8a3a');
          glow(16, 22, 9, '#ff8a3a', .3);
        } else {                                          // 저장 상자 — 뚜껑 띠 + 자물쇠
          const gold = s.gold;
          if (gold) glow(16, 18, 13, '#ffd85a', .26);
          P(4, 11, 24, 17, gold ? '#8a6a1a' : '#7a5326');
          P(4, 7, 24, 5, gold ? '#a8841f' : '#96683a');
          P(4, 11, 24, 3, gold ? '#ffd85a' : '#c8a04a');
          P(13, 10, 6, 7, gold ? '#ffd85a' : '#c8a04a');
          P(14.5, 13, 3, 3, '#3a2610');
        }
        break;
      }

      /* ---------- 펫 ----------
         한 마리씩 따로 그리지 않고 실루엣 6종 × 몸 색으로 조합한다. 12마리를 각각
         손으로 그리면 서로 안 닮은 잡동사니가 되는데, 형태를 공유하면 "같은 세계의
         작은 짐승들"로 읽히고 나중에 종류를 더 늘리기도 쉽다. */
      case 'pet': {
        const c = s.c, dark = sh2(c, 0.62), lite = sh2(c, 1.3);
        const eye = '#1a1a22';
        if (s.r === 2) glow(16, 17, 13, c, 0.22);        // 영웅 등급은 은은하게 빛난다
        switch (s.form) {
          case 'moth':                                    // 나방 — 위아래 날개 두 쌍
            ell(10, 13, 6, 5, lite); ell(22, 13, 6, 5, lite);
            ell(11, 20, 4.5, 4, c); ell(21, 20, 4.5, 4, c);
            ell(16, 17, 2.6, 8, dark);                    // 몸통
            circ(16, 10, 2.6, dark);
            stroke(dark, 1.2, () => { g.moveTo(15, 8); g.lineTo(12, 4); g.moveTo(17, 8); g.lineTo(20, 4); });
            circ(15, 10, 0.9, eye); circ(17.2, 10, 0.9, eye);
            break;
          case 'bird':                                    // 새 — 몸통 + 접힌 날개 + 부리
            ell(16, 19, 7.5, 8, c);
            ell(11.5, 19, 4, 6, dark);                    // 날개
            circ(17, 11, 5.5, lite);                      // 머리
            poly([[22, 11], [28, 13], [22, 14.5]], '#e0a848');   // 부리
            circ(19, 10, 1.3, eye);
            poly([[13, 26], [19, 26], [16, 30]], dark);   // 꼬리
            break;
          case 'rock':                                    // 둥근 것 — 돌·두꺼비처럼 납작하고 넓적
            ell(16, 20, 11, 8.5, c);
            ell(16, 16.5, 8, 5, lite);
            circ(12, 16, 1.7, eye); circ(20, 16, 1.7, eye);
            P(8, 25, 5, 3, dark); P(19, 25, 5, 3, dark);  // 짧은 다리
            break;
          case 'wisp':                                    // 정령 — 핵 + 흔들리는 꼬리
            glow(16, 15, 11, c, 0.3);
            circ(16, 15, 6, lite);
            circ(16, 15, 3.4, '#fff');
            for (const [wx, wy, wr] of [[13, 23, 2.6], [18, 26, 2], [15, 29, 1.4]]) circ(wx, wy, wr, c);
            break;
          case 'drake':                                   // 새끼용 — 뿔 + 날개 + 꼬리
            ell(15, 20, 8, 7, c);
            poly([[20, 12], [29, 15], [21, 19]], dark);   // 날개
            circ(13, 13, 5.5, lite);                      // 머리
            poly([[10, 9], [12, 4], [13.5, 9]], dark);    // 뿔
            poly([[15, 9], [17, 5], [18, 9]], dark);
            circ(11.5, 13, 1.4, eye);
            stroke(dark, 2.2, () => { g.moveTo(21, 23); g.quadraticCurveTo(28, 25, 26, 30); });   // 꼬리
            break;
          default:                                        // beast — 네발 짐승
            ell(15, 20, 8.5, 6.5, c);
            circ(22, 15, 5.5, lite);                      // 머리
            poly([[19, 11], [21, 6], [23, 11]], dark);    // 귀
            poly([[23, 11], [25, 7], [26.5, 11]], dark);
            circ(23.5, 15, 1.4, eye);
            P(9, 25, 3.4, 4, dark); P(15, 25, 3.4, 4, dark); P(20, 25, 3.4, 4, dark);
            stroke(lite, 3, () => { g.moveTo(8, 19); g.quadraticCurveTo(2, 16, 5, 10); });        // 꼬리
            break;
        }
        break;
      }

      /* ---------- NPC 초상 ---------- */
      case 'npc': {
        const p = s.p;
        P(4, 24, 24, 8, p.cloth);
        P(4, 24, 24, 1.6, sh2(p.cloth, 1.3));
        circ(16, 15, 9, p.skin);
        P(7, 15, 18, 8, p.skin);
        if (p.long) { P(4, 10, 5, 16, p.hair); P(23, 10, 5, 16, p.hair); }
        g.fillStyle = p.hair; g.beginPath(); g.arc(16, 14, 9.4, Math.PI, 0); g.fill();
        P(6.6, 11, 18.8, 3.2, p.hair);
        if (p.hat) { poly([[16, 0], [27, 12], [5, 12]], sh2(p.cloth, .7)); P(3, 11, 26, 2.6, sh2(p.cloth, .55)); }
        circ(12.6, 16.5, 1.5, '#2a2028'); circ(19.4, 16.5, 1.5, '#2a2028');
        if (p.old) { P(9, 14.6, 6, 1, '#8a8a8a'); P(17, 14.6, 6, 1, '#8a8a8a'); }
        if (p.beard) { g.fillStyle = p.hair; g.beginPath(); g.arc(16, 21, 7, 0, Math.PI); g.fill(); P(9, 20, 14, 4, p.hair); }
        else P(14, 20.5, 4, 1.2, sh2(p.skin, .72));
        break;
      }
    }
  }
};
