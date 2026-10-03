/* ===== engine/entity/steer.ts — 조향: 다가가기 · 멈춰 서기 · 떠돌기 · 서로 비켜 서기 ===== */
/* 나는 것·헤엄치는 것은 칸에 서지 않으니 "가고 싶은 속도"를 더해서 움직인다. 여러 마리가 한 자리로 몰려 겹치면
   한 덩어리로 보인다(박쥐 다섯이 한 마리처럼) — separation 이 서로를 밀어 퍼뜨린다. 결과는 원하는 속도(px/s)이고
   실제로 그 속도에 다가가는 빠르기는 부르는 쪽(lerp)이 정한다. */

export interface Vec { x: number; y: number }

/** (x, y) 에서 (tx, ty) 로 빠르기 sp — slow 거리 안에서는 줄여 멈춰 선다(arrive) */
export function seek(x: number, y: number, tx: number, ty: number, sp: number, slow = 0): Vec {
  const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
  const k = slow > 0 && d < slow ? d / slow : 1;
  return { x: (dx / d) * sp * k, y: (dy / d) * sp * k };
}

/** 반대로 — 달아나기 */
export function flee(x: number, y: number, tx: number, ty: number, sp: number): Vec {
  const v = seek(x, y, tx, ty, sp);
  return { x: -v.x, y: -v.y };
}

/** 서로 비켜 서기 — 반경 r 안의 이웃에게서 가까울수록 세게 밀려난다(이웃 수와 상관없이 크기 sp 이하) */
export function separation(x: number, y: number, others: Iterable<Vec & { cx?: number; cy?: number }>, r: number, sp: number, self?: unknown): Vec {
  let ax = 0, ay = 0;
  for (const o of others) {
    if (o === self) continue;
    const ox = o.cx !== undefined ? o.cx : o.x, oy = o.cy !== undefined ? o.cy : o.y;
    const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy);
    if (d >= r) continue;
    const k = (r - d) / r;
    if (d < 0.01) { ax += (Math.random() - 0.5) * k; ay += (Math.random() - 0.5) * k; continue; }
    ax += (dx / d) * k; ay += (dy / d) * k;
  }
  const m = Math.hypot(ax, ay);
  return m > 1 ? { x: (ax / m) * sp, y: (ay / m) * sp } : { x: ax * sp, y: ay * sp };
}

/** 떠돌기 — 앞으로 가며 방향이 천천히 휜다. 상태(각도)는 부르는 쪽이 들고 있다가 돌려준 a 로 바꾼다 */
export function wander(a: number, dt: number, sp: number, turn = 1.6, rand: () => number = Math.random): { v: Vec; a: number } {
  const na = a + (rand() - 0.5) * turn * dt * 6;
  return { v: { x: Math.cos(na) * sp, y: Math.sin(na) * sp }, a: na };
}

/** 길 따라 날기 — 칸 좌표 목록(path)을 따라 다음 마디로 seek. i 는 지금 마디 번호(돌려준 i 로 바꾼다) */
export function followPoints(x: number, y: number, pts: ReadonlyArray<[number, number]>, i: number, cell: number, sp: number, reach = 0.6): { v: Vec; i: number } {
  while (i < pts.length) {
    const px = (pts[i][0] + 0.5) * cell, py = (pts[i][1] + 0.5) * cell;
    if (Math.hypot(px - x, py - y) < cell * reach) { i++; continue; }
    return { v: seek(x, y, px, py, sp), i };
  }
  return { v: { x: 0, y: 0 }, i };
}
