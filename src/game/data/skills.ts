/* ===== data/skills.js — 보스 · 스킬 · 특성 갈래 · 숙련 · 버프 ===== */
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ================= 보스가 무너지는 방식 ================= */
export const BOSS_DIE = {
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

/* ---------------- 보스 등급 ---------------- */
export const BOSS_TIER = {
  mine_horror: 'mini', ice_warden: 'mini', vine_lord: 'mini',
  sand_guardian: 'mini', spore_queen: 'mini', blight_maw: 'mini',
  drowned_keeper: 'mini', isle_keeper: 'mini',

  /* ★ 조수의 파수꾼은 **세션 3 의 종장**이다(17장의 마지막 목표). */
  pursuer: 'grand', hepha: 'grand', archetype: 'grand',
  restorer: 'grand', shaft_maw: 'grand', tide_warden: 'grand'
};

/* ---------------- 보스의 힘 축적 ---------------- */
export const BOSS_SURGE = {
  bone_lord:   { k: 'ward', t: 1.5, cd: 15, dur: 7, v: 60,  brk: .060, c: '#ded6bd', s: 'sk_guard', n: '뼈를 그러모은다', m: '뼈 갑옷' },
  frost_witch: { k: 'nova', t: 1.4, cd: 13,         v: 16,  brk: .050, c: '#a8dcf0', pj: 'frost', s: 'sk_frost', n: '서리를 모은다' },
  void_king:   { k: 'nova', t: 1.6, cd: 14,         v: 20,  brk: .050, c: '#a06fff', pj: 'void',  s: 'sk_bolt',  n: '공허를 삼킨다' },
  blight_maw:  { k: 'nova', t: 1.3, cd: 12,         v: 12,  brk: .070, c: '#9a5fd8', pj: 'dark',  s: 'sk_quake', n: '썩은 숨을 모은다' },
  hepha:       { k: 'rage', t: 1.8, cd: 20, dur: 9, v: .35, brk: .040, c: '#ff9a4a', s: 'sk_fire',  n: '화로를 올린다', m: '달아오름' },
  restorer:    { k: 'mend', t: 2.0, cd: 22,         v: .03, brk: .035, c: '#a8c8e8', s: 'sk_heal',  n: '되돌리려 한다' }
};
/* 뜨는 보스 — 모으는 동안에도 원래대로 떠 있어야 한다. */
export const SURGE_FLY = { b_bone: 1, b_heart: 1, b_witch: 1, b_void: 1, b_storm: 1, b_pursuer: 1, b_restorer: 1 };

/* ---------------- 스킬 / 특성 ---------------- */
export const SKILLS: Record<string, SkillDef> = {
  /* ===== 검투사 — 붙어서 버티고 밀어붙인다 ===== */
  s_cleave:   { n: '광폭 베기', i: '🌀', br: 'blade', tier: 0, col: 0.5, max: 3, type: 'active', mana: 12, cd: 6,
                d: '주변을 원형으로 베어 무기 피해의 %d%%를 준다.', v: r => 130 + r * 45 },
  s_toughen:  { n: '단련된 몸', i: '🛡', br: 'blade', tier: 0, col: 1.5, max: 4, type: 'passive',
                d: '최대 체력 +%d, 방어 +%d.', b: r => ({ hp: r * 22, def: r * 3 }) },

  s_charge:   { n: '돌진 강타', i: '💥', br: 'blade', tier: 1, col: 0, max: 3, type: 'active', mana: 18, cd: 9,
                req: ['s_cleave', 's_dash'],          // ↔ 유격: 돌진은 발놀림에서 나온다
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
                req: ['s_charge', 's_bloodlust', 's_nova'],   // ↔ 비전: 둘 다 주변을 쓸고 둔화시킨다
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
                req: ['s_dash', 's_cleave'],          // ↔ 검투사: 부채꼴로 흩뿌리는 것은 휘두르는 것과 같은 결
                d: '부채꼴로 %d발을 발사한다. 발당 무기 피해의 70%%.', v: r => 4 + r * 2 },
  s_swift:    { n: '질풍 보행', i: '🍃', br: 'ranger', tier: 1, col: 1, max: 3, type: 'passive',
                req: ['s_dash', 's_eagle'],
                d: '이동 속도 +%d%%, 공격 속도 +%d%%.', b: r => ({ ms: r * 6, spdP: r * 0.05 }) },
  s_pierce:   { n: '꿰뚫는 화살', i: '➶', br: 'ranger', tier: 1, col: 2, max: 3, type: 'active', mana: 16, cd: 7,
                req: ['s_eagle', 's_fireball'],       // ↔ 비전: 한 점을 겨눠 쏘는 것끼리
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
                req: ['s_wisdom', 's_toughen'],       // ↔ 검투사: 몸을 두르는 것끼리
                d: '피해를 %d까지 막아 내는 방벽을 두른다(지능 비례). 20초간.', v: r => 60 + r * 70 },

  s_wolf:     { n: '영혼 늑대 소환', i: '🐺', br: 'arcane', tier: 2, col: 0, max: 3, type: 'active', mana: 45, cd: 30,
                req: ['s_nova'],
                d: '30초간 싸우는 늑대 %d마리를 부른다.', v: r => r },
  s_chain:    { n: '사슬 번개', i: '⚡', br: 'arcane', tier: 2, col: 1, max: 3, type: 'active', mana: 30, cd: 11,
                req: ['s_nova', 's_heal', 's_pierce'],       // ↔ 유격: 관통이 튀는 번개가 된다
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

export const BRANCHES = [
  { id: 'blade', n: '검투사', tag: '근접 · 생존 · 압박', c: '#c8433c',
    nodes: ['s_cleave', 's_toughen', 's_charge', 's_bloodlust', 's_guard', 's_whirl', 's_quake', 's_warcry', 's_titan', 's_undying'] },
  { id: 'ranger', n: '유격', tag: '원거리 · 기동 · 치명타', c: '#5fc45f',
    nodes: ['s_dash', 's_eagle', 's_volley', 's_swift', 's_pierce', 's_rain', 's_smoke', 's_mark', 's_hunter', 's_tempest'] },
  { id: 'arcane', n: '비전', tag: '마법 · 제어 · 소환', c: '#4f9cf0',
    nodes: ['s_fireball', 's_wisdom', 's_nova', 's_heal', 's_barrier', 's_wolf', 's_chain', 's_blink', 's_arch', 's_meteor'] }
];

/* 특성 티어 해금에 필요한 해당 분기 누적 포인트 */
export const TIER_REQ = [0, 2, 5, 8];

/* ---------------- 생활 숙련 ---------------- */
export const PROF_MAX = 10;
export const PROFS = {
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

/** 숙련 lv -> 다음 레벨까지 필요한 경험치. */
export function profNeed(lv) { return Math.round(5 * Math.pow(lv, 1.45)); }

/* 장의 결전이 되는 보스들. */
/* 장의 목표로 걸린 보스들. */
export const STORY_BOSSES = {
  king_slime: 1, bone_lord: 1, corrupt_heart: 1, frost_witch: 1, void_king: 1,
  storm_warden: 1, first_keeper: 1, pursuer: 1,
  overseer: 1, proliferator: 1, hepha: 1, archetype: 1,
  tide_warden: 1
};

/* ---------------- 보스 페이즈 대사 ---------------- */
/* 페이즈가 넘어갈 때 뜨는 한 줄. */
export const BOSS_LINES = {
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
export const BUFFS: Record<string, BuffDef> = {
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
  /* 여명 마을 분수대에 금화를 던지면 붙는다. */
  wish: { n: '분수의 축복', i: '🪙', dur: 420, b: { allStat: 3, crit: 5 } },
  rested: { n: '잘 쉼', i: '🛏', dur: 600, b: { allStat: 4, hpreg: 1.5, mpreg: 20 } },
  /* 유적의 신비한 방에서만 붙는다. */
  starlit: { n: '별빛', i: '✨', dur: 480, b: { allStat: 6, crit: 8, ms: 10 } },
  echoed: { n: '메아리', i: '🌀', dur: 480, b: { cdr: 14, mpreg: 24, int: 6 } },
  weighed: { n: '저울에 오름', i: '⚖', dur: 480, b: { dmgP: 0.22, def: 14 } },
  /* 하늘 섬 바람의 사당 — 공중에서 한 번 더 뛴다(jump 는 장비 합산과 같은 자리로 더해진다). */
  windborne: { n: '바람을 탐', i: '🌬', dur: 480, b: { jump: 1, ms: 10 } },
  /* 유적 인장이 맥박 단계에 따라 켜 두는 것. */
  pulse_ward: { n: '얼음 살갗', i: '❄', dur: 2, b: { def: 18, dr: 6 } },
  pulse_fury: { n: '격노의 맥', i: '🩸', dur: 2, b: { dmgP: 0.20 } },
  /* 음식 버프 — 앞에 fed_ 가 붙은 것은 한 번에 하나만 유지된다. */
  fed_bread: { n: '갓 구운 빵', i: '🍞', dur: 300, b: { hpreg: 1.8, vit: 4 } },
  fed_pie: { n: '고기 파이', i: '🥧', dur: 300, b: { str: 7, dmgP: 0.10 } },
  fed_stew: { n: '버섯 스튜', i: '🍲', dur: 300, b: { mpreg: 40, int: 6 } },
  fed_soup: { n: '별무 수프', i: '🥣', dur: 300, b: { def: 16, hp: 45 } },
  /* 코코넛 — 섬에서만 난다. */
  fed_coconut: { n: '코코넛', i: '🥥', dur: 300, b: { oxyMax: 4, ms: 12 } },
  fed_tea: { n: '들꽃차', i: '🍵', dur: 300, b: { cdr: 10, mp: 35 } },
  fed_jelly: { n: '선인장 젤리', i: '🍮', dur: 300, b: { ms: 16, dex: 6 } },
  fed_feast: { n: '잔칫상', i: '🍱', dur: 600, b: { allStat: 8, hpreg: 2, mpreg: 25, def: 10 } },
  fed_curry: { n: '정글 카레', i: '🍛', dur: 300, b: { str: 6, def: 8, hpreg: 1.2 } },
  lit: { n: '발광', i: '🔦', dur: 480, b: {} },
  lit_greater: { n: '상급 발광', i: '🔦', dur: 900, b: {} },
  /* 물에서만 나오는 것 둘이 주는 버프. */
  lantern: { n: '등불', i: '🏮', dur: 420, b: { vit: 5, hpreg: 1.2 } },
  coolant: { n: '냉각', i: '🧴', dur: 360, b: { cdr: 12, ms: 10, mpreg: 20 } }
};
