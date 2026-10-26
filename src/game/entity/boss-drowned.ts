/* ===== entity/boss-drowned.ts — 가라앉은 지킴이 — 가라앉은 유적의 잠수 기사 · 사슬에 매단 닻 · 닻을 거두는 동안이 틈 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TILE_DEF } from '../data.js';
import { TS } from '../world.js';
import { DmgText, Enemy, Part } from '../entity.js';
/* ★ 정체성(계획 §3): 닻 사슬. 무거운 잠수복이라 평소엔 ×0.6('잠수복에 막힌다'), 닻을 던져 사슬을 거두는 동안(닻 사슬 기술 · 그 뒤 1.5초)만 ×1.4 —
   닻이 날아가면 그 틈에 파고든다. 가까우면 닻을 사슬째 휘둘러 내리친다. 물에 잠겨 있으면 1.4 배 빨라진다(밀물과 맞물린다).
   첫 파수꾼의 옛 몸놀림(`b_keeper` — 룬 광선 · 지진 돌진)을 같이 쓰던 것을 제 것으로 뗐다. 설계 좌표는 tools/mkbossrig.py drowned_*. 사연: docs/code-history.md#h243 */

/** 설계 칸 표 — 그림(game/boss-drowned-art)과 같은 수 */
export const DK = { K: 4, S: 0.9, W: 40, H: 44, CX: 20, HIPS: [15, 25], HIP_Y: 40, SH: [[8, 19], [32, 19]] as [number, number][], LEG: 30, UP: 11, FOOT: 70 };

export const BossDrowned: Bag & ThisType<Enemy> = {
  /** 닻을 거두는 중인가(사슬 기술 · 내려앉은 뒤 1.5초) */
  dkReeling() { return (this.mv && this.mv.d && this.mv.d.sig === 'anchor' && this.mv.run) || (G.time || 0) < (this.dkOpen || 0); },
  /** 몸놀림 — 무겁게 걸어 다가서고 · 가까우면 닻을 휘두른다 · 물속이면 빨라진다 */
  dkAI(dt: number, world: World, p: Player, dx: number) {
    const T = G.time || 0, wd = TILE_DEF[world.get(Math.floor(this.cx / TS), Math.floor(this.cy / TS))], wet = !!(wd && wd.liquid);
    if (Math.abs(dx) > 10) this.facing = Math.sign(dx);
    this.vx = lerp(this.vx, Math.sign(dx) * this.spd! * (wet ? 1.4 : 0.9) * (Math.abs(dx) > 90 ? 1 : 0.2), dt * 2);
    if (this.onGround && this.hitWall) this.vy = -520;
    if (this.mv && this.mv.d && this.mv.d.sig === 'anchor') this.dkOpen = T + 1.5;
    this.atkCd = this.atkCd ?? 1;
    if (this.atkCd <= 0 && Math.abs(dx) < 170 && !(this.mv && this.mv.d)) {   // 닻 휘두르기
      this.atkCd = 2.2 - (this.pf || 0) * 0.6;
      this.dkSwing = { t: T, s: Math.sign(dx) || 1 };
      this.strike(this.cx + Math.sign(dx) * 110, this.y + this.h, { r: 70, delay: 0.6, fx: 'water' }, { c: '#7fc8e8' }, 0.9);
    }
    if (Math.random() < dt * 3) G.parts.push(new Part(this.cx + (this.facing || 1) * 14, this.y + 10, '#bfefff', -60, 1.4, { r: 2 + Math.random() * 2, g: -0.2 }));   // 공기 밸브 거품
    this.dkStep = (this.dkStep || 0) + Math.abs(this.vx) * dt / 44;
    this.move(dt, world);
  },
  /** 받는 피해 — 닻을 거두는 동안만 잠수복이 열린다 */
  dkHurt(a: number) {
    if (this.dkReeling()) return a * 1.4;
    if (Math.random() < 0.3) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 30, this.y - 10, tr('잠수복에 막힌다'), '#a8884a', 0));
    return a * 0.6;
  },
};

mixin(Enemy.prototype, BossDrowned, true);
