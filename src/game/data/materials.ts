/* ===== data/materials.js — 재질 · 빛 · 유체 · 장식 · 몹 재질 ===== */
import { T, TILE_DEF } from '../data.js';
import { ITEMS } from './items.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* c 파편 색 셋(밝은 쪽→어두운 쪽) · n 기본 개수 · g 중력 배수(음수면 위로 뜬다) life 사는 시간(초) · sq 1이면 네모(돌·쇠·유리) 0이면 동그라미(살·젤·연기) glow
   1이면 — 사연: docs/code-history.md#h10 */
export const MAT = {
  stone: { c: ['#9a9aa0', '#6a6a70', '#4a4a50'], n: 9, g: 1.0, life: .50, sq: 1, hit: 'hit_stone', brk: 'break_stone' },
  dirt:  { c: ['#8a6a44', '#5d4429', '#40301d'], n: 8, g: 1.25, life: .36, sq: 1, hit: 'hit_stone', brk: 'break_dirt' },
  wood:  { c: ['#a67a44', '#77542d', '#523a1e'], n: 8, g: .95, life: .55, sq: 1, hit: 'hit_wood', brk: 'break_wood' },
  plant: { c: ['#94c46a', '#5a9a3a', '#376d24'], n: 10, g: .55, life: .70, sq: 0, hit: 'hit_plant', brk: 'break_plant' },
  metal: { c: ['#c8d2de', '#8792a0', '#57616d'], n: 7, g: 1.15, life: .45, sq: 1, hit: 'hit_metal', brk: 'break_metal' },
  glass: { c: ['#e8f8ff', '#9fd8ec', '#6aa8c0'], n: 12, g: 1.0, life: .50, sq: 1, hit: 'hit_glass', brk: 'break_glass' },
  ice:   { c: ['#eaf6ff', '#a8d8ff', '#6fa8d8'], n: 11, g: 1.0, life: .48, sq: 1, hit: 'hit_glass', brk: 'break_ice' },
  ember: { c: ['#ffe6a0', '#ff9a3c', '#e0561c'], n: 12, g: -.30, life: .60, sq: 0, glow: 1, hit: 'hit_ember', brk: 'break_ember' },
  bone:  { c: ['#f2ecd8', '#c6bda6', '#8e8574'], n: 10, g: 1.0, life: .55, sq: 1, hit: 'hit_bone', brk: 'break_bone' },
  gel:   { c: ['#d8f0dc', '#8ac49a', '#4f8a5e'], n: 12, g: .85, life: .42, sq: 0, hit: 'hit_gel', brk: 'break_flesh' },
  flesh: { c: ['#e07a6a', '#b8484a', '#7a2c2e'], n: 10, g: 1.10, life: .42, sq: 0, hit: 'hit_flesh', brk: 'break_flesh' },
  void:  { c: ['#d8c0ff', '#a06fff', '#5a3a86'], n: 12, g: -.20, life: .78, sq: 0, glow: 1, hit: 'hit_void', brk: 'break_void' },
};
export const MAT_DEF = 'stone';

