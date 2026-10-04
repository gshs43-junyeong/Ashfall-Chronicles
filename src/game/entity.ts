/* ===== entity.js — 플레이어 / 적 / 동료 / 펫 / 투사체 / 떨어진 물건 ===== */
import { app as G, ui as UI } from './ctx.js';
import { countOf, stackAdd, takeOut } from '../engine/core/inventory.js';
import { mapPity, rollLoot } from '../engine/core/loot.js';
import { TAU, aabb, angleTo, clamp, dist, dist2, lerp } from '../engine/core/math.js';
import { Entity } from '../engine/entity/entity.js';
import { Timed, addDot } from '../engine/entity/status.js';
import { FloatText } from '../engine/fx/floattext.js';
import { Particle } from '../engine/fx/particles.js';
import { fmt, tr } from './lang.js';
import { dimsOf } from './size.js';
import { MACH_OF_TILE, T, TILE_DEF } from './data.js';
import { HIT_FX, ITEMS, MULTI_FALLOFF } from './data/items.js';
import { DIFF_TIER, ENEMIES, MECH_PART } from './data/enemies.js';
import { BOSS_SURGE, BUFFS, PROF_MAX, SKILLS, SURGE_FLY, profNeed } from './data/skills.js';
import { CELL_CHARGE } from './data/ruins.js';
import { DRAGON_FOOD, DRAGON_GATES, PETS, PET_XP_SHARE, dragonStage, levelMult, petAtkMul, petDmgScale, petMaxLv,
  petXpNext } from './data/pets.js';
import { SESSIONS, sessionOf } from './data/story.js';
import { SIG_FX, idef } from './data/values.js';
import { PROJ_INFLICT } from './data/mobskills.js';
import { TS } from './world.js';
import { STACK_RULES, enhMul, equipReqLv, itemStats, makeItem, rollGear } from './items.js';
import type { Senses } from '../engine/entity/sense.js';
import type { LootRow } from '../engine/core/loot.js';
import type { PathFollower } from '../engine/tilemap/path.js';

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

/* ================= 기본 엔티티 ================= */
/* 칸 충돌 이동은 엔진(Entity)이 하고, 물(부력·끌림·물살·폭포)과 계단 높이는 여기서 끼운다. */
export class Ent extends Entity {
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare submerged: number;

