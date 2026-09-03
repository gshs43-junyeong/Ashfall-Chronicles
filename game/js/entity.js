/* ===== entity.js — 아이템 인스턴스 / 플레이어 / 적 / 투사체 ===== */
'use strict';

const GRAV = 2000, MAX_FALL = 1250;
const SAFE_FALL_TILES = 10;                                  // 이만큼까지는 낙하 데미지 없음
const SAFE_FALL_VY = Math.sqrt(2 * GRAV * SAFE_FALL_TILES * TS);   // v² = 2·g·d 로 역산한 안전 낙하 속도
const BASE_BAG_SIZE = 40, MAX_BAG_SIZE = 56, HOTBAR = 10;
const VAULT_SIZE = 60;   // 여명 마을 보관고 (가방과 별개로 유지되는 공용 창고)

/* ================= 아이템 인스턴스 ================= */
function makeItem(id, count = 1, rarity = 0, affixes = null) {
  const def = ITEMS[id];
  if (!def) { console.warn('unknown item', id); return null; }
  const it = { id, c: count, r: rarity | 0 };
  if (affixes && affixes.length) it.a = affixes;
  return it;
}
function idef(it) { return ITEMS[it.id]; }
function maxStack(it) { return idef(it).stack || 1; }
function isGear(it) { const t = idef(it).type; return t === 'weapon' || t === 'armor' || t === 'acc' || t === 'tool' || t === 'bag' || t === 'pet'; }
/* 장비 최소 착용 레벨. 이름(재질 접미사)으로 추정하지 않고 아이템마다 lvReq를 직접 갖는다.
   없으면 무기는 tier*4, 그 외(장신구 등)는 1. */
function equipReqLv(id) {
  const d = ITEMS[id];
  if (!d) return 1;
  if (d.lvReq !== undefined) return d.lvReq;
  // 무기는 등급 표에서 뽑는다(WEAPON_TIER_LV 주석 참고). lvReq를 직접 적어 둔 무기만
  // 위에서 걸러져 그 값을 쓴다 — 등급으로 설명이 안 되는 몇 개(설계실 산물 등)를 위한 것.
  if (d.type === 'weapon' && d.tier !== undefined) return WEAPON_TIER_LV[d.tier] || 1;
  if (d.tier !== undefined) return d.tier * 4;
  return 1;
}

/** 접사 + 희귀도가 반영된 종합 스탯 */
function itemStats(it) {
  const d = idef(it), s = Object.assign({}, d.b || {});
  const add = (o) => { for (const k in o) s[k] = (s[k] || 0) + o[k]; };
  if (d.lifesteal) add({ lifesteal: d.lifesteal });
  if (d.fire) add({ fire: d.fire });
  if (d.frost) add({ frost: d.frost });
  if (d.poison) add({ poison: d.poison });
  if (it.a) for (const a of it.a) add(a.s);
  // 희귀도는 방어구/장신구 부가 스탯도 함께 올린다
  const m = RARITY_MULT[it.r];
  if (m !== 1) for (const k in s) if (k !== 'jump' && k !== 'fire' && k !== 'frost') s[k] = Math.round(s[k] * m * 10) / 10;
  if (s.allStat) { s.str = (s.str || 0) + s.allStat; s.dex = (s.dex || 0) + s.allStat; s.int = (s.int || 0) + s.allStat; s.vit = (s.vit || 0) + s.allStat; delete s.allStat; }
  return s;
}
function itemName(it) {
  const d = idef(it);
  let n = d.n;
  if (it.a) {
    const pre = it.a.filter(a => a.k === 'p'), suf = it.a.filter(a => a.k === 's');
    if (pre.length) n = pre[0].n + ' ' + n;
    if (suf.length) n = n + suf[0].n;
  }
  return n;
}
function itemDamage(it) {
  const d = idef(it);
  if (!d.dmg) return 0;
  const s = itemStats(it);
  return d.dmg * RARITY_MULT[it.r] * (1 + (s.dmgP || 0));
}
function itemSpeed(it) {
  const d = idef(it), s = itemStats(it);
  return (d.spd || 2) * (1 + (s.spdP || 0));
}

/** 전리품 굴리기: 등급/접사 랜덤 */
function rollGear(id, rng, luckTier = 0) {
  const d = ITEMS[id];
  if (!d) return null;
  let r = rng.weighted([[0, 46], [1, 27], [2, 15], [3, 8], [4, 3.2], [5, 0.8 + luckTier * 0.4]]);
  const it = makeItem(id, 1, r);
  if (isGear(it) && r > 0) {
    const a = [];
    if (rng.chance(0.35 + r * 0.12)) { const p = rng.pick(PREFIX); a.push({ k: 'p', n: p.n, s: p.s }); }
    if (rng.chance(0.22 + r * 0.12)) { const s = rng.pick(SUFFIX); a.push({ k: 's', n: s.n, s: s.s }); }
    if (a.length) it.a = a;
  }
  return it;
}

const CHEST_LOOT = [
  null,
  { gear: ['sword_wood', 'bow_hunt', 'staff_branch', 'helm_cloth', 'chest_cloth', 'boots_cloth', 'ring_vigor'], mats: [['copper_ore', 4, 10], ['wood', 5, 12], ['torch', 5, 12], ['potion_hp', 1, 2]] },
  { gear: ['sword_copper', 'bow_copper', 'helm_copper', 'chest_copper', 'boots_copper', 'ring_focus', 'amul_swift'], mats: [['iron_ore', 4, 10], ['copper_bar', 2, 5], ['potion_hp', 2, 4], ['potion_mp', 1, 3]] },
  { gear: ['sword_iron', 'bow_iron', 'staff_flame', 'helm_iron', 'chest_iron', 'boots_iron', 'pick_iron', 'amul_ember'], mats: [['iron_bar', 3, 7], ['gold_ore', 3, 8], ['crystal', 2, 6], ['potion_hp', 3, 5]] },
  { gear: ['sword_mythril', 'staff_frost', 'bow_storm', 'helm_mythril', 'boots_mythril', 'pick_mythril', 'charm_cloud', 'charm_leech'], mats: [['mythril_ore', 4, 9], ['soul_shard', 3, 8], ['crystal', 4, 10], ['potion_hp', 4, 7]] },
  { gear: ['staff_soul', 'chest_mythril', 'helm_soul', 'boots_soul', 'pick_soul', 'charm_leech'], mats: [['hell_ore', 5, 12], ['soul_shard', 6, 14], ['void_frag', 1, 3], ['potion_hp', 6, 10]] }
];
function rollChest(tier, rng, source) {
  // 유적 상자는 탐험 보상은 남기되, 제작·채굴 진행을 건너뛰지 않도록 별도 테이블을 쓴다.
  // 이전 세이브의 높은 등급 상자에도 적용되도록 여기서 4티어로 한 번 더 상한을 둔다.
  const ruin = source === 'ruin';
  const lootTier = ruin ? Math.min(tier, 4) : tier;
  const gold = !ruin && tier >= 6;   // 큰 동굴의 황금 상자만 기존의 고보상을 유지한다
  const spec = CHEST_LOOT[clamp(lootTier, 1, 5)];
  const out = [];
  const nGear = ruin ? 1 : gold ? rng.int(2, 3) : rng.int(1, 2);
  for (let i = 0; i < nGear; i++) out.push(rollGear(rng.pick(spec.gear), rng, ruin ? 0 : gold ? 9 : tier));
  for (const [id, a, b] of spec.mats) {
    if (!(gold || rng.chance(ruin ? 0.48 : 0.72))) continue;
    const count = rng.int(a, b);
    out.push(makeItem(id, ruin ? Math.max(1, Math.floor(count * 0.6)) : count));
  }
  out.push(makeItem('gold_ore', ruin ? rng.int(1, 2) : rng.int(gold ? 10 : 1, gold ? 18 : 4)));
  return out.filter(Boolean);
}

/* ================= 기본 엔티티 ================= */
class Ent {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.vx = 0; this.vy = 0; this.dead = false; this.onGround = false; }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /** 타일 충돌을 포함한 이동 */
  move(dt, world, opts = {}) {
    const prevBottom = this.y + this.h;
    // 물 — 잠긴 비율만큼 중력과 낙하 상한이 줄고, 좌우로도 끈적해진다.
    // 물고기처럼 물이 제 집인 것(opts.aquatic)은 저항을 받지 않는다.
    const liq = opts.aquatic ? { f: 0, flow: 0 } : world.liquidIn(this.x, this.y, this.w, this.h);
    this.submerged = liq.f;
    // X
    let nx = this.x + this.vx * dt;
    if (world.hitSolid(nx, this.y, this.w, this.h)) {
      // 한 칸 계단 오르기
      let stepped = false;
      if (this.onGround && !opts.noStep && !world.hitSolid(nx, this.y - TS * 0.75, this.w, this.h)) {
        this.y -= TS * 0.75; nx = this.x + this.vx * dt; stepped = true;
      }
      if (!stepped || world.hitSolid(nx, this.y, this.w, this.h)) {
        const dir = Math.sign(this.vx);
        while (!world.hitSolid(this.x + dir, this.y, this.w, this.h) && Math.abs(this.x - nx) > 1) this.x += dir;
        this.vx = 0; nx = this.x; this.hitWall = true;
      }
    } else this.hitWall = false;
    this.x = nx;

    // Y
    let gm = opts.gravMul === undefined ? 1 : opts.gravMul;
    let cap = MAX_FALL;
    if (liq.f > 0) {
      gm *= 1 - 0.72 * liq.f;                       // 부력
      cap = MAX_FALL * (1 - 0.76 * liq.f);          // 물속에서는 아무리 떨어져도 느리다
      const drag = Math.min(0.85, 2.4 * liq.f * dt);
      this.vx -= this.vx * drag;
      if (this.vy > 0) this.vy -= this.vy * drag;
      if (liq.flow) this.vy += 620 * liq.f * dt;    // 폭포는 아래로 밀어낸다
    }
    this.vy = clamp(this.vy + GRAV * gm * dt, -2000, cap);
    let ny = this.y + this.vy * dt;
    this.onGround = false;
    if (world.hitSolid(this.x, ny, this.w, this.h)) {
      const dir = Math.sign(this.vy);
      while (!world.hitSolid(this.x, this.y + dir, this.w, this.h) && Math.abs(this.y - ny) > 1) this.y += dir;
      if (this.vy > 0) this.onGround = true;
      this.vy = 0; ny = this.y;
    } else if (this.vy >= 0 && !opts.dropThrough) {
      const top = world.hitPlatform(this.x, ny, this.w, this.h, prevBottom);
      if (top >= 0) { ny = top - this.h; this.vy = 0; this.onGround = true; }
    }
    this.y = ny;
    this.x = clamp(this.x, TS, WW * TS - TS - this.w);
    if (this.y > WH * TS) { this.y = WH * TS; this.vy = 0; }
  }
}

