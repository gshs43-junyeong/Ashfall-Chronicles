/* ===== items.js — 아이템 인스턴스: 만들기 · 능력치 · 이름 · 장비 굴리기 · 상자 전리품 ===== */
import { clamp } from '../engine/core/math.js';
import { PREFIX, RARITY_MULT, SUFFIX, WEAPON_TIER_LV } from './data.js';
import { ITEMS } from './data/items.js';
import { petLvMul } from './data/pets.js';
import { idef } from './data/values.js';

export function makeItem(id: any, count = 1, rarity = 0, affixes: any = null) {
  const def = ITEMS[id];
  if (!def) { console.warn('unknown item', id); return null; }
  const it: Bag = { id, c: count, r: rarity | 0 };
  if (affixes && affixes.length) it.a = affixes;
  return it;
}
export function maxStack(it: Bag) { return idef(it).stack || 1; }
export function isGear(it: Bag) { const t = idef(it).type; return t === 'weapon' || t === 'armor' || t === 'acc' || t === 'tool' || t === 'bag' || t === 'pet'; }
/* 장비 최소 착용 레벨. */
export function equipReqLv(id: string) {
  const d = ITEMS[id];
  if (!d) return 1;
  if (d.lvReq !== undefined) return d.lvReq;
  // 무기는 등급 표에서 뽑는다(WEAPON_TIER_LV 주석 참고).
  if (d.type === 'weapon' && d.tier !== undefined) return WEAPON_TIER_LV[d.tier] || 1;
  if (d.tier !== undefined) return d.tier * 4;
  return 1;
}

/** 접사 한 칸의 표 항목 — ★ 아이템에는 번호(i)만 저장한다: 이름을 글자째 두면 한국어로 만든 장비를
    다른 언어로 열 때 접사만 한국어로 남았다. 번호가 없는 옛 항목({n, s})은 그대로 쓴다. */
export function affixOf(a: any) { const t = a.k === 'p' ? PREFIX : SUFFIX; return a.i !== undefined && t[a.i] ? t[a.i] : a; }
/** 옛 접사({n, s})의 표 번호 — 능력치가 접사마다 다르니 능력치로, 안 되면 이름으로 찾는다(세이브 판올림) */
export function affixIndex(a: any) {
  const t = a.k === 'p' ? PREFIX : SUFFIX, js = JSON.stringify(a.s || {});
  let i = t.findIndex(x => JSON.stringify(x.s) === js);
  if (i < 0) i = t.findIndex(x => x.n === a.n);
  return i;
}

/** 접사 + 희귀도가 반영된 종합 스탯 */
export function itemStats(it: Bag) {
  const d = idef(it), s = Object.assign({}, d.b || {});
  const add = (o: Bag) => { for (const k in o) s[k] = (s[k] || 0) + o[k]; };
  if (d.lifesteal) add({ lifesteal: d.lifesteal });
  if (d.fire) add({ fire: d.fire });
  if (d.frost) add({ frost: d.frost });
  if (d.poison) add({ poison: d.poison });
  if (it.a) for (const a of it.a) add(affixOf(a).s);
  // 펫 레벨은 패시브를 통째로 키운다 — 펫이 자라는 감각이 여기서 나온다
  if (d.type === 'pet' && (it.lv || 1) > 1) { const m = petLvMul(it.lv); for (const k in s) s[k] *= m; }
  // 희귀도는 방어구/장신구 부가 스탯도 함께 올린다
  const m = RARITY_MULT[it.r];
  if (m !== 1) for (const k in s) if (k !== 'jump' && k !== 'fire' && k !== 'frost') s[k] = Math.round(s[k] * m * 10) / 10;
  if (s.allStat) { s.str = (s.str || 0) + s.allStat; s.dex = (s.dex || 0) + s.allStat; s.int = (s.int || 0) + s.allStat; s.vit = (s.vit || 0) + s.allStat; delete s.allStat; }
  return s;
}
export function itemName(it: Bag) {
  const d = idef(it);
  let n = d.n;
  if (it.a) {
    const pre = it.a.filter((a: any) => a.k === 'p'), suf = it.a.filter((a: any) => a.k === 's');
    if (pre.length) n = affixOf(pre[0]).n + ' ' + n;
    if (suf.length) n = n + affixOf(suf[0]).n;
  }
  if (it.e) n += ' +' + it.e;
  return n;
}
/* 강화 배수. */
export function enhMul(it: Bag) { return RARITY_MULT[it.r] + 0.05 * (it.e || 0); }
export function itemDamage(it: Bag) {
  const d = idef(it);
  if (!d.dmg) return 0;
  const s = itemStats(it);
  return d.dmg * enhMul(it) * (1 + (s.dmgP || 0));
}
export function itemSpeed(it: Bag) {
  const d = idef(it), s = itemStats(it);
  return (d.spd || 2) * (1 + (s.spdP || 0));
}

/** 전리품 굴리기: 등급/접사 랜덤 */
export function rollGear(id: string, rng: RNG, luckTier = 0) {
  const d = ITEMS[id];
  if (!d) return null;
  let r = rng.weighted([[0, 46], [1, 27], [2, 15], [3, 8], [4, 3.2], [5, 0.8 + luckTier * 0.4]]);
  const it = makeItem(id, 1, r);
  if (isGear(it!) && r > 0) {
    const a = [];
    if (rng.chance(0.35 + r * 0.12)) { const p = rng.pick(PREFIX); a.push({ k: 'p', i: PREFIX.indexOf(p) }); }
    if (rng.chance(0.22 + r * 0.12)) { const s = rng.pick(SUFFIX); a.push({ k: 's', i: SUFFIX.indexOf(s) }); }
    if (a.length) it!.a = a;
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
export function rollChest(tier: any, rng: any, source: any) {
  // 유적 상자는 탐험 보상은 남기되, 제작·채굴 진행을 건너뛰지 않도록 별도 테이블을 쓴다.
  const ruin = source === 'ruin';
  const lootTier = ruin ? Math.min(tier, 4) : tier;
  const gold = !ruin && tier >= 6;   // 큰 동굴의 황금 상자만 기존의 고보상을 유지한다
  const spec = CHEST_LOOT[clamp(lootTier, 1, 5)];
  const out = [];
  /* 황금 상자(gold)는 장비 2~3개 · 등급 6까지다 — 재료를 확정·최대 수량으로 주면 하나만 열어도 한 단계를 통째로 건너뛴다 — 사연: docs/code-history.md#h23 */
  const nGear = ruin ? 1 : gold ? rng.int(2, 3) : rng.int(1, 2);
  for (let i = 0; i < nGear; i++) out.push(rollGear(rng.pick(spec!.gear), rng, ruin ? 0 : gold ? 6 : tier));
  for (const [id, a, b] of spec!.mats) {
    if (!rng.chance(ruin ? 0.48 : gold ? 0.85 : 0.72)) continue;
    const count = rng.int(a, b);
    out.push(makeItem(id, ruin ? Math.max(1, Math.floor(count * 0.6)) : count));
  }
  out.push(makeItem('gold_ore', ruin ? rng.int(1, 2) : rng.int(gold ? 6 : 1, gold ? 11 : 4)));
  return out.filter(Boolean);
}

