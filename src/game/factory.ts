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
export function dirTable(t) { return (t === 'belt' || t === 'belt_fast') ? DIR6 : DIR4; }
export const DIR_NAME = ['오른쪽', '아래', '왼쪽', '위', '오른쪽 위', '왼쪽 위'];   // 뒤 둘은 벨트 대각선

/** 초록 점(일하는 중)인 상태 */
export const ST_RUN = new Set([N_('가동'), N_('채굴 중'), N_('시추 중'), N_('이송'), N_('사격'), N_('방전'), N_('통과'), N_('분기'),
  N_('배출 중'), N_('가동 중'), N_('축전 중'), N_('가득 참')]);

export const Factory: Bag = {
  /* 벨트 한 칸에 머무는 시간(초) — 물건도 벨트 무늬도 이 속도로 간다(일반 1칸/초 · 고속 2칸/초) */
  DWELL: { belt: 1, belt_fast: 0.5, sorter: FAC_TICK },
  ORE_HITS: 20,            // 드릴이 광맥 한 칸에서 캐는 최소 횟수
  CHARGE_TICK: 6,          // 플레이어 전주 충전 — 한 틱(0.125초)에 6 = 초당 48

  /* ================= 조회 / 설치 / 철거 ================= */
  spec(m) { return MACHINE[m.t]; },
  at(w, tx, ty) { const { WW, WH } = dimsOf(w);
    // x가 범위를 벗어나면 y*WW+x가 이웃 행으로 감겨 엉뚱한 기계를 집게 된다 — 먼저 막는다
    if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) return null;
    return w.machines.get(ty * WW + tx) || null;
  },

  /** 이 칸에 기계를 놓을 수 있는가 — 빈 칸이어야 한다 */
  canPlace(w, tx, ty) { const { WW } = dimsOf(w);
    return w.inB(tx, ty) && w.get(tx, ty) === T.AIR && !w.machines.has(ty * WW + tx);
  },

  /** gen 을 주면 "세계가 지어 둔 기계"로 표시한다. */
  place(w, tx, ty, key, dir, gen) { const { WW } = dimsOf(w);
    const s = MACHINE[key];
    if (!s || !this.canPlace(w, tx, ty)) return null;
    const m: Bag = { t: key, x: tx, y: ty, dir: s.rot ? (dir | 0) % dirTable(key).length : 0, on: 1, net: -1, act: 1, st: '' };
    if (gen) m.gen = 1;
    if (key === 'belt' || key === 'belt_fast' || key === 'sorter') m.it = null;    // 물고 있는 아이템 1개
    if (key === 'sorter') m.f = null;                       // 통과시킬 아이템 id
    if (s.slots) { m.items = new Array(s.slots).fill(null); m.feed = 0; }
    if (s.fuelIn) { m.fuel = 0; m.fmax = 1; }
    if (s.fuelIn || s.proc || s.ammo) m.in = {};
    if (s.proc || s.mine || key === 'pump' || s.wetR) m.out = {};
    if (s.proc) { m.prog = 0; m.rec = -1; }
    if (s.store) m.e = 0;
    if (s.mine || key === 'pump' || s.ammo || key === 'trap' || s.proj) m.cd = 0;
    w.set(tx, ty, s.tile);
    w.machines.set(ty * WW + tx, m);
    w.netDirty = true;
    return m;
  },

  /** 철거 — 기계 아이템과 안에 든 것 전부를 돌려준다 */
  remove(w, tx, ty) { const { WW } = dimsOf(w);
    const m = this.at(w, tx, ty);
    if (!m) return null;
    const s = MACHINE[m.t];
    const back = [makeItem(s.item, 1)];
    const add = (id, n) => { if (n > 0 && ITEMS[id]) back.push(makeItem(id, n)); };
    if (m.it) add(m.it.id, m.it.c);
    if (m.in) for (const k in m.in) add(k, m.in[k]);
    if (m.rec >= 0) { const r = MRECIPES[m.rec]; for (const k in r.in) add(k, r.in[k]); }   // 착수 때 잡아 둔 재료
    if (m.out) for (const k in m.out) add(k, m.out[k]);
    if (m.items) for (const it of m.items) if (it) back.push(it);
    w.machines.delete(ty * WW + tx);
    w.set(tx, ty, T.AIR);
    w.netDirty = true;
    return back;
  },

  rotate(m) {
    if (!MACHINE[m.t].rot) return false;
    m.dir = (m.dir + 1) % dirTable(m.t).length;   // 벨트는 여섯, 나머지는 넷
    return true;
  },

  /* ================= 전력망 ================= */
  buildNets(w) { const { WW } = dimsOf(w);
    const R = MACHINE.pole.reach, LINK = R * 2;
    const poles = [];
    for (const m of w.machines.values()) { m.net = -1; if (m.t === 'pole') poles.push(m); }

    const par = poles.map((_, i) => i);
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const wires = [];        // 이어진 전주 쌍 — 렌더에서 전선을 긋는 데 쓴다
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

    const idx = new Map(), nets = [];
    poles.forEach((p, i) => {
      const r = find(i);
      if (!idx.has(r)) { idx.set(r, nets.length); nets.push({ gen: 0, dem: 0, sat: 1, e: 0, emax: 0, off: 0, bats: [] }); }
      p.net = idx.get(r);
    });

    // 전주 덮개를 타일 단위로 펼쳐 두면, 기계마다 전주를 훑지 않고 한 번에 찾는다
    const cover = new Map();
    for (const p of poles)
      for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++)
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
  sat(w, m) {
    const s = MACHINE[m.t];
    if (!s.power) return 1;
    if (m.net < 0) return 0;
    const n = w.nets[m.net];
    return (!n || n.off) ? 0 : n.sat;
  },

  /* ================= 버퍼 도우미 ================= */
  bufTotal(b) { let n = 0; for (const k in b) n += b[k]; return n; },
  bufAdd(b, id, n) { b[id] = (b[id] || 0) + n; },
  bufTake(b, id, n) {
    const have = b[id] || 0, take = Math.min(have, n);
    if (take <= 0) return 0;
    b[id] -= take; if (b[id] <= 0) delete b[id];
    return take;
  },

  /** 이 계통의 기계가 재료로 받아 주는 아이템인가 */
  isInput(proc, id) {
    for (const r of MRECIPES) if (r.m === proc && r.in[id]) return true;
    return false;
  },

  /** 이 기계가 이 아이템을 받는가(자리 여부는 안 본다) — insert 와 기계 창의 가방 정렬이 같이 쓴다 */
  accepts(m, id) {
    const s = MACHINE[m.t];
    if (m.t === 'belt' || m.t === 'belt_fast' || m.t === 'sorter' || s.slots) return true;
    if (!m.in) return false;
    return !!((s.fuelIn && FUEL[id]) || s.ammo === id || (s.proc && this.isInput(s.proc, id)));
  },

  /** 아침 — 스프링클러마다 둘레 밭에 물을 준다(가까운 것부터 wetMax 칸). 물가 밭·이미 젖은 밭은 건너뛰어 물을 아낀다.
      양동이 하나 = SPRINKLE_PER_BUCKET 칸(m.wl 에 남은 물). */
  sprinkle(w, day) {
    for (const m of w.machines.values()) {
      if (m.t !== 'sprinkler' || !m.on) continue;
      if (this.sat(w, m) <= 0) { m.last = 0; continue; }          // 전력 없음 — 펌프가 안 돈다
      const s = MACHINE[m.t], [rx, ry] = s.wetR, spots = [];
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
  insert(w, m, id, n) {
    if (!m || !m.on || n <= 0) return 0;
    const s = MACHINE[m.t];
    if (m.t === 'belt' || m.t === 'belt_fast' || m.t === 'sorter') {
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
  pushTo(w, m, dir, id) {
    const [dx, dy] = dirTable(m.t)[dir] || DIR4[dir & 3];
    const t = this.at(w, m.x + dx, m.y + dy);
    if (!t) return false;
    if (this.insert(w, t, id, 1) <= 0) return false;
    /* 벨트 위 물건은 어디서 언제 왔는지 적어 두고 render 가 머무는 시간(DWELL)에 걸쳐 미끄러뜨린다 —
       tick 도 그 시간이 지나야 다음 칸으로 넘긴다. 그림과 물류가 같은 시계를 본다. */
    if (t.it) { t.it.fx = m.x; t.it.fy = m.y; t.it.fo = this.itemOff(m); t.it.t0 = this.now; }
    return true;
  },

  /* ================= 플레이어 조작 ================= */
  /** 가방의 한 칸을 통째로 기계에 넣는다 */
  playerInsert(w, m, bagIdx, p) {
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
  playerTake(w, m, which, id, p) {
    const buf = which === 'in' ? m.in : m.out;
    if (!buf || !buf[id]) return 0;
    const want = buf[id];
    const it = makeItem(id, want);
    // addItem은 넣은 만큼 it.c를 깎고, 남으면 false를 준다
    const ok = p.addItem(it);
    const put = ok ? want : want - it.c;
    if (put > 0) this.bufTake(buf, id, put);
    return put;
  },

  /* ================= 상태 표시 ================= */
  /** 상태 점의 색: 초록=가동, 노랑=대기/막힘, 빨강=동력 없음, 회색=정지 */
  statusColor(m) {
    const st = m.st || '';
    if (!m.on) return '#8a8a92';
    if (ST_RUN.has(st)) return '#5fc45f';
    if (st.indexOf(N_('전력')) >= 0 || st.indexOf(N_('연료')) >= 0 || st.indexOf(N_('망')) === 0 || st === N_('전면 정지')) return '#e0563c';
    return '#e0b23c';
  },
  /** 기계 창에 보일 상태 글 — m.st 는 원문 그대로 두고(색 판정 · 세이브) 보일 때 옮긴다 */
  stLabel(m) { return tr(m.st || N_('대기'), { n: m.net + 1 }); },
};

bindFactory(Factory);
