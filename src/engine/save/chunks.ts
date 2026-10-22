/* ===== engine/save/chunks.ts — 바탕 + 바뀐 청크 저장(타일 배열 델타) ===== */
/* 큰 칸 배열(타일 · 벽지)을 cs×cs 청크로 나눠, 바탕과 해시가 다른 청크만 RLE 로 담는다.
   바탕은 한 번만 따로 저장하고(저장소 putSide), 슬롯 본문에는 바뀐 청크만 실린다. */
import { rleEncode, rleDecode } from './rle.js';

export interface ChunkGrid { w: number; h: number; cs: number; cx: number; cy: number; n: number }

export function chunkGrid(w: number, h: number, cs = 64): ChunkGrid {
  const cx = Math.ceil(w / cs), cy = Math.ceil(h / cs);
  return { w, h, cs, cx, cy, n: cx * cy };
}

/** 청크 c 의 칸을 차례로 돈다(가로줄 순서 — 저장과 풀기가 같은 순서를 본다). */
function each(g: ChunkGrid, c: number, fn: (i: number) => void) {
  const x0 = (c % g.cx) * g.cs, y0 = Math.floor(c / g.cx) * g.cs;
  const x1 = Math.min(g.w, x0 + g.cs), y1 = Math.min(g.h, y0 + g.cs);
  for (let y = y0; y < y1; y++) for (let i = y * g.w + x0, e = y * g.w + x1; i < e; i++) fn(i);
}
function size(g: ChunkGrid, c: number) {
  const x0 = (c % g.cx) * g.cs, y0 = Math.floor(c / g.cx) * g.cs;
  return (Math.min(g.w, x0 + g.cs) - x0) * (Math.min(g.h, y0 + g.cs) - y0);
}

/** 청크마다 FNV-1a 해시 — 바탕과 견줄 때 쓴다(바탕 배열 자체는 메모리에 들고 있지 않는다). */
export function chunkHashes(arr: ArrayLike<number>, g: ChunkGrid): Uint32Array {
  const out = new Uint32Array(g.n);
  /* 바이트 배열이고 줄 폭이 4의 배수면 4칸씩 묶어 센다 — 저장마다 두 판(타일 · 벽지)을 다 훑어서 한 칸씩은 느렸다 */
  if (arr instanceof Uint8Array && arr.byteOffset % 4 === 0 && g.w % 4 === 0 && g.cs % 4 === 0) {
    const u = new Uint32Array(arr.buffer, arr.byteOffset, arr.length >> 2), W4 = g.w >> 2;
    for (let c = 0; c < g.n; c++) {
      const x0 = (c % g.cx) * g.cs, y0 = Math.floor(c / g.cx) * g.cs;
      const x1 = Math.min(g.w, x0 + g.cs), y1 = Math.min(g.h, y0 + g.cs), a = x0 >> 2, e = (x1 + 3) >> 2;
      let h = 0x811c9dc5;
      for (let y = y0; y < y1; y++) for (let i = y * W4 + a, j = y * W4 + e; i < j; i++) { h ^= u[i]; h = Math.imul(h, 16777619); h ^= h >>> 15; }
      out[c] = h >>> 0;
    }
    return out;
  }
  for (let c = 0; c < g.n; c++) {
    let h = 0x811c9dc5;
    each(g, c, i => { h ^= arr[i]; h = Math.imul(h, 16777619); });
    out[c] = h >>> 0;
  }
  return out;
}

/** 바탕 해시와 다른 청크만 { 청크 번호: RLE }. */
export function diffChunks(arr: ArrayLike<number>, g: ChunkGrid, base: Uint32Array): Record<number, string> {
  const now = chunkHashes(arr, g), out: Record<number, string> = {};
  for (let c = 0; c < g.n; c++) {
    if (now[c] === base[c]) continue;
    const buf = new Array<number>(size(g, c)); let k = 0;
    each(g, c, i => { buf[k++] = arr[i]; });
    out[c] = rleEncode(buf);
  }
  return out;
}

/** diffChunks 결과를 배열에 덮는다. */
export function applyChunks(arr: { [i: number]: number }, g: ChunkGrid, chunks: Record<string, string>) {
  for (const key in chunks) {
    const c = +key;
    if (!(c >= 0 && c < g.n)) continue;
    const vals = rleDecode(chunks[key], size(g, c), Array as unknown as new (n: number) => number[]);
    let k = 0;
    each(g, c, i => { arr[i] = vals[k++]; });
  }
}
