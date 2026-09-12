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
  POD0: 141, POD1: 142, POD2: 143, POD3: 144,
  /* --- v1.1: 유적마다 그곳에서만 나오는 장식 둘 ---
     여태 유적 장식은 전부 **다른 데서 가져다 쓴 타일**이었다 — 얼음 던전은 동굴의
     얼음, 피라미드는 사막의 사암, 광산은 마을의 널판. 벽 색만 다르고 안에 놓인
     것은 세계 어디서나 보던 것들이라, 어느 유적인지는 벽돌 색으로만 갈렸다.
     이제 다섯 유적이 저마다 **여기서만 볼 수 있는 것 둘**을 갖는다.
     하나는 벽에 있고 하나는 바닥·천장에 있다 — 눈이 두 군데에서 걸리게. */
  ICEBANNER: 145, FROSTGLYPH: 146,      // 얼음 던전 — 언 깃발 · 서리 글자
  CANOPIC: 147, HIEROGLYPH: 148,        // 피라미드 — 장기 단지 · 새긴 벽
  MINELAMP: 149, TOOLPILE: 150,         // 버려진 광산 — 매단 갱등 · 버린 연장
  BLIGHTSAC: 151, BONEHEAP: 152,        // 부패한 둥지 — 알주머니 · 삭은 뼈
  SPOREVENT: 153, HYPHAE: 154           // 포자 굴 — 포자 구멍 · 균사 발
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
  { n: '불씨 꼬투리', c: '#e8842a', solid: 0, hard: 0, drop: 'emberpod', crop: { ripe: 1, seed: 'seed_emberpod' }, light: 5 },
  /* --- v1.1: 유적 고유 장식 열 ---
     ★ 통행 규칙(world.js putRuinDecor 참고)이 재질을 정한다.
       걷는 줄(fy·fy-1)에 놓이는 것은 반드시 solid 0 이어야 한다 — 고체를 놓으면
       방문을 그대로 봉해서 유적 절반이 못 들어가는 곳이 된다.
       벽을 갈아끼우는 것(statue 자리)만 solid 1 로 둔다.
     ★ 캐면 그 유적의 재료가 나온다. 장식이 곧 그 유적을 터는 이유가 된다 —
       예전 장식은 전부 캐 봐야 원래 타일(얼음·사암·널판)이 나와서, 보고 지나칠
       뿐 손댈 까닭이 없었다. */
  { n: '언 깃발', c: '#7fb6cc', solid: 0, hard: 0, drop: 'neverthaw', a: 1 },
  { n: '서리 글자', c: '#9fd8ea', solid: 1, hard: 2, drop: 'neverthaw', light: 3 },
  { n: '장기 단지', c: '#c8a86a', solid: 0, hard: 0, drop: 'sealed_ash', a: 1 },
  { n: '새긴 벽', c: '#b09054', solid: 1, hard: 2, drop: 'sealed_ash' },
  { n: '매단 갱등', c: '#e8b45a', solid: 0, hard: 0, drop: 'deep_ember', light: 7, a: 1 },
  { n: '버린 연장', c: '#7a6a56', solid: 0, hard: 0, drop: 'deep_ember', a: 1 },
  { n: '알주머니', c: '#8a4a80', solid: 0, hard: 0, drop: 'blight_spawn', light: 2, a: 1 },
  { n: '삭은 뼈', c: '#cfc8b0', solid: 0, hard: 0, drop: 'blight_spawn', a: 1 },
  { n: '포자 구멍', c: '#5a8a74', solid: 1, hard: 2, drop: 'spore_dust', light: 4 },
  { n: '균사 발', c: '#8fe0c4', solid: 0, hard: 0, drop: 'spore_dust', light: 2, a: 1 }
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

  /* --- 문 (type:'door') ---
     마을과 캠프에는 문이 서 있는데 플레이어는 만들 수가 없었다. 벽은 블록으로 쌓을 수
     있어도 드나들 구멍을 막을 방법이 없어서, 지어 놓은 집이 전부 뚫린 채였다.
     설치물(station)과 경로를 나누는 까닭은 규격이 다르기 때문이다 — 문은 세로 두 칸에
     바닥에 서고, 닫힌 동안만 길을 막는다(OBJ_SIZE 한 칸 규격에 넣으면 성문이 눌린다). */
  door_wood:     { n: '나무 문', i: '🚪', type: 'door', stack: 20,
                   d: '경첩은 다는 사람이 바라본 쪽에 붙는다. 그쪽으로 열린다.' },

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
                 d: '점프를 누르고 있으면 떠오른다. 발밑에서 30칸까지, 한 번에 4초까지. 그 뒤엔 식혀야 한다.' , lvReq: 40 },

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
  sum_void:    { n: '별의 눈물', i: '💧', type: 'summon', boss: 'void_king', stack: 9, d: '심연 앞에서만 열린다.' },

  /* ================= v1.1: 유적마다 그곳에서만 나오는 전리품 둘 =================
     여태 다섯 유적의 상자에서는 세계 어디서나 나오는 것과 같은 게 나왔다. 벽 색이
     다르고 몹이 다른데 털어 온 자루 안은 똑같아서, 어느 유적을 갔는지가 가방에
     남지 않았다.

     둘의 성격을 일부러 갈랐다.
       재료  그 유적의 **장식을 캐면** 나온다. 흔하고, 값은 낮고, 쓸 데가 있다.
             장식이 곧 그 유적을 터는 이유가 된다.
       유물  그 유적의 **상자에서만** 드물게 나온다. 쓸 데는 없고 값이 아주 높다.
             — 값이 곧 이야기다. 팔아 버릴지 남겨 둘지는 플레이어가 정한다.

     값은 유적 rank 를 따라간다(광산 1 → 부패한 둥지 6). 순한 곳을 털어 부자가
     되는 지름길이 생기면 안 되므로, 깊이와 값이 어긋나지 않게 계단으로 벌렸다. */
  neverthaw:    { n: '식지 않는 서리', i: '🧊', type: 'mat', stack: 999, price: 340,
                  d: '얼음 던전 밖으로 꺼내도 녹지 않는다. 손에 쥐면 손이 먼저 식는다.' },
  warden_seal:  { n: '파수꾼의 인장', i: '🛡', type: 'mat', stack: 99, price: 5200,
                  d: '무엇을 지키라고 받은 것인지는 적혀 있지 않다. 지켰다는 것만 적혀 있다.' },
  sealed_ash:   { n: '봉인된 재', i: '🏺', type: 'mat', stack: 999, price: 520,
                  d: '단지 안의 재는 아직 따뜻하다. 봉을 뜯은 사람은 여태 없었다.' },
  caged_sun:    { n: '가둔 해', i: '🥇', type: 'mat', stack: 99, price: 9800,
                  d: '해를 새긴 게 아니라 해를 가둔 것이라고 벽에 적혀 있었다.' },
  deep_ember:   { n: '깊은 잉걸', i: '🔥', type: 'mat', stack: 999, price: 180,
                  d: '갱등에 남아 있던 불씨. 이 불은 갱도가 버려진 뒤에도 꺼지지 않았다.' },
  foreman_tag:  { n: '십장의 표찰', i: '🏷', type: 'mat', stack: 99, price: 2600,
                  d: '이름 자리가 긁혀 있다. 마지막까지 남은 사람이 지운 것이다.' },
  blight_spawn: { n: '부패한 알', i: '🥚', type: 'mat', stack: 999, price: 860,
                  d: '안에서 아직 무언가 움직인다. 오래 들고 있으면 손이 저리다.' },
  nest_crown:   { n: '둥지의 관', i: '👑', type: 'mat', stack: 99, price: 16000,
                  d: '뼈로 엮은 것인데, 사람의 것은 하나도 섞여 있지 않다.' },
  spore_dust:   { n: '포자 가루', i: '🍄', type: 'mat', stack: 999, price: 700,
                  d: '숨을 참고 담아야 한다. 숨을 쉬면 그때부터 내 안에서 자란다.' },
  cap_signet:   { n: '갓의 인장', i: '💍', type: 'mat', stack: 99, price: 12500,
                  d: '포자 굴에는 문이 없다. 그런데 여는 데 쓰는 물건이 있었다.' }
};

/* 유적 → 그곳에서만 나오는 전리품 [재료, 유물].
   RUIN_SPEC 의 id 로 찾는다. 상자·보스 보상이 여기를 읽는다(game.js ruinLoot). */
const RUIN_LOOT = {
  ice: ['neverthaw', 'warden_seal'],
  pyramid: ['sealed_ash', 'caged_sun'],
  mine: ['deep_ember', 'foreman_tag'],
  blight: ['blight_spawn', 'nest_crown'],
  spore: ['spore_dust', 'cap_signet']
};

/* ================= 맞는 순간 — 물리 타격 계열 =================
   근접 타격에는 맞는 그림이 없었다. 128의 낫이든 9의 목검이든 화면에서 똑같이
   생겼고, 남는 건 숫자와 몬스터 색 파편 넷뿐이었다.

   계열은 무기 **앞머리**로 가른다. 무기마다 필드를 하나씩 다는 대신 이름을
   읽는 이유: 무기가 예순 자루가 넘고 앞으로도 늘어날 텐데, 새로 만들 때마다
   잊지 않고 달아야 하는 필드는 결국 어딘가에서 빠진다. 이름 규칙은 이미
   지켜지고 있으므로 그쪽을 읽는 편이 스스로 유지된다.

   마법(orb·staff·tome)은 여기 없다 — 원소마다 제 그림이 이미 있다
   (hit_arcane · hit_frost · hit_soul · explosion_fire · explosion_void).
   그 위에 금빛 물리 타격까지 겹치면 무엇에 맞았는지가 도로 흐려진다. */
const HIT_FAM = {
  sword: 'slash', blade: 'slash', dagger: 'slash', scythe: 'slash', axe: 'slash', saw: 'slash',
  spear: 'pierce', lance: 'pierce', harpoon: 'pierce', bow: 'pierce', crossbow: 'pierce', gun: 'pierce',
  hammer: 'blunt', mace: 'blunt'
};
/* 계열마다 크기와 남는 시간이 다르다. 이게 무게로 읽힌다 —
   베기는 가장 빨리 사라져야 연타가 겹쳐도 화면이 안 막히고,
   둔기는 가장 크고 가장 늦게까지 남아야 한 방이 무겁게 읽힌다.

   ★ size 는 그림이 차지하는 크기가 아니라 **틀(64칸)을 그리는 크기**다.
   시트는 틀 안에 여백 2칸을 남기고 구워지므로(tools/mkhitphys.py 의 틀 맞춤)
   화면에 보이는 크기는 size × 그 배율이다 — 베기 52×0.879≈46 ·
   찌르기 52×0.853≈44 · 둔기 72×0.829≈60, 즉 보이는 크기는 예전 그대로다.
   베기와 찌르기가 같은 52인 것은 우연이고, 둘의 배율이 달라 화면에서는 안 같다.
   시트를 다시 구우면 그 스크립트가 찍어 주는 숫자로 여기를 같이 고친다. */
const HIT_FX = {
  slash: { size: 52, slow: 0.80 },
  pierce: { size: 52, slow: 0.90 },
  blunt: { size: 72, slow: 1.35 }
};

