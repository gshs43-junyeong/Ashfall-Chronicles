/* ===== entity/boss-judge.ts — 판결석 좌상(신전 뒷벽 벽감에 앉은 눈 가린 재판관) — 판결(저울) · 증언 석판 · 단죄의 눈 · 판결의 손 · 선고 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
/* 몸은 벽감에 앉아 움직이지 않는다(def.wall — 닿아도 안 아프다) · 판정 상자는 가슴~무릎(점프로 닿는다).
   판결: 저울이 그동안 플레이어가 서 있던 쪽으로 기운다(머문 시간의 합) — 판결이 내리는 순간 기운 쪽 절반에 룬 기둥.
   한쪽에 머물러 저울을 기울인 뒤 반대쪽으로 건너가면 피한다. 증언 석판은 떨어져 바닥에 선다 — 단죄의 눈 광선을 막는다.
   ★ 그림의 자리는 tools/mkbossrig.py 판결석(judge_*) 설계 좌표(×4)와 같아야 한다 — JD 표. 사연: docs/code-history.md#h226 */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };
let hid = 0;
const nid = () => 7e6 + (hid = hid % 1e6 + 1);

/** 설계 좌표(96×112 칸 · 1칸 = 4px) — 판정 상자 가운데 (48, 60) · 바닥 109 · 목 축 (48, 34) · 어깨 (48±23, 42) · 팔 두 마디 L1 · L2(px) */
export const JD = { K: 4, C: [48, 60], BASE: 109, NECK: [48, 34], SH: 23, SH_Y: 42, L1: 112, L2: 104, EYE_Y: 21 };
export function jdAt(e: { cx: number; cy: number }, dx: number, dy: number): [number, number] {
  return [e.cx + (dx - JD.C[0]) * JD.K, e.cy + (dy - JD.C[1]) * JD.K];
}
export const jdFloor = (e: { cx: number; cy: number }) => e.cy + (JD.BASE - JD.C[1]) * JD.K;
/** 판결 저울의 기울기(-1~1) — 판결 전엔 머문 시간의 합을 따르고, 판결 뒤엔 그 쪽으로 내려앉는다 */
export function verdictTilt(h: Bag): number {
  if (h.doom) return h.doom * Math.min(1, 0.6 + (h.t - h.tele) * 3);
  return Math.max(-1, Math.min(1, (h.w || 0) / 1.1));
}
/** 단죄의 눈 — 지금 몇 번째 겨눔인지 · 그 안의 단계(0 쫓기 · 1 멈춤 · 2 쏨 · 3 쉼) · 단계 안 0~1 */
export function eyeStage(h: Bag): [number, number, number] {
  const i = Math.min(h.n - 1, Math.floor(h.t / h.per)), u = h.t - i * h.per;
  if (u < h.track) return [i, 0, u / h.track];
  if (u < h.track + h.hold) return [i, 1, (u - h.track) / h.hold];
  if (u < h.track + h.hold + h.fire) return [i, 2, (u - h.track - h.hold) / h.fire];
  return [i, 3, 0];
}
/** 광선의 끝 — 눈에서 겨눈 자리를 지나 바닥까지. 그 사이에 선 증언 석판에서 멈춘다. [끝 x, 끝 y, 막은 석판] */
export function beamEnd(ex: number, ey: number, lx: number, ly: number, fy: number, tabs: Bag[]): [number, number, Bag | null] {
  const dx = lx - ex, dy = Math.max(1, ly - ey), s1 = (fy - ey) / dy;
  let s = s1, hit: Bag | null = null;
  for (const t of tabs) {
    if (t.t < t.tele || t.t > t.life - 0.4) continue;
    const st = (t.x - ex) / (dx || 1e-6);
    if (st <= 0.02 || st >= s) continue;
    const y = ey + dy * st;
    if (y > t.fy - 150 && y < t.fy) { s = st; hit = t; }
  }
  return [ex + dx * s, ey + dy * s, hit];
}

