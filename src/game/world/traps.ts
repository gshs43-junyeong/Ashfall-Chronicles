/* ===== world/traps.js — 입구 함정 · 떠 있는 장식 · 암호 골방 · 함정 자리 ===== */
import { factory as Factory } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { T, TILE_DEF } from '../data.js';
import { RUIN_SPEC, STORY_RUIN } from '../data/ruins.js';
import { TS, World } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldTraps: Bag & ThisType<World> = {

  /** 입구 통로의 작은 방마다 함정이 **하나는 남아 있게** 마무리한다. */
  ensureEntranceTraps(rng) {
    /* 어느 타일이 어떤 갈래의 함정인가 — 종류를 세려면 갈래로 묶어야 한다 (화살 구멍 좌·우는 같은 갈래다). */
    const KIND = {};
    KIND[T.SPIKE] = 'spike'; KIND[T.DART_L] = 'dart'; KIND[T.DART_R] = 'dart';
    KIND[T.FLAMEVENT] = 'vent'; KIND[T.CRUMBLE] = 'crumble';
    KIND[T.SPARKCOIL] = 'coil'; KIND[T.GASVENT] = 'gas'; KIND[T.GRINDER] = 'grind';
    for (const site of this.ruinSites || []) {
      for (const b of site.ent || []) {
        const fy0 = b[4] === undefined ? b[1] + b[3] - 2 : b[4];
        const have: Bag = {};
        let n = 0;
        for (let x = b[0]; x <= b[0] + b[2]; x++)
          for (let y = b[1]; y <= b[1] + b[3]; y++) {
            const k = KIND[this.get(x, y)];
            if (k) { have[k] = 1; n++; }
          }
        /* ★ 방마다 **서로 다른 갈래 둘 이상**을 채운다. */
        const want = rng.int(2, 3);
        const pool = (site.traps || ['dart', 'crumble']).concat(['crumble', 'vent', 'gas', 'dart']);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = rng.int(0, i); const t2 = pool[i]; pool[i] = pool[j]; pool[j] = t2;
        }
        for (const kind of pool) {
          if (Object.keys(have).length >= want) break;
          if (have[kind]) continue;
          if (this.putTileTrap({ x: b[0], y: b[1], w: b[2], h: b[3] }, fy0, kind, rng)) {
            have[kind] = 1; n++;
          }
        }
        while (Object.keys(have).length < 2) {                // 그래도 모자라면 가시·붕괴로
          const x = b[0] + 2 + rng.int(0, Math.max(0, b[2] - 4));
          if (!this.putPathTrap(x, fy0, rng)) break;
          have.spike = have.crumble = 1; n++;
        }
        if (n) continue;
        const fy = fy0;
        let put = false;
        // ① 방 바닥 줄 어디든 — 가시나 부서지는 바닥을 놓을 수 있는 자리를 찾는다
        for (let dy = 0; dy <= 2 && !put; dy++)
          for (let x = b[0] + 2; x < b[0] + b[2] - 2 && !put; x++) put = this.putPathTrap(x, fy + dy, rng);
        // ② 벽이 남아 있으면 화살 구멍
        if (!put) put = this.putTileTrap({ x: b[0], y: b[1], w: b[2], h: b[3] }, fy, 'dart', rng);
        /* ③ 그래도 안 되면 — 바닥이 통째로 파여 나간 방이다. */
        for (let x = b[0] + 2; x < b[0] + b[2] - 2 && !put; x++) {
          if (this.get(x, fy) !== T.AIR || this.get(x, fy - 1) !== T.AIR) continue;
          this.set(x, fy + 1, T.CRUMBLE);
          this.set(x, fy + 2, T.AIR);
          put = true;
        }
      }
    }
  },

  /** 함정 하나 안 밟고 쭉 걸어가는 **직선 구간**을 끊는다. */
  breakLongRuns(rng) {
    const MAX_RUN = 11;                       // 이보다 길게 뚫려 있으면 끊는다
    const TRAPT = {};
    for (const t of [T.SPIKE, T.DART_L, T.DART_R, T.FLAMEVENT, T.CRUMBLE,
                     T.SPARKCOIL, T.GASVENT, T.GRINDER]) TRAPT[t] = 1;
    const trapNear = (x, y) => TRAPT[this.get(x, y + 1)] || TRAPT[this.get(x, y)] ||
                               TRAPT[this.get(x, y - 1)] || TRAPT[this.get(x, y - 2)];
    const walk = (x, y) => this.solid(x, y + 1) &&
                           this.get(x, y) === T.AIR && this.get(x, y - 1) === T.AIR;
    for (const site of this.ruinSites || []) {
      const boss = (site.rooms || [])[0];
      const inBoss = (x, y) => boss && x >= boss.x - 1 && x <= boss.x + boss.w + 1 &&
                               y >= boss.y - 1 && y <= boss.y + boss.h + 1;
      const x0 = site.x - (site.w >> 1), x1 = x0 + site.w;
      const y0 = site.y - (site.h >> 1), y1 = y0 + site.h;
      for (let y = y0; y <= y1; y++) {
        let run = 0;
        for (let x = x0; x <= x1; x++) {
          if (!walk(x, y) || trapNear(x, y)) { run = 0; continue; }
          run++;
          if (run <= MAX_RUN) continue;
          /* 구간이 한계를 넘었다 — 지금까지 온 구간의 한가운데에 하나 심는다. */
          const mid = x - (run >> 1);
          let put = false;
          for (let d = 0; d <= (run >> 1) && !put; d++) {
            for (const px of (d ? [mid - d, mid + d] : [mid])) {
              if (px < x0 || px > x1 || inBoss(px, y)) continue;
              if (!walk(px, y) || trapNear(px, y)) continue;
              if (this.putPathTrap(px, y, rng)) { put = true; break; }
            }
          }
          run = 0;
          if (!put) x += MAX_RUN;             // 못 심는 줄이면 헛돌지 않게 건너뛴다
        }
      }
    }
  },

  /** 받침이 사라진 장식을 걷어낸다 — 세계를 다 만든 **뒤** 한 번. */
  sweepFloatingDecor() {
    if (!this.ruinSites || !this.ruinSites.length) return;
    const kill = new Set([T.TORCH, T.BANNER]);
    const add = list => { for (const d of (list || [])) if (TILE_DEF[d[1]] && TILE_DEF[d[1]].solid === 0) kill.add(d[1]); };
    for (const sp of RUIN_SPEC) add(sp.decor);
    for (const st of (typeof STORY_RUIN !== 'undefined' ? STORY_RUIN : [])) add(st.decor);
    let gone = 0;
    for (const site of this.ruinSites)
      for (const r of (site.rooms || []))
        for (let y = r.y; y < r.y + r.h; y++)
          for (let x = r.x; x < r.x + r.w; x++) {
            if (!kill.has(this.get(x, y))) continue;
            if (this.solid(x, y - 1) || this.solid(x, y + 1) || this.solid(x - 1, y) || this.solid(x + 1, y)) continue;
            this.set(x, y, T.AIR); gone++;
          }
    return gone;
  },

  /** 암호 골방의 껍질을 (다시) 세운다. */
  sealCipherVaults() {
    for (const v of this.ruinVaults || []) {
      if (v[5]) continue;                       // 열린 골방은 다시 안 봉한다
      const [x0, y0, x1, y1, bg] = v;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          // 안쪽 빈칸(상자가 있는 칸)만 빼고 두 겹 껍질을 통째로 다시 세운다
          if (y > y0 + 1 && y < y1 - 1 && x > x0 + 1 && x < x1 - 1) continue;
          this.set(x, y, T.CIPHERSTONE);
          this.setWall(x, y, bg);
        }
    }
  },

  /** 이 칸이 **아직 잠긴** 암호 골방 안인가 (블록 설치 금지 판정용). */
  inLockedVault(x, y) {
    for (const v of this.ruinVaults || []) {
      if (v[5]) continue;                       // 이미 열린 골방
      if (x >= v[0] && x <= v[2] && y >= v[1] && y <= v[3]) return true;
    }
    return false;
  },

  /** 그 자리의 골방을 열린 것으로 표시한다 (문을 연 뒤 다시 봉하지 않게) */
  openVaultAt(dx, dy) {
    for (const v of this.ruinVaults || [])
      if (dx >= v[0] - 1 && dx <= v[2] + 1 && dy >= v[1] && dy <= v[3]) v[5] = 1;
  },

  /** 암호를 맞힌 뒤 문간을 실제로 뚫는다 — 사람이 걸어 들어갈 수 있게. */
  openCodeDoorway(dx, dy) {
    let n = 0;
    for (let x = dx - 1; x <= dx; x++)
      for (let y = dy - 4; y <= dy; y++)
        if (this.get(x, y) === T.CIPHERSTONE) { this.set(x, y, T.AIR); n++; }
    return n;
  },

  /** 자물쇠가 걸린 돌 — 암호석·봉인석. */
  locked(x, y) { const t = this.get(x, y); return t === T.CIPHERSTONE || t === T.SEALSTONE; },

  /** 길목(입구 목 · 통행 보수로 판 계단)에 함정을 하나 남긴다. */
  putPathTrap(cx, fy, rng) {
    const solid = (x, y) => TILE_DEF[this.get(x, y)].solid === 1;
    if (rng.chance(0.5)) {
      let put = 0;
      for (let k = 0; k <= 1; k++)
        if (this.get(cx + k, fy) === T.AIR && solid(cx + k, fy + 1) && !this.locked(cx + k, fy + 1)) {
          this.set(cx + k, fy, T.SPIKE); put++;
        }
      if (put) return true;
    }
    let put = 0;
    for (let k = 0; k <= 1; k++) {
      const x = cx + k;
      if (!solid(x, fy + 1) || this.locked(x, fy + 1)) continue;
      /* ★ 구덩이 바닥(fy+4)이 **이미 비어 있으면** 여기에 구덩이를 파지 않는다 — 사연: docs/code-history.md#h116 */
      if (!solid(x, fy + 4)) continue;
      const f = this.get(x, fy + 1);
      this.set(x, fy + 2, T.AIR); this.set(x, fy + 3, T.AIR);   // 두 칸 구덩이 — 점프로 나올 수 있다
      this.set(x, fy + 1, T.CRUMBLE);
      put++;
    }
    return put > 0;
  },

  /** 방 하나에 타일 함정을 놓는다. */
  /* ================= 함정을 놓을 "길목" 고르기 ================= */
  trapSpot(r, fy, rng) {
    const lo = r.x + 2, hi = r.x + r.w - 3;
    if (hi <= lo) return lo;
    let x;
    const roll = rng.chance(0.45) ? 0 : (rng.chance(0.64) ? 1 : 2);
    if (roll === 0) {
      // 이 방 안에 있는 상자를 찾는다 (바닥 줄 근처의 것만)
      const near = [];
      for (const o of this.objects) {
        if (o.type !== 'chest') continue;
        const ox = Math.floor((o.x + o.w / 2) / TS), oy = Math.floor(o.y / TS);
        if (ox >= lo && ox <= hi && Math.abs(oy - fy) <= 2) near.push(ox);
      }
      x = near.length ? near[rng.int(0, near.length - 1)] + rng.int(-2, 2) : -1;
    }
    if (x === undefined || x < 0) {
      if (roll === 2) {
        const d = rng.int(2, 4);
        x = rng.chance(0.5) ? lo + d : hi - d;
      } else {
        const third = Math.max(1, Math.floor(r.w / 3));
        x = r.x + third + rng.int(0, third - 1);
      }
    }
    x = clamp(x, lo, hi);
    // 이미 뭔가 박혀 있거나 잠긴 자리면 옆으로 물러선다
    for (let k = 0; k < 6; k++) {
      const tx = clamp(x + (k % 2 ? k : -k), lo, hi);
      if (!this.locked(tx, fy) && !this.locked(tx, fy + 1)) return tx;
    }
    return x;
  },

  putTileTrap(r, fy, kind, rng) {
    if (kind === 'coil') {
      /* 방전 코일 — 마주 보는 두 개를 같은 줄에 세워야 아크가 흐른다. */
      const ty = fy - rng.int(1, 2);          // 아크가 몸을 지나가는 높이
      const gap = Math.min(r.w - 3, rng.int(4, 9));
      // 아크 띠의 가운데가 길목에 오도록 — 사연: docs/code-history.md#h117
      const sx = clamp(this.trapSpot(r, fy, rng) - (gap >> 1), r.x + 1, r.x + r.w - gap - 2);
      if (this.get(sx, ty) !== T.AIR || this.get(sx + gap, ty) !== T.AIR) {
        this.set(sx, ty, T.SPARKCOIL); this.set(sx + gap, ty, T.SPARKCOIL);
      } else {                                   // 허공이면 바닥에 박아 세운다
        this.set(sx, fy + 1, T.SPARKCOIL); this.set(sx + gap, fy + 1, T.SPARKCOIL);
      }
      return true;
    }
    if (kind === 'gas') {
      const vx = this.trapSpot(r, fy, rng);
      if (this.get(vx, fy + 1) === T.AIR) return false;
      this.set(vx, fy + 1, T.GASVENT);
      return true;
    }
    if (kind === 'grind') {
      // 벽에 박는다 — 벽에 붙어 걷는 길을 끊는 함정이라 벽이어야 의미가 있다
      const left = rng.chance(0.5);
      const tx = left ? r.x : r.x + r.w - 1;
      const ty = fy - rng.int(1, 2);          // 벽에 붙어 걷는 높이
      if (this.get(tx, ty) === T.AIR) return false;
      this.set(tx, ty, T.GRINDER);
      return true;
    }
    if (kind === 'mine') {
      /* 촉발 지뢰 — 바닥에 박는다. */
      const mx = this.trapSpot(r, fy, rng);
      if (this.get(mx, fy + 1) === T.AIR) return false;
      this.set(mx, fy, T.TRIPMINE);
      return true;
    }
    if (kind === 'brine') {
      // 염수 분출구 — 바닥에 박는다.
      const bx = this.trapSpot(r, fy, rng);
      if (this.get(bx, fy + 1) === T.AIR) return false;
      this.set(bx, fy + 1, T.BRINEVENT);
      return true;
    }
    if (kind === 'dart') {
      /* 벽에 구멍을 뚫는다(방 안쪽을 향하게). */
      const left = rng.chance(0.5);
      const tx = left ? r.x : r.x + r.w - 1;
      const ty = fy - rng.int(1, 2);
      if (this.get(tx, ty) === T.AIR) return false;
      this.set(tx, ty, left ? T.DART_R : T.DART_L);
      return true;
    } else if (kind === 'vent') {
      const vx = this.trapSpot(r, fy, rng);
      if (this.get(vx, fy + 1) === T.AIR) return false;
      this.set(vx, fy + 1, T.FLAMEVENT);
      return true;
    } else {
      /* 부서지는 바닥. */
      const cx0 = clamp(this.trapSpot(r, fy, rng) - 1, r.x + 2, Math.max(r.x + 2, r.x + r.w - 6));
      const n = rng.int(3, 5);   // 예전 2~4 — 두 칸짜리는 걷다가 그냥 건너뛰어졌다
      const hollow = x => TILE_DEF[this.get(x, fy + 2)].solid !== 1 && !this.locked(x, fy + 1);
      // 이미 밑이 빈 자리를 먼저 찾는다 (방 바닥이 갱도나 다른 방 위를 지날 때가 있다)
      let sx = -1;
      for (let x = r.x + 2; x < r.x + r.w - 2 - n; x++) {
        let ok = true;
        for (let k = 0; k < n; k++) if (!hollow(x + k) || this.get(x + k, fy + 1) === T.AIR) { ok = false; break; }
        if (ok) { sx = x; break; }
      }
      if (sx < 0) {                       // 없으면 판다
        sx = clamp(cx0, r.x + 2, r.x + r.w - 2 - n);
        const floorTile = this.get(sx, fy + 1);          // 구덩이 바닥은 이 방 바닥과 같은 재질로
        for (let k = 0; k < n; k++) {
          if (this.get(sx + k, fy + 1) === T.AIR) continue;   // 원래 구멍이면 그대로
          if (this.locked(sx + k, fy + 1)) continue;          // 잠긴 돌은 건드리지 않는다
          // 구덩이 바닥 자리가 이미 비어 있으면 파지 않는다 — 메우면 아래 길을 막는다(putPathTrap 참고)
          if (TILE_DEF[this.get(sx + k, fy + 4)].solid !== 1) continue;
          this.set(sx + k, fy + 2, T.AIR);
          this.set(sx + k, fy + 3, T.AIR);
        }
        if (rng.chance(0.45)) this.set(sx + rng.int(0, n - 1), fy + 3, T.SPIKE);
      }
      let put = 0;
      for (let k = 0; k < n; k++)
        if (this.get(sx + k, fy + 1) !== T.AIR && !this.locked(sx + k, fy + 1)) {
          this.set(sx + k, fy + 1, T.CRUMBLE); put++;
        }
      return put > 0;
    }
  },
};
mixin(World.prototype, WorldTraps, true);
