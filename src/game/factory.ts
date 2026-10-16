/* ===== factory.js — 공장: 기계 / 전력망 / 물류 ===== */
import { app as G, bindFactory } from './ctx.js';
import { N_, tr } from './lang.js';
import { dimsOf } from './size.js';
import { FARM_WET_DAYS, SPRINKLE_PER_BUCKET, T, TILE_DEF } from './data.js';
import { ITEMS } from './data/items.js';
import { FUEL, MACHINE, MRECIPES } from './data/recipes.js';
import { makeItem } from './items.js';

export const FAC_TICK = 0.125;                                   // 공장 1틱 = 0.125초
export const DIR4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];          // 0=우 1=하 2=좌 3=상
/* 벨트만 쓰는 여섯 방향. */
export const DIR6 = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, -1], [-1, -1]];   // 4=우상 5=좌상
/** 이 기계가 쓰는 방향표. */
export function dirTable(t: any) { return (t === 'belt' || t === 'belt_fast') ? DIR6 : DIR4; }
export const DIR_NAME = ['오른쪽', '아래', '왼쪽', '위', '오른쪽 위', '왼쪽 위'];   // 뒤 둘은 벨트 대각선

/** 초록 점(일하는 중)인 상태 */
export const ST_RUN = new Set([N_('가동'), N_('채굴 중'), N_('시추 중'), N_('이송'), N_('사격'), N_('방전'), N_('통과'), N_('분기'),
  N_('배출 중'), N_('가동 중'), N_('축전 중'), N_('가득 참'), N_('합류 중'), N_('참 → 앞'), N_('거짓 → 옆')]);

/** 분기기가 보는 물건 갈래 — [열쇠, 이름]. 이름은 보일 때 tr */
export const ITEM_CATS: [string, string][] = [['ore', N_('광석')], ['bar', N_('주괴 · 판')], ['fuel', N_('연료')], ['food', N_('먹거리')],
  ['block', N_('블록')], ['seed', N_('씨앗')], ['part', N_('재료 · 부품')]];
/** 물건 하나의 갈래 */
export function itemCat(id: string) {
  const d = ITEMS[id];
  if (FUEL[id]) return 'fuel';
  if (/_ore$/.test(id)) return 'ore';
  if (/_(bar|plate)$/.test(id)) return 'bar';
  if (!d) return 'part';
  if (d.type === 'consum') return 'food';
  if (d.type === 'block') return 'block';
  if (d.type === 'seed') return 'seed';
  return 'part';
}
/** 분기기 조건 갈래 — IF/ELSE 의 조건 */
export const GATE_CONDS: [string, string][] = [['item', N_('같은 물건이면 앞')], ['cat', N_('같은 갈래면 앞')], ['full', N_('앞이 막히면 옆(넘침)')], ['every', N_('N개마다 하나만 앞')]];
/** 옆으로 보내는 물건을 가볍게 들고 가는 기계(한 칸 보관) */
export const HOLDS_ONE = new Set(['belt', 'belt_fast', 'sorter', 'gate_if', 'gate_or']);

