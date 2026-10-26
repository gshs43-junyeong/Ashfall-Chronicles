/* ===== entity/boss-arche.ts — 원형 · 첫 번째 설계 — 사람을 본뜬 상아빛 마네킹 · 자 칼날 연격 · 설계선을 따라 제 몸을 다시 조립한다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { Enemy } from '../entity.js';
/* ★ 정체성(계획 §3): 설계선을 그리며 제 몸을 다시 조립한다 — 순간이동(완벽한 연격 · 원형의 증명)하거나 마디를 넘을 때 몸이 판으로 흩어졌다가
   푸른 설계선을 따라 제자리로 모인다(arAsm — 0.9초). 순간이동은 한 틱에 크게 옮겨진 것으로 알아챈다(기술 코드를 고치지 않는다).
   몸놀림은 예전 그대로(겨눔 → 세 번 파고드는 연격 → 숨 고르기 · 마지막 마디의 받침대). 설계 좌표는 tools/mkbossrig.py arche_*. 사연: docs/code-history.md#h240 */

/** 설계 칸 표 — 그림(game/boss-arche-art)과 같은 수 · S 는 그리는 배율 */
export const AR = { K: 4, S: 0.85, W: 32, H: 44, CX: 16, HIPS: [12, 20], HIP_Y: 40, SH: [[7, 15], [25, 15]] as [number, number][], THIGH: 10, SHIN: 22, UP: 9, FOOT: 72 };

export const BossArche: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 겨눔(천천히 붙는다) · 연격(세 번 파고든다) · 숨 고르기(붙을 틈) · 받침대 */
  arAI(dt: number, world: World, p: Player, dx: number, dy: number) {
    const T = G.time || 0;
    /* 한 틱에 크게 옮겨졌다 = 순간이동 — 흩어졌다 모이는 연출 */
    if (this.arLX !== undefined && Math.hypot(this.cx - this.arLX, this.cy - this.arLY) > 90) this.arAsm = { t: T, fx: this.arLX - this.cx, fy: this.arLY - this.cy, sd: Math.random() * 99 };
    if (Math.abs(dx) > 10 && this.state !== 1) this.facing = Math.sign(dx);
    if (this.stateT <= 0) {
      this.state = (this.state + 1) % 3;
      this.stateT = this.state === 1 ? 1.5 : 2.2;
      if (this.state === 1) { this.combo = 0; this.atkCd = 0.2; }
    }
    if (this.state === 1) {                                // 연격 — 세 번 파고든다(자 칼날이 한 번씩 그어진다)
      this.vx = lerp(this.vx, Math.sign(dx) * this.spd! * 2.2, dt * 6);
      if (this.atkCd <= 0 && this.combo < 3) {
        this.combo++; this.atkCd = 0.42; this.arCut = { t: T, n: this.combo };
        G.hitPlayers(this.cx + Math.sign(dx) * 44, this.cy, 52, this.dmg * 0.8); G.ringFx(this.cx + Math.sign(dx) * 44, this.cy, 52, '#e8dcc0', .3);
        G.shake = Math.max(G.shake, 6);
      }
    } else if (this.state === 0) {                         // 겨눔 — 천천히 붙는다
      this.vx = lerp(this.vx, Math.sign(dx) * this.spd! * 0.6, dt * 3);
      if (this.onGround && dy < -50) this.vy = -580;
    } else this.vx *= 0.86;                                // 숨 고르기 — 붙을 틈
    if (this.lastPh() && this.guard) {                     // 받침대(제단석)를 다 깨면 열린다
      const ped = G.ents.filter((e: any) => e instanceof Enemy && !e.dead && e.type === 'draft_form').length;
      if (!ped) { this.guard = 0; G.toast(tr('받침대가 무너졌다'), 'good'); }
    }
    this.arStep = (this.arStep || 0) + Math.abs(this.vx) * dt / 50;
    this.move(dt, world);
    this.arLX = this.cx; this.arLY = this.cy;
  },
  /** 마디를 넘을 때 — 그 자리에서 흩어졌다 다시 모인다 */
  arRebuild() { this.arAsm = { t: G.time || 0, fx: 0, fy: 0, sd: Math.random() * 99, big: 1 }; },
};

mixin(Enemy.prototype, BossArche, true);
