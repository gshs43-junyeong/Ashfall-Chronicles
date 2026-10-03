/* ===== engine/ui/panzoom.ts — 끌어서 옮기고 굴려(집어) 키우는 보기(지도 · 큰 그림) ===== */
/* 보기의 가운데(x, y — 내용 좌표)와 배율 zoom 을 든다. 휠은 커서 자리를 붙든 채 키우고, 끌면 옮기고,
   손가락 둘로 집으면 그 사이를 붙든 채 키운다(폰에서 지도를 볼 수 있게). 바뀔 때마다 change() 를 부른다. */

export interface PanZoomConfig {
  min?: number; max?: number;      // 배율 범위
  step?: number;                   // 휠 한 칸의 배율
  change(): void;
  /** 화면 크기(CSS px) — 커서 자리를 내용 좌표로 바꿀 때 */
  size(): { w: number; h: number };
}

export class PanZoom {
  declare x: number; declare y: number; declare zoom: number;
  declare cfg: Required<PanZoomConfig>;
  declare drag: { x: number; y: number; fx: number; fy: number } | null;
  declare pts: Map<number, { x: number; y: number }>;
  declare pinch: { d: number; z: number; wx: number; wy: number } | null;

  constructor(cfg: PanZoomConfig) {
    this.cfg = { min: 0.4, max: 16, step: 1.2, ...cfg };
    this.x = 0; this.y = 0; this.zoom = 1; this.drag = null; this.pts = new Map(); this.pinch = null;
  }

  /** 화면 자리(sx, sy — 요소 안 CSS px)의 내용 좌표 */
  toContent(sx: number, sy: number): { x: number; y: number } {
    const s = this.cfg.size();
    return { x: this.x + (sx - s.w / 2) / this.zoom, y: this.y + (sy - s.h / 2) / this.zoom };
  }
  /** 내용 좌표 (wx, wy) 를 화면 자리 (sx, sy) 에 붙든 채 배율을 z 로 */
  zoomAt(sx: number, sy: number, z: number): void {
    const s = this.cfg.size(), w = this.toContent(sx, sy);
    this.zoom = Math.max(this.cfg.min, Math.min(this.cfg.max, z));
    this.x = w.x - (sx - s.w / 2) / this.zoom; this.y = w.y - (sy - s.h / 2) / this.zoom;
  }
  set(x: number, y: number, zoom?: number): void { this.x = x; this.y = y; if (zoom) this.zoom = zoom; this.drag = null; this.pinch = null; }

  /** 요소에 휠 · 끌기 · 집기를 건다 */
  bind(el: HTMLElement): void {
    const rel = (e: { clientX: number; clientY: number }) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    el.addEventListener('wheel', e => {
      e.preventDefault();
      const p = rel(e);
      this.zoomAt(p.x, p.y, this.zoom * (e.deltaY < 0 ? this.cfg.step : 1 / this.cfg.step));
      this.cfg.change();
    }, { passive: false });
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      this.pts.set(e.pointerId, rel(e));
      if (this.pts.size === 1) this.drag = { x: e.clientX, y: e.clientY, fx: this.x, fy: this.y };
      else if (this.pts.size === 2) {
        const [a, b] = [...this.pts.values()], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, w = this.toContent(m.x, m.y);
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: this.zoom, wx: w.x, wy: w.y }; this.drag = null;
      }
    });
    el.addEventListener('pointermove', e => {
      if (!this.pts.has(e.pointerId)) return;
      this.pts.set(e.pointerId, rel(e));
      if (this.pinch && this.pts.size >= 2) {
        const [a, b] = [...this.pts.values()], s = this.cfg.size(), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.zoom = Math.max(this.cfg.min, Math.min(this.cfg.max, this.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.d));
        this.x = this.pinch.wx - (m.x - s.w / 2) / this.zoom; this.y = this.pinch.wy - (m.y - s.h / 2) / this.zoom;
        this.cfg.change();
      } else if (this.drag) {
        this.x = this.drag.fx - (e.clientX - this.drag.x) / this.zoom;
        this.y = this.drag.fy - (e.clientY - this.drag.y) / this.zoom;
        this.cfg.change();
      }
    });
    const up = (e: PointerEvent) => {
      this.pts.delete(e.pointerId);
      if (this.pts.size < 2) this.pinch = null;
      if (this.pts.size === 1) { const p = [...this.pts.values()][0], r = el.getBoundingClientRect(); this.drag = { x: p.x + r.left, y: p.y + r.top, fx: this.x, fy: this.y }; }
      if (!this.pts.size) this.drag = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
}
