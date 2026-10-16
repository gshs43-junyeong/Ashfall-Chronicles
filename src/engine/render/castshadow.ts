/* ===== engine/render/castshadow.ts — 해가 비추는 몸의 그림자 ===== */
/* 몸 그림을 빈 판에 한 번 그려 검게 칠한다(source-in). 그 실루엣으로 두 가지를 그린다:
   sweep — 화면 면에 드리우는 그늘(햇빛 방향으로 밀어 바닥에서 자른다 · 타일 그늘과 같은 결),
   draw  — 발끝 둘레의 짧은 접지 그림자(바닥에 눕힌다).
   방향은 DayCycle.sunDir 의 {x, y, k} 를 그대로 받는다 — 타일 그늘(castSunlight)과 같은 해를 봐야 몸과 땅의 그림자가 어긋나지 않는다. */

export interface CastShadowOpts {
  alpha?: number;    // 가장 짙을 때(해가 높고 구름이 없을 때)
  squash?: number;   // 위아래 눌림(0 = 납작한 선 · 1 = 서 있는 그대로)
  maxLean?: number;  // 해가 낮을 때 그림자가 몸 높이의 몇 배까지 눕는가
  blur?: number;     // 가장자리 흐림(px)
}

export interface SweepOpts {
  alpha?: number;    // 그늘 짙기 — 타일 그늘(castSunlight)과 같은 결로 맞춘다
  step?: number;     // 몇 px 마다 실루엣을 찍어 띠를 만드나
  maxLen?: number;   // 해가 아주 낮을 때 띠의 최대 길이(px)
  fadeFrom?: number; // 띠가 이 몫(0~1)부터 끝까지 옅어진다
  floor?: (sx: number) => number;   // 화면 x 의 바닥 높이(화면 y) — 주면 floorY 대신 칸마다 그 땅 윗면에서 자른다
  floorStep?: number;               // floor 를 몇 px 마다 재나(타일 폭)
  floorPhase?: number;              // 칸 경계가 놓인 화면 x(타일 격자에 맞추려면 -camX)
}

type Sun = { x: number; y: number; k: number } | null;
type DrawFn = (ctx: CanvasRenderingContext2D, ox: number, oy: number) => void;

export class CastShadow {
  declare buf: HTMLCanvasElement | null; declare bc: CanvasRenderingContext2D | null;
  declare sw: HTMLCanvasElement | null; declare sc: CanvasRenderingContext2D | null;
  constructor() { this.buf = null; this.bc = null; this.sw = null; this.sc = null; }

  /** 몸을 검게 뜬 판 — w × h 칸에 draw(ctx, 0, 0) 로 그린 것 */
  silhouette(w: number, h: number, draw: DrawFn): HTMLCanvasElement {
    const W = Math.ceil(w), H = Math.ceil(h);
    if (!this.buf) { this.buf = document.createElement('canvas'); this.bc = this.buf.getContext('2d'); }
    const b = this.buf, bc = this.bc!;
    if (b.width !== W || b.height !== H) { b.width = W; b.height = H; }
    bc.setTransform(1, 0, 0, 1, 0, 0); bc.clearRect(0, 0, W, H);
    bc.globalCompositeOperation = 'source-over'; draw(bc, 0, 0);
    bc.globalCompositeOperation = 'source-in'; bc.fillStyle = '#000'; bc.fillRect(0, 0, W, H);
    bc.globalCompositeOperation = 'source-over';
    return b;
  }

