/* ===== game/boss-root-art.ts — 뿌리 대성당의 그림 — 고목 몸 · 흔들리는 가지 · 우듬지 · 옹이 눈(인물 뒤) · 솟는 뿌리 · 꽃 · 쓰러지는 줄기(인물 앞) · 눈빛 · 장미창(빛 뒤) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { RT, fellStage, rootStage, rtAt } from '../entity/boss-root.js';
import { Game } from '../game.js';
import { groundZone, hzGlow } from './boss-hazard-art.js';
/* ★ 몸 · 가지 · 우듬지 · 눈은 objects 단계(인물 뒤), 솟는 뿌리 · 꽃 · 쓰러지는 줄기는 drawBossLit(인물 앞), 눈빛 · 장미창은 fx(빛 뒤).
   멈춘 나무로 보이지 않게(사용자) 우듬지와 두 가지는 바람에 늘 흔들리고 · 옹이 속 눈동자는 플레이어를 따라 보며 깜빡이고 · 기술마다 가지가 움직인다. */

type C2 = CanvasRenderingContext2D;
const BW = 416, BH = 480, PW = 256, PH = 160, CW = 480, CH = 240, SAP = '#d8f080', EYE = '#e8f070';

function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
const isRt = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_root';
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));
function stepDt(g: Bag, e: Bag, key: string) {
  const T = g.time || 0, dt = g.paused ? 0 : Math.max(0, Math.min(0.1, T - (e[key] ?? T)));
  e[key] = T; return dt;
}
/** 쓰러지는 줄기 — 밑동(px, fy)에서 각 a(0 선 채 · 1 바닥)로 len 만큼 · 끝에 우듬지 */
function drawLog(c: C2, pim: HTMLImageElement, cim: HTMLImageElement | null, px: number, fy: number, s: number, len: number, a: number, alpha: number) {
  const ang = -Math.PI / 2 + s * a * Math.PI / 2;
  c.save(); c.globalAlpha = alpha; c.translate(px, fy); c.rotate(ang);
  for (let x = 0; x < len; x += PW - 8) c.drawImage(pim, 5 * PW, 0, PW, PH, x, -80, Math.min(PW, len - x + 8), PH);
  if (cim) { c.save(); c.translate(len, 0); c.rotate(Math.PI / 2); c.drawImage(cim, 0, 0, CW, CH, -CW * 0.42, -CH * 0.84 + 20, CW * 0.84, CH * 0.84); c.restore(); }
  for (const [ra, rk] of [[-2.3, 0.7], [2.3, 0.75], [-2.9, 0.55], [2.8, 0.6]]) {   // 밑동 — 단면 대신 뽑혀 나온 뿌리 갈래
    c.save(); c.rotate(ra); c.scale(rk, rk); c.drawImage(pim, 2 * PW, 0, PW, PH, -128, -156, PW, PH); c.restore();
  }
  c.restore();
}