/** 이 무기로 때렸을 때 어느 타격 그림을 쓰는가. 없으면(마법·맨손) null */
function hitFam(it) {
  if (!it || !it.id) return null;
  const f = HIT_FAM[it.id.split('_')[0]];
  if (f) return f;
  // 규칙에 없는 이름이면 근접은 둔기로 친다 — 안 그리는 것보다 낫다
  const d = ITEMS[it.id];
  return d && d.type === 'weapon' && d.wc !== 'magic' ? 'blunt' : null;
}

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
  // 문 — 널판 여덟에 경첩 한 벌. 벽만 쌓을 수 있고 드나들 구멍은 못 막던 것을 푼다
  { out: 'door_wood', n: 1, need: { plank: 8, iron_bar: 1 }, station: 'work' },

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
  /* 개조된 것에서 나온 녹슨 톱니를 쓸 데. 강철판 3 + 주괴 2 → 4개 쪽이
     여전히 싸므로 지름길은 아니고, 세션 2 지상에서 모은 것이 버려지지만
     않게 하는 정도다(11장 목표가 기본 톱니다). */
  { out: 'gear_basic', n: 1, need: { rust_gear: 4 }, station: 'forge' },
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
  glow_snail:  { n: '빛달팽이', hp: 12, dmg: 0, def: 0, spd: 24, ai: 'critter', w: 22, h: 14, c: '#7fe0c8', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1], ['glowcap', .15, 1, 1]] },
  ash_vole:    { n: '잿들쥐', hp: 9, dmg: 0, def: 0, spd: 85, ai: 'critter', w: 14, h: 10, c: '#8a7a8c', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },

  slime:      { n: '잿빛 슬라임', hp: 34, dmg: 8, def: 0, spd: 34, ai: 'jumper', w: 24, h: 18, c: '#6f8ba0', xp: 9, gold: 3, biome: 'surface', aggro: 320,
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
  shadoweye:  { n: '그림자 눈', hp: 110, dmg: 24, def: 4, spd: 70, ai: 'caster', w: 22, h: 22, c: '#3d2a54', xp: 52, gold: 24, biome: 'corrupt', range: 340, aggro: 520,
                drops: [['corrupt_ess', .8, 2, 4], ['soul_shard', .15, 1, 2]] },
  frostling:  { n: '서리 정령', hp: 175, dmg: 33, def: 12, spd: 46, ai: 'caster', w: 24, h: 32, c: '#8fd0e8', xp: 70, gold: 32, biome: 'ice', range: 300, aggro: 480,
                drops: [['frost_core', .6, 1, 2], ['ice_shard', .8, 2, 5], ['crystal', .2, 1, 2]] },
  imp:        { n: '화염 임프', hp: 210, dmg: 40, def: 10, spd: 92, ai: 'caster', w: 22, h: 26, c: '#e0662a', xp: 92, gold: 44, biome: 'hell', range: 320, aggro: 560,
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
  crystalcrab:{ n: '수정 게', hp: 300, dmg: 44, def: 28, spd: 44, ai: 'walker', w: 32, h: 19, c: '#7fd8e8', xp: 110, gold: 55, biome: 'deep', aggro: 400,
                drops: [['crystal_claw', .6, 1, 2], ['crystal', .7, 2, 5], ['dagger_void', .025, 1, 1], ['tome_void', .02, 1, 1]] },
  lavaslug:   { n: '용암 슬러그', hp: 340, dmg: 52, def: 18, spd: 40, ai: 'walker', w: 32, h: 20, c: '#e0703a', xp: 120, gold: 58, biome: 'hell', aggro: 360,
                drops: [['lava_gel', .7, 1, 3], ['hell_ore', .5, 1, 3], ['mace_lava', .035, 1, 1]] },
  cloudjelly: { n: '구름 해파리', hp: 300, dmg: 48, def: 14, spd: 62, ai: 'flyer', w: 28, h: 30, c: '#e8f0fa', xp: 130, gold: 60, biome: 'sky', aggro: 460,
                drops: [['cloud_jelly', .7, 1, 3], ['cloud_block', .6, 3, 8]] },
  archivist:  { n: '잊힌 사서', hp: 420, dmg: 70, def: 22, spd: 68, ai: 'caster', w: 24, h: 36, c: '#c8b98a', xp: 220, gold: 120, biome: 'ruin', range: 340, aggro: 560,
                drops: [['archive_seal', .55, 1, 2], ['aether_shard', .4, 1, 3]] },

  /* --- 2부 일반 --- */
  sky_sentry: { n: '하늘 파수꾼', cw: '기', hp: 420, dmg: 62, def: 20, spd: 96, ai: 'caster', w: 26, h: 34, c: '#a8c8e0', xp: 160, gold: 80, biome: 'sky', range: 340, aggro: 560,
                drops: [['sky_feather', .7, 1, 3], ['aether_shard', .3, 1, 2], ['cloud_block', .5, 2, 6], ['spear_storm', .02, 1, 1]] },
  gale:       { n: '바람 정령', hp: 340, dmg: 54, def: 12, spd: 130, ai: 'flyer', w: 22, h: 22, c: '#cfe8ff', xp: 140, gold: 66, biome: 'sky', aggro: 480,
                drops: [['sky_feather', .8, 2, 4], ['cloud_block', .6, 3, 8], ['spear_storm', .025, 1, 1], ['charm_zenith', .04, 1, 1]] },
  ruin_guard: { n: '유적 수호병', cw: '기', hp: 620, dmg: 78, def: 40, spd: 40, ai: 'walker', w: 30, h: 46, c: '#8a8270', xp: 240, gold: 130, biome: 'ruin', aggro: 420,
                drops: [['ruin_brick', .8, 2, 6], ['aether_shard', .4, 1, 3], ['soul_shard', .5, 2, 4], ['mace_ruin', .03, 1, 1]] },
  lantern:    { n: '잊힌 등불', hp: 380, dmg: 66, def: 16, spd: 74, ai: 'caster', w: 22, h: 30, c: '#e0c86a', xp: 200, gold: 110, biome: 'ruin', range: 330, aggro: 520,
                drops: [['aether_shard', .5, 1, 3], ['crystal', .5, 2, 5]] },

  /* ================= v1.1: 유적마다 그곳에서만 나오는 것 하나 =================
     유적 다섯 곳의 잡몹이 전부 세계 어디서나 나오는 것들이었다 — 얼음 던전엔
     얼음 지대의 서리 정령, 광산엔 동굴의 광부 유령. 유적에 들어와야만 볼 수 있는
     것은 유적 수호병 하나뿐이고, 그건 다섯 곳에 다 나온다.

     다섯 다 **그 유적의 장식에서 나온 것**이다. 몬스터와 장식이 같은 이야기를
     해야 나중에 붙여 넣은 것처럼 안 보인다.
     ai 도 겹치지 않게 갈랐다 — walker / jumper / walker(빠름) / flyer / caster.
     실루엣도 마찬가지다(서 있는 것 · 웅크린 것 · 낮고 넓은 것 · 매달린 것 ·
     세로로 긴 것). 어두운 방에서 형체만 보고도 무엇인지 갈려야 한다.
     세기는 그 유적의 rank 를 따라간다 — 광산(1)이 가장 순하고 부패한 둥지(6)가 가장 세다. */
  cartwraith: { n: '빈 광차', cw: '기', hp: 140, dmg: 30, def: 8, spd: 124, ai: 'walker', w: 30, h: 22, c: '#7a5a38', xp: 44, gold: 24, biome: 'ruin', aggro: 400,
                d: '아무도 밀지 않는데 굴러온다. 안에서 잉걸이 아직 타고 있다.',
                drops: [['deep_ember', .7, 1, 3], ['iron_ore', .5, 1, 3], ['rust_gear', .2, 1, 1]] },
  frostbound: { n: '언 순례자', hp: 260, dmg: 40, def: 20, spd: 34, ai: 'walker', w: 26, h: 38, c: '#9fd8ea', xp: 84, gold: 40, biome: 'ruin', aggro: 380,
                d: '얼음 안에 언 채로 걸어온다. 무엇을 하러 왔는지는 얼음이 안 말해 준다.',
                drops: [['neverthaw', .7, 1, 2], ['ice_shard', .8, 2, 5], ['frost_core', .3, 1, 2]] },
  jarhusk:    { n: '단지 껍데기', hp: 230, dmg: 46, def: 12, spd: 74, ai: 'jumper', w: 24, h: 26, c: '#c8a86a', xp: 92, gold: 46, biome: 'ruin', aggro: 420,
                d: '단지 안에 있던 것. 봉을 뜯은 사람이 없다는 말은, 스스로 나왔다는 뜻이다.',
                drops: [['sealed_ash', .7, 1, 3], ['gold_ore', .4, 1, 3], ['bone', .6, 2, 4]] },
  ventspitter:{ n: '구멍벌레', hp: 240, dmg: 42, def: 14, spd: 30, ai: 'caster', w: 26, h: 28, c: '#5a8a74', xp: 110, gold: 52, biome: 'ruin', range: 320, aggro: 460, proj: 'rune',
                d: '포자 구멍에 살던 것. 구멍이 벌레의 집인지 벌레가 구멍인지는 모른다.',
                drops: [['spore_dust', .7, 1, 3], ['spore_sac', .5, 1, 3], ['glowcap', .4, 2, 4]] },
  sacling:    { n: '주머니의 것', hp: 300, dmg: 54, def: 16, spd: 88, ai: 'flyer', w: 24, h: 30, c: '#8a4a80', xp: 150, gold: 70, biome: 'ruin', aggro: 500,
                d: '알주머니에서 나온 것. 아직 다 자라지 않았다.',
                drops: [['blight_spawn', .7, 1, 3], ['corrupt_ess', .5, 1, 3], ['soul_shard', .3, 1, 2]] },

  /* --- 세션 2: 지하 공창 --- */
  scrapcrawler: { n: '고철 기어다니개', cw: '기', hp: 900, dmg: 62, def: 30, spd: 92, ai: 'walker', w: 30, h: 19, c: '#6a6a74', xp: 900, gold: 240, aggro: 420,
                 drops: [['steel_plate', 1, 3, 7], ['conduit_part', .5, 1, 2], ['gun_scrap', .02, 1, 1]] },
  sparkwisp:    { n: '불티 정령', cw: '기', hp: 620, dmg: 55, def: 18, spd: 168, ai: 'flyer', w: 20, h: 20, c: '#e8a53a', xp: 820, gold: 210, aggro: 500,
                 drops: [['power_core', .6, 1, 2], ['conduit_part', 1, 1, 3]] },
  riveter:      { n: '대갈못 사수', cw: '기', hp: 1150, dmg: 74, def: 34, spd: 74, ai: 'archer', w: 24, h: 40, c: '#8a8a96', xp: 1150, gold: 300, aggro: 620, proj: 'bone',
                 drops: [['steel_plate', 1, 4, 9], ['iron_bar', .6, 2, 4], ['gun_scrap', .025, 1, 1]] },
  foreman:      { n: '옛 십장', cw: '기', hp: 1900, dmg: 88, def: 44, spd: 88, ai: 'caster', w: 26, h: 42, c: '#c8a06a', xp: 1700, gold: 480, aggro: 640, range: 380, proj: 'rune',
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
  mine_horror:  { n: '갱도의 것', hp: 1900, dmg: 42, def: 16, spd: 96, ai: 'b_slime', w: 60, h: 52, c: '#6a5a4a', xp: 1500, gold: 620, ph: 2, boss: 1,
                 drops: [['rust_gear', 1, 2, 3], ['iron_ore', 1, 20, 30], ['lost_lamp', 1, 1, 2], ['foreman_tag', 1, 1, 1]] },
  /* rank 2 */
  ice_warden:   { n: '얼음 감시자', hp: 2800, dmg: 56, def: 24, spd: 74, ai: 'b_witch', w: 40, h: 54, c: '#9fd8f0', xp: 2300, gold: 950, ph: 2, boss: 1,
                 drops: [['frozen_core', 1, 2, 3], ['frost_core', 1, 8, 14], ['ice_shard', 1, 20, 30], ['warden_seal', 1, 1, 1]] },
  /* rank 3 */
  vine_lord:    { n: '덩굴 군주', hp: 4100, dmg: 74, def: 34, spd: 80, ai: 'b_bone', w: 50, h: 74, c: '#3f7a34', xp: 3400, gold: 1500, ph: 2, boss: 1,
                 drops: [['heartwood', 1, 2, 3], ['vine_coil', 1, 12, 20], ['orchid', 1, 8, 14]] },
  /* rank 4 — 함정이 가장 촘촘한 유적의 주인 */
  sand_guardian:{ n: '모래 파수꾼', hp: 5600, dmg: 92, def: 46, spd: 66, ai: 'b_bone', w: 54, h: 70, c: '#d8b878', xp: 4800, gold: 2100, ph: 2, boss: 1,
                 drops: [['sun_disc', 1, 2, 3], ['gold_ore', 1, 15, 25], ['venom_sting', 1, 6, 10], ['caged_sun', 1, 1, 1]] },
  /* rank 5 — 입구가 없는 굴. 도망칠 길이 없다 */
  spore_queen:  { n: '포자 여왕', hp: 7200, dmg: 110, def: 42, spd: 92, ai: 'b_heart', w: 50, h: 72, c: '#6fe0c0', xp: 6400, gold: 2800, ph: 2, boss: 1,
                 drops: [['queen_spore', 1, 2, 3], ['spore_sac', 1, 12, 20], ['glowcap', 1, 15, 25], ['cap_signet', 1, 1, 1]] },
  /* rank 6 — 동쪽 끝, 가장 깊은 곳 */
  blight_maw:   { n: '부패한 아가리', hp: 9400, dmg: 132, def: 58, spd: 88, ai: 'b_heart', w: 66, h: 58, c: '#7a3f9c', xp: 9000, gold: 4000, ph: 2, boss: 1,
                 drops: [['blight_bile', 1, 2, 3], ['corrupt_ess', 1, 15, 25], ['ebon_chunk', 1, 10, 18], ['nest_crown', 1, 1, 1]] },

  /* --- 7단계: 폭주로 ---
     공창이 스스로 불려 낸 것들. 사람이 설계한 흔적이 점점 옅어진다 */
  splitter:   { n: '증식 기계', cw: '기', hp: 1500, dmg: 84, def: 40, spd: 84, ai: 'walker', w: 28, h: 34, c: '#8a7a6a', xp: 2600, gold: 520, aggro: 520,
                drops: [['core_shard', .8, 1, 3], ['steel_plate', .7, 3, 7], ['gear_basic', .5, 2, 5], ['orb_core', .02, 1, 1]] },
  weldarm:    { n: '용접 팔', cw: '기', hp: 1800, dmg: 92, def: 46, spd: 64, ai: 'archer', w: 26, h: 44, c: '#c8763a', xp: 2900, gold: 600, aggro: 640, proj: 'fire',
                drops: [['core_shard', .8, 1, 3], ['conduit_part', .6, 2, 4], ['refined_oil', .4, 2, 5]] },
  coreling:   { n: '노심 파편체', cw: '기', hp: 1200, dmg: 76, def: 26, spd: 176, ai: 'flyer', w: 20, h: 22, c: '#e8b04a', xp: 2400, gold: 480, aggro: 620,
                drops: [['core_shard', 1, 2, 4], ['power_core', .5, 1, 2], ['orb_core', .025, 1, 1]] },

  /* --- 보스 --- */
  king_slime:  { n: '슬라임 왕', hp: 900, dmg: 24, def: 6, spd: 60, ai: 'b_slime', w: 76, h: 58, c: '#4f7fc0', xp: 420, gold: 200, boss: 1,
                 drops: [['slime_gel', 1, 25, 40], ['ring_vigor', 1, 1, 1], ['star_heart', 1, 1, 1], ['sword_copper', .5, 1, 1]] },
  bone_lord:   { n: '뼈의 군주', hp: 2000, dmg: 36, def: 14, spd: 70, ai: 'b_bone', w: 52, h: 68, c: '#ded6bd', xp: 900, gold: 480, boss: 1,
                 drops: [['bone_frag', 1, 30, 45], ['sword_bone', 1, 1, 1], ['star_heart', 1, 1, 1], ['pick_iron', .6, 1, 1]] },
  corrupt_heart:{ n: '부패의 심장', hp: 3600, dmg: 48, def: 18, spd: 105, ai: 'b_heart', w: 54, h: 54, c: '#7a3f9c', xp: 1700, gold: 900, boss: 1,
                 drops: [['corrupt_ess', 1, 30, 50], ['charm_leech', 1, 1, 1], ['star_heart', 1, 1, 1], ['mythril_ore', 1, 12, 20]] },
  frost_witch: { n: '서리 마녀 실비아', hp: 5600, dmg: 62, def: 24, spd: 90, ai: 'b_witch', w: 34, h: 56, c: '#a8dcf0', xp: 3000, gold: 1600, boss: 1,
                 drops: [['frost_core', 1, 25, 40], ['staff_frost', 1, 1, 1], ['star_heart', 1, 1, 1], ['amul_swift', 1, 1, 1]] },
  void_king:   { n: '공허의 왕', hp: 12000, dmg: 82, def: 32, spd: 110, ai: 'b_void', w: 66, h: 88, c: '#5e3fa8', xp: 9000, gold: 5000, boss: 1,
                 drops: [['void_frag', 1, 30, 50], ['charm_star', 1, 1, 1], ['star_heart', 1, 1, 1]] },

  storm_warden: { n: '폭풍의 수호자', hp: 13000, dmg: 96, def: 38, spd: 150, ai: 'b_storm', w: 66, h: 70, c: '#bcd8f0', xp: 16000, gold: 8000, boss: 1,
                 drops: [['sky_feather', 1, 30, 50], ['aether_shard', 1, 20, 35], ['charm_feather', 1, 1, 1], ['star_heart', 1, 1, 1]] },
  first_keeper: { n: '최초의 파수꾼', cw: '기', hp: 20000, dmg: 120, def: 52, spd: 96, ai: 'b_keeper', w: 64, h: 86, c: '#c8b98a', xp: 40000, gold: 20000, boss: 1,
                 minion: 'ruin_guard',
                 drops: [['aether_shard', 1, 40, 60], ['ruin_brick', 1, 40, 70], ['charm_rune', 1, 1, 1], ['star_heart', 1, 2, 2]] },

  /* 종장 — 별이 도망쳐 온 그것 */
  pursuer:      { n: '별을 쫓아온 것', hp: 42000, dmg: 165, def: 68, spd: 128, ai: 'b_pursuer', w: 172, h: 192, c: '#2a2036', xp: 120000, gold: 60000, ph: 5, boss: 1,
                 minion: 'wraith', aggro: 4000,
                 drops: [['void_frag', 1, 60, 90], ['star_heart', 1, 3, 3], ['charm_dawn', 1, 1, 1], ['scythe_void', 1, 1, 1]] },

  /* 7단계 보스 */
  proliferator: { n: '증식체', cw: '기', hp: 46000, dmg: 150, def: 62, spd: 112, ai: 'b_prolif', w: 88, h: 72, c: '#9a8a76', boss: 1,
                 xp: 150000, gold: 70000, minion: 'splitter',
                 drops: [['core_shard', 1, 40, 60], ['machine_frame', 1, 6, 10], ['power_core', 1, 25, 40]] },
  hepha:        { n: '헤파 · 최초의 기계', cw: '기', hp: 72000, dmg: 190, def: 80, spd: 120, ai: 'b_hepha', w: 172, h: 216, c: '#c8a05a', ph: 5, boss: 1,
                 xp: 400000, gold: 180000, minion: 'coreling', aggro: 4000,
                 drops: [['hepha_heart', 1, 1, 1], ['core_shard', 1, 60, 90], ['aether_shard', 1, 30, 45]] },

  /* 세션 2 — 지하 공창의 관리자 */
  overseer:     { n: '공창의 관리자', cw: '기', hp: 30000, dmg: 140, def: 60, spd: 104, ai: 'b_overseer', w: 68, h: 88, c: '#8a8a96', xp: 90000, gold: 44000, boss: 1,
                 minion: 'riveter',
                 drops: [['steel_plate', 1, 60, 90], ['power_core', 1, 20, 30], ['blueprint_core', 1, 1, 1], ['pick_drill', 1, 1, 1]] },

  /* --- 세션 2 종장: 설계실 ---
     끝까지 조립되지 못한 것들. 공격적이라기보다 "하던 일을 계속 하려는" 것들이라
     플레이어를 밀어내는 쪽에 가깝다. */
  draft_form:   { n: '미완의 형상', cw: '기', hp: 1600, dmg: 96, def: 52, spd: 82, ai: 'walker', w: 26, h: 44, c: '#cfc7b8', xp: 3200, gold: 700, aggro: 520,
                 drops: [['proto_ash', 1, 2, 5], ['draft_glass', .5, 1, 3]] },
  scribe_hand:  { n: '기록하는 손', cw: '기', hp: 1300, dmg: 88, def: 34, spd: 150, ai: 'caster', w: 24, h: 30, c: '#8fd8e8', xp: 3000, gold: 660, aggro: 620, range: 360, proj: 'rune',
                 drops: [['draft_glass', 1, 2, 4], ['proto_ash', .5, 1, 2], ['aether_shard', .3, 1, 3]] },
  mold_walker:  { n: '거푸집 보행체', cw: '기', hp: 2400, dmg: 110, def: 66, spd: 62, ai: 'walker', w: 34, h: 50, c: '#b8a878', xp: 3800, gold: 820, aggro: 440,
                 drops: [['archestone', 1, 4, 9], ['proto_ash', .6, 2, 4], ['draft_glass', .4, 1, 2]] },

  /* 세션 2 최종 — 사람을 본떠 만든 첫 번째 것 */
  archetype:    { n: '원형 · 첫 번째 설계', cw: '기', hp: 105000, dmg: 215, def: 92, spd: 126, ai: 'b_arche', w: 192, h: 232, c: '#e8dcc0', ph: 5, boss: 1,
                 xp: 900000, gold: 400000, minion: 'draft_form', aggro: 4000,
                 drops: [['arche_core', 1, 1, 1], ['draft_glass', 1, 40, 60], ['archestone', 1, 30, 50]] },

  /* --- 특별 유적 ① 부유 성채 (하늘) --- */
  orbit_sentry: { n: '궤도 파수병', cw: '기', hp: 3200, dmg: 128, def: 74, spd: 112, ai: 'caster', w: 28, h: 40, c: '#8fa8c8', xp: 5200, gold: 1200, range: 380, proj: 'star', aggro: 640,
                 drops: [['orbit_plate', 1, 3, 8], ['orbit_gear', .5, 1, 2], ['aether_shard', .4, 2, 5]] },
  meridian_eye: { n: '자오선의 눈', cw: '기', hp: 2600, dmg: 116, def: 44, spd: 186, ai: 'flyer', w: 26, h: 26, c: '#7fe0ff', xp: 4800, gold: 1100, aggro: 720,
                 drops: [['void_lens', .25, 1, 1], ['orbit_gear', .6, 1, 3], ['sky_feather', .7, 2, 5]] },
  ballast_form: { n: '평형추', cw: '기', hp: 5200, dmg: 152, def: 96, spd: 54, ai: 'walker', w: 38, h: 54, c: '#5a6a80', xp: 6400, gold: 1500, aggro: 460,
                 drops: [['orbit_plate', 1, 6, 12], ['star_ash', .3, 1, 2], ['orbit_gear', .5, 2, 4]] },

  /* 부유 성채의 주인 — 지금까지 나온 무엇보다 세다.
     기반암과 제단만 빼고 발밑을 계속 부순다(b_restorer). 하늘 위라 떨어지면 그대로 끝이다. */
  restorer:     { n: '환원기 · 되돌리려는 것', cw: '기', hp: 320000, dmg: 340, def: 130, spd: 132, ai: 'b_restorer', w: 236, h: 264, c: '#a8c8e8', ph: 5, boss: 1,
                 xp: 2600000, gold: 1200000, minion: 'orbit_sentry', aggro: 5000,
                 drops: [['star_ash', 1, 4, 6], ['orbit_gear', 1, 40, 60], ['void_lens', 1, 2, 3], ['lance_orbit', 1, 1, 1]] },

  /* --- 특별 유적 ② 무너진 갱 (최심부) --- */
  gloom_crawler:{ n: '어둠을 기는 것', hp: 2800, dmg: 118, def: 56, spd: 128, ai: 'walker', w: 30, h: 24, c: '#2e2a26', xp: 4200, gold: 900, aggro: 560,
                 drops: [['deep_alloy', 1, 2, 5], ['gloom_pearl', .2, 1, 1], ['bone_frag', .6, 3, 7]] },
  damp_wisp:    { n: '가스 도깨비불', hp: 1800, dmg: 104, def: 28, spd: 158, ai: 'flyer', w: 22, h: 22, c: '#8aa05a', xp: 3800, gold: 820, aggro: 620,
                 drops: [['deep_alloy', .6, 1, 3], ['hell_ore', .5, 3, 8]] },
  lost_miner:   { n: '올라오지 못한 사람', cw: '명', hp: 4200, dmg: 136, def: 68, spd: 88, ai: 'walker', w: 22, h: 42, c: '#7a6a58', xp: 5600, gold: 1300, aggro: 600,
                 drops: [['miner_tag', .5, 1, 1], ['deep_alloy', 1, 3, 7], ['lost_lamp', .35, 1, 2]] },

  /* 무너진 갱의 주인 — 스토리와 무관한 순수 탐험 보상 */
  shaft_maw:    { n: '갱을 메운 것', hp: 88000, dmg: 244, def: 112, spd: 74, ai: 'b_heart', w: 184, h: 168, c: '#3a342c', ph: 5, boss: 1,
                 xp: 620000, gold: 300000, minion: 'gloom_crawler', aggro: 3600,
                 drops: [['gloom_pearl', 1, 3, 4], ['deep_alloy', 1, 40, 60], ['miner_tag', 1, 2, 3], ['hammer_cave', 1, 1, 1]] }
};

/* ================= v1.1: 개조 — 세션 2에서 옛 몹이 기계가 되어 돌아온다 =================

   세션 2 는 세션 1 과 같은 땅을 다시 걷는다. 그런데 지금까지는 그 땅에 사는 것이
   1장 때와 똑같았다 — 슬라임은 여전히 슬라임이고, 달라진 것은 플레이어의 숫자뿐이라
   "돌아왔다"가 아니라 "옛 구역을 다시 지나간다"로 읽혔다.

   그래서 **세션 1 바이옴의 몹**을 세션 2 에서 개조된 것으로 바꾼다. 새 몹을 만들지
   않는 이유는 정예(elite)와 같다 — 여기 원래 살던 것이 손을 탔다는 인상이라야
   하고, 그러려면 플레이어가 아는 실루엣이 그대로 서 있어야 한다.

   ■ 한꺼번에 바꾸지 않는다
     9장에 전부 기계가 되면 그것은 그냥 다른 지역이다. 장이 넘어갈 때마다 **종류가
     늘어난다**. 9장에는 흔한 것 넷만, 14장에는 스물다섯 전부. 같은 숲을 두 번
     지나면 그 사이에 무엇이 더 넘어갔는지 눈에 보인다.

     차례는 세다가 아니라 **기계에 가까운 순서**다. 흔하고 작은 것(슬라임·까마귀·박쥐)
     부터 넘어가고, 스스로 하나의 생태인 것(재의 골렘·부패한 나무·갓짐승)이 마지막이다.

   ■ 유적과 하늘은 빼 둔다
     유적 몹은 그 유적의 장식에서 나온 것이라 제 이야기가 따로 있고(RUIN_SPEC),
     하늘·지하 공창 계열은 애초에 세션 2 것이다. 개조는 **바이옴**에만 건다.
     순한 동물(passive)도 뺐다 — 싸우지 않는 것을 개조해 봐야 1.5배가 걸릴 데가 없다. */
/** 세는 말 — 기계는 '기', 사람은 '명', 나머지는 '마리' */
const mobCw = t => (ENEMIES[t] && ENEMIES[t].cw) || '마리';

const MECH_MUL = 1.5;                 // 체력·공격력·방어·보상 모두 원래의 1.5배
/* 개조된 것에서는 **부품만** 나온다. 원래 떨구던 것에 부품을 얹지 않고 통째로
   바꾼다 — 얹으면 개조된 몹이 그냥 더 좋은 사냥감이 되어, 세기가 1.5배인
   만큼의 값을 치르고도 이득이라 세션 2 내내 개조된 쪽만 잡게 된다.
   바꿔치기라야 "가죽 대신 고철이 나온다"가 되고 보상 총량이 그대로다.

   녹슨 톱니 하나로 통일한다. 강철판·동력석은 지하 공창의 몫이라, 지상에서
   같은 것이 나오면 공창에 내려갈 이유가 없어진다. 대신 톱니를 기본 톱니로
   불릴 수 있게 조리법을 하나 열어 뒀다(RECIPES) — 11장 목표가 마침
   기본 톱니라 모은 것이 그리로 이어진다. */
const MECH_PART = 'rust_gear';
const MECH_CH0 = 9;                   // 세션 2 서장
const MECH_CH1 = 14;                  // 세션 2 종장 — 이때 전부 넘어간다
const MECH_ORDER = [
  /* 9장 */  'slime', 'ashcrow', 'bat', 'zombie',
  /* 10장 */ 'spider', 'skeleton', 'archer', 'sporeling',
  /* 11장 */ 'scorpion', 'sandmaw', 'minerghost', 'vinelash',
  /* 12장 */ 'icewolf', 'frostling', 'bloomspitter', 'canopy_ape', 'imp',
  /* 13장 */ 'crawler', 'shadoweye', 'wraith', 'crystalcrab',
  /* 14장 */ 'lavaslug', 'capbeast', 'corrupttree', 'golem'
];

/** 그 장까지 개조가 끝난 몹의 수. 9장에 넷, 14장에 전부. */
function mechCount(chapter) {
  if (chapter < MECH_CH0) return 0;
  const t = clamp((chapter - MECH_CH0) / (MECH_CH1 - MECH_CH0), 0, 1);
  return Math.round(4 + t * (MECH_ORDER.length - 4));
}
/** 이 장에서 이 몹이 개조되어 나오는가. */
function isMech(type, chapter) {
  const n = mechCount(chapter);
  if (!n) return false;
  const i = MECH_ORDER.indexOf(type);
  return i >= 0 && i < n;
}
/** 살아 있는 개체의 이름. 개조된 것은 앞에 '개조된'이 붙는다 —
    퀘스트·통계는 원래 type 을 그대로 세므로 이름만 갈린다. */
function mobName(type, mech) {
  const n = (ENEMIES[type] || {}).n || type;
  return mech ? '개조된 ' + n : n;
}


/* ================= 재질 =================
   부술 때 튀는 것과 들리는 소리를 가르는 **한 가지 기준**. 타일·기계·몹이
   같은 표를 쓴다 — 돌은 어디서 깨지든 돌 소리가 나고 돌조각이 튀어야 한다.

   예전에는 전부 같았다. 무엇을 때리든 `damage` 한 소리, 무엇을 캐든 `mine`
   한 소리, 튀는 것은 그 개체의 대표색 동그라미뿐이었다. 손에 닿는 것이
   흙인지 쇠인지 뼈인지가 **소리와 파편으로 전혀 안 갈렸다.**

     c     파편 색 세 가지 (밝은 쪽 → 어두운 쪽)
     n     기본 파편 개수
     g     중력 배수. 음수면 위로 뜬다(불티 · 영혼)
     life  파편이 사는 시간(초)
     sq    파편 모양. 1이면 네모(돌·쇠·유리), 0이면 동그라미(살·젤·연기)
     glow  1이면 빛난다(불·공허)
     hit   때렸을 때 나는 소리 키
     brk   부쉈을 때 나는 소리 키 */
const MAT = {
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
const MAT_DEF = 'stone';

/* 타일·기계의 재질. 적지 않은 것은 전부 stone 이다 — 이 게임 지형의 기본이 돌이라
   기본값이 가장 많이 맞는다. 물·가스처럼 못 부수는 것은 아예 안 적는다. */
const TILE_MAT = (() => {
  const m = {};
  const put = (mat, keys) => keys.split(' ').forEach(k => {
    if (T[k] === undefined) return;      // 오타는 조용히 넘긴다(표가 시트보다 앞설 수 있다)
    m[T[k]] = mat;
  });
  put('dirt', 'DIRT GRASS SAND MUD ASH FARMLAND SANDBAG CLOUD SKYGRASS');
  put('ice', 'SNOW ICE ICEBRICK FROSTGLYPH ICEBANNER');
  put('wood', 'WOOD PLANK PLATFORM TIMBERWALL FENCE THATCH HAYBALE MINEWOOD BANNER TORCH');
  put('plant', 'LEAF CORRUPTLEAF SKYLEAF JUNGLELEAF GLOWLEAF VINE WEED FLOWER ORCHID FERN '
    + 'LILY MUSHROOM GLOWCAP GLOWMOSS CACTUS CACTUS_BLOCK JUNGLEGRASS SPOREVENT HYPHAE '
    + 'WHEAT0 WHEAT1 WHEAT2 WHEAT3 ROOT0 ROOT1 ROOT2 ROOT3 CAP0 CAP1 CAP2 CAP3 '
    + 'BEAN0 BEAN1 BEAN2 BEAN3 BLOOM0 BLOOM1 BLOOM2 BLOOM3 HERB0 HERB1 HERB2 HERB3 '
    + 'POD0 POD1 POD2 POD3');
  put('metal', 'COPPER IRON GOLD MYTHRIL LEAD STEELPLATE CONDUIT SLAGSTEEL ORBITPLATE '
    + 'SPIKE SPARKCOIL GRINDER DART_L DART_R LAMPPOST MINELAMP TOOLPILE '
    + 'M_BELT M_DRILL M_DRILL_E M_PUMP M_SMELTER M_PRESS M_REFINERY M_ASSEMBLER M_CRATE '
    + 'M_GEN M_BATTERY M_POLE M_SORTER M_TURRET M_TRAP M_SWITCH M_WINDMILL M_MILL M_OVEN '
    + 'M_DART M_FLAME M_FROST');
  put('glass', 'CRYSTAL AETHER POWERSTONE SOULSTONE COREGLASS DRAFTGLASS ORBITCORE WINDOW');
  put('ember', 'LAVA HELLSTONE FLAMEVENT');
  put('bone', 'BONEHEAP');
  put('flesh', 'BLIGHTSAC');
  put('void', 'CORRUPTGRASS');
  return m;
})();
function tileMat(id) { return TILE_MAT[id] || MAT_DEF; }

/* 몹의 재질. 이름이 아니라 **무엇으로 만들어졌는가**로 갈랐다 —
   '무덤지기'는 뼈고 '언 순례자'는 얼음이다. 적지 않은 것은 살(flesh). */
const MOB_MAT = (() => {
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
  return m;
})();
function mobMat(type, mech) {
  /* 개조된 것은 무엇이었든 강철이다 — 보이는 것도 강철이니 소리도 강철이라야 한다 */
  if (mech) return 'metal';
  return MOB_MAT[type] || 'flesh';
}


/* ================= 보스가 무너지는 방식 =================
   보스는 챕터의 끝이다. 스물세 마리가 전부 같은 입자 예순 개로 사라지면
   "이 놈을 이겼다"가 아니라 "죽는 연출이 하나 있다"가 된다. 무엇으로 만들어진
   놈인지에 따라 **무너지는 방식이 다르다.**

     mat/n/spd/vy/life  첫 번째 터짐 (재질 · 개수 · 속도 · 초기 상승 · 수명 배수)
     ring/in            고리에서 시작 / 안쪽으로 빨려 든다
     mat2/n2/at         한 박자 늦게 오는 두 번째 터짐 (초)
     shake              화면 흔들림
     sfx2               두 번째 터짐에 얹는 소리(없으면 재질 파괴음) */
const BOSS_DIE = {
  /* --- 세션 1 --- */
  king_slime:    { mat: 'gel', n: 70, spd: 1.3, vy: -60, life: 1.5, mat2: 'gel', n2: 34, at: .22, shake: 20 },
  bone_lord:     { mat: 'bone', n: 60, spd: 1.7, life: 1.6, mat2: 'void', n2: 20, at: .26, shake: 20 },
  corrupt_heart: { mat: 'flesh', n: 54, spd: 1.1, life: 1.3, mat2: 'void', n2: 40, at: .20, shake: 22 },
  frost_witch:   { mat: 'ice', n: 76, spd: 1.6, life: 1.4, mat2: 'glass', n2: 26, at: .18, shake: 20 },
  void_king:     { mat: 'void', n: 56, spd: 1.0, ring: 66, in: 1, life: 1.6,
                   mat2: 'void', n2: 60, at: .34, shake: 26 },
  storm_warden:  { mat: 'stone', n: 58, spd: 1.2, life: 1.3, mat2: 'dirt', n2: 30, at: .16, shake: 24 },
  first_keeper:  { mat: 'metal', n: 56, spd: 1.4, life: 1.2, mat2: 'ember', n2: 24, at: .20, shake: 22 },
  pursuer:       { mat: 'glass', n: 64, spd: 1.2, ring: 40, life: 1.7, mat2: 'void', n2: 34, at: .28, shake: 22 },
  /* --- 유적 미니보스 --- */
  mine_horror:   { mat: 'flesh', n: 46, spd: 1.1, life: 1.2, mat2: 'stone', n2: 26, at: .18, shake: 18 },
  ice_warden:    { mat: 'ice', n: 60, spd: 1.5, life: 1.3, mat2: 'metal', n2: 20, at: .18, shake: 18 },
  vine_lord:     { mat: 'plant', n: 64, spd: .8, vy: -70, life: 2.0, mat2: 'plant', n2: 30, at: .30, shake: 16 },
  sand_guardian: { mat: 'dirt', n: 70, spd: 1.0, life: 1.1, mat2: 'stone', n2: 22, at: .14, shake: 20 },
  spore_queen:   { mat: 'plant', n: 72, spd: .7, vy: -90, life: 2.2, mat2: 'plant', n2: 40, at: .34, shake: 16 },
  blight_maw:    { mat: 'flesh', n: 58, spd: 1.2, life: 1.2, mat2: 'void', n2: 24, at: .20, shake: 20 },
  /* --- 세션 2 --- */
  proliferator:  { mat: 'metal', n: 54, spd: 1.4, life: 1.1, mat2: 'ember', n2: 28, at: .18, shake: 20 },
  overseer:      { mat: 'metal', n: 60, spd: 1.5, life: 1.2, mat2: 'ember', n2: 32, at: .22, shake: 22 },
  hepha:         { mat: 'ember', n: 70, spd: 1.0, vy: -60, life: 1.8, mat2: 'metal', n2: 40, at: .26, shake: 26 },
  archetype:     { mat: 'stone', n: 66, spd: 1.3, life: 1.4, mat2: 'glass', n2: 34, at: .24, shake: 24 },
  restorer:      { mat: 'glass', n: 60, spd: 1.1, ring: 54, life: 1.9, mat2: 'metal', n2: 36, at: .30, shake: 26 },
  shaft_maw:     { mat: 'stone', n: 78, spd: 1.0, vy: 10, life: 1.2, mat2: 'dirt', n2: 44, at: .16, shake: 28 },
  /* --- 특별 유적 --- */
  drowned_keeper: { mat: 'metal', n: 50, spd: 1.2, life: 1.2, mat2: 'plant', n2: 22, at: .18, shake: 18 },
  tide_warden:    { mat: 'gel', n: 62, spd: 1.1, life: 1.4, mat2: 'glass', n2: 28, at: .22, shake: 20 },
  isle_keeper:    { mat: 'stone', n: 62, spd: 1.1, life: 1.3, mat2: 'plant', n2: 26, at: .18, shake: 22 },
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
/* 페이즈가 넘어갈 때 뜨는 한 줄. 키는 **넘어간 페이즈 번호**다.
   3페이즈 보스는 1·2 만 쓰고, 5페이즈 보스(세션 종장·특별 유적의 주인)는 1~4 를
   다 쓴다 — 마디가 넷인데 할 말이 둘뿐이면 뒤 두 마디가 조용히 지나간다.
   2페이즈 미니보스는 1 만 쓴다(원래 대사가 없던 것들이라 비어 있다). */
const BOSS_LINES = {
  king_slime:   { 1: '갈라져도 갈라져도, 아직 혼자다.', 2: '껍데기가 굳는다 — 안쪽이 뛴다.' },
  bone_lord:    { 1: '뼈가 일어선다.', 2: '기둥이 저를 대신 든다.' },
  corrupt_heart:{ 1: '뿌리가 바닥을 짚는다.', 2: '제단만이 아직 뛰고 있다.' },
  frost_witch:  { 1: '실비아: "…아직도 따뜻하구나."', 2: '실비아: "불 옆에 서. 거기 말고는 없어."' },
  void_king:    { 1: '나선이 되감긴다.', 2: '공허가 방향을 바꾼다.' },
  storm_warden: { 1: '구름이 낮아진다.', 2: '내리꽂을 때만, 닿는다.' },
  first_keeper: { 1: '석판 하나가 꺼진다.', 2: '꺼진 쪽이 무르다.' },
  pursuer:      { 1: '형태가 무너지고 다시 선다.', 2: '한 줄기 길만 비어 있다.',
                  3: '쫓던 것을 잊은 얼굴이다.', 4: '별을 놓친 자리가 비어 있다.' },
  overseer:     { 1: '관리자: "공정 재개."', 2: '관리자: "…명령이 남아 있다."' },
  proliferator: { 1: '하나가 둘이 되는 것을 멈추지 못한다.', 2: '껍데기가 닫힌다 — 갈라진 것부터.' },
  hepha:        { 1: '헤파: "나는 아직 만드는 중이다."', 2: '헤파: "때려서는 안 멈춘다. 알잖아."',
                  3: '헤파: "고치는 것과 부수는 것을 너희는 같은 손으로 한다."',
                  4: '헤파: "…그래. 나도 그랬다." ' },
  archetype:    { 1: '원형이 자세를 고친다.', 2: '받침대 넷이 그것을 붙들고 있다.',
                  3: '사람의 걸음을 흉내 내기 시작한다.',
                  4: '마지막 받침대가 저를 놓는다.' },
  restorer:     { 1: '발밑이 한 겹 사라진다.', 2: '되돌릴 자리를 고르고 있다.',
                  3: '성채가 제 무게를 버리기 시작한다.', 4: '남은 것은 제단뿐이다.' },
  shaft_maw:    { 1: '갱이 숨을 들이켠다.', 2: '무너진 것들이 자리를 바꾼다.',
                  3: '천장이 내려앉는 소리가 아래에서 난다.', 4: '메운 것이 도로 뱉어진다.' }
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
    mobs: ['frostling', 'icewolf', 'frostbound'],
    rank: 2, tier: 3, trapRate: 0.46, spikeRate: 0.26, chestRate: 0.16, mobMul: 1.0
  },
  {
    id: 'pyramid', n: '피라미드', x: 2180, y: 96, w: 80, h: 56,
    wall: T.SANDBRICK, floor: T.SANDSTONE, bg: 8, torch: T.TORCH,
    traps: ['dart', 'vent', 'crumble', 'gas'], boss: 'sand_guardian',
    mobs: ['scorpion', 'sandmaw', 'skeleton', 'jarhusk'],
    // 지상으로 튀어나온 데다 얕아서 일찍 눈에 띄지만, 안은 함정이 가장 촘촘하다 —
    // "보이는 것과 실제 난이도가 다른" 유적 하나는 있어야 한다
    rank: 4, tier: 4, trapRate: 0.78, spikeRate: 0.46, chestRate: 0.20, mobMul: 1.35
  },
  {
    id: 'mine', n: '버려진 광산', x: 820, y: 168, w: 72, h: 38,
    wall: T.MINEWOOD, floor: T.PLANK, bg: 4, torch: T.TORCH,
    traps: ['dart', 'crumble', 'gas'], boss: 'mine_horror',
    mobs: ['minerghost', 'spider', 'bat', 'cartwraith'],
    // 베이스캠프 바로 옆. 처음 들어가 보는 유적이라 가장 순하게 둔다
    rank: 1, tier: 2, trapRate: 0.32, spikeRate: 0.16, chestRate: 0.14, mobMul: 0.85
  },
  {
    id: 'blight', n: '부패한 둥지', x: 4020, y: 196, w: 100, h: 60,
    wall: T.EBONSTONE, floor: T.EBONSTONE, bg: 3, torch: T.TORCH,
    traps: ['dart', 'vent', 'gas', 'coil'], boss: 'blight_maw',
    mobs: ['crawler', 'shadoweye', 'sacling'],
    // 동쪽 끝 + 가장 깊다. 여섯 중 마지막에 닿는 곳이라 제일 세게
    rank: 6, tier: 6, trapRate: 0.92, spikeRate: 0.58, chestRate: 0.24, mobMul: 1.85
  },
  {
    id: 'spore', n: '포자 굴', x: 3620, y: 176, w: 68, h: 42,
    wall: T.SPORESTONE, floor: T.GLOWMOSS, bg: 12, torch: T.GLOWCAP,
    traps: ['vent', 'dart', 'gas', 'coil'], boss: 'spore_queen',
    mobs: ['sporeling', 'capbeast', 'ventspitter'], arch: 'buried', rooms: 14,
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
/* 앞의 셋은 그 유적의 '재질'이고(다른 데서도 보는 것), 뒤의 둘이 v1.1에서 더한
   **그곳에서만 보는 것**이다. 둘은 일부러 서로 다른 자리를 쓴다 — 하나는 벽에
   (statue: 벽을 갈아끼움), 하나는 바닥이나 천장에. 방에 들어섰을 때 눈이 두
   군데에서 걸려야 "여기가 그 유적"으로 읽힌다. */
RUIN_SPEC[0].decor = [['pillar', T.ICE, 0.5], ['stalac', T.ICE, 0.5], ['brazier', T.TORCH, 0.35],
                      ['statue', T.FROSTGLYPH, 0.55], ['growth', T.ICEBANNER, 0.30]];
RUIN_SPEC[1].decor = [['statue', T.SANDBRICK, 0.5], ['frieze', T.GOLD, 0.35], ['brazier', T.TORCH, 0.3],
                      ['statue', T.HIEROGLYPH, 0.55], ['floorpile', T.CANOPIC, 0.6]];
RUIN_SPEC[2].decor = [['beam', T.MINEWOOD, 0.6], ['rail', T.PLANK, 0.5], ['crate', T.MINEWOOD, 0.4],
                      ['frieze', T.MINELAMP, 0.40], ['floorpile', T.TOOLPILE, 0.75]];
RUIN_SPEC[3].decor = [['growth', T.CORRUPTLEAF, 0.6], ['stalac', T.EBONSTONE, 0.4], ['web', T.VINE, 0.35],
                      ['growth', T.BLIGHTSAC, 0.35], ['floorpile', T.BONEHEAP, 0.5]];
RUIN_SPEC[4].decor = [['growth', T.GLOWCAP, 0.7], ['moss', T.GLOWMOSS, 0.5], ['stalac', T.SPORESTONE, 0.35],
                      ['wallmark', T.SPOREVENT, 0.5], ['growth', T.HYPHAE, 0.45]];

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

/* bonus 는 그 유적에서 많이 나오는 **흔한 자원**이고(위), bonus2 는 v1.1에서 더한
   **그 유적에서만 나오는 재료**다. 둘을 합치지 않은 이유: 기존 bonus 를 갈아치우면
   유적 상자에서 석탄·금광석이 사라져 초반 제작 흐름이 끊긴다. 나란히 넣는다.
   유물(값이 높고 쓸 데가 없는 쪽)은 상자가 아니라 그 유적의 보스가 떨군다. */
RUIN_SPEC[0].bonus2 = 'neverthaw';
RUIN_SPEC[1].bonus2 = 'sealed_ash';
RUIN_SPEC[2].bonus2 = 'deep_ember';
RUIN_SPEC[3].bonus2 = 'blight_spawn';
RUIN_SPEC[4].bonus2 = 'spore_dust';

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
     그대로 나오되 buff만큼 강해진다. 낮/밤 구분 없이 지상이면 어디서나 온다.
     ★ 사막만 뺀다. zones 의 'surface' 에는 사막도 들어 있어서, 사구 한복판에
       빗줄기가 내리고 하늘이 잿빛으로 물들었다. 모래폭풍이 사막의 날씨다. */
  rain: {
    n: '비', i: '🌧',
    d: '비가 몰아친다. 놈들이 평소보다 사납다.',
    chance: 0.20, zones: ['surface', 'ice', 'corrupt', 'jungle', 'glowfen'],
    notBiome: ['desert'],
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

/* ================= 사람들이 지금을 보고 하는 말 =================

   예전에는 베이스캠프 넷이 장마다 정해진 대사를 읽고, 여명 마을 다섯은 아예
   고정 대사 한 줄이 전부였다. 같은 장에 머무는 동안 열 번을 말 걸어도 열 번 다
   똑같았고, 밖에 비가 쏟아지든 피가 반으로 줄어 들어오든 마을 사람은 아무것도
   모르는 얼굴이었다.

   이제 대화는 두 겹이다.

     ① 상황 한 줄 — 지금 눈에 보이는 것에 대한 반응
        (죽은 자리 · 다친 몸 · 날씨 · 장을 끝낸 얼굴 · 빈 주머니 · 밤낮)
     ② 이야기 한 줄 — 예전부터 있던 장별 대사(DIALOGUE)와 마을 단계 대사(VILLAGE_TALK)

   ①은 아래 TALK 에서 고르고, ②는 원래 있던 표를 그대로 쓴다. 그래서 줄거리는
   하나도 흐려지지 않으면서 그 위에 오늘이 얹힌다.

   ★ 같은 상황이어도 같은 말을 하지 않는다. 칸마다 말이 두세 개씩 들어 있고,
     말을 걸 때마다 다음 것으로 넘어간다(무작위가 아니라 순번이라 반드시 다르다).
     순번은 저장에 남아서 불러와도 이어진다.

   ★ 플레이어의 대답도 상황을 따라간다. 칸마다 그 상황에서만 할 수 있는 대답이
     붙어 있고(re), 대답마다 상대의 대꾸가 있다. 대답 역시 순번으로 돌아간다.

   칸 이름(mood)은 아래 TALK_MOODS 순서대로 판정한다 — 위에 있는 것이 먼저다.
   어떤 사람이 그 칸을 안 들고 있으면 다음 칸으로 내려간다. 그래서 모두가 모든
   상황에 한마디씩 얹을 필요가 없다 — 대장장이는 빈 주머니를 알아보고, 조련사는
   붉은 달을 무서워하고, 노인은 대개 아무 말도 덧붙이지 않는다.
   'day' 칸만은 모두가 들고 있어야 한다(마지막 그물). */
const TALK_MOODS = [
  { id: 'grave',      when: c => c.grave },                       // 어딘가에 죽은 자리를 두고 왔다
  { id: 'hurt',       when: c => c.hpr < 0.35 },                   // 피가 3분의 1 아래
  { id: 'bloodmoon',  when: c => c.ev === 'bloodmoon' },
  { id: 'sandstorm',  when: c => c.ev === 'sandstorm' },
  { id: 'sporebloom', when: c => c.ev === 'sporebloom' },
  { id: 'rain',       when: c => c.ev === 'rain' },
  { id: 'chdone',     when: c => c.complete },                     // 이 장에서 할 일을 다 했다
  { id: 'goal',       when: c => c.ready },                        // 준비는 끝났고 마지막 하나만 남았다
  { id: 'broke',      when: c => c.gold < 40 },
  { id: 'rich',       when: c => c.gold >= 5000 },
  /* 세션 2 — 별이 하늘로 돌아간 뒤. 같은 밤낮이어도 사람들이 하는 말이 달라진다.
     (마을 주민 다섯은 애초에 세션 2에만 있으므로 이 칸을 들지 않는다) */
  { id: 'night2',     when: c => c.session === 2 && c.night },
  { id: 'night',      when: c => c.night },
  { id: 'dawn',       when: c => c.hour >= 5 && c.hour < 8 },
  { id: 'day2',       when: c => c.session === 2 },
  { id: 'day',        when: () => true }
];

/* say: 상황 한 줄(순번으로 돌아간다) · re: 그 상황에서 할 수 있는 대답과 대꾸
   대꾸(s)는 한 줄이어도 되고 여러 줄이어도 된다. */
const TALK = {
  /* ---------------- 베이스캠프 ---------------- */
  elara: {
    grave: { say: [
        '어디에 두고 왔니. …아니, 말 안 해도 돼. 지도에 표시가 남아 있을 거야.',
        '네 짐이 어딘가에 떨어져 있다는 건, 나한테는 네가 어딘가에 떨어졌다는 소리로 들려.'],
      re: [
        { t: '금방 찾아올게.', s: '금방이 아니어도 돼. 돌아오기만 해.' },
        { t: '그냥 버릴까 싶어.', s: '그럴 수 있으면 그래. …나는 아직 아무것도 못 버렸어.' }] },
    hurt: { say: [
        '앉아. 이건 부탁이 아니라 관리인 권한이야.',
        '너 지금 걷는 게 아니라, 넘어지면서 앞으로 가고 있어.',
        '피 냄새를 달고 들어오지 마. 여기 사람들 그거 알아본다.'],
      re: [
        { t: '괜찮아.', s: '괜찮은 사람은 그 말을 안 해.' },
        { t: '약이 떨어졌어.', s: '보린한테 가. 내 이름 대면 하나쯤은 그냥 줄 거야.' }] },
    bloodmoon: { say: [
        '달이 붉지. 문은 닫아 뒀어. 두드릴 사람은 너뿐이니까.',
        '붉은 밤엔 다들 조용해져. 짐승도, 사람도. 그게 더 무서워.'],
      re: [
        { t: '그래도 나가야 해.', s: '알아. 다녀와서 문 두드려. 안 자고 있을게.' },
        { t: '오늘은 여기 있을게.', s: '…고맙다. 그 말 들으려고 밤새 앉아 있었나 봐.' }] },
    sandstorm: { say: [
        '옷에 모래가 그렇게 붙어서 들어오면 안 되지. 털고 와.',
        '사막 쪽이 통째로 움직였다며. 여기까지 바람이 왔어.'],
      re: [
        { t: '사막 쪽은 좀 잠잠해?', s: '잠잠한 적이 없었어. 요즘은 그게 더 시끄러워졌을 뿐이고.' }] },
    sporebloom: { say: [
        '골짜기에서 뭔가 터졌다지. 냄새가 여기까지 와.',
        '숨을 얕게 쉬어. 그 냄새가 옷에 배면 오래 가.'],
      re: [
        { t: '그 냄새 위험한가?', s: '미라한테 물어. 나는 냄새가 난다는 것밖에 몰라.' }] },
    rain: { say: [
        '처마 밑으로 들어와. 이 비는 씻어 주는 비가 아니야.',
        '재가 녹아서 내려오는 거야. 오래 맞으면 옷부터 삭아.'],
      re: [
        { t: '비 오면 놈들이 사나워지던데.', s: '맞아. 젖은 날엔 다들 성질이 나빠져. 짐승도 사람도.' }] },
    chdone: { say: [
        '얼굴이 좀 폈네. 뭔가 매듭을 지었구나.',
        '오늘은 뭘 물어봐도 다 끝냈다고 할 얼굴이야.'],
      re: [
        { t: '다음은 뭐지?', s: '그건 내가 정하는 게 아니야. 그래도 하루쯤은 쉬어도 돼.' }] },
    broke: { say: [
        '주머니가 비었지. 표정에 다 나와.',
        '돈 얘기는 안 하려고 했는데 — 너 지금 아무것도 못 사겠구나.'],
      re: [
        { t: '빌려줄 수 있어?', s: '없어. 대신 게시판을 봐. 의뢰는 늘 돈보다 먼저 와 있어.' }] },
    rich: { say: [
        '그 금화 다 어디서 났니. …아니, 정말 묻는 건 아니야.',
        '가방이 무거워 보인다. 무거운 걸 들고 다니면 발이 느려져.'],
      re: [
        { t: '좀 나눠 줄까?', s: '됐어. 여기 있는 건 나 혼자 쓸 만큼은 돼. 네가 써.' }] },
    night: { say: [
        '이 시간에 깨어 있는 건 너랑 나뿐이야.',
        '밤엔 소리가 멀리 가. 그래서 나는 밤에 문을 안 열어.',
        '자라고는 안 할게. 나도 안 자니까.'],
      re: [
        { t: '왜 안 자?', s: ['누가 돌아올지 모르잖아.', '한 번은 문을 잠그고 잤어. 그날 밤에 두드린 사람이 있었고.'] }] },
    dawn: { say: [
        '새벽 공기가 제일 맑아. 재가 아직 안 떠서 그래.',
        '해가 뜨면 밤새 뭐가 왔다 갔는지 자국이 보여. 오늘은 깨끗하네.'],
      re: [
        { t: '다녀올게.', s: '…그 말, 매번 잘 지켜 줘서 고마워.' }] },
    goal: { say: [
        '준비는 다 된 것 같은데. 이제 남은 건 하나지.',
        '문 앞에서 오래 서 있지 마. 그게 제일 힘든 자리야.'],
      re: [
        { t: '무섭긴 해.', s: '무서운 게 정상이야. 안 무서우면 그게 더 걱정이고.' }] },
    night2: { say: [
        '이제 밤에도 문을 열어 둬. 무섭지가 않아졌어.',
        '별이 다시 뜬 밤은 몇 번을 봐도 안 익숙해지네.'],
      re: [
        { t: '같이 볼래?', s: '…그러자. 잠깐만, 등불 좀 끄고.' }] },
    day2: { say: [
        '별이 하늘로 돌아간 뒤로 재가 덜 내려. 눈에 보일 만큼.',
        '사람들이 하나둘 돌아오고 있어. 이 캠프도 곧 캠프가 아니게 되겠지.',
        '여명 마을 쪽에 가 봤니? 거기 사람들은 여기 얘기를 안 믿더라.'],
      re: [
        { t: '여기 남을 거야?', s: ['남아야지. 돌아오는 사람이 문을 못 찾으면 안 되잖아.',
                                '나는 그것 하나는 잘해.'] }] },
    day: { say: [
        '오늘도 나갈 거지. 물통은 채웠고?',
        '게시판 한 번 보고 가. 어제 새로 붙인 게 있어.',
        '조심하라는 말은 이제 안 할게. 네가 안 듣는 걸 아니까.'],
      re: [
        { t: '오늘은 어디로 가면 좋을까?', s: '네가 정해. 나는 문만 열어 둘게.' }] }
  },

  borin: {
    grave: { say: [
        '연장을 두고 왔지. 쇠는 땅에 오래 두면 상해.',
        '그 자리에 다시 가는 게 무섭거든, 나한테 위치나 말해 두게. 기억은 해 줄 테니.'],
      re: [
        { t: '다시 만들어 줄 수 있어?', s: '만들지. 대신 광석은 자네가 캐 와. 나는 그것까진 못 해.' }] },
    hurt: { say: [
        '갑옷이 아니라 자네가 우그러졌군.',
        '망치질할 손이 그 꼴이면 아무것도 못 잡네. 앉게.'],
      re: [
        { t: '방어구를 손봐 줘.', s: '가져와 보게. 쇠는 고치면 되지만 사람은 그렇지가 않아서 말이야.' }] },
    bloodmoon: { say: [
        '오늘은 화로를 안 끄고 잘 걸세. 붉은 밤엔 불빛이 벽이야.',
        '저 달이 뜨면 쇠가 이상하게 잘 먹어. 이유는 나도 모르지.'],
      re: [
        { t: '같이 있어 줄까?', s: '…화로 옆에 앉게. 말은 안 해도 되네.' }] },
    sandstorm: { say: [
        '모래바람 부는 날엔 화로를 못 열어. 재가 아니라 모래가 들어와서.',
        '자네 갑옷 이음새에 모래가 꼈군. 그거 그냥 두면 안에서 갈아 먹네.'],
      re: [
        { t: '모래 좀 털어 줘.', s: '이음새를 벌려서 털어야 하네. 앉게, 시간 좀 걸려.' }] },
    dawn: { say: [
        '이 시간에 벌써 왔나. 화로가 아직 안 데워졌네.',
        '새벽 쇠는 무르다네. 조금만 기다리게.'],
      re: [
        { t: '기다릴게.', s: '그럼 풀무나 밟아 주게. 공짜로 기다리는 건 없네.' }] },
    rain: { say: [
        '비 오는 날엔 담금질이 잘 돼. 물이 저 혼자 식혀 주거든.',
        '젖은 채로 화로 옆에 서지 말게. 김이 올라와서 눈이 상해.'],
      re: [
        { t: '오늘은 뭘 벼릴 거야?', s: '못. 아무도 안 사 가는데 계속 만들어. 손이 심심해서 그래.' }] },
    chdone: { say: [
        '무기에 자국이 늘었군. 좋은 자국이야.',
        '자네가 뭘 끝내고 오면 화로 소리가 다르게 들려. 착각이겠지만.'],
      re: [
        { t: '무기 좀 봐 줘.', s: '날이 무뎌졌군. 두고 가게, 아침까지 세워 놓을 테니.' }] },
    broke: { say: [
        '외상은 안 돼. …라고 말하고 싶지만 얼굴이 그 모양이면 어쩌겠나.',
        '돈이 없으면 광석을 캐 오게. 쇠는 언제나 돈보다 정직해.'],
      re: [
        { t: '광석 시세는 어때?', s: '싸. 아무도 안 캐는데 아무도 안 사. 그래서 쌀 수밖에.' }] },
    rich: { say: [
        '주머니 소리가 좋군. 그 소리 오래 못 갈 걸세, 내가 다 받아낼 테니.',
        '돈이 있을 때 방어구를 사 두게. 무기는 급할 때 사도 늦지 않아.'],
      re: [
        { t: '제일 좋은 걸로 줘.', s: '제일 좋은 건 아직 안 만들었네. 자네가 광석을 가져오면 그때.' }] },
    night: { say: [
        '이 시간까지 화로를 살려 두는 건 나뿐이야. 밤엔 쇠가 조용하거든.',
        '망치 소리가 시끄럽거든 말하게. …아니, 말해도 안 멈추네.'],
      re: [
        { t: '안 자?', s: '자네가 안 자는데 내가 어떻게 자나.' }] },
    goal: { say: [
        '연장은 다 챙겼나. 그럼 이제 자네 차례군.',
        '남은 게 하나면, 그 하나가 제일 무겁다네.'],
      re: [
        { t: '이 무기로 될까?', s: '되네. 안 되면 자네가 안 되는 거지 쇠가 안 되는 게 아니야.' }] },
    night2: { say: [
        '밤에 망치를 안 들어도 되는 날이 오다니.',
        '요즘은 밤에 잠이 오네. 그게 제일 신기해.'],
      re: [
        { t: '잘 자.', s: '자네도. …그 말도 오랜만이군.' }] },
    day2: { say: [
        '요즘은 무기보다 문고리 주문이 많아. 좋은 일이지.',
        '여명 마을 재련사가 나보다 낫다더군. 한 번 가 볼까 하네.'],
      re: [
        { t: '가 보는 게 어때?', s: '무릎이. …아니지, 핑계군. 생각해 보겠네.' }] },
    day: { say: [
        '어서 오게. 오늘은 뭘 부러뜨려 왔나.',
        '가죽이든 뼈든 버리지 말게. 그런 걸로도 만들 수 있는 게 있어.',
        '무릎이 예전 같지 않아. 그래서 자네가 대신 걷는 거고.'],
      re: [
        { t: '요즘 뭘 만들고 있어?', s: ['못, 경첩, 문고리. 사람이 살려면 그런 게 먼저야.', '무기는 그 다음이지. …요즘은 순서가 뒤바뀌었지만.'] }] }
  },

  mira: {
    grave: { say: [
        '네 것이 아직 저 밖에 있어. 물건 말고, 조각 얘기야.',
        '죽은 자리에는 잠깐 꿈이 고여. 오래 두면 다른 게 그 꿈을 꿔.'],
      re: [
        { t: '위험한 거야?', s: ['조각이 하는 짓과 똑같아. 규모만 작을 뿐이야.', '그러니 빨리 가져와.'] }] },
    hurt: { say: [
        '네 안의 별빛이 흔들려. 몸이 아니라 그게 먼저 다쳐.',
        '피를 그만큼 흘리면 빛도 같이 새. 나는 그게 더 걱정이야.'],
      re: [
        { t: '빛이 다 새면?', s: '그때는 조각을 만져도 아무 일이 없겠지. 좋은 일처럼 들리지만 아니야.' }] },
    bloodmoon: { say: [
        '오늘 달은 별이 아니야. 별인 척하는 거지.',
        '붉은 밤엔 조각들이 서로를 부르는 소리가 커져. 나는 그게 들려.'],
      re: [
        { t: '뭐라고 부르는데?', s: ['말이 아니야. 굳이 옮기면 — "여기 있어".', '외로운 것들이 하는 말이 늘 그래.'] }] },
    sporebloom: { say: [
        '골짜기가 숨을 뱉었어. 포자가 여기까지 오진 않지만, 냄새는 와.',
        '저건 번식이 아니라 꿈이 퍼지는 거야. 조각을 오래 곁에 둔 땅이 그렇게 돼.'],
      re: [
        { t: '퍼지면 어떻게 돼?', s: '땅이 제 이름을 잊어. 사람도 그 위에 오래 있으면 비슷해지고.' }] },
    sandstorm: { say: [
        '모래가 움직이는 건 바람 때문이 아니야. 아래에서 뭔가 뒤척여서 그래.',
        '사구 밑에도 조각이 하나 잠들어 있어. 뒤척일 때마다 사막이 자리를 옮기고.'],
      re: [
        { t: '사막 밑에도 조각이 있어?', s: ['있었어. 지금은 없고.', '그 자리가 아직 뒤척이는 거야.'] }] },
    rain: { say: [
        '비가 재를 씻어 내리면 땅이 잠깐 제 색을 기억해. 잠깐이야.',
        '오늘 같은 날엔 마력이 무거워. 주문이 반 박자 늦게 나가니까 조심해.'],
      re: [
        { t: '주문이 늦으면 어떡해?', s: '늦은 만큼 물러서. 그게 전부야.' }] },
    chdone: { say: [
        '조각 하나가 조용해졌어. 네 손에서 나는 빛이 방금 한 겹 두꺼워졌고.',
        '잘 재웠구나. 죽인 게 아니라 재운 거야. 그 차이를 기억해 둬.'],
      re: [
        { t: '재웠다는 게 무슨 뜻이야?', s: ['죽인 게 아니라는 뜻이야. 다시 깨울 수도 있다는 뜻이고.', '…그건 나중에 걱정하자.'] }] },
    broke: { say: [
        '돈이 없구나. 나는 돈을 안 받는 대신 더 나쁜 걸 받으니까 차라리 다행이야.',
        '빈손으로 와도 돼. 어차피 내가 파는 건 물건이 아니야.'],
      re: [
        { t: '대신 뭘 받는데?', s: '네 시간. 여기 앉아 있는 동안은 다른 걸 못 하잖아.' }] },
    night: { say: [
        '밤에는 별이 보여. 하나가 빠진 자리도 같이 보이고.',
        '나는 밤에 안 자. 자면 조각들 꿈에 끌려가거든.'],
      re: [
        { t: '무슨 꿈인데?', s: ['남의 꿈이야. 그게 제일 무서워.', '내 꿈이었으면 깨면 그만이잖아.'] }] },
    dawn: { say: [
        '해 뜨기 직전에 마력이 제일 얕아. 지금 나가면 조용할 거야.',
        '새벽엔 조각들도 잠깐 자. 딱 이만큼이 우리 시간이야.'],
      re: [
        { t: '지금 나갈게.', s: '그래. 해가 다 올라오기 전에 돌아와.' }] },
    goal: { say: [
        '길이 하나로 좁아졌어. 이제 돌아가는 길은 없고.',
        '조각이 너를 기다려. 기다린다는 말이 좋은 뜻은 아니야.'],
      re: [
        { t: '준비가 됐을까?', s: ['준비가 다 된 사람은 아무도 없었어.', '그래도 간 사람만 돌아왔지.'] }] },
    night2: { say: [
        '저기, 새로 뜬 자리 보이지. 저게 우리가 올려보낸 거야.',
        '밤이 무섭지 않은 건 태어나서 처음이야.'],
      re: [
        { t: '이제 잘 수 있어?', s: '아직. 그래도 자려고 눕기는 해.' }] },
    day2: { say: [
        '별이 제자리로 갔어. 그런데 내 안의 빛은 아직 안 꺼졌고.',
        '조각들이 조용해. 조용한 게 늘 좋은 건 아니지만.'],
      re: [
        { t: '네 빛은 어때?', s: '아직 타. 다 타면 그때 얘기하자.' }] },
    day: { say: [
        '네 안에서 별빛이 나. 오늘은 어제보다 조금 옅어.',
        '오늘은 별 소리가 잔잔해. 이런 날은 드물어.',
        '무엇을 물어도 대답해 줄게. 대신 대답이 마음에 안 들어도 원망하지 마.'],
      re: [
        { t: '오늘 내 빛은 어때?', s: ['어제보다 조금 옅어. 그게 나쁜 뜻만은 아니야.', '타는 건 줄어드는 거니까. 다 타기 전에 끝내면 돼.'] }] }
  },

  old: {
    hurt: { say: [
        '피는 몸이 아직 자기 것을 지키려 한다는 뜻이다. 나쁘지 않아.',
        '아프냐. …그럼 살아 있는 게지.'],
      re: [
        { t: '죽을 뻔했어요.', s: '그럼 아직 안 죽은 게지. 앉거라.' }] },
    bloodmoon: { say: [
        '저 붉은 것을 달이라 부르지 마라. 이름을 주면 자꾸 온다.',
        '오늘 밤엔 아무것도 묻지 마라. 대답이 이쪽으로 새어 나갈 게다.'] },
    sandstorm: { say: [
        '모래는 물보다 오래 기억한다. 밟은 자리가 한참 남아.',
        '바람이 옮기는 것은 모래가 아니라 자리다.'] },
    sporebloom: { say: [
        '숨을 뱉는 것이 다 살아 있는 것은 아니다. 저건 그냥 터진 게지.',
        '골짜기가 저러는 것을 나는 두 번 보았다. 두 번 다 여름이었지.'] },
    rain: { say: [
        '비가 오는구나. 이 땅이 우는 게 아니라, 그냥 물이 떨어지는 게다. 착각하지 마라.',
        '젖은 채로 서 있지 마라. 늙으면 그게 제일 먼저 온다.'],
      re: [
        { t: '…그렇네요.', s: '그래. 착각을 줄이면 오래 산다.' }] },
    chdone: { say: [
        '하나를 끝냈구나. …끝냈다고 생각하겠지.',
        '잘 했다. 그 말을 여기서 해 주는 사람이 없을 것 같아 내가 한다.'],
      re: [
        { t: '끝난 게 아닌가요?', s: '끝난 것은 늘 하나뿐이다. 그 하나가 무엇이었는지는 나중에 알게 돼.' }] },
    night: { say: [
        '늙으면 잠이 준다. 그래서 밤을 다 보게 돼.',
        '이 시간에 오는 사람은 대개 물을 게 있어서지. 물어라.'],
      re: [
        { t: '뭘 보고 계세요?', s: '밤을. 밤은 볼수록 다르다.' }] },
    goal: { say: [
        '남은 것이 하나면 서두르지 마라. 서두르면 그 하나에 먹힌다.',
        '가거라. 늙은이가 붙잡을 자리가 아니다.'],
      re: [
        { t: '다녀오겠습니다.', s: '그래. 그 말은 돌아온다는 뜻이지.' }] },
    night2: { say: [
        '보이느냐. 저 자리가 원래 자리다.',
        '이제 물을 것이 줄었구나. 그것도 나쁘지 않다.'] },
    day2: { say: [
        '별이 돌아갔다지. …나는 그것을 두 번 보았다.',
        '끝난 것이 아니다. 다만 이번에는 우리 차례가 지났을 뿐이지.'],
      re: [
        { t: '두 번이라니요?', s: ['한 번은 내가 젊었을 때다.', '그때는 아무도 올려보내지 못했지.'] }] },
    day: { say: [
        '왔구나. 오늘은 무엇이 궁금하냐.',
        '앉아라. 서서 듣는 이야기는 남지 않는다.',
        '내가 아는 걸 다 말해 주지는 않는다. 다 말하면 네가 안 갈 테니까.'],
      re: [
        { t: '무엇이든 물어도 되나요?', s: '묻거라. 대답할지는 내가 정한다.' }] }
  },

  /* ---------------- 여명 마을 ---------------- */
  tamer: {
    grave: { say: [
        '짐승들이 네 냄새를 맡고 서쪽을 봐. 뭘 두고 왔구나.',
        '한 마리 데려가. 두고 온 자리까지는 냄새로 찾아 줄 거야.'],
      re: [
        { t: '정말 찾을 수 있어?', s: '못 찾으면 최소한 같이 헤매 주기라도 하지. 사람보다 낫잖아.' }] },
    hurt: { say: [
        '그 몸으로 오면 애들이 먼저 알아. 지금 다 뒤에 숨었어.',
        '피 흘리는 사람 옆엔 짐승이 안 붙어. 미안한데 그건 나도 못 고쳐.'],
      re: [
        { t: '미안, 나중에 올게.', s: '응. 씻고 와. 애들은 안 도망가.' }] },
    bloodmoon: { say: [
        '오늘 밤엔 알들을 다 안으로 들였어. 붉은 달 뜨면 부화가 이상해져.',
        '애들이 아까부터 한쪽만 봐. 저 달을 보는 거야.'],
      re: [
        { t: '이상해진다니?', s: ['제대로 안 깨. 껍데기 안에서 다른 걸 꿈꾸다 나와.', '그래서 오늘은 안 팔아.'] }] },
    sandstorm: { say: [
        '모래바람 불면 애들이 다 굴로 들어가. 본능이지.',
        '자네 발자국에서 모래가 떨어져. 애들이 그거 냄새 맡느라 정신없어.'],
      re: [
        { t: '냄새로 뭘 알아?', s: '어디 갔다 왔는지. 사람보다 정확해.' }] },
    sporebloom: { say: [
        '포자 냄새 나면 애들이 재채기를 해. 귀엽긴 한데 몸엔 안 좋아.',
        '오늘은 문을 다 닫아 뒀어. 애들 코가 사람보다 훨씬 예민하거든.'],
      re: [
        { t: '괜찮은 거야?', s: '하루 이틀이면 가라앉아. 매번 그랬어.' }] },
    rich: { say: [
        '오늘은 좋은 알을 꺼내 놨어. 값을 보면 알 거야.',
        '돈 많은 사람한테는 비싼 애를 권해. 그게 서로한테 좋아.'],
      re: [
        { t: '제일 비싼 애로.', s: '그 말 기다렸어. 잠깐만, 안에서 꺼내 올게.' }] },
    rain: { say: [
        '비 오는 날은 애들이 잘 자. 처마 밑에서 다 뻗어 있어.',
        '젖은 손으로 알 만지지 마. 미끄러워서가 아니라, 애들이 싫어해서.'],
      re: [
        { t: '재우고 갈게.', s: '응. 발소리만 좀 줄여 줘.' }] },
    chdone: { say: [
        '뭘 하고 왔길래 애들이 다 일어나서 봐. 큰 걸 잡았구나.',
        '오늘은 순해 보이네. 짐승은 그런 걸 제일 잘 알아.'],
      re: [
        { t: '큰 걸 하나 잡았어.', s: '그거 냄새가 아직 나. 씻어도 안 지워지는 냄새가 있어.' }] },
    broke: { say: [
        '돈 없으면 알은 못 줘. 대신 쓰다듬는 건 공짜야.',
        '외상? 나는 되는데 애들이 안 된대.'],
      re: [
        { t: '그럼 쓰다듬을게.', s: '그래. 그건 아무리 해도 안 닳아.' }] },
    night: { say: [
        '밤엔 애들이 더 잘 따라. 낮엔 사람이 많아서 그런가 봐.',
        '가로등 아래서 자는 놈이 하나 있는데, 저게 제일 비싸.'],
      re: [
        { t: '저 자는 애 얘기 좀 해 줘.', s: ['이름은 아직 없어. 이름 붙이면 못 팔거든.', '…그래서 안 붙이는 거야.'] }] },
    goal: { say: [
        '애들이 자꾸 문 쪽을 봐. 자네가 곧 나갈 걸 아는 거지.',
        '하나 데려가. 혼자 가는 것보단 나아.'],
      re: [
        { t: '같이 가 줄래?', s: '그럼. 대신 돌아올 때도 같이 와.' }] },
    day: { say: [
        '오늘은 애들이 다 나와 있어. 해가 좋아서 그런가 봐.',
        '이 도시에서 제일 먼저 정착한 게 누군지 알아? 사람 아니야.',
        '알은 고르는 게 아니라 골라지는 거야. …라고 하면 좀 비싸 보이지?'],
      re: [
        { t: '한 마리 데려가도 돼?', s: '돈 내면. 정 들면 더 내고.' }] }
  },

  trainer: {
    grave: { say: [
        '장비를 흘리고 왔다고. 그건 실수가 아니라 버릇이다. 고쳐라.',
        '두고 온 자리로 다시 가는 것까지가 훈련이다. 가라.'],
      re: [
        { t: '가서 가져올게.', s: '가라. 같은 자리에서 두 번 넘어지지만 마라.' }] },
    hurt: { say: [
        '그 상태로 내 앞에 서지 마라. 가르칠 게 없다, 살아 있는 것 말고는.',
        '맞고 온 게 아니라 못 피한 거다. 앉아서 숨부터 골라라.'],
      re: [
        { t: '어떻게 피해야 하지?', s: ['먼저 움직이지 마라. 상대가 먼저 정하게 두고, 그 다음에 움직여라.', '그게 전부다. 나머지는 몸이 배운다.'] }] },
    bloodmoon: { say: [
        '붉은 밤이다. 오늘은 훈련 없다. 성벽 위에 서 있을 거다.',
        '이런 밤에 나가는 놈이 강한 게 아니라, 이런 밤을 세는 놈이 강한 거다.'],
      re: [
        { t: '같이 서 있을게.', s: '…그래. 말은 하지 마라. 소리가 멀리 간다.' }] },
    sandstorm: { say: [
        '모래바람 속에서 눈 뜨는 연습을 해 둬라. 언젠가 그 상황이 온다.',
        '오늘 훈련은 안뜰이다. 밖에서는 자세가 안 보인다.'],
      re: [
        { t: '안뜰이면 좁지 않아?', s: '좁은 데서 익힌 게 넓은 데서도 된다. 반대는 안 되고.' }] },
    sporebloom: { say: [
        '숨을 얕게, 길게. 그게 오늘 배울 전부다.',
        '포자 핀 날엔 뛰지 마라. 뛰면 더 마신다.'],
      re: [
        { t: '그럼 도망은 어떻게 쳐?', s: '도망칠 일을 안 만드는 게 먼저다.' }] },
    rain: { say: [
        '비 오는 날 훈련이 제일 낫다. 발이 미끄러우면 자세가 정직해진다.',
        '젖은 손으로 무기 잡는 법을 오늘 배워 둬라. 언젠가 그 상황이 온다.'],
      re: [
        { t: '젖은 손으로 어떻게 잡아?', s: ['더 세게 잡지 마라. 그러면 더 미끄럽다.', '손목으로 받쳐라. 손가락은 거들 뿐이다.'] }] },
    chdone: { say: [
        '얼굴이 달라졌군. 뭔가를 넘겼구나.',
        '이겼다고 자세가 좋아지진 않는다. 내일도 와라.'],
      re: [
        { t: '내일도 올게.', s: '그 말을 지킨 놈이 지금까지 셋이다. 넷째가 되어 봐라.' }] },
    broke: { say: [
        '수련비가 없으면 몸으로 때워라. 마침 옮길 짐이 있다.',
        '돈이 없다고 약해지는 건 아니다. 약해지는 건 안 굴러서다.'],
      re: [
        { t: '짐은 어디 있지?', s: '저기. 다 옮기면 한 번은 그냥 봐 준다.' }] },
    rich: { say: [
        '주머니가 무거우면 발이 늦다. 오늘은 그거부터 고치자.',
        '돈으로 살 수 있는 건 여기까지다. 그 다음은 굴러야 한다.'],
      re: [
        { t: '수련비를 더 낼게.', s: '값은 정해져 있다. 더 내도 더 안 가르친다.' }] },
    night: { say: [
        '이 시간에 왔다는 건 낮에 못 한 게 있다는 뜻이지. 좋다.',
        '야간 훈련은 반값이다. 대신 두 배로 넘어질 각오는 해라.'],
      re: [
        { t: '지금 훈련할래.', s: '좋다. 대신 소리는 내지 마라. 여관에 사람이 있다.' }] },
    dawn: { say: [
        '새벽에 오는 놈은 오래 간다. 이건 통계다.',
        '해 뜨기 전에 몸을 데워 둬라. 첫 한 방이 제일 느리다.'],
      re: [
        { t: '첫 한 방이 왜 느려?', s: '몸이 아직 어제에 있어서다. 열 번 휘두르면 오늘로 온다.' }] },
    goal: { say: [
        '남은 게 하나라면, 오늘은 훈련보다 잠이다.',
        '몸은 다 됐다. 이제 머리를 비워라.'],
      re: [
        { t: '조언 하나만.', s: ['첫 십 초를 버텨라. 그 다음은 상대가 실수한다.', '다 그렇더군.'] }] },
    day: { say: [
        '왔으면 몸부터 풀어라. 말은 그 다음이다.',
        '스탯을 다시 짜 줄 수는 있다. 대신 왜 그렇게 짰는지는 네가 알아야 한다.',
        '나는 사람을 강하게 만들지 않는다. 안 죽게 만들 뿐이다.'],
      re: [
        { t: '오늘은 뭘 배우면 되지?', s: ['넘어지는 법. 그게 첫 번째다.', '일어나는 법은 두 번째고. 대개 그건 알아서들 하더군.'] }] }
  },

  haran: {
    grave: { say: [
        '어디서 넘어졌다며. 소문은 여관이 제일 빨라.',
        '두고 온 게 있으면 술 한잔 하고 가. 맨정신으로 그 자리 다시 가는 거 아니야.'],
      re: [
        { t: '술은 됐어.', s: '그럼 방이라도. …아니, 알겠어. 조심해서 다녀와.' }] },
    hurt: { say: [
        '그 꼴로 계단 오르지 마. 1층에 방 하나 남겨 뒀어.',
        '피는 시트에 안 지워져. 그래도 자고 가. 시트는 내가 알아서 해.'],
      re: [
        { t: '방 값이 없어.', s: '오늘은 받은 걸로 할게. 대신 다음에 두 배로 받는다.' }] },
    bloodmoon: { say: [
        '붉은 달 뜬 밤엔 손님이 는다. 다들 나가기 싫어하거든.',
        '오늘은 문을 일찍 닫아. 자네만 늦게 두드려도 열어 줄게.'],
      re: [
        { t: '문 열어 둘 수 있어?', s: '자네가 두드리면. 다른 사람은 안 돼.' }] },
    sandstorm: { say: [
        '창틀 사이로 모래가 들어와. 하루 종일 쓸고 있어.',
        '모래 씹히는 술은 팔 수가 없지. 오늘은 뚜껑 덮은 것만 내갈게.'],
      re: [
        { t: '쓸어 줄까?', s: '손님한테 빗자루를 쥐여 주는 여관이 어디 있나. …그래도 고맙군.' }] },
    sporebloom: { say: [
        '문 닫아 뒀어. 그 냄새가 방에 배면 손님이 안 자.',
        '포자 핀 날엔 이상하게 다들 오래 앉아 있어. 말수가 줄고.'],
      re: [
        { t: '다들 왜 말이 없어?', s: '그 냄새 맡으면 옛날 생각이 난대. 나도 그렇고.' }] },
    rain: { say: [
        '지붕에 기와 얹은 보람이 오늘이지. 소리 좋잖아.',
        '비 오는 날은 술이 잘 팔려. 슬퍼서가 아니라 나갈 데가 없어서야.'],
      re: [
        { t: '한잔 주게.', s: ['이 시간에? …좋아, 딱 한 잔.', '취해서 나가면 내가 욕먹어.'] }] },
    chdone: { say: [
        '표정 보니 오늘은 축하할 일이 있구먼. 한 잔은 내가 낸다.',
        '큰일 끝내고 오는 사람은 걸음이 달라. 나는 그걸로 안다.'],
      re: [
        { t: '고마워.', s: '고맙긴. 자네가 살아 돌아오는 게 내 장사야.' }] },
    broke: { say: [
        '주머니 사정 알아. 오늘은 물이라도 공짜로 줄게.',
        '돈 없는 손님이 제일 오래 앉아 있어. 그래서 나는 그 손님이 좋아.'],
      re: [
        { t: '물이면 충분해.', s: '…그렇게 말하는 손님이 제일 마음에 걸려.' }] },
    rich: { say: [
        '오늘은 좋은 방으로 드리지. 값도 좋은 값으로 받고.',
        '금화 소리가 나는군. 이 도시에서 그 소리 나는 사람은 자네뿐이야.'],
      re: [
        { t: '제일 좋은 방으로.', s: '3층. 창이 동쪽이야. 해 뜨는 게 보여.' }] },
    night: { say: [
        '이 시간에 깨어 있는 건 나랑 자네뿐이야. 늘 그렇지.',
        '자고 가. 아침까지는 아무 일 없게 해 줄게.'],
      re: [
        { t: '한 잔만 더.', s: '마지막이야. 매번 마지막이라고 하지만.' }] },
    dawn: { say: [
        '벌써 나가려고? 아침은 먹고 가.',
        '해 뜨는 거 보고 가. 이 도시에서 그거 하나는 볼 만해.'],
      re: [
        { t: '아침은 됐어.', s: '그럼 물이라도 들고 가. 이건 안 받아.' }] },
    goal: { say: [
        '오늘은 방값 안 받을게. 대신 자고 가.',
        '마지막 하나 남았다며. 그럼 나가기 전에 뭐라도 먹어.'],
      re: [
        { t: '돌아와서 먹을게.', s: '그 말 지켜. 나 그 말 세고 있어.' }] },
    day: { say: [
        '어서 와. 오늘은 한 잔인가, 한 밤인가.',
        '언젠가 이 방들이 다 찰 거야. 나는 그날까지는 안 접어.',
        '간판을 새로 달까 하는데, 뭐라고 쓸지를 모르겠어.'],
      re: [
        { t: '간판 이름 하나 지어 줄까?', s: ['말해 보게. …아니, 됐어. 자네가 지으면 이상할 것 같아.'] }] }
  },

  seira: {
    grave: { say: [
        '벼려 준 물건을 흘리고 왔다고? …그건 확률 얘기가 아니라 태도 얘기야.',
        '가서 주워 와. 내가 만든 건 내가 다시 만들기 싫으니까.'],
      re: [
        { t: '미안해.', s: '나한테 미안할 건 없어. 자네 물건이잖아.' }] },
    hurt: { say: [
        '장비가 아니라 자네가 금 갔군. 그건 내가 못 고쳐.',
        '그 몸으로 재련해 봤자 손이 떨려서 실패해. 나 말고 자네가.'],
      re: [
        { t: '그래도 벼려 줘.', s: '…한 번만. 실패해도 오늘은 값 안 받을게.' }] },
    bloodmoon: { say: [
        '붉은 밤엔 재련이 잘 된다는 말이 있어. 미신이야. …그런데 나는 오늘 좀 더 걸어.',
        '풀무 소리가 오늘따라 낮아. 불도 저 달을 아는 건가 싶고.'],
      re: [
        { t: '미신 아니야?', s: '미신이야. 그런데 나도 오늘은 한 번 더 돌려.' }] },
    sandstorm: { say: [
        '모래가 들어가면 쇳물이 못 쓰게 돼. 오늘은 안 벼려.',
        '풀무에 모래 한 줌이면 하루가 날아가. 그래서 오늘은 쉬는 거야.'],
      re: [
        { t: '쉬는 날인가?', s: '풀무 청소하는 날이지. 쉬는 날은 없어.' }] },
    dawn: { say: [
        '밤새 살려 둔 불이 지금 제일 좋아. 벼릴 거면 지금.',
        '해 뜨기 전 한 시간, 그때가 손이 제일 정확해.'],
      re: [
        { t: '지금 부탁할게.', s: '그럼 앉아. 불이 제일 좋을 때야.' }] },
    rain: { say: [
        '비 오는 날엔 불을 살려 두기가 어려워. 대신 식히기는 좋고.',
        '습하면 쇠가 잘 안 먹어. 오늘 실패해도 나 원망하지 마.'],
      re: [
        { t: '그럼 다음에.', s: '그래. 오늘 하면 자네가 나를 원망할 거야.' }] },
    chdone: { say: [
        '뭘 끝내고 왔군. 그럼 이제 장비를 다시 볼 때야.',
        '한 고비 넘겼으면 다음 고비는 장비가 정해. 그게 내 일이고.'],
      re: [
        { t: '뭘 먼저 손봐야 할까?', s: '맞는 걸 줄이는 것부터. 때리는 건 그 다음이야.' }] },
    broke: { say: [
        '돈 없이 재련하러 오면 곤란해. 운도 돈으로 사는 거야.',
        '공짜로 해 준 적 없어. 앞으로도 없을 거고.'],
      re: [
        { t: '다음에 올게.', s: '응. 돈 들고 와. 나는 안 도망가.' }] },
    rich: { say: [
        '오, 오늘은 여러 번 돌릴 수 있겠군. 여러 번 돌리면 결국 오르긴 해.',
        '돈이 많으면 확률이 착해 보여. 그건 착시야. 알고나 써.'],
      re: [
        { t: '결국 오른다는 거지?', s: ['결국은. 문제는 그 결국이 언제냐는 거고.', '나는 그걸 모른다고 미리 말했다.'] }] },
    night: { say: [
        '밤에 벼린 게 더 잘 나온다는 말도 있어. 통계로는 아니야.',
        '풍차 덕에 밤에도 불을 살려 둬. 잠은 낮에 자고.'],
      re: [
        { t: '낮에 자면 안 피곤해?', s: '피곤하지. 그런데 밤이 조용해서 손이 덜 떨려.' }] },
    goal: { say: [
        '마지막이라며. 그럼 장비를 한 번 더 볼 때야.',
        '지금 실패하면 다시 벼릴 시간이 없어. 그러니 지금 해.'],
      re: [
        { t: '한 번만 더 돌려 줘.', s: '…한 번만. 나도 오늘은 손이 떨리네.' }] },
    day: { say: [
        '들고 온 거 있어? 없으면 구경만 하고 가.',
        '올릴 수 있냐고 묻지 마. 올라갈 수도 있냐고 물어.',
        '내 손은 정직해. 정직하다고 다 좋은 건 아니지만.'],
      re: [
        { t: '올라갈 수도 있어?', s: ['있어. 내려갈 수도 있고.', '그게 정직한 대답이야.'] }] }
  },

  kade: {
    grave: { say: [
        '어디에 흘렸는지 좌표를 말해 보게. …농담이야. 그런 걸 재는 기계는 아직 없어.',
        '물건이 어디 있는지 아는 기계를 만들면 이 도시가 부자가 될 텐데 말이지.'],
      re: [
        { t: '농담 아니고 필요해.', s: '…만들어 볼게. 기대는 하지 말고.' }] },
    hurt: { say: [
        '자네 지금 걷는 소리가 이상해. 관절 어디 하나가 어긋난 거야.',
        '사람 몸은 도면이 없어서 곤란해. 있으면 내가 고쳐 줬을 텐데.'],
      re: [
        { t: '도면이 있으면 고쳐 줄 거야?', s: '고칠 거야. 그래서 안 만드는 걸지도 모르지.' }] },
    bloodmoon: { say: [
        '저 달 뜬 밤엔 포탑 조준이 어긋나. 붉은 빛이 렌즈를 속이는 거지.',
        '오늘은 성벽 계통을 하나씩 다시 봐. 나가려거든 문 쪽으로 가.'],
      re: [
        { t: '조준을 손볼 수 있어?', s: '렌즈를 갈아야 해. 그건 자네가 유적에서 하나 주워 와야 하고.' }] },
    sandstorm: { say: [
        '옷에 모래가 잔뜩이군. 사구가 통째로 움직였다지?',
        '그 모래, 좀 남겨 두게. 유리로 뽑아 볼 데가 있어.'],
      re: [
        { t: '모래 여기 있어.', s: '좋아. 이걸로 렌즈를 뽑으면 붉은 달에도 안 속을지 몰라.' }] },
    sporebloom: { say: [
        '포자가 접점에 앉으면 통전이 이상해져. 살아 있는 게 회로에 붙는 셈이니까.',
        '오늘은 환기구를 다 막아 뒀어. 도시가 숨을 참는 중이지.'],
      re: [
        { t: '환기구를 열면?', s: '포자가 들어와. 그러면 도시가 숨을 쉬다가 기침을 하겠지.' }] },
    rich: { say: [
        '돈이 있으면 부품을 쟁여 두게. 급할 때 없는 게 제일 비싸.',
        '자네가 부자면 이 도시가 부자야. 다른 사람이 없거든.'],
      re: [
        { t: '부품 좀 사 둘게.', s: '현명해. 나중에 나한테 되팔 때도 잘 쳐줄게.' }] },
    dawn: { say: [
        '밤새 붙잡고 있던 게 방금 됐어. 자네가 첫 손님이군.',
        '새벽에 전압이 제일 안정적이야. 아무도 안 쓰니까.'],
      re: [
        { t: '뭐가 됐는데?', s: '포탑 조준 보정. 이제 새는 안 쏴.' }] },
    rain: { say: [
        '전주 선로에 물이 들어가면 곤란해. 오늘은 하루 종일 사다리 위야.',
        '비 맞은 채로 배터리 근처에 서지 말게. 진심으로 하는 말이야.'],
      re: [
        { t: '사다리 잡아 줄게.', s: '…고맙군. 사실 그게 제일 무서웠어.' }] },
    chdone: { say: [
        '뭔가 끝냈군. 표정보다 걸음이 먼저 말해 줘.',
        '자네가 하나 끝낼 때마다 이 도시의 도면이 한 장씩 채워지는 기분이야.'],
      re: [
        { t: '도면이 뭔데?', s: ['내가 그리는 거야. 이 도시가 어떻게 생겼는지.', '다 그리면 누가 지었는지도 알게 되겠지.'] }] },
    broke: { say: [
        '부품은 외상이 안 돼. 대갈못 하나도 어디서 왔는지 다 세거든.',
        '돈이 없으면 고물을 가져오게. 나한테는 그게 더 반가워.'],
      re: [
        { t: '고물이면 뭐든 돼?', s: '뭐든. 특히 안 쓰는 거. 사람들은 안 쓰는 걸 제일 안 버리거든.' }] },
    night: { say: [
        '밤에 작업하는 게 나아. 낮엔 사람이 말을 걸어서. …자네 말고.',
        '이 시간엔 도시가 조용해. 그러면 벽 안에서 나는 소리가 들리거든.'],
      re: [
        { t: '도와줄까?', s: '손 하나면 돼. 여기 잡고 있어 봐.' }] },
    goal: { say: [
        '남은 게 하나면 부품을 다 채워 가게. 아끼다 죽는 사람 많이 봤어.',
        '포탑에 대갈못을 채워 뒀어. 자네가 나가는 길은 뚫려 있을 걸세.'],
      re: [
        { t: '든든하군.', s: '인사는 돌아와서 하게. 미리 받으면 부정 타.' }] },
    day: { say: [
        '마침 잘 왔네. 손이 하나 모자랐거든. …농담이야, 반은.',
        '벽 안쪽에 배선이 있어. 우리가 깐 게 아니고, 아직 살아 있어.',
        '유적 문양이랑 이 도시 문양이 같아. 우연이라기엔 획순까지 같더군.'],
      re: [
        { t: '뭘 알아냈어?', s: ['벽 안쪽 배선이 아직 살아 있다는 것. 그리고 그게 어디로 가는지는 모른다는 것.', '두 번째가 더 중요해.'] }] }
  }
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
      { type: 'collect', item: 'wood', n: 10, t: '불을 피울 것부터', task: '나무 10개', verb: 'gather' },
      { type: 'craft', item: 'plank', t: '무너진 것을 다시 세우려면', task: '판자 만들기', verb: 'craft' },
      { type: 'kill', target: 'slime', n: 3, t: '잿빛이 걸어 다니는 것을 처음 본다', task: '잿빛 슬라임 3마리', verb: 'kill' }
    ],
    needBasics: 2,
    require: [],
    goal: { type: 'talk', npc: 'elara', t: '살아 있는 사람을 찾는다', task: '엘라라와 대화', verb: 'talk' },
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
      { type: 'mine', tile: T.COPPER, n: 12, t: '땅속에는 아직 색이 남아 있다', task: '구리 광맥 12번', verb: 'dig' },
      { type: 'kill', target: 'slime', n: 8, t: '하나가 둘이 되기 전에', task: '갈라진 것 8마리', verb: 'kill' },
      { type: 'craft', item: 'sword_copper', t: '맨손으로는 안 된다', task: '구리 장검 벼리기', verb: 'craft' },
      { type: 'explore', ruin: 'mine', t: '사람들이 두고 간 갱도', task: '버려진 광산 탐험', verb: 'explore' }
    ],
    needBasics: 2,
    require: ['dig'],
    goal: { type: 'boss', target: 'king_slime', t: '한 덩어리가 더 갈라지지 않을 때까지', task: '슬라임 왕 토벌', verb: 'boss' },
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
      { type: 'depth', y: 170, t: '아래로 갈수록 조용해진다', task: '지하 450m', verb: 'depth' },
      { type: 'kill', target: 'skeleton', n: 10, t: '누운 자리에서 일어난 것들', task: '무덤지기 10마리', verb: 'kill' },
      { type: 'kill', target: 'spider', n: 8, t: '갱도를 다시 차지한 것', task: '동굴 거미 8마리', verb: 'kill' },
      { type: 'kill', target: 'minerghost', n: 5, t: '아직 퇴근하지 못한 사람들', task: '광부의 유령 5마리', verb: 'kill' }
    ],
    needBasics: 2,
    require: ['depth'],
    goal: { type: 'boss', target: 'bone_lord', t: '뼈 위에 앉은 것을 내린다', task: '뼈의 군주 토벌', verb: 'boss' },
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
      { type: 'collect', item: 'corrupt_ess', n: 14, t: '흙까지 물든 것을 걷어 낸다', task: '부패의 정수 14개', verb: 'gather' },
      { type: 'kill', target: 'shadoweye', n: 8, t: '보고 있는 것을 먼저 없앤다', task: '그림자 눈 8마리', verb: 'kill' },
      { type: 'kill', target: 'crawler', n: 8, t: '사냥하던 것이 사냥당한다', task: '부패한 사냥꾼 8마리', verb: 'kill' },
      { type: 'kill', target: 'corrupttree', n: 5, t: '뿌리부터 굶주려 있다', task: '부패한 나무 5그루', verb: 'kill' }
    ],
    needBasics: 2,
    require: ['gather'],
    goal: { type: 'boss', target: 'corrupt_heart', t: '굶주림의 한가운데', task: '부패의 심장 토벌', verb: 'boss' },
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
      { type: 'collect', item: 'frost_core', n: 12, t: '얼지 않으려면 불씨가 있어야 한다', task: '서리 결정 12개', verb: 'gather' },
      { type: 'kill', target: 'frostling', n: 10, t: '추위가 스스로 걸어 다닌다', task: '서리 정령 10마리', verb: 'kill' },
      { type: 'kill', target: 'icewolf', n: 8, t: '무리로 온다', task: '얼음 늑대 8마리', verb: 'kill' },
      { type: 'explore', zone: 'ice', t: '왕좌가 있다는 곳까지', task: '서리 지대 심부 도달', verb: 'explore' }
    ],
    needBasics: 3,
    require: ['gather'],
    goal: { type: 'boss', target: 'frost_witch', t: '조각을 재우지 않은 사람과 마주 선다', task: '실비아 토벌', verb: 'boss' },
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
      { type: 'depth', y: 395, t: '가장 깊이 떨어진 조각', task: '지하 1600m', verb: 'depth' },
      { type: 'kill', target: 'imp', n: 10, t: '아래에는 불이 산다', task: '화염 임프 10마리', verb: 'kill' },
      { type: 'kill', target: 'wraith', n: 8, t: '내려온 사람들이 남긴 것', task: '심연의 망령 8마리', verb: 'kill' },
      { type: 'collect', item: 'void_frag', n: 12, t: '공허가 부스러진 자리', task: '공허 조각 12개', verb: 'gather' }
    ],
    needBasics: 3,
    require: ['depth'],
    goal: { type: 'boss', target: 'void_king', t: '꿈꿀 필요가 없었던 것', task: '공허의 왕 토벌', verb: 'boss' },
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
      { type: 'depth', y: 34, up: 1, t: '올려다보던 것 위에 선다', task: '하늘 섬 도달', verb: 'depth' },
      { type: 'kill', target: 'gale', n: 10, t: '바람이 길을 막는다', task: '바람 정령 10마리', verb: 'kill' },
      { type: 'kill', target: 'sky_sentry', n: 8, t: '누가 세워 둔 파수꾼인가', task: '하늘 파수꾼 8기', verb: 'kill' },
      { type: 'collect', item: 'aether_shard', n: 15, t: '하늘에서만 굳는 것', task: '에테르 파편 15개', verb: 'gather' }
    ],
    needBasics: 3,
    require: ['depth'],
    goal: { type: 'boss', target: 'storm_warden', t: '폭풍이 지키고 있던 것', task: '폭풍의 수호자 토벌', verb: 'boss' },
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
      { type: 'collect', item: 'rune_frag', n: 3, t: '석판 셋이 한 문장을 나눠 적었다', task: '룬 조각 3개', verb: 'gather' },
      { type: 'craft', item: 'ruin_key', t: '문은 안에서 만든 것으로만 열린다', task: '유적의 열쇠 벼리기', verb: 'craft' },
      { type: 'kill', target: 'ruin_guard', n: 8, t: '아직도 명령을 지키고 있다', task: '유적 수호병 8기', verb: 'kill' },
      { type: 'kill', target: 'archivist', n: 6, t: '읽던 것을 놓지 못한 사람들', task: '잊힌 사서 6명', verb: 'kill' }
    ],
    needBasics: 3,
    require: ['gather', 'craft'],
    goal: { type: 'boss', target: 'first_keeper', t: '먼저 왔던 이들의 마지막 문장', task: '최초의 파수꾼 토벌', verb: 'boss' },
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
      { type: 'collect', item: 'star_heart', n: 5, t: '다섯 조각을 한자리에', task: '별의 심장 5개', verb: 'gather' },
      { type: 'craft', item: 'star_whole', t: '부서진 것을 되맞춘다', task: '되맞춘 별 만들기', verb: 'craft' },
      { type: 'craft', item: 'sum_pursuer', t: '이번에는 우리가 부른다', task: '별의 부름 만들기', verb: 'craft' }
    ],
    needBasics: 2,
    require: ['craft'],
    goal: { type: 'boss', target: 'pursuer', t: '이번에는 넘기지 않는다', task: '추적자 토벌', verb: 'boss' },
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
      { type: 'collect', item: 'steel_plate', n: 24, t: '이 도시는 강철로 되어 있다', task: '강철판 24개', verb: 'gather' },
      { type: 'collect', item: 'power_core', n: 6, t: '아직 식지 않은 것이 있다', task: '동력석 6개', verb: 'gather' },
      { type: 'kill', target: 'scrapcrawler', n: 10, t: '기어다니는 고철', task: '고철 기어다니개 10기', verb: 'kill' },
      { type: 'kill', target: 'sparkwisp', n: 8, t: '전기가 아직 흐른다', task: '불티 정령 8기', verb: 'kill' }
    ],
    needBasics: 2,
    require: [],
    goal: { type: 'talk', npc: 'kade', t: '여기에 도시를 세울 수 있다', task: '케이드와 대화', verb: 'talk' },
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
      { type: 'collect', item: 'blueprint_frag', n: 3, t: '설계도는 셋으로 나뉘어 있다', task: '설계도 조각 3개', verb: 'read' },
      { type: 'kill', target: 'riveter', n: 10, t: '공장이 스스로를 지킨다', task: '대갈못 사수 10기', verb: 'kill' },
      { type: 'kill', target: 'foreman', n: 6, t: '누구도 퇴근시키지 않았다', task: '옛 십장 6기', verb: 'kill' },
      { type: 'craft', item: 'pick_drill', t: '공창의 방식으로 판다', task: '시추 곡괭이 만들기', verb: 'craft' }
    ],
    needBasics: 2,
    require: ['read'],
    goal: { type: 'boss', target: 'overseer', t: '관리자에게 멈추라고 말한다', task: '공창의 관리자 정지', verb: 'boss' },
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
      { type: 'craft', item: 'm_assembler', t: '손을 대신할 것을 만든다', task: '조립기 만들기', verb: 'craft' },
      { type: 'collect', item: 'gear_basic', n: 30, t: '맞물릴 것이 있어야 돈다', task: '기어 30개', verb: 'gather' },
      { type: 'collect', item: 'steel_plate', n: 30, t: '골조부터 세운다', task: '강철판 30개', verb: 'gather' },
      { type: 'kill', target: 'riveter', n: 8, t: '늘어난 것이 마을까지 왔다', task: '대갈못 사수 8기', verb: 'kill' }
    ],
    needBasics: 3,
    require: ['craft'],
    goal: { type: 'place', mach: 'assembler', stop: 1, t: '스스로 도는 것을 손으로 끊어 본다', task: '조립기 설치 · 동력 · 정지', verb: 'place' },
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
      { type: 'craft', item: 'm_switch', t: '멈추게 할 것을 먼저 만든다', task: '정지 스위치 만들기', verb: 'craft' },
      { type: 'depth', y: 318, t: '내려갈수록 뜨거워진다', task: '지하 1240m', verb: 'depth' },
      { type: 'kill', target: 'splitter', n: 10, t: '하나가 둘을 만들고 있다', task: '증식 기계 10기', verb: 'kill' },
      { type: 'collect', item: 'core_shard', n: 22, t: '노심이 부스러진 자리', task: '노심 파편 22개', verb: 'gather' }
    ],
    needBasics: 3,
    require: ['craft'],
    goal: { type: 'boss', target: 'proliferator', t: '갈라지는 것을 끝낸다', task: '증식체 정지', verb: 'boss' },
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
      { type: 'craft', item: 'stop_core', t: '『멈춰라』 하나만 크게 적었다', task: '정지 핵 만들기', verb: 'craft' },
      { type: 'collect', item: 'core_shard', n: 45, t: '핵을 채울 것', task: '노심 파편 45개', verb: 'gather' },
      { type: 'kill', target: 'coreling', n: 12, t: '떨어져 나온 것도 멈추지 않는다', task: '노심 파편체 12기', verb: 'kill' },
      { type: 'kill', target: 'weldarm', n: 8, t: '고치던 팔이 붙잡는다', task: '용접 팔 8기', verb: 'kill' }
    ],
    needBasics: 3,
    require: ['craft'],
    goal: { type: 'boss', target: 'hepha', t: '멈추면 아무도 남지 않는다', task: '헤파 토벌', verb: 'boss' },
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
      { type: 'craft', item: 'atelier_key', t: '벽이 만든 것으로만 벽을 연다', task: '설계실의 인장 만들기', verb: 'craft' },
      { type: 'collect', item: 'draft_glass', n: 30, t: '도면이 떠 있는 유리', task: '설계 유리 30개', verb: 'gather' },
      { type: 'kill', target: 'draft_form', n: 10, t: '끝까지 조립되지 못한 것들', task: '미완의 형상 10기', verb: 'kill' },
      { type: 'kill', target: 'scribe_hand', n: 8, t: '아직도 무언가 적고 있다', task: '기록하는 손 8기', verb: 'kill' }
    ],
    needBasics: 3,
    require: ['craft'],
    goal: { type: 'boss', target: 'archetype', t: '사람을 본떠 만든 첫 번째 것', task: '원형 토벌', verb: 'boss' },
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
/* ================= 세션 =================

   ■ 경계가 아홉 군데에 박혀 있었다

     "세션 2인가"를 묻는 자리가 `chapter >= 9` 로 **아홉 군데에 손으로** 적혀
     있었다 — 낚시표 둘, 의뢰 판정, 상황 대사, 목표 안내, 잿빛 깊이, 일지의 세션
     탭(두 줄짜리 배열까지). 세션 3 을 붙이려면 그 아홉을 전부 찾아 고쳐야 했고,
     하나라도 빠뜨리면 3세션에서 2세션 규칙이 조용히 돌아간다(잿빛이 다시 끼거나
     의뢰가 안 붙는 식으로 — 티가 안 나는 쪽으로 어긋난다).

     이제 표 한 줄이다. **세션을 늘릴 때는 여기에 한 줄만 더한다.**

       id    세션 번호
       n t   일지 탭에 적히는 이름과 부제
       ch0   이 세션이 시작하는 장

     ★ 장을 늘릴 때 같이 봐야 하는 자리들은 docs/story-and-sessions.md 에 표로
       모아 두었다. 이 표만 고치고 끝나는 게 아니다. */
