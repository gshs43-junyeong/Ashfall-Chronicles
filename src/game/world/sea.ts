// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== world/sea.js — 가라앉은 바다 · 물 가두기 · 웅덩이 ===== */
import { factory as Factory } from '../ctx.js';
import { clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { GLACIER_X1, SEA_X1, SX, WH, WORLD_BOT, WSX, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { BEACH_W, DAWN_OBJ, TS, World } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldSea = {

  /* ================= 가라앉은 바다 (세션 3) ================= */
  buildSea(rng, n1) {
    this.pools = this.pools || [];      // floodCaves보다 먼저 돌 수 있으므로 없으면 만든다
    const shore = SEA_X1;
    this.seaLevel = this.surface[shore] + 1;              // 수면 = 물가 지면 한 칸 아래
    const FLOOR = WH - 26;                               // 가장 깊은 바닥
    this.sea = { x1: shore, level: this.seaLevel, floor: FLOOR };

    /* 실제 바다처럼 셋으로 나눈다 — 사연: docs/code-history.md#h125 */
    const WADE = 50;                                      // 걸어 들어가는 여울
    /* 여울 끝에서 평원까지. */
    const RUN = Math.max(60, Math.min(SX(300), shore - WADE - SX(60)));
    /* 물가 50칸은 **한 칸씩만, 그것도 절반 확률로만** 내려간다. */
    this.shoreY = this.seaLevel + 2;                       // 물가 깊이 — 바다·해변이 함께 쓴다
    const wadeRng = new RNG(this.seed + '_wade');
    const wadeBed = new Int16Array(WADE + 1);
    /* 물가 깊이는 **한 값으로 정해 두고 바다·해변 양쪽이 함께 쓴다.** — 사연: docs/code-history.md#h126 */
    wadeBed[0] = this.shoreY;
    for (let k = 1; k <= WADE; k++) wadeBed[k] = wadeBed[k - 1] + (wadeRng.chance(0.5) ? 1 : 0);
    for (let x = 0; x < shore; x++) {
      const fromShore = shore - x;
      let base;
      if (fromShore <= WADE) base = wadeBed[fromShore];
      else {
        /* 여울 뒤로는 **기울기가 서서히 커졌다가 다시 작아진다**(smoothstep) — 사연: docs/code-history.md#h127 */
        const t = clamp((fromShore - WADE) / RUN, 0, 1);
        base = lerp(wadeBed[WADE], FLOOR, t * t * (3 - 2 * t));
      }
      /* 흔들림은 아주 조금만 — 요철이 있으면 헤엄쳐 다닐 때 바닥이 계속 걸린다. */
      const jitter = fromShore <= WADE ? 0 : (n1(x + 7700, 0.02) - 0.5) * 4;
      /* 하한을 seaLevel+6으로 두면 물가 여울(수면+2에서 시작)이 통째로 6까지 눌려 내려가, 정확히 물가에서 네 칸짜리 턱이 생겼다. */
      const bed = Math.round(clamp(base + jitter, this.shoreY, FLOOR));
      /* 지표선은 수면 바로 위로 잡는다. */
      this.surface[x] = this.seaLevel - 1;
      // 해저 위쪽을 전부 물로 — 수면부터 해저까지
      for (let y = this.seaLevel; y < bed; y++) this.set(x, y, T.SEAWATER);
      // 해저 지층
      for (let y = bed; y < WH; y++) {
        let t2;
        if (y >= WH - 4) t2 = T.BEDROCK;
        else if (y - bed < 4) t2 = T.SAND;
        else if (y - bed < 16) t2 = T.SANDSTONE;
        else t2 = T.STONE;
        this.set(x, y, t2);
        this.walls[this.i(x, y)] = 8;
      }
      /* 수면 위는 하늘 — 타일뿐 아니라 **배경 벽도 지운다**. 벽이 남아 있으면 그 칸은 '실내'로 쳐서 햇빛 씨앗이 안 심기고(walls === 0 조건), 바다 위가 어두운 띠로
         남는다. */
      for (let y = 4; y < this.seaLevel; y++) {
        if (this.get(x, y) !== T.AIR) this.set(x, y, T.AIR);
        this.walls[this.i(x, y)] = 0;
      }
      for (let y = this.seaLevel; y < bed; y++) this.walls[this.i(x, y)] = 8;
      this.seaBed = this.seaBed || new Int16Array(shore);
      this.seaBed[x] = bed;
    }

    /* 얕은 해저의 해초 — 캐면 kelp가 나온다. */
    for (let x = Math.max(2, shore - 170); x < shore; x++) {
      const bed = this.seaBed[x];
      if (bed === undefined || bed <= this.seaLevel + 2) continue;
      if (this.get(x, bed) !== T.SAND || this.get(x, bed - 1) !== T.SEAWATER) continue;
      // 얕을수록 빽빽하게 — 빛이 닿는 데서만 자란다
      const depth = bed - this.seaLevel;
      if (rng.chance(clamp(0.55 - depth * 0.004, 0.08, 0.55))) this.set(x, bed - 1, T.KELPPLANT);
    }

    /* 해저 굴 — **심해 평원에만** 판다. */
    const plainR = Math.max(20, shore - (WADE + RUN));     // 평원 오른쪽 끝
    /* 굴은 평원이 주인데, 비탈에도 몇 개는 뚫어 둔다 — 비탈이 통짜 모래벽이면 내려가는 길에 볼 것이 없다. */
    for (let k = 0; k < 6; k++) {
      const cx = rng.int(plainR + 10, Math.max(plainR + 11, shore - WADE - 10));
      const bed = this.seaBed[clamp(cx, 0, shore - 1)];
      const r = rng.int(3, 5);
      for (let dx = -r; dx <= r; dx++)
        for (let dy = 0; dy <= r; dy++) {
          const x = cx + dx, y = bed + dy;
          if (x < 1 || x >= shore || y >= WH - 8) continue;
          if (dx * dx + dy * dy > r * r) continue;
          this.set(x, y, T.SEAWATER);
        }
    }
    for (let k = 0; k < Math.round(26 * WSX) && plainR > 20; k++) {
      const cx = rng.int(6, plainR - 6);
      const bed = this.seaBed[cx];
      const r = rng.int(3, 7);
      const hill = rng.chance(0.15);
      for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++) {
          const x = cx + dx, y = bed + dy;
          if (x < 1 || x >= plainR || y < this.seaLevel + 2 || y >= WH - 8) continue;
          if (dx * dx + dy * dy > r * r) continue;
          if (hill) { if (dy >= 0) this.set(x, y, dy < 2 ? T.SAND : T.SANDSTONE); }
          // dy>=0 이라야 바닥 줄까지 뚫려 **입구가 열린 구덩이**가 된다.
          else if (dy >= 0) this.set(x, y, T.SEAWATER);
        }
    }
    /* 바다도 웅덩이 목록에 올린다 — 수중 몹 생성(trySpawnWater)·낚시 보정이 이 표를 본다. */
    for (let cx = 20; cx < shore; cx += 60) {
      const bed = this.seaBed[Math.min(cx, shore - 1)];
      const mid = Math.round((this.seaLevel + bed) / 2);
      // 깊은 쪽 한 점, 수면 쪽 한 점 — 스폰표가 깊이로 종류를 가르므로 둘 다 있어야 얕은 물에서 게·해파리를, 깊은 곳에서 문어·아귀를 만난다
      this.pools.push({ x: cx, y: mid, n: (bed - this.seaLevel) * 60, big: 1,
                        biome: 'sea', spawnMul: 0.9, rareMul: 1.4 });
      this.pools.push({ x: cx, y: this.seaLevel + 6, n: 400, big: 1,
                        biome: 'sea', spawnMul: 0.7, rareMul: 1.0 });
    }
    /* --- 해변 --- */
    this.beach = { x0: shore, x1: shore + BEACH_W };
    for (let k = 0; k <= BEACH_W; k++) {
      const x = shore + k;
      if (x >= WW - 2) break;
      /* 해변 높이 — 세 토막. */
      const inlandRaw = this.surface[clamp(shore + BEACH_W, 0, WW - 1)];
      const target = Math.min(inlandRaw, this.seaLevel - 1);
      const SHOAL = 6, FLAT = 11;
      let want;
      if (k < SHOAL) want = Math.round(lerp(this.shoreY, this.seaLevel - 1, k / SHOAL));
      else if (k < FLAT) want = this.seaLevel - 1;
      else want = Math.round(lerp(this.seaLevel - 1, target, (k - FLAT) / (BEACH_W - FLAT)));
      const cur = this.surface[x];
      /* 위쪽은 **want보다 위를 전부** 비운다 — 사연: docs/code-history.md#h128 */
      for (let y = Math.min(cur, want) - 10; y < Math.max(cur, want) + 8; y++) {
        if (y < 4) continue;
        if (y < want) { this.set(x, y, T.AIR); this.walls[this.i(x, y)] = 0; }
        else if (y < want + 6) { this.set(x, y, T.SAND); this.walls[this.i(x, y)] = 8; }
        else if (this.get(x, y) === T.AIR) { this.set(x, y, T.SANDSTONE); this.walls[this.i(x, y)] = 8; }
      }
      this.surface[x] = want;
      // 수면보다 낮은 모래 위에는 얕은 물을 채운다 — 모래와 바다가 끊기지 않는다
      for (let y = this.seaLevel; y < want; y++) { this.set(x, y, T.SEAWATER); this.walls[this.i(x, y)] = 8; }
    }

    /* --- 윤슬의 방 (비밀 상점) --- */
    {
      const rx = clamp(18, 8, Math.max(9, plainR - 20));
      const bed = this.seaBed[rx];
      const RW = 11, RH = 7;
      const y0 = Math.min(WH - 12, bed + 3);
      const fy = y0 + RH - 1;                              // 바닥 줄
      for (let dx = -RW; dx <= RW; dx++)
        for (let dy = 0; dy <= RH; dy++) {
          const x = rx + dx, y = y0 + dy;
          if (x < 2 || x >= shore || y >= WH - 5) continue;
          const edge = Math.abs(dx) >= RW - 1 || dy >= RH - 1;
          if (edge) { this.set(x, y, T.SANDSTONE); this.walls[this.i(x, y)] = 8; }
          else { this.set(x, y, T.ROOMAIR); this.walls[this.i(x, y)] = 15; }   // 나무 판자 벽지
        }
      // 천장에 입구 — 평원 바닥에서 방으로 떨어져 들어온다
      for (let y = bed; y < y0 + 1; y++)
        for (let dx = -1; dx <= 1; dx++) this.set(rx + dx, y, T.SEAWATER);

      /* 바닥·천장에 낡은 판자를 덧댄다. */
      for (let dx = -RW + 1; dx <= RW - 1; dx++) {
        this.set(rx + dx, fy, T.MINEWOOD);                 // 판자 바닥
        // 천장 서까래 — 드문드문 걸되, 가운데 세 칸은 들어오는 구멍이라 비운다
        if (dx % 3 !== 0 && Math.abs(dx) > 1) this.set(rx + dx, y0 + 1, T.MINEWOOD);
      }
      // 양쪽 벽에 기둥 한 줄씩 — 방이 통짜 상자로 안 보이게
      for (let dy = 2; dy < RH - 1; dy++) {
        this.set(rx - RW + 2, y0 + dy, T.MINEWOOD);
        this.set(rx + RW - 2, y0 + dy, T.MINEWOOD);
      }
      // 횃불 넷 — 벽 기둥 안쪽에 걸어 방 전체가 은은하게 밝다
      for (const dx of [-RW + 3, -3, 3, RW - 3]) this.set(rx + dx, y0 + 2, T.TORCH);
      // 살림 — 선반과 탁자.
      const shS = DAWN_OBJ.shelf, tbS = DAWN_OBJ.table;
      this.objects.push({ type: 'furniture', kind: 'shelf',
        x: (rx - RW + 4) * TS, y: fy * TS - shS.h, w: shS.w, h: shS.h });
      this.objects.push({ type: 'furniture', kind: 'table',
        x: (rx + 4) * TS, y: fy * TS - tbS.h, w: tbS.w, h: tbS.h });
      this.objects.push({ type: 'npc', npc: 'yunseul',
        x: rx * TS, y: fy * TS - 44, w: 22, h: 44 });
      this.yunseul = { x: rx, y: fy };
    }

    /* --- 바다 한복판의 섬 (비밀) --- */
    {
      /* 윗면은 파도와 같은 줄(seaLevel)에 둔다 — 파도 바로 위에 선다. 가운데 평평한 모래톱
         양쪽이 한 칸에 한 칸씩 물 밑으로 잠기는 비탈이고, 밑면은 타원 — 끝이 벽이나 얇은 날개가 되지 않는다. */
      const ix = SX(200), FLAT = 9, SLOPE = 5, THICK = 12;
      const half = FLAT + SLOPE, iw = half * 2 + 1;
      const iy = this.seaLevel;
      for (let dx = -half; dx <= half; dx++) {
        const x = ix + dx, ax = Math.abs(dx);
        if (!this.inB(x, iy)) continue;
        const top = iy + Math.max(0, ax - FLAT);
        const r = ax / (half + 1);
        const bot = Math.max(top + 1, iy + Math.round(THICK * Math.sqrt(1 - r * r)));
        for (let y = top; y <= bot && this.inB(x, y); y++) {
          this.set(x, y, y - top < 2 ? T.SAND : T.SANDSTONE);
          // 물에 잠긴 몸통 뒤에는 벽을 둔다 — 안 그러면 그 칸이 '바깥'이라 물빛이 샌다
          this.walls[this.i(x, y)] = 8;
        }
      }
      /* 야자수 — 줄기가 기울어 자란다 — 사연: docs/code-history.md#h130 */
      for (const [px, lean, hgt] of [[ix - 7, -1, 7], [ix - 1, 1, 8], [ix + 7, 1, 6]]) {   // 모래톱 안 · 잎갓(7칸)끼리 안 겹치게
        let cx = px;
        for (let k = 0; k < hgt; k++) {
          const y = iy - 1 - k;
          this.set(cx, y, T.PALMWOOD);
          if (k > 1 && k % 3 === 0 && k < hgt - 1) { cx += lean; this.set(cx, y, T.PALMWOOD); }   // 이음칸(꼭대기 줄은 빼야 잎갓 밑이 안 꺾인다)
        }
        /* 잎갓 — 줄기 끝에 **가로로 넓게** 얹는다 — 사연: docs/code-history.md#h131 */
        const ty = iy - 1 - hgt;
        for (let dx = -3; dx <= 3; dx++) this.set(cx + dx, ty, T.PALMLEAF);
        for (let dx = -2; dx <= 2; dx++) this.set(cx + dx, ty - 1, T.PALMLEAF);
        this.set(cx, ty - 2, T.PALMLEAF);
        // 열매는 잎갓 **바로 아래**, 줄기 옆에 붙인다 — 떨어뜨리면 허공에 뜬다
        this.set(cx + lean, ty + 1, T.COCONUT);
      }
      /* 황금 상자 — 등급은 심해 유적(5)보다 위인 7. */
      this.objects.push({ type: 'chest', tier: 7, gold: 1, loot: 'session2',
        boss: 'isle_keeper', x: ix * TS, y: (iy - 1) * TS + 6, w: 26, h: 16 });
      this.isle = { x: ix, y: iy, w: iw };
    }

    /* 해변 끝과 안쪽 지형 사이 이음매 — 해변이 수면 위로 고정돼 있으므로, 안쪽 지형이 더 낮으면 그 경계에 계단이 생긴다. */
    {
      const bx = shore + BEACH_W, JOIN = 14;
      const from = this.surface[clamp(bx, 0, WW - 1)];
      for (let k = 1; k <= JOIN; k++) {
        const x = bx + k;
        if (x >= WW - 2) break;
        const to = this.surface[clamp(bx + JOIN, 0, WW - 1)];
        const want = Math.round(lerp(from, to, k / JOIN));
        const cur = this.surface[x];
        for (let y = Math.min(cur, want); y < Math.max(cur, want) + 6; y++) {
          if (y < want) { this.set(x, y, T.AIR); this.walls[this.i(x, y)] = 0; }
          else if (y < want + 5) { this.set(x, y, y === want ? T.SNOW : T.ICE); this.walls[this.i(x, y)] = 5; }
        }
        this.surface[x] = want;
      }
    }

    /* --- 유황 (화약 원료) --- */
    for (let k = 0; k < 260; k++) {
      const inGlacier = rng.chance(0.45);
      const x = inGlacier ? rng.int(shore + BEACH_W + 4, GLACIER_X1 - 4) : rng.int(4, shore - 4);
      if (x < 2 || x >= WW - 2) continue;
      const top = inGlacier ? this.surface[x] + 6 : (this.seaBed[x] || 0) + 2;
      const y = rng.int(top, Math.min(WH - 8, top + (inGlacier ? 120 : 20)));
      if (!this.solid(x, y)) continue;
      const id = this.get(x, y);
      if (id === T.BEDROCK) continue;
      const n = rng.int(2, 5);                          // 작은 덩이로 뭉쳐 난다
      for (let i = 0; i < n; i++) {
        const ax = x + rng.int(-1, 1), ay = y + rng.int(-1, 1);
        if (this.inB(ax, ay) && this.solid(ax, ay) && this.get(ax, ay) !== T.BEDROCK)
          this.set(ax, ay, T.SULFUR);
      }
    }

    /* --- 세션 3 광물 둘 (채굴 등급 5) --- */
    for (const [tile, inGlacierOnly, tries] of [[T.GLACIUM, 1, 120], [T.TIDESTONE, 0, 120]]) {
      for (let k = 0; k < tries; k++) {
        const x = inGlacierOnly ? rng.int(shore + BEACH_W + 4, GLACIER_X1 - 4) : rng.int(4, shore - 4);
        if (x < 2 || x >= WW - 2) continue;
        const top = inGlacierOnly ? this.surface[x] + 40 : (this.seaBed[x] || 0) + 6;
        const lo = Math.min(WH - 8, top), hi = Math.min(WH - 8, top + (inGlacierOnly ? 140 : 26));
        if (hi <= lo) continue;
        const y = rng.int(lo, hi);
        if (!this.solid(x, y) || this.get(x, y) === T.BEDROCK) continue;
        const n = rng.int(2, 4);                          // 유황보다 작은 덩이
        for (let i = 0; i < n; i++) {
          const ax = x + rng.int(-1, 1), ay = y + rng.int(-1, 1);
          if (this.inB(ax, ay) && this.solid(ax, ay) && this.get(ax, ay) !== T.BEDROCK)
            this.set(ax, ay, tile);
        }
      }
    }

    /* --- 해변·해저 장식 --- */
    for (let k = 2; k <= BEACH_W; k++) {
      const x = shore + k, sy = this.surface[clamp(x, 0, WW - 1)];
      if (x >= WW - 2) break;
      if (this.get(x, sy) !== T.SAND || this.get(x, sy - 1) !== T.AIR) continue;
      // 지상의 잡초 정도 밀도로.
      if (rng.chance(0.12)) this.set(x, sy - 1, T.SEASHELL);
    }

    /* 물 위로 삐져나온 바위는 도로 깎는다 — 수면은 한 줄이어야 한다. */
    const isleL = this.isle ? this.isle.x - (this.isle.w >> 1) - 1 : -1;
    const isleR = this.isle ? this.isle.x + (this.isle.w >> 1) + 1 : -2;
    for (let x = 0; x < shore; x++) {
      if (x >= isleL && x <= isleR) continue;
      for (let y = this.seaLevel; y < this.seaLevel + 3; y++)
        if (this.get(x, y) !== T.SEAWATER && this.get(x, y) !== T.AIR) this.set(x, y, T.SEAWATER);
    }
  },

  /** 세계 전체 마무리 검사 — 웅덩이 하나하나를 다듬는 _levelLiquid로는 못 잡는 것이 있다. */
  sealLiquids() {
    const isQ = t => t === T.WATER || t === T.LAVA;
    let queue = [];
    // 바다는 통째로 물이라 이 검사를 태우면 가장자리부터 통째로 말라 버린다 — 건너뛴다
    const sx0 = this.sea ? this.sea.x1 + 2 : 3;
    for (let y = 5; y < WH - 4; y++)
      for (let x = sx0; x < WW - 3; x++)
        if (isQ(this.get(x, y))) queue.push(y * WW + x);
    let guard = 0;
    while (queue.length && guard++ < 60) {
      const next = [];
      for (const k of queue) {
        const x = k % WW, y = (k / WW) | 0;
        if (!isQ(this.get(x, y))) continue;
        let bad = false;
        for (const dx of [-1, 1]) {
          if (this.get(x + dx, y) !== T.AIR) continue;
          const b = this.get(x + dx, y + 1);
          if (b === T.AIR || isQ(b)) { bad = true; break; }
        }
        if (!bad) continue;
        this.set(x, y, T.AIR);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
          if (isQ(this.get(x + dx, y + dy))) next.push((y + dy) * WW + (x + dx));
      }
      if (!next.length) break;
      queue = next;
    }
  },

  /** 액체 덩어리를 "말이 되는 모양"으로 다듬는다. */
  _levelLiquid(cells, liquid) {
    const q = liquid || T.WATER;
    let live = cells.filter(([x, y]) => this.get(x, y) === q);
    for (let pass = 0; pass < 8 && live.length; pass++) {
      let changed = false;

      // (2) 옆으로 쏟아지는 가장자리부터 덜어낸다
      for (let k = 0; k < 6; k++) {
        const leak = [];
        for (const [x, y] of live) {
          if (this.get(x, y) !== q) continue;
          for (const dx of [-1, 1]) {
            if (this.get(x + dx, y) === T.AIR && this.get(x + dx, y + 1) === T.AIR) { leak.push([x, y]); break; }
          }
        }
        if (!leak.length) break;
        for (const [x, y] of leak) this.set(x, y, T.AIR);
        live = live.filter(([x, y]) => this.get(x, y) === q);
        changed = true;
      }

      // (1) 수면을 한 줄로
      const rows = new Map();
      for (const [x, y] of live) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); }
      for (const y of [...rows.keys()].sort((a, b) => a - b)) {
        const below = rows.get(y + 1);
        if (!below) break;
        const here = new Set(rows.get(y));
        if (!below.some(x => !here.has(x) && this.get(x, y) === T.AIR)) break;
        for (const x of rows.get(y)) this.set(x, y, T.AIR);
        rows.delete(y);
        changed = true;
      }
      live = live.filter(([x, y]) => this.get(x, y) === q);
      if (!changed) break;
    }
    return live;
  },

  /** 웅덩이 채우기 — (x, y0)를 바닥으로 삼아 물이 새지 않는 만큼만 위로 쌓는다. */
  _fillBasin(x, y0, maxDepth, maxWidth, commit, liquid) {
    const filled = [];
    const mark = new Set();
    for (let d = 0; d < maxDepth; d++) {
      const row = y0 - d;
      if (row < 5) break;
      if (this.get(x, row) !== T.AIR) break;
      const rowCells = [];
      let leak = false;
      for (const dir of [0, -1, 1]) {
        // dir 0은 시작 칸 하나만, -1/1은 좌우로 벽에 닿을 때까지
        let cx = x + dir;
        if (dir === 0) cx = x;
        for (let step = 0; step < maxWidth; step++) {
          if (cx < 4 || cx >= WW - 4) { leak = true; break; }
          if (this.get(cx, row) !== T.AIR) break;               // 벽 — 여기서 막힌다
          if (this._noWater(cx, row, liquid === T.LAVA)) { leak = true; break; }
          const below = this.get(cx, row + 1);
          if (!TILE_DEF[below].solid && !mark.has(cx + ',' + (row + 1))) { leak = true; break; }
          rowCells.push([cx, row]);
          if (dir === 0) break;
          cx += dir;
        }
        if (leak) break;
      }
      if (leak) break;
      for (const [cx, cy] of rowCells) mark.add(cx + ',' + cy);
      filled.push(...rowCells);
    }
    if (!commit) return filled;
    for (const [cx, cy] of filled) this.set(cx, cy, liquid || T.WATER);
    return this._levelLiquid(filled, liquid || T.WATER);
  },

  /** 이 x열에서 (x, yFrom) 아래로 처음 만나는 "고체 위의 빈칸"을 찾는다 */
  _floorBelow(x, yFrom, limit) {
    for (let y = yFrom; y < Math.min(WH - 6, yFrom + limit); y++) {
      if (this.get(x, y) === T.AIR && TILE_DEF[this.get(x, y + 1)].solid) return y;
    }
    return -1;
  },
  /** 같은 열에서 가장 낮은 바닥 — 큰 동굴은 중간에 선반이 여러 겹이라 첫 바닥이 진짜 바닥이 아니다 */
  _deepFloor(x, yTop, yBot) {
    let found = -1;
    for (let y = yTop; y < Math.min(WH - 6, yBot); y++) {
      if (this.get(x, y) === T.AIR && TILE_DEF[this.get(x, y + 1)].solid) found = y;
    }
    return found;
  },
  /** y 언저리에서 바닥 높이를 찾는다 (평탄한지 재는 데 쓴다) */
  _floorNear(x, y) {
    for (let d = -2; d <= 3; d++) {
      const yy = y + d;
      if (yy < 6 || yy >= WORLD_BOT - 6) continue;
      if (this.get(x, yy) === T.AIR && TILE_DEF[this.get(x, yy + 1)].solid) return yy;
    }
    return -1;
  },

  /** 바닥에 그릇 모양을 파고 물을 채운다. */
  _carveBasin(cx, floorY, halfW, depth, liquid) {
    const cells = [];
    for (let dx = -halfW; dx <= halfW; dx++) {
      const x = cx + dx;
      if (x < 6 || x >= WW - 6) continue;
      const fy = this._floorNear(x, floorY);
      if (fy < 0 || Math.abs(fy - floorY) > 1) continue;      // 여기서부터는 바닥이 아니다
      if (this._noWater(x, fy, liquid === T.LAVA)) continue;
      const t = 1 - (dx / (halfW + 0.5)) ** 2;
      let d = Math.round(depth * Math.sqrt(Math.max(0, t)));
      while (d > 0) {                                        // 밑이 비어 있으면 얕게
        let ok = true;
        for (let k = 1; k <= d + 1; k++) if (!this.solid(x, fy + k)) { ok = false; break; }
        if (ok) break;
        d--;
      }
      for (let k = 1; k <= d; k++) this.set(x, fy + k, T.AIR);
      for (let k = 0; k <= d; k++) cells.push([x, fy + k]);
    }
    for (const [x, y] of cells) this.set(x, y, liquid || T.WATER);
    return this._levelLiquid(cells, liquid || T.WATER);
  },
};
mixin(World.prototype, WorldSea, true);
