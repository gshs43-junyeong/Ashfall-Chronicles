/* ===== engine/fx/vfx.ts — 스킬 연출 도형: 칼선 · 충격파 · 섬광 · 불티 줄기 · 마법진 · 얼음 조각 · 땅 갈라짐 · 빛기둥 · 연기 · 빛 알갱이 · 조준 ===== */
/* 입자(점)만으로는 "무엇이 일어났는가"가 안 읽힌다 — 베었으면 칼선, 내리쳤으면 갈라진 땅, 불렀으면 마법진이 보여야 손맛이 난다.
   도형마다 수명 동안 모양이 변한다(칼선은 머리가 휘둘러 나가고 꼬리가 따라 사라진다 · 충격파는 빨리 벌어지다 느려진다).
   ★ 빛나는 것은 더하기('lighter')로 그리되 오래 남기지 않는다 — 진하게 오래 덮으면 그 밑의 적이 안 보인다(착탄 섬광 0.2 상한과 같은 이유).
   연기만 보통 섞기다(빛이 아니라 가리는 것). 시간은 dt 로, 좌표는 세계 좌표로 들고 그릴 때 카메라를 뺀다. */

type Pt = [number, number];
interface Base { t: number; max: number; c: string; art?: string }
interface Slash extends Base { k: 'slash'; x: number; y: number; r: number; a0: number; a1: number; w: number }
interface Shock extends Base { k: 'shock'; x: number; y: number; r: number; w: number; sy: number }
interface Flare extends Base { k: 'flare'; x: number; y: number; s: number; rot: number }
interface Spark extends Base { k: 'spark'; x: number; y: number; vx: number; vy: number; g: number; len: number }
interface Sigil extends Base { k: 'sigil'; x: number; y: number; r: number; n: number; spin: number; sy: number }
interface Shard extends Base { k: 'shard'; x: number; y: number; vx: number; vy: number; a: number; va: number; s: number }
interface Crack extends Base { k: 'crack'; pts: Pt[] }
interface Column extends Base { k: 'column'; x: number; y: number; w: number; h: number }
interface Puff extends Base { k: 'puff'; x: number; y: number; r: number; vx: number; vy: number }
interface Mote extends Base { k: 'mote'; x: number; y: number; vx: number; vy: number; s: number; ph: number }
interface Swipe extends Base { k: 'swipe'; x: number; y: number; r: number; ang: number; side: number }
interface Mark extends Base { k: 'mark'; x: number; y: number; w: number; h: number; ang: number }
interface Orbit extends Base { k: 'orbit'; at: () => Pt | null; r: number; ph: number; sp: number; s: number; tilt: number }
interface Reticle extends Base { k: 'reticle'; at: () => Pt | null; r: number }
interface Beam extends Base { k: 'beam'; x0: number; y0: number; x1: number; y1: number; w: number }
type Fx = Slash | Shock | Flare | Spark | Sigil | Shard | Crack | Column | Puff | Mote | Swipe | Mark | Orbit | Reticle | Beam;

/** 결 그림 — 이름('slash' · 'shock' · 'flare' · 'sigil' · 'column' · 'beam' · 'puff' · 'spark' · 'shard' · 'crack' · 'mote')과 색으로 물들인 그림 한 장(속불까지 얹은 것).
    없으면(아직 안 읽힘 · 게임이 안 걸었음) null → 도형으로 그린다. 그림은 가운데가 원점, 원 그림은 반지름 = 폭/2.
    도형마다 끝 인자 art 로 갈래 그림('sigil_frost' · 'impact' …)을 고를 수 있고, 그 그림이 없으면 기본 이름으로 물러선다 */
export type VfxArt = (name: string, c: string) => CanvasImageSource | null;

const TAU = Math.PI * 2;
const easeOut = (k: number) => 1 - (1 - k) * (1 - k);

