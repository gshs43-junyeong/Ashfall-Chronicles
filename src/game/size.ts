// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== size.js — 세계 크기(소형·중형·대형)와 좌표 예산 ===== */
/* ★ data.js(표 — 업적 깊이·유적 좌표)와 world.js(생성)가 둘 다 읽는 값이라 둘보다 먼저 읽히는 여기에 둔다.
   let 은 이 파일의 applyWorldSize 만 고쳐 쓴다 — 다른 파일에서 대입하면 모듈로 옮길 때 깨진다. */

/* 세계를 4200 → 5000칸으로 넓히면서 늘린 800칸을 전부 **왼쪽**에 붙였다(세션 3의 가라앉은 바다 · 빙하 지대). */
export const SHIFT = 800;

/* ---------------- 세계 크기 ---------------- */
export const WORLD_SIZES = {
  s: { n: '소형', k: 1, d: '지금까지의 세계. 5000×720칸.' },
  m: { n: '중형', k: 1.5, d: '가로·세로 1.5배(7500×1080칸). 바이옴이 넓고 땅속이 깊다. 만드는 데 두 배 남짓 걸린다.' },
  l: { n: '대형', k: 2, d: '가로·세로 2배(10000×1440칸). 오래 걸어야 하는 세계. 만드는 데 네 배 남짓 걸린다.' }
};
export let WSIZE = 's', WSX = 1, WSY = 1;
export const SX = x => Math.round(x * WSX);
export const SY = y => y >= 70 ? Math.round(y * WSY) : y + Math.round(70 * (WSY - 1));
export const SYB = y => y + Math.round(720 * WSY) - 720;

/* ★ 아래 세계 치수는 **세계 크기(소형·중형·대형)마다 다르다** — setWorldSize 가 새 게임·불러오기 때 고쳐 쓴다(let). */
export let WW = 5000;              // 세계 가로(타일, 소형) — 세션 3 지역(바다·빙하)이 왼쪽 800칸(SHIFT)
export let WH = 720;               // 세계 세로(타일) — 세션 3 심해를 담으려고 480에서 늘렸다
/* 보통 세계의 바닥. */
export let WORLD_BOT = 480;
export let SURF_BASE = 70;         // 기준 지표 높이
export let HELL_Y = 390;           // 지옥 시작 깊이
export let DEEP_Y = 280;           // 심층 시작
export let SKY_Y = 40;             // 하늘 섬 구역 (이보다 위)
export let CAMP_X0 = 1000 + SHIFT, CAMP_X1 = 1066 + SHIFT;   // 베이스캠프 — 잿빛 숲 (zoneAt에서도 참조)
export let CAMP_GX1 = 1100 + SHIFT;                          // 생성 발자국(평탄화·나무·물·자갈 제외)의 오른쪽 끝
/* 세션 3 — 왼쪽으로 갈수록 가라앉은 바다 · 빙하 지대 · 서리 지대 순으로 나온다 — 사연: docs/code-history.md#h101 */
export let SEA_X1 = 430;            // 가라앉은 바다 — 여기부터 왼쪽이 물
export let GLACIER_X1 = SHIFT;      // 빙하 지대 오른쪽 끝 = 원래 세계가 시작하는 자리

/* 바이옴. */
export const BIOMES = [
  { id: 'sea', x0: 0, x1: SEA_X1, n: '가라앉은 바다',
    card: { sub: '가장 먼 서쪽', line: '물이 지운 쪽. 숨을 셈하며 내려가는 곳.' },
    air: { c: '#2f7fb8', a: 0.22 } },
  { id: 'glacier', x0: SEA_X1, x1: GLACIER_X1, n: '빙하 지대',
    card: { sub: '물가 안쪽', line: '바다가 얼어붙은 자리. 밟는 것마다 갈라진다.' },
    air: { c: '#bfeaf7', a: 0.20 } },
  { id: 'ice', x0: GLACIER_X1, x1: 620 + SHIFT, n: '서리 지대',
    card: { sub: '서쪽 끝', line: '눈이 소리를 먹는다. 밟은 자리가 오래 남는 땅.' },
    air: { c: '#a8c8ee', a: 0.19 } },
  { id: 'forest', x0: 620 + SHIFT, x1: 1400 + SHIFT, n: '잿빛 숲',
    card: { sub: '시작한 자리', line: '재가 잎을 대신한 숲. 나무는 서 있으나 그늘이 없다.' },
    air: { c: '#b0aa90', a: 0.11 } },
  { id: 'jungle', x0: 1400 + SHIFT, x1: 2000 + SHIFT, n: '울림 정글',
    card: { sub: '남쪽 골짜기', line: '골이 깊어 소리가 되돌아온다. 젖은 공기가 무겁다.' },
    air: { c: '#5fbf86', a: 0.15 } },
  { id: 'desert', x0: 2000 + SHIFT, x1: 2680 + SHIFT, n: '메마른 사구',
    card: { sub: '가운데 모래', line: '물이 마른 자리에 바람이 길을 낸다. 낮과 밤이 다른 땅.' },
    air: { c: '#e8be74', a: 0.18 } },
  { id: 'forest2', x0: 2680 + SHIFT, x1: 3300 + SHIFT, n: '동쪽 숲',
    card: { sub: '마을 언저리', line: '재가 덜 닿은 숲. 사람이 아직 길을 내고 사는 곳.' },
    air: { c: '#93c47a', a: 0.15 } },
  { id: 'glowfen', x0: 3300 + SHIFT, x1: 3760 + SHIFT, n: '버섯 골짜기',
    card: { sub: '내려앉은 땅', line: '땅이 통째로 꺼져 갓이 자랐다. 어둠이 스스로 빛난다.' },
    air: { c: '#6fe0c4', a: 0.24 } },
  { id: 'corrupt', x0: 3760 + SHIFT, x1: WW, n: '부패한 땅',
    card: { sub: '동쪽 끝', line: '별이 떨어진 자리. 흙까지 물들어 되돌릴 수 없다.' },
    air: { c: '#a874e0', a: 0.27 } }];
for (const b of BIOMES) { b.bx0 = b.x0; b.bx1 = b.x1; }   // 소형 기준 경계 — setWorldSize 가 여기서 다시 잰다

/** 세계 치수와 바이옴 경계를 그 크기로 다시 잰다 — world.js setWorldSize 가 부른다. */
export function applyWorldSize(key) {
  WSIZE = WORLD_SIZES[key] ? key : 's';
  WSX = WSY = WORLD_SIZES[WSIZE].k;
  WW = SX(5000); WH = SY(720);
  WORLD_BOT = SY(480); SURF_BASE = SY(70); HELL_Y = SY(390); DEEP_Y = SY(280); SKY_Y = SY(40);
  /* 캠프 구역(안전 지대·곡·원경)은 오두막 셋 x0+2~49 · 광장 x0+38~59 에 맞춘 X1 = X0+66. 100 이던 동안 오른쪽 55칸이 빈 안전 지대였다.
     ★ 생성 발자국(CAMP_GX1)은 100 그대로 — 줄이면 지형·난수가 밀려 d3 석판 유적 1 이 방 3/16 만 걸어서 닿았다. */
  CAMP_X0 = SX(1050 + SHIFT) - 50; CAMP_X1 = CAMP_X0 + 66; CAMP_GX1 = CAMP_X0 + 100;
  SEA_X1 = SX(430); GLACIER_X1 = SX(SHIFT);
  for (const b of BIOMES) { b.x0 = b.bx0 === 0 ? 0 : SX(b.bx0); b.x1 = b.bx1 >= 5000 ? WW : SX(b.bx1); }
}
