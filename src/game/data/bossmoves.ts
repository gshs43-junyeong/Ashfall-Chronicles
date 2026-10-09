/* ===== data/bossmoves.ts — 보스마다의 고유 기술 · 마지막 마디 필살기 ===== */
/* 몸놀림(entity/boss-ai)은 같은 갈래끼리 비슷해도, 기술은 보스마다 하나뿐인 것으로 — 이름 · 빛깔 · 조합 · 박자가 다르다.
   k 는 기술 틀(entity/boss-moves) — leap 뛰어 내려찍기 · rain 떨어지는 것 · march 다가오는 기둥 · beam 광선 · ring 틈 있는 탄 고리 ·
   spiral 나선 · dash 겨눈 돌진 · blink 등 뒤로 · vortex 끌어당김 · zone 남는 바닥 · wall 틈 있는 벽 · summon 부름 · push 바람 ·
   burrow 땅속 기습 · rewind 되감기 · clones 분신 · quake 천장 무너짐 · homing 쫓는 탄.
   tele 는 예고(초) — ★ 예고 없는 기술은 만들지 말 것: 피할 길이 보여야 공략이 된다. m 은 보스 공격력에 곱하는 몫.
   참고한 결(주석): 슬라임 왕 내려찍기(Terraria), 다가오는 기둥(Hollow Knight), 틈 있는 탄막(Touhou), 겨눈 돌진(Eye of Cthulhu),
   광선 쓸기(Moon Lord · Skeletron Prime), 땅속 기습(Dune Splicer), 되감기(Ekko · Braid) */

