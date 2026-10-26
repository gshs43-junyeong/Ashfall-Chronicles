/* ===== entity/boss-spore.ts — 포자 여왕 — 망사 치마를 두른 버섯 여왕 · 갓 아래 주름이 열릴 때만 깊이 닿는다 · 균사가 바닥을 덮는다 ===== */
import { app as G } from '../ctx.js';
import { lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TS } from '../world.js';
import { DmgText, Enemy, Proj } from '../entity.js';
/* ★ 정체성(계획 §3): 갓 아래 주름이 열리면 포자 · 균사가 바닥을 덮는다 · 막 2 엔 갓이 퍼지며 천장에 매달린다.
   주름이 열린 동안만 ×1.35(닫힌 갓은 ×0.75 '갓에 막힌다') — 포자를 맞으며 파고들지, 닫힐 때 물러설지를 고른다.
   균사 깔개(`mycel` 위험 지대)는 밟으면 느려지고 · 밟은 사람마다 여왕이 조금씩 낫는다(먹는다). 깔개는 여섯까지.
   설계 좌표는 tools/mkbossrig.py spore_*(44×76 · 갓 자리 (22, 9) · 땅 74). 사연: docs/code-history.md#h236 */

/** 설계 칸 표 — 그림(game/boss-spore-art)과 같은 수 */
export const SQ = { K: 4, W: 44, H: 76, CX: 22, CAP: [22, 9], FOOT: 74, HANG_FOOT: 66, ARMS: [[16, 24], [28, 24]] as [number, number][] };

export const BossSpore: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 땅에서는 미끄러지듯 다가서고, 매달린 뒤엔 천장을 따라 흔들리며 쫓는다 · 주름이 열고 닫힌다 · 균사를 깐다 */
  sqAI(dt: number, world: World, p: Player) {
    const T = G.time || 0, dx = p.cx - this.cx;
    /* 주름 — 닫힘 → 열림(포자) 을 되풀이한다 */
    this.sqGillT = (this.sqGillT ?? 3) - dt;
    if (this.sqGillT <= 0) {
      this.sqOpen = this.sqOpen ? 0 : 1;
      this.sqGillT = this.sqOpen ? (this.sqHang ? 3.0 : 2.6) : (this.sqHang ? 3.0 : 4.4) - (this.pf || 0) * 0.8;
      if (this.sqOpen) G.vfx.puffs(this.cx, this.y + 10, 8, 16, 'rgba(143,240,200,.5)', 1.2, 60);
    }
    if (this.sqOpen) {                                     // 포자 — 땅에선 둘레에 구름, 매달린 뒤엔 아래로 비처럼
      this.sqSpore = (this.sqSpore ?? 0) - dt;
      if (this.sqSpore <= 0) {
        this.sqSpore = this.sqHang ? 0.22 : 0.8;
        if (this.sqHang) {
          const x = this.cx + (Math.random() - 0.5) * 300;
          G.projs.push(new Proj(x, this.y + 30, (Math.random() - 0.5) * 30, 150 + Math.random() * 60, this.dmg * 0.3, 'enemy', 'poison'));
        } else {
          const x = this.cx + (Math.random() - 0.5) * 320;
          this.hz({ k: 'zone', x, y: this.floorY(x, this.y + this.h - TS * 2), r: 48, life: 3.2, dps: 0.1, dmg: this.dmg * 0.1, fx: 'spore', poison: 1, c: '#8ff0c8' });
        }
      }
    }
    /* 균사 깔개 — 플레이어 발밑 앞쪽에 */
    this.sqMyc = (this.sqMyc ?? 2.5) - dt;
    if (this.sqMyc <= 0 && !(this.mv && this.mv.d)) {
      this.sqMyc = 4.2 - (this.pf || 0) * 1.2;
      const live = (G.bhz || []).filter((h: any) => h.k === 'mycel' && h.t < h.life);
      if (live.length < 6) {
        const x = p.cx + Math.sign(dx || 1) * 40 + (Math.random() - 0.5) * 60;
        this.hz({ k: 'mycel', x, y: this.floorY(x, p.y), w: 130 + Math.random() * 40, life: 18, ref: this, nid: this.nid, sd: Math.random() * 99, c: '#f0ead8' });
        this.sqLay = { t: T, x };
      }
    }
    if (this.sqHang) {
      /* 매달림 — 천장 아래에서 플레이어 쪽으로 흔들리며 따라간다 */
      const ty = this.sqCeil + 30;
      this.y = lerp(this.y, ty, dt * 1.6);
      this.vx = lerp(this.vx, Math.sign(dx) * Math.min(Math.abs(dx), 160) * 0.7, dt * 1.2);
      this.vy = 0;
      this.move(dt, world, { gravMul: 0 });
    } else {
      const want = Math.abs(dx) > 170 ? Math.sign(dx) : Math.abs(dx) < 90 ? -Math.sign(dx) * 0.5 : 0;
      this.vx = lerp(this.vx, want * this.spd!, dt * 1.6);
      this.move(dt, world);
    }
  },
  /** 막 2 — 갓이 퍼지며 천장으로 올라가 매달린다(천장이 없으면 땅 위 높이) */
  sqRise() {
    if (this.sqHang) return;
    this.sqHang = 1;
    const fy = this.y + this.h, tx = Math.floor(this.cx / TS), w = G.world;
    let cy = fy - 340;
    for (let ty = Math.floor(fy / TS) - 4; ty > Math.floor(fy / TS) - 26; ty--) if (w.solid(tx, ty)) { cy = (ty + 1) * TS; break; }
    this.sqRoof = cy;                                      // 실이 닿는 천장
    this.sqCeil = Math.max(cy, fy - this.h - 150);         // 몸이 걸리는 높이 — 천장이 높아도 뛰어 닿게
    G.shake = Math.max(G.shake, 8);
  },
  /** 받는 피해 — 열린 주름 ×1.35 · 닫힌 갓 ×0.75 */
  sqHurt(a: number) {
    if (this.sqOpen) return a * 1.35;
    if (Math.random() < 0.3) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 30, this.y - 10, tr('갓에 막힌다'), '#c8a8c0', 0));
    return a * 0.75;
  },
};

mixin(Enemy.prototype, BossSpore, true);
