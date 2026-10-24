/* ===== ui/craft-scene.js — 제작 창 무대 그림 — 작업대(재고 · 톱질 · 못 박기 · 대패) · 용광로(풀무 · 녹임 · 붓기 · 담금질) · 강화 모루 ===== */
/* 공정 줄(ui/process)이 시각 k 를 주면 여기가 그린다. 창이 열려 있으면 쉬는 동안에도 시설이 살아 있다(불 · 등불 · 먼지).
   ★ 예전 무대는 아이콘 몇 개가 미끄러지는 112px 띠라 "만드는 과정"으로 읽히지 않았다(사용자) — 도구가 재료에 실제로 닿고
   그 자국(먹줄 · 톱 자국 · 못 · 대팻밥 · 쇳물 · 김)이 남는 장면으로 그린다. */
import { app as G } from '../ctx.js';
import { TAU, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { ITEMS, STATION_NAME } from '../data/items.js';
import { Art } from '../itemart.js';
import { UI } from '../ui.js';
import { drawIc, glow, stepRow } from './process.js';
import { ease, flames, hash, hotCol, puffs, seg, sparks } from './mach-kit.js';

type C2 = CanvasRenderingContext2D;
export interface SceneArg { st: string; step: number; idx?: number; names?: string[]; sk: number; k: number; t: number; mats: string[]; out: string; idle: boolean; lv?: number }

/* 아이콘을 한 색으로 물들인 사본 — 달군 쇠 · 식은 쇠를 그림째 칠한다 */
const TINT: Record<string, HTMLCanvasElement> = {};
function tinted(id: string, col: string): HTMLCanvasElement | null {
  const key = id + col;
  if (TINT[key]) return TINT[key];
  const im = new Image(); im.src = Art.itemUrl(id);
  if (!im.complete || !im.naturalWidth) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g = cv.getContext('2d')!; g.drawImage(im, 0, 0, 32, 32);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, 32, 32);
  return TINT[key] = cv;
}
/** 달군 아이콘 — 원래 그림 위에 열색을 heat 만큼 얹는다 */
function hotIcon(c: C2, id: string, x: number, y: number, s: number, heat: number) {
  drawIc(c, id, x, y, s);
  if (heat <= 0.01) return;
  const tc = tinted(id, hotCol(1 - heat, '#ff6a2a'));
  if (tc) { c.save(); c.globalAlpha = Math.min(0.85, heat); c.drawImage(tc, x, y, s, s); c.globalCompositeOperation = 'lighter'; c.globalAlpha = heat * 0.4; c.drawImage(tc, x, y, s, s); c.restore(); }
  glow(c, x + s / 2, y + s / 2, s * 0.9, '#ff8a3a', heat * 0.45);
}
/** 벽돌 벽 — 줄마다 반 칸씩 엇갈린다 */
function bricks(c: C2, x: number, y: number, w: number, h: number, a: string, b: string, bw = 22, bh = 10) {
  c.fillStyle = b; c.fillRect(x, y, w, h);
  for (let r = 0, yy = y; yy < y + h; r++, yy += bh) for (let xx = x - (r % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
    const x0 = Math.max(x, xx + 1), x1 = Math.min(x + w, xx + bw - 1);
    if (x1 <= x0) continue;
    c.fillStyle = hash(r * 31 + Math.floor(xx)) > 0.5 ? a : b === a ? a : shadeMix(a, 0.85);
    c.fillRect(x0, yy + 1, x1 - x0, bh - 2);
  }
}
function shadeMix(hex: string, m: number) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${Math.round(r * m)},${Math.round(g * m)},${Math.round(b * m)})`;
}
/** 망치 — 자루 끝(px, py)을 축으로 a 만큼 돈다. 머리는 자루 끝에서 L */
function hammer(c: C2, px: number, py: number, a: number, L = 34, head = '#9aa0aa') {
  c.save(); c.translate(px, py); c.rotate(a);
  c.fillStyle = '#5a3a1c'; c.fillRect(0, -2, L, 4); c.fillStyle = '#7a5230'; c.fillRect(0, -2, L, 1.5);
  c.fillStyle = shadeMix(head, 0.7); c.fillRect(L - 5, -9, 11, 18); c.fillStyle = head; c.fillRect(L - 5, -9, 11, 5); c.fillStyle = '#e8ecf2'; c.fillRect(L - 4, -8, 2, 15);
  c.restore();
}

/** 시설 이름표 — 왼쪽 아래, 단계만큼 금빛 점 */
function plate(c: C2, H: number, name: string, lv: number) {
  c.save(); c.font = `700 10px ${FONT || 'sans-serif'}`;
  const w = c.measureText(name).width + 14 + 4 * 7;
  c.fillStyle = 'rgba(10,9,7,.78)'; c.beginPath(); c.roundRect(6, H - 22, w, 16, 3); c.fill();
  c.strokeStyle = '#5a4a2a'; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#d8c48a'; c.textBaseline = 'middle'; c.fillText(name, 12, H - 13.5);
  for (let i = 0; i < 4; i++) { c.fillStyle = i < lv ? '#f0c060' : '#3a3220'; c.beginPath(); c.arc(16 + c.measureText(name).width + i * 7, H - 14, 2.2, 0, TAU); c.fill(); }
  c.restore();
}
/** 전기 불꽃 — 두 점 사이 들쭉날쭉한 번개(아크 전극 · 용접) */
function arc(c: C2, x0: number, y0: number, x1: number, y1: number, t: number, col = '#cfe8ff') {
  c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y0);
  for (let i = 1; i < 6; i++) { const u = i / 6; c.lineTo(lerp(x0, x1, u) + (hash(Math.floor(t * 30) * 7 + i) - 0.5) * 8, lerp(y0, y1, u) + (hash(Math.floor(t * 30) * 3 + i) - 0.5) * 4); }
  c.lineTo(x1, y1); c.stroke(); c.restore(); glow(c, x1, y1, 16, col, 0.6);
}
/** 집게팔 — 밑동(bx, by)에서 두 마디로 손끝(hx, hy)까지 */
function robotArm(c: C2, bx: number, by: number, hx: number, hy: number, lit: string) {
  const D = Math.hypot(hx - bx, hy - by), L = Math.max(34, D * 0.62), d = Math.min(L * 2 - 2, D), a = Math.atan2(hy - by, hx - bx), al = Math.acos(d / (2 * L));
  const e1 = Math.sin(a - al) < Math.sin(a + al) ? a - al : a + al, ex = bx + Math.cos(e1) * L, ey = by + Math.sin(e1) * L;   // 팔꿈치는 늘 위로
  c.fillStyle = '#3a3e46'; c.fillRect(bx - 9, by - 4, 18, 8);
  c.strokeStyle = '#8a8e98'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
  c.strokeStyle = '#b8bcc4'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by - 2); c.lineTo(ex, ey - 2); c.stroke();
  c.fillStyle = '#5a5e68'; c.beginPath(); c.arc(ex, ey, 4.5, 0, TAU); c.fill(); c.fillStyle = lit; c.beginPath(); c.arc(ex, ey, 1.6, 0, TAU); c.fill();
  c.fillStyle = '#5a5e68'; c.fillRect(hx - 6, hy - 2, 3, 9); c.fillRect(hx + 3, hy - 2, 3, 9);
}

export const CraftSceneUIPart: Bag = {
  /** 공정 무대 하나 그리기 — 위 단계 줄(돌 때만) · 아래 시설 장면 */
  craftScene(c: C2, W: number, H: number, s: SceneArg) {
    if (s.st === 'work') this.sceneWork(c, W, H, s);
    else if (s.st === 'forge') this.sceneForge(c, W, H, s);
    else if (s.st === 'smith') this.sceneSmith(c, W, H, s);
    else this.sceneHand(c, W, H, s);
    const kind = s.st === 'smith' ? 'forge' : s.st;
    if ((kind === 'work' || kind === 'forge') && STATION_NAME[kind]) plate(c, H, STATION_NAME[kind][s.lv || 1], s.lv || 1);
    if (!s.idle && s.names) stepRow(c, s.names, s.idx ?? s.step, s.sk, 8, 6, W - 16);
  },
  /** 창이 열려 있는 동안 쉬는 무대 — 고른 탭의 시설이 숨 쉰다(공정이 돌면 공정이 그린다) */
  craftIdle() {
    if (this._ciRaf) return;
    const loop = () => {
      this._ciRaf = 0;
      if (this.open !== 'craft') return;
      if (!this.craftRun) {
        const cv = this.craftStageEl() as HTMLCanvasElement; cv.classList.add('on');
        const W = cv.clientWidth || 400, H = 176, dpr = Math.min(2, devicePixelRatio || 1);
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        const c = cv.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
        const tab = this.craftTab || 'hand', so = G.nearStObj && G.nearStObj[tab];
        this.craftScene(c, W, H, { st: tab, step: 0, sk: 0, k: 0, t: performance.now() / 1000, mats: [], out: '', idle: true, lv: (so && so.lv) || 1 });
      }
      this._ciRaf = requestAnimationFrame(loop);
    };
    this._ciRaf = requestAnimationFrame(loop);
  },

  /* ================= 작업대 ================= */
  sceneWork(c: C2, W: number, H: number, s: SceneArg) {
    const { step, sk, k, t, idle } = s, floor = H - 14, top = floor - 54, bx0 = 26, bx1 = W - 26, lv = s.lv || 1;
    const nm = s.names && s.idx !== undefined ? s.names[s.idx] : '';
    /* 벽 — 판자벽 · 걸어 둔 연장 · 등잔 */
    const wg = c.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#2a1e14'); wg.addColorStop(1, '#16100a');
    c.fillStyle = wg; c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 34) { c.fillStyle = hash(x) > 0.5 ? '#2e2116' : '#261b11'; c.fillRect(x, 0, 33, top); c.fillStyle = '#1a120b'; c.fillRect(x + 33, 0, 1, top); }
    c.fillStyle = '#3a2a1a'; c.fillRect(0, 30, W, 4);                                   // 연장 걸이
    const rack = (x: number, f: (x: number) => void) => { c.fillStyle = '#7a6a5a'; c.fillRect(x - 1, 32, 2, 4); f(x); };
    rack(W * 0.22, x => { c.fillStyle = '#b8bcc4'; c.beginPath(); c.moveTo(x - 4, 36); c.lineTo(x + 26, 36); c.lineTo(x + 26, 44); c.lineTo(x - 2, 46); c.fill(); c.fillStyle = '#6a4a28'; c.fillRect(x - 12, 34, 10, 10); });
    rack(W * 0.4, x => { c.fillStyle = '#c8b070'; c.fillRect(x, 36, 3, 30); c.fillRect(x, 36, 18, 3); });          // 곱자
    rack(W * 0.58, x => { c.fillStyle = '#5a3a1c'; c.fillRect(x - 1, 36, 3, 26); c.fillStyle = '#8a8e98'; c.fillRect(x - 6, 58, 13, 7); });
    if (lv >= 3) {                                                     // 전등 — 자동 조립대부터는 등잔 대신
      c.fillStyle = '#2a2a30'; c.fillRect(W - 70, 0, 2, 26); c.fillStyle = '#4a4e56'; c.beginPath(); c.moveTo(W - 82, 34); c.lineTo(W - 56, 34); c.lineTo(W - 62, 24); c.lineTo(W - 76, 24); c.fill();
      glow(c, W - 69, 38, 80, lv >= 4 ? '#a8e8ff' : '#e8f0ff', 0.3); glow(c, W - 69, 35, 10, '#ffffff', 0.7);
    } else {
      const lamp = 0.75 + 0.25 * Math.sin(t * 6.3) * Math.sin(t * 2.1);
      c.fillStyle = '#4a3a2a'; c.fillRect(W - 70, 10, 2, 22); c.fillStyle = '#c8a050'; c.fillRect(W - 76, 30, 14, 10);
      glow(c, W - 69, 36, 70, '#ffb050', 0.35 * lamp); glow(c, W - 69, 36, 14, '#fff0c0', 0.6 * lamp);
    }
    /* 작업대 — 두꺼운 상판 · 나뭇결 · 바이스 · 다리 */
    c.fillStyle = '#2a1c10'; c.fillRect(bx0 + 10, top + 14, 10, floor - top - 14); c.fillRect(bx1 - 20, top + 14, 10, floor - top - 14);
    c.fillStyle = '#35241a'; c.fillRect(bx0 + 10, floor - 18, bx1 - bx0 - 20, 5);
    c.fillStyle = '#6a4626'; c.fillRect(bx0, top, bx1 - bx0, 14); c.fillStyle = '#8a5e34'; c.fillRect(bx0, top, bx1 - bx0, 3);
    c.strokeStyle = '#5a3a1e'; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(bx0, top + 5 + i * 2.4); for (let x = bx0; x <= bx1; x += 16) c.lineTo(x, top + 5 + i * 2.4 + Math.sin(x * 0.05 + i) * 1.2); c.stroke(); }
    c.fillStyle = '#4a4e56'; c.fillRect(bx1 - 46, top - 14, 20, 14); c.fillStyle = '#6a6e78'; c.fillRect(bx1 - 46, top - 14, 20, 3);   // 바이스
    c.fillStyle = '#8a8e98'; c.fillRect(bx1 - 52, top - 9, 6, 3);
    if (lv >= 2) { c.fillStyle = '#7a7e88'; c.fillRect(bx0, top + 12, bx1 - bx0, 3); for (let x = bx0 + 6; x < bx1; x += 18) { c.fillStyle = '#c8ccd4'; c.fillRect(x, top + 13, 1, 1); } }   // 쇠 띠 · 눈금
    if (lv >= 4) { const g2 = 0.5 + 0.5 * Math.sin(t * 2.4); c.fillStyle = `rgba(110,220,255,${0.35 + 0.35 * g2})`; c.fillRect(bx0 + 4, top + 15, bx1 - bx0 - 8, 2); glow(c, W / 2, top + 16, 90, '#6ad8ff', 0.12 + 0.08 * g2); }
    const armOn = lv >= 3 && !idle && step === 2, abx = bx1 - 18, aby = top - 2;
    /* 재료 — 상판 왼쪽에 쌓여 있다가 일감으로 하나씩 들어간다 */
    const cx = W / 2, py = top - 12;
    s.mats.forEach((id, i) => { const used = !idle && k > (i + 1) / (s.mats.length + 1) * 0.5; if (!used) drawIc(c, id, bx0 + 8 + i * 26, top - 24 - (i % 2) * 3, 22); });
    if (idle) {                                                         // 쉬는 동안 — 먼지가 등잔 빛에 떠다닌다
      for (let i = 0; i < 14; i++) { const q = (t * 0.05 + hash(i) ) % 1; c.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2 + i); c.fillStyle = '#ffe0a0'; c.fillRect(W - 140 + hash(i + 9) * 120 + Math.sin(t + i) * 6, 20 + q * (top - 30), 1.5, 1.5); }
      c.globalAlpha = 1;
      c.fillStyle = '#9a7040'; c.fillRect(cx - 70, py, 140, 12); c.fillStyle = '#b48650'; c.fillRect(cx - 70, py, 140, 3);   // 놓인 판자
      if (lv >= 3) robotArm(c, abx, aby, abx - 30 + Math.sin(t * 0.8) * 6, aby - 40 + Math.sin(t * 1.1) * 4, lv >= 4 ? '#6ad8ff' : '#7aff9a');
      return;
    }
    /* 일감 판자 — 자를 곳에서 두 토막이 된다 */
    const cutX = cx + 22, L0 = cx - 80, L1 = cx + 80, kerf = step === 1 ? ease(sk) : step > 1 ? 1 : 0;
    const off = step === 1 && sk > 0.92 ? (sk - 0.92) / 0.08 : 0;                  // 끝토막이 떨어져 나간다
    const plank = (x0: number, x1: number, dy: number, rot = 0) => {
      c.save(); c.translate(x0, py + dy); c.rotate(rot);
      c.fillStyle = '#9a7040'; c.fillRect(0, 0, x1 - x0, 12); c.fillStyle = '#b48650'; c.fillRect(0, 0, x1 - x0, 3);
      c.strokeStyle = '#7a5430'; c.beginPath(); for (let i = 0; i < 2; i++) { c.moveTo(0, 5 + i * 3); c.bezierCurveTo((x1 - x0) * 0.3, 3 + i * 3, (x1 - x0) * 0.6, 8 + i * 3, x1 - x0, 5 + i * 3); } c.stroke();
      c.restore();
    };
    if (step <= 1) { plank(L0, cutX, 0); plank(cutX, L1, off * 10, off * 0.25); }
    else {                                                              // 맞춰 붙인다 — 두 토막을 ㄱ 자로
      const j = step === 2 ? ease(Math.min(1, sk * 2.5)) : 1;
      plank(L0, cutX, 0); plank(cutX - 6, cutX + 6 + 50 * (1 - j), -40 * j + 0, 0);
      if (j >= 1) { c.fillStyle = '#9a7040'; c.fillRect(cutX - 6, py - 46, 12, 46); c.fillStyle = '#b48650'; c.fillRect(cutX - 6, py - 46, 3, 46); }
    }
    if (step >= 1 && kerf > 0 && step <= 1) { c.fillStyle = '#2a1a0c'; c.fillRect(cutX - 1, py, 2, 12 * kerf); }
    /* 설계를 띄운다 — 일감 위에 푸른 설계도가 떠서 자를 자리를 짚는다 */
    if (step === 0 && lv >= 3) {
      const u = ease(Math.min(1, sk * 2)), hy = py - 58;
      c.save(); c.globalAlpha = 0.5 * u; c.strokeStyle = lv >= 4 ? '#7ae0ff' : '#a8c8ff'; c.lineWidth = 1;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(cx - 60, hy + i * 7); c.lineTo(cx + 60, hy + i * 7); c.stroke(); }
      c.globalAlpha = u; drawIc(c, s.out, cx - 16, hy + 2, 32); c.restore();
      c.fillStyle = '#ff5a4a'; c.fillRect(cutX - 1, py - 4 + Math.sin(t * 9) * 1, 2, 18);          // 레이저 표시선
      glow(c, cutX, py + 6, 14, '#ff6a5a', 0.5);
    } else if (step === 0 && lv === 2 && nm === tr('바이스에 물린다')) {
      const u = ease(sk); c.fillStyle = '#4a4e56'; c.fillRect(L0 - 14 + u * 6, py - 4, 10, 20); c.fillStyle = '#8a8e98'; c.fillRect(L0 - 30, py + 4, 18 - u * 6, 3);
    }
    /* 먹줄 — 곱자를 대고 연필이 긋는다 */
    if (step === 0 && lv < 3 && nm !== tr('바이스에 물린다')) {
      const sq = ease(Math.min(1, sk * 3));
      c.fillStyle = '#c8b070'; c.fillRect(cutX + 2, py - 30 + (1 - sq) * -20, 4, 42); c.fillRect(cutX + 2, py - 30 + (1 - sq) * -20, 30, 4);
      const pl = seg(sk, 0.3, 0.95);
      c.fillStyle = '#2a1a0c'; c.fillRect(cutX, py, 1, 12 * pl);
      const px = cutX - 3, pyy = py + 12 * pl;
      c.save(); c.translate(px, pyy); c.rotate(-0.6); c.fillStyle = '#e0b030'; c.fillRect(-3, -26, 6, 24); c.fillStyle = '#f0d8a0'; c.beginPath(); c.moveTo(-3, -2); c.lineTo(3, -2); c.lineTo(0, 3); c.fill(); c.restore();
      for (let i = 0; i < 6; i++) { c.fillStyle = '#4a3420'; c.fillRect(L0 + 10 + i * 20, py + 1, 1, i % 2 ? 3 : 5); }   // 눈금
    }
    /* 톱질 — 톱날이 앞뒤로 · 톱 자국이 깊어지고 · 톱밥이 떨어져 쌓인다 */
    if (step === 1 && sk < 0.95 && lv >= 4) {                          // 물줄기로 자른다 — 노즐에서 가는 물줄기 · 물안개
      c.fillStyle = '#3a3e46'; c.fillRect(cutX - 7, 18, 14, 16); c.fillStyle = '#5a5e68'; c.fillRect(cutX - 3, 34, 6, 6);
      c.strokeStyle = 'rgba(160,230,255,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cutX, 40); c.lineTo(cutX + Math.sin(t * 40) * 0.6, py + 12 * kerf); c.stroke();
      glow(c, cutX, py + 10 * kerf, 18, '#7ae0ff', 0.6);
      puffs(c, cutX, py + 12, 4, t, 1.2, 18, '180,230,250', 0.45);
    } else if (step === 1 && sk < 0.95 && lv === 3) {                  // 띠톱 — 위 바퀴에서 내려오는 띠 날이 내달린다
      c.fillStyle = '#4a4e56'; c.fillRect(cutX - 18, 8, 36, 24); c.fillStyle = '#6a6e78'; c.fillRect(cutX - 18, 8, 36, 3);
      c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(cutX, 20, 9, 0, TAU); c.fill(); c.save(); c.translate(cutX, 20); c.rotate(t * 30); c.fillStyle = '#8a8e98'; c.fillRect(-8, -1, 16, 2); c.restore();
      c.fillStyle = '#c8ccd4'; c.fillRect(cutX - 1, 32, 2, py + 12 - 32);
      c.fillStyle = '#e8ecf2'; for (let y = 32 + (t * 300) % 6; y < py + 12; y += 6) c.fillRect(cutX - 1, y, 2, 1);
      c.fillStyle = '#e8c890'; for (let i = 0; i < 12; i++) { const q = (t * 3 + i / 12) % 1, a = hash(i * 7); c.globalAlpha = 1 - q; c.fillRect(cutX + 2 + q * 30 * a, py + 6 - q * 10 + q * q * 30, 2, 2); } c.globalAlpha = 1;
    } else if (step === 1 && sk < 0.95) {
      const sw = Math.sin(t * (lv === 2 ? 26 : 20)) * (lv === 2 ? 14 : 22), dep = 12 * kerf;
      if (lv === 2) {                                                  // 실톱 — 활 모양 틀에 가는 날
        c.save(); c.translate(cutX + sw, py + dep - 2);
        c.strokeStyle = '#8a8e98'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, 0); c.lineTo(-30, -26); c.lineTo(22, -26); c.lineTo(22, 0); c.stroke();
        c.strokeStyle = '#e8ecf2'; c.lineWidth = 1; c.beginPath(); c.moveTo(-30, 0); c.lineTo(22, 0); c.stroke();
        c.fillStyle = '#6a4a28'; c.beginPath(); c.roundRect(20, -8, 8, 16, 3); c.fill(); c.restore();
      } else {
      c.save(); c.translate(cutX + sw, py + dep - 2); c.rotate(-0.12);
      c.fillStyle = '#c8ccd4'; c.beginPath(); c.moveTo(-46, 0); c.lineTo(20, 0); c.lineTo(20, -14); c.lineTo(-40, -8); c.closePath(); c.fill();
      c.fillStyle = '#9aa0aa'; for (let x = -44; x < 20; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 2, 3); c.lineTo(x + 4, 0); c.fill(); }
      c.fillStyle = '#e8ecf2'; c.fillRect(-38, -7, 56, 1);
      c.fillStyle = '#6a4a28'; c.beginPath(); c.roundRect(18, -18, 16, 16, 4); c.fill(); c.fillStyle = '#2a1c10'; c.fillRect(23, -13, 6, 6);
      c.restore();
      }
      c.fillStyle = '#e8c890';
      for (let i = 0; i < 16; i++) { const q = (t * 2.4 + i / 16) % 1, a = hash(i * 7); c.globalAlpha = 1 - q * 0.6; c.fillRect(cutX + (a - 0.5) * 14 + q * (a - 0.5) * 20, py + 12 + q * (floor - py - 16), 2, 2); }
      c.globalAlpha = 1;
    }
    if (step >= 1) { const pile = Math.min(1, step === 1 ? sk : 1); c.fillStyle = '#d8b880'; c.beginPath(); c.ellipse(cutX, floor - 1, 16 * pile + 2, 4 * pile + 1, 0, Math.PI, TAU); c.fill(); }
    /* 못 박기 — 망치 세 번, 못 머리가 박혀 들어간다 */
    if (step === 2) {
      const ph = (sk * 3) % 1, hit = Math.floor(sk * 3), a = ph < 0.65 ? -1.6 + ease(ph / 0.65) * 1.55 : -0.05 - ease((ph - 0.65) / 0.35) * 1.0;
      const nails = Math.min(3, hit + (ph > 0.62 ? 1 : 0));
      const nx = cutX, ny = py - 34;
      c.fillStyle = '#8a8e98';
      for (let i = 0; i < 3; i++) { const sunk = i < nails ? 1 : i === nails ? 0 : 0; c.fillRect(nx - 9, ny + 4 + i * 12, 6 * (1 - sunk) + 2, 2); c.fillStyle = '#6a6e78'; c.fillRect(nx - 9 + (1 - sunk) * 6, ny + 3 + i * 12, 2, 4); c.fillStyle = '#8a8e98'; }
      if (lv >= 3) {                                                    // 용접 · 리벳 — 집게팔이 일감을 잡고 끝에서 푸른 불꽃
        const wy = ny + 4 + (sk * 30) % 30;
        if (hash(Math.floor(t * 20)) > 0.25) arc(c, nx + 20, wy - 8, nx - 6, wy, t, lv >= 4 ? '#9ae8ff' : '#d8e8ff');
        sparks(c, nx - 6, wy, floor, 10, t * 2, 3, 0.4, 0.6);
        c.fillStyle = '#5a5e68'; c.fillRect(nx + 18, wy - 14, 10, 8); c.fillStyle = '#2a2a30'; c.fillRect(nx + 22, wy - 22, 3, 8);
      } else {
        hammer(c, nx - 74, ny + 4 + Math.min(2, hit) * 12 + 6, a, 62);
        if (ph > 0.6 && ph < 0.78) { glow(c, nx - 8, ny + 5 + Math.min(2, hit) * 12, 16, '#fff0c0', 0.8); sparks(c, nx - 8, ny + 5 + Math.min(2, hit) * 12, floor, 6, t, 4, -0.4, 0.7); }
      }
    }
    if (lv >= 3) {                                                      // 집게팔 — 맞출 때는 세운 토막을 잡아 내리고, 쉴 땐 천천히 흔든다
      const hx2 = armOn ? cutX + 8 : abx - 30 + Math.sin(t * 0.8) * 6, hy2 = armOn ? py - 50 + ease(Math.min(1, sk * 2.5)) * 10 : aby - 40 + Math.sin(t * 1.1) * 4;
      robotArm(c, abx, aby, hx2, hy2, lv >= 4 ? '#6ad8ff' : '#7aff9a');
    }
    /* 다듬기 — 대패가 쓸고 지나가며 대팻밥이 말려 나온다, 끝에 완성품이 떠오른다 */
    if (step === 3) {
      const pass = (sk * 2.2) % 1, plx = L0 + 10 + pass * (cutX - L0 - 30);
      if (sk < 0.6 && lv >= 4) {                                        // 광을 낸다 — 도는 천 바퀴가 지나가며 반짝인다
        c.save(); c.translate(plx + 14, py - 10); c.rotate(t * 20); c.fillStyle = '#d8d0c0'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
        c.strokeStyle = '#a89a80'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(9, 0); c.stroke(); } c.restore();
        for (let i = 0; i < 3; i++) glow(c, plx + (hash(Math.floor(t * 8) + i) * 40) - 20, py + 2, 6, '#ffffff', 0.7);
      } else if (sk < 0.6) {
        c.fillStyle = '#7a5230'; c.beginPath(); c.roundRect(plx, py - 14, 30, 14, 3); c.fill(); c.fillStyle = '#9a7040'; c.fillRect(plx, py - 14, 30, 3);
        c.fillStyle = '#4a3420'; c.beginPath(); c.arc(plx + 22, py - 18, 5, 0, TAU); c.fill();
        c.strokeStyle = '#f0d8a0'; c.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) { const q = (t * 1.6 + i / 4) % 1; c.globalAlpha = 1 - q; c.beginPath(); c.arc(plx - 2 - q * 18, py - 6 - q * 22, 3 + q * 3, 0, TAU * (0.6 + q * 0.3)); c.stroke(); }
        c.globalAlpha = 1;
      }
      const up = seg(sk, 0.45, 1), oy = py - 30 - ease(up) * 34;
      if (up > 0) {
        c.globalAlpha = up; glow(c, cx, oy + 18, 46, '#ffe8a0', 0.45 * up);
        c.save(); c.translate(cx, oy + 18); c.rotate(t * 0.6); c.fillStyle = 'rgba(255,240,190,.18)';
        for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(48, -5); c.lineTo(48, 5); c.fill(); }
        c.restore();
        drawIc(c, s.out, cx - 18, oy, 36); c.globalAlpha = 1;
      }
    }
  },

  /* ================= 용광로 ================= */
  sceneForge(c: C2, W: number, H: number, s: SceneArg) {
    const { step, sk, k, t, idle } = s, floor = H - 12, lv = s.lv || 1;
    const nm = s.names && s.idx !== undefined ? s.names[s.idx] : '';
    c.fillStyle = '#141012'; c.fillRect(0, 0, W, H);
    bricks(c, 0, 0, W, floor, '#2c2426', '#221b1d', 26, 11);
    c.fillStyle = '#1a1416'; c.fillRect(0, floor, W, H - floor); c.fillStyle = '#2a2224'; c.fillRect(0, floor, W, 2);
    /* 화로 — 돌 둥지 · 아가리 안의 불 · 위로 연통. 풀무가 바람을 넣으면 불이 노래진다 */
    const fx = 40, fw = 132, fy = floor - 74;
    const blow = idle ? 0.35 + 0.15 * Math.sin(t * 1.4) : step === 0 ? 0.5 + 0.5 * Math.abs(Math.sin(sk * Math.PI * 3)) : 0.7;
    c.fillStyle = '#3a3034'; c.beginPath(); c.moveTo(fx, floor); c.lineTo(fx, fy + 16); c.quadraticCurveTo(fx + fw / 2, fy - 22, fx + fw, fy + 16); c.lineTo(fx + fw, floor); c.fill();
    bricks(c, fx + 4, fy + 14, fw - 8, floor - fy - 14, '#4a3e42', '#3a3034', 18, 9);
    c.fillStyle = '#2a2224'; c.fillRect(fx + fw / 2 - 12, 0, 24, fy - 6);                                  // 연통
    c.fillStyle = '#3a3034'; c.fillRect(fx + fw / 2 - 16, fy - 10, 32, 8);
    const mx = fx + 26, my = fy + 26, mw = fw - 52, mh = 34;                                              // 아가리
    c.fillStyle = '#120a08'; c.beginPath(); c.roundRect(mx, my, mw, mh, [12, 12, 0, 0]); c.fill();
    const heat = idle ? 0.55 : clamp(0.55 + k * 1.2, 0, 1);
    c.save(); c.beginPath(); c.roundRect(mx, my, mw, mh, [12, 12, 0, 0]); c.clip();
    c.fillStyle = `rgba(255,${Math.round(90 + 90 * heat * blow)},30,${0.35 + 0.3 * heat})`; c.fillRect(mx, my + mh - 8, mw, 8);   // 잉걸
    for (let i = 0; i < 12; i++) { c.fillStyle = hash(i * 3) > 0.5 ? '#ff7a2a' : '#c84a18'; c.beginPath(); c.arc(mx + 5 + i * (mw - 10) / 11, my + mh - 4 + Math.sin(i) * 1.5, 3.5, 0, TAU); c.fill(); }
    flames(c, mx + 4, my + mh - 6, mw - 8, 0.6 + heat * blow, t);
    if (lv === 3) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(160,200,255,${0.18 + 0.12 * Math.sin(t * 40)})`; c.fillRect(mx, my, mw, mh); c.globalCompositeOperation = 'source-over'; }
    if (lv >= 4) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(90,220,255,${0.14 + 0.06 * Math.sin(t * 3)})`; c.fillRect(mx, my, mw, mh); c.globalCompositeOperation = 'source-over'; }
    c.restore();
    glow(c, mx + mw / 2, my + mh - 6, 70, lv === 3 ? '#bcd8ff' : lv >= 4 ? '#7adcff' : '#ff7a2a', 0.22 + 0.3 * heat * blow);
    if (lv === 2) {                                                                                        // 고로 — 쇠 띠를 두른 몸 · 위 장입구에 숯과 광석이 켜켜이
      c.fillStyle = '#4a4a52'; for (const yy of [fy + 26, fy + 52]) c.fillRect(fx + 2, yy, fw - 4, 4);
      c.fillStyle = '#5a5a62'; for (let x = fx + 8; x < fx + fw - 4; x += 14) for (const yy of [fy + 27, fy + 53]) c.fillRect(x, yy, 2, 2);
      for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#2a2420' : '#6a4a3a'; c.fillRect(fx + fw / 2 - 10, fy - 8 + i * 2 - 22, 20, 2); }
    }
    if (lv === 3) {                                                                                        // 아크 — 위에서 내려온 전극 셋 · 끝에서 튀는 번개
      const down = idle ? 0.3 : step === 0 ? ease(sk) : 1;
      for (let i = -1; i <= 1; i++) {
        const ex = mx + mw / 2 + i * 18, ey = my - 8 + down * 20;
        c.fillStyle = '#5a5e68'; c.fillRect(ex - 3, fy - 30, 6, ey - fy + 30); c.fillStyle = '#8a8e98'; c.fillRect(ex - 3, fy - 30, 2, ey - fy + 30);
        if (!idle && down > 0.9 && hash(Math.floor(t * 25) + i * 5) > 0.3) arc(c, ex, ey, ex + (hash(i + Math.floor(t * 25)) - 0.5) * 16, my + mh - 8, t + i);
      }
    }
    if (lv >= 4) {                                                                                         // 가압 제련로 — 리벳 박은 쇠 덮개 · 압력계(바늘이 오른다) · 김 빼기
      c.strokeStyle = '#6a6e78'; c.lineWidth = 5; c.beginPath(); c.moveTo(fx - 2, floor); c.lineTo(fx - 2, fy + 16); c.quadraticCurveTo(fx + fw / 2, fy - 26, fx + fw + 2, fy + 16); c.lineTo(fx + fw + 2, floor); c.stroke();
      c.fillStyle = '#a8acb4'; for (let i = 0; i < 9; i++) { const u = i / 8, x = lerp(fx, fx + fw, u), y = fy + 16 - Math.sin(u * Math.PI) * 18; c.fillRect(x - 1, y - 1, 2, 2); }
      const gx = fx + fw + 14, gy = fy + 6, pr = idle ? 0.3 + 0.05 * Math.sin(t) : step === 0 ? ease(sk) : 0.9 + 0.05 * Math.sin(t * 9);
      c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(gx, gy, 11, 0, TAU); c.fill(); c.fillStyle = '#e8e4d8'; c.beginPath(); c.arc(gx, gy, 9, 0, TAU); c.fill();
      c.fillStyle = '#d04a3a'; c.beginPath(); c.arc(gx, gy, 9, -0.6, 0.1); c.lineTo(gx, gy); c.fill();
      c.strokeStyle = '#1a1a1e'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx, gy); const ga = Math.PI * 0.8 + pr * Math.PI * 1.4; c.lineTo(gx + Math.cos(ga) * 8, gy + Math.sin(ga) * 8); c.stroke();
      if (pr > 0.85) puffs(c, fx + fw - 6, fy + 4, 3, t, 1.4, 22, '220,236,246', 0.5);
      glow(c, mx + mw / 2, floor - 4, 40, '#5ad8ff', 0.25 + 0.1 * Math.sin(t * 2));
    }
    for (let i = 0; i < 4; i++) {                                                                          // 열기 — 아가리 위가 일렁인다
      c.strokeStyle = `rgba(255,200,150,${0.05 + 0.04 * heat})`; c.lineWidth = 2; c.beginPath();
      for (let y = my - 2; y > fy - 30; y -= 3) c.lineTo(mx + 10 + i * (mw - 20) / 3 + Math.sin(y * 0.3 + t * 6 + i) * 2.5, y);
      c.stroke();
    }
    /* 풀무 — 화로 왼쪽에서 접혔다 펴진다 */
    if (lv <= 2) {
      const pump = nm === tr('풀무질한다') ? Math.abs(Math.sin(sk * Math.PI * 6)) : step === 0 && lv === 1 ? Math.abs(Math.sin(sk * Math.PI * 3)) : 0.3;
      const bw = 14 + 10 * (idle ? 0.5 + 0.5 * Math.sin(t * 1.4) : pump);
      c.fillStyle = '#6a4626'; c.beginPath(); c.moveTo(8, floor - 30); c.lineTo(8 + 34, floor - 30 - bw / 2); c.lineTo(8 + 34, floor - 30 + bw / 2); c.closePath(); c.fill();
      c.fillStyle = '#4a2e18'; c.beginPath(); c.moveTo(8, floor - 30); c.lineTo(8 + 34, floor - 30 + bw / 2); c.lineTo(8 + 34, floor - 30 + bw / 2 + 4); c.closePath(); c.fill();
      c.fillStyle = '#5a5a62'; c.fillRect(fx - 4, floor - 32, 8, 4);
      if (nm === tr('풀무질한다')) puffs(c, fx + 4, floor - 30, 3, t, 1.6, 12, '255,180,120', 0.4);
    } else {                                                                                               // 변압기 — 풀무 대신 전기
      c.fillStyle = '#2e3036'; c.fillRect(6, floor - 44, 30, 44); c.fillStyle = '#3e4048'; c.fillRect(6, floor - 44, 30, 4);
      for (let i = 0; i < 4; i++) { c.fillStyle = '#4a4e56'; c.fillRect(9, floor - 36 + i * 9, 24, 3); }
      c.fillStyle = hash(Math.floor(t * 3)) > 0.5 ? '#7aff9a' : '#2a5a3a'; c.fillRect(30, floor - 41, 3, 3);
      c.strokeStyle = '#1a1a1e'; c.lineWidth = 3; c.beginPath(); c.moveTo(36, floor - 30); c.quadraticCurveTo(fx - 4, floor - 8, fx + 6, floor - 30); c.stroke();
    }
    /* 담금질 통 · 틀 받침(오른쪽) */
    const qx = W - 74, qy = floor - 40;
    c.fillStyle = '#4a3420'; c.fillRect(qx, qy, 48, 40); c.fillStyle = '#5e4428'; for (let x = qx; x < qx + 48; x += 8) c.fillRect(x, qy, 7, 40);
    c.fillStyle = '#3a3a40'; c.fillRect(qx - 2, qy + 6, 52, 3); c.fillRect(qx - 2, qy + 28, 52, 3);
    c.fillStyle = '#2a4a5a'; c.fillRect(qx + 3, qy + 3, 42, 6); c.fillStyle = '#5a8aa0'; c.fillRect(qx + 3, qy + 3, 42, 1.5);
    const tx = fx + fw + 26, ty = floor - 22;                                                              // 틀 받침대
    c.fillStyle = '#2a2a30'; c.fillRect(tx, ty, 96, 22); c.fillStyle = '#3a3a42'; c.fillRect(tx, ty, 96, 3);
    c.fillStyle = '#4a4a52'; c.fillRect(tx + 8, ty - 10, 80, 10); c.fillStyle = '#18181c'; c.fillRect(tx + 14, ty - 8, 68, 6);  // 틀 구멍
    if (idle) {                                                                                           // 쉬는 동안 — 연통 연기 · 튀는 불티
      puffs(c, fx + fw / 2, 0 + 18, 4, t, 0.3, 16, '90,80,80', 0.35);
      sparks(c, mx + mw / 2, my + mh - 8, floor, 4, t, 0.8, 0, 0.6);
      return;
    }
    /* 도가니 — 아가리 안에서 광석을 받아 녹이고(0~1), 집게가 꺼내 기울여 붓는다(2) */
    const molt = step === 0 ? 0 : step === 1 ? ease(sk) : 1;
    let cxr = mx + mw / 2, cyr = my + mh - 14, tilt = 0;
    if (step === 2) {
      const lift = ease(seg(sk, 0, 0.3)), go = ease(seg(sk, 0.25, 0.5));
      cxr = lerp(cxr, tx + 30, go); cyr = lerp(cyr, ty - 40, lift); tilt = ease(seg(sk, 0.45, 0.65)) * 1.15;
    } else if (step === 3) { cxr = tx + 30; cyr = ty - 40; tilt = 1.15 * (1 - ease(seg(sk, 0, 0.25))); }
    const level = step === 2 ? 1 - seg(sk, 0.55, 1) : step === 3 ? 0 : 1;
    if (step >= 2) { c.strokeStyle = '#3a3a42'; c.lineWidth = 3; c.beginPath(); c.moveTo(cxr - 30, cyr - 34); c.lineTo(cxr - 12, cyr - 6); c.moveTo(cxr - 22, cyr - 40); c.lineTo(cxr - 6, cyr - 8); c.stroke(); }   // 집게
    c.save(); c.translate(cxr, cyr); c.rotate(tilt);
    c.fillStyle = '#2e2e34'; c.beginPath(); c.moveTo(-15, -12); c.lineTo(15, -12); c.lineTo(11, 12); c.lineTo(-11, 12); c.closePath(); c.fill();
    c.fillStyle = '#44444c'; c.fillRect(-16, -13, 32, 3);
    if (molt > 0 && level > 0) {
      const top = -10 + (1 - level * molt) * 20, col = hotCol(0.05 + (1 - molt) * 0.3, '#ff5a1a');
      c.fillStyle = col; c.fillRect(-12, top, 24, 21 - (top + 10)); c.fillStyle = '#fff0b0'; c.fillRect(-12, top, 24, 2);
      for (let i = 0; i < 3; i++) { const q = (t * 1.8 + i / 3) % 1; c.fillStyle = 'rgba(255,240,180,.8)'; c.beginPath(); c.arc(-8 + i * 8, top + 2, 1.5 + q * 1.5, Math.PI, TAU); c.fill(); }   // 끓는 거품
    }
    c.restore();
    if (molt > 0 && step <= 1) glow(c, cxr, cyr - 6, 26, '#ffb040', 0.5 * molt);
    if (nm === tr('쇠찌꺼기를 걷는다') || nm === tr('불순물을 걷는다')) {                                  // 갈퀴가 쇳물 위 찌꺼기를 걷어 낸다
      const u = sk, rx = cxr - 10 + u * 34;
      c.fillStyle = '#3a3030'; for (let i = 0; i < 6; i++) { const x = cxr - 10 + i * 4; if (x > rx - 4) c.fillRect(x, cyr - 8 + (i % 2), 3, 2); }
      c.strokeStyle = '#6a6e78'; c.lineWidth = 2; c.beginPath(); c.moveTo(rx, cyr - 9); c.lineTo(rx + 40, cyr - 46); c.stroke();
      c.fillStyle = '#6a6e78'; c.fillRect(rx - 3, cyr - 10, 6, 3);
      if (lv >= 4) glow(c, cxr, cyr - 8, 18, '#7ae0ff', 0.4);
    }
    /* 광석 — 위에서 도가니로 떨어지며 달아오르고 녹아든다 */
    if (step <= 1) s.mats.forEach((id, i) => {
      const st0 = i * 0.18, q = step === 0 && nm !== tr('풀무질한다') ? ease(seg(sk, st0, st0 + 0.6)) : 1;
      if (step === 1 && sk > 0.4 + i * 0.12) return;
      const x = lerp(mx - 70 + i * 22, cxr - 10, q), y = lerp(fy - 40, cyr - 26, q) - Math.sin(q * Math.PI) * 18;
      hotIcon(c, id, x, y, 20, step === 1 ? 0.5 + sk : q * 0.4);
    });
    /* 붓기 — 도가니 입에서 틀까지 쇳물 줄기, 틀이 차오른다, 튀는 불티 */
    const fill = step === 2 ? seg(sk, 0.55, 1) : step === 3 ? 1 : 0;
    if (step === 2 && sk > 0.55) {
      const lx = cxr + Math.cos(tilt) * 15, ly = cyr + Math.sin(tilt) * 15 - 10;
      c.strokeStyle = '#ffb040'; c.lineWidth = 4; c.beginPath(); c.moveTo(lx, ly); c.quadraticCurveTo(lx + 8, ly + 10, tx + 48, ty - 6); c.stroke();
      c.strokeStyle = '#fff0b0'; c.lineWidth = 1.5; c.stroke();
      glow(c, tx + 48, ty - 6, 26, '#ff9a2a', 0.6);
      sparks(c, tx + 48, ty - 6, floor, 10, t, 3, 0, 0.9);
    }
    if (fill > 0) {
      const cool = step === 3 ? ease(seg(sk, 0.1, 0.7)) : 0;
      c.fillStyle = hotCol(cool * 0.95 + 0.05, '#7a7e88'); c.fillRect(tx + 14, ty - 8 + 6 * (1 - fill), 68 * Math.min(1, fill * 1.6), 6 * fill);
      if (cool < 0.6) glow(c, tx + 48, ty - 5, 30, '#ff8a2a', 0.5 * (1 - cool) * fill);
    }
    /* 식힘 · 담금질 — 집게가 틀에서 꺼내 통에 담그면 김이 솟고, 완성품이 떠오른다 */
    if (step === 3) {
      const lift = ease(seg(sk, 0.45, 0.6)), dunk = ease(seg(sk, 0.6, 0.72)), rise = ease(seg(sk, 0.8, 1));
      if (sk > 0.45) {
        const ox = lerp(tx + 40, qx + 16, lift), oy = lerp(ty - 30, qy - 30, lift) + dunk * 26 * (1 - rise) - rise * 34;
        hotIcon(c, s.out, ox, oy, 28, Math.max(0, 0.7 - dunk * 0.9));
        if (dunk > 0) { puffs(c, qx + 24, qy, 6, t, 0.9, 40 + 20 * (1 - rise), '220,226,236', 0.75 * (1 - rise * 0.6)); }
        if (rise > 0) { glow(c, ox + 14, oy + 14, 40, '#ffe8a0', 0.4 * rise); }
      } else puffs(c, tx + 48, ty - 8, 3, t, 0.7, 20, '200,200,210', 0.5);
    }
    void FONT; void G;
  },

  /* ================= 대장간(용광로에서 무기 · 방어구 · 도구) ================= */
  /** 쇳물을 틀에 붓는 게 아니라 달구고(0) · 모루에서 두드리고(1) · 날을 세우거나 이어 맞추고(2) · 담금질한다(3) */
  sceneSmith(c: C2, W: number, H: number, s: SceneArg) {
    const { step, sk, t, idle } = s, floor = H - 12, ty = ITEMS[s.out] ? ITEMS[s.out].type : 'weapon', lv = s.lv || 1;
    const nm = s.names && s.idx !== undefined ? s.names[s.idx] : '';
    c.fillStyle = '#141012'; c.fillRect(0, 0, W, H);
    bricks(c, 0, 0, W, floor, '#2c2426', '#221b1d', 26, 11);
    c.fillStyle = '#1a1416'; c.fillRect(0, floor, W, H - floor); c.fillStyle = '#2a2224'; c.fillRect(0, floor, W, 2);
    /* 화덕 — 왼쪽, 숯 위에 쇠를 묻는다 */
    const fx = 14, fw = 92, fy = floor - 46, heatOn = idle ? 0.5 : step === 0 ? 0.6 + 0.4 * Math.abs(Math.sin(sk * Math.PI * 4)) : 0.45;
    c.fillStyle = '#3a3034'; c.fillRect(fx, fy, fw, floor - fy); bricks(c, fx + 3, fy + 10, fw - 6, floor - fy - 10, '#4a3e42', '#3a3034', 16, 8);
    c.fillStyle = '#2a2224'; c.fillRect(fx + fw / 2 - 10, 0, 20, fy - 16); c.fillStyle = '#3a3034'; c.beginPath(); c.moveTo(fx + 6, fy); c.lineTo(fx + fw / 2 - 12, fy - 18); c.lineTo(fx + fw / 2 + 12, fy - 18); c.lineTo(fx + fw - 6, fy); c.fill();
    c.fillStyle = '#120a08'; c.fillRect(fx + 10, fy + 2, fw - 20, 10);
    for (let i = 0; i < 9; i++) { c.fillStyle = hash(i * 5) > 0.5 ? '#ff7a2a' : '#c84a18'; c.beginPath(); c.arc(fx + 14 + i * (fw - 28) / 8, fy + 10, 3.5, 0, TAU); c.fill(); }
    flames(c, fx + 12, fy + 10, fw - 24, 0.35 + 0.5 * heatOn, t); glow(c, fx + fw / 2, fy + 6, 60, lv >= 4 ? '#7adcff' : lv === 3 ? '#cfe0ff' : '#ff7a2a', 0.2 + 0.3 * heatOn);
    if (lv <= 2) {
      const bw = 10 + 10 * (nm === tr('풀무질한다') ? Math.abs(Math.sin(sk * Math.PI * 6)) : step === 0 && !idle ? Math.abs(Math.sin(sk * Math.PI * 4)) : 0.4);          // 풀무
      c.fillStyle = '#6a4626'; c.beginPath(); c.moveTo(fx + fw + 4, fy + 22); c.lineTo(fx + fw + 34, fy + 22 - bw / 2); c.lineTo(fx + fw + 34, fy + 22 + bw / 2); c.closePath(); c.fill();
    } else { c.fillStyle = '#2e3036'; c.fillRect(fx + fw + 4, fy + 8, 22, 26); c.fillStyle = hash(Math.floor(t * 3)) > 0.5 ? '#7aff9a' : '#2a5a3a'; c.fillRect(fx + fw + 20, fy + 11, 3, 3); }
    /* 모루 — 가운데 · 뿔은 왼쪽 */
    const ax = W * 0.5, top = floor - 38;
    c.fillStyle = '#4a3420'; c.fillRect(ax - 16, top + 14, 32, floor - top - 14);                       // 나무 받침
    c.fillStyle = '#2e3038'; c.beginPath(); c.moveTo(ax - 44, top); c.lineTo(ax + 30, top); c.lineTo(ax + 30, top + 9); c.lineTo(ax + 14, top + 14); c.lineTo(ax - 14, top + 14); c.lineTo(ax - 24, top + 8); c.lineTo(ax - 44, top + 3); c.closePath(); c.fill();
    c.fillStyle = '#5a5e6a'; c.fillRect(ax - 40, top, 70, 2);
    /* 담금질 통 — 오른쪽 · 숫돌(날 세우기) */
    const qx = W - 64, qy = floor - 34;
    c.fillStyle = '#4a3420'; c.fillRect(qx, qy, 48, 34); c.fillStyle = '#5e4428'; for (let x = qx; x < qx + 48; x += 8) c.fillRect(x, qy, 7, 34);
    c.fillStyle = '#3a3a40'; c.fillRect(qx - 2, qy + 5, 52, 3); c.fillRect(qx - 2, qy + 24, 52, 3);
    c.fillStyle = '#2a4a5a'; c.fillRect(qx + 3, qy + 3, 42, 5); c.fillStyle = '#5a8aa0'; c.fillRect(qx + 3, qy + 3, 42, 1.5);
    const wx = ax + 72, wy = floor - 30, spin = step === 2 && !idle && ty !== 'armor' ? t * 14 : t * 0.4;   // 숫돌
    c.fillStyle = '#4a3420'; c.fillRect(wx - 3, wy, 6, floor - wy);
    c.save(); c.translate(wx, wy); c.rotate(spin); c.fillStyle = '#6a6a72'; c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fill();
    c.strokeStyle = '#4a4a52'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * TAU / 4) * 16, Math.sin(i * TAU / 4) * 16); c.stroke(); }
    c.fillStyle = '#3a3a42'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.restore();
    if (idle) { sparks(c, fx + fw / 2, fy + 8, floor, 4, t, 0.8, 0, 0.6); puffs(c, fx + fw / 2, 16, 3, t, 0.3, 14, '90,80,80', 0.3); return; }
    /* 쇠 — 재료(달군 덩이)가 두드릴수록 완성품 모양으로 바뀐다 */
    const mat = s.mats[0] || s.out, onAnvil: [number, number] = [ax - 18, top - 26], inFire: [number, number] = [fx + fw / 2 - 14, fy - 14];
    let x = onAnvil[0], y = onAnvil[1], heat = 0.5, form = 1, hamA = 0.9;
    const aHit = Math.PI - 0.12, hx = ax + 58, hy = top - 22;                                             // 망치 축
    if (step === 0) {
      const again = nm === tr('다시 달군다'), bellows = nm === tr('풀무질한다');
      const back = again ? ease(seg(sk, 0, 0.25)) : 1;                                                   // 두 번째 달굼이면 모루에서 화덕으로
      x = lerp(onAnvil[0], inFire[0], back); y = lerp(onAnvil[1], inFire[1], back) - Math.sin(back * Math.PI) * 16;
      const go = lv === 1 && !bellows && !again ? 0 : ease(seg(sk, 0.8, 1));                            // 풀무질이 이어지면 숯에 그대로 둔다
      x = lerp(x, onAnvil[0], go); y = lerp(y, onAnvil[1], go) - Math.sin(go * Math.PI) * 16;
      heat = Math.min(1, (bellows ? 0.6 : 0.2) + sk * 1.1); form = again ? 0.5 : 0;
      if (sk < 0.8) sparks(c, inFire[0] + 14, inFire[1] + 18, floor, 5, t, 1.4, 0, 0.7);
    } else if (step === 1) {                                                                              // 망치 셋 — 칠 때마다 불티 · 모양이 바뀐다
      const n = 3, b = Math.min(n - 1, Math.floor(sk * n)), u = sk * n - b;
      const sw = u < 0.6 ? ease(u / 0.6) * -0.15 : u < 0.75 ? -0.15 + 1.15 * ((u - 0.6) / 0.15) ** 2 : 1 - ease((u - 0.75) / 0.25) * 0.3;
      hamA = aHit + 1.35 * (1 - Math.max(0, sw));
      heat = 1 - sk * 0.5; form = (s.idx || 0) > 1 ? 0.5 + sk * 0.5 : sk * 0.5 + (b + (u > 0.75 ? 1 : 0)) / n * 0.2;
      if (u > 0.75 && u < 0.9) { sparks(c, ax - 6, top - 6, floor, 14, t * 3 + b, 3, 0, 0.8); glow(c, ax - 6, top - 10, 34, '#ffd080', 0.6); }
      y += u > 0.75 && u < 0.85 ? 2 : 0;
    } else if (step === 2) {
      form = 1; heat = 0.35;
      if (ty === 'armor') {                                                                               // 이어 맞춘다 — 작은 망치로 리벳
        const tap = (sk * 6) % 1; hamA = aHit + 0.5 * (tap < 0.5 ? tap * 2 : 2 - tap * 2);
        c.fillStyle = '#c8ccd4'; for (let i = 0; i < Math.floor(sk * 6); i++) c.fillRect(x + 6 + (i % 3) * 8, y + 8 + Math.floor(i / 3) * 10, 2, 2);
      } else {                                                                                            // 날을 세운다 — 숫돌에 대고 불티가 흐른다
        const m = ease(seg(sk, 0, 0.2)); x = lerp(onAnvil[0], wx - 34, m); y = lerp(onAnvil[1], wy - 22, m);
        if (sk > 0.2) { sparks(c, wx - 14, wy - 8, floor, 12, t * 2, 2.6, -0.5, 0.6); glow(c, wx - 14, wy - 8, 20, '#ffe0a0', 0.4); }
      }
    } else {                                                                                              // 담금질 — 통에 담그면 김 · 식어 빛나며 떠오른다
      const from: [number, number] = ty === 'armor' ? onAnvil : [wx - 34, wy - 22];
      const lift = ease(seg(sk, 0, 0.3)), dunk = ease(seg(sk, 0.3, 0.45)), rise = ease(seg(sk, 0.7, 1));
      x = lerp(from[0], qx + 10, lift); y = lerp(from[1], qy - 32, lift) - Math.sin(lift * Math.PI) * 20 + dunk * 26 * (1 - rise) - rise * 30;
      heat = 0.4 * (1 - dunk); form = 1;
      if (dunk > 0) puffs(c, qx + 24, qy, 6, t, 0.9, 36 + 20 * (1 - rise), '220,226,236', 0.75 * (1 - rise * 0.6));
      if (rise > 0) glow(c, x + 14, y + 14, 40, '#ffe8a0', 0.45 * rise);
    }
    const buried = step === 0 && Math.abs(y - inFire[1]) < 4;
    if (buried) { c.save(); c.beginPath(); c.rect(0, 0, W, fy + 6); c.clip(); }         // 숯에 묻힌 동안은 윗부분만
    heat = Math.min(0.7, heat);                                                                           // 더 달구면 흰 네모로 보인다 — 주황까지
    if (form < 1) { c.globalAlpha = 1 - form; hotIcon(c, mat, x, y, 28, heat); }
    if (form > 0) { c.globalAlpha = form; hotIcon(c, s.out, x, y, 28, heat); }
    c.globalAlpha = 1;
    if (buried) c.restore();
    if (lv >= 3) {                                                                                        // 기계 망치 — 모루 위 틀에서 피스톤 머리가 내리찍는다
      const ph = step === 1 ? (sk * 5) % 1 : 0.1 + 0.05 * Math.sin(t * 2), drop = ph < 0.7 ? ease(ph / 0.7) * 0.15 : 0.15 + (1 - 0.15) * ((ph - 0.7) / 0.3) ** 2;
      const hy2 = 8 + (top - 46) * (step === 1 ? (ph < 0.85 ? drop : 1 - (ph - 0.85) / 0.15) : 0.1);
      c.fillStyle = '#3a3e46'; c.fillRect(ax - 52, 6, 8, top - 6); c.fillRect(ax + 38, 6, 8, top - 6); c.fillRect(ax - 52, 4, 98, 8);
      c.fillStyle = '#6a6e78'; c.fillRect(ax - 6, 12, 8, hy2 - 4); c.fillStyle = '#4a4e56'; c.fillRect(ax - 20, hy2 + 8, 36, 18); c.fillStyle = '#8a8e98'; c.fillRect(ax - 20, hy2 + 8, 36, 3);
      if (step === 1 && ph > 0.85 && ph < 0.95) { sparks(c, ax - 6, top - 6, floor, 16, t * 3, 3.4, 0, 0.9); glow(c, ax - 6, top - 10, 40, '#ffe0a0', 0.7); }
    }
    if (!(lv >= 3 && step === 1)) hammer(c, hx, hy, step === 1 || (step === 2 && ty === 'armor') ? hamA : aHit + 1.6, step === 2 ? 30 : 48);
  },

  /* ================= 맨손 ================= */
  sceneHand(c: C2, W: number, H: number, s: SceneArg) {
    const { step, sk, t, idle } = s, floor = H - 14, cx = W / 2;
    const g = c.createRadialGradient(cx, floor - 20, 10, cx, floor - 20, W * 0.6); g.addColorStop(0, '#2e2a1c'); g.addColorStop(1, '#100e08');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 가죽 깔개
    c.fillStyle = '#4a3a2a'; c.beginPath(); c.ellipse(cx, floor - 8, W * 0.34, 12, 0, 0, TAU); c.fill();
    c.fillStyle = '#5e4a34'; c.beginPath(); c.ellipse(cx, floor - 10, W * 0.32, 9, 0, 0, TAU); c.fill();
    if (idle) return;                                                                                     // ★ 모닥불은 맨손 제작에 쓰이지 않아 뺐다(사용자)
    s.mats.forEach((id, i) => {
      const sx = cx - 80 + i * 44, m = step === 0 ? ease(sk) : 1, hop = step === 0 ? Math.abs(Math.sin(sk * Math.PI * 2 + i)) * 10 : 0;
      const x = lerp(sx, cx - 12 + (i - 1) * 6, m * 0.9), a = step === 2 ? 1 - sk : 1;
      c.globalAlpha = a; drawIc(c, id, x, floor - 40 - hop, 24); c.globalAlpha = 1;
    });
    if (step === 1) {                                                                                     // 끈이 감긴다
      c.strokeStyle = '#d8c090'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(cx, floor - 28, 22, 7, 0.3 * (i - 1) + t * 0.5, 0, TAU * ease(sk)); c.stroke(); }
    }
    if (step === 2) {
      glow(c, cx, floor - 30, 40, '#ffe8a0', 0.4 * sk); drawIc(c, s.out, cx - 18, floor - 52 - sk * 10, 36);
      c.fillStyle = '#fff6d0'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 3, d = 22 + sk * 12; c.fillRect(cx + Math.cos(a) * d, floor - 34 + Math.sin(a) * d * 0.6, 2, 2); }
    }
  },

  /* ================= 강화 모루 ================= */
  /** 모루 무대 캔버스 — 왼쪽 화덕 · 가운데 모루 · 오른쪽 기름 통. A = anvilAnim(가열 → 단조 셋 → 담금질 → 결말), 없으면 쉬는 모습 */
  anvilScene() {
    const cv = document.querySelector('#anvil-stage .as-cv') as HTMLCanvasElement | null;
    if (!cv || this.open !== 'anvil') { this._avRaf = 0; return; }
    const W = cv.clientWidth || 230, H = cv.clientHeight || 124, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const t = performance.now() / 1000, A = this.anvilAnim, floor = H - 8;
    c.fillStyle = '#120e0c'; c.fillRect(0, 0, W, H);
    bricks(c, 0, 0, W, floor, '#241c1a', '#1c1614', 20, 9);
    c.fillStyle = '#1a1412'; c.fillRect(0, floor, W, H - floor);
    /* 화덕 */
    const hx = 8, hw = 58, hy = floor - 30;
    c.fillStyle = '#3a3034'; c.fillRect(hx, hy, hw, 30); c.fillStyle = '#4a3e42'; c.fillRect(hx, hy, hw, 4);
    const ph = A ? (t - A.t0) * 1000 : -1, HEAT = A ? A.heat : 0, BEAT = A ? A.beat : 0, Q = A ? A.quench : 0;
    const heating = A && ph < HEAT, coalHot = heating ? 1 : 0.55;
    c.save(); c.beginPath(); c.rect(hx + 4, hy - 8, hw - 8, 12); c.clip();
    for (let i = 0; i < 9; i++) { c.fillStyle = hash(i * 5) > 0.5 ? '#ff7a2a' : '#c84a18'; c.beginPath(); c.arc(hx + 8 + i * 6, hy + 2 + Math.sin(i) * 1.5, 4, 0, TAU); c.fill(); }
    c.restore();
    flames(c, hx + 6, hy + 2, hw - 12, 0.5 + 0.5 * coalHot, t); glow(c, hx + hw / 2, hy, 46, '#ff7a2a', 0.25 + 0.3 * coalHot);
    /* 모루 — 뿔 · 얼굴 · 허리 · 밑동(나무 그루터기) */
    const ax = W / 2 + 6, ay = floor - 38;
    c.fillStyle = '#3a2614'; c.fillRect(ax - 16, floor - 18, 32, 18); c.fillStyle = '#4a321c'; c.fillRect(ax - 16, floor - 18, 32, 3);
    c.fillStyle = '#2c2c33'; c.beginPath();
    c.moveTo(ax - 30, ay); c.lineTo(ax + 26, ay); c.lineTo(ax + 22, ay + 7); c.lineTo(ax + 10, ay + 9); c.lineTo(ax + 13, ay + 20); c.lineTo(ax - 13, ay + 20); c.lineTo(ax - 10, ay + 9); c.lineTo(ax - 20, ay + 7);
    c.quadraticCurveTo(ax - 36, ay + 5, ax - 44, ay + 1); c.closePath(); c.fill();
    c.fillStyle = '#5b5b66'; c.fillRect(ax - 30, ay, 56, 3);
    /* 기름 통 */
    const ox = W - 44, oy = floor - 30;
    c.fillStyle = '#4a3420'; c.fillRect(ox, oy, 34, 30); c.fillStyle = '#3a3a40'; c.fillRect(ox - 1, oy + 5, 36, 2); c.fillRect(ox - 1, oy + 20, 36, 2);
    c.fillStyle = '#2a2018'; c.fillRect(ox + 2, oy + 2, 30, 4);
    const id = A ? A.id : this.anvilItem;
    if (!A) {                                                                                             // 쉬는 동안 — 고른 장비가 모루 위에
      if (id) { drawIc(c, id, ax - 14, ay - 26, 28); hammer(c, ax + 50, ay - 30, -2.4, 30); }
      sparks(c, hx + hw / 2, hy, floor, 3, t, 0.7, 0, 0.5);
      this._avRaf = requestAnimationFrame(() => this.anvilScene());
      return;
    }
    /* 가열 → 단조(망치 셋) → 담금질 → 결말 */
    const strikeT = (ph - HEAT) / BEAT, quenchT = (ph - HEAT - 3 * BEAT) / Q, endT = (ph - HEAT - 3 * BEAT - Q) / 900;
    if (ph < HEAT) {
      const u = ph / HEAT, mv = ease(seg(u, 0, 0.25));
      hotIcon(c, id, lerp(ax - 14, hx + hw / 2 - 14, mv), lerp(ay - 26, hy - 20, mv), 28, seg(u, 0.25, 1));
      sparks(c, hx + hw / 2, hy, floor, 8, t, 2.2, 0, 0.8);
    } else if (strikeT < 3) {
      const n = Math.floor(strikeT), q = strikeT - n, heat = 1 - strikeT / 4;
      const mv = n === 0 ? ease(seg(q, 0, 0.3)) : 1;
      const squash = q > 0.55 && q < 0.75 ? 0.82 : 1;
      c.save(); c.translate(lerp(hx + hw / 2, ax, mv), lerp(hy - 6, ay - 12, mv)); c.scale(1 / squash * 0.98 + 0.02, squash);
      hotIcon(c, id, -14, -14, 28, heat); c.restore();
      /* 망치 — 축은 모루 오른쪽, π 가 왼쪽(모루 얼굴). 들어 올렸다(π+1.1) 내리친다(π) */
      const a = q < 0.4 ? Math.PI + 1.1 : q < 0.55 ? Math.PI + 1.1 - ease((q - 0.4) / 0.15) * 1.1 : Math.PI + ease((q - 0.55) / 0.45) * 1.1;
      hammer(c, ax + 46, ay - 10, a, 40);
      if (q > 0.5 && q < 0.85) { const k2 = (q - 0.5) / 0.35; glow(c, ax, ay - 6, 30, '#fff0c0', 0.8 * (1 - k2)); sparks(c, ax, ay - 6, floor, 14, t, 3, 0, 1.2); }
    } else if (quenchT < 1) {
      const mv = ease(seg(quenchT, 0, 0.35)), dip = ease(seg(quenchT, 0.3, 0.5));
      hotIcon(c, id, lerp(ax - 14, ox + 3, mv), lerp(ay - 26, oy - 26, mv) + dip * 20, 28, Math.max(0, 0.35 - dip));
      if (dip > 0) { puffs(c, ox + 17, oy, 6, t, 1.1, 40, '220,226,236', 0.8); flames(c, ox + 4, oy + 2, 26, 0.5 * (1 - quenchT), t); }
    } else if (endT < 1.6) {
      const res = A.res, u = Math.min(1, endT);
      if (res === 'ok') {
        const y = ay - 26 - ease(u) * 14; glow(c, ax, y + 14, 46, '#ffe08a', 0.5 * (1 - u * 0.5));
        c.save(); c.translate(ax, y + 14); c.rotate(t); c.fillStyle = 'rgba(255,230,150,.2)'; for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(0, 0); c.lineTo(44, -4); c.lineTo(44, 4); c.fill(); } c.restore();
        drawIc(c, id, ax - 14, y, 28);
      } else if (res === 'fail') {
        drawIc(c, id, ax - 14 + Math.sin(endT * 60) * 2 * (1 - u), ay - 26, 28);
        puffs(c, ax, ay - 20, 4, t, 0.8, 26, '120,120,128', 0.6);
      } else {
        const sp = ease(u) * 22;                                                                          // 부서짐 — 두 쪽으로 갈라져 튄다
        for (const d of [-1, 1]) {
          c.save(); c.beginPath(); if (d < 0) c.rect(0, 0, ax, H); else c.rect(ax, 0, W, H); c.clip();
          c.translate(d * sp, -Math.sin(u * Math.PI) * 10 + u * 8); c.rotate(d * u * 0.5);
          drawIc(c, id, ax - 14, ay - 26, 28); c.restore();
        }
        glow(c, ax, ay - 12, 30, '#e0564c', 0.6 * (1 - u)); sparks(c, ax, ay - 12, floor, 12, t, 2, 0, 1);
      }
    } else { this.anvilAnim = null; }
    this._avRaf = requestAnimationFrame(() => this.anvilScene());
  },
  /** 움직임 줄이기만 막는다 — 화질 절약(폰)에서도 공정은 보인다(만드는 과정이 곧 손맛) */
  reducedMotion() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } },
  anvilSceneStart() { if (!this._avRaf) this._avRaf = requestAnimationFrame(() => this.anvilScene()); }
};
mixin(UI, CraftSceneUIPart);
