/* ===== game/boss-watch-art.ts — 얼음 감시자 그림 — 걷는 두 다리 · 겨누는 어깨 포탑 · 렌즈의 빛줄기 · 떨어져 나가 바닥에 서는 포탑 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { Proj } from '../entity.js';
import { IW, beamAim, inBeam } from '../entity/boss-watch.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 멈춘 시계장이 아니게 — 걸을 땐 두 다리가 번갈아 딛고 몸이 출렁이며 · 속의 톱니가 돌고 · 렌즈 빛줄기가 늘 훑는다.
   빛줄기가 플레이어에 걸리면 푸른빛이 붉게 바뀐다(포탑이 쏜다는 예고) — 숫자 대신 빛으로 알린다.
   포탑은 받침(아래)은 그대로, 머리 · 포신(위)만 과녁 쪽으로 돈다 — 같은 조각을 위아래로 잘라 쓴다(받침 경계 19.5칸). 사연: docs/code-history.md#h235 */

type C2 = CanvasRenderingContext2D;
const K = IW.K, BW = IW.W * K, BH = IW.H * K, PW = 80, PH = 144, CUT = 19.5 * K, HEAD = [10 * K, 15 * K];

/** 빛줄기 원뿔 — 걸리면 붉게 */
function cone(c: C2, x: number, y: number, a: number, len: number, half: number, hot: number, al: number) {
  const r = Math.round(170 + 85 * hot), gch = Math.round(230 - 120 * hot), bch = Math.round(255 - 150 * hot);
  const g = c.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
  g.addColorStop(0, `rgba(${r},${gch},${bch},${0.26 * al})`); g.addColorStop(1, `rgba(${r},${gch},${bch},0)`);
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y);
  c.lineTo(x + Math.cos(a - half) * len, y + Math.sin(a - half) * len); c.lineTo(x + Math.cos(a + half) * len, y + Math.sin(a + half) * len); c.closePath(); c.fill();
}

