/* ===== data/ruins.js — 유적 · 맥박 · 탐사 · 메아리 · 동굴 갈래 · 암호 · 비문 · 사건 ===== */
import { SHIFT } from '../size.js';
import { T } from '../data.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ---------------- 바이옴 유적 ---------------- */
/* traps 값은 기계 키가 아니라 타일 함정 종류다 — 'dart'(화살 구멍) · 'vent'(불길 분출구) · 'crumble'(부서지는 바닥). */
/* 난이도 등급(rank) — 기준은 "플레이어가 실제로 언제 여기 닿는가"다. */
export const RUIN_SPEC = [
  {
    id: 'ice', n: '얼음 던전', x: 300 + SHIFT, y: 150, w: 88, h: 50,
    wall: T.ICEBRICK, floor: T.ICE, bg: 5, torch: T.TORCH,
    traps: ['dart', 'crumble', 'grind'], boss: 'ice_warden',
    mobs: ['frostling', 'icewolf', 'frostbound'],
    rank: 2, tier: 3, trapRate: 0.46, spikeRate: 0.26, chestRate: 0.16, mobMul: 1.0
  },
  {
    /* ★ 피라미드는 **반쯤 묻힌 삼각형**이다(plan 'tri') — 사연: docs/code-history.md#h14 */
    id: 'pyramid', n: '피라미드', x: 2180 + SHIFT, y: 50, w: 96, h: 52,
    wall: T.SANDBRICK, floor: T.SANDSTONE, bg: 8, torch: T.TORCH,
    traps: ['dart', 'vent', 'crumble', 'gas'], boss: 'sand_guardian',
    mobs: ['scorpion', 'sandmaw', 'skeleton', 'jarhusk'],
    // 지상으로 튀어나온 데다 얕아서 일찍 눈에 띄지만, 안은 함정이 가장 촘촘하다 — "보이는 것과 실제 난이도가 다른" 유적 하나는 있어야 한다
    rank: 4, tier: 4, trapRate: 0.78, spikeRate: 0.46, chestRate: 0.20, mobMul: 1.35
  },
  {
    id: 'mine', n: '버려진 광산', x: 820 + SHIFT, y: 168, w: 84, h: 44,
    wall: T.MINEWOOD, floor: T.PLANK, bg: 4, torch: T.TORCH,
    traps: ['dart', 'crumble', 'gas'], boss: 'mine_horror',
    mobs: ['minerghost', 'spider', 'bat', 'cartwraith'],
    // 베이스캠프 바로 옆.
    rank: 1, tier: 2, trapRate: 0.32, spikeRate: 0.16, chestRate: 0.14, mobMul: 0.85
  },
  {
    id: 'blight', n: '부패한 둥지', x: 4020 + SHIFT, y: 196, w: 100, h: 60,
    wall: T.EBONSTONE, floor: T.EBONSTONE, bg: 3, torch: T.TORCH,
    traps: ['dart', 'vent', 'gas', 'coil'], boss: 'blight_maw',
    mobs: ['crawler', 'shadoweye', 'sacling'],
    // 동쪽 끝 + 가장 깊다.
    rank: 6, tier: 6, trapRate: 0.92, spikeRate: 0.58, chestRate: 0.24, mobMul: 1.85
  },
  {
    id: 'spore', n: '포자 굴', x: 3620 + SHIFT, y: 176, w: 100, h: 52,
    wall: T.SPORESTONE, floor: T.GLOWMOSS, bg: 12, torch: T.GLOWCAP,
    traps: ['vent', 'dart', 'gas', 'coil'], boss: 'spore_queen',
    mobs: ['sporeling', 'capbeast', 'ventspitter'], arch: 'buried',
    // 입구가 없어 우연히 뚫고 들어가는 곳.
    rank: 5, tier: 5, trapRate: 0.50, spikeRate: 0.30, chestRate: 0.22, mobMul: 1.6
  }
];
/* 유적 생김새(arch) — 같은 방 생성기를 쓰되 "어떻게 발견되는가"를 갈랐다. */
/* 입구 통로 자체의 성격(entryKind) — arch(바깥 생김새)와는 별개 축이다. */
/* ★ `rooms` 가 **목표 방 수**다(carveDungeon 의 target). */
RUIN_SPEC[0].plan = 'ring';   RUIN_SPEC[0].arch = 'buried';  RUIN_SPEC[0].bsp = [5, 12, 7]; RUIN_SPEC[0].rooms = 18;  // 얼음 (rank 2)
RUIN_SPEC[1].plan = 'tri';     RUIN_SPEC[1].arch = 'pyramid'; RUIN_SPEC[1].bsp = [6, 9, 6]; RUIN_SPEC[1].rooms = 18;  // 피라미드 (rank 4) — 삼각형 안에 든 방만
RUIN_SPEC[2].plan = 'spine';  RUIN_SPEC[2].arch = 'gated';   RUIN_SPEC[2].bsp = [5, 10, 7]; RUIN_SPEC[2].rooms = 15;  // 광산 (rank 1 — 가장 작다)
RUIN_SPEC[3].plan = 'warren'; RUIN_SPEC[3].arch = 'buried';  RUIN_SPEC[3].bsp = [6, 10, 7]; RUIN_SPEC[3].rooms = 36;  // 부패한 둥지 (rank 6 — 가장 크다)
RUIN_SPEC[4].plan = 'horseshoe'; RUIN_SPEC[4].arch = 'buried'; RUIN_SPEC[4].bsp = [5, 10, 7]; RUIN_SPEC[4].rooms = 32; // 포자 굴 (rank 5)

