/* ===== tileart.js — 절차적 타일 텍스처 아틀라스 ===== */
'use strict';

/* 배경이 비쳐야 하는 타일 (나무·잎·횃불·발판·덩굴) */
const ALPHA_TILE = {};
const WOOD_WALL = 15;             // WALL_COLOR 색인 — 나무 판자 벽지
/* 상단 하이라이트를 생략할 타일 (이미 텍스처에 윗면이 있거나 반투명) */
const TOP_SKIP = {};
/* 변형 넷이 '무작위 노이즈'가 아니라 '가지 방향'인 타일. */
const LEAF_TWIG = {};

const ART = {};
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
ART[T.OILSHALE] = { k: 'oilshale', c: '#3b352c' };
/* --- 기계 --- */
ART[T.M_BELT] = { k: 'mk_belt', c: '#6a6a74', a: 1 };
ART[T.M_DRILL] = { k: 'mk_drill', c: '#8a6a3a', a: 1 };
ART[T.M_DRILL_E] = { k: 'mk_drill', c: '#4a8ab0', a: 1 };
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
const MOSS_COL = {
  sea: '#4f8a6a', glacier: '#9fc8c0', ice: '#8fb8a8',          // 서리 이끼 — 희푸르다
  forest: '#6f9a4a', forest2: '#6f9a4a', jungle: '#3f8a2f',     // 푸른 이끼
  desert: '#b09a50',                                             // 바위옷 — 누렇게 마른 이끼
  glowfen: '#5fd0b8', corrupt: '#9a6ab8'                         // 발광 이끼 · 부패 이끼
};
const BODY_ONLY = {};   // 위가 막히면 몸통만 그리는 타일(①)
const CONN = {};        // 이웃을 보고 통째로 그리는 타일(②)
for (const id of [T.GRASS, T.CORRUPTGRASS, T.JUNGLEGRASS, T.GLOWMOSS, T.SNOW, T.ICE]) BODY_ONLY[id] = 1;
for (const id of [T.MOSSSTONE, T.HANGMOSS, T.STALACTITE, T.STALAGMITE, T.PINELEAF, T.WOOD, T.PALMWOOD, T.PALMLEAF]) CONN[id] = 1;

