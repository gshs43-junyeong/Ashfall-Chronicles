/* ===== factory.js — 공장: 기계 / 전력망 / 물류 ===== */
'use strict';

const FAC_TICK = 0.125;                                   // 공장 1틱 = 0.125초
const DIR4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];          // 0=우 1=하 2=좌 3=상
/* 벨트만 쓰는 여섯 방향. */
const DIR6 = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, -1], [-1, -1]];   // 4=우상 5=좌상
/** 이 기계가 쓰는 방향표. */
function dirTable(t) { return (t === 'belt' || t === 'belt_fast') ? DIR6 : DIR4; }
const DIR_NAME = ['오른쪽', '아래', '왼쪽', '위'];

const Factory = {
  CHARGE_TICK: 6,          // 플레이어 전주 충전 — 한 틱(0.125초)에 6 = 초당 48

  /* ================= 조회 / 설치 / 철거 ================= */
  spec(m) { return MACHINE[m.t]; },
  at(w, tx, ty) {
    // x가 범위를 벗어나면 y*WW+x가 이웃 행으로 감겨 엉뚱한 기계를 집게 된다 — 먼저 막는다
    if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) return null;
    return w.machines.get(ty * WW + tx) || null;
  },

  /** 이 칸에 기계를 놓을 수 있는가 — 빈 칸이어야 한다 */
  canPlace(w, tx, ty) {
    return w.inB(tx, ty) && w.get(tx, ty) === T.AIR && !w.machines.has(ty * WW + tx);
  },

  /** gen 을 주면 "세계가 지어 둔 기계"로 표시한다. */
  place(w, tx, ty, key, dir, gen) {
    const s = MACHINE[key];
    if (!s || !this.canPlace(w, tx, ty)) return null;
    const m = { t: key, x: tx, y: ty, dir: s.rot ? (dir | 0) % dirTable(key).length : 0, on: 1, net: -1, act: 1, st: '' };
    if (gen) m.gen = 1;
    if (key === 'belt' || key === 'belt_fast' || key === 'sorter') m.it = null;    // 물고 있는 아이템 1개
    if (key === 'sorter') m.f = null;                       // 통과시킬 아이템 id
    if (s.slots) { m.items = new Array(s.slots).fill(null); m.feed = 0; }
    if (s.fuelIn) { m.fuel = 0; m.fmax = 1; }
    if (s.fuelIn || s.proc || s.ammo) m.in = {};
    if (s.proc || s.mine || key === 'pump') m.out = {};
    if (s.proc) { m.prog = 0; m.rec = -1; }
    if (s.store) m.e = 0;
    if (s.mine || key === 'pump' || s.ammo || key === 'trap' || s.proj) m.cd = 0;
    w.set(tx, ty, s.tile);
    w.machines.set(ty * WW + tx, m);
    w.netDirty = true;
    return m;
  },

  /** 철거 — 기계 아이템과 안에 든 것 전부를 돌려준다 */
  remove(w, tx, ty) {
    const m = this.at(w, tx, ty);
    if (!m) return null;
    const s = MACHINE[m.t];
    const back = [makeItem(s.item, 1)];
    const add = (id, n) => { if (n > 0 && ITEMS[id]) back.push(makeItem(id, n)); };
    if (m.it) add(m.it.id, m.it.c);
    if (m.in) for (const k in m.in) add(k, m.in[k]);
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
  buildNets(w) {
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
    if (!m.in) return 0;
    const cap = s.cap || 40;
    const room = cap - (m.in[id] || 0);
    if (room <= 0) return 0;
    let ok = false;
    if (s.fuelIn && FUEL[id]) ok = true;
    if (s.ammo === id) ok = true;
    if (s.proc && this.isInput(s.proc, id)) ok = true;
    if (!ok) return 0;
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
    /* 벨트 위 물건은 어디서 언제 왔는지 적어 두고 render 가 한 틱에 걸쳐 미끄러뜨린다 — 칸 가운데서 칸 가운데로
       뚝뚝 끊겨 보였다. 고속 벨트가 한 틱에 두 칸을 가면 출발점을 이어받아 두 칸을 한 번에 미끄러진다. */
    if (t.it) {
      const same = m.it && m.it.t0 === this.now;
      t.it.fx = same ? m.it.fx : m.x; t.it.fy = same ? m.it.fy : m.y; t.it.t0 = this.now;
    }
    return true;
  },

  /* ================= 틱 ================= */
  tick(w, G) {
    this.now = G.time;
    if (w.netDirty) this.buildNets(w);
    const ms = w.machines;
    if (!ms.size) return;

    /* ---- 1. 전력 정산 ---- */
    const nets = w.nets;
    for (const n of nets) { n.gen = 0; n.dem = 0; n.e = 0; n.emax = 0; n.off = 0; n.bats.length = 0; }
    for (const m of ms.values()) {
      if (m.t === 'switch' && !m.on && m.net >= 0 && nets[m.net]) nets[m.net].off = 1;
    }
    for (const m of ms.values()) {
      const s = MACHINE[m.t];
      const n = m.net >= 0 ? nets[m.net] : null;
      if (!n) continue;
      if (s.store) { n.e += m.e; n.emax += s.store; n.bats.push(m); }
      // 지난 틱에 실제로 일한 기계만 수요로 잡는다 — 놀고 있는 조립기가 발전기를 태우지 않게
      if (s.power && m.on && !n.off && m.act && !(m.gen && !m.own)) n.dem += s.power;   // 유적 함정은 제 힘
    }
    /* 플레이어 충전 — 전주 반경 안에 서 있으면 그 망에서 전하를 받는다. 다른 기계와 같은 수요로 셈해
       발전기 여유분 → 축전지 순으로 빠져나간다(공짜 충전이 아니다). 한 틱에 CHARGE_TICK 까지. */
    const p = G.player;
    let pn = null, pwant = 0;
    if (p && !p.dead && w.cover) {
      const k = w.cover.get(Math.floor(p.cy / TS) * WW + Math.floor(p.cx / TS));
      pn = k === undefined ? null : nets[k];
      if (pn && !pn.off) { pwant = Math.min(this.CHARGE_TICK, p.d.maxCharge - p.charge); if (pwant > 0) pn.dem += pwant; }
      else pn = null;
    }
    for (const m of ms.values()) {
      const s = MACHINE[m.t];
      if (!s.gen) continue;
      const n = m.net >= 0 ? nets[m.net] : null;
      if (!m.on) { m.st = '정지'; continue; }
      if (!n) { m.st = '망 없음'; continue; }
      if (n.off) { m.st = '전면 정지'; continue; }
      if (s.sky) {
        // 풍차: 연료 대신 트인 하늘이 필요하다.
        let clear = true;
        for (let k = 1; k <= s.sky; k++) if (this.blocksWind(w, m.x, m.y - k)) { clear = false; break; }
        if (!clear) { m.st = '바람 막힘'; continue; }
        n.gen += s.gen; m.st = '회전 중';
        continue;
      }
      if (n.dem <= 0 && n.e >= n.emax) { m.st = '대기'; continue; }   // 쓸 데가 없으면 연료를 아낀다
      if (m.fuel <= 0) {
        for (const k in m.in) { if (!FUEL[k]) continue; this.bufTake(m.in, k, 1); m.fuel = m.fmax = FUEL[k]; break; }
      }
      if (m.fuel > 0) { m.fuel--; n.gen += s.gen; m.st = '가동'; }
      else m.st = '연료 없음';
    }
    for (const n of nets) {
      if (n.gen >= n.dem) { n.sat = 1; n.sur = n.gen - n.dem; n.drawn = 0; }
      else {
        const draw = Math.min(n.dem - n.gen, n.e);
        n.sat = n.dem > 0 ? (n.gen + draw) / n.dem : 1;
        n.sur = 0; n.drawn = draw;
      }
      let sur = n.sur, drawn = n.drawn;
      for (const b of n.bats) {
        const cap = MACHINE[b.t].store;              // ★ 제 용량 — 강화 축전지(14000)가 3000에서 멈췄었다
        if (sur > 0) { const c = Math.min(sur, cap - b.e); b.e += c; sur -= c; }
        else if (drawn > 0) { const c = Math.min(drawn, b.e); b.e -= c; drawn -= c; }
      }
    }

    if (pn && pwant > 0) {
      const got = pwant * pn.sat;
      p.charge = Math.min(p.d.maxCharge, p.charge + got);
      if (got > 0) p.gridT = G.time;                // HUD 가 ⚡ 를 띄운다
    }

    /* ---- 2. 기계 동작 ---- */
    for (const m of ms.values()) {
      m.just = 0;
      const s = MACHINE[m.t];
      if (!m.on && m.t !== 'switch') { m.st = '정지'; m.act = 0; continue; }
      switch (m.t) {
        case 'drill': case 'drill_e': this.runDrill(w, m, s); break;
        case 'pump': this.runPump(w, m, s); break;
        case 'turret': this.runTurret(w, m, s, G); break;
        case 'trap': this.runTrap(w, m, s, G); break;
        case 'dart': case 'flamejet': case 'frostjet': this.runShooter(w, m, s, G); break;
        case 'switch': m.st = m.on ? '가동 중' : '전면 정지'; m.act = 0; break;
        case 'belt': case 'belt_fast': m.st = m.it ? '이송' : '대기'; m.act = 0; break;
        case 'sorter': m.act = m.it ? 1 : 0; break;
        case 'pole': m.st = m.net >= 0 ? '망 #' + (m.net + 1) : '—'; m.act = 0; break;
        case 'crate': m.st = m.feed ? '배출 중' : '보관'; m.act = 0; break;
        case 'gen': case 'windmill': break;   // 전력 정산에서 이미 처리했다
        default: if (s.proc) this.runProc(w, m, s); break;
      }
    }

    /* ---- 3. 물류 ---- */
    /* 고속 벨트는 한 틱에 **두 칸**을 간다 — 물류 패스를 한 번 더 돌리되, 두 번째 패스에서는 고속 벨트만 본다. */
    for (let pass = 0; pass < 2; pass++) {
    if (pass) for (const m of ms.values()) if (m.t === 'belt_fast') m.just = 0;
    for (const m of ms.values()) {                       // 벨트 · 분류기 먼저
      if (pass && m.t !== 'belt_fast') continue;
      if (m.t === 'belt' || m.t === 'belt_fast') {
        if (!m.it || m.just) continue;
        if (this.pushTo(w, m, m.dir, m.it.id)) { m.it = null; G.sfxAt('belt', m.x, m.y); }
      } else if (m.t === 'sorter') {
        if (!m.it || m.just) continue;
        if (this.sat(w, m) <= 0) { m.st = '전력 없음'; continue; }
        const match = !m.f || m.f === m.it.id;
        m.st = match ? '통과' : '분기';
        if (this.pushTo(w, m, match ? m.dir : (m.dir + 1) & 3, m.it.id)) m.it = null;
      }
    }
    }
    for (const m of ms.values()) {                       // 기계 출력 배출
      if (m.out) {
        for (const k in m.out) { if (m.out[k] > 0 && this.pushTo(w, m, m.dir, k)) this.bufTake(m.out, k, 1); break; }
      } else if (m.t === 'crate' && m.feed) {
        for (let i = 0; i < m.items.length; i++) {
          const it = m.items[i];
          if (!it) continue;
          if (this.pushTo(w, m, m.dir, it.id)) { it.c--; if (it.c <= 0) m.items[i] = null; }
          break;
        }
      }
    }
  },

  /** 풍차 위를 막는가 — 고체 타일과 다른 기계 둘 다 바람을 가린다 */
  blocksWind(w, x, y) {
    return w.solid(x, y) || w.machines.has(y * WW + x);
  },

  /* ---- 연료를 태운다. 태울 수 있으면 true ---- */
  burn(m) {
    if (m.fuel > 0) { m.fuel--; return true; }
    for (const k in m.in) {
      if (!FUEL[k]) continue;
      this.bufTake(m.in, k, 1);
      m.fmax = FUEL[k]; m.fuel = FUEL[k] - 1;
      return true;
    }
    return false;
  },

  /* ---- 가공 기계 (자동 용광로 / 압축기 / 정제기 / 조립기 / 축전지) ---- */
  runProc(w, m, s) {
    const cap = s.cap || 40;
    if (m.rec < 0) {
      let pick = -1;
      for (let i = 0; i < MRECIPES.length; i++) {
        const r = MRECIPES[i];
        if (r.m !== s.proc) continue;
        let ok = true;
        for (const k in r.in) if ((m.in[k] || 0) < r.in[k]) { ok = false; break; }
        if (ok) { pick = i; break; }
      }
      // 축전지는 방전 배터리가 없을 때가 평상시다 — '재료 없음' 이 아니라 전기를 담고 있다고 보인다
      if (pick < 0) { m.st = s.store ? (m.e >= s.store ? '가득 참' : '축전 중') : '재료 없음'; m.prog = 0; m.act = 0; return; }
      const r = MRECIPES[pick];
      for (const k in r.in) this.bufTake(m.in, k, r.in[k]);   // 착수 시점에 재료를 잡아 둔다
      m.rec = pick; m.prog = 0;
    }
    const r = MRECIPES[m.rec];
    let step = 1;
    if (s.fuelIn) { if (!this.burn(m)) { m.st = '연료 없음'; return; } }
    // 전력이 끊겼을 때 act를 내리면 안 된다 — 수요가 사라져 sat이 1로 돌아가고, 그러면 발전기 없이도 한 틱씩 공짜로 도는 톱니 현상이 생긴다
    else { step = this.sat(w, m); if (step <= 0) { m.st = m.net < 0 ? '망 없음' : '전력 없음'; return; } }
    m.act = 1;
    if (m.prog < r.t) { m.prog += step; m.st = '가동'; }
    if (m.prog < r.t) return;
    for (const k in r.out) if ((m.out[k] || 0) + r.out[k] > cap) { m.st = '출력 가득'; m.act = 0; return; }
    for (const k in r.out) this.bufAdd(m.out, k, r.out[k]);
    m.prog = 0; m.rec = -1;
    G.sfxAt(m.t === 'oven' ? 'cook' : 'smelt', m.x, m.y);
  },

  /* ---- 드릴: 반경 안의 광맥을 실제로 캐낸다 (캐낸 자리는 사라진다) ---- */
  runDrill(w, m, s) {
    let step = 1;
    if (s.fuelIn) { if (!this.burn(m)) { m.st = '연료 없음'; return; } }
    else { step = this.sat(w, m); if (step <= 0) { m.st = m.net < 0 ? '망 없음' : '전력 없음'; return; } }
    if (this.bufTotal(m.out) >= (s.cap || 40)) { m.st = '출력 가득'; m.act = 0; return; }
    m.act = 1;
    m.cd -= step;
    if (m.cd > 0) { m.st = '채굴 중'; return; }
    const R = s.range;
    let best = null, bestD = 1e9;
    for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
      const tx = m.x + dx, ty = m.y + dy;
      const def = TILE_DEF[w.get(tx, ty)];
      if (!def.ore || !def.drop || def.hard > s.mine) continue;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = [tx, ty, def.drop]; }
    }
    if (!best) { m.cd = 0; m.st = '광맥 없음'; m.act = 0; return; }
    w.set(best[0], best[1], T.AIR);
    this.bufAdd(m.out, best[2], 1);
    m.cd = s.cycle;
    m.st = '채굴 중';
    G.sfxAt('drill', m.x, m.y);
  },

  /* ---- 시추 펌프: 유혈암을 소모하지 않는다. 마르지 않는 대신 느리다 ---- */
  runPump(w, m, s) {
    const step = this.sat(w, m);
    if (step <= 0) { m.st = m.net < 0 ? '망 없음' : '전력 없음'; return; }
    if (this.bufTotal(m.out) >= (s.cap || 40)) { m.st = '출력 가득'; m.act = 0; return; }
    let found = false;
    const R = s.range;
    for (let dx = -R; dx <= R && !found; dx++) for (let dy = -R; dy <= R; dy++)
      if (w.get(m.x + dx, m.y + dy) === T.OILSHALE) { found = true; break; }
    if (!found) { m.st = '유혈암 없음'; m.act = 0; return; }
    m.act = 1;
    m.cd -= step;
    if (m.cd > 0) { m.st = '시추 중'; return; }
    this.bufAdd(m.out, 'crude_oil', 1);
    m.cd = s.cycle;
    m.st = '시추 중';
  },

  /* ---- 자동 포탑 ---- */
  runTurret(w, m, s, G) {
    const step = this.sat(w, m);
    if (step <= 0) { m.st = m.net < 0 ? '망 없음' : '전력 없음'; return; }
    if (!(m.in[s.ammo] > 0)) { m.st = '탄약 없음'; m.act = 0; return; }
    m.act = 1;
    m.cd -= step;
    if (m.cd > 0) { m.st = '경계'; return; }
    const cx = m.x * TS + TS / 2, cy = m.y * TS + TS / 2;
    let tgt = null, bd = s.range * s.range;
    for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      const d = dist2(cx, cy, e.cx, e.cy);
      if (d < bd) { bd = d; tgt = e; }
    }
    if (!tgt) { m.cd = 0; m.st = '경계'; return; }
    this.bufTake(m.in, s.ammo, 1);
    const ang = angleTo(cx, cy, tgt.cx, tgt.cy);
    const dmg = s.dmg * (1 + G.player.level * 0.05);
    // 포탑은 몸이 있는 칸이라 한가운데서 쏘면 제 칸에 부딪혀 사라진다 — 총구(칸 반지름 + 3px) 밖에서 낸다
    const mz = TS / 2 + 3;
    const p = new Proj(cx + Math.cos(ang) * mz, cy + Math.sin(ang) * mz, Math.cos(ang) * 840, Math.sin(ang) * 840, dmg, 'player', 'arrow');
    G.projs.push(p);
    m.cd = s.cycle;
    m.st = '사격';
    m.fx = 2;
    G.sfxAt('turret', m.x, m.y);
  },

  /* ---- 발사형 함정 (화살·화염·서리) ---- */
  runShooter(w, m, s, G) {
    m.cd -= 1;
    if (m.cd > 0) { m.st = '장전 중'; m.act = 0; return; }
    const [dx, dy] = DIR4[m.dir];
    const cx = m.x * TS + TS / 2, cy = m.y * TS + TS / 2;
    // 정면 일직선에 목표가 들어왔는지 본다.
    let tgt = null;
    for (let k = 1; k <= s.range; k++) {
      const tx = m.x + dx * k, ty = m.y + dy * k;
      if (w.solid(tx, ty)) break;
      const r = { x: tx * TS, y: ty * TS, w: TS, h: TS };
      if (m.own) {
        for (const e of G.ents) { if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) { tgt = e; break; } }
      } else if (aabb(r, G.player.rect())) tgt = G.player;
      if (tgt) break;
    }
    if (!tgt) { m.st = '대기'; m.act = 0; return; }
    m.act = 1;
    const ang = Math.atan2(dy, dx);
    const dmg = s.dmg * (1 + G.player.level * 0.03);
    const pr = new Proj(cx + dx * 12, cy + dy * 12, Math.cos(ang) * 620, Math.sin(ang) * 620,
      dmg, m.own ? 'player' : 'enemy', s.proj);
    if (s.burn) pr.fire = 1;
    if (s.slow) pr.frost = 1;
    G.projs.push(pr);
    m.cd = s.cycle;
    m.st = '발사';
    m.fx = 2;
    G.sfxAt(s.proj === 'fire' ? 'zap' : 'turret', m.x, m.y);
  },

  /* ---- 전격 함정: 위에 올라선 적만 지진다 (플레이어는 안전) — 함정도 몸이 있는 칸이라 들어올 수는 없다 ---- */
  runTrap(w, m, s, G) {
    const r = { x: m.x * TS, y: (m.y - 1) * TS, w: TS, h: TS + 2 };   // 윗칸 + 윗면에 닿은 발
    /* ★ 세계가 지은 함정(gen, 유적 공장)은 망 없이 돌고 **올라선 누구든** 지진다 — 망을 찾으면 영영 꺼져 있었다 */
    if (m.gen && !m.own) return this.runWildTrap(w, m, r, G);
    const step = this.sat(w, m);
    if (step <= 0) { m.st = m.net < 0 ? '망 없음' : '전력 없음'; return; }
    m.act = 1;
    m.cd -= step;
    if (m.cd > 0) { m.st = '대기'; return; }
    let hit = 0;
    for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      if (!aabb(r, e.rect())) continue;
      e.hurt(s.dmg * (1 + G.player.level * 0.04), false, G.player, 2);
      hit++;
    }
    m.st = hit ? '방전' : '대기';
    if (hit) { m.cd = 4; m.fx = 3; G.sfxAt('zap', m.x, m.y); } else m.cd = 1;
  },
  /** 유적 함정 — 밟으면 0.5초 불꽃으로 알리고 그때도 위에 있으면 방전, 2초 쉰다. */
  runWildTrap(w, m, r, G) {
    const p = G.player, on = !p.dead && aabb(r, p.rect());
    let foe = false;
    for (const e of G.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) { foe = true; break; }
    if (m.cd > 0) { m.cd--; m.st = '식는 중'; m.act = 0; return; }
    if (!m.arm) {
      if (!on && !foe) { m.st = '대기'; m.act = 0; return; }
      m.arm = 4;
    }
    m.act = 1; m.st = '충전';
    if (--m.arm > 0) {
      for (let i = 0; i < 2; i++) G.parts.push(new Part((m.x + Math.random()) * TS, m.y * TS - 1, '#9fd8ff', -40, .25));
      return;
    }
    m.arm = 0; m.cd = 16; m.fx = 3; m.st = '방전';
    if (on && p.iframe <= 0) p.hurt(26 + p.level * 1.1);
    for (const e of G.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) e.hurt(34, false, null, 0);
    G.sfxAt('zap', m.x, m.y);
  },

  /* ================= 플레이어 조작 ================= */
  /** 가방의 한 칸을 통째로 기계에 넣는다 */
  playerInsert(w, m, bagIdx, p) {
    const it = p.bag[bagIdx];
    if (!it) return 0;
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
    if (st === '가동' || st === '채굴 중' || st === '시추 중' || st === '이송' || st === '사격' ||
        st === '방전' || st === '통과' || st === '분기' || st === '배출 중' || st === '가동 중' || st === '축전 중' || st === '가득 참') return '#5fc45f';
    if (st.indexOf('전력') >= 0 || st.indexOf('연료') >= 0 || st.indexOf('망') === 0 || st === '전면 정지') return '#e0563c';
    return '#e0b23c';
  },

  /* ================= 렌더 ================= */
  render(c, w, camX, camY, tx0, ty0, tx1, ty1, time) {
    if (!w.machines.size) return;
    c.save();
    c.imageSmoothingEnabled = false;
    const y0 = Math.max(0, ty0), y1 = Math.min(WH - 1, ty1);
    const x0 = Math.max(0, tx0), x1 = Math.min(WW - 1, tx1);

    // 전주 사이의 전선 — 이걸 안 그리면 공중에 뜬 전주가 그냥 떠 있는 기둥으로 보인다.
    if (w.wires && w.wires.length) {
      c.strokeStyle = 'rgba(28,26,22,.85)'; c.lineWidth = 1.4;
      c.beginPath();
      for (const [ax, ay, bx, by] of w.wires) {
        if (Math.max(ax, bx) < x0 - 2 || Math.min(ax, bx) > x1 + 2) continue;
        if (Math.max(ay, by) < y0 - 2 || Math.min(ay, by) > y1 + 2) continue;
        const sx1 = ax * TS - camX + TS / 2, sy1 = ay * TS - camY + 5;
        const sx2 = bx * TS - camX + TS / 2, sy2 = by * TS - camY + 5;
        c.moveTo(sx1, sy1);
        // 살짝 늘어지게 — 팽팽한 직선보다 전선처럼 보인다
        c.quadraticCurveTo((sx1 + sx2) / 2, (sy1 + sy2) / 2 + Math.abs(sx2 - sx1) * 0.06 + 2, sx2, sy2);
      }
      c.stroke();
    }
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const m = w.machines.get(ty * WW + tx);
        if (!m) continue;
        const sx = tx * TS - camX, sy = ty * TS - camY;
        const s = MACHINE[m.t];

        /* 전주 몸통 — 타일이 아니라 **그림**이다 — 사연: docs/code-history.md#h39 */
        if (m.t === 'pole') {
          let by = ty + 1;
          while (by < WH && !w.solid(tx, by) && by - ty < 40) by++;
          /* 기둥 밑끝은 **바닥 칸의 윗면**에 딱 맞춰야 한다. */
          const h = (by - ty) * TS - (TS - 1);
          if (h > 0) {
            const px = sx + TS / 2 - 2, py = sy + TS - 1;
            c.fillStyle = '#7a6a4a'; c.fillRect(px, py, 4, h);
            c.fillStyle = shade('#7a6a4a', 1.35); c.fillRect(px, py, 1.5, h);
            c.fillStyle = shade('#7a6a4a', .62);
            for (let k = 1; k * TS * 2 < h; k++) c.fillRect(px - 1, py + k * TS * 2, 6, 1.5);   // 이음매
          }
          /* 가로대에서 지지직 — 3프레임으로 끊어 튄다. */
          const fr = ((time * 9) + tx * 2 + ty) | 0;
          if (fr % 4 !== 3) {                                  // 4틱 중 3틱만 — 끊겨야 지지직거린다
            const q = fr % 3, ax = sx + 3 + q * 6, ay = sy + 3;
            c.strokeStyle = '#bfe8ff'; c.lineWidth = 1;
            c.globalAlpha = .55 + (q & 1) * .35;
            c.beginPath();
            c.moveTo(ax, ay);
            c.lineTo(ax + 3, ay + 2 - (q & 1) * 3);
            c.lineTo(ax + 6, ay + 1 + (q & 1) * 2);
            c.stroke();
            c.fillStyle = '#8fd8ff';
            c.fillRect(sx + TS / 2 - 4 + (q - 1), sy + 9, 2, 2);
            c.globalAlpha = 1;
          }
        }

        /* 타일은 그대로 두고(설치·전력 판정은 1칸) **그림만 제 칸 위로 키워** 얹는다. */
        if (m.t === 'windmill') {
          const R = 26;                                   // 날개 반지름 (타일의 약 2.4배)
          const hx = sx + TS / 2, hy = sy - 10;           // 회전축 — 날개 아래끝이 지붕에 닿지 않을 만큼 올린다
          c.save();
          c.strokeStyle = '#3a3026'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, sy + TS); c.stroke();   // 기둥
          c.translate(hx, hy);
          c.rotate((time * 0.9) % TAU);
          for (let k = 0; k < 4; k++) {
            c.rotate(TAU / 4);
            c.fillStyle = '#e8dcc0'; c.fillRect(-1.5, -R, 3, R);
            c.fillStyle = '#cfc2a4'; c.fillRect(-5, -R, 5, R * 0.62);
          }
          c.restore();
          c.fillStyle = '#5a4a3a';
          c.beginPath(); c.arc(hx, hy, 3, 0, TAU); c.fill();
        }

        /* 벨트 몸통은 타일 그림이 **가로 한 방향**뿐이다(mk_belt). */
        if ((m.t === 'belt' || m.t === 'belt_fast') && m.dir !== 0 && m.dir !== 2) {
          const ang = m.dir === 1 ? Math.PI / 2 : m.dir === 3 ? -Math.PI / 2
            : m.dir === 4 ? -Math.PI / 4 : -Math.PI * 3 / 4;
          c.save();
          c.translate(sx + TS / 2, sy + TS / 2);
          c.rotate(ang);
          c.fillStyle = '#2e3238'; c.fillRect(-TS / 2, -5, TS, 10);        // 띠
          c.fillStyle = '#4a5058'; c.fillRect(-TS / 2, -5, TS, 2);
          c.fillStyle = '#20242a'; c.fillRect(-TS / 2, 3, TS, 2);
          for (let k = -TS / 2 + 1; k < TS / 2; k += 4)                    // 마디
            { c.fillStyle = '#3c424a'; c.fillRect(k, -3, 2, 6); }
          c.restore();
        }
        // 방향 표시 — 벨트는 흐르는 화살표, 나머지는 배출구 삼각형
        if (s.rot) {
          const [dx, dy] = dirTable(m.t)[m.dir] || DIR4[m.dir & 3];
          if (m.t === 'belt' || m.t === 'belt_fast') {
            // 고속 벨트는 화살표가 두 배로 빨리 흐른다 — 보기만 해도 구분된다
            const ph = (time * (m.t === 'belt_fast' ? 6.4 : 3.2)) % 1;
            c.fillStyle = 'rgba(226,238,255,.55)';
            for (let k = 0; k < 2; k++) {
              const t2 = (ph + k * 0.5) % 1;
              const px = sx + TS / 2 + dx * (t2 - 0.5) * TS, py = sy + TS / 2 + dy * (t2 - 0.5) * TS;
              c.fillRect(px - 1.5, py - 1.5, 3, 3);
            }
          } else {
            c.fillStyle = 'rgba(255,214,120,.85)';
            c.fillRect(sx + TS / 2 + dx * 8 - 2, sy + TS / 2 + dy * 8 - 2, 4, 4);
          }
        }

        // 벨트/분류기가 물고 있는 아이템 — 들어온 칸에서 지금 칸까지 한 틱에 걸쳐 미끄러진다(pushTo)
        if (m.it) {
          let ix = sx, iy = sy;
          if (m.it.t0 !== undefined) {
            const k = clamp((time - m.it.t0) / FAC_TICK, 0, 1);
            ix = (m.it.fx + (m.x - m.it.fx) * k) * TS - camX; iy = (m.it.fy + (m.y - m.it.fy) * k) * TS - camY;
          }
          Art.drawItem(c, m.it.id, Math.round(ix) + 4, Math.round(iy) + 3, 14);
        }

        // 연료 막대 (왼쪽 세로)
        if (m.fmax && m.fuel > 0) {
          const h = Math.round((m.fuel / m.fmax) * (TS - 6));
          c.fillStyle = '#e8842a';
          c.fillRect(sx + 1, sy + TS - 3 - h, 2, h);
        }
        // 진행 막대 (아래 가로)
        if (m.rec >= 0 && MRECIPES[m.rec]) {
          const p = clamp(m.prog / MRECIPES[m.rec].t, 0, 1);
          c.fillStyle = '#2a2a32'; c.fillRect(sx + 3, sy + TS - 3, TS - 6, 2);
          c.fillStyle = '#5fc45f'; c.fillRect(sx + 3, sy + TS - 3, Math.round((TS - 6) * p), 2);
        }
        // 축전 잔량
        if (s.store) {
          const p = clamp(m.e / s.store, 0, 1);
          c.fillStyle = '#1e2a28'; c.fillRect(sx + 4, sy + 4, TS - 8, 4);
          c.fillStyle = '#6fe0c0'; c.fillRect(sx + 4, sy + 4, Math.round((TS - 8) * p), 4);
        }
        // 수집 상자 적재량
        if (m.items) {
          const used = m.items.filter(Boolean).length;
          if (used) {
            c.fillStyle = '#d8b06a';
            c.fillRect(sx + 3, sy + TS - 4, Math.round((TS - 6) * used / m.items.length), 2);
          }
        }
        // 상태 점
        c.fillStyle = this.statusColor(m);
        c.fillRect(sx + TS - 4, sy + 2, 2, 2);

        // 순간 이펙트 (포탑 발사 / 함정 방전)
        if (m.fx > 0) {
          m.fx -= 0.35;
          c.globalAlpha = clamp(m.fx / 3, 0, 1) * 0.8;
          c.fillStyle = m.t === 'trap' ? '#9fd8ff' : '#ffd86a';
          c.fillRect(sx - 2, sy - 2, TS + 4, TS + 4);
          c.globalAlpha = 1;
        }
      }
    }
    c.restore();
  }
};

window.Factory = Factory;
