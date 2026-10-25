/* ===== data/bossmoves.ts — 보스마다의 고유 기술 · 마지막 마디 필살기 ===== */
/* 몸놀림(entity/boss-ai)은 같은 갈래끼리 비슷해도, 기술은 보스마다 하나뿐인 것으로 — 이름 · 빛깔 · 조합 · 박자가 다르다.
   k 는 기술 틀(entity/boss-moves) — leap 뛰어 내려찍기 · rain 떨어지는 것 · march 다가오는 기둥 · beam 광선 · ring 틈 있는 탄 고리 ·
   spiral 나선 · dash 겨눈 돌진 · blink 등 뒤로 · vortex 끌어당김 · zone 남는 바닥 · wall 틈 있는 벽 · summon 부름 · push 바람 ·
   burrow 땅속 기습 · rewind 되감기 · clones 분신 · quake 천장 무너짐 · homing 쫓는 탄.
   tele 는 예고(초) — ★ 예고 없는 기술은 만들지 말 것: 피할 길이 보여야 공략이 된다. m 은 보스 공격력에 곱하는 몫.
   참고한 결(주석): 뛰어 내려찍기(Terraria 슬라임 왕), 다가오는 기둥(Hollow Knight), 틈 있는 탄막(Touhou), 겨눈 돌진(Eye of Cthulhu),
   광선 쓸기(Moon Lord · Skeletron Prime), 땅속 기습(Dune Splicer), 되감기(Ekko · Braid) */

