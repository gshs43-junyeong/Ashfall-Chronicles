/* ===== game/pets.js — 펫 — 알 · 드래곤 먹이 · 따라다니기 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { DRAGON_GATES, DRAGON_STAGE_N, EGG_POOL, PETS, dragonStage } from '../data/pets.js';
import { idef } from '../data/values.js';
import { makeItem } from '../items.js';
import { Drop, Part, Pet } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const PetsPart: Bag = {

  /* ================= 펫 ================= */
  hatchEgg(tier) {
    const p = this.player;
    const id = PETS[tier] ? tier : this.rng.weighted(EGG_POOL[tier]);   // 드래곤 알은 그 드래곤
    const it = makeItem('pet_' + id, 1);
    it.lv = 1;
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    this.toast(tr('{pet|을} 얻었다! (장비창의 펫 칸에 끼울 수 있다)', { pet: PETS[id].n }), 'good');
    UI.refreshBag(); UI.refreshChest();
  },
  /** 드래곤 진화 먹이 — 문턱에서 기다리는(경험치가 다 찬) 드래곤만 먹는다. 먹으면 한 레벨 올라 다음 단계로. */
  feedDragon(slot, stage) {
    const p = this.player, it = p.bag[slot];
    const gate = DRAGON_GATES[stage - 1];
    let fed = null, near = null;
    for (const k of ['pet1', 'pet2']) {
      const pe = p.equip[k];
      if (!pe || !PETS[idef(pe).pet] || !PETS[idef(pe).pet].dragon) continue;
      if ((pe.lv || 1) === gate - 1 && pe.hungry) { fed = pe; break; }
      if ((pe.lv || 1) === gate - 1) near = pe;
    }
    if (!fed) {
      this.toast(near ? tr('아직 경험치가 덜 찼다 — 다 차면 먹는다') : tr('이 먹이를 먹을 드래곤이 없다 — {lv}레벨에서 경험치가 다 찬 드래곤이 먹는다', { lv: gate - 1 }), 'bad');
      return;
    }
    fed.lv = gate; fed.xp = 0; fed.hungry = 0;
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    /* 진화 — 새 모습이 빛 속에서 드러나게: 겹 고리 · 속성 빛 파편 · 짧은 흔들림 · 한동안 번쩍임 */
    const pe = (this.petEnts || []).find(e => e && PETS[e.id] && PETS[e.id].dragon && e.lvOf(p) === gate);
    if (pe) {
      const col = PETS[pe.id].c;
      this.burst(pe.x, pe.y, 'starmerge', 90, 1.6);
      this.ringFx(pe.x, pe.y, 46, col, 0.6); this.ringFx(pe.x, pe.y, 80, '#fff4d8', 0.9);
      for (let i = 0; i < 26; i++) this.parts.push(new Part(pe.x, pe.y, i % 3 ? col : '#fff4d8', -30, 0.9));
      this.shake = Math.max(this.shake, 5); pe.flash = 0.6;
    }
    this.toast(tr('{pet|이} {stage|로} 자랐다!', { pet: idef(fed).n, stage: tr(DRAGON_STAGE_N[dragonStage(gate)]) }), 'good');
    p.recalc(); UI.refreshEquip(); UI.refreshBag(); this.sfx('level');
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
};

mixin(Game.prototype, PetsPart, true);