export const Factory: Bag = {
  /* 벨트 한 칸에 머무는 시간(초) — 물건도 벨트 무늬도 이 속도로 간다(일반 1칸/초 · 고속 2칸/초) */
  DWELL: { belt: 1, belt_fast: 0.5, sorter: FAC_TICK, gate_if: FAC_TICK, gate_or: FAC_TICK },
  ORE_HITS: 20,            // 드릴이 광맥 한 칸에서 캐는 최소 횟수
  CHARGE_TICK: 6,          // 플레이어 전주 충전 — 한 틱(0.125초)에 6 = 초당 48

  /* ================= 조회 / 설치 / 철거 ================= */
  spec(m: any) { return MACHINE[m.t]; },
  at(w: World, tx: number, ty: number) { const { WW, WH } = dimsOf(w);
    // x가 범위를 벗어나면 y*WW+x가 이웃 행으로 감겨 엉뚱한 기계를 집게 된다 — 먼저 막는다
    if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) return null;
    const k = ty * WW + tx, m = w.machines.get(k);
    if (m) return m;
    const a = w.mpart.get(k);                                   // 여러 칸 기계의 몸 칸 → 닻
    return a === undefined ? null : w.machines.get(a) || null;
  },
  /** 기계가 차지하는 칸 — 닻(m.x, m.y)이 왼쪽 아래, 오른쪽 · 위로 m.w × m.h(옛 세이브 · 작은 기계는 1×1) */
  cells(m: any) {
    const out: number[][] = [], W = m.w || 1, H = m.h || 1;
    for (let dy = 0; dy < H; dy++) for (let dx = 0; dx < W; dx++) out.push([m.x + dx, m.y - dy]);
    return out;
  },
  /** 몸 칸을 점유 표(w.mpart)에 건다 · 푼다 — 불러올 때 · 참가자가 받을 때도 다시 건다 */
  claim(w: World, m: any) { const { WW } = dimsOf(w);
    for (const [x, y] of this.cells(m)) if (x !== m.x || y !== m.y) w.mpart.set(y * WW + x, m.y * WW + m.x);
  },
  release(w: World, m: any) { const { WW } = dimsOf(w);
    for (const [x, y] of this.cells(m)) if (x !== m.x || y !== m.y) w.mpart.delete(y * WW + x);
  },
  claimAll(w: World) { w.mpart.clear(); for (const m of w.machines.values()) if ((m.w || 1) * (m.h || 1) > 1) this.claim(w, m); },
  /** 이 기계 갈래의 크기 */
  sizeOf(key: string) { const s = MACHINE[key]; return (s && s.size) || [1, 1]; },

  /** 이 칸에 기계를 놓을 수 있는가 — 발자국이 모두 빈 칸이어야 한다(key 를 주면 그 기계 크기로) */
  canPlace(w: World, tx: number, ty: number, key?: string) { const { WW } = dimsOf(w);
    const [W, H] = key ? this.sizeOf(key) : [1, 1];
    for (let dy = 0; dy < H; dy++) for (let dx = 0; dx < W; dx++) {
      const x = tx + dx, y = ty - dy, k = y * WW + x;
      if (!w.inB(x, y) || w.get(x, y) !== T.AIR || w.machines.has(k) || w.mpart.has(k)) return false;
    }
    return true;
  },

  /** gen 을 주면 "세계가 지어 둔 기계"로 표시한다. */
  place(w: World, tx: number, ty: number, key: string, dir: number, gen: any) { const { WW } = dimsOf(w);
    const s = MACHINE[key];
    if (!s || !this.canPlace(w, tx, ty, key)) return null;
    const m: Bag = { t: key, x: tx, y: ty, dir: s.rot ? (dir | 0) % dirTable(key).length : 0, on: 1, net: -1, act: 1, st: '' };
    if (gen) m.gen = 1;
    if (HOLDS_ONE.has(key)) m.it = null;                    // 물고 있는 아이템 1개
    if (key === 'sorter') m.f = null;                       // 통과시킬 아이템 id
    if (key === 'converter') { m.in = {}; m.r = []; m.ri = 0; m.rc = 0; }   // 비율 [{id, n}] · 지금 차례 · 그 차례에 낸 수
    if (key === 'gate_if') { m.ck = 'item'; m.cv = null; m.cn = 2; m.k = 0; m.els = 1; }   // 조건 갈래 · 값 · N · 센 수 · ELSE 쪽(1 시계 · 3 반시계)
    if (key === 'gate_or') { m.fs = []; m.els = 1; }         // 고른 것 — 물건 id 또는 'cat:갈래'
    if (s.slots) { m.items = new Array(s.slots).fill(null); m.feed = 0; }
    if (s.fuelIn) { m.fuel = 0; m.fmax = 1; }
    if (s.fuelIn || s.proc || s.ammo) m.in = {};
    if (s.proc || s.mine || key === 'pump' || s.wetR) m.out = {};
    if (s.proc) { m.prog = 0; m.rec = -1; }
    if (s.store) m.e = 0;
    if (s.mine || key === 'pump' || s.ammo || key === 'trap' || s.proj) m.cd = 0;
    if (s.size) { m.w = s.size[0]; m.h = s.size[1]; }
    w.set(tx, ty, s.tile);
    w.machines.set(ty * WW + tx, m);
    for (const [x, y] of this.cells(m)) if (x !== tx || y !== ty) w.set(x, y, T.M_PART);
    this.claim(w, m);
    w.netDirty = true;
    return m;
  },

  /** 철거 — 기계 아이템과 안에 든 것 전부를 돌려준다 */
  remove(w: World, tx: number, ty: number) { const { WW } = dimsOf(w);   // 몸 칸을 줘도 된다 — 걷힌 기계는 lastRemoved
    const m = this.at(w, tx, ty);
    if (!m) return null;
    const s = MACHINE[m.t];
    const back = [makeItem(s.item, 1)];
    const add = (id: string, n: number) => { if (n > 0 && ITEMS[id]) back.push(makeItem(id, n)); };
    if (m.it) add(m.it.id, m.it.c);
    if (m.in) for (const k in m.in) add(k, m.in[k]);
    if (m.rec >= 0) { const r = MRECIPES[m.rec]; for (const k in r.in) add(k, r.in[k]); }   // 착수 때 잡아 둔 재료
    if (m.out) for (const k in m.out) add(k, m.out[k]);
    if (m.items) for (const it of m.items) if (it) back.push(it);
    this.release(w, m);
    w.machines.delete(m.y * WW + m.x);
    for (const [x, y] of this.cells(m)) w.set(x, y, T.AIR);   // 몸 칸을 캐도 닻째 걷힌다
    w.netDirty = true;
    this.lastRemoved = m;
    return back;
  },

  rotate(m: any) {
    if (!MACHINE[m.t].rot) return false;
    m.dir = (m.dir + 1) % dirTable(m.t).length;   // 벨트는 여섯, 나머지는 넷
    return true;
  },

  /* ================= 전력망 ================= */
  buildNets(w: any) { const { WW } = dimsOf(w);
    const R = MACHINE.pole.reach, LINK = R! * 2;
    const poles: Bag[] = [];
    for (const m of w.machines.values()) { m.net = -1; if (m.t === 'pole') poles.push(m); }

    const par = poles.map((_, i) => i);
    const find = (i: number) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const wires: Bag[] = [];        // 이어진 전주 쌍 — 렌더에서 전선을 긋는 데 쓴다
    const cell = new Map();
    poles.forEach((p, i) => {
      const k = Math.floor(p.x / LINK) + ',' + Math.floor(p.y / LINK);
      if (!cell.has(k)) cell.set(k, []);
      cell.get(k).push(i);
    });
    poles.forEach((p, i) => {
      const cx = Math.floor(p.x / LINK), cy = Math.floor(p.y / LINK);
      for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) {
        const list = cell.get((cx + ax) + ',' + (cy + ay));
        if (!list) continue;
        for (const j of list) {
          if (j <= i) continue;
          const q = poles[j];
          if (Math.abs(p.x - q.x) <= LINK && Math.abs(p.y - q.y) <= LINK) {
            const a = find(i), b = find(j);
            if (a !== b) par[b] = a;
            wires.push([p.x, p.y, q.x, q.y]);
          }
        }
      }
    });

    const idx = new Map(), nets: Bag[] = [];
    poles.forEach((p, i) => {
      const r = find(i);
      if (!idx.has(r)) { idx.set(r, nets.length); nets.push({ gen: 0, dem: 0, sat: 1, e: 0, emax: 0, off: 0, bats: [] }); }
      p.net = idx.get(r);
    });

    // 전주 덮개를 타일 단위로 펼쳐 두면, 기계마다 전주를 훑지 않고 한 번에 찾는다
    const cover = new Map();
    for (const p of poles)
      for (let dx = -R!; dx <= R!; dx++) for (let dy = -R!; dy <= R!; dy++)
        cover.set((p.y + dy) * WW + (p.x + dx), p.net);
    for (const m of w.machines.values()) {
      if (m.t === 'pole') continue;
      const n = cover.get(m.y * WW + m.x);
      m.net = n === undefined ? -1 : n;
    }
    w.nets = nets;
    w.wires = wires;
    w.cover = cover;          // 칸 → 망 — 플레이어가 전주 곁에서 충전하는 데도 쓴다
    w.netDirty = false;
  },

  /** 이 기계가 지금 받는 전력 비율 0~1 (전력이 필요 없는 기계는 항상 1) */
  sat(w: World, m: any) {
    const s = MACHINE[m.t];
    if (!s.power) return 1;
    if (m.net < 0) return 0;
    const n = w.nets[m.net];
    return (!n || n.off) ? 0 : n.sat;
  },

  /* ================= 버퍼 도우미 ================= */
  bufTotal(b: any) { let n = 0; for (const k in b) n += b[k]; return n; },
  bufAdd(b: any, id: string, n: number) { b[id] = (b[id] || 0) + n; },
  bufTake(b: any, id: string, n: number) {
    const have = b[id] || 0, take = Math.min(have, n);
    if (take <= 0) return 0;
    b[id] -= take; if (b[id] <= 0) delete b[id];
    return take;
  },

  /** 이 계통의 기계가 재료로 받아 주는 아이템인가 */
  isInput(proc: any, id: string) {
    for (const r of MRECIPES) if (r.m === proc && r.in[id]) return true;
    return false;
  },

  /** 이 기계가 이 아이템을 받는가(자리 여부는 안 본다) — insert 와 기계 창의 가방 정렬이 같이 쓴다 */
  accepts(m: any, id: string) {
    const s = MACHINE[m.t];
    if (HOLDS_ONE.has(m.t) || s.slots) return true;
    if (m.t === 'converter') return !m.r.length || m.r.some((e: Bag) => e.id === id);   // 비율을 정했으면 그 물건만
    if (!m.in) return false;
    return !!((s.fuelIn && FUEL[id]) || s.ammo === id || (s.proc && this.isInput(s.proc, id)));
  },

  /** 아침 — 스프링클러마다 둘레 밭에 물을 준다(가까운 것부터 wetMax 칸). 물가 밭·이미 젖은 밭은 건너뛰어 물을 아낀다.
      양동이 하나 = SPRINKLE_PER_BUCKET 칸(m.wl 에 남은 물). */
  sprinkle(w: World, day: number) {
    for (const m of w.machines.values()) {
      if (m.t !== 'sprinkler' || !m.on) continue;
      if (this.sat(w, m) <= 0) { m.last = 0; continue; }          // 전력 없음 — 펌프가 안 돈다
      const s = MACHINE[m.t], [rx, ry] = s.wetR!, spots = [];
      for (let y = m.y - ry; y <= m.y + ry; y++)
        for (let x = m.x - rx; x <= m.x + rx; x++)
          if (TILE_DEF[w.get(x, y)].farm) spots.push([Math.abs(x - m.x) + Math.abs(y - m.y), x, y]);
      spots.sort((a, b) => a[0] - b[0]);
      let n = 0;
      for (const [, x, y] of spots.slice(0, s.wetMax)) {
        if (w.isWet(x, y, day + FARM_WET_DAYS)) continue;          // 사흘 뒤까지 젖어 있으면 또 줄 까닭이 없다
        if (!(m.wl > 0)) {
          if (!(m.in.water_bucket > 0)) break;
          this.bufTake(m.in, 'water_bucket', 1); m.wl = SPRINKLE_PER_BUCKET;
          m.out.bucket = (m.out.bucket | 0) + 1;                     // 빈 양동이는 출구 칸에 모인다(벨트·기계 창으로 꺼낸다)
        }
        w.waterFarm(x, y, day); m.wl--; n++;
      }
      m.last = n;
    }
  },

  /* ================= 아이템 투입 ================= */
  insert(w: any, m: any, id: string, n: number) {
    if (!m || !m.on || n <= 0) return 0;
    const s = MACHINE[m.t];
    if (HOLDS_ONE.has(m.t)) {
      if (m.it || m.just) return 0;
      m.it = { id, c: 1 }; m.just = 1;
      return 1;
    }
    if (s.slots) {                       // 수집 상자
      let left = n;
      const ms = ITEMS[id].stack || 1;
      for (let i = 0; i < m.items.length && left > 0; i++) {
        const it = m.items[i];
        if (it && it.id === id && !it.a && it.c < ms) { const mv = Math.min(ms - it.c, left); it.c += mv; left -= mv; }
      }
      for (let i = 0; i < m.items.length && left > 0; i++) {
        if (!m.items[i]) { const mv = Math.min(ms, left); m.items[i] = makeItem(id, mv); left -= mv; }
      }
      return n - left;
    }
    if (!this.accepts(m, id)) return 0;
    const cap = s.cap || 40;
    const room = cap - (m.in[id] || 0);
    if (room <= 0) return 0;
    const put = Math.min(room, n);
    this.bufAdd(m.in, id, put);
    return put;
  },

  /** 앞칸(또는 지정 방향)의 기계에 아이템 하나를 밀어 넣는다 */
  pushTo(w: any, m: any, dir: number, id: string) {
    const [dx, dy] = dirTable(m.t)[dir] || DIR4[dir & 3];
    /* 여러 칸 기계는 발자국 가장자리에서 — 오른쪽 · 왼쪽은 아랫줄(바닥 벨트), 위는 왼쪽 열 */
    const ex = dx > 0 ? m.x + (m.w || 1) - 1 : m.x, ey = dy < 0 ? m.y - (m.h || 1) + 1 : m.y;
    const t = this.at(w, ex + dx, ey + dy);
    if (t === m) return false;
    if (!t) return false;
    if (this.insert(w, t, id, 1) <= 0) return false;
    /* 벨트 위 물건은 어디서 언제 왔는지 적어 두고 render 가 머무는 시간(DWELL)에 걸쳐 미끄러뜨린다 —
       tick 도 그 시간이 지나야 다음 칸으로 넘긴다. 그림과 물류가 같은 시계를 본다. */
    const from = HOLDS_ONE.has(m.t) ? null : this.boxOf(m);
    if (t.it) { t.it.fx = ex; t.it.fy = ey; t.it.fo = this.itemOff(m); t.it.t0 = this.now; t.it.src = from; }
    else this.feedFx(m, ex, ey, ex + dx, ey + dy, id, t, from);
    return true;
  },
  /** 기계의 발자국(칸) — [왼쪽, 위, 너비, 높이]. 닻은 왼쪽 아래 */
  boxOf(m: any) { const h = m.h || 1; return [m.x, m.y - h + 1, m.w || 1, h]; },
  /** 버퍼 기계로 들어간 물건 — 받는 쪽은 물건을 칸에 물고 있지 않아 그림이 그 자리에서 사라졌다.
      그림만 한 칸 더 미끄러뜨려 몸체 가장자리에서 잘리며 들어가게 한다(저장 안 함 · 호스트 그림만) */
  feedFx(m: any, fx: number, fy: number, tx: number, ty: number, id: string, t: any, from: any) {
    if (!this.feeds) this.feeds = [];
    if (this.feeds.length > 96) this.feeds = this.feeds.filter((f: any) => this.now - f.t0 < f.d);
    this.feeds.push({ id, fx, fy, tx, ty, fo: this.itemOff(m), t0: this.now, d: this.DWELL[m.t] || 0.5, box: this.boxOf(t), src: from });
  },

  /* ================= 플레이어 조작 ================= */
  /** 가방의 한 칸을 통째로 기계에 넣는다 */
  playerInsert(w: any, m: any, bagIdx: any, p: Player) {
    const it = p.bag[bagIdx];
    if (!it) return 0;
    /* ★ 등급·접사·레벨이 붙은 물건은 상자에 **그 물건 그대로** 넣는다 — insert 는 id·개수로 새로 만들어서
       강화한 장비를 넣었다 빼면 맨 물건이 되어 나왔다 */
    if (MACHINE[m.t].slots && (it.r || Object.keys(it).some(k => k !== 'id' && k !== 'c' && k !== 'r'))) {
      if (!m.on) return 0;
      const i = m.items.indexOf(null);
      if (i < 0) return 0;
      m.items[i] = it; p.bag[bagIdx] = null;
      return it.c;
    }
    const put = this.insert(w, m, it.id, it.c);
    if (put > 0) { it.c -= put; if (it.c <= 0) p.bag[bagIdx] = null; }
    return put;
  },
  /** 기계 버퍼에서 아이템을 꺼내 가방으로. */
  playerTake(w: any, m: any, which: any, id: string, p: Player) {
    const buf = which === 'in' ? m.in : m.out;
    if (!buf || !buf[id]) return 0;
    const want = buf[id];
    const it = makeItem(id, want);
    // addItem은 넣은 만큼 it.c를 깎고, 남으면 false를 준다
    const ok = p.addItem(it!);
    const put = ok ? want : want - it!.c;
    if (put > 0) this.bufTake(buf, id, put);
    return put;
  },

  /* ================= 상태 표시 ================= */
  /** 상태 점의 색: 초록=가동, 노랑=대기/막힘, 빨강=동력 없음, 회색=정지 */
  statusColor(m: any) {
    const st = m.st || '';
    if (!m.on) return '#8a8a92';
    if (ST_RUN.has(st)) return '#5fc45f';
    if (st.indexOf(N_('전력')) >= 0 || st.indexOf(N_('연료')) >= 0 || st.indexOf(N_('망')) === 0 || st === N_('전면 정지')) return '#e0563c';
    return '#e0b23c';
  },
  /** 기계 창에 보일 상태 글 — m.st 는 원문 그대로 두고(색 판정 · 세이브) 보일 때 옮긴다 */
  stLabel(m: any) { return tr(m.st || N_('대기'), { n: m.net + 1 }); },
};

bindFactory(Factory);
