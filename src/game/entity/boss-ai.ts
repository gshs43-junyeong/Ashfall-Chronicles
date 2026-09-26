// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== entity/boss-ai.js — 적 — 보스 AI ===== */
import { app as G, ui as UI } from '../ctx.js';
import { TAU, angleTo, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { WH, WW } from '../size.js';
import { T } from '../data.js';
import { TS } from '../world.js';
import { Enemy, Part, Proj } from '../entity.js';
/* entity.js 의 Enemy 에서 나눈 조각 — 읽히는 순간 Enemy.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다). */

export const BossAI = {

  /* ---- 보스 AI ---- */
  bossAI(dt, world, p, dx, dy, dd) {
    const AI = this.def.ai;
    this.stateT -= dt;
    const hpr = this.hp / this.maxHp;
    /* ★ pf 를 같이 둔다 — 0(첫 페이즈)에서 1(마지막)까지의 **비율**이다 — 사연: docs/code-history.md#h36 */
    const nph = this.phases;
    this.phase = Math.min(nph - 1, Math.floor((1 - hpr) * nph));
    this.pf = nph > 1 ? this.phase / (nph - 1) : 0;
    /* 페이즈가 올라가는 순간을 연출로 알린다. */
    if (this.phase > this.lastPhase) {
      this.lastPhase = this.phase;
      this.phaseT = 0.7;
      this.onPhaseChange(this.phase, world, p);
    }
    this.phaseT = (this.phaseT || 0) - dt;
    if (this.phaseInv > 0) this.phaseInv -= dt;
    this.tickWeak(dt, world, p);

    /* 힘 축적 — 모으는 중이면 여기서 돌아선다. */
    if (this.tickSurge(dt, world, p)) { this.stateT += dt; return; }

    if (AI === 'b_slime') {
      if (this.onGround) {
        this.vx *= 0.86;
        /* 2페이즈 — 껍데기가 굳는다(onPhaseChange 에서 guard=1). */
        if (this.lastPh() && this.landT !== 1) {
          this.landT = 1; this.guard = 0; this.openT = 0.9;
          G.ringFx(this.cx, this.cy, this.w * 0.9, '#9fe0ff', .4);
        }
        if (this.jumpCd <= 0) {
          this.landT = 0;
          /* 2페이즈는 일부러 느리게 뛴다. */
          this.jumpCd = this.lastPh() ? 2.2 : 1.5 - this.pf * 0.7;
          this.vy = -680 - this.pf * 120;
          this.vx = Math.sign(dx) * (200 + this.pf * 140);
          if (Math.random() < 0.35 + this.pf * 0.4) {
            for (let i = 0; i < 2 + this.pf * 2; i++) {
              const e = new Enemy('slime', this.cx + (Math.random() - 0.5) * 60, this.y, G.scale());
              e.vy = -300; G.ents.push(e);
            }
          }
        }
      }
      this.move(dt, world);
    } else if (AI === 'b_bone') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3; this.stateT = this.state === 1 ? 2.2 : 2.6;
        if (this.state === 2) for (let i = 0; i < 2 + this.pf * 2; i++) G.ents.push(new Enemy(Math.random() < .5 ? 'skeleton' : 'archer', this.cx + (Math.random() - 0.5) * 200, this.cy - 30, G.scale()));
      }
      if (this.state === 0) {           // 추격
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd, dt * 3);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.6, dt * 3);
      } else if (this.state === 1) {    // 뼈 투척
        this.vx *= 0.94; this.vy = lerp(this.vy, -20, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.35 - this.pf * 0.12;
          const a = angleTo(this.cx, this.cy, p.cx, p.cy) + (Math.random() - 0.5) * 0.4;
          G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 470, Math.sin(a) * 470, this.dmg * 0.7, 'enemy', 'bone'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_heart') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = this.state === 0 ? 3.2 : this.state === 1 ? 1.6 : 2.4;
        if (this.state === 1) { this.dashA = angleTo(this.cx, this.cy, p.cx, p.cy); }
        if (this.state === 2) for (let i = 0; i < 1 + this.pf * 2; i++) G.ents.push(new Enemy('shadoweye', this.cx + (Math.random() - 0.5) * 220, this.cy, G.scale()));
      }
      if (this.state === 0) {
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 0.7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 0.7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 1.1 - this.pf * 0.5;
          const n = 8 + this.pf * 8;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + G.time;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 280, Math.sin(a) * 280, this.dmg * 0.55, 'enemy', 'dark'));
          }
        }
      } else if (this.state === 1) {
        this.vx = Math.cos(this.dashA) * this.spd * 3.4; this.vy = Math.sin(this.dashA) * this.spd * 3.4;
      } else { this.vx *= 0.92; this.vy *= 0.92; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_witch') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4; this.stateT = 2.4;
        if (this.state === 0) {   // 순간이동
          const a = Math.random() * TAU, r = 200;
          this.x = clamp(p.cx + Math.cos(a) * r, TS * 2, WW * TS - TS * 3);
          this.y = p.cy + Math.sin(a) * r - 60;
          for (let i = 0; i < 24; i++) G.parts.push(new Part(this.cx, this.cy, '#a8dcf0'));
        }
        if (this.state === 2) {
          for (let i = 0; i < 1 + this.pf * 2; i++) G.ents.push(new Enemy('frostling', this.cx + (Math.random() - 0.5) * 240, this.cy, G.scale()));
        }
      }
      if (this.state === 1) {      // 얼음창 세례
        if (this.atkCd <= 0) {
          this.atkCd = 0.45 - this.pf * 0.2;
          const n = 3 + this.pf * 2;
          const base = angleTo(this.cx, this.cy, p.cx, p.cy);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.22;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 420, Math.sin(a) * 420, this.dmg * 0.6, 'enemy', 'frost'));
          }
        }
      } else if (this.state === 3) { // 서리 폭발 추적
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 1.4, dt * 3);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 1.4, dt * 3);
        if (this.atkCd <= 0) {
          this.atkCd = 1.4;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 240, Math.sin(a) * 240, this.dmg * 0.5, 'enemy', 'frost'));
          }
        }
      } else { this.vx *= 0.9; this.vy = lerp(this.vy, Math.sin(G.time * 2) * 30, dt * 2); }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_void') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4; this.stateT = 2.6 - this.pf * 0.6;
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++) G.ents.push(new Enemy('wraith', this.cx + (Math.random() - 0.5) * 320, this.cy, G.scale()));
      }
      if (this.state === 0) {          // 나선탄
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 0.6, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 0.6, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.16;
          const a = G.time * 5;
          for (let k = 0; k < 3; k++)
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a + k * TAU / 3) * 300, Math.sin(a + k * TAU / 3) * 300, this.dmg * 0.45, 'enemy', 'void'));
        }
      } else if (this.state === 1) {   // 추적 레이저 탄
        this.vx *= 0.9; this.vy *= 0.9;
        if (this.atkCd <= 0) {
          this.atkCd = 0.5;
          const a = angleTo(this.cx, this.cy, p.cx, p.cy);
          for (let i = -2; i <= 2; i++) {
            const pr = new Proj(this.cx, this.cy, Math.cos(a + i * 0.13) * 520, Math.sin(a + i * 0.13) * 520, this.dmg * 0.55, 'enemy', 'void');
            G.projs.push(pr);
          }
        }
      } else if (this.state === 2) {   // 돌진
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * 3, dt * 4);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * 3, dt * 4);
      } else { this.vx *= 0.92; this.vy *= 0.92; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_storm') {
      /* 폭풍의 수호자 — 상하 급강하 + 회전 돌풍 + 바람 정령 소환 */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = this.state === 1 ? 1.5 : 2.4 - this.pf * 0.5;
        if (this.state === 1) this.dashA = angleTo(this.cx, this.cy, p.cx, p.cy);
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++)
          G.ents.push(new Enemy(Math.random() < .5 ? 'gale' : 'sky_sentry', this.cx + (Math.random() - 0.5) * 300, this.cy, G.scale()));
      }
      if (this.state === 0) {            // 회전 돌풍
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd * .7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd * .7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.22;
          const n = 5 + this.pf * 4, base = G.time * 4;
          for (let i = 0; i < n; i++) {
            const a = base + (i / n) * TAU;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 330, Math.sin(a) * 330, this.dmg * 0.42, 'enemy', 'wind'));
          }
        }
      } else if (this.state === 1) {     // 급강하
        this.vx = Math.cos(this.dashA) * this.spd * 3.6;
        this.vy = Math.sin(this.dashA) * this.spd * 3.6;
      } else if (this.state === 2) {     // 벼락 세례
        this.vx *= 0.9; this.vy = lerp(this.vy, -30, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.5 - this.pf * 0.2;
          for (let i = 0; i < 3 + this.pf * 2; i++) {
            const px2 = p.cx + (Math.random() - 0.5) * 340;
            G.pending.push({
              t: i * 0.06, fn: () => {
                const pr = new Proj(px2, p.cy - 420, 0, 780, this.dmg * 0.5, 'enemy', 'bolt');
                G.projs.push(pr);
              }
            });
          }
        }
      } else { this.vx *= 0.92; this.vy *= 0.92; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_keeper') {
      /* 최초의 파수꾼 — 지상 보스. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 2.8 - this.pf * 0.6;
        if (this.state === 3) for (let i = 0; i < 1 + this.pf * 2; i++)
          G.ents.push(new Enemy(this.def.minion || 'ruin_guard', this.cx + (Math.random() - 0.5) * 260, this.cy - 20, G.scale()));
      }
      if (this.state === 0) {            // 룬 광선 (부채꼴)
        this.vx *= 0.86;
        if (this.atkCd <= 0) {
          this.atkCd = 0.9 - this.pf * 0.36;
          const base = angleTo(this.cx, this.cy, p.cx, p.cy);
          const n = 5 + this.pf * 4;
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.17;
            const pr = new Proj(this.cx, this.cy, Math.cos(a) * 460, Math.sin(a) * 460, this.dmg * 0.5, 'enemy', 'rune');
            G.projs.push(pr);
          }
        }
      } else if (this.state === 1) {     // 추격
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd, dt * 3);
        if (this.onGround && (dy < -40 || this.hitWall)) this.vy = -560;
      } else if (this.state === 2) {     // 지진 돌진
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 2.6, dt * 4);
        if (this.onGround && this.atkCd <= 0) {
          this.atkCd = 0.7;
          G.shake = Math.max(G.shake, 10);
          for (let i = 0; i < 8; i++) {
            const a = -Math.PI * (0.15 + Math.random() * 0.7);
            G.projs.push(new Proj(this.cx, this.cy + this.h / 2, Math.cos(a) * 260, Math.sin(a) * 260, this.dmg * 0.4, 'enemy', 'bone'));
          }
        }
      } else this.vx *= 0.9;
      this.move(dt, world);
    } else if (AI === 'b_pursuer') {
      /* 종장 — 별을 쫓아온 것. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 3.0 - this.pf * 0.8;
        if (this.state === 1) {
          this.x = clamp(p.cx + (Math.random() < .5 ? -170 : 170), TS * 3, WW * TS - TS * 3) - this.w / 2;
          this.y = p.cy - this.h;
          G.shake = Math.max(G.shake, 12);
          for (let i = 0; i < 26; i++) G.parts.push(new Part(this.cx, this.cy, '#a06fff', -40, 1.1));
        }
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++)
          G.ents.push(new Enemy(this.def.minion || 'wraith', this.cx + (Math.random() - 0.5) * 300, this.cy - 30, G.scale()));
      }
      if (this.state === 0) {            // 공허 탄막 — 천천히 돌아가는 나선
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.5, dt * 2);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.4, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.28 - this.pf * 0.1;
          this.spin = (this.spin || 0) + 0.55;
          const n = 3 + this.pf * 2;
          for (let i = 0; i < n; i++) {
            const a = this.spin + i * TAU / n;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 330, Math.sin(a) * 330, this.dmg * 0.42, 'enemy', 'void'));
          }
        }
      } else if (this.state === 1) {     // 강타 — 플레이어를 향해 가속, 닿으면 폭발
        const a = angleTo(this.cx, this.cy, p.cx, p.cy);
        this.vx = lerp(this.vx, Math.cos(a) * this.spd * 2.4, dt * 5);
        this.vy = lerp(this.vy, Math.sin(a) * this.spd * 2.4, dt * 5);
        if (this.atkCd <= 0) {
          this.atkCd = 1.1;
          const n = 10 + this.pf * 8;
          for (let k = 0; k < n; k++) {
            const ang = k * TAU / n;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(ang) * 250, Math.sin(ang) * 250, this.dmg * 0.38, 'enemy', 'dark'));
          }
        }
      } else if (this.state === 2) {     // 잿비 — 머리 위에서 쏟아진다
        this.vx = lerp(this.vx, 0, dt * 3);
        this.vy = lerp(this.vy, -30, dt * 3);
        if (this.atkCd <= 0) {
          this.atkCd = 0.16 - this.pf * 0.06;
          const px = p.cx + (Math.random() - 0.5) * 620;
          G.projs.push(new Proj(px, this.cy - 260, (Math.random() - 0.5) * 40, 420, this.dmg * 0.34, 'enemy', 'bone'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    } else if (AI === 'b_prolif') {
      /* 증식체 — 뛰지 않는다. */
      this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.35, dt * 2);
      if (this.stateT <= 0) {
        this.stateT = 2.4 - this.pf * 0.8;
        const kids = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === (this.def.minion || 'splitter')).length;
        if (kids < 3 + this.pf * 2) {                    // 쵸크 금지 — 한 번에 셋까지
          const n = 1 + this.pf * 2;
          for (let i = 0; i < n; i++) {
            const e = new Enemy(this.def.minion || 'splitter',
              this.cx + (i - (n - 1) / 2) * 46, this.cy, G.scale());
            e.vy = -220; e.vx = (i - (n - 1) / 2) * 90;
            G.ents.push(e);
          }
          G.ringFx(this.cx, this.cy, this.w, '#9a8a76', .4);
        }
      }
      if (this.lastPh()) {
        // 갈라진 것이 다 없어지면 핵이 드러난다 — 그때만 제대로 들어간다
        const kids = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === (this.def.minion || 'splitter')).length;
        const open = kids === 0;
        if (open && this.guard) { this.guard = 0; G.toast(tr('핵이 드러났다'), 'good'); }
        else if (!open && !this.guard) this.guard = 1;
      }
      if (this.atkCd <= 0 && dd < 320) {
        this.atkCd = 1.4;
        const a = angleTo(this.cx, this.cy, p.cx, p.cy);
        G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 340, Math.sin(a) * 340, this.dmg * 0.5, 'enemy', 'bolt'));
      }
      this.move(dt, world);

    } else if (AI === 'b_overseer') {
      /* 공창의 관리자 — 파수꾼의 룬 광선이 아니라 **단말로 명령을 내린다**. 제가 직접 때리는 일이 거의 없고, 방 안의 기계를 깨워 대신 싸우게 한다. */
      this.term = (this.term || 0) + dt;
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = 3.0 - this.pf * 0.8;
        if (this.state === 0) G.toast(tr('관리자가 명령을 내린다'), 'bad');
      }
      if (this.state === 0) {                    // 명령 — 바닥에서 압착기가 솟는다
        this.vx *= 0.9;
        if (this.atkCd <= 0) {
          this.atkCd = 0.55 - this.pf * 0.16;
          const fx = p.cx + (Math.random() - 0.5) * 260;
          G.warnFx(fx, p.cy + 20, 34, 0.6, '#c8843a');
          G.pending.push({ t: 0.6, fn: () => {
            G.aoe(fx, p.cy + 20, 40, this.dmg * 0.6, 6, '#c8843a');
            for (let k = 0; k < 8; k++) G.parts.push(new Part(fx, p.cy + 20, '#c8843a', -160, .6));
          } });
        }
      } else if (this.state === 1) {             // 물러서며 재장전 — 유일하게 붙을 틈
        this.vx = lerp(this.vx, -Math.sign(dx) * this.spd * 0.9, dt * 3);
      } else {                                   // 호출
        this.vx *= 0.92;
        if (this.atkCd <= 0) {
          this.atkCd = 1.6;
          const kids = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === (this.def.minion || 'riveter')).length;
          if (kids < 3) G.ents.push(new Enemy(this.def.minion || 'riveter',
            this.cx + (Math.random() - 0.5) * 220, this.cy - 20, G.scale()));
        }
      }
      this.move(dt, world);

    } else if (AI === 'b_hepha') {
      /* 헤파 — 컨베이어 위에 서 있는 것. */
      this.vx *= 0.88;
      // 컨베이어 — 가까이 있으면 계속 끌려온다
      if (dd < 420) p.vx += Math.sign(this.cx - p.cx) * 150 * dt;
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = 2.6 - this.pf * 0.7;
      }
      if (this.state === 0) {                    // 팔 휘두르기 — 좌우로 퍼지는 충격
        if (this.atkCd <= 0) {
          this.atkCd = 0.9 - this.pf * 0.3;
          for (const dir of [-1, 1]) for (let k = 0; k < 4; k++) {
            const x = this.cx + dir * (50 + k * 44);
            G.pending.push({ t: k * 0.06, fn: () => {
              G.aoe(x, this.y + this.h - 12, 34, this.dmg * 0.45, 5, '#c8a05a');
              for (let i = 0; i < 3; i++) G.parts.push(new Part(x, this.y + this.h - 6, '#c8a05a', -140, .5));
            } });
          }
        }
      } else if (this.state === 1) {             // 불티 — 위로 뿌려 떨어뜨린다
        if (this.atkCd <= 0) {
          this.atkCd = 0.4;
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
          const pr = new Proj(this.cx, this.cy - 20, Math.cos(a) * 320, Math.sin(a) * 420, this.dmg * 0.4, 'enemy', 'fire');
          pr.grav = 300; G.projs.push(pr);
        }
      }
      if (this.lastPh() && this.guard) {
        /* 정지 핵을 들고 붙어 있으면 열린다. */
        const held = p.held();
        if (held && held.id === 'stop_core' && dd < 90) {
          this.stopT = (this.stopT || 0) + dt;
          for (let i = 0; i < 2; i++) G.parts.push(new Part(this.cx, this.cy, '#9fd4ff', -40, .5));
          if (this.stopT > 1.2) { this.guard = 0; G.toast(tr('정지 핵이 물렸다 — 지금이다'), 'good'); G.shake = 12; }
        } else this.stopT = 0;
      }
      this.move(dt, world);

    } else if (AI === 'b_arche') {
      /* 원형 — 사람을 본떠 만든 첫 번째 것. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3;
        this.stateT = this.state === 1 ? 1.5 : 2.2;
        if (this.state === 1) { this.combo = 0; this.atkCd = 0.2; }
      }
      if (this.state === 1) {                    // 연격 — 세 번 파고든다
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 2.2, dt * 6);
        if (this.atkCd <= 0 && this.combo < 3) {
          this.combo++; this.atkCd = 0.42;
          G.aoe(this.cx + Math.sign(dx) * 44, this.cy, 52, this.dmg * 0.8, 7, '#e8dcc0');
          G.shake = Math.max(G.shake, 6);
        }
      } else if (this.state === 0) {             // 겨눔 — 천천히 붙는다
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.6, dt * 3);
        if (this.onGround && dy < -50) this.vy = -580;
      } else {                                   // 숨 고르기 — 붙을 틈
        this.vx *= 0.86;
      }
      if (this.lastPh() && this.guard) {
        // 받침대(제단석)를 다 깨면 열린다.
        const ped = G.ents.filter(e => e instanceof Enemy && !e.dead && e.type === 'draft_form').length;
        if (!ped) { this.guard = 0; G.toast(tr('받침대가 무너졌다'), 'good'); }
      }
      this.move(dt, world);

    } else if (AI === 'b_restorer') {
      /* 부유 성채의 환원기 — 지금까지 나온 무엇보다 세다. */
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 4;
        this.stateT = 2.6 - this.pf * 0.7;
        if (this.state === 3) for (let i = 0; i < 2 + this.pf * 2; i++)
          G.ents.push(new Enemy(this.def.minion || 'orbit_sentry', this.cx + (Math.random() - 0.5) * 320, this.cy - 20, G.scale()));
      }
      // --- 해체: 상태와 무관하게 늘 돈다. 위상이 오를수록 반경과 속도가 커진다 ---
      this.unmakeCd = (this.unmakeCd || 0) - dt;
      if (this.unmakeCd <= 0) {
        this.unmakeCd = 0.30 - this.pf * 0.14;
        const R = 6 + this.pf * 6;
        const bx = Math.floor(this.cx / TS), by = Math.floor(this.cy / TS);
        for (let k = 0; k < 5 + this.pf * 6; k++) {
          const a = Math.random() * TAU, r = Math.random() * R;
          const tx = bx + Math.round(Math.cos(a) * r), ty = by + Math.round(Math.sin(a) * r);
          if (tx < 2 || ty < 2 || tx >= WW - 2 || ty >= WH - 2) continue;
          const t = world.get(tx, ty);
          // 기반암과 제단석은 남긴다 — 싸울 자리 자체가 사라지면 싸움이 성립하지 않는다
          if (t === T.AIR || t === T.BEDROCK || t === T.ALTARSTONE) continue;
          world.set(tx, ty, T.AIR);
          if (Math.random() < 0.5) G.parts.push(new Part(tx * TS + 11, ty * TS + 11, '#a8c8e8', -20, 0.8));
        }
      }
      if (this.state === 0) {            // 궤도 탄막 — 회전하는 별 다발
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd * 0.5, dt * 2);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd * 0.4, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.24 - this.pf * 0.08;
          this.spin = (this.spin || 0) + 0.42;
          const n = 4 + this.pf * 4;
          for (let i = 0; i < n; i++) {
            const a = this.spin + i * TAU / n;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 360, Math.sin(a) * 360, this.dmg * 0.36, 'enemy', 'star'));
          }
        }
      } else if (this.state === 1) {     // 끌어올림 — 플레이어를 위로 잡아당기며 접근
        const a = angleTo(this.cx, this.cy, p.cx, p.cy);
        this.vx = lerp(this.vx, Math.cos(a) * this.spd * 1.8, dt * 4);
        this.vy = lerp(this.vy, Math.sin(a) * this.spd * 1.8, dt * 4);
        if (dd < 420) p.vy -= 320 * dt;   // 발이 자꾸 뜬다
        if (this.atkCd <= 0) {
          this.atkCd = 0.9;
          G.shake = Math.max(G.shake, 8);
        }
      } else if (this.state === 2) {     // 낙하 유도 — 머리 위에서 쏟아진다
        this.vx = lerp(this.vx, 0, dt * 3);
        this.vy = lerp(this.vy, -40, dt * 3);
        if (this.atkCd <= 0) {
          this.atkCd = 0.14 - this.pf * 0.06;
          const px = p.cx + (Math.random() - 0.5) * 700;
          G.projs.push(new Proj(px, this.cy - 280, (Math.random() - 0.5) * 50, 460, this.dmg * 0.30, 'enemy', 'star'));
        }
      } else { this.vx *= 0.9; this.vy *= 0.9; }
      this.move(dt, world, { gravMul: 0 });
    }
  },
};
mixin(Enemy.prototype, BossAI, true);
