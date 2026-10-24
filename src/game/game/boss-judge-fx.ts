/* ===== game/boss-judge-fx.ts — 판결석 좌상의 위험 지대 움직임과 입자 — 저울질 · 판결 · 증언 석판 · 판결의 손 · 단죄의 눈 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { JD, beamEnd, eyeStage, jdAt } from '../entity/boss-judge.js';
import { Game } from '../game.js';
/* 피해 · 판결 쪽 · 겨눈 자리는 호스트(host)가 정하고 참가자에게 덧붙인다(hzPatch). 저울질 무게는 0.2초마다 보낸다(저울이 같이 기운다). */

const RUNE = '#fff0b0', DUST = 'rgba(190,180,160,.7)', MARB = '#bdb5a0';

export const BossJudgeFx: Bag = {
  /** 위험 지대 한 칸의 움직임(sigUpdate 에서) — 처리했으면 true */
  judgeHz(h: Bag, dt: number, host: boolean, me: any) {
    const b = this.hzBoss(h);
    switch (h.k) {
      case 'jverdict': {
        if (!h.doom && h.t < h.tele) {                              // 저울질 — 머문 쪽이 무겁다
          if (host) {
            for (const q of this.players) if (!q.dead && q.hp > 0 && Math.abs(q.cx - h.x) < h.half) h.w = (h.w || 0) + Math.sign(q.cx - h.x) * dt;
            h.pt = (h.pt || 0) + dt;
            if (h.pt > 0.2) { h.pt = 0; this.hzPatch(h, { w: h.w }); }
          }
          return true;
        }
        if (!h.doom && host) this.hzPatch(h, { doom: Math.sign(h.w || 0) || (Math.random() < 0.5 ? -1 : 1) });
        if (h.doom && !h.fx0) {                                     // 판결 — 저울이 내려앉는다
          h.fx0 = 1; this.shake = Math.max(this.shake, 9);
          if (b) { const [x, y] = jdAt(b, 48, 51); this.vfx.flare(x, y, 160, RUNE, 0.3, 'impact'); }
          this.sfxAt && this.sfxAt('jd_verdict', h.x / TS, h.fy / TS);
        }
        if (host && b && h.doom && !h.struck && h.t >= h.tele + h.gap) {
          h.struck = 1;
          for (let i = 0; i < 12; i++) b.strike(h.x + h.doom * (14 + i * 55), h.fy, { shape: 'col', w: 50, h: 300, delay: 0.05 + i * 0.035, fx: 'rune', dir: 'down' }, { c: h.c }, h.dmg / Math.max(1, b.dmg));
        }
      } return true;
      case 'jtab': {
        if (h.t < h.tele) return true;
        if (!h.landed) {                                            // 석판이 떨어져 선다 — 바닥이 울리고 돌가루
          h.landed = 1; this.shake = Math.max(this.shake, 7);
          this.vfx.puffs(h.x, h.fy - 6, 5, 22, DUST, 0.9, 30); this.vfx.shards(h.x, h.fy - 4, 8, MARB, 240, 0.7, 4);
          this.sfxAt && this.sfxAt('jd_slam', h.x / TS, h.fy / TS);
          if (host) for (const q of this.players) if (!q.dead && q.hp > 0 && Math.abs(q.cx - h.x) < 38 && q.y + q.h > h.fy - 150 && q.y < h.fy) q.hurt(h.dmg * 0.8, h.x);
        }
        if (!h.gone && h.t > h.life - 0.4) { h.gone = 1; this.vfx.shards(h.x, h.fy - 70, 12, MARB, 260, 0.8, 5); this.vfx.puffs(h.x, h.fy - 40, 4, 20, DUST, 0.8, 24); }
      } return true;
      case 'jgavel': {
        if (!b || h.hit || h.t < h.tele + 0.12) return true;
        h.hit = 1; this.shake = Math.max(this.shake, 15);
        this.vfx.puffs(h.tx, h.fy - 6, 6, 26, DUST, 1, 36); this.vfx.flare(h.tx, h.fy - 10, 120, RUNE, 0.25, 'impact');
        this.sfxAt && this.sfxAt('jd_gavel', h.tx / TS, h.fy / TS);
        if (host) {
          for (const q of this.players) if (!q.dead && q.hp > 0 && Math.abs(q.cx - h.tx) < 72 && q.y + q.h > h.fy - 60) q.hurt(h.dmg, h.tx);
          for (const s of [-1, 1]) b.hz({ k: 'wave', x: h.tx + s * 40, y: h.fy, vx: s * 390, w: 34, hh: 30, life: 2.2, dmg: h.dmg * 0.7, c: h.c, fx: 'rock', sd: Math.random() * 99 });
        }
      } return true;
      case 'jeye': {
        if (!b) return true;
        const [i, st] = eyeStage(h), [ex, ey] = b.jdEye || jdAt(b, 48, JD.EYE_Y);
        if (st === 0) {                                             // 쫓기 — 겨눔이 늦게 따라온다(화면마다 · 멈출 때 호스트 값으로)
          const q = this.hzNear(ex, ey);
          if (q) { const k = 1 - Math.exp(-dt * 3.2); h.lx += (q.cx - h.lx) * k; h.ly += (q.cy - h.ly) * k; }
        } else if (st === 1 && host && h.lk !== i) this.hzPatch(h, { lk: i, lx: h.lx, ly: h.ly });
        else if (st === 2 && h.fk !== i) {                         // 쏜다 — 석판에서 멈춘다
          h.fk = i; this.shake = Math.max(this.shake, 5);
          const tabs = (this.bhz || []).filter((t: Bag) => t.k === 'jtab' && this.hzBoss(t) === b);
          const [x1, y1, tab] = beamEnd(ex, ey, h.lx, h.ly, b.cy + (JD.BASE - JD.C[1]) * JD.K, tabs);
          h.bx = x1; h.by = y1;
          this.vfx.flare(x1, y1, 70, RUNE, 0.25, 'impact'); this.vfx.motes(x1, y1, 10, RUNE, 30, 60, 0.6, 4);
          if (tab) { tab.cr = (tab.cr || 0) + 1; this.vfx.shards(x1, y1, 8, MARB, 200, 0.6, 4); }
          this.sfxAt && this.sfxAt('jd_beam', x1 / TS, y1 / TS);
          if (host) for (const q of this.players) {
            if (q.dead || q.hp <= 0) continue;
            for (let s = 0; s <= 1; s += 0.03) {
              const x = ex + (x1 - ex) * s, y = ey + (y1 - ey) * s;
              if (x > q.x - 10 && x < q.x + q.w + 10 && y > q.y - 10 && y < q.y + q.h + 10) { q.hurt(h.dmg, ex); break; }
            }
          }
        }
        void me;
      } return true;
    }
    return false;
  },
  /** 막 넘김 — 벽감이 울리고, 둘째 막에 눈가리개가 찢긴다 */
  judgePhaseFx(e: Enemy) {
    this.shake = Math.max(this.shake, 13);
    const [hx, hy] = (e as any).jdHead || jdAt(e, 48, 24);
    this.vfx.flare(hx, hy, 180, RUNE, 0.35, 'impact');
    this.vfx.motes(hx, hy, 18, '#d8b04a', 40, 80, 0.9, 5);
    this.vfx.shards(e.cx, e.cy - 120, 14, MARB, 280, 0.9, 5);
    this.sfxAt && this.sfxAt('jd_tear', e.cx / TS, e.cy / TS);
  },
  /** 상시 — 벽감 금에서 돌가루가 흘러내리고 가슴 문장에서 룬 알갱이가 오른다 */
  judgeAmbient(e: Enemy) {
    if (Math.random() < 0.05) {
      const [x, y] = jdAt(e, 48 + (Math.random() - 0.5) * 80, 8 + Math.random() * 40);
      this.parts.push(new Part(x, y, '#9a9282', 30, 1.4, { spd: 0.15, r: 1.2, g: 0.6 }));
    }
    if (Math.random() < 0.07) {
      const [x, y] = jdAt(e, 48 + (Math.random() - 0.5) * 10, 51);
      this.parts.push(new Part(x, y, RUNE, -40, 1.2, { spd: 0.3, r: 1.3, g: -0.15, drag: 0.97 }));
    }
  },
};
mixin(Game.prototype, BossJudgeFx, true);
