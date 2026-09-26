/* ===== tileart.js — 절차적 타일 텍스처 아틀라스 ===== */
import { shade } from '../engine/core/color.js';
import { clamp, lerp } from '../engine/core/math.js';
import { RNG, tileHash } from '../engine/core/rng.js';
import { bakeAtlas, blitCell, cacheGet } from '../engine/render/atlas.js';
import { createConnTiles } from '../engine/render/conn.js';
import { WW } from './size.js';
import { CAVE_TYPES, FLUID_KIND, MACH_OF_TILE, T, TILE_DEF, WALL_COLOR } from './data.js';
import { TS } from './world.js';

/* 배경이 비쳐야 하는 타일 (나무·잎·횃불·발판·덩굴) */
export const ALPHA_TILE = {};
export const WOOD_WALL = 15;             // WALL_COLOR 색인 — 나무 판자 벽지
/* 상단 하이라이트를 생략할 타일 (이미 텍스처에 윗면이 있거나 반투명) */
export const TOP_SKIP = {};
/* 변형 넷이 '무작위 노이즈'가 아니라 '가지 방향'인 타일. */
export const LEAF_TWIG = {};

export const ART = {};
ART[T.DIRT] = { k: 'soil', c: '#6b4a2f' };
ART[T.GRASS] = { k: 'grass', c: '#6b4a2f', g: '#4c7f34' };
ART[T.STONE] = { k: 'rock', c: '#5d5d63' };
ART[T.SAND] = { k: 'sand', c: '#c8ab6a' };
ART[T.SANDSTONE] = { k: 'strata', c: '#9c8047' };
ART[T.SNOW] = { k: 'snow', c: '#d5e2ee' };
ART[T.ICE] = { k: 'ice', c: '#8fc0dd' };
ART[T.WOOD] = { k: 'trunk', c: '#5a3c22', a: 1 };
ART[T.LEAF] = { k: 'leaf', c: '#3f6e2e', a: 1, tw: '#4a3018' };
ART[T.EBONSTONE] = { k: 'ebon', c: '#3a2b46' };
ART[T.CORRUPTGRASS] = { k: 'grass', c: '#4b3a5c', g: '#6d4a92' };
ART[T.ASH] = { k: 'soil', c: '#4a4038' };
ART[T.OBSIDIAN] = { k: 'glass', c: '#241d2e' };
ART[T.COPPER] = { k: 'ore', c: '#5d5d63', o: '#c0762f' };
ART[T.IRON] = { k: 'ore', c: '#5d5d63', o: '#a89c8e' };
ART[T.GOLD] = { k: 'ore', c: '#5d5d63', o: '#e0b93d' };
ART[T.MYTHRIL] = { k: 'ore', c: '#5d5d63', o: '#49b0a4' };
ART[T.SOULSTONE] = { k: 'ore', c: '#4a4452', o: '#9f7fe8', glow: 1 };
ART[T.HELLSTONE] = { k: 'ore', c: '#3e2a24', o: '#e0561c', glow: 1 };
ART[T.PLANK] = { k: 'plank', c: '#7a5734' };
ART[T.BRICK] = { k: 'brick', c: '#5f5e6b' };
ART[T.TORCH] = { k: 'torch', c: '#e8a53a', a: 1 };
ART[T.PLATFORM] = { k: 'platform', c: '#8a6640', a: 1 };
ART[T.BEDROCK] = { k: 'rock', c: '#191922' };
ART[T.VINE] = { k: 'vine', c: '#3d6b2c', a: 1 };
ART[T.CRYSTAL] = { k: 'crystal', c: '#7fd8e8', glow: 1 };
ART[T.LAVA] = { k: 'lava', c: '#e0561c', fr: 3, fps: 2.5 };
ART[T.ALTARSTONE] = { k: 'rock', c: '#2e2438' };
ART[T.CORRUPTLEAF] = { k: 'leaf', c: '#4a3060', a: 1, tw: '#2e1f3c' };
/* --- 2부 --- */
ART[T.CLOUD] = { k: 'cloud', c: '#dfe9f5' };
ART[T.SKYSTONE] = { k: 'rock', c: '#8fa8c0' };
ART[T.SKYGRASS] = { k: 'grass', c: '#dfe9f5', g: '#6ec49a' };
ART[T.SKYLEAF] = { k: 'leaf', c: '#6ec49a', a: 1, tw: '#4a3018' };
ART[T.RUINBRICK] = { k: 'brick', c: '#7a7160' };
ART[T.RUINTILE] = { k: 'ruintile', c: '#57503f' };
ART[T.RUNESTONE] = { k: 'runestone', c: '#4a5f7a' };
ART[T.SEALSTONE] = { k: 'seal', c: '#3a3550' };
ART[T.AETHER] = { k: 'ore', c: '#6f8296', o: '#8fe0d8', glow: 1 };
/* --- 지하 공창 --- */
ART[T.STEELPLATE] = { k: 'brick', c: '#6a6a74' };
ART[T.POWERSTONE] = { k: 'ore', c: '#4a4a52', o: '#e8a53a', glow: 1 };
ART[T.CONDUIT] = { k: 'runestone', c: '#8a6a3a' };
ART[T.SPIKE] = { k: 'spike', c: '#8a2a24', a: 1 };
ART[T.FLOWER] = { k: 'flower', c: '#d87ab0', a: 1 };
ART[T.WEED] = { k: 'weed', c: '#5a8f3a', a: 1 };
ART[T.CACTUS] = { k: 'cactustile', c: '#4a8a4a', a: 1 };
ART[T.MUSHROOM] = { k: 'mushroomtile', c: '#e0402c', a: 1 };
ART[T.CACTUS_BLOCK] = { k: 'cactusblock', c: '#3a7a3a' };
/* --- 동력 자원 --- */
ART[T.COAL] = { k: 'ore', c: '#4e4e56', o: '#22212a' };
ART[T.LEAD] = { k: 'ore', c: '#5d5d63', o: '#8e8ea4' };
ART[T.COALRICH] = { k: 'ore', c: '#3e3e46', o: '#16151c', rich: 1 };
ART[T.COPPERRICH] = { k: 'ore', c: '#5d5d63', o: '#d0803a', rich: 1 };
ART[T.IRONRICH] = { k: 'ore', c: '#5d5d63', o: '#bcb0a0', rich: 1 };
ART[T.LEADRICH] = { k: 'ore', c: '#5d5d63', o: '#a0a0b8', rich: 1 };
ART[T.GOLDRICH] = { k: 'ore', c: '#5d5d63', o: '#f0c848', rich: 1, glow: 1 };
ART[T.MYTHRILRICH] = { k: 'ore', c: '#5d5d63', o: '#5ac8ba', rich: 1, glow: 1 };
ART[T.OILSHALE] = { k: 'oilshale', c: '#3b352c' };
/* --- 기계 --- */
ART[T.M_BELT] = { k: 'mk_belt', c: '#6a6a74', a: 1 };
ART[T.M_DRILL] = { k: 'mk_drill', c: '#8a6a3a', a: 1 };
ART[T.M_DRILL_E] = { k: 'mk_drill', c: '#4a8ab0', a: 1 };
ART[T.M_DRILL_X] = { k: 'mk_drill', c: '#3a5a7a', a: 1, deep: 1 };
ART[T.M_PUMP] = { k: 'mk_pump', c: '#5a5040', a: 1 };
ART[T.M_SMELTER] = { k: 'mk_furnace', c: '#7a4a30', a: 1 };
ART[T.M_PRESS] = { k: 'mk_press', c: '#8a8a98', a: 1 };
ART[T.M_REFINERY] = { k: 'mk_tank', c: '#4a5a4a', a: 1 };
ART[T.M_ASSEMBLER] = { k: 'mk_gear', c: '#5a6a8a', a: 1 };
ART[T.M_CRATE] = { k: 'mk_crate', c: '#66707c', a: 1 };
ART[T.M_GEN] = { k: 'mk_gen', c: '#7a5a3a', a: 1 };
ART[T.M_BATTERY] = { k: 'mk_battery', c: '#4a7a6a', a: 1 };
ART[T.M_POLE] = { k: 'mk_pole', c: '#7a6a4a', a: 1 };
ART[T.M_SORTER] = { k: 'mk_sorter', c: '#8a7a4a', a: 1 };
ART[T.M_TURRET] = { k: 'mk_turret', c: '#55555f', a: 1 };
ART[T.M_TRAP] = { k: 'mk_trap', c: '#4a6a8a', a: 1 };
ART[T.M_SWITCH] = { k: 'mk_switch', c: '#a03a30', a: 1 };
/* --- 마을 건축 --- */
ART[T.THATCH] = { k: 'thatch', c: '#c8a860' };
ART[T.ROOFTILE] = { k: 'rooftile', c: '#8a4a3a' };
ART[T.TIMBERWALL] = { k: 'timber', c: '#d8cbaa', g: '#6a4a2a' };
ART[T.WALLSTONE] = { k: 'ashlar', c: '#8a8478' };
ART[T.BATTLEMENT] = { k: 'battlement', c: '#8a8478' };
ART[T.WINDOW] = { k: 'windowtile', c: '#9fd8e8' };
ART[T.FENCE] = { k: 'fencetile', c: '#7a5734', a: 1 };
ART[T.LAMPPOST] = { k: 'lamppost', c: '#e8c86a', a: 1 };
ART[T.BANNER] = { k: 'bannertile', c: '#b03a3a', a: 1 };
ART[T.HAYBALE] = { k: 'hay', c: '#d8b850' };
ART[T.SANDBAG] = { k: 'sandbagtile', c: '#a89468' };
/* --- 농업. 한 페인터가 작물 종류(kind)와 자란 단계(st)를 받아 그린다 --- */
ART[T.FARMLAND] = { k: 'farmland', c: '#4a3620' };
for (let i = 0; i < 4; i++) {
  ART[T.WHEAT0 + i] = { k: 'crop', kind: 'wheat', st: i, c: ['#7fa84a', '#8fb84a', '#c8b04a', '#e0c058'][i], a: 1 };
  ART[T.ROOT0 + i] = { k: 'crop', kind: 'root', st: i, c: ['#7fa84a', '#6f9f5a', '#5f9f6a', '#8fd0a0'][i], a: 1 };
  ART[T.CAP0 + i] = { k: 'crop', kind: 'cap', st: i, c: ['#8a7a6a', '#9a7a68', '#b06a54', '#e0402c'][i], a: 1 };
  /* 전리품 작물 넷. */
  ART[T.BEAN0 + i] = { k: 'crop', kind: 'bean', st: i, c: ['#6f8a4a', '#7f9a4a', '#a8804a', '#c04a44'][i], a: 1 };
  ART[T.BLOOM0 + i] = { k: 'crop', kind: 'bloom', st: i, c: ['#8a8a7a', '#9a9a88', '#b0b09c', '#e8e4d4'][i], a: 1 };
  ART[T.HERB0 + i] = { k: 'crop', kind: 'herb', st: i, c: ['#6a8a8a', '#6a9a9a', '#7aacb4', '#a8e0e8'][i], a: 1 };
  ART[T.POD0 + i] = { k: 'crop', kind: 'pod', st: i, c: ['#7a6a48', '#8a6a44', '#b06a34', '#e8842a'][i], a: 1 };
}
/* --- 마을 기계 --- */
ART[T.M_WINDMILL] = { k: 'mk_windmill', c: '#c8bca0', a: 1 };
ART[T.M_MILL] = { k: 'mk_mill', c: '#8a7a5a', a: 1 };
ART[T.M_OVEN] = { k: 'mk_oven', c: '#9a6a4a', a: 1 };
/* --- 울림 정글 / 버섯 골짜기 --- */
ART[T.JUNGLEGRASS] = { k: 'grass', c: '#4a3a26', g: '#3f7a34' };
ART[T.MUD] = { k: 'mud', c: '#4a3a26' };
ART[T.JUNGLELEAF] = { k: 'leaf', c: '#2f6a28', a: 1, tw: '#3e2a14' };
ART[T.FERN] = { k: 'fern', c: '#4a8a3a', a: 1 };
ART[T.ORCHID] = { k: 'orchid', c: '#c85a9a', a: 1 };
ART[T.GLOWMOSS] = { k: 'grass', c: '#3a4a44', g: '#4a9a7a' };
ART[T.SPORESTONE] = { k: 'sporestone', c: '#4a5a5a' };
ART[T.GLOWCAP] = { k: 'glowcap', c: '#6fe0c0', a: 1 };
ART[T.GLOWLEAF] = { k: 'leaf', c: '#6fe0c0', a: 1, glow: 1, noTwig: 1 };   // 버섯나무 갓 조각
/* 수련·해초·물풀은 **물을 제 그림에 굽지 않는다** — game.js 가 그 칸 밑에 진짜 물 타일을 같은 프레임으로 먼저 깐다(UNDER_LIQ) — 사연:
   docs/code-history.md#h80 */
