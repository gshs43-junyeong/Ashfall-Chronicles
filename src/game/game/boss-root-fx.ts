/* ===== game/boss-root-fx.ts — 뿌리 대성당의 위험 지대 움직임과 입자 — 뿌리 분출 · 나이테 파동 · 꽃 피는 철 · 쓰러지는 나무 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { RT, fellStage, rootStage, rtAt } from '../entity/boss-root.js';
import { Game } from '../game.js';
/* 피해 · 꽃 꺾음 · 낫기는 호스트(host)가 정하고 참가자에게 덧붙인다(hzPatch). 들썩임 · 잎 · 꽃잎은 화면마다. */

const DIRT = 'rgba(120,90,60,.75)', BARK = '#5a4230', LEAF = '#6fa848', PETAL = '#f0b8d8', SAP = '#d8f080';

export const BossRootFx: Bag = {
  /** 위험 지대 한 칸의 움직임(sigUpdate 에서) — 처리했으면 true */
  rootHz(h: Bag, dt: number, host: boolean, me: any) {
    const b = this.hzBoss(h);
    switch (h.k) {
      case 'rroot': {
        const [, st] = rootStage(h), big = h.big || 1;
        if (st === 0 && Math.random() < dt * 22) {                    // 들썩임 — 흙덩이가 튀고 바닥이 갈라진다
          this.parts.push(new Part(h.x + (Math.random() - 0.5) * 40 * big, h.fy - 2, '#7a5a3a', -90 - Math.random() * 80, 0.6, { spd: 0.6, r: 1.6, g: 1.2 }));
        }
        if (st >= 1 && !h.up) {                                      // 솟는다 — 흙이 터지고 그 자리 위가 아프다
          h.up = 1; this.shake = Math.max(this.shake, 7 * big);
          this.vfx.puffs(h.x, h.fy - 8, 6, 26 * big, DIRT, 1, 40); this.vfx.shards(h.x, h.fy - 6, 10, BARK, 260, 0.8, 4);
          this.sfxAt && this.sfxAt('rt_burst', h.x / TS, h.fy / TS);
          if (host) for (const q of this.players) if (!q.dead && q.hp > 0 && Math.abs(q.cx - h.x) < 32 * big && q.y + q.h > h.fy - 150 * big && q.y < h.fy) q.hurt(h.dmg, h.x);
        }
        if (st === 3 && Math.random() < dt * 10) this.parts.push(new Part(h.x + (Math.random() - 0.5) * 20, h.fy - 4, '#6a4a30', -30, 0.5, { spd: 0.3, r: 1.3, g: 0.8 }));
      } return true;
      case 'rring': {                                                 // 나이테 — 바닥을 따라 퍼지는 테(밟고 있으면 맞는다 · 뛰어넘는다)
        if (h.t < h.tele) return true;
        const r = (h.t - h.tele) * h.spd;
        if (Math.random() < dt * 30) for (const s of [-1, 1]) this.parts.push(new Part(h.x + s * r, h.fy - 2, Math.random() < 0.5 ? '#8a6a48' : LEAF, -60 - Math.random() * 60, 0.5, { spd: 0.4, r: 1.4, g: 1 }));
        if (host) this.players.forEach((q: any, i: number) => {
          if (q.dead || q.hp <= 0 || h.hit[i]) return;
          if (Math.abs(Math.abs(q.cx - h.x) - r) < 20 && q.y + q.h > h.fy - 24 && q.y < h.fy) { h.hit[i] = 1; q.hurt(h.dmg, h.x); }
        });
      } return true;
      case 'rflower': {                                               // 꽃 — 밟아 꺾으면 꽃잎이 흩어진다 · 철이 끝나도 남은 꽃은 고목에게로
        if (h.picked) return true;
        if (host && h.t > 0.45) for (const q of this.players) {
          if (q.dead || q.hp <= 0) continue;
          if (Math.abs(q.cx - h.x) < 26 && q.y + q.h > h.fy - 46 && q.y < h.fy) { this.hzPatch(h, { picked: 1, pt: h.t, life: h.t + 0.5 }); break; }
        }
        if (h.picked && !h.fxp) { h.fxp = 1; this.vfx.motes(h.x, h.fy - 22, 16, PETAL, 40, 110, 0.9, 4); this.sfxAt && this.sfxAt('rt_pick', h.x / TS, h.fy / TS); }
        if (!h.picked && h.t > h.life - 0.08 && !h.healed && b) {     // 철이 끝났다 — 꽃잎이 빈 속으로 빨려 들고 고목이 낫는다
          h.healed = 1;
          const [rx, ry] = rtAt(b, RT.ROSE[0], RT.ROSE[1]);
          for (let i = 0; i < 14; i++) { const u = i / 14; this.parts.push(new Part(h.x + (rx - h.x) * u, h.fy - 22 + (ry - h.fy + 22) * u - Math.sin(u * Math.PI) * 60, PETAL, 0, 0.6 + u * 0.4, { spd: 0.2, r: 1.6, g: 0 })); }
          this.vfx.flare(rx, ry, 70, SAP, 0.3, 'impact');
          if (host) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * h.heal);
          this.sfxAt && this.sfxAt('rt_heal', rx / TS, ry / TS);
        }
      } return true;
      case 'rfell': {
        const [, st] = fellStage(h);
        if (st === 0 && Math.random() < dt * 8 && b) {                // 기운다 — 우듬지에서 잎이 쏟아진다
          const [x, y] = rtAt(b, RT.C[0] + h.s * 20 + (Math.random() - 0.5) * 50, 6 + Math.random() * 20);
          this.parts.push(new Part(x, y, LEAF, 40, 1.4, { spd: 0.4, r: 1.6, g: 0.5 }));
        }
        if (st >= 1 && !h.fx1) { h.fx1 = 1; this.sfxAt && this.sfxAt('rt_fall', h.x / TS, h.fy / TS); }
        if (st === 2 && !h.hitd) {                                    // 쓰러졌다 — 줄기가 누운 자리 전체가 아프다
          h.hitd = 1; this.shake = Math.max(this.shake, 20);
          for (let i = 0; i < 9; i++) { const x = h.x + h.s * (90 + i * (h.len - 90) / 8); this.vfx.puffs(x, h.fy - 10, 4, 30, DIRT, 1, 40); }
          this.vfx.motes(h.x + h.s * h.len * 0.6, h.fy - 60, 30, LEAF, 60, 160, 1.2, 5);
          this.sfxAt && this.sfxAt('rt_crash', (h.x + h.s * h.len / 2) / TS, h.fy / TS);
          if (host) for (const q of this.players) {
            if (q.dead || q.hp <= 0) continue;
            const d = (q.cx - h.x) * h.s;
            if (d > 60 && d < h.len + 20 && q.y + q.h > h.fy - 74 && q.y < h.fy) q.hurt(h.dmg, h.x);
          }
        }
        void me;
      } return true;
    }
    return false;
  },
  /** 막 넘김 — 고목이 몸을 떨며 잎과 수액빛이 쏟아진다 */
  rootPhaseFx(e: Enemy) {
    this.shake = Math.max(this.shake, 14);
    for (let i = 0; i < 30; i++) { const [x, y] = rtAt(e, 52 + (Math.random() - 0.5) * 110, -10 + Math.random() * 40); this.parts.push(new Part(x, y, i % 3 ? LEAF : PETAL, 40 + Math.random() * 40, 1.8, { spd: 0.5, r: 1.8, g: 0.4 })); }
    const [rx, ry] = rtAt(e, RT.ROSE[0], RT.ROSE[1]);
    this.vfx.flare(rx, ry, 160, SAP, 0.35, 'impact');
    this.sfxAt && this.sfxAt('rt_creak', e.cx / TS, e.cy / TS);
  },
  /** 상시 — 우듬지에서 잎이 지고 · 빈 속 둘레에 반딧불이 맴돈다 */
  rootAmbient(e: Enemy) {
    if (Math.random() < 0.08) {
      const [x, y] = rtAt(e, 52 + (Math.random() - 0.5) * 120, -12 + Math.random() * 30);
      this.parts.push(new Part(x, y, Math.random() < 0.8 ? LEAF : '#a8c860', 30, 2.4, { spd: 0.25, r: 1.7, g: 0.25, drag: 0.98 }));
    }
    if (Math.random() < 0.05) {
      const [x, y] = rtAt(e, 52 + (Math.random() - 0.5) * 40, 70 + Math.random() * 30);
      this.parts.push(new Part(x, y, SAP, -25, 1.6, { spd: 0.3, r: 1.2, g: -0.1, drag: 0.97 }));
    }
  },
};
mixin(Game.prototype, BossRootFx, true);