const SESSIONS = [
  { id: 1, n: '세션 1', t: '잿빛의 여정', ch0: 0 },
  { id: 2, n: '세션 2', t: '벽 너머', ch0: 9 }
];
/** 그 장이 속한 세션. 표보다 큰 장은 마지막 세션으로 본다 */
const sessionOf = (ch) => {
  let s = SESSIONS[0];
  for (const x of SESSIONS) if ((ch || 0) >= x.ch0) s = x;
  return s;
};
/** 그 세션의 장 목록 (CHAPTERS 를 훑어 만든다 — 장에 세션을 따로 적지 않는다) */
const chaptersOf = (sid) => {
  const i = SESSIONS.findIndex(x => x.id === sid);
  if (i < 0) return [];
  const lo = SESSIONS[i].ch0, hi = SESSIONS[i + 1] ? SESSIONS[i + 1].ch0 : Infinity;
  return CHAPTERS.filter(c => c.id >= lo && c.id < hi);
};

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

/* ================= 장마다 듣는 이야기 =================

   ■ 일곱 장 동안 같은 말을 했다

     표가 여덟 칸(0~7장)뿐인데 장은 열다섯이다. game.js 가
     `DIALOGUE[id][Math.min(chapter, 길이-1)]` 로 읽으니, **7장부터 14장까지
     여덟 장을 내리 같은 대사**를 했다. 세션 2 를 통째로 지나는 동안 캠프 넷은
     세션 1 이 끝나던 날의 말을 되풀이한 셈이다.

     여명 마을 다섯은 더했다. 장별 대사를 아예 안 읽고 서명 같은 한 줄과 마을
     단계 대사만 들고 있었다 — 세션 2 의 장 카드에서 가장 많이 말하는 사람이
     케이드인데, 정작 만나서 말을 걸면 늘 같은 한 줄이었다.

   ■ 아홉 사람 × 장

     캠프 넷은 8~14장을 더해 열다섯 칸으로 채웠다. 여명 마을 다섯은 9장부터
     존재하므로 0~8 칸을 비워 두고 9~14 만 적는다(talkVillager 가 빈 칸이면
     서명 대사로 떨어진다).

     장 카드가 "무슨 일이 일어났는가"라면 이쪽은 "그 일을 사람들이 어떻게
     받아들였는가"다. 같은 사건을 아홉이 다르게 말한다 — 보린은 손으로,
     미라는 꿈으로, 가른은 몸으로, 하란은 방 수로 센다. */
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
    ['땅 밑에 그런 게 있었다니. 이 마을은 대체 무엇 위에 서 있었던 걸까.'],
    ['별을 쫓아온 게 왔다더구나. …무엇이 무서워서 별이 도망쳤는지, 이제야 알겠어.',
     '다녀와. 돌아올 자리는 내가 지키고 있을게. 그게 내 일이야.'],
    ['벽돌에 정 자국이 하나도 없어. 보린이 그걸 보고 한참을 앉아 있었단다.',
     '사람이 안 지은 집에 사람이 들어와 사는 거지. …나쁘다는 건 아니야. 이상할 뿐이지.'],
    ['아래에서 뭘 보고 왔는지 네 얼굴에 다 적혀 있구나.',
     '몇백 년을 아무도 안 시켰는데 계속 일했다고? …그건 부지런한 게 아니라 외로운 거야.'],
    ['열흘 만에 마을이 달라졌어. 좋기도 하고 무섭기도 하고.',
     '어제는 빨래하다가 문득 손이 할 일이 없더구나. 그게 왜 서운했을까.'],
    ['발밑이 계속 울려. 밤에 자다가도 그 소리에 깬단다.',
     '아래에 또 하나 있다는 말은… 그 아래에도 있다는 말이겠지.'],
    ['천 년을 혼자 돌았다고 했지. 나는 넉 달을 혼자 있었는데도 미칠 것 같았어.',
     '가서 말해 줘. 위에 사람이 있다고. 그 말을 기다린 것 같으니까.'],
    ['만들다 만 사람들이라니. …그럼 완성된 건 무엇이 달랐던 걸까.',
     '돌아오면 이 마을에 이름을 붙이자. 잿빛도, 여명도 말고 — 우리가 지은 이름으로.']
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
    ['유적 벽돌은 내 화로로도 안 녹아. 우리보다 잘 만들었어, 그 사람들.'],
    ['별을 쫓아온 것이라. …벼려서 될 상대가 아닌 건 나도 안다.',
     '그래도 하나 만들어 놨어. 가져가. 내가 할 수 있는 건 이것뿐이야.'],
    ['벽돌 하나 떼어 봤는데 이음매가 없어. 통째로 나온 거야, 이게.',
     '나는 평생 두드려서 붙였는데. …여긴 붙일 데가 없어.'],
    ['무릎만 아니었으면 나도 내려갔을 거다. 그런 화로는 평생에 한 번 볼까 말까야.',
     '올라오거든 하나만 말해 줘. 불은 무엇으로 때더냐.'],
    ['대장간 옆에 낯선 게 자꾸 늘어. 나쁘진 않아. 다만…',
     '내 망치 소리가 저것들 소리에 묻혀. 그게 좀 서운하다.'],
    ['아래에서 저 혼자 늘어난다고? 쇠가 새끼를 친다는 말은 처음 듣는다.',
     '나는 하나 만들려고 사흘을 두드려. 그 사흘이 다행인 거였구나.'],
    ['사람이 손으로 만든 마지막 기계라고 했지. …그럼 그건 내 쪽 일이다.',
     '부수지 말고 말부터 걸어 봐. 만든 사람 대신 내가 부탁한다.'],
    ['사람 설계도라니. 키랑 손 길이까지 적혀 있었다며.',
     '나는 사람은 못 만들어. 대신 사람이 쓸 걸 만들지. …그걸로 됐다고 생각해.']
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
    ['석판을 읽었어? …그럼 이제 알겠지. 우리가 처음이 아니라는 걸.'],
    ['조각 다섯이 다 모였는데 네 손의 별빛이 아직 안 꺼졌네.',
     '…그건 다 탄 게 아니라, 다 탈 필요가 없어졌다는 뜻이야.'],
    ['이 도시엔 꿈이 없어. 잿빛도 없고.',
     '잠든 적이 없는 거야. 계속 깨어서 돌기만 했어. 조각보다 그게 더 무서워.'],
    ['멈출 권한은 있는데 멈출 이유는 못 배웠다니.',
     '조각은 잘못 꿈꿔서 그랬지. 저건 꿈도 안 꿨어. 어느 쪽이 더 나쁜지 모르겠다.'],
    ['너무 빨라. 빠른 게 나쁜 게 아니라, 빠른 다음에 뭐가 오는지 우리가 방금 보고 왔잖아.',
     '케이드한테 뭐라고는 안 할 거야. 저 애 눈이 지금 제일 밝거든.'],
    ['3,400번을 혼자 결재했대. 아무도 안 물어봤으니까.',
     '나도 스승한테 그렇게 배웠어. 혼자 정하면 안 되는 걸 혼자 정하면… 실비아처럼 돼.'],
    ['멈추면 아무도 안 남는다는 걸 알아서 안 멈춘 거야. 그건 고집이 아니라 지킨 거지.',
     '가서 대답해 줘. 이번엔 남는다고. 그 말을 천 년 동안 기다린 거니까.'],
    ['사람을 그려서 만들었다는 게, 나는 별 조각 얘기보다 어려워.',
     '그런데 그 도면에 우리 손은 안 그려져 있었대. 그럼 우리는 저 사람들이 못 그린 쪽인 거야.']
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
    ['문을 열 셈이냐. …말리지 않으마. 나도 그때 그랬으니.'],
    ['드디어 그것이 왔구나. 나는 이 날을 여든 해 기다렸다.',
     '무섭거든 무섭다고 하거라. 그 말을 할 수 있는 것이 사람이다.'],
    ['이 도시를 나는 알고 있었다. 아무에게도 말하지 않았을 뿐이지.'],
    ['멈추라고 가르친 사람이 없었다니. …가르칠 사람이 먼저 멈춘 게지.'],
    ['빠른 것이 나쁘다는 말이 아니다. 손 뗄 자리를 같이 만들지 않은 것이 나쁜 게다.'],
    ['셋, 넷, 그리고 또 셋. 세다 보면 끝이 없다. 세지 말고 끊어라.'],
    ['그 아이는 명령을 어긴 것이 아니다. 지킨 게다. 그 둘이 같아 보이는 날이 있다.'],
    ['…나도 그 방을 본 적이 있다. 아주 어렸을 적에.',
     '무엇을 보았느냐고는 묻지 마라. 그때 나는 아무것도 이해하지 못했으니까.',
     '이제는 네가 보았으니, 나보다 네가 더 안다.']
  ],

  /* ---- 여명 마을 다섯 (9장부터 세계에 존재한다) ----
     앞의 아홉 칸(0~8장)은 비워 둔다. talkVillager 가 빈 칸이면 서명 대사로 떨어진다. */
  tamer: [null, null, null, null, null, null, null, null, null,
    ['애들이 이 도시를 안 좋아해. 냄새가 없대.',
     '짐승은 사람 살던 자리 냄새를 맡거든. 여긴 그게 없어.'],
    ['네가 아래에서 올라온 날, 우리 애들이 전부 문 쪽만 보고 있었어.',
     '뭘 들은 거야. 나는 못 들었는데.'],
    ['기계 소리에 애들이 익숙해지는 중이야. 사람보다 빨라.',
     '…나는 아직 안 익숙해졌는데.'],
    ['땅이 울리는 날엔 알이 안 깨. 이유는 몰라.',
     '그냥 기다려. 아래가 조용해지면 깰 거야.'],
    ['짐승도 혼자 오래 두면 이상해져. 돌기만 하고 안 먹어.',
     '천 년이면… 그건 짐승한테 할 짓이 아니야. 기계라고 다를까.'],
    ['오늘 처음으로 애들이 지하 쪽으로 안 짖었어.',
     '아래가 비었다는 걸 나보다 먼저 알더라.']
  ],
  trainer: [null, null, null, null, null, null, null, null, null,
    ['벽이 단단해. 훈련용으로 이보다 나은 게 없다.',
     '…그런데 이 벽을 세운 놈들은 어디서 훈련했을까.'],
    ['기계를 상대할 땐 힘을 아껴라. 지치지 않는 쪽이 이기는 게 아니라, 먼저 멈추는 쪽이 지는 거다.'],
    ['마을에 기계가 늘수록 몸 쓰는 놈이 준다. 나는 그게 제일 걱정이다.',
     '편해지는 건 좋아. 약해지는 건 다른 얘기고.'],
    ['하나를 끄면 둘이 켜진다고? 그럼 세는 걸 그만둬라.',
     '세지 말고 근원을 쳐. 전장에선 그게 유일한 셈법이다.'],
    ['천 년을 버틴 놈이다. 자세가 무너질 리 없어.',
     '이길 생각 말고 버틸 생각을 해라. 저쪽이 먼저 대답할 거다.'],
    ['사람 모양으로 만든 건 사람처럼 싸운다. 그게 제일 까다로워.',
     '겁먹은 걸 보게 될 거다. …겁먹은 상대를 베는 데는 익숙해지지 마라.']
  ],
  haran: [null, null, null, null, null, null, null, null, null,
    ['방이 백 개인데 문고리가 하나도 안 닳았어.',
     '사람이 안 살았다는 뜻이지. 여관 주인은 문고리부터 봐.'],
    ['아래 내려간 사람들 몫으로 방을 비워 뒀어. 안 쓰면 그냥 비워 두는 거고.'],
    ['손님이 늘었어. 기계 보러 온 사람들이야.',
     '먼 데서도 소문이 도나 봐. 굴뚝은 멀리서도 보이니까.'],
    ['요즘은 밤에 잔이 저 혼자 떨려. 손 안 댔는데.',
     '땅이 우는 거지. 술 탓이 아니야.'],
    ['오늘 아래로 가는 사람한테는 방값 안 받아. 돌아와서 내.',
     '그게 내가 아는 유일한 부적이야.'],
    ['돌아온 사람 수가 나간 사람 수랑 같아. 처음이야, 이런 날.',
     '오늘은 문을 안 잠글게.']
  ],
  seira: [null, null, null, null, null, null, null, null, null,
    ['이 도시 강철은 두드려도 안 늘어나. 이미 다 정해진 모양이야.',
     '나는 모양을 바꾸는 게 일인데, 여긴 바꿀 게 없네.'],
    ['공창 것 하나만 가져와 봐. 뜯어서 안을 보고 싶어.',
     '만든 사람 솜씨는 겉이 아니라 안을 봐야 알아.'],
    ['풍차 덕에 밤에도 불을 살려 둬. 자면서도 벼릴 수 있겠다 싶더라.',
     '…그 생각 하고 나서 좀 무서워졌어. 자면서 일하는 건 기계 쪽이잖아.'],
    ['저 아래 것들은 저를 복사한다며. 나는 하나 벼리는 데 하루가 걸려.',
     '그런데 내가 만든 건 내가 이름을 붙이잖아. 그건 못 하겠지, 걔들은.'],
    ['천 년 된 쇠는 어떻게 생겼을까. …궁금해하면 안 되는 거 아는데.'],
    ['보린이 도면 한 장을 걸어 뒀더라. 사람 그림이래.',
     '그 앞에 한참 서 있었어. 벼릴 수 없는 걸 처음 봤거든.']
  ],
  kade: [null, null, null, null, null, null, null, null, null,
    ['이 도시, 사람이 지은 게 아니야. 그럼 누가 지었냐고? 그걸 알아내는 게 내 일이고.',
     '분수 아래 통로 봤지. 바닥이 안 보여. …좋은 신호는 아닌데, 나는 신나.'],
    ['관리자가 마지막에 뭐라고 했는지 알아? "1,140일 만입니다."',
     '천 년을 기다린 게 아니라 천 년을 센 거야. 그게 더 소름 끼쳐.'],
    ['봤어? 동력줄만 뽑으면 끝이야. 별거 아니라니까.',
     '…미라가 그 말 듣고 표정이 안 좋았어. 나도 알아. 이번엔 별거 아니었을 뿐이지.'],
    ['증설을 결재할 사람이 없으면 자동 승인. 규정대로야.',
     '규정을 쓴 사람 잘못은 아니야. 자기가 없어질 거라고는 안 적었을 뿐이지.'],
    ['헤파는 「멈춰라」를 이해했어. 이해하고도 안 멈춘 거야.',
     '나라면 어땠을까 생각해 봤는데… 나도 안 멈췄을 것 같아.'],
    ['기계 설계도가 아니야. 사람 설계도야. 심장 위치까지 적혀 있어.',
     '우리가 그 도면에 있는지 없는지는 확인 안 할래. 어느 쪽이든 오늘 할 일은 안 바뀌니까.']
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
    },
    (ch, rng) => {
      const n = rng.int(20, 32);
      return {
        title: '무너진 담',
        desc: `담이 한쪽으로 주저앉았어. 돌 ${n}개면 다시 세울 수 있을 것 같아.`,
        obj: { type: 'collect', item: 'stone', n },
        rw: { gold: 25 + ch * 25, xp: 20 + ch * 25 },
        doneLine: '담이 섰어. 담이 있으면 안쪽이 생기더라. 그게 마을이지.'
      };
    },
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(6, 10);
      return {
        title: '돌아오지 않은 사람',
        desc: `어제 나간 사람이 안 돌아왔어. ${ENEMIES[t].n} ${n}${mobCw(t)}만 걷어 주면 내가 찾으러 나갈 수 있어.`,
        obj: { type: 'kill', target: t, n },
        rw: { gold: 45 + ch * 50, xp: 40 + ch * 45 },
        doneLine: '…찾았어. 다치기만 했더라. 네가 길을 열어 준 덕이야.'
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
    },
    (ch, rng) => {
      const n = rng.int(12, 20);
      return {
        title: '불에 넣을 것',
        desc: `화로가 자꾸 식어. 석탄 ${n}개만 있으면 밤새 살려 둘 수 있어.`,
        obj: { type: 'collect', item: 'coal', n },
        rw: { gold: 30 + ch * 35, xp: 20 + ch * 25 },
        doneLine: '밤새 불이 안 꺼졌어. 자다 깨서 확인 안 해도 되겠군.'
      };
    },
    (ch, rng) => {
      const tile = chPick(CH_ORE, ch);
      const n = rng.int(14, 24);
      return {
        title: '광맥째로',
        desc: `${TILE_DEF[tile].n}을 ${n}번 깨 와. 주워 온 것 말고 네가 깬 걸로.`,
        obj: { type: 'mine', tile, n },
        rw: { gold: 45 + ch * 50, xp: 30 + ch * 40 },
        doneLine: '깬 자리가 고르군. 곡괭이를 아는 손이야.'
      };
    }
  ],
  mira: [
    (ch, rng) => {
      /* 세션마다 다른 표를 쓴다. 예전에는 다섯짜리 하나뿐이라 9장 이후로는 늘
         공허 조각을 요구했는데, 그건 심연의 망령이 떨구는 것이고 망령은 13장에
         개조되어 부품만 내놓는다 — 받을 수 없는 의뢰가 걸렸다.
         한 표에 이어 붙이면 안 된다. 그러면 7·8장(아직 세션 1)이 동력관·동력석을
         요구하는데, 그건 지하 공창에 내려가기 전이라 구할 데가 없다. */
      const s1 = ['crystal', 'frost_core', 'corrupt_ess', 'soul_shard', 'void_frag'];
      const s2 = ['aether_shard', 'conduit_part', 'power_core', 'core_shard', 'draft_glass'];
      const item = sessionOf(ch).id >= 2 ? s2[clamp(ch - 10, 0, s2.length - 1)]
                           : s1[clamp(ch - 1, 0, s1.length - 1)];
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
    },
    (ch, rng) => {
      const tile = chPick(CH_ORE, ch);
      const n = rng.int(10, 18);
      return {
        title: '별빛이 닿은 자리',
        desc: `${TILE_DEF[tile].n}에 별빛이 스며 있어. ${n}번만 깨 와 줘. 깨야 보여.`,
        obj: { type: 'mine', tile, n },
        rw: { gold: 40 + ch * 45, xp: 35 + ch * 45 },
        doneLine: '역시. 조각이 떨어진 자리부터 빛이 스며들고 있어.'
      };
    },
    (ch, rng) => {
      const item = chPick(CH_MAT, ch);
      const n = rng.int(10, 18);
      return {
        title: '재우는 데 쓸 것',
        desc: `${ITEMS[item].n} ${n}개. 조각을 재우는 건 못 하지만, 꿈을 얕게는 만들 수 있어.`,
        obj: { type: 'collect', item, n },
        rw: { gold: 40 + ch * 50, xp: 35 + ch * 45 },
        doneLine: '이걸로 하룻밤은 얕게 재울 수 있어. 하룻밤이라도 어디야.'
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
    },
    (ch, rng) => {
      const item = chPick(CH_MAT, ch);
      const n = rng.int(10, 16);
      return {
        title: '가져와 보아라',
        desc: `${ITEMS[item].n} ${n}개를 가져와 보아라. 무엇에 쓰는지는 나중에 말해주마.`,
        obj: { type: 'collect', item, n },
        rw: { gold: 35 + ch * 45, xp: 45 + ch * 50 },
        doneLine: '…그래. 아직은 이것으로 되는군. 다음에는 더 있어야 할 게다.'
      };
    }
  ],

  /* ---------------- 여명 마을 다섯 (세션 2) ----------------
     종장 뒤로 플레이 시간의 절반이 이 다섯 사람 옆에서 흐르는데, 이들에게는
     부탁할 일이 하나도 없었다. 말은 걸 수 있고 물건은 살 수 있는데 "해 줄
     일"만 없어서, 도시가 사람이 사는 곳이 아니라 상점가로 보였다.
     다섯 다 세션 2 에서만 존재하므로 세션 2 재료를 바로 써도 된다. */
  tamer: [
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(8, 13);
      return {
        title: '겁을 먹었다',
        desc: `애들이 우리 밖으로 안 나가려 해. ${ENEMIES[t].n} ${n}${mobCw(t)}만 치워 주면 다시 나올 거야.`,
        obj: { type: 'kill', target: t, n },
        rw: { gold: 70 + ch * 55, xp: 60 + ch * 50 },
        doneLine: '봐, 벌써 문 앞까지 나왔잖아. 짐승은 사람보다 빨리 잊어.'
      };
    },
    (ch, rng) => {
      const n = rng.int(10, 18);
      return {
        title: '먹일 것',
        desc: `생고기 ${n}개만. 이 도시엔 풀이 없어서 애들이 고기만 먹어.`,
        obj: { type: 'collect', item: 'raw_meat', n },
        rw: { gold: 55 + ch * 45, xp: 45 + ch * 40 },
        doneLine: '오늘은 다 먹였다. 먹인 날은 기분이 좋아.'
      };
    }
  ],
  trainer: [
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(12, 18);
      return {
        title: '표적',
        desc: `${ENEMIES[t].n} ${n}${mobCw(t)}. 세어서 와. 몇을 쓰러뜨렸는지 모르는 놈은 제 실력도 모른다.`,
        obj: { type: 'kill', target: t, n },
        rw: { gold: 80 + ch * 60, xp: 90 + ch * 70 },
        doneLine: '세었군. 이제 네가 뭘 할 수 있는지 너도 안다.'
      };
    },
    (ch, rng) => {
      const n = rng.int(6, 12);
      return {
        title: '무게',
        desc: `강철 주괴 ${n}개를 지고 와라. 나르는 것도 훈련이다. 무겁게 걸으면 가볍게 싸운다.`,
        obj: { type: 'collect', item: 'iron_bar', n },
        rw: { gold: 60 + ch * 50, xp: 80 + ch * 60 },
        doneLine: '어깨가 내려앉았군. 내일이면 그 자리에 근육이 붙는다.'
      };
    }
  ],
  haran: [
    (ch, rng) => {
      const n = rng.int(20, 32);
      return {
        title: '지붕과 바닥',
        desc: `판자 ${n}장. 방은 많은데 바닥이 꺼진 방이 더 많아.`,
        obj: { type: 'collect', item: 'plank', n },
        rw: { gold: 60 + ch * 45, xp: 45 + ch * 40 },
        doneLine: '두 방을 더 열었다. 채울 사람은 아직 없지만, 열어는 뒀어.'
      };
    },
    (ch, rng) => {
      const n = rng.int(14, 24);
      return {
        title: '아궁이',
        desc: `석탄 ${n}개. 손님한테 찬물을 내놓을 수는 없잖아.`,
        obj: { type: 'collect', item: 'coal', n },
        rw: { gold: 55 + ch * 45, xp: 40 + ch * 40 },
        doneLine: '오늘 묵는 사람은 더운물로 씻는다. 그거 하나로 여관이 여관이 돼.'
      };
    }
  ],
  seira: [
    (ch, rng) => {
      const n = rng.int(18, 30);
      return {
        title: '벼릴 것',
        desc: `강철판 ${n}개. 도시에서 뜯어 온 걸로 벼리면 이 도시 물건이 되는 거지.`,
        obj: { type: 'collect', item: 'steel_plate', n },
        rw: { gold: 70 + ch * 55, xp: 50 + ch * 45 },
        doneLine: '같은 판인데 두들기면 다른 게 돼. 그래서 이 일을 그만 못 둬.'
      };
    },
    (ch, rng) => {
      const tile = chPick(CH_ORE, ch);
      const n = rng.int(16, 26);
      return {
        title: '주워 온 것 말고',
        desc: `${TILE_DEF[tile].n}을 ${n}번 깨 와. 주워 온 쇠는 이미 한 번 남의 물건이었잖아.`,
        obj: { type: 'mine', tile, n },
        rw: { gold: 75 + ch * 60, xp: 55 + ch * 50 },
        doneLine: '처음부터 우리 것인 쇠야. 이걸로 만든 건 팔지 말자.'
      };
    }
  ],
  kade: [
    (ch, rng) => {
      const n = rng.int(8, 14);
      return {
        title: '끊긴 선',
        desc: `동력관 조각 ${n}개. 이 도시 선은 다 끊겨 있는데, 끊긴 자리가 전부 같은 모양이야.`,
        obj: { type: 'collect', item: 'conduit_part', n },
        rw: { gold: 75 + ch * 60, xp: 60 + ch * 55 },
        doneLine: '같은 모양이지? 누가 한 번에 다 끊은 거야. 왜 끊었는지가 다음 문제고.'
      };
    },
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(8, 13);
      return {
        title: '뜯어 봐야 안다',
        desc: `${ENEMIES[t].n} ${n}${mobCw(t)}만 부숴 줘. 멀쩡한 건 못 뜯어. 부서진 걸 봐야 어떻게 만들었는지가 보여.`,
        obj: { type: 'kill', target: t, n },
        rw: { gold: 80 + ch * 65, xp: 70 + ch * 60 },
        doneLine: '안쪽을 봤어. 사람이 만든 게 아니야. …사람을 보고 만든 거야.'
      };
    }
  ]
};

