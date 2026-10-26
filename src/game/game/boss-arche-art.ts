/* ===== game/boss-arche-art.ts — 원형 그림 — 상아빛 마네킹 · 걷는 다리 · 빈손 · 자 칼날 팔(연격) · 흩어졌다 설계선을 따라 다시 모이는 몸 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { AR } from '../entity/boss-arche.js';
import { Game } from '../game.js';
/* ★ 멈춘 마네킹이 아니게 — 걸을 땐 무릎을 굽혀 딛고 · 칼날 팔은 늘 겨누고 · 연격 땐 위에서 아래로 그어 내린다 · 가슴 이음매 빛이 숨 쉰다.
   흩어졌다 모일 때(arAsm) 판마다 제 자리로 날아오며, 지나온 길에 푸른 설계선(가름선 · 눈금)이 남는다 — 이 보스만의 모습이니 다른 연출로 바꾸지 말 것.
   사연: docs/code-history.md#h240 */

type C2 = CanvasRenderingContext2D;
const K = AR.K, BW = AR.W * K, BH = AR.H * K, PW = 48, PH = 104, LINE = '#9fd0ff';

export const BossArcheArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawArche(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('archetype'), pim = Sprites.want('archetype_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), s = e.facing || 1, step = e.arStep || 0, walk = Math.min(1, Math.abs(e.vx || 0) / 50);
    const X = sx + e.w / 2, FY = sy + e.h;
    /* 다시 모이기 — 판마다 흩어진 자리에서 제자리로 */
    const A = e.arAsm, u = A ? Math.min(1, (T - A.t) / (A.big ? 1.3 : 0.9)) : 1, ez = u * u * (3 - 2 * u);
    const off = (i: number): [number, number] => {
      if (u >= 1) return [0, 0];
      const a = A.sd * 7 + i * 2.39, r = (A.big ? 120 : 70) + (i * 37) % 50;
      return [((Math.cos(a) * r + A.fx * (1 + i * 0.1)) / AR.S) * s * (1 - ez), ((Math.sin(a) * r * 0.6 + A.fy) / AR.S) * (1 - ez)];
    };
    const lines: number[][] = [];
    c.save(); c.imageSmoothingEnabled = false;
    c.translate(X, FY); c.scale(s * AR.S, AR.S); c.translate(-AR.CX * K, -AR.FOOT * K);
    const piece = (i: number, ax: number, ay: number, draw: () => void) => {
      const [ox, oy] = off(i);
      if (u < 1) lines.push([ax, ay, ax + ox, ay + oy]);
      c.save(); c.translate(ox, oy); draw(); c.restore();
    };
    const leg = (i: number) => piece(i, AR.HIPS[i] * K, AR.HIP_Y * K, () => {
      const ph = step * Math.PI + i * Math.PI, th = Math.sin(ph) * 0.38 * walk, kn = th + Math.max(0, -Math.sin(ph)) * 0.55 * walk;
      c.save(); c.translate(AR.HIPS[i] * K, AR.HIP_Y * K); c.rotate(th);
      c.drawImage(pim, 0, 0, PW, PH, -6 * K, -3 * K, PW, PH);
      c.translate(0, AR.THIGH * K); c.rotate(kn - th);
      c.drawImage(pim, PW, 0, PW, PH, -6 * K, -3 * K, PW, PH); c.restore();
    });
    const cut = e.arCut && T - e.arCut.t < 0.3 ? (T - e.arCut.t) / 0.18 : -1;
    const arm = (i: number) => piece(2 + i, AR.SH[i][0] * K, AR.SH[i][1] * K, () => {
      let a1: number, a2: number;
      if (i === 1) {                                                         // 칼날 팔 — 겨눔 · 연격(위에서 아래로)
        a1 = -0.35 + Math.sin(T * 1.6) * 0.05; a2 = -1.0 + Math.sin(T * 2.2) * 0.06;
        if (e.state === 1) { a1 = -1.6; a2 = -2.3; }
        if (cut >= 0) { const v = Math.min(1, cut); a1 = -2.2 + v * 2.9; a2 = a1 - 0.3 + v * 0.5; }
      } else { a1 = 0.2 + Math.sin(T * 1.3) * 0.06; a2 = 0.45 + Math.sin(T * 1.7) * 0.08; }
      c.save(); c.translate(AR.SH[i][0] * K, AR.SH[i][1] * K); c.rotate(a1);
      c.drawImage(pim, 2 * PW, 0, PW, PH, -6 * K, -3 * K, PW, PH);
      c.translate(0, AR.UP * K); c.rotate(a2 - a1);
      c.drawImage(pim, (i === 1 ? 3 : 4) * PW, 0, PW, PH, -6 * K, -3 * K, PW, PH); c.restore();
    });
    leg(0); arm(0);
    piece(4, AR.CX * K, 26 * K, () => {
      const fr = st * 2 + ((T % 1.4) < 0.7 ? 0 : 1);
      c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH); }
    });
    leg(1); arm(1);
    /* 설계선 — 흩어진 판이 지나온 길(가름선 · 눈금) */
    if (lines.length) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = LINE; c.globalAlpha = 0.8 * (1 - u * 0.6); c.lineWidth = 2 / AR.S;
      c.setLineDash([10, 6]);
      for (const [x0, y0, x1, y1] of lines) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      c.setLineDash([]);
      for (const [x0, y0, x1, y1] of lines) {
        const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L * 8, ny = (x1 - x0) / L * 8;
        for (const [px, py] of [[x0, y0], [x1, y1]]) { c.beginPath(); c.moveTo(px - nx, py - ny); c.lineTo(px + nx, py + ny); c.stroke(); }
      }
      c.restore();
    }
    c.restore();
    return true;
  },
};
mixin(Game.prototype, BossArcheArt, true);
