/* ===== data.js — 타일 / 아이템 / 적 / 스킬 / 스토리 ===== */

/* ---------------- 타일 ---------------- */
export const T = {
  AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, SAND: 4, SANDSTONE: 5, SNOW: 6, ICE: 7,
  WOOD: 8, LEAF: 9, EBONSTONE: 10, CORRUPTGRASS: 11, ASH: 12, OBSIDIAN: 13,
  COPPER: 14, IRON: 15, GOLD: 16, MYTHRIL: 17, SOULSTONE: 18, HELLSTONE: 19,
  PLANK: 20, BRICK: 21, TORCH: 22, PLATFORM: 23, BEDROCK: 24, VINE: 25,
  CRYSTAL: 26, LAVA: 27, ALTARSTONE: 28, CORRUPTLEAF: 29,
  /* --- 2부: 하늘 섬 / 숨겨진 유적 --- */
  CLOUD: 30, SKYSTONE: 31, SKYGRASS: 32, SKYLEAF: 33,
  RUINBRICK: 34, RUINTILE: 35, RUNESTONE: 36, SEALSTONE: 37, AETHER: 38,
  /* --- 지하 공창 --- */
  STEELPLATE: 39, POWERSTONE: 40, CONDUIT: 41,
  /* --- 큰 동굴 함정 --- */
  SPIKE: 42,
  /* --- 채집 장식 --- */
  FLOWER: 43, WEED: 44, CACTUS: 45, MUSHROOM: 46,
  /* --- 사막: 닿으면 피해를 주는 큰 선인장(고체 블록) --- */
  CACTUS_BLOCK: 47,
  /* --- 동력 자원 --- */
  COAL: 48, LEAD: 49, OILSHALE: 50,
  /* --- 공장 기계 (전부 1×1, 통과 가능) --- */
  M_BELT: 51, M_DRILL: 52, M_DRILL_E: 53, M_PUMP: 54, M_SMELTER: 55,
  M_PRESS: 56, M_REFINERY: 57, M_ASSEMBLER: 58, M_CRATE: 59, M_GEN: 60,
  M_BATTERY: 61, M_POLE: 62, M_SORTER: 63, M_TURRET: 64, M_TRAP: 65, M_SWITCH: 66,
  /* --- 마을 건축 · 방어 --- */
  THATCH: 67, ROOFTILE: 68, TIMBERWALL: 69, WALLSTONE: 70, BATTLEMENT: 71,
  WINDOW: 72, FENCE: 73, LAMPPOST: 74, BANNER: 75, HAYBALE: 76, SANDBAG: 77,
  /* --- 농업. 작물은 자라는 단계마다 타일이 하나씩 배정된다 --- */
  FARMLAND: 78,
  WHEAT0: 79, WHEAT1: 80, WHEAT2: 81, WHEAT3: 82,
  ROOT0: 83, ROOT1: 84, ROOT2: 85, ROOT3: 86,
  CAP0: 87, CAP1: 88, CAP2: 89, CAP3: 90,
  /* --- 마을 기계 --- */
  M_WINDMILL: 91, M_MILL: 92, M_OVEN: 93,
  /* --- 바이옴 (울림 정글 / 버섯 골짜기) --- */
  JUNGLEGRASS: 94, MUD: 95, JUNGLELEAF: 96, FERN: 97, ORCHID: 98,
  GLOWMOSS: 99, SPORESTONE: 100, GLOWCAP: 101,
  /* --- 유적 --- */
  ICEBRICK: 102, SANDBRICK: 103, MINEWOOD: 104,
  M_DART: 105, M_FLAME: 106, M_FROST: 107,
  /* --- 고대 유적 함정 (기계 아님 — 타일만으로 돈다) --- */
  DART_L: 108, DART_R: 109, FLAMEVENT: 110, CRUMBLE: 111,
  /* --- 폭주로 --- */
  SLAGSTEEL: 112, COREGLASS: 113,
  /* --- 동굴 물 — 고인 물(WATER)과 떨어지는 물(FALLS). 둘 다 헤엄칠 수 있다 --- */
  WATER: 114, FALLS: 115,
  /* --- 세션 2 종장: 설계실 --- */
  ARCHESTONE: 116, DRAFTGLASS: 117, ARCHSEAL: 118,
  /* --- 특별 유적: 부유 성채(하늘) · 무너진 갱(최심부) --- */
  ORBITPLATE: 119, ORBITCORE: 120, DEEPROCK: 121, BLACKDAMP: 122,
  /* --- 버섯 골짜기 나무 갓(캐노피) 전용 타일 --- */
  GLOWLEAF: 123,
  /* --- 울림 정글 호수 수면 장식 --- */
  LILY: 124,
  /* --- 유적 함정 셋 (기계가 아니라 타일만으로 돈다) --- */
  SPARKCOIL: 125, GASVENT: 126, GRINDER: 127, CIPHERSTONE: 128,
  /* --- 전리품으로만 씨를 얻는 작물 넷 --- */
  BEAN0: 129, BEAN1: 130, BEAN2: 131, BEAN3: 132,
  BLOOM0: 133, BLOOM1: 134, BLOOM2: 135, BLOOM3: 136,
  HERB0: 137, HERB1: 138, HERB2: 139, HERB3: 140,
  POD0: 141, POD1: 142, POD2: 143, POD3: 144,
  /* --- 유적마다 그곳에서만 나오는 장식 둘 --- */
  ICEBANNER: 145, FROSTGLYPH: 146,      // 얼음 던전 — 언 깃발 · 서리 글자
  CANOPIC: 147, HIEROGLYPH: 148,        // 피라미드 — 장기 단지 · 새긴 벽
  MINELAMP: 149, TOOLPILE: 150,         // 버려진 광산 — 매단 갱등 · 버린 연장
  BLIGHTSAC: 151, BONEHEAP: 152,        // 부패한 둥지 — 알주머니 · 삭은 뼈
  SPOREVENT: 153, HYPHAE: 154,          // 포자 굴 — 포자 구멍 · 균사 발
  /* ★ 아래 155번부터는 세션 3(바다·빙하) 타일이다. */
  /* --- 물속 공기 주머니. 액체가 아니라서 그 안에서는 숨을 쉰다 --- */
  AIRPOCKET: 155,
  /* --- 바닷물. 호수 물과 **색이 다르다**(더 짙고 푸르다) --- */
  SEAWATER: 156,
  /* --- 4단계 설비 (기계 타일도 맨 끝에 붙인다) --- */
  M_PRESSOR: 157, M_DESAL: 158, M_BELT_F: 159, M_BATTERY_HI: 160,
  /* --- 함정. 피해보다 **숨**을 빼앗는다 --- */
  BRINEVENT: 161,
  /* --- 촉발 지뢰. 밟으면 터진다 --- */
  TRIPMINE: 162,
  /* --- 바다·해변 장식 --- */
  KELPPLANT: 163, SEASHELL: 164,
  /* --- 화약 원료. 세션 3(빙하·해저)에서만 나온다 --- */
  SULFUR: 165, ROOMAIR: 166, PALMWOOD: 167, PALMLEAF: 168, COCONUT: 169, GLACIUM: 170, TIDESTONE: 171,
  /* --- 동굴 갈래(CAVE_TYPES) — 장식 다섯과 무너지는 자갈 하나 --- */
  MOSSSTONE: 172, HANGMOSS: 173, STALACTITE: 174, STALAGMITE: 175, GEODE: 176, FAULTSTONE: 177,
  /* --- 지층 돌 둘 — 얕은 곳의 석회암, 깊은 곳의 화강암 --- */
  LIMESTONE: 178, GRANITE: 179,
  /* --- 흐르는 액체(유체 물리 — world.js '유체' 절). 샘 바위는 폭포의 물이 나오는 곳 --- */
  FLOWWATER: 180, FLOWSEA: 181, FLOWLAVA: 182, SPRING: 183,
  /* --- 물가 장식 — 부들 · 물풀 · 물가 조약돌 --- */
  CATTAIL: 184, PONDWEED: 185, PEBBLES: 186,
  /* --- 눈 지대 소나무 잎 — 기둥은 여느 나무처럼 WOOD 다 --- */
  PINELEAF: 187,
  /* --- 운석 구덩이 — 운석 덩이 · 그 위에 자란 별빛 수정 · 열에 녹아 굳은 바닥돌 --- */
  METEORITE: 188, STARCRYSTAL: 189, FUSEDROCK: 190,
  /* --- 광상 — 광맥 한가운데 드물게 뭉친 덩이. 곡괭이는 몇 개, 공장 드릴은 끝없이 --- */
  COALRICH: 191, COPPERRICH: 192, IRONRICH: 193, LEADRICH: 194, GOLDRICH: 195, MYTHRILRICH: 196,
  /* --- 심층 드릴 — 전동 드릴 윗단(채굴 등급 5) --- */
  M_DRILL_X: 197
};

