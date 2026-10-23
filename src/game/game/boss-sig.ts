/* ===== game/boss-sig.js — 보스 고유 기술이 놓은 것의 움직임 — 거울 · 피뢰침 전류 · 응시 · 버섯 · 혀 · 사슬 · 밀물 · 포탑 · 도가니 · 드론 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Proj } from '../entity.js';
import { HAND, handBox, sweepHand } from '../entity/boss-organ.js';
import { Game } from '../game.js';
/* ★ 피해 · 탄 · 새 위험 지대는 호스트만 만든다(host). 붙잡힘 · 물속 느려짐은 화면마다 제 플레이어(me)에게.
   호스트가 바꾼 상태(밟힌 버섯 · 드론 경보)는 bhzp 로 보내 참가자 그림도 같게 한다. 기술 쪽은 entity/boss-signature. */

/** 점과 선분 사이 거리 */
const segD = (px: number, py: number, x0: number, y0: number, x1: number, y1: number) => {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L));
  return Math.hypot(px - x0 - dx * u, py - y0 - dy * u);
};

export const BossSigPart: Bag = {
  /** 호스트가 위험 지대 상태를 고치고 참가자에게도 알린다 */
  hzPatch(h: Bag, p: Bag) {
    Object.assign(h, p);
    if (this.net && this.net.role !== 'guest' && h.id) this.netBroadcast({ k: 'bhzp', id: h.id, p });
  },
  netHzPatch(m: Bag) { const h = (this.bhz || []).find((q: any) => q.id === m.id); if (h) Object.assign(h, m.p); },
  /** 가장 가까운 산 플레이어 */
  hzNear(x: number, y: number) {
    let best: any = null, bd = 1e18;
    for (const q of this.players) { if (q.dead || q.hp <= 0) continue; const d = (q.cx - x) ** 2 + (q.cy - y) ** 2; if (d < bd) { bd = d; best = q; } }
    return best;
  },
  /** 그 자리 아래 바닥(px) */
  hzFloor(x: number, y: number) {
    const w = this.world, tx = Math.floor(x / TS);
    for (let ty = Math.floor(y / TS); ty < Math.floor(y / TS) + 30; ty++) if (w.solid(tx, ty) && !w.solid(tx, ty - 1)) return ty * TS;
    return y + 40;
  },

  /** 고유 기술 위험 지대 — 처리했으면 true */
  sigUpdate(h: Bag, dt: number, host: boolean, me: any) {
    switch (h.k) {
      case 'parm': {                                                 // 잿물 팔 — 내리치는 순간 한 번(뿌리는 보스를 따라간다)
        const b = this.hzBoss(h); if (b) { h.x = b.cx + h.ox; h.y = b.y + b.h; }
        if (h.t < h.slam) this.poolRiseFx(h.x, h.y, Math.min(1, h.t / h.rise));
        if (!h.hitDone && h.t >= h.slam) {
          h.hitDone = 1;
          if (host) this.hitPlayersRect(h.tx - 58, h.ty - 150, h.tx + 58, h.ty, h.dmg);
          this.poolSlamFx(h.tx, h.ty);
          this.sfxAt && this.sfxAt('pool_slam', h.tx / TS, h.ty / TS);
        }
      } return true;
      case 'osweep': {                                               // 뼈 팔 쓸기 — 쓰는 동안 손이 닿으면(한 사람에 한 번)
        const b = this.hzBoss(h); if (!b) return true;
        const [hx, hy, ph] = sweepHand(h, b);
        if (ph === 1) {
          if (host) {
            const nw = this.hitPlayersRect(...handBox(hx, hy, h.s), h.dmg, h.hit);
            if (nw.length) { h.hit = (h.hit || []).concat(nw); this.organSweepHitFx(nw.map((i: number) => this.players[i]), h.s); }
          }
          this.organSweepFx(hx + h.s * HAND.len * 0.5, hy + (h.low ? HAND.dn - 2 : 0), !!h.low);
          if (!h.snd) { h.snd = 1; this.sfxAt && this.sfxAt('organ_sweep', hx / TS, hy / TS); }
        }
      } return true;
      case 'obreath': {                                              // 풀무 — 들이켜고(김이 빨려 듦) 열린다(혼불이 솟음)
        const b = this.hzBoss(h); if (!b) return true;
        if (!h.fx0) { h.fx0 = 1; this.organBreathFx(b, false); }
        if (!h.fx1 && h.t >= h.open0) { h.fx1 = 1; this.organBreathFx(b, true); }
      } return true;
      case 'oscatter': { const b = this.hzBoss(h); if (b && !h.fx0) { h.fx0 = 1; this.organScatterFx(b); } } return true;
      case 'opipes': case 'oreq': return true;
      case 'chang': case 'chusk': case 'cswing': case 'cthread': case 'cgust': case 'cscale': case 'cdive': case 'cdark': return this.cocoonHz(h, dt, host, me);   // 잿빛 고치(game/boss-cocoon-fx)
      case 'hfist': case 'hsand': case 'hpit': case 'hdead': case 'hflip': return this.hourglassHz(h, dt, host, me);   // 모래시계 거상(game/boss-hourglass-fx)
      case 'pulse': case 'veil': case 'rod': case 'rail': case 'scales': case 'vine': case 'ghost': return true;
      case 'mirror': if (host && !h.fired && h.t >= h.fireAt) {      // 거울마다 차례로 — 쏘는 순간 플레이어가 선 자리로
        h.fired = 1;
        const q = this.hzNear(h.x, h.y);
        if (q) { const a = Math.atan2(q.cy - h.y, q.cx - h.x); this.projs.push(new Proj(h.x, h.y, Math.cos(a) * 360, Math.sin(a) * 360, h.dmg, 'enemy', 'frost')); }
      } return true;
      case 'arc': if (host && h.t > h.on0) {                         // 무릎 높이 전류 — 켜진 동안 닿으면(뛰어넘는다)
        const w = Math.floor((h.t - h.on0) / 0.7), on = (h.t - h.on0) % 0.7 < 0.38;
        if (on && h.hw !== w) {
          for (let pi = 0; pi < this.players.length; pi++) { const q = this.players[pi];
            if (q.dead || q.hp <= 0 || (h.hitW && h.hitW[pi] === w)) continue;
            if (segD(q.cx, q.y + q.h - 8, h.x0, h.y0, h.x1, h.y1) < 16) { q.hurt(h.dmg, q.cx); (h.hitW || (h.hitW = {}))[pi] = w; }
          }
        }
      } return true;
      case 'gaze': {                                                  // 응시 — 시선이 플레이어를 늦게 따라가고, 머문 자리에 별똥
        const q = host ? this.hzNear(h.ex, h.ey) : me;
        if (q) { h.ex += (q.cx - h.ex) * Math.min(1, dt * 2.2); h.ey = q.y + q.h; }
        if (host && h.t > 0.9 && h.t < h.life - 0.9) {
          if (h.nx === undefined) h.nx = 0.9;
          if (h.t >= h.nx) {
            h.nx += 0.55;
            const y = this.hzFloor(h.ex, h.ey - TS * 2);
            this.bossHazard({ k: 'strike', x: h.ex, y, r: 46, shape: 'circle', delay: 0.8, life: 1.4, dmg: h.dmg, c: h.c, fx: 'meteor', dir: 'down', sd: Math.random() * 99 });
          }
        }
      } return true;
      case 'shroom': {                                                // 버섯 — 밟히면 시들고, 아니면 때가 되어 포자로 터진다
        if (h.st) return true;
        if (host) for (const q of this.players) {
          if (q.dead || q.hp <= 0) continue;
          const feet = q.y + q.h;
          if (Math.abs(q.cx - h.x) < 20 && feet > h.y - 40 && feet < h.y - 6 && (q.vy || 0) >= 0) {   // 갓을 밟는다
            this.hzPatch(h, { st: 1, life: h.t + 0.5 });
            this.vfx.puffs(h.x, h.y - 14, 5, 10, 'rgba(160,240,200,.8)', 0.6, 14);
            return true;
          }
        }
        if (host && h.t >= h.pop && !h.boom) {
          h.boom = 1;
          this.bossHazard({ k: 'zone', x: h.x, y: h.y, r: 60, life: 5, dmg: h.dmg, poison: 1, c: h.c, fx: 'spore', sd: Math.random() * 99 });
          for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.45; this.projs.push(new Proj(h.x, h.y - 18, Math.cos(a) * 200, Math.sin(a) * 200, h.burst, 'enemy', 'poison')); }
          this.hzPatch(h, { boom: 1, life: h.t + 0.35 });
        }
      } return true;
      case 'tongue': {                                                // 혀 — 뻗었다 감긴다. 끝에 걸리면 끌려간다
        const b = this.hzBoss(h); if (!b) { h.t = h.life; return true; }
        const mx = b.cx + (b.facing < 0 ? -1 : 1) * b.w * 0.35, my = b.cy;
        const u = h.t < 0.45 ? h.t / 0.45 : Math.max(0, 1 - (h.t - 0.45) / 0.6);
        h.px = mx + (h.tx - mx) * u; h.py = my + (h.ty - my) * u; h.mx = mx; h.my = my;
        if (me && !me.dead) {
          if (!h.grab && h.t < 0.5 && Math.hypot(me.cx - h.px, me.cy - h.py) < 26) h.grab = 1;
          if (h.grab) {
            if (me.dashV > 0) { h.grab = 0; h.cut = 1; this.vfx.puffs(me.cx, me.cy, 6, 10, '#c07aff', 0.5, 12); }   // 대시로 끊는다
            else { me.x += (h.px - me.cx) * Math.min(1, dt * 14); me.y += (h.py - me.cy) * Math.min(1, dt * 14); me.vx = 0; me.vy = 0; }
          }
        }
        if (host) for (let pi = 0; pi < this.players.length; pi++) { const q = this.players[pi];
          if (q.dead || q.hp <= 0) continue;
          const id = pi;
          if (h.t < 0.5 && !(h.hitT && h.hitT[id]) && Math.hypot(q.cx - h.px, q.cy - h.py) < 26) { q.hurt(h.dmg, mx); (h.hitT || (h.hitT = {}))[id] = 1; }
          if (h.t > 0.95 && !(h.bit && h.bit[id]) && Math.hypot(q.cx - mx, q.cy - my) < b.w * 0.5 + 24) { q.hurt(h.bite, mx); (h.bit || (h.bit = {}))[id] = 1; this.shake = Math.max(this.shake, 8); }
        }
      } return true;
      case 'chain': {                                                 // 닻 사슬 — 보스와 닻 사이 줄이 위험하다
        const b = this.hzBoss(h); if (!b) return true;
        if (host) for (let pi = 0; pi < this.players.length; pi++) { const q = this.players[pi];
          const id = pi;
          if (q.dead || q.hp <= 0 || (h.hit && h.hit[id])) continue;
          if (segD(q.cx, q.cy, b.cx, b.cy, h.ax, h.ay) < 18) { q.hurt(h.dmg, b.cx); (h.hit || (h.hit = {}))[id] = 1; }
        }
      } return true;
      case 'flood': {                                                 // 밀물 — 차올라 머물다 빠진다. 잠긴 몸은 느리고, 머리까지 잠기면 숨이 준다
        const rise = Math.min(1, h.t / 1.6, (h.life - h.t) / 1.4);
        h.lv = h.y - h.depth * Math.max(0, rise);
        if (me && !me.dead && me.y + me.h > h.lv && Math.abs(me.cx - h.x) < 1400) {
          me.vx *= Math.pow(0.35, dt); if (me.vy > 0) me.vy *= Math.pow(0.2, dt);
        }
        h.tick = (h.tick || 0) - dt;
        if (host && h.tick <= 0) {
          h.tick = 0.7;
          for (const q of this.players) if (!q.dead && q.hp > 0 && q.y > h.lv && Math.abs(q.cx - h.x) < 1400) q.hurt(h.dmg, q.cx);
        }
      } return true;
      case 'turret': {                                                // 리벳 포탑 — 가장 가까운 플레이어에게
        if (!host) return true;
        if (h.t >= h.next && h.t < h.life - 0.4) {
          h.next += h.every;
          const q = this.hzNear(h.x, h.y - 14);
          if (q) { const a = Math.atan2(q.cy - (h.y - 16), q.cx - h.x); h.aim = a; this.projs.push(new Proj(h.x, h.y - 16, Math.cos(a) * 330, Math.sin(a) * 330, h.dmg, 'enemy', 'rivet')); }
        }
      } return true;
      case 'crucible': {                                              // 쇳물 줄기 — 쏟아지는 동안 그 기둥이 위험
        h.tick = (h.tick || 0) - dt;
        if (host && h.t > h.pour && h.t < h.stop && h.tick <= 0) { h.tick = 0.25; this.hitPlayersRect(h.x - 14, h.top, h.x + 14, h.y, h.dmg); }
      } return true;
      case 'drone': {                                                 // 점검 드론 — 좌우로 훑는 빛, 걸리면 경보와 미사일
        h.x = h.cx + Math.sin(h.t * 1.3 + h.ph) * 150; h.y = h.y0 + Math.sin(h.t * 2.1 + h.ph) * 10;
        h.cd = (h.cd || 0) - dt;
        if (host && h.t > 0.6 && h.cd <= 0 && (h.al || 0) < 2) {
          const tan = Math.tan(0.3);
          for (const q of this.players) {
            if (q.dead || q.hp <= 0) continue;
            const dy = q.cy - h.y; if (dy <= 0) continue;
            if (Math.abs(q.cx - h.x) < dy * tan) {
              this.hzPatch(h, { al: (h.al || 0) + 1, alT: h.t });
              h.cd = 1.4;
              for (const s of [-1, 1]) { const pr = new Proj(h.x, h.y + 8, s * 120, -160, h.dmg, 'enemy', 'fire'); pr.home = 2.6; pr.life = 4; this.projs.push(pr); }
              this.sfxAt && this.sfxAt('sk_mark', h.x / TS, h.y / TS);
              break;
            }
          }
        }
      } return true;
    }
    return false;
  },
};

mixin(Game.prototype, BossSigPart, true);
