/* ===== tileart.js — 절차적 타일 텍스처 아틀라스 =====
   각 타일마다 4가지 변형을 오프스크린 캔버스에 미리 그려두고
   렌더 시 drawImage로 블릿한다. 단색 fillRect 대비 질감/구분이 크게 개선된다. */
'use strict';

/* 배경이 비쳐야 하는 타일 (나무·잎·횃불·발판·덩굴) */
const ALPHA_TILE = {};
/* 상단 하이라이트를 생략할 타일 (이미 텍스처에 윗면이 있거나 반투명) */
const TOP_SKIP = {};

const ART = {};
ART[T.DIRT] = { k: 'soil', c: '#6b4a2f' };
ART[T.GRASS] = { k: 'grass', c: '#6b4a2f', g: '#4c7f34' };
ART[T.STONE] = { k: 'rock', c: '#5d5d63' };
ART[T.SAND] = { k: 'sand', c: '#c8ab6a' };
ART[T.SANDSTONE] = { k: 'strata', c: '#9c8047' };
ART[T.SNOW] = { k: 'snow', c: '#d5e2ee' };
ART[T.ICE] = { k: 'ice', c: '#8fc0dd' };
ART[T.WOOD] = { k: 'trunk', c: '#5a3c22', a: 1 };
ART[T.LEAF] = { k: 'leaf', c: '#3f6e2e', a: 1 };
ART[T.EBONSTONE] = { k: 'ebon', c: '#3a2b46' };
ART[T.CORRUPTGRASS] = { k: 'grass', c: '#4b3a5c', g: '#6d4a92' };
ART[T.ASH] = { k: 'soil', c: '#4a4038' };
ART[T.OBSIDIAN] = { k: 'glass', c: '#241d2e' };
ART[T.COPPER] = { k: 'ore', c: '#5d5d63', o: '#c0762f' };
ART[T.IRON] = { k: 'ore', c: '#5d5d63', o: '#a89c8e' };
ART[T.GOLD] = { k: 'ore', c: '#5d5d63', o: '#e0b93d' };
ART[T.MYTHRIL] = { k: 'ore', c: '#5d5d63', o: '#49b0a4' };
ART[T.SOULSTONE] = { k: 'ore', c: '#4a4452', o: '#9f7fe8', glow: 1 };
ART[T.HELLSTONE] = { k: 'ore', c: '#3e2a24', o: '#e0561c', glow: 1 };
ART[T.PLANK] = { k: 'plank', c: '#7a5734' };
ART[T.BRICK] = { k: 'brick', c: '#5f5e6b' };
ART[T.TORCH] = { k: 'torch', c: '#e8a53a', a: 1 };
ART[T.PLATFORM] = { k: 'platform', c: '#8a6640', a: 1 };
ART[T.BEDROCK] = { k: 'rock', c: '#191922' };
ART[T.VINE] = { k: 'vine', c: '#3d6b2c', a: 1 };
ART[T.CRYSTAL] = { k: 'crystal', c: '#7fd8e8', glow: 1 };
ART[T.LAVA] = { k: 'lava', c: '#e0561c' };
ART[T.ALTARSTONE] = { k: 'rock', c: '#2e2438' };
ART[T.CORRUPTLEAF] = { k: 'leaf', c: '#4a3060', a: 1 };
/* --- 2부 --- */
ART[T.CLOUD] = { k: 'cloud', c: '#dfe9f5' };
ART[T.SKYSTONE] = { k: 'rock', c: '#8fa8c0' };
ART[T.SKYGRASS] = { k: 'grass', c: '#dfe9f5', g: '#6ec49a' };
ART[T.SKYLEAF] = { k: 'leaf', c: '#6ec49a', a: 1 };
ART[T.RUINBRICK] = { k: 'brick', c: '#7a7160' };
ART[T.RUINTILE] = { k: 'ruintile', c: '#57503f' };
ART[T.RUNESTONE] = { k: 'runestone', c: '#4a5f7a' };
ART[T.SEALSTONE] = { k: 'seal', c: '#3a3550' };
ART[T.AETHER] = { k: 'ore', c: '#6f8296', o: '#8fe0d8', glow: 1 };
/* --- 세션 2: 지하 공창 --- */
ART[T.STEELPLATE] = { k: 'brick', c: '#6a6a74' };
ART[T.POWERSTONE] = { k: 'ore', c: '#4a4a52', o: '#e8a53a', glow: 1 };
ART[T.CONDUIT] = { k: 'runestone', c: '#8a6a3a' };
ART[T.SPIKE] = { k: 'spike', c: '#8a2a24', a: 1 };
ART[T.FLOWER] = { k: 'flower', c: '#d87ab0', a: 1 };
ART[T.WEED] = { k: 'weed', c: '#5a8f3a', a: 1 };
ART[T.CACTUS] = { k: 'cactustile', c: '#4a8a4a', a: 1 };
ART[T.MUSHROOM] = { k: 'mushroomtile', c: '#e0402c', a: 1 };
ART[T.CACTUS_BLOCK] = { k: 'cactusblock', c: '#3a7a3a' };
/* --- 3단계: 동력 자원 --- */
ART[T.COAL] = { k: 'ore', c: '#4e4e56', o: '#22212a' };
ART[T.LEAD] = { k: 'ore', c: '#5d5d63', o: '#8e8ea4' };
ART[T.OILSHALE] = { k: 'oilshale', c: '#3b352c' };
/* --- 3단계: 기계 ---
   전부 배경(a:1)이 비치는 1×1 설비다. mk가 기계 몸통 뼈대를 그리고, 위에 종류별 표식을 얹는다 */
