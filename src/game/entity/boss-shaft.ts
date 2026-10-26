/* ===== entity/boss-shaft.ts — 갱을 메운 것 — 갱 바닥 흙이 몸 · 흙 속을 기어 다가와 갱 벽을 무너뜨리며 솟는다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TS } from '../world.js';
import { DmgText, Enemy, Part } from '../entity.js';
/* ★ 정체성(계획 §3 `pool`): 갱 벽을 무너뜨리며 솟는다. 묻힘(흙 둔덕만 보이고 ×0.3 '흙더미에 묻혀 있다') → 솟음(양쪽 갱 벽에서 돌이 쏟아진다) →
   솟아 있음(제대로 맞는다 · 가까우면 문다) → 가라앉음을 되풀이한다. 벽은 위험 지대로만 무너뜨린다 — 타일은 건드리지 않는다(싸움터가 사라지지 않게).
   설계 좌표는 tools/mkbossrig.py shaft_*(윗턱 64×48 · 턱 경첩 (32, 34) · 바닥 줄은 아래턱 밑 54). 사연: docs/code-history.md#h242 */

export const SM = { K: 4, W: 64, H: 48, CX: 32, FOOT: 54, HINGE: [32, 34] };   // FOOT = 아래턱 밑(바닥 줄) — 46 이면 아래턱이 땅에 묻혔다
/** 묻힘 → 솟음 → 솟아 있음 → 가라앉음(초) */
const beat = (pf: number) => [3.2 - pf * 0.9, 0.7, 3.4 + pf * 0.4, 0.6];

export const BossShaft: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 묻힌 채 다가가 솟고, 솟은 동안 문다 */
  smAI(dt: number, world: World, p: Player, dx: number) {
    const T = G.time || 0, b = beat(this.pf || 0);
    this.smPh = this.smPh ?? 0; this.smT = (this.smT ?? b[0]) - dt;
    if (this.smT <= 0) {
      this.smPh = (this.smPh + 1) % 4; this.smT = b[this.smPh];
      if (this.smPh === 1) this.smCollapse(world);
    }
    const u = this.smT / b[this.smPh];
    this.smUp = this.smPh === 0 ? 0 : this.smPh === 1 ? 1 - u : this.smPh === 2 ? 1 : u;
    if (this.smPh === 0) {                                 // 묻힘 — 흙 속을 기어 플레이어 밑으로
      this.vx = lerp(this.vx, Math.sign(dx) * Math.min(1, Math.abs(dx) / 60) * this.spd! * 1.5, dt * 2);
      if (Math.random() < dt * 14) G.parts.push(new Part(this.cx + (Math.random() - 0.5) * this.w * 0.6, this.y + this.h - 2, Math.random() < 0.5 ? '#6a5a44' : '#4a3a2a', -150, 0.5));
    } else {
      this.vx *= 0.85;
      if (this.smPh === 2 && this.atkCd <= 0 && Math.abs(dx) < this.w * 0.75 && !(this.mv && this.mv.d)) {   // 문다
        this.atkCd = 1.6 - (this.pf || 0) * 0.4;
        this.smBite = { t: T };
        this.strike(this.cx + Math.sign(dx) * 60, this.y + this.h, { r: 90, delay: 0.45, fx: 'rock' }, { c: '#a89878' }, 0.9);
      }
    }
    this.move(dt, world);
  },
  /** 솟는 순간 — 양쪽 갱 벽에서 돌이 쏟아진다(위험 지대만 · 타일은 그대로) */
  smCollapse(world: World) {
    G.shake = Math.max(G.shake, 14);
    const fy = this.y + this.h, ty = Math.floor((fy - 60) / TS), tx0 = Math.floor(this.cx / TS);
    for (const s of [-1, 1]) {
      let wx = this.cx + s * 420;
      for (let k = 4; k < 40; k++) if (world.solid(tx0 + s * k, ty)) { wx = (tx0 + s * k + (s < 0 ? 1 : 0)) * TS; break; }
      for (let i = 0; i < 3 + Math.round((this.pf || 0) * 2); i++) {
        const x = wx - s * (24 + Math.random() * 90);
        this.strike(x, fy, { shape: 'col', w: 44, h: 320, delay: 0.7 + i * 0.12, fx: 'rock', dir: 'down' }, { c: '#a89878' }, 0.7);
      }
      for (let i = 0; i < 14; i++) G.parts.push(new Part(wx - s * 6, fy - 40 - Math.random() * 200, Math.random() < 0.5 ? '#5a5248' : '#8a8070', 60, 1.0, { spd: 0.8 }));
    }
  },
  /** 받는 피해 — 묻힌 동안은 흙더미가 받는다 */
  smHurt(a: number) {
    if ((this.smUp || 0) > 0.5) return a;
    if (Math.random() < 0.3) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 30, this.y + this.h - 30, tr('흙더미에 묻혀 있다'), '#a89878', 0));
    return a * 0.3;
  },
};

mixin(Enemy.prototype, BossShaft, true);
