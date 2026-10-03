/* ===== engine/tilemap/lightfield.ts — 화면 범위 빛 판: 씨앗 → 점 광원(그늘) → 해 → 번지기 ===== */
/* 한 프레임의 순서: begin(창) → 게임이 칸마다 씨앗(L)·막힘(op)·줄어듦(dec · decP)·햇빛 통과(trans)를 채운다 → stampPoint(광원마다)
   → sun(방향광) → finish(번지기). 두 겹을 따로 번지게 해 큰 쪽을 쓴다 — L(햇빛 · 약한 빛 · 액체 빛, 넓게 번짐)과
   Lp(점 광원, 광선으로 그늘을 잰 뒤 튀는 빛만 조금). 점 광원 판은 광원 칸마다 저장하고, 둘레 칸이 바뀌었을 때(touch)만 다시 잰다.
   ★ 막힌 칸은 빛을 받되 트인 칸으로 넘기지 않는다(sweepLightGrid op) — 벽 너머 빈 방이 밝아지지 않게. */
import { castPointLight, castSunlight, sweepLightGrid } from './light.js';

export interface LightFieldConfig {
  fall: number;                         // 점 광원 — 칸(거리)당 줄어드는 세기
  tint: number;                         // 빛 색의 세기(0~1)
  blocked(x: number, y: number): boolean;   // 그 칸이 점 광원의 빛을 막는가(세계 좌표)
  key(x: number, y: number): number;    // 광원 칸 번호(저장 열쇠)
}

interface Patch { s: number; x: number; y: number; r: number; v: Float32Array; used: number }

export class LightField {
  declare cfg: LightFieldConfig;
  declare L: Float32Array; declare Lp: Float32Array; declare col: Float32Array; declare op: Uint8Array;
  declare dec: Float32Array; declare decP: Float32Array; declare sunV: Float32Array; declare trans: Float32Array;
  declare x0: number; declare y0: number; declare w: number; declare h: number; declare n: number;
  declare cache: Map<number, Patch>; declare dirty: number[]; declare frame: number; declare sunOn: boolean;

  constructor(cfg: LightFieldConfig) {
    this.cfg = cfg; this.cache = new Map(); this.dirty = []; this.frame = 0;
    this.x0 = this.y0 = this.w = this.h = this.n = 0; this.sunOn = false;
    this.alloc(1024);
  }
  alloc(n: number): void {
    this.L = new Float32Array(n); this.Lp = new Float32Array(n); this.col = new Float32Array(n * 3);
    this.op = new Uint8Array(n); this.dec = new Float32Array(n); this.decP = new Float32Array(n);
    this.sunV = new Float32Array(n); this.trans = new Float32Array(n);
  }

  /** 새 창 — (x0, y0) 부터 w×h 칸. 버퍼를 비우고, 바뀐 칸 둘레의 광원 판을 버린다. 칸 번호 k = (y-y0)·w + (x-x0). */
  begin(x0: number, y0: number, w: number, h: number): void {
    const n = w * h;
    if (this.L.length < n) this.alloc(n + 64);
    this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; this.n = n; this.sunOn = false;
    this.L.fill(0, 0, n); this.Lp.fill(0, 0, n); this.col.fill(0, 0, n * 3);
    this.frame++;
    this.flush();
  }

  /** 칸 (x, y) 의 막힘이나 빛이 바뀌었다 — 그 둘레 광원 판을 다음 begin 에서 버린다 */
  touch(x: number, y: number): void { this.dirty.push(x, y); }

  flush(): void {
    const cache = this.cache, d = this.dirty;
    if (d.length) {
      for (let i = 0; i < d.length; i += 2) {
        const x = d[i], y = d[i + 1];
        for (const [key, e] of cache) if (Math.abs(e.x - x) <= e.r && Math.abs(e.y - y) <= e.r) cache.delete(key);
      }
      d.length = 0;
    }
    if (cache.size > 3000) for (const [key, e] of cache) if (this.frame - e.used > 600) cache.delete(key);   // 오래 안 본 광원은 버린다
  }