/* ================= 플레이어 ================= */
class Player extends Ent {
  constructor(x, y) {
    super(x, y, 20, 40);
    this.name = '';
    this.level = 1; this.xp = 0; this.xpNext = 40;
    this.statPts = 0; this.skillPts = 1;
    this.base = { str: 5, dex: 5, int: 5, vit: 5 };
    this.hp = 100; this.mp = 50;
    this.gold = 0;
    this.bag = new Array(BASE_BAG_SIZE).fill(null);
    this.equip = { weapon: null, helm: null, chest: null, boots: null, acc1: null, acc2: null, bag: null, pet1: null, pet2: null };
    this.sel = 0;
    this.skills = {};              // id -> rank
    this.slots = [null, null, null, null];
    this.cd = {};                  // 스킬 쿨다운
    this.buffs = [];
    this.facing = 1;
    this.atkTimer = 0; this.swing = 0; this.swingDir = 1; this.swingHit = null;
    this.dashCd = 0; this.iframe = 0; this.dashV = 0;
    this.jumpsLeft = 0; this.jumpHeld = false;
    this.mineTx = -1; this.mineTy = -1; this.mineProg = 0;
    this.hurtCd = 0; this.flash = 0;
    this.channel = null;
    this.potionCd = 0;
    this.charge = 200;             // 동력 장비용 전하. 바닥나면 가방의 배터리를 자동으로 쓴다
    this.kills = {}; this.mined = {}; this.bossKilled = {}; this.gathered = {};
    this.deepest = 0;
    /* 펫은 v1.0.2부터 장비 아이템(equip.pet1/pet2)이다. pets/activePet은 그전 세이브를
       읽어 들일 때만 잠깐 쓰이고(로드 시 아이템으로 바꿔 준다) 이후로는 비어 있다. */
    this.d = {};
    this.recalc();
    this.hp = this.d.maxHp; this.mp = this.d.maxMp;
  }

  /* ---- 파생 스탯 ---- */
  recalc() {
    const s = { str: this.base.str, dex: this.base.dex, int: this.base.int, vit: this.base.vit };
    const acc = { def: 0, hp: 0, mp: 0, ms: 0, crit: 5, critD: 50, cdr: 0, lifesteal: 0, jump: 0, mpreg: 0, hpreg: 0, dmgP: 0, spdP: 0, magicP: 0, fire: 0, frost: 0, poison: 0, dashCd: 0, dashI: 0, charge: 0 };
    const merge = (o) => { for (const k in o) { if (k in s) s[k] += o[k]; else acc[k] = (acc[k] || 0) + o[k]; } };
    for (const k in this.equip) { const it = this.equip[k]; if (!it) continue; const st = itemStats(it); merge(st); acc.def += (idef(it).def || 0) * RARITY_MULT[it.r]; }
    // 특성 패시브
    for (const id in this.skills) {
      const sk = SKILLS[id], r = this.skills[id];
      if (sk && sk.type === 'passive' && sk.b) merge(sk.b(r));
    }
    // 버프
    for (const b of this.buffs) { const bd = BUFFS[b.id]; if (bd && bd.b) merge(bd.b); }
    // 펫 패시브는 따로 더하지 않는다 — 펫이 장비 아이템이라 위 equip 순회에서 이미 들어온다

    acc.def = Math.round(acc.def + s.vit * 0.8);
    const maxHp = Math.round(100 + (this.level - 1) * 12 + s.vit * 6 + acc.hp);
    /* 체력 재생 — 예전엔 레벨과 무관하게 고정 0.5/초였다. 최대 체력은 레벨·체력 스탯을
       따라 수십 배로 불어나는데 재생은 그대로라, 후반에는 최대 체력의 10%를 채우는 데도
       몇 분씩 걸렸다(레벨 234·체력 올인 기준 약 1424초). 최대 체력에 비례하는 몫을
       기본으로 깔아서 "체력 전체를 채우는 데 걸리는 시간"이 레벨과 무관하게 비슷하게
       유지되도록 했다(0.4%/초 ≈ 다 채우는 데 약 4분, 예전 1레벨 체감과 거의 같다). */
    const hpreg = maxHp * 0.004 + (acc.hpreg || 0);
    this.d = {
      str: s.str, dex: s.dex, int: s.int, vit: s.vit,
      maxHp,
      maxMp: Math.round(50 + (this.level - 1) * 5 + s.int * 4 + acc.mp),
      def: acc.def, crit: acc.crit + s.dex * 0.25, critD: acc.critD,
      ms: 190 * (1 + acc.ms / 100), cdr: Math.min(55, acc.cdr), lifesteal: acc.lifesteal,
      jumps: 1 + (acc.jump || 0), mpreg: 2.2 * (1 + acc.mpreg / 100), hpreg,
      dmgP: acc.dmgP, spdP: acc.spdP, magicP: acc.magicP, fire: acc.fire, frost: acc.frost, poison: acc.poison,
      dashCd: Math.max(0.5, 1.6 - acc.dashCd), dashI: 260 + acc.dashI,
      glide: acc.glide || 0,
      jet: acc.jet || 0,
      maxCharge: 200 + (acc.charge || 0)
    };
    if (this.skills.s_titan && this.hp < this.d.maxHp * 0.5) { this.d.dmgP += 0.35; this.d.def += 15; }
    this.hp = Math.min(this.hp, this.d.maxHp); this.mp = Math.min(this.mp, this.d.maxMp);
    this.charge = Math.min(this.charge, this.d.maxCharge);
    this.syncBagCapacity();
  }

  weapon() { return this.equip.weapon; }
  held() { return this.bag[this.sel]; }

  /* ---- 동력 장비의 전하 ----
     전하가 모자라면 가방의 충전된 배터리를 한 개 자동으로 갈아 끼우고, 다 쓴 껍데기는
     방전된 배터리로 돌려준다. 그 껍데기를 축전지에 넣으면 다시 채워지는 순환이 된다. */
  useCharge(n) {
    if (this.charge >= n) { this.charge -= n; return true; }
    if (!this.removeItem('battery_cell', 1)) return false;
    this.charge = this.d.maxCharge;
    if (!this.addItem(makeItem('battery_empty', 1))) G.drops.push(new Drop(this.cx, this.cy, makeItem('battery_empty', 1)));
    G.toast('배터리를 갈아 끼웠다');
    UI.refreshBag();
    this.charge -= n;
    return true;
  }

  /* ---- 가방 용량 (가방 장신구로 확장) ---- */
  bagCapacity() {
    const b = this.equip.bag;
    return BASE_BAG_SIZE + (b ? (idef(b).slots || 0) : 0);
  }
  syncBagCapacity() {
    const cap = this.bagCapacity();
    while (this.bag.length < cap) this.bag.push(null);
    // 축소는 빈 꼬리칸만 — 아이템이 든 칸은 가방을 벗어도 남겨 둔다(분실 방지)
    while (this.bag.length > cap && !this.bag[this.bag.length - 1]) this.bag.pop();
  }

  /* ---- 인벤토리 ---- */
  addItem(it) {
    if (!it) return true;
    this.gathered[it.id] = (this.gathered[it.id] || 0) + it.c;
    const ms = maxStack(it);
    if (ms > 1) {
      for (let i = 0; i < this.bag.length; i++) {
        const s = this.bag[i];
        if (s && s.id === it.id && !s.a && !it.a && s.r === it.r && s.c < ms) {
          const move = Math.min(ms - s.c, it.c); s.c += move; it.c -= move;
          if (it.c <= 0) return true;
        }
      }
    }
    for (let i = 0; i < this.bag.length; i++) if (!this.bag[i]) { this.bag[i] = it; return true; }
    return false;
  }
  countItem(id) { let n = 0; for (const s of this.bag) if (s && s.id === id) n += s.c; return n; }
  removeItem(id, n) {
    for (let i = 0; i < this.bag.length && n > 0; i++) {
      const s = this.bag[i];
      if (s && s.id === id) { const take = Math.min(s.c, n); s.c -= take; n -= take; if (s.c <= 0) this.bag[i] = null; }
    }
    return n <= 0;
  }
  hasAll(need) { for (const k in need) if (this.countItem(k) < need[k]) return false; return true; }

  equipFrom(slotIdx) {
    const it = this.bag[slotIdx]; if (!it) return;
    const d = idef(it);
    if (this.level < equipReqLv(it.id)) { if (window.G) G.toast(`레벨 ${equipReqLv(it.id)} 필요`, 'bad'); return false; }
    let key = null;
    if (d.type === 'weapon') key = 'weapon';
    else if (d.type === 'armor') key = d.slot;
    else if (d.type === 'bag') key = 'bag';
    else if (d.type === 'acc') key = this.equip.acc1 ? (this.equip.acc2 ? 'acc1' : 'acc2') : 'acc1';
    else if (d.type === 'pet') key = this.equip.pet1 ? (this.equip.pet2 ? 'pet1' : 'pet2') : 'pet1';
    if (!key) return false;
    const old = this.equip[key];
    this.equip[key] = it; this.bag[slotIdx] = old || null;
    this.recalc(); return true;
  }
  unequip(key) {
    const it = this.equip[key]; if (!it) return;
    for (let i = 0; i < this.bag.length; i++) if (!this.bag[i]) { this.bag[i] = it; this.equip[key] = null; this.recalc(); return true; }
    return false;
  }

