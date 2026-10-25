/* ===== game/boss-void-art.ts — 공허의 왕의 그림 — 뒷벽의 어둠 망토 · 걷힌 자리의 별 · 망토에서 솟는 머리와 손(인물 뒤) · 눈 · 문장(빛 뒤) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { VK, vkOrigin } from '../entity/boss-void.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 망토 · 별 · 머리 · 손은 objects 단계(인물 뒤 — 플레이어가 그 앞을 지난다), 눈빛 · 문장은 fx(빛 뒤).
   "망토가 걷힌 자리에 별이 보인다"(계획 §3): 막마다 찢긴 틈과, 기술을 쓰는 동안 머리 뒤로 갈라지는 틈 안에 별밭을 그린다.
   멈춘 휘장이 아니게 — 망토 위는 연기처럼 어둠에 풀리고 · 머리는 늘 떠돌며 플레이어를 보고 · 손은 쉬는 동안에도 망토 위를 더듬는다. */

type C2 = CanvasRenderingContext2D;
const BW = VK.W * VK.K, BH = 344, PW = 192, VRUNE = '#b48aff';
/** 막마다 찢긴 틈(설계 칸 · mkbossrig void_cloak 과 같게) — [x, y, 폭, 높이, 열리는 막] */
const TEARS: number[][] = [[48, 40, 6, 16, 1], [168, 34, 5, 18, 1], [80, 60, 5, 12, 2], [142, 58, 7, 14, 2], [30, 64, 4, 10, 2]];
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));
const isVk = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_void';

/** 별밭 — 지금 잘라 둔 모양 안에 칠한다(깊은 남보라 · 반짝이는 별 · 흐르는 성운) */
function starfield(c: C2, x: number, y: number, w: number, h: number, T: number, seed: number) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#05030e'); g.addColorStop(0.5, '#120a2c'); g.addColorStop(1, '#070418');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.save(); c.globalCompositeOperation = 'lighter';
  const n = Math.ceil(w * h / 260);
  for (let i = 0; i < n; i++) {
    const s = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453, u = s - Math.floor(s), v = (s * 7.31) % 1;
    const sx = x + u * w, sy = y + Math.abs(v) * h, tw = 0.5 + 0.5 * Math.sin(T * (1.5 + (i % 5)) + i);
    c.fillStyle = i % 9 === 0 ? `rgba(200,170,255,${0.8 * tw})` : `rgba(240,236,255,${0.4 + 0.5 * tw})`;
    const r = i % 13 === 0 ? 2 : 1;
    c.fillRect(Math.round(sx), Math.round(sy), r, r);
  }
  const ng = c.createRadialGradient(x + w * (0.5 + 0.3 * Math.sin(T * 0.2 + seed)), y + h * 0.5, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.6);
  ng.addColorStop(0, 'rgba(140,90,220,.25)'); ng.addColorStop(1, 'rgba(60,30,120,0)');
  c.fillStyle = ng; c.fillRect(x, y, w, h);
  c.restore();
}
/** 갈라진 틈(가는 마름모 꼴) 안에 별밭 + 테두리 빛 */
function tear(c: C2, x: number, y: number, w: number, h: number, T: number, seed: number, open: number) {
  if (open <= 0.02) return;
  const ww = w * open;
  c.save(); c.beginPath();
  c.moveTo(x, y - h); c.quadraticCurveTo(x + ww * 1.1, y - h * 0.2, x + ww * 0.3, y + h); c.quadraticCurveTo(x - ww * 1.1, y + h * 0.2, x, y - h); c.closePath();
  c.save(); c.clip(); starfield(c, x - ww * 1.2, y - h, ww * 2.4, h * 2, T, seed); c.restore();
  c.strokeStyle = `rgba(180,138,255,${0.7 * open})`; c.lineWidth = 2; c.stroke();
  c.restore();
}

