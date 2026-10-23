/* ===== game/boss-pool-fx.ts — 잿물 군체의 입자 연출 — 튀는 잿물 · 불씨 · 재 연기 · 쇠 조각 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Part } from '../entity.js';
import { Game } from '../game.js';
/* 화면마다 제 연출을 낸다(위험 지대 · 막 넘김은 참가자에게도 같은 때 온다). 피해와 무관한 그림만 — 판정은 boss-sig · boss-pool.
   입자 수는 화질의 상한(G.vfx.cap · parts 상한)을 따른다. 무게: 잿물 방울은 무겁게 떨어져 바닥에 눕고(bounce), 불씨는 위로 흩어진다. */

const SLUDGE = ['#4a4541', '#3a3532', '#5a544e'], EMB = '#ff8a40', ASH = 'rgba(86,80,74,.75)', STEAM = 'rgba(206,200,192,.45)';
const pick = (a: string[]) => a[(Math.random() * a.length) | 0];

export const BossPoolFx: Bag = {
  /** 잿물 방울 n 개 — 위로 튀어 떨어져 바닥에 눕는다 */
  sludgeDrops(x: number, y: number, n: number, up = 320, spd = 1.2, r = 1.6) {
    for (let i = 0; i < n; i++) this.parts.push(new Part(x + (Math.random() - 0.5) * 16, y, pick(SLUDGE), -up * (0.5 + Math.random() * 0.7), 0.9, { spd, r, g: 1.6, bounce: 0.18, drag: 0.985 }));
  },
  /** 팔이 내리친 자리 — 왕관 물보라 · 불씨 · 재 구름 · 땅 금 */
  poolSlamFx(x: number, y: number) {
    this.sludgeDrops(x, y - 8, 26, 420, 1.6, 1.9);
    this.vfx.sparks(x, y - 10, 16, EMB, 380, -Math.PI / 2, 2.2, 0.55, 700);
    this.vfx.puffs(x, y - 8, 7, 26, ASH, 1.1, 46);
    this.vfx.shock(x, y - 4, 110, '#8a7a68', 0.35, 7, 0.3);
    this.vfx.flare(x, y - 12, 60, '#ffb070', 0.18, 'impact');
    this.vfx.crack(x, y, -1, 90, '#2a2018', 0.9); this.vfx.crack(x, y, 1, 90, '#2a2018', 0.9);
    this.shake = Math.max(this.shake, 10);
  },
  /** 팔이 솟는 동안(매 프레임 가끔) — 뿌리에서 흘러내리는 방울 · 거품 */
  poolRiseFx(x: number, y: number, k: number) {
    if (Math.random() < 0.35 + k * 0.4) this.sludgeDrops(x + (Math.random() - 0.5) * 60, y - 40 - Math.random() * 120 * k, 1, 30, 0.4, 1.4);
    if (Math.random() < 0.25) this.vfx.motes(x + (Math.random() - 0.5) * 50, y - 6, 1, EMB, 14, 50, 0.8, 4);
  },
  /** 잿물 기둥 · 범람이 솟은 순간 — 꼭대기 물보라 · 넓으면 마루를 따라 */
  poolGeyserFx(h: Bag) {
    const wide = h.shape === 'col' && h.w > 160, w = h.shape === 'col' ? h.w : h.r * 1.6, top = h.y - (h.shape === 'col' ? h.hh : h.r * 1.8);
    if (wide) {
      for (let x = h.x - w / 2; x < h.x + w / 2; x += 34) this.sludgeDrops(x, h.y - 60, 2, 260, 0.8, 1.6);
      this.vfx.puffs(h.x, h.y - 30, 10, 30, STEAM, 1.2, w * 0.45);
      this.shake = Math.max(this.shake, 7);
    } else {
      this.sludgeDrops(h.x, top, 10, 300, 1.3, 1.8);
      this.vfx.sparks(h.x, top, 8, EMB, 320, -Math.PI / 2, 1.6, 0.6, 600);
      this.vfx.puffs(h.x, h.y - 10, 2, 16, ASH, 0.9, 18);
    }
  },
  /** 잠길 때 · 솟을 때 — 투구가 잿물을 가르며 들어가고 나온다 */
  poolSinkFx(x: number, y: number, out: boolean) {
    this.sludgeDrops(x, y - 6, out ? 30 : 16, out ? 520 : 220, out ? 1.8 : 1, 2);
    this.vfx.puffs(x, y - 10, out ? 8 : 5, 24, STEAM, 1, 60);
    if (out) { this.vfx.sparks(x, y - 20, 22, EMB, 460, -Math.PI / 2, 2, 0.7, 650); this.vfx.shock(x, y - 4, 160, '#8a7a68', 0.4, 9, 0.3); }
  },
  /** 막 넘김 — 투구가 깨지는 순간: 녹슨 쇠 조각 · 속불이 터지는 불씨 · 김 */
  poolPhaseFx(e: Enemy) {
    const x = e.cx - 14, y = e.y + e.h * 0.25;
    this.vfx.shards(x, y, 18, '#7a5a40', 420, 0.9, 7);
    this.vfx.shards(x, y, 8, '#4e3c2c', 360, 0.8, 5);
    this.vfx.sparks(x, y, 34, EMB, 520, -Math.PI / 2, 2.6, 0.8, 500);
    this.vfx.flare(x, y, 110, '#ff7a30', 0.3, 'impact');
    this.vfx.shock(e.cx, e.cy, e.w * 0.9, '#ff9a50', 0.45, 10);
    this.vfx.puffs(x, y, 9, 26, STEAM, 1.4, 40);
    this.sludgeDrops(x, y + 20, 14, 360, 1.4, 1.8);
  },
  /** 웅덩이 상시 — 불씨가 드문드문 피어오르고, 몸 둘레에 김이 맺힌다 */
  poolAmbient(e: Enemy, half: number) {
    if (Math.random() < 0.08) this.vfx.motes(e.cx + (Math.random() - 0.5) * 2 * half, e.y + e.h - 6, 1, EMB, 10, 60, 1.2, 4);
    if (Math.random() < 0.02) this.vfx.puffs(e.cx + (Math.random() - 0.5) * e.w, e.y + e.h - 20, 1, 18, STEAM, 1.6, 20);
  },
};

mixin(Game.prototype, BossPoolFx, true);