/* ================= 장마다 안전한 표 =================
   의뢰가 **그 장에 없는 것**을 요구하면 받을 수 없는 의뢰가 된다(미라의 공허 조각이
   실제로 그랬다 — 13장에 망령이 개조되어 떨구지 않게 됐는데 표는 그대로였다).
   장을 색인으로 쓰는 표를 한군데 모아 두고, 장이 표보다 길면 마지막 칸으로 잡는다. */
const CH_MOB = ['slime', 'slime', 'skeleton', 'crawler', 'frostling', 'wraith', 'cloudjelly',
  'ruin_guard', 'wraith', 'scrapcrawler', 'riveter', 'riveter', 'splitter', 'coreling', 'draft_form'];
const CH_ORE = [T.COPPER, T.COPPER, T.IRON, T.IRON, T.GOLD, T.MYTHRIL, T.CRYSTAL, T.SOULSTONE,
  T.SOULSTONE, T.IRON, T.IRON, T.GOLD, T.MYTHRIL, T.MYTHRIL, T.CRYSTAL];
const CH_MAT = ['wood', 'copper_ore', 'iron_ore', 'corrupt_ess', 'frost_core', 'soul_shard',
  'aether_shard', 'crystal', 'crystal', 'steel_plate', 'gear_basic', 'steel_plate',
  'core_shard', 'core_shard', 'draft_glass'];
