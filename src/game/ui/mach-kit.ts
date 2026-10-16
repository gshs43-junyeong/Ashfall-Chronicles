/* ===== ui/mach-kit.js — 기계 창 그림 도구 — 불꽃 · 튀는 불똥 · 달군 쇠 색 · 두 마디 팔 · 모터 · 전선 ===== */
/* 그림만 — 상태를 갖지 않는다. 불똥은 Math.random 대신 시각에서 뽑은 해시라 프레임마다 떨지 않고 포물선을 그린다. */
import { mixHex } from '../../engine/core/color.js';
import { TAU, clamp, lerp } from '../../engine/core/math.js';
import { glow } from './process.js';

type C2 = CanvasRenderingContext2D;
export const ease = (k: number) => k * k * (3 - 2 * k);
/** 0~1 사이 고른 값 — 같은 n 이면 늘 같다 */
export const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
/** 구간 [a, b] 에서의 몫(0~1) */
export const seg = (q: number, a: number, b: number) => clamp((q - a) / (b - a), 0, 1);

/** 달군 쇠의 빛 — 0 = 막 녹은 흰 노랑 → 주황 → 검붉음 → 1 = 식은 제 색 */
export function hotCol(k: number, metal: string) {
  const S = ['#fff4c0', '#ffb030', '#e05020', '#702818', metal];
  const f = clamp(k, 0, 1) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(f));
  return mixHex(S[i], S[i + 1], f - i);
}
/** 광석 · 재료 색 — 그림 대신 녹는 덩어리 · 쇳물에 쓴다 */
export function matCol(id: string | null): string {
  if (!id) return '#8a8070';
  if (/copper/.test(id)) return '#c87a3a'; if (/gold/.test(id)) return '#e8c050'; if (/iron|steel/.test(id)) return '#9aa0aa';
  if (/mythril/.test(id)) return '#5fd0c0'; if (/lead/.test(id)) return '#6a7080'; if (/glacium/.test(id)) return '#a8e0ff';
  if (/oil|crude/.test(id)) return '#2a2420'; if (/sand|salt/.test(id)) return '#e0d6b8';
  return '#a89878';
}
/** 불꽃 몇 갈래 — k 는 세기 */
export function flames(c: C2, x: number, y: number, w: number, k: number, t: number) {
  if (k <= 0) return;
  const n = Math.max(3, Math.round(w / 7));
  for (let i = 0; i < n; i++) {
    const fx = x + w * (i + 0.5) / n, h = (6 + 5 * Math.sin(t * 13 + i * 2.1) + 3 * Math.sin(t * 29 + i)) * k;
    c.fillStyle = '#c8401a'; c.beginPath(); c.moveTo(fx - 4, y); c.quadraticCurveTo(fx + Math.sin(t * 9 + i) * 2, y - h * 1.4, fx + 4, y); c.fill();
    c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(fx - 3, y); c.quadraticCurveTo(fx, y - h * 1.1, fx + 3, y); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(fx - 1.5, y); c.quadraticCurveTo(fx, y - h * 0.6, fx + 1.5, y); c.fill();
  }
  glow(c, x + w / 2, y - 4, w * 0.6, '#ff8a3a', 0.28 * k);
}
/** 화실 — 쇠살대와 그 위 불 · 아래 잉걸 */
export function firebox(c: C2, x: number, y: number, w: number, h: number, k: number, t: number) {
  c.fillStyle = '#1a1210'; c.fillRect(x, y, w, h);
  c.fillStyle = k > 0 ? `rgba(255,${90 + 40 * Math.sin(t * 5)},30,${0.35 + 0.25 * k})` : '#2a1a14'; c.fillRect(x + 1, y + h - 3, w - 2, 2);   // 잉걸
  flames(c, x + 1, y + h - 3, w - 2, k, t);
  c.fillStyle = '#4a4440'; for (let gx = x + 2; gx < x + w - 1; gx += 4) c.fillRect(gx, y + h - 4, 2, 1);   // 쇠살대
}
/** 튀는 불똥 — 포물선을 그리고 바닥에서 한 번 튄다. 막 튄 것은 희고 식으며 붉어진다 */
export function sparks(c: C2, ox: number, oy: number, floor: number, n: number, t: number, rate: number, bias: number, spd = 1) {
  c.save(); c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const u = t * rate + i / n, gen = Math.floor(u), ph = u - gen, life = 0.55 + hash(i * 3 + gen) * 0.35;
    if (ph > life) continue;
    const vx = ((hash(i * 131 + gen * 17) - 0.5) * 50 + bias * 22) * spd, vy = (-14 - hash(i * 71 + gen * 29 + 5) * 34) * spd;
    const at = (tt: number) => {
      let x = ox + vx * tt, y = oy + vy * tt + 70 * tt * tt;
      if (y > floor) { y = floor - (y - floor) * 0.3; x = ox + vx * tt * 0.9; }
      return [x, y];
    };
    const tt = ph, [x, y] = at(tt), [px, py] = at(Math.max(0, tt - 0.035));
    const k = ph / life;
    c.globalAlpha = 1 - k * 0.7;
    c.strokeStyle = k < 0.2 ? '#fffbe0' : k < 0.5 ? '#ffd060' : '#ff7a2a'; c.lineWidth = k < 0.3 ? 1.1 : 0.8;
    c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
  }
  c.restore();
}
/** 피어오르는 연기 · 김 — col 은 'r,g,b' */
export function puffs(c: C2, x: number, y: number, n: number, t: number, rate: number, rise: number, col: string, a = 0.45) {
  for (let i = 0; i < n; i++) {
    const k = (t * rate + i / n) % 1;
    c.fillStyle = `rgba(${col},${a * (1 - k)})`;
    c.beginPath(); c.arc(x + Math.sin(t * 2 + i * 2.3) * 2 + k * 3, y - k * rise, 1.5 + k * 3.5, 0, TAU); c.fill();
  }
}
/** 두 마디 팔 — 어깨(sx, sy)에서 손끝(tx, ty)까지의 팔꿈치 자리. bend 는 굽는 쪽(±1) */
export function ik2(sx: number, sy: number, tx: number, ty: number, L1: number, L2: number, bend = 1) {
  const dx = tx - sx, dy = ty - sy, d = Math.max(0.01, Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01));
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), a = Math.atan2(dy, dx) - bend * A;
  return [sx + Math.cos(a) * L1, sy + Math.sin(a) * L1];
}
/** 전동기 — 냉각 핀 · 끝의 팬. on 이면 팬이 돌고 감은 코일이 달아오른다 */
export function motor(c: C2, x: number, y: number, on: number, t: number) {
  c.fillStyle = '#3e4a56'; c.fillRect(x, y, 13, 9);
  c.fillStyle = '#56636f'; for (let i = 0; i < 4; i++) c.fillRect(x + 1 + i * 3, y, 1.5, 9);
  c.fillStyle = on > 0 ? mixHex('#5a3020', '#e08030', on * (0.6 + 0.4 * Math.sin(t * 9))) : '#3a2a22'; c.fillRect(x + 4, y + 3, 6, 3);
  c.save(); c.translate(x + 15, y + 4.5); c.rotate(on > 0 ? t * 30 : 0);
  c.fillStyle = '#8a96a2'; for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.fillRect(-0.8, -4, 1.6, 4); }
  c.restore();
  c.fillStyle = '#2a323a'; c.fillRect(x - 1, y + 8, 15, 2);
}
/** 전선 — 꺾인 줄을 따라 전기 알갱이가 흐른다(on 0~1) */
export function cable(c: C2, pts: number[][], on: number, t: number, w = 1.6) {
  c.save(); c.lineJoin = 'round';
  c.strokeStyle = '#141416'; c.lineWidth = w + 1; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  c.strokeStyle = on > 0 ? '#5a4a22' : '#2e2e34'; c.lineWidth = w; c.stroke();
  if (on > 0) {
    let L = 0; const seglen: number[] = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seglen.push(d); L += d; }
    const n = Math.max(2, Math.round(L / 9));
    c.fillStyle = '#ffe890'; c.globalCompositeOperation = 'lighter';
    for (let j = 0; j < n; j++) {
      let d = ((t * 22 * (0.5 + on) + j * L / n) % L), i = 0;
      while (i < seglen.length - 1 && d > seglen[i]) { d -= seglen[i]; i++; }
      const k = seglen[i] ? d / seglen[i] : 0, x = lerp(pts[i][0], pts[i + 1][0], k), y = lerp(pts[i][1], pts[i + 1][1], k);
      c.globalAlpha = 0.9; c.fillRect(x - 1, y - 1, 2, 2); c.globalAlpha = 0.25; c.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
  }
  c.restore();
}
/** 볼트 표시 — 전기가 드는 자리(작은 번개) */
export function bolt(c: C2, x: number, y: number, s: number, col: string) {
  c.fillStyle = col; c.beginPath();
  c.moveTo(x + s * 0.2, y - s); c.lineTo(x - s * 0.5, y + s * 0.15); c.lineTo(x, y + s * 0.15); c.lineTo(x - s * 0.2, y + s); c.lineTo(x + s * 0.5, y - s * 0.15); c.lineTo(x, y - s * 0.15); c.closePath(); c.fill();
}
/** 들고 나는 화살표(꺾쇠 둘) — 투입은 초록, 산출은 주황. dir +1 = 오른쪽 */
export function chevron(c: C2, x: number, y: number, dir: number, col: string, t: number, on: boolean) {
  for (let i = 0; i < 2; i++) {
    const ph = on ? ((t * 1.6 + i * 0.5) % 1) : 0.3 + i * 0.4;
    c.globalAlpha = on ? 0.35 + 0.65 * Math.sin(ph * Math.PI) : 0.45;
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
    const ox = x + i * 6 * dir; c.moveTo(ox - 2.5 * dir, y - 4); c.lineTo(ox + 2.5 * dir, y); c.lineTo(ox - 2.5 * dir, y + 4); c.stroke();
  }
  c.globalAlpha = 1;
}
/** 작은 전주 — 가로대 · 애자 둘. 전선이 닿는 자리(애자 끝)를 돌려준다 */
export function minipole(c: C2, x: number, top: number, bot: number) {
  c.fillStyle = '#6a5a40'; c.fillRect(x - 1.5, top, 3, bot - top);
  c.fillStyle = '#4a3e2c'; c.fillRect(x - 8, top + 3, 16, 2);
  c.fillStyle = '#b8d0e0'; c.fillRect(x - 7, top, 2, 3); c.fillRect(x + 5, top, 2, 3);
  return [[x - 6, top], [x + 6, top]];
}
