/* ===== engine/core/timescale.ts — 시간 늦추기: 손맛의 한 박자(히트스톱) · 느린 화면 ===== */
/* 세게 맞힌 순간 세계가 아주 잠깐 거의 멈추면 "맞았다"가 손으로 느껴진다. 여러 번 겹쳐도 가장 긴 것 하나만(cap 까지) —
   더해 버리면 연타에 화면이 끈적하게 멈춘다. 느린 화면(slow)은 보스가 쓰러질 때처럼 길게 늦추는 것. */

export class TimeScale {
  declare stopT: number; declare stopF: number; declare slowT: number; declare slowF: number;
  constructor() { this.stopT = 0; this.stopF = 0.12; this.slowT = 0; this.slowF = 1; }

  /** 히트스톱 — sec 초 동안 factor 배로(기본 0.12). 이미 걸려 있으면 더 긴 쪽, cap 초를 넘지 않는다 */
  hit(sec: number, cap = 0.12, factor = 0.12): void {
    this.stopT = Math.min(cap, Math.max(this.stopT, sec || 0)); this.stopF = factor;
  }
  /** 느린 화면 — sec 초 동안 factor 배(끝으로 갈수록 제 빠르기로 돌아온다) */
  slow(sec: number, factor = 0.4): void { this.slowT = Math.max(this.slowT, sec); this.slowF = factor; }

  /** 진짜 dt → 세계에 흘릴 dt. 늦추는 동안의 시간은 진짜 시간으로 줄인다(멈춘 채 끝나지 않게) */
  step(dt: number): number {
    let k = 1;
    if (this.stopT > 0) { this.stopT -= dt; k = Math.min(k, this.stopF); }
    if (this.slowT > 0) { const t = Math.min(1, this.slowT); this.slowT -= dt; k = Math.min(k, this.slowF + (1 - this.slowF) * (1 - t)); }
    return dt * k;
  }
  get active(): boolean { return this.stopT > 0 || this.slowT > 0; }
  clear(): void { this.stopT = 0; this.slowT = 0; }
}
