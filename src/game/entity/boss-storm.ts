/* ===== entity/boss-storm.ts — 폭풍의 수호자 — 몸을 두른 바람은 내리꽂을 때만 걷힌다 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { DmgText, Enemy } from '../entity.js';
/* ★ 대사 "내리꽂을 때만, 닿는다"(BOSS_LINES.storm_warden.2)가 공략이다 — 급강하(state 1 · dash 기술) 동안만 바람이 걷혀 제대로 맞는다.
   그 밖에는 받는 피해 ×0.55 — 더 낮추면 원거리 직업이 기다리기만 한다. 그림은 game/boss-storm-art(고리가 벌어지고 바람결이 걷힌다). 사연: docs/code-history.md#h233 */

export const BossStorm: Bag & ThisType<Enemy> = {
  /** 지금 내리꽂는 중인가 */
  swDiving() { return this.state === 1 || !!(this.mv && this.mv.d && this.mv.d.k === 'dash' && this.mv.run); },
  /** 받는 피해 — 급강하 땐 ×1.25, 아니면 바람에 흩어져 ×0.55 */
  swHurt(a: number) {
    if (this.swDiving()) return a * 1.25;
    if (Math.random() < 0.3) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 30, this.y - 10, tr('바람에 흩어진다'), '#cfe6ff', 0));
    return a * 0.55;
  },
};
mixin(Enemy.prototype, BossStorm, true);
