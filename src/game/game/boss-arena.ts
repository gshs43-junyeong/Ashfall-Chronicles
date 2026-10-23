/* ===== game/boss-arena.ts — 큰 보스가 깨어나며 싸움터를 넓힌다 — 천장 · 벽을 부숴 몸이 들어갈 둥근 방을 판다 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { MACH_OF_TILE, T, TILE_DEF } from '../data.js';
import { BOSS_ARENA } from '../data/bossmoves.js';
import { TS } from '../world.js';
import { Game } from '../game.js';
/* 주인 방 · 제단 방은 생성 때 10~13칸 높이라 10배 보스(17~24칸)가 바위에 묻혔다(뼈 오르간은 해골 · 관이 안 보였다). 사용자 결정(2026-10-23):
   깨울 때 그 자리만 넓힌다. ★ 기반암 · 봉인 · 빛다리 · 횃불 · 기계 · 플레이어가 놓은 칸(world.built)은 건드리지 않고, 바닥 줄 아래는 파지 않는다.
   제단 방 벽이 플레이어도 짓는 석벽돌 · 발판이라 타일 종류로는 가를 수 없다 — 놓은 칸을 세계가 기억한다(세이브 v16).
   타일은 world.set 으로만 — 멀티플레이 참가자에게도 같은 방이 간다(netLog). 사연: docs/code-history.md#h217 */

const KEEP = new Set([T.BEDROCK, T.SEALSTONE, T.ORBITSEAL, T.LIGHTBRIDGE, T.ARCHSEAL, T.TORCH]);

export const BossArena: Bag = {
  /** 보스가 깨어날 자리(x, y)의 바닥에서 위로 둥근 방을 판다 — 판 칸 수 */
  arenaCarve(id: string, x: number, y: number) {
    const A = BOSS_ARENA[id]; if (!A) return 0;
    const w = this.world, tx = Math.floor(x / TS);
    let fy = -1;
    for (let ty = Math.floor(y / TS); ty < Math.floor(y / TS) + 40; ty++) if (w.solid(tx, ty) && !w.solid(tx, ty - 1)) { fy = ty; break; }
    if (fy < 0) return 0;
    const half = A.w / 2, rows: number[][] = [];
    let n = 0;
    for (let r = 1; r <= A.h; r++) {                         // 아래 반은 곧은 벽 · 위는 둥근 천장(돔)
      const u = r / A.h, hw = u < 0.5 ? half : half * Math.sqrt(Math.max(0, 1 - ((u - 0.5) / 0.5) ** 2));
      const row: number[] = [];
      for (let dx = -Math.floor(hw); dx <= Math.floor(hw); dx++) {
        const cx = tx + dx, cy = fy - r, t = w.get(cx, cy);
        if (!w.inB(cx, cy) || !TILE_DEF[t] || !TILE_DEF[t].solid || TILE_DEF[t].liquid || KEEP.has(t) || MACH_OF_TILE[t] || w.built.has(cy * w.dims.WW + cx)) continue;
        w.set(cx, cy, T.AIR); row.push(cx); n++;
      }
      rows.push(row);
    }
    if (!n) return 0;
    /* 무너지는 연출 — 아래에서 위로 줄마다 돌가루가 쏟아진다(판 것은 이미 비었다 · 그림만 뒤따른다) */
    rows.forEach((row, i) => { if (row.length) this.after(0.03 * i, () => {
      const cy = (fy - i - 1) * TS + TS / 2;
      for (let k = 0; k < Math.min(4, row.length); k++) {
        const cx = row[(Math.random() * row.length) | 0] * TS + TS / 2;
        this.vfx.puffs(cx, cy, 2, 18, 'rgba(120,108,92,.7)', 0.9, 20);
        this.vfx.shards(cx, cy, 3, '#7a6e5e', 220, 0.8, 4);
      }
    }); });
    this.shake = Math.max(this.shake, 22);
    this.sfxAt && this.sfxAt('arena_crumble', tx, fy - A.h / 2);
    return n;
  },
};

mixin(Game.prototype, BossArena, true);
