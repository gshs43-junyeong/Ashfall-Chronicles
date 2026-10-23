/* ===== game/boss-hive-fx.ts — 곪은 벌집 어미의 위험 지대 움직임과 입자 — 머리 옮기기 · 방 깨기 · 담즙 줄기와 웅덩이 · 침 · 개화 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Part, Proj } from '../entity.js';
import { BROOD, HIVE, bileState, cellAt } from '../entity/boss-hive.js';
import { Game } from '../game.js';
/* 피해 · 애벌레 · 탄은 호스트(host)만, 웅덩이에 발이 묶이는 것은 화면마다 제 플레이어(me)에게. 방 열림(hvOpen)은 화면마다 지대를 보고 같이 바꾼다. */

const BILE = '#b8c83a', WAXC = '#c8a868', GOO = 'rgba(150,170,50,.55)';

export const BossHiveFx: Bag = {
  /** 위험 지대 한 칸의 움직임(sigUpdate 에서) — 처리했으면 true */
  hiveHz(h: Bag, dt: number, host: boolean, me: any) {
    const b = this.hzBoss(h);
    switch (h.k) {
      case 'hvmove': {                                              // 숨는 순간 · 다른 방에서 내미는 순간 — 판정 상자를 옮긴다
        if (!b) return true;
        if (!h.fx0) { h.fx0 = 1; const [x, y] = cellAt(b, h.from); this.vfx.puffs(x, y, 3, 14, GOO, 0.7, 20); }
        if (!h.moved && h.t >= h.hide + h.gap) {
          h.moved = 1; b.hvCell = h.to; if (host) b.hvPlace(h.to);
          const [x, y] = cellAt(b, h.to);
          this.vfx.puffs(x, y + 10, 4, 16, GOO, 0.8, 24); this.vfx.motes(x, y, 6, BILE, 26, 50, 0.7, 4);
          this.sfxAt && this.sfxAt('hive_pop', x / TS, y / TS);
        }
      } return true;
      case 'hvbrood': {                                             // 부푼 뚜껑이 깨지고 애벌레가 나온다
        if (!b) return true;
        if (!h.cracked && h.t >= h.tele) {
          h.cracked = 1;
          for (const i of h.cells) { b.hvOpen = (b.hvOpen || 0) | (1 << i); const [x, y] = cellAt(b, i); this.vfx.shards(x, y, 10, WAXC, 260, 0.7, 5); this.vfx.puffs(x, y, 3, 14, GOO, 0.8, 18); }
          this.shake = Math.max(this.shake, 6);
          this.sfxAt && this.sfxAt('hive_crack', b.cx / TS, b.cy / TS);
        }
        if (host && !h.spawned && h.t >= h.tele + 0.6) { h.spawned = 1; for (const i of h.cells) b.hvLarva(i); }
      } return true;
      case 'hvbile': {                                              // 줄기에 닿거나 웅덩이에 서 있으면 아프다(0.5초마다) · 웅덩이는 발이 무겁다
        const [flow, pr] = bileState(h);
        if (h.t < h.tele) { if (Math.random() < 0.3) this.parts.push(new Part(h.x + (Math.random() - 0.5) * 8, h.top, BILE, 80, 0.6, { spd: 0.2, r: 1.4, g: 0.8 })); return true; }
        if (!h.fx0) { h.fx0 = 1; this.vfx.puffs(h.x, h.fy - 4, 4, 18, GOO, 0.9, 30); this.sfxAt && this.sfxAt('hive_splash', h.x / TS, h.fy / TS); }
        if (flow > 0 && Math.random() < 0.6) this.vfx.motes(h.x + (Math.random() - 0.5) * 20, h.fy - 4, 1, BILE, 14, 40, 0.5, 3);
        if (host) {
          h.cd = h.cd || {};
          for (let i = 0; i < this.players.length; i++) {
            const q = this.players[i]; if (q.dead || q.hp <= 0 || (h.cd[i] || 0) > h.t) continue;
            const inCol = flow > 0.2 && q.x < h.x + h.w / 2 && q.x + q.w > h.x - h.w / 2 && q.y < h.fy && q.y + q.h > h.top;
            const inPool = pr > 8 && Math.abs(q.cx - h.x) < pr && Math.abs(q.y + q.h - h.fy) < 12;
            if (inCol || inPool) { q.hurt(inCol ? h.dmg : h.dmg * 0.6, h.x); q.inflict && q.inflict('poison', 2, h.dmg * 0.1); h.cd[i] = h.t + 0.5; }
          }
        }
        if (me && !me.dead && pr > 8 && Math.abs(me.cx - h.x) < pr && Math.abs(me.y + me.h - h.fy) < 12) me.vx *= Math.pow(0.08, dt);
      } return true;
      case 'hvspit': {                                              // 턱을 벌리고 — 뱉는다
        if (!b) return true;
        if (!h.fired && h.t >= h.tele) {
          h.fired = 1;
          const q = this.hzNear(b.cx, b.cy);
          if (host && q) {
            const a0 = Math.atan2(q.cy - b.cy, q.cx - b.cx);
            for (let i = 0; i < h.n; i++) {
              const a = a0 + (i - (h.n - 1) / 2) * 0.22, sp = 300;
              const pr = new Proj(b.cx, b.cy + 14, Math.cos(a) * sp, Math.sin(a) * sp, h.dmg, 'enemy', 'poison'); pr.life = 3; this.projs.push(pr);
            }
          }
          this.vfx.puffs(b.cx, b.cy + 16, 4, 14, GOO, 0.6, 16); this.vfx.motes(b.cx, b.cy + 16, 8, BILE, 20, 30, 0.5, 4);
          this.sfxAt && this.sfxAt('hive_spit', b.cx / TS, b.cy / TS);
        }
      } return true;
      case 'hvbloom': {                                             // 개화 — 모든 뚜껑이 한꺼번에 깨진다
        if (!b) return true;
        if (h.t < h.tele) { if (Math.random() < 0.4) { const i = BROOD[Math.floor(Math.random() * BROOD.length)], [x, y] = cellAt(b, i); this.vfx.motes(x, y, 1, BILE, 16, 30, 0.6, 3); } this.shake = Math.max(this.shake, 3); return true; }
        if (!h.open) {
          h.open = 1; b.hvOpen = (1 << HIVE.CELLS.length) - 1;
          for (const i of BROOD) { const [x, y] = cellAt(b, i); this.vfx.shards(x, y, 6, WAXC, 300, 0.7, 5); }
          this.vfx.flare(b.cx, b.cy, 200, BILE, 0.35, 'impact'); this.vfx.shock(b.hvAx, b.hvAy - 180, 360, '#d8f060', 0.5, 12);
          this.shake = Math.max(this.shake, 16);
          if (host) for (const i of [0, 2, 7, 11]) b.hvLarva(i);
        }
      } return true;
    }
    return false;
  },
  /** 막 넘김 — 벌집이 몸서리치며 담즙이 튄다 */
  hivePhaseFx(e: Enemy) {
    this.shake = Math.max(this.shake, 12);
    this.vfx.flare(e.hvAx, e.hvAy - 180, 220, BILE, 0.3, 'impact');
    for (const i of BROOD) { const [x, y] = cellAt(e, i); if (Math.random() < 0.5) this.vfx.motes(x, y, 4, BILE, 20, 50, 0.8, 4); }
  },
  /** 상시 — 방 밑에서 담즙이 똑똑 떨어지고 날벌레가 맴돈다 */
  hiveAmbient(e: Enemy) {
    if (Math.random() < 0.08) {
      const i = Math.floor(Math.random() * HIVE.CELLS.length), [x, y] = cellAt(e, i);
      this.parts.push(new Part(x + (Math.random() - 0.5) * 10, y + HIVE.R * HIVE.K * 0.6, BILE, 40, 1, { spd: 0.2, r: 1.3, g: 0.8 }));
    }
    if (Math.random() < 0.05) this.parts.push(new Part(e.hvAx + (Math.random() - 0.5) * 400, e.hvAy - 100 - Math.random() * 200, '#2a2018', -10, 1.5, { spd: 0.6, r: 1, g: 0, drag: 0.98 }));
  },
};
mixin(Game.prototype, BossHiveFx, true);
