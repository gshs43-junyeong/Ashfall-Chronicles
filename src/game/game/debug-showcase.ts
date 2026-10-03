/* ===== game/debug-showcase.ts — 영상 촬영용 바로가기(?debug=showcase) ===== */
/* 게임플레이 영상(소개 글 · 상점 페이지)을 찍을 때 "실제로 그만큼 놀아 온 사람"처럼 보이는 캐릭터로 시작한다 —
   세션에 맞는 레벨 · 직업 주 능력치 · 한 갈래로 찍은 특성 · 그 구간 등급의 장비(접사 포함) · 유틸리티 · 펫 · 가방 · 지도 탐험 기록.
   ★ 시험장 알림 · 장 카드 · 서장 이야기를 띄우지 않는다(game.ts quietStart) — 화면에 "디버그" 흔적이 남으면 영상을 못 쓴다.
   수치는 레벨 기준(CLAUDE.md §8 '레벨 기준')을 따른다: 세션 1 중반 24 · 세션 2 46 · 세션 3 64. */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { ITEMS } from '../data/items.js';
import { VILLAGE } from '../data/start.js';
import { BRANCHES, SKILLS } from '../data/skills.js';
import { SESSIONS } from '../data/story.js';
import { TS } from '../world.js';
import { makeItem, rollGear } from '../items.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';

/** 세션마다 갖출 것 — [무기(갈래별)], 방어구 셋, 장신구 둘, 유틸리티 둘, 가방, 펫, 곡괭이, 가방 속 */
const KIT: (Bag | null)[] = [
  null,
  { lv: 24, ch: 4, gold: 2400, rar: [1, 2], weapon: { blade: 'sword_iron', ranger: 'bow_iron', arcane: 'staff_flame' },
    armor: ['helm_iron', 'chest_iron', 'boots_iron'], acc: ['ring_focus', 'amul_ember'], util: ['det_metal'], bag: 'bag_satchel',
    pets: [['dust_sparrow', 6]], pick: 'pick_iron',
    items: [['torch', 64], ['potion_hp', 12], ['potion_mp', 6], ['bomb_small', 8], ['food_stew', 5], ['plank', 120], ['platform', 60], ['stone', 180]],
    mats: [['wood', 86], ['copper_bar', 14], ['iron_ore', 23], ['iron_bar', 6], ['gold_ore', 9], ['crystal', 4], ['leaf_oak', 17], ['raw_meat', 5]] },
  { lv: 46, ch: 1, gold: 38000, rar: [2, 3], weapon: { blade: 'sword_mythril', ranger: 'bow_storm', arcane: 'staff_frost' },
    armor: ['helm_mythril', 'chest_mythril', 'boots_mythril'], acc: ['charm_cloud', 'charm_leech'], util: ['det_metal', 'det_mob'], bag: 'bag_pack',
    pets: [['frost_kit', 9], ['ash_owl', 6]], pick: 'pick_mythril',
    items: [['torch', 99], ['potion_hp_greater', 14], ['potion_mp', 8], ['bomb_big', 6], ['bomb_dig', 8], ['food_pie', 6], ['brick', 160], ['platform', 80], ['plank', 99]],
    mats: [['mythril_ore', 31], ['mythril_bar', 8], ['iron_bar', 27], ['steel_plate', 12], ['circuit', 7], ['motor', 3], ['soul_shard', 11], ['crystal', 16], ['wood', 140]] },
  { lv: 64, ch: 1, gold: 165000, rar: [3, 4], weapon: { blade: 'spear_tide', ranger: 'bow_harpoon', arcane: 'orb_abyss' },
    armor: ['helm_diver', 'chest_scale', 'boots_fin'], acc: ['ring_pearl', 'charm_ink'], util: ['tank_deep', 'det_mob'], bag: 'bag_abyss',
    pets: [['ember_drake', 14], ['storm_falcon', 10]], pick: 'pick_abyss',
    items: [['torch', 99], ['potion_hp_greater', 18], ['potion_mp_greater', 8], ['bomb_big', 8], ['bomb_dig', 10], ['food_curry', 6], ['brick', 200], ['platform', 99], ['potion_glow', 4]],
    mats: [['kelp', 42], ['crab_shell', 13], ['shark_tooth', 7], ['abyss_pearl', 5], ['ink_sac', 9], ['sea_salt', 26], ['steel_plate', 30], ['circuit', 18], ['hell_ore', 21], ['soul_shard', 24]] }
];
/** 직업 → 특성 갈래 · 주 능력치 */
const ROLE: Record<string, [string, string]> = {
  wanderer: ['blade', 'str'], digger: ['blade', 'str'], stray: ['blade', 'str'], ranger: ['ranger', 'dex'], adept: ['arcane', 'int']
};

