/* ===== entity/boss-cart.ts — 갱도의 것 — 길 잃은 광부들을 삼킨 살덩이가 광차에 실려 레일 위만 달린다 ===== */
import { app as G } from '../ctx.js';
import { clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
/* ★ 정체성(계획 §3): 레일이 깔린 칸만 달린다 — 바퀴는 레일 끝에서 멈춘다. 팔(살 촉수)이 플레이어 쪽으로 레일 토막을 깔아 길을 늘인다.
   레일은 위험 지대(`k: 'rail'` · 오래 남는다)로 놓아 참가자에게도 보이고, 몸놀림은 제 목록(mhRails)으로 잰다(호스트).
   레일 밖은 광차가 못 오지만 땅굴 기습(촉수가 땅 밑에서 솟는다) · 짓누르기(땅을 내리쳐 물결)가 닿는다.
   설계 좌표는 tools/mkbossrig.py mine_* 와 같다(72×56 · 판정 52×46 · 바퀴 (21, 47) · (51, 47)). 사연: docs/code-history.md#h234 */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };
type Rail = { x0: number; x1: number; y: number; until: number };

/** 설계 칸 표 — 그림(game/boss-cart-art)과 같은 수 */
export const MH = { K: 4, W: 72, H: 56, CX: 36, FOOT: 54, TOP: 8, WHEELS: [21, 51], WY: 47, WR: 6.5, ARMS: [[15, 26], [57, 24]] as [number, number][] };
const RAIL_LIFE = 40, PIECE = 96;

export const BossCart: Bag & ThisType<Enemy> = {
  /** 레일 토막 하나를 깐다(겹치면 이어진다) */
  mhLay(x0: number, x1: number, y: number) {
    const a = Math.min(x0, x1), b = Math.max(x0, x1);
    (this.mhRails || (this.mhRails = [])).push({ x0: a, x1: b, y, until: (G.time || 0) + RAIL_LIFE });
    this.hz({ k: 'rail', x0: x0, x1: x1, y, life: RAIL_LIFE, c: '#c8a878' });
  },
  /** 지금 바퀴가 선 레일이 이어진 구간 [왼끝, 오른끝] */
  mhSpan(): [number, number] {
    const T = G.time || 0, rs: Rail[] = (this.mhRails || []).filter((r: Rail) => r.until > T);
    this.mhRails = rs;
    let a = this.cx, b = this.cx, grow = true;
    while (grow) {
      grow = false;
      for (const r of rs) if (r.x0 <= b + 6 && r.x1 >= a - 6 && (r.x0 < a || r.x1 > b)) { a = Math.min(a, r.x0); b = Math.max(b, r.x1); grow = true; }
    }
    return [a, b];
  },
  /** 몸놀림 — 레일 위에서만 플레이어 쪽으로 · 팔이 레일을 깔고 · 가까우면 곡괭이를 내리친다 */
  mhAI(dt: number, world: World, p: Player) {
    const fy = this.y + this.h;
    if (!this.mhRails) { this.mhRails = []; this.mhLay(this.cx - 150, this.cx + 150, fy); this.mhLayT = 1; }
    const [a, b] = this.mhSpan(), half = this.w * 0.42;
    const want = clamp(p.cx, a + half, b - half), dx = want - this.cx;
    this.vx = lerp(this.vx, Math.abs(dx) > 10 ? Math.sign(dx) * this.spd! * (1 + (this.pf || 0) * 0.5) : 0, dt * 2.4);
    /* 레일 끝 — 바퀴가 레일을 벗어나지 못한다 */
    if (this.cx + this.vx * dt < a + half && this.vx < 0) this.vx = 0;
    if (this.cx + this.vx * dt > b - half && this.vx > 0) this.vx = 0;
    /* 레일 깔기 — 플레이어가 레일 밖에 있으면 그쪽 끝에 한 토막 */
    this.mhLayT = (this.mhLayT ?? 1) - dt;
    const side = Math.sign(p.cx - this.cx) || 1, end = side > 0 ? b : a;
    if (this.mhLayT <= 0 && side * (p.cx - end) > -40 && !(this.mv && this.mv.d)) {
      this.mhLayT = 1.5 - (this.pf || 0) * 0.6;
      this.mhArm = { side, t: G.time || 0, x: end + side * PIECE / 2 };
      G.after(0.35, () => { if (!this.dead) { this.mhLay(end - side * 4, end + side * PIECE, fy); G.sfxAt('hit_metal', end / TS, fy / TS); } });
    }
    /* 곡괭이 — 몸 곁에 온 플레이어를 내리친다 */
    if (this.atkCd <= 0 && Math.abs(p.cx - this.cx) < this.w * 0.85 && !(this.mv && this.mv.d)) {
      this.atkCd = 2.4 - (this.pf || 0) * 0.6;
      const s = Math.sign(p.cx - this.cx) || 1;
      this.mhSwing = { side: s, t: G.time || 0 };
      this.strike(p.cx, p.y + p.h, { r: 58, delay: 0.55, fx: 'rock' }, { c: '#c8a878' }, 0.8);
    }
    this.move(dt, world);
  },
  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  mhSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'dig': {                                         // 땅굴 기습 — 팔이 땅에 박히고, 촉수가 플레이어 발밑을 따라 세 번 솟는다
        E.mhDig = { t: G.time || 0, side: Math.sign(p.cx - E.cx) || 1 };
        for (let i = 0; i < 3; i++) G.after(0.25 + i * 0.55, () => {
          if (E.dead) return;
          const x = p.cx + (Math.random() - 0.5) * 30, fy = E.floorY(x, p.y);
          E.strike(x, fy, { r: d.r || 62, delay: 0.6, fx: 'burrow' }, K, m);
          E.hz({ k: 'mhtent', x, y: fy, life: 1.5, at: 0.6, c: K.c, sd: Math.random() * 9 });
        });
        return { busy: 2.0 };
      }
      case 'slam': {                                        // 갱도 짓누르기 — 두 팔을 들어 땅을 내리친다 · 양쪽으로 돌 물결 · 천장에서 돌이 진다
        const n = d.times || 2;
        for (let i = 0; i < n; i++) G.after(i * 1.0, () => {
          if (E.dead) return;
          E.mhSlam = { t: G.time || 0 };
          G.after(0.5, () => {
            if (E.dead) return;
            const fy = E.y + E.h;
            G.shake = Math.max(G.shake, 12);
            for (const s of [-1, 1]) E.hz({ k: 'wave', x: E.cx + s * (E.w / 2 + 10), y: fy, vx: s * (d.wspd || 330), w: 26, hh: 30, life: 2.6, dmg: E.dmg * m * 0.7, c: K.c, fx: 'rock', sd: Math.random() * 99 });
            for (let k = 0; k < 3; k++) E.strike(p.cx + (Math.random() - 0.5) * 320, p.y + p.h, { r: 40, delay: 0.8, fx: 'rock' }, K, m * 0.6);
          });
        });
        return { busy: n * 1.0 + 0.4 };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossCart, true);
