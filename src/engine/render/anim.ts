/* ===== engine/render/anim.ts — 그림 장 넘기기 · 박자 ===== */
/* 장 고르기는 시간의 함수다(엔티티마다 따로 시계를 들 필요가 없다). 발을 딛는 장 · 날개를 치는 장처럼 **그 장에 들어서는 순간**에
   소리나 먼지를 내야 할 때는 Beat 가 장이 바뀌는 때만 한 번 알려 준다(그 장에 머무는 프레임마다 울리지 않게). */

/** t 초에 fps 로 n 장을 돌 때의 장 번호(start 부터) · phase 로 개체마다 어긋나게 */
export function cycleFrame(t: number, fps: number, n: number, start = 0, phase = 0): number {
  return start + (((Math.floor(t * fps + phase) % n) + n) % n);
}

/** 한 번만 도는 장(공격 · 쓰러짐) — 끝 장에서 멈춘다 */
export function onceFrame(elapsed: number, fps: number, n: number, start = 0): number {
  return start + Math.min(n - 1, Math.max(0, Math.floor(elapsed * fps)));
}

/** 박자 — 지금 장이 beats 가운데 하나로 **막 바뀌었으면** true */
export class Beat {
  declare last: number;
  constructor() { this.last = -1; }
  hit(frame: number, beats: ReadonlyArray<number>): boolean {
    const changed = frame !== this.last;
    this.last = frame;
    return changed && beats.indexOf(frame) >= 0;
  }
}

/** 이름 붙은 장 묶음(clip) 사이를 오가는 그림 — 장 · 빠르기 · 되풀이 여부. 바뀐 순간부터 다시 센다 */
export interface Clip { from: number; n: number; fps: number; loop?: boolean }
export class Animator<K extends string> {
  declare clips: Record<K, Clip>; declare cur: K; declare t: number;
  constructor(clips: Record<K, Clip>, start: K) { this.clips = clips; this.cur = start; this.t = 0; }
  play(k: K): void { if (k !== this.cur) { this.cur = k; this.t = 0; } }
  update(dt: number): void { this.t += dt; }
  get frame(): number { const c = this.clips[this.cur]; return c.loop === false ? onceFrame(this.t, c.fps, c.n, c.from) : cycleFrame(this.t, c.fps, c.n, c.from); }
  get done(): boolean { const c = this.clips[this.cur]; return c.loop === false && this.t * c.fps >= c.n; }
}