export const ShowcasePart: Bag = {
  showcaseStart(qs: any) {
    const p = this.player, w = this.world, { WW, WH } = w.dims;
    const sess = clamp(+qs.get('sess') || 2, 1, SESSIONS.length), K = KIT[sess]!;
    const [br, main] = ROLE[p.charId] || ROLE.wanderer;
    // 이야기 — 세션 2 부터는 여명 마을이 열려 있어야 앞뒤가 맞는다
    this.chapter = qs.get('ch') !== null ? +qs.get('ch') : SESSIONS[sess - 1].ch0 + K.ch;
    if (sess >= 2) {
      this.villageUnlocked = true; w.restoreDawnCity();
      const vlv = Math.min(VILLAGE.length - 1, sess);
      for (let k = 2; k <= vlv; k++) w.upgradeVillage(k);
      w.dawnCity.lv = vlv;
    }
    if (sess === 1) p.starOrbits = p.starLit = this.chapter;          // 장마다 곁을 도는 별 조각
    // 레벨 — 실제 곡선(addXp 와 같은 식)으로 올리고, 경험치 막대는 중간쯤
    const plv = +qs.get('plv') || K.lv;
    while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(40 * Math.pow(p.level, 1.42)); }
    p.xp = Math.round(p.xpNext * (0.3 + this.rng.next() * 0.4));
    // 능력치 — 주 능력치 6 · 체력 3 · 나머지 1 의 비율로 다 찍는다
    const pts = p.statPts, share: Bag = { [main]: 0.6, vit: 0.3 };
    for (const k of ['str', 'dex', 'int', 'vit']) if (!share[k]) share[k] = 0.05;
    let left = pts;
    for (const k in share) { const n = Math.floor(pts * share[k]); p.base[k] += n; left -= n; }
    p.base[main] += left; p.statPts = 0;
    // 특성 — 제 갈래를 위에서부터 채우고, 남으면 이웃 갈래의 밑동. 1점은 남긴다(막 레벨 올린 사람처럼)
    p.skills = {}; p.slots = [null, null, null, null];
    const learn = (ids: string[]) => {                      // 배울 수 있는 칸을 한 랭크씩 — 더 못 배울 때까지 되풀이
      for (let more = true; more && p.skillPts > 1;) {
        more = false;
        for (const id of ids) {
          const sk = SKILLS[id];
          if (p.skillPts <= 1 || (p.skills[id] || 0) >= sk.max! || UI.lockReason(id)) continue;
          p.skillPts--; p.skills[id] = (p.skills[id] || 0) + 1; more = true;
          if (sk.type === 'active' && !p.slots.includes(id)) { const e = p.slots.indexOf(null); if (e >= 0) p.slots[e] = id; }
        }
      }
    };
    learn(BRANCHES.find(b => b.id === br)!.nodes);
    learn(BRANCHES.filter(b => b.id !== br).flatMap(b => b.nodes.filter(id => SKILLS[id].tier === 0)));
    for (const t of [1, 2, 3]) learn(BRANCHES.filter(b => b.id !== br).flatMap(b => b.nodes.filter(id => SKILLS[id].tier! <= t)));
    // 장비 — 그 구간 등급(접사 포함)으로 굴린다. 같은 씨앗이면 같은 장비라 다시 찍어도 화면이 같다
    const gear = (id: string) => {
      if (!ITEMS[id]) return null;
      const [lo, hi] = K.rar;
      for (let i = 0; i < 400; i++) { const it = rollGear(id, this.rng, 2); if (it && it.r >= lo && it.r <= hi) return it; }
      return makeItem(id, 1, lo);
    };
    p.equip.weapon = gear(K.weapon[br]);
    [p.equip.helm, p.equip.chest, p.equip.boots] = K.armor.map(gear);
    [p.equip.acc1, p.equip.acc2] = K.acc.map(gear);
    p.equip.util1 = makeItem(K.util[0], 1, 0); p.equip.util2 = K.util[1] ? makeItem(K.util[1], 1, 0) : null;
    if (ITEMS[K.bag]) p.equip.bag = makeItem(K.bag, 1, 0);
    K.pets.forEach(([id, lv]: [string, number], i: number) => {
      const it = makeItem('pet_' + id, 1); if (!it) return;
      it.lv = lv; p.equip['pet' + (i + 1)] = it;
    });
    p.recalc();
    // 가방 — 처음 짐은 비우고 손에 익은 순서로(곡괭이 · 횃불 · 물약 · 폭탄 · 음식 · 블록)
    p.bag = new Array(p.bag.length).fill(null);
    if (p.charId === 'digger') p.equip.weapon = gear(sess >= 3 ? 'pick_abyss' : K.pick);
    else p.addItem(gear(K.pick));
    for (const [id, n] of K.items) if (ITEMS[id]) {
      const max = ITEMS[id].stack || 1;
      for (let m = n; m > 0; m -= max) p.addItem(makeItem(id, Math.min(max, m), 0));
    }
    for (const [id, n] of K.mats) if (ITEMS[id]) p.addItem(makeItem(id, n, 0));   // 그 구간에서 모았을 법한 재료(단축칸 뒤)
    p.gold = +qs.get('gold') || K.gold + Math.floor(this.rng.next() * K.gold * 0.2);
    p.prof.farm.lv = 1 + sess * 2; p.prof.fish.lv = 1 + sess * 2;
    p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
    // 지도 — 지금까지 걸어 다녔을 지표 띠를 밝혀 둔다(세션마다 넓게). 처음 시작한 듯한 까만 지도는 영상에서 어색하다
    const span = [0, 520, 1500, 2600][sess], cx = Math.floor(p.cx / TS);
    for (let x = Math.max(0, cx - span); x < Math.min(WW, cx + span); x++) {
      const s = w.surface[x] || 0;
      for (let y = Math.max(0, s - 26); y < Math.min(WH, s + 34); y++) w.explored[y * WW + x] = 1;
    }
    this.buildMapAtlas();
    if (qs.get('at') === 'village' && w.dawnCity) {
      const d = w.dawnCity; p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    }
    this.syncPets();
    UI.refreshBag(); UI.refreshEquip(); UI.refreshTracker(); UI.refreshSkillbar(); UI.refreshStatAlloc();
  }
};

mixin(Game.prototype, ShowcasePart, true);
