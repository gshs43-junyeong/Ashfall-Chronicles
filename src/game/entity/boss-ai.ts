/* ===== entity/boss-ai.js — 적 — 보스 AI ===== */
import { app as G, ui as UI } from '../ctx.js';
import { TAU, angleTo, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { dimsOf } from '../size.js';
import { T } from '../data.js';
import { TS } from '../world.js';
import { Enemy, Part, Proj } from '../entity.js';
/* entity.js 의 Enemy 에서 나눈 조각 — 읽히는 순간 Enemy.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다). */

export const BossAI: Bag & ThisType<Enemy> = {

  /* ---- 보스 AI ---- */
  bossAI(dt: number, world: World, p: Player, dx: number, dy: number, dd: any) { const { WW, WH } = dimsOf(world);
    const AI = this.def.ai;
    this.stateT -= dt;
    const hpr = this.poolRatio();                     // 갈라진 둘은 합쳐서 잰다(entity/boss-forms)
    /* ★ pf 를 같이 둔다 — 0(첫 페이즈)에서 1(마지막)까지의 **비율**이다 — 사연: docs/code-history.md#h36 */
    const nph = this.phases;
    this.phase = Math.max(this.lastPhase || 0, Math.min(nph - 1, Math.floor((1 - hpr) * nph)));
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
    this.formTick(dt, p);                              // 막의 시간 · 날아오른 몸의 높이

    /* 잿빛 고치 — 매달린 자리 · 돌진은 틈 · 기술 중에도 매 프레임 매긴다(entity/boss-cocoon) */
    if (AI === 'b_cocoon' && !this.cocoonMoveTick(dt) && !this.cocMoth) this.cocoonHang(dt, world);
    /* 틈 — 기술 뒤 비틀거리는 동안은 몸놀림을 멈춘다(entity/boss-gaps) */
    if (this.tickGap(dt, world)) { this.stateT += dt; return; }
    /* 힘 축적 — 모으는 중이면 여기서 돌아선다. */
    if (this.tickSurge(dt, world, p)) { this.stateT += dt; return; }
    /* 고유 기술 — 쓰는 동안 몸놀림은 쉰다(entity/boss-moves · data/bossmoves) */
    if (this.tickMoves(dt, world, p, dd)) { this.stateT += dt; return; }

    if (AI === 'b_cocoon') { if (this.cocMoth) this.cocoonAI(dt, world, p); }
    else if (AI === 'b_organ') this.organAI(dt, world, p);              // 뼈 오르간(entity/boss-organ)
    else if (AI === 'b_hourglass') this.hgAI(dt, world);              // 모래시계 거상(entity/boss-hourglass)
    else if (AI === 'b_hive') this.hvAI(dt, world, p);                // 곪은 벌집 어미(entity/boss-hive)
    else if (AI === 'b_root') this.rtAI(dt, world);                  // 뿌리 대성당(entity/boss-root)
    else if (AI === 'b_judge') this.jdAI(dt, world);                  // 판결석 좌상(entity/boss-judge)
    else if (AI === 'b_eclipse') this.ecAI(dt, world);                // 일식(entity/boss-eclipse)
    else if (AI === 'b_pool') this.poolAI(dt, world, p, dx);          // 잿물 군체(entity/boss-pool)
    else if (AI === 'b_spore') this.sqAI(dt, world, p);              // 포자 여왕 — 주름 · 균사 · 매달림(entity/boss-spore)
    else if (AI === 'b_watch') this.iwAI(dt, world, p);              // 얼음 감시자 — 빛줄기 · 포탑(entity/boss-watch)
    else if (AI === 'b_cart') {
      this.mhAI(dt, world, p);                                         // 갱도의 것 — 레일 위만 달리는 광차(entity/boss-cart)
    } else if (AI === 'b_bone') {
      if (this.stateT <= 0) {
        this.state = (this.state + 1) % 3; this.stateT = this.state === 1 ? 2.2 : 2.6;
        if (this.state === 2) for (let i = 0; i < 2 + this.pf * 2; i++) G.ents.push(new Enemy(Math.random() < .5 ? 'skeleton' : 'archer', this.cx + (Math.random() - 0.5) * 200, this.cy - 30, G.scale()));
      }
      if (this.state === 0) {           // 추격
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd!, dt * 3);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd! * 0.6, dt * 3);
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
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd! * 0.7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd! * 0.7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 1.1 - this.pf * 0.5;
          const n = 8 + this.pf * 8;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + G.time;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 280, Math.sin(a) * 280, this.dmg * 0.55, 'enemy', 'dark'));
          }
        }
      } else if (this.state === 1) {
        this.vx = Math.cos(this.dashA) * this.spd! * 3.4; this.vy = Math.sin(this.dashA) * this.spd! * 3.4;
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
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd! * 1.4, dt * 3);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd! * 1.4, dt * 3);
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
      this.vkAI(dt, world, p);                                         // 공허의 왕 — 뒷벽 망토(entity/boss-void)
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
        this.vx = lerp(this.vx, (dx / (dd || 1)) * this.spd! * .7, dt * 2);
        this.vy = lerp(this.vy, (dy / (dd || 1)) * this.spd! * .7, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.22;
          const n = 5 + this.pf * 4, base = G.time * 4;
          for (let i = 0; i < n; i++) {
            const a = base + (i / n) * TAU;
            G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 330, Math.sin(a) * 330, this.dmg * 0.42, 'enemy', 'wind'));
          }
        }
      } else if (this.state === 1) {     // 급강하
        this.vx = Math.cos(this.dashA) * this.spd! * 3.6;
        this.vy = Math.sin(this.dashA) * this.spd! * 3.6;
      } else if (this.state === 2) {     // 벼락 세례
        this.vx *= 0.9; this.vy = lerp(this.vy, -30, dt * 2);
        if (this.atkCd <= 0) {
          this.atkCd = 0.5 - this.pf * 0.2;
          for (let i = 0; i < 3 + this.pf * 2; i++) {
            const px2 = p.cx + (Math.random() - 0.5) * 340;
            G.after(i * 0.06, () => {
                const pr = new Proj(px2, p.cy - 420, 0, 780, this.dmg * 0.5, 'enemy', 'bolt');
                G.projs.push(pr);
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
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd!, dt * 3);
        if (this.onGround && (dy < -40 || this.hitWall)) this.vy = -560;
      } else if (this.state === 2) {     // 지진 돌진
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd! * 2.6, dt * 4);
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
    } else if (AI === 'b_prolif') {
      this.pfAI(dt, world, p, dx);                                     // 증식체 — 모듈이 떨어져 나가며 작아지고 빨라진다(entity/boss-prolif)

    } else if (AI === 'b_overseer') {
      this.ovAI(dt, world, p, dx);                                     // 공창의 관리자 — 지시봉 · 화면 얼굴 · 드론 거치대(entity/boss-overseer)

    } else if (AI === 'b_hepha') {
      this.hpAI(dt, world, p);                                         // 헤파 — 공장 앞면 · 화로 문 박자 · 기중기 팔(entity/boss-hepha)

    } else if (AI === 'b_arche') {
      this.arAI(dt, world, p, dx, dy);                                 // 원형 — 자 칼날 연격 · 흩어졌다 다시 모이는 몸(entity/boss-arche)

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
        this.vx = lerp(this.vx, Math.sign(dx) * this.spd! * 0.5, dt * 2);
        this.vy = lerp(this.vy, Math.sign(dy) * this.spd! * 0.4, dt * 2);
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
        this.vx = lerp(this.vx, Math.cos(a) * this.spd! * 1.8, dt * 4);
        this.vy = lerp(this.vy, Math.sin(a) * this.spd! * 1.8, dt * 4);
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
