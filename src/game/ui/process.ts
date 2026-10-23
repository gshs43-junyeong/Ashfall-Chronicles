/* ===== ui/process.js — 공정을 보이는 창 — 제작대 · 용광로 · 맨손 공정 무대 · 기계 가동 과정 · 모루 가열 → 단조 → 담금질 ===== */
/* 누르면 바로 생기던 것을 "만드는 과정"으로 보인다(사용자 요청 — 현실적인 제작 · 강화 · 가동 과정).
   제작: 시설마다 단계(재고 · 자르고 · 붙이고 · 다듬는다 / 지피고 · 녹이고 · 붓고 · 식힌다 / 고르고 · 엮고 · 다듬는다)를 무대 캔버스에
   그리고, 끝나는 순간에 재료를 쓴다 — 도중에 창을 닫으면 아무것도 안 잃는다. 연달아 누르면 줄을 선다.
   기계: 그리는 것은 ui/mach-view.ts(투입 통 → 컨베이어 → 들여다보는 창 → 산출 상자).
   화질 절약 · 움직임 줄이기면 예전처럼 바로 만든다(motionOn). */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { ITEMS } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { Art } from '../itemart.js';
import { $, UI } from '../ui.js';

type C2 = CanvasRenderingContext2D;
export interface CraftPlan { st: string; n: string[]; v: number[]; dur: number }
/** 제작 숙련 레벨마다 공정 시간 배수 — Lv 1 은 2배, Lv 10 은 0.7배 */
export const craftSpeed = (lv: number) => 2 - (Math.max(1, Math.min(10, lv)) - 1) * (1.3 / 9);
const METAL = /_bar$|_ore$|nail|rivet|plate|gear|wire|chain/;
/** 제작 공정 — 시설 · 넣는 재료 · 숙련에 따라 단계와 걸리는 초가 달라진다. v 는 단계마다 그릴 장면 번호(ui/craft-scene)
    ★ 용광로에서 무기 · 방어구 · 도구를 만들면 쇳물 붓기가 아니라 대장간(smith — 달구고 두드리고 담금질) */
