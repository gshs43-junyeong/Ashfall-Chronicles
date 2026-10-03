/* ===== game/minimap.js — 지도 · 탐지기 ===== */
import { shade } from '../../engine/core/color.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { drawMapMark, drawTileWindow } from '../../engine/render/minimap.js';
import { lineOfSight } from '../../engine/tilemap/ray.js';
import { dimsOf } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const MinimapPart: Bag = {

  /* ---- 지도 색 (미니맵 · 전체 지도 공용) ---- */
  mapColorAt(tx: any, ty: any, id: any, wl: any) { const { WW } = dimsOf(this.world);
    const w = this.world, k = ty * WW + tx;
    if (id === undefined) { id = w.tiles[k]; wl = w.walls[k]; }
    if (id === T.AIR) return wl ? '#20202c' : '#141620';
    const d = TILE_DEF[id];
    return d.ore ? d.c : shade(d.c || '#333', 0.65);
  },
  /** 눈(ex, ey)에서 칸(tx, ty)이 보이는가 — 가는 길이 트여 있어야 하고, 과녁 앞 세 칸 안의 바위만 봐준다(벽 두께가 지도에 남게). */
  seesTile(ex: number, ey: number, tx: number, ty: number) {
    const w = this.world;
    return lineOfSight((x, y) => Math.max(Math.abs(x - tx), Math.abs(y - ty)) > 3 && TILE_DEF[w.get(x, y)].solid === 1,
      ex + 0.5, ey + 0.5, tx + 0.5, ty + 0.5);   // engine tilemap/ray — 칸 격자를 빠짐없이 걷는다
  },
  /** 세이브를 막 불러왔을 때(또는 새 게임 시작 시) explored 비트로부터 축소 지도를 다시 칠한다. */
  /** 축소 지도 캔버스를 지금 세계 크기(WW×WH)에 맞춘다 — 세계 크기가 바뀌면 다시 만든다. */
  fitMapAtlas() { const { WW, WH } = dimsOf(this.world); this.mapAtlas.fit(WW, WH); },
  buildMapAtlas() { const w = this.world; this.mapAtlas.rebuild((k: number) => !!w.explored[k], (x: number, y: number) => this.mapColorAt(x, y)); },

  /* ---- 미니맵 ---- */
  /* 탐지기 소리 — 잡힌 것이 **없다가 생겼을 때만** 한 번 운다. */
  _detPrev: 0,
  detBeep(n: number) {
    if (n > 0 && this._detPrev === 0) this.sfx('detector');
    this._detPrev = n;
  },
  /** 유틸리티 칸에 낀 탐지기 종류 — 'ore' | 'mob'. 없으면 false */
  hasDetector(kind: string) {
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
    /* 칸마다 색(engine render/minimap) — 눈으로 본 적 없는 칸은 안개(그리지 않음), 탐지기는 반경 안 광맥만 안개를 뚫는다 */
    const org = drawTileWindow(c, MW, MH, S, px, py, (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) return null;
      const k = ty * WW + tx, id = w.tiles[k];
      if (!w.explored[k]) {
        if (!detOre || !TILE_DEF[id] || !TILE_DEF[id].ore) return null;
        const ddx = tx - px, ddy = ty - py;
        if (ddx * ddx + ddy * ddy > DR2) return null;
        detHit++;
        return TILE_DEF[id].c;
      }
      if (id === T.AIR) return w.walls[k] ? '#181820' : null;
      const d = TILE_DEF[id];
      return d.ore ? d.c : shade(d.c || '#333', 0.65);
    });
    // NPC·상자 — 빛을 받아 공개된 칸에 있을 때만 위치를 보여 준다.
    for (const o of w.objects) {
      if (o.type !== 'npc' && o.type !== 'chest') continue;
      const otx = Math.floor(o.x / TS), oty = Math.floor(o.y / TS);
      if (!w.explored[clamp(oty, 0, WH - 1) * WW + clamp(otx, 0, WW - 1)]) continue;
      drawMapMark(c, org, S, MW, MH, otx, oty, o.type === 'npc' ? '#6fd8ff' : '#d8a94b');
    }
    // 적도 미지의 어둠 속에서는 보이지 않는다.
    for (const e of this.ents) {
      if (!(e instanceof Enemy)) continue;
      const etx = clamp(Math.floor(e.cx / TS), 0, WW - 1), ety = clamp(Math.floor(e.cy / TS), 0, WH - 1);
      // 몬스터 탐지기가 있으면 반경 안은 안개 속이라도 잡아낸다
      const near = detMob && (etx - px) * (etx - px) + (ety - py) * (ety - py) <= DR2;
      if (near) detHit++;
      if (!near && !w.explored[ety * WW + etx]) continue;
      drawMapMark(c, org, S, MW, MH, etx, ety, e.boss ? '#ff4a4a' : '#e07070');
    }
    this.detBeep(detHit);
    // 쓰러진 자리 — 안개와 무관하게 늘 보인다(내가 죽은 자리는 내가 안다)
    if (this.deathMark) drawMapMark(c, org, S, MW, MH, Math.floor(this.deathMark.x / TS), Math.floor(this.deathMark.y / TS), '#cfd8ff', '+');
    // 플레이어
    c.fillStyle = '#fff';
    c.fillRect(halfW * S - 1, halfH * S - 1, 3, 3);
    c.strokeStyle = '#3b3527'; c.strokeRect(.5, .5, MW - 1, MH - 1);
  },
};

mixin(Game.prototype, MinimapPart, true);
