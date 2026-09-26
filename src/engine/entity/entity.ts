/* ===== engine/entity/entity.ts — 엔티티 기반: 위치·속도·판정 상자 · 칸 충돌 이동 ===== */
/* 이동은 조각으로 준다(가로 → 중력 → 세로 → 경계). 물·바람처럼 무엇이 속도를 바꾸는지는 게임이 조각 사이에 끼운다.
   ★ 조각 안의 순서(계단 → 한 픽셀씩 붙기, 막힘 → 발판)가 곧 손맛이다 — 바꾸면 벽·발판에 붙는 위치가 1px 씩 달라진다. */
import { clamp } from '../core/math.js';

/** 이동이 부딪히는 판 — 타일맵이 그대로 들어온다 */
export interface BodyMap {
  hitSolid(x: number, y: number, w: number, h: number): boolean;
  /** 발판 윗면 y(없으면 음수) — prevBottom 이 윗면보다 위였던 발판만 */
  hitPlatform(x: number, y: number, w: number, h: number, prevBottom: number): number;
}

export class Entity {
  /* ★ declare — 필드 초기화를 내보내지 않는다. 속성이 생기는 순서가 생성자 순서 그대로여야 한다. */
  declare x: number; declare y: number; declare w: number; declare h: number;
  declare vx: number; declare vy: number;
  declare dead: boolean; declare onGround: boolean;
  declare hitWall: boolean;                   // 마지막 가로 이동이 벽에 막혔나(계단을 올랐으면 그대로 둔다)

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.vx = 0; this.vy = 0; this.dead = false; this.onGround = false;
  }
  get cx(): number { return this.x + this.w / 2; }
  get cy(): number { return this.y + this.h / 2; }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /** 가로로 nx 까지. 막히면 바닥에 선 채로 step 픽셀 올라 retry 로 다시 가 보고(step 0 이면 안 오름),
      그래도 막히면 한 픽셀씩 붙고 멈춘다. ★ 올라선 뒤 막혀도 올라선 높이는 그대로다. */
  moveX(map: BodyMap, nx: number, step: number, retry: number): void {
    if (map.hitSolid(nx, this.y, this.w, this.h)) {
      let stepped = false;
      if (this.onGround && step > 0 && !map.hitSolid(nx, this.y - step, this.w, this.h)) {
        this.y -= step; nx = retry; stepped = true;
      }
      if (!stepped || map.hitSolid(nx, this.y, this.w, this.h)) {
        const dir = Math.sign(this.vx);
        while (!map.hitSolid(this.x + dir, this.y, this.w, this.h) && Math.abs(this.x - nx) > 1) this.x += dir;
        this.vx = 0; nx = this.x; this.hitWall = true;
      }
    } else this.hitWall = false;
    this.x = nx;
  }

  /** 중력 — 위로는 up, 아래로는 cap 까지 */
  fall(dt: number, grav: number, up: number, cap: number): void {
    this.vy = clamp(this.vy + grav * dt, up, cap);
  }

  /** 세로로 ny 까지. 막히면 한 픽셀씩 붙고(내려가다 막히면 땅), 아니면 내려갈 때 발판(platforms)에 선다. */
  moveY(map: BodyMap, ny: number, prevBottom: number, platforms: boolean): void {
    this.onGround = false;
    if (map.hitSolid(this.x, ny, this.w, this.h)) {
      const dir = Math.sign(this.vy);
      while (!map.hitSolid(this.x, this.y + dir, this.w, this.h) && Math.abs(this.y - ny) > 1) this.y += dir;
      if (this.vy > 0) this.onGround = true;
      this.vy = 0; ny = this.y;
    } else if (this.vy >= 0 && platforms) {
      const top = map.hitPlatform(this.x, ny, this.w, this.h, prevBottom);
      if (top >= 0) { ny = top - this.h; this.vy = 0; this.onGround = true; }
    }
    this.y = ny;
  }

  /** 세계 안에 가둔다 — x 는 [x0, x1 - w], 바닥 yMax 아래로 빠지면 거기 멈춘다 */
  keepIn(x0: number, x1: number, yMax: number): void {
    this.x = clamp(this.x, x0, x1 - this.w);
    if (this.y > yMax) { this.y = yMax; this.vy = 0; }
  }
}
