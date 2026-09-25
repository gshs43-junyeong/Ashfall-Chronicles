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
  /* 물에서만 나오는 일곱 */
  tide_pearl: { k: 'crystal', c: '#dfe9f5', glow: 1 },
  sunken_coin: { k: 'coin', c: '#c8a850' },
  lantern_fry: { k: 'fishitem', c: '#e8c86a', glow: '#ffe08a' },
  river_scale: { k: 'shard', c: '#7fc8b0' },
  drowned_cell: { k: 'cell', c: '#5a7a8a' },
  coolant_vial: { k: 'potion', c: '#6fd8e0', glow: '#9fe8ff' },
  rust_sinker: { k: 'pellet', c: '#8a6a4a' },
  knot_angler: { k: 'amulet', c: '#c8b08a', gem: '#5fc4c4' },
  /* 물에서만 나오는 무기·장신구 열둘 (세션마다 여섯) — 기존 그림에 색만 갈아 끼운다.
     작살은 창(spear), 사출기는 활(bow) 자세를 쓴다. */
  /* ★ 칸 이름을 그림 쪽이 쓰는 것과 맞춰야 한다 —
     staff 는 head + style('orb'|'crystal'|'claw'), bow 는 c + s(시위 색)다.
     gem 은 ring·amulet 만 쓴다. 처음에 staff 에 gem 을 줬다가 head 가 undefined 라
     아이콘 아틀라스를 짓는 도중에 터졌고, 게임이 아예 안 켜졌다. */
  spear_tide: { k: 'spear', c: '#7fc8d8', glow: '#a8e8f0' },
  bow_reed: { k: 'bow', c: '#a8b878', s: '#e8e0c0' },
  staff_current: { k: 'staff', c: '#5a7a6a', head: '#9fe0ff', style: 'crystal', glow: '#9fe0ff' },
  harpoon_cool: { k: 'spear', c: '#8fd0e0', glow: '#bfeaf5' },
  gun_pressure: { k: 'bow', c: '#6fb8d8', s: '#d8f4ff', glow: '#9fe0ff' },
  staff_deluge: { k: 'staff', c: '#2e4458', head: '#7fe0ff', style: 'claw', glow: '#7fe0ff' },
  charm_float: { k: 'sigil', c: '#e8c86a', glow: '#ffe08a' },
  ring_ripple: { k: 'ring', c: '#8fb8c8', gem: '#7fd8e8' },
  amul_scale: { k: 'amulet', c: '#7fc8b0', gem: '#a8e8d0' },
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
  chest_scale: { k: 'chest', c: '#7fc8b0', glow: '#a8e8d0' },
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
  /* 유적의 맥박 — 결정·물약·북, 그리고 탐사 기록 S 의 인장 여섯(유물과 같은 색 갈래) */
  cave_moss:    { k: 'weed_icon', c: '#6fa05a' },
  moss_poultice: { k: 'potion', c: '#7fb86a', sq: 1 },
  /* 유적 재료 열 가지 — 그림이 없어 가방에서 빈 칸으로 나오던 것(CLAUDE.md §1-6). 색은 그 유적의
     벽재·장식 색을 따라 어느 유적 것인지 알아보게 했다. */
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

  /* ================= 바다 · 빙하 =================
     전부 기존 painter(k)를 재사용하고 색만 바다 쪽으로 잡았다. */
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
  s_arch: { k: 'rune', c: '#a06fff' },
  /* 분기 색을 따라간다
     (검투사 붉은 계열 · 유격 초록 계열 · 비전 푸른/보라 계열) */
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
  slot_pet: { k: 'slotic', m: 'pet' },
  slot_util: { k: 'slotic', m: 'util' },
  /* 패널 제목 앞 아이콘 — '장비'(equip)만 있었고 나머지 두 제목은 글자뿐이라 줄이 안 맞았다 */
  bagui: { k: 'bagui' }, statui: { k: 'statui' },
  /* 탭(패널) 제목 · 화면 아래 탭 단추 아이콘 — 모두 같은 금빛·가죽빛 한 벌(bagui 와 같은 색)이라 나란히 둬도 한 식구로 읽힌다 */
  p_skill: { k: 'pskill' }, p_quest: { k: 'pquest' }, p_craft: { k: 'pcraft' }, p_chest: { k: 'pchest' },
  p_vault: { k: 'pvault' }, p_board: { k: 'pboard' }, p_town: { k: 'ptown' }, p_mach: { k: 'pmach' },
  p_reforge: { k: 'preforge' }, p_anvil: { k: 'panvil' }, p_map: { k: 'pmap' }, p_menu: { k: 'pmenu' }
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

/* ================= 업적 아이콘 =================
   **이모지를 쓰지 않는다.** 창 안의 다른 그림은 전부 여기서 그린 것인데 업적만
   이모지면 글꼴이 다른 글자가 섞인 것처럼 튄다(운영체제마다 모양도 다르다).

   두 갈래로 댄다.
   ① 그 업적이 가리키는 물건이 이미 있으면 **그 아이템 그림을 그대로 쓴다**
      (밀·곡괭이·물고기…). 새로 그릴 이유가 없고, 창 안에서 같은 물건이 같게 보인다.
   ② 물건으로 가리킬 수 없는 것(시간·죽음·거래·장 진행)만 여기서 새로 그린다. */
const GLSPEC = {};
for (const g of ['shard', 'house', 'wall', 'wave', 'crown', 'sword', 'trophy', 'field',
  'factory', 'anvil', 'pit', 'down', 'cloud', 'tablet', 'bubble', 'skull', 'redmoon',
  'key', 'candle', 'bed', 'scroll', 'sun', 'coin', 'coins', 'paw', 'hands', 'receipt',
  'clock', 'clock2', 'clock3', 'lung', 'grave', 'star', 'hidden'])
  GLSPEC[g] = { k: 'gl', g };

/* 장식 아이템(ITEMS 의 deco: 1)은 하나하나 적지 않고 제 타일 그림을 쓴다 — 장식을 더할 때
   그림을 빠뜨리는 일(CLAUDE.md §1-6)이 원리적으로 안 생긴다. 이끼 낀 바위만 블록 틀을 쓴다. */
for (const k in ITEMS) if (ITEMS[k].deco && !ISPEC[k])
  ISPEC[k] = { k: ITEMS[k].tile === T.MOSSSTONE ? 'block' : 'deco', tile: ITEMS[k].tile };

