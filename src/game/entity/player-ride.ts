/* ===== entity/player-ride.js — 플레이어 — 탈 것 위의 움직임(배 · 수레). 말은 player-move 가 빠르기 · 점프만 바꿔 쓴다 ===== */
/* 탄 몸의 판정 상자는 그대로(20×40)다 — 크기를 바꾸면 낮은 천장 밑에서 타는 순간 끼었다. 그림만 앉힌다(game/rides.ts). */
import { app as G } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { T, TILE_DEF } from '../data.js';
import { TS } from '../world.js';
import { Player } from '../entity.js';
/* entity.js 의 Player 에서 나눈 조각 — 읽히는 순간 Player.prototype 에 붙는다. */

/* 탈 것 — 말(빠르기 · 가속 배율 · 점프 · 덜 다치는 낙하) · 배(최고 속도 · 가속 · 물 저항) · 수레(최고 속도 · 손 가속 · 비탈 중력 · 마찰) */
export const RIDES: Bag = {
  horse: { ms: 1.9, acc: 1.5, jump: 760, safeFall: 280 },
  boat: { max: 240, acc: 520, drag: 1.3 },
  cart: { max: 620, acc: 360, grav: 1100, fric: 0.18 }
};

/** col 칸의 레일 줄 — row 와 그 위아래 한 줄까지(비탈) */
export function railRow(w: World, col: number, row: number): number {
  for (const d of [0, -1, 1]) if (w.get(col, row + d) === T.RAIL) return row + d;
  return -1;
}
/** 레일 윗면(바퀴가 닿는 곳) — 칸 바닥에서 4px 위 */
export const railTop = (r: number) => (r + 1) * TS - 4;
/** x 에서 레일 높이 · 기울기 — 이웃 칸 가운데끼리 곧게 잇는다(한 칸 오르내림이 비탈이 된다) */
export function railAt(w: World, x: number, row: number): { y: number; slope: number; row: number } | null {
  const col = Math.floor(x / TS), r = railRow(w, col, row);
  if (r < 0) return null;
  const yc = railTop(r), mid = (col + 0.5) * TS, side = x >= mid ? 1 : -1;
  const rn = railRow(w, col + side, r), yn = rn >= 0 ? railTop(rn) : yc;
  const t = Math.abs(x - mid) / TS;
  return { y: yc + (yn - yc) * t, slope: (yn - yc) / TS * side, row: r };
}
/** 배가 뜰 수면 줄 — row 근처의 물에서 위로 올라가 공기와 닿는 첫 물 칸 */
export function boatRow(w: World, col: number, row: number): number {
  for (const ty of [row, row + 1, row + 2, row - 1])
    if (TILE_DEF[w.get(col, ty)].liquid) { const s = w.surfaceRow(col, ty, 5); if (s >= 0) return s; }
  return -1;
}

export const PlayerRide: Bag & ThisType<Player> = {
  /** 배 · 수레 한 걸음 — 점프는 내리기(game/rides.ts 가 ride.off 를 보고 내린다) */
  rideStep(dt: number, world: World, input: Bag) {
    const rd = this.ride!, R = RIDES[rd.kind];
    const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (input.jump && !this.jumpHeld) rd.off = 'jump';
    this.jumpHeld = !!input.jump;
    this.swimming = false; this.floating = false; this.submerged = 0; this.onGround = true; this.vy = 0;
    if (rd.kind === 'boat') {
      this.vx += want * R.acc * dt;
      this.vx -= this.vx * R.drag * dt;
      this.vx = clamp(this.vx, -R.max, R.max);
      let nx = this.cx + this.vx * dt;
      let col = Math.floor(nx / TS), sr = boatRow(world, col, rd.row);
      // 물이 끝나거나(뭍) 수면 위가 막히면(다리 · 둑) 거기서 멈춘다 — 배 끝 쪽(±18px)까지 본다
      const edge = Math.floor((nx + Math.sign(this.vx || 1) * 18) / TS);
      if (sr < 0 || boatRow(world, edge, sr) < 0 || world.solid(col, sr - 1) || world.solid(edge, sr - 1)) {
        this.vx = 0; nx = this.cx; col = Math.floor(nx / TS); sr = boatRow(world, col, rd.row);
      }
      if (sr < 0) { rd.off = 'land'; return; }                    // 발밑 물이 사라졌다
      rd.row = sr;
      const surf = G.surfacePx ? G.surfacePx(nx / TS, sr) : sr * TS;
      this.x = nx - this.w / 2; this.y = surf + 3 - this.h;
    } else {
      const here = railAt(world, this.cx, rd.row);
      if (!here) { rd.off = 'rail'; return; }
      rd.v = (rd.v || 0) + want * R.acc * dt + R.grav * here.slope / Math.hypot(1, here.slope) * dt;
      rd.v -= rd.v * R.fric * dt;
      rd.v = clamp(rd.v, -R.max, R.max);
      let nx = this.cx + rd.v * dt;
      let next = railAt(world, nx, here.row);
      const body = Math.floor((here.y - 30) / TS);
      if (!next || world.solid(Math.floor(nx / TS), body)) {       // 레일 끝 · 벽 — 멈춘다(빠르면 살짝 튕긴다)
        if (Math.abs(rd.v) > 160) { rd.bump = Math.abs(rd.v); rd.v = -rd.v * 0.2; } else rd.v = 0;
        nx = this.cx; next = here;
      }
      rd.row = next.row;
      this.vx = rd.v;
      this.x = nx - this.w / 2; this.y = next.y - 8 - this.h;      // 수레 안에 앉는다
      rd.tilt = Math.atan(next.slope);
    }
    if (Math.abs(this.vx) > 15) this.facing = Math.sign(this.vx);
  }
};
mixin(Player.prototype, PlayerRide, true);
