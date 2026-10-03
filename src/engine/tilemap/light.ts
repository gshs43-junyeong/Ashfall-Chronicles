/* ===== engine/tilemap/light.ts — 빛 퍼뜨리기(네 방향 스윕) · 점 광원의 그림자 ===== */
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

/** 칸마다 미리 잰 표로 퍼뜨린다(콜백판보다 빠르다). dec[k] = 그 칸에 들어올 때 줄어드는 양.
    op 를 주면 막힌 칸(op[k] = 1)은 빛을 받되 **트인 칸으로는 넘기지 않는다** — 막힌 칸끼리는 번진다(벽 겉면이 조금 깊이 밝다),
    벽 너머 빈 공간으로는 새지 않는다. */
export function sweepLightGrid(L: Float32Array, w: number, h: number, passes: number, dec: Float32Array, op?: Uint8Array): void {
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, d = dec[k], open = !op || !op[k];
      let v = L[k];
      if (x > 0 && (!open || !op![k - 1])) v = Math.max(v, L[k - 1] - d);
      if (y > 0 && (!open || !op![k - w])) v = Math.max(v, L[k - w] - d);
      L[k] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const k = y * w + x, d = dec[k], open = !op || !op[k];
      let v = L[k];
      if (x < w - 1 && (!open || !op![k + 1])) v = Math.max(v, L[k + 1] - d);
      if (y < h - 1 && (!open || !op![k + w])) v = Math.max(v, L[k + w] - d);
      L[k] = v;
    }
  }
}

/* 칸 하나를 몇 점에서 보는가 — 가운데 + 안쪽 네 모서리. 일부만 보이는 칸은 그만큼 어둡다(그림자 가장자리가 부드럽다). */
const SAMPLES: [number, number][] = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]];

/** 점 광원 하나가 둘레 칸에 주는 빛 — 광원 칸 가운데에서 칸마다 광선을 쏘아, 사이에 막힌 칸이 있으면 그늘이다.
    광원 칸과 과녁 칸 자신은 가리지 않는다(막힌 칸은 겉면이 밝고, 그 **뒤** 칸은 어둡다).
    세기는 strength − 거리 × falloff(거리는 칸 가운데끼리 유클리드). 돌려주는 판은 (2r+1)² 칸, 광원이 한가운데.
    blocked(dx, dy) — 광원 칸에서 (dx, dy) 떨어진 칸이 빛을 막는가. */
export function castPointLight(strength: number, falloff: number, blocked: (dx: number, dy: number) => boolean): { r: number; v: Float32Array } {
  const r = Math.max(1, Math.ceil(strength / falloff)), n = 2 * r + 1, v = new Float32Array(n * n);
  /* 막힌 칸을 한 번만 묻는다 — 광선마다 다시 물으면 같은 칸을 수십 번 본다 */
  const opq = new Uint8Array(n * n);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) opq[(dy + r) * n + dx + r] = blocked(dx, dy) ? 1 : 0;
  const hits = (tx: number, ty: number, px: number, py: number): boolean => {
    /* 칸 격자 걷기(Amanatides–Woo) — 출발점 (0.5, 0.5), 도착점 (px, py) 은 과녁 칸 (tx, ty) 안 */
    const ox = 0.5, oy = 0.5, ddx = px - ox, ddy = py - oy;
    let cx = 0, cy = 0;
    const sx = ddx > 0 ? 1 : ddx < 0 ? -1 : 0, sy = ddy > 0 ? 1 : ddy < 0 ? -1 : 0;
    const tdx = sx ? Math.abs(1 / ddx) : Infinity, tdy = sy ? Math.abs(1 / ddy) : Infinity;
    let tmx = sx > 0 ? (1 - ox) * tdx : sx < 0 ? ox * tdx : Infinity;
    let tmy = sy > 0 ? (1 - oy) * tdy : sy < 0 ? oy * tdy : Infinity;
    for (let guard = 0; guard < 4 * n; guard++) {
      if (tmx < tmy) { tmx += tdx; cx += sx; } else { tmy += tdy; cy += sy; }
      if (cx === tx && cy === ty) return false;
      if (opq[(cy + r) * n + cx + r]) return true;
    }
    return false;
  };
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const base = strength - Math.hypot(dx, dy) * falloff;
    if (base <= 0) continue;
    let seen = 0;
    if (dx === 0 && dy === 0) seen = SAMPLES.length;
    else for (const [sx, sy] of SAMPLES) if (!hits(dx, dy, dx + sx, dy + sy)) seen++;
    if (seen) v[(dy + r) * n + dx + r] = base * seen / SAMPLES.length;
  }
  return { r, v };
}
