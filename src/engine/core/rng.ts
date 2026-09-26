/* ===== engine/core/rng.ts — 결정론적 해시 · 난수 ===== */
/* ★ 세계 생성이 씨앗에서 이것만 뽑는다 — 한 줄이라도 바꾸면 모든 세계가 달라진다(tests/gen-hash). */

export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** 결정론적 난수기 (mulberry32) */
export class RNG {
  declare s: number;   // declare — 필드 정의를 따로 내지 않는다(예전 JS 와 같은 모양)
  constructor(seed: string | number) { this.s = (typeof seed === 'string' ? hashStr(seed) : (seed >>> 0)) || 1; }
  next(): number {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number { return a + this.next() * (b - a); }
  int(a: number, b: number): number { return Math.floor(this.range(a, b + 1)); }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: ArrayLike<T>): T { return arr[Math.floor(this.next() * arr.length)]; }
  /** 가중치 배열 [[값, 가중치], ...] */
  weighted<T>(pairs: ReadonlyArray<readonly [T, number]>): T {
    let total = 0; for (const p of pairs) total += p[1];
    let r = this.next() * total;
    for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  }
}

/** 타일 텍스처용 결정론적 해시 (0..1) */
export function tileHash(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h >>> 8) / 16777216;
}