  /** 화면 면에 드리우는 그늘 — 실루엣을 햇빛 방향으로 밀어 띠를 만들고 바닥(floorY) 아래는 자른다.
      ★ 타일 그늘이 이 결(빛줄기 뒤 공기 칸이 어두워진다)이라, 몸만 땅에 눕히면 나무 그늘 옆에서 몸 그림자가 안 보였다(사용자 지적).
      해가 낮으면 길고 얕게, 한낮이면 곧장 땅으로 들어가 거의 사라진다 — 나무와 같다. (bx, by) 는 화면에서 판의 왼쪽 위 */
  sweep(c: CanvasRenderingContext2D, w: number, h: number, draw: DrawFn, bx: number, by: number, floorY: number, sun: Sun, o: SweepOpts = {}): void {
    if (!sun || sun.k <= 0.02 || typeof document === 'undefined') return;
    const dx = -sun.x, dy = Math.max(0.12, -sun.y), n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
    const W = Math.ceil(w), H = Math.ceil(h);
    const len = Math.min(o.maxLen ?? 220, (floorY - by) / uy);          // 머리 꼭대기가 바닥에 닿을 때까지
    if (len < 2) return;
    const b = this.silhouette(w, h, draw);
    const SW = Math.ceil(W + Math.abs(ux) * len) + 2, SH = Math.ceil(H + uy * len) + 2;
    if (!this.sw) { this.sw = document.createElement('canvas'); this.sc = this.sw.getContext('2d'); }
    const s = this.sw, sc = this.sc!;
    if (s.width < SW || s.height < SH) { s.width = Math.max(s.width, SW); s.height = Math.max(s.height, SH); }
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, s.width, s.height);
    const ox = ux < 0 ? -ux * len : 0, step = o.step ?? 2;
    for (let t = 0; t <= len; t += step) sc.drawImage(b, Math.round(ox + ux * t), Math.round(uy * t));   // 겹쳐도 같은 검정 — 짙기는 한 번에
    /* ★ 끝으로 갈수록 옅어진다 — 그대로 두면 띠 끝에 머리 모양이 둥글게 찍혀 '그림자 끝에 공'처럼 보였다(사용자 지적) */
    this.fadeAlong(sc, SW, SH, ox + W / 2, H / 2, ox + W / 2 + ux * (len + H * 0.5), H / 2 + uy * (len + H * 0.5), o.fadeFrom ?? 0.25);
    c.save();
    c.beginPath();
    if (o.floor) {                                                       // 땅이 오르내리면 칸마다 그 윗면까지만 — 턱 너머 흙에 그늘이 박히지 않게
      const st = o.floorStep ?? 16, xa = bx - ox - 2, xb = bx - ox + SW + 2;
      const ph = o.floorPhase ?? 0;
      for (let x = Math.floor((xa - ph) / st) * st + ph; x < xb; x += st) c.rect(x, by - 2, st, Math.max(0, o.floor(x + st / 2) - by + 2));
    } else c.rect(bx - ox - 2, by - 2, SW + 4, Math.max(0, floorY - by + 2));   // 바닥 위만
    c.clip();
    c.globalAlpha *= (o.alpha ?? 0.3) * sun.k;
    c.drawImage(s, 0, 0, SW, SH, bx - ox, by, SW, SH);
    c.restore();
  }

  /** 그린 판을 (x0,y0) → (x1,y1) 쪽으로 옅게 — from 몫까지는 그대로, 끝에서 0 */
  fadeAlong(c: CanvasRenderingContext2D, w: number, h: number, x0: number, y0: number, x1: number, y1: number, from: number): void {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(Math.max(0, Math.min(0.95, from)), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(0, 0, w, h); c.restore();
  }

  /** 발끝 접지 그림자 — 발끝(footX, footY)을 축으로 해 반대쪽으로 기울이며 위아래로 눌러 바닥에 눕힌다 */
  draw(c: CanvasRenderingContext2D, w: number, h: number, draw: DrawFn, footX: number, footY: number, sun: Sun, o: CastShadowOpts = {}): void {
    if (!sun || sun.k <= 0.02 || typeof document === 'undefined') return;
    const W = Math.ceil(w), H = Math.ceil(h), b = this.silhouette(w, h, draw);
    /* 해 반대쪽으로 — 해가 오른쪽(x>0)이면 그림자는 왼쪽. 해가 낮을수록(|y| 작음) 길게 눕는다 */
    const lean = Math.max(-(o.maxLean ?? 1.4), Math.min(o.maxLean ?? 1.4, -sun.x / Math.max(0.25, -sun.y)));
    const sq = o.squash ?? 0.32;
    c.save();
    c.globalAlpha *= (o.alpha ?? 0.34) * sun.k;
    if (o.blur) c.filter = `blur(${o.blur}px)`;
    /* 발끝(그림 아랫변 가운데)을 축으로: 머리 쪽이 lean·몸 높이만큼 옆으로 · 높이는 sq 배로 눌린다 */
    c.setTransform(c.getTransform().multiply(new DOMMatrix([1, 0, -lean, sq, footX + lean * H, footY - sq * H])));
    /* 머리 쪽(판 위)일수록 옅게 — 발끝에서 진하고 끝은 흐려진다 */
    this.fadeAlong(b.getContext('2d')!, W, H, 0, H, 0, 0, 0.2);
    c.drawImage(b, 0, 0, W, H, -W / 2, 0, W, H);
    c.restore();
  }
}