export function craftPlan(r: Bag, lv: number): CraftPlan {
  const mats = Object.keys(r.need), kinds = mats.length, qty = mats.reduce((a, k) => a + r.need[k], 0);
  const ty = ITEMS[r.out] ? ITEMS[r.out].type : '', gear = ty === 'weapon' || ty === 'armor' || ty === 'tool';
  const metals = mats.filter(id => METAL.test(id)).length, st0 = r.station || 'hand';
  const S: [string, number][] = [];
  let st = st0, base: number, baseN: number;
  if (st0 === 'forge' && gear) {
    st = 'smith'; base = 3.4; baseN = 4;
    S.push([tr('쇠를 달군다'), 0], [ty === 'armor' ? tr('판을 두드린다') : tr('두드려 편다'), 1]);
    if (kinds >= 3 || qty >= 12) S.push([tr('다시 달군다'), 0], [tr('또 두드린다'), 1]);
    S.push([ty === 'armor' ? tr('이어 맞춘다') : ty === 'tool' ? tr('자루를 박는다') : tr('날을 세운다'), 2], [tr('담금질한다'), 3]);
  } else if (st0 === 'forge') {
    base = 2.8; baseN = 4;
    S.push([tr('불을 지핀다'), 0], [tr('녹인다'), 1]);
    if (metals >= 2 || kinds >= 3) S.push([tr('섞는다'), 1]);
    S.push([tr('틀에 붓는다'), 2], [tr('식힌다'), 3]);
  } else if (st0 === 'work') {
    base = 2.4; baseN = 4;
    S.push([tr('치수를 잰다'), 0], [tr('자른다'), 1], [tr('맞춰 붙인다'), 2]);
    if (metals) S.push([tr('못을 박는다'), 2]);
    if (kinds >= 4) S.push([tr('조립한다'), 2]);
    S.push([tr('다듬는다'), 3]);
  } else {
    base = 1.2; baseN = 3;
    S.push([tr('재료를 고른다'), 0], [tr('엮는다'), 1]);
    if (kinds >= 3) S.push([tr('단단히 묶는다'), 1]);
    S.push([tr('다듬는다'), 2]);
  }
  const dur = Math.min(16, base * (S.length / baseN) * (1 + 0.12 * Math.log2(1 + qty)) * craftSpeed(lv));
  return { st, n: S.map(x => x[0]), v: S.map(x => x[1]), dur };
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
    if (this.reducedMotion() || !ok) { this.craftWithFx(i, row); return; }
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
    const i = q.shift()!, r = RECIPES[i], lv = G.player.profLv('craft'), S = craftPlan(r, lv);
    if (lv >= 3 && this._lastCraft === r.out) S.dur *= 0.7;               // 숙련 3 — 같은 것을 잇따라 만들면 손에 익어 빠르다
    this._lastCraft = r.out;
    this.craftRun = { i, r, st: S.st, S, t0: performance.now(), step: -1, parts: [] as number[][] };
    const cv = this.craftStageEl(); cv.classList.add('on');
    const tick = () => {
      const R = this.craftRun; if (!R) return;
      if (this.open !== 'craft') { this.craftEnd(); return; }       // 창을 닫았다 — 재료는 안 썼다
      const k = (performance.now() - R.t0) / 1000 / R.S.dur;
      if (k >= 1) { this.craftFinish(R.i); return; }
      const step = Math.min(R.S.n.length - 1, Math.floor(k * R.S.n.length));
      if (step !== R.step) { R.step = step; this.craftStepSfx(R.st, R.S.v[step]); }
      this.craftStageDraw(k);
      R.raf = requestAnimationFrame(tick);
    };
    tick();
  },
  craftStepSfx(st: string, step: number) {
    if (st === 'work') G.sfx(step === 2 ? 'hit_blunt' : 'mat_wood', 1.1, 0.7);
    else if (st === 'forge') G.sfx(step === 0 ? 'fuse' : step === 3 ? 'splash' : 'smelt', 1, 0.6);
    else if (st === 'smith') G.sfx(step === 0 ? 'fuse' : step === 3 ? 'splash' : step === 1 ? 'hit_metal' : 'mat_metal', 1, 0.6);
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
    if (this.open === 'craft') this.craftIdle();                     // 공정이 끝나면 쉬는 무대로
    else { const cv = document.getElementById('craft-stage'); if (cv) cv.classList.remove('on'); }
  },
  /** 무대 — 위에 단계 줄, 아래 시설 장면(ui/craft-scene). k 는 0~1(공정 전체) */
  craftStageDraw(k = 0) {
    const R = this.craftRun, cv = document.getElementById('craft-stage') as HTMLCanvasElement | null; if (!R || !cv) return;
    const W = cv.clientWidth || 400, H = 176, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const n = R.S.n.length, idx = Math.min(n - 1, Math.floor(k * n)), sk = k * n - idx;   // 단계 안에서 0~1
    this.craftScene(c, W, H, { st: R.st, step: R.S.v[idx], idx, names: R.S.n, sk, k, t: performance.now() / 1000, mats: Object.keys(R.r.need).slice(0, 4), out: R.r.out, idle: false });
    const left = (this.craftQ || []).length;                           // 줄 선 것
    if (left) {
      const txt = tr('줄 선 것 {n}', { n: left });
      c.font = `700 11px ${FONT || 'sans-serif'}`; c.textAlign = 'right';
      const tw = c.measureText(txt).width; c.fillStyle = 'rgba(12,11,8,.85)'; c.fillRect(W - tw - 18, 30, tw + 12, 16);
      c.fillStyle = '#d8a94b'; c.fillText(txt, W - 12, 42);
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
