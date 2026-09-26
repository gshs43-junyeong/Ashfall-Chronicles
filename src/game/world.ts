// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== world.js — 세계 생성 / 충돌 / 조명 ===== */
import { factory as Factory } from './ctx.js';
import { clamp, dist, inv, lerp } from '../engine/core/math.js';
import { makeNoise1D, makeNoise2D } from '../engine/core/noise.js';
import { RNG } from '../engine/core/rng.js';
import { rleDecode, rleEncode } from '../engine/save/rle.js';
import { sweepLight } from '../engine/tilemap/light.js';
import { TileMap } from '../engine/tilemap/tilemap.js';
import { BIOMES, CAMP_GX1, CAMP_X0, CAMP_X1, DEEP_Y, HELL_Y, SEA_X1, SHIFT, SKY_Y, SURF_BASE, SX, SY, SYB, WH,
  WORLD_BOT, WSIZE, WSX, WSY, WW, applyWorldSize } from './size.js';
import { T, TILE_DEF } from './data.js';
import { OBJ_SIZE } from './data/items.js';
import { FLUID_FLOW, FLUID_KIND, FLUID_OPEN, FLUID_SRC, FLUID_TILE } from './data/materials.js';
import { RUIN_SPEC } from './data/ruins.js';
import { CHAPTERS } from './data/story.js';

export const TS = 22;              // 타일 픽셀 크기
export const CAVE_GW = 60, CAVE_GH = 55; // 동굴 갈래 구역 한 칸의 크기(buildCaveZones)
/* 이보다 작고 고립된(지상과 안 통하는) 공동은 동굴로 치지 않고 메운다(타일 수). */
export const MIN_CAVE = 220;

/* 해변 폭. */
export const BEACH_W = 90;          // 물가에서 안쪽으로 이만큼이 모래 해변이다
/* 바다 + 해변 — 나무·풀·꽃 같은 지상 초목을 놓지 않는다 — 사연: docs/code-history.md#h102 */
export const inSeaZone = x => x < SEA_X1 + BEACH_W + 4;
export const BIOME_BAND = 104;     // 바이옴 경계 블렌딩 폭(타일)

/** 세계 크기를 정한다 — 새 게임 직전·불러오기 직전에 부른다(치수는 size.js). */
export function setWorldSize(key) {
  applyWorldSize(key);
  for (const r of RUIN_SPEC) {
    if (r.bx === undefined) { r.bx = r.x; r.by = r.y; }
    r.x = SX(r.bx); r.y = r.id === 'abyss' ? SYB(r.by) : SY(r.by);
  }
  /* 깊이 목표(장의 basics · obj · goal 어디에 있든) — 목표 깊이를 옮기고, 적힌 '지하 ○○m' 도 같은 배수로 고쳐 적는다. */
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o.type === 'depth' && typeof o.y === 'number') {
      if (o.by === undefined) { o.by = o.y; o.btask = o.task; }
      o.y = SY(o.by);
      if (o.btask) o.task = o.btask.replace(/([0-9]+)m/, (_, n) => Math.round(+n * WSY) + 'm');
      return;
    }
    for (const k in o) if (k !== 'rw') walk(o[k]);
  };
  walk(CHAPTERS);
}

/* 바이옴이 아닌 구역의 이름표 — 원경 그림이 바뀌는 자리와 짝이다(G.bgId). */
export const ZONE_CARD = {
  camp: { n: '베이스캠프', sub: '잿빛 숲 한복판',
          card: { line: '살아남은 이들이 처음 불을 피운 자리. 여기서부터 다시 센다.' } },
  village: { n: '여명 마을', sub: '재를 이고 사는 곳',
             card: { line: '재가 내린 뒤에도 굴뚝이 서 있다. 사람이 남긴 마지막 거리.' } }
};

/* 재질 번호 → 지층 구성 — 사연: docs/code-history.md#h103 */
export const MAT_LAYER = [
  { top: T.SNOW, soil: T.SNOW, sub: T.ICE, deep: T.STONE, wall: 5, subWall: 2 },
  { top: T.GRASS, soil: T.DIRT, sub: T.DIRT, deep: T.STONE, wall: 1, subWall: 2 },
  { top: T.SAND, soil: T.SAND, sub: T.SANDSTONE, deep: T.STONE, wall: 8, subWall: 2 },
  { top: T.CORRUPTGRASS, soil: T.CORRUPTGRASS, sub: T.EBONSTONE, deep: T.EBONSTONE, wall: 3, subWall: 3 },
  { top: T.JUNGLEGRASS, soil: T.MUD, sub: T.MUD, deep: T.STONE, wall: 11, subWall: 11 },
  { top: T.GLOWMOSS, soil: T.DIRT, sub: T.SPORESTONE, deep: T.STONE, wall: 12, subWall: 12 },
  // 6 빙하 — 흙 한 겹 없이 얼음이 그대로 두껍게 쌓여 있다
  { top: T.SNOW, soil: T.ICE, sub: T.ICE, deep: T.ICE, wall: 5, subWall: 5 },
  // 7 바다 — 지면은 해저 모래다
  { top: T.SAND, soil: T.SAND, sub: T.SANDSTONE, deep: T.STONE, wall: 8, subWall: 2 }
];
export const MAT_OF = { ice: 0, forest: 1, forest2: 1, desert: 2, corrupt: 3, jungle: 4, glowfen: 5,
                 glacier: 6, sea: 7 };

/* ================= 여명 마을 배치표 ================= */
export const DAWN_BUILDINGS = [
  // off: 시작 칸, w/h: 폭·높이, npc/fac: 그 안에 사는 사람과 시설.
  { off:  2, w: 18, h: 10, npc: 'haran',   fac: 'inn'       },   // 여관
  { off: 24, w: 17, h: 13, npc: 'tamer',   fac: 'workbench' },   // 조련사
  { off: 70, w: 17, h: 13, npc: 'seira',   fac: 'reforge'   },   // 재련
  { off: 93, w: 18, h: 10, npc: 'trainer', fac: 'vault'     }    // 훈련소 · 보관고
];
/* 건물 안 배치 — 건물 시작점 기준. */
/* 시설(fac)은 9~10칸, 강화 모루는 11~12칸, 탁자는 14~15칸. */
export const DAWN_INSIDE = { shelf: 2, npc: 6, fac: 9, anvil: 11, table: 14 };

