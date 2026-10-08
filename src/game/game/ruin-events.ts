/* ===== game/ruin-events.js — 유적마다 제 것인 맥박 사건 열여덟(data/ruins.ts PULSE_EVENTS) ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { T, TILE_DEF } from '../data.js';
import { ITEMS } from '../data/items.js';
import { TS } from '../world.js';
import { makeItem } from '../items.js';
import { Drop, Enemy, Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다).
   사건마다 하는 일(동사)이 다르다 — 깨기 전에 부수기 · 따라가기 · 고르기 · 외우기 · 쫓기 · 달아나기 · 골라 치기 · 박자 · 지키기 ·
   자리 잡기 · 오르기 · 참기 · 찾아 파기 · 멈추기 · 피하기 · 발판 타기 · 버티기 · 나르기. 사연: docs/code-history.md#h169 */

/** 끝까지 버티면 해낸 것 — 시간이 다 되는 순간이 성공이다 */
export const EV_SURVIVE: Record<string, 1> = { crown: 1, hush: 1, shadow: 1, sink: 1 };

export const RuinEventsPart: Bag = {

  /* ---- 자리 도우미 ---- */
  evSite(id: string) { return (this.world.ruinSites || []).find((s: any) => s.id === id); },
  /** 방 하나에서 가운데 가까운 **설 수 있는** 칸 [x, 발 밑 줄] */
  evStand(r: Bag) {
    const w = this.world, cx = r.x + (r.w >> 1);
    for (let d = 0; d < r.w >> 1; d++) for (const x of [cx + d, cx - d])
      for (let y = r.y + r.h - 2; y > r.y; y--)
        if (!w.solid(x, y) && !w.solid(x, y - 1) && TILE_DEF[w.get(x, y + 1)].solid) return [x, y + 1];
    return null;
  },
  /** 지금 서 있는 방(없으면 가장 가까운 방) */
  evRoomHere(site: Bag) {
    const p = this.player, tx = p.cx / TS, ty = p.cy / TS;
    let best = null, bd = 1e9;
    for (const r of site.rooms) {
      if (tx > r.x && tx < r.x + r.w && ty > r.y && ty < r.y + r.h) return r;
      const d = Math.hypot(r.x + r.w / 2 - tx, r.y + r.h / 2 - ty);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  },
  /** 설 자리 — 좁은 방에서 못 찾으면 범위를 넓혀 다시(사건이 자리 탓에 통째로 빠지지 않게) */
  evSpot(here: Bag, a: number, b: number) {
    return this.pulseSpot(here, a, b) || this.pulseSpot(here, a, b + 10) || this.pulseSpot(here, 2, b + 24);
  },
  evMob(type: string, at: number[], mul?: number) {
    const w = this.world, p = this.player;
    const m = this.scale() * w.ruinMobMul(Math.floor(p.cx / TS), Math.floor(p.cy / TS)) * (mul || 1);
    const e = new Enemy(type, at[0] * TS, at[1] * TS, m);
    e.x = at[0] * TS + TS / 2 - e.w / 2; e.y = (at[1] + 1) * TS - e.h;
    this.ents.push(e);
    for (let q = 0; q < 10; q++) this.parts.push(new Part(e.cx, e.cy, '#e8303c', -40, .7));
    return e;
  },
  /** 사건이 내놓는 상자 — 탐사 상자 수에는 안 든다(greed) */
  evChest(x: number, footY: number, add: number, spec: Bag) {
    const o = { type: 'chest', tier: clamp((spec.tier || 3) + add, 1, 6), greed: 1, x: x * TS - 15 + TS / 2, y: footY * TS - 26, w: 30, h: 26,
                items: null, bonus: spec.bonus, bonus2: spec.bonus2 };
    this.world.objects.push(o);
    for (let q = 0; q < 30; q++) this.parts.push(new Part(o.x + 15, o.y + 13, '#ffd24a', -40, 1));
    return o;
  },
  evGive(id: string, n: number) {
    if (!ITEMS[id] || n <= 0) return;
    const p = this.player, it = makeItem(id, n)!;
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
  },
  evNear(x: number, y: number, rx: number, ry: number) {
    const p = this.player;
    return Math.abs(p.cx - x) < rx && Math.abs(p.y + p.h - y) < ry;
  },

  /** 사건을 세운다 — 자리가 안 나오면 false(그 사건은 이번엔 건너뛴다) */
  evSetup(ev: Bag, here: Bag) {
    const p = this.player, w = this.world, spec = here.spec, site = this.evSite(ev.id), st = ev.stage;
    const k = ev.k;
    if (k === 'thaw') {
      ev.mobs = []; ev.smashed = 0; ev.max0 = []; ev.seen = new Set();
      const n = 3 + Math.min(2, st);
      for (let i = 0; i < n; i++) {
        const at = this.evSpot(here, 4, 16); if (!at) break;
        const e = this.evMob(i % 3 === 2 ? 'rimeguard' : 'frostbound', at);
        e.frozenT = 7 + i * 6; ev.max0.push(e.frozenT); e.evTag = 'thaw';
        ev.mobs.push(e);
      }
      return ev.mobs.length >= 3;
    }
    if (k === 'ember') {
      if (!site) return false;
      const pts: number[][] = [];
      let from = [p.cx / TS, p.cy / TS];
      const left = site.rooms.slice();
      for (let i = 0; i < 4 && left.length; i++) {
        left.sort((a: any, b: any) => Math.hypot(a.x + a.w / 2 - from[0], a.y + a.h / 2 - from[1]) - Math.hypot(b.x + b.w / 2 - from[0], b.y + b.h / 2 - from[1]));
        const r = left.splice(i === 0 ? 0 : Math.min(1, left.length - 1), 1)[0];
        const s = this.evStand(r); if (!s) continue;
        pts.push(s); from = [s[0], s[1]];
      }
      if (pts.length < 3) return false;
      ev.pts = pts.map(q => [(q[0] + 0.5) * TS, (q[1] - 1.5) * TS]);
      ev.i = 0; ev.ex = p.cx; ev.ey = p.cy - 30; ev.cold = 0; ev.coldT = 0;
      this.ruinDark = 3;
      return true;
    }
    if (k === 'scale') {
      const at = this.evSpot(here, 3, 7); if (!at) return false;
      ev.obj = { x: at[0] * TS - 6, y: (at[1] + 1) * TS - 44, w: 34, h: 44, fx: (at[0] + 0.5) * TS, fy: at[1] + 1 };
      ev.chosen = null;
      return true;
    }
    if (k === 'sundial') {
      const r = site && this.evRoomHere(site);
      if (!r) return false;
      const plates: number[][] = [];
      /* 방 바닥을 따라 서로 셋 칸 넘게 떨어진 자리 넷 — 모자라면 둘레 설 자리에서 */
      for (let x = r.x + 2; x < r.x + r.w - 2 && plates.length < 4; x++)
        for (let y = r.y + r.h - 2; y > r.y; y--)
          if (!w.solid(x, y) && !w.solid(x, y - 1) && TILE_DEF[w.get(x, y + 1)].solid === 1) {
            if (plates.every(q => Math.abs(q[0] - x) > 3)) plates.push([x, y + 1]);
            break;
          }
      for (let g = 0; plates.length < 4 && g < 40; g++) {
        const at = this.evSpot(here, 2, 9);
        if (at && plates.every(q => Math.abs(q[0] - at[0]) > 3 || Math.abs(q[1] - at[1] - 1) > 2)) plates.push([at[0], at[1] + 1]);
      }
      if (plates.length < 4) return false;
      ev.plates = plates.map(q => ({ x: (q[0] + 0.5) * TS, y: q[1] * TS, on: false, lit: false }));
      ev.order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      ev.step = 0; ev.miss = 0; ev.show = 0; ev.showT = 0;
      return true;
    }
    if (k === 'thief') {
      const at = this.evSpot(here, 3, 8); if (!at) return false;
      const e = this.evMob('lampthief', at, 1.3);
      e.lampT = ev.t; e.evLamp = true; e.evTag = 'thief';
      ev.thief = e;
      this.ruinDark = 3;
      return true;
    }
    if (k === 'cavein') {
      if (!site) return false;
      const x0 = (site.x - (site.w >> 1)) * TS, x1 = (site.x + (site.w >> 1)) * TS;
      const fromLeft = p.cx - x0 < x1 - p.cx;               // 가까운 끝에서 무너지기 시작해 먼 쪽으로 쫓아온다
      let lift = null, ld = -1;
      for (const r of site.rooms) {
        const s = this.evStand(r); if (!s) continue;
        const d = fromLeft ? s[0] * TS - p.cx : p.cx - s[0] * TS;
        if (d > ld) { ld = d; lift = s; }
      }
      if (!lift || ld < 12 * TS) return false;
      ev.lift = { x: (lift[0] + 0.5) * TS, y: lift[1] * TS };
      ev.dir = fromLeft ? 1 : -1;
      ev.front = fromLeft ? x0 : x1;
      ev.speed = Math.abs(ev.lift.x - ev.front) / (ev.t * 0.8);
      ev.rockT = 2.5; ev.rock = null; ev.hurtT = 0;
      return true;
    }
    if (k === 'host') {
      ev.need = 3 + Math.min(2, st); ev.got = 0;
      ev.host = this.evNearestMob(p.cx, p.cy, 600, null);
      if (!ev.host) { const at = this.evSpot(here, 5, 12); if (!at) return false; ev.host = this.evMob('blightleech', at); }
      ev.host.evTag = 'host'; ev.hop = null;
      return true;
    }
    if (k === 'heartbeat') {
      ev.sacs = [];
      for (let i = 0; i < 5; i++) {
        let at = null;
        for (let g = 0; g < 12 && !at; g++) {
          const c = this.evSpot(here, 3, 16);
          if (c && ev.sacs.every((e: Enemy) => Math.abs(e.cx / TS - c[0]) > 3)) at = c;
        }
        if (!at) break;
        const e = this.evMob('nestsac', at); e.evTag = 'sac'; ev.sacs.push(e);
      }
      ev.beat = 0; ev.offT = 0;
      return ev.sacs.length >= 4;
    }
    if (k === 'crown') {
      const r = site && this.evRoomHere(site);
      const s = r && this.evStand(r); if (!s) return false;
      ev.crown = { x: (s[0] + 0.5) * TS, y: s[1] * TS, hp: 100 };
      ev.mobs = []; ev.waveT = 3;
      return true;
    }
    if (k === 'clearair') {
      ev.breath = 0; ev.need = 20; ev.hurtT = 0;
      ev.bubbles = [0, 1, 2].map(i => this.evBubble(i));
      return true;
    }
    if (k === 'tide') {
      if (!site) return false;
      let top = null;
      for (const r of site.rooms) { const s = this.evStand(r); if (s && (!top || s[1] < top[1])) top = s; }
      if (!top) return false;
      const bot = (site.y + (site.h >> 1)) * TS;
      if (top[1] * TS > p.y - 4 * TS) {                     // 이미 꼭대기다 — 물이 쫓을 거리가 없다
        return false;
      }
      ev.goal = { x: (top[0] + 0.5) * TS, y: top[1] * TS };
      ev.water = bot; ev.rate = (bot - ev.goal.y + 2 * TS) / (ev.t * 0.92); ev.air = 0; ev.hurtT = 0;
      return true;
    }
    if (k === 'hush') {
      ev.mobs = [];
      for (let i = 0; i < 3 + Math.min(2, st); i++) {
        const at = this.evSpot(here, 3, 14); if (!at) break;
        const e = this.evMob('pagewisp', at); e.y -= TS * 2; e.evTag = 'hush'; ev.mobs.push(e);
      }
      ev.t0 = this.time; ev.page = 0;
      this.onDeafWake = (e: Enemy) => { if (this.pulseEvent === ev && e.evTag === 'hush') ev.loud = 1; };
      return ev.mobs.length >= 2;
    }
    if (k === 'buried') {
      if (!site) return false;
      const x0 = site.x - (site.w >> 1), y0 = site.y - (site.h >> 1);
      const inRoom = (x: number, y: number) => site.rooms.some((r: any) => x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h);
      const ptx = Math.floor(p.cx / TS), pty = Math.floor(p.cy / TS);
      /* 유적 상자 안 · 방 밖의 통바위 칸(둘레 3×3 이 다 막힌 칸)을 모아 멀지도 가깝지도 않은 것을 고른다 */
      const cand: number[][] = [];
      for (let x = x0 + 2; x < x0 + site.w - 2; x++) for (let y = y0 + 2; y < y0 + site.h - 2; y++) {
        const dd = Math.hypot(x - ptx, y - pty);
        if (dd < 7 || dd > 46 || inRoom(x, y)) continue;
        let ok = true;
        for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1; dy++) {
          const t = w.get(x + dx, y + dy);
          if (TILE_DEF[t].solid !== 1 || t === T.BEDROCK || w.locked(x + dx, y + dy)) { ok = false; break; }
        }
        if (ok) cand.push([x, y]);
      }
      if (cand.length) {
        const [x, y] = cand[Math.floor(Math.random() * cand.length)];
        ev.bell = { tx: x, ty: y }; ev.ping = 0;
        return true;
      }
      return false;
    }
    if (k === 'statues') {
      ev.mobs = [];
      for (let i = 0; i < 3; i++) { const at = this.evSpot(here, 9, 20); if (!at) break; const e = this.evMob('froststatue', at); e.evTag = 'statue'; ev.mobs.push(e); }
      return ev.mobs.length >= 2;
    }
    if (k === 'shadow') {
      ev.trail = []; ev.hitCd = 0; ev.sx = p.cx; ev.sy = p.y + p.h;
      return true;
    }
    if (k === 'phase') {
      if (!site) return false;
      const here0 = this.evRoomHere(site);
      const rooms = site.rooms.filter((r: any) => r.h >= 12).sort((a: any, b: any) => (a === here0 ? -1 : 0) - (b === here0 ? -1 : 0) ||
        Math.hypot(a.x - p.cx / TS, a.y - p.cy / TS) - Math.hypot(b.x - p.cx / TS, b.y - p.cy / TS));
      for (const r of rooms) { const built = this.evStair(r); if (built) { Object.assign(ev, built); return true; } }
      return false;
    }
    if (k === 'sink') {
      ev.cells = new Map(); ev.gone = [];
      for (let i = 0; i < 2 + Math.min(2, st); i++) { const at = this.evSpot(here, 4, 14); if (at) this.evMob('hollowling', at).evTag = 'sink'; }
      return true;
    }
    if (k === 'seed') {
      if (!site) return false;
      const at = this.evSpot(here, 3, 8); if (!at) return false;
      const main = site.rooms[0];
      let goalR = main;
      if (Math.hypot(main.x + main.w / 2 - p.cx / TS, main.y + main.h / 2 - p.cy / TS) < 18)
        goalR = site.rooms.slice().sort((a: any, b: any) => Math.hypot(b.x - p.cx / TS, b.y - p.cy / TS) - Math.hypot(a.x - p.cx / TS, a.y - p.cy / TS))[0];
      const g = this.evStand(goalR); if (!g) return false;
      ev.seed = { x: (at[0] + 0.5) * TS, y: (at[1] + 1) * TS, carry: false, vy: 0 };
      ev.goal = { x: (g[0] + 0.5) * TS, y: g[1] * TS };
      ev.hp0 = p.hp;
      for (let i = 0; i < 2 + Math.min(2, st); i++) { const a2 = this.evSpot(here, 6, 20); if (a2) this.evMob('hollowling', a2).evTag = 'seed'; }
      return true;
    }
    return false;
  },

  /** 둘레에서 가장 가까운 산 몹(보스 · 사건 과녁 빼고) */
  evNearestMob(x: number, y: number, max: number, not: any) {
    let best = null, bd = max;
    for (const e of this.ents) {
      if (!(e instanceof Enemy) || e.dead || e.boss || e === not || e.def.trait === 'sac' || e.def.passive) continue;
      const d = Math.hypot(e.cx - x, e.cy - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },
  /** 맑은 공기 방울 — 플레이어 둘레 300px 안에서 태어난다 */
  evBubble(i: number) {
    const p = this.player, a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 200;
    return { x: p.cx + Math.cos(a) * d, y: p.cy - 20 + Math.sin(a) * d * 0.5, r: 62 + (i % 2) * 14,
             vx: (Math.random() - .5) * 50, vy: (Math.random() - .5) * 30, life: 9 + Math.random() * 5 };
  },
  /** 깜빡이는 길 — 방 바닥에서 천장 가까이까지 좌우로 엇갈린 발판 계단(갈래 A · B)을 놓는다. 놓은 칸만 기억해 끝나면 지운다 */
  evStair(r: Bag) {
    const w = this.world, fy = r.y + r.h - 3, cx = r.x + (r.w >> 1);
    const top = r.y + 3;
    if (fy - top < 7) return null;
    const steps: Bag[] = [];
    let side = -1;
    for (let y = fy - 2, i = 0; y > top; y -= 2, i++) {
      const x = cx + side * 2;
      const cells = [x - 1, x, x + 1].filter(q => q > r.x && q < r.x + r.w - 1 && w.get(q, y) === T.AIR);
      if (cells.length < 2) return null;
      steps.push({ y, cells, set: i % 2 });
      side = -side;
    }
    const cy = steps[steps.length - 1].y - 2;
    if (w.get(cx, cy) !== T.AIR || w.get(cx, cy - 1) !== T.AIR) return null;
    // 상자 받침 — 늘 있는 발판 세 칸
    const ledge = [cx - 1, cx, cx + 1].filter(q => w.get(q, cy + 1) === T.AIR);
    for (const q of ledge) w.set(q, cy + 1, T.PLATFORM);
    return { steps, ledge: ledge.map(q => [q, cy + 1]), chestAt: [cx, cy + 1], phaseT: 0, setOn: 0, placed: true };
  },
  evStairShow(ev: Bag, on: number) {
    const w = this.world;
    for (const s of ev.steps) for (const x of s.cells) {
      const want = s.set === on ? T.PLATFORM : T.AIR;
      if (w.get(x, s.y) !== want && (w.get(x, s.y) === T.AIR || w.get(x, s.y) === T.PLATFORM)) w.set(x, s.y, want);
    }
  },

  /** 매 프레임 — true 면 해냈다, false 면 놓쳤다, undefined 면 아직 */
  evTick(ev: Bag, here: Bag, dt: number) {
    const p = this.player, w = this.world, k = ev.k, spec = this.ruinSpec(ev.id);
    if (k === 'thaw') {
      for (const e of ev.mobs) if (e.dead && !ev.seen.has(e)) { ev.seen.add(e); if (e.frozenT > 0) { ev.smashed++; this.toast(tr('언 채로 부쉈다'), 'good'); } }
      if (ev.mobs.every((e: Enemy) => e.dead)) return true;
      return undefined;
    }
    if (k === 'ember') {
      this.ruinDark = Math.max(this.ruinDark || 0, 2.5);
      const tgt = ev.pts[ev.i];
      const d = Math.hypot(p.cx - ev.ex, p.cy - ev.ey);
      const sp = d > 260 ? 0 : d > 170 ? 40 : 80;           // 너무 멀어지면 기다린다 — 길을 잃게 두지 않는다
      const dx = tgt[0] - ev.ex, dy = tgt[1] - ev.ey, L = Math.hypot(dx, dy);
      if (L < 6) {
        ev.i++;
        if (ev.i >= ev.pts.length) {
          const last = ev.pts[ev.pts.length - 1];
          this.evChest(Math.floor(last[0] / TS), Math.floor(last[1] / TS) + 2, 1, spec);
          return true;
        }
      } else { ev.ex += dx / L * sp * dt; ev.ey += dy / L * sp * dt + Math.sin(this.time * 3) * 0.3; }
      // 빛 밖 — 얼어붙는다
      if (d > 150) {
        ev.cold += dt;
        if (ev.cold > 1.2) {
          ev.coldT -= dt;
          if (ev.coldT <= 0) { ev.coldT = 0.8; p.hurt(p.d.maxHp * 0.04, p.cx); for (let i = 0; i < 6; i++) this.parts.push(new Part(p.cx, p.cy, '#cfefff', -30, .6)); }
        }
      } else ev.cold = 0;
      return undefined;
    }
    if (k === 'scale') {
      if (ev.chosen === 'heart_bad') return ev.mobs.every((e: Enemy) => e.dead) ? true : undefined;
      return ev.chosen === 'done' ? true : undefined;
    }
    if (k === 'sundial') {
      if (ev.show < 8) {                                    // 순서 보여 주기 — 두 번
        ev.showT -= dt;
        if (ev.showT <= 0) { ev.showT = 0.8; ev.show++; if (ev.show <= 8) this.sfx('coin'); }
        return undefined;
      }
      for (let i = 0; i < 4; i++) {
        const q = ev.plates[i], on = this.evNear(q.x, q.y, 16, 26);
        if (on && !q.on) {
          if (i === ev.order[ev.step]) {
            q.lit = true; ev.step++; this.sfx('coin');
            for (let n = 0; n < 16; n++) this.parts.push(new Part(q.x, q.y - 6, '#ffe28a', -60, .8));
            if (ev.step >= 4) {
              const mid = ev.plates.reduce((a: number, b: Bag) => a + b.x, 0) / 4;
              this.evChest(Math.floor(mid / TS), Math.floor(ev.plates[0].y / TS), 1, spec);
              return true;
            }
          } else if (!q.lit) {
            ev.miss++; this.sfx('mine'); this.shake = 8;
            p.hurt(p.d.maxHp * 0.1, q.x);
            for (let n = 0; n < 30; n++) this.parts.push(new Part(q.x, q.y - 40, '#e8c888', 80, 1));
            const at = this.pulseSpot(here, 3, 8); if (at) this.evMob('sunscarab', at);
            if (ev.miss >= 3) return false;
            this.toast(tr('틀렸다 — 해가 순서를 다시 보여 준다 ({n}/3)', { n: ev.miss }), 'bad');
            for (const z of ev.plates) z.lit = false;
            ev.step = 0; ev.show = 0; ev.showT = 0.6;
          }
        }
        q.on = on;
      }
      return undefined;
    }
    if (k === 'thief') {
      const e = ev.thief;
      if (e.dead) return true;
      this.ruinDark = Math.max(this.ruinDark || 0, 2.5);
      e.lampT = Math.max(e.lampT, 1);
      const d = Math.hypot(p.cx - e.cx, p.cy - e.cy);
      e.spd = d > 380 ? 55 : 140;                           // 너무 멀어지면 숨을 고른다 — 놓치게만 두지 않는다
      if (!w.ruinInside(Math.floor(e.cx / TS), Math.floor(e.cy / TS))) { e.vx = -e.vx; e.x += e.vx * dt * 3; }
      ev.coinT = (ev.coinT || 0) - dt;
      if (ev.coinT <= 0) { ev.coinT = 0.5; this.parts.push(new Part(e.cx, e.cy, '#ffd24a', -60, 1.2)); }
      return undefined;
    }
    if (k === 'cavein') {
      ev.front += ev.dir * ev.speed * dt;
      const behind = ev.dir > 0 ? p.cx < ev.front : p.cx > ev.front;
      if (Math.random() < dt * 10) this.parts.push(new Part(ev.front, p.cy - 200 + Math.random() * 400, '#8a7a62', 60, 1.2));
      if (behind) {
        ev.hurtT -= dt;
        if (ev.hurtT <= 0) { ev.hurtT = 0.5; p.hurt(p.d.maxHp * 0.12, ev.front); this.shake = Math.max(this.shake, 6); }
      }
      // 머리 위 낙석 — 먼지가 먼저 떨어지고 0.8초 뒤에 돌
      ev.rockT -= dt;
      if (ev.rockT <= 0) { ev.rockT = 2.2; ev.rock = { x: p.cx, t: 0.8 }; }
      if (ev.rock) {
        ev.rock.t -= dt;
        if (Math.random() < dt * 30) this.parts.push(new Part(ev.rock.x + (Math.random() - .5) * 30, p.cy - 120, '#a89878', 120, .6));
        if (ev.rock.t <= 0) {
          if (Math.abs(p.cx - ev.rock.x) < 26) { p.hurt(p.d.maxHp * 0.15, ev.rock.x); this.shake = 10; }
          for (let i = 0; i < 18; i++) this.parts.push(new Part(ev.rock.x, p.y + p.h, '#6a5a48', -120, .8));
          this.sfx('mine'); ev.rock = null;
        }
      }
      if (this.evNear(ev.lift.x, ev.lift.y, 30, 50)) {
        this.evGive('iron_ore', 4 + ev.stage * 2); this.evGive('coal', 4 + ev.stage * 2); this.evGive('deep_ember', 1 + ev.stage);
        return true;
      }
      return undefined;
    }
    if (k === 'host') {
      if (ev.hop) {
        ev.hop.t += dt / 0.6;
        if (ev.hop.t >= 1) { ev.host = ev.hop.to; ev.host.evTag = 'host'; ev.hop = null; this.sfx('sk_blink'); }
        return undefined;
      }
      if (ev.host.dead) {
        ev.got++;
        this.toast(tr('옮겨 붙는 것 — {n}/{need}', { n: ev.got, need: ev.need }), 'good');
        if (ev.got >= ev.need) { this.evGive('corrupt_ess', ev.got); return true; }
        let to = this.evNearestMob(ev.host.cx, ev.host.cy, 700, ev.host);
        if (!to) { const at = this.pulseSpot(here, 5, 14); if (at) to = this.evMob(Math.random() < 0.5 ? 'blightleech' : 'sacling', at); }
        if (!to) return undefined;
        ev.hop = { fx: ev.host.cx, fy: ev.host.cy, to, t: 0 };
      }
      return undefined;
    }
    if (k === 'heartbeat') {
      ev.beat = (ev.beat + dt) % 1.4;
      if (ev.beat < dt) { this.sfx('step'); this.shake = Math.max(this.shake, 1.5); }
      ev.offT -= dt;
      if (ev.sacs.every((e: Enemy) => e.dead)) return true;
      return undefined;
    }
    if (k === 'crown') {
      const c = ev.crown;
      ev.waveT -= dt;
      if (ev.waveT <= 0) {
        ev.waveT = 6.5;
        for (let i = 0; i < 1 + Math.min(2, ev.stage); i++) {
          const at = this.pulseSpot(here, 9, 20); if (!at) continue;
          const e = this.evMob(i % 2 ? 'sporeling' : 'sporegnaw', at); e.goal = { x: c.x, y: c.y - 10 }; e.evTag = 'crown'; ev.mobs.push(e);
        }
      }
      for (const e of ev.mobs) if (!e.dead && Math.abs(e.cx - c.x) < 28 && Math.abs(e.y + e.h - c.y) < 40) {
        c.hp -= 9 * dt;
        if (Math.random() < dt * 8) this.parts.push(new Part(c.x, c.y - 24, '#8fe0c4', -40, .6));
      }
      if (c.hp <= 0) return false;
      return undefined;
    }
    if (k === 'clearair') {
      let inside = false;
      ev.bubbles.forEach((b: Bag, i: number) => {
        b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(this.time + i) * 0.2; b.life -= dt;
        if (Math.random() < dt * 0.6) { b.vx = (Math.random() - .5) * 60; b.vy = (Math.random() - .5) * 34; }
        const far = Math.hypot(b.x - p.cx, b.y - p.cy) > 520;
        if (b.life <= 0 || far) ev.bubbles[i] = this.evBubble(i);
        if (Math.hypot(b.x - p.cx, b.y - p.cy) < b.r) inside = true;
      });
      ev.inside = inside;
      if (inside) { ev.breath += dt; if (ev.breath >= ev.need) { this.evGive('spore_dust', 2 + ev.stage); return true; } }
      else {
        ev.hurtT -= dt;
        if (ev.hurtT <= 0) { ev.hurtT = 1; p.hurt(p.d.maxHp * 0.05, p.cx); for (let i = 0; i < 6; i++) this.parts.push(new Part(p.cx, p.cy, '#8fd0a0', -20, .7)); }
      }
      return undefined;
    }
    if (k === 'tide') {
      ev.water -= ev.rate * dt;
      if (p.cy > ev.water) {
        ev.air += dt;
        p.vx *= 0.92;
        if (ev.air > 3) { ev.hurtT -= dt; if (ev.hurtT <= 0) { ev.hurtT = 0.6; p.hurt(p.d.maxHp * 0.06, p.cx); } }
      } else ev.air = Math.max(0, ev.air - dt * 2);
      if (this.evNear(ev.goal.x, ev.goal.y, 34, 50)) { this.evGive('abyss_pearl', 1 + (ev.stage >> 1)); this.evGive('sunken_coin', 6 + ev.stage * 3); return true; }
      return undefined;
    }
    if (k === 'hush') {
      if (ev.loud || (this.noiseT || -9) > ev.t0 + 0.3) {
        for (const e of ev.mobs) if (!e.dead) e.wakeDeaf(true);
        return false;
      }
      const sec = Math.floor(this.time - ev.t0);
      if (sec >= 10 && sec % 10 === 0 && sec / 10 !== ev.page) {
        ev.page = sec / 10;
        this.toast(tr('낱장이 넘어간다 — {n}/4', { n: ev.page }), 'good');
      }
      return undefined;
    }
    if (k === 'buried') {
      const b = ev.bell, ptx = p.cx / TS, pty = p.cy / TS;
      const d = Math.hypot(b.tx + 0.5 - ptx, b.ty + 0.5 - pty);
      ev.d = d;
      ev.ping -= dt;
      if (ev.ping <= 0) { ev.ping = clamp(d / 12, 0.25, 2.2); this.sfx('coin'); }
      const open = w.get(b.tx, b.ty) === T.AIR;
      if (open && d < 2.2) {
        this.evChest(b.tx, b.ty + 1, 1, spec);
        if (!w.solid(b.tx, b.ty + 1)) w.set(b.tx, b.ty + 1, T.RUINTILE);
        return true;
      }
      return undefined;
    }
    if (k === 'statues') {
      if (ev.mobs.every((e: Enemy) => e.dead)) { this.evGive('frost_core', 1 + (ev.stage >> 1)); return true; }
      return undefined;
    }
    if (k === 'shadow') {
      ev.trail.push([this.time, p.cx, p.y + p.h]);
      const el = ev.max - ev.t;
      const delay = Math.max(1.3, 2.4 - el * 0.035);         // 점점 바짝 붙는다
      while (ev.trail.length > 2 && ev.trail[1][0] < this.time - delay) ev.trail.shift();
      const q = ev.trail[0];
      if (q[0] <= this.time - delay + 0.05) { ev.sx = q[1]; ev.sy = q[2]; ev.on = true; }
      ev.hitCd -= dt;
      if (ev.on && ev.hitCd <= 0 && Math.abs(ev.sx - p.cx) < 16 && Math.abs(ev.sy - (p.y + p.h)) < 30) {
        ev.hitCd = 1.2; p.hurt(p.d.maxHp * 0.14, ev.sx); this.shake = 8; this.sfx('sk_blink');
      }
      return undefined;
    }
    if (k === 'phase') {
      ev.phaseT -= dt;
      if (ev.phaseT <= 0) { ev.phaseT = 1.6; ev.setOn = 1 - ev.setOn; this.evStairShow(ev, ev.setOn); this.sfx('step'); }
      if (!ev.chest) ev.chest = this.evChest(ev.chestAt[0], ev.chestAt[1], 1, spec);
      if (ev.chest.items) return true;
      return undefined;
    }
    if (k === 'sink') {
      const tx = Math.floor(p.cx / TS), ty = Math.floor((p.y + p.h + 2) / TS);
      if (p.onGround) for (const x of [tx, Math.floor((p.x + 2) / TS), Math.floor((p.x + p.w - 2) / TS)]) {
        const key = ty * 100000 + x, t = w.get(x, ty);
        if (TILE_DEF[t].solid === 1 && t !== T.BEDROCK && !w.locked(x, ty) && !ev.cells.has(key) && w.ruinInside(x, ty)) ev.cells.set(key, { x, y: ty, t: 0.55 });
      }
      for (const [key, c] of ev.cells) {
        c.t -= dt;
        if (c.t <= 0 && c.orig === undefined) {
          c.orig = w.get(c.x, c.y); w.set(c.x, c.y, T.AIR); c.back = 5;
          for (let i = 0; i < 6; i++) this.parts.push(new Part((c.x + 0.5) * TS, (c.y + 0.5) * TS, '#7a6a48', 60, .8));
        } else if (c.orig !== undefined) {
          c.back -= dt;
          const ent = Math.floor(p.cx / TS) === c.x && Math.abs(Math.floor(p.cy / TS) - c.y) <= 1;
          if (c.back <= 0 && !ent) { w.set(c.x, c.y, c.orig); ev.cells.delete(key); }
        } else if (Math.random() < dt * 8) this.parts.push(new Part((c.x + 0.5) * TS, c.y * TS, '#a89878', -20, .4));
      }
      return undefined;
    }
    if (k === 'seed') {
      const s = ev.seed;
      if (s.carry) {
        s.x = p.cx + p.facing * 10; s.y = p.y + 6;
        if (p.hp < ev.hp0 - 1) {                            // 맞으면 떨어뜨린다
          s.carry = false; s.vy = -200; this.toast(tr('씨앗을 떨어뜨렸다'), 'bad'); this.sfx('mine');
        }
        if (Math.abs(p.cx - ev.goal.x) < 34 && Math.abs(p.y + p.h - ev.goal.y) < 50) { this.evGive('corrupt_ess', 2 + ev.stage); return true; }
      } else {
        s.vy = Math.min(s.vy + 900 * dt, 500);
        const ny = s.y + s.vy * dt;
        if (w.solid(Math.floor(s.x / TS), Math.floor(ny / TS))) { s.vy = 0; s.y = Math.floor(ny / TS) * TS; } else s.y = ny;
      }
      ev.hp0 = p.hp;
      return undefined;
    }
    return undefined;
  },

  /** 사건 진행 글 — 맥박 막대 밑 */
  evProgress(ev: Bag) {
    const k = ev.k;
    if (k === 'thaw') return tr('{n}/{max} · 언 채로 {s}', { n: ev.mobs.filter((e: Enemy) => e.dead).length, max: ev.mobs.length, s: ev.smashed });
    if (k === 'ember') return `${ev.i}/${ev.pts.length}`;
    if (k === 'sundial') return ev.show < 8 ? tr('보는 중') : `${ev.step}/4 · ✕${ev.miss}`;
    if (k === 'host') return `${ev.got}/${ev.need}`;
    if (k === 'heartbeat') return `${ev.sacs.filter((e: Enemy) => e.dead).length}/${ev.sacs.length}`;
    if (k === 'crown') return `♥ ${Math.max(0, Math.ceil(ev.crown.hp))}`;
    if (k === 'clearair') return `${Math.floor(ev.breath)}/${ev.need}`;
    if (k === 'statues') return `${ev.mobs.filter((e: Enemy) => e.dead).length}/${ev.mobs.length}`;
    if (k === 'buried') return ev.d === undefined ? '' : ev.d < 4 ? tr('뜨겁다') : ev.d < 9 ? tr('따뜻하다') : ev.d < 16 ? tr('서늘하다') : tr('차갑다');
    if (k === 'seed') return ev.seed.carry ? tr('들고 있다') : tr('바닥에');
    const far = (x: number, y: number) => Math.round(Math.hypot(x - this.player.cx, y - this.player.cy) / TS);
    if (k === 'cavein') return tr('{n}칸', { n: far(ev.lift.x, ev.lift.y) });
    if (k === 'tide') return tr('{n}칸', { n: far(ev.goal.x, ev.goal.y) });
    if (k === 'thief' && !ev.thief.dead) return tr('{n}칸', { n: far(ev.thief.cx, ev.thief.cy) });
    if (k === 'phase' && ev.chest) return tr('{n}칸', { n: far(ev.chest.x + 15, ev.chest.y) });
    if (k === 'hush') return `${ev.page}/4`;
    return '';
  },

  /** 사건이 끝날 때 — 세운 것을 걷는다(성공 · 실패 둘 다) */
  evCleanup(ev: Bag, ok: boolean) {
    const k = ev.k, w = this.world, vanish = (e: Enemy) => {
      if (e.dead) return;
      e.dead = true;
      for (let q = 0; q < 14; q++) this.parts.push(new Part(e.cx, e.cy, '#9a8aaa', -30, .8));
    };
    if (k === 'ember' || k === 'thief') this.ruinDark = Math.min(this.ruinDark || 0, 0.6);
    if (k === 'thief' && !ok) vanish(ev.thief);
    if (k === 'heartbeat' && !ok) for (const e of ev.sacs) if (!e.dead) {
      for (let i = 0; i < 2; i++) this.evMob('sacling', [Math.floor(e.cx / TS), Math.floor((e.y + e.h) / TS) - 1]);
      vanish(e);
    }
    if (k === 'hush' && ok) for (const e of ev.mobs) vanish(e);
    if (k === 'hush') this.onDeafWake = null;
    if (k === 'crown') for (const e of ev.mobs) e.goal = null;
    if (k === 'phase') {
      for (const s of ev.steps || []) for (const x of s.cells) if (w.get(x, s.y) === T.PLATFORM) w.set(x, s.y, T.AIR);
      if (!ok) {
        for (const [x, y] of ev.ledge || []) if (w.get(x, y) === T.PLATFORM) w.set(x, y, T.AIR);
        if (ev.chest && !ev.chest.items) { const i = w.objects.indexOf(ev.chest); if (i >= 0) w.objects.splice(i, 1); }
      }
    }
    if (k === 'sink') for (const c of ev.cells.values()) if (c.orig !== undefined) w.set(c.x, c.y, c.orig);
    if (k === 'thaw') for (const e of ev.mobs) e.frozenT = 0;
    if (k === 'crown' && ok) {
      this.evGive('glowcap', 4 + ev.stage); this.evGive('spore_dust', 2 + ev.stage); this.evGive('mushroom', 3);
    }
    if (k === 'thaw' && ok && ev.smashed) { this.evGive('neverthaw', ev.smashed); this.player.gold += 60 * ev.smashed; }
    if (k === 'hush' && ok) { this.evGive('archive_seal', 1); this.evGive('aether_shard', 2 + ev.stage); }
    if (k === 'shadow' && ok) this.evGive('aether_shard', 2 + ev.stage);
    if (k === 'sink' && ok) this.evGive('corrupt_ess', 2 + ev.stage);
  },

  /** 우클릭 — 사건의 것(저울 · 씨앗)이면 받아 쓴다 */
  ruinEvClick(wx: number, wy: number) {
    const ev = this.pulseEvent; if (!ev) return false;
    const p = this.player;
    if (ev.k === 'scale' && !ev.chosen) {
      const o = ev.obj;
      if (wx < o.x - 8 || wx > o.x + o.w + 8 || wy < o.y - 8 || wy > o.y + o.h + 8 || Math.hypot(p.cx - o.fx, p.cy - o.y) > TS * 7) return false;
      this.openScale(ev);
      return true;
    }
    if (ev.k === 'seed' && !ev.seed.carry) {
      const s = ev.seed;
      if (Math.hypot(wx - s.x, wy - s.y) > 30 || Math.hypot(p.cx - s.x, p.cy - s.y) > TS * 3) return false;
      s.carry = true; ev.hp0 = p.hp; this.sfx('coin');
      this.toast(tr('씨앗을 들었다 — 큰 방 한가운데로'), 'good');
      return true;
    }
    return false;
  },
  /** 심장의 저울 — 무엇을 올리나 */
  openScale(ev: Bag) {
    const p = this.player, cost = Math.max(200, Math.round(p.gold * 0.08));
    const lines = [tr('한쪽 접시에는 깃털이 놓여 있다. 다른 쪽은 비어 있다.'),
                   tr('저울대에 글이 새겨져 있다 — 「가벼운 것만 지나간다」.')];
    const done = (msg: string) => { UI.closeDialogue(); this.toast(msg, 'good'); };
    const choices = [
      { t: tr('금화를 올린다 ({n})', { n: cost }), fn: () => {
        if (p.gold < cost) { this.toast(tr('금화가 모자란다'), 'bad'); return; }
        p.gold -= cost; ev.chosen = 'done';
        p.gold += cost * 2; this.evGive('sealed_ash', 2);
        done(tr('저울이 수평을 이뤘다 — 올린 금화가 두 배로 돌아왔다'));
      } },
      { t: tr('심장을 올린다 (지금 체력의 절반)'), fn: () => {
        p.hp = Math.max(1, Math.round(p.hp * 0.5));
        UI.closeDialogue();
        if (Math.random() < 0.65) {
          ev.chosen = 'done';
          const spec = this.ruinSpec(ev.id);
          this.evChest(Math.floor(ev.obj.fx / TS), ev.obj.fy, 2, spec);
          this.evGive('pulse_shard', 2);
          this.toast(tr('심장이 깃털보다 가볍다 — 저울이 길을 연다'), 'good');
        } else {
          ev.chosen = 'heart_bad'; ev.t = Math.max(ev.t, 40); ev.max = Math.max(ev.max, 40);
          const here = this.pulseRuinAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
          ev.mobs = [];
          if (here) for (const type of ['sunscarab', 'sunscarab', 'jarhusk']) { const at = this.pulseSpot(here, 3, 9); if (at) ev.mobs.push(this.evMob(type, at)); }
          this.shake = 12; this.sfx('chapter');
          this.toast(tr('심장이 무겁다 — 삼키는 것들이 깨어난다'), 'bad');
        }
      } },
      { t: tr('(아무것도 올리지 않고 물러난다)'), fn: () => { UI.closeDialogue(); ev.chosen = 'leave'; this.endPulseEvent(false, true); } }
    ];
    UI.openLore(tr('심장의 저울'), lines, choices);
    this.sfx('open');
  },
  /** 둥지의 박동 — 알주머니를 쳤다. 박동이 닫히는 순간(±0.25초)이면 터진다 */
  sacStrike(e: Enemy) {
    const ev = this.pulseEvent;
    if (!ev || ev.k !== 'heartbeat') return true;
    const ph = ev.beat, on = ph < 0.25 || ph > 1.4 - 0.25;
    if (on) { this.sfx('coin'); for (let i = 0; i < 20; i++) this.parts.push(new Part(e.cx, e.cy, '#f0b0e0', -80, .8)); return true; }
    e.flash = 0.2;
    if (ev.offT <= 0) {
      ev.offT = 0.8;
      this.evMob('sacling', [Math.floor(e.cx / TS), Math.floor((e.y + e.h) / TS) - 1]);
      this.toast(tr('엇박 — 주머니가 새끼를 뱉었다'), 'bad');
    }
    return false;
  }
};

mixin(Game.prototype, RuinEventsPart, true);
