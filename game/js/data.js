/* ===== data.js — 타일 / 아이템 / 적 / 스킬 / 스토리 ===== */
'use strict';

/* ---------------- 타일 ---------------- */
const T = {
  AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, SAND: 4, SANDSTONE: 5, SNOW: 6, ICE: 7,
  WOOD: 8, LEAF: 9, EBONSTONE: 10, CORRUPTGRASS: 11, ASH: 12, OBSIDIAN: 13,
  COPPER: 14, IRON: 15, GOLD: 16, MYTHRIL: 17, SOULSTONE: 18, HELLSTONE: 19,
  PLANK: 20, BRICK: 21, TORCH: 22, PLATFORM: 23, BEDROCK: 24, VINE: 25,
  CRYSTAL: 26, LAVA: 27, ALTARSTONE: 28, CORRUPTLEAF: 29,
  /* --- 2부: 하늘 섬 / 숨겨진 유적 --- */
  CLOUD: 30, SKYSTONE: 31, SKYGRASS: 32, SKYLEAF: 33,
  RUINBRICK: 34, RUINTILE: 35, RUNESTONE: 36, SEALSTONE: 37, AETHER: 38,
  /* --- 세션 2: 지하 공창 --- */
  STEELPLATE: 39, POWERSTONE: 40, CONDUIT: 41,
  /* --- 큰 동굴 함정 --- */
  SPIKE: 42,
  /* --- 채집 장식 --- */
  FLOWER: 43, WEED: 44, CACTUS: 45, MUSHROOM: 46,
  /* --- 사막: 닿으면 피해를 주는 큰 선인장(고체 블록) --- */
  CACTUS_BLOCK: 47,
  /* --- 3단계: 동력 자원 --- */
  COAL: 48, LEAD: 49, OILSHALE: 50,
  /* --- 3단계: 공장 기계 (전부 1×1, 통과 가능) --- */
  M_BELT: 51, M_DRILL: 52, M_DRILL_E: 53, M_PUMP: 54, M_SMELTER: 55,
  M_PRESS: 56, M_REFINERY: 57, M_ASSEMBLER: 58, M_CRATE: 59, M_GEN: 60,
  M_BATTERY: 61, M_POLE: 62, M_SORTER: 63, M_TURRET: 64, M_TRAP: 65, M_SWITCH: 66,
  /* --- 4단계: 마을 건축 · 방어 --- */
  THATCH: 67, ROOFTILE: 68, TIMBERWALL: 69, WALLSTONE: 70, BATTLEMENT: 71,
  WINDOW: 72, FENCE: 73, LAMPPOST: 74, BANNER: 75, HAYBALE: 76, SANDBAG: 77,
  /* --- 4단계: 농업. 작물은 자라는 단계마다 타일이 하나씩 배정된다 --- */
  FARMLAND: 78,
  WHEAT0: 79, WHEAT1: 80, WHEAT2: 81, WHEAT3: 82,
  ROOT0: 83, ROOT1: 84, ROOT2: 85, ROOT3: 86,
  CAP0: 87, CAP1: 88, CAP2: 89, CAP3: 90,
  /* --- 4단계: 마을 기계 --- */
  M_WINDMILL: 91, M_MILL: 92, M_OVEN: 93,
  /* --- 5단계: 새 바이옴 (울림 정글 / 버섯 골짜기) --- */
  JUNGLEGRASS: 94, MUD: 95, JUNGLELEAF: 96, FERN: 97, ORCHID: 98,
  GLOWMOSS: 99, SPORESTONE: 100, GLOWCAP: 101,
  /* --- 6단계: 유적 --- */
  ICEBRICK: 102, SANDBRICK: 103, MINEWOOD: 104,
  M_DART: 105, M_FLAME: 106, M_FROST: 107,
  /* --- 고대 유적 함정 (기계 아님 — 타일만으로 돈다) --- */
  DART_L: 108, DART_R: 109, FLAMEVENT: 110, CRUMBLE: 111,
  /* --- 7단계: 폭주로 --- */
  SLAGSTEEL: 112, COREGLASS: 113,
  /* --- 동굴 물 — 고인 물(WATER)과 떨어지는 물(FALLS). 둘 다 헤엄칠 수 있다 --- */
  WATER: 114, FALLS: 115,
  /* --- 세션 2 종장: 설계실 --- */
  ARCHESTONE: 116, DRAFTGLASS: 117, ARCHSEAL: 118,
  /* --- 특별 유적: 부유 성채(하늘) · 무너진 갱(최심부) --- */
  ORBITPLATE: 119, ORBITCORE: 120, DEEPROCK: 121, BLACKDAMP: 122,
  /* --- v1.0.4: 버섯 골짜기 나무 갓(캐노피) 전용 타일 ---
     GLOWCAP(101)은 유적 등에서 "혼자 선 발광 버섯" 장식으로 계속 쓰인다(줄기+갓을
     한 타일에 다 그려서 하나만 있어도 버섯처럼 보여야 하는 자리). 나무 갓은 그 타일을
     여러 개 붙여 놓다 보니 "따로 선 버섯 여러 개"로 보였다 — 잎(LEAF)처럼 타일 하나가
     캐노피의 "표면 조각"만 그리는 전용 타일을 따로 둔다. */
  GLOWLEAF: 123,
  /* --- v1.0.5: 울림 정글 호수 수면 장식 --- */
  LILY: 124,
  /* --- v1.1: 유적 함정 셋 (기계가 아니라 타일만으로 돈다) ---
     SPARKCOIL 은 마주 보는 코일끼리 전기 아크를 잇고, GASVENT 는 유독 가스를 뿜고,
     GRINDER 는 벽에 박힌 톱니가 튀어나온다. 세션 2 지역(공창·폭주로)은 전기 문명이라
     코일을 더 많이 세운다. */
  SPARKCOIL: 125, GASVENT: 126, GRINDER: 127, CIPHERSTONE: 128,
  /* --- v1.1: 전리품으로만 씨를 얻는 작물 넷 ---
     밀·별무·잿버섯은 씨앗이 밭에서 돌아오지만, 이 넷은 **몬스터가 떨군 것으로만**
     씨를 만든다(RECIPES 참고). 그래서 밭이 사냥과 이어진다 — 젤을 모아야 콩을 심고,
     뼛조각을 모아야 뼈꽃이 핀다. 새 재료를 하나도 늘리지 않고 기존 전리품만 쓴다. */
  BEAN0: 129, BEAN1: 130, BEAN2: 131, BEAN3: 132,
  BLOOM0: 133, BLOOM1: 134, BLOOM2: 135, BLOOM3: 136,
  HERB0: 137, HERB1: 138, HERB2: 139, HERB3: 140,
  POD0: 141, POD1: 142, POD2: 143, POD3: 144
};

// solid: 충돌, hard: 필요 곡괭이 등급, light: 발광, drop: 채굴 시 아이템
const TILE_DEF = [
  { n: '공기', c: null, solid: 0, hard: 0 },
  { n: '흙', c: '#6b4a2f', solid: 1, hard: 0, drop: 'dirt' },
  { n: '풀', c: '#4a7a34', solid: 1, hard: 0, drop: 'dirt' },
  { n: '돌', c: '#5d5d63', solid: 1, hard: 1, drop: 'stone' },
  { n: '모래', c: '#c8ab6a', solid: 1, hard: 0, drop: 'sand' },
  { n: '사암', c: '#9c8047', solid: 1, hard: 1, drop: 'stone' },
  { n: '눈', c: '#d5e2ee', solid: 1, hard: 0, drop: 'dirt' },
  { n: '얼음', c: '#8fc0dd', solid: 1, hard: 1, drop: 'ice_shard' },
  { n: '나무', c: '#5a3c22', solid: 0, hard: 0, drop: 'wood', tree: 1 },
  /* 잎 — tree(벌목 연쇄 대상)이면서 leaf(기둥이 아니라 수관)로 따로 표시한다.
     leafDrop은 가중치 표. 'none'이면 아무것도 안 떨어진다 — 잎은 원래 대부분 빈손이고,
     바이옴별로 그 지형에서만 나오는 재료가 낮은 확률로 섞이게 해서 "특정 숲의 잎을
     일부러 훑을 이유"를 만들었다. */
  { n: '잎', c: '#3f6e2e', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 64], ['wood', 36]] },
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
    leafDrop: [['none', 58], ['wood', 30], ['corrupt_ess', 12]] },
  /* --- 2부 --- */
  { n: '구름', c: '#dfe9f5', solid: 1, hard: 0, drop: 'cloud_block' },
  { n: '하늘돌', c: '#8fa8c0', solid: 1, hard: 2, drop: 'skystone' },
  { n: '하늘 풀', c: '#7fd0a8', solid: 1, hard: 0, drop: 'cloud_block' },
  { n: '하늘 잎', c: '#6ec49a', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 58], ['wood', 30], ['aether_shard', 12]] },
  { n: '유적 벽돌', c: '#6a6250', solid: 1, hard: 3, drop: 'ruin_brick' },
  { n: '유적 바닥', c: '#57503f', solid: 1, hard: 3, drop: 'ruin_brick' },
  { n: '룬석', c: '#4a5f7a', solid: 1, hard: 99, light: 8 },
  { n: '봉인석', c: '#3a3550', solid: 1, hard: 99, light: 4 },
  { n: '에테르 광맥', c: '#8fe0d8', solid: 1, hard: 3, drop: 'aether_shard', ore: 1, light: 7 },
  /* --- 세션 2: 지하 공창 --- */
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
  /* --- 3단계 동력 자원 --- */
  { n: '석탄층', c: '#2b2a2f', solid: 1, hard: 1, drop: 'coal', ore: 1 },
  { n: '납 광맥', c: '#7d7d90', solid: 1, hard: 1, drop: 'lead_ore', ore: 1 },
  { n: '유혈암', c: '#3b352c', solid: 1, hard: 2, drop: 'crude_oil', ore: 1 },
  /* --- 3단계 공장 기계 ---
     전부 1×1 · 통과 가능 · 곡괭이 등급과 무관하게 즉시 회수된다.
     mach 필드가 MACHINE 표의 키와 짝을 이루고, 이걸로 타일↔기계를 오간다. */
  { n: '컨베이어 벨트', c: '#6a6a74', solid: 0, hard: 0, drop: 'm_belt', mach: 'belt' },
  { n: '기계식 드릴', c: '#8a6a3a', solid: 0, hard: 0, drop: 'm_drill', mach: 'drill' },
  { n: '전동 드릴', c: '#4a8ab0', solid: 0, hard: 0, drop: 'm_drill_e', mach: 'drill_e' },
  { n: '시추 펌프', c: '#5a5040', solid: 0, hard: 0, drop: 'm_pump', mach: 'pump' },
  { n: '자동 용광로', c: '#7a4a30', solid: 0, hard: 0, drop: 'm_smelter', mach: 'smelter' },
  { n: '압축기', c: '#6a6a74', solid: 0, hard: 0, drop: 'm_press', mach: 'press' },
  { n: '정제기', c: '#4a5a4a', solid: 0, hard: 0, drop: 'm_refinery', mach: 'refinery' },
  { n: '조립기', c: '#5a6a8a', solid: 0, hard: 0, drop: 'm_assembler', mach: 'assembler' },
  { n: '수집 상자', c: '#8a6a3a', solid: 0, hard: 0, drop: 'm_crate', mach: 'crate' },
  { n: '화력 발전기', c: '#7a5a3a', solid: 0, hard: 0, drop: 'm_gen', mach: 'gen', light: 5 },
  { n: '축전지', c: '#4a7a6a', solid: 0, hard: 0, drop: 'm_battery', mach: 'battery', light: 4 },
  { n: '전주', c: '#7a6a4a', solid: 0, hard: 0, drop: 'm_pole', mach: 'pole' },
  { n: '분류기', c: '#8a7a4a', solid: 0, hard: 0, drop: 'm_sorter', mach: 'sorter' },
  { n: '자동 포탑', c: '#6a6a74', solid: 0, hard: 0, drop: 'm_turret', mach: 'turret' },
  { n: '전격 함정', c: '#4a6a8a', solid: 0, hard: 0, drop: 'm_trap', mach: 'trap' },
  { n: '정지 스위치', c: '#a03a30', solid: 0, hard: 0, drop: 'm_switch', mach: 'switch', light: 3 },
  /* --- 4단계: 마을 건축 ---
     clear: 빛이 거의 그대로 통과하는 고체(창문). soft: 위에 떨어져도 낙하 피해가 없는 것(건초더미) */
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
  /* --- 4단계: 농업 ---
     crop.next 가 있으면 아직 자라는 중, crop.ripe 면 다 여문 것.
     seed 는 수확할 때 함께 돌려주는 씨앗이다. */
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
  /* --- 4단계: 마을 기계 --- */
  { n: '풍차', c: '#c8bca0', solid: 0, hard: 0, drop: 'm_windmill', mach: 'windmill' },
  { n: '밀링기', c: '#8a7a5a', solid: 0, hard: 0, drop: 'm_mill', mach: 'mill' },
  { n: '화덕', c: '#9a6a4a', solid: 0, hard: 0, drop: 'm_oven', mach: 'oven', light: 6 },
  /* --- 5단계: 울림 정글 --- */
  { n: '정글 풀', c: '#3f7a34', solid: 1, hard: 0, drop: 'mud' },
  { n: '진흙', c: '#4a3a26', solid: 1, hard: 0, drop: 'mud' },
  { n: '정글 잎', c: '#2f6a28', solid: 0, hard: 0, drop: 'wood', tree: 1, leaf: 1,
    leafDrop: [['none', 50], ['wood', 26], ['fern_frond', 16], ['vine_coil', 8]] },
  { n: '고사리', c: '#4a8a3a', solid: 0, hard: 0, drop: 'fern_frond' },
  { n: '밀림꽃', c: '#c85a9a', solid: 0, hard: 0, drop: 'orchid', light: 3 },
  /* --- 5단계: 버섯 골짜기 --- */
  { n: '발광 이끼', c: '#4a7a6a', solid: 1, hard: 0, drop: 'dirt', light: 5 },
  { n: '포자암', c: '#4a5a5a', solid: 1, hard: 1, drop: 'stone' },
  { n: '발광 버섯', c: '#6fe0c0', solid: 0, hard: 0, drop: 'glowcap', light: 9 },
  /* --- 6단계: 유적 벽재 --- */
  { n: '얼음 벽돌', c: '#7fb0d8', solid: 1, hard: 2, drop: 'icebrick' },
  { n: '사암 벽돌', c: '#c8a468', solid: 1, hard: 2, drop: 'sandbrick' },
  { n: '갱목', c: '#6a4a2a', solid: 1, hard: 1, drop: 'plank' },
  /* --- 6단계: 유적 함정 (기계 체계에 얹어 방향·저장·철거를 공짜로 쓴다) --- */
  { n: '화살 발사기', c: '#7a6a5a', solid: 0, hard: 0, drop: 'm_dart', mach: 'dart' },
  { n: '화염 분사구', c: '#9a5a3a', solid: 0, hard: 0, drop: 'm_flame', mach: 'flamejet', light: 4 },
  { n: '서리 분사구', c: '#6a9ab0', solid: 0, hard: 0, drop: 'm_frost', mach: 'frostjet' },
  /* --- 고대 유적 함정 ---
     세션 1의 유적은 기계 문명 이전 것이라 기계 체계를 쓰지 않는다. 상태를 저장하지 않고
     타일 좌표 해시로 각자 다른 박자를 만들어 돌아간다. */
  { n: '화살 구멍 (왼쪽)', c: '#4a4238', solid: 1, hard: 2, drop: 'stone', tdart: -1 },
  { n: '화살 구멍 (오른쪽)', c: '#4a4238', solid: 1, hard: 2, drop: 'stone', tdart: 1 },
  { n: '불길 분출구', c: '#8a4a2a', solid: 1, hard: 2, drop: 'stone', tvent: 1, light: 4 },
  { n: '부서지는 바닥', c: '#6a6050', solid: 1, hard: 1, drop: 'stone', crumble: 1 },
  /* --- 7단계: 폭주로 --- */
  { n: '녹아내린 강철', c: '#5a4a44', solid: 1, hard: 4, drop: 'steel_plate' },
  { n: '노심 유리', c: '#e8b04a', solid: 1, hard: 4, drop: 'power_core', ore: 1, light: 10 },
  /* --- 동굴 물 ---
     용암과 같은 자리(비고체·곡괭이로 못 캠)지만 hurt가 없다. liquid를 보고 Ent.move가
     부력과 저항을 건다. 떨어지는 물은 아래로 밀어내는 흐름(flow)이 하나 더 붙는다. */
  { n: '고인 물', c: '#2f6f9f', solid: 0, hard: 99, liquid: 1 },
  { n: '떨어지는 물', c: '#4a8fc0', solid: 0, hard: 99, liquid: 1, flow: 1 },
  /* --- 세션 2 종장: 설계실 ---
     공창이 강철로 지어졌다면 이곳은 그보다 앞선 것 — 이음매가 없는 흰 돌이다. */
  { n: '원형석', c: '#cfc7b8', solid: 1, hard: 4, drop: 'archestone' },
  { n: '설계 유리', c: '#8fd8e8', solid: 1, hard: 4, drop: 'draft_glass', ore: 1, light: 8 },
  { n: '설계실 봉인', c: '#b8a878', solid: 1, hard: 99 },
  /* --- 특별 유적 ---
     궤도판은 부유 성채의 벽·바닥. 궤도핵은 그 안에 박힌 광맥이다.
     심층암과 유독가스 주머니는 최심부 폐광의 것 — 가스는 밟으면 아프고 곡괭이로 못 캔다. */
  { n: '궤도판', c: '#8fa8c8', solid: 1, hard: 5, drop: 'orbit_plate' },
  { n: '궤도핵', c: '#7fe0ff', solid: 1, hard: 5, drop: 'orbit_gear', ore: 1, light: 10 },
  { n: '심층암', c: '#3a3630', solid: 1, hard: 5, drop: 'deep_stone' },
  { n: '유독 가스', c: '#6a7a4a', solid: 0, hard: 99, hurt: 14, light: 2 },
  { n: '갓 조각', c: '#6fe0c0', solid: 0, hard: 0, drop: 'glowcap', tree: 1, leaf: 1, light: 4,
    leafDrop: [['none', 55], ['glowcap', 30], ['spore_sac', 15]] },
  { n: '수련', c: '#3a9a6a', solid: 2, hard: 0, drop: 'lily_pad' },
  /* --- v1.1: 새 유적 함정 ---
     tcoil: 마주 보는 코일을 찾아 그 사이에 전기 아크를 놓는다 (세션 2 전기 문명)
     tgas:  유독 가스를 위로 뿜는다. 예고가 길고 범위가 넓다 — 지나갈 틈을 재는 함정
     tgrind: 벽에서 톱니가 튀어나온다. 붙어 걷지 못하게 만든다 */
  { n: '방전 코일', c: '#5a8aa8', solid: 1, hard: 3, drop: 'copper_ore', tcoil: 1, light: 3 },
  { n: '가스 분출구', c: '#6a7a4a', solid: 1, hard: 2, drop: 'stone', tgas: 1 },
  { n: '톱니 구멍', c: '#6a6058', solid: 1, hard: 3, drop: 'iron_ore', tgrind: 1 },
  /* 암호석 — 숫자 잠긴 골방을 통째로 두르는 돌.
     ★ hard 99 라 **어떤 곡괭이로도 캘 수 없다.** 예전에는 문만 봉인석이고 벽은 평범한
       유적 벽돌이라, 암호를 풀 것 없이 옆을 파고 들어가면 그만이었다.
     겉모습은 유적 벽돌(#6a6250)에서 크게 벗어나지 않게 두고, 룬빛만 옅게 얹어
       "여기는 손대지 못하는 자리"로 읽히게 했다 — 구조 안에 어울려야 하므로. */
  { n: '암호석', c: '#5f5947', solid: 1, hard: 99, light: 3 },
  /* --- v1.1: 전리품 작물 넷 ---
     기존 셋과 규칙이 완전히 같다(4단계 · crop.next / crop.ripe · drop).
     다른 것은 씨앗을 밭에서 얻을 수 없다는 것뿐이다 — 잡아야 심는다. */
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
  { n: '불씨 꼬투리', c: '#e8842a', solid: 0, hard: 0, drop: 'emberpod', crop: { ripe: 1, seed: 'seed_emberpod' }, light: 5 }
];

/* 씨앗 아이템 → 심었을 때의 첫 단계 타일 */
const SEED_TILE = {
  seed_wheat: T.WHEAT0, seed_starroot: T.ROOT0, seed_ashcap: T.CAP0,
  seed_bloodbean: T.BEAN0, seed_bonebloom: T.BLOOM0,
  seed_frostherb: T.HERB0, seed_emberpod: T.POD0
};

/* 타일 ID → 기계 키 (data.js 로드 시 1회 구축) */
const MACH_OF_TILE = {};
for (let i = 0; i < TILE_DEF.length; i++) if (TILE_DEF[i].mach) MACH_OF_TILE[i] = TILE_DEF[i].mach;

/* 손그림 타일 애셋 이름 → 타일 ID.
   manifest.json의 tiles에 이 이름으로 파일을 넣어 두면 절차 생성 텍스처를 자동으로 덮어쓴다
   (ASSETS-TODO.md의 파일명과 짝을 맞춰 둔 표다). */
