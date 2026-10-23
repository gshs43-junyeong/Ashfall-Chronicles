/* ===== game/boss-pool-art.ts — 잿물 군체의 그림 — 웅덩이 · 솟는 팔 · 잿물 기둥(범람) ===== */
import { TAU } from '../../engine/core/math.js';
import { Sprites } from '../sprites.js';
import { poolHalf } from '../entity/boss-pool.js';
import { STRIKE_ART, glob, hs } from './boss-hazard-art.js';
/* 팔은 조각 시트(king_slime_parts — tools/mkbossrig.py)의 마디를 곡선을 따라 잇는다 — 장 넘김이 아니라 매 프레임 자리 · 기울기를 잰다.
   시트가 아직 안 읽혔으면 같은 색 덩이로 그린다(늦게 읽는 보스 시트 · Sprites.want). */

type C2 = CanvasRenderingContext2D;
const SL = '#4a4541', SL_D = '#2f2b29', SL_L = '#7a716a', EMB = '#ff8a40';
const PART = 120;                                         // 조각 한 장(px)
const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;
const ease = (u: number) => 1 - (1 - u) * (1 - u);

/** 조각 한 장을 가운데 맞춰 · 돌려 그린다 */
function part(c: C2, im: HTMLImageElement | null, fr: number, x: number, y: number, size: number, a: number, flipY = false) {
  if (!im) { glob(c, x, y, size * 0.36, SL, SL_D); return; }
  c.save(); c.translate(x, y); c.rotate(a); if (flipY) c.scale(1, -1);
  c.drawImage(im, fr * PART, 0, PART, PART, -size / 2, -size / 2, size, size);
  c.restore();
}

