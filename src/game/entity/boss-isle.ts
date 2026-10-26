/* ===== entity/boss-isle.ts — 섬을 든 것 — 등에 섬을 진 웅크린 돌 거인 · 섬이 발판이다 · 그 위에서 정수리를 친다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { DmgText, Enemy } from '../entity.js';
/* ★ 정체성(계획 §3): 등에 진 섬이 발판 — 그 위에 올라가 정수리를 친다. 거인은 이따금 모래 속으로 내려앉아 섬을 낮추고(`kneel` 위험 지대 — 참가자도 같은 때 · 게처럼 섬 밑에 숨는다),
   그때 뛰어올라 탄 사람은 섬과 함께 오르내린다(G.deckLand — 엔티티 이동 끝에서 섬 윗면에 세운다). 섬 위의 누군가가 있으면 정수리에 ×1.25,
   아니면 ×0.35('바위 껍질에 막힌다'). 섬 자리는 몸 상자에서만 잰다(참가자도 같다).
   설계 좌표는 tools/mkbossrig.py isle_*. 사연: docs/code-history.md#h245 */

/** 설계 칸 표 — 그림(game/boss-isle-art)과 같은 수 · 몸 가운데 36 · 오른쪽을 본다 */
export const IK = { K: 4, S: 1.2, W: 72, H: 60, CX: 36, FOOT: 59, BACK: [32, 20], ARMS: [[52, 28], [44, 30]] as [number, number][], CROWN: [58, 28],
  ISLE: { ax: 40, ay: 22, top: 8, half: 34 }, DROP: 184, KNEEL: [0.8, 2.8, 0.8] };   // ay 36(뿔 끝)이면 섬이 등 위에 떠 보였다 — 밑동을 등에 묻는다 · DROP: 꿇으면 섬 윗면이 바닥 위 70px

/** 무릎 꿇은 정도 0~1 — 살아 있는 kneel 위험 지대에서(호스트 · 참가자 같은 때) */
export function ikKneel(e: Bag): number {
  const h = (G.bhz || []).find((q: any) => q.k === 'kneel' && q.nid === e.nid && q.t < q.life); if (!h) return 0;
  const [a, b, c] = IK.KNEEL;
  return h.t < a ? h.t / a : h.t < a + b ? 1 : Math.max(0, 1 - (h.t - a - b) / c);
}
/** 섬 윗면(세계 px) — {x0, x1, y} */
export function ikDeck(e: Bag) {
  const s = e.facing || 1, k = IK.K * IK.S, FY = e.y + e.h + ikKneel(e) * IK.DROP;
  const ax = e.cx + (IK.BACK[0] - IK.CX) * k * s, ay = FY - (IK.FOOT - IK.BACK[1]) * k;
  return { x0: ax - IK.ISLE.half * k, x1: ax + IK.ISLE.half * k, y: ay - (IK.ISLE.ay - IK.ISLE.top) * k };
}

export const BossIsle: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 느리게 다가선다 · 이따금 무릎을 꿇어 섬을 낮춘다 */
  ikAI(dt: number, world: World, p: Player, dx: number) {
    const kn = ikKneel(this);
    if (Math.abs(dx) > 30 && kn < 0.05) this.facing = Math.sign(dx);
    this.vx = lerp(this.vx, kn > 0.05 ? 0 : Math.sign(dx) * this.spd! * 0.45 * (Math.abs(dx) > 160 ? 1 : 0), dt * 1.5);
    this.ikKnT = (this.ikKnT ?? 5) - dt;
    if (this.ikKnT <= 0 && !(this.mv && this.mv.d)) {
      this.ikKnT = 9 - (this.pf || 0) * 2;
      this.hz({ k: 'kneel', life: IK.KNEEL[0] + IK.KNEEL[1] + IK.KNEEL[2], ref: this, nid: this.nid, c: '#8fc8b8' });
      G.shake = Math.max(G.shake, 6);
      const sand = () => { if (!this.dead) { G.vfx.puffs(this.cx, this.y + this.h - 6, 10, 26, 'rgba(200,180,140,.6)', 1.2, this.w * 0.6); G.shake = Math.max(G.shake, 8); } };
      G.after(IK.KNEEL[0], sand); G.after(IK.KNEEL[0] + IK.KNEEL[1], sand);   // 모래에 내려앉고 · 섬을 들고 일어선다
    }
    this.move(dt, world);
  },
  /** 받는 피해 — 섬 위에 누가 있으면 정수리에 닿는다 */
  ikHurt(a: number) {
    const T = G.time || 0;
    if ((G.players || []).some((q: any) => q && (q._deckT || 0) > T - 0.4)) return a * 1.25;
    if (Math.random() < 0.3) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 40, this.y + this.h * 0.4, tr('바위 껍질에 막힌다'), '#8fc8b8', 0));
    return a * 0.35;
  },
};

mixin(Enemy.prototype, BossIsle, true);
