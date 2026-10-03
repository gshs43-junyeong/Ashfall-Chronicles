/* ===== engine/render/lightoverlay.ts — 빛 판을 화면에 얹기: 어둠 한 겹 · 빛 색 한 겹 · 둥근 번짐 ===== */
/* 칸 하나 = 한 화소인 작은 판에 칸마다 값을 적고, 칸 크기(cell px)로 **부드럽게 늘려** 얹는다 — 칸 경계가 계단으로 보이지 않고
   빛이 번져 보인다. 어둠은 덮는 색의 투명도로(밝을수록 투명), 빛 색은 'lighter' 로 더한다(어둠 위에 칠해야 어둠에 묻히지 않는다). */

class GridImage {
  declare cv: HTMLCanvasElement; declare cx: CanvasRenderingContext2D; declare img: ImageData;
  constructor() { this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = 1; this.cx = this.cv.getContext('2d')!; this.img = this.cx.createImageData(1, 1); }
  size(w: number, h: number): Uint8ClampedArray {
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; this.cx = this.cv.getContext('2d')!; this.img = this.cx.createImageData(w, h); }
    return this.img.data;
  }
  put(c: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number): void {
    this.cx.putImageData(this.img, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(this.cv, dx, dy, dw, dh);
    c.imageSmoothingEnabled = false;
  }
}

export class LightOverlay {
  declare dark: GridImage; declare tint: GridImage; declare glows: Map<string, HTMLCanvasElement>;
  constructor() { this.dark = new GridImage(); this.tint = new GridImage(); this.glows = new Map(); }

  /** 어둠 한 겹 — 칸 (x0..x1, y0..y1) 의 밝기 level(x, y)(0~max)를 곡선 gamma 로 펴서, 그 만큼 덜 덮는다.
      floor — 가장 어두운 곳도 이만큼은 비친다(블록 실루엣이 읽히게) · rgb — 덮는 색(지하는 푸르게 · 지옥은 붉게) */
  drawDark(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, cell: number, camX: number, camY: number,
    level: (x: number, y: number) => number, max: number, rgb: [number, number, number] = [0, 0, 0], floor = 0.022, gamma = 0.72): void {
    const lw = x1 - x0 + 1, lh = y1 - y0 + 1, d = this.dark.size(lw, lh);
    let i = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++, i += 4) {
      const f = Math.pow(Math.max(floor, Math.min(1, level(x, y) / max)), gamma);
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255 * (1 - f);
    }
    this.dark.put(c, x0 * cell - camX, y0 * cell - camY, lw * cell, lh * cell);
  }

  /** 빛 색 한 겹 — 칸마다 0~1 rgb(없으면 null)를 늘려 더한다(그늘째 모은 색이라 벽 너머로 번지지 않는다) */
  drawTint(c: CanvasRenderingContext2D, x0: number, y0: number, lw: number, lh: number, cell: number, camX: number, camY: number,
    color: (x: number, y: number) => ArrayLike<number> | null): void {
    const d = this.tint.size(lw, lh);
    for (let y = 0, i = 0; y < lh; y++) for (let x = 0; x < lw; x++, i += 4) {
      const v = color(x0 + x, y0 + y);
      d[i] = v ? Math.min(255, v[0] * 255) : 0; d[i + 1] = v ? Math.min(255, v[1] * 255) : 0; d[i + 2] = v ? Math.min(255, v[2] * 255) : 0; d[i + 3] = 255;
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    this.tint.put(c, x0 * cell - camX, y0 * cell - camY, lw * cell, lh * cell);
    c.restore();
  }

  /** 둥근 번짐 하나 — 색 hex(#rrggbb) · 반지름 r 의 원을 (x, y) 가운데에 더한다(같은 색·크기는 한 번 구워 다시 쓴다) */
  glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string, alpha: number): void {
    const key = hex + r;
    let g = this.glows.get(key);
    if (!g) {
      g = document.createElement('canvas'); g.width = g.height = r * 2;
      const gc = g.getContext('2d')!, gr = gc.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, hex + '66'); gr.addColorStop(0.45, hex + '22'); gr.addColorStop(1, hex + '00');
      gc.fillStyle = gr; gc.fillRect(0, 0, r * 2, r * 2);
      this.glows.set(key, g);
    }
    const a = c.globalAlpha, op = c.globalCompositeOperation;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha;
    c.drawImage(g, x - r, y - r);
    c.globalAlpha = a; c.globalCompositeOperation = op;
  }
}