/* 겉으로 보이는 재질을 유적마다 갈랐다 — 나무 · 돌 · 구리 · 얼음 · 유기물. */
/* 앞의 셋은 그 유적의 '재질'이고(다른 데서도 보는 것), 뒤의 둘이 *그곳에서만 보는 것**이다. */
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

/* bonus 는 그 유적에서 많이 나오는 **흔한 자원**이고(위), bonus2 는 *그 유적에서만 나오는 재료**다. */
RUIN_SPEC[0].bonus2 = 'neverthaw';
RUIN_SPEC[1].bonus2 = 'sealed_ash';
RUIN_SPEC[2].bonus2 = 'deep_ember';
RUIN_SPEC[3].bonus2 = 'blight_spawn';
RUIN_SPEC[4].bonus2 = 'spore_dust';

/* --- 가라앉은 유적 (비밀) --- */
RUIN_SPEC.push({
  id: 'abyss', n: '가라앉은 유적', x: 210, y: 600, w: 92, h: 60,
  wall: T.RUINBRICK, floor: T.RUINTILE, bg: 10, torch: T.GLOWCAP,
  traps: ['brine', 'dart', 'crumble', 'mine'], boss: 'drowned_keeper',
  mobs: ['ruin_guard', 'archivist', 'lantern'],
  rank: 7, tier: 5, trapRate: 1.0, spikeRate: 0.5, chestRate: 0.24, mobMul: 1.25,
  arch: 'seabed', plan: 'warren', rooms: 32, maze: 1, entryKind: 'maze',
  decor: [['growth', T.KELPPLANT, 0.5], ['stalac', T.RUINBRICK, 0.35], ['brazier', T.GLOWCAP, 0.4]],
  bonus: 'sunken_coin', bonus2: 'abyss_pearl'
});

