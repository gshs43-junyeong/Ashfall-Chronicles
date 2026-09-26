/* ===== world/caves.js — 동굴 갈래 · 금 간 자갈 · 큰 굴 ===== */
import { factory as Factory } from '../ctx.js';
import { clamp, dist, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { CAMP_GX1, CAMP_X0, DEEP_Y, HELL_Y, SHIFT, SURF_BASE, SX, SY, WH, WORLD_BOT, WSX, WSY, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { CAVE_TYPES, FAULT } from '../data/ruins.js';
import { CAVE_GH, CAVE_GW, MAT_LAYER, TS, World, inSeaZone } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldCaves: Bag & ThisType<World> = {

  /** 큰 동굴을 여러 개 드렁커드 워크로 파낸다. */
  /* ================= 동굴 갈래 (data.js CAVE_TYPES) ================= */
  caveTypeAt(tx, ty) {
    if (!this.caveGrid || ty < 0 || ty >= HELL_Y) return 0;
    const gx = Math.floor(tx / CAVE_GW), gy = Math.floor(ty / CAVE_GH);
    return this.caveGrid[gy * this._cgW() + gx] || 0;
  },
  _cgW() { return Math.ceil(WW / CAVE_GW); },
  /** 플레이어가 선 자리의 동굴 갈래 — **자연 굴 안**일 때만(지표 12칸 아래 · 지층 벽지 · 유적 밖). */
  caveKindAt(tx, ty) {
    if (!this.caveGrid || !this.inB(tx, ty) || ty <= this.surface[tx] + 12) return 0;
    if (!this._natural) {
      this._natural = new Set();
      for (const k in MAT_LAYER) { this._natural.add(MAT_LAYER[k].wall); this._natural.add(MAT_LAYER[k].subWall); }
    }
    if (!this._natural.has(this.walls[ty * WW + tx]) || this.ruinAt(tx, ty)) return 0;
    return this.caveTypeAt(tx, ty);
  },

  buildCaveZones(rng) {
    const gW = this._cgW(), gH = Math.ceil(HELL_Y / CAVE_GH);
    this.caveGrid = new Uint8Array(gW * gH);
    const natural = new Set();
    for (const k in MAT_LAYER) { natural.add(MAT_LAYER[k].wall); natural.add(MAT_LAYER[k].subWall); }
    // 1) 구역마다 갈래를 굴린다.
    for (let gy = 0; gy < gH; gy++)
      for (let gx = 0; gx < gW; gx++) {
        const x = gx * CAVE_GW + (CAVE_GW >> 1), y = gy * CAVE_GH + (CAVE_GH >> 1);
        if (inSeaZone(x) || y < SURF_BASE + 10) continue;
        const deep = clamp((y - 120) / (DEEP_Y - 120), 0, 1);
        if (gx > 0 && this.caveGrid[gy * gW + gx - 1] && rng.chance(0.4)) {
          this.caveGrid[gy * gW + gx] = this.caveGrid[gy * gW + gx - 1]; continue;
        }
        if (rng.chance(0.22)) continue;                          // 넷에 하나쯤은 그냥 굴
        const ws = CAVE_TYPES.map((c, i) => i === 0 ? 0 : lerp(c.w[0], c.w[1], deep));
        let r = rng.range(0, ws.reduce((a, b) => a + b, 0)), k = 1;
        for (let i = 1; i < ws.length; i++) { r -= ws[i]; if (r <= 0) { k = i; break; } }
        this.caveGrid[gy * gW + gx] = k;
      }
    // 2) 꾸민다 — 자연 굴의 빈 칸마다 바닥·천장·옆벽을 보고 장식이 붙을 수 있는 자연 돌 — 이끼·종유석은 흙·돌·지층 돌 위에만
    const host = t => t === T.STONE || t === T.DIRT || t === T.MOSSSTONE || t === T.SANDSTONE ||
                      t === T.LIMESTONE || t === T.GRANITE;
    const hang = (x, y, tile, n) => {                          // 천장에서 아래로 n 칸
      for (let k = 0; k < n; k++) { if (this.get(x, y + k) !== T.AIR) break; this.set(x, y + k, tile); }
    };
    for (let x = 4; x < WW - 4; x++) {
      if (inSeaZone(x) || (x > CAMP_X0 - 30 && x < CAMP_GX1 + 30)) continue;
      for (let y = this.surface[x] + 12; y < HELL_Y - 2; y++) {
        if (this.get(x, y) !== T.AIR) continue;
        const k = this.caveTypeAt(x, y); if (!k) continue;
        if (!natural.has(this.walls[y * WW + x]) || this.ruinAt(x, y)) continue;
        const id = CAVE_TYPES[k].id;
        const below = this.get(x, y + 1), above = this.get(x, y - 1);
        const floor = host(below), ceil = host(above);
        /* ★ 이끼는 **옆벽에도** 붙인다. */
        if (id === 'moss') {
          if (floor && rng.chance(0.92)) this.set(x, y + 1, T.MOSSSTONE);
          for (const sx of [x - 1, x + 1]) if (host(this.get(sx, y)) && rng.chance(0.75)) this.set(sx, y, T.MOSSSTONE);
          if (ceil) { if (rng.chance(0.85)) this.set(x, y - 1, T.MOSSSTONE); if (rng.chance(0.45)) hang(x, y, T.HANGMOSS, rng.int(1, 4)); }
          else if (floor && rng.chance(0.08) && this.get(x, y - 1) === T.AIR) this.set(x, y, T.GLOWCAP);
        } else if (id === 'drip') {
          // 종유 동굴의 벽은 석회암이 많다 — 석회암이 녹아 종유석이 자란다는 흉내
          for (const [hx, hy] of [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]])
            if (this.get(hx, hy) === T.STONE && rng.chance(0.4)) this.set(hx, hy, T.LIMESTONE);
          if (ceil && rng.chance(0.26)) hang(x, y, T.STALACTITE, rng.chance(0.15) ? 3 : rng.chance(0.4) ? 2 : 1);
          else if (floor && rng.chance(0.2) && this.get(x, y - 1) === T.AIR) {
            this.set(x, y, T.STALAGMITE);
            if (rng.chance(0.35) && this.get(x, y - 2) === T.AIR) this.set(x, y - 1, T.STALAGMITE);
          }
        } else if (id === 'geode') {
          const side = host(this.get(x - 1, y)) || host(this.get(x + 1, y));
          if (floor && rng.chance(0.13)) this.set(x, y, T.GEODE);
          else if (side && rng.chance(0.06)) {
            const sx = host(this.get(x - 1, y)) ? x - 1 : x + 1;
            this.set(sx, y, T.CRYSTAL);
          }
        } else if (id === 'fume') {
          if (floor && rng.chance(0.02) && below === T.STONE) this.set(x, y + 1, T.GASVENT);
        } else {
          // 그냥 굴도 맨숭맨숭하지 않게 — 작은 종유석 · 석순이 드문드문
          if (ceil && rng.chance(0.04)) hang(x, y, T.STALACTITE, 1);
          else if (floor && rng.chance(0.03) && this.get(x, y - 1) === T.AIR) this.set(x, y, T.STALAGMITE);
        }
      }
    }
    /* 3) 독기 굴은 광맥이 짙다 — 구역 안 돌 몇 군데를 깊이에 맞는 광석으로 바꾼다. */
    for (let gy = 0; gy < gH; gy++)
      for (let gx = 0; gx < gW; gx++) {
        if (CAVE_TYPES[this.caveGrid[gy * gW + gx]].id !== 'fume') continue;
        for (let n = 0; n < 7; n++) {
          const cx = gx * CAVE_GW + rng.int(3, CAVE_GW - 3), cy = gy * CAVE_GH + rng.int(3, CAVE_GH - 3);
          const ore = cy > SY(300) ? T.MYTHRIL : cy > SY(200) ? T.GOLD : cy > SY(130) ? T.IRON : T.COPPER;
          const r = rng.range(1.5, 2.8);
          for (let x = Math.floor(cx - r); x <= cx + r; x++)
            for (let y = Math.floor(cy - r); y <= cy + r; y++)
              if (dist(x, y, cx, cy) <= r && this.get(x, y) === T.STONE) this.set(x, y, ore);
        }
      }
    this.buildFaults(rng, natural);
  },

  /** 금 간 자갈 — 동굴 옆벽에 판 작은 굴(오목한 자리) 안쪽 끝에 박는다. */
  buildFaults(rng, natural) {
    this.faults = [];
    let tries = 0;
    while (this.faults.length < Math.round(FAULT.count * WSX * WSY) && tries++ < 6000 * WSX * WSY) {
      const x = rng.int(40, WW - 40);
      if (inSeaZone(x) || (x > CAMP_X0 - 60 && x < CAMP_GX1 + 60)) continue;
      const y = rng.int(this.surface[x] + 30, HELL_Y - 20);
      // 자연 굴의 바닥 칸이어야 한다
      if (this.get(x, y) !== T.AIR || !this.solid(x, y + 1) || this.get(x, y - 1) !== T.AIR) continue;
      if (!natural.has(this.walls[y * WW + x]) || this.ruinAt(x, y)) continue;
      const dir = rng.chance(0.5) ? 1 : -1;
      // 벽이 바로 옆에 있어야 한다(한두 칸 안)
      let wx = x;
      for (let k = 1; k <= 3; k++) if (this.solid(x + dir * k, y)) { wx = x + dir * k; break; }
      if (wx === x) continue;
      // 그 너머 FAULT.rx 칸이 거의 통바위여야 한다 — 이미 굴이 있으면 열어 봐야 새로울 게 없다
      let solid = 0, tot = 0, bad = false;
      for (let dx = 2; dx <= FAULT.rx + 6 && !bad; dx += 2)
        for (let dy = -FAULT.ry; dy <= FAULT.ry; dy += 2) {
          const xx = wx + dir * dx, yy = y + dy; tot++;
          if (this.solid(xx, yy)) solid++;
          if (this.get(xx, yy) === T.BEDROCK || this.ruinAt(xx, yy) || yy >= HELL_Y - 4 || yy <= this.surface[clamp(xx, 0, WW - 1)] + 12) bad = true;
        }
      // ★ 0.88 로 두면 넓어진 동굴 탓에 스물여덟 중 일고여덟만 자리를 찾았다(d1 11 · d2 7)
      if (bad || solid / tot < 0.78) continue;
      if (this.faults.some(f => Math.abs(f.x - wx) < 90 && Math.abs(f.y - y) < 50)) continue;
      // 오목한 작은 굴 — 넓이 다섯, 높이 셋.
      for (let dx = 0; dx < 5; dx++)
        for (let dy = -2; dy <= 0; dy++) {
          const xx = wx + dir * dx, yy = y + dy;
          if (this.get(xx, yy) !== T.BEDROCK) this.set(xx, yy, T.AIR);
        }
      for (let dx = -1; dx < 6; dx++) if (!this.solid(wx + dir * dx, y + 1)) this.set(wx + dir * dx, y + 1, T.STONE);
      const fx = wx + dir * 5, fy = y - 1;
      this.set(fx, fy, T.FAULTSTONE);
      this.set(fx, fy + 1, T.STONE); this.set(fx, fy - 1, T.STONE);
      const f = { x: fx, y: fy, dir, cx: fx + dir * (FAULT.rx >> 1), cy: y - 3, seed: rng.int(1, 1e9), done: 0 };
      /* ★ 무너질 자리 **전부**를 자갈로 채운다. */
      for (const [cx, cy] of this.faultCells(f)) this.set(cx, cy, T.FAULTSTONE);
      this.faults.push(f);
    }
  },

  /** 금 간 자갈이 무너진 뒤 열릴 동굴의 칸들 — 씨앗에서 뽑으므로 세계마다 같고, 저장할 필요가 없다. */
  faultCells(f) {
    const rng = new RNG(f.seed), cells = [], seen = new Set();
    const natural = new Set();
    for (const k in MAT_LAYER) { natural.add(MAT_LAYER[k].wall); natural.add(MAT_LAYER[k].subWall); }
    const dig = (xx, yy) => {
      const key = yy * WW + xx;
      if (seen.has(key) || !this.inB(xx, yy)) return;
      seen.add(key);
      const t = this.get(xx, yy);
      if (t === T.AIR || t === T.BEDROCK || this.locked(xx, yy) || TILE_DEF[t].liquid || TILE_DEF[t].solid !== 1) return;
      if (yy >= HELL_Y - 2 || yy <= this.surface[xx] + 12 || this.ruinAt(xx, yy)) return;
      if (!natural.has(this.walls[key])) return;
      cells.push([xx, yy]);
    };
    // 자갈 자리에서 동굴 한가운데까지 이어지는 목(높이 넷)
    for (let x = f.x; x !== f.cx + f.dir; x += f.dir)
      for (let dy = -2; dy <= 1; dy++) dig(x, f.y + dy + (x === f.x ? 0 : Math.round((f.cy - f.y) * (x - f.x) / (f.cx - f.x || 1))));
    let x = f.cx, y = f.cy;
    for (let s = 0; s < FAULT.steps; s++) {
      const r = rng.int(3, 6);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++)
        if (dx * dx + dy * dy * 1.6 <= r * r) dig(x + dx, y + dy);
      x = clamp(x + rng.int(-2, 2), f.cx - FAULT.rx, f.cx + FAULT.rx);
      y = clamp(y + rng.int(-1, 1), f.cy - FAULT.ry, f.cy + FAULT.ry);
    }
    return cells;
  },

  /** 무너져 열린 칸들을 꾸민다 — 갈래를 하나 골라(이끼·종유·수정) 새 굴에 입히고, 드러난 벽의 몇 군데를 광석으로 바꾼다. */
  dressFault(f, cells) {
    const rng = new RNG(f.seed + 7);
    const k = [1, 2, 3][rng.int(0, 2)];
    f.k = k;
    const id = CAVE_TYPES[k].id;
    const ore = f.y > SY(300) ? T.MYTHRIL : f.y > SY(200) ? T.GOLD : f.y > SY(130) ? T.IRON : T.COPPER;
    for (const [x, y] of cells) {
      if (this.get(x, y) !== T.AIR) continue;
      const floor = this.solid(x, y + 1), ceil = this.solid(x, y - 1);
      const stoneAt = (sx, sy) => { const t = this.get(sx, sy); return t === T.STONE || t === T.LIMESTONE || t === T.GRANITE || t === T.DIRT; };
      if (id === 'moss') {
        for (const [hx, hy] of [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]])
          if (stoneAt(hx, hy) && rng.chance(0.85)) this.set(hx, hy, T.MOSSSTONE);
        if (ceil && rng.chance(0.45)) { this.set(x, y, T.HANGMOSS); if (this.get(x, y + 1) === T.AIR && rng.chance(0.5)) this.set(x, y + 1, T.HANGMOSS); }
        else if (floor && rng.chance(0.08)) this.set(x, y, T.GLOWCAP);
      } else if (id === 'drip') {
        if (ceil && rng.chance(0.3)) { this.set(x, y, T.STALACTITE); if (this.get(x, y + 1) === T.AIR && rng.chance(0.4)) this.set(x, y + 1, T.STALACTITE); }
        else if (floor && rng.chance(0.22)) this.set(x, y, T.STALAGMITE);
      } else if (floor && rng.chance(0.2)) this.set(x, y, T.GEODE);
      // 드러난 벽 — 광석이 박히고, 수정 동굴이면 수정이 더 박힌다
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        if (this.get(x + dx, y + dy) === T.STONE) {
          if (rng.chance(0.06)) this.set(x + dx, y + dy, ore);
          else if (id === 'geode' && rng.chance(0.1)) this.set(x + dx, y + dy, T.CRYSTAL);
        }
    }
    return k;
  },

  buildCaverns(rng) {
    // 구조물 자리(캠프·여명 마을·정글 폭포) — 중형·대형에서는 양 끝을 같이 늘려 넉넉히 비운다
    const reserved = x => (x > SX(685 + SHIFT) && x < SX(845 + SHIFT)) || (x > SX(1865 + SHIFT) && x < SX(2055 + SHIFT)) || (x > SX(1365 + SHIFT) && x < SX(1445 + SHIFT));
    this.caverns = [];
    let placed = 0, tries = 0;
    /* 큰 동굴 열여섯 곳 — 멀리서도 큰 줄 알아보게 크게 판다(걸음 150~240, 붓 반지름 4~7). */
    while (placed < Math.round(16 * WSX * WSY) && tries < 3000 * WSX * WSY) {
      tries++;
      const cx = rng.int(20, WW - 20);
      if (reserved(cx) || inSeaZone(cx)) continue;
      /* 큰 동굴은 DEEP_Y 언저리부터 — 얕으면 황금 상자를 초반에 너무 쉽게 줍는다. */
      const cy = rng.int(Math.max(this.surface[cx] + 60, DEEP_Y - 30), Math.min(WORLD_BOT - 20, HELL_Y - 8));
      if (cy < DEEP_Y - 30) continue;
      let x = cx, y = cy;
      const cells = [];
      const steps = rng.int(150, 240);
      for (let s = 0; s < steps; s++) {
        const r = rng.int(4, 7);
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (dx * dx + dy * dy > r * r) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 3 || xx >= WW - 3 || yy < 6 || yy >= WORLD_BOT - 8) continue;
          if (this.solid(xx, yy)) { this.set(xx, yy, T.AIR); cells.push([xx, yy]); }
        }
        x = clamp(x + rng.int(-1, 1), cx - 40, cx + 40);
        y = clamp(y + rng.int(-1, 1), cy - 24, cy + 24);
      }
      if (cells.length < 220) continue;   // 실패한 시도(막혀서 거의 안 파인 경우) — 개수에 안 센다
      // 벽 장식: 수정과 횃불을 군데군데
      for (let i = 0; i < 16; i++) {
        const [px, py] = cells[rng.int(0, cells.length - 1)];
        if (this.get(px, py + 1) !== T.AIR) continue;
        this.set(px, py, rng.chance(.5) ? T.TORCH : T.CRYSTAL);
      }
      /* 이제 **깊이로 등급을 매기고**(DEEP_Y 위는 4, 그 아래는 5, 지옥 근처만 6), 확률도 30%로 낮췄다 — 사연: docs/code-history.md#h123 */
      let chestTier = 0;
      if (rng.chance(0.30)) {
        const [gx, gy0] = cells[rng.int(0, cells.length - 1)];
        let fy = gy0;
        while (fy < WORLD_BOT - 8 && !this.solid(gx, fy + 1)) fy++;
        if (fy < WORLD_BOT - 8) {
          chestTier = fy < DEEP_Y ? 4 : fy < (DEEP_Y + HELL_Y) / 2 ? 5 : 6;
          this.objects.push({ type: 'chest', tier: chestTier, x: gx * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
          this.set(gx - 1, fy, T.TORCH);
          // 함정 — 등급이 높을수록 촘촘하게 — 사연: docs/code-history.md#h124
          let laid = 0;
          const want = chestTier >= 6 ? 4 : chestTier >= 5 ? 3 : 2;
          for (const tdx of [2, -2, 3, -3, 4, -4, 5, -5, 6, -6]) {
            if (laid >= want) break;
            const tx = clamp(gx + tdx, 3, WW - 3);
            let ty = fy;
            while (ty < WORLD_BOT - 8 && !this.solid(tx, ty + 1)) ty++;
            if (this.get(tx, ty) === T.AIR && this.solid(tx, ty + 1)) { this.set(tx, ty, T.SPIKE); laid++; }
          }
          /* 6등급만은 곡괭이 등급을 요구한다 — 상자를 미스릴 광맥 한 겹으로 덮어, 그걸 캘 수 있는 곡괭이가 없으면 보고도 못 가져가게 한다. */
          if (chestTier >= 6)
            for (let dx = -2; dx <= 2; dx++)
              for (let dy = -3; dy <= 0; dy++) {
                const wx = gx + dx, wy = fy - 3 + (dy + 3);
                if (Math.abs(dx) !== 2 && dy !== -3) continue;   // 테두리만
                if (this.get(wx, wy) === T.AIR) this.set(wx, wy, T.MYTHRIL);
              }
        }
      }
      // 물을 채울 때 다시 찾아올 수 있도록 이 큰 동굴이 실제로 파인 범위를 남긴다
      let bx0 = WW, bx1 = 0, by0 = WH, by1 = 0;
      for (const [px, py] of cells) {
        if (px < bx0) bx0 = px; if (px > bx1) bx1 = px;
        if (py < by0) by0 = py; if (py > by1) by1 = py;
      }
      this.caverns.push({ cx, cy, x0: bx0, x1: bx1, y0: by0, y1: by1, tier: chestTier });
      placed++;
    }
  },

  /* ================= 동굴 물 ================= */

  /** 물을 채우면 안 되는 자리인가 */
  _noWater(tx, ty, forLava) {
    if (tx < 4 || tx >= WW - 4 || ty < 4 || ty >= WH - 6) return true;
    if (this.sea && tx < this.sea.x1 + 4) return true;      // 바다는 buildSea가 따로 만든다
    if (ty < this.surface[clamp(tx, 0, WW - 1)] + 8) return true;   // 지표 근처는 제외
    // 지옥은 용암의 자리다 — 물은 거기 못 고이고, 용암은 **거기서만** 고인다
    if (forLava) { if (ty < HELL_Y + 4) return true; }
    else if (ty >= HELL_Y - 6) return true;
    if (this.inRuin && this.inRuin(tx, ty)) return true;            // 봉인실도 ruins에 들어 있다
    if (this.inWorks && this.inWorks(tx, ty)) return true;
    if (this.inRunaway && this.inRunaway(tx, ty)) return true;
    const d = this.dungeon;
    if (d && Math.abs(tx - d.x) <= d.w / 2 + 4 && Math.abs(ty - d.y) <= d.h / 2 + 4) return true;
    if (tx >= CAMP_X0 - 24 && tx <= CAMP_GX1 + 24) return true;
    const dc = this.dawnCity;
    if (dc && tx >= dc.x0 - 24 && tx <= dc.x1 + 24) return true;
    return false;
  },
};
mixin(World.prototype, WorldCaves, true);
