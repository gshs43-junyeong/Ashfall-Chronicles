/* ===== game/boss-eclipse-art.ts — 일식의 그림 — 하늘의 원판과 외눈(sky 단계) · 그림자 손(인물 앞) · 긴 그림자 · 빛기둥 · 개기일식의 어둠(빛 뒤) ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TILE_DEF } from '../data.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { EC, ecLit, handStage } from '../entity/boss-eclipse.js';
import { Game } from '../game.js';
import { groundZone, hzGlow } from './boss-hazard-art.js';
/* ★ 원판은 하늘(sky 단계 — 원경 산 뒤)에 그린다: 세계에 있지 않고 화면에 걸린 것(카메라를 조금만 따라간다).
   원판이 해를 가린 만큼 낮빛을 줄인다(G.ecDim → dayFactor) — 하늘 · 땅 빛이 같이 어두워진다.
   멈춘 그림이 아니게: 코로나가 돌고 · 원판이 숨 쉬며 · 외눈이 플레이어를 따라 보고 가끔 떴다 감는다. 사연: docs/code-history.md#h228 */

type C2 = CanvasRenderingContext2D;
const BW = EC.W * EC.K, PW = 192, CORONA = '#b48aff', PALE = '#f0e0ff';
const isEc = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_eclipse';
function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));
let DARK: HTMLCanvasElement | null = null;
let EYE: HTMLCanvasElement | null = null;

/** 원판 위 작은 눈 — [각, 반지름 비(원판 R 기준), 폭(설계 칸)] · 뜨는 순서대로(막 1: 앞 둘 · 2: 넷 · 3: 여섯 · 4: 여덟) */
const SMALL_EYES: [number, number, number][] = [                  // 윗반쪽에만 — 아랫반쪽은 원경 숲에 가린다
  [-1.57, 0.64, 20], [-2.25, 0.66, 17], [-0.89, 0.66, 17], [-2.9, 0.84, 14],
  [-0.24, 0.84, 14], [-1.95, 0.9, 11], [-1.19, 0.9, 11], [-2.6, 0.92, 10]];
/** 깜빡임 — 눈마다 제 박자로 0.16초에 감았다 뜬다(가끔 두 번) */
function blinkOf(T: number, sd: number): number {
  const per = 4.3 + (sd * 1.7) % 2.2, u = (T + sd * 3.1) % per;
  const one = (v: number) => v < 0 || v > 0.16 ? 1 : Math.abs(v - 0.08) / 0.08;
  return Math.min(one(u), sd % 2 < 1 ? one(u - 0.3) : 1);
}
/** 눈동자가 과녁 쪽으로 — 화면 거리 d 를 설계 칸 안의 치우침(최대 mx · my)으로 */
function lookAt(E: Bag, dx: number, dy: number, dt: number, mx: number, my: number) {
  const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
  E.lx = ease(E.lx, dx / d * mx * k, dt, 4); E.ly = ease(E.ly, dy / d * my * k, dt, 4);
}
/** 눈 하나 — 작은 판(설계 칸)에 그린 뒤 P 배로 키운다(원판과 같은 굵은 칸).
    아몬드 눈꺼풀 · 속눈썹 · 그늘진 흰자 · 핏줄 · 결이 도는 홍채 · 동공은 그 자체로 개기일식(검은 원 + 코로나 고리 + 다이아몬드 한 점) */
