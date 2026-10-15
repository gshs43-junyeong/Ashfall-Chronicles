/* ===== ui/mach-view.js — 기계 창 맨 위 가동 화면 — 투입 통 → 컨베이어 → 들여다보는 창(속 공정) → 컨베이어 → 산출 상자 ===== */
/* 점이 흐르는 줄만으로는 무엇이 들어가 무엇이 나오는지 읽히지 않았다(사용자). 실제 재료 그림이 벨트를 타고 들어가고,
   기계 속(녹이고 · 누르고 · 갈고 · 끓이고 · 맞추고 · 캐고 · 태우고 · 채우는 모습)이 진행도에 맞춰 바뀌고, 완성품이 나와 상자에 쌓인다.
   진행도는 공장 틱(0.125초)마다 뛰므로 그 사이를 이어 그린다(_mvP). 사연: docs/code-history.md#h187 */
import { app as G } from '../ctx.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { TILE_DEF } from '../data.js';
import { ITEMS } from '../data/items.js';
import { FUEL, MACHINE, MRECIPES } from '../data/recipes.js';
import { TileArt } from '../tileart.js';
import { FAC_TICK, Factory } from '../factory.js';
import { UI } from '../ui.js';
import { drawIc, glow, machSteps, stepRow } from './process.js';

type C2 = CanvasRenderingContext2D;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (k: number) => k * k * (3 - 2 * k);
/** 공정 구간 — 들어감 0~IN · 속 IN~OUT · 나옴 OUT~1 */
const IN = 0.16, OUT = 0.86;

/** 컨베이어 — 굴대 둘 · 띠 · 띠 마디(돌면 흐른다) */
function belt(c: C2, x0: number, x1: number, y: number, run: boolean, t: number) {
  if (x1 - x0 < 8) return;
  const ph = run ? (t * 26) % 8 : 0;
  c.fillStyle = '#2a2620'; c.fillRect(x0, y, x1 - x0, 6);
  c.fillStyle = '#3c362c'; c.fillRect(x0, y, x1 - x0, 2);
  c.fillStyle = '#1a1712';
  for (let x = x0 + ph; x < x1 - 1; x += 8) c.fillRect(x, y, 1.5, 6);
  for (const rx of [x0 + 3, x1 - 3]) {
    c.fillStyle = '#4a4438'; c.beginPath(); c.arc(rx, y + 3, 3.6, 0, TAU); c.fill();
    c.strokeStyle = '#8a8070'; c.lineWidth = 1; c.beginPath();
    const a = run ? t * 7 : 0; c.moveTo(rx + Math.cos(a) * 3, y + 3 + Math.sin(a) * 3); c.lineTo(rx - Math.cos(a) * 3, y + 3 - Math.sin(a) * 3); c.stroke();
  }
  c.fillStyle = '#16140e'; for (let x = x0 + 10; x < x1 - 6; x += 22) c.fillRect(x, y + 6, 2, 10);   // 다리
}
/** 투입 통(깔때기) — 위가 넓고 아래로 벨트에 흘린다 */
function hopper(c: C2, x: number, y: number, w: number, h: number) {
  c.fillStyle = '#3a3a40'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w * 0.66, y + h); c.lineTo(x + w * 0.34, y + h); c.closePath(); c.fill();
  c.fillStyle = '#56565e'; c.fillRect(x - 2, y - 3, w + 4, 4);
  c.fillStyle = '#2a2a2e'; c.fillRect(x + w * 0.38, y + h, w * 0.24, 6);
  c.strokeStyle = '#6e6e78'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 4, y + 4); c.lineTo(x + w * 0.4, y + h - 2); c.stroke();
}
/** 산출 상자 — 판자 */
function crate(c: C2, x: number, y: number, w: number, h: number) {
  c.fillStyle = '#5a3e22'; c.fillRect(x, y, w, h);
  c.fillStyle = '#7a5630'; for (let yy = y + 2; yy < y + h; yy += 7) c.fillRect(x + 1, yy, w - 2, 4);
  c.fillStyle = '#3a2814'; c.fillRect(x, y, 2, h); c.fillRect(x + w - 2, y, 2, h);
}
/** 쌓인 물건 — 그림 몇 장을 겹쳐 쌓고 수를 붙인다 */
function pile(c: C2, id: string, n: number, x: number, y: number, s: number) {
  const k = Math.min(3, Math.max(1, Math.ceil(n / 8)));
  for (let i = 0; i < k; i++) drawIc(c, id, x + (i % 2) * 6 - 3, y - i * 5, s);
  c.fillStyle = '#e8dcc0'; c.font = `700 10px ${FONT || 'sans-serif'}`; c.textAlign = 'right'; c.fillText(String(n), x + s + 4, y + s);
}
/** 들여다보는 창 — 쇠테 · 리벳 · 유리 반사. 안쪽은 fn 이 그린다(잘라서) */
function windowFrame(c: C2, x: number, y: number, w: number, h: number, fn: () => void) {
  c.fillStyle = '#0c0b09'; c.fillRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); fn(); c.restore();
  c.strokeStyle = '#6a6458'; c.lineWidth = 3; c.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  c.fillStyle = '#9a9080'; for (const [rx, ry] of [[x - 1, y - 1], [x + w - 1, y - 1], [x - 1, y + h - 1], [x + w - 1, y + h - 1]]) c.fillRect(rx - 1, ry - 1, 3, 3);
  c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.35, y); c.lineTo(x, y + h * 0.6); c.fill();
}
/** 진행 계기판 — 반원 눈금과 바늘 */
function gauge(c: C2, x: number, y: number, k: number, col: string) {
  c.fillStyle = '#1a1814'; c.beginPath(); c.arc(x, y, 11, Math.PI, 0); c.fill();
  c.strokeStyle = '#6a6458'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 11, Math.PI, 0); c.stroke();
  for (let i = 0; i <= 4; i++) { const a = Math.PI + i / 4 * Math.PI; c.beginPath(); c.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); c.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); c.stroke(); }
  const a = Math.PI + clamp(k, 0, 1) * Math.PI;
  c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); c.stroke();
}
/** 불꽃 몇 갈래 */
function flames(c: C2, x: number, y: number, w: number, k: number, t: number) {
  if (k <= 0) return;
  for (let i = 0; i < 5; i++) {
    const fx = x + w * (i + 0.5) / 5, h = (8 + 6 * Math.sin(t * 13 + i * 2.1)) * k;
    c.fillStyle = '#ff7a2a'; c.beginPath(); c.moveTo(fx - 4, y); c.quadraticCurveTo(fx, y - h * 1.3, fx + 4, y); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(fx - 2, y); c.quadraticCurveTo(fx, y - h * 0.7, fx + 2, y); c.fill();
  }
  glow(c, x + w / 2, y - 4, w * 0.6, '#ff8a3a', 0.25 * k);
}
/** 광석 · 재료 색 — 그림 대신 녹는 덩어리 · 쇳물에 쓴다 */
function matCol(id: string | null): string {
  if (!id) return '#8a8070';
  if (/copper/.test(id)) return '#c87a3a'; if (/gold/.test(id)) return '#e8c050'; if (/iron|steel/.test(id)) return '#9aa0aa';
  if (/mythril/.test(id)) return '#5fd0c0'; if (/lead/.test(id)) return '#6a7080'; if (/glacium/.test(id)) return '#a8e0ff';
  if (/oil|crude/.test(id)) return '#2a2420'; if (/sand|salt/.test(id)) return '#e0d6b8';
  return '#a89878';
}

