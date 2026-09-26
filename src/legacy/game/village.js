/* ===== game/village.js — 여명 마을 시설 · 의뢰 · NPC ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { fmt, tr } from '../lang.js';
import { WH, WW } from '../size.js';
import { BOUNTY_BY_ID, BOUNTY_POOL, BOUNTY_UNIT, CHAPTERS, DAWN_NPCS, DIALOGUE, ENEMIES, ITEMS, ITEM_VAL, MERCHANTS,
  NPCS, RARITY_MULT, RUIN_HINTS, RUIN_LORE, RUIN_SPEC, SHOP_DENY, SIDE_POOL, T, TABLETS, TALK, TALK_MOODS, TILE_DEF,
  VILLAGE_TALK, idef, mobCw, sessionOf } from '../data.js';
import { TS } from '../world.js';
import { Drop, Part, equipReqLv, isGear, itemName, makeItem, rollGear } from '../entity.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const VillagePart = {

  /* ================= 여명 마을 시설 ================= */

  /** 귀환 비석 — 베이스캠프 ↔ 여명 마을 왕복 */
  useWaystone() {
    const p = this.player, w = this.world;
    const d = w.dawnCity;
    if (!this.villageUnlocked) {
      UI.openLore(tr('귀환 비석'), [tr('표면의 홈이 잿빛으로 막혀 있다. 아직 이어진 곳이 없다.')], []);
      return;
    }
    const atDawn = d && Math.abs(p.cx / TS - (d.x0 + d.x1) / 2) < 90;
    const [tx, ty] = atDawn ? [w.spawnX, w.spawnY - 3]
      : [(d.x0 + d.x1) >> 1, d.gy - 3];
    const to = atDawn ? tr('베이스캠프') : tr('여명 마을');
    UI.openLore(tr('귀환 비석'), [tr('비석에 손을 대면 {to}(으)로 돌아간다.', { to })], [
      {
        t: tr('({to}(으)로 이동한다)', { to }), quest: 1, fn: () => {
          UI.closeDialogue();
          p.x = tx * TS - p.w / 2; p.y = ty * TS; p.vx = p.vy = 0;
          this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
          this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
          for (let i = 0; i < 30; i++) this.parts.push(new Part(p.cx, p.cy, '#9fe8dc', -60, 1.1));
          this.toast(tr('{to}에 도착했다', { to }), 'good');
          this.sfx('chapter');
        }
      }
    ]);
  },

  /** 분수대 — 금화를 던져 소원을 빈다. */
  wishCost() { return Math.round(25 + this.player.level * 7); },
  useFountain(o) {
    const p = this.player, cost = this.wishCost();
    const lines = [tr('물속에 동전이 여럿 가라앉아 있다. 오래된 것도, 어제 것도 있다.')];
    const choices = [];
    if (p.gold >= cost)
      choices.push({
        t: tr('(금화 {cost}개를 던진다)', { cost: fmt(cost) }), quest: 1, fn: () => {
          UI.closeDialogue();
          p.gold -= cost;
          p.addBuff('wish');
          const mx = o.x + o.w / 2, my = o.y + o.h * 0.55;
          for (let i = 0; i < 16; i++) this.parts.push(new Part(mx, my, '#ffd85a', -40, 0.9));
          this.toast(tr('분수의 축복 — 잠시 운이 따른다'), 'good');
          this.sfx('coin');
        }
      });
    else lines.push(tr('동전을 던지려면 금화 {cost}개가 필요하다.', { cost: fmt(cost) }));
    UI.openLore(tr('여명의 분수'), lines, choices);
  },

  /** 여관 — 금화를 내고 아침까지 잔다. */
  innCost() { return Math.round((40 + this.player.level * 12) * this.costMul() * (this.villageLv() >= 2 ? 0.7 : 1)); },
  useInn() {
    const p = this.player;
    const cost = this.innCost();
    UI.openLore(tr('여관'), [tr('하란: "한숨 자고 가. 아침까진 봐 줄게. 🪙 {cost}."', { cost: fmt(cost) })], [
      {
        t: tr('(🪙 {cost} 내고 잔다)', { cost: fmt(cost) }), quest: 1, fn: () => {
          UI.closeDialogue();
          if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
          p.gold -= cost;
          this.dayT = 6 * 60; this.dayCount++; this.trainedToday = 0;
          this.updateEconomy(); this.rollBounties();
          p.hp = p.d.maxHp; p.mp = p.d.maxMp;
          p.addBuff('rested');
          this.toast(tr('푹 잤다 — 아침이다'), 'good');
          this.sfx('level');
          this.tally = this.tally || {};
          this.tally.inn = (this.tally.inn || 0) + 1;
          this.checkAch();
        }
      }
    ]);
  },

  /* ================= 의뢰의 목표 ================= */
  objStart(o) {
    const p = this.player;
    if (o.type === 'kill') return p.kills[o.target] || 0;
    if (o.type === 'collect') return p.gathered[o.item] || 0;
    if (o.type === 'mine') return p.mined[o.tile] || 0;
    return 0;
  },
  objSince(o, start) {
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
  xpNeed(lv) { return 40 * Math.pow(lv, 1.42); },
  questPay(obj, mul) {
    const Q = this.QUEST_PAY, lv = Math.max(1, this.player.level), m = mul || 1;
    const k = m * obj.n / (BOUNTY_UNIT[obj.type] || 12);
    const need = this.xpNeed(lv);
    const e = obj.type === 'kill' ? (ENEMIES[obj.target] || { gold: 0, xp: 0 }) : null;
    const t = e ? clamp(e.xp * obj.n / need, Q.tMin, Q.tMax) : 1;
    let gold = (Q.g0 + Q.gL * lv) * k;
    if (e) gold += e.gold * obj.n * Q.killG * m;
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
  bountyPay(b) {
    if (!b) return { gold: 0, xp: 0 };
    if (b.paid) return b.paid;
    if (!b.obj) return { gold: b.gold || 0, xp: b.xp || 0 };   // 아주 옛 저장
    return this.questPay(b.obj, b.mul === undefined ? 1 : b.mul);
  },
  /** 부탁 하나의 값. */
  sidePay(sq) {
    const p = this.questPay(sq.obj, this.QUEST_PAY.side), r = sq.rw || {};
    return { gold: Math.max(p.gold, r.gold || 0), xp: Math.max(p.xp, r.xp || 0) };
  },

  /** 목표를 한 줄로 — "무덤지기 12마리" */
  objLabel(o) {
    if (o.type === 'kill') return `${ENEMIES[o.target].n} ${o.n}${mobCw(o.target)}`;
    if (o.type === 'collect') return tr('{item} {o}개', { item: ITEMS[o.item].n, o: o.n });
    if (o.type === 'mine') return tr('{tileDef} {o}번', { tileDef: TILE_DEF[o.tile].n, o: o.n });
    return '';
  },

  /* ---- 의뢰 게시판 ---- */
  bountyFits(t, ch) {
    return t && (!t.s || t.s === sessionOf(ch).id) && ch >= t.ch[0] && ch <= t.ch[1];
  },
  makeBounty(t, r) {
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
    const out = [];
    const take = t => {
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
  bountyProgress(b) {
    /* 옛 저장(잡을 것 하나만 적혀 있던 시절)도 읽을 수 있게 둔다 */
    if (!b.obj) return { cur: 0, max: b.n || 1, done: false };
    return this.objSince(b.obj, b.start);
  },
  claimBounty(i) {
    const b = this.bounties[i]; if (!b || b.done) return;
    if (!this.bountyProgress(b).done) { this.toast(tr('아직 다 하지 못했다'), 'bad'); return; }
    const p = this.player, pay = this.bountyPay(b);
    b.done = 1; b.paid = pay;          // 떼어 간 뒤에도 종이에 받은 값이 남는다
    p.addXp(pay.xp); p.gold += pay.gold;
    for (const [id, n] of (b.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 1);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    }
    /* 뒷이야기는 오늘 바로 붙지 않는다 — 다음에 게시판이 갈릴 때 붙는다. */
    if (b.next && !(this.bountyNext || []).includes(b.next)) {
      this.bountyNext = (this.bountyNext || []).concat(b.next);
    }
    this.toast(tr('의뢰 완료: {title} — 경험치 {xp} · 금화 {gold}', { title: b.title, xp: fmt(pay.xp), gold: fmt(pay.gold) }), 'good');
    UI.refreshBoard(); UI.refreshBag(); this.sfx('manycoins');
  },

  /* ---- 강화: 장비 수치를 한 단계씩 올린다 (여명 교역지 4단계, 강화 모루) ---- */
  ENH_MAX: 10,
  /* 실패 확률 — 낮은 단계는 **반드시 성공한다.** */
  enhFail(e) { return e < 2 ? 0 : Math.min(0.45, (e - 1) * 0.07); },
  /* 파괴 확률 — 한 단계 떨어진다. +4 부터 5%씩(+9 에서 30%) — 실패와 따로 굴리지 않고 한 번에 가른다. */
  enhBreak(e) { return e < 4 ? 0 : (e - 3) * 0.05; },
  /** 단계마다 갈아타는 재료 — 무엇을 캐러 갈 때인지가 재료로 드러난다 */
  enhMat(e) {
    return e < 3 ? { id: 'iron_bar', n: 2 + e }
      : e < 6 ? { id: 'steel_plate', n: 2 + e }
        : e < 9 ? { id: 'mythril_bar', n: 2 + e }
          : { id: 'abyss_core', n: e - 6 };
  },
  enhCost(it) {
    const e = it.e || 0;
    return Math.round((this.price(it) * 0.5 + 300 * this.costMul()) * (1 + e * 0.6));
  },
  enhanceSlot(i) {
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
  reforgeCost(it) { return Math.round((this.price(it) * 0.8 + 120 * this.costMul()) * (this.villageLv() >= 3 ? 0.75 : 1)); },
  reforgeSlot(i) {
    const p = this.player, it = p.bag[i];
    if (!it || !isGear(it)) { this.toast(tr('장비만 재련할 수 있다'), 'bad'); return; }
    const cost = this.reforgeCost(it);
    if (p.gold < cost) { this.toast(tr('금화가 부족하다'), 'bad'); return; }
    p.gold -= cost;
    const fresh = rollGear(it.id, this.rng, Math.max(1, it.r));
    fresh.c = it.c;
    p.bag[i] = fresh;
    this.toast(tr('{itemName} — 다시 벼렸다', { itemName: itemName(fresh) }), fresh.r > it.r ? 'good' : '');
    UI.refreshReforge(); UI.refreshBag(); this.sfx('craft');
  },

  /** 유적 석판 — 로어를 읽고 룬 조각을 얻는다 (1회) */
  readTablet(o) {
    const t = TABLETS[o.tablet];
    this.tabletsRead = this.tabletsRead || {};
    const first = !this.tabletsRead[o.tablet];
    const choices = [];
    if (first) choices.push({
      t: tr('(룬 조각을 떼어낸다)'), quest: 1, fn: () => {
        this.tabletsRead[o.tablet] = true;
        const it = makeItem('rune_frag', 1);
        if (!this.player.addItem(it)) this.drops.push(new Drop(this.player.cx, this.player.cy, it));
        this.toast(tr('룬 조각 획득'), 'good');
        UI.closeDialogue(); UI.refreshBag(); UI.refreshTracker();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('open');
  },

  /** 유적 비문 — 본편이 아직 말하지 않은 것을 유적마다 한 조각씩 흘린다 */
  readRuinLore(o) {
    // 흔적(hint)은 보상 없이 읽기만 한다 — 방마다 흩어 둔 짧은 이야기 조각
    if (o.hint !== undefined) {
      const hs = RUIN_HINTS[o.lore];
      const h = hs && hs[o.hint];
      if (!h) return;
      /* ★ 단서는 골방을 세우는 쪽이 흩뿌리는 쪽지(ciphernote)가 든다. */
      UI.openLore(h[0], h[1], []);
      this.sfx('open');
      return;
    }
    const t = RUIN_LORE[o.lore];
    if (!t) return;
    this.loreRead = this.loreRead || {};
    const first = !this.loreRead[o.lore];
    const choices = [];
    if (first) choices.push({
      t: tr('(비문을 옮겨 적는다)'), quest: 1, fn: () => {
        this.loreRead[o.lore] = true;
        const p = this.player;
        p.addXp(Math.round(600 * this.scale()));
        const it = makeItem('aether_shard', 3);
        if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
        this.toast(tr('비문을 옮겨 적었다 — 여정의 기록에 남는다'), 'good');
        // 여섯 유적의 비문을 모두 옮겨 적으면 — 탐굴자의 인장은 그런 자에게만 맞는 크기다
        if (Object.keys(RUIN_LORE).every(k => this.loreRead[k])) {
          const seal = rollGear('charm_delver', this.rng, 3);
          if (!p.addItem(seal)) this.drops.push(new Drop(p.cx, p.cy, seal));
          this.toast(tr('여섯 유적을 모두 뒤졌다 — 탐굴자의 인장을 얻었다'), 'good');
        }
        UI.closeDialogue(); UI.refreshBag();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('open');
  },

  /** 봉인문 — 유적의 열쇠로 연다 */
  openSeal(o) {
    const p = this.player, w = this.world;
    if (o.opened) { this.toast(tr('이미 열려 있다')); return; }
    // 봉인문은 두 곳에 있다 — 심층 봉인실(유적의 열쇠)과 설계실(설계실의 인장).
    const atelier = o.gate === 'atelier';
    const keyId = o.key || 'ruin_key';
    if (p.countItem(keyId) <= 0) {
      UI.openLore(atelier ? tr('설계실 봉인') : tr('봉인문'), atelier
        ? [tr('벽에 이음매가 없다. 문이 아니라, 문이었던 적이 없는 벽이다.'),
           tr('가운데에 손바닥만 한 홈이 하나 파여 있다 — 안쪽에서 만든 것만 맞는 크기다.'),
           tr('『이 벽은 밖에서 열리지 않습니다.』')]
        : [tr('문에는 손잡이가 없다. 대신 세 개의 홈이 파여 있다.'),
           tr('『세 석판을 모두 읽은 자만이 이 문을 연다.』')], []);
      return;
    }
    p.removeItem(keyId, 1);
    o.opened = true;
    if (atelier) {
      const a = w.atelier;
      for (let dy = -1; dy <= 1; dy++) { w.set(a.sealX, a.sealY + dy, T.AIR); w.set(a.sealX + 1, a.sealY + dy, T.AIR); }
    } else {
      const s = w.sealRoom;
      for (let y = s.dy - 4; y <= s.dy + 4; y++) { w.set(s.dx, y, T.AIR); w.set(s.dx + 1, y, T.AIR); }
    }
    for (let i = 0; i < 40; i++)
      this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, atelier ? '#ffe8a0' : '#a06fff', -30, 1.2));
    this.shake = 12;
    this.toast(tr('봉인이 풀렸다'), 'good');
    UI.refreshBag(); this.sfx('chapter');
  },

  /* ================= NPC =================
     대사는 두 겹이다(data.js TALK 주석) — ① 이야기(DIALOGUE·VILLAGE_TALK)
     ② 상황 한 줄(죽은 자리·다친 몸·날씨·밤낮…).
     ★ ①은 "처음 듣는 것"일 때만 나온다. 한 장에 머무는 동안 몇 번을 말 걸어도 같은
       세 줄을 다시 읽게 하지 않는다(다시 듣고 싶으면 선택지가 있다). */

  /** 지금 이 사람이 보고 있는 것 — 상황 판정에 쓰는 값들을 한 번에 모은다 */
  talkCtx() {
    const p = this.player, ch = CHAPTERS[this.chapter];
    let complete = false, ready = false;
    try {
      const st = ch ? this.chapterState(ch) : null;
      complete = !!(st && st.complete);
      ready = !!(st && st.ready && !st.complete);   // 준비는 끝났고 마지막 하나만 남았다
    } catch (e) { complete = ready = false; }
    return {
      ch: this.chapter,
      session: sessionOf(this.chapter).id,
      hour: Math.floor(this.dayT / 60),
      night: this.dayT < 5 * 60 || this.dayT > 19 * 60,
      /* 날씨는 지금 발밑에서 작동 중이 아니어도 본다 — 사막에서 모래를 뒤집어쓰고
         돌아오면 기술자가 그 모래를 알아보는 편이 사람답다. */
      ev: this.event ? this.event.id : null,
      hpr: p.d.maxHp > 0 ? p.hp / p.d.maxHp : 1,
      gold: p.gold,
      grave: !!this.deathMark,
      complete, ready,
      villageLv: this.villageLv()
    };
  },

  /** 이 사람이 지금 상황에서 들고 있는 칸을 고른다. 없으면 아래 칸으로 내려간다. */
  talkMood(id, c) {
    const pool = TALK[id];
    if (!pool) return null;
    for (const m of TALK_MOODS) if (m.when(c) && pool[m.id]) return m.id;
    return null;
  },

  /** 상황 한 줄과 그에 딸린 대답을 뽑는다.
      같은 칸을 다시 만나면 다음 말로 넘어간다 — 무작위가 아니라 순번이라 반드시
      다른 말이 나온다. 순번(talkSeq)은 저장에 남아서 불러와도 이어진다. */
  talkPick(id) {
    const mood = this.talkMood(id, this.talkCtx());
    if (!mood) return null;
    const b = TALK[id][mood], key = id + '|' + mood;
    this.talkSeq = this.talkSeq || {};
    const t = this.talkSeq[key] || 0;
    this.talkSeq[key] = (t + 1) % 2520;    // 2520 = 1~10의 최소공배수 (칸 길이가 몇이든 균등)
    return {
      mood,
      say: b.say[t % b.say.length],
      re: (b.re && b.re.length) ? b.re[t % b.re.length] : null
    };
  },

  /** 대화창 아래의 선택지 = [상황 대답] + 늘 있는 것들(rest).
      대답을 고르면 대꾸를 보여 주고 rest 로 돌아온다 — 대답 한 번 했다고
      가게나 의뢰가 사라지면 안 되니까. */
  talkMenu(id, pick, rest) {
    if (!(pick && pick.re)) return rest;
    const re = pick.re;
    return [{ t: re.t, say: 1, fn: () => { UI.closeDialogue(); this.talkAnswer(id, re, rest); } }].concat(rest);
  },

  talkAnswer(id, re, rest) {
    const lines = Array.isArray(re.s) ? re.s.slice() : [re.s];
    UI.openDialogue(id, lines, rest);
    this.sfx('talk');
  },

  talkExtra(id) {
    const cs = [];
    if (NPCS[id].shop) cs.push({ t: tr('물건을 보여 달라'), fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    if (id === 'trainer') {
      cs.push({ t: tr('스탯 재분배 · 🪙 {respecCost}', { respecCost: fmt(this.respecCost()) }), fn: () => { UI.closeDialogue(); this.respecStats(); } });
      cs.push({ t: tr('수련 · 🪙 {trainCost} · 오늘 {trainedToday}/5', { trainCost: fmt(this.trainCost()), trainedToday: this.trainedToday }), fn: () => { UI.closeDialogue(); this.trainXp(); } });
    } else if (id === 'haran') {
      cs.push({ t: tr('방을 잡는다'), fn: () => { UI.closeDialogue(); this.useInn(); } });
    } else if (id === 'seira') {
      cs.push({ t: tr('장비를 다시 벼려 달라'), fn: () => { UI.closeDialogue(); UI.openReforge(); } });
    } else if (NPCS[id].dynamicShop) {
      cs.push({ t: tr('오늘 실은 것을 보자'), fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    }
    /* 하나뿐이면 묶지 않는다(한 줄을 두 번 누르게 만드는 꼴이다). */
    return cs.length > 1 ? [{ t: tr('볼일이 있다'), sub: cs }] : cs;
  },

  talkTo(id) {
    this.talked = this.talked || {};
    const first = !this.talked[id];
    this.talked[id] = true;
    if (DAWN_NPCS.includes(id)) { this.talkVillager(id, first); return; }

    const story = this.storyOf(id, this.chapter) || [''];
    this.storyHeard = this.storyHeard || {};
    const fresh = this.storyHeard[id] !== this.chapter;   // 이 장의 이야기를 아직 안 들었다
    this.storyHeard[id] = this.chapter;

    /* 첫 대면에는 상황 한 줄을 붙이지 않는다 — 인사보다 먼저 날씨 얘기를 꺼내는 사람은 없다. */
    const pick = (first && this.chapter === 0) ? null : this.talkPick(id);
    const lines = fresh ? story.slice() : [];
    if (pick) lines.push(pick.say);
    if (!lines.length) lines.push(story[story.length - 1]);

    const rest = [];
    /* 이야기를 이미 들은 뒤에는 다시 듣는 길을 남겨 둔다 — 놓친 줄이 있을 수 있으니까 */
    if (!fresh) rest.push({ t: tr('다시 듣기'), replay: 1, fn: () => {
      UI.closeDialogue();
      UI.openDialogue(id, story.slice(), rest);
      this.sfx('talk');
    } });
    rest.push(...this.talkExtra(id));
    if (SIDE_POOL[id]) rest.push({
      t: this.sideActive[id] ? tr('의뢰에 대해 묻는다') : tr('부탁할 일이 있는지 묻는다'),
      quest: 1, fn: () => { UI.closeDialogue(); this.sideTalk(id); }
    });
    rest.push({ t: tr('지금 무엇을 해야 하지?'), quest: 1, fn: () => { UI.closeDialogue(); this.tellQuest(); } });
    if (id === 'elara' && this.chapter === 0) rest.push({ t: tr('(여정을 시작한다)'), quest: 1, fn: () => { UI.closeDialogue(); } });
    UI.openDialogue(id, lines, this.talkMenu(id, pick, rest));
    this.sfx('talk');
  },

  /** 그 사람이 이 장에 할 이야기. */
  storyOf(id, ch) {
    const a = DIALOGUE[id];
    if (!a || !a.length) return null;
    /* 세션 3에서 처음 만나는 사람은 대사 묶음이 15장부터 시작한다 — 앞에 빈 칸 열다섯 개를 채워 넣을 수는 없으니, NPCS[id].from(첫 등장 장)만큼 빼서 센다 — 사연:
       docs/code-history.md#h45 */
    const from = (NPCS[id] && NPCS[id].from) || 0;
    return a[clamp(ch - from, 0, a.length - 1)] || null;
  },

  /* ---- 여명 마을 주민 (종장 이후에만 세계에 존재한다) ---- */
  talkVillager(id, first) {
    const d = NPCS[id];
    /* ★ 여명 마을 다섯도 캠프 넷과 같은 식으로 장마다 한 번씩 이야기를 한다. */
    const story = this.storyOf(id, this.chapter);
    this.storyHeard = this.storyHeard || {};
    const fresh = !!story && this.storyHeard[id] !== this.chapter;
    if (story) this.storyHeard[id] = this.chapter;
    /* 그 사람을 처음 만나는 자리에서만 서명 같은 한 줄을 듣는다 — 매번 앞에 두면 열 번 말 걸어 열 번 같은 말이 된다. */
    const pick = (first || fresh) ? null : this.talkPick(id);
    const lines = [];
    if (first) lines.push(d.line);
    if (fresh) lines.push(...story);
    if (pick) lines.push(pick.say);
    /* 마을이 한 단계 자랐으면 그 사실을 한 번 알려 준다 — 매번이 아니라 바뀐 그때. */
    this.villageSeen = this.villageSeen || {};
    const lv = this.villageLv(), vt = VILLAGE_TALK[id];
    if (vt && vt[lv] && this.villageSeen[id] !== lv) { lines.push(vt[lv]); this.villageSeen[id] = lv; }
    if (!lines.length) lines.push(story ? story[story.length - 1] : d.line);
    const rest = this.talkExtra(id);
    if (story && !fresh) rest.push({ t: tr('다시 듣기'), replay: 1, fn: () => {
      UI.closeDialogue();
      UI.openDialogue(id, story.slice(), rest);
      this.sfx('talk');
    } });
    /* 마을 주민에게도 부탁을 받는다 — 이 다섯에게만 부탁이 없으면 도시가 사람이 사는 곳이 아니라 상점가로 보인다. */
    if (SIDE_POOL[id]) rest.push({
      t: this.sideActive[id] ? tr('맡은 일에 대해 묻는다') : tr('도울 일이 있는지 묻는다'),
      quest: 1, fn: () => { UI.closeDialogue(); this.sideTalk(id); }
    });
    /* 마을 주민에게도 길을 물을 수 있다 — 세션 2는 대부분의 시간을 여기서 보낸다. */
    rest.push({ t: tr('지금 무엇을 해야 하지?'), quest: 1, fn: () => { UI.closeDialogue(); this.tellQuest(); } });
    UI.openDialogue(id, lines, this.talkMenu(id, pick, rest));
    this.sfx('talk');
  },

  /* ---- 사이드 퀘스트 ---- */
  sideProgress(sq) { return this.objSince(sq.obj, sq.start); },
  sideTalk(npcId) {
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
  acceptSideQuest(npcId, tpl) {
    this.sideActive[npcId] = Object.assign({}, tpl, { start: this.objStart(tpl.obj) });
    this.toast(tr('부탁을 맡았다: {title}', { title: tpl.title }), 'good');
    UI.refreshQuest(); UI.refreshTracker();
  },
  completeSideQuest(npcId) {
    const sq = this.sideActive[npcId]; if (!sq) return;
    const p = this.player, pay = this.sidePay(sq);
    p.addXp(pay.xp); p.gold += pay.gold;
    for (const [id, n] of (sq.rw.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 1);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
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
      const pick = st.basics.find(b => !b.p.done && st.missing.includes(b.o.verb))
                || st.basics.find(b => !b.p.done);
      this.toast(tr('{session} · 준비 {done}/{need}', { session, done: st.done, need: st.need }) + (pick ? ` · ${pick.o.t} (${pick.p.label || pick.p.cur + "/" + pick.p.max})` : ''));
    }
    UI.togglePanel('quest');
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

  /* ---- 미니보스 둥지 ---- */
  wakeLair(o) {
    this.lairs = this.lairs || {};
    // 바이옴 유적의 빈 둥지는 메아리 시련 자리다(RUIN_SPEC 의 여섯만 — 나머지 둥지는 그대로 빈다)
    if (this.lairs[o.ruin] && RUIN_SPEC[o.ruin] && RUIN_SPEC[o.ruin].id) { this.openEcho(o); return; }
    if (this.lairs[o.ruin]) { this.toast(tr('이미 비어 있다')); return; }
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    if (this.bossGated(o.boss)) return;
    const spec = RUIN_SPEC[o.ruin];
    const name = o.nm || (spec ? spec.n : tr('둥지'));
    UI.openLore(name, [
      tr('무언가가 이 자리에서 아주 오래 기다렸다.'),
      tr('건드리면 깨어난다.')
    ], [
      {
        t: tr('(깨운다)'), quest: 1, fn: () => {
          UI.closeDialogue();
          // 어느 둥지를 깨웠는지 기억해 둔다 — 잡으면 그 둥지를 비운 것으로 남긴다
          this.pendingLair = o.ruin;
          this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 70);
        }
      },
      { t: tr('(그냥 둔다)'), fn: () => UI.closeDialogue() }
    ]);
  },
};
mixin(G, VillagePart);
