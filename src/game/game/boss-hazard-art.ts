/* ===== game/boss-hazard-art.js — 보스 기술이 떨구는 것의 그림 — 이름 그대로의 물건(고드름 · 뼈 창살 · 살가시 · 번개 · 피스톤 …) ===== */
import { TAU } from '../../engine/core/math.js';
/* ★ 위험 지대를 색칠한 네모 · 타원으로 대신하지 않는다 — 얼음 창 비는 고드름이 맺혀 떨어지고, 혈관 가시는 살덩이가 솟는다.
   예고도 그 물건의 그림자 · 금 · 맺힘으로 보인다(어디가 위험한지는 그대로 또렷하게). 사연: docs/code-history.md#h187 */

type C2 = CanvasRenderingContext2D;

/** 위험 지대마다 고정된 난수(그림이 프레임마다 떨리지 않게) */
export const hs = (s: number, i: number) => { const v = Math.sin(s * 127.1 + i * 311.7) * 43758.5453; return v - Math.floor(v); };
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};
export function poly(c: C2, p: number[]) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); }
export function hzGlow(c: C2, x: number, y: number, r: number, col: string, a: number) {
  if (r <= 0 || a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalCompositeOperation = op;
}
/** 바닥 그림자 · 표시 — 납작한 타원 */
export function floorMark(c: C2, x: number, y: number, rx: number, col: string, a: number) {
  c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 1, Math.max(1, rx), Math.max(1, rx * 0.26), 0, 0, TAU); c.fill(); c.globalAlpha = 1;
}
/** 지그재그 번개 줄 — 점 목록 */
export function jag(sd: number, x0: number, y0: number, x1: number, y1: number, n: number, amp: number) {
  const p: number[] = [x0, y0];
  for (let i = 1; i < n; i++) {
    const u = i / n, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    const o = (hs(sd, i) - 0.5) * 2 * amp;
    p.push(x0 + (x1 - x0) * u + nx / L * o, y0 + (y1 - y0) * u + ny / L * o);
  }
  p.push(x1, y1); return p;
}
export function strokePath(c: C2, p: number[], col: string, lw: number) {
  c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke();
}
/** 땅 금 — 가운데서 갈라져 나가는 줄 */
export function cracks(c: C2, sd: number, x: number, y: number, R: number, col: string, k: number, n = 5) {
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? 1 : -1, L = R * (0.5 + hs(sd, i) * 0.5) * k;
    strokePath(c, jag(sd + i * 7, x, y, x + s * L, y - 1 - hs(sd, i + 9) * 3, 3, 2.5), col, 1.5);
  }
}

