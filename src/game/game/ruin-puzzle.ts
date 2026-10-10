/* ===== game/ruin-puzzle.js — 봉인 방 — 들어서면 출입구가 봉인석으로 막히고 유적마다 제 퍼즐을 풀어야 열린다 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { T, TILE_DEF } from '../data.js';
import { PUZZLE, PUZZLE_GIVEUP } from '../data/ruins.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* 갈래: toggle(건드리면 정해진 짝이 같이 뒤집힌다) · dial(눈금 맞추기 — 오른쪽 바퀴도 돈다) · simon(차례 외우기) ·
   mirror(거울로 빛줄기 잇기) · bloom(열렸을 때만 건드리기). 판정은 호스트(혼자면 나) — 참가자는 그림만 받고 누른 것을 보낸다. */

/** 씨앗 없는 해시 — 방 고르기와 퍼즐 섞기가 세계마다 같도록(난수를 뽑지 않는다) */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const lcg = (seed: number) => { let s = seed || 1; return () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296); };
const BAR = new Set(['tablet', 'codedoor', 'lair', 'mystic']);

/** mirror 갈래 — 아래 줄 왼쪽에서 오른쪽으로 들어온 빛이 나가는 자리('u3' 위로 셋째 칸 · 'r1' 오른쪽 둘째 줄 …) */
export function beamExit(st: number[], cols: number): { out: string; path: number[][] } {
  let c = 0, r = 0, dx = 1, dy = 0; const path: number[][] = [[-1, 0]];
  for (let g = 0; g < 32; g++) {
    if (c < 0) return { out: 'l' + r, path }; if (c >= cols) return { out: 'r' + r, path };
    if (r < 0) return { out: 'd' + c, path }; if (r > 1) return { out: 'u' + c, path };
    path.push([c, r]);
    const m = st[r * cols + c];
    if (m === 0) [dx, dy] = [dy, dx];               // '/' — 오른쪽 → 위 · 위 → 오른쪽
    else if (m === 1) [dx, dy] = [-dy, -dx];        // '\' — 오른쪽 → 아래 · 아래 → 오른쪽
    c += dx; r += dy;
  }
  return { out: '?', path };
}