/* 타일·기계의 재질. */
export const TILE_MAT = (() => {
  const m = {};
  const put = (mat, keys) => keys.split(' ').forEach(k => {
    if (T[k] === undefined) return;      // 오타는 조용히 넘긴다(표가 시트보다 앞설 수 있다)
    m[T[k]] = mat;
  });
  put('dirt', 'DIRT GRASS SAND MUD ASH FARMLAND SANDBAG CLOUD SKYGRASS');
  put('ice', 'SNOW ICE ICEBRICK FROSTGLYPH ICEBANNER');
  put('wood', 'WOOD PLANK PLATFORM TIMBERWALL FENCE THATCH HAYBALE MINEWOOD BANNER TORCH');
  put('plant', 'LEAF CORRUPTLEAF SKYLEAF JUNGLELEAF GLOWLEAF PINELEAF VINE WEED FLOWER ORCHID FERN '
    + 'LILY MUSHROOM GLOWCAP GLOWMOSS CACTUS CACTUS_BLOCK JUNGLEGRASS SPOREVENT HYPHAE '
    + 'WHEAT0 WHEAT1 WHEAT2 WHEAT3 ROOT0 ROOT1 ROOT2 ROOT3 CAP0 CAP1 CAP2 CAP3 '
    + 'BEAN0 BEAN1 BEAN2 BEAN3 BLOOM0 BLOOM1 BLOOM2 BLOOM3 HERB0 HERB1 HERB2 HERB3 '
    + 'POD0 POD1 POD2 POD3');
  put('metal', 'COPPER IRON GOLD MYTHRIL LEAD STEELPLATE CONDUIT SLAGSTEEL ORBITPLATE '
    + 'SPIKE SPARKCOIL GRINDER DART_L DART_R LAMPPOST MINELAMP TOOLPILE '
    + 'M_BELT M_DRILL M_DRILL_E M_PUMP M_SMELTER M_PRESS M_REFINERY M_ASSEMBLER M_CRATE '
    + 'M_GEN M_BATTERY M_POLE M_SORTER M_TURRET M_TRAP M_SWITCH M_WINDMILL M_MILL M_OVEN '
    + 'M_DART M_FLAME M_FROST M_DRILL_X');
  put('glass', 'CRYSTAL AETHER POWERSTONE SOULSTONE COREGLASS DRAFTGLASS ORBITCORE WINDOW');
  put('ember', 'LAVA HELLSTONE FLAMEVENT');
  put('bone', 'BONEHEAP');
  put('stone', 'MOSSSTONE STALACTITE STALAGMITE FAULTSTONE LIMESTONE GRANITE');
  put('plant', 'HANGMOSS');
  put('glass', 'GEODE STARCRYSTAL FUSEDROCK');
  put('metal', 'METEORITE COPPERRICH IRONRICH LEADRICH GOLDRICH MYTHRILRICH');
  put('stone', 'COALRICH');
  put('flesh', 'BLIGHTSAC');
  put('void', 'CORRUPTGRASS');
  return m;
})();
export function tileMat(id) { return TILE_MAT[id] || MAT_DEF; }
/* ---------------- 빛 ---------------- */
export const LIGHT_SPEC = {
  LAMPPOST: [14, '#ffe0a0'], TORCH: [13, '#ffb45a'], LAVA: [11, '#ff6a2a'], FLOWLAVA: [10.8, '#ff7a34'],
  ORBITCORE: [10.5, '#7fe0ff'], COREGLASS: [10, '#ffb04a'], GLOWCAP: [9.5, '#6fe0c0'],
  CONDUIT: [9, '#6fd8ff'], RUNESTONE: [8.5, '#b89fff'], CRYSTAL: [8, '#7fd8e8'],
  DRAFTGLASS: [7.8, '#8fd8e8'], GEODE: [7.4, '#c08fff'], MINELAMP: [7, '#ffc070'],
  POWERSTONE: [6.8, '#ffd24a'], AETHER: [6.6, '#bfe8ff'], M_OVEN: [6.2, '#ff8a3a'],
  ALTARSTONE: [6, '#e8a0ff'], POD3: [5.6, '#ff9a3a'], SOULSTONE: [5.4, '#c49fff'],
  M_GEN: [5.2, '#ff9a4a'], GLOWMOSS: [5, '#5fd0b8'], SPOREVENT: [4.6, '#8fe0a0'],
  HELLSTONE: [4.4, '#ff5a2a'], SEALSTONE: [4.2, '#d8c080'], GLOWLEAF: [4, '#6fe0c0'],
  M_BATTERY: [3.8, '#8fd0f0'], M_FLAME: [3.6, '#ff7a3a'], FLAMEVENT: [3.4, '#ff6a2a'],
  FROSTGLYPH: [3.2, '#9fd8ea'], SPARKCOIL: [3.1, '#8fd0ff'], ORCHID: [3, '#ff8ac8'],
  CIPHERSTONE: [2.9, '#ffe08a'], ROOT3: [2.8, '#ffe08a'], M_SWITCH: [2.6, '#ff5a5a'],
  GLACIUM: [2.5, '#9fd8e8'], HYPHAE: [2.4, '#8fe0c4'], TIDESTONE: [2.3, '#3fc0a8'],
  BLIGHTSAC: [2.2, '#c060c0'], BLACKDAMP: [2, '#a8c04a'], BLOOM3: [1.8, '#f0e8e0'],
  HERB3: [1.6, '#bfe8ff'], SULFUR: [1.4, '#e8d04a'],
  STARCRYSTAL: [7.2, '#ffe6a8'], METEORITE: [1.2, '#ff7a3a']
};
{
  const seen = {};
  for (const k in LIGHT_SPEC) {
    if (T[k] === undefined) continue;
    const [lv, col] = LIGHT_SPEC[k];
    if (seen[lv]) console.warn('빛 세기가 겹친다:', k, seen[lv], lv);
    seen[lv] = k;
    TILE_DEF[T[k]].light = lv; TILE_DEF[T[k]].lc = col;
  }
}

