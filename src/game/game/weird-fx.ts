/* ===== game/weird-fx.js — 특이한 무기의 그림 — 펼친 전기 집게 · 도는 부메랑 · 비눗방울 · 펼친 우산 · 프라이팬 별 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { Enemy } from '../entity.js';
import { Game } from '../game.js';

export const WeirdFxPart: Bag = {
  /** 투사체 그림 — 그렸으면 true(render.ts 투사체 고리가 부른다) */
  drawWeirdProj(c: CanvasRenderingContext2D, pr: any, sx: number, sy: number) {
    if (pr.type === 'boomerang') {
      c.save(); c.translate(sx, sy); c.rotate(this.time * 22);
      c.fillStyle = '#b07a3e'; c.strokeStyle = '#5a3a1c'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-9, 2); c.quadraticCurveTo(0, -5, 9, 2); c.lineTo(7, 4); c.quadraticCurveTo(0, -1.5, -7, 4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e8c060'; c.fillRect(-6, 1, 2, 1.5); c.fillRect(4, 1, 2, 1.5);
      c.restore();
      return true;
    }
    if (pr.type === 'bubble') {
      const r = 6 + Math.sin(this.time * 9 + pr.vol) * 0.8;
      c.save();
      c.fillStyle = 'rgba(170,220,255,.18)'; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(200,236,255,.85)'; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = 'rgba(255,170,230,.5)'; c.beginPath(); c.arc(sx, sy, r - 1.5, 0.6, 2.2); c.stroke();   // 무지갯빛 한 줄
      c.fillStyle = '#fff'; c.beginPath(); c.arc(sx - r * 0.4, sy - r * 0.4, 1.4, 0, TAU); c.fill();
      c.restore();
      return true;
    }
    return false;
  },
  /** 연출 단계(fx) — 집게 팔 · 우산 · 별 */
  rWeird(f: any) {
    const { c, camX, camY } = f;
    for (const p of this.players) {
      if (p.claw) this.drawClaw(c, p, camX, camY);
      if (p.umbOpen) this.drawUmbrella(c, p, camX, camY);
    }
    for (const e of this.ents) {
      if (!(e instanceof Enemy) || !(e.panT > 0)) continue;
      e.panT -= 1 / 60;
      const x = e.cx - camX, y = e.y - camY - 6;
      c.save(); c.fillStyle = '#ffe08a';
      for (let i = 0; i < 3; i++) {
        const a = this.time * 6 + i * TAU / 3, sx = x + Math.cos(a) * 10, sy = y + Math.sin(a) * 3;
        c.beginPath(); for (let k = 0; k < 5; k++) { const b = k * TAU / 5 * 2 - Math.PI / 2; c.lineTo(sx + Math.cos(b) * 3, sy + Math.sin(b) * 3); } c.fill();
      }
      c.restore();
    }
  },
  /** 접이식 팔 — 마디마다 꺾여 펼쳐지고, 팔을 따라 전기가 튄다 · 끝에 집게 */
  drawClaw(c: CanvasRenderingContext2D, p: any, camX: number, camY: number) {
    const k = p.claw, cs = Math.cos(k.ang), sn = Math.sin(k.ang);
    const ox = p.cx - camX + cs * 8, oy = p.cy - 4 - camY + sn * 8, L = Math.max(4, k.len);
    const n = Math.max(2, Math.round(L / 26)), seg = L / n;
    const fold = 1 - Math.min(1, L / 220);                              // 덜 펼쳤을수록 마디가 지그재그로 접힌다
    const pts: number[][] = [[ox, oy]];
    for (let i = 1; i <= n; i++) {
      const off = (i % 2 ? 1 : -1) * seg * 0.45 * fold * (i < n ? 1 : 0);
      pts.push([ox + cs * seg * i - sn * off, oy + sn * seg * i + cs * off]);
    }
    c.save(); c.lineCap = 'round';
    c.strokeStyle = '#3a3f48'; c.lineWidth = 5; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
    c.strokeStyle = '#a8b2c0'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#d8e0ea'; for (const q of pts.slice(1, -1)) { c.beginPath(); c.arc(q[0], q[1], 2.6, 0, TAU); c.fill(); }
    // 전기 — 팔을 따라 끊기는 번개 두 가닥
    for (let s = 0; s < 2; s++) {
      c.strokeStyle = s ? 'rgba(191,240,255,.9)' : 'rgba(90,216,255,.7)'; c.lineWidth = s ? 1 : 2;
      c.beginPath();
      for (let i = 0; i <= n * 3; i++) {
        const t = i / (n * 3), x = ox + cs * L * t, y = oy + sn * L * t, j = (Math.random() - .5) * 9;
        if (i) c.lineTo(x - sn * j, y + cs * j); else c.moveTo(x, y);
      }
      c.stroke();
    }
    // 집게 — 끝에서 벌렸다 오므린다
    const tx = ox + cs * L, ty = oy + sn * L, open = 0.45 + 0.35 * Math.sin(this.time * 30);
    c.translate(tx, ty); c.rotate(k.ang);
    c.fillStyle = '#c8d0da'; c.strokeStyle = '#3a3f48'; c.lineWidth = 1;
    for (const s of [-1, 1]) {
      c.save(); c.rotate(s * open);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(11, s * 2); c.lineTo(13, s * 6); c.lineTo(9, s * 4); c.lineTo(2, s * 3); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    c.fillStyle = 'rgba(160,230,255,.35)'; c.beginPath(); c.arc(8, 0, 9, 0, TAU); c.fill();
    c.restore();
  },
  /** 펼친 우산 — 머리 위 반원 천 · 살 */
  drawUmbrella(c: CanvasRenderingContext2D, p: any, camX: number, camY: number) {
    const x = p.cx - camX + p.facing * 3, y = p.y - camY - 6, R = 18;
    c.save();
    c.strokeStyle = '#5a4030'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - p.facing * 2, y + 22); c.stroke();
    c.fillStyle = '#5a6a9a'; c.beginPath(); c.arc(x, y, R, Math.PI, 0); c.lineTo(x + R, y);
    for (let i = 4; i >= 0; i--) c.quadraticCurveTo(x - R + (i + 0.5) * R * 2 / 5, y - 4, x - R + i * R * 2 / 5, y);
    c.fill();
    c.fillStyle = '#7a8ac0'; c.beginPath(); c.arc(x - 3, y - 2, R - 5, Math.PI * 1.05, Math.PI * 1.55); c.lineTo(x - 3, y - 2); c.fill();
    c.strokeStyle = '#3a4468'; c.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const a = Math.PI + i * Math.PI / 4; c.beginPath(); c.moveTo(x, y - 1); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke(); }
    c.restore();
  }
};
mixin(Game.prototype, WeirdFxPart, true);