/* 도면 — 굵은 격자(가로 4칸 x 세로 3칸). */
export const RUIN_PLANS = {
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

/* 스토리 유적 셋(석판)의 도면·입구·고유 요소. */
/* 석판 유적 셋도 같은 규칙이다 — rooms 가 목표 방 수, bsp 가 [깊이, 최소 가로, 최소 세로]. */
export const STORY_RUIN = [
  { n: '서리 밑 석실', plan: 'hook', arch: 'sunken', rooms: 12, bsp: [5, 10, 7], decor: [['pillar', T.ICE, 0.4], ['stalac', T.ICE, 0.45]],     sig: 'frozen',  event: 'blackout', bonus: 'ice_shard' },
  { n: '겹친 길', plan: 'tee',  arch: 'sunken', rooms: 14, bsp: [5, 10, 7], decor: [['statue', T.RUINBRICK, 0.45], ['pipe', T.COPPER, 0.5], ['frieze', T.RUNESTONE, 0.3]], sig: 'sunshaft', event: 'password', bonus: 'aether_shard' },
  { n: '발 디딜 곳 없는 방', plan: 'hall', arch: 'sunken', rooms: 18, bsp: [5, 10, 7], decor: [['growth', T.CORRUPTLEAF, 0.5], ['web', T.VINE, 0.4], ['pipe', T.LEAD, 0.35]], sig: 'heart', event: 'swarm',   bonus: 'corrupt_ess' }
];
/* 석판 유적에도 맥박 · 사건 · 탐사 기록이 뛴다. */
STORY_RUIN[0].mobs = ['frostling', 'icewolf', 'skeleton']; STORY_RUIN[0].rank = 2;
STORY_RUIN[1].mobs = ['skeleton', 'spider', 'bat'];         STORY_RUIN[1].rank = 3;
STORY_RUIN[2].mobs = ['crawler', 'shadoweye', 'skeleton'];  STORY_RUIN[2].rank = 5;

/* 입구가 없는 유적(arch: 'buried')은 위치 지도를 구해야 찾는다. */
/* 신비한 방 — 한 세계에 두세 곳. */
export const MYSTIC = {
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
    got: '몸이 가벼워지고 상처가 아물었다' },
  gale: { n: '바람의 사당', tile: 'RUNESTONE',
    lines: ['기둥 사이로 바람이 한 방향으로만 분다. 섬 밖, 아래쪽으로.',
            '바닥 돌에 발자국이 새겨져 있다. 전부 가장자리를 향해 있고, 돌아온 자국은 없다.'],
    ask: '두 팔을 벌리고 바람을 맞는다', cost: 0, buff: 'windborne',
    got: '발밑이 가벼워졌다 — 공중에서 한 번 더 뛸 수 있다' }
};

export const RUIN_MAP_IN = {
  ice: 'mine',        // 광산(입구 있음) → 얼음 던전
  spore: 'pyramid',   // 피라미드(지상에 솟음) → 포자 굴
  blight: 'spore'     // 포자 굴 → 부패한 둥지 (가장 깊은 사슬 끝)
};

/* ---------------- 유적 비문 ---------------- */
/* 유적마다 하나씩 있는 유물. */
export const RUIN_RELIC = {
  ice: 'relic_frostpane', pyramid: 'relic_sundial', mine: 'relic_lastlamp',
  blight: 'relic_rotcore', spore: 'relic_sporebell',
  story0: 'relic_frostmark', story1: 'relic_mazeeye', story2: 'relic_hollowseed'
};

