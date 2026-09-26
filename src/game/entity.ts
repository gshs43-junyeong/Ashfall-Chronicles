// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== entity.js — 아이템 인스턴스 / 플레이어 / 적 / 투사체 ===== */
import { app as G, ui as UI } from './ctx.js';
import { TAU, aabb, angleTo, clamp, dist, dist2, lerp } from '../engine/core/math.js';
import { Entity } from '../engine/entity/entity.js';
import { fmt, tr } from './lang.js';
import { WH, WW } from './size.js';
import { MACH_OF_TILE, PREFIX, RARITY_MULT, SUFFIX, T, TILE_DEF, WEAPON_TIER_LV } from './data.js';
import { HIT_FX, ITEMS, MULTI_FALLOFF } from './data/items.js';
import { ENEMIES, MECH_PART } from './data/enemies.js';
import { BOSS_SURGE, BUFFS, PROF_MAX, SKILLS, SURGE_FLY, profNeed } from './data/skills.js';
import { CELL_CHARGE } from './data/ruins.js';
import { PETS, PET_LV_MAX, PET_XP_SHARE, levelMult, petAtkMul, petDmgScale, petLvMul, petXpNext } from './data/pets.js';
import { SIG_FX, idef } from './data/values.js';
import { TS } from './world.js';

export const GRAV = 2000, MAX_FALL = 1250;
/* ================= 제트팩의 두 한계 ================= */
export const JET_MAX_UP = 30;         // 발밑 지면에서 오를 수 있는 한계 (칸)
export const JET_BURN = 4.0;          // 이만큼 연속으로 밀면 과열 (초)
export const JET_COOL_AIR = 3.0;      // 공중에서 다 식는 시간 (초)
export const JET_COOL_GROUND = 1.2;   // 땅을 밟았을 때 (초)
export const JET_RESUME = 0.3;        // 과열 뒤 열이 이만큼 내려와야 다시 걸린다
export const JET_HIGH_FALL = 140;     // 한계 높이 위에서는 이 속도로 내려온다 (안전 낙하선 938보다 한참 아래)
export const SAFE_FALL_TILES = 10;                                  // 이만큼까지는 낙하 데미지 없음
export const SAFE_FALL_VY = Math.sqrt(2 * GRAV * SAFE_FALL_TILES * TS);   // v² = 2·g·d 로 역산한 안전 낙하 속도
export const BASE_BAG_SIZE = 40, MAX_BAG_SIZE = 56, HOTBAR = 10;
export const VAULT_SIZE = 60;   // 여명 마을 보관고 (가방과 별개로 유지되는 공용 창고)

/* ================= 아이템 인스턴스 ================= */
export function makeItem(id, count = 1, rarity = 0, affixes = null) {
  const def = ITEMS[id];
  if (!def) { console.warn('unknown item', id); return null; }
  const it = { id, c: count, r: rarity | 0 };
  if (affixes && affixes.length) it.a = affixes;
  return it;
}
export function maxStack(it) { return idef(it).stack || 1; }
export function isGear(it) { const t = idef(it).type; return t === 'weapon' || t === 'armor' || t === 'acc' || t === 'tool' || t === 'bag' || t === 'pet'; }
/* 장비 최소 착용 레벨. */
export function equipReqLv(id) {
  const d = ITEMS[id];
  if (!d) return 1;
  if (d.lvReq !== undefined) return d.lvReq;
  // 무기는 등급 표에서 뽑는다(WEAPON_TIER_LV 주석 참고).
  if (d.type === 'weapon' && d.tier !== undefined) return WEAPON_TIER_LV[d.tier] || 1;
  if (d.tier !== undefined) return d.tier * 4;
  return 1;
}

