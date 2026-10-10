/* ===== world/strata.js — 깊이층(지하 · 심층암 · 작열) · 긴 굴 · 엇갈린 굴 · 대공동 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { T, TILE_DEF } from '../data.js';
import { DEPTH_WALL, TS, World, inSeaZone, naturalWalls } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldStrata: Bag & ThisType<World> = {

  /** 층 경계 — 열마다 출렁이는 두 줄(심층암 윗면 · 작열층 윗면). 씨앗에서 뽑으므로 저장하지 않는다. */
  strataLines(tx: number) { const { SY, DEEP_Y } = this.dims;
    const p = this._strataPh || (this._strataPh = (() => { const r = new RNG(this.seed + '_strata'); return [0, 0, 0, 0].map(() => r.range(0, 6.28)); })());
    const a = Math.round(5 * Math.sin(tx * 0.011 + p[0]) + 3 * Math.sin(tx * 0.031 + p[1]));
    const b = Math.round(4 * Math.sin(tx * 0.013 + p[2]) + 3 * Math.sin(tx * 0.027 + p[3]));
    return [SY(172) + a, DEEP_Y + 2 + b];
  },
  /** 이 칸의 깊이층 — 'sky' · 'surface' · 'under' · 'slate' · 'ember' · 'hell' (DEPTH_LAYER 의 열쇠) */
  depthLayer(tx: number, ty: number) { const { WW, SKY_Y, HELL_Y } = this.dims;
    if (ty < SKY_Y) return 'sky';
    const x = clamp(tx, 0, WW - 1);
    if (ty <= this.surface[x] + 6) return 'surface';
    if (ty >= HELL_Y) return 'hell';
    const [s, e] = this.strataLines(x);
    return ty >= e ? 'ember' : ty >= s ? 'slate' : 'under';
  },

  /** 지층 갈아 끼우기 — 남은 돌(STONE)만 그 층의 돌로, 자연 벽지만 그 층의 벽지로. 광맥 · 지층 돌 · 장식 · 구조물은 그대로.
      ★ 생성 맨 끝(광상 앞)에 둔다 — 광맥 · 동굴 장식 · 물이 '돌'을 보고 자리를 고르므로, 먼저 바꾸면 그 단계들이 다 달라진다. */
  applyStrata() { const { WW, HELL_Y } = this.dims;
    const nat = naturalWalls(), r = new RNG(this.seed + '_vein');
    const mix = (x: number, y: number, line: number) => {   // 경계 위아래 세 칸은 점점이 섞는다
      const d = y - line; if (d >= 3) return true; if (d < -3) return false;
      return (((x * 73856093) ^ (y * 19349663)) >>> 0) % 7 < d + 4;
    };
    for (let x = 0; x < WW; x++) {
      const [s, e] = this.strataLines(x);
      for (let y = s - 3; y < HELL_Y; y++) {
        const k = y * WW + x;
        if (this.ruinAt(x, y)) continue;
        const deep = mix(x, y, e), slate = deep || mix(x, y, s);
        if (!slate) continue;
        if (this.tiles[k] === T.STONE) this.set(x, y, deep ? T.BASALT : T.DEEPSLATE);
        if (nat.has(this.walls[k]) && this.walls[k] !== 7 && this.walls[k] !== 3 && this.walls[k] !== 5) this.walls[k] = DEPTH_WALL[deep ? 1 : 0];
      }
    }
    /* 작열층의 마그마 맥 — 현무암 속을 가늘게 기어가는 붉은 금. 굴 벽에 드러난 것이 층을 알려 준다 */
    const n = Math.round(WW / 2800 * 260 * this.dims.WSY);
    for (let i = 0; i < n; i++) {
      let x = r.int(4, WW - 5);
      const [, e] = this.strataLines(x);
      let y = r.int(e + 2, HELL_Y - 6), dx = r.chance(0.5) ? 1 : -1;
      for (let s = r.int(6, 16); s > 0; s--) {
        if (this.get(x, y) === T.BASALT) this.set(x, y, T.MAGMAVEIN);
        if (r.chance(0.6)) x += dx; else y += r.chance(0.5) ? 1 : -1;
        if (r.chance(0.15)) dx = -dx;
      }
    }
  },

  /* ================= 긴 굴 · 엇갈린 굴 · 대공동 ================= */
  /** 굴을 팔 수 있는 칸인가 — 유적(그 밑 깊은 곳 자리까지) · 마을 · 공방 · 바다 · 지표 가까이는 비킨다 */
  _tunOk(x: number, y: number) { const { WW, WORLD_BOT, HELL_Y, SEA_X1, CAMP_X0, CAMP_GX1 } = this.dims;
    if (x < 6 || x >= WW - 6 || y >= Math.min(HELL_Y - 8, WORLD_BOT - 10)) return false;
    if (y <= this.surface[x] + 16 || inSeaZone(x, SEA_X1)) return false;
    if (x >= CAMP_X0 - 40 && x <= CAMP_GX1 + 40) return false;
    const dc = this.dawnCity; if (dc && x >= dc.x0 - 40 && x <= dc.x1 + 40) return false;
    for (const b of this._tunBoxes!) if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return false;
    const t = this.get(x, y);
    if (t === T.BEDROCK || TILE_DEF[t].liquid || this.locked(x, y)) return false;
    return this._tunNat!.has(this.walls[y * WW + x]);
  },
  /** 타원 한 덩이를 판다 — 하나라도 못 파는 칸이 있으면 아무것도 안 파고 false */
  _tunBlob(cx: number, cy: number, rx: number, ry: number, cells: number[][]) {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx), y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    const box: number[][] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      if (!this._tunOk(x, y)) return false;
      box.push([x, y]);
    }
    for (const [x, y] of box) if (this.solid(x, y)) { this.set(x, y, T.AIR); cells.push([x, y]); }
    return true;
  },
  /** 한쪽으로 길게 기어가는 굴 — 기울기는 천천히 바뀌고 수평으로 돌아오려 한다. 끝은 가늘어진다 */
  _tunWorm(r: RNG, x: number, y: number, dir: number, len: number, slope: number, rad: number, keep: number, cells: number[][]) {
    let s = slope, w = rad, done = 0;
    for (let i = 0; i < len; i++) {
      const taper = Math.min(1, (len - i) / 14, (i + 6) / 10);
      const h = Math.max(1.6, w * taper);
      if (!this._tunBlob(x, y, h * 1.6, h, cells)) break;
      done++;
      x += dir; y += s;
      s = clamp(s + r.range(-0.06, 0.06), -0.5, 0.5) * keep + slope * (1 - keep);
      w = clamp(w + r.range(-0.22, 0.22), 1.9, 3.4);
    }
    return done;
  },
  /** 굴 바닥 — 이 열에서 아래로 처음 막힌 칸 바로 위 */
  _tunFloor(x: number, y: number, lim: number) {
    for (let fy = y; fy < y + lim; fy++) if (this.get(x, fy) === T.AIR && this.solid(x, fy + 1)) return fy;
    return -1;
  },

  buildTunnels() { const { WSX, WSY, SX, SY, WW, WH, DEEP_Y, HELL_Y } = this.dims;
    const r = new RNG(this.seed + '_tunnel');   // ★ 제 난수 — 본 난수를 더 뽑으면 뒤따르는 생성이 씨앗마다 바뀐다
    this._tunNat = naturalWalls();
    this._tunBoxes = [];
    for (const q of this.ruins || []) {         // 유적 둘레 + 입구 쪽 위 + 깊은 곳이 파일 아래(150칸)
      const x0 = Math.floor(q.x - q.w / 2) - 24, x1 = Math.ceil(q.x + q.w / 2) + 24;
      this._tunBoxes.push([x0, Math.floor(q.y - q.h / 2) - 60, x1, Math.ceil(q.y + q.h / 2) + 150]);
    }
    for (const k of [this.works, this.runaway, this.atelier, this.deepShaft]) if (k && k.x0 !== undefined) this._tunBoxes.push([k.x0 - 12, k.y0 - 12, k.x0 + k.w + 12, k.y0 + k.h + 12]);
    const d = this.dungeon; if (d) this._tunBoxes.push([d.x - d.w / 2 - 12, d.y - d.h / 2 - 12, d.x + d.w / 2 + 12, d.y + d.h / 2 + 12]);
    const tier = (fy: number) => fy < SY(220) ? 3 : fy < DEEP_Y ? 4 : 5;
    const chestAt = (x: number, fy: number, t: number) => {
      this.objects.push({ type: 'chest', tier: t, x: x * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    };
    this.tunnels = [];                          // 생성에만 쓴다(디버그 바로가기가 찾는다) — 저장하지 않는다

    /* ① 대공동 — 지붕이 둥글고 바닥이 평평한 큰 방. 기둥 몇 개가 천장을 받친다. 호수 · 폭포는 floodCaves 가 caverns 로 본다 */
    let made = 0;
    for (let t = 0; t < 400 * WSX * WSY && made < Math.round(3 * WSX * WSY); t++) {
      const rx = r.int(40, 58), ry = r.int(19, 26), cx = r.int(rx + 20, WW - rx - 20), cy = r.int(SY(215), HELL_Y - ry - 14);
      if (this.tunnels.some((q: Bag) => Math.abs(q.cx - cx) < q.rx + rx + 30 && Math.abs(q.cy - cy) < 60)) continue;
      const ph = r.range(0, 6.28), cols: number[][] = [];
      let ok = true;
      for (let dx = -rx; dx <= rx && ok; dx++) {
        const k = Math.pow(1 - (dx / rx) ** 2, 0.38), wob = Math.sin(dx * 0.21 + ph) * 1.6 + Math.sin(dx * 0.07 + ph * 2) * 2.2;
        const top = Math.round(cy - ry * k + wob * k), bot = Math.round(cy + ry * k * 0.5 + Math.sin(dx * 0.17 + ph) * 0.8);
        if (bot - top < 3) { cols.push([cx + dx, top, top]); continue; }
        for (let y = top - 1; y <= bot + 1 && ok; y++) if (!this._tunOk(cx + dx, y)) ok = false;
        cols.push([cx + dx, top, bot]);
      }
      if (!ok) continue;
      const cells: number[][] = [];
      for (const [x, top, bot] of cols) for (let y = top; y < bot; y++) if (this.solid(x, y)) { this.set(x, y, T.AIR); cells.push([x, y]); }
      // 기둥 — 바닥에서 천장까지, 아래가 굵다(돌로 세워 두면 지층이 제 층 돌로 바꾼다)
      for (let p = r.int(2, 3), i = 0; i < p; i++) {
        const px = cx + Math.round((i + 0.5) / p * rx * 1.4 - rx * 0.7) + r.int(-3, 3), c = cols[px - cx + rx];
        if (!c || c[2] - c[1] < 10) continue;
        for (let y = c[1]; y < c[2]; y++) {
          const hw = (y > c[2] - 4 ? 2 : 1) + (y < c[1] + 3 ? 1 : 0);   // 밑동 · 머리가 굵은 3칸 기둥
          for (let x = px - hw; x <= px + hw - 1; x++) this.set(x, y, T.STONE);
        }
      }
      for (let i = 0; i < 10; i++) {               // 수정 · 횃불 몇 군데
        const [px, py] = cells[r.int(0, cells.length - 1)];
        if (this.get(px, py) === T.AIR && this.solid(px, py + 1)) this.set(px, py, r.chance(0.6) ? T.CRYSTAL : T.TORCH);
      }
      const fx = cx + r.int(-rx >> 1, rx >> 1), fy = this._tunFloor(fx, cy, ry + 4);
      if (fy > 0) { chestAt(fx, fy, tier(fy)); this.set(fx - 1, fy, T.TORCH); }
      this.caverns.push({ cx, cy, x0: cx - rx, x1: cx + rx, y0: cy - ry, y1: cy + Math.ceil(ry * 0.5), tier: tier(cy), hall: 1 });
      this.tunnels.push({ k: 'hall', cx, cy, rx, ry });
      made++;
    }

    /* ② 엇갈린 굴 — 완만한 굴과 가파른 굴이 한 점에서 만난다. 만나는 자리는 넓혀 옛 광부의 갈림길 야영지로 */
    made = 0;
    for (let t = 0; t < 300 * WSX * WSY && made < Math.round(3 * WSX * WSY); t++) {
      const jx = r.int(SX(200), WW - SX(200)), jy = r.int(SY(175), HELL_Y - 40);
      if (!this._tunOk(jx, jy) || this.tunnels.some((q: Bag) => Math.abs(q.cx - jx) < 220 && Math.abs(q.cy - jy) < 80)) continue;
      const cells: number[][] = [];
      if (!this._tunBlob(jx, jy, 11, 6, cells)) continue;
      const sa = r.range(-0.12, 0.12), sb = (r.chance(0.5) ? 1 : -1) * r.range(0.38, 0.5);
      let n = 0;
      for (const dir of [1, -1]) {
        n += this._tunWorm(r, jx, jy, dir, r.int(140, 230), sa * dir, r.range(2.4, 3.1), 0.9, cells);
        n += this._tunWorm(r, jx, jy, dir, r.int(90, 150), sb * dir, r.range(2.1, 2.7), 0.9, cells);
      }
      const fy = this._tunFloor(jx, jy, 10);
      if (fy > 0) {                               // 갈림길 야영지 — 상자 · 횃불 둘 · 공구 더미
        chestAt(jx, fy, tier(fy));
        for (const dx of [-4, 4]) { const ty = this._tunFloor(jx + dx, fy - 3, 8); if (ty > 0) this.set(jx + dx, ty, T.TORCH); }
        const ty = this._tunFloor(jx + 2, fy - 3, 8); if (ty > 0) this.set(jx + 2, ty, T.TOOLPILE);
      }
      this.tunnels.push({ k: 'cross', cx: jx, cy: jy, n });
      made++;
    }

    /* ③ 긴 굴 — 마인크래프트의 굴처럼 수백 칸을 옆으로 기어간다. 다른 굴과 부딪히면 그대로 이어진다 */
    made = 0;
    for (let t = 0; t < 300 * WSX * WSY && made < Math.round(9 * WSX * WSY); t++) {
      const x = r.int(SX(150), WW - SX(150)), y = r.int(SY(125), HELL_Y - 24);
      if (!this._tunOk(x, y)) continue;
      const cells: number[][] = [];
      const len = r.int(260, 520), dir = r.chance(0.5) ? 1 : -1;
      const n = this._tunWorm(r, x, y, dir, len, r.range(-0.1, 0.1), r.range(2.2, 3.2), 0.94, cells);
      if (n < 80) continue;                       // 곧 막힌 것 — 짧은 혹은 굴이라 세지 않는다
      const m = cells[cells.length >> 1] || [x, y];
      this.tunnels.push({ k: 'long', cx: m[0], cy: m[1], n });
      made++;
    }
    this._tunBoxes = null; this._tunNat = null;
  }
};
mixin(World.prototype, WorldStrata, true);
