/* ===== engine/fx/particles.ts — 입자: 움직임 · 땅에 닿기 · 묶음 갱신 ===== */
/* 그리는 법은 게임이 정한다(색 · 모양 · 빛). 엔진은 움직임만 — 중력 · 끌림 · 회전 · 수명, 그리고 고른 입자는 칸에 부딪혀
   튀고 미끄러지다 바닥에 눕는다(파편이 땅을 뚫고 지나가던 것). 부딪힘은 칸 좌표 판정 하나(solid)만 받는다. */

export interface ParticleWorld {
  /** 그 픽셀 자리가 막혔나 */
  solidAt(px: number, py: number): boolean;
}

export class Particle {
  declare x: number; declare y: number; declare vx: number; declare vy: number;
  declare life: number; declare max: number;
  declare g: number; declare drag: number;
  declare rot: number; declare spin: number;
  declare bounce: number;          // 0 이면 칸을 무시(연기 · 불티) · 0~1 튀는 정도
  declare rest: boolean;           // 바닥에 누웠다

  constructor(x: number, y: number, vx: number, vy: number, life: number) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.max = life;
    this.g = 1; this.drag = 0.96; this.rot = 0; this.spin = 0; this.bounce = 0; this.rest = false;
  }

  /** 0~1 — 남은 수명 비율(사라지며 흐려지기 · 줄어들기에) */
  get k(): number { return this.max > 0 ? Math.max(0, this.life / this.max) : 0; }

  /** grav: 중력(px/s², g 배수가 곱해진다) · world 를 주면 bounce > 0 인 입자는 칸에 부딪힌다. 살아 있으면 true. */
  step(dt: number, grav: number, world?: ParticleWorld | null): boolean {
    this.life -= dt;
    if (this.rest) return this.life > 0;
    this.vy += grav * this.g * dt;
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (world && this.bounce > 0) {
      if (world.solidAt(nx, this.y)) { this.vx = -this.vx * this.bounce; this.spin *= -0.5; }
      else this.x = nx;
      if (world.solidAt(this.x, ny)) {
        if (this.vy > 0) {
          // 바닥 — 튀고, 힘이 다하면 눕는다(구르며 멈춘다)
          this.vy = -this.vy * this.bounce; this.vx *= 0.6; this.spin *= 0.5;
          if (Math.abs(this.vy) < 40) { this.vy = 0; this.vx = 0; this.spin = 0; this.rest = true; }
        } else this.vy = 0;
      } else this.y = ny;
    } else { this.x = nx; this.y = ny; }
    this.vx *= this.drag;
    this.rot += this.spin * dt;
    return this.life > 0;
  }
}

/** 입자 묶음을 한 번에 — 죽은 것은 뒤엣것으로 메워 지운다(splice 는 수백 개에서 매 프레임 배열을 민다). cap 을 넘으면 오래된 것부터 버린다. */
export function stepParticles<P extends { update(dt: number): boolean }>(list: P[], dt: number, cap: number): void {
  let n = list.length;
  for (let i = 0; i < n;) {
    if (list[i].update(dt)) i++;
    else { list[i] = list[n - 1]; n--; }
  }
  list.length = n;
  if (n > cap) list.splice(0, n - cap);
}

/** 사방으로 흩어지는 속도 하나 — 각도 a 둘레 spread(라디안) 안, 빠르기 lo~hi */
export function scatter(rand: () => number, a: number, spread: number, lo: number, hi: number): { vx: number; vy: number } {
  const t = a + (rand() - 0.5) * spread, s = lo + rand() * (hi - lo);
  return { vx: Math.cos(t) * s, vy: Math.sin(t) * s };
}
