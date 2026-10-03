/* ===== engine/core/tween.ts — 늦춰 움직이기(easing) · 값 옮기기 · 미뤄 하기 ===== */
/* 숫자가 한 박자에 툭 바뀌면 싸 보인다. 피해 숫자가 튀어 오르며 커졌다 줄고, 창이 미끄러져 들어오는 것은 다 이 곡선들이다.
   시간은 게임이 넘기는 dt 로만 흐른다(일시정지하면 같이 멈춘다). */

export type Ease = (t: number) => number;

export const EASE: Record<string, Ease> = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  outBounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

/** 튀어 오르는 크기 — t 0→1 동안 1 → peak → 1(맞는 순간 커졌다 가라앉는 숫자 · 아이콘) */
export function pop(t: number, peak = 1.5, at = 0.18): number {
  if (t <= 0) return 1;
  if (t < at) return 1 + (peak - 1) * EASE.outQuad(t / at);
  return 1 + (peak - 1) * (1 - EASE.inOutQuad(Math.min(1, (t - at) / (1 - at))));
}

interface Job { t: number; dur: number; from: number; to: number; ease: Ease; set: (v: number) => void; done?: () => void; delay: number }

/** 값 옮기기 · 미뤄 하기 묶음 — update(dt) 를 한 곳에서 부른다 */
export class Tweens {
  declare jobs: Job[];
  constructor() { this.jobs = []; }

  /** set(v) 를 dur 초 동안 from → to 로(ease 곡선). 돌려준 함수를 부르면 멈춘다. */
  to(from: number, to: number, dur: number, set: (v: number) => void, o: { ease?: Ease; delay?: number; done?: () => void } = {}): () => void {
    const j: Job = { t: 0, dur: Math.max(1e-6, dur), from, to, ease: o.ease || EASE.outCubic, set, done: o.done, delay: o.delay || 0 };
    this.jobs.push(j);
    return () => { const i = this.jobs.indexOf(j); if (i >= 0) this.jobs.splice(i, 1); };
  }
  /** sec 초 뒤에 fn */
  after(sec: number, fn: () => void): () => void { return this.to(0, 1, 1e-6, () => {}, { delay: sec, done: fn }); }

  update(dt: number): void {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i];
      if (j.delay > 0) { j.delay -= dt; if (j.delay > 0) continue; }
      j.t = Math.min(j.dur, j.t + dt);
      const k = j.ease(j.t / j.dur);
      j.set(j.from + (j.to - j.from) * k);
      if (j.t >= j.dur) { this.jobs.splice(i, 1); if (j.done) j.done(); }
    }
  }
  clear(): void { this.jobs.length = 0; }
  get busy(): boolean { return this.jobs.length > 0; }
}

/** 프레임 수와 상관없는 다가가기 — 1초 뒤 남는 거리 비율 keep(0.01 = 1초에 99% 다가감) */
export function approach(cur: number, target: number, keep: number, dt: number): number {
  return target + (cur - target) * Math.pow(keep, dt);
}
