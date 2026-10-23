/* ===== entity/boss-cocoon.ts — 잿빛 고치(천장에 실로 매달린 번데기 → 2막에 갈라져 불나방) — 시계추 · 실 늘어뜨리기 · 날개 바람 · 인분 · 빛 쫓기 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { T } from '../data.js';
import { TS } from '../world.js';
import { Enemy, Proj } from '../entity.js';
/* 1막은 매달린 고치다 — 실 끝에서 시계추처럼 흔들리고, 몸통이 휩쓸고 지나가는 자리가 위험하다. 막이 넘어가면(onPhaseChange) 고치가 갈라지고
   불나방이 난다(cocoonBurst) — 빈 허물은 실에 매달린 채 남는다. 나방은 **빛을 쫓는다**: 바닥에 놓인 횃불이 가까우면 그쪽으로 끌리고(미끼),
   없으면 횃불을 든 사람, 그도 없으면 가까운 사람. 매단 자리 · 허물 · 기술 상태는 위험 지대(chang · chusk · cswing …)로 참가자에게도 같다.
   ★ 그림의 자리는 tools/mkbossrig.py 고치 · 나방 설계 좌표(×4)와 같아야 한다 — COC 표. */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };
let cid = 0;
const nid = () => 4e6 + (cid = cid % 1e6 + 1);
const smooth = (u: number) => { const v = u < 0 ? 0 : u > 1 ? 1 : u; return v * v * (3 - 2 * v); };

/** 그림 치수(px) — 고치 장 184×320 · 매단 실 끝은 장 위 12px · 판정 가운데는 장 (92, 166) · 나방 장 400×320 · 몸통 가운데 (200, 160) */
export const COC = {
  FW: 184, FH: 320, TIE: 12, CX: 92, CY: 166,
  W: 104, H: 262, MW: 170, MH: 104,
  MOTH_W: 400, MOTH_H: 320,
};
/** 판정 가운데 → 매단 실 끝까지(px) */
export const TIE_OFF = COC.CY - COC.TIE;

/** 시계추 각(라디안) — 당겼다(tele) 놓으면 한쪽으로 크게 휘둘렸다 반대로 되돌아온다(dur), 그다음 0.6초에 걸쳐 잦아든다 */
export function swingTh(h: Bag): number {
  const t = h.t, s = h.s, A = h.amp;
  if (t < h.tele) return -s * 0.24 * smooth(t / h.tele);
  const u = (t - h.tele) / h.dur;
  const th = (v: number) => s * A * Math.sin(Math.PI * v * 1.5) * (1 - 0.55 * v) - s * 0.24 * (1 - v) ** 3;
  if (u <= 1) return th(u);
  return th(1) * (1 - smooth((t - h.tele - h.dur) / 0.6));
}
/** 매단 자리에서 각 th 만큼 기운 고치의 판정 가운데 */
export function hangAt(ax: number, ay: number, R: number, th: number): [number, number] {
  return [ax + Math.sin(th) * R, ay + Math.cos(th) * R];
}

