/* ===== data/mobskills.ts — 몹의 스킬 · 플레이어에게 거는 해로운 효과 ===== */
/* 몹 스킬은 셋 갈래: 우리편(ally — 치유 · 북돋움) · 쏘기(shot — 원소 탄, 맞으면 디버프) · 저주(curse — 겨눈 뒤 바로 건다).
   ★ 쏘기 · 저주는 시전 예고(cast 초) 동안 몹 손에 빛이 모인다 — 예고 없이 걸면 피할 길이 없다. */

/** 몹 스킬 — cd 재사용(초) · range 닿는 거리(px) · cast 예고(초) · c 색 · s 소리 */
export const MOB_SKILLS: Bag = {
  heal:      { kind: 'ally', cd: 10, range: 200, cast: 0.6, amt: 0.2, c: '#9ff09f', s: 'sk_heal' },          // 다친 동료(자기 포함) 최대 생명의 2할
  empower:   { kind: 'ally', cd: 15, range: 200, cast: 0.5, dur: 7, mult: 1.35, c: '#ff6a4a', s: 'sk_shout' },   // 주변 동료 공격력 1.35배
  firebolt:  { kind: 'shot', cd: 7, range: 380, cast: 0.45, proj: 'fire', n: 3, spread: 0.16, inflict: ['burn', 4, 0.12], c: '#ff8a3a', s: 'sk_fire' },
  frostbolt: { kind: 'shot', cd: 7, range: 380, cast: 0.45, proj: 'frost', n: 1, inflict: ['frostbite', 3], c: '#9fe0ff', s: 'sk_frost' },
  venom:     { kind: 'shot', cd: 6, range: 320, cast: 0.4, proj: 'poison', n: 2, spread: 0.12, inflict: ['poison', 5, 0.1], c: '#8fd06a', s: 'mat_plant' },
  hex:       { kind: 'curse', cd: 13, range: 340, cast: 0.8, inflict: ['weak', 6], c: '#b07aff', s: 'sk_mark' }
};

/** 몹마다 쓰는 스킬 — 없는 몹은 정예(elite)일 때만 북돋움을 하나 얻는다 */
export const MOB_SKILLSET: Record<string, string[]> = {
  archivist: ['heal', 'hex'], lantern: ['heal'], damp_wisp: ['heal'], sporeling: ['heal', 'venom'],
  crimson_howler: ['empower'], icewolf: ['empower'], foreman: ['empower'], canopy_ape: ['empower'], ruin_guard: ['empower'],
  imp: ['firebolt'], weldarm: ['firebolt'], lavaslug: ['firebolt'], ventspitter: ['firebolt'],
  frostling: ['frostbolt'], frostbound: ['frostbolt'], glacier_stalker: ['frostbolt'], cloudjelly: ['frostbolt'],
  spider: ['venom'], scorpion: ['venom'], bloomspitter: ['venom'], vinelash: ['venom'],
  shadoweye: ['hex'], wraith: ['hex'], minerghost: ['hex'], crimson_eye: ['hex']
};

/** 원소 탄이 플레이어를 맞히면 거는 것 — [버프 id, 초, 초당 피해(탄 피해의 몫 · 없으면 피해 없음)] */
export const PROJ_INFLICT: Record<string, [string, number, number?]> = {
  fire: ['burn', 3, 0.08], frost: ['frostbite', 2], poison: ['poison', 4, 0.08], dark: ['weak', 3], void: ['weak', 4]
};

/** 화면 가장자리 연출 — 디버프 갈래마다 한 겹(다시 걸려도 겹치지 않는다) */
export const DEBUFF_EDGE: Record<string, string> = { frostbite: 'frost', burn: 'burn', poison: 'poison', weak: 'weak' };