export class Vfx {
  declare list: Fx[]; declare density: number; declare rand: () => number; declare cap: number; declare art: VfxArt | null;
  /** density — 불티 · 조각 수 배율(화질 설정) · cap — 한꺼번에 남는 도형 상한 */
  constructor(density = 1, cap = 600, rand: () => number = Math.random) { this.list = []; this.density = density; this.cap = cap; this.rand = rand; this.art = null; }

  private add(f: Fx): void { if (this.list.length < this.cap) this.list.push(f); }
  private n(k: number): number { return Math.max(1, Math.round(k * this.density)); }

  /** 칼선 — 각 a0 에서 a1 로 휘둘러 나가는 초승달(반지름 r · 굵기 w). 머리가 수명의 4할에 끝까지 가고 꼬리가 따라 지운다 */
  slash(x: number, y: number, r: number, a0: number, a1: number, c: string, life = 0.26, w = 14, art?: string): void {
    this.add({ k: 'slash', x, y, r, a0, a1, c, w, t: life, max: life, art });
  }
  /** 충격파 — 0 에서 r 로 빨리 벌어지다 느려지는 고리, 두께 w 가 얇아지며 사라진다(sy < 1 이면 바닥에 눕힌 타원) */
  shock(x: number, y: number, r: number, c: string, life = 0.4, w = 10, sy = 1, art?: string): void {
    this.add({ k: 'shock', x, y, r, c, w, sy, t: life, max: life, art });
  }
  /** 섬광 — 둥근 빛 + 네 갈래 빛살 */
  flare(x: number, y: number, s: number, c: string, life = 0.22, art?: string): void {
    this.add({ k: 'flare', x, y, s, c, rot: this.rand() * (art ? TAU : 0.6), t: life, max: life, art });
  }
  /** 불티 줄기 — 속도 방향으로 늘어진 선. ang 쪽으로 spread 폭 안에서 n 개 */
  sparks(x: number, y: number, n: number, c: string, speed = 420, ang = 0, spread = TAU, life = 0.35, g = 600): void {
    for (let i = 0, m = this.n(n); i < m; i++) {
      const a = ang + (this.rand() - 0.5) * spread, v = speed * (0.45 + this.rand() * 0.75);
      const l = life * (0.6 + this.rand() * 0.6);
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g, len: 0.035, c, t: l, max: l });
    }
  }
  /** 마법진 — 겹 원 + n 각 별 + 눈금. 튀어나오듯 커졌다가 돌며 사라진다 */
  sigil(x: number, y: number, r: number, c: string, life = 0.7, n = 6, spin = 1.2, sy = 1, art?: string): void {
    this.add({ k: 'sigil', x, y, r, c, n, spin, sy, t: life, max: life, art });
  }
  /** 얼음 · 수정 조각 — 돌며 바깥으로 */
  shards(x: number, y: number, n: number, c: string, speed = 360, life = 0.5, s = 7): void {
    for (let i = 0, m = this.n(n); i < m; i++) {
      const a = (i / m) * TAU + this.rand() * 0.4, v = speed * (0.6 + this.rand() * 0.6);
      this.add({ k: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, a: a, va: (this.rand() - 0.5) * 14, s: s * (0.7 + this.rand() * 0.6), c, t: life, max: life });
    }
  }
  /** 땅 갈라짐 — (x, y) 에서 dir 쪽으로 len 만큼 지그재그 금(바닥을 따라). 빛나다 식는다 */
  crack(x: number, y: number, dir: number, len: number, c: string, life = 0.7): void {
    const pts: Pt[] = [[x, y]];
    let px = x, py = y;
    for (let d = 0; d < len;) {
      const st = 10 + this.rand() * 14; d += st;
      px += dir * st; py = y + (this.rand() - 0.5) * 7;
      pts.push([px, py]);
    }
    this.add({ k: 'crack', pts, c, t: life, max: life });
  }
  /** 빛기둥 — 바닥 (x, y) 에서 위로 h, 폭 w */
  column(x: number, y: number, w: number, h: number, c: string, life = 0.6): void {
    this.add({ k: 'column', x, y, w, h, c, t: life, max: life });
  }
  /** 빛 알갱이 — 둘레 spread 안에서 rise px/s 로 떠오르며 반짝인다(치유 · 축복 · 별가루) */
  motes(x: number, y: number, n: number, c: string, spread = 24, rise = 70, life = 0.9, s = 7): void {
    for (let i = 0, m = this.n(n); i < m; i++) {
      const l = life * (0.6 + this.rand() * 0.6);
      this.add({ k: 'mote', x: x + (this.rand() - 0.5) * 2 * spread, y: y + (this.rand() - 0.5) * spread * 0.8, vx: (this.rand() - 0.5) * 30,
        vy: -rise * (0.5 + this.rand() * 0.8), s: s * (0.6 + this.rand() * 0.7), ph: this.rand() * TAU, c, t: l, max: l });
    }
  }
  /** 연기 덩이 — 부풀며 옅어진다(보통 섞기) */
  puffs(x: number, y: number, n: number, r: number, c: string, life = 1.1, spread = 40): void {
    for (let i = 0, m = this.n(n); i < m; i++) {
      const a = this.rand() * TAU, d = this.rand() * spread, l = life * (0.7 + this.rand() * 0.5);
      this.add({ k: 'puff', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, r: r * (0.6 + this.rand() * 0.6),
        vx: Math.cos(a) * 40, vy: -20 - this.rand() * 30, c, t: l, max: l });
    }
  }
  /** 칼 자국 — ang 쪽을 가운데로 펼친 초승달이 side(±1) 방향으로 휘둘러 나간다(앞 3할에 다 드러나고 옅어진다). art 로 자국 갈래를 고른다 */
  swipe(x: number, y: number, r: number, ang: number, side: number, c: string, life = 0.2, art?: string): void {
    this.add({ k: 'swipe', x, y, r, ang, side: side < 0 ? -1 : 1, c, t: life, max: life, art });
  }
  /** 자국 한 장 — ang 으로 돌린 w×h 그림이 가로로 툭 벌어졌다(베임 · 렌즈 빛살) 옅어진다 */
  mark(x: number, y: number, w: number, h: number, ang: number, c: string, life = 0.25, art?: string): void {
    this.add({ k: 'mark', x, y, w, h, ang, c, t: life, max: life, art });
  }
  /** 모여드는 불티 — 반지름 r 둘레에서 가운데로 빨려 든다(시전 · 기 모으기) */
  converge(x: number, y: number, r: number, n: number, c: string, life = 0.3): void {
    for (let i = 0, m = this.n(n); i < m; i++) {
      const a = this.rand() * TAU, rr = r * (0.7 + this.rand() * 0.5), l = life * (0.7 + this.rand() * 0.4), v = rr / l;
      this.add({ k: 'spark', x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, vx: -Math.cos(a) * v, vy: -Math.sin(a) * v, g: 0, len: 0.05, c, t: l, max: l });
    }
  }
  /** 몸을 도는 빛 — at() 둘레를 기울어진 고리(tilt — 세로 납작함)로 n 개가 돈다. 뒤쪽 반 바퀴는 옅게 */
  orbit(at: () => Pt | null, r: number, n: number, c: string, life = 1.2, s = 7, sp = 5, tilt = 0.35): void {
    for (let i = 0; i < n; i++) this.add({ k: 'orbit', at, r: r * (0.85 + this.rand() * 0.3), ph: i / n * TAU, sp: sp * (0.9 + this.rand() * 0.2), s, tilt, c, t: life, max: life });
  }
  /** 조준 — 네 모서리 괄호가 과녁(at() — 사라지면 null)으로 조여 들며 돈다 */
  reticle(at: () => Pt | null, r: number, c: string, life = 0.8): void { this.add({ k: 'reticle', at, r, c, t: life, max: life }); }
  /** 빛줄기 — 두 점을 잇는 굵은 빛(관통 화살 · 순간이동 자국) */
  beam(x0: number, y0: number, x1: number, y1: number, c: string, life = 0.25, w = 8, art?: string): void {
    this.add({ k: 'beam', x0, y0, x1, y1, c, w, t: life, max: life, art });
  }

  update(dt: number): void {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const f = L[i];
      f.t -= dt;
      if (f.t <= 0) { L.splice(i, 1); continue; }
      if (f.k === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += f.g * dt; f.vx *= 1 - 2.2 * dt; }
      else if (f.k === 'shard') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 520 * dt; f.vx *= 1 - 2.5 * dt; f.a += f.va * dt; }
      else if (f.k === 'puff') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 1 - 1.8 * dt; }
      else if (f.k === 'mote') { f.x += f.vx * dt + Math.sin(f.ph + f.t * 9) * 12 * dt; f.y += f.vy * dt; f.vy *= 1 - 0.9 * dt; }
    }
  }
  clear(): void { this.list.length = 0; }

  draw(c: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (!this.list.length) return;
    c.save();
    /* 연기는 먼저 · 보통 섞기 */
    for (const f of this.list) {
      if (f.k !== 'puff') continue;
      const k = f.t / f.max, r = f.r * (1.6 - k * 0.6), x = f.x - camX, y = f.y - camY;
      const im = this.art && this.art('puff', f.c);
      if (im) {                                    // 울퉁불퉁한 구름 — 덩이마다 돌려 같은 모양이 안 겹쳐 보이게
        c.globalAlpha = 0.7 * Math.min(1, k * 1.6);
        c.save(); c.translate(x, y); c.rotate(f.vx * 0.05 + k); c.drawImage(im, -r * 1.3, -r * 1.3, r * 2.6, r * 2.6); c.restore();
        continue;
      }
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, f.c); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.55 * Math.min(1, k * 1.6); c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const f of this.list) {
      const k = f.t / f.max, p = 1 - k;
      if (this.art && this.drawArt(c, f, k, p, camX, camY)) continue;
      switch (f.k) {
        case 'slash': {
          const x = f.x - camX, y = f.y - camY;
          const head = f.a0 + (f.a1 - f.a0) * Math.min(1, p / 0.4), tail = f.a0 + (f.a1 - f.a0) * Math.max(0, (p - 0.25) / 0.75);
          if (Math.abs(head - tail) < 0.01) break;
          const steps = Math.max(6, Math.ceil(Math.abs(head - tail) * 10));
          for (const [ws, col, al] of [[1.6, f.c, 0.28], [1, f.c, 0.75], [0.35, '#ffffff', 0.9]] as [number, string, number][]) {
            c.globalAlpha = al * Math.min(1, k * 2.2); c.strokeStyle = col;
            for (let i = 0; i < steps; i++) {      // 꼬리 쪽은 가늘게
              const u0 = i / steps, u1 = (i + 1) / steps;
              c.lineWidth = Math.max(0.5, f.w * ws * (0.15 + 0.85 * u1));
              c.beginPath(); c.arc(x, y, f.r, tail + (head - tail) * u0, tail + (head - tail) * u1, f.a1 < f.a0); c.stroke();
            }
          }
          break;
        }
        case 'shock': {
          const r = f.r * easeOut(Math.min(1, p * 1.35)), x = f.x - camX, y = f.y - camY;
          for (const [lw, col, al] of [[f.w * k * 2.2, f.c, 0.25], [Math.max(1, f.w * k), f.c, 0.85], [Math.max(0.5, f.w * k * 0.3), '#ffffff', 0.7]] as [number, string, number][]) {
            c.globalAlpha = al * k; c.strokeStyle = col; c.lineWidth = lw;
            c.beginPath(); c.ellipse(x, y, r, r * f.sy, 0, 0, TAU); c.stroke();
          }
          break;
        }
        case 'flare': {
          const x = f.x - camX, y = f.y - camY, s = f.s * (0.6 + 0.4 * easeOut(Math.min(1, p * 3)));
          const g = c.createRadialGradient(x, y, 0, x, y, s);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, f.c); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = 0.85 * k; c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
          c.strokeStyle = f.c; c.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const a = f.rot + i * Math.PI / 2 + p * 0.8, l = s * (i % 2 ? 1.1 : 1.6);
            c.globalAlpha = 0.9 * k; c.beginPath(); c.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
          }
          break;
        }
        case 'spark': {
          c.globalAlpha = Math.min(1, k * 1.5); c.strokeStyle = f.c; c.lineWidth = 1.8;
          const x = f.x - camX, y = f.y - camY;
          c.beginPath(); c.moveTo(x - f.vx * f.len, y - f.vy * f.len); c.lineTo(x, y); c.stroke();
          break;
        }
        case 'sigil': {
          const x = f.x - camX, y = f.y - camY, s = f.r * (p < 0.15 ? easeOut(p / 0.15) * 1.08 : 1.08 - 0.08 * Math.min(1, (p - 0.15) * 4));
          const rot = p * f.spin * TAU * 0.25;
          c.globalAlpha = Math.min(1, k * 2) * 0.9; c.strokeStyle = f.c;
          c.save(); c.translate(x, y); c.scale(1, f.sy);
          c.lineWidth = 2; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.stroke();
          c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, s * 0.78, 0, TAU); c.stroke();
          c.rotate(rot);
          c.lineWidth = 1.6; c.beginPath();
          for (let i = 0; i <= f.n; i++) {           // 한 칸 건너 잇는 별
            const a = (i * 2 % f.n) / f.n * TAU - Math.PI / 2, px = Math.cos(a) * s * 0.78, py = Math.sin(a) * s * 0.78;
            if (i) c.lineTo(px, py); else c.moveTo(px, py);
          }
          c.stroke();
          c.rotate(-rot * 2);
          for (let i = 0; i < f.n * 3; i++) {        // 바깥 눈금(글자 자리)
            const a = i / (f.n * 3) * TAU;
            c.beginPath(); c.moveTo(Math.cos(a) * s * 0.84, Math.sin(a) * s * 0.84); c.lineTo(Math.cos(a) * s * (i % 3 ? 0.92 : 0.98), Math.sin(a) * s * (i % 3 ? 0.92 : 0.98)); c.stroke();
          }
          c.restore();
          break;
        }
        case 'shard': {
          const x = f.x - camX, y = f.y - camY;
          c.globalAlpha = Math.min(1, k * 1.8); c.fillStyle = f.c;
          c.save(); c.translate(x, y); c.rotate(f.a);
          c.beginPath(); c.moveTo(f.s * 1.4, 0); c.lineTo(-f.s * 0.6, f.s * 0.45); c.lineTo(-f.s * 0.6, -f.s * 0.45); c.closePath(); c.fill();
          c.globalAlpha *= 0.8; c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(f.s * 0.9, 0); c.lineTo(-f.s * 0.2, f.s * 0.15); c.lineTo(-f.s * 0.2, -f.s * 0.15); c.closePath(); c.fill();
          c.restore();
          break;
        }
        case 'crack': {
          const n = Math.max(2, Math.ceil(f.pts.length * Math.min(1, p * 5)));   // 처음 2할 동안 금이 뻗어 나간다
          for (const [lw, col, al] of [[6, f.c, 0.3], [2.2, f.c, 0.9], [0.9, '#fff4d8', 0.8]] as [number, string, number][]) {
            c.globalAlpha = al * k; c.strokeStyle = col; c.lineWidth = lw;
            c.beginPath();
            for (let i = 0; i < n; i++) { const q = f.pts[i]; if (i) c.lineTo(q[0] - camX, q[1] - camY); else c.moveTo(q[0] - camX, q[1] - camY); }
            c.stroke();
          }
          break;
        }
        case 'column': {
          const x = f.x - camX, y = f.y - camY, w = f.w * (0.5 + 0.5 * easeOut(Math.min(1, p * 4))) * (0.6 + 0.4 * k);
          const g = c.createLinearGradient(0, y - f.h, 0, y);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, f.c); g.addColorStop(1, '#ffffff');
          c.globalAlpha = 0.6 * k; c.fillStyle = g;
          c.fillRect(x - w / 2, y - f.h, w, f.h);
          c.globalAlpha = 0.8 * k; c.fillRect(x - w / 6, y - f.h * 0.9, w / 3, f.h * 0.9);
          break;
        }
        case 'mote': {
          c.globalAlpha = Math.min(1, k * 2) * (0.6 + 0.4 * Math.sin(f.ph + f.t * 20)); c.fillStyle = f.c;
          c.beginPath(); c.arc(f.x - camX, f.y - camY, f.s * 0.35, 0, TAU); c.fill();
          break;
        }
        case 'swipe': {
          const x = f.x - camX, y = f.y - camY, h = Math.min(1, p / 0.3), a0 = f.ang - f.side * 1.3, a1 = a0 + f.side * 2.6 * h;
          c.globalAlpha = Math.min(1, k * 2) * 0.8; c.strokeStyle = f.c; c.lineWidth = 4;
          c.beginPath(); c.arc(x, y, f.r, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
          break;
        }
        case 'mark': {
          c.globalAlpha = Math.min(1, k * 2); c.strokeStyle = f.c; c.lineWidth = Math.max(1, f.h * 0.25);
          const dx = Math.cos(f.ang) * f.w / 2, dy = Math.sin(f.ang) * f.w / 2, x = f.x - camX, y = f.y - camY;
          c.beginPath(); c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); c.stroke();
          break;
        }
        case 'orbit': {
          const at = f.at(); if (!at) break;
          const a = f.ph + p * f.max * f.sp, x = at[0] + Math.cos(a) * f.r - camX, y = at[1] + Math.sin(a) * f.r * f.tilt - camY;
          c.globalAlpha = Math.min(1, k * 3, p * 6) * (Math.sin(a) > 0 ? 1 : 0.4); c.fillStyle = f.c;
          c.beginPath(); c.arc(x, y, f.s * 0.35, 0, TAU); c.fill();
          break;
        }
        case 'reticle': {
          const at = f.at(); if (!at) break;
          const x = at[0] - camX, y = at[1] - camY, r = f.r * (1 + 0.8 * (1 - easeOut(Math.min(1, p * 3)))), rot = p * 2.2;
          c.globalAlpha = Math.min(1, k * 2.5); c.strokeStyle = f.c; c.lineWidth = 2.2;
          for (let i = 0; i < 4; i++) {
            const a = rot + i * Math.PI / 2;
            c.beginPath(); c.arc(x, y, r, a - 0.35, a + 0.35); c.stroke();
            c.beginPath(); c.moveTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6)); c.lineTo(x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6)); c.stroke();
          }
          break;
        }
        case 'beam': {
          for (const [lw, col, al] of [[f.w * 2.4, f.c, 0.22], [f.w, f.c, 0.7], [f.w * 0.3, '#ffffff', 0.9]] as [number, string, number][]) {
            c.globalAlpha = al * k; c.strokeStyle = col; c.lineWidth = lw * (0.4 + 0.6 * k);
            c.beginPath(); c.moveTo(f.x0 - camX, f.y0 - camY); c.lineTo(f.x1 - camX, f.y1 - camY); c.stroke();
          }
          break;
        }
      }
    }
    c.restore();
  }

  /** 결 그림으로 그린다 — 그렸으면 true(도형은 건너뛴다). 모양 · 타이밍은 도형과 같은 식을 쓴다 */
  private drawArt(c: CanvasRenderingContext2D, f: Fx, k: number, p: number, camX: number, camY: number): boolean {
    const A = this.art!, art = (base: string, col: string) => (f.art && A(f.art, col)) || A(base, col);
    switch (f.k) {
      case 'slash': {
        const im = art('slash', f.c); if (!im) return false;
        const x = f.x - camX, y = f.y - camY;
        const head = f.a0 + (f.a1 - f.a0) * Math.min(1, p / 0.4), tail = f.a0 + (f.a1 - f.a0) * Math.max(0, (p - 0.25) / 0.75);
        if (Math.abs(head - tail) < 0.01) return true;
        const R = (f.r + f.w * 0.45) / 0.975, ccw = f.a1 < f.a0, n = Math.max(4, Math.min(14, Math.ceil(Math.abs(head - tail) * 4)));
        for (let i = 0; i < n; i++) {            // 꼬리 쪽은 옅게 — 조각마다 부채꼴로 잘라 그린다
          const u0 = i / n, u1 = (i + 1) / n, b0 = tail + (head - tail) * u0, b1 = tail + (head - tail) * u1;
          c.save(); c.beginPath(); c.moveTo(x, y); c.arc(x, y, R * 1.05, b0, b1 + (ccw ? -0.02 : 0.02), ccw); c.closePath(); c.clip();
          c.globalAlpha = Math.min(1, k * 2.2) * (0.12 + 0.88 * u1);
          c.translate(x, y); c.rotate(b0 * 1.7); c.drawImage(im, -R, -R, R * 2, R * 2); c.restore();
        }
        return true;
      }
      case 'shock': {
        const im = art('shock', f.c); if (!im) return false;
        const r = f.r * easeOut(Math.min(1, p * 1.35)) / 0.86, x = f.x - camX, y = f.y - camY;
        c.globalAlpha = Math.min(1, k * 1.4);
        c.save(); c.translate(x, y); c.scale(1, f.sy); c.rotate(f.r); c.drawImage(im, -r, -r, r * 2, r * 2); c.restore();
        return true;
      }
      case 'flare': {
        const im = art('flare', f.c); if (!im) return false;
        const x = f.x - camX, y = f.y - camY, s = f.s * 1.7 * (0.6 + 0.4 * easeOut(Math.min(1, p * 3)));
        c.globalAlpha = 0.95 * k;
        c.save(); c.translate(x, y); c.rotate(f.rot + p * 0.8); c.drawImage(im, -s, -s, s * 2, s * 2); c.restore();
        return true;
      }
      case 'sigil': {
        const im = art('sigil', f.c); if (!im) return false;
        const x = f.x - camX, y = f.y - camY, s = f.r * (p < 0.15 ? easeOut(p / 0.15) * 1.08 : 1.08 - 0.08 * Math.min(1, (p - 0.15) * 4));
        c.globalAlpha = Math.min(1, k * 2) * 0.95;
        c.save(); c.translate(x, y); c.scale(1, f.sy); c.rotate(p * f.spin * TAU * 0.25); c.drawImage(im, -s, -s, s * 2, s * 2); c.restore();
        return true;
      }
      case 'column': {
        const im = art('column', f.c); if (!im) return false;
        const x = f.x - camX, y = f.y - camY, w = f.w * 1.5 * (0.5 + 0.5 * easeOut(Math.min(1, p * 4))) * (0.6 + 0.4 * k);
        c.globalAlpha = 0.85 * k; c.drawImage(im, x - w / 2, y - f.h, w, f.h);
        return true;
      }
      case 'beam': {
        const im = art('beam', f.c); if (!im) return false;
        const dx = f.x1 - f.x0, dy = f.y1 - f.y0, L = Math.hypot(dx, dy), h = f.w * 3 * (0.4 + 0.6 * k);
        if (L < 1) return true;
        c.globalAlpha = Math.min(1, k * 1.5);
        c.save(); c.translate(f.x0 - camX, f.y0 - camY); c.rotate(Math.atan2(dy, dx)); c.drawImage(im, 0, -h / 2, L, h); c.restore();
        return true;
      }
      case 'spark': {                              // 머리가 오른쪽인 줄기 — 속도 쪽으로 늘인다(빠를수록 길게)
        const im = art('spark', f.c); if (!im) return false;
        const v = Math.hypot(f.vx, f.vy), L = Math.max(8, v * f.len * 1.6), h = 5 * (0.5 + 0.5 * k);
        c.globalAlpha = Math.min(1, k * 1.5);
        c.save(); c.translate(f.x - camX, f.y - camY); c.rotate(Math.atan2(f.vy, f.vx)); c.drawImage(im, -L, -h / 2, L * 1.08, h); c.restore();
        return true;
      }
      case 'shard': {
        const im = art('shard', f.c); if (!im) return false;
        c.globalAlpha = Math.min(1, k * 1.8);
        c.save(); c.translate(f.x - camX, f.y - camY); c.rotate(f.a); c.drawImage(im, -f.s * 1.1, -f.s * 0.5, f.s * 2.4, f.s * 1.0); c.restore();
        return true;
      }
      case 'crack': {                              // 마디마다 금 띠를 늘여 붙인다 — 띠의 다른 토막을 써서 결이 되풀이되지 않게
        const im = art('crack', f.c) as HTMLCanvasElement | null; if (!im) return false;
        const n = Math.max(2, Math.ceil(f.pts.length * Math.min(1, p * 5))), iw = im.width || 512, ih = im.height || 48, h = 22;
        c.globalAlpha = Math.min(1, k * 1.6);
        for (let i = 1; i < n; i++) {
          const a = f.pts[i - 1], b = f.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), sw = Math.min(iw, L * ih / h), sx = (i * 97) % Math.max(1, iw - sw);
          c.save(); c.translate(a[0] - camX, a[1] - camY); c.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
          c.drawImage(im, sx, 0, sw, ih, -1, -h / 2, L + 2, h); c.restore();
        }
        return true;
      }
      case 'swipe': {                              // 초승달 그림(오른쪽이 가운데 · 150°)을 휘두른 각에 놓고 머리까지만 잘라 드러낸다
        const im = art('swipe0', f.c); if (!im) return false;
        const x = f.x - camX, y = f.y - camY, R = f.r / 0.95 * (0.92 + 0.08 * easeOut(Math.min(1, p * 3))), h = Math.min(1, p / 0.3);
        const s0 = -1.35, s1 = s0 + 2.7 * h;
        c.save(); c.translate(x, y); c.rotate(f.ang); c.scale(1, f.side);
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R * 1.05, s0, s1); c.closePath(); c.clip();
        c.globalAlpha = Math.min(1, k * 2.4); c.drawImage(im, -R, -R, R * 2, R * 2); c.restore();
        return true;
      }
      case 'mark': {
        const im = art('mark', f.c); if (!im) return false;
        const op = easeOut(Math.min(1, p * 5)), w = f.w * (0.3 + 0.7 * op), h = f.h * (1.25 - 0.25 * op) * (0.5 + 0.5 * k);
        c.globalAlpha = Math.min(1, k * 1.8);
        c.save(); c.translate(f.x - camX, f.y - camY); c.rotate(f.ang); c.drawImage(im, -w / 2, -h / 2, w, h); c.restore();
        return true;
      }
      case 'orbit': {
        const im = art('mote', f.c), at = f.at(); if (!im || !at) return !!im;
        const a = f.ph + p * f.max * f.sp, front = Math.sin(a) > 0, s = f.s * (front ? 1 : 0.7);
        const x = at[0] + Math.cos(a) * f.r * (1 - 0.3 * p) - camX, y = at[1] + Math.sin(a) * f.r * f.tilt - camY - p * 10;
        c.globalAlpha = Math.min(1, k * 3, p * 6) * (front ? 1 : 0.45); c.drawImage(im, x - s, y - s, s * 2, s * 2);
        return true;
      }
      case 'mote': {
        const im = art('mote', f.c); if (!im) return false;
        const s = f.s * (0.75 + 0.35 * Math.sin(f.ph + f.t * 20)) * (0.5 + 0.5 * Math.min(1, p * 6));
        c.globalAlpha = Math.min(1, k * 2); c.drawImage(im, f.x - camX - s, f.y - camY - s, s * 2, s * 2);
        return true;
      }
    }
    return false;
  }
}
