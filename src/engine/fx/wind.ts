/* ===== engine/fx/wind.ts — 바람: 천천히 바뀌는 바탕 바람 + 가끔 이는 돌풍 ===== */
/* 빗줄기 · 눈 · 연기 · 나뭇잎이 같은 바람을 받아야 한 세계로 읽힌다(비는 오른쪽으로 기우는데 연기는 왼쪽으로 가면 어색하다).
   세기는 px/s 로 — 입자마다 받는 정도(가벼운 눈은 많이, 무거운 비는 조금)는 부르는 쪽이 곱한다. 값은 시간의 함수라 저장할 것이 없다. */

/** 매끈한 1차원 잡음(-1~1) — 정수마다 고정 난수, 사이는 smoothstep */
function n1(t: number, seed: number): number {
  const h = (i: number) => { let x = Math.imul(i ^ seed, 0x2c1b3c6d); x ^= x >>> 12; x = Math.imul(x, 0x297a2d39); x ^= x >>> 15; return (x >>> 0) / 4294967295 * 2 - 1; };
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

export class Wind {
  declare base: number; declare gust: number; declare seed: number; declare storm: number;
  /** base — 바탕 바람의 세기(px/s) · gust — 돌풍의 세기 */
  constructor(base = 18, gust = 40, seed = 7) { this.base = base; this.gust = gust; this.seed = seed; this.storm = 0; }

  /** 시각 t(초) · 높이 y(px, 높을수록 세다 — 땅 가까이는 막힌다)의 가로 바람(px/s) */
  at(t: number, y = 0): number {
    const s = 1 + this.storm * 1.5;
    const slow = n1(t / 23, this.seed) * this.base;                       // 몇십 초에 걸쳐 바뀌는 바탕
    const g = Math.max(0, n1(t / 3.1, this.seed + 1)) ** 2 * this.gust;    // 가끔 이는 돌풍(한쪽 방향으로만)
    const hgt = y < 0 ? 1.25 : 1;
    return (slow + g * Math.sign(slow || 1)) * s * hgt;
  }
}
