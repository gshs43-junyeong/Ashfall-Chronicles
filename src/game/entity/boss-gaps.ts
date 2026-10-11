/* ===== entity/boss-gaps.js — 보스의 틈 — 기술 뒤 비틀거림 · 과열 · 균열, 예고 중 방어 자세. 그림은 game/boss-gap-fx ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { SURGE_FLY } from '../data/skills.js';
import { BOSS_GAP, GAP_BRACE, GAP_KIND, GAP_MISS_MUL } from '../data/bossmoves.js';
import { Enemy } from '../entity.js';
/* ★ 틈 · 방어 자세는 호스트가 정하고(기술을 돌리는 쪽) 손님은 받은 값으로 그림만 — game/net.ts netEnemyList 의 gp 칸. 사연: docs/code-history.md#h181 */

export const BossGaps: Bag & ThisType<Enemy> = {

  /** 기술을 고른 순간 — 플레이어 체력 합을 적어 둔다(끝날 때 헛손질이었는지 본다) */
  gapMark() { this.mvHp0 = G.players.reduce((s: number, q: any) => s + (q.dead ? 0 : q.hp), 0); },
  /** 기술이 끝났다 — 그 보스 갈래의 틈을 연다. 아무도 못 맞혔으면(헛손질) 더 길고 더 아프다 */
  gapOpen(ult: boolean) {
    const k = BOSS_GAP[this.type], K = k && GAP_KIND[k]; if (!K) return;
    const hp = G.players.reduce((s: number, q: any) => s + (q.dead ? 0 : q.hp), 0);
    const miss = hp >= (this.mvHp0 || 0) - 1;
    this.gapK = k; this.gapMiss = miss ? 1 : 0;
    this.gapT = this.gapMax = K.dur * (ult ? 1.5 : 1) + (miss ? K.miss : 0);
    if (K.slow) this.slow(1 - K.slow, this.gapT);
    if (G.gapBurst) G.gapBurst(this);
  },
  /** 매 프레임(호스트) — 틈 동안은 새 기술을 안 고르고, 비틀거리면 몸놀림도 멈춘다(true) */
  tickGap(dt: number, world: World) {
    if (!(this.gapT > 0)) return false;
    this.gapT -= dt;
    if (this.mvCd !== undefined && this.mvCd < this.gapT + 0.4) this.mvCd = this.gapT + 0.4;
    if (this.gapK !== 'stagger') return false;
    const fly = !!SURGE_FLY[this.def.ai!];
    this.vx *= 0.8;
    if (fly) this.vy = this.vy * 0.85 + 22;                 // 나는 보스는 힘이 빠져 조금 가라앉는다
    this.move(dt, world, { gravMul: fly ? 0 : 1 });
    return true;
  },
  /** 막는 중인가 — 예고(기술 이름을 외치고 기운을 모으는 동안) */
  bracing() { return this.ghost ? !!this.braceV : !!(this.mv && !this.mv.run); },
  /** 받는 피해 배수 */
  gapHurtMul() {
    if (this.bracing()) return GAP_BRACE;
    if (this.gapT > 0 && GAP_KIND[this.gapK]) return GAP_KIND[this.gapK].mul + (this.gapMiss ? GAP_MISS_MUL : 0);
    return 1;
  },
  /** 갑옷 배수 — 균열 동안 벌어진다 */
  gapArmor() { return this.gapT > 0 && this.gapK === 'crack' ? GAP_KIND.crack.arm : 1; }
};
mixin(Enemy.prototype, BossGaps, true);
