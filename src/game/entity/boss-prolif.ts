/* ===== entity/boss-prolif.ts — 증식체 — 핵 하나에 꽂힌 모듈 덩어리 · 깎일수록 모듈이 떨어져 나가 기어 다니고, 핵은 작아지고 빨라진다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { Enemy, Part, Proj } from '../entity.js';
/* ★ 정체성(계획 §3 `split`): 쪼개질수록 작아지고 빨라진다. 체력 75 · 50 · 25% 에서 모듈 셋씩 떨어져 나가 따로 기는 증식 기계(splitter · `shed`)가 되고,
   핵은 0.82 → 0.68 → 0.55 배로 줄며 그만큼 빨라진다. 마지막 단계는 떨어져 나간 모듈이 다 쓰러져야 핵이 드러난다(guard).
   단계는 체력 비율로만 정한다 — 참가자 화면도 같은 모듈을 지우고 같은 크기로 줄인다(pfFit). 사연: docs/code-history.md#h237 */

/** 설계 칸 표 — 그림(game/boss-prolif-art)과 같은 수 · 모듈 자리는 핵 가운데 기준 [x, y, 갈래(0 판 · 1 포 · 2 피스톤 · 3 배기 · 4 다리)] */
export const PF = { K: 4, CORE: 32, MOD: 14,
  SLOTS: [[-14, -10, 0], [0, -15, 3], [14, -10, 1], [-18, 2, 2], [18, 2, 0], [-12, 14, 4], [12, 14, 4], [-6, -25, 0], [8, -25, 1], [-27, -7, 3], [27, -7, 2], [0, 17, 0]] as [number, number, number][],
  SHED: [[7, 8, 9], [10, 0, 2], [3, 4, 1]], SCALE: [1, 0.82, 0.68, 0.55], W0: 230, H0: 190, FOOT: 21 };

/** 체력 비율 → 단계 0~3 */
export const pfStage = (e: Bag) => { const r = e.hp / Math.max(1, e.maxHp); return r > 0.75 ? 0 : r > 0.5 ? 1 : r > 0.25 ? 2 : 3; };
/** 그 단계까지 떨어져 나간 모듈 자리 */
export const pfGone = (st: number) => { const g = new Set<number>(); for (let s = 0; s < st; s++) for (const i of PF.SHED[s]) g.add(i); return g; };

export const BossProlif: Bag & ThisType<Enemy> = {
  /** 크기를 단계에 맞춘다 — 발과 가운데는 그대로(호스트 · 참가자 둘 다) */
  pfFit(st: number) {
    const k = PF.SCALE[st], w = Math.round(PF.W0 * k), h = Math.round(PF.H0 * k);
    if (this.w === w && this.h === h) return;
    this.x += (this.w - w) / 2; this.y += this.h - h; this.w = w; this.h = h;
  },
  /** 모듈 하나의 세계 자리(가운데) */
  pfSlot(i: number): [number, number] {
    const k = PF.SCALE[this.pfSt || 0], [dx, dy] = PF.SLOTS[i];
    return [this.cx + dx * PF.K * k, this.y + this.h - PF.FOOT * PF.K * k + dy * PF.K * k];
  },
  /** 몸놀림 — 기어서 다가선다(작을수록 빠르다) · 포 모듈이 리벳을 쏜다 · 단계가 오르면 모듈이 떨어져 나간다 */
  pfAI(dt: number, world: World, p: Player, dx: number) {
    const st = pfStage(this);
    if (this.pfSt === undefined) { this.pfSt = this.twin ? st : 0; this.pfFit(this.pfSt); }   // 복제된 짝(boss-forms splitBoss)은 이미 떨어진 모듈을 다시 떨구지 않는다
    while (this.pfSt < st) { this.pfSt++; this.pfShed(this.pfSt); }
    this.pfFit(this.pfSt);
    const k = PF.SCALE[this.pfSt];
    this.vx = lerp(this.vx, Math.sign(dx) * this.spd! * 0.42 / k, dt * 2.4);
    if (this.onGround && Math.abs(this.vx) > 40 && Math.random() < dt * (0.4 / k)) this.vy = -240 / Math.sqrt(k);   // 작아질수록 자주 튄다
    /* 포 모듈 — 남은 포가 번갈아 쏜다 */
    this.atkCd = this.atkCd ?? 1;
    if (this.atkCd <= 0 && Math.abs(dx) < 520) {
      const gone = pfGone(this.pfSt), guns = PF.SLOTS.map((s, i) => i).filter(i => PF.SLOTS[i][2] === 1 && !gone.has(i));
      this.atkCd = 1.5 * k + 0.3;
      const from = guns.length ? this.pfSlot(guns[(this.pfShot = ((this.pfShot || 0) + 1) % guns.length)]) : [this.cx, this.cy];
      const a = Math.atan2(p.cy - from[1], p.cx - from[0]);
      G.projs.push(new Proj(from[0], from[1], Math.cos(a) * 360, Math.sin(a) * 360, this.dmg * 0.45, 'enemy', 'rivet'));
      this.pfKick = { t: G.time || 0 };
    }
    /* 마지막 단계 — 떨어져 나간 모듈이 살아 있는 동안 핵이 닫힌다 */
    if (this.pfSt >= 3) {
      const kids = G.ents.filter((e: any) => e instanceof Enemy && !e.dead && e.shedOf === this).length;
      if (!kids && this.guard) { this.guard = 0; G.toast(tr('핵이 드러났다'), 'good'); }
      else if (kids && !this.guard) this.guard = 1;
    }
    this.move(dt, world);
  },
  /** 단계 s 의 모듈 셋이 떨어져 나가 따로 기는 증식 기계가 된다 */
  pfShed(s: number) {
    for (const i of PF.SHED[s - 1]) {
      const [x, y] = this.pfSlot(i), e = new Enemy(this.def.minion || 'splitter', x - 14, y - 17, G.scale());
      e.shed = PF.SLOTS[i][2] + 1; e.shedOf = this;
      e.vx = Math.sign(x - this.cx || 1) * (220 + Math.random() * 120); e.vy = -320 - Math.random() * 120;
      G.ents.push(e);
      for (let k = 0; k < 8; k++) G.parts.push(new Part(x, y, k % 2 ? '#ffc860' : '#8a8478', -160, 0.6, { spd: 1.4 }));
    }
    G.shake = Math.max(G.shake, 8);
    G.vfx.shock(this.cx, this.cy, this.w, '#ffc860', 0.4, 8);
  },
};

mixin(Enemy.prototype, BossProlif, true);
