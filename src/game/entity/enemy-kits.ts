/* ===== entity/enemy-kits.js — 바이옴 몬스터 고유 기술 하나씩(ENEMIES[].kit) — 모티브 동물이 실제로 사냥하는 법 ===== */
import { app as G } from '../ctx.js';
import { aabb, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy, Part, Proj } from '../entity.js';
/* entity.js 의 Enemy 에서 나눈 조각 — 읽히는 순간 Enemy.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다).
   ★ 기준(사용자 2026-10-15): 땅에 사는가 · 나는가 · 헤엄치는가, 모티브 동물의 공격 방식에서 나온다 — 상관없는 마법을 붙이지 않는다.
   유적 고유 규칙(trait)과 겹치는 행동(모래 속 잠행 · 매복 · 붙어 빨기)은 쓰지 않는다. 몹은 호스트만 돌린다 —
   플레이어에게 거는 것은 hurt · inflict(참가자에게는 네트워크로), 바닥 예고 · 구름은 보스 위험 지대(bhz)로 모두에게 보인다. */

export const EnemyKits: Bag & ThisType<Enemy> = {
  /** 매 프레임 — true 면 이번 프레임 움직임 · 접촉 피해를 기술이 맡는다 */
  kitTick(dt: number, world: World, p: Player, seen: boolean, dd: number) {
    this.kCd = (this.kCd === undefined ? 0.4 + Math.random() * 0.8 : this.kCd) - dt;   // 첫 기술은 금방 — 다가오는 사이에 한 번은 보인다
    if (this.kT > 0) this.kT -= dt;
    const dx = p.cx - this.cx, dy = p.cy - this.cy, adx = Math.abs(dx);
    const touch = (k: number, cd = 0.8) => { if (this.hitCd <= 0 && aabb(this.rect(), p.rect())) { p.hurt(this.dmg * k, this.cx); this.hitCd = cd; return true; } return false; };
    switch (this.def.kit) {
      case 'swoop': {                    // 까마귀 — 높이 맴돌다 겨눈 자리로 비스듬히 내리꽂고, 다시 솟는다
        if (this.kSt === 'aim') {
          this.vx *= 0.9; this.vy = -30; this.atkPose = 0.2;
          if (this.kT <= 0) { this.kSt = 'dive'; this.kT = 0.75; const a = Math.atan2(this.ky - this.cy, this.kx - this.cx); this.vx = Math.cos(a) * 560; this.vy = Math.sin(a) * 560; G.sfxAt('dash', this.cx / TS, this.cy / TS); }
          this.move(dt, world, { gravMul: 0 }); return true;
        }
        if (this.kSt === 'dive') {
          if (Math.random() < dt * 30) G.parts.push(new Part(this.cx, this.cy, '#5a5a62', -10, 0.35));
          touch(1.4);
          this.move(dt, world, { gravMul: 0 });
          if (this.kT <= 0 || this.hitWall || this.onGround || this.cy > this.ky + 10) { this.kSt = 'climb'; this.kT = 0.6; }
          return true;
        }
        if (this.kSt === 'climb') {
          this.vy = -280; this.vx *= 0.97;
          this.move(dt, world, { gravMul: 0 });
          if (this.kT <= 0) this.kSt = '';
          return true;
        }
        if (seen && this.kCd <= 0 && dy > 40 && dd < 380 && adx < 300) {
          this.kSt = 'aim'; this.kT = 0.5; this.kCd = 4 + Math.random() * 2;
          this.kx = p.cx + p.vx * 0.35; this.ky = p.y + p.h - 6;
          G.bossHazard({ k: 'line', x0: this.cx, y0: this.cy, x1: this.kx, y1: this.ky, life: 0.5, c: '#d8d0c0', w: 2 });
          G.sfxAt('swing', this.cx / TS, this.cy / TS);
          return true;
        }
        return false;
      }
      case 'pack': {                     // 늑대 — 울어서 무리를 양옆으로 벌리고, 웅크렸다 덮친다
        if (this.goalT > 0) { this.goalT -= dt; if (this.goalT <= 0) this.goal = null; }
        if (seen && !this.howled && dd < this.aggro) {
          this.howled = 1;
          let side = dx > 0 ? 1 : -1;
          for (const e of G.ents) {
            if (e === this || e.dead || e.type !== this.type || Math.hypot(e.cx - this.cx, e.cy - this.cy) > 520) continue;
            e.goal = { x: p.cx + side * 120, y: p.cy }; e.goalT = 2.6; e.howled = 1; side = -side;   // 번갈아 앞뒤로 — 에워싼다
          }
          for (let i = 0; i < 12; i++) G.parts.push(new Part(this.cx, this.y, '#cfe8ff', -50, 0.8));
          G.sfxAt('sk_shout', this.cx / TS, this.cy / TS);
        }
        if (this.kSt === 'crouch') {
          this.vx = 0; this.atkPose = 0.2;
          if (this.kT <= 0) { this.kSt = 'leap'; this.kT = 0.9; this.vx = Math.sign(this.kx - this.cx || 1) * 430; this.vy = -330; }
          this.move(dt, world); return true;
        }
        if (this.kSt === 'leap') {
          touch(1.35);
          this.move(dt, world);
          if ((this.onGround && this.kT < 0.75) || this.kT <= 0) this.kSt = '';
          return true;
        }
        if (seen && this.kCd <= 0 && this.onGround && adx > 60 && adx < 210 && Math.abs(dy) < 60) {
          this.kSt = 'crouch'; this.kT = 0.42; this.kCd = 3.5 + Math.random() * 1.5; this.kx = p.cx;
          for (let i = 0; i < 5; i++) G.parts.push(new Part(this.cx, this.y + this.h, '#e8f4ff', -20, 0.4));
          return true;
        }
        return false;
      }
      case 'grab': {                     // 전갈 — 집게로 붙잡고, 꼬리를 머리 위로 들어 내리찍는다
        if (this.kSt === 'hold') {
          this.vx = 0; this.atkPose = 0.2;
          const near = Math.abs(p.cx - this.cx) < 46 && Math.abs(p.cy - this.cy) < 40;
          if ((p.dashV || 0) > 0 || !near) { this.kSt = ''; this.kCd = 3; this.move(dt, world); return true; }   // 내달려 빠져나갔다
          if (Math.random() < dt * 8) G.parts.push(new Part(this.cx + this.facing * 10, this.y - 4, '#e8c060', -20, 0.3));
          if (this.kT <= 0) {
            this.kSt = '';
            p.hurt(this.dmg * 1.25, this.cx); p.inflict('poison', 5, this.dmg * 0.1);
            for (let i = 0; i < 8; i++) G.parts.push(new Part(p.cx, p.y + 6, '#8fd06a', -60, 0.5));
            G.sfxAt('hit_blunt', this.cx / TS, this.cy / TS);
          }
          this.move(dt, world); return true;
        }
        if (this.kCd <= 0 && adx < 34 && Math.abs(dy) < 30) {
          this.kSt = 'hold'; this.kT = 0.85; this.kCd = 5 + Math.random() * 2;
          p.hurt(this.dmg * 0.4, this.cx); p.inflict('grabbed', 0.9);
          G.sfxAt('mine', this.cx / TS, this.cy / TS);
          return true;
        }
        return false;
      }
      case 'lob': {                      // 원숭이 — 멈춰 서서 팔을 젖혔다가 열매를 포물선으로 던진다
        if (this.kSt === 'wind') {
          this.vx = 0; this.atkPose = 0.25;
          if (this.kT <= 0) {
            this.kSt = '';
            const sx = this.cx, sy = this.y + 4, T = clamp(dd / 300, 0.55, 1.1), g = 600;
            const pr = new Proj(sx, sy, (p.cx - sx) / T, (p.cy - sy) / T - 0.5 * g * T, this.dmg * 0.8, 'enemy', 'fruit');
            pr.grav = g; G.projs.push(pr);
          }
          this.move(dt, world); return true;
        }
        if (seen && this.kCd <= 0 && this.onGround && dd > 70 && dd < 430) {
          this.kSt = 'wind'; this.kT = 0.38; this.kCd = 2.6 + Math.random() * 1.6;
          return true;
        }
        return false;
      }
      case 'roots': {                    // 부패한 나무 — 제자리에 뿌리를 박고, 발밑에서 뿌리가 솟아 붙든다
        if (this.kSt === 'cast') {
          this.vx = 0; this.atkPose = 0.25;
          if (Math.random() < dt * 14) G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.y + this.h, '#6a3a7a', -40, 0.5));
          if (this.kT <= 0) this.kSt = '';
          this.move(dt, world); return true;
        }
        if (seen && this.kCd <= 0 && this.onGround && dd < 380) {
          this.kSt = 'cast'; this.kT = 0.6; this.kCd = 5 + Math.random() * 1.5;
          const fy = G.hzFloor(p.cx, p.y + p.h - 6);
          G.bossHazard({ k: 'strike', shape: 'col', x: p.cx, y: fy, w: 34, hh: 58, delay: 0.85, life: 1.4, dmg: this.dmg * 1.1, c: '#8a5a9a', fx: 'plant', inf: ['grabbed', 1], sd: Math.random() * 99 });
          return true;
        }
        return false;
      }
      case 'web': {                      // 거미 — 엉덩이를 들고 거미줄 덩이를 쏜다(맞으면 발이 묶인다)
        if (this.kSt === 'spin') {
          this.vx = 0; this.atkPose = 0.2;
          if (this.kT <= 0) {
            this.kSt = '';
            const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 300, Math.sin(a) * 300, this.dmg * 0.35, 'enemy', 'web'));
          }
          this.move(dt, world); return true;
        }
        if (seen && this.kCd <= 0 && this.onGround && dd > 50 && dd < 360) {
          this.kSt = 'spin'; this.kT = 0.35; this.kCd = 4 + Math.random() * 2;
          return true;
        }
        return false;
      }
      case 'ink': {                      // 문어 — 위협받으면 먹물을 뿜고 반대로 물을 차고 달아난다
        if (this.kSt === 'jet') {
          this.vx *= Math.pow(0.3, dt); this.vy *= Math.pow(0.3, dt);
          this.move(dt, world, { gravMul: 0, aquatic: 1 });
          if (this.kT <= 0) this.kSt = '';
          return true;
        }
        if (this.kCd <= 0 && dd < 110) { this.inkOut(p); return true; }
        return false;
      }
      case 'trail': {                    // 용암 슬러그 — 지나간 자리에 굳어 가는 용암 자국을 남긴다
        this.kT2 = (this.kT2 || 0) - dt;
        if (this.kT2 <= 0 && this.onGround && Math.abs(this.vx) > 8 && dd < this.aggro) {
          this.kT2 = 0.45;
          G.bossHazard({ k: 'zone', x: this.cx, y: this.y + this.h, r: 14, life: 3.5, dmg: this.dmg * 0.25, burn: 1, c: '#ff7a2a', fx: 'lava', sd: Math.random() * 99 });
        }
        return false;
      }
    }
    return false;
  },

  /** 문어 먹물 — 구름 + 반대쪽으로 분사 */
  inkOut(p: Player) {
    this.kSt = 'jet'; this.kT = 0.7; this.kCd = 7 + Math.random() * 2;
    G.bossHazard({ k: 'zone', x: this.cx, y: this.cy + 14, r: 86, life: 4, dmg: 0, ink: 1, c: '#140c20', fx: 'ink', sd: Math.random() * 99 });
    const a = Math.atan2(this.cy - p.cy, this.cx - p.cx);
    this.vx = Math.cos(a) * 430; this.vy = Math.sin(a) * 430;
    G.sfxAt('splash', this.cx / TS, this.cy / TS);
  },

  /** 맞았을 때 — 갓짐승은 포자를 터뜨리고(말불버섯), 문어는 먹물을 뿜는다. 받는 피해를 돌려준다 */
  kitHurt(amount: number) {
    const k = this.def.kit;
    if (k === 'puff' && G.time >= (this.puffT || 0)) {
      this.puffT = G.time + 4;
      this.atkPose = 0.3;
      G.bossHazard({ k: 'zone', x: this.cx, y: this.y + this.h, r: 56, life: 3.2, dmg: this.dmg * 0.2, poison: 1, c: '#8fe0c0', fx: 'spore', sd: Math.random() * 99 });
      for (let i = 0; i < 14; i++) G.parts.push(new Part(this.cx, this.y + 4, '#a8f0d0', -70, 0.7));
      G.sfxAt('mat_plant', this.cx / TS, this.cy / TS);
    }
    if (k === 'ink' && !(this.kCd > 0)) { const q = G.hzNear(this.cx, this.cy) || G.me; if (q) this.inkOut(q); }
    return amount;
  },
};

mixin(Enemy.prototype, EnemyKits, true);
