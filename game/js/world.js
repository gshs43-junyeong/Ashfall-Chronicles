/* ===== world.js — 세계 생성 / 충돌 / 조명 ===== */
'use strict';

const TS = 22;              // 타일 픽셀 크기
const WW = 4200;            // 세계 가로(타일) — 5단계에서 1.5배로 넓히고 바이옴 둘을 더 넣었다
const WH = 480;             // 세계 세로(타일) — 지하 깊이 2배
const SURF_BASE = 70;       // 기준 지표 높이
const HELL_Y = 390;         // 지옥 시작 깊이
const DEEP_Y = 280;         // 심층 시작
const SKY_Y = 40;           // 하늘 섬 구역 (이보다 위)
const MIN_CAVE = 30;        // 이보다 작고 고립된 공동은 동굴로 치지 않고 메운다(타일 수)
const CAMP_X0 = 1000, CAMP_X1 = 1100;   // 베이스캠프 — 잿빛 숲 (zoneAt에서도 참조)

/* 바이옴.
   card 는 처음 발을 들일 때 한 번 뜨는 안내(유적 카드와 같은 자리를 쓴다).
     ★ 무엇이 사는가가 아니라 **그 땅이 어떤 곳인가**를 적는다 — 몹 소개가 아니다.
   air 는 그 땅의 공기색. 화면 전체에 옅게 덮는다.
     처음에는 0.05 안팎으로 뒀는데 눈에 거의 안 잡혀서 두 배 반쯤 올렸다.
     ★ **세션 2 권역(동쪽 숲 · 버섯 골짜기 · 부패한 땅)은 한 번 더 진하게.**
       세션 2 내용이 그쪽에 몰려 있어서, 색으로 "여기부터 다른 판"이라고 말해 준다.
     경계에서는 biomeMix 로 두 색을 섞어 넘어가므로 선이 보이지 않는다. */
const BIOMES = [
  { id: 'ice', x0: 0, x1: 620, n: '서리 지대',
    card: { sub: '서쪽 끝', line: '눈이 소리를 먹는다. 밟은 자리가 오래 남는 땅.' },
    air: { c: '#a8c8ee', a: 0.19 } },
  { id: 'forest', x0: 620, x1: 1400, n: '잿빛 숲',
    card: { sub: '시작한 자리', line: '재가 잎을 대신한 숲. 나무는 서 있으나 그늘이 없다.' },
    air: { c: '#b0aa90', a: 0.11 } },
  { id: 'jungle', x0: 1400, x1: 2000, n: '울림 정글',
    card: { sub: '남쪽 골짜기', line: '골이 깊어 소리가 되돌아온다. 젖은 공기가 무겁다.' },
    air: { c: '#5fbf86', a: 0.15 } },
  { id: 'desert', x0: 2000, x1: 2680, n: '메마른 사구',
    card: { sub: '가운데 모래', line: '물이 마른 자리에 바람이 길을 낸다. 낮과 밤이 다른 땅.' },
    air: { c: '#e8be74', a: 0.18 } },
  { id: 'forest2', x0: 2680, x1: 3300, n: '동쪽 숲',
    card: { sub: '마을 언저리', line: '재가 덜 닿은 숲. 사람이 아직 길을 내고 사는 곳.' },
    air: { c: '#93c47a', a: 0.15 } },
  { id: 'glowfen', x0: 3300, x1: 3760, n: '버섯 골짜기',
    card: { sub: '내려앉은 땅', line: '땅이 통째로 꺼져 갓이 자랐다. 어둠이 스스로 빛난다.' },
    air: { c: '#6fe0c4', a: 0.24 } },
  { id: 'corrupt', x0: 3760, x1: WW, n: '부패한 땅',
    card: { sub: '동쪽 끝', line: '별이 떨어진 자리. 흙까지 물들어 되돌릴 수 없다.' },
    air: { c: '#a874e0', a: 0.27 } }
];
const BIOME_BAND = 104;     // 바이옴 경계 블렌딩 폭(타일)

/* 바이옴이 아닌 구역의 이름표 — 원경 그림이 바뀌는 자리와 짝이다(G.bgId).
   베이스캠프와 여명 마을은 제 배경 그림을 따로 쓰므로 여기 이름을 붙여 둔다. */
const ZONE_CARD = {
  camp: { n: '베이스캠프', sub: '잿빛 숲 한복판',
          card: { line: '살아남은 이들이 처음 불을 피운 자리. 여기서부터 다시 센다.' } },
  village: { n: '여명 마을', sub: '재를 이고 사는 곳',
             card: { line: '재가 내린 뒤에도 굴뚝이 서 있다. 사람이 남긴 마지막 거리.' } }
};

/* 재질 번호 → 지층 구성. 예전에는 삼항 연산자를 길게 이어 붙였는데,
   바이옴이 늘어나면서 표로 뽑았다. wall은 배경 벽 색 번호(WALL_COLOR). */
const MAT_LAYER = [
  { top: T.SNOW, soil: T.SNOW, sub: T.ICE, deep: T.STONE, wall: 5, subWall: 2 },
  { top: T.GRASS, soil: T.DIRT, sub: T.DIRT, deep: T.STONE, wall: 1, subWall: 2 },
  { top: T.SAND, soil: T.SAND, sub: T.SANDSTONE, deep: T.STONE, wall: 8, subWall: 2 },
  { top: T.CORRUPTGRASS, soil: T.CORRUPTGRASS, sub: T.EBONSTONE, deep: T.EBONSTONE, wall: 3, subWall: 3 },
  { top: T.JUNGLEGRASS, soil: T.MUD, sub: T.MUD, deep: T.STONE, wall: 11, subWall: 11 },
  { top: T.GLOWMOSS, soil: T.DIRT, sub: T.SPORESTONE, deep: T.STONE, wall: 12, subWall: 12 }
];
const MAT_OF = { ice: 0, forest: 1, forest2: 1, desert: 2, corrupt: 3, jungle: 4, glowfen: 5 };

/* ================= 여명 마을 배치표 =================
   마을 지면(gy-3 ~ gy-1)을 쓰는 것은 **전부 여기서** 정한다.

   왜 표로 뽑았나: 예전에는 좌표가 buildDawnCity·restoreDawnCity·upgradeVillage 세 곳에
   흩어져 있어서, 하나를 옮겼을 때 무엇과 겹치는지 알 방법이 없었다. 그 결과 실제로
   ─ 길 한복판에 3칸짜리 돌기둥이 7개 서서 거리를 막고(건물 0·1 사이는 통행 불가),
   ─ 분수 한가운데로 벽돌이 뚫고 올라오고,
   ─ 책장이 지붕 높이 허공에 떠 있고,
   ─ 용광로가 건물 벽 안에 박혀 있었다.
   이제 여기서만 정하고, restoreDawnCity가 놓기 직전에 checkDawnLayout()이 겹침을
   전부 잡아낸다(겹치면 콘솔에 어느 둘이 몇 칸 겹쳤는지 찍는다).

   단위는 전부 타일. 건물은 x0(마을 서쪽 끝) 기준, 광장은 cx(광장 중심) 기준 오프셋. */
const DAWN_BUILDINGS = [
  // off: 시작 칸, w/h: 폭·높이, npc/fac: 그 안에 사는 사람과 시설.
  // 작업대는 원래 광장(DAWN_PLAZA)에 있었는데, "왼쪽으로 옮겨서 집 안으로" 요청을 받고
  // 조련사네 집(비어 있던 fac 슬롯)으로 옮겼다 — 새 슬롯을 만드는 대신 원래도 시설을
  // 넣게 되어 있던 자리를 채운 것뿐이라 겹칠 자리가 없다.
  { off:  2, w: 18, h: 10, npc: 'haran',   fac: 'inn'       },   // 여관
  { off: 24, w: 17, h: 13, npc: 'tamer',   fac: 'workbench' },   // 조련사
  { off: 70, w: 17, h: 13, npc: 'seira',   fac: 'reforge'   },   // 재련
  { off: 93, w: 18, h: 10, npc: 'trainer', fac: 'vault'     }    // 훈련소 · 보관고
];
/* v1.1 예정 — 여명 마을 상인 NPC(무작위 재고 거래).
   마을 3단계부터 열리고, 2층이 있는 집(h:13 — 위 표의 1번 조련사네 / 2번 재련네) 중
   하나의 2층에 세운다. 2층은 upgradeVillage(2)에서 만들어지고 그 안에는 지금 책장만
   있으므로(b.x+b.w-5 자리), 상인은 그 반대쪽(사다리 b.x+8 과 책장 사이가 아니라
   b.x+2~4 부근)에 두면 계단·책장과 안 겹친다. 재고는 마을 단계·날짜(dayCount)로
   굴려서 하루 단위로 갱신하는 방향. */
/* 건물 안 배치 — 건물 시작점 기준. 네 건물 중 가장 좁은 것이 폭 17이고 벽이 off+16이라,
   마지막 탁자(off+14)까지 전부 들어간다. 문은 벽(off+0 · off+w-1)에 뚫으므로 여기 없다. */
const DAWN_INSIDE = { shelf: 2, npc: 6, fac: 10, table: 14 };

/* 광장 — 건물1과 건물2 사이. 왼쪽부터 순서대로 늘어놓는다.
   off는 cx 기준 시작 칸, w는 잡아 두는 칸 수(그림이 더 좁으면 그 안에서 가운데 정렬).

   ★ fountain은 반드시 cx 중심(off -2, w 5)이어야 한다 — 바로 아래가 지하 공창
     승강기 수직축(buildWorks가 cx-2..cx+2를 뚫는다)이고, 9장 대사 "광장 한복판,
     분수대를 들어내자 아래로 곧게 뚫린 수직 통로가 나왔다"와 짝이기 때문이다. */
// 작업대는 조련사네 집 안(DAWN_BUILDINGS[1].fac)으로 옮겨서 여기 목록엔 없다.
const DAWN_PLAZA = [
  { id: 'kade',      off: -10, w: 1 },
  { id: 'board',     off:  -7, w: 2 },
  { id: 'fountain',  off:  -2, w: 5 },
  { id: 'townhall',  off:   4, w: 2 },
  { id: 'waystone',  off:   8, w: 2 },
  { id: 'forge',     off:  12, w: 2 }
];
/* 광장 물건의 실제 그림 크기(px). 위 w(칸)보다 좁으면 그 칸 안에서 가운데로 맞춘다. */
const DAWN_OBJ = {
  // v1.0.4: 베이스캠프·여명 마을·플레이어가 직접 놓는 것 전부 같은 크기(OBJ_SIZE)를
  // 쓴다 — "베이스캠프 용광로와 마을 용광로, 설치하는 용광로 크기가 다르다"는 지적
  workbench: { type: 'workbench', w: OBJ_SIZE.workbench.w, h: OBJ_SIZE.workbench.h, lv: 1 },
  kade:      { type: 'npc', npc: 'kade', w: 22, h: 44 },
  board:     { type: 'board', w: 34, h: 44 },
  fountain:  { type: 'fountain', w: 110, h: 66 },
  townhall:  { type: 'townhall', w: 36, h: 46 },
  waystone:  { type: 'waystone', w: 30, h: 48 },
  forge:     { type: 'forge', w: OBJ_SIZE.forge.w, h: OBJ_SIZE.forge.h, lv: 1 },
  // 건물 안에 놓이는 것들 (DAWN_BUILDINGS의 npc/fac가 가리킨다)
  // v1.0.4: 침대가 작고 바닥과 안 이어져 있다는 지적 — 2칸 슬롯(44px) 꽉 채우게
  // 키우고, 그리는 쪽(game.js drawFacility)도 발판이 o.h 바닥에 딱 붙게 다시 그림
  inn:       { type: 'inn', w: 44, h: 34 },
  reforge:   { type: 'reforge', w: 44, h: 40 },
  vault:     { type: 'vault', w: 40, h: 36 },
  // v1.0.4: 가구가 너무 작게 배정돼 있었다(다른 물건 대비 왜소해 보임) — 책장은
  // 슬롯(1칸=22px) 안에서 키울 수 있는 만큼, 탁자는 슬롯 자체를 2칸으로 늘려서 키움
  // v1.0.4: 가구가 작다는 지적을 두 번 받았다 — 이번엔 책장도 작업대·용광로와
  // 같은 2칸(44px) 규모로 키운다(DAWN_INSIDE.shelf 슬롯도 2칸으로 맞춤).
  shelf:     { type: 'furniture', kind: 'shelf', w: 36, h: 42, tw: 2, th: 2 },
  table:     { type: 'furniture', kind: 'table', w: 28, h: 20 },
  npcBase:   { type: 'npc', w: 22, h: 44 }   // 건물 주민 — npc 이름만 갈아 끼워 쓴다
};
/* 3단계 성벽 — 마을 양 끝 바깥. 건물과 겹치지 않게 x0/x1에서 넉넉히 띄운다.
   문루가 성문 위로 3칸 폭이라 wallOff는 최소 3 이상이어야 건물 처마와 안 부딪힌다. */
const DAWN_WALL = { leftOff: -16, rightOff: 15, gateH: 3, towerH: 14,
  /* 성벽에서 이만큼 더 바깥까지 지면을 평평하게 깎는다. 성문 밖이 흙벽이나
     낭떠러지가 되지 않게 하는 값이라, 성벽 위치를 옮기면 이것도 같이 본다. */
  flatPad: 10 };

class World {
  constructor(seed) {
    this.seed = seed;
    this.rng = new RNG(seed);
    this.tiles = new Uint8Array(WW * WH);
    this.walls = new Uint8Array(WW * WH);
    this.surface = new Int16Array(WW);
    this.objects = [];          // 작업대/용광로/상자/NPC/제단
    this.doors = [];            // objects의 부분집합(같은 참조) — 충돌 판정을 빠르게 하려고 따로 캐싱
    /* 공장 기계. 타일 인덱스(y*WW+x) → 기계 상태. 지형은 tiles 배열이 이미 들고 있고
       여기에는 방향·버퍼·연료 같은 "칸마다 다른 상태"만 둔다. Map이라 위치 조회가 O(1)이고,
       기계가 몇 개든 실제로 존재하는 것만 순회하게 된다. */
    this.machines = new Map();
    this.netDirty = true;       // 전력망을 다시 계산해야 하는가 (기계 설치/철거 시 켜진다)
    this.nets = [];
    /* 심어 둔 작물의 타일 인덱스. 지형을 훑지 않고 이것만 돌면 되니까,
       작물이 몇 포기든 성장 처리 비용이 심은 만큼만 든다 (플레이어가 멀리 있어도 자란다). */
    this.crops = new Set();
    /* 부서진 바닥이 되돌아올 시각. 기계와 달리 상태가 거의 없어서 Map 하나면 된다 */
    this.crumbled = new Map();
    /* 화면에 실제로 그려진 적이 있는 타일만 1로 표시한다 — 미니맵·전체 지도의 안개 기준.
       세이브에도 담아 재접속해도 그동안 밟아 본 곳은 그대로 보이게 한다. */
    this.explored = new Uint8Array(WW * WH);
    this.spawnX = 180; this.spawnY = 0;
    this.lightBuf = null; this.lbx = 0; this.lby = 0; this.lbw = 0; this.lbh = 0;
  }