  /* ---- 성장 ---- */
  addXp(n) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext; this.level++;
      this.statPts += 3;
      if (this.level % 2 === 0) this.skillPts++;
      this.xpNext = Math.round(40 * Math.pow(this.level, 1.42));
      this.recalc(); this.hp = this.d.maxHp; this.mp = this.d.maxMp;
      G.onLevelUp(this.level);
    }
  }

  addBuff(id, dur) {
    const bd = BUFFS[id]; if (!bd) return;
    const ex = this.buffs.find(b => b.id === id);
    if (ex) ex.t = Math.max(ex.t, dur || bd.dur);
    else this.buffs.push({ id, t: dur || bd.dur });
    this.recalc();
  }

  /* ---- 피해 ---- */
  hurt(amount, srcX) {
    if (this.iframe > 0 || this.dead) return;
    const red = this.d.def / (this.d.def + 60);
    let dmg = Math.max(1, Math.round(amount * (1 - red)));
    this.hp -= dmg;
    this.iframe = 0.5; this.flash = 0.25;
    G.shake = Math.max(G.shake, Math.min(9, dmg * 0.12));
    G.texts.push(new DmgText(this.cx, this.y, dmg, '#ff6b6b', 0));
    if (srcX !== undefined) { this.vx = Math.sign(this.cx - srcX) * 180; this.vy = -180; }
    for (let i = 0; i < 6; i++) G.parts.push(new Part(this.cx, this.cy, '#c8433c'));
    G.sfx('damage');
    if (this.hp <= 0) { this.hp = 0; G.onDeath(); }
    this.recalc();
  }
  heal(n) {
    const before = this.hp;
    this.hp = Math.min(this.d.maxHp, this.hp + n);
    if (this.hp > before) G.texts.push(new DmgText(this.cx, this.y, Math.round(this.hp - before), '#7fe07f', 0));
  }

  /* ---- 공격 ---- */
  attackReady() { return this.atkTimer <= 0; }
  doAttack(mx, my) {
    const w = this.weapon();
    if (!w) return this.punch(mx, my);
    const d = idef(w);
    if (d.type === 'tool') return this.punch(mx, my);
    if (d.pw && !this.useCharge(d.pw)) {
      G.toast('전하가 없다 — 충전된 배터리가 필요하다', 'bad');
      this.atkTimer = 0.3; return;
    }
    const ang = angleTo(this.cx, this.cy, mx, my);
    this.facing = Math.cos(ang) >= 0 ? 1 : -1;
    this.atkTimer = 1 / itemSpeed(w) / (1 + this.d.spdP);
    const base = itemDamage(w);

    if (d.wc === 'melee') {
      this.swing = 0.24; this.swingDir = this.facing; this.swingAng = ang; this.swingHit = new Set();
      this.swingReach = (d.reach || 42) + this.w / 2;
      G.sfx('swing');
    } else if (d.wc === 'ranged') {
      const n = d.multi || 1;
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.09 : 0);
        this.fireProj(d.proj || 'arrow', a, base, 'dex');
      }
      G.sfx('bow');
    } else if (d.wc === 'magic') {
      const cost = d.mana || 5;
      if (this.mp < cost) { G.toast('마나가 부족하다', 'bad'); this.atkTimer = 0.2; return; }
      this.mp -= cost;
      const n = d.multi || 1;
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.07 : 0);
        this.fireProj(d.proj || 'bolt', a, base, 'int');
      }
      G.sfx('magic');
    }
  }
  punch(mx, my) {
    const w = this.weapon();
    const dmg = w ? itemDamage(w) : 4;
    const ang = angleTo(this.cx, this.cy, mx, my);
    this.facing = Math.cos(ang) >= 0 ? 1 : -1;
    this.atkTimer = 1 / (w ? itemSpeed(w) : 2.4);
    this.swing = 0.2; this.swingDir = this.facing; this.swingAng = ang; this.swingHit = new Set();
    this.swingReach = 34 + this.w / 2;
    this._punchDmg = dmg;
  }
  scaleDmg(base, kind) {
    const d = this.d;
    let m = 1 + d.dmgP;
    if (kind === 'str') m *= 1 + d.str * 0.021;
    else if (kind === 'dex') m *= 1 + d.dex * 0.021;
    else if (kind === 'int') m *= (1 + d.int * 0.023) * (1 + d.magicP / 100);
    return base * m;
  }
  rollCrit() {
    const c = this.d.crit / 100;
    return Math.random() < c;
  }
  fireProj(type, ang, base, kind) {
    const dmg = this.scaleDmg(base, kind);
    const crit = this.rollCrit();
    const spd = type === 'arrow' ? 760 : type === 'star' ? 900 : 560;
    const p = new Proj(this.cx, this.cy - 4, Math.cos(ang) * spd, Math.sin(ang) * spd, dmg * (crit ? 1 + this.d.critD / 100 : 1), 'player', type);
    p.crit = crit;
    if (this.d.fire) p.fire = this.d.fire;
    if (this.d.frost) p.frost = this.d.frost;
    if (this.d.poison) p.poison = this.d.poison;
    if (type === 'arrow' || type === 'star') p.grav = type === 'arrow' ? 170 : 60;
    if (type === 'void' || type === 'star') p.pierce = 2;
    G.projs.push(p);
  }

  /* ---- 스킬 ---- */
  useSkill(i, mx, my) {
    const id = this.slots[i]; if (!id) return;
    const sk = SKILLS[id], r = this.skills[id] || 0;
    if (!r || sk.type !== 'active') return;
    if ((this.cd[id] || 0) > 0) return;
    if (this.mp < sk.mana) { G.toast('마나가 부족하다', 'bad'); return; }
    this.mp -= sk.mana;
    this.cd[id] = sk.cd * (1 - this.d.cdr / 100);
    const w = this.weapon();
    const wdmg = w && idef(w).dmg ? itemDamage(w) : 10;
    const ang = angleTo(this.cx, this.cy, mx, my);

    switch (id) {
      case 's_cleave': {
        const dmg = this.scaleDmg(wdmg * sk.v(r) / 100, 'str');
        G.aoe(this.cx, this.cy, 108, dmg, 6, '#ffb24a');
        G.shake = 6; break;
      }
      case 's_charge': {
        this.vx = Math.cos(ang) * 900; this.vy = -180;
        this.iframe = Math.max(this.iframe, 0.35);
        this.chargeDmg = this.scaleDmg(wdmg * sk.v(r) / 100, 'str');
        this.chargeT = 0.35; this.chargeHit = new Set();
        break;
      }
      case 's_whirl': {
        this.channel = { id, t: 2.5, tick: 0, dmg: this.scaleDmg(wdmg * sk.v(r) / 100, 'str') };
        break;
      }
      case 's_volley': {
        const n = sk.v(r);
        for (let i2 = 0; i2 < n; i2++) {
          const a = ang + (i2 - (n - 1) / 2) * 0.14;
          this.fireProj('arrow', a, wdmg * 0.7, 'dex');
        }
        break;
      }
      case 's_rain': {
        const n = sk.v(r);
        for (let i2 = 0; i2 < n; i2++) {
          G.pending.push({
            t: i2 * 0.07, fn: () => {
              const px = mx + (Math.random() - 0.5) * 260;
              const p = new Proj(px, my - 420 - Math.random() * 80, (Math.random() - 0.5) * 60, 820, this.scaleDmg(wdmg * 0.6, 'dex'), 'player', 'star');
              p.grav = 260; G.projs.push(p);
            }
          });
        }
        break;
      }
      case 's_fireball': {
        const p = new Proj(this.cx, this.cy - 4, Math.cos(ang) * 620, Math.sin(ang) * 620, this.scaleDmg(sk.v(r) + this.d.int * 1.6, 'int'), 'player', 'fire');
        p.explode = 70; p.fire = 2; G.projs.push(p); break;
      }
      case 's_heal': {
        this.heal(this.d.maxHp * sk.v(r) / 100);
        this.addBuff('well', 5);
        for (let k = 0; k < 18; k++) G.parts.push(new Part(this.cx + (Math.random() - 0.5) * 30, this.cy + (Math.random() - 0.5) * 40, '#9ff09f', -60));
        break;
      }
      case 's_nova': {
        G.aoe(this.cx, this.cy, 160, this.scaleDmg(sk.v(r) + this.d.int * 1.1, 'int'), 4, '#9fe0ff', 'frost');
        for (let k = 0; k < 26; k++) { const a = Math.random() * TAU; G.parts.push(new Part(this.cx + Math.cos(a) * 60, this.cy + Math.sin(a) * 60, '#9fe0ff')); }
        break;
      }
      case 's_wolf': {
        for (let k = 0; k < sk.v(r); k++) G.ents.push(new Wolf(this.cx + (k - 1) * 26, this.cy, this));
        break;
      }
    }
    G.sfx('skill');
  }

  /* ---- 업데이트 ---- */
  update(dt, world, input) {
    const d = this.d;
    // 타이머
    this.atkTimer -= dt; this.swing -= dt; this.dashCd -= dt; this.iframe -= dt;
    this.hurtCd -= dt; this.flash -= dt; this.potionCd -= dt;
    if (this.chargeT > 0) this.chargeT -= dt;
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - dt);
    for (let i = this.buffs.length - 1; i >= 0; i--) { this.buffs[i].t -= dt; if (this.buffs[i].t <= 0) { this.buffs.splice(i, 1); this.recalc(); } }

    // 재생
    this.mp = Math.min(d.maxMp, this.mp + d.mpreg * dt);
    if (this.hurtCd <= 0) this.hp = Math.min(d.maxHp, this.hp + d.hpreg * dt);

    // 이동
    const acc = this.onGround ? 2400 : 1500;
    let want = 0;
    if (input.left) want -= 1; if (input.right) want += 1;
    if (this.channel) want *= 0.4;
    if (want !== 0) {
      this.vx += want * acc * dt;
      this.vx = clamp(this.vx, -d.ms * (this.dashV > 0 ? 3 : 1), d.ms * (this.dashV > 0 ? 3 : 1));
      if (!this.swing || !this.channel) this.facing = want;
    } else {
      const fr = this.onGround ? 2600 : 700;
      if (Math.abs(this.vx) < fr * dt) this.vx = 0; else this.vx -= Math.sign(this.vx) * fr * dt;
    }
    this.dashV = Math.max(0, this.dashV - dt);

    // 점프 / 헤엄 — 물에 잠겨 있으면 점프가 발차기가 된다. 누르고 있는 동안 계속 떠오르고,
    // 횟수도 세지 않는다(물속에서 이중 점프를 아껴야 할 이유가 없다).
    // submerged는 직전 프레임 move()가 남긴 값이라 한 프레임 늦지만 체감되지 않는다.
    const inWater = (this.submerged || 0) > 0.3;
    // 입수 엣지 — 잠기기 시작하는 그 프레임에 한 번만 첨벙 소리(계속 잠겨 있는 동안은 안 울림)
    if (inWater && !this.wasInWater) G.sfx('splash');
    this.wasInWater = inWater;
    if (this.onGround || inWater) this.jumpsLeft = d.jumps;
    if (inWater) {
      if (input.jump) this.vy = Math.max(this.vy - 1150 * dt, -215);
      this.jumpHeld = !!input.jump;
      if (input.jump && Math.random() < dt * 10)
        G.parts.push(new Part(this.cx + (Math.random() - .5) * 14, this.y + this.h * .3, '#bfe4ff', -30, .5));
    } else {
      if (input.jump && !this.jumpHeld && this.jumpsLeft > 0) {
        this.vy = -620; this.jumpsLeft--; this.jumpHeld = true;
        if (!this.onGround) for (let i = 0; i < 8; i++) G.parts.push(new Part(this.cx, this.y + this.h, '#cfe8ff'));
      }
      if (!input.jump) this.jumpHeld = false;
      if (this.vy < 0 && !input.jump) this.vy += 1400 * dt;   // 가변 점프
    }
    /* 제트팩 — 공중에서 점프를 누르고 있는 동안 계속 떠오른다. 0.25초마다 전하를 한 번씩
       먹고, 바닥나면 useCharge가 가방의 배터리를 자동으로 갈아 끼운다. 배터리까지 없으면
       그 자리에서 추진이 끊긴다(그래서 높이 오를 때는 여분 배터리가 곧 안전줄이 된다). */
    this.jetting = false;
    if (d.jet && input.jump && !this.onGround && !inWater) {
      this.jetT = (this.jetT || 0) + dt;
      if (this.jetT >= 0.25) { this.jetT -= 0.25; this.jetOk = this.useCharge(4); }
      else if (this.jetOk === undefined) this.jetOk = this.charge > 0;
      if (this.jetOk) {
        this.vy = Math.max(this.vy - 2400 * dt, -330);
        this.jetting = true;
        this.jumpsLeft = d.jumps;       // 제트팩을 쓰는 동안은 이중 점프를 아낄 이유가 없다
        if (Math.random() < dt * 30)
          G.parts.push(new Part(this.cx + (Math.random() - .5) * 10, this.y + this.h, '#ffb04a', 60, 0.35));
      }
    } else { this.jetT = 0; this.jetOk = undefined; }

    // 활공 — 깃털 부적이 있으면 낙하 중 점프 유지 시 천천히 내려온다
    this.gliding = false;
    if (d.glide && !this.jetting && input.jump && this.vy > 60 && !this.onGround && this.jumpsLeft <= 0) {
      this.vy = Math.min(this.vy, 110);
      this.gliding = true;
      if (Math.random() < dt * 14) G.parts.push(new Part(this.cx, this.y + this.h, '#dfe9f5', -20, .4));
    }

    // 대시
    if (input.dash && this.dashCd <= 0) {
      const dir = want !== 0 ? want : this.facing;
      this.vx = dir * 720; this.dashV = 0.22;
      this.iframe = d.dashI / 1000; this.dashCd = d.dashCd;
      for (let i = 0; i < 12; i++) G.parts.push(new Part(this.cx, this.cy, '#cfd8ff'));
      G.sfx('dash');
    }

    // 낙하 데미지 판정용 — move() 안에서 착지 순간 vy가 0으로 꺾이기 전에 미리 재둔다
    const wasOnGround = this.onGround, fallVy = this.vy;
    this.move(dt, world, { dropThrough: !!input.down });
    // 물에 빠지면 안 다친다 — 폭포 아래 웅덩이가 착지 지점이 되어 주는 게 이 지형의 요점이다
    // 제트팩도 마찬가지 — 추진으로 속도를 죽이며 내려앉는 것이라 낙하 피해가 없다
    if (!wasOnGround && this.onGround && !d.glide && !d.jet && (this.submerged || 0) <= 0.2) {
      // 건초더미 위로 떨어지면 안 다친다 — 마을에서 지붕을 타고 다니라고 둔 것
      const bt = world.get(Math.floor(this.cx / TS), Math.floor((this.y + this.h + 2) / TS));
      if (fallVy > SAFE_FALL_VY && this.iframe <= 0 && !TILE_DEF[bt].soft) {
        const dmg = Math.round((fallVy - SAFE_FALL_VY) / (MAX_FALL - SAFE_FALL_VY) * 55);
        if (dmg > 0) { this.hurt(dmg); this.hurtCd = Math.max(this.hurtCd, 0.4); }
      }
    }

    // 돌진 타격
    if (this.chargeT > 0) {
      for (const e of G.ents) {
        if (!(e instanceof Enemy) || e.dead || this.chargeHit.has(e)) continue;
        if (aabb(this.rect(), e.rect())) { this.chargeHit.add(e); e.hurt(this.chargeDmg, this.rollCrit(), this, 14); }
      }
    }
    // 채널링
    if (this.channel) {
      this.channel.t -= dt; this.channel.tick -= dt;
      if (this.channel.tick <= 0) {
        this.channel.tick = 0.28;
        G.aoe(this.cx, this.cy, 96, this.channel.dmg * 0.28, 3, '#ffcf6a');
      }
      if (this.channel.t <= 0) this.channel = null;
    }
    // 근접 스윙 판정
    if (this.swing > 0 && this.swingHit) {
      const reach = this.swingReach;
      const w = this.weapon();
      const base = w && idef(w).dmg && idef(w).type === 'weapon' && idef(w).wc === 'melee' ? itemDamage(w) : (this._punchDmg || 4);
      const kb = w ? (idef(w).kb || 3) : 2;
      for (const e of G.ents) {
        if (!(e instanceof Enemy) || e.dead || this.swingHit.has(e)) continue;
        const dx = e.cx - this.cx, dy = e.cy - this.cy;
        if (dx * dx + dy * dy > (reach + e.w / 2) * (reach + e.w / 2)) continue;
        if (Math.sign(dx) !== this.swingDir && Math.abs(dx) > 8) continue;
        if (Math.abs(dy) > reach * 0.85) continue;
        this.swingHit.add(e);
        const crit = this.rollCrit();
        e.hurt(this.scaleDmg(base, 'str'), crit, this, kb);
        if (this.d.fire) e.addDot('burn', this.scaleDmg(base, 'str') * 0.12 * this.d.fire, 4);
        if (this.d.frost) e.slow(0.45, 2.5);
        if (this.d.poison) e.addDot('poison', this.scaleDmg(base, 'str') * 0.13 * this.d.poison, 5);
      }
    }

    // 용암/가시/선인장 등 환경 피해 — 몸 전체 범위로 검사해야 고체 블록(선인장)도 스치기만 해도 걸린다
    const tx = Math.floor(this.cx / TS), ty = Math.floor(this.cy / TS);
    const hurt = world.hurtInRect(this.x, this.y, this.w, this.h);
    if (hurt && this.iframe <= 0) { this.hurt(hurt); this.hurtCd = 3; }
    this.deepest = Math.max(this.deepest, ty);
    this.highest = Math.min(this.highest === undefined ? ty : this.highest, ty);
  }
}

