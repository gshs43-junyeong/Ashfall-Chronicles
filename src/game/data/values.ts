/* ===== data/values.js — 물건값 · 스킬 연출 · 입자 상한 · 설정 기본값 ===== */
import { clamp } from '../../engine/core/math.js';
import { TILE_DEF, WEAPON_TIER_LV } from '../data.js';
import { ITEMS } from './items.js';
import { RECIPES } from './recipes.js';
import { ENEMIES } from './enemies.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ================= 물건값 ================= */
export const VAL_R = 1.55;     // 등급 한 칸에 값이 몇 배
export const VAL_0 = 3.3;      // 0등급 재료 한 개
export const VAL_SHARE = 0.5;  // 몹이 내놓는 금화 중 재료 몫
export const VAL_CAP = 0.45;   // 한 가지 재료가 가져갈 수 있는 최대 몫
export const VAL_MIN = 3;      // 재료 바닥값
export const VAL_CRAFT = 1.30; // 만들면 붙는 값
export const VAL_GEAR = 1.45;  // 장비는 조금 더
/* 광맥의 등급. */
export const ORE_TIER: Record<string, number> = {
  copper_ore: 1, lead_ore: 1, coal: 1, iron_ore: 2, crude_oil: 2, steel_plate: 3,
  crystal: 3, gold_ore: 3, mythril_ore: 4, soul_shard: 4, hell_ore: 4,
  aether_shard: 5, power_core: 5, draft_glass: 6, orbit_gear: 6
};

