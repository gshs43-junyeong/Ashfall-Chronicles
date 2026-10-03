/* ===== game/shop.js — 상점 · 시세 · 사고팔기 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { fmt, tr } from '../lang.js';
import { RARITY_MULT } from '../data.js';
import { ITEMS } from '../data/items.js';
import { MERCHANTS, NPCS, SHOP_DENY } from '../data/npcs.js';
import { sessionOf } from '../data/story.js';
import { ITEM_VAL, idef } from '../data/values.js';
import { equipReqLv, itemName, makeItem } from '../items.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const ShopPart: Bag = {

  /* ================= 판매 ================= */
  /** 거래 한 건 — 사든 팔든 한 번. */
  tradeDone() {
    this.tally = this.tally || {};
    this.tally.trade = (this.tally.trade || 0) + 1;
    this.checkAch();
  },
  sellItem(slot) {
    const p = this.player, it = p.bag[slot];
    if (!it) return;
    if (it.lk) { this.toast(tr('잠긴 물건은 팔 수 없다 (Ctrl+좌클릭으로 해제)'), 'bad'); return; }
    const price = Math.round(this.price(it) * 0.5 * this.villageTrade());
    p.gold += price;
    this.toast(tr('{itemName} 판매 — 🪙 {price}', { itemName: itemName(it), price: fmt(price) }), 'good');
    p.bag[slot] = null;
    UI.refreshBag(); UI.refreshChest(); this.sfx('coin');
    this.tradeDone();
  },
  /* ---- 경제: 화폐 가치와 품목별 시세가 하루 단위로 변동한다 ---- */
  updateEconomy() {
    this.goldRate = clamp((this.goldRate || 1) + (this.rng.next() - 0.5) * 0.14, 0.7, 1.4);
    this.market = {};   // 품목별 시세는 필요할 때(marketRate) 그날 시드로 다시 뽑는다
  },
  /* ---- 떠돌이 상인 재고 ---- */
  merchantOf(npc) { return MERCHANTS.find(m => m.npc === npc); },

  /** 장비상 후보 — 지금 플레이어가 들 수 있는 것만 고른다. */
  equipPool(spec) {
    const lim = this.player.level + (spec.lvSlack || 0);
    const out = [];
    for (const id in ITEMS) {
      const d = ITEMS[id];
      if (!spec.types.includes(d.type)) continue;
      if (SHOP_DENY.has(id)) continue;
      const req = equipReqLv(id);
      if (req > lim) continue;
      // 너무 낮은 것만 잔뜩 뜨지 않게, 레벨이 가까울수록 가중치를 준다
      const gap = lim - req;
      out.push({ id, w: gap <= 4 ? 6 : gap <= 10 ? 3 : 1, max: 1 });
    }
    return out;
  },

  /** 한 상인의 오늘 재고. */
  stockOf(npc) {
    const m = this.merchantOf(npc); if (!m) return [];
    if (this.shopStockDay !== this.dayCount) { this.shopStock = {}; this.shopStockDay = this.dayCount; }
    if (!this.shopStock[npc]) {
      const r = new RNG(this.world.seed + '_shop_' + npc + '_' + this.dayCount);
      /* 재고 후보 거르기 — 세션(스토리 진행)과 마을 단계 둘 다 본다. */
      const sess = sessionOf(this.chapter);
      /* 마을 단계(vlv) 조건은 **마을 상인에게만** 건다. */
      const vlv = m.spot ? this.villageLv() : 99;
      const bag = (m.pool ? m.pool.filter(e => (e.sess || 1) <= sess && (e.vlv || 1) <= vlv)
                          : this.equipPool(m.equip));
      // 4단계(교역지)가 되면 마을 상인 셋만 재고 칸이 한 칸씩 늘어난다
      const slots = m.slots + (m.spot && this.villageLv() >= 4 ? 1 : 0);
      const picked = [];
      // 가중치 뽑기 — 뽑은 것은 후보에서 빼서 같은 물건이 두 칸 차지하지 않게 한다
      for (let k = 0; k < slots && bag.length; k++) {
        let total = 0;
        for (const e of bag) total += e.w;
        let t = r.next() * total, idx = 0;
        for (; idx < bag.length; idx++) { t -= bag[idx].w; if (t <= 0) break; }
        const e = bag.splice(Math.min(idx, bag.length - 1), 1)[0];
        const max = e.max || 1;
        /* 반드시 makeItem으로 만든다 — 사연: docs/code-history.md#h46 */
        picked.push(makeItem(e.id, max > 1 ? 1 + Math.floor(r.next() * max) : 1, 0));
      }
      this.shopStock[npc] = picked;
    }
    // 예전 저장본에 등급 없는 재고가 남아 있으면 여기서 메운다 (값이 NaN이 되지 않게)
    for (const it of this.shopStock[npc]) if (it && it.r === undefined) it.r = 0;
    return this.shopStock[npc];
  },
  /** 떠돌이 상인에게서 산다 — 재고에서 실제로 덜어 낸다(고정 상점의 buy와 다른 점) */
  buyStock(npc, slotIdx) {
    const p = this.player, m = this.merchantOf(npc), stock = this.stockOf(npc);
    const row = stock[slotIdx]; if (!row || !m) return;
    const it = makeItem(row.id, row.c, 0);
    const cost = this.buyPrice(it, m.markup);
    if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
    if (!p.addItem(it)) { this.toast(tr('가방이 가득 찼다'), 'bad'); return; }
    p.gold -= cost;
    stock.splice(slotIdx, 1);            // 하나뿐인 재고다 — 사면 그날은 끝
    this.toast(tr('{item} 구매', { item: ITEMS[row.id].n }), 'good');
    UI.refreshChest(); UI.refreshBag(); this.sfx('coin');
    this.tradeDone();
  },
  marketRate(id) {
    if (!(id in this.market)) {
      const r = new RNG(this.world.seed + '_m' + this.dayCount + '_' + id);
      this.market[id] = 0.85 + r.next() * 0.3;   // 품목별 0.85~1.15
    }
    return this.market[id] * (this.goldRate || 1);
  },
  /* 상점에서 **사는** 값. */
  SHOP_BUY_MUL: 6,
  buyPrice(it, markup, npc) {
    /* 값이 고정된 물건은 가게 배수도 상인 웃돈도 안 붙인다 — 조련사에게 사는 알이 늘 10,000 / 30,000 / 100,000 이어야 한다. */
    if (idef(it).fixed) return this.price(it);
    // disc — 그 상인만의 할인(베이스캠프 보린).
    const disc = (npc && NPCS[npc] && NPCS[npc].disc) || 1;
    return Math.max(1, Math.round(this.price(it) * this.SHOP_BUY_MUL * (markup || 1) * disc));
  },
  price(it) {
    const d = idef(it);
    /* 값은 data.js 의 ITEM_VAL 이 한 벌로 매긴다 — 재료는 어디서 나오는지로, 만드는 것은 재료값으로, 못 만드는 장비는 필요 레벨로. */
    let base = ITEM_VAL[it.id];
    if (base !== undefined) { /* 표가 정한다 */ }
    else if (d.price) base = d.price;
    else if (d.type === 'weapon') base = 60 + (d.tier || 0) * 90;
    else if (d.type === 'armor') base = 40 + (d.def || 0) * 12;
    else if (d.type === 'acc') base = 220;
    else if (d.type === 'tool') base = 80 + (d.power || 1) * 70;
    else if (d.type === 'consum') base = 22;
    else if (d.type === 'block') base = 2;
    else base = 12;
    const raw = base * (it.c > 1 ? it.c : 1) * RARITY_MULT[it.r] * this.marketRate(it.id);
    return Math.max(1, Math.round(raw));
  },
  /** 가게가 한 번에 파는 묶음 크기. */
  shopBundle(id) { return ITEMS[id].fixed ? 1 : (ITEMS[id].stack > 1 ? 5 : 1); },
  buy(id, npc) {
    const p = this.player;
    const it = makeItem(id, this.shopBundle(id), 0);
    const cost = this.buyPrice(it, 1, npc);
    if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
    if (!p.addItem(it)) { this.toast(tr('가방이 가득 찼다'), 'bad'); return; }
    p.gold -= cost;
    this.toast(tr('{item} 구매', { item: ITEMS[id].n }), 'good');
    UI.refreshChest(); UI.refreshBag(); this.sfx('coin');
    this.tradeDone();
  },
};

mixin(G, ShopPart);