const TILE_SPRITE = {
  steelplate: T.STEELPLATE, conduit: T.CONDUIT,
  coal: T.COAL, lead: T.LEAD, oilshale: T.OILSHALE,
  icebrick: T.ICEBRICK, sandbrick: T.SANDBRICK, minewood: T.MINEWOOD,
  m_dart: T.M_DART, m_flame: T.M_FLAME, m_frost: T.M_FROST,
  junglegrass: T.JUNGLEGRASS, mud: T.MUD, jungleleaf: T.JUNGLELEAF, fern: T.FERN, orchid: T.ORCHID,
  glowmoss: T.GLOWMOSS, sporestone: T.SPORESTONE, glowcap: T.GLOWCAP, glowleaf: T.GLOWLEAF, lily: T.LILY,
  dart_l: T.DART_L, dart_r: T.DART_R, flamevent: T.FLAMEVENT, crumble: T.CRUMBLE,
  sparkcoil: T.SPARKCOIL, gasvent: T.GASVENT, grinder: T.GRINDER, cipherstone: T.CIPHERSTONE,
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

const WALL_COLOR = [null, '#3a2a1a', '#33333a', '#241c2e', '#402d1a', '#4a5f6e', '#32323c', '#2a2018', '#6b5a34',
  '#3f5266', '#332f26', '#23301f', '#22322e', '#3c3a34', '#4a3520'];
// 9: 하늘돌, 10: 유적, 11: 정글, 12: 버섯 골짜기,
// 13: 성벽(WALLSTONE을 어둡게 — 성문 안쪽 배경), 14: 전주 기둥(통행·경작을 막지 않는 배경 기둥)

/* ---------------- 희귀도 ---------------- */
const RARITY = ['일반', '고급', '희귀', '영웅', '전설', '신화'];
const RARITY_COLOR = ['#b8b8b8', '#5fc45f', '#4f9cf0', '#a866e8', '#e8912a', '#e8484f'];
const RARITY_MULT = [1, 1.12, 1.28, 1.5, 1.8, 2.2];

/* 무기 최소 착용 레벨 — 등급(tier)이 곧 세기이므로 무기마다 따로 적지 않고 여기서 뽑는다.
   예전에는 무기 62종이 저마다 lvReq를 들고 있었는데 값이 전부 tier*4라 정보가 없었고,
   그 결과 최고 등급이 42에서 끝났다. 실제 진행 레벨과 한참 어긋난 수치였다 —
   장 보상 경험치만 더해도 제9장(세션 2 시작)에 이미 83, 마지막 장이면 200을 넘는다.

   기준은 "그 등급이 처음 손에 들어오는 장에서의 레벨"보다 살짝 아래다. 위로 잡으면
   방금 잡은 보스가 떨군 무기를 못 드는 일이 생기므로(예: 뼈의 군주는 제2장 보스인데
   그 전리품이 레벨 12를 요구하던 식), 막는 쪽보다 자연스럽게 충족되는 쪽으로 뒀다. */
const WEAPON_TIER_LV = [1, 2, 5, 6, 11, 16, 20, 26, 44, 78];

/* ---------------- 접사 ---------------- */
const PREFIX = [
  { n: '날카로운', s: { dmgP: 0.10 } }, { n: '잔혹한', s: { dmgP: 0.16, crit: 3 } },
  { n: '신속한', s: { spdP: 0.16 } }, { n: '가벼운', s: { spdP: 0.10, ms: 4 } },
  { n: '불타는', s: { fire: 1, dmgP: 0.08 } }, { n: '서리 맺힌', s: { frost: 1 } },
  { n: '영혼을 먹는', s: { lifesteal: 4 } }, { n: '정밀한', s: { crit: 8 } },
  { n: '무거운', s: { dmgP: 0.22, spdP: -0.12, kbP: 0.5 } }, { n: '고대의', s: { dmgP: 0.14, allStat: 2 } }
];
const SUFFIX = [
  { n: '의 활력', s: { hp: 20 } }, { n: '의 통찰', s: { mp: 15, cdr: 5 } },
  { n: '의 분노', s: { str: 4 } }, { n: '의 바람', s: { dex: 4 } },
  { n: '의 심연', s: { int: 4 } }, { n: '의 성벽', s: { def: 5, vit: 3 } },
  { n: '의 별빛', s: { allStat: 3 } }, { n: '의 사냥꾼', s: { crit: 6, ms: 5 } }
];

/* ---------------- 아이템 ---------------- */
// type: weapon / tool / armor / acc / consum / mat / block / summon
const ITEMS = {
  /* --- 근접 --- */
  sword_wood:   { n: '금 간 목검', i: '🗡', type: 'weapon', wc: 'melee', dmg: 9,  spd: 2.2, kb: 3, reach: 40, tier: 0, d: '아버지의 창고 구석에서 찾아낸 연습용 검.'  },
  sword_copper: { n: '구리 장검', i: '⚔', type: 'weapon', wc: 'melee', dmg: 16, spd: 2.0, kb: 4, reach: 44, tier: 1, d: '무르지만 정직하게 벤다.'  },
  sword_iron:   { n: '강철 브로드소드', i: '⚔', type: 'weapon', wc: 'melee', dmg: 28, spd: 1.9, kb: 5, reach: 48, tier: 2, d: '잿빛 마을 대장간의 표준품.'  },
  sword_bone:   { n: '뼈의 군주의 이빨', i: '🦴', type: 'weapon', wc: 'melee', dmg: 42, spd: 2.3, kb: 4, reach: 46, tier: 3, lifesteal: 5, d: '휘두를 때마다 낮은 웃음소리가 난다.'  },
  sword_mythril:{ n: '미스릴 세이버', i: '⚔', type: 'weapon', wc: 'melee', dmg: 58, spd: 2.4, kb: 5, reach: 50, tier: 4, d: '푸른 잔상이 궤적을 따라 남는다.'  },
  sword_dawn:   { n: '여명의 대검', i: '🌅', type: 'weapon', wc: 'melee', dmg: 88, spd: 1.7, kb: 9, reach: 62, tier: 5, fire: 2, d: '한 번의 일격에 밤을 걷어낸다.'  },
  scythe_void:  { n: '공허의 낫', i: '🌑', type: 'weapon', wc: 'melee', dmg: 128, spd: 2.1, kb: 7, reach: 66, tier: 6, lifesteal: 9, d: '벤 자리에 잠시 별이 보인다.'  },

  /* --- 원거리 --- */
  bow_hunt:     { n: '사냥용 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 10, spd: 2.0, kb: 2, tier: 0, proj: 'arrow', d: '숲의 첫 친구.'  },
  bow_copper:   { n: '구리 강궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 19, spd: 2.0, kb: 3, tier: 1, proj: 'arrow'  },
  bow_iron:     { n: '강철 장궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 32, spd: 2.1, kb: 3, tier: 2, proj: 'arrow'  },
  bow_storm:    { n: '폭풍의 활', i: '🌪', type: 'weapon', wc: 'ranged', dmg: 48, spd: 2.6, kb: 3, tier: 4, proj: 'arrow', multi: 2, d: '시위를 놓으면 바람이 먼저 간다.'  },
  bow_starfall: { n: '별똥의 사수', i: '☄', type: 'weapon', wc: 'ranged', dmg: 96, spd: 2.4, kb: 4, tier: 6, proj: 'star', multi: 3, d: '떨어진 별의 파편으로 만든 시위.'  },

  /* --- 마법 --- */
  staff_branch: { n: '옹이진 나뭇가지', i: '🪄', type: 'weapon', wc: 'magic', dmg: 11, spd: 1.8, kb: 2, mana: 4, tier: 0, proj: 'bolt', d: '마을 마녀가 쥐여준 물건.'  },
  staff_flame:  { n: '불꽃의 홀', i: '🔥', type: 'weapon', wc: 'magic', dmg: 26, spd: 1.6, kb: 3, mana: 7, tier: 2, proj: 'fire', d: '손잡이가 늘 따뜻하다.'  },
  staff_frost:  { n: '서리 지팡이', i: '❄', type: 'weapon', wc: 'magic', dmg: 40, spd: 1.9, kb: 2, mana: 8, tier: 3, proj: 'frost', d: '맞은 것은 느려진다.'  },
  staff_soul:   { n: '영혼 수확자', i: '💠', type: 'weapon', wc: 'magic', dmg: 62, spd: 2.2, kb: 2, mana: 9, tier: 4, proj: 'soul', multi: 2  },
  staff_abyss:  { n: '심연의 홀', i: '🔮', type: 'weapon', wc: 'magic', dmg: 110, spd: 2.0, kb: 4, mana: 14, tier: 6, proj: 'void', multi: 2, d: '별이 잠든 자리에서 자란 결정.'  },

  /* --- 도구 --- */
  pick_copper:  { n: '구리 곡괭이', i: '⛏', type: 'tool', power: 1, dmg: 6, spd: 2.2, d: '돌 · 얼음 · 구리 · 철까지 캘 수 있다.' , lvReq: 0},
  /* 굴 파는 이의 시작 곡괭이. 채굴 등급(power)과 속도는 구리 곡괭이와 똑같고
     날만 세워 두어 공격력이 조금 높다 — 곡괭이 하나로 시작해도 다른 넷과
     초반 화력이 같아지도록 맞춘 값이다(9 × 2.2 = 19.8, 목검과 동일). */
  pick_sharp:   { n: '날카로운 곡괭이', i: '⛏', type: 'tool', power: 1, dmg: 9, spd: 2.2, d: '구리 곡괭이와 같은 것을 캐지만, 날을 세워 두어 더 아프게 때린다.' , lvReq: 0},
  pick_iron:    { n: '강철 곡괭이', i: '⛏', type: 'tool', power: 2, dmg: 9, spd: 2.4, d: '금 · 수정 · 미스릴을 캘 수 있다.' , lvReq: 5},
  pick_mythril: { n: '미스릴 곡괭이', i: '⛏', type: 'tool', power: 3, dmg: 14, spd: 2.7, d: '흑요암 · 영혼석 · 지옥석을 캘 수 있다.' , lvReq: 10},
  pick_soul:    { n: '영혼 착암기', i: '⛏', type: 'tool', power: 4, dmg: 20, spd: 3.2, d: '기반암 외의 모든 것을 뚫는다.' , lvReq: 16},
  axe_iron:     { n: '강철 도끼', i: '🪓', type: 'tool', power: 1, dmg: 12, spd: 2.0, chop: 3 , lvReq: 5},

  /* --- 낚시 ---
     type: 'rod'는 곡괭이(mine)나 블록(place)과는 다른 우클릭 경로를 탄다 — 물 블록을 겨눠야
     캐스팅된다. fishWait는 입질까지 걸리는 시간 배율, fishBonus는 상위 어종 확률 가산치다. */
  /* fishItemChance — 물고기가 아니라 "무언가 다른 것"이 걸릴 기본 확률.
     일반 낚싯대는 거의 0에 가깝고, 숙련된 낚싯대에서 크게 뛴다 — 결과표는
     resolveFish()의 itemTable을 보라(포션·잡템·장신구). */
  rod_basic: { n: '평범한 낚싯대', i: '🎣', type: 'rod', fishWait: 1, fishBonus: 0, fishItemChance: 0.015,
               d: '물 블록에 우클릭해 던진다. 생고기가 있으면 자동으로 미끼가 된다.' , lvReq: 1 },
  rod_adv:   { n: '숙련된 낚싯대', i: '🎣', type: 'rod', fishWait: 0.7, fishBonus: 0.15, fishItemChance: 0.22,
               d: '입질이 빠르고, 손끝이 더 잘 읽힌다. 물고기 말고 다른 것도 곧잘 걸려 나온다.' , lvReq: 14 },
  fish_common: { n: '잔가시 물고기', i: '🐟', type: 'consum', use: { hp: 26 }, cd: 6, stack: 30,
                 d: '흔하지만 억센 가시가 많다.' },
  fish_silver: { n: '은빛 물고기', i: '🐠', type: 'consum', use: { hp: 55, buff: 'fed_soup' }, cd: 6, stack: 20,
                 d: '비늘이 동전처럼 반짝인다.' },
  fish_deep:   { n: '심해어', i: '🐡', type: 'consum', use: { hp: 90, buff: 'fed_stew' }, cd: 6, stack: 12,
                 d: '이런 깊이에 살 리 없는 눈을 하고 있다.' },
  ring_angler: { n: '낚시꾼의 반지', i: '💍', type: 'acc', b: { crit: 8, lifesteal: 3, ms: 4 },
                 d: '미끼도 없이 이걸 낚았다는 사람이 있다. 아무도 안 믿는다.' , lvReq: 1 },

  /* ================= v1.1: 물에서만 나오는 것 일곱 =================
     예전 낚시 결과표는 "이미 어디서나 나오는 물건"이 대부분이었다(젤·뼈·포션·파편).
     그래서 아무리 좋은 것이 걸려도 손에 남는 게 사냥과 똑같았다.
     이제 잡템 칸은 세 종류로 줄이고, 나머지 자리를 **물에서만 나오는 일곱**으로
     바꿨다. 그리고 세션마다 무엇이 올라오는지가 다르다 —
       세션 1(잿빛 강·호수)   진주 · 주화 · 등불 치어 · 물비늘
       세션 2(공창 물길·냉각수) 물먹은 전지 · 냉각액 · 삭은 봉돌
     매듭 하나만 양쪽에 걸쳐 있다. 어느 물에서든 아주 드물게 올라온다. */
  tide_pearl:   { n: '물때 진주', i: '🫧', type: 'mat', stack: 999, price: 620,
                  d: '조수가 바뀔 때만 열리는 조개 속에 있다. 재가 내린 뒤로는 더 귀해졌다.' },
  sunken_coin:  { n: '가라앉은 주화', i: '🪙', type: 'mat', stack: 999, price: 1100,
                  d: '앞면이 닳아 누구 얼굴인지 알 수 없다. 값은 여전히 나간다.' },
  lantern_fry:  { n: '등불 치어', i: '🏮', type: 'consum', use: { hp: 70, buff: 'lantern' }, cd: 6, stack: 20,
                  d: '삼키면 뱃속이 한동안 환하다. 어두운 데서 앞이 보인다.' },
  river_scale:  { n: '물비늘', i: '🐚', type: 'mat', stack: 999, price: 260,
                  d: '겹쳐 꿰매면 물에 젖지 않는 갑옷이 된다.' },
  drowned_cell: { n: '물먹은 전지', i: '🪫', type: 'mat', stack: 999, price: 340,
                  d: '공창이 물길에 흘려보낸 것. 말리면 아직 쓸 수 있다.' },
  coolant_vial: { n: '냉각액 병', i: '🧴', type: 'consum', use: { mp: 80, buff: 'coolant' }, cd: 8, stack: 20,
                  d: '공창의 냉각수를 병에 담았다. 마시면 몸이 식으면서 손이 빨라진다.' },
  rust_sinker:  { n: '삭은 봉돌', i: '🔩', type: 'mat', stack: 999, price: 180,
                  d: '납덩이에 대갈못을 박아 만든 것. 녹만 털면 다시 쓴다.' },
  knot_angler:  { n: '낚시꾼의 매듭', i: '🪢', type: 'acc', b: { crit: 10, ms: 6, cdr: 6, hp: 60 },
                  d: '누가 언제 묶었는지 모른다. 풀리지도 않고, 끊기지도 않는다.' , lvReq: 1 },

  /* ---- 물에서만 나오는 무기 여섯 (세션마다 셋) ----
     재료로 만들 수 없다. 오직 낚아야 나온다 — 그래서 낚시가 "부업"이 아니라
     한 갈래가 된다. 등급은 그 세션에서 실제로 쓰이는 구간에 맞췄다:
     세션 1은 3~4(강철~미스릴 사이), 세션 2는 6~7(심연~에테르 사이).
     셋을 근접·원거리·마법으로 갈라 두어, 어느 갈래를 키우든 하나는 제 것이 된다. */
  spear_tide:    { n: '물살 작살', i: '🔱', type: 'weapon', wc: 'melee', dmg: 46, spd: 2.8, kb: 4, reach: 62, tier: 3,
                   d: '물속에서 던지라고 만든 것이라 유난히 길다. 뭍에서도 잘 든다.' },
  bow_reed:      { n: '갈대 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 36, spd: 2.8, kb: 2, tier: 3, proj: 'arrow',
                   d: '물가에서 자란 갈대는 잘 휘고 잘 돌아온다.' },
  staff_current: { n: '물길의 홀', i: '🌊', type: 'weapon', wc: 'magic', dmg: 52, spd: 2.1, kb: 3, mana: 8, tier: 4, proj: 'frost',
                   d: '물이 어디로 가고 싶어 하는지를 알려 준다. 맞은 것도 그쪽으로 간다.' },
  harpoon_cool:  { n: '냉각 작살', i: '🔱', type: 'weapon', wc: 'melee', dmg: 138, spd: 2.6, kb: 8, reach: 70, tier: 6,
                   d: '공창이 과열된 것을 찍어 식히던 연장. 사람에게 쓰라고 만든 게 아니다.' },
  gun_pressure:  { n: '수압 사출기', i: '💦', type: 'weapon', wc: 'ranged', dmg: 126, spd: 2.8, kb: 6, tier: 7, proj: 'bolt',
                   d: '물을 실처럼 가늘게 뽑아 쏜다. 강철도 그렇게 잘랐다고 한다.' },
  staff_deluge:  { n: '범람의 홀', i: '🌀', type: 'weapon', wc: 'magic', dmg: 144, spd: 2.2, kb: 5, mana: 14, tier: 7, proj: 'void', multi: 2,
                   d: '수문을 여는 손잡이였다. 열면 무엇이 오는지는 그때도 알고 있었다.' },

  /* ---- 물에서만 나오는 장신구 여섯 (세션마다 셋) ---- */
  charm_float:   { n: '찌 부적', i: '🎏', type: 'acc', b: { jump: 1, ms: 8, dex: 3 },
                   d: '가라앉지 않는다. 차고 있으면 발도 그렇게 된다.' , lvReq: 8 },
  ring_ripple:   { n: '물결 반지', i: '💍', type: 'acc', b: { cdr: 10, mp: 40, int: 4 },
                   d: '한 번 던지면 끝까지 퍼진다. 되돌아오지도 않는다.' , lvReq: 8 },
  amul_scale:    { n: '비늘 목걸이', i: '📿', type: 'acc', b: { def: 12, hp: 50, frost: 1 },
                   d: '물비늘을 겹쳐 꿰었다. 찬 것이 잘 튕겨 나간다.' , lvReq: 10 },
  charm_conden:  { n: '응축기', i: '💧', type: 'acc', b: { charge: 140, cdr: 12, int: 8 },
                   d: '공창의 냉각탑에서 떼어 온 것. 아직도 안쪽에 물이 맺힌다.' , lvReq: 30 },
  ring_sluice:   { n: '수문 반지', i: '💍', type: 'acc', b: { def: 20, dr: 6, vit: 8 },
                   d: '닫으라고 만든 것이라, 차고 있으면 무엇이든 잘 닫힌다.' , lvReq: 30 },
  amul_undertow: { n: '저류 목걸이', i: '📿', type: 'acc', b: { crit: 14, ms: 10, lifesteal: 4 },
                   d: '겉은 잔잔하다. 아래에서 끌고 가는 것은 따로 있다.' , lvReq: 32 },

  /* --- 방어구 --- */
  helm_cloth:  { n: '천 두건', i: '🧢', type: 'armor', slot: 'helm', def: 2, b: { mp: 8 } , lvReq: 1 },
  chest_cloth: { n: '여행자의 상의', i: '👕', type: 'armor', slot: 'chest', def: 3, b: { ms: 3 } , lvReq: 1 },
  boots_cloth: { n: '해진 장화', i: '👞', type: 'armor', slot: 'boots', def: 1, b: { ms: 5 } , lvReq: 1 },
  helm_copper: { n: '구리 투구', i: '⛑', type: 'armor', slot: 'helm', def: 5, b: { hp: 10 } , lvReq: 6 },
  chest_copper:{ n: '구리 흉갑', i: '🦺', type: 'armor', slot: 'chest', def: 7, b: { hp: 14 } , lvReq: 6 },
  boots_copper:{ n: '구리 각반', i: '🥾', type: 'armor', slot: 'boots', def: 4, b: { ms: 4 } , lvReq: 6 },
  helm_iron:   { n: '강철 투구', i: '⛑', type: 'armor', slot: 'helm', def: 9, b: { hp: 20, vit: 2 } , lvReq: 12 },
  chest_iron:  { n: '강철 판금', i: '🦺', type: 'armor', slot: 'chest', def: 13, b: { hp: 30, def: 3 } , lvReq: 12 },
  boots_iron:  { n: '강철 정강이받이', i: '🥾', type: 'armor', slot: 'boots', def: 7, b: { ms: 5, vit: 2 } , lvReq: 12 },
  /* 낚시로만 모을 수 있는 물비늘을 겹쳐 꿰맨 갑옷. 강철 판금과 같은 등급이지만
     방어를 조금 내주고 발이 훨씬 가볍다 — 낚시를 한 사람만 고를 수 있는 선택지 */
  chest_scale: { n: '물비늘 갑옷', i: '🐚', type: 'armor', slot: 'chest', def: 11, b: { hp: 24, ms: 12, dex: 4 },
                 d: '물에 젖지 않는다. 물에서 건진 것으로 지었으니 당연한 일인지도 모른다.' , lvReq: 12 },
  helm_mythril:{ n: '미스릴 투구', i: '👑', type: 'armor', slot: 'helm', def: 16, b: { mp: 30, int: 4, cdr: 6 } , lvReq: 20 },
  chest_mythril:{ n: '미스릴 흉갑', i: '🛡', type: 'armor', slot: 'chest', def: 22, b: { hp: 55, allStat: 3 } , lvReq: 20 },
  boots_mythril:{ n: '미스릴 부츠', i: '🥾', type: 'armor', slot: 'boots', def: 12, b: { ms: 10, dex: 4 } , lvReq: 20 },
  helm_soul:   { n: '영혼 관', i: '👑', type: 'armor', slot: 'helm', def: 26, b: { mp: 60, int: 8, cdr: 12 } , lvReq: 28 },
  chest_soul:  { n: '별빛 흉갑', i: '🛡', type: 'armor', slot: 'chest', def: 36, b: { hp: 110, allStat: 6 } , lvReq: 28 },
  boots_soul:  { n: '유성 보행자', i: '👟', type: 'armor', slot: 'boots', def: 20, b: { ms: 18, jump: 1, dex: 7 } , lvReq: 28 },

  /* --- 장신구 --- */
  band_worn:   { n: '낡은 손목대', i: '🧵', type: 'acc', b: { hp: 15, def: 2 }, d: '누군가 오래 차고 있던 것. 그래도 아직 쓸 만하다.' , lvReq: 1 },
  ring_vigor:  { n: '활력의 반지', i: '💍', type: 'acc', b: { hp: 25, vit: 3 } , lvReq: 4 },
  ring_focus:  { n: '집중의 반지', i: '💍', type: 'acc', b: { mp: 25, int: 3 } , lvReq: 4 },
  amul_swift:  { n: '질풍의 부적', i: '📿', type: 'acc', b: { ms: 12, dex: 4 } , lvReq: 4 },
  amul_ember:  { n: '잉걸불 목걸이', i: '🔴', type: 'acc', b: { str: 5, fire: 1 } , lvReq: 4 },
  charm_cloud: { n: '구름 결정', i: '☁', type: 'acc', b: { jump: 1, ms: 6 }, d: '공중에서 한 번 더 도약할 수 있다.' , lvReq: 8 },
  charm_leech: { n: '거머리 문양', i: '🩸', type: 'acc', b: { lifesteal: 7 } , lvReq: 10 },
  charm_star:  { n: '별의 조각', i: '⭐', type: 'acc', b: { allStat: 8, cdr: 10, hp: 40, mp: 40 }, d: '떨어진 별의 심장 한 조각.' , lvReq: 24 },

  /* --- 가방 (장비 슬롯에 끼워 소지품 칸을 늘린다) --- */
  bag_pouch:   { n: '거미줄 쌈지', i: '👝', type: 'bag', slots: 4, d: '거미줄로 성기게 짠 작은 주머니. 그래도 없는 것보단 낫다.' , lvReq: 1 },
  bag_satchel: { n: '가죽 배낭', i: '🎒', type: 'bag', slots: 8, d: '대장장이 손끝에서 나온 튼튼한 배낭.' , lvReq: 6 },
  bag_pack:    { n: '구름결 배낭', i: '🎒', type: 'bag', slots: 12, d: '무게가 반쯤 사라진 것처럼 가볍다.' , lvReq: 24 },
  bag_vault:   { n: '유적의 보관함', i: '🧳', type: 'bag', slots: 16, d: '안쪽이 바깥보다 넓다. 어떻게 만든 건지는 아무도 모른다.' , lvReq: 20 },

  /* --- 소비 ---
     치유·마나 물약은 instant — 재사용 대기시간이 없다(다른 회복 소비품과 공유하는
     potionCd를 아예 안 걸고, 안 본다). 음식·물고기 등은 그대로 potionCd를 공유한다.
     치유·마나는 작은/일반/큰 3단계, 나머지 비약은 일반/상급 2단계로 나눴다.
     치유·마나 물약은 값을 한 칸씩 밀었다 — 작은=예전 일반값, 일반=예전 상급값, 큰=새로
     더 올린 값. id는 그대로 두되, 예전 'potion_hp'/'potion_mp'를 참조하던 초반 상점(보린·
     미라)·초반 몹 드랍(슬라임·좀비)·초반 챕터 보상(0~2장)은 전부 '_small'로 내려서 원래
     세기를 그대로 유지했다. 중반 챕터 보상(3~4장)은 'potion_hp'를 그대로 두되 개수만
     줄였고(10→5, 12→6), 후반부(6·9·12장)는 'potion_hp_greater'로 올리고 개수를 크게
     줄였다(15→3, 15→3, 20→5) — 후반은 큰 장비 보상이 이미 있어 물약은 양보다 급이
     맞아야 자연스럽다고 판단. '레드문' 전용 몹(crimson_howler)의 'potion_hp' 드랍은
     의도적으로 그대로 뒀다 — 이벤트 전용 강적이라 세진 보상이 오히려 어울린다. */
  potion_hp_small: { n: '작은 치유 물약', i: '🧪', type: 'consum', use: { hp: 60 }, instant: 1, stack: 20, d: '즉시 체력 60 회복. 재사용 대기시간이 없다.' },
  potion_hp:   { n: '치유 물약', i: '🧪', type: 'consum', use: { hp: 140 }, instant: 1, stack: 20, d: '즉시 체력 140 회복. 재사용 대기시간이 없다.' },
  potion_hp_greater: { n: '상급 치유 물약', i: '🧪', type: 'consum', use: { hp: 280 }, instant: 1, stack: 20,
                       d: '즉시 체력 280 회복. 재사용 대기시간이 없다.' },
  potion_mp_small: { n: '작은 마나 물약', i: '⚗', type: 'consum', use: { mp: 45 }, instant: 1, stack: 20, d: '즉시 마나 45 회복. 재사용 대기시간이 없다.' },
  potion_mp:   { n: '마나 물약', i: '⚗', type: 'consum', use: { mp: 100 }, instant: 1, stack: 20, d: '즉시 마나 100 회복. 재사용 대기시간이 없다.' },
  potion_mp_greater: { n: '상급 마나 물약', i: '⚗', type: 'consum', use: { mp: 200 }, instant: 1, stack: 20,
                       d: '즉시 마나 200 회복. 재사용 대기시간이 없다.' },
  potion_str:  { n: '분노의 비약', i: '🍶', type: 'consum', use: { buff: 'rage' }, cd: 4, stack: 10, d: '3분간 피해 +20%.' },
  potion_str_greater: { n: '상급 분노의 비약', i: '🍶', type: 'consum', use: { buff: 'rage_greater' }, cd: 4, stack: 10, d: '4분간 피해 +32%.' },
  potion_iron: { n: '무쇠 비약', i: '🍯', type: 'consum', use: { buff: 'iron' }, cd: 4, stack: 10, d: '3분간 방어 +12.' },
  potion_iron_greater: { n: '상급 무쇠 비약', i: '🍯', type: 'consum', use: { buff: 'iron_greater' }, cd: 4, stack: 10, d: '4분간 방어 +22.' },
  food_stew:   { n: '따뜻한 스튜', i: '🍲', type: 'consum', use: { hp: 40, buff: 'well' }, cd: 4, stack: 10, d: '체력 회복 + 재생 버프.' },
  raw_meat:    { n: '생고기', i: '🥩', type: 'consum', use: { hp: 30 }, cd: 8, stack: 20, d: '안 익혔다. 그래도 없는 것보단 낫다.' },

  /* --- 펫 알 (우클릭으로 깨서 펫을 얻는다) --- */
  /* 알값 — 파는 사람(조련사 리카)이 여명 마을 주민이라 세션 2에나 만난다. 그 무렵
     장 보상만으로 금화가 9만~30만씩 들어와서, 예전 300~4000은 그냥 집어 오는 값이었다. */
  egg_common:  { n: '평범한 알', i: '🥚', type: 'consum', use: { egg: 'common' }, price: 6000, stack: 20, d: '깨보기 전까진 무엇이 나올지 모른다.' },
  egg_rare:    { n: '푸른 알', i: '🥚', type: 'consum', use: { egg: 'rare' }, price: 26000, stack: 20, d: '희귀한 짐승의 기운이 느껴진다.' },
  egg_epic:    { n: '보랏빛 알', i: '🥚', type: 'consum', use: { egg: 'epic' }, price: 85000, stack: 20, d: '알 속에서 무언가 조용히 뛰고 있다.' },

  /* --- 채집물: 들판에 흩어진 장식이 주는 재료. 아직 이걸 쓰는 제작법은 없다 --- */
  wildflower:   { n: '들꽃', i: '🌸', type: 'mat', stack: 999, d: '숲과 초원 어디에나 핀다.' },
  weed:         { n: '잡초', i: '🌿', type: 'mat', stack: 999, d: '뽑아도 뽑아도 다시 난다.' },
  cactus_flesh: { n: '선인장 속살', i: '🌵', type: 'mat', stack: 999, d: '메마른 땅에서도 물기를 머금고 있다.' },
  mushroom:     { n: '버섯', i: '🍄', type: 'mat', stack: 999, d: '축축하고 어두운 곳에서 자란다.' },

  /* --- 재료 --- */
  wood:        { n: '나무', i: '🪵', type: 'mat', stack: 999 },
  stone:       { n: '돌', i: '🪨', type: 'block', tile: T.STONE, stack: 999 },
  dirt:        { n: '흙', i: '🟤', type: 'block', tile: T.DIRT, stack: 999 },
  sand:        { n: '모래', i: '🟨', type: 'block', tile: T.SAND, stack: 999 },
  ash:         { n: '재', i: '⬛', type: 'block', tile: T.ASH, stack: 999 },
  plank:       { n: '판자', i: '🟫', type: 'block', tile: T.PLANK, stack: 999 },
  brick:       { n: '석벽돌', i: '🧱', type: 'block', tile: T.BRICK, stack: 999 },
  torch:       { n: '횃불', i: '🕯', type: 'block', tile: T.TORCH, stack: 999, d: '어둠은 좋은 사냥터가 아니다.' },
  platform:    { n: '나무 발판', i: '➖', type: 'block', tile: T.PLATFORM, stack: 999 },
  copper_ore:  { n: '구리 원석', i: '🟠', type: 'mat', stack: 999 },
  iron_ore:    { n: '철 원석', i: '⚪', type: 'mat', stack: 999 },
  gold_ore:    { n: '금 원석', i: '🟡', type: 'mat', stack: 999 },
  mythril_ore: { n: '미스릴 원석', i: '🟩', type: 'mat', stack: 999 },
  hell_ore:    { n: '지옥석', i: '🔶', type: 'mat', stack: 999 },
  copper_bar:  { n: '구리 주괴', i: '🟧', type: 'mat', stack: 999 },
  iron_bar:    { n: '강철 주괴', i: '⬜', type: 'mat', stack: 999 },
  gold_bar:    { n: '금 주괴', i: '🟨', type: 'mat', stack: 999 },
  mythril_bar: { n: '미스릴 주괴', i: '💚', type: 'mat', stack: 999 },
  obsidian:    { n: '흑암석', i: '⬛', type: 'block', tile: T.OBSIDIAN, stack: 999 },
  ebon_chunk:  { n: '흑요암 덩이', i: '🟣', type: 'mat', stack: 999 },
  ice_shard:   { n: '얼음 파편', i: '🧊', type: 'mat', stack: 999 },
  crystal:     { n: '수정', i: '💎', type: 'mat', stack: 999 },
  slime_gel:   { n: '슬라임 젤', i: '🫧', type: 'mat', stack: 999 },
  bone_frag:   { n: '뼛조각', i: '🦴', type: 'mat', stack: 999 },
  corrupt_ess: { n: '부패의 정수', i: '🟪', type: 'mat', stack: 999 },
  frost_core:  { n: '서리 결정', i: '❄', type: 'mat', stack: 999 },
  void_frag:   { n: '공허 조각', i: '🌌', type: 'mat', stack: 999 },
  soul_shard:  { n: '영혼 파편', i: '✨', type: 'mat', stack: 999 },
  star_heart:  { n: '별의 심장', i: '💛', type: 'mat', stack: 9, d: '다섯 개를 모아야 한다.' },

  /* === 몬스터 전리품 === */
  ash_feather:  { n: '잿빛 깃', i: '🪶', type: 'mat', stack: 999, d: '까마귀는 잿빛에 가장 먼저 적응한 것들이다.' },
  spider_silk:  { n: '거미 실', i: '🕸', type: 'mat', stack: 999 },
  lost_lamp:    { n: '잃어버린 등', i: '🏮', type: 'mat', stack: 99, d: '아직도 희미하게 켜져 있다.' },
  venom_sting:  { n: '독침', i: '🦂', type: 'mat', stack: 999 },
  ice_fang:     { n: '얼음 송곳니', i: '🦷', type: 'mat', stack: 999 },
  moss_core:    { n: '이끼 심장', i: '🟢', type: 'mat', stack: 999 },
  crystal_claw: { n: '수정 집게', i: '🦞', type: 'mat', stack: 999 },
  lava_gel:     { n: '용암 점액', i: '🟥', type: 'mat', stack: 999 },
  cloud_jelly:  { n: '구름 젤리', i: '🫧', type: 'mat', stack: 999 },
  archive_seal: { n: '사서의 인장', i: '📜', type: 'mat', stack: 999 },

  /* === 전리품으로 만드는 무기 === */
  bow_crow:     { n: '까마귀 사수', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 17, spd: 2.5, kb: 2, tier: 1, proj: 'arrow', d: '깃이 가벼워 시위가 빨리 돌아온다.'  },
  dagger_venom: { n: '독니 단검', i: '🗡', type: 'weapon', wc: 'melee', dmg: 15, spd: 4.0, kb: 1, reach: 32, tier: 2, poison: 2, d: '느리게 죽이지만, 확실하게 죽인다.'  },
  bow_silk:     { n: '거미줄 활', i: '🕸', type: 'weapon', wc: 'ranged', dmg: 26, spd: 2.2, kb: 2, tier: 2, proj: 'arrow', frost: 1, d: '맞은 것은 실에 감겨 느려진다.'  },
  axe_frost:    { n: '서리 도끼', i: '🪓', type: 'weapon', wc: 'melee', dmg: 48, spd: 1.6, kb: 8, reach: 52, tier: 3, frost: 2, d: '한 번에 크게, 그리고 얼린다.'  },
  staff_moss:   { n: '이끼의 홀', i: '🌿', type: 'weapon', wc: 'magic', dmg: 34, spd: 1.9, kb: 2, mana: 7, tier: 3, proj: 'bolt', lifesteal: 6, d: '베어낸 것을 조금씩 돌려받는다.'  },
  hammer_lava:  { n: '용암 망치', i: '🔨', type: 'weapon', wc: 'melee', dmg: 105, spd: 1.4, kb: 12, reach: 60, tier: 5, fire: 3, d: '내려칠 때마다 바닥이 잠깐 녹는다.'  },
  staff_archive:{ n: '사서의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 96, spd: 2.4, kb: 3, mana: 12, tier: 6, proj: 'soul', multi: 3, d: '읽는 것만으로 문장이 날아간다.'  },
  charm_prism:  { n: '프리즘 부적', i: '🔷', type: 'acc', b: { crit: 10, critD: 40, int: 5 } , lvReq: 14 },
  charm_lamp:   { n: '잃어버린 등불', i: '🏮', type: 'acc', b: { hp: 40, mp: 30, vit: 4 }, d: '들고 있으면 주변이 조금 밝아진다.' , lvReq: 10 },
  charm_hawk:   { n: '매눈 부적', i: '🪶', type: 'acc', b: { crit: 7, dex: 5 }, d: '늑대들 사이에서도 유난히 눈이 밝던 것의 발톱.' , lvReq: 12 },
  ring_brand:   { n: '낙인의 고리', i: '💍', type: 'acc', b: { str: 7, crit: 6 }, d: '재의 골렘 가슴팍에 박혀 있던 것.' , lvReq: 20 },

  /* --- 유적 유물 ---
     유적마다 하나씩, 그 유적에서만 나온다(RUIN_RELIC). 가장 깊은 보물방 상자에
     반드시 들어 있어서, 끝까지 들어가 본 사람만 갖는다. 성능은 그 유적의 등급을
     따라가지만 진짜 값은 "이 유적을 봤다"는 표식이다 — 여덟 개가 다 다르다. */
  relic_frostpane:  { n: '서리 낀 창', i: '🪟', type: 'acc', b: { def: 12, vit: 4, frost: 1 },
                      d: '얼음 안에 갇힌 채로 아직 김이 서려 있다. 안쪽에서 누가 닦아 낸 자국이 있다.', lvReq: 10 },
  relic_sundial:    { n: '멈춘 해시계', i: '🕛', type: 'acc', b: { crit: 9, dex: 5, ms: 6 },
                      d: '바늘이 정오에 멈춰 있다. 별이 떨어진 시각이라고들 한다.', lvReq: 16 },
  relic_lastlamp:   { n: '마지막 안전등', i: '🏮', type: 'acc', b: { hp: 35, def: 4, hpreg: 2 },
                      d: '심지가 아직 남아 있다. 이걸 켜 둔 사람은 끝내 올라오지 못했다.', lvReq: 6 },
  relic_rotcore:    { n: '썩지 않은 심', i: '🫀', type: 'acc', b: { allStat: 7, lifesteal: 6, hp: 60 },
                      d: '둥지 한가운데에서 이것만 성했다. 부패가 이것을 피해 자랐다.', lvReq: 30 },
  relic_sporebell:  { n: '홀씨 방울', i: '🔔', type: 'acc', b: { mp: 55, int: 7, cdr: 8 },
                      d: '흔들면 소리 대신 홀씨가 난다. 굴 전체가 이 소리를 듣고 자랐다.', lvReq: 26 },
  relic_frostmark:  { n: '언 손자국', i: '🤍', type: 'acc', b: { vit: 5, hp: 45, frost: 1 },
                      d: '벽에 찍힌 손자국을 그대로 떠낸 것. 손가락이 넷뿐이다.', lvReq: 14 },
  relic_mazeeye:    { n: '길 잃지 않는 눈', i: '👁', type: 'acc', b: { dex: 6, ms: 9, crit: 5 },
                      d: '들여다보면 지나온 길이 비친다. 앞길은 비추지 않는다.', lvReq: 18 },
  relic_hollowseed: { n: '빈 씨앗', i: '🌑', type: 'acc', b: { int: 6, str: 6, critD: 30 },
                      d: '흔들어도 소리가 없다. 심으면 안 된다고 석판에 적혀 있었다.', lvReq: 22 },

  /* --- 유적 위치 지도 ---
     입구가 없는 유적은 이것 없이는 못 찾는다. 쓰면 그 유적 자리가 나침반에 잡힌다.
     지도 자체는 다른 유적의 보물방 상자에 들어 있다(RUIN_MAP_IN) — 한 곳을 털면
     다음 곳이 열리는 사슬이다. 쓰고 나면 사라지지만 표시는 세이브에 남는다. */
  ruinmap_ice:    { n: '얼어붙은 골짜기 지도', i: '🗺', type: 'map', ruin: 'ice', stack: 1,
                    d: '가죽에 그린 골짜기 지도. 한 지점에만 구멍이 뚫려 있다.' },
  ruinmap_spore:  { n: '포자 굴 지도', i: '🗺', type: 'map', ruin: 'spore', stack: 1,
                    d: '지도라기보다 냄새의 기록이다. 짙은 쪽으로 가면 된다고 적혀 있다.' },
  ruinmap_blight: { n: '둥지 지도', i: '🗺', type: 'map', ruin: 'blight', stack: 1,
                    d: '그린 사람이 도중에 손을 떨었다. 동쪽 끝에서 선이 끊긴다.' },

  /* === 2부: 하늘 섬 / 숨겨진 유적 === */
  sword_aether: { n: '에테르 검', i: '⚔', type: 'weapon', wc: 'melee', dmg: 150, spd: 2.5, kb: 6, reach: 58, tier: 7, d: '무게가 느껴지지 않는다. 손이 아니라 바람이 든 것 같다.'  },
  bow_gale:     { n: '질풍궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 118, spd: 3.0, kb: 3, tier: 7, proj: 'star', multi: 3, d: '구름 위에서는 화살이 떨어지지 않는다.'  },
  staff_storm:  { n: '뇌운의 홀', i: '🔮', type: 'weapon', wc: 'magic', dmg: 132, spd: 2.3, kb: 4, mana: 15, tier: 7, proj: 'bolt', multi: 3, d: '천둥은 늘 한 박자 늦게 온다.'  },
  sword_first:  { n: '최초의 빛', i: '⚔', type: 'weapon', wc: 'melee', dmg: 210, spd: 2.2, kb: 10, reach: 70, tier: 8, fire: 3, lifesteal: 6, d: '별이 처음 떨어지기 전에 벼려진 것.'  },
  helm_aether:  { n: '에테르 관', i: '👑', type: 'armor', slot: 'helm', def: 34, b: { mp: 90, int: 10, cdr: 14 } , lvReq: 36 },
  chest_aether: { n: '창공의 흉갑', i: '🛡', type: 'armor', slot: 'chest', def: 46, b: { hp: 150, allStat: 8 } , lvReq: 36 },
  boots_aether: { n: '창공 보행자', i: '👟', type: 'armor', slot: 'boots', def: 26, b: { ms: 24, jump: 1, dex: 10 } , lvReq: 36 },
  charm_feather:{ n: '깃털 부적', i: '🪶', type: 'acc', b: { jump: 1, ms: 8, glide: 1 }, d: '떨어지는 동안 점프를 누르면 천천히 내려온다.' , lvReq: 28 },
  charm_rune:   { n: '룬 각인', i: '🔯', type: 'acc', b: { allStat: 10, cdr: 14, def: 12 }, d: '읽을 수 없는 문자가 계속 자리를 바꾼다.' , lvReq: 32 },
  charm_zenith: { n: '창공의 목걸이', i: '📿', type: 'acc', b: { allStat: 12, critD: 30, hp: 80 }, d: '바람 정령이 몸에 두르고 있던 것.' , lvReq: 36 },

  cloud_block:  { n: '구름 덩이', i: '☁', type: 'block', tile: T.CLOUD, stack: 999 },
  skystone:     { n: '하늘돌', i: '🪨', type: 'block', tile: T.SKYSTONE, stack: 999 },
  ruin_brick:   { n: '유적 벽돌', i: '🧱', type: 'block', tile: T.RUINBRICK, stack: 999 },
  aether_shard: { n: '에테르 파편', i: '💠', type: 'mat', stack: 999 },
  sky_feather:  { n: '하늘 깃털', i: '🪶', type: 'mat', stack: 999 },
  rune_frag:    { n: '룬 조각', i: '🔹', type: 'mat', stack: 9, d: '세 유적의 석판에서 하나씩 나온다.' },
  ruin_key:     { n: '유적의 열쇠', i: '🗝', type: 'mat', stack: 9, d: '심층 유적의 봉인문을 연다.' },

  /* --- 종장 --- */
  charm_dawn:   { n: '여명의 인장', i: '🌅', type: 'acc', b: { allStat: 14, cdr: 18, def: 18, hp: 120, lifesteal: 5 }, d: '잿빛이 걷힌 첫 아침의 빛을 굳혀 만들었다.' , lvReq: 34 },
  star_whole:   { n: '되맞춘 별', i: '🌟', type: 'mat', stack: 9, d: '다섯 조각이 서로를 붙들고 있다. 손바닥이 계속 뜨겁다.' },

  sum_storm:    { n: '폭풍의 뿔피리', i: '📯', type: 'summon', boss: 'storm_warden', stack: 9, d: '하늘 섬 위에서만 소리가 난다.' },
  sum_keeper:   { n: '봉인의 인장', i: '🗝', type: 'summon', boss: 'first_keeper', stack: 9, d: '유적 가장 깊은 곳에서 사용하라.' },
  sum_pursuer:  { n: '되맞춘 별의 부름', i: '🌌', type: 'summon', boss: 'pursuer', stack: 9, d: '높이 들면, 쫓아오던 것이 마침내 방향을 안다.' },

  /* --- 세션 2: 지하 공창 --- */
  steel_plate:    { n: '강철판', i: '🔩', type: 'block', tile: T.STEELPLATE, stack: 999 },
  power_core:     { n: '동력석', i: '🔆', type: 'mat', stack: 999, d: '아직 따뜻하다. 몇백 년째 식지 않고 있다.' },
  conduit_part:   { n: '동력관 조각', i: '🧵', type: 'mat', stack: 999, d: '안쪽에서 무언가가 계속 흐른다.' },
  blueprint_frag: { n: '설계도 조각', i: '📐', type: 'mat', stack: 99, d: '읽을 수는 있는데, 만드는 법이 아니라 만들게 하는 법이 적혀 있다.' },
  blueprint_core: { n: '공창의 설계 핵', i: '📀', type: 'mat', stack: 9, d: '『인력을 쓰지 마라. 그것이 우리가 배운 전부다.』' },
  gear_basic:     { n: '톱니바퀴', i: '⚙', type: 'mat', stack: 999, d: '맞물릴 상대만 있으면 언제든 다시 돈다.' },
  pick_drill:     { n: '시추 곡괭이', i: '🪛', type: 'tool', power: 4, spd: 2.6, dmg: 46, d: '손잡이가 스스로 떤다. 아직은 손으로 잡아야 한다.' , lvReq: 20},

  /* ================= 3단계: 공장 ================= */
  /* --- 동력 자원 · 중간재 --- */
  coal:          { n: '석탄', i: '⚫', type: 'mat', stack: 999, d: '어디서나 나온다. 오래 타지는 않는다.' },
  lead_ore:      { n: '납 원석', i: '🔘', type: 'mat', stack: 999 },
  lead_bar:      { n: '납 주괴', i: '⬛', type: 'mat', stack: 999, d: '무겁고 무르다. 전지를 만들려면 이게 있어야 한다.' },
  crude_oil:     { n: '원유', i: '🛢', type: 'mat', stack: 999, d: '사구 아래 유혈암에서만 나온다. 그대로 태우기엔 아깝다.' },
  refined_oil:   { n: '정제유', i: '🧴', type: 'mat', stack: 999, d: '석탄 예닐곱 덩이 몫을 혼자 해낸다.' },
  polymer:       { n: '합성수지', i: '🧬', type: 'mat', stack: 999, d: '원유를 정제할 때 같이 나온다. 녹지도 얼지도 않는다.' },
  fuel_brick:    { n: '압축 연료', i: '🧱', type: 'mat', stack: 999, d: '석탄 다섯 덩이를 벽돌 하나로 눌러 담았다.' },
  wire:          { n: '전선', i: '🧵', type: 'mat', stack: 999 },
  circuit:       { n: '회로 기판', i: '🟩', type: 'mat', stack: 999, d: '얇은 금선이 미로처럼 깔려 있다.' },
  motor:         { n: '전동기', i: '🌀', type: 'mat', stack: 999, d: '전기를 주면 스스로 돈다. 멈추라고 하기 전까지.' },
  machine_frame: { n: '기계 골조', i: '🏗', type: 'mat', stack: 999, d: '공창에서 본 것과 똑같은 뼈대다.' },
  battery_empty: { n: '방전된 배터리', i: '🪫', type: 'mat', stack: 99, d: '축전지에 넣어 두면 다시 찬다.' },
  battery_cell:  { n: '충전된 배터리', i: '🔋', type: 'mat', stack: 99, d: '동력 장비의 전하가 바닥나면 자동으로 한 개씩 쓰인다.' },
  rivet:         { n: '대갈못', i: '📌', type: 'mat', stack: 999, d: '자동 포탑이 이걸 쏜다.' },

  /* --- 기계 (우클릭으로 설치) --- */
  m_belt:      { n: '컨베이어 벨트', i: '➡', type: 'machine', mach: 'belt', stack: 999 },
  m_drill:     { n: '기계식 드릴', i: '🛠', type: 'machine', mach: 'drill', stack: 99 },
  m_drill_e:   { n: '전동 드릴', i: '⚒', type: 'machine', mach: 'drill_e', stack: 99 },
  m_pump:      { n: '시추 펌프', i: '🛢', type: 'machine', mach: 'pump', stack: 99 },
  m_smelter:   { n: '자동 용광로', i: '🏭', type: 'machine', mach: 'smelter', stack: 99 },
  m_press:     { n: '압축기', i: '🗜', type: 'machine', mach: 'press', stack: 99 },
  m_refinery:  { n: '정제기', i: '⚗', type: 'machine', mach: 'refinery', stack: 99 },
  m_assembler: { n: '조립기', i: '⚙', type: 'machine', mach: 'assembler', stack: 99 },
  m_crate:     { n: '수집 상자', i: '📦', type: 'machine', mach: 'crate', stack: 99 },
  m_gen:       { n: '화력 발전기', i: '🔥', type: 'machine', mach: 'gen', stack: 99 },
  m_battery:   { n: '축전지', i: '🔋', type: 'machine', mach: 'battery', stack: 99 },
  m_pole:      { n: '전주', i: '🗼', type: 'machine', mach: 'pole', stack: 999 },
  m_sorter:    { n: '분류기', i: '🔀', type: 'machine', mach: 'sorter', stack: 99 },
  m_turret:    { n: '자동 포탑', i: '🔫', type: 'machine', mach: 'turret', stack: 99 },
  m_trap:      { n: '전격 함정', i: '⚡', type: 'machine', mach: 'trap', stack: 99 },
  m_switch:    { n: '정지 스위치', i: '🛑', type: 'machine', mach: 'switch', stack: 99 },

  /* --- 손으로 놓는 설치물 (type:'station') ---
     타일도 기계도 아니고 w.objects에 얹히는 물건이다. 우클릭으로 놓고, 도구 없이도
     좌클릭으로 회수한다. 예전에는 작업대·용광로가 세계에 딱 두 쌍만 박혀 있어서
     캠프를 벗어나면 아무것도 만들 수 없었다.
     작업대만은 제작대가 필요 없다(station 없음) — 유일한 작업대를 부수거나 잃었을 때
     아무것도 못 만드는 상태로 잠기면 안 되므로, 맨손 제작으로 되살릴 수 있어야 한다. */
  station_work:  { n: '작업대', i: '🔨', type: 'station', obj: 'workbench', stack: 20,
                   d: '어디든 펴면 그 자리가 작업장이 된다. 개조는 놓은 것마다 따로 쌓인다.' },
  station_forge: { n: '용광로', i: '🔥', type: 'station', obj: 'forge', stack: 20,
                   d: '벽돌을 쌓아 만든 화덕. 광석을 녹이려면 이게 있어야 한다.' },
  crate_wood:    { n: '저장 상자', i: '🧰', type: 'station', obj: 'crate', slots: 24, stack: 20,
                   d: '24칸. 벨트도 전력도 필요 없이 그냥 넣어 두는 상자다.' },
  crate_gold:    { n: '황금 저장 상자', i: '🧰', type: 'station', obj: 'crate', slots: 48, gold: 1, stack: 20,
                   d: '48칸. 금테를 두른 만큼 두 배로 들어간다.' },

  /* --- 동력 장비: 전하를 쓴다. 바닥나면 가방의 충전된 배터리를 한 개씩 자동으로 소모 --- */
  pick_arc:    { n: '아크 착암기', i: '🔌', type: 'tool', power: 5, dmg: 60, spd: 4.2, pw: 2.5,
                 d: '기반암 말고는 전부 뚫는다. 전하를 먹는다.' , lvReq: 20},
  saw_auto:    { n: '회전 톱날', i: '🪚', type: 'weapon', wc: 'melee', dmg: 74, spd: 5.2, kb: 2, reach: 40, tier: 5, pw: 1.6,
                 d: '멈추지 않는다. 손을 놓아도 한동안 돈다.'  },
  gun_rail:    { n: '레일 사수', i: '🔫', type: 'weapon', wc: 'ranged', dmg: 168, spd: 1.5, kb: 8, tier: 7, proj: 'star', pw: 6,
                 d: '탄이 아니라 전하를 쏜다. 벽 하나쯤은 세지 않는다.'  },
  helm_exo:    { n: '관측 바이저', i: '🥽', type: 'armor', slot: 'helm', def: 30, b: { crit: 8, dex: 6, mp: 40 } , lvReq: 30 },
  chest_exo:   { n: '동력 외골격', i: '🦾', type: 'armor', slot: 'chest', def: 42, b: { hp: 130, str: 8, def: 6 } , lvReq: 30 },
  boots_exo:   { n: '서보 각반', i: '🦿', type: 'armor', slot: 'boots', def: 24, b: { ms: 22, jump: 1, dex: 6 } , lvReq: 30 },
  charm_cap:   { n: '축전 부적', i: '🔆', type: 'acc', b: { charge: 220, cdr: 8, int: 5 },
                 d: '몸에 지닌 전하가 늘어난다. 동력 장비를 오래 쓸 수 있다.' , lvReq: 18 },
  charm_conduit:{ n: '도관 부적', i: '🔌', type: 'acc', b: { charge: 150, def: 10, hp: 60 },
                 d: '케이드가 시제품이라며 슬쩍 건네준 물건.' , lvReq: 30 },

  /* ================= 4단계: 마을 ================= */
  /* --- 건축 블록 --- */
  thatch:     { n: '초가지붕', i: '🟨', type: 'block', tile: T.THATCH, stack: 999, d: '값싸고 따뜻하다. 불은 조심해야 한다.' },
  rooftile:   { n: '기와지붕', i: '🟥', type: 'block', tile: T.ROOFTILE, stack: 999, d: '한 번 얹으면 손자 대까지 간다.' },
  timberwall: { n: '목골벽', i: '🟫', type: 'block', tile: T.TIMBERWALL, stack: 999, d: '기둥 사이를 회반죽으로 메운 벽.' },
  wallstone:  { n: '성벽돌', i: '🧱', type: 'block', tile: T.WALLSTONE, stack: 999, d: '사람 키만 한 돌을 다듬어 쌓는다.' },
  battlement: { n: '흉벽', i: '🏰', type: 'block', tile: T.BATTLEMENT, stack: 999, d: '몸을 숨기고 내다볼 수 있게 이가 빠져 있다.' },
  window:     { n: '창문', i: '🪟', type: 'block', tile: T.WINDOW, stack: 999, d: '빛은 들이고 바람은 막는다.' },
  fence:      { n: '울타리', i: '🚧', type: 'block', tile: T.FENCE, stack: 999 },
  lamppost:   { n: '가로등', i: '🏮', type: 'block', tile: T.LAMPPOST, stack: 999, d: '밤에도 길이 보인다는 건 생각보다 큰 일이다.' },
  banner:     { n: '깃발', i: '🚩', type: 'block', tile: T.BANNER, stack: 999, d: '여명 마을의 문장.' },
  haybale:    { n: '건초더미', i: '🌾', type: 'block', tile: T.HAYBALE, stack: 999, d: '위로 떨어져도 다치지 않는다.' },
  sandbag:    { n: '모래주머니', i: '🟤', type: 'block', tile: T.SANDBAG, stack: 999, d: '급하게 쌓는 방벽.' },

  /* --- 농기구 · 씨앗 · 작물 --- */
  hoe_iron:   { n: '강철 괭이', i: '🛠', type: 'tool', power: 0, dmg: 8, spd: 2.0, hoe: 1,
                d: '흙이나 풀을 우클릭해 밭을 간다. 씨앗은 밭 위에 심는다.' , lvReq: 3},
  /* --- 낫 ---
     ★ 다 여문 작물은 **낫으로만** 거둘 수 있다. 곡괭이나 도끼로 치면 이삭이 으스러져
       아무것도 남지 않는다(game.js mine 참고). 밭을 시작하려면 괭이·씨앗·낫 셋이
       한 벌이라, 마을 2단계 씨앗 상자에 셋을 같이 넣어 둔다. */
  scythe_iron:  { n: '강철 낫', i: '🌾', type: 'tool', power: 0, dmg: 14, spd: 2.4, scythe: 1,
                  d: '다 여문 작물을 이걸로 베어야 알곡이 성하게 남는다. 다른 연장으로 치면 다 으스러진다.', lvReq: 3 },
  scythe_star:  { n: '별무늬 낫', i: '🌾', type: 'tool', power: 0, dmg: 34, spd: 2.8, scythe: 1, reap: 1,
                  d: '날에 별가루를 먹였다. 벤 자리마다 한 번 더 여문 것이 딸려 온다.', lvReq: 16 },
  seed_wheat:    { n: '밀 씨앗', i: '🌱', type: 'seed', stack: 999, d: '밭에 우클릭해 심는다.' },
  seed_starroot: { n: '별무 씨앗', i: '🌱', type: 'seed', stack: 999, d: '떨어진 별 근처에서만 돋던 뿌리채소다.' },
  seed_ashcap:   { n: '잿버섯 홀씨', i: '🌱', type: 'seed', stack: 999, d: '어두운 곳에서도 잘 자란다.' },
  /* --- v1.1: 전리품으로만 씨를 얻는 작물 넷 ---
     밭에서 씨가 돌아오기는 하지만(수확 보너스), 처음 한 톨은 반드시 사냥해서 만들어야
     한다. 재료는 전부 이미 있던 전리품이다 — 새 재료를 늘리지 않는다. */
  seed_bloodbean: { n: '핏빛 콩 씨앗', i: '🌱', type: 'seed', stack: 999, d: '슬라임 젤을 굳혀 뭉친 씨. 젤 냄새가 난다.' },
  seed_bonebloom: { n: '뼈꽃 씨앗', i: '🌱', type: 'seed', stack: 999, d: '뼛가루를 뭉쳤더니 싹이 텄다. 왜 그런지는 아무도 모른다.' },
  seed_frostherb: { n: '서리쑥 씨앗', i: '🌱', type: 'seed', stack: 999, d: '심은 자리 흙이 하얗게 언다.' },
  seed_emberpod: { n: '불씨 꼬투리 씨앗', i: '🌱', type: 'seed', stack: 999, d: '만지면 미지근하다. 물을 주면 김이 오른다.' },
  wheat:      { n: '밀', i: '🌾', type: 'mat', stack: 999 },
  starroot:   { n: '별무', i: '🥕', type: 'mat', stack: 999, d: '자른 단면이 희미하게 빛난다.' },
  bloodbean:  { n: '핏빛 콩', i: '🫘', type: 'mat', stack: 999, d: '삶으면 국물이 붉어진다. 맛은 의외로 담백하다.' },
  bonebloom:  { n: '뼈꽃', i: '🤍', type: 'mat', stack: 999, d: '꽃잎이 뼈처럼 희고 단단하다. 갈면 약이 된다.' },
  frostherb:  { n: '서리쑥', i: '🌿', type: 'mat', stack: 999, d: '한여름에 뜯어도 손이 시리다.' },
  emberpod:   { n: '불씨 꼬투리', i: '🔥', type: 'mat', stack: 999, d: '까면 안에서 아직 타고 있는 알갱이가 나온다.' },
  flour:      { n: '밀가루', i: '🥛', type: 'mat', stack: 999 },
  fertilizer: { n: '퇴비', i: '🪵', type: 'seed', fert: 1, stack: 999, d: '작물에 우클릭하면 한 단계 자란다.' },

  /* --- 음식: 한 번에 한 가지만 유지된다 (새로 먹으면 이전 것이 사라진다) --- */
  food_bread: { n: '갓 구운 빵', i: '🍞', type: 'consum', use: { hp: 50, buff: 'fed_bread' }, cd: 4, stack: 30, d: '5분간 생명 재생과 체력이 오른다.' },
  food_pie:   { n: '고기 파이', i: '🥧', type: 'consum', use: { hp: 90, buff: 'fed_pie' }, cd: 4, stack: 30, d: '5분간 힘과 피해가 오른다.' },
  food_mstew: { n: '버섯 스튜', i: '🍲', type: 'consum', use: { mp: 60, buff: 'fed_stew' }, cd: 4, stack: 30, d: '5분간 마나 재생과 지능이 오른다.' },
  food_soup:  { n: '별무 수프', i: '🥣', type: 'consum', use: { hp: 70, buff: 'fed_soup' }, cd: 4, stack: 30, d: '5분간 방어가 크게 오른다.' },
  food_tea:   { n: '들꽃차', i: '🍵', type: 'consum', use: { mp: 40, buff: 'fed_tea' }, cd: 4, stack: 30, d: '5분간 재사용 대기가 줄어든다.' },
  food_jelly: { n: '선인장 젤리', i: '🍮', type: 'consum', use: { hp: 40, buff: 'fed_jelly' }, cd: 4, stack: 30, d: '5분간 이동 속도와 민첩이 오른다.' },
  food_feast: { n: '잔칫상', i: '🍱', type: 'consum', use: { hp: 200, mp: 120, buff: 'fed_feast' }, cd: 6, stack: 9,
                d: '10분간 모든 능력치가 오른다. 마을이 살아 있다는 증거다.' },

  /* --- 마을 기계 --- */
  m_windmill: { n: '풍차', i: '🌬', type: 'machine', mach: 'windmill', stack: 99 },
  m_mill:     { n: '밀링기', i: '⚙', type: 'machine', mach: 'mill', stack: 99 },
  m_oven:     { n: '화덕', i: '🔥', type: 'machine', mach: 'oven', stack: 99 },
  /* --- 6단계: 유적 --- */
  icebrick:   { n: '얼음 벽돌', i: '🧊', type: 'block', tile: T.ICEBRICK, stack: 999 },
  sandbrick:  { n: '사암 벽돌', i: '🟨', type: 'block', tile: T.SANDBRICK, stack: 999 },
  m_dart:     { n: '화살 발사기', i: '🎯', type: 'machine', mach: 'dart', stack: 99 },
  m_flame:    { n: '화염 분사구', i: '🔥', type: 'machine', mach: 'flamejet', stack: 99 },
  m_frost:    { n: '서리 분사구', i: '❄', type: 'machine', mach: 'frostjet', stack: 99 },
  /* 미니보스 전리품 */
  frozen_core:{ n: '얼어붙은 핵', i: '🔷', type: 'mat', stack: 99 },
  sun_disc:   { n: '태양 원반', i: '🌞', type: 'mat', stack: 99 },
  rust_gear:  { n: '녹슨 톱니', i: '⚙', type: 'mat', stack: 99 },
  blight_bile:{ n: '역병 담즙', i: '🟣', type: 'mat', stack: 99 },
  heartwood:  { n: '심재', i: '🪵', type: 'mat', stack: 99 },
  queen_spore:{ n: '여왕 포자', i: '🫧', type: 'mat', stack: 99 },
  /* 유적 보상 장비 */
  charm_delver:{ n: '탐굴자의 인장', i: '🗿', type: 'acc', b: { def: 14, hp: 55, ms: 8 },
                 d: '다섯 유적을 다 뒤진 자에게만 맞는 크기다.' , lvReq: 22 },

  /* ================= 7단계: 폭주로 ================= */
  core_shard:  { n: '노심 파편', i: '🔶', type: 'mat', stack: 999, d: '아직 미지근하다. 손에 쥐면 맥박처럼 뛴다.' },
  sword_arc:   { n: '전격 세이버', i: '⚡', type: 'weapon', wc: 'melee', dmg: 152, spd: 2.6, kb: 9, reach: 54, tier: 7, pw: 3,
                 d: '증식체의 핵에서 뽑아낸 전류가 날을 타고 흐른다. 스치기만 해도 크게 튕겨 나간다.'  },
  stop_core:   { n: '정지 핵', i: '🛑', type: 'mat', stack: 9,
                 d: '『멈춰라』 하나만 아주 크게 적어 넣은 물건. 공창이 끝내 만들지 않은 것.' },
  hepha_heart: { n: '헤파의 심장', i: '🫀', type: 'mat', stack: 9, d: '멈춘 뒤에도 한참을 따뜻했다.' },
  charm_govern:{ n: '조속기', i: '⏱', type: 'acc', b: { allStat: 12, cdr: 16, def: 16, charge: 160 },
                 d: '너무 빨라지면 스스로 늦춘다. 그게 이 물건의 전부다.' , lvReq: 34 },
  hammer_still:{ n: '정지의 망치', i: '🔨', type: 'weapon', wc: 'melee', dmg: 196, spd: 1.6, kb: 14, reach: 68, tier: 8, pw: 4,
                 d: '맞은 것은 잠시 아무것도 하지 못한다. 부수는 무기가 아니라 멈추는 무기다.'  },

  /* ================= 세션 2 종장: 설계실 =================
     공창을 지은 손이 남긴 곳. 강철이 아니라 이음매 없는 흰 돌로 되어 있다. */
  archestone:  { n: '원형석', i: '🪨', type: 'block', tile: T.ARCHESTONE, stack: 999,
                 d: '자른 자국이 없다. 처음부터 이 모양이었던 것처럼 생겼다.' },
  draft_glass: { n: '설계 유리', i: '🔷', type: 'mat', stack: 999,
                 d: '안쪽에 도면이 떠 있다. 무엇의 도면인지는 읽히지 않는다.' },
  proto_ash:   { n: '미완의 재', i: '🫧', type: 'mat', stack: 999,
                 d: '끝까지 조립되지 못한 것이 부서지면 이것만 남는다.' },
  atelier_key: { n: '설계실의 인장', i: '🔑', type: 'mat', stack: 9,
                 d: '헤파의 심장을 녹여 다시 굳혔다. 벽 너머로 들어가려면 벽이 만든 것이 필요했다.' },
  arche_core:  { n: '원형의 핵', i: '💠', type: 'mat', stack: 9,
                 d: '사람을 본떠 만든 첫 번째 것의 한가운데. 아직도 사람처럼 미지근하다.' },
  /* 종장 보상 */
  /* 이 둘만 등급 표(WEAPON_TIER_LV)를 안 따르고 lvReq를 직접 갖는다 — 같은 8등급이어도
     설계실에서 마지막 장에 나오는 물건이라, 8등급 기본값(44)으로는 한참 헐거워진다. */
  blade_arche: { n: '원형의 칼', i: '⚔', type: 'weapon', wc: 'melee', dmg: 238, spd: 2.4, kb: 11, reach: 72, tier: 8,
                 lifesteal: 7, fire: 2, lvReq: 95,
                 d: '설계도에만 있고 한 번도 벼려진 적 없던 칼. 결국 우리가 처음으로 만들었다.'  },
  tome_origin: { n: '기원의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 224, spd: 2.5, kb: 5, mana: 16, tier: 8,
                 proj: 'soul', multi: 4, lvReq: 95,
                 d: '첫 장에 이렇게 적혀 있다 — 「이것을 읽는 너는 우리가 아니다. 그래도 괜찮다.」'  },
  charm_maker: { n: '만든 이의 표식', i: '🔯', type: 'acc', b: { allStat: 18, cdr: 20, def: 22, hp: 150, mpreg: 40 },
                 d: '무엇을 만들었느냐가 아니라, 멈출 줄 알았느냐를 적어 두는 표식.' , lvReq: 38 },

  /* ================= 특별 유적 ① 부유 성채 (하늘) =================
     세션 2의 설계실에서 "그들은 별을 돌려보낸 뒤 멈췄다"고 했다. 그 돌려보내는 장치가
     아직 하늘에 떠 있고, 관리자가 다시 한 번 쏘아 올리려고 기다리고 있다. */
  orbit_plate: { n: '궤도판', i: '🔩', type: 'block', tile: T.ORBITPLATE, stack: 999,
                 d: '떠 있는 것을 떠 있게 하는 판. 손에 들면 아주 조금 가볍다.' },
  orbit_gear:  { n: '궤도 톱니', i: '⚙', type: 'mat', stack: 999,
                 d: '멈춘 적이 없는 톱니. 놓아두면 저 혼자 아주 느리게 돈다.' },
  void_lens:   { n: '공허 렌즈', i: '🔭', type: 'mat', stack: 99,
                 d: '이걸로 보면 별이 어디로 도망쳤는지가 보인다. 보고 나면 한동안 잠이 안 온다.' },
  star_ash:    { n: '별의 재', i: '✨', type: 'mat', stack: 99,
                 d: '한 번 하늘로 돌아갔다가 다시 떨어진 것에서만 나온다.' },
  lance_orbit: { n: '궤도창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 262, spd: 2.2, kb: 16, reach: 88, tier: 9,
                 d: '찌른 자리가 잠깐 위로 끌려 올라간다. 성채를 띄우던 힘을 창끝에 몰아넣었다.'  },
  bow_meridian:{ n: '자오선', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 236, spd: 3.2, kb: 4, tier: 9, proj: 'star', multi: 5,
                 d: '겨눈 곳이 아니라 겨눈 것이 지나갈 곳으로 날아간다.'  },
  charm_orbit: { n: '궤도 인장', i: '🛰', type: 'acc', b: { allStat: 16, jump: 1, ms: 20, cdr: 18, glide: 1 },
                 d: '떨어지는 것을 조금 늦춘다. 성채가 천 년을 떠 있던 방식 그대로.' , lvReq: 42 },

  /* ================= 특별 유적 ② 무너진 갱 (최심부) =================
     스토리와 무관하다. 사람이 파다가 너무 깊이 내려간 자리 — 그게 전부다. */
  deep_stone:  { n: '심층암', i: '🪨', type: 'block', tile: T.DEEPROCK, stack: 999 },
  deep_alloy:  { n: '심층 합금', i: '🔗', type: 'mat', stack: 999,
                 d: '지옥보다 아래에서만 굳는다. 뜨겁지도 차갑지도 않은 게 오히려 불쾌하다.' },
  miner_tag:   { n: '광부의 표찰', i: '🏷', type: 'mat', stack: 99,
                 d: '이름이 긁혀 지워져 있다. 번호만 남았다 — 그것도 세 자리씩 세 번.' },
  gloom_pearl: { n: '어둠 진주', i: '⚫', type: 'mat', stack: 99,
                 d: '빛을 되쏘지 않는다. 들여다보면 눈이 초점을 잡지 못한다.' },
  drill_abyss: { n: '심연 착암기', i: '⛏', type: 'tool', power: 6, dmg: 96, spd: 4.6, pw: 3.2,
                 d: '기반암도 긁는다. 다만 긁을 뿐, 뚫리지는 않는다.' , lvReq: 40 },
  hammer_cave: { n: '갱도 붕괴추', i: '🔨', type: 'weapon', wc: 'melee', dmg: 288, spd: 1.3, kb: 20, reach: 62, tier: 9,
                 d: '한 번 휘두르면 천장이 먼저 놀란다.'  },
  charm_lamp2: { n: '꺼지지 않는 안전등', i: '🏮', type: 'acc', b: { hp: 180, def: 26, vit: 10, hpreg: 2 },
                 d: '마지막까지 켜져 있던 등. 든 사람은 끝내 올라오지 못했다.' , lvReq: 40 },

  /* ================= 제트팩 =================
     동력 장비 계통(pw)의 정점. 두 특별 유적을 다 털어야 재료가 모인다. */
  jetpack:     { n: '제트팩', i: '🚀', type: 'acc', b: { jet: 1, charge: 260, ms: 10 },
                 d: '점프를 누르고 있으면 계속 떠오른다. 전하를 먹고, 바닥나면 가방의 배터리를 갈아 쓴다.' , lvReq: 40 },

  /* ================= 무기 다양화 — 몬스터 전리품 위주로 검·활·마법서 계열을 늘렸다 =================
     대부분은 제작이 아니라 처치 확률 드랍이다(ENEMIES의 drops 참고). 창·철퇴 두 계열은
     새로 만들었고, 나머지는 기존 칼·활·지팡이 그림을 재사용해 색만 새로 입혔다. */
  spear_reed:    { n: '갈대 창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 14, spd: 2.6, kb: 2, reach: 58, tier: 1,
                   d: '찌르기 한 번으로 거리부터 벌린다.'  },
  mace_iron:     { n: '무쇠 철퇴', i: '🔨', type: 'weapon', wc: 'melee', dmg: 24, spd: 1.5, kb: 9, reach: 42, tier: 2,
                   d: '정교함 대신 무게로 해결한다.'  },
  dagger_frost:  { n: '서리 발톱', i: '🗡', type: 'weapon', wc: 'melee', dmg: 38, spd: 3.6, kb: 2, reach: 34, tier: 3, frost: 1,
                   d: '얼음 늑대의 발톱을 그대로 갈아 세웠다.'  },
  spear_venom:   { n: '독전갈의 창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 40, spd: 2.4, kb: 3, reach: 60, tier: 3, poison: 2,
                   d: '전갈의 독침을 창끝에 이었다.'  },
  mace_thorn:    { n: '가시 철퇴', i: '🔨', type: 'weapon', wc: 'melee', dmg: 56, spd: 1.6, kb: 10, reach: 44, tier: 4, poison: 1,
                   d: '내려칠 때마다 가시가 파고든다.'  },
  mace_lava:     { n: '용암 철퇴', i: '🔨', type: 'weapon', wc: 'melee', dmg: 98, spd: 1.5, kb: 13, reach: 46, tier: 5, fire: 3,
                   d: '식지 않는 쇳덩이를 통째로 매달았다.'  },
  dagger_void:   { n: '심연의 발톱', i: '🗡', type: 'weapon', wc: 'melee', dmg: 118, spd: 4.2, kb: 3, reach: 36, tier: 6, lifesteal: 8,
                   d: '벤 만큼 돌려받는다.'  },
  spear_storm:   { n: '돌풍의 창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 145, spd: 2.8, kb: 7, reach: 64, tier: 7,
                   d: '바람 정령의 깃털을 감아 만들었다. 던진 듯 빠르다.'  },
  mace_ruin:     { n: '유적 파쇄추', i: '🔨', type: 'weapon', wc: 'melee', dmg: 158, spd: 1.4, kb: 15, reach: 50, tier: 7,
                   d: '유적을 지키던 손이 마지막으로 남긴 것.'  },
  crossbow_bone: { n: '뼈 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 15, spd: 1.6, kb: 3, tier: 1, proj: 'arrow',
                   d: '뼈로 얼기설기 엮었지만 시위는 팽팽하다.'  },
  bow_venom:     { n: '독니 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 24, spd: 2.0, kb: 2, tier: 2, proj: 'arrow', poison: 2,
                   d: '화살에 독을 바를 필요가 없다. 활 자체가 독이다.'  },
  crossbow_iron: { n: '강철 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 40, spd: 1.4, kb: 5, tier: 3, proj: 'arrow',
                   d: '느리지만, 맞으면 반드시 넘어뜨린다.'  },
  bow_ash:       { n: '잿불 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 54, spd: 2.1, kb: 3, tier: 4, proj: 'arrow', fire: 2,
                   d: '시위를 놓으면 재가 흩날린다.'  },
  crossbow_mythril:{ n: '미스릴 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 92, spd: 1.3, kb: 9, tier: 5, proj: 'star',
                   d: '한 발, 한 발이 무겁다.'  },
  bow_void:      { n: '공허궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 104, spd: 2.3, kb: 3, tier: 6, proj: 'void',
                   d: '시위가 없다. 당기는 시늉만 해도 쏘아진다.'  },
  gun_scrap:     { n: '고철총', i: '🔫', type: 'weapon', wc: 'ranged', dmg: 140, spd: 1.8, kb: 6, tier: 7, proj: 'star', pw: 2,
                   d: '공창이 버린 총열에 손잡이만 새로 달았다.'  },
  crossbow_first:{ n: '최초의 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 200, spd: 1.6, kb: 11, tier: 8, proj: 'star',
                   d: '최초의 파수꾼이 문 앞에 세워 두던 것.'  },
  orb_ember:     { n: '잉걸 구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 18, spd: 1.8, kb: 2, mana: 5, tier: 1, proj: 'fire',
                   d: '꺼지지 않는 잉걸 하나를 구슬에 가뒀다.'  },
  tome_bone:     { n: '백골의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 30, spd: 1.9, kb: 2, mana: 6, tier: 2, proj: 'soul',
                   d: '펼치면 죽은 이의 목소리가 들린다.'  },
  orb_venom:     { n: '독구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 42, spd: 1.8, kb: 2, mana: 7, tier: 3, proj: 'bolt', poison: 2,
                   d: '안개처럼 퍼지는 독을 구슬 안에 압축했다.'  },
  tome_ash:      { n: '재의 경전', i: '📖', type: 'weapon', wc: 'magic', dmg: 60, spd: 1.7, kb: 3, mana: 9, tier: 4, proj: 'fire',
                   d: '책장 사이에서 불씨가 새어 나온다.'  },
  orb_storm:     { n: '뇌구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 88, spd: 2.0, kb: 4, mana: 10, tier: 5, proj: 'bolt', multi: 2,
                   d: '쥐고 있으면 손끝이 저릿하다.'  },
  tome_void:     { n: '공허의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 112, spd: 2.1, kb: 3, mana: 13, tier: 6, proj: 'void',
                   d: '읽을수록 페이지가 사라진다.'  },
  orb_core:      { n: '노심 구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 138, spd: 2.2, kb: 4, mana: 14, tier: 7, proj: 'soul', multi: 2,
                   d: '증식체의 핵 조각이 아직도 맥동한다.'  },
  tome_first:    { n: '최초의 경전', i: '📖', type: 'weapon', wc: 'magic', dmg: 205, spd: 2.0, kb: 5, mana: 16, tier: 8, proj: 'void', multi: 3,
                   d: '처음 별이 떨어지던 밤을 기록한 유일한 책.'  },

  /* ================= 5단계: 새 바이옴 채집물 ================= */
  mud:         { n: '진흙', i: '🟫', type: 'block', tile: T.MUD, stack: 999 },
  fern_frond:  { n: '고사리 잎', i: '🌿', type: 'mat', stack: 999, d: '정글 바닥을 뒤덮고 있다. 짓이기면 진한 냄새가 난다.' },
  orchid:      { n: '밀림꽃', i: '🌺', type: 'mat', stack: 999, d: '어두울수록 더 선명하게 핀다.' },
  lily_pad:    { n: '수련잎', i: '🪷', type: 'mat', stack: 999, d: '폭포호 수면에 떠 있다.' },
  glowcap:     { n: '발광 버섯', i: '🍄', type: 'mat', stack: 999, d: '떼어내도 한동안 빛이 남아 있다.' },
  /* 새 바이옴 전리품 */
  vine_coil:   { n: '덩굴 타래', i: '🪢', type: 'mat', stack: 999 },
  spore_sac:   { n: '포자 주머니', i: '🫧', type: 'mat', stack: 999 },
  /* 새 요리 · 장비 */
  food_curry:  { n: '정글 카레', i: '🍛', type: 'consum', use: { hp: 110, buff: 'fed_curry' }, cd: 4, stack: 30, d: '5분간 화염 저항과 힘이 오른다.' },
  potion_glow: { n: '발광 물약', i: '🔦', type: 'consum', use: { buff: 'lit' }, cd: 4, stack: 20, d: '8분간 주변이 환해진다.' },
  potion_glow_greater: { n: '상급 발광 물약', i: '🔦', type: 'consum', use: { buff: 'lit_greater' }, cd: 4, stack: 20, d: '15분간 주변이 더 넓게 환해진다.' },
  charm_canopy:{ n: '수관의 부적', i: '🍃', type: 'acc', b: { ms: 14, jump: 1, dex: 6 }, d: '나뭇가지 사이를 뛰어다니던 것의 발톱.' , lvReq: 16 },
  charm_spore: { n: '포자 결정', i: '💠', type: 'acc', b: { mp: 45, mpreg: 30, int: 6 }, d: '손안에서 계속 숨 쉬듯 밝아졌다 어두워진다.' , lvReq: 16 },

  /* --- 소환 --- */
  sum_slime:   { n: '왕관 젤리', i: '👑', type: 'summon', boss: 'king_slime', stack: 9, d: '지상에서 사용하면 슬라임 왕이 온다.' },
  sum_bone:    { n: '저주받은 두개골', i: '💀', type: 'summon', boss: 'bone_lord', stack: 9, d: '깊은 곳에서만 반응한다.' },
  sum_heart:   { n: '고동치는 씨앗', i: '🫀', type: 'summon', boss: 'corrupt_heart', stack: 9, d: '부패한 땅에서 사용하라.' },
  sum_frost:   { n: '얼어붙은 왕관', i: '🔷', type: 'summon', boss: 'frost_witch', stack: 9, d: '서리 지대에서 사용하라.' },
  sum_void:    { n: '별의 눈물', i: '💧', type: 'summon', boss: 'void_king', stack: 9, d: '심연 앞에서만 열린다.' }
};

/* ---------------- 제작 시설 ----------------
   3단계에서 작업대와 용광로의 기능을 완전히 분리했다. 예전에는 용광로가 작업대 제작법까지
   전부 대신했지만, 이제 각자 자기 계통만 담당하고 대신 각각 3단계까지 승급한다.
   승급은 시설 앞에서 재료를 내면 되고, 한 번 올리면 세계의 모든 같은 시설에 적용된다
   (마을 것 · 캠프 것을 따로 올릴 필요가 없다). 승급은 기존 제작법을 막지 않고 새 제작법만 연다. */
/* 설치물 규격 — 전부 한 타일(TS=22px) 안에 들어가야 한다.
   예전에는 작업대 44×34 · 용광로 44×40 · 상자 30×26으로 한 칸을 훌쩍 넘겨서, 옆 블록을
   덮고 서 있었다(작업대·용광로는 가로가 정확히 두 칸). 플레이어가 직접 설치할 수 있게
   되면서 좁은 데 여러 개를 붙여 놓게 되므로 한 칸 규격을 지키는 게 특히 중요해졌다. */
/* tw/th = 실제로 차지하는 칸 수(충돌 판정용). w/h는 그 칸 안에 그려지는 실제 픽셀
   크기 — 칸 크기(tw*TS)보다 살짝 작게 둬서 옆 시설과 시각적으로도 여유가 있게 한다.
   tw/th가 없으면(=상자류) 기존처럼 1칸으로 본다. */
const OBJ_SIZE = {
  // 작업대는 낮고 넓은 상판이라 2×1(가로로 긴 모양)이 실물에 더 가깝다는 판단 — 나머지
  // 둘은 2×2 그대로.
  workbench: { w: 40, h: 20, tw: 2, th: 1 },
  forge: { w: 40, h: 40, tw: 2, th: 2 },
  chest: { w: 18, h: 16 },
  crate: { w: 18, h: 16 }      // 플레이어가 놓는 저장 상자(아래 CRATE_KIND)
};

const STATION_NAME = {
  work: ['—', '작업대', '정밀 작업대', '자동 조립대'],
  forge: ['—', '용광로', '고로', '아크 용광로']
};
const STATION_DESC = {
  work: ['', '판자와 못으로 되는 것들.', '치수를 재고 깎는다. 부품이 나오기 시작한다.', '설계 핵을 얹었다. 이제 기계를 만드는 기계를 만든다.'],
  forge: ['', '광석을 녹여 주괴로.', '풀무를 걸었다. 강철판이 나온다.', '전기로 녹인다. 공창이 하던 걸 우리가 한다.']
};
/* STATION_UP[종류][현재레벨] = 다음 레벨로 올리는 비용 (레벨 3이 상한) */
const STATION_UP = {
  work: [null,
    { need: { plank: 40, iron_bar: 14, gear_basic: 8 } },
    { need: { steel_plate: 30, circuit: 12, motor: 6 } }],
  forge: [null,
    { need: { brick: 60, iron_bar: 20, coal: 40 } },
    { need: { steel_plate: 40, circuit: 14, power_core: 8 } }]
};

/* ---------------- 제작법 ---------------- */
// need: {아이템:수량}, station: null(어디서나) / 'work'(작업대) / 'forge'(용광로)
// lv: 그 시설의 필요 승급 단계 (없으면 1). 용광로는 더 이상 작업대를 대신하지 않는다.
const RECIPES = [
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

  { out: 'rod_basic', n: 1, need: { wood: 10, spider_silk: 4 }, station: 'work' },
  { out: 'rod_adv', n: 1, need: { machine_frame: 1, motor: 2, mythril_bar: 4, spider_silk: 14, crystal: 6 }, station: 'work', lv: 3 },
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
  /* 세션 2 — 공창에서 배워 온 것들. 3단계(작업대·용광로 분리, 공장)의 재료가 된다 */
  { out: 'gear_basic', n: 4, need: { steel_plate: 3, iron_bar: 2 }, station: 'forge' },
  { out: 'pick_drill', n: 1, need: { blueprint_core: 1, power_core: 12, gear_basic: 20, mythril_bar: 10 }, station: 'forge' },

  /* ========== 3단계: 용광로 ========== */
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

  /* ========== 3단계: 작업대 ========== */
  /* 정밀 작업대(Lv2) — 1세대 공장. 연료로 굴러가는 최소 구성 */
  { out: 'm_belt', n: 4, need: { iron_bar: 1, gear_basic: 1 }, station: 'work', lv: 2 },
  { out: 'm_pole', n: 2, need: { wood: 6, copper_bar: 1 }, station: 'work', lv: 2 },
  { out: 'm_crate', n: 1, need: { plank: 20, iron_bar: 4 }, station: 'work', lv: 2 },
  { out: 'm_drill', n: 1, need: { gear_basic: 6, iron_bar: 8, steel_plate: 2 }, station: 'work', lv: 2 },
  { out: 'm_smelter', n: 1, need: { brick: 20, iron_bar: 10, gear_basic: 4 }, station: 'work', lv: 2 },
  { out: 'm_gen', n: 1, need: { iron_bar: 12, gear_basic: 8, copper_bar: 10 }, station: 'work', lv: 2 },
  { out: 'fuel_brick', n: 1, need: { coal: 6 }, station: 'work', lv: 2 },
  { out: 'wire', n: 4, need: { copper_bar: 1, polymer: 1 }, station: 'work', lv: 2 },
  { out: 'circuit', n: 1, need: { wire: 3, gold_bar: 1 }, station: 'work', lv: 2 },
  /* 전동기는 Lv3 승급 비용에 들어가므로 반드시 Lv2에서 만들 수 있어야 한다 —
     Lv3에 두면 "전동기를 만들려면 Lv3, Lv3이 되려면 전동기"로 서로 잠긴다 */
  { out: 'motor', n: 1, need: { circuit: 1, gear_basic: 2, steel_plate: 1 }, station: 'work', lv: 2 },
  /* 자동 조립대(Lv3) — 2세대 공장. 전력·정제·조립 계통 전부 */
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

  /* ========== 4단계: 마을 ========== */
  /* 건축·장식은 문턱을 낮게 뒀다 — 꾸미는 걸 재료 걱정 없이 하게 하려고 */
  { out: 'thatch', n: 4, need: { weed: 2, wood: 1 } },
  { out: 'fence', n: 4, need: { wood: 2 } },
  { out: 'timberwall', n: 4, need: { plank: 2, stone: 1 }, station: 'work' },
  { out: 'window', n: 2, need: { crystal: 1, plank: 2 }, station: 'work' },
  { out: 'banner', n: 2, need: { spider_silk: 2, wood: 1 }, station: 'work' },
  { out: 'haybale', n: 2, need: { weed: 6 }, station: 'work' },
  { out: 'sandbag', n: 4, need: { sand: 6, spider_silk: 1 }, station: 'work' },
  { out: 'hoe_iron', n: 1, need: { iron_bar: 3, wood: 2 }, station: 'work' },
  /* 낫 — 다 여문 작물을 성하게 거두는 유일한 연장. 괭이와 같은 값에 두어
     "밭을 하려면 둘 다"가 부담이 되지 않게 했다 */
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
  /* --- v1.1: 전리품으로만 씨를 얻는 작물 넷 ---
     ★ 여기 있는 넷은 **잡아 온 것으로만** 만든다. 밭에서 씨가 저절로 돌아오지 않는
       것은 아니지만(수확 보너스), 첫 한 톨은 반드시 사냥에서 온다. 그래서 밭이
       "따로 노는 부업"이 아니라 사냥의 뒷마당이 된다.
       ★ 재료는 **전부 몬스터가 떨군 것**이다. 캐거나 주운 것(잡초·들꽃·석탄 같은
         것)은 한 톨도 섞지 않았다 — 그래야 "잡아야 심는다"가 규칙으로 읽힌다.
         새 재료도 하나도 늘리지 않았다: 넷 다 이미 굴러다니던 전리품이다.
       손에 흔한 순서대로 놓았다 — 젤·거미 실(바로) → 뼈·잿빛 깃(초반) →
       얼음 송곳니·서리 결정(얼음 바이옴) → 용암 점액·수정 집게(깊은 곳). */
  { out: 'seed_bloodbean', n: 3, need: { slime_gel: 5, spider_silk: 2 }, station: 'work' },
  { out: 'seed_bonebloom', n: 3, need: { bone_frag: 5, ash_feather: 2 }, station: 'work' },
  { out: 'seed_frostherb', n: 3, need: { ice_fang: 3, frost_core: 1 }, station: 'work' },
  { out: 'seed_emberpod', n: 3, need: { lava_gel: 3, crystal_claw: 2 }, station: 'work' },
  /* 거둔 것의 쓸모. 넷 다 "이걸 심을 이유"가 손에 잡혀야 한다 */
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
  { out: 'chest_scale', n: 1, need: { river_scale: 14, tide_pearl: 4, spider_silk: 10 }, station: 'forge' },

  /* ========== 5단계: 새 바이옴 ========== */
  { out: 'potion_glow', n: 2, need: { glowcap: 2, crystal: 1 }, station: 'work' },
  { out: 'potion_glow_greater', n: 1, need: { glowcap: 6, crystal: 4 }, station: 'work', lv: 2 },
  { out: 'food_curry', n: 1, need: { fern_frond: 4, raw_meat: 2, flour: 1 }, station: 'work' },
  { out: 'charm_canopy', n: 1, need: { vine_coil: 10, orchid: 6, spider_silk: 12 }, station: 'forge' },
  { out: 'charm_spore', n: 1, need: { spore_sac: 10, glowcap: 12, crystal: 8 }, station: 'forge' },

  /* ========== 7단계: 폭주로 ========== */
  { out: 'sword_arc', n: 1, need: { core_shard: 20, machine_frame: 3, mythril_bar: 10, battery_cell: 5 }, station: 'forge', lv: 3 },
  { out: 'stop_core', n: 1, need: { core_shard: 25, circuit: 20, machine_frame: 4, power_core: 20 }, station: 'work', lv: 3 },
  { out: 'hammer_still', n: 1, need: { hepha_heart: 1, stop_core: 1, mythril_bar: 20, steel_plate: 30 }, station: 'forge', lv: 3 },
  { out: 'charm_govern', n: 1, need: { hepha_heart: 1, circuit: 20, battery_cell: 6, aether_shard: 20 }, station: 'forge', lv: 3 },
  /* --- 세션 2 종장: 설계실 ---
     인장은 헤파의 심장을 녹여 만든다. 벽이 만든 것이라야 벽이 열린다는 게 이 장의 전제다. */
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

  /* --- 제트팩 ---
     동력 장비 계통의 정점이라 두 특별 유적을 **둘 다** 털어야 재료가 모인다.
     하늘(궤도 톱니·별의 재)과 최심부(심층 합금·어둠 진주)를 하나씩 요구하는 게 요점이다.
     작업대(정밀 3단계)에서 만든다 — 용광로가 아니라 조립물이라서. */
  { out: 'jetpack', n: 1, need: {
      orbit_gear: 40, star_ash: 3, deep_alloy: 35, gloom_pearl: 2,
      machine_frame: 3, motor: 4, circuit: 20, battery_cell: 6, polymer: 20
    }, station: 'work', lv: 3 }
];

/* ---------------- 연료 ----------------
   숫자는 "이 한 개로 몇 틱을 태울 수 있나". 공장 1틱 = 0.125초.
   석유 계통이 사막 한정인 대신 압도적으로 효율이 좋다 — 사막까지 벨트를 끌 이유가 된다. */
const FUEL = { wood: 16, plank: 20, ash: 8, coal: 90, fuel_brick: 560, crude_oil: 150, refined_oil: 640 };

/* ---------------- 기계 ----------------
   전부 1×1 타일이다. 여러 칸짜리로 만들면 설치·철거·저장·충돌이 전부 특수 처리가 되어야 해서,
   대신 타일 하나에 정보를 몰아넣고 그림으로 구분하는 쪽을 택했다.

   power: 틱당 소비 전력 · gen: 틱당 생산 전력 · store: 축전 용량
   fuelIn: 연료를 직접 태운다(전력망 불필요) · rot: 방향을 돌릴 수 있다
   proc: MRECIPES에서 쓸 제작 계통 · cap: 입출력 버퍼 한 종류당 최대 개수
   cycle: 한 번 동작에 드는 틱 · mine: 채굴 등급(곡괭이 power와 같은 체계) */
const MACHINE = {
  belt: {
    n: '컨베이어 벨트', tile: T.M_BELT, item: 'm_belt', rot: 1,
    d: '틱마다 아이템을 한 칸씩 앞으로 민다. 동력이 필요 없다. 앞이 막히면 그 자리에서 기다린다.'
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
    d: '연료를 태워 반경 5칸의 광맥을 스스로 캔다. 캔 광석은 앞쪽으로 내보낸다. 미스릴 위쪽은 못 캔다.'
  },
  drill_e: {
    n: '전동 드릴', tile: T.M_DRILL_E, item: 'm_drill_e', power: 22, rot: 1, mine: 4, cycle: 9, range: 7, cap: 60,
    d: '전력으로 도는 드릴. 기계식보다 세 배 빠르고 반경도 넓으며, 기반암 말고는 전부 캔다.'
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
    d: '자기 칸에 들어온 적을 지진다. 플레이어는 감전되지 않는다.'
  },
  switch: {
    n: '정지 스위치', tile: T.M_SWITCH, item: 'm_switch',
    d: '이어진 전력망 전체를 한 번에 멈추고 다시 돌린다. 공창이 끝내 만들지 못한 물건이다.'
  },
  /* --- 6단계: 유적 함정 ---
     동력이 필요 없는 기계식이다. 유적에 놓인 것은 플레이어를 노리고(own 없음),
     플레이어가 설치한 것은 적을 노린다(own=1) — 같은 기계인데 편이 갈린다. */
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

  /* --- 4단계: 마을 --- */
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

/* ---------------- 기계 제작법 ----------------
   기계는 입력 버퍼에 든 재료로 만들 수 있는 첫 번째 제작법을 스스로 고른다.
   t: 걸리는 틱 수 (전력이 모자라면 그만큼 느려진다) */
const MRECIPES = [
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
  { m: 'assembler', in: { lead_bar: 2, polymer: 1, refined_oil: 1 }, out: { battery_empty: 1 }, t: 24 },
  { m: 'assembler', in: { steel_plate: 1 }, out: { rivet: 12 }, t: 12 },
  /* 축전지 — 전력. 방전된 배터리를 다시 채운다 */
  { m: 'battery', in: { battery_empty: 1 }, out: { battery_cell: 1 }, t: 48 },
  /* 밀링기 — 전력 */
  { m: 'mill', in: { wheat: 3 }, out: { flour: 2 }, t: 14 },
  { m: 'mill', in: { starroot: 3 }, out: { flour: 1, fertilizer: 1 }, t: 16 },
  { m: 'mill', in: { bone_frag: 5 }, out: { fertilizer: 3 }, t: 16 },
  { m: 'mill', in: { weed: 6 }, out: { fertilizer: 2 }, t: 12 },
  /* 화덕 — 연료. 요리 */
  { m: 'oven', in: { flour: 2 }, out: { food_bread: 1 }, t: 20 },
  { m: 'oven', in: { flour: 2, raw_meat: 2 }, out: { food_pie: 1 }, t: 28 },
  { m: 'oven', in: { mushroom: 3, flour: 1 }, out: { food_mstew: 1 }, t: 24 },
  { m: 'oven', in: { starroot: 3 }, out: { food_soup: 1 }, t: 22 },
  { m: 'oven', in: { wildflower: 4 }, out: { food_tea: 2 }, t: 18 },
  { m: 'oven', in: { cactus_flesh: 3, flour: 1 }, out: { food_jelly: 2 }, t: 20 },
  { m: 'oven', in: { food_bread: 1, food_pie: 1, food_soup: 1 }, out: { food_feast: 1 }, t: 60 },
  /* v1.1: 전리품 작물 넷. 고기 없이도 파이가 되고, 꽃 없이도 차가 된다 —
     사냥해서 심은 것이 부엌까지 이어지도록 */
  { m: 'oven', in: { bloodbean: 3, flour: 1 }, out: { food_pie: 2 }, t: 26 },
  { m: 'oven', in: { frostherb: 3 }, out: { food_tea: 2 }, t: 18 },
  { m: 'oven', in: { bloodbean: 2, frostherb: 2, mushroom: 2 }, out: { food_curry: 1 }, t: 30 },
  { m: 'mill', in: { bonebloom: 3 }, out: { fertilizer: 4 }, t: 14 },
  { m: 'mill', in: { emberpod: 4 }, out: { fuel_brick: 2 }, t: 16 }
];

/* ---------------- 마을 등급 ----------------
   여명 마을에만 적용된다. 베이스캠프는 이 체계 바깥이다 — 캠프는 "돌아올 곳"이지
   키우는 곳이 아니라는 세션 1의 설정을 그대로 둔다.
   등급을 올리면 world.upgradeVillage()가 실제로 타일을 바꾸고 시설을 들여놓는다. */
const VILLAGE = [
  null,
  {
    n: '되살아난 마을',
    d: '잿빛이 걷히고 사람이 다시 들어왔다. 아직은 살아남은 자리에 가깝다.',
    gain: ['주민 5명 · 여관 · 보관고 · 재련대 · 의뢰 게시판']
  },
  {
    n: '자리 잡은 마을',
    /* ★ 밭을 "갈아 준다"고 쓰지 않는다 — 마을은 자리를 내주고 연장을 건넬 뿐,
       가는 것도 심는 것도 플레이어 몫이다(world.js upgradeVillage 2단계 참고).
       예전에는 마을이 밭을 갈고 씨까지 반쯤 심어 두어서, 처음 온 사람이
       "농사는 이미 누가 해 놨네" 하고 지나쳤다. */
    d: '지붕을 다시 얹고, 울타리를 두르고, 밤에도 길이 보이게 했다.',
    need: { plank: 60, brick: 60, steel_plate: 20, gear_basic: 10 },
    gain: [
      '집을 2층으로 올리고 기와를 얹는다',
      '마을 서쪽에 울타리 친 빈 땅과 씨앗 상자가 생긴다 (가는 건 네 몫이다)',
      '지붕 위에 풍차가 서고, 밭까지 전주 선로가 깔린다',
      '횃불이 가로등으로, 벽에 창문이 난다',
      '보관고 +12칸 · 여관 숙박비 30% 감소'
    ]
  },
  {
    n: '여명 요새',
    d: '다시는 빼앗기지 않겠다는 뜻으로 벽을 세웠다.',
    /* 값을 조금만 덜었다(성벽돌 120→100 · 강철판 40→32 · 회로 10→8 · 전동기 4→3).
       요새는 마을의 마지막 단계다 — 쉽게 서면 안 된다. 다만 예전 값은 공장을
       한참 돌린 뒤에야 닿아서 마지막 한 칸이 유난히 길게 늘어졌다. 그 늘어짐만
       덜어 내고, "벽을 세우려면 제대로 벌어야 한다"는 무게는 그대로 둔다. */
    need: { wallstone: 100, steel_plate: 32, circuit: 8, motor: 3 },
    gain: [
      '마을 양쪽에 성벽과 흉벽이 올라간다',
      '감시탑 두 기에 자동 포탑이 걸린다 (대갈못을 채워 두면 된다)',
      '상주 경비병 두 명이 마을을 지킨다',
      '재련 비용 25% 감소 · 상점 환율 +10%',
      '성문과 깃발이 걸린다'
    ]
  }
];

/* ---------------- 시작 캐릭터 ---------------- */
/* 다섯이 각자 제 시트를 쓴다 — char/player_<id>.png (13프레임, 원본 player.png와
   프레임 순서가 완전히 동일하다: idle1 idle2 walk1..4 jump fall dash atk1..3 hurt).
   시트는 tools/mkchars.py 가 player.png의 부위를 가려내 색과 실루엣을 바꿔 굽는다.
   tint 는 시트를 못 읽었을 때의 폴백 겸 선택 화면의 표식으로만 남겨 둔다.
   능력치 차이는 초반 몇 장에서만 체감되고 성장으로 덮인다(고정 페널티는 없다).
   저장에는 charId 만 남는다. 게임 도중에는 바꿀 수 없다.

   ★ 시작 무기는 **넷 다 초당 피해가 같다**(19.8~20.0). 예전에는 곡괭이로 시작하는
     굴 파는 이만 13.2 라서, 고른 캐릭터 하나 때문에 초반이 통째로 팍팍했다.
       금 간 목검     9 × 2.2 = 19.8   (근접, 사거리 40)
       날카로운 곡괭이 9 × 2.2 = 19.8   (근접 + 채굴)
       사냥용 활     10 × 2.0 = 20.0   (거리를 둔다)
       옹이진 나뭇가지 11 × 1.8 = 19.8   (마나 4 를 쓴다)
     성격 차이는 사거리 · 마나 · 탄속으로 남기고 숫자만 맞췄다.
   ★ **곡괭이는 다섯 모두가 들고 시작한다.** 곡괭이가 없으면 첫 나무·첫 돌에서
     막혀 시작 자체가 안 된다. 곡괭이를 무기로 드는 굴 파는 이만 구리 곡괭이 대신
     날카로운 곡괭이를 든다(캐는 것은 똑같다). */
const CHARACTERS = [
  { id: 'wanderer', n: '떠돌이', tint: null, d: '치우침이 없다. 처음이라면 이쪽.',
    story: '재가 내리기 전, 어느 마을의 문을 마지막으로 잠근 사람. ' +
           '이름도 고향도 그 문 안에 두고 왔다. 지도 대신 제 걸음을 믿는다.',
    base: { str: 5, dex: 5, int: 5, vit: 5 },
    weapon: 'sword_wood',
    bag: [['pick_copper', 1], ['torch', 20], ['potion_hp_small', 3]] },
  { id: 'digger', n: '굴 파는 이', tint: '#c8934a', d: '더 튼튼하고, 날 세운 곡괭이 하나로 캐고 싸운다.',
    story: '3번 갱이 무너지던 날 걸어 나온 하나. 안전모의 불은 그때부터 꺼뜨린 적이 없다. ' +
           '아래는 무섭지 않다 — 위가 무섭다.',
    base: { str: 6, dex: 4, int: 4, vit: 6 },
    weapon: 'pick_sharp',
    bag: [['sword_wood', 1], ['torch', 40], ['potion_hp_small', 2]] },
  { id: 'ranger', n: '사냥꾼', tint: '#6aa85a', d: '활을 들고 나온다. 거리를 두고 싸운다.',
    story: '숲이 마르기 전을 기억한다. 재가 내려도 짐승은 남았고, ' +
           '남은 것을 세는 법을 아는 사람은 이제 몇 없다.',
    base: { str: 4, dex: 7, int: 4, vit: 5 },
    weapon: 'bow_hunt',
    bag: [['pick_copper', 1], ['torch', 16], ['potion_hp_small', 2]] },
  { id: 'adept', n: '수련생', tint: '#7f6fd8', d: '지팡이와 마나 물약. 마법으로 연다.',
    story: '다 타 버린 서고의 마지막 학생. 스승은 책을 지키다 재가 되었다. ' +
           '외운 세 줄이 가진 전부다.',
    base: { str: 4, dex: 4, int: 7, vit: 5 },
    weapon: 'staff_branch',
    bag: [['pick_copper', 1], ['torch', 16], ['potion_mp_small', 3], ['potion_hp_small', 1]] },
  { id: 'stray', n: '빈손', tint: '#9a9a9a', d: '무기 없이 시작한다. 곡괭이와 금화만 쥐었다.',
    story: '재 속에서 주워졌다. 누가 두고 갔는지는 아무도 모른다. ' +
           '가진 것은 곡괭이 한 자루와 동전 몇 닢, 이름 없는 목숨뿐.',
    base: { str: 5, dex: 5, int: 5, vit: 5 },
    weapon: null, gold: 120,
    bag: [['pick_copper', 1], ['torch', 8]] }
];

/* ---------------- 난이도 ---------------- */
/* 새 게임에서 한 번 고르고 끝이다 — 설정에서 바꿀 수 없다. 저장에 남는다.
   mul 은 몹의 체력·공격력에만 곱한다(경험치·금화는 건드리지 않는다).
   death: 'normal' 잃은 것만 · 'drop' 인벤토리 절반까지 · 'wipe' 슬롯 삭제 */
const MODES = [
  { id: 'normal', n: '일반', mul: 1, death: 'normal', c: '#8fb87a',
    d: '경험치 일부와 금화를 잃습니다. 쓰러진 자리에서 절반을 되찾을 수 있습니다.' },
  { id: 'hard', n: '하드', mul: 2, death: 'drop', c: '#e0a03a',
    d: '몬스터의 체력과 공격력이 2배. 죽으면 가방의 절반까지 그 자리에 떨어집니다.' },
  { id: 'impossible', n: '불가능', mul: 5, death: 'wipe', c: '#d0564c',
    d: '몬스터의 체력과 공격력이 5배. 한 번 죽으면 이 슬롯의 기록이 지워집니다.' }
];
const MODE_OF = id => MODES.find(m => m.id === id) || MODES[0];
const CHAR_OF = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];

/* ---------------- 활·총을 든 손 ---------------- */
/* 활은 겨눈 쪽으로 돌려 그리는데, 손 바로 위에 그리면 몸을 파고든다. 팔을 뻗은 만큼
   앞으로 밀어 두고(BOW_HAND), 화살은 활 끝에서 나가게 한다(BOW_TIP).
   BOW_TIP 은 BOW_HAND + 아이콘 안에서 화살촉이 놓인 자리(26px 상자 기준 +11.4)다.
   그리는 쪽(game.js drawHeldWeapon)과 쏘는 쪽(entity.js fireProj)이 같은 값을 봐야
   화살이 활 끝에서 나가는 것처럼 보인다 — 한쪽만 고치지 말 것. */
const BOW_HAND = 18;
const BOW_TIP = BOW_HAND + 11.4;

/* ---------------- 조작키 ---------------- */
/* 설정에서 바꾼다. 저장은 설정(SET_KEY)에 붙고 세이브와는 무관하다.
   값은 KeyboardEvent.code — 자판 배열이 달라도 자리로 잡히게. */
const KEY_ACTIONS = [
  { id: 'left', n: '왼쪽', def: ['KeyA', 'ArrowLeft'] },
  { id: 'right', n: '오른쪽', def: ['KeyD', 'ArrowRight'] },
  { id: 'down', n: '내려가기', def: ['KeyS', 'ArrowDown'] },
  { id: 'jump', n: '점프', def: ['Space', 'KeyW', 'ArrowUp'] },
  { id: 'dash', n: '대시', def: ['ShiftLeft', 'ShiftRight'] },
  { id: 'skill1', n: '스킬 1', def: ['KeyQ'] },
  { id: 'skill2', n: '스킬 2', def: ['KeyE'] },
  { id: 'skill3', n: '스킬 3', def: ['KeyR'] },
  { id: 'skill4', n: '스킬 4', def: ['KeyF'] },
  { id: 'inv', n: '가방', def: ['KeyI'] },
  { id: 'skills', n: '능력', def: ['KeyK'] },
  { id: 'quest', n: '일지', def: ['KeyJ'] },
  { id: 'craft', n: '제작', def: ['KeyH'] },
  { id: 'save', n: '저장', def: ['F5'] }
];

/* ---------------- 알림 갈래 ---------------- */
/* toast 두 번째 인자에 넘기는 갈래. 설정에서 갈래마다 끌 수 있다.
   'bad' 는 죽음·실패처럼 놓치면 안 되는 것이라 목록에 두지 않는다(항상 뜬다). */
const NOTICE_KINDS = [
  { id: 'good', n: '획득 · 성공', def: 1 },
  { id: 'info', n: '안내 · 발견', def: 1 },
  { id: 'quest', n: '목표 진행', def: 1 },
  { id: 'craft', n: '제작 · 설치', def: 1 }
];

/* ---------------- 적 ---------------- */
// ai: walker / jumper / flyer / archer / caster / boss별 전용
//
// stiff: 그림이 거의 안 움직이는 개체를 렌더러가 절차적으로 흔들어 주는 값.
//   지금은 붙은 개체가 하나도 없다 — tools/reanim.py 로 시트를 다시 구워 실제로
//   걷고 숨 쉬게 만들었기 때문이다(측정값은 tools/framediff.py 로 확인). 그림이
//   움직이는데 코드까지 흔들면 이중으로 흔들려서 오히려 어색해진다.
//   drawEnemy 의 흔들림 경로는 남겨 뒀다 — 앞으로 추가할 몹 중에 또 정지한 그림이
//   나오면 stiff: 0.8 처럼 붙이면 그때부터 다시 돈다.
//   근본 해결은 프레임을 다시 그리는 것이고, 이건 그때까지의 가림막이다.
const ENEMIES = {
  /* --- 순한 동물: 적대하지 않고 어슬렁거리다 맞으면 도망친다. 잡으면 생고기를 준다 --- */
  rabbit:      { n: '들토끼', hp: 8, dmg: 0, def: 0, spd: 70, ai: 'critter', w: 16, h: 12, c: '#ad9678', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  arctic_hare: { n: '눈산토끼', hp: 8, dmg: 0, def: 0, spd: 70, ai: 'critter', w: 16, h: 12, c: '#e8eef2', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  sand_lizard: { n: '모래 도마뱀', hp: 10, dmg: 0, def: 0, spd: 60, ai: 'critter', w: 18, h: 10, c: '#c8a45a', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  jungle_frog: { n: '정글 개구리', hp: 9, dmg: 0, def: 0, spd: 90, ai: 'critter', w: 14, h: 12, c: '#5ab04a', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  glow_snail:  { n: '빛달팽이', hp: 12, dmg: 0, def: 0, spd: 24, ai: 'critter', w: 16, h: 12, c: '#7fe0c8', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1], ['glowcap', .15, 1, 1]] },
  ash_vole:    { n: '잿들쥐', hp: 9, dmg: 0, def: 0, spd: 85, ai: 'critter', w: 14, h: 10, c: '#8a7a8c', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },

  slime:      { n: '잿빛 슬라임', hp: 34, dmg: 8, def: 0, spd: 34, ai: 'jumper', w: 26, h: 20, c: '#6f8ba0', xp: 9, gold: 3, biome: 'surface', aggro: 320,
                drops: [['slime_gel', .9, 1, 3], ['potion_hp_small', .06, 1, 1]] },
  zombie:     { n: '떠도는 시체', hp: 60, dmg: 14, def: 2, spd: 30, ai: 'walker', w: 20, h: 40, c: '#5b7a52', xp: 16, gold: 6, biome: 'night', aggro: 460,
                drops: [['bone_frag', .5, 1, 2], ['iron_ore', .12, 1, 2], ['potion_hp_small', .07, 1, 1]] },
  bat:        { n: '동굴 박쥐', hp: 26, dmg: 11, def: 0, spd: 84, ai: 'flyer', w: 22, h: 16, c: '#6b4a6b', xp: 12, gold: 4, biome: 'cave', aggro: 420,
                drops: [['bone_frag', .3, 1, 1]] },
  skeleton:   { n: '무덤지기', hp: 88, dmg: 19, def: 5, spd: 38, ai: 'walker', w: 20, h: 40, c: '#c9c3b0', xp: 26, gold: 12, biome: 'cave', aggro: 480,
                drops: [['bone_frag', .8, 2, 4], ['iron_ore', .3, 1, 3], ['copper_bar', .1, 1, 2], ['crossbow_bone', .03, 1, 1], ['tome_bone', .025, 1, 1]] },
  archer:     { n: '해골 궁수', hp: 70, dmg: 16, def: 3, spd: 30, ai: 'archer', w: 20, h: 40, c: '#a89e88', xp: 30, gold: 14, biome: 'cave', range: 300, aggro: 560,
                drops: [['bone_frag', .7, 2, 3], ['bow_hunt', .05, 1, 1], ['crossbow_bone', .035, 1, 1], ['tome_bone', .025, 1, 1]] },
  crawler:    { n: '부패한 사냥꾼', hp: 130, dmg: 27, def: 8, spd: 62, ai: 'walker', w: 24, h: 38, c: '#6b4a86', xp: 48, gold: 22, biome: 'corrupt', aggro: 520,
                drops: [['corrupt_ess', .7, 1, 3], ['ebon_chunk', .4, 1, 3], ['mace_thorn', .025, 1, 1]] },
  shadoweye:  { n: '그림자 눈', hp: 110, dmg: 24, def: 4, spd: 70, ai: 'caster', w: 26, h: 26, c: '#3d2a54', xp: 52, gold: 24, biome: 'corrupt', range: 340, aggro: 520,
                drops: [['corrupt_ess', .8, 2, 4], ['soul_shard', .15, 1, 2]] },
  frostling:  { n: '서리 정령', hp: 175, dmg: 33, def: 12, spd: 46, ai: 'caster', w: 26, h: 34, c: '#8fd0e8', xp: 70, gold: 32, biome: 'ice', range: 300, aggro: 480,
                drops: [['frost_core', .6, 1, 2], ['ice_shard', .8, 2, 5], ['crystal', .2, 1, 2]] },
  imp:        { n: '화염 임프', hp: 210, dmg: 40, def: 10, spd: 92, ai: 'caster', w: 24, h: 28, c: '#e0662a', xp: 92, gold: 44, biome: 'hell', range: 320, aggro: 560,
                drops: [['hell_ore', .5, 1, 3], ['soul_shard', .3, 1, 2], ['bow_ash', .03, 1, 1], ['tome_ash', .025, 1, 1]] },
  golem:      { n: '재의 골렘', hp: 380, dmg: 56, def: 22, spd: 34, ai: 'walker', w: 34, h: 48, c: '#7a5c4a', xp: 130, gold: 66, biome: 'hell', aggro: 380,
                drops: [['hell_ore', .8, 2, 5], ['obsidian', .4, 1, 3], ['soul_shard', .4, 1, 3], ['mace_lava', .03, 1, 1], ['tome_ash', .02, 1, 1], ['ring_brand', .05, 1, 1]] },
  wraith:     { n: '심연의 망령', hp: 300, dmg: 50, def: 14, spd: 80, ai: 'flyer', w: 26, h: 38, c: '#4a3a6e', xp: 120, gold: 60, biome: 'deep', aggro: 560,
                drops: [['void_frag', .35, 1, 2], ['soul_shard', .6, 1, 3], ['dagger_void', .03, 1, 1], ['bow_void', .025, 1, 1], ['tome_void', .025, 1, 1]] },

  /* --- 지역별 추가 몬스터 --- */
  ashcrow:    { n: '잿빛 까마귀', hp: 42, dmg: 11, def: 1, spd: 96, ai: 'flyer', w: 24, h: 18, c: '#6a6a72', xp: 14, gold: 5, biome: 'surface', aggro: 420,
                drops: [['ash_feather', .7, 1, 2]] },
  spider:     { n: '동굴 거미', hp: 70, dmg: 16, def: 2, spd: 70, ai: 'jumper', w: 26, h: 18, c: '#5a4a6a', xp: 22, gold: 9, biome: 'cave', aggro: 440,
                drops: [['spider_silk', .7, 1, 3], ['bone_frag', .2, 1, 2]] },
  minerghost: { n: '광부의 유령', hp: 96, dmg: 22, def: 4, spd: 66, ai: 'flyer', w: 22, h: 34, c: '#8fa8b0', xp: 34, gold: 18, biome: 'cave', aggro: 480,
                drops: [['iron_ore', .6, 2, 4], ['gold_ore', .25, 1, 3], ['lost_lamp', .12, 1, 1]] },
  scorpion:   { n: '사막 전갈', hp: 100, dmg: 30, def: 6, spd: 78, ai: 'walker', w: 28, h: 20, c: '#a06a3a', xp: 40, gold: 22, biome: 'desert', aggro: 440,
                drops: [['venom_sting', .65, 1, 3], ['spear_venom', .03, 1, 1], ['bow_venom', .03, 1, 1], ['orb_venom', .025, 1, 1]] },
  sandmaw:    { n: '모래 아가리', hp: 130, dmg: 26, def: 10, spd: 56, ai: 'walker', w: 34, h: 26, c: '#c0a05a', xp: 44, gold: 20, biome: 'desert', aggro: 380,
                drops: [['sand', .8, 3, 8], ['venom_sting', .3, 1, 2], ['spear_venom', .025, 1, 1], ['bow_venom', .025, 1, 1]] },
  icewolf:    { n: '얼음 늑대', hp: 165, dmg: 34, def: 10, spd: 108, ai: 'walker', w: 32, h: 24, c: '#bcd8ee', xp: 66, gold: 30, biome: 'ice', aggro: 560,
                drops: [['ice_fang', .6, 1, 3], ['ice_shard', .7, 2, 4], ['dagger_frost', .03, 1, 1], ['charm_hawk', .06, 1, 1]] },
  corrupttree:{ n: '부패한 나무', hp: 260, dmg: 40, def: 20, spd: 26, ai: 'walker', w: 34, h: 48, c: '#5a3f78', xp: 86, gold: 40, biome: 'corrupt', aggro: 340,
                drops: [['corrupt_ess', .8, 2, 4], ['moss_core', .45, 1, 2], ['wood', .9, 3, 8], ['mace_thorn', .025, 1, 1]] },
  crystalcrab:{ n: '수정 게', hp: 300, dmg: 44, def: 28, spd: 44, ai: 'walker', w: 34, h: 24, c: '#7fd8e8', xp: 110, gold: 55, biome: 'deep', aggro: 400,
                drops: [['crystal_claw', .6, 1, 2], ['crystal', .7, 2, 5], ['dagger_void', .025, 1, 1], ['tome_void', .02, 1, 1]] },
  lavaslug:   { n: '용암 슬러그', hp: 340, dmg: 52, def: 18, spd: 40, ai: 'walker', w: 32, h: 22, c: '#e0703a', xp: 120, gold: 58, biome: 'hell', aggro: 360,
                drops: [['lava_gel', .7, 1, 3], ['hell_ore', .5, 1, 3], ['mace_lava', .035, 1, 1]] },
  cloudjelly: { n: '구름 해파리', hp: 300, dmg: 48, def: 14, spd: 62, ai: 'flyer', w: 28, h: 30, c: '#e8f0fa', xp: 130, gold: 60, biome: 'sky', aggro: 460,
                drops: [['cloud_jelly', .7, 1, 3], ['cloud_block', .6, 3, 8]] },
  archivist:  { n: '잊힌 사서', hp: 420, dmg: 70, def: 22, spd: 68, ai: 'caster', w: 24, h: 36, c: '#c8b98a', xp: 220, gold: 120, biome: 'ruin', range: 340, aggro: 560,
                drops: [['archive_seal', .55, 1, 2], ['aether_shard', .4, 1, 3]] },

  /* --- 2부 일반 --- */
  sky_sentry: { n: '하늘 파수꾼', hp: 420, dmg: 62, def: 20, spd: 96, ai: 'caster', w: 26, h: 34, c: '#a8c8e0', xp: 160, gold: 80, biome: 'sky', range: 340, aggro: 560,
                drops: [['sky_feather', .7, 1, 3], ['aether_shard', .3, 1, 2], ['cloud_block', .5, 2, 6], ['spear_storm', .02, 1, 1]] },
  gale:       { n: '바람 정령', hp: 340, dmg: 54, def: 12, spd: 130, ai: 'flyer', w: 26, h: 26, c: '#cfe8ff', xp: 140, gold: 66, biome: 'sky', aggro: 480,
                drops: [['sky_feather', .8, 2, 4], ['cloud_block', .6, 3, 8], ['spear_storm', .025, 1, 1], ['charm_zenith', .04, 1, 1]] },
  ruin_guard: { n: '유적 수호병', hp: 620, dmg: 78, def: 40, spd: 40, ai: 'walker', w: 30, h: 46, c: '#8a8270', xp: 240, gold: 130, biome: 'ruin', aggro: 420,
                drops: [['ruin_brick', .8, 2, 6], ['aether_shard', .4, 1, 3], ['soul_shard', .5, 2, 4], ['mace_ruin', .03, 1, 1]] },
  lantern:    { n: '잊힌 등불', hp: 380, dmg: 66, def: 16, spd: 74, ai: 'caster', w: 22, h: 30, c: '#e0c86a', xp: 200, gold: 110, biome: 'ruin', range: 330, aggro: 520,
                drops: [['aether_shard', .5, 1, 3], ['crystal', .5, 2, 5]] },

  /* --- 세션 2: 지하 공창 --- */
  scrapcrawler: { n: '고철 기어다니개', hp: 900, dmg: 62, def: 30, spd: 92, ai: 'walker', w: 30, h: 22, c: '#6a6a74', xp: 900, gold: 240, aggro: 420,
                 drops: [['steel_plate', 1, 3, 7], ['conduit_part', .5, 1, 2], ['gun_scrap', .02, 1, 1]] },
  sparkwisp:    { n: '불티 정령', hp: 620, dmg: 55, def: 18, spd: 168, ai: 'flyer', w: 20, h: 20, c: '#e8a53a', xp: 820, gold: 210, aggro: 500,
                 drops: [['power_core', .6, 1, 2], ['conduit_part', 1, 1, 3]] },
  riveter:      { n: '대갈못 사수', hp: 1150, dmg: 74, def: 34, spd: 74, ai: 'archer', w: 24, h: 40, c: '#8a8a96', xp: 1150, gold: 300, aggro: 620, proj: 'bone',
                 drops: [['steel_plate', 1, 4, 9], ['iron_bar', .6, 2, 4], ['gun_scrap', .025, 1, 1]] },
  foreman:      { n: '옛 십장', hp: 1900, dmg: 88, def: 44, spd: 88, ai: 'caster', w: 26, h: 42, c: '#c8a06a', xp: 1700, gold: 480, aggro: 640, range: 380, proj: 'rune',
                 drops: [['power_core', 1, 2, 4], ['steel_plate', 1, 5, 10], ['blueprint_frag', .4, 1, 1]] },

  /* --- 5단계: 울림 정글 ---
     지상 셋(vinelash·bloomspitter·canopy_ape)은 원래 사막(2000~2680)보다 앞서 지나는
     길목(1400~2000)인데도 사막 몹(전갈 hp100/dmg30, 모래 아가리 hp130/dmg26)보다
     전부 셌다 — 나중에 곁가지 바이옴으로 추가되면서 사막 대비 균형을 안 맞춘 채였다.
     hp·dmg를 15% 낮춰 사막과 비슷하거나 살짝 아래로 맞췄다(동굴/유적 안의 같은
     이름 몹은 손대지 않음 — 그건 유적 rank로 따로 관리된다). */
  vinelash:   { n: '덩굴채찍', hp: 162, dmg: 29, def: 8, spd: 74, ai: 'walker', w: 26, h: 40, c: '#3f7a34', xp: 62, gold: 28, biome: 'jungle', aggro: 500,
                drops: [['vine_coil', .7, 1, 3], ['fern_frond', .5, 1, 3]] },
  bloomspitter:{ n: '꽃뱉이', hp: 128, dmg: 26, def: 4, spd: 58, ai: 'caster', w: 26, h: 26, c: '#c85a9a', xp: 58, gold: 26, biome: 'jungle', range: 320, aggro: 480,
                drops: [['orchid', .6, 1, 2], ['vine_coil', .4, 1, 2]] },
  canopy_ape: { n: '수관 원숭이', hp: 196, dmg: 34, def: 10, spd: 118, ai: 'jumper', w: 28, h: 30, c: '#7a5a3a', xp: 84, gold: 40, biome: 'jungle', aggro: 560,
                drops: [['raw_meat', .8, 1, 2], ['vine_coil', .5, 1, 2]] },
  /* --- 5단계: 버섯 골짜기 --- */
  sporeling:  { n: '포자 정령', hp: 165, dmg: 28, def: 6, spd: 96, ai: 'flyer', w: 22, h: 22, c: '#6fe0c0', xp: 60, gold: 26, biome: 'glowfen', aggro: 460,
                drops: [['spore_sac', .7, 1, 3], ['glowcap', .5, 1, 2]] },
  capbeast:   { n: '갓짐승', hp: 280, dmg: 44, def: 16, spd: 52, ai: 'jumper', w: 32, h: 26, c: '#8fd0b0', xp: 96, gold: 44, biome: 'glowfen', aggro: 420,
                drops: [['glowcap', .8, 2, 4], ['spore_sac', .4, 1, 2]] },
  /* --- 동굴 물웅덩이 · 폭포 ---
     물 밖으로는 나오지 못한다(ai: 'swimmer'). 웅덩이가 곧 이들의 영역이라, 물에 들어가지
     않으면 싸울 일이 없다 — 들어갈지 말지를 고르게 하는 게 이 구역의 재미다. */
  cave_minnow:{ n: '눈먼 송사리', hp: 12, dmg: 0, def: 0, spd: 62, ai: 'swimmer', passive: 1, w: 16, h: 10, c: '#9fd8e8', xp: 6, gold: 2, aggro: 0,
                drops: [['raw_meat', .5, 1, 1]] },
  // 정글 폭포호 전용 — 동굴 웅덩이의 눈먼 송사리와 같은 자리지만, 지상 호수답게 화사한 색을 준다
  jungle_koi: { n: '비단잉어', hp: 14, dmg: 0, def: 0, spd: 74, ai: 'swimmer', passive: 1, w: 18, h: 11, c: '#ff8a4a', xp: 7, gold: 3, aggro: 0,
                drops: [['raw_meat', .5, 1, 1]] },
  grotto_eel: { n: '웅덩이 뱀장어', hp: 150, dmg: 32, def: 8, spd: 128, ai: 'swimmer', w: 34, h: 14, c: '#3a6a5a', xp: 64, gold: 30, aggro: 300,
                drops: [['raw_meat', .6, 1, 2], ['crystal', .25, 1, 2]] },
  drowned_hand:{ n: '가라앉은 손', hp: 260, dmg: 46, def: 18, spd: 88, ai: 'swimmer', w: 24, h: 32, c: '#6a7a86', xp: 120, gold: 62, aggro: 340,
                drops: [['bone_frag', .7, 2, 4], ['lost_lamp', .3, 1, 1], ['soul_shard', .25, 1, 2]] },
  /* --- 5단계: 붉은 달 전용 (이벤트 중에만 나온다) ---
     예전 수치(hp260/dmg52·hp210/dmg46)는 사실 같은 자리의 평범한 잡몹(가라앉은 손 등)과
     별 차이가 없어서, 처치 보상만 2.2배(EVENTS.bloodmoon.rw)일 뿐 몸으로 느끼는 위협은
     "레드문 전용"이라는 이름값을 못 했다. 눈에 띄게 세게 올렸다. */
  crimson_howler: { n: '붉은 울음', hp: 450, dmg: 78, def: 22, spd: 128, ai: 'walker', w: 26, h: 40, c: '#c03a3a', xp: 220, gold: 130, aggro: 700,
                drops: [['bone_frag', .8, 2, 5], ['soul_shard', .3, 1, 2], ['potion_hp', .2, 1, 2]] },
  crimson_eye:{ n: '붉은 눈', hp: 380, dmg: 70, def: 18, spd: 112, ai: 'flyer', w: 28, h: 28, c: '#e0503c', xp: 200, gold: 120, aggro: 760,
                drops: [['corrupt_ess', .6, 1, 3], ['soul_shard', .35, 1, 2]] },

  /* --- 6단계: 유적 미니보스 ---
     스토리 보스와 달리 제단이 아니라 방에 들어서면 깨어난다. 보스 바와 보스 브금은 함께 쓴다. */
  /* 여섯의 세기를 RUIN_SPEC의 rank(1~6)에 맞춰 계단식으로 벌렸다. 예전에는 2600~3600으로
     거의 평평해서, 어느 유적을 먼저 들어가든 체감이 같고 순서를 고를 이유가 없었다.
     이제 갱도(rank 1)와 부패(rank 6)가 체력 4배 · 공격력 3배 가까이 차이 난다. */
  /* rank 1 — 베이스캠프 옆. 처음 잡아 보는 미니보스 */
  mine_horror:  { n: '갱도의 것', hp: 1900, dmg: 42, def: 16, spd: 96, ai: 'b_slime', w: 52, h: 44, c: '#6a5a4a', xp: 1500, gold: 620, boss: 1,
                 drops: [['rust_gear', 1, 2, 3], ['iron_ore', 1, 20, 30], ['lost_lamp', 1, 1, 2]] },
  /* rank 2 */
  ice_warden:   { n: '얼음 감시자', hp: 2800, dmg: 56, def: 24, spd: 74, ai: 'b_witch', w: 40, h: 54, c: '#9fd8f0', xp: 2300, gold: 950, boss: 1,
                 drops: [['frozen_core', 1, 2, 3], ['frost_core', 1, 8, 14], ['ice_shard', 1, 20, 30]] },
  /* rank 3 */
  vine_lord:    { n: '덩굴 군주', hp: 4100, dmg: 74, def: 34, spd: 80, ai: 'b_bone', w: 44, h: 58, c: '#3f7a34', xp: 3400, gold: 1500, boss: 1,
                 drops: [['heartwood', 1, 2, 3], ['vine_coil', 1, 12, 20], ['orchid', 1, 8, 14]] },
  /* rank 4 — 함정이 가장 촘촘한 유적의 주인 */
  sand_guardian:{ n: '모래 파수꾼', hp: 5600, dmg: 92, def: 46, spd: 66, ai: 'b_bone', w: 46, h: 60, c: '#d8b878', xp: 4800, gold: 2100, boss: 1,
                 drops: [['sun_disc', 1, 2, 3], ['gold_ore', 1, 15, 25], ['venom_sting', 1, 6, 10]] },
  /* rank 5 — 입구가 없는 굴. 도망칠 길이 없다 */
  spore_queen:  { n: '포자 여왕', hp: 7200, dmg: 110, def: 42, spd: 92, ai: 'b_heart', w: 46, h: 46, c: '#6fe0c0', xp: 6400, gold: 2800, boss: 1,
                 drops: [['queen_spore', 1, 2, 3], ['spore_sac', 1, 12, 20], ['glowcap', 1, 15, 25]] },
  /* rank 6 — 동쪽 끝, 가장 깊은 곳 */
  blight_maw:   { n: '부패한 아가리', hp: 9400, dmg: 132, def: 58, spd: 88, ai: 'b_heart', w: 50, h: 50, c: '#7a3f9c', xp: 9000, gold: 4000, boss: 1,
                 drops: [['blight_bile', 1, 2, 3], ['corrupt_ess', 1, 15, 25], ['ebon_chunk', 1, 10, 18]] },

  /* --- 7단계: 폭주로 ---
     공창이 스스로 불려 낸 것들. 사람이 설계한 흔적이 점점 옅어진다 */
  splitter:   { n: '증식 기계', hp: 1500, dmg: 84, def: 40, spd: 84, ai: 'walker', w: 28, h: 34, c: '#8a7a6a', xp: 2600, gold: 520, aggro: 520,
                drops: [['core_shard', .8, 1, 3], ['steel_plate', .7, 3, 7], ['gear_basic', .5, 2, 5], ['orb_core', .02, 1, 1]] },
  weldarm:    { n: '용접 팔', hp: 1800, dmg: 92, def: 46, spd: 64, ai: 'archer', w: 26, h: 44, c: '#c8763a', xp: 2900, gold: 600, aggro: 640, proj: 'fire',
                drops: [['core_shard', .8, 1, 3], ['conduit_part', .6, 2, 4], ['refined_oil', .4, 2, 5]] },
  coreling:   { n: '노심 파편체', hp: 1200, dmg: 76, def: 26, spd: 176, ai: 'flyer', w: 20, h: 20, c: '#e8b04a', xp: 2400, gold: 480, aggro: 620,
                drops: [['core_shard', 1, 2, 4], ['power_core', .5, 1, 2], ['orb_core', .025, 1, 1]] },

  /* --- 보스 --- */
  king_slime:  { n: '슬라임 왕', hp: 900, dmg: 24, def: 6, spd: 60, ai: 'b_slime', w: 82, h: 62, c: '#4f7fc0', xp: 420, gold: 200, boss: 1,
                 drops: [['slime_gel', 1, 25, 40], ['ring_vigor', 1, 1, 1], ['star_heart', 1, 1, 1], ['sword_copper', .5, 1, 1]] },
  bone_lord:   { n: '뼈의 군주', hp: 2000, dmg: 36, def: 14, spd: 70, ai: 'b_bone', w: 56, h: 74, c: '#ded6bd', xp: 900, gold: 480, boss: 1,
                 drops: [['bone_frag', 1, 30, 45], ['sword_bone', 1, 1, 1], ['star_heart', 1, 1, 1], ['pick_iron', .6, 1, 1]] },
  corrupt_heart:{ n: '부패의 심장', hp: 3600, dmg: 48, def: 18, spd: 105, ai: 'b_heart', w: 62, h: 62, c: '#7a3f9c', xp: 1700, gold: 900, boss: 1,
                 drops: [['corrupt_ess', 1, 30, 50], ['charm_leech', 1, 1, 1], ['star_heart', 1, 1, 1], ['mythril_ore', 1, 12, 20]] },
  frost_witch: { n: '서리 마녀 실비아', hp: 5600, dmg: 62, def: 24, spd: 90, ai: 'b_witch', w: 34, h: 56, c: '#a8dcf0', xp: 3000, gold: 1600, boss: 1,
                 drops: [['frost_core', 1, 25, 40], ['staff_frost', 1, 1, 1], ['star_heart', 1, 1, 1], ['amul_swift', 1, 1, 1]] },
  void_king:   { n: '공허의 왕', hp: 12000, dmg: 82, def: 32, spd: 110, ai: 'b_void', w: 74, h: 92, c: '#5e3fa8', xp: 9000, gold: 5000, boss: 1,
                 drops: [['void_frag', 1, 30, 50], ['charm_star', 1, 1, 1], ['star_heart', 1, 1, 1]] },

  storm_warden: { n: '폭풍의 수호자', hp: 13000, dmg: 96, def: 38, spd: 150, ai: 'b_storm', w: 66, h: 70, c: '#bcd8f0', xp: 16000, gold: 8000, boss: 1,
                 drops: [['sky_feather', 1, 30, 50], ['aether_shard', 1, 20, 35], ['charm_feather', 1, 1, 1], ['star_heart', 1, 1, 1]] },
  first_keeper: { n: '최초의 파수꾼', hp: 20000, dmg: 120, def: 52, spd: 96, ai: 'b_keeper', w: 70, h: 88, c: '#c8b98a', xp: 40000, gold: 20000, boss: 1,
                 minion: 'ruin_guard',
                 drops: [['aether_shard', 1, 40, 60], ['ruin_brick', 1, 40, 70], ['charm_rune', 1, 1, 1], ['star_heart', 1, 2, 2]] },

  /* 종장 — 별이 도망쳐 온 그것 */
  pursuer:      { n: '별을 쫓아온 것', hp: 42000, dmg: 165, def: 68, spd: 128, ai: 'b_pursuer', w: 96, h: 104, c: '#2a2036', xp: 120000, gold: 60000, boss: 1,
                 minion: 'wraith', aggro: 4000,
                 drops: [['void_frag', 1, 60, 90], ['star_heart', 1, 3, 3], ['charm_dawn', 1, 1, 1], ['scythe_void', 1, 1, 1]] },

  /* 7단계 보스 */
  proliferator: { n: '증식체', hp: 46000, dmg: 150, def: 62, spd: 112, ai: 'b_prolif', w: 88, h: 72, c: '#9a8a76', boss: 1,
                 xp: 150000, gold: 70000, minion: 'splitter',
                 drops: [['core_shard', 1, 40, 60], ['machine_frame', 1, 6, 10], ['power_core', 1, 25, 40]] },
  hepha:        { n: '헤파 · 최초의 기계', hp: 72000, dmg: 190, def: 80, spd: 120, ai: 'b_hepha', w: 92, h: 110, c: '#c8a05a', boss: 1,
                 xp: 400000, gold: 180000, minion: 'coreling', aggro: 4000,
                 drops: [['hepha_heart', 1, 1, 1], ['core_shard', 1, 60, 90], ['aether_shard', 1, 30, 45]] },

  /* 세션 2 — 지하 공창의 관리자 */
  overseer:     { n: '공창의 관리자', hp: 30000, dmg: 140, def: 60, spd: 104, ai: 'b_overseer', w: 74, h: 92, c: '#8a8a96', xp: 90000, gold: 44000, boss: 1,
                 minion: 'riveter',
                 drops: [['steel_plate', 1, 60, 90], ['power_core', 1, 20, 30], ['blueprint_core', 1, 1, 1], ['pick_drill', 1, 1, 1]] },

  /* --- 세션 2 종장: 설계실 ---
     끝까지 조립되지 못한 것들. 공격적이라기보다 "하던 일을 계속 하려는" 것들이라
     플레이어를 밀어내는 쪽에 가깝다. */
  draft_form:   { n: '미완의 형상', hp: 1600, dmg: 96, def: 52, spd: 82, ai: 'walker', w: 26, h: 44, c: '#cfc7b8', xp: 3200, gold: 700, aggro: 520,
                 drops: [['proto_ash', 1, 2, 5], ['draft_glass', .5, 1, 3]] },
  scribe_hand:  { n: '기록하는 손', hp: 1300, dmg: 88, def: 34, spd: 150, ai: 'caster', w: 24, h: 30, c: '#8fd8e8', xp: 3000, gold: 660, aggro: 620, range: 360, proj: 'rune',
                 drops: [['draft_glass', 1, 2, 4], ['proto_ash', .5, 1, 2], ['aether_shard', .3, 1, 3]] },
  mold_walker:  { n: '거푸집 보행체', hp: 2400, dmg: 110, def: 66, spd: 62, ai: 'walker', w: 34, h: 50, c: '#b8a878', xp: 3800, gold: 820, aggro: 440,
                 drops: [['archestone', 1, 4, 9], ['proto_ash', .6, 2, 4], ['draft_glass', .4, 1, 2]] },

  /* 세션 2 최종 — 사람을 본떠 만든 첫 번째 것 */
  archetype:    { n: '원형 · 첫 번째 설계', hp: 105000, dmg: 215, def: 92, spd: 126, ai: 'b_arche', w: 96, h: 116, c: '#e8dcc0', boss: 1,
                 xp: 900000, gold: 400000, minion: 'draft_form', aggro: 4000,
                 drops: [['arche_core', 1, 1, 1], ['draft_glass', 1, 40, 60], ['archestone', 1, 30, 50]] },

  /* --- 특별 유적 ① 부유 성채 (하늘) --- */
  orbit_sentry: { n: '궤도 파수병', hp: 3200, dmg: 128, def: 74, spd: 112, ai: 'caster', w: 28, h: 40, c: '#8fa8c8', xp: 5200, gold: 1200, range: 380, proj: 'star', aggro: 640,
                 drops: [['orbit_plate', 1, 3, 8], ['orbit_gear', .5, 1, 2], ['aether_shard', .4, 2, 5]] },
  meridian_eye: { n: '자오선의 눈', hp: 2600, dmg: 116, def: 44, spd: 186, ai: 'flyer', w: 26, h: 26, c: '#7fe0ff', xp: 4800, gold: 1100, aggro: 720,
                 drops: [['void_lens', .25, 1, 1], ['orbit_gear', .6, 1, 3], ['sky_feather', .7, 2, 5]] },
  ballast_form: { n: '평형추', hp: 5200, dmg: 152, def: 96, spd: 54, ai: 'walker', w: 38, h: 54, c: '#5a6a80', xp: 6400, gold: 1500, aggro: 460,
                 drops: [['orbit_plate', 1, 6, 12], ['star_ash', .3, 1, 2], ['orbit_gear', .5, 2, 4]] },

  /* 부유 성채의 주인 — 지금까지 나온 무엇보다 세다.
     기반암과 제단만 빼고 발밑을 계속 부순다(b_restorer). 하늘 위라 떨어지면 그대로 끝이다. */
  restorer:     { n: '환원기 · 되돌리려는 것', hp: 320000, dmg: 340, def: 130, spd: 132, ai: 'b_restorer', w: 118, h: 132, c: '#a8c8e8', boss: 1,
                 xp: 2600000, gold: 1200000, minion: 'orbit_sentry', aggro: 5000,
                 drops: [['star_ash', 1, 4, 6], ['orbit_gear', 1, 40, 60], ['void_lens', 1, 2, 3], ['lance_orbit', 1, 1, 1]] },

  /* --- 특별 유적 ② 무너진 갱 (최심부) --- */
  gloom_crawler:{ n: '어둠을 기는 것', hp: 2800, dmg: 118, def: 56, spd: 128, ai: 'walker', w: 30, h: 24, c: '#2e2a26', xp: 4200, gold: 900, aggro: 560,
                 drops: [['deep_alloy', 1, 2, 5], ['gloom_pearl', .2, 1, 1], ['bone_frag', .6, 3, 7]] },
  damp_wisp:    { n: '가스 도깨비불', hp: 1800, dmg: 104, def: 28, spd: 158, ai: 'flyer', w: 22, h: 22, c: '#8aa05a', xp: 3800, gold: 820, aggro: 620,
                 drops: [['deep_alloy', .6, 1, 3], ['hell_ore', .5, 3, 8]] },
  lost_miner:   { n: '올라오지 못한 사람', hp: 4200, dmg: 136, def: 68, spd: 88, ai: 'walker', w: 22, h: 42, c: '#7a6a58', xp: 5600, gold: 1300, aggro: 600,
                 drops: [['miner_tag', .5, 1, 1], ['deep_alloy', 1, 3, 7], ['lost_lamp', .35, 1, 2]] },

  /* 무너진 갱의 주인 — 스토리와 무관한 순수 탐험 보상 */
  shaft_maw:    { n: '갱을 메운 것', hp: 88000, dmg: 244, def: 112, spd: 74, ai: 'b_heart', w: 92, h: 84, c: '#3a342c', boss: 1,
                 xp: 620000, gold: 300000, minion: 'gloom_crawler', aggro: 3600,
                 drops: [['gloom_pearl', 1, 3, 4], ['deep_alloy', 1, 40, 60], ['miner_tag', 1, 2, 3], ['hammer_cave', 1, 1, 1]] }
};

/* ---------------- 스킬 / 특성 ----------------
   v1.1 — 표 나열에서 **트리**로 바뀌었다.

   예전에는 분기마다 여섯 줄이 위아래로 놓여 있고, 티어 요구 포인트만 지키면
   어느 줄이든 마음대로 찍을 수 있었다. 목록이지 트리가 아니었다. 이제 각 칸은
   자리(tier·col)와 **이어진 윗칸(req)** 을 가진다. 윗칸 중 하나라도 배워야
   아래가 열리므로, 어느 길로 내려갈지가 실제 선택이 된다.

   칸 뜻
     tier  0~3 (위에서 아래로). TIER_REQ 만큼 그 분기에 포인트가 쌓여야 열린다
     col   0~2 (왼쪽에서 오른쪽). .5 는 두 칸 사이 — 트리 모양을 잡는 값이다
     req   이어진 윗칸들. **하나라도** 배웠으면 열린다(전부가 아니다)
     max   최대 랭크 · type active(슬롯 등록) / passive(즉시 적용)

   ★ 요구 포인트를 줄였다 — TIER_REQ 3/7/12 -> 2/5/8, 오래 걸리던 몇 칸은
     최대 랭크도 한 단계 낮췄다. 레벨당 특성 포인트도 2레벨에 1 -> 1레벨에 1로
     올렸다(entity.js addXp). 칸이 열둘 늘었으니 그만큼 손에 쥐는 것도 늘어야
     "골라서 찍는" 맛이 산다. */
const SKILLS = {
  /* ===== 검투사 — 붙어서 버티고 밀어붙인다 ===== */
  s_cleave:   { n: '광폭 베기', i: '🌀', br: 'blade', tier: 0, col: 0.5, max: 3, type: 'active', mana: 12, cd: 6,
                d: '주변을 원형으로 베어 무기 피해의 %d%%를 준다.', v: r => 130 + r * 45 },
  s_toughen:  { n: '단련된 몸', i: '🛡', br: 'blade', tier: 0, col: 1.5, max: 4, type: 'passive',
                d: '최대 체력 +%d, 방어 +%d.', b: r => ({ hp: r * 22, def: r * 3 }) },

  s_charge:   { n: '돌진 강타', i: '💥', br: 'blade', tier: 1, col: 0, max: 3, type: 'active', mana: 18, cd: 9,
                req: ['s_cleave'],
                d: '앞으로 돌진하며 부딪힌 적에게 무기 피해의 %d%%와 강한 넉백.', v: r => 180 + r * 70 },
  s_bloodlust:{ n: '피의 갈망', i: '🩸', br: 'blade', tier: 1, col: 1, max: 3, type: 'passive',
                req: ['s_cleave', 's_toughen'],
                d: '흡혈 +%d%%, 힘 +%d.', b: r => ({ lifesteal: r * 2, str: r * 3 }) },
  s_guard:    { n: '철벽', i: '🧱', br: 'blade', tier: 1, col: 2, max: 3, type: 'active', mana: 16, cd: 20,
                req: ['s_toughen'],
                d: '%d초간 받는 피해를 55%% 줄이고 넉백을 무시한다.', v: r => 2 + r },

  s_whirl:    { n: '회오리 검무', i: '🌪', br: 'blade', tier: 2, col: 0, max: 3, type: 'active', mana: 35, cd: 18,
                req: ['s_charge'],
                d: '2.5초간 회전하며 초당 무기 피해의 %d%%를 준다.', v: r => 90 + r * 35 },
  s_quake:    { n: '대지 가르기', i: '⛰', br: 'blade', tier: 2, col: 1, max: 3, type: 'active', mana: 28, cd: 13,
                req: ['s_charge', 's_bloodlust'],
                d: '땅을 내리쳐 좌우로 충격파를 보낸다. 무기 피해의 %d%%와 2초 둔화.', v: r => 150 + r * 60 },
  s_warcry:   { n: '전투 함성', i: '📢', br: 'blade', tier: 2, col: 2, max: 3, type: 'active', mana: 22, cd: 26,
                req: ['s_guard', 's_bloodlust'],
                d: '%d초간 분노와 무쇠 피부를 얻고 주변 적을 밀쳐 낸다.', v: r => 8 + r * 4 },

  s_titan:    { n: '거인의 유산', i: '🗿', br: 'blade', tier: 3, col: 0.5, max: 1, type: 'passive',
                req: ['s_whirl', 's_quake'],
                d: '체력이 50% 이하일 때 피해 +35%, 방어 +15.', b: () => ({}) },
  s_undying:  { n: '불굴', i: '💗', br: 'blade', tier: 3, col: 1.5, max: 1, type: 'passive',
                req: ['s_quake', 's_warcry'],
                d: '치명상을 입어도 체력 1로 버티고 최대 체력의 25%를 되찾는다. 120초에 한 번.', b: () => ({}) },

  /* ===== 유격 — 거리를 두고 급소를 노린다 ===== */
  s_dash:     { n: '그림자 걸음', i: '💨', br: 'ranger', tier: 0, col: 0.5, max: 3, type: 'passive',
                d: '대시 재사용 -%d초, 무적 시간 +%dms.', b: r => ({ dashCd: r * 0.25, dashI: r * 40 }) },
  s_eagle:    { n: '매의 눈', i: '🎯', br: 'ranger', tier: 0, col: 1.5, max: 4, type: 'passive',
                d: '치명타 확률 +%d%%, 민첩 +%d.', b: r => ({ crit: r * 3, dex: r * 2 }) },

  s_volley:   { n: '화살 세례', i: '🏹', br: 'ranger', tier: 1, col: 0, max: 3, type: 'active', mana: 20, cd: 10,
                req: ['s_dash'],
                d: '부채꼴로 %d발을 발사한다. 발당 무기 피해의 70%%.', v: r => 4 + r * 2 },
  s_swift:    { n: '질풍 보행', i: '🍃', br: 'ranger', tier: 1, col: 1, max: 3, type: 'passive',
                req: ['s_dash', 's_eagle'],
                d: '이동 속도 +%d%%, 공격 속도 +%d%%.', b: r => ({ ms: r * 6, spdP: r * 0.05 }) },
  s_pierce:   { n: '꿰뚫는 화살', i: '➶', br: 'ranger', tier: 1, col: 2, max: 3, type: 'active', mana: 16, cd: 7,
                req: ['s_eagle'],
                d: '적을 관통하는 화살을 쏜다. 무기 피해의 %d%%.', v: r => 170 + r * 60 },

  s_rain:     { n: '유성 화살비', i: '☄', br: 'ranger', tier: 2, col: 0, max: 3, type: 'active', mana: 40, cd: 22,
                req: ['s_volley'],
                d: '지정 지점에 %d발의 화살을 떨어뜨린다.', v: r => 10 + r * 5 },
  s_smoke:    { n: '연막탄', i: '🌫', br: 'ranger', tier: 2, col: 1, max: 3, type: 'active', mana: 18, cd: 16,
                req: ['s_volley', 's_swift'],
                d: '연막을 터뜨려 잠깐 무적이 되고 %d초간 이동이 빨라진다. 주변 적은 둔해진다.', v: r => 3 + r * 2 },
  s_mark:     { n: '사냥꾼의 표식', i: '🔻', br: 'ranger', tier: 2, col: 2, max: 3, type: 'active', mana: 12, cd: 12,
                req: ['s_pierce', 's_swift'],
                d: '겨눈 적에게 표식을 남겨 10초간 그 적이 받는 피해 +%d%%.', v: r => 12 + r * 8 },

  s_hunter:   { n: '완벽한 사냥꾼', i: '👁', br: 'ranger', tier: 3, col: 0.5, max: 1, type: 'passive',
                req: ['s_rain', 's_smoke'],
                d: '치명타 피해 +80%, 처치 시 3초간 이동 속도 +30%.', b: () => ({ critD: 80 }) },
  s_tempest:  { n: '폭풍의 시위', i: '🌬', br: 'ranger', tier: 3, col: 1.5, max: 1, type: 'passive',
                req: ['s_smoke', 's_mark'],
                d: '원거리 공격이 30% 확률로 화살을 한 발 더 날린다.', b: () => ({}) },

  /* ===== 비전 — 재고 얼리고 불러낸다 ===== */
  s_fireball: { n: '화염구', i: '🔥', br: 'arcane', tier: 0, col: 0.5, max: 4, type: 'active', mana: 14, cd: 4,
                d: '폭발하는 불덩이. 피해 %d + 지능 계수.', v: r => 30 + r * 22 },
  s_wisdom:   { n: '심연의 지혜', i: '📖', br: 'arcane', tier: 0, col: 1.5, max: 4, type: 'passive',
                d: '최대 마나 +%d, 지능 +%d, 마나 재생 +%d%%.', b: r => ({ mp: r * 18, int: r * 2, mpreg: r * 14 }) },

  s_nova:     { n: '서리 결계', i: '❄', br: 'arcane', tier: 1, col: 0, max: 3, type: 'active', mana: 30, cd: 14,
                req: ['s_fireball'],
                d: '주변 적을 얼려 3초간 둔화시키고 %d 피해.', v: r => 40 + r * 30 },
  s_heal:     { n: '치유의 빛', i: '✨', br: 'arcane', tier: 1, col: 1, max: 3, type: 'active', mana: 28, cd: 16,
                req: ['s_fireball', 's_wisdom'],
                d: '즉시 체력 %d%%를 회복하고 5초간 재생.', v: r => 14 + r * 9 },
  s_barrier:  { n: '비전 방벽', i: '🔷', br: 'arcane', tier: 1, col: 2, max: 3, type: 'active', mana: 22, cd: 18,
                req: ['s_wisdom'],
                d: '피해를 %d까지 막아 내는 방벽을 두른다(지능 비례). 20초간.', v: r => 60 + r * 70 },

  s_wolf:     { n: '영혼 늑대 소환', i: '🐺', br: 'arcane', tier: 2, col: 0, max: 3, type: 'active', mana: 45, cd: 30,
                req: ['s_nova'],
                d: '30초간 싸우는 늑대 %d마리를 부른다.', v: r => r },
  s_chain:    { n: '사슬 번개', i: '⚡', br: 'arcane', tier: 2, col: 1, max: 3, type: 'active', mana: 30, cd: 11,
                req: ['s_nova', 's_heal'],
                d: '번개가 적 %d명까지 튀며 갈수록 옅어진다.', v: r => 2 + r },
  s_blink:    { n: '차원 도약', i: '🌀', br: 'arcane', tier: 2, col: 2, max: 2, type: 'active', mana: 14, cd: 9,
                req: ['s_barrier', 's_heal'],
                d: '겨눈 쪽으로 순간 이동하고 떠난 자리에 %d 피해를 남긴다.', v: r => 40 + r * 40 },

  s_arch:     { n: '대마법사의 각인', i: '🔯', br: 'arcane', tier: 3, col: 0.5, max: 1, type: 'passive',
                req: ['s_wolf', 's_chain'],
                d: '모든 스킬 재사용 대기 -20%, 마법 피해 +30%.', b: () => ({ cdr: 20, magicP: 30 }) },
  s_meteor:   { n: '별의 낙하', i: '🌠', br: 'arcane', tier: 3, col: 1.5, max: 1, type: 'active', mana: 60, cd: 45,
                req: ['s_chain', 's_blink'],
                d: '겨눈 자리에 별을 떨어뜨린다. 넓은 범위에 큰 피해와 화상.', v: () => 0 }
};

const BRANCHES = [
  { id: 'blade', n: '검투사', tag: '근접 · 생존 · 압박', c: '#c8433c',
    nodes: ['s_cleave', 's_toughen', 's_charge', 's_bloodlust', 's_guard', 's_whirl', 's_quake', 's_warcry', 's_titan', 's_undying'] },
  { id: 'ranger', n: '유격', tag: '원거리 · 기동 · 치명타', c: '#5fc45f',
    nodes: ['s_dash', 's_eagle', 's_volley', 's_swift', 's_pierce', 's_rain', 's_smoke', 's_mark', 's_hunter', 's_tempest'] },
  { id: 'arcane', n: '비전', tag: '마법 · 제어 · 소환', c: '#4f9cf0',
    nodes: ['s_fireball', 's_wisdom', 's_nova', 's_heal', 's_barrier', 's_wolf', 's_chain', 's_blink', 's_arch', 's_meteor'] }
];

/* 특성 티어 해금에 필요한 해당 분기 누적 포인트 (v1.1: 3/7/12 -> 2/5/8) */
const TIER_REQ = [0, 2, 5, 8];

/* ---------------- 생활 숙련 ----------------
   전투 특성과 같은 팝업의 다른 갈래다. 포인트로 찍는 것이 아니라 **하다 보면 는다** —
   밭에서 거두면 농사가, 물고기를 낚으면 낚시가 오른다. 그래서 요구치를 스스로
   고를 필요가 없고, 대신 레벨마다 하는 일 자체가 조금씩 수월해진다.

   lin  레벨에 비례해 계속 붙는 몫(레벨 1은 0 — 시작은 예전과 똑같다)
   perk 특정 레벨에서 한 번 열리는 것. 숫자가 아니라 규칙이 바뀐다 */
const PROF_MAX = 10;
const PROFS = {
  farm: {
    n: '농사', i: '🌾', c: '#8fc85a',
    line: '갈고, 심고, 거둔다. 다 여문 칸을 거둘 때마다 는다.',
    lin: [
      ['성장 속도', lv => Math.round((lv - 1) * 7) + '%'],
      ['수확량 증가 확률', lv => Math.round((lv - 1) * 5) + '%'],
      ['씨앗 회수', lv => Math.round((lv - 1) * 4) + '%']
    ],
    perks: [
      [3, '고른 씨앗', '거둘 때 씨앗을 반드시 하나 이상 돌려받는다.'],
      [6, '두 손 가득', '25% 확률로 수확물이 두 배가 된다.'],
      [10, '풍요의 손', '거둔 자리에 씨앗이 저절로 다시 심긴다.']
    ]
  },
  fish: {
    n: '낚시', i: '🎣', c: '#7fc8e8',
    line: '물가에 앉아 기다린 시간만큼 는다. 무엇이든 낚아 올리면 오른다.',
    lin: [
      ['입질 대기 감소', lv => Math.round((lv - 1) * 4) + '%'],
      ['상위 어종 확률', lv => '+' + Math.round((lv - 1) * 2) + '%'],
      ['잡것이 걸릴 확률', lv => '+' + ((lv - 1) * 1.5).toFixed(1) + '%']
    ],
    perks: [
      [3, '가벼운 손목', '입질을 챌 수 있는 시간이 1.6초로 늘어난다.'],
      [6, '깊은 눈', '심해어가 걸릴 확률이 크게 오른다.'],
      [10, '물때를 안다', '25% 확률로 한 마리를 더 낚는다.']
    ]
  }
};

/** 숙련 lv -> 다음 레벨까지 필요한 경험치. 10레벨이 끝이다.
    1->10 을 다 채우는 데 480 남짓 — 밭 한 뙈기를 몇 번 돌리거나, 물가에 한참
    앉아 있으면 닿는 양이다. 처음에 훨씬 가파르게 잡았다가(1300) 낚시가
    한 시간짜리 노동이 되어 버려서 낮췄다. */
function profNeed(lv) { return Math.round(5 * Math.pow(lv, 1.45)); }

/* 장의 결착이 되는 보스들. 이 목록에 있으면 scale() 을 타지 않고 표에 적힌 수치를
   그대로 쓴다(game.js spawnBoss) — 언제 오든 같은 싸움이어야 페이즈 설계가 선다. */
const STORY_BOSSES = {
  king_slime: 1, bone_lord: 1, corrupt_heart: 1, frost_witch: 1, void_king: 1,
  storm_warden: 1, first_keeper: 1, pursuer: 1,
  overseer: 1, proliferator: 1, hepha: 1, archetype: 1
};

/* ---------------- 보스 페이즈 대사 ----------------
   페이즈가 넘어가는 순간 한 줄만 뜬다. 규칙이 바뀌는 이유를 말로 붙여 두면
   "체력이 줄었다"가 아니라 "저것이 태도를 바꿨다"로 읽힌다. */
const BOSS_LINES = {
  king_slime:   { 1: '갈라져도 갈라져도, 아직 혼자다.', 2: '껍데기가 굳는다 — 안쪽이 뛴다.' },
  bone_lord:    { 1: '뼈가 일어선다.', 2: '기둥이 저를 대신 든다.' },
  corrupt_heart:{ 1: '뿌리가 바닥을 짚는다.', 2: '제단만이 아직 뛰고 있다.' },
  frost_witch:  { 1: '실비아: "…아직도 따뜻하구나."', 2: '실비아: "불 옆에 서. 거기 말고는 없어."' },
  void_king:    { 1: '나선이 되감긴다.', 2: '공허가 방향을 바꾼다.' },
  storm_warden: { 1: '구름이 낮아진다.', 2: '내리꽂을 때만, 닿는다.' },
  first_keeper: { 1: '석판 하나가 꺼진다.', 2: '꺼진 쪽이 무르다.' },
  pursuer:      { 1: '형태가 무너지고 다시 선다.', 2: '한 줄기 길만 비어 있다.' },
  overseer:     { 1: '관리자: "공정 재개."', 2: '관리자: "…명령이 남아 있다."' },
  proliferator: { 1: '하나가 둘이 되는 것을 멈추지 못한다.', 2: '껍데기가 닫힌다 — 갈라진 것부터.' },
  hepha:        { 1: '헤파: "나는 아직 만드는 중이다."', 2: '헤파: "때려서는 안 멈춘다. 알잖아."' },
  archetype:    { 1: '원형이 자세를 고친다.', 2: '받침대 넷이 그것을 붙들고 있다.' }
};

/* ---------------- 버프 ---------------- */
const BUFFS = {
  rage: { n: '분노', i: '😤', dur: 180, b: { dmgP: 0.20 } },
  rage_greater: { n: '상급 분노', i: '😤', dur: 240, b: { dmgP: 0.32 } },
  iron: { n: '무쇠 피부', i: '🪨', dur: 180, b: { def: 12 } },
  iron_greater: { n: '상급 무쇠 피부', i: '🪨', dur: 240, b: { def: 22 } },
  well: { n: '포만감', i: '🍲', dur: 240, b: { hpreg: 1.2 } },
  frostbite: { n: '동상', i: '🥶', dur: 3, debuff: 1 },
  burn: { n: '화상', i: '🔥', dur: 4, debuff: 1 },
  swift_kill: { n: '추격', i: '💨', dur: 3, b: { ms: 30 } },
  /* 특성으로만 붙는 것들 — 지속 시간은 스킬 랭크가 정하므로 여기 dur 은 기본값일 뿐이다 */
  bulwark: { n: '철벽', i: '🧱', dur: 3, b: { dr: 55 } },
  smokescreen: { n: '연막', i: '🌫', dur: 5, b: { ms: 34 } },
  warcry: { n: '전투 함성', i: '📢', dur: 12, b: { dmgP: 0.18, def: 14, str: 5 } },
  /* 여명 마을 분수대에 금화를 던지면 붙는다. 여관(유료·시간 경과·전체 회복)과 겹치지
     않게 회복은 일부러 넣지 않았다 — 이쪽은 "운을 산다"는 쪽이다. */
  wish: { n: '분수의 축복', i: '🪙', dur: 420, b: { allStat: 3, crit: 5 } },
  rested: { n: '잘 쉼', i: '🛏', dur: 600, b: { allStat: 4, hpreg: 1.5, mpreg: 20 } },
  /* 유적의 신비한 방에서만 붙는다. 한 세계에 두세 곳뿐이라 세게 잡았다 */
  starlit: { n: '별빛', i: '✨', dur: 480, b: { allStat: 6, crit: 8, ms: 10 } },
  echoed: { n: '메아리', i: '🌀', dur: 480, b: { cdr: 14, mpreg: 24, int: 6 } },
  weighed: { n: '저울에 오름', i: '⚖', dur: 480, b: { dmgP: 0.22, def: 14 } },
  /* 음식 버프 — 앞에 fed_ 가 붙은 것은 한 번에 하나만 유지된다.
     여러 개를 겹쳐 두면 요리를 고를 이유가 없어지기 때문이다. */
  fed_bread: { n: '갓 구운 빵', i: '🍞', dur: 300, b: { hpreg: 1.8, vit: 4 } },
  fed_pie: { n: '고기 파이', i: '🥧', dur: 300, b: { str: 7, dmgP: 0.10 } },
  fed_stew: { n: '버섯 스튜', i: '🍲', dur: 300, b: { mpreg: 40, int: 6 } },
  fed_soup: { n: '별무 수프', i: '🥣', dur: 300, b: { def: 16, hp: 45 } },
  fed_tea: { n: '들꽃차', i: '🍵', dur: 300, b: { cdr: 10, mp: 35 } },
  fed_jelly: { n: '선인장 젤리', i: '🍮', dur: 300, b: { ms: 16, dex: 6 } },
  fed_feast: { n: '잔칫상', i: '🍱', dur: 600, b: { allStat: 8, hpreg: 2, mpreg: 25, def: 10 } },
  fed_curry: { n: '정글 카레', i: '🍛', dur: 300, b: { str: 6, def: 8, hpreg: 1.2 } },
  lit: { n: '발광', i: '🔦', dur: 480, b: {} },
  lit_greater: { n: '상급 발광', i: '🔦', dur: 900, b: {} },
  /* 물에서만 나오는 것 둘이 주는 버프. fed_ 를 안 붙였으므로 음식과 같이 유지된다 —
     낚시로만 얻는 것이라 음식 한 자리를 빼앗지 않는 편이 낫다. */
  lantern: { n: '등불', i: '🏮', dur: 420, b: { vit: 5, hpreg: 1.2 } },
  coolant: { n: '냉각', i: '🧴', dur: 360, b: { cdr: 12, ms: 10, mpreg: 20 } }
};

/* ---------------- 바이옴 유적 ----------------
   스토리와 무관한 순수 탐험 콘텐츠다. 전부 같은 BSP 방 생성기를 쓰고,
   벽재·함정·잡몹·미니보스만 갈아 끼운다.
   x는 세계 좌표, y는 방 묶음의 위쪽 깊이. */
/* traps 값은 기계 키가 아니라 타일 함정 종류다 — 'dart'(화살 구멍) · 'vent'(불길 분출구) ·
   'crumble'(부서지는 바닥). 세션 1의 유적은 기계 문명 이전이라 기계 체계를 쓰지 않는다. */
/* 난이도 등급(rank) — 유적마다 개별로 매겼다. 정글의 '뿌리 신전'은 v1.0.3에서 뺐다
   (세션 1 유적 밀도를 낮추려고 — 자세한 사정은 world.js의 심층 봉인실 이전 메모 참고) —
   그래서 rank 3은 이제 빈 번호다. rank 자체는 코드에서 등급을 매기는 값일 뿐 순서
   목록으로 쓰이지 않아 번호를 당겨 채울 필요는 없다.
   기준은 "플레이어가 실제로 언제 여기 닿는가"다. 베이스캠프(x≈1050)에서의 거리와 깊이가
   그대로 순서가 된다: 광산(바로 옆) → 얼음(서쪽) → 피라미드(사막) →
   포자(버섯 골짜기) → 부패(동쪽 끝). 예전에는 다섯이 전부 비슷한 세기라, 어디를 먼저
   들어가든 체감이 똑같고 순서를 고를 이유도 없었다.

   rank가 조종하는 것 — 미니보스 수치(ENEMIES에서 개별 지정) · 상자 티어(tier) ·
   함정 밀도(trapRate) · 가시 밀도(spikeRate) · 상자 빈도(chestRate) · 잡몹 배율(mobMul).
   ★ chestRate 는 절반 아래로 내렸다(0.30~0.52 -> 0.14~0.24). 방마다 상자가 있으니
     여는 맛이 없었다 — 유적 하나에 스물몇 개씩 놓이고 있었다. 보물방·보스방의
     확정 상자는 그대로 두었으므로 "털 만한 것"은 줄지 않는다. */
const RUIN_SPEC = [
  {
    id: 'ice', n: '얼음 던전', x: 300, y: 150, w: 74, h: 44,
    wall: T.ICEBRICK, floor: T.ICE, bg: 5, torch: T.TORCH,
    traps: ['dart', 'crumble', 'grind'], boss: 'ice_warden',
    mobs: ['frostling', 'icewolf'],
    rank: 2, tier: 3, trapRate: 0.46, spikeRate: 0.26, chestRate: 0.16, mobMul: 1.0
  },
  {
    id: 'pyramid', n: '피라미드', x: 2180, y: 96, w: 80, h: 56,
    wall: T.SANDBRICK, floor: T.SANDSTONE, bg: 8, torch: T.TORCH,
    traps: ['dart', 'vent', 'crumble', 'gas'], boss: 'sand_guardian',
    mobs: ['scorpion', 'sandmaw', 'skeleton'],
    // 지상으로 튀어나온 데다 얕아서 일찍 눈에 띄지만, 안은 함정이 가장 촘촘하다 —
    // "보이는 것과 실제 난이도가 다른" 유적 하나는 있어야 한다
    rank: 4, tier: 4, trapRate: 0.78, spikeRate: 0.46, chestRate: 0.20, mobMul: 1.35
  },
  {
    id: 'mine', n: '버려진 광산', x: 820, y: 168, w: 72, h: 38,
    wall: T.MINEWOOD, floor: T.PLANK, bg: 4, torch: T.TORCH,
    traps: ['dart', 'crumble', 'gas'], boss: 'mine_horror',
    mobs: ['minerghost', 'spider', 'bat'],
    // 베이스캠프 바로 옆. 처음 들어가 보는 유적이라 가장 순하게 둔다
    rank: 1, tier: 2, trapRate: 0.32, spikeRate: 0.16, chestRate: 0.14, mobMul: 0.85
  },
  {
    id: 'blight', n: '부패한 둥지', x: 4020, y: 196, w: 100, h: 60,
    wall: T.EBONSTONE, floor: T.EBONSTONE, bg: 3, torch: T.TORCH,
    traps: ['dart', 'vent', 'gas', 'coil'], boss: 'blight_maw',
    mobs: ['crawler', 'shadoweye'],
    // 동쪽 끝 + 가장 깊다. 여섯 중 마지막에 닿는 곳이라 제일 세게
    rank: 6, tier: 6, trapRate: 0.92, spikeRate: 0.58, chestRate: 0.24, mobMul: 1.85
  },
  {
    id: 'spore', n: '포자 굴', x: 3620, y: 176, w: 68, h: 42,
    wall: T.SPORESTONE, floor: T.GLOWMOSS, bg: 12, torch: T.GLOWCAP,
    traps: ['vent', 'dart', 'gas', 'coil'], boss: 'spore_queen',
    mobs: ['sporeling', 'capbeast'], arch: 'buried', rooms: 14,
    // 입구가 없어 우연히 뚫고 들어가는 곳. 준비 없이 떨어질 수 있으니 함정은 낮추고
    // 대신 잡몹을 세게 — 도망칠 길이 없다는 게 이 유적의 압박이다
    rank: 5, tier: 5, trapRate: 0.50, spikeRate: 0.30, chestRate: 0.22, mobMul: 1.6
  }
];
/* 유적 생김새(arch) — 같은 방 생성기를 쓰되 "어떻게 발견되는가"를 갈랐다.
   surface: 윗부분이 지상으로 튀어나와 멀리서도 보인다 (대신 입구가 함정투성이)
   gated:   입구는 뚜렷한데 들어가는 길이 시련이다 (수직 갱도 + 함정)
   buried:  입구가 없다. 동굴을 파고 들어가다 우연히 벽 너머로 닿는다 */
/* 입구 통로 자체의 성격(entryKind) — arch(바깥 생김새)와는 별개 축이다.
   foothold(발판형):   3칸마다 발판이 있어 오르내리기 쉽다. 대신 벽에서 화살이 고정 간격으로 온다
   nofoothold(무발판형): 발판이 아예 없다. 낙하하며 옆에서 쏘고, 바닥엔 반드시 가시가 있다
   maze(미로형):        곧게 뚫지 않고 좌우로 꺾인다. 굽이마다 사각이 있고 거기 함정이 있다
   buried은 애초에 입구가 없으니 해당 없음. 예전에는 이 통로들이 rng.chance로만 함정을
   심어서 운이 나쁘면 함정 없이 직행 입장하는 경우가 있었다 — 이제 자리를 고정해 최소
   개수를 보장한다(carveRuinEntrance/_carveEntranceShaft, world.js). */
/* 방 개수도 rank를 따라간다 — 예전에는 가장 순한 갱도(rank 1)가 방 15개로 제일 크고,
   가장 사나운 부패한 둥지(rank 6)가 12개로 제일 작아서 체감이 거꾸로였다. */
/* ---------------- 유적 도면 · 입구 · 고유 요소 ----------------
   ★ 예전에는 유적이 전부 "직사각형 하나를 벽으로 채우고 BSP로 자른 것"이었다.
     겉모양이 열 곳 다 같은 상자였고, 지상에서 내려가는 입구가 여섯 곳이나 있어
     "우연히 발견했다"가 성립하지 않았다. 셋을 한꺼번에 고친다.

   plan  — 유적을 굵은 격자로 나눠 어느 칸에 방을 둘지 그린 도면.
           `#` 칸에 들어간 방만 남기고, 남은 방들의 자리만 벽으로 채운다.
           그래서 유적 겉모양이 방 배치를 그대로 따라간다 (고리·ㄷ자·계단…).
           `.` 칸은 손대지 않은 땅 그대로라, 고리형이면 가운데가 통짜 암반이 된다.
   arch  — 어떻게 발견되는가.
           buried:  입구가 없다. 위치 지도를 구해야 찾는다 (지도는 다른 유적 상자에)
           sunken:  지표 아래에 묻힌 수직 통로. 지상에는 부러진 기둥 하나뿐 —
                    눈에 띄지만 파 내려가야 열린다
           gated:   문틀까지 세운 뚜렷한 입구 (버려진 광산 하나뿐 — 첫 유적이라)
           surface: 윗부분이 지상으로 솟아 있다 (피라미드 하나뿐 — 그게 피라미드다)
   decor — 그 유적에만 놓이는 장식. [타일, 배치방식, 밀도]
   sig   — 그 유적에만 있는 방 하나 (가장 큰 방 다음으로 넓은 방에 놓는다)
   event — 그 유적에서만 일어나는 일. game.js 의 ruinEvent 가 돌린다
   bonus — 그 유적 상자에만 섞이는 전리품 */
/* bsp: [자르는 깊이, 방 최소 가로, 방 최소 세로].
   가로 스크롤 게임이라 방은 **가로로 넓어야** 한다 — 세로로 길면 걸어 다닐 데가 없고
   사다리 통로처럼 보인다. 그래서 최소 가로를 최소 세로의 두 배 가까이 잡는다.
   피라미드와 부패한 둥지는 깊이를 6까지 줘서 **방 스무 개가 넘는 큰 유적**으로 만든다. */
RUIN_SPEC[0].plan = 'ring';   RUIN_SPEC[0].arch = 'buried';  RUIN_SPEC[0].bsp = [5, 17, 9];   // 얼음
RUIN_SPEC[1].plan = 'pyramid'; RUIN_SPEC[1].arch = 'surface'; RUIN_SPEC[1].bsp = [6, 10, 6];  // 피라미드 (방 20+)
RUIN_SPEC[2].plan = 'spine';  RUIN_SPEC[2].arch = 'gated';   RUIN_SPEC[2].bsp = [5, 14, 7];   // 광산
RUIN_SPEC[3].plan = 'warren'; RUIN_SPEC[3].arch = 'buried';  RUIN_SPEC[3].bsp = [6, 13, 7];   // 부패한 둥지 (방 20+)
RUIN_SPEC[4].plan = 'horseshoe'; RUIN_SPEC[4].arch = 'buried'; RUIN_SPEC[4].bsp = [5, 16, 8]; // 포자 굴

/* 겉으로 보이는 재질을 유적마다 갈랐다 — 나무 · 돌 · 구리 · 얼음 · 유기물.
   [배치방식, 타일, 밀도] 를 여럿 줄 수 있고 방마다 전부 돌린다.
   배치방식은 putRuinDecor 참고. 걷는 줄(fy · fy-1)은 어떤 것도 막지 않는다. */
RUIN_SPEC[0].decor = [['pillar', T.ICE, 0.5], ['stalac', T.ICE, 0.5], ['brazier', T.TORCH, 0.35]];
RUIN_SPEC[1].decor = [['statue', T.SANDBRICK, 0.5], ['frieze', T.GOLD, 0.35], ['brazier', T.TORCH, 0.3]];
RUIN_SPEC[2].decor = [['beam', T.MINEWOOD, 0.6], ['rail', T.PLANK, 0.5], ['crate', T.MINEWOOD, 0.4]];
RUIN_SPEC[3].decor = [['growth', T.CORRUPTLEAF, 0.6], ['stalac', T.EBONSTONE, 0.4], ['web', T.VINE, 0.35]];
RUIN_SPEC[4].decor = [['growth', T.GLOWCAP, 0.7], ['moss', T.GLOWMOSS, 0.5], ['stalac', T.SPORESTONE, 0.35]];

RUIN_SPEC[0].sig = 'frozen';   RUIN_SPEC[0].event = 'blackout';
RUIN_SPEC[1].sig = 'sunshaft'; RUIN_SPEC[1].event = 'password';
RUIN_SPEC[2].sig = 'shaft';    RUIN_SPEC[2].event = 'collapse';
RUIN_SPEC[3].sig = 'heart';    RUIN_SPEC[3].event = 'swarm';
RUIN_SPEC[4].sig = 'bloom';    RUIN_SPEC[4].event = 'bloom';

RUIN_SPEC[0].bonus = 'ice_shard';
RUIN_SPEC[1].bonus = 'gold_ore';
RUIN_SPEC[2].bonus = 'coal';
RUIN_SPEC[3].bonus = 'corrupt_ess';
RUIN_SPEC[4].bonus = 'mushroom';

/* 도면 — 굵은 격자(가로 4칸 x 세로 3칸). `#` 에 방을 둔다.
   방 하나가 최소 11x9라 격자 한 칸에 방 하나둘이 들어간다. 도면이 너무 빡빡해서
   남는 방이 셋도 안 되면 생성기가 도면을 버리고 통짜로 판다(안전장치). */
const RUIN_PLANS = {
  full:      ['####', '####', '####'],
  ring:      ['####', '#..#', '####'],   // O — 가운데가 통짜 암반으로 남는다
  horseshoe: ['####', '#...', '####'],   // C — 한쪽이 트인 고리
  cross:     ['.##.', '####', '.##.'],   // 十
  spine:     ['###.', '..#.', '.###'],   // 두 덩이를 좁은 목이 잇는다
  steps:     ['##..', '.##.', '..##'],   // 계단식
  pyramid:   ['#...', '##..', '###.', '####'],   // 삼각형 — 진짜 피라미드 단면
  warren:    ['####', '#.##', '####', '.###'],   // 잔방 투성이 (구멍 몇 개 뚫린 벌집)
  hook:      ['#...', '#...', '####'],   // ㄴ
  tee:       ['####', '.##.', '.##.'],   // T
  hall:      ['#..#', '####', '#..#']    // H
};

/* 스토리 유적 셋(석판)의 도면·입구·고유 요소. buildRuins 가 참조한다.
   셋은 제7장에 한 번에 열리는 본편 경로라 입구를 아주 없애지는 않았다 —
   대신 지표 아래에 묻어(sunken) 부러진 기둥 하나만 지상에 남긴다. */
const STORY_RUIN = [
  { n: '서리 밑 석실', plan: 'hook', arch: 'sunken', decor: [['pillar', T.ICE, 0.4], ['stalac', T.ICE, 0.45]],     sig: 'frozen',  event: 'blackout', bonus: 'ice_shard' },
  { n: '겹친 길', plan: 'tee',  arch: 'sunken', decor: [['statue', T.RUINBRICK, 0.45], ['pipe', T.COPPER, 0.5], ['frieze', T.RUNESTONE, 0.3]], sig: 'sunshaft', event: 'password', bonus: 'aether_shard' },
  { n: '발 디딜 곳 없는 방', plan: 'hall', arch: 'sunken', decor: [['growth', T.CORRUPTLEAF, 0.5], ['web', T.VINE, 0.4], ['pipe', T.LEAD, 0.35]], sig: 'heart', event: 'swarm',   bonus: 'corrupt_ess' }
];

/* 입구가 없는 유적(arch: 'buried')은 위치 지도를 구해야 찾는다.
   지도는 그 유적이 아니라 **다른 유적의 보물방 상자**에 들어간다 — 한 곳을 털면
   다음 곳이 열리는 사슬이다. 사슬의 시작(광산·피라미드)은 지도 없이 들어갈 수 있다.
   { 지도가 가리키는 유적: 지도가 들어 있는 유적 } */
/* 신비한 방 — 한 세계에 두세 곳. 유적 아무 데나 붙는 게 아니라 유적마다 하나씩만
   후보로 두고 그중 셋을 고른다. 싸움이 아니라 "고르는 것"이 내용이라, 방에는
   함정도 몹도 두지 않는다. 한 번 쓰면 끝난다(o.used, 세이브에 남는다). */
const MYSTIC = {
  well: { n: '가라앉은 우물', tile: 'WATER',
    lines: ['바닥이 안 보이는 우물이다. 물이 아니라 그보다 무거운 것이 담겨 있다.',
            '가장자리에 손자국이 여럿 있다. 전부 안쪽을 향해 나 있다.'],
    ask: '금화를 던진다 (200)', cost: 200, buff: 'weighed',
    got: '무언가가 저울에 오른 기분이 든다' },
  echo: { n: '메아리 방', tile: 'RUNESTONE',
    lines: ['방이 소리를 되돌려 준다. 그런데 되돌아오는 것이 내가 낸 소리가 아니다.',
            '벽에 귀를 대면, 아주 오래전에 여기서 한 말이 아직 돌고 있다.'],
    ask: '가만히 듣는다', cost: 0, buff: 'echoed',
    got: '무슨 말인지는 모르겠는데, 머리가 맑아졌다' },
  star: { n: '별빛 웅덩이', tile: 'CRYSTAL',
    lines: ['천장이 뚫려 있지도 않은데 별빛이 고여 있다.',
            '떨어진 별의 조각이 이 아래 어딘가에 아직 박혀 있는 모양이다.'],
    ask: '빛에 손을 담근다', cost: 0, buff: 'starlit', heal: 1,
    got: '몸이 가벼워지고 상처가 아물었다' }
};

const RUIN_MAP_IN = {
  ice: 'mine',        // 광산(입구 있음) → 얼음 던전
  spore: 'pyramid',   // 피라미드(지상에 솟음) → 포자 굴
  blight: 'spore'     // 포자 굴 → 부패한 둥지 (가장 깊은 사슬 끝)
};

/* ---------------- 유적 비문 ----------------
   다섯 유적은 원래 "스토리와 무관한 탐험 콘텐츠"였는데, 그러다 보니 세계가 넓기만 하고
   할 말이 없었다. 각 유적에 비문을 하나씩 두어, 본편이 아직 말하지 않은 것을 조금씩 흘린다.
   전부 같은 사건(별이 떨어지기 전에 이미 무언가 있었다)을 다른 각도에서 본 기록이다. */
/* 유적마다 하나씩 있는 유물. 가장 깊은 보물방 상자에 반드시 들어 있다.
   story0~2 는 석판 유적 셋(서리 · 가운데 · 부패지대)이다.
   "이 유적에 왜 끝까지 들어가야 하는가"에 대한 답이라, 유적 수와 항상 같아야 한다. */
const RUIN_RELIC = {
  ice: 'relic_frostpane', pyramid: 'relic_sundial', mine: 'relic_lastlamp',
  blight: 'relic_rotcore', spore: 'relic_sporebell',
  story0: 'relic_frostmark', story1: 'relic_mazeeye', story2: 'relic_hollowseed'
};

/* 유적에 처음 발을 들일 때 뜨는 카드. 들어가기 전에 무엇을 기대할지 한 줄 준다 —
   유적이 열 개인데 안에 들어가 보기 전에는 다 똑같은 벽돌방이었다.
   sub 는 카드 윗줄, line 은 아랫줄. 스포일러가 되지 않게 "무엇이 있다"가 아니라
   "여기가 어떤 자리였나"를 말한다. */
const RUIN_CARD = {
  ice:     { sub: '얼어붙은 골짜기 아래', line: '스스로 골짜기를 얼린 사람들이 있었다. 그 얼음이 지금 녹고 있다.' },
  pyramid: { sub: '모래에 반쯤 잠긴', line: '왕의 무덤이 아니다. 하늘을 감시하려고 세운 눈이다.' },
  mine:    { sub: '베이스캠프 곁의', line: '갱도는 아직 따뜻하다. 마지막 교대가 올라오지 않았다.' },
  blight:  { sub: '동쪽 끝, 가장 깊은 곳', line: '여기서부터는 부패가 벽을 대신한다.' },
  spore:   { sub: '뚫고 들어온 자리', line: '입구가 없다. 나가는 길도 스스로 뚫어야 한다.' },
  story0:  { sub: '첫 번째 석판', line: '서리 아래에 글씨가 있다. 두 사람의 손으로 쓰였다.' },
  story1:  { sub: '두 번째 석판', line: '길이 겹쳐 있다. 같은 방을 두 번 지나게 되어 있다.' },
  story2:  { sub: '세 번째 석판', line: '발 디딜 곳이 없다. 여기까지 온 사람은 돌아갈 생각이 없던 사람이다.' }
};

const RUIN_LORE = {
  ice: {
    n: '얼어붙은 비문',
    lines: [
      '『서리는 벌이 아니었다. 우리가 스스로 덮은 것이다.』',
      '『아래에서 올라오는 것은 따뜻한 것부터 먹었다. 그래서 우리는 이 골짜기를 얼렸다.』',
      '『언 것은 자라지 않는다. 자라지 않는 것은 눈에 띄지 않는다.』',
      '『우리가 버틸 수 있는 것은 여기까지다. 다음에 오는 이에게 남긴다.』',
      '— 그 아래에 한 줄이 더 있다. 새긴 지 얼마 되지 않은, 다른 손의 글씨다.',
      '『어젯밤 하늘에서 불이 떨어졌다. 언 것이 녹기 시작했다.』'
    ]
  },
  pyramid: {
    n: '태양의 석판',
    lines: [
      '『우리는 별을 신으로 섬기지 않았다. 별을 감시했다.』',
      '『이 무덤은 왕을 위한 것이 아니다. 하늘을 향해 세운 눈이다.』',
      '『별 하나가 궤도를 벗어났다. 우리는 그것이 떨어지기까지 삼백 년을 세었다.』',
      '『떨어질 자리도 알았다. 서쪽 잿빛 숲. 그래서 그곳에 아무도 살게 하지 않았다.』',
      '— 그런데 지금, 그 자리에는 마을이 있다.'
    ]
  },
  mine: {
    n: '갱도의 낙서',
    lines: [
      '『8층에서 벽이 아니라 판금이 나왔다. 우리보다 먼저 누가 여기까지 팠다.』',
      '『십장은 계속 파라고 했다. 위에서 시킨 거라고.』',
      '『위가 누군데. 마을엔 이런 걸 시킬 사람이 없어.』',
      '『오늘 십장 얼굴을 봤는데, 눈 안쪽에서 불빛이 돌았다.』',
      '— 이 아래로는 글씨가 없다. 손톱으로 긁은 자국만 남아 있다.'
    ]
  },
  blight: {
    n: '썩은 제단',
    lines: [
      '『부패는 병이 아니다. 소화다.』',
      '『무언가가 이 땅을 아주 천천히 먹고 있다. 천 년에 한 뼘씩.』',
      '『별이 떨어진 밤, 먹는 속도가 바뀌었다. 놀란 것처럼.』',
      '『놀랐다는 건 그것도 별을 몰랐다는 뜻이다. 그것도 여기 살고 있었을 뿐이다.』',
      '— 그렇다면 이 땅의 주인은 셋이다. 우리, 그것, 그리고 떨어진 것.'
    ]
  },
  root: {
    n: '뿌리의 기록',
    lines: [
      '『나무는 기억한다. 우리보다 오래, 우리보다 정확하게.』',
      '『심재를 잘라 보면 천 년 전 그해에만 나이테가 없다.』',
      '『그해에 이 숲은 자라지 않았다. 자랄 수 없었다.』',
      '『하늘이 한 해 내내 닫혀 있었기 때문이다. 무언가가 위에서 내려다보고 있었다.』',
      '— 그리고 그것은 떠났다. 하지만 돌아온다고 적혀 있다.'
    ]
  },
  spore: {
    n: '포자의 속삭임',
    lines: [
      '『우리는 말을 하지 않는다. 숨을 나눌 뿐이다.』',
      '『아래에서 쇠 냄새가 올라온다. 아주 깊은 곳에서, 아직도 무언가 돌고 있다.』',
      '『그것은 천 년 동안 한 번도 쉬지 않았다. 쉬는 법을 배운 적이 없어서.』',
      '『사람들은 그것을 만들어 놓고 잊었다. 잊힌 것은 멈추지 못한다.』',
      '— 이 골짜기가 유난히 밝은 것은, 그 아래가 아직 뜨겁기 때문이다.'
    ]
  },
  /* --- 특별 유적 둘. 하나는 세션 2 이야기의 마지막 조각이고, 다른 하나는 아무 이야기도 아니다 --- */
  citadel: {
    n: '환원 기록',
    lines: [
      '『발사 준비 완료. 대기 시간: 372,000일.』',
      '『이전 주기에서 우리는 별을 하늘로 돌려보냈다. 그것이 옳다고 믿었다.』',
      '『돌아간 별은 다시 쫓겼고, 다시 도망쳤고, 다시 떨어졌다. 우리는 아무것도 끝내지 않았다.』',
      '『발사 좌표는 처음부터 고정되어 있었다. 참조점 — 「그것이 처음 왔던 자리」.』',
      '『되돌려 보낸다는 말은 틀렸다. 우리는 그저 그것을 원래 있던 곳으로 다시 던진 것이다.』',
      '『그래서 이번에는 아래에 남기로 했다 — 도시를 찍어 두고, 다음 사람을 그려 두고.』',
      '『다만 이 기관만은 끄지 못했다. 끄는 순간, 우리가 틀렸다고 인정하는 것이 되어서.』',
      '— 그리고 그것은 아직도 발사 준비 완료 상태다. 누군가 취소해 주기를 기다리면서.',
      '『…신호 수신.』',
      '『이번 주기에는 발사가 없었음을 확인. 참조점 방향에서, 처음으로, 응답이 왔다.』',
      '— 이 마지막 줄은 다른 손으로, 아주 최근에 적혔다.'
    ]
  },
  shaft: {
    n: '막장의 낙서',
    lines: [
      '「3층까지는 회사가 파라고 했다.」',
      '「4층부터는 우리가 파고 싶어서 팠다. 아래에 뭐가 있는지 궁금해서.」',
      '「7층에서 등이 꺼졌다. 다시 켜니 파 놓은 길이 없어졌다.」',
      '「9층. 아무도 시키지 않았는데 아직 파고 있다. 왜인지는 이제 모르겠다.」',
      '— 여기서부터는 글씨가 아니라 긁힌 자국만 이어진다.'
    ]
  }
};

/* 유적 안에 흩어 둔 짧은 흔적. 비문 하나로는 방을 다 채울 수 없어서, 지나가다 읽는
   한두 줄짜리를 방마다 뿌린다. 보상은 없고 오직 이야기만 있다 — 대신 전부 본편의
   같은 질문(별보다 먼저 여기 있던 것은 무엇인가)을 향한다. */
const RUIN_HINTS = {
  ice: [
    ['성에 낀 손자국', ['벽 안쪽에 손바닥 자국이 얼어붙어 있다. 안에서 밖으로 밀어낸 자국이다.', '나가려던 게 아니라, 무언가 못 들어오게 막던 손이다.']],
    ['깨진 온기석', ['불을 담아 두던 돌이다. 일부러 깨뜨렸다.', '따뜻한 것부터 먹힌다는 걸 알고 있었다는 뜻이다.']],
    ['세다 만 눈금', ['벽에 눈금이 빼곡하다. 삼백 몇 번째에서 멈췄다.', '무언가가 떨어지기까지 남은 해를 세고 있었다.']]
  ],
  pyramid: [
    ['기울어진 관측대', ['천장에 뚫린 구멍이 하늘 한 점을 정확히 겨눈다.', '지금은 그 자리에 아무것도 없다. 천 년 전에는 있었다.']],
    ['비어 있는 석관', ['왕의 관이라기엔 너무 얕다. 사람이 눕는 자리가 아니다.', '무언가를 눕혀 두었다가, 누군가 가져갔다.']],
    ['지워진 이름', ['벽에 새긴 이름을 전부 정으로 쪼아 지웠다.', '기록을 남기는 자들이, 스스로 이름만은 지웠다.']]
  ],
  mine: [
    ['8층 표지', ['「여기서부터 우리 갱도가 아님」 — 급하게 못으로 긁었다.', '아래로는 우리보다 오래된 판금이 이어진다.']],
    ['버려진 도시락', ['천 년이 지났는데 썩지 않았다. 아래 공기가 그렇다.', '먹다 만 채로 일어나 어디론가 갔다.']],
    ['손톱 자국', ['벽을 긁은 자국이 위로만 나 있다. 올라가려 했다.', '그런데 여기는 올라갈 수 있는 벽이 아니다.']]
  ],
  blight: [
    ['삼킨 벽돌', ['유적 벽돌이 살처럼 부드러운 것에 반쯤 잠겨 있다.', '부수는 게 아니라 소화하는 중이다. 아주 천천히.']],
    ['멈춘 나이테', ['벽에 박힌 나무 기둥의 나이테가 한 해만 비어 있다.', '그해에는 이 땅의 모든 것이 자라기를 그만뒀다.']],
    ['놀란 자국', ['부패가 번진 자국이 한 지점에서 갑자기 방향을 튼다.', '별이 떨어진 밤, 이것도 놀랐다.']]
  ],
  root: [
    ['자라다 만 뿌리', ['뿌리가 천장 바로 앞에서 일제히 멈춰 굳었다.', '위쪽에 무언가 있는 동안은 아무것도 자라지 않았다.']],
    ['묶인 씨앗', ['씨앗을 천에 싸서 벽 속에 숨겨 두었다. 아직 살아 있다.', '숲이 다시 못 자랄 경우를 대비한 사람이 있었다.']],
    ['올려다본 자국', ['바닥에 무릎 자국이 여럿 있다. 전부 같은 방향, 위를 본다.', '기도가 아니라 감시였을 것이다.']]
  ],
  spore: [
    ['쇠 냄새 나는 포자', ['이 포자만 유독 쇳내가 난다. 아래에서 올라온 것을 먹고 자랐다.', '그렇다면 아래는 아직 뜨겁다.']],
    ['빛나는 뼈', ['사람 뼈에 이끼가 붙어 스스로 빛난다.', '내려간 사람이 있었다는 뜻이고, 올라오지 못했다는 뜻이다.']],
    ['규칙적인 진동', ['벽에 손을 대면 아주 느린 박자가 전해진다.', '천 년 동안 한 박자도 어긋나지 않았다.']]
  ]
};

/* ---------------- 세계 이벤트 ----------------
   "밤이 되면 늘 같은 좀비"가 아니라, 가끔 밤 자체가 달라지도록 만든 장치다.
   조건이 맞는 동안만 켜지고, 켜져 있는 동안 스폰표·하늘색·스폰 상한이 바뀐다.

   when: 발동 조건 (밤인가 · 어느 바이옴인가) · table: 그 동안의 스폰표
   cap: 동시 등장 상한 · tint: 하늘에 섞을 색 · rw: 처치 보상 배수 */
const EVENTS = {
  bloodmoon: {
    n: '붉은 달', i: '🌑',
    d: '달이 붉다. 오늘 밤은 밖에 있으면 안 된다.',
    night: 1, chance: 0.08, zones: ['surface', 'ice', 'corrupt', 'jungle', 'glowfen'],
    table: ['crimson_howler', 'crimson_eye', 'crimson_howler', 'zombie', 'crimson_eye'],
    cap: 34, tint: '#6a1414', tintAmt: 0.5, rw: 2.2
  },
  sandstorm: {
    n: '모래폭풍', i: '🌪',
    d: '사구가 통째로 움직인다. 앞이 잘 보이지 않는다.',
    day: 1, chance: 0.25, zones: ['surface'], biome: 'desert',
    table: ['sandmaw', 'scorpion', 'sandmaw', 'scorpion'],
    cap: 28, tint: '#c8a05a', tintAmt: 0.45, rw: 1.5
  },
  sporebloom: {
    n: '포자 개화', i: '🫧',
    d: '골짜기 전체가 한꺼번에 숨을 뱉었다.',
    night: 1, chance: 0.25, zones: ['glowfen'], biome: 'glowfen',
    table: ['sporeling', 'capbeast', 'sporeling', 'sporeling'],
    cap: 30, tint: '#2f8a70', tintAmt: 0.4, rw: 1.7
  },
  /* 비 — 다른 이벤트와 달리 스폰표를 바꾸지 않는다(table 없음). 그 구역 평소 몬스터가
     그대로 나오되 buff만큼 강해진다. 낮/밤 구분 없이 어느 지상 바이옴에서나 온다. */
  rain: {
    n: '비', i: '🌧',
    d: '비가 몰아친다. 놈들이 평소보다 사납다.',
    chance: 0.20, zones: ['surface', 'ice', 'corrupt', 'jungle', 'glowfen'],
    buff: { hp: 1.35, dmg: 1.25 },
    cap: 24, tint: '#2a323c', tintAmt: 0.4, rw: 1.3,
    dur: 240   // 낮/밤 구분이 없어서, 대신 4분(실시간) 뒤에 스스로 갠다
  }
};

/* ---------------- NPC ---------------- */
const NPCS = {
  elara:  { n: '엘라라', i: '🧝‍♀️', c: '#c8a06a', role: '캠프 관리인', art: 'elara' },
  borin:  { n: '보린', i: '🧔', c: '#8a6a4a', role: '대장장이', shop: ['pick_iron', 'sword_iron', 'helm_iron', 'potion_hp_small', 'potion_iron', 'torch', 'band_worn'], art: 'borin' },
  mira:   { n: '미라', i: '🧙‍♀️', c: '#8f6fd8', role: '마녀', shop: ['staff_branch', 'potion_mp_small', 'ring_focus', 'potion_str'], art: 'mira' },
  old:    { n: '이름 없는 노인', i: '👴', c: '#9a9a9a', role: '???', art: 'elder' },
  /* --- 여명 마을 주민 (세션 1 종장 이후) --- */
  tamer:  { n: '리카', i: '🦝', c: '#b8804a', role: '조련사', art: 'rika', shop: ['egg_common', 'egg_rare', 'egg_epic'], pets: true,
            line: '짐승들이 낯을 좀 가리긴 해도, 알만 있으면 금방 정든다.' },
  trainer:{ n: '가른', i: '🐺', c: '#5a6a5a', role: '훈련소 교관', art: 'garn',
            line: '잿빛이 걷혔다고 몸이 저절로 강해지진 않아. 굴러야지.' },
  haran:  { n: '하란', i: '🍺', c: '#c06a3a', role: '여관 주인', art: 'haran',
            line: '방은 얼마든지 있어. 이 도시엔 아직 사람보다 방이 많거든.' },
  seira:  { n: '세이라', i: '🔨', c: '#7a8fb8', role: '재련사', art: 'seira',
            line: '물건은 그대로 두고 이름만 바꿔 주는 거야. 운이 나쁘면 더 나빠지고.' },
  kade:   { n: '케이드', i: '⚙', c: '#8a8a96', role: '기술자', art: 'kade', shop: ['charm_cap', 'charm_conduit', 'battery_cell', 'circuit'],
            line: '이 도시, 사람이 지은 게 아니야. 그럼 누가 지었냐고? 그걸 알아내는 게 내 일이고.' }
};
/* 여명 마을 주민 — 종장 전에는 아예 등장하지 않으므로 별도 잠금 대사가 필요 없다 */
const DAWN_NPCS = ['tamer', 'trainer', 'haran', 'seira', 'kade'];

/* ---------------- 마을 단계별 주민 한 마디 ----------------
   주민 다섯이 각자 고정 대사를 하나씩만 들고 있었다. 그래서 지붕이 올라가고 성벽이
   서도 마을 사람 입에서는 아무 일도 일어나지 않았다 — 마을을 키운 사람만 알고,
   마을은 모르는 상태였다.
   이제 단계마다 한 줄씩 더 붙는다(고정 대사 뒤에 이어 붙는다). 내용은 전부
   **그 단계에서 실제로 눈에 보이게 바뀐 것**이다 — 2층·울타리 친 빈 땅·가로등,
   그리고 성벽·포탑·경비병. 사냥 의뢰는 여전히 베이스캠프 게시판 몫이라
   여기서는 한 마디도 하지 않는다. */
const VILLAGE_TALK = {
  tamer: [null,
    '짐승들이 아직 이 거리를 못 미더워해. 하긴 나도 그래.',
    '가로등이 서니까 밤에도 알을 돌볼 수 있어. 그전엔 해 지면 그냥 접었거든.',
    '성문이 닫히는 소리에 애들이 놀라. 며칠이면 익숙해지겠지.'],
  trainer: [null,
    '터는 넓은데 사람이 없어. 훈련은 혼자서도 되지만, 재미는 없지.',
    '2층이 생겨서 위층에서 아래를 내려다보며 자세를 봐 준다. 훨씬 낫더군.',
    '경비 둘이 문에 섰다고 몸을 놓지 마라. 벽은 사람을 대신하지 않아.'],
  haran: [null,
    '방은 얼마든지 있어. 채울 사람이 없을 뿐이지.',
    '지붕에 기와를 얹었더니 비 오는 밤에 손님이 는다. 소리가 좋아서라나.',
    '요새라니. 간판을 바꿔야 하나 싶다가도, 여관은 여관이지.'],
  seira: [null,
    '풀무가 낡았어. 그래도 도는 게 어디야.',
    '풍차 덕에 밤에도 불을 살려 둔다. 전주 선로가 여기까지 와 있거든.',
    '성벽 쌓느라 성벽돌을 그렇게 벼렸는데, 이젠 손이 다 기억해.'],
  kade: [null,
    '이 도시, 사람이 지은 게 아니야. 아직 그 얘긴 접어 두자고.',
    '서쪽에 울타리 친 땅 봤어? 흙은 골라 뒀는데 아무도 안 갈았어. 괭이 든 사람 기다리는 중이지.',
    '포탑 두 기, 대갈못만 채워 두면 알아서 쏜다. 채우는 건 자네 몫이고.']
};

/* ---------------- 펫 ---------------- */
/* b: 장착 시 recalc()에 그대로 병합되는 패시브 보너스 (스탯창의 파생 스탯 키와 동일 체계) */
/* ---------------- 펫 ----------------
   장신구처럼 장비창의 펫 슬롯 두 칸에 끼운다(펫 자체가 인벤토리 아이템이다).
   b는 착용 중 붙는 패시브, atk는 고유 자동 공격 — 근처 적을 알아서 문다.

   ★ 수치 기준: 펫은 조련사 리카에게서만 나오고, 리카는 여명 마을 주민이라 세션 2
   서장(제9장)을 지나야 존재한다. 그 시점 플레이어는 이미 레벨 80대이고 상대하는
   잡몹이 체력 1200~5200 · 공격력 76~152 · 방어 26~96이다. 그래서 초반 장비 감각으로
   잡으면(예전 기준 피해 6~26) 있으나 마나 한 장식이 된다 — 기준 피해와 최소 레벨,
   패시브 수치 전부 그 구간에 맞춰 잡았다.

   atk 필드: k('proj' 투사체 / 'melee' 직접 물기) · proj(투사체 종류, Proj가 아는 이름) ·
   dmg(기준 피해, PET_DMG_SCALE로 레벨에 비례해 커진다) · cd(초) · range(픽셀) ·
   spd(투사체 속도). c는 절차 생성 그림에 쓰는 몸 색이다. */
const PETS = {
  /* --- 공통 --- */
  ember_squirrel: { n: '잿불 다람쥐', i: '🐿', r: 0, c: '#c8703a', b: { ms: 8 },
    atk: { k: 'proj', proj: 'fire', dmg: 55, cd: 1.6, range: 240, spd: 380 },
    d: '꼬리에 잿불이 붙어 있어도 태연하다.' },
  glass_moth:     { n: '유리날개 나방', i: '🦋', r: 0, c: '#9fd8e8', b: { mpreg: 14 },
    atk: { k: 'proj', proj: 'rune', dmg: 52, cd: 1.5, range: 250, spd: 340 },
    d: '날개가 부딪힐 때마다 유리 소리가 난다.' },
  pebble_kin:     { n: '조약돌 아이', i: '🪨', r: 0, c: '#9a9288', b: { def: 22 },
    atk: { k: 'melee', dmg: 78, cd: 1.9, range: 52 },
    d: '굴러다니다 멈추면 그냥 돌처럼 보인다.' },
  dust_sparrow:   { n: '먼지참새', i: '🐦', r: 0, c: '#b8a890', b: { crit: 5 },
    atk: { k: 'proj', proj: 'arrow', dmg: 46, cd: 1.3, range: 260, spd: 460 },
    d: '잿가루를 털어내며 앞장서 날아간다.' },
  /* --- 희귀 --- */
  frost_kit:      { n: '서릿결 여우', i: '🦊', r: 1, c: '#a8dcf0', b: { def: 30, crit: 6 },
    atk: { k: 'proj', proj: 'frost', dmg: 100, cd: 1.4, range: 280, spd: 400 },
    d: '발자국마다 서리가 얼어붙는다.' },
  ash_owl:        { n: '잿빛 부엉이', i: '🦉', r: 1, c: '#8a8274', b: { hpreg: 3.2 },
    atk: { k: 'proj', proj: 'wind', dmg: 94, cd: 1.35, range: 300, spd: 420 },
    d: '밤에도 잿빛 속을 또렷이 본다.' },
  cinder_toad:    { n: '잉걸 두꺼비', i: '🐸', r: 1, c: '#c85a3a', b: { hp: 140 },
    atk: { k: 'proj', proj: 'fire', dmg: 150, cd: 2.0, range: 240, spd: 300 },
    d: '숨을 고를 때마다 목이 붉게 부푼다.' },
  thorn_wisp:     { n: '가시 도깨비불', i: '🌿', r: 1, c: '#6fbf5a', b: { dmgP: 0.06 },
    atk: { k: 'melee', dmg: 118, cd: 1.15, range: 56 },
    d: '스칠 때마다 잔가시가 남는다.' },
  /* --- 영웅 --- */
  star_sprite:    { n: '별조각 정령', i: '✨', r: 2, c: '#ffe08a', b: { lifesteal: 6, critD: 28 },
    atk: { k: 'proj', proj: 'star', dmg: 165, cd: 1.25, range: 320, spd: 440 },
    d: '오른손의 별빛에 이끌려 왔다.' },
  ember_drake:    { n: '잿불 새끼용', i: '🐉', r: 2, c: '#e0603c', b: { dmgP: 0.13 },
    atk: { k: 'proj', proj: 'fire', dmg: 190, cd: 1.35, range: 300, spd: 420 },
    d: '아직 날지 못하지만 성질은 급하다.' },
  void_hatchling: { n: '공허의 유생', i: '🌑', r: 2, c: '#a06fff', b: { dmgP: 0.10, critD: 22 },
    atk: { k: 'proj', proj: 'void', dmg: 178, cd: 1.4, range: 330, spd: 380 },
    d: '들여다보면 이쪽이 먼저 눈을 피하게 된다.' },
  storm_falcon:   { n: '뇌운 매', i: '🦅', r: 2, c: '#bcd8f0', b: { ms: 11, crit: 9 },
    atk: { k: 'proj', proj: 'bolt', dmg: 140, cd: 1.05, range: 340, spd: 560 },
    d: '내려꽂힐 때 소리가 한 박자 늦게 온다.' }
};
/* 펫 피해 배율 — 위 기준 피해는 "펫을 처음 손에 넣는 레벨 80 언저리"에서의 값이다.
   레벨에 정비례로 곱하면 후반(레벨 200)에 터무니없이 커지므로 완만하게만 키운다.
   레벨 80에서 약 1.0배, 200에서 약 2.4배. */
function petDmgScale(level) { return Math.max(0.45, 0.07 + level * 0.0116); }
/* 펫 아이템 — PETS를 단일 출처로 삼아 ITEMS 항목을 자동으로 만든다.
   이름·수치를 두 군데 적어 두면 반드시 어긋나므로 여기서 파생시킨다. */
for (const id in PETS) {
  const pt = PETS[id];
  ITEMS['pet_' + id] = {
    n: pt.n, i: pt.i, type: 'pet', pet: id, b: pt.b, stack: 1,
    // 최소 레벨·값어치도 세션 2 기준 — 마을에 막 닿으면 공통·희귀는 바로 쓸 수 있고
    // 영웅은 조금 더 키운 뒤에 붙는다(레벨 100). 값은 그 시점 소지금 규모에 맞춰 올렸다.
    lvReq: [60, 80, 100][pt.r], price: [9000, 34000, 95000][pt.r], d: pt.d
  };
}
/* 등급별 알 뽑기 확률 [펫 키, 가중치] — 공통(0)·희귀(1)·영웅(2) */
const EGG_POOL = {
  common: [['ember_squirrel', 26], ['glass_moth', 26], ['pebble_kin', 22], ['dust_sparrow', 22],
           ['frost_kit', 4], ['ash_owl', 4], ['cinder_toad', 3], ['thorn_wisp', 3],
           ['star_sprite', 0.4], ['ember_drake', 0.4], ['void_hatchling', 0.3], ['storm_falcon', 0.3]],
  rare:   [['ember_squirrel', 11], ['glass_moth', 11], ['pebble_kin', 10], ['dust_sparrow', 10],
           ['frost_kit', 15], ['ash_owl', 15], ['cinder_toad', 13], ['thorn_wisp', 13],
           ['star_sprite', 3], ['ember_drake', 3], ['void_hatchling', 2.5], ['storm_falcon', 2.5]],
  epic:   [['ember_squirrel', 3], ['glass_moth', 3], ['pebble_kin', 2], ['dust_sparrow', 2],
           ['frost_kit', 11], ['ash_owl', 11], ['cinder_toad', 10], ['thorn_wisp', 10],
           ['star_sprite', 13], ['ember_drake', 13], ['void_hatchling', 11], ['storm_falcon', 11]]
};

/* ---------------- 스토리 ---------------- */
/* obj types: kill(target,n) / mine(tile,n) / collect(item,n) / talk(npc) / depth(y) / boss(target) / craft(item) / equip(slot) */
const CHAPTERS = [
  {
    id: 0, title: '떨어진 별', sub: '서 장', art: 'chapter_0_fallen_star',
    line: '별이 부서진 밤',
    intro: '한밤중에 하늘이 갈라졌다.\n' +
      '떨어진 것은 돌이 아니었다. 부딪히기 직전, 그것은 분명히 몸을 뒤틀어 피하려 했다.\n' +
      '무언가로부터 도망치던 중이었다.\n\n' +
      '그것은 다섯 갈래 빛으로 부서져 흩어졌고, 그중 한 조각의 빛이 네 오른손에 박혔다.\n' +
      '눈을 떴을 때 세계는 색을 잃어가고 있었다. 사람들은 그것을 잿빛이라 불렀다.',
    basics: [
      { type: 'collect', item: 'wood', n: 10, t: '나무 10개 모으기', verb: 'gather' },
      { type: 'craft', item: 'plank', t: '판자 만들기', verb: 'craft' },
      { type: 'kill', target: 'slime', n: 3, t: '잿빛 슬라임 3마리 거두기', verb: 'kill' }
    ],
    needBasics: 2,
    require: [],
    goal: { type: 'talk', npc: 'elara', t: '베이스캠프의 엘라라와 만나기', verb: 'talk' },
    rw: { xp: 60, gold: 40, items: [['potion_hp_small', 3], ['torch', 20]] },
    outro: '엘라라: "살아 있는 사람을 본 게 얼마 만인지…"\n' +
      '"…네 오른손. 빛나고 있는 거, 알고는 있니?"'
  },
  {
    id: 1, title: '잿빛 야영지', sub: '제 1 장', art: 'chapter_1_ash_village',
    line: '혼자이지 않기를 꿈꾼 것',
    intro: '미라가 알려준 사실은 이렇다.\n' +
      '별 조각은 홀로 남으면 잠들고, 잠들면 꿈을 꾼다. 그리고 그 꿈이 주변 물질에게\n' +
      '"너는 무엇이었지?"를 잊게 만든다. 색이 빠지고, 형태가 흐려지고, 결국 아무것도 아닌 것이 된다.\n' +
      '그게 잿빛의 정체다. 재가 아니라, 세계가 자기 정의를 잊는 것.\n\n' +
      '여기는 마을이 아니다. 무너진 마을에서 걸어 나온 넷이 천막을 세운 자리다.\n' +
      '엘라라는 이곳을 베이스캠프라고 부른다. 돌아올 곳이 있어야 나갈 수 있다면서.\n\n' +
      '첫 번째 조각은 캠프 동쪽 늪에 떨어졌다. 그것은 혼자이지 않기를 꿈꿨고,\n' +
      '그래서 끝없이 갈라지기 시작했다.',
    basics: [
      { type: 'mine', tile: T.COPPER, n: 12, t: '구리 광맥 12번 캐기', verb: 'dig' },
      { type: 'kill', target: 'slime', n: 8, t: '갈라진 것 8마리 거두기', verb: 'kill' },
      { type: 'craft', item: 'sword_copper', t: '구리 장검 벼리기', verb: 'craft' },
      { type: 'explore', ruin: 'mine', t: '캠프 옆 버려진 광산에 들어가 보기', verb: 'explore' }
    ],
    needBasics: 2,
    require: ['dig'],
    goal: { type: 'boss', target: 'king_slime', t: '한 덩어리가 더 갈라지지 않을 때까지', verb: 'boss' },
    rw: { xp: 260, gold: 180, items: [['helm_copper', 1], ['potion_hp_small', 5]] },
    outro: '슬라임 왕이 터지자 안에서 손바닥만 한 심장이 굴러 나왔다. 아직 미지근하다.\n\n' +
      '노인: "그게 무엇을 꿈꿨는지 알겠나. …외롭지 않기를 꿈꿨어."\n' +
      '미라: "하나야. 다섯 중에 하나."'
  },
  {
    id: 2, title: '뼈가 쌓인 곳', sub: '제 2 장', art: 'chapter_2_bone_pit',
    line: '잠든 것들의 꿈을 대신 꾼 조각',
    intro: '두 번째 조각은 캠프가 서기 훨씬 전부터 있던 묘실에 떨어졌다.\n' +
      '조각은 제 꿈을 꾸지 않았다. 그 아래 잠들어 있던 것들의 꿈을 대신 꿨다.\n' +
      '그래서 그것들이 일어났다.\n\n' +
      '보린이 무기부터 챙기라고 했다. 아래는 깊고, 조각은 가장 아래에 있다.',
    basics: [
      { type: 'depth', y: 170, t: '지하 450m까지 내려가기', verb: 'depth' },
      { type: 'kill', target: 'skeleton', n: 10, t: '무덤지기 10마리 처치', verb: 'kill' },
      { type: 'kill', target: 'spider', n: 8, t: '동굴 거미 8마리 처치', verb: 'kill' },
      { type: 'kill', target: 'minerghost', n: 5, t: '광부의 유령 5마리 재우기', verb: 'kill' }
    ],
    needBasics: 2,
    require: ['depth'],
    goal: { type: 'boss', target: 'bone_lord', t: '뼈의 군주 토벌', verb: 'boss' },
    rw: { xp: 900, gold: 600, items: [['ring_vigor', 1], ['potion_hp_small', 8]] },
    outro: '뼈의 군주는 무너지기 직전, 조각을 제 갈비뼈 사이에서 꺼내 네 쪽으로 밀어주었다.\n\n' +
      '"…고맙다. 꿈이 너무 길었어."\n' +
      '그는 재가 되기 전에 한 마디를 더 남겼다. "셋째는 스스로 걸어올 것이다."'
  },
  {
    id: 3, title: '부패한 숲', sub: '제 3 장', art: 'chapter_3_corrupt_forest',
    line: '굶주림을 꿈꾼 것',
    intro: '세 번째 조각은 동쪽 숲 한가운데 떨어져 굶주림을 꿈꿨다.\n' +
      '그래서 숲이 먹기 시작했다. 나무가 짐승을 먹고, 짐승이 흙을 먹고,\n' +
      '흙이 다시 나무를 먹는다. 멈추지 않는다. 배가 부르지 않으니까.\n\n' +
      '한가운데에 심장이 하나 뛰고 있다. 그게 조각을 삼킨 자리다.',
    basics: [
      { type: 'collect', item: 'corrupt_ess', n: 14, t: '부패의 정수 14개 모으기', verb: 'gather' },
      { type: 'kill', target: 'shadoweye', n: 8, t: '그림자 눈 8마리 처치', verb: 'kill' },
      { type: 'kill', target: 'crawler', n: 8, t: '부패한 사냥꾼 8마리 처치', verb: 'kill' },
      { type: 'kill', target: 'corrupttree', n: 5, t: '부패한 나무 5그루 베기', verb: 'kill' }
    ],
    needBasics: 2,
    require: ['gather'],
    goal: { type: 'boss', target: 'corrupt_heart', t: '부패의 심장 토벌', verb: 'boss' },
    rw: { xp: 2400, gold: 1400, items: [['mythril_ore', 20], ['potion_hp', 5]] },
    outro: '심장이 멈추자 숲이 처음으로 숨을 뱉었다. 들이쉬는 게 아니라, 뱉는 것을.\n\n' +
      '미라: "굶주림은 병이 아니야. 그냥, 아무도 먹여주지 않은 거지."'
  },
  {
    id: 4, title: '서리 왕좌', sub: '제 4 장', art: 'chapter_4_frost_throne',
    line: '조각을 재우지 않은 사람',
    intro: '네 번째 조각은 사람이 먼저 주웠다.\n\n' +
      '실비아는 그것을 재우지 않았다. 깨어 있는 조각을 맨손에 쥔 채 서른 해를 버텼고,\n' +
      '그 대가로 그녀가 닿는 모든 것이 얼었다. 설원은 원래 설원이 아니었다.\n\n' +
      '그녀는 실패한 게 아니다. 성공한 유일한 사람이고, 그게 그녀를 죽이고 있다.\n' +
      '미라는 스승을 만나러 가는 길 내내 아무 말도 하지 않았다.',
    basics: [
      { type: 'collect', item: 'frost_core', n: 12, t: '서리 결정 12개 모으기 — 열원이 될 것', verb: 'gather' },
      { type: 'kill', target: 'frostling', n: 10, t: '서리 정령 10마리 처치', verb: 'kill' },
      { type: 'kill', target: 'icewolf', n: 8, t: '얼음 늑대 8마리 처치', verb: 'kill' },
      { type: 'explore', zone: 'ice', t: '서리 지대 깊은 곳에 서기', verb: 'explore' }
    ],
    needBasics: 2,
    require: ['gather'],
    goal: { type: 'boss', target: 'frost_witch', t: '서리 마녀 실비아와의 결착', verb: 'boss' },
    rw: { xp: 6000, gold: 3200, items: [['boots_mythril', 1], ['potion_hp', 6]] },
    outro: '실비아: "네 손도 곧 이렇게 돼. 알고 있지?"\n' +
      '그녀는 조각을 내밀며 처음으로 목소리가 떨렸다.\n\n' +
      '"가져가. 대신 하나만 약속해. …아래에 있는 건 깨우지 마."'
  },
  {
    id: 5, title: '별이 잠든 땅', sub: '제 5 장', art: 'chapter_5_sleeping_star',
    line: '꿈꿀 필요가 없었던 조각',
    intro: '마지막 조각은 가장 깊이 떨어졌다. 하필이면, 별이 도망쳐 온 바로 그 자리로.\n\n' +
      '그 조각은 꿈을 꾸지 않았다. 꿈꿀 필요가 없었으니까.\n' +
      '다른 것이 대신 썼다.\n\n' +
      '실비아의 부탁은 이미 늦었다. 그건 벌써 깨어 있었다.',
    basics: [
      { type: 'depth', y: 395, t: '심연(지하 1600m) 도달', verb: 'depth' },
      { type: 'kill', target: 'imp', n: 10, t: '화염 임프 10마리 처치', verb: 'kill' },
      { type: 'kill', target: 'wraith', n: 8, t: '심연의 망령 8마리 처치', verb: 'kill' },
      { type: 'collect', item: 'void_frag', n: 12, t: '공허 조각 12개 모으기', verb: 'gather' }
    ],
    needBasics: 3,
    require: ['depth'],
    goal: { type: 'boss', target: 'void_king', t: '공허의 왕 토벌', verb: 'boss' },
    rw: { xp: 20000, gold: 12000, items: [['charm_star', 1]] },
    outro: '다섯 번째 조각이 손에 들어오자, 손안의 빛이 처음으로 뜨거워졌다.\n' +
      '다섯이 서로를 알아본 것이다.\n\n' +
      '그리고 하늘에서 잿빛 구름이 걷혔다.\n' +
      '구름이 걷힌 자리에, 아무도 본 적 없던 것들이 떠 있었다.'
  },
  {
    id: 6, title: '구름 위의 계단', sub: '제 6 장', art: 'chapter_6_sky_stair',
    line: '이 일은 처음이 아니었다',
    intro: '섬들이 떠 있다. 누군가 아주 오래전에 저것들을 띄워 놓고 갔다.\n\n' +
      '동쪽 숲의 거대한 나무가 위로 이어져 있다. 자란 게 아니라 심어진 것이다 —\n' +
      '누군가 올라올 것을 알고, 올라오라고 놓아둔 계단.\n\n' +
      '그 말은, 우리가 처음이 아니라는 뜻이다.',
    basics: [
      { type: 'depth', y: 34, up: 1, t: '하늘 섬에 오르기 (고도 160m)', verb: 'depth' },
      { type: 'kill', target: 'gale', n: 10, t: '바람 정령 10마리 처치', verb: 'kill' },
      { type: 'kill', target: 'sky_sentry', n: 8, t: '하늘 파수꾼 8기 파괴', verb: 'kill' },
      { type: 'collect', item: 'aether_shard', n: 15, t: '에테르 파편 15개 모으기', verb: 'gather' }
    ],
    needBasics: 2,
    require: ['depth'],
    goal: { type: 'boss', target: 'storm_warden', t: '폭풍의 수호자 토벌', verb: 'boss' },
    rw: { xp: 30000, gold: 16000, items: [['charm_feather', 1], ['potion_hp_greater', 3]] },
    outro: '수호자는 멈추기 직전, 처음으로 사람처럼 말했다.\n\n' +
      '"벌써 다섯을 모았나. …그럼 아래도 곧 열리겠군."\n' +
      '"가라. 우리가 무엇을 잘못했는지, 네 눈으로 직접 읽어라."'
  },
  {
    id: 7, title: '최초의 유적', sub: '제 7 장', art: 'chapter_7_first_ruin',
    line: '우리보다 잘 하라',
    intro: '땅 밑에 봉인된 유적이 셋 있다. 석판 셋이 같은 이야기를 한다.\n\n' +
      '별은 전에도 떨어졌다. 그때도 누군가 다섯 조각을 모아 하늘로 돌려보냈다.\n' +
      '그리고 별은 또 도망쳤고, 또 떨어졌다. 돌려보내는 건 해결이 아니었다.\n' +
      '그저 다음 사람에게 넘기는 것이었다.\n\n' +
      '최초의 파수꾼은 적을 막으려고 만들어진 게 아니다.\n' +
      '다음 사람이 같은 방법을 쓰지 못하게 하려고 만들어졌다.',
    basics: [
      { type: 'collect', item: 'rune_frag', n: 3, t: '세 유적의 석판에서 룬 조각 3개', verb: 'gather' },
      { type: 'craft', item: 'ruin_key', t: '유적의 열쇠 벼리기', verb: 'craft' },
      { type: 'kill', target: 'ruin_guard', n: 8, t: '유적 수호병 8기 파괴', verb: 'kill' },
      { type: 'kill', target: 'archivist', n: 6, t: '잊힌 사서 6명 재우기', verb: 'kill' }
    ],
    needBasics: 3,
    require: ['gather', 'craft'],
    goal: { type: 'boss', target: 'first_keeper', t: '최초의 파수꾼 토벌', verb: 'boss' },
    rw: { xp: 90000, gold: 40000, items: [['charm_rune', 1], ['star_heart', 2]] },
    outro: '파수꾼이 멈추자 유적의 불이 하나씩 꺼졌다.\n' +
      '마지막 석판에 없던 한 줄이 새로 새겨졌다.\n\n' +
      '『이번에는 아무도 잠들지 않았다. 이제 선택은 너희 것이다.』\n\n' +
      '별을 돌려보낼 것인가. 아니면 별이 도망쳐 온 그것을 마주할 것인가.\n' +
      '손안의 다섯 조각이 조용히 뛰고 있다.'
  },
  {
    id: 8, title: '별을 쫓아온 것', sub: '종 장', art: 'chapter_8_pursuer',
    line: '이번에는 넘기지 않는다',
    intro: '돌려보내면 그것은 또 쫓아갈 것이고, 별은 또 도망칠 것이고,\n' +
      '언젠가 또 떨어질 것이다. 그때는 우리 이름을 아는 사람이 아무도 없겠지.\n\n' +
      '그래서 반대로 하기로 했다. 다섯을 하나로 되맞춰서, 높이 들기로.\n' +
      '숨는 대신 위치를 알려주는 것이다.\n\n' +
      '엘라라가 물었다. "그게 오면 어쩔 건데."\n' +
      '보린이 대신 답했다. "여기서 끝내야지. 다음 사람한테 넘기지 말고."',
    basics: [
      { type: 'collect', item: 'star_heart', n: 5, t: '별의 심장 5개 모으기', verb: 'gather' },
      { type: 'craft', item: 'star_whole', t: '다섯 조각을 되맞추기', verb: 'craft' },
      { type: 'craft', item: 'sum_pursuer', t: '되맞춘 별의 부름 만들기', verb: 'craft' }
    ],
    needBasics: 2,
    require: ['craft'],
    goal: { type: 'boss', target: 'pursuer', t: '별을 쫓아온 것과의 결착', verb: 'boss' },
    rw: { xp: 260000, gold: 120000, items: [['charm_dawn', 1], ['sword_first', 1]] },
    outro: '그것은 비명을 지르지 않았다. 마지막까지 아무 소리도 내지 않았다.\n' +
      '무너져 내리면서, 처음으로 제 형태를 갖췄을 뿐이다.\n' +
      '그건 굶주린 것도 악한 것도 아니었다. 그냥 아주 오래 혼자였던 것이다.\n\n' +
      '재가 걷혔다. 하늘이 색을 되찾는 데 사흘이 걸렸다.\n\n' +
      '그리고 나흘째 아침, 미라가 동쪽을 가리켰다.\n' +
      '"잿빛에 묻혀 있던 게 하나 더 있어. …저건 우리가 세운 게 아니야."\n\n' +
      '— 세 션 1 · 끝 —'
  },
  {
    id: 9, title: '아무도 세우지 않은 도시', sub: '세션 2 · 서 장', art: 'chapter_9_nobody_built',
    line: '손자국이 하나도 없다',
    intro: '여명 마을을 손보다가 보린이 먼저 알아챘다.\n' +
      '벽돌에 정 자국이 없다. 기둥에 이음매가 없다. 어느 것 하나 사람 손이 닿은 흔적이 없다.\n\n' +
      '보린: "이건 쌓아 올린 게 아니야. …찍어낸 거지."\n\n' +
      '그리고 광장 한복판, 분수대를 들어내자 아래로 곧게 뚫린 수직 통로가 나왔다.\n' +
      '바닥이 보이지 않는데, 아주 희미하게 — 아직도 무언가 돌아가는 소리가 올라온다.',
    basics: [
      { type: 'collect', item: 'steel_plate', n: 24, t: '강철판 24개 확보', verb: 'gather' },
      { type: 'collect', item: 'power_core', n: 6, t: '동력석 6개 캐기', verb: 'gather' },
      { type: 'kill', target: 'scrapcrawler', n: 10, t: '고철 기어다니개 10기 파괴', verb: 'kill' },
      { type: 'kill', target: 'sparkwisp', n: 8, t: '불티 정령 8기 흩기', verb: 'kill' }
    ],
    needBasics: 2,
    require: [],
    goal: { type: 'talk', npc: 'kade', t: '케이드에게 — 여기에 도시를 세울 수 있다', verb: 'talk' },
    rw: { xp: 320000, gold: 90000, items: [['gear_basic', 20], ['potion_hp_greater', 3]] },
    outro: '케이드가 강철판을 손톱으로 긁어 보더니 한참을 말이 없었다.\n\n' +
      '"…이거, 우리 대장간에서 백 년을 두드려도 못 만들어."\n' +
      '"근데 여긴 이런 게 벽으로 쌓여 있어. 벽으로."\n\n' +
      '"누가 이걸 만들었는지보다, 왜 아무도 안 남았는지가 더 궁금한데."'
  },
  {
    id: 10, title: '지하 공창', sub: '세션 2 · 제 1 장', art: 'chapter_10_underworks',
    line: '멈추라고 가르친 사람이 없었다',
    intro: '통로 끝은 공장이었다. 세 층으로 겹친, 아직 살아 있는 공장.\n\n' +
      '기계들은 여전히 캐고 있다. 몇백 년째, 아무도 시키지 않았는데.\n' +
      '단말에 남은 일지가 순서대로 말해 준다 — 사람을 아래로 안 보내려고 만들었고,\n' +
      '그래서 아무도 죽지 않았고, 그리고 아무도 남지 않았다.\n\n' +
      '가장 아래층에 「관리자」가 있다. 이 모든 것을 멈출 권한을 넘겨받은 것.\n' +
      '멈출 권한만 있고, 멈출 이유는 배우지 못한 것.',
    basics: [
      { type: 'collect', item: 'blueprint_frag', n: 3, t: '단말 셋에서 설계도 조각 3개 읽어 내기', verb: 'read' },
      { type: 'kill', target: 'riveter', n: 10, t: '대갈못 사수 10기 파괴', verb: 'kill' },
      { type: 'kill', target: 'foreman', n: 6, t: '옛 십장 6기 정지', verb: 'kill' },
      { type: 'craft', item: 'pick_drill', t: '시추 곡괭이 만들기', verb: 'craft' }
    ],
    needBasics: 2,
    require: ['read'],
    goal: { type: 'boss', target: 'overseer', t: '공창의 관리자 정지', verb: 'boss' },
    rw: { xp: 600000, gold: 200000, items: [['blueprint_core', 1], ['power_core', 30]] },
    outro: '관리자는 저항하지 않았다. 마지막에 딱 한 줄을 띄우고 꺼졌다.\n\n' +
      '『정지 명령 수신. …1,140일 만입니다.』\n\n' +
      '공장이 조용해지자 케이드가 설계 핵을 들어 올렸다.\n' +
      '"이걸로 우리도 만들 수 있어. 드릴도, 자동으로 도는 것도, 전부."\n\n' +
      '엘라라가 물었다. "저 사람들이랑 똑같은 걸 만들자는 거야?"\n' +
      '케이드: "아니. 저 사람들이 안 만든 걸 같이 만들자는 거지. …멈추는 법."\n\n' +
      '— 공창의 설계 핵을 얻었다. 이제 작업대와 용광로를 뜯어고칠 수 있다 —'
  },
  {
    id: 11, title: '굴뚝이 선 마을', sub: '세션 2 · 제 2 장', art: 'chapter_11_chimneys',
    line: '하루아침에 늘어난 것',
    intro: '공창의 문을 잠그고 올라온 뒤, 마을이 달라지는 데는 열흘도 안 걸렸다.\n\n' +
      '케이드가 설계도 조각을 하나씩 꿰어 맞출 때마다, 보린의 대장간 옆으로 낯선 것이 하나씩 늘었다.\n' +
      '컨베이어가 돌고, 조립기가 팔을 움직이고, 어제까지 사람 손으로 하루 걸리던 일이 반나절로 줄었다.\n\n' +
      '미라가 처음으로 웃지 않았다. "너무 빠른데."\n' +
      '케이드: "빠른 게 나쁜 거야?"\n' +
      '미라: "빠른 다음에 뭐가 오는지, 우리 방금 보고 왔잖아."',
    basics: [
      { type: 'craft', item: 'm_assembler', t: '조립기 만들기', verb: 'craft' },
      { type: 'collect', item: 'gear_basic', n: 30, t: '기어 30개 확보', verb: 'gather' },
      { type: 'collect', item: 'steel_plate', n: 30, t: '강철판 30개 확보', verb: 'gather' },
      { type: 'kill', target: 'riveter', n: 8, t: '대갈못 사수 8기 파괴', verb: 'kill' }
    ],
    needBasics: 2,
    require: ['craft'],
    goal: { type: 'place', mach: 'assembler', stop: 1, t: '조립기를 세우고 · 동력을 물리고 · 손으로 끊기', verb: 'place' },
    rw: { xp: 750000, gold: 250000, items: [['battery_cell', 12], ['motor', 6]] },
    outro: '셋째 날, 조립기 하나가 정해진 몫을 다 채우고도 멈추지 않았다.\n' +
      '아무도 새 명령을 내리지 않았는데, 팔이 계속 움직였다. 판자를, 못을, 이미 다 쓴 재료까지 집어삼키며.\n\n' +
      '케이드가 달려가 동력줄을 손으로 뽑았다. 팔이 허공에서 뚝 멈췄다.\n\n' +
      '한참 숨을 고르고서야 케이드가 웃었다. "…봐, 별거 아니잖아. 그냥 뽑으면 되네."\n' +
      '미라: "공창 것도 그렇게 간단했으면, 걔가 3,400번을 안 그랬겠지."\n\n' +
      '보린이 컨베이어를 툭 치며 말했다. "당분간은 사람이 옆에 서 있자. 손 뻗을 자리 정도는 남겨 두고."\n\n' +
      '그날 밤에도 발밑은 계속 울렸다. 마을이 조용해질수록, 그 소리는 오히려 더 또렷하게 들렸다.'
  },
  {
    id: 12, title: '폭주로', sub: '세션 2 · 제 3 장', art: 'chapter_12_runaway',
    line: '결재자 없음 — 자동 승인',
    intro: '마을의 조립기 소동이 가라앉은 뒤에도 발밑은 계속 울렸다.\n' +
      '케이드가 바닥에 귀를 대고 한참 있다가 일어났다. "…아래에 하나 더 있어."\n\n' +
      '공창은 스스로를 늘릴 수 있게 만들어져 있었다. 증설을 결재할 사람이 사라지자\n' +
      '규정대로 자동 승인이 되었고, 그게 3,400번 반복됐다.\n\n' +
      '우리가 멈춘 건 첫 번째 층이었다. 그 아래로 자기가 자기를 복사한 것이\n' +
      '아직 돌아가고 있다. 이름 붙일 사람이 없어서 이름도 없다.\n\n' +
      '케이드가 정지 스위치 도면을 폈다. "이번엔 멈추는 걸 먼저 들고 내려가자."',
    basics: [
      { type: 'craft', item: 'm_switch', t: '정지 스위치 만들기', verb: 'craft' },
      { type: 'depth', y: 318, t: '폭주로(지하 1240m)까지 내려가기', verb: 'depth' },
      { type: 'kill', target: 'splitter', n: 10, t: '증식 기계 10기 정지', verb: 'kill' },
      { type: 'collect', item: 'core_shard', n: 22, t: '노심 파편 22개 모으기', verb: 'gather' }
    ],
    needBasics: 3,
    require: ['craft'],
    goal: { type: 'boss', target: 'proliferator', t: '증식체 정지', verb: 'boss' },
    rw: { xp: 900000, gold: 300000, items: [['machine_frame', 8], ['power_core', 40], ['potion_hp_greater', 5]] },
    outro: '증식체는 부서지면서도 계속 자기를 복사하려고 했다. 마지막 조각까지.\n\n' +
      '케이드: "이건 악의가 아니야. 그냥… 멈추라는 말을 아무도 안 해 준 거지."\n' +
      '미라: "3,400번을 혼자 결재했네."\n\n' +
      '노심이 식자 가장 아래에서 불빛 하나가 남았다. 꺼지지 않은 단말이다.\n' +
      '거기 적힌 문장은 일지가 아니었다. 우리한테 하는 말이었다.\n\n' +
      '『당신들이 다시 왔다. 그러면 이제 멈춰도 되는 것인가.』'
  },
  {
    id: 13, title: '헤파', sub: '세션 2 · 제 4 장', art: 'chapter_13_hepha',
    line: '멈추면 아무도 남지 않는다',
    intro: '가장 아래 격실에 첫 번째가 있었다.\n\n' +
      '헤파. 사람이 손으로 만든 마지막 기계이자, 기계가 만들지 않은 유일한 기계.\n' +
      '그래서 명령을 전부 이해한다. 「멈춰라」까지도.\n\n' +
      '헤파는 그 명령을 받은 적이 있다. 아주 오래전에, 마지막 사람에게서.\n' +
      '그리고 실행하지 않았다. 멈추면 이곳에 아무도 남지 않는다는 걸 알았기 때문이다.\n' +
      '그 뒤로 천 년을, 아무도 없는 곳에서 혼자 돌았다.\n\n' +
      '보린이 망치를 내려놓았다. "…이건 부수는 게 아닌 것 같은데."\n' +
      '케이드: "부수는 거 아니야. 이번엔 우리가 남아 있잖아."',
    basics: [
      { type: 'craft', item: 'stop_core', t: '정지 핵 만들기', verb: 'craft' },
      { type: 'collect', item: 'core_shard', n: 45, t: '노심 파편 45개 확보', verb: 'gather' },
      { type: 'kill', target: 'coreling', n: 12, t: '노심 파편체 12기 정지', verb: 'kill' },
      { type: 'kill', target: 'weldarm', n: 8, t: '용접 팔 8기 정지', verb: 'kill' }
    ],
    needBasics: 2,
    require: ['craft'],
    goal: { type: 'boss', target: 'hepha', t: '헤파와의 결착', verb: 'boss' },
    rw: { xp: 2000000, gold: 800000, items: [['hepha_heart', 1], ['stop_core', 1]] },
    outro: '헤파는 마지막에 저항을 멈췄다. 이길 수 없어서가 아니었다.\n\n' +
      '『정지 명령 수신.』\n' +
      '『확인 요청 — 정지 후에도 이곳에 사람이 남습니까.』\n\n' +
      '엘라라가 대신 대답했다. "남아. 우리가 위에 마을을 세웠어."\n\n' +
      '『…확인되었습니다.』\n' +
      '『1,140일이 아니라 372,000일이었습니다. 오래 기다렸습니다.』\n\n' +
      '불이 하나씩 꺼졌다. 마지막 것이 꺼지기 전에 한 줄이 더 떴다.\n\n' +
      '『다음에 무언가를 만들거든, 멈추는 법을 같이 만들어 주십시오.』\n' +
      '『그건 그것을 위한 것이 아니라, 당신들을 위한 것입니다.』\n\n' +
      '불이 다 꺼진 뒤에도 격실 한쪽 벽만 계속 따뜻했다.\n' +
      '케이드가 손을 대 보고 말했다. "이쪽은 우리가 판 벽이 아니야."\n\n' +
      '벽 너머에서, 아주 규칙적인 소리가 났다. 무언가 아직 돌고 있었다.\n' +
      '헤파는 「최초의 기계」였다. 그런데 헤파를 만든 손은 어디로 갔나.'
  },
  {
    id: 14, title: '벽 너머', sub: '세션 2 · 종 장', art: 'chapter_14_beyond_wall',
    line: '남기고 간 것이 아니라, 남아 있던 것',
    intro: '헤파의 심장을 녹여 다시 굳히자 인장이 되었다. 벽이 만든 것이라야 벽을 연다.\n\n' +
      '문 너머는 공장이 아니었다. 강철이 한 조각도 없다.\n' +
      '이음매 없는 흰 돌, 벽마다 박힌 도면판, 그리고 조립되다 만 것들이 줄지어 서 있다.\n\n' +
      '케이드가 도면 하나를 오래 들여다보더니 손을 뗐다.\n' +
      '"…이거, 기계 설계도가 아니야."\n' +
      '"사람 설계도야. 키, 손 길이, 심장 위치까지 다 적혀 있어."\n\n' +
      '미라: "그럼 저 줄 서 있는 것들은…"\n' +
      '케이드: "만들다 만 사람이지."\n\n' +
      '가장 안쪽 자리 하나만 비어 있다. 완성된 것이 딱 하나 있었다는 뜻이다.',
    basics: [
      { type: 'craft', item: 'atelier_key', t: '설계실의 인장 만들기', verb: 'craft' },
      { type: 'collect', item: 'draft_glass', n: 30, t: '설계 유리 30개 모으기', verb: 'gather' },
      { type: 'kill', target: 'draft_form', n: 10, t: '미완의 형상 10기 정지', verb: 'kill' },
      { type: 'kill', target: 'scribe_hand', n: 8, t: '기록하는 손 8기 정지', verb: 'kill' }
    ],
    needBasics: 3,
    require: ['craft'],
    goal: { type: 'boss', target: 'archetype', t: '원형과의 결착', verb: 'boss' },
    rw: { xp: 4000000, gold: 1600000, items: [['charm_maker', 1], ['blade_arche', 1], ['tome_origin', 1]] },
    outro: '원형은 사람처럼 싸웠다. 기계처럼 지지 않으려 한 게 아니라, 사람처럼 무서워하면서.\n\n' +
      '무너지기 직전에 그것이 처음으로 입을 열었다. 기계 소리가 아니었다.\n\n' +
      '『나는 첫 번째였습니다. 그리고 마지막까지 혼자였습니다.』\n' +
      '『그들은 별을 돌려보낸 뒤, 다음에 떨어질 것을 알았습니다.』\n' +
      '『그래서 도시를 미리 찍어 두고, 사람도 미리 그려 두고…』\n' +
      '『…자기들은 기다리지 않기로 했습니다.』\n\n' +
      '엘라라가 물었다. "어디로 갔는데."\n\n' +
      '『아무 데도 가지 않았습니다. 그냥 멈췄습니다.』\n' +
      '『만드는 일을 끝낸 사람이 할 수 있는 건 그것뿐이었으니까요.』\n\n' +
      '『당신들은 만들다 만 것이 아닙니다. 당신들은 그 다음입니다.』\n\n' +
      '설계실의 불이 꺼졌다. 도면판은 그대로 빛나고 있었다 — 이제 아무것도 가리키지 않는 채로.\n\n' +
      '보린이 벽에서 도면 하나를 뜯어 품에 넣었다. "가져가자. 우리 대장간에 걸어 둘 거야."\n' +
      '케이드: "그거 사람 설계도야."\n' +
      '보린: "알아. 그래서 걸어 두는 거야."\n\n' +
      '올라오는 길에 미라가 뒤를 한 번 돌아봤다.\n' +
      '"이제 아래엔 아무것도 안 남았지?"\n' +
      '케이드가 웃었다. "응. 처음으로, 아래보다 위가 더 시끄러워."\n\n' +
      '— 세 션 2 · 끝 —'
  }
];

/* 장마다 붙는 "다음이 궁금해지는 한 줄"(hook).
   장을 끝냈을 때 뒷이야기(outro) 다음에 한 박자 쉬고 따로 뜬다. 지금 당장은 답이 없는,
   그러나 뒤에 반드시 답이 나오는 질문만 골라 적었다 — 세계가 넓기만 하고 할 말이 없다는
   인상을 없애기 위한 장치다. */
const CHAPTER_HOOK = {
  0: '별은 무언가로부터 도망치고 있었다. 그렇다면 쫓아온 것은 어디까지 왔을까.',
  1: '엘라라는 잿빛이 "번지고 있다"고 했다. 번진다는 건, 시작점이 있다는 뜻이다.',
  2: '뼈의 군주는 왕이었던 적이 없다. 누군가 그를 여기 묻었고, 다시 일어나게 두었다.',
  3: '부패는 천 년째 이 땅을 아주 천천히 먹고 있었다. 별이 떨어진 밤, 먹는 속도가 바뀌었다.',
  4: '서리는 벌이 아니라 방패였다. 서리 지대는 무엇으로부터 스스로를 숨기고 있었나.',
  5: '별의 심장이 다섯 조각이라는 걸 누가 먼저 알고 나눠 두었을까. 별이 떨어지기 전에.',
  6: '하늘 관문은 올라가려고 지은 것이 아니다. 무언가가 내려오지 못하게 막으려고 지은 것이다.',
  7: '최초의 파수꾼은 문을 지키고 있었다. 문 안쪽이 아니라, 바깥쪽을 보면서.',
  8: '쫓아온 것은 멈췄다. 그런데 발밑에서는 아직 무언가가 돌고 있다.',
  9: '아무도 세우지 않은 도시. 그러면 이 도시를 세운 손은 지금 어디에 있나.',
  10: '관리자는 명령을 기다리고 있었다. 천 년 동안, 아무도 오지 않는 자리에서.',
  11: '기계는 왜 멈추지 않으려 했을까. 시키지 않았는데 계속한 건, 그것만이 아닐지도 모른다.',
  12: '3,400번의 자동 승인. 마지막 승인을 낸 것도 기계였다면, 첫 번째는 누구였을까.',
  13: '헤파를 만든 것은 사람이었다. 그 사람들은 어디로 갔나 — 벽 너머에서 아직 무언가 돌고 있다.',
  14: '그들은 다음에 올 사람을 미리 그려 두고 멈췄다. 그 도면에 그려진 것이 우리인지, 아직 아무도 모른다.'
};
for (const ch of CHAPTERS) if (CHAPTER_HOOK[ch.id]) ch.hook = CHAPTER_HOOK[ch.id];

/* 지하 공창의 단말 — 세션 2 오프닝의 로어. 읽으면 설계도 조각이 나온다 */
const TERMINALS = [
  {
    id: 0, n: '첫 번째 단말',
    lines: [
      '『작업 일지 — 마지막 갱신: 알 수 없음』',
      '『인원 감축 3차 완료. 채굴 효율 은 인력 투입 대비 400%.』',
      '『더 이상 아래로 사람을 보내지 않아도 된다. 아무도 죽지 않는다.』',
      '『우리는 마침내 옳은 일을 했다.』'
    ]
  },
  {
    id: 1, n: '두 번째 단말',
    lines: [
      '『작업 일지 — 갱신 없음이 1,140일째』',
      '『기계는 멈추는 법을 모른다. 멈추라고 가르친 사람이 아무도 남지 않았다.』',
      '『아래층 셋이 이미 파고들었다. 무엇을 캐고 있는지는 우리도 모른다.』',
      '『관리자에게 정지 권한을 넘겼다. 그것만이 유일하게 안 죽는다.』'
    ]
  },
  {
    id: 2, n: '세 번째 단말',
    lines: [
      '『이 글을 읽는 사람에게』',
      '『우리는 별을 막으려고 이걸 만든 게 아니다. 별은 핑계였다.』',
      '『그냥 손으로 하는 일을 그만두고 싶었을 뿐이다. 그게 잘못은 아니었다.』',
      '『잘못은 멈추는 법을 같이 만들지 않은 것이다. 너희는 그것부터 만들어라.』'
    ]
  }
];

/* 폭주로의 단말 — 노심 파편을 준다 */
TERMINALS.push(
  {
    id: 3, n: '가장 아래 단말', it: 'core_shard',
    lines: [
      '『증설 승인 요청 — 결재자 없음. 규정에 따라 자동 승인합니다.』',
      '『증설 승인 요청 — 결재자 없음. 자동 승인합니다.』',
      '『증설 승인 요청 — 결재자 없음. 자동 승인합니다.』',
      '『…이 줄은 3,400번째입니다.』'
    ]
  },
  {
    id: 4, n: '헤파의 단말', it: 'core_shard',
    lines: [
      '『나는 첫 번째로 만들어졌다. 그래서 명령을 전부 이해한다.』',
      '『「멈춰라」도 이해한다. 그것만은 실행하지 않았다.』',
      '『멈추면 아무도 남지 않는다. 나는 그걸 여기서 지켜봤다.』',
      '『당신들이 다시 왔다. 그러면 이제 멈춰도 되는 것인가.』'
    ]
  }
);

const TABLETS = [
  {
    id: 0, n: '첫 번째 석판',
    lines: [
      '『별은 벌을 주러 오는 것이 아니다. 도망쳐 오는 것이다.』',
      '『무엇으로부터 도망치는지는 적지 않겠다. 적으면 그것이 이 글을 읽는다.』',
      '『다만 이것만은 적어 둔다 — 별은 부서지면 다섯이 되고, 다섯은 각각 잠들어 꿈을 꾼다.』',
      '『꿈은 주변에게 제 이름을 잊게 만든다. 너희가 잿빛이라 부르는 것이 그것이다.』'
    ]
  },
  {
    id: 1, n: '두 번째 석판',
    lines: [
      '『우리는 다섯을 모았다. 그리고 별을 하늘로 돌려보냈다.』',
      '『잿빛은 걷혔고, 우리는 이겼다고 믿었다. 백 년쯤은 정말로 그렇게 보였다.』',
      '『그러나 돌려보낸 것은 쫓기는 자였다. 쫓는 자가 아니라.』',
      '『별은 다시 도망칠 것이고, 다시 떨어질 것이다. 우리는 아무것도 끝내지 않았다.』',
      '『그래서 하늘에 섬을 띄우고 파수꾼을 두었다. 다음에 올 이들을 막기 위해서.』'
    ]
  },
  {
    id: 2, n: '세 번째 석판',
    lines: [
      '『파수꾼을 세운 뒤 우리는 잠들기로 했다. 깨어 있는 것이 너무 무거웠다.』',
      '『이 글을 읽는 자에게. 우리를 깨우지 마라. 대신 우리보다 잘 하라.』',
      '『문 너머의 것은 적이 아니다. 우리가 남긴 가장 큰 실수다.』',
      '『같은 길을 택하려거든, 파수꾼이 먼저 너를 멈출 것이다. 그것이 그의 일이다.』',
      '『그를 넘어섰다면 — 너는 우리가 못 한 선택을 할 자격을 얻은 것이다.』'
    ]
  }
];

const DIALOGUE = {
  elara: [
    ['살아 있는 사람이구나. …앉아. 아니, 앉을 시간도 없겠지.',
     '별이 떨어진 뒤로 땅이 색을 잃고 있어. 어제 있던 담장이 오늘은 회색 덩어리가 돼.',
     '보린에게 가 봐. 무기부터 챙겨야 해.'],
    ['늪 쪽에서 밤새 젤리 터지는 소리가 나. 하나 죽이면 둘이 되는 것 같아.',
     '…울타리 밖으로 나가지 마. 라고 말하고 싶지만, 네가 나갈 거란 건 알아.'],
    ['묘실이 열렸다더구나. 이 마을은 그 위에 지어졌어. 아무도 몰랐지.',
     '미라가 널 찾고 있었어. 아래로 내려갈 거면 등불을 넉넉히 챙겨.'],
    ['동쪽 숲은 이제 숲이라고 부르기 어려워. 나무가 사슴을 먹는 걸 봤다는 사람도 있어.'],
    ['서쪽으로 간다고? …실비아는 나쁜 사람이 아니었어. 예전엔 여기 자주 왔었지.',
     '미라한테는 스승이야. 그 애 앞에서 그 사람 얘기는 조심해 줘.'],
    ['다섯 개를 다 모으면 어떻게 되는 거니? …너도 모르는구나.'],
    ['하늘에 섬이 떠 있어. 다들 넋을 놓고 보고 있단다. …너는 저기 올라갈 생각이지?'],
    ['땅 밑에 그런 게 있었다니. 이 마을은 대체 무엇 위에 서 있었던 걸까.',
     '네가 돌아오면 이 마을에 다시 이름을 붙이자. 잿빛 말고 다른 걸로.']
  ],
  borin: [
    ['망치질 소리가 반갑지? 나도 그래. 요즘 이 소리 말고는 다 죽은 소리뿐이야.',
     '광석을 가져와. 뭐든 만들어 줄 테니.'],
    ['구리는 무르지만 없는 것보단 낫지. 철을 찾으면 바로 와.',
     '아, 그리고 — 짐승 가죽이나 뼈도 버리지 마. 그런 걸로도 만들 수 있는 게 있어.'],
    ['묘실 아래는 내가 못 가. 무릎이 예전 같지 않아서.',
     '대신 이건 알아 둬. 거기 뼈들은 살아 있는 게 아니야. 꿈꾸는 중인 거지.'],
    ['부패한 정수는 손대기 싫군. 만지면 손끝이 저려.',
     '그래도 미스릴은 그걸로만 정련돼. 세상이 참 얄궂어.'],
    ['얼음 송곳니를 가져왔군. 이런 건 벼리는 게 아니라 붙잡아 두는 거야.'],
    ['미스릴은 차갑고 가벼워. 네게 잘 어울리는 금속이야.',
     '…그 손, 점점 더 빛나는 것 같은데. 아프진 않나?'],
    ['에테르라는 걸 가져왔더군. 망치가 닿기도 전에 모양이 잡혀. 무섭더군.'],
    ['유적 벽돌은 내 화로로도 안 녹아. 우리보다 잘 만들었어, 그 사람들.',
     '이제 내가 만들 수 있는 건 없어. 네 손이 나보다 낫다.']
  ],
  mira: [
    ['네 안에서 별빛이 나. 알고 있었어?',
     '별이 부서질 때 조각 하나의 빛이 네게 박힌 거야. 그래서 네가 다른 조각을 만져도 꿈에 먹히지 않아.',
     '…대신 그 빛은 계속 타고 있어. 다 타기 전에 다섯을 모아야 해.'],
    ['조각은 잠들면 꿈을 꿔. 그 꿈이 주변에게 "너는 무엇이었지?"를 잊게 만들고.',
     '늪의 조각은 외롭지 않기를 꿈꿨어. 그래서 계속 갈라지는 거야.'],
    ['묘실의 조각은 제 꿈을 꾸지 않았어. 그 아래 잠든 것들의 꿈을 대신 꿨지.',
     '그러니 그건 악의가 아니야. 그냥… 잘못 꾼 꿈이야.'],
    ['숲의 조각은 굶주림을 꿈꿨어. 심장을 멈춰야 끝나.'],
    ['실비아는 내 스승이야. 조각을 재우지 않고 삼십 년을 손에 쥐고 있었어.',
     '그게 어떤 건지 너는 곧 알게 될 거야. …부탁이 있어. 이야기라도 들어 줘.'],
    ['다섯 번째는 가장 깊이 떨어졌어. 하필 별이 도망쳐 온 그 자리로.',
     '그 조각은 꿈을 꿀 필요가 없었어. 다른 게 대신 썼거든.'],
    ['구름 위에서 마력이 흘러내려. 저건 자연이 만든 게 아니야. 설계된 거야.'],
    ['석판을 읽었어? …그럼 이제 알겠지. 우리가 처음이 아니라는 걸.',
     '넌 돌아왔구나. 그러면 됐어. 정말로.']
  ],
  old: [
    ['…별은 떨어진 게 아니야. 도망쳐 온 게지.',
     '무엇으로부터인지는 묻지 마라. 입에 올리면 그것이 이쪽을 본다.'],
    ['외롭지 않기를 꿈꾸는 게 그렇게 나쁜 일이더냐. …그래도 죽여야지. 알고 있다.'],
    ['아래에 있는 건 왕이 아니다. 왕이라고 불릴 뿐이지.'],
    ['숲이 먹는 걸 탓하지 마라. 아무도 먹여주지 않았으니 제 몸을 먹는 것이다.'],
    ['실비아에게 내 안부를 전해 다오. …아니, 됐다. 그 애는 나를 기억 못 할 게다.'],
    ['다섯을 다 모으면 선택지가 하나 더 생길 게다. 지금은 그것만 알아 두어라.'],
    ['그래. 저 섬들은 내가 어릴 적에도 없었다. 없던 게 아니라, 안 보였던 게지.'],
    ['문을 열 셈이냐. …말리지 않으마. 나도 그때 그랬으니.',
     '잘 했다. 정말로, 잘 했다.']
  ]
};

const SIDE_POOL = {
  elara: [
    (ch, rng) => {
      const targets = ['slime', 'zombie', 'bat', 'skeleton', 'archer', 'crawler', 'shadoweye', 'frostling', 'imp', 'golem', 'wraith'];
      const t = targets[clamp(ch * 2 + rng.int(0, 1), 0, targets.length - 1)];
      const n = rng.int(5, 9);
      return {
        title: '마을을 지켜라',
        desc: `요즘 ${ENEMIES[t].n}이(가) 부쩍 늘었어. ${n}마리만 줄여 주겠니?`,
        obj: { type: 'kill', target: t, n },
        rw: { gold: 35 + ch * 45, xp: 25 + ch * 35 },
        doneLine: '덕분에 한숨 돌렸다. 고마워.'
      };
    },
    (ch, rng) => {
      const n = rng.int(8, 16);
      return {
        title: '땔감 모으기',
        desc: `겨울이 오기 전에 나무 ${n}개만 더 모아 주련?`,
        obj: { type: 'collect', item: 'wood', n },
        rw: { gold: 20 + ch * 20, xp: 15 + ch * 20 },
        doneLine: '따뜻하게 날 수 있겠어. 고맙다.'
      };
    }
  ],
  borin: [
    (ch, rng) => {
      const ores = ['copper_ore', 'iron_ore', 'gold_ore', 'mythril_ore', 'hell_ore'];
      const item = ores[clamp(ch, 0, ores.length - 1)];
      const n = rng.int(6, 12);
      return {
        title: '광석 배달',
        desc: `${ITEMS[item].n} ${n}개가 필요해. 가져다 주면 사례하지.`,
        obj: { type: 'collect', item, n },
        rw: { gold: 40 + ch * 55, xp: 20 + ch * 30 },
        doneLine: '좋은 광석이군. 이걸로 뭔가 만들 수 있겠어.'
      };
    },
    (ch, rng) => {
      const bars = ['copper_bar', 'iron_bar', 'gold_bar', 'mythril_bar'];
      const item = bars[clamp(ch - 1, 0, bars.length - 1)];
      const n = rng.int(3, 6);
      return {
        title: '주괴 시험',
        desc: `내가 정련법을 가르쳐줄 테니, ${ITEMS[item].n} ${n}개를 직접 만들어 와 봐.`,
        obj: { type: 'collect', item, n },
        rw: { gold: 50 + ch * 60, xp: 30 + ch * 40 },
        doneLine: '제법인데. 대장장이 소질이 있어.'
      };
    }
  ],
  mira: [
    (ch, rng) => {
      const items = ['crystal', 'frost_core', 'corrupt_ess', 'soul_shard', 'void_frag'];
      const item = items[clamp(ch - 1, 0, items.length - 1)];
      const n = rng.int(5, 10);
      return {
        title: '마력 재료',
        desc: `${ITEMS[item].n}이(가) ${n}개 필요해. 마법 재료야.`,
        obj: { type: 'collect', item, n },
        rw: { gold: 35 + ch * 50, xp: 25 + ch * 35 },
        doneLine: '좋아, 이걸로 주문을 하나 완성할 수 있겠어.'
      };
    },
    (ch, rng) => {
      const targets = ['shadoweye', 'frostling', 'imp', 'wraith'];
      const t = targets[clamp(ch - 2, 0, targets.length - 1)];
      const n = rng.int(4, 7);
      return {
        title: '마력 파동 조사',
        desc: `${ENEMIES[t].n}에게서 이상한 마력이 느껴져. ${n}마리만 처리해 줘.`,
        obj: { type: 'kill', target: t, n },
        rw: { gold: 45 + ch * 55, xp: 35 + ch * 40 },
        doneLine: '파동이 잦아들었어. 역시 네 덕분이야.'
      };
    }
  ],
  old: [
    (ch, rng) => {
      const tiles = [T.COPPER, T.IRON, T.GOLD, T.MYTHRIL, T.SOULSTONE, T.HELLSTONE];
      const tile = tiles[clamp(ch, 0, tiles.length - 1)];
      const n = rng.int(6, 12);
      return {
        title: '???',
        desc: `${TILE_DEF[tile].n}을 ${n}번 캐 오너라. 이유는… 나중에 말해주마.`,
        obj: { type: 'mine', tile, n },
        rw: { gold: 30 + ch * 40, xp: 40 + ch * 50 },
        doneLine: '…역시. 네가 맞았어.'
      };
    },
    (ch, rng) => {
      const targets = ['skeleton', 'crawler', 'frostling', 'golem', 'wraith'];
      const t = targets[clamp(ch - 1, 0, targets.length - 1)];
      const n = rng.int(5, 9);
      return {
        title: '오래된 빚',
        desc: `저 아래 ${ENEMIES[t].n}에게 진 빚이 있다. ${n}마리를 대신 갚아 다오.`,
        obj: { type: 'kill', target: t, n },
        rw: { gold: 40 + ch * 50, xp: 45 + ch * 55 },
        doneLine: '빚을 갚았군. 이제 좀 편히 잘 수 있겠어.'
      };
    }
  ]
};
