/* ===== data/pets.js — 펫 · 레벨 배율 · 알 ===== */
import { ITEMS } from './items.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ---------------- 펫 ---------------- */
export const PETS: Record<string, PetDef> = {
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
  frost_kit:      { n: '서릿결 여우', i: '🦊', r: 1, c: '#a8dcf0', b: { def: 20, crit: 4 },
    atk: { k: 'proj', proj: 'frost', dmg: 100, cd: 1.4, range: 280, spd: 400 },
    d: '발자국마다 서리가 얼어붙는다.' },
  ash_owl:        { n: '잿빛 부엉이', i: '🦉', r: 1, c: '#8a8274', b: { hpreg: 3.2 },
    atk: { k: 'proj', proj: 'wind', dmg: 94, cd: 1.35, range: 300, spd: 420 },
    d: '밤에도 잿빛 속을 또렷이 본다.' },
  cinder_toad:    { n: '잉걸 두꺼비', i: '🐸', r: 1, c: '#c85a3a', b: { hp: 140 },
    atk: { k: 'proj', proj: 'fire', dmg: 150, cd: 2.0, range: 240, spd: 300 },
    d: '숨을 고를 때마다 목이 붉게 부푼다.' },
  thorn_wisp:     { n: '가시 도깨비불', i: '🌿', r: 1, c: '#6fbf5a', b: { dmgP: 0.06 },
    atk: { k: 'melee', dmg: 118, cd: 1.4, range: 56 },
    d: '스칠 때마다 잔가시가 남는다.' },
  /* --- 영웅 --- */
  star_sprite:    { n: '별조각 정령', i: '✨', r: 2, c: '#ffe08a', b: { lifesteal: 6, critD: 28 },
    atk: { k: 'proj', proj: 'star', dmg: 165, cd: 1.25, range: 320, spd: 440 },
    d: '오른손의 별빛에 이끌려 왔다.' },
  ember_drake:    { n: '잿불 새끼용', i: '🐉', r: 2, c: '#e0603c', b: { dmgP: 0.13 },
    atk: { k: 'proj', proj: 'fire', dmg: 190, cd: 1.35, range: 300, spd: 420 },
    d: '아직 날지 못하지만 성질은 급하다.' },
  void_hatchling: { n: '공허의 유생', i: '🌑', r: 2, c: '#a06fff', b: { dmgP: 0.06, critD: 22 },
    atk: { k: 'proj', proj: 'void', dmg: 178, cd: 1.4, range: 330, spd: 380 },
    d: '들여다보면 이쪽이 먼저 눈을 피하게 된다.' },
  storm_falcon:   { n: '뇌운 매', i: '🦅', r: 2, c: '#bcd8f0', b: { ms: 11, crit: 9 },
    atk: { k: 'proj', proj: 'bolt', dmg: 140, cd: 1.05, range: 340, spd: 560 },
    d: '내려꽂힐 때 소리가 한 박자 늦게 온다.' },
  /* --- 드래곤 — 윤슬의 알에서 나온다. 레벨 30까지 자라며 10·20·30 에서 그 단계 먹이를 먹어야 진화한다(DRAGON_*).
     ★ 1레벨 초당 피해 ≈ 100(희귀 70 · 영웅 135 사이) → 20레벨에 영웅 10레벨과 같고 30레벨에 그 1.3배. 패시브도 30레벨에 영웅 끝의 1.3배. --- */
  dragon_fire:  { n: '불의 드래곤', i: '🐉', r: 2, c: '#e0603c', dragon: 'fire', b: { dmgP: 0.08 },
    atk: { k: 'proj', proj: 'fire', dmg: 150, cd: 1.5, range: 300, spd: 420 },
    d: '알 껍데기를 스스로 녹이고 나왔다. 자랄수록 숨결이 길어진다.' },
  dragon_earth: { n: '흙의 드래곤', i: '🐉', r: 2, c: '#9a8a5a', dragon: 'earth', b: { def: 18, hp: 90 },
    atk: { k: 'proj', proj: 'rune', dmg: 170, cd: 1.7, range: 260, spd: 360 },
    d: '등의 비늘이 바위처럼 겹친다. 서두르는 법이 없다.' },
  dragon_storm: { n: '전기의 드래곤', i: '🐉', r: 2, c: '#6cb4e4', dragon: 'storm', b: { ms: 7, crit: 5.5 },
    atk: { k: 'proj', proj: 'bolt', dmg: 120, cd: 1.2, range: 330, spd: 560 },
    d: '날개를 털 때마다 날개 끝에서 불똥이 튄다.' },
  dragon_dark:  { n: '암흑의 드래곤', i: '🐉', r: 2, c: '#7e5ea6', dragon: 'dark', b: { lifesteal: 3.6, critD: 17 },
    atk: { k: 'proj', proj: 'void', dmg: 145, cd: 1.45, range: 320, spd: 400 },
    d: '그림자 속에 있어도 눈만은 또렷이 빛난다.' }
};
/* 펫 피해 배율 — 위 기준 피해는 "펫을 처음 손에 넣는 레벨 44 언저리(세션 2 초입)"에서의 값이다. 레벨 75(세션 3 끝)에 2배. */
/* 레벨 배수 — 세계의 기본 규칙(몹은 레벨을 안 탄다)에서 **일부러 뺀 것들**만 쓴다 — 사연: docs/code-history.md#h19 */
export const LV_SCALE_BASE = 2.5;
export function levelMult(level, pow) { return Math.pow(LV_SCALE_BASE, Math.max(0, level) / 50 * (pow || 1)); }
export function bloodMult(level) { return levelMult(level, 1); }