/* ---------------- 유적의 맥박 ---------------- */
export const PULSE = {
  stages: [
    { n: '잠듦',   at: 0,  c: '#7a8a9a' },
    { n: '뒤척임', at: 25, c: '#d8b13d' },
    { n: '깨어남', at: 50, c: '#e0782a' },
    { n: '격노',   at: 75, c: '#e8303c' }
  ],
  /* ★ 맥박은 천천히 오른다 — 빨리 오르면 유적이 "들어가면 곧 몹 떼"로만 읽힌다. */
  rise: 0.28, fall: 2.5,          // 초당 — 안에 있을 때 오르고, 밖에 나가면 가라앉는다
  chest: 12, vault: 22, kill: 3,  // 상자 · 보물방 상자(유물·지도 · 지킴이 붙은 것) · 쓰러뜨릴 때 가라앉는 양
  wave: [0, 60, 40, 28],          // 단계별로 유적의 것들이 몰려오는 간격(초)
  waveN: [0, 1, 1, 2],            // 한 번에 몇
  rageEvery: 24                   // 격노 중 그 유적 고유의 발작 간격(초)
};
/* 맥박 사건 — 단계가 오를 때마다 하나(이미 벌어진 사건이 없을 때). */
export const PULSE_EVENTS = {
  hunt:   { n: '표식된 것', i: '🎯', t: 60, stages: [1, 3],
            d: '유적이 하나에 표식을 새겼다 — 달아나기 전에 쓰러뜨려라' },
  stones: { n: '공명석', i: '💠', t: 90, stages: [1, 2],
            d: '다른 방 셋에서 돌이 울린다 — 셋을 다 만지면 맥박이 흩어진다' },
  greed:  { n: '탐욕의 상자', i: '🪙', t: 60, stages: [2, 3],
            d: '황금 상자가 떠올랐다 — 가라앉기 전에 열어라. 지키는 것이 깨어난다' },
  siege:  { n: '포위', i: '⚔', t: 75, stages: [2, 3],
            d: '유적이 문을 닫았다 — 세 차례 몰려오는 것을 모두 쓰러뜨려라' }
};
/* 격노 발작 — 유적마다 하나. */
export const PULSE_RAGE = {
  ice:     { k: 'dark',  t: '얼음 속의 불이 한꺼번에 꺼진다' },
  mine:    { k: 'quake', t: '갱도가 울린다 — 무언가 내려온다' },
  pyramid: { k: 'heat',  t: '벽 틈에서 달군 모래가 쏟아진다' },
  spore:   { k: 'spore', t: '벽의 홀씨가 한꺼번에 터진다' },
  blight:  { k: 'swarm', t: '둥지 전체가 요동친다' },
  abyss:   { k: 'dark',  t: '물이 빛을 삼킨다' },
  story0:  { k: 'dark',  t: '석실의 서리가 불을 삼킨다' },
  story1:  { k: 'quake', t: '겹친 길이 비틀린다 — 무언가 내려온다' },
  story2:  { k: 'swarm', t: '발밑의 방들이 한꺼번에 깨어난다' }
};

/* ---------------- 탐사 기록 ---------------- */
export const SURVEY_W = { rooms: 30, chests: 15, lore: 8, boss: 12, code: 5, rage: 6, events: 12, echo: 12 };
export const SURVEY_TIERS = [
  { r: 'S', c: '#ffd24a', need: { rooms: 1, chests: 1, boss: 1, lore: 1, code: 1, rage: 1, events: 5, kinds: 4, echo: 3 } },
  { r: 'A', c: '#e8a0ff', need: { rooms: 0.9, chests: 0.8, boss: 1, lore: 1, rage: 1, events: 3, kinds: 2, echo: 1 } },
  { r: 'B', c: '#8fd0ff', need: { rooms: 0.65, chests: 0.5, boss: 1, events: 1 } },
  { r: 'C', c: '#9fdc8f', need: { rooms: 0.35, chests: 0.2 } },
  { r: 'D', c: '#9a9a9a', need: {} }
];
export const SURVEY_LABEL = { rooms: '방', chests: '상자', boss: '주인', lore: '비문', code: '골방', rage: '격노',
                       events: '사건', kinds: '사건 갈래', echo: '메아리' };

/* ---------------- 메아리 시련 ---------------- */
export const ECHO = { max: 5, mul: lv => 1 + 0.35 * lv, needStage: 2 };

