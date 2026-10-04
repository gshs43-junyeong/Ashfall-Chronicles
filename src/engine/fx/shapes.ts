/* ===== engine/fx/shapes.ts — 잠깐 떴다 사라지는 도형 연출: 퍼지는 고리 · 번개 · 떨어질 자리 예고 ===== */
/* 시간은 넘겨받은 dt 로 흐른다(프레임 수에 묶지 않는다 — 144Hz 화면에서 고리가 두 배 빨리 사라지던 것). 세계 좌표로 들고 그릴 때 카메라를 뺀다. */

interface Ring { x: number; y: number; r: number; t: number; max: number; c: string }
interface Bolt { pts: number[][]; t: number; max: number; c: string }
interface Warn { x: number; y: number; r: number; t: number; max: number; c: string }

import type { VfxArt } from './vfx.js';

export class ShapeFx {
  declare rings: Ring[]; declare bolts: Bolt[]; declare warns: Warn[]; declare art: VfxArt | null;
  /** art — 고리 · 예고 원을 결 그림('ring')으로(없으면 선) */
  constructor() { this.rings = []; this.bolts = []; this.warns = []; this.art = null; }

  /** 퍼져 나가는 고리 — 반지름 r 까지 1.3배로 벌어지며 흐려진다 */
  ring(x: number, y: number, r: number, c: string, life = 0.3): void { this.rings.push({ x, y, r, t: life, max: life, c }); }
  /** 두 점을 잇는 번개 — 마디 seg 개, 옆으로 jitter px 까지 흔들린다 */
  bolt(x0: number, y0: number, x1: number, y1: number, c: string, life = 0.22, seg = 7, jitter = 26, rand: () => number = Math.random): void {
    const pts: number[][] = [], nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    for (let i = 0; i <= seg; i++) {
      const k = i / seg, j = i === 0 || i === seg ? 0 : (rand() - 0.5) * jitter;
      pts.push([x0 + (x1 - x0) * k + nx / L * j, y0 + (y1 - y0) * k + ny / L * j]);
    }
    this.bolts.push({ pts, t: life, max: life, c });
  }
  /** 떨어질 자리 예고 — dur 초 동안 원이 안에서부터 차오른다 */
  warn(x: number, y: number, r: number, dur: number, c: string): void { this.warns.push({ x, y, r, t: dur, max: dur, c }); }

  update(dt: number): void {
    for (const L of [this.rings, this.bolts, this.warns] as { t: number }[][])
      for (let i = L.length - 1; i >= 0; i--) { L[i].t -= dt; if (L[i].t <= 0) L.splice(i, 1); }
  }
  clear(): void { this.rings.length = 0; this.bolts.length = 0; this.warns.length = 0; }

  draw(c: CanvasRenderingContext2D, camX: number, camY: number): void {
    const TAU = Math.PI * 2;
    for (const r of this.rings) {
      const k = r.t / r.max, R = r.r * (1.3 - k * 0.3), im = this.art && this.art('ring', r.c);
      if (im) { c.globalAlpha = k * .9; c.drawImage(im, r.x - camX - R / 0.95, r.y - camY - R / 0.95, R / 0.95 * 2, R / 0.95 * 2); continue; }
      c.strokeStyle = r.c; c.globalAlpha = k * .8; c.lineWidth = 3;
      c.beginPath(); c.arc(r.x - camX, r.y - camY, R, 0, TAU); c.stroke();
    }
    for (const w of this.warns) {
      const k = 1 - w.t / w.max, x = w.x - camX, y = w.y - camY;
      c.globalAlpha = 0.22 + 0.2 * Math.sin(k * 18);
      c.fillStyle = w.c; c.beginPath(); c.arc(x, y, w.r * k, 0, TAU); c.fill();
      const im = this.art && this.art('ring', w.c);
      if (im) { c.globalAlpha = 0.9; c.save(); c.translate(x, y); c.rotate(k * 1.5); c.drawImage(im, -w.r / 0.95, -w.r / 0.95, w.r / 0.95 * 2, w.r / 0.95 * 2); c.restore(); continue; }
      c.globalAlpha = 0.85; c.strokeStyle = w.c; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, w.r, 0, TAU); c.stroke();
    }
    for (const b of this.bolts) {
      const k = b.t / b.max;
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [lw, col, al] of [[6, b.c, 0.22 * k], [2.4, b.c, 0.9 * k], [1, '#ffffff', 0.9 * k]] as [number, string, number][]) {
        c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = lw;
        c.beginPath();
        b.pts.forEach((p, j) => j ? c.lineTo(p[0] - camX, p[1] - camY) : c.moveTo(p[0] - camX, p[1] - camY));
        c.stroke();
      }
      c.lineCap = 'butt';
    }
    c.globalAlpha = 1; c.lineWidth = 1;
  }
}