ART[T.LILY] = { k: 'lily', c: '#3a9a6a', a: 1 };
ART[T.AIRPOCKET] = { k: 'airpocket', c: '#cfeeff', a: 1, fr: 3, fps: 4 };
ART[T.ROOMAIR]   = { k: 'roomair', c: '#3b2c1c', a: 1 };
/* 등급 5 광물 둘 — 바탕돌 색을 산지에 맞춘다(빙하는 얼음, 해저는 젖은 바위). */
ART[T.GLACIUM]   = { k: 'ore', c: '#7c96a8', o: '#bfeaf7', glow: 1 };
ART[T.TIDESTONE] = { k: 'ore', c: '#4a5f60', o: '#54d0b4', glow: 1 };
ART[T.PALMWOOD]  = { k: 'palmwood', c: '#7a5a38' };
ART[T.PALMLEAF]  = { k: 'palmleaf', c: '#4f8a3a' };
ART[T.COCONUT]   = { k: 'coconut', c: '#6a4a2a' };
// 바닷물 — 물과 같은 그림틀에 색만 짙게.
ART[T.SEAWATER] = { k: 'water', c: '#12496e', a: 1, fr: 3, fps: 3 };
/* 4단계 설비 — 기존 기계 그림틀(mk_*)을 그대로 쓴다. */
ART[T.M_PRESSOR] = { k: 'mk_press', c: '#4a5a6a', a: 1 };
/* 정제기가 쓰는 진짜 키는 mk_tank다. */
ART[T.M_DESAL] = { k: 'mk_tank', c: '#3a6a7a', a: 1 };
ART[T.M_BELT_F] = { k: 'mk_belt', c: '#8a9aa8', a: 1 };      // 고속 벨트 — 일반 벨트보다 밝은 금속
ART[T.M_BATTERY_HI] = { k: 'mk_battery', c: '#4a9a8a', a: 1 };
ART[T.BRINEVENT] = { k: 'flamevent', c: '#2a6a7a' };   // 염수 분출구 — 화염과 같은 틀에 색만 물빛
ART[T.TRIPMINE] = { k: 'tripmine', c: '#8a5a3a' };
ART[T.KELPPLANT] = { k: 'kelpplant', c: '#3f7a5a', a: 1, fr: 3, fps: 2 };
/* --- 흐르는 액체 · 샘 · 물가 장식 --- */
ART[T.FLOWWATER] = { k: 'water', c: '#2f6f9f', a: 1, fr: 3, fps: 4 };
ART[T.FLOWSEA]   = { k: 'water', c: '#2a6a92', a: 1, fall: 1, fr: 3, fps: 10 };
ART[T.FLOWLAVA]  = { k: 'lava', c: '#e0561c', a: 1, fr: 3, fps: 2.5 };   // a:1 — 얕은 칸 윗부분에 벽이 비쳐야 한다
ART[T.SPRING]    = { k: 'spring', c: '#5a6a70' };
ART[T.CATTAIL]   = { k: 'cattail', c: '#7a8a4a', a: 1 };
ART[T.PONDWEED]  = { k: 'pondweed', c: '#4a8a5a', a: 1, fr: 3, fps: 1.5 };
ART[T.PEBBLES]   = { k: 'pebbles', c: '#9a948a', a: 1 };
ART[T.PINELEAF]  = { k: 'pine', c: '#2f5a44', a: 1 };
ART[T.SEASHELL] = { k: 'seashell', c: '#e0cdb8', a: 1 };
ART[T.SULFUR] = { k: 'ore', c: '#7a7268', o: '#d8c04a', glow: 1 };
/* 마을 전신주 기둥 — 공장 전주(M_POLE)와 나란히 서도 이질감이 없어야 해서 같은 나뭇결· 같은 폭으로 그린다. */
/* --- 유적 --- */
ART[T.ICEBRICK] = { k: 'ashlar', c: '#7fb0d8' };
ART[T.SANDBRICK] = { k: 'ashlar', c: '#c8a468' };
ART[T.MINEWOOD] = { k: 'plank', c: '#6a4a2a' };
ART[T.M_DART] = { k: 'mk_dart', c: '#7a6a5a', a: 1 };
ART[T.M_FLAME] = { k: 'mk_jet', c: '#9a5a3a', a: 1 };
ART[T.M_FROST] = { k: 'mk_jet', c: '#6a9ab0', a: 1 };
/* --- 고대 유적 함정 (타일만으로 도는 것들) --- */
ART[T.DART_L] = { k: 'darthole', c: '#4a4238', d: -1 };
ART[T.DART_R] = { k: 'darthole', c: '#4a4238', d: 1 };
ART[T.FLAMEVENT] = { k: 'flamevent', c: '#8a4a2a' };
ART[T.SPARKCOIL] = { k: 'flamevent', c: '#5a8aa8' };
ART[T.GASVENT] = { k: 'flamevent', c: '#6a7a4a' };
ART[T.GRINDER] = { k: 'flamevent', c: '#6a6058' };
ART[T.CRUMBLE] = { k: 'crumble', c: '#6a6050' };
/* --- 유적마다 그곳에서만 나오는 장식 둘 --- */
ART[T.ICEBANNER] = { k: 'banner_ice', c: '#7fb6cc', a: 1 };
ART[T.FROSTGLYPH] = { k: 'glyph', c: '#9fd8ea', glow: 1, warm: 0 };
ART[T.CANOPIC] = { k: 'canopic', c: '#c8a86a', a: 1 };
ART[T.HIEROGLYPH] = { k: 'glyph', c: '#b09054', warm: 1 };
ART[T.MINELAMP] = { k: 'minelamp', c: '#e8b45a', a: 1, glow: 1 };
ART[T.TOOLPILE] = { k: 'toolpile', c: '#7a6a56', a: 1 };
ART[T.BLIGHTSAC] = { k: 'sac', c: '#8a4a80', a: 1, glow: 1 };
ART[T.BONEHEAP] = { k: 'boneheap', c: '#cfc8b0', a: 1 };
ART[T.SPOREVENT] = { k: 'sporevent', c: '#5a8a74', glow: 1 };
ART[T.HYPHAE] = { k: 'hyphae', c: '#8fe0c4', a: 1, glow: 1 };
/* --- 동굴 갈래 — 장식 넷은 a:1(뒤의 벽이 비친다). 이끼 바위와 금 간 자갈은 고체 --- */
ART[T.MOSSSTONE] = { k: 'mossrock', c: '#5d5d63', g: '#5f8f4a' };
ART[T.HANGMOSS] = { k: 'hangmoss', c: '#6fa05a', a: 1 };
ART[T.STALACTITE] = { k: 'dripstone', c: '#9a9488', a: 1, up: 0 };
ART[T.STALAGMITE] = { k: 'dripstone', c: '#8a8478', a: 1, up: 1 };
ART[T.GEODE] = { k: 'geode', c: '#a88fe8', a: 1, glow: 1 };
ART[T.FAULTSTONE] = { k: 'fault', c: '#5f5e62' };   // 돌과 거의 같은 색 — 알갱이 결과 가는 금으로만 알아본다
ART[T.LIMESTONE] = { k: 'strata', c: '#9a9486' };    // 석회암 — 밝고 결이 가로로 진다
ART[T.GRANITE] = { k: 'granite', c: '#7a6868' };      // 화강암 — 굵은 알갱이가 점점이
/* --- 운석 구덩이 --- */
ART[T.METEORITE] = { k: 'meteorite', c: '#3a3436' };
ART[T.STARCRYSTAL] = { k: 'starcrystal', c: '#ffe6a8', a: 1, glow: 1 };
ART[T.FUSEDROCK] = { k: 'fused', c: '#2e2a2e' };
/* --- 폭주로 --- */
ART[T.SLAGSTEEL] = { k: 'slag', c: '#5a4a44' };
ART[T.COREGLASS] = { k: 'crystal', c: '#e8b04a', glow: 1 };
/* --- 동굴 물 — 둘 다 반투명(a:1)이라 뒤의 벽이 비쳐 보인다 --- */
ART[T.WATER] = { k: 'water', c: '#2f6f9f', a: 1, fr: 3, fps: 4 };
ART[T.FALLS] = { k: 'water', c: '#4a8fc0', a: 1, fall: 1, fr: 3, fps: 10 };
/* --- 세션 2 종장: 설계실. 공창의 강철과 대비되도록 이음매 없는 흰 돌로 간다 --- */
ART[T.ARCHESTONE] = { k: 'ashlar', c: '#cfc7b8' };
ART[T.DRAFTGLASS] = { k: 'draftglass', c: '#8fd8e8', glow: 1 };
ART[T.ARCHSEAL] = { k: 'seal', c: '#b8a878' };
/* --- 특별 유적 --- */
ART[T.ORBITPLATE] = { k: 'brick', c: '#8fa8c8' };
ART[T.ORBITCORE] = { k: 'ore', c: '#6a7f9c', o: '#7fe0ff', glow: 1 };
ART[T.DEEPROCK] = { k: 'rock', c: '#3a3630' };
ART[T.BLACKDAMP] = { k: 'water', c: '#6a7a4a', a: 1, fall: 0 };

