/* ===== entity/enemy-ai.js — 적 — 갱신 · 갈래별 움직임 · 단계 전환 ===== */
import { app as G, ui as UI } from '../ctx.js';
import { aabb, angleTo, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { Senses } from '../../engine/entity/sense.js';
import { tickDots } from '../../engine/entity/status.js';
import { followPoints, seek, separation } from '../../engine/entity/steer.js';
import { PathFollower, findGroundPath, findOpenPath } from '../../engine/tilemap/path.js';
import { seesBox } from '../../engine/tilemap/ray.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { BOSS_LINES } from '../data/skills.js';
import { TS } from '../world.js';
import { Enemy, GRAV, Part, Proj } from '../entity.js';
/* entity.js 의 Enemy 에서 나눈 조각 — 읽히는 순간 Enemy.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다). */

/** 눈·귀·기억으로 쫓는 갈래 — 순한 동물 · 부유물 · 보스는 따로 */
export const SENSING: Record<string, 1> = { walker: 1, jumper: 1, archer: 1, flyer: 1, caster: 1, swimmer: 1 };

export const EnemyAI: Bag & ThisType<Enemy> = {

  /** 나는 몹이 가고 싶은 속도 — 보이면 곧장, 놓쳤으면 벽을 돌아가는 길(engine tilemap/path findOpenPath)로 마지막 자리까지.
      곁의 몹에게서는 조금씩 비켜 선다(engine entity/steer separation — 여럿이 한 점에 겹쳐 한 마리처럼 보이던 것). */
  flyWant(dt: number, world: World, tx: number, ty: number, sp: number, seen: boolean) {
    let v = seek(this.cx, this.cy, tx, ty, sp);
    if (!seen && this.sense) {
      this.pathT = (this.pathT || 0) - dt;
      if ((!this.fly || this.pathT <= 0) && G.pathBudget > 0) {
        G.pathBudget--; this.pathT = 0.8 + Math.random() * 0.4;
        const bw = Math.max(1, Math.ceil(this.w / TS - 0.05)), bh = Math.max(1, Math.ceil(this.h / TS - 0.05));
        const pts = findOpenPath(Math.floor(this.x / TS), Math.floor(this.y / TS), Math.floor(tx / TS - bw / 2), Math.floor(ty / TS - bh / 2),
          { solid: (x, y) => world.solid(x, y), w: bw, h: bh, maxNodes: 700 });
        this.fly = pts ? { pts, i: 1 } : null;
      }
      if (this.fly) {
        const r = followPoints(this.x + TS / 2, this.y + TS / 2, this.fly.pts, this.fly.i, TS, sp);
        this.fly.i = r.i;
        if (r.i < this.fly.pts.length) v = r.v;
      }
    } else this.fly = null;
    const s = separation(this.cx, this.cy, G.entHash.near(this.cx, this.cy, 40), 40, sp * 0.7, this);
    return { x: v.x + s.x, y: v.y + s.y };
  },

  /** 걷는 몹의 길 — 과녁이 위·아래로 두 칸 넘게 갈리거나 벽에 막혔을 때만 길을 찾는다(engine tilemap/path).
      한 프레임에 찾는 몹 수를 줄이려고 몹마다 0.7초에 한 번 · 세계 전체로 프레임당 PATH_BUDGET 번만. 길이 없으면 null(곧장 걸어간다). */
  walkPath(dt: number, world: World, tx: number, ty: number, jump: number) {
    const bw = Math.max(1, Math.ceil(this.w / TS - 0.05)), bh = Math.max(1, Math.ceil(this.h / TS - 0.05));
    const fx = Math.floor(this.x / TS), fy = Math.floor((this.y + this.h - 1) / TS);
    const gx = Math.floor(tx / TS), gy = Math.floor((ty + 18) / TS);
    const far = Math.abs(gy - fy) > 2 || this.hitWall;
    this.pathT = (this.pathT || 0) - dt;
    if (!far && (!this.path || this.path.done)) return null;
    if (far && this.pathT <= 0 && this.onGround && Math.abs(gx - fx) < 40 && G.pathBudget > 0) {
      G.pathBudget--;
      this.pathT = 0.7 + Math.random() * 0.3;
      this.path = this.path || new PathFollower();
      this.path.set(findGroundPath(fx, fy, gx, gy, { solid: (x, y) => world.solid(x, y), floor: (x, y) => world.solid(x, y) || TILE_DEF[world.get(x, y)].solid === 2, w: bw, h: bh, jump, maxNodes: 900 }));
    }
    if (!this.path || this.path.done) return null;
    return this.path.steer(this.cx / TS, (this.y + this.h) / TS, this.onGround, bw);
  },

  update(dt: number, world: World, player: Player) { const { SEA_X1 } = dimsOf(world);
    this.atkPose -= dt;
    this.flash -= dt; this.atkCd -= dt; this.jumpCd -= dt; this.hitCd -= dt;
    this.slowFx.tick(dt); this.slowF = this.slowFx.v; this.slowT = this.slowFx.t;
    if (this.markT > 0) {
      this.markT -= dt;
      if (this.markT > 0 && Math.random() < dt * 5)
        G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.y - 6, '#e8d05a', -24, .5));
    }
    this.hp -= tickDots(this.dots, dt, d => {
      if (Math.random() < dt * 6) G.parts.push(new Part(this.cx, this.cy, d.kind === 'burn' ? '#ff8a3a' : d.kind === 'poison' ? '#8fd06a' : '#9fe0ff'));
    });
    if (this.hp <= 0) { this.die(null); return; }

    /* 유적 고유 규칙(entity/enemy-traits) — 언 것 · 숨은 것 · 붙은 것은 갈래 움직임도 접촉 피해도 쉰다 */
    if ((this.def.trait || this.frozenT > 0) && this.traitTick(dt, world, player)) return;
    const AI = this.def.ai;
    const sp = this.spd! * this.slowF;
    /* 알아차림 — 보스·순한 동물·떠다니는 것 말고는 눈(시선)과 귀(가까움)와 기억으로 쫓는다(engine entity/sense).
       보이면 플레이어를, 놓쳤으면 마지막으로 본 자리를 과녁으로 삼는다. 쏘는 몹은 보일 때만 쏜다. */
    const real = Math.hypot(player.cx - this.cx, player.cy - this.cy);
    let tx = player.cx, ty = player.cy, seen = true, engaged = real < this.aggro;
    if (SENSING[AI] && !this.boss && !this.def.passive) {
      if (!this.sense) this.sense = new Senses({ sight: this.aggro, hearing: Math.min(150, this.aggro * 0.35), memory: 5, react: 0.18 });
      const ex = this.cx / TS, ey = (this.y + Math.min(10, this.h * 0.3)) / TS;
      this.sense.update(dt, real, player.cx, player.cy,
        () => seesBox((x, y) => world.solid(x, y), ex, ey, player.cx / TS, player.cy / TS, player.h / 2 / TS));
      seen = this.sense.seen;
      engaged = this.sense.engaged || this.sense.state === 'alert';
      if (!seen) { tx = this.sense.lastX; ty = this.sense.lastY; }
    }
    if (this.goal) { tx = this.goal.x; ty = this.goal.y; seen = true; engaged = true; }   // 사건이 준 과녁(버섯 왕관 따위)
    const dx = tx - this.cx, dy = ty - this.cy;
    const dd = engaged ? Math.hypot(dx, dy) : Infinity;
    if (engaged || real < this.aggro) this.facing = dx >= 0 ? 1 : -1;
    this.mobSkills(dt, player, seen, dd);      // 몹 스킬(entity/enemy-skills) — 시전 예고 중엔 멈칫한다

    if (AI === 'walker' || AI === 'jumper' || AI === 'archer') {
      const range = this.def.range || 0;
      const step = dd < this.aggro ? this.walkPath(dt, world, tx, ty, AI === 'jumper' ? 3 : 2) : null;
      if (AI === 'archer' && seen && dd < range * 0.55) this.vx = -Math.sign(dx) * sp;
      else if (step) { this.vx = step.dir * sp; if (step.jump) { this.vy = -Math.sqrt(2 * GRAV * (step.jump * TS + 10)); this.jumpCd = 0.5; } }
      else if (dd < this.aggro && Math.abs(dx) > 4) this.vx = Math.sign(dx) * sp * (AI === 'jumper' && !this.onGround ? 1.4 : 1);
      else this.vx *= 0.9;
      if (AI === 'jumper' && seen && this.onGround && this.jumpCd <= 0 && dd < Math.min(480, this.aggro)) { this.vy = -430; this.jumpCd = 1.1 + Math.random() * 0.6; }
      if (this.hitWall && this.onGround && this.jumpCd <= 0) { this.vy = -420; this.jumpCd = 0.6; }
      if (AI === 'archer' && seen && this.atkCd <= 0 && dd < Math.min(range, this.aggro) && Math.abs(dy) < 180) {
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
        const v = this.flyWant(dt, world, tx, ty, sp, seen);
        this.vx = lerp(this.vx, v.x, dt * 3);
        this.vy = lerp(this.vy, v.y + (this.wob || 0), dt * 3);
      } else { this.vx *= 0.98; this.vy = lerp(this.vy, Math.sin(G.time * 2) * 30, dt * 2); }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'caster') {
      const range = this.def.range || 300;
      this.think -= dt;
      if (dd > this.aggro) { this.vx *= 0.95; this.vy = lerp(this.vy, Math.sin(G.time * 3 + this.x) * 40, dt * 2); }   // 사정거리 밖 — 배회만
      else if (!seen) { const v = this.flyWant(dt, world, tx, ty, sp, false); this.vx = lerp(this.vx, v.x, dt * 3); this.vy = lerp(this.vy, v.y, dt * 3); }   // 놓쳤다 — 벽을 돌아 찾아간다
      else if (dd > range * 0.8) { this.vx = lerp(this.vx, (dx / (dd || 1)) * sp, dt * 3); this.vy = lerp(this.vy, (dy / (dd || 1)) * sp, dt * 3); }
      else if (dd < range * 0.4) { this.vx = lerp(this.vx, -(dx / (dd || 1)) * sp, dt * 3); this.vy = lerp(this.vy, -(dy / (dd || 1)) * sp, dt * 3); }
      else { this.vx *= 0.95; this.vy = lerp(this.vy, Math.sin(G.time * 3 + this.x) * 40, dt * 2); }
      if (seen && this.atkCd <= 0 && dd < Math.min(range, this.aggro)) {
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
      /* 토끼는 깡충 뛰어 간다 — 시트의 걷기 두 장(웅크림 · 뻗음)은 발 높이가 3px 달라, 땅에서 번갈아 돌리면 제자리에서 둠칫거렸다.
         뻗은 장은 공중에서만(enemyFrame) 쓰고 몸은 실제 포물선을 탄다. */
      else if (this.def.hop && this.onGround && Math.abs(this.vx) > 10 && this.jumpCd <= 0) { this.vy = -150; this.jumpCd = 0.42; }
      this.move(dt, world);
    } else if (AI === 'swimmer') {
      // 물속 생물 — 물 밖으로는 못 나간다.
      const wet = (x: number, y: number) => world.liquid(Math.floor(x / TS), Math.floor(y / TS));
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
    if (!this.def.passive && !(this.burrowT > 0) && this.hitCd <= 0 && aabb(this.rect(), player.rect())) {
      player.hurt(this.dmg * (this.boss ? 1 : 0.9), this.cx);
      this.hitCd = 0.7;
      this.atkPose = 0.22;
      if (this.def.trait) this.traitContact(player);
    }
  },

  /* ---- 페이즈가 바뀌는 순간 ---- */
  onPhaseChange(ph: number, world: any, p: any) {
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
  layHeat(world: World, p: any) {
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
  tickWeak(dt: number, world: World, p: Player) {
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
