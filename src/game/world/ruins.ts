/* ===== world/ruins.js — 유적 입구 · 복도 · 장식 · 암호 · 인장 · 신비의 방 ===== */
import { factory as Factory } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { MYSTIC } from '../data/ruins.js';
import { TS, World } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldRuins: Bag & ThisType<World> = {

  /** 유적 입구를 판다 — 생김새(arch)에 따라 들어가는 방식이 다르다. */
  carveRuinEntrance(spec, x0, y0, rng) {
    this._entranceLandY = undefined;                          // 피라미드만 채운다
    this._entranceSpots = [];                                 // 입구가 없으면 빈 채로 둔다
    this._entranceRooms = [];
    const ex = clamp(spec.x + rng.int(-(spec.w >> 2), spec.w >> 2), x0 + 3, x0 + spec.w - 4);
    const surf = this.surface[ex];

    /* sunken — 바다 밑 유적 전용. */
    if (spec.arch === 'seabed') {
      const bed = this.seaBed && ex < this.seaBed.length ? this.seaBed[ex] : this.surface[ex];
      // 해저 바로 아래에서 시작 — 위쪽은 바닷물이라 헤엄쳐 들어오게 된다
      for (let x = ex - 1; x <= ex + 1; x++)
        for (let y = bed - 2; y <= bed + 2; y++)
          if (this.inB(x, y)) { this.set(x, y, T.SEAWATER); this.setWall(x, y, 8); }
      this._entranceLandX = null;
      this._carveEntranceShaft(ex, bed + 3, y0 + 1, spec, rng);
      return this._entranceLandX === null ? ex : this._entranceLandX;
    }

    if (spec.arch === 'pyramid') {
      /* 피라미드 — 문은 **빗면**에 난다. */
      const mid = x0 + spec.w / 2;
      const side = rng.chance(0.5) ? -1 : 1;
      const faceX = y => Math.round(mid + side * ((y - y0 + 1) * (spec.w / 2) / spec.h));
      let yd = y0 + 10;
      for (; yd < y0 + spec.h - 8; yd++)
        if (this.surface[clamp(faceX(yd), 0, WW - 1)] - yd <= 6) break;
      const dx0 = faceX(yd) + side * 2;                       // 문 앞 한 칸 — 돌 턱이 깔린다
      const end = this._buildPassage(dx0, yd, y0 + spec.h - 4, spec, rng,
        { dir: -side, stopAtAir: true, vestibule: 5, lo: x0 + 8, hi: x0 + spec.w - 8 });
      this.putPathTrap(faceX(yd) - side * 3, yd, rng);        // 문지방 안쪽에 하나
      this._entranceLandX = end.x;
      this._entranceLandY = end.f;
      this._entranceSpots.push([dx0, yd]);
      return end.x;
    }

    if (spec.arch === 'buried') {
      // 입구가 없다.
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
      /* 지표 아래에 묻힌 통로. */
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
      // 유적 윗부분이 지상으로 솟아 있다 — 멀리서도 보인다.
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
      /* 실내 장식 — 지상에 솟아 멀리서도 보이는 구조물인 만큼 안에 들어왔을 때도 "버려진 탑"으로 읽히게 양쪽 벽에 횃불을 박고 깃발을 건다(구조는 그대로). */
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
  },

  /** 입구 통로 — 목(지상에서 땅까지)을 판 뒤 **벽돌로 쌓은 길**(_buildPassage)을 잇는다. */
  _carveEntranceShaft(ex, yTop, yBot, spec, rng) {
    const bg = spec.bg;
    const solid = (x, y) => TILE_DEF[this.get(x, y)].solid === 1;
    const dig = (x, y) => {
      if (this.inB(x, y) && this.get(x, y) !== T.BEDROCK) { this.set(x, y, T.AIR); this.setWall(x, y, bg); }
    };
    this._entranceSpots = [];
    this._entranceRooms = [];   // 층계참·계단실의 상자 — 진단이 함정 유무를 잰다
    // 입구 목 — 먼저 뚫어 둔다.
    for (let y = yTop - 2; y <= yTop + 1; y++) for (let dx = -1; dx <= 1; dx++) dig(ex + dx, y);
    /* ★ 목은 **땅에 닿을 때까지** 내린다. */
    let cy = yTop + 1;
    for (let k = 0; k < 24 && cy < yBot - 4 && !solid(ex, cy + 1); k++) {
      for (let dx = -1; dx <= 1; dx++) dig(ex + dx, cy + 1);
      cy++;
    }
    /* ★ 목에도 함정을 하나 심는다. */
    this.putPathTrap(ex, cy, rng);
    const end = this._buildPassage(ex, cy, yBot, spec, rng, { ruin: this._ruinCtx, lo: spec.lo, hi: spec.hi });
    this._entranceLandX = end.x;
    if (this._ruinCtx) this._entranceLandY = end.f;           // 옆문 — 지붕 줄이 아니라 방 바닥 높이
    this._entranceSpots.push([ex, yTop + 1]);                 // 입구 목 — 지상으로 나가는 자리
  },

  /** 유적으로 가는 **쌓아 올린 길** — 테라리아 던전 복도나 마인크래프트 요새처럼 벽돌로 두른 곧은 마디를 이어 붙인다. */
  _buildPassage(sx, sy, yBot, spec, rng, o) {
    const kind = spec.entryKind || 'foothold';
    const H = 5;                                              // 복도 안 높이
    const span = Math.max(20, Math.round((spec.w || 40) * 0.45));
    let lo = o.lo !== undefined ? o.lo : sx - span, hi = o.hi !== undefined ? o.hi : sx + span;
    let yGuard = yBot;                                        // 이 줄 아래로는 벽돌·바닥을 안 깐다(유적의 몸)
    const bg = spec.bg, wall = spec.wall || T.RUINBRICK, floorT = spec.floor || T.RUINTILE;
    const traps = spec.traps || ['dart', 'crumble'];
    const K = (x, y) => y * WW + x;
    const dug = new Set();
    const ok = (x, y) => this.inB(x, y) && this.get(x, y) !== T.BEDROCK && !this.locked(x, y);
    const dig = (x, y) => {
      if (!ok(x, y)) return;
      this.set(x, y, T.AIR); this.setWall(x, y, bg); dug.add(K(x, y));
    };
    // 벽돌 — 원래 땅(단단한 칸)만 바꾼다.
    const brick = (x, y) => {
      if (y < yGuard && ok(x, y) && !dug.has(K(x, y)) && TILE_DEF[this.get(x, y)].solid === 1) this.set(x, y, wall);
    };
    // 발밑 — 비어 있어도 깐다.
    const floorAt = (x, y) => {
      if (y < yGuard && ok(x, y) && !dug.has(K(x, y))) this.set(x, y, floorT);
    };
    /* ★ stopAtAir 는 **벽 속에 한 번 들어간 뒤에만** 본다. */
    let x = sx, f = sy, stop = false, inWall = false, stopAtAir = !!o.stopAtAir;
    let dir = o.dir || (rng.chance(0.5) ? 1 : -1);
    const cols = [];                                          // 이번 마디의 [x, 바닥]
    const col = (cx, cf) => {
      if (stopAtAir) {
        const open = this.get(cx, cf) === T.AIR && !dug.has(K(cx, cf));
        if (open && inWall) stop = true;
        if (!open) inWall = true;
      }
      for (let y = cf - H + 1; y <= cf; y++) dig(cx, y);
      brick(cx, cf - H); brick(cx, cf - H - 1);               // 천장 두 겹
      floorAt(cx, cf + 1); brick(cx, cf + 2);                 // 바닥과 그 밑 한 겹
      cols.push([cx, cf]);
    };
    const step = dy => { x += dir; f += dy; col(x, f); };
    const ahead = () => (dir > 0 ? hi - x : x - lo);
    col(x, f);

    /* 층계참 — 복도 높이 그대로 가던 쪽으로 붙는 네모난 방. */
    const landing = () => {
      const rw = rng.int(7, 11), rh = rng.int(5, 6);
      const ax = dir > 0 ? x + 1 : x - rw;                    // 방 안쪽 왼쪽 끝
      const top = f - rh + 1;
      for (let xx = ax - 1; xx <= ax + rw; xx++) {
        for (let y = top - 1; y <= f; y++) {
          const edge = xx === ax - 1 || xx === ax + rw || y === top - 1;
          if (edge) brick(xx, y); else dig(xx, y);
        }
        floorAt(xx, f + 1); brick(xx, f + 2); brick(xx, top - 2);
      }
      this._entranceSpots.push([ax + (rw >> 1), f]);
      this._entranceRooms.push([ax - 1, top - 1, rw + 2, rh + 2, f]);
      const box = { x: ax - 1, y: top - 1, w: rw + 2, h: rh + 2 };
      const pool = traps.filter(t => t !== 'dart' && t !== 'grind').concat(['crumble', 'vent', 'gas']);
      for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); const t2 = pool[i]; pool[i] = pool[j]; pool[j] = t2; }
      let placed = 0; const used = {};
      const want = rng.int(2, 3);
      for (const tk of pool) {
        if (placed >= want) break;
        if (used[tk]) continue;
        if (this.putTileTrap(box, f, tk, rng)) { used[tk] = 1; placed++; }
      }
      if (!placed) this.putPathTrap(ax + (rw >> 1), f, rng);
      if (kind === 'nofoothold' && rng.chance(0.6)) this.set(ax + rng.int(1, rw - 2), f, T.SPIKE);
      this.putDecor(ax, top + 1, spec.torch || T.TORCH, 'wall');
      if (rh >= 6) this.putDecor(ax + rw - 1, top + 1, T.BANNER, 'wall');
      if (rng.chance(0.25)) this.objects.push({ type: 'chest', tier: 1,
        x: (ax + (rw >> 1)) * TS, y: (f - 0.2) * TS, w: 30, h: 26, items: null });
      x = dir > 0 ? ax + rw - 1 : ax;                         // 다음 마디는 반대쪽 벽을 뚫고 나간다
    };

    /* 계단실 — 길이 되돌아 꺾이는 방. */
    const well = () => {
      const D = rng.int(9, 11), Ws = D + 1;
      const xw = x, top = f - H + 1;
      const at = i => xw + dir * i;                           // i = 1..Ws 가 방 속
      for (let i = 0; i <= Ws + 1; i++) {
        const cx = at(i);
        for (let y = top - 1; y <= f + D; y++) {
          const edge = i === 0 || i === Ws + 1 || y === top - 1;
          if (edge) brick(cx, y); else dig(cx, y);
        }
        floorAt(cx, f + D + 1); brick(cx, f + D + 2); brick(cx, top - 2);
      }
      // 발판형도 계단실 다섯에 둘만 나무 발판이다 — 전부 발판이면 깊은 입구가 다시 발판투성이가 된다
      const stepT = kind === 'foothold' && rng.chance(0.4) ? T.PLATFORM : wall;
      this.set(at(1), f + 1, stepT);                          // 들어온 턱
      for (let k = 1; k <= D - 3; k++) this.set(at(1 + k), f + k + 1, stepT);
      if (ok(at(Ws + 1), f + D - 1)) this.set(at(Ws + 1), f + D - 1, dir > 0 ? T.DART_L : T.DART_R);
      if (kind === 'nofoothold') this.set(at(D), f + D, T.SPIKE);
      this.putDecor(at(Ws), top + 1, spec.torch || T.TORCH, 'wall');
      this._entranceSpots.push([at(Ws - 1), f + D]);
      this._entranceRooms.push([Math.min(at(0), at(Ws + 1)), top - 1, Ws + 2, D + H + 1, f + D]);
      dir = -dir; f += D;
      col(xw, f);                                             // 나가는 문 — 같은 벽의 아래쪽
    };

    let lastSeg = 'start', lastRoom = f, guard = 0;
    if (o.vestibule) { for (let i = 0; i < o.vestibule && !stop; i++) step(0); lastSeg = 'hall'; }
    /** yT 줄까지 부품을 이어 내려간다. */
    const run = yT => {
      while (!stop && f < yT && guard++ < 120) {
        cols.length = 0;
        const rem = yT - f;
        // 옆으로 갈 자리가 모자라면 계단실에서 되돌아 꺾는다(오르막 바로 뒤에는 꺾지 않는다)
        if (ahead() < 14 && rem > 13 && lastSeg !== 'rise') { well(); lastSeg = 'well'; lastRoom = f; continue; }
        /* 층계참은 한 다리 **중간**에도 선다. */
        if (f - lastRoom >= 8 && ahead() >= 22 && lastSeg !== 'landing' && lastSeg !== 'well' && rem > 4) {
          landing(); lastSeg = 'landing'; lastRoom = f; continue;
        }
        let seg = rng.weighted([['flight', 5], ['hall', kind === 'maze' ? 3 : 2],
                                ['rise', kind === 'maze' ? 1.6 : 1]]);
        if (seg === 'rise' && (lastSeg === 'well' || lastSeg === 'rise' || rem < 12 || ahead() < 30)) seg = 'flight';
        /* ★ 평평한 복도는 **방(층계참·계단실) 바로 뒤에만** 둔다. */
        if (seg === 'hall' && (ahead() < 18 || !(lastSeg === 'landing' || lastSeg === 'well' || lastSeg === 'start')))
          seg = 'flight';
        if (seg === 'flight') {
          /* ★ 기울기는 **45° 하나**다. */
          const n = Math.max(3, Math.min(rng.int(5, 12), ahead() - 12));
          for (let i = 1; i <= n && !stop && f < yT; i++) step(1);
          // 계단 함정 — 한 칸을 무너지게 하거나 가시를 박는다.
          if (cols.length > 3 && rng.chance(0.45)) {
            const c = cols[rng.int(1, cols.length - 2)];
            this.putPathTrap(c[0], c[1], rng);
          }
          if (kind === 'nofoothold' && cols.length) {
            const c = cols[cols.length - 1];
            if (TILE_DEF[this.get(c[0], c[1] + 1)].solid === 1) this.set(c[0], c[1], T.SPIKE);
          }
        } else if (seg === 'hall') {
          const n = rng.int(3, 8);
          const x0h = x;
          for (let i = 0; i < n && !stop; i++) step(0);
          if (cols.length >= 3 && rng.chance(0.6)) {
            const ax = Math.min(x0h, x), bx = Math.max(x0h, x);
            this.putTileTrap({ x: ax, y: f - H, w: bx - ax + 1, h: H + 1 }, f,
                             rng.pick(['vent', 'gas', 'crumble']), rng);
          }
        } else {
          const n = rng.int(2, 3);
          for (let i = 0; i < n && !stop; i++) step(-1);
        }
        lastSeg = seg;
      }
    };
    const ruin = o.ruin;
    if (!ruin || !ruin.rooms || !ruin.rooms.length) { run(yBot); return { x, f }; }

    /* ★ 유적에는 **옆문으로 바닥 높이에서** 들어간다 — 사연: docs/code-history.md#h118 */
    run(ruin.y0 - 3);
    if (stop) return { x, f };
    const edgeL = r => r.x - ruin.x0, edgeR = r => ruin.x0 + ruin.w - (r.x + r.w);
    const cands = ruin.rooms.filter(r => Math.min(edgeL(r), edgeR(r)) <= 3 && r.h >= 5);
    const pool = cands.length ? cands : ruin.rooms;
    let T0 = pool[0];
    for (const r of pool)
      if (r.y < T0.y || (r.y === T0.y && Math.abs(r.x - x) < Math.abs(T0.x - x))) T0 = r;
    const side = edgeL(T0) <= edgeR(T0) ? -1 : 1;
    const tf = T0.y + T0.h - 3;                               // 그 방의 걷는 줄
    const cxo = side < 0 ? ruin.x0 - 5 : ruin.x0 + ruin.w + 4;
    dir = Math.sign(cxo - x) || side;
    lastSeg = 'hall';
    while (x !== cxo && !stop) step(0);                       // 지붕 위를 건너 바깥 열까지
    lo = side < 0 ? cxo - 36 : cxo; hi = side < 0 ? cxo : cxo + 36;
    dir = side; yGuard = tf + 3;
    run(tf);
    /* 유적 쪽으로 돌아 들어간다 — **고른 방 안에 한 칸 들어설 때까지** 판다. */
    dir = -side;
    const inRoom = () => (dir > 0 ? x >= T0.x + 1 : x <= T0.x + T0.w - 2);
    for (let i = 0; i < 60 && !stop && !inRoom(); i++) step(0);
    return { x, f };
  },

  /** 그 유적에만 놓이는 장식. */
  putRuinDecor(spec, r, fy, rng) {
    if (!spec.decor) return;
    /* ★ 규칙: 장식은 **걷는 줄(fy · fy-1)을 절대 막지 않는다.** */
    const list = Array.isArray(spec.decor[0]) ? spec.decor : [spec.decor];
    for (const [kind, tile, dens] of list) this._decorOne(spec, r, fy, kind, tile, dens, rng);
  },

  /* ★ 장식은 **붙을 데가 있어야 붙는다.** */
  _canDecor(x, y, side, like) {
    if (this.get(x, y) !== T.AIR) return false;
    const hold = (dx, dy) => {
      const t = this.get(x + dx, y + dy);
      return TILE_DEF[t].solid === 1 || (like !== undefined && t === like);
    };
    if (side === 'ceil') return hold(0, -1);
    if (side === 'floor') return hold(0, 1);
    if (side === 'wall') return hold(-1, 0) || hold(1, 0);
    return hold(0, -1) || hold(0, 1) || hold(-1, 0) || hold(1, 0);
  },

  /** 붙을 데가 있을 때만 놓는다. */
  putDecor(x, y, tile, side, like) {
    if (!this._canDecor(x, y, side, like === undefined ? tile : like)) return false;
    this.set(x, y, tile);
    return true;
  },

  _decorOne(spec, r, fy, kind, tile, dens, rng) {
    const x1 = r.x + r.w - 2;
    const air = (x, y) => this.get(x, y) === T.AIR;
    if (kind === 'pillar') {
      // 천장에서 내려오다 두 칸 남기고 멈추는 기둥 — 밑으로 지나다닐 수 있다.
      for (let x = r.x + 3; x < x1 - 1; x += 5) {
        if (!rng.chance(dens)) continue;
        for (let y = r.y + 2; y <= fy - 2; y++) if (!this.putDecor(x, y, tile, 'ceil')) break;
      }
    } else if (kind === 'stalac') {
      // 천장 고드름·종유석 — 길이가 제각각이라 천장이 울퉁불퉁해 보인다
      for (let x = r.x + 2; x < x1; x++) {
        if (!rng.chance(dens * 0.45)) continue;
        const len = rng.int(1, 3);
        for (let k = 0; k < len; k++) if (!this.putDecor(x, r.y + 2 + k, tile, 'ceil')) break;
      }
    } else if (kind === 'statue') {
      // 벽에 새긴 좌상 — 이미 벽인 칸만 갈아끼운다.
      for (const bx of [r.x, r.x + r.w - 1]) {
        if (!rng.chance(dens)) continue;
        for (let y = fy; y >= fy - 3; y--) if (this.get(bx, y) === spec.wall) this.set(bx, y, tile);
      }
    } else if (kind === 'frieze') {
      // 천장 밑을 두르는 띠 장식 (금 · 룬돌) — 벽 위쪽에만
      const y = r.y + 2;
      for (let x = r.x + 2; x < x1; x += 3) if (rng.chance(dens)) this.putDecor(x, y, tile, 'ceil');
    } else if (kind === 'beam') {
      // 천장을 받치는 갱목 — 세로 기둥 없이 천장 줄에만 건다
      for (let x = r.x + 2; x < x1; x += 4) {
        if (!rng.chance(dens)) continue;
        if (!this.putDecor(x, r.y + 2, tile, 'ceil')) continue;
        if (rng.chance(0.5)) this.putDecor(x, r.y + 3, tile, 'ceil');
      }
    } else if (kind === 'rail') {
      // 광차 레일 — 바닥 타일을 널판으로 갈아 깐다 (통행에 영향 없음)
      if (!rng.chance(dens)) return;
      for (let x = r.x + 2; x < x1; x++) if (this.get(x, fy + 1) === spec.floor) this.set(x, fy + 1, tile);
    } else if (kind === 'crate') {
      // 쌓아 둔 나무 상자 — 한 칸 높이라 뛰어넘을 수 있다
      for (let x = r.x + 3; x < x1 - 1; x += 6)
        if (rng.chance(dens)) this.putDecor(x, fy, tile, 'floor');
    } else if (kind === 'pipe') {
      // 벽을 타고 흐르는 구리·납 배관 — 세션 2 전기 문명의 흔적
      const y = r.y + rng.int(2, 3);
      for (let x = r.x + 1; x <= x1; x++) if (rng.chance(dens)) this.putDecor(x, y, tile, 'ceil');
      for (const bx of [r.x + 2, x1 - 1])
        if (rng.chance(dens * 0.6))
          for (let yy = y + 1; yy <= y + 2; yy++) if (!this.putDecor(bx, yy, tile, 'ceil')) break;
    } else if (kind === 'moss') {
      // 바닥을 덮은 이끼 — 바닥 타일만 갈아 깐다
      for (let x = r.x + 1; x <= x1; x++)
        if (rng.chance(dens) && this.get(x, fy + 1) === spec.floor) this.set(x, fy + 1, tile);
    } else if (kind === 'web' || kind === 'growth') {
      // 벽·천장에서 자라나온 것 — 통과되는 타일이라 바닥 줄에 놓아도 안전하다
      for (let x = r.x + 2; x < x1; x++) {
        if (rng.chance(dens * 0.4)) this.putDecor(x, r.y + 2, tile, 'ceil');
        if (rng.chance(dens * 0.3)) this.putDecor(x, fy, tile, 'floor');
      }
    } else if (kind === 'floorpile') {
      /* 바닥에 흩어 놓은 것. */
      for (let x = r.x + 4; x < x1 - 1; x += 4)
        if (rng.chance(dens) && air(x, fy) && this.solid(x, fy + 1)) this.set(x, fy, tile);
    } else if (kind === 'wallmark') {
      /* 벽에 새긴 것. */
      for (const [bx, in1] of [[r.x, 1], [r.x + r.w - 1, -1]]) {
        if (!rng.chance(dens)) continue;
        for (let y = fy; y >= fy - 3; y--)
          if (this.solid(bx, y) && this.get(bx + in1, y) === T.AIR) this.set(bx, y, tile);
      }
    } else if (kind === 'brazier') {
      // 바닥에 세운 화로 — 통과되는 불이라 길을 막지 않는다
      for (let x = r.x + 4; x < x1 - 2; x += 7)
        if (rng.chance(dens)) this.putDecor(x, fy, tile, 'floor');
    }
  },

  /** 암호 골방 — 방 오른쪽 끝에 암호석 문을 세우고 그 너머에 상자를 둔다. */
  buildCipherVault(spec, r, fy, rng, rooms) {
    const x1 = r.x + r.w - 2, dx0 = x1 - 6;
    for (let y = fy - 6; y <= fy + 2; y++)
      for (let x = dx0 - 1; x <= x1 + 2; x++) {
        const inner = (y > fy - 5 && y < fy + 1 && x > dx0 && x < x1 + 1);
        this.set(x, y, inner ? T.AIR : T.CIPHERSTONE);
        this.setWall(x, y, spec.bg);
      }
    this.objects.push({ type: 'codedoor', ruin: spec.id, dx: dx0, dy: fy,
      x: dx0 * TS, y: (fy - 3) * TS, w: TS, h: TS * 4 });
    // 껍질 자리를 적어 둔다 — 세계를 다 만든 뒤 한 번 더 세워 확실히 잠근다
    (this.ruinVaults = this.ruinVaults || []).push([dx0 - 1, fy - 6, x1 + 2, fy + 2, spec.bg]);
    // codeRuin 이 있으면 그 유적의 암호문이 열리기 전까지 상자가 안 열린다
    this.objects.push({ type: 'chest', tier: clamp((spec.tier || 3) + 2, 1, 6), locked: 1, codeRuin: spec.id,
      x: (x1 - 2) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });

    /* 쪽지 셋 — 골방 방을 뺀 나머지에서 **서로 멀리** 셋을 고른다. */
    const pool = (rooms || []).filter(q => q !== r);
    pool.sort((a, b) => a.x - b.x);
    for (let i = 0; i < 3 && pool.length; i++) {
      // 왼쪽 · 가운데 · 오른쪽에서 하나씩.
      const want = Math.round(i * (pool.length - 1) / 2);
      let q = null;
      for (let d = 0; d < pool.length && !q; d++)
        for (const j of [want + d, want - d])
          if (j >= 0 && j < pool.length && !pool[j].noted) { q = pool[j]; break; }
      if (!q) break;
      q.noted = 1;
      const ny = q.y + q.h - 3;
      this.objects.push({ type: 'ciphernote', ruin: spec.id, idx: i,
        x: (q.x + 3) * TS, y: (ny + 1) * TS - 24, w: 22, h: 24 });
    }
  },

  /** 그 유적에만 있는 방 하나. */
  buildSigRoom(spec, r, fy, cx, idx, rng) {
    const x1 = r.x + r.w - 2, sig = spec.sig;
    for (let x = r.x + 2; x < x1; x += 4) this.putDecor(x, r.y + 2, spec.torch, 'any');

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
    } else if (sig === 'shaft') {
      // 무너진 갱도 — 바닥 절반이 부서지는 바닥이고 아래는 비어 있다
      for (let x = r.x + 3; x < x1 - 2; x++) {
        this.set(x, fy + 1, T.CRUMBLE);
        this.set(x, fy + 2, T.AIR); this.set(x, fy + 3, T.AIR);
      }
      for (let x = r.x + 3; x < x1 - 2; x += 2) this.set(x, fy + 4, T.SPIKE);
    } else if (sig === 'heart') {
      // 둥지의 심장 — 방 한가운데에 살덩이가 부풀어 있다 천장에 매달린 살덩이 — 바닥에 놓으면 방을 가로막아 지나갈 수가 없다
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

    /* 이 방을 밟으면 유적 고유 이벤트가 한 번 터진다. */
    if (spec.event) {
      if (!this.ruinEvents) this.ruinEvents = [];
      this.ruinEvents.push({ ruin: spec.id, ev: spec.event, sig,
        x: (r.x + 1) * TS, y: (r.y + 1) * TS, w: (r.w - 2) * TS, h: (r.h - 2) * TS });
    }
  },

  /** 신비한 방 — 싸움이 아니라 고르는 것이 내용이라 함정도 몹도 두지 않는다. */
  buildMysticRoom(spec, r, fy, cx, rng) {
    const m = MYSTIC[spec.mystic]; if (!m) return;
    const x1 = r.x + r.w - 2;
    for (let x = r.x + 2; x < x1; x += 3) this.putDecor(x, r.y + 2, spec.torch || T.TORCH, 'any');
    // 방 안을 깨끗이 비운다 — 앞서 깔린 함정·장식을 걷어낸다
    for (let x = r.x + 1; x <= x1; x++)
      for (let y = r.y + 3; y <= fy; y++)
        if (TILE_DEF[this.get(x, y)].solid === 1) this.set(x, y, T.AIR);
    // 가운데 상징물 — 우물이면 물, 메아리면 룬돌, 별빛이면 수정
    const tile = T[m.tile] !== undefined ? T[m.tile] : T.RUNESTONE;
    for (let dx = -2; dx <= 2; dx++) this.set(cx + dx, fy + 1, T.RUINTILE);
    for (let dx = -1; dx <= 1; dx++) this.set(cx + dx, fy, tile);
    this.putDecor(cx - 2, fy, spec.torch || T.TORCH, 'any');
    this.putDecor(cx + 2, fy, spec.torch || T.TORCH, 'any');
    this.objects.push({ type: 'mystic', mk: spec.mystic, ruin: spec.id,
      x: (cx - 1) * TS, y: (fy - 1) * TS, w: TS * 3, h: TS * 2 });
  },

  /** 유적 하나를 짓는다 — 방·함정·상자·비문·미니보스 둥지까지. */
  /** 피라미드 마무리 — 꼭대기 두 줄을 금으로 덮고, 지표(surface)를 빗면으로 올린다. */
  _finishPyramid(spec, x0, y0) {
    const w = spec.w, h = spec.h, mid = x0 + w / 2;
    const inTri = (x, y) => y >= y0 && y < y0 + h && Math.abs(x + 0.5 - mid) <= (y - y0 + 1) * (w / 2) / h;
    for (let x = x0; x < x0 + w; x++) {
      for (let y = y0; y < y0 + h; y++) {
        if (!inTri(x, y)) continue;
        if (y - y0 < 2 && TILE_DEF[this.get(x, y)].solid === 1) this.set(x, y, T.GOLD);  // 금 관석
        if (y < this.surface[x]) this.surface[x] = y;
        break;
      }
    }
    for (let x = x0; x < x0 + w; x++)                          // 관석 둘째 줄
      for (let y = y0 + 1; y < y0 + 3; y++)
        if (inTri(x, y) && TILE_DEF[this.get(x, y)].solid === 1 && y - y0 < 2) this.set(x, y, T.GOLD);
  },
};
mixin(World.prototype, WorldRuins, true);
