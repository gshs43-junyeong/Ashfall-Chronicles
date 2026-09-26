/* ===== ui/shop.js — 상자 · 상점 · 여명 마을 시설 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { makeSlot } from '../../engine/ui/slots.js';
import { fmt, tr } from '../lang.js';
import { ITEMS } from '../data/items.js';
import { NPCS } from '../data/npcs.js';
import { idef } from '../data/values.js';
import { Art } from '../itemart.js';
import { isGear, makeItem } from '../entity.js';
import { $, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const ShopUIPart = {

  /* ---------------- 상자 / 상점 ---------------- */
  openChest(obj) {
    this.closePanel();
    this.chestRef = obj; this.shopRef = null;
    $('#chest-title').textContent = tr('상자');
    this.panels.show('chest'); G.uiOpen = true;
    this.refreshChest();
  },
  openShop(npcId) {
    this.closePanel();
    this.shopRef = npcId; this.chestRef = null; this.shopMode = 'buy';
    let toggle = $('#shop-mode-btn');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'shop-mode-btn'; toggle.className = 'x';
      toggle.style.cssText = 'width:auto;padding:2px 10px;font-size:12px';
      toggle.addEventListener('click', () => { this.shopMode = this.shopMode === 'buy' ? 'sell' : 'buy'; this.refreshChest(); });
      $('#panel-chest header').insertBefore(toggle, $('#panel-chest header .x'));
    }
    toggle.style.display = '';
    toggle.textContent = tr('판매하기 ▸');
    this.panels.show('chest'); G.uiOpen = true;
    this.refreshChest();
  },
  shopTitle() {
    const rate = G.marketRate ? Math.round((G.goldRate || 1) * 100) : 100;
    const arrow = rate > 105 ? ' 📈' : rate < 95 ? ' 📉' : '';
    return tr('{npc}의 상점 — 🪙 {gold} · 환율 {rate}%{arrow}', { npc: NPCS[this.shopRef].n, gold: fmt(G.player.gold), rate, arrow });
  },
  refreshChest() {
    const g = $('#chest-grid'); g.innerHTML = '';
    const toggle = $('#shop-mode-btn');
    if (this.shopRef) {
      if (toggle) { toggle.style.display = ''; toggle.textContent = this.shopMode === 'buy' ? tr('판매하기 ▸') : tr('◂ 구매하기'); }
      if (this.shopMode === 'sell') {
        const p = G.player;
        p.bag.forEach((it, i) => {
          if (!it) return;
          const price = Math.round(G.price(it) * 0.5);
          makeSlot('slot' + (it.r ? ' r' + it.r : ''), { fill: { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' },
            click: () => G.sellItem(i), enter: e => this.showTip(it, e, tr('판매가 🪙 {price}', { price })), leave: () => this.hideTip() }, g);
        });
        $('#chest-title').textContent = this.shopTitle();
        return;
      }
      /* 재고가 날마다 바뀌는 상인(dynamicShop)은 정적 shop 배열 대신 G가 굴려 둔 재고를 읽는다. */
      if (NPCS[this.shopRef].dynamicShop) {
        const npc = this.shopRef, m = G.merchantOf(npc);
        const stock = G.stockOf(npc);
        if (!stock.length) {
          g.innerHTML = `<div class="st-info">${tr('오늘은 다 팔렸다. 내일 다시 오라는군.')}</div>`;
          $('#chest-title').textContent = this.shopTitle();
          return;
        }
        stock.forEach((row, i) => {
          const it = makeItem(row.id, row.c, 0);
          const price = G.buyPrice(it, m.markup);
          makeSlot('slot', { fill: { icon: Art.itemUrl(row.id), count: price, extra: row.c > 1 ? `<span class="num">×${row.c}</span>` : '' },
            click: () => G.buyStock(npc, i), enter: e => this.showTip(it, e, tr('가격 🪙 {price} · 오늘 재고 {row}개', { price, row: row.c })), leave: () => this.hideTip() }, g);
        });
        $('#chest-title').textContent = this.shopTitle();
        return;
      }
      const list = NPCS[this.shopRef].shop || [];
      list.forEach(id => {
        const it = makeItem(id, G.shopBundle(id), 0);
        const price = G.buyPrice(it, 1, this.shopRef);
        makeSlot('slot', { fill: { icon: Art.itemUrl(id), count: price },
          click: () => G.buy(id, this.shopRef), enter: e => this.showTip(it, e, tr('가격 🪙 {price}', { price })), leave: () => this.hideTip() }, g);
      });
      $('#chest-title').textContent = this.shopTitle();
      return;
    }
    if (toggle) toggle.style.display = 'none';
    const c = this.chestRef; if (!c) return;
    (c.items || []).forEach((it, i) => {
      makeSlot('slot' + (it ? ' r' + it.r : ''), { fill: it ? { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' } : undefined,
        click: () => {
          if (!it) return;
          if (G.player.addItem(it)) { c.items[i] = null; G.onPickup(it); this.refreshChest(); this.refreshBag(); }
          else this.toast(tr('가방이 가득 찼다'), 'bad');
        },
        enter: e => this.showTip(it, e), leave: () => this.hideTip() }, g);
    });
  },

  /* ---------------- 여명 마을 시설 ---------------- */

  /** 보관고 — 가방과 별개로 유지되는 60칸 창고. */
  openVault() {
    this.closePanel();
    this.storeRef = null;
    this.panels.show('vault'); G.uiOpen = true;
    this.refreshVault();
  },
  /** 플레이어가 놓은 저장 상자 — 마을 보관고와 같은 두 칸짜리 화면을 그대로 쓴다. */
  openStore(obj) {
    this.closePanel();
    this.storeRef = obj;
    this.panels.show('vault'); G.uiOpen = true;
    this.refreshVault();
  },
  refreshVault() {
    const p = G.player;
    const store = this.storeRef ? this.storeRef.items : G.vault;
    const used = store.filter(Boolean).length;
    const label = this.storeRef ? (this.storeRef.gold ? tr('황금 저장 상자') : tr('저장 상자')) : tr('보관고');
    $('#vault-title').textContent = `${label} — ${used} / ${store.length}`;
    const goldRow = $('#vault-gold-row');
    if (goldRow) {
      goldRow.style.display = this.storeRef ? 'none' : 'flex';   // 마을 금고에만 있다
      $('#vault-gold-amt').textContent = fmt(G.vaultGold);
    }
    const fill = (host, arr, onClick) => {
      host.innerHTML = '';
      arr.forEach((it, i) => makeSlot('slot' + (it ? ' r' + it.r : ''), { fill: it ? { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' } : undefined,
        click: () => onClick(i), enter: e => this.showTip(it, e), leave: () => this.hideTip() }, host));
    };
    fill($('#vault-grid'), store, i => {
      const it = store[i]; if (!it) return;
      if (p.addItem(it)) { store[i] = null; this.refreshVault(); this.refreshBag(); G.sfx('place'); }
      else this.toast(tr('가방이 가득 찼다'), 'bad');
    });
    fill($('#vault-bag'), p.bag, i => {
      const it = p.bag[i]; if (!it) return;
      const slot = store.indexOf(null);
      if (slot < 0) { this.toast(tr('{label|이} 가득 찼다', { label }), 'bad'); return; }
      store[slot] = it; p.bag[i] = null;
      this.refreshVault(); this.refreshBag(); G.sfx('place');
    });
  },

  /** 의뢰 게시판 — 하루마다 갱신되는 반복 사냥 의뢰 */
  openBoard() {
    this.closePanel();
    if (!G.bounties || !G.bounties.length) G.rollBounties();
    this.panels.show('board'); G.uiOpen = true;
    this.refreshBoard();
  },
  refreshBoard() {
    const b = $('#board-body'); b.innerHTML = '';
    $('#board-title').textContent = tr('의뢰 게시판 — {dayCount}일차', { dayCount: G.dayCount });
    const note = document.createElement('div');
    note.className = 'qt-title';
    note.style.cssText = 'margin-bottom:8px;opacity:.75';
    note.textContent = tr('하루가 지나거나 여관에서 자고 나면 새 종이가 붙는다.');
    b.appendChild(note);
    (G.bounties || []).forEach((q, i) => {
      const pr = G.bountyProgress(q);
      const el = document.createElement('div');
      el.className = 'quest-card' + (q.done ? ' done' : pr.done ? ' ready' : '');
      /* 종이 한 장을 그대로 옮긴다 — 제목 · 본문 · 붙인 사람 · 목표 · 값. */
      const body = (q.done && q.doneLine) ? `<div class="qc-say">${q.doneLine}</div>`
        : (q.body || []).map(l => `<div class="qc-line">${l}</div>`).join('');
      /* 값은 그때그때 센다 — 레벨이 오르면 종이에 적힌 값도 같이 오른다. */
      const pay = G.bountyPay(q);
      el.innerHTML = `<div class="qc-title">${q.title || ''}</div>` + body +
        `<div class="qc-from">— ${q.from || ''}</div>` +
        `<div class="qc-obj">${G.objLabel(q.obj)}` +
        `${q.done ? ` ${tr('· 완료됨')}` : ` <b>${pr.cur} / ${pr.max}</b>`}</div>` +
        `<div class="qc-rw">${tr('보상 🪙 {gold} · 경험치 {xp}', { gold: fmt(pay.gold), xp: fmt(pay.xp) })}` +
        `${(q.items || []).map(([id, n]) => ` · ${ITEMS[id].n}×${n}`).join('')}</div>`;
      if (!q.done && pr.done) {
        const btn = document.createElement('button');
        btn.textContent = tr('떼어 간다');
        btn.addEventListener('click', () => G.claimBounty(i));
        el.appendChild(btn);
      }
      b.appendChild(el);
    });
  },

  /** 재련대 — 금화를 내고 장비 접사를 다시 굴린다 */
  openReforge() {
    this.closePanel();
    this.panels.show('reforge'); G.uiOpen = true;
    this.refreshReforge();
  },
  refreshReforge() {
    $('#reforge-title').textContent = tr('재련대 — 🪙 {gold}', { gold: fmt(G.player.gold) });
    $('#reforge-note').textContent = tr('다시 벼릴 장비를 고르시오. 접사가 새로 붙지만, 더 나빠질 수도 있다.');
    const g = $('#reforge-grid'); g.innerHTML = '';
    G.player.bag.forEach((it, i) => {
      if (!it || !isGear(it)) return;
      const cost = G.reforgeCost(it);
      makeSlot('slot r' + it.r, { fill: { icon: Art.itemUrl(it.id), count: fmt(cost) },
        click: () => G.reforgeSlot(i), enter: e => this.showTip(it, e, tr('재련 비용 🪙 {cost}', { cost: fmt(cost) })), leave: () => this.hideTip() }, g);
    });
    if (!g.children.length) $('#reforge-note').textContent = tr('가방에 다시 벼릴 만한 장비가 없다.');
  },

  /** 강화 모루 — 금화와 재료를 내고 장비 수치를 한 단계 올린다 */
  openAnvil() {
    this.closePanel();
    this.panels.show('anvil'); G.uiOpen = true;
    this.refreshAnvil();
  },
  refreshAnvil() {
    $('#anvil-title').textContent = tr('강화 모루 — 🪙 {gold}', { gold: fmt(G.player.gold) });
    $('#anvil-note').textContent =
      tr('한 단계마다 공격력·방어력이 오른다 (최대 +{ENH_MAX}). +2부터 실패(단계 그대로), +4부터 파괴(한 단계 하락)가 있다.', { ENH_MAX: G.ENH_MAX });
    const g = $('#anvil-grid'); g.innerHTML = '';
    G.player.bag.forEach((it, i) => {
      if (!it || !isGear(it)) return;
      const d = idef(it);
      if (!d.dmg && !d.def) return;                     // 벼릴 수치가 없는 장신구는 뺀다
      const e = it.e || 0, max = e >= G.ENH_MAX;
      const cost = G.enhCost(it), mat = G.enhMat(e);
      const fail = Math.round(G.enhFail(e) * 100), brk = Math.round(G.enhBreak(e) * 100);
      const risk = (fail ? ` ${tr('· 실패 {fail}%', { fail })}` : '') + (brk ? ` ${tr('· 파괴 {brk}%', { brk })}` : '');
      makeSlot('slot r' + it.r + (max ? ' dim' : ''), { fill: { icon: Art.itemUrl(it.id), count: max ? 'MAX' : '+' + (e + 1) },
        click: max ? undefined : () => G.enhanceSlot(i),
        enter: ev => this.showTip(it, ev, max
          ? tr('더 두들길 데가 없다')
          : tr('+{e} → +{n} · 🪙 {cost} · {item} {mat}개', { e, n: e + 1, cost: fmt(cost), item: ITEMS[mat.id].n, mat: mat.n }) + risk),
        leave: () => this.hideTip() }, g);
    });
    if (!g.children.length) $('#anvil-note').textContent = tr('가방에 두들길 만한 장비가 없다.');
  },
};
mixin(UI, ShopUIPart);
