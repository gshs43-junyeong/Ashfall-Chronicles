/* ===== game/boss-tide-art.ts — 조수의 파수꾼 그림 — 깎인 돌 윗몸 · 물에 잠긴 두 팔 · 눈구멍에서 흐르는 물 · 차고 빠지는 조수 · 조수 심장 빛 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { TW, twTide } from '../entity/boss-tide.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 허리 아래는 그리지 않는다 — 거상은 제 조수 웅덩이에 서 있다. 물(`tide` 위험 지대)은 거상 둘레 SPAN 만큼, 높이는 twTide(시간)로 — 썰물엔 배의 심장이 드러나고 밀물엔 가슴까지 잠긴다.
   멈춘 석상이 아니게 — 몸이 물결에 흔들리고 · 팔이 물속에서 휘젓고 · 지워진 눈구멍에서 물이 끝없이 흘러내린다. 사연: docs/code-history.md#h244 */

type C2 = CanvasRenderingContext2D;
const K = TW.K, BW = TW.W * K, BH = TW.H * K, PW = 80, PH = 160, HEART = '#7fe0ff';

export const BossTideArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawTide(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('tide_warden'), pim = Sprites.want('tide_warden_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), tide = twTide(T);
    const X = sx + e.w / 2, FY = sy + e.h, sway = Math.sin(T * 0.8) * 0.03 + Math.max(-0.05, Math.min(0.05, (e.vx || 0) * 0.0008));
    c.save(); c.imageSmoothingEnabled = false;
    c.translate(X, FY); c.rotate(sway); c.scale(TW.S, TW.S); c.translate(-TW.CX * K, -TW.WAIST * K);
    /* 팔 — 물속을 휘젓는다(밀물일수록 높이 든다) */
    const arm = (i: number) => {
      const side = i === 0 ? -1 : 1, ph = T * 1.1 + i * 2.2, lift = tide * 0.6;
      const a1 = side * (0.75 + lift * 0.6 + Math.sin(ph) * 0.12), a2 = a1 + side * (0.25 + Math.sin(ph + 1) * 0.2);   // 썰물에도 손이 바닥 밑으로 들어가지 않게 벌린다
      c.save(); c.translate(TW.SH[i][0] * K, TW.SH[i][1] * K); c.rotate(-a1);
      c.drawImage(pim, 0, 0, PW, PH, -10 * K, -4 * K, PW, PH);
      c.translate(0, TW.UP * K); c.rotate(-(a2 - a1));
      c.drawImage(pim, (st >= 2 ? 3 : tide > 0.7 ? 2 : 1) * PW, 0, PW, PH, -10 * K, -3 * K, PW, PH); c.restore();
    };
    arm(0); arm(1);
    const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
    c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH);
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    /* 눈구멍에서 흐르는 물 — 가는 두 줄기(흐르는 결) */
    for (const [ex, ey] of TW.EYES) {
      const g = c.createLinearGradient(0, ey * K, 0, (ey + 22) * K);
      g.addColorStop(0, 'rgba(120,200,240,.85)'); g.addColorStop(1, 'rgba(120,200,240,0)');
      c.fillStyle = g; c.fillRect(ex * K - 2, ey * K + 4, 4, 22 * K);
      c.fillStyle = 'rgba(230,250,255,.8)';
      for (let k = 0; k < 3; k++) { const yy = ey * K + 6 + ((T * 90 + k * 30) % (20 * K)); c.fillRect(ex * K - 1, yy, 2, 6); }
    }
    c.restore();
    e.twHeart = [X + this.cam.x, FY - (TW.WAIST - TW.HEART[1]) * K * TW.S + this.cam.y];
    return true;
  },
  /** 조수(tide 위험 지대 · actors 앞) — 거상 둘레로 차고 빠지는 물 · 잠긴 나는 느려진다 */
  drawTideWater(c: C2, h: Bag, cx0: number, cy0: number, f: number) {
    const b = this.hzBoss(h); if (!b) return true;
    const T = this.time || 0, lv = twTide(T) * TW.DEPTH, x0 = b.cx - TW.SPAN - cx0, x1 = b.cx + TW.SPAN - cx0, fy = b.y + b.h - cy0;
    if (lv < 2) return true;
    c.save(); c.globalAlpha = f;
    const g = c.createLinearGradient(0, fy - lv, 0, fy);
    g.addColorStop(0, 'rgba(70,150,200,.45)'); g.addColorStop(1, 'rgba(30,70,110,.7)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x0, fy);
    for (let x = x0; x <= x1; x += 16) c.lineTo(x, fy - lv + Math.sin(x * 0.03 + T * 2.4) * 4);
    c.lineTo(x1, fy); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(220,245,255,.7)'; c.lineWidth = 2; c.beginPath();
    for (let x = x0; x <= x1; x += 16) { const y = fy - lv + Math.sin(x * 0.03 + T * 2.4) * 4; x === x0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke(); c.restore();
    return true;
  },
  /** 조수의 매 틱 — 잠긴 나는 느려진다 · 거상이 쓰러지면 빠진다 */
  tideHz(h: Bag, dt: number, me: any) {
    const b = this.hzBoss(h);
    if (!b) { h.life = Math.min(h.life, h.t + 0.5); return true; }
    const lv = twTide(this.time || 0) * TW.DEPTH, fy = b.y + b.h;
    if (me && !me.dead && Math.abs(me.cx - b.cx) < TW.SPAN && me.y + me.h > fy - lv + 6) me.vx *= Math.pow(0.55, dt * 6);
    return true;
  },
  /** 빛(fx 단계) — 조수 심장(썰물에 밝게 · 밀물엔 물에 가려 흐리게) */
  drawTideGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_tide' || !e.twHeart) continue;
      const tide = twTide(T);
      c.save(); c.globalCompositeOperation = 'lighter';
      hzGlow(c, e.twHeart[0] - f.camX, e.twHeart[1] - f.camY, 24 + 12 * (1 - tide) + Math.sin(T * 3) * 3, HEART, 0.25 + 0.55 * (1 - tide));
      c.restore();
    }
  },
};
mixin(Game.prototype, BossTideArt, true);
