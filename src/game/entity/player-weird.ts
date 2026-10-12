/* ===== entity/player-weird.js — 특이한 무기 여섯의 움직임 — 전기 집게 · 부메랑 · 비눗방울 · 우산 활공 · 프라이팬 · 잎 검 ===== */
/* 그림은 game/weird-fx.ts. 투사체 갈래(부메랑 · 방울)는 entity.ts 의 PROJ_MOVE · PROJ_WALL 표에 여기서 끼운다(엔티티가 이 조각을 import 하지 않게). */
import { app as G } from '../ctx.js';
import { clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy, PROJ_MOVE, PROJ_WALL, Part, Player } from '../entity.js';

/* 전기 집게 — 0.55초에 열 칸까지 펼쳐지고(벽에 닿으면 거기까지) 0.3초에 접힌다 */
export const CLAW_MAX = 10 * TS, CLAW_OUT = 0.55, CLAW_BACK = 0.3;
/* 우산 — 펼친 채 떨어지는 빠르기 상한(px/초) */
export const UMB_FALL = 90;

export const PlayerWeird: Bag & ThisType<Player> = {
  /** 휘두르는 순간 — 갈래마다 다른 일(doAttack 이 부른다). true 면 보통 휘두르기를 건너뛴다 */
  weirdSwing(sp: string, ang: number, base: number) {
    if (sp === 'claw') {
      this.claw = { t: 0, ang, dmg: this.scaleDmg(base, 'str'), hit: new Set(), len: 0, max: 0, zap: 0 };
      this.swing = 0;
      G.sfx('zap', 0.9);
      return true;
    }
    if (sp === 'leaf') for (let i = 0; i < 10; i++)
      G.parts.push(new Part(this.cx + Math.cos(ang) * 24, this.cy + Math.sin(ang) * 18, i % 2 ? '#6ab85a' : '#4a8a3c', -30, .9, { g: 0.25, drag: 0.9, sq: 0.5 }));
    return false;
  },
  /** 근접 판정에 닿은 순간(player-move 의 휘두르기 판정) */
  weirdHit(sp: string, e: Enemy) {
    if (sp === 'pan') {
      G.sfx('mat_metal', 1.3); G.shake = Math.max(G.shake, 3);
      e.vy = Math.min(e.vy, -260);
      e.panT = 1.2;                                                    // 머리 위 별(game/weird-fx)
      for (let i = 0; i < 6; i++) G.parts.push(new Part(e.cx, e.y, '#ffe08a', -80, .5));
    }
  },
  /** 매 프레임 — 펼친 집게 · 우산 활공 */
  tickWeird(dt: number) {
    const w = this.weapon(), sp = w && idef(w).sp;
    this.umbOpen = false;
    if (sp === 'umbrella' && !this.onGround && !this.swimming && !this.jetting && this.vy > UMB_FALL) {
      this.vy = UMB_FALL; this.umbOpen = true;
      if (Math.random() < dt * 6) G.parts.push(new Part(this.cx, this.y - 14, '#c8d4f0', -10, .5));
    }
    const k = this.claw; if (!k) return;
    k.t += dt;
    const cs = Math.cos(k.ang), sn = Math.sin(k.ang), ox = this.cx, oy = this.cy - 4;
    if (k.t < CLAW_OUT) {
      const want = CLAW_MAX * (1 - Math.pow(1 - k.t / CLAW_OUT, 2));   // 서서히 — 끝으로 갈수록 느려진다
      let L = k.max;
      for (let d = k.max; d <= want; d += 4) { if (G.world.solid(Math.floor((ox + cs * d) / TS), Math.floor((oy + sn * d) / TS))) break; L = d; }
      k.max = L; k.len = L;
    } else k.len = k.max * clamp(1 - (k.t - CLAW_OUT) / CLAW_BACK, 0, 1);
    // 팔 전체가 감전 — 몸에서 끝까지 선분에 닿은 몹(한 번씩)
    if (this === G.me) for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead || k.hit.has(e)) continue;
      const ex = e.cx - ox, ey = e.cy - oy, along = ex * cs + ey * sn;
      if (along < 0 || along > k.len + e.w / 2) continue;
      if (Math.abs(-ex * sn + ey * cs) > e.h / 2 + 8) continue;
      k.hit.add(e);
      const crit = this.rollCrit();
      e.hurt(k.dmg, crit, this, 2, null);
      e.chill(0.8);
      for (let i = 0; i < 6; i++) G.parts.push(new Part(e.cx, e.cy, i % 2 ? '#bff0ff' : '#5ad8ff', -20, .3, { glow: 1 }));
      if (k.zap++ < 4) G.sfx('zap', 1.1 + k.zap * 0.08);
    }
    if (k.t >= CLAW_OUT + CLAW_BACK) this.claw = null;
  }
};
mixin(Player.prototype, PlayerWeird, true);

/* 부메랑 — 0.42초 뒤(또는 벽에 닿으면) 던진 사람에게로 돌아온다. 돌아오는 길에 한 번 더 칠 수 있게 표를 한 번 비운다 */
PROJ_MOVE.boomerang = (p: Proj, dt: number) => {
  p.bt = (p.bt || 0) + dt;
  const o = G.me;
  if (p.bt > 0.42 && o) {
    if (!p.back) { p.back = 1; p.hitSet.clear(); }
    const dx = o.cx - p.cx, dy = o.cy - p.cy, d = Math.hypot(dx, dy) || 1;
    p.vx = lerp(p.vx, dx / d * 640, dt * 7); p.vy = lerp(p.vy, dy / d * 640, dt * 7);
    if (d < 22) { p.dead = true; G.sfx('swing', 1.3); return true; }   // 잡았다
    p.x += p.vx * dt; p.y += p.vy * dt;                                 // 돌아올 때는 벽을 지나 온다(안 그러면 벽 뒤에 갇혔다)
    return 'hit';
  }
  p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5;
  return false;
};
PROJ_WALL.boomerang = (p: Proj) => { p.bt = Math.max(p.bt || 0, 0.42); return true; };
/* 비눗방울 — 점점 느려지며 떠오르고 흔들린다 */
PROJ_MOVE.bubble = (p: Proj, dt: number) => {
  p.bt = (p.bt || 0) + dt; p.ox = p.x; p.oy = p.y;
  p.vx *= 1 - dt * 1.6; p.vy = p.vy * (1 - dt * 1.6) - 46 * dt;
  p.x += Math.sin(p.bt * 7 + p.vol) * 18 * dt;
  return false;
};
/* 땅·벽에 닿으면 두 번까지 통 튄다 — 손이 몸 가운데보다 낮아 아래로 쏘면 발밑에서 바로 터졌다 */
PROJ_WALL.bubble = (p: Proj) => {
  if ((p.bn = (p.bn || 0) + 1) > 2) return false;
  const nx = p.x, ny = p.y;
  p.x = p.ox; p.y = p.oy;
  if (G.world.hitSolid(nx, p.oy, p.w, p.h)) p.vx = -p.vx * 0.6;
  else p.vy = -Math.abs(p.vy) * 0.6 - 40;
  return true;
};
