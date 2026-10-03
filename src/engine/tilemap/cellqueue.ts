/* ===== engine/tilemap/cellqueue.ts — 바뀐 칸만 다시 보는 줄(유체 · 무너짐 따위의 칸 오토마타) ===== */
/* 세계 전체를 매 걸음 훑으면 5000×720 칸이라 못 견딘다. 칸이 바뀔 때 그 칸과 네 이웃을 줄에 세우고(wake), 걸음마다 줄에 선 칸만
   잰다(step). 잰 결과는 **다 잰 뒤 한꺼번에** 바꾼다 — 재는 도중에 바꾸면 줄 순서에 따라 한쪽으로만 번진다.
   갈래(channel)마다 줄과 걸음 간격이 따로다(물은 빠르게 · 용암은 느리게). */

export class CellQueue<R> {
  declare ww: number; declare wh: number;
  declare q: number[][]; declare mark: Uint8Array[]; declare acc: number[]; declare every: number[];

  /** ww·wh — 세계 칸 수 · every[j] — 갈래 j 의 걸음 간격(초) */
  constructor(ww: number, wh: number, every: number[]) {
    this.ww = ww; this.wh = wh; this.every = every.slice();
    this.q = every.map(() => []); this.mark = every.map(() => new Uint8Array(ww * wh)); this.acc = every.map(() => 0);
  }

  /** (x, y) 와 네 이웃을 모든 갈래의 줄에 세운다(테두리 한 칸은 건너뛴다 — 이웃을 볼 때 밖으로 나가지 않게) */
  wake(x: number, y: number): void {
    const { ww, wh, q, mark } = this;
    for (let d = 0; d < 5; d++) {
      const xx = x + (d === 1 ? -1 : d === 2 ? 1 : 0), yy = y + (d === 3 ? -1 : d === 4 ? 1 : 0);
      if (xx < 1 || yy < 1 || xx >= ww - 1 || yy >= wh - 1) continue;
      const k = yy * ww + xx;
      for (let j = 0; j < q.length; j++) if (!mark[j][k]) { mark[j][k] = 1; q[j].push(k); }
    }
  }

  /** 줄에 선 칸이 있는가 */
  busy(j?: number): boolean { return j === undefined ? this.q.some(a => a.length > 0) : this.q[j].length > 0; }

  /** 갈래 j 를 한 걸음 — 줄 앞에서 budget 칸까지 eval(k) 로 재고(null 이면 그대로), 다 잰 뒤 apply(결과들) */
  step(j: number, evalCell: (k: number) => R | null, apply: (out: R[]) => void, budget = 6000): void {
    const q = this.q[j], mark = this.mark[j];
    const todo = q.splice(0, Math.min(q.length, budget));
    const out: R[] = [];
    for (const k of todo) { mark[k] = 0; const r = evalCell(k); if (r) out.push(r); }
    apply(out);
  }

  /** 시간을 흘린다 — 간격이 찬 갈래마다 run(j) */
  tick(dt: number, run: (j: number) => void): void {
    for (let j = 0; j < this.q.length; j++) {
      this.acc[j] += dt;
      if (this.acc[j] < this.every[j]) continue;
      this.acc[j] = 0;
      if (this.q[j].length) run(j);
    }
  }
}
