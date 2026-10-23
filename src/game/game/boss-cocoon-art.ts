/* ===== game/boss-cocoon-art.ts — 잿빛 고치 · 불나방의 그림 — 매단 실과 고치(인물 앞) · 빈 허물과 늘어진 실 · 번데기(인물 뒤) · 속불 · 눈 · 예고(빛 뒤) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { COC, TIE_OFF, hangAt } from '../entity/boss-cocoon.js';
import { Game } from '../game.js';
import { flowBand, groundZone, hs, hzGlow, rgba } from './boss-hazard-art.js';
/* ★ 고치는 실 끝(매단 자리)을 축으로 기운다 — 판정 상자는 몸통 가운데지만 그림은 실 끝에서 돌린다(entity/boss-cocoon 의 COC · TIE_OFF).
   몸 · 나방은 actors 단계(drawEnemy 가 넘긴다 · 빛을 받는다), 빈 허물 · 늘어진 실 · 번데기는 objects 단계(인물 뒤), 속불 · 눈 · 예고는 fx 단계(빛 뒤). */

type C2 = CanvasRenderingContext2D;
const SILK = '#b4ada2', FIRE = '#ff8a40';

function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
/** 번데기 키(px · 조각 12번 0.62배) · 실이 다 내려왔을 때 번데기 밑동은 h.y */
export const PUPA_H = 69;
export const threadPupa = (h: Bag, k: number) => h.top + PUPA_H + (h.y - h.top - PUPA_H) * (0.15 + 0.85 * k);
const isCoc = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_cocoon';
/** 매단 실 — 살짝 처지고(실 길이 · 각에 비례) 결이 비친다 */
function thread(c: C2, x0: number, y0: number, x1: number, y1: number, sag: number, a = 1) {
  const mx = (x0 + x1) / 2 + sag, my = (y0 + y1) / 2;
  c.globalAlpha = a; c.lineCap = 'round';
  c.strokeStyle = '#4a4540'; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
  c.strokeStyle = SILK; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 - 0.5, y0); c.quadraticCurveTo(mx - 0.5, my, x1 - 0.5, y1); c.stroke();
  c.globalAlpha = 1;
}
/** 매단 자리 — 천장에 실이 엉겨 붙은 덩이 */
function knot(c: C2, x: number, y: number) {
  c.fillStyle = '#6e6860'; c.beginPath(); c.ellipse(x, y + 2, 16, 6, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(200,192,180,.7)'; c.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 6, y); c.quadraticCurveTo(x + i * 3, y + 8, x, y + 12); c.stroke(); }
}

export const BossCocoonArt: Bag = {
  /** 고치 · 나방 몸(actors · drawEnemy 에서) */
  drawCocoon(c: C2, e: Enemy, sx: number, sy: number) {
    const camX = e.cx - sx - e.w / 2, camY = e.cy - sy - e.h / 2, T = this.time || 0;
    if (!e.cocMoth && !this.cocMothSeen(e)) {
      const im = Sprites.want('corrupt_heart');
      const H = hzOf(this, e, 'chang');
      const ax = H ? H.ax : e.cx, ay = H ? H.ay : e.cy - TIE_OFF - 260;
      const th = Math.atan2(e.cx - ax, e.cy - ay);
      const tx = e.cx - Math.sin(th) * TIE_OFF, ty = e.cy - Math.cos(th) * TIE_OFF;
      thread(c, ax - camX, ay - camY, tx - camX, ty - camY, -th * 30);
      knot(c, ax - camX, ay - camY);
      if (!im) return;
      const hpr = e.hp / e.maxHp, st = hpr > 0.9 ? 0 : hpr > 0.78 ? 1 : 2;
      const fr = st * 2 + (Math.sin(T * (2 + st)) > 0.3 ? 1 : 0);
      const shiver = st === 2 ? Math.sin(T * 40) * 0.008 : 0;
      c.save(); c.translate(tx - camX, ty - camY); c.rotate(-th + shiver); c.imageSmoothingEnabled = false;
      c.drawImage(im, fr * COC.FW, 0, COC.FW, COC.FH, -COC.CX, -COC.TIE, COC.FW, COC.FH);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * COC.FW, 0, COC.FW, COC.FH, -COC.CX, -COC.TIE, COC.FW, COC.FH); }
      c.restore();
      return;
    }
    const im = Sprites.want('corrupt_heart_parts'); if (!im) return;
    const torn = e.phase >= 2, D = hzOf(this, e, 'cdive');
    const diving = D && D.t >= D.tele * 0.6 && D.t < D.tele + D.dur;
    const rate = torn ? 15 : 11, fr = diving ? 13 : (torn ? 6 : 0) + Math.floor(T * rate) % 6;
    const tilt = diving ? Math.atan2(D.y1 - D.y0, D.x1 - D.x0) + Math.PI / 2 : Math.max(-0.25, Math.min(0.25, e.vx * 0.0012));
    const x = e.cx - camX, y = e.cy - camY;
    c.save(); c.translate(x, y); c.rotate(diving ? tilt : tilt); c.imageSmoothingEnabled = false;
    c.drawImage(im, fr * COC.MOTH_W, 0, COC.MOTH_W, COC.MOTH_H, -COC.MOTH_W / 2, -COC.MOTH_H / 2, COC.MOTH_W, COC.MOTH_H);
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * COC.MOTH_W, 0, COC.MOTH_W, COC.MOTH_H, -COC.MOTH_W / 2, -COC.MOTH_H / 2, COC.MOTH_W, COC.MOTH_H); }
    c.restore();
  },
  /** 참가자 — 고치가 터진 것은 허물 위험 지대로 안다(나방 여부 칸은 호스트 몸에만 있다) */
  cocMothSeen(e: Enemy) { return !!hzOf(this, e, 'chusk'); },

  /** 인물 뒤(objects) — 빈 허물 · 늘어진 실 끝의 번데기 */
  drawCocoonBack(f: any) {
    const L = this.bhz; if (!L || !L.length) return;
    const c: C2 = f.c, T = this.time || 0;
    for (const h of L) {
      if (h.k === 'chusk') {
        const im = Sprites.want('corrupt_heart'), th = Math.sin(T * 0.9 + 1) * 0.05;
        const [cx, cy] = hangAt(h.ax, h.ay, h.R, th);
        const tx = cx - Math.sin(th) * TIE_OFF - f.camX, ty = cy - Math.cos(th) * TIE_OFF - f.camY;
        thread(c, h.ax - f.camX, h.ay - f.camY, tx, ty, -th * 30);
        knot(c, h.ax - f.camX, h.ay - f.camY);
        if (im) { c.save(); c.translate(tx, ty); c.rotate(-th); c.drawImage(im, (6 + (Math.sin(T * 1.7) > 0 ? 1 : 0)) * COC.FW, 0, COC.FW, COC.FH, -COC.CX, -COC.TIE, COC.FW, COC.FH); c.restore(); }
      } else if (h.k === 'cthread') {
        const k = h.t < h.tele ? 0 : Math.min(1, (h.t - h.tele) / h.drop), fade = Math.min(1, (h.life - h.t) * 2);
        if (k <= 0) continue;
        const sway = Math.sin(T * 1.6 + h.sd) * 6 * k, x = h.x - f.camX, top = h.top - f.camY;
        const py = threadPupa(h, k) - PUPA_H - f.camY;               // 번데기 꼭대기(실 끝)
        thread(c, x, top, x + sway, py, sway * 0.5, fade);
        const im = Sprites.want('corrupt_heart_parts');
        if (im) {
          c.save(); c.globalAlpha = fade; c.translate(x + sway, py); c.rotate(-sway * 0.012);
          const s = 0.62;                                           // 조각 12번 — 번데기는 장 위 (200, 48) 에서 매달린다
          c.drawImage(im, 12 * COC.MOTH_W, 0, COC.MOTH_W, COC.MOTH_H, -200 * s, -48 * s, COC.MOTH_W * s, COC.MOTH_H * s);
          c.restore();
        }
      }
    }
  },

  /** 빛 뒤(fx) — 고치 속불 · 나방 눈과 날개 눈 무늬 · 어두워진 방(장송) */
  drawCocoonGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isCoc(e)) continue;
      const x = e.cx - f.camX, y = e.cy - f.camY;
      if (!e.cocMoth && !this.cocMothSeen(e)) {
        const hpr = e.hp / e.maxHp, st = hpr > 0.9 ? 0 : hpr > 0.78 ? 1 : 2;
        hzGlow(c, x, y + 10, 50 + st * 22 + Math.sin(T * (2 + st)) * 8, FIRE, 0.16 + st * 0.1);
        continue;
      }
      const torn = e.phase >= 2 ? 1 : 0;
      hzGlow(c, x, y - 34, 22, '#ffd27a', 0.5);                     // 겹눈
      const span = 118 * (0.6 + 0.4 * Math.abs(Math.cos(T * (torn ? 15 : 11) * 1.05)));
      for (const s of [-1, 1]) hzGlow(c, x + s * span, y - 36, 26 + torn * 10, FIRE, 0.35 + torn * 0.15);   // 날개 눈 무늬
      hzGlow(c, x, y + 20, 60, FIRE, 0.12 + torn * 0.08);
    }
    const D = (this.bhz || []).find((h: Bag) => h.k === 'cdark');
    if (D) {                                                         // 빛을 쫓는다 — 방이 어두워지고, 빛(횃불 · 나방)만 남는다
      const k = Math.min(1, D.t * 2, (D.life - D.t) * 2) * 0.5;
      c.fillStyle = `rgba(6,4,8,${k})`; c.fillRect(0, 0, f.w || this.W, f.h || this.H);
    }
  },

  /** 예고(drawSig 에서) — 그렸으면 true */
  cocoonTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const T = this.time || 0, b = this.hzBoss(h);
    switch (h.k) {
      case 'chang': case 'chusk': case 'cdark': return true;
      case 'cswing': {                                              // 시계추 — 고치 밑동이 사람 키 높이로 지나가는 구간만 바닥이 달아오르고, 그 위로 열기가 흐른다
        const H = b && hzOf(this, b, 'chang'); if (!H || h.t > h.tele + h.dur) return true;
        const k = Math.min(1, h.t / h.tele), fade = h.t > h.tele ? 1 - (h.t - h.tele) / h.dur : 1;
        const fy = this.hzFloor(H.ax, H.ay + H.R), Rb = H.R + COC.H * 0.5;
        let xa = H.ax, xb = H.ax;                                   // 밑동이 바닥 위 90px 안으로 내려오는 각의 가로 범위
        for (let i = 0; i <= 24; i++) {
          const th = h.s * h.amp * 0.82 * i / 24, y = H.ay + Math.cos(th) * Rb;
          if (y < fy - 90) break;
          const x = H.ax + Math.sin(th) * Rb; xa = Math.min(xa, x - 50); xb = Math.max(xb, x + 50);
        }
        groundZone(c, (xa + xb) / 2 - cx0, fy - cy0, (xb - xa) / 2, FIRE, k * fade, T);
        flowBand(c, (h.id || 3) * 0.7, xa - cx0, xb - cx0, fy - 90 - cy0, fy - cy0, h.s, FIRE, k * fade, T);
        return true;
      }
      case 'cthread': {                                             // 실이 내려오기 전 — 천장에서 바닥까지 반짝이는 한 줄 · 바닥이 달아오른다
        if (h.t >= h.tele + h.drop) return true;
        const k = Math.min(1, h.t / h.tele), x = h.x - cx0;
        const g = c.createLinearGradient(0, h.top - cy0, 0, h.y - cy0);
        g.addColorStop(0, rgba('#fff0d8', 0.5 * k)); g.addColorStop(1, rgba('#fff0d8', 0));
        c.fillStyle = g; c.fillRect(x - 0.75, h.top - cy0, 1.5, h.y - h.top);
        const gy = h.top + (h.y - h.top) * ((T * 1.8 + hs(h.sd, 1)) % 1);   // 실을 타고 흐르는 반짝임
        hzGlow(c, x, gy - cy0, 6, '#fff0d8', 0.6 * k);
        groundZone(c, x, h.y + 14 - cy0, 26, FIRE, k, T);
        return true;
      }
      case 'cgust': {                                               // 날개 바람 — 나방 양옆으로 바람결이 흐르고, 칠 때마다 바닥 먼지 띠
        if (!b) return true;
        const fy = this.hzFloor(b.cx, b.cy), k = Math.min(1, h.t / h.tele), y0 = Math.min(b.cy, fy - 80);
        for (const s of [-1, 1]) {
          const xa = b.cx + s * 60, xb = b.cx + s * 560;
          flowBand(c, (h.id || 1) * 0.3 + s, Math.min(xa, xb) - cx0, Math.max(xa, xb) - cx0, y0 - cy0, fy - cy0, s, '#ffd2a0', k * 0.8, T);
        }
        return true;
      }
      case 'cscale': {                                              // 인분 — 반짝이며 내려오다 앉은 자리가 탄다
        const x = h.x - cx0, y = h.y - cy0;
        if (h.t < h.delay) {
          const u = h.t / h.delay;
          for (let i = 0; i < 7; i++) {
            const px = x + (hs(h.sd, i) - 0.5) * h.w + Math.sin(T * 3 + i) * 8, py = (h.sy - cy0) + (y - (h.sy - cy0)) * Math.min(1, u * (0.8 + hs(h.sd, i + 4) * 0.4));
            hzGlow(c, px, py, 5, FIRE, 0.7); c.fillStyle = '#ffd8b0'; c.fillRect(px - 1, py - 1, 2, 2);
          }
          groundZone(c, x, y, h.w / 2, FIRE, u, T);
        } else {
          const k = Math.min(1, (h.life - h.t) * 1.5);
          groundZone(c, x, y, h.w / 2, FIRE, 0.65 * k, T);
          for (let i = 0; i < 5; i++) {                            // 타는 가루 — 작은 불꽃이 깜박인다
            const px = x + (hs(h.sd, i + 20) - 0.5) * h.w, fl = Math.abs(Math.sin(T * 9 + i * 2));
            hzGlow(c, px, y - 3 - fl * 4, 6 + fl * 4, FIRE, 0.5 * k);
          }
        }
        return true;
      }
      case 'cdive': {                                               // 불나방 — 빛까지 달아오르는 길 · 빛(과녁)이 고동친다
        if (h.t >= h.tele + h.dur) return true;
        const k = Math.min(1, h.t / h.tele), fade = h.t > h.tele ? 1 - (h.t - h.tele) / h.dur : 1;
        const x0 = h.x0 - cx0, y0 = h.y0 - cy0, x1 = h.x1 - cx0, y1 = h.y1 - cy0, len = Math.hypot(x1 - x0, y1 - y0) || 1;
        c.save(); c.translate(x0, y0); c.rotate(Math.atan2(y1 - y0, x1 - x0));
        c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, rgba(FIRE, 0.05)); g.addColorStop(0.7, rgba(FIRE, (0.12 + 0.3 * k) * fade)); g.addColorStop(1, rgba(FIRE, 0));
        c.fillStyle = g; c.beginPath(); c.moveTo(0, -30); c.lineTo(len, -10); c.lineTo(len, 10); c.lineTo(0, 30); c.closePath(); c.fill();
        for (let i = 0; i < 6; i++) {                               // 끌려가는 불티
          const u = (hs(h.id || 2, i) + T * (0.6 + k * 1.8)) % 1;
          c.fillStyle = rgba('#ffd8a0', (0.3 + 0.6 * k) * fade * Math.sin(u * Math.PI)); c.fillRect(u * len, (hs(h.id || 2, i + 6) - 0.5) * 34 * (1 - u * 0.6), 3, 1.5);
        }
        c.restore();
        const pul = 0.5 + 0.5 * Math.sin(T * 16);
        hzGlow(c, h.lx - cx0, h.ly - cy0, 30 + pul * 12 * k, h.bait ? '#ffe08a' : FIRE, (0.3 + 0.4 * k) * fade);
        return true;
      }
    }
    return false;
  },
};

mixin(Game.prototype, BossCocoonArt, true);
