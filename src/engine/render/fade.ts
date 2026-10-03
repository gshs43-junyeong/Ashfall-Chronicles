/* ===== engine/render/fade.ts — 화면 가리기: 어두워졌다 밝아지기(잠 · 되살아남 · 순간이동) ===== */
/* 시간이 훌쩍 넘어가거나 자리가 확 바뀌는 순간을 한 컷 끊어 준다 — 그대로 바꾸면 화면이 한 프레임에 튀어 무슨 일인지 놓친다.
   가장 어두운 순간에 mid() 를 부른다(그때 세계를 바꾸면 바뀌는 모습이 안 보인다). */

export class ScreenFade {
  declare a: number; declare color: string;
  declare phase: 0 | 1 | 2 | 3;               // 0 쉼 · 1 어두워짐 · 2 머묾 · 3 밝아짐
  declare t: number; declare tOut: number; declare tHold: number; declare tIn: number;
  declare mid: (() => void) | null;

  constructor() { this.a = 0; this.color = '#000'; this.phase = 0; this.t = 0; this.tOut = 0.4; this.tHold = 0.2; this.tIn = 0.6; this.mid = null; }

  /** 어두워졌다(out 초) → mid() → 머물렀다(hold) → 밝아진다(in) */
  run(mid: (() => void) | null, out = 0.45, hold = 0.25, inn = 0.7, color = '#000'): void {
    this.mid = mid; this.tOut = out; this.tHold = hold; this.tIn = inn; this.color = color;
    this.phase = 1; this.t = 0;
  }
  /** 이미 가려진 채로 시작해 밝아지기만(되살아난 첫 화면) */
  reveal(inn = 0.8, color = '#000'): void { this.color = color; this.a = 1; this.phase = 3; this.t = 0; this.tIn = inn; this.mid = null; }

  get busy(): boolean { return this.phase !== 0; }

  /** 진짜 시간으로(멈춤과 상관없이) 흘린다 */
  update(dt: number): void {
    if (!this.phase) return;
    this.t += dt;
    if (this.phase === 1) {
      this.a = Math.min(1, this.t / this.tOut);
      if (this.t >= this.tOut) { this.phase = 2; this.t = 0; this.a = 1; const m = this.mid; this.mid = null; if (m) m(); }
    } else if (this.phase === 2) {
      if (this.t >= this.tHold) { this.phase = 3; this.t = 0; }
    } else {
      this.a = Math.max(0, 1 - this.t / this.tIn);
      if (this.t >= this.tIn) { this.phase = 0; this.a = 0; }
    }
  }

  draw(c: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.a <= 0) return;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = this.a; c.fillStyle = this.color; c.fillRect(0, 0, c.canvas.width || w, c.canvas.height || h);
    c.restore();
  }
}
