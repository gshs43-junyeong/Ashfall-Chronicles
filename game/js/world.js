/* ===== world.js — 세계 생성 / 충돌 / 조명 ===== */
'use strict';

const TS = 22;              // 타일 픽셀 크기
/* ★ 아래 세계 치수는 **세계 크기(소형·중형·대형)마다 다르다** — setWorldSize 가 새 게임·불러오기 때 고쳐 쓴다(let). */
let WW = 5000;              // 세계 가로(타일, 소형) — 세션 3 지역(바다·빙하)이 왼쪽 800칸(SHIFT)
// SHIFT(=800)는 data.js에 있다 — RUIN_SPEC 좌표도 같은 값으로 밀어야 해서 거기서 먼저 정의한다.
let WH = 720;               // 세계 세로(타일) — 세션 3 심해를 담으려고 480에서 늘렸다
/* 보통 세계의 바닥. */
let WORLD_BOT = 480;
let SURF_BASE = 70;         // 기준 지표 높이
let HELL_Y = 390;           // 지옥 시작 깊이
let DEEP_Y = 280;           // 심층 시작
let SKY_Y = 40;             // 하늘 섬 구역 (이보다 위)
const CAVE_GW = 60, CAVE_GH = 55; // 동굴 갈래 구역 한 칸의 크기(buildCaveZones)
/* 이보다 작고 고립된(지상과 안 통하는) 공동은 동굴로 치지 않고 메운다(타일 수). */
const MIN_CAVE = 220;
let CAMP_X0 = 1000 + SHIFT, CAMP_X1 = 1100 + SHIFT;   // 베이스캠프 — 잿빛 숲 (zoneAt에서도 참조)

/* 세션 3 — 왼쪽으로 갈수록 가라앉은 바다 · 빙하 지대 · 서리 지대 순으로 나온다 — 사연: docs/code-history.md#h101 */
let SEA_X1 = 430;            // 가라앉은 바다 — 여기부터 왼쪽이 물
/* 해변 폭. */
const BEACH_W = 90;          // 물가에서 안쪽으로 이만큼이 모래 해변이다
/* 바다 + 해변 — 나무·풀·꽃 같은 지상 초목을 놓지 않는다 — 사연: docs/code-history.md#h102 */
const inSeaZone = x => x < SEA_X1 + BEACH_W + 4;
let GLACIER_X1 = SHIFT;      // 빙하 지대 오른쪽 끝 = 원래 세계가 시작하는 자리
/* 바이옴. */
const BIOMES = [
  { id: 'sea', x0: 0, x1: SEA_X1, n: '가라앉은 바다',
    card: { sub: '가장 먼 서쪽', line: '물이 지운 쪽. 숨을 셈하며 내려가는 곳.' },
    air: { c: '#2f7fb8', a: 0.22 } },
  { id: 'glacier', x0: SEA_X1, x1: GLACIER_X1, n: '빙하 지대',
    card: { sub: '물가 안쪽', line: '바다가 얼어붙은 자리. 밟는 것마다 갈라진다.' },
    air: { c: '#bfeaf7', a: 0.20 } },
  { id: 'ice', x0: GLACIER_X1, x1: 620 + SHIFT, n: '서리 지대',
    card: { sub: '서쪽 끝', line: '눈이 소리를 먹는다. 밟은 자리가 오래 남는 땅.' },
    air: { c: '#a8c8ee', a: 0.19 } },
  { id: 'forest', x0: 620 + SHIFT, x1: 1400 + SHIFT, n: '잿빛 숲',
    card: { sub: '시작한 자리', line: '재가 잎을 대신한 숲. 나무는 서 있으나 그늘이 없다.' },
    air: { c: '#b0aa90', a: 0.11 } },
  { id: 'jungle', x0: 1400 + SHIFT, x1: 2000 + SHIFT, n: '울림 정글',
    card: { sub: '남쪽 골짜기', line: '골이 깊어 소리가 되돌아온다. 젖은 공기가 무겁다.' },
    air: { c: '#5fbf86', a: 0.15 } },
  { id: 'desert', x0: 2000 + SHIFT, x1: 2680 + SHIFT, n: '메마른 사구',
    card: { sub: '가운데 모래', line: '물이 마른 자리에 바람이 길을 낸다. 낮과 밤이 다른 땅.' },
    air: { c: '#e8be74', a: 0.18 } },
  { id: 'forest2', x0: 2680 + SHIFT, x1: 3300 + SHIFT, n: '동쪽 숲',
    card: { sub: '마을 언저리', line: '재가 덜 닿은 숲. 사람이 아직 길을 내고 사는 곳.' },
    air: { c: '#93c47a', a: 0.15 } },
  { id: 'glowfen', x0: 3300 + SHIFT, x1: 3760 + SHIFT, n: '버섯 골짜기',
    card: { sub: '내려앉은 땅', line: '땅이 통째로 꺼져 갓이 자랐다. 어둠이 스스로 빛난다.' },
    air: { c: '#6fe0c4', a: 0.24 } },
  { id: 'corrupt', x0: 3760 + SHIFT, x1: WW, n: '부패한 땅',
    card: { sub: '동쪽 끝', line: '별이 떨어진 자리. 흙까지 물들어 되돌릴 수 없다.' },
    air: { c: '#a874e0', a: 0.27 } }];
const BIOME_BAND = 104;     // 바이옴 경계 블렌딩 폭(타일)
for (const b of BIOMES) { b.bx0 = b.x0; b.bx1 = b.x1; }   // 소형 기준 경계 — setWorldSize 가 여기서 다시 잰다

