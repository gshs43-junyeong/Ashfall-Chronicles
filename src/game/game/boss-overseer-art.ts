/* ===== game/boss-overseer-art.ts — 공창의 관리자 그림 — 브라운관 화면 얼굴(상태 글) · 단말기 팔 · 지시봉 팔 · 유압 다리 · 등의 드론 셋 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { OV } from '../entity/boss-overseer.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 멈춘 사물함이 아니게 — 걸을 땐 유압 다리가 번갈아 딛고 · 단말을 두드리고 · 지시봉이 과녁을 짚고 · 화면이 늘 무언가를 띄운다(주사선 · 눈 · 글).
   화면 글: 명령 '!'(붉음) · 재장전 막대 · 호출 전파 · 맞으면 지직 · 평소엔 두 눈이 둘러본다. 바라보는 쪽으로 몸째 뒤집는다(단말 · 지시봉이 바뀐다).
   드론은 등 거치대에 앉아 있다가 점검 드론 기술 동안 비운다(drone 위험 지대가 dock 번호를 든다). 사연: docs/code-history.md#h239 */

type C2 = CanvasRenderingContext2D;
const K = OV.K, BW = OV.W * K, BH = OV.H * K, PW = 64, PH = 120;

/** 화면 글 — 설계 칸 화면 안(x, y, w, h)에 그린다 */
function screen(c: C2, x: number, y: number, w: number, h: number, mode: string, T: number, hurt: number, look: number) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const G = '#7dff9a', R = '#ff6050', px = (a: number, b: number, ww: number, hh: number, col: string) => { c.fillStyle = col; c.fillRect(x + a, y + b, ww, hh); };
  if (hurt > 0) {                                                            // 지직 — 맞았다
    for (let i = 0; i < 10; i++) px(0, (Math.random() * h) | 0, w, 2, `rgba(200,255,210,${0.3 + Math.random() * 0.5})`);
  } else if (mode === 'cmd') {                                               // 명령 — 붉은 느낌표가 깜빡
    if ((T * 4 | 0) % 2 === 0) { px(w / 2 - 3, 4, 6, h - 16, R); px(w / 2 - 3, h - 9, 6, 5, R); }
  } else if (mode === 'load') {                                              // 재장전 — 차오르는 막대
    px(4, h / 2 - 4, w - 8, 8, 'rgba(125,255,154,.25)'); px(4, h / 2 - 4, (w - 8) * ((T * 0.6) % 1), 8, G);
  } else if (mode === 'call') {                                              // 호출 — 퍼지는 전파
    c.strokeStyle = G; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const r = ((T * 30 + i * 10) % 30) + 3; c.beginPath(); c.arc(x + w / 2, y + h - 4, r, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
  } else {                                                                   // 평소 — 두 눈이 둘러본다
    const ex = look * 6;
    px(w / 2 - 12 + ex, h / 2 - 4, 6, 8, G); px(w / 2 + 6 + ex, h / 2 - 4, 6, 8, G);
  }
  for (let yy = 0; yy < h; yy += 3) px(0, yy, w, 1, 'rgba(0,0,0,.25)');      // 주사선
  c.restore();
}