  /** 점 광원 하나를 찍는다 — 세기 s, 색 rgb(0~1 셋, 없으면 null). keep 이면 판을 저장해 두고 다시 쓴다(움직이는 빛은 false). */
  stampPoint(x: number, y: number, s: number, rgb: number[] | null, keep = true): void {
    const c = this.cfg;
    let p: { r: number; v: Float32Array };
    if (keep) {
      const key = c.key(x, y);
      let e = this.cache.get(key);
      if (!e || e.s !== s) {
        const q = castPointLight(s, c.fall, (dx, dy) => c.blocked(x + dx, y + dy));
        e = { s, x, y, r: q.r, v: q.v, used: 0 };
        this.cache.set(key, e);
      }
      e.used = this.frame; p = e;
    } else p = castPointLight(s, c.fall, (dx, dy) => c.blocked(x + dx, y + dy));
    const r = p.r, n = 2 * r + 1, Lp = this.Lp, col = this.col, w = this.w, h = this.h;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy - this.y0;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx - this.x0;
        if (xx < 0 || xx >= w) continue;
        const v = p.v[(dy + r) * n + dx + r];
        if (v <= 0) continue;
        const k = yy * w + xx;
        if (v > Lp[k]) Lp[k] = v;
        /* 빛 색은 더하지 않고 센 쪽을 남긴다 — 횃불이 줄지어 있으면 더한 색이 넘쳐 노랗게 바랬다 */
        if (rgb) { const f = v / s, a = f * f * f * c.tint, j = k * 3; col[j] = Math.max(col[j], rgb[0] * a); col[j + 1] = Math.max(col[j + 1], rgb[1] * a); col[j + 2] = Math.max(col[j + 2], rgb[2] * a); }
      }
    }
  }

  /** 방향광 — (sx, sy) 해 쪽 방향 · sky(x, y) 창 밖 칸이 하늘에 트였나 · level(k, 닿는 정도 0~1) 그 칸이 받는 빛.
      막힌 칸(해 쪽 겉면)은 번지기 전에 L 에 넣어 땅속으로 부드럽게 번지고, 트인 칸은 finish 에서 번진 뒤에 얹는다. */
  sun(sx: number, sy: number, sky: (x: number, y: number) => number, level: (k: number, raw: number) => number): void {
    const S = this.sunV, n = this.n, L = this.L, op = this.op;
    castSunlight(S, this.w, this.h, this.x0, this.y0, this.trans, sx, sy, sky);
    for (let k = 0; k < n; k++) {
      if (S[k] <= 0.01) { S[k] = 0; continue; }
      S[k] = level(k, S[k]);
      if (op[k] && S[k] > L[k]) L[k] = S[k];
    }
    this.sunOn = true;
  }

  /** 번지기 — L 은 passes 번, Lp(튀는 빛)는 한 번. 큰 쪽을 남기고, 해가 곧게 닿는 트인 칸을 마지막에 얹는다. */
  finish(passes = 2): void {
    const { L, Lp, n, w, h, op } = this;
    sweepLightGrid(L, w, h, passes, this.dec, op);
    sweepLightGrid(Lp, w, h, 1, this.decP, op);
    for (let k = 0; k < n; k++) if (Lp[k] > L[k]) L[k] = Lp[k];
    if (this.sunOn) { const S = this.sunV; for (let k = 0; k < n; k++) if (!op[k] && S[k] > L[k]) L[k] = S[k]; }
  }

  /** 세계 칸의 밝기(창 밖은 0) */
  at(x: number, y: number): number {
    const lx = x - this.x0, ly = y - this.y0;
    if (lx < 0 || ly < 0 || lx >= this.w || ly >= this.h) return 0;
    return this.L[ly * this.w + lx];
  }
  /** 세계 칸의 빛 색(0~1 rgb, 창 밖이면 null) */
  colorAt(x: number, y: number): Float32Array | null {
    const lx = x - this.x0, ly = y - this.y0;
    if (lx < 0 || ly < 0 || lx >= this.w || ly >= this.h) return null;
    const k = (ly * this.w + lx) * 3;
    return this.col.subarray(k, k + 3);
  }
}
