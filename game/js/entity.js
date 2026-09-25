/* ===== entity.js — 아이템 인스턴스 / 플레이어 / 적 / 투사체 ===== */
'use strict';

const GRAV = 2000, MAX_FALL = 1250;
/* ================= 제트팩의 두 한계 ================= */
const JET_MAX_UP = 30;         // 발밑 지면에서 오를 수 있는 한계 (칸)
const JET_BURN = 4.0;          // 이만큼 연속으로 밀면 과열 (초)
const JET_COOL_AIR = 3.0;      // 공중에서 다 식는 시간 (초)
const JET_COOL_GROUND = 1.2;   // 땅을 밟았을 때 (초)
const JET_RESUME = 0.3;        // 과열 뒤 열이 이만큼 내려와야 다시 걸린다
const JET_HIGH_FALL = 140;     // 한계 높이 위에서는 이 속도로 내려온다 (안전 낙하선 938보다 한참 아래)
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
/* 장비 최소 착용 레벨. */
function equipReqLv(id) {
  const d = ITEMS[id];
  if (!d) return 1;
  if (d.lvReq !== undefined) return d.lvReq;
  // 무기는 등급 표에서 뽑는다(WEAPON_TIER_LV 주석 참고).
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
  // 펫 레벨은 패시브를 통째로 키운다 — 펫이 자라는 감각이 여기서 나온다
  if (d.type === 'pet' && (it.lv || 1) > 1) { const m = petLvMul(it.lv); for (const k in s) s[k] *= m; }
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
  if (it.e) n += ' +' + it.e;
  return n;
}
/* 강화 배수. */
function enhMul(it) { return RARITY_MULT[it.r] + 0.05 * (it.e || 0); }
function itemDamage(it) {
  const d = idef(it);
  if (!d.dmg) return 0;
  const s = itemStats(it);
  return d.dmg * enhMul(it) * (1 + (s.dmgP || 0));
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
  const ruin = source === 'ruin';
  const lootTier = ruin ? Math.min(tier, 4) : tier;
  const gold = !ruin && tier >= 6;   // 큰 동굴의 황금 상자만 기존의 고보상을 유지한다
  const spec = CHEST_LOOT[clamp(lootTier, 1, 5)];
  const out = [];
  /* 황금 상자(gold)는 장비 2~3개 · 등급 6까지다 — 재료를 확정·최대 수량으로 주면 하나만 열어도 한 단계를 통째로 건너뛴다 — 사연: docs/code-history.md#h23 */
  const nGear = ruin ? 1 : gold ? rng.int(2, 3) : rng.int(1, 2);
  for (let i = 0; i < nGear; i++) out.push(rollGear(rng.pick(spec.gear), rng, ruin ? 0 : gold ? 6 : tier));
  for (const [id, a, b] of spec.mats) {
    if (!rng.chance(ruin ? 0.48 : gold ? 0.85 : 0.72)) continue;
    const count = rng.int(a, b);
    out.push(makeItem(id, ruin ? Math.max(1, Math.floor(count * 0.6)) : count));
  }
  out.push(makeItem('gold_ore', ruin ? rng.int(1, 2) : rng.int(gold ? 6 : 1, gold ? 11 : 4)));
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
    const liq = opts.aquatic ? { f: 0, flow: 0, cur: 0 } : world.liquidIn(this.x, this.y, this.w, this.h);
    this.submerged = liq.f;
    /* X — 흐르는 물살은 속도가 아니라 **떠밀림**으로 더한다. */
    let nx = this.x + (this.vx + (liq.cur || 0) * 70) * dt;
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
    /* util(유틸리티) 칸 — 산소통처럼 "싸우는 데 쓰는 물건이 아닌데 몸에 지녀야 하는 것"의 자리다 — 사연: docs/code-history.md#h24 */
    this.equip = { weapon: null, helm: null, chest: null, boots: null, acc1: null, acc2: null, util1: null, util2: null, bag: null, pet1: null, pet2: null };
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
    /* 특성 — 비전 방벽이 남긴 흡수량과, 불굴이 다시 준비되기까지의 시간 */
    this.shield = 0; this.shieldMax = 0; this.shieldT = 0; this.undyingCd = 0;
    /* 세션 1 진행 표시 — 장을 끝낼 때마다 곁을 도는 조각이 하나씩 는다 */
    this.starOrbits = 0; this.starLit = 0; this.starFade = 0;
    /* 생활 숙련 — 포인트로 찍지 않고 하다 보면 오른다 */
    this.prof = { farm: { lv: 1, xp: 0 }, fish: { lv: 1, xp: 0 } };
    this.charge = 200;             // 동력 장비용 전하. 바닥나면 가방의 배터리를 자동으로 쓴다
    this.jetHeat = 0; this.jetOver = false; this.jetGap = 0;   // 제트팩의 열·높이 (저장 안 함 — 땅에 닿으면 곧 식는다)
    this.kills = {}; this.mined = {}; this.bossKilled = {}; this.gathered = {};
    this.deepest = 0;
    /* 펫은 장비 아이템(equip.pet1/pet2)이다. */
    this.d = {};
    this.recalc();
    this.hp = this.d.maxHp; this.mp = this.d.maxMp;
  }

  /* ---- 파생 스탯 ---- */
  recalc() {
    const s = { str: this.base.str, dex: this.base.dex, int: this.base.int, vit: this.base.vit };
    const acc = { def: 0, hp: 0, mp: 0, ms: 0, crit: 5, critD: 50, cdr: 0, lifesteal: 0, jump: 0, mpreg: 0, hpreg: 0, dmgP: 0, spdP: 0, magicP: 0, fire: 0, frost: 0, poison: 0, dashCd: 0, dashI: 0, charge: 0, dr: 0 };
    const merge = (o) => { for (const k in o) { if (k in s) s[k] += o[k]; else acc[k] = (acc[k] || 0) + o[k]; } };
    for (const k in this.equip) { const it = this.equip[k]; if (!it) continue; const st = itemStats(it); merge(st); acc.def += (idef(it).def || 0) * enhMul(it); }
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
    /* ★ 체력 재생은 **최대 체력에 비례하는 몫**을 기본으로 깐다 — 사연: docs/code-history.md#h25 */
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
      /* dr — 방어(def)와 달리 적 수치를 타지 않고 **최종 피해**를 그대로 깎는다. */
      dr: Math.min(80, acc.dr || 0),
      glide: acc.glide || 0,
      jet: acc.jet || 0,
      maxCharge: 200 + (acc.charge || 0),
      // 숨 참는 시간(초).
      oxyMax: 14 + (acc.oxyMax || 0),
      // 물 밖에서 숨이 차는 속도 배수 — 심연용 산소통(oxyReg)만 올려 준다
      oxyReg: 1 + (acc.oxyReg || 0)
    };
    if (this.skills.s_titan && this.hp < this.d.maxHp * 0.5) { this.d.dmgP += 0.35; this.d.def += 15; }
    this.hp = Math.min(this.hp, this.d.maxHp); this.mp = Math.min(this.mp, this.d.maxMp);
    this.charge = Math.min(this.charge, this.d.maxCharge);
    this.syncBagCapacity();
  }

  weapon() { return this.equip.weapon; }
  held() { return this.bag[this.sel]; }

  /* ---- 동력 장비의 전하 ---- */
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

  /** 발밑에서 지면까지 몇 칸인가. */
  groundGap(world) {
    if (!world) return 0;
    const fy = Math.floor((this.y + this.h + 1) / TS);
    const x0 = Math.floor(this.x / TS), x1 = Math.floor((this.x + this.w - 1) / TS);
    let best = JET_MAX_UP + 1;
    for (let x = x0; x <= x1; x++)
      for (let dy = 0; dy < best; dy++) {
        const t = TILE_DEF[world.get(x, fy + dy)];
        if (t.solid === 1 || t.solid === 2 || t.liquid) { best = dy; break; }
      }
    return best;
  }

  /** 제트팩 안내 한 줄 — 같은 말이 초당 몇 번씩 뜨지 않게 3초에 한 번만 */
  jetNote(msg, kind) {
    if (G.time - (this._jetNoteAt || -1e9) < 3) return;
    this._jetNoteAt = G.time;
    G.toast(msg, kind);
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
    else if (d.type === 'util') key = this.equip.util1 ? (this.equip.util2 ? 'util1' : 'util2') : 'util1';
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
  /** 낀 펫에게 경험치. */
  addPetXp(n) {
    if (n <= 0) return;
    let up = false;
    for (const k of ['pet1', 'pet2']) {
      const it = this.equip[k];
      if (!it || idef(it).type !== 'pet') continue;
      it.lv = it.lv || 1; it.xp = (it.xp || 0) + n;
      while (it.lv < PET_LV_MAX && it.xp >= petXpNext(it.lv)) {
        it.xp -= petXpNext(it.lv); it.lv++; up = true;
        G.toast(`${idef(it).n} — ${it.lv}레벨이 되었다`, 'good');
      }
      if (it.lv >= PET_LV_MAX) it.xp = 0;
    }
    if (up) { this.recalc(); UI.refreshEquip(); G.sfx('level'); }
  }

  addXp(n) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext; this.level++;
      this.statPts += 3;
      /* 특성 포인트는 레벨마다 하나 — 두 레벨에 하나면 한 분기의 밑동도 못 보고 게임이 끝난다. */
      this.skillPts++;
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
    let dmg = Math.max(1, Math.round(amount * (1 - red) * (1 - (this.d.dr || 0) / 100)));
    /* 비전 방벽이 남아 있으면 먼저 그쪽이 받는다. */
    if (this.shield > 0) {
      const take = Math.min(this.shield, dmg);
      this.shield -= take; dmg -= take;
      G.texts.push(new DmgText(this.cx, this.y - 12, take, '#8fc8ff', 0));
      for (let i = 0; i < 5; i++) G.parts.push(new Part(this.cx, this.cy, '#8fc8ff'));
      if (this.shield <= 0) { this.shield = 0; this.shieldT = 0; G.ringFx(this.cx, this.cy, 44, '#8fc8ff', .35); G.sfx('magic'); }
      if (dmg <= 0) { this.iframe = 0.4; this.flash = 0.18; return; }
    }
    this.hp -= dmg;
    this.iframe = 0.5; this.flash = 0.25;
    G.shake = Math.max(G.shake, Math.min(9, dmg * 0.12));
    G.texts.push(new DmgText(this.cx, this.y, dmg, '#ff6b6b', 0));
    if (srcX !== undefined && !(this.d.dr >= 50)) { this.vx = Math.sign(this.cx - srcX) * 180; this.vy = -180; }
    for (let i = 0; i < 6; i++) G.parts.push(new Part(this.cx, this.cy, '#c8433c'));
    /* ★ 몹이 맞을 때와 같은 소리를 쓰되 **작고 둔하게** 낸다(music.js SFX_FAM 의 hurt_player — hit_flesh 를 0.88배 음높이 · 0.42배 음량으로
       빌린다) — 사연: docs/code-history.md#h26 */
    G.sfx('hurt_player');
    /* 불굴 — 죽는 그 한 번을 넘긴다. */
    if (this.hp <= 0 && this.skills.s_undying && this.undyingCd <= 0) {
      this.hp = 1; this.undyingCd = 120;
      this.heal(this.d.maxHp * 0.25);
      this.iframe = Math.max(this.iframe, 1.2);
      G.ringFx(this.cx, this.cy, 90, '#e05a6a', .6);
      for (let i = 0; i < 30; i++) G.parts.push(new Part(this.cx, this.cy, '#e05a6a', -110, .9));
      // 테두리만 한 번 물든다 — 가운데는 비워 둔다.
      G.edgeFx('200,46,58', SIG_FX.undying.t);
      G.shake = 14; G.toast('불굴 — 아직 쓰러지지 않는다', 'good');
    }
    if (this.hp <= 0) { this.hp = 0; G.onDeath(); }
    this.recalc();
  }

  /* ---- 생활 숙련 ---- */
  addProf(kind, n) {
    const pr = this.prof && this.prof[kind];
    if (!pr || pr.lv >= PROF_MAX) return;
    pr.xp += n;
    while (pr.lv < PROF_MAX && pr.xp >= profNeed(pr.lv)) {
      pr.xp -= profNeed(pr.lv); pr.lv++;
      G.onProfUp(kind, pr.lv);
    }
    if (pr.lv >= PROF_MAX) pr.xp = 0;
  }
  /** 숙련 레벨 (없던 세이브도 1로 읽힌다) */
  profLv(kind) { return (this.prof && this.prof[kind] ? this.prof[kind].lv : 1); }
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
      this.volley = (Player._vol = (Player._vol || 0) + 1);
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.09 : 0);
        this.fireProj(d.proj || 'arrow', a, base, 'dex', BOW_TIP);
      }
      /* 폭풍의 시위 — 가끔 한 발이 더 나간다. */
      if (this.skills.s_tempest && Math.random() < 0.3) {
        this.fireProj(d.proj || 'arrow', ang + (Math.random() - 0.5) * 0.12, base, 'dex', BOW_TIP);
        for (let k = 0; k < 4; k++) G.parts.push(new Part(this.cx, this.cy - 4, '#8fe0c8', -30, .3));
      }
      G.sfx('bow');
    } else if (d.wc === 'magic') {
      const cost = d.mana || 5;
      if (this.mp < cost) { G.toast('마나가 부족하다', 'bad'); this.atkTimer = 0.2; return; }
      this.mp -= cost;
      const n = d.multi || 1;
      this.volley = (Player._vol = (Player._vol || 0) + 1);
      const pt = d.proj || 'bolt';
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.07 : 0);
        this.fireProj(pt, a, base, 'int');
      }
      /* 지팡이 끝의 발화 — 사연: docs/code-history.md#h27 */
      {
        const st = PROJ_STYLE[pt] || PROJ_STYLE.bolt;
        const mx2 = this.cx + Math.cos(ang) * 16, my2 = this.cy - 4 + Math.sin(ang) * 16;
        G.ringFx(mx2, my2, 13, st.c, 0.18);
        for (let i = 0; i < 5; i++) G.parts.push(new Part(mx2, my2, st.c, -10, 0.3));
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
  fireProj(type, ang, base, kind, off) {
    const dmg = this.scaleDmg(base, kind);
    const crit = this.rollCrit();
    const spd = type === 'arrow' ? 760 : type === 'star' ? 900 : 560;
    /* off 가 있으면 그 거리만큼 겨눈 쪽으로 밀어 낸다 — 활 끝에서 화살이 나가게. */
    let ox = 0, oy = -4;
    if (off) {
      const cs = Math.cos(ang), sn = Math.sin(ang);
      let reach = 0;
      for (let t = TS / 2; t <= off; t += TS / 2) {
        if (G.world.solid(Math.floor((this.cx + cs * t) / TS), Math.floor((this.cy + sn * t) / TS))) break;
        reach = t;
      }
      if (reach >= off - TS / 2) reach = off;   // 끝까지 뚫려 있으면 활 끝 그대로
      if (reach > 0) { ox = cs * reach; oy = sn * reach; }
    }
    const p = new Proj(this.cx + ox, this.cy + oy, Math.cos(ang) * spd, Math.sin(ang) * spd, dmg * (crit ? 1 + this.d.critD / 100 : 1), 'player', type);
    p.crit = crit;
    /* 한 번의 발사에서 나간 것끼리 같은 표를 단다 — 같은 적에게 겹쳐 박히는 것을 가려내려는 것이다(data.js MULTI_FALLOFF). */
    p.vol = this.volley;
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
    /* 못 쓰는 것을 눌렀을 때도 **대답은 한다.** — 사연: docs/code-history.md#h28 */
    if ((this.cd[id] || 0) > 0) { G.skillDeny(i); return; }
    if (this.mp < sk.mana) { G.skillDeny(i, '마나가 부족하다'); return; }
    this.mp -= sk.mana;
    this.cd[id] = sk.cd * (1 - this.d.cdr / 100);
    const w = this.weapon();
    const wdmg = w && idef(w).dmg ? itemDamage(w) : 10;
    const ang = angleTo(this.cx, this.cy, mx, my);

    switch (id) {
      case 's_cleave': {
        const dmg = this.scaleDmg(wdmg * sk.v(r) / 100, 'str');
        G.aoe(this.cx, this.cy, 108, dmg, 6, '#ffb24a');
        break;
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
        // 도는 칼선은 채널이 살아 있는 동안 G.drawWhirlArc 가 그린다(여기서 쌓지 않는다)
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
        /* ★ 실제 퍼지는 폭 (±130)과 같은 띠를 깔아 둔다. */
        G.bandFx(mx, my, 130, n * 0.07 + 0.45, '#9fe07a');
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
        /* 마나 45에 재사용 30초인데 늑대가 소리 없이 **그냥 나타났다**(잰 입자 3개). */
        for (let k = 0; k < sk.v(r); k++) {
          const wx = this.cx + (k - 1) * 26;
          G.ents.push(new Wolf(wx, this.cy, this));
          G.sigilFx(wx, this.y + this.h - 6, 22, '#c8b88a');   // 22 — 늑대 간격이 26이라 30은 셋이 한 덩이로 뭉쳤다
          for (let j = 0; j < SIG_FX.wolf.n; j++)
            G.parts.push(new Part(wx + (Math.random() - .5) * 26, this.y + this.h - 8, '#c8b88a', -70, .8));
        }
        break;
      }

      /* ===== 특성 ===== */
      case 's_guard': {
        // 철벽 — 짧게 굳는다.
        this.addBuff('bulwark', sk.v(r));
        G.ringFx(this.cx, this.cy, 52, '#d8a05a', .45);
        for (let k = 0; k < 16; k++) {
          const a = Math.random() * TAU;
          G.parts.push(new Part(this.cx + Math.cos(a) * 22, this.cy + Math.sin(a) * 26, '#d8a05a', -30, .7));
        }
        break;
      }
      case 's_quake': {
        // 좌우로 퍼져 나가는 충격파 — 발밑을 따라 두 갈래로 나간다
        const dmg = this.scaleDmg(wdmg * sk.v(r) / 100, 'str');
        const foot = this.y + this.h;
        for (const dir of [-1, 1]) {
          for (let step = 0; step < 5; step++) {
            G.pending.push({
              t: step * 0.05, fn: () => {
                const x = this.cx + dir * (34 + step * 34);
                G.aoe(x, foot - 14, 40, dmg / 2, 5, '#c8845a', 'frost');
                for (let k = 0; k < 4; k++)
                  G.parts.push(new Part(x + (Math.random() - .5) * 24, foot - 4, '#c8845a', -180, .5));
              }
            });
          }
        }
        G.aoe(this.cx, foot - 14, 60, dmg, 7, '#c8845a', 'frost');
        break;
      }
      case 's_warcry': {
        const dur = sk.v(r);
        this.addBuff('warcry', dur);
        this.addBuff('iron', dur);
        // 함성 자체는 피해가 아니라 밀어내기다 — 붙어 있던 것들을 떼어 낸다
        for (const e of G.ents) {
          if (!(e instanceof Enemy) || e.dead) continue;
          if (dist(this.cx, this.cy, e.cx, e.cy) > 190) continue;
          if (!e.boss) { e.vx += Math.sign(e.cx - this.cx) * 320; e.vy = -180; }
          e.slow(0.3, 3);
        }
        G.ringFx(this.cx, this.cy, 190, '#e8a04a', .5);
        G.ringFx(this.cx, this.cy, 120, '#ffd88a', .35);
        break;
      }
      case 's_pierce': {
        const p = new Proj(this.cx, this.cy - 4, Math.cos(ang) * 900, Math.sin(ang) * 900,
          this.scaleDmg(wdmg * sk.v(r) / 100, 'dex') * (this.rollCrit() ? 1 + this.d.critD / 100 : 1), 'player', 'star');
        p.pierce = 6; p.grav = 0;
        G.projs.push(p);
        for (let k = 0; k < 8; k++) G.parts.push(new Part(this.cx, this.cy - 4, '#9fe07a', -20, .35));
        break;
      }
      case 's_smoke': {
        this.iframe = Math.max(this.iframe, 0.8 + r * 0.15);
        this.addBuff('smokescreen', sk.v(r));
        for (const e of G.ents) {
          if (!(e instanceof Enemy) || e.dead) continue;
          if (dist(this.cx, this.cy, e.cx, e.cy) < 150) e.slow(0.4, 4);
        }
        for (let k = 0; k < 34; k++) {
          const a = Math.random() * TAU, d2 = Math.random() * 60;
          G.parts.push(new Part(this.cx + Math.cos(a) * d2, this.cy + Math.sin(a) * d2, '#b8c8b0', -50, 1.1));
        }
        G.ringFx(this.cx, this.cy, 150, '#b8c8b0', .4);
        break;
      }
      case 's_mark': {
        // 겨눈 자리에서 가장 가까운 적 하나.
        let best = null, bd = 260;
        for (const e of G.ents) {
          if (!(e instanceof Enemy) || e.dead) continue;
          const d2 = dist(mx, my, e.cx, e.cy);
          if (d2 < bd) { bd = d2; best = e; }
        }
        if (!best) { this.cd[id] = 1; this.mp += sk.mana; G.toast('겨눈 곳에 적이 없다', 'bad'); return; }
        best.markT = 10; best.markAmt = sk.v(r) / 100;
        G.ringFx(best.cx, best.cy, best.w + 26, '#e8d05a', .5);
        for (let k = 0; k < 12; k++) G.parts.push(new Part(best.cx, best.y, '#e8d05a', -60, .7));
        break;
      }
      case 's_barrier': {
        this.shieldMax = this.shield = Math.round(sk.v(r) + this.d.int * 3.2);
        this.shieldT = 20;
        G.ringFx(this.cx, this.cy, 48, '#6fb8ff', .5);
        for (let k = 0; k < 20; k++) {
          const a = Math.random() * TAU;
          G.parts.push(new Part(this.cx + Math.cos(a) * 30, this.cy + Math.sin(a) * 34, '#6fb8ff', -40, .8));
        }
        G.toast(`방벽 ${this.shield}`, 'good');
        break;
      }
      case 's_chain': {
        // 첫 표적에서 시작해 가까운 적으로 옮겨 붙는다.
        const hops = sk.v(r);
        const base = this.scaleDmg(60 + this.d.int * 2.4, 'int');
        const hit = new Set();
        let fx = this.cx, fy = this.cy - 4, power = base;
        for (let h = 0; h < hops; h++) {
          let best = null, bd = h === 0 ? 420 : 200;
          for (const e of G.ents) {
            if (!(e instanceof Enemy) || e.dead || hit.has(e)) continue;
            const d2 = h === 0 ? dist(mx, my, e.cx, e.cy) : dist(fx, fy, e.cx, e.cy);
            if (d2 < bd) { bd = d2; best = e; }
          }
          if (!best) break;
          hit.add(best);
          G.boltFx(fx, fy, best.cx, best.cy, '#ffe86a');
          const crit = this.rollCrit();
          best.hurt(power * (crit ? 1 + this.d.critD / 100 : 1), crit, this, 2);
          best.slow(0.25, 1.5);
          fx = best.cx; fy = best.cy; power *= 0.75;
        }
        if (!hit.size) { G.boltFx(this.cx, this.cy - 4, mx, my, '#ffe86a'); }
        break;
      }
      case 's_blink': {
        // 겨눈 쪽으로 최대 190px.
        const maxD = 190, cs = Math.cos(ang), sn = Math.sin(ang);
        let reach = 0;
        for (let t = TS / 2; t <= maxD; t += TS / 2) {
          if (G.world.hitSolid(this.x + cs * t, this.y + sn * t, this.w, this.h)) break;
          reach = t;
        }
        if (reach < TS) { this.cd[id] = 1; this.mp += sk.mana; G.toast('그쪽은 막혀 있다', 'bad'); return; }
        const ox = this.cx, oy = this.cy;
        this.x += cs * reach; this.y += sn * reach;
        this.vy = Math.min(this.vy, 0);
        this.iframe = Math.max(this.iframe, 0.25);
        G.aoe(ox, oy, 78, this.scaleDmg(sk.v(r) + this.d.int * 1.4, 'int'), 4, '#c08fff');
        for (let k = 0; k < 18; k++) {
          G.parts.push(new Part(ox + (Math.random() - .5) * 24, oy + (Math.random() - .5) * 34, '#c08fff', -40, .7));
          G.parts.push(new Part(this.cx + (Math.random() - .5) * 24, this.cy + (Math.random() - .5) * 34, '#c08fff', -40, .7));
        }
        G.boltFx(ox, oy, this.cx, this.cy, '#c08fff');
        break;
      }
      case 's_meteor': {
        // 겨눈 자리에 예고를 띄우고 0.9초 뒤에 떨어진다 — 피할 시간을 주는 대신 크다
        const tx = mx, ty = my;
        G.warnFx(tx, ty, 150, 0.9, '#ffb04a');
        /* ★ 하늘에 있는 동안은 아무것도 가리지 않으므로 여기만은 진하게 둔다. */
        G.fallFx(tx, ty, 0.9, '#ffd07a');
        G.pending.push({
          t: 0.9, fn: () => {
            const dmg = this.scaleDmg(340 + this.d.int * 6.5, 'int');
            G.aoe(tx, ty, 150, dmg, 12, '#ffb04a');
            for (const e of G.ents) if (e instanceof Enemy && !e.dead && dist(tx, ty, e.cx, e.cy) < 150) e.addDot('fire', dmg * 0.06, 5);
            G.ringFx(tx, ty, 150, '#ffb04a', .55);
            G.ringFx(tx, ty, 90, '#fff0c0', .4);
            for (let k = 0; k < 46; k++) {
              const a = Math.random() * TAU, d2 = Math.random() * 140;
              G.parts.push(new Part(tx + Math.cos(a) * d2, ty + Math.sin(a) * d2, k % 3 ? '#ffb04a' : '#fff0c0', -150, 1));
            }
            /* 착탄 섬광 — 바닥에 깔리므로 적을 지우지 않는다. */
            G.flashFx(tx, ty, 230, '#fff0c0');
            const h = SKILL_HIT.meteor;
            G.shake = Math.max(G.shake, h.k); G.hitStop(h.st); G.sfx(h.s);
          }
        });
        break;
      }
    }
    /* 시전의 끝맺음 — 소리·흔들림·멈춤·고리를 SKILL_FX 한 표에서 가져온다. */
    const fx = SKILL_FX[id] || {};
    if (fx.c) G.ringFx(this.cx, this.cy, fx.r || 44, fx.c, .26);
    if (fx.k) G.shake = Math.max(G.shake, fx.k);
    if (fx.st) G.hitStop(fx.st);
    G.sfx(fx.s || 'skill');
  }

  /* ---- 물가로 기어오르기 ---- */
  climbOut(world, dir) {
    if (!world || !dir) return false;
    const step = Math.sign(dir) * (this.w * 0.75 + 2);
    for (let up = 0; up <= 2; up++) {
      const nx = this.x + step, ny = this.y - up * TS;
      if (world.hitSolid(nx, ny, this.w, this.h)) continue;      // 그 자리가 막혀 있다
      if (!world.hitSolid(nx, ny + 3, this.w, this.h)) continue; // 발 디딜 것이 없다
      this.x = nx; this.y = ny;
      this.vy = -190; this.vx = Math.sign(dir) * 90;             // 올라서면서 앞으로 살짝
      this.submerged = 0; this.swimming = false;
      for (let i = 0; i < 6; i++) G.parts.push(new Part(this.cx, this.y + this.h, '#bfe4ff', -40, .5));
      return true;
    }
    return false;
  }

  /* ---- 산소 ---- */
  updateOxygen(dt, world) {
    const max = this.d.oxyMax;
    if (this.oxygen === undefined || this.oxygen > max) this.oxygen = max;
    // 머리 칸이 액체인가 — 몸 전체 비율(submerged)로 보면 목까지 잠겨도 익사한다
    const hx = Math.floor(this.cx / TS), hy = Math.floor((this.y + 4) / TS);
    const ht = world.get(hx, hy);
    let under = !!TILE_DEF[ht].liquid;
    /* 흐르는 얕은 물도 같다. */
    if (under && world.get(hx, hy - 1) === T.AIR && G.surfacePx) under = (this.y + 4) > G.surfacePx(this.cx / TS, hy);
    this.headUnder = under;
    if (under) {
      /* 깊이 압박 — 심해(세션 3)로 내려갈수록 숨이 빨리 닳는다. */
      const lv = world.sea ? world.sea.level : null;
      // 90칸마다 한 배 — 중형·대형 바다는 그만큼 깊으므로 칸 수도 세계 크기(WSY)만큼 늘린다
      const deep = lv === null ? 1 : clamp(1 + Math.max(0, (this.cy / TS) - lv) / (90 * WSY), 1, 4);
      this.oxygen = Math.max(0, this.oxygen - dt * deep);
      this.oxyPressure = deep;
      if (this.oxygen <= 0) {
        this.drownT = (this.drownT || 0) + dt;
        if (this.drownT >= 1) {                                  // 초당 한 번
          this.drownT -= 1;
          /* 익사는 hurt()를 타지 않는다 — 방어력으로 깎이면 안 되고(숨은 갑옷으로 못 막는다), hurt()의 무적 0.5초가 붙으면 물속에서 오히려 무적이 된다. */
          const dmg = Math.max(4, Math.round(this.d.maxHp * 0.06));
          this.hp -= dmg; this.flash = 0.25;
          // 피해 숫자는 다른 피해와 같은 빨강이어야 한다 — 물빛으로 띄우면 회복처럼 읽힌다
          G.texts.push(new DmgText(this.cx, this.y, dmg, '#ff6b6b', 0));
          G.sfx('drown');   // 익사는 다른 피해음과 갈라야 한다 — 막힌 소리
          for (let i = 0; i < 8; i++) G.parts.push(new Part(this.cx, this.y + 6, '#bfe4ff', -50, .6));
          if (this.hp <= 0) { this.hp = 0; G.onDeath('drown'); }   // 익사 — 업적이 원인을 묻는다
        }
      }
      // 숨 방울 — 남은 숨이 적을수록 자주 샌다
      if (Math.random() < dt * (1.5 + (1 - this.oxygen / max) * 5)) {
        G.parts.push(new Part(this.cx + (Math.random() - .5) * 10, this.y + 4, '#dff2ff', -60, .8));
        G.sfx('bubble');   // SFX_GAP이 0.45초로 묶어 두어 방울마다 울리지는 않는다
      }
    } else {
      this.drownT = 0;
      this.oxygen = Math.min(max, this.oxygen + dt * 6 * (this.d.oxyReg || 1));   // 물 밖에서는 빠르게 찬다
    }
  }

  /* ---- 업데이트 ---- */
  update(dt, world, input) {
    const d = this.d;
    // 타이머
    this.atkTimer -= dt; this.swing -= dt; this.dashCd -= dt; this.iframe -= dt;
    this.hurtCd -= dt; this.flash -= dt; this.potionCd -= dt;
    if (this.chargeT > 0) this.chargeT -= dt;
    if (this.undyingCd > 0) this.undyingCd = Math.max(0, this.undyingCd - dt);
    if (this.shieldT > 0) { this.shieldT -= dt; if (this.shieldT <= 0) { this.shieldT = 0; this.shield = 0; } }
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - dt);
    for (let i = this.buffs.length - 1; i >= 0; i--) { this.buffs[i].t -= dt; if (this.buffs[i].t <= 0) { this.buffs.splice(i, 1); this.recalc(); } }

    // 재생
    this.mp = Math.min(d.maxMp, this.mp + d.mpreg * dt);
    if (this.hurtCd <= 0) this.hp = Math.min(d.maxHp, this.hp + d.hpreg * dt);

    /* 들어가는 값과 나오는 값을 갈라 둔다(히스테리시스) — 사연: docs/code-history.md#h29 */
    const sub = this.submerged || 0;
    /* 물에 들고 나는 순간에만 첨벙. */
    const wasSwim = this.swimming;
    this.swimming = this.swimming ? sub > 0.25 : sub > 0.35;
    if (this.swimming !== wasSwim && G.sfx) G.sfx('splash');
    this.updateOxygen(dt, world);

    // 이동 — 물속(헤엄)은 아래 '헤엄' 절이 따로 맡는다
    const acc = this.onGround ? 2400 : 1500;
    let want = 0;
    if (input.left) want -= 1; if (input.right) want += 1;
    if (this.channel) want *= 0.4;
    if (this.swimming) {
      if (want !== 0 && (!this.swing || !this.channel)) this.facing = Math.sign(want);
    } else if (want !== 0) {
      this.vx += want * acc * dt;
      this.vx = clamp(this.vx, -d.ms * (this.dashV > 0 ? 3 : 1), d.ms * (this.dashV > 0 ? 3 : 1));
      if (!this.swing || !this.channel) this.facing = want;
    } else {
      const fr = this.onGround ? 2600 : 700;
      if (Math.abs(this.vx) < fr * dt) this.vx = 0; else this.vx -= Math.sign(this.vx) * fr * dt;
    }
    this.dashV = Math.max(0, this.dashV - dt);

    // 점프 / 헤엄 — 물에 잠겨 있으면 점프가 발차기가 된다.
    const inWater = this.swimming;
    // 입수 엣지 — 잠기기 시작하는 그 프레임에 한 번만 첨벙 소리(계속 잠겨 있는 동안은 안 울림)
    if (inWater && !this.wasInWater) G.sfx('splash');
    this.wasInWater = inWater;
    if (this.onGround || inWater) this.jumpsLeft = d.jumps;
    if (!inWater) { this.floating = false; this.swimMove = false; }
    if (inWater) {
      /* 수면에 떠 있기 — 아무것도 안 누르면 머리를 내민 채 **물결을 따라** 오르내린다 — 사연: docs/code-history.md#h30 */
      this.floating = false;
      if (!input.jump && !input.down) {
        const hx = this.cx / TS, sr = world.surfaceRow(Math.floor(hx), Math.floor((this.y + 6) / TS) + 1, 3);
        if (sr >= 0 && G.surfacePx) {
          this.floating = true;
          const want = G.surfacePx(hx, sr) - 14;             // 목까지 잠기고 머리가 나온다
          this.vy = lerp(this.vy, clamp((want - this.y) * 6, -160, 160), dt * 6);
        }
      }
      // 물가로 기어오르기 — 이게 없으면 좁은 웅덩이에서 영영 못 나온다
      const climbed = input.jump && !this.jumpHeld && this.climbOut(world, want || this.facing);
      /* --- 헤엄 --- */
      let ix = want, iy = (input.down ? 1 : 0) - (input.jump ? 1 : 0);
      if (this.floating && iy < 0) iy = 0;                  // 수면에서는 위로 저어 봐야 허공이다
      const mag = Math.hypot(ix, iy);
      if (mag) { ix /= mag; iy /= mag; }
      this.swimPh = ((this.swimPh || 0) + dt * (mag ? 1.5 : 0.35)) % 1;
      const beat = 0.35 + 0.65 * Math.max(0, Math.sin(this.swimPh * TAU));
      const T = 1350 * beat;
      this.vx += ix * T * dt;
      this.vy += iy * T * dt;
      const vref = d.ms * 0.75;
      const sp = Math.hypot(this.vx, this.vy);
      const drag = Math.min(0.9, (0.6 + 2.4 * sp / vref) * dt);
      this.vx -= this.vx * drag; this.vy -= this.vy * drag;
      if (this.floating && input.jump && !this.jumpHeld && !climbed) {
        this.vy = -430; this.floating = false;                 // 물을 박차고 뛰어오르기
        for (let i = 0; i < 10; i++) G.parts.push(new Part(this.cx, this.y + this.h * .6, '#dff2ff', -120, .5));
        G.sfx('splash');
      }
      this.swimMove = mag > 0 || sp > 60;
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
    /* 제트팩 — 공중에서 점프를 누르고 있는 동안 떠오른다 — 사연: docs/code-history.md#h32 */
    this.jetting = false;
    /* 발밑 지면에서 얼마나 떠 있나 — 30칸을 넘으면 더 오르지 못한다(위 JET_MAX_UP 주석) */
    this.jetGap = d.jet ? this.groundGap(world) : 0;
    /* 한계 높이를 **딱 끊지 않고 서서히 힘이 빠지게** 한다. */
    const room = d.jet ? clamp((JET_MAX_UP + 1 - this.jetGap) / 4, 0, 1) : 1;
    const tooHigh = d.jet && this.jetGap >= JET_MAX_UP;
    if (d.jet && input.jump && !this.onGround && !inWater && !this.jetOver) {
      if (this.jetOk === undefined) { this.jetT = 0; this.jetOk = this.useCharge(6); }
      else {
        this.jetT = (this.jetT || 0) + dt;
        if (this.jetT >= 0.25) { this.jetT -= 0.25; this.jetOk = this.useCharge(6); }
      }
      if (this.jetOk) {
        /* 오를 수 있는 속도 — 한계 높이에 가까울수록 -330에서 +140(천천히 내려오는 속도)으로 옮겨 간다. */
        const cap = -330 * room + JET_HIGH_FALL * (1 - room);
        if (this.vy > cap) this.vy = Math.max(this.vy - 2400 * dt, cap);
        this.jetting = true;
        if (Math.random() < dt * 30)
          G.parts.push(new Part(this.cx + (Math.random() - .5) * 10, this.y + this.h,
                                tooHigh ? '#8a7a6a' : '#ffb04a', 60, 0.35));
        if (tooHigh) this.jetNote('여기서 더 오르지 못한다 — 발밑에서 30칸이 한계다');
      }
    } else { this.jetT = 0; this.jetOk = undefined; }
    /* 열 — **밀어 올릴 때만** 오른다. */
    if (d.jet) {
      if (this.jetting && !tooHigh) {
        this.jetHeat = Math.min(1, (this.jetHeat || 0) + dt / JET_BURN);
        if (this.jetHeat >= 1 && !this.jetOver) {
          this.jetOver = true; this.jetting = false;
          this.jetNote('추진기가 과열됐다 — 식을 때까지 꺼진다', 'bad');
          G.sfx('power_off');
          for (let i = 0; i < 10; i++)
            G.parts.push(new Part(this.cx + (Math.random() - .5) * 12, this.y + this.h, '#6a6a72', -10, .6));
        }
      } else if (this.jetHeat > 0) {
        this.jetHeat = Math.max(0, this.jetHeat - dt / (this.onGround ? JET_COOL_GROUND : JET_COOL_AIR));
        if (this.jetOver && this.jetHeat <= JET_RESUME) this.jetOver = false;
      }
    } else { this.jetHeat = 0; this.jetOver = false; }

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
    // 수면에 떠 있는 동안은 중력을 끈다 — 끄지 않으면 부력 용수철이 중력과 비겨 몸이 14px 낮게 뜬다 수면에 떠 있으면 중력 0, 잠겨 헤엄치면 거의 뜨는 몸(0.3
    this.move(dt, world, { dropThrough: !!input.down, gravMul: this.floating ? 0 : this.swimming ? 0.3 : undefined });
    /* 물에 빠지면 안 다친다(폭포 아래 웅덩이가 착지 지점이 되어 주는 게 이 지형의 요점). */
    if (!wasOnGround && this.onGround && !this.gliding && !this.jetting && (this.submerged || 0) <= 0.2) {
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
        if (aabb(this.rect(), e.rect())) { this.chargeHit.add(e); e.hurt(this.chargeDmg, this.rollCrit(), this, 14, hitFam(this.weapon())); }
      }
    }
    // 채널링
    if (this.channel) {
      this.channel.t -= dt; this.channel.tick -= dt;
      if (this.channel.tick <= 0) {
        this.channel.tick = 0.28;
        G.aoe(this.cx, this.cy, 96, this.channel.dmg * 0.28, 3, '#ffcf6a');
        /* 도는 동안 박자마다 운다. */
        G.sfx('sk_whirl', G.strokeRate());
        G.shake = Math.max(G.shake, 3);
        /* 발밑 먼지 — 박자에만 세 개다. */
        const foot = this.y + this.h;
        for (let k = 0; k < SIG_FX.whirl.n; k++)
          G.parts.push(new Part(this.cx + (Math.random() - .5) * 70, foot - 4, '#c8a878', -40, .5));
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
        e.hurt(this.scaleDmg(base, 'str'), crit, this, kb, hitFam(w));
        if (this.d.fire) e.addDot('burn', this.scaleDmg(base, 'str') * 0.12 * this.d.fire, 4);
        if (this.d.frost) e.slow(0.45, 2.5);
        if (this.d.poison) e.addDot('poison', this.scaleDmg(base, 'str') * 0.13 * this.d.poison, 5);
      }
    }

    // 용암/가시/선인장 등 환경 피해 — 몸 전체 범위로 검사해야 고체 블록(선인장)도 스치기만 해도 걸린다
    const tx = Math.floor(this.cx / TS), ty = Math.floor(this.cy / TS);
    const hurt = world.hurtInRect(this.x, this.y, this.w, this.h);
    if (hurt && this.iframe <= 0) { this.hurt(hurt); this.hurtCd = 3; }
    /* 깊이·고도 기록이 **실제로 갱신될 때만** 업적을 본다. */
    const d0 = this.deepest, h0 = this.highest;
    this.deepest = Math.max(this.deepest, ty);
    this.highest = Math.min(this.highest === undefined ? ty : this.highest, ty);
    if (G.checkAch && (this.deepest !== d0 || this.highest !== h0)) G.checkAch();
  }
}