ART[T.M_BELT] = { k: 'mk_belt', c: '#6a6a74', a: 1 };
ART[T.M_DRILL] = { k: 'mk_drill', c: '#8a6a3a', a: 1 };
ART[T.M_DRILL_E] = { k: 'mk_drill', c: '#4a8ab0', a: 1 };
ART[T.M_PUMP] = { k: 'mk_pump', c: '#5a5040', a: 1 };
ART[T.M_SMELTER] = { k: 'mk_furnace', c: '#7a4a30', a: 1 };
ART[T.M_PRESS] = { k: 'mk_press', c: '#8a8a98', a: 1 };
ART[T.M_REFINERY] = { k: 'mk_tank', c: '#4a5a4a', a: 1 };
ART[T.M_ASSEMBLER] = { k: 'mk_gear', c: '#5a6a8a', a: 1 };
ART[T.M_CRATE] = { k: 'mk_crate', c: '#66707c', a: 1 };
ART[T.M_GEN] = { k: 'mk_gen', c: '#7a5a3a', a: 1 };
ART[T.M_BATTERY] = { k: 'mk_battery', c: '#4a7a6a', a: 1 };
ART[T.M_POLE] = { k: 'mk_pole', c: '#7a6a4a', a: 1 };
ART[T.M_SORTER] = { k: 'mk_sorter', c: '#8a7a4a', a: 1 };
ART[T.M_TURRET] = { k: 'mk_turret', c: '#55555f', a: 1 };
ART[T.M_TRAP] = { k: 'mk_trap', c: '#4a6a8a', a: 1 };
ART[T.M_SWITCH] = { k: 'mk_switch', c: '#a03a30', a: 1 };
/* --- 4단계: 마을 건축 --- */
ART[T.THATCH] = { k: 'thatch', c: '#c8a860' };
ART[T.ROOFTILE] = { k: 'rooftile', c: '#8a4a3a' };
ART[T.TIMBERWALL] = { k: 'timber', c: '#d8cbaa', g: '#6a4a2a' };
ART[T.WALLSTONE] = { k: 'ashlar', c: '#8a8478' };
ART[T.BATTLEMENT] = { k: 'battlement', c: '#8a8478' };
ART[T.WINDOW] = { k: 'windowtile', c: '#9fd8e8' };
ART[T.FENCE] = { k: 'fencetile', c: '#7a5734', a: 1 };
ART[T.LAMPPOST] = { k: 'lamppost', c: '#e8c86a', a: 1 };
ART[T.BANNER] = { k: 'bannertile', c: '#b03a3a', a: 1 };
ART[T.HAYBALE] = { k: 'hay', c: '#d8b850' };
ART[T.SANDBAG] = { k: 'sandbagtile', c: '#a89468' };
/* --- 4단계: 농업. 한 페인터가 작물 종류(kind)와 자란 단계(st)를 받아 그린다 --- */
ART[T.FARMLAND] = { k: 'farmland', c: '#4a3620' };
for (let i = 0; i < 4; i++) {
  ART[T.WHEAT0 + i] = { k: 'crop', kind: 'wheat', st: i, c: ['#7fa84a', '#8fb84a', '#c8b04a', '#e0c058'][i], a: 1 };
  ART[T.ROOT0 + i] = { k: 'crop', kind: 'root', st: i, c: ['#7fa84a', '#6f9f5a', '#5f9f6a', '#8fd0a0'][i], a: 1 };
  ART[T.CAP0 + i] = { k: 'crop', kind: 'cap', st: i, c: ['#8a7a6a', '#9a7a68', '#b06a54', '#e0402c'][i], a: 1 };
  /* v1.1: 전리품 작물 넷. 같은 페인터에 kind 만 넷 더 붙였다 —
     자라는 세 단계는 셋과 똑같이 읽히고, 다 여문 단계에서만 서로 달라 보이면 된다.
     (덜 자란 밭에서 종류를 구분할 필요는 없다. 중요한 건 "여물었나"다) */
  ART[T.BEAN0 + i] = { k: 'crop', kind: 'bean', st: i, c: ['#6f8a4a', '#7f9a4a', '#a8804a', '#c04a44'][i], a: 1 };
  ART[T.BLOOM0 + i] = { k: 'crop', kind: 'bloom', st: i, c: ['#8a8a7a', '#9a9a88', '#b0b09c', '#e8e4d4'][i], a: 1 };
  ART[T.HERB0 + i] = { k: 'crop', kind: 'herb', st: i, c: ['#6a8a8a', '#6a9a9a', '#7aacb4', '#a8e0e8'][i], a: 1 };
  ART[T.POD0 + i] = { k: 'crop', kind: 'pod', st: i, c: ['#7a6a48', '#8a6a44', '#b06a34', '#e8842a'][i], a: 1 };
}
/* --- 4단계: 마을 기계 --- */
ART[T.M_WINDMILL] = { k: 'mk_windmill', c: '#c8bca0', a: 1 };
ART[T.M_MILL] = { k: 'mk_mill', c: '#8a7a5a', a: 1 };
ART[T.M_OVEN] = { k: 'mk_oven', c: '#9a6a4a', a: 1 };
/* --- 5단계: 울림 정글 / 버섯 골짜기 --- */
ART[T.JUNGLEGRASS] = { k: 'grass', c: '#4a3a26', g: '#3f7a34' };
ART[T.MUD] = { k: 'mud', c: '#4a3a26' };
ART[T.JUNGLELEAF] = { k: 'leaf', c: '#2f6a28', a: 1 };
ART[T.FERN] = { k: 'fern', c: '#4a8a3a', a: 1 };
ART[T.ORCHID] = { k: 'orchid', c: '#c85a9a', a: 1 };
ART[T.GLOWMOSS] = { k: 'grass', c: '#3a4a44', g: '#4a9a7a' };
ART[T.SPORESTONE] = { k: 'sporestone', c: '#4a5a5a' };
ART[T.GLOWCAP] = { k: 'glowcap', c: '#6fe0c0', a: 1 };
ART[T.GLOWLEAF] = { k: 'leaf', c: '#6fe0c0', a: 1, glow: 1 };   // 버섯나무 갓 조각
ART[T.LILY] = { k: 'lily', c: '#3a9a6a', a: 1 };   // 정글 폭포호 수련 — 발판 겸용
/* --- 6단계: 유적 --- */
ART[T.ICEBRICK] = { k: 'ashlar', c: '#7fb0d8' };
ART[T.SANDBRICK] = { k: 'ashlar', c: '#c8a468' };
ART[T.MINEWOOD] = { k: 'plank', c: '#6a4a2a' };
ART[T.M_DART] = { k: 'mk_dart', c: '#7a6a5a', a: 1 };
ART[T.M_FLAME] = { k: 'mk_jet', c: '#9a5a3a', a: 1 };
ART[T.M_FROST] = { k: 'mk_jet', c: '#6a9ab0', a: 1 };
/* --- 고대 유적 함정 (타일만으로 도는 것들) --- */
ART[T.DART_L] = { k: 'darthole', c: '#4a4238', d: -1 };
ART[T.DART_R] = { k: 'darthole', c: '#4a4238', d: 1 };
ART[T.FLAMEVENT] = { k: 'flamevent', c: '#8a4a2a' };
ART[T.SPARKCOIL] = { k: 'flamevent', c: '#5a8aa8' };
ART[T.GASVENT] = { k: 'flamevent', c: '#6a7a4a' };
ART[T.GRINDER] = { k: 'flamevent', c: '#6a6058' };
ART[T.CRUMBLE] = { k: 'crumble', c: '#6a6050' };
/* --- 7단계: 폭주로 --- */
ART[T.SLAGSTEEL] = { k: 'slag', c: '#5a4a44' };
ART[T.COREGLASS] = { k: 'crystal', c: '#e8b04a', glow: 1 };
/* --- 동굴 물 — 둘 다 반투명(a:1)이라 뒤의 벽이 비쳐 보인다 --- */
ART[T.WATER] = { k: 'water', c: '#2f6f9f', a: 1 };
ART[T.FALLS] = { k: 'water', c: '#4a8fc0', a: 1, fall: 1 };
/* --- 세션 2 종장: 설계실. 공창의 강철과 대비되도록 이음매 없는 흰 돌로 간다 --- */
ART[T.ARCHESTONE] = { k: 'ashlar', c: '#cfc7b8' };
ART[T.DRAFTGLASS] = { k: 'draftglass', c: '#8fd8e8', glow: 1 };
ART[T.ARCHSEAL] = { k: 'seal', c: '#b8a878' };
/* --- 특별 유적 --- */
ART[T.ORBITPLATE] = { k: 'brick', c: '#8fa8c8' };
ART[T.ORBITCORE] = { k: 'ore', c: '#6a7f9c', o: '#7fe0ff', glow: 1 };
ART[T.DEEPROCK] = { k: 'rock', c: '#3a3630' };
ART[T.BLACKDAMP] = { k: 'water', c: '#6a7a4a', a: 1, fall: 0 };

