/* ===== entity/boss-eclipse.ts — 일식(하늘에 뚫린 별의 음화) — 그림자 손 · 응시 · 두 손 · 개기일식 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TILE_DEF } from '../data.js';
import { TS } from '../world.js';
import { DmgText, Enemy } from '../entity.js';
/* 몸은 하늘 배경에 걸린 검은 원판이라 닿지 않는다 — 자리(hx, hy)는 싸움터 위 높은 하늘, 판정 상자는 평소 그 자리(받는 피해 ×0.3).
   그림자 손이 땅을 짚고 있는 동안만 판정 상자가 그 손으로 내려온다(받는 피해 ×1.3) — 피하고, 짚은 손을 친다.
   손은 원판 반대쪽으로 길게 누운 플레이어 그림자의 끝에 내려온다(원판에서 멀수록 그림자가 길다).
   응시 · 개기일식은 빛 속에 선 플레이어만 견딘다 — 든 횃불 · 빛 물약 · 둘레의 센 빛 타일 · 코로나가 떨군 빛기둥. 사연: docs/code-history.md#h228 */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };
let hid = 0;
const nid = () => 8e6 + (hid = hid % 1e6 + 1);

/** 원판 그림(설계 136칸 · 가운데 68 · 반지름 36) — tools/mkbossrig.py eclipse_* 와 같게 */
export const EC = { W: 136, C: 68, R: 36, K: 4, SKY: 760 };
/** 이 플레이어가 빛 속에 있나 — 든 횃불 · 빛 버프 · 둘레 센 빛 타일(5 이상) · 빛기둥 */
export function ecLit(q: any, world: World): boolean {
  let it: any = null; try { it = q.held && q.held(); } catch (e) { it = null; }
  if (it && it.id === 'torch') return true;
  if (q.buffs && q.buffs.some((b: any) => b.id === 'lit' || b.id === 'lit_greater' || b.id === 'lantern')) return true;
  for (const h of G.bhz || []) if (h.k === 'elight' && h.t > h.tele && h.t < h.life - 0.3 && Math.abs(q.cx - h.x) < h.w / 2) return true;
  const tx = Math.floor(q.cx / TS), ty = Math.floor(q.cy / TS);
  for (let y = ty - 4; y <= ty + 4; y++) for (let x = tx - 5; x <= tx + 5; x++) { const d = TILE_DEF[world.get(x, y)]; if (d && (d.light || 0) >= 5) return true; }
  return false;
}
/** 그림자 끝 — 원판 반대쪽으로 누운 그림자의 길이(원판에서 멀수록 길다) */
export function shadowTip(e: Bag, q: { cx: number }): number {
  const d = q.cx - e.hx, dir = Math.sign(d) || 1;
  return q.cx + dir * Math.max(170, Math.min(470, Math.abs(d) * 0.35 + 150));
}
/** 그림자 손의 단계 — [높이 0(하늘)~1(땅), 단계 0 내려옴 · 1 내리침 · 2 짚음 · 3 올라감] */
export function handStage(h: Bag): [number, number] {
  if (h.t < h.tele) { const u = h.t / h.tele; return [0.55 * u * u, 0]; }
  const t = h.t - h.tele;
  if (t < 0.14) return [0.55 + 0.45 * (t / 0.14) ** 2, 1];
  if (t < 0.14 + h.plant) return [1, 2];
  return [Math.max(0, 1 - (t - 0.14 - h.plant) / h.lift), 3];
}

