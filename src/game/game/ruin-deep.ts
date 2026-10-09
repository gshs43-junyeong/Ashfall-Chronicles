/* ===== game/ruin-deep.js — 유적의 깊은 곳 — 한 단계를 풀면 그 바닥이 열리고 없던 아래층이 파인다(2단계 · 3단계 …) ===== */
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { COLUMN_WALL, T, TILE_DEF } from '../data.js';
import { DEEP_LEVELS, PUZZLE } from '../data/ruins.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { Game } from '../game.js';
/* ★ 깊은 곳은 세계 생성이 아니라 **열리는 순간** 판다 — 미리 파 두면 둘레를 캐서 몰래 들어가고, 생성 난수 · 해시도 흔들린다.
   판 칸은 타일이라 저장되고, 단계마다 방 자리는 site.deep[] 에 남는다(ruinSites 는 세계와 같이 저장된다). 사연: docs/code-history.md#h172
   단계 L(0 = 2단계): L=0 은 봉인 방을 다 풀면, L≥1 은 바로 위 단계 홀의 봉인을 풀면 열린다. 몇 단계까지 있는지는 DEEP_LEVELS. */

const HALL_W = 24, HALL_H = 8, WING_W = 10, WING_H = 6;
/* 자리 판 — 곁방 둘이 붙은 것부터, 안 되면 홀만, 그래도 안 되면 좁은 홀 */
const LAYOUTS = [{ hw: HALL_W, wings: true }, { hw: HALL_W, wings: false }, { hw: 18, wings: false }];

