/* ===== game/minimap.js — 지도 · 탐지기 ===== */
import { shade } from '../../engine/core/color.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { dimsOf } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const MinimapPart: Bag = {

  /* ---- 지도 색 (미니맵 · 전체 지도 공용) ---- */
  mapColorAt(tx, ty, id, wl) { const { WW } = dimsOf(this.world);
    const w = this.world, k = ty * WW + tx;
    if (id === undefined) { id = w.tiles[k]; wl = w.walls[k]; }
    if (id === T.AIR) return wl ? '#20202c' : '#141620';
    const d = TILE_DEF[id];
    return d.ore ? d.c : shade(d.c || '#333', 0.65);
  },
  /** 눈(ex, ey)에서 칸(tx, ty)이 보이는가 — 가는 길이 트여 있어야 하고, 과녁 앞 세 칸 안의 바위만 봐준다(벽 두께가 지도에 남게). */
  seesTile(ex, ey, tx, ty) {
    const w = this.world, dx = tx - ex, dy = ty - ey, n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i < n - 3; i++) {
      const x = Math.round(ex + dx * i / n), y = Math.round(ey + dy * i / n);
      if (TILE_DEF[w.get(x, y)].solid === 1) return false;
    }
    return true;
  },
  /** 세이브를 막 불러왔을 때(또는 새 게임 시작 시) explored 비트로부터 축소 지도를 다시 칠한다. */
  /** 축소 지도 캔버스를 지금 세계 크기(WW×WH)에 맞춘다 — 세계 크기가 바뀌면 다시 만든다. */
  fitMapAtlas() { const { WW, WH } = dimsOf(this.world);
    if (this.mapAtlas.width === WW && this.mapAtlas.height === WH) return;
    this.mapAtlas.width = WW; this.mapAtlas.height = WH;
    this.mapAtlasX = this.mapAtlas.getContext('2d');
  },
  buildMapAtlas() { const { WW, WH } = dimsOf(this.world);
    const c = this.mapAtlasX, w = this.world;
    c.fillStyle = '#07080c'; c.fillRect(0, 0, WW, WH);
    const img = c.getImageData(0, 0, WW, WH), buf = img.data;
    for (let k = 0; k < WW * WH; k++) {
      if (!w.explored[k]) continue;
      const hex = this.mapColorAt(k % WW, (k / WW) | 0);
      const n = parseInt(hex.slice(1), 16), o = k * 4;
      buf[o] = (n >> 16) & 255; buf[o + 1] = (n >> 8) & 255; buf[o + 2] = n & 255; buf[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  },

  /* ---- 미니맵 ---- */
  /* 탐지기 소리 — 잡힌 것이 **없다가 생겼을 때만** 한 번 운다. */
  _detPrev: 0,
  detBeep(n) {
    if (n > 0 && this._detPrev === 0) this.sfx('detector');
    this._detPrev = n;
  },
  /** 유틸리티 칸에 낀 탐지기 종류 — 'ore' | 'mob'. 없으면 false */
  hasDetector(kind) {
    const eq = this.player && this.player.equip;
    if (!eq) return false;
    return (eq.util1 && idef(eq.util1).det === kind) || (eq.util2 && idef(eq.util2).det === kind);
  },
  DET_R: 30,                                   // 탐지 반경(칸)
  drawMinimap() { const { WW, WH } = dimsOf(this.world);
    const c = this.mmx, w = this.world, p = this.player;
    const MW = this.mm.width, MH = this.mm.height, S = 2;
    /* 탐지기 — **안개를 뚫고** 보여 준다. */
    const detOre = this.hasDetector('ore'), detMob = this.hasDetector('mob');
    const DR = this.DET_R, DR2 = DR * DR;
    let detHit = 0;                                  // 이번 갱신에 잡힌 것 수 (소리용)
    c.fillStyle = '#07080c'; c.fillRect(0, 0, MW, MH);
    const px = Math.floor(p.cx / TS), py = Math.floor(p.cy / TS);
    const halfW = Math.floor(MW / S / 2), halfH = Math.floor(MH / S / 2);
    for (let y = 0; y < MH / S; y++) {
      for (let x = 0; x < MW / S; x++) {
        const tx = px - halfW + x, ty = py - halfH + y;
        if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) continue;
        const k = ty * WW + tx;
        const id = w.tiles[k];
        if (!w.explored[k]) {
          // 안개 — 눈으로 본 적 없는 칸은 그리지 않는다.
          if (!detOre || !TILE_DEF[id] || !TILE_DEF[id].ore) continue;
          const ddx = tx - px, ddy = ty - py;
          if (ddx * ddx + ddy * ddy > DR2) continue;
          c.fillStyle = TILE_DEF[id].c;
          c.fillRect(x * S, y * S, S, S);
          detHit++;
          continue;
        }
        if (id === T.AIR) {
          const wl = w.walls[k];
          if (wl) { c.fillStyle = '#181820'; c.fillRect(x * S, y * S, S, S); }
          continue;
        }
        const d = TILE_DEF[id];
        c.fillStyle = d.ore ? d.c : shade(d.c || '#333', 0.65);
        c.fillRect(x * S, y * S, S, S);
      }
    }
    // NPC·상자 — 빛을 받아 공개된 칸에 있을 때만 위치를 보여 준다.
    for (const o of w.objects) {
      if (o.type !== 'npc' && o.type !== 'chest') continue;
      const otx = Math.floor(o.x / TS), oty = Math.floor(o.y / TS);
      if (!w.explored[clamp(oty, 0, WH - 1) * WW + clamp(otx, 0, WW - 1)]) continue;
      const ox = otx - (px - halfW), oy = oty - (py - halfH);
      if (ox < 0 || oy < 0 || ox * S >= MW || oy * S >= MH) continue;
      c.fillStyle = o.type === 'npc' ? '#6fd8ff' : '#d8a94b';
      c.fillRect(ox * S - 1, oy * S - 1, S + 2, S + 2);
    }
    // 적도 미지의 어둠 속에서는 보이지 않는다.
    for (const e of this.ents) {
      if (!(e instanceof Enemy)) continue;
      const etx = clamp(Math.floor(e.cx / TS), 0, WW - 1), ety = clamp(Math.floor(e.cy / TS), 0, WH - 1);
      // 몬스터 탐지기가 있으면 반경 안은 안개 속이라도 잡아낸다
      const near = detMob && (etx - px) * (etx - px) + (ety - py) * (ety - py) <= DR2;
      if (near) detHit++;
      if (!near && !w.explored[ety * WW + etx]) continue;
      const ox = etx - (px - halfW), oy = ety - (py - halfH);
      if (ox < 0 || oy < 0 || ox * S >= MW || oy * S >= MH) continue;
      c.fillStyle = e.boss ? '#ff4a4a' : '#e07070';
      c.fillRect(ox * S - 1, oy * S - 1, S + 2, S + 2);
    }
    this.detBeep(detHit);
    // 쓰러진 자리 — 안개와 무관하게 늘 보인다(내가 죽은 자리는 내가 안다)
    if (this.deathMark) {
      const dx = Math.floor(this.deathMark.x / TS) - (px - halfW);
      const dy = Math.floor(this.deathMark.y / TS) - (py - halfH);
      if (dx >= 0 && dy >= 0 && dx * S < MW && dy * S < MH) {
        c.fillStyle = '#cfd8ff';
        c.fillRect(dx * S - 1, dy * S - 3, 3, 7);
        c.fillRect(dx * S - 3, dy * S - 1, 7, 3);
      }
    }
    // 플레이어
    c.fillStyle = '#fff';
    c.fillRect(halfW * S - 1, halfH * S - 1, 3, 3);
    c.strokeStyle = '#3b3527'; c.strokeRect(.5, .5, MW - 1, MH - 1);
  },
};

mixin(G, MinimapPart);
