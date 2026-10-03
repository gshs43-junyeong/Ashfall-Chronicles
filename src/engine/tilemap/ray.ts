/* ===== engine/tilemap/ray.ts — 칸 격자 위의 광선(시선 · 사격선 · 빛) ===== */
/* 칸 단위 좌표(실수)에서 칸 단위 좌표로 곧게 걸으며 지나는 칸을 차례로 본다(Amanatides–Woo).
   막힘을 무엇으로 볼지는 게임이 정한다(blocked) — 엔진은 타일 뜻을 모른다. */

export type Blocked = (x: number, y: number) => boolean;

/** (x0, y0) → (x1, y1) 사이에 지나는 칸마다 visit(cx, cy, t) — t 는 0~1 진행. visit 이 true 를 돌려주면 멈추고 true.
    출발 칸은 부르지 않는다(눈이 서 있는 칸) · 도착 칸은 부른다. */
export function gridRay(x0: number, y0: number, x1: number, y1: number, visit: (cx: number, cy: number, t: number) => boolean | void): boolean {
  let cx = Math.floor(x0), cy = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1);
  const dx = x1 - x0, dy = y1 - y0;
  const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0, sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const tdx = sx ? Math.abs(1 / dx) : Infinity, tdy = sy ? Math.abs(1 / dy) : Infinity;
  let tmx = sx > 0 ? (cx + 1 - x0) * tdx : sx < 0 ? (x0 - cx) * tdx : Infinity;
  let tmy = sy > 0 ? (cy + 1 - y0) * tdy : sy < 0 ? (y0 - cy) * tdy : Infinity;
  const steps = Math.abs(ex - cx) + Math.abs(ey - cy);
  for (let i = 0; i < steps; i++) {
    let t: number;
    if (tmx < tmy) { t = tmx; tmx += tdx; cx += sx; } else { t = tmy; tmy += tdy; cy += sy; }
    if (visit(cx, cy, Math.min(1, t))) return true;
  }
  return false;
}

/** 두 점 사이가 트였는가 — 도착 칸 자신은 막혀 있어도 된다(벽에 붙은 과녁을 볼 수 있게). */
export function lineOfSight(blocked: Blocked, x0: number, y0: number, x1: number, y1: number): boolean {
  const ex = Math.floor(x1), ey = Math.floor(y1);
  return !gridRay(x0, y0, x1, y1, (cx, cy) => (cx !== ex || cy !== ey) && blocked(cx, cy));
}

/** 광선이 처음 부딪히는 칸 — { x, y, t }(칸 좌표 · 진행 0~1) 또는 null. 사격선 · 레이저 · 갈고리에. */
export function rayHit(blocked: Blocked, x0: number, y0: number, x1: number, y1: number): { x: number; y: number; t: number } | null {
  let hit: { x: number; y: number; t: number } | null = null;
  gridRay(x0, y0, x1, y1, (cx, cy, t) => { if (blocked(cx, cy)) { hit = { x: cx, y: cy, t }; return true; } });
  return hit;
}

/** 몸통이 있는 것끼리의 시선 — 눈 높이 하나만 보면 칸 모서리 하나에 시선이 끊긴다. 위·가운데·아래 셋 중 하나라도 트이면 보인다. */
export function seesBox(blocked: Blocked, ex: number, ey: number, tx: number, ty: number, halfH: number): boolean {
  return lineOfSight(blocked, ex, ey, tx, ty) || lineOfSight(blocked, ex, ey, tx, ty - halfH) || lineOfSight(blocked, ex, ey, tx, ty + halfH * 0.8);
}
