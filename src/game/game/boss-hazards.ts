/* ===== game/boss-hazards.js — 보스 기술이 남기는 것 — 예고 원 · 떨어짐 · 광선 · 바닥 충격파 · 남는 바닥 · 벽 · 소용돌이 · 바람 · 분신 · 외침 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT } from '../lang.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { Part, Proj } from '../entity.js';
import { Game } from '../game.js';
import { STRIKE_ART } from './boss-hazard-art.js';
import { BEAM_ART, VORTEX_ART, WALL_ART, WAVE_ART, ZONE_ART, drawPush } from './boss-field-art.js';
import { drawDecoy, drawTell } from './boss-tell-art.js';
import { drawArm } from './boss-pool-art.js';
/* ★ 피해는 호스트(혼자면 나)만 매기고, 끌림 · 밀림 · 느려짐은 화면마다 제 플레이어(me)에게만 건다 — 남의 몸은 그 사람 화면이 움직인다.
   그래서 위험 지대는 만들어질 때 참가자에게 그대로 보낸다(bhz) — 같은 시각에 같은 예고를 보고 같은 때 피한다. */

const FX_COL: Record<string, string> = { gel: '#6fa8ff', bone: '#ede4c8', flesh: '#c04a6a', ice: '#bfefff', frost: '#9fe0ff', rune: '#9fe8d8',
  meteor: '#ffc070', rock: '#b8a07a', plant: '#7fd06a', seed: '#a8d86a', sun: '#ffe08a', sand: '#e8c070', spore: '#8ff0c8', bile: '#a8c84a',
  water: '#7fc8ff', fire: '#ff8a3a', metal: '#c8c8d8', bolt: '#cfe6ff', sludge: '#8a7a68' };

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
          if (h.fx === 'sludge') this.poolGeyserFx(h);                  // 잿물 기둥 · 범람 물보라(game/boss-pool-fx)
          const col = FX_COL[h.fx] || h.c;
          const art = !!STRIKE_ART[h.fx];
          if (h.shape === 'col') {
            if (host) for (const i of this.hitPlayersRect(h.x - h.w / 2, h.y - h.hh, h.x + h.w / 2, h.y, h.dmg)) if (h.inf) this.players[i].inflict(h.inf[0], h.inf[1]);
            if (!art) this.vfx.column(h.x, h.y, h.w * 1.4, h.hh, col, 0.45);
            this.vfx.sparks(h.x, h.y - 4, art ? 4 : 8, col, 300, -Math.PI / 2, 1.2, 0.4, 700);
          } else {
            if (host) this.hitPlayers(h.x, h.y - h.r * 0.4, h.r, h.dmg, h.inf);
            if (!art) this.vfx.flare(h.x, h.y - 6, h.r * 1.2, col, 0.25, 'impact');
            this.vfx.shock(h.x, h.y - 4, h.r * 1.1, col, 0.3, 5, 0.3);
          }
          if (h.fx === 'rock' || h.fx === 'meteor' || h.fx === 'boulder' || h.fx === 'metal') { this.vfx.puffs(h.x, h.y - 8, 4, 16, 'rgba(120,100,80,.8)', 0.8, 20); this.shake = Math.max(this.shake, 5); }
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
          if (h.grow) { h.hh = Math.min(h.grow, h.hh + dt * 16); h.w = h.hh; }          // 눈사태 — 구르며 커진다
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
          if (host && h.ink && h.tick <= 0) {                     // 먹물 구름 — 피해 없이 앞만 가린다
            h.tick = 0.5;
            for (const q of this.players) if (!q.dead && q.hp > 0 && Math.hypot(q.cx - h.x, q.cy - (h.y - 14)) < h.r) q.inflict('inked', 2.5);
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
          if (!WALL_ART[h.fx] && Math.random() < dt * 40) this.parts.push(new Part(h.x + (Math.random() - .5) * h.w, h.top + Math.random() * (h.bot - h.top), h.c, -20, .4));
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
        } break;
        default: this.sigUpdate(h, dt, host, me);                       // 고유 기술이 놓은 것(game/boss-sig)
      }
      if (h.t >= h.life) L.splice(i, 1);
    }
  },

  /** 세계 위 — 예고는 또렷하게(피할 자리가 보여야 한다). 그림은 기술 결(fx)마다 제 것(game/boss-hazard-art · boss-field-art · boss-tell-art) */
  drawBossHazards(c: CanvasRenderingContext2D) {
    const L = this.bhz; if (!L || !L.length) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, T0 = this.time || 0;
    c.save();
    for (const h of L) {
      const col = FX_COL[h.fx] || h.c || '#ffb070', k = Math.min(1, h.t / Math.max(0.01, h.delay || h.tele || 0.5));
      if (h.sd === undefined) h.sd = (h.x || 0) * 0.013 + (h.y || 0) * 0.007;
      switch (h.k) {
        case 'strike': {
          const x = h.x - cx0, y = h.y - cy0, art = STRIKE_ART[h.fx];
          if (!art) { if (!h.done) this.drawPlainTell(c, h, x, y, col, k); break; }
          if (!h.done) {
            /* 예고 바닥 — 맞을 자리는 늘 옅게 짚어 준다(그림이 작아도 피할 칸이 보이게) */
            c.globalAlpha = 0.18 + 0.22 * k; c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash([5, 5]);
            if (h.shape === 'col') c.strokeRect(x - h.w / 2 + 0.5, y - 3, h.w - 1, 3);
            else { c.beginPath(); c.ellipse(x, y - 1, h.r, h.r * 0.26, 0, 0, TAU); c.stroke(); }
            c.setLineDash([]); c.globalAlpha = 1;
            art.tell(c, h, x, y, k, T0);
          } else if (!art.lit) art.hit(c, h, x, y, Math.min(1, (h.t - h.delay) / Math.max(0.05, h.life - h.delay)), T0);   // lit 은 빛 앞에서(drawBossLit)
        } break;
        case 'line': {
          c.globalAlpha = 0.35 + 0.35 * Math.sin(T0 * 30); c.strokeStyle = col; c.lineWidth = h.w || 3; c.setLineDash([10, 8]);
          c.beginPath(); c.moveTo(h.x0 - cx0, h.y0 - cy0); c.lineTo(h.x1 - cx0, h.y1 - cy0); c.stroke(); c.setLineDash([]);
          c.globalAlpha = 1;
        } break;
        case 'beam': {
          const x = h.x - cx0, y = h.y - cy0, ex = Math.cos(h.a) * h.len, ey = Math.sin(h.a) * h.len;
          if (h.t <= h.tele) {
            c.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(T0 * 18)); c.strokeStyle = col; c.lineWidth = 2;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + ex, y + ey); c.stroke(); c.globalAlpha = 1;
          } else {
            const fade = Math.min(1, (h.life - h.t) * 4, (h.t - h.tele) * 8), art = BEAM_ART[h.fx];
            c.save(); c.translate(x, y); c.rotate(h.a);
            if (art) art(c, h, x, y, h.len, h.w, fade, T0);
            else {
              const im = Sprites.vfxArt('beam', col);
              c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
              if (im) c.drawImage(im, 0, -h.w * 1.2, h.len, h.w * 2.4);
              c.fillStyle = '#ffffff'; c.fillRect(0, -h.w * 0.12, h.len, h.w * 0.25);
            }
            c.restore();
          }
        } break;
        case 'wave': {
          const x = h.x - cx0, y = h.y - cy0, art = WAVE_ART[h.fx] || WAVE_ART.rock;
          art(c, h, x, y, T0);
        } break;
        case 'zone': {
          const x = h.x - cx0, y = h.y - cy0, f = Math.min(1, h.t * 3, (h.life - h.t) * 2), art = ZONE_ART[h.fx];
          if (art) { art(c, h, x, y, f, T0); break; }
          const g = c.createRadialGradient(x, y - 6, 2, x, y - 6, h.r);
          g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = 0.45 * f; c.fillStyle = g; c.beginPath(); c.ellipse(x, y - 6, h.r, h.r * 0.45, 0, 0, TAU); c.fill();
          c.globalAlpha = 1;
        } break;
        case 'wall': {
          const x = h.x - cx0, f = Math.min(1, h.t * 4, (h.life - h.t) * 3), art = WALL_ART[h.fx];
          if (art) { art(c, h, x, h.top - cy0, h.bot - cy0, f, T0); break; }
          const g = c.createLinearGradient(x - h.w / 2, 0, x + h.w / 2, 0);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = 0.75 * f; c.fillStyle = g; c.fillRect(x - h.w / 2, h.top - cy0, h.w, h.bot - h.top); c.globalAlpha = 1;
        } break;
        case 'vortex': {
          const x = h.x - cx0, y = h.y - cy0, f = Math.min(1, h.t * 3, (h.life - h.t) * 3 + 0.2), art = VORTEX_ART[h.fx];
          if (art) { art(c, h, x, y, f, T0); break; }
          const im = Sprites.vfxArt('swirl', col);
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * f;
          if (im) { c.save(); c.translate(x, y); if (h.floor) c.scale(1, 0.35); c.rotate(-h.t * 4); c.drawImage(im, -h.r, -h.r, h.r * 2, h.r * 2); c.restore(); }
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        } break;
        case 'push': drawPush(c, h, cx0, cy0, this.W, this.H, T0, Math.min(1, h.t * 4, (h.life - h.t) * 3)); break;
        case 'decoy': drawDecoy(c, h, h.x - cx0, h.y - cy0, Math.min(1, h.t * 4, (h.life - h.t) * 4), T0); break;
        case 'aura': {
          const b = this.hzBoss(h); if (!b) break;
          const box = { x: b.x - cx0, y: b.y - cy0, w: b.w, h: b.h, cx: b.cx - cx0, cy: b.cy - cy0, feet: b.y + b.h - cy0, face: b.facing < 0 ? -1 : 1 };
          drawTell(c, h, box, k, T0);
        } break;
        default: this.drawSig(c, h, cx0, cy0, T0); break;              // 고유 기술(game/boss-sig-art)
        case 'call': {
          const b = this.hzBoss(h), x = (b ? b.cx : h.x) - cx0, y = (b ? b.y : h.y) - cy0 - 26 - (b ? Math.min(70, b.w * 0.45) : 0), f = Math.min(1, h.t * 5, (h.life - h.t) * 3);   // 이름은 예고 소품(머리 위)보다 위에
          c.globalAlpha = f; c.font = 'bold 15px ' + FONT; c.textAlign = 'center';
          c.lineWidth = 4; c.strokeStyle = 'rgba(10,8,12,.85)'; c.strokeText('『' + h.txt + '』', x, y);
          c.fillStyle = col; c.fillText('『' + h.txt + '』', x, y);
          c.globalAlpha = 1;
        } break;
      }
    }
    c.restore();
  },
  /** 몸으로 된 위험 지대(잿물 팔 · 잿물 기둥) — 빛 앞(actors)에서 칠해 둘레처럼 어둠을 받는다. 예고는 drawBossHazards(빛 뒤) */
  drawBossLit(c: CanvasRenderingContext2D) {
    this.drawOrganArms(c);                                          // 뼈 오르간의 팔 — 쉴 때도 그린다
    const L = this.bhz; if (!L || !L.length) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, T0 = this.time || 0;
    for (const h of L) {
      if (h.k === 'parm') drawArm(c, h, this.hzBoss(h), cx0, cy0, T0);
      else if (h.k === 'strike' && h.done) {
        const art = STRIKE_ART[h.fx];
        if (art && art.lit) art.hit(c, h, h.x - cx0, h.y - cy0, Math.min(1, (h.t - h.delay) / Math.max(0.05, h.life - h.delay)), T0);
      }
    }
  },
  /** 결 그림이 없는 위험 지대(예전 · 몹 스킬이 빌려 쓰는 것) — 기둥 · 타원 */
  drawPlainTell(c: CanvasRenderingContext2D, h: Bag, x: number, y: number, col: string, k: number) {
    c.globalAlpha = 0.25 + 0.35 * k; c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2;
    if (h.shape === 'col') {
      c.globalAlpha = 0.12 + 0.2 * k; c.fillRect(x - h.w / 2, y - h.hh, h.w, h.hh);
      c.globalAlpha = 0.7; c.strokeRect(x - h.w / 2 + 0.5, y - h.hh, h.w - 1, h.hh);
      c.globalAlpha = 0.5 + 0.4 * k; c.fillRect(x - h.w / 2, y - 4, h.w * k, 4);
    } else {
      c.beginPath(); c.ellipse(x, y - 2, h.r, h.r * 0.32, 0, 0, TAU); c.globalAlpha = 0.18 + 0.2 * k; c.fill();
      c.globalAlpha = 0.8; c.stroke();
      c.beginPath(); c.ellipse(x, y - 2, h.r * k, h.r * 0.32 * k, 0, 0, TAU); c.globalAlpha = 0.45; c.fill();
    }
    c.globalAlpha = 1;
  },
};

mixin(Game.prototype, BossHazardPart, true);
