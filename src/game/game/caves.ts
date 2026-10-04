/* ===== game/caves.js — 동굴 — 금 간 자갈 · 지진 · 구역 · 낙석 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { floodFill } from '../../engine/procgen/cells.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { MACH_OF_TILE, T, TILE_DEF } from '../data.js';
import { DECO_MOUNT, LEAVE_OF } from '../data/materials.js';
import { CAVE_TYPES, FAULT } from '../data/ruins.js';
import { TS } from '../world.js';
import { Enemy, Part } from '../entity.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const CavesPart: Bag = {

  /** 금 간 자갈을 깼다 — 곡괭이든 폭탄이든. */
  triggerFault(tx: number, ty: number) { const { WW } = dimsOf(this.world);
    const w = this.world;
    if (this.quake) return;                  // 이미 울리는 중 — 남은 자갈은 다음에 캐면 무너진다
    /* 무너질 칸 = 깬 칸에 **맞닿아 이어진 자갈 전부**. 세계가 굴 자리 전체를 자갈로 채워 두므로 (world.js buildFaults 의 ★) 덩어리 어디를 캐도 같은 굴이
       열린다. */
    const cells: number[][] = floodFill(tx, ty, (x, y) => w.get(x, y) === T.FAULTSTONE, 6000);
    let f = (w.faults || []).find((q: any) => !q.done && Math.abs(q.cx - tx) <= FAULT.rx + 8 && Math.abs(q.cy - ty) <= FAULT.ry + 8);
    // 자갈 한 칸만 박혀 있던 v7 첫 판 세계 — 그때처럼 씨앗에서 굴 모양을 뽑는다
    const old = !cells.length && !!f;
    if (old) cells.push(...w.faultCells(f));
    if (!cells.length) return;
    if (!f) f = { x: tx, y: ty, dir: 1, cx: tx, cy: ty, seed: tx * 9973 + ty * 31 };
    f.done = 1;
    cells.sort((a, b) => Math.hypot(a[0] - tx, a[1] - ty) - Math.hypot(b[0] - tx, b[1] - ty));
    this.quake = { f, cells, t: 0, i: 0, old };
    this.toast(tr('자갈이 무너지자 땅이 울린다 — 물러서라!'), 'bad');
    this.shake = 22;
    this.sfx('sk_quake');
  },
  /* 지진 — 2.6초 동안 흔들리며 새 굴을 차례로 판다(한 번에 파면 화면이 한 프레임에 뒤바뀐다). */
  updateQuake(dt: number) { const { SY, DEEP_Y } = dimsOf(this.world);
    const q = this.quake, w = this.world, p = this.player;
    q.t += dt;
    this.shake = Math.max(this.shake || 0, q.t < 2.2 ? 9 : 3);
    const want = Math.floor(q.cells.length * clamp((q.t - 0.4) / 1.8, 0, 1));
    for (; q.i < want; q.i++) {
      const [x, y] = q.cells[q.i];
      const t = w.get(x, y);
      if (t !== T.FAULTSTONE && !(q.old && w.solid(x, y))) continue;   // 그새 다른 것이 된 칸은 두고
      if (t === T.BEDROCK || MACH_OF_TILE[t]) continue;           // 기계 칸을 지우면 속이 빈 유령 기계가 남는다
      w.set(x, y, T.AIR);
      if (Math.random() < 0.05) this.parts.push(new Part((x + .5) * TS, (y + .5) * TS, '#7a7266', 20, 1));
    }
    q.rockT = (q.rockT || 0) - dt;
    if (q.t < 2.2 && q.rockT <= 0) {
      q.rockT = 0.35;
      const x = Math.floor(p.cx / TS) + Math.floor(Math.random() * 13) - 6;
      let y = Math.floor(p.cy / TS) - 2;
      while (y > Math.floor(p.cy / TS) - 14 && !w.solid(x, y - 1)) y--;
      this.rocks.push({ x: (x + .5) * TS, y: (y + .5) * TS, vy: 0, t: 0.25, dmg: 10 + p.level * 0.6 });
    }
    if (q.t < 2.6 || q.i < q.cells.length) return;
    this.quake = null;
    const f = q.f;
    const k = w.dressFault(f, q.cells);
    const C = CAVE_TYPES[k];
    // 상자 — 새 굴 한가운데에 가까운 바닥에.
    const floors = q.cells.filter(([x, y]: number[]) => w.get(x, y) === T.AIR && w.solid(x, y + 1) && w.get(x, y - 1) === T.AIR);
    floors.sort((a: any, b: any) => Math.hypot(a[0] - f.cx, a[1] - f.cy) - Math.hypot(b[0] - f.cx, b[1] - f.cy));
    /* 상자는 **드물게**(열에 셋) — 무너진 굴마다 상자가 있으면 자갈을 보자마자 캐는 것이 곧 정답이 된다. */
    const chestRng = new RNG(f.seed + 13);
    if (floors.length && chestRng.chance(0.3)) {
      const [gx, gy] = floors[0];
      const tier = gy < SY(180) ? 3 : gy < DEEP_Y ? 4 : 5;
      w.objects.push({ type: 'chest', tier, x: gx * TS, y: (gy - 0.2) * TS, w: 30, h: 26, items: null });
    }
    // 굴에 살던 것들 — 셋, 플레이어에게서 떨어진 바닥에
    const pool = f.y > DEEP_Y ? ['skeleton', 'spider'] : ['bat', 'spider'];
    let made = 0;
    for (const [x, y] of floors.slice().reverse()) {
      if (made >= 3) break;
      if (Math.abs(x * TS - p.cx) < 8 * TS) continue;
      const e = new Enemy(pool[made % pool.length], x * TS, y * TS, this.scale());
      e.y = (y + 1) * TS - e.h;
      this.ents.push(e); made++;
    }
    this.tally = this.tally || {};
    this.tally.faults = (this.tally.faults || 0) + 1;
    this.toast(tr('무너진 벽 너머에 {C|이} 숨어 있었다', { C: C.n }), 'good');
    this.sfx('chapter');
    this.checkAch();
  },

  /** 동굴 쪽 그리기 — 떨어지는 돌(흔들리는 동안은 제자리에서 떤다)과 독기 굴의 탁한 공기 */
  drawCaves(c: any, camX: number, camY: number) {
    for (const r of (this.rocks || [])) {
      const jx = r.t > 0 ? (Math.random() - .5) * 3 : 0;
      const sx = r.x - camX + jx, sy = r.y - camY;
      if (sx < -30 || sx > this.W + 30 || sy < -30 || sy > this.H + 30) continue;
      c.fillStyle = r.kind === 'drip' ? '#9a9488' : r.kind === 'ice' ? '#bfe6f5' : '#6a6258';
      c.beginPath();
      if (r.kind === 'drip' || r.kind === 'ice') { c.moveTo(sx - 7, sy - 10); c.lineTo(sx + 7, sy - 10); c.lineTo(sx, sy + 11); }
      else { c.moveTo(sx - 7, sy - 4); c.lineTo(sx - 2, sy - 8); c.lineTo(sx + 7, sy - 3); c.lineTo(sx + 5, sy + 6); c.lineTo(sx - 5, sy + 7); }
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(sx - 4, sy - 7, 2, 7);
    }
    if (this.caveHere && CAVE_TYPES[this.caveHere].id === 'fume') {
      c.save();
      c.globalAlpha = 0.16 + Math.sin((this.time || 0) * 1.3) * 0.03;
      c.fillStyle = '#9aa84a';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }
  },

  /* 갈래(CAVE_TYPES)마다 몸에 오는 것이 다르게 했다: 이끼 굴은 아물고, 종유 동굴은 머리 위를 봐야 하고, 독기 굴은 숨이 따갑고, 금 간 자갈은 무너뜨리면 숨은 동굴이 열린다 —
     사연: docs/code-history.md#h72 */
  updateCaves(dt: number) {
    const p = this.player, w = this.world;
    if (!p || !w || p.dead) return;
    this.rocks = this.rocks || [];
    this.updateHang();
    this.updateRocks(dt);
    if (this.quake) this.updateQuake(dt);
    if (this.meteor) this.updateMeteor(dt);
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    // 지옥 — 불티가 아래에서 피어올라 떠돈다(경계 위 40칸부터 점점 짙게)
    const hk = clamp((ty - (dimsOf(w).HELL_Y - 40)) / 40, 0, 1);
    if (hk > 0 && Math.random() < dt * 9 * hk) {
      const ex = p.cx + (Math.random() - 0.5) * this.W / (this.viewZoom || 1), ey = p.cy + (0.2 + Math.random() * 0.4) * this.H / (this.viewZoom || 1);
      if (!w.solid(Math.floor(ex / TS), Math.floor(ey / TS)))
        this.parts.push(new Part(ex, ey, Math.random() < 0.3 ? '#ffc070' : '#ff6a2a', -50, 1.6, { spd: 0.12, g: -0.06, r: 0.45, glow: 1, drag: 0.995 }));
    }
    this._caveT = (this._caveT || 0) - dt;
    if (this._caveT > 0) return;
    this._caveT = 0.35;
    const k = w.caveKindAt(tx, ty), C = CAVE_TYPES[k];
    this.caveHere = k;
    /* 갈래가 바뀌면 업적용으로만 센다 — 알림은 띄우지 않는다(구역이 60×55칸이라 굴 근처만 지나가도 떴다) */
    if (k && k !== this._caveLast) {
      this.tally = this.tally || {};
      (this.tally.caves = this.tally.caves || {})[C.id] = 1;
      this.checkAch();
    }
    this._caveLast = k;
    // 갈래마다 몸에 오는 것 — 1초에 한 번
    this._caveTick = (this._caveTick || 0) - 0.35;
    if (this._caveTick <= 0 && k) {
      this._caveTick = 1;
      if (C.id === 'moss' && p.hp < p.d.maxHp) p.heal(Math.max(1, Math.round(p.d.maxHp * 0.012)));
      if (C.id === 'fume') {
        p.hurt(3 + p.level * 0.25);
        for (let i = 0; i < 5; i++) this.parts.push(new Part(p.cx + (Math.random() - .5) * 26, p.cy, '#b8c85a', -18, .7));
      }
    }
    // 종유 동굴 — 머리 위 종유석이 흔들리다 떨어진다.
    this._dripCd = (this._dripCd || 0) - 0.35;
    const fallT = C.id === 'drip' ? T.STALACTITE : C.id === 'frost' ? T.ICICLE : 0;   // 얼음 동굴은 고드름이 떨어진다
    if (fallT && this._dripCd <= 0 && Math.random() < 0.3) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = tx + dx;
        let y = -1;
        for (let dy = 1; dy <= 10; dy++) {
          const t = w.get(x, ty - dy);
          if (t === fallT) { if (w.get(x, ty - dy + 1) !== fallT) y = ty - dy; break; }
          if (w.solid(x, ty - dy)) break;
        }
        if (y < 0) continue;
        w.set(x, y, T.AIR);
        this.rocks.push({ x: (x + .5) * TS, y: (y + .5) * TS, vy: 0, t: 0.7, dmg: 14 + p.level * 0.9, kind: fallT === T.ICICLE ? 'ice' : 'drip' });
        this._dripCd = 5;
        this.tally = this.tally || {};
        if (fallT === T.ICICLE) { if (!this.tally.iceHint) { this.tally.iceHint = 1; this.toast(tr('머리 위 고드름이 갈라진다 — 비켜라!'), 'bad'); } }
        else if (!this.tally.dripHint) { this.tally.dripHint = 1; this.toast(tr('머리 위 종유석이 흔들린다 — 비켜라!'), 'bad'); }
        break;
      }
    }
    // 금 간 자갈 — 가까이 가면 금 사이로 먼지가 흘러내린다(알아보라는 표시)
    for (const f of (w.faults || [])) {
      if (f.done || Math.abs(f.x - tx) > 18 || Math.abs(f.y - ty) > 12) continue;
      if (w.get(f.x, f.y) !== T.FAULTSTONE) { f.done = 1; continue; }   // 다른 까닭으로 사라진 자갈
      this.parts.push(new Part((f.x + Math.random()) * TS, (f.y + 1) * TS, '#c8b890', 30, .9));
    }
  },

  /** 바뀐 칸 둘레의 장식이 기댈 데를 잃었으면 무너뜨린다 — 천장 장식(DECO_MOUNT 'ceil')은 그 아래 줄이 통째로,
      바닥 장식은 그 위 줄이 통째로. 종유석·고드름은 떨어져 바닥에서 부서지고(밑에 있으면 맞는다), 나머지는 그 자리에서 떨어진다.
      ★ 참가자는 세지 않는다 — 호스트가 무너뜨린 칸을 받는다. */
  updateHang() { const { WW } = dimsOf(this.world);
    const w = this.world, q = w.hangQ;
    if (!q || !q.length) return;
    if (this.net && this.net.role === 'guest') { q.length = 0; return; }
    const holds = (t: number, mount: string) => TILE_DEF[t].solid === 1 || DECO_MOUNT[t] === mount || (mount === 'ceil' && !!TILE_DEF[t].leaf);
    const ks = q.splice(0, q.length);
    for (const k of ks) {
      const x = k % WW, y = (k / WW) | 0, t = w.tiles[k];
      if (!holds(t, 'ceil')) for (let yy = y + 1; DECO_MOUNT[w.get(x, yy)] === 'ceil'; yy++) this.dropHung(x, yy);
      if (!holds(t, 'floor')) for (let yy = y - 1; DECO_MOUNT[w.get(x, yy)] === 'floor'; yy--) this.dropHung(x, yy);
    }
  },
  dropHung(x: number, y: number) {
    const w = this.world, t = w.get(x, y);
    w.set(x, y, LEAVE_OF[t] || T.AIR);
    if (t === T.STALACTITE || t === T.ICICLE || t === T.EMBERDRIP) {
      const p = this.player;
      this.rocks.push({ x: (x + .5) * TS, y: (y + .5) * TS, vy: 0, t: 0.12, dmg: 14 + (p ? p.level * 0.9 : 0), kind: t === T.ICICLE ? 'ice' : 'drip', drop: t });
      return;
    }
    this.dropTile(x, y, t);
    this.breakFx(x, y, t);
  },

  /** 떨어지는 돌 — 흔들리는 동안(t) 제자리에서 먼지를 떨구고, 그다음 떨어진다 */
  updateRocks(dt: number) { const { WH } = dimsOf(this.world);
    const p = this.player, w = this.world;
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      if (r.t > 0) {
        r.t -= dt;
        if (Math.random() < dt * 14) this.parts.push(new Part(r.x + (Math.random() - .5) * 10, r.y + 8, '#a8a090', 40, .5));
        continue;
      }
      r.vy = Math.min(900, r.vy + 1500 * dt);
      r.y += r.vy * dt;
      const hitP = Math.abs(r.x - p.cx) < p.w / 2 + 6 && r.y > p.y && r.y < p.y + p.h;
      const hitW = w.solid(Math.floor(r.x / TS), Math.floor((r.y + 8) / TS));
      if (hitP || hitW || r.y > (WH - 2) * TS) {
        if (hitP) { p.hurt(r.dmg, r.x); if (r.kind === 'ice') p.addBuff('frostbite', 2.5); }   // 고드름은 동상(잠깐 느려진다)
        for (let k = 0; k < 12; k++) this.parts.push(new Part(r.x, r.y, r.kind === 'ice' ? '#dff2ff' : '#8a8478', -60, .8));
        this.sfx(r.kind === 'ice' ? 'break_ice' : 'break_stone');
        if (r.drop) this.dropTile(Math.floor(r.x / TS), Math.floor(r.y / TS), r.drop);   // 받침을 잃고 떨어진 것은 조각이 남는다
        this.rocks.splice(i, 1);
      }
    }
  },
};

mixin(Game.prototype, CavesPart, true);