/* ================= 적 ================= */
class Enemy extends Ent {
  constructor(type, x, y, scale = 1) {
    const d = ENEMIES[type];
    super(x, y, d.w, d.h);
    this.type = type; this.def = d;
    this.maxHp = Math.round(d.hp * scale); this.hp = this.maxHp;
    this.dmg = d.dmg * scale; this.armor = d.def * scale;
    this.spd = d.spd; this.xp = Math.round(d.xp * scale); this.gold = Math.round(d.gold * scale);
    this.boss = !!d.boss;
    this.aggro = d.aggro || 460;   // 인지 사정거리(px) — 이 밖에서는 추격하지 않는다
    this.flash = 0; this.atkCd = 0; this.jumpCd = 0; this.think = 0;
    /* 공격 포즈를 띄워 둘 시간. 예전에는 atkCd > 1.4 로 대신했는데, atkCd 는
       화살·마법을 쏘는 놈만 쓴다 — 근접은 접촉 피해라 값이 늘 0이었고, 그래서
       프레임 4(공격 그림)를 한 번도 못 보여 주고 있었다. 때린 순간에 직접 켠다. */
    this.atkPose = 0;
    this.lastPhase = 0;
    this.slowT = 0; this.slowF = 1; this.dots = [];
    this.phase = 0; this.state = 0; this.stateT = 0;
    this.facing = -1;
    this.hitCd = 0;
  }
  addDot(kind, dps, dur) { this.dots.push({ kind, dps, t: dur }); }
  slow(f, t) { this.slowF = Math.min(this.slowF, 1 - f); this.slowT = Math.max(this.slowT, t); }

