/* ===== game/fishing.js — 낚시 ===== */
import { aabb, clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG, hashStr } from '../../engine/core/rng.js';
import { tr } from '../lang.js';
import { CAMP_X1, WH, WORLD_BOT, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { ITEMS, OBJ_SIZE } from '../data/items.js';
import { MACHINE } from '../data/recipes.js';
import { PROF_MAX } from '../data/skills.js';
import { TERMINALS, sessionOf } from '../data/story.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Drop, Enemy, Part, isGear, itemName, makeItem, rollChest, rollGear } from '../entity.js';
import { Factory } from '../factory.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const FishingPart: Bag = {

  /* ================= 낚시 ================= */
  tryFish() {
    const p = this.player, w = this.world;
    const rod = idef(p.held());
    if (p.fish) {
      // 이미 드리운 줄 — 입질 중이면 즉시 챔질(보너스), 대기 중이면 거둔다
      if (p.fish.biting) { this.resolveFish('reel'); }
      else { this.fishSplash(p.fish, 3); p.fish = null; this.toast(tr('낚싯줄을 거두었다')); }
      return;
    }
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast(tr('너무 멀다'), 'bad'); return; }
    const t = w.get(tx, ty);
    // 타일 번호를 하나씩 세지 않고 liquid 표시로 본다 — 바닷물·수련칸이 늘 때마다 빠뜨렸다
    if (!TILE_DEF[t].liquid) { this.toast(tr('물 위에 던져야 한다'), 'bad'); return; }
    // 이 물이 특별히 매긴 웅덩이(정글 폭포호 등)에 속하면 rareMul을 물려받는다 — 없으면 1(보정 없음).
    let rareMul = 1;
    for (const pl of (w.pools || [])) {
      if (pl.rareMul === undefined) continue;
      if (Math.abs(tx - pl.x) < 16 && Math.abs(ty - pl.y) < 10) { rareMul = pl.rareMul; break; }
    }
    // 낚시 숙련 — 레벨마다 입질까지의 대기가 4%씩 짧아진다
    const wait = this.rng.range(1.2, 2.8) * (rod.fishWait !== undefined ? rod.fishWait : 1)
      * (1 - (p.profLv('fish') - 1) * 0.04);
    p.fish = { tx, ty, t: wait, biting: false, bite: 0, rodId: p.held().id, rareMul };
    for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, ty * TS, '#cfe8ff', -20, .5));
    this.sfx('splash');
    this.toast(tr('낚싯줄을 드리웠다'));
  },
  updateFishing(dt) {
    const p = this.player;
    if (!p.fish) return;
    // 손에서 낚싯대를 놓으면(핫바를 바꾸면) 줄도 같이 놓인다
    const held = p.held();
    if (!held || idef(held).type !== 'rod') { p.fish = null; return; }
    const f = p.fish;
    if (!f.biting) {
      f.t -= dt;
      if (f.t <= 0) {
        // 3레벨 '가벼운 손목' — 챌 수 있는 창이 1.0초에서 1.6초로 늘어난다
        f.biting = true; f.bite = f.biteMax = p.profLv('fish') >= 3 ? 1.6 : 1.0;
        this.toast(tr('손끝이 흔들린다!'), 'good');
        for (let i = 0; i < 10; i++) this.parts.push(new Part((f.tx + .5) * TS, f.ty * TS, '#ffe08a', -30, .6));
      }
    } else {
      f.bite -= dt;
      if (f.bite <= 0) this.resolveFish('auto');
    }
  },
  /** 놓쳤을 때의 뒤처리 — 미끼는 이미 먹혔다(resolveFish에서 뺀다) */
  _fishLost(msg) {
    this.player.fish = null;
    this.toast(msg, 'bad');
    UI.refreshBag();                // 물 튀김·소리는 resolveFish 가 줄을 걷는 순간 이미 냈다
  },
  /** 줄을 걷는 순간의 물 튀김. */
  fishSplash(f, n) {
    const wx = (f.tx + .5) * TS, wy = f.ty * TS;
    for (let i = 0; i < n; i++)
      this.parts.push(new Part(wx, wy, i % 3 ? '#cfe8ff' : '#ffffff', -60 - Math.random() * 50, .55));
  },
  /** 낚시 판정 — quality: 'auto'(시간 초과, 기본 확률) | 'reel'(입질 중 즉시 챔질, 보너스) 2단계로 굴린다 */
  /** 낚시 판정 — quality: 'auto'(시간 초과) | 'reel'(입질 중 즉시 챔질, 보너스). */
  resolveFish(quality) {
    const p = this.player;
    if (!p.fish) return;
    const rod: Bag = ITEMS[p.fish.rodId] || {};
    const rareMul = p.fish.rareMul === undefined ? 1 : p.fish.rareMul;
    const baited = p.removeItem('raw_meat', 1);
    /* 낚시 숙련 — 상위 어종 확률과 "잡것" 확률을 함께 밀어 올린다. */
    const flv = p.profLv('fish');
    const fishBonus = (rod.fishBonus || 0) + (baited ? 0.20 : 0) + (quality === 'reel' ? 0.12 : 0) + (flv - 1) * 0.02;
    const itemChance = clamp(((rod.fishItemChance || 0) + (baited ? 0.08 : 0) + (quality === 'reel' ? 0.05 : 0) + (flv - 1) * 0.015) * rareMul, 0, 0.85);
    // ★ 자리를 지우기 **전에** 튀긴다 — p.fish 가 null 이 되면 어디서 걷었는지 모른다
    this.fishSplash(p.fish, quality === 'reel' ? 14 : 7);
    this.sfx('splash');
    p.fish = null;
    p.addProf('fish', 1);

    /* 실패 — 오래 기다린 만큼 놓칠 수도 있어야 긴장이 생긴다. */
    const missBase = quality === 'reel' ? 0.12 : 0.55;
    const miss = clamp(missBase - (rod.fishBonus || 0) * 0.5 - (baited ? 0.05 : 0), 0.04, 0.75);
    if (this.rng.chance(miss)) {
      this._fishLost(quality === 'reel'
        ? this.rng.chance(0.5) ? tr('챘지만 바늘이 빠졌다') : tr('줄이 끊겼다')
        : tr('입질을 흘렸다 — 미끼만 털렸다'));
      return;
    }

    if (this.rng.chance(itemChance)) {
      // 1단계 통과 — 물고기 말고 다른 것.
      /* ★ 빼지 않고 **더한다**. 잡템(젤·뼈)이 대부분인 것이 낚시가 "가끔 뭔가 나온다"로 느껴지는 밑바탕이라 그대로 두고, 그 위에 아주 가끔 걸리는 것을 얹는다. */
      /* ★ 물에서 올라오는 것이 세션마다 다르다 — 사연: docs/code-history.md#h43 */
      const lucky = (flv - 1) * 0.9 + fishBonus * 6;   // 0 ~ 대략 12
      const s2 = sessionOf(this.chapter).id >= 2;      // 세션 2 이후인가
      const itemTable = [
        // --- 원래 있던 것 셋. 여전히 대부분은 이쪽이다 ---
        ['slime_gel', 34], ['potion_hp', 20], ['aether_shard', 12],
        // --- 물에서만 나오는 일곱. 세션에 따라 무게가 갈린다 ---
        ['river_scale', s2 ? 3 : 16],
        ['tide_pearl', s2 ? 4 : 9 + lucky * 0.5],
        ['lantern_fry', s2 ? 2 : 8 + lucky * 0.4],
        ['sunken_coin', s2 ? 2.5 : 4 + lucky * 0.5],
        ['rust_sinker', s2 ? 16 : 1.5],
        ['drowned_cell', s2 ? 10 + lucky * 0.4 : 0],
        ['coolant_vial', s2 ? 7 + lucky * 0.4 : 0],
        /* --- 물에서만 나오는 무기 셋 · 장신구 셋 --- */
        ['spear_river', s2 ? 0 : 0.30 + lucky * 0.10],
        ['bow_reed', s2 ? 0 : 0.30 + lucky * 0.10],
        ['staff_current', s2 ? 0 : 0.26 + lucky * 0.09],
        ['charm_float', s2 ? 0 : 0.22 + lucky * 0.08],
        ['ring_ripple', s2 ? 0 : 0.22 + lucky * 0.08],
        ['amul_river', s2 ? 0 : 0.20 + lucky * 0.07],
        ['harpoon_cool', s2 ? 0.30 + lucky * 0.10 : 0],
        ['gun_pressure', s2 ? 0.26 + lucky * 0.09 : 0],
        ['staff_deluge', s2 ? 0.24 + lucky * 0.09 : 0],
        ['charm_conden', s2 ? 0.22 + lucky * 0.08 : 0],
        ['ring_sluice', s2 ? 0.22 + lucky * 0.08 : 0],
        ['amul_undertow', s2 ? 0.20 + lucky * 0.07 : 0],
        // --- 어느 물에서든 드물다 ---
        ['knot_angler', 0.35 + lucky * 0.15]
      ];
      const catchId = this.rng.weighted(itemTable);
      const stackN = {
        slime_gel: [2, 5], aether_shard: [1, 2],
        river_scale: [2, 4], tide_pearl: [1, 2], rust_sinker: [1, 3],
        drowned_cell: [1, 2], sunken_coin: [1, 1]
      }[catchId];
      const n = stackN ? this.rng.int(stackN[0], stackN[1]) : 1;
      const it = isGear(makeItem(catchId)) ? rollGear(catchId, this.rng, 0) : makeItem(catchId, n);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
      /* 한 번 낚으면 기억에 남아야 하는 것 — 물에서만 나오는 무기·장신구 전부와 값나가는 셋. */
      const rare = isGear(makeItem(catchId))
        || ['knot_angler', 'sunken_coin', 'tide_pearl'].includes(catchId);
      if (rare) {
        // 이런 건 한 번 낚으면 기억에 남아야 한다
        this.toast(tr('물속에서 무언가 딸려 올라왔다 — {itemName}', { itemName: itemName(it) }), 'good');
        this.burst(p.cx, p.cy - 4, 'stargain', 52, 2.0);
        this.ringFx(p.cx, p.cy, 60, '#7fc8e8', .5);
        this.sfx('level');
      } else {
        this.toast(tr('뭔가 걸렸다 — {itemName}{v}', { itemName: itemName(it), v: n > 1 ? ' ×' + n : '' }), 'good');
        this.sfx('open');
      }
      p.addProf('fish', rare ? 3 : 1);          // 빈 바늘보다 건진 쪽이 더 는다
      UI.refreshBag();
      return;
    }

    /* 물고기 자체도 세션마다 다르게 올라온다. */
    const s2fish = sessionOf(this.chapter).id >= 2;
    const table = [
      ['none', Math.max(6, (s2fish ? 22 : 26) - fishBonus * 30)],
      ['fish_common', s2fish ? 30 : 44],
      ['fish_silver', (s2fish ? 24 : 16) + fishBonus * 26],
      ['fish_deep', ((s2fish ? 15 : 7) + fishBonus * 30) * (flv >= 6 ? 2.2 : 1)]
    ];
    const catchId = this.rng.weighted(table);
    if (catchId === 'none') { this.toast(baited ? tr('미끼만 사라졌다') : tr('빈 바늘만 올라왔다'), 'bad'); UI.refreshBag(); return; }
    // 10레벨 '물때를 안다' — 가끔 한 마리가 더 딸려 온다
    const n = (flv >= PROF_MAX && this.rng.chance(0.25)) ? 2 : 1;
    const it = makeItem(catchId, n);
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    this.toast(tr('낚았다 — {itemName}{v}', { itemName: itemName(it), v: n > 1 ? ' ×' + n : '' }), 'good');
    p.addProf('fish', 1);                      // 빈 바늘보다 건진 쪽이 더 는다
    this.sfx('open');
    UI.refreshBag();
  },
  findObjAt(wx, wy) {
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
  interact(o) {
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
          this.toast(tr('{itemName} — 이 유적의 것', { itemName: itemName(relic) }), 'good');
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
      // 지킴이가 붙은 상자 — 열면 그 자리에서 깨어난다.
      if (o.guard && !o.guarded) {
        o.guarded = true;
        const n = o.guard.n || 2;
        for (let i = 0; i < n; i++) {
          const e = new Enemy(o.guard.t, o.x + (i - n / 2) * 34, o.y - 40, this.scale());
          this.ents.push(e);
        }
        this.toast(tr('상자를 열자 무언가 깨어났다'), 'bad');
        this.shake = 10;
      }
      /* 보스가 달린 상자 — 잡몹 지킴이(o.guard)와 달리 하나가 제대로 깨어난다. */
      if (o.boss && !o.woke) {
        o.woke = 1;
        this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 80);
        this.toast(tr('상자를 열자 섬이 흔들렸다'), 'bad');
        this.shake = 20;
      }
    } else if (o.type === 'crate') {
      if (!o.items) o.items = new Array(o.slots || 24).fill(null);
      UI.openStore(o); this.sfx('open');
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
    }
  },

  /** ?debug=factory — 캠프 오른쪽을 평평하게 밀고 기계 스물여섯 종을 한 줄로 세운다.
      전주는 10칸마다(반경 5 · 이음 10) 서서 줄 전체가 망 하나다. 몹은 &mobs=1 일 때만 나온다. */
  buildDebugFactory(qs) {
    const p = this.player, w = this.world;
    const give = (id, n) => {
      const max = ITEMS[id].stack || 1;
      for (let left = n; left > 0; left -= max) {
        const it = makeItem(id, Math.min(max, left), 0);
        if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
      }
    };
    const plv = +qs.get('plv') || 40;
    while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
    p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
    p.gold = +qs.get('gold') || 200000;
    this.dbgCalm = qs.get('mobs') !== '1';
    this.dayT = 12 * 60;
    for (const k in MACHINE) give(MACHINE[k].item, 10);   // 가방엔 기계만 — 재료는 줄 왼쪽 끝 자재 상자에

    const X0 = CAMP_X1 + 8, LEN = 84, AX = X0 + LEN + 12, BX = AX + 40, XEND = BX + 28;
    let gy = 0;
    for (let x = X0 - 8; x <= XEND; x++) gy = Math.max(gy, w.surface[clamp(x, 0, WW - 1)]);
    gy = Math.min(gy, WORLD_BOT - 20);
    // 시험장 자리에 걸린 채취탑은 걷는다(디버그 전용)
    for (const o of w.objects) if (o.type === 'rig' && o.tx >= X0 - 16 && o.tx <= XEND + 8) o.gone = 1;
    this._rigs = null;
    for (let x = X0 - 8; x <= XEND; x++) {
      for (let y = gy - 30; y <= gy + 6; y++) {
        if (!w.inB(x, y)) continue;
        w.set(x, y, y < gy ? T.AIR : y === gy ? T.GRASS : T.DIRT);
        if (y < gy) w.walls[w.i(x, y)] = 0;               // 풍차가 볼 하늘 — 뒷벽도 걷는다
      }
      w.surface[x] = gy;
    }
    const Y = gy - 1;
    for (let x = 0; x <= 8; x++) for (let y = gy + 1; y <= gy + 4; y++) w.set(X0 + 28 + (x % 5), y, T.OILSHALE);
    [T.IRON, T.COPPER, T.COAL, T.GOLD, T.IRON, T.LEAD, T.COPPER, T.IRON, T.COAL].forEach((t, i) => {
      for (let y = gy + 1; y <= gy + 3; y++) w.set(X0 + 50 + i, y, t);
    });
    // 드릴 바로 밑은 광상 — 줄지 않고 계속 나오는 모습을 보인다(기계식 = 철, 전동 = 금 · 등급 3)
    w.set(X0 + 51, gy + 1, T.IRONRICH); w.set(X0 + 55, gy + 1, T.GOLDRICH);

    const put = (dx, key, dir?, fill?) => {
      const m = Factory.place(w, X0 + dx, Y, key, dir || 0);
      if (!m) return null;
      if (MACHINE[key].proj) { m.own = 1; }
      if (fill) for (const id in fill) {
        if (m.items) Factory.insert(w, m, id, fill[id]);
        else if (m.in) Factory.bufAdd(m.in, id, fill[id]);
      }
      return m;
    };
    for (let dx = 0; dx <= LEN; dx += 10) put(dx, 'pole');
    put(-3, 'crate', 0, { coal: 99, fuel_brick: 99, iron_ore: 99, copper_ore: 99, gold_ore: 99, iron_bar: 99,
      copper_bar: 99, gold_bar: 99, steel_plate: 99, polymer: 99, wire: 99, crude_oil: 99, rivet: 99, wheat: 99,
      flour: 99, raw_meat: 20, sand: 99, kelp: 99, crab_shell: 99, sea_salt: 99, battery_empty: 20 });
    // 1. 전력
    put(1, 'gen', 0, { coal: 40 }); put(2, 'gen', 0, { fuel_brick: 20 });
    const b1 = put(3, 'battery'); if (b1) b1.e = 1500;
    const b2 = put(4, 'battery_hi', 0, { battery_empty: 3 }); if (b2) b2.e = 7000;
    put(6, 'windmill'); put(8, 'switch');
    // 2. 제련 줄: 상자(배출) → 벨트 → 자동 용광로 → 벨트·고속 벨트 → 상자
    const c1 = put(11, 'crate', 0, { iron_ore: 99, copper_ore: 60 }); if (c1) c1.feed = 1;
    put(12, 'belt'); put(13, 'belt'); put(14, 'smelter', 0, { coal: 30 });
    put(15, 'belt'); put(16, 'belt_fast'); put(17, 'belt_fast'); put(18, 'crate');
    // 3. 압축 줄: 석탄 → 압축기 → 분류기(압축 연료만) → 상자
    const c2 = put(21, 'crate', 0, { coal: 99 }); if (c2) c2.feed = 1;
    put(22, 'belt'); put(23, 'press'); put(24, 'belt');
    const so = put(25, 'sorter'); if (so) so.f = 'fuel_brick';
    put(26, 'crate');
    // 4. 원유: 유혈암 위 시추 펌프 → 정제기 → 벨트 → 상자
    put(31, 'pump'); put(32, 'refinery', 0, { crude_oil: 20 }); put(33, 'belt'); put(34, 'crate');
    put(36, 'turret', 0, { rivet: 100 }); put(38, 'trap');
    // 5. 조립 줄
    const c3 = put(41, 'crate', 0, { copper_bar: 60 }); if (c3) c3.feed = 1;   // 상자는 한 가지만 흘리니 수지는 조립기에 미리
    put(42, 'belt'); put(43, 'assembler', 0, { polymer: 40, wire: 6, gold_bar: 4 }); put(44, 'belt'); put(45, 'crate');
    // 6. 광맥 위 드릴
    put(51, 'drill', 0, { coal: 30 }); put(52, 'crate');
    put(55, 'drill_e'); put(56, 'crate');
    w.set(X0 + 58, gy + 1, T.GLACIUM); put(58, 'drill_x'); put(59, 'crate');   // 심층 드릴 — 세션 3 빙정석(등급 5)
    // 7. 4단계 설비 · 마을 설비
    put(61, 'pressor', 0, { steel_plate: 12, crab_shell: 16, sea_salt: 8 }); put(62, 'crate');
    put(64, 'desal', 0, { sand: 40, kelp: 30 }); put(65, 'crate');
    put(67, 'mill', 0, { wheat: 30 }); put(68, 'crate');
    put(71, 'oven', 0, { wood: 30, flour: 20, raw_meat: 10 }); put(72, 'crate');
    // 8. 함정(위를 보게 — 줄을 따라 쏘지 않는다)
    put(74, 'dart', 3); put(76, 'flamejet', 3); put(78, 'frostjet', 3);
    put(81, 'battery', 0, { battery_empty: 4 });
    this.buildDebugTowers(w, AX, BX, gy);
    Factory.buildNets(w);

    p.x = (X0 - 5) * TS; p.y = (gy - 3) * TS; p.vx = p.vy = 0;
    this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
    this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    UI.refreshBag(); UI.refreshEquip();
    this.toast(tr('공장 확인 자리 — 오른쪽으로 기계 전 종류, 그 너머에 여러 층 공장 둘. 기계를 우클릭하면 기계 화면이 열린다'), 'good');
  },

  /** ?debug=factory 의 여러 층 공장 둘 — A: 3층 금속 공장(광석 → 주괴 → 강철판·전선), B: 지하 탄광이 제 발전기를 먹이는 순환 발전소 + 방어 갑판.
      층 사이는 위로 가는 벨트 기둥, 사람은 오른쪽(A)·왼쪽(B) 발판 사다리로 오간다. */
  buildDebugTowers(w, AX, BX, gy) {
    const P = (x, y, key, dir?, fill?) => {
      const m = Factory.place(w, x, y, key, dir || 0);
      if (!m) return null;
      if (MACHINE[key].proj) m.own = 1;
      if (fill) for (const id in fill) {
        if (m.items) Factory.insert(w, m, id, fill[id]);
        else if (m.in) Factory.bufAdd(m.in, id, fill[id]);
      }
      return m;
    };
    const shell = (x0, x1, top, holes, ladder, slabs) => {
      for (let x = x0; x <= x1; x++) {
        for (let y = top; y < gy; y++) { w.set(x, y, T.AIR); if (x > x0 && x < x1) w.setWall(x, y, 6); }
        w.set(x, top, T.STEELPLATE);
        for (const sy of slabs) w.set(x, sy, holes.includes(x) ? T.AIR : ladder.includes(x) ? T.PLATFORM : T.STEELPLATE);
      }
      for (const x of [x0, x1]) for (let y = top; y < gy; y++) w.set(x, y, y >= gy - 3 ? T.AIR : T.WALLSTONE);   // 양쪽 문
      for (const x of ladder) for (const sy of slabs) { w.set(x, sy + 2, T.PLATFORM); }
      for (const x of ladder) w.set(x, gy - 3, T.PLATFORM);
      // 층마다 벽 횃불 — 벽지 친 실내라 햇빛이 안 든다
      for (let y = gy - 4; y > top; y -= 5) for (let x = x0 + 3; x < x1; x += 6) if (w.get(x, y) === T.AIR) w.set(x, y, T.TORCH);
    };
    const feed = (m) => { if (m) m.feed = 1; return m; };

    /* ---- A. 3층 금속 공장 ---- */
    const A1 = gy - 1, A2 = gy - 6, A3 = gy - 11;
    shell(AX, AX + 31, gy - 15, [AX + 14, AX + 16], [AX + 28, AX + 29], [gy - 5, gy - 10]);
    // 1층 — 발전 · 철광 줄(왼쪽에서) · 동광 줄(오른쪽에서) → 위로 가는 기둥(AX+14)
    P(AX + 2, A1, 'gen', 0, { coal: 60 }); P(AX + 3, A1, 'gen', 0, { fuel_brick: 30 });
    const ab = P(AX + 4, A1, 'battery_hi'); if (ab) ab.e = 6000;
    P(AX + 6, A1, 'pole'); P(AX + 22, A1, 'pole');
    feed(P(AX + 8, A1, 'crate', 0, { iron_ore: 99 }));
    P(AX + 9, A1, 'belt'); P(AX + 10, A1, 'smelter', 0, { coal: 60 }); P(AX + 11, A1, 'belt'); P(AX + 12, A1, 'belt'); P(AX + 13, A1, 'belt');
    feed(P(AX + 20, A1, 'crate', 2, { copper_ore: 99 }));
    P(AX + 19, A1, 'belt', 2); P(AX + 18, A1, 'smelter', 2, { coal: 60 }); P(AX + 17, A1, 'belt', 2); P(AX + 16, A1, 'belt_fast', 2); P(AX + 15, A1, 'belt', 2);
    for (let y = A1; y > A2; y--) P(AX + 14, y, 'belt', 3);
    // 2층 — 분류기: 동 주괴는 위로, 나머지(철 주괴)는 오른쪽 압축기로 → 강철판 상자
    P(AX + 14, A2, 'belt'); P(AX + 15, A2, 'belt');
    const sA = P(AX + 16, A2, 'sorter', 3); if (sA) sA.f = 'copper_bar';
    P(AX + 17, A2, 'belt'); P(AX + 18, A2, 'press'); P(AX + 19, A2, 'belt'); P(AX + 20, A2, 'belt_fast'); P(AX + 21, A2, 'crate');
    // 전주는 10칸 안이어야 서로 잇는다 — 1층 둘(6·22)은 16칸이라 가운데(13)에 하나 더 세워 한 망으로 묶는다
    P(AX + 8, A2, 'pole'); P(AX + 13, A2, 'pole'); P(AX + 24, A2, 'pole'); P(AX + 26, A2, 'battery', 0, { battery_empty: 5 });
    for (let y = A2 - 1; y > A3; y--) P(AX + 16, y, 'belt', 3);
    // 3층 — 조립기(수지 미리)로 전선 → 상자, 지붕 위 풍차
    P(AX + 16, A3, 'belt'); P(AX + 17, A3, 'belt'); P(AX + 18, A3, 'assembler', 0, { polymer: 60 }); P(AX + 19, A3, 'belt'); P(AX + 20, A3, 'crate');
    P(AX + 10, A3, 'pole'); P(AX + 22, A3, 'pole');
    P(AX + 6, gy - 16, 'windmill');

    /* ---- B. 지하 탄광 순환 발전소 + 방어 갑판 ---- */
    const B0 = gy + 4, B1 = gy - 1, B2 = gy - 7;
    shell(BX, BX + 23, gy - 12, [], [BX + 2, BX + 3], [gy - 6]);
    // 지하층 — 땅(gy)이 천장, 기둥 구멍(BX+9)과 사다리 구멍(BX+2~3)만 뚫는다. 벽과 바닥에 석탄층
    for (let x = BX; x <= BX + 23; x++) {
      for (let y = gy + 1; y <= gy + 9; y++) w.set(x, y, y <= B0 && x > BX && x < BX + 23 ? T.AIR : y === gy + 5 ? T.STEELPLATE : T.STONE);
      w.set(x, gy, x === BX + 9 ? T.AIR : (x === BX + 2 || x === BX + 3) ? T.PLATFORM : T.STEELPLATE);
      for (let y = gy + 1; y <= B0; y++) if (x > BX && x < BX + 23) w.setWall(x, y, 6);
    }
    for (let x = BX + 1; x <= BX + 16; x++) for (let y = gy + 6; y <= gy + 8; y++) w.set(x, y, T.COAL);
    w.set(BX + 4, gy + 6, T.COALRICH);                 // 드릴 바로 밑은 광상 — 공장 B 가 연료를 끝없이 댄다
    for (const x of [BX + 2, BX + 3]) w.set(x, gy + 2, T.PLATFORM);
    for (let x = BX + 5; x < BX + 23; x += 6) w.set(x, gy + 1, T.TORCH);
    P(BX + 4, B0, 'drill_e'); for (let x = BX + 5; x <= BX + 8; x++) P(x, B0, 'belt');
    for (let y = B0; y > B1; y--) P(BX + 9, y, 'belt', 3);
    P(BX + 6, gy + 1, 'pole');
    // 1층 — 석탄 → 압축기 → 압축 연료가 벨트로 발전기에 들어간다(발전기가 드릴·압축기를 돌린다)
    P(BX + 9, B1, 'belt'); P(BX + 10, B1, 'press'); P(BX + 11, B1, 'belt'); P(BX + 12, B1, 'belt'); P(BX + 13, B1, 'belt_fast');
    P(BX + 14, B1, 'gen', 0, { fuel_brick: 4 });
    const bb = P(BX + 16, B1, 'battery_hi'); if (bb) bb.e = 2000;
    P(BX + 6, B1, 'pole'); P(BX + 18, B1, 'pole');
    // 방어 갑판 — 대갈못 상자 둘이 포탑 둘을 먹이고, 가운데 전격 함정
    feed(P(BX + 6, B2, 'crate', 0, { rivet: 200 })); P(BX + 7, B2, 'belt'); P(BX + 8, B2, 'belt'); P(BX + 9, B2, 'turret');
    feed(P(BX + 18, B2, 'crate', 2, { rivet: 200 })); P(BX + 17, B2, 'belt', 2); P(BX + 16, B2, 'turret');
    P(BX + 12, B2, 'trap'); P(BX + 12, gy - 9, 'pole');
    P(BX + 12, gy - 13, 'windmill');
  },

  /** 공창 단말 — 로어를 읽고 설계도 조각을 얻는다 (단말마다 1회) */
  readTerminal(o) {
    const t = TERMINALS[o.term];
    this.termsRead = this.termsRead || {};
    const first = !this.termsRead[o.term];
    const choices = [];
    const give = t.it || 'blueprint_frag';
    if (first) choices.push({
      t: tr('({item|을} 뽑아낸다)', { item: ITEMS[give].n }), quest: 1, fn: () => {
        this.termsRead[o.term] = true;
        const it = makeItem(give, t.it ? 8 : 1);
        if (!this.player.addItem(it)) this.drops.push(new Drop(this.player.cx, this.player.cy, it));
        this.toast(tr('{item} 획득', { item: ITEMS[give].n }), 'good');
        UI.closeDialogue(); UI.refreshBag(); this.checkChapter();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('talk');
  },
};
mixin(G, FishingPart);
