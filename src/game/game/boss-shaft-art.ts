/* ===== game/boss-shaft-art.ts — 갱을 메운 것 그림 — 땅에서 솟는 잡석 머리 · 여닫는 아래턱 · 묻힌 동안 기어가는 흙 둔덕 · 어둠 진주 눈빛 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { SM } from '../entity/boss-shaft.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 땅 밑은 그리지 않는다(바닥 줄에서 자른다) — 묻힘은 흙 둔덕과 그 위로 비치는 진주 눈빛만 · 솟을 땐 바닥에서 머리가 밀려 올라온다.
   멈춘 바위가 아니게 — 솟아 있는 동안 턱이 늘 우물거리고(물 땐 크게 벌렸다 닫는다) · 머리가 숨 쉬듯 들썩인다. 사연: docs/code-history.md#h242 */

type C2 = CanvasRenderingContext2D;
const K = SM.K, BW = SM.W * K, BH = SM.H * K, PW = 256, PH = 96, EYE = '#b8a0ff';

export const BossShaftArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawShaft(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('shaft_maw'), pim = Sprites.want('shaft_maw_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), up = e.burrowT > 0 ? 0 : (e.smUp || 0), s = 1.25;   // 굴착(burrow) 중엔 묻힌 모습
    const X = sx + e.w / 2, FY = sy + e.h;
    /* 흙 둔덕 — 늘 바닥 위에(묻힘일 때 크게) */
    const mound = 1 - up * 0.6;
    c.save(); c.fillStyle = '#3e3022';
    c.beginPath(); c.ellipse(X, FY, 130 * mound + 20, 26 * mound + 4, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#5a4a36';
    for (let i = 0; i < 7; i++) { const x = X + (i - 3) * 30 * mound + Math.sin(i * 3.1) * 6, h = 6 + (i * 5) % 9; c.beginPath(); c.ellipse(x, FY - h * mound * 0.8, 10, 6, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
    if (up > 0.02) {
      const rise = (1 - up) * (SM.FOOT - 2) * K * s, breathe = Math.sin(T * 1.6) * 3 * up;
      c.save(); c.imageSmoothingEnabled = false;
      c.beginPath(); c.rect(X - 400, FY - 600, 800, 600); c.clip();               // 땅 밑은 안 보인다
      c.translate(X, FY + rise - breathe); c.scale(s, s); c.translate(-SM.CX * K, -SM.FOOT * K);
      /* 아래턱 — 우물거림 · 물기 */
      const bite = e.smBite ? T - e.smBite.t : 9;
      let open = 0.18 + Math.max(0, Math.sin(T * 2.4)) * 0.12;
      if (bite < 0.45) open = 0.2 + bite / 0.45 * 0.5; else if (bite < 0.6) open = 0.7 - (bite - 0.45) / 0.15 * 0.7;
      c.save(); c.translate(SM.HINGE[0] * K, SM.HINGE[1] * K + open * 30); c.rotate(0);
      c.drawImage(pim, (st >= 2 ? 4 : 0) * PW, 0, PW, PH, -32 * K, -2 * K, PW, PH); c.restore();
      const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
      c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH); }
      c.restore();
      e.smEyes = [[X + (22 - SM.CX) * K * s + this.cam.x, FY + rise - breathe + (16 - SM.FOOT) * K * s + this.cam.y], [X + (42 - SM.CX) * K * s + this.cam.x, FY + rise - breathe + (16 - SM.FOOT) * K * s + this.cam.y]];
    } else e.smEyes = [[X - 30 + this.cam.x, FY - 14 + this.cam.y], [X + 30 + this.cam.x, FY - 14 + this.cam.y]];
    e.smShow = up;
    return true;
  },
  /** 빛(fx 단계) — 어둠 진주 눈(묻힘일 땐 흙 사이로 희미하게) */
  drawShaftGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_shaft' || !e.smEyes) continue;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [x, y] of e.smEyes) hzGlow(c, x - f.camX, y - f.camY, 14 + 10 * (e.smShow || 0) + Math.sin(T * 3) * 2, EYE, 0.3 + 0.4 * (e.smShow || 0));
      c.restore();
    }
  },
};
mixin(Game.prototype, BossShaftArt, true);
