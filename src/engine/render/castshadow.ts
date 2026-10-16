/* ===== engine/render/castshadow.ts — 해가 비추는 몸의 그림자(실루엣을 땅에 눕힌다) ===== */
/* 몸 그림을 한 번 빈 판에 그려 검게 칠하고(source-in), 발끝을 축으로 해 반대쪽으로 기울이며 위아래로 눌러 바닥에 눕힌다.
   방향은 DayCycle.sunDir 의 {x, y, k} 를 그대로 받는다 — 타일 그늘(castSunlight)과 같은 해를 봐야 몸과 땅의 그림자가 어긋나지 않는다. */

export interface CastShadowOpts {
  alpha?: number;    // 가장 짙을 때(해가 높고 구름이 없을 때)
  squash?: number;   // 위아래 눌림(0 = 납작한 선 · 1 = 서 있는 그대로)
  maxLean?: number;  // 해가 낮을 때 그림자가 몸 높이의 몇 배까지 눕는가
  blur?: number;     // 가장자리 흐림(px)
}

export class CastShadow {
  declare buf: HTMLCanvasElement | null; declare bc: CanvasRenderingContext2D | null;
  constructor() { this.buf = null; this.bc = null; }

  /** draw(ctx, ox, oy) 는 (ox, oy) 를 왼쪽 위로 몸을 한 번 그리는 함수 · w × h 는 그림이 들어갈 칸 · (footX, footY) 는 화면의 발끝 */
  draw(c: CanvasRenderingContext2D, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, ox: number, oy: number) => void,
    footX: number, footY: number, sun: { x: number; y: number; k: number } | null, o: CastShadowOpts = {}): void {
    if (!sun || sun.k <= 0.02 || typeof document === 'undefined') return;
    const W = Math.ceil(w), H = Math.ceil(h);
    if (!this.buf) { this.buf = document.createElement('canvas'); this.bc = this.buf.getContext('2d'); }
    const b = this.buf, bc = this.bc!;
    if (b.width < W || b.height < H) { b.width = Math.max(b.width, W); b.height = Math.max(b.height, H); }
    bc.setTransform(1, 0, 0, 1, 0, 0); bc.clearRect(0, 0, b.width, b.height);
    bc.globalCompositeOperation = 'source-over';
    draw(bc, 0, 0);
    bc.globalCompositeOperation = 'source-in'; bc.fillStyle = '#000'; bc.fillRect(0, 0, W, H);
    bc.globalCompositeOperation = 'source-over';
    /* 해 반대쪽으로 — 해가 오른쪽(x>0)이면 그림자는 왼쪽. 해가 낮을수록(|y| 작음) 길게 눕는다 */
    const lean = Math.max(-(o.maxLean ?? 1.4), Math.min(o.maxLean ?? 1.4, -sun.x / Math.max(0.25, -sun.y)));
    const sq = o.squash ?? 0.32;
    c.save();
    c.globalAlpha *= (o.alpha ?? 0.34) * sun.k;
    if (o.blur) c.filter = `blur(${o.blur}px)`;
    /* 발끝(그림 아랫변 가운데)을 축으로: 머리 쪽이 lean·몸 높이만큼 옆으로 · 높이는 sq 배로 눌린다 */
    c.setTransform(c.getTransform().multiply(new DOMMatrix([1, 0, -lean, sq, footX + lean * H, footY - sq * H])));
    c.drawImage(b, 0, 0, W, H, -W / 2, 0, W, H);
    c.restore();
  }
}