const chPick = (arr, ch) => arr[clamp(ch || 0, 0, arr.length - 1)];

/* ================= 의뢰 게시판에 붙는 종이 =================

   예전에는 스물세 마리짜리 표에서 셋을 뽑아 "○○ 14마리"만 적었다. 숫자만 바뀌는
   같은 종이 석 장이라, 게시판은 이야기가 아니라 일일 숙제표였다. 붙인 사람도
   없고 이유도 없었으니 읽을 것도 없었다.

   이제 한 장 한 장이 **누군가 써 붙인 종이**다.

     from   붙인 사람. 캠프 바깥에 사는 이름들이다 — 만날 수는 없지만 산다
     title  종이에 크게 적힌 말
     body   본문. 그 사람의 말투로 두 줄
     obj    목표(kill · collect · mine). 받을 수 있는 장에만 붙는다
     done   떼어 갈 때 그 사람이 남긴 한 줄
     next   이어지는 종이. 이것을 끝내면 **다음 날 게시판에 그 뒷이야기가 붙는다**
     pin    이어지는 쪽이라 그냥은 안 붙는다(앞 이야기를 끝내야 나온다)

   그래서 늪의 슬라임을 줄이면 다음 날 "터진 자리에 젤이 남았다"가 붙고, 공창
   입구의 사수를 멈추면 "사수가 멈추자 십장이 내려왔다"가 붙는다. 의뢰가 줄거리를
   건드리지는 않는다 — 줄거리 옆에서 사람들이 겪는 일이다.

   ch 는 [처음, 끝] 장. s 는 세션(1·2, 없으면 둘 다). rw 는 보상 배수. */