/** 접사 + 희귀도가 반영된 종합 스탯 */
export function itemStats(it) {
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
export function itemName(it) {
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
export function enhMul(it) { return RARITY_MULT[it.r] + 0.05 * (it.e || 0); }
export function itemDamage(it) {
  const d = idef(it);
  if (!d.dmg) return 0;
  const s = itemStats(it);
  return d.dmg * enhMul(it) * (1 + (s.dmgP || 0));
}
export function itemSpeed(it) {
  const d = idef(it), s = itemStats(it);
  return (d.spd || 2) * (1 + (s.spdP || 0));
}

/** 전리품 굴리기: 등급/접사 랜덤 */
export function rollGear(id, rng, luckTier = 0) {
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

export const CHEST_LOOT = [
  null,
  { gear: ['sword_wood', 'bow_hunt', 'staff_branch', 'helm_cloth', 'chest_cloth', 'boots_cloth', 'ring_vigor'], mats: [['copper_ore', 4, 10], ['wood', 5, 12], ['torch', 5, 12], ['potion_hp', 1, 2]] },
  { gear: ['sword_copper', 'bow_copper', 'helm_copper', 'chest_copper', 'boots_copper', 'ring_focus', 'amul_swift'], mats: [['iron_ore', 4, 10], ['copper_bar', 2, 5], ['potion_hp', 2, 4], ['potion_mp', 1, 3]] },
  { gear: ['sword_iron', 'bow_iron', 'staff_flame', 'helm_iron', 'chest_iron', 'boots_iron', 'pick_iron', 'amul_ember'], mats: [['iron_bar', 3, 7], ['gold_ore', 3, 8], ['crystal', 2, 6], ['potion_hp', 3, 5]] },
  { gear: ['sword_mythril', 'staff_frost', 'bow_storm', 'helm_mythril', 'boots_mythril', 'pick_mythril', 'charm_cloud', 'charm_leech'], mats: [['mythril_ore', 4, 9], ['soul_shard', 3, 8], ['crystal', 4, 10], ['potion_hp', 4, 7]] },
  { gear: ['staff_soul', 'chest_mythril', 'helm_soul', 'boots_soul', 'pick_soul', 'charm_leech'], mats: [['hell_ore', 5, 12], ['soul_shard', 6, 14], ['void_frag', 1, 3], ['potion_hp', 6, 10]] }
];
export function rollChest(tier, rng, source) {
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
/* 칸 충돌 이동은 엔진(Entity)이 하고, 물(부력·끌림·물살·폭포)과 계단 높이는 여기서 끼운다. */
export class Ent extends Entity {
  /** 타일 충돌을 포함한 이동 */
  move(dt, world, opts = {}) {
    const prevBottom = this.y + this.h;
    // 물 — 잠긴 비율만큼 중력과 낙하 상한이 줄고, 좌우로도 끈적해진다.
    const liq = opts.aquatic ? { f: 0, flow: 0, cur: 0 } : world.liquidIn(this.x, this.y, this.w, this.h);
    this.submerged = liq.f;
    /* X — 흐르는 물살은 속도가 아니라 **떠밀림**으로 더한다. 계단을 오른 뒤에는 물살 없이 다시 간다. */
    this.moveX(world, this.x + (this.vx + (liq.cur || 0) * 70) * dt, opts.noStep ? 0 : TS * 0.75, this.x + this.vx * dt);

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
    this.fall(dt, GRAV * gm, -2000, cap);
    this.moveY(world, this.y + this.vy * dt, prevBottom, !opts.dropThrough);
    this.keepIn(TS, WW * TS - TS, WH * TS);
  }
}

/* ================= 플레이어 ================= */
export class Player extends Ent {
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
  /** 전하를 쓴다. 모자라면 가방의 충전된 배터리 하나를 **더한다**(CELL_CHARGE) — 남은 전하를 버리고 최대치로 채우면
      부적으로 최대치를 늘린 사람만 배터리 한 개 값이 두 배가 됐다. 전주 곁에 서 있으면 망에서도 찬다(factory.js). */
  useCharge(n) {
    if (this.charge >= n) { this.charge -= n; return true; }
    if (!this.removeItem('battery_cell', 1)) return false;
    this.charge = Math.min(this.d.maxCharge, this.charge + CELL_CHARGE);
    if (!this.addItem(makeItem('battery_empty', 1))) G.drops.push(new Drop(this.cx, this.cy, makeItem('battery_empty', 1)));
    G.toast(tr('배터리를 갈아 끼웠다'));
    UI.refreshBag();
    if (this.charge < n) return false;
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
    /* 모은 수(장 목표)는 **실제로 들어간 만큼만** — 먼저 세면 가방이 찬 채 기계 산출 칸을 누를 때마다 부풀었다 */
    const id = it.id, c0 = it.c;
    const done = ok => { const got = ok ? c0 : c0 - it.c; if (got > 0) this.gathered[id] = (this.gathered[id] || 0) + got; return ok; };
    const ms = maxStack(it);
    if (ms > 1) {
      for (let i = 0; i < this.bag.length; i++) {
        const s = this.bag[i];
        if (s && s.id === it.id && !s.a && !it.a && s.r === it.r && s.c < ms) {
          const move = Math.min(ms - s.c, it.c); s.c += move; it.c -= move;
          if (it.c <= 0) return done(true);
        }
      }
    }
    for (let i = 0; i < this.bag.length; i++) if (!this.bag[i]) { this.bag[i] = it; return done(true); }
    return done(false);
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
    if (this.level < equipReqLv(it.id)) return false;   // 알림 없음 — 사연: docs/code-history.md#h140
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
        G.toast(tr('{idef} — {lv}레벨이 되었다', { idef: idef(it).n, lv: it.lv }), 'good');
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
      G.shake = 14; G.toast(tr('불굴 — 아직 쓰러지지 않는다'), 'good');
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
}

/* ================= 적 ================= */
export class Enemy extends Ent {
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
    G.toast(tr('모으던 것이 흩어졌다'), 'good');
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
      G.texts.push(new DmgText(this.cx, this.y - 4, tr('전환 중'), '#9fd4ff', 0));
      return;
    }
    /* 굳어 있을 때(guard) — 약점이 드러나기 전에는 거의 통하지 않는다. */
    if (this.guard) {
      amount *= 0.12;
      if (Math.random() < 0.5) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 20, this.y - 10, tr('막혔다'), '#8d8874', 0));
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
    /* ★ 플레이어가 먼저 쓰러졌으면 보스는 **처치가 아니다** — onDeath 가 피해 처리 도중에 불려 같은 프레임의
       남은 투사체·펫·지속 피해가 보스를 마저 잡으면 토벌·장 목표·둥지 비움이 그대로 잡혔다 */
    if (this.boss && p.hp <= 0) return;
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
      if (!ITEMS[id]) continue;                  // 없는 아이템이면 rollGear 가 null 을 준다 — 빈 Drop 을 만들지 않는다
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
}

/* ================= 소환수 ================= */
/* ================= 마을 경비병 ================= */
export class Guard extends Ent {
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

export class Wolf extends Ent {
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
export class Pet {
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
export const PROJ_FX = {
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
export const BURST_SFX = {
  fire: 'hit_fire', frost: 'hit_frost', soul: 'hit_soul',
  void: 'hit_void', arcane: 'hit_arcane'
};
export const IMPACT_FX = {
  fire:  { burst: 'fire',   ring: '#ff8a3a', rr: 34, parts: 10 },
  frost: { burst: 'frost',  ring: '#9fe0ff', rr: 30, parts: 12 },
  soul:  { burst: 'soul',   ring: '#c49fff', rr: 26, parts: 8 },
  void:  { burst: 'void',   ring: '#a06fff', rr: 40, parts: 12 },
  dark:  { burst: 'void',   ring: '#9a5fd8', rr: 30, parts: 8 },
  bolt:  { burst: 'arcane', ring: '#8fd8ff', rr: 22, parts: 9 },
  rune:  { burst: 'arcane', ring: '#9fe8d8', rr: 26, parts: 8 },
  wind:  { burst: 'arcane', ring: '#bcd8f0', rr: 32, parts: 6 },
  star:  { burst: 'hit',    ring: '#ffe08a', rr: 24, parts: 8 },
  bullet: { burst: 'hit',   ring: '#ffd86a', rr: 12, parts: 6 }
  /* arrow · bone · star 는 물리라 예전 금빛 hit 그대로다. */
};
export const PROJ_STYLE = {
  arrow: { c: '#d8c898', r: 3, len: 14 },
  bullet: { c: '#ffe0a0', r: 2, tracer: 22 },   // 포탑 총탄 — 예광 줄기
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
export const PHYS_PROJ = { arrow: 1, bone: 1, star: 1, bullet: 1 };

export class Proj extends Ent {
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
        e.hurt(dmg, this.crit, G.player, 3, (this.type === 'arrow' || this.type === 'star' || this.type === 'bullet') ? 'pierce' : null);
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
export class Part {
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
export class DmgText {
  constructor(x, y, v, c, crit) { this.x = x + (Math.random() - 0.5) * 8; this.y = y; this.v = v; this.c = c; this.crit = crit; this.life = 0.85; this.vy = -70; }
  update(dt) { this.life -= dt; this.y += this.vy * dt; this.vy += 110 * dt; return this.life > 0; }
}
/* ===== 폭탄 ===== */
export class Bomb extends Proj {
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
      G.toast(tr('여기서는 터뜨려도 아무것도 부서지지 않는다'), 'bad');
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

export class Drop {
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
