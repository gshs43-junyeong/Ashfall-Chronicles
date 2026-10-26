/* ===== entity/boss-hepha.ts — 헤파 · 최초의 기계 — 공장 건물째가 몸 · 화로 문이 박자에 맞춰 열릴 때만 핵이 드러난다 · 기중기 팔 둘 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TS } from '../world.js';
import { DmgText, Enemy, Part, Proj } from '../entity.js';
/* ★ 정체성(계획 §3): 화로 문이 열리는 박자 · 쇳물 국자를 든 팔. 건물 앞면은 뒷벽에 박혀 움직이지 않고(def.wall), 판정 상자는 화로 문(핵) 자리뿐이다.
   문이 열린 동안만 핵이 맞는다(닫히면 ×0.2 '문이 닫혀 있다') — 열리는 순간 불티를 뿜으니 그 박자에 파고든다. 마지막 마디의 정지 핵 규칙(guard)은 그대로.
   팔은 플레이어 쪽 바닥을 내리치고, 쇳물 붓기(pour) 땐 국자를 들어 그 자리에 붓는다(국자는 팔 끝에 — game/boss-hepha-art).
   설계 좌표는 tools/mkbossrig.py hepha_*(200×104 · 바닥 103 · 화로 문 82~118 × 56~103 · 팔 어깨 (62, 40) · (138, 40)). 사연: docs/code-history.md#h238 */

/** 설계 칸 표 — 그림(game/boss-hepha-art)과 같은 수 */
export const HP = { K: 4, W: 200, H: 104, CX: 100, BASE: 103, SH: [[62, 40], [138, 40]] as [number, number][], EYES: [[88, 25], [112, 25]] as [number, number][],
  CHIM: [[30, 3], [170, 3]] as [number, number][], UP: 32 * 4, LO: 29 * 4, REACH: 520 };

/** 화로 문 박자 — 닫힘 → 열림 → 열려 있음 → 닫힘(초) */
const doorBeat = (pf: number) => [3.0 - pf * 0.9, 0.45, 1.8 + pf * 0.3, 0.4];

export const BossHepha: Bag & ThisType<Enemy> = {
  /** 앞면 왼쪽 위(세계 px) */
  hpOrigin(): [number, number] { return [this.hpX0 ?? this.cx - HP.CX * HP.K, this.hpY0 ?? this.y + this.h - (HP.BASE + 1) * HP.K]; },
  /** 몸놀림 — 처음 한 번 앞면을 바닥에 건다 · 문 박자 · 컨베이어 · 팔 내리치기 · 정지 핵 */
  hpAI(dt: number, world: World, p: Player) {
    this.vx = this.vy = 0;
    if (!this.anchored) {
      this.anchored = 1;
      const tx = Math.floor(this.cx / TS);
      let fy = this.y + this.h;
      for (let ty = Math.floor(this.cy / TS) - 4; ty < Math.floor(this.cy / TS) + 40; ty++) if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { fy = ty * TS; break; }
      this.hpX0 = this.cx - HP.CX * HP.K; this.hpY0 = fy - (HP.BASE + 1) * HP.K;
      this.y = fy - this.h;
    }
    const T = G.time || 0, dx = p.cx - this.cx, dd = Math.hypot(dx, p.cy - this.cy);
    /* 화로 문 — 박자에 맞춰 열고 닫는다 · 열리는 순간 불티 */
    const beat = doorBeat(this.pf || 0);
    this.hpPh = this.hpPh ?? 0; this.hpT = (this.hpT ?? beat[0]) - dt;
    if (this.hpT <= 0) {
      this.hpPh = (this.hpPh + 1) % 4; this.hpT = beat[this.hpPh];
      if (this.hpPh === 2) {
        G.shake = Math.max(G.shake, 6);
        const n = 3 + Math.round((this.pf || 0) * 3);
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32 + (Math.random() - 0.5) * 0.2;
          const pr = new Proj(this.cx, this.y + 40, Math.cos(a) * 300, Math.sin(a) * 420, this.dmg * 0.4, 'enemy', 'fire');
          pr.grav = 320; G.projs.push(pr);
        }
        for (let i = 0; i < 16; i++) G.parts.push(new Part(this.cx + (Math.random() - 0.5) * 80, this.y + 60, i % 2 ? '#ffb050' : '#ff7a30', -200, 0.7, { spd: 1.3 }));
      }
    }
    const u = this.hpT / beat[this.hpPh];
    this.hpDoor = this.hpPh === 0 ? 0 : this.hpPh === 1 ? 1 - u : this.hpPh === 2 ? 1 : u;
    /* 컨베이어 — 가까이 있으면 화로 쪽으로 끌려온다 */
    if (dd < 460) p.vx += Math.sign(this.cx - p.cx) * 150 * dt;
    /* 팔 — 플레이어 쪽 팔이 바닥을 내리친다 */
    this.hpSlamT = (this.hpSlamT ?? 2.5) - dt;
    if (this.hpSlamT <= 0 && !(this.mv && this.mv.d) && Math.abs(dx) < HP.REACH) {
      this.hpSlamT = 3.4 - (this.pf || 0) * 1.0;
      const side = dx < 0 ? 0 : 1, fy = this.y + this.h;
      this.hpArm = { side, t: T, x: p.cx, y: fy };
      this.strike(p.cx, fy, { r: 60, delay: 0.7, fx: 'rock' }, { c: '#ffb050' }, 0.8);
      G.after(0.7, () => { if (!this.dead) for (const s of [-1, 1]) this.hz({ k: 'wave', x: p.cx + s * 30, y: fy, vx: s * 300, w: 24, hh: 24, life: 1.8, dmg: this.dmg * 0.4, c: '#ffb050', fx: 'molten', sd: Math.random() * 99 }); });
    }
    /* 마지막 마디 — 정지 핵을 들고 문 앞에 붙어 있으면 열린다(예전 규칙) */
    if (this.lastPh() && this.guard) {
      const held = p.held();
      if (held && held.id === 'stop_core' && dd < 120) {
        this.stopT = (this.stopT || 0) + dt;
        for (let i = 0; i < 2; i++) G.parts.push(new Part(this.cx, this.cy, '#9fd4ff', -40, .5));
        if (this.stopT > 1.2) { this.guard = 0; G.toast(tr('정지 핵이 물렸다 — 지금이다'), 'good'); G.shake = 12; }
      } else this.stopT = 0;
    }
  },
  /** 받는 피해 — 문이 열린 동안만 핵에 닿는다 */
  hpHurt(a: number) {
    if ((this.hpDoor || 0) > 0.6) return a;
    if (Math.random() < 0.3) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 30, this.y + 20, tr('문이 닫혀 있다'), '#c8a05a', 0));
    return a * 0.2;
  },
};

mixin(Enemy.prototype, BossHepha, true);