/* ---------------- 이웃을 보고 그리는 타일 ---------------- */
export const MOSS_COL = {
  sea: '#4f8a6a', glacier: '#9fc8c0', ice: '#8fb8a8',          // 서리 이끼 — 희푸르다
  forest: '#6f9a4a', forest2: '#6f9a4a', jungle: '#3f8a2f',     // 푸른 이끼
  desert: '#b09a50',                                             // 바위옷 — 누렇게 마른 이끼
  glowfen: '#5fd0b8', corrupt: '#9a6ab8'                         // 발광 이끼 · 부패 이끼
};
export const BODY_ONLY = {};   // 위가 막히면 몸통만 그리는 타일(①)
export const CONN = {};        // 이웃을 보고 통째로 그리는 타일(②)
for (const id of [T.GRASS, T.CORRUPTGRASS, T.JUNGLEGRASS, T.GLOWMOSS, T.SNOW, T.ICE]) BODY_ONLY[id] = 1;
for (const id of [T.MOSSSTONE, T.HANGMOSS, T.STALACTITE, T.STALAGMITE, T.PINELEAF, T.WOOD, T.PALMWOOD, T.PALMLEAF]) CONN[id] = 1;

/** 질감 갈래(ART[id].k) → 그리는 법 — art/tiles/*.js 가 채운다. this 는 TileArt, H 는 paint 의 인자·도우미 */
export const TILE_PAINT = {};