export const RuinDeepPart: Bag = {

  deepLevels(site: Bag): Bag[] { return Array.isArray(site.deep) ? site.deep : []; },
  deepMax(site: Bag) { return PUZZLE[site.id] ? (DEEP_LEVELS[site.id] || 1) : 0; },

  /** L 단계 문 자리 — 2단계는 가장 깊은 방 바닥 가운데(봉인 방은 뺀다), 그 아래는 위 단계 홀 바닥 오른쪽(사다리 줄을 비켜) */
  deepGate(site: Bag, L = 0) {
    if (L > 0) {
      const up = this.deepLevels(site)[L - 1]; if (!up) return null;
      return { x: up.hall.x + up.hall.w - 5, fy: up.hall.y + up.hall.h };
    }
    if (site._gate !== undefined) return site._gate;
    const w = this.world, puz = new Set(this.puzzleRooms(site));
    let best: Bag | null = null;
    site.rooms.forEach((r: Bag, i: number) => { if (!puz.has(i) && r.w >= 8 && (!best || r.y + r.h > best.y + best.h)) best = r; });
    let gate = null;
    if (best) {
      const r: Bag = best, gx = r.x + (r.w >> 1);
      for (let y = r.y + 2; y < r.y + r.h + 1; y++)
        if (TILE_DEF[w.get(gx, y)].solid === 1 && TILE_DEF[w.get(gx, y - 1)].solid !== 1 && TILE_DEF[w.get(gx, y - 2)].solid !== 1) gate = { x: gx, fy: y };
    }
    Object.defineProperty(site, '_gate', { value: gate, enumerable: false, writable: true });   // 저장에 안 섞이게
    return gate;
  },
  /** L 단계를 열 때가 됐나 */
  deepReady(site: Bag, L = 0) {
    if (L >= this.deepMax(site)) return false;
    const sv = this.surveyOf(site.id);
    if (L > 0) return (sv.deepDone || 0) >= L;
    const rooms = this.puzzleRooms(site), done = sv.puz || {};
    return rooms.length > 0 && rooms.every((i: number) => done[i]);
  },

  /** 팔 자리 — 문 아래로 굴(3칸) → 홀 (+ 양옆 곁방). 물 · 기반암 · 봉인 · 다른 유적 · 위 단계 · 물건 · 기계가 걸리면 다른 깊이 · 옆 · 작은 판 */
  deepPlan(site: Bag, gate: Bag, L: number) {
    const w = this.world, { WW, WH } = w.dims, sb = site.y + (site.h >> 1);
    const objs = w.objects.map((o: Bag) => [Math.floor(o.x / TS), Math.floor(o.y / TS)]);
    const other = (w.ruinSites || []).filter((s: Bag) => s !== site);
    const mine = this.deepLevels(site).flatMap((d: Bag) => [d.hall, d.left, d.right].filter(Boolean));
    const ok = (x: number, y: number) => {
      if (x < 2 || x >= WW - 2 || y < 2 || y >= WH - 4) return false;
      const t = w.get(x, y), d = TILE_DEF[t];
      if (t === T.BEDROCK || d.liquid || (w.locked && w.locked(x, y)) || w.machines.has(y * WW + x)) return false;
      return true;
    };
    const base = L === 0 ? Math.max(gate.fy + 5, sb + 3) : gate.fy + 5;
    for (const lay of LAYOUTS) for (let depth = 0; depth <= 18; depth += 3) for (const off of [0, -5, 5, -9, 9]) {
      const hw = lay.hw, hy = base + depth, hx = gate.x - (hw >> 1) + off;
      if (gate.x < hx + 2 || gate.x > hx + hw - 3) continue;
      const ww = lay.wings ? WING_W + 1 : 0;
      const x0 = hx - ww - 1, x1 = hx + hw + ww, y0 = hy - 1, y1 = hy + HALL_H;
      let good = true;
      for (let y = y0 - 1; good && y <= y1 + 1; y++) for (let x = x0 - 1; good && x <= x1 + 1; x++) if (!ok(x, y)) good = false;
      for (let y = gate.fy + 1; good && y < hy; y++) for (let x = gate.x - 2; x <= gate.x + 2; x++) if (!ok(x, y)) { good = false; break; }
      if (!good) continue;
      if (objs.some(([ox, oy]: number[]) => ox >= x0 - 1 && ox <= x1 + 1 && oy >= y0 - 1 && oy <= y1 + 1)) continue;
      if (other.some((s: Bag) => x1 >= s.x - (s.w >> 1) - 2 && x0 <= s.x + (s.w >> 1) + 2 && y1 >= s.y - (s.h >> 1) - 2 && y0 <= s.y + (s.h >> 1) + 2)) continue;
      if (mine.some((r: Bag) => x1 >= r.x - 2 && x0 <= r.x + r.w + 1 && y1 >= r.y - 2 && y0 <= r.y + r.h + 1)) continue;
      const hall = { x: hx, y: hy, w: hw, h: HALL_H };
      return { gx: gate.x, top: gate.fy, hall,
               left: lay.wings ? { x: hx - WING_W - 1, y: hy + HALL_H - WING_H, w: WING_W, h: WING_H } : null,
               right: lay.wings ? { x: hx + hw + 1, y: hy + HALL_H - WING_H, w: WING_W, h: WING_H } : null };
    }
    return null;
  },

  /** 다음 단계를 연다 — 문 둘레가 흔들리고 바닥이 내려앉으며 아래층이 파인다(호스트 · 혼자). 판 칸은 world.set 으로(빛 · 지도 · 물 · 여럿이) */
  deepOpen(site: Bag) {
    if (this.net && this.net.role === 'guest') return false;
    const levels = this.deepLevels(site), L = levels.length;
    if (!this.deepReady(site, L)) return false;
    const fail = this._deepFail || (this._deepFail = {});
    if (fail[site.id + L]) return false;
    const gate = this.deepGate(site, L), plan = gate && this.deepPlan(site, gate, L);
    if (!plan) { fail[site.id + L] = 1; return false; }
    const w = this.world, spec = this.ruinSpec(site.id) || {}, RS = this.ruinSpecRaw(site.id);
    const wall = RS.wall || T.RUINBRICK, floor = RS.floor || T.RUINTILE, bg = RS.bg || 10, torch = RS.torch || T.TORCH;
    const rooms = [plan.hall, plan.left, plan.right].filter(Boolean);
    const inside = (x: number, y: number) => rooms.some((r: Bag) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    for (const r of rooms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { w.set(x, y, T.AIR); w.setWall(x, y, bg); }
      else if (!inside(x, y)) w.set(x, y, y === r.y + r.h ? floor : wall);
    }
    for (const [r, dx] of [[plan.left, plan.hall.x - 1], [plan.right, plan.hall.x + plan.hall.w]] as [Bag | null, number][])
      if (r) for (let k = 1; k <= 3; k++) { w.set(dx, r.y + r.h - k, T.AIR); w.setWall(dx, r.y + r.h - k, bg); }   // 곁방 문 3칸
    /* 굴 — 문 바닥 3칸은 발판, 가운데 줄은 발판 사다리(오르내림), 양옆은 벽 */
    for (let y = plan.top; y < plan.hall.y; y++) {
      for (let x = plan.gx - 1; x <= plan.gx + 1; x++) { w.set(x, y, y === plan.top || x === plan.gx ? T.PLATFORM : T.AIR); w.setWall(x, y, bg); }
      for (const x of [plan.gx - 2, plan.gx + 2]) if (y > plan.top && TILE_DEF[w.get(x, y)].solid !== 1) w.set(x, y, wall);
    }
    for (let y = plan.hall.y; y < plan.hall.y + plan.hall.h - 1; y++) w.set(plan.gx, y, T.PLATFORM);
    /* 홀 — 기둥 벽지 · 횃불 · 상자(곁방이 없으면 홀 양끝) */
    const H = plan.hall, fy = H.y + H.h;
    for (let x = H.x + 3; x < H.x + H.w - 2; x += 6) for (let y = H.y; y < H.y + H.h; y++) if (Math.abs(x - plan.gx) > 1) w.setWall(x, y, COLUMN_WALL);
    for (const r of rooms) for (const x of [r.x, r.x + r.w - 1]) if (w.get(x, fy - 4) === T.AIR) w.set(x, fy - 4, torch);
    const a = plan.left || H, b = plan.right || H;
    this.evChest(a.x + 2, fy, 1 + L, spec);
    this.evChest(b.x + b.w - 3, fy, 1 + L, spec);
    levels.push({ gx: plan.gx, top: plan.top, hall: H, left: plan.left, right: plan.right });
    site.deep = levels;
    /* 지킴이 — 곁방(없으면 홀)마다 그 유적 고유 몬스터 둘, 단계마다 더 세다 */
    const pool = spec.mobs || [];
    if (pool.length) for (const r of plan.left ? [plan.left, plan.right] : [H]) for (let i = 0; i < 2; i++)
      this.evMob(pool[pool.length - 1], [r.x + 3 + i * 4, fy - 1], 1.5 + 0.5 * L);
    /* 열리는 순간 */
    this.shake = Math.max(this.shake, 14);
    this.sfx('chapter');
    for (let q = 0; q < 50; q++) this.parts.push(new Part(plan.gx * TS + TS / 2 + (Math.random() - 0.5) * 60, plan.top * TS, '#b8a8ff', -80, 1.1));
    this.stageFx && this.stageFx('s_quake');
    this.toast(tr('깊은 곳 {L}단계가 열렸다 — {n}', { L: L + 2, n: spec.n || '' }), 'good');
    this.checkSurvey(site.id);
    return true;
  },
  /** 유적 표의 원래 항목(벽 · 바닥 · 벽지 · 횃불) — 석판 유적은 그 유적 바닥에서 가장 흔한 것 */
  ruinSpecRaw(id: string) {
    const site = this.evSite(id), w = this.world;
    const spec = this.ruinSpec(id) || {};
    if (spec.wall) return spec;
    const cnt: Record<number, number> = {};
    if (site) for (const r of site.rooms) for (let x = r.x; x < r.x + r.w; x++) { const t = w.get(x, r.y + r.h); if (TILE_DEF[t].solid === 1) cnt[t] = (cnt[t] || 0) + 1; }
    const top = Object.keys(cnt).sort((a, b) => cnt[+b] - cnt[+a])[0];
    return { wall: top ? +top : T.RUINBRICK, floor: top ? +top : T.RUINTILE, bg: 10, torch: T.TORCH };
  },

  /** L 단계 홀의 봉인 — 그 유적 퍼즐을 단계만큼 어렵게 */
  deepPuzzleSpec(id: string, L = 0) {
    const P = PUZZLE[id]; if (!P) return null;
    const H = Object.assign({}, P), k = L + 1;
    if (P.k === 'toggle' || P.k === 'bloom' || P.k === 'dial') H.cnt = P.cnt + k;
    if (P.k === 'simon') { H.cnt = P.cnt + k; H.len = P.len + 2 * k; }
    if (P.k === 'mirror') H.cols = P.cols + k;
    return H;
  },

  /** 세계 위 — 아직 닫힌 다음 단계 문(바닥에 새긴 봉인 · 몇 개 풀었나) */
  drawDeepGates(c: CanvasRenderingContext2D) {
    const p = this.me; if (!p || !this.world) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, t = this.time || 0;
    for (const site of this.world.ruinSites || []) {
      const L = this.deepLevels(site).length;
      if (L >= this.deepMax(site)) continue;
      const g = this.deepGate(site, L); if (!g) continue;
      const x = (g.x + 0.5) * TS - cx0, y = g.fy * TS - cy0;
      if (x < -80 || x > this.W + 80 || y < -80 || y > this.H + 80) continue;
      const sv = this.surveyOf(site.id), rooms = this.puzzleRooms(site), done = sv.puz || {};
      const m = L ? 1 : rooms.length, n = L ? Math.min(1, (sv.deepDone || 0) - L + 1) : rooms.filter((i: number) => done[i]).length;
      c.save();
      c.globalAlpha = 0.55 + 0.25 * Math.sin(t * 2);
      c.strokeStyle = '#b8a8ff'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(x, y - 1, 28, 6, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < m; i++) {                             // 열쇠 하나마다 등잔 하나 — 푼 만큼 켜진다
        const a = Math.PI + (i + 1) / (m + 1) * Math.PI, lx = x + Math.cos(a) * 28, ly = y - 1 + Math.sin(a) * 6 - 6;
        c.fillStyle = i < n ? '#e8dcff' : '#3a3050'; c.beginPath(); c.arc(lx, ly, 3.5, 0, Math.PI * 2); c.fill();
      }
      if (Math.abs(p.cx - (g.x + 0.5) * TS) < TS * 6 && Math.abs(p.y + p.h - g.fy * TS) < TS * 4) {
        c.globalAlpha = 0.9; c.fillStyle = '#e8dcff'; c.font = '11px ' + FONT; c.textAlign = 'center';
        c.fillText(L ? tr('더 깊은 봉인 — 이 홀의 봉인을 풀면 {L}단계가 열린다', { L: L + 2 })
                     : tr('깊은 봉인 {n}/{m} — 봉인 방을 모두 풀면 열린다', { n, m }), x, y - 22);
      }
      c.restore();
    }
  },
};

mixin(Game.prototype, RuinDeepPart, true);