export const BossJudge: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 처음 한 번 벽감 바닥에 앉힌다. 그다음은 앉아서 숨만 쉰다(몸짓은 그림이 맡는다) */
  jdAI(dt: number, world: World) {
    this.vx = this.vy = 0;
    if (!this.anchored) {
      this.anchored = 1;
      const tx = Math.floor(this.cx / TS);
      for (let ty = Math.floor(this.cy / TS); ty < Math.floor(this.cy / TS) + 40; ty++)
        if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { this.y = ty * TS - (JD.BASE - JD.C[1]) * JD.K - this.h / 2; break; }
    }
    void dt;
  },
  /** 판결 하나 — doom 을 주면 저울질 없이 그 쪽(선고) */
  jdVerdict(tele: number, m: number, K: Bag, doom = 0) {
    return this.hz({ k: 'jverdict', id: nid(), ref: this, nid: this.nid, x: this.cx, fy: jdFloor(this), half: 660, tele, gap: 0.65, life: tele + 0.65 + 1.4,
      w: 0, doom, fixed: doom ? 1 : 0, dmg: this.dmg * m, c: K.c, sd: Math.random() * 99 });
  },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  jdSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'verdict': {                                     // 판결 — 저울이 머문 쪽으로 기울고, 판결이 내리면 그 절반에 룬 기둥
        this.jdVerdict(d.weigh || 2.6, m, K);
        G.sfxAt && G.sfxAt('jd_weigh', this.cx / TS, this.cy / TS);
        return { busy: (d.weigh || 2.6) + 1.2 };
      }
      case 'tablets': {                                     // 증언 석판 — 벽에서 떨어져 바닥에 선다(깔리면 아프다 · 서 있는 동안 광선을 막는다)
        const n = d.cnt || 2, xs: number[] = [];
        const toward = Math.sign(p.cx - this.cx) || 1;
        xs.push(p.cx + (Math.random() - 0.5) * 60);
        xs.push(this.cx + toward * (180 + Math.random() * 80));
        while (xs.length < n) xs.push(this.cx + (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 360));
        xs.slice(0, n).forEach((x, i) => G.after(i * 0.35, () => {
          if (E.dead) return;
          E.hz({ k: 'jtab', id: nid(), ref: E, nid: E.nid, x, fy: G.hzFloor(x, p.y), tele: 0.9, life: 0.9 + (d.life || 12), dmg: E.dmg * m, c: K.c, sd: Math.random() * 99 });
        }));
        G.sfxAt && G.sfxAt('jd_tablet', this.cx / TS, this.cy / TS);
        return { busy: 1.0 + n * 0.35 };
      }
      case 'gavel': {                                       // 판결의 손 — 편 손바닥이 바닥을 내리치면 충격파가 양쪽으로(뛰어넘는다)
        /* 빈손(오른쪽)으로만 친다 — 저울 쪽으로 손을 건너 뻗으면 팔이 얼굴을 가로질렀다. 충격파가 양쪽으로 달리니 어디서든 뛰어넘는다 */
        const s = 1, reach = 230, tx = this.cx + Math.max(120, Math.min(reach, p.cx - this.cx));
        this.hz({ k: 'jgavel', id: nid(), ref: this, nid: this.nid, s, tx, fy: jdFloor(this), tele: 0.85, life: 0.85 + 1.3, dmg: this.dmg * m, c: K.c });
        G.sfxAt && G.sfxAt('jd_lift', this.cx / TS, this.cy / TS);
        return { busy: 1.8 };
      }
      case 'condemn': {                                     // 단죄의 눈 — 외눈이 노려본 자리를 쫓다 멈추고 쏜다(셋 · 석판 뒤에 숨는다)
        const n = d.cnt || 3, per = 1.55;
        this.hz({ k: 'jeye', id: nid(), ref: this, nid: this.nid, n, per, track: 0.95, hold: 0.32, fire: 0.28, life: n * per + 0.2,
          lx: p.cx, ly: p.cy, dmg: this.dmg * m, c: K.c });
        G.sfxAt && G.sfxAt('jd_eye', this.cx / TS, this.cy / TS);
        return { busy: n * per + 0.2 };
      }
      case 'sentence': {                                    // 선고 — 저울질 없이 판결 셋이 번갈아 내린다(가운데를 넘나든다) · 끝에 판결의 손
        const s0 = Math.sign(p.cx - this.cx) || 1;
        [s0, -s0, s0].forEach((doom, i) => G.after(i * 1.7, () => { if (!E.dead) E.jdVerdict(1.0, m * 0.9, K, doom); }));
        G.after(5.2, () => { if (!E.dead) E.hz({ k: 'jgavel', id: nid(), ref: E, nid: E.nid, s: 1, tx: E.cx + 170, fy: jdFloor(E), tele: 0.7, life: 0.7 + 1.3, dmg: E.dmg * m, c: K.c, both: 1 }); });
        G.sfxAt && G.sfxAt('jd_sentence', this.cx / TS, this.cy / TS);
        return { busy: 7.2 };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossJudge, true);
