/* ===== entity/boss-organ.ts — 뼈 오르간(뒷벽에 박힌 보스) — 풀무 숨 · 관 울림 · 뼈 팔 쓸기 · 흩어졌다 맞추기 · 장송곡 ===== */
import { app as G } from '../ctx.js';
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy, Proj } from '../entity.js';
/* 몸은 무덤 뒷벽에 박혀 움직이지 않는다 — 판정 상자는 가슴의 혼불(핵)만이고, 닿아도 아프지 않다(def.wall).
   풀무가 열린 동안만 핵이 드러난다(받는 피해 ×1.6, 닫히면 ×0.3). 상태는 위험 지대(obreath · osweep · opipes · oscatter · oreq)로
   참가자에게도 같은 때 보인다. ★ 그림의 자리는 tools/mkbossrig.py 오르간 설계 좌표(×4)와 같아야 한다 — ORGAN 표. */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; t?: number; [k: string]: any };
let oid = 0;
const nid = () => 3e6 + (oid = oid % 1e6 + 1);

/** 설계 좌표(80×96 칸 · 1칸 = 4px) — 핵 (40, 58) 이 판정 상자 가운데 */
export const ORGAN = {
  K: 4, CORE: [40, 58], BASE: 93, CHEST: 30,
  PIPES: [-24, -16, -8, 0, 8, 16, 24], MOUTH: 24.6,
  SHOULDER: 24, SHOULDER_Y: 44, L1: 212, L2: 212
};
/** 설계 좌표 → 세계 좌표 */
export function organAt(e: { cx: number; cy: number }, dx: number, dy: number): [number, number] {
  return [e.cx + (dx - ORGAN.CORE[0]) * ORGAN.K, e.cy + (dy - ORGAN.CORE[1]) * ORGAN.K];
}
/** 오르간이 디딘 바닥(px) */
export const organFloor = (e: { cx: number; cy: number }) => e.cy + (ORGAN.BASE - ORGAN.CORE[1]) * ORGAN.K;

/** 누운 손의 그림 범위(손목 기준) — 손가락이 바깥으로 165px · 위 24 · 아래 31. 판정 · 예고 · 그림이 같이 쓴다 */
export const HAND = { back: 10, len: 165, up: 24, dn: 31 };
/** 손이 차지하는 상자 [x0, y0, x1, y1] — s 쪽으로 뻗는다 */
export function handBox(hx: number, hy: number, s: number): [number, number, number, number] {
  const a = hx - s * HAND.back, b = hx + s * HAND.len;
  return [Math.min(a, b), hy - HAND.up, Math.max(a, b), hy + HAND.dn];
}
const smooth = (u: number) => { const v = u < 0 ? 0 : u > 1 ? 1 : u; return v * v * (3 - 2 * v); };
/** 팔 쓸기 중 손의 자리 — 치켜듦(tele) → 바깥으로 쓸기(dur) → 쉬는 자리로. 판정(game/boss-sig)과 그림(game/boss-organ-art)이 같이 쓴다 */
export function sweepHand(h: Bag, b: { cx: number; cy: number }): [number, number, number] {
  const [sx, sy] = organAt(b, 40 + h.s * ORGAN.SHOULDER, ORGAN.SHOULDER_Y);
  const fy = organFloor(b), reach = ORGAN.L1 + ORGAN.L2 - 30, bandY = fy - (h.low ? HAND.dn + 2 : 104);
  const rest: [number, number] = [sx + h.s * 150, fy - HAND.dn - 2], up: [number, number] = [sx + h.s * 80, sy - 150];
  const t = h.t;
  if (t < h.tele) { const k = smooth(t / h.tele); return [rest[0] + (up[0] - rest[0]) * k, rest[1] + (up[1] - rest[1]) * k, 0]; }
  if (t < h.tele + h.dur) {
    const u = (t - h.tele) / h.dur, k = smooth(u), dn = smooth(u / 0.18);
    return [sx + h.s * (110 + k * (reach - 110)), up[1] + (bandY - up[1]) * dn, 1];
  }
  const k = smooth((t - h.tele - h.dur) / 0.55), ex = sx + h.s * reach;
  return [ex + (rest[0] - ex) * k, bandY + (rest[1] - bandY) * k, 2];
}
/** 쓸고 지나갈 띠 [x0, x1, 위, 아래] — 손이 지나는 길 전체(예고 그림이 판정과 같은 자리를 짚게) */
export function sweepBand(h: Bag, b: { cx: number; cy: number }): [number, number, number, number] {
  const [sx] = organAt(b, 40 + h.s * ORGAN.SHOULDER, ORGAN.SHOULDER_Y);
  const fy = organFloor(b), reach = ORGAN.L1 + ORGAN.L2 - 30, y = fy - (h.low ? HAND.dn + 2 : 104);
  const a = sx + h.s * (110 - HAND.back), e = sx + h.s * (reach + HAND.len);
  return [Math.min(a, e), Math.max(a, e), y - HAND.up, y + HAND.dn];
}
/** 쉬는 손 — 바닥을 짚고 숨에 맞춰 조금 오르내린다 */
export function restHand(b: { cx: number; cy: number }, s: number, T: number): [number, number] {
  const [sx] = organAt(b, 40 + s * ORGAN.SHOULDER, ORGAN.SHOULDER_Y);
  return [sx + s * (150 + Math.sin(T * 1.3 + s) * 6), organFloor(b) - HAND.dn - 2 - Math.max(0, Math.sin(T * 1.3 + s)) * 4];
}