function drawEye(c: C2, x: number, y: number, P: number, w: number, h: number, o: number, lx: number, ly: number, T: number, sd: number, dil: number) {
  const Wc = Math.ceil(w * 1.18 + 8), Hc = Math.ceil(h * 1.6 + 8);
  if (!EYE) EYE = document.createElement('canvas');
  if (EYE.width < Wc || EYE.height < Hc) { EYE.width = Math.max(EYE.width, Wc); EYE.height = Math.max(EYE.height, Hc); }
  const d = EYE.getContext('2d')!;
  d.clearRect(0, 0, Wc, Hc);
  const cx = Wc / 2, cy = Hc / 2, a = w / 2, b = h / 2, bo = b * o, u = Math.max(1, w / 46);   // u — 큰 눈은 선도 같은 비로 굵게
  const almond = (ax: number, up: number, dn: number) => {
    d.beginPath(); d.moveTo(cx - ax, cy); d.quadraticCurveTo(cx, cy - up * 2, cx + ax, cy); d.quadraticCurveTo(cx, cy + dn * 2, cx - ax, cy); d.closePath();
  };
  const lashes = (up: number, n: number, len: number, col: string) => {   // 속눈썹 — 바깥으로 휘어 눕고, 가운데가 길고, 뿌리가 굵다
    d.strokeStyle = col; d.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const t = 0.08 + 0.84 * (i + 0.5) / n, px = cx - a + 2 * a * t, py = cy - up * 4 * t * (1 - t);
      const lean = (t - 0.5) * 2.2, wob = Math.sin(sd + i * 2.1 + T * 0.9) * 0.12;
      const L = len * (0.55 + 0.6 * Math.sin(t * Math.PI)) * (0.85 + 0.25 * Math.sin(i * 4.7 + sd));
      const ex = px + (lean + wob) * L * 0.75, ey = py - L * (1 - Math.abs(lean) * 0.3);
      for (const [lw, k] of [[1.1 * u, 0.55], [0.6 * u, 1]] as [number, number][]) {
        d.lineWidth = lw; d.beginPath(); d.moveTo(px, py);
        d.quadraticCurveTo(px + lean * L * 0.15, py - L * 0.6 * k, px + (ex - px) * k, py + (ey - py) * k); d.stroke();
      }
    }
  };
  if (o < 0.07) {                                                  // 감은 눈 — 아래로 처진 속눈썹 줄과 틈새로 새는 빛
    d.strokeStyle = 'rgba(200,170,255,.5)'; d.lineWidth = 1.6; d.beginPath(); d.moveTo(cx - a, cy); d.quadraticCurveTo(cx, cy + b * 0.5, cx + a, cy); d.stroke();
    d.strokeStyle = '#07030d'; d.lineWidth = 1.1; d.stroke();
    for (let i = 1; i < 7; i++) { const t = i / 7, px = cx - a + 2 * a * t, py = cy + b * 0.5 * 2 * t * (1 - t);
      d.beginPath(); d.moveTo(px, py); d.lineTo(px + (t - 0.5) * 1.4, py + 1.6 + Math.sin(t * Math.PI) * 1.4); d.stroke(); }
  } else {
    almond(a + 2 * u, bo + 1.6 * u, bo * 0.85 + 1.4 * u); d.fillStyle = '#12081f'; d.fill();          // 눈두덩
    d.strokeStyle = '#46286c'; d.lineWidth = u; d.stroke();
    d.save(); almond(a, bo, bo * 0.85); d.clip();
    const ix = cx + lx, iy = cy + ly, r = b * 0.9;
    let g = d.createRadialGradient(cx + lx * 0.4, cy + ly * 0.4 + b * 0.2, 0, cx, cy, a);
    g.addColorStop(0, '#f6efff'); g.addColorStop(0.55, '#c3a8ec'); g.addColorStop(1, '#3e2464'); d.fillStyle = g; d.fillRect(0, 0, Wc, Hc);
    d.lineWidth = 0.55 * u;                                            // 핏줄 — 가장자리에서 홍채 쪽으로 갈라지며
    for (let i = 0; i < 6; i++) {
      const s0 = Math.sin(sd * 7 + i * 12.9898) * 43758.5453, u = s0 - Math.floor(s0), side = i % 2 ? 1 : -1;
      let vx = cx + side * a * 0.95, vy = cy + (u - 0.5) * bo * 1.2;
      d.strokeStyle = 'rgba(176,40,112,.5)'; d.beginPath(); d.moveTo(vx, vy);
      for (let k = 0; k < 3; k++) { vx -= side * a * 0.17; vy += (Math.sin(u * 40 + k * 2.3) * 1.2); d.lineTo(vx, vy); }
      d.stroke();
    }
    g = d.createRadialGradient(ix, iy, 0, ix, iy, r);                 // 홍채
    g.addColorStop(0, '#fff3cc'); g.addColorStop(0.3, '#ffc768'); g.addColorStop(0.5, '#c592ff'); g.addColorStop(0.82, '#6a36c4'); g.addColorStop(1, '#1e0c38');
    d.fillStyle = g; d.beginPath(); d.arc(ix, iy, r, 0, TAU); d.fill();
    const rp = r * (0.34 + 0.14 * dil + 0.03 * Math.sin(T * 2.1 + sd));
    for (let i = 0; i < 30; i++) {                                 // 홍채 결 — 천천히 돈다
      const an = i / 30 * TAU + T * 0.12 * (sd % 2 ? -1 : 1), r0 = rp * 1.15, r1 = r * (0.8 + 0.15 * Math.sin(i * 1.7 + sd));
      d.strokeStyle = i % 2 ? 'rgba(255,236,200,.38)' : 'rgba(26,8,52,.4)'; d.lineWidth = 0.6 * u;
      d.beginPath(); d.moveTo(ix + Math.cos(an) * r0, iy + Math.sin(an) * r0); d.lineTo(ix + Math.cos(an + 0.08) * r1, iy + Math.sin(an + 0.08) * r1); d.stroke();
    }
    d.strokeStyle = '#120720'; d.lineWidth = 1.2 * u; d.beginPath(); d.arc(ix, iy, r - 0.4, 0, TAU); d.stroke();
    g = d.createRadialGradient(ix, iy, rp * 0.9, ix, iy, rp * 1.7);  // 동공 둘레 코로나
    g.addColorStop(0, 'rgba(255,250,236,.95)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    d.fillStyle = g; d.beginPath(); d.arc(ix, iy, rp * 1.7, 0, TAU); d.fill();
    d.fillStyle = '#040108'; d.beginPath(); d.arc(ix, iy, rp, 0, TAU); d.fill();
    const da = T * 0.9 + sd;                                       // 다이아몬드 반지 — 테를 도는 한 점
    d.fillStyle = '#ffffff'; d.fillRect(ix + Math.cos(da) * rp - 0.6 * u, iy + Math.sin(da) * rp - 0.6 * u, 1.3 * u, 1.3 * u);
    g = d.createLinearGradient(0, cy - bo * 2, 0, cy - bo * 0.1);     // 윗눈꺼풀 그늘
    g.addColorStop(0, 'rgba(10,4,22,.85)'); g.addColorStop(1, 'rgba(10,4,22,0)'); d.fillStyle = g; d.fillRect(0, 0, Wc, cy);
    d.fillStyle = 'rgba(255,255,255,.95)'; d.fillRect(ix - r * 0.5, iy - r * 0.55, Math.max(1, r * 0.22), Math.max(1, r * 0.18));
    d.fillStyle = 'rgba(255,255,255,.5)'; d.fillRect(ix + r * 0.3, iy + r * 0.3, u, u);
    d.restore();
    d.lineCap = 'round';
    d.strokeStyle = '#06020c'; d.lineWidth = 1.5 * u; d.beginPath(); d.moveTo(cx - a, cy); d.quadraticCurveTo(cx, cy - bo * 2, cx + a, cy); d.stroke();
    d.strokeStyle = '#2a1644'; d.lineWidth = 0.8 * u; d.beginPath(); d.moveTo(cx - a, cy); d.quadraticCurveTo(cx, cy + bo * 1.7, cx + a, cy); d.stroke();
    lashes(bo, Math.max(5, Math.round(w / 6)), Math.max(1.8, h * 0.2), '#0b0516');
  }
  c.save(); c.imageSmoothingEnabled = false;
  c.drawImage(EYE, 0, 0, Wc, Hc, Math.round(x - Wc * P / 2), Math.round(y - Hc * P / 2), Wc * P, Hc * P);
  c.restore();
}

