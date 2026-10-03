/* ===== game/village.js — 여명 마을 — 단계 · 훈련 · 제작 · 강화 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { ITEMS, STATION_NAME, STATION_UP } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { VILLAGE } from '../data/start.js';
import { FARM_KIT } from '../data/ruins.js';
import { sessionOf } from '../data/story.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { isGear, itemName, makeItem, rollGear } from '../items.js';
import { Drop, Part, VAULT_SIZE } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const VillagePart: Bag = {
  /* ================= 마을 개선 ================= */
  villageLv() {
    const d = this.world && this.world.dawnCity;
    return (d && d.restored) ? (d.lv || 1) : 0;
  },
  /** 지금 여명 마을 안에 있는가 (마을 회관·경비병 판정용) */
  inDawn(margin: any) {
    const d = this.world && this.world.dawnCity;
    if (!d || !d.restored) return false;
    const p = this.player, m = margin === undefined ? 24 : margin;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    return tx > d.x0 - m && tx < d.x1 + m && Math.abs(ty - d.gy) < 26;
  },
  upgradeVillage() {
    const lv = this.villageLv();
    if (!lv) { this.toast(tr('아직 마을이 없다'), 'bad'); return; }
    if (lv >= VILLAGE.length - 1) { this.toast(tr('더 올릴 단계가 없다'), 'bad'); return; }
    const spec = VILLAGE[lv + 1], p = this.player;
    if (!p.hasAll(spec!.need)) { this.toast(tr('재료가 부족하다'), 'bad'); return; }
    for (const k in spec!.need) p.removeItem(k, spec!.need[k]);
    this.world.upgradeVillage(lv + 1);
    while (this.vault.length < this.vaultCap()) this.vault.push(null);
    // 밭을 내주는 단계 — 연장과 씨앗을 바로 쥐여 준다(밭 한가운데 상자는 뜬금없어 보였다). 가방이 차면 발밑에
    if (lv + 1 === 2) {
      for (const [id, n] of FARM_KIT) { const it = makeItem(id, n); if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!)); }
      this.toast(tr('마을 서쪽에 밭을 내주었다 — 괭이·낫·씨앗을 받았다'), 'good');
    }
    this.toast(tr('마을이 『{spec}』{spec|-이} 되었다', { spec: spec!.n }), 'good');
    for (let i = 0; i < 40; i++) this.parts.push(new Part(p.cx + (Math.random() - .5) * 200, p.cy, '#ffe08a', -70, 1.2));
    UI.chapterCard({ sub: tr('마을 개선'), title: spec!.n, line: spec!.d });
    UI.refreshBag(); this.sfx('chapter');
  },
  /* 마을 단계가 주는 혜택 — 여러 곳에서 쓰이므로 한군데 모아 둔다 */
  vaultCap() { const lv = this.villageLv(); return VAULT_SIZE + (lv >= 2 ? 12 : 0) + (lv >= 4 ? 12 : 0); },
  villageTrade() { return this.villageLv() >= 3 ? 1.1 : 1; },

  /* ================= 훈련소 ================= */
  /* 세션이 넘어가면 금화가 도는 규모 자체가 달라진다(세션 2에서 상자·판매 수입이 크게 뛴다). */
  costMul() { return [1, 1, 3.2, 7][sessionOf(this.chapter).id] || 1; },   // ★ .id — 세션 객체를 넣으면 늘 1이었다
  respecCost() { return Math.round((60 + this.player.level * 25) * this.costMul()); },
  respecStats() {
    const p = this.player;
    const cost = this.respecCost();
    if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
    p.gold -= cost;
    const spent = (p.base.str - 5) + (p.base.dex - 5) + (p.base.int - 5) + (p.base.vit - 5);
    p.statPts += spent;
    p.base = { str: 5, dex: 5, int: 5, vit: 5 };
    p.recalc();
    this.toast(tr('스탯을 초기화했다. 능력 창에서 다시 분배하라'), 'good');
    UI.refreshStatAlloc(); UI.refreshStatSheet();
  },
  trainCost() { return Math.round((40 + this.trainedToday * 60) * this.costMul()); },
  trainXp() {
    const p = this.player;
    if (this.trainedToday >= 5) { this.toast(tr('오늘은 더 가르칠 게 없다고 한다'), 'bad'); return; }
    const cost = this.trainCost();
    if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
    p.gold -= cost; this.trainedToday++;
    const xp = Math.round(p.xpNext * 0.18);
    p.addXp(xp);
    this.toast(tr('수련으로 경험치 +{xp}', { xp: fmt(xp) }), 'good');
  },

  /** 이 제작법을 지금 쓸 수 있는가 — 시설 종류와 그 개체의 개조 단계를 함께 본다 */
  craftOk(r: any) {
    if (!r.station) return true;
    const o = this.nearStObj[r.station];
    return !!o && (o.lv || 1) >= (r.lv || 1);
  },
  /** 시설 개조. */
  upgradeStation(kind: string) {
    const o = this.nearStObj[kind];
    if (!o) { this.toast(tr('{stationName} 앞에서만 개조할 수 있다', { stationName: STATION_NAME[kind][1] }), 'bad'); return; }
    const lv = o.lv || 1;
    if (lv >= STATION_UP[kind].length) { this.toast(tr('더 손볼 데가 없다'), 'bad'); return; }
    const up = STATION_UP[kind][lv], p = this.player;
    if (!p.hasAll(up.need)) { this.toast(tr('재료가 부족하다'), 'bad'); return; }
    for (const k in up.need) p.removeItem(k, up.need[k]);
    o.lv = lv + 1;
    const nm = STATION_NAME[kind][lv + 1];
    this.toast(tr('{nm|으로} 개조했다', { nm }), 'good');
    for (let i = 0; i < 22; i++) this.parts.push(new Part(p.cx, p.cy, kind === 'forge' ? '#ff9a3a' : '#d8b06a', -50, 0.8));
    UI.refreshCraft(); UI.refreshBag(); this.sfx('craft');
  },
  craft(i: number) {
    const r = RECIPES[i], p = this.player;
    const st = r.station ? this.nearStObj[r.station] : null;
    if (r.station && !st) {
      this.toast(tr('{stationName} 앞에서만 만들 수 있다', { stationName: STATION_NAME[r.station][1] }), 'bad'); return;
    }
    if (r.station && (st.lv || 1) < (r.lv || 1)) {
      const nm = STATION_NAME[r.station][r.lv!];
      this.toast(tr('{nm|으로} 개조해야 만들 수 있다', { nm }), 'bad'); return;
    }
    if (!p.hasAll(r.need)) { this.toast(tr('재료가 부족하다'), 'bad'); return; }
    for (const k in r.need) p.removeItem(k, r.need[k]);
    const out = isGear(makeItem(r.out)!) ? rollGear(r.out, this.rng, 1) : makeItem(r.out, r.n);
    if (out!.c !== undefined && !isGear(out!)) out!.c = r.n;
    if (!p.addItem(out)) { this.drops.push(new Drop(p.cx, p.cy, out!)); }
    this.crafted = this.crafted || {};
    this.crafted[r.out] = (this.crafted[r.out] || 0) + 1;
    this.checkAch();
    this.toast(tr('{item} 제작 완료', { item: ITEMS[r.out].n }), 'good');
    UI.refreshCraft(); UI.refreshBag(); this.sfx('craft');
  },

  /* ---- 강화: 장비 수치를 한 단계씩 올린다 (여명 교역지 4단계, 강화 모루) ---- */
  ENH_MAX: 10,
  /* 실패 확률 — 낮은 단계는 **반드시 성공한다.** */
  enhFail(e: any) { return e < 2 ? 0 : Math.min(0.45, (e - 1) * 0.07); },
  /* 파괴 확률 — 한 단계 떨어진다. +4 부터 5%씩(+9 에서 30%) — 실패와 따로 굴리지 않고 한 번에 가른다. */
  enhBreak(e: any) { return e < 4 ? 0 : (e - 3) * 0.05; },
  /** 단계마다 갈아타는 재료 — 무엇을 캐러 갈 때인지가 재료로 드러난다 */
  enhMat(e: any) {
    return e < 3 ? { id: 'iron_bar', n: 2 + e }
      : e < 6 ? { id: 'steel_plate', n: 2 + e }
        : e < 9 ? { id: 'mythril_bar', n: 2 + e }
          : { id: 'abyss_core', n: e - 6 };
  },
  enhCost(it: Bag) {
    const e = it.e || 0;
    return Math.round((this.price(it) * 0.5 + 300 * this.costMul()) * (1 + e * 0.6));
  },
  enhanceSlot(i: number) {
    const p = this.player, it = p.bag[i];
    if (!it || !isGear(it)) { this.toast(tr('장비만 강화할 수 있다'), 'bad'); return; }
    const d = idef(it);
    if (!d.dmg && !d.def) { this.toast(tr('공격력도 방어력도 없는 것은 벼릴 데가 없다'), 'bad'); return; }
    const e = it.e || 0;
    if (e >= this.ENH_MAX) { this.toast(tr('더 두들길 데가 없다'), 'bad'); return; }
    const cost = this.enhCost(it), mat = this.enhMat(e);
    if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
    if (!p.hasAll({ [mat.id]: mat.n })) { this.toast(tr('{item} {mat}개가 필요하다', { item: ITEMS[mat.id].n, mat: mat.n }), 'bad'); return; }
    p.gold -= cost; p.removeItem(mat.id, mat.n);
    const roll = Math.random(), brk = this.enhBreak(e);
    if (roll < brk) {
      it.e = e - 1;
      this.toast(tr('{itemName} — 쇠가 갈라졌다. 한 단계 떨어진다 (+{e} → +{n})', { itemName: itemName(it), e, n: e - 1 }), 'bad');
      for (let k = 0; k < 22; k++) this.parts.push(new Part(p.cx, p.cy, k % 2 ? '#c8443a' : '#6a6a74', -40, 0.8));
      this.shake = Math.max(this.shake, 6);
      p.recalc();
      UI.refreshAnvil(); UI.refreshBag(); UI.refreshEquip(); this.sfx('damage');
      return;
    }
    if (roll < brk + this.enhFail(e)) {
      this.toast(tr('{itemName} — 결이 어긋났다. 단계는 그대로다', { itemName: itemName(it) }), 'bad');
      for (let k = 0; k < 12; k++) this.parts.push(new Part(p.cx, p.cy, '#8a8a96', -30, 0.6));
      this.shake = Math.max(this.shake, 3);
      UI.refreshAnvil(); UI.refreshBag(); this.sfx('damage');
      return;
    }
    it.e = e + 1;
    this.toast(tr('{itemName} — 한 겹 더 두들겼다', { itemName: itemName(it) }), 'good');
    for (let k = 0; k < 18; k++) this.parts.push(new Part(p.cx, p.cy, '#ff9a3a', -50, 0.7));
    p.recalc();
    UI.refreshAnvil(); UI.refreshBag(); UI.refreshEquip(); this.sfx('craft');
  },

  /* ---- 재련: 금화를 내고 장비의 접사를 다시 굴린다 ---- */
  reforgeCost(it: Bag) { return Math.round((this.price(it) * 0.8 + 120 * this.costMul()) * (this.villageLv() >= 3 ? 0.75 : 1)); },
  reforgeSlot(i: number) {
    const p = this.player, it = p.bag[i];
    if (!it || !isGear(it)) { this.toast(tr('장비만 재련할 수 있다'), 'bad'); return; }
    const cost = this.reforgeCost(it);
    if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
    p.gold -= cost;
    const fresh = rollGear(it.id, this.rng, Math.max(1, it.r));
    fresh!.c = it.c;
    p.bag[i] = fresh;
    this.toast(tr('{itemName} — 다시 벼렸다', { itemName: itemName(fresh!) }), fresh!.r > it.r ? 'good' : '');
    UI.refreshReforge(); UI.refreshBag(); this.sfx('craft');
  },
};

mixin(Game.prototype, VillagePart, true);
