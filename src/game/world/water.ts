// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== world/water.js — 굴 물 · 지옥 · 정글 폭포 · 물가 장식 · 이끼 모서리 · 상자 ===== */
import { factory as Factory } from '../ctx.js';
import { clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { HELL_Y, SHIFT, SX, SY, WH, WORLD_BOT, WSX, WSY, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { FLUID_KIND } from '../data/materials.js';
import { MAT_LAYER, TS, World, inSeaZone } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldWater = {

  floodCaves(rng) {
    // 바다(buildSea)가 먼저 등록해 둔 웅덩이는 살린다 — 여기서 통째로 비우면 수중 몹이 바다에 안 나온다
    this.pools = (this.pools || []).filter(q => q.biome === 'sea');
    const bigX = new Set();
    for (const c of this.caverns || []) for (let x = c.x0; x <= c.x1; x++) bigX.add(x);

    // --- 1. 큰 동굴: 절반 남짓에 호수를 판다. 그중 일부는 천장에서 물이 떨어진다 ---
    const lakes = [];
    for (const c of this.caverns || []) {
      if (!rng.chance(0.55)) continue;
      // 바닥이 넓게 평평한 자리를 고른다 — 좁고 울퉁불퉁한 곳에 파면 웅덩이로 안 보인다
      let best = null;
      for (let k = 0; k < 70; k++) {
        const px = rng.int(c.x0 + 8, c.x1 - 8);
        const fy = this._deepFloor(px, c.y0, c.y1 + 10);
        if (fy < 0 || this._noWater(px, fy)) continue;
        let flat = 0;
        for (let dx = -7; dx <= 7; dx++) {
          const g = this._floorNear(px + dx, fy);
          if (g >= 0 && Math.abs(g - fy) <= 1) flat++;
        }
        // 같은 평탄도면 더 깊은 자리를 고른다 — 동굴 바닥에 고이는 게 자연스럽다
        if (flat >= 9 && (!best || flat > best.flat || (flat === best.flat && fy > best.y)))
          best = { x: px, y: fy, flat };
      }
      if (!best) continue;
      const cells = this._carveBasin(best.x, best.y, rng.int(5, 9), rng.int(2, 4));
      if (cells.length < 12) continue;
      let top = WH;
      for (const [, cy] of cells) if (cy < top) top = cy;
      this.pools.push({ x: best.x, y: top, n: cells.length, big: 1 });
      let x0 = WW, x1 = 0;
      for (const [cx, cy] of cells) if (cy === top) { x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); }
      lakes.push({ c, x: best.x, top, x0, x1 });
      this._airPocket(best.x, top, cells, rng);
    }

    /* --- 폭포: 호숫가 **옆벽의 샘 바위**에서 물이 나와 호수로 떨어진다 --- */
    const host = t => t === T.STONE || t === T.DIRT || t === T.LIMESTONE || t === T.GRANITE || t === T.SANDSTONE || t === T.MUD;
    /* 큰 동굴의 호수는 평평한 바닥 한가운데에 판 것이라 호수 바로 위에 벽이 있는 일이 드물다 (d1·d3 은 한 곳도 없었다 — 호숫가에서 벽까지 5~18칸). */
    const springAt = (lk) => {
      let best = null;
      for (let fx = lk.x0 - 6; fx <= lk.x1 + 6; fx++) {
        const over = fx >= lk.x0 && fx <= lk.x1;                  // 호수 위로 바로 떨어지나
        for (const dir of [-1, 1]) {
          // 호수 밖이면 벽은 **호수 반대쪽**이어야 한다 — 호수를 늘여 폭포 밑까지 잇는데(extendLake), 벽이 호수 쪽에 있으면 그 벽을 뚫어야 이어진다
          if ((fx < lk.x0 && dir > 0) || (fx > lk.x1 && dir < 0)) continue;
          // 아래에서 위로 — 이 열이 빈칸인 동안, 옆이 벽이고 그 벽 밑도 벽인 자리
          let floor = -1;
          for (let y = lk.top - 1; y < lk.top + 3; y++) if (this.get(fx, y) === T.AIR && (this.solid(fx, y + 1) || this.get(fx, y + 1) === T.WATER)) { floor = y; break; }
          if (floor < 0) continue;
          for (let hy = floor; hy > floor - 30 && hy > 6; hy--) {
            if (this.get(fx, hy) !== T.AIR) break;
            if (floor - hy < 5) continue;                        // 낙차가 너무 짧다
            if (!host(this.get(fx + dir, hy)) || !this.solid(fx + dir, hy + 1)) continue;
            if (this.ruinAt(fx + dir, hy)) continue;
            const dx = fx < lk.x0 ? lk.x0 - fx : fx > lk.x1 ? fx - lk.x1 : 0;   // 호숫가에서 몇 칸
            const sc = Math.min(floor - hy, 14) + (over ? 12 : 0) - dx * 2;
            if (!best || sc > best.sc) best = { fx, hy, dir, sc };
          }
        }
      }
      return best;
    };
    let fell = 0;
    for (const pass of [0, 1]) {
      for (const lk of lakes) {
        if (pass === 0 ? !rng.chance(0.75) : fell > 0) continue;
        if (lk.done) continue;
        const b = springAt(lk);
        if (!b) continue;
        if (!this._extendLake(lk, b.fx, b.dir)) continue;
        this.set(b.fx + b.dir, b.hy, T.SPRING);
        this.set(b.fx, b.hy, T.FLOWWATER);                        // 샘에서 한 칸 흘러나온 물 — 나머지는 fluidSettle
        // 폭포 앰비언트 음량을 거리로 매길 때 참조할 위치(music.js Ambient) — 타일을 매 프레임 훑는 대신 이 목록만 본다
        this.falls = this.falls || [];
        this.falls.push({ x: b.fx, y: (b.hy + lk.top) / 2 });
        lk.done = 1; fell++;
      }
    }

    // --- 2. 작은 동굴: 여기저기 고인 물. 큰 동굴 범위는 위에서 이미 다뤘으니 건너뛴다 ---
    let made = 0, tries = 0;
    const want = Math.round(46 * WSX * WSY);    // 세계 넓이(가로×세로 배수)에 비례 — 소형 46
    while (made < want && tries < 9000) {
      tries++;
      const px = rng.int(6, WW - 6);
      if (bigX.has(px)) continue;
      const py = rng.int(this.surface[px] + 14, Math.min(WORLD_BOT - 12, HELL_Y - 10));
      if (this.get(px, py) !== T.AIR) continue;
      const fy = this._floorBelow(px, py, 10);
      if (fy < 0 || this._noWater(px, fy)) continue;
      const cells = this._fillBasin(px, fy, 4, 14, false);
      if (cells.length < 5) continue;
      this._fillBasin(px, fy, 4, 14, true);
      let top = WH;
      for (const [, cy] of cells) if (cy < top) top = cy;
      this.pools.push({ x: px, y: top, n: cells.length, big: 0 });
      made++;
    }
  },

  /** 물속 공기 주머니 — 큰 호수의 천장 아래 물칸 몇 개를 공기로 바꾼다. */
  _airPocket(cx, top, cells, rng) {
    if (cells.length < 18 || !rng.chance(0.8)) return;
    // 지하 물에만 — 지상 호수는 수면이 바로 위라 숨 돌릴 자리가 필요 없고, 물에 뚫린 구멍으로만 보인다
    if (top < this.surface[clamp(cx, 0, WW - 1)] + 8) return;
    // 수면 아래로 두 칸 이상 남는 호수에만 — 얕은 웅덩이에 두면 수면에 뜬 거품처럼 보인다
    const inner = cells.filter(([, cy]) => cy >= top + 2);
    if (!inner.length) return;
    const [px, py] = inner[rng.int(0, inner.length - 1)];
    const w = rng.int(2, 3), h = rng.int(1, 2);
    for (let dx = 0; dx < w; dx++)
      for (let dy = 0; dy < h; dy++) {
        const x = px + dx, y = py + dy;
        if (this.get(x, y) !== T.WATER) continue;
        if (y <= top) continue;                       // 수면 줄은 그대로 둔다
        this.set(x, y, T.AIRPOCKET);
      }
  },

  /* 이제 동굴 호수·정글 호수와 *같은 방식**이다: 1) 바닥이 평평한 자리를 골라 (동굴 호수와 같은 평탄도 기준) 2) _carveBasin으로 웅덩이를 **파낸 뒤** 용암을 붓고 3)
     그 밖의 자잘한 자리는 — 사연: docs/code-history.md#h133 */
  floodHell(rng) {
    this.lavaPools = [];

    // --- 1. 큰 용암 호수 — 파낸다 ---
    let made = 0, tries = 0;
    while (made < Math.round(26 * WSX * WSY) && tries < 9000 * WSX * WSY) {
      tries++;
      const px = rng.int(8, WW - 8);
      const fy = this._deepFloor(px, HELL_Y + 6, WORLD_BOT - 8);       // 지옥 바닥까지 훑는다
      if (fy < 0 || this._noWater(px, fy, true)) continue;
      let flat = 0;
      for (let dx = -7; dx <= 7; dx++) {
        const g = this._floorNear(px + dx, fy);
        if (g >= 0 && Math.abs(g - fy) <= 1) flat++;
      }
      if (flat < 9) continue;                                   // 동굴 호수와 같은 평탄도 기준
      const cells = this._carveBasin(px, fy, rng.int(5, 9), rng.int(2, 4), T.LAVA);
      if (cells.length < 12) continue;
      let top = WH;
      for (const [, cy] of cells) if (cy < top) top = cy;
      this.lavaPools.push({ x: px, y: top, n: cells.length, big: 1 });
      made++;
    }

    // --- 2. 작은 웅덩이 — 고이는 만큼만 ---
    let small = 0; tries = 0;
    while (small < 40 && tries < 9000) {
      tries++;
      const px = rng.int(6, WW - 6);
      const py = rng.int(HELL_Y + 6, WORLD_BOT - 12);
      if (this.get(px, py) !== T.AIR) continue;
      const fy = this._floorBelow(px, py, 10);
      if (fy < 0 || this._noWater(px, fy, true)) continue;
      const cells = this._fillBasin(px, fy, 4, 14, false, T.LAVA);
      if (cells.length < 5) continue;
      this._fillBasin(px, fy, 4, 14, true, T.LAVA);
      let top = WH;
      for (const [, cy] of cells) if (cy < top) top = cy;
      this.lavaPools.push({ x: px, y: top, n: cells.length, big: 0 });
      small++;
    }
  },

  /** 정글 중간의 지상 폭포 + 호수. */
  buildJungleFalls(rng) {
    const cx = SX(1850 + SHIFT);
    if (this.biomeAt(cx).id !== 'jungle') return;   // 바이옴 경계가 시드에 따라 흔들릴 수 있다
    let leftY = 0;
    for (const sx of [cx - 30, cx - 25, cx - 20]) leftY += this.surface[clamp(sx, 0, WW - 1)];
    leftY = Math.round(leftY / 3);
    const rise = 14;                                 // "12블록 이상" 여유를 두고
    const rightY = leftY - rise;
    const cliffL = cx - 3, cliffR = cx + 3;
    const POOL_D = 5;                                // 폭포가 파낸 웅덩이 깊이

    /* --- 1. 왼쪽 기슭을 leftY 한 높이로 고른다 --- */
    const flatL = cx - 30, flatR = cliffL - 1;
    for (let x = flatL; x <= flatR; x++) {
      const ty = Math.round(lerp(this.surface[x], leftY, clamp((x - flatL) / 6, 0, 1)));
      const oldY = this.surface[x];
      if (ty < oldY) {                               // 땅을 돋운다
        for (let y = ty; y < oldY; y++) { this.set(x, y, y === ty ? T.JUNGLEGRASS : T.MUD); this.setWall(x, y, 11); }
      } else if (ty > oldY) {                        // 땅을 깎는다
        for (let y = oldY; y < ty; y++) this.set(x, y, T.AIR);
        this.set(x, ty, T.JUNGLEGRASS);
      }
      this.surface[x] = ty;
    }

    // --- 2. 오른쪽 대지를 끌어올린다 ---
    for (let x = cliffR; x <= cx + 34; x++) {
      const oldY = this.surface[x];
      if (oldY <= rightY) continue;
      for (let y = rightY; y < oldY; y++) {
        this.set(x, y, y === rightY ? T.JUNGLEGRASS : (y < rightY + 4 ? T.MUD : T.STONE));
        this.setWall(x, y, 11);
      }
      this.surface[x] = rightY;
    }

    /* --- 3. 절벽 · 윗물 · 폭포 뒤 굴 --- */
    const RIV = 12;                                  // 물길 길이(절벽 끝에서 굴 안쪽 벽까지)
    const hill0 = cliffL + 5, hill1 = cliffL + 18;   // 물길이 파고드는 언덕
    const clearAbove = (x, y) => {                   // 돋운 땅 위에 남은 나무·잎을 걷는다
      for (let yy = y - 1; yy > y - 26 && yy > 3; yy--) {
        const d = TILE_DEF[this.get(x, yy)];
        if (d.tree || d.leaf || this.get(x, yy) === T.VINE) this.set(x, yy, T.AIR);
      }
    };
    for (let x = cliffL; x <= hill1; x++) {
      if (x >= cliffL + 2) {
        // 절벽·대지 몸통 — 수면 아래 웅덩이 바닥보다 두 칸 더 깊게(물을 받쳐 준다)
        for (let y = rightY; y <= leftY + POOL_D + 2; y++) {
          this.set(x, y, y === rightY ? T.JUNGLEGRASS : y < rightY + 3 ? T.MUD : T.STONE);
          this.setWall(x, y, 11);
        }
        this.surface[x] = rightY;
      }
      // 언덕 — 가운데가 불룩한 둔덕.
      if (x >= hill0) {
        const h = 4 + Math.round(3 * Math.sin(Math.PI * (x - hill0) / (hill1 - hill0)));
        for (let y = rightY - h; y < rightY; y++) {
          this.set(x, y, y === rightY - h ? T.JUNGLEGRASS : y < rightY - h + 3 ? T.MUD : T.STONE);
          this.setWall(x, y, 11);
        }
        this.set(x, rightY, T.MUD);
        this.surface[x] = rightY - h;
        clearAbove(x, rightY - h);
      } else if (x >= cliffL + 2) clearAbove(x, rightY);
    }
    // 물길 — 두 줄 깊이.
    for (let x = cliffL + 2; x < cliffL + RIV; x++) {
      for (let y = rightY; y <= rightY + 1; y++) { this.set(x, y, T.WATER); this.setWall(x, y, 11); }
      if (x >= hill0 + 1) for (let y = rightY - 2; y < rightY; y++) { this.set(x, y, T.AIR); this.setWall(x, y, 11); }
      if (x < hill0 + 1) this.surface[x] = rightY;
    }
    // 절벽 끝으로 내민 아랫줄 물 — 폭포의 머리
    for (const x of [cliffL, cliffL + 1]) {
      for (let y = rightY - 3; y <= rightY; y++) if (this.get(x, y) !== T.AIR && !TILE_DEF[this.get(x, y)].solid) this.set(x, y, T.AIR);
      this.set(x, rightY + 1, T.WATER); this.setWall(x, rightY + 1, 11);
      for (let y = rightY + 2; y < leftY; y++) { this.set(x, y, T.FALLS); this.setWall(x, y, 11); }
      for (let y = leftY; y <= leftY + POOL_D; y++) { this.set(x, y, T.WATER); this.setWall(x, y, 11); }
      this.surface[x] = rightY + 1;
    }
    // 절벽 면의 이끼 — 폭포 물보라가 닿는 면이라 축축하다
    for (let y = rightY + 3; y < leftY + 2; y++)
      if (rng.chance(0.45)) this.set(cliffL + 2, y, T.MOSSSTONE);
    // 폭포 뒤 굴 — 수면 높이 바닥(leftY 줄은 돌로 남긴다), 둥근 천장
    const gx0 = cliffL + 2, gw = 5, gh = 5;
    for (let dx = 0; dx < gw; dx++) {
      const hh = Math.round(gh * Math.sqrt(1 - ((dx + 0.5) / gw) ** 2));
      for (let k = 1; k <= hh; k++) { this.set(gx0 + dx, leftY - k, T.AIR); this.setWall(gx0 + dx, leftY - k, 11); }
      const ceil = leftY - hh - 1;
      if (this.get(gx0 + dx, ceil) === T.STONE) this.set(gx0 + dx, ceil, T.MOSSSTONE);
    }
    this.set(gx0 + gw - 1, leftY - 1, T.GLOWCAP);
    this.set(gx0 + 2, leftY - 1, T.FERN);
    this.falls = this.falls || [];
    this.falls.push({ x: cliffL, y: (rightY + leftY) / 2 });

    /* --- 4. 호수: 폭포 바로 옆에 붙여서 판다 --- */
    const lakeR = cliffL - 1, lakeL = lakeR - 20;
    const cells = [];
    for (let x = lakeL; x <= lakeR; x++) {
      const d = Math.round(1 + (POOL_D - 1) * Math.sin(Math.PI / 2 * ((x - lakeL) / (lakeR - lakeL))));
      for (let k = 1; k <= d; k++) this.set(x, leftY + k, T.AIR);
      for (let k = 0; k <= d; k++) { cells.push([x, leftY + k]); this.setWall(x, leftY + k, 11); }
    }
    for (const [x, y] of cells) this.set(x, y, T.WATER);
    this._levelLiquid(cells, T.WATER);
    /* 제 쓰임새는 F 단계의 심해다. */
    // 동굴 호수 두 곳의 pools.push와 같은 최소 크기 기준(12칸) — 웅덩이 판정을 받으려면 이 정도는 돼야 한다.
    if (cells.length >= 12) {
      // 폭포 밑동 두 칸도 같은 물웅덩이다 — 낚시·스폰 판정이 한 덩어리로 잡히게 함께 센다
      const poolN = cells.length + (POOL_D + 1) * 2;
      // spawnMul — 이 호수의 생물 스폰은 동굴 호수(big:1) 대비 60%만 (trySpawnWater에서 소비) rareMul
      this.pools = this.pools || [];
      // biome 표시 — trySpawnWater()가 이 표시를 보고 동굴 웅덩이 대신 정글에 어울리는 생물(비단잉어 위주)을 고른다
      this.pools.push({ x: (lakeL + cliffL) >> 1, y: leftY, n: poolN, big: 1, spawnMul: 0.6, rareMul: 0.3, biome: 'jungle' });
    }

    // 장식 — 절벽 위아래에 발광 난초를 몇 그루 놓아 어둡지 않게 한다
    for (const x of [cliffR + 2, cliffR + 8, lakeL - 2, lakeL - 6]) {
      const fy = this.surface[clamp(x, 0, WW - 1)];
      if (this.get(x, fy) === T.AIR && this.solid(x, fy + 1)) this.set(x, fy, T.ORCHID);
    }
    /* 수련은 여기서 놓지 않는다 — 수면 높이가 뒤에서 한 번 더 바뀐다(sealLiquids) — 사연: docs/code-history.md#h134 */
    this.jungleLake = { x0: lakeL, x1: cliffR, y: leftY };
  },

  /** 이 열 위로 전주가 서 있는가 — 전주 기둥은 타일이 아니라 그림이라(factory.js), 그 아래를 밭으로 갈면 작물이 기둥과 겹쳐 그려진다. */
  poleColumn(x, y) {
    for (let ty = y - 1; ty >= y - 40 && ty > 2; ty--) {
      const m = this.machines.get(ty * WW + x);
      if (m) return m.t === 'pole';
      if (this.solid(x, ty)) return false;
    }
    return false;
  },

  /** 물 위 마무리 — 지형·액체가 다 정해진 **뒤에** 한 번만 돈다. */
  decorateWater(rng) {
    const lake = this.jungleLake;
    if (!lake) return;
    for (let x = lake.x0; x <= lake.x1; x++) {
      // 이 열의 진짜 수면 = 위에서 처음 만나는 물칸
      let top = -1;
      for (let y = lake.y - 8; y <= lake.y + 10; y++)
        if (this.get(x, y) === T.WATER) { top = y; break; }
      if (top < 0) continue;
      /* (1) 수면 위로 뻗은 초목을 걷어낸다. */
      for (let y = top - 1; y >= top - 26 && y > 4; y--) {
        const t = this.get(x, y);
        if (t === T.AIR || t === T.FALLS || t === T.LILY) continue;
        if (TILE_DEF[t].solid || FLUID_KIND[t]) break;           // 그 위는 다른 층(절벽 위 물길의 물 등)
        this.set(x, y, T.AIR);
      }
      // (2) 수련 — 수면 칸 자체에 띄운다.
      const nearFall = [-1, 0, 1].some(d => this.get(x + d, top - 1) === T.FALLS);
      if (!nearFall && rng.chance(0.3)) this.set(x, top, T.LILY);
    }
  },

  /** 동굴 웅덩이 꾸미기 — 물·지형이 다 정해진 뒤에 한 번. */
  decoratePonds(rng) {
    const natural = new Set();
    for (const k in MAT_LAYER) { natural.add(MAT_LAYER[k].wall); natural.add(MAT_LAYER[k].subWall); }
    const host = t => t === T.STONE || t === T.DIRT || t === T.MOSSSTONE || t === T.SANDSTONE ||
                      t === T.LIMESTONE || t === T.GRANITE;
    const wild = (x, y) => natural.has(this.walls[y * WW + x]) && !this.ruinAt(x, y);
    const seen = new Uint8Array(WW * WH);
    for (const pl of this.pools || []) {
      if (pl.biome) continue;                                   // 바다·정글은 제 손질이 있다
      // 웅덩이의 물칸을 모은다 — 기록된 수면 둘레에서 물칸 하나를 찾아 번진다
      let sk = -1;
      for (let dy = 0; dy <= 3 && sk < 0; dy++)
        for (let dx = -6; dx <= 6; dx++) if (this.get(pl.x + dx, pl.y + dy) === T.WATER) { sk = (pl.y + dy) * WW + pl.x + dx; break; }
      if (sk < 0 || seen[sk]) continue;
      const cells = [], st = [sk];
      seen[sk] = 1;
      while (st.length && cells.length < 900) {
        const k = st.pop(); cells.push(k);
        for (const d of [-1, 1, -WW, WW]) {
          const n = k + d;
          if (!seen[n] && this.tiles[n] === T.WATER) { seen[n] = 1; st.push(n); }
        }
      }
      if (cells.length < 4) continue;
      const y0 = (cells[0] / WW) | 0;
      if (y0 < this.surface[cells[0] % WW] + 8) continue;         // 지표 웅덩이는 건드리지 않는다
      let bx0 = WW, bx1 = 0, by0 = WH, by1 = 0;
      for (const k of cells) {
        const x = k % WW, y = (k / WW) | 0;
        bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
      }
      // 1) 이끼 — 웅덩이 둘레 굴.
      const RX = 11, RY = 8;
      for (let y = by0 - RY; y <= by1 + 3; y++)
        for (let x = bx0 - RX; x <= bx1 + RX; x++) {
          if (this.get(x, y) !== T.AIR || !wild(x, y)) continue;
          const dx = x < bx0 ? bx0 - x : x > bx1 ? x - bx1 : 0, dy = y < by0 ? by0 - y : 0;
          const p = 0.85 * (1 - Math.max(dx / RX, dy / RY));
          if (p <= 0) continue;
          if (host(this.get(x, y + 1)) && rng.chance(p)) this.set(x, y + 1, T.MOSSSTONE);
          for (const sx of [x - 1, x + 1]) if (host(this.get(sx, y)) && rng.chance(p * 0.8)) this.set(sx, y, T.MOSSSTONE);
          if (host(this.get(x, y - 1))) {
            if (rng.chance(p)) this.set(x, y - 1, T.MOSSSTONE);
            if (rng.chance(p * 0.5)) for (let k = 0, n = rng.int(1, 3); k < n && this.get(x, y + k) === T.AIR && this.get(x, y + k + 1) === T.AIR; k++) this.set(x, y + k, T.HANGMOSS);
          }
        }
      // 2) 수면·물속
      for (const k of cells) {
        const x = k % WW, y = (k / WW) | 0;
        const up = this.tiles[k - WW];
        if (up === T.AIR) {
          // 수면 — 폭포가 떨어지는 열과 그 옆에는 안 띄운다(물줄기가 잎을 뚫고 떨어진다)
          const nearFall = [-1, 0, 1].some(d => this.get(x + d, y - 1) === T.FALLS);
          if (!nearFall && rng.chance(0.24)) this.set(x, y, T.LILY);
        } else if (up === T.WATER && this.solid(x, y + 1) && rng.chance(0.3)) this.set(x, y, T.PONDWEED);
      }
      // 3) 물가 — 수면 줄 양 끝에서 바깥으로 세 칸까지, 바닥이 있는 빈칸
      let tx0 = WW, tx1 = 0;
      for (const k of cells) if (((k / WW) | 0) === by0) { tx0 = Math.min(tx0, k % WW); tx1 = Math.max(tx1, k % WW); }
      const sy = by0;
      for (const dir of [-1, 1]) {
        const ex = dir < 0 ? tx0 : tx1;
        for (let step = 1; step <= 3; step++) {
          const x = ex + dir * step;
          // 물가 바닥 높이 — 수면과 같은 줄이거나 한두 칸 위
          let fy = -1;
          for (let y = sy + 1; y >= sy - 2; y--) if (this.get(x, y) === T.AIR && this.solid(x, y + 1)) { fy = y; break; }
          if (fy < 0 || !wild(x, fy) || this.get(x, fy - 1) !== T.AIR) continue;
          if (rng.chance(step === 1 ? 0.55 : 0.3)) this.set(x, fy, T.CATTAIL);
          else if (rng.chance(0.35)) this.set(x, fy, T.PEBBLES);
        }
      }
    }
  },

  /** 오목한 모서리 — 바닥 이끼 칸과 벽 이끼 칸 사이, 대각선으로만 굴에 닿는 돌 한 칸. */
  fillMossCorners() {
    const host = t => t === T.STONE || t === T.DIRT || t === T.LIMESTONE || t === T.GRANITE || t === T.SANDSTONE;
    const open = (x, y) => TILE_DEF[this.get(x, y)].solid !== 1;
    const mos = (x, y) => this.get(x, y) === T.MOSSSTONE;
    const put = [];
    for (let x = 2; x < WW - 2; x++)
      for (let y = this.surface[x] + 6; y < HELL_Y; y++) {
        if (!host(this.get(x, y))) continue;
        for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
          if (open(x + dx, y + dy) && mos(x + dx, y) && mos(x, y + dy)) { put.push([x, y]); break; }
      }
    for (const [x, y] of put) this.set(x, y, T.MOSSSTONE);   // d1 실측 1416칸
  },

  scatterChests(rng) {
    let placed = 0, tries = 0;
    while (placed < Math.round(165 * WSX * WSY) && tries < 140000 * WSX * WSY) {
      tries++;
      const x = rng.int(4, WW - 5), y = rng.int(this.surface[x] + 12, WORLD_BOT - 8);
      if (inSeaZone(x)) continue;                 // 해저에는 지상식 상자를 흩뿌리지 않는다
      if (this.get(x, y) !== T.AIR || this.get(x, y - 1) !== T.AIR) continue;
      if (!this.solid(x, y + 1) || !this.solid(x + 1, y + 1)) continue;
      let tier = y > HELL_Y ? 5 : y > SY(326) ? 4 : y > SY(214) ? 3 : y > SY(142) ? 2 : 1;
      /* cave: 닫힌 굴에도 놓이는 '파고 찾는' 상자 — 유적 둘레에 걸려도 유적 상자가 아니다(tools/ruindiag.py) */
      this.objects.push({ type: 'chest', tier, cave: 1, x: x * TS, y: (y - 0.2) * TS, w: 30, h: 26, items: null });
      this.set(x - 1, y - 1, T.TORCH);
      placed++;
    }
  },
};
mixin(World.prototype, WorldWater, true);
