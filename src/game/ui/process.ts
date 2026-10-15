/* ===== ui/process.js — 공정을 보이는 창 — 제작대 · 용광로 · 맨손 공정 무대 · 기계 가동 과정 · 모루 가열 → 단조 → 담금질 ===== */
/* 누르면 바로 생기던 것을 "만드는 과정"으로 보인다(사용자 요청 — 현실적인 제작 · 강화 · 가동 과정).
   제작: 시설마다 단계(재고 · 자르고 · 붙이고 · 다듬는다 / 지피고 · 녹이고 · 붓고 · 식힌다 / 고르고 · 엮고 · 다듬는다)를 무대 캔버스에
   그리고, 끝나는 순간에 재료를 쓴다 — 도중에 창을 닫으면 아무것도 안 잃는다. 연달아 누르면 줄을 선다.
   기계: 그리는 것은 ui/mach-view.ts(투입 통 → 컨베이어 → 들여다보는 창 → 산출 상자).
   화질 절약 · 움직임 줄이기면 예전처럼 바로 만든다(motionOn). */
import { app as G } from '../ctx.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { RECIPES } from '../data/recipes.js';
import { Art } from '../itemart.js';
import { $, UI } from '../ui.js';

type C2 = CanvasRenderingContext2D;
/** 시설마다 공정 — 이름 · 걸리는 초 */
export function craftSteps(st: string): { n: string[]; dur: number } {
  if (st === 'work') return { n: [tr('치수를 잰다'), tr('자른다'), tr('맞춰 붙인다'), tr('다듬는다')], dur: 1.5 };
  if (st === 'forge') return { n: [tr('불을 지핀다'), tr('녹인다'), tr('틀에 붓는다'), tr('식힌다')], dur: 1.8 };
  return { n: [tr('재료를 고른다'), tr('엮는다'), tr('다듬는다')], dur: 1.0 };
}
/** 기계마다 가동 과정 */
export function machSteps(t: string): string[] | null {
  const S: Record<string, () => string[]> = {
    smelter: () => [tr('연료를 태운다'), tr('광석을 녹인다'), tr('틀에 붓는다'), tr('식혀 내보낸다')],
    press: () => [tr('재료를 앉힌다'), tr('누른다'), tr('빼낸다')],
    pressor: () => [tr('재료를 앉힌다'), tr('압력을 올린다'), tr('누른다'), tr('빼낸다')],
    refinery: () => [tr('원유를 데운다'), tr('끓여 가른다'), tr('층마다 받는다')],
    assembler: () => [tr('부품을 고른다'), tr('맞춘다'), tr('용접한다'), tr('검사한다')],
    desal: () => [tr('바닷물을 끓인다'), tr('김을 식힌다'), tr('소금을 거둔다')],
    battery: () => [tr('전기를 받는다'), tr('칸에 채운다'), tr('내보낸다')],
    mill: () => [tr('낟알을 넣는다'), tr('간다'), tr('가루를 받는다')],
    oven: () => [tr('불을 지핀다'), tr('굽는다'), tr('꺼낸다')],
    drill: () => [tr('비트를 돌린다'), tr('광맥을 깬다'), tr('퍼 올린다')],
    pump: () => [tr('흔들대를 움직인다'), tr('원유를 퍼 올린다'), tr('내보낸다')],
    gen: () => [tr('연료를 넣는다'), tr('태운다'), tr('전기를 낸다')],
    windmill: () => [tr('바람을 받는다'), tr('날개가 돈다'), tr('전기를 낸다')],
    turret: () => [tr('탄을 먹인다'), tr('겨눈다'), tr('쏜다')],
    sprinkler: () => [tr('물을 받는다'), tr('아침에 뿌린다')]
  };
  const k = t === 'battery_hi' ? 'battery' : t === 'drill_e' || t === 'drill_x' ? 'drill' : t;
  return S[k] ? S[k]() : null;
}

