/* ===== ui/motion.js — 창의 움직임 — 재료가 결과로 빨려 들고 · 완성품이 가방으로 날아가고 · 모루에 불꽃이 튄다 ===== */
/* 칸 목록만 바뀌면 "만들었다 · 두들겼다"가 손에 안 느껴진다. 움직임은 화면 맨 위 겹(#uifx — 클릭을 안 막는다)에 그려
   창을 다시 짜도(refreshCraft 가 innerHTML 을 통째로 바꾼다) 끊기지 않는다. 화질 '절약' · 움직임 줄이기 설정이면 모두 건너뛴다. */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { ITEMS } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { Art } from '../itemart.js';
import { $, UI } from '../ui.js';

type R = DOMRect;

export const UIMotionPart: Bag = {
  anvilBusy: false,

  motionOn() {
    if (G && G.quality && G.quality() === 'low') return false;
    try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; }
  },
  fxLayer() {
    let el = document.getElementById('uifx');
    if (!el) { el = document.createElement('div'); el.id = 'uifx'; document.body.appendChild(el); }
    return el;
  },
  /** 보이는 칸인가 — 숨긴 탭 단추(설정)처럼 크기가 0 이면 날리지 않는다 */
  seen(r: R | null) { return !!r && r.width > 0 && r.height > 0; },
  /** 아이콘 하나가 a 에서 b 로 — 위로 휘었다가 작아지며 내려앉는다 */
  flyIcon(url: string, a: R, b: R, delay = 0, dur = 420, size = 26) {
    if (!this.motionOn() || !this.seen(a) || !this.seen(b)) return;
    const el = document.createElement('div');
    el.className = 'uifx-ic'; el.style.backgroundImage = `url(${url})`; el.style.width = el.style.height = size + 'px';
    const x0 = a.left + a.width / 2 - size / 2, y0 = a.top + a.height / 2 - size / 2;
    const dx = b.left + b.width / 2 - size / 2 - x0, dy = b.top + b.height / 2 - size / 2 - y0;
    const lift = Math.min(90, Math.abs(dx) * 0.3 + 28);
    el.style.left = x0 + 'px'; el.style.top = y0 + 'px';
    this.fxLayer().appendChild(el);
    const an = el.animate([
      { transform: 'translate(0,0) scale(.8)', opacity: 0 },
      { transform: `translate(${dx * .1}px,${dy * .1 - lift * .4}px) scale(1.15)`, opacity: 1, offset: .15 },
      { transform: `translate(${dx * .55}px,${dy * .55 - lift}px) scale(.95)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px,${dy}px) scale(.45)`, opacity: .15 }
    ], { duration: dur, delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
    an.onfinish = () => el.remove();
  },
  /** 그 자리에서 불꽃 · 빛 알갱이가 사방으로 튄다 */
  sparkAt(r: R | null, color: string, n = 10, spread = 60, delay = 0) {
    if (!this.motionOn() || !this.seen(r)) return;
    const L = this.fxLayer(), cx = r!.left + r!.width / 2, cy = r!.top + r!.height / 2;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'uifx-sp'; s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.background = color; s.style.color = color;
      L.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = spread * (0.4 + Math.random() * 0.6);
      const an = s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px),calc(-50% + ${(Math.sin(a) * d + 12).toFixed(1)}px)) scale(.2)`, opacity: 0 }
      ], { duration: 360 + Math.random() * 260, delay, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' });
      an.onfinish = () => s.remove();
    }
  },
  /** 클래스를 다시 걸어 CSS 움직임을 처음부터 돌린다 */
  pop(el: Element | null, cls: string, ms = 900) {
    if (!el || !this.motionOn()) return;
    el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  },

  /* ---------------- 제작 ---------------- */
  /** 재료가 결과 아이콘으로 빨려 들고, 완성되면 아이콘이 튀며 가방 단추로 날아간다. 재료가 모자라면 줄이 흔들린다 */
  craftWithFx(i: number, row: HTMLElement) {
    const r = RECIPES[i], n0 = (G.crafted && G.crafted[r.out]) || 0;
    const icEl = row.querySelector('.ric'), ic = icEl && icEl.getBoundingClientRect();
    const mats = Array.from(row.querySelectorAll('.rmat [data-id]')).map(el => [el.getAttribute('data-id'), el.getBoundingClientRect()] as [string, R]);
    G.craft(i);
    const row2 = document.querySelector(`#craft-list .recipe[data-r="${i}"]`);
    if (((G.crafted && G.crafted[r.out]) || 0) === n0) { this.pop(row2, 'deny', 400); return; }
    if (!ic) return;
    mats.forEach(([id, rc], k) => this.flyIcon(Art.itemUrl(id), rc, ic, k * 70, 380, 20));
    setTimeout(() => {
      const ric = document.querySelector(`#craft-list .recipe[data-r="${i}"] .ric`), at = ric ? ric.getBoundingClientRect() : ic;
      this.pop(ric, 'made'); this.sparkAt(at, '#ffd27a', 12, 46);
      const bag = document.querySelector('#tabbar .tb[data-tab="inv"]');
      if (bag) { this.flyIcon(Art.itemUrl(r.out), at, bag.getBoundingClientRect(), 140, 560, 30); setTimeout(() => this.pop(bag, 'got', 600), 700); }
    }, 380 + mats.length * 70);
  },

  /* ---------------- 강화 모루 ---------------- */
  /** 모루 무대 — 고른(가리킨) 장비 · 이번 망치질의 성공 · 실패 · 파괴 몫 */
  anvilShow(it: Bag | null) {
    const st = $('#anvil-stage'); if (!st || this.anvilBusy) return;
    const item = st.querySelector('.as-item');
    if (!it) { item.style.backgroundImage = ''; st.querySelector('.as-line').textContent = tr('두들길 장비를 가리켜라'); this.anvilRisk(0, 0, true); return; }
    item.style.backgroundImage = `url(${Art.itemUrl(it.id)})`;
    const e = it.e || 0;
    if (e >= G.ENH_MAX) { st.querySelector('.as-line').textContent = tr('더 두들길 데가 없다'); this.anvilRisk(0, 0, true); return; }
    const cost = G.enhCost(it), mat = G.enhMat(e);
    st.querySelector('.as-line').textContent = tr('+{e} → +{n} · 🪙 {cost} · {item} {mat}개', { e, n: e + 1, cost: fmt(cost), item: ITEMS[mat.id].n, mat: mat.n });
    const fail = G.enhFail(e), brk = G.enhBreak(e);
    if (fail) st.querySelector('.as-line').textContent += ' ' + tr('· 실패 {fail}%', { fail: Math.round(fail * 100) });
    if (brk) st.querySelector('.as-line').textContent += ' ' + tr('· 파괴 {brk}%', { brk: Math.round(brk * 100) });
    this.anvilRisk(fail, brk);
  },
  anvilRisk(fail: number, brk: number, none?: boolean) {
    const st = $('#anvil-stage'); if (!st) return;
    const ok = none ? 0 : Math.max(0, 1 - fail - brk);
    const [a, b, c] = ['.ok', '.fail', '.brk'].map(s => st.querySelector('.as-risk ' + s));
    a.style.width = (ok * 100) + '%'; b.style.width = (fail * 100) + '%'; c.style.width = (brk * 100) + '%';
    st.querySelector('.as-risk').title = none ? '' : tr('· 실패 {fail}%', { fail: Math.round(fail * 100) }) + ' ' + tr('· 파괴 {brk}%', { brk: Math.round(brk * 100) });
  },
  /** 망치 세 번 — 박자마다 불꽃 · 소리, 그다음 결말(성공 금빛 · 실패 잿빛 흔들림 · 파괴 붉은 금) */
  anvilStrike(i: number) {
    if (this.anvilBusy) return;
    const p = G.player, it = p.bag[i];
    if (!it) return;
    const e = it.e || 0, cost = G.enhCost(it), mat = G.enhMat(e);
    const st = $('#anvil-stage');
    /* 못 하는 것(최대 · 금화 · 재료)은 망치질 없이 바로 — 까닭은 enhanceSlot 이 알린다 */
    if (!st || !this.motionOn() || e >= G.ENH_MAX || p.gold < cost || !p.hasAll({ [mat.id]: mat.n })) {
      const res = G.enhanceSlot(i);
      if (st) this.anvilEnd(res, it);
      return;
    }
    this.anvilShow(it); this.anvilBusy = true; st.classList.add('busy');
    const item = st.querySelector('.as-item'), ham = st.querySelector('.as-ham'), beat = 240;
    for (let k = 0; k < 3; k++) setTimeout(() => {
      this.pop(ham, 'hit', 240); this.pop(item, 'jolt', 200);
      this.sparkAt(item.getBoundingClientRect(), k === 2 ? '#ffe8a0' : '#ffa040', 6 + k * 3, 38 + k * 10);
      G.sfx && G.sfx('hit_blunt');
    }, k * beat);
    // 박자 사이에 가방이 바뀌었을 수 있다 — 칸 번호가 아니라 그 물건을 다시 찾는다
    setTimeout(() => { this.anvilBusy = false; st.classList.remove('busy'); const j = G.player.bag.indexOf(it); if (j >= 0) this.anvilEnd(G.enhanceSlot(j), it); }, 3 * beat + 60);
  },
  anvilEnd(res: string | null, it: Bag) {
    const st = $('#anvil-stage'); if (!st) return;
    if (!res) { this.pop(st, 'deny', 400); return; }
    const item = st.querySelector('.as-item'), out = st.querySelector('.as-res'), at = item.getBoundingClientRect();
    out.textContent = res === 'fail' ? '=' : '+' + (it.e || 0);
    for (const c of ['r-ok', 'r-fail', 'r-brk']) st.classList.remove(c);
    const cls = res === 'ok' ? 'r-ok' : res === 'fail' ? 'r-fail' : 'r-brk';
    this.pop(st, cls, 1000);
    if (res === 'ok') this.sparkAt(at, '#ffd27a', 18, 70);
    else if (res === 'break') this.sparkAt(at, '#e0564c', 14, 54);
    this.anvilShow(it);
  }
};
mixin(UI, UIMotionPart);