const TileArt = {
  V: 4,
  atlas: null, wallAtlas: null, ready: false,

  build() {
    for (const id in ART) if (ART[id].a) ALPHA_TILE[id] = 1;
    for (const id of [T.GRASS, T.CORRUPTGRASS, T.SNOW, T.ICE, T.LAVA, T.CRYSTAL,
                      T.WOOD, T.LEAF, T.CORRUPTLEAF, T.TORCH, T.VINE, T.PLATFORM, T.SPIKE,
                      T.FLOWER, T.WEED, T.CACTUS, T.MUSHROOM,
                      T.FENCE, T.LAMPPOST, T.BANNER, T.THATCH, T.BATTLEMENT, T.HAYBALE,
                      T.JUNGLEGRASS, T.GLOWMOSS, T.JUNGLELEAF, T.FERN, T.ORCHID, T.GLOWCAP, T.GLOWLEAF,
                      T.WATER, T.FALLS, T.BLACKDAMP]) TOP_SKIP[id] = 1;
    for (let i = 0; i < 4; i++) { TOP_SKIP[T.WHEAT0 + i] = 1; TOP_SKIP[T.ROOT0 + i] = 1; TOP_SKIP[T.CAP0 + i] = 1; }
    // 기계는 이미 자기 윗면을 그려 두었으므로 상단 하이라이트를 얹지 않는다
    for (const id in MACH_OF_TILE) TOP_SKIP[id] = 1;

    const N = TILE_DEF.length;
    const cv = document.createElement('canvas');
    cv.width = this.V * TS; cv.height = N * TS;
    const g = cv.getContext('2d');
    const rng = new RNG('ashfall-tileart-1');
    for (let id = 0; id < N; id++) {
      const s = ART[id];
      if (!s) continue;
      for (let v = 0; v < this.V; v++) this.paint(g, v * TS, id * TS, s, rng);
    }
    this.atlas = cv;

    const wc = document.createElement('canvas');
    wc.width = this.V * TS; wc.height = WALL_COLOR.length * TS;
    const wg = wc.getContext('2d');
    for (let i = 1; i < WALL_COLOR.length; i++)
      for (let v = 0; v < this.V; v++) this.paintWall(wg, v * TS, i * TS, WALL_COLOR[i], rng);
    this.wallAtlas = wc;

    this.ready = true;
  },

  /** 손그림 타일 텍스처가 로드되면 절차 생성 아틀라스의 해당 타일 행을 덮어 그린다.
      변형(V칸) 전부에 같은 이미지를 채운다 — 손그림은 한 장뿐이라 절차 생성처럼
      칸마다 다른 노이즈를 줄 수 없기 때문. img는 TS×TS 크기여야 한다. */
  applySprite(id, img) {
    if (!this.atlas || !img || !img.width) return;
    const g = this.atlas.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let v = 0; v < this.V; v++) g.drawImage(img, v * TS, id * TS, TS, TS);
  },

  /** 타일 블릿. h를 주면 위에서 h픽셀만 (발판용) */
  draw(c, id, v, sx, sy, h) {
    c.drawImage(this.atlas, v * TS, id * TS, TS, h || TS, sx, sy, TS, h || TS);
  },
  drawWall(c, wl, v, sx, sy) {
    c.drawImage(this.wallAtlas, v * TS, wl * TS, TS, TS, sx, sy, TS, TS);
  },

  /* ---------- 그리기 도우미 ---------- */
  _r(g, ox, oy, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(ox + Math.round(x), oy + Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  },
  _fill(g, ox, oy, col) { g.fillStyle = col; g.fillRect(ox, oy, TS, TS); },
  _speck(g, ox, oy, rng, n, a, b) {
    for (let i = 0; i < n; i++) this._r(g, ox, oy, rng.range(0, TS - 1), rng.range(0, TS - 1), 1, 1, rng.chance(.5) ? a : b);
  },

  /* ---------- 개별 질감 ---------- */
  paint(g, ox, oy, s, rng) {
    const R = (x, y, w, h, c) => this._r(g, ox, oy, x, y, w, h, c);
    const base = s.c;
    const dk = shade(base, .74), dk2 = shade(base, .54), lt = shade(base, 1.18), lt2 = shade(base, 1.4);

    switch (s.k) {
      case 'soil':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 11; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(2, 6), rng.range(2, 4), rng.chance(.5) ? dk : lt);
        this._speck(g, ox, oy, rng, 26, dk2, lt);
        break;

      case 'grass': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 9; i++) R(rng.range(-1, TS - 3), rng.range(4, TS - 3), rng.range(2, 6), rng.range(2, 4), rng.chance(.5) ? dk : lt);
        this._speck(g, ox, oy, rng, 18, dk2, lt);
        const g1 = s.g, g2 = shade(g1, 1.28), g3 = shade(g1, .68);
        let h = 5;
        for (let x = 0; x < TS; x++) {
          h = clamp(h + rng.range(-1.2, 1.2), 3, 8);
          R(x, 0, 1, h, g1);
          R(x, 0, 1, rng.chance(.6) ? 2 : 1, g2);
          R(x, h - 1, 1, 1, g3);
        }
        break;
      }

      case 'rock':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 10), rng.range(3, 7), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {   // 균열
          let x = rng.range(2, TS - 2), y = rng.range(-2, 6);
          for (let k = 0; k < rng.int(5, 12); k++) { R(x, y, 1, 1, dk2); x += rng.range(-1.2, 1.2); y += rng.range(.7, 1.7); }
        }
        this._speck(g, ox, oy, rng, 20, dk2, lt2);
        break;

      case 'sand':
        this._fill(g, ox, oy, base);
        this._speck(g, ox, oy, rng, 76, dk, lt);
        for (let i = 0; i < 3; i++) {   // 잔물결
          const y = rng.range(2, TS - 3);
          for (let x = 0; x < TS; x++) if (rng.chance(.55)) R(x, y + Math.sin(x * .55 + i) * .9, 1, 1, dk);
        }
        break;

      case 'strata': {
        this._fill(g, ox, oy, base);
        let y = rng.range(-3, 0);
        while (y < TS) { const h = rng.range(2.5, 5.5); R(0, y, TS, h, rng.chance(.5) ? dk : lt); y += h; }
        for (let i = 0; i < 4; i++) R(0, rng.range(0, TS), TS, 1, dk2);
        this._speck(g, ox, oy, rng, 22, dk2, lt2);
        break;
      }

      case 'snow':
        this._fill(g, ox, oy, base);
        this._speck(g, ox, oy, rng, 44, shade(base, .88), '#ffffff');
        R(0, 0, TS, 2, '#ffffff');
        for (let i = 0; i < 4; i++) R(rng.range(0, TS - 4), rng.range(3, TS - 2), rng.range(2, 5), 1, shade(base, .82));
        break;

      case 'ice':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 4; i++) {   // 사선 광택
          const x = rng.range(-6, TS), len = rng.range(6, 14), st = rng.range(0, TS - 4);
          for (let k = 0; k < len; k++) R(x + k, st + k, 1, 1, rng.chance(.6) ? lt2 : lt);
        }
        for (let i = 0; i < 2; i++) {   // 균열
          let x = rng.range(3, TS - 3);
          for (let y = 0; y < TS; y++) { R(x, y, 1, 1, dk); x += rng.range(-.8, .8); }
        }
        R(0, 0, TS, 1, lt2);
        break;

      case 'trunk': {
        const w = 16, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt);
        R(x0 + w - 2, 0, 2, TS, dk);
        for (let i = 0; i < 4; i++) {   // 나뭇결
          const x = x0 + rng.range(2, w - 3);
          for (let y = rng.range(0, 4); y < TS; y += rng.int(3, 8)) R(x, y, 1, rng.range(2, 5), dk2);
        }
        if (rng.chance(.3)) {           // 옹이
          const kx = x0 + rng.range(3, w - 6), ky = rng.range(3, TS - 7);
          R(kx, ky, 5, 4, dk2); R(kx + 1, ky + 1, 3, 2, dk);
        }
        break;
      }

      case 'leaf': {
        const c1 = base, c2 = shade(base, 1.32), c3 = shade(base, .66);
        for (let i = 0; i < 15; i++) {
          const x = rng.range(-2, TS - 3), y = rng.range(-2, TS - 3);
          const w = rng.range(3, 7), h = rng.range(3, 6);
          const col = [c1, c1, c2, c3][rng.int(0, 3)];
          R(x + 1, y, w - 2, h, col); R(x, y + 1, w, h - 2, col);
        }
        for (let i = 0; i < 6; i++) R(rng.range(1, TS - 2), rng.range(1, TS - 2), 1, 1, c2);
        // 발광 잎(버섯나무 갓 조각) — 은은한 빛무리를 얹는다. 타일 하나짜리 뚜렷한
        // 버섯 모양 대신 "빛나는 캐노피 표면"으로 읽히게 하는 게 목적이다
        if (s.glow) {
          g.globalAlpha = .28; g.fillStyle = shade(base, 1.6);
          g.beginPath(); g.arc(TS / 2, TS / 2, TS * .55, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
        break;
      }

      case 'ebon':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {   // 갈라진 정맥
          let x = rng.range(0, TS);
          for (let y = 0; y < TS; y++) { R(x, y, rng.chance(.3) ? 2 : 1, 1, dk2); x += rng.range(-1.5, 1.5); }
        }
        for (let i = 0; i < 5; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), 2, 2, '#7d5aa8');
        this._speck(g, ox, oy, rng, 14, dk2, '#6a4a92');
        break;

      case 'glass':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) {   // 유리질 사선 반사
          const x = rng.range(0, TS - 6), y = rng.range(0, TS - 6), len = rng.range(4, 10);
          for (let k = 0; k < len; k++) R(x + k, y + k, 1, 1, k < len / 2 ? lt2 : lt);
        }
        for (let i = 0; i < 4; i++) R(rng.range(0, TS - 4), rng.range(0, TS - 4), rng.range(2, 5), rng.range(2, 4), dk2);
        R(0, 0, TS, 1, lt);
        break;

      case 'ore': {
        // 돌 베이스
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        // 광석 덩이
        const o = s.o, oL = shade(o, 1.4), oD = shade(o, .58);
        const n = rng.int(4, 6);
        for (let i = 0; i < n; i++) {
          const x = rng.range(1, TS - 7), y = rng.range(1, TS - 6);
          const w = rng.range(4, 7), h = rng.range(3, 6);
          R(x, y, w, h, o);
          R(x, y, w - 1, 1, oL);
          R(x + 1, y + h - 1, w - 1, 1, oD);
          R(x + 1, y + 1, 1, 1, oL);
        }
        if (s.glow) {
          g.globalAlpha = .22; g.fillStyle = oL; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        }
        break;
      }

      case 'plank': {
        const rows = 3, hgt = TS / rows;
        for (let i = 0; i < rows; i++) {
          const y = i * hgt;
          R(0, y, TS, hgt, i % 2 ? shade(base, .9) : shade(base, 1.07));
          R(0, y, TS, 1, lt);
          R(0, y + hgt - 1, TS, 1, dk2);
          const jx = rng.range(3, TS - 4);
          R(jx, y + 1, 1, hgt - 2, dk);
          for (let k = 0; k < 3; k++) R(rng.range(0, TS - 4), y + rng.range(1, hgt - 2), rng.range(2, 6), 1, dk);
        }
        break;
      }

      case 'brick': {
        this._fill(g, ox, oy, shade(base, .55));
        const bh = TS / 3, bw = TS / 2;
        for (let row = 0; row < 3; row++) {
          const y = row * bh, off = row % 2 ? -bw / 2 : 0;
          for (let bx = off; bx < TS; bx += bw) {
            const col = rng.chance(.5) ? base : shade(base, 1.12);
            R(bx + 1, y + 1, bw - 2, bh - 2, col);
            R(bx + 1, y + 1, bw - 2, 1, shade(col, 1.2));
            R(bx + 1, y + bh - 2, bw - 2, 1, shade(col, .78));
          }
        }
        break;
      }

      case 'torch':
        R(TS / 2 - 2, TS * .34, 4, TS * .64, '#6a4a28');
        R(TS / 2 - 2, TS * .34, 1, TS * .64, '#8f6740');
        R(TS / 2 - 3, TS * .14, 6, 8, '#e06a16');
        R(TS / 2 - 2, TS * .09, 4, 8, '#f7a92c');
        R(TS / 2 - 1, TS * .06, 2, 6, '#ffe98c');
        break;

      case 'platform':
        R(0, 0, TS, 7, base);
        R(0, 0, TS, 1, shade(base, 1.3));
        R(0, 6, TS, 1, shade(base, .55));
        R(rng.range(4, TS - 6), 1, 1, 5, shade(base, .68));
        R(rng.range(4, TS - 6), 1, 1, 5, shade(base, .68));
        break;

      case 'spike': {
        for (let i = 0; i < 3; i++) {
          const bx = ox + 2 + i * 6 + rng.range(-1, 1);
          g.fillStyle = shade(base, 1.15);
          g.beginPath(); g.moveTo(bx, oy + TS); g.lineTo(bx + 3, oy + TS - 12); g.lineTo(bx + 6, oy + TS); g.closePath(); g.fill();
        }
        break;
      }

      case 'flower': {
        const fx = ox + TS / 2 + rng.range(-3, 3), fy = oy + TS - 7;
        g.strokeStyle = shade('#4a7a34', .8); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(fx, oy + TS); g.lineTo(fx, fy); g.stroke();
        g.fillStyle = base;
        for (const [ddx, ddy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) { g.beginPath(); g.arc(fx + ddx, fy + ddy, 1.8, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe58a'; g.beginPath(); g.arc(fx, fy, 1.4, 0, TAU); g.fill();
        break;
      }
      case 'weed': {
        for (let i = 0; i < 3; i++) {
          const bx = ox + 3 + i * 6 + rng.range(-1, 1), h = rng.int(5, 10);
          g.strokeStyle = shade(base, .9 + i * .15); g.lineWidth = 1.3;
          g.beginPath(); g.moveTo(bx, oy + TS); g.quadraticCurveTo(bx + rng.range(-2, 2), oy + TS - h * .6, bx + rng.range(-1, 1), oy + TS - h); g.stroke();
        }
        break;
      }

      case 'cactusblock': {
        // 여러 칸을 세로로 쌓았을 때 이음매 없이 이어지도록 칸 전체 높이(0~TS)를 채운다
        const w = 15, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt);
        R(x0 + w - 2, 0, 2, TS, dk);
        for (let i = 0; i < 3; i++) {   // 세로 골(리브)
          const rx = x0 + 3 + i * 4;
          R(rx, 0, 1, TS, dk2);
        }
        for (let y = rng.range(1, 4); y < TS; y += rng.int(4, 7)) {   // 가시
          R(x0 - 1, y, 1, 1, '#e8dcc0'); R(x0 + w, y + rng.int(0, 2), 1, 1, '#e8dcc0');
        }
        break;
      }

      case 'cactustile': {
        const cx = ox + TS / 2 + rng.range(-2, 2), h = rng.int(9, 14);
        g.fillStyle = base;
        g.fillRect(cx - 2, oy + TS - h, 4, h);
        if (rng.chance(.6)) g.fillRect(cx - 5, oy + TS - h * .55, 3, h * .4);
        if (rng.chance(.6)) g.fillRect(cx + 2, oy + TS - h * .7, 3, h * .45);
        g.fillStyle = shade(base, 1.3); g.fillRect(cx - 2, oy + TS - h, 1, h);
        break;
      }
      case 'mushroomtile': {
        // 눈에 잘 띄게 큼직한 광대버섯 스타일(붉은 갓 + 흰 반점)로 하나, 옆에 작은 것 하나
        const specs = [[ox + TS / 2 + 1, 10, 6, 4.4], [ox + 7 + rng.range(-1, 1), 6, 3.4, 2.6]];
        for (const [bx, h, capW, capH] of specs) {
          g.fillStyle = '#e8dcc0'; g.fillRect(bx - 1.5, oy + TS - h, 3, h);
          g.fillStyle = base;
          g.beginPath(); g.ellipse(bx, oy + TS - h + 1, capW, capH, 0, Math.PI, 2 * Math.PI); g.fill();
          g.fillStyle = '#fff2d8';
          g.beginPath(); g.arc(bx - capW * .4, oy + TS - h - capH * .3, 1, 0, TAU); g.fill();
          g.beginPath(); g.arc(bx + capW * .3, oy + TS - h - capH * .1, .8, 0, TAU); g.fill();
        }
        break;
      }

      case 'vine': {
        let x = TS / 2;
        for (let y = 0; y < TS; y++) {
          x = clamp(x + rng.range(-.7, .7), 3, TS - 5);
          R(x, y, 2, 1, base);
          if (rng.chance(.16)) R(x + (rng.chance(.5) ? -3 : 2), y, 3, 2, shade(base, 1.25));
        }
        break;
      }

      /* ---------- 설계 유리 ----------
         광맥이 아니라 벽에 박힌 도면판이다. 격자 위에 선과 점이 찍혀 있고, 그 선만 빛난다. */
      case 'draftglass': {
        this._fill(g, ox, oy, shade(base, .28));
        g.save();
        g.globalAlpha = .5;
        for (let x = 2; x < TS; x += 5) R(x, 0, 1, TS, shade(base, .62));
        for (let y = 2; y < TS; y += 5) R(0, y, TS, 1, shade(base, .62));
        g.globalAlpha = 1;
        // 도면 선 — 직각으로 몇 번 꺾이는 한 줄
        let px = rng.range(2, TS - 6), py = rng.range(2, TS - 6);
        for (let k = 0; k < 5; k++) {
          const len = rng.range(4, 9), horiz = k % 2 === 0;
          R(px, py, horiz ? len : 1, horiz ? 1 : len, shade(base, 1.5));
          if (horiz) px += len; else py += len;
          if (px > TS - 3) px = 2; if (py > TS - 3) py = 2;
        }
        for (let i = 0; i < 3; i++) R(rng.range(1, TS - 2), rng.range(1, TS - 2), 2, 2, '#eaffff');
        g.restore();
        break;
      }

      case 'crystal': {
        this._fill(g, ox, oy, shade(base, .42));
        for (let i = 0; i < 4; i++) {
          const x = rng.range(0, TS - 8), y = rng.range(0, TS - 9);
          const w = rng.range(5, 9), h = rng.range(6, 12);
          g.fillStyle = shade(base, .62 + i * .16);
          g.beginPath();
          g.moveTo(ox + x + w / 2, oy + y);
          g.lineTo(ox + x + w, oy + y + h * .42);
          g.lineTo(ox + x + w / 2, oy + y + h);
          g.lineTo(ox + x, oy + y + h * .42);
          g.closePath(); g.fill();
          R(x + w / 2 - 1, y + 1, 1, h * .42, shade(base, 1.5));
        }
        break;
      }

      case 'cloud': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) {
          const x = rng.range(-2, TS - 4), y = rng.range(-2, TS - 4), r = rng.range(3, 7);
          g.fillStyle = rng.chance(.5) ? lt2 : shade(base, .9);
          g.beginPath(); g.arc(x + r / 2, y + r / 2, r / 2, 0, TAU); g.fill();
        }
        R(0, 0, TS, 2, '#ffffff');
        R(0, TS - 3, TS, 3, shade(base, .82));
        break;
      }

      case 'ruintile': {
        this._fill(g, ox, oy, base);
        R(0, 0, TS, 1.4, lt); R(0, TS - 2, TS, 2, dk2);
        R(TS / 2 - .7, 0, 1.4, TS, dk);
        for (let i = 0; i < 10; i++) this._r(g, ox, oy, rng.range(0, TS - 1), rng.range(0, TS - 1), 1, 1, rng.chance(.5) ? dk2 : lt);
        break;
      }

      case 'runestone': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) R(rng.range(-1, TS - 4), rng.range(-1, TS - 4), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        // 발광 룬
        const gl = '#9fe8d8';
        R(TS * .3, TS * .22, 1.6, TS * .56, gl);
        R(TS * .3, TS * .22, TS * .4, 1.6, gl);
        R(TS * .3, TS * .48, TS * .3, 1.6, gl);
        R(TS * .64, TS * .5, 1.6, TS * .28, gl);
        g.globalAlpha = .3; g.fillStyle = gl; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        break;
      }

      case 'seal': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        // 사슬 문양
        g.strokeStyle = '#8a7fc0'; g.lineWidth = 2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, TS * .3, 0, TAU); g.stroke();
        g.lineWidth = 1;
        R(TS / 2 - 1, TS * .12, 2, TS * .76, '#8a7fc0');
        g.globalAlpha = .22; g.fillStyle = '#a06fff'; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        break;
      }

      /* ---------- 동굴 물 ----------
         반투명으로 깔아야 뒤쪽 벽이 비쳐서 "물속"으로 보인다. 불투명하게 채우면
         그냥 파란 블록이 되어 버려서, 알파를 직접 조절해 겹쳐 칠한다. */
      case 'water': {
        g.save();
        g.globalAlpha = s.fall ? 0.5 : 0.62;
        this._fill(g, ox, oy, base);
        g.globalAlpha = 1;
        if (s.fall) {
          // 떨어지는 물 — 세로로 길게 흐르는 줄기
          for (let i = 0; i < 5; i++) {
            const x = rng.range(0, TS - 2);
            g.globalAlpha = rng.range(.25, .6);
            R(x, rng.range(-4, 0), rng.range(1, 3), rng.range(10, TS + 4), lt2);
          }
          g.globalAlpha = .5;
          for (let i = 0; i < 10; i++) R(rng.range(0, TS - 1), rng.range(0, TS - 1), 1, rng.range(2, 5), '#eaf6ff');
        } else {
          // 고인 물 — 가로로 흔들리는 잔물결과 바닥 쪽 어둠
          g.globalAlpha = .34;
          for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 4), rng.range(0, TS - 2), rng.range(4, 11), 1, lt2);
          g.globalAlpha = .22;
          R(0, TS - 5, TS, 5, dk2);
          g.globalAlpha = .5;
          this._speck(g, ox, oy, rng, 8, lt, dk);
        }
        g.restore();
        break;
      }

      case 'lava':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 8; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 8), rng.range(2, 5), rng.chance(.5) ? shade(base, 1.32) : shade(base, .72));
        R(0, 0, TS, 2, shade(base, 1.5));
        this._speck(g, ox, oy, rng, 14, '#ffd27a', shade(base, .6));
        break;

      /* ---------- 3단계: 유혈암 ---------- */
      case 'oilshale': {
        this._fill(g, ox, oy, base);
        let y = rng.range(-3, 0);
        while (y < TS) { const h = rng.range(2, 4.5); R(0, y, TS, h, rng.chance(.5) ? dk : lt); y += h; }
        // 기름이 밴 광택 — 검은 얼룩 위에 무지갯빛 한 점
        for (let i = 0; i < 4; i++) {
          const x = rng.range(0, TS - 4), yy = rng.range(0, TS - 3);
          R(x, yy, rng.range(3, 6), rng.range(2, 3), '#1a1712');
          R(x + 1, yy, 1, 1, rng.chance(.5) ? '#5a7f6a' : '#7a6a8a');
        }
        this._speck(g, ox, oy, rng, 12, '#12100c', '#6a6050');
        break;
      }

      /* ---------- 3단계: 기계 ----------
         전부 같은 뼈대(_mkBody) 위에 종류별 표식만 다르게 얹어, 한눈에 "기계"로 묶여 보이게 했다 */
      case 'mk_belt': {
        R(0, 6, TS, TS - 10, dk2);
        R(0, 6, TS, 2, lt);
        R(0, TS - 5, TS, 1, shade(base, .4));
        for (let x = 1; x < TS; x += 4) R(x, 8, 2, TS - 14, shade(base, .92));   // 벨트 마디
        R(0, 5, 2, TS - 8, shade(base, .6)); R(TS - 2, 5, 2, TS - 8, shade(base, .6));
        break;
      }
      case 'mk_drill': {
        this._mkBody(g, ox, oy, base, R);
        R(7, 3, 8, 4, shade(base, 1.45));                   // 모터 덮개
        for (let k = 0; k < 3; k++) R(8 + k * 2, 8 + k, 2, TS - 11 - k * 2, '#c8ccd4');   // 비트
        R(9, TS - 4, 4, 2, '#8a8e96');
        break;
      }
      case 'mk_pump': {
        this._mkBody(g, ox, oy, base, R);
        R(4, 4, 3, TS - 8, shade(base, .5)); R(15, 4, 3, TS - 8, shade(base, .5));
        R(4, 8, 14, 3, '#2a2620');                          // 흔들대
        R(9, 10, 4, TS - 13, '#3a352c');
        R(7, TS - 5, 8, 3, shade(base, 1.3));
        break;
      }
      case 'mk_furnace': {
        this._mkBody(g, ox, oy, base, R);
        R(5, 9, 12, 8, '#1e1a16');                          // 화구
        R(6, 12, 10, 5, '#e8842a');
        R(7, 14, 8, 3, '#ffcf6a');
        R(6, 3, 4, 4, shade(base, .5)); R(13, 3, 4, 4, shade(base, .5));   // 굴뚝
        break;
      }
      case 'mk_gen': {
        this._mkBody(g, ox, oy, base, R);
        R(3, 12, 9, 7, '#1e1a16');                          // 화실
        R(4, 15, 7, 4, '#e8842a');
        R(5, 17, 5, 2, '#ffcf6a');
        g.fillStyle = '#c8ccd4';                            // 플라이휠 — 용광로와 구분되는 표식
        g.beginPath(); g.arc(ox + 15, oy + 10, 5, 0, TAU); g.fill();
        g.fillStyle = '#4a4a54';
        g.beginPath(); g.arc(ox + 15, oy + 10, 2.2, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .5;
          R(15 + Math.cos(a) * 5 - 1, 10 + Math.sin(a) * 5 - 1, 2, 2, '#8a8e99');
        }
        R(4, 2, 4, 4, shade(base, .45));                    // 배기구
        R(12, 3, 7, 2, '#4a4a54');                          // 축
        break;
      }
      case 'mk_press': {
        this._mkBody(g, ox, oy, base, R);
        R(2, 2, 18, 6, '#2e2e38');                          // 프레스 헤드 (어두운 강철)
        R(2, 2, 18, 1.5, '#9aa0ad');
        R(2, 7, 18, 1.5, '#12121a');
        R(9, 8, 4, 4, '#c8ccd4');                           // 램
        R(2, TS - 8, 18, 5, '#2e2e38');                     // 모루
        R(2, TS - 8, 18, 1.5, '#9aa0ad');
        R(4, 12, 2, 5, '#12121a'); R(16, 12, 2, 5, '#12121a');   // 안내 기둥
        break;
      }
      case 'mk_tank': {
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = shade(base, 1.35);
        g.beginPath(); g.ellipse(ox + TS / 2, oy + 11, 7, 8, 0, 0, TAU); g.fill();
        g.fillStyle = '#2e2a24';
        g.beginPath(); g.ellipse(ox + TS / 2, oy + 13, 5, 5, 0, 0, TAU); g.fill();
        R(TS / 2 - 1, 2, 2, 4, shade(base, .5));
        break;
      }
      case 'mk_gear': {
        this._mkBody(g, ox, oy, base, R);
        const cx = ox + TS / 2, cy = oy + TS / 2;
        g.fillStyle = shade(base, 1.5);
        g.beginPath(); g.arc(cx, cy, 6.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, .45);
        g.beginPath(); g.arc(cx, cy, 2.4, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) {                        // 톱니
          const a = k * TAU / 6;
          R(TS / 2 + Math.cos(a) * 8 - 1.5, TS / 2 + Math.sin(a) * 8 - 1.5, 3, 3, shade(base, 1.5));
        }
        break;
      }
      case 'mk_crate': {
        // 나무 상자(저장 상자류)와 헷갈리지 않도록 다른 기계들과 같은 금속 뼈대(_mkBody)를
        // 쓰고, 위쪽 투입구+아래쪽 저장 칸 표식만 얹는다 — "기계"로 한눈에 묶여 보이면서도
        // 크레이트 특유의 표식은 남긴다.
        this._mkBody(g, ox, oy, base, R);
        R(4, 3, TS - 8, 5, '#1e1a16');                       // 위쪽 투입구
        R(5, 4, TS - 10, 3, shade(base, .5));
        for (let k = 0; k < 3; k++) R(4 + k * 5, TS - 8, 3, 4, shade(base, 1.35));   // 저장 칸
        break;
      }
      case 'mk_battery': {
        this._mkBody(g, ox, oy, base, R);
        R(6, 2, 4, 2, shade(base, 1.5)); R(13, 2, 4, 2, shade(base, 1.5));   // 단자
        R(4, 5, 15, TS - 8, '#1e2a28');
        R(5, 6, 13, 3, '#6fe0c0');                           // 잔량 눈금
        R(5, 10, 13, 3, shade('#6fe0c0', .55));
        R(5, 14, 13, 3, shade('#6fe0c0', .3));
        break;
      }
      case 'mk_pole': {
        R(TS / 2 - 2, 2, 4, TS - 3, base);
        R(TS / 2 - 2, 2, 1.5, TS - 3, lt);
        R(2, 4, TS - 4, 2, shade(base, 1.25));               // 가로대
        R(3, 3, 2, 4, '#4a4a52'); R(TS - 5, 3, 2, 4, '#4a4a52');
        R(2, 9, TS - 4, 1, shade(base, .6));
        R(TS / 2 - 4, 9, 2, 2, '#8fd8ff');
        break;
      }
      case 'mk_sorter': {
        this._mkBody(g, ox, oy, base, R);
        R(3, 9, 16, 4, '#2a2620');
        R(4, 10, 6, 2, '#8fd8ff');                           // 통과선
        R(12, 10, 6, 2, '#e0a03c');                          // 분기선
        R(11, 5, 2, 12, shade(base, 1.5));
        break;
      }
      case 'mk_turret': {
        R(2, TS - 8, 18, 6, shade(base, .8));                // 받침대
        R(2, TS - 8, 18, 1.5, shade(base, 1.5));
        R(4, TS - 3, 3, 3, '#22222a'); R(15, TS - 3, 3, 3, '#22222a');
        g.fillStyle = shade(base, 1.7);                      // 포탑 머리
        g.beginPath(); g.arc(ox + TS / 2, oy + 11, 6.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.1);
        g.beginPath(); g.arc(ox + TS / 2 + 1, oy + 12, 4.6, 0, TAU); g.fill();
        R(TS / 2 - 2, 0, 4, 12, '#1e1e26');                  // 총열
        R(TS / 2 - 2, 0, 1.4, 12, '#8a8e99');
        R(TS / 2 - 3, 0, 6, 2.5, '#d8dce4');                 // 총구
        R(TS / 2 - 6, 9, 2.5, 2.5, '#e0563c');               // 조준등
        break;
      }
      case 'mk_trap': {
        R(0, TS - 8, TS, 8, shade(base, .55));
        R(0, TS - 8, TS, 2, lt);
        for (let x = 2; x < TS - 2; x += 5) R(x, TS - 12, 2, 5, '#c8ccd4');   // 전극
        R(3, TS - 14, 2, 3, '#9fd8ff'); R(13, TS - 15, 2, 4, '#9fd8ff');
        break;
      }
      /* ---------- 5단계: 정글 / 버섯 골짜기 ---------- */
      case 'mud':
        // 흙과 헷갈리지 않게 더 어둡게 깔고, 물기와 뿌리를 얹어 젖은 땅으로 읽히게 한다
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 9; i++)
          R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 8), rng.range(2, 5), rng.chance(.5) ? dk2 : base);
        for (let i = 0; i < 4; i++) {                 // 고인 물기
          const x = rng.range(1, TS - 5), y = rng.range(1, TS - 3);
          R(x, y, rng.range(3, 5), 1.4, lt2);
          R(x, y + 1.4, rng.range(2, 4), 1, lt);
        }
        for (let i = 0; i < 2; i++) {                 // 파고든 잔뿌리
          let rx = rng.range(2, TS - 2), ry = rng.range(0, 4);
          for (let k = 0; k < rng.int(4, 9); k++) { R(rx, ry, 1, 1, '#2f5a28'); rx += rng.range(-1, 1); ry += rng.range(.7, 1.6); }
        }
        this._speck(g, ox, oy, rng, 22, '#241a10', lt);
        break;

      case 'fern': {
        // 잎 여러 장이 바닥에서 부챗살처럼 퍼진다
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.42 + rng.range(-.1, .1);
          const len = rng.range(8, 14), bx = TS / 2 + rng.range(-3, 3);
          const col = i % 2 ? base : shade(base, 1.22);
          for (let k = 0; k < len; k++) {
            const px = bx + Math.cos(a) * k, py = TS - 1 + Math.sin(a) * k;
            R(px, py, 1.6, 1.6, col);
            if (k % 3 === 1) {                        // 잔잎
              R(px - 2, py, 2, 1, shade(col, .8));
              R(px + 1.6, py, 2, 1, shade(col, .8));
            }
          }
        }
        break;
      }

      case 'orchid': {
        const stem = '#3f7a34';
        R(TS / 2 - 1, TS - 10, 2, 10, stem);
        R(TS / 2 - 4, TS - 6, 3, 1.4, stem); R(TS / 2 + 2, TS - 8, 3, 1.4, stem);
        const cx = TS / 2, cy = TS - 13;
        for (let k = 0; k < 5; k++) {                 // 꽃잎 다섯 장
          const a = k * TAU / 5 - Math.PI / 2;
          g.fillStyle = k % 2 ? base : lt;
          g.beginPath();
          g.ellipse(ox + cx + Math.cos(a) * 3.4, oy + cy + Math.sin(a) * 3.4, 2.6, 1.9, a, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffe08a';
        g.beginPath(); g.arc(ox + cx, oy + cy, 1.7, 0, TAU); g.fill();
        g.globalAlpha = .22; g.fillStyle = base;
        g.beginPath(); g.arc(ox + cx, oy + cy, 7, 0, TAU); g.fill();
        g.globalAlpha = 1;
        break;
      }

      case 'lily': {
        /* 수면에 뜬 얇은 초록 판. 발판(PLATFORM)과 같은 판정이라 그림도 같은 자리
           — 타일 맨 위 몇 px에 납작하게 눕힌다. 두꺼운 원으로 그리면 "물풀 덩어리"로
           보여서, 판은 얇게 두되 연잎임을 알아채도록 세 가지만 남겼다:
           한쪽 V자 노치 · 가운데에서 퍼지는 잎맥 · 판 위에 얹힌 작은 연꽃. */
        const cx = TS / 2, cy = 3.5;                   // 판의 중심선 (타일 위쪽)
        const rx = TS / 2 - 0.5, ry = 3;
        g.fillStyle = base;
        g.beginPath(); g.ellipse(ox + cx, oy + cy, rx, ry, 0, 0, TAU); g.fill();
        // V자 노치 — 오른쪽을 물빛으로 도려내 연잎 특유의 갈라진 실루엣을 만든다
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.moveTo(ox + cx + rx + 1, oy + cy);
        g.lineTo(ox + cx + rx - 4.5, oy + cy - 2.6);
        g.lineTo(ox + cx + rx - 4.5, oy + cy + 2.6);
        g.closePath(); g.fill();
        g.restore();
        g.fillStyle = lt;                              // 윗면 하이라이트 (판이 물에 뜬 느낌)
        g.beginPath(); g.ellipse(ox + cx - 1, oy + cy - 1, rx - 3, 1, 0, 0, TAU); g.fill();
        g.fillStyle = dk;                              // 아랫면 그림자
        g.beginPath(); g.ellipse(ox + cx, oy + cy + 1.8, rx - 2, 0.9, 0, 0, TAU); g.fill();
        g.strokeStyle = dk; g.lineWidth = .7;          // 잎맥 — 가운데에서 부챗살로
        for (let k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(ox + cx, oy + cy);
          g.lineTo(ox + cx + k * 3.6, oy + cy + (k % 2 ? 2 : -2));
          g.stroke();
        }
        const fx = ox + cx - 5, fy = oy + cy - 3.2;    // 작은 연꽃 — 판 위에 얹는다
        g.fillStyle = '#f7d6ea';
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .4;
          g.beginPath();
          g.ellipse(fx + Math.cos(a) * 1.5, fy + Math.sin(a) * 1.1, 1.3, .9, a, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffe08a';
        g.beginPath(); g.arc(fx, fy, .9, 0, TAU); g.fill();
        break;
      }

      case 'sporestone':
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++)
          R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 6; i++) {                 // 바위에 박힌 포자 알갱이
          const x = rng.range(1, TS - 3), y = rng.range(1, TS - 3);
          R(x, y, 2, 2, '#4a8a78');
          R(x, y, 1, 1, '#7fd0b8');
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        break;

      case 'glowcap': {
        const specs = [[TS / 2 + rng.range(-1, 1), 12, 7, 5], [7 + rng.range(-1, 1), 7, 4, 3]];
        for (const [bx, h, capW, capH] of specs) {
          R(bx - 1.6, TS - h, 3.2, h, '#dff0e8');     // 자루
          g.fillStyle = base;
          g.beginPath(); g.ellipse(ox + bx, oy + TS - h + 1, capW, capH, 0, Math.PI, 2 * Math.PI); g.fill();
          g.fillStyle = shade(base, 1.35);
          g.beginPath(); g.ellipse(ox + bx, oy + TS - h, capW * .62, capH * .6, 0, Math.PI, 2 * Math.PI); g.fill();
          R(bx - capW, TS - h + 1, capW * 2, 1.2, shade(base, .7));
        }
        g.globalAlpha = .26; g.fillStyle = base;      // 스스로 내는 빛
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 12, 10, 0, TAU); g.fill();
        g.globalAlpha = 1;
        break;
      }

      /* ---------- 4단계: 마을 건축 ---------- */
      case 'thatch': {
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 40; i++) {          // 비스듬히 눕힌 짚단
          const x = rng.range(-3, TS), y = rng.range(0, TS - 2);
          const len = rng.range(4, 9);
          const col = [base, lt, dk, shade(base, .88)][rng.int(0, 3)];
          for (let k = 0; k < len; k++) R(x + k, y + k * .32, 1, 1, col);
        }
        R(0, 0, TS, 2, lt2);                    // 처마 끝의 밝은 줄
        R(0, TS - 2, TS, 2, shade(base, .55));
        break;
      }
      case 'rooftile': {
        this._fill(g, ox, oy, dk2);
        for (let row = 0; row < 3; row++) {     // 겹쳐 얹은 기와
          const y = row * 7.5 - 1, off = (row % 2) ? 4 : 0;
          for (let x = -8; x < TS; x += 8) {
            R(x + off, y, 7, 7, base);
            R(x + off, y, 7, 1.5, lt);
            R(x + off + 6, y, 1, 7, dk2);
            R(x + off + 1, y + 6, 5, 1, shade(base, .62));
          }
        }
        break;
      }
      case 'timber': {
        this._fill(g, ox, oy, base);            // 회반죽
        this._speck(g, ox, oy, rng, 20, shade(base, .9), lt2);
        const w2 = s.g, wl = shade(w2, 1.25), wd = shade(w2, .7);
        R(0, 0, TS, 3, w2); R(0, 0, TS, 1, wl);        // 상하 인방
        R(0, TS - 3, TS, 3, w2); R(0, TS - 1, TS, 1, wd);
        R(0, 0, 3, TS, w2); R(0, 0, 1, TS, wl);        // 좌우 기둥
        R(TS - 3, 0, 3, TS, w2); R(TS - 1, 0, 1, TS, wd);
        for (let k = 0; k < TS; k++) R(3 + k * .72, 3 + k * .72, 2, 2, w2);   // 빗대
        break;
      }
      case 'ashlar': {
        this._fill(g, ox, oy, base);            // 다듬은 큰 돌
        const rows = [[0, 11], [11, 11]];
        for (const [y, h] of rows) {
          const off = y ? 6 : 0;
          for (let x = -11; x < TS; x += 12) {
            R(x + off + 1, y + 1, 10, h - 2, rng.chance(.5) ? lt : base);
            R(x + off + 1, y + 1, 10, 1.2, lt2);
            R(x + off + 1, y + h - 2, 10, 1.2, dk2);
          }
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        break;
      }
      case 'battlement': {
        // 흉벽: 아래는 꽉 찬 벽, 위는 이가 빠져 있다 (총안)
        R(0, 8, TS, TS - 8, base);
        R(0, 8, TS, 1.5, lt2);
        R(0, TS - 2, TS, 2, dk2);
        R(0, 0, 8, 9, base); R(0, 0, 8, 1.5, lt2);
        R(TS - 8, 0, 8, 9, base); R(TS - 8, 0, 8, 1.5, lt2);
        R(7, 0, 1.5, 9, dk2); R(TS - 8, 0, 1.5, 9, dk2);
        this._speck(g, ox, oy, rng, 14, dk2, lt);
        break;
      }
      case 'windowtile': {
        const fr = '#6a4a2a', frl = shade(fr, 1.3);
        R(0, 0, TS, TS, fr);
        R(0, 0, TS, 1.5, frl);
        R(2, 2, TS - 4, TS - 4, shade(base, .6));
        g.globalAlpha = .55; R(2, 2, TS - 4, TS - 4, base); g.globalAlpha = 1;
        R(TS / 2 - 1, 2, 2, TS - 4, fr);        // 창살
        R(2, TS / 2 - 1, TS - 4, 2, fr);
        R(4, 4, 5, 5, lt2);                     // 유리 반사
        R(TS - 8, TS - 9, 3, 4, shade(base, 1.2));
        break;
      }
      case 'fencetile': {
        R(2, 6, 3, TS - 6, base);               // 기둥 둘
        R(TS - 5, 6, 3, TS - 6, base);
        R(2, 6, 1, TS - 6, lt); R(TS - 5, 6, 1, TS - 6, lt);
        R(0, 9, TS, 2.5, base); R(0, 9, TS, 1, lt);     // 가로대 둘
        R(0, 15, TS, 2.5, base); R(0, 15, TS, 1, lt);
        R(2, 5, 3, 1.5, lt2); R(TS - 5, 5, 3, 1.5, lt2);
        break;
      }
      case 'lamppost': {
        const pole = '#4a4a52';
        R(TS / 2 - 1.5, 8, 3, TS - 8, pole);
        R(TS / 2 - 1.5, 8, 1, TS - 8, shade(pole, 1.5));
        R(TS / 2 - 5, TS - 2, 10, 2, pole);     // 받침
        R(TS / 2 - 4, 2, 8, 8, shade(pole, .8));   // 등집
        R(TS / 2 - 3, 3, 6, 6, base);
        R(TS / 2 - 2, 4, 4, 4, lt2);
        R(TS / 2 - 5, 1, 10, 2, pole);
        g.globalAlpha = .3; g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + 6, 9, 0, TAU); g.fill();
        g.globalAlpha = 1;
        break;
      }
      case 'bannertile': {
        R(1, 0, TS - 2, 2.5, '#6a4a2a');        // 가로대
        R(4, 2, TS - 8, TS - 6, base);          // 천
        R(4, 2, 2, TS - 6, lt);
        R(TS - 6, 2, 2, TS - 6, dk);
        // 아래 갈라진 끝
        R(4, TS - 4, 5, 2, base); R(TS - 9, TS - 4, 5, 2, base);
        R(TS / 2 - 3, 6, 6, 6, '#e8d8a0');      // 문장 — 별 조각
        R(TS / 2 - 1, 4, 2, 10, '#e8d8a0');
        break;
      }
      case 'hay': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 30; i++) {
          const x = rng.range(0, TS - 5), y = rng.range(0, TS - 1);
          R(x, y, rng.range(3, 6), 1, rng.chance(.5) ? lt : dk);
        }
        R(0, 2, TS, 1.5, '#8a6a2a'); R(0, TS - 5, TS, 1.5, '#8a6a2a');   // 묶은 끈
        R(0, 0, TS, 1.5, lt2);
        break;
      }
      case 'sandbagtile': {
        this._fill(g, ox, oy, dk2);
        for (const [x, y, w2] of [[-2, 0, 13], [10, 0, 13], [3, 8, 13], [-4, 15, 13], [12, 15, 13]]) {
          g.fillStyle = rng.chance(.5) ? base : lt;
          g.beginPath(); g.ellipse(ox + x + w2 / 2, oy + y + 4, w2 / 2, 4, 0, 0, TAU); g.fill();
          R(x + 1, y + 1, w2 - 3, 1.4, lt2);
          R(x + w2 / 2 - .7, y, 1.4, 8, shade(base, .7));
        }
        break;
      }

      /* ---------- 4단계: 농업 ---------- */
      case 'farmland': {
        // 옆에서 본 밭 — 세로 줄무늬로 그리면 울타리처럼 보여서, 위에 갈아엎은 흙두둑을 얹는다
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 12; i++)
          R(rng.range(-1, TS - 3), rng.range(4, TS - 3), rng.range(3, 7), rng.range(2, 4), rng.chance(.5) ? base : dk2);
        this._speck(g, ox, oy, rng, 22, dk2, base);
        R(0, 0, TS, 5, base);                    // 부드럽게 갈린 표층
        for (let x = 0; x < TS; x += 4) {        // 두둑
          const h = rng.range(1.5, 3);
          R(x, 5 - h, 3, h + 1, lt);
          R(x + 3, 4, 1, 2, dk2);
        }
        R(0, 0, TS, 1.2, lt2);
        this._speck(g, ox, oy, rng, 8, '#3a2a16', lt);
        break;
      }
      case 'crop': {
        // 줄기를 같은 간격·같은 높이로 세우면 울타리처럼 보인다. 포기마다 위치와 키를 흩뜨린다
        const st = s.st, kind = s.kind;
        const stalk = st === 3 ? shade(base, .68) : shade(base, .88);
        const n = [2, 3, 3, 4][st];
        const base_h = [6, 11, 15, 19][st];
        for (let i = 0; i < n; i++) {
          const x = 2.5 + i * (TS - 5) / n + rng.range(-1.6, 1.6);
          const h = base_h * rng.range(0.78, 1.1);
          const lean = rng.range(-1.2, 1.2);
          for (let k = 0; k < h; k++) R(x + lean * (k / h), TS - 1 - k, 1.8, 1, stalk);
          if (st >= 1) {                                   // 잎
            R(x - 3.4, TS - h * .55, 3.4, 1.4, shade(stalk, 1.2));
            R(x + 1.8, TS - h * .78, 3.2, 1.4, shade(stalk, .8));
          }
          if (st === 2) R(x - .6, TS - h - 1, 3, 3, base);  // 아직 여물지 않은 꽃봉오리
          if (st < 3) continue;
          const tx = x + lean, ty = TS - h;
          if (kind === 'wheat') {                          // 이삭 — 알갱이를 지그재그로
            for (let k = 0; k < 5; k++) {
              const yy = ty + k * 2.4;
              R(tx - 2.6, yy, 2.6, 2, base); R(tx + 1.2, yy + 1.2, 2.6, 2, base);
              R(tx - 2.6, yy, 2.6, .8, lt2);
            }
            R(tx + .2, ty - 3, 1, 4, lt);                  // 까끄라기
          } else if (kind === 'root') {                    // 무성한 잎 + 흙 위로 드러난 뿌리목
            for (let k = -2; k <= 2; k++) {
              const len = 5 - Math.abs(k);
              for (let j = 0; j < len; j++) R(tx + k * 2.2 + j * k * .3, ty + 1 + j * 1.1, 2, 1.6, k % 2 ? base : lt);
            }
            R(tx - 1.6, TS - 5, 4, 5, lt2);                // 뿌리목
            R(tx - 1.6, TS - 5, 4, 1.4, '#e8ffe8');
          } else if (kind === 'bean') {                    // 줄기에 매달린 꼬투리 — 아래로 늘어진다
            for (let k = 0; k < 3; k++) {
              const yy = ty + 2 + k * 4.2, sw = k % 2 ? -3 : 2.2;
              R(tx + sw, yy, 2.4, 4, base);
              R(tx + sw, yy, 1, 4, lt);
              R(tx + sw + .4, yy + 1.2, 1.4, 1, dk2);       // 콩알이 비치는 자국
            }
          } else if (kind === 'bloom') {                   // 뼈처럼 흰 꽃 — 다섯 잎이 벌어져 있다
            for (let k = 0; k < 5; k++) {
              const a = -Math.PI / 2 + (k - 2) * 0.62;
              R(tx + Math.cos(a) * 3.4 - 1.2, ty + 2 + Math.sin(a) * 3.4, 2.6, 2.6, base);
              R(tx + Math.cos(a) * 4.4 - .8, ty + 2 + Math.sin(a) * 4.4, 1.6, 1.6, lt2);
            }
            R(tx - 1, ty + 1.2, 2.2, 2.2, '#c8b060');      // 꽃심
          } else if (kind === 'herb') {                    // 서리 낀 잎 — 끝마다 얼음 알갱이
            for (let k = -2; k <= 2; k++) {
              if (!k) continue;
              const len = 4 - Math.abs(k) * 0.6;
              for (let j = 0; j < len; j++)
                R(tx + k * 1.8 + j * k * .5, ty + 1.4 + j * 1.5 + Math.abs(k), 2, 1.6, j > len - 2 ? '#e8ffff' : base);
            }
            R(tx - .8, ty - 1, 2, 2, '#ffffff');
          } else if (kind === 'pod') {                     // 벌어진 꼬투리 속에서 불씨가 보인다
            R(tx - 3.4, ty + 1, 7, 6, shade(base, .62));
            R(tx - 2.6, ty + 1.8, 5.4, 4.4, base);
            R(tx - 1.4, ty + 2.8, 3, 2.4, '#ffe08a');
            R(tx - .6, ty + 3.4, 1.6, 1.2, '#fff6d8');
            R(tx - 3.4, ty + .2, 7, 1.2, lt2);             // 벌어진 자리
          } else {                                         // 버섯 갓
            g.fillStyle = base;
            g.beginPath(); g.ellipse(ox + tx + .9, oy + ty + 3, 5, 4, 0, Math.PI, 2 * Math.PI); g.fill();
            g.fillStyle = shade(base, .72);
            R(tx - 4, ty + 2.4, 10, 1.4);
            R(tx + .2, ty + 3, 1.8, h - 4, '#e8dcc0');
            R(tx - 2, ty + .6, 1.4, 1.4, '#fff2d8');
            R(tx + 2.4, ty + 1.4, 1.2, 1.2, '#fff2d8');
          }
        }
        break;
      }

      /* ---------- 4단계: 마을 기계 ---------- */
      case 'mk_windmill': {
        R(TS / 2 - 4, 9, 8, TS - 9, base);      // 탑
        R(TS / 2 - 4, 9, 2, TS - 9, lt2);
        R(TS / 2 + 2, 9, 2, TS - 9, dk);
        R(TS / 2 - 5, 8, 10, 2, shade(base, .7));
        g.save();                                // 날개 넷
        g.translate(ox + TS / 2, oy + 7);
        g.fillStyle = '#e8dcc0';
        for (let k = 0; k < 4; k++) {
          g.rotate(TAU / 4);
          g.fillRect(-1, -7, 2, 7);
          g.fillRect(-3.2, -7, 3.2, 4);
        }
        g.restore();
        g.fillStyle = '#5a4a3a';
        g.beginPath(); g.arc(ox + TS / 2, oy + 7, 2, 0, TAU); g.fill();
        break;
      }
      case 'mk_mill': {
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = '#7a7a82';                 // 맷돌
        g.beginPath(); g.arc(ox + TS / 2, oy + 11, 7, 0, TAU); g.fill();
        g.fillStyle = '#9a9aa4';
        g.beginPath(); g.arc(ox + TS / 2, oy + 10, 6, 0, TAU); g.fill();
        g.fillStyle = '#4a4a52';
        g.beginPath(); g.arc(ox + TS / 2, oy + 10, 2, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) {            // 홈
          const a = k * TAU / 6;
          R(TS / 2 + Math.cos(a) * 3.4 - .6, 10 + Math.sin(a) * 3.4 - .6, 1.2, 1.2, '#6a6a72');
        }
        R(4, TS - 5, TS - 8, 3, '#e8dcc0');      // 쏟아진 가루
        break;
      }
      case 'mk_oven': {
        R(1, TS - 5, TS - 2, 5, shade(base, .6));   // 받침
        g.fillStyle = base;                          // 돔
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 9.5, Math.PI, 2 * Math.PI); g.fill();
        g.fillStyle = lt;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 9.5, Math.PI, Math.PI * 1.45); g.fill();
        for (let k = 0; k < 4; k++) R(2 + k * 5, TS - 12 + Math.abs(k - 1.5) * 1.6, 4, 1.2, dk2);
        g.fillStyle = '#1e1a16';                     // 아궁이
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 5, Math.PI, 2 * Math.PI); g.fill();
        g.fillStyle = '#e8842a';
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 3.4, Math.PI, 2 * Math.PI); g.fill();
        R(TS / 2 - 1.6, TS - 8, 3.2, 3, '#ffcf6a');
        R(TS - 6, 0, 4, 6, shade(base, .7));         // 굴뚝
        break;
      }
      case 'darthole': {
        // 벽에 뚫린 구멍 셋. 쏘는 쪽에 그을음이 남아 있다
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 7), rng.range(2, 5), rng.chance(.5) ? lt : dk);
        const side = s.d > 0 ? TS - 7 : 2;
        for (let k = 0; k < 3; k++) {
          R(side, 4 + k * 6, 5, 3.4, '#14120e');
          R(side + (s.d > 0 ? 3.6 : 0), 4 + k * 6, 1.4, 3.4, '#2a2620');
        }
        R(s.d > 0 ? TS - 2 : 0, 0, 2, TS, dk2);
        this._speck(g, ox, oy, rng, 12, dk2, lt);
        break;
      }
      case 'flamevent': {
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 5; i++) R(rng.range(0, TS - 4), rng.range(3, TS - 3), rng.range(3, 6), rng.range(2, 4), rng.chance(.5) ? base : dk2);
        R(3, 0, TS - 6, 4, '#1a1410');                 // 분출구
        for (let k = 0; k < 3; k++) R(4 + k * 5, 0, 3, 3, '#e8842a');
        R(3, 3, TS - 6, 1.4, shade(base, 1.4));
        this._speck(g, ox, oy, rng, 10, '#2a1a10', '#c86a2a');
        break;
      }
      case 'crumble': {
        // 이미 금이 가 있어서 "밟으면 안 되겠다"가 보이게
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 7), rng.range(2, 4), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 4; i++) {                   // 갈라진 금
          let x = rng.range(2, TS - 2), y = rng.range(-1, 3);
          for (let k = 0; k < rng.int(7, 14); k++) { R(x, y, 1, 1, '#1e1a14'); x += rng.range(-1.3, 1.3); y += rng.range(.8, 1.7); }
        }
        R(0, 0, TS, 1.4, lt2);
        R(0, TS - 2, TS, 2, dk2);
        break;
      }
      case 'slag': {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {                   // 흘러내린 자국
          let x = rng.range(2, TS - 3);
          for (let y = 0; y < TS; y++) { R(x, y, rng.chance(.3) ? 2 : 1, 1, dk2); x += rng.range(-.5, .5); }
        }
        for (let i = 0; i < 3; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), 2, 2, '#c8763a');
        this._speck(g, ox, oy, rng, 14, dk2, '#8a6a4a');
        break;
      }
      case 'mk_dart': {
        // 벽에 박힌 발사구 — 구멍 셋이 정면을 본다
        this._mkBody(g, ox, oy, base, R);
        R(2, 5, 18, 12, shade(base, .5));
        for (let k = 0; k < 3; k++) { R(4, 7 + k * 4, 14, 2, '#14120e'); R(15, 7 + k * 4, 3, 2, '#3a3630'); }
        R(1, 3, 20, 2, shade(base, 1.35));
        R(1, TS - 5, 20, 2, shade(base, .45));
        break;
      }
      case 'mk_jet': {
        // 노즐 — 안쪽에서 빛이 새어 나온다
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = '#1a1610';
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 6.5, 0, TAU); g.fill();
        g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 4.2, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.6);
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 2.2, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) {                 // 조임쇠
          const a = k * TAU / 4 + .4;
          R(TS / 2 + Math.cos(a) * 8 - 1.5, TS / 2 + Math.sin(a) * 8 - 1.5, 3, 3, shade(base, .5));
        }
        break;
      }
      case 'mk_switch': {
        R(3, 4, TS - 6, TS - 8, shade('#3a3a44', 1));
        R(3, 4, TS - 6, 2, '#5a5a66');
        g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 5.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.5);
        g.beginPath(); g.arc(ox + TS / 2 - 1, oy + TS / 2 - 1, 2.4, 0, TAU); g.fill();
        break;
      }
    }
  },

  /** 기계 공통 뼈대 — 강철 상자에 볼트 네 개 */
  _mkBody(g, ox, oy, base, R) {
    const dk = shade(base, .62), lt = shade(base, 1.3);
    R(1, 2, TS - 2, TS - 3, base);
    R(1, 2, TS - 2, 2, lt);
    R(1, TS - 3, TS - 2, 2, dk);
    R(1, 2, 2, TS - 3, shade(base, 1.12));
    R(TS - 3, 2, 2, TS - 3, dk);
    for (const [bx, by] of [[3, 4], [TS - 6, 4], [3, TS - 7], [TS - 6, TS - 7]]) R(bx, by, 2, 2, shade(base, .45));
  },

  paintWall(g, ox, oy, col, rng) {
    const base = shade(col, .66), dk = shade(col, .44), lt = shade(col, .86);
    this._fill(g, ox, oy, base);
    for (let i = 0; i < 9; i++)
      this._r(g, ox, oy, rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? dk : lt);
    this._speck(g, ox, oy, rng, 24, dk, lt);
    // 타일 경계에 약한 음영 — 벽면의 깊이감
    g.globalAlpha = .16;
    this._r(g, ox, oy, 0, 0, TS, 2, '#000');
    this._r(g, ox, oy, 0, 0, 2, TS, '#000');
    g.globalAlpha = 1;
  }
};
