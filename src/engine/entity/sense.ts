/* ===== engine/entity/sense.ts — 알아차림(눈 · 귀 · 기억) ===== */
/* 몹이 "어디까지 아는가"를 한 곳에서 잰다. 보이면(시선이 트이고 sight 안) 곧바로 쫓고, 안 보여도 hearing 안이면
   그쪽을 경계하며, 놓치면 memory 초 동안 마지막으로 본 자리를 찾아간다 — 벽 너머에서 곧장 달려들지도, 모퉁이를 돌자마자 잊지도 않는다.
   시선 검사는 비싸서 look 초마다 한 번만 한다(엔티티마다 어긋나게 시작). */

export type SenseState = 'idle' | 'alert' | 'chase' | 'search';

export interface SenseConfig {
  sight: number;          // 보이는 거리(px)
  hearing: number;        // 벽 너머로도 알아차리는 거리(px)
  memory?: number;        // 놓친 뒤 찾아다니는 시간(초)
  react?: number;         // 처음 본 뒤 쫓기 시작할 때까지(초) — 0 이면 곧바로
  look?: number;          // 시선 검사 간격(초)
}

export class Senses {
  declare cfg: Required<SenseConfig>;
  declare state: SenseState;
  declare seen: boolean;          // 마지막 검사에서 보였나
  declare lastX: number; declare lastY: number;   // 마지막으로 알아챈 자리
  declare lostT: number;          // 남은 기억
  declare reactT: number;
  declare lookT: number;

  constructor(cfg: SenseConfig) {
    this.cfg = { memory: 4, react: 0.25, look: 0.2, ...cfg };
    this.state = 'idle'; this.seen = false;
    this.lastX = 0; this.lastY = 0; this.lostT = 0; this.reactT = this.cfg.react;
    this.lookT = Math.random() * this.cfg.look;
  }

  /** 맞았다 · 큰 소리가 났다 — 그 자리를 곧바로 안다(시선과 상관없이) */
  alarm(x: number, y: number): void {
    this.lastX = x; this.lastY = y; this.lostT = this.cfg.memory; this.reactT = 0;
    if (this.state !== 'chase') this.state = 'search';
  }

  /** dist — 과녁까지 거리 · (tx, ty) 과녁 자리 · canSee() — 시선이 트였나(필요할 때만 부른다) */
  update(dt: number, dist: number, tx: number, ty: number, canSee: () => boolean): SenseState {
    const c = this.cfg;
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.lookT = c.look;
      this.seen = dist <= c.sight && canSee();
    } else if (dist > c.sight) this.seen = false;
    if (this.seen) {
      this.lastX = tx; this.lastY = ty; this.lostT = c.memory;
      this.reactT -= dt;
      this.state = this.reactT <= 0 ? 'chase' : 'alert';
    } else if (dist <= c.hearing) {
      this.lastX = tx; this.lastY = ty; this.lostT = c.memory;
      this.state = this.state === 'chase' ? 'chase' : 'alert';
    } else {
      this.lostT -= dt;
      if (this.lostT > 0) this.state = 'search';
      else { this.state = 'idle'; this.reactT = c.react; }
    }
    return this.state;
  }

  /** 쫓거나 찾고 있는가(움직일 목표가 있는가) */
  get engaged(): boolean { return this.state === 'chase' || this.state === 'search'; }
}