/** 기계 갈래 — 속 그림 고르기 */
function kindOf(t: string) {
  if (t === 'drill' || t === 'drill_e' || t === 'drill_x') return 'drill';
  if (t === 'battery' || t === 'battery_hi') return 'battery';
  return t;
}

export const MachViewPart: Bag = {
  machViewDraw() {
    const m = this.machRef, cv = document.getElementById('mach-view') as HTMLCanvasElement | null;
    if (!m || !cv) return;
    const s = MACHINE[m.t], steps = machSteps(m.t), kind = kindOf(m.t);
    const W = cv.clientWidth || 360, H = steps ? 184 : 158, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
    const c = cv.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    c.imageSmoothingEnabled = false;
    const t = G.time, run = !!(m.on && m.act && !m.broke);

    /* ---- 진행도 — 틱 사이를 이어 그린다 ---- */
    const r = m.rec >= 0 ? MRECIPES[m.rec] : null;
    let target = -1, dur = 1;
    if (r) { target = clamp(m.prog / r.t, 0, 1); dur = r.t * FAC_TICK; }
    else if (s.cycle) { target = clamp(1 - (m.cd || 0) / s.cycle, 0, 1); dur = s.cycle * FAC_TICK; }
    const mv = this._mvP && this._mvP.m === m ? this._mvP : (this._mvP = { m, p: target < 0 ? 0 : target, at: t });
    const dt = Math.min(0.1, t - mv.at); mv.at = t;
    if (target < 0) mv.p = run ? (mv.p + dt / 2.4) % 1 : mv.p;                               // 진행도가 없는 기계(발전 · 바람개비)
    else if (target < mv.p - 0.3) mv.p = target;                                              // 새 공정
    else if (run) mv.p = Math.min(target + 1 / Math.max(1, dur / FAC_TICK), mv.p + dt / Math.max(0.2, dur), 1);
    else mv.p = target;
    const p = mv.p;

    /* ---- 자리 — 가운데는 기계의 속을 들여다보는 몸체(겉판 · 들고 나는 구멍), 실제 기계 그림은 위에 이름판처럼 ---- */
    const fy = 132;                                                     // 바닥
    const by = fy - 20;                                                 // 벨트 윗면
    const binW = 46, lx0 = 10 + binW, rx1 = W - 10 - binW;
    const hw = Math.min(W * 0.44, 200), hh = 84, hx = W / 2 - hw / 2, hy = fy - hh;   // 몸체
    c.fillStyle = '#16140e'; c.fillRect(0, fy, W, 4);
    /* ---- 무엇이 들고 나나 ---- */
    const ins = m.in ? Object.keys(m.in).filter(k => m.in[k] > 0) : [];
    const outs = m.out ? Object.keys(m.out).filter(k => m.out[k] > 0) : [];
    let inId: string | null = r ? Object.keys(r.in)[0] : ins[0] || null;
    let outId: string | null = r ? Object.keys(r.out)[0] : outs[0] || null;
    if (s.fuelIn && !r) inId = ins.find(k => FUEL[k]) || inId;
    if (kind === 'drill' && m.tgt) { const d = TILE_DEF[G.world.get(m.tgt[0], m.tgt[1])]; if (d && d.drop && ITEMS[d.drop]) outId = d.drop; }
    if (kind === 'pump') outId = outId || 'crude_oil';
    const hasBeltIn = kind !== 'drill' && kind !== 'pump' && kind !== 'windmill';
    const elecOut = !!s.gen || kind === 'windmill';
    const hasBeltOut = !elecOut && kind !== 'turret' && kind !== 'sprinkler';

    /* ---- 왼쪽: 투입 통 + 벨트 ---- */
    if (hasBeltIn) {
      hopper(c, 10, by - 52, binW, 40);
      ins.slice(0, 3).forEach((id, i) => pile(c, id, m.in[id], 14 + i * 12 - (ins.length > 1 ? 6 : 0), by - 50 + i * 3, 16));
      belt(c, lx0 - 8, hx + 2, by, run, t);
      // 실제 재료가 벨트를 타고 입구로 — 들어가는 구간 동안만 움직이고, 기다리는 하나는 통 아래에
      if (inId && run && p < IN) { const k = ease(p / IN); drawIc(c, inId, lerp(lx0 - 4, hx - 8, k), by - 15, 16); }
      else if (inId && (ins.length || r)) drawIc(c, inId, lx0 - 4, by - 15, 16);
    } else if (kind === 'drill' && outId) {                             // 드릴 — 왼쪽엔 캐는 광맥(실제 광석)
      c.fillStyle = '#3a2c20'; c.fillRect(10, by - 30, binW, 50); c.fillStyle = '#4a3828'; for (let i = 0; i < 5; i++) c.fillRect(10, by - 30 + i * 10, binW, 4);
      drawIc(c, outId, 10 + binW / 2 - 10, by - 22, 20);
      c.strokeStyle = '#6a5a48'; c.setLineDash([3, 3]); c.lineDashOffset = -t * 20; c.beginPath(); c.moveTo(10 + binW, by - 12); c.lineTo(hx, by - 12); c.stroke(); c.setLineDash([]);
    }
    /* ---- 가운데: 몸체 + 속 ---- */
    const shake = run ? (Factory.SHAKE[m.t] || 0) * Math.sin(t * 60) * 0.5 : 0;
    c.save(); c.translate(shake, 0);
    c.fillStyle = '#3a3a40'; c.fillRect(hx, hy, hw, hh);                 // 겉판
    c.fillStyle = '#4a4a52'; c.fillRect(hx, hy, hw, 4); c.fillStyle = '#26262a'; c.fillRect(hx, hy + hh - 4, hw, 4);
    c.fillStyle = '#8a8478'; for (let i = 0; i < 6; i++) { c.fillRect(hx + 3 + i * (hw - 8) / 5, hy + 6, 2, 2); c.fillRect(hx + 3 + i * (hw - 8) / 5, hy + hh - 8, 2, 2); }
    if (hasBeltIn) { c.fillStyle = '#0c0b09'; c.fillRect(hx - 2, by - 18, 8, 22); }   // 들어가는 구멍
    if (hasBeltOut) { c.fillStyle = '#0c0b09'; c.fillRect(hx + hw - 6, by - 18, 8, 22); }
    const ww = hw - 26, wh = hh - 22, wx = hx + 13, wy = hy + 12;
    const q = clamp((p - IN) / (OUT - IN), 0, 1);                       // 속 공정 몫
    windowFrame(c, wx, wy, ww, wh, () => {
      // 속은 높이 40 판에 그려 창에 맞게 키운다 — 창이 넓어도 그림이 휑하지 않게
      const VH = 40, k = wh / VH, VW = ww / k;
      c.fillStyle = '#16151a'; c.fillRect(wx, wy, ww, wh);
      c.fillStyle = '#1e1d22'; for (let xx = wx + 6; xx < wx + ww; xx += 24) c.fillRect(xx, wy, 1, wh);   // 안벽 판 이음
      c.translate(wx + (ww - VW * k) / 2, wy + (wh - VH * k) / 2); c.scale(k, k);
      this.mvInside(c, kind, m, s, 0, 0, VW, VH, q, p, run, t, inId, outId);
    });
    if (run) glow(c, W / 2, wy + wh / 2, ww * 0.6, '#ffd27a', 0.06);
    c.restore();
    // 이름판 — 실제 기계 그림(작게)
    { const big = Factory.isBig(m), MW = (m.w || 1) * 22, MH = (m.h || 1) * 22, sc = Math.min(1.6, 40 / MH, 56 / MW);
      const px = hx + hw - MW * sc - 4, py = hy - MH * sc + 6;
      c.save(); c.translate(px, py); c.scale(sc, sc);
      if (big) Factory.drawBig(c, m, 0, (m.h - 1) * 22, t, run); else TileArt.draw(c, s.tile, 0, 0, 0);
      c.restore(); }
    /* ---- 오른쪽: 벨트 + 산출 상자 / 전선 ---- */
    if (hasBeltOut) {
      belt(c, hx + hw - 2, rx1 + 8, by, run, t);
      crate(c, rx1 + 2, by - 22, binW, 30);
      if (outId && run && p > OUT) { const k = ease((p - OUT) / (1 - OUT)); drawIc(c, outId, lerp(hx + hw - 6, rx1 - 2, k), by - 15, 16); }
      outs.slice(0, 2).forEach((id, i) => pile(c, id, m.out[id], rx1 + 8 + i * 14, by - 40 + i * 2, 18));
      if (!outs.length && outId) { c.globalAlpha = 0.35; drawIc(c, outId, rx1 + 14, by - 40, 18); c.globalAlpha = 1; }
    } else if (elecOut || s.power) {
      // 전선 — 전기가 흐르면 불꽃이 따라간다(발전기는 밖으로, 쓰는 기계는 안으로)
      const cy0 = hy + 22, x0 = elecOut ? hx + hw : W - 12, x1 = elecOut ? W - 30 : hx + hw;
      c.strokeStyle = '#2a2a2e'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, cy0); c.lineTo(x1, cy0); c.stroke();
      if (run) { c.fillStyle = '#ffe08a'; for (let i = 0; i < 4; i++) { const k = (t * 1.4 + i / 4) % 1; c.fillRect(lerp(x0, x1, k) - 2, cy0 - 2, 4, 4); } }
      if (elecOut) { c.fillStyle = run ? '#ffe08a' : '#5a5440'; c.beginPath(); c.moveTo(W - 18, cy0 - 14); c.lineTo(W - 28, cy0 + 2); c.lineTo(W - 20, cy0 + 2); c.lineTo(W - 24, cy0 + 16); c.lineTo(W - 12, cy0 - 4); c.lineTo(W - 20, cy0 - 4); c.fill(); }
    }
    // 쓰는 기계의 전선(가공 기계 · 전동 드릴) — 위에서 내려온다
    if (s.power && !elecOut) {
      const sat = Factory.sat(G.world, m) > 0;
      c.strokeStyle = '#2a2a2e'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(hx + hw * 0.3, 0); c.lineTo(hx + hw * 0.3, hy); c.stroke();
      if (sat && run) { c.fillStyle = '#ffe08a'; for (let i = 0; i < 3; i++) { const k = (t * 1.6 + i / 3) % 1; c.fillRect(hx + hw * 0.3 - 1.5, lerp(0, hy, k), 3, 3); } }
    }

    /* ---- 상태 등 · 계기판 · 연료 ---- */
    const lamp = run ? '#5ad06a' : m.broke || !m.on ? '#e05040' : '#e8b040';
    c.fillStyle = lamp; c.beginPath(); c.arc(hx + 6, hy - 10, 4, 0, TAU); c.fill();
    glow(c, hx + 6, hy - 10, 14, lamp, run ? 0.5 + 0.3 * Math.sin(t * 6) : 0.35);
    c.fillStyle = '#d8cfb4'; c.font = `11px ${FONT || 'sans-serif'}`; c.textAlign = 'left';
    if (m.st) c.fillText(tr(m.st, { n: m.net }), hx + 14, hy - 6, hw - 70);
    if (target >= 0) gauge(c, hx - 16, hy + 16, p, run ? '#ffd27a' : '#8a8070');
    if (s.fuelIn) {
      const fk = m.fmax ? clamp(m.fuel / m.fmax, 0, 1) : 0;
      c.fillStyle = '#1a1814'; c.fillRect(hx + 4, hy + 14, 5, hh - 28);
      c.fillStyle = fk > 0.25 ? '#ff9a3a' : '#c84a2a'; c.fillRect(hx + 5, hy + 15 + (hh - 30) * (1 - fk), 3, (hh - 30) * fk);
    }
    if (steps) {
      let cur = -1, kk = -1;
      if (target >= 0 && m.on) { const pp = clamp(p, 0, 0.999); cur = Math.floor(pp * steps.length); kk = pp * steps.length - cur; }
      else if (run) { const pp = (t * 0.6) % 1; cur = Math.floor(pp * steps.length); kk = pp * steps.length - cur; }
      stepRow(c, steps, cur, kk, 6, H - 26, W - 12);
    }
  },

  /** 창 안 — 기계마다 속에서 일어나는 일. q = 속 공정 몫(0~1), p = 전체 진행 */
  mvInside(c: C2, kind: string, m: Bag, s: Bag, x: number, y: number, w: number, h: number, q: number, p: number, run: boolean, t: number, inId: string | null, outId: string | null) {
    const cx = x + w / 2, bot = y + h;
    const busy = run && p >= IN && p <= OUT;
    switch (kind) {
      case 'smelter': {                                                  // 불 → 도가니에서 녹고 → 기울어 붓고 → 틀에서 식는다
        flames(c, x + 4, bot - 2, w * 0.5, run ? 1 : 0.2, t);
        const tilt = q > 0.55 ? Math.min(1, (q - 0.55) / 0.15) * (q < 0.8 ? 1 : 1 - (q - 0.8) / 0.2) : 0;
        c.save(); c.translate(x + w * 0.3, bot - 18); c.rotate(tilt * 0.9);
        c.fillStyle = '#4a4440'; c.beginPath(); c.moveTo(-11, -12); c.lineTo(11, -12); c.lineTo(8, 4); c.lineTo(-8, 4); c.closePath(); c.fill();
        const melt = clamp(q / 0.55, 0, 1), fill = p < IN ? 0 : q < 0.8 ? 1 - Math.max(0, (q - 0.6) / 0.2) * 0.9 : 0.1;
        if (p >= IN) {
          if (melt < 1) for (let i = 0; i < 3; i++) { const r = 3.4 * (1 - melt * 0.8); c.fillStyle = matCol(inId); c.fillRect(-7 + i * 5, -9 + (1 - r / 3.4) * 4, r * 1.6, r * 1.6); }
          c.fillStyle = melt > 0.3 ? '#ff8a2a' : matCol(inId); c.fillRect(-9, 2 - 12 * fill * melt, 18, 12 * fill * melt);
        }
        c.restore();
        if (tilt > 0.2) { c.strokeStyle = '#ff9a3a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + w * 0.42, bot - 26); c.quadraticCurveTo(x + w * 0.55, bot - 24, x + w * 0.62, bot - 10); c.stroke(); glow(c, x + w * 0.6, bot - 12, 14, '#ff8a2a', 0.4); }
        // 틀 — 붓는 동안 차고, 그 뒤로 붉은빛이 식는다
        const mold = clamp((q - 0.6) / 0.2, 0, 1), cool = clamp((q - 0.8) / 0.2, 0, 1);
        c.fillStyle = '#2a2622'; c.fillRect(x + w * 0.56, bot - 10, w * 0.36, 8);
        if (mold > 0) { c.fillStyle = cool > 0 ? matCol(outId) : '#ff8a2a'; c.globalAlpha = 1; c.fillRect(x + w * 0.58, bot - 8, w * 0.32 * mold, 4); if (cool < 1) { c.fillStyle = `rgba(255,120,40,${(1 - cool) * 0.8})`; c.fillRect(x + w * 0.58, bot - 8, w * 0.32 * mold, 4); } }
        break;
      }
      case 'oven': {                                                     // 불 위 쟁반 — 재료가 익어 가며 짙어지고 김이 오른다
        flames(c, x + 6, bot - 2, w - 12, run ? 1 : 0.2, t);
        c.fillStyle = '#5a5048'; c.fillRect(x + 8, bot - 20, w - 16, 3);
        if (inId && p >= IN) { drawIc(c, q < 0.9 ? inId : outId || inId, cx - 9, bot - 37, 18); c.fillStyle = `rgba(60,30,10,${q * 0.35})`; c.fillRect(cx - 9, bot - 37, 18, 18); }
        if (busy) for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; c.fillStyle = `rgba(220,220,220,${0.5 * (1 - k)})`; c.beginPath(); c.arc(cx - 6 + i * 6 + Math.sin(t * 3 + i) * 2, bot - 38 - k * 14, 2 + k * 3, 0, TAU); c.fill(); }
        break;
      }
      case 'press': case 'pressor': {                                   // 램이 내려와 재료를 눌러 납작하게 — 압력계 바늘
        const down = q < 0.5 ? ease(q / 0.5) : q < 0.7 ? 1 : 1 - ease((q - 0.7) / 0.3);
        const ramY = lerp(y + 4, bot - 22, down);
        c.fillStyle = '#5a5e66'; c.fillRect(cx - 3, y, 6, ramY - y); c.fillStyle = '#8a8e96'; c.fillRect(cx - 16, ramY, 32, 6);
        c.fillStyle = '#3a3a40'; c.fillRect(cx - 18, bot - 8, 36, 8);
        if (inId && p >= IN) { const sq = q < 0.5 ? 1 : 0.5; const ih = 14 * (down > 0.9 ? sq : 1); drawIc(c, q > 0.7 && outId ? outId : inId, cx - 8, bot - 8 - ih, 16); }
        if (busy && down > 0.95) for (let i = 0; i < 4; i++) { c.fillStyle = '#ffe08a'; c.fillRect(cx + (i % 2 ? 1 : -1) * (18 + Math.random() * 6), bot - 12 - Math.random() * 6, 2, 2); }
        if (kind === 'pressor') gauge(c, x + w - 13, y + 14, down, '#e05040');
        break;
      }
      case 'mill': {                                                     // 낟알이 떨어지고 맷돌이 돌고 가루가 쌓인다
        c.save(); c.translate(cx, y + h * 0.48); c.rotate(run ? t * 2.2 : 0);
        c.fillStyle = '#8a8478'; c.beginPath(); c.arc(0, 0, h * 0.28, 0, TAU); c.fill();
        c.strokeStyle = '#5a5448'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * h * 0.28, Math.sin(a) * h * 0.28); c.stroke(); }
        c.restore();
        if (busy) for (let i = 0; i < 4; i++) { const k = (t * 1.5 + i / 4) % 1; c.fillStyle = '#d8b860'; c.fillRect(cx - 2 + (i % 2) * 3, y + k * h * 0.2, 2, 3); }
        c.fillStyle = '#e8e0cc'; const ph = 3 + q * 8; c.beginPath(); c.moveTo(cx - 16, bot); c.quadraticCurveTo(cx, bot - ph * 2, cx + 16, bot); c.fill();
        break;
      }
      case 'refinery': case 'desal': {                                   // 끓는 통 → 관 → 식는 관에서 맺히는 방울 · 층마다 받는 칸
        const lvl = kind === 'refinery' ? '#2a2420' : '#5a8ab8';
        c.fillStyle = '#3a3a40'; c.fillRect(x + 6, y + 10, w * 0.32, h - 14);
        c.fillStyle = lvl; c.fillRect(x + 8, bot - 6 - (h - 18) * (0.4 + 0.3 * (1 - q)), w * 0.32 - 4, (h - 18) * (0.4 + 0.3 * (1 - q)));
        if (busy) for (let i = 0; i < 5; i++) { const k = (t * 1.3 + i / 5) % 1; c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x + 12 + (i * 7) % (w * 0.28), bot - 8 - k * (h - 24) * 0.5, 1.5, 0, TAU); c.fill(); }
        flames(c, x + 6, bot, w * 0.32, run ? 0.7 : 0, t);
        c.strokeStyle = '#6a6e76'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 6 + w * 0.16, y + 10); c.lineTo(x + 6 + w * 0.16, y + 5); c.lineTo(x + w * 0.7, y + 5); c.lineTo(x + w * 0.7, y + h * 0.45); c.stroke();
        if (busy) { const k = (t * 1.1) % 1; c.fillStyle = kind === 'refinery' ? '#e8c060' : '#a8d8ff'; c.beginPath(); c.arc(x + w * 0.7, y + h * 0.45 + k * h * 0.3, 2, 0, TAU); c.fill(); }
        // 받는 칸 — 층마다 다른 빛(정제유 · 경유 …) 또는 하얀 소금
        const cols = kind === 'refinery' ? ['#e8c060', '#c88a3a', '#6a4a2a'] : ['#f0f0f0', '#d8e8f0', '#f0f0f0'];
        for (let i = 0; i < 3; i++) { c.fillStyle = '#2a2a2e'; c.fillRect(x + w * 0.58 + i * 9, bot - 14, 7, 12); c.fillStyle = cols[i]; const f = clamp(q * 3 - i, 0, 1); c.fillRect(x + w * 0.58 + i * 9 + 1, bot - 3 - 10 * f, 5, 10 * f); }
        break;
      }
      case 'assembler': {                                                // 부품 둘 → 팔이 집어 맞추고 → 용접 불꽃 → 검사 빛
        const ins = m.in ? Object.keys(m.in).filter((k: string) => m.in[k] > 0) : [];
        const a = ins[0] || inId, b = ins[1] || a;
        const join = clamp((q - 0.15) / 0.3, 0, 1);
        if (a && p >= IN && q < 0.85) { drawIc(c, a, lerp(x + 6, cx - 14, join), bot - 18, 14); if (b) drawIc(c, b, lerp(x + w - 20, cx, join), bot - 18, 14); }
        if (q >= 0.85 && outId) drawIc(c, outId, cx - 9, bot - 20, 18);
        // 팔 — 어깨는 위, 팔꿈치가 따라 움직인다
        const tx = q < 0.45 ? lerp(x + 10, cx, join) : cx + Math.sin(t * 8) * 3, ty = bot - 20;
        const sx = cx + 18, sy = y + 4, ex = (sx + tx) / 2 + 10, ey = (sy + ty) / 2 - 6;
        c.strokeStyle = '#d8a94b'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(tx, ty); c.stroke();
        c.fillStyle = '#8a8e96'; c.beginPath(); c.arc(ex, ey, 2.5, 0, TAU); c.fill();
        if (busy && q > 0.5 && q < 0.82) { for (let i = 0; i < 5; i++) { const an = Math.random() * TAU, d = Math.random() * 8; c.fillStyle = i % 2 ? '#ffffff' : '#8fd8ff'; c.fillRect(tx + Math.cos(an) * d, ty + Math.sin(an) * d, 2, 2); } glow(c, tx, ty, 16, '#8fd8ff', 0.5); }
        if (q > 0.82) { const k = (q - 0.82) / 0.18; c.fillStyle = 'rgba(90,208,106,.5)'; c.fillRect(x + 2, lerp(y + 2, bot - 4, k), w - 4, 2); }
        break;
      }
      case 'drill': {                                                    // 땅 단면 — 비트가 돌며 파고들고 부스러기가 튄다
        c.fillStyle = '#3a2c20'; c.fillRect(x, y + h * 0.3, w, h);
        c.fillStyle = '#4a3828'; for (let i = 0; i < 4; i++) c.fillRect(x, y + h * 0.3 + i * 8, w, 4);
        if (outId) drawIc(c, outId, cx - 8, bot - 18, 16);
        const depth = lerp(y + 4, bot - 22, ease(clamp(p * 1.1, 0, 1)));
        c.fillStyle = '#6a6e76'; c.fillRect(cx - 3, y, 6, depth - y);
        const ph = run ? (t * 40) % 4 : 0;
        c.fillStyle = '#c8ccd4'; for (let yy = y + ph; yy < depth; yy += 4) c.fillRect(cx - 3, yy, 6, 1);
        c.fillStyle = '#e0e4ea'; c.beginPath(); c.moveTo(cx - 4, depth); c.lineTo(cx, depth + 6); c.lineTo(cx + 4, depth); c.fill();
        if (run) for (let i = 0; i < 4; i++) { const k = (t * 2 + i / 4) % 1; c.fillStyle = '#8a6a48'; c.fillRect(cx + (i % 2 ? 1 : -1) * (4 + k * 12), depth - k * 10, 2, 2); }
        break;
      }
      case 'pump': {                                                     // 흔들대가 끄덕이며 관 속 원유를 끌어올린다
        const nod = Math.sin(run ? t * 2.4 : 0);
        c.fillStyle = '#3a2c20'; c.fillRect(x, y + h * 0.55, w, h);
        c.fillStyle = '#1a1612'; c.beginPath(); c.ellipse(cx, bot - 4, w * 0.3, 5, 0, 0, TAU); c.fill();
        c.fillStyle = '#5a5e66'; c.fillRect(cx - 2, y + h * 0.2 + nod * 4, 4, h * 0.7);
        c.strokeStyle = '#d8a94b'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 6, y + 10 - nod * 6); c.lineTo(x + w - 6, y + 10 + nod * 6); c.stroke();
        if (run) for (let i = 0; i < 3; i++) { const k = (t * 0.9 + i / 3) % 1; c.fillStyle = '#2a2420'; c.fillRect(cx - 1.5, lerp(bot - 6, y + h * 0.2, k), 3, 4); }
        break;
      }
      case 'gen': {                                                      // 연료가 타고 터빈이 돌고 코일이 달아오른다
        flames(c, x + 4, bot - 2, w * 0.45, run ? 1 : 0, t);
        if (inId && run) drawIc(c, inId, x + w * 0.12, bot - 18, 12);
        c.save(); c.translate(x + w * 0.72, y + h * 0.45); c.rotate(run ? t * 9 : 0);
        c.strokeStyle = '#9aa0aa'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); c.stroke(); }
        c.restore();
        if (run) glow(c, x + w * 0.72, y + h * 0.45, 18, '#ffe08a', 0.3 + 0.2 * Math.sin(t * 20));
        break;
      }
      case 'windmill': {
        c.save(); c.translate(cx, y + h * 0.5); c.rotate(run ? t * 3 : 0);
        c.fillStyle = '#d8d0b8'; for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); c.fillRect(-2, 0, 4, h * 0.42); }
        c.restore(); c.fillStyle = '#6a6458'; c.beginPath(); c.arc(cx, y + h * 0.5, 3, 0, TAU); c.fill();
        break;
      }
      case 'battery': {                                                  // 칸 다섯이 담은 전기만큼 차오른다 — 충전 화살이 흐른다
        const k = s.store ? clamp((m.e || 0) / s.store, 0, 1) : q;
        for (let i = 0; i < 5; i++) {
          const bx = x + 8 + i * (w - 16) / 5, bw = (w - 16) / 5 - 4;
          c.fillStyle = '#24242a'; c.fillRect(bx, y + 8, bw, h - 16); c.strokeStyle = '#5a5a64'; c.lineWidth = 1; c.strokeRect(bx + .5, y + 8.5, bw - 1, h - 17); c.fillStyle = '#5a5a64'; c.fillRect(bx + bw / 2 - 2, y + 5, 4, 3);
          const f = clamp(k * 5 - i, 0, 1); c.fillStyle = f > 0.99 ? '#5ad06a' : '#c8e060'; c.fillRect(bx + 1, y + 8 + (h - 16) * (1 - f), bw - 2, (h - 16) * f);
        }
        if (run) { const a = (t * 1.5) % 1; c.fillStyle = '#ffe08a'; c.beginPath(); c.moveTo(x + 4 + a * (w - 12), y + 4); c.lineTo(x + 8 + a * (w - 12), y + 6); c.lineTo(x + 4 + a * (w - 12), y + 8); c.fill(); }
        break;
      }
      case 'turret': {                                                   // 탄띠가 먹여지고 포신이 반동한다
        const fire = s.cycle ? 1 - clamp((m.cd || 0) / s.cycle, 0, 1) : 0;
        const rec = fire > 0.9 ? (fire - 0.9) * 40 : 0;
        c.fillStyle = '#5a5e66'; c.fillRect(x + 10 - rec, y + h * 0.4, w * 0.7, 8);
        c.fillStyle = '#c8a050'; for (let i = 0; i < 6; i++) c.fillRect(x + 6 + ((i * 7 + (run ? t * 20 : 0)) % (w * 0.5)), bot - 10, 4, 6);
        if (rec > 0) glow(c, x + w * 0.85, y + h * 0.44, 12, '#ffe08a', 0.8);
        break;
      }
      case 'sprinkler': {
        c.fillStyle = '#2a2a2e'; c.fillRect(x + 8, y + 8, w * 0.4, h - 14);
        c.fillStyle = '#5a8ab8'; const f = m.in && m.in.water_bucket ? clamp(m.in.water_bucket / 10, 0.1, 1) : 0; c.fillRect(x + 10, bot - 6 - (h - 18) * f, w * 0.4 - 4, (h - 18) * f);
        if (run) for (let i = 0; i < 5; i++) { const k = (t + i / 5) % 1; c.fillStyle = '#a8d8ff'; c.fillRect(x + w * 0.6 + k * w * 0.35, y + 10 + Math.sin(k * Math.PI) * -6 + k * 20, 2, 2); }
        break;
      }
      default: {                                                         // 그 밖 — 맞물린 톱니 둘
        for (const [gx, gy, r, dir] of [[cx - 8, y + h / 2, 10, 1], [cx + 9, y + h / 2 + 4, 7, -1]] as const) {
          c.save(); c.translate(gx, gy); c.rotate(run ? t * 3 * dir : 0);
          c.fillStyle = '#8a8478'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
          c.fillStyle = '#6a6458'; for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.fillRect(-1.5, r - 1, 3, 3); }
          c.restore();
        }
      }
    }
  },
};
mixin(UI, MachViewPart);
