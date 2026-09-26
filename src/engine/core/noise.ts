/* ===== engine/core/noise.ts — 값 노이즈(1D 지형선 · 2D 동굴·광맥) ===== */
import { lerp } from './math.js';
import type { RNG } from './rng.js';

/** 1D 값 노이즈 (부드러운 지형선) */
export function makeNoise1D(rng: RNG, octaves = 4): (x: number, freq?: number, persist?: number) => number {
  const tables: Float32Array[] = [];
  for (let o = 0; o < octaves; o++) {
    const t = new Float32Array(512);
    for (let i = 0; i < 512; i++) t[i] = rng.next();
    tables.push(t);
  }
  return function (x: number, freq = 0.02, persist = 0.5): number {
    let sum = 0, amp = 1, max = 0, f = freq;
    for (let o = 0; o < tables.length; o++) {
      const t = tables[o], p = x * f, i = Math.floor(p), fr = p - i;
      const a = t[i & 511], b = t[(i + 1) & 511];
      const s = fr * fr * (3 - 2 * fr);
      sum += lerp(a, b, s) * amp;
      max += amp; amp *= persist; f *= 2;
    }
    return sum / max;
  };
}

/** 2D 값 노이즈 (동굴, 광맥) */
export function makeNoise2D(rng: RNG): (x: number, y: number, freq?: number, oct?: number, persist?: number) => number {
  const P = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const grad = (h: number, x: number, y: number): number => {
    switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; }
  };
  const raw = (x: number, y: number): number => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const aa = P[P[X] + Y], ab = P[P[X] + Y + 1], ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return (lerp(x1, x2, v) + 1) * 0.5;
  };
  return function (x: number, y: number, freq = 0.05, oct = 3, persist = 0.5): number {
    let sum = 0, amp = 1, max = 0, f = freq;
    for (let o = 0; o < oct; o++) { sum += raw(x * f, y * f) * amp; max += amp; amp *= persist; f *= 2; }
    return sum / max;
  };
}
