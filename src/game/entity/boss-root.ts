/* ===== entity/boss-root.ts — 뿌리 대성당(정글 뒷벽에 박힌 속 빈 고목) — 뿌리 분출 · 나이테 파동 · 꽃 피는 철 · 쓰러지는 나무 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
/* 몸은 뒷벽에 박혀 움직이지 않는다(def.wall — 닿아도 안 아프다) · 판정 상자는 얼굴과 빈 속(점프로 닿는다).
   뿌리는 땅이 먼저 들썩인 자리에서 솟고 · 나이테는 밑동에서 바닥을 따라 퍼지니 그 테를 뛰어넘는다 ·
   꽃은 꺾지(밟지) 않으면 철이 끝날 때 고목을 낫게 한다 · 쓰러지는 나무는 그림자가 먼저 눕는다.
   ★ 그림의 자리는 tools/mkbossrig.py 뿌리 대성당(root_*) 설계 좌표(×4)와 같아야 한다 — RT 표. 사연: docs/code-history.md#h230 */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };
let hid = 0;
const nid = () => 9e6 + (hid = hid % 1e6 + 1);

/** 설계 좌표(104×120 칸 · 1칸 = 4px) — 판정 상자 가운데 (52, 84) · 바닥 117 · 옹이 눈 (52±11, 56) · 장미창 (52, 76) · 가지 어깨 (52±22, 30) · 우듬지 밑 (52, 24) */
export const RT = { K: 4, C: [52, 84], BASE: 117, EYE_DX: 11, EYE_Y: 56, ROSE: [52, 76], SH_DX: 22, SH_Y: 30, CROWN_Y: 24 };
export function rtAt(e: { cx: number; cy: number }, dx: number, dy: number): [number, number] {
  return [e.cx + (dx - RT.C[0]) * RT.K, e.cy + (dy - RT.C[1]) * RT.K];
}
export const rtFloor = (e: { cx: number; cy: number }) => e.cy + (RT.BASE - RT.C[1]) * RT.K;
/** 솟는 뿌리의 단계 — [높이 0~1, 단계 0 들썩 · 1 솟음 · 2 버팀 · 3 가라앉음] */
export function rootStage(h: Bag): [number, number] {
  if (h.t < h.tele) return [0, 0];
  const t = h.t - h.tele;
  if (t < 0.16) return [(t / 0.16) ** 0.6, 1];
  if (t < 0.16 + h.hold) return [1, 2];
  return [Math.max(0, 1 - (t - 0.16 - h.hold) / 0.4), 3];
}
/** 쓰러지는 나무 — [눕은 각 0(선 채) ~ 1(바닥), 단계 0 기운다 · 1 쓰러진다 · 2 누워 있다] */
export function fellStage(h: Bag): [number, number] {
  if (h.t < h.tele) return [0.06 * (h.t / h.tele) ** 2, 0];
  const t = h.t - h.tele;
  if (t < 0.55) { const u = t / 0.55; return [0.06 + 0.94 * u * u, 1]; }
  return [1, 2];
}