// solid: 충돌, hard: 필요 곡괭이 등급, light: 발광, drop: 채굴 시 아이템
export const TILE_DEF = [
  { n: '공기', c: null, solid: 0, hard: 0 },
  { n: '흙', c: '#6b4a2f', solid: 1, hard: 0, drop: 'dirt' },
  { n: '풀', c: '#4a7a34', solid: 1, hard: 0, drop: 'dirt' },
  { n: '돌', c: '#5d5d63', solid: 1, hard: 1, drop: 'stone' },
  { n: '모래', c: '#c8ab6a', solid: 1, hard: 0, drop: 'sand' },
  { n: '사암', c: '#9c8047', solid: 1, hard: 1, drop: 'stone' },
  { n: '눈', c: '#d5e2ee', solid: 1, hard: 0, drop: 'dirt' },
  { n: '얼음', c: '#8fc0dd', solid: 1, hard: 1, drop: 'ice_shard' },
  { n: '나무', c: '#5a3c22', solid: 0, hard: 0, drop: 'wood', tree: 1 },
  /* 잎 — tree(벌목 연쇄 대상)이면서 leaf(기둥이 아니라 수관)로 따로 표시한다. */
  { n: '잎', c: '#3f6e2e', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 44], ['wood', 26], ['leaf_oak', 30]] },
  { n: '흑요암', c: '#3a2b46', solid: 1, hard: 3, drop: 'ebon_chunk' },
  { n: '부패한 땅', c: '#4b3a5c', solid: 1, hard: 1, drop: 'dirt' },
  { n: '재', c: '#4a4038', solid: 1, hard: 2, drop: 'ash' },
  { n: '흑암석', c: '#241d2e', solid: 1, hard: 4, drop: 'obsidian' },
  { n: '구리 광맥', c: '#b06b3a', solid: 1, hard: 1, drop: 'copper_ore', ore: 1 },
  { n: '철 광맥', c: '#9c9186', solid: 1, hard: 1, drop: 'iron_ore', ore: 1 },
  { n: '금 광맥', c: '#d8b13d', solid: 1, hard: 2, drop: 'gold_ore', ore: 1 },
  { n: '미스릴 광맥', c: '#49b0a4', solid: 1, hard: 2, drop: 'mythril_ore', ore: 1 },
  { n: '영혼석', c: '#8f6fd8', solid: 1, hard: 3, drop: 'soul_shard', ore: 1, light: 5 },
  { n: '지옥석', c: '#c04a2a', solid: 1, hard: 3, drop: 'hell_ore', ore: 1, light: 4 },
  { n: '판자', c: '#7a5734', solid: 1, hard: 0, drop: 'plank' },
  { n: '석벽돌', c: '#585763', solid: 1, hard: 1, drop: 'brick' },
  { n: '횃불', c: '#e8a53a', solid: 0, hard: 0, drop: 'torch', light: 13 },
  { n: '발판', c: '#8a6640', solid: 2, hard: 0, drop: 'platform' },
  { n: '기반암', c: '#191922', solid: 1, hard: 99 },
  { n: '덩굴', c: '#3d6b2c', solid: 0, hard: 0, drop: 'wood' },
  { n: '수정', c: '#7fd8e8', solid: 1, hard: 2, drop: 'crystal', light: 8 },
  { n: '용암', c: '#e0561c', solid: 0, hard: 99, light: 11, hurt: 26 },
  { n: '제단석', c: '#2e2438', solid: 1, hard: 99, light: 6 },
  { n: '부패한 잎', c: '#4a3060', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 40], ['wood', 22], ['leaf_corrupt', 26], ['corrupt_ess', 12]] },
  /* --- 2부 --- */
  { n: '구름', c: '#dfe9f5', solid: 1, hard: 0, drop: 'cloud_block' },
  { n: '하늘돌', c: '#8fa8c0', solid: 1, hard: 2, drop: 'skystone' },
  { n: '하늘 풀', c: '#7fd0a8', solid: 1, hard: 0, drop: 'cloud_block' },
  { n: '하늘 잎', c: '#6ec49a', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 40], ['wood', 22], ['leaf_sky', 26], ['aether_shard', 12]] },
  { n: '유적 벽돌', c: '#6a6250', solid: 1, hard: 3, drop: 'ruin_brick' },
  { n: '유적 바닥', c: '#57503f', solid: 1, hard: 3, drop: 'ruin_brick' },
  { n: '룬석', c: '#4a5f7a', solid: 1, hard: 99, light: 8 },
  { n: '봉인석', c: '#3a3550', solid: 1, hard: 99, light: 4 },
  { n: '에테르 광맥', c: '#8fe0d8', solid: 1, hard: 3, drop: 'aether_shard', ore: 1, light: 7 },
  /* --- 지하 공창 --- */
  { n: '강철판', c: '#6a6a74', solid: 1, hard: 3, drop: 'steel_plate' },
  { n: '동력석 광맥', c: '#e8a53a', solid: 1, hard: 3, drop: 'power_core', ore: 1, light: 7 },
  { n: '동력관', c: '#8a6a3a', solid: 1, hard: 3, drop: 'conduit_part', light: 9 },
  /* --- 큰 동굴 함정: 밟으면 피해, 곡괭이로 캐서 없앨 수 있다 --- */
  { n: '가시 함정', c: '#8a2a24', solid: 0, hard: 0, hurt: 32, drop: 'stone' },
  /* --- 채집 장식: 곡괭이 없이도 즉시 캐지고, 나중에 제작 재료로 쓸 수 있는 아이템을 준다 --- */
  { n: '들꽃', c: '#d87ab0', solid: 0, hard: 0, drop: 'wildflower' },
  { n: '잡초', c: '#5a8f3a', solid: 0, hard: 0, drop: 'weed' },
  { n: '선인장', c: '#4a8a4a', solid: 0, hard: 0, drop: 'cactus_flesh' },
  { n: '버섯', c: '#e0402c', solid: 0, hard: 0, drop: 'mushroom' },
  /* --- 사막 큰 선인장: 고체 블록. 닿으면 피해 --- */
  { n: '큰 선인장', c: '#3a7a3a', solid: 1, hard: 1, hurt: 16, drop: 'cactus_flesh' },
  /* --- 동력 자원 --- */
  { n: '석탄층', c: '#2b2a2f', solid: 1, hard: 1, drop: 'coal', ore: 1 },
  { n: '납 광맥', c: '#7d7d90', solid: 1, hard: 1, drop: 'lead_ore', ore: 1 },
  { n: '유혈암', c: '#3b352c', solid: 1, hard: 2, drop: 'crude_oil', ore: 1 },
  /* --- 공장 기계 --- */
  { n: '컨베이어 벨트', c: '#6a6a74', solid: 0, hard: 1, drop: 'm_belt', mach: 'belt' },
  { n: '기계식 드릴', c: '#8a6a3a', solid: 1, hard: 2, drop: 'm_drill', mach: 'drill' },
  { n: '전동 드릴', c: '#4a8ab0', solid: 1, hard: 3, drop: 'm_drill_e', mach: 'drill_e' },
  { n: '시추 펌프', c: '#5a5040', solid: 1, hard: 2, drop: 'm_pump', mach: 'pump' },
  { n: '자동 용광로', c: '#7a4a30', solid: 1, hard: 2, drop: 'm_smelter', mach: 'smelter' },
  { n: '압축기', c: '#6a6a74', solid: 1, hard: 2, drop: 'm_press', mach: 'press' },
  { n: '정제기', c: '#4a5a4a', solid: 1, hard: 3, drop: 'm_refinery', mach: 'refinery' },
  { n: '조립기', c: '#5a6a8a', solid: 1, hard: 3, drop: 'm_assembler', mach: 'assembler' },
  { n: '수집 상자', c: '#8a6a3a', solid: 1, hard: 1, drop: 'm_crate', mach: 'crate' },
  { n: '화력 발전기', c: '#7a5a3a', solid: 1, hard: 2, drop: 'm_gen', mach: 'gen', light: 5 },
  { n: '축전지', c: '#4a7a6a', solid: 1, hard: 2, drop: 'm_battery', mach: 'battery', light: 4 },
  { n: '전주', c: '#7a6a4a', solid: 0, hard: 1, drop: 'm_pole', mach: 'pole' },
  { n: '분류기', c: '#8a7a4a', solid: 1, hard: 2, drop: 'm_sorter', mach: 'sorter' },
  { n: '자동 포탑', c: '#6a6a74', solid: 1, hard: 3, drop: 'm_turret', mach: 'turret' },
  { n: '전격 함정', c: '#4a6a8a', solid: 1, hard: 2, drop: 'm_trap', mach: 'trap' },
  { n: '정지 스위치', c: '#a03a30', solid: 1, hard: 2, drop: 'm_switch', mach: 'switch', light: 3 },
  /* --- 마을 건축 --- */
  { n: '초가지붕', c: '#c8a860', solid: 1, hard: 0, drop: 'thatch' },
  { n: '기와지붕', c: '#8a4a3a', solid: 1, hard: 1, drop: 'rooftile' },
  { n: '목골벽', c: '#d8cbaa', solid: 1, hard: 0, drop: 'timberwall' },
  { n: '성벽돌', c: '#8a8478', solid: 1, hard: 2, drop: 'wallstone' },
  { n: '흉벽', c: '#8a8478', solid: 1, hard: 2, drop: 'battlement' },
  { n: '창문', c: '#9fd8e8', solid: 1, hard: 0, drop: 'window', clear: 1 },
  { n: '울타리', c: '#7a5734', solid: 0, hard: 0, drop: 'fence' },
  { n: '가로등', c: '#e8c86a', solid: 0, hard: 0, drop: 'lamppost', light: 14 },
  { n: '깃발', c: '#b03a3a', solid: 0, hard: 0, drop: 'banner' },
  { n: '건초더미', c: '#d8b850', solid: 1, hard: 0, drop: 'haybale', soft: 1 },
  { n: '모래주머니', c: '#a89468', solid: 1, hard: 0, drop: 'sandbag' },
  /* --- 농업 --- */
  { n: '경작지', c: '#4a3620', solid: 1, hard: 0, drop: 'dirt', farm: 1 },
  { n: '밀 (싹)', c: '#7fa84a', solid: 0, hard: 0, drop: 'seed_wheat', crop: { next: T.WHEAT1 } },
  { n: '밀 (자람)', c: '#8fb84a', solid: 0, hard: 0, drop: 'seed_wheat', crop: { next: T.WHEAT2 } },
  { n: '밀 (여무는 중)', c: '#c8b04a', solid: 0, hard: 0, drop: 'seed_wheat', crop: { next: T.WHEAT3 } },
  { n: '밀', c: '#e0c058', solid: 0, hard: 0, drop: 'wheat', crop: { ripe: 1, seed: 'seed_wheat' } },
  { n: '별무 (싹)', c: '#7fa84a', solid: 0, hard: 0, drop: 'seed_starroot', crop: { next: T.ROOT1 } },
  { n: '별무 (자람)', c: '#6f9f5a', solid: 0, hard: 0, drop: 'seed_starroot', crop: { next: T.ROOT2 } },
  { n: '별무 (여무는 중)', c: '#5f9f6a', solid: 0, hard: 0, drop: 'seed_starroot', crop: { next: T.ROOT3 } },
  { n: '별무', c: '#8fd0a0', solid: 0, hard: 0, drop: 'starroot', crop: { ripe: 1, seed: 'seed_starroot' }, light: 3 },
  { n: '잿버섯 (싹)', c: '#8a7a6a', solid: 0, hard: 0, drop: 'seed_ashcap', crop: { next: T.CAP1 } },
  { n: '잿버섯 (자람)', c: '#9a7a68', solid: 0, hard: 0, drop: 'seed_ashcap', crop: { next: T.CAP2 } },
  { n: '잿버섯 (여무는 중)', c: '#b06a54', solid: 0, hard: 0, drop: 'seed_ashcap', crop: { next: T.CAP3 } },
  { n: '잿버섯', c: '#e0402c', solid: 0, hard: 0, drop: 'mushroom', crop: { ripe: 1, seed: 'seed_ashcap' } },
  /* --- 마을 기계 --- */
  { n: '풍차', c: '#c8bca0', solid: 1, hard: 2, drop: 'm_windmill', mach: 'windmill' },
  { n: '밀링기', c: '#8a7a5a', solid: 1, hard: 2, drop: 'm_mill', mach: 'mill' },
  { n: '화덕', c: '#9a6a4a', solid: 1, hard: 2, drop: 'm_oven', mach: 'oven', light: 6 },
  /* --- 울림 정글 --- */
  { n: '정글 풀', c: '#3f7a34', solid: 1, hard: 0, drop: 'mud' },
  { n: '진흙', c: '#4a3a26', solid: 1, hard: 0, drop: 'mud' },
  { n: '정글 잎', c: '#2f6a28', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 36], ['wood', 18], ['leaf_jungle', 24], ['fern_frond', 14], ['vine_coil', 8]] },
  { n: '고사리', c: '#4a8a3a', solid: 0, hard: 0, drop: 'fern_frond' },
  { n: '밀림꽃', c: '#c85a9a', solid: 0, hard: 0, drop: 'orchid', light: 3 },
  /* --- 버섯 골짜기 --- */
  { n: '발광 이끼', c: '#4a7a6a', solid: 1, hard: 0, drop: 'dirt', light: 5 },
  { n: '포자암', c: '#4a5a5a', solid: 1, hard: 1, drop: 'stone' },
  { n: '발광 버섯', c: '#6fe0c0', solid: 0, hard: 0, drop: 'glowcap', light: 9 },
  /* --- 유적 벽재 --- */
  { n: '얼음 벽돌', c: '#7fb0d8', solid: 1, hard: 2, drop: 'icebrick' },
  { n: '사암 벽돌', c: '#c8a468', solid: 1, hard: 2, drop: 'sandbrick' },
  { n: '갱목', c: '#6a4a2a', solid: 1, hard: 1, drop: 'plank' },
  /* --- 유적 함정 (기계 체계에 얹어 방향·저장·철거를 공짜로 쓴다) --- */
  { n: '화살 발사기', c: '#7a6a5a', solid: 1, hard: 1, drop: 'm_dart', mach: 'dart' },
  { n: '화염 분사구', c: '#9a5a3a', solid: 1, hard: 2, drop: 'm_flame', mach: 'flamejet', light: 4 },
  { n: '서리 분사구', c: '#6a9ab0', solid: 1, hard: 2, drop: 'm_frost', mach: 'frostjet' },
  /* --- 고대 유적 함정 --- */
  { n: '화살 구멍 (왼쪽)', c: '#4a4238', solid: 1, hard: 2, drop: 'stone', tdart: -1 },
  { n: '화살 구멍 (오른쪽)', c: '#4a4238', solid: 1, hard: 2, drop: 'stone', tdart: 1 },
  { n: '불길 분출구', c: '#8a4a2a', solid: 1, hard: 2, drop: 'stone', tvent: 1, light: 4 },
  { n: '부서지는 바닥', c: '#6a6050', solid: 1, hard: 1, drop: 'stone', crumble: 1 },
  /* --- 폭주로 --- */
  { n: '녹아내린 강철', c: '#5a4a44', solid: 1, hard: 4, drop: 'steel_plate' },
  { n: '노심 유리', c: '#e8b04a', solid: 1, hard: 4, drop: 'power_core', ore: 1, light: 10 },
  /* --- 동굴 물 --- */
  { n: '고인 물', c: '#2f6f9f', solid: 0, hard: 99, liquid: 1 },
  { n: '떨어지는 물', c: '#4a8fc0', solid: 0, hard: 99, liquid: 1, flow: 1 },
  /* --- 세션 2 종장: 설계실 --- */
  { n: '원형석', c: '#cfc7b8', solid: 1, hard: 4, drop: 'archestone' },
  { n: '설계 유리', c: '#8fd8e8', solid: 1, hard: 4, drop: 'draft_glass', ore: 1, light: 8 },
  { n: '설계실 봉인', c: '#b8a878', solid: 1, hard: 99 },
  /* --- 특별 유적 --- */
  { n: '궤도판', c: '#8fa8c8', solid: 1, hard: 5, drop: 'orbit_plate' },
  { n: '궤도핵', c: '#7fe0ff', solid: 1, hard: 5, drop: 'orbit_gear', ore: 1, light: 10 },
  { n: '심층암', c: '#3a3630', solid: 1, hard: 5, drop: 'deep_stone' },
  { n: '유독 가스', c: '#6a7a4a', solid: 0, hard: 99, hurt: 14, light: 2 },
  { n: '갓 조각', c: '#6fe0c0', solid: 0, hard: 0, drop: 'glowcap', tree: 1, leaf: 1, light: 4,
    leafDrop: [['none', 55], ['glowcap', 30], ['spore_sac', 15]] },
  /* 수련 — 물 위에 뜬 잎이므로 **그 칸도 물이다**(liquid 1) — 사연: docs/code-history.md#h1 */
  { n: '수련', c: '#3a9a6a', solid: 2, hard: 0, drop: 'lily_pad', liquid: 1 },
  /* --- 유적 함정 --- */
  { n: '방전 코일', c: '#5a8aa8', solid: 1, hard: 3, drop: 'copper_ore', tcoil: 1, light: 3 },
  { n: '가스 분출구', c: '#6a7a4a', solid: 1, hard: 2, drop: 'stone', tgas: 1 },
  { n: '톱니 구멍', c: '#6a6058', solid: 1, hard: 3, drop: 'iron_ore', tgrind: 1 },
  /* 암호석 — 숫자 잠긴 골방을 통째로 두르는 돌 — 사연: docs/code-history.md#h2 */
  { n: '암호석', c: '#5f5947', solid: 1, hard: 99, light: 3 },
  /* --- 전리품 작물 넷 --- */
  { n: '핏빛 콩 (싹)', c: '#6f8a4a', solid: 0, hard: 0, drop: 'seed_bloodbean', crop: { next: T.BEAN1 } },
  { n: '핏빛 콩 (자람)', c: '#7f9a4a', solid: 0, hard: 0, drop: 'seed_bloodbean', crop: { next: T.BEAN2 } },
  { n: '핏빛 콩 (여무는 중)', c: '#a8804a', solid: 0, hard: 0, drop: 'seed_bloodbean', crop: { next: T.BEAN3 } },
  { n: '핏빛 콩', c: '#c04a44', solid: 0, hard: 0, drop: 'bloodbean', crop: { ripe: 1, seed: 'seed_bloodbean' } },
  { n: '뼈꽃 (싹)', c: '#8a8a7a', solid: 0, hard: 0, drop: 'seed_bonebloom', crop: { next: T.BLOOM1 } },
  { n: '뼈꽃 (자람)', c: '#9a9a88', solid: 0, hard: 0, drop: 'seed_bonebloom', crop: { next: T.BLOOM2 } },
  { n: '뼈꽃 (여무는 중)', c: '#b0b09c', solid: 0, hard: 0, drop: 'seed_bonebloom', crop: { next: T.BLOOM3 } },
  { n: '뼈꽃', c: '#e8e4d4', solid: 0, hard: 0, drop: 'bonebloom', crop: { ripe: 1, seed: 'seed_bonebloom' }, light: 2 },
  { n: '서리쑥 (싹)', c: '#6a8a8a', solid: 0, hard: 0, drop: 'seed_frostherb', crop: { next: T.HERB1 } },
  { n: '서리쑥 (자람)', c: '#6a9a9a', solid: 0, hard: 0, drop: 'seed_frostherb', crop: { next: T.HERB2 } },
  { n: '서리쑥 (여무는 중)', c: '#7aacb4', solid: 0, hard: 0, drop: 'seed_frostherb', crop: { next: T.HERB3 } },
  { n: '서리쑥', c: '#a8e0e8', solid: 0, hard: 0, drop: 'frostherb', crop: { ripe: 1, seed: 'seed_frostherb' }, light: 2 },
  { n: '불씨 꼬투리 (싹)', c: '#7a6a48', solid: 0, hard: 0, drop: 'seed_emberpod', crop: { next: T.POD1 } },
  { n: '불씨 꼬투리 (자람)', c: '#8a6a44', solid: 0, hard: 0, drop: 'seed_emberpod', crop: { next: T.POD2 } },
  { n: '불씨 꼬투리 (여무는 중)', c: '#b06a34', solid: 0, hard: 0, drop: 'seed_emberpod', crop: { next: T.POD3 } },
  { n: '불씨 꼬투리', c: '#e8842a', solid: 0, hard: 0, drop: 'emberpod', crop: { ripe: 1, seed: 'seed_emberpod' }, light: 5 },
  /* --- 유적 고유 장식 열 --- */
  { n: '언 깃발', c: '#7fb6cc', solid: 0, hard: 0, drop: 'neverthaw', a: 1 },
  { n: '서리 글자', c: '#9fd8ea', solid: 1, hard: 2, drop: 'neverthaw', light: 3 },
  { n: '장기 단지', c: '#c8a86a', solid: 0, hard: 0, drop: 'sealed_ash', a: 1 },
  { n: '새긴 벽', c: '#b09054', solid: 1, hard: 2, drop: 'sealed_ash' },
  { n: '매단 갱등', c: '#e8b45a', solid: 0, hard: 0, drop: 'deep_ember', light: 7, a: 1 },
  { n: '버린 연장', c: '#7a6a56', solid: 0, hard: 0, drop: 'deep_ember', a: 1 },
  { n: '알주머니', c: '#8a4a80', solid: 0, hard: 0, drop: 'blight_spawn', light: 2, a: 1 },
  { n: '삭은 뼈', c: '#cfc8b0', solid: 0, hard: 0, drop: 'blight_spawn', a: 1 },
  { n: '포자 구멍', c: '#5a8a74', solid: 1, hard: 2, drop: 'spore_dust', light: 4 },
  { n: '균사 발', c: '#8fe0c4', solid: 0, hard: 0, drop: 'spore_dust', light: 2, a: 1 },
  // 공기 주머니 — 물속에 갇힌 공기.
  { n: '공기 주머니', c: '#cfeeff', solid: 0, hard: 99, air: 1 },
  // 바닷물 — 호수 물(#2f6f9f)보다 짙고 푸르다.
  { n: '바닷물', c: '#12496e', solid: 0, hard: 99, liquid: 1, sea: 1 },
  // 4단계 설비 — 다른 기계 타일과 같은 규격(단단함 1, 곡괭이 등급 무관하게 회수). mach 가 없으면 캐도 기계가 남는다(유령 기계)
  { n: '가압기', c: '#4a5a6a', solid: 1, hard: 4, drop: 'm_pressor', mach: 'pressor' },
  { n: '염수 증류기', c: '#3a6a7a', solid: 1, hard: 4, drop: 'm_desal', mach: 'desal' },
  { n: '고속 컨베이어 벨트', c: '#8a9aa8', solid: 0, hard: 4, drop: 'm_belt_f', mach: 'belt_fast' },
  { n: '강화 축전지', c: '#4a9a8a', solid: 1, hard: 4, drop: 'm_battery_hi', mach: 'battery_hi' },
  /* 염수 분출구 — 위로 짠물을 뿜는다. */
  { n: '염수 분출구', c: '#2a6a7a', solid: 1, hard: 2, drop: 'stone', tbrine: 1 },
  /* 촉발 지뢰 — 밟으면 터진다. */
  { n: '촉발 지뢰', c: '#8a5a3a', solid: 1, hard: 1, drop: 'gunpowder', tmine: 1 },
  /* 해초 — 얕은 해저에서 자란다. */
  { n: '해초', c: '#3f7a5a', solid: 0, hard: 0, drop: 'kelp', liquid: 1, plant: 1 },
  /* 조개 — 해변 장식. */
  { n: '조개', c: '#e0cdb8', solid: 0, hard: 0, drop: 'crab_shell', plant: 1 },
  /* 유황 — 화약의 원료. */
  { n: '유황', c: '#d8c04a', solid: 1, hard: 2, drop: 'sulfur', light: 1 },
  /* 방 공기 — 공기 주머니와 물리는 똑같다(air:1이라 숨이 안 줄고, 칸을 차지하니 물이 못 들어온다). */
  { n: '방 공기', c: '#3b2c1c', solid: 0, hard: 99, air: 1 },
  /* --- 야자수 (떠 있는 섬) --- */
  { n: '야자 줄기', c: '#7a5a38', solid: 0, hard: 0, drop: 'wood', tree: 1 },
  { n: '야자 잎', c: '#4f8a3a', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 40], ['wood', 30], ['leaf_palm', 30]] },
  { n: '코코넛', c: '#6a4a2a', solid: 0, hard: 0, drop: 'coconut', tree: 1 },
  /* --- 세션 3 광물 둘 (채굴 등급 5) --- */
  { n: '빙정석', c: '#9fd8e8', solid: 1, hard: 5, drop: 'glacium_ore', ore: 1, light: 2 },
  { n: '조수석', c: '#3f9a8a', solid: 1, hard: 5, drop: 'tide_ore', ore: 1, light: 2 },
  /* --- 동굴 (T 의 172~177 과 같은 순서) --- */
  { n: '이끼 낀 바위', c: '#4f6a4a', solid: 1, hard: 1, drop: 'deco_mossstone' },   // 캐면 이끼째 블록 하나 — 다시 놓으면 이끼가 이웃에 맞춰 자란다
  { n: '늘어진 이끼', c: '#6fa05a', solid: 0, hard: 0, drop: 'cave_moss', a: 1 },
  { n: '종유석', c: '#9a9488', solid: 0, hard: 1, drop: 'stone', a: 1 },
  { n: '석순', c: '#8a8478', solid: 0, hard: 1, drop: 'stone', a: 1 },
  { n: '수정 무리', c: '#a88fe8', solid: 0, hard: 2, drop: 'crystal', light: 7, a: 1 },
  /* ★ 무너질 굴 자리 전체가 이 자갈로 채워지므로, 튀는 색이면 땅속에 큰 누런 덩어리가 그대로 보여 숨은 동굴이 숨어 있지 않다. */
  { n: '금 간 자갈', c: '#5f5e62', solid: 1, hard: 1, drop: 'stone' },
  /* 지층 돌 — 돌과 똑같이 캐지고(석회암 1 · 화강암 2), 캐면 그 돌이 나와 다시 쌓을 수 있다. */
  { n: '석회암', c: '#9a9486', solid: 1, hard: 1, drop: 'limestone' },
  { n: '화강암', c: '#7a6868', solid: 1, hard: 2, drop: 'granite' },
  /* --- 흐르는 액체 --- */
  { n: '흐르는 물', c: '#2f6f9f', solid: 0, hard: 99, liquid: 1, fluid: 1 },
  { n: '흐르는 바닷물', c: '#12496e', solid: 0, hard: 99, liquid: 1, sea: 1, fluid: 1 },
  { n: '흐르는 용암', c: '#e0561c', solid: 0, hard: 99, hurt: 26, fluid: 1 },
  /* 샘 바위 — 물이 스며 나오는 바위. */
  { n: '샘 바위', c: '#5a6a70', solid: 1, hard: 2, drop: 'stone' },
  /* 물가 장식 — 부들은 물가 바닥에, 물풀은 물속 바닥에(그 칸도 물이다), 조약돌은 물가에 */
  { n: '부들', c: '#7a8a4a', solid: 0, hard: 0, drop: 'deco_cattail', plant: 1, a: 1 },
  { n: '물풀', c: '#4a8a5a', solid: 0, hard: 0, drop: 'deco_pondweed', liquid: 1, plant: 1 },
  { n: '물가 조약돌', c: '#9a948a', solid: 0, hard: 0, drop: 'deco_pebbles', plant: 1, a: 1 },
  /* 소나무 잎 — 눈 지대 나무. */
  { n: '소나무 잎', c: '#2f5a44', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 40], ['wood', 26], ['leaf_pine', 34]] },
  /* --- 운석 구덩이(game.js carveCrater) — 세계 생성에는 없고 운석이 떨어질 때만 생긴다 --- */
  { n: '운석', c: '#3a3436', solid: 1, hard: 3, drop: 'meteorite', ore: 1 },
  { n: '별빛 수정', c: '#ffe6a8', solid: 0, hard: 2, drop: 'star_crystal', a: 1 },
  { n: '녹아 굳은 돌', c: '#2e2a2e', solid: 1, hard: 2, drop: 'stone' },
  /* rich: 공장 드릴로는 줄지 않는다(factory.js runDrill) · dropN: 곡괭이로 캐면 나오는 개수 · 등급은 원래 광맥 +1 */
  { n: '석탄 광상', c: '#1c1b22', solid: 1, hard: 2, drop: 'coal', dropN: [5, 8], ore: 1, rich: 1 },
  { n: '구리 광상', c: '#c8743a', solid: 1, hard: 2, drop: 'copper_ore', dropN: [4, 7], ore: 1, rich: 1 },
  { n: '철 광상', c: '#b4a898', solid: 1, hard: 2, drop: 'iron_ore', dropN: [4, 7], ore: 1, rich: 1 },
  { n: '납 광상', c: '#9494ac', solid: 1, hard: 2, drop: 'lead_ore', dropN: [4, 7], ore: 1, rich: 1 },
  { n: '금 광상', c: '#f0c848', solid: 1, hard: 3, drop: 'gold_ore', dropN: [3, 6], ore: 1, rich: 1 },
  { n: '미스릴 광상', c: '#5ac8ba', solid: 1, hard: 3, drop: 'mythril_ore', dropN: [3, 5], ore: 1, rich: 1 },
  { n: '심층 드릴', c: '#3a6a8a', solid: 1, hard: 5, drop: 'm_drill_x', mach: 'drill_x' }
];

