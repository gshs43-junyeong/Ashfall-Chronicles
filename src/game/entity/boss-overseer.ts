/* ===== entity/boss-overseer.ts — 공창의 관리자 — 브라운관 얼굴의 감독 기계 · 지시봉이 가리킨 자리에 압착기가 솟는다 · 등의 드론 셋이 떨어져 나간다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { Enemy, Part } from '../entity.js';
/* ★ 제가 직접 때리는 일이 거의 없다 — 단말로 명령을 내리고(지시봉이 먼저 그 자리를 가리킨다 → 압착기) · 물러서며 재장전(유일하게 붙을 틈) · 보수 기계를 부른다.
   화면 얼굴이 상태를 말한다(명령 '!' · 재장전 막대 · 호출 전파) — 글 알림 없이 얼굴로 읽힌다(계획 §3: 드론 셋이 몸에서 떨어져 나간다).
   점검 드론(`drones` 기술)은 등 거치대에서 날아올라 훑고 돌아온다 — 나가 있는 동안 거치대가 빈다.
   설계 좌표는 tools/mkbossrig.py overseer_*(40×55 · 엉덩이 (15, 50) · (25, 50) · 어깨 (9, 25) · (31, 25) · 거치대 셋). 사연: docs/code-history.md#h239 */

/** 설계 칸 표 — 그림(game/boss-overseer-art)과 같은 수 · S 는 그리는 배율(1 이면 330px 라 머리가 화면 밖 · 방에 안 들어갔다) */
export const OV = { K: 4, S: 0.8, W: 40, H: 55, CX: 20, HIPS: [15, 25], HIP_Y: 50, LEG: 26, SH: [[9, 25], [31, 25]] as [number, number][],
  DOCKS: [[8, 7.6], [20, 3.2], [32, 7.6]] as [number, number][], SCREEN: [14.4, 9.2, 11.2, 8.4] };

export const BossOverseer: Bag & ThisType<Enemy> = {
  /** 몸 시트 왼쪽 위(세계 px) — 발이 판정 바닥에 */
  ovOrigin(): [number, number] { return [this.cx - OV.CX * OV.K * OV.S, this.y + this.h - ((OV.HIP_Y + OV.LEG) * OV.K + (this.ovBob || 0)) * OV.S]; },
  /** 드론 거치대 자리(세계 px) — 바라보는 쪽으로 뒤집힌다 */
  ovDock(i: number): [number, number] {
    const [ox, oy] = this.ovOrigin(), [dx, dy] = OV.DOCKS[i], s = this.facing || 1;
    return [this.cx + (dx - OV.CX) * OV.K * OV.S * s, oy + dy * OV.K * OV.S];
  },
  /** 몸놀림 — 명령(지시봉 → 압착기) · 물러서며 재장전 · 보수 호출 */
  ovAI(dt: number, world: World, p: Player, dx: number) {
    const T = G.time || 0;
    if (Math.abs(dx) > 10) this.facing = Math.sign(dx);
    if (this.stateT <= 0) {
      this.state = (this.state + 1) % 3;
      this.stateT = 3.0 - (this.pf || 0) * 0.8;
      if (this.state === 0) G.toast(tr('관리자가 명령을 내린다'), 'bad');
    }
    if (this.state === 0) {                                // 명령 — 지시봉이 가리킨 자리에 바닥 압착기가 솟는다
      this.vx *= 0.9;
      if (this.atkCd <= 0) {
        this.atkCd = 0.55 - (this.pf || 0) * 0.16;
        const fx = p.cx + (Math.random() - 0.5) * 260, fy = p.cy + 20;
        this.ovPoint = { x: fx, y: fy, t: T };
        G.warnFx(fx, fy, 34, 0.6, '#c8843a');
        G.after(0.6, () => {
          G.hitPlayers(fx, fy, 40, this.dmg * 0.6); G.ringFx(fx, fy, 40, '#c8843a', .3);   // ★ G.aoe 는 몹을 때린다 — 보스 공격은 플레이어에게
          for (let k = 0; k < 8; k++) G.parts.push(new Part(fx, fy, '#c8843a', -160, .6));
        });
      }
    } else if (this.state === 1) {                         // 물러서며 재장전 — 유일하게 붙을 틈
      this.vx = lerp(this.vx, -Math.sign(dx) * this.spd! * 0.9, dt * 3);
    } else {                                               // 호출 — 보수 기계
      this.vx *= 0.92;
      if (this.atkCd <= 0) {
        this.atkCd = 1.6;
        const kids = G.ents.filter((e: any) => e instanceof Enemy && !e.dead && e.type === (this.def.minion || 'riveter')).length;
        if (kids < 3) G.ents.push(new Enemy(this.def.minion || 'riveter', this.cx + (Math.random() - 0.5) * 220, this.cy - 20, G.scale()));
      }
    }
    this.ovStep = (this.ovStep || 0) + Math.abs(this.vx) * dt / 40;
    this.ovBob = Math.abs(Math.sin(this.ovStep * Math.PI)) * 4 * Math.min(1, Math.abs(this.vx) / 40);
    this.move(dt, world);
  },
};

mixin(Enemy.prototype, BossOverseer, true);