/* 아이콘 그림 캐시 — itemUrl(data URL)을 Image 로 한 번만 */
const IMG: Record<string, HTMLImageElement> = {};
function icon(id: string) {
  if (!IMG[id]) { const im = new Image(); im.src = Art.itemUrl(id); IMG[id] = im; }
  return IMG[id];
}
export function drawIc(c: C2, id: string, x: number, y: number, s: number) {
  const im = icon(id); if (im.complete && im.naturalWidth) c.drawImage(im, x, y, s, s);
}
export function glow(c: C2, x: number, y: number, r: number, col: string, a: number) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
/** 단계 줄 — 칸마다 이름, 지난 것은 ✓, 지금 것은 금빛 */
export function stepRow(c: C2, names: string[], cur: number, k: number, x: number, y: number, w: number) {
  const n = names.length, cw = w / n;
  c.save(); c.font = `11px ${FONT || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const cx = x + cw * i + cw / 2, on = i === cur, done = i < cur;
    c.fillStyle = on ? '#3a2e16' : '#16140e'; c.strokeStyle = on ? '#d8a94b' : done ? '#6a7a4a' : '#2e2a1e'; c.lineWidth = 1;
    c.beginPath(); c.roundRect(cx - cw / 2 + 2, y, cw - 4, 18, 4); c.fill(); c.stroke();
    if (on && k >= 0) { c.fillStyle = '#d8a94b44'; c.beginPath(); c.roundRect(cx - cw / 2 + 3, y + 1, (cw - 6) * k, 16, 3); c.fill(); }
    c.fillStyle = on ? '#ffe2a0' : done ? '#a8c07a' : '#6b6553';
    c.fillText((done ? '✓ ' : '') + names[i], cx, y + 9.5, cw - 8);
    if (i < n - 1) { c.fillStyle = '#4a4430'; c.fillText('›', x + cw * (i + 1), y + 9); }
  }
  c.restore();
}

export const ProcessUIPart: Bag = {
  craftQ: null as number[] | null,
  craftRun: null as Bag | null,

  /* ================= 제작 공정 ================= */
  /** 제작 줄을 눌렀다 — 만들 수 있으면 공정을 줄 세우고, 아니면 예전처럼 바로(거절 흔들림 · 까닭 알림) */
  craftProcess(i: number, row: HTMLElement) {
    const r = RECIPES[i], p = G.player;
    const ok = (!r.station || (G.nearStObj[r.station] && (G.nearStObj[r.station].lv || 1) >= (r.lv || 1))) && p.hasAll(r.need);
    if (!this.motionOn() || !ok) { this.craftWithFx(i, row); return; }
    (this.craftQ || (this.craftQ = [])).push(i);
    if (!this.craftRun) this.craftNext();
    else this.craftStageDraw();
  },
  craftStageEl() {
    let cv = document.getElementById('craft-stage') as HTMLCanvasElement | null;
    if (!cv) {
      cv = document.createElement('canvas'); cv.id = 'craft-stage';
      const list = $('#craft-list'); list.parentNode.insertBefore(cv, list);
    }
    return cv;
  },
  craftNext() {
    const q = this.craftQ;
    if (!q || !q.length || this.open !== 'craft') { this.craftEnd(); return; }
    const i = q.shift()!, r = RECIPES[i], st = r.station || 'hand', S = craftSteps(st);
    this.craftRun = { i, r, st, S, t0: performance.now(), step: -1, parts: [] as number[][] };
    const cv = this.craftStageEl(); cv.classList.add('on');
    const tick = () => {
      const R = this.craftRun; if (!R) return;
      if (this.open !== 'craft') { this.craftEnd(); return; }       // 창을 닫았다 — 재료는 안 썼다
      const k = (performance.now() - R.t0) / 1000 / R.S.dur;
      if (k >= 1) { this.craftFinish(R.i); return; }
      const step = Math.min(R.S.n.length - 1, Math.floor(k * R.S.n.length));
      if (step !== R.step) { R.step = step; this.craftStepSfx(R.st, step); }
      this.craftStageDraw(k);
      R.raf = requestAnimationFrame(tick);
    };
    tick();
  },
  craftStepSfx(st: string, step: number) {
    if (st === 'work') G.sfx(step === 2 ? 'hit_blunt' : 'mat_wood', 1.1, 0.7);
    else if (st === 'forge') G.sfx(step === 0 ? 'fuse' : step === 3 ? 'splash' : 'smelt', 1, 0.6);
    else G.sfx('mat_plant', 1.2, 0.6);
  },
  craftFinish(i: number) {
    const R = this.craftRun; if (R && R.raf) cancelAnimationFrame(R.raf);
    this.craftRun = null;
    const row = document.querySelector(`#craft-list .recipe[data-r="${i}"]`) as HTMLElement | null;
    if (row) this.craftWithFx(i, row); else G.craft(i);
    if (this.craftQ && this.craftQ.length) this.craftNext(); else this.craftEnd();
  },
  craftEnd() {
    const R = this.craftRun; if (R && R.raf) cancelAnimationFrame(R.raf);
    this.craftRun = null; this.craftQ = null;
    const cv = document.getElementById('craft-stage'); if (cv) cv.classList.remove('on');
  },
  /** 무대 — 위에 단계 줄, 아래 작업 자리. k 는 0~1(공정 전체) */
  craftStageDraw(k = 0) {
    const R = this.craftRun, cv = document.getElementById('craft-stage') as HTMLCanvasElement | null; if (!R || !cv) return;
    const W = cv.clientWidth || 400, H = 112, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    c.imageSmoothingEnabled = false;
    const n = R.S.n.length, step = Math.min(n - 1, Math.floor(k * n)), sk = k * n - step;   // 단계 안에서 0~1
    stepRow(c, R.S.n, step, sk, 8, 6, W - 16);
    const y0 = 30, cx = W / 2, cy = y0 + 44, t = performance.now() / 1000;
    const mats = Object.keys(R.r.need).slice(0, 4);
    this[('stage_' + R.st) as string](c, W, cx, cy, y0, step, sk, k, t, mats, R.r.out);
    const left = (this.craftQ || []).length;                           // 줄 선 것 — 무대 그림 위에(탁자에 가려지지 않게)
    if (left) {
      const txt = tr('줄 선 것 {n}', { n: left });
      c.font = `700 11px ${FONT || 'sans-serif'}`; c.textAlign = 'right';
      const tw = c.measureText(txt).width; c.fillStyle = 'rgba(12,11,8,.85)'; c.fillRect(W - tw - 18, 32, tw + 12, 16);
      c.fillStyle = '#d8a94b'; c.fillText(txt, W - 12, 44);
    }
  },
  /* 작업대 — 판자 위에서 재고(자) · 자르고(톱 · 톱밥) · 망치로 붙이고 · 빛이 쓸고 간다 */
  stage_work(c: C2, W: number, cx: number, cy: number, y0: number, step: number, sk: number, k: number, t: number, mats: string[], out: string) {
    const top = cy + 14;
    c.fillStyle = '#5a3e22'; c.fillRect(16, top, W - 32, 10); c.fillStyle = '#7a5630'; c.fillRect(16, top, W - 32, 3);
    for (let x = 30; x < W - 30; x += 46) { c.fillStyle = '#4a321a'; c.fillRect(x, top + 3, 1, 7); }
    c.fillStyle = '#3a2814'; c.fillRect(28, top + 10, 8, 18); c.fillRect(W - 36, top + 10, 8, 18);
    // 재료가 가운데로 모이고, 마지막 단계에서 완성품이 된다
    mats.forEach((id, i) => {
      const sx = 40 + i * 30, tx = cx - 24 + i * 12, m = clamp(k * 2.2, 0, 1);
      const x = sx + (tx - sx) * m, a = step >= 3 ? 1 - sk : 1;
      c.globalAlpha = a; drawIc(c, id, x, top - 24, 22); c.globalAlpha = 1;
    });
    if (step === 0) {                                                   // 자 — 눈금이 그어진다
      const L = (W * 0.36) * sk; c.fillStyle = '#e0c060'; c.fillRect(cx - W * 0.18, top - 30, L, 4);
      for (let x = 0; x < L; x += 8) c.fillRect(cx - W * 0.18 + x, top - 30, 1, x % 32 ? 3 : 6);
    } else if (step === 1) {                                            // 톱 — 앞뒤로 · 톱밥
      const sx = cx + Math.sin(t * 22) * 14;
      c.fillStyle = '#c8ccd4'; c.beginPath(); c.moveTo(sx - 26, top - 4); c.lineTo(sx + 14, top - 4); c.lineTo(sx + 14, top - 12); c.lineTo(sx - 22, top - 10); c.fill();
      c.fillStyle = '#6a4a28'; c.fillRect(sx + 12, top - 16, 12, 9);
      c.fillStyle = '#e8c890';
      for (let i = 0; i < 6; i++) { const q = (t * 3 + i / 6) % 1; c.fillRect(cx - 4 + (i - 3) * 4 + q * (i - 3) * 6, top - 2 + q * 18, 2, 2); }
    } else if (step === 2) {                                            // 망치 — 내리친다 · 불티
      const ph = (sk * 3) % 1, a = ph < 0.6 ? -0.9 + ph / 0.6 * 1.3 : 0.4 - (ph - 0.6) / 0.4 * 1.3;
      c.save(); c.translate(cx + 30, top - 30); c.rotate(a);
      c.fillStyle = '#6a4a28'; c.fillRect(-2, -2, 26, 4); c.fillStyle = '#9aa0aa'; c.fillRect(-6, -7, 8, 14); c.restore();
      if (ph > 0.55 && ph < 0.7) glow(c, cx + 4, top - 8, 18, '#ffd27a', 0.6);
    }
    if (step >= 3) {                                                    // 완성 — 빛이 쓸고 간다
      drawIc(c, out, cx - 18, top - 38, 36);
      const gx = cx - 30 + sk * 60; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5;
      const g = c.createLinearGradient(gx - 10, 0, gx + 10, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, '#fff6d0'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(cx - 20, top - 40, 40, 40); c.restore();
    }
  },
  /* 용광로 — 불 · 도가니에서 녹고 · 기울여 붓고 · 김을 뿜으며 식는다 */
  stage_forge(c: C2, W: number, cx: number, cy: number, y0: number, step: number, sk: number, k: number, t: number, mats: string[], out: string) {
    const base = cy + 20;
    c.fillStyle = '#3a3438'; c.fillRect(cx - 70, base, 70, 16);                 // 화덕
    for (let x = cx - 70; x < cx; x += 10) { c.fillStyle = '#4a4248'; c.fillRect(x, base, 9, 7); }
    const heat = clamp(k * 1.6, 0, 1), f = 0.6 + 0.4 * Math.sin(t * 17) * Math.sin(t * 7);
    for (let i = 0; i < 6; i++) {                                                // 불길
      const h = (6 + heat * 12) * (0.6 + 0.4 * Math.sin(t * 13 + i * 1.7));
      c.fillStyle = i % 2 ? '#ff9a3a' : '#ffd27a'; c.fillRect(cx - 62 + i * 10, base - h, 6, h);
    }
    glow(c, cx - 35, base - 6, 34, '#ff8a2a', 0.25 + heat * 0.35 * f);
    // 도가니 — 붓는 단계에서 기운다
    const tilt = step === 2 ? sk * 0.9 : step > 2 ? 0.9 : 0;
    c.save(); c.translate(cx - 35, base - 18); c.rotate(tilt);
    c.fillStyle = '#2a2a30'; c.beginPath(); c.moveTo(-14, -12); c.lineTo(14, -12); c.lineTo(10, 10); c.lineTo(-10, 10); c.fill();
    const lv = step === 0 ? 0 : step === 1 ? sk : step === 2 ? 1 - sk : 0;
    if (lv > 0) { c.fillStyle = '#ff9a2a'; c.fillRect(-11, -10 + (1 - lv) * 16, 22, lv * 16); c.fillStyle = '#ffe08a'; c.fillRect(-11, -10 + (1 - lv) * 16, 22, 2); }
    c.restore();
    // 광석이 도가니로 들어가며 붉어진다
    if (step <= 1) mats.forEach((id, i) => {
      const m = step === 0 ? 0 : sk, x = 30 + i * 28 + (cx - 46 - (30 + i * 28)) * m, y = base - 46 + m * 20;
      c.globalAlpha = 1 - m * 0.9; drawIc(c, id, x, y, 22);
      if (step === 1) glow(c, x + 11, y + 11, 14, '#ff6a2a', 0.5 * m);
      c.globalAlpha = 1;
    });
    // 틀
    const mx = cx + 10;
    c.fillStyle = '#4a4a50'; c.fillRect(mx, base - 4, 56, 16); c.fillStyle = '#2a2a30'; c.fillRect(mx + 6, base - 2, 44, 8);
    if (step === 2) {                                                            // 쇳물 줄기
      c.fillStyle = '#ffb040'; c.fillRect(cx - 18, base - 26, 3, 24 + 4); glow(c, cx - 16, base - 6, 12, '#ff9a2a', 0.5);
      c.fillStyle = '#ff8a2a'; c.fillRect(mx + 6, base + 6 - sk * 8, 44 * sk, sk * 8);
    }
    if (step === 3) {                                                            // 식힌다 — 쇳물 빛이 잿빛으로 · 김
      const cool = sk;
      c.fillStyle = `rgb(${Math.round(255 - cool * 150)},${Math.round(138 - cool * 40)},${Math.round(42 + cool * 60)})`; c.fillRect(mx + 6, base - 2, 44, 8);
      c.globalAlpha = 0.85 * cool; drawIc(c, out, mx + 12, base - 34, 30); c.globalAlpha = 1;
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.9 + i / 4) % 1; c.globalAlpha = (1 - q) * 0.75 * (1 - cool * 0.4);
        c.fillStyle = '#d8dce4'; c.beginPath(); c.arc(mx + 10 + i * 12 + Math.sin(q * 6 + i) * 3, base - 6 - q * 30, 3 + q * 6, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
  },
  /* 맨손 — 재료가 튀어 모이고 · 끈으로 감기고 · 반짝 */
  stage_hand(c: C2, W: number, cx: number, cy: number, y0: number, step: number, sk: number, k: number, t: number, mats: string[], out: string) {
    const top = cy + 16;
    c.fillStyle = '#4a3a2a'; c.beginPath(); c.ellipse(cx, top + 6, W * 0.32, 8, 0, 0, TAU); c.fill();   // 펼친 가죽
    c.fillStyle = '#5e4a34'; c.beginPath(); c.ellipse(cx, top + 4, W * 0.3, 6, 0, 0, TAU); c.fill();
    mats.forEach((id, i) => {
      const sx = cx - 70 + i * 40, m = step === 0 ? sk : 1, hop = step === 0 ? Math.abs(Math.sin(sk * Math.PI * 2 + i)) * 8 : 0;
      const x = sx + (cx - 12 - sx) * m * 0.85, a = step === 2 ? 1 - sk : 1;
      c.globalAlpha = a; drawIc(c, id, x, top - 22 - hop, 22); c.globalAlpha = 1;
    });
    if (step === 1) {                                                   // 끈 — 감긴다
      c.strokeStyle = '#d8c090'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(cx - 2, top - 12, 18, 6, 0.3 * (i - 1), 0, TAU * sk); c.stroke(); }
    }
    if (step === 2) {
      drawIc(c, out, cx - 16, top - 34, 32);
      c.fillStyle = '#fff6d0';
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * 3, d = 20 + sk * 10; c.fillRect(cx + Math.cos(a) * d, top - 18 + Math.sin(a) * d * 0.6, 2, 2); }
    }
  },

  /* ================= 기계 가동 과정 ================= */
  /** 기계 창 맨 위 — 투입 → 확대한 기계 → 산출 · 공정 단계 줄. 창이 열려 있는 동안 매 프레임 */
  machViewStart() {
    if (this._mvRaf) return;
    const loop = () => {
      this._mvRaf = 0;
      if (this.open !== 'machine' || !this.machRef) return;
      this.machViewDraw();
      this._mvRaf = requestAnimationFrame(loop);
    };
    this._mvRaf = requestAnimationFrame(loop);
  },
  /* ================= 강화 모루 — 가열 → 단조(망치 셋) → 담금질 ================= */
  anvilSteps(st: HTMLElement, cur: number) {
    let row = st.querySelector('.as-steps') as HTMLElement | null;
    if (!row) {
      row = document.createElement('div'); row.className = 'as-steps';
      row.innerHTML = [tr('가열'), tr('단조'), tr('담금질')].map(n => `<i>${n}</i>`).join('');
      st.querySelector('.as-body')!.prepend(row);
    }
    row.querySelectorAll('i').forEach((el, i) => { el.classList.toggle('on', i === cur); el.classList.toggle('done', i < cur); });
  }
};
mixin(UI, ProcessUIPart);
