/* ===== world/plants.js — 물건 맞추기 · 나무 · 굴 메우기 · 농업 · 풀꽃 ===== */
import { factory as Factory } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { HELL_Y, WH, WORLD_BOT, WW } from '../size.js';
import { SEED_TILE, T, TILE_DEF } from '../data.js';
import { OBJ_SIZE } from '../data/items.js';
import { MAT_LAYER, TS, World, inSeaZone } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldPlants: Bag & ThisType<World> = {

  /** 설치물을 한 타일 규격(OBJ_SIZE)으로 맞춘다. */
  fitObjects() {
    for (const o of this.objects) {
      const s = OBJ_SIZE[o.type];
      if (!s) continue;
      /* 중심이 속한 칸으로 스냅해 정확히 한 칸을 쓰게 한다. */
      const tx = Math.floor((o.x + o.w / 2) / TS);
      const ty = Math.round((o.y + o.h) / TS);
      o.w = s.w; o.h = s.h;
      o.x = tx * TS + Math.round((TS - s.w) / 2);
      o.y = ty * TS - s.h;
    }
  },

  /** 베어낸 나무를 시간이 지나면 되살린다. */
  regrow(rng, n, centerX) {
    for (let k = 0; k < n; k++) {
      const x = clamp(Math.round(centerX + rng.range(-420, 420)), 2, WW - 3);
      if (Math.abs(x - this.spawnX) < 40) continue;   // 마을 안쪽은 피한다
      if (this.objects.some(o => o.type === 'rig' && !o.gone && Math.abs(x - o.tx) <= 7)) continue;   // 채취탑 둘레 — 수관이 탑에 안 걸리게
      const s = this.surface[x];
      const g = this.get(x, s);
      let leaf, chance;
      if (g === T.GRASS) { leaf = T.LEAF; chance = 0.14; }
      else if (g === T.CORRUPTGRASS) { leaf = T.CORRUPTLEAF; chance = 0.11; }
      else if (g === T.SNOW) { leaf = T.PINELEAF; chance = 0.08; }
      else continue;
      if (!rng.chance(chance)) continue;
      if (this.get(x, s - 1) !== T.AIR) continue;
      // 수관 사이 두 칸 — 굵은 나무 폭(곁잎 포함 ±4)을 둘 합친 ±11 안에 기둥·잎이 있으면 건너뛴다
      let occupied = false;
      for (let dx = -11; dx <= 11 && !occupied; dx++) {
        for (const dy of [-1, -4, -8]) {
          const t = this.get(x + dx, s + dy);
          if (t === T.WOOD || TILE_DEF[t].leaf) { occupied = true; break; }
        }
      }
      if (occupied) continue;
      if (leaf === T.PINELEAF) this.pineTree(x, s, rng);
      else this.tree(x, s, rng, T.WOOD, leaf);
    }
  },

  /** 기둥은 x부터 오른쪽으로 wdt칸을 차지한다. occR 를 주면 수관이 그 칸과 빈 칸 둘 이상 떨어질 때만 심고,
      심은 나무가 차지한 가장 오른쪽 칸을 돌려준다(못 심으면 null). 굵은(2칸) 나무는 키가 크고 잎이 많다. */
  tree(x, s, rng, woodT, leafT, occR) {
    let h = rng.int(5, 11);
    const wdt = h >= 9 && rng.chance(0.55) ? 2 : 1;
    if (wdt > 1) h = rng.int(12, 16);
    const r = wdt > 1 ? rng.int(3, 4) : rng.int(2, 3);
    const ext = wdt > 1 ? Math.max(r, 4) : r;              // 굵은 나무는 아래 곁잎 뭉치까지 4칸
    if (occR !== undefined && x - ext < occR + 3) return null;
    for (let dx = 0; dx < wdt; dx++)
      for (let y = s - 1; y > s - h; y--) this.set(x + dx, y, woodT);
    if (wdt > 1) this._groundTrunk(x, wdt, s, woodT);
    this._canopy(x, s - h, r, wdt, leafT, wdt > 1 ? 2 : 1);
    if (wdt > 1) {                                        // 수관 아래 좌우 곁잎 뭉치
      this._canopy(x - 2, s - h + r, 2, 1, leafT, 1);
      this._canopy(x + 3, s - h + r + 1, 2, 1, leafT, 1);
    }
    return x + wdt - 1 + ext;
  },

  /** 눈 지대 소나무 — 곧은 기둥에 **층층이 좁아지는 톱니 원뿔** 수관 — 사연: docs/code-history.md#h105 */
  pineTree(x, s, rng) {
    // 수관 폭이 9칸까지라 옆 소나무와 붙으면 원뿔 둘이 한 덩어리 톱니 벽이 된다 — 5칸 안에 나무가 있으면 건너뛴다
    for (let dx = -5; dx <= 5; dx++)
      for (const dy of [-1, -3, -6]) {
        const t = this.get(x + dx, s + dy);
        if (t === T.WOOD || TILE_DEF[t].leaf) return;
      }
    const h = rng.int(8, 14);
    const wdt = h >= 12 && rng.chance(0.4) ? 2 : 1;
    const top = s - h, bare = rng.int(2, 3);
    /* ★ 기둥은 수관 **밑까지만** 세운다. */
    const rows = s - bare - top;
    for (let dx = 0; dx < wdt; dx++)
      for (let y = s - 1; y >= top + rows; y--) this.set(x + dx, y, T.WOOD);
    if (wdt > 1) this._groundTrunk(x, wdt, s, T.WOOD);
    for (let i = 0; i < rows; i++) {
      const y = top + i;
      const k = i - 2, hw = i < 2 ? 0 : Math.min(wdt > 1 ? 5 : 4, Math.floor(k / 3) + (k % 3));   // 0 0 | 0 1 2 | 1 2 3 | 2 3 4 …
      for (let dx = -hw; dx <= hw + wdt - 1; dx++) {
        const t = this.get(x + dx, y);
        if (t === T.AIR) this.set(x + dx, y, T.PINELEAF);
      }
    }
  },

  /** 2칸 이상 폭인 기둥이 비탈에 걸치면 낮은 쪽 바닥까지 기둥을 이어 붙인다 — 기둥은 한 칸의 지표만 기준으로 심으므로, 옆 칸이 낮으면 밑동과 지면 사이가 비어 "바닥에 안 닿은
     나무통"이 된다. */
  _groundTrunk(x, wdt, s, woodT) {
    // 완만한 비탈(몇 칸 차이)만 메운다.
    const CAP = 4;
    for (let dx = 1; dx < wdt; dx++) {
      const s2 = this.surface[x + dx];
      if (s2 > s && s2 - s <= CAP) for (let y = s; y < s2; y++) this.set(x + dx, y, woodT);
    }
  },

  /** 수관 — 기둥 띠(x..x+wdt-1)에서의 거리로 재서, 굵은 기둥에도 캡슐 모양으로 얹힌다. */
  _canopy(x, top, r, wdt, leafT, slack) {
    for (let dx = -r; dx <= r + wdt - 1; dx++)
      for (let dy = -r; dy <= r - 1; dy++) {
        const hd = dx < 0 ? -dx : (dx > wdt - 1 ? dx - (wdt - 1) : 0);
        if (hd * hd + dy * dy > r * r + slack) continue;
        if (this.get(x + dx, top + dy) === T.AIR) this.set(x + dx, top + dy, leafT);
      }
  },

  /** 그 자리에 원래 있어야 할 지층 타일 (메울 때 쓴다) */
  _bedAt(x, y) {
    if (y >= WORLD_BOT - 4) return T.BEDROCK;
    if (y >= HELL_Y) return T.ASH;
    const L = MAT_LAYER[this.matId[x]], depth = y - this.surface[x];
    if (depth < 20) return L.sub;
    return L.deep;
  },

  /** 마지막 구멍 메우기 — pruneSmallCaves(생성 초반)가 끝난 **뒤에** 생긴 작은 굴을 메운다. */
  sweepPockets(maxSize) {
    const natural = new Set();
    for (const k in MAT_LAYER) { natural.add(MAT_LAYER[k].wall); natural.add(MAT_LAYER[k].subWall); }
    const busy = new Set();
    for (const o of this.objects) {
      const x0 = Math.floor(o.x / TS) - 1, x1 = Math.floor((o.x + (o.w || TS)) / TS) + 1;
      const y0 = Math.floor(o.y / TS) - 1, y1 = Math.floor((o.y + (o.h || TS)) / TS) + 1;
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) busy.add(y * WW + x);
    }
    for (const k of this.machines.keys()) busy.add(k);
    /* ★ 발판(solid 2)도 **트인 칸**으로 센다. */
    const open = k => { const t = this.tiles[k], d = TILE_DEF[t]; return t === T.AIR || d.solid === 2 || (!d.solid && !d.liquid); };
    const seen = new Uint8Array(WW * WH), cells = [];
    let filled = 0;
    for (let sx = 2; sx < WW - 2; sx++) {
      if (inSeaZone(sx)) continue;
      for (let sy = this.surface[sx] + 10; sy < HELL_Y - 2; sy++) {
        const k0 = sy * WW + sx;
        if (seen[k0] || !open(k0)) continue;
        cells.length = 0;
        const st = [k0]; seen[k0] = 1;
        let ok = true;
        while (st.length) {
          const c = st.pop(); cells.push(c);
          const cx = c % WW, cy = (c / WW) | 0;
          if (cells.length > maxSize || cy <= this.surface[cx] + 9 || cy >= HELL_Y - 2 || inSeaZone(cx)) ok = false;
          if (!natural.has(this.walls[c]) || busy.has(c)) ok = false;
          /* ★ 실격이어도 **끝까지 돈다.** */
          for (const d of [c - 1, c + 1, c - WW, c + WW]) {
            if (d < WW || d >= WW * (HELL_Y + 2)) { ok = false; continue; }
            if (TILE_DEF[this.tiles[d]].liquid) ok = false;
            if (!seen[d] && open(d)) { seen[d] = 1; st.push(d); }
          }
        }
        if (!ok) continue;
        if (cells.some(c => this.ruinAt(c % WW, (c / WW) | 0))) continue;
        for (const c of cells) this.set(c % WW, (c / WW) | 0, this._bedAt(c % WW, (c / WW) | 0));
        filled++;
      }
    }
    return filled;
  },

  /** 이어진 공동을 하나씩 재서, 기준보다 작고 지표와도 통하지 않는 것은 도로 메운다. */
  pruneSmallCaves(minSize) {
    const N = WW * WH;
    const seen = new Uint8Array(N);
    const stack = new Int32Array(N);      // 한 덩어리가 아무리 커도 넘치지 않게 최대 크기로
    const cells = new Int32Array(minSize);
    let pockets = 0;
    for (let sx = 1; sx < WW - 1; sx++) {
      const top = this.surface[sx] + 3;
      for (let sy = top; sy < WORLD_BOT - 5; sy++) {
        const k0 = sy * WW + sx;
        if (seen[k0] || this.tiles[k0] !== T.AIR) continue;
        let sp = 0, n = 0, open = false;
        stack[sp++] = k0; seen[k0] = 1;
        while (sp > 0) {
          const c = stack[--sp];
          const cx = c % WW, cy = (c / WW) | 0;
          if (n < minSize) cells[n] = c;
          n++;
          if (cy <= this.surface[cx] + 2) open = true;   // 지상과 통한다 — 굴 입구다
          if (cx > 0 && !seen[c - 1] && this.tiles[c - 1] === T.AIR) { seen[c - 1] = 1; stack[sp++] = c - 1; }
          if (cx < WW - 1 && !seen[c + 1] && this.tiles[c + 1] === T.AIR) { seen[c + 1] = 1; stack[sp++] = c + 1; }
          if (cy > 0 && !seen[c - WW] && this.tiles[c - WW] === T.AIR) { seen[c - WW] = 1; stack[sp++] = c - WW; }
          if (cy < WH - 1 && !seen[c + WW] && this.tiles[c + WW] === T.AIR) { seen[c + WW] = 1; stack[sp++] = c + WW; }
        }
        if (open || n >= minSize) continue;
        for (let i = 0; i < n; i++) {
          const c = cells[i];
          this.tiles[c] = this._bedAt(c % WW, (c / WW) | 0);
        }
        pockets++;
      }
    }
    return pockets;
  },

  /* ================= 농업 ================= */
  /** 씨앗을 심는다. */
  plantSeed(x, y, seedId) {
    const tile = SEED_TILE[seedId];
    if (tile === undefined) return false;
    if (this.get(x, y) !== T.AIR || !TILE_DEF[this.get(x, y + 1)].farm) return false;
    this.set(x, y, tile);
    this.crops.add(y * WW + x);
    return true;
  },

  /** 작물 한 단계 성장. */
  /** 자란 칸을 돌려준다 — 화면에 보이는 밭이면 게임 쪽에서 티를 낸다. */
  /** speed: 농사 숙련이 얹어 주는 성장 배율(1 = 보정 없음) */
  growCrops(rng, dayF, speed) {
    const out = { grew: [], ripe: [] };
    if (!this.crops.size) return out;
    const sp = speed === undefined ? 1 : speed;
    for (const k of this.crops) {
      const def = TILE_DEF[this.tiles[k]];
      if (!def.crop) { this.crops.delete(k); continue; }   // 캐갔거나 덮였다
      if (!def.crop.next) continue;                        // 이미 다 여물었다
      const x = k % WW, y = (k / WW) | 0;
      if (!TILE_DEF[this.get(x, y + 1)].farm) { this.crops.delete(k); continue; }   // 밭이 없어졌다
      // sp 를 크게 넘기면(아침 성장) 확률 굴림 없이 반드시 한 단계 자란다
      if (rng.chance(Math.min(1, 0.22 * (0.55 + dayF * 0.75) * sp))) {
        this.tiles[k] = def.crop.next;
        const nd = TILE_DEF[def.crop.next];
        (nd.crop && nd.crop.ripe ? out.ripe : out.grew).push(k);
      }
    }
    return out;
  },

  /** 부서지는 바닥 — 밟으면 잠깐 뒤 무너지고, 한참 뒤 되돌아온다 */
  tickCrumble(dt, p) {
    // 발밑을 본다
    const fy = Math.floor((p.y + p.h + 2) / TS);
    for (let x = Math.floor(p.x / TS); x <= Math.floor((p.x + p.w - 1) / TS); x++) {
      if (!TILE_DEF[this.get(x, fy)].crumble) continue;
      const k = fy * WW + x;
      if (!this.crumbled.has(k)) this.crumbled.set(k, 0.45);   // 무너지기까지
    }
    if (!this.crumbled.size) return;
    for (const [k, t] of this.crumbled) {
      const nt = t - dt;
      if (nt > 0) { this.crumbled.set(k, nt); continue; }
      // 어느 단계인지는 타일이 알려 준다 — CRUMBLE이면 무너질 차례, AIR면 돌아올 차례
      const x = k % WW, y = (k / WW) | 0;
      if (this.tiles[k] === T.CRUMBLE) {
        this.tiles[k] = T.AIR;
        this.crumbled.set(k, 9);                               // 9초 뒤 제자리로 · 먼지 없음(사연 #h140)
      } else {
        // 그 자리에 누가 서 있으면 끼이므로, 비어 있을 때만 되돌린다
        if (!this.hitSolid(x * TS, y * TS, TS, TS)) this.tiles[k] = T.CRUMBLE;
        this.crumbled.delete(k);
      }
    }
  },

  /** 퇴비 등으로 즉시 한 단계 키운다 */
  forceGrow(x, y) {
    const def = TILE_DEF[this.get(x, y)];
    if (!def.crop || !def.crop.next) return false;
    this.set(x, y, def.crop.next);
    return true;
  },

  /** 정글 나무 — 보통 나무보다 높고 수관이 넓다. */
  jungleTree(x, s, rng) {
    const h = rng.int(8, 13);
    // 정글 나무는 원래 키가 커서 굵은 쪽이 더 자주 나온다
    const wdt = rng.chance(0.6) ? 2 : 1;
    for (let dx = 0; dx < wdt; dx++)
      for (let y = s - 1; y > s - h; y--) this.set(x + dx, y, T.WOOD);
    if (wdt > 1) this._groundTrunk(x, wdt, s, T.WOOD);
    const top = s - h, r = rng.int(3, 5);
    this._canopy(x, top, r, wdt, T.JUNGLELEAF, 2);
    // 줄기 중간에도 곁가지를 낸다.
    for (let y = top + r; y < s - 2; y += rng.int(2, 4)) {
      const dir = rng.chance(0.5) ? 1 : -1;
      const len = rng.int(2, 4);
      // 굵은 기둥이면 오른쪽 곁가지는 기둥 바깥면에서 뻗어야 한다
      const from = dir > 0 ? wdt - 1 : 0;
      for (let k = 1; k <= len; k++) {
        if (this.get(x + from + dir * k, y) !== T.AIR) break;
        this.set(x + from + dir * k, y, T.JUNGLELEAF);
        // 곁가지 끝에서 덩굴이 늘어진다
        if (k === len && rng.chance(0.5))
          for (let v = 1; v <= rng.int(1, 4) && this.get(x + from + dir * k, y + v) === T.AIR; v++)
            this.set(x + from + dir * k, y + v, T.VINE);
      }
    }
    // 수관 가장자리에서도 길게 늘어뜨린다
    for (const dx of [-r + 1, r - 1 + wdt]) {
      if (!rng.chance(0.7)) continue;
      for (let k = 0; k < rng.int(3, 8); k++) {
        const yy = top + r - 1 + k;
        if (this.get(x + dx, yy) !== T.AIR) break;
        this.set(x + dx, yy, T.VINE);
      }
    }
  },

  /** 버섯 골짜기의 큰 발광 버섯 — 갓이 스스로 빛나 어두운 골짜기를 밝힌다. */
  glowStalk(x, s, rng) {
    const h = rng.int(4, 8);
    for (let y = s - 1; y > s - h; y--) this.set(x, y, T.WOOD);
    this._canopy(x, s - h, rng.int(2, 3), 1, T.GLOWLEAF, 1);
  },

  /** 사막의 큰 선인장 — 고체 블록 기둥이라 밟거나 스치면 아프다 */
  cactusPlant(x, s, rng) {
    const h = rng.int(2, 4);
    for (let y = s - 1; y > s - 1 - h; y--) this.set(x, y, T.CACTUS_BLOCK);
    if (h >= 3 && rng.chance(0.5)) {   // 팔 하나
      const ay = s - 1 - rng.int(1, h - 1), adx = rng.chance(0.5) ? -1 : 1;
      if (this.get(x + adx, ay) === T.AIR) this.set(x + adx, ay, T.CACTUS_BLOCK);
    }
  },
};
mixin(World.prototype, WorldPlants, true);