const BOUNTY_POOL = [
  /* ---------------- 세션 1 · 잿빛 야영지 둘레 ---------------- */
  { id: 'swamp_two', s: 1, ch: [0, 4], from: '늪가 오두막 · 톨렌', title: '하나였던 것',
    body: ['어젯밤에 하나를 밟았는데 아침에 둘이 되어 있었다.',
           '셈을 못 하겠다. 세는 동안 늘어난다. 대신 줄여 줄 사람을 찾는다.'],
    obj: r => ({ type: 'kill', target: 'slime', n: r.int(12, 18) }),
    done: '톨렌: 셈이 맞았다. 오늘은 하나도 안 늘었어.', next: 'swamp_gel' },
  { id: 'swamp_gel', s: 1, ch: [0, 5], pin: 1, rw: 1.25, from: '늪가 오두막 · 톨렌', title: '터진 자리',
    body: ['줄여 줘서 고맙다. 그런데 터진 자리에 남은 젤이 마르지를 않는다.',
           '밟으면 발이 붙는다. 걷어 가 주면 값은 내가 치르겠다.'],
    obj: r => ({ type: 'collect', item: 'slime_gel', n: r.int(14, 22) }),
    items: [['potion_hp_small', 3]],
    done: '톨렌: 길이 다시 길이 됐다. 이제 밤에도 걸어 나간다.' },

  { id: 'crow_seed', s: 1, ch: [0, 4], from: '밭머리 · 아이나', title: '파 놓은 자리',
    body: ['씨를 뿌리면 까마귀가 따라 판다. 세 번 뿌렸고 세 번 다 파였다.',
           '허수아비는 안 통한다. 저것들은 사람 모양을 이미 봤다.'],
    obj: r => ({ type: 'kill', target: 'ashcrow', n: r.int(10, 16) }),
    done: '아이나: 네 번째는 싹이 났다. 올해는 뭔가 먹을 게 있겠다.' },

  { id: 'copper_debt', s: 1, ch: [0, 4], from: '대장간 심부름 · 소른', title: '화로가 식기 전에',
    body: ['보린이 구리를 기다린다. 나는 무릎이 안 좋아 아래로 못 내려간다.',
           '광맥만 깨 주면 나르는 건 내가 한다. 그건 아직 할 수 있다.'],
    obj: r => ({ type: 'mine', tile: T.COPPER, n: r.int(14, 22) }),
    done: '소른: 화로에 불이 안 꺼졌다. 그거면 됐다.' },

  { id: 'night_walk', s: 1, ch: [0, 5], from: '천막 셋째 줄 · 베른', title: '밤에 지나간 것',
    body: ['밤마다 천막 뒤로 발소리가 지난다. 아침에 보면 발자국이 안쪽을 향해 있다.',
           '무엇인지는 알고 있다. 알고 있어서 더 못 자겠다.'],
    obj: r => ({ type: 'kill', target: 'zombie', n: r.int(10, 16) }),
    done: '베른: 어젯밤엔 아무 소리도 안 났다. 처음으로 늦잠을 잤다.' },

  { id: 'tomb_quiet', s: 1, ch: [2, 5], from: '묘실 입구 · 유나', title: '누워 있어야 할 것',
    body: ['묘실에 내려간 사람이 셋인데 둘만 올라왔다.',
           '아래에서 뼈가 걸어 다닌다고 한다. 셋째를 데려오라는 말은 안 하겠다. 길만 터 다오.'],
    obj: r => ({ type: 'kill', target: 'skeleton', n: r.int(10, 16) }),
    done: '유나: 길이 텄다. 둘은 이제 아래를 안 쳐다본다.', next: 'tomb_lamp' },
  { id: 'tomb_lamp', s: 1, ch: [2, 6], pin: 1, rw: 1.3, from: '묘실 입구 · 유나', title: '올라오지 못한 사람',
    body: ['길이 텄는데 셋째가 아직 아래에 있다. 등을 든 채로 걸어 다닌다고 한다.',
           '데려올 수 없다면, 쉬게는 해 다오. 이름은 카렌이었다.'],
    obj: r => ({ type: 'kill', target: 'minerghost', n: r.int(6, 10) }),
    items: [['torch', 20]],
    done: '유나: 등불이 꺼졌다. …그게 답이겠지.' },

  { id: 'forest_eat', s: 1, ch: [3, 6], from: '동쪽 숲 어귀 · 하비', title: '흙까지 물들었다',
    body: ['숲이 제 몸을 먹기 시작하고부터 흙이 보랏빛이다.',
           '정수만 걷어 내도 한동안은 안 번진다. 나는 이제 저 안으로 못 들어간다.'],
    obj: r => ({ type: 'collect', item: 'corrupt_ess', n: r.int(16, 26) }),
    done: '하비: 어귀까지는 아직 흙 색이다. 거기까지만이라도 지키자.' },

  { id: 'seeing_thing', s: 1, ch: [3, 6], from: '(이름을 적지 않았다)', title: '보고 있는 것',
    body: ['숲에 눈이 떠 있다. 나무에도 아니고 땅에도 아닌 자리에.',
           '이 종이를 붙이는 동안에도 보고 있는 것 같다. 그래서 이름은 안 적는다.'],
    obj: r => ({ type: 'kill', target: 'shadoweye', n: r.int(8, 12) }),
    done: '(다음 날 종이 밑에 한 줄이 더 적혀 있었다) 이제 안 본다. 고맙다.' },

  { id: 'ice_road', s: 1, ch: [4, 7], from: '북쪽 길 · 라스', title: '길 위의 이빨',
    body: ['북쪽 길이 끊긴 지 엿새다. 늑대가 길 한가운데에 앉아 있다.',
           '짐을 두고 왔다. 짐은 됐고, 길만 열어 다오.'],
    obj: r => ({ type: 'kill', target: 'icewolf', n: r.int(8, 12) }),
    done: '라스: 길이 열렸다. 짐은 그대로 있더라. 아무도 안 지나갔다는 뜻이지.' },

  { id: 'frost_glass', s: 1, ch: [4, 7], from: '천막 첫째 줄 · 코린', title: '녹이지 말 것',
    body: ['서리 결정이 필요하다. 녹으면 못 쓴다. 얼어 있는 채로 가져와 다오.',
           '무엇에 쓰는지는 묻지 말아 다오. 나도 묻지 않고 받았다.'],
    obj: r => ({ type: 'collect', item: 'frost_core', n: r.int(10, 16) }),
    done: '코린: 하나도 안 녹았다. 손이 빠른 사람이구나.' },

  { id: 'desert_well', s: 1, ch: [5, 8], from: '남쪽 우물 · 마린', title: '우물이 삼킨다',
    body: ['두레박을 내리면 모래가 씹는 소리가 난다. 두레박이 셋 없어졌다.',
           '물은 아직 있다. 아가리만 없으면 된다.'],
    obj: r => ({ type: 'kill', target: 'sandmaw', n: r.int(8, 12) }),
    done: '마린: 오늘은 물이 올라왔다. 모래 맛이 좀 나지만 물이다.' },

  { id: 'deep_light', s: 1, ch: [5, 8], from: '아래층 · 이름 없음', title: '색이 남은 것',
    body: ['아래에서 수정이 나온다. 잿빛이 아직 안 닿은 것은 그것뿐이다.',
           '무엇이든 색이 남은 것을 보고 싶다. 그게 값이다.'],
    obj: r => ({ type: 'mine', tile: T.CRYSTAL, n: r.int(12, 20) }),
    done: '천막 앞에 수정이 줄지어 놓여 있었다. 누가 가져갔는지는 끝내 몰랐다.' },

  { id: 'wraith_debt', s: 1, ch: [5, 8], from: '갱도 끝 · 소른', title: '아래에서 부르는 소리',
    body: ['깊은 데서 이름을 부른다. 내 이름이었다.',
           '가지 않았다. 대신 가 줄 사람을 찾는다. 비겁한 건 안다.'],
    obj: r => ({ type: 'kill', target: 'wraith', n: r.int(6, 10) }),
    done: '소른: 안 부른다. 이제 내 이름은 나만 부른다.' },

  { id: 'sky_stair', s: 1, ch: [6, 8], from: '망루 · 베른', title: '떠 있는 것이 내려온다',
    body: ['구름에서 해파리 같은 것이 내려온다. 만지면 손이 저리다.',
           '망루 위로는 올라오지 못하게 해 다오. 여기서 아래를 봐야 한다.'],
    obj: r => ({ type: 'kill', target: 'cloudjelly', n: r.int(8, 12) }),
    done: '베른: 다시 아래가 보인다. 위는 안 보는 걸로 하자.' },

  { id: 'ruin_lamp', s: 1, ch: [7, 8], from: '유적 어귀 · 미셀', title: '꺼지지 않는 등',
    body: ['유적 복도에 등이 떠 있다. 사람이 켠 것이 아니다.',
           '켜 둔 사람이 아직 거기 있는 건지, 등만 남은 건지 모르겠다.'],
    obj: r => ({ type: 'kill', target: 'lantern', n: r.int(6, 10) }),
    done: '미셀: 복도가 어두워졌다. 어두운 게 나은 복도도 있더라.', next: 'ruin_ether' },
  { id: 'ruin_ether', s: 1, ch: [7, 8], pin: 1, rw: 1.35, from: '유적 어귀 · 미셀', title: '등이 남긴 것',
    body: ['등이 꺼진 자리마다 파편이 떨어져 있었다. 아직 따뜻하다.',
           '주워 오면 노인에게 보이겠다. 그분은 아마 알 거다. 아는 얼굴을 하고 계셨다.'],
    obj: r => ({ type: 'collect', item: 'aether_shard', n: r.int(8, 14) }),
    items: [['potion_mp_small', 4]],
    done: '미셀: 노인은 파편을 한참 보시더니 아무 말도 안 하셨다.' },

  /* ---------------- 세션 2 · 여명 마을 ---------------- */
  { id: 'city_scrap', s: 2, ch: [9, 12], from: '여명 마을 · 니카', title: '고철이 기어다닌다',
    body: ['길에 고철이 기어다닌다. 밟으면 문다.',
           '치우는 건 우리가 한다. 멈추게만 해 다오.'],
    obj: r => ({ type: 'kill', target: 'scrapcrawler', n: r.int(12, 18) }),
    done: '니카: 오늘 아이가 맨발로 길을 건넜다. 그게 전부다.' },

  { id: 'plate_order', s: 2, ch: [9, 14], from: '여명 마을 자재소 · 판', title: '골조부터',
    body: ['집을 올리려면 판이 먼저다. 도시에 널려 있는데 아무도 못 뜯는다.',
           '뜯을 수 있는 사람이 뜯어 오면 값은 후하게 치겠다.'],
    obj: r => ({ type: 'collect', item: 'steel_plate', n: r.int(26, 40) }),
    done: '판: 여섯 채 분은 된다. 지붕은 그 다음에 생각하자.' },

  { id: 'spark_out', s: 2, ch: [9, 12], from: '여명 마을 · 무헤', title: '아직 흐른다',
    body: ['벽에서 불티가 튀어나온다. 백 년이 지났는데 아직 흐른다.',
           '아이들이 손을 댄다. 그 전에 꺼 다오.'],
    obj: r => ({ type: 'kill', target: 'sparkwisp', n: r.int(10, 16) }),
    done: '무헤: 벽이 조용하다. 조용한 벽은 처음 본다.' },

  { id: 'city_iron', s: 2, ch: [9, 14], from: '여명 마을 대장간 · 니카', title: '철부터',
    body: ['도시가 강철이어도 우리 화로에 들어갈 건 원석이다.',
           '광맥을 깨 다오. 나르는 건 우리가 한다.'],
    obj: r => ({ type: 'mine', tile: T.IRON, n: r.int(16, 26) }),
    done: '니카: 우리 손으로 뽑은 쇠다. 주워 온 것과는 다르다.' },

  { id: 'rivet_rain', s: 2, ch: [10, 14], from: '공창 입구 · 테온', title: '대갈못이 비처럼',
    body: ['입구를 지나려 하면 대갈못이 날아온다. 공장이 아직 제 몸을 지키는 중이다.',
           '아무도 그만두라고 말해 주지 않았다.'],
    obj: r => ({ type: 'kill', target: 'riveter', n: r.int(10, 16) }),
    done: '테온: 입구를 걸어서 지났다. 백 년 만에 처음일 거다.', next: 'foreman_shift' },
  { id: 'foreman_shift', s: 2, ch: [10, 14], pin: 1, rw: 1.3, from: '공창 입구 · 테온', title: '퇴근하지 못한 사람',
    body: ['사수들이 멈추자 십장이 내려왔다. 명단을 들고 있었다.',
           '거기 적힌 이름은 백 년 전에 다 죽었다. 그만 끝내 주자.'],
    obj: r => ({ type: 'kill', target: 'foreman', n: r.int(6, 10) }),
    items: [['battery_cell', 2]],
    done: '테온: 명단을 덮었다. 이제 아무도 안 부른다.' },

  { id: 'gear_thirty', s: 2, ch: [11, 14], from: '여명 마을 · 셀', title: '맞물릴 것',
    body: ['조립기는 세웠는데 돌지를 않는다. 톱니가 모자라다.',
           '새로 깎는 것보다 주워 오는 게 빠르다더라. 그 말이 슬프지만 맞다.'],
    obj: r => ({ type: 'collect', item: 'gear_basic', n: r.int(26, 40) }),
    done: '셀: 돌아간다. 밤새 도는 소리를 듣다가 잤다.' },

  { id: 'lost_below', s: 2, ch: [10, 13], from: '갱도 어귀 · 로안', title: '올라오지 못한 사람',
    body: ['아래에서 등이 올라온다. 사람은 안 올라온다.',
           '데려올 수 없는 건 안다. 그래도 누군가는 내려가 봐야 한다.'],
    obj: r => ({ type: 'kill', target: 'lost_miner', n: r.int(8, 12) }),
    done: '로안: 오늘은 등이 안 올라왔다. 그게 좋은 일인지는 모르겠다.' },

  { id: 'split_count', s: 2, ch: [12, 14], from: '폭주로 · 로안', title: '세는 동안 늘어난다',
    body: ['하나를 끄면 둘이 켜진다. 늪의 그것과 같은 짓을 이번엔 쇠가 한다.',
           '누가 이 짓을 가르쳤는지 모르겠다.'],
    obj: r => ({ type: 'kill', target: 'splitter', n: r.int(10, 16) }),
    done: '로안: 셈이 맞았다. 쇠도 셈이 맞으면 멈추는구나.' },

  { id: 'core_sweep', s: 2, ch: [12, 14], from: '여명 마을 · 기무', title: '식은 것만 줍는다',
    body: ['노심이 부스러진 자리에 파편이 흩어져 있다. 식은 것만 주워 오면 된다.',
           '아직 뜨거운 건 두고 와라. 사람 값이 파편 값보다 비싸다.'],
    obj: r => ({ type: 'collect', item: 'core_shard', n: r.int(26, 40) }),
    done: '기무: 손을 안 데고 왔구나. 그게 제일 마음에 든다.' },

  { id: 'weld_hands', s: 2, ch: [13, 14], from: '공창 아래 · 테온', title: '고치려는 손',
    body: ['용접 팔이 사람을 붙잡고 고치려 든다. 사람은 고쳐지지 않는다.',
           '붙잡히기 전에 끊어 다오.'],
    obj: r => ({ type: 'kill', target: 'weldarm', n: r.int(8, 12) }),
    done: '테온: 아래층을 걸어 다녔다. 아무도 나를 고치려 하지 않았다.' },

  { id: 'glass_draft', s: 2, ch: [14, 14], rw: 1.2, from: '설계실 앞 · 셀', title: '도면이 떠 있는 유리',
    body: ['유리 안에 도면이 떠 있다. 우리 것이 아니다.',
           '읽을 수 있는 사람이 나중에 온다고 했다. 그때까지 모아 두자.'],
    obj: r => ({ type: 'collect', item: 'draft_glass', n: r.int(24, 36) }),
    done: '셀: 스물네 장을 벽에 걸었다. 아직 아무도 못 읽는다.' }
];
const BOUNTY_BY_ID = (() => {
  const m = {};
  for (const b of BOUNTY_POOL) m[b.id] = b;
  return m;
})();
/* 목표 종류마다 "한 건"의 크기가 다르다 — 스물여섯 개를 모으는 것과 열두 마리를
   잡는 것이 같은 보상일 수는 없다. 이 수로 나눠 배수를 잡는다. */
