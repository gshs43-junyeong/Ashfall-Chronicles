/* ===== engine/core/spatial.ts — 공간 해시: 근처에 있는 것만 빨리 찾기 ===== */
/* 투사체 수십 × 몹 수백을 전부 맞대 보면 프레임마다 수만 번 겹침을 잰다. 칸(cell px) 단위 바구니에 넣어 두고
   질의 사각형이 걸치는 바구니만 본다. 매 프레임 비우고 다시 넣는 쓰임새(움직이는 것)를 기본으로 한다 — 넣기가 싸다. */

export interface Boxed { x: number; y: number; w: number; h: number }

export class SpatialHash<T extends Boxed> {
  declare cell: number;
  declare buckets: Map<number, T[]>;
  declare stamp: Map<T, number>;
  declare q: number;

  constructor(cell = 64) { this.cell = cell; this.buckets = new Map(); this.stamp = new Map(); this.q = 0; }

  key(cx: number, cy: number): number { return (cy + 32768) * 65536 + (cx + 32768); }

  clear(): void { for (const b of this.buckets.values()) b.length = 0; }

  insert(o: T): void {
    const c = this.cell;
    const x0 = Math.floor(o.x / c), x1 = Math.floor((o.x + o.w) / c), y0 = Math.floor(o.y / c), y1 = Math.floor((o.y + o.h) / c);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = this.key(cx, cy);
      let b = this.buckets.get(k);
      if (!b) { b = []; this.buckets.set(k, b); }
      b.push(o);
    }
  }

  /** 다 비우고 list 를 다시 넣는다(조건 keep 을 통과한 것만) */
  rebuild(list: Iterable<T>, keep?: (o: T) => boolean): void {
    this.clear();
    for (const o of list) if (!keep || keep(o)) this.insert(o);
  }

  /** 사각형(x, y, w, h)에 걸치는 바구니의 것들을 한 번씩 — 실제로 겹치는지는 부르는 쪽이 본다. fn 이 true 면 멈춘다. */
  query(x: number, y: number, w: number, h: number, fn: (o: T) => boolean | void): void {
    const c = this.cell, q = ++this.q;
    const x0 = Math.floor(x / c), x1 = Math.floor((x + w) / c), y0 = Math.floor(y / c), y1 = Math.floor((y + h) / c);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const b = this.buckets.get(this.key(cx, cy));
      if (!b) continue;
      for (const o of b) {
        if (this.stamp.get(o) === q) continue;          // 여러 바구니에 걸친 것을 두 번 보지 않는다
        this.stamp.set(o, q);
        if (fn(o)) return;
      }
    }
  }

  /** 원(cx, cy, r) 근처의 것들 — 배열로 */
  near(cx: number, cy: number, r: number): T[] {
    const out: T[] = [];
    this.query(cx - r, cy - r, r * 2, r * 2, o => { out.push(o); });
    return out;
  }
}