  hurt(amount, crit, src, kb) {
    if (this.dead) return;
    const red = this.armor / (this.armor + 70);
    let dmg = Math.max(1, Math.round(amount * (1 - red)));
    this.hp -= dmg; this.flash = 0.12;
    G.texts.push(new DmgText(this.cx + (Math.random() - 0.5) * 14, this.y - 4, dmg, crit ? '#ffd24a' : '#fff', crit ? 1 : 0));
    for (let i = 0; i < (crit ? 8 : 4); i++) G.parts.push(new Part(this.cx, this.cy, this.def.c));
    if (src instanceof Player) {
      if (src.d.lifesteal > 0) src.heal(dmg * src.d.lifesteal / 100);
      src.hurtCd = Math.max(src.hurtCd, 0.6);
    }
    if (kb && !this.boss) { this.vx += Math.sign(this.cx - (src ? src.cx : this.cx)) * kb * 26; this.vy = -kb * 12; }
    else if (kb && this.boss) this.vx += Math.sign(this.cx - (src ? src.cx : this.cx)) * kb * 3;
    if (this.def.passive) this.fleeT = 2.2;
    G.sfxAt('damage', this.cx / TS, this.cy / TS);
    if (this.hp <= 0) this.die(src);
  }
  die(src) {
    if (this.dead) return;
    this.dead = true;
    const p = G.player;
    // 붉은 달 같은 이벤트 중에는 위험한 만큼 보상도 오른다
    const mult = G.killMult ? G.killMult() : 1;
    p.addXp(Math.round(this.xp * mult)); p.gold += Math.round(this.gold * mult);
    p.kills[this.type] = (p.kills[this.type] || 0) + 1;
    if (this.boss) p.bossKilled[this.type] = true;
    const rng = G.rng;
    for (const [id, ch, a, b] of (this.def.drops || [])) {
      if (!rng.chance(ch)) continue;
      const n = rng.int(a, b);
      if (ITEMS[id] && (ITEMS[id].stack || 1) > 1) G.drops.push(new Drop(this.cx, this.cy, makeItem(id, n)));
      else for (let k = 0; k < n; k++) G.drops.push(new Drop(this.cx, this.cy, rollGear(id, rng, this.boss ? 3 : 0)));
    }
    for (let i = 0; i < (this.boss ? 60 : 12); i++) G.parts.push(new Part(this.cx, this.cy, this.def.c, -40));
    if (this.boss) { G.shake = 18; G.onBossDown(this.type); }
    if (p.skills.s_hunter) p.addBuff('swift_kill', 3);
    G.onKill(this.type);
    G.sfx(this.boss ? 'bossdie' : 'die');
  }

