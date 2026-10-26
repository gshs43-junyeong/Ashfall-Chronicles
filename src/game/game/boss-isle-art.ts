/* ===== game/boss-isle-art.ts — 섬을 든 것 그림 — 웅크린 돌 거인 · 땅을 짚은 앞팔 둘 · 등의 섬(발판) · 정수리 문양 · 섬 위에 서기(deckLand) ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { IK, ikDeck, ikKneel } from '../entity/boss-isle.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 섬은 그림이자 발판이다 — 그리는 자리와 서는 자리가 같은 ikDeck 에서 나온다(한쪽만 고치지 말 것).
   무릎을 꿇으면 몸 전체가 내려가고 땅 밑은 그리지 않는다(다리가 접혀 들어간 것처럼). 멈춘 바위가 아니게 — 등이 숨에 오르내리고 · 섬 나무가 흔들리고 ·
   앞팔이 늘 땅을 짚어 몸을 받친다. 사연: docs/code-history.md#h245 */

type C2 = CanvasRenderingContext2D;
const K = IK.K, BW = IK.W * K, BH = IK.H * K, PW = 320, PH = 160, RUNE = '#9ff0d8';

export const BossIsleArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawIsle(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('isle_keeper'), pim = Sprites.want('isle_keeper_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), s = e.facing || 1, kn = ikKneel(e);
    const X = sx + e.w / 2, GY = sy + e.h, FY = GY + kn * IK.DROP, breathe = Math.sin(T * 1.2) * 3;
    c.save(); c.imageSmoothingEnabled = false;
    c.beginPath(); c.rect(X - 700, GY - 900, 1400, 900); c.clip();                      // 땅 밑은 안 보인다(무릎 꿇기)
    c.translate(X, FY); c.scale(s * IK.S, IK.S); c.translate(-IK.CX * K, -IK.FOOT * K);
    /* 앞팔 둘 — 어깨에서 땅을 짚는다(뒤쪽 팔이 먼저 · 어둡게) */
    const arm = (i: number) => {
      const [ax, ay] = IK.ARMS[i], drop = (IK.FOOT - ay) * K - kn * IK.DROP / IK.S, L = 56 * K;   // 어깨에서 보이는 땅까지(설계 칸 · 무릎 꿇으면 짧다)
      const a = Math.asin(Math.max(0.1, Math.min(0.95, drop / L))) + Math.sin(T * 0.9 + i) * 0.03;
      c.save(); c.translate(ax * K, ay * K - breathe); c.rotate(a); if (i === 1) c.globalAlpha = 0.85;
      c.drawImage(pim, PW, 0, PW, PH, -8 * K, -20 * K, PW, PH); c.restore();
    };
    arm(1);
    const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
    c.drawImage(im, fr * BW, 0, BW, BH, 0, -breathe, BW, BH);
    if (e.flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, -breathe, BW, BH); c.restore(); }
    arm(0);
    c.restore();
    /* 섬 — 발판과 같은 자리(ikDeck) · 숨에 맞춰 살짝 흔들 */
    const d = ikDeck(e), ix = (d.x0 + d.x1) / 2 - this.cam.x, iy = d.y - this.cam.y;
    c.save(); c.imageSmoothingEnabled = false; c.translate(ix, iy); c.rotate(Math.sin(T * 0.7) * 0.01); c.scale(s * IK.S, IK.S);
    c.drawImage(pim, (st >= 2 ? 2 : 0) * PW, 0, PW, PH, -IK.ISLE.ax * K, -IK.ISLE.top * K, PW, PH);
    c.restore();
    e.ikCrown = [X + (IK.CROWN[0] - IK.CX) * K * IK.S * s + this.cam.x, FY - (IK.FOOT - IK.CROWN[1]) * K * IK.S - breathe * IK.S + this.cam.y];
    return true;
  },
  /** 빛(fx 단계) — 정수리 문양(섬 위에 누가 있으면 밝게) */
  drawIsleGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_isle' || !e.ikCrown) continue;
      const on = (this.players || []).some((q: any) => q && (q._deckT || 0) > T - 0.4);
      c.save(); c.globalCompositeOperation = 'lighter';
      hzGlow(c, e.ikCrown[0] - f.camX, e.ikCrown[1] - f.camY, (on ? 30 : 16) + Math.sin(T * 4) * 3, RUNE, on ? 0.8 : 0.4);
      c.restore();
    }
  },
  /** 섬 위에 서기 — 엔티티 이동 끝(entity.ts move)에서 플레이어만 · 내려오는 중이면 섬 윗면에 세우고 섬과 함께 옮긴다 */
  deckLand(ent: any, prevBottom: number, drop: boolean) {
    if (!this.players || !this.players.includes(ent)) return;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_isle') continue;
      const d = ikDeck(e);
      if (ent.x + ent.w < d.x0 || ent.x > d.x1) continue;
      const T = this.time || 0, rode = (ent._deckT || 0) > T - 0.1;
      if (rode && ent._deckX !== undefined) ent.x += d.x0 - ent._deckX;      // 섬과 함께 옆으로
      if (!drop && ent.vy >= 0 && prevBottom <= d.y + (rode ? 40 : 8) && ent.y + ent.h >= d.y - 2) {
        ent.y = d.y - ent.h; ent.vy = 0; ent.onGround = true; ent._deckT = T; ent._deckX = d.x0;
      }
    }
  },
};
mixin(Game.prototype, BossIsleArt, true);
