/* ===== game/boss-storm-art.ts — 폭풍의 수호자 그림 — 하늘 신전 석상 · 몸을 도는 두 고리 · 구름 밑동 · 뿔 사이 번개 · 폭풍의 눈 · 던져 꽂는 피뢰침 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 팔이 없다 — 두 고리가 팔이다(계획 §3: "고리가 돌며 피뢰침을 꽂는다"). 고리는 몸을 세로축으로 돌아 뒤로 갈 땐 몸 뒤, 앞으로 올 땐 몸 앞에 그린다.
   피뢰침 기술 땐 고리가 빨리 돌며 침을 던지고(rod 위험 지대의 sx · sy 에서 날아가 꽂힌다), 꽂힌 침끼리 번개가 잇는다(arc).
   멈춘 석상이 아니게 — 늘 떠서 흔들리고 · 구름 밑동이 끓고 · 뿔 사이에 번개가 튀며 · 폭풍의 눈이 돈다. 설계 좌표는 tools/mkbossrig.py storm_* (60×60 · 가운데 30, 32).
   사연: docs/code-history.md#h233 */

type C2 = CanvasRenderingContext2D;
const K = 4, BW = 240, PW = 256, BOLT = '#cfe6ff', C0 = [30, 32];
const jag = (sd: number, x0: number, y0: number, x1: number, y1: number, n: number, amp: number) => {
  const pts: number[] = [x0, y0];
  for (let i = 1; i < n; i++) { const u = i / n, s = Math.sin(sd * 12.9898 + i * 78.233) * 43758.5453; pts.push(x0 + (x1 - x0) * u + ((s - Math.floor(s)) - 0.5) * amp, y0 + (y1 - y0) * u + (((s * 3.1) % 1) - 0.5) * amp); }
  pts.push(x1, y1); return pts;
};
function bolt(c: C2, pts: number[], a: number) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
  for (const [w, col] of [[6, `rgba(120,180,255,${0.45 * a})`], [2, `rgba(255,255,255,${a})`]] as [number, string][]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke();
  }
  c.restore();
}