export const BOSS_MOVES: Record<string, Bag> = {
  /* ---------------- 세션 1 ---------------- */
  /* 잿물 군체 — 굴 바닥 웅덩이가 몸이고 녹슨 투구만 떠 있다. 팔은 웅덩이에서 솟고(entity/boss-pool) 뛰지 않는다 — 웅덩이째 미끄러진다 */
  king_slime: { c: '#ffb050', every: 6.5, moves: [
    { k: 'sig', sig: 'slap', n: '잿물 팔 내리치기', tele: 0.7, m: 1.1 },
    { k: 'sig', sig: 'bubbles', n: '끓어오르는 기둥', tele: 0.6, m: 0.9 },
    { k: 'summon', n: '잿물 덩이를 뱉는다', tele: 0.8, mob: 'slime', cnt: 3 },
    { k: 'sig', sig: 'sink', n: '잠겼다 솟기', tele: 0.6, m: 1 },
    { k: 'ring', n: '기름 파문', tele: 0.5, times: 2, cnt: 16, gap: 3, spd: 200, every: 0.6, proj: 'sludge', m: 0.5, pw: [1, 1, 0.8] },
    { k: 'sig', sig: 'slap', n: '세 팔 내리치기', tele: 0.8, arms: 3, m: 1, ph: 1, pw: [0, 1, 1.4] }],
    ult: { k: 'sig', sig: 'surge', n: '잿물 범람', tele: 1, m: 1 } },
  /* 뼈 오르간 — 무덤 뒷벽에 박힌 갈비 오르간. 몸은 움직이지 않고 팔 · 관 · 풀무가 싸운다(entity/boss-organ) */
  bone_lord: { c: '#bfe8d8', every: 6, moves: [
    { k: 'sig', sig: 'sweep', n: '뼈 팔 쓸기', tele: 0.3, m: 1 },
    { k: 'sig', sig: 'pipes', n: '관 울림', tele: 0.3, m: 0.7 },
    { k: 'sig', sig: 'scatter', n: '흩어졌다 맞추기', tele: 0.5, m: 0.6 },
    { k: 'summon', n: '해골 성가대', tele: 0.8, mob: 'skeleton', cnt: 3 },
    { k: 'sig', sig: 'sweep', n: '두 팔 쓸기', tele: 0.3, both: 1, m: 1, ph: 1, pw: [0, 1, 1.3] },
    { k: 'sig', sig: 'pipes', n: '불협화음', tele: 0.3, wild: 1, m: 0.6, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'sig', sig: 'requiem', n: '장송곡', tele: 1, m: 0.6 } },
  corrupt_heart: { c: '#ff8a40', every: 6, moves: [
    { k: 'sig', sig: 'pendulum', n: '시계추', tele: 0.4, m: 1.1, pw: [1.4, 0, 0] },
    { k: 'sig', sig: 'silk', n: '실 늘어뜨리기', tele: 0.5, cnt: 4, gap: 150, m: 0.9, pw: [1, 0, 0] },
    { k: 'rain', n: '타는 재 털기', tele: 0.6, form: 'scatter', cnt: 6, spread: 440, delay: 0.95, r: 40, shape: 'circle', fx: 'fire', m: 0.8, pw: [1, 0, 0] },
    { k: 'sig', sig: 'wingwind', n: '날개 바람', tele: 0.5, beats: 3, fan: 7, m: 0.8, ph: 1, pw: [0, 1.2, 1] },
    { k: 'sig', sig: 'dust', n: '인분 가루', tele: 0.5, cnt: 6, span: 620, m: 0.8, ph: 1, pw: [0, 1, 1] },
    { k: 'sig', sig: 'lightdive', n: '불나방', tele: 0.4, cnt: 1, m: 1.1, ph: 1, pw: [0, 1.1, 1.3] },
    { k: 'sig', sig: 'wingwind', n: '불꽃 날개짓', tele: 0.4, beats: 5, fan: 9, push: 640, m: 0.7, ph: 2, pw: [0, 0, 1.2] }],
    ult: { k: 'sig', sig: 'lightdive', n: '빛을 쫓는다', tele: 1, cnt: 4, m: 1 } },
  frost_witch: { c: '#a8e4ff', every: 6.5, moves: [
    { k: 'clones', n: '거울 분신', tele: 0.8, cnt: 2, ring: 12, proj: 'frost', m: 0.55 },
    { k: 'rain', n: '얼음 창 비', tele: 0.6, form: 'scatter', cnt: 7, spread: 360, delay: 0.85, shape: 'col', fx: 'ice', m: 0.9 },
    { k: 'zone', n: '서리 바닥', tele: 0.5, at: 'player', n2: 3, r: 70, life: 7, dps: 0.06, slow: 0.55, fx: 'frost' },
    { k: 'sig', sig: 'mirrors', n: '얼음 거울 감옥', tele: 0.8, pose: 0, m: 1 },
    { k: 'shield', n: '얼음 거울 갑옷', tele: 0.7, v: 0.14, life: 12, fx: 'ice', ph: 1, pw: [0, 1, 1.3] },
    { k: 'wall', n: '눈보라 벽', tele: 0.8, times: 2, spd: 260, every: 1.3, fx: 'ice', m: 0.8, ph: 1, pw: [0, 1, 1] },
    { k: 'homing', n: '서리 정령', tele: 0.6, cnt: 4, spd: 180, turn: 2.2, proj: 'frost', m: 0.5, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'beam', n: '절대 영도', tele: 1.2, cnt: 2, spread: 3.14, dur: 3, w: 26, len: 760, sweep: 1.4, fx: 'frost', m: 0.35 } },
  void_king: { c: '#a06fff', every: 6, moves: [
    { k: 'vortex', n: '사건의 지평선', tele: 0.8, life: 3, r: 380, pull: 320, burst: 150, fx: 'void', m: 1.1 },
    { k: 'beam', n: '공허 광선', tele: 0.9, cnt: 1, dur: 2.2, w: 30, len: 900, sweep: 2.2, fx: 'void', m: 0.35 },
    { k: 'sig', sig: 'vleap', n: '틈새 도약', tele: 0.3, times: 2, m: 1 },
    { k: 'sig', sig: 'veil', n: '어둠 장막', tele: 0.9, pose: 0, m: 1 },
    { k: 'ring', n: '공허 파문', tele: 0.6, times: 3, cnt: 24, gap: 4, spd: 250, every: 0.5, rot: 0.3, proj: 'void', m: 0.5, pw: [1, 1, 1] },
    { k: 'ward', n: '공허의 결계', tele: 0.8, hits: 12, life: 9, fx: 'void', ph: 1, pw: [0, 0.9, 1.2] },
    { k: 'rain', n: '별 없는 비', tele: 0.6, form: 'trail', cnt: 7, every: 0.25, delay: 0.8, r: 46, shape: 'circle', fx: 'rift', m: 0.9, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'spiral', n: '왕의 붕괴', tele: 1.2, arms: 6, dur: 5, every: 0.1, spd: 280, proj: 'void', turn: -1.8, m: 0.4 } },
  storm_warden: { c: '#cfe6ff', every: 6, moves: [
    { k: 'march', n: '낙뢰 기둥', tele: 0.5, cnt: 8, gap: 64, every: 0.11, h: 420, from: 'sky', fx: 'bolt', m: 0.9 },
    { k: 'push', n: '폭풍 밀어내기', tele: 0.6, life: 3.2, force: 520, fx: 'wind', m: 0 },
    { k: 'dash', n: '급강하', tele: 0.5, times: 3, spd: 3.8, m: 1 },
    { k: 'sig', sig: 'rods', n: '피뢰침', tele: 0.7, pose: 0, m: 1 },
    { k: 'rain', n: '뇌우', tele: 0.6, form: 'scatter', cnt: 8, spread: 460, delay: 0.8, shape: 'col', fx: 'bolt', m: 0.9, pw: [1, 1, 1] },
    { k: 'homing', n: '구전', tele: 0.6, cnt: 4, spd: 220, turn: 2.4, proj: 'bolt', m: 0.5, ph: 1, pw: [0, 1.2, 1] },
    { k: 'shield', n: '폭풍의 눈', tele: 0.7, v: 0.12, life: 10, fx: 'wind', ph: 2, pw: [0, 0, 1.3] }],
    ult: { k: 'wall', n: '천둥 벽', tele: 1, times: 3, spd: 300, gap: 110, every: 1.4, fx: 'bolt', m: 0.8 } },
  /* 판결석 좌상 — 신전 뒷벽 벽감의 눈 가린 재판관. 저울은 머문 쪽으로 기울고 · 석판은 광선을 막는다(entity/boss-judge) */
  first_keeper: { c: '#e8d8a0', every: 6, moves: [
    { k: 'sig', sig: 'verdict', n: '판결', tele: 0.4, m: 1 },
    { k: 'sig', sig: 'tablets', n: '증언 석판', tele: 0.3, cnt: 2, m: 1 },
    { k: 'sig', sig: 'gavel', n: '판결의 손', tele: 0.3, m: 1 },
    { k: 'homing', n: '룬 추적탄', tele: 0.6, cnt: 5, spd: 200, turn: 2, proj: 'rune', m: 0.55, pw: [1, 1, 1] },
    { k: 'sig', sig: 'condemn', n: '단죄의 눈', tele: 0.3, cnt: 3, m: 0.9, ph: 1, pw: [0, 1.4, 1.2] },
    { k: 'sig', sig: 'tablets', n: '증언이 쏟아진다', tele: 0.3, cnt: 3, m: 1, ph: 2, pw: [0, 0, 1] },
    { k: 'sig', sig: 'verdict', n: '거듭된 판결', tele: 0.3, weigh: 1.8, m: 1.1, ph: 2, pw: [0, 0, 1.2] }],
    ult: { k: 'sig', sig: 'sentence', n: '최초의 선고', tele: 1, m: 1 } },
  /* 일식 — 하늘에 뚫린 별의 음화. 그림자 끝에 손이 내려오고(짚은 손만 제대로 맞는다) · 응시는 빛 속에서만 견딘다(entity/boss-eclipse) */
  pursuer: { c: '#b48aff', every: 5.5, moves: [
    { k: 'sig', sig: 'shand', n: '그림자 손', tele: 0.3, m: 1 },
    { k: 'rain', n: '별똥 추격', tele: 0.6, form: 'trail', cnt: 8, every: 0.22, delay: 0.75, r: 48, shape: 'circle', fx: 'meteor', m: 1 },
    { k: 'sig', sig: 'stare', n: '응시', tele: 0.3, m: 1 },
    { k: 'homing', n: '떠도는 별', tele: 0.6, cnt: 6, spd: 210, turn: 2, proj: 'void', m: 0.5, ph: 1, pw: [0, 1.2, 1, 1, 1] },
    { k: 'sig', sig: 'hands2', n: '두 손', tele: 0.3, cnt: 2, m: 1, ph: 2, pw: [0, 0, 1.3, 1.2, 1] },
    { k: 'sig', sig: 'stare', n: '긴 응시', tele: 0.3, pulses: 3, m: 1, ph: 3, pw: [0, 0, 0, 1.3, 1.2] },
    { k: 'sig', sig: 'hands2', n: '떨어지는 그림자', tele: 0.3, cnt: 3, m: 1, ph: 4, pw: [0, 0, 0, 0, 1.5] }],
    ult: { k: 'sig', sig: 'totality', n: '개기일식', tele: 1, m: 1 } },

  /* ---------------- 유적의 주인 ---------------- */
  mine_horror: { c: '#c8a878', every: 7, moves: [
    { k: 'quake', n: '갱도 붕괴', tele: 0.7, cnt: 7, spread: 380, delay: 0.95, fx: 'rock', m: 0.9 },
    { k: 'burrow', n: '땅굴 기습', tele: 0.5, under: 1.4, r: 70, m: 1.2 },
    { k: 'summon', n: '광부 망령을 깨운다', tele: 0.8, mob: 'minerghost', cnt: 2 },
    { k: 'sig', sig: 'cart', n: '광차 돌진', tele: 0.6, pose: 1, m: 1 },
    { k: 'homing', n: '녹슨 못 세례', tele: 0.6, cnt: 5, spd: 220, turn: 1.8, proj: 'rivet', m: 0.6, pw: [0.6, 1] },
    { k: 'leap', n: '갱도 짓누르기', tele: 0.7, times: 2, waves: 1, wspd: 330, wfx: 'rock', m: 1, ph: 1, pw: [0, 1.6] }],
    ult: { k: 'quake', n: '붕락', tele: 1, cnt: 14, spread: 520, delay: 1.1, fx: 'rock', m: 1 } },
  ice_warden: { c: '#9fe0ff', every: 7, moves: [
    { k: 'wall', n: '빙벽 밀기', tele: 0.8, times: 1, spd: 240, gap: 120, fx: 'ice', m: 0.9 },
    { k: 'ring', n: '서리 고리', tele: 0.6, times: 2, cnt: 18, gap: 3, spd: 220, every: 0.7, proj: 'frost', m: 0.6 },
    { k: 'rain', n: '얼음 감옥', tele: 0.7, form: 'cage', cnt: 7, gapX: 50, delay: 1, shape: 'col', fx: 'ice', m: 0.9 },
    { k: 'sig', sig: 'snowball', n: '눈사태', tele: 0.7, pose: 0, m: 1 },
    { k: 'beam', n: '얼음 광선', tele: 0.8, cnt: 1, dur: 1.6, w: 22, len: 700, sweep: 1.2, fx: 'frost', m: 0.4, pw: [0.8, 1] },
    { k: 'shield', n: '서리 갑주', tele: 0.7, v: 0.12, life: 12, fx: 'ice', ph: 1, pw: [0, 1.4] }],
    ult: { k: 'zone', n: '빙하기', tele: 1, at: 'scatter', n2: 7, r: 70, life: 8, dps: 0.07, slow: 0.6, fx: 'frost', wall: 1 } },
  /* 뿌리 대성당 — 정글 뒷벽에 박힌 속 빈 고목. 땅이 먼저 들썩이고 · 나이테는 뛰어넘고 · 꽃은 꺾어야 낫지 않는다(entity/boss-root) */
  vine_lord: { c: '#7fd06a', every: 6.5, moves: [
    { k: 'sig', sig: 'rroots', n: '뿌리 분출', tele: 0.3, cnt: 5, m: 1 },
    { k: 'rain', n: '씨앗 폭탄', tele: 0.6, form: 'scatter', cnt: 5, spread: 340, delay: 1, r: 54, shape: 'circle', fx: 'seed', zone: { r: 50, life: 4, dps: 0.08, slow: 0.25 }, m: 0.8 },
    { k: 'sig', sig: 'rrings', n: '나이테 파동', tele: 0.3, cnt: 3, m: 1 },
    { k: 'sig', sig: 'rbloom', n: '꽃 피는 철', tele: 0.3, cnt: 4, m: 1, ph: 1, pw: [0, 1.3, 1.1] },
    { k: 'zone', n: '가시덤불', tele: 0.5, at: 'player', n2: 3, r: 60, life: 6, dps: 0.08, slow: 0.4, fx: 'seed', ph: 1, pw: [0, 0.8, 1] },
    { k: 'sig', sig: 'rroots', n: '뿌리의 숲', tele: 0.3, cnt: 8, m: 1, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'sig', sig: 'rfell', n: '쓰러지는 나무', tele: 1, m: 1.2 } },
  /* 모래시계 거상 — 피라미드 깊은 방 왕좌에 앉은 석상. 가슴의 모래시계가 목이고 막마다 뒤집힌다(entity/boss-hourglass) */
  sand_guardian: { c: '#f0c870', every: 6.5, moves: [
    { k: 'sig', sig: 'fist', n: '주먹 내리치기', tele: 0.3, m: 1.1 },
    { k: 'sig', sig: 'sandpour', n: '모래 쏟기', tele: 0.5, m: 1 },
    { k: 'sig', sig: 'quick', n: '유사 늪', tele: 0.4, cnt: 3, m: 0.8 },
    { k: 'march', n: '태양 광선', tele: 0.6, cnt: 6, gap: 80, every: 0.2, h: 460, from: 'sky', fx: 'sun', m: 1 },
    { k: 'sig', sig: 'fist', n: '두 주먹', tele: 0.3, both: 1, m: 1, ph: 1, pw: [0, 1, 1.3] },
    { k: 'homing', n: '스카라브 떼', tele: 0.6, cnt: 6, spd: 190, turn: 2, proj: 'dark', m: 0.5, ph: 1, pw: [0, 1.2, 1] },
    { k: 'sig', sig: 'quick', n: '모래 소용돌이', tele: 0.4, cnt: 5, gap: 160, pull: 320, m: 0.7, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'sig', sig: 'deadline', n: '시간 마감', tele: 1, dur: 8, need: 0.07, m: 1 } },
  spore_queen: { c: '#8ff0c8', every: 6.5, moves: [
    { k: 'zone', n: '포자 구름', tele: 0.6, at: 'scatter', n2: 4, r: 64, life: 6, dps: 0.12, fx: 'spore', poison: 1 },
    { k: 'rain', n: '꽃 터뜨리기', tele: 0.6, form: 'scatter', cnt: 5, spread: 320, delay: 1.1, r: 40, shape: 'circle', fx: 'spore', burstRing: 8, m: 0.7 },
    { k: 'summon', n: '여왕의 부름', tele: 0.8, mob: 'sporeling', cnt: 3 },
    { k: 'sig', sig: 'garden', n: '버섯 정원', tele: 0.8, pose: 0, m: 1 },
    { k: 'ring', n: '포자 고리', tele: 0.5, times: 2, cnt: 20, gap: 4, spd: 200, every: 0.6, proj: 'poison', m: 0.5, pw: [1, 0.8] },
    { k: 'heal', n: '균사 흡수', tele: 0.6, dur: 2.6, v: 0.07, brk: 0.04, fx: 'spore', ph: 1, pw: [0, 1.3] }],
    ult: { k: 'spiral', n: '포자 폭풍', tele: 1.1, arms: 3, dur: 4.5, every: 0.1, spd: 220, proj: 'poison', turn: 1.6, m: 0.45 } },
  /* 곪은 벌집 어미 — 둥지 뒷벽 전체가 육각 방 벌집. 어미 머리가 아랫줄 방 다섯 중 하나에서만 내밀고 그때만 제대로 맞는다(entity/boss-hive) */
  blight_maw: { c: '#c8e050', every: 5.5, moves: [
    { k: 'sig', sig: 'brood', n: '방이 열린다', tele: 0.4, cnt: 2, m: 1 },
    { k: 'sig', sig: 'bilefall', n: '담즙이 흐른다', tele: 0.4, cnt: 2, m: 1 },
    { k: 'sig', sig: 'spit', n: '담즙 침', tele: 0.3, cnt: 3, m: 0.9 },
    { k: 'rain', n: '담즙 비', tele: 0.6, form: 'scatter', cnt: 6, spread: 360, delay: 0.9, r: 46, shape: 'circle', fx: 'bile', zone: { r: 46, life: 5, dps: 0.1 }, m: 0.8 },
    { k: 'sig', sig: 'brood', n: '여러 방이 열린다', tele: 0.4, cnt: 3, m: 1, ph: 1, pw: [0, 1.2, 1] },
    { k: 'homing', n: '날벌레 떼', tele: 0.6, cnt: 6, spd: 170, turn: 2.2, proj: 'dark', m: 0.5, ph: 1, pw: [0, 1, 1] },
    { k: 'sig', sig: 'bilefall', n: '벽을 타는 담즙', tele: 0.4, cnt: 4, low: 1, r: 90, m: 0.9, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'sig', sig: 'bloom', n: '둥지 개화', tele: 1, m: 1 } },
  drowned_keeper: { c: '#7fc8e8', every: 7, moves: [
    { k: 'wall', n: '역류', tele: 0.8, times: 1, spd: 300, gap: 110, fx: 'water', m: 0.9 },
    { k: 'homing', n: '거품 감옥', tele: 0.6, cnt: 5, spd: 150, turn: 1.6, proj: 'cagebub', m: 0.5 },
    { k: 'leap', n: '닻 내려찍기', tele: 0.7, waves: 1, wspd: 330, wfx: 'water', m: 1.1 },
    { k: 'sig', sig: 'anchor', n: '닻 사슬', tele: 0.6, pose: 2, m: 1 },
    { k: 'ring', n: '물방울 고리', tele: 0.5, times: 2, cnt: 18, gap: 3, spd: 220, every: 0.6, proj: 'drop', m: 0.5, pw: [1, 1, 1] },
    { k: 'shield', n: '거품 껍질', tele: 0.7, v: 0.14, life: 12, fx: 'water', ph: 1, pw: [0, 1.2, 1.3] }],
    ult: { k: 'vortex', n: '심연의 물결', tele: 1, life: 3, r: 360, pull: 300, burst: 160, waves: 1, fx: 'water', m: 1.1 } },
  isle_keeper: { c: '#8fc8b8', every: 7, moves: [
    { k: 'rain', n: '바위 던지기', tele: 0.7, form: 'scatter', cnt: 4, spread: 360, delay: 1.2, r: 64, shape: 'circle', fx: 'boulder', m: 1.2 },
    { k: 'quake', n: '섬 뒤흔들기', tele: 0.6, cnt: 8, spread: 420, delay: 0.9, fx: 'rock', m: 0.8 },
    { k: 'leap', n: '해일 내려찍기', tele: 0.8, waves: 2, wspd: 300, wfx: 'water', m: 1.1 },
    { k: 'sig', sig: 'islet', n: '섬 던지기', tele: 0.9, pose: 0, m: 1 },
    { k: 'march', n: '산호 솟기', tele: 0.6, cnt: 7, gap: 60, every: 0.14, h: 110, both: 1, fx: 'plant', m: 0.9, pw: [1, 1, 1] },
    { k: 'shield', n: '바위 껍질', tele: 0.8, v: 0.16, life: 14, fx: 'rock', ph: 1, pw: [0, 1.2, 1.3] }],
    ult: { k: 'rain', n: '섬의 무게', tele: 1.2, form: 'trail', cnt: 10, every: 0.2, delay: 0.9, r: 70, shape: 'circle', fx: 'rock', m: 1.1 } },
  tide_warden: { c: '#5fb0e8', every: 5.5, moves: [
    { k: 'vortex', n: '소용돌이', tele: 0.8, life: 3, r: 420, pull: 360, burst: 160, fx: 'water', m: 1 },
    { k: 'wall', n: '해일', tele: 0.9, times: 2, spd: 320, gap: 120, every: 1.2, fx: 'water', m: 0.9 },
    { k: 'beam', n: '심해 광선', tele: 1, cnt: 2, spread: 0.6, dur: 2.4, w: 30, len: 900, sweep: 1.2, fx: 'water', m: 0.35 },
    { k: 'sig', sig: 'flood', n: '밀물', tele: 0.9, pose: 1, m: 1 },
    { k: 'leap', n: '파도 내려찍기', tele: 0.7, waves: 2, wspd: 360, wfx: 'water', m: 1.1, pw: [1.2, 0, 0] },
    { k: 'homing', n: '거품 감옥', tele: 0.6, cnt: 5, spd: 150, turn: 1.6, proj: 'cagebub', m: 0.5, ph: 1, pw: [0, 1.2, 1] },
    { k: 'wall', n: '겹파도', tele: 0.8, times: 3, spd: 340, every: 1.1, fx: 'water', m: 0.8, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'spiral', n: '물이 지운 것', tele: 1.3, arms: 4, dur: 5, every: 0.1, spd: 290, proj: 'frost', turn: 1.4, wall: 1, fx: 'water', m: 0.4 } },

  /* ---------------- 세션 2 ---------------- */
  proliferator: { c: '#d8c8a8', every: 6, moves: [
    { k: 'ring', n: '리벳 난사', tele: 0.5, times: 4, cnt: 16, gap: 2, spd: 320, every: 0.35, rot: 0.4, proj: 'rivet', m: 0.5 },
    { k: 'summon', n: '증식 폭발', tele: 0.8, mob: 'splitter', cnt: 2, ring: 18 },
    { k: 'march', n: '압착 행진', tele: 0.6, cnt: 7, gap: 56, every: 0.15, h: 100, fx: 'metal', m: 0.9 },
    { k: 'sig', sig: 'turrets', n: '리벳 포탑', tele: 0.7, pose: 1, m: 1 },
    { k: 'homing', n: '추적 리벳', tele: 0.6, cnt: 6, spd: 220, turn: 2, proj: 'rivet', m: 0.5, pw: [1, 1, 1] },
    { k: 'zone', n: '기름 웅덩이', tele: 0.5, at: 'player', n2: 3, r: 60, life: 6, dps: 0.06, slow: 0.45, fx: 'ink', ph: 1, pw: [0, 1.2, 1.2] }],
    ult: { k: 'spiral', n: '과증식', tele: 1, arms: 6, dur: 4, every: 0.11, spd: 300, proj: 'rivet', turn: -2.2, m: 0.4 } },
  hepha: { c: '#ffb050', every: 6, moves: [
    { k: 'march', n: '화로 분출', tele: 0.6, cnt: 8, gap: 60, every: 0.12, h: 160, both: 1, fx: 'fire', m: 1 },
    { k: 'rain', n: '용융 비', tele: 0.6, form: 'scatter', cnt: 8, spread: 440, delay: 0.9, r: 44, shape: 'circle', fx: 'fire', zone: { r: 44, life: 4, dps: 0.12, burn: 1 }, m: 0.8 },
    { k: 'push', n: '역회전 컨베이어', tele: 0.6, life: 3, force: -480, fx: 'conveyor', m: 0 },
    { k: 'sig', sig: 'pour', n: '쇳물 붓기', tele: 0.7, pose: 1, m: 1 },
    { k: 'homing', n: '불꽃 탄', tele: 0.6, cnt: 5, spd: 220, turn: 2, proj: 'fire', m: 0.5, ph: 1, pw: [0, 1, 1, 1, 1] },
    { k: 'shield', n: '열 차폐', tele: 0.7, v: 0.1, life: 12, fx: 'fire', ph: 2, pw: [0, 0, 1.3, 1, 0.8] },
    { k: 'rain', n: '불똥 비', tele: 0.6, form: 'trail', cnt: 8, every: 0.22, delay: 0.75, r: 46, shape: 'circle', fx: 'fire', m: 0.9, ph: 3, pw: [0, 0, 0, 1.4, 1.6] }],
    ult: { k: 'beam', n: '최초의 불', tele: 1.3, cnt: 3, spread: 2.09, dur: 3.4, w: 34, len: 900, sweep: 1.6, fx: 'fire', m: 0.35 } },
  overseer: { c: '#d0d0e0', every: 6, moves: [
    { k: 'beam', n: '레이저 격자', tele: 0.9, cnt: 3, from: 'grid', dur: 1.6, w: 18, len: 700, sweep: 0, fx: 'laser', m: 0.45 },
    { k: 'march', n: '압착기 행렬', tele: 0.6, cnt: 8, gap: 58, every: 0.16, h: 140, from: 'sky', fx: 'metal', m: 1 },
    { k: 'summon', n: '보수 요청', tele: 0.8, mob: 'riveter', cnt: 2 },
    { k: 'sig', sig: 'drones', n: '점검 드론', tele: 0.8, pose: 2, m: 1 },
    { k: 'homing', n: '유도 미사일', tele: 0.6, cnt: 4, spd: 240, turn: 2.4, proj: 'rivet', m: 0.55, pw: [1, 1, 1] },
    { k: 'shield', n: '역장 방벽', tele: 0.7, v: 0.15, life: 12, fx: 'metal', ph: 1, pw: [0, 1.2, 1] },
    { k: 'rain', n: '압착기 낙하', tele: 0.6, form: 'trail', cnt: 6, every: 0.3, delay: 0.8, shape: 'col', fx: 'metal', m: 0.9, ph: 2, pw: [0, 0, 1.4] }],
    ult: { k: 'wall', n: '전면 가동', tele: 1, times: 3, spd: 280, gap: 110, every: 1.3, fx: 'metal', march: 1, m: 0.8 } },
  archetype: { c: '#f4ead0', every: 5.5, moves: [
    { k: 'blink', n: '완벽한 연격', tele: 0.25, times: 4, r: 96, fx: 'slash', m: 1 },
    { k: 'beam', n: '설계선', tele: 0.9, cnt: 2, from: 'cross', dur: 1.8, w: 20, len: 900, sweep: 0.6, fx: 'blueprint', m: 0.4 },
    { k: 'summon', n: '형상 주조', tele: 0.8, mob: 'draft_form', cnt: 2 },
    { k: 'sig', sig: 'project', n: '설계도 투영', tele: 0.5, pose: 0, m: 1 },
    { k: 'march', n: '설계 기둥', tele: 0.6, cnt: 8, gap: 58, every: 0.12, h: 140, both: 1, fx: 'rune', m: 0.9, ph: 1, pw: [0, 1.2, 1, 1, 1] },
    { k: 'ward', n: '완성의 결계', tele: 0.8, hits: 20, life: 10, fx: 'rune', ph: 2, pw: [0, 0, 1.2, 1, 1] },
    { k: 'homing', n: '초안 탄', tele: 0.6, cnt: 6, spd: 220, turn: 2.2, proj: 'rune', m: 0.5, ph: 3, pw: [0, 0, 0, 1.4, 1.4] }],
    ult: { k: 'spiral', n: '원형의 증명', tele: 1.2, arms: 8, dur: 4.5, every: 0.12, spd: 280, proj: 'rune', turn: 1.2, blink: 1, m: 0.38 } },
  restorer: { c: '#bcd8f4', every: 5.5, moves: [
    { k: 'rewind', n: '되감기', tele: 0.5, back: 3, heal: 0.025 },
    { k: 'beam', n: '궤도 광선', tele: 1, cnt: 2, spread: 3.14, dur: 3, w: 30, len: 960, sweep: 2.4, fx: 'star', m: 0.35 },
    { k: 'ring', n: '해체 파동', tele: 0.6, times: 3, cnt: 30, gap: 5, spd: 280, every: 0.5, proj: 'star', m: 0.55 },
    { k: 'heal', n: '복원', tele: 0.6, dur: 3.2, v: 0.05, brk: 0.03, fx: 'clock', ph: 1, pw: [0, 1, 1, 1.2, 1.2] },
    { k: 'clones', n: '과거의 잔상', tele: 0.8, cnt: 2, ring: 12, proj: 'star', m: 0.5, ph: 2, pw: [0, 0, 1.2, 1, 1] },
    { k: 'march', n: '빛바늘 낙하', tele: 0.6, cnt: 8, gap: 60, every: 0.11, h: 420, from: 'sky', fx: 'sun', m: 0.9, ph: 3, pw: [0, 0, 0, 1.4, 1.4] }],
    ult: { k: 'vortex', n: '원점 회귀', tele: 1.2, life: 3.4, r: 460, pull: 380, burst: 190, rewind: 1, fx: 'clock', m: 1.1 } },
  shaft_maw: { c: '#a89878', every: 6, moves: [
    { k: 'quake', n: '갱 메우기', tele: 0.8, cnt: 12, spread: 520, delay: 1, fx: 'rock', m: 1 },
    { k: 'vortex', n: '삼키는 구멍', tele: 0.7, life: 2.8, r: 400, pull: 360, burst: 170, fx: 'pit', m: 1.1 },
    { k: 'burrow', n: '굴착', tele: 0.5, under: 1.5, r: 110, m: 1.2 },
    { k: 'sig', sig: 'veins', n: '광맥 폭발', tele: 0.7, pose: 0, m: 1 },
    { k: 'march', n: '석순 솟기', tele: 0.6, cnt: 8, gap: 58, every: 0.13, h: 120, both: 1, fx: 'bone', m: 0.9, ph: 1, pw: [0, 1.2, 1, 1, 1] },
    { k: 'heal', n: '광석 삼키기', tele: 0.6, dur: 2.8, v: 0.05, brk: 0.035, fx: 'rock', ph: 2, pw: [0, 0, 1.2, 1, 1] },
    { k: 'wall', n: '흙더미 밀기', tele: 0.8, times: 2, spd: 280, every: 1.3, fx: 'sand', m: 0.8, ph: 3, pw: [0, 0, 0, 1.4, 1.4] }],
    ult: { k: 'quake', n: '전부 무너져라', tele: 1.2, cnt: 18, spread: 640, delay: 1.1, fx: 'rock', march: 1, m: 1 } }
};

/* 위험 지대가 어디서 오는가(entity/boss-moves strike) — 던진 것은 보스 손에서 포물선, 이 기둥들은 위에서 내려온다 */
export const ARC_FX: Record<string, number> = { boulder: 1, seed: 1, bile: 1 };
export const DOWN_COL: Record<string, number> = { bolt: 1, sun: 1, metal: 1, ice: 1 };
/** 필살기 덧붙임(march · wall)에 fx 가 없으면 탄 갈래로 고른다 */
export const XFX_OF: Record<string, string> = { rune: 'rune', fire: 'fire', frost: 'ice', bolt: 'bolt', rivet: 'metal', void: 'rune', dark: 'flesh', poison: 'plant', star: 'rune' };

/* 기술이 끝난 뒤의 틈 — 보스마다 한 갈래. 큰 기술 뒤에 생기는 틈을 때리는 것이 공략이다(entity/boss-gaps).
   stagger 비틀거림(무거운 몸 — 멈춰 선다) · heat 과열(마법 · 원소 — 느려진다) · crack 균열(갑옷 · 껍데기 — 방어가 벌어진다). 사연: docs/code-history.md#h181 */
/** 깨어날 때 넓혀 둘 싸움터(칸 — 너비 · 바닥에서 높이) — 몸 그림이 바위에 묻히지 않게(game/boss-arena) */
export const BOSS_ARENA: Record<string, { w: number; h: number }> = {
  king_slime: { w: 40, h: 12 }, bone_lord: { w: 44, h: 21 }, corrupt_heart: { w: 42, h: 26 }, sand_guardian: { w: 56, h: 24 }, blight_maw: { w: 46, h: 21 }, first_keeper: { w: 58, h: 26 }, void_king: { w: 60, h: 24 }, vine_lord: { w: 66, h: 34 }
};
export const BOSS_GAP: Record<string, string> = {
  king_slime: 'stagger', bone_lord: 'stagger', first_keeper: 'stagger', pursuer: 'stagger', mine_horror: 'stagger', ice_warden: 'stagger',
  sand_guardian: 'stagger', isle_keeper: 'stagger', proliferator: 'stagger', shaft_maw: 'stagger',
  corrupt_heart: 'heat', frost_witch: 'heat', void_king: 'heat', storm_warden: 'heat', spore_queen: 'heat', drowned_keeper: 'heat',
  tide_warden: 'heat', hepha: 'heat', overseer: 'heat',
  vine_lord: 'crack', blight_maw: 'crack', archetype: 'crack', restorer: 'crack'
};
/** dur 초 · mul 받는 피해 배수 · miss 헛손질(아무도 못 맞힘)이면 더하는 초 · slow 이동 배수 · arm 갑옷 배수 */
export const GAP_KIND: Bag = {
  stagger: { dur: 2.0, mul: 1.6, miss: 1.2, c: '#ffd27a' },
  heat: { dur: 2.8, mul: 1.35, miss: 1.0, slow: 0.5, c: '#ff8a4a' },
  crack: { dur: 3.0, mul: 1.05, miss: 1.0, arm: 0.4, c: '#cfeaff' }
};
export const GAP_BRACE = 0.45;     // 예고 중 방어 자세 — 받는 피해(지금은 때리지 말 것이 몸에 보인다)
export const GAP_MISS_MUL = 0.25;  // 헛손질이면 받는 피해에 더한다

/* 마디를 넘는 순간 몸이 바뀌는 보스(entity/boss-forms) — fly 그 마디부터 날아오른다(k 날개 그림 · game/boss-form-fx) ·
   split 그 마디에서 둘로 갈라진다(남은 체력을 반씩, 둘 다 쓰러져야 끝). 3 · 5 마디 보스만 — 두 마디는 바뀔 틈이 없다 */
export const BOSS_FORM: Record<string, { fly?: number; k?: string; split?: number; n?: string }> = {
  proliferator: { split: 1, n: '스스로를 복제한다' },
  tide_warden: { fly: 1, k: 'spout', n: '물기둥을 타고 오른다' },
  hepha: { fly: 2, k: 'jets', n: '분사구에 불이 붙는다' },
  archetype: { fly: 3, k: 'wings', n: '설계선이 날개가 된다' }
};
/* 하늘에서는 못 쓰는 기술 — 땅을 디뎌야 끝난다(leap 은 내려앉아야 · burrow 는 파고들어야) */
export const GROUND_MOVE: Record<string, number> = { leap: 1, burrow: 1 };
/* 기술 자세의 틀(tools/mkbossart.py FAMILY 와 같은 묶음) — 넷째 칸부터 더한 기술은 자세 시트에 칸이 없어, 앞 셋 중 같은 틀의 자세를 빌린다 */
export const MOVE_FAM: Record<string, string> = { leap: 'slam', quake: 'slam', march: 'slam',
  rain: 'cast', ring: 'cast', spiral: 'cast', homing: 'cast', beam: 'cast', wall: 'cast', zone: 'cast', clones: 'cast', rewind: 'cast', shield: 'cast', ward: 'cast',
  vortex: 'pull', push: 'pull', summon: 'pull', heal: 'pull', dash: 'lunge', blink: 'lunge', burrow: 'lunge' };
/** 그 기술이 빌려 쓸 자세 칸(0~2) */
export function movePose(K: Bag, d: Bag) {
  if (d.pose !== undefined) return d.pose;
  const i = K.moves.indexOf(d); if (i >= 0 && i < 3) return i;
  const f = MOVE_FAM[d.k], j = K.moves.slice(0, 3).findIndex((m: Bag) => MOVE_FAM[m.k] === f);
  return j >= 0 ? j : 0;
}