export const ITEM_VAL = (() => {
  const V: Bag = {}, step = (t: any) => VAL_0 * Math.pow(VAL_R, t);
  const made: Bag = {}, recipesOf: Bag = {};
  for (const r of RECIPES) { if (!made[r.out]) made[r.out] = r; (recipesOf[r.out] = recipesOf[r.out] || []).push(r); }

  for (const id in ITEMS) if (ITEMS[id].price) V[id] = ITEMS[id].price;

  for (const d of TILE_DEF) {
    if (!d.drop || V[d.drop] !== undefined) continue;
    if (ORE_TIER[d.drop] !== undefined) V[d.drop] = step(ORE_TIER[d.drop]);
    else if (d.ore) V[d.drop] = step((d.hard || 0) + 1);
  }
  for (const d of TILE_DEF)
    if (d.drop && V[d.drop] === undefined && !made[d.drop]) V[d.drop] = step(0) * 0.35;

  /* 보스는 **나중에 따로 본다.** */
  for (const bossPass of [0, 1]) {
    const lo: Bag = {}, hi: Bag = {};
    for (const k in ENEMIES) {
      const e = ENEMIES[k];
      if (!e.boss !== !bossPass) continue;          // 이 차례의 것만
      // 바다 부유물은 값 매김에서 뺀다 — 금화가 적은 짐짝이 나무·해초 값을 끌어내린다
      if (e.ai === 'flotsam') continue;
      const ds = e.drops || [];
      let tot = 0;
      for (const [id, c, a, b] of ds) if ((ITEMS[id] || {}).type === 'mat') tot += c * (a + b) / 2;
      if (!tot) continue;
      const per = Math.min((e.gold || 1) * VAL_SHARE / tot, (e.gold || 1) * VAL_CAP);
      for (const [id] of ds) {
        const d: Bag = ITEMS[id] || {};
        if (d.type !== 'mat' || d.price || made[id] || V[id] !== undefined) continue;
        lo[id] = lo[id] === undefined ? per : Math.min(lo[id], per);
        hi[id] = hi[id] === undefined ? per : Math.max(hi[id], per);
      }
    }
    for (const id in lo) V[id] = Math.sqrt(lo[id] * hi[id]);
  }

  const busy: Bag = {}, GEARY: Record<string, number> = { weapon: 1, armor: 1, tool: 1, acc: 1 };
  const cost = (id: string, dep: any) => {
    if (V[id] !== undefined) return V[id];
    const r = made[id];
    if (!r || dep > 14 || busy[id]) return (V[id] = step(0));
    busy[id] = 1;
    /* ★ 만드는 법이 여럿이면 **가장 싼 법**으로 값을 매긴다 — 첫 제작법만 보면 싼 대체법(불씨꼬투리 → 압축 연료 8.9배,
       약초 → 치유 물약 5.5배)으로 만들어 비싼 값에 파는 금화 샘이 생겼다. */
    let best = Infinity;
    for (const r2 of (recipesOf[id] || [r])) {
      let c = 0, bad = false;
      for (const k in r2.need) { if (busy[k]) { bad = true; break; } c += cost(k, dep + 1) * r2.need[k]; }
      if (!bad) best = Math.min(best, c / (r2.n || 1));
    }
    if (!isFinite(best)) { let c = 0; for (const k in r.need) c += cost(k, dep + 1) * r.need[k]; best = c / (r.n || 1); }
    return (V[id] = best * (GEARY[(ITEMS[id] || {}).type!] ? VAL_GEAR : VAL_CRAFT));
  };
  for (const r of RECIPES) cost(r.out, 0);

  // 쓰이기만 하는 재료 — 나란히 적힌 것들의 값으로 자리를 잡는다
  const sourced: Bag = {};
  for (const id in ITEMS) if (ITEMS[id].price || made[id]) sourced[id] = 1;
  for (const d of TILE_DEF) if (d.drop) sourced[d.drop] = 1;
  for (const k in ENEMIES) for (const [id] of (ENEMIES[k].drops || [])) sourced[id] = 1;
  for (let pass = 0; pass < 2; pass++) {
    for (const id in ITEMS) {
      if (sourced[id] || ITEMS[id].type !== 'mat') continue;
      const peers = [];
      for (const r of RECIPES) {
        if (!r.need[id]) continue;
        for (const k in r.need) if (k !== id && V[k]) peers.push(V[k]);
      }
      if (!peers.length) continue;
      peers.sort((a, b) => a - b);
      V[id] = peers[Math.floor(peers.length / 2)];
    }
  }

  // 등급 사다리 — 만들 수 있는 무기들을 로그 자리에서 직선으로 맞춘다.
  const pts = [];
  for (const r of RECIPES) {
    const d = ITEMS[r.out];
    if (d && d.type === 'weapon' && d.tier !== undefined && V[r.out] > 0)
      pts.push([d.tier, Math.log(V[r.out])]);
  }
  let a = 0.48, b0 = Math.log(120);
  if (pts.length > 1) {
    const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
    const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
    a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    b0 = (sy - a * sx) / n;
  }
  const ladder = (t: any) => Math.exp(b0 + a * clamp(t, 0, WEAPON_TIER_LV.length - 1));
  const lvTier = (lv: number) => {
    let t = 0;
    for (let i = 0; i < WEAPON_TIER_LV.length; i++) if ((lv || 1) >= WEAPON_TIER_LV[i]) t = i;
    return t;
  };
  const fac: Bag = {};
  for (const ty in GEARY) {
    const xs = RECIPES.map(r => r.out).filter(id => (ITEMS[id] || {}).type === ty)
      .map(id => V[id] / ladder(ITEMS[id].tier !== undefined ? ITEMS[id].tier : lvTier(ITEMS[id].lvReq!)))
      .filter(x => x > 0 && isFinite(x));
    fac[ty] = xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : 1;
  }
  for (const id in ITEMS) {
    if (V[id] !== undefined) continue;
    const d = ITEMS[id];
    if (fac[d.type!] !== undefined)
      V[id] = ladder(d.tier !== undefined ? d.tier : lvTier(d.lvReq!)) * fac[d.type!];
    else if (d.type === 'consum') V[id] = 22;
    else if (d.type === 'block') V[id] = 2;
    else V[id] = step(0);
  }
  for (const id in ITEMS)
    if (ITEMS[id].type === 'consum' && !ITEMS[id].price) V[id] = Math.max(V[id] || 0, 22);

  for (const id in V) V[id] = Math.max((ITEMS[id] || {}).type === 'mat' ? VAL_MIN : 1, Math.round(V[id]));
  return V;
})();