/* ---------- 물건 ---------- */
export function icicle(c: C2, x: number, y: number, len: number, w: number, up = false) {
  const s = up ? -1 : 1, g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#7fc8ef'); g.addColorStop(0.45, '#e8fbff'); g.addColorStop(1, '#9fd8f4');
  poly(c, [x - w / 2, y, x + w / 2, y, x + w * 0.12, y + s * len * 0.7, x, y + s * len]);
  c.fillStyle = g; c.fill(); c.strokeStyle = '#2f5f86'; c.lineWidth = 1.2; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - w * 0.18, y + s * 2); c.lineTo(x - w * 0.04, y + s * len * 0.75); c.stroke();
}
/** 얼음 기둥 — 결정 셋이 모여 솟는다 */
export function iceCluster(c: C2, sd: number, x: number, y: number, w: number, hgt: number) {
  for (const [ox, hk, wk] of [[-0.32, 0.62, 0.42], [0.3, 0.74, 0.44], [0, 1, 0.56]]) {
    const ww = w * wk, hh = hgt * hk * (0.9 + hs(sd, ox * 10 + 3) * 0.1), cx = x + ox * w;
    poly(c, [cx - ww / 2, y, cx - ww / 2, y - hh * 0.8, cx, y - hh, cx + ww / 2, y - hh * 0.8, cx + ww / 2, y]);
    const g = c.createLinearGradient(cx - ww / 2, 0, cx + ww / 2, 0);
    g.addColorStop(0, '#8fd0f0'); g.addColorStop(0.5, '#f0fcff'); g.addColorStop(1, '#a8dcf6');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#2f5f86'; c.lineWidth = 1.3; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(cx, y - hh); c.lineTo(cx, y - 2); c.stroke();
  }
}
export function bone(c: C2, x: number, y: number, len: number, ang: number, w: number) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = '#efe6cc'; c.strokeStyle = '#5e5240'; c.lineWidth = 1.2;
  c.beginPath(); c.rect(-len / 2, -w / 2, len, w); c.fill(); c.stroke();
  for (const ex of [-len / 2, len / 2]) for (const ey of [-w * 0.55, w * 0.55]) {
    c.beginPath(); c.arc(ex, ey, w * 0.62, 0, TAU); c.fill(); c.stroke();
  }
  c.fillStyle = '#efe6cc'; c.fillRect(-len / 2, -w / 2 + 1, len, w - 2);
  c.restore();
}
/** 뼈 창살 — 땅에서 갈비뼈처럼 휘어 솟는다 */
export function rib(c: C2, x: number, y: number, hgt: number, lean: number, w: number) {
  const tx = x + lean, ty = y - hgt;
  c.lineCap = 'round';
  c.strokeStyle = '#5e5240'; c.lineWidth = w + 2.4;
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - lean * 0.4, y - hgt * 0.6, tx, ty); c.stroke();
  c.strokeStyle = '#efe6cc'; c.lineWidth = w;
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - lean * 0.4, y - hgt * 0.6, tx, ty); c.stroke();
  c.strokeStyle = '#c8bc98'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + w * 0.25, y); c.quadraticCurveTo(x - lean * 0.4 + w * 0.25, y - hgt * 0.6, tx + 1, ty + 2); c.stroke();
  c.fillStyle = '#efe6cc'; c.strokeStyle = '#5e5240'; c.lineWidth = 1.2;
  c.beginPath(); c.arc(tx, ty, w * 0.75, 0, TAU); c.fill(); c.stroke();
}
/** 살가시 — 마디진 살덩이 촉수 */
export function fleshSpike(c: C2, sd: number, x: number, y: number, hgt: number, w: number, T: number) {
  const n = 7, sway = Math.sin(T * 6 + sd) * w * 0.25, L: number[] = [], R: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ww = w * (1 - u * 0.92) * (1 + (i % 2 ? 0.12 : 0)), cx = x + sway * u * u;
    L.push(cx - ww / 2, y - hgt * u); R.unshift(cx + ww / 2, y - hgt * u);
  }
  poly(c, L.concat(R));
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#7a1e36'); g.addColorStop(0.5, '#d0587a'); g.addColorStop(1, '#8a2a44');
  c.fillStyle = g; c.fill(); c.strokeStyle = '#3a0c18'; c.lineWidth = 1.4; c.stroke();
  c.strokeStyle = 'rgba(255,170,190,.55)'; c.lineWidth = 1;                     // 핏줄
  c.beginPath(); c.moveTo(x - w * 0.15, y); c.quadraticCurveTo(x + w * 0.1, y - hgt * 0.4, x + sway * 0.6, y - hgt * 0.8); c.stroke();
  for (let i = 1; i < n; i += 2) {                                           // 마디
    const u = i / n; c.strokeStyle = 'rgba(60,10,24,.6)';
    c.beginPath(); c.moveTo(x + sway * u * u - w * (1 - u) * 0.45, y - hgt * u); c.lineTo(x + sway * u * u + w * (1 - u) * 0.45, y - hgt * u); c.stroke();
  }
  c.fillStyle = '#f4c8d0'; c.beginPath(); c.arc(x + sway, y - hgt, 1.6, 0, TAU); c.fill();
}
/** 바위 덩이 — 모난 돌 */
export function rock(c: C2, sd: number, x: number, y: number, r: number, rot = 0) {
  const p: number[] = [];
  for (let i = 0; i < 7; i++) { const a = rot + i / 7 * TAU, rr = r * (0.75 + hs(sd, i) * 0.3); p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85); }
  poly(c, p); c.fillStyle = '#7a6a56'; c.fill(); c.strokeStyle = '#2e261e'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#9a8a70'; c.beginPath(); c.ellipse(x - r * 0.2, y - r * 0.3, r * 0.45, r * 0.25, -0.4, 0, TAU); c.fill();
  c.strokeStyle = '#4a3e30'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - r * 0.1, y - r * 0.1); c.lineTo(x + r * 0.35, y + r * 0.25); c.lineTo(x + r * 0.2, y + r * 0.5); c.stroke();
}
/** 바위섬 — 풀 덮인 땅덩이(섬을 든 것) */
export function islet(c: C2, sd: number, x: number, y: number, r: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  poly(c, [-r, -r * 0.2, -r * 0.7, r * 0.35, -r * 0.2, r * 0.75, r * 0.15, r * 0.6, r * 0.65, r * 0.4, r, -r * 0.15, r * 0.7, -r * 0.35, -r * 0.6, -r * 0.4]);
  c.fillStyle = '#6e5a44'; c.fill(); c.strokeStyle = '#2e2418'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#5aa04a'; c.beginPath(); c.ellipse(0, -r * 0.32, r * 0.95, r * 0.18, 0, 0, TAU); c.fill();
  c.strokeStyle = '#2e5a24'; c.stroke();
  c.fillStyle = '#8ad06a'; for (let i = 0; i < 4; i++) c.fillRect(-r * 0.7 + i * r * 0.45, -r * 0.48 - hs(sd, i) * 3, 2, 3);
  c.restore();
}
/** 뿌리 창 — 꼬인 뿌리 둘 */
export function rootSpear(c: C2, sd: number, x: number, y: number, hgt: number, w: number, T: number) {
  for (const s of [-1, 1]) {
    const p: number[] = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; p.push(x + s * Math.sin(u * 5 + sd + T * 2) * w * 0.28 * (1 - u * 0.6), y - hgt * u); }
    strokePath(c, p, '#3a2414', w * 0.55 + 2);
    strokePath(c, p, s > 0 ? '#8a5a32' : '#6e4426', w * 0.55);
  }
  c.fillStyle = '#d8c8a0';                                                    // 가시
  for (let i = 1; i < 6; i++) {
    const u = i / 6, yy = y - hgt * u, s = i % 2 ? 1 : -1;
    poly(c, [x + s * w * 0.2, yy, x + s * w * 0.55, yy - 5, x + s * w * 0.18, yy - 4]); c.fill();
  }
  c.fillStyle = '#7fd06a'; c.beginPath(); c.ellipse(x + 3, y - hgt + 2, 4, 2, -0.6, 0, TAU); c.fill();
}
export function seedPod(c: C2, x: number, y: number, r: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = '#6a8a2a'; c.strokeStyle = '#26360e'; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, 0, r, r * 0.72, 0, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = '#a8d86a'; c.lineWidth = 1;
  for (const k of [-0.45, 0, 0.45]) { c.beginPath(); c.ellipse(k * r, 0, r * 0.18, r * 0.62, 0, 0, TAU); c.stroke(); }
  c.fillStyle = '#e8e0b0';
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; poly(c, [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.65, Math.cos(a) * r * 1.35, Math.sin(a) * r, Math.cos(a + 0.3) * r * 0.9, Math.sin(a + 0.3) * r * 0.65]); c.fill(); }
  c.restore();
}
/** 방울(젤 · 담즙) — 윤기 나는 덩이 */
export function glob(c: C2, x: number, y: number, r: number, col: string, dark: string) {
  c.fillStyle = col; c.strokeStyle = dark; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(x, y - r * 1.2); c.quadraticCurveTo(x + r, y - r * 0.2, x + r * 0.8, y + r * 0.4);
  c.quadraticCurveTo(x, y + r * 1.05, x - r * 0.8, y + r * 0.4); c.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.2); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.25, r * 0.22, r * 0.3, -0.5, 0, TAU); c.fill();
}
/** 불길 — 흔들리는 혀 여러 겹 */
export function flame(c: C2, sd: number, x: number, y: number, w: number, hgt: number, T: number) {
  const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  for (const [col, k] of [['#ff5a1a', 1], ['#ffa030', 0.72], ['#fff0a0', 0.42]] as [string, number][]) {
    const ww = w * k, hh = hgt * (0.55 + k * 0.45);
    c.fillStyle = col; c.globalAlpha = 0.85;
    c.beginPath(); c.moveTo(x - ww / 2, y);
    for (let i = 1; i <= 6; i++) {
      const u = i / 6, wob = Math.sin(T * 18 + sd + i * 1.7) * ww * 0.18;
      c.lineTo(x - ww / 2 * (1 - u) + wob, y - hh * u * (i % 2 ? 0.92 : 1));
    }
    for (let i = 6; i >= 1; i--) {
      const u = i / 6, wob = Math.sin(T * 16 + sd + i * 2.3) * ww * 0.18;
      c.lineTo(x + ww / 2 * (1 - u) + wob, y - hh * u * (i % 2 ? 1 : 0.9));
    }
    c.lineTo(x + ww / 2, y); c.closePath(); c.fill();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = op;
}
/** 압착 피스톤 — 쇠기둥 + 줄무늬 머리 */
export function piston(c: C2, x: number, headY: number, w: number, topY: number) {
  const hh = Math.min(30, w * 0.7);
  c.fillStyle = '#5a5e68'; c.fillRect(x - w * 0.16, topY, w * 0.32, headY - hh - topY);
  c.fillStyle = '#9aa0ac'; c.fillRect(x - w * 0.16, topY, w * 0.08, headY - hh - topY);
  c.fillStyle = '#7a808c'; c.strokeStyle = '#1e2026'; c.lineWidth = 1.5;
  c.fillRect(x - w / 2, headY - hh, w, hh); c.strokeRect(x - w / 2 + 0.5, headY - hh + 0.5, w - 1, hh - 1);
  c.save(); c.beginPath(); c.rect(x - w / 2 + 2, headY - 8, w - 4, 6); c.clip();
  c.fillStyle = '#f0c030'; c.fillRect(x - w / 2, headY - 8, w, 6);
  c.fillStyle = '#1e1e1e'; for (let i = -w; i < w; i += 8) { poly(c, [x + i, headY - 2, x + i + 4, headY - 2, x + i + 10, headY - 8, x + i + 6, headY - 8]); c.fill(); }
  c.restore();
  c.fillStyle = '#c8ccd6'; for (const ox of [-0.36, 0.36]) { c.beginPath(); c.arc(x + ox * w, headY - hh + 6, 1.8, 0, TAU); c.fill(); }
}
/** 룬 글자 — 짧은 획 몇 개(위험 지대마다 다르게) */
export function glyph(c: C2, sd: number, x: number, y: number, s: number, col: string) {
  c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.16); c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x, y - s); c.lineTo(x, y + s);
  const a = hs(sd, 1) > 0.5 ? 1 : -1;
  c.moveTo(x, y - s * 0.4); c.lineTo(x + a * s * 0.7, y - s * 0.9);
  if (hs(sd, 2) > 0.4) { c.moveTo(x, y + s * 0.2); c.lineTo(x - a * s * 0.6, y - s * 0.2); }
  if (hs(sd, 3) > 0.5) { c.moveTo(x - s * 0.5, y + s * 0.7); c.lineTo(x + s * 0.5, y + s * 0.7); }
  c.stroke();
}
export function runeCircle(c: C2, sd: number, x: number, y: number, r: number, col: string, rot: number, a: number) {
  c.save(); c.translate(x, y); c.scale(1, 0.32); c.globalAlpha = a;
  c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r * 0.72, 0, TAU); c.stroke();
  for (let i = 0; i < 6; i++) {
    const ang = rot + i / 6 * TAU;
    c.save(); c.translate(Math.cos(ang) * r * 0.86, Math.sin(ang) * r * 0.86); c.scale(1, 3.1);
    glyph(c, sd + i, 0, 0, r * 0.07 + 2, col); c.restore();
  }
  c.beginPath(); for (let i = 0; i < 3; i++) { const ang = rot * -1.5 + i / 3 * TAU; c.lineTo(Math.cos(ang) * r * 0.72, Math.sin(ang) * r * 0.72); } c.closePath(); c.stroke();
  c.restore(); c.globalAlpha = 1;
}
/** 별똥 — 불붙은 돌 + 꼬리 */
export function meteorRock(c: C2, sd: number, x: number, y: number, r: number, dx: number, dy: number) {
  const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const g = c.createLinearGradient(x, y, x - ux * r * 9, y - uy * r * 9);
  g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(0.3, 'rgba(255,150,60,.7)'); g.addColorStop(1, 'rgba(160,60,200,0)');
  const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  c.fillStyle = g; poly(c, [x - uy * r, y + ux * r, x - ux * r * 9, y - uy * r * 9, x + uy * r, y - ux * r]); c.fill();
  c.globalCompositeOperation = op;
  rock(c, sd, x, y, r, sd);
  hzGlow(c, x, y, r * 2.4, '#ffb060', 0.6);
}

