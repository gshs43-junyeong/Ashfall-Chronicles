/* ===== entity/boss-pool.ts — 잿물 군체(웅덩이 몸 보스) — 몸놀림 · 고유 기술 넷 ===== */
import { app as G } from '../ctx.js';
import { clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy, Proj } from '../entity.js';
/* 몸은 굴 바닥 잿물 웅덩이고, 떠 있는 것은 녹슨 투구 껍데기뿐이다 — 뛰지 않고 웅덩이째 미끄러진다.
   팔은 웅덩이 가장자리에서 솟는 위험 지대(parm)라 참가자에게도 같은 때 보인다(그림 game/boss-pool-art).
   ★ 피할 길: 팔은 솟는 동안 내리칠 자리에 그림자가 진다 · 기둥은 한 칸이 빈다 · 범람은 뛰어넘는다(높이 70px). */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; t?: number; [k: string]: any };
let pid = 0;
const nid = () => 2e6 + (pid = pid % 1e6 + 1);          // boss-signature 의 번호(1e6 아래)와 겹치지 않게

/** 웅덩이 반폭(px) — 그림 · 기술이 같이 쓴다 */
export const poolHalf = (e: { w: number }) => e.w * 0.5 + 120;

export const BossPool: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 미끄러져 다가오고, 틈틈이 잿물 덩이를 포물선으로 뱉는다 */
  poolAI(dt: number, world: World, p: Player, dx: number) {
    const near = Math.abs(dx) < this.w * 0.3;
    this.vx = lerp(this.vx, near ? 0 : Math.sign(dx) * this.spd! * (0.8 + this.pf * 0.5), dt * 1.2);
    if (this.atkCd <= 0 && Math.abs(dx) < 720) {
      this.atkCd = 2.6 - this.pf * 0.8;
      const n = this.lastPh() ? 5 : 3, sy = this.y + this.h * 0.25;
      for (let i = 0; i < n; i++) {
        const tx = p.cx + (i - (n - 1) / 2) * 64, t = 0.95 + i * 0.04, g = 900;
        const pr = new Proj(this.cx, sy, (tx - this.cx) / t, (p.y + p.h - 8 - sy) / t - 0.5 * g * t, this.dmg * 0.55, 'enemy', 'sludge');
        pr.grav = g; pr.life = 3; G.projs.push(pr);
      }
      G.sfxAt && G.sfxAt('pool_spit', this.cx / TS, this.cy / TS);
    }
    this.move(dt, world);
  },

  /** 팔 하나 — 뿌리(보스 기준 ox) · 내리칠 자리 · 솟는 시간 */
  poolArm(ox: number, tx: number, ty: number, rise: number, dm: number, K: Bag) {
    const hold = 0.55, back = 0.45;
    return this.hz({ k: 'parm', id: nid(), ref: this, nid: this.nid, ox, x: this.cx + ox, y: this.y + this.h, tx, ty, rise,
      slam: rise + 0.14, life: rise + 0.14 + hold + back, back, dmg: this.dmg * dm, c: K.c, sd: Math.random() * 99 });
  },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  poolSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this, half = poolHalf(this);
    switch (d.sig) {
      case 'slap': {                                         // 웅덩이에서 팔이 솟아 플레이어가 선 자리를 내리친다 — 둘(셋)이 번갈아
        const n = d.arms || 2, gap = 0.55;
        for (let i = 0; i < n; i++) G.after(i * gap, () => {
          if (E.dead) return;
          const side = i % 2 === 0 ? (Math.sign(p.cx - E.cx) || 1) : -(Math.sign(p.cx - E.cx) || 1);
          const ox = side * E.w * 0.42, rx = E.cx + ox;
          const tx = clamp(p.cx + p.vx * 0.25, rx - 430, rx + 430);
          E.poolArm(ox, tx, E.floorY(tx, p.y), 0.9, m, K);
          G.sfxAt && G.sfxAt('pool_rise', rx / TS, (E.y + E.h) / TS);
        });
        return { busy: (n - 1) * gap + 1.5 };
      }
      case 'bubbles': {                                      // 플레이어 쪽으로 기둥 일곱 — 한 칸이 빈다 · 두 번째 줄은 빈 칸이 옮긴다
        const s = Math.sign(p.cx - this.cx) || 1, n = 7;
        for (let w = 0; w < 2; w++) G.after(w * 1.05, () => {
          if (E.dead) return;
          const gapI = 1 + Math.floor(Math.random() * (n - 2));
          for (let i = 0; i < n; i++) {
            if (i === gapI) continue;
            const x = E.cx + s * (E.w * 0.3 + i * 72);
            E.strike(x, E.y + E.h, { shape: 'col', w: 58, h: 230, delay: 0.85, fx: 'sludge', dir: 'up' }, K, m);
          }
          G.sfxAt && G.sfxAt('pool_bubble', E.cx / TS, E.cy / TS);
        });
        return { busy: 2.1 };
      }
      case 'sink': {                                         // 투구째 잠겨 웅덩이로 기어 와 발밑에서 솟는다 — 잠긴 동안은 맞지 않는다
        const r: Run = { busy: 99, ph: 0, pt: 0 };
        G.sfxAt && G.sfxAt('pool_sink', this.cx / TS, this.cy / TS);
        G.poolSinkFx(this.cx, this.y + this.h, false);
        r.rise = () => {
          this.strike(this.cx, this.y + this.h, { r: Math.max(90, this.w * 0.5), delay: 0.55, fx: 'sludge', dir: 'up' }, K, m);
          G.sfxAt && G.sfxAt('pool_bubble', this.cx / TS, this.cy / TS);
        };
        r.tick = (dt, r) => this.sigHide(dt, world, r, () => p.cx, 1.5, 0.55, () => {
          this.vy = -620;
          G.poolSinkFx(this.cx, this.y + this.h, true);
          const ring = this.lastPh() ? 14 : 10, g0 = Math.floor(Math.random() * ring);
          for (let i = 0; i < ring; i++) {
            if (((i - g0 + ring) % ring) < 2) continue;
            const a = -Math.PI + (i + 0.5) / ring * Math.PI;           // 위쪽 반원 — 솟구치며 흩뿌린다
            const pr = new Proj(this.cx, this.y + this.h * 0.4, Math.cos(a) * 300, Math.sin(a) * 420, this.dmg * m * 0.5, 'enemy', 'sludge');
            pr.grav = 700; pr.life = 3; G.projs.push(pr);
          }
          G.sfxAt && G.sfxAt('pool_geyser', this.cx / TS, this.cy / TS);
        });
        return r;
      }
      case 'surge': {                                        // 범람 — 웅덩이가 세 번 넘친다(뛰어넘는다) · 사이마다 팔 하나
        const W = (half + 300) * 2;
        for (let b = 0; b < 3; b++) G.after(b * 1.35, () => {
          if (E.dead) return;
          E.strike(E.cx, E.y + E.h, { shape: 'col', w: W, h: 70, delay: 0.9, fx: 'sludge', dir: 'up' }, K, m * 0.9);
          if (b < 2) G.after(0.95, () => {
            if (E.dead) return;
            const side = b % 2 ? -1 : 1, rx = E.cx + side * E.w * 0.42, tx = clamp(p.cx, rx - 430, rx + 430);
            E.poolArm(side * E.w * 0.42, tx, E.floorY(tx, p.y), 0.75, m * 0.9, K);
          });
          G.sfxAt && G.sfxAt('pool_bubble', E.cx / TS, E.cy / TS);
        });
        G.shake = Math.max(G.shake, 6);
        return { busy: 4.3 };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossPool, true);
