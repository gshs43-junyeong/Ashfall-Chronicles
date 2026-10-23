/* ===== game/boss-hourglass-fx.ts — 모래시계 거상의 위험 지대 움직임과 입자 — 주먹 · 둔덕 · 유사 늪 · 시간 마감 · 뒤집기 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { HG, duneH, fistAt, hgAt, hgFloor } from '../entity/boss-hourglass.js';
import { Game } from '../game.js';
/* 피해 · 새 위험 지대는 호스트(host)만, 둔덕에 올라서기 · 늪에 끌림은 화면마다 제 플레이어(me)에게.
   ★ 둔덕은 타일이 아니다 — 매 프레임 발을 둔덕 위로 올려 세운다(움직임이 끝난 뒤 sigUpdate 가 돈다). 사연: docs/code-history.md#h218 */

const SAND = '#e8c070', DUST = 'rgba(200,170,120,.55)', STONE = '#c8a46a', AMBER = '#ffc85a';

export const BossHourglassFx: Bag = {
  /** 위험 지대 한 칸의 움직임(sigUpdate 에서) — 처리했으면 true */
  hourglassHz(h: Bag, dt: number, host: boolean, me: any) {
    const b = this.hzBoss(h);
    switch (h.k) {
      case 'hfist': {                                               // 내리치는 순간 한 번 — 주먹 밑을 치고 바닥을 따라 충격파 둘
        if (!b) return true;
        const [fx, fy0] = fistAt(h, b), fy = hgFloor(b);
        if (h.t < h.tele && Math.random() < 0.25) this.parts.push(new Part(fx + (Math.random() - 0.5) * 40, fy0 + 20, STONE, 40, 0.9, { spd: 0.3, r: 1.6, g: 0.5 }));   // 치켜든 주먹에서 모래가 샌다
        if (!h.hitDone && h.t >= h.tele + 0.12) {
          h.hitDone = 1;
          if (host) {
            this.hitPlayersRect(h.tx - 74, fy - 96, h.tx + 74, fy, h.dmg);
            for (const s of [-1, 1]) this.bossHazard({ k: 'wave', x: h.tx + s * 60, y: fy, vx: s * 380, w: 30, hh: 28, life: 1.9, dmg: h.dmg * 0.6, c: h.c, fx: 'rock', sd: Math.random() * 99 });
          }
          this.hgSlamFx(h.tx, fy);
        }
      } return true;
      case 'hsand': {                                               // 둔덕 — 밟고 올라선다 · 비탈을 따라 바깥으로 조금씩 미끄러진다
        if (me && !me.dead) {
          const ht = duneH(h, me.cx), top = h.fy - ht, feet = me.y + me.h;
          if (ht > 2 && feet > top - 2 && feet < h.fy + 6 && me.vy >= -40) {
            me.y = top - me.h; if (me.vy > 0) me.vy = 0; me.onGround = true;
            const sl = duneH(h, me.cx + 6) - duneH(h, me.cx - 6);   // 비탈 — 높은 쪽에서 낮은 쪽으로
            me.x -= Math.sign(sl) * Math.min(60, Math.abs(sl) * 9) * dt;
            if (Math.random() < dt * 6 && Math.abs(me.vx) > 30) this.vfx.puffs(me.cx, top, 1, 8, DUST, 0.5, 6);
          }
        }
        if (b && h.t < h.fill + h.hold && Math.random() < 0.5) {    // 팔걸이 위로 넘친 모래가 흘러내린다
          const s = Math.random() < 0.65 ? h.dir : -h.dir, [ax, ay] = hgAt(b, 42 + s * 36, 57);
          this.parts.push(new Part(ax + s * (8 + Math.random() * 14), ay + Math.random() * 10, SAND, 60, 0.7, { spd: 0.4, r: 1.4, g: 0.6 }));
        }
      } return true;
      case 'hpit': {                                                // 유사 늪 — 가운데로 끌리고 서서히 아프다(뛰어 나간다)
        if (h.t < h.tele) { if (Math.random() < 0.3) this.vfx.puffs(h.x + (Math.random() - 0.5) * h.r, h.y - 2, 1, 8, DUST, 0.5, 10); return true; }
        if (!h.open) { h.open = 1; this.vfx.puffs(h.x, h.y - 4, 5, 18, DUST, 0.9, h.r * 0.6); this.shake = Math.max(this.shake, 4); }
        const fade = Math.min(1, (h.life - h.t) * 2);
        if (me && !me.dead && fade > 0) {
          const d = h.x - me.cx, feet = me.y + me.h;
          if (Math.abs(d) < h.r && Math.abs(feet - h.y) < 14) {
            me.x += Math.sign(d) * Math.min(Math.abs(d), h.pull * (1 - Math.abs(d) / h.r * 0.6) * dt) * fade;
            me.vx *= Math.pow(0.04, dt);                              // 모래에 발이 묶인다
          }
        }
        if (host) {
          h.cd = h.cd || {};
          for (let i = 0; i < this.players.length; i++) {
            const q = this.players[i]; if (q.dead || q.hp <= 0 || (h.cd[i] || 0) > h.t) continue;
            if (Math.abs(q.cx - h.x) < h.r * 0.75 && Math.abs(q.y + q.h - h.y) < 14) { q.hurt(h.dmg, h.x); h.cd[i] = h.t + 0.6; }
          }
        }
        if (Math.random() < 0.4) this.parts.push(new Part(h.x + (Math.random() - 0.5) * h.r * 1.6, h.y - 2, SAND, 20, 0.7, { spd: 0.3, r: 1.2, g: -0.05, drag: 0.9 }));
      } return true;
      case 'hdead': {                                               // 시간 마감 — 깨면 유리가 터지고, 못 깨면 모래 폭풍(탄은 entity/boss-hourglass)
        if (!b) return true;
        const [gx, gy] = hgAt(b, 42, HG.GLASS_Y);
        if (!h.done && Math.random() < 0.5) this.vfx.motes(gx + (Math.random() - 0.5) * 40, gy + 40, 1, AMBER, 30, 80, 0.8, 4);
        if (h.done && !h.fx) {
          h.fx = 1;
          if (h.ok) {
            this.hitStop && this.hitStop(0.12); this.shake = Math.max(this.shake, 16);
            this.vfx.flare(gx, gy, 180, AMBER, 0.35, 'impact'); this.vfx.shock(gx, gy, 260, '#fff0c0', 0.45, 10);
            this.vfx.shards(gx, gy, 26, '#f0e8d0', 460, 0.9, 6); this.vfx.sparks(gx, gy, 30, AMBER, 520, 0, 6.3, 0.6, 700);
            this.sfxAt && this.sfxAt('hg_crack', gx / TS, gy / TS);
          } else {
            this.shake = Math.max(this.shake, 20);
            this.vfx.flare(gx, gy, 240, SAND, 0.4, 'impact'); this.vfx.shock(gx, gy, 420, SAND, 0.6, 16);
            this.vfx.puffs(gx, gy, 18, 34, DUST, 1.6, 160);
          }
        }
      } return true;
      case 'hflip': {                                               // 뒤집기 — 돌기 시작할 때 모래가 쏟아지고, 다 돌면 쿵
        if (!b) return true;
        const [gx, gy] = hgAt(b, 42, HG.GLASS_Y);
        if (!h.fx0) { h.fx0 = 1; this.vfx.puffs(gx, gy, 6, 20, DUST, 1, 40); this.vfx.flare(gx, gy, 120, AMBER, 0.3, 'impact'); }
        if (!h.fx1 && h.t > 1.2) { h.fx1 = 1; this.shake = Math.max(this.shake, 12); this.vfx.shock(gx, gy, 200, AMBER, 0.4, 8); this.vfx.sparks(gx, gy, 18, AMBER, 360, 0, 6.3, 0.5, 400); }
      } return true;
    }
    return false;
  },
  /** 주먹이 바닥을 친 순간 — 멈춤 · 흔들림 · 흙먼지 · 깨진 돌 */
  hgSlamFx(x: number, y: number) {
    this.hitStop && this.hitStop(0.07); this.shake = Math.max(this.shake, 14);
    this.vfx.flare(x, y - 20, 110, '#ffe0a0', 0.2, 'impact');
    this.vfx.shock(x, y - 4, 180, '#e8c890', 0.35, 8, 0.3);
    this.vfx.shards(x, y - 10, 16, STONE, 380, 0.7, 6);
    this.vfx.puffs(x, y - 8, 10, 26, DUST, 1.2, 90);
    this.vfx.sparks(x, y - 6, 14, SAND, 300, -Math.PI / 2, 2.6, 0.5, 900);
    this.sfxAt && this.sfxAt('hg_slam', x / TS, y / TS);
  },
  /** 막 넘김 — 모래시계가 뒤집힌다(entity/boss-hourglass) */
  hourglassPhaseFx(e: Enemy) { e.hgFlip(); },
  /** 상시 — 무릎 · 팔걸이 틈에서 모래가 드문드문 흘러내린다 */
  hourglassAmbient(e: Enemy) {
    if (Math.random() < 0.06) {
      const s = Math.random() < 0.5 ? -1 : 1, [x, y] = hgAt(e, 42 + s * (14 + Math.random() * 22), 60 + Math.random() * 16);
      this.parts.push(new Part(x, y, SAND, 30, 1.2, { spd: 0.3, r: 1.1, g: 0.5 }));
    }
  },
};
mixin(Game.prototype, BossHourglassFx, true);
