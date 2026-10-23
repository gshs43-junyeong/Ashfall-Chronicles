/* ===== game/boss-organ-fx.ts — 뼈 오르간의 입자 연출 — 관 입의 혼불 · 풀무 김 · 뼛가루 · 뼛조각 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Part } from '../entity.js';
import { ORGAN, organAt } from '../entity/boss-organ.js';
import { Game } from '../game.js';
/* 화면마다 제 연출(판정과 무관). 혼불은 위로 흩어지고(가벼움) 뼛가루는 무겁게 떨어져 눕는다. */

const SOUL = '#9ff0d0', DUST = 'rgba(200,190,160,.6)', BONE = ['#e2d8bc', '#c8bc9c', '#f2ead4'];
const pick = (a: string[]) => a[(Math.random() * a.length) | 0];

export const BossOrganFx: Bag = {
  /** 관 하나가 운 순간 — 입에서 혼불이 터지고 음파 고리 */
  organPipeFx(x: number, y: number) {
    this.vfx.flare(x, y, 34, SOUL, 0.18, 'impact');
    this.vfx.shock(x, y, 46, SOUL, 0.32, 4);
    this.vfx.motes(x, y, 4, SOUL, 10, 90, 0.9, 5);
  },
  /** 팔이 바닥을 쓰는 동안(매 프레임) — 손끝에서 뼛가루 · 불꽃 */
  organSweepFx(x: number, y: number, low: boolean) {
    if (low) {
      if (Math.random() < 0.7) this.vfx.puffs(x, y - 6, 1, 16, DUST, 0.7, 14);
      if (Math.random() < 0.5) this.vfx.sparks(x, y - 4, 2, '#f2e2b8', 260, -Math.PI / 2, 1.4, 0.35, 700);
    } else if (Math.random() < 0.5) this.vfx.motes(x, y, 1, '#f2ead4', 16, 20, 0.5, 4);
  },
  /** 손에 맞은 순간 — 짧은 멈춤 · 흔들림 · 맞은 자리에서 뼛가루가 쓸려 간 쪽으로 튄다(손맛) */
  organSweepHitFx(qs: any[], s: number) {
    this.hitStop && this.hitStop(0.09); this.shake = Math.max(this.shake, 9);
    for (const q of qs) {
      this.vfx.flare(q.cx, q.cy, 54, '#f4ecd2', 0.16, 'impact');
      this.vfx.sparks(q.cx, q.cy, 14, '#f2e2b8', 420, s > 0 ? 0 : Math.PI, 0.9, 0.4, 500);
      this.vfx.puffs(q.cx, q.y + q.h - 6, 3, 18, DUST, 0.8, 16);
    }
  },
  /** 풀무 — 들이켤 때 갈비 틈으로 김이 빨려 들고, 열리는 순간 혼불이 솟는다 */
  organBreathFx(e: Enemy, opening: boolean) {
    if (!opening) { this.vfx.converge(e.cx, e.cy, 120, 10, SOUL, 0.6); return; }
    this.vfx.puffs(e.cx, e.cy + 10, 8, 26, 'rgba(190,230,214,.4)', 1.4, 70);
    this.vfx.motes(e.cx, e.cy, 14, SOUL, 40, 140, 1.4, 6);
    this.vfx.shock(e.cx, e.cy, 120, SOUL, 0.5, 8);
  },
  /** 흩어질 때 — 뼛조각과 뼛가루 */
  organScatterFx(e: Enemy) {
    this.vfx.shards(e.cx, e.cy - 40, 26, '#e2d8bc', 520, 0.9, 8);
    this.vfx.puffs(e.cx, e.cy, 10, 30, DUST, 1.2, 120);
    this.shake = Math.max(this.shake, 8);
  },
  /** 막 넘김 — 갈비 · 관이 부러지는 순간 */
  organPhaseFx(e: Enemy) {
    for (let i = 0; i < 22; i++) this.parts.push(new Part(e.cx + (Math.random() - 0.5) * 200, e.cy - 60 - Math.random() * 120, pick(BONE), -200, 1, { spd: 1.4, r: 2.4, g: 1.4, bounce: 0.3 }));
    this.vfx.puffs(e.cx, e.cy - 80, 12, 34, DUST, 1.6, 140);
    const [x, y] = organAt(e, 40, ORGAN.MOUTH);
    this.vfx.flare(x, y, 120, SOUL, 0.3, 'impact');
    this.vfx.motes(e.cx, e.cy, 20, SOUL, 60, 160, 1.6, 7);
    this.shake = Math.max(this.shake, 12);
  },
  /** 상시 — 천장 쪽에서 뼛가루가 내리고, 혼불이 핵 둘레를 떠돈다 */
  organAmbient(e: Enemy) {
    if (Math.random() < 0.05) this.vfx.motes(e.cx + (Math.random() - 0.5) * 220, e.cy - 220, 1, '#d8ccac', 20, -60, 2, 4);
    if (Math.random() < 0.06) this.vfx.motes(e.cx + (Math.random() - 0.5) * 40, e.cy + 20, 1, SOUL, 20, 70, 1.4, 5);
  },
};

mixin(Game.prototype, BossOrganFx, true);
