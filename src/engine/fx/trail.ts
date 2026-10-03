/* ===== engine/fx/trail.ts — 잔상: 빠르게 움직인 몸이 남기는 흐린 그림들 ===== */
/* 대시처럼 한순간에 멀리 가는 움직임은 눈이 따라가지 못해 순간이동처럼 보인다. 지나간 자리에 몸 그림을 몇 장 남겨
   흐리며 지우면 "빠르게 지나갔다"로 읽힌다. 무엇을 그릴지(그림 · 장 · 방향)는 게임이 넣고 그린다. */

export interface TrailShot<T> { x: number; y: number; t: number; max: number; d: T }

export class Afterimages<T> {
  declare shots: TrailShot<T>[]; declare gap: number; declare acc: number; declare life: number; declare max: number;
  /** gap — 몇 초마다 한 장 · life — 한 장이 남는 시간 · max — 한꺼번에 남는 장 수 */
  constructor(gap = 0.03, life = 0.22, max = 8) { this.shots = []; this.gap = gap; this.acc = 0; this.life = life; this.max = max; }

  /** 매 프레임 — on 이면(빠르게 움직이는 중) gap 마다 한 장을 찍는다 */
  update(dt: number, on: boolean, x: number, y: number, d: () => T): void {
    for (let i = this.shots.length - 1; i >= 0; i--) { this.shots[i].t -= dt; if (this.shots[i].t <= 0) this.shots.splice(i, 1); }
    if (!on) { this.acc = this.gap; return; }
    this.acc += dt;
    if (this.acc < this.gap) return;
    this.acc = 0;
    this.shots.push({ x, y, t: this.life, max: this.life, d: d() });
    if (this.shots.length > this.max) this.shots.shift();
  }
  /** 오래된 것부터 — draw(장, 투명도 0~1) */
  draw(fn: (s: TrailShot<T>, alpha: number) => void): void { for (const s of this.shots) fn(s, s.t / s.max); }
  clear(): void { this.shots.length = 0; }
}
