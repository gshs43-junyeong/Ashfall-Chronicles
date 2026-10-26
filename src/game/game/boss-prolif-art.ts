/* ===== game/boss-prolif-art.ts — 증식체 그림 — 핵 · 둘레에 꽂힌 모듈(제각각 들썩인다) · 떨어져 나와 세 다리로 기는 모듈 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { PF, pfGone, pfStage } from '../entity/boss-prolif.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 멈춘 덩어리가 아니게 — 모듈마다 제 박자로 들썩이고(피스톤은 펌프질 · 배기구는 김 · 포는 과녁을 본다) · 다리 모듈이 번갈아 딛는다.
   떨어져 나온 모듈(증식 기계 `shed`)은 그 모듈 그림 그대로 세 다리를 달고 긴다 — 어디서 떨어졌는지 보인다.
   단계 · 크기는 체력 비율에서(entity/boss-prolif pfStage) — 참가자도 같게 그린다. 사연: docs/code-history.md#h237 */

type C2 = CanvasRenderingContext2D;
const K = PF.K, CW = PF.CORE * K, MW = PF.MOD * K;

export const BossProlifArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawProlif(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('proliferator'), pim = Sprites.want('proliferator_parts'); if (!im || !pim) return false;
    const st = pfStage(e); e.pfFit(st);
    const T = this.time || 0, k = PF.SCALE[st], gone = pfGone(st), walk = Math.min(1, Math.abs(e.vx || 0) / 60);
    const X = sx + e.w / 2, Y = sy + e.h - PF.FOOT * K * k, q = this.hzNear(e.cx, e.cy);
    c.save(); c.imageSmoothingEnabled = false;
    c.translate(X, Y); c.scale(k, k);
    const kick = e.pfKick ? Math.max(0, 1 - (T - e.pfKick.t) * 5) : 0;
    /* 뒤쪽(위) 모듈 → 핵 → 앞쪽(아래 · 다리) 모듈 */
    const order = PF.SLOTS.map((s, i) => i).sort((a, b) => PF.SLOTS[a][1] - PF.SLOTS[b][1]);
    const drawMod = (i: number) => {
      if (gone.has(i)) return;
      const [dx, dy, kind] = PF.SLOTS[i], ph = i * 1.7;
      let mx = dx * K + Math.sin(T * 3 + ph) * 1.5, my = dy * K + Math.cos(T * 2.4 + ph) * 1.5, a = Math.sin(T * 1.8 + ph) * 0.06;
      if (kind === 4) { my += Math.max(0, Math.sin(T * 9 * walk + (dx > 0 ? Math.PI : 0))) * -6 * walk; a = 0; }
      if (kind === 1 && q) { a = Math.atan2(q.cy - (e.cy), q.cx - (e.cx + dx * K * k)); mx -= Math.cos(a) * kick * 6; }
      c.save(); c.translate(mx, my); c.rotate(a);
      if (kind === 1 && Math.cos(a) < 0) c.scale(1, -1);
      c.drawImage(pim, kind * MW, 0, MW, MW, -MW / 2, -MW / 2, MW, MW);
      if (kind === 2) {                                                     // 피스톤 — 대가 오르내린다
        c.fillStyle = '#d8d0c0'; c.fillRect(-3, -MW / 2 - 6 - Math.abs(Math.sin(T * 6 + ph)) * 10, 6, 10);
      }
      c.restore();
    };
    order.filter(i => PF.SLOTS[i][1] < 0).forEach(drawMod);
    const fr = Math.min(2, st) * 2 + ((T % 1.2) < 0.6 ? 0 : 1);
    c.drawImage(im, fr * CW, 0, CW, CW, -CW / 2, -CW / 2, CW, CW);
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * CW, 0, CW, CW, -CW / 2, -CW / 2, CW, CW); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    order.filter(i => PF.SLOTS[i][1] >= 0).forEach(drawMod);
    c.restore();
    e.pfCoreS = [X + this.cam.x, Y + this.cam.y, k];
    return true;
  },
  /** 떨어져 나온 모듈(증식 기계 shed) — 그 모듈 그림에 세 다리 · 종종걸음 */
  drawShed(c: C2, e: Bag, sx: number, sy: number) {
    const pim = Sprites.want('proliferator_parts'); if (!pim) return false;
    const T = this.time || 0, kind = (e.shed || 1) - 1, s = 0.75, run = Math.min(1, Math.abs(e.vx || 0) / 40);
    const X = sx + e.w / 2, Y = sy + e.h, bob = Math.abs(Math.sin(T * 14)) * 3 * run;
    c.save(); c.imageSmoothingEnabled = false; c.translate(X, Y - bob);
    c.drawImage(pim, 5 * MW, 0, MW, MW, -MW * s / 2, -MW * s, MW * s, MW * s);   // 다리
    c.translate(0, -MW * s * 0.62); c.rotate(Math.sin(T * 10) * 0.08 * run);
    c.drawImage(pim, Math.min(3, kind) * MW, 0, MW, MW, -MW * s / 2, -MW * s / 2, MW * s, MW * s);
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(pim, Math.min(3, kind) * MW, 0, MW, MW, -MW * s / 2, -MW * s / 2, MW * s, MW * s); }
    c.restore();
    return true;
  },
  /** 빛(fx 단계) — 핵의 렌즈 빛 · 드러난 핵은 더 밝게 */
  drawProlifGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_prolif' || !e.pfCoreS) continue;
      const [x, y, k] = e.pfCoreS, open = pfStage(e) >= 3 && !e.guard;
      c.save(); c.globalCompositeOperation = 'lighter';
      hzGlow(c, x - f.camX, y - f.camY, (open ? 40 : 24) * k + Math.sin(T * 4) * 3, '#ffc860', open ? 0.8 : 0.45);
      c.restore();
    }
  },
};
mixin(Game.prototype, BossProlifArt, true);
