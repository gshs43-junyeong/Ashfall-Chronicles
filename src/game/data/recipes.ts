// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== data/recipes.js — 제작법 · 연료 · 공장 기계 · 기계 제작법 · 물건값 단계 ===== */
import { clamp } from '../../engine/core/math.js';
import { T } from '../data.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ---------------- 제작법 ---------------- */
// need: {아이템:수량}, station: null(어디서나) / 'work'(작업대) / 'forge'(용광로) lv: 그 시설의 필요 승급 단계 (없으면 1).
export const RECIPES = [
  { out: 'plank', n: 4, need: { wood: 1 } },
  { out: 'torch', n: 5, need: { wood: 1 } },
  { out: 'platform', n: 4, need: { wood: 1 } },
  { out: 'brick', n: 4, need: { stone: 4 }, station: 'work' },
  { out: 'copper_bar', n: 1, need: { copper_ore: 3 }, station: 'forge' },
  { out: 'iron_bar', n: 1, need: { iron_ore: 3 }, station: 'forge' },
  { out: 'gold_bar', n: 1, need: { gold_ore: 3 }, station: 'forge' },
  { out: 'mythril_bar', n: 1, need: { mythril_ore: 4, soul_shard: 1 }, station: 'forge' },

  /* 설치물 — 작업대는 맨손으로 만들 수 있어야 한다(유일한 작업대를 부수면 잠기므로) */
  { out: 'station_work', n: 1, need: { wood: 25 } },
  { out: 'station_forge', n: 1, need: { stone: 30, wood: 10 }, station: 'work' },
  { out: 'crate_wood', n: 1, need: { plank: 14, iron_bar: 2 }, station: 'work' },
  { out: 'crate_gold', n: 1, need: { gold_bar: 10, plank: 20 }, station: 'forge' },
  // 문 — 널판 여덟에 경첩 한 벌.
  { out: 'door_wood', n: 1, need: { plank: 8, iron_bar: 1 }, station: 'work' },

  { out: 'rod_basic', n: 1, need: { wood: 10, spider_silk: 4 }, station: 'work' },
  { out: 'rod_adv', n: 1, need: { machine_frame: 1, motor: 2, mythril_bar: 4, spider_silk: 14, crystal: 6 }, station: 'work', lv: 3 },

  /* --- 바다 계통 (시설 4단계) --- */
  { out: 'pressure_plate_m', n: 2, need: { steel_plate: 3, crab_shell: 4, sea_salt: 2 }, station: 'forge', lv: 3 },
  { out: 'sea_salt', n: 3, need: { sand: 8 }, station: 'forge', lv: 2 },
  { out: 'abyss_core', n: 1, need: { abyss_pearl: 2, pressure_plate_m: 6, circuit: 4 }, station: 'work', lv: 3 },
  { out: 'rope_kelp', n: 4, need: { kelp: 6 }, station: null },
  /* 화약 계통 — 유황이 세션 3에서만 나오므로 폭탄도 자연히 그때 열린다 */
  { out: 'gunpowder', n: 4, need: { sulfur: 3, sea_salt: 2, coal: 2 }, station: 'work', lv: 2 },
  { out: 'bomb_small', n: 3, need: { gunpowder: 4, iron_bar: 1, rope_kelp: 1 }, station: 'work', lv: 2 },
  { out: 'bomb_big', n: 2, need: { gunpowder: 10, steel_plate: 2, rope_kelp: 1 }, station: 'work', lv: 3 },
  { out: 'bomb_dig', n: 3, need: { gunpowder: 8, pressure_plate_m: 1, rope_kelp: 2 }, station: 'work', lv: 3 },
  { out: 'tank_air', n: 1, need: { steel_plate: 8, pressure_plate_m: 4, kelp: 10 }, station: 'work', lv: 3 },
  { out: 'tank_deep', n: 1, need: { tank_air: 1, abyss_core: 1, pressure_plate_m: 12, jelly_lamp: 6 }, station: 'work', lv: 4 },
  { out: 'tank_abyss', n: 1, need: { tank_deep: 1, abyss_core: 3, keeper_seal: 1, abyss_pearl: 8 , glacium_bar: 6}, station: 'work', lv: 4 },
  { out: 'helm_diver', n: 1, need: { pressure_plate_m: 8, crab_shell: 10, jelly_lamp: 4 , glacium_bar: 2}, station: 'forge', lv: 4 },
  { out: 'chest_scale', n: 1, need: { pressure_plate_m: 14, crab_shell: 16, shark_tooth: 8 , glacium_bar: 4}, station: 'forge', lv: 4 },
  { out: 'boots_fin', n: 1, need: { pressure_plate_m: 6, kelp: 14, shark_tooth: 4 , tide_bar: 2}, station: 'forge', lv: 4 },
  { out: 'spear_tide', n: 1, need: { abyss_core: 1, mythril_bar: 8, shark_tooth: 10 , tide_bar: 3}, station: 'forge', lv: 4 },
  { out: 'blade_shark', n: 1, need: { shark_tooth: 18, steel_plate: 10, crab_shell: 6 , tide_bar: 3}, station: 'forge', lv: 4 },
  { out: 'bow_harpoon', n: 1, need: { abyss_core: 1, rope_kelp: 6, shark_tooth: 8 , tide_bar: 2}, station: 'work', lv: 4 },
  { out: 'orb_abyss', n: 1, need: { abyss_pearl: 3, jelly_lamp: 8, crystal: 12 , glacium_bar: 3}, station: 'work', lv: 4 },
  { out: 'ring_pearl', n: 1, need: { abyss_pearl: 2, gold_bar: 6, jelly_lamp: 4 , glacium_bar: 2}, station: 'work', lv: 4 },
  { out: 'charm_ink', n: 1, need: { ink_sac: 10, abyss_pearl: 1, spider_silk: 12 , tide_bar: 2}, station: 'work', lv: 4 },
  { out: 'm_pressor', n: 1, need: { abyss_core: 2, machine_frame: 2, motor: 4 , tide_bar: 4}, station: 'work', lv: 4 },
  { out: 'm_desal', n: 1, need: { abyss_core: 1, machine_frame: 1, pressure_plate_m: 10 , tide_bar: 3}, station: 'work', lv: 4 },
  { out: 'm_belt_f', n: 8, need: { steel_plate: 4, motor: 1, rope_kelp: 2 }, station: 'work', lv: 4 },
  { out: 'm_battery_hi', n: 1, need: { abyss_core: 1, battery_cell: 6, circuit: 8, steel_plate: 12 , glacium_bar: 4}, station: 'work', lv: 4 },
  { out: 'm_drill_x', n: 1, need: { m_drill_e: 1, abyss_core: 2, pressure_plate_m: 8, glacium_bar: 6, tide_bar: 4 }, station: 'work', lv: 4 },
  /* 4단계 전용 특별 장비 — 전부 심해 노심이 든다 */
  { out: 'bag_abyss', n: 1, need: { rope_kelp: 12, pressure_plate_m: 8, abyss_pearl: 2, spider_silk: 20 }, station: 'work', lv: 4 },
  /* 세션 3 광물 — 제련은 4단계 노(가압 제련로)라야 된다. */
  { out: 'glacium_bar', n: 1, need: { glacium_ore: 3, coal: 2 }, station: 'forge', lv: 4 },
  { out: 'tide_bar', n: 1, need: { tide_ore: 3, sea_salt: 2 }, station: 'forge', lv: 4 },
  /* 탐지기 — 광물 하나씩 갈라 쓴다. */
  { out: 'det_metal', n: 1, need: { glacium_bar: 4, circuit: 8, battery_cell: 2 }, station: 'work', lv: 4 },
  { out: 'det_mob', n: 1, need: { tide_bar: 4, circuit: 8, jelly_lamp: 6 }, station: 'work', lv: 4 },
  { out: 'pick_abyss', n: 1, need: { abyss_core: 1, mythril_bar: 10, battery_cell: 3 , glacium_bar: 5}, station: 'forge', lv: 4 },
  { out: 'hammer_tide', n: 1, need: { abyss_core: 2, mythril_bar: 14, shark_tooth: 12, pressure_plate_m: 8 , tide_bar: 5}, station: 'forge', lv: 4 },
  { out: 'gun_harpoon', n: 1, need: { abyss_core: 2, circuit: 14, mythril_bar: 10, battery_cell: 4 , glacium_bar: 4}, station: 'forge', lv: 4 },
  { out: 'tome_abyss', n: 1, need: { abyss_core: 1, abyss_pearl: 4, jelly_lamp: 10, crystal: 18 , glacium_bar: 3}, station: 'work', lv: 4 },
  { out: 'chest_abyss', n: 1, need: { abyss_core: 2, pressure_plate_m: 20, crab_shell: 20, mythril_bar: 8 }, station: 'forge', lv: 4 },
  { out: 'charm_core', n: 1, need: { abyss_core: 1, circuit: 12, gold_bar: 10, jelly_lamp: 6 }, station: 'work', lv: 4 },
  { out: 'sword_copper', n: 1, need: { copper_bar: 6, wood: 3 }, station: 'work' },
  { out: 'bow_copper', n: 1, need: { copper_bar: 4, wood: 8 }, station: 'work' },
  { out: 'pick_iron', n: 1, need: { iron_bar: 5, wood: 3 }, station: 'work' },
  { out: 'spear_reed', n: 1, need: { wood: 10, copper_bar: 3 }, station: 'work' },
  { out: 'orb_ember', n: 1, need: { copper_bar: 3, coal: 6 }, station: 'work' },
  { out: 'sword_iron', n: 1, need: { iron_bar: 10, bone_frag: 4 }, station: 'forge' },
  { out: 'bow_iron', n: 1, need: { iron_bar: 7, wood: 10 }, station: 'forge' },
  { out: 'staff_flame', n: 1, need: { copper_bar: 5, hell_ore: 2, crystal: 3 }, station: 'forge' },
  { out: 'staff_frost', n: 1, need: { iron_bar: 6, frost_core: 4, crystal: 5 }, station: 'forge' },
  { out: 'mace_iron', n: 1, need: { iron_bar: 12, bone_frag: 6 }, station: 'forge' },
  { out: 'crossbow_iron', n: 1, need: { iron_bar: 12, wood: 15 }, station: 'forge' },

  { out: 'helm_copper', n: 1, need: { copper_bar: 6 }, station: 'work' },
  { out: 'chest_copper', n: 1, need: { copper_bar: 10 }, station: 'work' },
  { out: 'boots_copper', n: 1, need: { copper_bar: 5 }, station: 'work' },
  { out: 'helm_iron', n: 1, need: { iron_bar: 8, slime_gel: 5 }, station: 'forge' },
  { out: 'chest_iron', n: 1, need: { iron_bar: 14, slime_gel: 8 }, station: 'forge' },
  { out: 'boots_iron', n: 1, need: { iron_bar: 7, slime_gel: 4 }, station: 'forge' },

  { out: 'pick_mythril', n: 1, need: { mythril_bar: 6, soul_shard: 4 }, station: 'forge' },
  { out: 'sword_mythril', n: 1, need: { mythril_bar: 12, corrupt_ess: 6 }, station: 'forge' },
  { out: 'staff_soul', n: 1, need: { mythril_bar: 8, soul_shard: 12, crystal: 8 }, station: 'forge' },
  { out: 'bow_storm', n: 1, need: { mythril_bar: 9, frost_core: 6, wood: 20 }, station: 'forge' },
  { out: 'crossbow_mythril', n: 1, need: { mythril_bar: 14, crystal: 10 }, station: 'forge' },
  { out: 'orb_storm', n: 1, need: { crystal: 20, frost_core: 10, mythril_bar: 8 }, station: 'forge' },
  { out: 'helm_mythril', n: 1, need: { mythril_bar: 10, frost_core: 5 }, station: 'forge' },
  { out: 'chest_mythril', n: 1, need: { mythril_bar: 16, frost_core: 8 }, station: 'forge' },
  { out: 'boots_mythril', n: 1, need: { mythril_bar: 9, frost_core: 4 }, station: 'forge' },

  { out: 'sword_dawn', n: 1, need: { mythril_bar: 20, hell_ore: 25, star_heart: 1 }, station: 'forge' },
  { out: 'helm_soul', n: 1, need: { soul_shard: 30, void_frag: 8, mythril_bar: 10 }, station: 'forge' },
  { out: 'chest_soul', n: 1, need: { soul_shard: 40, void_frag: 14, mythril_bar: 16 }, station: 'forge' },
  { out: 'boots_soul', n: 1, need: { soul_shard: 25, void_frag: 8, mythril_bar: 10 }, station: 'forge' },
  { out: 'scythe_void', n: 1, need: { void_frag: 30, soul_shard: 40, star_heart: 3 }, station: 'forge' },
  { out: 'bow_starfall', n: 1, need: { void_frag: 25, frost_core: 20, star_heart: 3 }, station: 'forge' },
  { out: 'staff_abyss', n: 1, need: { void_frag: 25, crystal: 30, star_heart: 3 }, station: 'forge' },

  { out: 'potion_hp_small', n: 3, need: { slime_gel: 3, wood: 1 }, station: 'work' },
  { out: 'potion_hp', n: 2, need: { slime_gel: 6, wood: 2, crystal: 2 }, station: 'work', lv: 2 },
  { out: 'potion_hp_greater', n: 1, need: { slime_gel: 10, crystal: 5, aether_shard: 2 }, station: 'work', lv: 3 },
  { out: 'potion_mp_small', n: 3, need: { crystal: 2, wood: 1 }, station: 'work' },
  { out: 'potion_mp', n: 2, need: { crystal: 6, wood: 2, slime_gel: 2 }, station: 'work', lv: 2 },
  { out: 'potion_mp_greater', n: 1, need: { crystal: 12, aether_shard: 2 }, station: 'work', lv: 3 },
  { out: 'potion_str', n: 2, need: { bone_frag: 4, slime_gel: 4 }, station: 'work' },
  { out: 'potion_str_greater', n: 1, need: { bone_frag: 8, slime_gel: 8, crystal: 2 }, station: 'work', lv: 2 },
  { out: 'potion_iron', n: 2, need: { iron_ore: 4, slime_gel: 4 }, station: 'work' },
  { out: 'potion_iron_greater', n: 1, need: { iron_ore: 8, slime_gel: 8, crystal: 2 }, station: 'work', lv: 2 },
  { out: 'charm_cloud', n: 1, need: { crystal: 10, frost_core: 3, soul_shard: 5 }, station: 'forge' },
  { out: 'charm_leech', n: 1, need: { corrupt_ess: 10, bone_frag: 15 }, station: 'forge' },

  { out: 'sum_slime', n: 1, need: { slime_gel: 25, copper_bar: 8 }, station: 'work' },
  { out: 'sum_bone', n: 1, need: { bone_frag: 30, iron_bar: 5 }, station: 'forge' },
  { out: 'sum_heart', n: 1, need: { corrupt_ess: 20, ebon_chunk: 15 }, station: 'forge' },
  { out: 'sum_frost', n: 1, need: { frost_core: 20, ice_shard: 40, mythril_bar: 4 }, station: 'forge' },
  { out: 'sum_tide', n: 1, need: { abyss_pearl: 6, abyss_core: 1, jelly_lamp: 12, sea_salt: 20 }, station: 'forge', lv: 4 },
  { out: 'sum_void', n: 1, need: { void_frag: 15, star_heart: 4, soul_shard: 30 }, station: 'forge' },

  /* --- 전리품 무기 --- */
  { out: 'bow_crow', n: 1, need: { ash_feather: 12, wood: 15 }, station: 'work' },
  { out: 'dagger_venom', n: 1, need: { venom_sting: 8, iron_bar: 4 }, station: 'forge' },
  { out: 'bow_silk', n: 1, need: { spider_silk: 15, iron_bar: 5, wood: 12 }, station: 'forge' },
  { out: 'axe_frost', n: 1, need: { ice_fang: 10, iron_bar: 10, frost_core: 3 }, station: 'forge' },
  { out: 'staff_moss', n: 1, need: { moss_core: 8, crystal: 6, wood: 15 }, station: 'forge' },
  { out: 'hammer_lava', n: 1, need: { lava_gel: 15, hell_ore: 20, mythril_bar: 6 }, station: 'forge' },
  { out: 'staff_archive', n: 1, need: { archive_seal: 10, aether_shard: 12, crystal: 20 }, station: 'forge' },
  { out: 'charm_prism', n: 1, need: { crystal_claw: 8, crystal: 20, gold_bar: 4 }, station: 'forge' },
  { out: 'charm_lamp', n: 1, need: { lost_lamp: 3, gold_bar: 5, crystal: 8 }, station: 'forge' },

  /* --- 가방 --- */
  { out: 'bag_pouch', n: 1, need: { spider_silk: 10, wood: 10 }, station: 'work' },
  { out: 'bag_satchel', n: 1, need: { iron_bar: 8, spider_silk: 15 }, station: 'forge' },
  { out: 'bag_pack', n: 1, need: { mythril_bar: 6, cloud_jelly: 10 }, station: 'forge' },
  { out: 'bag_vault', n: 1, need: { aether_shard: 20, ruin_brick: 30 }, station: 'forge' },

  /* --- 2부 --- */
  { out: 'charm_feather', n: 1, need: { sky_feather: 12, cloud_jelly: 10, soul_shard: 10 }, station: 'forge' },
  { out: 'sum_storm', n: 1, need: { sky_feather: 20, aether_shard: 10, skystone: 30 }, station: 'forge' },
  { out: 'sword_aether', n: 1, need: { aether_shard: 25, mythril_bar: 15, sky_feather: 15 }, station: 'forge' },
  { out: 'bow_gale', n: 1, need: { aether_shard: 20, sky_feather: 25, void_frag: 10 }, station: 'forge' },
  { out: 'staff_storm', n: 1, need: { aether_shard: 22, crystal: 25, sky_feather: 18 }, station: 'forge' },
  { out: 'helm_aether', n: 1, need: { aether_shard: 18, skystone: 25 }, station: 'forge' },
  { out: 'chest_aether', n: 1, need: { aether_shard: 28, skystone: 40 }, station: 'forge' },
  { out: 'boots_aether', n: 1, need: { aether_shard: 16, sky_feather: 20 }, station: 'forge' },
  { out: 'ruin_key', n: 1, need: { rune_frag: 3, aether_shard: 8 }, station: 'forge' },
  { out: 'charm_rune', n: 1, need: { rune_frag: 3, ruin_brick: 40, aether_shard: 15 }, station: 'forge' },
  { out: 'sword_first', n: 1, need: { aether_shard: 40, star_heart: 5, ruin_brick: 60 }, station: 'forge' },
  { out: 'crossbow_first', n: 1, need: { aether_shard: 35, star_heart: 4, ruin_brick: 50 }, station: 'forge' },
  { out: 'tome_first', n: 1, need: { aether_shard: 38, star_heart: 4, archive_seal: 20 }, station: 'forge' },
  /* 종장 — 다섯 조각을 하나로 되맞추고, 그것으로 쫓아오던 것을 부른다 */
  { out: 'star_whole', n: 1, need: { star_heart: 5, rune_frag: 3, aether_shard: 30 }, station: 'forge' },
  { out: 'sum_pursuer', n: 1, need: { star_whole: 1, void_frag: 25, ruin_brick: 40 }, station: 'forge' },
  /* 세션 2 — 공창에서 배워 온 것들. */
  { out: 'gear_basic', n: 4, need: { steel_plate: 3, iron_bar: 2 }, station: 'forge' },
  /* 개조된 것에서 나온 녹슨 톱니를 쓸 데. */
  { out: 'gear_basic', n: 1, need: { rust_gear: 4 }, station: 'forge' },
  { out: 'pick_drill', n: 1, need: { blueprint_core: 1, power_core: 12, gear_basic: 20, mythril_bar: 10 }, station: 'forge' },

  /* ========== 용광로 ========== */
  { out: 'lead_bar', n: 1, need: { lead_ore: 3 }, station: 'forge' },
  /* 고로(Lv2) — 강철판을 직접 뽑고, 원유를 조잡하게나마 쪼갠다 */
  { out: 'steel_plate', n: 1, need: { iron_bar: 2, coal: 2 }, station: 'forge', lv: 2 },
  { out: 'refined_oil', n: 1, need: { crude_oil: 3, coal: 2 }, station: 'forge', lv: 2 },
  { out: 'polymer', n: 1, need: { crude_oil: 2, coal: 1 }, station: 'forge', lv: 2 },
  /* 아크 용광로(Lv3) — 동력 장비 계통 */
  { out: 'pick_arc', n: 1, need: { machine_frame: 1, motor: 2, mythril_bar: 8, battery_cell: 2 }, station: 'forge', lv: 3 },
  { out: 'saw_auto', n: 1, need: { motor: 2, steel_plate: 14, circuit: 4 }, station: 'forge', lv: 3 },
  { out: 'gun_rail', n: 1, need: { machine_frame: 2, circuit: 10, mythril_bar: 10, battery_cell: 4 }, station: 'forge', lv: 3 },
  { out: 'helm_exo', n: 1, need: { steel_plate: 16, circuit: 5, polymer: 8 }, station: 'forge', lv: 3 },
  { out: 'chest_exo', n: 1, need: { machine_frame: 1, steel_plate: 24, motor: 2, polymer: 12 }, station: 'forge', lv: 3 },
  { out: 'boots_exo', n: 1, need: { steel_plate: 14, motor: 1, polymer: 8 }, station: 'forge', lv: 3 },
  { out: 'charm_cap', n: 1, need: { circuit: 8, battery_cell: 4, gold_bar: 6 }, station: 'forge', lv: 3 },

  /* ========== 작업대 ========== */
  /* 정밀 작업대(Lv2) — 1세대 공장. */
  { out: 'm_belt', n: 4, need: { iron_bar: 1, gear_basic: 1 }, station: 'work', lv: 2 },
  { out: 'm_pole', n: 2, need: { wood: 6, copper_bar: 1 }, station: 'work', lv: 2 },
  { out: 'm_crate', n: 1, need: { plank: 20, iron_bar: 4 }, station: 'work', lv: 2 },
  { out: 'm_drill', n: 1, need: { gear_basic: 6, iron_bar: 8, steel_plate: 2 }, station: 'work', lv: 2 },
  { out: 'm_smelter', n: 1, need: { brick: 20, iron_bar: 10, gear_basic: 4 }, station: 'work', lv: 2 },
  { out: 'm_gen', n: 1, need: { iron_bar: 12, gear_basic: 8, copper_bar: 10 }, station: 'work', lv: 2 },
  { out: 'fuel_brick', n: 1, need: { coal: 6 }, station: 'work', lv: 2 },
  { out: 'wire', n: 4, need: { copper_bar: 1, polymer: 1 }, station: 'work', lv: 2 },
  { out: 'circuit', n: 1, need: { wire: 3, gold_bar: 1 }, station: 'work', lv: 2 },
  /* 전동기는 Lv3 승급 비용에 들어가므로 반드시 Lv2에서 만들 수 있어야 한다 — Lv3에 두면 "전동기를 만들려면 Lv3, Lv3이 되려면 전동기"로 서로 잠긴다 */
  { out: 'motor', n: 1, need: { circuit: 1, gear_basic: 2, steel_plate: 1 }, station: 'work', lv: 2 },
  /* 자동 조립대(Lv3) — 2세대 공장. */
  { out: 'machine_frame', n: 1, need: { motor: 1, circuit: 2, steel_plate: 4 }, station: 'work', lv: 3 },
  { out: 'battery_empty', n: 1, need: { lead_bar: 2, polymer: 1, refined_oil: 1 }, station: 'work', lv: 3 },
  { out: 'm_drill_e', n: 1, need: { machine_frame: 1, motor: 2, circuit: 4 }, station: 'work', lv: 3 },
  { out: 'm_pump', n: 1, need: { machine_frame: 1, motor: 1, steel_plate: 10 }, station: 'work', lv: 3 },
  { out: 'm_press', n: 1, need: { machine_frame: 1, motor: 1, steel_plate: 8 }, station: 'work', lv: 3 },
  { out: 'm_refinery', n: 1, need: { machine_frame: 1, motor: 2, wire: 12 }, station: 'work', lv: 3 },
  { out: 'm_assembler', n: 1, need: { machine_frame: 2, motor: 2, circuit: 6 }, station: 'work', lv: 3 },
  { out: 'm_battery', n: 1, need: { lead_bar: 12, circuit: 6, wire: 20 }, station: 'work', lv: 3 },
  { out: 'm_sorter', n: 1, need: { circuit: 3, wire: 8, gear_basic: 4 }, station: 'work', lv: 3 },
  { out: 'm_turret', n: 1, need: { machine_frame: 1, motor: 1, circuit: 4, steel_plate: 12 }, station: 'work', lv: 3 },
  { out: 'm_trap', n: 1, need: { circuit: 2, wire: 10, lead_bar: 6 }, station: 'work', lv: 3 },
  { out: 'm_switch', n: 1, need: { circuit: 1, wire: 4, iron_bar: 4 }, station: 'work', lv: 3 },
  { out: 'rivet', n: 12, need: { steel_plate: 1 }, station: 'work', lv: 3 },

  /* ========== 마을 ========== */
  /* 건축·장식은 문턱을 낮게 뒀다 — 꾸미는 걸 재료 걱정 없이 하게 하려고 */
  { out: 'thatch', n: 4, need: { weed: 2, wood: 1 } },
  { out: 'fence', n: 4, need: { wood: 2 } },
  { out: 'timberwall', n: 4, need: { plank: 2, stone: 1 }, station: 'work' },
  { out: 'window', n: 2, need: { crystal: 1, plank: 2 }, station: 'work' },
  { out: 'banner', n: 2, need: { spider_silk: 2, wood: 1 }, station: 'work' },
  { out: 'haybale', n: 2, need: { weed: 6 }, station: 'work' },
  { out: 'sandbag', n: 4, need: { sand: 6, spider_silk: 1 }, station: 'work' },
  { out: 'hoe_iron', n: 1, need: { iron_bar: 3, wood: 2 }, station: 'work' },
  /* 낫 — 다 여문 작물을 성하게 거두는 유일한 연장. */
  { out: 'scythe_iron', n: 1, need: { iron_bar: 3, wood: 2 }, station: 'work' },
  { out: 'scythe_star', n: 1, need: { mythril_bar: 4, aether_shard: 6, wood: 4 }, station: 'forge', lv: 2 },
  { out: 'lamppost', n: 2, need: { iron_bar: 1, torch: 2, crystal: 1 }, station: 'work' },
  { out: 'rooftile', n: 4, need: { brick: 2, stone: 2 }, station: 'forge' },
  { out: 'wallstone', n: 4, need: { stone: 6, brick: 2 }, station: 'forge' },
  { out: 'battlement', n: 2, need: { wallstone: 3, iron_bar: 1 }, station: 'forge' },
  /* 마을 설비 — 화덕은 전기가 필요 없어 정밀 작업대 단계에서 바로 세울 수 있다 */
  { out: 'm_oven', n: 1, need: { brick: 24, iron_bar: 6, stone: 20 }, station: 'work', lv: 2 },
  { out: 'm_windmill', n: 1, need: { plank: 30, gear_basic: 10, spider_silk: 12, iron_bar: 8 }, station: 'work', lv: 2 },
  { out: 'm_mill', n: 1, need: { gear_basic: 8, stone: 30, iron_bar: 10, circuit: 2 }, station: 'work', lv: 3 },
  /* 씨앗은 처음 한 번만 사서 시작하면 되도록, 수확할 때 씨앗이 함께 나온다 */
  { out: 'seed_wheat', n: 4, need: { wheat: 1 } },
  { out: 'seed_starroot', n: 4, need: { starroot: 1 } },
  { out: 'seed_ashcap', n: 4, need: { mushroom: 2 } },
  /* --- 전리품으로만 씨를 얻는 작물 넷 --- */
  { out: 'seed_bloodbean', n: 3, need: { slime_gel: 5, spider_silk: 2 }, station: 'work' },
  { out: 'seed_bonebloom', n: 3, need: { bone_frag: 5, ash_feather: 2 }, station: 'work' },
  { out: 'seed_frostherb', n: 3, need: { ice_fang: 3, frost_core: 1 }, station: 'work' },
  { out: 'seed_emberpod', n: 3, need: { lava_gel: 3, crystal_claw: 2 }, station: 'work' },
  /* 거둔 것의 쓸모. */
  { out: 'potion_hp', n: 3, need: { bonebloom: 2, wildflower: 2 }, station: 'work' },
  { out: 'potion_hp_greater', n: 1, need: { bonebloom: 8, crystal: 3 }, station: 'work', lv: 2 },
  { out: 'potion_iron', n: 2, need: { frostherb: 3, ice_shard: 2 }, station: 'work' },
  { out: 'torch', n: 8, need: { emberpod: 1, wood: 2 } },
  { out: 'fuel_brick', n: 2, need: { emberpod: 3 }, station: 'work' },
  /* 화덕이 없어도 최소한의 요리는 되게 (밀가루만 있으면 빵) */
  { out: 'flour', n: 1, need: { wheat: 4 }, station: 'work' },
  { out: 'food_bread', n: 1, need: { flour: 3 }, station: 'work' },
  /* 물에서만 나오는 것의 쓸모 — 낚시가 "팔 것만 나오는 일"로 끝나지 않게 */
  { out: 'battery_empty', n: 1, need: { drowned_cell: 2, wire: 2 }, station: 'work', lv: 2 },
  { out: 'rivet', n: 12, need: { rust_sinker: 2 }, station: 'work', lv: 2 },
  { out: 'chest_river', n: 1, need: { river_scale: 14, tide_pearl: 4, spider_silk: 10 }, station: 'forge' },

  /* ========== 바이옴 ========== */
  { out: 'potion_glow', n: 2, need: { glowcap: 2, crystal: 1 }, station: 'work' },
  { out: 'potion_glow_greater', n: 1, need: { glowcap: 6, crystal: 4 }, station: 'work', lv: 2 },
  { out: 'food_curry', n: 1, need: { fern_frond: 4, raw_meat: 2, flour: 1 }, station: 'work' },
  { out: 'charm_canopy', n: 1, need: { vine_coil: 10, orchid: 6, spider_silk: 12 }, station: 'forge' },
  { out: 'charm_spore', n: 1, need: { spore_sac: 10, glowcap: 12, crystal: 8 }, station: 'forge' },
  /* 맥박을 손으로 움직이는 두 가지 — 결정은 깨어난 유적에서만 나오므로, 한 번 격노를 견뎌 낸 사람만 이것으로 다음 유적의 맥박을 고른다. */
  { out: 'tonic_hush', n: 2, need: { pulse_shard: 1, mushroom: 3 }, station: 'work' },
  { out: 'moss_poultice', n: 2, need: { cave_moss: 4, mushroom: 1 }, station: 'work' },
  { out: 'drum_pulse', n: 1, need: { pulse_shard: 1, wood: 6 }, station: 'work' },

  /* ========== 폭주로 ========== */
  { out: 'sword_arc', n: 1, need: { core_shard: 20, machine_frame: 3, mythril_bar: 10, battery_cell: 5 }, station: 'forge', lv: 3 },
  { out: 'stop_core', n: 1, need: { core_shard: 25, circuit: 20, machine_frame: 4, power_core: 20 }, station: 'work', lv: 3 },
  { out: 'hammer_still', n: 1, need: { hepha_heart: 1, stop_core: 1, mythril_bar: 20, steel_plate: 30 }, station: 'forge', lv: 3 },
  { out: 'charm_govern', n: 1, need: { hepha_heart: 1, circuit: 20, battery_cell: 6, aether_shard: 20 }, station: 'forge', lv: 3 },
  /* --- 세션 2 종장: 설계실 --- */
  { out: 'atelier_key', n: 1, need: { hepha_heart: 1, stop_core: 1, blueprint_core: 1, core_shard: 40 }, station: 'forge', lv: 3 },
  { out: 'archestone', n: 4, need: { draft_glass: 1, stone: 6 }, station: 'forge', lv: 3 },
  { out: 'blade_arche', n: 1, need: { arche_core: 1, draft_glass: 30, mythril_bar: 24, aether_shard: 30 }, station: 'forge', lv: 3 },
  { out: 'tome_origin', n: 1, need: { arche_core: 1, draft_glass: 30, soul_shard: 40, crystal: 30 }, station: 'forge', lv: 3 },
  { out: 'charm_maker', n: 1, need: { arche_core: 1, proto_ash: 25, draft_glass: 20, gold_bar: 15 }, station: 'forge', lv: 3 },

  /* --- 특별 유적 전리품으로 만드는 것들 --- */
  { out: 'bow_meridian', n: 1, need: { void_lens: 2, orbit_gear: 30, sky_feather: 40, aether_shard: 30 }, station: 'forge', lv: 3 },
  { out: 'charm_orbit', n: 1, need: { star_ash: 2, orbit_gear: 25, cloud_jelly: 20, mythril_bar: 15 }, station: 'forge', lv: 3 },
  { out: 'drill_abyss', n: 1, need: { deep_alloy: 30, gloom_pearl: 2, machine_frame: 2, motor: 3, battery_cell: 4 }, station: 'forge', lv: 3 },
  { out: 'charm_lamp2', n: 1, need: { miner_tag: 3, lost_lamp: 5, deep_alloy: 20, gold_bar: 10 }, station: 'forge', lv: 3 },
  { out: 'orbit_plate', n: 4, need: { orbit_gear: 1, steel_plate: 4 }, station: 'forge', lv: 3 },

  /* --- 제트팩 --- */
  { out: 'jetpack', n: 1, need: {
      orbit_gear: 40, star_ash: 3, deep_alloy: 35, gloom_pearl: 2,
      machine_frame: 3, motor: 4, circuit: 20, battery_cell: 6, polymer: 20
    }, station: 'work', lv: 3 }
];

