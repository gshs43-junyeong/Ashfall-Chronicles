/* ===== engine/tilemap/light.ts — 빛 퍼뜨리기(네 방향 스윕) ===== */
/* 씨앗(광원·햇빛)을 L 에 먼저 넣어 두면, 이웃으로 번지며 칸마다 dec(세계 x, y) 만큼 줄어든다.
   왼쪽·위에서 한 번, 오른쪽·아래에서 한 번 — 그것을 passes 번. 무엇이 빛을 얼마나 먹는지는 게임이 dec 로 정한다. */

/** L: w×h 칸(행 우선), (x0, y0) 는 L[0] 이 가리키는 세계 칸. */
export function sweepLight(L: Float32Array, w: number, h: number, x0: number, y0: number, passes: number,
  dec: (x: number, y: number) => number): void {
  for (let pass = 0; pass < passes; pass++) {
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
}