/* ================= 적 ================= */
class Enemy extends Ent {
  constructor(type, x, y, scale = 1) {
    const d = ENEMIES[type];
    super(x, y, d.w, d.h);
    this.type = type; this.def = d;
    /* 세 가지 배수가 한자리에서 곱해진다. */
    const sc = d.boss ? 1 : scale;
    this.lvFactor = (!d.boss && d.lvScale && typeof G !== 'undefined' && G.player)
      ? levelMult(G.player.level, d.lvScale) : 1;
    const lf = this.lvFactor;
    const md = (typeof G !== 'undefined' && G.modeMul) ? G.modeMul() : 1;
    this.maxHp = Math.round(d.hp * sc * lf * md); this.hp = this.maxHp;
    this.dmg = d.dmg * sc * lf * md; this.armor = d.def * sc;
    this.spd = d.spd; this.xp = Math.round(d.xp * sc * lf); this.gold = Math.round(d.gold * sc * lf);
    this.boss = !!d.boss;
    this.aggro = d.aggro || 460;   // 인지 사정거리(px) — 이 밖에서는 추격하지 않는다
    this.flash = 0; this.atkCd = 0; this.jumpCd = 0; this.think = 0;
    /* 공격 포즈를 띄워 둘 시간 — 사연: docs/code-history.md#h33 */
    this.atkPose = 0;
    this.lastPhase = 0;
    this.slowT = 0; this.slowF = 1; this.dots = [];
    /* 페이즈 수는 보스마다 다르다(ENEMIES 의 ph) — 사연: docs/code-history.md#h34 */
    this.phases = d.ph || 3;
    this.phase = 0; this.pf = 0; this.state = 0; this.stateT = 0;
    this.facing = -1;
    this.hitCd = 0;
    this.markT = 0; this.markAmt = 0;   // 사냥꾼의 표식
    this.mech = 0;                      // 개조된 개체(세션 2) — makeMech() 가 켠다
    /* 힘 축적(BOSS_SURGE). */
    this.sgT = 0; this.sgCd = 6; this.sgTook = 0; this.sgBuf = 0; this.sgRing = 0; this.sgStun = 0;
  }

