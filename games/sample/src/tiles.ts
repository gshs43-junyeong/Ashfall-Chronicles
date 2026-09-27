/* ===== games/sample/src/tiles.ts — 예제 게임의 타일 표 · 세계 만들기 · 아틀라스 ===== */
/* 엔진(src/engine)만 쓴다 — 게임(src/game)은 import 하지 않는다. 타일 번호의 뜻은 이 표가 정하고, 엔진은 solid 만 읽는다. */
import { RNG, tileHash } from '../../../src/engine/core/rng.js';
import { makeNoise1D, makeNoise2D } from '../../../src/engine/core/noise.js';
import { shade } from '../../../src/engine/core/color.js';
import { TileMap } from '../../../src/engine/tilemap/tilemap.js';
import type { TileDef } from '../../../src/engine/tilemap/tilemap.js';
import { bakeAtlas } from '../../../src/engine/render/atlas.js';

export const TS = 16;
export const WW = 240, WH = 90;

/** ★ 번호는 세이브에 그대로 담긴다 — 새 타일은 끝에만 붙인다. */
export const T = { AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, PLANK: 4, BEDROCK: 5, TORCH: 6 } as const;

export interface SampleTile extends TileDef {
  name: string;          // 원문(한국어) — 화면에 띄울 때 tr() 로 옮긴다
  col: string;
  hard: number;          // 캐는 데 걸리는 초 — 0 이면 못 캔다
  light?: number;        // 스스로 내는 빛(0~15)
}

export const DEFS: SampleTile[] = [
  { name: '공기', col: '#000000', hard: 0 },
  { name: '흙', col: '#8a5a36', hard: 0.25, solid: 1 },
  { name: '풀', col: '#5f9a3a', hard: 0.25, solid: 1 },
  { name: '돌', col: '#77787f', hard: 0.6, solid: 1 },
  { name: '나무 발판', col: '#b58a52', hard: 0.2, solid: 2 },
  { name: '기반암', col: '#2d2a33', hard: 0, solid: 1 },
  { name: '횃불', col: '#ffcf6a', hard: 0.05, light: 14 }
];

/** 놓을 수 있는 블록(숫자키 1~4) */
export const PLACEABLE = [T.DIRT, T.STONE, T.PLANK, T.TORCH];

/** 씨앗으로 세계를 만든다 — 같은 씨앗이면 같은 세계(RNG 는 결정론). */
export function generate(seed: string): TileMap {
  const map = new TileMap(WW, WH, TS, DEFS, T.BEDROCK);
  const rng = new RNG(seed);
  const hill = makeNoise1D(rng), cave = makeNoise2D(rng);
  const surf: number[] = [];
  for (let x = 0; x < WW; x++) {
    const s = Math.floor(34 + hill(x, 0.03) * 16 - 8);
    surf.push(s);
    for (let y = s; y < WH; y++) {
      const deep = y - s;
      let t: number = deep === 0 ? T.GRASS : deep < 5 ? T.DIRT : T.STONE;
      if (deep > 6 && cave(x, y, 0.07) > 0.62) t = T.AIR;           // 굴
      if (y >= WH - 2) t = T.BEDROCK;
      map.set(x, y, t);
    }
  }
  for (let i = 0; i < 14; i++) {                                     // 떠 있는 발판
    const x = rng.int(4, WW - 12), y = surf[x] - rng.int(5, 9), n = rng.int(4, 8);
    for (let k = 0; k < n; k++) if (map.get(x + k, y) === T.AIR) map.set(x + k, y, T.PLANK);
  }
  for (let i = 0; i < 60; i++) {                                     // 굴 바닥 횃불
    const x = rng.int(1, WW - 2), y = rng.int(surf[x] + 8, WH - 4);
    if (map.get(x, y) === T.AIR && map.solid(x, y + 1)) map.set(x, y, T.TORCH);
  }
  return map;
}

/** 타일마다 네 가지 변형(열)을 굽는다 — 행 = 타일 번호. */
export function makeAtlas(): HTMLCanvasElement {
  return bakeAtlas(TS, 4, DEFS.length, (g, ox, oy, row, col) => {
    const d = DEFS[row];
    if (row === T.AIR) return;
    if (row === T.TORCH) {
      g.fillStyle = '#6b4a2a'; g.fillRect(ox + 7, oy + 6, 2, 10);
      g.fillStyle = d.col; g.fillRect(ox + 6, oy + 3, 4, 4);
      g.fillStyle = '#fff4c8'; g.fillRect(ox + 7, oy + 4, 2, 2);
      return;
    }
    if (row === T.PLANK) {
      g.fillStyle = d.col; g.fillRect(ox, oy, TS, 5);
      g.fillStyle = shade(d.col, -30); g.fillRect(ox, oy + 5, TS, 1); g.fillRect(ox + 3 + col, oy + 1, 1, 3);
      return;
    }
    const base = row === T.GRASS ? DEFS[T.DIRT].col : d.col;          // 풀 = 흙 위에 풀 띠
    g.fillStyle = base; g.fillRect(ox, oy, TS, TS);
    for (let y = 0; y < TS; y += 2) for (let x = 0; x < TS; x += 2) {     // 칸 좌표 해시로 얼룩 — 변형마다 다르게
      const h = tileHash(x + col * 31, y + row * 17);
      if (h < 0.09) { g.fillStyle = shade(base, -14); g.fillRect(ox + x, oy + y, 2, 2); }
      else if (h > 0.95) { g.fillStyle = shade(base, 12); g.fillRect(ox + x, oy + y, 2, 2); }
    }
    if (row === T.GRASS) {
      g.fillStyle = d.col; g.fillRect(ox, oy, TS, 4);
      g.fillStyle = '#7cc04a'; g.fillRect(ox, oy, TS, 2);
      g.fillStyle = d.col; for (let x = col; x < TS; x += 3) g.fillRect(ox + x, oy + 4, 1, 1 + ((x + col) & 1));
    }
  });
}
