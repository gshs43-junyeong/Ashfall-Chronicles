/* ===== game/boss-hazards.js — 보스 기술이 남기는 것 — 예고 원 · 떨어짐 · 광선 · 바닥 충격파 · 남는 바닥 · 벽 · 소용돌이 · 바람 · 분신 · 외침 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT } from '../lang.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { Part, Proj } from '../entity.js';
import { Game } from '../game.js';
/* ★ 피해는 호스트(혼자면 나)만 매기고, 끌림 · 밀림 · 느려짐은 화면마다 제 플레이어(me)에게만 건다 — 남의 몸은 그 사람 화면이 움직인다.
   그래서 위험 지대는 만들어질 때 참가자에게 그대로 보낸다(bhz) — 같은 시각에 같은 예고를 보고 같은 때 피한다. */

const FX_COL: Record<string, string> = { gel: '#6fa8ff', bone: '#ede4c8', flesh: '#c04a6a', ice: '#bfefff', frost: '#9fe0ff', rune: '#9fe8d8',
  meteor: '#ffc070', rock: '#b8a07a', plant: '#7fd06a', seed: '#a8d86a', sun: '#ffe08a', sand: '#e8c070', spore: '#8ff0c8', bile: '#a8c84a',
  water: '#7fc8ff', fire: '#ff8a3a', metal: '#c8c8d8', bolt: '#cfe6ff' };

