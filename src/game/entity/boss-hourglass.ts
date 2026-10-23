/* ===== entity/boss-hourglass.ts — 모래시계 거상(왕좌에 앉은 석상 · 가슴에 모래시계) — 주먹 · 모래 쏟기 · 유사 늪 · 뒤집기 · 시간 마감 ===== */
import { app as G } from '../ctx.js';
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy, Proj } from '../entity.js';
/* 몸은 왕좌에 앉아 움직이지 않는다(def.wall — 닿아도 안 아프다) · 판정 상자는 가슴~무릎 위(점프로 닿는다).
   모래시계 윗칸의 모래가 그 막의 남은 체력이고, 막이 넘어가면 모래시계가 뒤집혀(hflip) 쏟는 모래가 반대쪽으로 쏠린다(hgDir).
   쏟은 모래 둔덕(hsand)은 밟고 올라설 수 있다 — 올라서면 모래시계에 손이 닿는다. 상태는 위험 지대로 참가자에게도 같다.
   ★ 그림의 자리는 tools/mkbossrig.py 거상 설계 좌표(×4)와 같아야 한다 — HG 표. */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };
let hid = 0;
const nid = () => 5e6 + (hid = hid % 1e6 + 1);
export const smooth = (u: number) => { const v = u < 0 ? 0 : u > 1 ? 1 : u; return v * v * (3 - 2 * v); };

/** 설계 좌표(84×104 칸 · 1칸 = 4px) — 판정 상자 가운데 (42, 60) · 모래시계 (42, 52) · 바닥 101 · 어깨 (42±27, 38) · 무릎 (42±17, 75) · 왕좌 받침 반폭 39 · 팔 두 마디 L1 · L2 */
export const HG = { K: 4, C: [42, 60], GLASS_Y: 52, BASE: 101, SH: 27, SH_Y: 38, KNEE: 17, KNEE_Y: 75, L1: 130, L2: 124, GLASS: 0.62, THRONE: 39 };
export function hgAt(e: { cx: number; cy: number }, dx: number, dy: number): [number, number] {
  return [e.cx + (dx - HG.C[0]) * HG.K, e.cy + (dy - HG.C[1]) * HG.K];
}
export const hgFloor = (e: { cx: number; cy: number }) => e.cy + (HG.BASE - HG.C[1]) * HG.K;
/** 주먹이 닿는 가로 거리(px) — 어깨에서. 앉은 몸이라 바닥은 왕좌 바로 옆까지만 닿는다 */
export const HG_REACH = 150;
/** 이 막의 남은 몫(0~1) — 모래시계 윗칸의 모래 */
export function hgSand(e: Enemy): number {
  const n = e.phases || 1, hpr = Math.max(0, e.hp / (e.maxHp || 1));
  return Math.max(0, Math.min(1, hpr * n - (n - 1 - (e.phase || 0))));
}

/** 주먹의 자리 — 치켜듦(tele) → 내리침(0.12초) → 머묾 → 무릎으로. [x, y, 단계] — 그림과 판정이 같이 쓴다 */
export function fistAt(h: Bag, b: { cx: number; cy: number }): [number, number, number] {
  const [kx, ky] = hgAt(b, 42 + h.s * (HG.KNEE + 6), HG.KNEE_Y - 6), fy = hgFloor(b);
  const up: [number, number] = [kx + (h.tx - kx) * 0.45, fy - 330], hit: [number, number] = [h.tx, fy - 40];
  if (h.t < h.tele) { const k = smooth(h.t / h.tele); return [kx + (up[0] - kx) * k, ky + (up[1] - ky) * k, 0]; }
  const t = h.t - h.tele;
  if (t < 0.12) { const k = (t / 0.12) ** 2; return [up[0] + (hit[0] - up[0]) * k, up[1] + (hit[1] - up[1]) * k, 1]; }
  if (t < 0.7) return [hit[0], hit[1] + Math.sin(t * 40) * Math.max(0, 0.3 - t) * 8, 2];
  const k = smooth((t - 0.7) / 0.6);
  return [hit[0] + (kx - hit[0]) * k, hit[1] + (ky - hit[1]) * k, 3];
}
/** 쏟은 모래 둔덕의 높이(px) — 왕좌 옆에서 가장 높고 바깥으로 낮아진다 · 흐름 쪽(dir)이 더 높다 */
export function duneH(h: Bag, x: number): number {
  const k = h.t < h.fill ? smooth(h.t / h.fill) : h.t < h.fill + h.hold ? 1 : 1 - smooth((h.t - h.fill - h.hold) / h.drain);
  const d = x - h.x, ad = Math.abs(d), s = Math.sign(d) || 1;
  if (ad < h.in - 30 || ad > h.half) return 0;
  const peak = h.maxH * (s === h.dir ? 1 : 0.5), u = Math.max(0, (ad - h.in) / (h.half - h.in));
  const rim = ad < h.in ? smooth((ad - h.in + 30) / 30) : 1;   // 왕좌 받침에 기대는 끝은 둥글게
  return k * peak * rim * (1 - u) ** 1.35;
}