/* 유체 표(world.js '유체' 절). */
export const FLUID_KIND = new Uint8Array(TILE_DEF.length);
export const FLUID_SRC = new Uint8Array(TILE_DEF.length);
export const FLUID_FLOW = new Uint8Array(TILE_DEF.length);
for (const k of ['WATER', 'FALLS', 'FLOWWATER', 'LILY', 'PONDWEED']) FLUID_KIND[T[k]] = 1;
for (const k of ['SEAWATER', 'FLOWSEA', 'KELPPLANT']) FLUID_KIND[T[k]] = 2;
for (const k of ['LAVA', 'FLOWLAVA']) FLUID_KIND[T[k]] = 3;
for (const k of ['WATER', 'SEAWATER', 'LAVA', 'LILY', 'PONDWEED', 'KELPPLANT']) FLUID_SRC[T[k]] = 1;
for (const k of ['FLOWWATER', 'FLOWSEA', 'FLOWLAVA']) FLUID_FLOW[T[k]] = 1;
export const FLUID_TILE = [0, T.FLOWWATER, T.FLOWSEA, T.FLOWLAVA];     // 종류 → 흐르는 타일
/* 물이 밀고 들어갈 수 있는 칸 — 빈칸과 풀·꽃·고사리·조개(쓸려 간다). */
export const FLUID_WASH = new Uint8Array(TILE_DEF.length);
for (const k of ['AIR', 'FLOWER', 'WEED', 'FERN', 'SEASHELL']) FLUID_WASH[T[k]] = 1;
export const FLUID_OPEN = t => FLUID_WASH[t] === 1;
/** 캐거나 부쉈을 때 그 자리에 남는 것 — 물 위의 수련, 물속의 물풀·해초는 캐도 물칸이 남는다 — 사연: docs/code-history.md#h12 */
export const LEAVE_OF = { [T.LILY]: T.WATER, [T.PONDWEED]: T.WATER, [T.KELPPLANT]: T.SEAWATER };

/** 장식을 놓을 때 무엇에 기대야 하는가 — 'floor' 바로 아래가 단단해야 · 'ceil' 바로 위가 단단해야. */
export const DECO_MOUNT = (() => {
  const m = {};
  for (const k of ['FLOWER', 'WEED', 'CACTUS', 'MUSHROOM', 'FERN', 'ORCHID', 'GLOWCAP', 'STALAGMITE', 'GEODE',
                   'BONEHEAP', 'CANOPIC', 'TOOLPILE', 'SEASHELL', 'CATTAIL', 'PEBBLES']) m[T[k]] = 'floor';
  m[T.PONDWEED] = 'water';   // 고인 물 칸 안, 바닥 위에만 — 물 밖에 놓으면 마른 풀이 된다
  for (const k of ['STALACTITE', 'HANGMOSS', 'VINE', 'HYPHAE', 'MINELAMP', 'ICEBANNER']) m[T[k]] = 'ceil';
  return m;
})();
/** 장식 타일 → 그 장식 아이템(ITEMS 의 deco: 1). */
export const DECO_OF = (() => {
  const m = {};
  for (const k in ITEMS) if (ITEMS[k].deco) m[ITEMS[k].tile] = k;
  return m;
})();

/* 몹의 재질. */
export const MOB_MAT = (() => {
  const m = {};
  const put = (mat, keys) => keys.split(' ').forEach(k => { m[k] = mat; });
  put('bone', 'skeleton archer bone_lord');
  put('gel', 'slime king_slime');
  put('stone', 'golem sandmaw mine_horror sand_guardian storm_warden shaft_maw '
    + 'jarhusk draft_form scribe_hand mold_walker archetype');
  put('metal', 'sky_sentry ruin_guard scrapcrawler splitter weldarm coreling riveter '
    + 'cartwraith first_keeper proliferator hepha orbit_sentry ballast_form restorer '
    + 'overseer meridian_eye');
  put('ice', 'frostling icewolf ice_warden frost_witch frostbound');
  put('ember', 'imp lavaslug sparkwisp lantern');
  put('void', 'wraith minerghost void_king gloom_crawler shadoweye gale foreman '
    + 'lost_miner damp_wisp');
  put('plant', 'vinelash bloomspitter sporeling capbeast vine_lord spore_queen '
    + 'corrupttree sacling');
  put('glass', 'crystalcrab pursuer');
  put('wood', 'flotsam1 flotsam2 flotsam3');   // 바다 부유물 — 부서지는 소리가 나무라야 한다
  return m;
})();
export function mobMat(type, mech) {
  /* 개조된 것은 무엇이었든 강철이다 — 보이는 것도 강철이니 소리도 강철이라야 한다 */
  if (mech) return 'metal';
  return MOB_MAT[type] || 'flesh';
}
