/* ===== data/start.js — 여명 마을 단계 · 캐릭터 · 난이도 · 조작키 · 알림 갈래 ===== */
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ---------------- 마을 등급 ---------------- */
export const VILLAGE = [
  null,
  {
    n: '되살아난 마을',
    d: '잿빛이 걷히고 사람이 다시 들어왔다. 아직은 살아남은 자리에 가깝다.',
    gain: ['주민 5명 · 여관 · 보관고 · 재련대 · 의뢰 게시판']
  },
  {
    n: '자리 잡은 마을',
    /* ★ 밭을 "갈아 준다"고 쓰지 않는다 — 마을은 자리를 내주고 연장을 건넬 뿐, 가는 것도 심는 것도 플레이어 몫이다(world.js upgradeVillage 2단계 참고) — 사연:
       docs/code-history.md#h7 */
    d: '지붕을 다시 얹고, 울타리를 두르고, 밤에도 길이 보이게 했다.',
    need: { plank: 60, brick: 60, steel_plate: 20, gear_basic: 10 },
    gain: [
      '집을 2층으로 올리고 기와를 얹는다',
      '마을 서쪽에 울타리 친 빈 땅이 생기고, 괭이·낫·씨앗 한 벌을 받는다 (가는 건 네 몫이다)',
      '지붕 위에 풍차가 서고, 밭까지 전주 선로가 깔린다',
      '횃불이 가로등으로, 벽에 창문이 난다',
      '보관고 +12칸 · 여관 숙박비 30% 감소'
    ]
  },
  {
    n: '여명 요새',
    d: '다시는 빼앗기지 않겠다는 뜻으로 벽을 세웠다.',
    /* 값을 조금만 덜었다(성벽돌 120→100 · 강철판 40→32 · 회로 10→8 · 전동기 4→3) — 사연: docs/code-history.md#h8 */
    need: { wallstone: 100, steel_plate: 32, circuit: 8, motor: 3 },
    gain: [
      '마을 양쪽에 성벽과 흉벽이 올라간다',
      '감시탑 두 기에 자동 포탑이 걸린다 (대갈못을 채워 두면 된다)',
      '상주 경비병 두 명이 마을을 지킨다',
      '재료상 도경이 들어온다 — 상주 상인 1명 → 2명',
      '재련 비용 25% 감소 · 상점 환율 +10%',
      '성문과 깃발이 걸린다'
    ]
  },
  {
    n: '여명 교역지',
    d: '벽이 서자 장사꾼이 붙었다. 이제 여기서 살 수 있는 것이 늘어난다.',
    need: { steel_plate: 60, circuit: 24, motor: 10, gold_bar: 20 },
    gain: [
      '장비상 벽산이 들어온다 — 상주 상인 2명 → 3명. 무기·갑옷·장신구를 날마다 다르게 내놓는다',
      '상주 상인 셋의 재고가 한 칸씩 늘고, 4단계에서만 도는 물건이 풀린다',
      '재련대 옆에 강화 모루가 선다 — 장비 수치를 한 단계씩 올린다 (최대 +10)',
      '밭이 양쪽으로 넓어진다 (서쪽은 성벽 안까지, 동쪽은 첫 집 앞까지)',
      '보관고 12칸 추가'
    ]
  }
];

/* ---------------- 시작 캐릭터 ---------------- */
/* 다섯이 각자 제 시트를 쓴다 — char/player_<id>.png (13프레임, 원본 player.png 와 순서가 동일: idle1 idle2 walk1..4 jump fall dash
   atk1..3 */
export const CHARACTERS = [
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
/* 새 게임에서 한 번 고르고 끝이다 — 설정에서 바꿀 수 없다. */
export const MODES = [
  { id: 'normal', n: '일반', mul: 1, death: 'normal', c: '#8fb87a',
    d: '경험치 일부와 금화를 잃습니다. 쓰러진 자리에서 절반을 되찾을 수 있습니다.' },
  { id: 'hard', n: '하드', mul: 2, death: 'drop', c: '#e0a03a',
    d: '몬스터의 체력과 공격력이 2배. 죽으면 가방의 절반까지 그 자리에 떨어집니다.' },
  { id: 'impossible', n: '불가능', mul: 5, death: 'wipe', c: '#d0564c',
    d: '몬스터의 체력과 공격력이 5배. 한 번 죽으면 이 슬롯의 기록이 지워집니다.' }
];
export const MODE_OF = id => MODES.find(m => m.id === id) || MODES[0];
export const CHAR_OF = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];

/* ---------------- 활·총을 든 손 ---------------- */
/* 활은 겨눈 쪽으로 돌려 그리는데, 손 바로 위에 그리면 몸을 파고든다. */
export const BOW_HAND = 18;
export const BOW_TIP = BOW_HAND + 11.4;

/* ---------------- 조작키 ---------------- */
/* 설정에서 바꾼다. */
export const KEY_ACTIONS = [
  { id: 'left', n: '왼쪽', def: ['KeyA', 'ArrowLeft'] },
  { id: 'right', n: '오른쪽', def: ['KeyD', 'ArrowRight'] },
  { id: 'down', n: '내려가기', def: ['KeyS', 'ArrowDown'] },
  { id: 'jump', n: '점프', def: ['Space', 'KeyW', 'ArrowUp'] },
  { id: 'dash', n: '대시', def: ['ShiftLeft', 'ShiftRight'] },
  { id: 'skill1', n: '스킬 1', def: ['KeyQ'] },
  { id: 'skill2', n: '스킬 2', def: ['KeyE'] },
  { id: 'skill3', n: '스킬 3', def: ['KeyR'] },
  { id: 'skill4', n: '스킬 4', def: ['KeyF'] },
  { id: 'rotate', n: '기계 방향', def: ['KeyT'] },
  { id: 'inv', n: '가방', def: ['KeyI'] },
  { id: 'skills', n: '능력', def: ['KeyK'] },
  { id: 'quest', n: '일지', def: ['KeyJ'] },
  { id: 'craft', n: '제작', def: ['KeyH'] },
  { id: 'map', n: '지도', def: ['KeyM'] },
  { id: 'save', n: '저장', def: ['F5'] }
];

/* ---------------- 알림 갈래 ---------------- */
/* toast 두 번째 인자에 넘기는 갈래. */
export const NOTICE_KINDS = [
  { id: 'good', n: '획득 · 성공', def: 1 },
  { id: 'info', n: '안내 · 발견', def: 1 },
  { id: 'quest', n: '목표 진행', def: 1 },
  { id: 'craft', n: '제작 · 설치', def: 1 }
];