export const BossEclipse: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 하늘 자리는 플레이어들 가운데를 천천히 따라가고, 판정 상자는 짚은 손이 있으면 그 손으로 */
  ecAI(dt: number, world: World) {
    this.vx = this.vy = 0;
    if (!this.anchored) {
      this.anchored = 1; this.hx = this.cx;
      const tx = Math.floor(this.cx / TS);
      let fy = this.cy + 200;
      for (let ty = Math.floor(this.cy / TS) - 10; ty < Math.floor(this.cy / TS) + 40; ty++) if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { fy = ty * TS; break; }
      this.hy = fy - EC.SKY;
    }
    const live = G.players.filter((q: any) => !q.dead && q.hp > 0);
    if (live.length) { const ax = live.reduce((a: number, q: any) => a + q.cx, 0) / live.length; this.hx += (ax - this.hx) * Math.min(1, dt * 0.25); }
    const hand = this.ecPlanted();
    if (hand) { this.x = hand.tx - this.w / 2; this.y = hand.fy - this.h; }
    else { this.x = this.hx - this.w / 2; this.y = this.hy - this.h / 2; }
  },
  /** 땅을 짚고 있는 손 */
  ecPlanted() {
    for (const h of G.bhz || []) if (h.k === 'ehand' && (h.ref === this || h.nid === this.nid) && handStage(h)[1] === 2) return h;
    return null;
  },
  /** 받는 피해 — 짚은 손 ×1.3 · 하늘의 원판 ×0.3 */
  ecHurt(a: number) {
    if (this.ecPlanted()) return a * 1.3;
    if (Math.random() < 0.35) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 20, this.y - 10, tr('닿지 않는다'), '#b4a0d8', 0));
    return a * 0.3;
  },
  /** 그림자 손 하나 — q 의 그림자 끝(at 이 있으면 거기) */
  ecHand(q: any, m: number, K: Bag, at?: number, tele = 1.3) {
    const tx = at ?? shadowTip(this, q);
    return this.hz({ k: 'ehand', id: nid(), ref: this, nid: this.nid, tx, fy: G.hzFloor(tx, q.y), px: q.cx, tele, plant: 1.6 - this.pf * 0.4, lift: 0.7,
      life: tele + 0.14 + 1.6 + 0.7, dmg: this.dmg * m, c: K.c, sd: Math.random() * 99 });
  },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  ecSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'shand': {                                       // 그림자 손 — 길게 누운 그림자 끝에 하늘에서 손이 내려와 짚는다
        this.ecHand(p, m, K);
        G.sfxAt && G.sfxAt('ec_reach', p.cx / TS, p.cy / TS);
        return { busy: 1.6 };
      }
      case 'hands2': {                                      // 두 손 — 그림자 끝 하나, 그다음 지금 선 자리 하나(셋이면 반대쪽 그림자 끝도)
        const n = d.cnt || 2;
        this.ecHand(p, m, K);
        G.after(0.65, () => { if (!E.dead) E.ecHand(p, m, K, p.cx, 1.0); });
        if (n >= 3) G.after(1.3, () => { if (!E.dead) E.ecHand(p, m, K, p.cx - (shadowTip(E, p) - p.cx), 1.0); });
        G.sfxAt && G.sfxAt('ec_reach', p.cx / TS, p.cy / TS);
        return { busy: 1.2 + n * 0.65 };
      }
      case 'stare': {                                       // 응시 — 눈이 뜨고 코로나가 빛기둥을 떨군다 · 박동마다 빛 밖에 선 이를 태운다
        const pulses = d.pulses || 2, tele = 1.9, gap = 1.3;
        const xs = [p.cx + (Math.random() < 0.5 ? -1 : 1) * (130 + Math.random() * 90), p.cx + (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 120)];
        if (pulses >= 3) xs.push(p.cx + (Math.random() - 0.5) * 900);
        const life = tele + gap * (pulses - 1) + 1.0;
        for (const x of xs) this.hz({ k: 'elight', id: nid(), ref: this, nid: this.nid, x, fy: G.hzFloor(x, p.y), w: 120, tele: 0.7, life, c: K.c, sd: Math.random() * 99 });
        this.hz({ k: 'estare', id: nid(), ref: this, nid: this.nid, tele, gap, pulses, life, dmg: this.dmg * m, c: K.c });
        G.sfxAt && G.sfxAt('ec_open', p.cx / TS, p.cy / TS);
        return { busy: life };
      }
      case 'totality': {                                    // 개기일식 — 하늘이 다 가려진다. 제 빛 안만 산다 · 어둠 속으로 손이 내려온다
        const dur = 8;
        this.hz({ k: 'etotal', id: nid(), ref: this, nid: this.nid, tele: 1.6, life: 1.6 + dur, every: 0.8, dmg: this.dmg * m * 0.35, c: K.c });
        for (let i = 0; i < 4; i++) G.after(2.2 + i * 1.6, () => { if (!E.dead) { const q = G.hzNear(E.hx, E.hy + EC.SKY) || p; E.ecHand(q, m, K, undefined, 1.0); } });
        G.sfxAt && G.sfxAt('ec_total', p.cx / TS, p.cy / TS);
        return { busy: 1.6 + dur };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossEclipse, true);