export const TileArt = {
  /* 타일마다 아틀라스에 미리 그려 두는 칸 수. */
  V: 6,
  atlas: null, wallAtlas: null, ready: false,
  /* 움직이는 타일: id → { fr, fps }. build()에서 ART의 fr을 보고 채운다 — 사연: docs/code-history.md#h81 */
  ANIM: {},

  build() {
    for (const id in ART) if (ART[id].a) ALPHA_TILE[id] = 1;
    for (const id in ART) if (ART[id].k === 'leaf' && !ART[id].noTwig) LEAF_TWIG[id] = 1;
    /* 상단 하이라이트를 **얹지 않을** 타일 — 사연: docs/code-history.md#h82 */
    this._topHand = {};
    for (const id of [T.GRASS, T.CORRUPTGRASS, T.JUNGLEGRASS, T.GLOWMOSS,
                      T.SNOW, T.ICE, T.THATCH, T.BATTLEMENT, T.HAYBALE, T.MOSSSTONE]) this._topHand[id] = 1;
    for (const id in MACH_OF_TILE) this._topHand[id] = 1;
    for (const id in this._topHand) TOP_SKIP[id] = 1;

    const N = TILE_DEF.length;
    const rng = new RNG('ashfall-tileart-1');
    this.ANIM = {};
    /* 타일 번호 = 행, 변형 = 열. 칸을 자르는 것과 부르는 순서(행 → 열)는 엔진 bakeAtlas — ★ 공유 난수(rng)를 그 순서로 뽑는다. */
    this.atlas = bakeAtlas(TS, this.V, N, (g, ox, oy, id, v) => {
      const s = ART[id];
      if (!s) return;
      if (s.fr) {
        /* 움직이는 타일 — 칸을 변형이 아니라 프레임으로 쓴다. */
        if (v === 0) this.ANIM[id] = { fr: Math.min(s.fr, this.V), fps: s.fps || 4 };
        const fr = v % this.ANIM[id].fr;
        this.paint(g, ox, oy, s, new RNG('ashfall-anim-' + id + '-' + fr), v, id + '-' + fr);
        return;
      }
      this.paint(g, ox, oy, s, rng, v, id + '-' + v);
    });
    this.wallAtlas = bakeAtlas(TS, this.V, WALL_COLOR.length, (g, ox, oy, i) => {
      if (i === 0) return;                                  // 0 = 벽지 없음
      (i === WOOD_WALL ? this.paintWoodWall : this.paintWall).call(this, g, ox, oy, WALL_COLOR[i], rng);
    });

    /* 이웃을 보고 그리는 타일 — ① BODY_ONLY 는 엔진 규칙, ② CONN 은 번호마다 그리는 법(_connDraws) */
    this.conn = createConnTiles({ ts: TS, bodyOnly: BODY_ONLY, solid: id => TILE_DEF[id].solid === 1 });
    const draws = this._connDraws();
    for (const id in CONN) if (draws[id]) this.conn.add(+id, draws[id]);
    this.buildAsh();
    this.markFull();
    this.ready = true;
  },

  /** 칸을 **꽉 채운** 타일을 아틀라스에서 직접 재어 TOP_SKIP 에 반영한다. */
  markFull() {
    if (!this.atlas) return;
    const N = TILE_DEF.length, W = this.atlas.width;
    let data;
    try {
      data = this.atlas.getContext('2d').getImageData(0, 0, W, this.atlas.height).data;
    } catch (e) {
      for (let id = 0; id < N; id++) if (TILE_DEF[id].solid !== 1) TOP_SKIP[id] = 1;
      this.topTainted = 1;
      return;
    }
    for (let id = 0; id < N; id++) {
      let full = !!ART[id];
      for (let y = id * TS; full && y < (id + 1) * TS; y++)
        for (let x = 0; full && x < W; x++)
          if (data[(y * W + x) * 4 + 3] < 255) full = false;
      if (!full) TOP_SKIP[id] = 1;
      else if (!this._topHand[id]) delete TOP_SKIP[id];
    }
  },
  /* ② — 제 윗면을 스스로 그리는 타일. */
  _topHand: {},

  /** 손그림 타일 텍스처가 로드되면 절차 생성 아틀라스의 해당 타일 행을 덮어 그린다. */
  applySprite(id, img) {
    if (!this.atlas || !img || !img.width) return;
    const g = this.atlas.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let v = 0; v < this.V; v++) g.drawImage(img, v * TS, id * TS, TS, TS);
  },

  /* ---------- 잿빛 판 ---------- */
  ASH_TILE: [T.LEAF, T.GRASS, T.FLOWER, T.WEED,
             T.JUNGLELEAF, T.JUNGLEGRASS, T.FERN, T.ORCHID],
  CAP_TILE: [T.GRASS, T.JUNGLEGRASS],      // 위쪽 몇 줄이 초록 갓이고 아래는 흙인 타일

  buildAsh() {
    if (!this.atlas) return;
    const cv = this.ashAtlas && this.ashAtlas.width === this.atlas.width
      ? this.ashAtlas : document.createElement('canvas');
    cv.width = this.atlas.width; cv.height = this.atlas.height;
    const g = cv.getContext('2d');
    for (const id of this.ASH_TILE) {
      const row = id * TS;
      g.clearRect(0, row, cv.width, TS);
      g.drawImage(this.atlas, 0, row, cv.width, TS, 0, row, cv.width, TS);
      const d = g.getImageData(0, row, cv.width, TS), px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        if (!px[i + 3]) continue;
        const l = px[i] * 0.30 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
        px[i] = Math.min(255, l * 0.62 + 27);
        px[i + 1] = Math.min(255, l * 0.60 + 25);
        px[i + 2] = Math.min(255, l * 0.57 + 22);
      }
      g.putImageData(d, 0, row);
    }
    this.ashAtlas = cv;
    this.buildCapAsh();
    this.buildThin();
    this.buildBurnt();     // 성근 판에서 뜨므로 buildThin 뒤라야 한다
  },

  /* ---------- 갓만 바랜 판 (풀 칸용 · 타일마다 한 줄) ---------- */
  buildCapAsh() {
    if (!this.atlas || !this.ashAtlas) return;
    const W = this.V * TS, N = this.CAP_TILE.length;
    const cv = this.capAtlas || document.createElement('canvas');
    cv.width = W; cv.height = TS * N;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, cv.height);
    for (let i = 0; i < N; i++)
      g.drawImage(this.atlas, 0, this.CAP_TILE[i] * TS, W, TS, 0, i * TS, W, TS);
    const d = g.getImageData(0, 0, W, cv.height), px = d.data;
    const ag = this.atlas.getContext('2d'), sg = this.ashAtlas.getContext('2d');
    this.capCells = 0;                     // 실제로 바꾼 칸 수 — 진단에서 본다
    for (let i = 0; i < N; i++) {
      const row = this.CAP_TILE[i] * TS;
      const src = ag.getImageData(0, row, W, TS).data;
      const ash = sg.getImageData(0, row, W, TS).data;
      for (let x = 0; x < W; x++) {
        let cap = 0;                       // 초록이 붉은색보다 진한 동안이 갓이다
        while (cap < TS - 2 && src[(cap * W + x) * 4 + 1] > src[(cap * W + x) * 4] + 4) cap++;
        for (let y = 0; y < cap; y++) {
          const f = (y * W + x) * 4, t = ((i * TS + y) * W + x) * 4;
          px[t] = ash[f]; px[t + 1] = ash[f + 1]; px[t + 2] = ash[f + 2]; px[t + 3] = ash[f + 3];
          this.capCells++;
        }
      }
    }
    g.putImageData(d, 0, 0);
    this.capAtlas = cv;
  },
  /** 흙은 원본 · 갓만 잿빛인 판. */
  drawCapAsh(c, id, v, sx, sy) {
    const i = this.CAP_TILE.indexOf(id);
    if (this.capAtlas && i >= 0)
      c.drawImage(this.capAtlas, v * TS, i * TS, TS, TS, sx, sy, TS, TS);
  },

  /* ---------- 성근 잎 판 (잎 한 종마다 두 줄: 성한 색 · 잿빛) ---------- */
  /* ★ 성근 판이 **두 단계**다. */
  buildThin() {
    if (!this.atlas) return;
    const ids = Object.keys(LEAF_TWIG).map(Number);
    this.THIN_TILE = ids;
    if (!ids.length) { this.thinAtlas = null; return; }
    const W = this.V * TS;
    const cv = this.thinAtlas || document.createElement('canvas');
    cv.width = W; cv.height = TS * 4 * ids.length;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, cv.height);
    for (let i = 0; i < ids.length; i++)
      g.drawImage(this.atlas, 0, ids[i] * TS, W, TS, 0, (i * 4) * TS, W, TS);

    const at = (x, y) => (y * W + x) * 4;
    const rng = new RNG('ashfall-leaf-thin');
    const eraser = (px) => (row, n, tr, tg, tb) => {
      // 작은 덩이 단위로 지운다 — 픽셀 하나씩 지우면 잎이 성근 게 아니라 좀먹어 보인다
      for (let k = 0; k < n * this.V; k++) {
        const bx = rng.range(0, W), by = rng.range(0, TS), r = rng.range(1.1, 2.5);
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            if (dx * dx + dy * dy > r * r) continue;
            const x = Math.round(bx + dx), y = Math.round(by + dy);
            if (x < 0 || x >= W || y < 0 || y >= TS) continue;
            const p = at(x, row + y);
            if (!px[p + 3]) continue;
            /* 가지 색과 '거의 같은' 픽셀만 남긴다. */
            if (Math.abs(px[p] - tr) + Math.abs(px[p + 1] - tg) + Math.abs(px[p + 2] - tb) < 34) continue;
            px[p + 3] = 0;
          }
      }
    };
    const twig = (id) => {
      const t = ART[id].tw || '#000000';
      return [parseInt(t.slice(1, 3), 16), parseInt(t.slice(3, 5), 16), parseInt(t.slice(5, 7), 16)];
    };
    // ① 성근1 — 본판에서 지운다
    let d = g.getImageData(0, 0, W, cv.height);
    let er = eraser(d.data);
    for (let i = 0; i < ids.length; i++) er((i * 4) * TS, 46, ...twig(ids[i]));
    g.putImageData(d, 0, 0);
    /* ② 성근2 — **성근1 을 베껴서** 더 지운다. */
    for (let i = 0; i < ids.length; i++)
      g.drawImage(cv, 0, (i * 4) * TS, W, TS, 0, (i * 4 + 2) * TS, W, TS);
    d = g.getImageData(0, 0, W, cv.height);
    er = eraser(d.data);
    for (let i = 0; i < ids.length; i++) er((i * 4 + 2) * TS, 100, ...twig(ids[i]));
    g.putImageData(d, 0, 0);
    // 잿빛 줄 — buildAsh 와 같은 식으로 채도만 뺀다
    for (let i = 0; i < ids.length; i++) {
      for (const lv of [0, 1]) {
        const src = (i * 4 + lv * 2) * TS, row = src + TS;
        g.clearRect(0, row, W, TS);
        g.drawImage(cv, 0, src, W, TS, 0, row, W, TS);
        const d2 = g.getImageData(0, row, W, TS), p2 = d2.data;
        for (let k = 0; k < p2.length; k += 4) {
          if (!p2[k + 3]) continue;
          const l = p2[k] * 0.30 + p2[k + 1] * 0.59 + p2[k + 2] * 0.11;
          p2[k] = Math.min(255, l * 0.62 + 27);
          p2[k + 1] = Math.min(255, l * 0.60 + 25);
          p2[k + 2] = Math.min(255, l * 0.57 + 22);
        }
        g.putImageData(d2, 0, row);
      }
    }
    this.thinAtlas = cv;
  },
  /** lv 0 = 성근1, 1 = 성근2(거의 앙상) */
  drawThin(c, id, v, sx, sy, ash, lv) {
    const i = this.THIN_TILE ? this.THIN_TILE.indexOf(id) : -1;
    if (this.thinAtlas && i >= 0)
      c.drawImage(this.thinAtlas, v * TS, (i * 4 + (lv ? 2 : 0) + (ash ? 1 : 0)) * TS,
        TS, TS, sx, sy, TS, TS);
  },

  /* ---------- 탄 잎 판 (1행) ---------- */
  buildBurnt() {
    if (!this.atlas) return;
    const W = this.V * TS;
    const cv = this.burntAtlas || document.createElement('canvas');
    cv.width = W; cv.height = TS;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, TS);
    const ti = this.THIN_TILE ? this.THIN_TILE.indexOf(T.LEAF) : -1;
    if (this.thinAtlas && ti >= 0)
      g.drawImage(this.thinAtlas, 0, (ti * 4) * TS, W, TS, 0, 0, W, TS);
    else
      g.drawImage(this.atlas, 0, T.LEAF * TS, W, TS, 0, 0, W, TS);
    const d = g.getImageData(0, 0, W, TS), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      const l = px[i] * 0.30 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      px[i] = l * 0.38 + 9; px[i + 1] = l * 0.29 + 7; px[i + 2] = l * 0.23 + 6;
    }
    g.putImageData(d, 0, 0);
    this.burntAtlas = cv;
  },
  drawBurnt(c, v, sx, sy) {
    if (this.burntAtlas) c.drawImage(this.burntAtlas, v * TS, 0, TS, TS, sx, sy, TS, TS);
  },

  /** 타일 블릿. */
  draw(c, id, v, sx, sy, h) { blitCell(c, this.atlas, TS, v, id, sx, sy, h); },
  /** 잿빛 판 블릿 — 같은 자리, 색만 빠진 것 */
  drawAsh(c, id, v, sx, sy) {
    if (this.ashAtlas) c.drawImage(this.ashAtlas, v * TS, id * TS, TS, TS, sx, sy, TS, TS);
  },
  /** 바이옴 이끼 색을 돌 색(#5d5d63) 쪽으로 35% 섞어 채도를 죽인다 — 이끼 바위·늘어진 이끼가 같이 쓴다. */
  mossCol(c) {
    this._mc = this._mc || {};
    if (this._mc[c]) return this._mc[c];
    const t = 0.35, g = '#5d5d63';
    return (this._mc[c] = '#' + [1, 3, 5].map(i => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - t) + parseInt(g.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join(''));
  },
  /** ①② 를 그린다 — 틀(위가 막히면 몸통만 · 번호별 그리기 찾기)은 엔진 render/conn, 번호별 그리는 법은 _connDraws. */
  drawConn(c, w, id, tx, ty, sx, sy, v) { return this.conn.draw(c, this.atlas, w, id, tx, ty, sx, sy, v); },
  /** ② 이웃을 보고 통째로 그리는 타일마다 그리는 법 — build() 가 엔진 틀에 건다. */
  _connDraws() {
    const mossOf = (w, tx) => this.mossCol(MOSS_COL[w.biomeAt(clamp(tx, 0, WW - 1)).id] || '#6f9a4a');
    const drip = (c, w, id, tx, ty, sx, sy) => {
      const up = id === T.STALAGMITE;
      let i = 0, n = 1;                                    // i: 붙은 쪽에서 몇 번째 칸, n: 줄 길이
      if (!up) { while (i < 6 && w.get(tx, ty - i - 1) === id) i++; n = i + 1; while (n < 8 && w.get(tx, ty - i + n) === id) n++; }
      else { while (i < 6 && w.get(tx, ty + i + 1) === id) i++; n = i + 1; while (n < 8 && w.get(tx, ty + i - n) === id) n++; }
      c.drawImage(this._drip(id, i, n), sx, sy);
      return true;
    };
    return {
      [T.WOOD]: (c, w, id, tx, ty, sx, sy) => { c.drawImage(this._trunkTile(w, tx, ty), sx, sy); return true; },
      [T.PALMWOOD]: (c, w, id, tx, ty, sx, sy) => { c.drawImage(this._palmTile(w, tx, ty), sx, sy); return true; },
      [T.PALMLEAF]: (c, w, id, tx, ty, sx, sy) => { c.drawImage(this._palmLeafTile(w, tx, ty), sx, sy); return true; },
      [T.MOSSSTONE]: (c, w, id, tx, ty, sx, sy, v) => {
        this.draw(c, T.STONE, v, sx, sy);
        c.drawImage(this._mossTile(w, tx, ty, mossOf(w, tx)), sx, sy);
        return true;
      },
      [T.PINELEAF]: (c, w, id, tx, ty, sx, sy, v) => {
        /* 윗칸이 트였으면(공기·비고체이고 같은 솔잎이 아님) 눈을 얹는다 — 톱니 원뿔 층마다 넓은 줄의 윗면이 트여 있어 층층이 눈이 쌓인 것처럼 보인다. */
        this.draw(c, id, v, sx, sy);
        const up = w.get(tx, ty - 1);
        if (up !== T.PINELEAF && up !== T.WOOD && TILE_DEF[up].solid !== 1) {
          c.fillStyle = '#dfe8f0'; c.fillRect(sx, sy, TS, 3);
          c.fillStyle = '#f4f8fb'; c.fillRect(sx + 1, sy, TS - 2, 1);
          c.fillStyle = '#a8b8c8';
          for (let x = 0; x < TS; x++) {
            const d = (tileHash(tx * TS + x, ty) * 4) | 0;
            if (d) { c.fillStyle = '#dfe8f0'; c.fillRect(sx + x, sy + 3, 1, d - 1); }
            c.fillStyle = '#a8b8c8'; c.fillRect(sx + x, sy + 2 + d, 1, 1);
          }
        }
        return true;
      },
      [T.HANGMOSS]: (c, w, id, tx, ty, sx, sy) => {
        const mc = mossOf(w, tx);
        // 이어진 줄의 맨 위(붙은 칸)와 길이를 잰다 — 가닥이 여러 칸을 건너 한 줄로 이어지게
        let top = ty, bot = ty;
        while (top > ty - 8 && w.get(tx, top - 1) === T.HANGMOSS) top--;
        while (bot < ty + 8 && w.get(tx, bot + 1) === T.HANGMOSS) bot++;
        const run = (bot - top + 1) * TS, y0 = (ty - top) * TS;
        const dk = shade(mc, .72), lt = shade(mc, 1.15);
        if (ty === top) { c.fillStyle = dk; c.fillRect(sx, sy, TS, 2); }
        for (let j = 0; j < 7; j++) {
          const fx = 1 + j * 3, len = run * (0.45 + 0.55 * tileHash(tx * 7 + j, top));
          const a0 = y0, a1 = Math.min(y0 + TS, len);
          if (a1 <= a0) continue;
          c.fillStyle = j % 2 ? mc : dk;
          c.fillRect(sx + fx, sy + (a0 - y0), 2, a1 - a0);
          if (a1 < y0 + TS && a1 === len) { c.fillStyle = lt; c.fillRect(sx + fx, sy + (a1 - y0) - 1, 2, 1); }
        }
        return true;
      },
      [T.STALACTITE]: drip, [T.STALAGMITE]: drip
    };
  },
  /** 칸 캐시 — 열쇠가 같으면 다시 그리지 않는다 */
  _cache(name, key, make) { return cacheGet(this[name] = this[name] || new Map(), key, make); },
  /* ★ 나무 기둥·야자 줄기·야자 잎은 칸 무늬가 아니라 **세계 좌표**로 칠한다 — 이웃 칸과 결이 이어져
     한 그루로 읽힌다(이끼 바위와 같은 방식). 칸마다 난수로 그리면 칸 경계마다 결이 끊긴다. */
  _trunkTile(w, tx, ty) {
    const wd = (x, y) => w.get(x, y) === T.WOOD;
    const L = wd(tx - 1, ty), R = wd(tx + 1, ty), U = wd(tx, ty - 1), D = wd(tx, ty + 1);
    const ground = !D && TILE_DEF[w.get(tx, ty + 1)].solid === 1;
    const capTop = !U && w.get(tx, ty - 1) === T.AIR;   // 벗은 꼭대기 — 옆 기둥이 없는 쪽만 둥글게 깎는다
    let lx = tx, rx = tx;                                // 이 줄의 기둥 폭 — 옹이는 기둥 전체에서 줄마다 하나
    while (lx > tx - 6 && wd(lx - 1, ty)) lx--;
    while (rx < tx + 6 && wd(rx + 1, ty)) rx++;
    const key = tx + ',' + ty + ':' + (+L) + (+R) + (+U) + (+ground) + (+capTop) + lx + ',' + rx;
    return this._cache('_tk', key, () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = TS;
      const g = cv.getContext('2d'), img = g.createImageData(TS, TS), px = img.data;
      const base = [0x5a, 0x3c, 0x22];
      const mul = (c, k) => c.map(v => Math.min(255, Math.round(v * k)));
      const lt = mul(base, 1.22), dk = mul(base, .72), dk2 = mul(base, .52);
      const vn = (u, sd) => { const i = Math.floor(u), f = u - i, e = f * f * (3 - 2 * f); return lerp(tileHash(i, sd), tileHash(i + 1, sd), e); };
      for (let y = 0; y < TS; y++) {
        // 기둥 폭 — 옆이 기둥이면 칸 끝까지, 밑동은 뿌리로 벌어지고 벗은 꼭대기는 좁아진다
        let a = L ? 0 : 3, b = R ? TS : TS - 3;
        if (ground && y > TS - 8) { const k = (y - (TS - 8)) / 7; if (!L) a = Math.round(3 - 3 * k * k); if (!R) b = Math.round(TS - 3 + 3 * k * k); }
        if (capTop && y < 9) {
          const k = (9 - y) / 9;
          if (!L) a = Math.round(3 + ((L || R) ? 8 : 5) * k * k);
          if (!R) b = Math.round(TS - 3 - ((L || R) ? 8 : 5) * k * k);
        }
        for (let x = a; x < b; x++) {
          const gx = tx * TS + x, gy = ty * TS + y;
          // 세로 골 — 5px 간격, 세계 y 로 굽이친다
          const furrow = Math.abs(((gx + 2.2 * vn(gy / 11, 31 + tx)) % 5 + 5) % 5 - 2.5) < 0.6;
          let c = base;
          if (!L && x < a + 2) c = lt;
          else if (!R && x >= b - 3) c = dk;
          else if (furrow) c = tileHash(gx, gy) < 0.8 ? dk : dk2;
          else if (tileHash(gx * 3, gy * 5) < 0.06) c = lt;
          // 옹이 — 30px 마디마다 세계 좌표로 뽑아 두 칸에 걸쳐도 이어진다
          const kc = Math.floor(gy / 30), kh = tileHash(lx * 13, kc * 7);
          if (kh < 0.28) {
            const ky = kc * 30 + 8 + kh * 40, kx = lx * TS + 11 + ((rx - lx) * TS) * tileHash(lx, kc * 3) + (kh - 0.14) * 20;
            const d = Math.hypot((gx - kx) / 1.2, gy - ky);
            if (d < 2.6) c = dk2; else if (d < 3.6) c = dk;
          }
          const o = (y * TS + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      return cv;
    });
  },
  /** 야자 줄기 — ★ 칸 격자를 따른다: 보통 칸은 가운데 곧은 줄기, 이음줄(옆 칸으로 옮겨 가는 줄)만
      그 줄 두 칸 안에서 S자로 넘어간다(줄 위아래 끝에서 세로라 꺾인 데가 없다). 마디는 세계 y. */
  _palmTile(w, tx, ty) {
    const pw = (x, y) => w.get(x, y) === T.PALMWOOD;
    const U = pw(tx, ty - 1), D = pw(tx, ty + 1), L = pw(tx - 1, ty), R = pw(tx + 1, ty);
    const side = R ? 1 : L ? -1 : 0;
    const top = U || w.get(tx, ty - 1) === T.PALMLEAF;
    // 이음줄: 아래로 이어진 칸(lower)은 위 끝이 옆 칸 가운데, 위로 이어진 칸(upper)은 아래 끝이 옆 칸 가운데
    const role = !side ? 0 : (D && !top) ? 1 : (top && !D) ? 2 : 0;
    const ground = !D && TILE_DEF[w.get(tx, ty + 1)].solid === 1;
    const key = tx + ',' + ty + ':' + side + role + (+ground);
    return this._cache('_pk', key, () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = TS;
      const g = cv.getContext('2d'), img = g.createImageData(TS, TS), px = img.data;
      const base = [0x7a, 0x5a, 0x38];
      const mul = (c, k) => c.map(v => Math.min(255, Math.round(v * k)));
      const lt = mul(base, 1.2), dk = mul(base, .72), dk2 = mul(base, .52);
      const sm = t => t * t * (3 - 2 * t);
      const cx = y => {                                  // 칸 안 y(0=위)의 줄기 가운데
        const t = clamp((TS - y) / TS, 0, 1);
        return role === 1 ? 11 + side * TS * sm(t) : role === 2 ? 11 + side * TS * (1 - sm(t)) : 11;
      };
      for (let y = 0; y < TS; y++) {
        const c0 = cx(y + 0.5), slope = (cx(y - 1.5) - cx(y + 2.5)) / 4;
        let hw = 4.5 * Math.sqrt(1 + slope * slope);      // 기울어도 줄기 굵기(수직 폭 9)는 같게
        if (ground && y > TS - 6) hw += (y - (TS - 6)) * 0.9;
        const gy = ty * TS + y;
        for (let x = 0; x < TS; x++) {
          const u = x + 0.5 - c0;
          if (Math.abs(u) > hw) continue;
          const ring = ((Math.floor(gy - u * slope) % 5) + 5) % 5;   // 마디는 줄기 축에 수직
          let c = ring === 0 ? dk2 : ring === 1 ? lt : base;
          const e = 2 * Math.sqrt(1 + slope * slope);
          if (u < -hw + e && ring) c = lt; else if (u > hw - e) c = dk;
          const o = (y * TS + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      return cv;
    });
  },
  /** 이어진 야자 잎 덩어리(4방향, 80칸까지)와 그 닻. 닻은 줄기 꼭대기 바로 위 잎 칸(이음줄이면 옮겨 간 칸),
      줄기가 없으면(놓은 잎 블록) 덩어리 맨 아랫줄 가운데 — 어떤 모양으로 놓아도 잎갓 하나로 읽힌다. */
  _palmCluster(w, tx, ty) {
    const lf = (x, y) => w.get(x, y) === T.PALMLEAF;
    const seen = new Set([tx + ',' + ty]), cells = [[tx, ty]];
    for (let i = 0; i < cells.length && cells.length < 80; i++) {
      const [x, y] = cells[i];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = nx + ',' + ny;
        if (seen.has(k) || Math.abs(nx - tx) > 10 || Math.abs(ny - ty) > 8 || !lf(nx, ny)) continue;
        seen.add(k); cells.push([nx, ny]);
      }
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, an = null;
    for (const [x, y] of cells) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (w.get(x, y + 1) === T.PALMWOOD && !(w.get(x, y + 2) === T.PALMWOOD && w.get(x + 1, y + 1) === T.PALMWOOD)) an = [x, y];
    }
    if (!an) {
      const row = cells.filter(c => c[1] === y1).map(c => c[0]).sort((p, q) => p - q);
      an = [row[row.length >> 1], y1];
    }
    let mask = '';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask += seen.has(x + ',' + y) ? 1 : 0;
    return { x0, y0, W: x1 - x0 + 1, H: y1 - y0 + 1, an, mask, key: x0 + ',' + y0 + ':' + (x1 - x0 + 1) + ':' + an.join(',') + ':' + mask };
  },
  /** 야자 잎 — 닻에서 잎줄기를 촘촘히 뻗되 ★ 잎 칸이 끝나는 곳에서 멈춘다. 잎갓 한 장을 덩어리 전체로
      그리고(칸을 넘어 이어짐) 잎 칸은 제 몫만 잘라 쓰므로 윤곽은 놓인 잎 칸 모양(격자)을 따른다.
      잎줄기가 닿지 않은 칸에는 그 칸 몫의 짧은 잎줄기를 더해 빈 칸이 없게 한다. */
  _palmLeafTile(w, tx, ty) {
    const cl = this._palmCluster(w, tx, ty);
    const cr = this._cache('_pc', cl.key, () => {
      const { W, H, mask } = cl, CW = W * TS, CH = H * TS;
      const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
      const g = cv.getContext('2d');
      const inL = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && mask[((y / TS) | 0) * W + ((x / TS) | 0)] === '1';
      const base = ART[T.PALMLEAF].c, lt = shade(base, 1.3), lt2 = shade(base, 1.55), dk = shade(base, .72), dk2 = shade(base, .5);
      const O = [(cl.an[0] - cl.x0 + 0.5) * TS, (cl.an[1] - cl.y0 + 1) * TS - 4];
      const rr = new RNG('palm-' + cl.key);
      // 잎줄기 하나 — 시작점·방향(라디안)·처짐으로 칸이 끝날 때까지 뻗고, 양옆에 처진 작은 잎을 단다
      const frond = (sx, sy, a, droop, maxS) => {
        const pts = [];
        for (let s = 0; s < maxS; s += 1.5) {
          const x = sx + Math.cos(a) * s, y = sy - Math.sin(a) * s + droop * s * s;
          if (s > 4 && !inL(x, y)) break;
          pts.push([x, y]);
        }
        return pts.slice(0, Math.max(2, pts.length - 4));   // 칸 끝에서 6px 앞에서 멈춘다 — 잘린 단면이 안 보이게
      };
      const fr = [];
      for (const deg of [176, 165, 152, 139, 126, 112, 98, 84, 70, 56, 43, 30, 17, 5]) {
        const a = deg * Math.PI / 180;
        fr.push(frond(O[0], O[1], a, 0.004 + 0.016 * (1 - Math.sin(a)), 260));
      }
      const paint = list => {
        for (const pass of [0, 1])
          for (const pts of list) {
            const n = pts.length;
            for (let i = 2; i < n - 1; i += 2) {
              const [x, y] = pts[i], [nx, ny] = pts[i + 1];
              const ang = Math.atan2(ny - y, nx - x), t = i / n;
              // 끝으로 갈수록 짧아져 잎줄기 끝이 뾰족하게 모인다
              let len = Math.min((1 - t * 0.6) * (8 + rr.range(0, 3)), (n - i) * 1.1);
              const la = ang + (pass ? -1 : 1) * 1.2;
              const ex = l => x + Math.cos(la) * l, ey = l => y + Math.sin(la) * l + l * 0.45;
              while (len > 1 && !inL(ex(len), ey(len))) len -= 1;   // 잎 칸 밖으로 나가는 작은 잎은 줄인다(잘리지 않게)
              if (len <= 1) continue;
              g.strokeStyle = pass ? (i % 4 ? lt : lt2) : (i % 4 ? dk : base);
              g.lineWidth = 1.7;
              g.beginPath(); g.moveTo(x, y); g.lineTo(ex(len), ey(len)); g.stroke();
            }
          }
        for (const pts of list) {                         // 잎줄기 — 끝 쪽 3분의 1은 가늘게
          if (pts.length < 2) continue;
          const cut = Math.floor(pts.length * 0.66);
          g.strokeStyle = dk2;
          for (const [from, to, lw] of [[0, cut, 1.6], [cut, pts.length - 1, 0.9]]) {
            if (to <= from) continue;
            g.lineWidth = lw; g.beginPath(); g.moveTo(pts[from][0], pts[from][1]);
            for (let i = from + 1; i <= to; i++) g.lineTo(pts[i][0], pts[i][1]);
            g.stroke();
          }
        }
      };
      paint(fr);
      // 덜 덮인 칸(20% 미만) — 닻에서 잎 칸을 따라 건너온 앞 칸(부모) 가운데에서 이 칸을 지나 뻗는 잎줄기.
      // 부모 칸에서 시작하므로 떨어져 뜬 조각이 되지 않고, 가지처럼 덩어리 끝까지 이어진다.
      const id = g.getImageData(0, 0, CW, CH).data, extra = [];
      const ai = cl.an[0] - cl.x0, aj = cl.an[1] - cl.y0, par = new Map([[aj * W + ai, -1]]), order = [aj * W + ai];
      for (let q = 0; q < order.length; q++) {
        const k = order[q], i = k % W, j = (k / W) | 0;
        for (const [di, dj] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const ni = i + di, nj = j + dj, nk = nj * W + ni;
          if (ni < 0 || nj < 0 || ni >= W || nj >= H || mask[nk] !== '1' || par.has(nk)) continue;
          par.set(nk, k); order.push(nk);
        }
      }
      const cov = k => {
        const i = k % W, j = (k / W) | 0; let n = 0;
        for (let y = 0; y < TS; y += 2) for (let x = 0; x < TS; x += 2) if (id[((j * TS + y) * CW + i * TS + x) * 4 + 3] > 40) n++;
        return n / ((TS / 2) * (TS / 2));
      };
      for (const k of order) {
        const pk = par.get(k);
        if (pk < 0 || cov(k) >= 0.2) continue;
        const px0 = (pk % W + 0.5) * TS, py0 = (((pk / W) | 0) + 0.5) * TS;
        const cx = (k % W + 0.5) * TS, cy = (((k / W) | 0) + 0.5) * TS;
        const a = Math.atan2(-(cy - py0), cx - px0);
        for (const da of [-0.3, 0.3]) extra.push(frond(px0, py0, a + da, 0.006, 90));
      }
      if (extra.length) paint(extra);
      if (cl.an && w.get(cl.an[0], cl.an[1] + 1) === T.PALMWOOD) {
        g.fillStyle = dk2; g.beginPath(); g.ellipse(O[0], O[1], 6, 4, 0, 0, Math.PI * 2); g.fill();
      }
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (mask[j * W + i] !== '1') g.clearRect(i * TS, j * TS, TS, TS);
      return cv;
    });
    return this._cache('_pf', tx + ',' + ty + ':' + cl.key, () => {
      const c = document.createElement('canvas'); c.width = c.height = TS;
      c.getContext('2d').drawImage(cr, (tx - cl.x0) * TS, (ty - cl.y0) * TS, TS, TS, 0, 0, TS, TS);
      return c;
    });
  },
  /** 이끼 바위 한 칸의 이끼 — ★ 칸 단위 띠가 아니라 **세계 좌표의 이끼 두께 장**을 칸마다 잘라 그린다. */
  _mossTile(w, tx, ty, col) {
    const sol = (x, y) => TILE_DEF[w.get(x, y)].solid === 1;
    const mos = (x, y) => w.get(x, y) === T.MOSSSTONE;
    const oT = !sol(tx, ty - 1), oR = !sol(tx + 1, ty), oB = !sol(tx, ty + 1), oL = !sol(tx - 1, ty);
    const cTL = !oT && !oL && !sol(tx - 1, ty - 1), cTR = !oT && !oR && !sol(tx + 1, ty - 1);
    const cBR = !oB && !oR && !sol(tx + 1, ty + 1), cBL = !oB && !oL && !sol(tx - 1, ty + 1);
    const nm = (mos(tx, ty - 1) ? 1 : 0) + (mos(tx + 1, ty) ? 1 : 0) + (mos(tx, ty + 1) ? 1 : 0) + (mos(tx - 1, ty) ? 1 : 0);
    const D = this._mossDensity(w, tx, ty);
    const key = tx + ',' + ty + ':' + [oT, oR, oB, oL, cTL, cTR, cBR, cBL].map(Number).join('') + nm + col + D;
    this._mt = this._mt || new Map();
    const hit = this._mt.get(key);
    if (hit) return hit;
    if (this._mt.size > 3000) this._mt.clear();
    const cv = document.createElement('canvas'); cv.width = cv.height = TS;
    const g = cv.getContext('2d');
    /* ★ 색 자체는 drawConn 이 돌 색 쪽으로 죽여서 넘기고(mossCol), 여기서는 밝은 쪽을 1.12·1.22배로만, 가운데 칸은 반투명(알파 215)으로 두어 밑의 돌 결이
       비치게 한다. */
    const dk = shade(col, .72), dk2 = shade(col, .56), lt = shade(col, 1.12), lt2 = shade(col, 1.22);
    // 세계 좌표 값 잡음 — 5px 마디 사이를 부드럽게 잇는다(이웃 칸과 같은 값을 본다)
    const vn = (u, s) => {
      const i = Math.floor(u / 5), f = u / 5 - i, e = f * f * (3 - 2 * f);
      return lerp(tileHash(i, s), tileHash(i + 1, s), e);
    };
    const T0 = 3.4 + nm * 1.3;
    const gx0 = tx * TS, gy0 = ty * TS;
    // 안쪽 뭉치 — 외톨이 칸에도 하나, 이웃 이끼가 많을수록 더.
    const blobs = [];
    const nb = Math.round(((oT || oR || oB || oL) ? 1 + (nm >> 1) : (nm >= 2 ? nm - 1 : 0)) * D);
    for (let i = 0; i < nb; i++)
      blobs.push([3 + tileHash(tx * 5 + i, ty * 3) * (TS - 6), 3 + tileHash(tx * 3, ty * 5 + i) * (TS - 6), 2.5 + tileHash(tx + i, ty - i) * 2.5 + nm * 0.5]);
    const img = g.createImageData(TS, TS), px = img.data;
    const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const C = { lt2: rgb(lt2), lt: rgb(lt), c: rgb(col), dk: rgb(dk), dk2: rgb(dk2) };
    for (let y = 0; y < TS; y++)
      for (let x = 0; x < TS; x++) {
        const gx = gx0 + x, gy = gy0 + y;
        const ex = x + .5, ey = y + .5;
        let f = 0;
        if (oT) f += Math.exp(-ey / (T0 + 3.5 * vn(gx, 11)));
        if (oB) f += Math.exp(-(TS - ey) / (T0 + 3.5 * vn(gx, 13)));
        if (oL) f += Math.exp(-ex / (T0 + 3.5 * vn(gy, 17)));
        if (oR) f += Math.exp(-(TS - ex) / (T0 + 3.5 * vn(gy, 19)));
        const tc = T0 + 2.5;
        if (cTL) f += Math.exp(-Math.hypot(ex, ey) / tc);
        if (cTR) f += Math.exp(-Math.hypot(TS - ex, ey) / tc);
        if (cBR) f += Math.exp(-Math.hypot(TS - ex, TS - ey) / tc);
        if (cBL) f += Math.exp(-Math.hypot(ex, TS - ey) / tc);
        for (const [bx, by, br] of blobs) f += 0.75 * Math.exp(-((ex - bx) ** 2 + (ey - by) ** 2) / (br * br));
        /* 밀도 D 는 f 에 곱한다 — 문턱(0.37)이 그대로라 두께가 D 에 따라 줄고, 마른 곳은 세계 좌표 잡음(7px 마디)으로 군데군데 끊겨 얼룩이 된다. */
        if (D < 1) f *= D * (1 + (1 - D) * 1.4 * (vn(gx * 0.7 + gy * 1.3, 23) - 0.5));
        const h = tileHash(gx, gy);
        const fj = f + (h - 0.5) * 0.14;                       // 가장자리를 보풀처럼
        let c = null;
        if (fj > 0.37) {
          // 트인 면에 가까울수록(f 큼) 밝고, 바위 쪽 끝은 어둡다
          /* 밝은 색을 넓게 쓰면 형광 초록 판으로 보였다 — 가운데 색을 바탕으로 두고, 트인 면 바로 곁만 밝게, 잔점을 섞어 잎 무더기 결을 낸다 */
          const h2 = tileHash(gx * 3 + 1, gy * 7 + 2);
          c = f > 1.5 ? (h < 0.3 ? C.lt2 : C.lt) : f > 0.6 ? (h2 < 0.2 ? C.dk : h2 > 0.85 ? C.lt : C.c) : (h < 0.35 ? C.dk2 : C.dk);
        } else if (fj > 0.27 && h < 0.35) c = C.dk;              // 바위로 번지는 잔점
        if (!c) continue;
        const o = (y * TS + x) * 4;
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c === C.c ? 215 : 240;
      }
    g.putImageData(img, 0, 0);
    this._mt.set(key, cv);
    return cv;
  },
  /** 이끼가 얼마나 빽빽한가 — 0.4(마른 외톨이) ~ 1(최대) — 사연: docs/code-history.md#h84 */
  _mossDensity(w, tx, ty) {
    this._md = this._md || new Map();
    const i = ty * WW + tx, now = performance.now(), hit = this._md.get(i);
    if (hit && now - hit[1] < 1500) return hit[0];
    if (this._md.size > 6000) this._md.clear();
    // 물까지의 거리(체비쇼프, 6칸까지) — 2칸 안이면 1, 멀어질수록 0.06씩
    let wd = 99;
    for (let dy = -6; dy <= 6; dy++)
      for (let dx = -6; dx <= 6; dx++) {
        const k = FLUID_KIND[w.get(tx + dx, ty + dy)];
        if (k === 1 || k === 2) wd = Math.min(wd, Math.max(Math.abs(dx), Math.abs(dy)));
      }
    const wet = wd <= 2 ? 1 : wd <= 6 ? 1 - (wd - 2) * 0.06 : 0;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && w.get(tx + dx, ty + dy) === T.MOSSSTONE) n++;
    const moss = CAVE_TYPES.findIndex(k => k.id === 'moss');
    const inCave = w.caveTypeAt && w.caveTypeAt(tx, ty) === moss && ty > w.surface[clamp(tx, 0, WW - 1)] + 12;
    const base = inCave ? 0.55 : 0.35;
    const D = Math.round(Math.max(wet, base + (1 - base) * Math.min(1, n / 12)) * 10) / 10;
    this._md.set(i, [D, now]);
    return D;
  },
  /** 종유석(위에 붙음)·석순(바닥에 붙음) 한 줄의 i 번째 칸 — 줄 전체가 원뿔 하나가 되게 */
  _drip(id, i, n) {
    const key = id + ':' + i + ':' + n;
    this._dc = this._dc || {};
    if (this._dc[key]) return this._dc[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = TS;
    const g = cv.getContext('2d');
    const base = TILE_DEF[id].c, dk = shade(base, .74), lt = shade(base, 1.2), lt2 = shade(base, 1.4);
    const up = id === T.STALAGMITE;
    for (let y = 0; y < TS; y++) {
      const yy = up ? TS - 1 - y : y;                       // 붙은 쪽에서 잰 칸 속 높이
      const t = (i + (yy + 0.5) / TS) / n;                   // 0(붙은 쪽) → 1(끝)
      const wdt = Math.max(1, (TS - 3) * (1 - t * 0.9));
      const gy = i * TS + yy;                                // 줄 전체에서의 높이 — 줄무늬가 칸을 건너 이어진다
      g.fillStyle = gy % 6 === 0 ? dk : gy % 6 === 3 ? lt : base;
      g.fillRect(TS / 2 - wdt / 2, y, wdt, 1);
      g.fillStyle = lt2; g.fillRect(TS / 2 - wdt / 2, y, Math.max(1, wdt * .22), 1);
    }
    if (!up && i === n - 1) { g.fillStyle = '#9fd0e8'; g.fillRect(TS / 2 - 0.5, TS - 2, 1, 2); }
    return (this._dc[key] = cv);
  },
  drawWall(c, wl, v, sx, sy) { blitCell(c, this.wallAtlas, TS, v, wl, sx, sy); },

  /* ---------- 그리기 도우미 ---------- */
  _r(g, ox, oy, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(ox + Math.round(x), oy + Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  },
  _fill(g, ox, oy, col) { g.fillStyle = col; g.fillRect(ox, oy, TS, TS); },
  _speck(g, ox, oy, rng, n, a, b) {
    for (let i = 0; i < n; i++) this._r(g, ox, oy, rng.range(0, TS - 1), rng.range(0, TS - 1), 1, 1, rng.chance(.5) ? a : b);
  },

  /* ---------- 개별 질감 ---------- */
  paint(g, ox, oy, s, rng, v, seed) {
    const R = (x, y, w, h, c) => this._r(g, ox, oy, x, y, w, h, c);
    const base = s.c;
    const dk = shade(base, .74), dk2 = shade(base, .54), lt = shade(base, 1.18), lt2 = shade(base, 1.4);

    const paint = TILE_PAINT[s.k];
    if (paint) paint.call(this, { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 });
  },

  /** 기계 공통 뼈대 — 강철 상자에 볼트 네 개 */
  _mkBody(g, ox, oy, base, R) {
    const dk = shade(base, .62), lt = shade(base, 1.3);
    R(1, 2, TS - 2, TS - 3, base);
    R(1, 2, TS - 2, 2, lt);
    R(1, TS - 3, TS - 2, 2, dk);
    R(1, 2, 2, TS - 3, shade(base, 1.12));
    R(TS - 3, 2, 2, TS - 3, dk);
    for (const [bx, by] of [[3, 4], [TS - 6, 4], [3, TS - 7], [TS - 6, TS - 7]]) R(bx, by, 2, 2, shade(base, .45));
  },

  /* 나무 판자 벽지. */
  paintWoodWall(g, ox, oy, col, rng) {
    const base = shade(col, .62), dk = shade(col, .40), lt = shade(col, .82);
    this._fill(g, ox, oy, base);
    let x = rng.int(0, 3);
    while (x < TS) {                                   // 세로 판자 — 폭을 조금씩 다르게
      const w = rng.int(4, 7);
      this._r(g, ox, oy, x, 0, w, TS, rng.chance(.5) ? shade(col, .68) : shade(col, .56));
      this._r(g, ox, oy, x + w - 1, 0, 1, TS, dk);     // 판자 사이 이음매
      for (let k = 0; k < 2; k++)                      // 나뭇결
        this._r(g, ox, oy, x + rng.int(1, Math.max(1, w - 2)), rng.int(1, TS - 3), 1, rng.int(2, 5), dk);
      if (rng.chance(.30)) this._r(g, ox, oy, x + 1, rng.int(2, TS - 3), 1, 1, lt);   // 못자국
      x += w;
    }
    g.globalAlpha = .16;
    this._r(g, ox, oy, 0, 0, TS, 2, '#000');
    g.globalAlpha = 1;
  },

  paintWall(g, ox, oy, col, rng) {
    const base = shade(col, .66), dk = shade(col, .44), lt = shade(col, .86);
    this._fill(g, ox, oy, base);
    for (let i = 0; i < 9; i++)
      this._r(g, ox, oy, rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? dk : lt);
    this._speck(g, ox, oy, rng, 24, dk, lt);
    // 타일 경계에 약한 음영 — 벽면의 깊이감
    g.globalAlpha = .16;
    this._r(g, ox, oy, 0, 0, TS, 2, '#000');
    this._r(g, ox, oy, 0, 0, 2, TS, '#000');
    g.globalAlpha = 1;
  }
};
