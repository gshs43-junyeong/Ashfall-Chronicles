// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== game/act.js — 좌클릭 · 우클릭 · 농사 · 설치물 · 문 ===== */
import { aabb, clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { WW } from '../size.js';
import { MACH_OF_TILE, T, TILE_DEF } from '../data.js';
import { ITEMS, OBJ_SIZE } from '../data/items.js';
import { MACHINE } from '../data/recipes.js';
import { DECO_MOUNT, DECO_OF, FLUID_KIND, LEAVE_OF } from '../data/materials.js';
import { PROF_MAX } from '../data/skills.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Bomb, Drop, Part, makeItem } from '../entity.js';
import { Factory } from '../factory.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const ActPart = {

  /* ================= 좌클릭: 채굴 또는 공격 ================= */
  leftHold(dt) {
    const p = this.player, w = this.world;
    const held = p.held();
    const hd = held && idef(held);
    if (hd && hd.type === 'tool') { this.mine(dt, hd); return; }
    /* 낚싯대를 들고 좌클릭하면 아무 일도 없어야 한다 — 손에 낚싯대가 그려지는데 장착 무기로 공격이 나가면 보이지 않는 검이 허공을 벤다. */
    if (hd && hd.type === 'rod') return;
    if (p.attackReady()) p.doAttack(this.input.wx, this.input.wy);
  },
  mine(dt, tool) {
    const p = this.player, w = this.world;
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { p.mineTx = -1; return; }
    /* 내가 놓은 설치물이 겨눈 자리에 있으면 그것부터 걷어낸다 — 타일이 아니라 오브젝트라서 아래의 타일 채굴 로직으로는 잡히지 않는다. */
    {
      const o = this.findObjAt(this.input.wx, this.input.wy);
      if (o && o.placed && (OBJ_SIZE[o.type] || o.type === 'door')) {
        p.mineTx = -1; p.mineProg = 0;
        if (this.time - (this._stRm || -9) < 0.3) return;
        this._stRm = this.time;
        if (o.type === 'door') this.removeDoor(o); else this.removeStation(o);
        return;
      }
    }
    const id = w.get(tx, ty);
    const def = TILE_DEF[id];
    if (id === T.AIR || !def.drop) { p.mineTx = -1; return; }
    if (def.hard > (tool.power || 1) + (def.tree ? 2 : 0)) {
      p.mineTx = -1;
      if (!this._pickWarn || this.time - this._pickWarn > 1.5) { this._pickWarn = this.time; this.toast(tr('더 좋은 곡괭이가 필요하다'), 'bad'); }
      return;
    }
    if (p.mineTx !== tx || p.mineTy !== ty) { p.mineTx = tx; p.mineTy = ty; p.mineProg = 0; p.mineBeat = 0; }
    const rate = (0.6 + (tool.power || 1) * 0.55 + (tool.chop && def.tree ? 2 : 0)) / (0.45 + def.hard * 0.5);
    p.mineProg += rate * dt;
    /* ★ 캐는 소리는 **박자**로 친다. */
    p.mineBeat = (p.mineBeat || 0) - dt;
    if (p.mineBeat <= 0) {
      p.mineBeat = clamp(0.34 - (tool.power || 1) * 0.025, 0.18, 0.34);
      this.mineTickFx(tx, ty, id);
    }
    if (p.mineProg >= 1) {
      // 동력 곡괭이는 한 칸 캘 때마다 전하를 먹는다
      if (tool.pw && !p.useCharge(tool.pw)) {
        p.mineProg = 0;
        if (!this._pwWarn || this.time - this._pwWarn > 1.5) { this._pwWarn = this.time; this.toast(tr('전하가 없다 — 충전된 배터리가 필요하다'), 'bad'); }
        return;
      }
      p.mineProg = 0;
      /* 기계는 제 등급(TILE_DEF.hard 1~4)대로 캐여 회수된다 — 안에 든 것도 같이, 가방 먼저
         (바닥에 떨군 것은 5분 뒤 사라지고 저장도 안 된다) */
      if (MACH_OF_TILE[id]) {
        const back = Factory.remove(w, tx, ty);
        let spill = 0;
        if (back) for (const it of back) if (!p.addItem(it)) { this.drops.push(new Drop((tx + .5) * TS, (ty + .5) * TS, it)); spill++; }
        if (spill) this.toast(tr('가방이 가득 차 일부를 바닥에 떨궜다 — 5분 안에 주워라'), 'bad');
        UI.refreshBag();
        this.breakFx(tx, ty, id, 1);           // 쇠 파편 + 불티 + 기계가 꺼지는 소리
        return;
      }
      // 수련·물풀·해초는 캐도 그 칸의 물이 남는다(data.js LEAVE_OF)
      w.set(tx, ty, LEAVE_OF[id] || T.AIR);
      p.mined[id] = (p.mined[id] || 0) + 1;
      if (id === T.FAULTSTONE) this.triggerFault(tx, ty);   // 숨은 동굴이 무너져 열린다
      // 등급 5 광물은 다른 돌과 소리가 다르다 — 캐는 순간 "이건 다른 돌"이 들려야 한다
      if (TILE_DEF[id] && TILE_DEF[id].hard >= 5) this.sfx('ore_hit');
      this.checkAch();
      /* ★ 다 여문 작물은 낫으로만 거둔다. */
      const reaping = def.crop && def.crop.ripe;
      if (reaping && !tool.scythe) {
        w.crops.delete(ty * WW + tx);
        this.matBurst('plant', (tx + .5) * TS, (ty + .5) * TS, 12, { spd: 1.1, vy: -40 });
        if (!this._scytheWarn || this.time - this._scytheWarn > 2.5) {
          this._scytheWarn = this.time;
          this.toast(tr('낫 없이 거두면 다 으스러진다 — 낫이 필요하다'), 'bad');
        }
        this.sfx('break_plant', this.strokeRate());
        return;
      }
      this.dropTile(tx, ty, id);
      // 다 여문 작물은 씨앗을 함께 돌려준다 — 한 번 시작하면 밭이 저절로 이어지도록
      if (def.crop) {
        w.crops.delete(ty * WW + tx);
        if (def.crop.ripe) this.harvestBonus(tx, ty, def, tool);
      }
      if (def.crop && def.crop.ripe) {
        // 다 여문 것을 거두는 소리는 부수는 소리가 아니다 — 그대로 둔다
        this.matBurst('plant', (tx + .5) * TS, (ty + .5) * TS, 10, { spd: .9, vy: -40 });
        this.sfx('harvest');
      } else this.breakFx(tx, ty, id);         // 재질 파편 + 재질 파괴음
      if (def.tree) this.fellTree(tx, ty, id === T.WOOD);
    }
  },

  /* ================= 밭은 아침에 자란다 ================= */
  growCropsDaily() {
    const w = this.world; if (!w || !w.crops || !w.crops.size) return;
    const lv = this.player.profLv('farm');
    let grew = 0, ripe = 0;
    const steps = 1 + (this.rng.chance((lv - 1) * 0.07) ? 1 : 0);
    for (let i = 0; i < steps; i++) {
      const g = w.growCrops(this.rng, 1, 99);   // 아침에는 반드시 한 단계 (확률 굴림 없음)
      grew += g.grew.length; ripe += g.ripe.length;
    }
    if (grew + ripe > 0 && this.everPlanted) {
      this.toast(tr('밤새 밭이 자랐다 — {n}칸{v}', { n: grew + ripe, v: ripe ? ` ${tr('· {ripe}칸은 다 여물었다', { ripe })}` : '' }), 'good');
      // 화면 안에 밭이 있으면 티를 낸다
      for (const k of w.crops) {
        const x = k % WW, y = (k / WW) | 0;
        if (Math.abs(x * TS - this.cam.x - this.W / 2) > this.W / 2 + TS) continue;
        if (Math.abs(y * TS - this.cam.y - this.H / 2) > this.H / 2 + TS) continue;
        const d = TILE_DEF[w.get(x, y)];
        if (!d || !d.crop) continue;
        for (let i = 0; i < 2; i++)
          this.parts.push(new Part((x + .5) * TS, (y + .6) * TS, d.crop.ripe ? '#ffe08a' : '#8fc85a', -22, .5));
      }
    }
  },

  /* ================= 농사 숙련 ================= */
  harvestBonus(tx, ty, def, tool) {
    const p = this.player, lv = p.profLv('farm');
    const at = (it) => this.drops.push(new Drop((tx + .5) * TS, (ty + .5) * TS, it));
    // 별무늬 낫(reap)은 벤 자리마다 한 번 더 여문 것이 딸려 온다
    const reap = !!(tool && tool.reap);

    // ① 씨앗 — 3레벨 '고른 씨앗'부터는 반드시 하나 이상 돌아온다
    let seeds = (lv >= 3 ? 1 : 0) + (Math.random() < 0.5 + (lv - 1) * 0.04 ? 1 : 0);
    if (seeds > 0) at(makeItem(def.crop.seed, seeds));

    // ② 수확물 한 번 더 — 레벨마다 5%씩.
    const yieldId = def.drop;
    if (yieldId) {
      let extra = 0;
      if (Math.random() < (lv - 1) * 0.05) extra++;
      if (lv >= 6 && Math.random() < 0.25) extra++;
      if (reap) extra++;
      if (extra > 0) at(makeItem(yieldId, extra));
    }

    // ③ 10레벨 '풍요의 손' — 거둔 자리에 저절로 다시 심긴다
    if (lv >= PROF_MAX && this.world.plantSeed(tx, ty, def.crop.seed)) {
      for (let i = 0; i < 4; i++)
        this.parts.push(new Part((tx + .5) * TS, (ty + .6) * TS, '#8fc85a', -30, .5));
    }

    p.addProf('farm', 1);
  },

  /** 타일 하나가 부서질 때 떨어질 것을 굴린다. */
  dropTile(x, y, id) {
    const d = TILE_DEF[id];
    let out = d.drop;
    if (d.leafDrop) { const r = this.rng.weighted(d.leafDrop); out = r === 'none' ? null : r; }
    if (out) this.drops.push(new Drop((x + .5) * TS, (y + .5) * TS, makeItem(out, d.dropN && out === d.drop ? this.rng.int(d.dropN[0], d.dropN[1]) : 1)));
    // 장식이면 그 장식도 하나 — 옮겨 놓을 수 있게(data.js 의 deco 절).
    const deco = DECO_OF[id];
    if (deco && deco !== out) this.drops.push(new Drop((x + .5) * TS, (y + .5) * TS, makeItem(deco, 1)));
  },

  /** 벌목 — 기둥을 자르면 그 위 기둥이 무너지고, 살아 있는 기둥에서 떨어져 나간 잎 *덩어리**가 통째로 함께 떨어진다. */
  fellTree(tx, ty, wasTrunk) {
    const w = this.world;
    const leafy = id => !!TILE_DEF[id].leaf;

    // 1) 기둥 — 잘린 높이(ty)와 그 위쪽만 무너진다.
    if (wasTrunk) {
      const st = [[tx, ty - 1], [tx - 1, ty], [tx + 1, ty]];
      let guard = 0;
      while (st.length && guard++ < 600) {
        const [x, y] = st.pop();
        if (y > ty || Math.abs(x - tx) > 3 || w.get(x, y) !== T.WOOD) continue;
        w.set(x, y, T.AIR);
        this.dropTile(x, y, T.WOOD);
        st.push([x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]);
      }
    }

    // 2) 잎 덩어리 — 잘린 자리 주변만 훑는다(가장 큰 정글 수관이 반경 5, 높이 13).
    const R = 9, seen = new Set();
    for (let y = ty - 22; y <= ty + R; y++) {
      for (let x = tx - R; x <= tx + R; x++) {
        const id0 = w.get(x, y);
        if (!leafy(id0) || seen.has(y * WW + x)) continue;
        const group = [], st = [[x, y]];
        seen.add(y * WW + x);
        let touching = false, guard = 0;
        while (st.length && guard++ < 900) {
          const [cx, cy] = st.pop();
          group.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy, nid = w.get(nx, ny);
            if (nid === T.WOOD) { touching = true; continue; }
            if (!leafy(nid)) continue;
            const k = ny * WW + nx;
            if (seen.has(k)) continue;
            seen.add(k); st.push([nx, ny]);
          }
        }
        if (touching) continue;                 // 아직 기둥에 걸려 있다 — 살린다
        for (const [gx, gy] of group) {
          const gid = w.get(gx, gy);
          w.set(gx, gy, T.AIR);
          this.dropTile(gx, gy, gid);
          // 그 잎에 매달려 있던 덩굴도 같이 쏟아진다
          for (let v = 1; v <= 8 && w.get(gx, gy + v) === T.VINE; v++) {
            w.set(gx, gy + v, T.AIR);
            this.dropTile(gx, gy + v, T.VINE);
          }
        }
      }
    }
  },

  /** 폭탄 던지기 — 커서 쪽으로. */
  throwBomb(slot) {
    const p = this.player, it = p.bag[slot], d = idef(it);
    if (!it) return;
    const dx = this.input.wx - p.cx, dy = this.input.wy - p.cy;
    const len = Math.max(1, Math.hypot(dx, dy));
    const pow = clamp(len * 1.7, 240, 620);               // 멀리 찍을수록 세게, 상한 있음
    const b = new Bomb(p.cx, p.cy - 6, (dx / len) * pow, (dy / len) * pow - 140, d);
    this.projs.push(b);
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    // 터뜨린 횟수는 세이브에 없던 값이다 — 업적('터뜨려 본 사람')이 여기를 읽는다.
    this.tally.bomb = (this.tally.bomb || 0) + 1;
    UI.refreshBag(); this.sfx('place');
  },

  /** (tx, ty) 바로 위로 전주 기둥이 내려오는가 — factory.js가 기둥을 그리는 규칙 (전주 칸 아래로 첫 고체를 만날 때까지)과 같은 판정이다. */
  _poleAbove(tx, ty) {
    const w = this.world;
    for (let y = ty - 1; y >= ty - 40 && y > 2; y--) {
      const m = Factory.at(w, tx, y);
      if (m) return m.t === 'pole';
      if (w.solid(tx, y)) return false;        // 지붕·바위가 가로막으면 기둥은 여기까지 안 온다
    }
    return false;
  },

  /* ================= 우클릭 ================= */
  rightClick() {
    if (this.state !== 'play' || this.uiOpen) return;
    const p = this.player, w = this.world;
    // 1) 상호작용 대상
    const o = this.findObjAt(this.input.wx, this.input.wy);
    if (o && dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2) < TS * 7) { this.interact(o); return; }
    // 1.5) 낚싯대 — 물 블록을 겨눠야 캐스팅된다
    {
      const heldR = p.held();
      if (heldR && idef(heldR).type === 'rod') { this.tryFish(); return; }
    }
    /* 1.55) 폭탄 — 커서 쪽으로 던진다. */
    {
      const hb = p.held();
      if (hb && idef(hb).type === 'bomb') { this.throwBomb(p.sel); return; }
    }

    /* 1.6) 소비품 — 핫바에 든 채로 바로 먹는다(급한 건 싸우는 도중인데 가방을 열었다 닫는 사이에 죽는다). */
    {
      const hc = p.held();
      if (hc && idef(hc).type === 'consum') { this.useConsumable(p.sel); return; }
      // 1.7) 유적 위치 지도 — 펴 보면 그 유적 자리가 나침반에 잡힌다
      if (hc && idef(hc).type === 'map') { this.useRuinMap(p.sel); return; }
    }
    // 2) 기계: 이미 놓인 것은 열고, 손에 든 것은 설치한다
    const mtx = Math.floor(this.input.wx / TS), mty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (mtx + .5) * TS, (mty + .5) * TS) <= TS * 7) {
      const mac = Factory.at(w, mtx, mty);
      if (mac) {
        // 벨트 위에서 멈춰 버린 물건(3초+)은 창을 열지 않고 바로 집는다
        if (mac.it && Factory.stalled(mac)) {
          const id = mac.it.id;
          if (Factory.takeStalled(mac, p)) { this.toast(tr('{item}{item|을} 벨트에서 집었다', { item: ITEMS[id].n }), 'good'); UI.refreshBag(); this.sfx('place'); }
          else this.toast(tr('가방이 가득 찼다'), 'bad');
          return;
        }
        UI.openMachine(mac); this.sfx('open'); return;
      }
      const hi = p.held();
      if (hi && idef(hi).type === 'machine') {
        if (w.inRig(mtx, mty)) { this.toast(tr('채취탑 자리에는 놓을 수 없다'), 'bad'); return; }
        if (!Factory.canPlace(w, mtx, mty)) { this.toast(tr('그 자리에는 놓을 수 없다'), 'bad'); return; }
        // 벨트 말고는 몸이 있는 기계다 — 제 몸이나 몹이 선 칸에 놓으면 그 안에 낀다
        const cell = { x: mtx * TS, y: mty * TS, w: TS, h: TS };
        if (TILE_DEF[MACHINE[idef(hi).mach].tile].solid === 1 &&
            (aabb(cell, p.rect()) || this.ents.some(e => !e.dead && aabb(cell, e.rect())))) {
          this.toast(tr('누가 서 있는 자리다'), 'bad'); return;
        }
        const placed = Factory.place(w, mtx, mty, idef(hi).mach, this.placeDirFor(idef(hi).mach));
        // 발사형 함정은 누가 놓았는지에 따라 편이 갈린다 — 내가 놓은 건 적을 쏜다
        if (placed && MACHINE[placed.t].proj) placed.own = 1;
        hi.c--; if (hi.c <= 0) p.bag[p.sel] = null;
        UI.refreshBag(); this.sfx('place');
        return;
      }
    }
    // 3) 농사 — 괭이로 밭을 갈고, 씨앗을 심고, 퇴비를 준다
    if (dist(p.cx, p.cy, (mtx + .5) * TS, (mty + .5) * TS) <= TS * 6) {
      const hi = p.held();
      const hd = hi && idef(hi);
      if (hd && hd.hoe) {
        const t = w.get(mtx, mty);
        if (w.inRig(mtx, mty - 1)) { this.toast(tr('채취탑 자리다'), 'bad'); return; }
        /* 전주 기둥이 내려오는 열은 갈 수 없다. */
        if (this._poleAbove(mtx, mty)) { this.toast(tr('전신주 기둥이 지나가는 자리다'), 'bad'); return; }
        if ((t === T.DIRT || t === T.GRASS || t === T.SNOW || t === T.CORRUPTGRASS) && w.get(mtx, mty - 1) === T.AIR) {
          w.set(mtx, mty, T.FARMLAND);
          for (let i = 0; i < 5; i++) this.parts.push(new Part((mtx + .5) * TS, mty * TS, '#6b4a2f'));
          this.sfx('hoe');
        } else this.toast(tr('흙이나 풀 위에서만 밭을 갈 수 있다'), 'bad');
        return;
      }
      if (hd && hd.type === 'seed') {
        if (hd.fert) {                               // 퇴비 — 자라는 중인 작물을 한 단계 밀어 준다
          if (!w.forceGrow(mtx, mty)) { this.toast(tr('다 자란 작물에는 쓸 수 없다'), 'bad'); return; }
          for (let i = 0; i < 8; i++) this.parts.push(new Part((mtx + .5) * TS, (mty + .5) * TS, '#8fd06a', -40));
        } else {
          // 전주 기둥이 지나가는 열에는 심지 않는다 — 괭이와 같은 이유(그림이 겹친다)
          if (this._poleAbove(mtx, mty + 1)) { this.toast(tr('전신주 기둥이 지나가는 자리다'), 'bad'); return; }
          if (!w.plantSeed(mtx, mty, hi.id)) { this.toast(tr('갈아 둔 밭 위에만 심을 수 있다'), 'bad'); return; }
          this.everPlanted = 1;   // 마을에 원래 있던 장식 밭 때문에 매일 알림이 뜨지 않게
        }
        hi.c--; if (hi.c <= 0) p.bag[p.sel] = null;
        UI.refreshBag(); this.sfx('place');
        return;
      }
    }

    // 3.5) 설치물(작업대·용광로·저장 상자) 놓기
    {
      const hi = p.held();
      if (hi && idef(hi).type === 'station') { this.placeStation(mtx, mty); return; }
      if (hi && idef(hi).type === 'door') { this.placeDoor(mtx, mty); return; }
    }

    // 4) 블록 설치
    const held = p.held();
    if (held && idef(held).type === 'block') {
      const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
      if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) return;
      /* 빈칸 말고 **액체 칸**에도 놓는다 — 물이 흐르게 된 뒤로는 블록을 물속에 끼워 넣어 물길을 막는 것이 물을 다루는 유일한 방법이다. */
      const cur = w.get(tx, ty);
      if (cur !== T.AIR && !(FLUID_KIND[cur] && !LEAVE_OF[cur])) return;
      const near = w.get(tx - 1, ty) || w.get(tx + 1, ty) || w.get(tx, ty - 1) || w.get(tx, ty + 1) || w.wall(tx, ty);
      if (!near) return;
      /* 잠긴 골방 안에는 아무것도 못 놓는다 — 안에 발판을 놓아 밖에서 타고 넘거나, 문틀 옆에 블록을 끼워 판정을 흔드는 길을 막는다. */
      if (w.inLockedVault(tx, ty)) { this.toast(tr('잠긴 골방 안에는 놓을 수 없다'), 'bad'); return; }
      if (w.inRig(tx, ty)) { this.toast(tr('채취탑 자리에는 놓을 수 없다'), 'bad'); return; }
      const tileId = idef(held).tile;
      if (TILE_DEF[tileId].solid === 1 && aabb({ x: tx * TS, y: ty * TS, w: TS, h: TS }, p.rect())) return;
      // 장식은 기댈 데가 있어야 한다(data.js DECO_MOUNT) — 같은 장식끼리는 이어 붙는다
      const mount = DECO_MOUNT[tileId];
      if (mount === 'water') {
        if (cur !== T.WATER || TILE_DEF[w.get(tx, ty + 1)].solid !== 1) {
          this.toast(tr('고인 물속 바닥에만 놓을 수 있다'), 'bad');
          return;
        }
      } else if (mount && FLUID_KIND[cur]) {
        this.toast(tr('물속에는 놓을 수 없다'), 'bad');
        return;
      } else if (mount) {
        const by = mount === 'floor' ? ty + 1 : ty - 1, bt = w.get(tx, by);
        if (TILE_DEF[bt].solid !== 1 && bt !== tileId) {
          this.toast(mount === 'floor' ? tr('단단한 바닥 위에만 놓을 수 있다') : tr('천장에 매달아야 한다'), 'bad');
          return;
        }
      }
      w.set(tx, ty, tileId);
      held.c--; if (held.c <= 0) p.bag[p.sel] = null;
      UI.refreshBag(); this.sfx('place');
    }
  },
  /* ================= 설치물 ================= */
  /** tx,ty 는 발자국의 **왼쪽 아래** 칸. */
  placeStation(tx, ty) {
    const p = this.player, w = this.world;
    const it = p.held(), d = idef(it);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast(tr('너무 멀다'), 'bad'); return; }
    const s = OBJ_SIZE[d.obj];
    const tw = s.tw || 1, th = s.th || 1;
    const x0 = tx, y0 = ty - th + 1;   // 발자국 좌상단
    for (let yy = y0; yy <= ty; yy++) for (let xx = x0; xx < x0 + tw; xx++) {
      if (w.get(xx, yy) !== T.AIR) { this.toast(tr('빈 자리에만 놓을 수 있다'), 'bad'); return; }
      if (w.inRig(xx, yy)) { this.toast(tr('채취탑 자리에는 놓을 수 없다'), 'bad'); return; }
      if (Factory.at(w, xx, yy)) { this.toast(tr('이미 기계가 있다'), 'bad'); return; }
    }
    for (let xx = x0; xx < x0 + tw; xx++)
      if (!w.solid(xx, ty + 1)) { this.toast(tr('바닥이 있어야 놓을 수 있다'), 'bad'); return; }
    // 이미 다른 설치물·NPC가 그 자리를 쓰고 있는지 — 발자국 전체(px)로 검사한다
    const box = { x: x0 * TS, y: y0 * TS, w: tw * TS, h: th * TS };
    for (const o of w.objects) {
      if (!OBJ_SIZE[o.type] && o.type !== 'npc') continue;
      if (aabb(box, { x: o.x, y: o.y, w: o.w, h: o.h })) { this.toast(tr('그 자리에는 놓을 수 없다'), 'bad'); return; }
    }
    const o = {
      type: d.obj, placed: 1,
      x: Math.round(x0 * TS + (tw * TS - s.w) / 2), y: (ty + 1) * TS - s.h, w: s.w, h: s.h
    };
    if (d.obj === 'crate') { o.slots = d.slots; o.items = new Array(d.slots).fill(null); if (d.gold) o.gold = 1; }
    else o.lv = 1;
    w.objects.push(o);
    it.c--; if (it.c <= 0) p.bag[p.sel] = null;
    for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, (ty + .5) * TS, '#d8b06a', -30, .5));
    UI.refreshBag(); this.sfx('place');
  },
  /* ================= 문 ================= */
  placeDoor(tx, ty) {
    const p = this.player, w = this.world;
    const it = p.held();
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast(tr('너무 멀다'), 'bad'); return; }
    const y0 = ty - 1;                       // 겨눈 칸이 문의 **아랫칸** — 위로 한 칸 더 선다
    for (let yy = y0; yy <= ty; yy++) {
      if (w.get(tx, yy) !== T.AIR) { this.toast(tr('빈 자리에만 달 수 있다'), 'bad'); return; }
      if (w.inRig(tx, yy)) { this.toast(tr('채취탑 자리에는 달 수 없다'), 'bad'); return; }
      if (Factory.at(w, tx, yy)) { this.toast(tr('이미 기계가 있다'), 'bad'); return; }
    }
    if (!w.solid(tx, ty + 1)) { this.toast(tr('바닥이 있어야 문을 단다'), 'bad'); return; }
    if (w.inLockedVault(tx, ty)) { this.toast(tr('잠긴 골방 안에는 놓을 수 없다'), 'bad'); return; }
    const box = { x: tx * TS, y: y0 * TS, w: TS, h: TS * 2 };
    for (const o of w.objects) {
      if (!OBJ_SIZE[o.type] && o.type !== 'npc' && o.type !== 'door') continue;
      if (aabb(box, { x: o.x, y: o.y, w: o.w, h: o.h })) { this.toast(tr('그 자리에는 놓을 수 없다'), 'bad'); return; }
    }
    /* 문틀 안에 서 있는 채로 달면 닫힌 문에 갇힌다 — 그때만 열어 둔 채로 세운다. */
    const dir = p.facing >= 0 ? 1 : -1;
    const inside = aabb(w.doorEdge({ x: tx * TS, y: y0 * TS, w: TS, h: TS * 2, dir }), p.rect());
    w.pushDoor(tx * TS, y0 * TS, TS, TS * 2, dir, { placed: 1, closed: !inside, sw: inside ? 1 : 0 });
    it.c--; if (it.c <= 0) p.bag[p.sel] = null;
    for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, (ty + .5) * TS, '#8a6a42', -30, .5));
    UI.refreshBag(); this.sfx('place');
  },
  /** 문 회수 — 내가 단 것만. */
  removeDoor(o) {
    const p = this.player, w = this.world;
    if (!o.placed) return false;
    const it = makeItem('door_wood', 1);
    if (!p.addItem(it)) this.drops.push(new Drop(o.x + o.w / 2, o.y + o.h / 2, it));
    let i = w.objects.indexOf(o); if (i >= 0) w.objects.splice(i, 1);
    i = w.doors.indexOf(o); if (i >= 0) w.doors.splice(i, 1);
    this.matBurst('wood', o.x + o.w / 2, o.y + o.h / 2, 12, { spd: 1.1 });
    UI.refreshBag(); this.sfx('break_wood', this.strokeRate());
    return true;
  },

  /** 설치물 회수 — 곡괭이 등급과 무관하게 한 번에 걷어낸다(기계와 같은 감각). */
  removeStation(o) {
    const p = this.player, w = this.world;
    if (!o.placed) return false;
    const back = [];
    if (o.type === 'crate') {
      back.push(makeItem(o.gold ? 'crate_gold' : 'crate_wood', 1));
      for (const it of (o.items || [])) if (it) back.push(it);
    } else back.push(makeItem(o.type === 'forge' ? 'station_forge' : 'station_work', 1));
    for (const it of back) if (!p.addItem(it)) this.drops.push(new Drop(o.x + o.w / 2, o.y + o.h / 2, it));
    const i = w.objects.indexOf(o);
    if (i >= 0) w.objects.splice(i, 1);
    // 작업대·화로는 나무와 돌로 짜인 것이다 — 쇠 기계와 다른 소리가 나야 한다
    this.matBurst('wood', o.x + o.w / 2, o.y + o.h / 2, 10, { spd: 1.1 });
    this.matBurst('stone', o.x + o.w / 2, o.y + o.h / 2, 5, { spd: .9 });
    UI.refreshBag(); this.sfx('break_wood', this.strokeRate());
    return true;
  },
};
mixin(G, ActPart);
