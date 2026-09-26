/* ===== engine/render/atlas.ts — 타일 아틀라스: 칸마다 잘라 굽기 · 칸 블릿 · 칸 그림 캐시 ===== */

/** 칸 하나에 가둬 그린다 — ★ 안 자르면 붓질이 옆 칸으로 새어, 그릴 때 칸 경계에 옆 타일 줄이 생긴다. */
export function clipCell(g: CanvasRenderingContext2D, ox: number, oy: number, ts: number, fn: () => void): void {
  g.save(); g.beginPath(); g.rect(ox, oy, ts, ts); g.clip(); fn(); g.restore();
}

/** rows × cols 칸짜리 아틀라스를 굽는다. paint(g, ox, oy, 행, 열)는 **행 순서 → 열 순서**로 한 번씩 불린다
    — 게임이 공유 난수를 쓰면 이 순서가 곧 그림이다(바꾸면 모든 질감이 달라진다). 그릴 것이 없는 칸은 그냥 돌아오면 된다. */
export function bakeAtlas(ts: number, cols: number, rows: number,
  paint: (g: CanvasRenderingContext2D, ox: number, oy: number, row: number, col: number) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cols * ts; cv.height = rows * ts;
  const g = cv.getContext('2d')!;
  for (let r = 0; r < rows; r++) for (let v = 0; v < cols; v++) clipCell(g, v * ts, r * ts, ts, () => paint(g, v * ts, r * ts, r, v));
  return cv;
}

/** 아틀라스의 (열, 행) 칸을 화면 (sx, sy)에 — h 를 주면 칸 위에서 h 픽셀만(발판처럼 얇은 타일) */
export function blitCell(c: CanvasRenderingContext2D, atlas: CanvasImageSource, ts: number, col: number, row: number, sx: number, sy: number, h?: number): void {
  c.drawImage(atlas, col * ts, row * ts, ts, h || ts, sx, sy, ts, h || ts);
}

/** 열쇠 → 그림 캐시. 열쇠가 같으면 다시 그리지 않고, max 를 넘으면 통째로 비운다(오래 돌아다녀도 메모리가 안 붓게). */
export function cacheGet<T>(m: Map<string, T>, key: string, make: () => T, max = 2500): T {
  let hit = m.get(key);
  if (hit) return hit;
  if (m.size > max) m.clear();
  hit = make(); m.set(key, hit);
  return hit;
}
