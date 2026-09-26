/* ===== engine/tilemap/tilemap.ts — 타일맵: 타일·벽지·탐험 배열 · 칸 접근 · 칸 충돌 ===== */
/* ★ 타일 번호는 세이브에 그대로 담긴다 — 번호의 뜻(표)은 게임이 준다(defs[id]). 경계 밖은 edge 번호(보통 부술 수 없는 벽)로 읽힌다.
   ★ 이 클래스의 get · inB · solid 는 세계 생성에서 수백만 번 불린다 — 분기·호출을 더하지 말 것(생성 시간이 바로 는다). */

/** 게임 타일 표 한 칸에서 엔진이 읽는 것 — solid: 1 막힘 · 2 발판(위에서만) */
export interface TileDef { solid?: number; liquid?: unknown }

export class TileMap {
  declare w: number; declare h: number;       // 칸 수
  declare ts: number;                         // 한 칸의 픽셀
  declare defs: ReadonlyArray<TileDef>;
  declare edge: number;                       // 경계 밖을 읽으면 돌려줄 타일
  declare tiles: Uint8Array;
  declare walls: Uint8Array;
  declare explored: Uint8Array;               // 한 번이라도 보인 칸 — 지도의 안개

  constructor(w: number, h: number, ts: number, defs: ReadonlyArray<TileDef>, edge: number) {
    this.w = w; this.h = h; this.ts = ts; this.defs = defs; this.edge = edge;
    this.tiles = new Uint8Array(w * h);
    this.walls = new Uint8Array(w * h);
    this.explored = new Uint8Array(w * h);
  }

  i(x: number, y: number): number { return y * this.w + x; }
  inB(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  /* ★ inB 를 부르지 말고 경계를 여기서 따진다 — inB 를 거치면 세계 생성(소형 d1)이 3.7 → 4.3초로 느려졌다(이렇게 하면 3.45초). */
  get(x: number, y: number): number { const w = this.w; return x >= 0 && y >= 0 && x < w && y < this.h ? this.tiles[y * w + x] : this.edge; }
  wall(x: number, y: number): number { return this.inB(x, y) ? this.walls[y * this.w + x] : 0; }
  /** ★ 타일은 이것으로만 바꾼다 — 게임이 덮어써서 바뀐 칸을 알아챈다(조명·유체·지도). */
  set(x: number, y: number, t: number): void { if (this.inB(x, y)) this.tiles[y * this.w + x] = t; }
  setWall(x: number, y: number, w: number): void { if (this.inB(x, y)) this.walls[y * this.w + x] = w; }
  solid(x: number, y: number): boolean { const d = this.defs[this.get(x, y)]; return d.solid === 1; }
  platform(x: number, y: number): boolean { return this.defs[this.get(x, y)].solid === 2; }
  liquid(x: number, y: number): boolean { return !!this.defs[this.get(x, y)].liquid; }

  /** 사각형(픽셀)이 막힌 칸과 겹치는지 */
  hitSolid(px: number, py: number, w: number, h: number): boolean {
    const TS = this.ts;
    const x0 = Math.floor(px / TS), x1 = Math.floor((px + w - 0.01) / TS);
    const y0 = Math.floor(py / TS), y1 = Math.floor((py + h - 0.01) / TS);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (this.solid(x, y)) return true;
    return false;
  }
  /** 발판(위에서만 막힘) 검사: 이전 아랫변이 발판 위에 있었어야 한다 — 걸리면 발판 윗변 y, 아니면 −1 */
  hitPlatform(px: number, py: number, w: number, h: number, prevBottom: number): number {
    const TS = this.ts;
    const x0 = Math.floor(px / TS), x1 = Math.floor((px + w - 0.01) / TS);
    const y0 = Math.floor(py / TS), y1 = Math.floor((py + h - 0.01) / TS);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (!this.platform(x, y)) continue;
      const top = y * TS;
      if (prevBottom <= top + 2 && py + h > top) return top;
    }
    return -1;
  }
}