export const BOSS_MOVES: Record<string, Bag> = {
  /* ---------------- 세션 1 ---------------- */
  king_slime: { c: '#6fa8ff', every: 7.5, moves: [
    { k: 'leap', n: '왕관 내려찍기', tele: 0.7, waves: 1, wspd: 360, m: 1.1 },
    { k: 'zone', n: '끈적이는 비', tele: 0.6, at: 'scatter', n2: 5, r: 46, life: 6, dps: 0.12, slow: 0.45, fx: 'gel' },
    { k: 'summon', n: '신하들을 부른다', tele: 0.8, mob: 'slime', cnt: 4 }],
    ult: { k: 'leap', n: '왕의 무게', tele: 0.9, times: 3, waves: 1, wspd: 420, m: 1.2 } },
  bone_lord: { c: '#ede4c8', every: 7, moves: [
    { k: 'dash', n: '뼈 회전', tele: 0.55, times: 3, spd: 3.4, m: 1 },
    { k: 'homing', n: '울부짖는 해골', tele: 0.6, cnt: 4, spd: 210, turn: 2.2, proj: 'bone', m: 0.7 },
    { k: 'rain', n: '뼈 감옥', tele: 0.7, form: 'cage', cnt: 9, gapX: 46, delay: 0.9, shape: 'col', fx: 'bone', m: 0.9 }],
    ult: { k: 'spiral', n: '뼈 폭풍', tele: 1, arms: 4, dur: 4, every: 0.12, spd: 300, proj: 'bone', turn: 2.4, m: 0.5 } },
  corrupt_heart: { c: '#b07aff', every: 6.5, moves: [
    { k: 'ring', n: '고동 파문', tele: 0.6, times: 3, cnt: 22, gap: 4, spd: 230, every: 0.55, proj: 'dark', m: 0.6 },
    { k: 'march', n: '혈관 가시', tele: 0.6, cnt: 7, gap: 54, every: 0.13, h: 90, fx: 'flesh', m: 0.9 },
    { k: 'vortex', n: '흡혈 소용돌이', tele: 0.7, life: 2.6, r: 300, pull: 260, burst: 120, m: 1 }],
    ult: { k: 'ring', n: '터지는 심장', tele: 1, times: 5, cnt: 28, gap: 5, spd: 260, every: 0.42, proj: 'dark', zones: 1, m: 0.6 } },
  frost_witch: { c: '#a8e4ff', every: 6.5, moves: [
    { k: 'clones', n: '거울 분신', tele: 0.8, cnt: 2, ring: 12, proj: 'frost', m: 0.55 },
    { k: 'rain', n: '얼음 창 비', tele: 0.6, form: 'scatter', cnt: 7, spread: 360, delay: 0.85, shape: 'col', fx: 'ice', m: 0.9 },
    { k: 'zone', n: '서리 바닥', tele: 0.5, at: 'player', n2: 3, r: 70, life: 7, dps: 0.06, slow: 0.55, fx: 'frost' }],
    ult: { k: 'beam', n: '절대 영도', tele: 1.2, cnt: 2, spread: 3.14, dur: 3, w: 26, len: 760, sweep: 1.4, m: 0.35 } },
  void_king: { c: '#a06fff', every: 6, moves: [
    { k: 'vortex', n: '사건의 지평선', tele: 0.8, life: 3, r: 380, pull: 320, burst: 150, m: 1.1 },
    { k: 'beam', n: '공허 광선', tele: 0.9, cnt: 1, dur: 2.2, w: 30, len: 900, sweep: 2.2, m: 0.35 },
    { k: 'blink', n: '틈새 도약', tele: 0.3, times: 3, r: 90, m: 1 }],
    ult: { k: 'spiral', n: '왕의 붕괴', tele: 1.2, arms: 6, dur: 5, every: 0.1, spd: 280, proj: 'void', turn: -1.8, m: 0.4 } },
  storm_warden: { c: '#cfe6ff', every: 6, moves: [
    { k: 'march', n: '낙뢰 기둥', tele: 0.5, cnt: 8, gap: 64, every: 0.11, h: 420, from: 'sky', fx: 'bolt', m: 0.9 },
    { k: 'push', n: '폭풍 밀어내기', tele: 0.6, life: 3.2, force: 520, m: 0 },
    { k: 'dash', n: '급강하', tele: 0.5, times: 3, spd: 3.8, m: 1 }],
    ult: { k: 'wall', n: '천둥 벽', tele: 1, times: 3, spd: 300, gap: 110, every: 1.4, fx: 'bolt', m: 0.8 } },
  first_keeper: { c: '#e8d8a0', every: 6.5, moves: [
    { k: 'march', n: '룬 기둥', tele: 0.6, cnt: 8, gap: 58, every: 0.14, h: 120, both: 1, fx: 'rune', m: 0.9 },
    { k: 'beam', n: '파수 광선', tele: 0.8, cnt: 3, spread: 0.5, dur: 1.2, w: 22, len: 820, sweep: 0, m: 0.45 },
    { k: 'rain', n: '봉인 지뢰', tele: 0.5, form: 'scatter', cnt: 6, spread: 420, delay: 2.2, r: 52, shape: 'circle', fx: 'rune', m: 1 }],
    ult: { k: 'ring', n: '최초의 판결', tele: 1.2, times: 4, cnt: 26, gap: 4, spd: 260, every: 0.5, proj: 'rune', march: 1, m: 0.6 } },
  pursuer: { c: '#b48aff', every: 5.5, moves: [
    { k: 'rain', n: '별똥 추격', tele: 0.6, form: 'trail', cnt: 8, every: 0.22, delay: 0.75, r: 48, shape: 'circle', fx: 'meteor', m: 1 },
    { k: 'dash', n: '그림자 질주', tele: 0.4, times: 4, spd: 3.6, m: 1 },
    { k: 'vortex', n: '중력 우물', tele: 0.8, life: 3.2, r: 420, pull: 340, burst: 170, m: 1.1 }],
    ult: { k: 'spiral', n: '종말의 별', tele: 1.4, arms: 5, dur: 5.5, every: 0.09, spd: 300, proj: 'void', turn: 2, rain: 1, m: 0.4 } },

  /* ---------------- 유적의 주인 ---------------- */
  mine_horror: { c: '#c8a878', every: 7, moves: [
    { k: 'quake', n: '갱도 붕괴', tele: 0.7, cnt: 7, spread: 380, delay: 0.95, fx: 'rock', m: 0.9 },
    { k: 'burrow', n: '땅굴 기습', tele: 0.5, under: 1.4, r: 70, m: 1.2 },
    { k: 'summon', n: '광부 망령을 깨운다', tele: 0.8, mob: 'minerghost', cnt: 2 }],
    ult: { k: 'quake', n: '붕락', tele: 1, cnt: 14, spread: 520, delay: 1.1, fx: 'rock', m: 1 } },
  ice_warden: { c: '#9fe0ff', every: 7, moves: [
    { k: 'wall', n: '빙벽 밀기', tele: 0.8, times: 1, spd: 240, gap: 120, fx: 'ice', m: 0.9 },
    { k: 'ring', n: '서리 고리', tele: 0.6, times: 2, cnt: 18, gap: 3, spd: 220, every: 0.7, proj: 'frost', m: 0.6 },
    { k: 'rain', n: '얼음 감옥', tele: 0.7, form: 'cage', cnt: 7, gapX: 50, delay: 1, shape: 'col', fx: 'ice', m: 0.9 }],
    ult: { k: 'zone', n: '빙하기', tele: 1, at: 'scatter', n2: 7, r: 70, life: 8, dps: 0.07, slow: 0.6, fx: 'frost', wall: 1 } },
  vine_lord: { c: '#7fd06a', every: 6.5, moves: [
    { k: 'march', n: '뿌리 분출', tele: 0.5, cnt: 6, gap: 60, every: 0.18, h: 110, from: 'under', fx: 'plant', m: 1 },
    { k: 'beam', n: '가시 채찍', tele: 0.55, cnt: 1, dur: 0.6, w: 22, len: 300, sweep: 2.6, m: 0.6 },
    { k: 'rain', n: '씨앗 폭탄', tele: 0.6, form: 'scatter', cnt: 5, spread: 340, delay: 1, r: 54, shape: 'circle', fx: 'seed', zone: { r: 50, life: 4, dps: 0.08, slow: 0.25 }, m: 0.8 }],
    ult: { k: 'march', n: '숲의 분노', tele: 1, cnt: 9, gap: 60, every: 0.12, h: 130, both: 1, fx: 'plant', homing: 4, m: 1 } },
  sand_guardian: { c: '#f0c870', every: 6.5, moves: [
    { k: 'wall', n: '모래 폭풍', tele: 0.8, times: 2, spd: 260, gap: 120, every: 1.6, fx: 'sand', m: 0.8 },
    { k: 'march', n: '태양 광선', tele: 0.6, cnt: 6, gap: 80, every: 0.2, h: 460, from: 'sky', fx: 'sun', m: 1 },
    { k: 'vortex', n: '유사 늪', tele: 0.6, life: 2.8, r: 260, pull: 220, floor: 1, burst: 0, m: 0 }],
    ult: { k: 'ring', n: '피라미드의 저주', tele: 1.1, times: 3, cnt: 24, gap: 4, spd: 240, every: 0.6, proj: 'fire', wall: 1, m: 0.6 } },
  spore_queen: { c: '#8ff0c8', every: 6.5, moves: [
    { k: 'zone', n: '포자 구름', tele: 0.6, at: 'scatter', n2: 4, r: 64, life: 6, dps: 0.12, fx: 'spore', poison: 1 },
    { k: 'rain', n: '꽃 터뜨리기', tele: 0.6, form: 'scatter', cnt: 5, spread: 320, delay: 1.1, r: 40, shape: 'circle', fx: 'spore', burstRing: 8, m: 0.7 },
    { k: 'summon', n: '여왕의 부름', tele: 0.8, mob: 'sporeling', cnt: 3 }],
    ult: { k: 'spiral', n: '포자 폭풍', tele: 1.1, arms: 3, dur: 4.5, every: 0.1, spd: 220, proj: 'poison', turn: 1.6, m: 0.45 } },
  blight_maw: { c: '#c07aff', every: 6, moves: [
    { k: 'vortex', n: '집어삼키기', tele: 0.7, life: 2, r: 300, pull: 380, burst: 110, then: 'dash', m: 1.2 },
    { k: 'rain', n: '담즙 비', tele: 0.6, form: 'scatter', cnt: 6, spread: 360, delay: 0.9, r: 46, shape: 'circle', fx: 'bile', zone: { r: 46, life: 5, dps: 0.1 }, m: 0.8 },
    { k: 'dash', n: '이빨 갈기', tele: 0.35, times: 2, spd: 4, m: 1.1 }],
    ult: { k: 'ring', n: '둥지 개화', tele: 1, times: 4, cnt: 24, gap: 4, spd: 250, every: 0.5, proj: 'dark', summon: 'sacling', m: 0.6 } },
  drowned_keeper: { c: '#7fc8e8', every: 7, moves: [
    { k: 'wall', n: '역류', tele: 0.8, times: 1, spd: 300, gap: 110, fx: 'water', m: 0.9 },
    { k: 'homing', n: '거품 감옥', tele: 0.6, cnt: 5, spd: 150, turn: 1.6, proj: 'frost', slowHit: 1, m: 0.5 },
    { k: 'leap', n: '닻 내려찍기', tele: 0.7, waves: 1, wspd: 330, m: 1.1 }],
    ult: { k: 'vortex', n: '심연의 물결', tele: 1, life: 3, r: 360, pull: 300, burst: 160, waves: 1, m: 1.1 } },
  isle_keeper: { c: '#8fc8b8', every: 7, moves: [
    { k: 'rain', n: '바위 던지기', tele: 0.7, form: 'scatter', cnt: 4, spread: 360, delay: 1.2, r: 64, shape: 'circle', fx: 'rock', m: 1.2 },
    { k: 'quake', n: '섬 뒤흔들기', tele: 0.6, cnt: 8, spread: 420, delay: 0.9, fx: 'rock', m: 0.8 },
    { k: 'leap', n: '해일 내려찍기', tele: 0.8, waves: 2, wspd: 300, m: 1.1 }],
    ult: { k: 'rain', n: '섬의 무게', tele: 1.2, form: 'trail', cnt: 10, every: 0.2, delay: 0.9, r: 70, shape: 'circle', fx: 'rock', m: 1.1 } },
  tide_warden: { c: '#5fb0e8', every: 5.5, moves: [
    { k: 'vortex', n: '소용돌이', tele: 0.8, life: 3, r: 420, pull: 360, burst: 160, m: 1 },
    { k: 'wall', n: '해일', tele: 0.9, times: 2, spd: 320, gap: 120, every: 1.2, fx: 'water', m: 0.9 },
    { k: 'beam', n: '심해 광선', tele: 1, cnt: 2, spread: 0.6, dur: 2.4, w: 30, len: 900, sweep: 1.2, m: 0.35 }],
    ult: { k: 'spiral', n: '물이 지운 것', tele: 1.3, arms: 4, dur: 5, every: 0.1, spd: 290, proj: 'frost', turn: 1.4, wall: 1, m: 0.4 } },

  /* ---------------- 세션 2 ---------------- */
  proliferator: { c: '#d8c8a8', every: 6, moves: [
    { k: 'ring', n: '리벳 난사', tele: 0.5, times: 4, cnt: 16, gap: 2, spd: 320, every: 0.35, rot: 0.4, proj: 'bolt', m: 0.5 },
    { k: 'summon', n: '증식 폭발', tele: 0.8, mob: 'splitter', cnt: 2, ring: 18 },
    { k: 'march', n: '압착 행진', tele: 0.6, cnt: 7, gap: 56, every: 0.15, h: 100, fx: 'metal', m: 0.9 }],
    ult: { k: 'spiral', n: '과증식', tele: 1, arms: 6, dur: 4, every: 0.11, spd: 300, proj: 'bolt', turn: -2.2, m: 0.4 } },
  hepha: { c: '#ffb050', every: 6, moves: [
    { k: 'march', n: '화로 분출', tele: 0.6, cnt: 8, gap: 60, every: 0.12, h: 160, both: 1, fx: 'fire', m: 1 },
    { k: 'rain', n: '용융 비', tele: 0.6, form: 'scatter', cnt: 8, spread: 440, delay: 0.9, r: 44, shape: 'circle', fx: 'fire', zone: { r: 44, life: 4, dps: 0.12, burn: 1 }, m: 0.8 },
    { k: 'push', n: '역회전 컨베이어', tele: 0.6, life: 3, force: -480, m: 0 }],
    ult: { k: 'beam', n: '최초의 불', tele: 1.3, cnt: 3, spread: 2.09, dur: 3.4, w: 34, len: 900, sweep: 1.6, m: 0.35 } },
  overseer: { c: '#d0d0e0', every: 6, moves: [
    { k: 'beam', n: '레이저 격자', tele: 0.9, cnt: 3, from: 'grid', dur: 1.6, w: 18, len: 700, sweep: 0, m: 0.45 },
    { k: 'march', n: '압착기 행렬', tele: 0.6, cnt: 8, gap: 58, every: 0.16, h: 140, from: 'sky', fx: 'metal', m: 1 },
    { k: 'summon', n: '보수 요청', tele: 0.8, mob: 'riveter', cnt: 2 }],
    ult: { k: 'wall', n: '전면 가동', tele: 1, times: 3, spd: 280, gap: 110, every: 1.3, fx: 'metal', march: 1, m: 0.8 } },
  archetype: { c: '#f4ead0', every: 5.5, moves: [
    { k: 'blink', n: '완벽한 연격', tele: 0.25, times: 4, r: 96, m: 1 },
    { k: 'beam', n: '설계선', tele: 0.9, cnt: 2, from: 'cross', dur: 1.8, w: 20, len: 900, sweep: 0.6, m: 0.4 },
    { k: 'summon', n: '형상 주조', tele: 0.8, mob: 'draft_form', cnt: 2 }],
    ult: { k: 'spiral', n: '원형의 증명', tele: 1.2, arms: 8, dur: 4.5, every: 0.12, spd: 280, proj: 'rune', turn: 1.2, blink: 1, m: 0.38 } },
  restorer: { c: '#bcd8f4', every: 5.5, moves: [
    { k: 'rewind', n: '되감기', tele: 0.5, back: 3, heal: 0.025 },
    { k: 'beam', n: '궤도 광선', tele: 1, cnt: 2, spread: 3.14, dur: 3, w: 30, len: 960, sweep: 2.4, m: 0.35 },
    { k: 'ring', n: '해체 파동', tele: 0.6, times: 3, cnt: 30, gap: 5, spd: 280, every: 0.5, proj: 'star', m: 0.55 }],
    ult: { k: 'vortex', n: '원점 회귀', tele: 1.2, life: 3.4, r: 460, pull: 380, burst: 190, rewind: 1, m: 1.1 } },
  shaft_maw: { c: '#a89878', every: 6, moves: [
    { k: 'quake', n: '갱 메우기', tele: 0.8, cnt: 12, spread: 520, delay: 1, fx: 'rock', m: 1 },
    { k: 'vortex', n: '삼키는 구멍', tele: 0.7, life: 2.8, r: 400, pull: 360, burst: 170, m: 1.1 },
    { k: 'burrow', n: '굴착', tele: 0.5, under: 1.5, r: 110, m: 1.2 }],
    ult: { k: 'quake', n: '전부 무너져라', tele: 1.2, cnt: 18, spread: 640, delay: 1.1, fx: 'rock', march: 1, m: 1 } }
};
