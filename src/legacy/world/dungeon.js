/* ===== world/dungeon.js — 방이 여러 개인 던전 · 걸어서 닿는가(통행 보수) ===== */
import { factory as Factory } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { WH, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { RUIN_PLANS } from '../data/ruins.js';
import { BoxSet, World } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldDungeon = {

  /* ================= 방이 여러 개인 던전 ================= */
  bspSplit(x, y, w, h, depth, minW, minH, rng, out) {
    const canH = h >= minH * 2 + 1, canV = w >= minW * 2 + 1;
    if (depth <= 0 || (!canH && !canV)) { out.push({ x, y, w, h }); return; }
    /* ★ 가로가 세로의 1.6배가 안 되면 가로로 잘라 납작하게 만든다. */
    const horiz = canH && (!canV || (h * 1.6 > w ? rng.chance(0.95) : rng.chance(0.15)));
    if (horiz) {
      const cut = rng.int(minH, h - minH - 1);
      this.bspSplit(x, y, w, cut, depth - 1, minW, minH, rng, out);
      this.bspSplit(x, y + cut, w, h - cut, depth - 1, minW, minH, rng, out);
    } else {
      const cut = rng.int(minW, w - minW - 1);
      this.bspSplit(x, y, cut, h, depth - 1, minW, minH, rng, out);
      this.bspSplit(x + cut, y, w - cut, h, depth - 1, minW, minH, rng, out);
    }
  },

  /** 두 방 사이 공유 벽에 통로를 뚫는다. */
  _linkRooms(a, b, floor) {
    const ax1 = a.x + a.w, ay1 = a.y + a.h, bx1 = b.x + b.w, by1 = b.y + b.h;
    /* ★ 옆으로 붙었는지 볼 때 겹치는 높이가 없으면 **돌려주지 말고 아래(위아래로 붙었나)로 넘어간다.** */
    const side = (ax1 === b.x || bx1 === a.x) &&
      Math.min(ay1, by1) - 2 >= Math.max(a.y, b.y) + 1;
    if (side) {                                              // 세로 벽을 공유
      const wx = ax1 === b.x ? ax1 - 1 : bx1 - 1;
      const y0 = Math.max(a.y, b.y) + 1, y1 = Math.min(ay1, by1) - 2;
      if (y1 < y0) return false;
      // 바닥에 붙여 뚫어야 걸어서 지나갈 수 있다
      const dy = y1;
      for (let k = 0; k < 2; k++) { this.set(wx, dy - k, T.AIR); this.set(wx + 1, dy - k, T.AIR); this.set(wx - 1, dy - k, T.AIR); }
      return true;
    }
    if (ay1 === b.y || by1 === a.y) {                       // 가로 벽을 공유 (위아래)
      const wy = ay1 === b.y ? ay1 - 1 : by1 - 1;
      /* ★ 오른쪽 끝을 **네 칸** 물린다. */
      const x0 = Math.max(a.x, b.x) + 2, x1 = Math.min(ax1, bx1) - 4;
      if (x1 < x0) return false;
      const dx = (x0 + x1) >> 1;
      for (let k = -1; k <= 1; k++) { this.set(dx + k, wy, T.AIR); this.set(dx + k, wy + 1, T.AIR); }
      /* ★ 윗방 **바닥 타일**(wy-1)도 뚫어 발판으로 바꾼다. */
      for (let k = -1; k <= 1; k++) this.set(dx + k, wy - 1, T.PLATFORM);
      // 위층으로 올라갈 발판 사다리
      for (let yy = wy + 1; yy < wy + 5 && yy < by1 + a.h; yy++) this.set(dx, yy, T.PLATFORM);
      this.set(dx, wy, T.PLATFORM);
      return true;
    }
    return false;
  },

  /** 방 묶음 던전을 짓고 방 목록을 돌려준다 */
  carveDungeon(cfg) {
    const { x0, y0, w, h, wall, floor, bg, rng } = cfg;
    const minW = cfg.minW || 11, minH = cfg.minH || 9;
    // 1) BSP로 방을 뽑는다
    const all = [];
    this.bspSplit(x0, y0, w, h, cfg.depth || 4, minW, minH, rng, all);
    /* 2) 도면(plan)이 있으면 그 칸에 든 방만 남긴다. */
    let leaves = all;
    const plan = cfg.plan && RUIN_PLANS[cfg.plan];
    /* 삼각형(plan 'tri' — 피라미드). */
    const tri = cfg.plan === 'tri';
    const inTri = (x, y) => y >= y0 && y < y0 + h &&
      Math.abs(x + 0.5 - (x0 + w / 2)) <= (y - y0 + 1) * (w / 2) / h;
    if (tri) {
      /* ★ 피라미드는 BSP 로 자르지 않고 **층**으로 쌓는다. */
      const rooms = [];
      const mid = x0 + w / 2;
      const top0 = y0 + 7;
      for (let by = top0; by + 8 <= y0 + h; by += 8) {
        const last = by + 16 > y0 + h;
        const bh = last ? Math.min(12, y0 + h - by) : 8;
        const half = Math.floor((by - y0) * (w / 2) / h) - 2;  // 이 층 **윗줄** 폭 — 가장 좁은 자리
        if (half < 5) continue;
        let xl = Math.ceil(mid - half), xr = Math.floor(mid + half);
        const row = [];
        if (last) {                                            // 왕의 방을 가운데에 먼저
          const kw = Math.min(22, xr - xl + 1);
          const kx = Math.round(mid - kw / 2);
          row.push({ x: kx, y: by, w: kw, h: bh });
          for (let x = kx - 1; x - 8 >= xl;) { const rw = Math.min(rng.int(9, 13), x - xl + 1); row.push({ x: x - rw + 1, y: by, w: rw, h: bh }); x -= rw; }
          for (let x = kx + kw; x + 8 <= xr;) { const rw = Math.min(rng.int(9, 13), xr - x + 1); row.push({ x, y: by, w: rw, h: bh }); x += rw; }
        } else {
          /* ★ 좁은 곁방과 넓은 전실이 섞여야 무덤의 방 배치로 읽힌다. */
          for (let x = xl; x + 6 <= xr;) {
            let rw = rng.chance(0.3) ? rng.int(14, 18) : rng.int(7, 10);
            if (xr - (x + rw) + 1 < 7) rw = xr - x + 1;       // 남는 폭이 방 하나가 안 되면 붙인다
            row.push({ x, y: by, w: rw, h: bh }); x += rw;
          }
        }
        for (const r of row)
          if (inTri(r.x - 1, r.y - 1) && inTri(r.x + r.w, r.y - 1) &&
              inTri(r.x - 1, r.y + r.h) && inTri(r.x + r.w, r.y + r.h)) rooms.push(r);
      }
      if (rooms.length >= 3) leaves = rooms;
    } else if (plan) {
      const rows = plan.length, cols = plan[0].length;
      const inPlan = r => {
        const cxr = clamp(Math.floor((r.x + r.w / 2 - x0) / w * cols), 0, cols - 1);
        const cyr = clamp(Math.floor((r.y + r.h / 2 - y0) / h * rows), 0, rows - 1);
        return plan[cyr][cxr] !== '.';
      };
      const kept = all.filter(inPlan);
      if (kept.length >= 3) leaves = kept;
    }
    /* 2.5) 방 수를 목표에 맞춘다 — 모자라면 **가장 넓은 방부터 한 번 더 자른다.** */
    const target = tri ? 0 : (cfg.target || 0);                // 피라미드는 층이 곧 방 수다
    if (target) {
      const splittable = r => r.h >= minH * 2 + 1 || r.w >= minW * 2 + 1;
      let guard = 0;
      while (leaves.length < target && guard++ < 400) {
        let best = null;
        for (const r of leaves)
          if (splittable(r) && (!best || r.w * r.h > best.w * best.h)) best = r;
        if (!best) break;
        const two = [];
        this.bspSplit(best.x, best.y, best.w, best.h, 1, minW, minH, rng, two);
        if (two.length < 2) break;
        leaves.splice(leaves.indexOf(best), 1, ...two);
      }
    }
    /* 2.6) 방 크기를 **눈에 띄게** 가른다 — 큰 홀 · 보통 방 · 골방. */
    if (target && rng) {
      const halls = Math.max(1, Math.round(leaves.length * 0.10));
      for (let k = 0; k < halls; k++) {
        const pairs = [];
        for (const a of leaves) for (const b of leaves)
          if (a !== b && !a.hall && !b.hall && !a.cell && !b.cell && a.y === b.y && a.h === b.h &&
              a.x + a.w === b.x && a.w + b.w <= 46) pairs.push([a, b]);
        if (!pairs.length) break;
        const [a, b] = rng.pick(pairs);
        leaves.splice(leaves.indexOf(b), 1);
        a.w += b.w; a.hall = 1;
      }
      const cw = Math.max(7, minW - 4);                 // 골방 가로(벽 포함) — 안쪽 다섯 칸
      /* 골방은 목표 방 수의 **바닥을 지키는** 몫도 한다 — 2.5) 가 최소 크기에 걸려 목표에 못 미치면(실측 d1 석판 2: 11/14) 모자란 만큼 더 가른다. */
      const cells = Math.max(Math.round(leaves.length * 0.22), target - leaves.length);
      for (let k = 0; k < cells || leaves.length < target; k++) {
        /* 세로로 가를 폭이 없으면 **가로로**, 위쪽에 낮은 다락(높이 6)을 떼어 낸다. */
        const cand = leaves.filter(r => !r.hall && !r.cell && (r.w >= cw + minW || r.h >= minH + 6));
        if (!cand.length) break;
        const r = rng.pick(cand);
        let a, b;
        if (r.w >= cw + minW) {
          const left = rng.chance(0.5);
          const cut = left ? cw : r.w - cw;
          a = { x: r.x, y: r.y, w: cut, h: r.h }; b = { x: r.x + cut, y: r.y, w: r.w - cut, h: r.h };
          (left ? a : b).cell = 1;
        } else {
          a = { x: r.x, y: r.y, w: r.w, h: 6 }; b = { x: r.x, y: r.y + 6, w: r.w, h: r.h - 6 };
          a.cell = 1;
        }
        leaves.splice(leaves.indexOf(r), 1, a, b);
      }
    }
    if (tri)                                                   // 삼각형 전체를 먼저 벽돌 덩어리로
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++)
          if (inTri(x, y) && this.get(x, y) !== T.BEDROCK) { this.set(x, y, wall); this.setWall(x, y, bg); }
    // 3) 남긴 방들의 자리만 벽으로 채운다 (테두리 한 칸 포함) — 사연: docs/code-history.md#h112
    for (const r of leaves)
      for (let x = r.x - 1; x <= r.x + r.w; x++)
        for (let y = r.y - 1; y <= r.y + r.h; y++) { this.set(x, y, wall); this.setWall(x, y, bg); }
    /* 4) 각 방 속을 판다 (테두리 1칸은 벽으로 남긴다). */
    // 피라미드는 네모와 기둥 홀만 — 둥근 방·팔각 방은 돌을 쌓은 무덤으로 안 읽힌다
    const shapes = cfg.shapes || (tri ? ['rect', 'rect', 'rect', 'pillars'] : ['rect', 'rect', 'round', 'octagon', 'pillars']);
    for (const r of leaves) {
      // 골방은 좁아서 둥글게 깎으면 걸을 자리가 없다 — 네모로만
      const shape = r.cell ? 'rect' : rng ? rng.pick(shapes) : 'rect';
      r.shape = shape;
      const x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
      const cx = (r.x + x1) / 2, cy = (r.y + y1) / 2;
      const rx = (r.w - 2) / 2, ry = (r.h - 2) / 2;
      const keepY = y1 - 3;                                  // 이 아래로는 무조건 통로
      for (let x = r.x + 1; x < x1; x++)
        for (let y = r.y + 1; y < y1; y++) {
          let open = true;
          if (y < keepY) {
            if (shape === 'round') {
              const dx = (x - cx) / rx, dy = (y - cy) / ry;
              open = dx * dx + dy * dy <= 1;                 // 타원
            } else if (shape === 'octagon') {
              // 모서리를 비스듬히 잘라 낸다
              const cut = Math.min(r.w, r.h) >> 2;
              const ex = Math.min(x - r.x, x1 - x), ey = Math.min(y - r.y, y1 - y);
              open = ex + ey > cut;
            } else if (shape === 'pillars') {
              // 일정 간격으로 기둥을 남긴다 (천장을 받치는 홀처럼)
              open = !((x - r.x) % 4 === 0 && y > r.y + 1);
            }
          }
          if (open) this.set(x, y, T.AIR);
        }
      for (let x = r.x + 1; x < x1; x++) this.set(x, y1 - 1, floor);
    }
    // 5) 맞닿은 방끼리 잇는다
    for (let i = 0; i < leaves.length; i++)
      for (let j = i + 1; j < leaves.length; j++) this._linkRooms(leaves[i], leaves[j], floor);
    /* 5.5) 피라미드 — 방마다 **아래층과 한 군데는 반드시** 잇는다. */
    if (tri) {
      for (const r of leaves) {
        let best = null, bo = 0;
        for (const q of leaves) {
          if (q.y !== r.y + r.h) continue;
          const o = Math.min(r.x + r.w, q.x + q.w) - Math.max(r.x, q.x);
          if (o > bo) { bo = o; best = q; }
        }
        if (!best || bo < 4) continue;
        const lo = Math.max(r.x, best.x) + 1, hi = Math.min(r.x + r.w, best.x + best.w) - 2;
        const bad = new Set([r.x, r.x + r.w - 2, r.x + r.w - 1, best.x, best.x + best.w - 2, best.x + best.w - 1]);
        const mid0 = (lo + hi) >> 1;
        let dx = -1;
        for (let d = 0; d <= hi - lo && dx < 0; d++)
          for (const c of [mid0 - d, mid0 + d]) if (c >= lo && c <= hi && !bad.has(c)) { dx = c; break; }
        if (dx < 0) continue;
        const walk = best.y + best.h - 3;                    // 아랫방 걷는 줄
        for (let y = r.y + r.h - 2; y <= walk - 2; y++) this.set(dx, y, T.PLATFORM);
      }
    }
    // 6) 그래도 못 들어가는 방이 남으면 직접 굴을 뚫는다.
    this._ensureConnected(x0, y0, w, h, leaves);
    return leaves;
  },

  /** 방 하나에서 걸어 닿을 수 있는 칸을 모아 온다 */
  _walkable(x0, y0, w, h, sx, sy) {
    const seen = new Set(), st = [[sx, sy]];
    seen.add(sy * WW + sx);
    while (st.length) {
      const [x, y] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < x0 - 1 || nx > x0 + w || ny < y0 - 1 || ny > y0 + h) continue;
        const k = ny * WW + nx;
        if (seen.has(k) || TILE_DEF[this.get(nx, ny)].solid === 1) continue;
        seen.add(k); st.push([nx, ny]);
      }
    }
    return seen;
  },

  /** 고립된 방마다 가장 가까운 이미 닿는 방까지 ㄱ자 굴을 판다 */
  _ensureConnected(x0, y0, w, h, rooms) {
    const spot = r => [r.x + 2, r.y + r.h - 3];
    let guard = 0;
    while (guard++ < rooms.length + 2) {
      const [bx, by] = spot(rooms[0]);
      const seen = this._walkable(x0, y0, w, h, bx, by);
      const lost = rooms.filter(r => { const [sx, sy] = spot(r); return !seen.has(sy * WW + sx); });
      if (!lost.length) return;
      // 닿는 방 중 가장 가까운 것과 잇는다
      const ok = rooms.filter(r => { const [sx, sy] = spot(r); return seen.has(sy * WW + sx); });
      const a = lost[0];
      let best = ok[0], bd = 1e9;
      for (const r of ok) {
        const d = Math.abs(r.x - a.x) + Math.abs(r.y - a.y);
        if (d < bd) { bd = d; best = r; }
      }
      const [ax, ay] = spot(a), [tx, ty] = spot(best);
      /* 잠긴 돌(암호석·봉인석)은 뚫지 않는다 — 뚫으면 자물쇠가 무의미해진다 */
      const lk = (x, y) => this.locked(x, y);
      const dig = (x, y) => { if (!lk(x, y)) this.set(x, y, T.AIR); };
      // 세로로 먼저 파고 (발판을 놓아 올라갈 수 있게) 가로로 잇는다
      const y1 = Math.min(ay, ty), y2 = Math.max(ay, ty);
      for (let y = y1; y <= y2; y++) {
        dig(ax, y); dig(ax, y - 1);
        if (y % 3 === 0 && !lk(ax, y)) this.set(ax, y, T.PLATFORM);
      }
      const xa = Math.min(ax, tx), xb = Math.max(ax, tx);
      for (let x = xa; x <= xb; x++) { dig(x, y1); dig(x, y1 - 1); }
    }
  },

  /* ---- 걸어서 닿는지 검사하고 고친다 ---- */

  /** 한 자리에서 뛰어서 닿는 "설 수 있는 칸"을 모아 온다 */
  /** 걸음 판정에 쓰는 칸 물음들. */
  _standFns() {
    const sup = (x, y) => { const s = TILE_DEF[this.get(x, y)].solid; return s === 1 || s === 2; };
    /* ★ 잠긴 돌(암호석·봉인석)은 **지나갈 수 있는 것으로** 본다 — 풀면 열리는 문이다 (tools/ruindiag.py 도 그렇게 잰다). */
    const free = (x, y) => TILE_DEF[this.get(x, y)].solid !== 1 || this.locked(x, y);
    const liq = (x, y) => !!TILE_DEF[this.get(x, y)].liquid;  // 물속에서는 뜬다 (Ent.move)
    const body = (x, y) => free(x, y) && free(x, y - 1);      // 키 두 칸이 들어가는가
    const stand = (x, y) => body(x, y) && (sup(x, y + 1) || liq(x, y));
    return { free, body, stand };
  },
  /** (sx, sy) 에 떨어뜨린 몸이 처음 발을 딛는 칸 — 없으면 null */
  _standSeed(box, f, sx, sy) {
    for (let cy = sy; cy <= box[3]; cy++) {
      if (!f.body(sx, cy)) break;
      if (f.stand(sx, cy)) return [sx, cy];
    }
    for (let k = 1; k <= 6; k++) if (f.stand(sx, sy - k)) return [sx, sy - k];
    return null;
  },
  /** (x, y) 에 선 몸이 **한 번에** 옮겨 설 수 있는 칸마다 push(nx, ny) — 떨어지기 · 제자리 점프 · 옆으로 한 번에 네 칸까지 뛰어 떨어지기 · 발판 뚫고 내려가기. */
  _standNext(box, f, x, y, push) {
    const JUMP = 3, RUN = 4;                                  // 오를 수 있는 높이 · 한 번에 나는 폭
    const drop = (x, y) => {                                  // 발이 닿을 때까지 떨어진다
      for (let cy = y; cy <= box[3]; cy++) {
        if (!f.body(x, cy)) return;
        if (f.stand(x, cy)) { push(x, cy); return; }
      }
    };
    if (TILE_DEF[this.get(x, y + 1)].solid === 2) drop(x, y + 2);   // 발판을 뚫고 내려간다
    for (let h = 0; h <= JUMP; h++) {
      const yh = y - h;
      if (yh <= box[1]) break;
      if (h > 0 && !f.free(x, yh - 1)) break;                 // 머리가 천장에 막힌다
      if (h > 0 && f.stand(x, yh)) push(x, yh);               // 제자리 점프로 발판에 올라선다
      for (const dx of [-1, 1]) for (let s = 1; s <= RUN; s++) {
        const nx = x + dx * s;
        if (nx < box[0] || nx > box[2] || !f.body(nx, yh)) break;
        drop(nx, yh);
      }
    }
  },
  /** (sx, sy) 에서 걸어서(뛰고 떨어지며) 닿는 설 자리 전부. */
  _standSet(box, sx, sy) {
    const f = this._standFns();
    const seen = new BoxSet(box, 10), st = [];
    const push = (x, y) => { const k = y * WW + x; if (!seen.has(k)) { seen.add(k); st.push(x, y); } };
    const s0 = this._standSeed(box, f, sx, sy);
    if (s0) push(s0[0], s0[1]);
    let guard = 0;
    while (st.length && guard++ < 200000) {
      const y = st.pop(), x = st.pop();
      this._standNext(box, f, x, y, push);
    }
    return seen;
  },
  /** 거꾸로 걷기 — 상자 안 설 자리 가운데 **rootK 까지 걸어 닿을 수 있는** 칸 전부 — 사연: docs/code-history.md#h113 */
  _returnSet(box, rootK) {
    const f = this._standFns();
    const preds = new Map();
    for (let y = box[1] - 8; y <= box[3]; y++)
      for (let x = box[0]; x <= box[2]; x++) {
        if (!f.stand(x, y)) continue;
        const k = y * WW + x;
        this._standNext(box, f, x, y, (nx, ny) => {
          const nk = ny * WW + nx;
          let a = preds.get(nk);
          if (!a) preds.set(nk, a = []);
          a.push(k);
        });
      }
    const R = new BoxSet(box, 10), st = [rootK];
    R.add(rootK);
    while (st.length) {
      const a = preds.get(st.pop());
      if (a) for (const p of a) if (!R.has(p)) { R.add(p); st.push(p); }
    }
    return R;
  },

  /** 두 자리를 걸어 다닐 수 있게 잇는다 — 가로 굴을 내고 세로로 발판 사다리를 세운다 */
  _digStair(ax, ay, tx, ty, floor, box, traps, rng) {
    const yT = Math.min(ay, ty), yB = Math.max(ay, ty);
    const c = clamp(tx, box[0] + 1, box[2] - 2);
    /* ★ 이미 놓인 발판은 절대 지우지 않는다. */
    /* 발판은 지우지 않고, **잠긴 돌(암호석·봉인석)도 건드리지 않는다.** */
    const locked = (x, y) => this.locked(x, y);
    const bore = (x, y) => {
      if (locked(x, y) || TILE_DEF[this.get(x, y)].solid === 2) return;
      this.set(x, y, T.AIR);
    };
    // ① a 자리 높이에서 t 자리 열까지 가로 굴.
    const rx0 = clamp(Math.min(ax, c) - 1, box[0], box[2]);
    const rx1 = clamp(Math.max(ax, c) + 2, box[0], box[2]);
    for (let x = rx0; x <= rx1; x++) {
      for (let k = 0; k < 3; k++) bore(x, ay - k);
      const s = TILE_DEF[this.get(x, ay + 1)].solid;
      if (s === 0 && !locked(x, ay + 1)) this.set(x, ay + 1, floor);   // 발판(2)이면 그대로 둔다
    }
    // ② t 자리 열에서 위아래를 잇는 두 칸 폭 수직굴.
    const plat = (x, y) => { if (!locked(x, y)) this.set(x, y, T.PLATFORM); };
    for (let y = yT - 2; y <= yB; y++) { bore(c, y); bore(c + 1, y); }
    for (let y = yB - 2; y > yT; y -= 3) { plat(c, y); plat(c + 1, y); }
    if (yB - yT >= 2) { plat(c, yT + 1); plat(c + 1, yT + 1); }
    if (TILE_DEF[this.get(c, yB + 1)].solid === 0 && !locked(c, yB + 1)) {
      this.set(c, yB + 1, floor); this.set(c + 1, yB + 1, floor);
    }
    /* ★ 이 계단에도 함정을 하나 심는다. */
    if (rng) this.putPathTrap(Math.round((ax + c) / 2), ay, rng);
  },

  /** spots 의 모든 자리를 서로 걸어 다닐 수 있게 만든다. */
  _ensureWalkable(x0, y0, w, h, spots, floor, traps, rng) {
    if (spots.length < 2) return;
    // 검사 범위는 유적 둘레 열두 칸.
    /* ★ 옆으로도 같다 — 입구 통로는 유적 옆 바깥 열(x0-5)에서 좌우로 서른여섯 칸까지 오르내리며 내려오므로, 통로의 방이 상자(유적 ±12) 밖에 놓일 수 있다. */
    const top = spots.reduce((m, p) => Math.min(m, p[1] - 3), y0 - 12);
    const left = spots.reduce((m, p) => Math.min(m, p[0] - 6), x0 - 12);
    const right = spots.reduce((m, p) => Math.max(m, p[0] + 6), x0 + w + 12);
    const box = [Math.max(2, left), Math.max(2, top),
                 Math.min(WW - 3, right), Math.min(WH - 3, y0 + h + 12)];
    /* 오르내림은 대칭이 아니다 — 떨어지는 것은 공짜지만 올라오는 데는 발판이 있어야 한다. */
    const d0 = p => Math.abs(p[0] - spots[0][0]) + Math.abs(p[1] - spots[0][1]);
    const far = spots.reduce((b, p) => (d0(p) > d0(b) ? p : b), spots[1]);
    for (const anchor of [spots[0], far]) this._walkPass(box, anchor, spots, floor, traps, rng);
    /* 가는 길과 오는 길을 번갈아 손본다. */
    this._walkBack(box, spots, floor, traps, rng);
    this._walkPass(box, spots[0], spots, floor, traps, rng);
    this._walkBack(box, spots, floor, traps, rng);
  },

  /** 자리마다 **기준점으로 돌아올 수 있는지** 하나씩 걸어 보고, 못 돌아오면 길을 낸다. */
  _walkBack(box, spots, floor, traps, rng) {
    const near = (set, tx, ty) => {
      let b = null, bd = 1e9;
      for (const k of set) {
        const y = Math.floor(k / WW), x = k - y * WW;
        const d = Math.abs(x - tx) + Math.abs(y - ty);
        if (d < bd) { bd = d; b = [x, y]; }
      }
      return b;
    };
    /* 되돌아올 수 있는지는 "기준점 칸을 밟는가"가 아니라 **기준점에서 걸어 닿는 무리와 한 칸이라도 겹치는가**로 본다. */
    let home = this._standSet(box, spots[0][0], spots[0][1]);
    let root = home.values().next().value;                    // 기준점에서 실제로 발을 딛는 칸
    if (root === undefined) return;
    const rx = root % WW, ry = Math.floor(root / WW);
    const f = this._standFns();
    let R = this._returnSet(box, root);                       // root 로 걸어 돌아올 수 있는 칸 (_returnSet 의 ★)
    /* ★ 여기서 "빠른 길"을 쓰면 안 된다. */
    for (let i = 1; i < spots.length; i++) {
      if (spots[i][2] === 0) continue;                        // 같은 방의 곁자리는 건너뛴다
      for (let k = 0; k < 4; k++) {                           // 한 번에 안 되면 몇 번 더 잇는다
        const s0 = this._standSeed(box, f, spots[i][0], spots[i][1]);
        if (!s0) break;                                       // 설 자리가 없다(예전 back.size === 0)
        if (R.has(s0[1] * WW + s0[0])) break;                 // 돌아올 수 있다(예전 back.has(root))
        const back = this._standSet(box, spots[i][0], spots[i][1]);
        /* 나오는 쪽에서 기준점에 가장 가까운 칸(a)과, **거기서 아직 못 가는** 쪽 칸(b)을 잇는다. */
        const a = near(back, rx, ry);
        let b = null, bd = 1e9;
        for (const kk of home) {
          if (back.has(kk)) continue;
          const y = Math.floor(kk / WW), x = kk - y * WW;
          const d = Math.abs(x - a[0]) + Math.abs(y - a[1]);
          if (d < bd) { bd = d; b = [x, y]; }
        }
        if (!a || !b) break;
        this._digStair(a[0], a[1], b[0], b[1], floor, box, traps, rng);
        home = this._standSet(box, spots[0][0], spots[0][1]);
        root = home.values().next().value;
        R = this._returnSet(box, root);                       // 판 굴로 길이 바뀌었다 — 다시 잰다
      }
    }
  },

  _walkPass(box, anchor, spots, floor, traps, rng) {
    // 넉넉하게 잡으면 "닿은 칸 옆"을 닿았다고 세어 버린다 — 바짝 붙여 본다
    const hit = (seen, p) => {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 2; dy++)
        if (seen.has((p[1] + dy) * WW + p[0] + dx)) return true;
      return false;
    };
    let guard = 0;
    const tried = new Map();                                  // 자리마다 틈 잇기를 몇 번 해 봤나
    while (guard++ < spots.length * 2 + 4) {                  // 한 번에 한 자리씩 잇는다
      const seen = this._standSet(box, anchor[0], anchor[1]);
      if (!seen.size) return;
      const lost = spots.filter(p => !hit(seen, p));
      if (!lost.length) return;
      const a = lost[0];
      /* 틈 잇기는 **한 자리에 여섯 번까지** 해 본다 — 사연: docs/code-history.md#h114 */
      const key = a[1] * WW + a[0];
      const once = (tried.get(key) || 0) < 6;
      tried.set(key, (tried.get(key) || 0) + 1);
      /* ★ 굴은 **두 무리 사이의 틈**에 판다 — 기준점에서 닿는 무리(seen)와, 잃은 자리에서 닿는 무리(from) 중 서로 가장 가까운 두 칸을 잇는다 — 사연:
         docs/code-history.md#h115 */
      const from = once ? this._standSet(box, a[0], a[1]) : new Set();
      let src = a, best = null, bd = 1e9;
      if (from.size) {
        const cols = new Map();                               // seen 을 열별로 묶어 가까운 열만 본다
        for (const k of seen) {
          const y = Math.floor(k / WW), x = k - y * WW;
          const c = cols.get(x); if (c) c.push(y); else cols.set(x, [y]);
        }
        /* 두 무리가 겹치는 칸은 뺀다 — 걸음은 한쪽으로만 흐를 수 있어서, 목에서 떨어져 닿는 칸은 맨 아래 방에서도 닿는다. */
        for (const k of from) {
          if (seen.has(k)) continue;
          const fy = Math.floor(k / WW), fx = k - fy * WW;
          for (let dx = 0; dx < bd; dx++) {
            for (const x of dx ? [fx - dx, fx + dx] : [fx]) {
              const c = cols.get(x); if (!c) continue;
              for (const y of c) {
                const d = dx + Math.abs(y - fy);
                if (d < bd) { bd = d; best = [x, y]; src = [fx, fy]; }
              }
            }
          }
        }
      }
      /* ★ 굴은 **실제로 닿는 칸**에서 시작해야 한다. */
      if (!best) {
        for (const k of seen) {
          const y = Math.floor(k / WW), x = k - y * WW;
          const d = Math.abs(x - a[0]) + Math.abs(y - a[1]);
          if (d < bd) { bd = d; best = [x, y]; }
        }
      }
      this._digStair(src[0], src[1], best[0], best[1], floor, box, traps, rng);
    }
  },
};
mixin(World.prototype, WorldDungeon, true);
