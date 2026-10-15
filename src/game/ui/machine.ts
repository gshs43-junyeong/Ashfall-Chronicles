/* ===== ui/machine.js — 기계 창 ===== */
import { app as G } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { makeSlot } from '../../engine/ui/slots.js';
import { tr } from '../lang.js';
import { ITEMS } from '../data/items.js';
import { FUEL, MACHINE, MRECIPES } from '../data/recipes.js';
import { Art } from '../itemart.js';
import { makeItem } from '../items.js';
import { DIR_NAME, FAC_TICK, Factory, GATE_CONDS, ITEM_CATS } from '../factory.js';
import { $, $$, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const MachineUIPart: Bag = {

  /* ---------------- 기계 ---------------- */
  openMachine(m: any) {
    this.closePanel();
    this.machRef = m; this._machSig = null; this._machK = 0;
    this.panels.show('machine'); G.uiOpen = true;
    this.refreshMachine(true);
    this.machViewStart();
  },
  /** id별 개수 묶음을 클릭 가능한 칸으로 */
  bufGrid(buf: any, cls: string) {
    let h = '';
    for (const k in buf) {
      if (!buf[k]) continue;
      h += `<div class="slot ${cls}" data-id="${k}"><span class="ic"></span><span class="cnt">${buf[k]}</span></div>`;
    }
    return h || `<div class="mach-empty">${tr('비어 있음')}</div>`;
  },
  /** 창을 다시 짜야 하는 것만 모은 열쇠 — 상태·전력·진행처럼 계속 바뀌는 값은 machLive 가 제자리에서 고친다.
      ★ 0.1초마다 통째로 다시 짜면 누르는 사이에 칸이 바뀌어 클릭이 씹히고 툴팁이 깜빡였다. */
  machSig(m: any, p: Player) {
    // 개수는 빼고 **무엇이 어느 칸에 있는가**만 — 개수는 machLive 가 고친다(도는 기계는 매 틱 개수가 바뀐다)
    const j = (b: any) => b ? Object.keys(b).filter(k => b[k] > 0).join(',') : '';
    const ok = m.in && MACHINE[m.t].proc ? MRECIPES.map(r => r.m === MACHINE[m.t].proc &&
      Object.keys(r.in).every(k => (m.in[k] || 0) >= r.in[k]) ? 1 : 0).join('') : '';
    const cfg = m.t === 'converter' ? JSON.stringify([m.r, m.ri]) : m.t === 'gate_if' ? [m.ck, m.cv, m.cn, m.els].join() : m.t === 'gate_or' ? [m.fs.join(), m.els].join() : '';
    return [m.t, m.on, m.dir, m.feed, m.f, m.rec, j(m.in), j(m.out), ok, m.it ? m.it.id : '', cfg,
      m.items ? m.items.map((it: Bag) => it ? it.id : '').join(',') : '',
      p.bag.map((it: Bag) => it ? it.id : '').join(','), m.net].join('|');
  },
  /** 계속 바뀌는 값 — 상태 · 전력망 · 축전 · 연료 · 진행 막대 */
  machLive(m: any) {
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
        net.className = 'mach-row' + (n.gen > 0 && n.sat > 0 && !n.off ? ' flow' : '');   // 전기가 흐르는 줄은 빛이 지나간다
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
    // 수가 늘면 칸이 한 번 튄다 — 벨트로 들어오고 기계가 뱉는 것이 눈에 보이게
    const setN = (el: HTMLElement, c: Element | null, v: any) => {
      if (!c) return;
      const t = String(v || ''), was = +(c.textContent || 0) || (c.textContent ? 1 : 0);
      if (c.textContent === t) return;
      c.textContent = t;
      if ((+t || (t ? 1 : 0)) > was) this.pop(el, 'bump', 260);
    };
    for (const [sel, buf] of [['#mg-in', m.in], ['#mg-out', m.out]])
      if (buf) $$(sel + ' .slot').forEach(el => setN(el, el.querySelector('.cnt'), buf[el.dataset.id]));
    const cnt = (sel: string, arr: any) => { const els = $$(sel + ' .slot'); els.forEach(el => { const it = arr[+el.dataset.i]; if (it) setN(el, el.querySelector('.cnt'), it.c > 1 ? it.c : ''); }); };
    if (m.items) cnt('#mg-store', m.items);
    cnt('#mg-bag', G.player.bag);
    const pr = $('#mach-prog');
    if (pr) {
      const r = m.rec >= 0 ? MRECIPES[m.rec] : null;
      const k = r ? clamp(m.prog / r.t, 0, 1) : 0;
      pr.querySelector('i').style.width = (k * 100).toFixed(1) + '%';
      pr.classList.toggle('run', !!r && m.on && k > 0);
      // 막대가 차서 처음으로 돌아갔다 = 한 벌 나왔다
      if (r && this._machK > 0.6 && k < this._machK - 0.4) { this.pop(pr, 'done', 500); this.sparkAt(pr.getBoundingClientRect(), '#bfe07a', 8, 40); }
      this._machK = k;
      pr.querySelector('span').textContent = r
        ? Object.keys(r.out).map(id => ITEMS[id].n + ' ×' + r.out[id]).join(' · ') + ` ${tr('— {n}% · {n2}초 남음', { n: Math.round(k * 100), n2: ((r.t - m.prog) * FAC_TICK).toFixed(1) })}`
        : tr('만들 것이 없다 — 아래 목록의 재료를 넣어라');
    }
  },
  refreshMachine(force: any) {
    const m = this.machRef; if (!m) return;
    const s = MACHINE[m.t], w = G.world, p = G.player;
    // 방금 설치한 기계를 바로 열면 아직 전력망 계산 전이라 "망 없음"으로 보인다 — 먼저 갱신
    if (w.netDirty) Factory.buildNets(w);
    const sig = this.machSig(m, p);
    if (!force && sig === this._machSig) { this.machLive(m); return; }
    this._machSig = sig;
    $('#mach-title').textContent = s.n;

    // ---- 상태 줄 ----
    let info = `<canvas id="mach-view"></canvas><div class="mach-desc">${s.d}</div><div class="mach-row" id="mach-st"></div>`;   // 가동 과정(ui/process)
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
    if (s.mix || s.gate) info += this.logicCfg(m);
    if (s.proc) info += '<div class="mach-prog" id="mach-prog"><i></i><span></span></div>';

    // ---- 버튼 ----
    let btns = `<button class="mbtn" data-act="power">${m.on ? tr('■ 정지') : tr('▶ 가동')}</button>`;
    if (s.rot) btns += `<button class="mbtn" data-act="rot">${tr('↻ 방향 돌리기')}</button>`;
    if (s.slots) btns += `<button class="mbtn" data-act="feed">${m.feed ? tr('배출 끄기') : tr('배출 켜기')}</button>`;
    if (m.t === 'sorter' && m.f) btns += `<button class="mbtn" data-act="clearf">${tr('필터 해제')}</button>`;
    if ((m.out && Factory.bufTotal(m.out)) || (m.items && m.items.some(Boolean)))
      btns += `<button class="mbtn" data-act="takeall">${tr('⤓ 전부 가방으로')}</button>`;

    // ---- 만드는 것 — 이 기계의 제작법. 지금 하는 것은 금색, 재료가 다 들어 있으면 초록 ----
    const ic = (id: string) => `<span class="ri" style="background-image:url(${Art.itemUrl(id)})" title="${ITEMS[id].n}"></span>`;
    let recs = '';
    if (s.proc) {
      MRECIPES.forEach((r, i) => {
        if (r.m !== s.proc) return;
        let ok = true;
        for (const k in r.in) if ((m.in[k] || 0) < r.in[k]) { ok = false; break; }
        const side = (o: Bag) => Object.keys(o).map(k => `${ic(k)}<small>${o[k]}</small>`).join('');
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
    const bagHint = m.t === 'sorter' ? tr('클릭해서 필터 지정') : m.t === 'converter' ? tr('클릭해서 비율에 더하기 · 또 누르면 몫이 는다')
      : m.t === 'gate_if' ? tr('클릭해서 조건 물건 지정') : m.t === 'gate_or' ? tr('클릭해서 고른 것에 더하기(셋까지)') : tr('클릭해서 기계에 넣기 · 흐린 것은 이 기계가 안 받는다');
    body += `<div class="mach-sec">${tr('소지품')} <small>(${bagHint})</small></div><div class="mach-grid" id="mg-bag"></div>`;

    $('#mach-body').innerHTML = info + '<div class="mach-btns">' + btns + '</div>' + body;
    this.machLive(m);

    // ---- 연결 ----
    /* 누르는 순간 처리한다 — 떼는 사이에 창이 다시 짜이면 click 이 사라진다 */
    const press = (el: any, fn: any) => el.addEventListener('mousedown', (e: any) => { if (e.button === 0) { e.preventDefault(); fn(); } });
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
      else if (this.logicAct(m, a)) { /* 컨버터 · 분기기 설정 */ }
      else if (a === 'takeall') {
        let full = false;
        if (m.out) for (const k of Object.keys(m.out)) if (Factory.playerTake(w, m, 'out', k, p) < 1) full = true;
        if (m.items) m.items.forEach((it: Bag, i: number) => { if (!it) return; if (p.addItem(it)) m.items[i] = null; else full = true; });
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
      m.items.forEach((it: Bag, i: number) => {
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
        el.addEventListener('mouseenter', (e: any) => this.showTip(makeItem(id, 1, 0), e));
        el.addEventListener('mouseleave', () => this.hideTip());
      });
    }
    const bag = $('#mg-bag');
    const order = p.bag.map((it: Bag, i: number) => i).filter((i: number) => p.bag[i]);
    const pick = m.t === 'sorter' || m.t === 'converter' || m.t === 'gate_if' || m.t === 'gate_or';   // 가방 칸 = 고르기
    const yes = (i: number) => pick || Factory.accepts(m, p.bag[i].id);
    order.sort((a2: any, b2: any) => (yes(b2) ? 1 : 0) - (yes(a2) ? 1 : 0) || a2 - b2);   // 받는 것을 앞으로
    for (const i of order) {
      const it = p.bag[i];
      const d = makeSlot('slot r' + it.r + (yes(i) ? '' : ' no'), { data: { i }, fill: { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' },
        enter: e => this.showTip(it, e), leave: () => this.hideTip() }, bag);
      press(d, () => {
        if (m.t === 'sorter') { m.f = it.id; this.refreshMachine(true); G.sfx('place'); return; }
        if (pick) { if (!this.logicPick(m, it.id)) this.toast(tr('셋까지만 고를 수 있다'), 'bad'); this.refreshMachine(true); G.sfx('place'); return; }
        if (Factory.playerInsert(w, m, i, p) > 0) { this.refreshMachine(true); this.refreshBag(); G.sfx('place'); }
        else this.toast(yes(i) ? (m.on ? tr('더 들어갈 자리가 없다') : tr('멈춘 기계에는 넣을 수 없다')) : tr('이 기계가 받지 않는 물건이다'), 'bad');
      });
    }
  },

  /* ---------------- 컨버터 · 분기기 설정 ---------------- */
  /** 설정 줄 — 단추는 mbtn(data-act)이라 위 press 가 받는다 */
  logicCfg(m: any) {
    const ic = (id: string) => `<span class="ri" style="background-image:url(${Art.itemUrl(id)})"></span>`;
    const nm = (f: string) => f.startsWith('cat:') ? tr(ITEM_CATS.find(c => c[0] === f.slice(4))![1]) : ITEMS[f] ? ITEMS[f].n : f;
    const chip = (f: string) => f.startsWith('cat:') ? `<b class="lg-cat">${nm(f)}</b>` : `${ic(f)}<b>${nm(f)}</b>`;
    const els = `<button class="mbtn sm" data-act="els">${tr('ELSE 쪽: {side}', { side: (m.els || 1) === 1 ? tr('시계 방향 옆') : tr('반시계 방향 옆') })}</button>`;
    let h = '<div class="mach-logic">';
    if (m.t === 'converter') {
      const next = m.r.length ? m.r[m.ri % m.r.length].id : null;
      h += `<div class="lg-head">${tr('비율')} <small>${m.r.length ? m.r.map((e: Bag) => e.n).join(' : ') : tr('없음 — 들어온 것을 번갈아 합류')}</small></div>`;
      m.r.forEach((e: Bag, i: number) => {
        h += `<div class="lg-row${e.id === next ? ' cur' : ''}">${chip(e.id)}<span class="lg-n">${e.n}</span>` +
          `<button class="mbtn sm" data-act="rdec:${i}">−</button><button class="mbtn sm" data-act="rinc:${i}">+</button>` +
          `<button class="mbtn sm" data-act="rdel:${i}">✕</button></div>`;
      });
      if (m.r.length) h += `<div class="lg-row dim">${tr('다음 차례: {item}', { item: nm(next!) })} <button class="mbtn sm" data-act="clearr">${tr('비율 비우기')}</button></div>`;
    } else if (m.t === 'gate_if') {
      h += `<div class="lg-head">IF</div><div class="lg-row">` + GATE_CONDS.map(([k, n]) => `<button class="mbtn sm${m.ck === k ? ' on' : ''}" data-act="ck:${k}">${tr(n)}</button>`).join('') + '</div>';
      if (m.ck === 'item') h += `<div class="lg-row">${m.cv ? chip(m.cv) : `<span class="dim">${tr('물건 없음 — 아래 가방에서 고른다(고르기 전엔 전부 앞)')}</span>`}</div>`;
      if (m.ck === 'cat') h += '<div class="lg-row">' + ITEM_CATS.map(([k, n]) => `<button class="mbtn sm${m.cv === k ? ' on' : ''}" data-act="cv:${k}">${tr(n)}</button>`).join('') + '</div>';
      if (m.ck === 'every') h += `<div class="lg-row">${tr('{n}개마다 하나만 앞으로, 나머지는 옆으로', { n: m.cn })} <button class="mbtn sm" data-act="cn-">−</button><button class="mbtn sm" data-act="cn+">+</button></div>`;
      h += `<div class="lg-row"><span class="lg-tf t">${tr('참 → 앞')}</span><span class="lg-tf f">${tr('거짓 → 옆')}</span>${els}</div>`;
    } else {
      h += `<div class="lg-head">OR <small>${tr('하나라도 맞으면 앞으로')}</small></div>`;
      h += '<div class="lg-row">' + (m.fs.length ? m.fs.map((f: string, i: number) => `<span class="lg-or">${i ? '<i>OR</i>' : ''}${chip(f)}<button class="mbtn sm" data-act="fsdel:${i}">✕</button></span>`).join('')
        : `<span class="dim">${tr('고른 것 없음 — 전부 앞으로')}</span>`) + '</div>';
      h += '<div class="lg-row">' + ITEM_CATS.map(([k, n]) => `<button class="mbtn sm" data-act="fscat:${k}">+ ${tr(n)}</button>`).join('') + '</div>';
      h += `<div class="lg-row"><span class="lg-tf t">${tr('참 → 앞')}</span><span class="lg-tf f">${tr('거짓 → 옆')}</span>${els}</div>`;
    }
    return h + '</div>';
  },
  /** 설정 단추 — 처리했으면 true */
  logicAct(m: any, a: string) {
    const [k, v] = a.split(':'), i = +v;
    if (m.t === 'converter') {
      if (k === 'rinc') m.r[i].n = Math.min(9, m.r[i].n + 1);
      else if (k === 'rdec') m.r[i].n = Math.max(1, m.r[i].n - 1);
      else if (k === 'rdel') m.r.splice(i, 1);
      else if (k === 'clearr') m.r.length = 0;
      else return false;
      m.ri = 0; m.rc = 0;                                  // 비율을 고치면 처음 차례부터
      return true;
    }
    if (k === 'els') { m.els = (m.els || 1) === 1 ? 3 : 1; return true; }
    if (m.t === 'gate_if') {
      if (k === 'ck') { m.ck = v; m.cv = null; m.k = 0; }
      else if (k === 'cv') m.cv = v;
      else if (k === 'cn+') m.cn = Math.min(9, (m.cn | 0) + 1);
      else if (k === 'cn-') m.cn = Math.max(2, (m.cn | 0) - 1);
      else return false;
      return true;
    }
    if (m.t === 'gate_or') {
      if (k === 'fsdel') m.fs.splice(i, 1);
      else if (k === 'fscat') { if (!m.fs.includes('cat:' + v) && m.fs.length < 3) m.fs.push('cat:' + v); }
      else return false;
      return true;
    }
    return false;
  },
  /** 가방 칸으로 고르기 — 셋을 넘으면 false */
  logicPick(m: any, id: string) {
    if (m.t === 'converter') {
      const e = m.r.find((q: Bag) => q.id === id);
      if (e) { e.n = Math.min(9, e.n + 1); return true; }
      if (m.r.length >= 3) return false;
      m.r.push({ id, n: 1 }); m.ri = 0; m.rc = 0; return true;
    }
    if (m.t === 'gate_if') { m.ck = 'item'; m.cv = id; return true; }
    if (m.fs.includes(id)) return true;
    if (m.fs.length >= 3) return false;
    m.fs.push(id); return true;
  },
};
mixin(UI, MachineUIPart);