/* ---------------- 연료 ---------------- */
export const FUEL = { wood: 16, plank: 20, ash: 8, coal: 90, fuel_brick: 560, crude_oil: 150, refined_oil: 640 };

/* ---------------- 기계 ---------------- */
export const MACHINE = {
  belt: {
    n: '컨베이어 벨트', tile: T.M_BELT, item: 'm_belt', rot: 1,
    d: '아이템을 1초에 한 칸씩 앞으로 나른다. 동력이 필요 없다. 앞이 막히면 그 자리에서 기다린다.'
  },
  pole: {
    n: '전주', tile: T.M_POLE, item: 'm_pole', reach: 5,
    d: '반경 5칸 안의 기계를 전력망에 넣는다. 전주끼리는 10칸 안에서 서로 이어져 하나의 망이 된다.'
  },
  crate: {
    n: '수집 상자', tile: T.M_CRATE, item: 'm_crate', slots: 24, rot: 1, feed: 1,
    d: '24칸 창고. 「배출」을 켜면 앞쪽으로 내용물을 한 개씩 흘려보낸다 — 공장에 재료를 먹이는 입구가 된다.'
  },
  gen: {
    n: '화력 발전기', tile: T.M_GEN, item: 'm_gen', fuelIn: 1, gen: 60, cap: 40,
    d: '연료를 태워 전력망에 전기를 낸다. 전주 반경 안에 있어야 망에 이어진다.'
  },
  battery: {
    n: '축전지', tile: T.M_BATTERY, item: 'm_battery', store: 3000, proc: 'battery', power: 6, cap: 40,
    d: '남는 전기를 담아 두었다가 모자랄 때 내놓는다. 방전된 배터리를 넣어 두면 충전해 준다.'
  },
  drill: {
    n: '기계식 드릴', tile: T.M_DRILL, item: 'm_drill', fuelIn: 1, rot: 1, mine: 2, cycle: 26, range: 5, cap: 40,
    d: '연료를 태워 반경 5칸의 광맥을 스스로 캔다(채굴 등급 2 — 석탄·구리·철·납·금·미스릴·유혈암). 광맥 한 칸에서 스무 번 넘게 캐고, 광상은 마르지 않는다.'
  },
  drill_e: {
    n: '전동 드릴', tile: T.M_DRILL_E, item: 'm_drill_e', power: 22, rot: 1, mine: 3, cycle: 9, range: 7, cap: 60,
    d: '전력으로 도는 드릴. 기계식보다 세 배 빠르고 반경도 넓다(채굴 등급 3 — 영혼석·지옥석·에테르·동력석·운석과 금·미스릴 광상까지). 등급 4 넘는 것(세션 3 광석·유적 유리)은 못 캔다.'
  },
  drill_x: {
    n: '심층 드릴', tile: T.M_DRILL_X, item: 'm_drill_x', power: 40, rot: 1, mine: 5, cycle: 6, range: 8, cap: 80,
    d: '가압판으로 감싼 전동 드릴의 윗단. 채굴 등급 5 — 빙정석·조수석 같은 세션 3 광석과 노심·설계 유리까지 캔다. 전동 드릴보다 빠르고 반경이 넓지만 전기를 두 배 가까이 먹는다.'
  },
  pump: {
    n: '시추 펌프', tile: T.M_PUMP, item: 'm_pump', power: 16, rot: 1, cycle: 14, range: 4, cap: 60,
    d: '반경 4칸에 유혈암이 있으면 원유를 뽑는다. 유혈암을 소모하지 않아 마르지 않는다.'
  },
  smelter: {
    n: '자동 용광로', tile: T.M_SMELTER, item: 'm_smelter', fuelIn: 1, rot: 1, proc: 'smelter', cap: 40,
    d: '연료를 태워 광석을 주괴로 녹인다. 전기가 없어도 도는 1세대 설비다.'
  },
  press: {
    n: '압축기', tile: T.M_PRESS, item: 'm_press', power: 20, rot: 1, proc: 'press', cap: 40,
    d: '눌러서 밀도를 올린다. 석탄을 압축 연료로, 주괴를 강철판으로.'
  },
  refinery: {
    n: '정제기', tile: T.M_REFINERY, item: 'm_refinery', power: 28, rot: 1, proc: 'refinery', cap: 40,
    d: '원유를 정제유와 합성수지로 쪼갠다. 손으로 하는 것보다 세 배는 남는다.'
  },
  assembler: {
    n: '조립기', tile: T.M_ASSEMBLER, item: 'm_assembler', power: 26, rot: 1, proc: 'assembler', cap: 40,
    d: '부품을 맞춰 붙인다. 넣어 준 재료로 만들 수 있는 것을 알아서 골라 만든다.'
  },
  sorter: {
    n: '분류기', tile: T.M_SORTER, item: 'm_sorter', power: 3, rot: 1, filter: 1,
    d: '지정한 아이템만 앞으로 보내고, 나머지는 시계 방향 옆으로 흘린다. 섞인 광석 줄기를 가른다.'
  },
  turret: {
    n: '자동 포탑', tile: T.M_TURRET, item: 'm_turret', power: 14, ammo: 'rivet', cap: 200, range: 340, cycle: 5, dmg: 46,
    d: '대갈못을 먹고 사거리 안의 적을 알아서 쏜다. 벨트로 탄약을 물려 두면 손이 갈 일이 없다.'
  },
  trap: {
    n: '전격 함정', tile: T.M_TRAP, item: 'm_trap', power: 10, dmg: 40,
    d: '위에 올라선 적을 지진다. 플레이어는 감전되지 않는다.'
  },
  switch: {
    n: '정지 스위치', tile: T.M_SWITCH, item: 'm_switch',
    d: '이어진 전력망 전체를 한 번에 멈추고 다시 돌린다. 공장을 세우면 가장 먼저 달아 둘 물건이다.'
  },
  /* --- 유적 함정 --- */
  dart: {
    n: '화살 발사기', tile: T.M_DART, item: 'm_dart', rot: 1, cycle: 13, range: 10, dmg: 26, proj: 'arrow',
    d: '정면 10칸 안에 무언가 들어오면 화살을 쏜다. 동력이 필요 없다.'
  },
  flamejet: {
    n: '화염 분사구', tile: T.M_FLAME, item: 'm_flame', rot: 1, cycle: 16, range: 6, dmg: 34, proj: 'fire', burn: 1,
    d: '가까이 붙은 것을 태운다. 사거리는 짧지만 화상이 남는다.'
  },
  frostjet: {
    n: '서리 분사구', tile: T.M_FROST, item: 'm_frost', rot: 1, cycle: 19, range: 8, dmg: 20, proj: 'frost', slow: 1,
    d: '맞은 것은 한동안 느려진다. 좁은 통로에 걸어 두면 무섭다.'
  },
  /* --- 4단계 설비 --- */
  pressor: {
    n: '가압기', tile: T.M_PRESSOR, item: 'm_pressor', power: 34, rot: 1, proc: 'pressor', cap: 40,
    d: '압축기보다 한참 센 힘으로 누른다. 내압판과 심해 노심은 여기서만 나온다.'
  },
  desal: {
    n: '염수 증류기', tile: T.M_DESAL, item: 'm_desal', power: 20, rot: 1, proc: 'desal', cap: 60,
    d: '해저 모래와 해초를 졸여 소금·밧줄을 뽑는다.'
  },
  belt_fast: {
    n: '고속 컨베이어 벨트', tile: T.M_BELT_F, item: 'm_belt_f', rot: 1, fast: 1,
    d: '1초에 두 칸을 나른다. 일반 벨트와 섞어 깔아도 되고, 병목이 생기는 구간만 갈아 끼워도 된다.'
  },
  battery_hi: {
    n: '강화 축전지', tile: T.M_BATTERY_HI, item: 'm_battery_hi', store: 14000, proc: 'battery', power: 6, cap: 60,
    d: '축전지 네 대 몫을 한 칸에 담는다. 해가 지고 바람이 멎어도 공장이 안 선다.'
  },

  /* --- 마을 --- */
  windmill: {
    n: '풍차', tile: T.M_WINDMILL, item: 'm_windmill', gen: 26, sky: 14,
    d: '연료 없이 도는 대신, 위로 14칸이 하늘까지 트여 있어야 한다. 마을 지붕 위가 제자리다.'
  },
  mill: {
    n: '밀링기', tile: T.M_MILL, item: 'm_mill', power: 12, rot: 1, proc: 'mill', cap: 40,
    d: '곡물을 가루로 빻는다. 뼛조각을 넣으면 퇴비가 나온다.'
  },
  oven: {
    n: '화덕', tile: T.M_OVEN, item: 'm_oven', fuelIn: 1, rot: 1, proc: 'oven', cap: 40,
    d: '장작을 때서 요리한다. 전기가 없어도 돌아가서, 마을에 제일 먼저 서는 설비다.'
  }
};

