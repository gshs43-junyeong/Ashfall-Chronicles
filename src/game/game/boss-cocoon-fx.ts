/* ===== game/boss-cocoon-fx.ts — 잿빛 고치 · 불나방의 위험 지대 움직임과 입자 — 휘두름 · 실 · 바람 · 인분 · 돌진 · 갈라짐 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { hangAt } from '../entity/boss-cocoon.js';
import { Game } from '../game.js';
import { PUPA_H, threadPupa } from './boss-cocoon-art.js';
/* 피해는 호스트(host)만, 바람의 밀림은 화면마다 제 플레이어(me)에게. 입자는 그림과 같은 박자로 — 맞는 순간은 짧은 멈춤 · 흔들림으로 손에 남긴다. */

const FIRE = '#ff8a40', ASH = 'rgba(96,90,84,.75)', SMOKE = 'rgba(160,150,140,.4)';
/** 점과 선분 사이 거리 */
const segD = (px: number, py: number, x0: number, y0: number, x1: number, y1: number) => {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L));
  return Math.hypot(px - x0 - dx * u, py - y0 - dy * u);
};

export const BossCocoonFx: Bag = {
  /** 위험 지대 한 칸의 움직임(sigUpdate 에서) — 처리했으면 true */
  cocoonHz(h: Bag, dt: number, host: boolean, me: any) {
    const b = this.hzBoss(h);
    switch (h.k) {
      case 'chang': case 'cdark': return true;
      case 'chusk': {                                               // 참가자 화면 — 허물이 생긴 순간이 곧 고치가 터진 순간
        if (h.ghost && !h.fx) { h.fx = 1; const [x, y] = hangAt(h.ax, h.ay, h.R, 0); this.cocoonBurstFx(x, y); }
      } return true;
      case 'cswing': {                                              // 휘두르는 동안 고치 몸통에 닿으면(한 사람에 한 번)
        if (!b || h.t < h.tele || h.t > h.tele + h.dur) return true;
        if (Math.random() < 0.5) this.vfx.puffs(b.cx, b.cy + 60, 1, 18, ASH, 0.8, 30);              // 재가 털려 나간다
        if (Math.random() < 0.4) this.vfx.motes(b.cx + (Math.random() - 0.5) * 60, b.cy + 90, 1, FIRE, 20, 40, 0.8, 4);
        if (host) {
          const ax = b.cx, ay = b.cy, th = b.cocTh || 0, ux = Math.sin(th), uy = Math.cos(th);
          const nw = [];
          for (let i = 0; i < this.players.length; i++) {
            const q = this.players[i]; if (q.dead || q.hp <= 0 || (h.hit && h.hit.includes(i))) continue;
            if (segD(q.cx, q.cy, ax - ux * 110, ay - uy * 110, ax + ux * 120, ay + uy * 120) < 54 + q.w / 2) { q.hurt(h.dmg, b.cx); nw.push(i); }
          }
          if (nw.length) { h.hit = (h.hit || []).concat(nw); this.cocoonHitFx(nw.map((i: number) => this.players[i]), Math.sign(Math.cos(th) * ux) || 1); }
        }
        if (!h.snd && h.t > h.tele + h.dur * 0.2) { h.snd = 1; this.sfxAt && this.sfxAt('cocoon_swing', b.cx / TS, b.cy / TS); }
      } return true;
      case 'cthread': {                                             // 번데기에 닿으면 덴다(0.8초마다) · 실이 끝나면 번데기가 터진다
        const k = h.t < h.tele ? 0 : Math.min(1, (h.t - h.tele) / h.drop);
        if (k > 0 && !h.landFx) { h.landFx = 1; this.vfx.motes(h.x, h.top + 8, 6, '#e8e0d0', 30, 60, 0.8, 3); }
        if (host && k >= 1) {
          const by = threadPupa(h, 1);
          for (let i = 0; i < this.players.length; i++) {
            const q = this.players[i]; if (q.dead || q.hp <= 0) continue;
            h.cd = h.cd || {}; if ((h.cd[i] || 0) > h.t) continue;
            if (q.x < h.x + 16 && q.x + q.w > h.x - 16 && q.y < by && q.y + q.h > by - PUPA_H + 10) { q.hurt(h.dmg, h.x); q.inflict && q.inflict('burn', 2); h.cd[i] = h.t + 0.8; }
          }
        }
        if (!h.popped && h.t > h.life - 0.12) {
          h.popped = 1; const by = threadPupa(h, 1);
          this.vfx.sparks(h.x, by - 30, 10, FIRE, 260, -Math.PI / 2, 2.4, 0.5, 600); this.vfx.puffs(h.x, by - 30, 3, 14, ASH, 0.8, 14);
        }
      } return true;
      case 'cgust': {                                               // 날개를 칠 때마다 바깥으로 민다(땅 위 · 공중 모두)
        if (!b) return true;
        h.x = b.cx; h.y = b.cy;
        const ph = h.t - h.tele;
        if (ph < 0) return true;
        const beat = Math.floor(ph / h.every), u = (ph % h.every) / h.every;
        if (beat < h.beats && h.lastBeat !== beat) {
          h.lastBeat = beat;
          const fy = this.hzFloor(b.cx, b.cy);
          for (const s of [-1, 1]) this.vfx.puffs(b.cx + s * 120, fy - 10, 4, 22, SMOKE, 1, 80);
          this.vfx.shock(b.cx, b.cy, 260, '#ffd2a0', 0.35, 6, 0.4);
          this.shake = Math.max(this.shake, 5);
        }
        if (me && !me.dead && beat < h.beats && u < 0.45) {
          const dx = me.cx - b.cx, d = Math.abs(dx);
          if (d < 620) me.vx += Math.sign(dx || 1) * h.push * (1 - d / 700) * dt * 3.2;
        }
      } return true;
      case 'cscale': {                                              // 앉은 가루 위에 서 있으면 탄다(0.7초마다)
        if (h.t >= h.delay && !h.landed) { h.landed = 1; this.vfx.puffs(h.x, h.y - 4, 2, 12, ASH, 0.6, h.w * 0.4); this.vfx.motes(h.x, h.y - 2, 4, FIRE, 12, 30, 0.7, 3); }
        if (host && h.t >= h.delay) {
          h.cd = h.cd || {};
          for (let i = 0; i < this.players.length; i++) {
            const q = this.players[i]; if (q.dead || q.hp <= 0 || (h.cd[i] || 0) > h.t) continue;
            if (Math.abs(q.cx - h.x) < h.w / 2 && Math.abs(q.y + q.h - h.y) < 12) { q.hurt(h.dmg, h.x); h.cd[i] = h.t + 0.7; }
          }
        }
        if (h.t >= h.delay && Math.random() < 0.06) this.vfx.motes(h.x + (Math.random() - 0.5) * h.w, h.y - 2, 1, FIRE, 10, 30, 0.6, 3);
      } return true;
      case 'cdive': {                                               // 돌진 — 지나는 길에 닿으면(한 사람에 한 번) · 빛에 닿는 순간 불꽃이 터진다
        if (!b) return true;
        if (h.t >= h.tele && h.t < h.tele + h.dur) {
          if (Math.random() < 0.8) this.vfx.motes(b.cx, b.cy, 2, FIRE, 30, 80, 0.6, 4);
          if (host) {
            const nw = [];
            for (let i = 0; i < this.players.length; i++) {
              const q = this.players[i]; if (q.dead || q.hp <= 0 || (h.hit && h.hit.includes(i))) continue;
              if (Math.hypot(q.cx - b.cx, q.cy - b.cy) < 70) { q.hurt(h.dmg, b.cx); q.inflict && q.inflict('burn', 3); nw.push(i); }
            }
            if (nw.length) { h.hit = (h.hit || []).concat(nw); this.cocoonHitFx(nw.map((i: number) => this.players[i]), Math.sign(h.x1 - h.x0) || 1); }
          }
          if (!h.flash && h.t > h.tele + h.dur * 0.55) {
            h.flash = 1;
            this.vfx.flare(h.lx, h.ly, 70, h.bait ? '#ffe08a' : FIRE, 0.25, 'impact'); this.vfx.sparks(h.lx, h.ly, 16, FIRE, 380, -Math.PI / 2, 2.8, 0.5, 600);
          }
        }
      } return true;
    }
    return false;
  },
  /** 고치 · 나방에 맞은 순간 — 짧은 멈춤 · 흔들림 · 재와 불티가 맞은 쪽으로 튄다 */
  cocoonHitFx(qs: any[], s: number) {
    this.hitStop && this.hitStop(0.08); this.shake = Math.max(this.shake, 8);
    for (const q of qs) {
      this.vfx.flare(q.cx, q.cy, 50, '#ffd2a0', 0.16, 'impact');
      this.vfx.sparks(q.cx, q.cy, 14, FIRE, 420, s > 0 ? 0 : Math.PI, 1, 0.45, 500);
      this.vfx.puffs(q.cx, q.cy, 3, 16, ASH, 0.8, 16);
    }
  },
  /** 고치가 갈라져 나방이 나오는 순간 — 실 조각 · 불티 · 큰 섬광 · 재 구름 */
  cocoonBurstFx(x: number, y: number) {
    this.vfx.flare(x, y, 200, FIRE, 0.4, 'impact');
    this.vfx.shock(x, y, 300, '#ffb070', 0.5, 12);
    this.vfx.sparks(x, y, 50, FIRE, 560, -Math.PI / 2, 3.2, 0.9, 500);
    this.vfx.shards(x, y, 22, '#8a847c', 420, 1, 7);
    this.vfx.puffs(x, y, 14, 30, ASH, 1.6, 90);
    for (let i = 0; i < 24; i++) this.parts.push(new Part(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 200, '#b4ada2', -60 - Math.random() * 120, 1.4, { spd: 1.2, r: 1.4, g: 0.25, drag: 0.97 }));
    this.shake = Math.max(this.shake, 16);
  },
  /** 막 넘김 — 1→2 막은 고치가 터지고(cocoonBurst), 2→3 막은 날개가 찢기며 불티가 쏟아진다 */
  cocoonPhaseFx(e: Enemy, ph: number) {
    if (ph <= 1) { e.cocoonBurst(); return; }
    this.vfx.sparks(e.cx, e.cy, 36, FIRE, 480, -Math.PI / 2, 3, 0.8, 500);
    this.vfx.shards(e.cx, e.cy, 14, '#6e6258', 380, 0.9, 6);
    this.vfx.flare(e.cx, e.cy, 140, FIRE, 0.3, 'impact');
  },
  /** 상시 — 고치는 밑동에서 재가 드문드문 떨어지고, 나방은 날개에서 불티 · 인분이 진다 */
  cocoonAmbient(e: Enemy) {
    if (!e.cocMoth && !this.cocMothSeen(e)) {
      if (Math.random() < 0.05) this.parts.push(new Part(e.cx + (Math.random() - 0.5) * 40, e.y + e.h - 10, '#8a847c', 10, 1.6, { spd: 0.4, r: 1.2, g: 0.3, drag: 0.98 }));
      return;
    }
    if (Math.random() < 0.35) this.vfx.motes(e.cx + (Math.random() - 0.5) * 220, e.cy - 20 + Math.random() * 40, 1, FIRE, 14, 50, 0.9, 3);
    if (Math.random() < 0.15) this.parts.push(new Part(e.cx + (Math.random() - 0.5) * 200, e.cy, '#c8bcb0', 20, 1.8, { spd: 0.3, r: 1.2, g: 0.15, drag: 0.98 }));
  },
};
mixin(Game.prototype, BossCocoonFx, true);