/* ================= 스킬 손맛 ================= */
export const SKILL_FX: Bag = {
  /* 검투사 */
  s_cleave:   { s: 'sk_slash',  k: 7,  st: .04, c: '#ffb24a', r: 108 },
  s_charge:   { s: 'sk_charge', k: 10, st: .05, c: '#ffd07a', r: 46 },
  s_whirl:    { s: 'sk_slash',  k: 6,  st: 0,   c: '#ffcf6a', r: 96 },
  s_quake:    { s: 'sk_quake',  k: 14, st: .07, c: '#c8845a', r: 60 },
  s_guard:    { s: 'sk_guard',  k: 4,  st: 0,   c: '#d8a05a', r: 52 },
  s_warcry:   { s: 'sk_shout',  k: 10, st: .05, c: '#e8a04a', r: 190 },
  /* 유격 */
  s_volley:   { s: 'sk_volley', k: 4,  st: 0,   c: '#9fe07a', r: 54 },
  s_rain:     { s: 'sk_volley', k: 6,  st: 0,   c: '#9fe07a', r: 70 },
  s_pierce:   { s: 'sk_pierce', k: 5,  st: .03, c: '#9fe07a', r: 46 },
  s_smoke:    { s: 'sk_smoke',  k: 0,  st: 0,   c: '#b8c8b0', r: 150 },
  s_mark:     { s: 'sk_mark',   k: 0,  st: 0,   c: '#e8d05a', r: 40 },
  /* 술사 */
  s_fireball: { s: 'sk_fire',   k: 4,  st: 0,   c: '#ff9a4a', r: 44 },
  s_nova:     { s: 'sk_frost',  k: 7,  st: .04, c: '#9fe0ff', r: 160 },
  s_meteor:   { s: 'sk_fire',   k: 4,  st: 0,   c: '#ffb04a', r: 60 },   // 떨어질 때가 진짜다
  s_heal:     { s: 'sk_heal',   k: 0,  st: 0,   c: '#9ff09f', r: 42 },
  s_barrier:  { s: 'sk_shield', k: 0,  st: 0,   c: '#6fb8ff', r: 48 },
  s_chain:    { s: 'sk_bolt',   k: 5,  st: .03, c: '#ffe86a', r: 44 },
  s_blink:    { s: 'sk_blink',  k: 4,  st: 0,   c: '#c08fff', r: 48 },
  s_wolf:     { s: 'sk_summon', k: 4,  st: 0,   c: '#c8b88a', r: 56 }
};
/* 운석이 실제로 닿는 순간 — 이 게임에서 가장 큰 한 방이라 멈춤도 가장 길다 */
export const SKILL_HIT = { meteor: { s: 'sk_meteor', k: 20, st: .10 } };

/* ---------------- 특별한 스킬의 고유 연출 ---------------- */
export const SIG_FX = {
  whirl:   { a: .50, n: 3, t: 0 },    // 채널 내내 — 피해 박자(0.28초)마다 3개씩만
  rain:    { a: .46, n: 0, t: 0 },    // 떨어질 띠. 입자 없음 — 이건 연출이 아니라 정보다
  wolf:    { a: .55, n: 7, t: .45 },
  fall:    { a: .85, n: 0, t: .90 },  // 떨어지는 별. 하늘에 있어 진해도 아무것도 안 가린다
  flash:   { a: .20, n: 0, t: .18 },  // 착탄 섬광. 0.2를 넘기면 적이 흰 바닥에 묻힌다
  undying: { a: .34, n: 0, t: .55 }   // 화면 테두리가 한 번 붉게 — 살아남은 그 한 번
};
/* 스킬 무대 연출(game/stage-fx) — 스킬은 한 번 치는 공격이 아니라 사건이라, 화면 전체와 몸 둘레가 같이 반응한다.
   fl [색, 세기, 초] 화면 섬광(더하기 · ★ 0.18 이하 — 넘기면 적이 흰 화면에 묻힌다) · dim [세기, 초] 시전자 둘레만 남기고 어둡게 ·
   ln [색, 초, 개수, 나란히?] 시전자로 모이는 집중선(넷째 칸이 있으면 바라보는 쪽과 나란한 속도선) · ob [색, 개수, 반지름, 초] 몸을 도는 빛 · cv 색 — 둘레에서 빨려 드는 불티 · lens 색 — 가로 빛살 ·
   edge [색, 초] 화면 테두리. 모두 '화면 효과' 설정 배율을 곱한다 */