export const BossStormArt: Bag = {
  /** 고리 하나 — 몸을 가로로 감싼 궤도(납작한 타원) · 룬은 궤도를 따라 돈다 · half -1 = 뒤 반쪽(몸 뒤) · 1 = 앞 반쪽 */
  drawStormRing(c: C2, pim: HTMLImageElement, x: number, y: number, spin: number, tilt: number, fr: number, k: number, sq: number, half: number) {
    c.save(); c.translate(x, y); c.rotate(tilt);
    c.beginPath(); c.rect(-PW, half < 0 ? -PW : 0, PW * 2, PW); c.clip();
    c.scale(k, k * sq); c.rotate(spin);
    c.drawImage(pim, fr * PW, 0, PW, PW, -PW / 2, -PW / 2, PW, PW); c.restore();
  },
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawStorm(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('storm_warden'), pim = Sprites.want('storm_warden_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), busy = !!(e.mv && e.mv.d);
    const A = e.swA || (e.swA = { spin: 0, t0: T, zap: 0, op: 0 }), dt = this.paused ? 0 : Math.max(0, Math.min(0.1, T - A.t0)); A.t0 = T;
    A.spin += dt * (busy ? 4.2 : 1.3 + (e.pf || 0) * 0.6);
    const X = sx + e.w / 2, Y = sy + e.h / 2 + Math.sin(T * 1.6) * 7, tilt = Math.max(-0.2, Math.min(0.2, (e.vx || 0) * 0.0008));
    /* 두 궤도 — 가슴은 위로 · 허리는 아래로 기운다. 내리꽂을 땐 고리가 벌어져(sq↑) 바람결이 걷힌다 */
    const dive = !!(e.swDiving && e.swDiving()), op = A.op = (A.op || 0) + ((dive ? 1 : 0) - (A.op || 0)) * Math.min(1, dt * 6);
    const rings: [number, number, number, number, number][] = [[A.spin, -0.28 + Math.sin(T * 0.7) * 0.06, -30, 1.25, 0.26 + op * 0.3], [-A.spin * 1.3, 0.34 + Math.sin(T * 0.9) * 0.06, 34, 1.05, 0.22 + op * 0.3]], rf = st >= 2 ? 1 : 0;
    c.save(); c.imageSmoothingEnabled = false;
    /* 구름 밑동 — 몸 아래가 끓는 먹구름으로 풀린다(뒤 겹) */
    const cloud = (front: boolean) => {
      for (let i = 0; i < 7; i++) {
        if ((i % 2 === 0) !== front) continue;
        const a = i / 7 * TAU + T * 0.5, rx = 46 + 10 * Math.sin(T * 1.3 + i), cx = X + Math.cos(a) * 56, cy = Y + 92 + Math.sin(a) * 14;
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, rx);
        g.addColorStop(0, front ? 'rgba(96,108,132,.95)' : 'rgba(60,68,88,.95)'); g.addColorStop(1, 'rgba(50,58,76,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, rx, rx * 0.62, 0, 0, TAU); c.fill();
      }
    };
    cloud(false);
    for (const [sp, tl, dy, k, sq] of rings) this.drawStormRing(c, pim, X, Y + dy, sp, tl + tilt, rf, k, sq, -1);   // 뒤 반쪽
    const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
    c.save(); c.translate(X, Y); c.rotate(tilt);
    c.drawImage(im, fr * BW, 0, BW, BW, -C0[0] * K, -C0[1] * K, BW, BW);
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BW, -C0[0] * K, -C0[1] * K, BW, BW); }
    c.restore();
    cloud(true);
    for (const [sp, tl, dy, k, sq] of rings) this.drawStormRing(c, pim, X, Y + dy, sp, tl + tilt, rf, k, sq, 1);    // 앞 반쪽
    /* 바람결 껍질 — 받는 피해가 줄어드는 동안(내리꽂지 않을 때) 몸을 감도는 흰 바람 줄 · 내리꽂으면 걷힌다 */
    if (op < 0.95) {
      c.save(); c.globalAlpha = (1 - op) * 0.5; c.strokeStyle = '#e8f4ff'; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a0 = T * (1.8 + i * 0.13) + i * 1.7, rx = 96 + (i % 3) * 14, ry = 120 + (i % 2) * 16;
        c.lineWidth = 2 - (i % 2) * 0.8; c.beginPath(); c.ellipse(X, Y, rx, ry, 0.2 * Math.sin(i), a0, a0 + 0.9); c.stroke();
      }
      c.restore();
    }
    /* 구름 속 번개 · 뿔 사이 번개 — 이따금 번쩍 */
    A.zap -= dt;
    if (A.zap <= 0) A.zap = (busy ? 0.25 : 0.7) + Math.random() * 0.5;
    if (A.zap > (busy ? 0.17 : 0.6)) {
      const sd = Math.floor(T * 20);
      bolt(c, jag(sd, X - 45, Y + 84, X + 30, Y + 110, 11, 9), 0.9);
      const hl = [X + (-12.5) * K, Y + (1.6 - C0[1]) * K], hr = [X + 12.5 * K, Y + (1.6 - C0[1]) * K];
      bolt(c, jag(sd + 7, hl[0], hl[1], hr[0], hr[1], 12, 8), 0.85);
    }
    c.restore();
    e.swCore = [X, Y + (30 - C0[1]) * K]; e.swHorns = [[X - 12.5 * K, Y + (1.6 - C0[1]) * K], [X + 12.5 * K, Y + (1.6 - C0[1]) * K]];
    return true;
  },
  /** 빛(fx 단계) — 폭풍의 눈(도는 소용돌이) · 뿔끝 · 눈 틈 */
  drawStormGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_storm' || !e.swCore) continue;
      const [x, y] = e.swCore, X = x - f.camX, Y = y - f.camY, st = Math.min(2, Math.round((e.pf || 0) * 2));
      hzGlow(c, X, Y, 34 + st * 8 + Math.sin(T * 4) * 4, BOLT, 0.45);
      c.save(); c.globalCompositeOperation = 'lighter'; c.translate(X, Y); c.rotate(T * (2 + st));
      for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.strokeStyle = 'rgba(200,230,255,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 12 + i * 3, 0, 1.4); c.stroke(); }
      c.restore();
      for (const [hx, hy] of e.swHorns || []) hzGlow(c, hx - f.camX, hy - f.camY, 14 + Math.sin(T * 9 + hx) * 3, BOLT, 0.6);
    }
  },
  /** 피뢰침(rod 위험 지대) — 고리에서 던져져 포물선으로 날아와 박히고, 박힌 뒤 떨린다 */
  drawStormRod(c: C2, h: Bag, cx0: number, cy0: number, f: number) {
    const pim = Sprites.want('storm_warden_parts'); if (!pim || h.sx === undefined) return false;
    const fly = 0.35, u = Math.min(1, h.t / fly), x1 = h.x - cx0, y1 = h.y - cy0, x0 = h.sx - cx0, y0 = h.sy - cy0;
    const k = 0.62;
    c.save(); c.globalAlpha = f; c.imageSmoothingEnabled = false;
    if (u < 1) {
      const px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 120;
      const vx = x1 - x0, vy = (y1 - y0) - Math.cos(u * Math.PI) * 120 * Math.PI;
      c.translate(px, py); c.rotate(Math.atan2(vy, vx) + Math.PI / 2 + h.t * 20);
      c.drawImage(pim, 2 * PW, 0, PW, PW, -PW / 2 * k, -PW / 2 * k, PW * k, PW * k);
    } else {
      const wob = Math.sin((h.t - fly) * 40) * Math.max(0, 0.18 - (h.t - fly) * 0.4);
      c.translate(x1, y1 + 4); c.rotate(wob);
      c.drawImage(pim, 2 * PW, 0, PW, PW, -PW / 2 * k, -248 * k, PW * k, PW * k);
    }
    c.restore();
    if (u >= 1 && h.t - fly < 0.15) { c.save(); c.globalCompositeOperation = 'lighter'; hzGlow(c, x1, y1, 26, BOLT, 0.6); c.restore(); }
    if (h.t > 1.0 && h.t < 1.3) hzGlow(c, x1, y1 - 150 * k, 26, BOLT, 0.9);
    return true;
  },
};
mixin(Game.prototype, BossStormArt, true);