export const RuinPuzzlePart: Bag = {

  /** 그 유적의 봉인 방(방 번호) — 보스 홀 · 석판 · 비밀 문 · 신비한 방 · 문이 걸린 방 · 출입구가 너무 많은 방은 뺀다 */
  puzzleRooms(site: Bag) {
    const C = this._puzRooms || (this._puzRooms = {});
    if (C[site.id]) return C[site.id];
    const P = PUZZLE[site.id], w = this.world;
    if (!P) return (C[site.id] = []);
    const cand: { i: number; h: number }[] = [];
    site.rooms.forEach((r: Bag, i: number) => {
      if (i === 0 || r.w < 10 || r.h < 8) return;
      for (const o of w.objects) {
        const ox = o.x / TS, oy = o.y / TS;
        if (ox >= r.x - 1 && ox <= r.x + r.w && oy >= r.y - 1 && oy <= r.y + r.h && (BAR.has(o.type) || o.type === 'door')) return;
      }
      const seal = this.puzzleSealCells(r);
      if (!seal || seal.length < 2 || seal.length > 14 || !this.puzzleNodes(r, P)) return;
      cand.push({ i, h: hash(w.seed + ':' + site.id + ':' + i) });
    });
    cand.sort((a, b) => a.h - b.h);
    return (C[site.id] = cand.slice(0, P.rooms).map(q => q.i).sort((a, b) => a - b));
  },
  /** 방 번호 → 방(깊은 곳 홀은 'deep') */
  puzRoom(site: Bag, ri: any) {
    if (typeof ri === 'string' && ri.startsWith('deep')) { const d = this.deepLevels(site)[+ri.slice(4)]; return d && d.hall; }
    return site.rooms[ri];
  },
  /** 막을 칸 — 방 둘레 바로 바깥 줄에서 트인 칸 가운데 방 안의 트인 칸과 맞닿은 것(옆방 홀을 가로지르지 않게) */
  puzzleSealCells(r: Bag) {
    const w = this.world, open = (x: number, y: number) => TILE_DEF[w.get(x, y)].solid !== 1;
    const out: number[][] = [];
    const ring: number[][] = [];
    for (let x = r.x - 1; x <= r.x + r.w; x++) ring.push([x, r.y - 1, x, r.y], [x, r.y + r.h, x, r.y + r.h - 1]);
    for (let y = r.y; y < r.y + r.h; y++) ring.push([r.x - 1, y, r.x, y], [r.x + r.w, y, r.x + r.w - 1, y]);
    for (const [x, y, ix, iy] of ring) {
      if (!open(x, y)) continue;
      if (w.get(x, y) === T.BEDROCK) continue;
      if (open(ix, iy)) out.push([x, y]);
    }
    return out;
  },

  /** 매 프레임 — 들어선 봉인 방을 닫고, 퍼즐을 굴린다(호스트 · 혼자). 참가자는 받은 상태로 그림만 */
  updatePuzzle(dt: number) {
    const guest = !!(this.net && this.net.role === 'guest');
    const pz = this.puzzle;
    if (pz) {
      if (pz.flash > 0) pz.flash -= dt;
      if (guest) return;
      this.puzzleTick(pz, dt);
      return;
    }
    this._doffT = (this._doffT || 0) - dt;
    if (this._doffT <= 0) { this._doffT = 0.3; this.deepOfferTick(); }   // 바치기 — 참가자도 제 가방에서
    if (guest || this.pulseEvent || this.boss) return;
    this._pzT = (this._pzT || 0) - dt; if (this._pzT > 0) return;
    this._pzT = 0.25;
    for (const q of this.players) {
      if (q.dead || q.hp <= 0) continue;
      const tx = q.cx / TS, ty = q.cy / TS;
      for (const site of this.world.ruinSites || []) {
        const lv = this.deepLevels(site), bot = Math.max(site.y + site.h, ...lv.map((d: Bag) => d.hall.y + d.hall.h + 2));   // 깊은 곳 홀까지
        if (tx < site.x - site.w || tx > site.x + site.w || ty < site.y - site.h || ty > bot) continue;
        const sv = this.surveyOf(site.id), done = sv.puz || {};
        for (const i of this.puzzleRooms(site)) {
          const r = site.rooms[i], key = site.id + ':' + i;
          const inside = tx > r.x + 2 && tx < r.x + r.w - 2 && ty > r.y + 1.5 && ty < r.y + r.h - 1;
          const cool = this._pzLeft || (this._pzLeft = {});
          if (!inside) { cool[key] = 1; continue; }        // 한 번 나갔다 들어와야 다시 닫힌다
          if (done[i] || cool[key] === 0) continue;       // 0 — 이번에 닫혔던 방(나갔다 와야 다시)
          if (this.puzzleBegin(site, i)) { cool[key] = 0; return; }
        }
        /* 다음 단계를 열 때가 됐으면(여럿이 · 예전 기록) 연다 · 열린 단계 홀은 그 단계의 봉인 */
        const levels = this.deepLevels(site);
        if (this.deepReady(site, levels.length) && this.deepOpen(site)) return;
        for (let L = 0; L < levels.length; L++) {
          const H = levels[L].hall; if ((sv.deepDone || 0) > L) continue;
          const key = site.id + ':deep' + L, cool = this._pzLeft || (this._pzLeft = {});
          const inside = tx > H.x + 1 && tx < H.x + H.w - 1 && ty > H.y + 1 && ty < H.y + H.h;
          if (!inside) cool[key] = 1;
          else if (cool[key] !== 0 && this.puzzleBegin(site, 'deep' + L)) { cool[key] = 0; return; }
        }
      }
    }
  },

  /** 닫는다 — 막을 칸에 몸이 걸린 플레이어가 있으면 다음에 */
  puzzleBegin(site: Bag, ri: any) {
    const deep = typeof ri === 'string' && ri.startsWith('deep'), L = deep ? +ri.slice(4) : -1;
    const P = deep ? this.deepPuzzleSpec(site.id, L) : PUZZLE[site.id], r = this.puzRoom(site, ri), w = this.world;
    if (!P || !r) return false;
    const cells = this.puzzleSealCells(r);
    for (const q of this.players) for (const [x, y] of cells)
      if (q.x < (x + 1) * TS && q.x + q.w > x * TS && q.y < (y + 1) * TS && q.y + q.h > y * TS) return false;
    const nodes = this.puzzleNodes(r, P);
    if (!nodes) return false;
    const rnd = lcg(hash(w.seed + ':pz:' + site.id + ':' + ri + ':' + ((this.surveyOf(site.id).pzTry || 0))));
    const pz: Bag = { id: site.id, ri, deep, L, k: P.k, skin: P.skin, c: P.c, n: P.n, nodes, t: 0, flash: 1, seal: [], step: 0, show: 0 };
    this.puzzleSetup(pz, P, rnd);
    for (const [x, y] of cells) { pz.seal.push([x, y, w.get(x, y)]); w.set(x, y, T.SEALSTONE); }
    this.puzzle = pz;
    const sv = this.surveyOf(site.id); sv.pzTry = (sv.pzTry || 0) + 1;
    this.toast(tr('봉인 방 — {n}. {hint} · 장치는 우클릭', { n: P.n, hint: P.hint }), 'bad');
    this.sfx('chapter'); this.shake = Math.max(this.shake, 8);
    for (const [x, y] of cells) for (let q = 0; q < 4; q++) this.parts.push(new Part(x * TS + TS / 2, y * TS + TS / 2, '#b8a8ff', -30, .7));
    /* 조여 오는 것 — 그 유적 고유 몬스터 둘(석판 유적은 그 유적 몹) */
    const spec = this.ruinSpec(site.id), pool = (spec && spec.mobs) || [];
    pz.mobs = [];
    if (pool.length) for (const side of [0, 1]) {
      const n = nodes[side ? nodes.length - 1 : 0];
      pz.mobs.push(this.evMob(pool[pool.length - 1], [Math.floor(n.x / TS) + (side ? 1 : -1), Math.floor(n.fy / TS) - 1]));
    }
    this.puzzleSync();
    return true;
  },
  /** 장치 자리 — 방 바닥(가운데 줄에서 아래로 처음 막힌 칸 위)을 고르게 나눈다 */
  puzzleNodes(r: Bag, P: Bag) {
    const w = this.world, cnt = P.k === 'mirror' ? P.cols : P.cnt;
    const x0 = r.x + 2, x1 = r.x + r.w - 3, nodes: Bag[] = [];
    const floor = (tx: number) => {
      let fy = -1;
      for (let y = r.y + 2; y < r.y + r.h + 1; y++) if (TILE_DEF[w.get(tx, y)].solid === 1 && TILE_DEF[w.get(tx, y - 1)].solid !== 1 && TILE_DEF[w.get(tx, y - 2)].solid !== 1) { fy = y; if (y > r.y + r.h / 2) break; }
      return fy;
    };
    for (let i = 0; i < cnt; i++) {
      let tx = Math.round(x0 + (x1 - x0) * (cnt === 1 ? 0.5 : i / (cnt - 1))), fy = floor(tx);
      for (let d = 1; fy < 0 && d <= 2; d++) for (const s of [tx - d, tx + d]) if (fy < 0 && s > r.x && s < r.x + r.w - 1 && floor(s) >= 0) { tx = s; fy = floor(s); }
      if (fy < 0) return null;
      nodes.push({ x: tx * TS + TS / 2, y: fy * TS - TS * 1.4, fy: fy * TS, s: 0 });
    }
    if (P.k === 'mirror') {                              // 거울은 두 줄 — 윗줄은 아랫줄 넷 칸 위에 떠 있다
      const base = Math.min(...nodes.map(n => n.y));
      for (const n of nodes) n.y = base;
      for (let i = 0; i < cnt; i++) nodes.push({ x: nodes[i].x, y: base - TS * 4, fy: nodes[i].fy, s: 0 });
    }
    return nodes;
  },
  /** 처음 모양 — 풀린 모양에서 거꾸로 섞어 늘 풀 수 있게 한다 */
  puzzleSetup(pz: Bag, P: Bag, rnd: () => number) {
    const N = pz.nodes, n = N.length;
    if (pz.k === 'toggle') {
      pz.rule = P.rule;
      for (const v of N) v.s = 1;
      do { for (let g = 0; g < 3 + (rnd() * 3 | 0); g++) this.puzzlePress(pz, rnd() * n | 0, true); } while (N.every((v: Bag) => v.s === 1));
    } else if (pz.k === 'dial') {
      pz.m = P.m; pz.rule = P.rule;
      const back = pz.rule === 'mesh' ? 1 : P.m - 1;      // 맞물린 톱니는 오른쪽이 거꾸로 돈다
      for (const v of N) v.s = v.tgt = rnd() * P.m | 0;
      do {
        for (let g = 0; g < 3 + (rnd() * 3 | 0); g++) { const i = rnd() * n | 0; N[i].s = (N[i].s + P.m - 1) % P.m; if (i + 1 < n) N[i + 1].s = (N[i + 1].s + back) % P.m; }
      } while (N.every((v: Bag) => v.s === v.tgt));
    } else if (pz.k === 'simon') {
      pz.seq = []; for (let i = 0; i < P.len; i++) pz.seq.push(rnd() * n | 0);
      this.puzzleShow(pz);
    } else if (pz.k === 'mirror') {
      pz.cols = P.cols;
      const sol = N.map(() => rnd() * 3 | 0);
      let out = beamExit(sol, P.cols).out, g = 0, g2 = 0;
      while ((out === 'l0' || out === '?') && g++ < 40) { sol[rnd() * n | 0] = rnd() * 3 | 0; out = beamExit(sol, P.cols).out; }
      pz.tgt = out;
      for (const v of N) v.s = rnd() * 3 | 0;
      while (beamExit(N.map((v: Bag) => v.s), P.cols).out === out && g2++ < 80) N[rnd() * n | 0].s = rnd() * 3 | 0;
    } else if (pz.k === 'bloom') {
      pz.rule = P.rule;
      for (const v of N) { v.per = 2.4 + rnd() * 1.4; v.ph = rnd(); v.s = 0; }
    }
  },
  /** 누르기 — 갈래마다 하는 일(quiet: 섞을 때) */
  puzzlePress(pz: Bag, i: number, quiet?: boolean) {
    const N = pz.nodes, n = N.length, flip = (j: number) => { if (j >= 0 && j < n) N[j].s ^= 1; };
    if (pz.k === 'toggle') {
      if (pz.rule === 'adj') { flip(i - 1); flip(i); flip(i + 1); }
      else { flip(i); if (n - 1 - i !== i) flip(n - 1 - i); flip(i + 1 < n ? i + 1 : 0); }
    } else if (pz.k === 'dial') {
      N[i].s = (N[i].s + 1) % pz.m; if (i + 1 < n) N[i + 1].s = (N[i + 1].s + (pz.rule === 'mesh' ? pz.m - 1 : 1)) % pz.m;
    } else if (pz.k === 'mirror') {
      N[i].s = (N[i].s + 1) % 3;
    } else if (pz.k === 'simon') {
      if (pz.show > 0) return;
      if (pz.seq[pz.step] === i) pz.step++;
      else { this.puzzleShow(pz); this.puzzleMistake(pz); }
    } else if (pz.k === 'bloom') {
      if (N[i].s) return;
      if (this.puzzleOpen(N[i], pz.t) !== (pz.rule === 'shut')) N[i].s = 1;   // 감기는 눈은 감겼을 때만
      else { for (const v of N) v.s = 0; this.puzzleMistake(pz); }
    }
    if (quiet) return;
    N[i].hit = 0.35;
    this.sfx('coin');
    for (let q = 0; q < 8; q++) this.parts.push(new Part(N[i].x, N[i].y, pz.c, -40, .5));
  },
  /** simon — 처음부터 다시 보여 준다(숨 돌릴 1초 + 0.65초마다 하나) */
  puzzleShow(pz: Bag) { pz.step = 0; pz.show = pz.showMax = 1 + pz.seq.length * 0.65; pz.shown = -1; },
  puzzleOpen(v: Bag, t: number) { return ((t / v.per + v.ph) % 1) < 0.38; },
  /** 틀렸다 — 몹 하나 더(살아 있는 것이 넷 아래일 때) · 포자 갈래는 포자가 터진다 */
  puzzleMistake(pz: Bag) {
    this.sfx('mine'); this.shake = Math.max(this.shake, 5);
    const spec = this.ruinSpec(pz.id), pool = (spec && spec.mobs) || [];
    pz.mobs = (pz.mobs || []).filter((e: any) => !e.dead);
    if (pool.length && pz.mobs.length < 4) {
      const n = pz.nodes[Math.random() * pz.nodes.length | 0];
      pz.mobs.push(this.evMob(pool[Math.random() * pool.length | 0], [Math.floor(n.x / TS), Math.floor(n.fy / TS) - 1]));
    }
    if (pz.k === 'bloom') this.ruinSpore = Math.max(this.ruinSpore || 0, 3);
  },
  puzzleSolved(pz: Bag) {
    const N = pz.nodes;
    if (pz.k === 'toggle') return N.every((v: Bag) => v.s === 1);
    if (pz.k === 'dial') return N.every((v: Bag) => v.s === v.tgt);
    if (pz.k === 'simon') return pz.step >= pz.seq.length;
    if (pz.k === 'mirror') return beamExit(N.map((v: Bag) => v.s), pz.cols).out === pz.tgt;
    if (pz.k === 'bloom') return N.every((v: Bag) => v.s === 1);
    return false;
  },

  puzzleTick(pz: Bag, dt: number) {
    pz.t += dt;
    for (const v of pz.nodes) if (v.hit > 0) v.hit -= dt;
    if (pz.k === 'simon' && pz.show > 0) {              // 보여 주기 — 숨 돌릴 1초 뒤 0.65초마다 하나씩 빛난다
      pz.show = Math.max(0, pz.show - dt);
      const i = Math.floor((pz.showMax - pz.show - 1) / 0.65);
      if (i !== pz.shown && i >= 0 && i < pz.seq.length) { pz.shown = i; pz.nodes[pz.seq[i]].hit = 0.5; this.sfx('coin'); this.puzzleSync(); }
    }
    const away = this.players.every((q: any) => {
      const site = this.evSite(pz.id), r = site && this.puzRoom(site, pz.ri);
      return !r || q.dead || Math.abs(q.cx / TS - (r.x + r.w / 2)) > r.w || Math.abs(q.cy / TS - (r.y + r.h / 2)) > r.h;
    });
    if (away) { this.puzzleEnd(false, true); return; }    // 순간이동 따위로 빠져나갔다 — 조용히 연다
    if (this.puzzleSolved(pz)) { this.puzzleEnd(true); return; }
    if (pz.t > PUZZLE_GIVEUP) { this.puzzleEnd(false); return; }
    this._pzSync = (this._pzSync || 0) - dt;
    if (this._pzSync <= 0) { this._pzSync = 0.5; this.puzzleSync(); }
  },

  /** 우클릭 — 커서 밑 장치를 누른다(손 닿는 거리 안). 참가자는 호스트에게 보낸다 */
  puzzleClick(wx: number, wy: number) {
    const pz = this.puzzle; if (!pz) return false;
    const p = this.me;
    let best = -1, bd = 30;
    pz.nodes.forEach((v: Bag, i: number) => { const d = Math.hypot(v.x - wx, v.y - wy); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return false;
    const v = pz.nodes[best];
    if (Math.hypot(v.x - p.cx, v.y - p.cy) > TS * 7) { this.toast(tr('너무 멀다')); return true; }
    if (this.net && this.net.role === 'guest') { this.netBroadcast({ k: 'puzc', i: best }); v.hit = 0.35; return true; }
    this.puzzlePress(pz, best);
    this.puzzleSync();
    return true;
  },

  /** 끝 — 봉인을 거두고(놓기 전 칸으로), 풀었으면 상 */
  puzzleEnd(ok: boolean, quiet?: boolean) {
    const pz = this.puzzle; if (!pz) return;
    this.puzzle = null;
    const w = this.world;
    for (const [x, y, t] of pz.seal) if (w.get(x, y) === T.SEALSTONE) w.set(x, y, t);
    for (const [x, y] of pz.seal) for (let q = 0; q < 5; q++) this.parts.push(new Part(x * TS + TS / 2, y * TS + TS / 2, '#b8a8ff', -60, .8));
    this.puzzleSync(ok ? 'ok' : 'fail');
    if (quiet) return;
    if (!ok) { this.toast(tr('봉인이 지쳐 풀렸다 — {n}', { n: pz.n }), 'bad'); return; }
    const sv = this.surveyOf(pz.id);
    if (pz.deep) sv.deepDone = Math.max(sv.deepDone || 0, pz.L + 1); else (sv.puz = sv.puz || {})[pz.ri] = 1;
    this.puzzleReward(pz);
    const site = this.evSite(pz.id), r = site && this.puzRoom(site, pz.ri);
    if (r) {
      const mid = pz.nodes[pz.nodes.length >> 1];
      this.evChest(Math.floor(mid.x / TS), Math.floor(mid.fy / TS), pz.deep ? 2 + pz.L : 0, this.ruinSpec(pz.id) || {});
    }
    this.checkSurvey(pz.id);
    /* 마지막 봉인 방 · 단계 홀 — 그 아래 단계가 있으면 바닥이 열린다 */
    if (site && this.deepReady(site, this.deepLevels(site).length)) this.after(1.4, () => this.deepOpen(site));
  },
  /** 상 — 금화 · 경험치(레벨 곡선을 따른다). 참가자는 'ok' 를 받고 제 몫을 스스로 받는다 */
  puzzleReward(pz: Bag) {
    const p = this.me, spec = this.ruinSpec(pz.id), rank = (spec && spec.rank) || 3;
    const gold = 90 * rank * (pz.deep ? 3 + pz.L : 1);
    p.gold += gold;
    p.addXp(Math.round(p.xpNext * (pz.deep ? 0.3 + 0.15 * pz.L : 0.12)));
    if (pz.deep) this.evGive('pulse_shard', 2 + pz.L);
    this.toast(tr('봉인 방 — {n} 풀었다 · 금화 {gold}', { n: pz.n, gold: fmt(gold) }), 'good');
    this.sfx('chapter');
    this.stageFx && this.stageFx('s_warcry');
    UI.refreshBag();
  },

  /* ---- 여럿이 — 호스트가 상태를 보내고 참가자는 누른 것을 보낸다 ---- */
  puzzleSync(end?: string) {
    if (!this.net || this.net.role === 'guest') return;
    const pz = this.puzzle;
    if (end) { this.netBroadcast({ k: 'puz', end }); return; }
    if (!pz) return;
    this.netBroadcast({ k: 'puz', s: { id: pz.id, ri: pz.ri, deep: pz.deep, L: pz.L, k: pz.k, skin: pz.skin, c: pz.c, n: pz.n, t: pz.t, step: pz.step, show: pz.show,
      tgt: pz.tgt, cols: pz.cols, m: pz.m, seq: pz.k === 'simon' ? pz.seq : undefined,
      nodes: pz.nodes.map((v: Bag) => ({ x: v.x, y: v.y, fy: v.fy, s: v.s, tgt: v.tgt, per: v.per, ph: v.ph, hit: v.hit || 0 })) } });
  },
  /** 참가자 — 호스트가 보낸 상태 */
  netPuzzle(m: Bag) {
    if (m.end) {
      if (m.end === 'ok' && this.puzzle) this.puzzleReward(this.puzzle);
      this.puzzle = null; return;
    }
    const fresh = !this.puzzle;
    this.puzzle = Object.assign(this.puzzle || { flash: 1 }, m.s);
    if (fresh) { const P = PUZZLE[m.s.id]; if (P) this.toast(tr('봉인 방 — {n}. {hint} · 장치는 우클릭', { n: P.n, hint: P.hint }), 'bad'); }
  },
  /** 호스트 — 참가자가 누른 장치 */
  netPuzzleClick(m: Bag) {
    const pz = this.puzzle; if (!pz || !(m.i >= 0 && m.i < pz.nodes.length)) return;
    this.puzzlePress(pz, m.i); this.puzzleSync();
  },
  /** 저장 — 봉인석을 놓기 전 칸으로 잠깐 되돌려 세계를 적는다(봉인은 저장되지 않는다 — 불러오면 열린 방).
      ★ set() 을 거치지 않는다: 같은 줄에서 되돌려 놓으므로 빛 · 지도 · 물이 그 사이를 모른다 */
  withoutSeal<R>(fn: () => R): R {
    const pz = this.puzzle, w = this.world;
    if (!pz || !pz.seal) return fn();
    const { WW } = w.dims, keep: number[] = [];
    for (const [x, y, t] of pz.seal) { const k = y * WW + x; keep.push(w.tiles[k]); w.tiles[k] = t; }
    try { return fn(); } finally { pz.seal.forEach(([x, y]: number[], i: number) => { w.tiles[y * WW + x] = keep[i]; }); }
  },
};

mixin(Game.prototype, RuinPuzzlePart, true);
