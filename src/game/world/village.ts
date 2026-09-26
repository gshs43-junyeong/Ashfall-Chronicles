/* ===== world/village.js — 여명 마을 · 공창 · 폭주로 · 공방 · 성채 · 심층 갱도 · 상인 · 마을 개선 ===== */
import { factory as Factory } from '../ctx.js';
import { aabb } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { tr } from '../lang.js';
import { CAMP_X1, HELL_Y, SHIFT, SKY_Y, SX, SY, WORLD_BOT, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { OBJ_SIZE } from '../data/items.js';
import { MERCHANTS } from '../data/npcs.js';
import { DAWN_BUILDINGS, DAWN_INSIDE, DAWN_OBJ, DAWN_PLAZA, DAWN_WALL, TS, World } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldVillage: Bag & ThisType<World> = {

  /* ---- 마을: 오두막 3채 + 작업대 + 용광로 + NPC ---- */
  buildVillage(x0, x1, gy, rng) {
    const huts = [
      { x: x0 + 2, w: 13, npc: 'elara' },
      { x: x0 + 19, w: 14, npc: 'borin' },
      { x: x0 + 37, w: 12, npc: 'mira' }
    ];
    for (const h of huts) {
      const hh = 7, bx = h.x, by = gy - hh;
      for (let x = bx; x < bx + h.w; x++)
        for (let y = by; y < gy; y++) {
          const edge = (x === bx || x === bx + h.w - 1 || y === by);
          this.set(x, y, edge ? T.PLANK : T.AIR);
          this.setWall(x, y, 4);
        }
      for (let x = bx - 1; x <= bx + h.w; x++) this.set(x, by - 1, T.PLANK);
      this.set(bx + 2, by + 1, T.TORCH);
      this.set(bx + h.w - 3, by + 1, T.TORCH);
      for (let x = bx; x < bx + h.w; x++) this.set(x, gy, T.PLANK);
      // 출입구 — 양쪽 벽에 두 칸씩 뚫고 여닫이문을 단다
      const rx = bx + h.w - 1;
      this.set(bx, gy - 1, T.AIR); this.set(bx, gy - 2, T.AIR);
      this.set(rx, gy - 1, T.AIR); this.set(rx, gy - 2, T.AIR);
      this.pushDoor(bx * TS, (gy - 2) * TS, TS, TS * 2, -1);
      this.pushDoor(rx * TS, (gy - 2) * TS, TS, TS * 2, 1);
      this.objects.push({ type: 'npc', npc: h.npc, x: (bx + h.w / 2) * TS, y: gy * TS - 44, w: 22, h: 44 });
    }
    // 광장 — 작업대/용광로는 플레이어가 직접 만들어 놓는 것과 **같은 크기**(OBJ_SIZE)를 쓴다 — 사연: docs/code-history.md#h106
    const cx = x0 + 50;                      // 오두막 바로 오른쪽 — x1 과 묶지 않는다(캠프 폭을 바꿔도 오두막과 안 겹치게)
    const wbS = OBJ_SIZE.workbench, fgS = OBJ_SIZE.forge;
    this.objects.push({ type: 'workbench', x: (cx - 4) * TS, y: gy * TS - wbS.h, w: wbS.w, h: wbS.h, lv: 1 });
    this.objects.push({ type: 'forge', x: (cx + 3) * TS, y: gy * TS - fgS.h, w: fgS.w, h: fgS.h, lv: 1 });
    for (let x = cx - 8; x < cx + 9; x++) { this.set(x, gy, T.BRICK); this.set(x, gy - 1, T.AIR); this.set(x, gy - 2, T.AIR); }
    this.set(cx - 9, gy - 1, T.TORCH); this.set(cx + 9, gy - 1, T.TORCH);
    // 귀환 비석 — 여명 마을이 되살아나기 전까지는 아무 반응이 없다
    this.objects.push({ type: 'waystone', x: (cx - 12) * TS, y: gy * TS - 48, w: 30, h: 48 });
    // 노인
    const ox = CAMP_X1 + 6;                  // 노인은 캠프 구역 오른쪽 끝 바로 밖
    this.objects.push({ type: 'npc', npc: 'old', x: ox * TS, y: this.surface[ox] * TS - 44, w: 22, h: 44 });
  },

  /* ---- 여명 마을 ---- */
  buildDawnCity(x0, x1, gy, rng) {
    const blocks = DAWN_BUILDINGS.map(b => ({ x: x0 + b.off, w: b.w, h: b.h }));
    this.dawnCity = { x0, x1, gy, blocks, restored: 0 };

    // 대로
    for (let x = x0 - 6; x < x1 + 6; x++) {
      this.set(x, gy, T.RUINTILE);
      this.set(x, gy + 1, T.RUINBRICK);
      this.set(x, gy + 2, T.RUINBRICK);
    }
    for (const b of blocks) {
      const by = gy - b.h;
      for (let x = b.x; x < b.x + b.w; x++)
        for (let y = by; y < gy; y++) {
          const edge = (x === b.x || x === b.x + b.w - 1 || y === by);
          // 무너진 자리: 지붕 줄(by)은 남기고 옆벽만 군데군데 뚫는다
          const fallen = edge && y > by && rng.chance(0.18);
          this.set(x, y, edge && !fallen ? T.RUINBRICK : T.AIR);
          this.setWall(x, y, 10);
        }
      // 처마는 지붕 줄에만 얹는다 — 사연: docs/code-history.md#h107
      for (let x = b.x - 2; x <= b.x + b.w + 1; x++) this.set(x, by - 1, T.RUINTILE);
    }
    // 중앙 광장 — 건물 사이를 비우고, 분수대 물받이만 놓는다 — 사연: docs/code-history.md#h108
    const cx = (x0 + x1) >> 1;
    const [pL, pR] = this.dawnPlazaSpan();
    for (let x = pL; x <= pR; x++)
      for (let y = gy - 3; y < gy; y++) this.set(x, y, T.AIR);
    const fo = DAWN_PLAZA.find(s => s.id === 'fountain');
    for (let x = cx + fo.off; x < cx + fo.off + fo.w; x++) this.set(x, gy - 1, T.RUINBRICK);
  },

  /** 광장 가로 구간(타일) — 건물1 오른쪽 끝 다음 칸부터 건물2 왼쪽 끝 앞 칸까지. */
  dawnPlazaSpan() {
    const b = this.dawnCity.blocks;
    return [b[1].x + b[1].w, b[2].x - 1];
  },

  /* ---- 지하 공창 (세션 2) ---- */
  buildWorks(dx0, dx1, rng) {
    const cx = (dx0 + dx1) >> 1;
    const y0 = SY(210), h = 40, x0 = cx - 34, w = 68;
    this.works = { x0, y0, w, h, cx, liftX: cx };

    this.clearBox(x0, y0, w, h);
    // 외곽 강철 껍질
    for (let x = x0 - 1; x <= x0 + w; x++) { this.set(x, y0 - 1, T.STEELPLATE); this.set(x, y0 + h, T.STEELPLATE); }
    for (let y = y0 - 1; y <= y0 + h; y++) { this.set(x0 - 1, y, T.STEELPLATE); this.set(x0 + w, y, T.STEELPLATE); }
    for (let x = x0; x < x0 + w; x++)
      for (let y = y0; y < y0 + h; y++) this.setWall(x, y, 2);

    // 작업 층 3단 — 강철 바닥 + 사이사이 발판
    for (let k = 1; k <= 3; k++) {
      const fy = y0 + k * 10;
      for (let x = x0; x < x0 + w; x++) {
        if (Math.abs(x - cx) < 3) continue;            // 승강기 통로는 비워 둔다
        this.set(x, fy, rng.chance(0.12) ? T.PLATFORM : T.STEELPLATE);
      }
      // 층마다 동력관 등불
      for (let x = x0 + 5; x < x0 + w - 4; x += 11) this.set(x, fy - 1, T.CONDUIT);
    }
    // 승강기 수직축 — 지상 도시까지 뚫는다
    for (let y = this.surface[cx] + 1; y < y0; y++)
      for (let x = cx - 2; x <= cx + 2; x++) {
        this.set(x, y, T.AIR);
        this.setWall(x, y, 2);
      }
    for (let y = this.surface[cx] + 1; y < y0 + h; y += 4) {
      this.set(cx - 2, y, T.PLATFORM); this.set(cx + 2, y, T.PLATFORM);
    }
    // 동력석 광맥 — 스테이지 3의 드릴 연료가 될 것
    for (let i = 0; i < 90; i++) {
      const x = rng.int(x0 + 1, x0 + w - 2), y = rng.int(y0 + 1, y0 + h - 2);
      if (this.get(x, y) !== T.AIR) continue;
      if (Math.abs(x - cx) < 4) continue;
      this.set(x, y, rng.chance(0.35) ? T.POWERSTONE : T.STEELPLATE);
    }
    // 관리자 격실 (보스방) — 가장 아래층 안쪽
    const bx = cx + 16, by = y0 + h - 11;
    this.clearBox(bx - 9, by, 18, 10);
    for (let x = bx - 9; x < bx + 9; x++) this.set(x, by + 10, T.STEELPLATE);
    for (let y = by; y < by + 10; y++) { this.set(bx - 10, y, T.STEELPLATE); this.set(bx + 9, y, T.STEELPLATE); }
    this.set(bx - 6, by + 2, T.CONDUIT); this.set(bx + 5, by + 2, T.CONDUIT);
    // 관리자는 소환 아이템이 없다 — 내려가서 마주치는 흐름이라 둥지로 둔다
    this.objects.push({ type: 'lair', boss: 'overseer', ruin: 12, nm: tr('관리자 격실'),
      x: bx * TS, y: (by + 10) * TS - 48, w: 40, h: 48 });

    // 설계도 단말 — 세션 2 오프닝의 핵심 수집물
    this.objects.push({ type: 'terminal', x: (x0 + 6) * TS, y: (y0 + 10) * TS - 40, w: 34, h: 40, term: 0 });
    this.objects.push({ type: 'terminal', x: (x0 + w - 9) * TS, y: (y0 + 20) * TS - 40, w: 34, h: 40, term: 1 });
    this.objects.push({ type: 'terminal', x: (x0 + 14) * TS, y: (y0 + 30) * TS - 40, w: 34, h: 40, term: 2 });
  },
  /* ---- 폭주로 ---- */
  buildRunaway(dx0, dx1, rng) {
    const cx = (dx0 + dx1) >> 1;
    const y0 = SY(306), h = 54, w = 86, x0 = cx - (w >> 1);
    this.runaway = { x0, y0, w, h, cx };

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.SLAGSTEEL, floor: T.STEELPLATE, bg: 2,
      rng, depth: 4, minW: 13, minH: 10
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    // 공창 바닥에서 폭주로까지 뚫린 수직 통로
    const wk = this.works;
    const sy = wk ? wk.y0 + wk.h : y0 - 20;
    for (let y = sy; y <= y0 + 1; y++) {
      for (let dx = -2; dx <= 2; dx++) { this.set(cx + dx, y, T.AIR); this.setWall(cx + dx, y, 2); }
      if (y % 4 === 0) { this.set(cx - 2, y, T.PLATFORM); this.set(cx + 2, y, T.PLATFORM); }
    }

    const boss = rooms[0], bfy = boss.y + boss.h - 3;
    this.objects.push({ type: 'lair', boss: 'proliferator', ruin: 10, nm: tr('증식체의 노심'),
      x: (boss.x + (boss.w >> 1)) * TS, y: (bfy + 1) * TS - 48, w: 44, h: 48 });
    // 가장 깊은 방이 헤파의 격실 — 가장 큰 방(boss)과 같은 방이 되면 두 보스방이 같은 자리에 겹쳐 버린다(실측: 300개 시드 중 1개꼴).
    let deep = null;
    for (const r of rooms) if (r !== boss && (!deep || r.y > deep.y)) deep = r;
    if (!deep) deep = boss;   // 방이 하나뿐인 극단적 경우의 안전장치
    const dfy = deep.y + deep.h - 3;
    this.objects.push({ type: 'lair', boss: 'hepha', ruin: 11, nm: tr('헤파의 격실'),
      x: (deep.x + (deep.w >> 1)) * TS, y: (dfy + 1) * TS - 52, w: 48, h: 52 });
    this.objects.push({ type: 'terminal', x: (deep.x + 3) * TS, y: (dfy) * TS - 40, w: 34, h: 40, term: 4 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.set(x, r.y + 2, T.CONDUIT);
      // 노심 유리 — 방 안은 파여 있으므로 벽(테두리)에 박아 넣는다
      for (let k = 0; k < rng.int(3, 7); k++) {
        const onSide = rng.chance(0.5);
        const gx = onSide ? (rng.chance(0.5) ? r.x : r.x + r.w - 1) : r.x + rng.int(1, Math.max(1, r.w - 2));
        const gy2 = onSide ? r.y + rng.int(1, Math.max(1, r.h - 2)) : (rng.chance(0.5) ? r.y : r.y + r.h - 1);
        if (this.get(gx, gy2) === T.SLAGSTEEL) this.set(gx, gy2, T.COREGLASS);
      }
      if (r === boss || r === deep) continue;
      // 기계식 함정 — 이 층은 기계가 지었다
      if (rng.chance(0.8) && Factory) {
        const left = rng.chance(0.5), tx = left ? r.x + 1 : r.x + r.w - 2;
        if (Factory.canPlace(this, tx, fy)) Factory.place(this, tx, fy, rng.pick(['dart', 'flamejet', 'frostjet']), left ? 0 : 2, 1);
      }
      if (rng.chance(0.5) && Factory) {
        const tx2 = r.x + rng.int(3, Math.max(3, r.w - 4));
        if (Factory.canPlace(this, tx2, fy)) Factory.place(this, tx2, fy, 'trap', 0, 1);
      }
      if (rng.chance(0.6))
        // 세션 2 폭주로의 상자는 일반 유적 너프를 받지 않는 고보상 프로필이다.
        this.objects.push({ type: 'chest', tier: 5, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
    this.objects.push({ type: 'terminal', x: (boss.x + 3) * TS, y: (bfy) * TS - 40, w: 34, h: 40, term: 3 });
  },
  inRunaway(tx, ty) {
    const k = this.runaway;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  },

  /* ---- 설계실 (세션 2 종장) ---- */
  buildAtelier(rng) {
    const rw = this.runaway;
    if (!rw) return;
    const w = 66, h = 40;
    const x0 = rw.x0 + rw.w + 10, y0 = rw.y0 + 6;
    if (x0 + w >= WW - 8) return;
    this.atelier = { x0, y0, w, h, cx: x0 + (w >> 1) };

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.ARCHESTONE, floor: T.ARCHESTONE, bg: 6,
      rng, depth: 4, minW: 12, minH: 9, shapes: ['rect', 'rect', 'octagon', 'round']
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    // 폭주로 오른쪽 벽 ↔ 설계실 왼쪽 벽을 잇는 수평 통로.
    const ty = y0 + 4;
    const gx0 = rw.x0 + rw.w, gx1 = x0;
    for (let x = gx0; x <= gx1; x++)
      for (let dy = -1; dy <= 1; dy++) { this.set(x, ty + dy, T.AIR); this.setWall(x, ty + dy, 6); }
    const sealX = gx0 + 3;
    for (let dy = -1; dy <= 1; dy++) { this.set(sealX, ty + dy, T.ARCHSEAL); this.set(sealX + 1, ty + dy, T.ARCHSEAL); }
    this.atelier.sealX = sealX; this.atelier.sealY = ty;
    this.objects.push({ type: 'seal', gate: 'atelier', key: 'atelier_key',
      x: sealX * TS, y: (ty - 1) * TS, w: 44, h: 66 });

    // 가장 안쪽(오른쪽) 방이 원형의 자리 — 유일하게 비어 있던 받침대
    let last = rooms[0];
    for (const r of rooms) if (r.x > last.x) last = r;
    const lfy = last.y + last.h - 3;
    // ruin:15 — 12는 이미 관리자 격실(overseer)이 쓰고 있다.
    this.objects.push({ type: 'lair', boss: 'archetype', ruin: 15, nm: tr('비어 있는 받침대'),
      x: (last.x + (last.w >> 1)) * TS, y: (lfy + 1) * TS - 56, w: 48, h: 56 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      // 벽에 박힌 도면판 — 이 구역의 유일한 광원이자 채집 대상
      for (let k = 0; k < rng.int(4, 9); k++) {
        const onSide = rng.chance(0.5);
        const gx = onSide ? (rng.chance(0.5) ? r.x : r.x + r.w - 1) : r.x + rng.int(1, Math.max(1, r.w - 2));
        const gy = onSide ? r.y + rng.int(1, Math.max(1, r.h - 2)) : (rng.chance(0.5) ? r.y : r.y + r.h - 1);
        if (this.get(gx, gy) === T.ARCHESTONE) this.set(gx, gy, T.DRAFTGLASS);
      }
      if (r === last) continue;
      // 조립되다 만 것들이 줄지어 선 자리 — 받침대만 남기고 비워 둔다
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 5) this.set(x, fy + 1, T.ARCHESTONE);
      if (rng.chance(0.55) && Factory) {
        const left = rng.chance(0.5), tx2 = left ? r.x + 1 : r.x + r.w - 2;
        if (Factory.canPlace(this, tx2, fy)) Factory.place(this, tx2, fy, rng.pick(['dart', 'flamejet']), left ? 0 : 2, 1);
      }
      if (rng.chance(0.55))
        this.objects.push({ type: 'chest', tier: 6, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
  },
  inAtelier(tx, ty) {
    const k = this.atelier;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  },

  /* ---- 특별 유적 ① 부유 성채 (하늘) ---- */
  buildCitadel(rng) {
    const w = 74, h = 30;
    const x0 = SX(3300 + SHIFT), y0 = 4;         // 버섯 골짜기 위 하늘 (세션 2 바이옴 상공)
    this.citadel = { x0, y0, w, h, cx: x0 + (w >> 1) };

    // 성채 바닥판 — 통째로 떠 있는 판이라 아래가 완전히 뚫려 있다
    for (let x = x0 - 2; x <= x0 + w + 2; x++)
      for (let y = y0 + h - 3; y <= y0 + h; y++) this.set(x, y, T.ORBITPLATE);

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.ORBITPLATE, floor: T.ORBITPLATE, bg: 9,
      rng, depth: 4, minW: 12, minH: 8, shapes: ['rect', 'octagon', 'round']
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    /* 진입 다리 — 성채는 통째로 떠 있는 판이라 그냥 두면 들어갈 방법이 제트팩뿐이다. */
    {
      // 왼쪽 첫 방의 바닥 높이에 맞춰 문을 낸다
      let leftRoom = rooms[0];
      for (const r of rooms) if (r.x < leftRoom.x) leftRoom = r;
      const doorY = leftRoom.y + leftRoom.h - 3;
      for (let dy = -2; dy <= 0; dy++)
        for (let x = x0 - 1; x <= leftRoom.x + 1; x++) { this.set(x, doorY + dy, T.AIR); this.setWall(x, doorY + dy, 9); }
      // 다리 — 왼쪽으로 뻗어 나가며, 끝에서 가장 가까운 하늘 섬 높이로 계단처럼 내려간다
      let by = doorY + 1, bx = x0 - 2;
      for (let k = 0; k < 46 && bx > 6; k++, bx--) {
        this.set(bx, by, T.ORBITPLATE);
        for (let dy = -3; dy <= -1; dy++) this.set(bx, by + dy, T.AIR);
        if (k % 6 === 5 && by < SKY_Y - 4) by++;      // 하늘 섬 높이까지 서서히 내려온다
        if (k % 9 === 4) this.set(bx, by - 1, T.TORCH);
      }
      this.citadel.bridgeX = bx;
    }

    // 가장 넓은 방이 환원기의 자리.
    const main = rooms[0], mfy = main.y + main.h - 3;
    for (let x = main.x + 2; x < main.x + main.w - 2; x++)
      for (let y = mfy + 1; y <= mfy + 2; y++) this.set(x, y, T.ALTARSTONE);
    this.objects.push({ type: 'lair', boss: 'restorer', ruin: 13, nm: tr('환원 기관'),
      x: (main.x + (main.w >> 1)) * TS, y: (mfy + 1) * TS - 60, w: 52, h: 60 });
    this.objects.push({ type: 'lorestone', lore: 'citadel',
      x: (main.x + 3) * TS, y: (mfy + 1) * TS - 34, w: 26, h: 34 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      // 궤도핵 — 벽에 박힌 광맥이자 이 구역의 광원
      for (let k = 0; k < rng.int(5, 11); k++) {
        const onSide = rng.chance(0.5);
        const gx = onSide ? (rng.chance(0.5) ? r.x : r.x + r.w - 1) : r.x + rng.int(1, Math.max(1, r.w - 2));
        const gy = onSide ? r.y + rng.int(1, Math.max(1, r.h - 2)) : (rng.chance(0.5) ? r.y : r.y + r.h - 1);
        if (this.get(gx, gy) === T.ORBITPLATE) this.set(gx, gy, T.ORBITCORE);
      }
      if (r === main) continue;
      if (rng.chance(0.7)) this.putTileTrap(r, fy, rng.pick(['dart', 'vent']), rng);
      if (rng.chance(0.45)) for (let k = 0; k < rng.int(2, 5); k++) this.set(r.x + 3 + k, fy, T.SPIKE);
      if (rng.chance(0.6))
        this.objects.push({ type: 'chest', tier: 6, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
  },
  inCitadel(tx, ty) {
    const k = this.citadel;
    return !!k && tx >= k.x0 - 2 && tx <= k.x0 + k.w + 2 && ty >= k.y0 - 1 && ty <= k.y0 + k.h + 1;
  },

  /* ---- 특별 유적 ② 무너진 갱 (최심부) ---- */
  buildDeepShaft(rng) {
    const w = 70, h = 34;
    const x0 = SX(640 + SHIFT), y0 = WORLD_BOT - 46;     // 잿빛 숲 최하부 — 지옥 바닥 아래
    this.deepShaft = { x0, y0, w, h, cx: x0 + (w >> 1) };

    const rooms = this.carveDungeon({
      x0, y0, w, h, wall: T.DEEPROCK, floor: T.DEEPROCK, bg: 4,
      rng, depth: 4, minW: 12, minH: 8, shapes: ['rect', 'rect', 'pillars']
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    // 지옥에서 내려오는 수직 갱도 — 무너진 버팀목이 드문드문 남아 있다
    const ex = x0 + (w >> 1);
    for (let y = HELL_Y + 10; y <= y0 + 1; y++) {
      for (let dx = -2; dx <= 2; dx++) this.set(ex + dx, y, T.AIR);
      this.setWall(ex, y, 4);
      if (y % 5 === 0) { this.set(ex - 2, y, T.MINEWOOD); this.set(ex + 2, y, T.MINEWOOD); }
      if (y % 7 === 0) this.set(ex, y, T.PLATFORM);
    }

    const main = rooms[0], mfy = main.y + main.h - 3;
    this.objects.push({ type: 'lair', boss: 'shaft_maw', ruin: 14, nm: tr('메워진 막장'),
      x: (main.x + (main.w >> 1)) * TS, y: (mfy + 1) * TS - 52, w: 48, h: 52 });
    this.objects.push({ type: 'lorestone', lore: 'shaft',
      x: (main.x + 3) * TS, y: (mfy + 1) * TS - 34, w: 26, h: 34 });

    for (const r of rooms) {
      const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
      // 남은 버팀목과 안전등
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 7) this.set(x, r.y + 2, T.MINEWOOD);
      if (rng.chance(0.5)) this.set(r.x + 2, fy, T.TORCH);
      // 유독 가스 — 바닥에 고인다.
      if (rng.chance(0.55)) {
        const gx = r.x + rng.int(2, Math.max(2, r.w - 6));
        for (let k = 0; k < rng.int(3, 7); k++)
          if (this.get(gx + k, fy) === T.AIR) this.set(gx + k, fy, T.BLACKDAMP);
      }
      if (r === main) continue;
      if (rng.chance(0.75)) this.putTileTrap(r, fy, rng.pick(['dart', 'crumble']), rng);
      if (rng.chance(0.5)) for (let k = 0; k < rng.int(2, 5); k++) this.set(r.x + 4 + k, fy, T.SPIKE);
      if (rng.chance(0.62))
        this.objects.push({ type: 'chest', tier: 6, loot: 'session2',
          x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
    }
  },
  inDeepShaft(tx, ty) {
    const k = this.deepShaft;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  },

  inWorks(tx, ty) {
    const k = this.works;
    return !!k && tx >= k.x0 - 1 && tx <= k.x0 + k.w && ty >= k.y0 - 1 && ty <= k.y0 + k.h;
  },

  /** 종장 완료 시 1회. */
  /** 배치표 한 줄을 실제 오브젝트로 만든다. */
  dawnPlace(tx, slotW, spec, gy, label) {
    const o = Object.assign({}, spec, {
      x: tx * TS + Math.round((slotW * TS - spec.w) / 2),
      y: gy * TS - spec.h
    });
    o.tx0 = tx; o.tx1 = tx + slotW - 1; o.slotKey = label || spec.type;
    return o;
  },

  /** 놓기 직전 겹침 검사. */
  checkDawnLayout(items, gy, plaza) {
    const bad = [];
    const sorted = items.slice().sort((a, b) => a.tx0 - b.tx0);
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      if (b.tx0 <= a.tx1) bad.push(tr('겹침: {slotKey}({tx0}~{tx1}) ↔ {slotKey2}({tx02}~{tx12})', { slotKey: a.slotKey, tx0: a.tx0, tx1: a.tx1, slotKey2: b.slotKey, tx02: b.tx0, tx12: b.tx1 }));
    }
    for (const o of items) {
      // 분수대만은 제 물받이(solid) 위에 서는 게 정상이다
      if (o.slotKey === 'fountain') continue;
      for (let x = o.tx0; x <= o.tx1; x++)
        if (this.solid(x, gy - 1)) bad.push(tr('막힌 칸 위: {slotKey}가 {x}칸(벽/기둥) 위에 있음', { slotKey: o.slotKey, x }));
    }
    if (plaza) for (const o of items)
      if (o.plaza && (o.tx0 < plaza[0] || o.tx1 > plaza[1]))
        bad.push(tr('광장 밖으로 삐져나감: {slotKey}({tx0}~{tx1}) vs 광장 {plaza}~{plaza2}', { slotKey: o.slotKey, tx0: o.tx0, tx1: o.tx1, plaza: plaza[0], plaza2: plaza[1] }));
    if (bad.length) console.warn(`${tr('[여명 마을 배치 문제]')}
` + bad.join('\n'));
    return bad;
  },

  restoreDawnCity() {
    const d = this.dawnCity;
    if (!d || d.restored) return false;
    d.restored = 1;
    const { x0, x1, gy, blocks } = d;
    const cx = (x0 + x1) >> 1;
    const items = [];

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i], spec = DAWN_BUILDINGS[i], by = gy - b.h;
      // 무너진 벽을 메우고 벽지를 밝은 금빛으로
      for (let x = b.x; x < b.x + b.w; x++)
        for (let y = by; y < gy; y++) {
          if (x === b.x || x === b.x + b.w - 1 || y === by) this.set(x, y, T.RUINBRICK);
          this.setWall(x, y, 8);
        }
      this.set(b.x + 2, by + 2, T.TORCH);              // 창가 등불
      this.set(b.x + b.w - 3, by + 2, T.TORCH);
      // 출입구 — 양쪽 벽을 뚫고 여닫이 문을 단다.
      const rx = b.x + b.w - 1;
      this.set(b.x, gy - 1, T.AIR); this.set(b.x, gy - 2, T.AIR);
      this.set(rx, gy - 1, T.AIR); this.set(rx, gy - 2, T.AIR);
      this.pushDoor(b.x * TS, (gy - 2) * TS, TS, TS * 2, -1);
      this.pushDoor(rx * TS, (gy - 2) * TS, TS, TS * 2, 1);
      // 실내 — 배치표(DAWN_INSIDE)대로.
      items.push(this.dawnPlace(b.x + DAWN_INSIDE.shelf, 2, DAWN_OBJ.shelf, gy, `shelf${i}`));
      items.push(this.dawnPlace(b.x + DAWN_INSIDE.npc, 1,
        Object.assign({}, DAWN_OBJ.npcBase, { npc: spec.npc }), gy, spec.npc));
      if (spec.fac) items.push(this.dawnPlace(b.x + DAWN_INSIDE.fac, 2, DAWN_OBJ[spec.fac], gy, spec.fac));
      items.push(this.dawnPlace(b.x + DAWN_INSIDE.table, 2, DAWN_OBJ.table, gy, `table${i}`));
    }

    // 광장 — 배치표(DAWN_PLAZA)대로 왼쪽부터
    const plaza = this.dawnPlazaSpan();
    for (const slot of DAWN_PLAZA) {
      const o = this.dawnPlace(cx + slot.off, slot.w, DAWN_OBJ[slot.id], gy, slot.id);
      o.plaza = 1;
      items.push(o);
    }

    this.checkDawnLayout(items, gy, plaza);
    for (const o of items) this.objects.push(o);

    /* 대로 가로등 — 물건이 선 칸은 건너뛰고 빈자리에만 세운다. */
    const taken = new Set();
    for (const o of items) for (let x = o.tx0; x <= o.tx1; x++) taken.add(x);
    for (const b of blocks) { taken.add(b.x); taken.add(b.x + b.w - 1); }
    for (let x = x0 - 4; x < x1 + 4; x += 9) {
      let t = x;
      while (t < x + 5 && (taken.has(t) || this.solid(t, gy - 1))) t++;
      if (!taken.has(t) && !this.solid(t, gy - 1)) this.set(t, gy - 1, T.TORCH);
    }
    d.lv = 1;
    this.placeMerchants(1);
    return true;
  },

  /* ---- 마을 개선 ---- */
  /* 떠돌이 상인 배치 — MERCHANTS 표가 자리를 들고 있다(1·3·4단계에 하나씩). */
  placeMerchants(lv) {
    const d = this.dawnCity; if (!d) return;
    const { gy, blocks } = d, cx = (d.x0 + d.x1) >> 1;
    const ns = DAWN_OBJ.npcBase;
    for (const m of MERCHANTS) {
      if (!m.spot) continue;              // 마을 밖 상인(윤슬)은 제 자리에서 따로 놓인다
      if (m.lv > lv) continue;
      if (this.objects.some(o => o.type === 'npc' && o.npc === m.npc)) continue;
      let tx, fy;
      if (m.spot.kind === 'plaza') {
        tx = cx + m.spot.off; fy = gy;              // 광장 좌판 — 길바닥에 선다
      } else {
        const b = blocks[m.spot.block]; if (!b) continue;
        tx = b.x + m.spot.off; fy = gy - b.h;       // 2층 바닥 줄
      }
      this.objects.push({ type: 'npc', npc: m.npc, x: tx * TS, y: fy * TS - ns.h, w: ns.w, h: ns.h });
    }
  },
  upgradeVillage(lv) {
    const d = this.dawnCity;
    if (!d || !d.restored || (d.lv || 1) >= lv) return false;
    d.lv = lv;
    const { x0, x1, gy, blocks } = d;
    const cx = (x0 + x1) >> 1;
    const rng = new RNG(this.seed + '_v' + lv);
    const P = (o) => this.objects.push(o);
    const mach = (tx, ty, key, dir?) => {
      if (Factory && Factory.canPlace(this, tx, ty)) Factory.place(this, tx, ty, key, dir || 0, 1);
    };

    if (lv === 2) {
      /* --- 2층 증축 + 기와지붕 --- */
      for (const b of blocks) {
        const by = gy - b.h, ny = by - 6;          // 새 지붕 줄
        // 그 두 칸까지 같이 비우지 않으면 2층을 올린 뒤 허공에 조각이 남는다
        for (let x = b.x - 2; x <= b.x + b.w + 1; x++)
          for (let y = ny; y < by; y++) this.set(x, y, T.AIR);
        for (let x = b.x; x < b.x + b.w; x++) {
          for (let y = ny + 1; y < by; y++) this.setWall(x, y, 8);
          // 옛 지붕 줄은 2층 바닥이 된다.
          this.set(x, by, T.PLATFORM);
        }
        for (let y = ny + 1; y < by; y++) {        // 2층 벽
          this.set(b.x, y, T.TIMBERWALL);
          this.set(b.x + b.w - 1, y, T.TIMBERWALL);
        }
        /* 2층 바닥 줄(by)의 양 끝은 벽으로 되돌린다 — 위아래가 다 벽인데 이 한 줄만 발판이면 건물 옆면에 1칸 구멍이 뚫려 보인다. */
        this.set(b.x, by, T.TIMBERWALL);
        this.set(b.x + b.w - 1, by, T.TIMBERWALL);
        for (let x = b.x - 1; x <= b.x + b.w; x++) this.set(x, ny, T.ROOFTILE);
        /* 창문 — 1층·2층 양쪽 벽에. */
        for (const wx of [b.x, b.x + b.w - 1]) {
          this.set(wx, gy - 4, T.WINDOW);
          this.set(wx, gy - 5, T.WINDOW);
          this.set(wx, ny + 3, T.WINDOW);
        }
        this.set(b.x + 3, ny + 2, T.TORCH);
        this.set(b.x + b.w - 4, ny + 2, T.TORCH);
        // 발판 사다리 — 1층 바닥(gy)에서 2층 바닥(by)까지가 최소 10칸이라 그냥은 못 뛰어 오른다(1단 점프 최대 높이 ≈4.4칸).
        const stairX = b.x + 8;
        for (let y = gy - 4; y > by; y -= 4) this.set(stairX, y, T.PLATFORM);
        // 2층에 아무것도 없으면 그냥 빈 상자라 올라갈 이유가 없다 — 책장을 하나 놓는다 (사다리와 반대편 벽 쪽, 창문·횃불과 안 겹치는 자리)
        const shS = DAWN_OBJ.shelf;
        P({ type: 'furniture', kind: 'shelf', x: (b.x + b.w - 5) * TS - shS.w, y: by * TS - shS.h, w: shS.w, h: shS.h });
      }

      /* --- 대로 횃불을 가로등으로 --- */
      for (let x = x0 - 6; x < x1 + 6; x++)
        if (this.get(x, gy - 1) === T.TORCH) this.set(x, gy - 1, T.LAMPPOST);

      /* --- 마을 서쪽에 밭 자리 --- */
      const fx0 = x0 - 11, fx1 = x0 - 3;
      d.farm = { x0: fx0, x1: fx1, y: gy };
      for (let x = fx0 - 1; x <= fx1 + 1; x++) {
        for (let y = gy - 5; y < gy; y++) this.set(x, y, T.AIR);
        // 밭 자리는 갈지 않은 흙 그대로 둔다 — 괭이를 대면 그때 경작지가 된다
        this.set(x, gy, x < fx0 || x > fx1 ? T.PLANK : T.DIRT);
      }
      this.set(fx0 - 1, gy - 1, T.FENCE); this.set(fx1 + 1, gy - 1, T.FENCE);
      /* 건초더미는 밭 왼쪽 울타리 바깥 — fx1+2 는 전주 선로가 내려오는 기둥 줄이라 전주 밑동에 건초가 박혀 보였다(경비병 초소 fx0-2 와도 안 겹치게 한 칸 더 왼쪽). */
      this.set(fx0 - 3, gy - 1, T.HAYBALE);
      /* 괭이·낫·씨앗 한 벌은 밭 위 상자가 아니라 마을이 2단계가 될 때 가방으로 준다(data.js FARM_KIT). */

      /* --- 지붕 위 풍차 + 마을 전주 선로 --- */
      const rb = blocks[0], ry = gy - rb.h - 7;
      mach(rb.x + 8, ry, 'windmill');
      /* 전주는 1칸짜리 기계라 지붕 없는 자리(길·밭 위)에서는 공중에 뜬 것처럼 보인다. */
      const poles = [
        [rb.x + 12, ry], [x0 + 5, ry],          // 지붕 위
        [x0 - 1, gy - 13], [x0 - 1, gy - 5],    // 서쪽 벽을 타고 내려온다
        [x0 - 8, gy - 4]                        // 밭을 가로지른다 (기둥을 세워 받친다)
      ];
      // 기계를 먼저 다 놓는다 — 기둥을 세우고 나면 그 칸이 막혀 canPlace가 실패한다
      for (const [px, py] of poles) mach(px, py, 'pole');
      /* 기둥(전주 아래 몸통)은 타일로 깔지 않는다 — 사연: docs/code-history.md#h109 */
      return true;
    }

    if (lv === 3) {
      /* --- 성벽 + 문루 --- */
      const wxL = x0 + DAWN_WALL.leftOff, wxR = x1 + DAWN_WALL.rightOff;
      // 성벽이 집을 물지 않는지 확인한다 — 건물을 옮기면 여기부터 어긋나기 때문에 조용히 겹치게 두지 않고 콘솔에 찍는다(문루가 성문 위 3칸 폭이라 ±1까지 본다)
      for (const wx of [wxL, wxR])
        for (const b of blocks)
          if (wx + 1 >= b.x && wx - 1 <= b.x + b.w - 1)
            console.warn(`[여명 마을 배치 문제] 성벽(${wx})이 건물(${b.x}~${b.x + b.w - 1})과 겹침`);
      d.towers = []; d.posts = [];
      for (const [wx, inward] of [[wxL, 1], [wxR, -1]]) {
        /* 성벽 자리의 나무를 먼저 걷어낸다 — 나무는 세계 생성 때 서 있고 성벽은 한참 뒤에 올라오므로, 안 걷으면 기둥과 잎이 성벽·문루를 뚫고 나온다. */
        for (let x = wx - 4; x <= wx + 4; x++)
          for (let y = gy - 17; y <= gy + 2; y++) {
            const t = TILE_DEF[this.get(x, y)];
            if (t && (t.tree || t.leaf)) this.set(x, y, T.AIR);
          }
        for (let y = gy + 2; y > gy - 11; y--) this.set(wx, y, T.WALLSTONE);
        this.set(wx, gy - 11, T.BATTLEMENT);
        this.set(wx, gy - 12, T.BATTLEMENT);
        // 문루 — 성문 위쪽만 3칸 폭으로
        for (let x = wx - 1; x <= wx + 1; x++) {
          for (let y = gy - 5; y > gy - 14; y--) this.set(x, y, T.WALLSTONE);
          this.set(x, gy - 14, T.BATTLEMENT);
        }
        /* 성벽 배경(벽 레이어) — 안 깔면 성문을 뚫은 칸 너머로 하늘이 그대로 보여 문루가 허공에 얹힌 것처럼 위태로워 보인다. */
        for (let x = wx - 1; x <= wx + 1; x++)
          for (let y = gy + 2; y > gy - 15; y--) this.setWall(x, y, 13);
        // 통로 — 문루 아래를 뚫고 여닫이 성문을 단다.
        for (let y = gy - 1; y > gy - 4; y--) this.set(wx, y, T.AIR);
        this.pushDoor(wx * TS, (gy - DAWN_WALL.gateH) * TS, TS, TS * DAWN_WALL.gateH, -inward, { gate: 1 });
        this.set(wx + inward, gy - 4, T.BANNER);
        /* 없앤다 — 사연: docs/code-history.md#h110 */
        mach(wx, gy - 15, 'turret');
        d.towers.push(wx);
        d.posts.push(wx + inward * 3);          // 경비병은 문 안쪽 길 위에 선다
      }
      // 광장에 깃발 — 배치표에서 비어 있는 칸에만 세운다(게시판·비석 위에 겹치지 않게)
      for (const bx of [cx - 4, cx + 6]) this.set(bx, gy - 3, T.BANNER);
      this.placeMerchants(3);
      return true;
    }

    if (lv === 4) {
      /* --- 교역지 --- */
      /* 밭 확장 — 서쪽만 늘리면 성벽(x0-16)이 코앞이라 3칸밖에 못 늘어난다(실측). */
      const f = d.farm;
      if (f) {
        const wLimit = x0 + DAWN_WALL.leftOff + 3;      // 울타리(nx0-1) 자리까지 세어 3칸
        const eLimit = blocks[0].x - 2;                 // 첫 집 앞 한 칸은 비워 둔다
        const nx0 = Math.max(f.x0 - 6, wLimit);
        const nx1 = Math.min(f.x1 + 6, eLimit);
        const till = (x) => {
          for (let y = gy - 5; y < gy; y++) this.set(x, y, T.AIR);
          this.set(x, gy, this.poleColumn(x, gy) ? T.DIRT : T.FARMLAND);
        };
        // 이미 갈려 있던 원래 밭에도 전주가 지나가면 되돌린다(2단계에서 전주가 선다)
        for (let x = f.x0; x <= f.x1; x++)
          if (this.get(x, gy) === T.FARMLAND && this.poleColumn(x, gy)) {
            this.set(x, gy, T.DIRT);
            this.crops.delete(this.i(x, gy - 1));
            if (TILE_DEF[this.get(x, gy - 1)].crop) this.set(x, gy - 1, T.AIR);
          }
        for (let x = nx0; x < f.x0; x++) till(x);
        for (let x = f.x1 + 1; x <= nx1; x++) till(x);
        this.set(nx0 - 1, gy - 1, T.FENCE);
        this.set(nx1 + 1, gy - 1, T.FENCE);
        f.x0 = nx0; f.x1 = nx1;
      }
      /* 강화 모루 — **재련대 바로 옆.** — 사연: docs/code-history.md#h111 */
      if (!this.objects.some(o => o.type === 'anvil')) {
        const bi = DAWN_BUILDINGS.findIndex(sp => sp.fac === 'reforge');
        const rb = bi >= 0 ? blocks[bi] : null;
        if (rb) {
          const av = this.dawnPlace(rb.x + DAWN_INSIDE.anvil, 2, DAWN_OBJ.anvil, gy, 'anvil');
          // 겹침 검사 — 그 집 안에 이미 있는 것들과 실제로 부딪히는지 본다
          const hit = this.objects.find(o => o.w && aabb(av, o));
          if (hit) console.warn('강화 모루 자리 겹침:', hit.type);
          else P(av);
        }
      }
      this.placeMerchants(4);
      return true;
    }
    return false;
  },
};
mixin(World.prototype, WorldVillage, true);
