/* ===== util.js — 수학, 난수, 노이즈 ===== */

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (v - a) / (b - a || 1);
export const TAU = Math.PI * 2;

export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** 결정론적 난수기 (mulberry32) */
export class RNG {
  constructor(seed) { this.s = (typeof seed === 'string' ? hashStr(seed) : (seed >>> 0)) || 1; }
  next() {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  /** 가중치 배열 [[값, 가중치], ...] */
  weighted(pairs) {
    let total = 0; for (const p of pairs) total += p[1];
    let r = this.next() * total;
    for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  }
}

/** 1D 값 노이즈 (부드러운 지형선) */
export function makeNoise1D(rng, octaves = 4) {
  const tables = [];
  for (let o = 0; o < octaves; o++) {
    const t = new Float32Array(512);
    for (let i = 0; i < 512; i++) t[i] = rng.next();
    tables.push(t);
  }
  return function (x, freq = 0.02, persist = 0.5) {
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
export function makeNoise2D(rng) {
  const P = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const grad = (h, x, y) => {
    switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; }
  };
  const raw = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const aa = P[P[X] + Y], ab = P[P[X] + Y + 1], ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return (lerp(x1, x2, v) + 1) * 0.5;
  };
  return function (x, y, freq = 0.05, oct = 3, persist = 0.5) {
    let sum = 0, amp = 1, max = 0, f = freq;
    for (let o = 0; o < oct; o++) { sum += raw(x * f, y * f) * amp; max += amp; amp *= persist; f *= 2; }
    return sum / max;
  };
}

/** 사각형 겹침 */
export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }
export function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

/** 한국어 조사 '로/으로' — 받침이 없거나 'ㄹ'이면 '로' */
export function josaRo(word) {
  const ch = word.charCodeAt(word.length - 1) - 0xAC00;
  if (ch < 0 || ch > 11171) return '로';
  const jong = ch % 28;
  return (jong === 0 || jong === 8) ? '로' : '으로';
}

/** 한국어 조사 짝 고르기 — josa('검', '이', '가') → '이'. 받침이 있으면 앞엣것. */
export function josa(word, withJong, noJong) {
  const s = String(word), ch = s.charCodeAt(s.length - 1) - 0xAC00;
  if (ch < 0 || ch > 11171) return noJong;
  return ch % 28 ? withJong : noJong;
}
export const iga = w => w + josa(w, '이', '가');
export const eulreul = w => w + josa(w, '을', '를');
export const eunneun = w => w + josa(w, '은', '는');

/** 숫자 포맷 */
/** 숫자 표기. */
export function fmt(n) {
  const v = Math.round(n);
  const a = Math.abs(v);
  if (a < 1e6) return v.toLocaleString('ko-KR');
  /* 반올림한 **표시값**으로 단위를 정한다. */
  let d = 1e6, u = 'M';
  if (a >= 1e9 || Math.abs(v / 1e6).toFixed(2) >= 1000) { d = 1e9; u = 'B'; }
  const t = (v / d).toFixed(2).replace(/\.?0+$/, '');
  return t + u;
}
export function pad2(n) { return n < 10 ? '0' + n : '' + n; }

/** 사용자 입력(플레이어 이름 등)을 innerHTML에 넣기 전에 이스케이프한다 */
export function escHtml(s) { return ('' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/** 색 보간 (#rrggbb) */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * amt), 0, 255); g = clamp(Math.round(g * amt), 0, 255); b = clamp(Math.round(b * amt), 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
export function mixHex(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}

/** 타일 텍스처용 결정론적 해시 (0..1) */
export function tileHash(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h >>> 8) / 16777216;
}

/** 배열 RLE 압축 (저장용) */
/* ★ 세이브의 타일·벽지·탐험 배열은 **글자열** RLE 다 — 사연: docs/code-history.md#h100 */
export const RLE_V = 0x100, RLE_N = 0x1000, RLE_MAX = 0x6FFF;
export function rleEncode(arr) {
  const out = ['r1'];
  let buf = '';
  let cur = arr[0], run = 1;
  const put = () => {
    buf += String.fromCharCode(RLE_V + cur, RLE_N + run);
    if (buf.length > 8192) { out.push(buf); buf = ''; }
  };
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === cur && run < RLE_MAX) run++;
    else { put(); cur = arr[i]; run = 1; }
  }
  put();
  out.push(buf);
  return out.join('');
}
export function rleDecode(pairs, len, Ctor) {
  const out = new Ctor(len);
  let i = 0;
  if (typeof pairs === 'string') {
    for (let p = 2; p + 1 < pairs.length; p += 2) {
      const v = pairs.charCodeAt(p) - RLE_V, n = pairs.charCodeAt(p + 1) - RLE_N;
      for (let k = 0; k < n && i < len; k++) out[i++] = v;
    }
    return out;
  }
  for (let p = 0; p < pairs.length; p += 2) {
    const v = pairs[p], n = pairs[p + 1];
    for (let k = 0; k < n && i < len; k++) out[i++] = v;
  }
  return out;
}