  update(dt, world, player) {
    this.atkPose -= dt;
    this.flash -= dt; this.atkCd -= dt; this.jumpCd -= dt; this.hitCd -= dt;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowF = 1; }
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const d = this.dots[i]; d.t -= dt;
      this.hp -= d.dps * dt;
      if (Math.random() < dt * 6) G.parts.push(new Part(this.cx, this.cy, d.kind === 'burn' ? '#ff8a3a' : d.kind === 'poison' ? '#8fd06a' : '#9fe0ff'));
      if (d.t <= 0) this.dots.splice(i, 1);
    }
    if (this.hp <= 0) { this.die(null); return; }

    const dx = player.cx - this.cx, dy = player.cy - this.cy;
    const dd = Math.hypot(dx, dy);
    this.facing = dx >= 0 ? 1 : -1;
    const AI = this.def.ai;
    const sp = this.spd * this.slowF;

    if (AI === 'walker' || AI === 'jumper' || AI === 'archer') {
      const range = this.def.range || 0;
      if (AI === 'archer' && dd < range * 0.55) this.vx = -Math.sign(dx) * sp;
      else if (dd < this.aggro) this.vx = Math.sign(dx) * sp * (AI === 'jumper' && !this.onGround ? 1.4 : 1);
      else this.vx *= 0.9;
      if (AI === 'jumper' && this.onGround && this.jumpCd <= 0 && dd < Math.min(480, this.aggro)) { this.vy = -430; this.jumpCd = 1.1 + Math.random() * 0.6; }
      if (this.hitWall && this.onGround && this.jumpCd <= 0) { this.vy = -420; this.jumpCd = 0.6; }
      if (AI === 'archer' && this.atkCd <= 0 && dd < Math.min(range, this.aggro) && Math.abs(dy) < 180) {
        this.atkCd = 1.8 + Math.random() * 0.6;
        this.atkPose = 0.26;
        const a = angleTo(this.cx, this.cy, player.cx, player.cy - 6);
        const p = new Proj(this.cx, this.cy, Math.cos(a) * 460, Math.sin(a) * 460, this.dmg, 'enemy', this.def.proj || 'arrow');
        p.grav = 220; G.projs.push(p);
      }
      this.move(dt, world);
    } else if (AI === 'flyer') {
      this.think -= dt;
      if (this.think <= 0) { this.think = 0.5 + Math.random() * 0.5; this.wob = (Math.random() - 0.5) * 90; }
      if (dd < this.aggro) {
        this.vx = lerp(this.vx, (dx / (dd || 1)) * sp, dt * 3);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * sp + (this.wob || 0), dt * 3);
      } else { this.vx *= 0.98; this.vy = lerp(this.vy, Math.sin(G.time * 2) * 30, dt * 2); }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'caster') {
      const range = this.def.range || 300;
      this.think -= dt;
      if (dd > this.aggro) { this.vx *= 0.95; this.vy = lerp(this.vy, Math.sin(G.time * 3 + this.x) * 40, dt * 2); }   // 사정거리 밖 — 배회만
      else if (dd > range * 0.8) { this.vx = lerp(this.vx, (dx / (dd || 1)) * sp, dt * 3); this.vy = lerp(this.vy, (dy / (dd || 1)) * sp, dt * 3); }
      else if (dd < range * 0.4) { this.vx = lerp(this.vx, -(dx / (dd || 1)) * sp, dt * 3); this.vy = lerp(this.vy, -(dy / (dd || 1)) * sp, dt * 3); }
      else { this.vx *= 0.95; this.vy = lerp(this.vy, Math.sin(G.time * 3 + this.x) * 40, dt * 2); }
      if (this.atkCd <= 0 && dd < Math.min(range, this.aggro)) {
        this.atkCd = 2.0 + Math.random() * 0.8;
        this.atkPose = 0.26;
        const a = angleTo(this.cx, this.cy, player.cx, player.cy);
        const kind = this.def.proj || (this.type === 'frostling' ? 'frost' : this.type === 'imp' ? 'fire' : 'dark');
        G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 320, Math.sin(a) * 320, this.dmg, 'enemy', kind));
      }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'critter') {
      // 순한 동물 — 플레이어를 무시하고 어슬렁거리다가, 맞으면 잠깐 반대쪽으로 도망친다
      if (this.fleeT > 0) { this.fleeT -= dt; this.vx = -Math.sign(dx || 1) * sp * 1.8; }
      else {
        this.think -= dt;
        if (this.think <= 0) { this.think = 1.2 + Math.random() * 2.2; this.wDir = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1); }
        this.vx = lerp(this.vx, this.wDir * sp * 0.5, dt * 2);
      }
      if (this.onGround && this.hitWall && this.jumpCd <= 0) { this.vy = -300; this.jumpCd = 0.5; }
      this.move(dt, world);
    } else if (AI === 'swimmer') {
      // 물속 생물 — 물 밖으로는 못 나간다. 다음 한 걸음이 물이 아니면 그 방향을 버린다.
      // (물 밖으로 튕겨 나가 바닥에서 파닥거리는 꼴을 막는 게 이 AI의 전부다)
      const wet = (x, y) => world.liquid(Math.floor(x / TS), Math.floor(y / TS));
      this.think -= dt;
      if (this.think <= 0) { this.think = 0.7 + Math.random() * 1.1; this.wob = (Math.random() - 0.5) * 70; }
      const chase = !this.def.passive && dd < this.aggro;
      if (chase) {
        this.vx = lerp(this.vx, (dx / (dd || 1)) * sp, dt * 2.6);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * sp + (this.wob || 0) * 0.3, dt * 2.6);
      } else {
        this.vx = lerp(this.vx, (this.wDir || 0) * sp * 0.45, dt * 1.6);
        this.vy = lerp(this.vy, (this.wob || 0) * 0.5, dt * 1.6);
        if (this.jumpCd <= 0) { this.jumpCd = 1.4 + Math.random() * 1.6; this.wDir = Math.random() < 0.5 ? -1 : 1; }
      }
      // 물 경계에서 되돌리기 — 한 프레임 뒤의 자리를 미리 보고, 물이 아니면 그 축을 죽인다
      const lookX = this.cx + Math.sign(this.vx) * (this.w / 2 + 4);
      const lookY = this.cy + Math.sign(this.vy) * (this.h / 2 + 4);
      if (this.vx !== 0 && !wet(lookX, this.cy)) { this.vx *= -0.5; this.wDir = -(this.wDir || 1); }
      if (this.vy !== 0 && !wet(this.cx, lookY)) this.vy *= -0.5;
      this.move(dt, world, { gravMul: 0, aquatic: 1 });
    } else {
      this.bossAI(dt, world, player, dx, dy, dd);
    }

    // 접촉 피해 (순한 동물은 dmg 0이라 사실상 무해하지만, 명시적으로 건너뛴다)
    if (!this.def.passive && this.hitCd <= 0 && aabb(this.rect(), player.rect())) {
      player.hurt(this.dmg * (this.boss ? 1 : 0.9), this.cx);
      this.hitCd = 0.7;
      this.atkPose = 0.22;
    }
  }

  /* ---- 보스 AI ---- */
  bossAI(dt, world, p, dx, dy, dd) {
    const AI = this.def.ai;
    this.stateT -= dt;
    const hpr = this.hp / this.maxHp;
    this.phase = hpr < 0.33 ? 2 : hpr < 0.66 ? 1 : 0;
    /* 페이즈가 올라가는 순간을 연출로 알린다. 보스 시트는 페이즈마다 idle 두 장뿐이고
       그림 차이가 작은 보스가 여럿이라(void_king 1.5% · bone_lord 3.3% · shaft_maw 6.6%)
       그림만으로는 바뀐 걸 알아챌 수 없었다. 그림을 다시 그리기 전까지 이걸로 메운다. */
    if (this.phase > this.lastPhase) {
      this.lastPhase = this.phase;
      this.phaseT = 0.7;
      G.shake = Math.max(G.shake, 11);
      for (let i = 0; i < 26; i++) {
        G.parts.push(new Part(this.cx + (Math.random() - 0.5) * this.w,
                              this.cy + (Math.random() - 0.5) * this.h,
                              i % 3 ? this.def.c : '#ffe08a', -120, 0.9));
      }
      G.sfxAt('chapter', this.cx / TS, this.cy / TS);
    }
    this.phaseT = (this.phaseT || 0) - dt;

    if (AI === 'b_slime') {
      if (this.onGround) {
        this.vx *= 0.86;
        if (this.jumpCd <= 0) {
          this.jumpCd = 1.5 - this.phase * 0.35;
          this.vy = -680 - this.phase * 60;
          this.vx = Math.sign(dx) * (200 + this.phase * 70);
          if (Math.random() < 0.35 + this.phase * 0.2) {
            for (let i = 0; i < 2 + this.phase; i++) {
              const e = new Enemy('slime', this.cx + (Math.random() - 0.5) * 60, this.y, G.scale());
              e.vy = -300; G.ents.push(e);
            }
          }
        }
      }
      this.move(dt, world);
    } else if (AI === 'b_bone') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3; this.stateT = this.state === 1 ? 2.2 : 2.6;
        if (this.state === 2) for (let i = 0; i < 2 + this.phase; i++) G.ents.push(new Enemy(Math.random() < .5 ? 'skeleton' : 'archer', this.cx + (Math.random() - 0.5) * 200, this.cy - 30, G.scale()));
      }
      if (this.state === 0) {           // 추격
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd, dt * 3);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.6, dt * 3);
      } else if (this.state === 1) {    // 뼈 투척
        this.vx *= 0.94; this.vy = lerp(this.vy, -20, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.35 - this.phase * 0.06;
          const a = angleTo(this.cx, this.cy, p.cx, p.cy) + (Math.random() - 0.5) * 0.4;
          G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 470, Math.sin(a) * 470, this.dmg * 0.7, 'enemy', 'bone'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_heart') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = this.state === 0 ? 3.2 : this.state === 1 ? 1.6 : 2.4;
        if (this.state === 1) { this.dashA = angleTo(this.cx, this.cy, p.cx, p.cy); }
        if (this.state === 2) for (let i = 0; i < 1 + this.phase; i++) G.ents.push(new Enemy('shadoweye', this.cx + (Math.random() - 0.5) * 220, this.cy, G.scale()));
      }
      if (this.state === 0) {
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 0.7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 0.7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 1.1 - this.phase * 0.25;
          const n = 8 + this.phase * 4;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + G.time;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 280, Math.sin(a) * 280, this.dmg * 0.55, 'enemy', 'dark'));
          }
        }
      } else if (this.state === 1) {
        this.vx = Math.cos(this.dashA) * this.spd * 3.4; this.vy = Math.sin(this.dashA) * this.spd * 3.4;
      } else { this.vx *= 0.92; this.vy *= 0.92; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_witch') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4; this.stateT = 2.4;
        if (this.state === 0) {   // 순간이동
          const a = Math.random() * TAU, r = 200;
          this.x = clamp(p.cx + Math.cos(a) * r, TS * 2, WW * TS - TS * 3);
          this.y = p.cy + Math.sin(a) * r - 60;
          for (let i = 0; i < 24; i++) G.parts.push(new Part(this.cx, this.cy, '#a8dcf0'));
        }
        if (this.state === 2) {
          for (let i = 0; i < 1 + this.phase; i++) G.ents.push(new Enemy('frostling', this.cx + (Math.random() - 0.5) * 240, this.cy, G.scale()));
        }
      }
      if (this.state === 1) {      // 얼음창 세례
        if (this.atkCd <= 0) {
          this.atkCd = 0.45 - this.phase * 0.1;
          const n = 3 + this.phase;
          const base = angleTo(this.cx, this.cy, p.cx, p.cy);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.22;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 420, Math.sin(a) * 420, this.dmg * 0.6, 'enemy', 'frost'));
          }
        }
      } else if (this.state === 3) { // 서리 폭발 추적
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 1.4, dt * 3);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 1.4, dt * 3);
        if (this.atkCd <= 0) {
          this.atkCd = 1.4;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 240, Math.sin(a) * 240, this.dmg * 0.5, 'enemy', 'frost'));
          }
        }
      } else { this.vx *= 0.9; this.vy = lerp(this.vy, Math.sin(G.time * 2) * 30, dt * 2); }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_void') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4; this.stateT = 2.6 - this.phase * 0.3;
        if (this.state === 3) for (let i = 0; i < 2 + this.phase; i++) G.ents.push(new Enemy('wraith', this.cx + (Math.random() - 0.5) * 320, this.cy, G.scale()));
      }
      if (this.state === 0) {          // 나선탄
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 0.6, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 0.6, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.16;
          const a = G.time * 5;
          for (let k = 0; k < 3; k++)
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a + k * TAU / 3) * 300, Math.sin(a + k * TAU / 3) * 300, this.dmg * 0.45, 'enemy', 'void'));
        }
      } else if (this.state === 1) {   // 추적 레이저 탄
        this.vx *= 0.9; this.vy *= 0.9;
        if (this.atkCd <= 0) {
          this.atkCd = 0.5;
          const a = angleTo(this.cx, this.cy, p.cx, p.cy);
          for (let i = -2; i <= 2; i++) {
            const pr = new Proj(this.cx, this.cy, Math.cos(a + i * 0.13) * 520, Math.sin(a + i * 0.13) * 520, this.dmg * 0.55, 'enemy', 'void');
            G.projs.push(pr);
          }
        }
      } else if (this.state === 2) {   // 돌진
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 3, dt * 4);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 3, dt * 4);
      } else { this.vx *= 0.92; this.vy *= 0.92; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_storm') {
      /* 폭풍의 수호자 — 상하 급강하 + 회전 돌풍 + 바람 정령 소환 */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = this.state === 1 ? 1.5 : 2.4 - this.phase * 0.25;
        if (this.state === 1) this.dashA = angleTo(this.cx, this.cy, p.cx, p.cy);
        if (this.state === 3) for (let i = 0; i < 2 + this.phase; i++)
          G.ents.push(new Enemy(Math.random() < .5 ? 'gale' : 'sky_sentry', this.cx + (Math.random() - 0.5) * 300, this.cy, G.scale()));
      }
      if (this.state === 0) {            // 회전 돌풍
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * .7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * .7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.22;
          const n = 5 + this.phase * 2, base = G.time * 4;
          for (let i = 0; i < n; i++) {
            const a = base + (i / n) * TAU;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 330, Math.sin(a) * 330, this.dmg * 0.42, 'enemy', 'wind'));
          }
        }
      } else if (this.state === 1) {     // 급강하
        this.vx = Math.cos(this.dashA) * this.spd * 3.6;
        this.vy = Math.sin(this.dashA) * this.spd * 3.6;
      } else if (this.state === 2) {     // 벼락 세례
        this.vx *= 0.9; this.vy = lerp(this.vy, -30, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.5 - this.phase * 0.1;
          for (let i = 0; i < 3 + this.phase; i++) {
            const px2 = p.cx + (Math.random() - 0.5) * 340;
            G.pending.push({
              t: i * 0.06, fn: () => {
                const pr = new Proj(px2, p.cy - 420, 0, 780, this.dmg * 0.5, 'enemy', 'bolt');
                G.projs.push(pr);
              }
            });
          }
        }
      } else { this.vx *= 0.92; this.vy *= 0.92; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_keeper') {
      /* 최초의 파수꾼 — 지상 보스. 방벽 → 룬 광선 → 돌진 → 소환 */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 2.8 - this.phase * 0.3;
        if (this.state === 3) for (let i = 0; i < 1 + this.phase; i++)
          G.ents.push(new Enemy(this.def.minion || 'ruin_guard', this.cx + (Math.random() - 0.5) * 260, this.cy - 20, G.scale()));
      }
      if (this.state === 0) {            // 룬 광선 (부채꼴)
        this.vx *= 0.86;
        if (this.atkCd <= 0) {
          this.atkCd = 0.9 - this.phase * 0.18;
          const base = angleTo(this.cx, this.cy, p.cx, p.cy);
          const n = 5 + this.phase * 2;
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.17;
            const pr = new Proj(this.cx, this.cy, Math.cos(a) * 460, Math.sin(a) * 460, this.dmg * 0.5, 'enemy', 'rune');
            G.projs.push(pr);
          }
        }
      } else if (this.state === 1) {     // 추격
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd, dt * 3);
        if (this.onGround && (dy < -40 || this.hitWall)) this.vy = -560;
      } else if (this.state === 2) {     // 지진 돌진
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 2.6, dt * 4);
        if (this.onGround && this.atkCd <= 0) {
          this.atkCd = 0.7;
          G.shake = Math.max(G.shake, 10);
          for (let i = 0; i < 8; i++) {
            const a = -Math.PI * (0.15 + Math.random() * 0.7);
            G.projs.push(new Proj(this.cx, this.cy + this.h / 2, Math.cos(a) * 260, Math.sin(a) * 260, this.dmg * 0.4, 'enemy', 'bone'));
          }
        }
      } else this.vx *= 0.9;
      this.move(dt, world);
    } else if (AI === 'b_pursuer') {
      /* 종장 — 별을 쫓아온 것. 공허 탄막 → 순간이동 강타 → 잿비 → 망령 소환.
         지상에 발을 딛지 않는다(gravMul 0). 상태가 1로 바뀌는 순간 플레이어 옆으로 도약한다. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 3.0 - this.phase * 0.4;
        if (this.state === 1) {
          this.x = clamp(p.cx + (Math.random() < .5 ? -170 : 170), TS * 3, WW * TS - TS * 3) - this.w / 2;
          this.y = p.cy - this.h;
          G.shake = Math.max(G.shake, 12);
          for (let i = 0; i < 26; i++) G.parts.push(new Part(this.cx, this.cy, '#a06fff', -40, 1.1));
        }
        if (this.state === 3) for (let i = 0; i < 2 + this.phase; i++)
          G.ents.push(new Enemy(this.def.minion || 'wraith', this.cx + (Math.random() - 0.5) * 300, this.cy - 30, G.scale()));
      }
      if (this.state === 0) {            // 공허 탄막 — 천천히 돌아가는 나선
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.5, dt * 2);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.4, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.28 - this.phase * 0.05;
          this.spin = (this.spin || 0) + 0.55;
          const n = 3 + this.phase;
          for (let i = 0; i < n; i++) {
            const a = this.spin + i * TAU / n;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 330, Math.sin(a) * 330, this.dmg * 0.42, 'enemy', 'void'));
          }
        }
      } else if (this.state === 1) {     // 강타 — 플레이어를 향해 가속, 닿으면 폭발
        const a = angleTo(this.cx, this.cy, p.cx, p.cy);
        this.vx = lerp(this.vx, Math.cos(a) * this.spd * 2.4, dt * 5);
        this.vy = lerp(this.vy, Math.sin(a) * this.spd * 2.4, dt * 5);
        if (this.atkCd <= 0) {
          this.atkCd = 1.1;
          const n = 10 + this.phase * 4;
          for (let k = 0; k < n; k++) {
            const ang = k * TAU / n;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(ang) * 250, Math.sin(ang) * 250, this.dmg * 0.38, 'enemy', 'dark'));
          }
        }
      } else if (this.state === 2) {     // 잿비 — 머리 위에서 쏟아진다
        this.vx = lerp(this.vx, 0, dt * 3);
        this.vy = lerp(this.vy, -30, dt * 3);
        if (this.atkCd <= 0) {
          this.atkCd = 0.16 - this.phase * 0.03;
          const px = p.cx + (Math.random() - 0.5) * 620;
          G.projs.push(new Proj(px, this.cy - 260, (Math.random() - 0.5) * 40, 420, this.dmg * 0.34, 'enemy', 'bone'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_restorer') {
      /* 부유 성채의 환원기 — 지금까지 나온 무엇보다 세다.
         다른 보스와 갈리는 점은 딱 하나, **발판을 없앤다**는 것이다. 기반암과 제단만 남기고
         제 주변 타일을 계속 지운다. 하늘 위라 바닥이 사라지면 그대로 떨어진다 —
         그래서 이 싸움은 "때리는 것"보다 "설 자리를 남기는 것"이 먼저다. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 2.6 - this.phase * 0.35;
        if (this.state === 3) for (let i = 0; i < 2 + this.phase; i++)
          G.ents.push(new Enemy(this.def.minion || 'orbit_sentry', this.cx + (Math.random() - 0.5) * 320, this.cy - 20, G.scale()));
      }
      // --- 해체: 상태와 무관하게 늘 돈다. 위상이 오를수록 반경과 속도가 커진다 ---
      this.unmakeCd = (this.unmakeCd || 0) - dt;
      if (this.unmakeCd <= 0) {
        this.unmakeCd = 0.30 - this.phase * 0.07;
        const R = 6 + this.phase * 3;
        const bx = Math.floor(this.cx / TS), by = Math.floor(this.cy / TS);
        for (let k = 0; k < 5 + this.phase * 3; k++) {
          const a = Math.random() * TAU, r = Math.random() * R;
          const tx = bx + Math.round(Math.cos(a) * r), ty = by + Math.round(Math.sin(a) * r);
          if (tx < 2 || ty < 2 || tx >= WW - 2 || ty >= WH - 2) continue;
          const t = world.get(tx, ty);
          // 기반암과 제단석은 남긴다 — 싸울 자리 자체가 사라지면 싸움이 성립하지 않는다
          if (t === T.AIR || t === T.BEDROCK || t === T.ALTARSTONE) continue;
          world.set(tx, ty, T.AIR);
          if (Math.random() < 0.5) G.parts.push(new Part(tx * TS + 11, ty * TS + 11, '#a8c8e8', -20, 0.8));
        }
      }
      if (this.state === 0) {            // 궤도 탄막 — 회전하는 별 다발
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.5, dt * 2);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.4, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.24 - this.phase * 0.04;
          this.spin = (this.spin || 0) + 0.42;
          const n = 4 + this.phase * 2;
          for (let i = 0; i < n; i++) {
            const a = this.spin + i * TAU / n;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 360, Math.sin(a) * 360, this.dmg * 0.36, 'enemy', 'star'));
          }
        }
      } else if (this.state === 1) {     // 끌어올림 — 플레이어를 위로 잡아당기며 접근
        const a = angleTo(this.cx, this.cy, p.cx, p.cy);
        this.vx = lerp(this.vx, Math.cos(a) * this.spd * 1.8, dt * 4);
        this.vy = lerp(this.vy, Math.sin(a) * this.spd * 1.8, dt * 4);
        if (dd < 420) p.vy -= 320 * dt;   // 발이 자꾸 뜬다
        if (this.atkCd <= 0) {
          this.atkCd = 0.9;
          G.shake = Math.max(G.shake, 8);
        }
      } else if (this.state === 2) {     // 낙하 유도 — 머리 위에서 쏟아진다
        this.vx = lerp(this.vx, 0, dt * 3);
        this.vy = lerp(this.vy, -40, dt * 3);
        if (this.atkCd <= 0) {
          this.atkCd = 0.14 - this.phase * 0.03;
          const px = p.cx + (Math.random() - 0.5) * 700;
          G.projs.push(new Proj(px, this.cy - 280, (Math.random() - 0.5) * 50, 460, this.dmg * 0.30, 'enemy', 'star'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    }
  }
}

/* ================= 소환수 ================= */
/* ================= 마을 경비병 =================
   여명 마을이 요새(3단계)가 되면 성문에 상주한다. 플레이어가 멀어지면 다른 잡몹처럼
   정리되고, 돌아오면 game.js가 다시 세운다 — 그래서 따로 저장할 상태가 없다. */
class Guard extends Ent {
  constructor(x, y, lv) {
    super(x, y, 20, 40);
    this.home = x;          // 초소 위치 — 픽셀 좌표다 (타일 아님)
    this.guard = true;
    this.maxHp = 420 + lv * 60;
    this.hp = this.maxHp;
    this.dmg = 38 + lv * 7;
    this.atkCd = 0; this.shootCd = 0; this.face = 1;
  }
  hurt(n) { this.hp -= n; if (this.hp <= 0) this.dead = true; }
  update(dt, world, player) {
    this.atkCd -= dt; this.shootCd -= dt;
    let target = null, best = 520 * 520;
    for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead || e.def.passive) continue;
      const d = dist2(this.cx, this.cy, e.cx, e.cy);
      if (d < best) { best = d; target = e; }
    }
    if (target) {
      this.face = Math.sign(target.cx - this.cx) || 1;
      const gap = Math.abs(target.cx - this.cx);
      // 창을 들고 있어서 붙으면 찌르고, 떨어지면 활로 바꾼다
      if (gap < 40 && this.atkCd <= 0 && Math.abs(target.cy - this.cy) < 50) {
        this.atkCd = 0.7; target.hurt(this.dmg, false, null, 5);
      } else if (gap > 60 && this.shootCd <= 0) {
        this.shootCd = 1.1;
        // 몸 앞쪽에서 쏜다 — 제자리에서 쏘면 옆에 쌓아 둔 자루나 울타리에 바로 박힌다
        const ox = this.cx + this.face * 14, oy = this.cy - 6;
        const a = angleTo(ox, oy, target.cx, target.cy);
        const pr = new Proj(ox, oy, Math.cos(a) * 700, Math.sin(a) * 700, this.dmg * 0.8, 'player', 'arrow');
        pr.grav = 150; G.projs.push(pr);
      }
      // 성문에서 너무 멀어지지 않는다 — 마을을 비우면 지키는 의미가 없다
      const want = clamp(target.cx, this.home - 26 * TS, this.home + 26 * TS);
      const dx = want - this.cx;
      this.vx = Math.abs(dx) > 24 ? lerp(this.vx, Math.sign(dx) * 210, dt * 5) : this.vx * 0.85;
      if (this.onGround && this.hitWall) this.vy = -420;
    } else {
      const dx = this.home - this.cx;
      if (Math.abs(dx) > 40) { this.vx = lerp(this.vx, Math.sign(dx) * 150, dt * 4); this.face = Math.sign(dx); }
      else this.vx *= 0.82;
      if (this.onGround && this.hitWall) this.vy = -420;
      if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 22 * dt);
    }
    this.move(dt, world);
  }
}