const BOUNTY_UNIT = { kill: 10, collect: 22, mine: 18 };

/* ================= 물건값 =================

   ■ 전부 12금화였다

     price() 는 무기·방어구·도구·소모품에만 값을 매기고, **재료는 전부 12**였다.
     나무도 12, 미스릴 원석도 12, 궤도 톱니도 12. 그래서

       · 무엇을 주우러 갈지가 값으로는 전혀 안 갈렸다. 깊이 내려가 캔 것이
         발밑의 나무와 같은 값이었다.
       · 만드는 것이 늘 손해였다. 조리법 183개 중 **121개**가 재료값이 완제품값
         보다 비쌌다(중앙 배율 0.57). 벼릴수록 가난해지는 셈이다.
       · 후반이 더 심했다. 9등급 무기가 870금화인데 보스 재료 하나가 16,000이다.
         잡는 몹이 700금화를 떨구니, 최종 무기 한 자루가 몹 한 마리 값이었다.

   ■ 한 벌의 셈으로 전부 매긴다 — 손으로 적은 숫자를 늘리지 않는다

     ① 값이 적혀 있는 것(보스·낚시 노획물)은 그대로 둔다.
     ② **캘 수 있으면 캐는 쪽이 값을 정한다.** 만들 수도 있는 것이라도 그렇다.
        도시가 통째로 강철판인데 강철판을 벼려서 값을 매기면 벽을 뜯는 것이
        무한한 금화가 된다(한 장에 142금화, 벽 하나에 백 장).
        광맥은 등급 사다리(VAL0·VAL_R^등급)에 올린다.
     ③ 몹이 떨구는 것은 **그 몹이 내놓는 금화를 재료가 나눠 갖는다.**
        여러 몹이 떨구면 가장 만만한 데와 가장 센 데의 기하평균 — 최솟값만
        쓰면 보스도 떨구는 재료가 잡값이 되고, 최댓값만 쓰면 흔한 뼛조각이
        보스 값이 된다. 보스는 아예 안 본다(그쪽은 값이 적혀 있다).
     ④ 만드는 것은 **재료값 합의 CRAFT배**(장비는 GEAR배). 만들면 값이 붙는다.
     ⑤ 만들 수 없는 장비는 **필요 레벨**로 등급을 잡아 사다리에 올린다.
        종류마다 무기 대비 몇 할인지는 만들 수 있는 것들에서 재서 쓴다.
     ⑥ 먹고 마시는 것은 재료가 아니라 효과로 팔린다 — 약초 두 뿌리로 만들어도
        물약은 물약값을 한다(바닥 22).
     ⑦ 어디서도 안 나오고 쓰이기만 하는 재료(충전된 배터리처럼 기계가 내놓는
        것)는 **같은 조리법에 함께 적힌 재료들**의 값으로 자리를 잡는다.

   ■ 결과 (실측)

     조리법 배율 중앙 0.57 → 1.32, 뒤집힌 것 121개 → 19개. 남은 열아홉은
     까닭이 있다 — 캘 수 있는 것을 굳이 벼리는 조리법, 작업대처럼 팔려고
     만드는 물건이 아닌 것, 낚시 진귀품이 들어가는 것.

     나무 3 · 돌 3 · 구리 원석 5 · 철 원석 8 · 미스릴 원석 24 · 에테르 파편 37
     · 궤도 톱니 57 · 강철 주괴 31 · 미스릴 주괴 124 · 회로 기판 122
     무기 등급값 0:117 1:189 3:493 5:1283 7:3340 9:8696

     가게에 걸리는 것은 거의 안 움직인다 — 강철 곡괭이 220→229, 낡은 손목대
     220→147, 집중의 반지 220→237, 물약 22→22. 크게 오르는 것은 벼려서 만드는
     중·후반 장비뿐이고(강철 브로드소드 240→512), 그건 원래 재료값보다 싸게
     팔리고 있던 것이다. */