export const BossRoot: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 처음 한 번 밑동을 바닥에 앉힌다. 그다음은 숨만 쉰다(몸짓은 그림이 맡는다) */
  rtAI(dt: number, world: World) {
    this.vx = this.vy = 0;
    if (!this.anchored) {
      this.anchored = 1;
      const tx = Math.floor(this.cx / TS);
      for (let ty = Math.floor(this.cy / TS); ty < Math.floor(this.cy / TS) + 40; ty++)
        if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { this.y = ty * TS - (RT.BASE - RT.C[1]) * RT.K - this.h / 2; break; }
    }
    void dt;
  },
  /** 뿌리 하나 — x 에서 tele 뒤에 솟는다 */
  rtRoot(x: number, py: number, tele: number, m: number, K: Bag, big = 1) {
    return this.hz({ k: 'rroot', id: nid(), ref: this, nid: this.nid, x, fy: G.hzFloor(x, py), tele, hold: 0.9, big,
      life: tele + 0.16 + 0.9 + 0.4, dmg: this.dmg * m, c: K.c, sd: Math.random() * 99 });
  },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  rtSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this, s = Math.sign(p.cx - this.cx) || 1;
    switch (d.sig) {
      case 'rroots': {                                      // 뿌리 분출 — 밑동에서 플레이어 쪽으로 땅을 가르며 차례로 솟는다(마지막은 선 자리 너머)
        const n = d.cnt || 5, span = Math.max(260, Math.abs(p.cx - this.cx) + 140);
        for (let i = 0; i < n; i++) {
          const x = this.cx + s * (150 + (span - 150) * i / (n - 1)) + (Math.random() - 0.5) * 30;
          G.after(i * 0.2, () => { if (!E.dead) E.rtRoot(x, p.y, 0.75, m, K); });
        }
        G.sfxAt && G.sfxAt('rt_heave', p.cx / TS, p.cy / TS);
        return { busy: 0.2 * n + 1.2 };
      }
      case 'rrings': {                                      // 나이테 파동 — 밑동에서 바닥을 따라 고리가 퍼진다(테마다 뛰어넘는다)
        const n = d.cnt || 3, gap = 0.95;
        for (let i = 0; i < n; i++) G.after(i * gap, () => {
          if (E.dead) return;
          E.hz({ k: 'rring', id: nid(), ref: E, nid: E.nid, x: E.cx, fy: rtFloor(E), tele: 0.55, spd: 300 + i * 30, life: 0.55 + 3.2,
            dmg: E.dmg * m * 0.8, c: K.c, sd: Math.random() * 99, hit: {} });
        });
        G.sfxAt && G.sfxAt('rt_ring', this.cx / TS, this.cy / TS);
        return { busy: n * gap + 0.8 };
      }
      case 'rbloom': {                                      // 꽃 피는 철 — 싸움터에 꽃이 핀다. 철이 끝날 때까지 꺾이지 않은 꽃마다 고목이 낫는다
        const n = d.cnt || 4, xs: number[] = [];
        for (let i = 0; i < n; i++) {
          let x = 0;
          for (let k = 0; k < 8; k++) { x = this.cx + (i % 2 ? 1 : -1) * (170 + Math.random() * 380); if (xs.every(v => Math.abs(v - x) > 90)) break; }
          xs.push(x);
        }
        const life = d.life || 7.5;
        xs.forEach((x, i) => G.after(i * 0.25, () => {
          if (E.dead) return;
          E.hz({ k: 'rflower', id: nid(), ref: E, nid: E.nid, x, fy: G.hzFloor(x, p.y), tele: 1.1, life, heal: d.heal || 0.04, c: K.c, sd: Math.random() * 99 });
        }));
        G.sfxAt && G.sfxAt('rt_bloom', this.cx / TS, this.cy / TS);
        return { busy: 1.6 };
      }
      case 'rfell': {                                       // 쓰러지는 나무 — 우듬지가 기울고 그림자가 먼저 눕는다 · 그 자리에 줄기가 쓰러진다 · 쓰러진 줄기를 따라 뿌리
        const len = d.len || 760, fy = rtFloor(this);
        this.hz({ k: 'rfell', id: nid(), ref: this, nid: this.nid, x: this.cx, fy, s, len, tele: 2.2, life: 2.2 + 0.55 + 3.2, dmg: this.dmg * m, c: K.c, sd: Math.random() * 99 });
        G.after(2.9, () => { if (E.dead) return; for (let i = 0; i < 4; i++) E.rtRoot(E.cx - s * (180 + i * 120), p.y, 0.6 + i * 0.12, m * 0.8, K, 0.8); });
        G.sfxAt && G.sfxAt('rt_creak', this.cx / TS, this.cy / TS);
        return { busy: 5.4 };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossRoot, true);