/** 웅덩이 — 보스 발밑. 물결이 퍼지고 거품이 부풀어 터진다 · 잠긴 동안은 한가운데가 끓는다 */
export function drawPool(c: C2, e: Enemy, sx: number, sy: number, T: number) {
  const x = sx + e.w / 2, y = sy + e.h, half = poolHalf(e), fade = e.dead ? 0 : 1;
  if (fade <= 0) return;
  c.save(); c.globalAlpha = fade;
  const g = c.createRadialGradient(x, y - 2, 4, x, y - 2, half);
  g.addColorStop(0, SL_D); g.addColorStop(0.8, 'rgba(47,43,41,.92)'); g.addColorStop(1, 'rgba(47,43,41,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y - 2, half, 13, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(138,128,120,.45)'; c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(x, y - 4, half * 0.92, 9, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  for (let i = 0; i < 3; i++) {                           // 물결 — 몸에서 가장자리로
    const u = (T * 0.45 + i / 3) % 1;
    c.strokeStyle = `rgba(160,150,140,${0.35 * (1 - u)})`; c.lineWidth = 1;
    c.beginPath(); c.ellipse(x, y - 3, e.w * 0.45 + u * (half - e.w * 0.45), 4 + u * 7, 0, Math.PI, TAU); c.stroke();
  }
  const boil = e.burrowT > 0 ? 3 : 1;
  for (let i = 0; i < 7 * boil; i++) {                    // 거품 — 부풀다 톡
    const per = 1.3 + hs(i, 1) * 1.2, u = ((T + hs(i, 2) * 9) / per) % 1;
    const bx = x + (hs(i, 3) - 0.5) * 2 * half * (boil > 1 && i % 2 ? 0.25 : 0.88), by = y - 4 - hs(i, 4) * 5;
    if (u < 0.8) {
      const r = 1.5 + u * (3 + hs(i, 5) * 4) * (boil > 1 ? 1.6 : 1);
      c.fillStyle = SL; c.strokeStyle = SL_L; c.lineWidth = 1;
      c.beginPath(); c.arc(bx, by - r * 0.6, r, Math.PI, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(220,210,200,.5)'; c.fillRect(bx - r * 0.4, by - r * 1.1, 1.5, 1.5);
    } else {
      c.strokeStyle = `rgba(160,150,140,${(1 - u) * 3})`; c.beginPath(); c.ellipse(bx, by, 4 + (u - 0.8) * 30, 2, 0, 0, TAU); c.stroke();
    }
  }
  for (let i = 0; i < 6; i++) {                           // 묻힌 불씨
    const bx = x + (hs(i, 7) - 0.5) * 1.7 * half, a = 0.4 + 0.4 * Math.sin(T * 2 + i);
    c.fillStyle = EMB; c.globalAlpha = fade * a; c.fillRect(bx, y - 3 - hs(i, 8) * 4, 2, 2);
  }
  c.restore();
}

/** 솟는 팔(parm) — 뿌리에서 솟아 겨눈 자리를 내리치고 웅덩이로 돌아간다 */
export function drawArm(c: C2, h: Bag, b: Enemy | null, cx0: number, cy0: number, T: number) {
  const rx = (b ? b.cx + h.ox : h.x) - cx0, ry = (b ? b.y + b.h : h.y) - cy0 - 6;
  const tx = h.tx - cx0, ty = h.ty - cy0 - 10, t = h.t;
  const u = ease(clamp01(t / h.rise)), s = clamp01((t - h.rise) / (h.slam - h.rise)), k = clamp01((t - (h.life - h.back)) / h.back);
  /* 예고 — 내리칠 자리에 그림자가 짙어진다 */
  if (s < 1) {
    const a = 0.2 + 0.5 * u;
    c.fillStyle = `rgba(20,16,14,${a})`; c.beginPath(); c.ellipse(tx, ty + 9, 40 + 30 * u, 8, 0, 0, TAU); c.fill();
    c.strokeStyle = h.c; c.globalAlpha = 0.35 + 0.4 * u; c.setLineDash([6, 5]); c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(tx, ty + 9, 62, 12, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  }
  /* 끝 자리 — 솟음(뿌리 위) → 내리침(겨눈 자리) → 거둠(뿌리로) */
  const wob = Math.sin(T * 7 + h.sd) * 10 * (1 - s);
  const upX = rx + (tx - rx) * 0.18 + wob, upY = ry - 260 * u;
  const ss = s * s;
  let ex = upX + (tx - upX) * ss, ey = upY + (ty - upY) * ss - Math.sin(s * Math.PI) * 60;
  ex += (rx - ex) * k; ey += (ry - ey) * k;
  const lift = (130 + 100 * Math.max(u, s)) * (1 - k);
  const cpx = rx + (ex - rx) * 0.25, cpy = Math.min(ry, ey) - lift;
  const im = Sprites.want('king_slime_parts');
  /* 몸 — 이어진 촉수(조각을 구슬처럼 꿰면 염주로 읽혔다) · 뿌리는 굵고 끝은 가늘다 */
  const N = 26, grow = 0.55 + 0.45 * u, L: number[][] = [], R: number[][] = [], mid: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const q = i / N, iq = 1 - q;
    const x = iq * iq * rx + 2 * iq * q * cpx + q * q * ex, y = iq * iq * ry + 2 * iq * q * cpy + q * q * ey;
    const dx = 2 * iq * (cpx - rx) + 2 * q * (ex - cpx), dy = 2 * iq * (cpy - ry) + 2 * q * (ey - cpy), dl = Math.hypot(dx, dy) || 1;
    const r = (36 - 22 * q) * grow * (1 - k * 0.45) * (1 + Math.sin(q * 9 - T * 6 + h.sd) * 0.08);
    L.push([x - dy / dl * r, y + dx / dl * r]); R.push([x + dy / dl * r, y - dx / dl * r]); mid.push([x, y, r, Math.atan2(dy, dx)]);
  }
  const g = c.createLinearGradient(rx - 40, 0, rx + 40, 0);
  g.addColorStop(0, SL_D); g.addColorStop(0.45, SL); g.addColorStop(1, SL_D);
  c.beginPath(); c.moveTo(L[0][0], L[0][1]);
  for (const q of L) c.lineTo(q[0], q[1]);
  for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath(); c.fillStyle = g; c.fill(); c.strokeStyle = '#1c1a18'; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(170,160,150,.45)'; c.lineWidth = 3; c.beginPath();            // 젖은 등줄기 빛
  for (let i = 1; i < N - 2; i++) { const [x, y, r, a] = mid[i]; const hx = x + Math.cos(a - 1.57) * r * 0.5, hy = y + Math.sin(a - 1.57) * r * 0.5; if (i === 1) c.moveTo(hx, hy); else c.lineTo(hx, hy); }
  c.stroke();
  for (let i = 3; i < N - 3; i += 4) {                    // 박힌 불씨 · 흘러내리는 방울
    const [x, y, r] = mid[i];
    c.fillStyle = EMB; c.fillRect(x + Math.sin(i * 7.3) * r * 0.4, y + Math.cos(i * 3.1) * r * 0.3, 3, 3);
    const dr = (T * 0.9 + i * 0.37) % 1;
    if (r > 14) glob(c, x + Math.sin(i) * r * 0.5, y + r * 0.6 + dr * 30, 3.2, SL, SL_D);
  }
  /* 손 — 곡괭이 머리 발톱(조각 시트 3번) */
  const [hx, hy, , ha] = mid[N];
  part(c, im, 3, hx, hy, PART * 0.95 * grow, ha, Math.cos(ha) < 0);
  /* 내리친 순간 — 물보라 */
  if (s >= 1 && t < h.slam + 0.35) {
    const f = (t - h.slam) / 0.35;
    c.globalAlpha = 1 - f; part(c, im, 5, tx, ty - 10 - f * 8, PART * (1 + f * 0.6), 0); c.globalAlpha = 1;
  }
}

/* 잿물 기둥 · 범람 — 바닥이 끓다가(예고) 솟는다. 폭이 넓으면 둑 넘는 물결(범람) */
STRIKE_ART.sludge = {
  tell(c, h, x, y, k, T) {
    const w = h.shape === 'col' ? h.w : h.r * 2, n = Math.max(3, Math.floor(w / 22));
    c.fillStyle = `rgba(30,26,24,${0.25 + 0.45 * k})`; c.fillRect(x - w / 2, y - 4, w, 4);
    for (let i = 0; i < n; i++) {
      const bx = x - w / 2 + (i + 0.5) / n * w + (hs(h.sd, i) - 0.5) * 10, ph = (T * (2 + k * 4) + hs(h.sd, i + 9)) % 1;
      const r = (1.5 + ph * (2 + k * 5)) * (0.6 + hs(h.sd, i + 3) * 0.6);
      c.fillStyle = SL; c.strokeStyle = SL_L; c.lineWidth = 1;
      c.beginPath(); c.arc(bx, y - 3 - ph * 3 * k, r, Math.PI, TAU); c.fill(); c.stroke();
    }
  },
  hit(c, h, x, y, f, T) {
    const wide = h.shape === 'col' && h.w > 160, w = h.shape === 'col' ? h.w : h.r * 1.6;
    const tall = h.shape === 'col' ? h.hh : h.r * 1.8;
    const up = Math.min(1, f * 5) * (f > 0.6 ? 1 - (f - 0.6) / 0.4 : 1), hh = tall * up;
    if (hh < 2) return;
    const g = c.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, SL_L); g.addColorStop(0.2, SL); g.addColorStop(1, SL_D);
    c.fillStyle = g; c.strokeStyle = '#1c1a18'; c.lineWidth = 1.5;
    c.beginPath();
    if (wide) {                                             // 범람 — 둑을 넘는 물결 · 마루마다 거품
      c.moveTo(x - w / 2, y);
      const steps = Math.floor(w / 10);
      for (let i = 0; i <= steps; i++) { const xx = x - w / 2 + i / steps * w; c.lineTo(xx, y - hh * (0.8 + 0.2 * Math.sin(xx * 0.05 + T * 9))); }
      c.lineTo(x + w / 2, y);
    } else {                                                // 기둥 — 밑동이 넓고 위로 좁아지며, 옆이 출렁인다
      const n = 14, side = (sg: number) => { for (let i = 0; i <= n; i++) {
        const q = sg < 0 ? i / n : 1 - i / n, yy = y - q * hh, ww = w * (0.5 - 0.22 * q) * (1 + 0.1 * Math.sin(yy * 0.09 + T * 14 * sg));
        c.lineTo(x + sg * ww, yy);
      } };
      c.moveTo(x - w * 0.62, y); side(-1); side(1); c.lineTo(x + w * 0.62, y);
    }
    c.closePath(); c.fill(); c.stroke();
    if (!wide) {
      c.fillStyle = 'rgba(210,200,190,.3)'; c.fillRect(x - w * 0.18, y - hh * 0.85, 3, hh * 0.65);   // 젖은 빛
      const im = Sprites.want('king_slime_parts');                                                  // 꼭대기 — 왕관 물보라(조각 5번)
      if (im) c.drawImage(im, 5 * PART, 0, PART, PART, x - w * 0.6, y - hh - w * 0.75, w * 1.2, w * 1.2);
    } else {
      c.strokeStyle = 'rgba(190,180,170,.55)'; c.lineWidth = 2; c.beginPath();
      for (let xx = x - w / 2; xx < x + w / 2; xx += 6) { const yy = y - hh * (0.8 + 0.2 * Math.sin(xx * 0.05 + T * 9)) + 3; if (xx === x - w / 2) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
      c.stroke();
    }
    for (let i = 0; i < (wide ? 12 : 5); i++) {             // 튀는 덩이
      const q = hs(h.sd, i), bx = x + (q - 0.5) * w * 1.1, by = y - hh - 6 - Math.sin(f * Math.PI) * (20 + 30 * hs(h.sd, i + 5));
      glob(c, bx, by, 3 + hs(h.sd, i + 2) * 3, SL, SL_D);
    }
    for (let i = 0; i < 4; i++) { c.fillStyle = EMB; c.fillRect(x + (hs(h.sd, i + 11) - 0.5) * w * 0.6, y - hh * hs(h.sd, i + 13), 2, 2); }
  }
};
