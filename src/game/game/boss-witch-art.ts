/* ===== game/boss-witch-art.ts — 서리 마녀 실비아의 그림 — 떠 있는 몸 · 망토가 얼음 날개로 펼쳐진다 · 지팡이 팔 · 주문 손 · 하얀 숨 · 거울 분신 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { Part } from '../entity.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 진짜 실비아만 하얀 숨을 내쉰다 — 거울 분신(decoy)은 같은 그림을 옅게 그리되 숨이 없다(사용자 계획: "진짜는 숨결이 하얗다").
   분신을 가려낼 단서이니 숨을 다른 데서 지우지 말 것. 멈춘 인형이 아니게 — 늘 떠서 흔들리고 · 망토가 숨 쉬고 · 지팡이 수정이 고동치며 · 빈손이 주문을 짓는다.
   설계 좌표는 tools/mkbossrig.py witch_* 와 같다(44×58 칸 · 판정 가운데 (22, 30)). 사연: docs/code-history.md#h231 */

type C2 = CanvasRenderingContext2D;
const K = 4, BW = 176, BH = 232, PW = 112, PH = 224, FROST = '#bfefff';
const C0 = [22, 30], SH = [7, 22], MOUTH = [22, 16];
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));

/** 그림의 한 점(설계 칸) → 화면 — 몸 가운데 (x, y) · 바라보는 쪽 s · 기울기 a */
function at(x: number, y: number, s: number, a: number, dx: number, dy: number): [number, number] {
  const ox = (dx - C0[0]) * K * s, oy = (dy - C0[1]) * K, ca = Math.cos(a), sa = Math.sin(a);
  return [x + ox * ca - oy * sa, y + ox * sa + oy * ca];
}