  /** 개조 — 세션 2 에서 이 몹이 기계가 되어 나온다. */
  makeMech(mul) {
    this.mech = 1;
    this.maxHp = Math.round(this.maxHp * mul); this.hp = this.maxHp;
    this.dmg *= mul; this.armor *= mul;
    this.xp = Math.round(this.xp * mul); this.gold = Math.round(this.gold * mul);
    this.sparkT = 0;
    return this;
  }
  /** 지금이 마지막 페이즈인가. */
  lastPh() { return this.phase >= this.phases - 1; }

  /* ================= 힘 축적 (BOSS_SURGE) ================= */
  tickSurge(dt, world, p) {
    const S = BOSS_SURGE[this.type];
    if (!S) return false;
    const fly = SURGE_FLY[this.def.ai] ? { gravMul: 0 } : undefined;

    // 버프가 걸려 있는 동안 — 시간이 다 되면 올려 둔 수치를 **정확히 되돌린다**
    if (this.sgBuf > 0) {
      this.sgBuf -= dt;
      if (this.sgBuf <= 0) this.endBuff();
      else if (Math.random() < dt * 14)
        G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.y + this.h, S.c, -40, .6, { g: -.3, glow: 1 }));
    }

    // 끊겨서 비틀거리는 중 — 아무것도 못 한다.
    if (this.sgStun > 0) {
      this.sgStun -= dt;
      this.vx *= 0.86;
      if (Math.random() < dt * 10)
        G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.cy, '#c8c0a8', -30, .5));
      this.move(dt, world, fly);
      return true;
    }

    // 모으는 중
    if (this.sgT > 0) {
      this.sgT -= dt;
      const k = 1 - this.sgT / S.t;                 // 0 -> 1 로 차오른다
      /* 제자리에 선다. */
      this.vx *= 0.82; if (fly) this.vy *= 0.82;
      /* 조여드는 고리. */
      this.sgRing -= dt;
      if (this.sgRing <= 0) {
        this.sgRing = 0.34 - k * 0.16;
        G.sigilFx(this.cx, this.cy, this.w * 0.9 + 26 - k * 22, S.c);
      }
      // 안으로 빨려 들어가는 티끌 — 바깥에서 나서 보스 쪽으로 간다
      if (Math.random() < dt * (26 + k * 34)) {
        const a = Math.random() * TAU, r = this.w * 1.5 + 30 + Math.random() * 40;
        const pt = new Part(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, S.c, 0, .42, { g: 0, glow: 1, drag: 1 });
        pt.vx = -Math.cos(a) * r * 2.1; pt.vy = -Math.sin(a) * r * 2.1;
        G.parts.push(pt);
      }
      this.move(dt, world, fly);
      if (this.sgT <= 0) this.releaseSurge(S, p);
      return true;
    }

    // 쉬는 중 — 첫 페이즈에는 안 나온다(새 규칙은 형태가 한 번 바뀐 뒤에 온다)
    this.sgCd -= dt;
    /* ★ phaseInv 는 0 에서 멈추지 않고 **살짝 음수로 남는다**(-0.01 로 관측). */
    if (this.sgCd <= 0 && this.phase >= 1 && this.phaseInv <= 0 && dist(this.cx, this.cy, p.cx, p.cy) < 760) {
      this.sgT = S.t; this.sgTook = 0; this.sgRing = 0;
      G.bossLine(this.def.n, S.n);
      G.sfx('sk_charge');
      G.ringFx(this.cx, this.cy, this.w * 2.2, S.c, .5);
      return true;
    }
    return false;
  }

  /** 다 모았다 — 종류대로 터뜨린다 */
  releaseSurge(S, p) {
    this.sgCd = S.cd;
    /* ★ 앞의 버프가 아직 살아 있으면 먼저 내린다. */
    if (this.sgBuf > 0) this.endBuff();
    G.ringFx(this.cx, this.cy, this.w * 2.6, S.c, .55);
    G.shake = Math.max(G.shake, 12);
    for (let i = 0; i < 24; i++)
      G.parts.push(new Part(this.cx, this.cy, S.c, -50, .8, { glow: 1, spd: 1.6 }));
    if (S.k === 'nova') {
      // 사방으로.
      const n = S.v, base = Math.random() * TAU;
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * TAU;
        G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 300, Math.sin(a) * 300, this.dmg * 0.7, 'enemy', S.pj));
      }
      G.sfx(S.s || 'sk_frost');
    } else if (S.k === 'ward') {
      this.armor += S.v; this.sgBuf = S.dur; this.sgKind = 'ward'; this.sgAmt = S.v;
      G.toast(`${this.def.n} — ${S.m}`, 'bad');
    } else if (S.k === 'rage') {
      this.sgKind = 'rage'; this.sgAmt = S.v; this.sgBuf = S.dur;
      this.dmg *= 1 + S.v; this.spd *= 1 + S.v * 0.5;
      G.toast(`${this.def.n} — ${S.m}`, 'bad');
    } else if (S.k === 'mend') {
      const heal = Math.round(this.maxHp * S.v);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      G.texts.push(new DmgText(this.cx, this.y - 10, '+' + fmt(heal), '#9ff09f', 0));
    }
  }

  /** 끊겼다 — 모으던 것이 흩어지고 비틀거린다 */
  breakSurge() {
    this.sgT = 0; this.sgCd = (BOSS_SURGE[this.type] || {}).cd || 14;
    this.sgStun = 1.4;
    G.toast('모으던 것이 흩어졌다', 'good');
    G.sfx('sk_deny'); G.shake = Math.max(G.shake, 10);
    for (let i = 0; i < 20; i++)
      G.parts.push(new Part(this.cx, this.cy, '#c8c0a8', -40, .7, { spd: 1.4 }));
  }

  /** 버프가 끝났다 — 올려 둔 수치를 **정확히** 되돌린다(배수를 두 번 곱하지 않게) */
  endBuff() {
    this.sgBuf = 0;
    if (this.sgKind === 'ward') this.armor -= this.sgAmt;
    else if (this.sgKind === 'rage') { this.dmg /= 1 + this.sgAmt; this.spd /= 1 + this.sgAmt * 0.5; }
    this.sgKind = null; this.sgAmt = 0;
  }
  addDot(kind, dps, dur) { this.dots.push({ kind, dps, t: dur }); }
  slow(f, t) { this.slowF = Math.min(this.slowF, 1 - f); this.slowT = Math.max(this.slowT, t); }

  /** fam 은 물리 타격 그림 계열('slash'·'pierce'·'blunt'). */
  hurt(amount, crit, src, kb, fam) {
    if (this.dead) return;
    /* 페이즈가 넘어가는 0.8초 동안은 피해가 들어가지 않는다. */
    if (this.phaseInv > 0) {
      G.texts.push(new DmgText(this.cx, this.y - 4, '전환 중', '#9fd4ff', 0));
      return;
    }
    /* 굳어 있을 때(guard) — 약점이 드러나기 전에는 거의 통하지 않는다. */
    if (this.guard) {
      amount *= 0.12;
      if (Math.random() < 0.5) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 20, this.y - 10, '막혔다', '#8d8874', 0));
    }
    const red = this.armor / (this.armor + 70);
    // 사냥꾼의 표식 — 출처를 가리지 않는다.
    if (this.markT > 0) amount *= 1 + (this.markAmt || 0);
    let dmg = Math.max(1, Math.round(amount * (1 - red)));
    this.hp -= dmg; this.flash = 0.12;
    /* 모으는 중에 맞은 것을 쌓는다 — brk 를 넘기면 끊긴다. */
    if (this.sgT > 0) {
      const S = BOSS_SURGE[this.type];
      this.sgTook += dmg;
      if (S && this.sgTook >= this.maxHp * S.brk) this.breakSurge();
    }
    G.texts.push(new DmgText(this.cx + (Math.random() - 0.5) * 14, this.y - 4, dmg, crit ? '#ffd24a' : '#fff', crit ? 1 : 0));
    // 재질 파편 + 재질 타격음(한 획마다 음높이가 다르다) + 무기 계열 한 겹.
    G.hitFx(this, this.cx, this.cy, crit, fam);
    /* 맞는 그림. */
    if (fam && HIT_FX[fam]) {
      const s = HIT_FX[fam];
      G.burst(this.cx, this.cy - 2, 'hit_' + fam + (crit ? '_crit' : ''),
        s.size * (crit ? 1.3 : 1), s.slow);
    }
    if (src instanceof Player) {
      if (src.d.lifesteal > 0) src.heal(dmg * src.d.lifesteal / 100);
      src.hurtCd = Math.max(src.hurtCd, 0.6);
    }
    if (kb && !this.boss) { this.vx += Math.sign(this.cx - (src ? src.cx : this.cx)) * kb * 26; this.vy = -kb * 12; }
    else if (kb && this.boss) this.vx += Math.sign(this.cx - (src ? src.cx : this.cx)) * kb * 3;
    if (this.def.passive) this.fleeT = 2.2;
    /* 맞는 소리는 hitFx 가 재질에 맞춰 낸다 — 여기서 'damage' 를 또 울리면 무엇을 때리든 같은 소리가 한 겹 덮여 재질이 안 갈린다. */
    if (this.hp <= 0) this.die(src);
  }
  die(src) {
    if (this.dead) return;
    this.dead = true;
    const p = G.player;
    // 붉은 달 같은 이벤트 중에는 위험한 만큼 보상도 오른다
    const mult = G.killMult ? G.killMult() : 1;
    p.addXp(Math.round(this.xp * mult)); p.gold += Math.round(this.gold * mult);
    p.addPetXp(Math.round(this.xp * mult * PET_XP_SHARE));
    p.kills[this.type] = (p.kills[this.type] || 0) + 1;
    if (this.boss) p.bossKilled[this.type] = true;
    const rng = G.rng;
    for (const [id0, ch, a, b] of (this.def.drops || [])) {
      if (!rng.chance(ch)) continue;
      /* 개조된 것에서는 부품만 나온다 — 원래 표에 얹지 않고 **바꿔친다**. 얹으면 개조된 쪽이 그냥 더 좋은 사냥감이 되어 세기 1.5배를 치르고도 이득이 남는다. */
      const id = (this.mech && typeof MECH_PART !== 'undefined') ? MECH_PART : id0;
      const n = rng.int(a, b);
      if (ITEMS[id] && (ITEMS[id].stack || 1) > 1) G.drops.push(new Drop(this.cx, this.cy, makeItem(id, n)));
      else for (let k = 0; k < n; k++) G.drops.push(new Drop(this.cx, this.cy, rollGear(id, rng, this.boss ? 3 : 0)));
    }
    /* 쓰러지는 그림을 남긴다 — 사연: docs/code-history.md#h35 */
    G.addCorpse(this);
    G.deathBurst(this);
    if (this.boss) { G.shake = 18; G.onBossDown(this.type); }
    if (p.skills.s_hunter) p.addBuff('swift_kill', 3);
    G.onKill(this.type);
    G.sfx(this.boss ? 'bossdie' : 'die');
  }

  update(dt, world, player) {
    this.atkPose -= dt;
    this.flash -= dt; this.atkCd -= dt; this.jumpCd -= dt; this.hitCd -= dt;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowF = 1; }
    if (this.markT > 0) {
      this.markT -= dt;
      if (this.markT > 0 && Math.random() < dt * 5)
        G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.y - 6, '#e8d05a', -24, .5));
    }
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
      // 물속 생물 — 물 밖으로는 못 나간다.
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
    } else if (AI === 'flotsam') {
      /* 바다 부유물 — 수면에 떠서 물결(G.surfacePx — 파도를 그리는 식)을 따라 오르내리고, 제 방향으로 천천히 흘러간다. */
      if (this.drift === undefined) this.drift = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 10);
      const hx = this.cx / TS;
      const sr = world.surfaceRow(Math.floor(hx), Math.floor((this.y + this.h * 0.8) / TS), 4);
      if (sr >= 0 && G.surfacePx) {
        const want = G.surfacePx(hx, sr) - this.h * 0.55;
        this.vy = lerp(this.vy, (want - this.y) * 5, dt * 6);
      } else this.vy = Math.min(this.vy + 900 * dt, 400);   // 물 밖으로 튕겼다 — 떨어져 물로 돌아간다
      const ahead = Math.floor((this.cx + Math.sign(this.drift) * (this.w / 2 + 6)) / TS);
      if (this.hitWall || !world.liquid(ahead, sr >= 0 ? sr : Math.floor(this.cy / TS)) || ahead >= SEA_X1 - 2) this.drift = -this.drift;
      this.vx = lerp(this.vx, this.drift, dt * 1.2);
      // 기울기 — 이웃한 물결 높이 차로 몸을 기울인다(그리는 쪽이 쓴다)
      if (sr >= 0 && G.surfacePx) this.tilt = Math.atan2(G.surfacePx(hx + 0.6, sr) - G.surfacePx(hx - 0.6, sr), TS * 1.2);
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

  /* ---- 페이즈가 바뀌는 순간 ---- */
  onPhaseChange(ph, world, p) {
    this.phaseInv = 0.8;
    this.guard = 0;
    G.shake = Math.max(G.shake, 11);
    for (let i = 0; i < 26; i++) {
      G.parts.push(new Part(this.cx + (Math.random() - 0.5) * this.w,
                            this.cy + (Math.random() - 0.5) * this.h,
                            i % 3 ? this.def.c : '#ffe08a', -120, 0.9));
    }
    G.ringFx(this.cx, this.cy, Math.max(this.w, this.h) * 1.6, '#ffe08a', .55);
    G.sfxAt('chapter', this.cx / TS, this.cy / TS);

    const line = (BOSS_LINES[this.type] || {})[ph];
    if (line) G.bossLine(this.def.n, line);

    /* 보스마다 이 순간에 켜지는 규칙. */
    const lock = this.phases >= 5 ? this.phases - 2 : this.phases - 1;
    switch (this.def.ai) {
      case 'b_slime':
        // 2페이즈 — 껍데기가 굳는다.
        if (ph >= lock) { this.guard = 1; this.openT = 0; }
        break;
      case 'b_witch':
        /* 2페이즈 — 바닥이 언다. */
        if (ph >= lock) { this.iceFloor = 1; this.layHeat(world, p); }
        break;
      case 'b_prolif': if (ph >= lock) this.guard = 1; break;      // 핵만 약점
      case 'b_hepha':  if (ph >= lock) this.guard = 1; break;      // 정지 핵을 써야 열린다
      case 'b_arche':
        /* 받침대를 깨야 열린다 — 그런데 방에 받침대가 없으면 규칙이 걸리지도 않는다. */
        if (ph >= lock) { this.guard = 1; this.raisePedestals(); }
        break;
      case 'b_overseer': if (ph >= 1) this.term = 0; break;
    }
  }

  /** 원형 2페이즈 — 받침대 넷. */
  raisePedestals() {
    /* 살아남은 받침대를 먼저 치운다. */
    for (const e of G.ents) if (e.pedestal && !e.dead) { e.dead = true; e.hp = 0; }
    for (let i = 0; i < 4; i++) {
      const e = new Enemy('draft_form', this.cx + (i - 1.5) * 96, this.cy - 10, 1);
      e.pedestal = 1; e.maxHp = Math.round(e.maxHp * 0.35); e.hp = e.maxHp;
      e.spd = 0;                               // 받침대다. 쫓아오지 않는다
      G.ents.push(e);
    }
    G.toast('받침대 넷이 그것을 붙들고 있다', 'bad');
  }

  /* 서리 마녀 2페이즈 — 발밑에 설 수 있는 자리를 만들어 준다. */
  layHeat(world, p) {
    const fy = Math.floor((this.y + this.h + 4) / TS);
    for (const off of [-9, 0, 9]) {
      const tx = Math.floor(this.cx / TS) + off;
      for (let y = fy; y < fy + 4; y++) {
        if (world.solid(tx, y + 1) && world.get(tx, y) === T.AIR) { world.set(tx, y, T.TORCH); break; }
      }
    }
    G.toast('바닥이 언다 — 불 옆에 서라', 'bad');
  }

  /** 매 프레임 도는 약점·장판 규칙. */
  tickWeak(dt, world, p) {
    // 껍데기가 벌어지는 시간 — 그동안만 피해가 제대로 들어간다
    if (this.openT > 0) { this.openT -= dt; if (this.openT <= 0) this.guard = 1; }
    if (!this.iceFloor) return;
    /* 서리 장판 — 발밑 세 칸 안에 열원(횃불·용암)이 없으면 얼어붙는다. */
    this.iceCd = (this.iceCd || 0) - dt;
    if (this.iceCd > 0) return;
    this.iceCd = 0.5;
    const tx = Math.floor(p.cx / TS), ty = Math.floor((p.y + p.h - 2) / TS);
    let warm = false;
    for (let x = tx - 2; x <= tx + 2 && !warm; x++)
      for (let y = ty - 2; y <= ty + 2; y++) {
        const t = world.get(x, y);
        if (t === T.TORCH || t === T.LAVA) { warm = true; break; }
      }
    if (warm) return;
    p.addBuff('frostbite', 1.2);
    p.hurt(this.dmg * 0.18);
    for (let i = 0; i < 4; i++) G.parts.push(new Part(p.cx, p.cy, '#9fe0ff', -30, .5));
  }

  /* ---- 보스 AI ---- */
  bossAI(dt, world, p, dx, dy, dd) {
    const AI = this.def.ai;
    this.stateT -= dt;
    const hpr = this.hp / this.maxHp;
    /* ★ pf 를 같이 둔다 — 0(첫 페이즈)에서 1(마지막)까지의 **비율**이다 — 사연: docs/code-history.md#h36 */
    const nph = this.phases;
    this.phase = Math.min(nph - 1, Math.floor((1 - hpr) * nph));
    this.pf = nph > 1 ? this.phase / (nph - 1) : 0;
    /* 페이즈가 올라가는 순간을 연출로 알린다. */
    if (this.phase > this.lastPhase) {
      this.lastPhase = this.phase;
      this.phaseT = 0.7;
      this.onPhaseChange(this.phase, world, p);
    }
    this.phaseT = (this.phaseT || 0) - dt;
    if (this.phaseInv > 0) this.phaseInv -= dt;
    this.tickWeak(dt, world, p);

    /* 힘 축적 — 모으는 중이면 여기서 돌아선다. */
    if (this.tickSurge(dt, world, p)) { this.stateT += dt; return; }

    if (AI === 'b_slime') {
      if (this.onGround) {
        this.vx *= 0.86;
        /* 2페이즈 — 껍데기가 굳는다(onPhaseChange 에서 guard=1). */
        if (this.lastPh() && this.landT !== 1) {
          this.landT = 1; this.guard = 0; this.openT = 0.9;
          G.ringFx(this.cx, this.cy, this.w * 0.9, '#9fe0ff', .4);
        }
        if (this.jumpCd <= 0) {
          this.landT = 0;
          /* 2페이즈는 일부러 느리게 뛴다. */
          this.jumpCd = this.lastPh() ? 2.2 : 1.5 - this.pf * 0.7;
          this.vy = -680 - this.pf * 120;
          this.vx = Math.sign(dx) * (200 + this.pf * 140);
          if (Math.random() < 0.35 + this.pf * 0.4) {
            for (let i = 0; i < 2 + this.pf * 2; i++) {
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
        if (this.state === 2) for (let i = 0; i < 2 + this.pf * 2; i++) G.ents.push(new Enemy(Math.random() < .5 ? 'skeleton' : 'archer', this.cx + (Math.random() - 0.5) * 200, this.cy - 30, G.scale()));
      }
      if (this.state === 0) {           // 추격
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd, dt * 3);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.6, dt * 3);
      } else if (this.state === 1) {    // 뼈 투척
        this.vx *= 0.94; this.vy = lerp(this.vy, -20, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.35 - this.pf * 0.12;
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
        if (this.state === 2) for (let i = 0; i < 1 + this.pf * 2; i++) G.ents.push(new Enemy('shadoweye', this.cx + (Math.random() - 0.5) * 220, this.cy, G.scale()));
      }
      if (this.state === 0) {
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 0.7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 0.7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 1.1 - this.pf * 0.5;
          const n = 8 + this.pf * 8;
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
          for (let i = 0; i < 1 + this.pf * 2; i++) G.ents.push(new Enemy('frostling', this.cx + (Math.random() - 0.5) * 240, this.cy, G.scale()));
        }
      }
      if (this.state === 1) {      // 얼음창 세례
        if (this.atkCd <= 0) {
          this.atkCd = 0.45 - this.pf * 0.2;
          const n = 3 + this.pf * 2;
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
        this.state = (this.state + 1) % 4; this.stateT = 2.6 - this.pf * 0.6;
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++) G.ents.push(new Enemy('wraith', this.cx + (Math.random() - 0.5) * 320, this.cy, G.scale()));
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
        this.stateT = this.state === 1 ? 1.5 : 2.4 - this.pf * 0.5;
        if (this.state === 1) this.dashA = angleTo(this.cx, this.cy, p.cx, p.cy);
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++)
          G.ents.push(new Enemy(Math.random() < .5 ? 'gale' : 'sky_sentry', this.cx + (Math.random() - 0.5) * 300, this.cy, G.scale()));
      }
      if (this.state === 0) {            // 회전 돌풍
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * .7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * .7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.22;
          const n = 5 + this.pf * 4, base = G.time * 4;
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
          this.atkCd = 0.5 - this.pf * 0.2;
          for (let i = 0; i < 3 + this.pf * 2; i++) {
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
      /* 최초의 파수꾼 — 지상 보스. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 2.8 - this.pf * 0.6;
        if (this.state === 3) for (let i = 0; i < 1 + this.pf * 2; i++)
          G.ents.push(new Enemy(this.def.minion || 'ruin_guard', this.cx + (Math.random() - 0.5) * 260, this.cy - 20, G.scale()));
      }
      if (this.state === 0) {            // 룬 광선 (부채꼴)
        this.vx *= 0.86;
        if (this.atkCd <= 0) {
          this.atkCd = 0.9 - this.pf * 0.36;
          const base = angleTo(this.cx, this.cy, p.cx, p.cy);
          const n = 5 + this.pf * 4;
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
      /* 종장 — 별을 쫓아온 것. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 3.0 - this.pf * 0.8;
        if (this.state === 1) {
          this.x = clamp(p.cx + (Math.random() < .5 ? -170 : 170), TS * 3, WW * TS - TS * 3) - this.w / 2;
          this.y = p.cy - this.h;
          G.shake = Math.max(G.shake, 12);
          for (let i = 0; i < 26; i++) G.parts.push(new Part(this.cx, this.cy, '#a06fff', -40, 1.1));
        }
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++)
          G.ents.push(new Enemy(this.def.minion || 'wraith', this.cx + (Math.random() - 0.5) * 300, this.cy - 30, G.scale()));
      }
      if (this.state === 0) {            // 공허 탄막 — 천천히 돌아가는 나선
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.5, dt * 2);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.4, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.28 - this.pf * 0.1;
          this.spin = (this.spin || 0) + 0.55;
          const n = 3 + this.pf * 2;
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
          const n = 10 + this.pf * 8;
          for (let k = 0; k < n; k++) {
            const ang = k * TAU / n;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(ang) * 250, Math.sin(ang) * 250, this.dmg * 0.38, 'enemy', 'dark'));
          }
        }
      } else if (this.state === 2) {     // 잿비 — 머리 위에서 쏟아진다
        this.vx = lerp(this.vx, 0, dt * 3);
        this.vy = lerp(this.vy, -30, dt * 3);
        if (this.atkCd <= 0) {
          this.atkCd = 0.16 - this.pf * 0.06;
          const px = p.cx + (Math.random() - 0.5) * 620;
          G.projs.push(new Proj(px, this.cy - 260, (Math.random() - 0.5) * 40, 420, this.dmg * 0.34, 'enemy', 'bone'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_prolif') {
      /* 증식체 — 뛰지 않는다. */
      this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.35, dt * 2);
      if (this.stateT <= 0) {
        this.stateT = 2.4 - this.pf * 0.8;
        const kids = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === (this.def.minion || 'splitter')).length;
        if (kids < 3 + this.pf * 2) {                    // 쵸크 금지 — 한 번에 셋까지
          const n = 1 + this.pf * 2;
          for (let i = 0; i < n; i++) {
            const e = new Enemy(this.def.minion || 'splitter',
              this.cx + (i - (n - 1) / 2) * 46, this.cy, G.scale());
            e.vy = -220; e.vx = (i - (n - 1) / 2) * 90;
            G.ents.push(e);
          }
          G.ringFx(this.cx, this.cy, this.w, '#9a8a76', .4);
        }
      }
      if (this.lastPh()) {
        // 갈라진 것이 다 없어지면 핵이 드러난다 — 그때만 제대로 들어간다
        const kids = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === (this.def.minion || 'splitter')).length;
        const open = kids === 0;
        if (open && this.guard) { this.guard = 0; G.toast('핵이 드러났다', 'good'); }
        else if (!open && !this.guard) this.guard = 1;
      }
      if (this.atkCd <= 0 && dd < 320) {
        this.atkCd = 1.4;
        const a = angleTo(this.cx, this.cy, p.cx, p.cy);
        G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 340, Math.sin(a) * 340, this.dmg * 0.5, 'enemy', 'bolt'));
      }
      this.move(dt, world);

    } else if (AI === 'b_overseer') {
      /* 공창의 관리자 — 파수꾼의 룬 광선이 아니라 **단말로 명령을 내린다**. 제가 직접 때리는 일이 거의 없고, 방 안의 기계를 깨워 대신 싸우게 한다. */
      this.term = (this.term || 0) + dt;
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = 3.0 - this.pf * 0.8;
        if (this.state === 0) G.toast('관리자가 명령을 내린다', 'bad');
      }
      if (this.state === 0) {                    // 명령 — 바닥에서 압착기가 솟는다
        this.vx *= 0.9;
        if (this.atkCd <= 0) {
          this.atkCd = 0.55 - this.pf * 0.16;
          const fx = p.cx + (Math.random() - 0.5) * 260;
          G.warnFx(fx, p.cy + 20, 34, 0.6, '#c8843a');
          G.pending.push({ t: 0.6, fn: () => {
            G.aoe(fx, p.cy + 20, 40, this.dmg * 0.6, 6, '#c8843a');
            for (let k = 0; k < 8; k++) G.parts.push(new Part(fx, p.cy + 20, '#c8843a', -160, .6));
          } });
        }
      } else if (this.state === 1) {             // 물러서며 재장전 — 유일하게 붙을 틈
        this.vx = lerp(this.vx, -Math.sign(dx) * this.spd * 0.9, dt * 3);
      } else {                                   // 호출
        this.vx *= 0.92;
        if (this.atkCd <= 0) {
          this.atkCd = 1.6;
          const kids = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === (this.def.minion || 'riveter')).length;
          if (kids < 3) G.ents.push(new Enemy(this.def.minion || 'riveter',
            this.cx + (Math.random() - 0.5) * 220, this.cy - 20, G.scale()));
        }
      }
      this.move(dt, world);

    } else if (AI === 'b_hepha') {
      /* 헤파 — 컨베이어 위에 서 있는 것. */
      this.vx *= 0.88;
      // 컨베이어 — 가까이 있으면 계속 끌려온다
      if (dd < 420) p.vx += Math.sign(this.cx - p.cx) * 150 * dt;
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = 2.6 - this.pf * 0.7;
      }
      if (this.state === 0) {                    // 팔 휘두르기 — 좌우로 퍼지는 충격
        if (this.atkCd <= 0) {
          this.atkCd = 0.9 - this.pf * 0.3;
          for (const dir of [-1, 1]) for (let k = 0; k < 4; k++) {
            const x = this.cx + dir * (50 + k * 44);
            G.pending.push({ t: k * 0.06, fn: () => {
              G.aoe(x, this.y + this.h - 12, 34, this.dmg * 0.45, 5, '#c8a05a');
              for (let i = 0; i < 3; i++) G.parts.push(new Part(x, this.y + this.h - 6, '#c8a05a', -140, .5));
            } });
          }
        }
      } else if (this.state === 1) {             // 불티 — 위로 뿌려 떨어뜨린다
        if (this.atkCd <= 0) {
          this.atkCd = 0.4;
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
          const pr = new Proj(this.cx, this.cy - 20, Math.cos(a) * 320, Math.sin(a) * 420, this.dmg * 0.4, 'enemy', 'fire');
          pr.grav = 300; G.projs.push(pr);
        }
      }
      if (this.lastPh() && this.guard) {
        /* 정지 핵을 들고 붙어 있으면 열린다. */
        const held = p.held();
        if (held && held.id === 'stop_core' && dd < 90) {
          this.stopT = (this.stopT || 0) + dt;
          for (let i = 0; i < 2; i++) G.parts.push(new Part(this.cx, this.cy, '#9fd4ff', -40, .5));
          if (this.stopT > 1.2) { this.guard = 0; G.toast('정지 핵이 물렸다 — 지금이다', 'good'); G.shake = 12; }
        } else this.stopT = 0;
      }
      this.move(dt, world);

    } else if (AI === 'b_arche') {
      /* 원형 — 사람을 본떠 만든 첫 번째 것. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = this.state === 1 ? 1.5 : 2.2;
        if (this.state === 1) { this.combo = 0; this.atkCd = 0.2; }
      }
      if (this.state === 1) {                    // 연격 — 세 번 파고든다
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 2.2, dt * 6);
        if (this.atkCd <= 0 && this.combo < 3) {
          this.combo++; this.atkCd = 0.42;
          G.aoe(this.cx + Math.sign(dx) * 44, this.cy, 52, this.dmg * 0.8, 7, '#e8dcc0');
          G.shake = Math.max(G.shake, 6);
        }
      } else if (this.state === 0) {             // 겨눔 — 천천히 붙는다
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.6, dt * 3);
        if (this.onGround && dy < -50) this.vy = -580;
      } else {                                   // 숨 고르기 — 붙을 틈
        this.vx *= 0.86;
      }
      if (this.lastPh() && this.guard) {
        // 받침대(제단석)를 다 깨면 열린다.
        const ped = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === 'draft_form').length;
        if (!ped) { this.guard = 0; G.toast('받침대가 무너졌다', 'good'); }
      }
      this.move(dt, world);

    } else if (AI === 'b_restorer') {
      /* 부유 성채의 환원기 — 지금까지 나온 무엇보다 세다. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 2.6 - this.pf * 0.7;
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++)
          G.ents.push(new Enemy(this.def.minion || 'orbit_sentry', this.cx + (Math.random() - 0.5) * 320, this.cy - 20, G.scale()));
      }
      // --- 해체: 상태와 무관하게 늘 돈다. 위상이 오를수록 반경과 속도가 커진다 ---
      this.unmakeCd = (this.unmakeCd || 0) - dt;
      if (this.unmakeCd <= 0) {
        this.unmakeCd = 0.30 - this.pf * 0.14;
        const R = 6 + this.pf * 6;
        const bx = Math.floor(this.cx / TS), by = Math.floor(this.cy / TS);
        for (let k = 0; k < 5 + this.pf * 6; k++) {
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
          this.atkCd = 0.24 - this.pf * 0.08;
          this.spin = (this.spin || 0) + 0.42;
          const n = 4 + this.pf * 4;
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
          this.atkCd = 0.14 - this.pf * 0.06;
          const px = p.cx + (Math.random() - 0.5) * 700;
          G.projs.push(new Proj(px, this.cy - 280, (Math.random() - 0.5) * 50, 460, this.dmg * 0.30, 'enemy', 'star'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    }
  }
}

/* ================= 소환수 ================= */
/* ================= 마을 경비병 ================= */
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

/* ================= 펫 ================= */
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
  /** 지금 이 칸에 낀 펫 아이템의 레벨. */
  lvOf(p) { const it = p.equip['pet' + (this.slot + 1)]; return it ? (it.lv || 1) : 1; }
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
    // 부드럽게 따라붙는다.
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
    // 레벨과 플레이어의 피해 증가를 함께 탄다 — 안 그러면 후반에 장식이 된다 펫 레벨 배수는 여기서만 완만하게
    const dmg = a.dmg * petDmgScale(p.level) * petAtkMul(this.lvOf(p)) * (1 + (p.d.dmgP || 0));
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
  wind: 'wind', rune: 'rune',
  /* 룬 시트를 물려 준다. */
  bolt: 'rune'
};

