/* ===== factory/tick.js — 공장 틱 — 전력 · 물류 · 기계마다 일하기 ===== */
import { app as G } from '../ctx.js';
import { shade } from '../../engine/core/color.js';
import { TAU, aabb, angleTo, dist2 } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tileHash } from '../../engine/core/rng.js';
import { N_ } from '../lang.js';
import { dimsOf } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { FUEL, MACHINE, MRECIPES } from '../data/recipes.js';
import { TS } from '../world.js';
import { TileArt } from '../tileart.js';
import { makeItem } from '../items.js';
import { Enemy, Part, Proj } from '../entity.js';
import { DIR4, FAC_TICK, Factory } from '../factory.js';
/* factory.ts 의 Factory 에서 나눈 조각 — 읽히는 순간 Factory 에 붙는다(main.js 가 factory.ts 다음에 읽는다). */

export const FactoryTickPart: Bag = {

  /* ================= 틱 ================= */
  tick(w, G) { const { WW } = dimsOf(w);
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
      if (!m.on) { m.st = N_('정지'); continue; }
      if (!n) { m.st = N_('망 없음'); continue; }
      if (n.off) { m.st = N_('전면 정지'); continue; }
      if (s.sky) {
        // 풍차: 연료 대신 트인 하늘이 필요하다.
        let clear = true;
        for (let k = 1; k <= s.sky; k++) if (this.blocksWind(w, m.x, m.y - k)) { clear = false; break; }
        if (!clear) { m.st = N_('바람 막힘'); continue; }
        n.gen += s.gen; m.st = N_('회전 중');
        continue;
      }
      if (n.dem <= 0 && n.e >= n.emax) { m.st = N_('대기'); continue; }   // 쓸 데가 없으면 연료를 아낀다
      if (m.fuel <= 0) {
        for (const k in m.in) { if (!FUEL[k]) continue; this.bufTake(m.in, k, 1); m.fuel = m.fmax = FUEL[k]; break; }
      }
      if (m.fuel > 0) { m.fuel--; n.gen += s.gen; m.st = N_('가동'); }
      else m.st = N_('연료 없음');
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
      if (!m.on && m.t !== 'switch') { m.st = N_('정지'); m.act = 0; continue; }
      switch (m.t) {
        case 'drill': case 'drill_e': case 'drill_x': this.runDrill(w, m, s); break;
        case 'pump': this.runPump(w, m, s); break;
        case 'turret': this.runTurret(w, m, s, G); break;
        case 'trap': this.runTrap(w, m, s, G); break;
        case 'dart': case 'flamejet': case 'frostjet': this.runShooter(w, m, s, G); break;
        case 'switch': m.st = m.on ? N_('가동 중') : N_('전면 정지'); m.act = 0; break;
        case 'belt': case 'belt_fast': m.st = m.it ? N_('이송') : N_('대기'); m.act = 0; break;
        case 'sorter': m.act = m.it ? 1 : 0; break;
        case 'pole': m.st = m.net >= 0 ? N_('망 #{n}') : '—'; m.act = 0; break;
        case 'crate': m.st = m.feed ? N_('배출 중') : N_('보관'); m.act = 0; break;
        case 'gen': case 'windmill': break;   // 전력 정산에서 이미 처리했다
        case 'sprinkler': {                   // 물이 있을 때만 전력을 먹는다(act) — 전력이 없으면 아침에 물을 안 준다
          m.act = (m.in.water_bucket > 0 || m.wl > 0) ? 1 : 0;
          m.st = !m.act ? N_('물 없음') : this.sat(w, m) > 0 ? N_('아침을 기다림') : m.net < 0 ? N_('망 없음') : N_('전력 없음');
          break;
        }
        default: if (s.proc) this.runProc(w, m, s); break;
      }
    }

    /* ---- 3. 물류 ---- */
    /* 벨트 · 분류기 먼저 — 비는 칸이 생기면 한 틱 안에 다시 훑는다. 한 번만 돌면 뒤 벨트가 앞 벨트보다 먼저
       차례를 받을 때 한 틱(0.125초)씩 멈칫해, 줄지어 가는 물건 사이가 벌어지고 모퉁이에서 끊겨 보였다. */
    for (let moved = 1, pass = 0; moved && pass < 16; pass++) {
      moved = 0;
      for (const m of ms.values()) {
        if (m.t === 'belt' || m.t === 'belt_fast') {
          if (!m.it || m.just) continue;
          if (m.it.t0 !== undefined && this.now - m.it.t0 < this.DWELL[m.t] - FAC_TICK / 2) continue;   // 아직 칸을 건너는 중(틱은 프레임에 맞춰 ±반 틱 흔들린다)
          if (this.pushTo(w, m, m.dir, m.it.id)) { m.it = null; moved++; if (!pass) G.sfxAt('belt', m.x, m.y); }
        } else if (m.t === 'sorter') {
          if (!m.it || m.just) continue;
          if (this.sat(w, m) <= 0) { m.st = N_('전력 없음'); continue; }
          const match = !m.f || m.f === m.it.id;
          m.st = match ? N_('통과') : N_('분기');
          if (this.pushTo(w, m, match ? m.dir : (m.dir + 1) & 3, m.it.id)) { m.it = null; moved++; }
        }
      }
    }
    for (const m of ms.values()) {                       // 기계 출력 배출
      /* 앞이 받는 것을 찾을 때까지 차례로 — 첫 것만 보면 안 받는 출력(밀링기의 거름 → 화덕)이 줄을 영영 막았다 */
      if (m.out) {
        for (const k in m.out) if (m.out[k] > 0 && this.pushTo(w, m, m.dir, k)) { this.bufTake(m.out, k, 1); break; }
      } else if (m.t === 'crate' && m.feed) {
        for (let i = 0; i < m.items.length; i++) {
          const it = m.items[i];
          if (!it || !this.pushTo(w, m, m.dir, it.id)) continue;
          it.c--; if (it.c <= 0) m.items[i] = null;
          break;
        }
      }
    }
  },

  /** 풍차 위를 막는가 — 고체 타일과 다른 기계 둘 다 바람을 가린다 */
  blocksWind(w, x, y) { const { WW } = dimsOf(w);
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
      if (pick < 0) { m.st = s.store ? (m.e >= s.store ? N_('가득 참') : N_('축전 중')) : N_('재료 없음'); m.prog = 0; m.act = 0; return; }
      const r = MRECIPES[pick];
      if (this.outFull(m, r, cap)) { m.st = N_('출력 가득'); m.act = 0; return; }
      for (const k in r.in) this.bufTake(m.in, k, r.in[k]);   // 착수 시점에 재료를 잡아 둔다
      m.rec = pick; m.prog = 0;
    }
    const r = MRECIPES[m.rec];
    /* ★ 연료를 태우기 **전에** 출구를 본다 — 뒤에서 보면 막힌 채 매 틱 연료만 탔다(용광로 50초에 석탄 5개) */
    if (m.prog >= r.t && this.outFull(m, r, cap)) { m.st = N_('출력 가득'); m.act = 0; return; }
    let step = 1;
    if (s.fuelIn) { if (!this.burn(m)) { m.st = N_('연료 없음'); return; } }
    // 전력이 끊겼을 때 act를 내리면 안 된다 — 수요가 사라져 sat이 1로 돌아가고, 그러면 발전기 없이도 한 틱씩 공짜로 도는 톱니 현상이 생긴다
    else { step = this.sat(w, m); if (step <= 0) { m.st = m.net < 0 ? N_('망 없음') : N_('전력 없음'); return; } }
    m.act = 1;
    if (m.prog < r.t) { m.prog += step; m.st = N_('가동'); if (s.fuelIn && Math.random() < 0.18) this.puff(m); }
    if (m.prog < r.t) return;
    if (this.outFull(m, r, cap)) { m.st = N_('출력 가득'); m.act = 0; return; }
    for (const k in r.out) this.bufAdd(m.out, k, r.out[k]);
    m.prog = 0; m.rec = -1;
    G.sfxAt(m.t === 'oven' ? 'cook' : 'smelt', m.x, m.y);
  },

  /** 벨트·분류기 위에서 3초 넘게 멈춘 물건인가 — 플레이어가 집어 갈 수 있다(불러온 뒤 시각이 없는 것도 멈춘 것으로 본다) */
  stalled(m) {
    if (!m.it || !(m.t === 'belt' || m.t === 'belt_fast' || m.t === 'sorter')) return false;
    const t0 = m.it.t0 !== undefined ? m.it.t0 : -1e9;
    return G.time - t0 >= (this.DWELL[m.t] || FAC_TICK) + 3;
  },
  /** 멈춘 물건을 가방으로. 가져갔으면 true */
  takeStalled(m, p) {
    if (!this.stalled(m)) return false;
    if (!p.addItem(makeItem(m.it.id, 1))) return false;
    m.it = null;
    return true;
  },

  SHAKE: { drill: 1, drill_e: 1.3, drill_x: 1.6, press: 0.6, pressor: 0.8, gen: 0.5, pump: 0.4, mill: 0.5 },   // 일할 때 몸체 떨림(px)

  /** 일하는 모습 — 기계마다 한 가지 움직임. 일하지 않으면(act 0) 그리지 않는다. */
  drawWork(c, w, m, sx, sy, time, camX, camY) { const { WW } = dimsOf(w);
    if (!m.on || !m.act) return;
    const cx = sx + TS / 2, cy = sy + TS / 2, t = time + m.x * 0.37;
    c.save();
    switch (m.t) {
      case 'drill': case 'drill_e': case 'drill_x': {
        if (!m.tgt) break;
        const elec = m.t !== 'drill';
        const gx = (m.tgt[0] + .5) * TS - camX, gy = (m.tgt[1] + .5) * TS - camY;
        const ang = Math.atan2(gy - cy, gx - cx);
        // 어느 광맥을 캐는지 — 옅은 점선이 흘러간다
        c.globalAlpha = .3; c.strokeStyle = elec ? '#8fd0ff' : '#e8b060'; c.lineWidth = 1;
        c.setLineDash([2, 3]); c.lineDashOffset = -t * 24;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(gx, gy); c.stroke(); c.setLineDash([]);
        c.globalAlpha = 1;
        // 나사 비트 — 광맥 쪽으로 튀어나와 돈다(줄무늬가 뒤로 흐른다)
        c.translate(cx, cy); c.rotate(ang);
        const L = 8, ph = (t * (elec ? 44 : 20)) % 3;
        c.fillStyle = '#6a6e76'; c.fillRect(7, -2.5, L, 5);
        c.fillStyle = '#c8ccd4'; for (let x = 7 + ph; x < 7 + L; x += 3) c.fillRect(x, -2.5, 1, 5);
        c.fillStyle = '#e0e4ea'; c.beginPath(); c.moveTo(7 + L, -2.5); c.lineTo(7 + L + 4, 0); c.lineTo(7 + L, 2.5); c.fill();
        c.restore(); c.save();                                         // 회전을 풀고 광맥 쪽을 그린다
        // 광맥의 금 — 남은 횟수가 줄수록 늘어난다(광상은 줄지 않으니 가는 금만)
        const k = m.tgt[1] * WW + m.tgt[0], left = w.oreHits[k];
        const tot = this.ORE_HITS + ((tileHash(m.tgt[0], m.tgt[1]) * 10) | 0);
        const n = left === undefined ? 1 : 1 + Math.round((1 - left / tot) * 5);
        c.strokeStyle = 'rgba(20,16,12,.75)'; c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const h1 = tileHash(m.tgt[0] + i * 7, m.tgt[1]), h2 = tileHash(m.tgt[0], m.tgt[1] + i * 13);
          const ax = gx - TS / 2 + 2 + h1 * (TS - 4), ay = gy - TS / 2 + 2 + h2 * (TS - 4);
          c.moveTo(ax, ay); c.lineTo(ax + (h2 - .5) * 10, ay + (h1 - .5) * 10); c.lineTo(ax + (h1 - .5) * 14, ay + (h2 - .2) * 12);
        }
        c.stroke();
        if (time - (m.hitT || -9) < 0.1) {                           // 캔 순간 번쩍
          c.globalAlpha = .45; c.fillStyle = elec ? '#cfeaff' : '#fff0c0'; c.fillRect(gx - TS / 2, gy - TS / 2, TS, TS);
        }
        break;
      }
      case 'smelter': case 'oven': case 'gen': {                     // 불 — 아궁이 불빛이 일렁인다
        const f = 0.55 + 0.45 * Math.sin(t * 13) * Math.sin(t * 7.3);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.35 + f * 0.35;
        const g = c.createRadialGradient(cx, sy + TS - 5, 0, cx, sy + TS - 5, 11);
        g.addColorStop(0, '#ffb050'); g.addColorStop(1, 'rgba(255,90,20,0)');
        c.fillStyle = g; c.fillRect(sx - 2, sy + 4, TS + 4, TS);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        c.fillStyle = f > .6 ? '#ffe08a' : '#ff9a3a';
        c.fillRect(cx - 3 + Math.round(Math.sin(t * 9) * 1.5), sy + TS - 7, 2, 2);
        break;
      }
      case 'press': case 'pressor': {                                // 피스톤 — 내려찍고 올라간다
        const k = Math.max(0, Math.sin(t * (m.t === 'pressor' ? 5 : 6.5)));
        const d = Math.round(k * k * 6);
        c.fillStyle = '#9aa0a8'; c.fillRect(cx - 1, sy - 3, 2, 4 + d);
        c.fillStyle = '#c8ccd4'; c.fillRect(cx - 6, sy + 1 + d, 12, 2);
        c.fillStyle = '#5a5e66'; c.fillRect(cx - 6, sy + 3 + d, 12, 1);
        break;
      }
      case 'assembler': {                                            // 팔 — 좌우로 집어 옮긴다
        const a = -Math.PI / 2 + Math.sin(t * 3.2) * 0.9;
        const ex = sx + 6 + Math.cos(a) * 9, ey = sy - 1 + Math.sin(a) * 9 + 9;
        c.strokeStyle = '#d8b46a'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(sx + 6, sy + 8); c.lineTo(ex, ey); c.stroke();
        c.fillStyle = '#e8e0c8'; c.fillRect(ex - 2, ey - 1, 4, 2);
        break;
      }
      case 'refinery': case 'desal': {                               // 거품 — 창 안에서 오른다
        c.fillStyle = m.t === 'desal' ? 'rgba(200,240,255,.8)' : 'rgba(255,230,160,.8)';
        for (let i = 0; i < 4; i++) {
          const q = (t * 9 + i * 4.3) % 12;
          c.fillRect(sx + 6 + ((i * 5 + (q | 0)) % 10), sy + TS - 5 - q, 1.5, 1.5);
        }
        break;
      }
      case 'pump': {                                                 // 흔들대 — 끄덕이며 퍼 올린다
        const a = Math.sin(t * 2.6) * 0.35;
        c.translate(cx, sy - 1); c.rotate(a);
        c.fillStyle = '#6a5a44'; c.fillRect(-9, -1.5, 18, 3);
        c.fillStyle = '#8a7a60'; c.fillRect(-11, -3, 4, 6);
        c.fillStyle = '#3a3026'; c.fillRect(8, 1, 1, 6 + Math.round(a * 8));
        break;
      }
      case 'mill': {                                                 // 톱니 — 돈다
        c.translate(cx, cy); c.rotate(t * 2.4);
        c.fillStyle = '#b8a888';
        for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.fillRect(-1, -7, 2, 3); }
        c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.fill();
        c.fillStyle = '#5a4a3a'; c.beginPath(); c.arc(0, 0, 1.5, 0, TAU); c.fill();
        break;
      }
      case 'battery': case 'battery_hi': {                           // 충전 — 위로 흐르는 화살
        const q = (t * 1.6) % 1;
        c.fillStyle = '#9ff0c8'; c.globalAlpha = 1 - q;
        const y = sy + TS - 6 - q * 10;
        c.beginPath(); c.moveTo(cx, y - 3); c.lineTo(cx + 3, y); c.lineTo(cx - 3, y); c.fill();
        break;
      }
    }
    c.restore();
  },

  /** 포탑 — 받침대는 타일 그림에서 잘라 쓰고, 머리·총열은 조준 방향(m.aim)으로 돌린다. 쏘면(fx) 총열이 뒤로 밀린다. */
  drawTurret(c, m, sx, sy, v) {
    c.drawImage(TileArt.atlas, v * TS, T.M_TURRET * TS + TS - 8, TS, 8, sx, sy + TS - 8, TS, 8);
    const want = m.aim !== undefined ? m.aim : -Math.PI / 2;
    if (m.aimV === undefined) m.aimV = want;
    let d = ((want - m.aimV + Math.PI * 3) % TAU) - Math.PI;                 // 가까운 쪽으로
    m.aimV += d * 0.18;
    const hx = sx + TS / 2, hy = sy + 11, base = '#55555f', kick = m.fx > 0 ? 2 : 0;
    c.save();
    c.translate(hx, hy); c.rotate(m.aimV);
    c.fillStyle = '#1e1e26'; c.fillRect(2 - kick, -2, 10, 4);                // 총열
    c.fillStyle = '#8a8e99'; c.fillRect(2 - kick, -2, 10, 1.4);
    c.fillStyle = '#d8dce4'; c.fillRect(11 - kick, -3, 2.5, 6);             // 총구
    c.restore();
    c.fillStyle = shade(base, 1.7); c.beginPath(); c.arc(hx, hy, 6.5, 0, TAU); c.fill();   // 머리(총열 위에 — 뿌리를 덮는다)
    c.fillStyle = shade(base, 1.1); c.beginPath(); c.arc(hx + Math.cos(m.aimV), hy + 1 + Math.sin(m.aimV) * .5, 4.6, 0, TAU); c.fill();
    c.fillStyle = '#e0563c'; c.fillRect(Math.round(hx - Math.cos(m.aimV) * 3) - 1, Math.round(hy - Math.sin(m.aimV) * 3) - 1, 2.5, 2.5);   // 조준등
  },

  /** 캔 순간 — 광맥에서 파편이 튀고, 가까우면 땅이 조금 울린다(멀면 안 뿌린다) */
  drillFx(bx, by, col) {
    const p = G.player; if (!p || !G.parts) return;
    const px = (bx + .5) * TS, py = (by + .5) * TS, d = Math.hypot(px - p.cx, py - p.cy);
    if (d > 900) return;
    for (let i = 0; i < 6; i++) G.parts.push(new Part(px, py, i % 2 ? col : '#8a8478', -70, .35, { g: 1, spd: .55 }));
    if (d < 6 * TS) G.shake = Math.max(G.shake || 0, 1.5);
  },
  /** 연료 기계의 연기 한 덩이 — 굴뚝(칸 위)에서 느리게 오른다 */
  puff(m) {
    const p = G.player; if (!p || !G.parts) return;
    const px = (m.x + .5) * TS, py = m.y * TS;
    if (Math.hypot(px - p.cx, py - p.cy) > 900) return;
    G.parts.push(new Part(px + (Math.random() - .5) * 6, py, 'rgba(120,114,108,.55)', -28, 1.4, { g: -0.12, sq: 0, r: 2.2, spd: 0.2, drag: 0.9 }));
  },

  /** 물건 그림의 칸 안 높이(px) — 가로 벨트는 띠 윗면(TS-9)에 얹히고, 세로·대각선·기계는 가운데쯤. */
  itemOff(m) {
    if ((m.t === 'belt' || m.t === 'belt_fast') && (m.dir === 0 || m.dir === 2)) return TS - 9 - 14;
    return 4;
  },
  /** 벨트 한 칸 — **옆에서 본 모습**. run 0→1 = 물건이 한 칸을 가는 동안(물건과 같은 시계).
      가로(0·2): 아랫단 틀 · 굴대 둘 · 윗면 띠(무늬가 흐른다). 세로(1·3): 양옆 기둥 사이로 발판이 오르내리는 승강 벨트.
      대각선(4·5): 비탈 띠. 무늬 간격은 칸 길이를 나눠 떨어지게 — 옆 칸과 이어져 한 줄로 흐른다. */
  drawBelt(c, sx, sy, key, dir, run) {
    const fast = key === 'belt_fast';
    const FR = fast ? '#6a7684' : '#5c5046', FR2 = fast ? '#3c4550' : '#3a312a', BAND = '#202328';
    const TREAD = fast ? '#8c9cac' : '#6a6f78', RL = fast ? '#9aa6b2' : '#8a8078';
    const gap = TS / 4;
    const flow = (sg, len) => ((run * len * sg) % gap + gap) % gap;    // 흐르는 무늬의 시작점
    c.save();
    if (dir === 0 || dir === 2) {
      const sg = dir === 0 ? 1 : -1, top = sy + TS - 9;
      c.fillStyle = FR2; c.fillRect(sx, top + 2, TS, 7);                // 틀
      c.fillStyle = FR; c.fillRect(sx, top + 2, TS, 1);
      c.fillStyle = BAND; c.fillRect(sx, top, TS, 2); c.fillRect(sx, sy + TS - 1, TS, 1);   // 윗면 띠 · 돌아오는 띠
      c.fillStyle = TREAD;
      for (let x = flow(sg, TS) - gap; x < TS; x += gap) {
        const x0 = Math.max(0, x), x1 = Math.min(TS, x + 2);
        if (x1 > x0) c.fillRect(sx + x0, top, x1 - x0, 1);
      }
      const r = 2.5, ang = run * (TS / r) * sg;                        // 띠가 TS 가는 동안 굴대가 도는 각
      for (const cx of [sx + TS * 0.27, sx + TS * 0.73]) {
        const cy = top + 5.5;
        c.fillStyle = RL; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
        c.strokeStyle = FR2; c.lineWidth = 1;
        c.beginPath(); c.moveTo(cx - Math.cos(ang) * r, cy - Math.sin(ang) * r); c.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); c.stroke();
      }
    } else if (dir === 1 || dir === 3) {
      const sg = dir === 1 ? 1 : -1;
      c.fillStyle = 'rgba(20,22,26,.75)'; c.fillRect(sx + 5, sy, TS - 10, TS);   // 뒤판
      c.fillStyle = TREAD;
      for (let y = flow(sg, TS) - gap; y < TS; y += gap) {             // 발판
        const y0 = Math.max(0, y), y1 = Math.min(TS, y + 2);
        if (y1 > y0) c.fillRect(sx + 5, sy + y0, TS - 10, y1 - y0);
      }
      c.fillStyle = FR; c.fillRect(sx + 2, sy, 3, TS); c.fillRect(sx + TS - 5, sy, 3, TS);   // 기둥
      c.fillStyle = FR2; c.fillRect(sx + 4, sy, 1, TS); c.fillRect(sx + TS - 5, sy, 1, TS);
    } else {
      const L = TS * Math.SQRT2;
      c.translate(sx + TS / 2, sy + TS / 2);
      c.rotate(dir === 4 ? -Math.PI / 4 : -Math.PI * 3 / 4);
      c.beginPath(); c.rect(-L / 2, -5, L, 10); c.clip();
      c.fillStyle = FR2; c.fillRect(-L / 2, -1, L, 5);
      c.fillStyle = BAND; c.fillRect(-L / 2, -3, L, 2);
      c.fillStyle = TREAD;
      for (let x = flow(1, L) * (L / TS) - gap; x < L; x += gap) c.fillRect(-L / 2 + x, -3, 2, 1);
    }
    c.restore();
  },

  outFull(m, r, cap) {
    for (const k in r.out) if ((m.out[k] || 0) + r.out[k] > cap) return true;
    return false;
  },

  /* ---- 드릴: 반경 안의 광맥을 실제로 캐낸다 (캐낸 자리는 사라진다) ---- */
  runDrill(w, m, s) { const { WW } = dimsOf(w);
    let step = 1;
    if (s.fuelIn) { if (!this.burn(m)) { m.st = N_('연료 없음'); return; } }
    else { step = this.sat(w, m); if (step <= 0) { m.st = m.net < 0 ? N_('망 없음') : N_('전력 없음'); return; } }
    if (this.bufTotal(m.out) >= (s.cap || 40)) { m.st = N_('출력 가득'); m.act = 0; return; }
    m.act = 1;
    m.cd -= step;
    if (m.cd > 0) { m.st = N_('채굴 중'); return; }
    const R = s.range;
    let best = null, bestD = 1e9;
    for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
      const tx = m.x + dx, ty = m.y + dy;
      const def = TILE_DEF[w.get(tx, ty)];
      if (!def.ore || !def.drop || def.hard > s.mine) continue;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = [tx, ty, def.drop]; }
    }
    if (!best) { m.cd = 0; m.st = N_('광맥 없음'); m.act = 0; m.tgt = null; return; }
    /* 광맥 한 칸 = 20~29번(칸마다 고정). 광상(rich)은 줄지 않는다 — 곡괭이로 캐면 몇 개에 그친다 */
    const [bx, by] = best, k = by * WW + bx;
    this.drillFx(bx, by, TILE_DEF[w.get(bx, by)].c);
    if (!TILE_DEF[w.get(bx, by)].rich) {
      if (w.oreHits[k] === undefined) w.oreHits[k] = this.ORE_HITS + ((tileHash(bx, by) * 10) | 0);
      if (--w.oreHits[k] <= 0) { delete w.oreHits[k]; w.set(bx, by, T.AIR); }
    }
    m.tgt = [bx, by]; m.hitT = G.time;
    this.bufAdd(m.out, best[2], 1);
    m.cd = s.cycle;
    m.st = N_('채굴 중');
    G.sfxAt('drill', m.x, m.y);
  },

  /* ---- 시추 펌프: 유혈암을 소모하지 않는다. 마르지 않는 대신 느리다 ---- */
  runPump(w, m, s) {
    const step = this.sat(w, m);
    if (step <= 0) { m.st = m.net < 0 ? N_('망 없음') : N_('전력 없음'); return; }
    if (this.bufTotal(m.out) >= (s.cap || 40)) { m.st = N_('출력 가득'); m.act = 0; return; }
    let found = false;
    const R = s.range;
    for (let dx = -R; dx <= R && !found; dx++) for (let dy = -R; dy <= R; dy++)
      if (w.get(m.x + dx, m.y + dy) === T.OILSHALE) { found = true; break; }
    if (!found) { m.st = N_('유혈암 없음'); m.act = 0; return; }
    m.act = 1;
    m.cd -= step;
    if (m.cd > 0) { m.st = N_('시추 중'); return; }
    this.bufAdd(m.out, 'crude_oil', 1);
    m.cd = s.cycle;
    m.st = N_('시추 중');
  },

  /* ---- 자동 포탑 ---- */
  runTurret(w, m, s, G) {
    const step = this.sat(w, m);
    if (step <= 0) { m.st = m.net < 0 ? N_('망 없음') : N_('전력 없음'); return; }
    if (!(m.in[s.ammo] > 0)) { m.st = N_('탄약 없음'); m.act = 0; return; }
    m.act = 1;
    /* 목표는 장전 중에도 찾는다 — 총열(m.aim)이 적을 따라 돌고, 쏠 때는 이미 그쪽을 보고 있다 */
    const cx = m.x * TS + TS / 2, cy = m.y * TS + 11;
    let tgt = null, bd = s.range * s.range;
    for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      const d = dist2(cx, cy, e.cx, e.cy);
      if (d < bd) { bd = d; tgt = e; }
    }
    if (tgt) m.aim = angleTo(cx, cy, tgt.cx, tgt.cy);
    m.cd -= step;
    if (m.cd > 0) { m.st = N_('경계'); return; }
    if (!tgt) { m.cd = 0; m.st = N_('경계'); return; }
    this.bufTake(m.in, s.ammo, 1);
    const ang = m.aim;
    const dmg = s.dmg * (1 + G.player.level * 0.05);
    // 포탑은 몸이 있는 칸이라 한가운데서 쏘면 제 칸에 부딪혀 사라진다 — 총구(칸 반지름 + 3px) 밖에서 낸다
    const mz = TS / 2 + 5, mx = cx + Math.cos(ang) * mz, my = cy + Math.sin(ang) * mz;
    const p = new Proj(mx, my, Math.cos(ang) * 1150, Math.sin(ang) * 1150, dmg, 'player', 'bullet');
    G.projs.push(p);
    m.cd = s.cycle;
    m.st = N_('사격');
    m.fx = 3;
    /* 탄피 · 총구 연기 · 가까우면 짧은 울림 — 포탑이 쏘는 게 몸으로 느껴지게(화면 밖은 안 뿌린다) */
    const pl = G.player, d = pl ? Math.hypot(cx - pl.cx, cy - pl.cy) : 1e9;
    if (d < 900) {
      const back = ang + Math.PI + (Math.cos(ang) >= 0 ? -0.9 : 0.9);
      const shell = new Part(cx, cy, '#d8b048', -110, 0.7, { g: 1.3, spd: 0.25 });
      shell.vx = Math.cos(back) * 90; G.parts.push(shell);
      G.parts.push(new Part(mx, my, 'rgba(170,170,170,.55)', -18, 0.7, { g: -0.1, sq: 0, r: 2, spd: 0.15, drag: 0.9 }));
      if (d < 7 * TS) G.shake = Math.max(G.shake || 0, 1.2);
    }
    G.sfxAt('turret', m.x, m.y);
  },

  /* ---- 발사형 함정 (화살·화염·서리) ---- */
  runShooter(w, m, s, G) {
    m.cd -= 1;
    if (m.cd > 0) { m.st = N_('장전 중'); m.act = 0; return; }
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
    if (!tgt) { m.st = N_('대기'); m.act = 0; return; }
    m.act = 1;
    const ang = Math.atan2(dy, dx);
    const dmg = s.dmg * (1 + G.player.level * 0.03);
    const pr = new Proj(cx + dx * 12, cy + dy * 12, Math.cos(ang) * 620, Math.sin(ang) * 620,
      dmg, m.own ? 'player' : 'enemy', s.proj);
    if (s.burn) pr.fire = 1;
    if (s.slow) pr.frost = 1;
    G.projs.push(pr);
    m.cd = s.cycle;
    m.st = N_('발사');
    m.fx = 2;
    G.sfxAt(s.proj === 'fire' ? 'zap' : 'turret', m.x, m.y);
  },

  /* ---- 전격 함정: 위에 올라선 적만 지진다 (플레이어는 안전) — 함정도 몸이 있는 칸이라 들어올 수는 없다 ---- */
  runTrap(w, m, s, G) {
    const r = { x: m.x * TS, y: (m.y - 1) * TS, w: TS, h: TS + 2 };   // 윗칸 + 윗면에 닿은 발
    /* ★ 세계가 지은 함정(gen, 유적 공장)은 망 없이 돌고 **올라선 누구든** 지진다 — 망을 찾으면 영영 꺼져 있었다 */
    if (m.gen && !m.own) return this.runWildTrap(w, m, r, G);
    const step = this.sat(w, m);
    if (step <= 0) { m.st = m.net < 0 ? N_('망 없음') : N_('전력 없음'); return; }
    m.act = 1;
    m.cd -= step;
    if (m.cd > 0) { m.st = N_('대기'); return; }
    let hit = 0;
    for (const e of G.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      if (!aabb(r, e.rect())) continue;
      e.hurt(s.dmg * (1 + G.player.level * 0.04), false, G.player, 2);
      hit++;
    }
    m.st = hit ? N_('방전') : N_('대기');
    if (hit) { m.cd = 4; m.fx = 3; G.sfxAt('zap', m.x, m.y); } else m.cd = 1;
  },
  /** 유적 함정 — 밟으면 0.5초 불꽃으로 알리고 그때도 위에 있으면 방전, 2초 쉰다. */
  runWildTrap(w, m, r, G) {
    const p = G.player, on = !p.dead && aabb(r, p.rect());
    let foe = false;
    for (const e of G.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) { foe = true; break; }
    if (m.cd > 0) { m.cd--; m.st = N_('식는 중'); m.act = 0; return; }
    if (!m.arm) {
      if (!on && !foe) { m.st = N_('대기'); m.act = 0; return; }
      m.arm = 4;
    }
    m.act = 1; m.st = N_('충전');
    if (--m.arm > 0) {
      for (let i = 0; i < 2; i++) G.parts.push(new Part((m.x + Math.random()) * TS, m.y * TS - 1, '#9fd8ff', -40, .25));
      return;
    }
    m.arm = 0; m.cd = 16; m.fx = 3; m.st = N_('방전');
    if (on && p.iframe <= 0) p.hurt(26 + p.level * 1.1);
    for (const e of G.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) e.hurt(34, false, null, 0);
    G.sfxAt('zap', m.x, m.y);
  },
};
mixin(Factory, FactoryTickPart);
