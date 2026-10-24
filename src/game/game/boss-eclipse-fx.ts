/* ===== game/boss-eclipse-fx.ts — 일식의 위험 지대 움직임과 입자 — 그림자 손 · 응시의 박동 · 빛기둥 · 개기일식 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { ecLit, handStage } from '../entity/boss-eclipse.js';
import { Game } from '../game.js';
/* 피해는 호스트(host)만. 빛 속인지(ecLit)는 타일 · 든 것 · 빛기둥만 보므로 호스트가 모든 플레이어를 같은 잣대로 잰다. */

const CORONA = '#b48aff', PALE = '#f0e0ff', DUST = 'rgba(60,40,90,.6)';

export const BossEclipseFx: Bag = {
  /** 위험 지대 한 칸의 움직임(sigUpdate 에서) — 처리했으면 true */
  eclipseHz(h: Bag, dt: number, host: boolean, me: any) {
    const b = this.hzBoss(h);
    switch (h.k) {
      case 'ehand': {
        const [, st] = handStage(h);
        if (st === 1 && !h.hit) {                                   // 내리침 — 짚은 자리 둘레가 아프고 그림자 먼지가 솟는다
          h.hit = 1; this.shake = Math.max(this.shake, 13);
          this.vfx.puffs(h.tx, h.fy - 6, 6, 30, DUST, 1, 40); this.vfx.motes(h.tx, h.fy - 20, 14, PALE, 40, 90, 0.8, 4);
          this.sfxAt && this.sfxAt('ec_slam', h.tx / TS, h.fy / TS);
          if (host) {
            for (const q of this.players) if (!q.dead && q.hp > 0 && Math.abs(q.cx - h.tx) < 96 && q.y + q.h > h.fy - 120) q.hurt(h.dmg, h.tx);
            if (b) for (const s of [-1, 1]) b.hz({ k: 'wave', x: h.tx + s * 70, y: h.fy, vx: s * 320, w: 30, hh: 24, life: 1.8, dmg: h.dmg * 0.5, c: h.c, fx: 'void', sd: Math.random() * 99 });
          }
        }
        if (st === 2 && Math.random() < 0.3) this.parts.push(new Part(h.tx + (Math.random() - 0.5) * 120, h.fy - 4, CORONA, -30, 0.9, { spd: 0.3, r: 1.3, g: -0.2 }));
      } return true;
      case 'elight': {                                              // 빛기둥 — 코로나에서 떨어진 햇빛 한 줄기(안에 서면 응시를 견딘다)
        if (h.t > h.tele && Math.random() < 0.5) this.parts.push(new Part(h.x + (Math.random() - 0.5) * h.w * 0.8, h.fy, '#fff0c0', -60, 1.0, { spd: 0.2, r: 1.2, g: -0.3 }));
      } return true;
      case 'estare': {                                              // 응시 — 박동마다 빛 밖에 선 이가 탄다
        const i = Math.floor((h.t - h.tele) / h.gap);
        if (h.t >= h.tele && i < h.pulses && h.pk !== i && (h.t - h.tele) - i * h.gap < 0.2) {
          h.pk = i; this.shake = Math.max(this.shake, 6);
          this.sfxAt && this.sfxAt('ec_stare', this.player.cx / TS, this.player.cy / TS);
          for (const q of this.players) {
            if (q.dead || q.hp <= 0) continue;
            const lit = ecLit(q, this.world);
            if (!lit) { this.vfx.flare(q.cx, q.cy, 60, CORONA, 0.3, 'impact'); if (host) q.hurt(h.dmg, q.cx); }
            else this.vfx.motes(q.cx, q.cy, 6, '#fff0c0', 20, 40, 0.5, 3);
          }
        }
      } return true;
      case 'etotal': {                                              // 개기일식 — 박자마다 어둠 속에 선 이가 깎인다
        if (h.t < h.tele) return true;
        const i = Math.floor((h.t - h.tele) / h.every);
        if (h.ek !== i) {
          h.ek = i;
          for (const q of this.players) {
            if (q.dead || q.hp <= 0 || ecLit(q, this.world)) continue;
            this.vfx.motes(q.cx, q.cy, 5, CORONA, 20, 40, 0.5, 3);
            if (host) q.hurt(h.dmg, q.cx);
          }
        }
        if (!h.endFx && h.t > h.life - 0.3) { h.endFx = 1; this.vfx.flare(this.player.cx, this.player.cy - 200, 400, '#fff4d8', 0.35, 'impact'); }
        void me;
      } return true;
    }
    return false;
  },
  /** 막 넘김 — 원판이 떨고 테에서 별 파편이 떨어진다 */
  eclipsePhaseFx(e: Enemy) {
    this.shake = Math.max(this.shake, 14);
    const q = this.player;
    for (let i = 0; i < 18; i++) this.parts.push(new Part(q.cx + (Math.random() - 0.5) * 900, q.cy - 400 - Math.random() * 100, i % 2 ? CORONA : PALE, 160, 1.6, { spd: 0.5, r: 1.6, g: 0.4 }));
    this.sfxAt && this.sfxAt('ec_crack', e.cx / TS, e.cy / TS);
  },
};
mixin(Game.prototype, BossEclipseFx, true);
