/* ===== game/boss-cart-art.ts — 갱도의 것 그림 — 광차 · 도는 바퀴 · 살 촉수 팔(곡괭이) · 등불 눈이 비추는 빛 · 땅에서 솟는 촉수 · 깔린 레일 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { Part } from '../entity.js';
import { MH } from '../entity/boss-cart.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 멈춘 짐짝이 아니게 — 살이 숨 쉬고 · 달릴 땐 바퀴가 돌며 차체가 덜컹이고 · 팔이 늘 꿈틀대며 · 등불 눈이 플레이어를 비춘다(삼킨 광부들이 아직 찾는다).
   설계 좌표는 tools/mkbossrig.py mine_*(72×56 · 바퀴 (21, 47) · (51, 47)) — entity/boss-cart.ts MH 표. 사연: docs/code-history.md#h234 */

type C2 = CanvasRenderingContext2D;
const K = MH.K, BW = MH.W * K, BH = MH.H * K, PW = 96, LAMP = '#ffd27a';
const LAMPS: [number, number][] = [[26, 13.2], [44, 10.2], [35, 19.2], [52, 17.2]];
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));

export const BossCartArt: Bag = {
  /** 팔 하나 — 어깨(설계 칸)에서 윗마디 a1 · 곡괭이 손 a2(오른쪽 기준, side 로 뒤집는다) */
  drawCartArm(c: C2, pim: HTMLImageElement, x: number, y: number, side: number, a1: number, a2: number) {
    c.save(); c.translate(x, y); c.scale(side, 1); c.rotate(a1);
    c.drawImage(pim, 1 * PW, 0, PW, PW, -18, -48, PW, PW);
    c.translate(62, 0); c.rotate(a2 - a1);
    c.drawImage(pim, 2 * PW, 0, PW, PW, -14, -52, PW, PW);
    c.restore();
  },
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawCart(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('mine_horror'), pim = Sprites.want('mine_horror_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2));
    const A = e.mhA || (e.mhA = { rot: 0, t0: T, arms: [[0.7, -0.5], [0.7, -0.5]] });
    const dt = this.paused ? 0 : Math.max(0, Math.min(0.1, T - A.t0)); A.t0 = T;
    A.rot += (e.vx || 0) * dt / (MH.WR * K);
    const run = Math.min(1, Math.abs(e.vx || 0) / Math.max(1, e.spd || 96));
    const X = sx + e.w / 2, G0 = sy + e.h, jolt = Math.sin(T * 17) * 1.6 * run + (Math.sin(T * 5.3) > 0.97 ? 2 : 0) * run;
    const ox = X - MH.CX * K, oy = G0 - MH.FOOT * K;
    c.save(); c.imageSmoothingEnabled = false;
    /* 바퀴 — 레일을 따라 돈다(막 1 부터 뒷바퀴에 금) */
    MH.WHEELS.forEach((wx, i) => {
      c.save(); c.translate(ox + wx * K, oy + MH.WY * K); c.rotate(A.rot);
      c.drawImage(pim, (st >= 1 && i === 0 ? 4 : 0) * PW, 0, PW, PW, -48, -48, PW, PW); c.restore();
    });
    /* 몸 — 달릴 땐 덜컹 · 숨(장 넘김) */
    const fr = st * 2 + ((T % 1.4) < 0.7 ? 0 : 1);
    c.drawImage(im, fr * BW, 0, BW, BH, ox, oy - jolt, BW, BH);
    if (e.flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, ox, oy - jolt, BW, BH); c.restore(); }
    /* 팔 — 쉴 땐 테두리 밖으로 늘어져 꿈틀 · 곡괭이 내리치기 · 레일 깔기 · 짓누르기 · 땅굴 */
    const sw = e.mhSwing, ar = e.mhArm, sl = e.mhSlam, dg = e.mhDig;
    MH.ARMS.forEach(([ax, ay], i) => {
      const side = i === 0 ? -1 : 1;
      let t1 = 0.75 + Math.sin(T * 1.7 + i * 2) * 0.12, t2 = t1 - 1.5 + Math.sin(T * 2.3 + i) * 0.15, rate = 4;
      const since = (o: Bag) => (o ? T - o.t : 99);
      if (sw && sw.side === side && since(sw) < 1.0) {
        const u = since(sw); rate = 14;
        if (u < 0.5) { t1 = -1.1; t2 = -1.9; } else if (u < 0.75) { t1 = 0.95; t2 = 1.3; } else { t1 = 0.9; t2 = 0.9; }
      }
      if (ar && ar.side === side && since(ar) < 0.7) { t1 = 0.15; t2 = 0.4; rate = 10; }
      if (sl && since(sl) < 0.9) { const u = since(sl); rate = 16; if (u < 0.5) { t1 = -1.25; t2 = -2.0; } else { t1 = 1.05; t2 = 1.4; } }
      if (dg && since(dg) < 2.0) { t1 = 1.35; t2 = 1.55; rate = 8; }
      A.arms[i][0] = ease(A.arms[i][0], t1, dt, rate); A.arms[i][1] = ease(A.arms[i][1], t2, dt, rate);
      this.drawCartArm(c, pim, ox + ax * K, oy + ay * K - jolt, side, A.arms[i][0], A.arms[i][1]);
    });
    c.restore();
    /* 땅굴 — 팔이 박힌 자리에 흙이 튄다 */
    if (dg && T - dg.t < 2.0 && !this.paused && Math.random() < 0.5)
      this.parts.push(new Part(X + dg.side * 120 + (Math.random() - 0.5) * 30 + this.cam.x, G0 + this.cam.y, '#6a5a44', -140, 0.5));
    e.mhLamps = LAMPS.slice(0, st >= 2 ? 4 : 3).map(([lx, ly]) => [ox + lx * K + this.cam.x, oy + ly * K - jolt + this.cam.y]);
    return true;
  },
  /** 빛(fx 단계) — 삼킨 투구의 등불이 플레이어 쪽을 비춘다(가끔 깜빡) */
  drawCartGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_cart' || !e.mhLamps) continue;
      const q = this.hzNear(e.cx, e.cy);
      c.save(); c.globalCompositeOperation = 'lighter';
      e.mhLamps.forEach(([wx, wy]: number[], i: number) => {
        const x = wx - f.camX, y = wy - f.camY, fl = Math.sin(T * 23 + i * 5) > 0.93 ? 0.3 : 1;
        hzGlow(c, x, y, 12, LAMP, 0.55 * fl);
        if (!q) return;
        const a = Math.atan2(q.cy - wy, q.cx - wx) + Math.sin(T * 1.3 + i * 2) * 0.12, L = 260, sp = 0.13;
        const g = c.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
        g.addColorStop(0, `rgba(255,214,130,${0.2 * fl})`); g.addColorStop(1, 'rgba(255,214,130,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(x, y);
        c.lineTo(x + Math.cos(a - sp) * L, y + Math.sin(a - sp) * L); c.lineTo(x + Math.cos(a + sp) * L, y + Math.sin(a + sp) * L); c.closePath(); c.fill();
      });
      c.restore();
    }
  },
  /** 땅에서 솟는 촉수(mhtent) — at 에 솟아 꿈틀대다 끝에 들어간다 */
  drawCartTentacle(c: C2, h: Bag, cx0: number, cy0: number, f: number) {
    const pim = Sprites.want('mine_horror_parts'); if (!pim) return false;
    const u = h.t - h.at; if (u < 0) return true;
    const rise = Math.min(1, u / 0.12) * Math.min(1, Math.max(0, (h.life - h.t) / 0.3));
    const x = h.x - cx0, y = h.y - cy0, T = this.time || 0;
    c.save(); c.globalAlpha = f; c.imageSmoothingEnabled = false;
    c.beginPath(); c.rect(x - 150, y - 260, 300, 260); c.clip();                // 땅 밑은 안 보인다
    c.translate(x, y + (1 - rise) * 138); c.rotate(Math.sin(T * 6 + h.sd) * 0.18);
    c.drawImage(pim, 3 * PW, 0, PW, PW, -72, -138, PW * 1.5, PW * 1.5);
    c.restore();
    return true;
  },
  /** 깔린 레일 — 침목 · 쇠 레일 · 볼트 · 깔리는 순간 끝에서부터 · 사라질 땐 녹슬어 바랜다 */
  drawCartRail(c: C2, h: Bag, cx0: number, cy0: number, f: number) {
    const y = h.y - cy0, x0 = h.x0 - cx0, x1 = h.x1 - cx0, n = Math.min(1, h.t * 3), xe = x0 + (x1 - x0) * n;
    const a = Math.min(x0, xe), b = Math.max(x0, xe); if (b - a < 1) return true;
    c.save(); c.globalAlpha = f;
    for (let xx = Math.ceil(a / 16) * 16; xx < b - 4; xx += 16) {
      c.fillStyle = '#3e2a18'; c.fillRect(xx - 5, y - 4, 11, 4);
      c.fillStyle = '#5a3e24'; c.fillRect(xx - 5, y - 4, 11, 1);
      c.fillStyle = '#9aa0ac'; c.fillRect(xx - 1, y - 6, 2, 1);
    }
    c.fillStyle = '#5a5e68'; c.fillRect(a, y - 8, b - a, 3);
    c.fillStyle = '#b8bcc6'; c.fillRect(a, y - 8, b - a, 1);
    c.restore();
    return true;
  },
  /** 막이 바뀌는 순간 — 앞판이 찢겨 쇳조각이 튄다 */
  cartPhaseFx(e: Bag) {
    for (let i = 0; i < 18; i++) {
      const pt = new Part(e.cx - e.w * 0.2 + (Math.random() - 0.5) * 60, e.y + e.h * 0.6, i % 3 ? '#555a64' : '#7a2e34', 0, 1.2, { spd: 0, r: 3 + Math.random() * 3, g: 1, drag: 0.98 });
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; pt.vx = Math.cos(a) * (180 + Math.random() * 220); pt.vy = Math.sin(a) * (220 + Math.random() * 200);
      this.parts.push(pt);
    }
    this.vfx.puffs(e.cx - e.w * 0.2, e.y + e.h * 0.6, 6, 18, 'rgba(60,40,40,.6)', 1, 30);
  },
};
mixin(Game.prototype, BossCartArt, true);