/* 씨앗 아이템 → 심었을 때의 첫 단계 타일 */
export const SEED_TILE = {
  seed_wheat: T.WHEAT0, seed_starroot: T.ROOT0, seed_ashcap: T.CAP0,
  seed_bloodbean: T.BEAN0, seed_bonebloom: T.BLOOM0,
  seed_frostherb: T.HERB0, seed_emberpod: T.POD0
};

/* 타일 ID → 기계 키 (data.js 로드 시 1회 구축) */
/* ★ 기계 타일은 벨트 둘만 통과하고 나머지는 전부 몸이 있다(밟고 서거나 막힌다). */
export const MACH_OF_TILE = {};
for (let i = 0; i < TILE_DEF.length; i++) if (TILE_DEF[i].mach) MACH_OF_TILE[i] = TILE_DEF[i].mach;

/* 손그림 타일 애셋 이름 → 타일 ID. manifest.json의 tiles에 이 이름으로 파일을 넣어 두면 절차 생성 텍스처를 자동으로 덮어쓴다. */
export const TILE_SPRITE = {
  steelplate: T.STEELPLATE, conduit: T.CONDUIT,
  coal: T.COAL, lead: T.LEAD, oilshale: T.OILSHALE,
  icebrick: T.ICEBRICK, sandbrick: T.SANDBRICK, minewood: T.MINEWOOD,
  m_dart: T.M_DART, m_flame: T.M_FLAME, m_frost: T.M_FROST,
  m_pressor: T.M_PRESSOR, m_desal: T.M_DESAL, m_belt_f: T.M_BELT_F, m_battery_hi: T.M_BATTERY_HI, m_drill_x: T.M_DRILL_X,
  junglegrass: T.JUNGLEGRASS, mud: T.MUD, jungleleaf: T.JUNGLELEAF, fern: T.FERN, orchid: T.ORCHID,
  glowmoss: T.GLOWMOSS, sporestone: T.SPORESTONE, glowcap: T.GLOWCAP, glowleaf: T.GLOWLEAF, lily: T.LILY, airpocket: T.AIRPOCKET, roomair: T.ROOMAIR,
  palmwood: T.PALMWOOD, palmleaf: T.PALMLEAF, coconut: T.COCONUT, seawater: T.SEAWATER,
  dart_l: T.DART_L, dart_r: T.DART_R, flamevent: T.FLAMEVENT, crumble: T.CRUMBLE,
  sparkcoil: T.SPARKCOIL, gasvent: T.GASVENT, grinder: T.GRINDER, cipherstone: T.CIPHERSTONE,
  brinevent: T.BRINEVENT, tripmine: T.TRIPMINE,
  kelpplant: T.KELPPLANT, seashell: T.SEASHELL, sulfur: T.SULFUR,
  glacium: T.GLACIUM, tidestone: T.TIDESTONE,
  slagsteel: T.SLAGSTEEL, coreglass: T.COREGLASS,
  water: T.WATER, falls: T.FALLS,
  archestone: T.ARCHESTONE, draftglass: T.DRAFTGLASS, archseal: T.ARCHSEAL,
  orbitplate: T.ORBITPLATE, orbitcore: T.ORBITCORE, deeprock: T.DEEPROCK, blackdamp: T.BLACKDAMP,
  thatch: T.THATCH, rooftile: T.ROOFTILE, timberwall: T.TIMBERWALL,
  wallstone: T.WALLSTONE, battlement: T.BATTLEMENT, window: T.WINDOW,
  fence: T.FENCE, lamppost: T.LAMPPOST, banner: T.BANNER,
  haybale: T.HAYBALE, sandbag: T.SANDBAG, farmland: T.FARMLAND
};
/* 작물은 단계마다 파일이 하나씩 온다 (tile_wheat0 ~ tile_wheat3 규칙) */
for (let i = 0; i < 4; i++) {
  TILE_SPRITE['wheat' + i] = T.WHEAT0 + i;
  TILE_SPRITE['starroot' + i] = T.ROOT0 + i;
  TILE_SPRITE['ashcap' + i] = T.CAP0 + i;
}
for (const id in MACH_OF_TILE) TILE_SPRITE['m_' + MACH_OF_TILE[id]] = +id;