export const BossCocoon: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 고치(매달려 흔들림) · 나방(빛을 쫓아 떠 있음) */
  cocoonAI(dt: number, world: World, p: Player) {
    if (!this.cocMoth) return this.cocoonHang(dt, world);
    this.mothFly(dt, world, p); this.move(dt, world, { gravMul: 0 });
  },
  /** 고치 — 처음에 매달 자리를 찾고, 그다음은 시계추 각으로 자리를 매긴다 */
  cocoonHang(dt: number, world: World) {
    this.vx = this.vy = 0;
    if (!this.hangH) {
      const tx = Math.floor(this.cx / TS);
      let fy = this.y + this.h;
      for (let ty = Math.floor(this.cy / TS); ty < Math.floor(this.cy / TS) + 40; ty++) if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { fy = ty * TS; break; }
      const cy = fy - 64 - COC.H / 2;                      // 밑동이 바닥 64px 위 — 밑으로 지나가고, 뛰면 친다
      let ay = cy - TIE_OFF - 260;                         // 천장이 없으면 하늘에서 실이 내려온다
      for (let ty = Math.floor((cy - TIE_OFF - 30) / TS); ty > Math.floor((cy - TIE_OFF) / TS) - 30; ty--) if (world.solid(tx, ty)) { ay = (ty + 1) * TS; break; }
      const R = Math.max(TIE_OFF + 40, cy - ay);
      this.hangH = this.hz({ k: 'chang', id: nid(), ref: this, nid: this.nid, ax: this.cx, ay, R, life: 1e9, c: '#ff8a40' });
    }
    const H = this.hangH, sw = this.cocSwing && this.cocSwing.t < this.cocSwing.life ? this.cocSwing : null;
    this.cocTh = sw ? swingTh(sw) : Math.sin((G.time || 0) * 0.8) * 0.06;
    const [x, y] = hangAt(H.ax, H.ay, H.R, this.cocTh);
    this.x = x - this.w / 2; this.y = y - this.h / 2;
  },
  /** 막 넘김 — 고치가 갈라지고 나방이 난다(빈 허물은 실에 남는다) */
  cocoonBurst() {
    if (this.cocMoth) return;
    this.cocMoth = 1;
    const H = this.hangH;
    if (H) { H.life = H.t; this.hz({ k: 'chusk', id: nid(), ref: this, nid: this.nid, ax: H.ax, ay: H.ay, R: H.R, life: 1e9, c: '#ff8a40' }); }
    const cx = this.cx, cy = this.cy;
    this.w = COC.MW; this.h = COC.MH; this.x = cx - this.w / 2; this.y = cy - this.h / 2;
    this.vx = 0; this.vy = -120;
    G.cocoonBurstFx && G.cocoonBurstFx(cx, cy);
    G.sfxAt && G.sfxAt('moth_burst', cx / TS, cy / TS);
  },
  /** 빛 — 바닥에 놓인 횃불(미끼) > 횃불을 든 사람 > 가까운 사람. 0.5초마다 다시 잰다 */
  mothLight(world: World): Bag {
    if (this.lightT > 0 && this.lightTgt) return this.lightTgt;
    this.lightT = 0.5;
    const tx0 = Math.floor(this.cx / TS), ty0 = Math.floor(this.cy / TS);
    let best: Bag | null = null, bd = 1e18;
    for (let ty = ty0 - 14; ty <= ty0 + 16; ty++) for (let tx = tx0 - 30; tx <= tx0 + 30; tx++) {
      if (world.get(tx, ty) !== T.TORCH) continue;
      const x = tx * TS + TS / 2, y = ty * TS + TS / 2, d = (x - this.cx) ** 2 + (y - this.cy) ** 2;
      if (d < bd) { bd = d; best = { x, y, kind: 'torch', tx, ty }; }
    }
    if (!best) for (const q of G.players) {
      if (q.dead || q.hp <= 0) continue;
      let it: any = null; try { it = q.held && q.held(); } catch (e) { it = null; }
      const lit = it && it.id === 'torch', d = (q.cx - this.cx) ** 2 + (q.cy - this.cy) ** 2 - (lit ? 1e12 : 0);
      if (d < bd) { bd = d; best = { x: q.cx, y: q.cy, kind: lit ? 'held' : 'near', q }; }
    }
    this.lightTgt = best || { x: this.cx, y: this.cy, kind: 'none' };
    return this.lightTgt;
  },
  /** 나방 — 빛 위쪽에 떠서 맴돈다(날갯짓에 맞춰 오르내림) */
  mothFly(dt: number, world: World, p: Player) {
    this.lightT = (this.lightT || 0) - dt;
    const L = this.mothLight(world), T0 = G.time || 0;
    const gx = L.x + Math.sin(T0 * 0.7) * 150, gy = L.y - 170 + Math.sin(T0 * 3.1) * 14;
    const k = this.spd! * (1 + this.pf * 0.5);
    const dx = gx - this.cx, dy = gy - this.cy, d = Math.hypot(dx, dy) || 1;
    this.vx += (dx / d * Math.min(k, d * 2) - this.vx) * Math.min(1, dt * 2.2);
    this.vy += (dy / d * Math.min(k, d * 2) - this.vy) * Math.min(1, dt * 2.2);
    this.facing = this.vx < 0 ? -1 : 1;
    void p;
  },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  cocoonSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'pendulum': {                                    // 시계추 — 반대로 당겼다가 플레이어 쪽으로 크게 휘두른다
        const s = Math.sign(p.cx - this.cx) || 1, tele = d.tele2 || 0.8, dur = 1.5;
        this.cocSwing = this.hz({ k: 'cswing', id: nid(), ref: this, nid: this.nid, s, amp: d.amp || 0.95, tele, dur, life: tele + dur + 0.6, dmg: this.dmg * m, c: K.c });
        G.sfxAt && G.sfxAt('cocoon_creak', this.cx / TS, this.cy / TS);
        return { busy: tele + dur + 0.4 };
      }
      case 'silk': {                                        // 실 늘어뜨리기 — 천장에서 실이 내려와 끝의 작은 번데기가 길을 막는다(뛰어넘는다)
        const n = d.cnt || 4, gap = d.gap || 150, off = (Math.random() - 0.5) * gap * 0.6;
        for (let i = 0; i < n; i++) {
          const x = p.cx + off + (i - (n - 1) / 2) * gap, fy = G.hzFloor(x, p.y), top = this.ceilY(x, fy) ?? fy - 460;
          G.after(i * 0.12, () => { if (!E.dead) E.hz({ k: 'cthread', id: nid(), ref: E, nid: E.nid, x, top, y: fy - 14, tele: 0.7, drop: 0.35, life: d.life || 7, dmg: E.dmg * m * 0.7, c: K.c, sd: Math.random() * 99 }); });
        }
        G.sfxAt && G.sfxAt('cocoon_silk', this.cx / TS, this.cy / TS);
        return { busy: 1.0 };
      }
      case 'wingwind': {                                        // 날개 바람 — 날개를 크게 치켜들었다 내리칠 때마다 바람이 밀고 인분이 부채꼴로 흩어진다
        const beats = d.beats || 3, every = 0.75;
        this.hz({ k: 'cgust', id: nid(), ref: this, nid: this.nid, x: this.cx, y: this.cy, follow: 1, beats, every, tele: 0.6, push: d.push || 520, life: 0.6 + beats * every + 0.3, c: K.c });
        for (let b = 0; b < beats; b++) G.after(0.6 + b * every, () => {
          if (E.dead) return;
          const n = d.fan || 7, a0 = Math.atan2(p.cy - E.cy, p.cx - E.cx);
          for (let i = 0; i < n; i++) {
            const a = a0 + (i - (n - 1) / 2) * 0.17, sp = 220 + (i % 2) * 40;
            const pr = new Proj(E.cx, E.cy + 10, Math.cos(a) * sp, Math.sin(a) * sp, E.dmg * m * 0.45, 'enemy', 'scale'); pr.life = 3; G.projs.push(pr);
          }
          G.sfxAt && G.sfxAt('moth_gust', E.cx / TS, E.cy / TS);
        });
        return { busy: 0.6 + beats * every + 0.2 };
      }
      case 'dust': {                                      // 인분 가루 — 방을 가로질러 날며 가루를 떨군다. 내려앉은 자리는 한동안 탄다
        const s = Math.sign(p.cx - this.cx) || 1, n = d.cnt || 6, span = d.span || 620, x0 = p.cx - s * span / 2;
        for (let i = 0; i < n; i++) {
          const x = x0 + s * (i + 0.5) * span / n + (Math.random() - 0.5) * 30, fy = G.hzFloor(x, p.y);
          G.after(i * 0.14, () => { if (!E.dead) E.hz({ k: 'cscale', id: nid(), ref: E, nid: E.nid, x, y: fy, sy: E.cy, w: span / n * 0.9, delay: 0.9, life: 0.9 + (d.life || 4.5), dmg: E.dmg * m * 0.35, c: K.c, sd: Math.random() * 99 }); });
        }
        this.cocDash = { tx: x0 + s * span, ty: this.cy - 30, t: 0, dur: n * 0.14 + 0.4 };
        G.sfxAt && G.sfxAt('moth_scale', this.cx / TS, this.cy / TS);
        return { busy: n * 0.14 + 0.9, tick: (dt: number) => this.move(dt, world, { gravMul: 0 }) };   // 가로지르는 속도를 줄이지 않게
      }
      case 'lightdive': {                                   // 불나방 — 빛을 향해 곧장 돌진(횃불을 놓으면 그쪽으로 빗나간다). 궁은 여러 번
        const n = d.cnt || 1, tele = d.tele2 || 0.75, dur = 0.42, gap = tele + dur + 0.25;
        for (let i = 0; i < n; i++) G.after(i * gap, () => {
          if (E.dead) return;
          E.lightT = 0; const L = E.mothLight(world);
          const dx = L.x - E.cx, dy = L.y - E.cy, dd = Math.hypot(dx, dy) || 1, over = 160;
          E.hz({ k: 'cdive', id: nid(), ref: E, nid: E.nid, x0: E.cx, y0: E.cy, x1: L.x + dx / dd * over, y1: L.y + dy / dd * over, lx: L.x, ly: L.y, bait: L.kind === 'torch' ? 1 : 0,
            tele, dur, life: tele + dur + 0.3, dmg: E.dmg * m, c: K.c });
          G.sfxAt && G.sfxAt('moth_dive', E.cx / TS, E.cy / TS);
        });
        if (n > 1) this.hz({ k: 'cdark', id: nid(), ref: this, nid: this.nid, life: n * gap + 0.4, c: K.c });
        return { busy: n * gap + 0.2 };
      }
    }
    return { busy: 0.3 };
  },
  /** 돌진 · 가로지르기 중에는 자리를 기술이 맡는다(호스트) — 몸놀림보다 먼저 */
  cocoonMoveTick(dt: number) {
    const D = (G.bhz || []).find((h: Bag) => h.k === 'cdive' && h.ref === this && h.t >= h.tele && h.t < h.tele + h.dur);
    if (D) {
      const u = smooth((D.t - D.tele) / D.dur);
      this.x = D.x0 + (D.x1 - D.x0) * u - this.w / 2; this.y = D.y0 + (D.y1 - D.y0) * u - this.h / 2;
      this.vx = this.vy = 0; this.facing = D.x1 < D.x0 ? -1 : 1;     // 자리를 곧장 매긴다(속도를 두면 move 가 한 번 더 민다)
      return true;
    }
    const S = this.cocDash;
    if (S && S.t < S.dur) {
      S.t += dt; const k = Math.min(1, dt * 3.5);
      this.vx += ((S.tx - this.cx) / Math.max(0.2, S.dur - S.t + 0.2) - this.vx) * k; this.vy += (S.ty - this.cy - this.vy) * k;
      this.facing = this.vx < 0 ? -1 : 1;
      return true;
    }
    return false;
  },
};

mixin(Enemy.prototype, BossCocoon, true);
