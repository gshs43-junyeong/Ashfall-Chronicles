// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== ui/machine.js — 기계 창 ===== */
import { app as G } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { makeSlot } from '../../engine/ui/slots.js';
import { tr } from '../lang.js';
import { ITEMS } from '../data/items.js';
import { FUEL, MACHINE, MRECIPES } from '../data/recipes.js';
import { Art } from '../itemart.js';
import { makeItem } from '../entity.js';
import { DIR_NAME, FAC_TICK, Factory } from '../factory.js';
import { $, $$, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const MachineUIPart = {

  /* ---------------- 기계 ---------------- */
  openMachine(m) {
    this.closePanel();
    this.machRef = m; this._machSig = null;
    this.panels.show('machine'); G.uiOpen = true;
    this.refreshMachine(true);
  },
  /** id별 개수 묶음을 클릭 가능한 칸으로 */
  bufGrid(buf, cls) {
    let h = '';
    for (const k in buf) {
      if (!buf[k]) continue;
      h += `<div class="slot ${cls}" data-id="${k}"><span class="ic"></span><span class="cnt">${buf[k]}</span></div>`;
    }
    return h || `<div class="mach-empty">${tr('비어 있음')}</div>`;
  },
  /** 창을 다시 짜야 하는 것만 모은 열쇠 — 상태·전력·진행처럼 계속 바뀌는 값은 machLive 가 제자리에서 고친다.
      ★ 0.1초마다 통째로 다시 짜면 누르는 사이에 칸이 바뀌어 클릭이 씹히고 툴팁이 깜빡였다. */
  machSig(m, p) {
    // 개수는 빼고 **무엇이 어느 칸에 있는가**만 — 개수는 machLive 가 고친다(도는 기계는 매 틱 개수가 바뀐다)
    const j = b => b ? Object.keys(b).filter(k => b[k] > 0).join(',') : '';
    const ok = m.in && MACHINE[m.t].proc ? MRECIPES.map(r => r.m === MACHINE[m.t].proc &&
      Object.keys(r.in).every(k => (m.in[k] || 0) >= r.in[k]) ? 1 : 0).join('') : '';
    return [m.t, m.on, m.dir, m.feed, m.f, m.rec, j(m.in), j(m.out), ok, m.it ? m.it.id : '',
      m.items ? m.items.map(it => it ? it.id : '').join(',') : '',
      p.bag.map(it => it ? it.id : '').join(','), m.net].join('|');
  },
  /** 계속 바뀌는 값 — 상태 · 전력망 · 축전 · 연료 · 진행 막대 */
  machLive(m) {
    const s = MACHINE[m.t], w = G.world;
    const st = $('#mach-st');
    if (st) st.innerHTML = `<span class="mdot" style="background:${Factory.statusColor(m)}"></span><b>${Factory.stLabel(m)}</b>` +
      (s.rot ? ` ${tr('· 방향 <b>{dirName}</b>', { dirName: DIR_NAME[m.dir] })}` : '');
    const net = $('#mach-net');
    if (net) {
      const n = m.net >= 0 ? w.nets[m.net] : null;
      if (!n) { net.className = 'mach-row lack'; net.textContent = tr('전력망에 이어져 있지 않다 — 반경 5칸 안에 전주를 세워라.'); }
      else {
        const pct = Math.round(n.sat * 100);
        net.className = 'mach-row';
        net.innerHTML = tr('전력망 #{n} · 발전 <b>{gen}</b> / 수요 <b>{dem}</b>', { n: m.net + 1, gen: n.gen, dem: n.dem }) +
          ` ${tr('· 충족')} <b class="${pct < 100 ? 'lack' : ''}">${pct}%</b>` +
          (n.emax ? ` ${tr('· 축전 <b>{e}</b>/{emax}', { e: Math.round(n.e), emax: n.emax })}` : '') +
          (n.off ? ` · <b class="lack">${tr('정지 스위치 내려짐</b>')}` : '');
      }
    }
    const sto = $('#mach-store');
    if (sto) sto.textContent = tr('축전 잔량 {e} / {store}', { e: Math.round(m.e), store: s.store });
    const fu = $('#mach-fuel');
    if (fu) {
      let left = 0;
      for (const k in m.in) if (FUEL[k]) left += m.in[k] * FUEL[k];
      fu.textContent = tr('연료 — 타는 중 {n}초 · 넣어 둔 연료로 {n2}초 더', { n: (m.fuel * FAC_TICK).toFixed(1), n2: Math.round(left * FAC_TICK) });
    }
    // 개수 — 칸 구성은 같고 수만 바뀐 경우
    for (const [sel, buf] of [['#mg-in', m.in], ['#mg-out', m.out]])
      if (buf) $$(sel + ' .slot').forEach(el => { const c = el.querySelector('.cnt'); if (c) c.textContent = buf[el.dataset.id] || ''; });
    const cnt = (sel, arr) => { const els = $$(sel + ' .slot'); els.forEach(el => { const it = arr[+el.dataset.i]; const c = el.querySelector('.cnt'); if (c && it) c.textContent = it.c > 1 ? it.c : ''; }); };
    if (m.items) cnt('#mg-store', m.items);
    cnt('#mg-bag', G.player.bag);
    const pr = $('#mach-prog');
    if (pr) {
      const r = m.rec >= 0 ? MRECIPES[m.rec] : null;
      const k = r ? clamp(m.prog / r.t, 0, 1) : 0;
      pr.querySelector('i').style.width = (k * 100).toFixed(1) + '%';
      pr.querySelector('span').textContent = r
        ? Object.keys(r.out).map(id => ITEMS[id].n + ' ×' + r.out[id]).join(' · ') + ` ${tr('— {n}% · {n2}초 남음', { n: Math.round(k * 100), n2: ((r.t - m.prog) * FAC_TICK).toFixed(1) })}`
        : tr('만들 것이 없다 — 아래 목록의 재료를 넣어라');
    }
  },
  refreshMachine(force) {
    const m = this.machRef; if (!m) return;
    const s = MACHINE[m.t], w = G.world, p = G.player;
    // 방금 설치한 기계를 바로 열면 아직 전력망 계산 전이라 "망 없음"으로 보인다 — 먼저 갱신
    if (w.netDirty) Factory.buildNets(w);
    const sig = this.machSig(m, p);
    if (!force && sig === this._machSig) { this.machLive(m); return; }
    this._machSig = sig;
    $('#mach-title').textContent = s.n;

    // ---- 상태 줄 ----
    let info = `<div class="mach-desc">${s.d}</div><div class="mach-row" id="mach-st"></div>`;
    if (s.power || s.gen || s.store) {
      info += '<div class="mach-row" id="mach-net"></div>';
      if (s.power) info += `<div class="mach-row dim">${tr('소비 {power}/틱 (1틱 = {facTick}초)', { power: s.power, facTick: FAC_TICK })}</div>`;
      if (s.gen) info += `<div class="mach-row dim">${tr('생산 {gen}/틱', { gen: s.gen })}</div>`;
      if (s.store) info += '<div class="mach-row dim" id="mach-store"></div>';
    }
    if (s.fuelIn) info += '<div class="mach-row dim" id="mach-fuel"></div>';
    if (m.t === 'sorter') {
      info += `<div class="mach-row">${tr('필터: <b>{v}</b>', { v: m.f ? ITEMS[m.f].n : tr('없음 (전부 통과)') })}` +
        ` <span class="dim">${tr('— 맞는 것은 앞으로, 나머지는 시계 방향 옆으로. 아래 가방 칸을 클릭해 지정')}</span></div>`;
    }
    if (s.proc) info += '<div class="mach-prog" id="mach-prog"><i></i><span></span></div>';

    // ---- 버튼 ----
    let btns = `<button class="mbtn" data-act="power">${m.on ? tr('■ 정지') : tr('▶ 가동')}</button>`;
    if (s.rot) btns += `<button class="mbtn" data-act="rot">${tr('↻ 방향 돌리기')}</button>`;
    if (s.slots) btns += `<button class="mbtn" data-act="feed">${m.feed ? tr('배출 끄기') : tr('배출 켜기')}</button>`;
    if (m.t === 'sorter' && m.f) btns += `<button class="mbtn" data-act="clearf">${tr('필터 해제')}</button>`;
    if ((m.out && Factory.bufTotal(m.out)) || (m.items && m.items.some(Boolean)))
      btns += `<button class="mbtn" data-act="takeall">${tr('⤓ 전부 가방으로')}</button>`;

    // ---- 만드는 것 — 이 기계의 제작법. 지금 하는 것은 금색, 재료가 다 들어 있으면 초록 ----
    const ic = id => `<span class="ri" style="background-image:url(${Art.itemUrl(id)})" title="${ITEMS[id].n}"></span>`;
    let recs = '';
    if (s.proc) {
      MRECIPES.forEach((r, i) => {
        if (r.m !== s.proc) return;
        let ok = true;
        for (const k in r.in) if ((m.in[k] || 0) < r.in[k]) { ok = false; break; }
        const side = o => Object.keys(o).map(k => `${ic(k)}<small>${o[k]}</small>`).join('');
        recs += `<div class="mrec${i === m.rec ? ' cur' : ok ? ' ok' : ''}">${side(r.in)}<b>→</b>${side(r.out)}` +
          `${tr('<em>{n}초</em>', { n: (r.t * FAC_TICK).toFixed(1) })}</div>`;
      });
    }

    // ---- 내용물 ----
    let body = '';
    if (s.slots) {
      body += `<div class="mach-sec">${tr('보관')} <small>${tr('(클릭해서 가방으로)')}</small></div><div class="mach-grid" id="mg-store"></div>`;
    } else {
      if (m.in) body += `<div class="mach-sec">${tr('투입')} <small>${tr('(클릭해서 되찾기)')}</small></div><div class="mach-grid" id="mg-in">` + this.bufGrid(m.in, 'mi') + '</div>';
      if (m.out) body += `<div class="mach-sec">${tr('산출')} <small>${tr('(클릭해서 가방으로)')}</small></div><div class="mach-grid" id="mg-out">` + this.bufGrid(m.out, 'mo') + '</div>';
      if (m.it) body += `<div class="mach-sec">${tr('이송 중')} <small>${tr('(3초 넘게 멈춘 물건은 클릭해서 가방으로)')}</small></div><div class="mach-grid">` +
        `<div class="slot" id="mg-it"><span class="ic" style="background-image:url(${Art.itemUrl(m.it.id)})"></span></div></div>`;
    }
    if (recs) body += `<div class="mach-sec">${tr('만드는 것')} <small>${tr('(재료가 다 들어 있으면 초록 · 지금 만드는 것은 금색)')}</small></div><div class="mrecs">${recs}</div>`;
    body += `<div class="mach-sec">${tr('소지품')} <small>(${m.t === 'sorter' ? tr('클릭해서 필터 지정') : tr('클릭해서 기계에 넣기 · 흐린 것은 이 기계가 안 받는다')})</small></div><div class="mach-grid" id="mg-bag"></div>`;

    $('#mach-body').innerHTML = info + '<div class="mach-btns">' + btns + '</div>' + body;
    this.machLive(m);

    // ---- 연결 ----
    /* 누르는 순간 처리한다 — 떼는 사이에 창이 다시 짜이면 click 이 사라진다 */
    const press = (el, fn) => el.addEventListener('mousedown', e => { if (e.button === 0) { e.preventDefault(); fn(); } });
    $$('#mach-body .mbtn').forEach(b => press(b, () => {
      const a = b.dataset.act;
      let snd = 'place';
      if (a === 'power') {
        m.on = m.on ? 0 : 1;
        if (m.t === 'switch') { w.netDirty = true; snd = m.on ? 'power_on' : 'power_off'; }
      }
      else if (a === 'rot') Factory.rotate(m);
      else if (a === 'feed') m.feed = m.feed ? 0 : 1;
      else if (a === 'clearf') m.f = null;
      else if (a === 'takeall') {
        let full = false;
        if (m.out) for (const k of Object.keys(m.out)) if (Factory.playerTake(w, m, 'out', k, p) < 1) full = true;
        if (m.items) m.items.forEach((it, i) => { if (!it) return; if (p.addItem(it)) m.items[i] = null; else full = true; });
        if (full) this.toast(tr('가방이 가득 찼다'), 'bad');
        this.refreshBag();
      }
      G.sfx(snd); this.refreshMachine(true);
    }));
    const itEl = $('#mg-it');
    if (itEl) press(itEl, () => {
      if (Factory.takeStalled(m, p)) { this.refreshMachine(true); this.refreshBag(); G.sfx('place'); }
      else this.toast(Factory.stalled(m) ? tr('가방이 가득 찼다') : tr('움직이는 중이다 — 3초 넘게 멈춘 것만 꺼낼 수 있다'), 'bad');
    });
    const store = $('#mg-store');
    if (store) {
      m.items.forEach((it, i) => {
        const d = makeSlot('slot' + (it ? ' r' + it.r : ''), { data: { i }, fill: it ? { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' } : undefined,
          enter: e => this.showTip(it, e), leave: () => this.hideTip() }, store);
        press(d, () => {
          if (!it) return;
          if (p.addItem(it)) { m.items[i] = null; this.refreshMachine(true); this.refreshBag(); }
          else { this.toast(tr('가방이 가득 찼다'), 'bad'); this.refreshMachine(true); }
        });
      });
    }
    for (const [sel, which] of [['#mg-in', 'in'], ['#mg-out', 'out']]) {
      const host = $(sel); if (!host) continue;
      $$(sel + ' .slot').forEach(el => {
        const id = el.dataset.id;
        this.setIcon(el.querySelector('.ic'), Art.itemUrl(id));
        press(el, () => {
          if (Factory.playerTake(w, m, which, id, p) <= 0) this.toast(tr('가방이 가득 찼다'), 'bad');
          this.refreshMachine(true); this.refreshBag();
        });
        el.addEventListener('mouseenter', e => this.showTip(makeItem(id, 1, 0), e));
        el.addEventListener('mouseleave', () => this.hideTip());
      });
    }
    const bag = $('#mg-bag');
    const order = p.bag.map((it, i) => i).filter(i => p.bag[i]);
    const yes = i => m.t === 'sorter' || Factory.accepts(m, p.bag[i].id);
    order.sort((a2, b2) => (yes(b2) ? 1 : 0) - (yes(a2) ? 1 : 0) || a2 - b2);   // 받는 것을 앞으로
    for (const i of order) {
      const it = p.bag[i];
      const d = makeSlot('slot r' + it.r + (yes(i) ? '' : ' no'), { data: { i }, fill: { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' },
        enter: e => this.showTip(it, e), leave: () => this.hideTip() }, bag);
      press(d, () => {
        if (m.t === 'sorter') { m.f = it.id; this.refreshMachine(true); G.sfx('place'); return; }
        if (Factory.playerInsert(w, m, i, p) > 0) { this.refreshMachine(true); this.refreshBag(); G.sfx('place'); }
        else this.toast(yes(i) ? (m.on ? tr('더 들어갈 자리가 없다') : tr('멈춘 기계에는 넣을 수 없다')) : tr('이 기계가 받지 않는 물건이다'), 'bad');
      });
    }
  },
};
mixin(UI, MachineUIPart);
