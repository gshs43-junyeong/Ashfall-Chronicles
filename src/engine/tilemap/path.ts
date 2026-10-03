/* ===== engine/tilemap/path.ts — 발로 걷는 것의 길찾기(A*) ===== */
/* 중력이 있는 칸 세상에서는 "빈 칸 사이"가 아니라 "설 수 있는 자리 사이"를 잇는다. 자리 = 몸(w×h 칸)이 들어가고 발밑이 막힌 칸.
   잇는 법은 셋: 걷기(옆 자리 · 한 칸 턱은 걸음으로 오른다) · 뛰기(jump 칸까지 위로, 옆으로 2칸까지 — 머리 위가 트여야) · 떨어지기(옆으로 나가 아래 자리까지).
   좌표는 발 칸(몸 맨 아래 왼쪽 칸). 무엇이 막혔는지는 게임이 solid 로 준다. */

export type PathMove = 'start' | 'walk' | 'jump' | 'drop';
export interface PathNode { x: number; y: number; move: PathMove; up: number }

export interface GroundPathOptions {
  solid: (x: number, y: number) => boolean;      // 몸이 못 들어가는 칸
  floor?: (x: number, y: number) => boolean;     // 설 수 있는 바닥(기본 = solid) — 발판처럼 지나가되 서는 칸을 넣는다
  w?: number; h?: number;                        // 몸 크기(칸)
  jump?: number;                                 // 뛰어 오를 수 있는 높이(칸)
  maxFall?: number;                              // 떨어져도 되는 높이(칸)
  maxNodes?: number;                             // 이만큼 펼치고 못 찾으면 포기(가장 가까이 간 데까지 돌려준다)
}

/** 이진 힙 — 우선순위 큐(작은 f 먼저) */
class Heap {
  declare k: number[]; declare f: number[];
  constructor() { this.k = []; this.f = []; }
  get size(): number { return this.k.length; }
  push(k: number, f: number): void {
    const K = this.k, F = this.f;
    let i = K.length; K.push(k); F.push(f);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (F[p] <= f) break;
      K[i] = K[p]; F[i] = F[p]; i = p;
    }
    K[i] = k; F[i] = f;
  }
  pop(): number {
    const K = this.k, F = this.f, top = K[0], lk = K.pop()!, lf = F.pop()!;
    const n = K.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && F[c + 1] < F[c]) c++;
        if (F[c] >= lf) break;
        K[i] = K[c]; F[i] = F[c]; i = c;
      }
      K[i] = lk; F[i] = lf;
    }
    return top;
  }
}

/** 몸이 (x, y)(발 칸)에 들어가는가 */
function fits(o: Required<GroundPathOptions>, x: number, y: number): boolean {
  for (let dx = 0; dx < o.w; dx++) for (let dy = 0; dy < o.h; dy++) if (o.solid(x + dx, y - dy)) return false;
  return true;
}
/** 설 수 있는가 — 들어가고, 발밑 어느 한 칸이라도 바닥 */
function stands(o: Required<GroundPathOptions>, x: number, y: number): boolean {
  if (!fits(o, x, y)) return false;
  for (let dx = 0; dx < o.w; dx++) if (o.floor(x + dx, y + 1)) return true;
  return false;
}

/** (sx, sy) → (gx, gy) 발 칸끼리의 길. 닿지 못하면 가장 가까이 간 자리까지(그것도 없으면 null). 첫 칸은 출발점(move 'start'). */
export function findGroundPath(sx: number, sy: number, gx: number, gy: number, opt: GroundPathOptions): PathNode[] | null {
  const o: Required<GroundPathOptions> = { floor: opt.solid, w: 1, h: 2, jump: 2, maxFall: 12, maxNodes: 1500, ...opt };
  /* 출발점이 공중이면(뛰는 중) 바로 아래 자리에서 시작한다 */
  for (let i = 0; i < o.maxFall && !stands(o, sx, sy) && fits(o, sx, sy + 1); i++) sy++;
  if (!stands(o, sx, sy)) return null;
  const KEY = (x: number, y: number) => (y + 4096) * 8192 + (x + 4096);
  const H = (x: number, y: number) => Math.abs(x - gx) + Math.abs(y - gy) * 0.8;
  const g = new Map<number, number>(), from = new Map<number, number>(), how = new Map<number, PathNode>();
  const open = new Heap(), closed = new Set<number>();
  const s0 = KEY(sx, sy);
  g.set(s0, 0); how.set(s0, { x: sx, y: sy, move: 'start', up: 0 }); open.push(s0, H(sx, sy));
  let best = s0, bestH = H(sx, sy), n = 0;
  const relax = (cur: number, x: number, y: number, move: PathMove, up: number, cost: number) => {
    const k = KEY(x, y);
    if (closed.has(k)) return;
    const ng = g.get(cur)! + cost;
    if (ng >= (g.get(k) ?? Infinity)) return;
    g.set(k, ng); from.set(k, cur); how.set(k, { x, y, move, up });
    open.push(k, ng + H(x, y));
  };
  while (open.size && n++ < o.maxNodes) {
    const cur = open.pop();
    if (closed.has(cur)) continue;
    closed.add(cur);
    const c = how.get(cur)!, x = c.x, y = c.y;
    const h = H(x, y);
    if (h < bestH) { bestH = h; best = cur; }
    if (x === gx && y === gy) { best = cur; break; }
    for (const d of [-1, 1]) {
      // 걷기 · 한 칸 턱
      if (stands(o, x + d, y)) relax(cur, x + d, y, 'walk', 0, 1);
      else if (stands(o, x + d, y - 1) && fits(o, x, y - 1)) relax(cur, x + d, y - 1, 'walk', 1, 1.4);
      // 떨어지기 — 옆으로 한 칸 나가 곧게
      else if (fits(o, x + d, y)) {
        let yy = y;
        while (yy - y < o.maxFall && !stands(o, x + d, yy) && fits(o, x + d, yy + 1)) yy++;
        if (stands(o, x + d, yy) && yy > y) relax(cur, x + d, yy, 'drop', 0, 1 + (yy - y) * 0.25);
      }
    }
    // 뛰기 — 머리 위가 k 칸 트였으면 옆 0~2칸의 그 높이 자리로
    for (let k = 1; k <= o.jump; k++) {
      if (!fits(o, x, y - k)) break;
      for (let d = -2; d <= 2; d++) {
        if (d === 0 && k < 2) continue;
        const tx = x + d, ty = y - k;
        if (d !== 0 && !fits(o, x + Math.sign(d), ty)) continue;     // 옆으로 넘어가는 길이 트였나
        if (Math.abs(d) === 2 && !fits(o, x + Math.sign(d) * 2, ty)) continue;
        if (stands(o, tx, ty)) relax(cur, tx, ty, 'jump', k, 1.5 + k * 0.6 + Math.abs(d) * 0.3);
      }
    }
  }
  if (best === s0 && !(sx === gx && sy === gy)) return null;
  const out: PathNode[] = [];
  for (let k: number | undefined = best; k !== undefined; k = from.get(k)) out.push(how.get(k)!);
  return out.reverse();
}

