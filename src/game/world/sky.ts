/* ===== world/sky.js — 던전 틀 · 하늘 섬 · 폭풍 제단 · 채취탑 · 광상 ===== */
import { factory as Factory } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { SHIFT } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { RIG, RUIN_HINTS } from '../data/ruins.js';
import { TS, World, inSeaZone } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldSky: Bag & ThisType<World> = {

  /* ---- 지하 묘실 ---- */
  buildDungeon(rng: any, n2: any) { const { SX, SY } = this.dims;
    // 묘실도 방 묶음으로.
    const cx = SX(2300 + SHIFT), cy = SY(240), w = 68, h = 38;   // 사막 지하
    const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.BRICK, floor: T.BRICK, bg: 6, rng, depth: 4, minW: 12, minH: 9
    });
    rooms.sort((a: any, b: any) => (b.w * b.h) - (a.w * a.h));
    const main = rooms[0], mfy = main.y + main.h - 3;
    // 입구 통로
    for (let y = this.surface[cx] + 2; y <= y0 + 1; y++) {
      for (let dx = -1; dx <= 1; dx++) this.set(cx + dx, y, T.AIR);
      this.setWall(cx, y, 6);
      if (y % 3 === 0) this.set(cx, y, T.PLATFORM);
    }
    this.dungeon = { x: cx, y: cy, w, h };
    this.objects.push({ type: 'altar', boss: 'bone_lord',
      x: (main.x + (main.w >> 1)) * TS, y: (mfy + 1) * TS - 44, w: 40, h: 44 });
    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 7) this.putDecor(x, r.y + 2, T.TORCH, 'any');
      if (r === main) continue;
      if (rng.chance(0.65)) this.putTileTrap(r, fy, rng.pick(['dart', 'crumble']), rng);
      if (rng.chance(0.4)) for (let k = 0; k < rng.int(2, 4); k++) this.set(r.x + 3 + k, fy, T.SPIKE);
      if (rng.chance(0.65))
        this.objects.push({ type: 'chest', tier: r.w * r.h < 180 ? 4 : 3,
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
  },

  /* ---- 하늘 섬 + 지상에서 올라가는 거대 나무 ---- */
  buildSkyIslands(rng: RNG, n1: any) { const { WSX, SX, SY, WW, SKY_Y, SEA_X1 } = this.dims;
    this.skyIslands = [];
    const N = Math.round(32 * WSX);     // 세계 폭에 맞춰 — 소형 32개
    /* 높이는 제 난수로 높·중·낮 세 층을 이웃과 다르게 고른다. ★ 본 난수의 cy 는 뽑기만 하고 버린다 —
       안 뽑으면 뒤따르는 유적·동굴이 씨앗마다 바뀐다(carveIsland·tree 가 뽑는 수는 높이와 무관하다). */
    const alt = new RNG(this.seed + '_skyalt');
    let last = -1;
    for (let i = 0; i < N; i++) {
      const cx = Math.round(((i + 0.5) / N) * WW + rng.range(-32, 32));
      if (inSeaZone(cx, SEA_X1)) continue;                // 바다 위에는 하늘 섬을 띄우지 않는다
      rng.int(SY(12), SKY_Y - 8);
      let tier = alt.int(0, 2);
      if (tier === last) tier = (tier + 1 + alt.int(0, 1)) % 3;
      last = tier;
      const cy = this.skyAlt(alt, tier);
      const rw = rng.int(13, 26), rh = rng.int(4, 8);
      this.carveIsland(cx, cy, rw, rh, rng);
      if (tier === 0) this._skyStrip(cx - rw, cx + rw + 1, cy);   // 높은 층 나무는 세계 천장에 잘린다
      this.skyIslands.push({ x: cx, y: cy, w: rw });
      // 섬마다 상자 하나
      this.objects.push({ type: 'chest', tier: 6, x: (cx + rng.int(-4, 4)) * TS, y: (cy - 1.2) * TS, w: 30, h: 26, items: null });
      if (rng.chance(.45)) this.set(cx + rng.int(-6, 6), cy - 1, T.TORCH);
    }

    // 관문 섬 — 거대 나무 꼭대기와 이어지며 폭풍 제단이 있다
    const gx = SX(1300 + SHIFT), gy = SY(18);   // 하늘 관문 — 잿빛 숲 위
    this.carveIsland(gx, gy, 34, 9, rng);
    this.skyIslands.push({ x: gx, y: gy, w: 34 });
    this.skyGate = { x: gx, y: gy };

    // 거대 나무: 지상 → 관문 섬
    const tx = gx, ts = this.surface[tx];
    for (let y = gy; y < ts; y++) {
      for (let dx = -2; dx <= 2; dx++) this.set(tx + dx, y, T.WOOD);
      // 좌우 번갈아 가지(발판) — 이걸 밟고 올라간다
      if (y % 4 === 0) {
        const dir = (y % 8 === 0) ? 1 : -1;
        for (let k = 3; k <= 9; k++) this.set(tx + dir * k, y, T.PLATFORM);
        if (y % 12 === 0) this.set(tx + dir * 9, y - 1, T.TORCH);
      }
      if (y % 7 === 0) for (const dx of [-4, 4]) { this.set(tx + dx, y, T.SKYLEAF); this.set(tx + dx, y + 1, T.SKYLEAF); }
    }
    for (let x = tx - 5; x <= tx + 5; x++) this.set(x, ts, T.GRASS);
    this.giantTree = { x: tx, top: gy, bottom: ts };
    // 신전은 나무 다음에 — 나무 줄기가 섬을 뚫고 올라온 자리(바닥 가운데)를 신전이 덮는다
    this.buildSkyTemple(gx, gy);
    this.buildSkyExtras();
  },

  /** 폭풍 제단의 신전 — 유적은 아니지만 유적처럼: 박공지붕 · 벽돌 벽 · 양쪽 문 · 뒤로 선 기둥 · 위층 회랑 둘.
      ★ gx 칸 가운데를 축으로 좌우가 같다(제단이 반 칸 치우쳤던 적이 있다). 가운데 5칸은 거대 나무가 올라오는
      구멍이라 한쪽으로만 통하는 발판으로 덮는다 — 막으면 나무로는 신전에 못 들어온다. */
  buildSkyTemple(gx: any, gy: any) {
    const F = gy, H = 16, R = 16;
    // 터 — 신전과 앞마당을 비우고 바닥을 유적 돌로
    for (let x = gx - R - 5; x <= gx + R + 5; x++) {
      for (let y = F - H - 2; y < F; y++) { this.set(x, y, T.AIR); this.walls[this.i(x, y)] = 0; }
      if (Math.abs(x - gx) > 2) this.set(x, F, T.RUINTILE);
    }
    for (let x = gx - 2; x <= gx + 2; x++) this.set(x, F, T.PLATFORM);
    // 벽 · 문(바닥에서 3칸) · 문 위 룬석
    for (const sx of [-R, R]) {
      for (let y = F - 12; y < F; y++) this.set(gx + sx, y, y >= F - 3 ? T.AIR : T.RUINBRICK);
      this.set(gx + sx, F - 4, T.RUNESTONE);
    }
    // 안쪽 뒷벽 · 뒤로 선 기둥(벽지 — 걸음을 막지 않는다)
    for (let x = gx - R + 1; x <= gx + R - 1; x++)
      for (let y = F - 12; y < F; y++) this.setWall(x, y, [5, 10].includes(Math.abs(x - gx)) ? 13 : 10);
    // 처마 · 박공
    for (let x = gx - R - 1; x <= gx + R + 1; x++) this.set(x, F - 13, T.RUINBRICK);
    for (let k = 1; k <= 4; k++) {
      const hw = R - 3 - k * 4 + 1;
      for (let x = gx - hw; x <= gx + hw; x++) {
        this.set(x, F - 13 - k, Math.abs(x - gx) === hw ? T.RUINBRICK : T.SKYSTONE);
        this.setWall(x, F - 13 - k, 10);
      }
    }
    this.set(gx, F - 15, T.RUNESTONE);
    // 처마에 난 채광 구멍 둘 — 무너진 자리가 아니라 빛이 드는 자리
    for (const k of [-1, 1]) for (let d = 8; d <= 9; d++) this.set(gx + k * d, F - 13, T.AIR);
    // 위층 회랑(한쪽으로만 막히는 발판) — 왼쪽엔 상자, 오른쪽엔 비문
    for (const k of [-1, 1]) for (let d = 9; d <= R - 1; d++) this.set(gx + k * d, F - 7, T.PLATFORM);
    this.objects.push({ type: 'chest', tier: 6, bonus: 'storm_amber', x: (gx - 13) * TS, y: (F - 7) * TS - 26, w: 30, h: 26, items: null });
    this.objects.push({ type: 'lorestone', lore: 'sky', hint: 3, x: (gx + 12) * TS + 4, y: (F - 7) * TS - 34, w: 26, h: 34 });
    // 매단 깃발 · 횃불(좌우 같은 자리)
    for (const k of [-1, 1]) {
      this.set(gx + k * 3, F - 12, T.BANNER); this.set(gx + k * 3, F - 11, T.BANNER);
      for (const d of [5, 9]) { this.set(gx + k * d, F - 8, T.TORCH); this.set(gx + k * d, F - 2, T.TORCH); }
      this.set(gx + k * (R - 1), F - 10, T.TORCH);
    }
    // 앞마당 — 서 있는 기둥(벽지)과 머리돌, 쓰러진 기둥 토막(한 칸 높이라 밟고 넘는다)
    for (const k of [-1, 1]) {
      for (const [d, h] of [[R + 3, 7], [R + 7, 5]]) {
        for (let y = F - h; y < F; y++) this.setWall(gx + k * d, y, 13);
        this.set(gx + k * d, F - h - 1, h > 6 ? T.RUNESTONE : T.RUINBRICK);
      }
      this.set(gx + k * (R + 10), F - 1, T.RUINBRICK); this.set(gx + k * (R + 11), F - 1, T.RUINBRICK);
      this.set(gx + k * (R + 5), F - 1, T.PEBBLES);
    }
    // 바닥(신전이 선 섬 표면 gy)에 밑면이 정확히 닿도록 h만큼 끌어올린다
    this.objects.push({ type: 'altar', boss: 'storm_warden', x: gx * TS + TS / 2 - 22, y: F * TS - 48, w: 44, h: 48 });
  },

  /** 잿빛 숲의 채취탑 자리를 골라 object(type 'rig')로 세운다 — 저장되므로 땅을 파도 자리가 옮겨 가지 않는다.
      ★ 자리 고르는 법은 예전 game.js rigs() 그대로다(바이옴 이름으로 묻는다 — 사연: docs/code-history.md#h51 · #h52).
      clear 면 발자국 안의 나무·풀을 걷는다 — 나무가 탑을 뚫고 자라 보였다. */
  placeRigs(clear: any) { const { BIOMES } = this.dims;
    if (this.objects.some(o => o.type === 'rig')) { for (const o of this.objects) if (o.type === 'rig') this.fitRig(o); return; }
    const LEG = RIG.leg;
    let wake = 9;
    for (const [bid, n] of RIG.in) {
      const b = BIOMES.find(q => q.id === bid);
      if (!b) continue;
      const x0 = b.x0 + RIG.edge, x1 = b.x1 - RIG.edge;
      for (let i = 0; i < n; i++) {
        const aim = Math.round(x0 + (x1 - x0) * (i + 0.5) / n);
        let at = null;
        for (let d = 0; d <= 120 && at === null; d++) {
          for (const tx of (d ? [aim - d, aim + d] : [aim])) {
            if (tx < x0 || tx > x1) continue;
            const s = this.surface[tx];
            const z = this.zoneAt(tx, s);
            if (z === 'camp' || z === 'village' || z === 'ruin') continue;
            if (this.ruins && this.ruins.some(r => Math.abs(tx - r.x) <= (r.w >> 1) + LEG + 2)) continue;
            let flat = true;
            for (let k = -LEG; k <= LEG && flat; k++) if (this.surface[tx + k] !== s) flat = false;
            for (let k = -LEG - 2; k <= LEG + 2 && flat; k++) if (Math.abs(this.surface[tx + k] - s) > 1) flat = false;
            if (flat) { at = tx; break; }
          }
        }
        if (at === null) continue;
        const ty = this.surface[at];
        this.objects.push(this.fitRig({ type: 'rig', tx: at, ty, wake: wake++ }));
        if (clear) this.clearRigSite(at, ty);
      }
    }
  },
  /** 우클릭 상자 = 그린 탑(다리·몸통·굴뚝)을 두른 사각형. 옛 세이브의 11×10칸 상자도 불러올 때 여기로 맞춘다. */
  fitRig(o: Bag) {
    o.x = (o.tx - RIG.half) * TS; o.y = (o.ty - RIG.stack) * TS;
    o.w = (RIG.half * 2 + 1) * TS; o.h = RIG.stack * TS;
    return o;
  },
  /** 탑 자리의 나무는 **덩어리째** — 기둥이 ±6칸 안이면 수관까지 통째로 걷고, 기둥이 밖이면 잎 한 칸도 자르지 않는다(탑 그림이 덮는다).
      칸 띠로 자르면 기둥 없는 잎이 뜨고, 이웃 나무 수관이 한쪽만 잘려 남았다 — 사연: docs/code-history.md#h153. 발자국 안의 풀 · 꽃은 걷는다. */
  clearRigSite(tx: number, ty: number) {
    const { WW } = this.dims;
    const isTree = (t: number) => t === T.WOOD || t === T.VINE || !!(TILE_DEF[t] && (TILE_DEF[t].leaf || TILE_DEF[t].tree));
    const isWood = (t: number) => t === T.WOOD || t === T.PALMWOOD;
    const seen = new Set<number>();
    for (let x = tx - 6; x <= tx + 6; x++)
      for (let y = ty - 26; y < ty; y++) {
        const t = this.get(x, y), d = TILE_DEF[t];
        if (isTree(t) && !seen.has(x + y * WW)) {
          const cells: number[] = [], st = [x + y * WW]; let inside = false;
          seen.add(st[0]);
          while (st.length) {
            const c = st.pop()!, cx = c % WW, cy = (c / WW) | 0;
            cells.push(c);
            if (isWood(this.get(cx, cy)) && Math.abs(cx - tx) <= 6) inside = true;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const n = cx + dx + (cy + dy) * WW;
              if (!seen.has(n) && isTree(this.get(cx + dx, cy + dy))) { seen.add(n); st.push(n); }
            }
          }
          if (inside) for (const c of cells) this.set(c % WW, (c / WW) | 0, T.AIR);
        } else if (this.inRig(x, y) && !d.solid && t !== T.AIR && !d.liquid && !isTree(t)) this.set(x, y, T.AIR);
      }
  },
  /** 광상 — 같은 종류 광맥 덩어리(4방향) 중 종류마다 큰 것 상위 `RICH_TOP`(20칸 이상)만 골라, 가장자리에서 가장 먼 칸과
      그 곁 1~2칸을 광상으로. 한가운데라 광맥을 파고 들어가야 닿는다(소형 d1 실측 100곳 안팎). 덩어리 수가 넓이를 따르니
      크기 배수는 따로 안 곱한다. ★ 제 난수(seed+'_rich')만 쓴다 — 본 난수를 뽑으면 뒤따르는 생성이 씨앗마다 바뀐다. */
  placeRichOres() { const { WW, WORLD_BOT } = this.dims;
    const r = new RNG(this.seed + '_rich');
    const RICH = { [T.COAL]: T.COALRICH, [T.COPPER]: T.COPPERRICH, [T.IRON]: T.IRONRICH, [T.LEAD]: T.LEADRICH,
      [T.GOLD]: T.GOLDRICH, [T.MYTHRIL]: T.MYTHRILRICH };
    const RICH_TOP = 0.016, MIN = 20, tl = this.tiles, seen = new Uint8Array(WW * WORLD_BOT);
    const ok = (i: number, t: any) => { const x = i % WW; return x > 0 && x < WW - 1 && i >= WW && i < WW * WORLD_BOT && tl[i] === t; };
    const flood = (i0: any, t: any, mk: any) => {   // 덩어리 칸 목록 — 덩어리끼리 안 겹쳐 두 번째 훑기는 표시만 바꾸면 된다
      const st = [i0], cells = []; seen[i0] = mk;
      while (st.length) {
        const i = st.pop(); cells.push(i);
        for (const j of [i + 1, i - 1, i + WW, i - WW]) if (seen[j] !== mk && ok(j, t)) { seen[j] = mk; st.push(j); }
      }
      return cells;
    };
    const found: Bag = {};   // 종류 → [[크기, 첫 칸]]
    for (let i = WW; i < WW * WORLD_BOT; i++) {
      const t = tl[i]; if (!RICH[t] || seen[i] || !ok(i, t)) continue;
      const n = flood(i, t, 1).length;
      (found[t] ||= []).push([n, i]);
    }
    let n = 0, sites = 0;
    for (const t of Object.keys(found).map(Number).sort((a, b) => a - b)) {
      const list = found[t].sort((a: any, b: any) => b[0] - a[0] || a[1] - b[1]);
      const take = Math.round(list.length * RICH_TOP);
      for (let k = 0; k < take && list[k][0] >= MIN; k++) {
        const cells = flood(list[k][1], t, 2), dist = new Map();
        let q = cells.filter(i => [i + 1, i - 1, i + WW, i - WW].some(j => !ok(j, t)));
        for (const i of q) dist.set(i, 0);
        while (q.length) {   // 가장자리에서 안으로 한 겹씩
          const nq = [];
          for (const i of q) for (const j of [i + 1, i - 1, i + WW, i - WW])
            if (ok(j, t) && !dist.has(j)) { dist.set(j, dist.get(i) + 1); nq.push(j); }
          q = nq;
        }
        const far = Math.max(...cells.map(i => dist.get(i)));
        const core = cells.filter(i => dist.get(i) === far).sort((a, b) => a - b);
        const c = core[r.int(0, core.length - 1)], put = [c], want = r.int(1, 2);
        for (let m = 0; m < want; m++) {   // 곁 칸은 안쪽(거리 큰 것)부터
          const nb = put.flatMap(i => [i + 1, i - 1, i + WW, i - WW]).filter(j => ok(j, t) && !put.includes(j));
          if (!nb.length) break;
          const best = Math.max(...nb.map(j => dist.get(j))), pick = [...new Set(nb.filter(j => dist.get(j) === best))].sort((a, b) => a - b);
          put.push(pick[r.int(0, pick.length - 1)]);
        }
        for (const i of put) { this.set(i % WW, (i / WW) | 0, RICH[t]); n++; }
        sites++;
      }
    }
    this.richCount = n; this.richSites = sites;
  },

  /** 채취탑이 그려진 칸인가 — 플레이어가 아무것도 못 놓는다(해체한 탑은 빼고). */
  inRig(x: number, y: number) {
    for (const o of this.objects) {
      if (o.type !== 'rig' || o.gone) continue;
      const dx = x - o.tx, up = o.ty - y;
      if (up < 1) continue;
      if ((Math.abs(dx) <= RIG.half && up <= RIG.tall) || (dx >= 0 && dx <= 1 && up <= RIG.stack)) return true;
    }
    return false;
  },

  /** 하늘 섬 높이 — 0 높은 층 · 1 가운데 · 2 낮은 층. 섬 밑동(+8칸)까지 SKY_Y 위에 들어야 해를 안 가린다(그 위만 햇빛이 통과). 사연: docs/code-history.md#h163 */
  skyAlt(r: any, tier: number) { const { SY, SKY_Y } = this.dims;
    return tier === 0 ? r.int(SY(4), SY(8)) : tier === 1 ? r.int(SY(11), SY(16)) : r.int(SKY_Y - 20, SKY_Y - 15);
  },
  /** 베이스캠프 · 여명 마을 위에는 하늘 섬을 두지 않는다 — 그 띠에 걸친 섬은 칸 · 벽지 · 물건까지 덩어리째 지운다.
      걸친 칸만 지우면 반쪽짜리 잘린 섬이 남았다. 땅 · 거대 나무와 이어진 덩어리(SKY_Y 아래까지 닿는 것)는 두고,
      생성 끝에 따로 돌아 난수를 뽑지 않는다(뒤따르는 유적 · 동굴이 그대로). */
  clearSkyOverSettlements() { const { CAMP_X0, CAMP_GX1 } = this.dims;
    const zones: number[][] = [[CAMP_X0 - 16, CAMP_GX1 + 16]];
    if (this.dawnCity) zones.push([this.dawnCity.x0 - 16, this.dawnCity.x1 + 16]);
    this.clearSkyBlobs(zones);
  },
  /** 그 x 구간들에 걸친 하늘 덩어리(땅에 안 닿은 것)를 통째로 걷는다 — 위에 놓인 물건 · 섬 기록도 같이 */
  clearSkyBlobs(zones: number[][]) { const { WW, SKY_Y } = this.dims;
    const floor = SKY_Y + 4, seen = new Uint8Array(WW * floor), gone: number[][] = [];
    for (const [a, b] of zones) for (let x = Math.max(0, a); x <= Math.min(WW - 1, b); x++) for (let y = 0; y < SKY_Y; y++) {
      const k = y * WW + x;
      if (seen[k] || this.get(x, y) === T.AIR) continue;
      const cells: number[] = [], st = [k]; let ground = false;   // 이어진 덩어리를 모은다(대각선 포함)
      seen[k] = 1;
      while (st.length) {
        const c = st.pop()!, cx = c % WW, cy = (c / WW) | 0;
        cells.push(c);
        if (cy >= floor - 1) ground = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= WW || ny < 0 || ny >= floor) continue;
          const n = ny * WW + nx;
          if (!seen[n] && this.get(nx, ny) !== T.AIR) { seen[n] = 1; st.push(n); }
        }
      }
      if (ground) continue;
      let x0 = WW, x1 = 0, y0 = floor, y1 = 0;
      for (const c of cells) {
        const cx = c % WW, cy = (c / WW) | 0;
        this.set(cx, cy, T.AIR); this.walls[this.i(cx, cy)] = 0;
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      }
      gone.push([x0, y0 - 3, x1, y1]);
    }
    if (!gone.length) return;
    const inGone = (tx: number, ty: number) => gone.some(([a, b, c, d]) => tx >= a && tx <= c && ty >= b && ty <= d);
    this.objects = this.objects.filter((o: Bag) => !inGone(Math.floor((o.x + (o.w || 0) / 2) / TS), Math.floor((o.y + (o.h || 0) - 1) / TS)));
    this.skyIslands = (this.skyIslands || []).filter((s: Bag) => !inGone(s.x, s.y));
  },
  /** 섬 위 나무를 걷는다. */
  _skyStrip(x0: number, x1: number, cy: number) {
    for (let x = x0; x <= x1; x++) for (let y = 0; y < cy; y++) {
      const t = this.get(x, y);
      if (t === T.WOOD || t === T.SKYLEAF) this.set(x, y, T.AIR);
    }
  },

  /** 하늘 섬을 더 — 큰 섬 · 작은 섬 · 조각 섬, 그리고 상자 말고도 찾아갈 거리.
      ★ 제 난수(seed+'_sky')를 쓴다. 본 난수를 더 뽑으면 뒤따르는 유적·동굴·성채가 씨앗마다 통째로 바뀐다.
      찾아갈 거리가 있는 섬은 위로 13칸이 필요해 SY(14) 아래 두 층, 조각 섬은 SY(5) 까지 — 바닥은 SKY_Y-15(밑동까지 SKY_Y 위 — 해를 안 가린다). */
  buildSkyExtras() { const { WSX, SX, SY, WW, SKY_Y, SEA_X1 } = this.dims;
    const r = new RNG(this.seed + '_sky');
    const occ: number[][] = [];
    const hit = (x0: number, y0: number, x1: number, y1: number) => occ.some(b => x0 < b[2] && b[0] < x1 && y0 < b[3] && b[1] < y1);
    for (const s of this.skyIslands) occ.push([s.x - s.w - 6, s.y - 14, s.x + s.w + 6, s.y + 14]);
    const g = this.skyGate; occ.push([g.x - 46, 0, g.x + 46, g.y + 16]);
    const cz = SX(3300 + SHIFT); occ.push([cz - 70, 0, cz + 74 + 16, 4 + 30 + 10]);   // 부유 성채(buildCitadel) — 왼쪽 닻 섬 둘까지
    const feat = () => r.chance(0.5) ? r.int(SY(14), SY(17)) : r.int(SKY_Y - 20, SKY_Y - 15);   // 큰 섬 밑동(+13)도 SKY_Y 위
    const place = (rw: any, rh: any, tries: any, band: any) => {
      for (let t = 0; t < tries; t++) {
        const cx = r.int(40 + rw, WW - 40 - rw), cy = band();
        if (inSeaZone(cx - rw, SEA_X1) || inSeaZone(cx + rw, SEA_X1)) continue;
        const box: [number, number, number, number] = [cx - rw - 5, cy - 13, cx + rw + 5, cy + rh + 6];
        if (hit(...box)) continue;
        occ.push(box);
        return { cx, cy };
      }
      return null;
    };
    const feats = ['pond', 'shrine', 'starfall', 'nest', 'garden', 'colonnade'];
    let fi = 0, hint = 0;
    // 여섯 가지를 한 벌씩 섞어 돌린다 — 무작위로 뽑으면 한 세계에 같은 것만 몰리기도 했다
    const nextFeat = () => {
      if (fi % feats.length === 0)
        for (let i = feats.length - 1; i > 0; i--) { const j = r.int(0, i); [feats[i], feats[j]] = [feats[j], feats[i]]; }
      return feats[fi++ % feats.length];
    };
    // 큰 섬 — 속이 빈 굴(그 안에 광맥과 상자) + 겉에 한 가지
    for (let i = 0; i < Math.round(5 * WSX); i++) {
      const rw = r.int(32, 44), rh = r.int(10, 13), at = place(rw, rh, 80, feat);
      if (!at) continue;
      this.carveIsland(at.cx, at.cy, rw, rh, r);
      this.skyIslands.push({ x: at.cx, y: at.cy, w: rw, k: 'grand' });
      const side = r.chance(0.5) ? 1 : -1;
      this.skyGrotto(at.cx - side * Math.round(rw * 0.3), at.cy, Math.round(rw * 0.42), rh, side, r);
      this.skyFeature(nextFeat(), at.cx + side * Math.round(rw * 0.45), at.cy, r, () => hint++);
    }
    // 보통 섬 — 저마다 찾아갈 거리 하나
    for (let i = 0; i < Math.round(13 * WSX); i++) {
      const rw = r.int(11, 20), rh = r.int(6, 9), at = place(rw, rh, 60, feat);
      if (!at) continue;
      this.carveIsland(at.cx, at.cy, rw, rh, r);
      const k = nextFeat();
      this.skyIslands.push({ x: at.cx, y: at.cy, w: rw, k });
      this.skyFeature(k, at.cx, at.cy, r, () => hint++);
    }
    // 조각 섬 — 건너뛰는 디딤돌. 구름 덩이 · 들꽃 · 에테르 한 알 · 드물게 별빛 수정
    for (let i = 0; i < Math.round(30 * WSX); i++) {
      const rw = r.int(3, 7), rh = r.int(2, 4), at = place(rw, rh, 30, () => r.int(SY(5), SKY_Y - 15));
      if (!at) continue;
      const cloud = r.chance(0.3);
      for (let x = at.cx - rw; x <= at.cx + rw; x++) {
        const t = (x - at.cx) / (rw + 0.5);
        const d = Math.max(1, Math.round(rh * Math.sqrt(Math.max(0, 1 - t * t))));
        for (let y = at.cy; y < at.cy + d; y++) {
          this.set(x, y, cloud ? T.CLOUD : y === at.cy ? T.SKYGRASS : y === at.cy + 1 ? T.CLOUD : T.SKYSTONE);
          this.setWall(x, y, 9);
        }
        if (!cloud && Math.abs(x - at.cx) < rw - 1) {
          const q = r.next();
          if (q < 0.16) this.set(x, at.cy - 1, T.FLOWER);
          else if (q < 0.22) this.set(x, at.cy - 1, T.WEED);
        }
      }
      if (!cloud && rh >= 3 && r.chance(0.3)) this.set(at.cx + r.int(-1, 1), at.cy + 1, T.AETHER);
      else if (!cloud && r.chance(0.08)) this.set(at.cx, at.cy - 1, T.STARCRYSTAL);
      this.skyIslands.push({ x: at.cx, y: at.cy, w: rw, k: cloud ? 'cloud' : 'islet' });
    }
  },

  /** 섬 윗면 한 자리를 비운다 — 섬마다 난 나무가 찾아갈 거리를 덮지 않게. */
  _skyClear(x0: number, x1: number, cy: number, up: any) {
    for (let x = x0; x <= x1; x++) for (let y = cy - up; y < cy; y++) this.set(x, y, T.AIR);
  },

  /** 큰 섬 속 굴 — 윗면 한쪽에 난 구멍으로 내려가면 에테르가 박힌 방과 상자. */
  skyGrotto(cx: any, cy: any, cw: any, rh: any, side: any, r: any) {
    const top = cy + 2, bot = cy + rh - 2, my = (top + bot) / 2, hh = Math.max(2, (bot - top) / 2 + 0.5);
    const floorOf: Bag = {};
    for (let x = cx - cw; x <= cx + cw; x++) {
      let b = cy; while (b < cy + rh + 3 && this.solid(x, b + 1)) b++;   // 이 칸 섬 밑바닥
      for (let y = top; y <= bot; y++) {
        // 모서리가 둥근 네모(초타원) — 타원이면 바닥이 가운데로 파여 걷기 어렵다
        const u = Math.abs(x - cx) / cw, v = Math.abs(y - my) / hh;
        if (u ** 4 + v ** 4 > 1 || y > b - 2) continue;
        this.set(x, y, T.AIR); this.setWall(x, y, 9);
        floorOf[x] = Math.max(floorOf[x] || 0, y);
      }
    }
    // 벽에 박힌 에테르 · 바닥의 수정 무리
    for (let x = cx - cw - 1; x <= cx + cw + 1; x++)
      for (let y = top - 1; y <= bot + 1; y++) {
        if (!this.solid(x, y) || this.get(x, y) === T.AETHER) continue;
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.get(x + dx, y + dy) === T.AIR && floorOf[x + dx] !== undefined);
        if (open && r.chance(0.14)) this.set(x, y, T.AETHER);
      }
    const xs = Object.keys(floorOf).map(Number).sort((a, b) => a - b);
    if (!xs.length) return;
    for (const x of xs) if (r.chance(0.12) && this.solid(x, floorOf[x] + 1)) this.set(x, floorOf[x], T.GEODE);
    // 구멍 — 굴의 한쪽 끝 위로 두 칸 폭, 세 줄마다 발판
    const ex = cx + side * Math.round(cw * 0.65);
    for (let y = cy; y <= floorOf[ex] - 1 || y <= top; y++) {
      for (const dx of [0, side]) { this.set(ex + dx, y, (y - cy) % 3 === 2 ? T.PLATFORM : T.AIR); this.setWall(ex + dx, y, 9); }
    }
    this._skyClear(ex - 1, ex + 2, cy, 6);
    // 상자는 굴 반대쪽 끝 바닥에
    const chx = cx - side * Math.round(cw * 0.45), fy = floorOf[chx];
    if (fy !== undefined) {
      if (this.get(chx, fy) === T.GEODE) this.set(chx, fy, T.AIR);
      this.objects.push({ type: 'chest', tier: 6, bonus: 'storm_amber', x: chx * TS - 4, y: (fy + 1) * TS - 26, w: 30, h: 26, items: null });
      this.set(chx - side * 2, fy, T.TORCH);
    }
    // 굴 가운데와 입구 쪽에도 횃불 — 섬 속이라 햇빛이 안 든다
    for (const tx of [cx, ex - side * 3]) if (floorOf[tx] !== undefined && this.get(tx, floorOf[tx]) === T.AIR) this.set(tx, floorOf[tx], T.TORCH);
  },

  /** 섬 윗면의 찾아갈 거리 하나 — 섬 표면이 cy 줄로 평평하다는 것(carveIsland)에 기댄다. */
  skyFeature(k: any, cx: any, cy: any, r: any, nextHint: any) {
    if (k === 'pond') {
      // 샘 연못 — 윗면을 파서 고인 물 · 수련 · 가장자리 부들과 들꽃
      const b = r.int(4, 6), dep = r.int(2, 3);
      this._skyClear(cx - b - 2, cx + b + 2, cy, 8);
      for (let x = cx - b; x <= cx + b; x++) {
        const d = Math.max(1, Math.round(dep * Math.sqrt(Math.max(0, 1 - ((x - cx) / (b + 0.5)) ** 2))));
        for (let y = cy; y < cy + d; y++) this.set(x, y, T.WATER);
        if (!this.solid(x, cy + d)) this.set(x, cy + d, T.SKYSTONE);
        if (r.chance(0.28)) this.set(x, cy, T.LILY);
      }
      for (const k2 of [-1, 1]) {
        this.set(cx + k2 * (b + 1), cy - 1, T.CATTAIL);
        if (r.chance(0.7)) this.set(cx + k2 * (b + 2), cy - 1, T.FLOWER);
      }
    } else if (k === 'shrine') {
      // 바람의 사당 — 유적 돌 바닥, 벽지 기둥 둘에 머리돌, 가운데 룬석 · 한 번 받는 축복(MYSTIC.gale)
      this._skyClear(cx - 5, cx + 5, cy, 8);
      for (let x = cx - 4; x <= cx + 4; x++) this.set(x, cy, Math.abs(x - cx) <= 1 ? T.RUNESTONE : T.RUINTILE);
      for (const k2 of [-1, 1]) {
        for (let y = cy - 5; y < cy; y++) this.setWall(cx + k2 * 4, y, 10);
        this.set(cx + k2 * 4, cy - 6, T.RUINBRICK);
      }
      for (let x = cx - 3; x <= cx + 3; x++) this.set(x, cy - 7, T.RUINBRICK);
      this.objects.push({ type: 'mystic', mk: 'gale', x: (cx - 1) * TS, y: (cy - 2) * TS, w: TS * 3, h: TS * 2 });
    } else if (k === 'starfall') {
      // 별똥 자리 — 얕은 구덩이, 녹아 굳은 바닥, 반쯤 묻힌 운석과 둘레의 별빛 수정(캐 갈 수 있다)
      const R = r.int(3, 4);
      this._skyClear(cx - R - 1, cx + R + 1, cy, 8);
      for (let x = cx - R; x <= cx + R; x++) {
        const d = Math.round(Math.sqrt(R * R - (x - cx) ** 2) * 0.6);
        for (let y = cy; y < cy + d; y++) { this.set(x, y, T.AIR); this.walls[this.i(x, y)] = 0; }   // 파인 자리는 하늘이 보인다
        this.set(x, cy + d, T.FUSEDROCK);
        if (Math.abs(x - cx) >= 2 && r.chance(0.55)) this.set(x, cy + d - 1, T.STARCRYSTAL);
      }
      const d0 = Math.round(R * 0.6);
      this.set(cx, cy + d0 - 1, T.METEORITE); this.set(cx, cy + d0, T.METEORITE);
    } else if (k === 'nest') {
      // 지킴이 둥지 — 낮은 돌 울타리 안의 상자. 열면 하늘 몹이 깨어난다
      this._skyClear(cx - 4, cx + 4, cy, 8);
      for (const k2 of [-1, 1]) { this.set(cx + k2 * 3, cy - 1, T.RUINBRICK); this.set(cx + k2 * 4, cy - 1, T.PEBBLES); }
      this.objects.push({ type: 'chest', tier: 6, bonus: 'cloud_pearl', x: cx * TS - 4, y: cy * TS - 26, w: 30, h: 26, items: null,
        guard: { t: r.pick(['gale', 'sky_sentry', 'cloudjelly']), n: r.int(2, 3) } });
    } else if (k === 'garden') {
      // 버려진 하늘 밭 — 다 여문 서리쑥 · 뼈꽃. 캐면 씨앗이 함께 나온다(전리품으로만 얻던 씨앗)
      this._skyClear(cx - 6, cx + 6, cy, 8);
      for (let x = cx - 4; x <= cx + 4; x++) {
        this.set(x, cy, T.FARMLAND);
        if (r.chance(0.8)) this.set(x, cy - 1, r.chance(0.6) ? T.HERB3 : T.BLOOM3);
      }
      for (const k2 of [-1, 1]) this.set(cx + k2 * 5, cy - 1, T.FENCE);
    } else if (k === 'colonnade') {
      // 무너진 열주 — 벽지 기둥 넷(높이 제각각)과 머리돌, 쓰러진 토막, 가운데 비문
      this._skyClear(cx - 7, cx + 7, cy, 9);
      for (let x = cx - 6; x <= cx + 6; x++) this.set(x, cy, T.RUINTILE);
      for (const [d, h] of [[-6, 6], [-3, 4], [3, 5], [6, 3]]) {
        for (let y = cy - h; y < cy; y++) this.setWall(cx + d, y, 10);
        this.set(cx + d, cy - h - 1, h >= 5 ? T.RUNESTONE : T.RUINBRICK);
      }
      this.set(cx + 4, cy - 1, T.RUINBRICK); this.set(cx + 5, cy - 1, T.RUINBRICK);
      this.objects.push({ type: 'lorestone', lore: 'sky', hint: nextHint() % RUIN_HINTS.sky.length,
        x: cx * TS - 2, y: cy * TS - 34, w: 26, h: 34 });
    }
  },

  carveIsland(cx: any, cy: any, rw: any, rh: any, rng: any) {
    for (let x = cx - rw; x <= cx + rw; x++) {
      const t = (x - cx) / rw;
      const depth = Math.round(rh * Math.sqrt(Math.max(0, 1 - t * t)) * rng.range(.85, 1.15));
      if (depth <= 0) continue;
      for (let y = cy; y < cy + depth; y++) {
        if (!this.inB(x, y)) continue;
        const d = y - cy;
        this.set(x, y, d === 0 ? T.SKYGRASS : d < 2 ? T.CLOUD : T.SKYSTONE);
        this.setWall(x, y, 9);
      }
      // 에테르 광맥
      if (depth > 3 && rng.chance(.16)) this.set(x, cy + depth - 1, T.AETHER);
      // 아래로 늘어진 구름
      if (rng.chance(.22)) for (let k = 0; k < rng.int(1, 4); k++) this.set(x, cy + depth + k, T.CLOUD);
      // 하늘 나무 (섬 표면에)
      if (rng.chance(.08)) this.tree(x, cy, rng, T.WOOD, T.SKYLEAF);
    }
  },
};
mixin(World.prototype, WorldSky, true);