export const WALL_COLOR = [null, '#3a2a1a', '#33333a', '#241c2e', '#402d1a', '#4a5f6e', '#32323c', '#2a2018', '#6b5a34',
  '#3f5266', '#332f26', '#23301f', '#22322e', '#3c3a34', '#4a3520', '#5a4128'];
// 9: 하늘돌, 10: 유적, 11: 정글, 12: 버섯 골짜기, 13: 성벽(WALLSTONE을 어둡게 — 성문 안쪽 배경) 15: 나무 판자 벽지 — 벽돌결이 아니라 세로 판자결로
// 그린다(paintWoodWall)

/* ---------------- 희귀도 ---------------- */
export const RARITY = ['일반', '고급', '희귀', '영웅', '전설', '신화'];
export const RARITY_COLOR = ['#b8b8b8', '#5fc45f', '#4f9cf0', '#a866e8', '#e8912a', '#e8484f'];
export const RARITY_MULT = [1, 1.12, 1.28, 1.5, 1.8, 2.2];

/* 무기 최소 착용 레벨 — 등급(tier)이 곧 세기이므로 무기마다 따로 적지 않고 여기서 뽑는다. */
export const WEAPON_TIER_LV = [1, 2, 5, 6, 11, 16, 20, 26, 44, 78];

