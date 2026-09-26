/* ===== engine/platform/viewport.ts — 캔버스를 창 크기 · 화면 배율에 맞춘다 ===== */

/** 캔버스 픽셀을 창 × DPR(최대 dprMax)로 잡고, 그리기 좌표를 zoom 배로 맞춘다.
    ★ DPR 은 2 에서 자른다 — 3 배 화면에서 채움 비용이 2.25 배로 뛴다. 돌려주는 W·H 는 **월드 좌표계로 본 시야 크기**다. */
export function fitCanvas(cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, zoom: number, dprMax = 2): { W: number; H: number } {
  const dpr = Math.min(dprMax, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const W = innerWidth / zoom, H = innerHeight / zoom;
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return { W, H };
}
