// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== data/quests.js — 부탁 · 의뢰 ===== */
import { clamp } from '../../engine/core/math.js';
import { tr } from '../lang.js';
import { T, TILE_DEF } from '../data.js';
import { ITEMS } from './items.js';
import { ENEMIES, mobCw } from './enemies.js';
import { sessionOf } from './story.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

export const SIDE_POOL = {
  elara: [
    (ch, rng) => {
      const targets = ['slime', 'zombie', 'bat', 'skeleton', 'archer', 'crawler', 'shadoweye', 'frostling', 'imp', 'golem', 'wraith'];
      const t = targets[clamp(ch * 2 + rng.int(0, 1), 0, targets.length - 1)];
      const n = rng.int(5, 9);
      return {
        title: tr('마을을 지켜라'),
        desc: tr('요즘 {enemy|이} 부쩍 늘었어. {n}마리만 줄여 주겠니?', { enemy: ENEMIES[t].n, n }),
        obj: { type: 'kill', target: t, n },
        rw: { gold: 35 + ch * 45, xp: 25 + ch * 35 },
        doneLine: tr('덕분에 한숨 돌렸다. 고마워.')
      };
    },
    (ch, rng) => {
      const n = rng.int(8, 16);
      return {
        title: tr('땔감 모으기'),
        desc: tr('겨울이 오기 전에 나무 {n}개만 더 모아 주련?', { n }),
        obj: { type: 'collect', item: 'wood', n },
        rw: { gold: 20 + ch * 20, xp: 15 + ch * 20 },
        doneLine: tr('따뜻하게 날 수 있겠어. 고맙다.')
      };
    },
    (ch, rng) => {
      const n = rng.int(20, 32);
      return {
        title: tr('무너진 담'),
        desc: tr('담이 한쪽으로 주저앉았어. 돌 {n}개면 다시 세울 수 있을 것 같아.', { n }),
        obj: { type: 'collect', item: 'stone', n },
        rw: { gold: 25 + ch * 25, xp: 20 + ch * 25 },
        doneLine: tr('담이 섰어. 담이 있으면 안쪽이 생기더라. 그게 마을이지.')
      };
    },
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(6, 10);
      return {
        title: tr('돌아오지 않은 사람'),
        desc: tr('어제 나간 사람이 안 돌아왔어. {enemy} {n}{mobCw}만 걷어 주면 내가 찾으러 나갈 수 있어.', { enemy: ENEMIES[t].n, n, mobCw: mobCw(t) }),
        obj: { type: 'kill', target: t, n },
        rw: { gold: 45 + ch * 50, xp: 40 + ch * 45 },
        doneLine: tr('…찾았어. 다치기만 했더라. 네가 길을 열어 준 덕이야.')
      };
    }
  ],
  borin: [
    (ch, rng) => {
      const ores = ['copper_ore', 'iron_ore', 'gold_ore', 'mythril_ore', 'hell_ore'];
      const item = ores[clamp(ch, 0, ores.length - 1)];
      const n = rng.int(6, 12);
      return {
        title: tr('광석 배달'),
        desc: tr('{item} {n}개가 필요해. 가져다 주면 사례하지.', { item: ITEMS[item].n, n }),
        obj: { type: 'collect', item, n },
        rw: { gold: 40 + ch * 55, xp: 20 + ch * 30 },
        doneLine: tr('좋은 광석이군. 이걸로 뭔가 만들 수 있겠어.')
      };
    },
    (ch, rng) => {
      const bars = ['copper_bar', 'iron_bar', 'gold_bar', 'mythril_bar'];
      const item = bars[clamp(ch - 1, 0, bars.length - 1)];
      const n = rng.int(3, 6);
      return {
        title: tr('주괴 시험'),
        desc: tr('내가 정련법을 가르쳐줄 테니, {item} {n}개를 직접 만들어 와 봐.', { item: ITEMS[item].n, n }),
        obj: { type: 'collect', item, n },
        rw: { gold: 50 + ch * 60, xp: 30 + ch * 40 },
        doneLine: tr('제법인데. 대장장이 소질이 있어.')
      };
    },
    (ch, rng) => {
      const n = rng.int(12, 20);
      return {
        title: tr('불에 넣을 것'),
        desc: tr('화로가 자꾸 식어. 석탄 {n}개만 있으면 밤새 살려 둘 수 있어.', { n }),
        obj: { type: 'collect', item: 'coal', n },
        rw: { gold: 30 + ch * 35, xp: 20 + ch * 25 },
        doneLine: tr('밤새 불이 안 꺼졌어. 자다 깨서 확인 안 해도 되겠군.')
      };
    },
    (ch, rng) => {
      const tile = chPick(CH_ORE, ch);
      const n = rng.int(14, 24);
      return {
        title: tr('광맥째로'),
        desc: tr('{tileDef|을} {n}번 깨 와. 주워 온 것 말고 네가 깬 걸로.', { tileDef: TILE_DEF[tile].n, n }),
        obj: { type: 'mine', tile, n },
        rw: { gold: 45 + ch * 50, xp: 30 + ch * 40 },
        doneLine: tr('깬 자리가 고르군. 곡괭이를 아는 손이야.')
      };
    }
  ],
  mira: [
    (ch, rng) => {
      /* 세션마다 다른 표를 쓴다 — 사연: docs/code-history.md#h20 */
      const s1 = ['crystal', 'frost_core', 'corrupt_ess', 'soul_shard', 'void_frag'];
      const s2 = ['aether_shard', 'conduit_part', 'power_core', 'core_shard', 'draft_glass'];
      const item = sessionOf(ch).id >= 2 ? s2[clamp(ch - 10, 0, s2.length - 1)]
                           : s1[clamp(ch - 1, 0, s1.length - 1)];
      const n = rng.int(5, 10);
      return {
        title: tr('마력 재료'),
        desc: tr('{item|이} {n}개 필요해. 마법 재료야.', { item: ITEMS[item].n, n }),
        obj: { type: 'collect', item, n },
        rw: { gold: 35 + ch * 50, xp: 25 + ch * 35 },
        doneLine: tr('좋아, 이걸로 주문을 하나 완성할 수 있겠어.')
      };
    },
    (ch, rng) => {
      const targets = ['shadoweye', 'frostling', 'imp', 'wraith'];
      const t = targets[clamp(ch - 2, 0, targets.length - 1)];
      const n = rng.int(4, 7);
      return {
        title: tr('마력 파동 조사'),
        desc: tr('{enemy}에게서 이상한 마력이 느껴져. {n}마리만 처리해 줘.', { enemy: ENEMIES[t].n, n }),
        obj: { type: 'kill', target: t, n },
        rw: { gold: 45 + ch * 55, xp: 35 + ch * 40 },
        doneLine: tr('파동이 잦아들었어. 역시 네 덕분이야.')
      };
    },
    (ch, rng) => {
      const tile = chPick(CH_ORE, ch);
      const n = rng.int(10, 18);
      return {
        title: tr('별빛이 닿은 자리'),
        desc: tr('{tileDef}에 별빛이 스며 있어. {n}번만 깨 와 줘. 깨야 보여.', { tileDef: TILE_DEF[tile].n, n }),
        obj: { type: 'mine', tile, n },
        rw: { gold: 40 + ch * 45, xp: 35 + ch * 45 },
        doneLine: tr('역시. 조각이 떨어진 자리부터 빛이 스며들고 있어.')
      };
    },
    (ch, rng) => {
      const item = chPick(CH_MAT, ch);
      const n = rng.int(10, 18);
      return {
        title: tr('재우는 데 쓸 것'),
        desc: tr('{item} {n}개. 조각을 재우는 건 못 하지만, 꿈을 얕게는 만들 수 있어.', { item: ITEMS[item].n, n }),
        obj: { type: 'collect', item, n },
        rw: { gold: 40 + ch * 50, xp: 35 + ch * 45 },
        doneLine: tr('이걸로 하룻밤은 얕게 재울 수 있어. 하룻밤이라도 어디야.')
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
        desc: tr('{tileDef|을} {n}번 캐 오너라. 이유는… 나중에 말해주마.', { tileDef: TILE_DEF[tile].n, n }),
        obj: { type: 'mine', tile, n },
        rw: { gold: 30 + ch * 40, xp: 40 + ch * 50 },
        doneLine: tr('…역시. 네가 맞았어.')
      };
    },
    (ch, rng) => {
      const targets = ['skeleton', 'crawler', 'frostling', 'golem', 'wraith'];
      const t = targets[clamp(ch - 1, 0, targets.length - 1)];
      const n = rng.int(5, 9);
      return {
        title: tr('오래된 빚'),
        desc: tr('저 아래 {enemy}에게 진 빚이 있다. {n}마리를 대신 갚아 다오.', { enemy: ENEMIES[t].n, n }),
        obj: { type: 'kill', target: t, n },
        rw: { gold: 40 + ch * 50, xp: 45 + ch * 55 },
        doneLine: tr('빚을 갚았군. 이제 좀 편히 잘 수 있겠어.')
      };
    },
    (ch, rng) => {
      const item = chPick(CH_MAT, ch);
      const n = rng.int(10, 16);
      return {
        title: tr('가져와 보아라'),
        desc: tr('{item} {n}개를 가져와 보아라. 무엇에 쓰는지는 나중에 말해주마.', { item: ITEMS[item].n, n }),
        obj: { type: 'collect', item, n },
        rw: { gold: 35 + ch * 45, xp: 45 + ch * 50 },
        doneLine: tr('…그래. 아직은 이것으로 되는군. 다음에는 더 있어야 할 게다.')
      };
    }
  ],

  /* ---------------- 여명 마을 다섯 (세션 2) ---------------- */
  tamer: [
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(8, 13);
      return {
        title: tr('겁을 먹었다'),
        desc: tr('애들이 우리 밖으로 안 나가려 해. {enemy} {n}{mobCw}만 치워 주면 다시 나올 거야.', { enemy: ENEMIES[t].n, n, mobCw: mobCw(t) }),
        obj: { type: 'kill', target: t, n },
        rw: { gold: 70 + ch * 55, xp: 60 + ch * 50 },
        doneLine: tr('봐, 벌써 문 앞까지 나왔잖아. 짐승은 사람보다 빨리 잊어.')
      };
    },
    (ch, rng) => {
      const n = rng.int(10, 18);
      return {
        title: tr('먹일 것'),
        desc: tr('생고기 {n}개만. 이 도시엔 풀이 없어서 애들이 고기만 먹어.', { n }),
        obj: { type: 'collect', item: 'raw_meat', n },
        rw: { gold: 55 + ch * 45, xp: 45 + ch * 40 },
        doneLine: tr('오늘은 다 먹였다. 먹인 날은 기분이 좋아.')
      };
    }
  ],
  trainer: [
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(12, 18);
      return {
        title: tr('표적'),
        desc: tr('{enemy} {n}{mobCw}. 세어서 와. 몇을 쓰러뜨렸는지 모르는 놈은 제 실력도 모른다.', { enemy: ENEMIES[t].n, n, mobCw: mobCw(t) }),
        obj: { type: 'kill', target: t, n },
        rw: { gold: 80 + ch * 60, xp: 90 + ch * 70 },
        doneLine: tr('세었군. 이제 네가 뭘 할 수 있는지 너도 안다.')
      };
    },
    (ch, rng) => {
      const n = rng.int(6, 12);
      return {
        title: tr('무게'),
        desc: tr('강철 주괴 {n}개를 지고 와라. 나르는 것도 훈련이다. 무겁게 걸으면 가볍게 싸운다.', { n }),
        obj: { type: 'collect', item: 'iron_bar', n },
        rw: { gold: 60 + ch * 50, xp: 80 + ch * 60 },
        doneLine: tr('어깨가 내려앉았군. 내일이면 그 자리에 근육이 붙는다.')
      };
    }
  ],
  haran: [
    (ch, rng) => {
      const n = rng.int(20, 32);
      return {
        title: tr('지붕과 바닥'),
        desc: tr('판자 {n}장. 방은 많은데 바닥이 꺼진 방이 더 많아.', { n }),
        obj: { type: 'collect', item: 'plank', n },
        rw: { gold: 60 + ch * 45, xp: 45 + ch * 40 },
        doneLine: tr('두 방을 더 열었다. 채울 사람은 아직 없지만, 열어는 뒀어.')
      };
    },
    (ch, rng) => {
      const n = rng.int(14, 24);
      return {
        title: tr('아궁이'),
        desc: tr('석탄 {n}개. 손님한테 찬물을 내놓을 수는 없잖아.', { n }),
        obj: { type: 'collect', item: 'coal', n },
        rw: { gold: 55 + ch * 45, xp: 40 + ch * 40 },
        doneLine: tr('오늘 묵는 사람은 더운물로 씻는다. 그거 하나로 여관이 여관이 돼.')
      };
    }
  ],
  seira: [
    (ch, rng) => {
      const n = rng.int(18, 30);
      return {
        title: tr('벼릴 것'),
        desc: tr('강철판 {n}개. 도시에서 뜯어 온 걸로 벼리면 이 도시 물건이 되는 거지.', { n }),
        obj: { type: 'collect', item: 'steel_plate', n },
        rw: { gold: 70 + ch * 55, xp: 50 + ch * 45 },
        doneLine: tr('같은 판인데 두들기면 다른 게 돼. 그래서 이 일을 그만 못 둬.')
      };
    },
    (ch, rng) => {
      const tile = chPick(CH_ORE, ch);
      const n = rng.int(16, 26);
      return {
        title: tr('주워 온 것 말고'),
        desc: tr('{tileDef|을} {n}번 깨 와. 주워 온 쇠는 이미 한 번 남의 물건이었잖아.', { tileDef: TILE_DEF[tile].n, n }),
        obj: { type: 'mine', tile, n },
        rw: { gold: 75 + ch * 60, xp: 55 + ch * 50 },
        doneLine: tr('처음부터 우리 것인 쇠야. 이걸로 만든 건 팔지 말자.')
      };
    }
  ],
  kade: [
    (ch, rng) => {
      const n = rng.int(8, 14);
      return {
        title: tr('끊긴 선'),
        desc: tr('동력관 조각 {n}개. 이 도시 선은 다 끊겨 있는데, 끊긴 자리가 전부 같은 모양이야.', { n }),
        obj: { type: 'collect', item: 'conduit_part', n },
        rw: { gold: 75 + ch * 60, xp: 60 + ch * 55 },
        doneLine: tr('같은 모양이지? 누가 한 번에 다 끊은 거야. 왜 끊었는지가 다음 문제고.')
      };
    },
    (ch, rng) => {
      const t = chPick(CH_MOB, ch);
      const n = rng.int(8, 13);
      return {
        title: tr('뜯어 봐야 안다'),
        desc: tr('{enemy} {n}{mobCw}만 부숴 줘. 멀쩡한 건 못 뜯어. 부서진 걸 봐야 어떻게 만들었는지가 보여.', { enemy: ENEMIES[t].n, n, mobCw: mobCw(t) }),
        obj: { type: 'kill', target: t, n },
        rw: { gold: 80 + ch * 65, xp: 70 + ch * 60 },
        doneLine: tr('안쪽을 봤어. 사람이 만든 게 아니야. …사람을 보고 만든 거야.')
      };
    }
  ]
};