/** 눈빛 — 빛(어둠) 겹 뒤에 한 번 더: 원판은 어두워져도 동공의 코로나 · 홍채만은 빛난다(개기일식엔 어둠 위로 더 세게) */
function eyeGlow(c: C2, e: Bag, T: number, boost: number) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [x, y, r, o0] of e.ecGlow || []) {
    const o = Math.min(1, o0 * boost);
    if (o0 < 0.15) continue;
    const pu = 0.85 + 0.15 * Math.sin(T * 3 + x * 0.01);
    let g = c.createRadialGradient(x, y, r * 0.25, x, y, r * 1.1);
    g.addColorStop(0, `rgba(255,226,160,${0.5 * o * pu})`); g.addColorStop(0.45, `rgba(190,140,255,${0.22 * o})`); g.addColorStop(1, 'rgba(120,80,220,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.1, 0, TAU); c.fill();
    g = c.createRadialGradient(x, y, 0, x, y, r * 2.6);
    g.addColorStop(0, `rgba(180,138,255,${0.12 * o})`); g.addColorStop(1, 'rgba(120,80,220,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.6, 0, TAU); c.fill();
  }
  c.restore();
}

export const BossEclipseArt: Bag = {
  /** 하늘의 원판 · 코로나 · 외눈(sky 단계) — 그리면서 낮빛 가림(ecDim)도 정한다 */
  drawEclipseSky(f: any) {
    const c: C2 = f.c, T = this.time || 0, dt = this.paused ? 0 : 1 / 60;
    let want = 0;
    for (const e of this.ents) {
      if (!isEc(e)) continue;
      const im = Sprites.want('pursuer');
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), sr = hzOf(this, e, 'estare'), tot = hzOf(this, e, 'etotal'), hd = hzOf(this, e, 'ehand');
      want = Math.max(want, tot && tot.t > tot.tele * 0.5 ? 0.97 : sr ? 0.8 : 0.42 + 0.08 * st);
      const W = this.W, H = this.H;
      const sx = W / 2 + clamp(((e.hx ?? e.cx) - f.camX - W / 2) * 0.18, -W * 0.28, W * 0.28) + Math.sin(T * 0.37) * 10;
      const sy = H * 0.24 + Math.sin(T * 0.53) * 6;
      e.ecScr = [sx, sy];
      const S = 1.25 * (1 + Math.sin(T * 1.1) * 0.012);
      /* 빛무리 — 원판 뒤에서 숨 쉬듯 */
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(sx, sy, EC.R * EC.K * S * 0.9, sx, sy, EC.R * EC.K * S * (2.4 + 0.15 * Math.sin(T * 1.7)));
      g.addColorStop(0, 'rgba(200,170,255,.35)'); g.addColorStop(0.4, 'rgba(150,110,240,.12)'); g.addColorStop(1, 'rgba(120,80,220,0)');
      c.fillStyle = g; c.fillRect(sx - W, sy - H, W * 2, H * 2); c.restore();
      if (!im) continue;
      const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
      c.save(); c.translate(sx, sy); c.rotate(T * 0.04 + Math.sin(T * 0.3) * 0.05); c.scale(S, S);
      c.imageSmoothingEnabled = false;
      c.drawImage(im, fr * BW, 0, BW, BW, -BW / 2, -BW / 2, BW, BW);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.4, e.flash * 3); c.drawImage(im, fr * BW, 0, BW, BW, -BW / 2, -BW / 2, BW, BW); }
      c.restore();
      /* 눈 — 가운데 외눈 + 막이 넘어갈수록 원판에 하나씩 더 뜨는 작은 눈(제 눈꺼풀 · 깜빡임 · 모두 플레이어를 본다) */
      const P = EC.K * S, rot = T * 0.04 + Math.sin(T * 0.3) * 0.05;
      const tx = this.player.cx - f.camX, ty = this.player.cy - f.camY;
      const busy = sr || (tot && tot.t > 0.4) ? 1 : hd && hd.t < hd.tele ? 0.78 : 0.5;
      const eyes = e.ecEyes || (e.ecEyes = SMALL_EYES.map((q, i) => ({ o: 0, lx: 0, ly: 0, sd: i * 2.3 + 0.7 })));
      e.ecGlow = []; e.ecDraw = [];
      const nOpen = [0, 2, 4, 6, 8][Math.min(4, e.phase || 0)];
      for (let i = 0; i < eyes.length; i++) {
        const E = eyes[i], [ang, rr, sz] = SMALL_EYES[i];
        const ex = sx + Math.cos(ang + rot) * EC.R * P * rr, ey = sy + Math.sin(ang + rot) * EC.R * P * rr;
        const goal = i < nOpen ? Math.max(0.15, Math.min(busy + 0.2, 0.95)) * blinkOf(T, E.sd) : 0;
        E.o = ease(E.o, goal, dt, goal < E.o ? 14 : 4);
        if (E.o < 0.02 && i >= nOpen) continue;
        lookAt(E, tx - ex, ty - ey, dt, sz * 0.32, sz * 0.12);
        hzGlow(c, ex, ey, sz * P * 0.9, CORONA, 0.18 * E.o);
        e.ecGlow.push([ex + E.lx * P, ey + E.ly * P, sz * 0.45 * P, E.o]);
        e.ecDraw.push([ex, ey, P, sz, sz * 0.5, E.o, E.lx, E.ly, E.sd, sr ? 1 : 0]);
        drawEye(c, ex, ey, P, sz, sz * 0.5, E.o, E.lx, E.ly, T, E.sd, sr ? 1 : 0);
      }
      const glow: number[][] = e.ecGlow;
      const M = e.ecEye || (e.ecEye = { o: 0, lx: 0, ly: 0, sd: 0 });
      const mg = busy * blinkOf(T, 0); M.o = ease(M.o, mg, dt, mg < M.o ? 16 : 5);
      lookAt(M, tx - sx, ty - sy, dt, 22, 7);
      glow.push([sx + M.lx * P / 2, sy + M.ly * P / 2, 46 * 0.9 * P / 2, M.o]);
      e.ecDraw.push([sx, sy, P / 2, 92, 46, M.o, M.lx, M.ly, 0, tot ? 0.6 : 0]);
      drawEye(c, sx, sy, P / 2, 92, 46, M.o, M.lx, M.ly, T, 0, sr ? 1 : tot ? 0.6 : 0);
      if (M.o > 0.5) hzGlow(c, sx + M.lx * P / 2, sy + M.ly * P / 2, 70 + 50 * M.o, PALE, 0.22 * M.o);
    }
    this.ecDim = ease(this.ecDim || 0, want, dt, want > (this.ecDim || 0) ? 0.8 : 0.4);
  },
  /** 그림자 손(actors 단계 · drawBossLit) — 화면 위에서 팔뚝이 이어져 내려와 땅을 짚는다 */
  drawEclipseHands(c: C2) {
    const pim = Sprites.want('pursuer_parts'); if (!pim) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, T = this.time || 0;
    for (const h of this.bhz || []) {
      if (h.k !== 'ehand') continue;
      const [ht, st] = handStage(h), s = 1.3, top = cy0 - 280;
      const wristY = top + (h.fy - 196 * s - top) * ht, x = h.tx + (st === 0 ? Math.sin(T * 2.3 + h.sd) * 8 * (1 - ht) : 0);
      c.save(); c.translate(-cx0, -cy0); c.imageSmoothingEnabled = false;
      c.save(); c.globalCompositeOperation = 'lighter'; hzGlow(c, x, wristY + 90 * s, 120 * s, CORONA, 0.22); c.restore();
      for (let y = wristY - PW * s * 0.95; y > cy0 - PW * s * 1.2; y -= PW * s * 0.95) c.drawImage(pim, 5 * PW, 0, PW, PW, x - PW * s / 2, y, PW * s, PW * s);   // 팔뚝 — 화면 위 끝까지
      const fr = st === 2 ? 4 : 3;
      if (st === 1) for (let g2 = 3; g2 >= 1; g2--) { c.save(); c.globalAlpha = 0.25 / g2; c.drawImage(pim, fr * PW, 0, PW, PW, x - 96 * s, wristY - 16 * s - g2 * 30, PW * s, PW * s); c.restore(); }
      c.drawImage(pim, fr * PW, 0, PW, PW, x - 96 * s, wristY - 16 * s, PW * s, PW * s);
      const b = this.hzBoss(h);
      if (b && b.flash > 0 && st === 2) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, b.flash * 4); c.drawImage(pim, fr * PW, 0, PW, PW, x - 96 * s, wristY - 16 * s, PW * s, PW * s); }
      c.restore();
    }
  },
  /** 기술 예고(fx · drawSig 에서) — 길게 눕는 그림자 · 손이 짚을 자리 · 빛기둥 */
  eclipseTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const T = this.time || 0;
    switch (h.k) {
      case 'estare': case 'etotal': return true;
      case 'ehand': {
        if (h.t > h.tele + 0.2) return true;
        const k = Math.min(1, h.t / h.tele), fy = h.fy - cy0, q = this.hzNear(h.tx, h.fy) || this.player;
        /* 그림자 — 발밑에서 손이 짚을 자리까지 길어진다(원판 반대쪽) */
        const x0 = q.cx - cx0, x1 = x0 + (h.tx - cx0 - x0) * Math.min(1, k * 1.4);
        c.save(); c.globalAlpha = 0.55 * Math.min(1, k * 2);
        const gr = c.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(8,4,16,.85)'); gr.addColorStop(1, 'rgba(30,14,50,.35)');
        c.fillStyle = gr; c.beginPath(); c.moveTo(x0, fy - 3); c.lineTo(x1, fy - 1); c.lineTo(x1, fy + 1); c.lineTo(x0, fy + 3); c.closePath(); c.fill();
        c.beginPath(); c.ellipse(x1, fy, 18 + 60 * k, 6 + 4 * k, 0, 0, TAU); c.fill(); c.restore();
        groundZone(c, h.tx - cx0, fy, 96, '#6a3aa8', k, T);
      } return true;
      case 'elight': {                                               // 빛기둥 — 화면 위에서 땅까지 따뜻한 햇빛 한 줄기
        const a = h.t < h.tele ? h.t / h.tele * 0.35 : Math.min(1, (h.life - h.t) / 0.4), x = h.x - cx0, fy = h.fy - cy0, w = h.t < h.tele ? h.w * 0.25 : h.w;
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
        const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        g.addColorStop(0, 'rgba(255,230,170,0)'); g.addColorStop(0.5, 'rgba(255,236,190,.45)'); g.addColorStop(1, 'rgba(255,230,170,0)');
        c.fillStyle = g; c.fillRect(x - w / 2, -40, w, fy + 40);
        c.fillStyle = 'rgba(255,248,220,.5)'; c.fillRect(x - 2 + Math.sin(T * 3 + h.sd) * 6, -40, 3, fy + 40);
        c.restore();
        if (h.t >= h.tele) groundZone(c, x, fy, h.w / 2, '#ffe6a0', 0.6, T);
      } return true;
    }
    return false;
  },
  /** 빛(fx 단계) — 응시의 박동 · 개기일식의 어둠(제 빛 안만 트인다) */
  drawEclipseGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isEc(e)) continue;
      const sr = hzOf(this, e, 'estare');
      if (sr && sr.t < sr.tele) {                                    // 응시를 모은다 — 화면 가장자리가 보랏빛으로 조여 온다
        const k = sr.t / sr.tele, W = this.W, H = this.H;
        const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.6 - 0.25 * k), W / 2, H / 2, Math.max(W, H) * 0.75);
        g.addColorStop(0, 'rgba(40,10,70,0)'); g.addColorStop(1, `rgba(40,10,70,${0.45 * k})`);
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
      const tot = hzOf(this, e, 'etotal'); if (!tot) { eyeGlow(c, e, T, 1); continue; }
      const k = tot.t < tot.tele ? tot.t / tot.tele : Math.min(1, (tot.life - tot.t) / 0.5);
      const W = this.W, H = this.H;
      if (!DARK) DARK = document.createElement('canvas');
      if (DARK.width !== W || DARK.height !== H) { DARK.width = W; DARK.height = H; }
      const d = DARK.getContext('2d')!;
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
      d.fillStyle = `rgba(4,2,10,${0.93 * k})`; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      const hole = (x: number, y: number, r: number) => { const g = d.createRadialGradient(x, y, r * 0.3, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const q of this.players) if (!q.dead) hole(q.cx - f.camX, q.cy - f.camY, ecLit(q, this.world) ? 190 + Math.sin(T * 9) * 6 : 60);
      const w = this.world;
      for (let ty = f.ty0; ty <= f.ty1; ty++) for (let tx = f.tx0; tx <= f.tx1; tx++) {
        const df = TILE_DEF[w.get(tx, ty)]; if (df && (df.light || 0) >= 5) hole(tx * TS + TS / 2 - f.camX, ty * TS + TS / 2 - f.camY, 130);
      }
      c.drawImage(DARK, 0, 0);
      /* 다 가려진 해 — 어둠 위로 코로나 고리만 타오른다(개기일식의 그 모양) · 테의 한 점이 다이아몬드처럼 빛난다 */
      const [sx, sy] = e.ecScr || [W / 2, H * 0.24], R0 = EC.R * EC.K * 1.25;
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = k;
      const g = c.createRadialGradient(sx, sy, R0 * 0.95, sx, sy, R0 * 1.9);
      g.addColorStop(0, 'rgba(240,224,255,.55)'); g.addColorStop(0.25, 'rgba(180,138,255,.25)'); g.addColorStop(1, 'rgba(120,80,220,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, R0 * 1.9, 0, TAU); c.arc(sx, sy, R0 * 0.97, 0, TAU, true); c.fill();
      c.strokeStyle = 'rgba(255,246,230,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, R0, 0, TAU); c.stroke();
      for (let i = 0; i < 9; i++) {                                    // 코로나 줄기 — 천천히 돌며 휘어 나간다
        const a0 = i / 9 * TAU + T * 0.05, L = R0 * (0.35 + 0.25 * Math.sin(T * 0.7 + i * 1.7));
        c.strokeStyle = `rgba(220,200,255,${0.25 + 0.15 * Math.sin(T + i)})`; c.lineWidth = 2;
        c.beginPath(); c.moveTo(sx + Math.cos(a0) * R0, sy + Math.sin(a0) * R0);
        c.quadraticCurveTo(sx + Math.cos(a0 + 0.12) * (R0 + L * 0.6), sy + Math.sin(a0 + 0.12) * (R0 + L * 0.6), sx + Math.cos(a0 + 0.2) * (R0 + L), sy + Math.sin(a0 + 0.2) * (R0 + L)); c.stroke();
      }
      hzGlow(c, sx + Math.cos(2.6) * R0, sy + Math.sin(2.6) * R0, 30 + 6 * Math.sin(T * 5), '#ffffff', 0.9);
      c.restore();
      c.save(); c.globalAlpha = 0.92 * k;                            // 어둠 속에서 눈만 뜨고 본다
      for (const q of e.ecDraw || []) drawEye(c, q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], T, q[8], q[9]);
      c.restore();
      eyeGlow(c, e, T, 1 + k);
    }
  },
};
mixin(Game.prototype, BossEclipseArt, true);
