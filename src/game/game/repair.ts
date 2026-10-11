/* ===== game/repair.js — 기계 고장 알림 · 렌치로 고치기(고장은 factory/tick.ts wear) ===== */
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { MACHINE } from '../data/recipes.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';

export const RepairPart: Bag = {
  /** 공장 틱(호스트)이 부른다 — 가까이 있으면 알리고 불똥 */
  machineBroke(m: Bag) {
    const p = this.player, cx = (m.x + .5) * TS, cy = (m.y + .5) * TS;
    this.burstSparks(cx, cy, 14);
    if (p && Math.abs(p.cx - cx) < TS * 60 && Math.abs(p.cy - cy) < TS * 40) {
      this.sfxAt('power_off', m.x, m.y);
      this.toast(tr('{m|이} 고장 났다 — 렌치로 고친다', { m: MACHINE[m.t].n }), 'bad');
    }
  },
  /** 렌치 — 톱니바퀴 하나를 갈아 끼운다 */
  repairMachine(m: Bag) {
    const p = this.player;
    if (!p.removeItem('gear_basic', 1)) { this.toast(tr('톱니바퀴가 하나 필요하다'), 'bad'); return false; }
    m.broke = 0; m.fixT = this.time; m.st = '';
    this.burstSparks((m.x + .5) * TS, (m.y + .5) * TS, 10);
    this.sfx('mat_metal'); setTimeout(() => this.sfx('mat_metal', 1.2), 180);
    this.toast(tr('{m|을} 고쳤다', { m: MACHINE[m.t].n }), 'good');
    if (this.net) this.netMachState(m);
    UI.refreshBag();
    if (UI.machRef === m && UI.open === 'machine') UI.refreshMachine();
    return true;
  },
  burstSparks(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) this.parts.push(new Part(x + (Math.random() - .5) * 16, y + (Math.random() - .5) * 12, i % 3 ? '#ffd27a' : '#fff4c0', -140 - Math.random() * 120, .35 + Math.random() * .3));
  }
};
mixin(Game.prototype, RepairPart, true);