/* ---------- 떨어지는(·솟는) 것 — 예고와 맞는 순간 ---------- */
/** 위에서 오는 것의 출발 높이 — 천장이 있으면 천장, 없으면 화면 위쪽 */
const topOf = (h: Bag, y: number) => Math.max(h.top !== undefined ? h.top : -1e9, h.y - 460) - h.y + y;

export const STRIKE_ART: Record<string, { tell: (c: C2, h: Bag, x: number, y: number, k: number, T: number) => void; hit: (c: C2, h: Bag, x: number, y: number, f: number, T: number) => void }> = {
  ice: {
    tell(c, h, x, y, k, T) {
      if (h.dir === 'up') {                                              // 얼음 감옥 — 땅에 서리 금이 번지고 얼음 끝이 비죽 나온다
        cracks(c, h.sd, x, y, h.w * 0.7, 'rgba(190,240,255,.9)', k);
        for (let i = 0; i < 3; i++) icicle(c, x + (i - 1) * h.w * 0.28, y, 3 + k * 10 * (0.7 + hs(h.sd, i) * 0.5), 5, true);
        return;
      }
      const ty = topOf(h, y), fall = k > 0.78 ? ((k - 0.78) / 0.22) ** 2 : 0, len = 18 + Math.min(1, k * 1.4) * 32;
      floorMark(c, x, y, h.w * 0.35 * (0.4 + k * 0.6), '#bfefff', 0.25 + k * 0.4);
      const sh = k > 0.6 && !fall ? Math.sin(T * 60) * 1.5 : 0;
      icicle(c, x + sh, ty + (y - len - ty) * fall, len, 11 + k * 5);
    },
    hit(c, h, x, y, f) {
      if (h.dir === 'up') { c.globalAlpha = 1 - Math.max(0, f - 0.7) / 0.3; iceCluster(c, h.sd, x, y, h.w, h.hh * Math.min(1, f * 7)); c.globalAlpha = 1; return; }
      if (f < 0.5) { icicle(c, x, y - 32, 48, 16); return; }                 // 땅에 꽂힌 채 — 그리고 부서진다
      const u = (f - 0.5) / 0.5;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.15 + 0.7 * hs(h.sd, i)), d = u * (30 + hs(h.sd, i + 4) * 26);
        c.globalAlpha = 1 - u; icicle(c, x + Math.cos(a) * d, y - 10 + Math.sin(a) * d + u * u * 30, 8, 4);
      }
      c.globalAlpha = 1;
    }
  },
  bone: {
    tell(c, h, x, y, k) {
      cracks(c, h.sd, x, y, h.w * 0.6, 'rgba(70,58,42,.9)', k, 4);
      for (const s of [-1, 1]) bone(c, x + s * h.w * 0.22, y - k * 6, 8, s * 1.2, 3);
    },
    hit(c, h, x, y, f) {
      const up = Math.min(1, f * 6), out = f > 0.75 ? (f - 0.75) / 0.25 : 0;
      c.globalAlpha = 1 - out;
      for (const s of [-1, 1]) rib(c, x + s * h.w * 0.3, y, h.hh * up * (1 - out * 0.4), -s * h.w * 0.22, 5);
      c.globalAlpha = 1;
    }
  },
  flesh: {
    tell(c, h, x, y, k, T) {                                             // 혈관 가시 — 바닥 밑에서 고동치는 혹
      const b = 1 + Math.sin(T * 14) * 0.15 * k;
      c.fillStyle = '#8a2a44'; c.strokeStyle = '#3a0c18'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(x, y, h.w * 0.32 * b, (4 + k * 8) * b, 0, Math.PI, TAU); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,140,170,.6)';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x, y - 2); c.quadraticCurveTo(x + s * h.w * 0.3, y - 6 * k, x + s * h.w * 0.6, y); c.stroke(); }
    },
    hit(c, h, x, y, f, T) {
      const up = Math.min(1, f * 6) * (f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1);
      fleshSpike(c, h.sd, x, y, h.hh * up, h.w * 0.62, T);
    }
  },
  bolt: {
    tell(c, h, x, y, k, T) {                                             // 낙뢰 — 위에 먹구름, 땅엔 기어 다니는 정전기
      const ty = Math.max(y - h.hh, topOf(h, y));
      c.globalAlpha = 0.5 + k * 0.4;
      for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#3a4058' : '#4a5270'; c.beginPath(); c.ellipse(x + (i - 1.5) * 12, ty + (i % 2) * 4, 14 + k * 6, 8, 0, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      if (Math.sin(T * 40 + h.sd) > 0.3) strokePath(c, jag(h.sd + Math.floor(T * 20), x, y, x + (hs(h.sd, Math.floor(T * 20)) - 0.5) * h.w, y - 6 - k * 10, 3, 3), 'rgba(220,240,255,.9)', 1);
      if (k > 0.6 && Math.sin(T * 50) > 0) { c.setLineDash([4, 10]); strokePath(c, jag(h.sd, x, ty + 8, x, y, 8, 8), 'rgba(200,230,255,.45)', 1); c.setLineDash([]); }
      floorMark(c, x, y, h.w * 0.4, '#cfe6ff', 0.2 + k * 0.3);
    },
    hit(c, h, x, y, f) {
      const ty = Math.max(y - h.hh, topOf(h, y)), a = Math.max(0, 1 - f * 1.4), p = jag(h.sd + (f < 0.15 ? 0 : 3), x, ty, x, y, 10, 14);
      const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a; strokePath(c, p, 'rgba(120,180,255,.8)', 9); strokePath(c, p, '#ffffff', 3);
      for (let i = 2; i < 8; i += 3) strokePath(c, jag(h.sd + i, p[i * 2], p[i * 2 + 1], p[i * 2] + (hs(h.sd, i) - 0.5) * 50, p[i * 2 + 1] + 30, 4, 5), '#dff0ff', 1.5);
      c.globalCompositeOperation = op; c.globalAlpha = 1;
      hzGlow(c, x, y - 6, 40 * a + 6, '#cfe6ff', 0.7 * a);
      floorMark(c, x, y, 16, '#1a1a22', 0.5 * (1 - f));
    }
  },
  sun: {
    tell(c, h, x, y, k, T) {                                             // 태양 광선 — 땅에 모이는 볕 · 위에서 흔들리는 가는 빛
      floorMark(c, x, y, h.w * 0.6 * (1.4 - k * 0.6), '#ffe08a', 0.2 + k * 0.45);
      const ty = Math.max(y - h.hh, topOf(h, y));
      c.globalAlpha = 0.15 + k * 0.25 + Math.sin(T * 20) * 0.05; c.fillStyle = '#fff0b0';
      c.fillRect(x - 1 - k * 2, ty, 2 + k * 4, y - ty); c.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { const u = (T * 0.8 + hs(h.sd, i)) % 1; hzGlow(c, x + (hs(h.sd, i + 3) - 0.5) * h.w, ty + (y - ty) * u, 3, '#fff0b0', 0.8); }
    },
    hit(c, h, x, y, f, T) {
      const ty = Math.max(y - h.hh, topOf(h, y)), a = f < 0.2 ? 1 : 1 - (f - 0.2) / 0.8, w = h.w * (0.8 + Math.sin(T * 30) * 0.06);
      const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, 'rgba(255,200,80,0)'); g.addColorStop(0.3, 'rgba(255,220,120,.75)'); g.addColorStop(0.5, 'rgba(255,255,230,1)');
      g.addColorStop(0.7, 'rgba(255,220,120,.75)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - w / 2, ty, w, y - ty);
      c.globalCompositeOperation = op; c.globalAlpha = 1;
      hzGlow(c, x, y - 4, w * 1.1, '#ffe08a', 0.8 * a);
    }
  },
  metal: {
    tell(c, h, x, y, k, T) {                                             // 압착기 — 머리가 들려 있고 바닥엔 경고 줄
      const ty = Math.max(y - h.hh - 40, topOf(h, y)), head = y - h.hh + 6 - (k > 0.7 ? (k - 0.7) * 30 : 0);
      piston(c, x, head, h.w * 0.9, ty);
      c.save(); c.beginPath(); c.rect(x - h.w / 2, y - 4, h.w, 4); c.clip();
      c.fillStyle = Math.sin(T * 16) > 0 ? '#f0c030' : '#a07a10'; c.fillRect(x - h.w / 2, y - 4, h.w, 4);
      c.fillStyle = '#1e1e1e'; for (let i = -h.w; i < h.w; i += 8) { poly(c, [x + i, y, x + i + 4, y, x + i + 8, y - 4, x + i + 4, y - 4]); c.fill(); }
      c.restore();
      hzGlow(c, x, ty + 4, 8, '#ff4030', Math.sin(T * 16) > 0 ? 0.9 : 0.2);
    },
    hit(c, h, x, y, f) {
      const ty = Math.max(y - h.hh - 40, topOf(h, y)), back = f > 0.45 ? (f - 0.45) / 0.55 : 0;
      piston(c, x, y - (h.hh - 6) * back * back, h.w * 0.9, ty);
      if (f < 0.25) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const d = f * 4 * (16 + i * 10); c.fillStyle = '#ffe08a'; c.fillRect(x + s * (h.w / 2 + d), y - 3 - i * 3 - f * 20, 2, 2);
      }
    }
  },
  rune: {
    tell(c, h, x, y, k, T) {
      if (h.dir === 'mine') {                                            // 봉인 지뢰 — 바닥의 진이 돌며 깜빡임이 빨라진다
        const blink = Math.sin(T * (6 + k * 30)) > 0 ? 1 : 0.45;
        runeCircle(c, h.sd, x, y - 2, h.r, '#9fe8d8', T * (0.8 + k * 3), (0.35 + k * 0.5) * blink);
        hzGlow(c, x, y - 4, h.r * 0.5, '#9fe8d8', 0.25 * k * blink);
        return;
      }
      runeCircle(c, h.sd, x, y - 2, h.w * 0.55, '#e8d8a0', T * 2, 0.3 + k * 0.6);   // 룬 기둥 — 바닥에 새겨지는 글자
      glyph(c, h.sd, x, y - 8 - k * 6, 4 + k * 3, rgba('#fff0c0', 0.4 + k * 0.5));
    },
    hit(c, h, x, y, f, T) {
      const a = Math.max(0, 1 - f * 1.2), op = c.globalCompositeOperation;
      if (h.dir === 'mine') {                                            // 봉인 — 네모 진이 닫히며 빛 기둥
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
        c.save(); c.translate(x, y - h.r * 0.4); c.rotate(f * 2); c.strokeStyle = '#c8fff0'; c.lineWidth = 3;
        const s = h.r * (1.1 - f * 0.4); c.strokeRect(-s / 2, -s / 2, s, s); c.rotate(Math.PI / 4); c.strokeRect(-s / 2, -s / 2, s, s); c.restore();
        c.fillStyle = 'rgba(160,240,220,.6)'; c.fillRect(x - h.r * 0.25, y - 160 * (1 - f * 0.5), h.r * 0.5, 160 * (1 - f * 0.5));
        c.globalCompositeOperation = op; c.globalAlpha = 1; return;
      }
      const hh = h.hh * Math.min(1, f * 5), w = h.w * 0.7;
      const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, 'rgba(232,216,160,0)'); g.addColorStop(0.5, 'rgba(255,248,210,.95)'); g.addColorStop(1, 'rgba(232,216,160,0)');
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - w / 2, y - hh, w, hh);
      for (let i = 0; i < 4; i++) glyph(c, h.sd + i, x + (i % 2 ? 6 : -6), y - ((T * 60 + i * hh / 4) % hh), 4, '#fff8d0');
      c.globalCompositeOperation = op; c.globalAlpha = 1;
    }
  },
  rock: {
    tell(c, h, x, y, k, T) {                                             // 천장에서 — 부스러기가 먼저 흘러내리고 돌이 떨어진다
      const ty = topOf(h, y), r = Math.max(9, h.r * 0.42), fall = k > 0.72 ? ((k - 0.72) / 0.28) ** 2 : 0;
      floorMark(c, x, y, h.r * (0.35 + k * 0.6), '#1a140e', 0.25 + k * 0.4);
      c.fillStyle = 'rgba(150,130,105,.8)';
      for (let i = 0; i < 5; i++) { const u = (T * 1.6 + hs(h.sd, i)) % 1; c.fillRect(x + (hs(h.sd, i + 2) - 0.5) * r * 1.6, ty + (y - ty) * u * k, 2, 2 + u * 3); }
      if (k > 0.4) rock(c, h.sd, x + (fall ? 0 : Math.sin(T * 50) * 1.2), ty + r + (y - r * 1.6 - ty) * fall, r);
    },
    hit(c, h, x, y, f) {
      const r = Math.max(9, h.r * 0.42);
      if (f < 0.35) { rock(c, h.sd, x, y - r * 0.8, r); return; }
      const u = (f - 0.35) / 0.65;
      c.globalAlpha = 1 - u;
      for (let i = 0; i < 5; i++) { const a = -Math.PI * (0.1 + 0.8 * hs(h.sd, i)), d = u * (20 + r * 2 * hs(h.sd, i + 7)); rock(c, h.sd + i, x + Math.cos(a) * d, y - r * 0.4 + Math.sin(a) * d + u * u * 40, r * 0.35, u * 6); }
      c.globalAlpha = 1;
    }
  },
  boulder: {
    tell(c, h, x, y, k, T) {                                             // 바위 던지기 — 보스 손에서 포물선으로
      floorMark(c, x, y, h.r * (0.3 + k * 0.7), '#1a140e', 0.2 + k * 0.45);
      if (h.sx === undefined) return;
      const ox = h.sx - h.x + x, oy = h.sy - h.y + y, px = ox + (x - ox) * k, py = oy + (y - oy) * k - Math.sin(k * Math.PI) * 220;
      islet(c, h.sd, px, py, h.r * 0.5, T * 3);
    },
    hit(c, h, x, y, f) { STRIKE_ART.rock.hit(c, h, x, y, f, 0); }
  },
  shadow: {
    tell(c, h, x, y, k) { floorMark(c, x, y, h.r * (0.3 + k * 0.7), '#000000', 0.25 + k * 0.4); c.strokeStyle = rgba(h.c || '#ffffff', 0.5); c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y - 1, h.r, h.r * 0.26, 0, 0, TAU); c.stroke(); },
    hit(c, h, x, y, f) { floorMark(c, x, y, h.r * (1 + f), '#a89070', 0.4 * (1 - f)); }
  },
  burrow: {
    tell(c, h, x, y, k, T) {                                             // 땅굴 기습 — 땅이 들썩이며 흙이 튄다
      const b = k * 10 + Math.sin(T * 30) * 1.5;
      c.fillStyle = '#6a5438'; c.strokeStyle = '#2a2014'; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(x, y, h.r * 0.6, Math.max(1, b), 0, Math.PI, TAU); c.fill(); c.stroke();
      cracks(c, h.sd, x, y - b * 0.4, h.r * 0.8, '#2a2014', k, 6);
      c.fillStyle = '#8a7050'; for (let i = 0; i < 4; i++) { const u = (T * 2 + hs(h.sd, i)) % 1; c.fillRect(x + (hs(h.sd, i + 5) - 0.5) * h.r, y - b - u * 18 * k, 3, 3); }
    },
    hit(c, h, x, y, f) {
      c.globalAlpha = 1 - f;
      for (let i = 0; i < 8; i++) { const a = -Math.PI * (0.1 + 0.8 * hs(h.sd, i)), d = f * (30 + h.r * hs(h.sd, i + 3)); rock(c, h.sd + i, x + Math.cos(a) * d, y + Math.sin(a) * d + f * f * 50, 4 + hs(h.sd, i) * 4, f * 5); }
      c.globalAlpha = 1;
    }
  },
  meteor: {
    tell(c, h, x, y, k, T) {                                             // 별똥 추격 — 겨눔 십자가 좁혀 오고 하늘 끝에서 불덩이가 내려온다
      const R = h.r * (1.5 - k * 0.6);
      c.strokeStyle = rgba('#ffc070', 0.5 + k * 0.4); c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(x, y - 1, R, R * 0.28, 0, 0, TAU); c.stroke();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + T; c.beginPath(); c.moveTo(x + Math.cos(a) * R * 0.6, y - 1 + Math.sin(a) * R * 0.17); c.lineTo(x + Math.cos(a) * R * 1.2, y - 1 + Math.sin(a) * R * 0.34); c.stroke(); }
      const u = k * k, sx = x - 260 * (1 - u), sy = y - 520 * (1 - u) - 20;
      if (k > 0.15) meteorRock(c, h.sd, sx, sy, 5 + k * 6, 260, 520);
    },
    hit(c, h, x, y, f) {
      hzGlow(c, x, y - 8, h.r * 1.6 * (1 - f * 0.5), '#ffb060', 0.9 * (1 - f));
      floorMark(c, x, y, h.r * 0.8, '#2a1810', 0.6 * (1 - f * 0.6));
      c.fillStyle = '#ffd08a'; for (let i = 0; i < 8; i++) { const a = -Math.PI * hs(h.sd, i), d = f * (30 + 50 * hs(h.sd, i + 4)); c.globalAlpha = 1 - f; c.fillRect(x + Math.cos(a) * d, y - 6 + Math.sin(a) * d + f * f * 30, 3, 3); }
      c.globalAlpha = 1;
    }
  },
  plant: {
    tell(c, h, x, y, k, T) {                                             // 뿌리 분출 — 흙이 부풀고 새싹이 꿈틀댄다
      c.fillStyle = '#5a4028'; c.beginPath(); c.ellipse(x, y, h.w * 0.4, 2 + k * 6, 0, Math.PI, TAU); c.fill();
      cracks(c, h.sd, x, y - 1, h.w * 0.6, '#2a1c10', k, 4);
      for (let i = 0; i < 3; i++) {
        const sx = x + (i - 1) * h.w * 0.22, sw = Math.sin(T * 9 + i * 2) * 2;
        strokePath(c, [sx, y - 2, sx + sw, y - 4 - k * 8, sx + sw * 1.5, y - 6 - k * 12], '#6aa040', 1.6);
      }
    },
    hit(c, h, x, y, f, T) {
      const up = Math.min(1, f * 6) * (f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1);
      rootSpear(c, h.sd, x, y, h.hh * up, h.w * 0.7, T);
    }
  },
  seed: {
    tell(c, h, x, y, k, T) {                                             // 씨앗 폭탄 — 꼬투리가 날아와 박힌다
      floorMark(c, x, y, h.r * (0.3 + k * 0.6), '#14200a', 0.25 + k * 0.35);
      if (h.sx === undefined) return;
      const ox = h.sx - h.x + x, oy = h.sy - h.y + y, px = ox + (x - ox) * Math.min(1, k * 1.25), py = oy + (y - 8 - oy) * Math.min(1, k * 1.25) - Math.sin(Math.min(1, k * 1.25) * Math.PI) * 160;
      seedPod(c, px, py, 8, T * (k < 0.8 ? 8 : 0) + (k >= 0.8 ? Math.sin(T * 40) * 0.2 : 0));
    },
    hit(c, h, x, y, f) {
      c.globalAlpha = 1 - f; c.fillStyle = '#e8e0b0';
      for (let i = 0; i < 10; i++) { const a = -Math.PI * hs(h.sd, i), d = f * h.r * 1.2; c.save(); c.translate(x + Math.cos(a) * d, y - 8 + Math.sin(a) * d); c.rotate(a); poly(c, [0, -2, 9, 0, 0, 2]); c.fill(); c.restore(); }
      c.fillStyle = '#7fd06a'; for (let i = 0; i < 5; i++) { const a = -Math.PI * hs(h.sd, i + 20), d = f * h.r; c.beginPath(); c.ellipse(x + Math.cos(a) * d, y - 8 + Math.sin(a) * d + f * 20, 4, 2, a, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    }
  },
  spore: {
    tell(c, h, x, y, k, T) {                                             // 꽃 터뜨리기 — 땅에서 꽃봉오리가 부풀어 오른다
      const hh = 6 + k * 22, r = 4 + k * 8 + Math.sin(T * 12) * k;
      strokePath(c, [x, y, x + Math.sin(T * 3) * 2, y - hh * 0.6, x, y - hh], '#4a8a3a', 2.4);
      c.fillStyle = '#5aa04a'; c.beginPath(); c.ellipse(x - 5, y - hh * 0.4, 5, 2, 0.5, 0, TAU); c.fill();
      c.fillStyle = '#c86aa8'; c.strokeStyle = '#4a1a3a'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(x, y - hh - r * 0.6, r * 0.8, r, 0, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = '#f0a8d8'; c.beginPath(); c.moveTo(x, y - hh - r * 1.5); c.lineTo(x, y - hh + r * 0.2); c.stroke();
      if (k > 0.6) hzGlow(c, x, y - hh - r * 0.6, r * 2, '#8ff0c8', (k - 0.6) * 1.5);
    },
    hit(c, h, x, y, f) {
      const hh = 28, a = 1 - f;
      c.globalAlpha = a; c.fillStyle = '#c86aa8';
      for (let i = 0; i < 5; i++) { const ang = -Math.PI / 2 + (i - 2) * 0.6; c.beginPath(); c.ellipse(x + Math.cos(ang) * 8, y - hh + Math.sin(ang) * 8, 7, 3, ang, 0, TAU); c.fill(); }
      for (let i = 0; i < 7; i++) { const ang = i / 7 * TAU, d = 8 + f * h.r * 1.4; c.fillStyle = 'rgba(143,240,200,.55)'; c.beginPath(); c.arc(x + Math.cos(ang) * d, y - hh + Math.sin(ang) * d * 0.7, 6 + f * 10, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    }
  },
  bile: {
    tell(c, h, x, y, k, T) {                                             // 담즙 비 — 아가리에서 덩이가 튀어 나와 떨어진다
      floorMark(c, x, y, h.r * (0.3 + k * 0.6), '#2a3a08', 0.25 + k * 0.35);
      if (h.sx === undefined) return;
      const u = Math.min(1, k * 1.15), ox = h.sx - h.x + x, oy = h.sy - h.y + y;
      const px = ox + (x - ox) * u, py = oy + (y - 8 - oy) * u - Math.sin(u * Math.PI) * 180;
      if (u < 1) glob(c, px, py, 7, '#b8d050', '#3a4a10');
      c.fillStyle = 'rgba(184,208,80,.7)'; for (let i = 1; i < 4; i++) { const v = Math.max(0, u - i * 0.05); c.fillRect(ox + (x - ox) * v, oy + (y - 8 - oy) * v - Math.sin(v * Math.PI) * 180 + i * 3, 2, 3); }
    },
    hit(c, h, x, y, f) {
      c.globalAlpha = 1 - f;
      for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.1 + 0.8 * hs(h.sd, i)), d = f * (20 + h.r * hs(h.sd, i + 2)); glob(c, x + Math.cos(a) * d, y - 6 + Math.sin(a) * d + f * f * 30, 3, '#b8d050', '#3a4a10'); }
      c.globalAlpha = 1;
    }
  },
  fire: {
    tell(c, h, x, y, k, T) {
      if (h.shape === 'col') {                                           // 화로 분출 — 바닥 틈이 달아오르고 연기가 샌다
        c.fillStyle = '#2a1408'; c.fillRect(x - h.w * 0.3, y - 3, h.w * 0.6, 3);
        c.fillStyle = rgba('#ff8a3a', 0.4 + k * 0.6); c.fillRect(x - h.w * 0.25, y - 2, h.w * 0.5, 2);
        hzGlow(c, x, y - 2, h.w * 0.4 + k * 10, '#ff8a3a', 0.3 + k * 0.5);
        c.fillStyle = 'rgba(70,60,60,.45)'; for (let i = 0; i < 3; i++) { const u = (T * 1.2 + hs(h.sd, i)) % 1; c.beginPath(); c.arc(x + (hs(h.sd, i + 1) - 0.5) * 12, y - 6 - u * 40 * k, 3 + u * 6, 0, TAU); c.fill(); }
        if (k > 0.7) flame(c, h.sd, x, y, h.w * 0.3, 8 + (k - 0.7) * 40, T);
        return;
      }
      const ty = topOf(h, y), fall = k > 0.7 ? ((k - 0.7) / 0.3) ** 2 : 0;   // 용융 비 — 쇳물 방울이 맺혀 떨어진다
      hzGlow(c, x, y - 2, h.r * (0.5 + k * 0.5), '#ff8a3a', 0.25 + k * 0.4);
      const py = ty + 6 + (y - 12 - ty) * fall;
      glob(c, x, py, 5 + k * 3, '#ffb050', '#7a2a08'); hzGlow(c, x, py, 14, '#ff8a3a', 0.6);
    },
    hit(c, h, x, y, f, T) {
      if (h.shape === 'col') { const up = Math.min(1, f * 6) * (f > 0.65 ? 1 - (f - 0.65) / 0.35 : 1); flame(c, h.sd, x, y, h.w * 0.85, h.hh * up, T); return; }
      c.globalAlpha = 1 - f;
      for (let i = 0; i < 8; i++) { const a = -Math.PI * (0.1 + 0.8 * hs(h.sd, i)), d = f * (16 + h.r * hs(h.sd, i + 3)); glob(c, x + Math.cos(a) * d, y - 4 + Math.sin(a) * d + f * f * 30, 2.5, '#ffd080', '#7a2a08'); }
      c.globalAlpha = 1; hzGlow(c, x, y - 4, h.r, '#ff8a3a', 0.7 * (1 - f));
    }
  },
  slash: {
    tell(c, h, x, y, k, T) {                                             // 완벽한 연격 — 벨 자리에 정확한 설계선 둘
      const R = h.r, cy = y - R * 0.4;
      c.strokeStyle = rgba('#f4ead0', 0.4 + k * 0.5); c.lineWidth = 1; c.setLineDash([6, 4]);
      c.beginPath(); c.moveTo(x - R, cy - R * 0.6); c.lineTo(x + R, cy + R * 0.6); c.moveTo(x - R, cy + R * 0.6); c.lineTo(x + R, cy - R * 0.6); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(x, cy, 4 + k * 3, 0, TAU); c.stroke();
    },
    hit(c, h, x, y, f) {
      const R = h.r, cy = y - R * 0.4, a = 1 - f, op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
      for (const s of [-1, 1]) { c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 4 * a + 1; c.beginPath(); c.moveTo(x - R * f * 0.3 - R, cy - s * R * 0.6); c.lineTo(x + R, cy + s * R * 0.6); c.stroke(); }
      c.globalCompositeOperation = op; c.globalAlpha = 1;
    }
  },
  rift: {
    tell(c, h, x, y, k, T) {                                             // 틈새 도약 — 공간이 찢어지는 금
      const R = h.r, cy = y - R * 0.4, p = jag(h.sd, x, cy - R * 0.7 * k, x, cy + R * 0.7 * k, 6, 5);
      strokePath(c, p, 'rgba(20,0,40,.9)', 5 + k * 3); strokePath(c, p, '#c8a0ff', 1.5);
      hzGlow(c, x, cy, R * 0.5 * k, '#a06fff', 0.4);
    },
    hit(c, h, x, y, f) {
      const R = h.r, cy = y - R * 0.4, a = 1 - f;
      for (let i = 0; i < 3; i++) { c.globalAlpha = a; strokePath(c, [x - R * 0.7, cy - R * 0.5 + i * 12, x, cy - R * 0.2 + i * 12, x + R * 0.7, cy - R * 0.6 + i * 12], '#a06fff', 4 * a + 1); }
      c.globalAlpha = 1;
    }
  }
};
