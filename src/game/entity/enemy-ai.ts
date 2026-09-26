/* ===== entity/enemy-ai.js — 적 — 갱신 · 갈래별 움직임 · 단계 전환 ===== */
import { app as G, ui as UI } from '../ctx.js';
import { aabb, angleTo, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { SEA_X1 } from '../size.js';
import { T } from '../data.js';
import { BOSS_LINES } from '../data/skills.js';
import { TS } from '../world.js';
import { Enemy, Part, Proj } from '../entity.js';
/* entity.js 의 Enemy 에서 나눈 조각 — 읽히는 순간 Enemy.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다). */

export const EnemyAI: Bag & ThisType<Enemy> = {

  update(dt, world, player) {
    this.atkPose -= dt;
    this.flash -= dt; this.atkCd -= dt; this.jumpCd -= dt; this.hitCd -= dt;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowF = 1; }
    if (this.markT > 0) {
      this.markT -= dt;
      if (this.markT > 0 && Math.random() < dt * 5)
        G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.y - 6, '#e8d05a', -24, .5));
    }
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const d = this.dots[i]; d.t -= dt;
      this.hp -= d.dps * dt;
      if (Math.random() < dt * 6) G.parts.push(new Part(this.cx, this.cy, d.kind === 'burn' ? '#ff8a3a' : d.kind === 'poison' ? '#8fd06a' : '#9fe0ff'));
      if (d.t <= 0) this.dots.splice(i, 1);
    }
    if (this.hp <= 0) { this.die(null); return; }

    const dx = player.cx - this.cx, dy = player.cy - this.cy;
    const dd = Math.hypot(dx, dy);
    this.facing = dx >= 0 ? 1 : -1;
    const AI = this.def.ai;
    const sp = this.spd * this.slowF;

    if (AI === 'walker' || AI === 'jumper' || AI === 'archer') {
      const range = this.def.range || 0;
      if (AI === 'archer' && dd < range * 0.55) this.vx = -Math.sign(dx) * sp;
      else if (dd < this.aggro) this.vx = Math.sign(dx) * sp * (AI === 'jumper' && !this.onGround ? 1.4 : 1);
      else this.vx *= 0.9;
      if (AI === 'jumper' && this.onGround && this.jumpCd <= 0 && dd < Math.min(480, this.aggro)) { this.vy = -430; this.jumpCd = 1.1 + Math.random() * 0.6; }
      if (this.hitWall && this.onGround && this.jumpCd <= 0) { this.vy = -420; this.jumpCd = 0.6; }
      if (AI === 'archer' && this.atkCd <= 0 && dd < Math.min(range, this.aggro) && Math.abs(dy) < 180) {
        this.atkCd = 1.8 + Math.random() * 0.6;
        this.atkPose = 0.26;
        const a = angleTo(this.cx, this.cy, player.cx, player.cy - 6);
        const p = new Proj(this.cx, this.cy, Math.cos(a) * 460, Math.sin(a) * 460, this.dmg, 'enemy', this.def.proj || 'arrow');
        p.grav = 220; G.projs.push(p);
      }
      this.move(dt, world);
    } else if (AI === 'flyer') {
      this.think -= dt;
      if (this.think <= 0) { this.think = 0.5 + Math.random() * 0.5; this.wob = (Math.random() - 0.5) * 90; }
      if (dd < this.aggro) {
        this.vx = lerp(this.vx, (dx / (dd || 1)) * sp, dt * 3);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * sp + (this.wob || 0), dt * 3);
      } else { this.vx *= 0.98; this.vy = lerp(this.vy, Math.sin(G.time * 2) * 30, dt * 2); }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'caster') {
      const range = this.def.range || 300;
      this.think -= dt;
      if (dd > this.aggro) { this.vx *= 0.95; this.vy = lerp(this.vy, Math.sin(G.time * 3 + this.x) * 40, dt * 2); }   // 사정거리 밖 — 배회만
      else if (dd > range * 0.8) { this.vx = lerp(this.vx, (dx / (dd || 1)) * sp, dt * 3); this.vy = lerp(this.vy, (dy / (dd || 1)) * sp, dt * 3); }
      else if (dd < range * 0.4) { this.vx = lerp(this.vx, -(dx / (dd || 1)) * sp, dt * 3); this.vy = lerp(this.vy, -(dy / (dd || 1)) * sp, dt * 3); }
      else { this.vx *= 0.95; this.vy = lerp(this.vy, Math.sin(G.time * 3 + this.x) * 40, dt * 2); }
      if (this.atkCd <= 0 && dd < Math.min(range, this.aggro)) {
        this.atkCd = 2.0 + Math.random() * 0.8;
        this.atkPose = 0.26;
        const a = angleTo(this.cx, this.cy, player.cx, player.cy);
        const kind = this.def.proj || (this.type === 'frostling' ? 'frost' : this.type === 'imp' ? 'fire' : 'dark');
        G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 320, Math.sin(a) * 320, this.dmg, 'enemy', kind));
      }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'critter') {
      // 순한 동물 — 플레이어를 무시하고 어슬렁거리다가, 맞으면 잠깐 반대쪽으로 도망친다
      if (this.fleeT > 0) { this.fleeT -= dt; this.vx = -Math.sign(dx || 1) * sp * 1.8; }
      else {
        this.think -= dt;
        if (this.think <= 0) { this.think = 1.2 + Math.random() * 2.2; this.wDir = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1); }
        this.vx = lerp(this.vx, this.wDir * sp * 0.5, dt * 2);
      }
      if (this.onGround && this.hitWall && this.jumpCd <= 0) { this.vy = -300; this.jumpCd = 0.5; }
      this.move(dt, world);
    } else if (AI === 'swimmer') {
      // 물속 생물 — 물 밖으로는 못 나간다.
      const wet = (x, y) => world.liquid(Math.floor(x / TS), Math.floor(y / TS));
      this.think -= dt;
      if (this.think <= 0) { this.think = 0.7 + Math.random() * 1.1; this.wob = (Math.random() - 0.5) * 70; }
      const chase = !this.def.passive && dd < this.aggro;
      if (chase) {
        this.vx = lerp(this.vx, (dx / (dd || 1)) * sp, dt * 2.6);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * sp + (this.wob || 0) * 0.3, dt * 2.6);
      } else {
        this.vx = lerp(this.vx, (this.wDir || 0) * sp * 0.45, dt * 1.6);
        this.vy = lerp(this.vy, (this.wob || 0) * 0.5, dt * 1.6);
        if (this.jumpCd <= 0) { this.jumpCd = 1.4 + Math.random() * 1.6; this.wDir = Math.random() < 0.5 ? -1 : 1; }
      }
      // 물 경계에서 되돌리기 — 한 프레임 뒤의 자리를 미리 보고, 물이 아니면 그 축을 죽인다
      const lookX = this.cx + Math.sign(this.vx) * (this.w / 2 + 4);
      const lookY = this.cy + Math.sign(this.vy) * (this.h / 2 + 4);
      if (this.vx !== 0 && !wet(lookX, this.cy)) { this.vx *= -0.5; this.wDir = -(this.wDir || 1); }
      if (this.vy !== 0 && !wet(this.cx, lookY)) this.vy *= -0.5;
      this.move(dt, world, { gravMul: 0, aquatic: 1 });
    } else if (AI === 'flotsam') {
      /* 바다 부유물 — 수면에 떠서 물결(G.surfacePx — 파도를 그리는 식)을 따라 오르내리고, 제 방향으로 천천히 흘러간다. */
      if (this.drift === undefined) this.drift = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 10);
      const hx = this.cx / TS;
      const sr = world.surfaceRow(Math.floor(hx), Math.floor((this.y + this.h * 0.8) / TS), 4);
      if (sr >= 0 && G.surfacePx) {
        const want = G.surfacePx(hx, sr) - this.h * 0.55;
        this.vy = lerp(this.vy, (want - this.y) * 5, dt * 6);
      } else this.vy = Math.min(this.vy + 900 * dt, 400);   // 물 밖으로 튕겼다 — 떨어져 물로 돌아간다
      const ahead = Math.floor((this.cx + Math.sign(this.drift) * (this.w / 2 + 6)) / TS);
      if (this.hitWall || !world.liquid(ahead, sr >= 0 ? sr : Math.floor(this.cy / TS)) || ahead >= SEA_X1 - 2) this.drift = -this.drift;
      this.vx = lerp(this.vx, this.drift, dt * 1.2);
      // 기울기 — 이웃한 물결 높이 차로 몸을 기울인다(그리는 쪽이 쓴다)
      if (sr >= 0 && G.surfacePx) this.tilt = Math.atan2(G.surfacePx(hx + 0.6, sr) - G.surfacePx(hx - 0.6, sr), TS * 1.2);
      this.move(dt, world, { gravMul: 0, aquatic: 1 });
    } else {
      this.bossAI(dt, world, player, dx, dy, dd);
    }

    // 접촉 피해 (순한 동물은 dmg 0이라 사실상 무해하지만, 명시적으로 건너뛴다)
    if (!this.def.passive && this.hitCd <= 0 && aabb(this.rect(), player.rect())) {
      player.hurt(this.dmg * (this.boss ? 1 : 0.9), this.cx);
      this.hitCd = 0.7;
      this.atkPose = 0.22;
    }
  },

  /* ---- 페이즈가 바뀌는 순간 ---- */
  onPhaseChange(ph, world, p) {
    this.phaseInv = 0.8;
    this.guard = 0;
    G.shake = Math.max(G.shake, 11);
    for (let i = 0; i < 26; i++) {
      G.parts.push(new Part(this.cx + (Math.random() - 0.5) * this.w,
                            this.cy + (Math.random() - 0.5) * this.h,
                            i % 3 ? this.def.c : '#ffe08a', -120, 0.9));
    }
    G.ringFx(this.cx, this.cy, Math.max(this.w, this.h) * 1.6, '#ffe08a', .55);
    G.sfxAt('chapter', this.cx / TS, this.cy / TS);

    const line = (BOSS_LINES[this.type] || {})[ph];
    if (line) G.bossLine(this.def.n, line);

    /* 보스마다 이 순간에 켜지는 규칙. */
    const lock = this.phases >= 5 ? this.phases - 2 : this.phases - 1;
    switch (this.def.ai) {
      case 'b_slime':
        // 2페이즈 — 껍데기가 굳는다.
        if (ph >= lock) { this.guard = 1; this.openT = 0; }
        break;
      case 'b_witch':
        /* 2페이즈 — 바닥이 언다. */
        if (ph >= lock) { this.iceFloor = 1; this.layHeat(world, p); }
        break;
      case 'b_prolif': if (ph >= lock) this.guard = 1; break;      // 핵만 약점
      case 'b_hepha':  if (ph >= lock) this.guard = 1; break;      // 정지 핵을 써야 열린다
      case 'b_arche':
        /* 받침대를 깨야 열린다 — 그런데 방에 받침대가 없으면 규칙이 걸리지도 않는다. */
        if (ph >= lock) { this.guard = 1; this.raisePedestals(); }
        break;
      case 'b_overseer': if (ph >= 1) this.term = 0; break;
    }
  },

  /** 원형 2페이즈 — 받침대 넷. */
  raisePedestals() {
    /* 살아남은 받침대를 먼저 치운다. */
    for (const e of G.ents) if (e.pedestal && !e.dead) { e.dead = true; e.hp = 0; }
    for (let i = 0; i < 4; i++) {
      const e = new Enemy('draft_form', this.cx + (i - 1.5) * 96, this.cy - 10, 1);
      e.pedestal = 1; e.maxHp = Math.round(e.maxHp * 0.35); e.hp = e.maxHp;
      e.spd = 0;                               // 받침대다. 쫓아오지 않는다
      G.ents.push(e);
    }
    G.toast(tr('받침대 넷이 그것을 붙들고 있다'), 'bad');
  },

  /* 서리 마녀 2페이즈 — 발밑에 설 수 있는 자리를 만들어 준다. */
  layHeat(world, p) {
    const fy = Math.floor((this.y + this.h + 4) / TS);
    for (const off of [-9, 0, 9]) {
      const tx = Math.floor(this.cx / TS) + off;
      for (let y = fy; y < fy + 4; y++) {
        if (world.solid(tx, y + 1) && world.get(tx, y) === T.AIR) { world.set(tx, y, T.TORCH); break; }
      }
    }
    G.toast(tr('바닥이 언다 — 불 옆에 서라'), 'bad');
  },

  /** 매 프레임 도는 약점·장판 규칙. */
  tickWeak(dt, world, p) {
    // 껍데기가 벌어지는 시간 — 그동안만 피해가 제대로 들어간다
    if (this.openT > 0) { this.openT -= dt; if (this.openT <= 0) this.guard = 1; }
    if (!this.iceFloor) return;
    /* 서리 장판 — 발밑 세 칸 안에 열원(횃불·용암)이 없으면 얼어붙는다. */
    this.iceCd = (this.iceCd || 0) - dt;
    if (this.iceCd > 0) return;
    this.iceCd = 0.5;
    const tx = Math.floor(p.cx / TS), ty = Math.floor((p.y + p.h - 2) / TS);
    let warm = false;
    for (let x = tx - 2; x <= tx + 2 && !warm; x++)
      for (let y = ty - 2; y <= ty + 2; y++) {
        const t = world.get(x, y);
        if (t === T.TORCH || t === T.LAVA) { warm = true; break; }
      }
    if (warm) return;
    p.addBuff('frostbite', 1.2);
    p.hurt(this.dmg * 0.18);
    for (let i = 0; i < 4; i++) G.parts.push(new Part(p.cx, p.cy, '#9fe0ff', -30, .5));
  },
};
mixin(Enemy.prototype, EnemyAI, true);
