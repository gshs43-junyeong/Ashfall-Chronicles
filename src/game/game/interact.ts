/* ===== game/interact.js — 상호작용 — 상자 · 단말 · 비석 · 봉인 · 길잡이 돌 · 분수 · 여관 · 소모품 ===== */
import { aabb, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG, hashStr } from '../../engine/core/rng.js';
import { fmt, tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { T } from '../data.js';
import { ITEMS, OBJ_SIZE } from '../data/items.js';
import { RUIN_HINTS, RUIN_LORE } from '../data/ruins.js';
import { TABLETS, TERMINALS } from '../data/story.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { itemName, makeItem, rollChest, rollGear } from '../items.js';
import { Drop, Enemy, Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const InteractPart: Bag = {
  findObjAt(wx: number, wy: number) {
    /* 내가 놓은 설치물부터 본다. */
    const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    for (const o of this.world.objects) {
      if (!o.placed || !OBJ_SIZE[o.type]) continue;
      const x0 = Math.floor(o.x / TS), x1 = Math.floor((o.x + o.w - 1) / TS);
      const y1 = Math.floor((o.y + o.h - 1) / TS);
      const y0 = y1 - ((OBJ_SIZE[o.type].th || 1) - 1);
      if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) return o;
    }
    for (const o of this.world.objects) {
      if (o.type === 'furniture') continue;   // 순수 장식물 — 상호작용 대상이 아니다
      if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
    }
    return null;
  },
  /** 상자 지킴이를 깨운다 — 세계의 몹이라 호스트(혼자면 나)만. */
  wakeChestGuard(o: Bag) {
    const n = o.guard.n || 2;
    for (let i = 0; i < n; i++) this.ents.push(new Enemy(o.guard.t, o.x + (i - n / 2) * 34, o.y - 40, this.scale()));
    this.toast(tr('상자를 열자 무언가 깨어났다'), 'bad');
    this.shake = 10;
  },
  /** 보스가 달린 상자 — 잡몹 지킴이(o.guard)와 달리 하나가 제대로 깨어난다. */
  wakeChestBoss(o: Bag) {
    this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 80);
    this.toast(tr('상자를 열자 섬이 흔들렸다'), 'bad');
    this.shake = 20;
  },
  interact(o: Bag) {
    if (o.type === 'chest') {
      /* ★ 암호 골방의 상자는 그 유적의 암호문이 풀린 뒤에만 열린다. */
      if (o.codeRuin && !this.ruinCodeDone(o.codeRuin)) {
        this.toast(tr('상자에 손이 닿지 않는다 — 골방 문을 먼저 열어야 한다'), 'bad');
        return;
      }
      if (!o.items) {
        const tx = Math.floor(o.x / TS), ty = Math.floor(o.y / TS);
        const source = o.loot || this.world.chestLootProfile(tx, ty);
        o.items = rollChest(o.tier, new RNG(Math.floor(o.x) * 7919 + Math.floor(o.y) * 104729 + hashStr(this.world.seed)), source);
        /* 유적 유물은 굴리지 않는다 — 유적마다 하나뿐이라 확률에 맡기면 끝까지 들어간 값이 안 된다. */
        if (o.relic && ITEMS[o.relic]) {
          const relic = makeItem(o.relic, 1);
          o.items.unshift(relic);
          this.toast(tr('{itemName} — 이 유적의 것', { itemName: itemName(relic!) }), 'good');
        }
        // 다른 유적의 위치 지도 — 입구 없는 유적으로 이어지는 사슬
        if (o.ruinmap && ITEMS[o.ruinmap]) o.items.unshift(makeItem(o.ruinmap, 1));
        // 그 유적 상자에만 섞이는 전리품
        if (o.bonus && ITEMS[o.bonus]) o.items.push(makeItem(o.bonus, this.rng.int(2, 5)));
        // 그 유적에서만 나오는 재료 — 흔한 자원(bonus)과 나란히 넣는다
        if (o.bonus2 && ITEMS[o.bonus2]) o.items.push(makeItem(o.bonus2, this.rng.int(2, 4)));
        this.pulseChest(o, tx, ty);      // 맥박이 뛰는 유적의 상자 — 덤을 얹고 맥박을 올린다
      }
      UI.openChest(o); this.sfx('open');
      if (this.net) this.netWatch(o);
      /* 지킴이가 붙은 상자 — 열면 그 자리에서 깨어난다. 참가자가 열면 몹은 호스트가 깨운다(상자 상태가 넘어가면 — game/net.ts). */
      const guest = !!(this.net && this.net.role === 'guest');
      if (o.guard && !o.guarded) {
        o.guarded = true;
        if (!guest) this.wakeChestGuard(o);
      }
      if (o.boss && !o.woke) {
        o.woke = 1;
        if (!guest) this.wakeChestBoss(o);
      }
    } else if (o.type === 'crate') {
      if (!o.items) o.items = new Array(o.slots || 24).fill(null);
      UI.openStore(o); this.sfx('open');
      if (this.net) this.netWatch(o);
    } else if (o.type === 'lorestone') {
      this.readRuinLore(o);
    } else if (o.type === 'workbench' || o.type === 'forge') {
      const kind = o.type === 'forge' ? 'forge' : 'work';
      this.nearSt[kind] = true; this.nearStObj[kind] = o;
      UI.craftTab = kind;
      UI.togglePanel('craft');
    } else if (o.type === 'npc') {
      this.talkTo(o.npc);
    } else if (o.type === 'altar') {
      this.altar(o);
    } else if (o.type === 'rig') {
      if (!o.gone) this.useRig(o);
    } else if (o.type === 'tablet') {
      this.readTablet(o);
    } else if (o.type === 'seal') {
      this.openSeal(o);
    } else if (o.type === 'anchor') {
      this.useAnchor(o);
    } else if (o.type === 'memory') {
      this.takeMemory(o);
    } else if (o.type === 'codedoor') {
      this.openCodeDoor(o);
    } else if (o.type === 'ciphernote') {
      this.readCipherNote(o);
    } else if (o.type === 'mystic') {
      this.useMystic(o);
    } else if (o.type === 'vault') {
      UI.openVault(); this.sfx('open');
    } else if (o.type === 'board') {
      UI.openBoard(); this.sfx('open');
    } else if (o.type === 'reforge') {
      UI.openReforge(); this.sfx('open');
    } else if (o.type === 'anvil') {
      UI.openAnvil(); this.sfx('open');
    } else if (o.type === 'waystone') {
      this.useWaystone();
    } else if (o.type === 'fountain') {
      this.useFountain(o);
    } else if (o.type === 'inn') {
      this.useInn();
    } else if (o.type === 'lair') {
      this.wakeLair(o);
    } else if (o.type === 'townhall') {
      UI.openTownhall(); this.sfx('open');
    } else if (o.type === 'terminal') {
      this.readTerminal(o);
    } else if (o.type === 'door') {
      /* 닫을 때 문틀 안에 누가 서 있으면 닫히지 않는다 — 닫힌 문은 길을 막으므로 제자리에서 닫으면 제 몸이 벽에 낀다(빠져나갈 길이 없다). */
      if (!o.closed && aabb(this.world.doorEdge(o), this.player.rect())) {
        this.toast(tr('문틀에서 비켜야 닫힌다'), 'bad'); return;
      }
      o.closed = !o.closed;
      this.sfx(o.closed ? 'door_shut' : 'door_open');
      if (this.net) this.netDoor(o);
    }
  },

  /** 공창 단말 — 로어를 읽고 설계도 조각을 얻는다 (단말마다 1회) */
  readTerminal(o: Bag) {
    const t = TERMINALS[o.term];
    this.termsRead = this.termsRead || {};
    const first = !this.termsRead[o.term];
    const choices = [];
    const give = t.it || 'blueprint_frag';
    if (first) choices.push({
      t: tr('({item|을} 뽑아낸다)', { item: ITEMS[give].n }), quest: 1, fn: () => {
        this.termsRead[o.term] = true;
        const it = makeItem(give, t.it ? 8 : 1);
        if (!this.player.addItem(it)) this.drops.push(new Drop(this.player.cx, this.player.cy, it!));
        this.toast(tr('{item} 획득', { item: ITEMS[give].n }), 'good');
        UI.closeDialogue(); UI.refreshBag(); this.checkChapter();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('talk');
  },

  /** 유적 석판 — 로어를 읽고 룬 조각을 얻는다 (1회) */
  readTablet(o: Bag) {
    const t = TABLETS[o.tablet];
    this.tabletsRead = this.tabletsRead || {};
    const first = !this.tabletsRead[o.tablet];
    const choices = [];
    if (first) choices.push({
      t: tr('(룬 조각을 떼어낸다)'), quest: 1, fn: () => {
        this.tabletsRead[o.tablet] = true;
        const it = makeItem('rune_frag', 1);
        if (!this.player.addItem(it)) this.drops.push(new Drop(this.player.cx, this.player.cy, it!));
        this.toast(tr('룬 조각 획득'), 'good');
        UI.closeDialogue(); UI.refreshBag(); UI.refreshTracker();
      }
    });
    const [n, all] = this.memoryCount('story' + o.tablet);   // 기억 조각이 흩어진 자리를 석판이 일러 준다
    UI.openLore(t.n, all ? [...t.lines, tr('— 기억의 조각 {n}/{all} — 금 간 벽 뒤, 높은 턱 위, 유물 곁에 흩어져 있다', { n, all })] : t.lines, choices);
    this.sfx('open');
  },

  /** 유적 비문 — 본편이 아직 말하지 않은 것을 유적마다 한 조각씩 흘린다 */
  readRuinLore(o: Bag) {
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
        p.addXp(Math.round(p.xpNext * 0.4));
        const it = makeItem('aether_shard', 3);
        if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
        this.toast(tr('비문을 옮겨 적었다 — 여정의 기록에 남는다'), 'good');
        // 여섯 유적의 비문을 모두 옮겨 적으면 — 탐굴자의 인장은 그런 자에게만 맞는 크기다
        if (Object.keys(RUIN_LORE).every(k => this.loreRead[k])) {
          const seal = rollGear('charm_delver', this.rng, 3);
          if (!p.addItem(seal)) this.drops.push(new Drop(p.cx, p.cy, seal!));
          this.toast(tr('여섯 유적을 모두 뒤졌다 — 탐굴자의 인장을 얻었다'), 'good');
        }
        UI.closeDialogue(); UI.refreshBag();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('open');
  },

  /** 봉인문 — 유적의 열쇠로 연다 */
  openSeal(o: Bag) {
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

  /* ================= 여명 마을 시설 ================= */

  /** 귀환 비석 — 베이스캠프 ↔ 여명 마을 왕복 */
  useWaystone() { const { WW, WH } = dimsOf(this.world);
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
    UI.openLore(tr('귀환 비석'), [tr('비석에 손을 대면 {to|로} 돌아간다.', { to })], [
      {
        t: tr('({to|로} 이동한다)', { to }), quest: 1, fn: () => {
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
  useFountain(o: Bag) {
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
          /* 눈을 감았다 뜬다 — 가장 어두운 순간에 아침으로 넘긴다(engine render/fade) */
          this.fade.run(() => {
            this.dayT = 6 * 60; this.dayCount++; this.trainedToday = 0;
            this.updateEconomy(); this.rollBounties();
            p.hp = p.d.maxHp; p.mp = p.d.maxMp;
            p.addBuff('rested');
            this.toast(tr('푹 잤다 — 아침이다'), 'good');
            this.sfx('level');
            this.tally = this.tally || {};
            this.tally.inn = (this.tally.inn || 0) + 1;
            this.checkAch();
          }, 0.6, 0.5, 1.0);
        }
      }
    ]);
  },

  /* ================= 소비 / 제작 ================= */
  useConsumable(slot: number) {
    const p = this.player, it = p.bag[slot], d = idef(it);
    if (d.use!.egg) { this.hatchEgg(d.use!.egg); it.c--; if (it.c <= 0) p.bag[slot] = null; UI.refreshBag(); this.sfx('hatch'); return; }
    if (d.use!.dragonFeed) { this.feedDragon(slot, d.use!.dragonFeed); return; }
    /* 펫 사탕 — 낀 펫이 없으면 그냥 사라지므로, 쓰기 전에 막아 준다 */
    if (d.use!.petXp) {
      if (!p.equip.pet1 && !p.equip.pet2) { this.toast(tr('펫을 끼고 있어야 준다'), 'bad'); return; }
      p.addPetXp(d.use!.petXp);
      it.c--; if (it.c <= 0) p.bag[slot] = null;
      UI.refreshBag(); this.sfx('drink'); return;
    }
    // instant(치유·마나 물약)는 공유 재사용 대기시간을 아예 안 걸고 안 본다 — 음식·물고기 등 나머지 회복 소비품끼리는 여전히 potionCd를 공유한다
    /* 맥박을 움직이는 것(고요의 물약 · 맥박 북) — 유적 밖에서는 쓰지 않고 그대로 둔다 */
    if (d.use!.pulse) {
      if (!this.pulseHere) { this.toast(tr('유적 안에서만 듣는다'), 'bad'); return; }
      this.addPulse(this.pulseHere, d.use!.pulse, true);
      this.toast(d.use!.pulse < 0 ? tr('유적의 맥박이 가라앉는다') : tr('유적이 북소리에 뒤척인다'), d.use!.pulse < 0 ? 'good' : 'bad');
      it.c--; if (it.c <= 0) p.bag[slot] = null;
      UI.refreshBag(); this.sfx(d.use!.pulse < 0 ? 'drink' : 'chapter');
      return;
    }
    if (!d.instant && p.potionCd > 0 && d.use!.hp) { this.toast(tr('아직 회복할 수 없다'), 'bad'); return; }
    if (d.use!.hp) { p.heal(d.use!.hp); if (!d.instant) p.potionCd = d.cd || 10; }
    if (d.use!.mp) p.mp = Math.min(p.d.maxMp, p.mp + d.use!.mp);
    if (d.use!.buff) {
      // 음식(fed_)은 한 가지만 유지된다 — 겹쳐 먹을 수 있으면 요리를 고를 이유가 없어진다
      if (d.use!.buff.startsWith('fed_')) p.buffs = p.buffs.filter((b: any) => !b.id.startsWith('fed_'));
      p.addBuff(d.use!.buff);
    }
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    UI.refreshBag(); this.sfx('drink');
  },
};

mixin(Game.prototype, InteractPart, true);