/* 광장 — 건물1과 건물2 사이. */
// 작업대는 조련사네 집 안(DAWN_BUILDINGS[1].fac)으로 옮겨서 여기 목록엔 없다.
export const DAWN_PLAZA = [
  { id: 'kade',      off: -10, w: 1 },
  { id: 'board',     off:  -7, w: 2 },
  { id: 'fountain',  off:  -2, w: 5 },
  { id: 'townhall',  off:   4, w: 2 },
  { id: 'waystone',  off:   8, w: 2 },
  { id: 'forge',     off:  12, w: 2 }
];
/* 광장 물건의 실제 그림 크기(px). */
export const DAWN_OBJ = {
  // 베이스캠프·여명 마을·플레이어가 직접 놓는 것 전부 같은 크기(OBJ_SIZE)를 쓴다
  workbench: { type: 'workbench', w: OBJ_SIZE.workbench.w, h: OBJ_SIZE.workbench.h, lv: 1 },
  kade:      { type: 'npc', npc: 'kade', w: 22, h: 44 },
  board:     { type: 'board', w: 34, h: 44 },
  fountain:  { type: 'fountain', w: 110, h: 66 },
  townhall:  { type: 'townhall', w: 36, h: 46 },
  waystone:  { type: 'waystone', w: 30, h: 48 },
  forge:     { type: 'forge', w: OBJ_SIZE.forge.w, h: OBJ_SIZE.forge.h, lv: 1 },
  // 건물 안에 놓이는 것들 (DAWN_BUILDINGS의 npc/fac가 가리킨다) 침대는 2칸 슬롯(44px)을 꽉 채운다 — 그리는 쪽(game.js drawFacility)도 발판을
  // o.h 바닥에 붙인다
  inn:       { type: 'inn', w: 44, h: 34 },
  reforge:   { type: 'reforge', w: 44, h: 40 },
  anvil:     { type: 'anvil', w: 44, h: 44 },      // 강화 모루 — 2×2칸. 4단계에서 재련대 옆에 선다

  vault:     { type: 'vault', w: 40, h: 36 },
  // 가구는 다른 물건 옆에서 왜소해 보이지 않게 — 책장은 작업대·용광로와 같은 2칸(44px) (DAWN_INSIDE.shelf 슬롯도 2칸), 탁자는 슬롯을 2칸으로 늘려서 키운다.
  shelf:     { type: 'furniture', kind: 'shelf', w: 36, h: 42, tw: 2, th: 2 },
  table:     { type: 'furniture', kind: 'table', w: 28, h: 20 },
  npcBase:   { type: 'npc', w: 22, h: 44 }   // 건물 주민 — npc 이름만 갈아 끼워 쓴다
};
/* 3단계 성벽 — 마을 양 끝 바깥. */
export const DAWN_WALL = { leftOff: -16, rightOff: 15, gateH: 3, towerH: 14,
  /* 성벽에서 이만큼 더 바깥까지 지면을 평평하게 깎는다. */
  flatPad: 10 };

/** 유적 통행 검사(_standSet)가 쓰는 칸 집합 — Set 과 같은 쓰임(has · add · size · 순회)을 상자 크기의 Uint8Array 로 한다 — 사연:
   docs/code-history.md#h104 */
export class BoxSet {
  constructor(box, pad) {
    this.x0 = box[0] - pad; this.y0 = box[1] - pad;
    this.bw = box[2] - box[0] + 1 + pad * 2; this.bh = box[3] - box[1] + 1 + pad * 2;
    this.m = new Uint8Array(this.bw * this.bh); this.list = []; this.out = null;
  }
  _i(k) {
    const y = (k / WW) | 0, x = k - y * WW, lx = x - this.x0, ly = y - this.y0;
    return lx >= 0 && ly >= 0 && lx < this.bw && ly < this.bh ? ly * this.bw + lx : -1;
  }
  has(k) { const i = this._i(k); return i >= 0 ? this.m[i] === 1 : !!(this.out && this.out.has(k)); }
  add(k) {
    const i = this._i(k);
    if (i >= 0) { if (this.m[i]) return this; this.m[i] = 1; }
    else { this.out = this.out || new Set(); if (this.out.has(k)) return this; this.out.add(k); }
    this.list.push(k); return this;
  }
  get size() { return this.list.length; }
  values() { return this.list.values(); }
  [Symbol.iterator]() { return this.list[Symbol.iterator](); }
}

/** 닫힌 문 = 옆에서 본 문짝 — 경첩 쪽 가장자리의 얇은 판만 막는다(열린 문은 칸을 채운 앞면이고 안 막는다).
    game.js drawDoor 가 같은 폭으로 그린다. */
export function doorEdge(d) {
  const w = Math.max(6, Math.round(d.w * 0.32));
  return { x: d.dir === -1 ? d.x : d.x + d.w - w, y: d.y, w, h: d.h };
}

/** Ashfall 세계 — 타일맵(engine/tilemap) 위에 생성기 · 마을 · 유적 · 바다 · 유체 · 조명 규칙을 얹는다(엔진화 계획 §8-4 상속). */
export class World extends TileMap {
  constructor(seed) {
    super(WW, WH, TS, TILE_DEF, T.BEDROCK);   // 타일 · 벽지 · 탐험 배열, 경계 밖 = 기반암
    this.seed = seed;
    this.rng = new RNG(seed);
    this.surface = new Int16Array(WW);
    this.objects = [];          // 작업대/용광로/상자/NPC/제단
    this.doors = [];            // objects의 부분집합(같은 참조) — 충돌 판정을 빠르게 하려고 따로 캐싱
    /* 공장 기계. */
    this.machines = new Map();
    this.oreHits = {};          // 칸 → 드릴이 더 캘 수 있는 횟수(처음 캘 때 매긴다)
    this.netDirty = true;       // 전력망을 다시 계산해야 하는가 (기계 설치/철거 시 켜진다)
    this.nets = [];
    /* 심어 둔 작물의 타일 인덱스. */
    this.crops = new Set();
    /* 부서진 바닥이 되돌아올 시각. */
    this.crumbled = new Map();
    this.spawnX = 180; this.spawnY = 0;
    this.lightBuf = null; this.lbx = 0; this.lby = 0; this.lbw = 0; this.lbh = 0;
  }

