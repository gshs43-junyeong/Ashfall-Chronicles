/* ===== engine/core/math.ts — 수 · 거리 · 사각형 겹침 ===== */

export const clamp = (v: number, a: number, b: number): number => v < a ? a : v > b ? b : v;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const inv = (a: number, b: number, v: number): number => (v - a) / (b - a || 1);
export const TAU = Math.PI * 2;

/** 사각형(x·y·w·h)이면 무엇이든 — 엔티티도 그대로 넘긴다. */
export interface Rect { x: number; y: number; w: number; h: number }

/** 사각형 겹침 */
export function aabb(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function dist2(ax: number, ay: number, bx: number, by: number): number { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }
export function dist(ax: number, ay: number, bx: number, by: number): number { return Math.sqrt(dist2(ax, ay, bx, by)); }
export function angleTo(ax: number, ay: number, bx: number, by: number): number { return Math.atan2(by - ay, bx - ax); }