/* ---------------- 동굴 갈래 ---------------- */
export const CAVE_TYPES = [
  { id: 'plain' },
  { id: 'moss',  n: '이끼 굴',   c: '#8fd07a', w: [3, 1],
    line: '공기가 촉촉하다. 이끼 사이에 있으면 상처가 조금씩 아문다.' },
  { id: 'drip',  n: '종유 동굴', c: '#c8c0b0', w: [3, 2.5],
    line: '물방울 소리가 난다. 머리 위의 것들이 전부 붙어 있는 것은 아니다.' },
  { id: 'geode', n: '수정 동굴', c: '#b89fff', w: [0.8, 3],
    line: '벽이 스스로 빛난다. 수정이 뿌리를 내린 자리다.' },
  { id: 'fume',  n: '독기 굴',   c: '#a8c04a', w: [0.6, 1.6],
    line: '숨이 따갑다. 오래 머물면 몸이 상하지만, 광맥이 짙다.' }
];
/* 금 간 자갈 — 무너지면 숨은 동굴이 열린다. */
export const FAULT = { count: 28, steps: 260, rx: 34, ry: 15 };   // steps 190 이면 열린 굴이 500칸 남짓이라 '확장'으로 안 읽혔다

/* ---------------- 암호문 (잠긴 골방의 자물쇠) ---------------- */
export const CIPHER_KIND = {
  digits: {
    n: '숫자 자물쇠', len: 3, numeric: 1,
    door: '홈이 셋. 숫자를 하나씩 맞춰 넣는 자리다.',
    ask: '세 자리 숫자'
  },
  word: {
    n: '글자 자물쇠', len: 3, numeric: 0,
    door: '홈이 셋. 숫자가 아니라 글자를 새겨 넣는 자리다.',
    ask: '세 글자'
  },
  decode: {
    n: '풀어 읽는 자물쇠', len: 3, numeric: 1,
    door: '문설주에 수가 새겨져 있다. 그런데 홈은 그 수를 받지 않는다.',
    ask: '세 자리 숫자'
  }
};

/* 글자 자물쇠가 쓰는 세 글자 낱말. */
export const CIPHER_WORDS = ['재의문', '별무덤', '잠긴돌', '마른뼈', '언바람', '검은눈',
                      '첫파수', '깊은잠', '흰재별', '무너짐', '돌의뼈', '마지막'];

/* 어느 유적에 어떤 자물쇠가 걸리는가. */
export const RUIN_CIPHER = {
  pyramid: 'digits',   // 하늘을 재던 곳 — 수로 잠갔다
  story1: 'word',      // 겹친 길 — 두 사람이 말을 나눠 적었다
  blight: 'decode'     // 가장 깊고 사나운 곳 — 주워 적는 것만으로는 안 열린다
};

/* 유적에 처음 발을 들일 때 뜨는 카드. */
export const RUIN_CARD = {
  ice:     { sub: '얼어붙은 골짜기 아래', line: '스스로 골짜기를 얼린 사람들이 있었다. 그 얼음이 지금 녹고 있다.' },
  pyramid: { sub: '모래에 반쯤 잠긴', line: '왕의 무덤이 아니다. 하늘을 감시하려고 세운 눈이다.' },
  mine:    { sub: '베이스캠프 곁의', line: '갱도는 아직 따뜻하다. 마지막 교대가 올라오지 않았다.' },
  blight:  { sub: '동쪽 끝, 가장 깊은 곳', line: '여기서부터는 부패가 벽을 대신한다.' },
  spore:   { sub: '뚫고 들어온 자리', line: '입구가 없다. 나가는 길도 스스로 뚫어야 한다.' },
  story0:  { sub: '첫 번째 석판', line: '서리 아래에 글씨가 있다. 두 사람의 손으로 쓰였다.' },
  story1:  { sub: '두 번째 석판', line: '길이 겹쳐 있다. 같은 방을 두 번 지나게 되어 있다.' },
  story2:  { sub: '세 번째 석판', line: '발 디딜 곳이 없다. 여기까지 온 사람은 돌아갈 생각이 없던 사람이다.' }
};