/* ---------------- 기계 제작법 ---------------- */
export const MRECIPES = [
  /* 자동 용광로 — 연료 */
  { m: 'smelter', in: { copper_ore: 2 }, out: { copper_bar: 1 }, t: 16 },
  { m: 'smelter', in: { iron_ore: 2 }, out: { iron_bar: 1 }, t: 18 },
  { m: 'smelter', in: { lead_ore: 2 }, out: { lead_bar: 1 }, t: 18 },
  { m: 'smelter', in: { gold_ore: 2 }, out: { gold_bar: 1 }, t: 24 },
  { m: 'smelter', in: { mythril_ore: 3, soul_shard: 1 }, out: { mythril_bar: 1 }, t: 40 },
  /* 압축기 — 전력 */
  { m: 'press', in: { coal: 5 }, out: { fuel_brick: 1 }, t: 20 },
  { m: 'press', in: { iron_bar: 2 }, out: { steel_plate: 1 }, t: 24 },
  { m: 'press', in: { stone: 6 }, out: { brick: 4 }, t: 10 },
  /* 정제기 — 전력 */
  { m: 'refinery', in: { crude_oil: 3 }, out: { refined_oil: 2, polymer: 1 }, t: 26 },
  /* 조립기 — 전력 */
  { m: 'assembler', in: { copper_bar: 1, polymer: 1 }, out: { wire: 4 }, t: 14 },
  { m: 'assembler', in: { wire: 3, gold_bar: 1 }, out: { circuit: 1 }, t: 20 },
  { m: 'assembler', in: { iron_bar: 1, steel_plate: 1 }, out: { gear_basic: 2 }, t: 16 },
  { m: 'assembler', in: { circuit: 1, gear_basic: 2, steel_plate: 1 }, out: { motor: 1 }, t: 26 },
  { m: 'assembler', in: { motor: 1, circuit: 2, steel_plate: 4 }, out: { machine_frame: 1 }, t: 34 },
  /* 가압기 — 4단계. */
  { m: 'pressor', in: { steel_plate: 3, crab_shell: 4, sea_salt: 2 }, out: { pressure_plate_m: 2 }, t: 30 },
  { m: 'pressor', in: { abyss_pearl: 2, pressure_plate_m: 6, circuit: 4 }, out: { abyss_core: 1 }, t: 52 },
  { m: 'pressor', in: { mythril_ore: 4 }, out: { mythril_bar: 2 }, t: 36 },
  /* 염수 증류기 — 바다에서 퍼 온 것을 뭍에서 쓸 수 있게 되돌린다 */
  { m: 'desal', in: { sand: 8 }, out: { sea_salt: 3 }, t: 16 },
  { m: 'desal', in: { kelp: 6 }, out: { rope_kelp: 4 }, t: 14 },
  { m: 'desal', in: { ink_sac: 2 }, out: { crude_oil: 3 }, t: 20 },
  { m: 'assembler', in: { lead_bar: 2, polymer: 1, refined_oil: 1 }, out: { battery_empty: 1 }, t: 24 },
  { m: 'assembler', in: { steel_plate: 1 }, out: { rivet: 12 }, t: 12 },
  /* 축전지 — 전력. */
  { m: 'battery', in: { battery_empty: 1 }, out: { battery_cell: 1 }, t: 48 },
  /* 밀링기 — 전력 */
  { m: 'mill', in: { wheat: 3 }, out: { flour: 2 }, t: 14 },
  { m: 'mill', in: { starroot: 3 }, out: { flour: 1, fertilizer: 1 }, t: 16 },
  { m: 'mill', in: { bone_frag: 5 }, out: { fertilizer: 3 }, t: 16 },
  { m: 'mill', in: { weed: 6 }, out: { fertilizer: 2 }, t: 12 },
  { m: 'mill', in: { leaf_oak: 8 }, out: { fertilizer: 2 }, t: 12 },
  { m: 'mill', in: { leaf_pine: 8 }, out: { fertilizer: 2 }, t: 12 },
  { m: 'mill', in: { leaf_jungle: 8 }, out: { fertilizer: 2 }, t: 12 },
  { m: 'mill', in: { leaf_corrupt: 8 }, out: { fertilizer: 2 }, t: 12 },
  { m: 'mill', in: { leaf_sky: 8 }, out: { fertilizer: 2 }, t: 12 },
  { m: 'mill', in: { leaf_palm: 8 }, out: { fertilizer: 2 }, t: 12 },
  /* 화덕 — 연료. */
  { m: 'oven', in: { flour: 2 }, out: { food_bread: 1 }, t: 20 },
  { m: 'oven', in: { flour: 2, raw_meat: 2 }, out: { food_pie: 1 }, t: 28 },
  { m: 'oven', in: { mushroom: 3, flour: 1 }, out: { food_mstew: 1 }, t: 24 },
  { m: 'oven', in: { starroot: 3 }, out: { food_soup: 1 }, t: 22 },
  { m: 'oven', in: { wildflower: 4 }, out: { food_tea: 2 }, t: 18 },
  { m: 'oven', in: { cactus_flesh: 3, flour: 1 }, out: { food_jelly: 2 }, t: 20 },
  { m: 'oven', in: { food_bread: 1, food_pie: 1, food_soup: 1 }, out: { food_feast: 1 }, t: 60 },
  /* 전리품 작물 넷. */
  { m: 'oven', in: { bloodbean: 3, flour: 1 }, out: { food_pie: 2 }, t: 26 },
  { m: 'oven', in: { frostherb: 3 }, out: { food_tea: 2 }, t: 18 },
  { m: 'oven', in: { bloodbean: 2, frostherb: 2, mushroom: 2 }, out: { food_curry: 1 }, t: 30 },
  { m: 'mill', in: { bonebloom: 3 }, out: { fertilizer: 4 }, t: 14 },
  { m: 'mill', in: { emberpod: 4 }, out: { fuel_brick: 2 }, t: 16 }
];