class Wolf extends Ent {
  constructor(x, y, owner) {
    super(x, y, 30, 22);
    this.owner = owner; this.life = 30; this.atkCd = 0; this.minion = true;
    this.dmg = 18 + owner.d.int * 1.8;
  }
  update(dt, world, player) {
    this.life -= dt; this.atkCd -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    let target = null, best = 460 * 460;
    for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      const d = dist2(this.cx, this.cy, e.cx, e.cy);
      if (d < best) { best = d; target = e; }
    }
    if (target) {
      this.vx = lerp(this.vx, Math.sign(target.cx - this.cx) * 260, dt * 5);
      if (this.onGround && (target.cy < this.cy - 20 || this.hitWall)) this.vy = -420;
      if (this.atkCd <= 0 && aabb(this.rect(), target.rect())) { this.atkCd = 0.6; target.hurt(this.dmg, false, null, 3); }
    } else {
      const d = player.cx - this.cx;
      if (Math.abs(d) > 60) this.vx = lerp(this.vx, Math.sign(d) * 230, dt * 4); else this.vx *= 0.86;
      if (this.onGround && (player.cy < this.cy - 40 || this.hitWall)) this.vy = -420;
    }
    this.move(dt, world);
  }
}

/* ================= 펫 =================
   장비창의 펫 슬롯에 낀 펫 하나가 이 인스턴스 하나다. 지형 충돌을 받지 않고
   플레이어 옆을 떠다니다가(그래서 Ent를 상속하지 않는다) 사거리 안에 적이 들어오면
   저 혼자 문다. 죽지 않고 피해도 받지 않는다 — 잃어버리는 재미보다 늘 곁에 있는 쪽이
   장비로서 예측 가능하다. */
