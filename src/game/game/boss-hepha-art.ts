/* ===== game/boss-hepha-art.ts — 헤파 그림 — 공장 앞면 · 박자에 열리는 화로 문 · 그 안의 핵 · 굴뚝 연기 · 바닥 컨베이어 · 기중기 팔 둘과 쇳물 국자 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { HP } from '../entity/boss-hepha.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 멈춘 건물이 아니게 — 굴뚝이 연기를 뿜고 · 창이 숨 쉬고 · 컨베이어가 화로 쪽으로 흐르고 · 문이 박자에 맞춰 여닫히며 · 팔이 늘 흔들린다.
   몸(앞면 · 핵 · 문)은 objects 단계(플레이어 뒤), 팔은 actors 단계(앞) — 팔이 플레이어를 덮쳐 내리친다.
   팔은 두 마디 IK(윗마디 128 · 아랫마디 116px) — 쇳물 붓기 땐 국자를 그 자리(crucible 위험 지대)로 가져가 기울인다. 사연: docs/code-history.md#h238 */

type C2 = CanvasRenderingContext2D;
const K = HP.K, BW = HP.W * K, BH = HP.H * K, PW = 160, PH = 192, FIRE = '#ffb050';

/** 두 마디 팔의 팔꿈치 — 어깨 (sx, sy) 에서 과녁 (tx, ty) 으로, 팔꿈치는 bend 쪽으로 꺾인다 */
function elbow(sx: number, sy: number, tx: number, ty: number, a: number, b: number, bend: number): [number, number, number, number] {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1;
  if (d > a + b - 1) { dx *= (a + b - 1) / d; dy *= (a + b - 1) / d; d = a + b - 1; }
  const base = Math.atan2(dy, dx), cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))), A = base + bend * Math.acos(cosA);
  const ex = sx + Math.cos(A) * a, ey = sy + Math.sin(A) * a;
  return [ex, ey, sx + dx, sy + dy];
}

