/* ===== engine/render/conn.ts — 이웃을 보고 그리는 타일의 틀 ===== */
/* ① 몸통만(bodyOnly): 윗면을 제 그림에 그린 타일(잔디·눈…)은 위가 막히면 칸 아래 절반(몸통)을 위아래로 두 번 그린다 — 땅속 잔디 줄이 안 생긴다.
   ② 번호별 그리기(add): 이웃을 보고 통째로 그리는 타일 — 무엇을 어떻게 그릴지는 게임이 건다. 그리면 true, 평소대로 그리게 하려면 false. */

/** 타일맵에서 칸 하나 읽기 — 게임 세계가 그대로 들어온다 */
export interface TileReader { get(x: number, y: number): number }
export type ConnDraw<W extends TileReader> =
  (c: CanvasRenderingContext2D, w: W, id: number, tx: number, ty: number, sx: number, sy: number, v: number) => boolean;

export function createConnTiles<W extends TileReader>({ ts, bodyOnly, solid }: {
  ts: number;
  /** ① 타일 번호 → 1 */
  bodyOnly: Record<number, number>;
  /** 그 번호의 타일이 막힌 칸인가 */
  solid(id: number): boolean;
}) {
  const draws = new Map<number, ConnDraw<W>>();
  return {
    add(id: number, fn: ConnDraw<W>): void { draws.set(id, fn); },
    /** ①② 를 그린다 — 해당이 없으면 false(부르는 쪽이 평소대로 그린다) */
    draw(c: CanvasRenderingContext2D, atlas: CanvasImageSource, w: W, id: number, tx: number, ty: number, sx: number, sy: number, v: number): boolean {
      if (bodyOnly[id]) {
        if (!solid(w.get(tx, ty - 1))) return false;   // 위가 트였으면 평소대로
        const h = ts >> 1, oy = id * ts + ts - h;
        c.drawImage(atlas, v * ts, oy, ts, h, sx, sy, ts, h);
        c.drawImage(atlas, v * ts, oy, ts, h, sx, sy + h, ts, ts - h);
        return true;
      }
      const fn = draws.get(id);
      return fn ? fn(c, w, id, tx, ty, sx, sy, v) : false;
    }
  };
}
