// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== entity/player-move.js — 플레이어 — 숨 · 움직임(갱신) ===== */
import { app as G, ui as UI } from '../ctx.js';
import { TAU, aabb, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { WSY } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { hitFam } from '../data/items.js';
import { SIG_FX, idef } from '../data/values.js';
import { TS } from '../world.js';
import { DmgText, Enemy, JET_BURN, JET_COOL_AIR, JET_COOL_GROUND, JET_HIGH_FALL, JET_MAX_UP, JET_RESUME, MAX_FALL,
  Part, Player, SAFE_FALL_VY, itemDamage } from '../entity.js';
/* entity.js 의 Player 에서 나눈 조각 — 읽히는 순간 Player.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다). */

export const PlayerMove = {

  /* ---- 산소 ---- */
  updateOxygen(dt, world) {
    const max = this.d.oxyMax;
    if (this.oxygen === undefined || this.oxygen > max) this.oxygen = max;
    // 머리 칸이 액체인가 — 몸 전체 비율(submerged)로 보면 목까지 잠겨도 익사한다
    const hx = Math.floor(this.cx / TS), hy = Math.floor((this.y + 4) / TS);
    const ht = world.get(hx, hy);
    let under = !!TILE_DEF[ht].liquid;
    /* 흐르는 얕은 물도 같다. */
    if (under && world.get(hx, hy - 1) === T.AIR && G.surfacePx) under = (this.y + 4) > G.surfacePx(this.cx / TS, hy);
    this.headUnder = under;
    if (under) {
      /* 깊이 압박 — 심해(세션 3)로 내려갈수록 숨이 빨리 닳는다. */
      const lv = world.sea ? world.sea.level : null;
      // 90칸마다 한 배 — 중형·대형 바다는 그만큼 깊으므로 칸 수도 세계 크기(WSY)만큼 늘린다
      const deep = lv === null ? 1 : clamp(1 + Math.max(0, (this.cy / TS) - lv) / (90 * WSY), 1, 4);
      this.oxygen = Math.max(0, this.oxygen - dt * deep);
      this.oxyPressure = deep;
      if (this.oxygen <= 0) {
        this.drownT = (this.drownT || 0) + dt;
        if (this.drownT >= 1) {                                  // 초당 한 번
          this.drownT -= 1;
          /* 익사는 hurt()를 타지 않는다 — 방어력으로 깎이면 안 되고(숨은 갑옷으로 못 막는다), hurt()의 무적 0.5초가 붙으면 물속에서 오히려 무적이 된다. */
          const dmg = Math.max(4, Math.round(this.d.maxHp * 0.06));
          this.hp -= dmg; this.flash = 0.25;
          // 피해 숫자는 다른 피해와 같은 빨강이어야 한다 — 물빛으로 띄우면 회복처럼 읽힌다
          G.texts.push(new DmgText(this.cx, this.y, dmg, '#ff6b6b', 0));
          G.sfx('drown');   // 익사는 다른 피해음과 갈라야 한다 — 막힌 소리
          for (let i = 0; i < 8; i++) G.parts.push(new Part(this.cx, this.y + 6, '#bfe4ff', -50, .6));
          if (this.hp <= 0) { this.hp = 0; G.onDeath('drown'); }   // 익사 — 업적이 원인을 묻는다
        }
      }
      // 숨 방울 — 남은 숨이 적을수록 자주 샌다
      if (Math.random() < dt * (1.5 + (1 - this.oxygen / max) * 5)) {
        G.parts.push(new Part(this.cx + (Math.random() - .5) * 10, this.y + 4, '#dff2ff', -60, .8));
        G.sfx('bubble');   // SFX_GAP이 0.45초로 묶어 두어 방울마다 울리지는 않는다
      }
    } else {
      this.drownT = 0;
      this.oxygen = Math.min(max, this.oxygen + dt * 6 * (this.d.oxyReg || 1));   // 물 밖에서는 빠르게 찬다
    }
  },

  /* ---- 업데이트 ---- */
  update(dt, world, input) {
    const d = this.d;
    // 타이머
    this.atkTimer -= dt; this.swing -= dt; this.dashCd -= dt; this.iframe -= dt;
    this.hurtCd -= dt; this.flash -= dt; this.potionCd -= dt;
    if (this.chargeT > 0) this.chargeT -= dt;
    if (this.undyingCd > 0) this.undyingCd = Math.max(0, this.undyingCd - dt);
    if (this.shieldT > 0) { this.shieldT -= dt; if (this.shieldT <= 0) { this.shieldT = 0; this.shield = 0; } }
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - dt);
    for (let i = this.buffs.length - 1; i >= 0; i--) { this.buffs[i].t -= dt; if (this.buffs[i].t <= 0) { this.buffs.splice(i, 1); this.recalc(); } }

    // 재생
    this.mp = Math.min(d.maxMp, this.mp + d.mpreg * dt);
    if (this.hurtCd <= 0) this.hp = Math.min(d.maxHp, this.hp + d.hpreg * dt);

    /* 들어가는 값과 나오는 값을 갈라 둔다(히스테리시스) — 사연: docs/code-history.md#h29 */
    const sub = this.submerged || 0;
    /* 물에 들고 나는 순간에만 첨벙. */
    const wasSwim = this.swimming;
    this.swimming = this.swimming ? sub > 0.25 : sub > 0.35;
    if (this.swimming !== wasSwim && G.sfx) G.sfx('splash');
    this.updateOxygen(dt, world);

    // 이동 — 물속(헤엄)은 아래 '헤엄' 절이 따로 맡는다
    const acc = this.onGround ? 2400 : 1500;
    let want = 0;
    if (input.left) want -= 1; if (input.right) want += 1;
    if (this.channel) want *= 0.4;
    if (this.swimming) {
      if (want !== 0 && (!this.swing || !this.channel)) this.facing = Math.sign(want);
    } else if (want !== 0) {
      this.vx += want * acc * dt;
      this.vx = clamp(this.vx, -d.ms * (this.dashV > 0 ? 3 : 1), d.ms * (this.dashV > 0 ? 3 : 1));
      if (!this.swing || !this.channel) this.facing = want;
    } else {
      const fr = this.onGround ? 2600 : 700;
      if (Math.abs(this.vx) < fr * dt) this.vx = 0; else this.vx -= Math.sign(this.vx) * fr * dt;
    }
    this.dashV = Math.max(0, this.dashV - dt);

    // 점프 / 헤엄 — 물에 잠겨 있으면 점프가 발차기가 된다.
    const inWater = this.swimming;
    // 입수 엣지 — 잠기기 시작하는 그 프레임에 한 번만 첨벙 소리(계속 잠겨 있는 동안은 안 울림)
    if (inWater && !this.wasInWater) G.sfx('splash');
    this.wasInWater = inWater;
    if (this.onGround || inWater) this.jumpsLeft = d.jumps;
    if (!inWater) { this.floating = false; this.swimMove = false; }
    if (inWater) {
      /* 수면에 떠 있기 — 아무것도 안 누르면 머리를 내민 채 **물결을 따라** 오르내린다 — 사연: docs/code-history.md#h30 */
      this.floating = false;
      if (!input.jump && !input.down) {
        const hx = this.cx / TS, sr = world.surfaceRow(Math.floor(hx), Math.floor((this.y + 6) / TS) + 1, 3);
        if (sr >= 0 && G.surfacePx) {
          this.floating = true;
          const want = G.surfacePx(hx, sr) - 14;             // 목까지 잠기고 머리가 나온다
          this.vy = lerp(this.vy, clamp((want - this.y) * 6, -160, 160), dt * 6);
        }
      }
      // 물가로 기어오르기 — 이게 없으면 좁은 웅덩이에서 영영 못 나온다
      const climbed = input.jump && !this.jumpHeld && this.climbOut(world, want || this.facing);
      /* --- 헤엄 --- */
      let ix = want, iy = (input.down ? 1 : 0) - (input.jump ? 1 : 0);
      if (this.floating && iy < 0) iy = 0;                  // 수면에서는 위로 저어 봐야 허공이다
      const mag = Math.hypot(ix, iy);
      if (mag) { ix /= mag; iy /= mag; }
      this.swimPh = ((this.swimPh || 0) + dt * (mag ? 1.5 : 0.35)) % 1;
      const beat = 0.35 + 0.65 * Math.max(0, Math.sin(this.swimPh * TAU));
      const T = 1350 * beat;
      this.vx += ix * T * dt;
      this.vy += iy * T * dt;
      const vref = d.ms * 0.75;
      const sp = Math.hypot(this.vx, this.vy);
      const drag = Math.min(0.9, (0.6 + 2.4 * sp / vref) * dt);
      this.vx -= this.vx * drag; this.vy -= this.vy * drag;
      if (this.floating && input.jump && !this.jumpHeld && !climbed) {
        this.vy = -430; this.floating = false;                 // 물을 박차고 뛰어오르기
        for (let i = 0; i < 10; i++) G.parts.push(new Part(this.cx, this.y + this.h * .6, '#dff2ff', -120, .5));
        G.sfx('splash');
      }
      this.swimMove = mag > 0 || sp > 60;
      this.jumpHeld = !!input.jump;
      if (input.jump && Math.random() < dt * 10)
        G.parts.push(new Part(this.cx + (Math.random() - .5) * 14, this.y + this.h * .3, '#bfe4ff', -30, .5));
    } else {
      if (input.jump && !this.jumpHeld && this.jumpsLeft > 0) {
        G.sfx(this.onGround ? 'jump' : 'jump2', 0.94 + Math.random() * 0.12);
        this.vy = -620; this.jumpsLeft--; this.jumpHeld = true;
        if (!this.onGround) for (let i = 0; i < 8; i++) G.parts.push(new Part(this.cx, this.y + this.h, '#cfe8ff'));
      }
      if (!input.jump) this.jumpHeld = false;
      if (this.vy < 0 && !input.jump) this.vy += 1400 * dt;   // 가변 점프
    }
    /* 제트팩 — 공중에서 점프를 누르고 있는 동안 떠오른다 — 사연: docs/code-history.md#h32 */
    this.jetting = false;
    /* 발밑 지면에서 얼마나 떠 있나 — 30칸을 넘으면 더 오르지 못한다(위 JET_MAX_UP 주석) */
    this.jetGap = d.jet ? this.groundGap(world) : 0;
    /* 한계 높이를 **딱 끊지 않고 서서히 힘이 빠지게** 한다. */
    const room = d.jet ? clamp((JET_MAX_UP + 1 - this.jetGap) / 4, 0, 1) : 1;
    const tooHigh = d.jet && this.jetGap >= JET_MAX_UP;
    if (d.jet && input.jump && !this.onGround && !inWater && !this.jetOver) {
      if (this.jetOk === undefined) { this.jetT = 0; this.jetOk = this.useCharge(6); }
      else {
        this.jetT = (this.jetT || 0) + dt;
        if (this.jetT >= 0.25) { this.jetT -= 0.25; this.jetOk = this.useCharge(6); }
      }
      if (this.jetOk) {
        /* 오를 수 있는 속도 — 한계 높이에 가까울수록 -330에서 +140(천천히 내려오는 속도)으로 옮겨 간다. */
        const cap = -330 * room + JET_HIGH_FALL * (1 - room);
        if (this.vy > cap) this.vy = Math.max(this.vy - 2400 * dt, cap);
        this.jetting = true;
        if (Math.random() < dt * 30)
          G.parts.push(new Part(this.cx + (Math.random() - .5) * 10, this.y + this.h,
                                tooHigh ? '#8a7a6a' : '#ffb04a', 60, 0.35));
        if (tooHigh) this.jetNote(tr('여기서 더 오르지 못한다 — 발밑에서 30칸이 한계다'));
      }
    } else { this.jetT = 0; this.jetOk = undefined; }
    /* 열 — **밀어 올릴 때만** 오른다. */
    if (d.jet) {
      if (this.jetting && !tooHigh) {
        this.jetHeat = Math.min(1, (this.jetHeat || 0) + dt / JET_BURN);
        if (this.jetHeat >= 1 && !this.jetOver) {
          this.jetOver = true; this.jetting = false;
          this.jetNote(tr('추진기가 과열됐다 — 식을 때까지 꺼진다'), 'bad');
          G.sfx('power_off');
          for (let i = 0; i < 10; i++)
            G.parts.push(new Part(this.cx + (Math.random() - .5) * 12, this.y + this.h, '#6a6a72', -10, .6));
        }
      } else if (this.jetHeat > 0) {
        this.jetHeat = Math.max(0, this.jetHeat - dt / (this.onGround ? JET_COOL_GROUND : JET_COOL_AIR));
        if (this.jetOver && this.jetHeat <= JET_RESUME) this.jetOver = false;
      }
    } else { this.jetHeat = 0; this.jetOver = false; }

    // 활공 — 깃털 부적이 있으면 낙하 중 점프 유지 시 천천히 내려온다
    this.gliding = false;
    if (d.glide && !this.jetting && input.jump && this.vy > 60 && !this.onGround && this.jumpsLeft <= 0) {
      this.vy = Math.min(this.vy, 110);
      this.gliding = true;
      if (Math.random() < dt * 14) G.parts.push(new Part(this.cx, this.y + this.h, '#dfe9f5', -20, .4));
    }

    // 대시
    if (input.dash && this.dashCd <= 0) {
      const dir = want !== 0 ? want : this.facing;
      this.vx = dir * 720; this.dashV = 0.22;
      this.iframe = d.dashI / 1000; this.dashCd = d.dashCd;
      for (let i = 0; i < 12; i++) G.parts.push(new Part(this.cx, this.cy, '#cfd8ff'));
      G.sfx('dash');
    }

    // 낙하 데미지 판정용 — move() 안에서 착지 순간 vy가 0으로 꺾이기 전에 미리 재둔다
    const wasOnGround = this.onGround, fallVy = this.vy;
    // 수면에 떠 있는 동안은 중력을 끈다 — 끄지 않으면 부력 용수철이 중력과 비겨 몸이 14px 낮게 뜬다 수면에 떠 있으면 중력 0, 잠겨 헤엄치면 거의 뜨는 몸(0.3
    this.move(dt, world, { dropThrough: !!input.down, gravMul: this.floating ? 0 : this.swimming ? 0.3 : undefined });
    /* 물에 빠지면 안 다친다(폭포 아래 웅덩이가 착지 지점이 되어 주는 게 이 지형의 요점). */
    if (!wasOnGround && this.onGround && !this.gliding && !this.jetting && (this.submerged || 0) <= 0.2) {
      // 건초더미 위로 떨어지면 안 다친다 — 마을에서 지붕을 타고 다니라고 둔 것
      const bt = world.get(Math.floor(this.cx / TS), Math.floor((this.y + this.h + 2) / TS));
      if (fallVy > SAFE_FALL_VY && this.iframe <= 0 && !TILE_DEF[bt].soft) {
        const dmg = Math.round((fallVy - SAFE_FALL_VY) / (MAX_FALL - SAFE_FALL_VY) * 55);
        if (dmg > 0) { this.hurt(dmg); this.hurtCd = Math.max(this.hurtCd, 0.4); }
      }
    }

    // 돌진 타격
    if (this.chargeT > 0) {
      for (const e of G.ents) {
        if (!(e instanceof Enemy) || e.dead || this.chargeHit.has(e)) continue;
        if (aabb(this.rect(), e.rect())) { this.chargeHit.add(e); e.hurt(this.chargeDmg, this.rollCrit(), this, 14, hitFam(this.weapon())); }
      }
    }
    // 채널링
    if (this.channel) {
      this.channel.t -= dt; this.channel.tick -= dt;
      if (this.channel.tick <= 0) {
        this.channel.tick = 0.28;
        G.aoe(this.cx, this.cy, 96, this.channel.dmg * 0.28, 3, '#ffcf6a');
        /* 도는 동안 박자마다 운다. */
        G.sfx('sk_whirl', G.strokeRate());
        G.shake = Math.max(G.shake, 3);
        /* 발밑 먼지 — 박자에만 세 개다. */
        const foot = this.y + this.h;
        for (let k = 0; k < SIG_FX.whirl.n; k++)
          G.parts.push(new Part(this.cx + (Math.random() - .5) * 70, foot - 4, '#c8a878', -40, .5));
      }
      if (this.channel.t <= 0) this.channel = null;
    }
    // 근접 스윙 판정
    if (this.swing > 0 && this.swingHit) {
      const reach = this.swingReach;
      const w = this.weapon();
      const base = w && idef(w).dmg && idef(w).type === 'weapon' && idef(w).wc === 'melee' ? itemDamage(w) : (this._punchDmg || 4);
      const kb = w ? (idef(w).kb || 3) : 2;
      for (const e of G.ents) {
        if (!(e instanceof Enemy) || e.dead || this.swingHit.has(e)) continue;
        const dx = e.cx - this.cx, dy = e.cy - this.cy;
        if (dx * dx + dy * dy > (reach + e.w / 2) * (reach + e.w / 2)) continue;
        if (Math.sign(dx) !== this.swingDir && Math.abs(dx) > 8) continue;
        if (Math.abs(dy) > reach * 0.85) continue;
        this.swingHit.add(e);
        const crit = this.rollCrit();
        e.hurt(this.scaleDmg(base, 'str'), crit, this, kb, hitFam(w));
        if (this.d.fire) e.addDot('burn', this.scaleDmg(base, 'str') * 0.12 * this.d.fire, 4);
        if (this.d.frost) e.slow(0.45, 2.5);
        if (this.d.poison) e.addDot('poison', this.scaleDmg(base, 'str') * 0.13 * this.d.poison, 5);
      }
    }

    // 용암/가시/선인장 등 환경 피해 — 몸 전체 범위로 검사해야 고체 블록(선인장)도 스치기만 해도 걸린다
    const tx = Math.floor(this.cx / TS), ty = Math.floor(this.cy / TS);
    const hurt = world.hurtInRect(this.x, this.y, this.w, this.h);
    if (hurt && this.iframe <= 0) { this.hurt(hurt); this.hurtCd = 3; }
    /* 깊이·고도 기록이 **실제로 갱신될 때만** 업적을 본다. */
    const d0 = this.deepest, h0 = this.highest;
    this.deepest = Math.max(this.deepest, ty);
    this.highest = Math.min(this.highest === undefined ? ty : this.highest, ty);
    if (G.checkAch && (this.deepest !== d0 || this.highest !== h0)) G.checkAch();
  },
};
mixin(Player.prototype, PlayerMove, true);