export const BossOverseerArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawOverseer(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('overseer'), pim = Sprites.want('overseer_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2)), s = e.facing || 1, walk = Math.min(1, Math.abs(e.vx || 0) / 40), step = e.ovStep || 0;
    const X = sx + e.w / 2, FY = sy + e.h, oy = FY - (OV.HIP_Y + OV.LEG) * K - (e.ovBob || 0);
    c.save(); c.imageSmoothingEnabled = false; c.translate(X, FY); c.scale(s * OV.S, OV.S); c.translate(-OV.CX * K, -FY);
    /* 다리 */
    OV.HIPS.forEach((hx, i) => {
      const sw = Math.sin(step * Math.PI + i * Math.PI) * 0.3 * walk;
      c.save(); c.translate(hx * K, oy + OV.HIP_Y * K); c.rotate(sw); c.drawImage(pim, 0, 0, PW, PH, -8 * K, -3 * K, PW, PH); c.restore();
    });
    /* 뒤 팔(단말기) — 화면 앞에 들고 두드린다 */
    const cmd = e.state === 0, pt = e.ovPoint && T - e.ovPoint.t < 0.7 ? e.ovPoint : null;
    const arm = (i: number, a1: number, a2: number, fr: number) => {
      const [ax, ay] = OV.SH[i];
      c.save(); c.translate(ax * K, oy + ay * K); c.rotate(a1);
      c.drawImage(pim, 1 * PW, 0, PW, PH, -8 * K, -3 * K, PW, PH);
      c.translate(0, 11 * K); c.rotate(a2 - a1);
      c.drawImage(pim, fr * PW, 0, PW, PH, -8 * K, -3 * K, PW, PH); c.restore();
    };
    arm(0, 0.35 + Math.sin(T * 1.3) * 0.05, cmd ? -1.4 + Math.sin(T * 12) * 0.06 : -1.1, 2);
    /* 몸 */
    const fr = st * 2 + ((T % 1.2) < 0.6 ? 0 : 1);
    c.drawImage(im, fr * BW, 0, BW, BH, 0, oy, BW, BH);
    if (e.flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, oy, BW, BH); c.restore(); }
    /* 화면 얼굴 */
    const [qx, qy, qw, qh] = OV.SCREEN, mode = e.flash > 0.05 ? 'hurt' : e.state === 0 ? 'cmd' : e.state === 1 ? 'load' : e.state === 2 ? 'call' : 'idle';
    c.save(); c.translate(qx * K, oy + qy * K); if (s < 0) { c.translate(qw * K, 0); c.scale(-1, 1); }
    screen(c, 0, 0, qw * K, qh * K, mode, T, e.flash > 0.05 ? 1 : 0, Math.sin(T * 0.7)); c.restore();
    /* 등의 드론 — 거치대에 앉은 것만(나간 것은 위험 지대가 그린다) */
    const out = new Set((this.bhz || []).filter((h: Bag) => h.k === 'drone' && h.dock !== undefined && h.t < h.life).map((h: Bag) => h.dock));
    OV.DOCKS.forEach(([dxd, dyd], i) => {
      if (out.has(i)) return;
      c.drawImage(pim, 4 * PW, 0, PW, PH, (dxd - 8) * K, oy + (dyd - 4) * K + Math.sin(T * 2 + i) * 1.5, PW, PH);
    });
    /* 앞 팔(지시봉) — 명령 땐 과녁을 짚는다 */
    let a = 0.25 + Math.sin(T * 1.1) * 0.08;
    if (pt) { const wx = X + (OV.SH[1][0] - OV.CX) * K * OV.S * s + this.cam.x, wy = FY - (FY - oy - OV.SH[1][1] * K) * OV.S + this.cam.y; a = Math.atan2(pt.y - wy, (pt.x - wx) * s) - Math.PI / 2; }
    arm(1, a, a, 3);
    c.restore();
    e.ovLamp = [X + (27 - OV.CX) * K * OV.S * s + this.cam.x, FY - (FY - oy - 3.4 * K) * OV.S + this.cam.y];
    return true;
  },
  /** 점검 드론(drone 위험 지대) — 거치대에서 날아올라 훑고 돌아온다(dock 이 있을 때) */
  drawOverseerDrone(c: C2, h: Bag, cx0: number, cy0: number, f: number) {
    const pim = Sprites.want('overseer_parts'); if (!pim || h.x === undefined) return false;
    const x = h.x - cx0, y = h.y - cy0, T = this.time || 0;
    c.save(); c.globalAlpha = f; c.imageSmoothingEnabled = false;
    c.translate(x, y); c.rotate(Math.sin(T * 3 + h.dock) * 0.08);
    c.scale(OV.S, OV.S); c.drawImage(pim, 4 * PW, 0, PW, PH, -8 * K, -8 * K, PW, PH);
    c.fillStyle = 'rgba(200,210,220,.55)'; for (const s of [-1, 1]) c.fillRect(s * 28 - 8, -18 + Math.sin(T * 60) * 0.5, 16, 2);   // 도는 날개
    c.restore();
    return true;
  },
  /** 빛(fx 단계) — 안테나 불 · 화면 빛 */
  drawOverseerGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_overseer' || !e.ovLamp) continue;
      c.save(); c.globalCompositeOperation = 'lighter';
      hzGlow(c, e.ovLamp[0] - f.camX, e.ovLamp[1] - f.camY, 8 + 4 * Math.sin(T * 6), '#ff6050', 0.6);
      c.restore();
    }
  },
};
mixin(Game.prototype, BossOverseerArt, true);