/* 공장 재화 — 전력 설비(압축기·정제기·조립기)에서만 나오는 물건들. */
export const FACTORY_LINES = new Set(['press', 'refinery', 'assembler', 'pressor', 'desal']);
export const FACTORY_GOODS = new Set();
for (const r of MRECIPES) if (FACTORY_LINES.has(r.m)) for (const k in r.out) FACTORY_GOODS.add(k);

/* 값 배수 — price()가 종류별 기본값을 낸 뒤 여기서 한 번 곱한다. */
export const PRICE_MUL = { machine: 4.5, station: 4.5, weapon: 1 };
export const PRICE_MUL_DEFAULT = 1.75;
export const FACTORY_PRICE_MUL = 4.5;

/* ---------------- 값의 티어 가중 ---------------- */
export const PRICE_BASE_MUL = 2.2;
export const PRICE_TIER_STEP = 1.30;
/* 재료의 티어 — 재료에는 tier도 lvReq도 없다. */
export const MAT_TIER = {
  coal: 0, copper_bar: 1, gear_basic: 1, bone_frag: 1, spider_silk: 2,
  iron_bar: 2, crystal: 3, gold_bar: 3, circuit: 3, motor: 3, steel_plate: 3,
  soul_shard: 4, hell_ore: 4, power_core: 4, battery_cell: 4,
  kelp: 4, rope_kelp: 4, sea_salt: 4, sulfur: 4,
  mythril_bar: 5, machine_frame: 5, gunpowder: 5, crab_shell: 5, jelly_lamp: 5, ink_sac: 5,
  aether_shard: 6, deep_alloy: 6, pressure_plate_m: 6, shark_tooth: 6,
  miner_tag: 6, lost_lamp: 6,
  orbit_gear: 7, orbit_plate: 7, gloom_pearl: 7, abyss_pearl: 7,
  star_ash: 8, void_lens: 8, abyss_core: 8, keeper_seal: 8,
  glacium_ore: 7, tide_ore: 7, glacium_bar: 8, tide_bar: 8,
  meteorite: 6, star_crystal: 7, storm_amber: 7, cloud_pearl: 7
};
export function priceTier(d, id) {
  if (d.tier !== undefined) return clamp(d.tier, 0, 12);
  if (d.lvReq) return clamp(Math.round(d.lvReq / 4), 0, 12);
  if (id && MAT_TIER[id] !== undefined) return MAT_TIER[id];
  return clamp(Math.round(Math.log2(Math.max(1, d.price || 12) / 10)), 0, 12);
}
export function priceTierMulOf(d, id) { return PRICE_BASE_MUL * Math.pow(PRICE_TIER_STEP, priceTier(d, id)); }