export const BossWitchArt: Bag = {
  /** 실비아 한 몸 — ghost 면 거울 분신(옅고 · 숨 없고 · 눈빛 없음) */
  drawWitchRig(c: C2, e: Bag, x: number, y: number, s: number, ghost: number) {
    const im = Sprites.want('frost_witch'), pim = Sprites.want('frost_witch_parts'); if (!im || !pim) return false;
    const T = this.time || 0, A = e.fwA || (e.fwA = { sp: 0, cast: 0, t0: T, br: 0 });
    const dt = this.paused ? 0 : Math.max(0, Math.min(0.1, T - A.t0)); A.t0 = T;
    const st = Math.min(2, Math.round((e.pf || 0) * 2)), busy = !!(e.mv && e.mv.d);
    A.sp = ease(A.sp, busy || ghost ? 1 : 0.08 + 0.06 * Math.sin(T * 1.3), dt, busy ? 5 : 2);          // 기술 땐 망토가 얼음 날개로
    A.cast = ease(A.cast, busy || (e.atkCd !== undefined && e.atkCd < 0.25) ? 1 : 0, dt, 6);
    const bob = Math.sin(T * 1.9 + (ghost ? 1.3 : 0)) * 6, tilt = Math.max(-0.18, Math.min(0.18, (e.vx || 0) * 0.0007)) + Math.sin(T * 0.8) * 0.02;
    const X = x, Y = y + bob;
    c.save(); c.imageSmoothingEnabled = false;
    if (ghost) c.globalAlpha *= 0.5 + 0.08 * Math.sin(T * 7);
    /* 망토 — 어깨 둘에 걸려 숨에 맞춰 벌어지고, 기술 땐 얼음 결정 날개로 바뀌며 펼쳐진다 */
    for (const side of [-1, 1]) {
      const [ax, ay] = at(X, Y, s, tilt, C0[0] + side * SH[0], SH[1] - 2);
      const ang = 0.22 + Math.sin(T * 1.4 + side) * 0.04 - A.sp * 1.05;
      c.save(); c.translate(ax, ay); c.rotate(tilt); c.scale(side * s, 1); c.rotate(ang);
      const a0 = c.globalAlpha;
      if (A.sp < 0.98) { c.globalAlpha = a0 * (1 - A.sp); c.drawImage(pim, 3 * PW, 0, PW, PH, -24 * 0.74, -12 * 0.74, PW * 0.74, PH * 0.74); }   // 치맛자락보다 짧게 — 땅까지 끌렸다
      if (A.sp > 0.02) { c.globalAlpha = a0 * A.sp; c.drawImage(pim, 4 * PW, 0, PW, PH, -24, -16, PW * (0.8 + 0.2 * A.sp), PH * (0.8 + 0.2 * A.sp)); }
      c.restore();
    }
    /* 지팡이 팔(뒤쪽 손) — 아래로 짚은 지팡이가 숨에 맞춰 흔들린다 */
    const back = -1;
    const [bsx, bsy] = at(X, Y, s, tilt, C0[0] + back * SH[0], SH[1]);
    const ba = Math.PI / 2 - 0.55 + Math.sin(T * 1.1) * 0.05 - A.cast * 0.35;
    c.save(); c.translate(bsx, bsy); c.scale(back * s, 1); c.rotate(ba);
    c.drawImage(pim, 1 * PW, 0, PW, PH, -16, -112, PW, PH);
    c.restore();
    const hx = bsx + Math.cos(ba) * 76 * back * s, hy = bsy + Math.sin(ba) * 76;
    const sa = Math.sin(T * 1.1 + 0.5) * 0.06 - back * s * 0.1;
    c.save(); c.translate(hx, hy); c.rotate(sa); c.drawImage(pim, 0, 0, PW, PH, -56, -136, PW, PH); c.restore();
    e.fwOrb = [hx + Math.sin(sa) * 112, hy - Math.cos(sa) * 112];
    /* 몸 */
    const fr = st * 2 + ((T % 1.8) < 0.9 ? 0 : 1);
    c.save(); c.translate(X, Y); c.rotate(tilt); if (s < 0) c.scale(-1, 1);
    c.drawImage(im, fr * BW, 0, BW, BH, -C0[0] * K, -C0[1] * K, BW, BH);
    if (!ghost && e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, -C0[0] * K, -C0[1] * K, BW, BH); }
    c.restore();
    /* 주문 손(앞쪽) — 쉴 땐 아래로 내리고, 주문 땐 플레이어 쪽으로 손바닥을 편다 */
    const [fsx, fsy] = at(X, Y, s, tilt, C0[0] + SH[0], SH[1]);
    const fa = (1 - A.cast) * (1.25 + Math.sin(T * 1.6) * 0.06) + A.cast * (-0.25 + Math.sin(T * 9) * 0.04);
    c.save(); c.translate(fsx, fsy); c.scale(s, 1); c.rotate(fa);
    c.drawImage(pim, (A.cast > 0.5 ? 2 : 1) * PW, 0, PW, PH, -16, -112, PW, PH);
    c.restore();
    e.fwHand = [fsx + Math.cos(fa) * 92 * s, fsy + Math.sin(fa) * 92];
    c.restore();
    /* 하얀 숨 — 진짜만. 입에서 바라보는 쪽으로 김이 서린다 */
    if (!ghost && !this.paused) {
      A.br += dt;
      const decoys = (this.bhz || []).some((h: Bag) => h.k === 'decoy' && h.type === 'frost_witch');
      if (A.br > (decoys ? 0.4 : 1.1)) {        // 분신이 떠 있는 동안은 자주 — 그때가 숨을 찾아야 할 때
        A.br = 0;
        const [mx, my] = at(X + (this.cam ? this.cam.x : 0), Y + (this.cam ? this.cam.y : 0), s, tilt, MOUTH[0] + 3, MOUTH[1] + 2);
        this.vfx.puffs(mx + s * 10, my, 3, 9, 'rgba(244,252,255,.75)', 1.2, 14);
        for (let i = 0; i < 7; i++) {
          const pt = new Part(mx, my, i % 2 ? '#ffffff' : '#e4f6ff', 0, 1.1 + Math.random() * 0.5, { spd: 0, r: 2.2 + Math.random() * 1.6, g: -0.05, drag: 0.94 });
          pt.vx = s * (30 + Math.random() * 40); pt.vy = -6 - Math.random() * 14; this.parts.push(pt);
        }
      }
    }
    return true;
  },
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawWitch(c: C2, e: Bag, sx: number, sy: number) {
    const q = this.hzNear(e.cx, e.cy), s = q ? (q.cx >= e.cx ? 1 : -1) : (e.facing || 1);
    if (!this.drawWitchRig(c, e, sx + e.w / 2, sy + e.h / 2, s, 0)) return false;
    const T = this.time || 0;
    if (e.fwOrb) { c.save(); c.globalCompositeOperation = 'lighter'; hzGlow(c, e.fwOrb[0], e.fwOrb[1], 26 + 6 * Math.sin(T * 3), FROST, 0.5); c.restore(); }
    if (e.fwHand && e.fwA && e.fwA.cast > 0.4) { c.save(); c.globalCompositeOperation = 'lighter'; hzGlow(c, e.fwHand[0], e.fwHand[1], 22, FROST, 0.6 * e.fwA.cast); c.restore(); }
    return true;
  },
  /** 거울 분신 — 진짜와 같은 몸을 옅게(숨 없음) · 둘레에 거울 테 */
  drawWitchGhost(c: C2, h: Bag, x: number, y: number, f: number) {
    const g = h.fwG || (h.fwG = { pf: 0 });
    const b = this.boss && this.boss.def && this.boss.def.ai === 'b_witch' ? this.boss : null;
    g.pf = b ? b.pf : 0; g.mv = { d: 1 }; g.atkCd = 1;
    c.save(); c.globalAlpha = f;
    this.drawWitchRig(c, g, x, y, h.flip ? -1 : 1, 1);
    c.restore();
  },
};
mixin(Game.prototype, BossWitchArt, true);