/* 원소마다 맞는 순간이 달라야 한다. */
/* 타격 그림 → 그 그림에 붙는 원소 소리. */
const BURST_SFX = {
  fire: 'hit_fire', frost: 'hit_frost', soul: 'hit_soul',
  void: 'hit_void', arcane: 'hit_arcane'
};
const IMPACT_FX = {
  fire:  { burst: 'fire',   ring: '#ff8a3a', rr: 34, parts: 10 },
  frost: { burst: 'frost',  ring: '#9fe0ff', rr: 30, parts: 12 },
  soul:  { burst: 'soul',   ring: '#c49fff', rr: 26, parts: 8 },
  void:  { burst: 'void',   ring: '#a06fff', rr: 40, parts: 12 },
  dark:  { burst: 'void',   ring: '#9a5fd8', rr: 30, parts: 8 },
  bolt:  { burst: 'arcane', ring: '#8fd8ff', rr: 22, parts: 9 },
  rune:  { burst: 'arcane', ring: '#9fe8d8', rr: 26, parts: 8 },
  wind:  { burst: 'arcane', ring: '#bcd8f0', rr: 32, parts: 6 },
  star:  { burst: 'hit',    ring: '#ffe08a', rr: 24, parts: 8 }
  /* arrow · bone · star 는 물리라 예전 금빛 hit 그대로다. */
};
const PROJ_STYLE = {
  arrow: { c: '#d8c898', r: 3, len: 14 },
  bomb: { c: '#3a3630', r: 6 },          // 폭탄 — 심지 불티는 Bomb.update가 따로 뿌린다
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
/* 몹이 쏘는 것 중 **물리**인 것. */
const PHYS_PROJ = { arrow: 1, bone: 1, star: 1 };

class Proj extends Ent {
  constructor(x, y, vx, vy, dmg, team, type) {
    super(x - 6, y - 6, 12, 12);
    this.vx = vx; this.vy = vy; this.dmg = dmg; this.team = team; this.type = type;
    this.life = 3.2; this.grav = 0; this.pierce = 0; this.hitSet = new Set(); this.crit = false;
    /* ★ 발사음은 **여기 한 군데**에서 낸다. */
    if (team === 'enemy' && typeof G !== 'undefined' && G.sfxAt)
      G.sfxAt(PHYS_PROJ[type] ? 'efire_phys' : 'efire_magic', x / TS, y / TS);
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
        /* ★ 같은 발사에서 나온 것이 **이 적에게 두 번째로** 박히면 몫이 준다. */
        let dmg = this.dmg;
        if (this.vol) {
          if (e._vol === this.vol) dmg *= MULTI_FALLOFF;
          else e._vol = this.vol;
        }
        // 물리 화살·별조각만 금빛 타격을 얹는다.
        e.hurt(dmg, this.crit, G.player, 3, (this.type === 'arrow' || this.type === 'star') ? 'pierce' : null);
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
    const fx = IMPACT_FX[this.type];
    for (let i = 0; i < 6; i++) G.parts.push(new Part(this.cx, this.cy, st.c));
    if (this.explode) {
      G.aoe(this.cx, this.cy, this.explode, this.dmg * 0.8, 4, st.c);
      for (let i = 0; i < 16; i++) G.parts.push(new Part(this.cx, this.cy, st.c, -20, 0.6));
      G.burst(this.cx, this.cy, fx ? fx.burst : 'fire', this.explode * 2.2);
      if (fx && fx.ring) G.ringFx(this.cx, this.cy, this.explode, fx.ring, 0.34);
      G.shake = Math.max(G.shake, 4);
    } else if (this.team === 'player' && this.hitSet.size) {
      /* 원소마다 다른 흔적. */
      G.burst(this.cx, this.cy, fx ? fx.burst : 'hit', 36);
      /* 원소 한 겹. */
      if (fx && BURST_SFX[fx.burst]) G.sfxAt(BURST_SFX[fx.burst], this.cx / TS, this.cy / TS);
      if (fx) {
        G.ringFx(this.cx, this.cy, fx.rr, fx.ring, 0.26);
        for (let i = 0; i < fx.parts; i++) G.parts.push(new Part(this.cx, this.cy, fx.ring, -14, 0.42));
      }
    }
  }
}

/* ================= 이펙트 ================= */
class Part {
  /* g 중력 배수 — 사연: docs/code-history.md#h37 */
  constructor(x, y, c, vy0 = 0, life = 0.5, o = null) {
    this.x = x; this.y = y; this.c = c;
    const sp = o && o.spd !== undefined ? o.spd : 1;
    const a = Math.random() * TAU, s = (40 + Math.random() * 140) * sp;
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s + vy0;
    this.life = life + Math.random() * 0.3; this.max = this.life;
    this.r = (1.5 + Math.random() * 2) * (o && o.r !== undefined ? o.r : 1);
    this.g = o && o.g !== undefined ? o.g : 1;
    this.sq = o && o.sq !== undefined ? o.sq : 1;
    this.glow = o && o.glow ? 1 : 0;
    this.drag = o && o.drag !== undefined ? o.drag : 0.96;
    this.spin = (Math.random() - 0.5) * 12;
    this.rot = Math.random() * TAU;
  }
  update(dt) {
    this.life -= dt; this.vy += 340 * this.g * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= this.drag; this.rot += this.spin * dt;
    return this.life > 0;
  }
}
class DmgText {
  constructor(x, y, v, c, crit) { this.x = x + (Math.random() - 0.5) * 8; this.y = y; this.v = v; this.c = c; this.crit = crit; this.life = 0.85; this.vy = -70; }
  update(dt) { this.life -= dt; this.y += this.vy * dt; this.vy += 110 * dt; return this.life > 0; }
}
/* ===== 폭탄 ===== */
class Bomb extends Proj {
  constructor(x, y, vx, vy, spec) {
    super(x, y, vx, vy, spec.dmg, 'player', 'bomb');
    this.spec = spec;
    this.grav = 900;
    this.life = spec.fuse || 1.6;
    this.spin = 0;
  }
  update(dt, world) {
    this.life -= dt;
    this.spin += (this.vx > 0 ? 1 : -1) * dt * 9;
    if (Math.random() < dt * 24)                                   // 심지 불티
      G.parts.push(new Part(this.cx, this.cy - 6, '#ffd24a', -40, 0.3));
    if (this.life <= 0) { this.boom(world); return; }
    this.vy += this.grav * dt;
    // 축마다 따로 밀어 본다 — 벽에 닿은 축만 튕겨야 바닥에서 구른다
    const nx = this.x + this.vx * dt;
    if (world.hitSolid(nx, this.y, this.w, this.h)) { this.vx *= -0.42; }
    else this.x = nx;
    const ny = this.y + this.vy * dt;
    if (world.hitSolid(this.x, ny, this.w, this.h)) {
      if (this.vy > 0) { this.vy *= -0.32; this.vx *= 0.72; if (Math.abs(this.vy) < 40) this.vy = 0; }
      else this.vy = 0;
    } else this.y = ny;
    if (this.y > WH * TS) this.dead = true;
  }
  boom(world) {
    this.dead = true;
    const sp = this.spec, R = sp.r;
    G.aoe(this.cx, this.cy, R * TS * 0.9, sp.dmg, 8, '#ff9a3a');
    G.burst(this.cx, this.cy, 'fire', R * TS);
    G.shake = Math.max(G.shake, 6 + R);
    G.sfxAt(R >= 5 ? 'boom_big' : 'boom_small', Math.floor(this.cx / TS), Math.floor(this.cy / TS));
    for (let i = 0; i < 10 + R * 4; i++)
      G.parts.push(new Part(this.cx + (Math.random() - .5) * R * 8, this.cy + (Math.random() - .5) * R * 8,
        Math.random() < .5 ? '#ff9a3a' : '#e8dcc0', -120, 0.8));
    /* 던진 사람도 맞는다 — 자기 발밑에 던지면 아프다. */
    const p = G.player;
    if (dist(p.cx, p.cy, this.cx, this.cy) < R * TS && p.iframe <= 0) p.hurt(sp.dmg * 0.5, this.cx);

    const tx = Math.floor(this.cx / TS), ty = Math.floor(this.cy / TS);
    const zone = world.zoneAt(tx, ty);
    if (zone === 'village' || zone === 'camp') {           // 안전 지대는 안 부순다
      G.toast('여기서는 터뜨려도 아무것도 부서지지 않는다', 'bad');
      return;
    }
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const x = tx + dx, y = ty + dy;
        if (!world.inB(x, y)) continue;
        const id = world.get(x, y);
        if (id === T.AIR || id === T.BEDROCK) continue;    // 기반암은 세계 경계다
        const d = TILE_DEF[id];
        if (d.liquid || d.hard === undefined) continue;
        if (d.hard > sp.mine) continue;                    // 등급 넘는 것은 못 부순다
        if (MACH_OF_TILE[id]) continue;                    // 남의 기계를 날리지 않는다
        world.set(x, y, T.AIR);
        if (id === T.FAULTSTONE && G.triggerFault) G.triggerFault(x, y);   // 폭탄으로도 무너진다
        if (d.drop && Math.random() < 0.45)                // 절반쯤만 건진다 — 곡괭이가 손해는 아니게
          G.drops.push(new Drop((x + .5) * TS, (y + .5) * TS, makeItem(d.drop, 1)));
      }
  }
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
    /* 이제 수면까지 떠올라 수면에서 오르내린다 — 사연: docs/code-history.md#h38 */
    const ctx = Math.floor((this.x + this.w / 2) / TS), cty = Math.floor((this.y + this.h * 0.75) / TS);
    const sr = world.surfaceRow(ctx, cty, 3);
    const wet = TILE_DEF[world.get(ctx, cty)].liquid;
    if (wet) {
      const cur = world.currentAt(ctx, cty);
      this.vx = lerp(this.vx, cur * 120, dt * 2.5);
      if (sr >= 0 && G.surfacePx) {
        const want = G.surfacePx((this.x + this.w / 2) / TS, sr) - this.h * 0.55;
        this.vy = lerp(this.vy, (want - this.y) * 5, dt * 8);
      } else this.vy = lerp(this.vy, -40, dt * 2);
    } else this.vy = clamp(this.vy + GRAV * 0.7 * dt, -900, 700);
    if (!world.hitSolid(this.x + this.vx * dt, this.y, this.w, this.h)) this.x += this.vx * dt; else this.vx = 0;
    if (!world.hitSolid(this.x, this.y + this.vy * dt, this.w, this.h)) this.y += this.vy * dt;
    else { if (this.vy > 0) { this.vx *= 0.7; } this.vy = 0; }
  }
}
