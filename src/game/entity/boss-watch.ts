/* ===== entity/boss-watch.ts — 얼음 감시자 — 얼음 유적의 망루 구조물 · 등롱 렌즈의 빛줄기에 걸리면 어깨 포탑이 쏜다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy, Proj } from '../entity.js';
/* ★ 정체성: '감시'가 공략이다 — 렌즈의 빛줄기(원뿔)가 플레이어 쪽을 훑고, 빛에 걸린 동안만 포탑이 쏜다. 블록 뒤에 숨으면 빛이 막힌다(시선 검사).
   막 2 에는 어깨 포탑 둘이 떨어져 나가 바닥에 세 다리로 서고(`iwtur` 위험 지대) 저마다 제 빛줄기로 따로 쏜다(계획 §3 `split`).
   빛줄기 방향은 시간과 가장 가까운 플레이어로만 정한다 — 참가자 화면도 같은 줄기를 그린다(따로 보내지 않는다).
   설계 좌표는 tools/mkbossrig.py watch_*(56×68 · 렌즈 (28, 15) · 어깨 (10, 25) · (46, 25) · 엉덩이 (19, 60) · (37, 60)). 사연: docs/code-history.md#h235 */

/** 설계 칸 표 — 그림(game/boss-watch-art)과 같은 수 */
export const IW = { K: 4, W: 56, H: 68, CX: 28, LENS: [28, 15], SEATS: [[10, 24.8], [46, 24.8]] as [number, number][], HIPS: [19, 37], HIP_Y: 60, LEG: 29.6,
  BEAM: 560, HALF: 0.16, TBEAM: 420, THALF: 0.2 };

/** 빛줄기 방향 — 가장 가까운 플레이어 쪽에서 시간 따라 좌우로 훑는다(호스트 · 참가자가 같게 잰다) */
export function beamAim(x: number, y: number, T: number, sd: number, amp: number, rate: number): number {
  const q = G.hzNear(x, y), base = q ? Math.atan2(q.cy - y, q.cx - x) : Math.PI / 2;
  return base + Math.sin(T * rate + sd) * amp;
}
/** 빛에 걸렸나 — 원뿔 안 · 거리 안 · 블록에 막히지 않음 */
export function inBeam(x: number, y: number, a: number, len: number, half: number, q: any): boolean {
  if (!q) return false;
  const dx = q.cx - x, dy = q.cy - y, d = Math.hypot(dx, dy);
  if (d > len) return false;
  const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - a), Math.cos(Math.atan2(dy, dx) - a));
  if (Math.abs(da) > half) return false;
  const w = G.world;
  for (let s = 24; s < d - 12; s += 10) if (w.solid(Math.floor((x + dx * s / d) / TS), Math.floor((y + dy * s / d) / TS))) return false;
  return true;
}

export const BossWatch: Bag & ThisType<Enemy> = {
  /** 렌즈 자리(세계 px) */
  iwLens(): [number, number] { const o = this.iwOrigin(); return [o[0] + IW.LENS[0] * IW.K, o[1] + IW.LENS[1] * IW.K]; },
  /** 몸 시트 왼쪽 위(세계 px) — 발이 판정 바닥에 닿게 */
  iwOrigin(): [number, number] { return [this.cx - IW.CX * IW.K, this.y + this.h - (IW.HIP_Y + IW.LEG) * IW.K - (this.iwBob || 0)]; },
  /** 몸놀림 — 거리를 두고 걷는다 · 빛줄기가 훑는다 · 빛에 걸리면 포탑이 쏜다 */
  iwAI(dt: number, world: World, p: Player) {
    const T = G.time || 0, dx = p.cx - this.cx, ad = Math.abs(dx);
    const want = ad > 330 ? Math.sign(dx) : ad < 190 ? -Math.sign(dx) * 0.6 : 0;
    this.vx = lerp(this.vx, want * this.spd!, dt * 2);
    if (Math.abs(dx) > 8) this.facing = Math.sign(dx);
    this.iwStep = (this.iwStep || 0) + Math.abs(this.vx) * dt / 46;
    this.iwBob = Math.abs(Math.sin(this.iwStep * Math.PI)) * 5 * Math.min(1, Math.abs(this.vx) / 40);
    /* 감시 — 빛에 걸린 정도(0~1) */
    const [lx, ly] = this.iwLens(), a = beamAim(lx, ly, T, 0, 0.5, 0.9 + (this.pf || 0) * 0.4), q = G.hzNear(lx, ly);
    this.iwAim = a;
    this.iwSeen = Math.max(0, Math.min(1, (this.iwSeen || 0) + (inBeam(lx, ly, a, IW.BEAM, IW.HALF, q) ? dt * 5 : -dt * 2)));
    /* 어깨 포탑 — 빛에 걸린 동안 번갈아 쏜다(떨어져 나간 뒤엔 바닥 포탑이 맡는다) */
    this.iwFire = (this.iwFire ?? 1) - dt;
    if (!this.iwFree && q && this.iwSeen > 0.6 && this.iwFire <= 0 && !(this.mv && this.mv.d)) {
      this.iwFire = 0.75;
      const side = (this.iwSide = 1 - (this.iwSide || 0)), o = this.iwOrigin(), [sx, sy] = IW.SEATS[side];
      const mx = o[0] + sx * IW.K, my = o[1] + sy * IW.K - 70, ang = Math.atan2(q.cy - my, q.cx - mx);
      G.projs.push(new Proj(mx, my, Math.cos(ang) * 430, Math.sin(ang) * 430, this.dmg * 0.45, 'enemy', 'frost'));
      this.iwKick = { side, t: T };
    }
    this.move(dt, world);
  },
  /** 막 2 — 어깨 포탑 둘이 떨어져 나가 양옆 바닥에 선다 */
  iwDetach() {
    if (this.iwFree) return;
    this.iwFree = 1;
    const o = this.iwOrigin();
    IW.SEATS.forEach(([sx, sy], i) => {
      const s = i === 0 ? -1 : 1, tx = this.cx + s * (220 + Math.random() * 60), fy = this.floorY(tx, this.y);
      this.hz({ k: 'iwtur', x: tx, y: fy, fx0: o[0] + sx * IW.K, fy0: o[1] + sy * IW.K, life: 9999, ref: this, nid: this.nid, sd: i * 2.1, c: '#9fe0ff', fire: 1 + i * 0.5 });
    });
  },
};

mixin(Enemy.prototype, BossWatch, true);