/* ================= 장마다 안전한 표 ================= */
export const CH_MOB = ['slime', 'slime', 'skeleton', 'crawler', 'frostling', 'wraith', 'cloudjelly',
  'ruin_guard', 'wraith', 'scrapcrawler', 'riveter', 'riveter', 'splitter', 'coreling', 'draft_form'];
export const CH_ORE = [T.COPPER, T.COPPER, T.IRON, T.IRON, T.GOLD, T.MYTHRIL, T.CRYSTAL, T.SOULSTONE,
  T.SOULSTONE, T.IRON, T.IRON, T.GOLD, T.MYTHRIL, T.MYTHRIL, T.CRYSTAL];
export const CH_MAT = ['wood', 'copper_ore', 'iron_ore', 'corrupt_ess', 'frost_core', 'soul_shard',
  'aether_shard', 'crystal', 'crystal', 'steel_plate', 'gear_basic', 'steel_plate',
  'core_shard', 'core_shard', 'draft_glass'];
export const chPick = (arr, ch) => arr[clamp(ch || 0, 0, arr.length - 1)];

/* ================= 의뢰 게시판에 붙는 종이 ================= */
export const BOUNTY_POOL = [
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
export const BOUNTY_BY_ID = (() => {
  const m = {};
  for (const b of BOUNTY_POOL) m[b.id] = b;
  return m;
})();
/* 목표 종류마다 "한 건"의 크기가 다르다 — 스물여섯 개를 모으는 것과 열두 마리를 잡는 것이 같은 보상일 수는 없다. */
export const BOUNTY_UNIT = { kill: 10, collect: 22, mine: 18 };
