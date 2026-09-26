/* ===== game/altar.js — 제단·보스 · 소비·제작 · 판매 · 펫 · 훈련소 · 마을 개선 · 광역 피해 · 특성 연출 ===== */
import { dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { ITEMS, STATION_NAME, STATION_UP } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { MODE_OF, VILLAGE } from '../data/start.js';
import { ENEMIES } from '../data/enemies.js';
import { STORY_BOSSES } from '../data/skills.js';
import { FARM_KIT } from '../data/ruins.js';
import { EGG_POOL, PETS } from '../data/pets.js';
import { CHAPTERS, sessionOf } from '../data/story.js';
import { SIG_FX, idef } from '../data/values.js';
import { TS } from '../world.js';
import { Drop, Enemy, Part, Pet, VAULT_SIZE, isGear, itemName, makeItem, rollGear } from '../entity.js';
import { UI } from '../ui.js';
import { Music } from '../music.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const AltarPart: Bag = {

  /* ================= 제단 / 보스 ================= */
  /** 이 장의 결전 보스인데 아직 자격이 없으면 막는다 — 소환 아이템만으로 깨울 수 있으면 장 목표를 통째로 건너뛴다. */
  bossGated(bossId) {
    const ch = CHAPTERS[this.chapter];
    if (!ch || !ch.goal || ch.goal.type !== 'boss' || ch.goal.target !== bossId) return false;
    const st = this.chapterState(ch);
    if (st.ready) return false;
    this.toast(this.goalLocked(ch, st), 'bad');
    return true;
  },
  altar(o) {
    const p = this.player;
    const need = Object.keys(ITEMS).find(k => ITEMS[k].boss === o.boss);
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    if (this.bossGated(o.boss)) return;
    // 소환 아이템이 아예 없는 보스라면 제단이 아니라 둥지로 다뤄야 한다 — 사연: docs/code-history.md#h47
    if (!need) { this.wakeLair({ boss: o.boss, ruin: 12, nm: tr('제단'), x: o.x, y: o.y, w: o.w, h: o.h }); return; }
    if (p.countItem(need) <= 0) { this.toast(tr('{item|이} 필요하다', { item: ITEMS[need].n }), 'bad'); return; }
    p.removeItem(need, 1);
    this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 60);
    UI.refreshBag();
  },
  useSummon(slot) {
    const p = this.player, it = p.bag[slot];
    const bossId = idef(it).boss;
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    if (this.bossGated(bossId)) return;
    const zone = this.world.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    const req = {
      king_slime: ['surface', 'cave'], bone_lord: ['cave', 'deep'], corrupt_heart: ['corrupt'],
      frost_witch: ['ice'], void_king: ['hell'], storm_warden: ['sky'], first_keeper: ['ruin'],
      pursuer: ['surface'],  // 하늘이 트인 지상에서만 — 숨는 대신 위치를 알려주는 의식이다
      overseer: ['works']
    }[bossId];
    if (req && !req.includes(zone)) { this.toast(tr('여기서는 반응하지 않는다'), 'bad'); return; }
    p.removeItem(it.id, 1);
    this.spawnBoss(bossId, p.cx + 160 * (p.facing || 1), p.cy - 90);
    UI.refreshBag();
  },
  spawnBoss(id, x, y) {
    /* 스토리 보스는 수치를 고정한다. */
    const e = new Enemy(id, x, y, STORY_BOSSES[id] ? 1 : this.scale() * 0.9);
    this.ents.push(e); this.boss = e;
    this.toast(tr('{enemy|이} 깨어났다!', { enemy: ENEMIES[id].n }), 'bad');
    this.shake = 16;
    // 등장 효과음을 따로 두지 않고 보스 브금이 바로 치고 들어오게 한다
    if (Music) Music.play('boss', true);
  },
  onBossDown(id) {
    this.boss = null;
    this.pulseBossDown();          // 유적 주인 · 메아리 — 맥박을 가라앉히고 보상을 준다
    // 둥지에서 깨운 것이라면 그 둥지를 비운 것으로 남긴다
    if (this.pendingLair !== undefined && this.pendingLair !== null) {
      this.lairs = this.lairs || {};
      this.lairs[this.pendingLair] = 1;
      this.pendingLair = null;
    }
    this.toast(tr('{enemy} 토벌!', { enemy: ENEMIES[id].n }), 'good');
    UI.bossBar(null);
  },
  /* 몹의 세기는 **스토리 진행(장)만** 따라간다. */
  scale() { return 1 + this.chapter * 0.09; },
  /** 난이도가 몹의 체력·공격력에만 곱하는 값. */
  modeMul() { return MODE_OF(this.mode).mul; },

  /* ================= 소비 / 제작 ================= */
  useConsumable(slot) {
    const p = this.player, it = p.bag[slot], d = idef(it);
    if (d.use.egg) { this.hatchEgg(d.use.egg); it.c--; if (it.c <= 0) p.bag[slot] = null; UI.refreshBag(); this.sfx('hatch'); return; }
    /* 펫 사탕 — 낀 펫이 없으면 그냥 사라지므로, 쓰기 전에 막아 준다 */
    if (d.use.petXp) {
      if (!p.equip.pet1 && !p.equip.pet2) { this.toast(tr('펫을 끼고 있어야 준다'), 'bad'); return; }
      p.addPetXp(d.use.petXp);
      it.c--; if (it.c <= 0) p.bag[slot] = null;
      UI.refreshBag(); this.sfx('drink'); return;
    }
    // instant(치유·마나 물약)는 공유 재사용 대기시간을 아예 안 걸고 안 본다 — 음식·물고기 등 나머지 회복 소비품끼리는 여전히 potionCd를 공유한다
    /* 맥박을 움직이는 것(고요의 물약 · 맥박 북) — 유적 밖에서는 쓰지 않고 그대로 둔다 */
    if (d.use.pulse) {
      if (!this.pulseHere) { this.toast(tr('유적 안에서만 듣는다'), 'bad'); return; }
      this.addPulse(this.pulseHere, d.use.pulse, true);
      this.toast(d.use.pulse < 0 ? tr('유적의 맥박이 가라앉는다') : tr('유적이 북소리에 뒤척인다'), d.use.pulse < 0 ? 'good' : 'bad');
      it.c--; if (it.c <= 0) p.bag[slot] = null;
      UI.refreshBag(); this.sfx(d.use.pulse < 0 ? 'drink' : 'chapter');
      return;
    }
    if (!d.instant && p.potionCd > 0 && d.use.hp) { this.toast(tr('아직 회복할 수 없다'), 'bad'); return; }
    if (d.use.hp) { p.heal(d.use.hp); if (!d.instant) p.potionCd = d.cd || 10; }
    if (d.use.mp) p.mp = Math.min(p.d.maxMp, p.mp + d.use.mp);
    if (d.use.buff) {
      // 음식(fed_)은 한 가지만 유지된다 — 겹쳐 먹을 수 있으면 요리를 고를 이유가 없어진다
      if (d.use.buff.startsWith('fed_')) p.buffs = p.buffs.filter(b => !b.id.startsWith('fed_'));
      p.addBuff(d.use.buff);
    }
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    UI.refreshBag(); this.sfx('drink');
  },

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

  /* ================= 펫 ================= */
  hatchEgg(tier) {
    const p = this.player;
    const id = this.rng.weighted(EGG_POOL[tier]);
    const it = makeItem('pet_' + id, 1);
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    this.toast(tr('{pet|을} 얻었다! (장비창의 펫 칸에 끼울 수 있다)', { pet: PETS[id].n }), 'good');
    UI.refreshBag(); UI.refreshChest();
  },
  /** 장비창의 펫 슬롯을 실제로 따라다니는 펫 인스턴스와 맞춘다. */
  syncPets() {
    const p = this.player;
    if (!this.petEnts) this.petEnts = [];
    ['pet1', 'pet2'].forEach((key, slot) => {
      const it = p.equip[key];
      const id = it && idef(it).pet;
      const cur = this.petEnts[slot];
      if (!id) { this.petEnts[slot] = null; return; }
      if (cur && cur.id === id) return;
      const np = new Pet(id, slot);
      const [ax, ay] = np.anchor(p);
      np.x = ax; np.y = ay;
      this.petEnts[slot] = np;
    });
  },

  /* ================= 훈련소 ================= */
  /* 세션이 넘어가면 금화가 도는 규모 자체가 달라진다(세션 2에서 상자·판매 수입이 크게 뛴다). */
  // @ts-expect-error sessionOf 는 세션 객체를 준다 — 배율이 늘 1(계획서 §9-1 #16, v1.1.1 뒤에 고친다)
  costMul() { return [1, 1, 3.2, 7][sessionOf(this.chapter)] || 1; },
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
  /* ================= 마을 개선 ================= */
  villageLv() {
    const d = this.world && this.world.dawnCity;
    return (d && d.restored) ? (d.lv || 1) : 0;
  },
  /** 지금 여명 마을 안에 있는가 (마을 회관·경비병 판정용) */
  inDawn(margin) {
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
    if (!p.hasAll(spec.need)) { this.toast(tr('재료가 부족하다'), 'bad'); return; }
    for (const k in spec.need) p.removeItem(k, spec.need[k]);
    this.world.upgradeVillage(lv + 1);
    while (this.vault.length < this.vaultCap()) this.vault.push(null);
    // 밭을 내주는 단계 — 연장과 씨앗을 바로 쥐여 준다(밭 한가운데 상자는 뜬금없어 보였다). 가방이 차면 발밑에
    if (lv + 1 === 2) {
      for (const [id, n] of FARM_KIT) { const it = makeItem(id, n); if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); }
      this.toast(tr('마을 서쪽에 밭을 내주었다 — 괭이·낫·씨앗을 받았다'), 'good');
    }
    this.toast(tr('마을이 『{spec}』{spec|-이} 되었다', { spec: spec.n }), 'good');
    for (let i = 0; i < 40; i++) this.parts.push(new Part(p.cx + (Math.random() - .5) * 200, p.cy, '#ffe08a', -70, 1.2));
    UI.chapterCard({ sub: tr('마을 개선'), title: spec.n, line: spec.d });
    UI.refreshBag(); this.sfx('chapter');
  },
  /* 마을 단계가 주는 혜택 — 여러 곳에서 쓰이므로 한군데 모아 둔다 */
  vaultCap() { const lv = this.villageLv(); return VAULT_SIZE + (lv >= 2 ? 12 : 0) + (lv >= 4 ? 12 : 0); },
  villageTrade() { return this.villageLv() >= 3 ? 1.1 : 1; },

  /** 이 제작법을 지금 쓸 수 있는가 — 시설 종류와 그 개체의 개조 단계를 함께 본다 */
  craftOk(r) {
    if (!r.station) return true;
    const o = this.nearStObj[r.station];
    return !!o && (o.lv || 1) >= (r.lv || 1);
  },
  /** 시설 개조. */
  upgradeStation(kind) {
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
  craft(i) {
    const r = RECIPES[i], p = this.player;
    const st = r.station ? this.nearStObj[r.station] : null;
    if (r.station && !st) {
      this.toast(tr('{stationName} 앞에서만 만들 수 있다', { stationName: STATION_NAME[r.station][1] }), 'bad'); return;
    }
    if (r.station && (st.lv || 1) < (r.lv || 1)) {
      const nm = STATION_NAME[r.station][r.lv];
      this.toast(tr('{nm|으로} 개조해야 만들 수 있다', { nm }), 'bad'); return;
    }
    if (!p.hasAll(r.need)) { this.toast(tr('재료가 부족하다'), 'bad'); return; }
    for (const k in r.need) p.removeItem(k, r.need[k]);
    const out = isGear(makeItem(r.out)) ? rollGear(r.out, this.rng, 1) : makeItem(r.out, r.n);
    if (out.c !== undefined && !isGear(out)) out.c = r.n;
    if (!p.addItem(out)) { this.drops.push(new Drop(p.cx, p.cy, out)); }
    this.crafted = this.crafted || {};
    this.crafted[r.out] = (this.crafted[r.out] || 0) + 1;
    this.checkAch();
    this.toast(tr('{item} 제작 완료', { item: ITEMS[r.out].n }), 'good');
    UI.refreshCraft(); UI.refreshBag(); this.sfx('craft');
  },

  /* ================= 광역 피해 ================= */
  /** 폭발/타격 이펙트 등록 (kind: hit / fire / void / stargain / starmerge) slow: 재생을 늘리는 배수(기본 1 = 여섯 프레임 0.24초). */
  burst(x, y, kind, size, slow) {
    if (!this.spritesOn) return;
    (this.bursts = this.bursts || []).push({ x, y, kind, s: size || 64, t: 0, sp: slow || 1 });
  },

  aoe(x, y, r, dmg, kb, color, effect) {
    for (const e of this.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      if (dist(x, y, e.cx, e.cy) > r + e.w / 2) continue;
      const crit = this.player.rollCrit();
      e.hurt(dmg * (crit ? 1 + this.player.d.critD / 100 : 1), crit, this.player, kb);
      if (effect === 'frost') e.slow(0.5, 3);
    }
    this.rings = this.rings || [];
    this.rings.push({ x, y, r, t: 0.3, c: color });
  },

  /* ================= 특성 연출 ================= */
  /** 보스가 페이즈를 넘기며 던지는 한 줄. */
  bossLine(who, text) {
    this.bossSay = { who, text, t: 3.2 };
  },

  /** 퍼져 나가는 고리. */
  /** 세계를 s초만큼 멈춘다(겹치면 긴 쪽). */
  hitStop(s) { this.stopT = Math.min(0.12, Math.max(this.stopT || 0, s || 0)); },

  /* ★ 입력을 삼키면 안 된다. */
  skillDeny(slot, msg) {
    this.sfx('sk_deny');
    const el = document.querySelectorAll('#skillbar .sk')[slot];
    if (el) { el.classList.remove('deny'); void (el as HTMLElement).offsetWidth; el.classList.add('deny'); }
    if (msg) this.toast(msg, 'bad');
  },

  ringFx(x, y, r, c, life) {
    this.rings = this.rings || [];
    this.rings.push({ x, y, r, t: life || 0.3, max: life || 0.3, c });
  },
  /** 두 점을 잇는 번개. */
  boltFx(x0, y0, x1, y1, c) {
    this.bolts = this.bolts || [];
    const seg = 7, pts = [];
    for (let i = 0; i <= seg; i++) {
      const k = i / seg, j = i === 0 || i === seg ? 0 : (Math.random() - 0.5) * 26;
      const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * k + nx / L * j, y0 + (y1 - y0) * k + ny / L * j]);
    }
    this.bolts.push({ pts, t: 0.22, max: 0.22, c });
  },
  /** 떨어질 자리 예고 — 차오르는 원. */
  warnFx(x, y, r, dur, c) {
    this.warns = this.warns || [];
    this.warns.push({ x, y, r, t: dur, max: dur, c });
  },

  /* ---- 특별한 스킬의 고유 연출 (SIG_FX) ---- */
  sigFx(o) { (this.sigs = this.sigs || []).push(o); },
  /** 유성 화살비가 떨어질 띠. */
  bandFx(x, y, hw, dur, c) { this.sigFx({ k: 'band', x, y, hw, t: dur, max: dur, c }); },
  /** 소환 문양 — 안으로 조여드는 고리. */
  sigilFx(x, y, r, c) { this.sigFx({ k: 'sigil', x, y, r, t: SIG_FX.wolf.t, max: SIG_FX.wolf.t, c }); },
  /** 하늘에서 떨어지는 별. */
  fallFx(x, y, dur, c) { this.sigFx({ k: 'fall', x, y, t: dur, max: dur, c }); },
  /** 착탄 섬광. */
  flashFx(x, y, r, c) { this.sigFx({ k: 'flash', x, y, r, t: SIG_FX.flash.t, max: SIG_FX.flash.t, c }); },
  /** 화면 테두리가 한 번 물든다. */
  edgeFx(rgb, dur) { this.edge = { rgb, t: dur, max: dur }; },

  /** '화면 효과' 설정(0~150%)을 1을 넘지 않게 돌려준다 — 0%면 화면을 덮는 연출이 없다 */
  fxScale() { return Math.min(1, (this.settings ? this.settings.shake : 100) / 100); },
};
mixin(G, AltarPart);