/* ---------------- 접사 ---------------- */
export const PREFIX = [
  { n: '날카로운', s: { dmgP: 0.10 } }, { n: '잔혹한', s: { dmgP: 0.16, crit: 3 } },
  { n: '신속한', s: { spdP: 0.16 } }, { n: '가벼운', s: { spdP: 0.10, ms: 4 } },
  { n: '불타는', s: { fire: 1, dmgP: 0.08 } }, { n: '서리 맺힌', s: { frost: 1 } },
  { n: '영혼을 먹는', s: { lifesteal: 4 } }, { n: '정밀한', s: { crit: 8 } },
  { n: '무거운', s: { dmgP: 0.22, spdP: -0.12, kbP: 0.5 } }, { n: '고대의', s: { dmgP: 0.14, allStat: 2 } }
];
export const SUFFIX = [
  { n: '의 활력', s: { hp: 20 } }, { n: '의 통찰', s: { mp: 15, cdr: 5 } },
  { n: '의 분노', s: { str: 4 } }, { n: '의 바람', s: { dex: 4 } },
  { n: '의 심연', s: { int: 4 } }, { n: '의 성벽', s: { def: 5, vit: 3 } },
  { n: '의 별빛', s: { allStat: 3 } }, { n: '의 사냥꾼', s: { crit: 6, ms: 5 } }
];
