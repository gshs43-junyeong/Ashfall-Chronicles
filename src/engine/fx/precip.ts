/* ===== engine/fx/precip.ts — 비 · 눈: 화면을 덮는 낙하 입자 ===== */
/* 빗줄기는 화면 좌표에 살지만 세계에 붙어 있다 — 카메라가 움직인 만큼(camDx, camDy) 반대로 민다. 화면에 붙여 두면 떨어지거나
   뛸 때 비가 갑자기 빨라졌다 느려졌다 했다. 켜고 끄기는 **위에서 새로 날 때만**(on) 바꿔 비가 위에서부터 들어오고 빠져나간다.
   open(x, y) 를 주면 하늘이 트인 자리에서만 새로 나고(굴 · 집 안에는 안 내린다), blocked(x, y) 에 닿으면 거기서 멈추고 hit 를 부른다(물 튐). */

export type PrecipMode = 'rain' | 'snow';

export interface PrecipDrop { x: number; y: number; k: number; on: boolean; len: number; spd: number; r: number; drift: number; sway: number }

export interface PrecipHooks {
  open?(x: number, y: number): boolean;       // 화면 좌표 (x, y) 위가 하늘에 트였나
  blocked?(x: number, y: number): boolean;    // 그 자리가 막혔나(땅 · 지붕)
  hit?(x: number, y: number, mode: PrecipMode): void;
}

export class Precip {
  declare mode: PrecipMode; declare drops: PrecipDrop[] | null;

  constructor() { this.mode = 'rain'; this.drops = null; }

  /** 다 걷혔나(세기 0 이고 켜진 방울이 하나도 없다) */
  get idle(): boolean { return !this.drops || !this.drops.some(d => d.on); }

  /** 비 ↔ 눈이 바뀌면 처음부터 다시 깐다 */
  setMode(m: PrecipMode): void { if (m !== this.mode) { this.mode = m; this.drops = null; } }

  /** amount 0~1 — 켜진 방울 비율. W·H 는 화면(그리는 좌표계) 크기 */
  /** wind — 가로 바람(px/s, engine fx/wind) — 눈은 다 받고 비는 조금 받는다 */
  update(dt: number, amount: number, camDx: number, camDy: number, W: number, H: number, hooks: PrecipHooks = {}, rand: () => number = Math.random, wind = 0): void {
    if (amount <= 0 && this.idle) { this.drops = null; return; }
    if (Math.abs(camDx) > W || Math.abs(camDy) > H) camDx = camDy = 0;       // 순간이동 · 불러오기
    const snow = this.mode === 'snow';
    if (!this.drops) {
      this.drops = [];
      const n = snow ? 110 : 160;
      for (let i = 0; i < n; i++) this.drops.push({
        x: rand() * W, y: rand() * H, k: i / n, on: false,
        len: 10 + rand() * 14, spd: snow ? 40 + rand() * 50 : 480 + rand() * 260,
        r: 1.5 + rand() * 2, drift: rand() * Math.PI * 2, sway: 20 + rand() * 30,
      });
    }
    const top = (d: PrecipDrop) => {
      d.y -= H + 40; d.x = rand() * W;
      d.on = d.k < amount && (!hooks.open || hooks.open(d.x, d.y));
    };
    for (const d of this.drops) {
      if (snow) { d.y += d.spd * dt - camDy; d.drift += dt * 1.4; d.x += (Math.sin(d.drift) * d.sway + wind) * dt - camDx; }
      else { d.y += d.spd * dt - camDy; d.x += (wind * 0.5 - d.spd * 0.15) * dt - camDx; }
      if (d.on && hooks.blocked && d.y > 0 && hooks.blocked(d.x, d.y + (snow ? d.r : d.len))) {
        if (hooks.hit) hooks.hit(d.x, d.y + (snow ? d.r : d.len), this.mode);
        d.y = H + 1;                               // 아래 처리에서 위로 돌려보낸다
      }
      if (d.y > H) top(d);
      else if (d.y < -40) d.y += H + 40;
      if (d.x < -20) d.x += W + 40; else if (d.x > W + 20) d.x -= W + 40;
    }
  }

  /** 그리기 — 비는 기울어진 줄 한 묶음(한 번에 stroke), 눈은 동그란 점 */
  /** slant — 빗줄기가 한 줄에서 옆으로 기우는 정도(px, 바람이 세면 더 눕는다) */
  draw(c: CanvasRenderingContext2D, color = this.mode === 'snow' ? '#f0f6ff' : '#bcd0e0', alpha = this.mode === 'snow' ? 0.85 : 0.55, slant = -5): void {
    if (!this.drops) return;
    c.globalAlpha = alpha;
    if (this.mode === 'snow') {
      c.fillStyle = color;
      for (const d of this.drops) if (d.on) { c.beginPath(); c.arc(d.x, d.y, d.r, 0, Math.PI * 2); c.fill(); }
    } else {
      c.strokeStyle = color; c.lineWidth = 1.4;
      c.beginPath();
      for (const d of this.drops) if (d.on) { c.moveTo(d.x, d.y); c.lineTo(d.x + slant, d.y + d.len); }
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}