export const RUIN_LORE = {
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

/* 유적 안에 흩어 둔 짧은 흔적. */
/* 채취탑(잿빛 숲의 대형 기계 그림) — 자리 고르기 · 발자국 · 해체 부품.
   in: [바이옴 id, 몇 대] · edge: 바이옴 경계에서 떨어뜨릴 칸 · leg: 다리가 딛는 반폭(이 안은 지면이 같아야 한다)
   half/tall: 다리·몸통 칸(가운데 ±1칸 · 위로 6칸) · stack: 굴뚝(가운데와 오른쪽 한 칸, 위로 8칸)
   — **그린 칸만** 막는다. 둘레 11×10칸을 막던 때는 빈 풀밭에도 아무것도 못 놓았다 */
/* 충전된 배터리 한 개가 채우는 전하 — 최대 전하(부적으로 늘어남)와 무관하게 같다 */
export const CELL_CHARGE = 200;

export const RIG = { in: [['forest', 2], ['forest2', 1]], edge: 40, leg: 2, half: 1, tall: 6, stack: 8,
  parts: [['steel_plate', 10], ['gear_basic', 8], ['iron_bar', 12], ['wire', 12], ['motor', 2], ['circuit', 3], ['machine_frame', 1]] };

/* 마을 2단계(밭이 생기는 때)에 가방으로 주는 연장·씨앗 한 벌 */
export const FARM_KIT = [['hoe_iron', 1], ['scythe_iron', 1], ['seed_wheat', 12], ['seed_starroot', 8], ['seed_ashcap', 6], ['fertilizer', 6]];

export const RUIN_HINTS = {
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
  ],
  /* 하늘 섬 — 유적은 아니지만 읽을 거리가 흩어져 있다(보상 없이 읽기만). */
  sky: [
    ['끊어진 사슬 고리', ['섬 가장자리에 굵은 쇠고리가 박혀 있다. 사슬은 아래쪽으로 끊겨 나갔다.', '섬들은 처음부터 떠 있던 게 아니라, 붙잡혀 있던 것이다.']],
    ['바람에 깎인 이름들', ['기둥마다 이름이 새겨져 있었다. 바람이 먼저 지웠다.', '남은 것은 끝 글자뿐 — 전부 같은 두 글자로 끝난다. 「지기」.']],
    ['아래를 향한 창', ['창이 전부 발밑을 향해 뚫려 있다. 하늘을 보려고 세운 곳이 아니다.', '땅을 내려다보던 자리다. 무엇이 떨어지는지 지켜보던.']],
    ['폭풍 일지 한 장', ['「셋째 폭풍. 파수꾼이 또 하나 돌아오지 않았다.」', '「제단의 구슬이 흐려진다. 누군가 다시 불을 넣어야 한다.」']],
    ['구름 씨앗 항아리', ['깨진 항아리 안에 마른 흙과 씨앗 껍질이 남아 있다.', '여기서 무언가를 길렀다. 땅에서는 자라지 않는 것을.']],
    ['별을 센 눈금', ['바닥에 새긴 원 둘레로 눈금이 빼곡하다. 하나에 별 하나.', '마지막 눈금 옆만 깊게 파였다 — 떨어진 그 별이다.']]
  ]
};

/* ---------------- 세계 이벤트 ---------------- */
export const EVENTS = {
  bloodmoon: {
    n: '붉은 달', i: '🌑',
    d: '달이 붉다. 오늘 밤은 밖에 있으면 안 된다.',
    night: 1, chance: 0.08, zones: ['surface', 'ice', 'corrupt', 'jungle', 'glowfen'],
    table: ['crimson_howler', 'crimson_eye', 'crimson_howler', 'zombie', 'crimson_eye'],
    cap: 34, tint: '#6a1414', tintAmt: 0.5, rw: 2.2,
    /* 붉은 달만 **플레이어 레벨을 탄다.** */
    lvScale: 1
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
  /* 비 — 다른 이벤트와 달리 스폰표를 바꾸지 않는다(table 없음). */
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
