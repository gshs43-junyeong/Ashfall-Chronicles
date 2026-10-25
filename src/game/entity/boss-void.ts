/* ===== entity/boss-void.ts — 공허의 왕(심연 투기장 뒷벽을 덮은 어둠 망토) — 망토 속에서 머리와 손만 나온다 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TS } from '../world.js';
import { DmgText, Enemy, Proj } from '../entity.js';
/* 망토는 뒷벽에 박혀 움직이지 않는다(def.wall) · 판정 상자는 왕관 쓴 머리 — 망토 위를 천천히 떠돌며 플레이어 위를 노린다.
   머리가 망토 속으로 가라앉은 동안은 닿지 않는다(받는 피해 ×0.25) · 손은 망토 양쪽에서 솟아 공허를 쏜다.
   ★ 그림의 자리는 tools/mkbossrig.py void_* 설계 좌표(×4)와 같아야 한다 — VK 표. 사연: docs/code-history.md#h232 */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };

/** 망토 설계 칸(220×86 · 1칸 = 4px · 바닥 85) · 머리가 다니는 띠(망토 위 30~66칸 · 양끝 20칸 비움) · 손 자리(망토 22% · 78%) */
export const VK = { K: 4, W: 220, H: 86, BASE: 85, HY0: 30, HY1: 58, EDGE: 22, HANDS: [0.2, 0.8] };
/** 망토 왼쪽 위(세계 px) */
export const vkOrigin = (e: Bag): [number, number] => [e.vkX0 ?? e.cx - VK.W * VK.K / 2, e.vkY0 ?? e.cy - 200];

export const BossVoid: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 처음 한 번 망토를 바닥에 건다 · 머리는 플레이어 위로 천천히 떠돈다 · 손은 공허를 쏜다 */
  vkAI(dt: number, world: World, p: Player) {
    this.vx = this.vy = 0;
    if (!this.anchored) {
      this.anchored = 1;
      const tx = Math.floor(this.cx / TS);
      let fy = this.cy + 200;
      for (let ty = Math.floor(this.cy / TS) - 4; ty < Math.floor(this.cy / TS) + 40; ty++) if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { fy = ty * TS; break; }
      this.vkX0 = this.cx - VK.W * VK.K / 2; this.vkY0 = fy - VK.BASE * VK.K;
      this.vkHx = this.cx; this.vkHy = this.vkY0 + (VK.HY0 + 10) * VK.K; this.vkSunk = 1; this.vkSinkTo = 0;
    }
    const x0 = this.vkX0, y0 = this.vkY0, K = VK.K;
    /* 가라앉음 0(나와 있음)~1(망토 속) — 가라앉은 채로 자리를 옮기고 다시 솟는다 */
    this.vkSunk += Math.sign((this.vkSinkTo || 0) - this.vkSunk) * Math.min(Math.abs((this.vkSinkTo || 0) - this.vkSunk), dt * 2.2);
    if (this.vkSunk < 0.9) {                                  // 나와 있는 동안 — 플레이어 위로 천천히
      const tx = Math.max(x0 + VK.EDGE * K, Math.min(x0 + (VK.W - VK.EDGE) * K, p.cx));
      this.vkHx += (tx - this.vkHx) * Math.min(1, dt * 0.55);
    }
    const ty = y0 + (VK.HY0 + (VK.HY1 - VK.HY0) * (0.5 + 0.5 * Math.sin((G.time || 0) * 0.45))) * K;
    this.vkHy += (ty - this.vkHy) * Math.min(1, dt * 1.2);
    this.x = this.vkHx - this.w / 2; this.y = this.vkHy - this.h / 2;
    /* 손 — 망토 양쪽에서 번갈아 공허를 쏜다(머리가 망토 속이면 쉰다) */
    this.vkShot = (this.vkShot ?? 2) - dt;
    if (this.vkShot <= 0 && this.vkSunk < 0.5 && !(this.mv && this.mv.d)) {
      this.vkShot = 2.6 - (this.pf || 0) * 0.7;
      const side = (this.vkSide = 1 - (this.vkSide || 0)), hx = x0 + VK.W * K * VK.HANDS[side], hy = y0 + 46 * K;
      this.vkCast = { side, t: G.time || 0 };
      G.after(0.35, () => {
        if (this.dead) return;
        const a = Math.atan2(p.cy - hy, p.cx - hx);
        for (let i = -1; i <= 1; i++) G.projs.push(new Proj(hx, hy, Math.cos(a + i * 0.16) * 330, Math.sin(a + i * 0.16) * 330, this.dmg * 0.5, 'enemy', 'void'));
      });
    }
    /* 망령 — 막이 오를수록 많이 부른다(망토 끝에서 기어 나온다) */
    this.vkSum = (this.vkSum ?? 6) - dt;
    if (this.vkSum <= 0) {
      this.vkSum = 11 - (this.pf || 0) * 3;
      if (G.ents.filter((q: any) => q.type === 'wraith' && !q.dead).length < 4)
        for (let i = 0; i < 1 + Math.round(this.pf || 0); i++) G.ents.push(new Enemy('wraith', x0 + (Math.random() < 0.5 ? 30 : VK.W * K - 30), y0 + VK.BASE * K - 60, G.scale()));
    }
  },
  /** 받는 피해 — 망토 속으로 가라앉은 머리는 거의 닿지 않는다 */
  vkHurt(a: number) {
    if ((this.vkSunk || 0) < 0.5) return a;
    if (Math.random() < 0.35) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 20, this.y - 10, tr('닿지 않는다'), '#b4a0d8', 0));
    return a * 0.25;
  },
  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  vkSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'vleap': {                                       // 틈새 도약 — 머리가 망토 속으로 잠겨 플레이어 바로 위에서 솟고, 두 손이 양옆 바닥을 내리친다
        const n = d.times || 2;
        for (let i = 0; i < n; i++) G.after(i * 1.5, () => {
          if (E.dead) return;
          E.vkSinkTo = 1;
          G.after(0.5, () => {
            if (E.dead) return;
            const [x0] = vkOrigin(E);
            E.vkHx = Math.max(x0 + VK.EDGE * VK.K, Math.min(x0 + (VK.W - VK.EDGE) * VK.K, p.cx));
            E.vkSinkTo = 0;
            G.vfx.sigil(E.vkHx, E.vkHy, 70, K.c, 0.6, 6, 2, 1, 'sigil_void');
            for (const s of [-1, 1]) E.hz({ k: 'strike', x: p.cx + s * 110, y: p.y + p.h, r: 70, shape: 'circle', delay: 0.55, life: 0.9, dmg: E.dmg * m, c: K.c, fx: 'rift', sd: Math.random() * 99 });
            E.vkGrab = { t: G.time || 0, x: p.cx, fy: p.y + p.h };
          });
        });
        return { busy: n * 1.5 + 0.6 };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossVoid, true);