export const BossOrgan: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 처음에 바닥에 박고, 그다음은 숨만 쉰다(풀무가 열리고 닫힌다) */
  organAI(dt: number, world: World, p: Player) {
    this.vx = this.vy = 0;
    if (!this.anchored) {                                   // 바닥에 붙인다 — 핵이 바닥에서 140px 위
      this.anchored = 1;
      const tx = Math.floor(this.cx / TS);
      for (let ty = Math.floor(this.cy / TS); ty < Math.floor(this.cy / TS) + 40; ty++)
        if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { this.y = ty * TS - (ORGAN.BASE - ORGAN.CORE[1]) * ORGAN.K - this.h / 2; break; }
    }
    this.breathCd = (this.breathCd ?? 3) - dt;
    if (this.breathCd <= 0 && !this.reqOn) {
      this.breathCd = 7.5 - this.pf * 2;
      const open = 2.6 + this.pf * 0.6;
      this.breathH = this.hz({ k: 'obreath', id: nid(), ref: this, nid: this.nid, x: this.cx, y: this.cy, open0: 0.7, life: 0.7 + open, c: '#bfe8d8' });
      G.sfxAt && G.sfxAt('organ_breath', this.cx / TS, this.cy / TS);
    }
  },
  /** 핵이 드러났나(풀무가 열린 동안) */
  organOpen() { const h = this.breathH; return !!h && h.t >= h.open0 && h.t < h.life; },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  organSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'sweep': {                                       // 뼈 팔이 바닥을 쓴다 — 낮게(뛰어넘는다) · 높게(선 채로 지나보낸다)
        const sides = d.both ? [-1, 1] : [Math.sign(p.cx - this.cx) || 1];
        const lowFirst = Math.random() < 0.5;
        sides.forEach((s, i) => this.organSweep(s, d.both ? (i === 0) === lowFirst : Math.random() < 0.55, 0.85, m, K));
        return { busy: 2.0 };
      }
      case 'pipes': {                                       // 관이 차례로 빛난 뒤 그 차례대로 운다 — 박자 탄막
        const order = [0, 1, 2, 3, 4, 5, 6];
        if (d.wild) for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
        else if (Math.random() < 0.5) order.reverse();
        const gap = d.wild ? 0.12 : 0.16, tele = 0.9;
        this.hz({ k: 'opipes', id: nid(), ref: this, nid: this.nid, order, gap, tele, life: tele + order.length * gap + 0.4, c: K.c });
        order.forEach((pi, i) => G.after(tele + i * gap, () => { if (!E.dead) E.organNote(pi, p, d.wild ? 5 : 3, m); }));
        return { busy: tele + order.length * gap + 0.3 };
      }
      case 'scatter': {                                     // 흩어졌다 맞추기 — 뼈가 틈 있는 고리로 터져 나갔다가, 다른 틈으로 되돌아온다
        this.hz({ k: 'oscatter', id: nid(), ref: this, nid: this.nid, life: 2.3, c: K.c });
        const ring = (out: boolean) => {
          const n = 20, g0 = Math.floor(Math.random() * n), R = 430;
          for (let i = 0; i < n; i++) {
            if (((i - g0 + n) % n) < 3) continue;
            const a = i / n * TAU, sp = out ? 300 : 340;
            const x = out ? E.cx : E.cx + Math.cos(a) * R, y = out ? E.cy : E.cy + Math.sin(a) * R;
            const pr = new Proj(x, y, Math.cos(a) * sp * (out ? 1 : -1), Math.sin(a) * sp * (out ? 1 : -1), E.dmg * m, 'enemy', 'bone');
            pr.life = out ? 2 : R / sp - 0.05; G.projs.push(pr);
          }
        };
        ring(true);
        G.after(1.0, () => { if (!E.dead) ring(false); });
        G.sfxAt && G.sfxAt('organ_scatter', this.cx / TS, this.cy / TS);
        return { busy: 2.2 };
      }
      case 'requiem': {                                     // 장송곡 — 관이 모두 박자대로 울고 팔이 번갈아 쓴다
        this.reqOn = 1;
        const dur = 5;
        this.hz({ k: 'oreq', id: nid(), ref: this, nid: this.nid, life: dur, beat: 0.3, c: K.c });
        for (let b = 0; b * 0.3 < dur - 0.3; b++) G.after(0.3 + b * 0.3, () => {
          if (E.dead) return;
          const k = b % 12, pi = k < 7 ? k : 12 - k;        // 관을 오르내리며
          E.organNote(pi, p, 1, m);
        });
        [0.6, 2.1, 3.6].forEach((t, i) => G.after(t, () => { if (!E.dead) E.organSweep(i % 2 ? 1 : -1, i !== 1, 0.6, m, K); }));
        G.after(dur, () => { E.reqOn = 0; });
        G.sfxAt && G.sfxAt('organ_requiem', this.cx / TS, this.cy / TS);
        return { busy: dur + 0.2 };
      }
    }
    return { busy: 0.3 };
  },
  /** 팔 하나가 쓴다 — tele 동안 팔을 치켜들고(쓸 높이에 띠가 진다), 0.9초에 걸쳐 바깥으로 쓸어 간다 */
  organSweep(s: number, low: boolean, tele: number, m: number, K: Bag) {
    const fl = organFloor(this);
    this.hz({ k: 'osweep', id: nid(), ref: this, nid: this.nid, s, low: low ? 1 : 0, tele, dur: 0.9, life: tele + 0.9 + 0.55,
      fy: fl, dmg: this.dmg * m * 1.1, c: K.c });
    G.sfxAt && G.sfxAt('organ_lift', this.cx / TS, this.cy / TS);
  },
  /** 관 하나가 운다 — 관 입에서 플레이어 쪽으로 음표 n 개(부채꼴) */
  organNote(pi: number, p: Player, n: number, m: number) {
    const [x, y] = organAt(this, 40 + ORGAN.PIPES[pi], ORGAN.MOUTH);
    const a0 = Math.atan2(p.cy - y, p.cx - x), sp = 250;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * (n > 3 ? 0.32 : 0.2);
      const pr = new Proj(x, y, Math.cos(a) * sp, Math.sin(a) * sp, this.dmg * m * 0.7, 'enemy', 'note');
      pr.life = 4; G.projs.push(pr);
    }
    G.organPipeFx && G.organPipeFx(x, y, pi);
    G.sfxAt && G.sfxAt('organ_pipe', x / TS, y / TS, 0.75 + pi * 0.09);
  },
};

mixin(Enemy.prototype, BossOrgan, true);
