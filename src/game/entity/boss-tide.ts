/* ===== entity/boss-tide.ts — 조수의 파수꾼 · 물이 지운 것 — 조수에 깎인 돌 거상 · 밀물과 썰물이 싸움을 바꾼다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { DmgText, Enemy } from '../entity.js';
/* ★ 정체성(계획 §3): 밀물 높이가 기술과 맞물린다. 거상 둘레의 물이 16초마다 차고 빠진다(`twTide` — 시간으로만 재 참가자도 같은 높이).
   썰물엔 배의 조수 심장이 드러나 ×1.4 · 거상이 뭍에 걸려 느리다 · 밀물엔 물이 심장을 덮어 ×0.7('물이 막는다') · 거상이 헤엄치듯 빠르다 ·
   물이 가장 높을 때 양쪽으로 파도가 친다. 물에 잠긴 플레이어는 느려진다. 설계 좌표는 tools/mkbossrig.py tide_*. 사연: docs/code-history.md#h244 */

/** 설계 칸 표 — 그림(game/boss-tide-art)과 같은 수 */
export const TW = { K: 4, S: 1.3, W: 56, H: 64, CX: 28, WAIST: 62, SH: [[11, 26], [45, 26]] as [number, number][], EYES: [[24.4, 15.4], [31.6, 15.4]] as [number, number][],
  HEART: [28, 50], UP: 16, PERIOD: 16, DEPTH: 150, SPAN: 640 };

/** 물 높이 0(썰물) ~ 1(밀물) — 시간으로만 */
export const twTide = (T: number) => 0.5 - 0.5 * Math.cos((T / TW.PERIOD) * Math.PI * 2);

export const BossTide: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 밀물엔 헤엄치듯 · 썰물엔 뭍에 걸려 느리게 다가선다 · 밀물 꼭대기에 파도 */
  twAI(dt: number, world: World, p: Player, dx: number) {
    const T = G.time || 0, tide = twTide(T);
    this.vx = lerp(this.vx, Math.sign(dx) * this.spd! * (0.4 + tide * 1.1) * (Math.abs(dx) > 120 ? 1 : 0.15), dt * 1.5);
    if (Math.abs(dx) > 10) this.facing = Math.sign(dx);
    const crest = Math.floor(T / TW.PERIOD + 0.5);                // 밀물 꼭대기(주기의 한가운데)마다 한 번
    if (tide > 0.97 && this.twCrest !== crest) {
      this.twCrest = crest;
      const fy = this.y + this.h;
      for (const s of [-1, 1]) this.hz({ k: 'wall', x: this.cx + s * 80, vx: s * 320, top: fy - 120, bot: fy, w: 40, life: 2.6, dmg: this.dmg * 0.5, c: '#5fb0e8', fx: 'water', sd: Math.random() * 99 });
      G.shake = Math.max(G.shake, 6);
    }
    if (!this.twWater) { this.twWater = 1; this.hz({ k: 'tide', x: this.cx, y: this.y + this.h, life: 1e9, ref: this, nid: this.nid, c: '#5fb0e8' }); }
    this.move(dt, world);
  },
  /** 받는 피해 — 썰물엔 심장이 드러나고, 밀물엔 물이 덮는다 */
  twHurt(a: number) {
    const tide = twTide(G.time || 0);
    if (tide < 0.4) return a * 1.4;
    if (tide < 0.65) return a;
    if (Math.random() < 0.3) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 30, this.y + this.h * 0.6, tr('물이 막는다'), '#7fc8e8', 0));
    return a * 0.7;
  },
};

mixin(Enemy.prototype, BossTide, true);