export function petDmgScale(level) { return Math.max(0.45, level * 0.0323 - 0.42); }

/* ---------------- 펫 레벨 ---------------- */
export const PET_LV_MAX = 10;
export function petLvMul(lv) { return 1 + 0.12 * ((lv || 1) - 1); }   // 패시브 b 배수
export function petAtkMul(lv) { return 1 + 0.06 * ((lv || 1) - 1); }  // 자동 공격 배수
export function petXpNext(lv, id?) {
  if (id && PETS[id] && PETS[id].dragon) return Math.round(320 * Math.pow(1.1, (lv || 1) - 1));   // 드래곤은 30까지 — 완만하게(합 4.7만 ≈ 세션 3 처치 900마리)
  return Math.round(150 * Math.pow(1.5, (lv || 1) - 1));   // 10레벨까지 합 1.1만 ≈ 세션 2 처치 330마리
}

/* ---------------- 드래곤 ---------------- */
export const DRAGON_LV_MAX = 30;
export const DRAGON_GATES = [10, 20, 30];                   // 이 레벨로 오르려면 그 단계 먹이를 먹어야 한다
export const DRAGON_FOOD = ['dragon_treat_1', 'dragon_treat_2', 'dragon_treat_3'];
export const DRAGON_STAGE_N = ['새끼', '어린 용', '성룡', '고룡'];
export const dragonStage = lv => (lv || 1) >= 30 ? 3 : (lv || 1) >= 20 ? 2 : (lv || 1) >= 10 ? 1 : 0;
export const petMaxLv = id => (PETS[id] && PETS[id].dragon) ? DRAGON_LV_MAX : PET_LV_MAX;
/* 처치 경험치의 이 비율만큼 낀 펫에게 들어간다. */
export const PET_XP_SHARE = 0.08;
/* 펫 아이템 — PETS를 단일 출처로 삼아 ITEMS 항목을 자동으로 만든다. */
for (const id in PETS) {
  const pt = PETS[id];
  ITEMS['pet_' + id] = {
    n: pt.n, i: pt.i, type: 'pet', pet: id, b: pt.b, stack: 1,
    // 최소 레벨 — 공통·희귀·영웅은 세션 2(마을에 닿는 레벨 40 → 11장 끝 50), 드래곤은 세션 3(15장 도중 — 레벨 60~65)
    lvReq: pt.dragon ? 62 : [40, 44, 48][pt.r], price: pt.dragon ? 200000 : [9000, 34000, 95000][pt.r], d: pt.d
  };
}
/* 등급별 알 뽑기 확률 [펫 키, 가중치] — 공통(0)·희귀(1)·영웅(2) */
export const EGG_POOL = {
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