export const BossWatchArt: Bag = {
  /** 포탑 하나 — 받침 + 도는 머리(base: 받침 아래 끝 자리 · k 배율 · a 포신 각(위 = 0)) · tri 면 세 다리 받침 */
  drawWatchGun(c: C2, pim: HTMLImageElement, x: number, y: number, k: number, a: number, tri: boolean, cracked: boolean) {
    const fr = tri ? 2 : cracked ? 4 : 1, by = tri ? 34 * K : 23 * K;
    c.save(); c.translate(x, y); c.scale(k, k);
    c.drawImage(pim, fr * PW, CUT, PW, PH - CUT, -PW / 2, CUT - by, PW, PH - CUT);                 // 받침(돌지 않는다)
    c.translate(HEAD[0] - PW / 2, HEAD[1] - by); c.rotate(a);
    c.drawImage(pim, (cracked ? 4 : 1) * PW, 0, PW, CUT, -HEAD[0], -HEAD[1], PW, CUT);             // 머리 · 포신
    c.restore();
  },
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawWatch(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('ice_warden'), pim = Sprites.want('ice_warden_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), step = e.iwStep || 0;
    const walk = Math.min(1, Math.abs(e.vx || 0) / 40), bob = e.iwBob || 0;
    const ox = sx + e.w / 2 - IW.CX * K, oy = sy + e.h - (IW.HIP_Y + IW.LEG) * K - bob;
    c.save(); c.imageSmoothingEnabled = false;
    /* 다리 — 번갈아 딛는다 */
    IW.HIPS.forEach((hx, i) => {
      const sw = Math.sin(step * Math.PI + i * Math.PI) * 0.28 * walk;
      c.save(); c.translate(ox + hx * K, oy + IW.HIP_Y * K); c.rotate(sw);
      c.drawImage(pim, (st >= 2 ? 3 : 0) * PW, 0, PW, PH, -10 * K, -5.4 * K, PW, PH); c.restore();
    });
    /* 몸 — 걸음마다 살짝 기운다 */
    const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1), tilt = Math.sin(step * Math.PI) * 0.025 * walk;
    c.save(); c.translate(ox + IW.CX * K, oy + IW.HIP_Y * K); c.rotate(tilt); c.translate(-IW.CX * K, -IW.HIP_Y * K);
    c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH);
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    /* 어깨 포탑 — 떨어져 나가기 전 · 과녁을 겨눈다 · 쏠 때 반동 */
    if (!e.iwFree) {
      const q = this.hzNear(e.cx, e.cy);
      IW.SEATS.forEach(([px, py], i) => {
        const wx = ox + px * K + this.cam.x, wy = oy + py * K + this.cam.y - 70;
        let a = q ? Math.atan2(q.cy - wy, q.cx - wx) + Math.PI / 2 : 0;
        a = Math.max(-1.0, Math.min(1.0, Math.atan2(Math.sin(a), Math.cos(a))));   // 더 눕히면 포신이 머리를 가로질렀다
        const kick = e.iwKick && e.iwKick.side === i ? Math.max(0, 1 - (T - e.iwKick.t) * 6) : 0;
        this.drawWatchGun(c, pim, px * K, py * K + kick * 6, 1.3, a, false, st >= 1 && i === 1);
      });
    }
    c.restore();
    c.restore();
    e.iwLensS = [ox + IW.LENS[0] * K + this.cam.x, oy + IW.LENS[1] * K + this.cam.y];
    return true;
  },
  /** 빛(fx 단계) — 렌즈의 빛줄기 · 렌즈 빛 */
  drawWatchGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_watch' || !e.iwLensS) continue;
      const [lx, ly] = e.iwLensS, a = beamAim(lx, ly, T, 0, 0.5, 0.9 + (e.pf || 0) * 0.4);
      const hot = inBeam(lx, ly, a, IW.BEAM, IW.HALF, this.hzNear(lx, ly)) ? 1 : 0;
      e.iwHot = (e.iwHot || 0) + (hot - (e.iwHot || 0)) * 0.2;
      c.save(); c.globalCompositeOperation = 'lighter';
      cone(c, lx - f.camX, ly - f.camY, a, IW.BEAM, IW.HALF, e.iwHot, 1);
      hzGlow(c, lx - f.camX, ly - f.camY, 22 + 6 * Math.sin(T * 5), e.iwHot > 0.5 ? '#ffb0a0' : '#bff0ff', 0.7);
      c.restore();
    }
  },
  /** 떨어져 나간 포탑(iwtur) — 처음 0.6초는 어깨에서 포물선으로 날아와 꽂힌다 · 그다음 제 빛줄기로 훑는다 */
  drawWatchTurret(c: C2, h: Bag, cx0: number, cy0: number, f: number) {
    const pim = Sprites.want('ice_warden_parts'); if (!pim) return false;
    const u = Math.min(1, h.t / 0.6), x = h.fx0 + (h.x - h.fx0) * u - cx0, y = h.fy0 + (h.y - h.fy0) * u - Math.sin(u * Math.PI) * 140 - cy0;
    c.save(); c.globalAlpha = f; c.imageSmoothingEnabled = false;
    this.drawWatchGun(c, pim, x, y, 1.3, u < 1 ? h.t * 12 : (h.aim !== undefined ? h.aim + Math.PI / 2 : 0), true, false);
    c.restore();
    if (u >= 1 && h.aim !== undefined) {
      const mx = x, my = y - (34 - 15) * K * 1.3;
      c.save(); c.globalCompositeOperation = 'lighter';
      cone(c, mx, my, h.aim, IW.TBEAM, IW.THALF, h.seen || 0, f);
      hzGlow(c, mx, my, 12, (h.seen || 0) > 0.5 ? '#ffb0a0' : '#bff0ff', 0.6 * f);
      c.restore();
    }
    return true;
  },
  /** 떨어져 나간 포탑의 매 틱 — 제 빛줄기에 걸리면 쏜다(호스트) · 감시자가 쓰러지면 꺼진다 */
  watchHz(h: Bag, dt: number, host: boolean) {
    const b = this.hzBoss(h);
    if (!b) { h.life = Math.min(h.life, h.t + 0.3); return true; }
    if (h.t < 0.6) return true;
    if (!h.landed) { h.landed = 1; this.vfx.puffs(h.x, h.y, 5, 14, 'rgba(220,240,255,.7)', 0.8, 20); this.shake = Math.max(this.shake, 4); }
    const T = this.time || 0, mx = h.x, my = h.y - (34 - 15) * K * 1.3, q = this.hzNear(mx, my);
    h.aim = beamAim(mx, my, T, h.sd, 0.7, 1.25);
    h.seen = Math.max(0, Math.min(1, (h.seen || 0) + (inBeam(mx, my, h.aim, IW.TBEAM, IW.THALF, q) ? dt * 5 : -dt * 2)));
    h.fire -= dt;
    if (host && q && h.seen > 0.6 && h.fire <= 0) {
      h.fire = 1.1;
      const bx = mx + Math.cos(h.aim) * 50, by = my + Math.sin(h.aim) * 50, a = Math.atan2(q.cy - by, q.cx - bx);
      this.projs.push(new Proj(bx, by, Math.cos(a) * 400, Math.sin(a) * 400, b.dmg * 0.4, 'enemy', 'frost'));
    }
    return true;
  },
};
mixin(Game.prototype, BossWatchArt, true);
