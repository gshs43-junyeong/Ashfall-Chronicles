/* ===== entity/enemy-traits.js — 유적 고유 몬스터의 규칙 하나씩(ENEMIES[].trait) ===== */
import { app as G } from '../ctx.js';
import { aabb } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TS } from '../world.js';
import { DmgText, Enemy, Part } from '../entity.js';
/* entity.js 의 Enemy 에서 나눈 조각 — 읽히는 순간 Enemy.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다).
   몹마다 **싸우는 법 하나**가 다르다 — 유적에 가야만 겪는 규칙. 사연: docs/code-history.md#h169 */

export const EnemyTraits: Bag & ThisType<Enemy> = {

  /** 매 프레임 갈래별 움직임 **앞에서** — true 면 이번 프레임 움직임 · 접촉 피해를 이것이 맡는다 */
  traitTick(dt: number, world: World, p: Player) {
    const t = this.def.trait;
    /* 언 것(사건 '녹는 순례자들') — 갈래와 상관없이 제자리에 굳어 있다 */
    if (this.frozenT > 0) {
      this.frozenT -= dt;
      this.vx = 0; this.chillT = Math.max(this.chillT, 0.3);
      if (this.frozenT <= 0) {
        for (let i = 0; i < 18; i++) G.parts.push(new Part(this.cx, this.cy, '#cfefff', -60, .8));
        G.sfx('sk_frost');
      }
      this.move(dt, world);
      return true;
    }
    if (!t) return false;
    const dx = p.cx - this.cx, adx = Math.abs(dx), ady = Math.abs(p.cy - this.cy);
    if (t === 'shield') {
      /* 방패는 천천히 돈다 — 1.2초마다 한 번만 고쳐 선다(뒤로 돌아 들어가면 그동안은 등이 열린다) */
      this.shT = (this.shT || 0) - dt;
      if (this.shT <= 0 || !this.shFace) { this.shT = 1.2; this.shFace = dx >= 0 ? 1 : -1; }
      return false;
    }
    if (t === 'burrow') {
      this.burT = (this.burT === undefined ? 3 + Math.random() * 2 : this.burT) - dt;
      if (this.hide > 0) {
        this.hide -= dt;
        this.vx = Math.sign(dx) * this.spd! * 1.3;       // 모래 속으로 발밑까지 헤엄쳐 온다
        if (Math.random() < dt * 20) G.parts.push(new Part(this.cx, this.y + this.h, '#d8b878', -50, .5));
        if (this.hide <= 0) {
          this.burT = 4 + Math.random() * 1.5; this.vy = -420;
          for (let i = 0; i < 16; i++) G.parts.push(new Part(this.cx, this.y + this.h, '#e8c888', -120, .7));
          if (adx < 34 && ady < 40) p.hurt(this.dmg * 1.1, this.cx);
          G.sfx('mine');
        }
        this.move(dt, world);
        return true;
      }
      if (this.burT <= 0 && this.onGround && adx < 420) { this.hide = 1.4; G.sfx('mine'); }
      return false;
    }
    if (t === 'thief') {
      if (this.lampT > 0) {
        this.lampT -= dt;
        this.vx = -Math.sign(dx || 1) * this.spd! * 1.25;   // 훔친 불을 들고 반대로 달아난다
        if (this.hitWall && this.onGround) this.vy = -460;
        if (Math.random() < dt * 12) G.parts.push(new Part(this.cx + this.facing * 8, this.cy - 4, '#ffb04a', -30, .5, { glow: 1 }));
        this.facing = this.vx >= 0 ? 1 : -1;
        if (this.lampT <= 0) { this.lampT = 0; if (G.ruinDark > 0 && !this.evLamp) G.ruinDark = Math.min(G.ruinDark, 0.6); }
        this.move(dt, world);
        return true;
      }
      return false;
    }
    if (t === 'latch') {
      if (this.latchT > 0) {
        this.latchT -= dt;
        this.x = p.cx - this.w / 2 + this.latchOx; this.y = p.y + 6;
        this.vx = p.vx; this.vy = 0;
        this.drainT = (this.drainT || 0) - dt;
        if (this.drainT <= 0) {
          this.drainT = 0.5;
          const d = this.dmg * 0.22;
          p.hurt(d, this.cx);
          this.hp = Math.min(this.maxHp, this.hp + d * 0.6);
          G.parts.push(new Part(p.cx, p.cy, '#c84aa8', -40, .5));
        }
        /* 내달리면 떨어진다 — 붙은 것에 대한 대답을 하나 준다 */
        if ((p.dashV || 0) > 0 || this.latchT <= 0) {
          this.latchT = 0; this.vx = -p.facing * 260; this.vy = -240; this.hitCd = 1.4;
          if ((p.dashV || 0) > 0) G.texts.push(new DmgText(this.cx, this.y - 8, tr('떨어졌다'), '#e8a0d8', 0));
        }
        return true;
      }
      return false;
    }
    if (t === 'regrow') {
      const burning = this.dots.some((d: any) => d.kind === 'burn' || d.kind === 'fire');
      if (!burning && G.time - (this.lastHitT || -9) > 2 && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.06 * dt);
        if (Math.random() < dt * 6) G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.y, '#8fe0c4', -30, .6, { glow: 1 }));
      }
      return false;
    }
    if (t === 'deaf') {
      /* 소리(치기 · 스킬 · 내달리기)가 가까이서 나면 깨어나 둘레의 낱장도 깨운다 */
      if (!this.awake) {
        const noisy = G.time - (G.noiseT || -9) < 0.4 && adx < 300 && ady < 220;
        if (noisy) this.wakeDeaf(true);
        else {
          this.vx *= 0.96; this.vy = Math.sin(G.time * 2 + this.x * 0.01) * 18;
          this.move(dt, world, { gravMul: 0 });
          return true;
        }
      }
      return false;
    }
    if (t === 'statue') {
      /* 네가 움직일 때만 움직인다 — 멈춰 서면 굳는다(맞으면 두 배) */
      const moving = Math.abs(p.vx) > 25 || !p.onGround;
      this.still = !moving;
      if (!moving) { this.vx = 0; this.move(dt, world); return true; }
      return false;
    }
    if (t === 'blink') {
      this.blinkT = (this.blinkT === undefined ? 3 + Math.random() * 3 : this.blinkT) - dt;
      if (this.blinkT <= 0 && adx < 420 && ady < 160) {
        this.blinkT = 6;
        const nx = p.cx - p.facing * 64 - this.w / 2, ny = p.y + p.h - this.h;
        const tx0 = Math.floor(nx / TS), tx1 = Math.floor((nx + this.w - 1) / TS);
        const ty0 = Math.floor(ny / TS), ty1 = Math.floor((ny + this.h - 1) / TS);
        let free = true;
        for (let x = tx0; x <= tx1 && free; x++) for (let y = ty0; y <= ty1; y++) if (world.solid(x, y)) { free = false; break; }
        if (free) {
          for (let i = 0; i < 14; i++) G.parts.push(new Part(this.cx, this.cy, '#5a5090', -30, .7));
          this.x = nx; this.y = ny; this.vx = 0;
          for (let i = 0; i < 14; i++) G.parts.push(new Part(this.cx, this.cy, '#8fd8ff', -30, .7));
          this.facing = p.cx >= this.cx ? 1 : -1;
          G.sfx('sk_blink');
        }
      }
      return false;
    }
    if (t === 'ambush') {
      if (this.amb === undefined) this.amb = 1;           // 처음엔 묻혀 있다
      if (this.amb) {
        this.vx = 0; this.move(dt, world);
        if (adx < 70 && ady < 80) {
          this.amb = 0; this.vy = -380;
          for (let i = 0; i < 20; i++) G.parts.push(new Part(this.cx, this.y + this.h, '#7a6a48', -140, .8));
          if (aabb(this.rect(), p.rect())) p.hurt(this.dmg * 0.8, this.cx);
          G.shake = Math.max(G.shake, 5); G.sfx('mine');
        }
        return true;
      }
      return false;
    }
    if (t === 'sac') { this.vx = 0; this.move(dt, world); return true; }
    return false;
  },

  /** 펫 · 소환수가 건드리지 않는 것 — 잠든 낱장(깨우면 '침묵' 사건이 깨진다) · 알주머니(박자를 맞추는 것은 플레이어) · 묻힌 것 */
  allyIgnore() {
    const t = this.def.trait;
    return (t === 'deaf' && !this.awake) || t === 'sac' || this.hide > 0 || !!this.amb;
  },

  /** 맞을 때 — 규칙대로 깎인 피해(0 이하면 아예 안 맞은 것) */
  traitHurt(amount: number, src: any) {
    const t = this.def.trait;
    this.lastHitT = G.time;
    if (this.frozenT > 0) return amount * 3;                 // 언 몸은 세 배로 부서진다
    if (this.hide > 0 || this.amb) return 0;                 // 모래 · 바닥 밑 — 닿지 않는다
    if (t === 'shield') {
      const s = src && src.cx !== undefined ? src : G.player;
      const front = Math.sign(s.cx - this.cx) === (this.shFace || this.facing) && s.y + s.h > this.y + this.h * 0.3;
      if (front) {
        if (Math.random() < 0.6) G.texts.push(new DmgText(this.cx, this.y - 6, tr('방패'), '#bfe8ff', 0));
        for (let i = 0; i < 5; i++) G.parts.push(new Part(this.cx + (this.shFace || 1) * 12, this.cy, '#e0f6ff', -40, .4));
        return amount * 0.2;
      }
      return amount * 1.25;                                  // 등 · 머리 위 — 방패가 없는 쪽
    }
    if (t === 'statue') return this.still ? amount * 2 : amount * 0.6;
    if (t === 'deaf' && !this.awake) this.wakeDeaf(true);
    if (t === 'latch' && this.latchT > 0) return amount * 1.5;
    if (t === 'sac') return src === G.player && G.sacStrike(this) ? this.hp + 1 : 0;   // 플레이어가 친 것만 박자를 잰다
    return amount;
  },

  /** 접촉 피해를 줬을 때 — 도둑은 불을 훔치고, 거머리는 붙는다 */
  traitContact(p: Player) {
    const t = this.def.trait;
    if (t === 'thief' && !(this.lampT > 0)) {
      this.lampT = 4.5;
      G.ruinDark = Math.max(G.ruinDark || 0, 4.5);
      G.toast(tr('등불 도둑이 불을 채 갔다 — 잡으면 돌아온다'), 'bad');
    } else if (t === 'latch' && !(this.latchT > 0)) {
      this.latchT = 3.5; this.latchOx = (Math.random() - .5) * 10;
      G.toast(tr('거머리가 붙었다 — 내달려 떼어 내라'), 'bad');
    }
  },

  /** 떠도는 낱장이 깬다 — 둘레 낱장도 같이(한 장이 울리면 책 전체가 깬다) */
  wakeDeaf(spread: boolean) {
    if (this.awake) return;
    this.awake = 1;
    G.texts.push(new DmgText(this.cx, this.y - 10, '!', '#ff6a5a', 1));
    for (let i = 0; i < 10; i++) G.parts.push(new Part(this.cx, this.cy, '#ff8a6a', -40, .6));
    if (spread) for (const e of G.ents) if (e instanceof Enemy && e !== this && e.def.trait === 'deaf' && !e.awake &&
      Math.abs(e.cx - this.cx) < 420 && Math.abs(e.cy - this.cy) < 300) e.wakeDeaf(false);
    if (G.onDeafWake) G.onDeafWake(this);
  },

  /** 쓰러질 때 — 훔친 불은 제자리로, 등불 도둑은 자루를 떨군다 */
  traitDie() {
    if (this.def.trait === 'thief' && this.lampT > 0) {
      G.ruinDark = 0;
      const bonus = Math.round(this.gold * 2);
      G.player.gold += bonus;
      G.texts.push(new DmgText(this.cx, this.y - 12, '+' + bonus, '#ffd24a', 1));
      G.toast(tr('불이 돌아왔다 — 도둑의 자루에서 금화 {n}', { n: bonus }), 'good');
    }
  }
};

mixin(Enemy.prototype, EnemyTraits, true);