const TileArt = {
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
    const cv = document.createElement('canvas');
    cv.width = this.V * TS; cv.height = N * TS;
    const g = cv.getContext('2d');
    const rng = new RNG('ashfall-tileart-1');
    this.ANIM = {};
    /* ★ 칸마다 **잘라서** 그린다. */
    const clipCell = (gg, ox, oy, fn) => { gg.save(); gg.beginPath(); gg.rect(ox, oy, TS, TS); gg.clip(); fn(); gg.restore(); };
    for (let id = 0; id < N; id++) {
      const s = ART[id];
      if (!s) continue;
      if (s.fr) {
        /* 움직이는 타일 — 칸을 변형이 아니라 프레임으로 쓴다. */
        this.ANIM[id] = { fr: Math.min(s.fr, this.V), fps: s.fps || 4 };
        for (let v = 0; v < this.V; v++) {
          const fr = v % this.ANIM[id].fr;
          clipCell(g, v * TS, id * TS, () => this.paint(g, v * TS, id * TS, s, new RNG('ashfall-anim-' + id + '-' + fr), v, id + '-' + fr));
        }
        continue;
      }
      for (let v = 0; v < this.V; v++) clipCell(g, v * TS, id * TS, () => this.paint(g, v * TS, id * TS, s, rng, v, id + '-' + v));
    }
    this.atlas = cv;

    const wc = document.createElement('canvas');
    wc.width = this.V * TS; wc.height = WALL_COLOR.length * TS;
    const wg = wc.getContext('2d');
    for (let i = 1; i < WALL_COLOR.length; i++)
      for (let v = 0; v < this.V; v++)
        clipCell(wg, v * TS, i * TS, () => (i === WOOD_WALL ? this.paintWoodWall : this.paintWall).call(this, wg, v * TS, i * TS, WALL_COLOR[i], rng));
    this.wallAtlas = wc;

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
  draw(c, id, v, sx, sy, h) {
    c.drawImage(this.atlas, v * TS, id * TS, TS, h || TS, sx, sy, TS, h || TS);
  },
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
  /** ①② 를 그린다. */
  drawConn(c, w, id, tx, ty, sx, sy, v) {
    if (BODY_ONLY[id]) {
      if (TILE_DEF[w.get(tx, ty - 1)].solid !== 1) return false;   // 위가 트였으면 평소대로
      const h = TS >> 1, oy = id * TS + TS - h;
      c.drawImage(this.atlas, v * TS, oy, TS, h, sx, sy, TS, h);
      c.drawImage(this.atlas, v * TS, oy, TS, h, sx, sy + h, TS, TS - h);
      return true;
    }
    if (!CONN[id]) return false;
    if (id === T.WOOD) { c.drawImage(this._trunkTile(w, tx, ty), sx, sy); return true; }
    if (id === T.PALMWOOD) { c.drawImage(this._palmTile(w, tx, ty), sx, sy); return true; }
    if (id === T.PALMLEAF) { c.drawImage(this._palmLeafTile(w, tx, ty), sx, sy); return true; }
    const mc = this.mossCol(MOSS_COL[w.biomeAt(clamp(tx, 0, WW - 1)).id] || '#6f9a4a');
    if (id === T.MOSSSTONE) {
      this.draw(c, T.STONE, v, sx, sy);
      c.drawImage(this._mossTile(w, tx, ty, mc), sx, sy);
      return true;
    }
    if (id === T.PINELEAF) {
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
    }
    if (id === T.HANGMOSS) {
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
    }
    if (id === T.STALACTITE || id === T.STALAGMITE) {
      const up = id === T.STALAGMITE;
      let i = 0, n = 1;                                    // i: 붙은 쪽에서 몇 번째 칸, n: 줄 길이
      if (!up) { while (i < 6 && w.get(tx, ty - i - 1) === id) i++; n = i + 1; while (n < 8 && w.get(tx, ty - i + n) === id) n++; }
      else { while (i < 6 && w.get(tx, ty + i + 1) === id) i++; n = i + 1; while (n < 8 && w.get(tx, ty + i - n) === id) n++; }
      c.drawImage(this._drip(id, i, n), sx, sy);
      return true;
    }
    return false;
  },
  /** 칸 캐시 — 열쇠가 같으면 다시 그리지 않는다 */
  _cache(name, key, make) {
    const m = (this[name] = this[name] || new Map());
    let hit = m.get(key);
    if (hit) return hit;
    if (m.size > 2500) m.clear();
    hit = make(); m.set(key, hit);
    return hit;
  },
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
        return pts;
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
              const len = (1 - t * 0.7) * (8 + rr.range(0, 3));
              const la = ang + (pass ? -1 : 1) * 1.2;
              g.strokeStyle = pass ? (i % 4 ? lt : lt2) : (i % 4 ? dk : base);
              g.lineWidth = 1.7;
              g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(la) * len, y + Math.sin(la) * len + len * 0.45); g.stroke();
            }
          }
        for (const pts of list) {
          if (pts.length < 2) continue;
          g.strokeStyle = dk2; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
          for (const [x, y] of pts) g.lineTo(x, y);
          g.stroke();
        }
      };
      paint(fr);
      // 덜 덮인 칸(잎이 30% 미만) — 닻 쪽에서 그 칸을 가로지르는 짧은 잎줄기 둘
      const id = g.getImageData(0, 0, CW, CH).data, extra = [];
      for (let j = 0; j < H; j++)
        for (let i = 0; i < W; i++) {
          if (mask[j * W + i] !== '1') continue;
          let n = 0;
          for (let y = 0; y < TS; y += 2) for (let x = 0; x < TS; x += 2) if (id[((j * TS + y) * CW + i * TS + x) * 4 + 3] > 40) n++;
          if (n / ((TS / 2) * (TS / 2)) >= 0.3) continue;
          const cx = (i + 0.5) * TS, cy = (j + 0.5) * TS;
          const a = Math.atan2(-(cy - O[1]), cx - O[0] || 0.01);
          const sx = cx - Math.cos(a) * 9, sy = cy + Math.sin(a) * 9;
          for (const da of [-0.35, 0.35]) extra.push(frond(sx, sy, a + da, 0.012, 40));
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
  drawWall(c, wl, v, sx, sy) {
    c.drawImage(this.wallAtlas, v * TS, wl * TS, TS, TS, sx, sy, TS, TS);
  },

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

    switch (s.k) {
      case 'soil':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 11; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(2, 6), rng.range(2, 4), rng.chance(.5) ? dk : lt);
        this._speck(g, ox, oy, rng, 26, dk2, lt);
        break;

      case 'grass': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 9; i++) R(rng.range(-1, TS - 3), rng.range(4, TS - 3), rng.range(2, 6), rng.range(2, 4), rng.chance(.5) ? dk : lt);
        this._speck(g, ox, oy, rng, 18, dk2, lt);
        const g1 = s.g, g2 = shade(g1, 1.28), g3 = shade(g1, .68);
        let h = 5;
        for (let x = 0; x < TS; x++) {
          h = clamp(h + rng.range(-1.2, 1.2), 3, 8);
          R(x, 0, 1, h, g1);
          R(x, 0, 1, rng.chance(.6) ? 2 : 1, g2);
          R(x, h - 1, 1, 1, g3);
        }
        break;
      }

      case 'rock':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 10), rng.range(3, 7), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {   // 균열
          let x = rng.range(2, TS - 2), y = rng.range(-2, 6);
          for (let k = 0; k < rng.int(5, 12); k++) { R(x, y, 1, 1, dk2); x += rng.range(-1.2, 1.2); y += rng.range(.7, 1.7); }
        }
        this._speck(g, ox, oy, rng, 20, dk2, lt2);
        break;

      case 'sand':
        this._fill(g, ox, oy, base);
        this._speck(g, ox, oy, rng, 76, dk, lt);
        for (let i = 0; i < 3; i++) {   // 잔물결
          const y = rng.range(2, TS - 3);
          for (let x = 0; x < TS; x++) if (rng.chance(.55)) R(x, y + Math.sin(x * .55 + i) * .9, 1, 1, dk);
        }
        break;

      case 'strata': {
        this._fill(g, ox, oy, base);
        let y = rng.range(-3, 0);
        while (y < TS) { const h = rng.range(2.5, 5.5); R(0, y, TS, h, rng.chance(.5) ? dk : lt); y += h; }
        for (let i = 0; i < 4; i++) R(0, rng.range(0, TS), TS, 1, dk2);
        this._speck(g, ox, oy, rng, 22, dk2, lt2);
        break;
      }

      case 'snow':
        this._fill(g, ox, oy, base);
        this._speck(g, ox, oy, rng, 44, shade(base, .88), '#ffffff');
        R(0, 0, TS, 2, '#ffffff');
        for (let i = 0; i < 4; i++) R(rng.range(0, TS - 4), rng.range(3, TS - 2), rng.range(2, 5), 1, shade(base, .82));
        break;

      case 'ice':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 4; i++) {   // 사선 광택
          const x = rng.range(-6, TS), len = rng.range(6, 14), st = rng.range(0, TS - 4);
          for (let k = 0; k < len; k++) R(x + k, st + k, 1, 1, rng.chance(.6) ? lt2 : lt);
        }
        for (let i = 0; i < 2; i++) {   // 균열
          let x = rng.range(3, TS - 3);
          for (let y = 0; y < TS; y++) { R(x, y, 1, 1, dk); x += rng.range(-.8, .8); }
        }
        R(0, 0, TS, 1, lt2);
        break;

      case 'trunk': {
        const w = 16, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt);
        R(x0 + w - 2, 0, 2, TS, dk);
        for (let i = 0; i < 4; i++) {   // 나뭇결
          const x = x0 + rng.range(2, w - 3);
          for (let y = rng.range(0, 4); y < TS; y += rng.int(3, 8)) R(x, y, 1, rng.range(2, 5), dk2);
        }
        if (rng.chance(.3)) {           // 옹이
          const kx = x0 + rng.range(3, w - 6), ky = rng.range(3, TS - 7);
          R(kx, ky, 5, 4, dk2); R(kx + 1, ky + 1, 3, 2, dk);
        }
        break;
      }

      case 'pine': {
        /* 소나무 잎 — 둥근 잎덩이(leaf)가 아니라 **아래로 처진 가지 줄** 위에 짧은 바늘잎을 세운다. */
        const c1 = base, c2 = shade(base, 1.3), c3 = shade(base, .72), c4 = shade(base, .52);
        const lr = new RNG('pine-' + seed);
        const Rc = (x, y, w, h, col) => { if (y + h > 0 && y < TS) R(x, Math.max(0, y), w, Math.min(h, TS - Math.max(0, y)), col); };
        for (let y = 0; y < TS; y++)
          for (let x = 0; x < TS; x++) if (!lr.chance(.06)) R(x, y, 1, 1, (x + y) % 3 ? c3 : c4);
        const off = lr.int(0, 4);
        for (let b = -1; b < 5; b++) {
          const y0 = b * 5 + off, cx = lr.range(4, TS - 4);
          for (let x = 0; x < TS; x++) {
            const y = Math.round(y0 + ((x - cx) / TS) ** 2 * 6);
            Rc(x, y, 1, 2, c1);
            if ((x + b) % 2 === 0) Rc(x, y - 2, 1, 2, c1);          // 위로 선 바늘
            if ((x + b) % 3 === 0) Rc(x, y - 3, 1, 1, c2);          // 바늘 끝 빛
            if ((x + b) % 4 === 1) Rc(x, y + 2, 1, 1, c4);          // 가지 밑 그늘
          }
        }
        for (let i = 0; i < 6; i++) R(lr.range(1, TS - 2), lr.range(1, TS - 2), 1, 1, c2);
        break;
      }

      case 'leaf': {
        /* ---------- 잎은 **가지에 붙어 있어야 한다** ---------- */
        const c1 = base, c2 = shade(base, 1.32), c3 = shade(base, .66);
        const tw = s.tw || shade(base, .40), tw2 = shade(tw, 1.4);
        const M = TS / 2 - 1;
        // 잎덩이는 칸·변형마다 고정된 씨앗으로 뽑는다 — 판을 다시 구워도 같은 그림이 나온다
        const lr = new RNG('leaf-' + seed);

        /* ---------- 빽빽할 때는 **정말 빽빽해야 한다** ---------- */
        const STEP = 4;
        for (let gy = -2; gy < TS + 2; gy += STEP) {
          for (let gx = -2; gx < TS + 2; gx += STEP) {
            if (lr.chance(.13)) continue;          // 빛이 새는 구멍
            const x = gx + lr.int(-1, 1), y = gy + lr.int(-1, 1);
            const w = lr.range(4, 7), h = lr.range(4, 6);
            const col = [c1, c1, c2, c3][lr.int(0, 3)];
            R(x + 1, y, w - 2, h, col); R(x, y + 1, w, h - 2, col);
          }
        }
        // 큰 덩이를 위에 얹어 명암 결을 만든다 — 격자만으로는 고르게 칠한 벽이 된다
        for (let i = 0; i < 9; i++) {
          const x = lr.range(-2, TS - 3), y = lr.range(-2, TS - 3);
          const w = lr.range(5, 9), h = lr.range(4, 8);
          const col = [c1, c2, c2, c3][lr.int(0, 3)];
          R(x + 1, y, w - 2, h, col); R(x, y + 1, w, h - 2, col);
        }
        for (let i = 0; i < 10; i++) R(lr.range(1, TS - 2), lr.range(1, TS - 2), 1, 1, c2);

        /* 위에 그려야 "이 잎이 저 줄기에 달려 있다"가 눈으로 읽힌다 — 사연: docs/code-history.md#h85 */
        const twig = s.noTwig ? () => {} : (x0, y0, x1, y1, th, col) => {
          const k = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let i = 0; i <= k; i++) {
            const t = i / k;
            R(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, th, th, col || tw);
          }
        };
        if (v === 0) {
          twig(-1, M + 2, M + 3, M, 3); twig(0, M + 2, M + 2, M, 1, tw2);
          twig(M - 3, M + 1, M + 4, M - 5, 2);          // 위로 갈라진 잔가지
        }
        if (v === 1) {
          twig(TS, M - 1, M - 4, M + 1, 3); twig(TS - 1, M - 1, M - 3, M + 1, 1, tw2);
          twig(M + 2, M, M - 5, M - 5, 2);
        }
        if (v === 2) {
          twig(M, TS, M, M - 3, 3); twig(M, TS - 1, M, M - 2, 1, tw2);
          twig(M, M + 1, M - 6, M - 4, 2); twig(M + 1, M + 3, M + 6, M - 1, 2);
        }
        // 가지 끝에 잎 두 덩이를 다시 얹어 막대기처럼 안 보이게 한다
        if (!s.noTwig && v !== 3) {
          const ex = v === 0 ? M + 3 : v === 1 ? M - 4 : M;
          const ey = v === 2 ? M - 3 : M;
          R(ex - 2, ey - 3, 5, 4, c1); R(ex - 1, ey - 4, 3, 6, c2);
        }
        // 발광 잎(버섯나무 갓 조각) — 은은한 빛무리를 얹는다.
        if (s.glow) {
          g.globalAlpha = .28; g.fillStyle = shade(base, 1.6);
          g.beginPath(); g.arc(TS / 2, TS / 2, TS * .55, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
        break;
      }

      case 'ebon':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {   // 갈라진 정맥
          let x = rng.range(0, TS);
          for (let y = 0; y < TS; y++) { R(x, y, rng.chance(.3) ? 2 : 1, 1, dk2); x += rng.range(-1.5, 1.5); }
        }
        for (let i = 0; i < 5; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), 2, 2, '#7d5aa8');
        this._speck(g, ox, oy, rng, 14, dk2, '#6a4a92');
        break;

      case 'glass':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) {   // 유리질 사선 반사
          const x = rng.range(0, TS - 6), y = rng.range(0, TS - 6), len = rng.range(4, 10);
          for (let k = 0; k < len; k++) R(x + k, y + k, 1, 1, k < len / 2 ? lt2 : lt);
        }
        for (let i = 0; i < 4; i++) R(rng.range(0, TS - 4), rng.range(0, TS - 4), rng.range(2, 5), rng.range(2, 4), dk2);
        R(0, 0, TS, 1, lt);
        break;

      case 'ore': {
        // 돌 베이스
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        // 광석 덩이
        const o = s.o, oL = shade(o, 1.4), oD = shade(o, .58);
        const n = rng.int(4, 6);
        for (let i = 0; i < n; i++) {
          const x = rng.range(1, TS - 7), y = rng.range(1, TS - 6);
          const w = rng.range(4, 7), h = rng.range(3, 6);
          R(x, y, w, h, o);
          R(x, y, w - 1, 1, oL);
          R(x + 1, y + h - 1, w - 1, 1, oD);
          R(x + 1, y + 1, 1, 1, oL);
        }
        if (s.glow) {
          g.globalAlpha = .22; g.fillStyle = oL; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        }
        break;
      }

      case 'plank': {
        const rows = 3, hgt = TS / rows;
        for (let i = 0; i < rows; i++) {
          const y = i * hgt;
          R(0, y, TS, hgt, i % 2 ? shade(base, .9) : shade(base, 1.07));
          R(0, y, TS, 1, lt);
          R(0, y + hgt - 1, TS, 1, dk2);
          const jx = rng.range(3, TS - 4);
          R(jx, y + 1, 1, hgt - 2, dk);
          for (let k = 0; k < 3; k++) R(rng.range(0, TS - 4), y + rng.range(1, hgt - 2), rng.range(2, 6), 1, dk);
        }
        break;
      }

      case 'brick': {
        this._fill(g, ox, oy, shade(base, .55));
        const bh = TS / 3, bw = TS / 2;
        for (let row = 0; row < 3; row++) {
          const y = row * bh, off = row % 2 ? -bw / 2 : 0;
          for (let bx = off; bx < TS; bx += bw) {
            const col = rng.chance(.5) ? base : shade(base, 1.12);
            R(bx + 1, y + 1, bw - 2, bh - 2, col);
            R(bx + 1, y + 1, bw - 2, 1, shade(col, 1.2));
            R(bx + 1, y + bh - 2, bw - 2, 1, shade(col, .78));
          }
        }
        break;
      }

      case 'torch':
        R(TS / 2 - 2, TS * .34, 4, TS * .64, '#6a4a28');
        R(TS / 2 - 2, TS * .34, 1, TS * .64, '#8f6740');
        R(TS / 2 - 3, TS * .14, 6, 8, '#e06a16');
        R(TS / 2 - 2, TS * .09, 4, 8, '#f7a92c');
        R(TS / 2 - 1, TS * .06, 2, 6, '#ffe98c');
        break;

      case 'platform':
        R(0, 0, TS, 7, base);
        R(0, 0, TS, 1, shade(base, 1.3));
        R(0, 6, TS, 1, shade(base, .55));
        R(rng.range(4, TS - 6), 1, 1, 5, shade(base, .68));
        R(rng.range(4, TS - 6), 1, 1, 5, shade(base, .68));
        break;

      case 'spike': {
        for (let i = 0; i < 3; i++) {
          const bx = ox + 2 + i * 6 + rng.range(-1, 1);
          g.fillStyle = shade(base, 1.15);
          g.beginPath(); g.moveTo(bx, oy + TS); g.lineTo(bx + 3, oy + TS - 12); g.lineTo(bx + 6, oy + TS); g.closePath(); g.fill();
        }
        break;
      }

      case 'flower': {
        const fx = ox + TS / 2 + rng.range(-3, 3), fy = oy + TS - 7;
        g.strokeStyle = shade('#4a7a34', .8); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(fx, oy + TS); g.lineTo(fx, fy); g.stroke();
        g.fillStyle = base;
        for (const [ddx, ddy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) { g.beginPath(); g.arc(fx + ddx, fy + ddy, 1.8, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe58a'; g.beginPath(); g.arc(fx, fy, 1.4, 0, TAU); g.fill();
        break;
      }
      case 'weed': {
        for (let i = 0; i < 3; i++) {
          const bx = ox + 3 + i * 6 + rng.range(-1, 1), h = rng.int(5, 10);
          g.strokeStyle = shade(base, .9 + i * .15); g.lineWidth = 1.3;
          g.beginPath(); g.moveTo(bx, oy + TS); g.quadraticCurveTo(bx + rng.range(-2, 2), oy + TS - h * .6, bx + rng.range(-1, 1), oy + TS - h); g.stroke();
        }
        break;
      }

      case 'cactusblock': {
        // 여러 칸을 세로로 쌓았을 때 이음매 없이 이어지도록 칸 전체 높이(0~TS)를 채운다
        const w = 15, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt);
        R(x0 + w - 2, 0, 2, TS, dk);
        for (let i = 0; i < 3; i++) {   // 세로 골(리브)
          const rx = x0 + 3 + i * 4;
          R(rx, 0, 1, TS, dk2);
        }
        for (let y = rng.range(1, 4); y < TS; y += rng.int(4, 7)) {   // 가시
          R(x0 - 1, y, 1, 1, '#e8dcc0'); R(x0 + w, y + rng.int(0, 2), 1, 1, '#e8dcc0');
        }
        break;
      }

      case 'cactustile': {
        const cx = ox + TS / 2 + rng.range(-2, 2), h = rng.int(9, 14);
        g.fillStyle = base;
        g.fillRect(cx - 2, oy + TS - h, 4, h);
        if (rng.chance(.6)) g.fillRect(cx - 5, oy + TS - h * .55, 3, h * .4);
        if (rng.chance(.6)) g.fillRect(cx + 2, oy + TS - h * .7, 3, h * .45);
        g.fillStyle = shade(base, 1.3); g.fillRect(cx - 2, oy + TS - h, 1, h);
        break;
      }
      case 'mushroomtile': {
        // 눈에 잘 띄게 큼직한 광대버섯 스타일(붉은 갓 + 흰 반점)로 하나, 옆에 작은 것 하나
        const specs = [[ox + TS / 2 + 1, 10, 6, 4.4], [ox + 7 + rng.range(-1, 1), 6, 3.4, 2.6]];
        for (const [bx, h, capW, capH] of specs) {
          g.fillStyle = '#e8dcc0'; g.fillRect(bx - 1.5, oy + TS - h, 3, h);
          g.fillStyle = base;
          g.beginPath(); g.ellipse(bx, oy + TS - h + 1, capW, capH, 0, Math.PI, 2 * Math.PI); g.fill();
          g.fillStyle = '#fff2d8';
          g.beginPath(); g.arc(bx - capW * .4, oy + TS - h - capH * .3, 1, 0, TAU); g.fill();
          g.beginPath(); g.arc(bx + capW * .3, oy + TS - h - capH * .1, .8, 0, TAU); g.fill();
        }
        break;
      }

      case 'vine': {
        let x = TS / 2;
        for (let y = 0; y < TS; y++) {
          x = clamp(x + rng.range(-.7, .7), 3, TS - 5);
          R(x, y, 2, 1, base);
          if (rng.chance(.16)) R(x + (rng.chance(.5) ? -3 : 2), y, 3, 2, shade(base, 1.25));
        }
        break;
      }

      /* ---------- 설계 유리 ---------- */
      case 'draftglass': {
        this._fill(g, ox, oy, shade(base, .28));
        g.save();
        g.globalAlpha = .5;
        for (let x = 2; x < TS; x += 5) R(x, 0, 1, TS, shade(base, .62));
        for (let y = 2; y < TS; y += 5) R(0, y, TS, 1, shade(base, .62));
        g.globalAlpha = 1;
        // 도면 선 — 직각으로 몇 번 꺾이는 한 줄
        let px = rng.range(2, TS - 6), py = rng.range(2, TS - 6);
        for (let k = 0; k < 5; k++) {
          const len = rng.range(4, 9), horiz = k % 2 === 0;
          R(px, py, horiz ? len : 1, horiz ? 1 : len, shade(base, 1.5));
          if (horiz) px += len; else py += len;
          if (px > TS - 3) px = 2; if (py > TS - 3) py = 2;
        }
        for (let i = 0; i < 3; i++) R(rng.range(1, TS - 2), rng.range(1, TS - 2), 2, 2, '#eaffff');
        g.restore();
        break;
      }

      case 'crystal': {
        this._fill(g, ox, oy, shade(base, .42));
        for (let i = 0; i < 4; i++) {
          const x = rng.range(0, TS - 8), y = rng.range(0, TS - 9);
          const w = rng.range(5, 9), h = rng.range(6, 12);
          g.fillStyle = shade(base, .62 + i * .16);
          g.beginPath();
          g.moveTo(ox + x + w / 2, oy + y);
          g.lineTo(ox + x + w, oy + y + h * .42);
          g.lineTo(ox + x + w / 2, oy + y + h);
          g.lineTo(ox + x, oy + y + h * .42);
          g.closePath(); g.fill();
          R(x + w / 2 - 1, y + 1, 1, h * .42, shade(base, 1.5));
        }
        break;
      }

      case 'cloud': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) {
          const x = rng.range(-2, TS - 4), y = rng.range(-2, TS - 4), r = rng.range(3, 7);
          g.fillStyle = rng.chance(.5) ? lt2 : shade(base, .9);
          g.beginPath(); g.arc(x + r / 2, y + r / 2, r / 2, 0, TAU); g.fill();
        }
        R(0, 0, TS, 2, '#ffffff');
        R(0, TS - 3, TS, 3, shade(base, .82));
        break;
      }

      case 'ruintile': {
        this._fill(g, ox, oy, base);
        R(0, 0, TS, 1.4, lt); R(0, TS - 2, TS, 2, dk2);
        R(TS / 2 - .7, 0, 1.4, TS, dk);
        for (let i = 0; i < 10; i++) this._r(g, ox, oy, rng.range(0, TS - 1), rng.range(0, TS - 1), 1, 1, rng.chance(.5) ? dk2 : lt);
        break;
      }

      case 'runestone': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) R(rng.range(-1, TS - 4), rng.range(-1, TS - 4), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        // 발광 룬
        const gl = '#9fe8d8';
        R(TS * .3, TS * .22, 1.6, TS * .56, gl);
        R(TS * .3, TS * .22, TS * .4, 1.6, gl);
        R(TS * .3, TS * .48, TS * .3, 1.6, gl);
        R(TS * .64, TS * .5, 1.6, TS * .28, gl);
        g.globalAlpha = .3; g.fillStyle = gl; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        break;
      }

      case 'seal': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        // 사슬 문양
        g.strokeStyle = '#8a7fc0'; g.lineWidth = 2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, TS * .3, 0, TAU); g.stroke();
        g.lineWidth = 1;
        R(TS / 2 - 1, TS * .12, 2, TS * .76, '#8a7fc0');
        g.globalAlpha = .22; g.fillStyle = '#a06fff'; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        break;
      }

      /* ---------- 동굴 물 ---------- */
      case 'water': {
        g.save();
        g.globalAlpha = s.fall ? 0.5 : 0.62;
        this._fill(g, ox, oy, base);
        g.globalAlpha = 1;
        if (s.fall) {
          // 떨어지는 물 — 세로로 길게 흐르는 줄기
          for (let i = 0; i < 5; i++) {
            const x = rng.range(0, TS - 2);
            g.globalAlpha = rng.range(.25, .6);
            R(x, rng.range(-4, 0), rng.range(1, 3), rng.range(10, TS + 4), lt2);
          }
          g.globalAlpha = .5;
          for (let i = 0; i < 10; i++) R(rng.range(0, TS - 1), rng.range(0, TS - 1), 1, rng.range(2, 5), '#eaf6ff');
        } else {
          // 고인 물 — 가로로 흔들리는 잔물결과 바닥 쪽 어둠
          g.globalAlpha = .34;
          for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 4), rng.range(0, TS - 2), rng.range(4, 11), 1, lt2);
          g.globalAlpha = .22;
          R(0, TS - 5, TS, 5, dk2);
          g.globalAlpha = .5;
          this._speck(g, ox, oy, rng, 8, lt, dk);
        }
        g.restore();
        break;
      }

      case 'lava':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 8; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 8), rng.range(2, 5), rng.chance(.5) ? shade(base, 1.32) : shade(base, .72));
        R(0, 0, TS, 2, shade(base, 1.5));
        this._speck(g, ox, oy, rng, 14, '#ffd27a', shade(base, .6));
        break;

      /* ---------- 유혈암 ---------- */
      case 'oilshale': {
        this._fill(g, ox, oy, base);
        let y = rng.range(-3, 0);
        while (y < TS) { const h = rng.range(2, 4.5); R(0, y, TS, h, rng.chance(.5) ? dk : lt); y += h; }
        // 기름이 밴 광택 — 검은 얼룩 위에 무지갯빛 한 점
        for (let i = 0; i < 4; i++) {
          const x = rng.range(0, TS - 4), yy = rng.range(0, TS - 3);
          R(x, yy, rng.range(3, 6), rng.range(2, 3), '#1a1712');
          R(x + 1, yy, 1, 1, rng.chance(.5) ? '#5a7f6a' : '#7a6a8a');
        }
        this._speck(g, ox, oy, rng, 12, '#12100c', '#6a6050');
        break;
      }

      /* ---------- 기계 ---------- */
      case 'mk_belt': {
        R(0, 6, TS, TS - 10, dk2);
        R(0, 6, TS, 2, lt);
        R(0, TS - 5, TS, 1, shade(base, .4));
        for (let x = 1; x < TS; x += 4) R(x, 8, 2, TS - 14, shade(base, .92));   // 벨트 마디
        R(0, 5, 2, TS - 8, shade(base, .6)); R(TS - 2, 5, 2, TS - 8, shade(base, .6));
        break;
      }
      case 'mk_drill': {
        this._mkBody(g, ox, oy, base, R);
        R(7, 3, 8, 4, shade(base, 1.45));                   // 모터 덮개
        for (let k = 0; k < 3; k++) R(8 + k * 2, 8 + k, 2, TS - 11 - k * 2, '#c8ccd4');   // 비트
        R(9, TS - 4, 4, 2, '#8a8e96');
        break;
      }
      case 'mk_pump': {
        this._mkBody(g, ox, oy, base, R);
        R(4, 4, 3, TS - 8, shade(base, .5)); R(15, 4, 3, TS - 8, shade(base, .5));
        R(4, 8, 14, 3, '#2a2620');                          // 흔들대
        R(9, 10, 4, TS - 13, '#3a352c');
        R(7, TS - 5, 8, 3, shade(base, 1.3));
        break;
      }
      case 'mk_furnace': {
        this._mkBody(g, ox, oy, base, R);
        R(5, 9, 12, 8, '#1e1a16');                          // 화구
        R(6, 12, 10, 5, '#e8842a');
        R(7, 14, 8, 3, '#ffcf6a');
        R(6, 3, 4, 4, shade(base, .5)); R(13, 3, 4, 4, shade(base, .5));   // 굴뚝
        break;
      }
      case 'mk_gen': {
        this._mkBody(g, ox, oy, base, R);
        R(3, 12, 9, 7, '#1e1a16');                          // 화실
        R(4, 15, 7, 4, '#e8842a');
        R(5, 17, 5, 2, '#ffcf6a');
        g.fillStyle = '#c8ccd4';                            // 플라이휠 — 용광로와 구분되는 표식
        g.beginPath(); g.arc(ox + 15, oy + 10, 5, 0, TAU); g.fill();
        g.fillStyle = '#4a4a54';
        g.beginPath(); g.arc(ox + 15, oy + 10, 2.2, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .5;
          R(15 + Math.cos(a) * 5 - 1, 10 + Math.sin(a) * 5 - 1, 2, 2, '#8a8e99');
        }
        R(4, 2, 4, 4, shade(base, .45));                    // 배기구
        R(12, 3, 7, 2, '#4a4a54');                          // 축
        break;
      }
      case 'mk_press': {
        this._mkBody(g, ox, oy, base, R);
        R(2, 2, 18, 6, '#2e2e38');                          // 프레스 헤드 (어두운 강철)
        R(2, 2, 18, 1.5, '#9aa0ad');
        R(2, 7, 18, 1.5, '#12121a');
        R(9, 8, 4, 4, '#c8ccd4');                           // 램
        R(2, TS - 8, 18, 5, '#2e2e38');                     // 모루
        R(2, TS - 8, 18, 1.5, '#9aa0ad');
        R(4, 12, 2, 5, '#12121a'); R(16, 12, 2, 5, '#12121a');   // 안내 기둥
        break;
      }
      case 'mk_tank': {
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = shade(base, 1.35);
        g.beginPath(); g.ellipse(ox + TS / 2, oy + 11, 7, 8, 0, 0, TAU); g.fill();
        g.fillStyle = '#2e2a24';
        g.beginPath(); g.ellipse(ox + TS / 2, oy + 13, 5, 5, 0, 0, TAU); g.fill();
        R(TS / 2 - 1, 2, 2, 4, shade(base, .5));
        break;
      }
      case 'mk_gear': {
        this._mkBody(g, ox, oy, base, R);
        const cx = ox + TS / 2, cy = oy + TS / 2;
        g.fillStyle = shade(base, 1.5);
        g.beginPath(); g.arc(cx, cy, 6.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, .45);
        g.beginPath(); g.arc(cx, cy, 2.4, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) {                        // 톱니
          const a = k * TAU / 6;
          R(TS / 2 + Math.cos(a) * 8 - 1.5, TS / 2 + Math.sin(a) * 8 - 1.5, 3, 3, shade(base, 1.5));
        }
        break;
      }
      case 'mk_crate': {
        // 나무 상자(저장 상자류)와 헷갈리지 않도록 다른 기계들과 같은 금속 뼈대(_mkBody)를 쓰고, 위쪽 투입구+아래쪽 저장 칸 표식만 얹는다 — "기계"로 한눈에 묶여 보이면서도
        // 크레이트 특유의 표식은 남긴다.
        this._mkBody(g, ox, oy, base, R);
        R(4, 3, TS - 8, 5, '#1e1a16');                       // 위쪽 투입구
        R(5, 4, TS - 10, 3, shade(base, .5));
        for (let k = 0; k < 3; k++) R(4 + k * 5, TS - 8, 3, 4, shade(base, 1.35));   // 저장 칸
        break;
      }
      case 'mk_battery': {
        this._mkBody(g, ox, oy, base, R);
        R(6, 2, 4, 2, shade(base, 1.5)); R(13, 2, 4, 2, shade(base, 1.5));   // 단자
        R(4, 5, 15, TS - 8, '#1e2a28');
        R(5, 6, 13, 3, '#6fe0c0');                           // 잔량 눈금
        R(5, 10, 13, 3, shade('#6fe0c0', .55));
        R(5, 14, 13, 3, shade('#6fe0c0', .3));
        break;
      }
      case 'mk_pole': {
        R(TS / 2 - 2, 2, 4, TS - 3, base);
        R(TS / 2 - 2, 2, 1.5, TS - 3, lt);
        R(2, 4, TS - 4, 2, shade(base, 1.25));               // 가로대
        R(3, 3, 2, 4, '#4a4a52'); R(TS - 5, 3, 2, 4, '#4a4a52');
        R(2, 9, TS - 4, 1, shade(base, .6));
        R(TS / 2 - 4, 9, 2, 2, '#8fd8ff');
        break;
      }
      case 'mk_sorter': {
        this._mkBody(g, ox, oy, base, R);
        R(3, 9, 16, 4, '#2a2620');
        R(4, 10, 6, 2, '#8fd8ff');                           // 통과선
        R(12, 10, 6, 2, '#e0a03c');                          // 분기선
        R(11, 5, 2, 12, shade(base, 1.5));
        break;
      }
      case 'mk_turret': {
        R(2, TS - 8, 18, 6, shade(base, .8));                // 받침대
        R(2, TS - 8, 18, 1.5, shade(base, 1.5));
        R(4, TS - 3, 3, 3, '#22222a'); R(15, TS - 3, 3, 3, '#22222a');
        g.fillStyle = shade(base, 1.7);                      // 포탑 머리
        g.beginPath(); g.arc(ox + TS / 2, oy + 11, 6.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.1);
        g.beginPath(); g.arc(ox + TS / 2 + 1, oy + 12, 4.6, 0, TAU); g.fill();
        R(TS / 2 - 2, 0, 4, 12, '#1e1e26');                  // 총열
        R(TS / 2 - 2, 0, 1.4, 12, '#8a8e99');
        R(TS / 2 - 3, 0, 6, 2.5, '#d8dce4');                 // 총구
        R(TS / 2 - 6, 9, 2.5, 2.5, '#e0563c');               // 조준등
        break;
      }
      case 'mk_trap': {
        R(0, TS - 8, TS, 8, shade(base, .55));
        R(0, TS - 8, TS, 2, lt);
        for (let x = 2; x < TS - 2; x += 5) R(x, TS - 12, 2, 5, '#c8ccd4');   // 전극
        R(3, TS - 14, 2, 3, '#9fd8ff'); R(13, TS - 15, 2, 4, '#9fd8ff');
        break;
      }
      /* ---------- 정글 / 버섯 골짜기 ---------- */
      case 'mud':
        // 흙과 헷갈리지 않게 더 어둡게 깔고, 물기와 뿌리를 얹어 젖은 땅으로 읽히게 한다
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 9; i++)
          R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 8), rng.range(2, 5), rng.chance(.5) ? dk2 : base);
        for (let i = 0; i < 4; i++) {                 // 고인 물기
          const x = rng.range(1, TS - 5), y = rng.range(1, TS - 3);
          R(x, y, rng.range(3, 5), 1.4, lt2);
          R(x, y + 1.4, rng.range(2, 4), 1, lt);
        }
        for (let i = 0; i < 2; i++) {                 // 파고든 잔뿌리
          let rx = rng.range(2, TS - 2), ry = rng.range(0, 4);
          for (let k = 0; k < rng.int(4, 9); k++) { R(rx, ry, 1, 1, '#2f5a28'); rx += rng.range(-1, 1); ry += rng.range(.7, 1.6); }
        }
        this._speck(g, ox, oy, rng, 22, '#241a10', lt);
        break;

      case 'fern': {
        // 잎 여러 장이 바닥에서 부챗살처럼 퍼진다
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.42 + rng.range(-.1, .1);
          const len = rng.range(8, 14), bx = TS / 2 + rng.range(-3, 3);
          const col = i % 2 ? base : shade(base, 1.22);
          for (let k = 0; k < len; k++) {
            const px = bx + Math.cos(a) * k, py = TS - 1 + Math.sin(a) * k;
            R(px, py, 1.6, 1.6, col);
            if (k % 3 === 1) {                        // 잔잎
              R(px - 2, py, 2, 1, shade(col, .8));
              R(px + 1.6, py, 2, 1, shade(col, .8));
            }
          }
        }
        break;
      }

      case 'orchid': {
        const stem = '#3f7a34';
        R(TS / 2 - 1, TS - 10, 2, 10, stem);
        R(TS / 2 - 4, TS - 6, 3, 1.4, stem); R(TS / 2 + 2, TS - 8, 3, 1.4, stem);
        const cx = TS / 2, cy = TS - 13;
        for (let k = 0; k < 5; k++) {                 // 꽃잎 다섯 장
          const a = k * TAU / 5 - Math.PI / 2;
          g.fillStyle = k % 2 ? base : lt;
          g.beginPath();
          g.ellipse(ox + cx + Math.cos(a) * 3.4, oy + cy + Math.sin(a) * 3.4, 2.6, 1.9, a, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffe08a';
        g.beginPath(); g.arc(ox + cx, oy + cy, 1.7, 0, TAU); g.fill();
        /* 판 둘레에 초록 물빛(반지름 7 원)을 옅게 깔던 것을 뺐다 — 물 위에 초록 얼룩이 칸마다 떠서 수면이 수련 칸에서만 탁해 보였다. */
        break;
      }

      case 'kelpplant': {
        /* 해초 — 물속이므로 **물을 먼저 깔고** 그 위에 잎을 세운다(수련·공기 주머니와 같은 방식). */
        // 물은 game.js 가 밑에 깐다(UNDER_LIQ) — 수련과 같은 까닭
        const sway = rng.range(-2.5, 2.5);
        for (let k = 0; k < 3; k++) {
          const bx = 5 + k * 6 + rng.range(-1, 1);
          const h = TS - rng.range(3, 9);
          g.strokeStyle = k === 1 ? lt : base;
          g.lineWidth = 2.2; g.lineCap = 'round';
          g.beginPath();
          g.moveTo(ox + bx, oy + TS);
          g.quadraticCurveTo(ox + bx + sway, oy + TS - h * 0.55, ox + bx + sway * 1.8, oy + TS - h);
          g.stroke();
        }
        g.lineWidth = 1; g.lineCap = 'butt';
        break;
      }
      case 'seashell': {
        /* 조개 — 모래 위에 놓인 부채꼴. */
        const cx = ox + TS / 2 + rng.range(-4, 4), by = oy + TS - 1;
        const r = rng.range(4.5, 6.5);
        g.fillStyle = '#2b2419';                                   // 어두운 테두리 — 모래와 붙지 않게
        g.beginPath(); g.moveTo(cx - r - 1, by); g.arc(cx, by, r + 1, Math.PI, 0); g.closePath(); g.fill();
        g.fillStyle = base;
        g.beginPath(); g.moveTo(cx - r, by); g.arc(cx, by, r, Math.PI, 0); g.closePath(); g.fill();
        g.strokeStyle = shade(base, .62); g.lineWidth = .8;         // 부챗살
        for (let k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(cx, by);
          g.lineTo(cx + k * r * 0.42, by - r * 0.92); g.stroke();
        }
        g.fillStyle = shade(base, 1.3);                            // 윗면 반짝임
        g.fillRect(cx - r * 0.45, by - r * 0.75, r * 0.9, 1.2);
        break;
      }
      case 'tripmine': {
        // 바닥에 박힌 원반 — 밟기 전에는 조용하다.
        R(0, TS - 8, TS, 8, shade(base, .7));
        R(2, TS - 9, TS - 4, 3, base);
        R(TS / 2 - 4, TS - 11, 8, 3, shade(base, 1.3));
        R(TS / 2 - 1, TS - 12, 2, 2, '#e0563c');
        for (let k = 0; k < 3; k++) R(3 + k * 6, TS - 4, 2, 2, shade(base, .5));
        break;
      }
      case 'airpocket': {
        /* 물속에 갇힌 공기 — 사연: docs/code-history.md#h86 */
        this.paint(g, ox, oy, ART[T.WATER], rng);
        /* 덧칠은 **아주 얇게**. 0.10만 얹어도 평균 색이 물보다 27만큼 밝아져 물 한가운데 흰 자국처럼 보였다(실측). */
        R(0, 0, TS, TS, 'rgba(200,232,255,.045)');
        R(0, 0, TS, 2, 'rgba(216,242,255,.09)');             // 위쪽에 눌린 공기층
        for (let k = 0; k < 4; k++) {                        // 잔거품
          const bx = rng.int(2, TS - 4), by = rng.int(3, TS - 4);
          R(bx, by, 2, 2, 'rgba(226,244,255,.20)');
        }
        break;
      }
      case 'palmwood': {
        /* 야자 줄기 — 잿빛 숲 나무(trunk)와 달리 **가늘고 마디가 굵다.** */
        const w = 9, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt); R(x0 + w - 2, 0, 2, TS, dk);
        for (let y = rng.range(0, 3); y < TS; y += rng.int(4, 6))   // 마디
          R(x0, y, w, 1.5, dk2);
        break;
      }
      case 'palmleaf': {
        /* 야자 잎갓 — 여러 칸이 가로로 이어져 하나의 갓이 된다 — 사연: docs/code-history.md#h87 */
        const lt2 = shade(base, 1.32), dk3 = shade(base, .58);
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) {                       // 잎맥 — 위에서 아래로 처진다
          const x0 = rng.range(0, TS), sag = rng.range(3, 7);
          g.strokeStyle = i % 2 ? dk3 : lt2; g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(ox + x0, oy + rng.range(0, 4));
          g.quadraticCurveTo(ox + x0 + rng.range(-5, 5), oy + TS / 2, ox + x0 + rng.range(-7, 7), oy + TS - 1 - rng.range(0, sag));
          g.stroke();
        }
        this._speck(g, ox, oy, rng, 16, dk3, lt2);
        /* 아래·위 가장자리를 톱니처럼 **지운다.** — 사연: docs/code-history.md#h88 */
        for (let x = 0; x < TS; x += 2) {
          if (rng.chance(.55)) g.clearRect(ox + x, oy + TS - rng.int(2, 4), 2, 4);
          if (rng.chance(.35)) g.clearRect(ox + x, oy, 2, rng.int(1, 3));
        }
        g.clearRect(ox, oy, 2, 2); g.clearRect(ox + TS - 2, oy, 2, 2);   // 위 모서리
        break;
      }
      case 'coconut': {
        // 열매 셋이 줄기 아래 매달린다.
        for (const [dx, dy, r] of [[-3.5, 1, 3.4], [3.5, 0, 3.4], [0, 4, 3]]) {
          const cx = TS / 2 + dx, cy = TS / 2 + dy;
          g.fillStyle = base; g.beginPath(); g.arc(ox + cx, oy + cy, r, 0, TAU); g.fill();
          g.fillStyle = shade(base, 1.35);
          g.beginPath(); g.arc(ox + cx - r * .3, oy + cy - r * .3, r * .32, 0, TAU); g.fill();
          g.fillStyle = shade(base, .58); R(cx - 1, cy - r, 2, 1.5, shade(base, .58));
        }
        break;
      }
      case 'roomair': {
        /* 방 안의 공기. */
        if (rng.chance(.35)) R(rng.int(3, TS - 4), rng.int(3, TS - 4), 1, 1, 'rgba(255,226,170,.13)');
        break;
      }
      case 'lily': {
        /* 수면에 뜬 얇은 초록 판. */
        const cx = TS / 2, cy = 3.5;                   // 판의 중심선 (타일 위쪽)
        const rx = TS / 2 - 0.5, ry = 3;
        /* 판 밑은 물이다 — 이 칸도 물칸(liquid)이다. */
        g.fillStyle = base;
        g.beginPath(); g.ellipse(ox + cx, oy + cy, rx, ry, 0, 0, TAU); g.fill();
        // V자 노치 — 오른쪽을 물빛으로 도려내 연잎 특유의 갈라진 실루엣을 만든다
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.moveTo(ox + cx + rx + 1, oy + cy);
        g.lineTo(ox + cx + rx - 4.5, oy + cy - 2.6);
        g.lineTo(ox + cx + rx - 4.5, oy + cy + 2.6);
        g.closePath(); g.fill();
        g.restore();
        g.fillStyle = lt;                              // 윗면 하이라이트 (판이 물에 뜬 느낌)
        g.beginPath(); g.ellipse(ox + cx - 1, oy + cy - 1, rx - 3, 1, 0, 0, TAU); g.fill();
        g.fillStyle = dk;                              // 아랫면 그림자
        g.beginPath(); g.ellipse(ox + cx, oy + cy + 1.8, rx - 2, 0.9, 0, 0, TAU); g.fill();
        g.strokeStyle = dk; g.lineWidth = .7;          // 잎맥 — 가운데에서 부챗살로
        for (let k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(ox + cx, oy + cy);
          g.lineTo(ox + cx + k * 3.6, oy + cy + (k % 2 ? 2 : -2));
          g.stroke();
        }
        const fx = ox + cx - 5, fy = oy + cy - 3.2;    // 작은 연꽃 — 판 위에 얹는다
        g.fillStyle = '#f7d6ea';
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .4;
          g.beginPath();
          g.ellipse(fx + Math.cos(a) * 1.5, fy + Math.sin(a) * 1.1, 1.3, .9, a, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffe08a';
        g.beginPath(); g.arc(fx, fy, .9, 0, TAU); g.fill();
        break;
      }

      case 'spring': {
        /* 샘 바위 — 돌 바탕에 젖어 검게 번진 틈 하나와 거기서 새는 물방울. */
        this.paint(g, ox, oy, ART[T.STONE], rng);
        g.globalAlpha = .45; R(0, 0, TS, TS, '#2a4a5a'); g.globalAlpha = 1;
        const cx0 = rng.range(7, TS - 8);
        for (let y = 0; y < TS; y += 2) R(cx0 + Math.sin(y * .7) * 2, y, 2, 2, '#1a2a32');   // 틈
        R(cx0 - 1, TS - 4, 5, 4, '#3f7fa8');                                                 // 고인 물기
        g.globalAlpha = .7;
        for (let k = 0; k < 4; k++) R(rng.range(2, TS - 3), rng.range(4, TS - 2), 1, rng.range(2, 4), '#8fd0f0');
        g.globalAlpha = 1;
        R(cx0, TS - 2, 2, 2, '#bfe8ff');
        break;
      }
      case 'cattail': {
        /* 부들 — 가는 줄기 서너 대에 갈색 이삭. */
        for (let k = 0; k < 4; k++) {
          const bx = 4 + k * 4.5 + rng.range(-1, 1), h = rng.range(12, TS - 1), lean = rng.range(-1.5, 1.5);
          g.strokeStyle = k % 2 ? lt : base; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(ox + bx, oy + TS); g.quadraticCurveTo(ox + bx, oy + TS - h / 2, ox + bx + lean, oy + TS - h); g.stroke();
          if (k % 2 === 0) {                                  // 이삭
            g.fillStyle = '#6a4424';
            g.beginPath(); g.ellipse(ox + bx + lean, oy + TS - h + 3, 1.4, 3, 0, 0, TAU); g.fill();
          } else {                                            // 잎 — 이삭 없이 뾰족하게
            g.strokeStyle = dk; g.beginPath(); g.moveTo(ox + bx, oy + TS - 3);
            g.lineTo(ox + bx + lean * 3, oy + TS - h * .7); g.stroke();
          }
        }
        break;
      }
      case 'pondweed': {
        /* 물풀 — 물속 바닥에서 올라온 가는 잎. */
        const sway = rng.range(-2, 2);
        for (let k = 0; k < 5; k++) {
          const bx = 3 + k * 4 + rng.range(-1, 1), h = rng.range(7, 15);
          g.strokeStyle = k % 2 ? lt : base; g.lineWidth = 1;
          g.beginPath(); g.moveTo(ox + bx, oy + TS);
          g.quadraticCurveTo(ox + bx + sway, oy + TS - h / 2, ox + bx + sway * 1.6, oy + TS - h); g.stroke();
          g.fillStyle = k % 2 ? base : lt;
          for (let j = 1; j < 3; j++) g.fillRect(ox + bx + sway * j * .5, oy + TS - h * j / 3, 2, 1);
        }
        break;
      }
      case 'pebbles': {
        /* 물가 조약돌 — 바닥에 둥글게 닳은 돌 몇 개. */
        for (let k = 0; k < 5; k++) {
          const px = rng.range(3, TS - 4), rx = rng.range(1.8, 3.4), ry = rx * rng.range(.55, .75);
          const c = [base, lt, dk, '#b8b0a4', '#7f8a8c'][k];
          g.fillStyle = c;
          g.beginPath(); g.ellipse(ox + px, oy + TS - ry, rx, ry, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(ox + px - rx * .4, oy + TS - ry * 1.6, 1.5, 1);
        }
        break;
      }

      case 'sporestone':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++)
          R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 6; i++) {                 // 바위에 박힌 포자 알갱이
          const x = rng.range(1, TS - 3), y = rng.range(1, TS - 3);
          R(x, y, 2, 2, '#4a8a78');
          R(x, y, 1, 1, '#7fd0b8');
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        break;

      case 'glowcap': {
        const specs = [[TS / 2 + rng.range(-1, 1), 12, 7, 5], [7 + rng.range(-1, 1), 7, 4, 3]];
        for (const [bx, h, capW, capH] of specs) {
          R(bx - 1.6, TS - h, 3.2, h, '#dff0e8');     // 자루
          g.fillStyle = base;
          g.beginPath(); g.ellipse(ox + bx, oy + TS - h + 1, capW, capH, 0, Math.PI, 2 * Math.PI); g.fill();
          g.fillStyle = shade(base, 1.35);
          g.beginPath(); g.ellipse(ox + bx, oy + TS - h, capW * .62, capH * .6, 0, Math.PI, 2 * Math.PI); g.fill();
          R(bx - capW, TS - h + 1, capW * 2, 1.2, shade(base, .7));
        }
        g.globalAlpha = .26; g.fillStyle = base;      // 스스로 내는 빛
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 12, 10, 0, TAU); g.fill();
        g.globalAlpha = 1;
        break;
      }

      /* ---------- 마을 건축 ---------- */
      case 'thatch': {
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 40; i++) {          // 비스듬히 눕힌 짚단
          const x = rng.range(-3, TS), y = rng.range(0, TS - 2);
          const len = rng.range(4, 9);
          const col = [base, lt, dk, shade(base, .88)][rng.int(0, 3)];
          for (let k = 0; k < len; k++) R(x + k, y + k * .32, 1, 1, col);
        }
        R(0, 0, TS, 2, lt2);                    // 처마 끝의 밝은 줄
        R(0, TS - 2, TS, 2, shade(base, .55));
        break;
      }
      case 'rooftile': {
        this._fill(g, ox, oy, dk2);
        for (let row = 0; row < 3; row++) {     // 겹쳐 얹은 기와
          const y = row * 7.5 - 1, off = (row % 2) ? 4 : 0;
          for (let x = -8; x < TS; x += 8) {
            R(x + off, y, 7, 7, base);
            R(x + off, y, 7, 1.5, lt);
            R(x + off + 6, y, 1, 7, dk2);
            R(x + off + 1, y + 6, 5, 1, shade(base, .62));
          }
        }
        break;
      }
      case 'timber': {
        this._fill(g, ox, oy, base);            // 회반죽
        this._speck(g, ox, oy, rng, 20, shade(base, .9), lt2);
        const w2 = s.g, wl = shade(w2, 1.25), wd = shade(w2, .7);
        R(0, 0, TS, 3, w2); R(0, 0, TS, 1, wl);        // 상하 인방
        R(0, TS - 3, TS, 3, w2); R(0, TS - 1, TS, 1, wd);
        R(0, 0, 3, TS, w2); R(0, 0, 1, TS, wl);        // 좌우 기둥
        R(TS - 3, 0, 3, TS, w2); R(TS - 1, 0, 1, TS, wd);
        for (let k = 0; k < TS; k++) R(3 + k * .72, 3 + k * .72, 2, 2, w2);   // 빗대
        break;
      }
      case 'ashlar': {
        this._fill(g, ox, oy, base);            // 다듬은 큰 돌
        const rows = [[0, 11], [11, 11]];
        for (const [y, h] of rows) {
          const off = y ? 6 : 0;
          for (let x = -11; x < TS; x += 12) {
            R(x + off + 1, y + 1, 10, h - 2, rng.chance(.5) ? lt : base);
            R(x + off + 1, y + 1, 10, 1.2, lt2);
            R(x + off + 1, y + h - 2, 10, 1.2, dk2);
          }
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        break;
      }
      case 'battlement': {
        // 흉벽: 아래는 꽉 찬 벽, 위는 이가 빠져 있다 (총안)
        R(0, 8, TS, TS - 8, base);
        R(0, 8, TS, 1.5, lt2);
        R(0, TS - 2, TS, 2, dk2);
        R(0, 0, 8, 9, base); R(0, 0, 8, 1.5, lt2);
        R(TS - 8, 0, 8, 9, base); R(TS - 8, 0, 8, 1.5, lt2);
        R(7, 0, 1.5, 9, dk2); R(TS - 8, 0, 1.5, 9, dk2);
        this._speck(g, ox, oy, rng, 14, dk2, lt);
        break;
      }
      case 'windowtile': {
        const fr = '#6a4a2a', frl = shade(fr, 1.3);
        R(0, 0, TS, TS, fr);
        R(0, 0, TS, 1.5, frl);
        R(2, 2, TS - 4, TS - 4, shade(base, .6));
        g.globalAlpha = .55; R(2, 2, TS - 4, TS - 4, base); g.globalAlpha = 1;
        R(TS / 2 - 1, 2, 2, TS - 4, fr);        // 창살
        R(2, TS / 2 - 1, TS - 4, 2, fr);
        R(4, 4, 5, 5, lt2);                     // 유리 반사
        R(TS - 8, TS - 9, 3, 4, shade(base, 1.2));
        break;
      }
      case 'fencetile': {
        R(2, 6, 3, TS - 6, base);               // 기둥 둘
        R(TS - 5, 6, 3, TS - 6, base);
        R(2, 6, 1, TS - 6, lt); R(TS - 5, 6, 1, TS - 6, lt);
        R(0, 9, TS, 2.5, base); R(0, 9, TS, 1, lt);     // 가로대 둘
        R(0, 15, TS, 2.5, base); R(0, 15, TS, 1, lt);
        R(2, 5, 3, 1.5, lt2); R(TS - 5, 5, 3, 1.5, lt2);
        break;
      }
      case 'lamppost': {
        const pole = '#4a4a52';
        R(TS / 2 - 1.5, 8, 3, TS - 8, pole);
        R(TS / 2 - 1.5, 8, 1, TS - 8, shade(pole, 1.5));
        R(TS / 2 - 5, TS - 2, 10, 2, pole);     // 받침
        R(TS / 2 - 4, 2, 8, 8, shade(pole, .8));   // 등집
        R(TS / 2 - 3, 3, 6, 6, base);
        R(TS / 2 - 2, 4, 4, 4, lt2);
        R(TS / 2 - 5, 1, 10, 2, pole);
        g.globalAlpha = .3; g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + 6, 9, 0, TAU); g.fill();
        g.globalAlpha = 1;
        break;
      }
      case 'bannertile': {
        R(1, 0, TS - 2, 2.5, '#6a4a2a');        // 가로대
        R(4, 2, TS - 8, TS - 6, base);          // 천
        R(4, 2, 2, TS - 6, lt);
        R(TS - 6, 2, 2, TS - 6, dk);
        // 아래 갈라진 끝
        R(4, TS - 4, 5, 2, base); R(TS - 9, TS - 4, 5, 2, base);
        R(TS / 2 - 3, 6, 6, 6, '#e8d8a0');      // 문장 — 별 조각
        R(TS / 2 - 1, 4, 2, 10, '#e8d8a0');
        break;
      }
      case 'hay': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 30; i++) {
          const x = rng.range(0, TS - 5), y = rng.range(0, TS - 1);
          R(x, y, rng.range(3, 6), 1, rng.chance(.5) ? lt : dk);
        }
        R(0, 2, TS, 1.5, '#8a6a2a'); R(0, TS - 5, TS, 1.5, '#8a6a2a');   // 묶은 끈
        R(0, 0, TS, 1.5, lt2);
        break;
      }
      case 'sandbagtile': {
        this._fill(g, ox, oy, dk2);
        for (const [x, y, w2] of [[-2, 0, 13], [10, 0, 13], [3, 8, 13], [-4, 15, 13], [12, 15, 13]]) {
          g.fillStyle = rng.chance(.5) ? base : lt;
          g.beginPath(); g.ellipse(ox + x + w2 / 2, oy + y + 4, w2 / 2, 4, 0, 0, TAU); g.fill();
          R(x + 1, y + 1, w2 - 3, 1.4, lt2);
          R(x + w2 / 2 - .7, y, 1.4, 8, shade(base, .7));
        }
        break;
      }

      /* ---------- 농업 ---------- */
      case 'farmland': {
        // 옆에서 본 밭 — 세로 줄무늬로 그리면 울타리처럼 보여서, 위에 갈아엎은 흙두둑을 얹는다
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 12; i++)
          R(rng.range(-1, TS - 3), rng.range(4, TS - 3), rng.range(3, 7), rng.range(2, 4), rng.chance(.5) ? base : dk2);
        this._speck(g, ox, oy, rng, 22, dk2, base);
        R(0, 0, TS, 5, base);                    // 부드럽게 갈린 표층
        for (let x = 0; x < TS; x += 4) {        // 두둑
          const h = rng.range(1.5, 3);
          R(x, 5 - h, 3, h + 1, lt);
          R(x + 3, 4, 1, 2, dk2);
        }
        R(0, 0, TS, 1.2, lt2);
        this._speck(g, ox, oy, rng, 8, '#3a2a16', lt);
        break;
      }
      case 'crop': {
        // 줄기를 같은 간격·같은 높이로 세우면 울타리처럼 보인다.
        const st = s.st, kind = s.kind;
        const stalk = st === 3 ? shade(base, .68) : shade(base, .88);
        const n = [2, 3, 3, 4][st];
        const base_h = [6, 11, 15, 19][st];
        for (let i = 0; i < n; i++) {
          const x = 2.5 + i * (TS - 5) / n + rng.range(-1.6, 1.6);
          const h = base_h * rng.range(0.78, 1.1);
          const lean = rng.range(-1.2, 1.2);
          for (let k = 0; k < h; k++) R(x + lean * (k / h), TS - 1 - k, 1.8, 1, stalk);
          if (st >= 1) {                                   // 잎
            R(x - 3.4, TS - h * .55, 3.4, 1.4, shade(stalk, 1.2));
            R(x + 1.8, TS - h * .78, 3.2, 1.4, shade(stalk, .8));
          }
          if (st === 2) R(x - .6, TS - h - 1, 3, 3, base);  // 아직 여물지 않은 꽃봉오리
          if (st < 3) continue;
          const tx = x + lean, ty = TS - h;
          if (kind === 'wheat') {                          // 이삭 — 알갱이를 지그재그로
            for (let k = 0; k < 5; k++) {
              const yy = ty + k * 2.4;
              R(tx - 2.6, yy, 2.6, 2, base); R(tx + 1.2, yy + 1.2, 2.6, 2, base);
              R(tx - 2.6, yy, 2.6, .8, lt2);
            }
            R(tx + .2, ty - 3, 1, 4, lt);                  // 까끄라기
          } else if (kind === 'root') {                    // 무성한 잎 + 흙 위로 드러난 뿌리목
            for (let k = -2; k <= 2; k++) {
              const len = 5 - Math.abs(k);
              for (let j = 0; j < len; j++) R(tx + k * 2.2 + j * k * .3, ty + 1 + j * 1.1, 2, 1.6, k % 2 ? base : lt);
            }
            R(tx - 1.6, TS - 5, 4, 5, lt2);                // 뿌리목
            R(tx - 1.6, TS - 5, 4, 1.4, '#e8ffe8');
          } else if (kind === 'bean') {                    // 줄기에 매달린 꼬투리 — 아래로 늘어진다
            for (let k = 0; k < 3; k++) {
              const yy = ty + 2 + k * 4.2, sw = k % 2 ? -3 : 2.2;
              R(tx + sw, yy, 2.4, 4, base);
              R(tx + sw, yy, 1, 4, lt);
              R(tx + sw + .4, yy + 1.2, 1.4, 1, dk2);       // 콩알이 비치는 자국
            }
          } else if (kind === 'bloom') {                   // 뼈처럼 흰 꽃 — 다섯 잎이 벌어져 있다
            for (let k = 0; k < 5; k++) {
              const a = -Math.PI / 2 + (k - 2) * 0.62;
              R(tx + Math.cos(a) * 3.4 - 1.2, ty + 2 + Math.sin(a) * 3.4, 2.6, 2.6, base);
              R(tx + Math.cos(a) * 4.4 - .8, ty + 2 + Math.sin(a) * 4.4, 1.6, 1.6, lt2);
            }
            R(tx - 1, ty + 1.2, 2.2, 2.2, '#c8b060');      // 꽃심
          } else if (kind === 'herb') {                    // 서리 낀 잎 — 끝마다 얼음 알갱이
            for (let k = -2; k <= 2; k++) {
              if (!k) continue;
              const len = 4 - Math.abs(k) * 0.6;
              for (let j = 0; j < len; j++)
                R(tx + k * 1.8 + j * k * .5, ty + 1.4 + j * 1.5 + Math.abs(k), 2, 1.6, j > len - 2 ? '#e8ffff' : base);
            }
            R(tx - .8, ty - 1, 2, 2, '#ffffff');
          } else if (kind === 'pod') {                     // 벌어진 꼬투리 속에서 불씨가 보인다
            R(tx - 3.4, ty + 1, 7, 6, shade(base, .62));
            R(tx - 2.6, ty + 1.8, 5.4, 4.4, base);
            R(tx - 1.4, ty + 2.8, 3, 2.4, '#ffe08a');
            R(tx - .6, ty + 3.4, 1.6, 1.2, '#fff6d8');
            R(tx - 3.4, ty + .2, 7, 1.2, lt2);             // 벌어진 자리
          } else {                                         // 버섯 갓
            g.fillStyle = base;
            g.beginPath(); g.ellipse(ox + tx + .9, oy + ty + 3, 5, 4, 0, Math.PI, 2 * Math.PI); g.fill();
            g.fillStyle = shade(base, .72);
            R(tx - 4, ty + 2.4, 10, 1.4);
            R(tx + .2, ty + 3, 1.8, h - 4, '#e8dcc0');
            R(tx - 2, ty + .6, 1.4, 1.4, '#fff2d8');
            R(tx + 2.4, ty + 1.4, 1.2, 1.2, '#fff2d8');
          }
        }
        break;
      }

      /* ---------- 마을 기계 ---------- */
      case 'mk_windmill': {
        R(TS / 2 - 4, 9, 8, TS - 9, base);      // 탑
        R(TS / 2 - 4, 9, 2, TS - 9, lt2);
        R(TS / 2 + 2, 9, 2, TS - 9, dk);
        R(TS / 2 - 5, 8, 10, 2, shade(base, .7));
        g.save();                                // 날개 넷
        g.translate(ox + TS / 2, oy + 7);
        g.fillStyle = '#e8dcc0';
        for (let k = 0; k < 4; k++) {
          g.rotate(TAU / 4);
          g.fillRect(-1, -7, 2, 7);
          g.fillRect(-3.2, -7, 3.2, 4);
        }
        g.restore();
        g.fillStyle = '#5a4a3a';
        g.beginPath(); g.arc(ox + TS / 2, oy + 7, 2, 0, TAU); g.fill();
        break;
      }
      case 'mk_mill': {
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = '#7a7a82';                 // 맷돌
        g.beginPath(); g.arc(ox + TS / 2, oy + 11, 7, 0, TAU); g.fill();
        g.fillStyle = '#9a9aa4';
        g.beginPath(); g.arc(ox + TS / 2, oy + 10, 6, 0, TAU); g.fill();
        g.fillStyle = '#4a4a52';
        g.beginPath(); g.arc(ox + TS / 2, oy + 10, 2, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) {            // 홈
          const a = k * TAU / 6;
          R(TS / 2 + Math.cos(a) * 3.4 - .6, 10 + Math.sin(a) * 3.4 - .6, 1.2, 1.2, '#6a6a72');
        }
        R(4, TS - 5, TS - 8, 3, '#e8dcc0');      // 쏟아진 가루
        break;
      }
      case 'mk_oven': {
        R(1, TS - 5, TS - 2, 5, shade(base, .6));   // 받침
        g.fillStyle = base;                          // 돔
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 9.5, Math.PI, 2 * Math.PI); g.fill();
        g.fillStyle = lt;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 9.5, Math.PI, Math.PI * 1.45); g.fill();
        for (let k = 0; k < 4; k++) R(2 + k * 5, TS - 12 + Math.abs(k - 1.5) * 1.6, 4, 1.2, dk2);
        g.fillStyle = '#1e1a16';                     // 아궁이
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 5, Math.PI, 2 * Math.PI); g.fill();
        g.fillStyle = '#e8842a';
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 3.4, Math.PI, 2 * Math.PI); g.fill();
        R(TS / 2 - 1.6, TS - 8, 3.2, 3, '#ffcf6a');
        R(TS - 6, 0, 4, 6, shade(base, .7));         // 굴뚝
        break;
      }
      case 'darthole': {
        // 벽에 뚫린 구멍 셋.
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 7), rng.range(2, 5), rng.chance(.5) ? lt : dk);
        const side = s.d > 0 ? TS - 7 : 2;
        for (let k = 0; k < 3; k++) {
          R(side, 4 + k * 6, 5, 3.4, '#14120e');
          R(side + (s.d > 0 ? 3.6 : 0), 4 + k * 6, 1.4, 3.4, '#2a2620');
        }
        R(s.d > 0 ? TS - 2 : 0, 0, 2, TS, dk2);
        this._speck(g, ox, oy, rng, 12, dk2, lt);
        break;
      }
      case 'flamevent': {
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 5; i++) R(rng.range(0, TS - 4), rng.range(3, TS - 3), rng.range(3, 6), rng.range(2, 4), rng.chance(.5) ? base : dk2);
        R(3, 0, TS - 6, 4, '#1a1410');                 // 분출구
        for (let k = 0; k < 3; k++) R(4 + k * 5, 0, 3, 3, '#e8842a');
        R(3, 3, TS - 6, 1.4, shade(base, 1.4));
        this._speck(g, ox, oy, rng, 10, '#2a1a10', '#c86a2a');
        break;
      }
      case 'crumble': {
        // 이미 금이 가 있어서 "밟으면 안 되겠다"가 보이게
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 7), rng.range(2, 4), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 4; i++) {                   // 갈라진 금
          let x = rng.range(2, TS - 2), y = rng.range(-1, 3);
          for (let k = 0; k < rng.int(7, 14); k++) { R(x, y, 1, 1, '#1e1a14'); x += rng.range(-1.3, 1.3); y += rng.range(.8, 1.7); }
        }
        R(0, 0, TS, 1.4, lt2);
        R(0, TS - 2, TS, 2, dk2);
        break;
      }
      case 'slag': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {                   // 흘러내린 자국
          let x = rng.range(2, TS - 3);
          for (let y = 0; y < TS; y++) { R(x, y, rng.chance(.3) ? 2 : 1, 1, dk2); x += rng.range(-.5, .5); }
        }
        for (let i = 0; i < 3; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), 2, 2, '#c8763a');
        this._speck(g, ox, oy, rng, 14, dk2, '#8a6a4a');
        break;
      }
      case 'mk_dart': {
        // 벽에 박힌 발사구 — 구멍 셋이 정면을 본다
        this._mkBody(g, ox, oy, base, R);
        R(2, 5, 18, 12, shade(base, .5));
        for (let k = 0; k < 3; k++) { R(4, 7 + k * 4, 14, 2, '#14120e'); R(15, 7 + k * 4, 3, 2, '#3a3630'); }
        R(1, 3, 20, 2, shade(base, 1.35));
        R(1, TS - 5, 20, 2, shade(base, .45));
        break;
      }
      case 'mk_jet': {
        // 노즐 — 안쪽에서 빛이 새어 나온다
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = '#1a1610';
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 6.5, 0, TAU); g.fill();
        g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 4.2, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.6);
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 2.2, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) {                 // 조임쇠
          const a = k * TAU / 4 + .4;
          R(TS / 2 + Math.cos(a) * 8 - 1.5, TS / 2 + Math.sin(a) * 8 - 1.5, 3, 3, shade(base, .5));
        }
        break;
      }
      case 'mk_switch': {
        R(3, 4, TS - 6, TS - 8, shade('#3a3a44', 1));
        R(3, 4, TS - 6, 2, '#5a5a66');
        g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 5.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.5);
        g.beginPath(); g.arc(ox + TS / 2 - 1, oy + TS / 2 - 1, 2.4, 0, TAU); g.fill();
        break;
      }

      /* ---------- 유적 고유 장식 열 ---------- */

      case 'banner_ice': {          // 언 깃발 — 위에서 내려와 아래가 찢어져 있다
        R(4, 0, TS - 8, 2, shade(base, .6));                    // 걸린 가로대
        R(5, 2, TS - 10, TS - 10, base);
        R(5, 2, 2, TS - 10, lt);                                // 왼쪽에 든 빛
        R(TS - 7, 2, 2, TS - 10, dk);
        for (let i = 0; i < 3; i++) R(7 + i * 3, 5 + (i & 1), 1, 7, lt2);   // 언 결
        /* 지워서 끊는 게 아니라 **덜 그려서** 끊는다 — 투명색으로 fillRect 하면 아무 일도 안 일어난다(source-over). */
        for (let x = 5; x < TS - 5; x += 2)
          if ((x >> 1) & 1) R(x, TS - 8, 2, 2, x < TS / 2 ? lt : dk);
        R(6, TS - 6, 1, 2, lt2); R(TS - 9, TS - 7, 1, 2, lt2);  // 고드름 두 방울
        break;
      }
      case 'glyph': {               // 벽에 돋은 글자 — 서리(찬빛) / 새김(따뜻한 그늘)
        const warm = s.warm;
        this._fill(g, ox, oy, dk);
        this._speck(g, ox, oy, rng, 16, dk2, base);
        R(2, 2, TS - 4, TS - 4, warm ? shade(base, .86) : dk);  // 파 놓은 판
        const ink = warm ? dk2 : lt2;
        // 세 줄짜리 글자 — 줄마다 다른 획이라 무늬가 아니라 글로 읽힌다
        R(4, 4, 5, 2, ink); R(4, 4, 2, 6, ink); R(11, 4, 2, 6, ink); R(14, 5, 4, 2, ink);
        R(4, 10, 2, 5, ink); R(8, 10, 6, 2, ink); R(13, 12, 2, 4, ink);
        R(6, 16, 8, 2, ink); R(16, 10, 2, 6, ink);
        if (!warm) { R(5, 5, 1, 1, '#ffffff'); R(12, 11, 1, 1, '#ffffff'); }  // 서리는 반짝인다
        break;
      }
      case 'canopic': {             // 장기 단지 — 어깨가 벌어지고 뚜껑이 얹힌 항아리
        R(8, 1, 6, 2, shade(base, .74));                        // 뚜껑
        R(9, 3, 4, 2, base);
        R(6, 5, TS - 12, 3, base);                              // 벌어진 어깨
        R(5, 8, TS - 10, TS - 10, base);                        // 몸통
        R(5, 8, 2, TS - 10, lt);
        R(TS - 7, 8, 2, TS - 10, dk);
        R(7, 12, TS - 14, 2, dk2);                              // 두른 띠
        R(9, 15, 1, 3, dk2); R(12, 15, 1, 3, dk2);              // 봉인 자국
        break;
      }
      case 'minelamp': {            // 매단 갱등 — 고리에 걸려 흔들리다 멈춘 것
        R(TS / 2 - 1, 0, 2, 4, '#4a4038');                      // 매단 줄
        R(7, 4, TS - 14, 2, '#6a5c4a');                         // 손잡이
        R(6, 6, TS - 12, 2, '#5a5048');                         // 갓
        R(7, 8, TS - 14, 7, base);                              // 유리
        R(8, 9, TS - 16, 5, lt2);                               // 안의 불
        R(9, 10, 2, 3, '#fff6e0');                              // 심지
        R(6, 15, TS - 12, 2, '#5a5048');                        // 받침
        break;
      }
      case 'toolpile': {            // 버린 연장 — 곡괭이 자루와 삽날이 겹쳐 있다
        R(3, TS - 4, TS - 6, 3, shade(base, .58));              // 흙에 반쯤 묻혔다
        R(4, TS - 9, 12, 2, base);                              // 자루 하나
        R(3, TS - 11, 4, 3, shade('#8a8478', 1));               // 그 끝의 쇠
        R(9, TS - 14, 2, 6, shade(base, 1.1));                  // 세워 둔 자루
        R(7, TS - 16, 6, 2, shade('#8a8478', .9));              // 삽날
        R(13, TS - 7, 6, 2, dk);                                // 부러진 것
        R(16, TS - 10, 2, 3, shade('#8a8478', .8));
        break;
      }
      case 'sac': {                 // 알주머니 — 천장에서 늘어져 아래가 무겁다
        R(TS / 2 - 1, 0, 2, 3, shade(base, .6));                // 매달린 목
        R(7, 3, TS - 14, 4, shade(base, .86));
        R(5, 6, TS - 10, 9, base);                              // 불룩한 몸
        R(6, 15, TS - 12, 3, shade(base, .8));                  // 아래로 처진 끝
        R(6, 7, 2, 7, lt);
        // 안에서 비쳐 보이는 알 셋
        R(8, 8, 3, 3, lt2); R(12, 10, 3, 3, lt2); R(9, 13, 3, 2, lt2);
        R(9, 9, 1, 1, '#ffd0f0'); R(13, 11, 1, 1, '#ffd0f0');
        break;
      }
      case 'boneheap': {            // 삭은 뼈 — 바닥에 흩어져 겹쳐 있다
        R(2, TS - 5, TS - 4, 4, shade(base, .5));               // 아래 깔린 것
        for (const [bx, by, bw] of [[3, TS - 8, 9], [11, TS - 10, 7], [6, TS - 12, 6]]) {
          R(bx, by, bw, 2, base);                               // 긴 뼈
          R(bx - 1, by - 1, 2, 4, lt); R(bx + bw - 1, by - 1, 2, 4, lt);   // 양 끝 관절
        }
        R(14, TS - 7, 5, 5, base);                              // 굴러 나온 두개골
        R(15, TS - 5, 2, 2, dk2); R(18, TS - 5, 1, 2, dk2);      // 눈구멍
        break;
      }
      case 'sporevent': {           // 포자 구멍 — 벽에 뚫린 구멍에서 뿜어 나온다
        this._fill(g, ox, oy, dk);
        this._speck(g, ox, oy, rng, 18, dk2, base);
        g.fillStyle = '#1a1f1c';                                // 구멍은 깊고 어둡다
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2 + 1, 6, 0, TAU); g.fill();
        g.strokeStyle = base; g.lineWidth = 2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2 + 1, 5.5, 0, TAU); g.stroke();
        for (let i = 0; i < 5; i++) {   // 구멍 테두리에 돋은 갓
          const a = i * TAU / 5 + 0.4;
          R(TS / 2 + Math.cos(a) * 6.5 - 1, TS / 2 + 1 + Math.sin(a) * 6.5 - 1, 3, 2, lt2);
        }
        R(TS / 2 - 2, TS / 2 - 4, 2, 2, lt2); R(TS / 2 + 2, TS / 2 - 6, 1, 1, lt2);   // 새어 나온 가루
        break;
      }
      case 'mossrock': {            // 이끼 낀 바위 — 돌결 위에 이끼가 얼룩지고 윗면이 두툼하다
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        this._speck(g, ox, oy, rng, 14, dk2, lt2);
        const m1 = s.g, m2 = shade(m1, 1.3), m3 = shade(m1, .7);
        for (let i = 0; i < 9; i++) {                           // 얼룩진 이끼
          const x = rng.range(0, TS - 4), y = rng.range(3, TS - 3);
          R(x, y, rng.range(2, 5), rng.range(1, 3), rng.chance(.6) ? m1 : m3);
        }
        let h = 4;
        for (let x = 0; x < TS; x++) {                          // 윗면 이끼
          h = clamp(h + rng.range(-1, 1), 2, 6);
          R(x, 0, 1, h, m1); R(x, 0, 1, 1, m2); R(x, h - 1, 1, 1, m3);
        }
        break;
      }
      case 'hangmoss': {            // 늘어진 이끼 — 가닥마다 길이가 다르고 끝이 가늘다
        R(0, 0, TS, 2, shade(base, .7));
        for (let x = 0; x < TS; x += 2) {
          const len = rng.int(6, TS - 1);
          R(x, 1, 2, len * .55, base);
          R(x + (rng.chance(.5) ? 0 : 1), 1 + len * .55, 1, len * .45, shade(base, .8));
          if (rng.chance(.4)) R(x, 2, 1, 2, lt2);
        }
        break;
      }
      case 'dripstone': {           // 종유석(위에 붙어 아래로) · 석순(바닥에서 위로) — 층이 진 원뿔
        const up = !!s.up;
        for (let y = 0; y < TS; y++) {
          const t = up ? (TS - y) / TS : (y + 1) / TS;           // 0(붙은 쪽) → 1(끝)
          const w = Math.max(1.2, (TS - 4) * (1 - t * 0.86));
          const col = (y % 5 === 0) ? dk : (y % 5 === 2 ? lt : base);
          R(TS / 2 - w / 2, y, w, 1, col);
          R(TS / 2 - w / 2, y, Math.max(1, w * .25), 1, lt2);    // 한쪽에 비치는 빛
        }
        if (!up) R(TS / 2 - .5, TS - 2, 1, 2, '#9fd0e8');        // 끝에 맺힌 물방울
        break;
      }
      case 'geode': {               // 수정 무리 — 바닥에서 여러 갈래로 솟은 결정
        const cols = [base, lt, lt2, shade(base, .8)];
        for (const [bx, h, w, lean] of [[6, 14, 5, -1.5], [12, 19, 6, 0.5], [17, 11, 4, 2]]) {
          g.fillStyle = cols[rng.int(0, 3)];
          g.beginPath();
          g.moveTo(ox + bx - w / 2, oy + TS); g.lineTo(ox + bx + w / 2, oy + TS);
          g.lineTo(ox + bx + w / 2 + lean, oy + TS - h + 3); g.lineTo(ox + bx + lean, oy + TS - h);
          g.lineTo(ox + bx - w / 2 + lean, oy + TS - h + 3); g.closePath(); g.fill();
          R(bx + lean - .5, TS - h + 2, 1, h - 4, '#ffffff');    // 결정 모서리의 빛
        }
        g.globalAlpha = .22; g.fillStyle = lt2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 8, 10, 0, TAU); g.fill();
        g.globalAlpha = 1;
        break;
      }
      case 'fault': {               // 금 간 자갈 — 돌 바탕에 알갱이 결이 옅게, 가는 금 하나
        /* ★ 바탕을 돌과 같은 밝기(base)로 깐다. */
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 9; i++) {
          const x = rng.range(1, TS - 5), y = rng.range(1, TS - 5), r = rng.range(1.4, 2.4);
          g.fillStyle = rng.chance(.5) ? shade(base, 1.1) : shade(base, .9);
          g.beginPath(); g.arc(ox + x + r, oy + y + r, r, 0, TAU); g.fill();
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        /* 금은 네 변형 중 하나에만, 짧게 — 칸마다 같은 자리에 금을 그었더니 자갈 덩어리가 격자 무늬로 드러났다(변형이 넷뿐이라 금 자리가 되풀이된다). */
        if (v === 1) {
          let x = rng.range(4, TS - 6), y = rng.range(2, 8);
          for (let k = 0; k < 8; k++) { R(x, y, 1, 1, dk2); x = clamp(x + rng.range(-1.2, 1.4), 1, TS - 2); y += 1.2; }
        }
        break;
      }
      case 'meteorite': {           // 운석 — 오목 자국 · 쇠 알갱이 · 식다 만 금
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 4; i++) {               // 오목 자국 — 위 가장자리는 그늘, 아래 가장자리는 빛
          const x = rng.range(3, TS - 4), y = rng.range(3, TS - 4), r = rng.range(2.2, 3.6);
          g.fillStyle = dk2; g.beginPath(); g.arc(ox + x, oy + y, r, 0, TAU); g.fill();
          g.fillStyle = dk; g.beginPath(); g.arc(ox + x + .6, oy + y + .8, r * .75, 0, TAU); g.fill();
          g.fillStyle = lt; g.beginPath(); g.arc(ox + x, oy + y, r, .3, 2.6); g.lineTo(ox + x, oy + y); g.fill();
        }
        for (let i = 0; i < 9; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), rng.chance(.4) ? 2 : 1, 1, rng.chance(.5) ? '#c8ccd4' : '#8a8e98');
        if (v === 1 || v === 3) {                   // 붉은 금 — 넷 중 둘에만, 짧게(칸마다 그으면 줄무늬가 된다)
          let x = rng.range(4, TS - 6), y = rng.range(3, 9);
          for (let k = 0; k < 6; k++) {
            R(x, y, 1, 1, '#ff7a3a'); if (k % 3 === 0) R(x + 1, y, 1, 1, '#ffb070');
            x = clamp(x + rng.range(-1.3, 1.3), 1, TS - 2); y += 1.4;
          }
        }
        this._speck(g, ox, oy, rng, 10, dk2, lt2);
        break;
      }
      case 'starcrystal': {         // 별빛 수정 — 가늘고 곧은 결정 다발, 끝에 별빛이 맺힌다
        g.globalAlpha = .2; g.fillStyle = lt2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 6, 9, 0, TAU); g.fill();
        g.globalAlpha = 1;
        const sets = [[[5, 11, 3, -2], [11, 20, 4, 0], [16, 14, 3, 2.5]],
          [[7, 17, 4, -1], [14, 12, 3, 1.5], [18, 8, 2.5, 3]],
          [[4, 9, 3, -2.5], [9, 15, 3.5, -.5], [15, 19, 4, 1]],
          [[6, 13, 3.5, -1.5], [12, 17, 3, .5], [17, 11, 3, 2]]][v & 3];
        for (const [bx, h, w, lean] of sets) {
          const tipX = ox + bx + lean, tipY = oy + TS - h;
          g.fillStyle = shade(base, .82);
          g.beginPath(); g.moveTo(ox + bx - w / 2, oy + TS); g.lineTo(ox + bx + w / 2, oy + TS);
          g.lineTo(tipX + w / 2, tipY + 3); g.lineTo(tipX, tipY); g.lineTo(tipX - w / 2, tipY + 3); g.closePath(); g.fill();
          g.fillStyle = lt2;                        // 빛 받는 쪽 면
          g.beginPath(); g.moveTo(ox + bx - w / 2, oy + TS); g.lineTo(ox + bx, oy + TS);
          g.lineTo(tipX, tipY); g.lineTo(tipX - w / 2, tipY + 3); g.closePath(); g.fill();
          R(bx + lean - .5, TS - h + 2, 1, h - 4, '#ffffff');
          R(bx + lean - 1.5, TS - h - .5, 3, 1, '#fffbe8');   // 끝의 별빛(십자)
          R(bx + lean - .5, TS - h - 1.5, 1, 3, '#fffbe8');
        }
        R(0, TS - 2, TS, 2, '#2e2a2e');             // 뿌리 — 녹아 굳은 바닥에 박힌 자리
        break;
      }
      case 'fused': {               // 녹아 굳은 돌 — 검은 유리 바탕, 흘러 굳은 결과 공기 방울, 윤
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 4; i++) {
          let x = rng.range(0, TS - 4), y = rng.range(1, TS - 2);
          for (let k = 0; k < 10; k++) { R(x, y, 2, 1, rng.chance(.5) ? dk : shade(base, 1.12)); x += 1.8; y += rng.range(-.6, .6); }
        }
        for (let i = 0; i < 5; i++) {
          const x = rng.range(2, TS - 3), y = rng.range(2, TS - 3);
          R(x, y, 2, 2, dk2); R(x, y, 1, 1, lt2);
        }
        R(rng.range(2, 8), rng.range(2, 6), rng.range(5, 9), 1, '#6a6070');   // 유리 윤
        R(rng.range(10, 16), rng.range(12, 18), rng.range(3, 6), 1, '#5a5060');
        if (v === 1) R(rng.range(3, TS - 5), rng.range(3, TS - 5), 2, 1, '#c85a2a');   // 아직 붉은 한 점
        break;
      }
      case 'granite': {             // 화강암 — 바탕 위에 밝은 알갱이·검은 알갱이가 굵게 박힌다
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 22; i++) R(rng.range(0, TS - 2), rng.range(0, TS - 2), 2, 2, rng.chance(.5) ? '#d8c8c0' : '#2a2224');
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        break;
      }
      case 'hyphae': {              // 균사 발 — 천장에서 내린 실이 아래로 갈수록 성글다
        R(0, 0, TS, 2, shade(base, .62));                       // 붙어 있는 자리
        for (let x = 1; x < TS; x += 3) {
          const len = 6 + ((x * 7) % 11);
          R(x, 2, 1, len, base);
          R(x, 2, 1, Math.min(3, len), lt2);                    // 위쪽이 굵고 밝다
          if (len > 12) R(x, 2 + len, 1, 1, lt2);               // 끝에 맺힌 것
        }
        for (const [bx, by] of [[4, 7], [13, 10], [8, 14]]) R(bx, by, 2, 2, lt2);   // 실에 걸린 포자
        break;
      }
    }
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