export const BossHephaArt: Bag = {
  /** 몸(objects 단계) — 앞면 · 핵 · 화로 문 · 컨베이어 · 굴뚝 연기 */
  drawHephaBody(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_hepha' || !e.anchored) continue;
      const im = Sprites.want('hepha'), pim = Sprites.want('hepha_parts'); if (!im || !pim) continue;
      const [wx, wy] = e.hpOrigin(), ox = wx - f.camX, oy = wy - f.camY, st = Math.min(2, Math.round((e.pf || 0) * 2));
      c.save(); c.imageSmoothingEnabled = false;
      /* 바닥 컨베이어 — 화로 쪽으로 흐르는 띠 · 굴대 */
      const fy = oy + (HP.BASE + 1) * K, x0 = ox - 120, x1 = ox + BW + 120, mid = ox + HP.CX * K;
      c.fillStyle = '#2a2420'; c.fillRect(x0, fy - 10, x1 - x0, 10);
      c.fillStyle = '#4a423a'; c.fillRect(x0, fy - 10, x1 - x0, 2);
      for (let x = x0 + ((T * 60) % 24); x < x1; x += 24) {
        const s = x < mid ? 1 : -1, xx = s > 0 ? x : x1 - (x - x0);
        c.fillStyle = '#6a5a48'; c.beginPath(); c.moveTo(xx, fy - 8); c.lineTo(xx + s * 6, fy - 5); c.lineTo(xx, fy - 2); c.fill();
      }
      for (let x = x0 + 12; x < x1; x += 48) { c.fillStyle = '#3a3430'; c.beginPath(); c.arc(x, fy - 5, 4, 0, Math.PI * 2); c.fill(); }
      /* 앞면 */
      const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
      c.drawImage(im, fr * BW, 0, BW, BH, ox, oy, BW, BH);
      /* 핵 — 문 안쪽(문이 열리면 보인다) */
      const pulse = 1 + Math.sin(T * 5) * 0.04;
      c.save(); c.translate(ox + HP.CX * K, oy + 82 * K); c.scale(pulse, pulse);
      c.drawImage(pim, (st >= 2 ? 6 : 1) * PW, 0, PW, PH, -20 * K, -24 * K, PW, PH); c.restore();
      if (e.flash > 0 && (e.hpDoor || 0) > 0.6) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.6, e.flash * 4); hzGlow(c, ox + HP.CX * K, oy + 82 * K, 60, '#fff0c0', 1); c.restore(); }
      /* 화로 문 — 두 쪽이 경첩 쪽으로 접히며 열린다 */
      const open = e.hpDoor || 0, sy = 47 / 43;
      for (const s of [-1, 1]) {
        c.save(); c.translate(ox + (HP.CX + s * 18) * K, oy + (HP.BASE) * K); c.scale(-s * (1 - 0.86 * open), sy);
        c.drawImage(pim, (st >= 2 ? 5 : 0) * PW, 0, PW, PH, -2 * K, -47 * K, PW, PH); c.restore();
      }
      c.restore();
      /* 굴뚝 연기 */
      if (!this.paused && Math.random() < 0.25) for (const [cxd, cyd] of HP.CHIM) this.vfx.puffs(wx + cxd * K + (Math.random() - 0.5) * 10, wy + cyd * K, 1, 14 + Math.random() * 8, 'rgba(70,62,58,.55)', 2.4, 10);
    }
  },
  /** 팔(actors 단계 · drawEnemy 가 넘긴다) — 쉴 땐 흔들 · 내리치기 · 국자 붓기 */
  drawHephaArms(c: C2, e: Bag) {
    const pim = Sprites.want('hepha_parts'); if (!pim || !e.anchored) return;
    const T = this.time || 0, [wx, wy] = e.hpOrigin(), cam = this.cam, fy = wy + (HP.BASE + 1) * K;
    const pours = (this.bhz || []).filter((h: Bag) => h.k === 'crucible' && h.arm !== undefined && h.t < h.life);
    c.save(); c.imageSmoothingEnabled = false;
    HP.SH.forEach(([sxd, syd], i) => {
      const side = i === 0 ? -1 : 1, sx = wx + sxd * K, sy = wy + syd * K;
      let tx = sx + side * 170 + Math.sin(T * 0.9 + i * 2) * 14, ty = sy + 150 + Math.cos(T * 1.2 + i) * 10, tilt = 0;
      const sl = e.hpArm && e.hpArm.side === i ? T - e.hpArm.t : 99;
      if (sl < 1.4) {
        if (sl < 0.55) { tx = sx + side * 120; ty = sy - 70; }
        else if (sl < 0.8) { tx = e.hpArm.x; ty = fy - 30; }
        else { tx = e.hpArm.x - side * 20; ty = fy - 50; }
      }
      const pr = pours.find((h: Bag) => h.arm === i);
      if (pr) { tx = pr.x - 14; ty = pr.top - 20; tilt = Math.min(1, pr.t / pr.pour) * 1.1; }
      const [ex, ey, hx, hy] = elbow(sx, sy, tx, ty, HP.UP, HP.LO, side < 0 ? 1 : -1);
      const seg = (fr: number, ax: number, ay: number, bx: number, by: number) => {
        c.save(); c.translate(ax - cam.x, ay - cam.y); c.rotate(Math.atan2(by - ay, bx - ax));
        c.drawImage(pim, fr * PW, 0, PW, PH, -4 * K, -24 * K, PW, PH); c.restore();
      };
      seg(2, sx, sy, ex, ey); seg(3, ex, ey, hx, hy);
      /* 국자 — 걸쇠에 매달려 늘 아래로 · 부을 땐 기운다 */
      c.save(); c.translate(hx - cam.x, hy - cam.y); c.rotate(-side * tilt * (pr ? 1 : 0) + Math.sin(T * 1.6 + i) * 0.05);
      c.drawImage(pim, 4 * PW, 0, PW, PH, -20 * K, -8 * K, PW, PH); c.restore();
    });
    c.restore();
  },
  /** 빛(fx 단계) — 현창 눈 · 핵(문이 열린 만큼) · 국자 쇳물 */
  drawHephaGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_hepha' || !e.anchored) continue;
      const [wx, wy] = e.hpOrigin(), ox = wx - f.camX, oy = wy - f.camY;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [x, y] of HP.EYES) hzGlow(c, ox + x * K, oy + y * K, 20 + Math.sin(T * 3) * 3, FIRE, 0.55);
      hzGlow(c, ox + HP.CX * K, oy + 82 * K, 30 + 70 * (e.hpDoor || 0), FIRE, 0.25 + 0.6 * (e.hpDoor || 0));
      c.restore();
    }
  },
};
mixin(Game.prototype, BossHephaArt, true);