class Pet {
  constructor(petId, slot) {
    this.id = petId; this.slot = slot;
    this.def = PETS[petId];
    this.x = 0; this.y = 0;
    this.cd = 0.4 + slot * 0.35;      // 두 마리가 동시에 쏘지 않도록 살짝 어긋나게 시작
    this.t = Math.random() * TAU;
    this.facing = 1;
    this.flash = 0;
  }
  /** 플레이어 기준 떠 있을 자리 — 슬롯마다 반대쪽 어깨 뒤에 선다 */
  anchor(p) {
    const side = this.slot === 0 ? -1 : 1;
    return [p.cx - p.facing * side * 26, p.cy - 16 + Math.sin(this.t * 2.2 + this.slot) * 4];
  }
  update(dt, p) {
    this.t += dt;
    this.cd -= dt;
    if (this.flash > 0) this.flash -= dt;
    const [ax, ay] = this.anchor(p);
    // 부드럽게 따라붙는다. 너무 멀어지면(순간이동·낙하) 그냥 옆으로 끌어다 놓는다
    if (dist2(this.x, this.y, ax, ay) > 640 * 640) { this.x = ax; this.y = ay; }
    this.x = lerp(this.x, ax, Math.min(1, dt * 6));
    this.y = lerp(this.y, ay, Math.min(1, dt * 6));

    const a = this.def.atk;
    if (!a) return;
    let target = null, best = a.range * a.range;
    for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      const d2 = dist2(this.x, this.y, e.cx, e.cy);
      if (d2 < best) { best = d2; target = e; }
    }
    if (!target) return;
    this.facing = target.cx < this.x ? -1 : 1;
    if (this.cd > 0) return;
    this.cd = a.cd;
    this.flash = 0.18;
    // 레벨과 플레이어의 피해 증가를 함께 탄다 — 안 그러면 후반에 장식이 된다
    const dmg = a.dmg * petDmgScale(p.level) * (1 + (p.d.dmgP || 0));
    if (a.k === 'melee') {
      target.hurt(dmg, false, null, 2);
      for (let i = 0; i < 5; i++) G.parts.push(new Part(target.cx, target.cy, this.def.c));
    } else {
      const ang = Math.atan2(target.cy - this.y, target.cx - this.x);
      G.projs.push(new Proj(this.x, this.y, Math.cos(ang) * a.spd, Math.sin(ang) * a.spd, dmg, 'player', a.proj));
    }
  }
}

/* ================= 투사체 ================= */
/* 손그림 이펙트 시트로 대체할 투사체 종류 */
const PROJ_FX = {
  arrow: 'arrow', star: 'arrow',
  fire: 'flame',
  frost: 'frost',
  void: 'void', dark: 'void', soul: 'void',
  wind: 'wind', rune: 'rune'
};
const PROJ_STYLE = {
  arrow: { c: '#d8c898', r: 3, len: 14 },
  star: { c: '#ffe08a', r: 5, glow: 1 },
  bolt: { c: '#8fd8ff', r: 5, glow: 1 },
  fire: { c: '#ff8a3a', r: 6, glow: 1 },
  frost: { c: '#9fe0ff', r: 6, glow: 1 },
  soul: { c: '#c49fff', r: 6, glow: 1 },
  wind: { c: '#bcd8f0', r: 6, glow: 1 },
  rune: { c: '#9fe8d8', r: 6, glow: 1 },
  void: { c: '#a06fff', r: 7, glow: 1 },
  dark: { c: '#9a5fd8', r: 6, glow: 1 },
  bone: { c: '#e8e0c8', r: 5 }
};
class Proj extends Ent {
  constructor(x, y, vx, vy, dmg, team, type) {
    super(x - 6, y - 6, 12, 12);
    this.vx = vx; this.vy = vy; this.dmg = dmg; this.team = team; this.type = type;
    this.life = 3.2; this.grav = 0; this.pierce = 0; this.hitSet = new Set(); this.crit = false;
  }
  update(dt, world, player) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const st = PROJ_STYLE[this.type];
    if (st && st.glow && Math.random() < dt * 30) G.parts.push(new Part(this.cx, this.cy, st.c, 0, 0.3));
    if (world.hitSolid(this.x, this.y, this.w, this.h)) { this.impact(); return; }
    if (this.team === 'player') {
      for (const e of G.ents) {
        if (!(e instanceof Enemy) || e.dead || this.hitSet.has(e)) continue;
        if (!aabb(this.rect(), e.rect())) continue;
        this.hitSet.add(e);
        e.hurt(this.dmg, this.crit, G.player, 3);
        if (this.fire) e.addDot('burn', this.dmg * 0.1, 4);
        if (this.frost) e.slow(0.4, 2.5);
        if (this.poison) e.addDot('poison', this.dmg * 0.11 * this.poison, 5);
        if (this.pierce > 0) this.pierce--; else { this.impact(); return; }
      }
    } else {
      if (aabb(this.rect(), player.rect())) { player.hurt(this.dmg, this.cx); this.impact(); return; }
    }
    if (this.x < 0 || this.x > WW * TS || this.y > WH * TS || this.y < -400) this.dead = true;
  }
  impact() {
    this.dead = true;
    const st = PROJ_STYLE[this.type] || PROJ_STYLE.bolt;
    for (let i = 0; i < 6; i++) G.parts.push(new Part(this.cx, this.cy, st.c));
    if (this.explode) {
      G.aoe(this.cx, this.cy, this.explode, this.dmg * 0.8, 4, st.c);
      for (let i = 0; i < 16; i++) G.parts.push(new Part(this.cx, this.cy, st.c, -20, 0.6));
      G.burst(this.cx, this.cy, this.type === 'void' || this.type === 'dark' ? 'void' : 'fire', this.explode * 2.2);
      G.shake = Math.max(G.shake, 4);
    } else if (this.team === 'player' && this.hitSet.size) {
      G.burst(this.cx, this.cy, 'hit', 36);
    }
  }
}

/* ================= 이펙트 ================= */
class Part {
  constructor(x, y, c, vy0 = 0, life = 0.5) {
    this.x = x; this.y = y; this.c = c;
    const a = Math.random() * TAU, s = 40 + Math.random() * 140;
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s + vy0;
    this.life = life + Math.random() * 0.3; this.max = this.life; this.r = 1.5 + Math.random() * 2;
  }
  update(dt) { this.life -= dt; this.vy += 340 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.96; return this.life > 0; }
}
class DmgText {
  constructor(x, y, v, c, crit) { this.x = x + (Math.random() - 0.5) * 8; this.y = y; this.v = v; this.c = c; this.crit = crit; this.life = 0.85; this.vy = -70; }
  update(dt) { this.life -= dt; this.y += this.vy * dt; this.vy += 110 * dt; return this.life > 0; }
}
class Drop {
  constructor(x, y, item) {
    this.x = x - 8; this.y = y - 8; this.w = 16; this.h = 16; this.item = item;
    this.vx = (Math.random() - 0.5) * 140; this.vy = -160 - Math.random() * 80;
    this.life = 300; this.t = Math.random() * 10; this.pick = 0.5; this.dead = false;
  }
  update(dt, world, player) {
    this.life -= dt; this.pick -= dt; this.t += dt;
    if (this.life <= 0) { this.dead = true; return; }
    const d = dist(this.x, this.y, player.cx, player.cy);
    if (this.pick <= 0 && d < 92) {
      const a = angleTo(this.x, this.y, player.cx, player.cy);
      this.vx = lerp(this.vx, Math.cos(a) * 420, dt * 8); this.vy = lerp(this.vy, Math.sin(a) * 420, dt * 8);
      if (d < 22) {
        if (player.addItem(this.item)) { this.dead = true; G.onPickup(this.item); }
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      return;
    }
    this.vy = clamp(this.vy + GRAV * 0.7 * dt, -900, 700);
    if (!world.hitSolid(this.x + this.vx * dt, this.y, this.w, this.h)) this.x += this.vx * dt; else this.vx = 0;
    if (!world.hitSolid(this.x, this.y + this.vy * dt, this.w, this.h)) this.y += this.vy * dt;
    else { if (this.vy > 0) { this.vx *= 0.7; } this.vy = 0; }
  }
}