  i(x, y) { return y * WW + x; }
  inB(x, y) { return x >= 0 && y >= 0 && x < WW && y < WH; }
  get(x, y) { return this.inB(x, y) ? this.tiles[y * WW + x] : T.BEDROCK; }
  wall(x, y) { return this.inB(x, y) ? this.walls[y * WW + x] : 0; }
  set(x, y, t) { if (this.inB(x, y)) this.tiles[y * WW + x] = t; }
  setWall(x, y, w) { if (this.inB(x, y)) this.walls[y * WW + x] = w; }
  solid(x, y) { const d = TILE_DEF[this.get(x, y)]; return d.solid === 1; }
  platform(x, y) { return TILE_DEF[this.get(x, y)].solid === 2; }
  hurtTile(x, y) { return TILE_DEF[this.get(x, y)].hurt || 0; }
  liquid(x, y) { return !!TILE_DEF[this.get(x, y)].liquid; }
  /** 사각형이 물에 얼마나 잠겼는지 0~1. 부력·저항의 세기를 여기에 비례시킨다.
      떨어지는 물(flow)에 닿아 있으면 flow도 함께 알려 준다 — 아래로 밀려나야 하므로. */
  liquidIn(px, py, w, h) {
    const x0 = Math.floor(px / TS), x1 = Math.floor((px + w - 0.01) / TS);
    const y0 = Math.floor(py / TS), y1 = Math.floor((py + h - 0.01) / TS);
    let n = 0, tot = 0, flow = 0;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      tot++;
      const d = TILE_DEF[this.get(x, y)];
      if (!d.liquid) continue;
      n++;
      if (d.flow) flow = 1;
    }
    return { f: tot ? n / tot : 0, flow };
  }
  /** 사각형이 겹치거나 맞닿은 타일 중 가장 큰 hurt값을 돌려준다. 1px 여유를 두는 이유 —
      고체 함정(큰 선인장 등)은 충돌 처리가 항상 틈 0으로 딱 붙여 놓기만 하지 절대 겹치게
      두지 않아서, 겹침만 보면 스치기만 해도 걸려야 할 피해가 영영 안 걸린다. */
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
    // 베이스캠프·여명 마을 — 안전 지대. 지상뿐 아니라 그 바로 밑 지하도 포함해
    // 마을 아래를 파고 들어온 몹이 광장으로 올라오는 것도 막는다
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
      if (b === 'ice') return 'ice';
      if (b === 'jungle') return 'jungle';       // 정글은 지하도 정글이다 (뿌리와 진흙층)
      if (b === 'glowfen') return 'glowfen';
      return 'cave';
    }
    if (b === 'corrupt') return 'corrupt';
    if (b === 'ice') return 'ice';
    if (b === 'jungle') return 'jungle';
    if (b === 'glowfen') return 'glowfen';
    return 'surface';
  }
  /** 상자 보상은 지형 이름이 아니라 실제 위치 프로필로 고른다.
      일반 유적은 진행을 건너뛰지 않게 낮추고, 세션 2 공창/폭주로는 고티어 보상을 유지한다. */
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
      // 하한을 하늘 구역(SKY_Y) 위로 넉넉히 띄워, 이중 점프로도 지상에서 하늘 구역에 닿지 않게 한다
      rawH[x] = clamp(h, 58, 108);
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
    const dx0 = 2850, dx1 = 2960;          // 여명 마을 — 동쪽 숲
    const dh = this.surface[(dx0 + dx1) >> 1];
    /* 평탄화는 **3단계 성벽 자리 바깥까지** 완전히 평평해야 한다.
       예전에는 dx0-16에서 dx0까지 서서히 기울여서, 하필 성벽이 서는 그 칸(dx0-16,
       dx1+15)이 아직 자연 지형이었다. 그래서 성문을 열고 나가면 서쪽은 4칸짜리 흙벽,
       동쪽은 5칸 낭떠러지였다 — 문이 지형에 파묻혀 있었던 것.
       이제 성벽에서 EDGE칸 더 바깥까지 평평하게 두고, 경사는 그 바깥에서만 준다. */
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
      for (let y = s; y < WH; y++) {
        let t;
        const depth = y - s;
        if (y >= WH - 4) t = T.BEDROCK;
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
    for (let x = 1; x < WW - 1; x++) {
      const s = this.surface[x];
      for (let y = s + 4; y < WH - 5; y++) {
        const scale = y > DEEP_Y - 36 ? 0.055 : 0.075;
        let v = n2(x, y, scale, 3);
        // 깊을수록 큰 공동
        const bias = y > DEEP_Y ? 0.06 : y > 180 ? 0.03 : 0;
        if (v > 0.63 - bias && v < 0.80 + bias) this.tiles[this.i(x, y)] = T.AIR;
        // 좁은 통로
        if (n3(x, y, 0.13, 2) > 0.80 && y > s + 10) this.tiles[this.i(x, y)] = T.AIR;
      }
    }

    // --- 3-B. 자잘한 구멍 메우기 ---
    // 노이즈로 파면 한두 칸짜리 공동이 잔뜩 생겨서, 지하가 "동굴"이 아니라 "구멍 숭숭"으로 보인다.
    // 이어진 덩어리 단위로 크기를 재서 기준보다 작고 바깥과 통하지도 않는 것은 도로 메운다.
    this.pruneSmallCaves(MIN_CAVE);

    // --- 4. 부패 지대 균열 ---
    for (const b of BIOMES) {
      if (b.id !== 'corrupt') continue;
      for (let k = 0; k < 24; k++) {
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
    // 밀도를 이전의 약 35%로 낮추고, 대신 각 광맥의 등장 깊이 구간을 넓게 폈다
    // [타일, y0, y1, 개수, 크기, (x0), (x1)] — x 범위를 주면 그 구간에만 생긴다
    const oreSpec = [
      [T.COPPER, 74, 200, 700, 5],
      [T.IRON, 100, 300, 730, 5],
      [T.GOLD, 150, 360, 480, 4],
      [T.MYTHRIL, 240, 400, 360, 4],
      [T.CRYSTAL, 190, 390, 280, 3],
      [T.SOULSTONE, 300, 420, 200, 3],
      [T.HELLSTONE, HELL_Y, WH - 6, 600, 5],
      /* --- 3단계 동력 자원 ---
         석탄은 얕은 곳부터 지옥 직전까지 어느 바이옴에나 흔하게 깔아 두어, 공장 1세대를
         시작하는 문턱을 낮췄다. 납은 중간 깊이, 석유(유혈암)는 사막 지하에만 — 사막까지
         벨트를 끌고 갈 이유를 만들기 위해서다. */
      [T.COAL, 80, HELL_Y - 10, 1500, 6],
      [T.LEAD, 110, 330, 560, 5],
      [T.OILSHALE, 150, 300, 620, 6, 2000, 2680]
    ];
    // 표의 개수는 폭 2800 기준이라, 세계가 넓어진 만큼 그대로 곱해 밀도를 유지한다
    const oreScale = WW / 2800;
    for (const [tile, y0, y1, count, size, ox0, ox1] of oreSpec) {
      const n = Math.round(count * (ox0 === undefined ? oreScale : 1));
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

    // --- 6. 지옥 용암 ---
    for (let x = 0; x < WW; x++) {
      for (let y = HELL_Y + 6; y < WH - 6; y++) {
        if (n2(x + 5000, y, 0.05, 2) > 0.66 && this.get(x, y) === T.AIR) {
          let below = false;
          for (let d = 1; d < 4; d++) if (this.solid(x, y + d)) below = true;
          if (below) this.set(x, y, T.LAVA);
        }
      }
    }

    // --- 7. 나무 / 덩굴 ---
    for (let x = 4; x < WW - 4; x++) {
      const s = this.surface[x];
      if (x > vx0 - 6 && x < vx1 + 6) continue;
      if (x > dx0 - 10 && x < dx1 + 10) continue;
      const g = this.get(x, s);
      if (g === T.GRASS && rng.chance(0.14)) this.tree(x, s, rng, T.WOOD, T.LEAF);
      else if (g === T.CORRUPTGRASS && rng.chance(0.11)) this.tree(x, s, rng, T.WOOD, T.CORRUPTLEAF);
      else if (g === T.SNOW && rng.chance(0.08)) this.tree(x, s, rng, T.WOOD, T.LEAF);
      // 정글은 나무가 빽빽하고 키가 크다 — 수관이 겹쳐 아래가 늘 어둡다
      else if (g === T.JUNGLEGRASS && rng.chance(0.34)) this.jungleTree(x, s, rng);
      // 버섯 골짜기는 나무 대신 큰 발광 버섯이 자란다
      else if (g === T.GLOWMOSS && rng.chance(0.2)) this.glowStalk(x, s, rng);
      // 채집물을 흩뿌린다 (나무가 없는 자리에만) — 캐면 제작 재료가 되는 아이템이라
      // 예전 순수 장식 때보다 밀도를 눈에 띄게 올렸다
      else if (g === T.GRASS && this.get(x, s - 1) === T.AIR) {
        if (rng.chance(0.10)) this.set(x, s - 1, T.FLOWER);
        else if (rng.chance(0.18)) this.set(x, s - 1, T.WEED);
      } else if (g === T.SAND && this.get(x, s - 1) === T.AIR) {
        // 사막은 선인장이 주가 되어야 한다 — 잡초는 아주 드물게만.
        // 일부는 밟으면 아픈 큰 선인장(고체 블록)으로 세운다
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
    this.buildJungleFalls(rng);
    this.scatterChests(rng);
    this.buildAltars(rng);
    /* 마지막으로 유적을 **걸어서** 오갈 수 있는지 확인하고 고친다.
       유적을 지은 뒤에도 동굴·물·갱도가 유적을 헐고 지나가므로, 다 만든 다음에 봐야
       한다. 자세한 것은 _ensureWalkable 참고. */
    this.restoreSealRoom();      // 동굴이 헐고 간 봉인실 바닥·문 앞 복도를 되돌린다
    for (const j of this._walkJobs || []) this._ensureWalkable(j[0], j[1], j[2], j[3], j[4], j[5], j[6], rng);
    this.ensureEntranceTraps(rng);   // 함정 없이 그냥 걸어 들어가는 문을 남기지 않는다
    this.sealCipherVaults();         // 암호 골방의 껍질을 한 번 더 세운다

    this.spawnX = (vx0 + vx1) >> 1;
    this.spawnY = vh - 3;
    this.fitObjects();
    return this;
  }

  /** 설치물을 한 타일 규격(OBJ_SIZE)으로 맞춘다.
      상자만 해도 생성 지점이 열 곳 넘게 흩어져 있어서 자리마다 크기를 고쳐 넣는 대신,
      다 만들고 나서 한 번에 규격화한다(새 생성 지점이 늘어도 저절로 따라온다).
      밑변과 가로 중심은 그대로 두고 줄여야, 바닥에 붙여 놓은 것이 공중에 뜨지 않는다. */
  fitObjects() {
    for (const o of this.objects) {
      const s = OBJ_SIZE[o.type];
      if (!s) continue;
      /* 크기만 줄이면 원래 자리가 타일 경계에 안 맞던 것들이 두 칸에 반씩 걸쳐 선다
         (캠프 용광로가 실제로 1053.55~1054.45로 걸쳐 있었다). 한 칸 안에 들어간다는
         말은 "한 칸을 차지한다"는 뜻이므로, 중심이 속한 칸으로 스냅해서 정확히 한 칸을
         쓰게 한다. 밑변은 원래 닿아 있던 타일 경계에 그대로 얹는다. */
      const tx = Math.floor((o.x + o.w / 2) / TS);
      const ty = Math.round((o.y + o.h) / TS);
      o.w = s.w; o.h = s.h;
      o.x = tx * TS + Math.round((TS - s.w) / 2);
      o.y = ty * TS - s.h;
    }
  }

  /** 플레이어 주변에서 베어낸 나무를 시간이 지나면 되살린다.
      원래 생성 밀도(초기 chance)와 같은 확률로만 심고, 반경도 넉넉히 비워 둬야
      호출이 계속 누적돼도 처음 생성 때보다 훨씬 빽빽해지지 않는다 — 특히 눈 지형은
      원래 나무가 드문데 예전엔 이 확률 없이 무조건 심어서 시간이 지나면 숲처럼 빽빽해졌었다. */
  regrow(rng, n, centerX) {
    for (let k = 0; k < n; k++) {
      const x = clamp(Math.round(centerX + rng.range(-420, 420)), 2, WW - 3);
      if (Math.abs(x - this.spawnX) < 40) continue;   // 마을 안쪽은 피한다
      const s = this.surface[x];
      const g = this.get(x, s);
      let leaf, chance;
      if (g === T.GRASS) { leaf = T.LEAF; chance = 0.14; }
      else if (g === T.CORRUPTGRASS) { leaf = T.CORRUPTLEAF; chance = 0.11; }
      else if (g === T.SNOW) { leaf = T.LEAF; chance = 0.08; }
      else continue;
      if (!rng.chance(chance)) continue;
      if (this.get(x, s - 1) !== T.AIR) continue;
      // 기둥이 2칸까지 굵어질 수 있고 수관도 그만큼 옆으로 퍼지므로, 예전 ±4로는
      // 새 나무가 옆 나무 수관 속에 박힌다. 여유를 ±6으로 넓히고 잎 변종도 전부 본다.
      let occupied = false;
      for (let dx = -6; dx <= 6 && !occupied; dx++) {
        for (const dy of [-1, -4]) {
          const t = this.get(x + dx, s + dy);
          if (t === T.WOOD || TILE_DEF[t].leaf) { occupied = true; break; }
        }
      }
      if (occupied) continue;
      this.tree(x, s, rng, T.WOOD, leaf);
    }
  }

  /** 기둥은 x부터 오른쪽으로 wdt칸을 차지한다. 폭을 1칸으로 못박아 두면 어떤 숲이든
      장대만 늘어선 것처럼 보여서, 키가 큰 나무는 굵어질 수 있게 열어 뒀다. */
  tree(x, s, rng, woodT, leafT) {
    const h = rng.int(5, 11);
    const wdt = h >= 9 && rng.chance(0.55) ? 2 : 1;
    for (let dx = 0; dx < wdt; dx++)
      for (let y = s - 1; y > s - h; y--) this.set(x + dx, y, woodT);
    if (wdt > 1) this._groundTrunk(x, wdt, s, woodT);
    this._canopy(x, s - h, rng.int(2, 3), wdt, leafT, 1);
  }

  /** 2칸 이상 폭인 기둥이 비탈에 걸치면, 낮은 쪽 바닥까지 기둥을 이어 붙인다.
      기둥은 한 칸(x)의 지표(s)만 기준으로 심는데, 옆 칸이 그보다 낮으면(경사면) 그
      칸에서는 밑동과 실제 지면 사이에 빈 칸이 남아 "바닥에 안 닿은 나무통"으로
      보였다 — 실측 확인된 버그. */
  _groundTrunk(x, wdt, s, woodT) {
    // 완만한 비탈(몇 칸 차이)만 메운다. 절벽·폭포 단(정글 폭포호는 16칸까지 깎는다)
    // 바로 옆에 나무가 서면 s2-s가 수십 칸까지 벌어질 수 있는데, 그대로 다 메우면
    // "비정상적으로 높은 나무"가 생긴다 — 실제로 이 상한 없이 신고받은 버그다.
    // 상한을 넘는 차이는 원래 버그(발 안 닿음)보다 훨씬 눈에 띄니, 그 칸은 그냥 둔다.
    const CAP = 4;
    for (let dx = 1; dx < wdt; dx++) {
      const s2 = this.surface[x + dx];
      if (s2 > s && s2 - s <= CAP) for (let y = s; y < s2; y++) this.set(x + dx, y, woodT);
    }
  }

  /** 수관 — 기둥 띠(x..x+wdt-1)에서의 거리로 재서, 굵은 기둥에도 캡슐 모양으로 얹힌다.
      기둥 한 칸을 중심으로 잡던 원형 공식을 그대로 쓰면 폭이 2칸일 때 한쪽으로 쏠린다. */
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
    if (y >= WH - 4) return T.BEDROCK;
    if (y >= HELL_Y) return T.ASH;
    const L = MAT_LAYER[this.matId[x]], depth = y - this.surface[x];
    if (depth < 20) return L.sub;
    return L.deep;
  }

  /** 이어진 공동을 하나씩 재서, 기준보다 작고 지표와도 통하지 않는 것은 도로 메운다.
      한두 칸짜리 구멍이 지하를 뒤덮는 걸 막는 유일하게 확실한 방법이다 —
      노이즈 임계값만 손대면 큰 동굴까지 같이 사라진다. */
  pruneSmallCaves(minSize) {
    const N = WW * WH;
    const seen = new Uint8Array(N);
    const stack = new Int32Array(N);      // 한 덩어리가 아무리 커도 넘치지 않게 최대 크기로
    const cells = new Int32Array(minSize);
    let pockets = 0;
    for (let sx = 1; sx < WW - 1; sx++) {
      const top = this.surface[sx] + 3;
      for (let sy = top; sy < WH - 5; sy++) {
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
  /** 씨앗을 심는다. 밑이 경작지여야 하고, 그 자리는 비어 있어야 한다 */
  plantSeed(x, y, seedId) {
    const tile = SEED_TILE[seedId];
    if (tile === undefined) return false;
    if (this.get(x, y) !== T.AIR || !TILE_DEF[this.get(x, y + 1)].farm) return false;
    this.set(x, y, tile);
    this.crops.add(y * WW + x);
    return true;
  }

  /** 작물 한 단계 성장. 낮에 더 잘 자란다. dayF: 0(밤)~1(한낮) */
  /** 자란 칸을 돌려준다 — 화면에 보이는 밭이면 게임 쪽에서 티를 낸다.
      { grew: [키…], ripe: [키…] }. ripe 는 이번에 다 여문 칸이다. */
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
      if (rng.chance(Math.min(0.9, 0.22 * (0.55 + dayF * 0.75) * sp))) {
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

  /** 정글 나무 — 보통 나무보다 높고 수관이 넓다. 줄기에서 덩굴이 늘어진다 */
  jungleTree(x, s, rng) {
    const h = rng.int(8, 13);
    // 정글 나무는 원래 키가 커서 굵은 쪽이 더 자주 나온다
    const wdt = rng.chance(0.6) ? 2 : 1;
    for (let dx = 0; dx < wdt; dx++)
      for (let y = s - 1; y > s - h; y--) this.set(x + dx, y, T.WOOD);
    if (wdt > 1) this._groundTrunk(x, wdt, s, T.WOOD);
    const top = s - h, r = rng.int(3, 5);
    this._canopy(x, top, r, wdt, T.JUNGLELEAF, 2);
    // 줄기 중간에도 곁가지를 낸다. 수관만 얹으면 아래가 텅 빈 기둥으로 보여서
    // "밀림"이 아니라 "장대밭"처럼 읽힌다
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

  /** 버섯 골짜기의 큰 발광 버섯 — 갓이 스스로 빛나 지하처럼 어두운 골짜기를 밝힌다.
      예전엔 GLOWCAP(줄기+갓을 한 타일에 다 그리는 "혼자 선 버섯" 타일)을 여러 개
      늘어놓아서 "따로 선 버섯 여러 개"로 보였다. 일반 나무와 같은 방식
      (WOOD 줄기 + _canopy로 뭉친 잎 타일)으로 바꿔, GLOWLEAF(표면만 그리는 타일)로
      하나의 갓 덩어리를 만든다 — 나무의 LEAF와 정확히 같은 구조라 벌목 로직도
      그대로 통한다. */
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
      this.objects.push({ type: 'npc', npc: h.npc, x: (bx + h.w / 2) * TS, y: (gy - 2.2) * TS, w: 22, h: 44 });
    }
    // 광장 — 작업대/용광로는 플레이어가 직접 만들어 놓는 것과 **같은 크기**(OBJ_SIZE)를
    // 쓴다. 예전엔 여기·여명 마을만 44×34/44×40으로 따로 커서, 손수 지은 것과 나란히
    // 놓고 보면 같은 시설인데 눈에 띄게 크기가 달라 보였다 — 하나의 값만 바꾸면
    // 어디서든 같이 바뀌도록 아예 같은 상수를 참조하게 했다.
    const cx = (x0 + x1) >> 1;
    const wbS = OBJ_SIZE.workbench, fgS = OBJ_SIZE.forge;
    this.objects.push({ type: 'workbench', x: (cx - 4) * TS, y: gy * TS - wbS.h, w: wbS.w, h: wbS.h, lv: 1 });
    this.objects.push({ type: 'forge', x: (cx + 3) * TS, y: gy * TS - fgS.h, w: fgS.w, h: fgS.h, lv: 1 });
    for (let x = cx - 8; x < cx + 9; x++) { this.set(x, gy, T.BRICK); this.set(x, gy - 1, T.AIR); this.set(x, gy - 2, T.AIR); }
    this.set(cx - 9, gy - 1, T.TORCH); this.set(cx + 9, gy - 1, T.TORCH);
    // 귀환 비석 — 여명 마을이 되살아나기 전까지는 아무 반응이 없다
    this.objects.push({ type: 'waystone', x: (cx - 12) * TS, y: (gy - 2.2) * TS, w: 30, h: 48 });
    // 노인
    this.objects.push({ type: 'npc', npc: 'old', x: (x1 + 6) * TS, y: (this.surface[x1 + 6] - 2.2) * TS, w: 22, h: 44 });
  }

  /* ---- 여명 마을 ----
     세션 1 종장 전까지는 잿빛에 묻힌 옛 도시의 폐허다. 벽이 군데군데 무너져 있고
     불도 사람도 없다. 종장을 끝내면 restoreDawnCity()가 벽을 메우고 불을 켜고
     주민과 시설을 들여놓는다. blocks를 저장해 두는 이유는, 복구할 때 어느 칸이
     원래 벽이었는지를 rng 없이 정확히 되짚기 위해서다. */
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
      // 처마는 지붕 줄에만 얹는다. 예전에는 여기에 더해 문 옆(b.x-2 · b.x+b.w+1)에
      // 3칸짜리 돌기둥을 세웠는데, 그 기둥이 길 한복판을 막고 있었다 — 어느 문에서든
      // 한 칸 나오면 벽이었고, 건물 0·1 사이는 기둥 둘이 나란히 붙어 아예 지나갈 수
      // 없었다(실측: 지면이 막힌 구간 7곳이 전부 이 기둥이었다). 기둥은 없앤다.
      for (let x = b.x - 2; x <= b.x + b.w + 1; x++) this.set(x, by - 1, T.RUINTILE);
    }
    // 중앙 광장 — 건물 사이를 비우고, 분수대 물받이만 놓는다.
    // 물받이 폭은 분수대 그림 폭과 정확히 같아야 한다(DAWN_PLAZA의 fountain.w = 5칸).
    // 예전에는 단이 7칸인데 그림은 4칸이었고, 게다가 (cx, gy-2)에 벽돌이 하나 더 서서
    // 분수 한가운데를 뚫고 올라와 있었다 — "분수대 정렬 안 됨"의 실제 정체.
    const cx = (x0 + x1) >> 1;
    const [pL, pR] = this.dawnPlazaSpan();
    for (let x = pL; x <= pR; x++)
      for (let y = gy - 3; y < gy; y++) this.set(x, y, T.AIR);
    const fo = DAWN_PLAZA.find(s => s.id === 'fountain');
    for (let x = cx + fo.off; x < cx + fo.off + fo.w; x++) this.set(x, gy - 1, T.RUINBRICK);
  }

  /** 광장 가로 구간(타일) — 건물1 오른쪽 끝 다음 칸부터 건물2 왼쪽 끝 앞 칸까지.
      건물 좌표에서 끌어내므로 건물을 옮기면 광장도 따라 움직인다. */
  dawnPlazaSpan() {
    const b = this.dawnCity.blocks;
    return [b[1].x + b[1].w, b[2].x - 1];
  }

  /* ---- 지하 공창 (세션 2) ----
     여명 마을 바로 아래. 옛 도시를 "지은" 것들이 아직 돌아가고 있는 층이다.
     승강기 수직축으로 지상과 이어지고, 바닥에는 동력석 광맥이 깔려 있다. */
  buildWorks(dx0, dx1, rng) {
    const cx = (dx0 + dx1) >> 1;
    const y0 = 210, h = 40, x0 = cx - 34, w = 68;
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
  /* ---- 폭주로 (7단계) ----
     공창 바로 아래. 결재할 사람이 사라지자 규정대로 자동 승인된 증설이 3,400번 반복된 층이다.
     여기 함정은 전부 기계식이다 — 기계 문명이 지은 곳이니 기계 체계를 그대로 쓴다.
     세션 1의 고대 유적이 타일 함정만 쓰는 것과 짝을 이룬다. */
  buildRunaway(dx0, dx1, rng) {
    const cx = (dx0 + dx1) >> 1;
    const y0 = 306, h = 54, w = 86, x0 = cx - (w >> 1);
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
    // 가장 깊은 방이 헤파의 격실 — 가장 큰 방(boss)과 같은 방이 되면 두 보스방이
    // 같은 자리에 겹쳐 버린다(실측: 300개 시드 중 1개꼴). boss를 제외하고 고른다.
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
        if (Factory.canPlace(this, tx, fy)) Factory.place(this, tx, fy, rng.pick(['dart', 'flamejet', 'frostjet']), left ? 0 : 2);
      }
      if (rng.chance(0.5) && window.Factory) {
        const tx2 = r.x + rng.int(3, Math.max(3, r.w - 4));
        if (Factory.canPlace(this, tx2, fy)) Factory.place(this, tx2, fy, 'trap', 0);
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

  /* ---- 설계실 (세션 2 종장) ----
     헤파의 격실에서 "옆으로" 이어진다. 종장 대사가 아래가 아니라 벽 너머를 가리키기 때문에
     수직으로 더 파 내려가지 않고 폭주로 오른쪽에 붙였다. 공창이 강철이라면 이곳은
     이음매 없는 흰 돌 — 지은 손이 다르다는 걸 재질 하나로 읽히게 했다. */
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

    // 폭주로 오른쪽 벽 ↔ 설계실 왼쪽 벽을 잇는 수평 통로. 가운데를 봉인이 막는다
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
    // ruin:15 — 12는 이미 관리자 격실(overseer)이 쓰고 있다. 겹치면 this.lairs[]가 공유돼
    // 둘 중 하나를 비우면 다른 쪽도 "이미 비어 있다"로 잘못 표시된다
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
        if (Factory.canPlace(this, tx2, fy)) Factory.place(this, tx2, fy, rng.pick(['dart', 'flamejet']), left ? 0 : 2);
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

  /* ---- 특별 유적 ① 부유 성채 (하늘) ----
     설계실에서 "그들은 별을 돌려보낸 뒤 멈췄다"고 했다. 그 돌려보내는 장치가 아직 떠 있다.
     하늘 섬 구역이라 발밑이 곧 낭떠러지다 — 그게 이 유적의 전제이자 보스 설계의 근거다. */
  buildCitadel(rng) {
    const w = 74, h = 30;
    const x0 = 3300, y0 = 4;                     // 버섯 골짜기 위 하늘 (세션 2 바이옴 상공)
    this.citadel = { x0, y0, w, h, cx: x0 + (w >> 1) };

    // 성채 바닥판 — 통째로 떠 있는 판이라 아래가 완전히 뚫려 있다
    for (let x = x0 - 2; x <= x0 + w + 2; x++)
      for (let y = y0 + h - 3; y <= y0 + h; y++) this.set(x, y, T.ORBITPLATE);

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.ORBITPLATE, floor: T.ORBITPLATE, bg: 9,
      rng, depth: 4, minW: 12, minH: 8, shapes: ['rect', 'octagon', 'round']
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    /* 진입 다리 — 성채는 통째로 떠 있는 판이라 그냥 두면 들어갈 방법이 제트팩뿐이다.
       그런데 제트팩 재료가 여기서 나오므로, 막아 두면 순환이 된다. 왼쪽 하늘 섬 쪽으로
       다리를 뻗고 옆구리에 문을 뚫어, 하늘 섬을 타고 걸어 들어올 수 있게 한다. */
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

    // 가장 넓은 방이 환원기의 자리. 제단석을 깔아 둔다 — 보스가 바닥을 다 부숴도
    // 제단석만은 남으므로, 최소한 여기서는 발을 디딜 수 있다
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

  /* ---- 특별 유적 ② 무너진 갱 (최심부) ----
     스토리가 없다. 사람이 파다가 너무 깊이 내려간 자리 — 그게 전부다.
     지옥보다 아래(HELL_Y 밑)라 순수하게 "여기까지 올 수 있는가"만 묻는 구역이다. */
  buildDeepShaft(rng) {
    const w = 70, h = 34;
    const x0 = 640, y0 = WH - 46;                 // 잿빛 숲 최하부 — 지옥 바닥 아래
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
      // 유독 가스 — 바닥에 고인다. 밟으면 아프고 곡괭이로 걷어낼 수 없다
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

  /** 종장 완료 시 1회. 폐허를 되살리고 주민·시설을 들인다. 이미 복구됐으면 false */
  /** 배치표 한 줄을 실제 오브젝트로 만든다.
      tx는 잡아 둔 칸의 시작, slotW는 칸 수. 그림이 칸보다 좁으면 그 칸 안에서 가운데로
      맞추고, 세로는 **언제나** 바닥선(gy)에 발을 붙인다.
      예전에는 물건마다 (gy-1.6)·(gy-2.2) 같은 소수 배율을 제각각 써서 NPC는 4px 떠
      있고 책장은 지붕 높이 허공에 있었다 — 세로 기준을 한 곳으로 모은 게 이 함수다. */
  dawnPlace(tx, slotW, spec, gy, label) {
    const o = Object.assign({}, spec, {
      x: tx * TS + Math.round((slotW * TS - spec.w) / 2),
      y: gy * TS - spec.h
    });
    o.tx0 = tx; o.tx1 = tx + slotW - 1; o.slotKey = label || spec.type;
    return o;
  }

  /** 놓기 직전 겹침 검사. 겹치면 콘솔에 어느 둘이 어디서 겹쳤는지 찍는다.
      v1.0.3에서 좌표를 눈대중으로 옮기다 용광로가 건물 벽에 박히고 NPC·작업대·문이
      한자리에 뭉쳤던 일을 되풀이하지 않으려고 둔 안전장치다. */
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
      // 출입구 — 양쪽 벽을 뚫고 여닫이 문을 단다. 문 바깥은 이제 뻥 뚫린 길이다
      // (문 옆 3칸짜리 기둥은 buildDawnCity에서 없앴다)
      const rx = b.x + b.w - 1;
      this.set(b.x, gy - 1, T.AIR); this.set(b.x, gy - 2, T.AIR);
      this.set(rx, gy - 1, T.AIR); this.set(rx, gy - 2, T.AIR);
      this.pushDoor(b.x * TS, (gy - 2) * TS, TS, TS * 2, -1);
      this.pushDoor(rx * TS, (gy - 2) * TS, TS, TS * 2, 1);
      // 실내 — 배치표(DAWN_INSIDE)대로. 책장·주민·시설·탁자 순으로 4칸씩 띄어 선다
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

    // 대로 가로등 — 물건이 선 칸은 건너뛰고 빈자리에만 세운다
    const taken = new Set();
    for (const o of items) for (let x = o.tx0; x <= o.tx1; x++) taken.add(x);
    for (let x = x0 - 4; x < x1 + 4; x += 9) {
      let t = x;
      while (t < x + 5 && (taken.has(t) || this.solid(t, gy - 1))) t++;
      if (!taken.has(t) && !this.solid(t, gy - 1)) this.set(t, gy - 1, T.TORCH);
    }
    d.lv = 1;
    return true;
  }

  /* ---- 마을 개선 ----
     여명 마을만 대상이다. 베이스캠프(buildVillage)는 이 함수가 절대 건드리지 않는다 —
     캠프는 "돌아올 곳"이지 키우는 곳이 아니라는 세션 1의 설정을 그대로 둔다.

     타일을 실제로 갈아 끼우기 때문에, 한 번 올리면 되돌릴 수 없다.
     대신 플레이어가 직접 지은 것 위에 덮어쓰지 않도록 건드리는 범위를 좁게 잡았다. */
  upgradeVillage(lv) {
    const d = this.dawnCity;
    if (!d || !d.restored || (d.lv || 1) >= lv) return false;
    d.lv = lv;
    const { x0, x1, gy, blocks } = d;
    const cx = (x0 + x1) >> 1;
    const rng = new RNG(this.seed + '_v' + lv);
    const P = (o) => this.objects.push(o);
    const mach = (tx, ty, key, dir) => {
      if (window.Factory && Factory.canPlace(this, tx, ty)) Factory.place(this, tx, ty, key, dir || 0);
    };

    if (lv === 2) {
      /* --- 2층 증축 + 기와지붕 --- */
      for (const b of blocks) {
        const by = gy - b.h, ny = by - 6;          // 새 지붕 줄
        // 폐허 시절 처마(by-1)가 b.x-2 / b.x+b.w+1 까지 뻗어 있었다. 그 두 칸까지 같이
        // 비우지 않으면 2층을 올린 뒤 허공에 조각이 남는다
        for (let x = b.x - 2; x <= b.x + b.w + 1; x++)
          for (let y = ny; y < by; y++) this.set(x, y, T.AIR);
        for (let x = b.x; x < b.x + b.w; x++) {
          for (let y = ny + 1; y < by; y++) this.setWall(x, y, 8);
          // 옛 지붕 줄은 2층 바닥이 된다. 발판이라 아래에서 뛰어 올라가고 S로 내려올 수 있다
          this.set(x, by, T.PLATFORM);
        }
        for (let y = ny + 1; y < by; y++) {        // 2층 벽
          this.set(b.x, y, T.TIMBERWALL);
          this.set(b.x + b.w - 1, y, T.TIMBERWALL);
        }
        /* 2층 바닥 줄(by)의 양 끝은 벽으로 되돌린다 — 바로 위(2층 벽)와 아래(1층 벽)는
           막혀 있는데 이 한 줄만 발판이라, 건물 옆면에 1칸짜리 구멍이 뚫려 보였다.
           가운데는 발판 그대로라 오르내리는 데는 영향이 없다. */
        this.set(b.x, by, T.TIMBERWALL);
        this.set(b.x + b.w - 1, by, T.TIMBERWALL);
        for (let x = b.x - 1; x <= b.x + b.w; x++) this.set(x, ny, T.ROOFTILE);
        // 창문 — 1층·2층 양쪽 벽에
        for (const wx of [b.x, b.x + b.w - 1]) {
          this.set(wx, gy - 4, T.WINDOW);
          this.set(wx, ny + 3, T.WINDOW);
        }
        this.set(b.x + 3, ny + 2, T.TORCH);
        this.set(b.x + b.w - 4, ny + 2, T.TORCH);
        // 발판 사다리 — 1층 바닥(gy)에서 2층 바닥(by)까지가 최소 10칸이라 그냥은 못 뛰어
        // 오른다(1단 점프 최대 높이 ≈4.4칸). buildWorks 승강기 축과 같은 4칸 간격 발판이면
        // 한 단씩 확실히 닿는다 — 책장(2)·주민(6)·시설(10)·탁자(14) 슬롯과 겹치지 않는
        // offset 8에 세운다.
        const stairX = b.x + 8;
        for (let y = gy - 4; y > by; y -= 4) this.set(stairX, y, T.PLATFORM);
        // 2층에 아무것도 없으면 그냥 빈 상자라 올라갈 이유가 없다 — 책장을 하나 놓는다
        // (사다리와 반대편 벽 쪽, 창문·횃불과 안 겹치는 자리)
        const shS = DAWN_OBJ.shelf;
        P({ type: 'furniture', kind: 'shelf', x: (b.x + b.w - 5) * TS - shS.w, y: by * TS - shS.h, w: shS.w, h: shS.h });
      }

      /* --- 대로 횃불을 가로등으로 --- */
      for (let x = x0 - 6; x < x1 + 6; x++)
        if (this.get(x, gy - 1) === T.TORCH) this.set(x, gy - 1, T.LAMPPOST);

      /* --- 마을 서쪽에 밭 --- */
      const fx0 = x0 - 11, fx1 = x0 - 3;
      d.farm = { x0: fx0, x1: fx1, y: gy };
      for (let x = fx0 - 1; x <= fx1 + 1; x++) {
        for (let y = gy - 5; y < gy; y++) this.set(x, y, T.AIR);
        this.set(x, gy, x < fx0 || x > fx1 ? T.PLANK : T.FARMLAND);
      }
      this.set(fx0 - 1, gy - 1, T.FENCE); this.set(fx1 + 1, gy - 1, T.FENCE);
      /* 건초더미는 원래 fx1+2(=x0-1)에 뒀는데, 그 칸이 하필 전주 선로가 내려오는
         기둥 줄이라 전주 밑동에 건초가 박혀 보였다. 밭 왼쪽 울타리 바깥으로 옮긴다
         (경비병 초소 fx0-2와도 안 겹치게 한 칸 더 왼쪽). */
      this.set(fx0 - 3, gy - 1, T.HAYBALE);
      // 밭을 반쯤 채워 둔다 — 처음 온 사람이 무엇을 하는 자리인지 바로 알게
      for (let x = fx0; x <= fx1; x++) {
        if (rng.chance(0.3)) continue;
        const seed = rng.pick(['seed_wheat', 'seed_wheat', 'seed_starroot']);
        this.plantSeed(x, gy - 1, seed);
        for (let k = rng.int(0, 2); k > 0; k--) this.forceGrow(x, gy - 1);
      }

      /* --- 지붕 위 풍차 + 마을 전주 선로 ---
         풍차만 지붕에 얹어 두면 전력이 지붕에 갇힌다. 지붕에서 큰길로 내려와 밭까지 가는
         전주 선로를 함께 깔아, 마을 어디에 설비를 놓아도 바로 물릴 수 있게 한다.
         (전주는 반경 5칸을 덮고 서로 10칸 안에서 이어진다 — 그 간격에 맞춰 짚었다) */
      const rb = blocks[0], ry = gy - rb.h - 7;
      mach(rb.x + 8, ry, 'windmill');
      /* 전주는 1칸짜리 기계라, 지붕이 없는 자리(길·밭 위)에 놓으면 받쳐 주는 것이 없어
         공중에 뜬 것처럼 보였다. 기계 칸 아래를 땅까지 기둥으로 잇되, **벽 레이어**로만
         그린다 — 고체 타일로 세웠더니 큰길과 밭을 가로막아 지나갈 수도, 심을 수도
         없었다. 벽 레이어는 통과 가능한 "비활성 타일"이라 보이기만 하고 막지 않는다.
         지붕 위 전주는 지붕이 이미 받치고 있어 그대로 둔다. */
      const poles = [
        [rb.x + 12, ry], [x0 + 5, ry],          // 지붕 위
        [x0 - 1, gy - 13], [x0 - 1, gy - 5],    // 서쪽 벽을 타고 내려온다
        [x0 - 8, gy - 4]                        // 밭을 가로지른다 (기둥을 세워 받친다)
      ];
      // 기계를 먼저 다 놓는다 — 기둥을 세우고 나면 그 칸이 막혀 canPlace가 실패한다
      for (const [px, py] of poles) mach(px, py, 'pole');
      // 기둥은 그 뒤에. 같은 줄에 놓인 다른 전주 칸은 건너뛰고, 지붕·지면에 닿으면 멈춘다
      for (const [px, py] of poles)
        for (let y = py + 1; y < gy + 2; y++) {
          if (this.machines.has(this.i(px, y))) continue;
          if (this.solid(px, y)) break;
          this.setWall(px, y, 14);
        }
      return true;
    }

    if (lv === 3) {
      /* --- 성벽 + 문루 ---
         감시탑을 따로 세우지 않고 성문 위를 두껍게 올려 문루로 만든다. 탑 안에 빈 통로를
         내면 경비병이 그 1칸에 갇혀 활도 못 쏘기 때문에, 탑은 통짜로 두고 사람은 길에 세운다. */
      const wxL = x0 + DAWN_WALL.leftOff, wxR = x1 + DAWN_WALL.rightOff;
      // 성벽이 집을 물지 않는지 확인한다 — 건물을 옮기면 여기부터 어긋나기 때문에
      // 조용히 겹치게 두지 않고 콘솔에 찍는다(문루가 성문 위 3칸 폭이라 ±1까지 본다)
      for (const wx of [wxL, wxR])
        for (const b of blocks)
          if (wx + 1 >= b.x && wx - 1 <= b.x + b.w - 1)
            console.warn(`[여명 마을 배치 문제] 성벽(${wx})이 건물(${b.x}~${b.x + b.w - 1})과 겹침`);
      d.towers = []; d.posts = [];
      for (const [wx, inward] of [[wxL, 1], [wxR, -1]]) {
        /* 성벽 자리의 나무를 먼저 걷어낸다 — 나무는 세계 생성 때 이미 서 있었고
           성벽은 한참 뒤(3단계)에 올라오다 보니, 기둥과 잎이 성벽·문루를 뚫고
           나오거나 허공에 잎만 남아 떠 있었다. 줄기(tree)·잎(leaf) 타일만 지운다. */
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
        /* 성벽 배경(벽 레이어) — 예전엔 배경을 안 깔아서, 성문을 뚫은 칸 너머로
           하늘이 그대로 보였다. 문 위 문루가 허공에 얹힌 것처럼 위태로워 보이던 원인.
           벽 레이어는 통과 가능한 "비활성 타일"이라 통행에는 영향이 없다. */
        for (let x = wx - 1; x <= wx + 1; x++)
          for (let y = gy + 2; y > gy - 15; y--) this.setWall(x, y, 13);
        // 통로 — 문루 아래를 뚫고 여닫이 성문을 단다. gate 표시를 달아 두면
        // 집 문(22×44) 그림을 세로로 1.5배 늘려 쓰지 않고 성문 전용으로 그린다
        for (let y = gy - 1; y > gy - 4; y--) this.set(wx, y, T.AIR);
        this.pushDoor(wx * TS, (gy - DAWN_WALL.gateH) * TS, TS, TS * DAWN_WALL.gateH, -inward, { gate: 1 });
        this.set(wx + inward, gy - 4, T.BANNER);
        /* 예전엔 성문 바깥에 모래주머니 2칸을 바리케이드로 놓았는데, 벽돌 덩어리가
           길에 튀어나온 것처럼 보이는 데다 solid라 성문 앞을 실제로 막고 있었다. 없앤다. */
        mach(wx, gy - 15, 'turret');
        d.towers.push(wx);
        d.posts.push(wx + inward * 3);          // 경비병은 문 안쪽 길 위에 선다
      }
      // 광장에 깃발 — 배치표에서 비어 있는 칸에만 세운다(게시판·비석 위에 겹치지 않게)
      for (const bx of [cx - 4, cx + 6]) this.set(bx, gy - 3, T.BANNER);
      return true;
    }
    return false;
  }

  /* ---- 지하 묘실 ---- */
  buildDungeon(rng, n2) {
    // 묘실도 방 묶음으로. 보스 제단은 가장 넓은 방에 두고, 나머지 방에 함정과 상자를 흩뿌린다
    const cx = 2300, cy = 240, w = 68, h = 38;   // 사막 지하
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
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 7) this.set(x, r.y + 2, T.TORCH);
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
    const N = 32;
    for (let i = 0; i < N; i++) {
      const cx = Math.round(((i + 0.5) / N) * WW + rng.range(-32, 32));
      const cy = rng.int(12, SKY_Y - 8);
      const rw = rng.int(13, 26), rh = rng.int(4, 8);
      this.carveIsland(cx, cy, rw, rh, rng);
      this.skyIslands.push({ x: cx, y: cy, w: rw });
      // 섬마다 상자 하나
      this.objects.push({ type: 'chest', tier: 6, x: (cx + rng.int(-4, 4)) * TS, y: (cy - 1.2) * TS, w: 30, h: 26, items: null });
      if (rng.chance(.45)) this.set(cx + rng.int(-6, 6), cy - 1, T.TORCH);
    }

    // 관문 섬 — 거대 나무 꼭대기와 이어지며 폭풍 제단이 있다
    const gx = 1300, gy = 18;              // 하늘 관문 — 잿빛 숲 위
    this.carveIsland(gx, gy, 34, 9, rng);
    this.skyIslands.push({ x: gx, y: gy, w: 34 });
    // 하늘 신전
    for (let x = gx - 12; x <= gx + 12; x++)
      for (let y = gy - 12; y < gy; y++) {
        const edge = (x <= gx - 11 || x >= gx + 11 || y <= gy - 11);
        if (edge) this.set(x, y, T.SKYSTONE); else this.set(x, y, T.AIR);
        this.setWall(x, y, 9);
      }
    for (let x = gx - 8; x <= gx + 8; x += 8) this.set(x, gy - 10, T.RUNESTONE);
    // 신전 내부 조명
    for (let x = gx - 9; x <= gx + 9; x += 4) { this.set(x, gy - 8, T.TORCH); this.set(x, gy - 2, T.TORCH); }
    // 바닥(신전이 선 섬 표면 gy)에 밑면이 정확히 닿도록 h만큼 끌어올린다
    this.objects.push({ type: 'altar', boss: 'storm_warden', x: gx * TS, y: gy * TS - 48, w: 44, h: 48 });
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

  /* ================= 방이 여러 개인 던전 =================
     BSP(이진 공간 분할)로 영역을 재귀로 쪼개 크고 작은 방을 만들고, 형제 방끼리
     문을 뚫어 잇는다. 형제끼리만 이으면 트리 구조라 연결성이 저절로 보장된다 —
     "어느 방은 못 들어간다"가 원리적으로 생기지 않는다.

     상자 하나 놓인 큰 방 하나보다, 작은 방을 지나며 함정을 피하고 갈림길을 고르는 쪽이
     훨씬 모험처럼 느껴져서 기존 유적도 전부 이걸로 갈아 끼웠다. */
  bspSplit(x, y, w, h, depth, minW, minH, rng, out) {
    const canH = h >= minH * 2 + 1, canV = w >= minW * 2 + 1;
    if (depth <= 0 || (!canH && !canV)) { out.push({ x, y, w, h }); return; }
    /* 어느 쪽을 자를지. 예전에는 `w < h * 1.2` 여서 세로로 긴 방이 그대로 남았다 —
       가로 스크롤 게임에서 위아래로 길쭉한 방은 걸어 다닐 데가 없고 사다리 통로처럼 보인다.
       가로가 세로의 1.6배가 안 되면 가로로 잘라(위아래로 나눠) 납작하게 만든다. */
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

  /** 두 방 사이 공유 벽에 통로를 뚫는다. 맞닿아 있지 않으면 아무것도 하지 않는다 */
  _linkRooms(a, b, floor) {
    const ax1 = a.x + a.w, ay1 = a.y + a.h, bx1 = b.x + b.w, by1 = b.y + b.h;
    if (ax1 === b.x || bx1 === a.x) {                       // 세로 벽을 공유
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
      const x0 = Math.max(a.x, b.x) + 2, x1 = Math.min(ax1, bx1) - 3;
      if (x1 < x0) return false;
      const dx = (x0 + x1) >> 1;
      for (let k = -1; k <= 1; k++) { this.set(dx + k, wy, T.AIR); this.set(dx + k, wy + 1, T.AIR); }
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
    // 1) BSP로 방을 뽑는다
    const all = [];
    this.bspSplit(x0, y0, w, h, cfg.depth || 4, cfg.minW || 11, cfg.minH || 9, rng, all);
    /* 2) 도면(plan)이 있으면 그 칸에 든 방만 남긴다.
       예전에는 직사각형을 통째로 벽으로 채우고 잘랐다 — 그래서 유적 겉모양이 열 곳 다
       같은 상자였다. 이제 **남긴 방들의 자리만** 벽으로 채우므로 겉모양이 방 배치를
       그대로 따라간다. 고리 도면이면 가운데가 손 안 댄 암반으로 남아 O 자가 된다.
       도면이 너무 빡빡해 방이 셋도 안 남으면 통짜로 되돌린다(막힌 유적을 만들지 않는다). */
    let leaves = all;
    const plan = cfg.plan && RUIN_PLANS[cfg.plan];
    if (plan) {
      const rows = plan.length, cols = plan[0].length;
      const inPlan = r => {
        const cxr = clamp(Math.floor((r.x + r.w / 2 - x0) / w * cols), 0, cols - 1);
        const cyr = clamp(Math.floor((r.y + r.h / 2 - y0) / h * rows), 0, rows - 1);
        return plan[cyr][cxr] !== '.';
      };
      const kept = all.filter(inPlan);
      if (kept.length >= 3) leaves = kept;
    }
    // 3) 남긴 방들의 자리만 벽으로 채운다 (테두리 한 칸 포함).
    //    도면이 없으면 BSP가 직사각형을 빈틈없이 나누므로 결과가 예전과 똑같다.
    for (const r of leaves)
      for (let x = r.x - 1; x <= r.x + r.w; x++)
        for (let y = r.y - 1; y <= r.y + r.h; y++) { this.set(x, y, wall); this.setWall(x, y, bg); }
    /* 4) 각 방 속을 판다 (테두리 1칸은 벽으로 남긴다).
       네모만 이어 붙이면 열 방이 다 똑같아 보여서, 방마다 생김새를 굴린다.
       단 **바닥 쪽 세 줄은 어떤 모양이든 통째로 비워 둔다** — 5)의 문 뚫기가 바닥 높이에서
       일어나기 때문에, 여기까지 깎으면 방이 서로 안 이어진다. */
    const shapes = cfg.shapes || ['rect', 'rect', 'round', 'octagon', 'pillars'];
    for (const r of leaves) {
      const shape = rng ? rng.pick(shapes) : 'rect';
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
    // 6) 그래도 못 들어가는 방이 남으면 직접 굴을 뚫는다.
    //    공유 벽이 너무 짧으면 5)가 실패할 수 있어서, 여기서 반드시 메꿔야
    //    "문이 없는 방"이 생기지 않는다
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

  /* ---- 걸어서 닿는지 검사하고 고친다 ----------------------------------------

     _ensureConnected 는 "빈 칸이 이어져 있는가"만 본다. 그런데 사람은 빈 칸을 헤엄쳐
     다니지 않는다. 발 디딜 곳이 있어야 하고, 한 번에 세 칸까지만 오른다.

     실측(tools/ruindiag.py)에서 갱도는 방 열 곳 중 셋, 부패한 둥지는 서른셋 중 일곱만
     실제로 걸어 닿았다. 굴은 다 뚫려 있었는데도 그랬다 — 한 칸 턱 위 천장이 낮아 못
     올라서거나, 굴 바닥이 허공이라 떨어지면 도로 못 올라오는 자리들이었다.

     그래서 여기서 **플레이어와 같은 이동 규칙으로 직접 걸어 보고**, 못 닿는 자리마다
     오를 수 있는 길을 다시 판다. 이동 규칙은 entity.js 의 실제 물리에서 뽑았다:
     점프 속도 620 · 중력 2000 이면 최고 96px ≈ 4.4칸이므로 보수적으로 세 칸으로 잡고,
     발판(solid 2)은 밟고 서거나 아래 키로 뚫고 내려갈 수 있다. */

  /** 한 자리에서 뛰어서 닿는 "설 수 있는 칸"을 모아 온다 */
  _standSet(box, sx, sy) {
    const JUMP = 3, RUN = 4;                                  // 오를 수 있는 높이 · 한 번에 나는 폭
    const sup = (x, y) => { const s = TILE_DEF[this.get(x, y)].solid; return s === 1 || s === 2; };
    const free = (x, y) => TILE_DEF[this.get(x, y)].solid !== 1;
    const liq = (x, y) => !!TILE_DEF[this.get(x, y)].liquid;  // 물속에서는 뜬다 (Ent.move)
    const body = (x, y) => free(x, y) && free(x, y - 1);      // 키 두 칸이 들어가는가
    const stand = (x, y) => body(x, y) && (sup(x, y + 1) || liq(x, y));
    const seen = new Set(), st = [];
    const push = (x, y) => { const k = y * WW + x; if (!seen.has(k)) { seen.add(k); st.push([x, y]); } };
    const drop = (x, y) => {                                  // 발이 닿을 때까지 떨어진다
      for (let cy = y; cy <= box[3]; cy++) {
        if (!body(x, cy)) return;
        if (stand(x, cy)) { push(x, cy); return; }
      }
    };
    drop(sx, sy);
    if (!st.length) for (let k = 1; k <= JUMP + 3; k++) if (stand(sx, sy - k)) { push(sx, sy - k); break; }
    let guard = 0;
    while (st.length && guard++ < 200000) {
      const [x, y] = st.pop();
      if (TILE_DEF[this.get(x, y + 1)].solid === 2) drop(x, y + 2);   // 발판을 뚫고 내려간다
      for (let h = 0; h <= JUMP; h++) {
        const yh = y - h;
        if (yh <= box[1]) break;
        if (h > 0 && !free(x, yh - 1)) break;                 // 머리가 천장에 막힌다
        if (h > 0 && stand(x, yh)) push(x, yh);               // 제자리 점프로 발판에 올라선다
        for (const dx of [-1, 1]) for (let s = 1; s <= RUN; s++) {
          const nx = x + dx * s;
          if (nx < box[0] || nx > box[2] || !body(nx, yh)) break;
          drop(nx, yh);
        }
      }
    }
    return seen;
  }

  /** 두 자리를 걸어 다닐 수 있게 잇는다 — 가로 굴을 내고 세로로 발판 사다리를 세운다 */
  _digStair(ax, ay, tx, ty, floor, box, traps, rng) {
    const yT = Math.min(ay, ty), yB = Math.max(ay, ty);
    const c = clamp(tx, box[0] + 1, box[2] - 2);
    /* ★ 이미 놓인 발판은 절대 지우지 않는다.
       계단을 여러 번 파다 보면 앞서 세운 사다리를 가로질러 파게 되는데, 그때 발판을
       지워 버리면 사다리 중간이 여섯 칸으로 벌어져 도로 못 올라가게 된다. 실측에서
       포자 정원이 "팠다 막았다"를 무한히 되풀이했다 — 파면 191칸, 다음 판에 144칸. */
    /* 발판은 지우지 않고, **잠긴 돌(암호석·봉인석)도 건드리지 않는다.**
       보수로 파는 굴이 암호 골방이나 봉인문 벽을 뚫으면 자물쇠가 무의미해진다. */
    const locked = (x, y) => this.locked(x, y);
    const bore = (x, y) => {
      if (locked(x, y) || TILE_DEF[this.get(x, y)].solid === 2) return;
      this.set(x, y, T.AIR);
    };
    // ① a 자리 높이에서 t 자리 열까지 가로 굴. 양 끝을 한 칸씩 더 파서 딛고 설 자리를
    //    남기고, 발밑을 채워 굴이 허공에 뜨지 않게 한다
    const rx0 = clamp(Math.min(ax, c) - 1, box[0], box[2]);
    const rx1 = clamp(Math.max(ax, c) + 2, box[0], box[2]);
    for (let x = rx0; x <= rx1; x++) {
      for (let k = 0; k < 3; k++) bore(x, ay - k);
      const s = TILE_DEF[this.get(x, ay + 1)].solid;
      if (s === 0 && !locked(x, ay + 1)) this.set(x, ay + 1, floor);   // 발판(2)이면 그대로 둔다
    }
    // ② t 자리 열에서 위아래를 잇는 두 칸 폭 수직굴.
    //    발판은 **아래에서 세 칸씩** 놓고(점프 세 칸 안에 반드시 걸린다), 맨 위에는
    //    굴 천장 바로 밑에 한 장을 더 깐다 — 사다리 맨 윗칸과 가로 굴 사이가 네 칸으로
    //    벌어져 못 올라오는 일이 있었다(부패한 둥지가 서른셋 중 다섯만 닿았다).
    const plat = (x, y) => { if (!locked(x, y)) this.set(x, y, T.PLATFORM); };
    for (let y = yT - 2; y <= yB; y++) { bore(c, y); bore(c + 1, y); }
    for (let y = yB - 2; y > yT; y -= 3) { plat(c, y); plat(c + 1, y); }
    if (yB - yT >= 2) { plat(c, yT + 1); plat(c + 1, yT + 1); }
    if (TILE_DEF[this.get(c, yB + 1)].solid === 0 && !locked(c, yB + 1)) {
      this.set(c, yB + 1, floor); this.set(c + 1, yB + 1, floor);
    }
    /* ★ 이 계단에도 함정을 하나 심는다.
       여기서 파는 길은 "걸어서 못 가던 곳"을 잇는 길이라, 그중에는 유적 밖으로
       빠져나가는 길도 있다. 그대로 두면 함정 하나 없이 드나드는 샛길이 생긴다 —
       입구인지 출구인지 가리지 않고 유적으로 통하는 길은 다 값을 치러야 한다. */
    if (rng) this.putPathTrap(Math.round((ax + c) / 2), ay, rng);
  }

  /** spots 의 모든 자리를 서로 걸어 다닐 수 있게 만든다.
      spots[0] 이 기준점이므로 입구가 있으면 입구를, 없으면 보스방을 맨 앞에 둔다 */
  _ensureWalkable(x0, y0, w, h, spots, floor, traps, rng) {
    if (spots.length < 2) return;
    // 검사 범위는 유적 둘레 열두 칸. 입구 통로처럼 유적보다 위에 있는 자리가 끼면
    // 그만큼 위로 넓힌다 — 안 그러면 "나가는 길"을 검사에서 빼놓게 된다
    const top = spots.reduce((m, p) => Math.min(m, p[1] - 3), y0 - 12);
    const box = [Math.max(2, x0 - 12), Math.max(2, top),
                 Math.min(WW - 3, x0 + w + 12), Math.min(WH - 3, y0 + h + 12)];
    /* 오르내림은 대칭이 아니다 — 떨어지는 것은 공짜지만 올라오는 데는 발판이 있어야 한다.
       그래서 기준점을 바꿔 세 번 훑는다: ① 입구에서 모든 방으로 ② 가장 먼 방에서
       입구 쪽으로(= 돌아 나오는 길) ③ 다시 입구에서. 여기서 파는 계단은 발판 사다리라
       양방향으로 쓸 수 있으므로, 두 방향을 다 훑으면 왕복이 보장된다. */
    const d0 = p => Math.abs(p[0] - spots[0][0]) + Math.abs(p[1] - spots[0][1]);
    const far = spots.reduce((b, p) => (d0(p) > d0(b) ? p : b), spots[1]);
    for (const anchor of [spots[0], far]) this._walkPass(box, anchor, spots, floor, traps, rng);
    /* 가는 길과 오는 길을 번갈아 손본다. 한쪽만 마지막에 손대면 그 굴이 반대쪽 길을
       도로 끊어 놓는다 — 실측에서 마지막이 "가는 길"이었을 때 석판 유적 2가
       들어가기는 다 되는데(28/28) 나오기는 여덟 자리밖에 안 됐다. */
    this._walkBack(box, spots, floor, traps, rng);
    this._walkPass(box, spots[0], spots, floor, traps, rng);
    this._walkBack(box, spots, floor, traps, rng);
  }

  /** 자리마다 **기준점으로 돌아올 수 있는지** 하나씩 걸어 보고, 못 돌아오면 길을 낸다.
      앞의 훑기는 "기준점에서 갈 수 있는가"만 본다. 떨어져 들어간 방은 갈 수는 있어도
      못 나오는데, 그것이 그대로 "보스는 잡았는데 못 나옴"이 된다 */
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
    /* 되돌아올 수 있는지는 "기준점 칸을 밟는가"가 아니라 **기준점에서 걸어 닿는 무리와
       한 칸이라도 겹치는가**로 본다. 기준점 자체가 설 수 없는 자리(입구 목처럼 허공)일
       때가 있어서, 칸으로 따지면 영원히 못 닿은 것으로 나오고 굴만 계속 팠다. */
    let home = this._standSet(box, spots[0][0], spots[0][1]);
    let root = home.values().next().value;                    // 기준점에서 실제로 발을 딛는 칸
    const rx = root % WW, ry = Math.floor(root / WW);
    /* ★ 여기서 "빠른 길"을 쓰면 안 된다.
       한때는 돌아올 수 있는 자리에서 걸어 닿는 칸을 모아 두고 같은 구역의 방을 건너뛰었다.
       그런데 오르내림은 대칭이 아니다 — p 에서 X 로 갈 수 있다고 X 에서 돌아올 수 있는 건
       아니다. 그래서 **한 방향으로 떨어져 들어가는 자리를 바로 그 방법으로 건너뛰고 있었다**
       (실측: 석판 유적 1이 들어가기는 22/22인데 나오기는 스물한 칸뿐이었다).
       자리마다 정직하게 걸어 본다. 대신 한 방에 한 자리만 본다(아래 호출부 참고). */
    for (let i = 1; i < spots.length; i++) {
      if (spots[i][2] === 0) continue;                        // 같은 방의 곁자리는 건너뛴다
      for (let k = 0; k < 4; k++) {                           // 한 번에 안 되면 몇 번 더 잇는다
        const back = this._standSet(box, spots[i][0], spots[i][1]);
        if (!back.size) break;
        if (back.has(root)) break;
        /* 나오는 쪽에서 기준점에 가장 가까운 칸(a)과, **거기서 아직 못 가는** 쪽 칸(b)을
           잇는다. 그냥 가장 가까운 칸끼리 이으면 둘 다 이미 서로 닿는 칸이 뽑혀
           같은 자리를 다시 파는 헛일이 된다(실측에서 a와 b가 같은 칸이었다). */
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
    while (guard++ < spots.length * 2 + 4) {                  // 한 번에 한 자리씩 잇는다
      const seen = this._standSet(box, anchor[0], anchor[1]);
      if (!seen.size) return;
      const lost = spots.filter(p => !hit(seen, p));
      if (!lost.length) return;
      const a = lost[0];
      /* 굴은 **실제로 닿는 칸**에서 시작해야 한다. 처음에는 "닿은 방"의 대표 자리를
         썼는데, 그 자리는 닿은 칸 근처일 뿐 정작 자기는 못 닿는 곳일 때가 있었다 —
         그러면 허공에 굴만 파고 아무것도 안 이어져 서른 번을 헛돌았다(실측). */
      let best = null, bd = 1e9;
      for (const k of seen) {
        const y = Math.floor(k / WW), x = k - y * WW;
        const d = Math.abs(x - a[0]) + Math.abs(y - a[1]);
        if (d < bd) { bd = d; best = [x, y]; }
      }
      this._digStair(a[0], a[1], best[0], best[1], floor, box, traps, rng);
    }
  }

  /** 입구 통로의 작은 방마다 함정이 **하나는 남아 있게** 마무리한다.

      통로를 팔 때 방마다 하나씩 심는데, 그 뒤에 다음 방의 벽을 세우고 · 내려가는 목을
      뚫고 · 통행 보수로 굴을 파면서 앞서 놓은 함정이 지워지곤 했다(실측: 여덟 방 중
      한둘이 빈 채로 남았다). 세계를 다 만든 뒤 한 번 훑어 빠진 방만 채운다 —
      여기가 타일을 건드리는 마지막 자리다. */
  ensureEntranceTraps(rng) {
    /* 어느 타일이 어떤 갈래의 함정인가 — 종류를 세려면 갈래로 묶어야 한다
       (화살 구멍 좌·우는 같은 갈래다). */
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
        /* ★ 방마다 **서로 다른 갈래 둘 이상**을 채운다.
           통로를 팔 때 심어 두긴 하는데, 그 뒤에 다음 방의 벽을 세우고 · 내려가는 목을
           뚫고 · 통행 보수로 굴을 파면서 앞서 놓은 것이 지워진다. 실측하면 방 서른다섯 곳
           중 열대여섯이 한 갈래만 남았다. 여기가 타일을 건드리는 마지막 자리이므로
           여기서 채워야 남는다. 자리는 putTileTrap 이 방 안에서 무작위로 고른다. */
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
        /* ③ 그래도 안 되면 — 바닥이 통째로 파여 나간 방이다. 걷는 줄 한 칸에
           부서지는 바닥을 되살려 넣는다. 밟으면 무너지고 아홉 초 뒤 돌아오므로
           길을 영영 막지는 않는다. 여기까지 와야 하는 방은 쉰 곳 중 서넛이다. */
        for (let x = b[0] + 2; x < b[0] + b[2] - 2 && !put; x++) {
          if (this.get(x, fy) !== T.AIR || this.get(x, fy - 1) !== T.AIR) continue;
          this.set(x, fy + 1, T.CRUMBLE);
          this.set(x, fy + 2, T.AIR);
          put = true;
        }
      }
    }
  }

  /** 암호 골방의 껍질을 (다시) 세운다.
      골방을 지은 뒤에도 굴 뚫기·함정 놓기가 그 위를 지나며 한두 칸을 갈아엎는다.
      한 칸만 캘 수 있어도 암호는 무의미해지므로, 타일을 건드리는 마지막 자리에서
      여섯 면을 다시 암호석으로 채운다. 안쪽(상자가 있는 칸)은 건드리지 않는다. */
  sealCipherVaults() {
    for (const v of this.ruinVaults || []) {
      const [x0, y0, x1, y1, bg] = v;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (y !== y0 && y !== y1 && x !== x0 && x !== x1) continue;
          this.set(x, y, T.CIPHERSTONE);
          this.setWall(x, y, bg);
        }
    }
  }

  /** 자물쇠가 걸린 돌 — 암호석·봉인석. 어떤 굴착·함정도 이 자리를 갈아엎지 않는다.
      갈아엎으면 암호를 풀 것 없이 옆으로 들어가 버린다(실측: 암호 골방 바닥이
      부서지는 바닥으로 바뀌어 다섯 칸이 뚫려 있었다). */
  locked(x, y) { const t = this.get(x, y); return t === T.CIPHERSTONE || t === T.SEALSTONE; }

  /** 길목(입구 목 · 통행 보수로 판 계단)에 함정을 하나 남긴다.

      ★ 방에 놓는 함정(putTileTrap)을 그대로 쓰면 안 된다. 화살 구멍 · 방전 코일 ·
        톱니 · 가스 분출구는 **전부 solid: 1** 이라, 좁은 통로 한복판에 놓이면 길을
        그대로 봉해 버린다. 실측에서 보수로 판 계단이 그렇게 막혀 유적 하나가
        통째로 끊겼다(방 24곳 중 0곳 도달).
      그래서 여기서는 **걷는 줄을 막지 않는 둘만** 쓴다.
        가시        — 통과되는 타일(solid 0). 밟으면 아프지만 길은 열려 있다
        부서지는 바닥 — 바닥 줄을 갈아 끼운다. 밑을 두 칸 파 두어 실제로 떨어진다 */
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
      const f = this.get(x, fy + 1);
      this.set(x, fy + 2, T.AIR); this.set(x, fy + 3, T.AIR);
      if (!solid(x, fy + 4)) this.set(x, fy + 4, f);   // 두 칸 구덩이 — 점프로 나올 수 있다
      this.set(x, fy + 1, T.CRUMBLE);
      put++;
    }
    return put > 0;
  }

  /** 방 하나에 타일 함정을 놓는다. 기계가 아니라 순수 타일이라 저장할 상태가 없다.
      **실제로 놓았으면 true.** 화살 구멍·톱니 같은 것은 벽이 있어야 박히는데,
      갓 파낸 통로처럼 사방이 빈 자리에서는 아무것도 안 놓고 조용히 지나갔다 —
      그래서 "함정이 하나는 있다"고 믿었던 입구 통로에 함정이 없는 방이 생겼다. */
  putTileTrap(r, fy, kind, rng) {
    if (kind === 'coil') {
      /* 방전 코일 — 마주 보는 두 개를 같은 줄에 세워야 아크가 흐른다.
         양쪽 벽에 하나씩 박으면 방을 가로지르는 전기 띠가 된다. */
      const ty = fy - rng.int(0, 1);
      const gap = Math.min(r.w - 3, rng.int(4, 9));
      const sx = r.x + 1 + rng.int(0, Math.max(0, r.w - gap - 3));
      if (this.get(sx, ty) !== T.AIR || this.get(sx + gap, ty) !== T.AIR) {
        this.set(sx, ty, T.SPARKCOIL); this.set(sx + gap, ty, T.SPARKCOIL);
      } else {                                   // 허공이면 바닥에 박아 세운다
        this.set(sx, fy + 1, T.SPARKCOIL); this.set(sx + gap, fy + 1, T.SPARKCOIL);
      }
      return true;
    }
    if (kind === 'gas') {
      const vx = r.x + rng.int(2, Math.max(2, r.w - 4));
      if (this.get(vx, fy + 1) === T.AIR) return false;
      this.set(vx, fy + 1, T.GASVENT);
      return true;
    }
    if (kind === 'grind') {
      // 벽에 박는다 — 벽에 붙어 걷는 길을 끊는 함정이라 벽이어야 의미가 있다
      const left = rng.chance(0.5);
      const tx = left ? r.x : r.x + r.w - 1;
      const ty = fy - rng.int(0, 1);
      if (this.get(tx, ty) === T.AIR) return false;
      this.set(tx, ty, T.GRINDER);
      return true;
    }
    if (kind === 'dart') {
      // 벽에 구멍을 뚫는다. 방 안쪽을 향해야 하므로 왼쪽 벽이면 오른쪽으로 쏜다
      const left = rng.chance(0.5);
      const tx = left ? r.x : r.x + r.w - 1;
      const ty = fy - rng.int(0, 1);
      if (this.get(tx, ty) === T.AIR) return false;
      this.set(tx, ty, left ? T.DART_R : T.DART_L);
      return true;
    } else if (kind === 'vent') {
      const vx = r.x + rng.int(2, Math.max(2, r.w - 4));
      if (this.get(vx, fy + 1) === T.AIR) return false;
      this.set(vx, fy + 1, T.FLAMEVENT);
      return true;
    } else {
      /* 부서지는 바닥.
         ★ **밑이 빈 자리에만 놓는다.** 예전에는 바닥 줄에 그냥 얹었는데, 그 밑은
         대개 단단한 암반이라 밟아서 무너져도 한 칸 내려서는 것으로 끝났다 —
         "사라지는 타일"인데 사라져도 아무 일이 없었다.
         빈 자리가 마땅치 않으면 **두 칸짜리 구덩이를 같이 판다.** 그래야 예전과
         같은 밀도를 유지하면서도 밟으면 실제로 떨어진다. 깊이를 두 칸으로 묶은 것은
         점프(세 칸)로 반드시 다시 올라올 수 있게 하기 위해서다. */
      const cx0 = r.x + rng.int(2, Math.max(2, r.w - 6));
      const n = rng.int(2, 4);
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
          this.set(sx + k, fy + 2, T.AIR);
          this.set(sx + k, fy + 3, T.AIR);
          if (TILE_DEF[this.get(sx + k, fy + 4)].solid !== 1) this.set(sx + k, fy + 4, floorTile);
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

  /** 유적 입구를 판다 — 생김새(arch)에 따라 들어가는 방식이 다르다.
      돌아오는 값은 "입구 방"으로 삼을 x좌표(없으면 null = 입구 없음) */
  carveRuinEntrance(spec, x0, y0, rng) {
    this._entranceSpots = [];                                 // 입구가 없으면 빈 채로 둔다
    this._entranceRooms = [];
    const ex = clamp(spec.x + rng.int(-(spec.w >> 2), spec.w >> 2), x0 + 3, x0 + spec.w - 4);
    const surf = this.surface[ex];

    if (spec.arch === 'buried') {
      // 입구가 없다. 대신 유적 둘레에 빈 공동을 둘러 두어, 동굴을 파고 다니다
      // 벽 너머로 닿게 된다. 지상에서는 흔적조차 보이지 않는다.
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
      /* 지표 아래에 묻힌 통로. 지상에는 부러진 기둥 하나와 흩어진 벽돌만 남아 있어
         눈에는 띄지만, 통로 입구가 흙 아래 대여섯 칸에 있어 파 내려가야 열린다.
         "입구가 보이는 유적"과 "입구가 없는 유적" 사이를 메우는 자리다. */
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
      // 유적 윗부분이 지상으로 솟아 있다 — 멀리서도 보인다. 대신 들어가는 목이 좁고,
      // 그 목마다 함정을 심어 "보이니까 쉽다"가 되지 않게 한다.
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
      /* 실내 장식 — 예전엔 속이 텅 빈 상자였다(장식이 하나도 없었다). 지상에 솟아
         멀리서도 보이는 구조물인 만큼, 안에 들어왔을 때도 "버려진 탑"으로 읽히게
         양쪽 벽에 횃불을 세로로 몇 개 박고 깃발을 걸어 둔다. 구조(모양)는 그대로 둔다. */
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

  /** 입구 통로 — **작은 방을 여러 개 엮은 불규칙한 길**.

      예전에는 곧은 수직 갱도 하나에 화살 구멍을 규칙적으로 박아 놓은 것이었다.
      모양이 늘 같아서 한 번 보면 다음 유적도 안 봐도 아는 길이 됐다.
      이제 내려가는 동안 작은 방 서넛을 지난다. 방마다 폭·높이·좌우 치우침이 다르고,
      막다른 곁방이 붙기도 하고, 방마다 그 유적의 함정이 하나씩 심긴다.

      entryKind 는 성격만 정한다.
      - foothold:   샤프트에 발판이 있다. 가장 다루기 쉽다
      - maze:       좌우로 크게 치우친다. 다음 방이 안 보인다
      - nofoothold: 발판이 없다. 떨어지는 것 말고는 내려갈 방법이 없고 바닥에 가시가 있다 */
  _carveEntranceShaft(ex, yTop, yBot, spec, rng) {
    const kind = spec.entryKind || 'foothold';
    const span = Math.max(6, (spec.w || 40) >> 2);
    const lo = ex - span, hi = ex + span;
    const bg = spec.bg, wall = spec.wall || T.RUINBRICK;
    const traps = spec.traps || ['dart', 'crumble'];
    const sway = kind === 'maze' ? 7 : kind === 'nofoothold' ? 4 : 3;

    const dig = (x, y) => { if (this.inB(x, y)) { this.set(x, y, T.AIR); this.setWall(x, y, bg); } };
    /* 방마다 바닥 한 자리를 적어 둔다. 유적을 다 짓고 나서 _ensureWalkable 이
       이 자리들까지 걸어 오갈 수 있는지 검사한다 — 그래야 "들어는 갔는데 못 나오는
       통로"가 안 남는다. */
    this._entranceSpots = [];
    this._entranceRooms = [];   // 작은 방의 상자 — 진단이 함정 유무를 잰다
    // 입구 목 — 먼저 뚫어 둔다. 방을 두를 때 세우는 벽은 이미 AIR인 칸을 건너뛰므로
    // 여기서 뚫어 놓으면 다시 막히지 않는다 (막혀서 지상에서 못 들어가던 일이 있었다)
    for (let y = yTop - 2; y <= yTop + 1; y++) for (let dx = -1; dx <= 1; dx++) dig(ex + dx, y);
    /* ★ 목에도 함정을 하나 심는다. 아래 작은 방마다 함정이 들어가긴 하지만, 문지방을
       넘는 순간부터 무사한 구간이 있으면 "그냥 걸어 들어가는 문"이 된다.
       들어가는 쪽·나오는 쪽을 가리지 않는다 — 어느 방향이든 여기를 지난다. */
    this.putPathTrap(ex, yTop + 1, rng);
    let cx = ex, cy = yTop;
    let n = 0;
    while (cy < yBot - 3 && n < 8) {
      n++;
      // --- 이 칸의 작은 방 ---
      const rw = rng.int(5, 9), rh = rng.int(4, 6);
      const rx = clamp(cx - (rw >> 1) + rng.int(-1, 1), lo, hi - rw);
      const ry = Math.min(cy, yBot - rh - 1);
      for (let x = rx - 1; x <= rx + rw; x++)
        for (let y = ry - 1; y <= ry + rh; y++) {
          const edge = (x === rx - 1 || x === rx + rw || y === ry - 1 || y === ry + rh);
          if (edge) { if (this.get(x, y) === T.AIR) continue; this.set(x, y, wall); this.setWall(x, y, bg); }
          else dig(x, y);
        }
      const fy = ry + rh - 1;
      for (let x = rx; x < rx + rw; x++) this.set(x, fy + 1, spec.floor || T.RUINTILE);
      /* 위에서 이 방으로 들어오는 목. 이게 없으면 방을 두를 때 세운 천장 벽이
         내려오던 길을 도로 막는다 — 통로 입구가 통째로 봉해져 지상에서 못 들어갔다. */
      const inX = clamp(cx, rx + 1, rx + rw - 2);
      for (let y = Math.min(cy, ry) - 1; y <= ry + 1; y++)
        for (let dx = -1; dx <= 1; dx++) dig(inX + dx, y);
      /* 방 바닥에서 그 목까지 되짚어 올라가는 디딤판. 방 높이가 다섯~여섯 칸이면
         바닥에서 천장 구멍까지 네다섯 칸이라 점프(세 칸)로는 못 닿았다 —
         내려오기만 하고 못 올라가는 통로가 돼서 보스를 잡고도 걸어 나올 수 없었다. */
      for (let y = fy - 2; y > ry; y -= 3)
        for (let dx = -1; dx <= 1; dx++) this.set(clamp(inX + dx, rx, rx + rw - 1), y, T.PLATFORM);
      this._entranceSpots.push([inX, fy]);
      this._entranceRooms.push([rx - 1, ry - 1, rw + 2, rh + 2, fy]);
      // 함정 — 방마다 반드시 하나, 절반은 둘. 확률로만 두면 함정 없는 길이 생긴다
      const fake = { x: rx - 1, y: ry - 1, w: rw + 2, h: rh + 2 };
      /* ★ 방마다 **서로 다른 함정을 여럿** 심는다.
         "함정 없이 그냥 걸어 들어가는 문"을 하나도 남기지 않기 위해서다 —
         들어가는 쪽인지 나오는 쪽인지는 가리지 않는다.
         한 가지를 여러 번 놓으면 첫 방만 보고 나머지를 다 아는 길이 되므로,
         **종류를 섞고 개수도 방마다 다르게(2~4) 굴린다.** 고른 종류가 못 놓이는
         자리면(벽이 없어 화살 구멍이 안 박히는 등) 다음 종류로 넘어간다. */
      const want = rng.int(2, 4);
      const pool = (traps.length > 1 ? traps.slice() : traps.concat(['crumble', 'vent']))
        .concat(['crumble', 'dart', 'vent', 'gas']);
      for (let i = pool.length - 1; i > 0; i--) {     // 순서를 섞는다
        const j = rng.int(0, i); const t2 = pool[i]; pool[i] = pool[j]; pool[j] = t2;
      }
      let placed = 0;
      const used = {};
      for (const kind of pool) {
        if (placed >= want) break;
        if (used[kind]) continue;                     // 같은 종류를 겹쳐 놓지 않는다
        if (this.putTileTrap(fake, fy, kind, rng)) { used[kind] = 1; placed++; }
      }
      while (placed < 2 && this.putPathTrap(rx + 1 + rng.int(0, Math.max(0, rw - 3)), fy, rng)) placed++;
      if (!placed) this.putPathTrap(rx + 1, fy, rng);
      if (kind === 'nofoothold' && rng.chance(0.6)) this.set(rx + rng.int(1, rw - 2), fy, T.SPIKE);
      if (rng.chance(0.45)) this.set(rx + 1, ry + 1, spec.torch || T.TORCH);

      // --- 막다른 곁방 (가끔) — 뒤져 볼 것이 있거나, 없거나 ---
      if (rng.chance(0.4)) {
        const dir = rng.chance(0.5) ? 1 : -1;
        const ax = clamp(dir > 0 ? rx + rw + 1 : rx - 5, lo, hi - 4);
        for (let x = Math.min(ax, ax + 3); x <= Math.max(ax, ax + 3); x++)
          for (let y = fy - 2; y <= fy; y++) dig(x, y);
        for (let x = ax; x <= ax + 3; x++) this.set(x, fy + 1, spec.floor || T.RUINTILE);
        // 이은 목
        for (let x = Math.min(rx + rw, ax); x <= Math.max(rx - 1, ax + 3); x++)
          if (Math.abs(x - (rx + rw / 2)) > rw / 2) { dig(x, fy); dig(x, fy - 1); }
        if (rng.chance(0.22)) this.objects.push({ type: 'chest', tier: 1,
          x: (ax + 1) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
        else this.putTileTrap({ x: ax - 1, y: fy - 3, w: 6, h: 5 }, fy, rng.pick(traps), rng);
      }

      // --- 다음 방으로 내려가는 목 ---
      const nx = clamp(rx + rng.int(1, rw - 2) + rng.int(-sway, sway), lo + 1, hi - 1);
      const drop = rng.int(3, 6);
      const ny = Math.min(fy + 1 + drop, yBot);
      /* 발판은 **어느 성격이든** 세 칸마다 남긴다.
         예전에는 foothold 만 발판을 깔았다. 나머지는 한 번 떨어지면 다시 못 올라와서,
         보스를 잡고도 걸어 나올 길이 없었다(실측에서 다섯 유적 모두 "보스↔밖" 실패).
         내려가는 길의 사나움은 발판이 아니라 함정과 가시로 낸다 — 아래 kind 별 처리 참고. */
      for (let y = fy + 1; y <= ny + 1; y++) {
        for (let dx = -1; dx <= 1; dx++) dig(nx + dx, y);
        if ((y - fy) % 3 === 0) this.set(nx, y, T.PLATFORM);
      }
      // 목이 옆으로 치우쳤으면 가로로도 이어 준다
      const bx0 = Math.min(nx, rx + 1), bx1 = Math.max(nx, rx + rw - 2);
      for (let x = bx0; x <= bx1; x++) { dig(x, fy); dig(x, fy - 1); }
      cx = nx; cy = ny;
    }
    // 마지막 목을 방 묶음까지 곧게 잇는다 (여기도 발판을 남긴다 — 나올 때 쓴다)
    for (let y = cy; y <= yBot; y++) {
      for (let dx = -1; dx <= 1; dx++) dig(cx + dx, y);
      if ((y - cy) % 3 === 0 && y > cy) this.set(cx, y, T.PLATFORM);
    }
    this._entranceLandX = cx;
    this._entranceSpots.push([ex, yTop + 1]);                 // 입구 목 — 지상으로 나가는 자리
  }

  /** 그 유적에만 놓이는 장식. 방 하나하나가 "어느 유적인지" 말하게 만든다 —
      예전에는 벽 색만 다르고 안은 전부 횃불 몇 개에 깃발 둘이었다.
      전부 통행을 막지 않는 자리(바닥 위 한 줄 · 천장 밑)에만 놓는다. */
  putRuinDecor(spec, r, fy, rng) {
    if (!spec.decor) return;
    /* ★ 규칙: 장식은 **걷는 줄(fy · fy-1)을 절대 막지 않는다.**
       바닥 타일은 fy+1 이고 플레이어 키가 두 칸이라, 그 두 줄이 통로다.
       처음에 얼음 기둥과 석상을 바닥까지 세웠더니 방문을 그대로 봉해서
       유적 절반이 못 들어가는 곳이 됐다(연결 검사 9/10 · 8/12 · 5/10).
       - 막는 타일(solid 1)은 천장 쪽에만, 또는 이미 벽인 자리를 갈아끼울 때만
       - 걷는 줄에 놓는 것은 통과되는 타일(solid 0)만
       재질을 유적마다 갈라 겉모습이 다르게 읽히게 한다 — 나무 · 돌 · 구리 · 얼음 · 유기물. */
    const list = Array.isArray(spec.decor[0]) ? spec.decor : [spec.decor];
    for (const [kind, tile, dens] of list) this._decorOne(spec, r, fy, kind, tile, dens, rng);
  }

  _decorOne(spec, r, fy, kind, tile, dens, rng) {
    const x1 = r.x + r.w - 2;
    const air = (x, y) => this.get(x, y) === T.AIR;
    if (kind === 'pillar') {
      // 천장에서 내려오다 두 칸 남기고 멈추는 기둥 — 밑으로 지나다닐 수 있다
      for (let x = r.x + 3; x < x1 - 1; x += 5) {
        if (!rng.chance(dens)) continue;
        for (let y = r.y + 2; y <= fy - 2; y++) if (air(x, y)) this.set(x, y, tile);
      }
    } else if (kind === 'stalac') {
      // 천장 고드름·종유석 — 길이가 제각각이라 천장이 울퉁불퉁해 보인다
      for (let x = r.x + 2; x < x1; x++) {
        if (!rng.chance(dens * 0.45)) continue;
        const len = rng.int(1, 3);
        for (let k = 0; k < len; k++) if (air(x, r.y + 2 + k)) this.set(x, r.y + 2 + k, tile);
      }
    } else if (kind === 'statue') {
      // 벽에 새긴 좌상 — 이미 벽인 칸만 갈아끼운다. 문이 뚫린 자리는 AIR라 안 건드린다
      for (const bx of [r.x, r.x + r.w - 1]) {
        if (!rng.chance(dens)) continue;
        for (let y = fy; y >= fy - 3; y--) if (this.get(bx, y) === spec.wall) this.set(bx, y, tile);
      }
    } else if (kind === 'frieze') {
      // 천장 밑을 두르는 띠 장식 (금 · 룬돌) — 벽 위쪽에만
      const y = r.y + 2;
      for (let x = r.x + 2; x < x1; x += 3) if (rng.chance(dens) && air(x, y)) this.set(x, y, tile);
    } else if (kind === 'beam') {
      // 천장을 받치는 갱목 — 세로 기둥 없이 천장 줄에만 건다
      for (let x = r.x + 2; x < x1; x += 4) {
        if (!rng.chance(dens)) continue;
        if (air(x, r.y + 2)) this.set(x, r.y + 2, tile);
        if (rng.chance(0.5) && air(x, r.y + 3)) this.set(x, r.y + 3, tile);
      }
    } else if (kind === 'rail') {
      // 광차 레일 — 바닥 타일을 널판으로 갈아 깐다 (통행에 영향 없음)
      if (!rng.chance(dens)) return;
      for (let x = r.x + 2; x < x1; x++) if (this.get(x, fy + 1) === spec.floor) this.set(x, fy + 1, tile);
    } else if (kind === 'crate') {
      // 쌓아 둔 나무 상자 — 한 칸 높이라 뛰어넘을 수 있다
      for (let x = r.x + 3; x < x1 - 1; x += 6)
        if (rng.chance(dens) && air(x, fy)) this.set(x, fy, tile);
    } else if (kind === 'pipe') {
      // 벽을 타고 흐르는 구리·납 배관 — 세션 2 전기 문명의 흔적
      const y = r.y + rng.int(2, 3);
      for (let x = r.x + 1; x <= x1; x++) if (rng.chance(dens) && air(x, y)) this.set(x, y, tile);
      for (const bx of [r.x + 2, x1 - 1])
        if (rng.chance(dens * 0.6)) for (let yy = y + 1; yy <= y + 2; yy++) if (air(bx, yy)) this.set(bx, yy, tile);
    } else if (kind === 'moss') {
      // 바닥을 덮은 이끼 — 바닥 타일만 갈아 깐다
      for (let x = r.x + 1; x <= x1; x++)
        if (rng.chance(dens) && this.get(x, fy + 1) === spec.floor) this.set(x, fy + 1, tile);
    } else if (kind === 'web' || kind === 'growth') {
      // 벽·천장에서 자라나온 것 — 통과되는 타일이라 바닥 줄에 놓아도 안전하다
      for (let x = r.x + 2; x < x1; x++) {
        if (rng.chance(dens * 0.4) && air(x, r.y + 2)) this.set(x, r.y + 2, tile);
        if (rng.chance(dens * 0.3) && air(x, fy)) this.set(x, fy, tile);
      }
    } else if (kind === 'brazier') {
      // 바닥에 세운 화로 — 통과되는 불이라 길을 막지 않는다
      for (let x = r.x + 4; x < x1 - 2; x += 7)
        if (rng.chance(dens) && air(x, fy)) this.set(x, fy, tile);
    }
  }

  /** 그 유적에만 있는 방 하나. 고유 이벤트가 터지는 자리이기도 하다.
      site.event 를 게임 쪽에서 읽을 수 있게 'ruinsig' 객체를 함께 놓는다. */
  buildSigRoom(spec, r, fy, cx, idx, rng) {
    const x1 = r.x + r.w - 2, sig = spec.sig;
    for (let x = r.x + 2; x < x1; x += 4) this.set(x, r.y + 2, spec.torch);

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
      /* 숫자 잠긴 골방 — 방 오른쪽 끝에 암호석 문을 세우고 그 너머에 상자를 둔다.
         세 자리 숫자는 비문 흔적에 한 자리씩 흩어져 있다(game.js ruinCode).
         "암호를 넣어야 열리는 유적"이 여기다.

         ★ 골방을 **암호석(hard 99)으로 통째로 두른다.** 예전에는 문만 봉인석이고
           벽·천장·바닥은 평범한 유적 벽돌이라, 암호를 풀 것 없이 옆을 파고 들어가면
           그만이었다. 이제 여섯 면이 다 캘 수 없는 돌이라 문으로만 들어간다.
           암호석은 유적 벽돌과 비슷한 색이라 구조 안에서 겉돌지 않는다. */
      const dx0 = x1 - 6;
      for (let y = fy - 5; y <= fy + 1; y++)
        for (let x = dx0; x <= x1 + 1; x++) {
          const edge = (y === fy - 5 || y === fy + 1 || x === dx0 || x === x1 + 1);
          this.set(x, y, edge ? T.CIPHERSTONE : T.AIR);
          this.setWall(x, y, spec.bg);
        }
      this.objects.push({ type: 'codedoor', ruin: spec.id, dx: dx0, dy: fy,
        x: dx0 * TS, y: (fy - 3) * TS, w: TS, h: TS * 4 });
      // 껍질 자리를 적어 둔다 — 세계를 다 만든 뒤 한 번 더 세워 확실히 잠근다
      (this.ruinVaults = this.ruinVaults || []).push([dx0, fy - 5, x1 + 1, fy + 1, spec.bg]);
      this.objects.push({ type: 'chest', tier: clamp(spec.tier + 2, 1, 6), locked: 1,
        x: (x1 - 2) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    } else if (sig === 'shaft') {
      // 무너진 갱도 — 바닥 절반이 부서지는 바닥이고 아래는 비어 있다
      for (let x = r.x + 3; x < x1 - 2; x++) {
        this.set(x, fy + 1, T.CRUMBLE);
        this.set(x, fy + 2, T.AIR); this.set(x, fy + 3, T.AIR);
      }
      for (let x = r.x + 3; x < x1 - 2; x += 2) this.set(x, fy + 4, T.SPIKE);
    } else if (sig === 'heart') {
      // 둥지의 심장 — 방 한가운데에 살덩이가 부풀어 있다
      // 천장에 매달린 살덩이 — 바닥에 놓으면 방을 가로막아 지나갈 수가 없다
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

    /* 이 방을 밟으면 유적 고유 이벤트가 한 번 터진다.
       world.objects 가 아니라 따로 둔다 — objects 는 우클릭 대상 목록이라, 방 하나만 한
       상자를 끼워 넣으면 그 방 안의 진짜 상자·비문을 가려 버린다. */
    if (spec.event) {
      if (!this.ruinEvents) this.ruinEvents = [];
      this.ruinEvents.push({ ruin: spec.id, ev: spec.event, sig,
        x: (r.x + 1) * TS, y: (r.y + 1) * TS, w: (r.w - 2) * TS, h: (r.h - 2) * TS });
    }
  }

  /** 신비한 방 — 싸움이 아니라 고르는 것이 내용이라 함정도 몹도 두지 않는다.
      가운데에 그 방의 상징물을 놓고, 우클릭할 수 있는 mystic 객체를 얹는다. */
  buildMysticRoom(spec, r, fy, cx, rng) {
    const m = MYSTIC[spec.mystic]; if (!m) return;
    const x1 = r.x + r.w - 2;
    for (let x = r.x + 2; x < x1; x += 3) this.set(x, r.y + 2, spec.torch || T.TORCH);
    // 방 안을 깨끗이 비운다 — 앞서 깔린 함정·장식을 걷어낸다
    for (let x = r.x + 1; x <= x1; x++)
      for (let y = r.y + 3; y <= fy; y++)
        if (TILE_DEF[this.get(x, y)].solid === 1) this.set(x, y, T.AIR);
    // 가운데 상징물 — 우물이면 물, 메아리면 룬돌, 별빛이면 수정
    const tile = T[m.tile] !== undefined ? T[m.tile] : T.RUNESTONE;
    for (let dx = -2; dx <= 2; dx++) this.set(cx + dx, fy + 1, T.RUINTILE);
    for (let dx = -1; dx <= 1; dx++) this.set(cx + dx, fy, tile);
    this.set(cx - 2, fy, spec.torch || T.TORCH);
    this.set(cx + 2, fy, spec.torch || T.TORCH);
    this.objects.push({ type: 'mystic', mk: spec.mystic, ruin: spec.id,
      x: (cx - 1) * TS, y: (fy - 1) * TS, w: TS * 3, h: TS * 2 });
  }

  /** 유적 하나를 짓는다 — 방·함정·상자·비문·미니보스 둥지까지.
      방마다 성격(role)을 달리 줘서, 열 개가 다 똑같은 네모가 되지 않게 한다. */
  buildRuinSite(spec, idx, rng) {
    const y0 = spec.y, x0 = spec.x - (spec.w >> 1);
    // 유적마다 자르는 깊이와 방 최소 크기를 달리 준다 (RUIN_SPEC[].bsp)
    const bsp = spec.bsp || [4, 15, 8];
    const rooms = this.carveDungeon({
      x0, y0, w: spec.w, h: spec.h, wall: spec.wall, floor: spec.floor, bg: spec.bg,
      rng, depth: bsp[0], minW: bsp[1], minH: bsp[2],
      plan: spec.plan                                        // 겉모양이 방 배치를 따라간다
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const boss = rooms[0];                                   // 가장 넓은 방이 보스방
    const site = { id: spec.id, n: spec.n, x: spec.x, y: y0 + (spec.h >> 1), w: spec.w, h: spec.h, rooms, idx };

    const ex = this.carveRuinEntrance(spec, x0, y0, rng);
    // 입구 통로의 작은 방 자리 — 진단이 "이 길에 함정이 있나"를 재는 데 쓴다
    site.ent = (this._entranceRooms || []).slice();

    /* 방 성격을 배분한다. 입구에서 먼 방일수록 좋은 것이 나오게 — 한 방만 털고 나가지 않도록.
       vault(보물방)는 보스방 다음으로 먼 곳에, 비문은 중간쯤에 둔다. */
    const entX = ex === null ? spec.x : ex;
    const rest = rooms.slice(1);
    rest.sort((a, b) => Math.abs(b.x - entX) - Math.abs(a.x - entX));   // 먼 것부터
    const roles = new Map();
    if (rest[0]) roles.set(rest[0], 'vault');
    if (rest[1]) roles.set(rest[1], 'vault');
    if (rest[Math.floor(rest.length / 2)]) roles.set(rest[Math.floor(rest.length / 2)], 'lore');
    for (const r of rest) if (!roles.has(r) && rng.chance(0.3)) roles.set(r, 'gauntlet');

    /* 고유 방 — 그 유적에만 있는 방 하나. 보물방 다음으로 먼 방에 놓는다.
       고유 이벤트는 이 방을 밟는 순간 터진다(game.js 의 ruinEvent). */
    const sigRoom = rest.find(r => !roles.has(r)) || rest[2] || rest[0];
    if (spec.sig && sigRoom) roles.set(sigRoom, 'sig');
    /* 신비한 방 — 한 세계에 두세 곳뿐이라 유적마다 후보 하나만 두고,
       buildRuins 가 미리 뽑아 둔 목록(this._mysticPick)에 든 유적에만 실제로 짓는다. */
    if (spec.mystic) {
      const mr = rest.find(r => !roles.has(r) && r.w >= 12);
      if (mr) roles.set(mr, 'mystic');
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
      // 벽 장식 — 예전엔 방마다 횃불 말고는 아무것도 없어 통짜 상자처럼 밋밋했다.
      // 양쪽 벽에 깃발을 하나씩 걸어 방 하나하나가 "누가 살았던 자리"로 읽히게 한다
      // (역할 상관없이 전부 — 함정/상자 자리는 안 건드리는 천장 쪽 줄이라 안전하다)
      if (r.h > 6) { this.set(r.x + 1, r.y + 4, T.BANNER); this.set(r.x + r.w - 2, r.y + 4, T.BANNER); }
      this.putRuinDecor(spec, r, fy, rng);                   // 그 유적에만 있는 장식
      if (r === boss) {
        // 보스방: 넓게 비우고 둥지를 놓는다. 함정은 두지 않는다 — 싸울 자리는 깨끗해야 한다
        this.objects.push({ type: 'lair', boss: spec.boss, ruin: idx,
          x: cx * TS, y: (fy + 1) * TS - 48, w: 40, h: 48 });
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 5) this.set(x, r.y + 2, spec.torch);
        this.objects.push({ type: 'chest', tier: clamp(spec.tier, 1, 4),
          x: (r.x + 3) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
        continue;
      }
      const role = roles.get(r);

      if (role === 'vault') {
        /* 보물방 — 등급이 가장 높은 상자를 두되, 지킴이가 붙고 바닥이 온통 함정이다.
           상자만 집고 튀는 게 아니라 한 번은 싸우게 만든다. */
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) this.set(x, r.y + 2, spec.torch);
        // 함정 개수와 지킴이 수가 유적 등급을 그대로 탄다 — 갱도는 2마리, 부패한 둥지는 5마리
        for (let k = 0; k < 1 + Math.round(rank * 0.7); k++) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
        for (let x = r.x + 2; x < r.x + r.w - 2; x++) if (rng.chance(SPIKE)) this.set(x, fy, T.SPIKE);
        /* 이 유적의 유물은 입구에서 가장 먼 보물방에만 들어간다 — 유적마다 하나뿐이고,
           끝까지 들어가 본 사람만 갖는다. relic 은 상자 객체에 붙어 세이브에 남는다. */
        const first = r === rest[0];
        const relic = first ? RUIN_RELIC[spec.id] : null;
        // 다른 유적의 위치 지도가 여기 들어간다 — 한 곳을 털면 다음 곳이 열리는 사슬
        const mapFor = first ? Object.keys(RUIN_MAP_IN).find(k => RUIN_MAP_IN[k] === spec.id) : null;
        this.objects.push({
          type: 'chest', tier: clamp(spec.tier + 1, 1, 6),
          x: cx * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null,
          relic: relic || undefined,
          ruinmap: mapFor ? 'ruinmap_' + mapFor : undefined,
          bonus: spec.bonus,
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
        // 비문방 — 함정 없이 조용하다. 읽을 것이 있는 방은 쉬어 가는 자리여야 한다
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) this.set(x, r.y + 2, spec.torch);
        this.objects.push({ type: 'lorestone', lore: spec.id,
          x: cx * TS, y: (fy + 1) * TS - 34, w: 26, h: 34 });
        continue;
      }

      if (role === 'gauntlet') {
        /* 시련방 — 상자가 아예 없다. 대신 함정이 촘촘하다. 지나가는 것 자체가 값이다.
           보상 없는 방을 섞어야 "다음 방엔 뭐가 있을까"가 생긴다. */
        for (let x = r.x + 3; x < r.x + r.w - 2; x += 8) this.set(x, r.y + 2, spec.torch);
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
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.set(x, r.y + 2, spec.torch);
      if (rng.chance(TRAP)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(TRAP * 0.56)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(SPIKE)) {
        const sx = r.x + rng.int(2, Math.max(2, r.w - 5));
        for (let k = 0; k < rng.int(2, 2 + Math.round(rank * 0.5)); k++) this.set(sx + k, fy, T.SPIKE);
      }
      // 상자 — 입구에서 멀수록 잘 나온다
      // 거리 보정은 1을 넘지 않게 묶는다 — 넓은 유적에서 far 가 2를 넘어 상자가 쏟아졌다
      const far = Math.min(1, Math.abs(r.x - entX) / Math.max(8, spec.w >> 1));
      if (rng.chance(CHEST + far * 0.14)) {          // 거리 보정도 절반 아래로
        const small = r.w * r.h < 180;
        this.objects.push({ type: 'chest', tier: clamp(spec.tier - 1 + (small ? 1 : 0), 1, 5),
          x: (cx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
      }
    }
    /* ★ 마지막에 연결을 한 번 더 보장한다.
       carveDungeon 안에서도 하지만, 그 뒤에 바닥을 통째로 갈아 까는 방(얼어붙은 회랑의
       얼음 바닥, 포자 정원의 이끼 바닥)이 있어서 거기로 지나가던 굴이 도로 메워졌다.
       실측으로 포자 굴이 10칸 중 4칸만 닿았다 — 여기서 다시 뚫으면 10/10이 된다. */
    this._ensureConnected(x0, y0, spec.w, spec.h, rooms);
    /* ★ 그리고 **걸어서** 닿는지까지 본다. 굴이 뚫려 있어도 못 올라가는 자리가 있었다
       (갱도는 방 열 곳 중 셋만 걸어 닿았다). 입구가 있으면 입구를 기준으로 삼는다 —
       "들어와서 보스까지 갔다가 나갈 수 있는가"가 그대로 검사가 된다. */
    /* 방마다 두 자리를 본다 — 왼쪽 끝과 한가운데(둥지·상자가 놓이는 자리).
       한 자리만 보면 방 안이 기둥으로 갈려 있을 때 반쪽만 닿아도 통과가 된다. */
    const spots = [];
    /* 세 번째 값 0 은 "돌아오는 길 검사는 건너뛴다"는 표시다. 방 하나의 두 자리는
       같은 바닥 줄에 나란히 있어 오갈 수 있으므로, 가운데 한 자리만 정직하게 걸어 본다
       (전부 보면 방 서른 개짜리 유적에서 세계 생성이 1초 넘게 길어진다). */
    for (const r of rooms) spots.push([r.x + 2, r.y + r.h - 3, 0], [r.x + (r.w >> 1), r.y + r.h - 3]);
    if (ex !== null) {
      const ent = this._entranceSpots.slice(), mouth = ent.pop();    // 마지막에 넣은 것이 입구 목
      // 기준점(맨 앞)은 입구 목 — "밖에서 들어가 안쪽 끝까지, 그리고 다시 밖으로"가 된다
      spots.unshift(...(mouth ? [mouth] : []), ...ent,
                    [clamp(ex, x0 + 1, x0 + spec.w - 2), y0 + 1]);
    }
    /* 실제 손질은 세계를 다 만든 뒤에 한다 — 유적을 지은 다음에도 큰 동굴·물웅덩이·
       심층 갱도가 유적을 가로질러 바닥을 헐어 놓는다. 그 뒤에 봐야 진짜 모습이다. */
    this._walkJobs.push([x0, y0, spec.w, spec.h, spots, spec.floor, spec.traps]);
    return site;
  }

  /* ---- 숨겨진 유적 3곳 + 심층 봉인실 ---- */
  buildRuins(rng) {
    this.ruins = [];
    this.ruinEvents = [];
    this.ruinSites = [];                                      // 석판 유적도 같이 담는다 (진단·저장용)
    this._walkJobs = [];                                      // 마지막에 돌릴 통행 검사 목록
    // 스토리 유적 3곳 — 예전엔 큰 상자 하나였는데, 석판 하나 놓인 빈 방이라 들를 이유가 없었다.
    // 같은 방 생성기를 태워 방을 여럿 두고 함정·상자를 흩뿌렸다. 석판은 가장 넓은 방에 둔다.
    /* 스토리 유적 3곳 — 석판 하나 놓인 빈 방이던 것을 방 생성기로 채웠다.
       셋은 제7장에 한 번에 열리지만, 석판 번호 순서대로 읽는 사람이 대부분이라
       그 순서를 그대로 난이도 계단으로 삼았다. 서리(0)가 가장 순하고 부패지대(2)가 가장 사납다.
       [x, y, 함정률, 가시률, 상자률, 방크기, 상자티어, 함정종류] */
    /* 입구 성격(entryKind)도 난이도 계단을 따라간다 — 서리(가장 순함)는 발판형,
       가운데는 미로형, 부패지대(가장 사나움)는 무발판형. 예전에는 이 통로에 함정을
       하나도 안 심어서 함정 없이 직행 입장이 가능했다(직행 입장 버그) — 이제
       _carveEntranceShaft로 통일해 최소 개수를 보장한다. */
    const spots = [
      { x: 420,  y: 220, trap: 0.52, spike: 0.24, chest: 0.56, w: 58, h: 34, tier: 2, traps: ['dart', 'crumble'], entryKind: 'foothold' },
      { x: 1700, y: 252, trap: 0.72, spike: 0.38, chest: 0.60, w: 62, h: 36, tier: 3, traps: ['dart', 'crumble', 'vent'], entryKind: 'maze' },
      { x: 3950, y: 236, trap: 0.90, spike: 0.52, chest: 0.64, w: 68, h: 40, tier: 4, traps: ['dart', 'vent', 'crumble'], entryKind: 'nofoothold' }
    ];
    spots.forEach((sp, i) => {
      const cx = sp.x, cy = sp.y, w = sp.w, h = sp.h;
      const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
      /* 석판 유적도 바이옴 유적과 같은 규격을 쓴다 — 도면(겉모양) · 묻힌 입구 ·
         고유 장식 · 고유 방 · 고유 이벤트. 예전에는 이 셋만 별도 코드라 저쪽을
         고쳐도 여기엔 안 미쳤다. */
      const st = STORY_RUIN[i] || {};
      const spec = {
        id: 'story' + i, n: '석판 유적 ' + (i + 1), x: cx, y: y0, w, h,
        wall: T.RUINBRICK, floor: T.RUINTILE, bg: 10, torch: T.TORCH,
        entryKind: sp.entryKind, plan: st.plan, arch: st.arch,
        decor: st.decor, sig: st.sig, event: st.event, bonus: st.bonus
      };
      const rooms = this.carveDungeon({
        x0, y0, w, h, wall: T.RUINBRICK, floor: T.RUINTILE, bg: 10,
        rng, depth: 5, minW: 16, minH: 8, plan: st.plan
      });
      rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      const main = rooms[0], fy0 = main.y + main.h - 3;
      for (let x = main.x + 3; x < main.x + main.w - 2; x += 8) this.set(x, main.y + 2, T.RUNESTONE);
      this.objects.push({ type: 'tablet', tablet: i, x: (main.x + (main.w >> 1)) * TS, y: (fy0 + 1) * TS - 48, w: 34, h: 48 });
      // 지상에서 내려오는 통로 — 이제 지표 아래에 묻는다(sunken). 지상에는 부러진 기둥만
      const ex = this.carveRuinEntrance(spec, x0, y0, rng);
      const entX = ex === null ? cx : ex;
      // 유물이 들어갈 방과 고유 방 — 통로에서 먼 것부터
      const rest = rooms.filter(r => r !== main)
        .sort((a, b) => Math.abs(b.x - entX) - Math.abs(a.x - entX));
      const far = rest[0], sigRoom = rest[1] || rest[0];
      for (const r of rooms) {
        const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
        for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.set(x, r.y + 2, T.TORCH);
        if (r.h > 6) { this.set(r.x + 1, r.y + 4, T.BANNER); this.set(r.x + r.w - 2, r.y + 4, T.BANNER); }
        this.putRuinDecor(spec, r, fy, rng);
        if (r === main) continue;
        if (r === sigRoom && st.sig) { this.buildSigRoom(spec, r, fy, rcx, i, rng); continue; }
        if (rng.chance(sp.trap)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (i >= 1 && rng.chance(sp.trap * 0.5)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (rng.chance(sp.spike)) for (let k = 0; k < rng.int(2, 3 + i); k++) this.set(r.x + 3 + k, fy, T.SPIKE);
        // 유물 방은 상자가 확률이 아니라 확정이다 — 유물은 유적마다 하나뿐이라 굴리면 안 된다
        if (r === far || rng.chance(sp.chest * 0.45))   // 유물 방만 확정, 나머지는 드물게
          this.objects.push({ type: 'chest', tier: sp.tier + (r.w * r.h < 180 ? 1 : 0),
            x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null,
            relic: r === far ? RUIN_RELIC['story' + i] : undefined,
            bonus: r === far ? st.bonus : undefined });
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

    /* --- 바이옴 유적 5곳 (스토리와 무관한 탐험 콘텐츠) ---
       신비한 방은 다섯 중 **세 곳**에만 둔다. 어디에나 있으면 신비하지 않다.
       씨앗으로 고르므로 세계마다 다른 세 곳이 걸린다. */
    const mk = Object.keys(MYSTIC);
    const pick = RUIN_SPEC.map((_, i) => i);
    for (let i = pick.length - 1; i > 0; i--) { const j = rng.int(0, i); [pick[i], pick[j]] = [pick[j], pick[i]]; }
    pick.slice(0, 3).forEach((ri, k) => { RUIN_SPEC[ri].mystic = mk[k % mk.length]; });
    pick.slice(3).forEach(ri => { delete RUIN_SPEC[ri].mystic; });

    RUIN_SPEC.forEach((spec, i) => {
      this.ruinSites.push(this.buildRuinSite(spec, i, rng));
      this.ruins.push({ id: spec.id, x: spec.x, y: spec.y + (spec.h >> 1), w: spec.w, h: spec.h });
    });

    // 심층 봉인실 — 봉인석 문 너머에 최초의 파수꾼 제단
    // 예전엔 버섯 골짜기(3300~3760) 밑이었다. "마을 아래"로 옮기라는 요청은 베이스캠프가
    // 아니라 실제로 "마을"이라 불리는 곳 — 여명 마을(dawnCity, x 2850~2960)을 가리킨다
    // (베이스캠프는 마을이 아니라는 지적을 받고 정정). 다만 여명 마을 바로 아래(x 2905
    // 중심) 심층은 이미 지하 공창(y 210~250)·폭주로(y 306~360)·설계실(폭주로 동쪽)이
    // 거의 다 채우고 있어서, 그 구조물들과 안 겹치도록 마을 지하 서쪽 가장자리(x 2800)로
    // 뒀다 — 같은 마을 지하 권역이되 세션 2 던전들과는 충분히 떨어진 자리다.
    const kx = 2800, ky = 350, kw = 56, kh = 26;   // 심층 봉인실 — 여명 마을 지하(서쪽)
    const dx0 = kx - kw / 2;
    this.objects.push({ type: 'seal', x: (dx0 + 1) * TS, y: (ky - 2) * TS, w: 44, h: 66 });
    this.objects.push({ type: 'altar', boss: 'first_keeper', x: kx * TS, y: (ky + kh / 2 - 3) * TS - 48, w: 44, h: 48 });
    this.ruins.push({ id: 'seal', x: kx, y: ky, w: kw, h: kh });
    this.sealRoom = { x: kx, y: ky, w: kw, h: kh, dx: dx0 + 1, dy: ky };

    /* ★ 심층 봉인실로 내려가는 길.
       예전에는 봉인문 서쪽에 아홉 칸짜리 주머니만 있고 거기로 이어지는 길이 **없었다** —
       지상에서 흘려보낸 물이 y76에서 멈추고 봉인실 근처에는 닿지도 않았다(실측).
       파고 내려가면 닿기는 하지만, 그건 "발견"이 아니라 우연이다.
       마을 서쪽 지하로 내려가는 통로를 판다. 마을 구조물(공창·폭주로·설계실)과 겹치지
       않는 x 2730~2770 대는 사람이 만든 타일이 하나도 없는 자연 암반이라 안전하다. */
    const sx0 = clamp(kx - 45, 40, WW - 40);
    const surfY = this.surface[sx0];
    this._entranceLandX = null;
    this._carveEntranceShaft(sx0, surfY + 2, ky + 4, {   // 문턱과 같은 높이에서 끝난다
      w: 26, bg: 10, wall: T.RUINBRICK, floor: T.RUINTILE, torch: T.TORCH,
      entryKind: 'foothold', traps: ['dart', 'crumble', 'gas']
    }, rng);
    // 지상 표식 — 부러진 기둥 셋. 여기가 무언가의 입구라는 것만 알린다
    for (const dx of [-4, -3, 3, 4]) {          // 목(±1)은 비워 둔다 — 덮으면 못 들어간다
      const gx = sx0 + dx, gy = this.surface[clamp(gx, 0, WW - 1)] - 1;
      for (let k = 0; k < (Math.abs(dx) === 3 ? 3 : 2); k++) this.set(gx, gy - k, T.RUINBRICK);
    }
    /* 방과 통로를 짓는 일은 **세계를 다 만든 뒤로 미룬다**(restoreSealRoom).
       여기서 지어 놓으면 뒤이어 파는 큰 동굴이 봉인실 바닥과 문 앞 복도를 그대로
       헐고 지나간다 — 실측에서 봉인실 바닥(y360)이 스물일곱 칸이나 뚫려 있었다. */
    this.sealRoom.endX = this._entranceLandX === null ? sx0 : this._entranceLandX;
    this.restoreSealRoom();
    /* 내려가는 통로도 다른 유적과 같이 "걸어서 오르내릴 수 있는가"를 본다.
       검사 범위 오른쪽 끝을 봉인문 서쪽(dx0)에 맞춰 둔다 — 안 그러면 문을 못 지나가는
       것을 "막혔다"로 보고 문 옆을 파서 봉인을 돌아가 버린다. */
    const ent = this._entranceSpots.slice(), mouth = ent.pop();
    const jx0 = sx0 - 2, jw = dx0 - jx0 - 12;
    this._walkJobs.push([jx0, ky - 8, jw, 20,
      [...(mouth ? [mouth] : []), ...ent, [dx0 - 4, ky + 4]], T.RUINTILE,
      ['dart', 'crumble', 'gas']]);
  }

  /** 심층 봉인실의 방·문·복도를 (다시) 짓는다. 씨앗을 쓰지 않으므로 몇 번 불러도 같다.
      세계를 다 만든 뒤 한 번 더 불러, 동굴이 헐고 간 자리를 되돌린다. */
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
    // 봉인문 (세로 통로) — 열쇠로 연다. **문 두 줄(dx0+1, dx0+2)은 절대 건드리지 않는다**
    for (let y = ky - 4; y <= ky + 4; y++) { this.set(dx0 + 1, y, T.SEALSTONE); this.set(dx0 + 2, y, T.SEALSTONE); }
    /* 문 앞 복도와 봉인실 안 계단.
       문턱(ky+4)과 복도 바닥 높이를 맞춘다 — 예전에는 복도가 ky+2, 봉인실 바닥이 ky+10
       이라 문을 열고 떨어지면 다섯 칸을 그냥 올라와야 했다. 점프는 세 칸이라 못 올라온다.
       실측에서 봉인실은 "보스까지 갔다가 못 나오는" 유일한 곳이었다. */
    const ly = ky + 4, endX = s.endX === undefined ? dx0 - 8 : s.endX;
    for (let x = Math.min(endX, dx0 - 8); x <= dx0; x++) {
      for (let y = ly - 2; y <= ly; y++) { this.set(x, y, T.AIR); this.setWall(x, y, 10); }
      this.set(x, ly + 1, T.RUINTILE);                         // 문턱과 같은 높이의 바닥
    }
    // 안쪽 — 바닥(ky+9)에서 세 칸씩 끊어 문턱(ky+4)까지 오르는 발판 두 줄
    for (let x = dx0 + 3; x <= dx0 + 8; x++) this.set(x, ky + 7, T.PLATFORM);
    for (let x = dx0 + 3; x <= dx0 + 7; x++) this.set(x, ky + 5, T.PLATFORM);
  }

  /** 위치 지도를 세계에 흩뿌린다 — 입구 없는 유적(arch: 'buried')마다 두 군데.

      ① **유적 바로 위 지표 아래 은닉처.** 지상에 돌무지 표식을 세우고 그 밑을 파면
         작은 방에 상자가 있다. "여기 아래에 무언가 있다"를 지상에서 알 수 있게 하는 길.
      ② **세계 어딘가의 동굴 상자.** 유적과 아무 상관 없는 자리라, 굴을 파다 우연히
         만나는 길. 지도가 유적 안에만 있으면 첫 유적을 못 연 사람은 영영 못 연다.

      여기에 앞서 만든 ③ 다른 유적의 보물방(RUIN_MAP_IN) 사슬까지 셋이 된다.
      어느 길로 얻어도 같은 지도이고, 이미 자리를 알면 "이미 자리를 안다"가 뜬다. */
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
  /** 이 좌표가 속한 유적 자체를 돌려준다 (id 가 붙어 있으면 어느 유적인지도 안다).
      예전 세이브의 ruins 항목에는 id 가 없다 — 그때는 그냥 "유적 안"으로만 쓴다. */
  ruinAt(tx, ty) {
    if (!this.ruins) return null;
    for (const r of this.ruins)
      if (tx > r.x - r.w / 2 && tx < r.x + r.w / 2 && ty > r.y - r.h / 2 && ty < r.y + r.h / 2) return r;
    return null;
  }
  /** 이 좌표가 속한 바이옴 유적의 잡몹 배율. 유적마다 난이도를 따로 매겨 뒀다.
      스토리 유적·봉인실처럼 RUIN_SPEC에 없는 곳은 1(그대로). */
  ruinMobMul(tx, ty) {
    for (const spec of RUIN_SPEC) {
      const hw = spec.w / 2, y0 = spec.y, y1 = spec.y + spec.h;
      if (tx > spec.x - hw && tx < spec.x + hw && ty > y0 - 2 && ty < y1 + 2)
        return spec.mobMul === undefined ? 1 : spec.mobMul;
    }
    return 1;
  }

  buildAltars(rng) {
    // 제단 밑면이 바닥 타일 윗면에 정확히 닿도록: y = 바닥행*TS - h
    // 부패 제단
    const cx1 = 2500, sy1 = this.surface[cx1];
    this.clearBox(cx1 - 14, sy1 - 14, 28, 14);
    for (let x = cx1 - 14; x < cx1 + 14; x++) { this.set(x, sy1, T.EBONSTONE); this.set(x, sy1 + 1, T.EBONSTONE); }
    this.objects.push({ type: 'altar', boss: 'corrupt_heart', x: cx1 * TS, y: sy1 * TS - 44, w: 40, h: 44 });
    // 서리 왕좌
    const cx2 = 210, sy2 = this.surface[cx2];
    this.clearBox(cx2 - 16, sy2 - 15, 32, 15);
    for (let x = cx2 - 16; x < cx2 + 16; x++) { this.set(x, sy2, T.BRICK); this.set(x, sy2 + 1, T.BRICK); }
    this.objects.push({ type: 'altar', boss: 'frost_witch', x: cx2 * TS, y: sy2 * TS - 44, w: 40, h: 44 });
    // 슬라임 제단 (마을 근처 언덕) — 베이스캠프(vx0..vx1 = 1000..1100, 여유폭 포함 984..1115)와
    // 겹치지 않도록 서쪽으로 충분히 떨어뜨려 둔다
    const cx3 = 800, sy3 = this.surface[cx3];
    this.clearBox(cx3 - 14, sy3 - 13, 28, 13);
    for (let x = cx3 - 14; x < cx3 + 14; x++) { this.set(x, sy3, T.STONE); this.set(x, sy3 + 1, T.STONE); }
    this.objects.push({ type: 'altar', boss: 'king_slime', x: cx3 * TS, y: sy3 * TS - 44, w: 40, h: 44 });
    // 심연 투기장
    const cx4 = 1400, cy4 = WH - 17;
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

  /** 큰 동굴을 여러 개 드렁커드 워크로 파낸다. 절반 정도는 안쪽에 황금 상자를 두고,
      그 옆에 가시 함정을 심어 둔다 — 욕심내면 다친다. */
  buildCaverns(rng) {
    const reserved = x => (x > 685 && x < 845) || (x > 1865 && x < 2055) || (x > 1365 && x < 1445);
    this.caverns = [];
    let placed = 0, tries = 0;
    while (placed < 11 && tries < 3000) {
      tries++;
      const cx = rng.int(20, WW - 20);
      if (reserved(cx)) continue;
      const cy = rng.int(this.surface[cx] + 22, Math.min(WH - 20, HELL_Y - 8));
      if (cy < 90) continue;
      let x = cx, y = cy;
      const cells = [];
      const steps = rng.int(90, 150);
      for (let s = 0; s < steps; s++) {
        const r = rng.int(3, 6);
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (dx * dx + dy * dy > r * r) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 3 || xx >= WW - 3 || yy < 6 || yy >= WH - 8) continue;
          if (this.solid(xx, yy)) { this.set(xx, yy, T.AIR); cells.push([xx, yy]); }
        }
        x = clamp(x + rng.int(-1, 1), cx - 26, cx + 26);
        y = clamp(y + rng.int(-1, 1), cy - 20, cy + 20);
      }
      if (cells.length < 220) continue;   // 실패한 시도(막혀서 거의 안 파인 경우) — 개수에 안 센다
      // 벽 장식: 수정과 횃불을 군데군데
      for (let i = 0; i < 16; i++) {
        const [px, py] = cells[rng.int(0, cells.length - 1)];
        if (this.get(px, py + 1) !== T.AIR) continue;
        this.set(px, py, rng.chance(.5) ? T.TORCH : T.CRYSTAL);
      }
      // 45% 확률로 황금 상자 + 함정
      if (rng.chance(0.45)) {
        const [gx, gy0] = cells[rng.int(0, cells.length - 1)];
        let fy = gy0;
        while (fy < WH - 8 && !this.solid(gx, fy + 1)) fy++;
        if (fy < WH - 8) {
          this.objects.push({ type: 'chest', tier: 6, x: gx * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
          this.set(gx - 1, fy, T.TORCH);
          // 상자 근처 바닥이 있는 자리를 몇 군데 찾아보고, 되는 곳에 함정을 심는다
          for (const tdx of [2, -2, 3, -3, 4, -4]) {
            const tx = clamp(gx + tdx, 3, WW - 3);
            let ty = fy;
            while (ty < WH - 8 && !this.solid(tx, ty + 1)) ty++;
            if (this.get(tx, ty) === T.AIR && this.solid(tx, ty + 1)) { this.set(tx, ty, T.SPIKE); break; }
          }
        }
      }
      // 물을 채울 때 다시 찾아올 수 있도록 이 큰 동굴이 실제로 파인 범위를 남긴다
      let bx0 = WW, bx1 = 0, by0 = WH, by1 = 0;
      for (const [px, py] of cells) {
        if (px < bx0) bx0 = px; if (px > bx1) bx1 = px;
        if (py < by0) by0 = py; if (py > by1) by1 = py;
      }
      this.caverns.push({ cx, cy, x0: bx0, x1: bx1, y0: by0, y1: by1 });
      placed++;
    }
  }

  /* ================= 동굴 물 =================
     노이즈로만 판 동굴은 어디를 가도 똑같이 생겨서 금방 지루해진다. 일부 웅덩이에 물을
     채우고, 큰 동굴 몇 곳에는 천장에서 물이 떨어지게 해 "여기가 어디였는지" 기억에 남는
     자리를 만든다. 유적·묘실·공창·마을 근처는 건드리지 않는다 — 설계된 공간이라서. */

  /** 물을 채우면 안 되는 자리인가 */
  _noWater(tx, ty) {
    if (tx < 4 || tx >= WW - 4 || ty < 4 || ty >= WH - 6) return true;
    if (ty < this.surface[clamp(tx, 0, WW - 1)] + 8) return true;   // 지표 근처는 제외
    if (ty >= HELL_Y - 6) return true;                              // 지옥은 용암의 자리다
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

  /** 웅덩이 채우기 — (x, y0)를 바닥으로 삼아 물이 새지 않는 만큼만 위로 쌓는다.
      한 줄을 채울 때 그 줄의 모든 칸이 "밑이 고체이거나 이미 물"이어야 한다. 한 칸이라도
      밑이 뚫려 있으면 그리로 다 빠져나가므로 그 줄에서 멈춘다. commit=false면 재보기만 한다. */
  _fillBasin(x, y0, maxDepth, maxWidth, commit) {
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
          if (this._noWater(cx, row)) { leak = true; break; }
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
    if (commit) for (const [cx, cy] of filled) this.set(cx, cy, T.WATER);
    return filled;
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
      if (yy < 6 || yy >= WH - 6) continue;
      if (this.get(x, yy) === T.AIR && TILE_DEF[this.get(x, yy + 1)].solid) return yy;
    }
    return -1;
  }

  /** 바닥에 그릇 모양을 파고 물을 채운다.
      큰 동굴은 노이즈로 뚫은 큰 덩어리라 물이 고일 만한 오목한 자리가 거의 없다. 그래서
      찾는 대신 판다 — 가장자리는 원래 바닥 높이 그대로 두고 가운데로 갈수록 깊게 파서,
      테두리가 저절로 둑이 된다. 밑이 뚫린 열은 그만큼 얕게 파 물이 아래로 새지 않게 한다. */
  _carveBasin(cx, floorY, halfW, depth) {
    const cells = [];
    for (let dx = -halfW; dx <= halfW; dx++) {
      const x = cx + dx;
      if (x < 6 || x >= WW - 6) continue;
      const fy = this._floorNear(x, floorY);
      if (fy < 0 || Math.abs(fy - floorY) > 1) continue;      // 여기서부터는 바닥이 아니다
      if (this._noWater(x, fy)) continue;
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
    for (const [x, y] of cells) this.set(x, y, T.WATER);
    return cells;
  }

  floodCaves(rng) {
    this.pools = [];
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
      lakes.push({ c, x: best.x, top });
    }

    // --- 폭포: 호수 위쪽 천장에서 물줄기를 떨어뜨린다 ---
    // 호수 절반쯤에만 두되, 한 곳도 못 놓았으면 마지막에 한 번은 반드시 놓는다 —
    // 세계에 따라 폭포를 한 번도 못 보는 일이 없도록.
    let fell = 0;
    for (const pass of [0, 1]) {
      for (const lk of lakes) {
        if (pass === 0 ? !rng.chance(0.6) : fell > 0) continue;
        if (lk.done) continue;
        for (let k = 0; k < 18; k++) {
          const fx = clamp(lk.x + rng.int(-6, 6), lk.c.x0 + 1, lk.c.x1 - 1);
          if (this.get(fx, lk.top) !== T.WATER) continue;       // 물 위로만 떨어뜨린다
          let cy = lk.top - 1;
          while (cy > 6 && this.get(fx, cy) === T.AIR) cy--;    // 천장 찾기
          const ceil = cy + 1;
          if (ceil >= lk.top - 4) continue;                     // 낙차가 너무 짧다
          if (this._noWater(fx, ceil)) continue;
          for (let y = ceil; y < lk.top; y++) this.set(fx, y, T.FALLS);
          // 폭포 앰비언트 음량을 거리로 매길 때 참조할 위치(music.js Ambient) — 타일을
          // 매 프레임 훑는 대신 이 목록만 본다
          this.falls = this.falls || [];
          this.falls.push({ x: fx, y: (ceil + lk.top) / 2 });
          lk.done = 1; fell++;
          break;
        }
      }
    }

    // --- 2. 작은 동굴: 여기저기 고인 물. 큰 동굴 범위는 위에서 이미 다뤘으니 건너뛴다 ---
    let made = 0, tries = 0;
    const want = 46;
    while (made < want && tries < 9000) {
      tries++;
      const px = rng.int(6, WW - 6);
      if (bigX.has(px)) continue;
      const py = rng.int(this.surface[px] + 14, Math.min(WH - 12, HELL_Y - 10));
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

  /** 정글 중간의 지상 폭포 + 호수. 노이즈만으로는 뚜렷한 절벽이 잘 안 나와서
      직접 깎는다 — 왼쪽은 자연 지형을 그대로 기준선으로 쓰고, 오른쪽을 12칸 넘게
      끌어올려 절벽을 만든 뒤 그 틈으로 폭포를 떨어뜨린다. 정글 스토리 유적(x≈1700)과
      뿌리 신전(x≈1560)에서 충분히 떨어진 x=1850을 중심으로 잡았다. */
  buildJungleFalls(rng) {
    const cx = 1850;
    if (this.biomeAt(cx).id !== 'jungle') return;   // 바이옴 경계가 시드에 따라 흔들릴 수 있다
    let leftY = 0;
    for (const sx of [cx - 30, cx - 25, cx - 20]) leftY += this.surface[clamp(sx, 0, WW - 1)];
    leftY = Math.round(leftY / 3);
    const rise = 14;                                 // "12블록 이상" 여유를 두고
    const rightY = leftY - rise;
    const cliffL = cx - 3, cliffR = cx + 3;
    const POOL_D = 5;                                // 폭포가 파낸 웅덩이 깊이

    /* --- 1. 왼쪽 기슭을 leftY 한 높이로 고른다 ---
       예전에는 이 단계가 없어서, 호수는 칼럼마다 제 지표(surface[x])에서 파이고 폭포는
       평균값 leftY에서 끝났다. 둘의 높이가 어긋나는 데다 사이에 마른 땅까지 남아
       "폭포 따로, 호수 따로"가 됐다. 수면과 물줄기의 밑동을 같은 행에 두는 게 핵심이다. */
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

    /* --- 3. 절벽면: 물줄기는 왼쪽 두 칸(=호수를 마주 보는 면) ---
       예전에는 물줄기를 cx-1·cx에 두었는데, 그 왼쪽 cx-3·cx-2가 진흙 기둥이라
       물줄기와 호수 사이에 벽이 서 있었다. 물줄기를 절벽의 노출면으로 옮기고,
       밑동은 웅덩이 바닥까지 그대로 물로 이어 붙인다. */
    for (let x = cliffL; x < cliffR; x++) {
      const isFalls = x <= cliffL + 1;
      if (isFalls) {
        for (let y = rightY; y < leftY; y++) { this.set(x, y, T.FALLS); this.setWall(x, y, 11); }
        for (let y = leftY; y <= leftY + POOL_D; y++) { this.set(x, y, T.WATER); this.setWall(x, y, 11); }
      } else {
        // 웅덩이보다 두 칸 더 깊게 채워 오른쪽 벽이 물을 받쳐 주게 한다
        for (let y = rightY; y <= leftY + POOL_D + 2; y++) { this.set(x, y, T.MUD); this.setWall(x, y, 11); }
      }
      this.surface[x] = rightY;
    }
    this.falls = this.falls || [];
    this.falls.push({ x: cliffL, y: (rightY + leftY) / 2 });

    /* --- 4. 호수: 폭포 바로 옆에 붙여서 판다 ---
       _carveBasin은 지표 근처를 _noWater로 걸러 내므로(지상엔 물을 안 놓는 게 기본값),
       지상 폭포호는 여기서 직접 판다. 먼 기슭은 얕고 폭포 밑이 가장 깊다 —
       떨어지는 물이 파낸 웅덩이로 읽히고, 반대편은 걸어 들어갈 수 있는 여울이 된다. */
    const lakeR = cliffL - 1, lakeL = lakeR - 20;
    const cells = [];
    for (let x = lakeL; x <= lakeR; x++) {
      const d = Math.round(1 + (POOL_D - 1) * ((x - lakeL) / (lakeR - lakeL)));
      for (let k = 1; k <= d; k++) this.set(x, leftY + k, T.AIR);
      for (let k = 0; k <= d; k++) { cells.push([x, leftY + k]); this.setWall(x, leftY + k, 11); }
    }
    for (const [x, y] of cells) this.set(x, y, T.WATER);
    // 동굴 호수 두 곳의 pools.push와 같은 최소 크기 기준(12칸) — 웅덩이 판정을 받으려면
    // 이 정도는 돼야 한다. 타일은 이미 물로 채워졌으니 아래는 스폰·낚시 등록만 가른다.
    if (cells.length >= 12) {
      // 폭포 밑동 두 칸도 같은 물웅덩이다 — 낚시·스폰 판정이 한 덩어리로 잡히게 함께 센다
      const poolN = cells.length + (POOL_D + 1) * 2;
      // spawnMul — 이 호수의 생물 스폰은 동굴 호수(big:1) 대비 60%만 (trySpawnWater에서 소비)
      // rareMul — 낚시에서 "물고기 아닌 것"이 걸릴 확률에 곱해진다(game.js resolveFish) —
      // 지상 폭포호라 고급 전리품이 잘 안 나온다는 설정
      this.pools = this.pools || [];
      // biome 표시 — trySpawnWater()가 이 표시를 보고 동굴 웅덩이 대신
      // 정글에 어울리는 생물(비단잉어 위주)을 고른다
      this.pools.push({ x: (lakeL + cliffL) >> 1, y: leftY, n: poolN, big: 1, spawnMul: 0.6, rareMul: 0.3, biome: 'jungle' });
    }

    // 장식 — 절벽 위아래에 발광 난초를 몇 그루 놓아 어둡지 않게 한다
    for (const x of [cliffR + 2, cliffR + 8, lakeL - 2, lakeL - 6]) {
      const fy = this.surface[clamp(x, 0, WW - 1)];
      if (this.get(x, fy) === T.AIR && this.solid(x, fy + 1)) this.set(x, fy, T.ORCHID);
    }
    // 수면 장식 — 호수 표면(leftY) 바로 위 칸에 수련을 듬성듬성 띄운다.
    // leftY 자체가 이미 물(k=0)이라, 그 위 칸(leftY-1)이 비어 있으면 수면에 뜬 것처럼 보인다.
    for (let x = lakeL; x <= lakeR; x++) {
      if (rng.chance(0.3) && this.get(x, leftY - 1) === T.AIR) this.set(x, leftY - 1, T.LILY);
    }
  }

  scatterChests(rng) {
    let placed = 0, tries = 0;
    while (placed < 165 && tries < 140000) {
      tries++;
      const x = rng.int(4, WW - 5), y = rng.int(this.surface[x] + 12, WH - 8);
      if (this.get(x, y) !== T.AIR || this.get(x, y - 1) !== T.AIR) continue;
      if (!this.solid(x, y + 1) || !this.solid(x + 1, y + 1)) continue;
      let tier = y > HELL_Y ? 5 : y > 326 ? 4 : y > 214 ? 3 : y > 142 ? 2 : 1;
      this.objects.push({ type: 'chest', tier, x: x * TS, y: (y - 0.2) * TS, w: 30, h: 26, items: null });
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
      if (px < d.x + d.w && px + w > d.x && py < d.y + d.h && py + h > d.y) return true;
    }
    return false;
  }
  /** 문 하나를 만들어 objects/doors 양쪽에 같은 참조로 등록한다 (열고 닫는 상태가 항상 같이 반영되도록).
      dir: 문이 열릴 때 밀려나는 방향(-1 왼쪽/+1 오른쪽) — 건물 안쪽이 아니라 바깥쪽으로 젖혀지게 한다. */
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
  /** 화면 범위 조명 계산. dayLight: 0~15 */
  computeLight(tx0, ty0, tx1, ty1, dayLight, extra) {
    const P = 14;
    const x0 = clamp(tx0 - P, 0, WW - 1), x1 = clamp(tx1 + P, 0, WW - 1);
    const y0 = clamp(ty0 - P, 0, WH - 1), y1 = clamp(ty1 + P, 0, WH - 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (!this.lightBuf || this.lightBuf.length < w * h) this.lightBuf = new Float32Array(w * h + 64);
    const L = this.lightBuf;
    L.fill(0, 0, w * h);
    // 시드
    for (let x = x0; x <= x1; x++) {
      const s = this.surface[x];
      for (let y = y0; y <= y1; y++) {
        const t = this.tiles[y * WW + x];
        const d = TILE_DEF[t];
        const k = (y - y0) * w + (x - x0);
        if (d.light) L[k] = d.light;
        if (t === T.AIR && y <= s && this.walls[y * WW + x] === 0) L[k] = Math.max(L[k], dayLight);
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
      return d.clear ? 1.05 : d.solid === 1 ? 2.7 : 0.92;
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

  /* ================= 저장 ================= */
  serialize() {
    return {
      seed: this.seed, ww: WW, wh: WH, ruinSites: this.ruinSites, ruinEvents: this.ruinEvents,
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
      caverns: this.caverns, pools: this.pools, falls: this.falls,
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
    w.doors = w.objects.filter(o => o.type === 'door');   // objects와 같은 참조로 다시 캐싱
    for (const m of (d.machines || [])) w.machines.set(m.y * WW + m.x, m);
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
    w.caverns = d.caverns || []; w.pools = d.pools || [];
    w.falls = d.falls || [];   // 폭포 앰비언트 도입 전 세이브 — 빈 배열이면 그냥 조용할 뿐, 안전하다
    return w;
  }
}
