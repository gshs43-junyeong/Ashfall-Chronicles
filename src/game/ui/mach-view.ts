/* ===== ui/mach-view.js — 기계 창 맨 위 가동 화면 — 투입 통 → 컨베이어 → 들여다보는 창(속 공정) → 컨베이어 → 산출 상자 ===== */
/* 점이 흐르는 줄만으로는 무엇이 들어가 무엇이 나오는지 읽히지 않았다(사용자). 실제 재료 그림이 벨트를 타고 들어가고,
   기계 속(녹이고 · 누르고 · 갈고 · 끓이고 · 맞추고 · 캐고 · 태우고 · 채우는 모습)이 진행도에 맞춰 바뀌고, 완성품이 나와 상자에 쌓인다.
   진행도는 공장 틱(0.125초)마다 뛰므로 그 사이를 이어 그린다(_mvP). 사연: docs/code-history.md#h187 */
import { app as G } from '../ctx.js';
import { TAU, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { TILE_DEF } from '../data.js';
import { ITEMS } from '../data/items.js';
import { FUEL, MACHINE, MRECIPES } from '../data/recipes.js';
import { TileArt } from '../tileart.js';
import { FAC_TICK, Factory } from '../factory.js';
import { UI } from '../ui.js';
import { drawIc, glow, machSteps, stepRow } from './process.js';
import { bolt, cable, chevron, ease, minipole, puffs } from './mach-kit.js';
import { IN, IN_Y, OUT, OUT_Y, PIN, drawInside } from './mach-inside.js';
import { drawScene } from './mach-scene.js';

type C2 = CanvasRenderingContext2D;

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
    const sat = Factory.sat(G.world, m);
    /* 고장 — 창 속 그림도 털털 떨고 붉게 깜빡인다 */
    const jolt = m.broke ? Factory.brokeJolt(m, t) : [0, 0];
    c.save(); c.translate(jolt[0], jolt[1]);
    if (drawScene(c, m, W, H, t, run)) { c.restore(); this.mvHead(c, m, W / 2 - 80, 20, 160, run, t); this.mvBroke(c, m, W, H, t); return; }

    /* ---- 진행도 — 틱 사이를 이어 그린다 ---- */
    const r = m.rec >= 0 ? MRECIPES[m.rec] : null;
    let target = -1, dur = 1;
    if (r) { target = clamp(m.prog / r.t, 0, 1); dur = r.t * FAC_TICK; }
    else if (s.cycle) { target = clamp(1 - (m.cd || 0) / s.cycle, 0, 1); dur = s.cycle * FAC_TICK; }
    const mv = this._mvP && this._mvP.m === m ? this._mvP : (this._mvP = { m, p: target < 0 ? 0 : target, at: t, e: m.e || 0, fl: 0 });
    const dt = Math.min(0.1, t - mv.at); mv.at = t;
    if (target < 0) mv.p = run ? (mv.p + dt / 2.4) % 1 : mv.p;                               // 진행도가 없는 기계(발전 · 바람개비)
    else if (target < mv.p - 0.3) mv.p = target;                                              // 새 공정
    else if (run) mv.p = Math.min(target + 1 / Math.max(1, dur / FAC_TICK), mv.p + dt / Math.max(0.2, dur), 1);
    else mv.p = target;
    if (s.store) { const de = (m.e || 0) - mv.e; mv.e = m.e || 0; if (Math.abs(de) > 0.01) mv.fl = de > 0 ? 1 : -1; else if (dt > 0) mv.fl *= 0.98; }
    const p = mv.p;

    /* ---- 자리 — 가운데는 기계의 속을 들여다보는 몸체(겉판 · 들고 나는 구멍), 실제 기계 그림은 위에 이름판처럼 ---- */
    const fy = 132, by = fy - 20;
    const binW = 46, lx0 = 10 + binW, rx1 = W - 10 - binW;
    const hw = Math.min(W * 0.44, 200), hh = 84, hx = W / 2 - hw / 2, hy = fy - hh;
    c.fillStyle = '#16140e'; c.fillRect(0, fy, W, 4);
    const ins = m.in ? Object.keys(m.in).filter(k => m.in[k] > 0) : [];
    const outs = m.out ? Object.keys(m.out).filter(k => m.out[k] > 0) : [];
    let inId: string | null = r ? Object.keys(r.in)[0] : ins.find(k => !FUEL[k]) || ins[0] || null;
    let outId: string | null = r ? Object.keys(r.out)[0] : outs[0] || null;
    const fuelId = s.fuelIn ? ins.find(k => FUEL[k]) || null : null;
    if (kind === 'drill' && m.tgt) { const d = TILE_DEF[G.world.get(m.tgt[0], m.tgt[1])]; if (d && d.drop && ITEMS[d.drop]) outId = d.drop; }
    if (kind === 'pump') outId = outId || 'crude_oil';
    if (kind === 'gen') inId = fuelId;
    const hasBeltIn = kind !== 'drill' && kind !== 'pump' && kind !== 'windmill' && kind !== 'gen';
    const elecOut = !!s.gen || kind === 'windmill' || kind === 'battery';
    const hasBeltOut = !s.gen && kind !== 'windmill' && kind !== 'battery' && kind !== 'turret' && kind !== 'sprinkler';
    const anyIn = hasBeltIn || (kind === 'gen' && !!s.fuelIn);

    /* ---- 왼쪽: 투입 통 + 벨트 — 연료도 같은 통으로 들어가 속에서 화실로 갈라진다 ---- */
    if (anyIn) {
      hopper(c, 10, by - 52, binW, 40);
      ins.slice(0, 3).forEach((id, i) => pile(c, id, m.in[id], 14 + i * 12 - (ins.length > 1 ? 6 : 0), by - 50 + i * 3, 16));
      belt(c, lx0 - 8, hx + 2, by, run, t);
      const nid = inId || fuelId;
      if (nid && run && p < IN) { const k = ease(p / IN); drawIc(c, nid, lerp(lx0 - 4, hx - 8, k), by - 15, 16); }
      else if (nid) drawIc(c, nid, lx0 - 4, by - 15, 16);
    } else if (kind === 'drill' && outId) {                             // 드릴 — 왼쪽엔 캐는 광맥(실제 광석)
      c.fillStyle = '#3a2c20'; c.fillRect(10, by - 30, binW, 50); c.fillStyle = '#4a3828'; for (let i = 0; i < 5; i++) c.fillRect(10, by - 30 + i * 10, binW, 4);
      drawIc(c, outId, 10 + binW / 2 - 10, by - 22, 20);
      c.strokeStyle = '#6a5a48'; c.setLineDash([3, 3]); c.lineDashOffset = -t * 20; c.beginPath(); c.moveTo(10 + binW, by - 12); c.lineTo(hx, by - 12); c.stroke(); c.setLineDash([]);
    }
    /* ---- 가운데: 몸체 + 속 ---- */
    const shake = run ? (Factory.SHAKE[m.t] || 0) * Math.sin(t * 60) * 0.5 : 0;
    c.save(); c.translate(shake, 0);
    c.fillStyle = '#3a3a40'; c.fillRect(hx, hy, hw, hh);
    c.fillStyle = '#4a4a52'; c.fillRect(hx, hy, hw, 4); c.fillStyle = '#26262a'; c.fillRect(hx, hy + hh - 4, hw, 4);
    c.fillStyle = '#8a8478'; for (let i = 0; i < 6; i++) { c.fillRect(hx + 3 + i * (hw - 8) / 5, hy + 6, 2, 2); c.fillRect(hx + 3 + i * (hw - 8) / 5, hy + hh - 8, 2, 2); }
    const ww = hw - 26, wh = hh - 22, wx = hx + 13, wy = hy + 12;
    const VH = 40, k = wh / VH, VW = ww / k, ox = wx + (ww - VW * k) / 2, oy = wy + (wh - VH * k) / 2;
    const toY = (ly: number) => oy + ly * k;
    /* 들고 나는 구멍 — 속 그림의 IN_Y · OUT_Y 와 같은 높이. 고무 발이 물건이 지날 때 들썩인다 */
    const port = (x: number, ly: number, dir: number, col: string, busy: boolean) => {
      const y = toY(ly);
      c.fillStyle = '#0c0b09'; c.fillRect(x - 4, y - 11, 8, 18);
      c.fillStyle = '#2a2a2e'; for (let i = 0; i < 3; i++) { const sw = busy ? Math.sin(t * 14 + i) * 1.5 : 0; c.fillRect(x - 3 + i * 2.2 + sw * 0.4, y - 10, 1.4, 16); }
      c.fillStyle = '#5a5a64'; c.fillRect(x - 5, y - 12, 10, 2); c.fillRect(x - 5, y + 7, 10, 2);
      chevron(c, x + dir * 2, y - 18, dir, col, t, busy);
    };
    if (anyIn) port(hx + 2, IN_Y, 1, '#7ad08a', run && p < IN + 0.05);
    if (hasBeltOut) port(hx + hw - 2, OUT_Y, 1, '#e8a050', run && p > OUT - 0.05);
    const q = clamp((p - IN) / (OUT - IN), 0, 1);
    windowFrame(c, wx, wy, ww, wh, () => {
      c.fillStyle = '#16151a'; c.fillRect(wx, wy, ww, wh);
      c.fillStyle = '#1e1d22'; for (let xx = wx + 6; xx < wx + ww; xx += 24) c.fillRect(xx, wy, 1, wh);
      c.translate(ox, oy); c.scale(k, k);
      drawInside(c, kind, { m, s, w: VW, h: VH, q, p, run, t, inId, outId, fuelId, pw: sat, flow: mv.fl || 0 });
    });
    if (s.fuelIn) {                                                   // 화실 문 — 타는 동안 살 틈이 달아오른다
      const dx = hx + 4, dy = hy + hh - 20, burn = run && (m.fuel > 0 || !!fuelId);
      c.fillStyle = '#26221e'; c.fillRect(dx, dy, 10, 14);
      for (let i = 0; i < 3; i++) { c.fillStyle = burn ? `rgba(255,${120 + 60 * Math.sin(t * 7 + i)},40,.9)` : '#3a2a22'; c.fillRect(dx + 2, dy + 3 + i * 4, 6, 1.5); }
      if (burn) glow(c, dx + 5, dy + 7, 12, '#ff8a3a', 0.35);
    }
    c.restore();
    /* ---- 전기가 드는 곳 — 위 전선 → 애자 → 몸체 위 콘센트, 속 그림이 같은 자리에서 받는다 ---- */
    if (s.power) {
      const px = ox + (PIN[kind] ?? 0.5) * VW * k, on = sat > 0 ? 1 : 0;
      c.strokeStyle = 'rgba(28,26,22,.95)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(px / 2, 12, px, 8); c.quadraticCurveTo((px + W) / 2, 12, W, 6); c.stroke();
      c.fillStyle = '#b8d0e0'; c.fillRect(px - 2, 6, 4, 5);
      cable(c, [[px, 11], [px, hy - 4]], on * (run ? 1 : 0.2), t, 2);
      c.fillStyle = '#26262a'; c.fillRect(px - 7, hy - 6, 14, 8); bolt(c, px, hy - 2, 3, on ? '#ffe08a' : '#7a3a2a');
      cable(c, [[px, hy + 2], [px, wy]], on * (run ? 1 : 0.2), t, 2);
    }
    /* ---- 전기가 나가는 곳(발전기 · 풍차 · 축전지) — 오른쪽 단자 → 전주 ---- */
    if (elecOut) {
      const ty = toY(kind === 'windmill' ? 14 : kind === 'battery' ? 5 : 14), tx = hx + hw;
      const [pl] = minipole(c, W - 22, hy - 4, fy);
      const flowOut = kind === 'battery' ? (mv.fl < 0 ? 1 : 0) : run ? 1 : 0;
      c.fillStyle = '#26262a'; c.fillRect(tx - 2, ty - 5, 7, 10);
      cable(c, [[tx + 5, ty], [pl[0] - 10, ty], [pl[0], pl[1] + 1]], flowOut, kind === 'battery' && mv.fl > 0 ? -t : t, 2);
      if (kind === 'windmill') {                                      // 풍차 날개는 몸 위에서 돈다
        c.save(); c.translate(hx + hw / 2, hy - 16); c.rotate(run ? t * 3 : 0);
        c.fillStyle = '#e8dcc0'; for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); c.fillRect(-2, 0, 4, 24); c.fillStyle = '#cfc2a4'; c.fillRect(-6, 4, 4, 18); c.fillStyle = '#e8dcc0'; }
        c.restore();
      }
    }
    // 이름판 — 실제 기계 그림(작게)
    { const big = Factory.isBig(m), MW = (m.w || 1) * 22, MH = (m.h || 1) * 22, sc = Math.min(1.6, 40 / MH, 56 / MW);
      const px = hx + hw - MW * sc - 4, py = hy - MH * sc + 6;
      if (kind !== 'windmill') {
        c.save(); c.translate(px, py); c.scale(sc, sc);
        if (big) Factory.drawBig(c, m, 0, (m.h - 1) * 22, t, run); else TileArt.draw(c, s.tile, 0, 0, 0);
        c.restore();
      } }
    /* ---- 오른쪽: 벨트 + 산출 상자 ---- */
    if (hasBeltOut) {
      belt(c, hx + hw - 2, rx1 + 8, by, run, t);
      crate(c, rx1 + 2, by - 22, binW, 30);
      if (outId && run && p > OUT) { const kk = ease((p - OUT) / (1 - OUT)); drawIc(c, outId, lerp(hx + hw - 6, rx1 - 2, kk), by - 15, 16); }
      outs.slice(0, 2).forEach((id, i) => pile(c, id, m.out[id], rx1 + 8 + i * 14, by - 40 + i * 2, 18));
      if (!outs.length && outId) { c.globalAlpha = 0.35; drawIc(c, outId, rx1 + 14, by - 40, 18); c.globalAlpha = 1; }
    }
    c.restore();

    this.mvHead(c, m, hx, hy, hw, run, t);
    if (target >= 0) gauge(c, hx - 16, hy + 16, p, run ? '#ffd27a' : '#8a8070');
    if (s.fuelIn) {
      const fk = m.fmax ? clamp(m.fuel / m.fmax, 0, 1) : 0;
      c.fillStyle = '#1a1814'; c.fillRect(hx - 22, hy + 34, 5, hh - 40);
      c.fillStyle = fk > 0.25 ? '#ff9a3a' : '#c84a2a'; c.fillRect(hx - 21, hy + 35 + (hh - 42) * (1 - fk), 3, (hh - 42) * fk);
    }
    if (steps) {
      let cur = -1, kk = -1;
      if (target >= 0 && m.on) { const pp = clamp(p, 0, 0.999); cur = Math.floor(pp * steps.length); kk = pp * steps.length - cur; }
      else if (run) { const pp = (t * 0.6) % 1; cur = Math.floor(pp * steps.length); kk = pp * steps.length - cur; }
      stepRow(c, steps, cur, kk, 6, H - 26, W - 12);
    }
    this.mvBroke(c, m, W, H, t);
  },
  /** 상태 등 · 상태 글 */
  mvHead(c: C2, m: Bag, hx: number, hy: number, hw: number, run: boolean, t: number) {
    const lamp = run ? '#5ad06a' : m.broke || !m.on ? '#e05040' : '#e8b040';
    c.fillStyle = lamp; c.beginPath(); c.arc(hx + 6, hy - 10, 4, 0, TAU); c.fill();
    glow(c, hx + 6, hy - 10, 14, lamp, run ? 0.5 + 0.3 * Math.sin(t * 6) : 0.35);
    c.fillStyle = '#d8cfb4'; c.font = `11px ${FONT || 'sans-serif'}`; c.textAlign = 'left';
    if (m.st) {
      const txt = tr(m.st, { n: m.net }), tw = Math.min(hw - 70, c.measureText(txt).width);
      c.fillStyle = 'rgba(12,11,9,.8)'; c.fillRect(hx + 11, hy - 17, tw + 6, 15);   // 전선이 지나가도 글이 읽히게
      c.fillStyle = '#d8cfb4'; c.fillText(txt, hx + 14, hy - 6, hw - 70);
    }
  },
  /** 고장 — 붉은 깜빡임 · 연기 · 가운데 느낌표 */
  mvBroke(c: C2, m: Bag, W: number, H: number, t: number) {
    if (!m.broke) return;
    const hot = ((t * 2.5) | 0) % 2 === 0;
    c.fillStyle = hot ? 'rgba(220,60,40,.12)' : 'rgba(220,60,40,.04)'; c.fillRect(0, 0, W, H);
    puffs(c, W / 2 + 30, 60, 5, t, 0.5, 40, '90,90,96', 0.5);
    const x = W / 2, y = 34 - Math.abs(Math.sin(t * 4)) * 4;
    c.fillStyle = 'rgba(20,10,8,.9)'; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
    c.fillStyle = hot ? '#ff5a3a' : '#ffc23a'; c.beginPath(); c.arc(x, y, 11, 0, TAU); c.fill();
    c.fillStyle = '#2a120c'; c.fillRect(x - 2, y - 7, 4, 9); c.fillRect(x - 2, y + 4, 4, 3);
  },
};
mixin(UI, MachViewPart);