  set(x, y, t) {
    if (!this.inB(x, y)) return;
    this.tiles[y * WW + x] = t;
    /* 유체가 켜진 뒤(생성·불러오기 끝)에만 — 바뀐 칸과 그 네 이웃을 흐름 검사 줄에 세운다. */
    if (this.fq) this.fluidWake(x, y);
  }
  hurtTile(x, y) { return TILE_DEF[this.get(x, y)].hurt || 0; }
  /** 사각형이 물에 얼마나 잠겼는지 0~1. */
  liquidIn(px, py, w, h) {
    const x0 = Math.floor(px / TS), x1 = Math.floor((px + w - 0.01) / TS);
    const y0 = Math.floor(py / TS), y1 = Math.floor((py + h - 0.01) / TS);
    let n = 0, tot = 0, flow = 0, cur = 0;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      tot++;
      const t = this.get(x, y), d = TILE_DEF[t];
      if (!d.liquid) continue;
      if (d.flow) flow = 1;
      /* 흐르는 물은 수위만큼만 잠긴 것으로 친다 — 발목 깊이 물에서 헤엄치게 되면 안 된다. */
      if (FLUID_FLOW[t] && this.flv) {
        const k = y * WW + x, lv = this.flv[k] || 8;
        const topped = FLUID_KIND[this.tiles[k - WW]] === FLUID_KIND[t];
        n += topped ? 1 : lv / 8;
        // 떨어지는 물(수위 8)은 폭포가 아니다 — 아래로 미는 것은 폭포(FALLS, d.flow)만 한다
        if (lv < 8 && !cur) cur = this.currentAt(x, y);        // 겹친 칸 중 처음 흐르는 칸 하나로 — 더하면 칸 수만큼 세진다
      } else n++;
    }
    return { f: tot ? n / tot : 0, flow, cur };
  }
  /** 흐르는 칸의 물살 방향과 세기(-1~1) — 수위가 높은 쪽에서 낮은 쪽으로. */
  currentAt(x, y) {
    const k = y * WW + x, t = this.tiles[k], kind = FLUID_KIND[t];
    if (!FLUID_FLOW[t] || !this.flv) return 0;
    const me = this.flv[k] || 8;
    const side = n => {
      const nt = this.tiles[n];
      if (FLUID_KIND[nt] === kind) return this._flvAt(n);
      return FLUID_OPEN(nt) ? 0 : me;
    };
    // 비탈 한 칸의 수위 차는 보통 2(양옆이 +1·-1)라 2로 나눈다 — 8로 나누면 물살이 4분의 1로 약해졌다
    return clamp((side(k - 1) - side(k + 1)) / 2, -1, 1);
  }
  /** (tx, ty) 칸이 물이면 그 물기둥의 **맨 윗칸**을 찾는다(최대 lim 칸 위까지). */
  surfaceRow(tx, ty, lim) {
    if (!TILE_DEF[this.get(tx, ty)].liquid) return -1;
    for (let y = ty; y > ty - lim && y > 1; y--)
      if (!TILE_DEF[this.get(tx, y - 1)].liquid) return this.get(tx, y - 1) === T.AIR ? y : -1;
    return -1;
  }
  /** 사각형이 겹치거나 맞닿은 타일 중 가장 큰 hurt값을 돌려준다. */
  hurtInRect(px, py, w, h) {
    const pad = 1;
    const x0 = Math.floor((px - pad) / TS), x1 = Math.floor((px + w - 0.01 + pad) / TS);
    const y0 = Math.floor((py - pad) / TS), y1 = Math.floor((py + h - 0.01 + pad) / TS);
    let m = 0;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const hv = TILE_DEF[this.get(x, y)].hurt || 0;
      if (hv > m) m = hv;
    }
    return m;
  }

  biomeAt(tx) {
    for (const b of BIOMES) if (tx >= b.x0 && tx < b.x1) return b;
    return BIOMES[1];
  }
  biomeIndexAt(tx) {
    for (let i = 0; i < BIOMES.length; i++) if (tx >= BIOMES[i].x0 && tx < BIOMES[i].x1) return i;
    return tx < 0 ? 0 : BIOMES.length - 1;
  }
  /** 경계 혼합: [주 바이옴, 이웃 바이옴, 이웃 비중 0~0.5] */
  biomeMix(tx) {
    const i = this.biomeIndexAt(tx), b = BIOMES[i];
    if (i > 0 && tx - b.x0 < BIOME_BAND) return [i, i - 1, 0.5 * (1 - (tx - b.x0) / BIOME_BAND)];
    if (i < BIOMES.length - 1 && b.x1 - tx <= BIOME_BAND) return [i, i + 1, 0.5 * (1 - (b.x1 - tx) / BIOME_BAND)];
    return [i, i, 0];
  }
  /** 바이옴별 지표 높이 (경계에서 부드럽게 이어지도록 x 전 구간에서 정의) */
  _hFor(bid, x, n1) {
    let h = SURF_BASE + (n1(x, 0.011) - 0.5) * 32 + (n1(x + 900, 0.042) - 0.5) * 10;
    if (bid === 'desert') h += 8 + (n1(x + 400, 0.025) - 0.5) * 12;
    else if (bid === 'ice') h -= 8 + (n1(x + 1500, 0.06) - 0.5) * 6;
    /* 빙하는 서리 지대보다 더 높이 솟고 능선이 거칠다. */
    else if (bid === 'glacier') h -= 16 + (n1(x + 2600, 0.09) - 0.5) * 22;
    else if (bid === 'sea') h -= 2 + (n1(x + 5300, 0.05) - 0.5) * 6;
    else if (bid === 'corrupt') h += 2 + (n1(x + 2200, 0.075) - 0.5) * 24;
    // 정글은 골짜기가 깊게 파이고, 버섯 골짜기는 이름대로 통째로 내려앉아 있다
    else if (bid === 'jungle') h += 6 + (n1(x + 3300, 0.05) - 0.5) * 18;
    else if (bid === 'glowfen') h += 16 + (n1(x + 4100, 0.03) - 0.5) * 10;
    return h;
  }
  /** 이 x에서 어떤 바이옴의 '재질'을 쓸지 — 경계에서는 노이즈로 맞물리게 */
  _matAt(x, n1) {
    const [ia, ib, t] = this.biomeMix(x);
    if (t <= 0.001 || ia === ib) return BIOMES[ia].id;
    return n1(x + 7777, 0.11) < t ? BIOMES[ib].id : BIOMES[ia].id;
  }
  /** 전투/스폰용 구역 태그 */
  zoneAt(tx, ty) {
    // 특별 유적 둘은 각각 하늘·지옥 판정보다 먼저 본다 — 안에 들어와 있으면 그 구역이 우선이다
    if (this.inCitadel && this.inCitadel(tx, ty)) return 'citadel';
    if (this.inDeepShaft && this.inDeepShaft(tx, ty)) return 'deepshaft';
    if (ty < SKY_Y) return 'sky';
    // 베이스캠프·여명 마을 — 안전 지대.
    if (tx >= CAMP_X0 - 16 && tx <= CAMP_X1 + 16 && ty < this.surface[clamp(tx, 0, WW - 1)] + 20) return 'camp';
    if (this.dawnCity) {
      const d = this.dawnCity;
      if (tx >= d.x0 - 16 && tx <= d.x1 + 16 && ty < d.gy + 20) return 'village';
    }
    if (this.inAtelier && this.inAtelier(tx, ty)) return 'atelier';
    if (this.inRunaway && this.inRunaway(tx, ty)) return 'runaway';
    if (this.inWorks && this.inWorks(tx, ty)) return 'works';
    if (this.inRuin && this.inRuin(tx, ty)) return 'ruin';
    if (ty >= HELL_Y) return 'hell';
    const b = this.biomeAt(tx).id;
    if (ty > this.surface[clamp(tx, 0, WW - 1)] + 6) {
      if (ty > DEEP_Y) return 'deep';
      if (b === 'corrupt') return 'corrupt';
      // 빙하 지대도 얼음 구역으로 친다 — 몹 표는 zoneTable이 바이옴으로 한 번 더 가른다
      if (b === 'ice' || b === 'glacier') return 'ice';
      if (b === 'jungle') return 'jungle';       // 정글은 지하도 정글이다 (뿌리와 진흙층)
      if (b === 'glowfen') return 'glowfen';
      return 'cave';
    }
    if (b === 'corrupt') return 'corrupt';
    // 해변 — 물가 안쪽 모래밭.
    if (this.beach && tx >= this.beach.x0 && tx <= this.beach.x1) return 'beach';
    if (b === 'ice' || b === 'glacier') return 'ice';
    if (b === 'jungle') return 'jungle';
    if (b === 'glowfen') return 'glowfen';
    if (b === 'sea') return 'sea';              // 바다 — 지상 몹 표를 안 태운다
    return 'surface';
  }
  /** 상자 보상은 지형 이름이 아니라 실제 위치 프로필로 고른다. */
  chestLootProfile(tx, ty) {
    const zone = this.zoneAt(tx, ty);
    if (zone === 'works' || zone === 'runaway' || zone === 'atelier'
      || zone === 'citadel' || zone === 'deepshaft') return 'session2';
    return zone === 'ruin' ? 'ruin' : 'world';
  }

  /* ================= 생성 ================= */
  generate() {
    const rng = this.rng;
    const n1 = makeNoise1D(new RNG(rng.next() * 1e9), 4);
    const n2 = makeNoise2D(new RNG(rng.next() * 1e9));
    const n3 = makeNoise2D(new RNG(rng.next() * 1e9));

    // --- 1. 지표선 (바이옴 경계에서 높이를 선형 혼합해 단차 제거) ---
    const rawH = new Float32Array(WW);
    for (let x = 0; x < WW; x++) {
      const [ia, ib, t] = this.biomeMix(x);
      const ha = this._hFor(BIOMES[ia].id, x, n1);
      const h = (t > 0.001 && ia !== ib) ? lerp(ha, this._hFor(BIOMES[ib].id, x, n1), t) : ha;
      // 하한을 하늘 구역(SKY_Y) 위로 넉넉히 띄워, 이중 점프로도 지상에서 하늘 구역에 닿지 않게 한다 기준 지표에서 -12 ~ +38 (소형 58~108).
      rawH[x] = clamp(h, SURF_BASE - 12, SURF_BASE + 38);
    }
    // 3칸 이동평균으로 남은 계단 제거
    for (let x = 0; x < WW; x++) {
      const a = rawH[Math.max(0, x - 1)], b2 = rawH[x], c2 = rawH[Math.min(WW - 1, x + 1)];
      this.surface[x] = Math.round((a + b2 * 2 + c2) / 4);
    }
    // 마을 부지 평탄화
    const vx0 = CAMP_X0, vx1 = CAMP_GX1;   // 베이스캠프 — 잿빛 숲 (생성 발자국)
    let vh = this.surface[(vx0 + vx1) >> 1];
    for (let x = vx0 - 12; x < vx1 + 12; x++) {
      const t = clamp(inv(vx0 - 12, vx0, x), 0, 1) * clamp(inv(vx1 + 12, vx1, x), 0, 1);
      this.surface[x] = Math.round(lerp(this.surface[x], vh, Math.min(1, t * 1.6)));
    }
    this.villageY = vh;

    // 여명 마을 부지 (동쪽 숲) — 잿빛에 묻힌 폐허로 미리 세워 두고, 종장 이후 되살린다
    const dx0 = SX(2905 + SHIFT) - 55, dx1 = dx0 + 110;    // 여명 마을 — 동쪽 숲 (폭 110은 그대로, 가운데만 옮긴다)
    const dh = this.surface[(dx0 + dx1) >> 1];
    /* ★ 평탄화는 **3단계 성벽 자리 바깥까지** 완전히 평평해야 한다. */
    const padL = -DAWN_WALL.leftOff + DAWN_WALL.flatPad;
    const padR = DAWN_WALL.rightOff + DAWN_WALL.flatPad;
    const ramp = 8;                        // 마을 바깥으로 자연 지형에 녹아드는 구간
    for (let x = dx0 - padL; x < dx1 + padR; x++) {
      const t = clamp(inv(dx0 - padL, dx0 - padL + ramp, x), 0, 1) *
                clamp(inv(dx1 + padR, dx1 + padR - ramp, x), 0, 1);
      this.surface[x] = Math.round(lerp(this.surface[x], dh, Math.min(1, t * 1.6)));
    }
    this.dawnY = dh;

    // --- 2. 기본 지층 (재질도 경계에서 맞물리게) ---
    this.matId = new Uint8Array(WW);
    for (let x = 0; x < WW; x++) this.matId[x] = MAT_OF[this._matAt(x, n1)];
    for (let x = 0; x < WW; x++) {
      const s = this.surface[x], m = this.matId[x];
      // 표층 두께도 조금씩 흔들어 층이 일직선으로 보이지 않게
      const soilD = 4 + Math.round(n1(x + 3100, 0.09) * 3);
      const subD = 15 + Math.round(n1(x + 5200, 0.07) * 8);
      const L = MAT_LAYER[m];
      for (let y = s; y < WORLD_BOT; y++) {
        let t;
        const depth = y - s;
        if (y >= WORLD_BOT - 4) t = T.BEDROCK;
        else if (y >= HELL_Y) t = T.ASH;
        else if (depth === 0) t = L.top;
        else if (depth < soilD) t = L.soil;
        else if (depth < subD) t = L.sub;
        else t = L.deep;
        if (y > DEEP_Y && t === T.STONE && n3(x, y, 0.06, 2) > 0.72) t = T.OBSIDIAN;
        this.tiles[this.i(x, y)] = t;
        this.walls[this.i(x, y)] = y >= HELL_Y ? 7 : depth < subD - 3 ? L.wall : L.subWall;
      }
    }

    // --- 3. 동굴 ---
    /* ★ 동굴은 눈에 띄게 크다 — 노이즈 결이 굵고(0.058, 깊은 곳 0.045) 띠가 넓어서(0.60~0.83) 굴 하나하나가 길고 넓다. */
    for (let x = 1; x < WW - 1; x++) {
      const s = this.surface[x];
      for (let y = s + 4; y < WORLD_BOT - 5; y++) {
        const scale = y > DEEP_Y - 36 ? 0.045 : 0.058;
        let v = n2(x, y, scale, 3);
        // 깊을수록 큰 공동.
        const bias = y > DEEP_Y ? 0.06 : y > SY(180) ? 0.03 : 0;
        const wide = y > s + 20 ? 0.03 : 0;
        if (v > 0.63 - bias - wide && v < 0.80 + bias + wide) this.tiles[this.i(x, y)] = T.AIR;
        // 좁은 통로
        if (n3(x, y, 0.13, 2) > 0.80 && y > s + 10) this.tiles[this.i(x, y)] = T.AIR;
      }
    }

    // --- 3-B. 자잘한 구멍 메우기 ---
    this.pruneSmallCaves(MIN_CAVE);

    // --- 4. 부패 지대 균열 ---
    for (const b of BIOMES) {
      if (b.id !== 'corrupt') continue;
      for (let k = 0; k < Math.round(24 * WSX); k++) {
        let cx = rng.int(b.x0 + 8, b.x1 - 8), cy = this.surface[cx];
        let w = rng.range(3, 6);
        while (cy < DEEP_Y && w > 0.8) {
          for (let x = Math.floor(cx - w); x <= cx + w; x++)
            for (let y = cy; y < cy + 3; y++) this.set(x, y, T.AIR);
          for (let x = Math.floor(cx - w) - 2; x <= cx + w + 2; x++)
            for (let y = cy; y < cy + 3; y++) if (this.get(x, y) !== T.AIR) this.set(x, y, T.EBONSTONE);
          cx += rng.range(-1.2, 1.2); cy += 2; w -= rng.range(0.02, 0.14);
        }
      }
    }

    // --- 5. 광맥 ---
    const oreSpec = [
      [T.COPPER, SY(74), SY(200), 700, 5],
      [T.IRON, SY(100), SY(300), 730, 5],
      [T.GOLD, SY(150), SY(360), 480, 4],
      [T.MYTHRIL, SY(240), SY(400), 360, 4],
      [T.CRYSTAL, SY(190), SY(390), 280, 3],
      [T.SOULSTONE, SY(300), SY(420), 200, 3],
      [T.HELLSTONE, HELL_Y, WORLD_BOT - 6, 600, 5],
      /* --- 동력 자원 --- */
      [T.COAL, SY(80), HELL_Y - 10, 1500, 6],
      [T.LEAD, SY(110), SY(330), 560, 5],
      [T.OILSHALE, SY(150), SY(300), 620, 6, SX(2000 + SHIFT), SX(2680 + SHIFT)]   // 사막 구간 — 세계가 왼쪽으로 밀린 만큼 같이 민다
    ];
    /* 표의 개수는 폭 2800 기준이라, 세계가 넓어진 만큼 그대로 곱해 밀도를 유지한다. */
    const oreScale = WW / 2800;
    for (const [tile, y0, y1, count, size, ox0, ox1] of oreSpec) {
      const n = Math.round(count * (ox0 === undefined ? oreScale : WSX) * WSY);
      for (let k = 0; k < n; k++) {
        const cx = rng.int(ox0 === undefined ? 2 : ox0, ox1 === undefined ? WW - 3 : ox1 - 1);
        const cy = rng.int(y0, y1);
        const r = rng.range(1.4, size * 0.5 + 1.4);
        for (let x = Math.floor(cx - r); x <= cx + r; x++)
          for (let y = Math.floor(cy - r); y <= cy + r; y++) {
            if (dist(x, y, cx, cy) > r) continue;
            const cur = this.get(x, y);
            if (cur === T.STONE || cur === T.EBONSTONE || cur === T.ICE || cur === T.SANDSTONE || cur === T.ASH || cur === T.OBSIDIAN)
              this.set(x, y, tile);
          }
      }
    }

    /* --- 5-B. 지층 돌 둘 — 돌(STONE)만 갈아 끼운다. */
    for (const [tile, y0, y1, count, r0, r1] of [[T.LIMESTONE, 0, SY(230), 520, 4, 9], [T.GRANITE, SY(200), HELL_Y - 8, 420, 4, 10]]) {
      const n = Math.round(count * oreScale * WSY);
      for (let k = 0; k < n; k++) {
        const cx = rng.int(4, WW - 5);
        const cy = rng.int(Math.max(y0, this.surface[cx] + 15), y1);
        if (cy >= y1) continue;
        const rx = rng.range(r0, r1), ry = rx * rng.range(0.45, 0.8);   // 가로로 눕힌 덩어리 — 지층처럼
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
          for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
            const dx = (x - cx) / rx, dy = (y - cy) / ry;
            if (dx * dx + dy * dy <= 1 && this.get(x, y) === T.STONE) this.set(x, y, tile);
          }
      }
    }

    /* --- 6. 지옥 용암은 여기서 만들지 않는다 --- */

    // --- 7. 나무 / 덩굴 ---
    /* 나무끼리는 수관 사이에 빈 칸을 둘 이상 둔다(occR = 앞 나무가 차지한 가장 오른쪽 칸).
       정글은 수관이 겹쳐 어두운 게 제맛이라 기둥 사이만 두 칸 띄운다. */
    let occR = -99;
    for (let x = 4; x < WW - 4; x++) {
      const s = this.surface[x];
      if (inSeaZone(x)) continue;                 // 바다에는 나무가 안 선다
      if (x > vx0 - 6 && x < vx1 + 6) continue;
      if (x > dx0 - 10 && x < dx1 + 10) continue;
      const g = this.get(x, s);
      if (g === T.GRASS && rng.chance(0.14)) { const r = this.tree(x, s, rng, T.WOOD, T.LEAF, occR); if (r !== null) occR = r; }
      else if (g === T.CORRUPTGRASS && rng.chance(0.11)) { const r = this.tree(x, s, rng, T.WOOD, T.CORRUPTLEAF, occR); if (r !== null) occR = r; }
      else if (g === T.SNOW && rng.chance(0.08)) { if (x - 5 >= occR + 3) { this.pineTree(x, s, rng); occR = x + 6; } }
      // 정글은 나무가 빽빽하고 키가 크다 — 수관이 겹쳐 아래가 늘 어둡다
      else if (g === T.JUNGLEGRASS && rng.chance(0.34)) { if (x >= occR + 3) { this.jungleTree(x, s, rng); occR = x + 1; } }
      // 버섯 골짜기는 나무 대신 큰 발광 버섯이 자란다
      else if (g === T.GLOWMOSS && rng.chance(0.2)) this.glowStalk(x, s, rng);
      // 채집물을 흩뿌린다 (나무가 없는 자리에만) — 캐면 제작 재료가 되는 아이템이라 예전 순수 장식 때보다 밀도를 눈에 띄게 올렸다
      else if (g === T.GRASS && this.get(x, s - 1) === T.AIR) {
        if (rng.chance(0.10)) this.set(x, s - 1, T.FLOWER);
        else if (rng.chance(0.18)) this.set(x, s - 1, T.WEED);
      } else if (g === T.SAND && this.get(x, s - 1) === T.AIR) {
        // 사막은 선인장이 주가 되어야 한다 — 잡초는 아주 드물게만.
        if (rng.chance(0.035)) this.cactusPlant(x, s, rng);
        else if (rng.chance(0.16)) this.set(x, s - 1, T.CACTUS);
        else if (rng.chance(0.04)) this.set(x, s - 1, T.WEED);
      } else if ((g === T.CORRUPTGRASS || g === T.SNOW) && this.get(x, s - 1) === T.AIR && rng.chance(0.10)) {
        this.set(x, s - 1, T.MUSHROOM);
      } else if (g === T.JUNGLEGRASS && this.get(x, s - 1) === T.AIR) {
        if (rng.chance(0.10)) this.set(x, s - 1, T.ORCHID);
        else if (rng.chance(0.42)) this.set(x, s - 1, T.FERN);   // 바닥이 고사리로 덮여 있다
      } else if (g === T.GLOWMOSS && this.get(x, s - 1) === T.AIR && rng.chance(0.3)) {
        this.set(x, s - 1, T.GLOWCAP);
      }
    }
    // 동굴 천장 덩굴
    for (let x = 2; x < WW - 2; x++) {
      for (let y = this.surface[x] + 8; y < DEEP_Y; y++) {
        if (this.get(x, y) !== T.AIR || !this.solid(x, y - 1)) continue;
        if (!rng.chance(0.012)) continue;
        for (let k = 0; k < rng.int(2, 6) && this.get(x, y + k) === T.AIR; k++) this.set(x, y + k, T.VINE);
        break;
      }
    }

    // --- 8. 구조물 ---
    this.buildVillage(vx0, vx1, vh, rng);
    this.buildDawnCity(dx0, dx1, dh, rng);
    this.buildSea(rng, n1);        // 세션 3 심해 — 구조물보다 먼저(그 자리를 피해 놓게)
    this.buildWorks(dx0, dx1, rng);
    this.buildRunaway(dx0, dx1, rng);
    this.buildAtelier(rng);
    this.buildDungeon(rng, n2);
    this.buildSkyIslands(rng, n1);
    this.buildRuins(rng);
    this.buildCitadel(rng);
    this.buildDeepShaft(rng);
    this.buildCaverns(rng);
    this.buildRuinCaches(rng);   // 동굴이 생긴 뒤라야 동굴 상자를 놓을 수 있다
    this.floodCaves(rng);
    this.floodHell(rng);
    this.buildJungleFalls(rng);
    this.buildCaveZones(rng);      // 동굴 갈래 · 장식 · 금 간 자갈 — 물이 고인 뒤라야 바닥을 안다
    this.scatterChests(rng);
    this.buildAltars(rng);
    /* 마지막으로 유적을 **걸어서** 오갈 수 있는지 확인하고 고친다. */
    this.restoreSealRoom();      // 동굴이 헐고 간 봉인실 바닥·문 앞 복도를 되돌린다
    for (const j of this._walkJobs || []) this._ensureWalkable(j[0], j[1], j[2], j[3], j[4], j[5], j[6], rng);
    this.ensureEntranceTraps(rng);   // 함정 없이 그냥 걸어 들어가는 문을 남기지 않는다
    this.breakLongRuns(rng);         // 함정 하나 없이 쭉 걸어가는 직선 구간을 끊는다
    this.sealCipherVaults();         // 암호 골방의 껍질을 한 번 더 세운다
    this.sweepFloatingDecor();       // 뒷공사가 받침을 헐고 간 장식을 걷어낸다
    /* 액체 마무리는 **지형을 건드리는 마지막 단계 뒤**에 와야 한다. */
    this.sweepPockets(60);           // 뒷공사가 남긴 한두 칸짜리 구멍을 메운다 — 물을 고치기 전에
    this.sealLiquids();
    this.decorateWater(rng);     // 물 위 초목 정리 + 수련 — 수면 높이가 확정된 뒤라야 한다
    this.decoratePonds(rng);     // 동굴 웅덩이 — 수련·물풀·부들·조약돌, 둘레 이끼
    this.fillMossCorners();      // 바닥 이끼와 벽 이끼가 만나는 오목한 모서리 칸도 이끼로
    this.springFalls();          // 샘 없는 폭포(정글 절벽)에 샘을 단다 — 유체를 켜기 전에
    /* 뒷공사(상자·제단·통행 보수)가 자갈 칸을 덮어쓴 자리는 목록에서 뺀다 — 남겨 두면 아무것도 없는 벽을 캤을 때 무너질 자리를 찾다가 엉뚱한 곳이 열린다 */
    this.faults = (this.faults || []).filter(f => this.get(f.x, f.y) === T.FAULTSTONE);
    this.placeRichOres();        // 광상 — 제 난수, 광맥 칸만 바꾼다

    this.spawnX = (vx0 + vx1) >> 1;          // 광장 가운데(x0+50)
    this.spawnY = vh - 3;
    this.fitObjects();
    this.placeRigs(true);        // 채취탑 자리 — 물건을 다 맞춘 뒤(지면·유적이 확정된 뒤)
    this.fluidInit();            // 여기서부터 물이 흐른다 — 생성 중에는 꺼 둔다(set 이 수백만 번 불린다)
    this.fluidSettle();          // 샘에서 폭포·물길이 흘러 자리 잡을 때까지 미리 돌린다
    return this;
  }

  /* ================= 충돌 ================= */
  /** 사각형이 막힌 칸이나 닫힌 문의 판과 겹치는지 */
  hitSolid(px, py, w, h) {
    if (super.hitSolid(px, py, w, h)) return true;
    for (const d of this.doors) {
      if (!d.closed) continue;
      const e = this.doorEdge(d);
      if (px < e.x + e.w && px + w > e.x && py < d.y + d.h && py + h > d.y) return true;
    }
    return false;
  }
  doorEdge(d) { return doorEdge(d); }
  /** 문 하나를 만들어 objects/doors 양쪽에 같은 참조로 등록한다 (열고 닫는 상태가 항상 같이 반영되도록). */
  pushDoor(x, y, w, h, dir, extra) {
    const d = Object.assign({ type: 'door', x, y, w, h, closed: true, dir: dir || -1 }, extra);
    this.objects.push(d); this.doors.push(d);
  }

  /* ================= 조명 ================= */
  /** 화면 범위 조명 계산. */
  computeLight(tx0, ty0, tx1, ty1, dayLight, extra) {
    const P = 14;
    const x0 = clamp(tx0 - P, 0, WW - 1), x1 = clamp(tx1 + P, 0, WW - 1);
    const y0 = clamp(ty0 - P, 0, WH - 1), y1 = clamp(ty1 + P, 0, WH - 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (!this.lightBuf || this.lightBuf.length < w * h) this.lightBuf = new Float32Array(w * h + 64);
    const L = this.lightBuf;
    L.fill(0, 0, w * h);
    const sea = this.sea, seaAmb = 1.2 + dayLight * 0.1;   // 깊은 바다: 낮 2.7 · 밤 1.5 (/15)
    // 시드
    for (let x = x0; x <= x1; x++) {
      const s = this.surface[x];
      for (let y = y0; y <= y1; y++) {
        const t = this.tiles[y * WW + x];
        const d = TILE_DEF[t];
        const k = (y - y0) * w + (x - x0);
        if (d.light) L[k] = d.light;
        if (t === T.AIR && y <= s && this.walls[y * WW + x] === 0) L[k] = Math.max(L[k], dayLight);
        /* 바닷물은 깊이만큼 햇빛을 잃되 흩어진 빛이 남는다 — 수면이 화면(+14칸) 밖이면 스윕이
           빛을 못 받아 수심 30칸부터 새까매졌고, 그 어둠에 바다 몹이 통째로 묻혔다. */
        else if (d.sea && sea && y > sea.level)
          L[k] = Math.max(L[k], dayLight - (y - sea.level) * 0.42, seaAmb);
      }
    }
    // 추가 광원 (플레이어 등)
    if (extra) for (const [ex, ey, ev] of extra) {
      if (ex < x0 || ex > x1 || ey < y0 || ey > y1) continue;
      const k = (ey - y0) * w + (ex - x0);
      L[k] = Math.max(L[k], ev);
    }
    const dec = (x, y) => {
      const t = this.tiles[y * WW + x];
      const d = TILE_DEF[t];
      // 창문은 고체지만 빛은 거의 그대로 통과한다 — 2층 집 안이 낮에 환해지는 이유
      if (d.clear) return 1.05;
      if (d.solid === 1) return 2.7;
      /* 바닷물은 빛을 **덜 먹는다.** */
      if (t === T.SEAWATER) return 0.42;
      return 0.92;
    };
    sweepLight(L, w, h, x0, y0, 2, dec);                // 4방향 스윕 x2(engine/tilemap/light)
    this.lbx = x0; this.lby = y0; this.lbw = w; this.lbh = h;
  }
  lightAt(x, y) {
    const lx = x - this.lbx, ly = y - this.lby;
    if (lx < 0 || ly < 0 || lx >= this.lbw || ly >= this.lbh) return 0;
    return this.lightBuf[ly * this.lbw + lx];
  }

  /* ================= 유체 ================= */
  fluidInit() {
    this.flv = new Uint8Array(WW * WH);
    this.fq = [[], []];                                  // [물·바닷물, 용암]
    this.fmark = [new Uint8Array(WW * WH), new Uint8Array(WW * WH)];
    this.fAcc = [0, 0];
    for (let k = WW; k < WW * (WH - 1); k++) {
      const t = this.tiles[k];
      if (t === T.FALLS) { this.flv[k] = 8; continue; }
      if (!FLUID_FLOW[t]) continue;
      // 불러온 흐름은 우선 높게 잡는다 — 다시 재는 동안 낮아지기만 하므로 한 번에 끊기지 않는다
      this.flv[k] = FLUID_KIND[this.tiles[k - WW]] ? 8 : 7;
      this.fluidWake(k % WW, (k / WW) | 0);
    }
    this.fallsAll();
  }
  fluidWake(x, y) {
    const q = this.fq;
    for (let d = 0; d < 5; d++) {
      const xx = x + (d === 1 ? -1 : d === 2 ? 1 : 0), yy = y + (d === 3 ? -1 : d === 4 ? 1 : 0);
      if (xx < 1 || yy < 1 || xx >= WW - 1 || yy >= WH - 1) continue;
      const k = yy * WW + xx;
      for (let j = 0; j < 2; j++) if (!this.fmark[j][k]) { this.fmark[j][k] = 1; q[j].push(k); }
    }
  }
  /** 물은 0.2초, 용암은 0.9초에 한 걸음 — 용암은 느리고 짧게 번진다 */
  fluidTick(dt) {
    if (!this.fq) return;
    const STEP = [0.2, 0.9];
    for (let j = 0; j < 2; j++) {
      this.fAcc[j] += dt;
      if (this.fAcc[j] < STEP[j]) continue;
      this.fAcc[j] = 0;
      if (this.fq[j].length) this._fluidStep(j);
    }
  }
  /** 이 칸의 수위 — 원천·샘·폭포는 8, 흐르는 칸은 flv, 액체가 아니면 0 */
  _flvAt(k) {
    const t = this.tiles[k];
    if (FLUID_SRC[t] || t === T.SPRING || t === T.FALLS) return 8;
    return FLUID_FLOW[t] ? this.flv[k] : 0;
  }
  /** 흐르는 물이 옆으로 번지려면 밑이 받쳐 줘야 한다 — 고체·발판·막힌 칸·고인 원천. */
  _fluidHeld(t) {
    if (FLUID_SRC[t]) return true;
    if (FLUID_FLOW[t] || t === T.FALLS) return false;
    return !FLUID_OPEN(t);
  }
  _fluidStep(j) {
    const q = this.fq[j], mark = this.fmark[j];
    const n = Math.min(q.length, 6000);                 // 한 걸음에 이만큼만 — 큰 범람도 프레임을 안 먹는다
    const todo = q.splice(0, n);
    const out = [];
    for (const k of todo) {
      mark[k] = 0;
      const r = this._fluidEval(k, j);
      if (r) out.push(r);
    }
    // 다 재고 나서 한꺼번에 바꾼다 — 재는 도중에 바꾸면 줄 순서에 따라 한쪽으로만 번진다
    const cols = new Set();
    for (const [k, t, lv] of out) {
      const x = k % WW, y = (k / WW) | 0;
      if (this.tiles[k] !== t) this.set(x, y, t);
      else this.fluidWake(x, y);
      this.flv[k] = lv;
      // 떨어지는 줄기가 바뀌었거나 그 옆 물이 바뀌었다 — 이 칸과 양옆 열의 폭포 판정을 다시 한다
      if (j === 0) for (const d of [-1, 0, 1]) cols.add(k + d);
    }
    for (const k of cols) this._fallsCol(k % WW, (k / WW) | 0);
  }
  /** 불러온 세계·막 만든 세계의 폭포를 한 번 판정한다(_fallsCol). */
  fallsAll() {
    for (let k = WW; k < WW * (WH - 1); k++) {
      if (this.tiles[k] !== T.FALLS || this.tiles[k - WW] === T.FALLS) continue;   // 줄기마다 맨 윗칸에서 한 번
      const x = k % WW, y = (k / WW) | 0;
      this._fallsCol(x, y);
    }
  }
  /** 칸 k 가 무엇이 되어야 하는가 → [k, 타일, 수위] 또는 null(그대로). */
  _fluidEval(k, j) {
    const t = this.tiles[k], kind = FLUID_KIND[t];
    // 용암이 물에 닿았다 — 원천은 흑암석, 흐르는 용암은 돌.
    if (kind === 3) {
      for (const d of [-1, 1, -WW, WW]) {
        const nk = FLUID_KIND[this.tiles[k + d]];
        if (nk === 1 || nk === 2) return [k, t === T.LAVA ? T.OBSIDIAN : T.STONE, 0];
      }
    }
    if (FLUID_SRC[t]) return null;
    const flowing = FLUID_FLOW[t] || t === T.FALLS;
    if (!flowing && !FLUID_OPEN(t)) return null;
    // 이 걸음이 맡은 액체만 본다 — 흐르는 칸이 제 종류가 아니면 다른 걸음에 맡긴다
    if (flowing && (kind === 3) !== (j === 1)) return null;

    let bestK = 0, bestL = 0;
    // 1) 위에서 떨어지는 것이 먼저다
    const up = this.tiles[k - WW];
    const upK = up === T.SPRING ? 1 : FLUID_KIND[up];
    if (upK && (upK === 3) === (j === 1)) { bestK = upK; bestL = 8; }
    else {
      // 2) 옆에서 번져 오는 것 — 이웃이 받쳐져 있을 때만
      let srcN = 0;
      for (const d of [-1, 1]) {
        const nt = this.tiles[k + d];
        const nk = nt === T.SPRING ? 1 : FLUID_KIND[nt];
        if (!nk || (nk === 3) !== (j === 1)) continue;
        if (FLUID_SRC[nt] && nk !== 3 && (nt === T.WATER || nt === T.SEAWATER)) srcN++;
        /* 받침: 원천은 밑이 고체든 물이든 받쳐진 것으로 친다(호숫가 턱으로 번진다). */
        const bt = this.tiles[k + d + WW];
        const held = FLUID_SRC[nt] || nt === T.SPRING ? this._fluidHeld(bt) : !FLUID_KIND[bt] && !FLUID_OPEN(bt);
        if (!held) continue;
        const l = this._flvAt(k + d) - (nk === 3 ? 2 : 1);
        if (l > bestL || (l === bestL && nk < bestK)) { bestL = l; bestK = nk; }
      }
      // 무한 물 — 고인 물 둘 사이 칸은, 밑이 받쳐져 있으면 원천이 된다
      if (srcN >= 2 && bestK !== 3 && this._fluidHeld(this.tiles[k + WW]))
        return [k, bestK === 2 ? T.SEAWATER : T.WATER, 0];
    }
    if (bestL <= 0 || !bestK) {
      if (flowing) return [k, T.AIR, 0];                 // 먹여 주던 것이 끊겼다 — 마른다
      return null;
    }
    // 떨어지는 민물은 폭포(FALLS)일 수도, 그냥 떨어지는 물(흐르는 물 수위 8)일 수도 있다 — 어느 쪽인지는 줄기 전체를 봐야 알므로 여기서는 둘 다 맞는 것으로 치고
    // _fallsCol 에 맡긴다
    if (bestL >= 8 && bestK === 1 && (t === T.FALLS || t === T.FLOWWATER) && this.flv[k] === 8) return null;
    const nt = FLUID_TILE[bestK];
    const lv = bestL;
    if (t === nt && this.flv[k] === lv) return null;
    return [k, nt, lv];
  }
  /** ★ 폭포 판정 — 떨어지는 민물 줄기 가운데 **4칸 이상 곧게 떨어지고, 양옆에 고인·흐르는 물이 없는** 토막만 폭포(FALLS)다 — 사연:
     docs/code-history.md#h135 */
  _fallsCol(x, y) {
    const falling = k => this.tiles[k] === T.FALLS || (this.tiles[k] === T.FLOWWATER && this.flv[k] === 8);
    let k = y * WW + x;
    if (!falling(k)) return;
    let top = k, bot = k;
    while (top - WW > WW && falling(top - WW)) top -= WW;
    while (bot + WW < WW * (WH - 1) && falling(bot + WW)) bot += WW;
    const still = n => {
      const t = this.tiles[n], kd = FLUID_KIND[t];
      if (kd !== 1 && kd !== 2) return false;
      return !(t === T.FALLS || (FLUID_FLOW[t] && this.flv[n] === 8));
    };
    let seg = [];
    const flush = () => {
      const want = seg.length >= 4 ? T.FALLS : T.FLOWWATER;
      for (const n of seg) if (this.tiles[n] !== want) { this.set(n % WW, (n / WW) | 0, want); this.flv[n] = 8; }
      seg = [];
    };
    for (let n = top; n <= bot; n += WW) {
      if (still(n - 1) || still(n + 1)) {
        flush();
        if (this.tiles[n] !== T.FLOWWATER) { this.set(n % WW, (n / WW) | 0, T.FLOWWATER); this.flv[n] = 8; }
      } else seg.push(n);
    }
    flush();
  }
  /** 동굴 호수를 폭포가 떨어지는 열(fx)까지 **한 덩어리로** 잇는다. */
  _extendLake(lk, fx, dir) {
    const x0 = Math.min(fx, lk.x0), x1 = Math.max(fx, lk.x1), top = lk.top;
    for (let x = x0; x <= x1; x++)
      for (let y = top - 4; y <= top + 2; y++) if (this.ruinAt(x, y) || this.get(x, y) === T.BEDROCK) return false;
    const wet = t => t === T.WATER || t === T.LILY || t === T.PONDWEED;
    for (let x = x0; x <= x1; x++) {
      if (wet(this.get(x, top)) && wet(this.get(x, top + 1))) continue;
      for (let y = top; y <= top + 1; y++) if (!wet(this.get(x, y))) this.set(x, y, T.WATER);
      if (!this.solid(x, top + 2) && !wet(this.get(x, top + 2))) this.set(x, top + 2, T.STONE);
      // 수면 위 둔덕 — 네 칸 안에 빈칸이 있으면 둔덕이다(없으면 벽이라 두고, 굴 지붕 밑 물이 된다)
      let ya = -1;
      for (let y = top - 1; y >= top - 4; y--) if (this.get(x, y) === T.AIR) { ya = y; break; }
      if (ya >= 0) for (let y = ya + 1; y < top; y++) if (this.solid(x, y)) this.set(x, y, T.AIR);
    }
    if (fx < lk.x0 || fx > lk.x1)
      for (let y = top; y <= top + 1; y++) if (!this.solid(fx + dir, y)) this.set(fx + dir, y, T.STONE);
    lk.x0 = x0; lk.x1 = x1;
    return true;
  }
  /** 세계를 막 만들었을 때 — 샘에서 나온 물이 폭포가 되어 떨어지고 물길이 되어 호수로 들기까지 흐름을 끝까지 돌려 둔다. */
  fluidSettle() {
    for (let i = 0; i < 600 && (this.fq[0].length || this.fq[1].length); i++) {
      if (this.fq[0].length) this._fluidStep(0);
      if (i % 4 === 0 && this.fq[1].length) this._fluidStep(1);
    }
  }
  /** 옛 세이브·생성된 폭포의 윗머리 — 폭포 꼭대기 위가 막혀 있으면 그 칸을 샘 바위로, 위가 트여 있으면(정글 절벽 폭포처럼 땅 위로 쏟아지는 것) 꼭대기 칸을 샘 바위로 바꾼다. */
  springFalls() {
    for (let k = WW; k < WW * (WH - 1); k++) {
      if (this.tiles[k] !== T.FALLS) continue;
      const up = this.tiles[k - WW];
      if (up === T.FALLS || up === T.SPRING || FLUID_KIND[up]) continue;
      if (up === T.BEDROCK) continue;
      const x = k % WW, y = (k / WW) | 0;
      if (TILE_DEF[up].solid === 1) this.set(x, y - 1, T.SPRING);
      else this.set(x, y, T.SPRING);
    }
  }

  /* ================= 저장 ================= */
  serialize() {
    return {
      seed: this.seed, ww: WW, wh: WH, size: WSIZE, ruinSites: this.ruinSites, ruinEvents: this.ruinEvents,
      tiles: rleEncode(this.tiles),
      walls: rleEncode(this.walls),
      surface: Array.from(this.surface),
      objects: this.objects.map(o => ({ ...o })),
      machines: Array.from(this.machines.values()),
      crops: Array.from(this.crops),
      spawnX: this.spawnX, spawnY: this.spawnY, villageY: this.villageY,
      dawnY: this.dawnY, dawnCity: this.dawnCity, works: this.works, runaway: this.runaway,
      atelier: this.atelier, citadel: this.citadel, deepShaft: this.deepShaft,
      dungeon: this.dungeon, ruins: this.ruins, sealRoom: this.sealRoom,
      skyIslands: this.skyIslands, skyGate: this.skyGate, giantTree: this.giantTree,
      caverns: this.caverns, pools: this.pools, lavaPools: this.lavaPools, falls: this.falls, sea: this.sea || null,
      caveGrid: this.caveGrid ? Array.from(this.caveGrid) : null, faults: this.faults || [], oreHits: this.oreHits || {},
      explored: rleEncode(this.explored)
    };
  }
  static deserialize(d) {
    const w = new World(d.seed);
    w.tiles = rleDecode(d.tiles, WW * WH, Uint8Array);
    w.walls = rleDecode(d.walls, WW * WH, Uint8Array);
    w.surface = Int16Array.from(d.surface);
    w.objects = d.objects;
    w.fitObjects();   // 규격 도입 전 세이브에 담긴 큰 설치물도 여기서 한 칸 크기로 맞춘다
    /* ★ 이미 연 암호 골방의 문간을 다시 뚫어 본다 — 사연: docs/code-history.md#h136 */
    for (const o of w.objects)
      if (o.type === 'codedoor' && o.opened) w.openCodeDoorway(o.dx, o.dy);
    w.doors = w.objects.filter(o => o.type === 'door');   // objects와 같은 참조로 다시 캐싱
    for (const m of (d.machines || [])) {
      if (m.it) { delete m.it.t0; delete m.it.fx; delete m.it.fy; }   // 미끄러짐 시각은 지난 판의 G.time — 남기면 한 칸 뒤에 얼어붙는다
      w.machines.set(m.y * WW + m.x, m);
    }
    for (const k of (d.crops || [])) w.crops.add(k);
    w.netDirty = true;
    // 예전 세이브(v3 이전)에는 explored가 없다 — 그런 경우 처음부터 다시 밝혀 나가면 된다
    if (d.explored) w.explored = rleDecode(d.explored, WW * WH, Uint8Array);
    w.spawnX = d.spawnX; w.spawnY = d.spawnY; w.villageY = d.villageY;
    w.dawnY = d.dawnY; w.dawnCity = d.dawnCity; w.works = d.works; w.runaway = d.runaway;
    w.atelier = d.atelier || null;   // 설계실이 생기기 전 세이브에는 없다
    w.citadel = d.citadel || null; w.deepShaft = d.deepShaft || null;
    w.dungeon = d.dungeon; w.ruins = d.ruins; w.sealRoom = d.sealRoom; w.ruinSites = d.ruinSites || []; w.ruinEvents = d.ruinEvents || [];
    w.skyIslands = d.skyIslands; w.skyGate = d.skyGate; w.giantTree = d.giantTree;
    // 물이 생기기 전의 세이브에는 이 둘이 없다 — 타일에는 이미 물이 없으니 빈 배열이 맞다
    w.caverns = d.caverns || []; w.pools = d.pools || []; w.lavaPools = d.lavaPools || [];
    w.falls = d.falls || [];   // 폭포 앰비언트 도입 전 세이브 — 빈 배열이면 그냥 조용할 뿐, 안전하다
    /* ★ 바다 수면(sea.level)은 물고기 표·부유물·파도 타기가 읽는다 — 저장이 빠졌던 동안 불러온 세계에서 바다 물고기 생성이 터졌다.
       그 세이브는 타일에서 다시 잰다: 왼쪽 끝 기둥의 첫 바닷물 칸이 수면, 그 줄을 따라 바닷물이 이어지는 끝이 물가. */
    w.sea = d.sea || null;
    if (!w.sea) {
      let lv = -1;
      for (let y = 1; y < WH && lv < 0; y++) if (w.tiles[y * WW + 5] === T.SEAWATER) lv = y;
      if (lv > 0) {
        let x1 = 5;                            // 섬이 수면 줄을 끊으므로 40칸 안의 틈은 건너뛴다
        for (let x = 6, gap = 0; x < WW && gap < 40; x++) {
          if (w.tiles[lv * WW + x] === T.SEAWATER || w.tiles[(lv + 1) * WW + x] === T.SEAWATER) { x1 = x; gap = 0; } else gap++;
        }
        w.sea = { x1, level: lv, floor: null };
      }
    }
    if (w.sea) { w.seaLevel = w.sea.level; w.shoreY = w.sea.level + 2; }
    // 동굴 갈래 도입 전 세이브 — 갈래가 없으면 모든 굴이 plain 이고, 무너질 자갈도 없다
    w.caveGrid = d.caveGrid ? Uint8Array.from(d.caveGrid) : null;
    w.faults = d.faults || [];
    w.oreHits = d.oreHits || {};
    // 유체 — 샘 없는 옛 폭포에 샘을 달아 주고 켠다(springFalls 의 ★)
    w.springFalls();
    w.fluidInit();
    return w;
  }
}