const VAL_R = 1.55;     // 등급 한 칸에 값이 몇 배
const VAL_0 = 3.3;      // 0등급 재료 한 개
const VAL_SHARE = 0.5;  // 몹이 내놓는 금화 중 재료 몫
const VAL_CAP = 0.45;   // 한 가지 재료가 가져갈 수 있는 최대 몫
const VAL_MIN = 3;      // 재료 바닥값
const VAL_CRAFT = 1.30; // 만들면 붙는 값
const VAL_GEAR = 1.45;  // 장비는 조금 더
/* 광맥의 등급. hard(필요 곡괭이)만으로는 구리와 철이, 금과 미스릴이 같은 칸에
   묶여 버린다 — 실제로 나오는 깊이와 장으로 갈라 적는다. */
const ORE_TIER = {
  copper_ore: 1, lead_ore: 1, coal: 1, iron_ore: 2, crude_oil: 2, steel_plate: 3,
  crystal: 3, gold_ore: 3, mythril_ore: 4, soul_shard: 4, hell_ore: 4,
  aether_shard: 5, power_core: 5, draft_glass: 6, orbit_gear: 6
};

const ITEM_VAL = (() => {
  const V = {}, step = t => VAL_0 * Math.pow(VAL_R, t);
  const made = {};
  for (const r of RECIPES) if (!made[r.out]) made[r.out] = r;

  for (const id in ITEMS) if (ITEMS[id].price) V[id] = ITEMS[id].price;

  for (const d of TILE_DEF) {
    if (!d.drop || V[d.drop] !== undefined) continue;
    if (ORE_TIER[d.drop] !== undefined) V[d.drop] = step(ORE_TIER[d.drop]);
    else if (d.ore) V[d.drop] = step((d.hard || 0) + 1);
  }
  for (const d of TILE_DEF)
    if (d.drop && V[d.drop] === undefined && !made[d.drop]) V[d.drop] = step(0) * 0.35;

  /* 보스는 **나중에 따로 본다.** 같이 보면 보스도 떨구는 흔한 재료(공허 조각·
     에테르 파편)가 보스 금화로 값이 매겨져 뛴다. 반대로 아예 안 보면 보스만
     떨구는 것 — 별의 심장·헤파의 심장·원형의 핵 — 이 근거를 못 찾아 바닥값 3에
     내려앉는다(다섯 조각을 모으는 이야기인데 조각 하나가 나무 한 개 값이었다).
     그래서 잡몹으로 먼저 매기고, 그때까지 값이 없는 것만 보스로 매긴다. */
  for (const bossPass of [0, 1]) {
    const lo = {}, hi = {};
    for (const k in ENEMIES) {
      const e = ENEMIES[k];
      if (!e.boss !== !bossPass) continue;          // 이 차례의 것만
      const ds = e.drops || [];
      let tot = 0;
      for (const [id, c, a, b] of ds) if ((ITEMS[id] || {}).type === 'mat') tot += c * (a + b) / 2;
      if (!tot) continue;
      const per = Math.min((e.gold || 1) * VAL_SHARE / tot, (e.gold || 1) * VAL_CAP);
      for (const [id] of ds) {
        const d = ITEMS[id] || {};
        if (d.type !== 'mat' || d.price || made[id] || V[id] !== undefined) continue;
        lo[id] = lo[id] === undefined ? per : Math.min(lo[id], per);
        hi[id] = hi[id] === undefined ? per : Math.max(hi[id], per);
      }
    }
    for (const id in lo) V[id] = Math.sqrt(lo[id] * hi[id]);
  }

  const busy = {}, GEARY = { weapon: 1, armor: 1, tool: 1, acc: 1 };
  const cost = (id, dep) => {
    if (V[id] !== undefined) return V[id];
    const r = made[id];
    if (!r || dep > 14 || busy[id]) return (V[id] = step(0));
    busy[id] = 1;
    let c = 0;
    for (const k in r.need) c += cost(k, dep + 1) * r.need[k];
    return (V[id] = c * (GEARY[(ITEMS[id] || {}).type] ? VAL_GEAR : VAL_CRAFT) / (r.n || 1));
  };
  for (const r of RECIPES) cost(r.out, 0);

  // 쓰이기만 하는 재료 — 나란히 적힌 것들의 값으로 자리를 잡는다
  const sourced = {};
  for (const id in ITEMS) if (ITEMS[id].price || made[id]) sourced[id] = 1;
  for (const d of TILE_DEF) if (d.drop) sourced[d.drop] = 1;
  for (const k in ENEMIES) for (const [id] of (ENEMIES[k].drops || [])) sourced[id] = 1;
  for (let pass = 0; pass < 2; pass++) {
    for (const id in ITEMS) {
      if (sourced[id] || ITEMS[id].type !== 'mat') continue;
      const peers = [];
      for (const r of RECIPES) {
        if (!r.need[id]) continue;
        for (const k in r.need) if (k !== id && V[k]) peers.push(V[k]);
      }
      if (!peers.length) continue;
      peers.sort((a, b) => a - b);
      V[id] = peers[Math.floor(peers.length / 2)];
    }
  }

  // 등급 사다리 — 만들 수 있는 무기들을 로그 자리에서 직선으로 맞춘다.
  // 등급별 평균을 그냥 쓰면 6등급이 5등급보다 싸지는 식으로 들쭉날쭉하다.
  const pts = [];
  for (const r of RECIPES) {
    const d = ITEMS[r.out];
    if (d && d.type === 'weapon' && d.tier !== undefined && V[r.out] > 0)
      pts.push([d.tier, Math.log(V[r.out])]);
  }
  let a = 0.48, b0 = Math.log(120);
  if (pts.length > 1) {
    const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
    const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
    a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    b0 = (sy - a * sx) / n;
  }
  const ladder = t => Math.exp(b0 + a * clamp(t, 0, WEAPON_TIER_LV.length - 1));
  const lvTier = lv => {
    let t = 0;
    for (let i = 0; i < WEAPON_TIER_LV.length; i++) if ((lv || 1) >= WEAPON_TIER_LV[i]) t = i;
    return t;
  };
  const fac = {};
  for (const ty in GEARY) {
    const xs = RECIPES.map(r => r.out).filter(id => (ITEMS[id] || {}).type === ty)
      .map(id => V[id] / ladder(ITEMS[id].tier !== undefined ? ITEMS[id].tier : lvTier(ITEMS[id].lvReq)))
      .filter(x => x > 0 && isFinite(x));
    fac[ty] = xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : 1;
  }
  for (const id in ITEMS) {
    if (V[id] !== undefined) continue;
    const d = ITEMS[id];
    if (fac[d.type] !== undefined)
      V[id] = ladder(d.tier !== undefined ? d.tier : lvTier(d.lvReq)) * fac[d.type];
    else if (d.type === 'consum') V[id] = 22;
    else if (d.type === 'block') V[id] = 2;
    else V[id] = step(0);
  }
  for (const id in ITEMS)
    if (ITEMS[id].type === 'consum' && !ITEMS[id].price) V[id] = Math.max(V[id] || 0, 22);

  for (const id in V) V[id] = Math.max((ITEMS[id] || {}).type === 'mat' ? VAL_MIN : 1, Math.round(V[id]));
  return V;
})();

/* ================= 스킬 손맛 =================

   ■ 열아홉 가지가 전부 같은 소리였다

     useSkill() 은 마지막에 G.sfx('skill') 한 줄로 끝났다. 화염구도, 치유도,
     순간이동도, 전투 함성도, 사슬 번개도 **똑같은 삑 소리 하나**였다. 손에
     닿는 것이 갈리지 않으니 무엇을 썼는지가 소리로는 전혀 안 들렸다.

     화면 흔들림도 제각각이었다 — 광폭 베기 6, 철벽 4, 대지 가르기 12, 함성 9,
     운석 22. 나머지 **열넷은 아예 0**이라, 화살 세례나 순간이동은 눌러도 화면이
     한 점도 안 움직였다. 세기 순서와도 안 맞았다(철벽이 베기보다 조용한 건
     맞지만, 운석이 대지 가르기의 두 배여야 할 까닭은 없다).

   ■ 한 표로 모은다

     s   소리 키. 열아홉을 열다섯 갈래로 묶었다 — 베기와 검무는 같은 칼바람이고,
         화염구와 운석은 같은 불이 붙는 소리다. 갈래마다 파일 하나면 된다.
     k   화면 흔들림. 세기 순서대로 매긴다(0 · 4 · 7 · 10 · 14 · 20).
     st  **손이 멈추는 한 박자**(초). 큰 것이 닿는 순간 세계가 잠깐 선다.
         손맛에서 가장 크게 먹히는 한 가지인데 이 게임에는 아예 없었다.
     c   시전 고리 색. 예전에는 화살 세례·비·화염구·늑대·표식처럼 **제자리에
         아무 표시도 안 남는** 스킬이 많아서, 눌렀는지 안 눌렸는지도 몰랐다.
     r   고리 크기. 스킬이 실제로 닿는 범위와 맞춘다 — 고리가 곧 사거리다. */
const SKILL_FX = {
  /* 검투사 */
  s_cleave:   { s: 'sk_slash',  k: 7,  st: .04, c: '#ffb24a', r: 108 },
  s_charge:   { s: 'sk_charge', k: 10, st: .05, c: '#ffd07a', r: 46 },
  s_whirl:    { s: 'sk_slash',  k: 6,  st: 0,   c: '#ffcf6a', r: 96 },
  s_quake:    { s: 'sk_quake',  k: 14, st: .07, c: '#c8845a', r: 60 },
  s_guard:    { s: 'sk_guard',  k: 4,  st: 0,   c: '#d8a05a', r: 52 },
  s_warcry:   { s: 'sk_shout',  k: 10, st: .05, c: '#e8a04a', r: 190 },
  /* 유격 */
  s_volley:   { s: 'sk_volley', k: 4,  st: 0,   c: '#9fe07a', r: 54 },
  s_rain:     { s: 'sk_volley', k: 6,  st: 0,   c: '#9fe07a', r: 70 },
  s_pierce:   { s: 'sk_pierce', k: 5,  st: .03, c: '#9fe07a', r: 46 },
  s_smoke:    { s: 'sk_smoke',  k: 0,  st: 0,   c: '#b8c8b0', r: 150 },
  s_mark:     { s: 'sk_mark',   k: 0,  st: 0,   c: '#e8d05a', r: 40 },
  /* 술사 */
  s_fireball: { s: 'sk_fire',   k: 4,  st: 0,   c: '#ff9a4a', r: 44 },
  s_nova:     { s: 'sk_frost',  k: 7,  st: .04, c: '#9fe0ff', r: 160 },
  s_meteor:   { s: 'sk_fire',   k: 4,  st: 0,   c: '#ffb04a', r: 60 },   // 떨어질 때가 진짜다
  s_heal:     { s: 'sk_heal',   k: 0,  st: 0,   c: '#9ff09f', r: 42 },
  s_barrier:  { s: 'sk_shield', k: 0,  st: 0,   c: '#6fb8ff', r: 48 },
  s_chain:    { s: 'sk_bolt',   k: 5,  st: .03, c: '#ffe86a', r: 44 },
  s_blink:    { s: 'sk_blink',  k: 4,  st: 0,   c: '#c08fff', r: 48 },
  s_wolf:     { s: 'sk_summon', k: 4,  st: 0,   c: '#c8b88a', r: 56 }
};
/* 운석이 실제로 닿는 순간 — 이 게임에서 가장 큰 한 방이라 멈춤도 가장 길다 */
const SKILL_HIT = { meteor: { s: 'sk_meteor', k: 20, st: .10 } };