export const BossHazardPart: Bag = {

  /** 위험 지대를 놓는다(호스트) — 참가자에게도 보낸다. ref 는 따라다닐 보스(보내지 않는다) */
  bossHazard(h: Bag) {
    h.t = 0;
    (this.bhz || (this.bhz = [])).push(h);
    if (this.net && this.net.role !== 'guest') {
      const { ref, ...plain } = h;
      this.netBroadcast({ k: 'bhz', h: plain });
    }
    return h;
  },
  netBossHazard(m: Bag) { const h = m.h; h.t = 0; h.ghost = 1; (this.bhz || (this.bhz = [])).push(h); },

  /** 원 안의 플레이어에게 피해(호스트만) */
  hitPlayers(x: number, y: number, r: number, dmg: number, inf?: [string, number, number?]) {
    if (this.net && this.net.role === 'guest') return;
    for (const q of this.players) {
      if (q.dead || q.hp <= 0) continue;
      const nx = Math.max(q.x, Math.min(x, q.x + q.w)), ny = Math.max(q.y, Math.min(y, q.y + q.h));
      if ((nx - x) ** 2 + (ny - y) ** 2 > r * r) continue;
      const open = !(q.iframe > 0); q.hurt(dmg, x);
      if (inf && open) q.inflict(inf[0], inf[1], inf[2] ? dmg * inf[2] : 0);
    }
  },
  /** 네모 안의 플레이어에게 피해(호스트만) — 맞은 사람을 돌려준다(한 번만 맞게 거를 때) */
  hitPlayersRect(x0: number, y0: number, x1: number, y1: number, dmg: number, skip?: number[]) {
    const hit: number[] = [];
    if (this.net && this.net.role === 'guest') return hit;
    this.players.forEach((q: any, i: number) => {
      if (q.dead || q.hp <= 0 || (skip && skip.includes(i))) return;
      if (q.x + q.w < x0 || q.x > x1 || q.y + q.h < y0 || q.y > y1) return;
      q.hurt(dmg, (x0 + x1) / 2); hit.push(i);
    });
    return hit;
  },
  /** 따라다니는 보스 — 호스트는 붙잡아 둔 몸, 참가자는 같은 번호의 그림자 */
  hzBoss(h: Bag) {
    if (h.ref) return h.ref.dead ? null : h.ref;
    if (h.nid === undefined) return null;
    return this.ents.find((e: any) => e.nid === h.nid && !e.dead) || null;
  },

  updateBossHazards(dt: number) {
    const L = this.bhz; if (!L || !L.length) return;
    const host = !(this.net && this.net.role === 'guest'), me = this.me, w = this.world;
    for (let i = L.length - 1; i >= 0; i--) {
      const h = L[i]; h.t += dt;
      const b = this.hzBoss(h);
      if (b && h.follow) { h.x = b.cx; h.y = b.cy; }
      switch (h.k) {
        case 'strike': if (!h.done && h.t >= h.delay) {
          h.done = 1;
          const col = FX_COL[h.fx] || h.c;
          if (h.shape === 'col') {
            if (host) this.hitPlayersRect(h.x - h.w / 2, h.y - h.hh, h.x + h.w / 2, h.y, h.dmg);
            this.vfx.column(h.x, h.y, h.w * 1.4, h.hh, col, 0.45);
            this.vfx.sparks(h.x, h.y - 4, 8, col, 380, -Math.PI / 2, 1.2, 0.4, 700);
          } else {
            if (host) this.hitPlayers(h.x, h.y - h.r * 0.4, h.r, h.dmg);
            this.vfx.flare(h.x, h.y - 6, h.r * 1.2, col, 0.25, 'impact');
            this.vfx.shock(h.x, h.y - 4, h.r * 1.3, col, 0.35, 7, 0.4);
          }
          if (h.fx === 'rock' || h.fx === 'meteor') { this.vfx.puffs(h.x, h.y - 8, 4, 16, 'rgba(120,100,80,.8)', 0.8, 20); this.shake = Math.max(this.shake, 5); }
          if (host && h.zone) this.bossHazard(Object.assign({ k: 'zone', x: h.x, y: h.y, c: col, fx: h.fx, life: 4, r: 46 }, h.zone, { dmg: h.zoneDmg || 0 }));
          if (host && h.burstRing) for (let k = 0; k < h.burstRing; k++) {
            const a = k / h.burstRing * TAU;
            this.projs.push(new Proj(h.x, h.y - 10, Math.cos(a) * 200, Math.sin(a) * 200, h.dmg * 0.5, 'enemy', 'poison'));
          }
        } break;
        case 'beam': {
          if (b) { h.x = b.cx; h.y = b.cy; }
          if (h.t > h.tele) {
            h.a += h.va * dt;
            h.tick = (h.tick || 0) - dt;
            if (host && h.tick <= 0) {
              h.tick = 0.25;
              const ex = Math.cos(h.a), ey = Math.sin(h.a);
              for (const q of this.players) {
                if (q.dead || q.hp <= 0) continue;
                const px = q.cx - h.x, py = q.cy - h.y, along = px * ex + py * ey;
                if (along < 0 || along > h.len) continue;
                if (Math.abs(px * ey - py * ex) < h.w / 2 + 10) q.hurt(h.dmg, h.x);
              }
            }
          }
        } break;
        case 'wave': {
          h.x += h.vx * dt;
          const tx = Math.floor((h.x + Math.sign(h.vx) * h.w / 2) / TS), ty = Math.floor((h.y - 6) / TS);
          if (w.solid(tx, ty)) { h.t = h.life; break; }                     // 벽에 부딪혀 꺼진다
          if (host) h.hit = (h.hit || []).concat(this.hitPlayersRect(h.x - h.w / 2, h.y - h.hh, h.x + h.w / 2, h.y, h.dmg, h.hit));
          if (Math.random() < dt * 30) this.parts.push(new Part(h.x, h.y - 4, h.c, -120, .4));
        } break;
        case 'zone': {
          h.tick = (h.tick || 0) - dt;
          if (host && h.tick <= 0 && h.dmg) {
            h.tick = 0.5;
            const inf: any = h.poison ? ['poison', 3, 0.3] : h.burn ? ['burn', 3, 0.3] : h.slow ? ['frostbite', 1.5] : undefined;
            this.hitPlayers(h.x, h.y - 14, h.r, h.dmg, inf);
          }
          if (h.slow && me && !me.dead && Math.abs(me.cx - h.x) < h.r && Math.abs(me.y + me.h - h.y) < 40) me.vx *= Math.pow(1 - h.slow, dt * 6);
        } break;
        case 'wall': {
          h.x += h.vx * dt;
          if (host) {
            const hit = this.players.map((q: any, j: number) => {
              if (h.hit && h.hit.includes(j)) return -1;
              if (q.dead || q.hp <= 0 || q.x + q.w < h.x - h.w / 2 || q.x > h.x + h.w / 2) return -1;
              const inWall = q.y + q.h > h.top && q.y < h.bot;
              if (!inWall) return -1;
              q.hurt(h.dmg, h.x - h.vx); return j;
            }).filter((j: number) => j >= 0);
            if (hit.length) h.hit = (h.hit || []).concat(hit);
          }
          if (Math.random() < dt * 40) this.parts.push(new Part(h.x + (Math.random() - .5) * h.w, h.top + Math.random() * (h.bot - h.top), h.c, -20, .4));
        } break;
        case 'vortex': {
          if (b && !h.fixed) { h.x = b.cx; h.y = b.cy; }
          if (me && !me.dead && h.t < h.life) {
            const dx = h.x - me.cx, dy = h.y - me.cy, d = Math.hypot(dx, dy);
            if (d < h.r && d > 8) {
              const f = h.pull * (1 - d / h.r * 0.6) * dt;
              me.vx += dx / d * f * 2.2; if (!h.floor) me.vy += dy / d * f * 1.2;
            }
          }
          if (!h.burstDone && h.t >= h.life - 0.05) {
            h.burstDone = 1;
            if (h.burst) {
              if (host) this.hitPlayers(h.x, h.y, h.burst, h.dmg);
              this.vfx.flare(h.x, h.y, h.burst, h.c, 0.3, 'impact'); this.vfx.shock(h.x, h.y, h.burst * 1.4, h.c, 0.4, 9);
              this.shake = Math.max(this.shake, 9);
            }
          }
        } break;
        case 'push': {
          if (me && !me.dead) me.vx += Math.sign(h.force) * Math.sign(me.cx - h.x || 1) * Math.abs(h.force) * dt * 1.6;
          if (Math.random() < dt * 60) {
            const cx = this.cam.x + Math.random() * this.W, cy = this.cam.y + Math.random() * this.H;
            const pt = new Part(cx, cy, h.c, 0, .35, { g: 0, drag: 1 }); pt.vx = Math.sign(h.force) * Math.sign(cx - h.x || 1) * 520; pt.vy = 0;
            this.parts.push(pt);
          }
        } break;
      }
      if (h.t >= h.life) L.splice(i, 1);
    }
  },

  /** 세계 위 — 예고는 또렷하게(피할 자리가 보여야 한다), 터진 뒤는 결 그림이 맡는다 */
  drawBossHazards(c: CanvasRenderingContext2D) {
    const L = this.bhz; if (!L || !L.length) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, T0 = this.time || 0;
    c.save();
    for (const h of L) {
      const col = FX_COL[h.fx] || h.c || '#ffb070', k = Math.min(1, h.t / Math.max(0.01, h.delay || h.tele || 0.5));
      switch (h.k) {
        case 'strike': if (!h.done) {
          const x = h.x - cx0, y = h.y - cy0;
          c.globalAlpha = 0.25 + 0.35 * k; c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2;
          if (h.shape === 'col') {
            c.globalAlpha = 0.12 + 0.2 * k; c.fillRect(x - h.w / 2, y - h.hh, h.w, h.hh);
            c.globalAlpha = 0.7; c.strokeRect(x - h.w / 2 + 0.5, y - h.hh, h.w - 1, h.hh);
            c.globalAlpha = 0.5 + 0.4 * k; c.fillRect(x - h.w / 2, y - 4, h.w * k, 4);   // 차오르는 띠 — 언제 떨어지는지
          } else {
            c.beginPath(); c.ellipse(x, y - 2, h.r, h.r * 0.32, 0, 0, TAU); c.globalAlpha = 0.18 + 0.2 * k; c.fill();
            c.globalAlpha = 0.8; c.stroke();
            c.beginPath(); c.ellipse(x, y - 2, h.r * k, h.r * 0.32 * k, 0, 0, TAU); c.globalAlpha = 0.45; c.fill();
            if (h.fx === 'meteor' || h.fx === 'rock') {                          // 떨어지는 덩이 — 하늘(천장)에서 내려온다
              const fy = y - 420 * (1 - k);
              c.globalAlpha = 0.9; c.fillStyle = h.fx === 'rock' ? '#7a6a58' : '#ffd08a';
              c.beginPath(); c.arc(x, fy, 6 + h.r * 0.12, 0, TAU); c.fill();
            }
          }
        } break;
        case 'line': {
          c.globalAlpha = 0.35 + 0.35 * Math.sin(T0 * 30); c.strokeStyle = col; c.lineWidth = h.w || 3; c.setLineDash([10, 8]);
          c.beginPath(); c.moveTo(h.x0 - cx0, h.y0 - cy0); c.lineTo(h.x1 - cx0, h.y1 - cy0); c.stroke(); c.setLineDash([]);
        } break;
        case 'beam': {
          const x = h.x - cx0, y = h.y - cy0, ex = Math.cos(h.a) * h.len, ey = Math.sin(h.a) * h.len;
          if (h.t <= h.tele) {
            c.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(T0 * 18)); c.strokeStyle = col; c.lineWidth = 2;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + ex, y + ey); c.stroke();
          } else {
            const im = Sprites.vfxArt('beam', col), fade = Math.min(1, (h.life - h.t) * 4);
            c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
            if (im) { c.save(); c.translate(x, y); c.rotate(h.a); c.drawImage(im, 0, -h.w * 1.2, h.len, h.w * 2.4); c.restore(); }
            c.strokeStyle = '#ffffff'; c.lineWidth = h.w * 0.25; c.beginPath(); c.moveTo(x, y); c.lineTo(x + ex, y + ey); c.stroke();
            c.globalCompositeOperation = 'source-over';
          }
        } break;
        case 'wave': {
          const x = h.x - cx0, y = h.y - cy0, im = Sprites.vfxArt('crack', col);
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.9;
          if (im) c.drawImage(im, x - h.w, y - 10, h.w * 2, 20);
          c.fillStyle = col; c.globalAlpha = 0.5;
          c.beginPath(); c.moveTo(x - h.w / 2, y); c.quadraticCurveTo(x, y - h.hh * 1.6, x + h.w / 2, y); c.fill();
          c.globalCompositeOperation = 'source-over';
        } break;
        case 'zone': {
          const x = h.x - cx0, y = h.y - cy0, f = Math.min(1, h.t * 3, (h.life - h.t) * 2);
          const g = c.createRadialGradient(x, y - 6, 2, x, y - 6, h.r);
          g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = 0.45 * f; c.fillStyle = g; c.beginPath(); c.ellipse(x, y - 6, h.r, h.r * 0.45, 0, 0, TAU); c.fill();
          c.globalAlpha = 0.6 * f; c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash([6, 6]);
          c.beginPath(); c.ellipse(x, y - 4, h.r, h.r * 0.3, 0, 0, TAU); c.stroke(); c.setLineDash([]);
          if (Math.random() < 0.3) this.parts.push(new Part(h.x + (Math.random() - .5) * h.r * 1.6, h.y - 6, col, -40, .6));
        } break;
        case 'wall': {
          const x = h.x - cx0, f = Math.min(1, h.t * 4);
          const g = c.createLinearGradient(x - h.w / 2, 0, x + h.w / 2, 0);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = 0.75 * f; c.fillStyle = g; c.fillRect(x - h.w / 2, h.top - cy0, h.w, h.bot - h.top);
          c.globalAlpha = 0.9 * f; c.strokeStyle = '#ffffff'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(x, h.top - cy0); c.lineTo(x, h.bot - cy0); c.stroke();
        } break;
        case 'vortex': {
          const x = h.x - cx0, y = h.y - cy0, im = Sprites.vfxArt('swirl', col), f = Math.min(1, h.t * 3, (h.life - h.t) * 3 + 0.2);
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * f;
          if (im) { c.save(); c.translate(x, y); if (h.floor) c.scale(1, 0.35); c.rotate(-h.t * 4); c.drawImage(im, -h.r, -h.r, h.r * 2, h.r * 2); c.restore(); }
          c.globalCompositeOperation = 'source-over';
        } break;
        case 'decoy': {
          const x = h.x - cx0, y = h.y - cy0, f = Math.min(1, h.t * 4, (h.life - h.t) * 4);
          const im = Sprites.vfxArt('sigil_void', col);
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 * f;
          if (im) { c.save(); c.translate(x, y); c.rotate(T0); c.drawImage(im, -40, -40, 80, 80); c.restore(); }
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.55 * f; c.fillStyle = col;
          c.beginPath(); c.ellipse(x, y, h.r * 0.45, h.r * 0.8, 0, 0, TAU); c.fill();
        } break;
        case 'aura': {
          const b = this.hzBoss(h); if (!b) break;
          const x = b.cx - cx0, y = b.cy - cy0, im = Sprites.vfxArt('sigil', col), R = Math.max(b.w, b.h) * (0.7 + 0.3 * k);
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.4 * k;
          if (im) { c.save(); c.translate(x, y); c.rotate(T0 * 2); c.drawImage(im, -R, -R, R * 2, R * 2); c.restore(); }
          c.globalCompositeOperation = 'source-over';
        } break;
        case 'call': {
          const b = this.hzBoss(h), x = (b ? b.cx : h.x) - cx0, y = (b ? b.y : h.y) - cy0 - 26, f = Math.min(1, h.t * 5, (h.life - h.t) * 3);
          c.globalAlpha = f; c.font = 'bold 15px ' + FONT; c.textAlign = 'center';
          c.lineWidth = 4; c.strokeStyle = 'rgba(10,8,12,.85)'; c.strokeText('『' + h.txt + '』', x, y);
          c.fillStyle = col; c.fillText('『' + h.txt + '』', x, y);
        } break;
      }
    }
    c.restore();
  },
};

mixin(Game.prototype, BossHazardPart, true);