/** 세계 크기를 정한다 — 새 게임 직전·불러오기 직전에 부른다(data.js WORLD_SIZES 의 ★). */
function setWorldSize(key) {
  WSIZE = WORLD_SIZES[key] ? key : 's';
  WSX = WSY = WORLD_SIZES[WSIZE].k;
  WW = SX(5000); WH = SY(720);
  WORLD_BOT = SY(480); SURF_BASE = SY(70); HELL_Y = SY(390); DEEP_Y = SY(280); SKY_Y = SY(40);
  CAMP_X0 = SX(1050 + SHIFT) - 50; CAMP_X1 = CAMP_X0 + 100;
  SEA_X1 = SX(430); GLACIER_X1 = SX(SHIFT);
  for (const b of BIOMES) { b.x0 = b.bx0 === 0 ? 0 : SX(b.bx0); b.x1 = b.bx1 >= 5000 ? WW : SX(b.bx1); }
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
const ZONE_CARD = {
  camp: { n: '베이스캠프', sub: '잿빛 숲 한복판',
          card: { line: '살아남은 이들이 처음 불을 피운 자리. 여기서부터 다시 센다.' } },
  village: { n: '여명 마을', sub: '재를 이고 사는 곳',
             card: { line: '재가 내린 뒤에도 굴뚝이 서 있다. 사람이 남긴 마지막 거리.' } }
};

/* 재질 번호 → 지층 구성 — 사연: docs/code-history.md#h103 */
const MAT_LAYER = [
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
const MAT_OF = { ice: 0, forest: 1, forest2: 1, desert: 2, corrupt: 3, jungle: 4, glowfen: 5,
                 glacier: 6, sea: 7 };

/* ================= 여명 마을 배치표 ================= */
const DAWN_BUILDINGS = [
  // off: 시작 칸, w/h: 폭·높이, npc/fac: 그 안에 사는 사람과 시설.
  { off:  2, w: 18, h: 10, npc: 'haran',   fac: 'inn'       },   // 여관
  { off: 24, w: 17, h: 13, npc: 'tamer',   fac: 'workbench' },   // 조련사
  { off: 70, w: 17, h: 13, npc: 'seira',   fac: 'reforge'   },   // 재련
  { off: 93, w: 18, h: 10, npc: 'trainer', fac: 'vault'     }    // 훈련소 · 보관고
];
/* 건물 안 배치 — 건물 시작점 기준. */
/* 시설(fac)은 9~10칸, 강화 모루는 11~12칸, 탁자는 14~15칸. */
const DAWN_INSIDE = { shelf: 2, npc: 6, fac: 9, anvil: 11, table: 14 };

/* 광장 — 건물1과 건물2 사이. */
// 작업대는 조련사네 집 안(DAWN_BUILDINGS[1].fac)으로 옮겨서 여기 목록엔 없다.
const DAWN_PLAZA = [
  { id: 'kade',      off: -10, w: 1 },
  { id: 'board',     off:  -7, w: 2 },
  { id: 'fountain',  off:  -2, w: 5 },
  { id: 'townhall',  off:   4, w: 2 },
  { id: 'waystone',  off:   8, w: 2 },
  { id: 'forge',     off:  12, w: 2 }
];
/* 광장 물건의 실제 그림 크기(px). */
const DAWN_OBJ = {
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
const DAWN_WALL = { leftOff: -16, rightOff: 15, gateH: 3, towerH: 14,
  /* 성벽에서 이만큼 더 바깥까지 지면을 평평하게 깎는다. */
  flatPad: 10 };

/** 유적 통행 검사(_standSet)가 쓰는 칸 집합 — Set 과 같은 쓰임(has · add · size · 순회)을 상자 크기의 Uint8Array 로 한다 — 사연:
   docs/code-history.md#h104 */
class BoxSet {
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
function doorEdge(d) {
  const w = Math.max(6, Math.round(d.w * 0.32));
  return { x: d.dir === -1 ? d.x : d.x + d.w - w, y: d.y, w, h: d.h };
}

class World {
  constructor(seed) {
    this.seed = seed;
    this.rng = new RNG(seed);
    this.tiles = new Uint8Array(WW * WH);
    this.walls = new Uint8Array(WW * WH);
    this.surface = new Int16Array(WW);
    this.objects = [];          // 작업대/용광로/상자/NPC/제단
    this.doors = [];            // objects의 부분집합(같은 참조) — 충돌 판정을 빠르게 하려고 따로 캐싱
    /* 공장 기계. */
    this.machines = new Map();
    this.netDirty = true;       // 전력망을 다시 계산해야 하는가 (기계 설치/철거 시 켜진다)
    this.nets = [];
    /* 심어 둔 작물의 타일 인덱스. */
    this.crops = new Set();
    /* 부서진 바닥이 되돌아올 시각. */
    this.crumbled = new Map();
    /* 화면에 실제로 그려진 적이 있는 타일만 1로 표시한다 — 미니맵·전체 지도의 안개 기준. */
    this.explored = new Uint8Array(WW * WH);
    this.spawnX = 180; this.spawnY = 0;
    this.lightBuf = null; this.lbx = 0; this.lby = 0; this.lbw = 0; this.lbh = 0;
  }

  i(x, y) { return y * WW + x; }
  inB(x, y) { return x >= 0 && y >= 0 && x < WW && y < WH; }
  get(x, y) { return this.inB(x, y) ? this.tiles[y * WW + x] : T.BEDROCK; }
  wall(x, y) { return this.inB(x, y) ? this.walls[y * WW + x] : 0; }
  set(x, y, t) {
    if (!this.inB(x, y)) return;
    this.tiles[y * WW + x] = t;
    /* 유체가 켜진 뒤(생성·불러오기 끝)에만 — 바뀐 칸과 그 네 이웃을 흐름 검사 줄에 세운다. */
    if (this.fq) this.fluidWake(x, y);
  }
  setWall(x, y, w) { if (this.inB(x, y)) this.walls[y * WW + x] = w; }
  solid(x, y) { const d = TILE_DEF[this.get(x, y)]; return d.solid === 1; }
  platform(x, y) { return TILE_DEF[this.get(x, y)].solid === 2; }
  hurtTile(x, y) { return TILE_DEF[this.get(x, y)].hurt || 0; }
  liquid(x, y) { return !!TILE_DEF[this.get(x, y)].liquid; }
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
    const vx0 = CAMP_X0, vx1 = CAMP_X1;    // 베이스캠프 — 잿빛 숲
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

    this.spawnX = (vx0 + vx1) >> 1;
    this.spawnY = vh - 3;
    this.fitObjects();
    this.placeRigs(true);        // 채취탑 자리 — 물건을 다 맞춘 뒤(지면·유적이 확정된 뒤)
    this.fluidInit();            // 여기서부터 물이 흐른다 — 생성 중에는 꺼 둔다(set 이 수백만 번 불린다)
    this.fluidSettle();          // 샘에서 폭포·물길이 흘러 자리 잡을 때까지 미리 돌린다
    return this;
  }

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
  }

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
  }

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
  }

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
  }

  /** 2칸 이상 폭인 기둥이 비탈에 걸치면 낮은 쪽 바닥까지 기둥을 이어 붙인다 — 기둥은 한 칸의 지표만 기준으로 심으므로, 옆 칸이 낮으면 밑동과 지면 사이가 비어 "바닥에 안 닿은
     나무통"이 된다. */
  _groundTrunk(x, wdt, s, woodT) {
    // 완만한 비탈(몇 칸 차이)만 메운다.
    const CAP = 4;
    for (let dx = 1; dx < wdt; dx++) {
      const s2 = this.surface[x + dx];
      if (s2 > s && s2 - s <= CAP) for (let y = s; y < s2; y++) this.set(x + dx, y, woodT);
    }
  }

  /** 수관 — 기둥 띠(x..x+wdt-1)에서의 거리로 재서, 굵은 기둥에도 캡슐 모양으로 얹힌다. */
  _canopy(x, top, r, wdt, leafT, slack) {
    for (let dx = -r; dx <= r + wdt - 1; dx++)
      for (let dy = -r; dy <= r - 1; dy++) {
        const hd = dx < 0 ? -dx : (dx > wdt - 1 ? dx - (wdt - 1) : 0);
        if (hd * hd + dy * dy > r * r + slack) continue;
        if (this.get(x + dx, top + dy) === T.AIR) this.set(x + dx, top + dy, leafT);
      }
  }

  /** 그 자리에 원래 있어야 할 지층 타일 (메울 때 쓴다) */
  _bedAt(x, y) {
    if (y >= WORLD_BOT - 4) return T.BEDROCK;
    if (y >= HELL_Y) return T.ASH;
    const L = MAT_LAYER[this.matId[x]], depth = y - this.surface[x];
    if (depth < 20) return L.sub;
    return L.deep;
  }

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
  }

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
  }

  /* ================= 농업 ================= */
  /** 씨앗을 심는다. */
  plantSeed(x, y, seedId) {
    const tile = SEED_TILE[seedId];
    if (tile === undefined) return false;
    if (this.get(x, y) !== T.AIR || !TILE_DEF[this.get(x, y + 1)].farm) return false;
    this.set(x, y, tile);
    this.crops.add(y * WW + x);
    return true;
  }

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
  }

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
        this.crumbled.set(k, 9);                               // 9초 뒤 제자리로
        if (window.G) for (let i = 0; i < 6; i++) G.parts.push(new Part(x * TS + TS / 2, y * TS + TS / 2, '#6a6050'));
      } else {
        // 그 자리에 누가 서 있으면 끼이므로, 비어 있을 때만 되돌린다
        if (!this.hitSolid(x * TS, y * TS, TS, TS)) this.tiles[k] = T.CRUMBLE;
        this.crumbled.delete(k);
      }
    }
  }

  /** 퇴비 등으로 즉시 한 단계 키운다 */
  forceGrow(x, y) {
    const def = TILE_DEF[this.get(x, y)];
    if (!def.crop || !def.crop.next) return false;
    this.set(x, y, def.crop.next);
    return true;
  }

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
  }

  /** 버섯 골짜기의 큰 발광 버섯 — 갓이 스스로 빛나 어두운 골짜기를 밝힌다. */
  glowStalk(x, s, rng) {
    const h = rng.int(4, 8);
    for (let y = s - 1; y > s - h; y--) this.set(x, y, T.WOOD);
    this._canopy(x, s - h, rng.int(2, 3), 1, T.GLOWLEAF, 1);
  }

  /** 사막의 큰 선인장 — 고체 블록 기둥이라 밟거나 스치면 아프다 */
  cactusPlant(x, s, rng) {
    const h = rng.int(2, 4);
    for (let y = s - 1; y > s - 1 - h; y--) this.set(x, y, T.CACTUS_BLOCK);
    if (h >= 3 && rng.chance(0.5)) {   // 팔 하나
      const ay = s - 1 - rng.int(1, h - 1), adx = rng.chance(0.5) ? -1 : 1;
      if (this.get(x + adx, ay) === T.AIR) this.set(x + adx, ay, T.CACTUS_BLOCK);
    }
  }

  /* ---- 마을: 오두막 3채 + 작업대 + 용광로 + NPC ---- */
  buildVillage(x0, x1, gy, rng) {
    const huts = [
      { x: x0 + 2, w: 13, npc: 'elara' },
      { x: x0 + 19, w: 14, npc: 'borin' },
      { x: x0 + 37, w: 12, npc: 'mira' }
    ];
    for (const h of huts) {
      const hh = 7, bx = h.x, by = gy - hh;
      for (let x = bx; x < bx + h.w; x++)
        for (let y = by; y < gy; y++) {
          const edge = (x === bx || x === bx + h.w - 1 || y === by);
          this.set(x, y, edge ? T.PLANK : T.AIR);
          this.setWall(x, y, 4);
        }
      for (let x = bx - 1; x <= bx + h.w; x++) this.set(x, by - 1, T.PLANK);
      this.set(bx + 2, by + 1, T.TORCH);
      this.set(bx + h.w - 3, by + 1, T.TORCH);
      for (let x = bx; x < bx + h.w; x++) this.set(x, gy, T.PLANK);
      // 출입구 — 양쪽 벽에 두 칸씩 뚫고 여닫이문을 단다
      const rx = bx + h.w - 1;
      this.set(bx, gy - 1, T.AIR); this.set(bx, gy - 2, T.AIR);
      this.set(rx, gy - 1, T.AIR); this.set(rx, gy - 2, T.AIR);
      this.pushDoor(bx * TS, (gy - 2) * TS, TS, TS * 2, -1);
      this.pushDoor(rx * TS, (gy - 2) * TS, TS, TS * 2, 1);
      this.objects.push({ type: 'npc', npc: h.npc, x: (bx + h.w / 2) * TS, y: gy * TS - 44, w: 22, h: 44 });
    }
    // 광장 — 작업대/용광로는 플레이어가 직접 만들어 놓는 것과 **같은 크기**(OBJ_SIZE)를 쓴다 — 사연: docs/code-history.md#h106
    const cx = (x0 + x1) >> 1;
    const wbS = OBJ_SIZE.workbench, fgS = OBJ_SIZE.forge;
    this.objects.push({ type: 'workbench', x: (cx - 4) * TS, y: gy * TS - wbS.h, w: wbS.w, h: wbS.h, lv: 1 });
    this.objects.push({ type: 'forge', x: (cx + 3) * TS, y: gy * TS - fgS.h, w: fgS.w, h: fgS.h, lv: 1 });
    for (let x = cx - 8; x < cx + 9; x++) { this.set(x, gy, T.BRICK); this.set(x, gy - 1, T.AIR); this.set(x, gy - 2, T.AIR); }
    this.set(cx - 9, gy - 1, T.TORCH); this.set(cx + 9, gy - 1, T.TORCH);
    // 귀환 비석 — 여명 마을이 되살아나기 전까지는 아무 반응이 없다
    this.objects.push({ type: 'waystone', x: (cx - 12) * TS, y: gy * TS - 48, w: 30, h: 48 });
    // 노인
    this.objects.push({ type: 'npc', npc: 'old', x: (x1 + 6) * TS, y: this.surface[x1 + 6] * TS - 44, w: 22, h: 44 });
  }

  /* ---- 여명 마을 ---- */
  buildDawnCity(x0, x1, gy, rng) {
    const blocks = DAWN_BUILDINGS.map(b => ({ x: x0 + b.off, w: b.w, h: b.h }));
    this.dawnCity = { x0, x1, gy, blocks, restored: 0 };

    // 대로
    for (let x = x0 - 6; x < x1 + 6; x++) {
      this.set(x, gy, T.RUINTILE);
      this.set(x, gy + 1, T.RUINBRICK);
      this.set(x, gy + 2, T.RUINBRICK);
    }
    for (const b of blocks) {
      const by = gy - b.h;
      for (let x = b.x; x < b.x + b.w; x++)
        for (let y = by; y < gy; y++) {
          const edge = (x === b.x || x === b.x + b.w - 1 || y === by);
          // 무너진 자리: 지붕 줄(by)은 남기고 옆벽만 군데군데 뚫는다
          const fallen = edge && y > by && rng.chance(0.18);
          this.set(x, y, edge && !fallen ? T.RUINBRICK : T.AIR);
          this.setWall(x, y, 10);
        }
      // 처마는 지붕 줄에만 얹는다 — 사연: docs/code-history.md#h107
      for (let x = b.x - 2; x <= b.x + b.w + 1; x++) this.set(x, by - 1, T.RUINTILE);
    }
    // 중앙 광장 — 건물 사이를 비우고, 분수대 물받이만 놓는다 — 사연: docs/code-history.md#h108
    const cx = (x0 + x1) >> 1;
    const [pL, pR] = this.dawnPlazaSpan();
    for (let x = pL; x <= pR; x++)
      for (let y = gy - 3; y < gy; y++) this.set(x, y, T.AIR);
    const fo = DAWN_PLAZA.find(s => s.id === 'fountain');
    for (let x = cx + fo.off; x < cx + fo.off + fo.w; x++) this.set(x, gy - 1, T.RUINBRICK);
  }

  /** 광장 가로 구간(타일) — 건물1 오른쪽 끝 다음 칸부터 건물2 왼쪽 끝 앞 칸까지. */
  dawnPlazaSpan() {
    const b = this.dawnCity.blocks;
    return [b[1].x + b[1].w, b[2].x - 1];
  }

  /* ---- 지하 공창 (세션 2) ---- */
  buildWorks(dx0, dx1, rng) {
    const cx = (dx0 + dx1) >> 1;
    const y0 = SY(210), h = 40, x0 = cx - 34, w = 68;
    this.works = { x0, y0, w, h, cx, liftX: cx };

    this.clearBox(x0, y0, w, h);
    // 외곽 강철 껍질
    for (let x = x0 - 1; x <= x0 + w; x++) { this.set(x, y0 - 1, T.STEELPLATE); this.set(x, y0 + h, T.STEELPLATE); }
    for (let y = y0 - 1; y <= y0 + h; y++) { this.set(x0 - 1, y, T.STEELPLATE); this.set(x0 + w, y, T.STEELPLATE); }
    for (let x = x0; x < x0 + w; x++)
      for (let y = y0; y < y0 + h; y++) this.setWall(x, y, 2);

    // 작업 층 3단 — 강철 바닥 + 사이사이 발판
    for (let k = 1; k <= 3; k++) {
      const fy = y0 + k * 10;
      for (let x = x0; x < x0 + w; x++) {
        if (Math.abs(x - cx) < 3) continue;            // 승강기 통로는 비워 둔다
        this.set(x, fy, rng.chance(0.12) ? T.PLATFORM : T.STEELPLATE);
      }
      // 층마다 동력관 등불
      for (let x = x0 + 5; x < x0 + w - 4; x += 11) this.set(x, fy - 1, T.CONDUIT);
    }
    // 승강기 수직축 — 지상 도시까지 뚫는다
    for (let y = this.surface[cx] + 1; y < y0; y++)
      for (let x = cx - 2; x <= cx + 2; x++) {
        this.set(x, y, T.AIR);
        this.setWall(x, y, 2);
      }
    for (let y = this.surface[cx] + 1; y < y0 + h; y += 4) {
      this.set(cx - 2, y, T.PLATFORM); this.set(cx + 2, y, T.PLATFORM);
    }
    // 동력석 광맥 — 스테이지 3의 드릴 연료가 될 것
    for (let i = 0; i < 90; i++) {
      const x = rng.int(x0 + 1, x0 + w - 2), y = rng.int(y0 + 1, y0 + h - 2);
      if (this.get(x, y) !== T.AIR) continue;
      if (Math.abs(x - cx) < 4) continue;
      this.set(x, y, rng.chance(0.35) ? T.POWERSTONE : T.STEELPLATE);
    }
    // 관리자 격실 (보스방) — 가장 아래층 안쪽
    const bx = cx + 16, by = y0 + h - 11;
    this.clearBox(bx - 9, by, 18, 10);
    for (let x = bx - 9; x < bx + 9; x++) this.set(x, by + 10, T.STEELPLATE);
    for (let y = by; y < by + 10; y++) { this.set(bx - 10, y, T.STEELPLATE); this.set(bx + 9, y, T.STEELPLATE); }
    this.set(bx - 6, by + 2, T.CONDUIT); this.set(bx + 5, by + 2, T.CONDUIT);
    // 관리자는 소환 아이템이 없다 — 내려가서 마주치는 흐름이라 둥지로 둔다
    this.objects.push({ type: 'lair', boss: 'overseer', ruin: 12, nm: '관리자 격실',
      x: bx * TS, y: (by + 10) * TS - 48, w: 40, h: 48 });

    // 설계도 단말 — 세션 2 오프닝의 핵심 수집물
    this.objects.push({ type: 'terminal', x: (x0 + 6) * TS, y: (y0 + 10) * TS - 40, w: 34, h: 40, term: 0 });
    this.objects.push({ type: 'terminal', x: (x0 + w - 9) * TS, y: (y0 + 20) * TS - 40, w: 34, h: 40, term: 1 });
    this.objects.push({ type: 'terminal', x: (x0 + 14) * TS, y: (y0 + 30) * TS - 40, w: 34, h: 40, term: 2 });
  }
  /* ---- 폭주로 ---- */
  buildRunaway(dx0, dx1, rng) {
    const cx = (dx0 + dx1) >> 1;
    const y0 = SY(306), h = 54, w = 86, x0 = cx - (w >> 1);
    this.runaway = { x0, y0, w, h, cx };

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.SLAGSTEEL, floor: T.STEELPLATE, bg: 2,
      rng, depth: 4, minW: 13, minH: 10
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    // 공창 바닥에서 폭주로까지 뚫린 수직 통로
    const wk = this.works;
    const sy = wk ? wk.y0 + wk.h : y0 - 20;
    for (let y = sy; y <= y0 + 1; y++) {
      for (let dx = -2; dx <= 2; dx++) { this.set(cx + dx, y, T.AIR); this.setWall(cx + dx, y, 2); }
      if (y % 4 === 0) { this.set(cx - 2, y, T.PLATFORM); this.set(cx + 2, y, T.PLATFORM); }
    }

    const boss = rooms[0], bfy = boss.y + boss.h - 3;
    this.objects.push({ type: 'lair', boss: 'proliferator', ruin: 10, nm: '증식체의 노심',
      x: (boss.x + (boss.w >> 1)) * TS, y: (bfy + 1) * TS - 48, w: 44, h: 48 });
    // 가장 깊은 방이 헤파의 격실 — 가장 큰 방(boss)과 같은 방이 되면 두 보스방이 같은 자리에 겹쳐 버린다(실측: 300개 시드 중 1개꼴).
    let deep = null;
    for (const r of rooms) if (r !== boss && (!deep || r.y > deep.y)) deep = r;
    if (!deep) deep = boss;   // 방이 하나뿐인 극단적 경우의 안전장치
    const dfy = deep.y + deep.h - 3;
    this.objects.push({ type: 'lair', boss: 'hepha', ruin: 11, nm: '헤파의 격실',
      x: (deep.x + (deep.w >> 1)) * TS, y: (dfy + 1) * TS - 52, w: 48, h: 52 });
    this.objects.push({ type: 'terminal', x: (deep.x + 3) * TS, y: (dfy) * TS - 40, w: 34, h: 40, term: 4 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.set(x, r.y + 2, T.CONDUIT);
      // 노심 유리 — 방 안은 파여 있으므로 벽(테두리)에 박아 넣는다
      for (let k = 0; k < rng.int(3, 7); k++) {
        const onSide = rng.chance(0.5);
        const gx = onSide ? (rng.chance(0.5) ? r.x : r.x + r.w - 1) : r.x + rng.int(1, Math.max(1, r.w - 2));
        const gy2 = onSide ? r.y + rng.int(1, Math.max(1, r.h - 2)) : (rng.chance(0.5) ? r.y : r.y + r.h - 1);
        if (this.get(gx, gy2) === T.SLAGSTEEL) this.set(gx, gy2, T.COREGLASS);
      }
      if (r === boss || r === deep) continue;
      // 기계식 함정 — 이 층은 기계가 지었다
      if (rng.chance(0.8) && window.Factory) {
        const left = rng.chance(0.5), tx = left ? r.x + 1 : r.x + r.w - 2;
        if (Factory.canPlace(this, tx, fy)) Factory.place(this, tx, fy, rng.pick(['dart', 'flamejet', 'frostjet']), left ? 0 : 2, 1);
      }
      if (rng.chance(0.5) && window.Factory) {
        const tx2 = r.x + rng.int(3, Math.max(3, r.w - 4));
        if (Factory.canPlace(this, tx2, fy)) Factory.place(this, tx2, fy, 'trap', 0, 1);
      }
      if (rng.chance(0.6))
        // 세션 2 폭주로의 상자는 일반 유적 너프를 받지 않는 고보상 프로필이다.
        this.objects.push({ type: 'chest', tier: 5, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
    this.objects.push({ type: 'terminal', x: (boss.x + 3) * TS, y: (bfy) * TS - 40, w: 34, h: 40, term: 3 });
  }
  inRunaway(tx, ty) {
    const k = this.runaway;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  }

  /* ---- 설계실 (세션 2 종장) ---- */
  buildAtelier(rng) {
    const rw = this.runaway;
    if (!rw) return;
    const w = 66, h = 40;
    const x0 = rw.x0 + rw.w + 10, y0 = rw.y0 + 6;
    if (x0 + w >= WW - 8) return;
    this.atelier = { x0, y0, w, h, cx: x0 + (w >> 1) };

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.ARCHESTONE, floor: T.ARCHESTONE, bg: 6,
      rng, depth: 4, minW: 12, minH: 9, shapes: ['rect', 'rect', 'octagon', 'round']
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    // 폭주로 오른쪽 벽 ↔ 설계실 왼쪽 벽을 잇는 수평 통로.
    const ty = y0 + 4;
    const gx0 = rw.x0 + rw.w, gx1 = x0;
    for (let x = gx0; x <= gx1; x++)
      for (let dy = -1; dy <= 1; dy++) { this.set(x, ty + dy, T.AIR); this.setWall(x, ty + dy, 6); }
    const sealX = gx0 + 3;
    for (let dy = -1; dy <= 1; dy++) { this.set(sealX, ty + dy, T.ARCHSEAL); this.set(sealX + 1, ty + dy, T.ARCHSEAL); }
    this.atelier.sealX = sealX; this.atelier.sealY = ty;
    this.objects.push({ type: 'seal', gate: 'atelier', key: 'atelier_key',
      x: sealX * TS, y: (ty - 1) * TS, w: 44, h: 66 });

    // 가장 안쪽(오른쪽) 방이 원형의 자리 — 유일하게 비어 있던 받침대
    let last = rooms[0];
    for (const r of rooms) if (r.x > last.x) last = r;
    const lfy = last.y + last.h - 3;
    // ruin:15 — 12는 이미 관리자 격실(overseer)이 쓰고 있다.
    this.objects.push({ type: 'lair', boss: 'archetype', ruin: 15, nm: '비어 있는 받침대',
      x: (last.x + (last.w >> 1)) * TS, y: (lfy + 1) * TS - 56, w: 48, h: 56 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      // 벽에 박힌 도면판 — 이 구역의 유일한 광원이자 채집 대상
      for (let k = 0; k < rng.int(4, 9); k++) {
        const onSide = rng.chance(0.5);
        const gx = onSide ? (rng.chance(0.5) ? r.x : r.x + r.w - 1) : r.x + rng.int(1, Math.max(1, r.w - 2));
        const gy = onSide ? r.y + rng.int(1, Math.max(1, r.h - 2)) : (rng.chance(0.5) ? r.y : r.y + r.h - 1);
        if (this.get(gx, gy) === T.ARCHESTONE) this.set(gx, gy, T.DRAFTGLASS);
      }
      if (r === last) continue;
      // 조립되다 만 것들이 줄지어 선 자리 — 받침대만 남기고 비워 둔다
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 5) this.set(x, fy + 1, T.ARCHESTONE);
      if (rng.chance(0.55) && window.Factory) {
        const left = rng.chance(0.5), tx2 = left ? r.x + 1 : r.x + r.w - 2;
        if (Factory.canPlace(this, tx2, fy)) Factory.place(this, tx2, fy, rng.pick(['dart', 'flamejet']), left ? 0 : 2, 1);
      }
      if (rng.chance(0.55))
        this.objects.push({ type: 'chest', tier: 6, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
  }
  inAtelier(tx, ty) {
    const k = this.atelier;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  }

  /* ---- 특별 유적 ① 부유 성채 (하늘) ---- */
  buildCitadel(rng) {
    const w = 74, h = 30;
    const x0 = SX(3300 + SHIFT), y0 = 4;         // 버섯 골짜기 위 하늘 (세션 2 바이옴 상공)
    this.citadel = { x0, y0, w, h, cx: x0 + (w >> 1) };

    // 성채 바닥판 — 통째로 떠 있는 판이라 아래가 완전히 뚫려 있다
    for (let x = x0 - 2; x <= x0 + w + 2; x++)
      for (let y = y0 + h - 3; y <= y0 + h; y++) this.set(x, y, T.ORBITPLATE);

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.ORBITPLATE, floor: T.ORBITPLATE, bg: 9,
      rng, depth: 4, minW: 12, minH: 8, shapes: ['rect', 'octagon', 'round']
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    /* 진입 다리 — 성채는 통째로 떠 있는 판이라 그냥 두면 들어갈 방법이 제트팩뿐이다. */
    {
      // 왼쪽 첫 방의 바닥 높이에 맞춰 문을 낸다
      let leftRoom = rooms[0];
      for (const r of rooms) if (r.x < leftRoom.x) leftRoom = r;
      const doorY = leftRoom.y + leftRoom.h - 3;
      for (let dy = -2; dy <= 0; dy++)
        for (let x = x0 - 1; x <= leftRoom.x + 1; x++) { this.set(x, doorY + dy, T.AIR); this.setWall(x, doorY + dy, 9); }
      // 다리 — 왼쪽으로 뻗어 나가며, 끝에서 가장 가까운 하늘 섬 높이로 계단처럼 내려간다
      let by = doorY + 1, bx = x0 - 2;
      for (let k = 0; k < 46 && bx > 6; k++, bx--) {
        this.set(bx, by, T.ORBITPLATE);
        for (let dy = -3; dy <= -1; dy++) this.set(bx, by + dy, T.AIR);
        if (k % 6 === 5 && by < SKY_Y - 4) by++;      // 하늘 섬 높이까지 서서히 내려온다
        if (k % 9 === 4) this.set(bx, by - 1, T.TORCH);
      }
      this.citadel.bridgeX = bx;
    }

    // 가장 넓은 방이 환원기의 자리.
    const main = rooms[0], mfy = main.y + main.h - 3;
    for (let x = main.x + 2; x < main.x + main.w - 2; x++)
      for (let y = mfy + 1; y <= mfy + 2; y++) this.set(x, y, T.ALTARSTONE);
    this.objects.push({ type: 'lair', boss: 'restorer', ruin: 13, nm: '환원 기관',
      x: (main.x + (main.w >> 1)) * TS, y: (mfy + 1) * TS - 60, w: 52, h: 60 });
    this.objects.push({ type: 'lorestone', lore: 'citadel',
      x: (main.x + 3) * TS, y: (mfy + 1) * TS - 34, w: 26, h: 34 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      // 궤도핵 — 벽에 박힌 광맥이자 이 구역의 광원
      for (let k = 0; k < rng.int(5, 11); k++) {
        const onSide = rng.chance(0.5);
        const gx = onSide ? (rng.chance(0.5) ? r.x : r.x + r.w - 1) : r.x + rng.int(1, Math.max(1, r.w - 2));
        const gy = onSide ? r.y + rng.int(1, Math.max(1, r.h - 2)) : (rng.chance(0.5) ? r.y : r.y + r.h - 1);
        if (this.get(gx, gy) === T.ORBITPLATE) this.set(gx, gy, T.ORBITCORE);
      }
      if (r === main) continue;
      if (rng.chance(0.7)) this.putTileTrap(r, fy, rng.pick(['dart', 'vent']), rng);
      if (rng.chance(0.45)) for (let k = 0; k < rng.int(2, 5); k++) this.set(r.x + 3 + k, fy, T.SPIKE);
      if (rng.chance(0.6))
        this.objects.push({ type: 'chest', tier: 6, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
  }
  inCitadel(tx, ty) {
    const k = this.citadel;
    return !!k && tx >= k.x0 - 2 && tx <= k.x0 + k.w + 2 && ty >= k.y0 - 1 && ty <= k.y0 + k.h + 1;
  }

  /* ---- 특별 유적 ② 무너진 갱 (최심부) ---- */
  buildDeepShaft(rng) {
    const w = 70, h = 34;
    const x0 = SX(640 + SHIFT), y0 = WORLD_BOT - 46;     // 잿빛 숲 최하부 — 지옥 바닥 아래
    this.deepShaft = { x0, y0, w, h, cx: x0 + (w >> 1) };

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.DEEPROCK, floor: T.DEEPROCK, bg: 4,
      rng, depth: 4, minW: 12, minH: 8, shapes: ['rect', 'rect', 'pillars']
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    // 지옥에서 내려오는 수직 갱도 — 무너진 버팀목이 드문드문 남아 있다
    const ex = x0 + (w >> 1);
    for (let y = HELL_Y + 10; y <= y0 + 1; y++) {
      for (let dx = -2; dx <= 2; dx++) this.set(ex + dx, y, T.AIR);
      this.setWall(ex, y, 4);
      if (y % 5 === 0) { this.set(ex - 2, y, T.MINEWOOD); this.set(ex + 2, y, T.MINEWOOD); }
      if (y % 7 === 0) this.set(ex, y, T.PLATFORM);
    }

    const main = rooms[0], mfy = main.y + main.h - 3;
    this.objects.push({ type: 'lair', boss: 'shaft_maw', ruin: 14, nm: '메워진 막장',
      x: (main.x + (main.w >> 1)) * TS, y: (mfy + 1) * TS - 52, w: 48, h: 52 });
    this.objects.push({ type: 'lorestone', lore: 'shaft',
      x: (main.x + 3) * TS, y: (mfy + 1) * TS - 34, w: 26, h: 34 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      // 남은 버팀목과 안전등
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 7) this.set(x, r.y + 2, T.MINEWOOD);
      if (rng.chance(0.5)) this.set(r.x + 2, fy, T.TORCH);
      // 유독 가스 — 바닥에 고인다.
      if (rng.chance(0.55)) {
        const gx = r.x + rng.int(2, Math.max(2, r.w - 6));
        for (let k = 0; k < rng.int(3, 7); k++)
          if (this.get(gx + k, fy) === T.AIR) this.set(gx + k, fy, T.BLACKDAMP);
      }
      if (r === main) continue;
      if (rng.chance(0.75)) this.putTileTrap(r, fy, rng.pick(['dart', 'crumble']), rng);
      if (rng.chance(0.5)) for (let k = 0; k < rng.int(2, 5); k++) this.set(r.x + 4 + k, fy, T.SPIKE);
      if (rng.chance(0.62))
        this.objects.push({ type: 'chest', tier: 6, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
  }
  inDeepShaft(tx, ty) {
    const k = this.deepShaft;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  }

  inWorks(tx, ty) {
    const k = this.works;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  }

  /** 종장 완료 시 1회. */
  /** 배치표 한 줄을 실제 오브젝트로 만든다. */
  dawnPlace(tx, slotW, spec, gy, label) {
    const o = Object.assign({}, spec, {
      x: tx * TS + Math.round((slotW * TS - spec.w) / 2),
      y: gy * TS - spec.h
    });
    o.tx0 = tx; o.tx1 = tx + slotW - 1; o.slotKey = label || spec.type;
    return o;
  }

  /** 놓기 직전 겹침 검사. */
  checkDawnLayout(items, gy, plaza) {
    const bad = [];
    const sorted = items.slice().sort((a, b) => a.tx0 - b.tx0);
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      if (b.tx0 <= a.tx1) bad.push(`겹침: ${a.slotKey}(${a.tx0}~${a.tx1}) ↔ ${b.slotKey}(${b.tx0}~${b.tx1})`);
    }
    for (const o of items) {
      // 분수대만은 제 물받이(solid) 위에 서는 게 정상이다
      if (o.slotKey === 'fountain') continue;
      for (let x = o.tx0; x <= o.tx1; x++)
        if (this.solid(x, gy - 1)) bad.push(`막힌 칸 위: ${o.slotKey}가 ${x}칸(벽/기둥) 위에 있음`);
    }
    if (plaza) for (const o of items)
      if (o.plaza && (o.tx0 < plaza[0] || o.tx1 > plaza[1]))
        bad.push(`광장 밖으로 삐져나감: ${o.slotKey}(${o.tx0}~${o.tx1}) vs 광장 ${plaza[0]}~${plaza[1]}`);
    if (bad.length) console.warn('[여명 마을 배치 문제]\n' + bad.join('\n'));
    return bad;
  }

  restoreDawnCity() {
    const d = this.dawnCity;
    if (!d || d.restored) return false;
    d.restored = 1;
    const { x0, x1, gy, blocks } = d;
    const cx = (x0 + x1) >> 1;
    const items = [];

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i], spec = DAWN_BUILDINGS[i], by = gy - b.h;
      // 무너진 벽을 메우고 벽지를 밝은 금빛으로
      for (let x = b.x; x < b.x + b.w; x++)
        for (let y = by; y < gy; y++) {
          if (x === b.x || x === b.x + b.w - 1 || y === by) this.set(x, y, T.RUINBRICK);
          this.setWall(x, y, 8);
        }
      this.set(b.x + 2, by + 2, T.TORCH);              // 창가 등불
      this.set(b.x + b.w - 3, by + 2, T.TORCH);
      // 출입구 — 양쪽 벽을 뚫고 여닫이 문을 단다.
      const rx = b.x + b.w - 1;
      this.set(b.x, gy - 1, T.AIR); this.set(b.x, gy - 2, T.AIR);
      this.set(rx, gy - 1, T.AIR); this.set(rx, gy - 2, T.AIR);
      this.pushDoor(b.x * TS, (gy - 2) * TS, TS, TS * 2, -1);
      this.pushDoor(rx * TS, (gy - 2) * TS, TS, TS * 2, 1);
      // 실내 — 배치표(DAWN_INSIDE)대로.
      items.push(this.dawnPlace(b.x + DAWN_INSIDE.shelf, 2, DAWN_OBJ.shelf, gy, `shelf${i}`));
      items.push(this.dawnPlace(b.x + DAWN_INSIDE.npc, 1,
        Object.assign({}, DAWN_OBJ.npcBase, { npc: spec.npc }), gy, spec.npc));
      if (spec.fac) items.push(this.dawnPlace(b.x + DAWN_INSIDE.fac, 2, DAWN_OBJ[spec.fac], gy, spec.fac));
      items.push(this.dawnPlace(b.x + DAWN_INSIDE.table, 2, DAWN_OBJ.table, gy, `table${i}`));
    }

    // 광장 — 배치표(DAWN_PLAZA)대로 왼쪽부터
    const plaza = this.dawnPlazaSpan();
    for (const slot of DAWN_PLAZA) {
      const o = this.dawnPlace(cx + slot.off, slot.w, DAWN_OBJ[slot.id], gy, slot.id);
      o.plaza = 1;
      items.push(o);
    }

    this.checkDawnLayout(items, gy, plaza);
    for (const o of items) this.objects.push(o);

    /* 대로 가로등 — 물건이 선 칸은 건너뛰고 빈자리에만 세운다. */
    const taken = new Set();
    for (const o of items) for (let x = o.tx0; x <= o.tx1; x++) taken.add(x);
    for (const b of blocks) { taken.add(b.x); taken.add(b.x + b.w - 1); }
    for (let x = x0 - 4; x < x1 + 4; x += 9) {
      let t = x;
      while (t < x + 5 && (taken.has(t) || this.solid(t, gy - 1))) t++;
      if (!taken.has(t) && !this.solid(t, gy - 1)) this.set(t, gy - 1, T.TORCH);
    }
    d.lv = 1;
    this.placeMerchants(1);
    return true;
  }

  /* ---- 마을 개선 ---- */
  /* 떠돌이 상인 배치 — MERCHANTS 표가 자리를 들고 있다(1·3·4단계에 하나씩). */
  placeMerchants(lv) {
    const d = this.dawnCity; if (!d) return;
    const { gy, blocks } = d, cx = (d.x0 + d.x1) >> 1;
    const ns = DAWN_OBJ.npcBase;
    for (const m of MERCHANTS) {
      if (!m.spot) continue;              // 마을 밖 상인(윤슬)은 제 자리에서 따로 놓인다
      if (m.lv > lv) continue;
      if (this.objects.some(o => o.type === 'npc' && o.npc === m.npc)) continue;
      let tx, fy;
      if (m.spot.kind === 'plaza') {
        tx = cx + m.spot.off; fy = gy;              // 광장 좌판 — 길바닥에 선다
      } else {
        const b = blocks[m.spot.block]; if (!b) continue;
        tx = b.x + m.spot.off; fy = gy - b.h;       // 2층 바닥 줄
      }
      this.objects.push({ type: 'npc', npc: m.npc, x: tx * TS, y: fy * TS - ns.h, w: ns.w, h: ns.h });
    }
  }
  upgradeVillage(lv) {
    const d = this.dawnCity;
    if (!d || !d.restored || (d.lv || 1) >= lv) return false;
    d.lv = lv;
    const { x0, x1, gy, blocks } = d;
    const cx = (x0 + x1) >> 1;
    const rng = new RNG(this.seed + '_v' + lv);
    const P = (o) => this.objects.push(o);
    const mach = (tx, ty, key, dir) => {
      if (window.Factory && Factory.canPlace(this, tx, ty)) Factory.place(this, tx, ty, key, dir || 0, 1);
    };

    if (lv === 2) {
      /* --- 2층 증축 + 기와지붕 --- */
      for (const b of blocks) {
        const by = gy - b.h, ny = by - 6;          // 새 지붕 줄
        // 그 두 칸까지 같이 비우지 않으면 2층을 올린 뒤 허공에 조각이 남는다
        for (let x = b.x - 2; x <= b.x + b.w + 1; x++)
          for (let y = ny; y < by; y++) this.set(x, y, T.AIR);
        for (let x = b.x; x < b.x + b.w; x++) {
          for (let y = ny + 1; y < by; y++) this.setWall(x, y, 8);
          // 옛 지붕 줄은 2층 바닥이 된다.
          this.set(x, by, T.PLATFORM);
        }
        for (let y = ny + 1; y < by; y++) {        // 2층 벽
          this.set(b.x, y, T.TIMBERWALL);
          this.set(b.x + b.w - 1, y, T.TIMBERWALL);
        }
        /* 2층 바닥 줄(by)의 양 끝은 벽으로 되돌린다 — 위아래가 다 벽인데 이 한 줄만 발판이면 건물 옆면에 1칸 구멍이 뚫려 보인다. */
        this.set(b.x, by, T.TIMBERWALL);
        this.set(b.x + b.w - 1, by, T.TIMBERWALL);
        for (let x = b.x - 1; x <= b.x + b.w; x++) this.set(x, ny, T.ROOFTILE);
        /* 창문 — 1층·2층 양쪽 벽에. */
        for (const wx of [b.x, b.x + b.w - 1]) {
          this.set(wx, gy - 4, T.WINDOW);
          this.set(wx, gy - 5, T.WINDOW);
          this.set(wx, ny + 3, T.WINDOW);
        }
        this.set(b.x + 3, ny + 2, T.TORCH);
        this.set(b.x + b.w - 4, ny + 2, T.TORCH);
        // 발판 사다리 — 1층 바닥(gy)에서 2층 바닥(by)까지가 최소 10칸이라 그냥은 못 뛰어 오른다(1단 점프 최대 높이 ≈4.4칸).
        const stairX = b.x + 8;
        for (let y = gy - 4; y > by; y -= 4) this.set(stairX, y, T.PLATFORM);
        // 2층에 아무것도 없으면 그냥 빈 상자라 올라갈 이유가 없다 — 책장을 하나 놓는다 (사다리와 반대편 벽 쪽, 창문·횃불과 안 겹치는 자리)
        const shS = DAWN_OBJ.shelf;
        P({ type: 'furniture', kind: 'shelf', x: (b.x + b.w - 5) * TS - shS.w, y: by * TS - shS.h, w: shS.w, h: shS.h });
      }

      /* --- 대로 횃불을 가로등으로 --- */
      for (let x = x0 - 6; x < x1 + 6; x++)
        if (this.get(x, gy - 1) === T.TORCH) this.set(x, gy - 1, T.LAMPPOST);

      /* --- 마을 서쪽에 밭 자리 --- */
      const fx0 = x0 - 11, fx1 = x0 - 3;
      d.farm = { x0: fx0, x1: fx1, y: gy };
      for (let x = fx0 - 1; x <= fx1 + 1; x++) {
        for (let y = gy - 5; y < gy; y++) this.set(x, y, T.AIR);
        // 밭 자리는 갈지 않은 흙 그대로 둔다 — 괭이를 대면 그때 경작지가 된다
        this.set(x, gy, x < fx0 || x > fx1 ? T.PLANK : T.DIRT);
      }
      this.set(fx0 - 1, gy - 1, T.FENCE); this.set(fx1 + 1, gy - 1, T.FENCE);
      /* 건초더미는 밭 왼쪽 울타리 바깥 — fx1+2 는 전주 선로가 내려오는 기둥 줄이라 전주 밑동에 건초가 박혀 보였다(경비병 초소 fx0-2 와도 안 겹치게 한 칸 더 왼쪽). */
      this.set(fx0 - 3, gy - 1, T.HAYBALE);
      /* 괭이·낫·씨앗 한 벌은 밭 위 상자가 아니라 마을이 2단계가 될 때 가방으로 준다(data.js FARM_KIT). */

      /* --- 지붕 위 풍차 + 마을 전주 선로 --- */
      const rb = blocks[0], ry = gy - rb.h - 7;
      mach(rb.x + 8, ry, 'windmill');
      /* 전주는 1칸짜리 기계라 지붕 없는 자리(길·밭 위)에서는 공중에 뜬 것처럼 보인다. */
      const poles = [
        [rb.x + 12, ry], [x0 + 5, ry],          // 지붕 위
        [x0 - 1, gy - 13], [x0 - 1, gy - 5],    // 서쪽 벽을 타고 내려온다
        [x0 - 8, gy - 4]                        // 밭을 가로지른다 (기둥을 세워 받친다)
      ];
      // 기계를 먼저 다 놓는다 — 기둥을 세우고 나면 그 칸이 막혀 canPlace가 실패한다
      for (const [px, py] of poles) mach(px, py, 'pole');
      /* 기둥(전주 아래 몸통)은 타일로 깔지 않는다 — 사연: docs/code-history.md#h109 */
      return true;
    }

    if (lv === 3) {
      /* --- 성벽 + 문루 --- */
      const wxL = x0 + DAWN_WALL.leftOff, wxR = x1 + DAWN_WALL.rightOff;
      // 성벽이 집을 물지 않는지 확인한다 — 건물을 옮기면 여기부터 어긋나기 때문에 조용히 겹치게 두지 않고 콘솔에 찍는다(문루가 성문 위 3칸 폭이라 ±1까지 본다)
      for (const wx of [wxL, wxR])
        for (const b of blocks)
          if (wx + 1 >= b.x && wx - 1 <= b.x + b.w - 1)
            console.warn(`[여명 마을 배치 문제] 성벽(${wx})이 건물(${b.x}~${b.x + b.w - 1})과 겹침`);
      d.towers = []; d.posts = [];
      for (const [wx, inward] of [[wxL, 1], [wxR, -1]]) {
        /* 성벽 자리의 나무를 먼저 걷어낸다 — 나무는 세계 생성 때 서 있고 성벽은 한참 뒤에 올라오므로, 안 걷으면 기둥과 잎이 성벽·문루를 뚫고 나온다. */
        for (let x = wx - 4; x <= wx + 4; x++)
          for (let y = gy - 17; y <= gy + 2; y++) {
            const t = TILE_DEF[this.get(x, y)];
            if (t && (t.tree || t.leaf)) this.set(x, y, T.AIR);
          }
        for (let y = gy + 2; y > gy - 11; y--) this.set(wx, y, T.WALLSTONE);
        this.set(wx, gy - 11, T.BATTLEMENT);
        this.set(wx, gy - 12, T.BATTLEMENT);
        // 문루 — 성문 위쪽만 3칸 폭으로
        for (let x = wx - 1; x <= wx + 1; x++) {
          for (let y = gy - 5; y > gy - 14; y--) this.set(x, y, T.WALLSTONE);
          this.set(x, gy - 14, T.BATTLEMENT);
        }
        /* 성벽 배경(벽 레이어) — 안 깔면 성문을 뚫은 칸 너머로 하늘이 그대로 보여 문루가 허공에 얹힌 것처럼 위태로워 보인다. */
        for (let x = wx - 1; x <= wx + 1; x++)
          for (let y = gy + 2; y > gy - 15; y--) this.setWall(x, y, 13);
        // 통로 — 문루 아래를 뚫고 여닫이 성문을 단다.
        for (let y = gy - 1; y > gy - 4; y--) this.set(wx, y, T.AIR);
        this.pushDoor(wx * TS, (gy - DAWN_WALL.gateH) * TS, TS, TS * DAWN_WALL.gateH, -inward, { gate: 1 });
        this.set(wx + inward, gy - 4, T.BANNER);
        /* 없앤다 — 사연: docs/code-history.md#h110 */
        mach(wx, gy - 15, 'turret');
        d.towers.push(wx);
        d.posts.push(wx + inward * 3);          // 경비병은 문 안쪽 길 위에 선다
      }
      // 광장에 깃발 — 배치표에서 비어 있는 칸에만 세운다(게시판·비석 위에 겹치지 않게)
      for (const bx of [cx - 4, cx + 6]) this.set(bx, gy - 3, T.BANNER);
      this.placeMerchants(3);
      return true;
    }

    if (lv === 4) {
      /* --- 교역지 --- */
      /* 밭 확장 — 서쪽만 늘리면 성벽(x0-16)이 코앞이라 3칸밖에 못 늘어난다(실측). */
      const f = d.farm;
      if (f) {
        const wLimit = x0 + DAWN_WALL.leftOff + 3;      // 울타리(nx0-1) 자리까지 세어 3칸
        const eLimit = blocks[0].x - 2;                 // 첫 집 앞 한 칸은 비워 둔다
        const nx0 = Math.max(f.x0 - 6, wLimit);
        const nx1 = Math.min(f.x1 + 6, eLimit);
        const till = (x) => {
          for (let y = gy - 5; y < gy; y++) this.set(x, y, T.AIR);
          this.set(x, gy, this.poleColumn(x, gy) ? T.DIRT : T.FARMLAND);
        };
        // 이미 갈려 있던 원래 밭에도 전주가 지나가면 되돌린다(2단계에서 전주가 선다)
        for (let x = f.x0; x <= f.x1; x++)
          if (this.get(x, gy) === T.FARMLAND && this.poleColumn(x, gy)) {
            this.set(x, gy, T.DIRT);
            this.crops.delete(this.i(x, gy - 1));
            if (TILE_DEF[this.get(x, gy - 1)].crop) this.set(x, gy - 1, T.AIR);
          }
        for (let x = nx0; x < f.x0; x++) till(x);
        for (let x = f.x1 + 1; x <= nx1; x++) till(x);
        this.set(nx0 - 1, gy - 1, T.FENCE);
        this.set(nx1 + 1, gy - 1, T.FENCE);
        f.x0 = nx0; f.x1 = nx1;
      }
      /* 강화 모루 — **재련대 바로 옆.** — 사연: docs/code-history.md#h111 */
      if (!this.objects.some(o => o.type === 'anvil')) {
        const bi = DAWN_BUILDINGS.findIndex(sp => sp.fac === 'reforge');
        const rb = bi >= 0 ? blocks[bi] : null;
        if (rb) {
          const av = this.dawnPlace(rb.x + DAWN_INSIDE.anvil, 2, DAWN_OBJ.anvil, gy, 'anvil');
          // 겹침 검사 — 그 집 안에 이미 있는 것들과 실제로 부딪히는지 본다
          const hit = this.objects.find(o => o.w && aabb(av, o));
          if (hit) console.warn('강화 모루 자리 겹침:', hit.type);
          else P(av);
        }
      }
      this.placeMerchants(4);
      return true;
    }
    return false;
  }

  /* ---- 지하 묘실 ---- */
  buildDungeon(rng, n2) {
    // 묘실도 방 묶음으로.
    const cx = SX(2300 + SHIFT), cy = SY(240), w = 68, h = 38;   // 사막 지하
    const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.BRICK, floor: T.BRICK, bg: 6, rng, depth: 4, minW: 12, minH: 9
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));
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
  }

  /* ---- 하늘 섬 + 지상에서 올라가는 거대 나무 ---- */
  buildSkyIslands(rng, n1) {
    this.skyIslands = [];
    const N = Math.round(32 * WSX);     // 세계 폭에 맞춰 — 소형 32개
    /* 높이는 제 난수로 높·중·낮 세 층을 이웃과 다르게 고른다. ★ 본 난수의 cy 는 뽑기만 하고 버린다 —
       안 뽑으면 뒤따르는 유적·동굴이 씨앗마다 바뀐다(carveIsland·tree 가 뽑는 수는 높이와 무관하다). */
    const alt = new RNG(this.seed + '_skyalt');
    let last = -1;
    for (let i = 0; i < N; i++) {
      const cx = Math.round(((i + 0.5) / N) * WW + rng.range(-32, 32));
      if (inSeaZone(cx)) continue;                // 바다 위에는 하늘 섬을 띄우지 않는다
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
  }

  /** 폭풍 제단의 신전 — 유적은 아니지만 유적처럼: 박공지붕 · 벽돌 벽 · 양쪽 문 · 뒤로 선 기둥 · 위층 회랑 둘.
      ★ gx 칸 가운데를 축으로 좌우가 같다(제단이 반 칸 치우쳤던 적이 있다). 가운데 5칸은 거대 나무가 올라오는
      구멍이라 한쪽으로만 통하는 발판으로 덮는다 — 막으면 나무로는 신전에 못 들어온다. */
  buildSkyTemple(gx, gy) {
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
  }

  /** 잿빛 숲의 채취탑 자리를 골라 object(type 'rig')로 세운다 — 저장되므로 땅을 파도 자리가 옮겨 가지 않는다.
      ★ 자리 고르는 법은 예전 game.js rigs() 그대로다(바이옴 이름으로 묻는다 — 사연: docs/code-history.md#h51 · #h52).
      clear 면 발자국 안의 나무·풀을 걷는다 — 나무가 탑을 뚫고 자라 보였다. */
  placeRigs(clear) {
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
  }
  /** 우클릭 상자 = 그린 탑(다리·몸통·굴뚝)을 두른 사각형. 옛 세이브의 11×10칸 상자도 불러올 때 여기로 맞춘다. */
  fitRig(o) {
    o.x = (o.tx - RIG.half) * TS; o.y = (o.ty - RIG.stack) * TS;
    o.w = (RIG.half * 2 + 1) * TS; o.h = RIG.stack * TS;
    return o;
  }
  /** 둘레의 나무를 통째로(기둥이 ±6칸 안이면 수관까지 — 수관 반폭 5칸이 탑에 걸린다) 걷고, 발자국 안의 풀·꽃을 걷는다. */
  clearRigSite(tx, ty) {
    for (let x = tx - 6; x <= tx + 6; x++)
      for (let y = ty - 26; y < ty; y++) {
        const t = this.get(x, y), d = TILE_DEF[t];
        if (t === T.WOOD || d.leaf || d.tree || t === T.VINE || (this.inRig(x, y) && !d.solid && t !== T.AIR && !d.liquid))
          this.set(x, y, T.AIR);
      }
  }
  /** 채취탑이 그려진 칸인가 — 플레이어가 아무것도 못 놓는다(해체한 탑은 빼고). */
  inRig(x, y) {
    for (const o of this.objects) {
      if (o.type !== 'rig' || o.gone) continue;
      const dx = x - o.tx, up = o.ty - y;
      if (up < 1) continue;
      if ((Math.abs(dx) <= RIG.half && up <= RIG.tall) || (dx >= 0 && dx <= 1 && up <= RIG.stack)) return true;
    }
    return false;
  }

  /** 하늘 섬 높이 — 0 높은 층 · 1 가운데 · 2 낮은 층. 낮은 층 바닥(SKY_Y-8)은 이중 점프로 지상에서 못 닿게 둔 최소 높이다. */
  skyAlt(r, tier) {
    return tier === 0 ? r.int(SY(5), SY(10)) : tier === 1 ? r.int(SY(14), SY(21)) : r.int(SKY_Y - 13, SKY_Y - 8);
  }
  /** 섬 위 나무를 걷는다. */
  _skyStrip(x0, x1, cy) {
    for (let x = x0; x <= x1; x++) for (let y = 0; y < cy; y++) {
      const t = this.get(x, y);
      if (t === T.WOOD || t === T.SKYLEAF) this.set(x, y, T.AIR);
    }
  }

  /** 하늘 섬을 더 — 큰 섬 · 작은 섬 · 조각 섬, 그리고 상자 말고도 찾아갈 거리.
      ★ 제 난수(seed+'_sky')를 쓴다. 본 난수를 더 뽑으면 뒤따르는 유적·동굴·성채가 씨앗마다 통째로 바뀐다.
      찾아갈 거리가 있는 섬은 위로 13칸이 필요해 SY(14) 아래 두 층, 조각 섬은 SY(5) 까지 — 바닥은 SKY_Y-8 그대로. */
  buildSkyExtras() {
    const r = new RNG(this.seed + '_sky');
    const occ = [];
    const hit = (x0, y0, x1, y1) => occ.some(b => x0 < b[2] && b[0] < x1 && y0 < b[3] && b[1] < y1);
    for (const s of this.skyIslands) occ.push([s.x - s.w - 6, s.y - 14, s.x + s.w + 6, s.y + 14]);
    const g = this.skyGate; occ.push([g.x - 46, 0, g.x + 46, g.y + 16]);
    const cz = SX(3300 + SHIFT); occ.push([cz - 16, 0, cz + 74 + 16, 4 + 30 + 10]);   // 부유 성채(buildCitadel)
    const feat = () => r.chance(0.5) ? r.int(SY(14), SY(20)) : r.int(SKY_Y - 13, SKY_Y - 8);
    const place = (rw, rh, tries, band) => {
      for (let t = 0; t < tries; t++) {
        const cx = r.int(40 + rw, WW - 40 - rw), cy = band();
        if (inSeaZone(cx - rw) || inSeaZone(cx + rw)) continue;
        const box = [cx - rw - 5, cy - 13, cx + rw + 5, cy + rh + 6];
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
      const rw = r.int(3, 7), rh = r.int(2, 4), at = place(rw, rh, 30, () => r.int(SY(5), SKY_Y - 8));
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
  }

  /** 섬 윗면 한 자리를 비운다 — 섬마다 난 나무가 찾아갈 거리를 덮지 않게. */
  _skyClear(x0, x1, cy, up) {
    for (let x = x0; x <= x1; x++) for (let y = cy - up; y < cy; y++) this.set(x, y, T.AIR);
  }

  /** 큰 섬 속 굴 — 윗면 한쪽에 난 구멍으로 내려가면 에테르가 박힌 방과 상자. */
  skyGrotto(cx, cy, cw, rh, side, r) {
    const top = cy + 2, bot = cy + rh - 2, my = (top + bot) / 2, hh = Math.max(2, (bot - top) / 2 + 0.5);
    const floorOf = {};
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
  }

  /** 섬 윗면의 찾아갈 거리 하나 — 섬 표면이 cy 줄로 평평하다는 것(carveIsland)에 기댄다. */
  skyFeature(k, cx, cy, r, nextHint) {
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
  }

  carveIsland(cx, cy, rw, rh, rng) {
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
  }

  /* ================= 방이 여러 개인 던전 ================= */
  bspSplit(x, y, w, h, depth, minW, minH, rng, out) {
    const canH = h >= minH * 2 + 1, canV = w >= minW * 2 + 1;
    if (depth <= 0 || (!canH && !canV)) { out.push({ x, y, w, h }); return; }
    /* ★ 가로가 세로의 1.6배가 안 되면 가로로 잘라 납작하게 만든다. */
    const horiz = canH && (!canV || (h * 1.6 > w ? rng.chance(0.95) : rng.chance(0.15)));
    if (horiz) {
      const cut = rng.int(minH, h - minH - 1);
      this.bspSplit(x, y, w, cut, depth - 1, minW, minH, rng, out);
      this.bspSplit(x, y + cut, w, h - cut, depth - 1, minW, minH, rng, out);
    } else {
      const cut = rng.int(minW, w - minW - 1);
      this.bspSplit(x, y, cut, h, depth - 1, minW, minH, rng, out);
      this.bspSplit(x + cut, y, w - cut, h, depth - 1, minW, minH, rng, out);
    }
  }

  /** 두 방 사이 공유 벽에 통로를 뚫는다. */
  _linkRooms(a, b, floor) {
    const ax1 = a.x + a.w, ay1 = a.y + a.h, bx1 = b.x + b.w, by1 = b.y + b.h;
    /* ★ 옆으로 붙었는지 볼 때 겹치는 높이가 없으면 **돌려주지 말고 아래(위아래로 붙었나)로 넘어간다.** */
    const side = (ax1 === b.x || bx1 === a.x) &&
      Math.min(ay1, by1) - 2 >= Math.max(a.y, b.y) + 1;
    if (side) {                                              // 세로 벽을 공유
      const wx = ax1 === b.x ? ax1 - 1 : bx1 - 1;
      const y0 = Math.max(a.y, b.y) + 1, y1 = Math.min(ay1, by1) - 2;
      if (y1 < y0) return false;
      // 바닥에 붙여 뚫어야 걸어서 지나갈 수 있다
      const dy = y1;
      for (let k = 0; k < 2; k++) { this.set(wx, dy - k, T.AIR); this.set(wx + 1, dy - k, T.AIR); this.set(wx - 1, dy - k, T.AIR); }
      return true;
    }
    if (ay1 === b.y || by1 === a.y) {                       // 가로 벽을 공유 (위아래)
      const wy = ay1 === b.y ? ay1 - 1 : by1 - 1;
      /* ★ 오른쪽 끝을 **네 칸** 물린다. */
      const x0 = Math.max(a.x, b.x) + 2, x1 = Math.min(ax1, bx1) - 4;
      if (x1 < x0) return false;
      const dx = (x0 + x1) >> 1;
      for (let k = -1; k <= 1; k++) { this.set(dx + k, wy, T.AIR); this.set(dx + k, wy + 1, T.AIR); }
      /* ★ 윗방 **바닥 타일**(wy-1)도 뚫어 발판으로 바꾼다. */
      for (let k = -1; k <= 1; k++) this.set(dx + k, wy - 1, T.PLATFORM);
      // 위층으로 올라갈 발판 사다리
      for (let yy = wy + 1; yy < wy + 5 && yy < by1 + a.h; yy++) this.set(dx, yy, T.PLATFORM);
      this.set(dx, wy, T.PLATFORM);
      return true;
    }
    return false;
  }

  /** 방 묶음 던전을 짓고 방 목록을 돌려준다 */
  carveDungeon(cfg) {
    const { x0, y0, w, h, wall, floor, bg, rng } = cfg;
    const minW = cfg.minW || 11, minH = cfg.minH || 9;
    // 1) BSP로 방을 뽑는다
    const all = [];
    this.bspSplit(x0, y0, w, h, cfg.depth || 4, minW, minH, rng, all);
    /* 2) 도면(plan)이 있으면 그 칸에 든 방만 남긴다. */
    let leaves = all;
    const plan = cfg.plan && RUIN_PLANS[cfg.plan];
    /* 삼각형(plan 'tri' — 피라미드). */
    const tri = cfg.plan === 'tri';
    const inTri = (x, y) => y >= y0 && y < y0 + h &&
      Math.abs(x + 0.5 - (x0 + w / 2)) <= (y - y0 + 1) * (w / 2) / h;
    if (tri) {
      /* ★ 피라미드는 BSP 로 자르지 않고 **층**으로 쌓는다. */
      const rooms = [];
      const mid = x0 + w / 2;
      const top0 = y0 + 7;
      for (let by = top0; by + 8 <= y0 + h; by += 8) {
        const last = by + 16 > y0 + h;
        const bh = last ? Math.min(12, y0 + h - by) : 8;
        const half = Math.floor((by - y0) * (w / 2) / h) - 2;  // 이 층 **윗줄** 폭 — 가장 좁은 자리
        if (half < 5) continue;
        let xl = Math.ceil(mid - half), xr = Math.floor(mid + half);
        const row = [];
        if (last) {                                            // 왕의 방을 가운데에 먼저
          const kw = Math.min(22, xr - xl + 1);
          const kx = Math.round(mid - kw / 2);
          row.push({ x: kx, y: by, w: kw, h: bh });
          for (let x = kx - 1; x - 8 >= xl;) { const rw = Math.min(rng.int(9, 13), x - xl + 1); row.push({ x: x - rw + 1, y: by, w: rw, h: bh }); x -= rw; }
          for (let x = kx + kw; x + 8 <= xr;) { const rw = Math.min(rng.int(9, 13), xr - x + 1); row.push({ x, y: by, w: rw, h: bh }); x += rw; }
        } else {
          /* ★ 좁은 곁방과 넓은 전실이 섞여야 무덤의 방 배치로 읽힌다. */
          for (let x = xl; x + 6 <= xr;) {
            let rw = rng.chance(0.3) ? rng.int(14, 18) : rng.int(7, 10);
            if (xr - (x + rw) + 1 < 7) rw = xr - x + 1;       // 남는 폭이 방 하나가 안 되면 붙인다
            row.push({ x, y: by, w: rw, h: bh }); x += rw;
          }
        }
        for (const r of row)
          if (inTri(r.x - 1, r.y - 1) && inTri(r.x + r.w, r.y - 1) &&
              inTri(r.x - 1, r.y + r.h) && inTri(r.x + r.w, r.y + r.h)) rooms.push(r);
      }
      if (rooms.length >= 3) leaves = rooms;
    } else if (plan) {
      const rows = plan.length, cols = plan[0].length;
      const inPlan = r => {
        const cxr = clamp(Math.floor((r.x + r.w / 2 - x0) / w * cols), 0, cols - 1);
        const cyr = clamp(Math.floor((r.y + r.h / 2 - y0) / h * rows), 0, rows - 1);
        return plan[cyr][cxr] !== '.';
      };
      const kept = all.filter(inPlan);
      if (kept.length >= 3) leaves = kept;
    }
    /* 2.5) 방 수를 목표에 맞춘다 — 모자라면 **가장 넓은 방부터 한 번 더 자른다.** */
    const target = tri ? 0 : (cfg.target || 0);                // 피라미드는 층이 곧 방 수다
    if (target) {
      const splittable = r => r.h >= minH * 2 + 1 || r.w >= minW * 2 + 1;
      let guard = 0;
      while (leaves.length < target && guard++ < 400) {
        let best = null;
        for (const r of leaves)
          if (splittable(r) && (!best || r.w * r.h > best.w * best.h)) best = r;
        if (!best) break;
        const two = [];
        this.bspSplit(best.x, best.y, best.w, best.h, 1, minW, minH, rng, two);
        if (two.length < 2) break;
        leaves.splice(leaves.indexOf(best), 1, ...two);
      }
    }
    /* 2.6) 방 크기를 **눈에 띄게** 가른다 — 큰 홀 · 보통 방 · 골방. */
    if (target && rng) {
      const halls = Math.max(1, Math.round(leaves.length * 0.10));
      for (let k = 0; k < halls; k++) {
        const pairs = [];
        for (const a of leaves) for (const b of leaves)
          if (a !== b && !a.hall && !b.hall && !a.cell && !b.cell && a.y === b.y && a.h === b.h &&
              a.x + a.w === b.x && a.w + b.w <= 46) pairs.push([a, b]);
        if (!pairs.length) break;
        const [a, b] = rng.pick(pairs);
        leaves.splice(leaves.indexOf(b), 1);
        a.w += b.w; a.hall = 1;
      }
      const cw = Math.max(7, minW - 4);                 // 골방 가로(벽 포함) — 안쪽 다섯 칸
      /* 골방은 목표 방 수의 **바닥을 지키는** 몫도 한다 — 2.5) 가 최소 크기에 걸려 목표에 못 미치면(실측 d1 석판 2: 11/14) 모자란 만큼 더 가른다. */
      const cells = Math.max(Math.round(leaves.length * 0.22), target - leaves.length);
      for (let k = 0; k < cells || leaves.length < target; k++) {
        /* 세로로 가를 폭이 없으면 **가로로**, 위쪽에 낮은 다락(높이 6)을 떼어 낸다. */
        const cand = leaves.filter(r => !r.hall && !r.cell && (r.w >= cw + minW || r.h >= minH + 6));
        if (!cand.length) break;
        const r = rng.pick(cand);
        let a, b;
        if (r.w >= cw + minW) {
          const left = rng.chance(0.5);
          const cut = left ? cw : r.w - cw;
          a = { x: r.x, y: r.y, w: cut, h: r.h }; b = { x: r.x + cut, y: r.y, w: r.w - cut, h: r.h };
          (left ? a : b).cell = 1;
        } else {
          a = { x: r.x, y: r.y, w: r.w, h: 6 }; b = { x: r.x, y: r.y + 6, w: r.w, h: r.h - 6 };
          a.cell = 1;
        }
        leaves.splice(leaves.indexOf(r), 1, a, b);
      }
    }
    if (tri)                                                   // 삼각형 전체를 먼저 벽돌 덩어리로
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++)
          if (inTri(x, y) && this.get(x, y) !== T.BEDROCK) { this.set(x, y, wall); this.setWall(x, y, bg); }
    // 3) 남긴 방들의 자리만 벽으로 채운다 (테두리 한 칸 포함) — 사연: docs/code-history.md#h112
    for (const r of leaves)
      for (let x = r.x - 1; x <= r.x + r.w; x++)
        for (let y = r.y - 1; y <= r.y + r.h; y++) { this.set(x, y, wall); this.setWall(x, y, bg); }
    /* 4) 각 방 속을 판다 (테두리 1칸은 벽으로 남긴다). */
    // 피라미드는 네모와 기둥 홀만 — 둥근 방·팔각 방은 돌을 쌓은 무덤으로 안 읽힌다
    const shapes = cfg.shapes || (tri ? ['rect', 'rect', 'rect', 'pillars'] : ['rect', 'rect', 'round', 'octagon', 'pillars']);
    for (const r of leaves) {
      // 골방은 좁아서 둥글게 깎으면 걸을 자리가 없다 — 네모로만
      const shape = r.cell ? 'rect' : rng ? rng.pick(shapes) : 'rect';
      r.shape = shape;
      const x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
      const cx = (r.x + x1) / 2, cy = (r.y + y1) / 2;
      const rx = (r.w - 2) / 2, ry = (r.h - 2) / 2;
      const keepY = y1 - 3;                                  // 이 아래로는 무조건 통로
      for (let x = r.x + 1; x < x1; x++)
        for (let y = r.y + 1; y < y1; y++) {
          let open = true;
          if (y < keepY) {
            if (shape === 'round') {
              const dx = (x - cx) / rx, dy = (y - cy) / ry;
              open = dx * dx + dy * dy <= 1;                 // 타원
            } else if (shape === 'octagon') {
              // 모서리를 비스듬히 잘라 낸다
              const cut = Math.min(r.w, r.h) >> 2;
              const ex = Math.min(x - r.x, x1 - x), ey = Math.min(y - r.y, y1 - y);
              open = ex + ey > cut;
            } else if (shape === 'pillars') {
              // 일정 간격으로 기둥을 남긴다 (천장을 받치는 홀처럼)
              open = !((x - r.x) % 4 === 0 && y > r.y + 1);
            }
          }
          if (open) this.set(x, y, T.AIR);
        }
      for (let x = r.x + 1; x < x1; x++) this.set(x, y1 - 1, floor);
    }
    // 5) 맞닿은 방끼리 잇는다
    for (let i = 0; i < leaves.length; i++)
      for (let j = i + 1; j < leaves.length; j++) this._linkRooms(leaves[i], leaves[j], floor);
    /* 5.5) 피라미드 — 방마다 **아래층과 한 군데는 반드시** 잇는다. */
    if (tri) {
      for (const r of leaves) {
        let best = null, bo = 0;
        for (const q of leaves) {
          if (q.y !== r.y + r.h) continue;
          const o = Math.min(r.x + r.w, q.x + q.w) - Math.max(r.x, q.x);
          if (o > bo) { bo = o; best = q; }
        }
        if (!best || bo < 4) continue;
        const lo = Math.max(r.x, best.x) + 1, hi = Math.min(r.x + r.w, best.x + best.w) - 2;
        const bad = new Set([r.x, r.x + r.w - 2, r.x + r.w - 1, best.x, best.x + best.w - 2, best.x + best.w - 1]);
        const mid0 = (lo + hi) >> 1;
        let dx = -1;
        for (let d = 0; d <= hi - lo && dx < 0; d++)
          for (const c of [mid0 - d, mid0 + d]) if (c >= lo && c <= hi && !bad.has(c)) { dx = c; break; }
        if (dx < 0) continue;
        const walk = best.y + best.h - 3;                    // 아랫방 걷는 줄
        for (let y = r.y + r.h - 2; y <= walk - 2; y++) this.set(dx, y, T.PLATFORM);
      }
    }
    // 6) 그래도 못 들어가는 방이 남으면 직접 굴을 뚫는다.
    this._ensureConnected(x0, y0, w, h, leaves);
    return leaves;
  }

  /** 방 하나에서 걸어 닿을 수 있는 칸을 모아 온다 */
  _walkable(x0, y0, w, h, sx, sy) {
    const seen = new Set(), st = [[sx, sy]];
    seen.add(sy * WW + sx);
    while (st.length) {
      const [x, y] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < x0 - 1 || nx > x0 + w || ny < y0 - 1 || ny > y0 + h) continue;
        const k = ny * WW + nx;
        if (seen.has(k) || TILE_DEF[this.get(nx, ny)].solid === 1) continue;
        seen.add(k); st.push([nx, ny]);
      }
    }
    return seen;
  }

  /** 고립된 방마다 가장 가까운 이미 닿는 방까지 ㄱ자 굴을 판다 */
  _ensureConnected(x0, y0, w, h, rooms) {
    const spot = r => [r.x + 2, r.y + r.h - 3];
    let guard = 0;
    while (guard++ < rooms.length + 2) {
      const [bx, by] = spot(rooms[0]);
      const seen = this._walkable(x0, y0, w, h, bx, by);
      const lost = rooms.filter(r => { const [sx, sy] = spot(r); return !seen.has(sy * WW + sx); });
      if (!lost.length) return;
      // 닿는 방 중 가장 가까운 것과 잇는다
      const ok = rooms.filter(r => { const [sx, sy] = spot(r); return seen.has(sy * WW + sx); });
      const a = lost[0];
      let best = ok[0], bd = 1e9;
      for (const r of ok) {
        const d = Math.abs(r.x - a.x) + Math.abs(r.y - a.y);
        if (d < bd) { bd = d; best = r; }
      }
      const [ax, ay] = spot(a), [tx, ty] = spot(best);
      /* 잠긴 돌(암호석·봉인석)은 뚫지 않는다 — 뚫으면 자물쇠가 무의미해진다 */
      const lk = (x, y) => this.locked(x, y);
      const dig = (x, y) => { if (!lk(x, y)) this.set(x, y, T.AIR); };
      // 세로로 먼저 파고 (발판을 놓아 올라갈 수 있게) 가로로 잇는다
      const y1 = Math.min(ay, ty), y2 = Math.max(ay, ty);
      for (let y = y1; y <= y2; y++) {
        dig(ax, y); dig(ax, y - 1);
        if (y % 3 === 0 && !lk(ax, y)) this.set(ax, y, T.PLATFORM);
      }
      const xa = Math.min(ax, tx), xb = Math.max(ax, tx);
      for (let x = xa; x <= xb; x++) { dig(x, y1); dig(x, y1 - 1); }
    }
  }

  /* ---- 걸어서 닿는지 검사하고 고친다 ---- */

  /** 한 자리에서 뛰어서 닿는 "설 수 있는 칸"을 모아 온다 */
  /** 걸음 판정에 쓰는 칸 물음들. */
  _standFns() {
    const sup = (x, y) => { const s = TILE_DEF[this.get(x, y)].solid; return s === 1 || s === 2; };
    /* ★ 잠긴 돌(암호석·봉인석)은 **지나갈 수 있는 것으로** 본다 — 풀면 열리는 문이다 (tools/ruindiag.py 도 그렇게 잰다). */
    const free = (x, y) => TILE_DEF[this.get(x, y)].solid !== 1 || this.locked(x, y);
    const liq = (x, y) => !!TILE_DEF[this.get(x, y)].liquid;  // 물속에서는 뜬다 (Ent.move)
    const body = (x, y) => free(x, y) && free(x, y - 1);      // 키 두 칸이 들어가는가
    const stand = (x, y) => body(x, y) && (sup(x, y + 1) || liq(x, y));
    return { free, body, stand };
  }
  /** (sx, sy) 에 떨어뜨린 몸이 처음 발을 딛는 칸 — 없으면 null */
  _standSeed(box, f, sx, sy) {
    for (let cy = sy; cy <= box[3]; cy++) {
      if (!f.body(sx, cy)) break;
      if (f.stand(sx, cy)) return [sx, cy];
    }
    for (let k = 1; k <= 6; k++) if (f.stand(sx, sy - k)) return [sx, sy - k];
    return null;
  }
  /** (x, y) 에 선 몸이 **한 번에** 옮겨 설 수 있는 칸마다 push(nx, ny) — 떨어지기 · 제자리 점프 · 옆으로 한 번에 네 칸까지 뛰어 떨어지기 · 발판 뚫고 내려가기. */
  _standNext(box, f, x, y, push) {
    const JUMP = 3, RUN = 4;                                  // 오를 수 있는 높이 · 한 번에 나는 폭
    const drop = (x, y) => {                                  // 발이 닿을 때까지 떨어진다
      for (let cy = y; cy <= box[3]; cy++) {
        if (!f.body(x, cy)) return;
        if (f.stand(x, cy)) { push(x, cy); return; }
      }
    };
    if (TILE_DEF[this.get(x, y + 1)].solid === 2) drop(x, y + 2);   // 발판을 뚫고 내려간다
    for (let h = 0; h <= JUMP; h++) {
      const yh = y - h;
      if (yh <= box[1]) break;
      if (h > 0 && !f.free(x, yh - 1)) break;                 // 머리가 천장에 막힌다
      if (h > 0 && f.stand(x, yh)) push(x, yh);               // 제자리 점프로 발판에 올라선다
      for (const dx of [-1, 1]) for (let s = 1; s <= RUN; s++) {
        const nx = x + dx * s;
        if (nx < box[0] || nx > box[2] || !f.body(nx, yh)) break;
        drop(nx, yh);
      }
    }
  }
  /** (sx, sy) 에서 걸어서(뛰고 떨어지며) 닿는 설 자리 전부. */
  _standSet(box, sx, sy) {
    const f = this._standFns();
    const seen = new BoxSet(box, 10), st = [];
    const push = (x, y) => { const k = y * WW + x; if (!seen.has(k)) { seen.add(k); st.push(x, y); } };
    const s0 = this._standSeed(box, f, sx, sy);
    if (s0) push(s0[0], s0[1]);
    let guard = 0;
    while (st.length && guard++ < 200000) {
      const y = st.pop(), x = st.pop();
      this._standNext(box, f, x, y, push);
    }
    return seen;
  }
  /** 거꾸로 걷기 — 상자 안 설 자리 가운데 **rootK 까지 걸어 닿을 수 있는** 칸 전부 — 사연: docs/code-history.md#h113 */
  _returnSet(box, rootK) {
    const f = this._standFns();
    const preds = new Map();
    for (let y = box[1] - 8; y <= box[3]; y++)
      for (let x = box[0]; x <= box[2]; x++) {
        if (!f.stand(x, y)) continue;
        const k = y * WW + x;
        this._standNext(box, f, x, y, (nx, ny) => {
          const nk = ny * WW + nx;
          let a = preds.get(nk);
          if (!a) preds.set(nk, a = []);
          a.push(k);
        });
      }
    const R = new BoxSet(box, 10), st = [rootK];
    R.add(rootK);
    while (st.length) {
      const a = preds.get(st.pop());
      if (a) for (const p of a) if (!R.has(p)) { R.add(p); st.push(p); }
    }
    return R;
  }

  /** 두 자리를 걸어 다닐 수 있게 잇는다 — 가로 굴을 내고 세로로 발판 사다리를 세운다 */
  _digStair(ax, ay, tx, ty, floor, box, traps, rng) {
    const yT = Math.min(ay, ty), yB = Math.max(ay, ty);
    const c = clamp(tx, box[0] + 1, box[2] - 2);
    /* ★ 이미 놓인 발판은 절대 지우지 않는다. */
    /* 발판은 지우지 않고, **잠긴 돌(암호석·봉인석)도 건드리지 않는다.** */
    const locked = (x, y) => this.locked(x, y);
    const bore = (x, y) => {
      if (locked(x, y) || TILE_DEF[this.get(x, y)].solid === 2) return;
      this.set(x, y, T.AIR);
    };
    // ① a 자리 높이에서 t 자리 열까지 가로 굴.
    const rx0 = clamp(Math.min(ax, c) - 1, box[0], box[2]);
    const rx1 = clamp(Math.max(ax, c) + 2, box[0], box[2]);
    for (let x = rx0; x <= rx1; x++) {
      for (let k = 0; k < 3; k++) bore(x, ay - k);
      const s = TILE_DEF[this.get(x, ay + 1)].solid;
      if (s === 0 && !locked(x, ay + 1)) this.set(x, ay + 1, floor);   // 발판(2)이면 그대로 둔다
    }
    // ② t 자리 열에서 위아래를 잇는 두 칸 폭 수직굴.
    const plat = (x, y) => { if (!locked(x, y)) this.set(x, y, T.PLATFORM); };
    for (let y = yT - 2; y <= yB; y++) { bore(c, y); bore(c + 1, y); }
    for (let y = yB - 2; y > yT; y -= 3) { plat(c, y); plat(c + 1, y); }
    if (yB - yT >= 2) { plat(c, yT + 1); plat(c + 1, yT + 1); }
    if (TILE_DEF[this.get(c, yB + 1)].solid === 0 && !locked(c, yB + 1)) {
      this.set(c, yB + 1, floor); this.set(c + 1, yB + 1, floor);
    }
    /* ★ 이 계단에도 함정을 하나 심는다. */
    if (rng) this.putPathTrap(Math.round((ax + c) / 2), ay, rng);
  }

  /** spots 의 모든 자리를 서로 걸어 다닐 수 있게 만든다. */
  _ensureWalkable(x0, y0, w, h, spots, floor, traps, rng) {
    if (spots.length < 2) return;
    // 검사 범위는 유적 둘레 열두 칸.
    /* ★ 옆으로도 같다 — 입구 통로는 유적 옆 바깥 열(x0-5)에서 좌우로 서른여섯 칸까지 오르내리며 내려오므로, 통로의 방이 상자(유적 ±12) 밖에 놓일 수 있다. */
    const top = spots.reduce((m, p) => Math.min(m, p[1] - 3), y0 - 12);
    const left = spots.reduce((m, p) => Math.min(m, p[0] - 6), x0 - 12);
    const right = spots.reduce((m, p) => Math.max(m, p[0] + 6), x0 + w + 12);
    const box = [Math.max(2, left), Math.max(2, top),
                 Math.min(WW - 3, right), Math.min(WH - 3, y0 + h + 12)];
    /* 오르내림은 대칭이 아니다 — 떨어지는 것은 공짜지만 올라오는 데는 발판이 있어야 한다. */
    const d0 = p => Math.abs(p[0] - spots[0][0]) + Math.abs(p[1] - spots[0][1]);
    const far = spots.reduce((b, p) => (d0(p) > d0(b) ? p : b), spots[1]);
    for (const anchor of [spots[0], far]) this._walkPass(box, anchor, spots, floor, traps, rng);
    /* 가는 길과 오는 길을 번갈아 손본다. */
    this._walkBack(box, spots, floor, traps, rng);
    this._walkPass(box, spots[0], spots, floor, traps, rng);
    this._walkBack(box, spots, floor, traps, rng);
  }

  /** 자리마다 **기준점으로 돌아올 수 있는지** 하나씩 걸어 보고, 못 돌아오면 길을 낸다. */
  _walkBack(box, spots, floor, traps, rng) {
    const near = (set, tx, ty) => {
      let b = null, bd = 1e9;
      for (const k of set) {
        const y = Math.floor(k / WW), x = k - y * WW;
        const d = Math.abs(x - tx) + Math.abs(y - ty);
        if (d < bd) { bd = d; b = [x, y]; }
      }
      return b;
    };
    /* 되돌아올 수 있는지는 "기준점 칸을 밟는가"가 아니라 **기준점에서 걸어 닿는 무리와 한 칸이라도 겹치는가**로 본다. */
    let home = this._standSet(box, spots[0][0], spots[0][1]);
    let root = home.values().next().value;                    // 기준점에서 실제로 발을 딛는 칸
    if (root === undefined) return;
    const rx = root % WW, ry = Math.floor(root / WW);
    const f = this._standFns();
    let R = this._returnSet(box, root);                       // root 로 걸어 돌아올 수 있는 칸 (_returnSet 의 ★)
    /* ★ 여기서 "빠른 길"을 쓰면 안 된다. */
    for (let i = 1; i < spots.length; i++) {
      if (spots[i][2] === 0) continue;                        // 같은 방의 곁자리는 건너뛴다
      for (let k = 0; k < 4; k++) {                           // 한 번에 안 되면 몇 번 더 잇는다
        const s0 = this._standSeed(box, f, spots[i][0], spots[i][1]);
        if (!s0) break;                                       // 설 자리가 없다(예전 back.size === 0)
        if (R.has(s0[1] * WW + s0[0])) break;                 // 돌아올 수 있다(예전 back.has(root))
        const back = this._standSet(box, spots[i][0], spots[i][1]);
        /* 나오는 쪽에서 기준점에 가장 가까운 칸(a)과, **거기서 아직 못 가는** 쪽 칸(b)을 잇는다. */
        const a = near(back, rx, ry);
        let b = null, bd = 1e9;
        for (const kk of home) {
          if (back.has(kk)) continue;
          const y = Math.floor(kk / WW), x = kk - y * WW;
          const d = Math.abs(x - a[0]) + Math.abs(y - a[1]);
          if (d < bd) { bd = d; b = [x, y]; }
        }
        if (!a || !b) break;
        this._digStair(a[0], a[1], b[0], b[1], floor, box, traps, rng);
        home = this._standSet(box, spots[0][0], spots[0][1]);
        root = home.values().next().value;
        R = this._returnSet(box, root);                       // 판 굴로 길이 바뀌었다 — 다시 잰다
      }
    }
  }

  _walkPass(box, anchor, spots, floor, traps, rng) {
    // 넉넉하게 잡으면 "닿은 칸 옆"을 닿았다고 세어 버린다 — 바짝 붙여 본다
    const hit = (seen, p) => {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 2; dy++)
        if (seen.has((p[1] + dy) * WW + p[0] + dx)) return true;
      return false;
    };
    let guard = 0;
    const tried = new Map();                                  // 자리마다 틈 잇기를 몇 번 해 봤나
    while (guard++ < spots.length * 2 + 4) {                  // 한 번에 한 자리씩 잇는다
      const seen = this._standSet(box, anchor[0], anchor[1]);
      if (!seen.size) return;
      const lost = spots.filter(p => !hit(seen, p));
      if (!lost.length) return;
      const a = lost[0];
      /* 틈 잇기는 **한 자리에 여섯 번까지** 해 본다 — 사연: docs/code-history.md#h114 */
      const key = a[1] * WW + a[0];
      const once = (tried.get(key) || 0) < 6;
      tried.set(key, (tried.get(key) || 0) + 1);
      /* ★ 굴은 **두 무리 사이의 틈**에 판다 — 기준점에서 닿는 무리(seen)와, 잃은 자리에서 닿는 무리(from) 중 서로 가장 가까운 두 칸을 잇는다 — 사연:
         docs/code-history.md#h115 */
      const from = once ? this._standSet(box, a[0], a[1]) : new Set();
      let src = a, best = null, bd = 1e9;
      if (from.size) {
        const cols = new Map();                               // seen 을 열별로 묶어 가까운 열만 본다
        for (const k of seen) {
          const y = Math.floor(k / WW), x = k - y * WW;
          const c = cols.get(x); if (c) c.push(y); else cols.set(x, [y]);
        }
        /* 두 무리가 겹치는 칸은 뺀다 — 걸음은 한쪽으로만 흐를 수 있어서, 목에서 떨어져 닿는 칸은 맨 아래 방에서도 닿는다. */
        for (const k of from) {
          if (seen.has(k)) continue;
          const fy = Math.floor(k / WW), fx = k - fy * WW;
          for (let dx = 0; dx < bd; dx++) {
            for (const x of dx ? [fx - dx, fx + dx] : [fx]) {
              const c = cols.get(x); if (!c) continue;
              for (const y of c) {
                const d = dx + Math.abs(y - fy);
                if (d < bd) { bd = d; best = [x, y]; src = [fx, fy]; }
              }
            }
          }
        }
      }
      /* ★ 굴은 **실제로 닿는 칸**에서 시작해야 한다. */
      if (!best) {
        for (const k of seen) {
          const y = Math.floor(k / WW), x = k - y * WW;
          const d = Math.abs(x - a[0]) + Math.abs(y - a[1]);
          if (d < bd) { bd = d; best = [x, y]; }
        }
      }
      this._digStair(src[0], src[1], best[0], best[1], floor, box, traps, rng);
    }
  }

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
        const have = {};
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
  }

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
  }

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
  }

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
  }

  /** 이 칸이 **아직 잠긴** 암호 골방 안인가 (블록 설치 금지 판정용). */
  inLockedVault(x, y) {
    for (const v of this.ruinVaults || []) {
      if (v[5]) continue;                       // 이미 열린 골방
      if (x >= v[0] && x <= v[2] && y >= v[1] && y <= v[3]) return true;
    }
    return false;
  }

  /** 그 자리의 골방을 열린 것으로 표시한다 (문을 연 뒤 다시 봉하지 않게) */
  openVaultAt(dx, dy) {
    for (const v of this.ruinVaults || [])
      if (dx >= v[0] - 1 && dx <= v[2] + 1 && dy >= v[1] && dy <= v[3]) v[5] = 1;
  }

  /** 암호를 맞힌 뒤 문간을 실제로 뚫는다 — 사람이 걸어 들어갈 수 있게. */
  openCodeDoorway(dx, dy) {
    let n = 0;
    for (let x = dx - 1; x <= dx; x++)
      for (let y = dy - 4; y <= dy; y++)
        if (this.get(x, y) === T.CIPHERSTONE) { this.set(x, y, T.AIR); n++; }
    return n;
  }

  /** 자물쇠가 걸린 돌 — 암호석·봉인석. */
  locked(x, y) { const t = this.get(x, y); return t === T.CIPHERSTONE || t === T.SEALSTONE; }

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
  }

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
  }

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
  }

  /** 유적 입구를 판다 — 생김새(arch)에 따라 들어가는 방식이 다르다. */
  carveRuinEntrance(spec, x0, y0, rng) {
    this._entranceLandY = undefined;                          // 피라미드만 채운다
    this._entranceSpots = [];                                 // 입구가 없으면 빈 채로 둔다
    this._entranceRooms = [];
    const ex = clamp(spec.x + rng.int(-(spec.w >> 2), spec.w >> 2), x0 + 3, x0 + spec.w - 4);
    const surf = this.surface[ex];

    /* sunken — 바다 밑 유적 전용. */
    if (spec.arch === 'seabed') {
      const bed = this.seaBed && ex < this.seaBed.length ? this.seaBed[ex] : this.surface[ex];
      // 해저 바로 아래에서 시작 — 위쪽은 바닷물이라 헤엄쳐 들어오게 된다
      for (let x = ex - 1; x <= ex + 1; x++)
        for (let y = bed - 2; y <= bed + 2; y++)
          if (this.inB(x, y)) { this.set(x, y, T.SEAWATER); this.setWall(x, y, 8); }
      this._entranceLandX = null;
      this._carveEntranceShaft(ex, bed + 3, y0 + 1, spec, rng);
      return this._entranceLandX === null ? ex : this._entranceLandX;
    }

    if (spec.arch === 'pyramid') {
      /* 피라미드 — 문은 **빗면**에 난다. */
      const mid = x0 + spec.w / 2;
      const side = rng.chance(0.5) ? -1 : 1;
      const faceX = y => Math.round(mid + side * ((y - y0 + 1) * (spec.w / 2) / spec.h));
      let yd = y0 + 10;
      for (; yd < y0 + spec.h - 8; yd++)
        if (this.surface[clamp(faceX(yd), 0, WW - 1)] - yd <= 6) break;
      const dx0 = faceX(yd) + side * 2;                       // 문 앞 한 칸 — 돌 턱이 깔린다
      const end = this._buildPassage(dx0, yd, y0 + spec.h - 4, spec, rng,
        { dir: -side, stopAtAir: true, vestibule: 5, lo: x0 + 8, hi: x0 + spec.w - 8 });
      this.putPathTrap(faceX(yd) - side * 3, yd, rng);        // 문지방 안쪽에 하나
      this._entranceLandX = end.x;
      this._entranceLandY = end.f;
      this._entranceSpots.push([dx0, yd]);
      return end.x;
    }

    if (spec.arch === 'buried') {
      // 입구가 없다.
      for (let x = x0 - 4; x <= x0 + spec.w + 4; x++)
        for (let y = y0 - 4; y <= y0 + spec.h + 4; y++) {
          const inside = x >= x0 - 1 && x <= x0 + spec.w && y >= y0 - 1 && y <= y0 + spec.h;
          if (inside || !this.inB(x, y)) continue;
          if (this.get(x, y) === T.BEDROCK) continue;
          if (rng.chance(0.55)) { this.set(x, y, T.AIR); this.setWall(x, y, spec.bg); }
        }
      return null;
    }

    if (spec.arch === 'sunken') {
      /* 지표 아래에 묻힌 통로. */
      const cap = surf + rng.int(4, 7);                // 통로가 시작되는 깊이
      for (let dy = 0; dy < 3; dy++) {                 // 부러진 기둥 — 지상 표식
        this.set(ex, surf - 1 - dy, spec.wall);
        this.setWall(ex, surf - 1 - dy, spec.bg);
      }
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0 || !rng.chance(0.55)) continue;   // 무너져 흩어진 벽돌
        this.set(ex + dx, this.surface[clamp(ex + dx, 0, WW - 1)] - 1, spec.wall);
      }
      this._entranceLandX = null;
      this._carveEntranceShaft(ex, cap, y0 + 1, spec, rng);
      // 통로 맨 위를 흙으로 다시 덮는다 — 파야 열린다
      for (let y = surf; y < cap; y++)
        for (let dx = -1; dx <= 1; dx++)
          if (this.get(ex + dx, y) === T.AIR) this.set(ex + dx, y, T.DIRT);
      return this._entranceLandX === null ? ex : this._entranceLandX;
    }

    if (spec.arch === 'surface') {
      // 유적 윗부분이 지상으로 솟아 있다 — 멀리서도 보인다.
      const th = rng.int(9, 14);                       // 지상으로 솟은 높이
      const tw = Math.max(12, spec.w >> 2);
      const tx0 = ex - (tw >> 1);
      for (let x = tx0; x < tx0 + tw; x++) {
        const top = surf - th;
        for (let y = top; y <= surf; y++) {
          const edge = (x === tx0 || x === tx0 + tw - 1 || y === top);
          this.set(x, y, edge ? spec.wall : T.AIR);
          this.setWall(x, y, spec.bg);
        }
        // 계단식 어깨 — 통짜 상자가 아니라 무너진 탑처럼 보이게
        if ((x - tx0) % 4 === 0) this.set(x, surf - th - 1, spec.wall);
      }
      /* 실내 장식 — 지상에 솟아 멀리서도 보이는 구조물인 만큼 안에 들어왔을 때도 "버려진 탑"으로 읽히게 양쪽 벽에 횃불을 박고 깃발을 건다(구조는 그대로). */
      const top = surf - th;
      for (let y = top + 2; y < surf; y += 3) {
        this.set(tx0 + 1, y, spec.torch);
        this.set(tx0 + tw - 2, y, spec.torch);
      }
      this.set(tx0 + (tw >> 1) - 3, top + 1, T.BANNER);
      this.set(tx0 + (tw >> 1) + 3, top + 1, T.BANNER);
      this._entranceLandX = null;
      this._carveEntranceShaft(ex, surf - th + 2, y0 + 1, spec, rng);
      return this._entranceLandX === null ? ex : this._entranceLandX;
    }

    // gated — 입구는 뚜렷하지만(문틀까지 세운다) 내려가는 갱도가 길고 함정투성이다
    for (let x = ex - 3; x <= ex + 3; x++) {
      this.set(x, surf - 5, spec.wall);
      if (x === ex - 3 || x === ex + 3) for (let y = surf - 5; y <= surf; y++) this.set(x, y, spec.wall);
    }
    this._entranceLandX = null;
    this._carveEntranceShaft(ex, surf - 4, y0 + 1, spec, rng);
    return this._entranceLandX === null ? ex : this._entranceLandX;
  }

  /** 입구 통로 — 목(지상에서 땅까지)을 판 뒤 **벽돌로 쌓은 길**(_buildPassage)을 잇는다. */
  _carveEntranceShaft(ex, yTop, yBot, spec, rng) {
    const bg = spec.bg;
    const solid = (x, y) => TILE_DEF[this.get(x, y)].solid === 1;
    const dig = (x, y) => {
      if (this.inB(x, y) && this.get(x, y) !== T.BEDROCK) { this.set(x, y, T.AIR); this.setWall(x, y, bg); }
    };
    this._entranceSpots = [];
    this._entranceRooms = [];   // 층계참·계단실의 상자 — 진단이 함정 유무를 잰다
    // 입구 목 — 먼저 뚫어 둔다.
    for (let y = yTop - 2; y <= yTop + 1; y++) for (let dx = -1; dx <= 1; dx++) dig(ex + dx, y);
    /* ★ 목은 **땅에 닿을 때까지** 내린다. */
    let cy = yTop + 1;
    for (let k = 0; k < 24 && cy < yBot - 4 && !solid(ex, cy + 1); k++) {
      for (let dx = -1; dx <= 1; dx++) dig(ex + dx, cy + 1);
      cy++;
    }
    /* ★ 목에도 함정을 하나 심는다. */
    this.putPathTrap(ex, cy, rng);
    const end = this._buildPassage(ex, cy, yBot, spec, rng, { ruin: this._ruinCtx, lo: spec.lo, hi: spec.hi });
    this._entranceLandX = end.x;
    if (this._ruinCtx) this._entranceLandY = end.f;           // 옆문 — 지붕 줄이 아니라 방 바닥 높이
    this._entranceSpots.push([ex, yTop + 1]);                 // 입구 목 — 지상으로 나가는 자리
  }

  /** 유적으로 가는 **쌓아 올린 길** — 테라리아 던전 복도나 마인크래프트 요새처럼 벽돌로 두른 곧은 마디를 이어 붙인다. */
  _buildPassage(sx, sy, yBot, spec, rng, o) {
    const kind = spec.entryKind || 'foothold';
    const H = 5;                                              // 복도 안 높이
    const span = Math.max(20, Math.round((spec.w || 40) * 0.45));
    let lo = o.lo !== undefined ? o.lo : sx - span, hi = o.hi !== undefined ? o.hi : sx + span;
    let yGuard = yBot;                                        // 이 줄 아래로는 벽돌·바닥을 안 깐다(유적의 몸)
    const bg = spec.bg, wall = spec.wall || T.RUINBRICK, floorT = spec.floor || T.RUINTILE;
    const traps = spec.traps || ['dart', 'crumble'];
    const K = (x, y) => y * WW + x;
    const dug = new Set();
    const ok = (x, y) => this.inB(x, y) && this.get(x, y) !== T.BEDROCK && !this.locked(x, y);
    const dig = (x, y) => {
      if (!ok(x, y)) return;
      this.set(x, y, T.AIR); this.setWall(x, y, bg); dug.add(K(x, y));
    };
    // 벽돌 — 원래 땅(단단한 칸)만 바꾼다.
    const brick = (x, y) => {
      if (y < yGuard && ok(x, y) && !dug.has(K(x, y)) && TILE_DEF[this.get(x, y)].solid === 1) this.set(x, y, wall);
    };
    // 발밑 — 비어 있어도 깐다.
    const floorAt = (x, y) => {
      if (y < yGuard && ok(x, y) && !dug.has(K(x, y))) this.set(x, y, floorT);
    };
    /* ★ stopAtAir 는 **벽 속에 한 번 들어간 뒤에만** 본다. */
    let x = sx, f = sy, stop = false, inWall = false, stopAtAir = !!o.stopAtAir;
    let dir = o.dir || (rng.chance(0.5) ? 1 : -1);
    const cols = [];                                          // 이번 마디의 [x, 바닥]
    const col = (cx, cf) => {
      if (stopAtAir) {
        const open = this.get(cx, cf) === T.AIR && !dug.has(K(cx, cf));
        if (open && inWall) stop = true;
        if (!open) inWall = true;
      }
      for (let y = cf - H + 1; y <= cf; y++) dig(cx, y);
      brick(cx, cf - H); brick(cx, cf - H - 1);               // 천장 두 겹
      floorAt(cx, cf + 1); brick(cx, cf + 2);                 // 바닥과 그 밑 한 겹
      cols.push([cx, cf]);
    };
    const step = dy => { x += dir; f += dy; col(x, f); };
    const ahead = () => (dir > 0 ? hi - x : x - lo);
    col(x, f);

    /* 층계참 — 복도 높이 그대로 가던 쪽으로 붙는 네모난 방. */
    const landing = () => {
      const rw = rng.int(7, 11), rh = rng.int(5, 6);
      const ax = dir > 0 ? x + 1 : x - rw;                    // 방 안쪽 왼쪽 끝
      const top = f - rh + 1;
      for (let xx = ax - 1; xx <= ax + rw; xx++) {
        for (let y = top - 1; y <= f; y++) {
          const edge = xx === ax - 1 || xx === ax + rw || y === top - 1;
          if (edge) brick(xx, y); else dig(xx, y);
        }
        floorAt(xx, f + 1); brick(xx, f + 2); brick(xx, top - 2);
      }
      this._entranceSpots.push([ax + (rw >> 1), f]);
      this._entranceRooms.push([ax - 1, top - 1, rw + 2, rh + 2, f]);
      const box = { x: ax - 1, y: top - 1, w: rw + 2, h: rh + 2 };
      const pool = traps.filter(t => t !== 'dart' && t !== 'grind').concat(['crumble', 'vent', 'gas']);
      for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); const t2 = pool[i]; pool[i] = pool[j]; pool[j] = t2; }
      let placed = 0; const used = {};
      const want = rng.int(2, 3);
      for (const tk of pool) {
        if (placed >= want) break;
        if (used[tk]) continue;
        if (this.putTileTrap(box, f, tk, rng)) { used[tk] = 1; placed++; }
      }
      if (!placed) this.putPathTrap(ax + (rw >> 1), f, rng);
      if (kind === 'nofoothold' && rng.chance(0.6)) this.set(ax + rng.int(1, rw - 2), f, T.SPIKE);
      this.putDecor(ax, top + 1, spec.torch || T.TORCH, 'wall');
      if (rh >= 6) this.putDecor(ax + rw - 1, top + 1, T.BANNER, 'wall');
      if (rng.chance(0.25)) this.objects.push({ type: 'chest', tier: 1,
        x: (ax + (rw >> 1)) * TS, y: (f - 0.2) * TS, w: 30, h: 26, items: null });
      x = dir > 0 ? ax + rw - 1 : ax;                         // 다음 마디는 반대쪽 벽을 뚫고 나간다
    };

    /* 계단실 — 길이 되돌아 꺾이는 방. */
    const well = () => {
      const D = rng.int(9, 11), Ws = D + 1;
      const xw = x, top = f - H + 1;
      const at = i => xw + dir * i;                           // i = 1..Ws 가 방 속
      for (let i = 0; i <= Ws + 1; i++) {
        const cx = at(i);
        for (let y = top - 1; y <= f + D; y++) {
          const edge = i === 0 || i === Ws + 1 || y === top - 1;
          if (edge) brick(cx, y); else dig(cx, y);
        }
        floorAt(cx, f + D + 1); brick(cx, f + D + 2); brick(cx, top - 2);
      }
      // 발판형도 계단실 다섯에 둘만 나무 발판이다 — 전부 발판이면 깊은 입구가 다시 발판투성이가 된다
      const stepT = kind === 'foothold' && rng.chance(0.4) ? T.PLATFORM : wall;
      this.set(at(1), f + 1, stepT);                          // 들어온 턱
      for (let k = 1; k <= D - 3; k++) this.set(at(1 + k), f + k + 1, stepT);
      if (ok(at(Ws + 1), f + D - 1)) this.set(at(Ws + 1), f + D - 1, dir > 0 ? T.DART_L : T.DART_R);
      if (kind === 'nofoothold') this.set(at(D), f + D, T.SPIKE);
      this.putDecor(at(Ws), top + 1, spec.torch || T.TORCH, 'wall');
      this._entranceSpots.push([at(Ws - 1), f + D]);
      this._entranceRooms.push([Math.min(at(0), at(Ws + 1)), top - 1, Ws + 2, D + H + 1, f + D]);
      dir = -dir; f += D;
      col(xw, f);                                             // 나가는 문 — 같은 벽의 아래쪽
    };

    let lastSeg = 'start', lastRoom = f, guard = 0;
    if (o.vestibule) { for (let i = 0; i < o.vestibule && !stop; i++) step(0); lastSeg = 'hall'; }
    /** yT 줄까지 부품을 이어 내려간다. */
    const run = yT => {
      while (!stop && f < yT && guard++ < 120) {
        cols.length = 0;
        const rem = yT - f;
        // 옆으로 갈 자리가 모자라면 계단실에서 되돌아 꺾는다(오르막 바로 뒤에는 꺾지 않는다)
        if (ahead() < 14 && rem > 13 && lastSeg !== 'rise') { well(); lastSeg = 'well'; lastRoom = f; continue; }
        /* 층계참은 한 다리 **중간**에도 선다. */
        if (f - lastRoom >= 8 && ahead() >= 22 && lastSeg !== 'landing' && lastSeg !== 'well' && rem > 4) {
          landing(); lastSeg = 'landing'; lastRoom = f; continue;
        }
        let seg = rng.weighted([['flight', 5], ['hall', kind === 'maze' ? 3 : 2],
                                ['rise', kind === 'maze' ? 1.6 : 1]]);
        if (seg === 'rise' && (lastSeg === 'well' || lastSeg === 'rise' || rem < 12 || ahead() < 30)) seg = 'flight';
        /* ★ 평평한 복도는 **방(층계참·계단실) 바로 뒤에만** 둔다. */
        if (seg === 'hall' && (ahead() < 18 || !(lastSeg === 'landing' || lastSeg === 'well' || lastSeg === 'start')))
          seg = 'flight';
        if (seg === 'flight') {
          /* ★ 기울기는 **45° 하나**다. */
          const n = Math.max(3, Math.min(rng.int(5, 12), ahead() - 12));
          for (let i = 1; i <= n && !stop && f < yT; i++) step(1);
          // 계단 함정 — 한 칸을 무너지게 하거나 가시를 박는다.
          if (cols.length > 3 && rng.chance(0.45)) {
            const c = cols[rng.int(1, cols.length - 2)];
            this.putPathTrap(c[0], c[1], rng);
          }
          if (kind === 'nofoothold' && cols.length) {
            const c = cols[cols.length - 1];
            if (TILE_DEF[this.get(c[0], c[1] + 1)].solid === 1) this.set(c[0], c[1], T.SPIKE);
          }
        } else if (seg === 'hall') {
          const n = rng.int(3, 8);
          const x0h = x;
          for (let i = 0; i < n && !stop; i++) step(0);
          if (cols.length >= 3 && rng.chance(0.6)) {
            const ax = Math.min(x0h, x), bx = Math.max(x0h, x);
            this.putTileTrap({ x: ax, y: f - H, w: bx - ax + 1, h: H + 1 }, f,
                             rng.pick(['vent', 'gas', 'crumble']), rng);
          }
        } else {
          const n = rng.int(2, 3);
          for (let i = 0; i < n && !stop; i++) step(-1);
        }
        lastSeg = seg;
      }
    };
    const ruin = o.ruin;
    if (!ruin || !ruin.rooms || !ruin.rooms.length) { run(yBot); return { x, f }; }

    /* ★ 유적에는 **옆문으로 바닥 높이에서** 들어간다 — 사연: docs/code-history.md#h118 */
    run(ruin.y0 - 3);
    if (stop) return { x, f };
    const edgeL = r => r.x - ruin.x0, edgeR = r => ruin.x0 + ruin.w - (r.x + r.w);
    const cands = ruin.rooms.filter(r => Math.min(edgeL(r), edgeR(r)) <= 3 && r.h >= 5);
    const pool = cands.length ? cands : ruin.rooms;
    let T0 = pool[0];
    for (const r of pool)
      if (r.y < T0.y || (r.y === T0.y && Math.abs(r.x - x) < Math.abs(T0.x - x))) T0 = r;
    const side = edgeL(T0) <= edgeR(T0) ? -1 : 1;
    const tf = T0.y + T0.h - 3;                               // 그 방의 걷는 줄
    const cxo = side < 0 ? ruin.x0 - 5 : ruin.x0 + ruin.w + 4;
    dir = Math.sign(cxo - x) || side;
    lastSeg = 'hall';
    while (x !== cxo && !stop) step(0);                       // 지붕 위를 건너 바깥 열까지
    lo = side < 0 ? cxo - 36 : cxo; hi = side < 0 ? cxo : cxo + 36;
    dir = side; yGuard = tf + 3;
    run(tf);
    /* 유적 쪽으로 돌아 들어간다 — **고른 방 안에 한 칸 들어설 때까지** 판다. */
    dir = -side;
    const inRoom = () => (dir > 0 ? x >= T0.x + 1 : x <= T0.x + T0.w - 2);
    for (let i = 0; i < 60 && !stop && !inRoom(); i++) step(0);
    return { x, f };
  }

  /** 그 유적에만 놓이는 장식. */
  putRuinDecor(spec, r, fy, rng) {
    if (!spec.decor) return;
    /* ★ 규칙: 장식은 **걷는 줄(fy · fy-1)을 절대 막지 않는다.** */
    const list = Array.isArray(spec.decor[0]) ? spec.decor : [spec.decor];
    for (const [kind, tile, dens] of list) this._decorOne(spec, r, fy, kind, tile, dens, rng);
  }

  /* ★ 장식은 **붙을 데가 있어야 붙는다.** */
  _canDecor(x, y, side, like) {
    if (this.get(x, y) !== T.AIR) return false;
    const hold = (dx, dy) => {
      const t = this.get(x + dx, y + dy);
      return TILE_DEF[t].solid === 1 || (like !== undefined && t === like);
    };
    if (side === 'ceil') return hold(0, -1);
    if (side === 'floor') return hold(0, 1);
    if (side === 'wall') return hold(-1, 0) || hold(1, 0);
    return hold(0, -1) || hold(0, 1) || hold(-1, 0) || hold(1, 0);
  }

  /** 붙을 데가 있을 때만 놓는다. */
  putDecor(x, y, tile, side, like) {
    if (!this._canDecor(x, y, side, like === undefined ? tile : like)) return false;
    this.set(x, y, tile);
    return true;
  }

  _decorOne(spec, r, fy, kind, tile, dens, rng) {
    const x1 = r.x + r.w - 2;
    const air = (x, y) => this.get(x, y) === T.AIR;
    if (kind === 'pillar') {
      // 천장에서 내려오다 두 칸 남기고 멈추는 기둥 — 밑으로 지나다닐 수 있다.
      for (let x = r.x + 3; x < x1 - 1; x += 5) {
        if (!rng.chance(dens)) continue;
        for (let y = r.y + 2; y <= fy - 2; y++) if (!this.putDecor(x, y, tile, 'ceil')) break;
      }
    } else if (kind === 'stalac') {
      // 천장 고드름·종유석 — 길이가 제각각이라 천장이 울퉁불퉁해 보인다
      for (let x = r.x + 2; x < x1; x++) {
        if (!rng.chance(dens * 0.45)) continue;
        const len = rng.int(1, 3);
        for (let k = 0; k < len; k++) if (!this.putDecor(x, r.y + 2 + k, tile, 'ceil')) break;
      }
    } else if (kind === 'statue') {
      // 벽에 새긴 좌상 — 이미 벽인 칸만 갈아끼운다.
      for (const bx of [r.x, r.x + r.w - 1]) {
        if (!rng.chance(dens)) continue;
        for (let y = fy; y >= fy - 3; y--) if (this.get(bx, y) === spec.wall) this.set(bx, y, tile);
      }
    } else if (kind === 'frieze') {
      // 천장 밑을 두르는 띠 장식 (금 · 룬돌) — 벽 위쪽에만
      const y = r.y + 2;
      for (let x = r.x + 2; x < x1; x += 3) if (rng.chance(dens)) this.putDecor(x, y, tile, 'ceil');
    } else if (kind === 'beam') {
      // 천장을 받치는 갱목 — 세로 기둥 없이 천장 줄에만 건다
      for (let x = r.x + 2; x < x1; x += 4) {
        if (!rng.chance(dens)) continue;
        if (!this.putDecor(x, r.y + 2, tile, 'ceil')) continue;
        if (rng.chance(0.5)) this.putDecor(x, r.y + 3, tile, 'ceil');
      }
    } else if (kind === 'rail') {
      // 광차 레일 — 바닥 타일을 널판으로 갈아 깐다 (통행에 영향 없음)
      if (!rng.chance(dens)) return;
      for (let x = r.x + 2; x < x1; x++) if (this.get(x, fy + 1) === spec.floor) this.set(x, fy + 1, tile);
    } else if (kind === 'crate') {
      // 쌓아 둔 나무 상자 — 한 칸 높이라 뛰어넘을 수 있다
      for (let x = r.x + 3; x < x1 - 1; x += 6)
        if (rng.chance(dens)) this.putDecor(x, fy, tile, 'floor');
    } else if (kind === 'pipe') {
      // 벽을 타고 흐르는 구리·납 배관 — 세션 2 전기 문명의 흔적
      const y = r.y + rng.int(2, 3);
      for (let x = r.x + 1; x <= x1; x++) if (rng.chance(dens)) this.putDecor(x, y, tile, 'ceil');
      for (const bx of [r.x + 2, x1 - 1])
        if (rng.chance(dens * 0.6))
          for (let yy = y + 1; yy <= y + 2; yy++) if (!this.putDecor(bx, yy, tile, 'ceil')) break;
    } else if (kind === 'moss') {
      // 바닥을 덮은 이끼 — 바닥 타일만 갈아 깐다
      for (let x = r.x + 1; x <= x1; x++)
        if (rng.chance(dens) && this.get(x, fy + 1) === spec.floor) this.set(x, fy + 1, tile);
    } else if (kind === 'web' || kind === 'growth') {
      // 벽·천장에서 자라나온 것 — 통과되는 타일이라 바닥 줄에 놓아도 안전하다
      for (let x = r.x + 2; x < x1; x++) {
        if (rng.chance(dens * 0.4)) this.putDecor(x, r.y + 2, tile, 'ceil');
        if (rng.chance(dens * 0.3)) this.putDecor(x, fy, tile, 'floor');
      }
    } else if (kind === 'floorpile') {
      /* 바닥에 흩어 놓은 것. */
      for (let x = r.x + 4; x < x1 - 1; x += 4)
        if (rng.chance(dens) && air(x, fy) && this.solid(x, fy + 1)) this.set(x, fy, tile);
    } else if (kind === 'wallmark') {
      /* 벽에 새긴 것. */
      for (const [bx, in1] of [[r.x, 1], [r.x + r.w - 1, -1]]) {
        if (!rng.chance(dens)) continue;
        for (let y = fy; y >= fy - 3; y--)
          if (this.solid(bx, y) && this.get(bx + in1, y) === T.AIR) this.set(bx, y, tile);
      }
    } else if (kind === 'brazier') {
      // 바닥에 세운 화로 — 통과되는 불이라 길을 막지 않는다
      for (let x = r.x + 4; x < x1 - 2; x += 7)
        if (rng.chance(dens)) this.putDecor(x, fy, tile, 'floor');
    }
  }

  /** 암호 골방 — 방 오른쪽 끝에 암호석 문을 세우고 그 너머에 상자를 둔다. */
  buildCipherVault(spec, r, fy, rng, rooms) {
    const x1 = r.x + r.w - 2, dx0 = x1 - 6;
    for (let y = fy - 6; y <= fy + 2; y++)
      for (let x = dx0 - 1; x <= x1 + 2; x++) {
        const inner = (y > fy - 5 && y < fy + 1 && x > dx0 && x < x1 + 1);
        this.set(x, y, inner ? T.AIR : T.CIPHERSTONE);
        this.setWall(x, y, spec.bg);
      }
    this.objects.push({ type: 'codedoor', ruin: spec.id, dx: dx0, dy: fy,
      x: dx0 * TS, y: (fy - 3) * TS, w: TS, h: TS * 4 });
    // 껍질 자리를 적어 둔다 — 세계를 다 만든 뒤 한 번 더 세워 확실히 잠근다
    (this.ruinVaults = this.ruinVaults || []).push([dx0 - 1, fy - 6, x1 + 2, fy + 2, spec.bg]);
    // codeRuin 이 있으면 그 유적의 암호문이 열리기 전까지 상자가 안 열린다
    this.objects.push({ type: 'chest', tier: clamp((spec.tier || 3) + 2, 1, 6), locked: 1, codeRuin: spec.id,
      x: (x1 - 2) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });

    /* 쪽지 셋 — 골방 방을 뺀 나머지에서 **서로 멀리** 셋을 고른다. */
    const pool = (rooms || []).filter(q => q !== r);
    pool.sort((a, b) => a.x - b.x);
    for (let i = 0; i < 3 && pool.length; i++) {
      // 왼쪽 · 가운데 · 오른쪽에서 하나씩.
      const want = Math.round(i * (pool.length - 1) / 2);
      let q = null;
      for (let d = 0; d < pool.length && !q; d++)
        for (const j of [want + d, want - d])
          if (j >= 0 && j < pool.length && !pool[j].noted) { q = pool[j]; break; }
      if (!q) break;
      q.noted = 1;
      const ny = q.y + q.h - 3;
      this.objects.push({ type: 'ciphernote', ruin: spec.id, idx: i,
        x: (q.x + 3) * TS, y: (ny + 1) * TS - 24, w: 22, h: 24 });
    }
  }

  /** 그 유적에만 있는 방 하나. */
  buildSigRoom(spec, r, fy, cx, idx, rng) {
    const x1 = r.x + r.w - 2, sig = spec.sig;
    for (let x = r.x + 2; x < x1; x += 4) this.putDecor(x, r.y + 2, spec.torch, 'any');

    if (sig === 'frozen') {
      // 얼어붙은 회랑 — 바닥이 통째로 얼음이고 천장에서 고드름이 내려온다
      for (let x = r.x + 1; x <= x1; x++) {
        this.set(x, fy + 1, T.ICE);                          // 바닥이 통째로 얼음
        if (rng.chance(0.4)) this.set(x, r.y + 2, T.ICE);    // 천장 고드름
      }
      for (let x = r.x + 3; x < x1; x += 3)
        if (this.get(x, r.y + 3) === T.AIR) this.set(x, r.y + 3, T.ICE);   // 더 길게 자란 것
    } else if (sig === 'sunshaft') {
      // 빛우물 — 천장에 뚫린 구멍으로 빛이 떨어지고 그 아래에 제단이 있다
      const hx = cx;
      for (let y = r.y - 1; y >= r.y - 7; y--)
        for (let dx = -1; dx <= 1; dx++) { this.set(hx + dx, y, T.AIR); this.setWall(hx + dx, y, spec.bg); }
      for (let dx = -2; dx <= 2; dx++) this.set(hx + dx, fy, T.ALTARSTONE);
      this.set(hx, fy - 1, T.RUNESTONE);
    } else if (sig === 'shaft') {
      // 무너진 갱도 — 바닥 절반이 부서지는 바닥이고 아래는 비어 있다
      for (let x = r.x + 3; x < x1 - 2; x++) {
        this.set(x, fy + 1, T.CRUMBLE);
        this.set(x, fy + 2, T.AIR); this.set(x, fy + 3, T.AIR);
      }
      for (let x = r.x + 3; x < x1 - 2; x += 2) this.set(x, fy + 4, T.SPIKE);
    } else if (sig === 'heart') {
      // 둥지의 심장 — 방 한가운데에 살덩이가 부풀어 있다 천장에 매달린 살덩이 — 바닥에 놓으면 방을 가로막아 지나갈 수가 없다
      for (let dy = 0; dy < 5; dy++)
        for (let dx = -3 + Math.abs(dy - 2); dx <= 3 - Math.abs(dy - 2); dx++)
          this.set(cx + dx, r.y + 2 + dy, T.EBONSTONE);
      for (let dx = -4; dx <= 4; dx++) if (rng.chance(0.6)) this.set(cx + dx, r.y + 2, T.CORRUPTLEAF);
    } else if (sig === 'bloom') {
      // 발광 버섯 정원 — 바닥이 이끼고 갓이 무리 지어 자란다
      for (let x = r.x + 1; x <= x1; x++) {
        this.set(x, fy + 1, T.GLOWMOSS);
        if (rng.chance(0.55)) this.set(x, fy, T.GLOWCAP);
      }
      for (let x = r.x + 2; x < x1; x += 3) if (rng.chance(0.5)) this.set(x, r.y + 2, T.GLOWCAP);
    }

    /* 이 방을 밟으면 유적 고유 이벤트가 한 번 터진다. */
    if (spec.event) {
      if (!this.ruinEvents) this.ruinEvents = [];
      this.ruinEvents.push({ ruin: spec.id, ev: spec.event, sig,
        x: (r.x + 1) * TS, y: (r.y + 1) * TS, w: (r.w - 2) * TS, h: (r.h - 2) * TS });
    }
  }

  /** 신비한 방 — 싸움이 아니라 고르는 것이 내용이라 함정도 몹도 두지 않는다. */
  buildMysticRoom(spec, r, fy, cx, rng) {
    const m = MYSTIC[spec.mystic]; if (!m) return;
    const x1 = r.x + r.w - 2;
    for (let x = r.x + 2; x < x1; x += 3) this.putDecor(x, r.y + 2, spec.torch || T.TORCH, 'any');
    // 방 안을 깨끗이 비운다 — 앞서 깔린 함정·장식을 걷어낸다
    for (let x = r.x + 1; x <= x1; x++)
      for (let y = r.y + 3; y <= fy; y++)
        if (TILE_DEF[this.get(x, y)].solid === 1) this.set(x, y, T.AIR);
    // 가운데 상징물 — 우물이면 물, 메아리면 룬돌, 별빛이면 수정
    const tile = T[m.tile] !== undefined ? T[m.tile] : T.RUNESTONE;
    for (let dx = -2; dx <= 2; dx++) this.set(cx + dx, fy + 1, T.RUINTILE);
    for (let dx = -1; dx <= 1; dx++) this.set(cx + dx, fy, tile);
    this.putDecor(cx - 2, fy, spec.torch || T.TORCH, 'any');
    this.putDecor(cx + 2, fy, spec.torch || T.TORCH, 'any');
    this.objects.push({ type: 'mystic', mk: spec.mystic, ruin: spec.id,
      x: (cx - 1) * TS, y: (fy - 1) * TS, w: TS * 3, h: TS * 2 });
  }

  /** 유적 하나를 짓는다 — 방·함정·상자·비문·미니보스 둥지까지. */
  /** 피라미드 마무리 — 꼭대기 두 줄을 금으로 덮고, 지표(surface)를 빗면으로 올린다. */
  _finishPyramid(spec, x0, y0) {
    const w = spec.w, h = spec.h, mid = x0 + w / 2;
    const inTri = (x, y) => y >= y0 && y < y0 + h && Math.abs(x + 0.5 - mid) <= (y - y0 + 1) * (w / 2) / h;
    for (let x = x0; x < x0 + w; x++) {
      for (let y = y0; y < y0 + h; y++) {
        if (!inTri(x, y)) continue;
        if (y - y0 < 2 && TILE_DEF[this.get(x, y)].solid === 1) this.set(x, y, T.GOLD);  // 금 관석
        if (y < this.surface[x]) this.surface[x] = y;
        break;
      }
    }
    for (let x = x0; x < x0 + w; x++)                          // 관석 둘째 줄
      for (let y = y0 + 1; y < y0 + 3; y++)
        if (inTri(x, y) && TILE_DEF[this.get(x, y)].solid === 1 && y - y0 < 2) this.set(x, y, T.GOLD);
  }

  buildRuinSite(spec, idx, rng) {
    const y0 = spec.y, x0 = spec.x - (spec.w >> 1);
    /* 유적마다 자르는 깊이와 방 최소 크기를 달리 준다 (RUIN_SPEC[].bsp). */
    const bsp = spec.maze ? [7, 6, 6] : (spec.bsp || [4, 15, 8]);
    const rooms = this.carveDungeon({
      x0, y0, w: spec.w, h: spec.h, wall: spec.wall, floor: spec.floor, bg: spec.bg,
      rng, depth: bsp[0], minW: bsp[1], minH: bsp[2],
      target: spec.rooms,                                    // 등급대로 방 수를 맞춘다
      plan: spec.plan                                        // 겉모양이 방 배치를 따라간다
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const boss = rooms[0];                                   // 가장 넓은 방이 보스방
    const site = { id: spec.id, n: spec.n, x: spec.x, y: y0 + (spec.h >> 1), w: spec.w, h: spec.h, rooms, idx };

    this._ruinCtx = { x0, y0, w: spec.w, rooms };             // 입구가 옆문을 낼 방을 고른다
    const ex = this.carveRuinEntrance(spec, x0, y0, rng);
    this._ruinCtx = null;
    if (spec.plan === 'tri') this._finishPyramid(spec, x0, y0);
    // 입구 통로의 작은 방 자리 — 진단이 "이 길에 함정이 있나"를 재는 데 쓴다
    site.ent = (this._entranceRooms || []).slice();

    /* 방 성격을 배분한다. */
    const entX = ex === null ? spec.x : ex;
    const rest = rooms.slice(1);
    rest.sort((a, b) => Math.abs(b.x - entX) - Math.abs(a.x - entX));   // 먼 것부터
    const roles = new Map();
    if (rest[0]) roles.set(rest[0], 'vault');
    if (rest[1]) roles.set(rest[1], 'vault');
    if (rest[Math.floor(rest.length / 2)]) roles.set(rest[Math.floor(rest.length / 2)], 'lore');
    for (const r of rest) if (!roles.has(r) && rng.chance(0.3)) roles.set(r, 'gauntlet');

    /* 고유 방 — 그 유적에만 있는 방 하나. */
    const sigRoom = rest.find(r => !roles.has(r)) || rest[2] || rest[0];
    if (spec.sig && sigRoom) roles.set(sigRoom, 'sig');
    /* 암호 골방은 자물쇠가 걸린 유적이면 어디든 선다(RUIN_CIPHER). */
    let cipherRoom = null;
    if (RUIN_CIPHER[spec.id]) {
      cipherRoom = (spec.sig === 'sunshaft' && sigRoom) ? sigRoom
        : (rest.find(r => !roles.has(r) && r.w >= 14) || rest.find(r => r.w >= 14) || sigRoom);
    }
    /* 신비한 방 — 한 세계에 두세 곳뿐이라 유적마다 후보 하나만 두고, buildRuins 가 미리 뽑아 둔 목록(this._mysticPick)에 든 유적에만 실제로 짓는다. */
    if (spec.mystic) {
      const mr = rest.find(r => !roles.has(r) && r.w >= 12);
      if (mr) roles.set(mr, 'mystic');
    }
    /* 미로 유적만 — 방과 방 사이 통로 몇 개를 도로 막아 **막다른 길**을 만든다. */
    if (spec.maze) {
      for (const r of rooms) {
        if (r === boss || !rng.chance(0.55)) continue;
        const side = rng.chance(0.5) ? r.x : r.x + r.w - 1;
        for (let y = r.y + 1; y < r.y + r.h - 1; y++)
          if (this.get(side, y) === T.AIR) this.set(side, y, spec.wall);
      }
      // 가짜 문 — 벽 한 칸만 유적 타일로 바꿔 두면 통로처럼 보이다 막힌다
      for (const r of rooms) {
        if (rng.chance(0.4)) this.setWall(r.x + (r.w >> 1), r.y + r.h - 2, spec.bg);
      }
    }

    let hintSlot = 0;                                        // 흔적을 방마다 하나씩 순서대로
    // 유적마다 개별로 매긴 난이도 — 없으면 예전 기본값으로 떨어진다
    const TRAP = spec.trapRate === undefined ? 0.8 : spec.trapRate;
    const SPIKE = spec.spikeRate === undefined ? 0.4 : spec.spikeRate;
    const CHEST = spec.chestRate === undefined ? 0.3 : spec.chestRate;
    const rank = spec.rank || 3;
    for (const r of rooms) {
      const fy = r.y + r.h - 3;                              // 바닥 바로 위 줄
      const cx = r.x + (r.w >> 1);
      // 양쪽 벽에 깃발을 하나씩 걸어 방 하나하나가 "누가 살았던 자리"로 읽히게 한다 (역할 상관없이 전부 — 함정/상자 자리는 안 건드리는 천장 쪽 줄이라 안전하다) 깃발은 벽에 건다
      // — 사연: docs/code-history.md#h119
      if (r.h > 6) { this.putDecor(r.x + 1, r.y + 4, T.BANNER, 'wall'); this.putDecor(r.x + r.w - 2, r.y + 4, T.BANNER, 'wall'); }
      this.putRuinDecor(spec, r, fy, rng);                   // 그 유적에만 있는 장식
      if (r === boss) {
        // 보스방: 넓게 비우고 둥지를 놓는다.
        this.objects.push({ type: 'lair', boss: spec.boss, ruin: idx,
          x: cx * TS, y: (fy + 1) * TS - 48, w: 40, h: 48 });
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 5) this.putDecor(x, r.y + 2, spec.torch, 'any');
        this.objects.push({ type: 'chest', tier: clamp(spec.tier, 1, 4),
          x: (r.x + 3) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
        continue;
      }
      const role = roles.get(r);

      if (role === 'vault') {
        /* 보물방 — 등급이 가장 높은 상자를 두되, 지킴이가 붙고 바닥이 온통 함정이다. */
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) this.putDecor(x, r.y + 2, spec.torch, 'any');
        // 함정 개수와 지킴이 수가 유적 등급을 그대로 탄다 — 갱도는 2마리, 부패한 둥지는 5마리
        for (let k = 0; k < 1 + Math.round(rank * 0.7); k++) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
        for (let x = r.x + 2; x < r.x + r.w - 2; x++) if (rng.chance(SPIKE)) this.set(x, fy, T.SPIKE);
        /* 이 유적의 유물은 입구에서 가장 먼 보물방에만 들어간다 — 유적마다 하나뿐이고, 끝까지 들어가 본 사람만 갖는다. */
        const first = r === rest[0];
        const relic = first ? RUIN_RELIC[spec.id] : null;
        // 다른 유적의 위치 지도가 여기 들어간다 — 한 곳을 털면 다음 곳이 열리는 사슬
        const mapFor = first ? Object.keys(RUIN_MAP_IN).find(k => RUIN_MAP_IN[k] === spec.id) : null;
        this.objects.push({
          type: 'chest', tier: clamp(spec.tier + 1, 1, 6),
          x: cx * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null,
          relic: relic || undefined,
          ruinmap: mapFor ? 'ruinmap_' + mapFor : undefined,
          bonus: spec.bonus, bonus2: spec.bonus2,
          guard: { t: rng.pick(spec.mobs), n: clamp(1 + Math.round(rank * 0.6), 2, 5) }
        });
        continue;
      }

      if (role === 'sig') {
        this.buildSigRoom(spec, r, fy, cx, idx, rng);
        continue;
      }

      if (role === 'mystic') {
        this.buildMysticRoom(spec, r, fy, cx, rng);
        continue;
      }

      if (role === 'lore') {
        // 비문방 — 함정 없이 조용하다.
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) this.putDecor(x, r.y + 2, spec.torch, 'any');
        this.objects.push({ type: 'lorestone', lore: spec.id,
          x: cx * TS, y: (fy + 1) * TS - 34, w: 26, h: 34 });
        continue;
      }

      if (role === 'gauntlet') {
        /* 시련방 — 상자가 아예 없다. */
        for (let x = r.x + 3; x < r.x + r.w - 2; x += 8) this.putDecor(x, r.y + 2, spec.torch, 'any');
        for (let k = 0; k < 2 + Math.round(rank * 0.8); k++) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
        // 천장에서도 쏜다 — 바닥만 보고 걷지 못하게
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 3)
          if (rng.chance(TRAP * 0.55) && this.get(x, r.y + 1) !== T.AIR) this.set(x, r.y + 1, T.FLAMEVENT);
        continue;
      }

      // 평범한 방 — 흔적(짧은 이야기 조각)을 방마다 하나씩 뿌린다
      const hints = RUIN_HINTS[spec.id];
      if (hints && hintSlot < hints.length && rng.chance(0.55)) {
        this.objects.push({ type: 'lorestone', lore: spec.id, hint: hintSlot,
          x: (r.x + 2) * TS, y: (fy + 1) * TS - 28, w: 22, h: 28 });
        hintSlot++;
      }
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.putDecor(x, r.y + 2, spec.torch, 'any');
      /* 함정은 **세 번** 굴린다. */
      if (rng.chance(TRAP)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(TRAP * 0.8)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(TRAP * 0.5)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(SPIKE)) {
        const sx = r.x + rng.int(2, Math.max(2, r.w - 5));
        for (let k = 0; k < rng.int(2, 2 + Math.round(rank * 0.5)); k++) this.set(sx + k, fy, T.SPIKE);
      }
      // 상자 — 입구에서 멀수록 잘 나온다 거리 보정은 1을 넘지 않게 묶는다 — 넓은 유적에서 far 가 2를 넘어 상자가 쏟아졌다
      const far = Math.min(1, Math.abs(r.x - entX) / Math.max(8, spec.w >> 1));
      if (rng.chance(CHEST + far * 0.14)) {          // 거리 보정도 절반 아래로
        const small = r.w * r.h < 180;
        this.objects.push({ type: 'chest', tier: clamp(spec.tier - 1 + (small ? 1 : 0), 1, 5),
          x: (cx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
      }
    }
    /* 암호 골방은 방 손질이 다 끝난 **뒤에** 세운다 — 앞에서 세우면 고유 방 연출이나 함정이 껍질을 덮어써서 옆으로 파고 들어갈 틈이 생긴다. */
    if (cipherRoom) this.buildCipherVault(spec, cipherRoom, cipherRoom.y + cipherRoom.h - 3, rng, rooms);

    /* ★ 마지막에 연결을 한 번 더 보장한다. */
    this._ensureConnected(x0, y0, spec.w, spec.h, rooms);
    /* ★ 입구가 있으면 입구를 기준으로 삼아 "들어와서 보스까지 갔다가 나갈 수 있는가"가 그대로 검사가 되게 한다. */
    /* 방마다 두 자리를 본다 — 왼쪽 끝과 한가운데(둥지·상자가 놓이는 자리). */
    const spots = [];
    /* 세 번째 값 0 은 "돌아오는 길 검사는 건너뛴다"는 표시다. */
    for (const r of rooms) spots.push([r.x + 2, r.y + r.h - 3, 0], [r.x + (r.w >> 1), r.y + r.h - 3]);
    if (ex !== null) {
      const ent = this._entranceSpots.slice(), mouth = ent.pop();    // 마지막에 넣은 것이 입구 목
      // 기준점(맨 앞)은 입구 목 — "밖에서 들어가 안쪽 끝까지, 그리고 다시 밖으로"가 된다
      spots.unshift(...(mouth ? [mouth] : []), ...ent,
                    /* 입구가 유적에 내려앉는 자리. */
                    this._entranceLandY !== undefined
                      ? [ex, this._entranceLandY]
                      : [clamp(ex, x0 + 1, x0 + spec.w - 2), y0 + 1]);
    }
    /* 실제 손질은 세계를 다 만든 뒤에 한다 — 유적을 지은 다음에도 큰 동굴·물웅덩이· 심층 갱도가 유적을 가로질러 바닥을 헐어 놓는다. */
    this._walkJobs.push([x0, y0, spec.w, spec.h, spots, spec.floor, spec.traps]);
    return site;
  }

  /* ---- 숨겨진 유적 3곳 + 심층 봉인실 ---- */
  buildRuins(rng) {
    this.ruins = [];
    this.ruinEvents = [];
    this.ruinSites = [];                                      // 석판 유적도 같이 담는다 (진단·저장용)
    this._walkJobs = [];                                      // 마지막에 돌릴 통행 검사 목록
    // 석판은 가장 넓은 방에 둔다 — 사연: docs/code-history.md#h120
    /* 서리(0)가 가장 순하고 부패지대(2)가 가장 사납다. */
    /* 입구 성격(entryKind)도 난이도 계단을 따라간다 — 서리는 발판형, 가운데는 미로형, 부패지대는 무발판형. */
    /* ★ 나중에 지어지는 쪽이 먼저 지은 쪽의 방을 덮어써서, 겹친 자리의 방이 통째로 사라지거나 벽이 어긋났다. */
    const spots = [
      { x: SX(420 + SHIFT),  y: SY(220), trap: 0.52, spike: 0.24, chest: 0.56, w: 84, h: 44, tier: 2, traps: ['dart', 'crumble'], entryKind: 'foothold' },
      { x: SX(1700 + SHIFT), y: SY(252), trap: 0.72, spike: 0.38, chest: 0.60, w: 68, h: 40, tier: 3, traps: ['dart', 'crumble', 'vent'], entryKind: 'maze' },
      { x: SX(3860 + SHIFT), y: SY(236), trap: 0.90, spike: 0.52, chest: 0.64, w: 88, h: 48, tier: 4, traps: ['dart', 'vent', 'crumble'], entryKind: 'nofoothold' }
    ];
    /* ★ 도면(hook, ㄴ 자)이 격자 열둘 중 다섯만 쓰는 데다 상자가 작아서, 방 목표를 12 로 올려도 9~10 에서 더 못 잘랐다(d1 9 · d3 10). */
    spots.forEach((sp, i) => {
      const cx = sp.x, cy = sp.y, w = sp.w, h = sp.h;
      const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
      /* 석판 유적도 바이옴 유적과 같은 규격을 쓴다 — 도면(겉모양) · 묻힌 입구 · 고유 장식 · 고유 방 · 고유 이벤트 — 사연: docs/code-history.md#h121 */
      const st = STORY_RUIN[i] || {};
      const spec = {
        id: 'story' + i, n: '석판 유적 ' + (i + 1), x: cx, y: y0, w, h, tier: sp.tier,
        wall: T.RUINBRICK, floor: T.RUINTILE, bg: 10, torch: T.TORCH,
        entryKind: sp.entryKind, plan: st.plan, arch: st.arch,
        decor: st.decor, sig: st.sig, event: st.event, bonus: st.bonus
      };
      const rooms = this.carveDungeon({
        x0, y0, w, h, wall: T.RUINBRICK, floor: T.RUINTILE, bg: 10,
        rng, depth: 5, minW: st.bsp ? st.bsp[1] : 16, minH: st.bsp ? st.bsp[2] : 8,
        target: st.rooms, plan: st.plan
      });
      rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      const main = rooms[0], fy0 = main.y + main.h - 3;
      for (let x = main.x + 3; x < main.x + main.w - 2; x += 8) this.set(x, main.y + 2, T.RUNESTONE);
      this.objects.push({ type: 'tablet', tablet: i, x: (main.x + (main.w >> 1)) * TS, y: (fy0 + 1) * TS - 48, w: 34, h: 48 });
      // 지상에서 내려오는 통로 — 이제 지표 아래에 묻는다(sunken).
      this._ruinCtx = { x0, y0, w, rooms };
      const ex = this.carveRuinEntrance(spec, x0, y0, rng);
      this._ruinCtx = null;
      const entX = ex === null ? cx : ex;
      // 유물이 들어갈 방과 고유 방 — 통로에서 먼 것부터
      const rest = rooms.filter(r => r !== main)
        .sort((a, b) => Math.abs(b.x - entX) - Math.abs(a.x - entX));
      const far = rest[0], sigRoom = rest[1] || rest[0];
      for (const r of rooms) {
        const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
        for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.putDecor(x, r.y + 2, T.TORCH, 'any');
        // 깃발은 벽에 건다 — 벽이 안 닿는 자리면 안 건다(허공에 뜬 깃발이 되지 않게)
      if (r.h > 6) { this.putDecor(r.x + 1, r.y + 4, T.BANNER, 'wall'); this.putDecor(r.x + r.w - 2, r.y + 4, T.BANNER, 'wall'); }
        this.putRuinDecor(spec, r, fy, rng);
        if (r === main) continue;
        if (r === sigRoom && st.sig) { this.buildSigRoom(spec, r, fy, rcx, i, rng); continue; }
        if (rng.chance(sp.trap)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (rng.chance(sp.trap * 0.75)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (rng.chance(sp.trap * 0.45)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (i >= 1 && rng.chance(sp.trap * 0.5)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (rng.chance(sp.spike)) for (let k = 0; k < rng.int(2, 3 + i); k++) this.set(r.x + 3 + k, fy, T.SPIKE);
        // 유물 방은 상자가 확률이 아니라 확정이다 — 유물은 유적마다 하나뿐이라 굴리면 안 된다
        if (r === far || rng.chance(sp.chest * 0.45))   // 유물 방만 확정, 나머지는 드물게
          this.objects.push({ type: 'chest', tier: sp.tier + (r.w * r.h < 180 ? 1 : 0),
            x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null,
            relic: r === far ? RUIN_RELIC['story' + i] : undefined,
            bonus: r === far ? st.bonus : undefined });
      }
      // 암호 골방 — 방 손질이 끝난 뒤에 세운다(앞서 세우면 함정이 껍질을 덮어쓴다)
      if (RUIN_CIPHER[spec.id]) {
        const cr = (st.sig === 'sunshaft' ? sigRoom : rest.find(q => q.w >= 14)) || sigRoom;
        if (cr) this.buildCipherVault(spec, cr, cr.y + cr.h - 3, rng, rooms);
      }
      // 바닥을 갈아 까는 고유 방이 굴을 메울 수 있으므로 마지막에 연결을 다시 보장한다
      this._ensureConnected(x0, y0, w, h, rooms);
      const wsp = [];
      for (const r of rooms) wsp.push([r.x + 2, r.y + r.h - 3, 0], [r.x + (r.w >> 1), r.y + r.h - 3]);
      if (ex !== null) {
        const ent = this._entranceSpots.slice(), mouth = ent.pop();
        wsp.unshift(...(mouth ? [mouth] : []), ...ent, [clamp(ex, x0 + 1, x0 + w - 2), y0 + 1]);
      }
      this._walkJobs.push([x0, y0, w, h, wsp, T.RUINTILE, sp.traps]);  // 걸어서 닿는지는 마지막에
      this.ruins.push({ id: 'story' + i, x: cx, y: cy, w, h });
      this.ruinSites.push({ id: 'story' + i, n: spec.n, x: cx, y: cy, w, h, rooms, idx: i,
                            ent: (this._entranceRooms || []).slice(),
                            traps: (sp.traps || ['dart', 'crumble']).slice() });
    });

    /* --- 바이옴 유적 5곳 (스토리와 무관한 탐험 콘텐츠) --- */
    const mk = Object.keys(MYSTIC);
    const pick = RUIN_SPEC.map((_, i) => i);
    for (let i = pick.length - 1; i > 0; i--) { const j = rng.int(0, i); [pick[i], pick[j]] = [pick[j], pick[i]]; }
    pick.slice(0, 3).forEach((ri, k) => { RUIN_SPEC[ri].mystic = mk[k % mk.length]; });
    pick.slice(3).forEach(ri => { delete RUIN_SPEC[ri].mystic; });

    RUIN_SPEC.forEach((spec, i) => {
      this.ruinSites.push(this.buildRuinSite(spec, i, rng));
      this.ruins.push({ id: spec.id, x: spec.x, y: spec.y + (spec.h >> 1), w: spec.w, h: spec.h });
    });

    // 여명 마을(dawnCity, x 2850~2960) 지하에 둔다 — 사연: docs/code-history.md#h122
    const kx = SX(2800 + SHIFT), ky = SY(350), kw = 56, kh = 26;   // 심층 봉인실 — 여명 마을 지하(서쪽)
    const dx0 = kx - kw / 2;
    this.objects.push({ type: 'seal', x: (dx0 + 1) * TS, y: (ky - 2) * TS, w: 44, h: 66 });
    this.objects.push({ type: 'altar', boss: 'first_keeper', x: kx * TS, y: (ky + kh / 2 - 3) * TS - 48, w: 44, h: 48 });
    this.ruins.push({ id: 'seal', x: kx, y: ky, w: kw, h: kh });
    this.sealRoom = { x: kx, y: ky, w: kw, h: kh, dx: dx0 + 1, dy: ky };

    /* ★ 심층 봉인실로 내려가는 길. */
    const sx0 = clamp(kx - 45, 40, WW - 40);
    const surfY = this.surface[sx0];
    this._entranceLandX = null;
    this._carveEntranceShaft(sx0, surfY + 2, ky + 4, {   // 문턱과 같은 높이에서 끝난다
      w: 26, bg: 10, wall: T.RUINBRICK, floor: T.RUINTILE, torch: T.TORCH,
      entryKind: 'foothold', traps: ['dart', 'crumble', 'gas'],
      lo: sx0 - 22, hi: dx0 - 4                             // 봉인문 서쪽 벽을 넘지 않는다
    }, rng);
    // 지상 표식 — 부러진 기둥 셋.
    for (const dx of [-4, -3, 3, 4]) {          // 목(±1)은 비워 둔다 — 덮으면 못 들어간다
      const gx = sx0 + dx, gy = this.surface[clamp(gx, 0, WW - 1)] - 1;
      for (let k = 0; k < (Math.abs(dx) === 3 ? 3 : 2); k++) this.set(gx, gy - k, T.RUINBRICK);
    }
    /* 방과 통로를 짓는 일은 **세계를 다 만든 뒤로 미룬다**(restoreSealRoom). */
    this.sealRoom.endX = this._entranceLandX === null ? sx0 : this._entranceLandX;
    this.restoreSealRoom();
    /* 내려가는 통로도 다른 유적과 같이 "걸어서 오르내릴 수 있는가"를 본다. */
    const ent = this._entranceSpots.slice(), mouth = ent.pop();
    /* 왼쪽은 통로가 좌우로 꺾이며 내려가는 폭(목 기준 -22)까지 넉넉히 넣는다. */
    const jx0 = sx0 - 24, jw = dx0 - jx0 - 12;
    this._walkJobs.push([jx0, ky - 8, jw, 20,
      [...(mouth ? [mouth] : []), ...ent, [dx0 - 4, ky + 4]], T.RUINTILE,
      ['dart', 'crumble', 'gas']]);
  }

  /** 심층 봉인실의 방·문·복도를 (다시) 짓는다. */
  restoreSealRoom() {
    const s = this.sealRoom;
    if (!s) return;
    const kx = s.x, ky = s.y, kw = s.w, kh = s.h, dx0 = kx - kw / 2;
    for (let x = kx - kw / 2; x <= kx + kw / 2; x++)
      for (let y = ky - kh / 2; y <= ky + kh / 2; y++) {
        const edge = (x <= kx - kw / 2 + 2 || x >= kx + kw / 2 - 2 || y <= ky - kh / 2 + 2 || y >= ky + kh / 2 - 2);
        this.set(x, y, edge ? T.RUINBRICK : T.AIR);
        this.setWall(x, y, 10);
      }
    for (let x = kx - kw / 2 + 3; x < kx + kw / 2 - 2; x++) this.set(x, ky + kh / 2 - 3, T.RUINTILE);
    for (let x = kx - 20; x <= kx + 20; x += 10) this.set(x, ky - kh / 2 + 3, T.RUNESTONE);
    for (let x = kx - 22; x <= kx + 22; x += 6) { this.set(x, ky - 6, T.TORCH); this.set(x, ky + 5, T.TORCH); }
    // 봉인문 (세로 통로) — 열쇠로 연다.
    for (let y = ky - 4; y <= ky + 4; y++) { this.set(dx0 + 1, y, T.SEALSTONE); this.set(dx0 + 2, y, T.SEALSTONE); }
    /* 문 앞 복도와 봉인실 안 계단. */
    const ly = ky + 4, endX = s.endX === undefined ? dx0 - 8 : s.endX;
    for (let x = Math.min(endX, dx0 - 8); x <= dx0; x++) {
      for (let y = ly - 2; y <= ly; y++) { this.set(x, y, T.AIR); this.setWall(x, y, 10); }
      this.set(x, ly + 1, T.RUINTILE);                         // 문턱과 같은 높이의 바닥
    }
    // 안쪽 — 바닥(ky+9)에서 세 칸씩 끊어 문턱(ky+4)까지 오르는 발판 두 줄
    for (let x = dx0 + 3; x <= dx0 + 8; x++) this.set(x, ky + 7, T.PLATFORM);
    for (let x = dx0 + 3; x <= dx0 + 7; x++) this.set(x, ky + 5, T.PLATFORM);
  }

  /** 위치 지도를 세계에 흩뿌린다 — 입구 없는 유적(arch: 'buried')마다 두 군데. */
  buildRuinCaches(rng) {
    for (const spec of RUIN_SPEC) {
      if (spec.arch !== 'buried') continue;
      const mapId = 'ruinmap_' + spec.id;

      // ① 유적 바로 위 — 지표 아래 4~7칸에 묻힌 작은 방
      const cx = clamp(spec.x + rng.int(-6, 6), 40, WW - 40);
      const surf = this.surface[cx];
      const cy = surf + rng.int(4, 7);
      for (let x = cx - 3; x <= cx + 3; x++)
        for (let y = cy - 2; y <= cy + 2; y++) {
          const edge = (x === cx - 3 || x === cx + 3 || y === cy - 2 || y === cy + 2);
          this.set(x, y, edge ? T.RUINBRICK : T.AIR);
          this.setWall(x, y, 10);
        }
      for (let x = cx - 2; x <= cx + 2; x++) this.set(x, cy + 1, T.RUINTILE);
      this.set(cx - 2, cy - 1, T.TORCH);
      this.objects.push({ type: 'chest', tier: 2, ruinmap: mapId,
        x: cx * TS, y: (cy - 0.2) * TS, w: 30, h: 26, items: null });
      // 지상 돌무지 — 파 볼 이유를 만든다
      for (const dx of [-2, -1, 1, 2]) {        // 가운데는 비워 둔다 — 파 내려가는 자리
        const gx = cx + dx, gy = this.surface[clamp(gx, 0, WW - 1)] - 1;
        this.set(gx, gy, T.RUINBRICK);
        if (Math.abs(dx) === 1) this.set(gx, gy - 1, T.RUINBRICK);
      }

      // ② 세계 어딘가의 동굴 — 그 유적에서 멀리 떨어진 자리
      const cav = (this.caverns || []).filter(c => Math.abs(c.cx - spec.x) > 500);
      if (!cav.length) continue;
      const pick = cav[rng.int(0, cav.length - 1)];
      let px = clamp(pick.cx + rng.int(-6, 6), 40, WW - 40), py = pick.cy;
      for (let k = 0; k < 40 && py < WH - 8; k++) {          // 그 동굴 안에서 바닥을 찾는다
        if (this.get(px, py) === T.AIR && TILE_DEF[this.get(px, py + 1)].solid === 1) break;
        py++;
      }
      if (this.get(px, py) !== T.AIR) continue;
      this.objects.push({ type: 'chest', tier: 3, ruinmap: mapId,
        x: px * TS, y: (py - 0.2) * TS, w: 30, h: 26, items: null });
      this.set(px - 1, py, T.TORCH);
    }
  }

  /** 좌표가 유적 내부인지 */
  inRuin(tx, ty) {
    return !!this.ruinAt(tx, ty);
  }
  /** 이 좌표가 속한 유적 자체를 돌려준다 (id 가 붙어 있으면 어느 유적인지도 안다). */
  ruinAt(tx, ty) {
    if (!this.ruins) return null;
    for (const r of this.ruins)
      if (tx > r.x - r.w / 2 && tx < r.x + r.w / 2 && ty > r.y - r.h / 2 && ty < r.y + r.h / 2) return r;
    return null;
  }
  /** 이 좌표가 속한 바이옴 유적의 잡몹 배율. */
  ruinMobMul(tx, ty) {
    for (const spec of RUIN_SPEC) {
      const hw = spec.w / 2, y0 = spec.y, y1 = spec.y + spec.h;
      if (tx > spec.x - hw && tx < spec.x + hw && ty > y0 - 2 && ty < y1 + 2)
        return spec.mobMul === undefined ? 1 : spec.mobMul;
    }
    return 1;
  }

  buildAltars(rng) {
    // 제단 밑면이 바닥 타일 윗면에 정확히 닿도록: y = 바닥행*TS - h 부패 제단
    const cx1 = SX(2500 + SHIFT), sy1 = this.surface[cx1];
    this.clearBox(cx1 - 14, sy1 - 14, 28, 14);
    for (let x = cx1 - 14; x < cx1 + 14; x++) { this.set(x, sy1, T.EBONSTONE); this.set(x, sy1 + 1, T.EBONSTONE); }
    this.objects.push({ type: 'altar', boss: 'corrupt_heart', x: cx1 * TS, y: sy1 * TS - 44, w: 40, h: 44 });
    // 서리 왕좌
    const cx2 = SX(210 + SHIFT), sy2 = this.surface[cx2];   // 원래 자리 그대로 (밀린 만큼만 옮겨 간다)
    this.clearBox(cx2 - 16, sy2 - 15, 32, 15);
    for (let x = cx2 - 16; x < cx2 + 16; x++) { this.set(x, sy2, T.BRICK); this.set(x, sy2 + 1, T.BRICK); }
    this.objects.push({ type: 'altar', boss: 'frost_witch', x: cx2 * TS, y: sy2 * TS - 44, w: 40, h: 44 });
    // 슬라임 제단 (마을 근처 언덕) — 베이스캠프(vx0..vx1 = 1000..1100, 여유폭 포함 984..1115)와 겹치지 않도록 서쪽으로 충분히 떨어뜨려 둔다
    const cx3 = SX(800 + SHIFT), sy3 = this.surface[cx3];
    this.clearBox(cx3 - 14, sy3 - 13, 28, 13);
    for (let x = cx3 - 14; x < cx3 + 14; x++) { this.set(x, sy3, T.STONE); this.set(x, sy3 + 1, T.STONE); }
    this.objects.push({ type: 'altar', boss: 'king_slime', x: cx3 * TS, y: sy3 * TS - 44, w: 40, h: 44 });
    // 심연 투기장
    const cx4 = SX(1400 + SHIFT), cy4 = WORLD_BOT - 17;
    this.clearBox(cx4 - 36, cy4 - 22, 72, 22);
    for (let x = cx4 - 36; x < cx4 + 36; x++) { this.set(x, cy4, T.OBSIDIAN); this.set(x, cy4 + 1, T.OBSIDIAN); }
    for (let x = cx4 - 36; x < cx4 + 36; x++) for (let y = cy4 - 22; y < cy4; y++) this.setWall(x, y, 3);
    this.objects.push({ type: 'altar', boss: 'void_king', x: cx4 * TS, y: cy4 * TS - 48, w: 44, h: 48 });
    for (let x = cx4 - 32; x < cx4 + 33; x += 9) this.set(x, cy4 - 20, T.TORCH);
  }

  clearBox(x0, y0, w, h) {
    for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) {
      if (this.get(x, y) === T.LAVA || this.get(x, y) === T.BEDROCK) continue;
      this.set(x, y, T.AIR);
    }
  }

  /** 큰 동굴을 여러 개 드렁커드 워크로 파낸다. */
  /* ================= 동굴 갈래 (data.js CAVE_TYPES) ================= */
  caveTypeAt(tx, ty) {
    if (!this.caveGrid || ty < 0 || ty >= HELL_Y) return 0;
    const gx = Math.floor(tx / CAVE_GW), gy = Math.floor(ty / CAVE_GH);
    return this.caveGrid[gy * this._cgW() + gx] || 0;
  }
  _cgW() { return Math.ceil(WW / CAVE_GW); }
  /** 플레이어가 선 자리의 동굴 갈래 — **자연 굴 안**일 때만(지표 12칸 아래 · 지층 벽지 · 유적 밖). */
  caveKindAt(tx, ty) {
    if (!this.caveGrid || !this.inB(tx, ty) || ty <= this.surface[tx] + 12) return 0;
    if (!this._natural) {
      this._natural = new Set();
      for (const k in MAT_LAYER) { this._natural.add(MAT_LAYER[k].wall); this._natural.add(MAT_LAYER[k].subWall); }
    }
    if (!this._natural.has(this.walls[ty * WW + tx]) || this.ruinAt(tx, ty)) return 0;
    return this.caveTypeAt(tx, ty);
  }

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
      if (inSeaZone(x) || (x > CAMP_X0 - 30 && x < CAMP_X1 + 30)) continue;
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
  }

  /** 금 간 자갈 — 동굴 옆벽에 판 작은 굴(오목한 자리) 안쪽 끝에 박는다. */
  buildFaults(rng, natural) {
    this.faults = [];
    let tries = 0;
    while (this.faults.length < Math.round(FAULT.count * WSX * WSY) && tries++ < 6000 * WSX * WSY) {
      const x = rng.int(40, WW - 40);
      if (inSeaZone(x) || (x > CAMP_X0 - 60 && x < CAMP_X1 + 60)) continue;
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
  }

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
  }

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
  }

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
  }

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
    if (tx >= CAMP_X0 - 24 && tx <= CAMP_X1 + 24) return true;
    const dc = this.dawnCity;
    if (dc && tx >= dc.x0 - 24 && tx <= dc.x1 + 24) return true;
    return false;
  }

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
  }

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
  }

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
  }

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
  }

  /** 이 x열에서 (x, yFrom) 아래로 처음 만나는 "고체 위의 빈칸"을 찾는다 */
  _floorBelow(x, yFrom, limit) {
    for (let y = yFrom; y < Math.min(WH - 6, yFrom + limit); y++) {
      if (this.get(x, y) === T.AIR && TILE_DEF[this.get(x, y + 1)].solid) return y;
    }
    return -1;
  }
  /** 같은 열에서 가장 낮은 바닥 — 큰 동굴은 중간에 선반이 여러 겹이라 첫 바닥이 진짜 바닥이 아니다 */
  _deepFloor(x, yTop, yBot) {
    let found = -1;
    for (let y = yTop; y < Math.min(WH - 6, yBot); y++) {
      if (this.get(x, y) === T.AIR && TILE_DEF[this.get(x, y + 1)].solid) found = y;
    }
    return found;
  }
  /** y 언저리에서 바닥 높이를 찾는다 (평탄한지 재는 데 쓴다) */
  _floorNear(x, y) {
    for (let d = -2; d <= 3; d++) {
      const yy = y + d;
      if (yy < 6 || yy >= WORLD_BOT - 6) continue;
      if (this.get(x, yy) === T.AIR && TILE_DEF[this.get(x, yy + 1)].solid) return yy;
    }
    return -1;
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  /** 이 열 위로 전주가 서 있는가 — 전주 기둥은 타일이 아니라 그림이라(factory.js), 그 아래를 밭으로 갈면 작물이 기둥과 겹쳐 그려진다. */
  poleColumn(x, y) {
    for (let ty = y - 1; ty >= y - 40 && ty > 2; ty--) {
      const m = this.machines.get(ty * WW + x);
      if (m) return m.t === 'pole';
      if (this.solid(x, ty)) return false;
    }
    return false;
  }

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
  }

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
  }

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
  }

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
  }

  /* ================= 충돌 ================= */
  /** 사각형이 고체 타일과 겹치는지 */
  hitSolid(px, py, w, h) {
    const x0 = Math.floor(px / TS), x1 = Math.floor((px + w - 0.01) / TS);
    const y0 = Math.floor(py / TS), y1 = Math.floor((py + h - 0.01) / TS);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (this.solid(x, y)) return true;
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
  /** 발판(위에서만 막힘) 검사: 이전 하단이 발판 위에 있었어야 함 */
  hitPlatform(px, py, w, h, prevBottom) {
    const x0 = Math.floor(px / TS), x1 = Math.floor((px + w - 0.01) / TS);
    const y0 = Math.floor(py / TS), y1 = Math.floor((py + h - 0.01) / TS);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (!this.platform(x, y)) continue;
      const top = y * TS;
      if (prevBottom <= top + 2 && py + h > top) return top;
    }
    return -1;
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
    // 4방향 스윕 x2
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = y * w + x;
        let v = L[k];
        if (x > 0) v = Math.max(v, L[k - 1] - dec(x0 + x, y0 + y));
        if (y > 0) v = Math.max(v, L[k - w] - dec(x0 + x, y0 + y));
        L[k] = v;
      }
      for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
        const k = y * w + x;
        let v = L[k];
        if (x < w - 1) v = Math.max(v, L[k + 1] - dec(x0 + x, y0 + y));
        if (y < h - 1) v = Math.max(v, L[k + w] - dec(x0 + x, y0 + y));
        L[k] = v;
      }
    }
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
      caverns: this.caverns, pools: this.pools, lavaPools: this.lavaPools, falls: this.falls,
      caveGrid: this.caveGrid ? Array.from(this.caveGrid) : null, faults: this.faults || [],
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
    // 동굴 갈래 도입 전 세이브 — 갈래가 없으면 모든 굴이 plain 이고, 무너질 자갈도 없다
    w.caveGrid = d.caveGrid ? Uint8Array.from(d.caveGrid) : null;
    w.faults = d.faults || [];
    // 유체 — 샘 없는 옛 폭포에 샘을 달아 주고 켠다(springFalls 의 ★)
    w.springFalls();
    w.fluidInit();
    return w;
  }
}
