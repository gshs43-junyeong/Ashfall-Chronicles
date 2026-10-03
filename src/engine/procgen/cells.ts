/* ===== engine/procgen/cells.ts — 칸 덩어리 다루기: 이어진 칸 찾기 · 상자 집합 · 셀룰러 오토마타 · 고르게 흩뿌리기 ===== */
/* 칸 번호는 k = y·ww + x(세계 폭 ww). 무엇이 "같은 덩어리"인지는 부르는 쪽이 pass 로 정한다 — 엔진은 타일 뜻을 모른다. */

const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

/** (sx, sy) 에서 이어진 칸들(pass 가 참인 칸만) — 깊이 우선, 이웃 순서 오른쪽·왼쪽·아래·위.
    출발 칸은 pass 일 때만 맨 앞에 든다(캔 자리처럼 이미 비었으면 둘레에서 시작). limit 칸에서 멈춘다. diag 면 대각선도 잇는다. */
export function floodFill(sx: number, sy: number, pass: (x: number, y: number) => boolean, limit = 1e6, diag = false): [number, number][] {
  const nb = diag ? N8 : N4, seen = new Set<string | number>(), out: [number, number][] = [];
  const key = (x: number, y: number) => (y + 1e5) * 4e5 + (x + 1e5);
  seen.add(key(sx, sy));
  if (pass(sx, sy)) out.push([sx, sy]);
  const st: [number, number][] = [[sx, sy]];
  while (st.length && out.length < limit) {
    const [x, y] = st.pop()!;
    for (const [dx, dy] of nb) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (seen.has(k) || !pass(nx, ny)) continue;
      seen.add(k); out.push([nx, ny]); st.push([nx, ny]);
    }
  }
  return out;
}

/** 넓이 우선 거리 — 출발 칸들에서 pass 칸을 따라 몇 걸음인지(닿지 못하면 -1). 범위 [x0,y0]~[x0+w, y0+h) 안만. */
export function distanceField(starts: [number, number][], x0: number, y0: number, w: number, h: number,
  pass: (x: number, y: number) => boolean, diag = false): Int32Array {
  const d = new Int32Array(w * h).fill(-1), q = new Int32Array(w * h), nb = diag ? N8 : N4;
  let qh = 0, qt = 0;
  for (const [x, y] of starts) {
    const lx = x - x0, ly = y - y0;
    if (lx < 0 || ly < 0 || lx >= w || ly >= h || d[ly * w + lx] >= 0) continue;
    d[ly * w + lx] = 0; q[qt++] = ly * w + lx;
  }
  while (qh < qt) {
    const i = q[qh++], lx = i % w, ly = (i / w) | 0;
    for (const [dx, dy] of nb) {
      const nx = lx + dx, ny = ly + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (d[j] >= 0 || !pass(x0 + nx, y0 + ny)) continue;
      d[j] = d[i] + 1; q[qt++] = j;
    }
  }
  return d;
}

/** 칸 집합 — Set 과 같은 쓰임(has · add · size · 순회)을 상자 크기의 Uint8Array 로 한다. 상자 밖 칸은 Set 으로 넘친다.
    큰 생성 검사(유적 통행)에서 Set 이 생성 시간의 대부분을 먹었다 — 상자 안 접근은 배열 하나로 끝난다. */
export class BoxSet {
  declare bh: number; declare bw: number; declare list: number[]; declare m: Uint8Array; declare out: Set<number> | null;
  declare ww: number; declare x0: number; declare y0: number;

