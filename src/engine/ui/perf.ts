/* ===== engine/ui/perf.ts — 성능 판(F3): 프레임 시간 그래프 · 숫자 몇 개 ===== */
/* 느려졌다는 말은 숫자가 없으면 고칠 수 없다. 최근 120 프레임의 길이를 막대로 그리고(16.7ms 줄 = 60fps),
   게임이 넘긴 숫자(몹 수 · 입자 수 · 단계별 시간 …)를 아래에 적는다. 꺼 두면 아무 일도 안 한다. */

export class PerfPanel {
  declare on: boolean; declare ms: Float32Array; declare i: number; declare last: number; declare lines: string[];

  constructor() { this.on = false; this.ms = new Float32Array(120); this.i = 0; this.last = 0; this.lines = []; }
  toggle(): boolean { this.on = !this.on; return this.on; }

  /** 매 프레임 — 진짜 걸린 시간(초) */
  frame(rawDt: number): void { if (!this.on) return; this.ms[this.i] = rawDt * 1000; this.i = (this.i + 1) % this.ms.length; }
  /** 아래에 적을 줄들(매 프레임 새로) */
  info(lines: string[]): void { this.lines = lines; }

  /** 화면 왼쪽 위에 — 변환은 지운 채(화면 픽셀) 그린다 */
  draw(c: CanvasRenderingContext2D, scale = 1): void {
    if (!this.on) return;
    const n = this.ms.length, W = 240, H = 60, x0 = 8, y0 = 8;
    let sum = 0, worst = 0;
    for (let k = 0; k < n; k++) { sum += this.ms[k]; worst = Math.max(worst, this.ms[k]); }
    const avg = sum / n;
    c.save(); c.setTransform(scale, 0, 0, scale, 0, 0);
    c.fillStyle = 'rgba(0,0,0,.66)'; c.fillRect(x0, y0, W + 12, H + 30 + this.lines.length * 13);
    const yms = (v: number) => y0 + 6 + H - Math.min(H, v / 50 * H);
    for (let k = 0; k < n; k++) {
      const v = this.ms[(this.i + k) % n];
      c.fillStyle = v > 33.4 ? '#ff6a5a' : v > 17.5 ? '#ffd24a' : '#7fe07f';
      c.fillRect(x0 + 6 + k * 2, yms(v), 2, y0 + 6 + H - yms(v));
    }
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(x0 + 6, yms(16.7)); c.lineTo(x0 + 6 + W, yms(16.7)); c.stroke();
    c.font = '11px monospace'; c.fillStyle = '#e8f0ff'; c.textBaseline = 'top';
    c.fillText(`${avg > 0 ? Math.round(1000 / avg) : 0} fps · avg ${avg.toFixed(1)}ms · max ${worst.toFixed(1)}ms`, x0 + 6, y0 + H + 10);
    this.lines.forEach((l, k) => c.fillText(l, x0 + 6, y0 + H + 24 + k * 13));
    c.restore();
  }
}