/** 길 따라가기 — 지금 자리(칸 실수 좌표: 몸 가운데 x · 발 y)에서 다음에 할 일. 지난 마디는 알아서 넘긴다. */
export class PathFollower {
  declare path: PathNode[]; declare i: number; declare age: number;
  constructor() { this.path = []; this.i = 0; this.age = 0; }
  set(path: PathNode[] | null): void { this.path = path || []; this.i = this.path.length > 1 ? 1 : this.path.length; this.age = 0; }
  get done(): boolean { return this.i >= this.path.length; }
  get next(): PathNode | null { return this.path[this.i] || null; }
  /** dir: 가로 방향(-1·0·1) · jump: 지금 뛰어야 할 높이(칸, 0 이면 안 뜀) · bodyW: 몸 폭(칸) */
  steer(fx: number, fy: number, onGround: boolean, bodyW = 1): { dir: number; jump: number } {
    let n = this.next;
    // 다음 마디에 닿았으면 넘긴다(가로 0.35칸 · 세로 같은 줄 또는 떨어지는 중이면 그 아래)
    while (n) {
      const cx = n.x + bodyW / 2, dx = cx - fx, dy = n.y + 1 - fy;
      if (Math.abs(dx) < 0.35 && Math.abs(dy) < 0.6) { this.i++; n = this.next; continue; }
      break;
    }
    if (!n) return { dir: 0, jump: 0 };
    const dx = n.x + bodyW / 2 - fx;
    const dir = Math.abs(dx) < 0.15 ? 0 : Math.sign(dx);
    const jump = onGround && (n.move === 'jump' || (n.move === 'walk' && n.up > 0)) && n.y + 1 < fy - 0.3 ? Math.max(1, n.up) : 0;
    return { dir, jump };
  }
}

/** 나는 것의 길(A*) — 몸(w×h 칸)이 들어가는 빈 칸끼리 8방향으로(모서리를 깎지 않게 대각선은 양옆이 트였을 때만).
    좌표는 몸 왼쪽 위 칸. 못 닿으면 가장 가까이 간 데까지. 결과는 칸 좌표 목록(첫 칸은 출발점). */
export function findOpenPath(sx: number, sy: number, gx: number, gy: number,
  opt: { solid: (x: number, y: number) => boolean; w?: number; h?: number; maxNodes?: number }): [number, number][] | null {
  const w = opt.w || 1, h = opt.h || 1, maxNodes = opt.maxNodes || 1200;
  const free = (x: number, y: number) => { for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) if (opt.solid(x + dx, y + dy)) return false; return true; };
  if (!free(sx, sy)) return null;
  const KEY = (x: number, y: number) => (y + 4096) * 8192 + (x + 4096);
  const H = (x: number, y: number) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  const g = new Map<number, number>(), from = new Map<number, number>(), at = new Map<number, [number, number]>();
  const open = new Heap(), closed = new Set<number>();
  const s0 = KEY(sx, sy);
  g.set(s0, 0); at.set(s0, [sx, sy]); open.push(s0, H(sx, sy));
  let best = s0, bestH = H(sx, sy), n = 0;
  while (open.size && n++ < maxNodes) {
    const cur = open.pop();
    if (closed.has(cur)) continue;
    closed.add(cur);
    const [x, y] = at.get(cur)!, hh = H(x, y);
    if (hh < bestH) { bestH = hh; best = cur; }
    if (x === gx && y === gy) { best = cur; break; }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
      const k = KEY(nx, ny);
      if (closed.has(k)) continue;
      const ng = g.get(cur)! + (dx && dy ? 1.41 : 1);
      if (ng >= (g.get(k) ?? Infinity)) continue;
      g.set(k, ng); from.set(k, cur); at.set(k, [nx, ny]); open.push(k, ng + H(nx, ny));
    }
  }
  if (best === s0) return null;
  const out: [number, number][] = [];
  for (let k: number | undefined = best; k !== undefined; k = from.get(k)) out.push(at.get(k)!);
  return out.reverse();
}