  /** box = [x0, y0, x1, y1](칸, 끝 포함) · pad = 둘레 여유 · ww = 칸 번호를 푸는 세계 폭 */
  constructor(box: number[], pad: number, ww: number) {
    this.ww = ww;
    this.x0 = box[0] - pad; this.y0 = box[1] - pad;
    this.bw = box[2] - box[0] + 1 + pad * 2; this.bh = box[3] - box[1] + 1 + pad * 2;
    this.m = new Uint8Array(this.bw * this.bh); this.list = []; this.out = null;
  }
  _i(k: number): number {
    const y = (k / this.ww) | 0, x = k - y * this.ww, lx = x - this.x0, ly = y - this.y0;
    return lx >= 0 && ly >= 0 && lx < this.bw && ly < this.bh ? ly * this.bw + lx : -1;
  }
  has(k: number): boolean { const i = this._i(k); return i >= 0 ? this.m[i] === 1 : !!(this.out && this.out.has(k)); }
  add(k: number): this {
    const i = this._i(k);
    if (i >= 0) { if (this.m[i]) return this; this.m[i] = 1; }
    else { this.out = this.out || new Set(); if (this.out.has(k)) return this; this.out.add(k); }
    this.list.push(k); return this;
  }
  get size(): number { return this.list.length; }
  values(): IterableIterator<number> { return this.list.values(); }
  [Symbol.iterator](): IterableIterator<number> { return this.list[Symbol.iterator](); }
}

/** 셀룰러 오토마타 한 번 — 칸마다 8이웃 중 찬 칸 수로 다음 상태를 정한다(birth 이상이면 차고, survive 미만이면 빈다).
    동굴 벽을 둥글게 다듬거나 얼룩 무늬(이끼 · 광맥 덩어리)를 만들 때. grid 는 w×h 의 0/1, 결과는 새 배열. 바깥은 edge(기본 1 = 벽). */
export function automataStep(grid: Uint8Array, w: number, h: number, birth = 5, survive = 4, edge = 1): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let n = 0;
    for (const [dx, dy] of N8) {
      const nx = x + dx, ny = y + dy;
      n += nx < 0 || ny < 0 || nx >= w || ny >= h ? edge : grid[ny * w + nx];
    }
    const k = y * w + x;
    out[k] = grid[k] ? (n >= survive ? 1 : 0) : (n >= birth ? 1 : 0);
  }
  return out;
}

/** 고르게 흩뿌리기(포아송 원반) — 서로 r 이상 떨어진 점들. 균일 난수로 뿌리면 뭉치고 빈 데가 생긴다. rand 는 0~1 난수(게임의 씨앗 난수를 넘길 것). */
export function poissonDisc(w: number, h: number, r: number, rand: () => number, tries = 20): [number, number][] {
  const cell = r / Math.SQRT2, gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const grid = new Int32Array(gw * gh).fill(-1), pts: [number, number][] = [], active: number[] = [];
  const add = (x: number, y: number) => { pts.push([x, y]); active.push(pts.length - 1); grid[((y / cell) | 0) * gw + ((x / cell) | 0)] = pts.length - 1; };
  add(rand() * w, rand() * h);
  while (active.length) {
    const ai = (rand() * active.length) | 0, [px, py] = pts[active[ai]];
    let placed = false;
    for (let t = 0; t < tries && !placed; t++) {
      const a = rand() * Math.PI * 2, d = r * (1 + rand());
      const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const gx = (x / cell) | 0, gy = (y / cell) | 0;
      let ok = true;
      for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && ok; yy++)
        for (let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) {
          const j = grid[yy * gw + xx];
          if (j >= 0 && Math.hypot(pts[j][0] - x, pts[j][1] - y) < r) { ok = false; break; }
        }
      if (ok) { add(x, y); placed = true; }
    }
    if (!placed) active.splice(ai, 1);
  }
  return pts;
}

/** 무게로 하나 고르기 — { 이름: 무게 } 에서. rand 는 0~1 난수 */
export function weightedKey<K extends string>(w: Record<K, number>, rand: () => number): K {
  const ks = Object.keys(w) as K[];
  let r = rand() * ks.reduce((s, k) => s + w[k], 0);
  for (const k of ks) { r -= w[k]; if (r <= 0) return k; }
  return ks[ks.length - 1];
}