export const SKILL_STAGE: Record<string, Bag> = {
  s_cleave:   { fl: ['255,190,110', .08, .14], ln: ['255,210,140', .22, 26], cv: '#ffd07a' },
  s_charge:   { ln: ['255,224,170', .38, 40, 1], lens: '#ffe0a0' },
  s_whirl:    { ob: ['#ffcf6a', 8, 58, 1.6], cv: '#ffd07a', ln: ['255,210,120', .3, 22] },
  s_quake:    { fl: ['255,170,100', .1, .18], dim: [.32, .8], ln: ['255,180,120', .3, 34], edge: ['200,120,70', .5] },
  s_guard:    { ob: ['#ffe0a0', 6, 30, 1.0], lens: '#ffe0a0', cv: '#e8b86a' },
  s_warcry:   { fl: ['255,200,120', .12, .22], dim: [.3, .9], ln: ['255,200,120', .5, 56], ob: ['#ffd88a', 10, 46, 1.3], edge: ['232,160,74', .7] },
  s_volley:   { lens: '#d8ffb0', cv: '#bff09a' },
  s_rain:     { dim: [.26, 1.1], fl: ['190,240,150', .06, .2], cv: '#bff09a' },
  s_pierce:   { lens: '#d8ffb0', ln: ['210,255,180', .22, 30], cv: '#bff09a' },
  s_smoke:    { dim: [.4, 1.2], ob: ['#c8d8c0', 8, 40, 1.2] },
  s_mark:     { dim: [.28, .7], edge: ['255,224,112', .5], lens: '#ffe070' },
  s_fireball: { lens: '#ffb060', cv: '#ffb060' },
  s_nova:     { fl: ['200,240,255', .14, .2], dim: [.3, .8], ob: ['#bfefff', 10, 42, 1.0], edge: ['150,210,255', .6] },
  s_heal:     { fl: ['170,255,170', .08, .25], ob: ['#c8ffc0', 12, 30, 1.5], edge: ['120,230,130', .6] },
  s_barrier:  { ob: ['#bfe0ff', 10, 36, 1.4], lens: '#bfe0ff', fl: ['170,210,255', .06, .2] },
  s_wolf:     { dim: [.24, .9], ob: ['#fff0c8', 8, 40, 1.2], cv: '#e8d8a8' },
  s_chain:    { fl: ['255,240,150', .1, .12], ln: ['255,240,150', .2, 30], cv: '#ffe86a' },
  s_blink:    { fl: ['200,160,255', .12, .14], ln: ['200,160,255', .2, 28, 1] },
  s_meteor:   { dim: [.42, 1.6], edge: ['255,150,60', 1.2], cv: '#ffb04a', ob: ['#ffd07a', 8, 50, 1.2] },
  s_meteor_hit: { fl: ['255,220,160', .18, .3], ln: ['255,200,120', .45, 60], edge: ['255,140,50', .8] }
};
/* 입자 전체 상한. */
export const PART_CAP = 900;

/* 아이템 인스턴스 → 정의. */
export function idef(it: Bag) { return ITEMS[it.id]; }

/* 설정 기본값. */
export const SET_DEFAULT = { music: 40, sfx: 50, shake: 100, dmgnum: 1, minimap: 1,
  hud_tabbar: 1, hud_quest: 1, hud_buffs: 1, hud_clock: 1, hud_hotbar: 1,   // 화면 구성 — 끄면 body 에 hide-* 를 단다
  dlgtype: 1,          // 대사가 한 글자씩 흘러나오는 연출 (끄면 한 번에 뜬다)
  fishduel: 1,         // 낚시 겨루기(game/fish-duel.ts) — 끄면 입질에 한 번 누르는 예전 방식
  view: 100, uiscale: 100, quality: 'auto', keys: null as Bag | null, notice: null as Bag | null };