export const BossHourglass: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 처음 한 번 바닥에 앉힌다. 그다음은 앉아서 숨만 쉰다 */
  hgAI(dt: number, world: World) {
    this.vx = this.vy = 0;
    if (!this.anchored) {
      this.anchored = 1; this.hgDir = this.hgDir || 1;
      const tx = Math.floor(this.cx / TS);
      for (let ty = Math.floor(this.cy / TS); ty < Math.floor(this.cy / TS) + 40; ty++)
        if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { this.y = ty * TS - (HG.BASE - HG.C[1]) * HG.K - this.h / 2; break; }
    }
    /* 시간 마감 — 목을 깼는지 본다(호스트) */
    const h = this.hgDeadH;
    if (h && !h.done && h.t < h.dur && h.hp0 - this.hp >= h.need) {
      G.hzPatch(h, { done: 1, ok: 1, at: h.t });
      this.gapK = 'stagger'; this.gapMiss = 1; this.gapT = this.gapMax = 4.5;
      if (G.gapBurst) G.gapBurst(this);
    }
    void dt;
  },
  /** 막 넘김 — 모래시계가 뒤집히고 쏟는 모래가 반대쪽으로 쏠린다 */
  hgFlip() {
    this.hgDir = -(this.hgDir || 1);
    this.hz({ k: 'hflip', id: nid(), ref: this, nid: this.nid, life: 1.6, dir: this.hgDir, c: '#ffc85a' });
    G.sfxAt && G.sfxAt('hg_flip', this.cx / TS, this.cy / TS);
  },
  /** 시간 마감 중 목이 드러났나 — 받는 피해 ×2 */
  hgDeadline() { const h = this.hgDeadH; return !!h && h.t < h.dur && !h.done; },
  /** 받는 피해 — 마감 중엔 두 배(entity.ts hurt 가 부른다) */
  hgHurt(a: number) { return this.hgDeadline() ? a * 2 : a; },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  hgSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'fist': {                                        // 주먹 — 팔을 치켜들었다 내리치면 바닥을 따라 충격파가 양쪽으로 달린다(뛰어넘는다)
        const s0 = Math.sign(p.cx - this.cx) || 1, sides = d.both ? [s0, -s0] : [s0];
        sides.forEach((s, i) => {
          const sx = hgAt(this, 42 + s * HG.SH, HG.SH_Y)[0];
          const want = i === 0 ? p.cx : sx + s * HG_REACH, tx = s > 0 ? Math.max(sx + 50, Math.min(want, sx + HG_REACH)) : Math.min(sx - 50, Math.max(want, sx - HG_REACH));
          G.after(i * 0.55, () => { if (!E.dead) E.hz({ k: 'hfist', id: nid(), ref: E, nid: E.nid, s, tx, tele: 0.85, life: 0.85 + 1.35, dmg: E.dmg * m, c: K.c }); });
        });
        G.sfxAt && G.sfxAt('hg_lift', this.cx / TS, this.cy / TS);
        return { busy: 0.85 + 0.9 + (sides.length - 1) * 0.55 };
      }
      case 'sandpour': {                                    // 모래 쏟기 — 목에서 쏟아진 모래가 왕좌 양옆에 둔덕으로 쌓인다(올라서면 모래시계에 손이 닿는다)
        const hold = d.hold || 5;
        this.hz({ k: 'hsand', id: nid(), ref: this, nid: this.nid, x: this.cx, fy: hgFloor(this), in: HG.THRONE * HG.K, half: d.half || 620, dir: this.hgDir || 1,
          fill: 2.4, hold, drain: 1.6, life: 2.4 + hold + 1.6, maxH: d.maxH || 120, c: K.c, sd: Math.random() * 99 });
        /* 쏟는 동안 둔덕을 굴러 내려오는 모래 덩이 — 흐름 쪽부터 번갈아 */
        for (let i = 0; i < (d.balls || 3); i++) G.after(1.2 + i * 0.9, () => {
          if (E.dead) return;
          const s = i % 2 === 0 ? (E.hgDir || 1) : -(E.hgDir || 1), x = E.cx + s * HG.THRONE * HG.K;
          E.hz({ k: 'wave', x, y: hgFloor(E), vx: s * 300, w: 34, hh: 30, life: 2.2, dmg: E.dmg * m * 0.6, c: K.c, fx: 'rock', sd: Math.random() * 99 });
        });
        G.sfxAt && G.sfxAt('hg_pour', this.cx / TS, this.cy / TS);
        return { busy: 2.0 };
      }
      case 'quick': {                                       // 유사 늪 — 플레이어 둘레 바닥이 돌며 꺼진다(가운데로 끌린다 · 뛰어서 빠져나간다)
        const n = d.cnt || 3, gap = d.gap || 190;
        for (let i = 0; i < n; i++) {
          const x = p.cx + (i - (n - 1) / 2) * gap + (Math.random() - 0.5) * 40, fy = G.hzFloor(x, p.y);
          G.after(i * 0.15, () => { if (!E.dead) E.hz({ k: 'hpit', id: nid(), ref: E, nid: E.nid, x, y: fy, r: 76, tele: 0.8, life: 0.8 + (d.life || 4.5), pull: d.pull || 260, dmg: E.dmg * m * 0.35, c: K.c, sd: Math.random() * 99 }); });
        }
        G.sfxAt && G.sfxAt('hg_quick', this.cx / TS, this.cy / TS);
        return { busy: 1.2 };
      }
      case 'deadline': {                                    // 시간 마감 — 윗칸 모래가 다 떨어지기 전에 목을 친다(받는 피해 ×2). 못 깨면 모래 폭풍이 터진다
        const dur = d.dur || 8, need = this.maxHp * (d.need || 0.07);
        this.hgDeadH = this.hz({ k: 'hdead', id: nid(), ref: this, nid: this.nid, life: dur + 1.2, dur, hp0: this.hp, need, c: K.c });
        G.after(dur, () => { if (!E.dead && E.hgDeadH && !E.hgDeadH.done) { G.hzPatch(E.hgDeadH, { done: 1, ok: 0, at: dur }); E.hgStorm(m, K); } });
        G.sfxAt && G.sfxAt('hg_deadline', this.cx / TS, this.cy / TS);
        return { busy: dur + 1.3 };
      }
    }
    return { busy: 0.3 };
  },
  /** 마감을 못 깼다 — 모래시계에서 틈 셋 있는 모래 고리 두 겹 + 바닥 충격파 */
  hgStorm(m: number, K: Bag) {
    const [x, y] = hgAt(this, 42, HG.GLASS_Y);
    for (let r = 0; r < 2; r++) G.after(r * 0.45, () => {
      if (this.dead) return;
      const n = 30, g0 = Math.floor(Math.random() * n);
      for (let i = 0; i < n; i++) {
        if ([0, 10, 20].some(o => ((i - g0 - o + n) % n) < 3)) continue;
        const a = i / n * TAU + r * 0.1, sp = 280 + r * 40;
        const pr = new Proj(x, y, Math.cos(a) * sp, Math.sin(a) * sp, this.dmg * m * 0.9, 'enemy', 'sand');
        pr.life = 3; G.projs.push(pr);
      }
    });
    for (const s of [-1, 1]) this.hz({ k: 'wave', x: this.cx + s * HG.THRONE * HG.K, y: hgFloor(this), vx: s * 420, w: 40, hh: 34, life: 2.4, dmg: this.dmg * m * 1.2, c: K.c, fx: 'rock', sd: Math.random() * 99 });
    G.sfxAt && G.sfxAt('hg_storm', this.cx / TS, this.cy / TS);
  },
};

mixin(Enemy.prototype, BossHourglass, true);
