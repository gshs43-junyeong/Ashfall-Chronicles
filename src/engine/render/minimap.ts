/* ===== engine/render/minimap.ts — 지도 그림: 밝혀진 칸을 한 칸 = 한 화소로 모아 두는 판 · 둘레 창 그리기 ===== */
/* 큰 지도는 매번 칸을 다시 훑지 않는다 — 밝혀질 때마다 그 칸 한 화소만 칠해 둔 판(MapAtlas)을 늘려 그린다.
   작은 지도(둘레 창)는 칸이 적어 매번 칸을 본다(drawTileWindow) — 무엇을 무슨 색으로 그릴지는 게임이 정한다. */

export class MapAtlas {
  declare cv: HTMLCanvasElement; declare cx: CanvasRenderingContext2D;
  constructor() { this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = 1; this.cx = this.cv.getContext('2d')!; }

  /** 세계 크기에 맞춘다 — 크기가 바뀌었으면 true(다시 칠해야 한다) */
  fit(w: number, h: number): boolean {
    if (this.cv.width === w && this.cv.height === h) return false;
    this.cv.width = w; this.cv.height = h; this.cx = this.cv.getContext('2d')!;
    return true;
  }
  /** 칸 하나를 칠한다(막 밝혀진 칸) */
  paint(x: number, y: number, color: string): void { this.cx.fillStyle = color; this.cx.fillRect(x, y, 1, 1); }

  /** 처음부터 다시 — revealed(k) 인 칸만 color(x, y) 로, 나머지는 bg. 칸 하나씩 fillRect 하지 않고 화소 판에 한 번에 쓴다 */
  rebuild(revealed: (k: number) => boolean, color: (x: number, y: number) => string, bg = '#07080c'): void {
    const W = this.cv.width, H = this.cv.height, c = this.cx;
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    const img = c.getImageData(0, 0, W, H), buf = img.data;
    for (let k = 0; k < W * H; k++) {
      if (!revealed(k)) continue;
      const n = parseInt(color(k % W, (k / W) | 0).slice(1), 16), o = k * 4;
      buf[o] = (n >> 16) & 255; buf[o + 1] = (n >> 8) & 255; buf[o + 2] = n & 255; buf[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }

  /** 판의 (sx0, sy0) 부터 sw×sh 칸을 c 의 (0, 0)~(dw, dh) 에 늘려 그린다(칸 경계가 번지지 않게) */
  draw(c: CanvasRenderingContext2D, sx0: number, sy0: number, sw: number, sh: number, dw: number, dh: number): void {
    c.imageSmoothingEnabled = false;
    c.drawImage(this.cv, sx0, sy0, sw, sh, 0, 0, dw, dh);
  }
}

/** 둘레 창 — 가운데 칸 (cx, cy) 둘레를 칸당 scale 화소로. color(tx, ty) 가 null 이면 비워 둔다(안개) */
export function drawTileWindow(c: CanvasRenderingContext2D, w: number, h: number, scale: number, cx: number, cy: number,
  color: (tx: number, ty: number) => string | null): { x0: number; y0: number } {
  const cols = Math.floor(w / scale), rows = Math.floor(h / scale);
  const x0 = cx - Math.floor(cols / 2), y0 = cy - Math.floor(rows / 2);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const col = color(x0 + x, y0 + y);
    if (!col) continue;
    c.fillStyle = col; c.fillRect(x * scale, y * scale, scale, scale);
  }
  return { x0, y0 };
}

/** 표식 하나 — 칸 (tx, ty) 에 네모(크기 size) · 십자('+') · 점('o'). 창 밖이면 그리지 않는다 */
export function drawMapMark(c: CanvasRenderingContext2D, origin: { x0: number; y0: number }, scale: number, w: number, h: number,
  tx: number, ty: number, color: string, shape: 'box' | '+' | 'o' = 'box', size = scale + 2): void {
  const x = (tx - origin.x0) * scale, y = (ty - origin.y0) * scale;
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  c.fillStyle = color;
  if (shape === '+') { c.fillRect(x - 1, y - 3, 3, 7); c.fillRect(x - 3, y - 1, 7, 3); }
  else if (shape === 'o') { c.beginPath(); c.arc(x + scale / 2, y + scale / 2, size / 2, 0, Math.PI * 2); c.fill(); }
  else c.fillRect(x - (size - scale) / 2, y - (size - scale) / 2, size, size);
}
