/* ===== engine/render/camera.ts — 따라가는 카메라 · 앞을 보여 주기 · 흔들림 ===== */
/* 화면 왼쪽 위의 세계 좌표(x, y)를 든다 — 게임은 그대로 cam.x · cam.y 를 읽고 써도 된다(순간이동 때 바로 맞추기).
   따라가기는 프레임 수와 상관없이 같은 빠르기로(1 - k^dt) · 움직이는 쪽으로 화면을 조금 미리 내어 준다(lead) ·
   흔들림은 매 프레임 새로 뽑은 난수가 아니라 이어지는 잡음이라 지진·폭발이 "떨림"으로 읽힌다(난수는 지글거렸다). */

export interface CameraConfig {
  follow?: number;        // 1초 뒤 남는 거리 비율(작을수록 바짝) — 0.002 = 한 박자 늦게 따라온다
  leadX?: number;         // 가로로 앞을 내어 주는 거리(px, 속도 최대일 때)
  leadY?: number;         // 떨어질 때 아래로 내어 주는 거리(px)
  leadSpeed?: number;     // 이 속도(px/s)에서 앞 내기가 다 찬다
  leadEase?: number;      // 앞 내기가 바뀌는 빠르기(1초 뒤 남는 비율)
  shakeFreq?: number;     // 흔들림 잡음의 빠르기(Hz 쯤)
}

/** 매끈한 1차원 잡음(-1~1) — 정수 칸마다 고정 난수, 사이는 smoothstep. 씨앗 s 로 축을 가른다. */
function vnoise(t: number, s: number): number {
  const h = (i: number) => { let x = Math.imul(i ^ (s * 0x9e3779b1), 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967295 * 2 - 1; };
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

export class Camera {
  declare x: number; declare y: number;
  declare cfg: Required<CameraConfig>;
  declare lx: number; declare ly: number;      // 지금 내어 준 앞 거리
  declare t: number;

  constructor(cfg: CameraConfig = {}) {
    this.x = 0; this.y = 0; this.lx = 0; this.ly = 0; this.t = 0;
    this.cfg = { follow: 0.002, leadX: 0, leadY: 0, leadSpeed: 300, leadEase: 0.05, shakeFreq: 18, ...cfg };
  }

  /** (tx, ty) = 화면 왼쪽 위가 가야 할 자리. (vx, vy) = 따라가는 것의 속도. 세계 [0, maxX]·[0, maxY] 안에 가둔다. */
  update(dt: number, tx: number, ty: number, vx: number, vy: number, maxX: number, maxY: number): void {
    const c = this.cfg;
    this.t += dt;
    const e = 1 - Math.pow(c.leadEase, dt);
    const wantX = c.leadX * Math.max(-1, Math.min(1, vx / c.leadSpeed));
    const wantY = c.leadY * Math.max(0, Math.min(1, (vy - c.leadSpeed * 0.5) / c.leadSpeed));   // 떨어질 때만 아래를 더 보여 준다
    this.lx += (wantX - this.lx) * e; this.ly += (wantY - this.ly) * e;
    const k = 1 - Math.pow(c.follow, dt);
    const gx = Math.max(0, Math.min(maxX, tx + this.lx)), gy = Math.max(0, Math.min(maxY, ty + this.ly));
    this.x += (gx - this.x) * k; this.y += (gy - this.y) * k;
  }

  /** 곧바로 맞춘다(순간이동 · 불러오기) — 앞 내기도 지운다 */
  snap(tx: number, ty: number, maxX: number, maxY: number): void {
    this.lx = 0; this.ly = 0;
    this.x = Math.max(0, Math.min(maxX, tx)); this.y = Math.max(0, Math.min(maxY, ty));
  }

  /** 흔들림 세기 amp(px)일 때 이 프레임의 어긋남 — 가장 크게 amp/2(예전 난수 흔들림과 같은 폭) */
  shakeOffset(amp: number): { x: number; y: number } {
    if (amp <= 0.05) return { x: 0, y: 0 };
    const f = this.t * this.cfg.shakeFreq, a = amp * 0.5;
    return { x: vnoise(f, 1) * a, y: vnoise(f, 2) * a };
  }

  /** 그릴 때 쓰는 정수 자리(흔들림 포함) */
  view(amp: number): { x: number; y: number } {
    const s = this.shakeOffset(amp);
    return { x: Math.round(this.x + s.x), y: Math.round(this.y + s.y) };
  }
}
