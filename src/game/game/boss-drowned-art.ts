/* ===== game/boss-drowned-art.ts — 가라앉은 지킴이 그림 — 잠수 투구 · 납 장화 걸음 · 사슬을 쥔 손 · 끌리고 휘둘리는 닻 · 현창 빛 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { DK } from '../entity/boss-drowned.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 멈춘 잠수복이 아니게 — 납 장화로 무겁게 딛고 · 해초가 흔들리고 · 공기 밸브에서 거품이 오르고 · 닻은 사슬 끝에 매달려 바닥에 끌린다.
   닻 사슬 기술 동안은 닻이 날아가 있으니(chain 위험 지대가 사슬을 그린다) 손의 닻을 그리지 않는다. 휘두를 땐 사슬째 머리 위로 돌려 내리친다.
   사연: docs/code-history.md#h243 */

type C2 = CanvasRenderingContext2D;
const K = DK.K, BW = DK.W * K, BH = DK.H * K, PW = 80, PH = 144, GLOW = '#7fe8d8';

export const BossDrownedArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawDrowned(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('drowned_keeper'), pim = Sprites.want('drowned_keeper_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), s = e.facing || 1, step = e.dkStep || 0, walk = Math.min(1, Math.abs(e.vx || 0) / 40);
    const X = sx + e.w / 2, FY = sy + e.h, thrown = !!(e.mv && e.mv.d && e.mv.d.sig === 'anchor');
    c.save(); c.imageSmoothingEnabled = false;
    c.translate(X, FY); c.scale(s * DK.S, DK.S); c.translate(-DK.CX * K, -DK.FOOT * K);
    const bob = Math.abs(Math.sin(step * Math.PI)) * 4 * walk;
    /* 닻 — 앞손 사슬 끝(쉴 땐 바닥에 끌리고 · 휘두를 땐 머리 위로 돌려 내리친다) */
    const hand: [number, number] = [DK.SH[1][0] * K + 10, DK.SH[1][1] * K + 22 * K];
    let ax = hand[0] + 60, ay = (DK.FOOT - 33) * K, ar = -0.1;   // 쉴 땐 닻 갈고리가 바닥에 닿게(고리에서 갈고리 끝까지 33칸)
    const sw = e.dkSwing ? T - e.dkSwing.t : 9;
    if (sw < 0.9) {
      const v = sw < 0.6 ? sw / 0.6 : 1, a = -Math.PI * 0.9 + v * Math.PI * 1.25, R = 150;
      ax = hand[0] + Math.cos(a) * R; ay = hand[1] - 40 + Math.sin(a) * R; ar = a + Math.PI / 2;
    }
    const drawAnchor = () => {
      if (thrown) return;
      c.strokeStyle = '#6a7680'; c.lineWidth = 3;
      const n = 10;
      for (let i = 0; i < n; i++) {                                       // 사슬 — 처진 줄(고리를 번갈아 눕힌다)
        const u = i / n, x = hand[0] + (ax - hand[0]) * u, y = hand[1] + (ay - hand[1]) * u + Math.sin(u * Math.PI) * (sw < 0.9 ? 6 : 26);
        c.beginPath(); c.ellipse(x, y, 7, 4, Math.atan2(ay - hand[1], ax - hand[0]) + (i % 2 ? Math.PI / 2 : 0), 0, Math.PI * 2); c.stroke();
      }
      c.save(); c.translate(ax, ay); c.rotate(ar); c.drawImage(pim, (st >= 2 ? 5 : 3) * PW, 0, PW, PH, -10 * K, -3 * K, PW, PH); c.restore();
    };
    /* 다리 — 납 장화 */
    DK.HIPS.forEach((hx, i) => {
      const sw2 = Math.sin(step * Math.PI + i * Math.PI) * 0.25 * walk;
      c.save(); c.translate(hx * K, DK.HIP_Y * K); c.rotate(sw2); c.drawImage(pim, 0, 0, PW, PH, -10 * K, -3 * K, PW, PH); c.restore();
    });
    /* 뒤 팔 */
    const arm = (i: number, a1: number, a2: number) => {
      c.save(); c.translate(DK.SH[i][0] * K, DK.SH[i][1] * K - bob); c.rotate(a1);
      c.drawImage(pim, PW, 0, PW, PH, -10 * K, -3 * K, PW, PH);
      c.translate(0, DK.UP * K); c.rotate(a2 - a1); c.drawImage(pim, 2 * PW, 0, PW, PH, -10 * K, -3 * K, PW, PH); c.restore();
    };
    arm(0, 0.2 + Math.sin(T * 1.2) * 0.06, 0.4);
    /* 몸 */
    const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
    c.drawImage(im, fr * BW, 0, BW, BH, 0, -bob, BW, BH);
    if (e.flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, -bob, BW, BH); c.restore(); }
    drawAnchor();
    arm(1, sw < 0.9 ? -1.4 + Math.min(1, sw / 0.6) * 1.8 : -0.5 + Math.sin(T * 1.4) * 0.05, sw < 0.9 ? -1.0 + Math.min(1, sw / 0.6) * 1.6 : -0.2);
    c.restore();
    e.dkPort = [X + (20 - DK.CX) * K * DK.S * s + this.cam.x, FY - (DK.FOOT - 11.6) * K * DK.S - bob * DK.S + this.cam.y];
    return true;
  },
  /** 빛(fx 단계) — 현창 · 닻을 거두는 틈엔 붉게 깜빡 */
  drawDrownedGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_drowned' || !e.dkPort) continue;
      const open = e.dkReeling && e.dkReeling();
      c.save(); c.globalCompositeOperation = 'lighter';
      hzGlow(c, e.dkPort[0] - f.camX, e.dkPort[1] - f.camY, 18 + Math.sin(T * 3) * 3, open ? '#ffb0a0' : GLOW, open ? 0.8 : 0.5);
      c.restore();
    }
  },
};
mixin(Game.prototype, BossDrownedArt, true);
