/* ===== game/quests.js — 의뢰 · 현상금 · 부탁 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { fmt, tr } from '../lang.js';
import { TILE_DEF } from '../data.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES, mobCw } from '../data/enemies.js';
import { CHAPTERS, sessionOf } from '../data/story.js';
import { BOUNTY_BY_ID, BOUNTY_POOL, BOUNTY_UNIT, SIDE_POOL } from '../data/quests.js';
import { ITEM_VAL } from '../data/values.js';
import { makeItem, rollGear } from '../items.js';
import { Drop } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const QuestsPart: Bag = {

  /* ================= 의뢰의 목표 ================= */
  objStart(o: Bag) {
    const p = this.player;
    if (o.type === 'kill') return p.kills[o.target] || 0;
    if (o.type === 'collect') return p.gathered[o.item] || 0;
    if (o.type === 'mine') return p.mined[o.tile] || 0;
    return 0;
  },
  objSince(o: Bag, start: any) {
    const cur = clamp(this.objStart(o) - start, 0, o.n);
    return { cur, max: o.n, done: cur >= o.n };
  },
  /* ================= 의뢰 · 부탁의 값 ================= */
  QUEST_PAY: {
    need: 0.45,               // 경험치 = 그 레벨 필요치의 몇 할
    tMin: 0.8, tMax: 1.25,    // 일의 무게 보정 폭
    g0: 300, gL: 110,         // 금화 레벨 몫
    killG: 0.25,              // 잡은 것이 떨구는 금화 중 얹는 몫
    matG: 0.5,                // 모으고 캔 것의 값 중 얹는 몫
    floor: 1.25,              // 옛 값의 이 배수 아래로는 안 내려간다
    side: 0.75                // 부탁 한 건은 게시판 한 장의 4분의 3 (게시판은 하루 석 장뿐이다)
  },
  MAT_VAL: 12,                // 재료 기본값 — price() 는 시세를 타서 값이 흔들린다
  xpNeed(lv: number) { return 40 * Math.pow(lv, 1.42); },
  questPay(obj: Bag, mul: number) {
    const Q = this.QUEST_PAY, lv = Math.max(1, this.player.level), m = mul || 1;
    const k = m * obj.n / (BOUNTY_UNIT[obj.type] || 12);
    const need = this.xpNeed(lv);
    const e = obj.type === 'kill' ? (ENEMIES[obj.target] || { gold: 0, xp: 0 }) : null;
    const t = e ? clamp(e.xp! * obj.n / need, Q.tMin, Q.tMax) : 1;
    let gold = (Q.g0 + Q.gL * lv) * k;
    if (e) gold += e.gold! * obj.n * Q.killG * m;
    else {
      const id = obj.type === 'collect' ? obj.item : (TILE_DEF[obj.tile] || {}).drop;
      gold += (id ? (ITEM_VAL[id] || this.MAT_VAL) : 0) * obj.n * Q.matG * m;
    }
    return {
      gold: Math.round(Math.max(gold, (160 + 55 * lv) * k * Q.floor)),
      xp: Math.round(Math.max(Q.need * need * k * t, (90 + 40 * lv) * k * Q.floor))
    };
  },
  /** 게시판 한 장의 값. */
  bountyPay(b: any) {
    if (!b) return { gold: 0, xp: 0 };
    if (b.paid) return b.paid;
    if (!b.obj) return { gold: b.gold || 0, xp: b.xp || 0 };   // 아주 옛 저장
    return this.questPay(b.obj, b.mul === undefined ? 1 : b.mul);
  },
  /** 부탁 하나의 값. */
  sidePay(sq: any) {
    const p = this.questPay(sq.obj, this.QUEST_PAY.side), r = sq.rw || {};
    return { gold: Math.max(p.gold, r.gold || 0), xp: Math.max(p.xp, r.xp || 0) };
  },

  /** 목표를 한 줄로 — "무덤지기 12마리" */
  objLabel(o: Bag) {
    if (o.type === 'kill') return `${ENEMIES[o.target].n} ${o.n}${mobCw(o.target)}`;
    if (o.type === 'collect') return tr('{item} {o}개', { item: ITEMS[o.item].n, o: o.n });
    if (o.type === 'mine') return tr('{tileDef} {o}번', { tileDef: TILE_DEF[o.tile].n, o: o.n });
    return '';
  },

  /* ---- 의뢰 게시판 ---- */
  bountyFits(t: any, ch: any) {
    return t && (!t.s || t.s === sessionOf(ch).id) && ch >= t.ch[0] && ch <= t.ch[1];
  },
  makeBounty(t: any, r: any) {
    const obj = t.obj(r, this.chapter);
    return {
      id: t.id, title: t.title, from: t.from, body: t.body,
      obj, start: this.objStart(obj), done: 0, mul: t.rw || 1,
      doneLine: t.done, next: t.next || '', items: t.items || null
    };
  },
  rollBounties() {
    const r = new RNG(this.world.seed + '_b' + this.dayCount);
    const ch = this.chapter || 0;
    const out: Bag[] = [];
    const take = (t: any) => {
      if (!t || out.length >= 3 || out.some(b => b.id === t.id)) return;
      out.push(this.makeBounty(t, r));
    };
    /* ① 어제 끝낸 것의 뒷이야기부터. */
    const keep = [];
    for (const id of (this.bountyNext || [])) {
      const t = BOUNTY_BY_ID[id];
      if (this.bountyFits(t, ch) && out.length < 3) take(t); else if (t) keep.push(id);
    }
    this.bountyNext = keep;
    // ② 나머지는 오늘 붙을 수 있는 것 중에서
    const pool = BOUNTY_POOL.filter(t => !t.pin && this.bountyFits(t, ch));
    while (out.length < 3 && pool.length) take(pool.splice(r.int(0, pool.length - 1), 1)[0]);
    this.bounties = out;
  },
  bountyProgress(b: any) {
    /* 옛 저장(잡을 것 하나만 적혀 있던 시절)도 읽을 수 있게 둔다 */
    if (!b.obj) return { cur: 0, max: b.n || 1, done: false };
    return this.objSince(b.obj, b.start);
  },
  claimBounty(i: number) {
    const b = this.bounties[i]; if (!b || b.done) return;
    if (!this.bountyProgress(b).done) { this.toast(tr('아직 다 하지 못했다'), 'bad'); return; }
    const p = this.player, pay = this.bountyPay(b);
    b.done = 1; b.paid = pay;          // 떼어 간 뒤에도 종이에 받은 값이 남는다
    p.addXp(pay.xp); p.gold += pay.gold;
    for (const [id, n] of (b.items || [])) {
      const it = ITEMS[id].stack! > 1 ? makeItem(id, n) : rollGear(id, this.rng, 1);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
    }
    /* 뒷이야기는 오늘 바로 붙지 않는다 — 다음에 게시판이 갈릴 때 붙는다. */
    if (b.next && !(this.bountyNext || []).includes(b.next)) {
      this.bountyNext = (this.bountyNext || []).concat(b.next);
    }
    this.toast(tr('의뢰 완료: {title} — 경험치 {xp} · 금화 {gold}', { title: b.title, xp: fmt(pay.xp), gold: fmt(pay.gold) }), 'good');
    UI.refreshBoard(); UI.refreshBag(); this.sfx('manycoins');
  },

  /* ---- 사이드 퀘스트 ---- */
  sideProgress(sq: any) { return this.objSince(sq.obj, sq.start); },
  sideTalk(npcId: string) {
    const active = this.sideActive[npcId];
    if (active) {
      const p = this.sideProgress(active);
      if (p.done) {
        UI.openDialogue(npcId, [active.doneLine], [{ t: tr('(보상을 받는다)'), quest: 1, fn: () => { this.completeSideQuest(npcId); UI.closeDialogue(); } }]);
      } else {
        UI.openDialogue(npcId, [`${active.desc}  (${p.cur}/${p.max})`], []);
      }
      return;
    }
    const pool = SIDE_POOL[npcId];
    if (!pool) return;
    const tpl = pool[this.rng.int(0, pool.length - 1)](this.chapter, this.rng);
    /* 값을 먼저 알려 준다 — 고를 수 있는 것이 "한다·안 한다"뿐이라 값을 모르면 고를 수가 없다. */
    const pay = this.sidePay(tpl);
    UI.openDialogue(npcId, [tr('{desc}\n(보상은 🪙 {gold} · 경험치 {xp})', { desc: tpl.desc, gold: fmt(pay.gold), xp: fmt(pay.xp) })], [
      { t: tr('(수락한다)'), quest: 1, fn: () => { this.acceptSideQuest(npcId, tpl); UI.closeDialogue(); } },
      { t: tr('(다음에 하겠다)'), fn: () => UI.closeDialogue() }
    ]);
  },
  acceptSideQuest(npcId: string, tpl: any) {
    this.sideActive[npcId] = Object.assign({}, tpl, { start: this.objStart(tpl.obj) });
    this.toast(tr('부탁을 맡았다: {title}', { title: tpl.title }), 'good');
    UI.refreshQuest(); UI.refreshTracker();
  },
  completeSideQuest(npcId: string) {
    const sq = this.sideActive[npcId]; if (!sq) return;
    const p = this.player, pay = this.sidePay(sq);
    p.addXp(pay.xp); p.gold += pay.gold;
    for (const [id, n] of (sq.rw.items || [])) {
      const it = ITEMS[id].stack! > 1 ? makeItem(id, n) : rollGear(id, this.rng, 1);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
    }
    this.sideDone[npcId] = (this.sideDone[npcId] || 0) + 1;
    delete this.sideActive[npcId];
    this.toast(tr('부탁 완료: {title} — 경험치 {xp} · 금화 {gold}', { title: sq.title, xp: fmt(pay.xp), gold: fmt(pay.gold) }), 'good');
    UI.refreshQuest(); UI.refreshTracker(); UI.refreshBag();
    this.sfx('manycoins');
  },
  tellQuest() {
    const ch = CHAPTERS[this.chapter];
    if (!ch) { this.toast(tr('모든 여정이 끝났다.')); return; }
    const st = this.chapterState(ch);
    const session = sessionOf(this.chapter).n;
    if (st.complete) this.toast(tr('할 일은 모두 끝냈다.'));
    else if (st.ready) this.toast(tr('{session} · 목표 — {v}', { session, v: st.goal ? st.goal.o.t : tr('이 장의 마지막') }));
    else {
      // 아직 준비 중이면 고유 동사 쪽을 먼저 알려 준다 — 그게 이 장의 이야기다
      const pick = st.basics.find((b: any) => !b.p.done && st.missing.includes(b.o.verb))
                || st.basics.find((b: any) => !b.p.done);
      this.toast(tr('{session} · 준비 {done}/{need}', { session, done: st.done, need: st.need }) + (pick ? ` · ${pick.o.t} (${pick.p.label || pick.p.cur + "/" + pick.p.max})` : ''));
    }
    UI.togglePanel('quest');
  },
};

mixin(Game.prototype, QuestsPart, true);