export const BossRootArt: Bag = {
  /** 가지 · 몸 · 우듬지 · 눈(objects 단계) */
  drawRootBody(f: any) {
    const c: C2 = f.c, im = Sprites.want('vine_lord'), pim = Sprites.want('vine_lord_parts'), cim = Sprites.want('vine_lord_crown'), T = this.time || 0;
    for (const e of this.ents) {
      if (!isRt(e)) continue;
      if (!this.paused) this.rootAmbient(e);
      if (!im) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), dt = stepDt(this, e, 'rtT0');
      const A = e.rtA || (e.rtA = { tilt: 0, lift: 0, sq: 0, lx: 0, ly: 0 });
      const fl = hzOf(this, e, 'rfell'), bl = hzOf(this, e, 'rbloom') || hzOf(this, e, 'rflower'), rr = hzOf(this, e, 'rring'), ro = hzOf(this, e, 'rroot');
      /* 몸짓 목표 — 쓰러뜨릴 쪽으로 우듬지가 기울고 · 꽃 철엔 가지를 들고 · 테를 낼 땐 웅크리고 · 뿌리를 부를 땐 가지로 땅을 짚는다 */
      const tiltGoal = fl && fl.t < fl.tele + 0.6 ? fl.s * 0.14 * Math.min(1, fl.t / fl.tele) + Math.sin(T * 7) * 0.012 : 0;
      const liftGoal = bl ? 0.25 : ro ? -0.3 : rr && rr.t < rr.tele ? -0.15 : 0;
      A.tilt = ease(A.tilt, tiltGoal, dt, 3); A.lift = ease(A.lift, liftGoal, dt, 4);
      A.sq = ease(A.sq, rr && rr.t < rr.tele + 0.2 ? 1 : 0, dt, 8);
      const breath = Math.sin(T * 1.3) * 0.006 - A.sq * 0.01;
      const [x0, y0] = rtAt(e, 0, 0), x = x0 - f.camX, y = y0 - f.camY;
      c.save();
      const w = this.world, tx0 = Math.floor(x0 / TS) - 14, ty0 = Math.floor(y0 / TS) - 12;   // 방이 좁으면 벽에 묻힌다 — 빈 칸에만
      c.beginPath();
      for (let ty = ty0; ty <= ty0 + Math.ceil(BH / TS) + 12; ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(BW / TS) + 28; tx++)
        if (!w.solid(tx, ty)) c.rect(tx * TS - f.camX, ty * TS - f.camY, TS, TS);
      c.clip();
      c.imageSmoothingEnabled = false;
      /* 두 큰 가지 — 어깨에서 위로 뻗어 바람에 흔들린다(몸 뒤) */
      if (pim) for (const s of [-1, 1]) {
        const [sx, sy] = rtAt(e, RT.C[0] + s * RT.SH_DX, RT.SH_Y);
        const sway = Math.sin(T * 0.9 + s * 1.3) * 0.06 + Math.sin(T * 2.3 + s) * 0.02;
        const a = -0.42 - A.lift + sway - s * A.tilt * 1.4;
        c.save(); c.translate(sx - f.camX, sy - f.camY); c.scale(s, 1); c.rotate(a);
        c.drawImage(pim, (st >= 2 ? 1 : 0) * PW, 0, PW, PH, -28 * 1.15, -80 * 1.15, PW * 1.15, PH * 1.15); c.restore();
      }
      /* 몸 — 숨 쉬듯 · 쓰러뜨릴 땐 떤다 */
      const fr = st * 2 + ((T % 2.6) < 1.3 ? 0 : 1), quake = fl && fl.t < fl.tele ? (Math.random() - 0.5) * 3 * (fl.t / fl.tele) : 0;
      c.drawImage(im, fr * BW, 0, BW, BH, x + quake - BW * breath / 2, y - BH * breath, BW * (1 + breath), BH * (1 + breath));
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.45, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, x, y, BW, BH); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      /* 우듬지 — 줄기 꼭대기에 얹혀 흔들린다(꽃 철 · 막 1 은 꽃 · 막 2 는 시든 잎) */
      if (cim) {
        const [cx, cy] = rtAt(e, RT.C[0], RT.CROWN_Y), cf = st >= 2 ? 2 : st >= 1 || bl ? 1 : 0;
        const ca = Math.sin(T * 0.6) * 0.03 + Math.sin(T * 1.7 + 1) * 0.01 + A.tilt;
        c.save(); c.translate(cx - f.camX + quake, cy - f.camY - BH * breath); c.rotate(ca);
        c.drawImage(cim, cf * CW, 0, CW, CH, -240, -228, CW, CH); c.restore();
      }
      /* 옹이 속 눈동자 — 플레이어를 따라 보고 · 깜빡이고 · 기술 땐 가늘게 노려본다 */
      const q = this.hzNear(e.cx, e.cy), pxl = q ? Math.max(-1, Math.min(1, (q.cx - e.cx) / 500)) : 0, pyl = q ? Math.max(-1, Math.min(1, (q.cy - e.cy + 120) / 300)) : 0;
      A.lx = ease(A.lx, pxl, dt, 4); A.ly = ease(A.ly, pyl, dt, 4);
      const blink = ((T + e.cx * 0.003) % 4.7) < 0.14 ? 0 : 1, angry = fl || ro || rr ? 0.55 : 1, open = blink * angry * (e.gapT > 0 ? 0.35 : 1);
      e.rtEyes = [];
      for (const s of [-1, 1]) {
        const [ex, ey] = rtAt(e, RT.C[0] + s * RT.EYE_DX, RT.EYE_Y), X = ex - f.camX, Y = ey - f.camY - BH * breath * 0.6, rx = 16, ry = 11.5;
        c.save(); c.beginPath(); c.ellipse(X, Y, rx, ry, 0, 0, TAU); c.clip();
        c.fillStyle = '#0c0806'; c.fillRect(X - rx, Y - ry, rx * 2, ry * 2);
        const px = X + A.lx * 6, py = Y + A.ly * 3;
        const g = c.createRadialGradient(px, py, 0, px, py, 9);
        g.addColorStop(0, '#fffbd0'); g.addColorStop(0.35, EYE); g.addColorStop(0.75, '#6a9a2a'); g.addColorStop(1, 'rgba(40,60,20,0)');
        c.fillStyle = g; c.beginPath(); c.arc(px, py, 9, 0, TAU); c.fill();
        c.fillStyle = '#0a0c04'; c.beginPath(); c.ellipse(px, py, 1.8, 5.5 * (st >= 2 ? 1.2 : 1), 0, 0, TAU); c.fill();   // 세로 동공 — 짐승 눈
        c.fillStyle = 'rgba(255,255,240,.9)'; c.fillRect(px - 4, py - 4, 2, 2);
        const lid = (1 - open) * ry * 2 + 1;                          // 껍질 눈꺼풀 — 위에서 내려온다
        c.fillStyle = '#4a3626'; c.fillRect(X - rx, Y - ry, rx * 2, lid);
        c.fillStyle = '#2a1d14'; c.fillRect(X - rx, Y - ry + lid - 2, rx * 2, 2);
        c.restore();
        e.rtEyes.push([px + f.camX, py + f.camY, open]);
      }
      c.restore();
    }
  },
  /** 솟는 뿌리 · 꽃 · 쓰러지는 줄기(actors 단계 · drawBossLit) — 빛을 받게 인물 앞 */
  drawRootLit(c: C2) {
    const pim = Sprites.want('vine_lord_parts'); if (!pim) return;
    const cim = Sprites.want('vine_lord_crown');
    const cx0 = this.cam.x, cy0 = this.cam.y, T = this.time || 0;
    for (const h of this.bhz || []) {
      if (h.k === 'rroot') {
        const [ht, st] = rootStage(h); if (st === 0 || ht <= 0) continue;
        const k = 1.25 * (h.big || 1), x = h.x - cx0, fy = h.fy - cy0;
        c.save(); c.beginPath(); c.rect(x - 200, fy - 400, 400, 400); c.clip();       // 땅 위만 — 땅속에서 솟아 나온다
        c.translate(x, fy + (1 - ht) * 156 * k); c.rotate(Math.sin(T * 3 + h.sd) * 0.03 + (st === 1 ? Math.sin(h.t * 60) * 0.04 : 0)); c.scale(k * (h.sd % 2 > 1 ? -1 : 1), k);
        c.imageSmoothingEnabled = false; c.drawImage(pim, 2 * PW, 0, PW, PH, -128, -156, PW, PH);
        c.restore();
      } else if (h.k === 'rflower') {
        const grow = Math.min(1, h.t / h.tele), pick = h.picked ? Math.min(1, (h.t - (h.pt || h.t)) / 0.5) : 0;
        const end = !h.picked && h.t > h.life - 0.6 ? (h.life - h.t) / 0.6 : 1;
        const k = (0.4 + 0.6 * grow) * (1 + pick * 0.6) * (0.6 + 0.4 * end), fr = grow < 0.8 ? 3 : 4;
        c.save(); c.globalAlpha = Math.max(0, (1 - pick) * Math.min(1, end * 1.5)); c.translate(h.x - cx0, h.fy - cy0);
        c.rotate(Math.sin(T * 2 + h.sd) * 0.08); c.scale(k, k); c.imageSmoothingEnabled = false;
        c.drawImage(pim, fr * PW, 0, PW, PH, -128, -156, PW, PH); c.restore();
      } else if (h.k === 'rfell') {
        const [a, st] = fellStage(h), b = this.hzBoss(h); if (!b) continue;
        const rise = st === 0 ? Math.min(1, h.t / (h.tele * 0.45)) : 1;      // 고목 곁에서 마른 줄기가 땅을 찢고 일어선다 → 쓰러진다
        const fade = Math.min(1, (h.life - h.t) / 0.6), px = h.x + h.s * 70 - cx0, fy = h.fy - cy0;
        c.save(); c.beginPath(); c.rect(px - 900, fy - 1400, 1800, 1400); c.clip(); c.imageSmoothingEnabled = false;
        drawLog(c, pim, cim, px, fy + (1 - rise) * h.len * 0.4, h.s, h.len, a, fade);
        c.restore();
      }
    }
  },
  /** 빛(fx 단계) — 옹이 눈빛 · 장미창의 숨 · 꽃빛 */
  drawRootGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isRt(e)) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2));
      for (const [x, y, o] of e.rtEyes || []) if (o > 0.1) hzGlow(c, x - f.camX, y - f.camY, 22 + st * 6, EYE, (0.35 + st * 0.12) * o);
      const [rx, ry] = rtAt(e, RT.ROSE[0], RT.ROSE[1]), beat = 0.5 + 0.5 * Math.sin(T * 1.3);
      hzGlow(c, rx - f.camX, ry - f.camY, 46 + beat * 14, SAP, 0.18 + 0.14 * beat);
    }
    for (const h of this.bhz || []) if (h.k === 'rflower' && !h.picked && h.t > h.tele * 0.8) hzGlow(c, h.x - f.camX, h.fy - 40 - f.camY, 30, '#f0b8d8', 0.3 + 0.1 * Math.sin(T * 4 + h.sd));
  },
  /** 기술 예고(fx · drawSig 에서) — 들썩이는 땅 · 퍼지는 나이테 · 꺾을 꽃 자리 · 줄기가 쓰러질 그림자 */
  rootTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const T = this.time || 0;
    switch (h.k) {
      case 'rroot': {
        if (h.t > h.tele + 0.1) return true;
        const k = Math.min(1, h.t / h.tele), x = h.x - cx0, fy = h.fy - cy0, big = h.big || 1;
        groundZone(c, x, fy, 34 * big, '#8a6a3a', k, T);
        c.save(); c.fillStyle = `rgba(70,48,30,${0.75 * k})`;          // 들썩이는 흙 둔덕 · 갈라진 금
        c.beginPath(); c.ellipse(x, fy, (14 + 10 * k) * big, (3 + 5 * k + Math.sin(T * 30) * k) * big, 0, Math.PI, TAU); c.fill();
        c.strokeStyle = `rgba(30,20,12,${0.8 * k})`; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x - 20 * k * big, fy - 1); c.lineTo(x - 6, fy - 3 * k); c.lineTo(x + 4, fy - 1); c.lineTo(x + 18 * k * big, fy - 3); c.stroke();
        c.restore();
      } return true;
      case 'rring': {                                                 // 테 — 밑동에서 바닥에 눕힌 타원으로 퍼진다 · 바닥에 닿은 두 점이 솟은 나이테
        const x = h.x - cx0, fy = h.fy - cy0;
        if (h.t < h.tele) { const k = h.t / h.tele; for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(216,240,128,${0.5 * k})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, fy, 40 + i * 18 * k, (40 + i * 18 * k) * 0.18, 0, 0, TAU); c.stroke(); } return true; }
        const r = (h.t - h.tele) * h.spd, a = Math.max(0, 1 - r / 1100);
        c.save();
        for (let i = 0; i < 3; i++) {                                 // 겹 나이테 — 바깥 테가 가장 진하다
          const rr = Math.max(0, r - i * 14);
          c.strokeStyle = i ? `rgba(140,100,60,${0.35 * a})` : `rgba(216,240,128,${0.75 * a})`; c.lineWidth = i ? 2 : 3;
          c.beginPath(); c.ellipse(x, fy, rr, rr * 0.16, 0, 0, TAU); c.stroke();
        }
        for (const s of [-1, 1]) {                                    // 바닥 위로 솟은 테 마루
          const X = x + s * r;
          c.fillStyle = `rgba(90,66,40,${0.95 * a})`; c.beginPath(); c.moveTo(X - 14, fy); c.quadraticCurveTo(X, fy - 30, X + 14, fy); c.fill();
          c.strokeStyle = `rgba(216,240,128,${0.8 * a})`; c.lineWidth = 2; c.beginPath(); c.moveTo(X - 12, fy - 1); c.quadraticCurveTo(X, fy - 27, X + 12, fy - 1); c.stroke();
        }
        c.restore();
      } return true;
      case 'rflower': if (!h.picked) groundZone(c, h.x - cx0, h.fy - cy0, 26, '#f0b8d8', 0.5 + 0.2 * Math.sin(T * 4 + h.sd), T); return true;
      case 'rfell': {                                                 // 그림자 — 줄기가 쓰러질 자리에 먼저 눕는다(점점 짙고 길게)
        const [, st] = fellStage(h); if (st >= 2) return true;
        const k = Math.min(1, h.t / h.tele), x = h.x - cx0, fy = h.fy - cy0, x1 = x + h.s * (70 + h.len * Math.min(1, k * 1.3));
        c.save();
        const g = c.createLinearGradient(x, 0, x1, 0); g.addColorStop(0, `rgba(10,8,4,${0.7 * k})`); g.addColorStop(1, `rgba(10,8,4,${0.25 * k})`);
        c.fillStyle = g; c.beginPath(); c.moveTo(x + h.s * 60, fy - 2); c.lineTo(x1, fy - 6); c.lineTo(x1, fy + 4); c.lineTo(x + h.s * 60, fy + 4); c.closePath(); c.fill();
        c.restore();
        groundZone(c, x + h.s * (70 + h.len / 2), fy, h.len / 2, '#a0602a', 0.5 * k, T);
      } return true;
    }
    return false;
  },
};
mixin(Game.prototype, BossRootArt, true);