/* 업적 → 그림. 'i:' 는 아이템 그림 재사용, 'g:' 는 위에서 새로 그린 것. */
const ACH_ART = {
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
const Art = {
  atlas: null, cells: {}, urls: {}, ready: false, COLS: 16,

  build() {
    const keys = [];
    for (const id in ISPEC) keys.push(['i:' + id, ISPEC[id]]);
    for (const id in SKSPEC) keys.push(['s:' + id, SKSPEC[id]]);
    for (const id in BFSPEC) keys.push(['b:' + id, BFSPEC[id]]);
    for (const id in UISPEC) keys.push(['u:' + id, UISPEC[id]]);
    for (const id in GLSPEC) keys.push(['g:' + id, GLSPEC[id]]);
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
      /* ★ 한 칸이 터져도 나머지는 그린다. 아이콘 규격(ISPEC)에 칸 이름을 하나 잘못 적으면
         그 자리에서 예외가 나고, 그것이 build() 를 끊고 init() 까지 타고 올라가 **게임이
         아예 안 켜진다.** 여기서 끊고 콘솔에 어느 칸인지 남긴다 — 그 칸만 빈다. */
      try {
        this.paint(g, spec, rng);
      } catch (e) {
        console.warn('[아이콘] ' + key + ' 를 그리지 못했습니다:', e && e.message);
      }
      g.restore();
      // 펫은 형태(네발·새·정령…)마다 그림이 칸 안에서 치우쳐 있어서, 슬롯에 나란히 놓으면
      // 저마다 다른 높이로 떠 보인다. 좌표를 형태별로 손보는 대신 실제로 칠해진 영역을
      // 재서 칸 한가운데로 맞춘다 — 나중에 종류를 더 그려도 저절로 정렬된다.
      // 빈 펫 칸의 발자국 실루엣(slotic/pet)도 같은 문제라 함께 맞춘다 — 손으로 잡은
      // 좌표가 칸 중심에서 왼쪽으로 약 1.85px 치우쳐 있었다.
      if (spec.k === 'pet' || (spec.k === 'slotic' && spec.m === 'pet')) this.centerCell(g, cx * S32, cy * S32);
      this.outline(g, cx * S32, cy * S32);
    });

    this.atlas = cv;
    this.ready = true;
  },

  /** 손그림 아이콘이 로드되면 절차 생성 아틀라스의 해당 칸을 덮어 그린다.
      아틀라스만 갈아 끼우면 itemUrl(DOM)과 drawItem(캔버스)이 둘 다 자동으로 새 그림을 쓴다.
      urls 캐시는 이미 만들어진 data URL이 남아 있을 수 있으므로 같이 지운다. */
  /* ★ file:// 로 열었을 때는 손그림을 아틀라스에 얹지 않는다. 디스크에서 온 그림을
     캔버스에 그리면 캔버스가 "오염"되고 toDataURL 이 통째로 막혀, 가방·툴팁·제작창의
     아이콘이 **전부** 사라진다(아이콘은 전부 그 URL 로 나간다). 절차 생성 아이콘을 쓴다 —
     손그림은 세계·캐릭터 쪽에서 drawImage 로 계속 쓰이므로 그쪽은 무관하다. */
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

    switch (s.k) {

      /* ---------- 업적 글리프 ----------
         물건으로 가리킬 수 없는 것들. 32×32 칸 안에서 굵고 단순하게 — 목록에서는
         18px로 줄어들어 보이므로, 잔무늬를 넣으면 뭉개져서 얼룩으로만 남는다. */
      case 'gl': {
        const G1 = '#e8dcc0', G2 = '#c8a058', DK = '#4a4238', RD = '#d05a4a', GR = '#6fbf5a';
        const BL = '#6fa8d8', PL = '#b17fe0';
        switch (s.g) {
          case 'shard':                                    // 별 조각 — 뾰족한 마름모
            glow(16, 16, 12, G2, .3);
            poly([[16, 3], [23, 16], [16, 29], [9, 16]], G1);
            poly([[16, 3], [23, 16], [16, 16]], G2);
            break;
          case 'house':                                    // 집 — 지붕 + 몸통 + 문
            poly([[16, 5], [28, 15], [4, 15]], RD);
            g.fillStyle = G1; g.fillRect(7, 15, 18, 12);
            g.fillStyle = DK; g.fillRect(14, 19, 5, 8);
            break;
          case 'wall':                                     // 성벽 — 흉벽 이가 빠진 윗면
            g.fillStyle = G1; g.fillRect(5, 12, 22, 15);
            for (let i = 0; i < 3; i++) g.fillRect(5 + i * 8, 7, 5, 5);
            g.fillStyle = DK; g.fillRect(5, 18, 22, 1.5); g.fillRect(15, 12, 1.5, 15);
            break;
          case 'wave':                                     // 물결 셋
            for (let i = 0; i < 3; i++)
              stroke(i === 1 ? BL : sh2(BL, .78), 3, () => {
                g.moveTo(4, 11 + i * 6);
                g.quadraticCurveTo(10, 6 + i * 6, 16, 11 + i * 6);
                g.quadraticCurveTo(22, 16 + i * 6, 28, 11 + i * 6);
              });
            break;
          case 'crown':                                    // 왕관
            poly([[5, 24], [5, 10], [11, 16], [16, 7], [21, 16], [27, 10], [27, 24]], G2);
            g.fillStyle = sh2(G2, .68); g.fillRect(5, 22, 22, 3);
            circ(16, 7, 2, G1);
            break;
          case 'sword':                                    // 검 — 세로로 선 날
            poly([[16, 3], [19, 8], [19, 20], [13, 20], [13, 8]], G1);
            g.fillStyle = DK; g.fillRect(9, 20, 14, 3);
            g.fillStyle = sh2(G2, .8); g.fillRect(15, 23, 3, 6);
            break;
          case 'trophy':                                   // 우승컵
            poly([[9, 5], [23, 5], [21, 17], [11, 17]], G2);
            stroke(G2, 2, () => { g.moveTo(9, 8); g.quadraticCurveTo(4, 12, 10, 15); });
            stroke(G2, 2, () => { g.moveTo(23, 8); g.quadraticCurveTo(28, 12, 22, 15); });
            g.fillStyle = sh2(G2, .7); g.fillRect(14, 17, 4, 6); g.fillRect(9, 23, 14, 4);
            break;
          case 'field':                                    // 밭 이랑
            g.fillStyle = sh2('#7a5a34', 1); g.fillRect(3, 16, 26, 12);
            for (let i = 0; i < 4; i++) {
              g.fillStyle = sh2('#7a5a34', .72); g.fillRect(4 + i * 7, 16, 2, 12);
              stroke(GR, 2, () => { g.moveTo(7 + i * 7, 16); g.lineTo(7 + i * 7, 8); });
            }
            break;
          case 'factory':                                  // 공장 — 굴뚝 셋과 연기
            g.fillStyle = DK; g.fillRect(4, 16, 24, 12);
            for (let i = 0; i < 3; i++) g.fillStyle = sh2(G1, .74), g.fillRect(6 + i * 8, 9 + i * 2, 5, 8);
            circ(9, 6, 2.4, 'rgba(200,190,170,.5)'); circ(14, 4, 1.8, 'rgba(200,190,170,.35)');
            break;
          case 'anvil':                                    // 모루 — 한쪽 뿔
            g.fillStyle = '#5d5d68'; g.fillRect(6, 12, 20, 5);
            poly([[6, 12], [1, 14.5], [6, 17]], '#5d5d68');
            g.fillStyle = '#3a3a44'; g.fillRect(12, 17, 8, 5);
            g.fillStyle = '#4a3a26'; g.fillRect(8, 22, 16, 6);
            g.fillStyle = '#7a7a88'; g.fillRect(6, 12, 20, 1.5);
            break;
          case 'pit':                                      // 파 내려간 구덩이
            g.fillStyle = sh2('#7a5a34', .9); g.fillRect(3, 8, 26, 20);
            g.fillStyle = '#141210';
            poly([[8, 8], [24, 8], [20, 20], [16, 27], [12, 20]], '#141210');
            break;
          case 'down':                                     // 아래 화살표
            stroke(G1, 3, () => { g.moveTo(16, 5); g.lineTo(16, 21); });
            poly([[16, 28], [8, 17], [24, 17]], G1);
            break;
          case 'cloud':
            circ(11, 18, 6, G1); circ(19, 17, 7, G1); circ(24, 20, 5, G1);
            g.fillStyle = G1; g.fillRect(11, 18, 14, 6);
            break;
          case 'tablet':                                   // 석판 + 글줄
            g.fillStyle = '#7a7268'; g.fillRect(7, 4, 18, 24);
            g.fillStyle = '#5a5248'; g.fillRect(7, 4, 18, 2);
            for (let i = 0; i < 4; i++) g.fillStyle = '#a8a094', g.fillRect(10, 10 + i * 4, 12 - (i % 2) * 4, 1.5);
            break;
          case 'bubble':                                   // 물방울 셋
            circ(12, 20, 5.5, 'rgba(160,215,240,.85)'); circ(10.3, 18.3, 1.8, '#fff');
            circ(21, 13, 3.6, 'rgba(160,215,240,.7)');
            circ(17, 7, 2.2, 'rgba(160,215,240,.55)');
            break;
          case 'skull':
            circ(16, 14, 9, G1);
            g.fillStyle = G1; g.fillRect(11, 20, 10, 5);
            circ(12.5, 13, 2.6, DK); circ(19.5, 13, 2.6, DK);
            g.fillStyle = DK; g.fillRect(15, 17, 2, 3);
            for (let i = 0; i < 3; i++) g.fillStyle = DK, g.fillRect(12 + i * 3, 22, 1.5, 3);
            break;
          case 'redmoon':
            glow(16, 16, 13, RD, .38);
            circ(16, 16, 9, RD);
            circ(13, 13, 1.8, sh2(RD, .7)); circ(20, 18, 2.4, sh2(RD, .7));
            break;
          case 'key':
            circ(10, 11, 5.5, G2); circ(10, 11, 2.2, '#171410');
            stroke(G2, 3, () => { g.moveTo(13, 14); g.lineTo(24, 25); });
            stroke(G2, 3, () => { g.moveTo(20, 21); g.lineTo(24, 17); });
            break;
          case 'candle':
            g.fillStyle = G1; g.fillRect(13, 13, 6, 14);
            g.fillStyle = sh2(G1, .8); g.fillRect(11, 25, 10, 3);
            glow(16, 8, 7, '#ffd24a', .5);
            poly([[16, 3], [19, 9], [16, 12], [13, 9]], '#ffd24a');
            break;
          case 'bed':
            g.fillStyle = '#5a3c22'; g.fillRect(4, 14, 24, 4); g.fillRect(4, 10, 3, 14);
            g.fillStyle = '#e8dcc0'; g.fillRect(7, 11, 8, 4);
            g.fillStyle = '#7a5734'; g.fillRect(7, 18, 21, 5);
            g.fillStyle = '#3a2610'; g.fillRect(5, 23, 3, 5); g.fillRect(24, 23, 3, 5);
            break;
          case 'scroll':
            g.fillStyle = '#e0d4b0'; g.fillRect(8, 5, 16, 22);
            g.fillStyle = '#c0b28c'; g.fillRect(8, 5, 16, 2); g.fillRect(8, 25, 16, 2);
            for (let i = 0; i < 4; i++) g.fillStyle = '#8a7a58', g.fillRect(11, 10 + i * 4, 10 - (i % 2) * 3, 1.4);
            break;
          case 'sun':
            glow(16, 16, 13, '#ffd24a', .4);
            circ(16, 16, 6.5, '#ffd24a');
            for (let i = 0; i < 8; i++) {
              const a = i * TAU / 8;
              stroke('#ffd24a', 2, () => {
                g.moveTo(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9);
                g.lineTo(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13);
              });
            }
            break;
          case 'coin':
            circ(16, 16, 9, G2); circ(16, 16, 6.5, sh2(G2, 1.25));
            g.fillStyle = sh2(G2, .6); g.fillRect(15, 11, 2, 10);
            break;
          case 'coins':
            circ(11, 21, 7, sh2(G2, .82)); circ(21, 19, 7, sh2(G2, .9));
            circ(16, 12, 7.5, G2); circ(16, 12, 5, sh2(G2, 1.3));
            break;
          case 'paw':
            ell(16, 21, 6.5, 5.5, G1);
            circ(9.5, 13, 3, G1); circ(14, 10, 3, G1); circ(19, 10, 3, G1); circ(23, 14, 3, G1);
            break;
          case 'hands':                                    // 악수
            stroke(G1, 4, () => { g.moveTo(4, 12); g.lineTo(15, 17); });
            stroke(G2, 4, () => { g.moveTo(28, 12); g.lineTo(17, 17); });
            circ(16, 18, 4.5, G1);
            break;
          case 'receipt':
            g.fillStyle = '#e0d4b0'; g.fillRect(8, 4, 16, 22);
            poly([[8, 26], [12, 23], [16, 26], [20, 23], [24, 26], [24, 28], [8, 28]], '#171410');
            for (let i = 0; i < 4; i++) g.fillStyle = '#8a7a58', g.fillRect(11, 9 + i * 4, 10 - (i % 2) * 4, 1.4);
            break;
          case 'clock': case 'clock2': case 'clock3': {
            const rings = s.g === 'clock' ? 1 : s.g === 'clock2' ? 2 : 3;
            circ(16, 16, 11, G1); circ(16, 16, 9, '#171410');
            // 시침 각도로 1·10·100시간을 가른다 — 같은 시계가 셋이면 구분이 안 된다
            const ang = [-Math.PI / 2 + 0.5, -Math.PI / 2 + 2.6, -Math.PI / 2 + 4.7][rings - 1];
            stroke(G2, 2.4, () => { g.moveTo(16, 16); g.lineTo(16 + Math.cos(ang) * 6, 16 + Math.sin(ang) * 6); });
            stroke(G1, 2, () => { g.moveTo(16, 16); g.lineTo(16, 9); });
            for (let i = 0; i < rings; i++) circ(16, 29 - i * 0, 0, G2);
            g.fillStyle = G2;
            for (let i = 0; i < rings; i++) g.fillRect(11 + i * 5, 28, 3, 3);   // 아래 점으로 등급 표시
            break;
          }
          case 'lung':                                     // 숨 — 허파 둘과 새는 방울
            ell(11, 19, 5, 7, sh2(RD, .95)); ell(21, 19, 5, 7, sh2(RD, .95));
            g.fillStyle = sh2(RD, .7); g.fillRect(15, 8, 2, 9);
            circ(24, 8, 2.4, 'rgba(160,215,240,.8)'); circ(27, 4, 1.5, 'rgba(160,215,240,.6)');
            break;
          case 'grave':
            g.fillStyle = '#7a7268';
            poly([[8, 27], [8, 12], [16, 5], [24, 12], [24, 27]], '#7a7268');
            g.fillStyle = '#4a443c'; g.fillRect(14, 12, 4, 11); g.fillRect(11, 15, 10, 4);
            g.fillStyle = '#3a4a2a'; g.fillRect(4, 27, 24, 3);
            break;
          case 'hidden':                                   // 숨은 업적 — 물음표
            circ(16, 16, 11, 'rgba(120,112,96,.22)');
            g.fillStyle = '#8a8271'; g.font = 'bold 19px sans-serif';
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText('?', 16, 16.5);
            g.textAlign = 'start'; g.textBaseline = 'alphabetic';
            break;
          default:                                         // star
            glow(16, 16, 12, G2, .32);
            poly([[16, 3], [19.5, 12.5], [29, 12.5], [21.5, 18.5], [24.5, 28],
                  [16, 22], [7.5, 28], [10.5, 18.5], [3, 12.5], [12.5, 12.5]], G2);
        }
        break;
      }

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

      /* 장식 아이템 — 타일 그림을 테두리 없이 그대로 키운다. 블록처럼 틀을 두르면 꽃 한 포기가
         돌덩이로 읽힌다. */
      case 'deco': {
        if (TileArt.ready) g.drawImage(TileArt.atlas, 0, s.tile * TS, TS, TS, 3, 3, 26, 26);
        else P(8, 8, 16, 16, TILE_DEF[s.tile].c || '#666');
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

      /* ---------- 기계 ----------
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

      /* ---------- 자원 · 부품 ---------- */
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

      case 'bomb': {
        /* 폭탄 — 둥근 몸통 + 심지. 세 종류를 몸통 색과 심지 색으로 구분한다.
           칸 안에서 아래쪽에 앉혀야 손에 들었을 때 굴러떨어질 것처럼 보인다. */
        const c = s.c;
        circ(15, 20, 9, sh2(c, .7));
        circ(15, 20, 8, c);
        circ(12, 17, 3, sh2(c, 1.6));                       // 광택
        P(13.5, 9, 3.5, 4, sh2(c, .55));                    // 마개
        stroke(s.fuse, 2, () => { g.moveTo(15.5, 9); g.bezierCurveTo(19, 5, 23, 7, 24, 3); });
        circ(24, 3, 2, '#ffd24a');                          // 불씨
        if (s.glow) glow(24, 3, 7, s.glow, .3);
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

      /* ---------- 농업 ---------- */
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

      /* ---------- 음식 ---------- */
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

      case 'meteorite': {           // 운석 조각 — 둥근 검은 쇳덩이, 오목 자국 셋, 쇠 윤과 붉은 금
        const c = s.c;
        glow(16, 17, 12, '#ff7a3a', .12);
        poly([[7, 13], [12, 7], [20, 6], [26, 11], [27, 19], [22, 26], [12, 26], [6, 20]], c);
        poly([[7, 13], [12, 7], [20, 6], [26, 11], [18, 13], [10, 16]], sh2(c, 1.3));
        poly([[27, 19], [22, 26], [12, 26], [16, 21], [24, 18]], sh2(c, .65));
        for (const [x, y, r] of [[13, 14, 3], [20, 12, 2.4], [18, 20, 3.2]]) {
          circ(x, y, r, sh2(c, .6)); circ(x + .7, y + .8, r * .7, sh2(c, .8));
        }
        P(11, 9, 5, 1.2, '#c8ccd4'); P(22, 16, 2, 1, '#c8ccd4'); P(9, 20, 1.5, 1, '#9aa0aa');
        P(15, 23, 1, 1, '#ff7a3a'); P(16, 22, 1, 1, '#ff7a3a'); P(17, 22, 1, 1, '#ffb070'); P(18, 21, 1, 1, '#ff7a3a');
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

      case 'detector': {
        /* 탐지기 — 접시 안테나 달린 손잡이 상자. 산소통(둥근 통)과 한 칸에 나란히
           놓이므로 실루엣이 확실히 달라야 한다: 이쪽은 각지고 위로 뻗는다. */
        const c = s.c, dk = sh2(c, .5), lt = sh2(c, 1.3);
        g.fillStyle = dk; g.fillRect(10, 17, 12, 12);          // 몸통
        g.fillStyle = c; g.fillRect(11, 18, 10, 4);            // 화면
        g.fillStyle = lt; g.fillRect(12, 19, 3, 2);
        g.fillStyle = sh2(c, .34); g.fillRect(12, 24, 8, 3);   // 손잡이 홈
        stroke(dk, 2, () => { g.moveTo(16, 17); g.lineTo(16, 10); });   // 대
        // 접시 — 위로 열린 반원
        g.fillStyle = c; g.beginPath(); g.arc(16, 10, 7, Math.PI, 0); g.closePath(); g.fill();
        g.fillStyle = sh2(c, .62); g.beginPath(); g.arc(16, 10, 4.4, Math.PI, 0); g.closePath(); g.fill();
        circ(16, 6.5, 1.6, lt);                                 // 신호점
        glow(16, 6.5, 8, c, .3);
        break;
      }

      case 'coconut_i': {
        /* 코코넛 — 반으로 쪼갠 모양. 통짜 갈색 공으로 그리면 목록에서 돌멩이·알과
           구분이 안 된다. 흰 속살과 씨눈 셋이 코코넛의 표식이다. */
        const c = s.c, husk = sh2(c, .72), meat = '#f0e8d8';
        circ(16, 17, 11, husk);
        for (let i = 0; i < 26; i++) {                      // 겉껍질 섬유결
          const a = rng.range(0, TAU), r = rng.range(6, 10.5);
          g.fillStyle = sh2(c, rng.chance(.5) ? 1.25 : .55);
          g.fillRect(16 + Math.cos(a) * r, 17 + Math.sin(a) * r, 1.4, 1.4);
        }
        circ(16, 17, 7.6, meat);                            // 속살
        circ(16, 17, 5.4, sh2('#cfc4ae', 1));               // 안쪽 그늘(물이 찬 자리)
        for (const [dx, dy] of [[-2.6, -1.6], [2.6, -1.6], [0, 2.6]])
          circ(16 + dx, 17 + dy, 1.15, sh2(c, .5));         // 씨눈 셋
        break;
      }

      case 'candy': {
        /* 사탕 — 가운데 알맹이에 양쪽 포장지를 꼬아 묶은 모양.
           알(egg)과 한 줄에 놓이는 물건이라, 둥근 것끼리 헷갈리지 않게
           **양옆으로 뻗은 포장지**를 실루엣의 특징으로 삼는다. */
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .62);
        g.fillStyle = dk;                                   // 포장지 (좌우 삼각)
        g.beginPath(); g.moveTo(4, 11); g.lineTo(11, 16); g.lineTo(4, 21); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(28, 11); g.lineTo(21, 16); g.lineTo(28, 21); g.closePath(); g.fill();
        circ(16, 16, 6.5, c);                               // 알맹이
        g.strokeStyle = lt; g.lineWidth = 2;                // 나선 무늬
        g.beginPath(); g.moveTo(12, 19); g.quadraticCurveTo(16, 12, 20, 15); g.stroke();
        g.lineWidth = 1;
        circ(13.6, 13.4, 1.8, sh2(c, 1.6));                 // 광택
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
      /* 나뭇잎 — 나무마다 모양이 다르다(sh). 색만 갈아 끼우면 여섯 가지가 가방에서 한 가지로 보여서
         모양을 갈랐다: oak 둥근 잎 · needle 솔가지 · broad 넓은 정글 잎 · palm 깃꼴 잎 ·
         curl 말린 부패 잎 · star 별꼴 하늘 잎. 윤곽은 늘 한 톤 어두운 색 — 밝은 칸 위에서도 읽히게. */
      case 'leafitem': {
        const c = s.c, dk = sh2(c, .62), lt = sh2(c, 1.22), stem = s.st || sh2(c, .5);
        const blade = (pts) => { poly(pts, dk); poly(pts.map(([x, y]) => [x + (16 - x) * .12, y + (16 - y) * .12]), c); };
        if (s.sh === 'needle') {
          stroke(stem, 2, () => { g.moveTo(8, 28); g.lineTo(22, 4); });
          for (let i = 0; i < 9; i++) {
            const t = i / 8, x = 8 + t * 14, y = 28 - t * 24, L = 7 - t * 3;
            stroke(i % 2 ? c : dk, 1.5, () => { g.moveTo(x, y); g.lineTo(x - L, y - L * .45); });
            stroke(i % 2 ? dk : lt, 1.5, () => { g.moveTo(x, y); g.lineTo(x + L * .9, y + L * .2); });
          }
        } else if (s.sh === 'palm') {
          stroke(stem, 1.8, () => { g.moveTo(6, 28); g.quadraticCurveTo(14, 12, 27, 5); });
          for (let i = 1; i < 10; i++) {
            const t = i / 10, x = 6 + t * 20, y = 28 - t * 22 - Math.sin(t * 3) * 3, L = 9 - t * 5;
            stroke(i % 2 ? c : lt, 1.7, () => { g.moveTo(x, y); g.lineTo(x - L * .3, y - L); });
            stroke(i % 2 ? dk : c, 1.7, () => { g.moveTo(x, y); g.lineTo(x + L * .8, y + L * .5); });
          }
        } else if (s.sh === 'star') {
          const pts = [];
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.5 : 12; pts.push([16 + Math.cos(a) * r, 15 + Math.sin(a) * r]); }
          glow(16, 15, 12, c, .2);
          blade(pts);
          for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; stroke(lt, 1, () => { g.moveTo(16, 15); g.lineTo(16 + Math.cos(a) * 9, 15 + Math.sin(a) * 9); }); }
          stroke(stem, 1.6, () => { g.moveTo(16, 21); g.lineTo(15, 29); });
        } else {
          // 잎몸 윤곽 — 잎자루(아래 왼쪽)에서 잎끝(위 오른쪽)까지
          const W = s.sh === 'broad' ? 9.5 : s.sh === 'curl' ? 6 : 7.5;
          const pts = [];
          for (let i = 0; i <= 12; i++) {
            const t = i / 12, w = Math.sin(t * Math.PI) ** (s.sh === 'broad' ? .7 : .9) * W;
            const cx = 9 + t * 16, cy = 25 - t * 20 + (s.sh === 'curl' ? Math.sin(t * 5) * 2.5 : 0);
            pts.push([cx - w * .78, cy - w * .62]);
          }
          for (let i = 12; i >= 0; i--) {
            const t = i / 12, w = Math.sin(t * Math.PI) ** (s.sh === 'broad' ? .7 : .9) * W * (s.sh === 'curl' ? .6 : 1);
            const cx = 9 + t * 16, cy = 25 - t * 20 + (s.sh === 'curl' ? Math.sin(t * 5) * 2.5 : 0);
            pts.push([cx + w * .78, cy + w * .62]);
          }
          blade(pts);
          stroke(stem, 1.6, () => { g.moveTo(5, 29); g.lineTo(10, 24); });
          stroke(sh2(c, .78), 1.1, () => { g.moveTo(10, 24); g.lineTo(24, 6); });           // 잎맥
          for (let i = 1; i < (s.sh === 'broad' ? 6 : 4); i++) {
            const t = i / (s.sh === 'broad' ? 6 : 4), x = 10 + t * 14, y = 24 - t * 18;
            stroke(sh2(c, .8), .9, () => { g.moveTo(x, y); g.lineTo(x - 4, y - 1); });
            stroke(sh2(c, .8), .9, () => { g.moveTo(x, y); g.lineTo(x + 1, y + 4); });
          }
          stroke(lt, 1, () => { g.moveTo(9, 19); g.quadraticCurveTo(13, 11, 21, 7); });   // 윗가 빛
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

      /* ---------- 스킬 아이콘 ---------- */
      case 'bulwark': {           // 철벽 — 벽돌을 쌓아 올린 방벽
        const c = s.c;
        glow(16, 18, 12, c, .18);
        for (let r = 0; r < 3; r++) {
          const y = 11 + r * 6, off = r % 2 ? -3 : 0;
          for (let i = -1; i <= 1; i++) P(11 + i * 7 + off, y, 6.2, 5.2, i ? sh2(c, .78) : c);
        }
        P(4, 8, 24, 2.2, sh2(c, 1.35));
        stroke(sh2(c, 1.5), 1.4, () => { g.moveTo(6, 10.4); g.lineTo(26, 10.4); });
        break;
      }
      case 'quake': {             // 대지 가르기 — 갈라진 땅과 솟는 파편
        const c = s.c;
        P(2, 20, 28, 3, sh2(c, .68));
        poly([[16, 30], [12, 21], [15, 21], [13, 14], [20, 22], [17, 22], [19, 30]], sh2(c, 1.4));
        for (const [x, h] of [[6, 6], [10, 9], [22, 9], [26, 6]])
          poly([[x, 20], [x + 2.4, 20 - h], [x + 4.8, 20]], c);
        stroke(sh2(c, 1.2), 1.6, () => { g.moveTo(3, 26); g.lineTo(9, 24); });
        stroke(sh2(c, 1.2), 1.6, () => { g.moveTo(29, 26); g.lineTo(23, 24); });
        break;
      }
      case 'shout': {             // 전투 함성 — 벌린 입에서 퍼져 나가는 파동
        const c = s.c;
        glow(11, 16, 11, c, .2);
        poly([[4, 10], [12, 10], [12, 22], [4, 22]], sh2(c, .7));
        poly([[12, 6], [12, 26], [17, 22], [17, 10]], c);
        for (let i = 0; i < 3; i++)
          stroke(sh2(c, 1 + i * .18), 2 - i * .3, () => { g.arc(17, 16, 5 + i * 5, -0.85, 0.85); });
        break;
      }
      case 'lifebeat': {          // 불굴 — 심장과 맥박선
        const c = s.c;
        glow(16, 16, 12, c, .24);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 27);
        g.bezierCurveTo(3, 18, 4, 7, 11, 7);
        g.bezierCurveTo(14, 7, 16, 10, 16, 11);
        g.bezierCurveTo(16, 10, 18, 7, 21, 7);
        g.bezierCurveTo(28, 7, 29, 18, 16, 27);
        g.closePath(); g.fill();
        stroke('#fff6e8', 2, () => {
          g.moveTo(4, 17); g.lineTo(10, 17); g.lineTo(12.5, 11.5);
          g.lineTo(16, 22); g.lineTo(19, 15); g.lineTo(21.5, 17); g.lineTo(28, 17);
        });
        break;
      }
      case 'pierce': {            // 꿰뚫는 화살 — 과녁을 지나가 버린 한 발
        const c = s.c;
        stroke(sh2(c, .55), 1.6, () => { g.arc(19, 16, 8.5, 0, TAU); });
        stroke(sh2(c, .55), 1.4, () => { g.arc(19, 16, 4, 0, TAU); });
        stroke(c, 2.6, () => { g.moveTo(2, 24); g.lineTo(25, 9); });
        poly([[30, 6], [22.5, 8], [26, 12.5]], sh2(c, 1.4));
        stroke(sh2(c, .8), 1.6, () => { g.moveTo(3, 20); g.lineTo(7, 23); });
        stroke(sh2(c, .8), 1.6, () => { g.moveTo(6, 27); g.lineTo(9, 23); });
        break;
      }
      case 'smoke': {             // 연막탄 — 터진 통에서 피어오르는 연기
        const c = s.c;
        glow(16, 13, 12, c, .16);
        ell(11, 12, 6, 4.6, sh2(c, .9));
        ell(19, 10, 7, 5.2, c);
        ell(22, 15, 5.4, 4, sh2(c, .78));
        ell(9, 17, 4.6, 3.4, sh2(c, .7));
        P(13, 21, 6, 8, sh2(c, .5));
        P(13, 21, 6, 2, sh2(c, 1.3));
        P(12, 28.4, 8, 2, sh2(c, .42));
        break;
      }
      case 'mark': {              // 사냥꾼의 표식 — 적 위에 찍히는 삼각 표식
        const c = s.c;
        glow(16, 12, 11, c, .24);
        poly([[16, 20], [8, 5], [24, 5]], c);
        poly([[16, 16], [11.5, 7.5], [20.5, 7.5]], sh2(c, 1.45));
        stroke(sh2(c, .7), 2, () => { g.arc(16, 25, 6, -2.9, -0.25); });
        P(15.2, 22, 1.6, 8, sh2(c, .65));
        break;
      }
      case 'tempest': {           // 폭풍의 시위 — 활에서 갈라져 나가는 두 발
        const c = s.c;
        stroke(c, 2.2, () => { g.arc(9, 16, 10, -1.15, 1.15); });
        stroke(sh2(c, .6), 1.2, () => { g.moveTo(13.6, 7.2); g.lineTo(13.6, 24.8); });
        for (const t of [-1, 1]) {
          const y0 = 16 + t * 4;
          stroke(t < 0 ? c : sh2(c, .78), 2, () => { g.moveTo(12, y0); g.lineTo(27, y0 + t * 4); });
          poly([[30, y0 + t * 5], [25, y0 + t * 1.6], [25.6, y0 + t * 6.4]], sh2(c, 1.4));
        }
        break;
      }
      case 'barrier': {           // 비전 방벽 — 육각 결계
        const c = s.c;
        glow(16, 16, 13, c, .26);
        const hex = (r) => { const pts = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; pts.push([16 + Math.cos(a) * r, 16 + Math.sin(a) * r]); } return pts; };
        poly(hex(13), 'rgba(120,180,255,.20)');
        stroke(c, 2.2, () => { const p = hex(13); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); });
        stroke(sh2(c, 1.35), 1.3, () => { const p = hex(7.5); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); });
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; circ(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, 1.7, '#ffffff'); }
        break;
      }
      case 'chain': {             // 사슬 번개 — 갈라져 튀는 번개
        const c = s.c;
        glow(16, 16, 13, c, .3);
        poly([[15, 2], [7, 16], [13, 16], [10, 30], [21, 13], [15, 13]], c);
        stroke(sh2(c, 1.5), 1.4, () => { g.moveTo(14, 5); g.lineTo(9.5, 14.5); });
        stroke(sh2(c, .8), 2, () => { g.moveTo(21, 6); g.lineTo(26, 11); g.lineTo(23, 13); g.lineTo(29, 18); });
        stroke(sh2(c, .8), 1.6, () => { g.moveTo(4, 8); g.lineTo(7, 11); });
        break;
      }
      case 'blink': {             // 차원 도약 — 남은 잔상과 도착한 자리
        const c = s.c;
        glow(22, 16, 12, c, .24);
        g.globalAlpha = .38;
        poly([[4, 8], [11, 8], [11, 25], [4, 25]], sh2(c, .7));
        g.globalAlpha = 1;
        poly([[19, 6], [27, 6], [27, 27], [19, 27]], c);
        poly([[19, 6], [23, 6], [23, 27], [19, 27]], sh2(c, 1.3));
        for (let i = 0; i < 3; i++) P(12.5 + i * 1.8, 13 + i * 2, 2.2, 2.2, sh2(c, 1.45));
        stroke(sh2(c, 1.5), 1.6, () => { g.moveTo(13, 16.5); g.lineTo(18, 16.5); });
        break;
      }
      case 'meteor': {            // 별의 낙하 — 꼬리를 끌며 떨어지는 별
        const c = s.c;
        glow(20, 11, 13, c, .32);
        stroke(sh2(c, .62), 3.4, () => { g.moveTo(2, 29); g.lineTo(16, 15); });
        stroke(sh2(c, .85), 1.8, () => { g.moveTo(6, 29); g.lineTo(17, 18); });
        g.fillStyle = c; g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 3.6 : 9, a = -Math.PI / 2 + i * Math.PI / 5;
          const x = 21 + Math.cos(a) * r, y = 11 + Math.sin(a) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        circ(21, 11, 3.4, '#fff2c8');
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
      case 'bagui': {
        // 소지품 — 열린 자루. 장비 칸의 배낭(slot_bag)과 달리 뚜껑이 열려 있다
        glow(16, 17, 12, '#d8a94b', .13);
        poly([[8, 12], [24, 12], [26, 27], [6, 27]], '#8c7651');
        poly([[8, 12], [16, 12], [16, 27], [6, 27]], '#c8aa70');
        poly([[6, 12], [10, 6], [22, 6], [26, 12]], '#5c4930');   // 젖혀진 덮개
        P(13, 17, 6, 5, '#5c4930');                                // 잠금쇠
        break;
      }
      /* ---- 탭 아이콘 — 금빛(#c8aa70) 밝은 면 · 가죽빛(#8c7651) 그늘 · 짙은 갈색(#5c4930) 선, 은은한 금빛 번짐 ---- */
      case 'pskill': {
        // 능력과 특성 — 네 갈래로 빛나는 별(특성 나무의 끝)
        glow(16, 16, 13, '#d8a94b', .16);
        poly([[16, 3], [19.5, 12.5], [29, 16], [19.5, 19.5], [16, 29], [12.5, 19.5], [3, 16], [12.5, 12.5]], '#8c7651');
        poly([[16, 3], [19.5, 12.5], [16, 16], [12.5, 12.5]], '#e8cf8e');
        poly([[3, 16], [12.5, 12.5], [16, 16], [12.5, 19.5]], '#c8aa70');
        circ(16, 16, 3, '#fff0c0');
        break;
      }
      case 'pquest': {
        // 여정의 기록 — 펼친 책과 책갈피
        glow(16, 17, 12, '#d8a94b', .13);
        poly([[4, 9], [16, 11], [16, 27], [4, 25]], '#c8aa70');
        poly([[28, 9], [16, 11], [16, 27], [28, 25]], '#e0c890');
        P(15, 11, 2, 16, '#5c4930');
        for (let i = 0; i < 4; i++) { P(6.5, 14 + i * 3, 7, 1.2, '#8c7651'); P(18.5, 14 + i * 3, 7, 1.2, '#a88a5a'); }
        poly([[22, 9.5], [25, 9.2], [25, 18], [23.5, 16.5], [22, 18]], '#b8483c');   // 책갈피
        break;
      }
      case 'pcraft': {
        // 제작 — 망치와 톱이 엇갈린 문장
        glow(16, 16, 12, '#d8a94b', .13);
        stroke('#5c4930', 3, () => { g.moveTo(8, 26); g.lineTo(21, 11); });
        poly([[17, 6], [27, 12], [24, 16], [14, 10]], '#8c7651');
        poly([[17, 6], [27, 12], [26, 13.5], [16, 7.5]], '#c8aa70');
        stroke('#5c4930', 3, () => { g.moveTo(24, 26); g.lineTo(11, 11); });
        poly([[6, 8], [12, 5], [15, 12], [9, 15]], '#9fb0bc');
        for (let i = 0; i < 3; i++) P(6.5 + i * 2.2, 13.5 - i * 1.1, 1.3, 1.3, '#5d7892');
        break;
      }
      case 'pchest': {
        // 상자 — 둥근 뚜껑과 쇠 띠
        glow(16, 17, 12, '#d8a94b', .12);
        P(5, 14, 22, 13, '#8c7651'); P(5, 14, 11, 13, '#a88a5a');
        poly([[5, 14], [7, 8], [25, 8], [27, 14]], '#c8aa70');
        P(5, 13.2, 22, 2, '#5c4930'); P(9, 8, 2, 19, '#5c4930'); P(21, 8, 2, 19, '#5c4930');
        P(14, 15, 4, 5, '#e8cf8e'); P(15.2, 17, 1.6, 2, '#5c4930');
        break;
      }
      case 'pvault': {
        // 보관고 — 둥근 손잡이가 달린 금고 문
        glow(16, 16, 12, '#d8a94b', .12);
        P(5, 6, 22, 21, '#5c4930'); P(6.5, 7.5, 19, 18, '#8c7651');
        circ(16, 16.5, 6, '#c8aa70'); circ(16, 16.5, 3.5, '#5c4930'); circ(16, 16.5, 1.5, '#e8cf8e');
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .6; P(16 + Math.cos(a) * 6.5 - .8, 16.5 + Math.sin(a) * 6.5 - .8, 1.6, 1.6, '#e8cf8e'); }
        P(8, 27, 3, 2, '#5c4930'); P(21, 27, 3, 2, '#5c4930');
        break;
      }
      case 'pboard': {
        // 의뢰 게시판 — 기둥 둘에 핀으로 꽂힌 쪽지 셋
        glow(16, 16, 12, '#d8a94b', .12);
        P(7, 6, 2.5, 23, '#5c4930'); P(22.5, 6, 2.5, 23, '#5c4930');
        P(5, 7, 22, 14, '#8c7651');
        P(7, 9, 7, 8, '#e8dcc0'); P(15.5, 8.5, 8, 6, '#e0c890'); P(16, 15.5, 7, 4, '#e8dcc0');
        circ(10.5, 9.5, 1, '#b8483c'); circ(19.5, 9, 1, '#b8483c'); circ(19.5, 16, 1, '#b8483c');
        break;
      }
      case 'ptown': {
        // 여명 마을 — 지붕과 굴뚝, 불 켜진 창
        glow(16, 17, 12, '#d8a94b', .13);
        P(7, 15, 18, 12, '#8c7651'); P(7, 15, 9, 12, '#a88a5a');
        poly([[4, 16], [16, 5], [28, 16]], '#b8483c'); poly([[4, 16], [16, 5], [16, 16]], '#d0685a');
        P(21, 7, 3, 6, '#5c4930');
        P(10, 18, 4, 4, '#ffd98a'); P(18, 19, 4, 8, '#5c4930');
        break;
      }
      case 'pmach': {
        // 기계 — 톱니바퀴
        glow(16, 16, 12, '#d8a94b', .12);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.save(); g.translate(16 + Math.cos(a) * 10, 16 + Math.sin(a) * 10); g.rotate(a); g.fillStyle = '#8c7651'; g.fillRect(-2.5, -2.5, 5, 5); g.restore(); }
        circ(16, 16, 10, '#8c7651'); circ(16, 16, 8.5, '#c8aa70'); circ(16, 16, 4, '#5c4930'); circ(16, 16, 2, '#e8cf8e');
        break;
      }
      case 'preforge': {
        // 재련대 — 받침 위의 불꽃
        glow(16, 15, 12, '#ff9a50', .2);
        poly([[16, 3], [22, 12], [21, 19], [11, 19], [10, 12]], '#e0561c');
        poly([[16, 8], [19, 14], [18, 19], [14, 19], [13, 14]], '#ffb24a');
        poly([[16, 12], [17.5, 16], [16, 19], [14.5, 16]], '#fff0c0');
        P(7, 20, 18, 3, '#8c7651'); P(10, 23, 12, 5, '#5c4930');
        break;
      }
      case 'panvil': {
        // 강화 모루 — 뿔 달린 모루와 불티
        glow(16, 18, 12, '#d8a94b', .13);
        poly([[5, 12], [24, 12], [27, 15], [22, 17], [9, 17]], '#9fb0bc');
        poly([[5, 12], [24, 12], [24, 14], [7, 14]], '#d8e0e8');
        P(12, 17, 8, 5, '#6d7a86'); P(9, 22, 14, 5, '#5c6670');
        circ(22, 7, 1.2, '#ffb24a'); circ(18, 5, 0.9, '#ffd98a'); circ(25, 9, 0.8, '#ffd98a');
        break;
      }
      case 'pmap': {
        // 지도 — 세 번 접힌 종이, 점선 길과 X 표
        glow(16, 16, 12, '#d8a94b', .12);
        poly([[4, 8], [12, 6], [20, 8], [28, 6], [28, 25], [20, 27], [12, 25], [4, 27]], '#c8aa70');
        poly([[12, 6], [20, 8], [20, 27], [12, 25]], '#a88a5a');
        for (let i = 0; i < 5; i++) P(7 + i * 3.4, 20 - i * 1.8, 1.8, 1.4, '#5c4930');
        stroke('#b8483c', 1.8, () => { g.moveTo(22, 10); g.lineTo(26, 14); g.moveTo(26, 10); g.lineTo(22, 14); });
        break;
      }
      case 'pmenu': {
        // 메뉴(일시정지) — 세 줄
        glow(16, 16, 12, '#d8a94b', .12);
        for (let i = 0; i < 3; i++) { P(7, 9 + i * 6, 18, 3, '#8c7651'); P(7, 9 + i * 6, 18, 1.4, '#c8aa70'); }
        break;
      }
      case 'statui': {
        // 능력치 — 올라가는 막대 셋. 숫자를 다루는 자리라는 뜻
        glow(16, 17, 12, '#d8a94b', .13);
        P(7, 19, 5, 9, '#8c7651');
        P(13.5, 13, 5, 15, '#c8aa70');
        P(20, 8, 5, 20, '#8c7651');
        P(6, 27.5, 20, 1.6, '#5c4930');                            // 밑줄
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
          case 'util':                                     // 렌치 — '유틸리티' 칸 그 자체
            /* 여기는 앞으로 산소통 말고도 여러 도구가 들어올 자리라, 특정 물건이 아니라
               **도구**를 뜻하는 그림이어야 한다. 무기(검)·장신구(반지)·가방(배낭)·
               펫(발자국) 어느 것과도 안 겹친다.
               세로로 곧게 세우고 물림쇠를 'ㄷ'자로 각지게 그린다 — 비스듬한 자루에
               둥근 호를 얹었더니 렌치가 아니라 구부러진 막대로 보였다. */
            P(13.5, 12, 5, 13, c);                         // 자루
            P(14.5, 13, 1.6, 11, l);                       // 빛 받는 면
            // 물림쇠 — 'ㄷ'을 옆으로 눕힌 모양. 가운데가 비어야 렌치로 읽힌다
            P(10.5, 4, 11, 3.2, c);                        // 위 턱
            P(10.5, 9.5, 11, 3.2, c);                      // 아래 턱
            P(18.5, 4, 3, 8.7, c);                         // 등
            P(19.2, 5, 1.2, 6.5, l);
            P(11.5, 5, 6, 1.2, l);                         // 위 턱 하이라이트
            circ(16, 26.5, 3.6, c);                        // 손잡이 끝
            circ(16, 26.5, 1.5, '#3d382d');                // 구멍
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

      /* ---------- 문 ----------
         세계에 서 있는 모습 그대로 — 널판 한 장, 경첩은 왼쪽 가장자리에 둘,
         손잡이는 그 반대쪽. 색과 모양은 obj/door.png 의 것을 따른다
         (놋쇠 판에 어두운 열쇠구멍). 아이콘만 보고 그 문임을 알아볼 수 있게. */
      case 'doorit': {
        P(4, 2, 24, 28, '#3a2610');                     // 문틀
        P(5.5, 3.5, 21, 25, '#6f4c2c');                 // 문짝
        for (let i = 0; i < 4; i++) P(9.5 + i * 4.2, 3.5, 1, 25, '#4a3018');  // 널 이음매
        P(5.5, 9, 21, 1.6, '#4a3018'); P(5.5, 21, 21, 1.6, '#4a3018');        // 가로 띠 둘
        P(6.5, 8.4, 4.5, 2.8, '#8a8a94'); P(6.5, 20.4, 4.5, 2.8, '#8a8a94');  // 경첩 — 왼쪽
        P(21, 14, 3.4, 5, '#d8a94b');                   // 손잡이 — 오른쪽
        P(22.1, 15.6, 1.4, 2, '#3a2610');
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