export const BossVoidArt: Bag = {
  /** 망토 · 별 · 머리 · 손(objects 단계) */
  drawVoidBody(f: any) {
    const c: C2 = f.c, im = Sprites.want('void_king'), pim = Sprites.want('void_king_parts'), T = this.time || 0;
    for (const e of this.ents) {
      if (!isVk(e) || !im) continue;
      const A = e.vkA || (e.vkA = { open: 0, t0: T, rx: [0, 0], ry: [0, 0] }), dt = this.paused ? 0 : Math.max(0, Math.min(0.1, T - A.t0)); A.t0 = T;
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), casting = !!(e.mv && e.mv.d);
      A.open = ease(A.open, casting ? 1 : 0, dt, casting ? 3 : 1.5);
      const [wx0, wy0] = vkOrigin(e), x0 = wx0 - f.camX, y0 = wy0 - f.camY, K = VK.K;
      c.save();
      const w = this.world, tx0 = Math.floor(wx0 / TS) - 1, ty0 = Math.floor(wy0 / TS) - 10;     // 투기장 빈 칸에만 — 벽 속에 망토가 묻히지 않게
      c.beginPath();
      for (let ty = ty0; ty <= ty0 + Math.ceil(BH / TS) + 11; ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(BW / TS) + 2; tx++)
        if (!w.solid(tx, ty)) c.rect(tx * TS - f.camX, ty * TS - f.camY, TS, TS);
      c.clip();
      /* 위 — 망토가 연기처럼 어둠으로 풀린다 */
      c.save(); c.translate(x0 + BW / 2, y0 + 10); c.scale(1, 0.28);              // 가장자리 없이 번지는 어둠(네모 띠는 끝이 보였다)
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, BW * 0.62);
      sg.addColorStop(0, 'rgba(8,4,16,.9)'); sg.addColorStop(0.6, 'rgba(8,4,16,.55)'); sg.addColorStop(1, 'rgba(8,4,16,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, BW * 0.62, 0, TAU); c.fill(); c.restore();
      for (let k = 0; k < 14; k++) {
        const wx = x0 + 30 + k * (BW - 60) / 13 + Math.sin(T * 0.7 + k) * 10, wh = 60 + 40 * Math.sin(T * 0.5 + k * 1.7);
        const wg = c.createLinearGradient(0, y0 - wh, 0, y0 + 10); wg.addColorStop(0, 'rgba(16,8,30,0)'); wg.addColorStop(1, 'rgba(16,8,30,.8)');
        c.fillStyle = wg; c.beginPath(); c.ellipse(wx, y0 - wh / 2 + 5, 12 + 6 * Math.sin(k), wh / 2, Math.sin(T * 0.4 + k) * 0.15, 0, TAU); c.fill();
      }
      /* 망토 */
      c.imageSmoothingEnabled = false;
      const fr = st * 2 + ((T % 2.2) < 1.1 ? 0 : 1);
      c.drawImage(im, fr * BW, 0, BW, BH, x0, y0, BW, BH);
      if (e.flash > 0 && (e.vkSunk || 0) > 0.5) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.3, e.flash * 3); c.drawImage(im, fr * BW, 0, BW, BH, x0, y0, BW, BH); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      /* 찢긴 틈 · 기술 때 머리 뒤로 갈라지는 틈 — 안에 별 */
      for (const [tx, ty, tw, th, ph] of TEARS) if (st >= ph) tear(c, x0 + tx * K, y0 + ty * K, tw * K * 0.55, th * K, T, tx, 1);
      const hx = e.vkHx - f.camX, hy = e.vkHy - f.camY;
      if (A.open > 0.02) tear(c, hx, hy + 10, 70, 150, T, 7, A.open);
      /* 머리 — 망토 위를 떠돌고 · 가라앉을 땐 어둠에 잠긴다 · 기술 땐 입을 벌린다 */
      if (pim) {
        const sunk = e.vkSunk || 0, q = this.hzNear(e.cx, e.cy), look = q ? Math.max(-1, Math.min(1, (q.cx - e.cx) / 400)) : 0;
        const hf = st >= 2 ? 2 : casting ? 1 : 0, k = 0.8 + 0.2 * (1 - sunk);
        c.save(); c.globalAlpha = Math.max(0, 1 - sunk * 1.1); c.translate(hx, hy + sunk * 30 + Math.sin(T * 1.6) * 4); c.rotate(look * 0.12 + Math.sin(T * 0.9) * 0.03); c.scale(k, k);
        c.drawImage(pim, hf * PW, 0, PW, PW, -96, -100, PW, PW);
        if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(pim, hf * PW, 0, PW, PW, -96, -100, PW, PW); }
        c.restore();
        if (sunk > 0.05 && sunk < 0.95) { c.save(); c.strokeStyle = `rgba(180,138,255,${0.6 * (1 - Math.abs(sunk - 0.5) * 2)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(hx, hy + 30, 70 * sunk + 20, 14, 0, 0, TAU); c.stroke(); c.restore(); }
        e.vkEyes = sunk < 0.7 ? [[e.vkHx - 18 * k + look * 3, e.vkHy - 2], [e.vkHx + 18 * k + look * 3, e.vkHy - 2]] : [];
        /* 손 — 망토 양쪽 자리에서 소매째 솟는다: 쏠 땐 플레이어 쪽으로 손바닥 · 내리칠 땐 바닥까지 갈퀴 · 쉴 땐 망토 위를 더듬는다 */
        for (const side of [0, 1]) {
          const bx = wx0 + BW * VK.HANDS[side], by = wy0 + 46 * K, s = side ? 1 : -1;
          let gx = bx + s * 10 + Math.sin(T * 0.8 + side * 2) * 10, gy = by + 34 + Math.sin(T * 1.1 + side) * 8, fr2 = 5, ang = Math.PI / 2 + s * 0.25 + Math.sin(T * 0.9 + side) * 0.12;   // 쉴 땐 구멍에서 늘어져 망토를 짚는다
          const cst = e.vkCast && e.vkCast.side === side && T - e.vkCast.t < 0.9 ? e.vkCast : null, grab = e.vkGrab && T - e.vkGrab.t < 1.3 ? e.vkGrab : null;
          if (cst && q) { const a = Math.atan2(q.cy - by, q.cx - bx); gx = bx + Math.cos(a) * 70; gy = by + Math.sin(a) * 70; fr2 = 3; ang = a; }
          if (grab) { const u = Math.min(1, (T - grab.t) / 0.5); gx = bx + (grab.x + s * 110 - bx) * u; gy = by + (grab.fy - 24 - by) * u; fr2 = 4; ang = Math.PI / 2 + s * -0.4; }
          A.rx[side] = ease(A.rx[side] || gx, gx, dt, grab ? 12 : 4); A.ry[side] = ease(A.ry[side] || gy, gy, dt, grab ? 12 : 4);
          const X = A.rx[side] - f.camX, Y = A.ry[side] - f.camY, BX = bx - f.camX, BY = by - f.camY;
          c.save(); c.lineCap = 'round';                               // 망토에 난 구멍 — 손이 거기서 나온다
          c.fillStyle = '#04020a'; c.beginPath(); c.ellipse(BX, BY, 26, 34, 0, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(180,138,255,.55)'; c.lineWidth = 2; c.stroke();
          c.beginPath(); c.moveTo(BX, BY); c.quadraticCurveTo((BX + X) / 2 + s * 30, (BY + Y) / 2 - 30, X, Y);   // 소매 — 밝은 테로 망토와 가른다
          c.strokeStyle = '#5a3c8c'; c.lineWidth = 36; c.stroke();
          c.strokeStyle = '#140a24'; c.lineWidth = 30; c.stroke();
          c.strokeStyle = '#2c1a4c'; c.lineWidth = 14; c.stroke();
          c.strokeStyle = 'rgba(180,138,255,.45)'; c.lineWidth = 2; c.stroke();
          c.translate(X, Y); c.rotate(ang); if (Math.cos(ang) < 0) c.scale(1, -1);
          c.drawImage(pim, fr2 * PW, 0, PW, PW, -32, -96, PW, PW);
          c.restore();
          (e.vkHandPt || (e.vkHandPt = []))[side] = [A.rx[side], A.ry[side], fr2 === 3 ? 1 : 0];
        }
      }
      c.restore();
    }
  },
  /** 빛(fx 단계) — 눈 · 문장 · 쏘는 손 */
  drawVoidGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isVk(e)) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2));
      for (const [x, y] of e.vkEyes || []) hzGlow(c, x - f.camX, y - f.camY, 18 + st * 5, VRUNE, 0.55);
      const [wx0, wy0] = vkOrigin(e), beat = 0.5 + 0.5 * Math.sin(T * 1.2);
      hzGlow(c, wx0 + BW / 2 - f.camX, wy0 + 20 * VK.K - f.camY, 44 + beat * 12, VRUNE, 0.2 + 0.15 * beat);
      for (const h of e.vkHandPt || []) if (h && h[2]) hzGlow(c, h[0] - f.camX, h[1] - f.camY, 34, VRUNE, 0.6);
    }
  },
};
mixin(Game.prototype, BossVoidArt, true);