  /** 타일 충돌을 포함한 이동 */
  move(dt: any, world: any, opts: Bag = {}) { const { WW, WH } = dimsOf(world);
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
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare static _vol: number;   // 한 번 휘두른 공격의 번호(여러 몹이 같은 휘두름에 맞았는지)
  declare _punchDmg: number; declare chargeDmg: number; declare chargeHit: Set<any>; declare chargeT: number; declare drownT: number; declare regAcc: number; declare regT: number;
  declare floating: boolean; declare gliding: boolean; declare headUnder: boolean; declare highest: number; declare jetOk: boolean | undefined;
  declare jetT: number; declare jetting: boolean; declare oxyPressure: number; declare oxygen: number; declare swimMove: boolean;
  declare swimPh: number; declare swimming: boolean; declare swingAng: number; declare swingReach: number; declare wasInWater: boolean;
  declare climbOut: (...a: any[]) => any; declare fireProj: (...a: any[]) => any; declare punch: (...a: any[]) => any;
  declare rollCrit: (...a: any[]) => any; declare scaleDmg: (...a: any[]) => any; declare updateOxygen: (...a: any[]) => any;
  declare volley: number;
  declare remote: boolean; declare netId: number; declare netBuf: any; declare netMaxHp: number; declare _hid: string; declare _wid: string; declare _hurtAt: number; declare petEnts: any[]; declare _pt: string;   // 남의 화면 플레이어(멀티플레이) — 이 화면에서는 그림자일 뿐이다
  declare _jetNoteAt: number; declare atkTimer: number; declare bag: any[]; declare base: Record<string, number>; declare bossKilled: Record<string, any>;
  declare dotAcc: number; declare dotT: number;
  declare buffs: any[]; declare cd: Record<string, any>; declare channel: Record<string, any> | null; declare charId: string; declare charge: number; declare d: Record<string, any>;
  declare dashCd: number; declare dashV: number; declare deepest: number; declare equip: Record<string, any>; declare facing: number; declare flash: number;
  declare gathered: Record<string, any>; declare gold: number; declare hp: number; declare hurtCd: number; declare iframe: number; declare jetGap: number;
  declare jetHeat: number; declare jetOver: boolean; declare jumpHeld: boolean; declare jumpsLeft: number; declare kills: Record<string, any>;
  declare level: number; declare mineProg: number; declare mineTx: number; declare mineTy: number; declare mined: Record<string, any>; declare mp: number;
  declare name: string; declare potionCd: number; declare prof: Record<string, any>; declare sel: number; declare shield: number; declare shieldMax: number;
  declare shieldT: number; declare skillPts: number; declare skills: Record<string, any>; declare slots: any[]; declare starFade: number;
  declare starLit: number; declare starOrbits: number; declare statPts: number; declare swing: number; declare swingDir: number;
  declare swingHit: Set<any> | null; declare undyingCd: number; declare xp: number; declare xpNext: number;

  constructor(x: number, y: number) {
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
    const s: Bag = { str: this.base.str, dex: this.base.dex, int: this.base.int, vit: this.base.vit };
    const acc: Bag = { def: 0, hp: 0, mp: 0, ms: 0, crit: 5, critD: 50, cdr: 0, lifesteal: 0, jump: 0, mpreg: 0, hpreg: 0, dmgP: 0, spdP: 0, magicP: 0, fire: 0, frost: 0, poison: 0, dashCd: 0, dashI: 0, charge: 0, dr: 0 };
    const merge = (o: Bag) => { for (const k in o) { if (k in s) s[k] += o[k]; else acc[k] = (acc[k] || 0) + o[k]; } };
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
  useCharge(n: number) {
    if (this.charge >= n) { this.charge -= n; return true; }
    if (!this.removeItem('battery_cell', 1)) return false;
    this.charge = Math.min(this.d.maxCharge, this.charge + CELL_CHARGE);
    if (!this.addItem(makeItem('battery_empty', 1)!)) G.drops.push(new Drop(this.cx, this.cy, makeItem('battery_empty', 1)!));
    G.toast(tr('배터리를 갈아 끼웠다'));
    UI.refreshBag();
    if (this.charge < n) return false;
    this.charge -= n;
    return true;
  }

  /** 발밑에서 지면까지 몇 칸인가. */
  groundGap(world: World) {
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
  jetNote(msg: string, kind?: string) {
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
  addItem(it: Bag) {
    if (!it) return true;
    /* 모은 수(장 목표)는 **실제로 들어간 만큼만** — 먼저 세면 가방이 찬 채 기계 산출 칸을 누를 때마다 부풀었다 */
    const id = it.id, c0 = it.c;
    const done = (ok: boolean) => { const got = ok ? c0 : c0 - it.c; if (got > 0) this.gathered[id] = (this.gathered[id] || 0) + got; return ok; };
    return done(stackAdd(this.bag, it as any, STACK_RULES));   // 있는 더미에 먼저, 남은 것만 빈 칸(engine core/inventory)
  }
  countItem(id: string) { return countOf(this.bag, id); }
  removeItem(id: string, n: number) { return takeOut(this.bag, id, n); }
  hasAll(need: any) { for (const k in need) if (this.countItem(k) < need[k]) return false; return true; }

  equipFrom(slotIdx: any) {
    const it = this.bag[slotIdx]; if (!it) return;
    const d = idef(it);
    if (this.level < equipReqLv(it.id)) { G.toast(tr('레벨 {equipReqLv} 필요', { equipReqLv: equipReqLv(it.id) }), 'bad'); return false; }
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
  unequip(key: string) {
    const it = this.equip[key]; if (!it) return;
    for (let i = 0; i < this.bag.length; i++) if (!this.bag[i]) { this.bag[i] = it; this.equip[key] = null; this.recalc(); return true; }
    return false;
  }

  /* ---- 성장 ---- */
  /** 낀 펫에게 경험치. */
  addPetXp(n: number) {
    if (n <= 0) return;
    let up = false;
    for (const k of ['pet1', 'pet2']) {
      const it = this.equip[k];
      if (!it || idef(it).type !== 'pet') continue;
      it.lv = it.lv || 1; it.xp = (it.xp || 0) + n;
      const pid = idef(it).pet, max = petMaxLv(pid!), dragon = PETS[pid!] && PETS[pid!].dragon;
      while (it.lv < max && it.xp >= petXpNext(it.lv, pid)) {
        /* 드래곤 진화 문턱 — 경험치가 가득 찬 채로 기다리고, 그 단계 먹이를 먹어야 넘는다(G.feedDragon) */
        if (dragon && DRAGON_GATES.includes(it.lv + 1)) {
          it.xp = petXpNext(it.lv, pid);
          if (!it.hungry) {
            it.hungry = 1;
            const food = DRAGON_FOOD[DRAGON_GATES.indexOf(it.lv + 1)];
            G.toast(tr('{idef|이} 진화를 기다린다 — {food|을} 먹이자', { idef: idef(it).n, food: ITEMS[food].n }), 'good');
          }
          break;
        }
        it.xp -= petXpNext(it.lv, pid); it.lv++; up = true;
        G.toast(tr('{idef} — {lv}레벨이 되었다', { idef: idef(it).n, lv: it.lv }), 'good');
      }
      if (it.lv >= max) it.xp = 0;
    }
    if (up) { this.recalc(); UI.refreshEquip(); G.sfx('level'); }
  }

  addXp(n: number) {
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

  addBuff(id: string, dur: number, dps = 0) {
    const bd = BUFFS[id]; if (!bd) return;
    const ex = this.buffs.find(b => b.id === id);
    if (ex) { ex.t = Math.max(ex.t, dur || bd.dur!); ex.dps = Math.max(ex.dps || 0, dps); }
    else this.buffs.push({ id, t: dur || bd.dur, dps });
    this.recalc();
  }
  /** 해로운 것을 건다(몹 스킬 · 원소 탄) — 남의 아바타면 그 주인 화면으로 보낸다. 처음 걸릴 때만 몸에 연출(다시 걸려도 겹치지 않는다) */
  inflict(id: string, dur: number, dps = 0) {
    if (this.remote) { G.netRemoteInflict(this, id, dur, dps); return; }
    if (this.dead || this.hp <= 0) return;
    const had = this.buffs.some(b => b.id === id);
    this.addBuff(id, dur, dps);
    if (!had) G.statusOnset(this, id);
  }

  /* ---- 피해 ---- */
  hurt(amount: any, srcX?: any) {
    /* ★ 남의 아바타가 맞으면 피해는 주인 화면에서 계산한다 — 여기서 hp 를 깎으면 이 화면의 G.onDeath 가 불린다. */
    if (this.remote) { G.netRemoteHurt(this, amount, srcX); return; }
    /* ★ 쓰러진 뒤에는 맞지 않는다 — 여럿이면 세계가 계속 돌아 몹·호스트가 보낸 피해가 쓰러진 몸에 닿았고, 그때마다 onDeath 가 다시 불려
       죽는 소리가 되풀이되고 경험치·금화를 거듭 잃었다. 사연: docs/code-history.md#h147 */
    if (this.iframe > 0 || this.dead || this.hp <= 0) return;
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
  addProf(kind: string, n: number) {
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
  profLv(kind: string) { return (this.prof && this.prof[kind] ? this.prof[kind].lv : 1); }
  heal(n: any) {
    const before = this.hp;
    this.hp = Math.min(this.d.maxHp, this.hp + n);
    if (this.hp - before >= 0.5) G.texts.push(new DmgText(this.cx, this.y, '+' + Math.round(this.hp - before), '#7fe07f', 0));
  }
}

/* ================= 적 ================= */
export class Enemy extends Ent {
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare ghost: boolean; declare nid: number; declare netBuf: any;   // 멀티플레이 — 참가자 화면의 그림자 몹 · 호스트가 매긴 번호
  declare combo: number; declare dashA: number; declare drift: number; declare iceCd: number; declare iceFloor: number; declare landT: number;
  declare openT: number; declare phaseT: number; declare spin: number; declare stopT: number; declare term: number; declare tilt: number;
  declare unmakeCd: number; declare wDir: number; declare wob: number; declare bossAI: (...a: any[]) => any; declare layHeat: (...a: any[]) => any;
  declare onPhaseChange: (...a: any[]) => any; declare raisePedestals: (...a: any[]) => any; declare tickWeak: (...a: any[]) => any;
  declare sense: Senses | null; declare path: PathFollower | null; declare pathT: number; declare walkPath: (...a: any[]) => { dir: number; jump: number } | null; declare fly: { pts: [number, number][]; i: number } | null;
  declare flyWant: (...a: any[]) => { x: number; y: number };   // 알아차림 · 길(entity/enemy-ai)
  declare _vol: number; declare aggro: number; declare armor: number; declare atkCd: number; declare atkPose: number; declare boss: boolean;
  declare def: EnemyDef; declare dmg: number; declare dots: any[]; declare elite: boolean; declare facing: number; declare flash: number;
  declare fleeT: number; declare gold: number; declare guard: number | boolean; declare hitCd: number; declare hp: number; declare jumpCd: number;
  declare lastPhase: number; declare lvFactor: number; declare markAmt: number; declare markT: number; declare maxHp: number; declare mech: number;
  declare pedestal: number; declare pf: number; declare phase: number; declare phaseInv: number; declare phases: number; declare sgAmt: number;
  declare sgBuf: number; declare sgCd: number; declare sgKind: string | null; declare sgRing: number; declare sgStun: number; declare sgT: number;
  declare sgTook: number; declare slowFx: Timed; declare slowF: number; declare slowT: number; declare sparkT: number; declare spd: number | undefined; declare state: number;
  declare stateT: number; declare think: number; declare type: string; declare weatherBuffed: boolean; declare xp: number;
  /* 몹 스킬 · 걸린 것(entity/enemy-skills) */
  declare chillT: number; declare empT: number; declare baseDmg: number; declare cast: Bag | null; declare mskCd: Bag | null; declare skillIds: string[] | null; declare castKick: number;
  declare chill: (t: number) => void; declare empower: (dur: number, mult: number) => void; declare mobSkills: (dt: number, player: any, seen: boolean, dd: number) => void;
  declare allyTarget: (id: string, S: Bag) => any; declare fireSkill: (id: string, player: any, tgt: any) => void;

  constructor(type: string, x: number, y: number, scale = 1) {
    const d = ENEMIES[type];
    super(x, y, d.w, d.h);
    this.type = type; this.def = d;
    /* 세 가지 배수가 한자리에서 곱해진다. */
    const sc = d.boss ? 1 : scale;
    this.lvFactor = (!d.boss && d.lvScale && typeof G !== 'undefined' && G.player)
      ? levelMult(G.player.level, d.lvScale) : 1;
    const lf = this.lvFactor;
    const md = (typeof G !== 'undefined' && G.modeMul) ? G.modeMul() : 1;
    const ch = (typeof G !== 'undefined' && G && G.chapter) || 0;
    const si = Math.max(0, Math.min(2, SESSIONS.indexOf(sessionOf(ch))));
    const dt = d.passive ? null : DIFF_TIER[si];
    /* 세션 1 배율은 4장(레벨 24 갖춤)에서 잰 값이라 서장부터 걸면 맨손 1레벨에 몹이 6배였다 — 0장 1배 → 4장 전부로 오른다. 사연: docs/code-history.md#h162 */
    const ramp = si === 0 ? Math.min(1, ch / 4) : 1;
    const th = dt ? 1 + ((d.boss ? dt.bossHp : dt.hp) - 1) * ramp : 1, tdm = dt ? 1 + ((d.boss ? dt.bossDmg : dt.dmg) - 1) * ramp : 1;
    this.maxHp = Math.round(d.hp * sc * lf * md * th); this.hp = this.maxHp;
    this.dmg = d.dmg * sc * lf * md * tdm; this.armor = d.def! * sc;
    this.spd = d.spd; this.xp = Math.round(d.xp! * sc * lf); this.gold = Math.round(d.gold! * sc * lf);
    this.boss = !!d.boss;
    this.aggro = d.aggro || 460;   // 인지 사정거리(px) — 이 밖에서는 추격하지 않는다
    this.flash = 0; this.atkCd = 0; this.jumpCd = 0; this.think = 0;
    /* 공격 포즈를 띄워 둘 시간 — 사연: docs/code-history.md#h33 */
    this.atkPose = 0;
    this.lastPhase = 0;
    this.slowT = 0; this.slowF = 1; this.dots = []; this.slowFx = new Timed(1, 'min');
    this.chillT = 0; this.empT = 0; this.cast = null; this.mskCd = null; this.skillIds = null;
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
  makeMech(mul: number) {
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
  tickSurge(dt: number, world: any, p: Player) {
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
  releaseSurge(S: any, p: any) {
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
      this.dmg *= 1 + S.v; this.spd! *= 1 + S.v * 0.5;
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
    else if (this.sgKind === 'rage') { this.dmg /= 1 + this.sgAmt; this.spd! /= 1 + this.sgAmt * 0.5; }
    this.sgKind = null; this.sgAmt = 0;
  }
  /** 같은 갈래는 3겹까지(engine entity/status) — 빠른 무기로 불을 수십 겹 쌓던 것 */
  addDot(kind: string, dps: any, dur: number) {
    if (!this.dots.some(d => d.kind === kind)) G.statusOnset(this, kind);   // 처음 붙는 순간만 — 불이 확 붙는다 · 독이 퍼진다
    addDot(this.dots, kind, dps, dur, 3);
  }
  slow(f: any, t: any) { this.slowFx.set(1 - f, t); this.slowF = this.slowFx.v; this.slowT = this.slowFx.t; }   // 겹치면 센 쪽 · 긴 시간(engine entity/status)

  /** fam 은 물리 타격 그림 계열('slash'·'pierce'·'blunt'). */
  hurt(amount: any, crit?: any, src?: any, kb?: any, fam?: any) {
    if (this.dead) return;
    /* ★ 그림자 몹(참가자 화면) — 피해는 호스트가 계산한다. 여기서는 맞는 그림만 내고 요청을 보낸다. */
    if (this.ghost) { G.netHitGhost(this, amount, crit, src, kb, fam); return; }
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
    /* 맞으면 누가 쳤는지 안다 — 벽 너머에서 쏘아도 그쪽을 찾아 나선다 */
    if (this.sense) { const s = src && src.cx !== undefined ? src : G.player; if (s) this.sense.alarm(s.cx, s.cy); }
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
  die(src: any) {
    if (this.dead) return;
    this.dead = true;
    /* 남의 아바타가 잡았다(호스트) — 보상은 그 주인 화면에서 굴린다. 보스 토벌(세계 진행)은 여기서. */
    if (src && src.remote) {
      G.netKilledBy(src, this);
      G.addCorpse(this); G.deathBurst(this);
      if (this.boss) { G.shake = 18; G.onBossDown(this.type); }
      G.sfx(this.boss ? 'bossdie' : 'die');
      return;
    }
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
    /* 드문 떨굼(10% 미만)은 못 얻을수록 확률이 오른다(engine core/loot — 판 동안만 기억한다) */
    G.lootPity = G.lootPity || mapPity();
    for (const { id: id0, n } of rollLoot((this.def.drops || []) as LootRow[], () => rng.next(), (a, b) => rng.int(a, b), G.lootPity, { key: this.type })) {
      /* 개조된 것에서는 부품만 나온다 — 원래 표에 얹지 않고 **바꿔친다**. 얹으면 개조된 쪽이 그냥 더 좋은 사냥감이 되어 세기 1.5배를 치르고도 이득이 남는다. */
      const id = (this.mech && typeof MECH_PART !== 'undefined') ? MECH_PART : id0;
      if (!ITEMS[id]) continue;                  // 없는 아이템이면 rollGear 가 null 을 준다 — 빈 Drop 을 만들지 않는다
      if (ITEMS[id] && (ITEMS[id].stack || 1) > 1) G.drops.push(new Drop(this.cx, this.cy, makeItem(id, n)!));
      else for (let k = 0; k < n; k++) G.drops.push(new Drop(this.cx, this.cy, rollGear(id, rng, this.boss ? 3 : 0)!));
    }
    /* 쓰러지는 그림을 남긴다 — 사연: docs/code-history.md#h35 */
    G.addCorpse(this);
    G.deathBurst(this);
    if (this.boss) { G.shake = 18; if (!(G.net && G.net.role === 'guest')) G.onBossDown(this.type); }   // 세계 진행은 호스트 것
    if (p.skills.s_hunter) p.addBuff('swift_kill', 3);
    G.onKill(this.type);
    G.sfx(this.boss ? 'bossdie' : 'die');
  }
}

/* ================= 소환수 ================= */
/* ================= 마을 경비병 ================= */
export class Guard extends Ent {
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare atkCd: number; declare dmg: number; declare face: number; declare guard: boolean; declare home: number; declare homeTx: number;
  declare hp: number; declare maxHp: number; declare shootCd: number;

  constructor(x: number, y: number, lv: number) {
    super(x, y, 20, 40);
    this.home = x;          // 초소 위치 — 픽셀 좌표다 (타일 아님)
    this.guard = true;
    this.maxHp = 420 + lv * 60;
    this.hp = this.maxHp;
    this.dmg = 38 + lv * 7;
    this.atkCd = 0; this.shootCd = 0; this.face = 1;
  }
  hurt(n: number) { this.hp -= n; if (this.hp <= 0) this.dead = true; }
  update(dt: number, world: any, player: any) {
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
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare atkCd: number; declare dmg: number; declare life: number; declare minion: boolean; declare owner: Player;

  constructor(x: number, y: number, owner: Player) {
    super(x, y, 30, 22);
    this.owner = owner; this.life = 30; this.atkCd = 0; this.minion = true;
    this.dmg = 18 + owner.d.int * 1.8;
  }
  update(dt: number, world: any, player: Player) {
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
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare cd: number; declare def: PetDef; declare facing: number; declare flash: number; declare id: string; declare slot: number; declare t: number;
  declare x: number; declare y: number; declare lv: number;   // lv — 남의 펫(멀티플레이)은 장비가 없어 받은 레벨로

  constructor(petId: string, slot: number) {
    this.id = petId; this.slot = slot;
    this.def = PETS[petId];
    this.x = 0; this.y = 0;
    this.cd = 0.4 + slot * 0.35;      // 두 마리가 동시에 쏘지 않도록 살짝 어긋나게 시작
    this.t = Math.random() * TAU;
    this.facing = 1;
    this.flash = 0;
  }
  /** 지금 이 칸에 낀 펫 아이템의 레벨. */
  lvOf(p: Player) { if (this.lv) return this.lv; const it = p.equip['pet' + (this.slot + 1)]; return it ? (it.lv || 1) : 1; }
  /** 플레이어 기준 떠 있을 자리 — 슬롯마다 반대쪽 어깨 뒤에 선다 */
  anchor(p: any) {
    const side = this.slot === 0 ? -1 : 1;
    const ex = this.def.dragon ? [0, 4, 10, 16][dragonStage(this.lvOf(p))] : 0;   // 큰 드래곤은 조금 더 떨어져 뜬다
    return [p.cx - p.facing * side * (26 + ex), p.cy - 16 - ex * 0.6 + Math.sin(this.t * 2.2 + this.slot) * 4];
  }
  /** 따라다니기만 — 남의 펫은 이것만 돈다(치는 것은 주인 화면이 하고 피해만 호스트로 간다). */
  follow(dt: number, p: any) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    const [ax, ay] = this.anchor(p);
    if (dist2(this.x, this.y, ax, ay) > 640 * 640) { this.x = ax; this.y = ay; }
    this.x = lerp(this.x, ax, Math.min(1, dt * 6));
    this.y = lerp(this.y, ay, Math.min(1, dt * 6));
  }
  update(dt: number, p: Player) {
    this.cd -= dt;
    this.follow(dt, p);

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
      G.burst(target.cx, target.cy, 'hit_blunt', 34);
    } else {
      const ang = Math.atan2(target.cy - this.y, target.cx - this.x);
      G.projs.push(new Proj(this.x, this.y, Math.cos(ang) * a.spd, Math.sin(ang) * a.spd, dmg, 'player', a.proj));
    }
  }
}

/* ================= 투사체 ================= */
/* 손그림 이펙트 시트로 대체할 투사체 종류 */
export const PROJ_FX: Record<string, string> = {
  arrow: 'arrow', star: 'arrow', pstar: 'starfrag',
  fire: 'flame',
  frost: 'frost',
  void: 'void', dark: 'void', soul: 'void',
  wind: 'wind', rune: 'rune',
  /* 룬 시트를 물려 준다. */
  bolt: 'rune'
};

/* 원소마다 맞는 순간이 달라야 한다. */
/* 타격 그림 → 그 그림에 붙는 원소 소리. */
export const BURST_SFX: Record<string, string> = {
  fire: 'hit_fire', frost: 'hit_frost', soul: 'hit_soul',
  void: 'hit_void', arcane: 'hit_arcane'
};
export const IMPACT_FX: Bag = {
  fire:  { burst: 'fire',   ring: '#ff8a3a', rr: 34, parts: 10 },
  frost: { burst: 'frost',  ring: '#9fe0ff', rr: 30, parts: 12 },
  soul:  { burst: 'soul',   ring: '#c49fff', rr: 26, parts: 8 },
  void:  { burst: 'void',   ring: '#a06fff', rr: 40, parts: 12 },
  dark:  { burst: 'void',   ring: '#9a5fd8', rr: 30, parts: 8 },
  bolt:  { burst: 'arcane', ring: '#8fd8ff', rr: 22, parts: 9 },
  rune:  { burst: 'arcane', ring: '#9fe8d8', rr: 26, parts: 8 },
  wind:  { burst: 'arcane', ring: '#bcd8f0', rr: 32, parts: 6 },
  star:  { burst: 'hit',    ring: '#ffe08a', rr: 24, parts: 8 },
  pstar: { burst: 'stargain', ring: '#ffe08a', rr: 26, parts: 10 },
  bullet: { burst: 'hit',   ring: '#ffd86a', rr: 12, parts: 6 }
  /* arrow · bone · star 는 물리라 예전 금빛 hit 그대로다. */
};
export const PROJ_STYLE: Bag = {
  arrow: { c: '#d8c898', r: 3, len: 14 },
  bullet: { c: '#ffe0a0', r: 2, tracer: 22 },   // 포탑 총탄 — 예광 줄기
  bomb: { c: '#3a3630', r: 6 },          // 폭탄 — 심지 불티는 Bomb.update가 따로 뿌린다
  star: { c: '#ffe08a', r: 5, glow: 1 },
  pstar: { c: '#ffe08a', r: 5, glow: 1 },
  bolt: { c: '#8fd8ff', r: 5, glow: 1 },
  fire: { c: '#ff8a3a', r: 6, glow: 1 },
  frost: { c: '#9fe0ff', r: 6, glow: 1 },
  soul: { c: '#c49fff', r: 6, glow: 1 },
  wind: { c: '#bcd8f0', r: 6, glow: 1 },
  rune: { c: '#9fe8d8', r: 6, glow: 1 },
  void: { c: '#a06fff', r: 7, glow: 1 },
  dark: { c: '#9a5fd8', r: 6, glow: 1 },
  poison: { c: '#8fd06a', r: 5, glow: 1 },
  bone: { c: '#e8e0c8', r: 5 }
};
/* 몹이 쏘는 것 중 **물리**인 것. */
export const PHYS_PROJ: Record<string, number> = { arrow: 1, bone: 1, star: 1, bullet: 1 };

export class Proj extends Ent {
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare inflict: [string, number, number?] | null;
  declare crit: boolean; declare dmg: number; declare explode: number; declare fire: number; declare frost: number; declare grav: number;
  declare hitSet: Set<any>; declare life: number; declare pierce: number; declare poison: number; declare team: string; declare type: string;
  declare vol: number; declare ghost: boolean; declare nid: number; declare seenAt: number;   // 멀티플레이 — 참가자 화면의 그림자 투사체

  constructor(x: number, y: number, vx: number, vy: number, dmg: number, team: any, type: string) {
    super(x - 6, y - 6, 12, 12);
    this.vx = vx; this.vy = vy; this.dmg = dmg; this.team = team; this.type = type;
    this.life = 3.2; this.grav = 0; this.pierce = 0; this.hitSet = new Set(); this.crit = false;
    /* ★ 발사음은 **여기 한 군데**에서 낸다. */
    if (team === 'enemy' && typeof G !== 'undefined' && G.sfxAt)
      G.sfxAt(PHYS_PROJ[type] ? 'efire_phys' : 'efire_magic', x / TS, y / TS);
  }
  update(dt: any, world: any, player: any) { const { WW, WH } = dimsOf(world);
    /* 그림자(참가자 화면) — 날아가는 그림만. 맞히는 판정은 호스트가 아바타로 한다. */
    if (this.ghost) { this.x += this.vx * dt; this.y += this.vy * dt; return; }
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const st = PROJ_STYLE[this.type];
    if (st && st.glow && Math.random() < dt * 30) G.parts.push(new Part(this.cx, this.cy, st.c, 0, 0.3));
    if (world.hitSolid(this.x, this.y, this.w, this.h)) { this.impact(); return; }
    if (this.team === 'player') {
      /* 근처 칸 바구니의 몹만 본다(engine core/spatial — 엔티티 갱신 뒤 G.entHash 를 다시 채운다) */
      let spent = false;
      G.entHash.query(this.x, this.y, this.w, this.h, (e: Enemy) => {
        if (e.dead || this.hitSet.has(e) || !aabb(this.rect(), e.rect())) return;
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
        if (this.frost) e.chill(2.5);
        if (this.poison) e.addDot('poison', this.dmg * 0.11 * this.poison, 5);
        if (this.pierce > 0) this.pierce--; else { this.impact(); spent = true; return true; }
      });
      if (spent) return;
      if (G.net) for (const q of G.pvpTargets()) {   // PvP — 내가 쏜 것만 이 화면에 있다
        if (this.hitSet.has(q) || !aabb(this.rect(), q.rect())) continue;
        this.hitSet.add(q);
        G.pvpHit(q, this.dmg, this.cx);
        if (this.pierce > 0) this.pierce--; else { this.impact(); return; }
      }
    } else {
      /* 적 투사체는 세계의 플레이어 누구든 맞힌다(혼자면 player 하나). */
      for (const q of (G.players.length ? G.players : [player]))
        if (aabb(this.rect(), q.rect())) {
          const inf = this.inflict || PROJ_INFLICT[this.type], open = !(q.iframe > 0) && q.hp > 0;   // 무적으로 피한 탄은 걸지도 않는다
          q.hurt(this.dmg, this.cx);
          if (inf && open) q.inflict(inf[0], inf[1], inf[2] ? this.dmg * inf[2] : 0);
          this.impact(); return;
        }
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
export class Part extends Particle {
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare c: string; declare glow: number; declare r: number; declare sq: number;

  /* g 중력 배수 · bounce 를 주면 땅에 부딪혀 튀다 눕는다(돌·흙·나무 파편) — 사연: docs/code-history.md#h37 */
  constructor(x: number, y: number, c: any, vy0 = 0, life = 0.5, o: Bag | null = null) {
    const sp = o && o.spd !== undefined ? o.spd : 1;
    const a = Math.random() * TAU, s = (40 + Math.random() * 140) * sp;
    super(x, y, Math.cos(a) * s, Math.sin(a) * s + vy0, life + Math.random() * 0.3);
    this.c = c;
    this.r = (1.5 + Math.random() * 2) * (o && o.r !== undefined ? o.r : 1);
    this.g = o && o.g !== undefined ? o.g : 1;
    this.sq = o && o.sq !== undefined ? o.sq : 1;
    this.glow = o && o.glow ? 1 : 0;
    this.drag = o && o.drag !== undefined ? o.drag : 0.96;
    this.spin = (Math.random() - 0.5) * 12;
    this.rot = Math.random() * TAU;
    if (o && o.bounce) { this.bounce = o.bounce; this.max = this.life += 0.6; }   // 바닥에 누워 있는 동안 조금 더 남는다
  }
  update(dt: number) { return this.step(dt, 340, this.bounce ? PART_WORLD : null); }
}
/** 파편이 부딪히는 판 — 고체 칸(발판·장식은 지나간다) */
export const PART_WORLD = { solidAt: (px: number, py: number) => !!G.world && G.world.solid(Math.floor(px / TS), Math.floor(py / TS)) };
/** 떠오르는 피해 · 회복 숫자(engine fx/floattext) */
export class DmgText extends FloatText {}
/* ===== 폭탄 ===== */
export class Bomb extends Proj {
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare grav: number; declare life: number; declare spec: Record<string, any>; declare spin: number;

  constructor(x: number, y: number, vx: number, vy: number, spec: Bag) {
    super(x, y, vx, vy, spec.dmg, 'player', 'bomb');
    this.spec = spec;
    this.grav = 900;
    this.life = spec.fuse || 1.6;
    this.spin = 0;
  }
  update(dt: any, world: any) { const { WH } = dimsOf(world);
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
  boom(world: World) {
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
          G.drops.push(new Drop((x + .5) * TS, (y + .5) * TS, makeItem(d.drop, 1)!));
      }
  }
}

export class Drop {
  /* 필드 — 생성자·조각이 채운다. 타입은 차례로 좁힌다 */
  declare dead: boolean; declare h: number; declare item: Record<string, any>; declare life: number; declare pick: number; declare t: number; declare vx: number;
  declare vy: number; declare w: number; declare x: number; declare y: number;

  constructor(x: number, y: number, item: Bag) {
    this.x = x - 8; this.y = y - 8; this.w = 16; this.h = 16; this.item = item;
    this.vx = (Math.random() - 0.5) * 140; this.vy = -160 - Math.random() * 80;
    this.life = 300; this.t = Math.random() * 10; this.pick = 0.5; this.dead = false;
  }
  update(dt: any, world: any, player: any) {
    this.life -= dt; this.pick -= dt; this.t += dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (player.remote) player = G.me;   // 남의 아바타는 줍지 않는다(줍기는 주인 화면 몫)
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
