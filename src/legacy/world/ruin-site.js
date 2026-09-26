/* ===== world/ruin-site.js — 유적 자리 · 유적 짓기 · 봉인실 · 제단 ===== */
import { factory as Factory } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { SHIFT, SX, SY, WH, WORLD_BOT, WW } from '../size.js';
import { MYSTIC, RUIN_CIPHER, RUIN_HINTS, RUIN_MAP_IN, RUIN_RELIC, RUIN_SPEC, STORY_RUIN, T, TILE_DEF } from '../data.js';
import { TS, World } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다). */

export const WorldRuinSite = {

  buildRuinSite(spec, idx, rng) {
    const y0 = spec.y, x0 = spec.x - (spec.w >> 1);
    /* 유적마다 자르는 깊이와 방 최소 크기를 달리 준다 (RUIN_SPEC[].bsp). */
    const bsp = spec.maze ? [7, 6, 6] : (spec.bsp || [4, 15, 8]);
    const rooms = this.carveDungeon({
      x0, y0, w: spec.w, h: spec.h, wall: spec.wall, floor: spec.floor, bg: spec.bg,
      rng, depth: bsp[0], minW: bsp[1], minH: bsp[2],
      target: spec.rooms,                                    // 등급대로 방 수를 맞춘다
      plan: spec.plan                                        // 겉모양이 방 배치를 따라간다
    });
    rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const boss = rooms[0];                                   // 가장 넓은 방이 보스방
    const site = { id: spec.id, n: spec.n, x: spec.x, y: y0 + (spec.h >> 1), w: spec.w, h: spec.h, rooms, idx };

    this._ruinCtx = { x0, y0, w: spec.w, rooms };             // 입구가 옆문을 낼 방을 고른다
    const ex = this.carveRuinEntrance(spec, x0, y0, rng);
    this._ruinCtx = null;
    if (spec.plan === 'tri') this._finishPyramid(spec, x0, y0);
    // 입구 통로의 작은 방 자리 — 진단이 "이 길에 함정이 있나"를 재는 데 쓴다
    site.ent = (this._entranceRooms || []).slice();

    /* 방 성격을 배분한다. */
    const entX = ex === null ? spec.x : ex;
    const rest = rooms.slice(1);
    rest.sort((a, b) => Math.abs(b.x - entX) - Math.abs(a.x - entX));   // 먼 것부터
    const roles = new Map();
    if (rest[0]) roles.set(rest[0], 'vault');
    if (rest[1]) roles.set(rest[1], 'vault');
    if (rest[Math.floor(rest.length / 2)]) roles.set(rest[Math.floor(rest.length / 2)], 'lore');
    for (const r of rest) if (!roles.has(r) && rng.chance(0.3)) roles.set(r, 'gauntlet');

    /* 고유 방 — 그 유적에만 있는 방 하나. */
    const sigRoom = rest.find(r => !roles.has(r)) || rest[2] || rest[0];
    if (spec.sig && sigRoom) roles.set(sigRoom, 'sig');
    /* 암호 골방은 자물쇠가 걸린 유적이면 어디든 선다(RUIN_CIPHER). */
    let cipherRoom = null;
    if (RUIN_CIPHER[spec.id]) {
      cipherRoom = (spec.sig === 'sunshaft' && sigRoom) ? sigRoom
        : (rest.find(r => !roles.has(r) && r.w >= 14) || rest.find(r => r.w >= 14) || sigRoom);
    }
    /* 신비한 방 — 한 세계에 두세 곳뿐이라 유적마다 후보 하나만 두고, buildRuins 가 미리 뽑아 둔 목록(this._mysticPick)에 든 유적에만 실제로 짓는다. */
    if (spec.mystic) {
      const mr = rest.find(r => !roles.has(r) && r.w >= 12);
      if (mr) roles.set(mr, 'mystic');
    }
    /* 미로 유적만 — 방과 방 사이 통로 몇 개를 도로 막아 **막다른 길**을 만든다. */
    if (spec.maze) {
      for (const r of rooms) {
        if (r === boss || !rng.chance(0.55)) continue;
        const side = rng.chance(0.5) ? r.x : r.x + r.w - 1;
        for (let y = r.y + 1; y < r.y + r.h - 1; y++)
          if (this.get(side, y) === T.AIR) this.set(side, y, spec.wall);
      }
      // 가짜 문 — 벽 한 칸만 유적 타일로 바꿔 두면 통로처럼 보이다 막힌다
      for (const r of rooms) {
        if (rng.chance(0.4)) this.setWall(r.x + (r.w >> 1), r.y + r.h - 2, spec.bg);
      }
    }

    let hintSlot = 0;                                        // 흔적을 방마다 하나씩 순서대로
    // 유적마다 개별로 매긴 난이도 — 없으면 예전 기본값으로 떨어진다
    const TRAP = spec.trapRate === undefined ? 0.8 : spec.trapRate;
    const SPIKE = spec.spikeRate === undefined ? 0.4 : spec.spikeRate;
    const CHEST = spec.chestRate === undefined ? 0.3 : spec.chestRate;
    const rank = spec.rank || 3;
    for (const r of rooms) {
      const fy = r.y + r.h - 3;                              // 바닥 바로 위 줄
      const cx = r.x + (r.w >> 1);
      // 양쪽 벽에 깃발을 하나씩 걸어 방 하나하나가 "누가 살았던 자리"로 읽히게 한다 (역할 상관없이 전부 — 함정/상자 자리는 안 건드리는 천장 쪽 줄이라 안전하다) 깃발은 벽에 건다
      // — 사연: docs/code-history.md#h119
      if (r.h > 6) { this.putDecor(r.x + 1, r.y + 4, T.BANNER, 'wall'); this.putDecor(r.x + r.w - 2, r.y + 4, T.BANNER, 'wall'); }
      this.putRuinDecor(spec, r, fy, rng);                   // 그 유적에만 있는 장식
      if (r === boss) {
        // 보스방: 넓게 비우고 둥지를 놓는다.
        this.objects.push({ type: 'lair', boss: spec.boss, ruin: idx,
          x: cx * TS, y: (fy + 1) * TS - 48, w: 40, h: 48 });
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 5) this.putDecor(x, r.y + 2, spec.torch, 'any');
        this.objects.push({ type: 'chest', tier: clamp(spec.tier, 1, 4),
          x: (r.x + 3) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
        continue;
      }
      const role = roles.get(r);

      if (role === 'vault') {
        /* 보물방 — 등급이 가장 높은 상자를 두되, 지킴이가 붙고 바닥이 온통 함정이다. */
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) this.putDecor(x, r.y + 2, spec.torch, 'any');
        // 함정 개수와 지킴이 수가 유적 등급을 그대로 탄다 — 갱도는 2마리, 부패한 둥지는 5마리
        for (let k = 0; k < 1 + Math.round(rank * 0.7); k++) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
        for (let x = r.x + 2; x < r.x + r.w - 2; x++) if (rng.chance(SPIKE)) this.set(x, fy, T.SPIKE);
        /* 이 유적의 유물은 입구에서 가장 먼 보물방에만 들어간다 — 유적마다 하나뿐이고, 끝까지 들어가 본 사람만 갖는다. */
        const first = r === rest[0];
        const relic = first ? RUIN_RELIC[spec.id] : null;
        // 다른 유적의 위치 지도가 여기 들어간다 — 한 곳을 털면 다음 곳이 열리는 사슬
        const mapFor = first ? Object.keys(RUIN_MAP_IN).find(k => RUIN_MAP_IN[k] === spec.id) : null;
        this.objects.push({
          type: 'chest', tier: clamp(spec.tier + 1, 1, 6),
          x: cx * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null,
          relic: relic || undefined,
          ruinmap: mapFor ? 'ruinmap_' + mapFor : undefined,
          bonus: spec.bonus, bonus2: spec.bonus2,
          guard: { t: rng.pick(spec.mobs), n: clamp(1 + Math.round(rank * 0.6), 2, 5) }
        });
        continue;
      }

      if (role === 'sig') {
        this.buildSigRoom(spec, r, fy, cx, idx, rng);
        continue;
      }

      if (role === 'mystic') {
        this.buildMysticRoom(spec, r, fy, cx, rng);
        continue;
      }

      if (role === 'lore') {
        // 비문방 — 함정 없이 조용하다.
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) this.putDecor(x, r.y + 2, spec.torch, 'any');
        this.objects.push({ type: 'lorestone', lore: spec.id,
          x: cx * TS, y: (fy + 1) * TS - 34, w: 26, h: 34 });
        continue;
      }

      if (role === 'gauntlet') {
        /* 시련방 — 상자가 아예 없다. */
        for (let x = r.x + 3; x < r.x + r.w - 2; x += 8) this.putDecor(x, r.y + 2, spec.torch, 'any');
        for (let k = 0; k < 2 + Math.round(rank * 0.8); k++) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
        // 천장에서도 쏜다 — 바닥만 보고 걷지 못하게
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 3)
          if (rng.chance(TRAP * 0.55) && this.get(x, r.y + 1) !== T.AIR) this.set(x, r.y + 1, T.FLAMEVENT);
        continue;
      }

      // 평범한 방 — 흔적(짧은 이야기 조각)을 방마다 하나씩 뿌린다
      const hints = RUIN_HINTS[spec.id];
      if (hints && hintSlot < hints.length && rng.chance(0.55)) {
        this.objects.push({ type: 'lorestone', lore: spec.id, hint: hintSlot,
          x: (r.x + 2) * TS, y: (fy + 1) * TS - 28, w: 22, h: 28 });
        hintSlot++;
      }
      for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.putDecor(x, r.y + 2, spec.torch, 'any');
      /* 함정은 **세 번** 굴린다. */
      if (rng.chance(TRAP)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(TRAP * 0.8)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(TRAP * 0.5)) this.putTileTrap(r, fy, rng.pick(spec.traps), rng);
      if (rng.chance(SPIKE)) {
        const sx = r.x + rng.int(2, Math.max(2, r.w - 5));
        for (let k = 0; k < rng.int(2, 2 + Math.round(rank * 0.5)); k++) this.set(sx + k, fy, T.SPIKE);
      }
      // 상자 — 입구에서 멀수록 잘 나온다 거리 보정은 1을 넘지 않게 묶는다 — 넓은 유적에서 far 가 2를 넘어 상자가 쏟아졌다
      const far = Math.min(1, Math.abs(r.x - entX) / Math.max(8, spec.w >> 1));
      if (rng.chance(CHEST + far * 0.14)) {          // 거리 보정도 절반 아래로
        const small = r.w * r.h < 180;
        this.objects.push({ type: 'chest', tier: clamp(spec.tier - 1 + (small ? 1 : 0), 1, 5),
          x: (cx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null });
      }
    }
    /* 암호 골방은 방 손질이 다 끝난 **뒤에** 세운다 — 앞에서 세우면 고유 방 연출이나 함정이 껍질을 덮어써서 옆으로 파고 들어갈 틈이 생긴다. */
    if (cipherRoom) this.buildCipherVault(spec, cipherRoom, cipherRoom.y + cipherRoom.h - 3, rng, rooms);

    /* ★ 마지막에 연결을 한 번 더 보장한다. */
    this._ensureConnected(x0, y0, spec.w, spec.h, rooms);
    /* ★ 입구가 있으면 입구를 기준으로 삼아 "들어와서 보스까지 갔다가 나갈 수 있는가"가 그대로 검사가 되게 한다. */
    /* 방마다 두 자리를 본다 — 왼쪽 끝과 한가운데(둥지·상자가 놓이는 자리). */
    const spots = [];
    /* 세 번째 값 0 은 "돌아오는 길 검사는 건너뛴다"는 표시다. */
    for (const r of rooms) spots.push([r.x + 2, r.y + r.h - 3, 0], [r.x + (r.w >> 1), r.y + r.h - 3]);
    if (ex !== null) {
      const ent = this._entranceSpots.slice(), mouth = ent.pop();    // 마지막에 넣은 것이 입구 목
      // 기준점(맨 앞)은 입구 목 — "밖에서 들어가 안쪽 끝까지, 그리고 다시 밖으로"가 된다
      spots.unshift(...(mouth ? [mouth] : []), ...ent,
                    /* 입구가 유적에 내려앉는 자리. */
                    this._entranceLandY !== undefined
                      ? [ex, this._entranceLandY]
                      : [clamp(ex, x0 + 1, x0 + spec.w - 2), y0 + 1]);
    }
    /* 실제 손질은 세계를 다 만든 뒤에 한다 — 유적을 지은 다음에도 큰 동굴·물웅덩이· 심층 갱도가 유적을 가로질러 바닥을 헐어 놓는다. */
    this._walkJobs.push([x0, y0, spec.w, spec.h, spots, spec.floor, spec.traps]);
    return site;
  },

  /* ---- 숨겨진 유적 3곳 + 심층 봉인실 ---- */
  buildRuins(rng) {
    this.ruins = [];
    this.ruinEvents = [];
    this.ruinSites = [];                                      // 석판 유적도 같이 담는다 (진단·저장용)
    this._walkJobs = [];                                      // 마지막에 돌릴 통행 검사 목록
    // 석판은 가장 넓은 방에 둔다 — 사연: docs/code-history.md#h120
    /* 서리(0)가 가장 순하고 부패지대(2)가 가장 사납다. */
    /* 입구 성격(entryKind)도 난이도 계단을 따라간다 — 서리는 발판형, 가운데는 미로형, 부패지대는 무발판형. */
    /* ★ 나중에 지어지는 쪽이 먼저 지은 쪽의 방을 덮어써서, 겹친 자리의 방이 통째로 사라지거나 벽이 어긋났다. */
    const spots = [
      { x: SX(420 + SHIFT),  y: SY(220), trap: 0.52, spike: 0.24, chest: 0.56, w: 84, h: 44, tier: 2, traps: ['dart', 'crumble'], entryKind: 'foothold' },
      { x: SX(1700 + SHIFT), y: SY(252), trap: 0.72, spike: 0.38, chest: 0.60, w: 68, h: 40, tier: 3, traps: ['dart', 'crumble', 'vent'], entryKind: 'maze' },
      { x: SX(3860 + SHIFT), y: SY(236), trap: 0.90, spike: 0.52, chest: 0.64, w: 88, h: 48, tier: 4, traps: ['dart', 'vent', 'crumble'], entryKind: 'nofoothold' }
    ];
    /* ★ 도면(hook, ㄴ 자)이 격자 열둘 중 다섯만 쓰는 데다 상자가 작아서, 방 목표를 12 로 올려도 9~10 에서 더 못 잘랐다(d1 9 · d3 10). */
    spots.forEach((sp, i) => {
      const cx = sp.x, cy = sp.y, w = sp.w, h = sp.h;
      const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
      /* 석판 유적도 바이옴 유적과 같은 규격을 쓴다 — 도면(겉모양) · 묻힌 입구 · 고유 장식 · 고유 방 · 고유 이벤트 — 사연: docs/code-history.md#h121 */
      const st = STORY_RUIN[i] || {};
      const spec = {
        id: 'story' + i, n: `${tr('석판 유적')} ` + (i + 1), x: cx, y: y0, w, h, tier: sp.tier,
        wall: T.RUINBRICK, floor: T.RUINTILE, bg: 10, torch: T.TORCH,
        entryKind: sp.entryKind, plan: st.plan, arch: st.arch,
        decor: st.decor, sig: st.sig, event: st.event, bonus: st.bonus
      };
      const rooms = this.carveDungeon({
        x0, y0, w, h, wall: T.RUINBRICK, floor: T.RUINTILE, bg: 10,
        rng, depth: 5, minW: st.bsp ? st.bsp[1] : 16, minH: st.bsp ? st.bsp[2] : 8,
        target: st.rooms, plan: st.plan
      });
      rooms.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      const main = rooms[0], fy0 = main.y + main.h - 3;
      for (let x = main.x + 3; x < main.x + main.w - 2; x += 8) this.set(x, main.y + 2, T.RUNESTONE);
      this.objects.push({ type: 'tablet', tablet: i, x: (main.x + (main.w >> 1)) * TS, y: (fy0 + 1) * TS - 48, w: 34, h: 48 });
      // 지상에서 내려오는 통로 — 이제 지표 아래에 묻는다(sunken).
      this._ruinCtx = { x0, y0, w, rooms };
      const ex = this.carveRuinEntrance(spec, x0, y0, rng);
      this._ruinCtx = null;
      const entX = ex === null ? cx : ex;
      // 유물이 들어갈 방과 고유 방 — 통로에서 먼 것부터
      const rest = rooms.filter(r => r !== main)
        .sort((a, b) => Math.abs(b.x - entX) - Math.abs(a.x - entX));
      const far = rest[0], sigRoom = rest[1] || rest[0];
      for (const r of rooms) {
        const fy = r.y + r.h - 3, rcx = r.x + (r.w >> 1);
        for (let x = r.x + 3; x < r.x + r.w - 2; x += 6) this.putDecor(x, r.y + 2, T.TORCH, 'any');
        // 깃발은 벽에 건다 — 벽이 안 닿는 자리면 안 건다(허공에 뜬 깃발이 되지 않게)
      if (r.h > 6) { this.putDecor(r.x + 1, r.y + 4, T.BANNER, 'wall'); this.putDecor(r.x + r.w - 2, r.y + 4, T.BANNER, 'wall'); }
        this.putRuinDecor(spec, r, fy, rng);
        if (r === main) continue;
        if (r === sigRoom && st.sig) { this.buildSigRoom(spec, r, fy, rcx, i, rng); continue; }
        if (rng.chance(sp.trap)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (rng.chance(sp.trap * 0.75)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (rng.chance(sp.trap * 0.45)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (i >= 1 && rng.chance(sp.trap * 0.5)) this.putTileTrap(r, fy, rng.pick(sp.traps), rng);
        if (rng.chance(sp.spike)) for (let k = 0; k < rng.int(2, 3 + i); k++) this.set(r.x + 3 + k, fy, T.SPIKE);
        // 유물 방은 상자가 확률이 아니라 확정이다 — 유물은 유적마다 하나뿐이라 굴리면 안 된다
        if (r === far || rng.chance(sp.chest * 0.45))   // 유물 방만 확정, 나머지는 드물게
          this.objects.push({ type: 'chest', tier: sp.tier + (r.w * r.h < 180 ? 1 : 0),
            x: (rcx + rng.int(-2, 2)) * TS, y: (fy - 0.2) * TS, w: 30, h: 26, items: null,
            relic: r === far ? RUIN_RELIC['story' + i] : undefined,
            bonus: r === far ? st.bonus : undefined });
      }
      // 암호 골방 — 방 손질이 끝난 뒤에 세운다(앞서 세우면 함정이 껍질을 덮어쓴다)
      if (RUIN_CIPHER[spec.id]) {
        const cr = (st.sig === 'sunshaft' ? sigRoom : rest.find(q => q.w >= 14)) || sigRoom;
        if (cr) this.buildCipherVault(spec, cr, cr.y + cr.h - 3, rng, rooms);
      }
      // 바닥을 갈아 까는 고유 방이 굴을 메울 수 있으므로 마지막에 연결을 다시 보장한다
      this._ensureConnected(x0, y0, w, h, rooms);
      const wsp = [];
      for (const r of rooms) wsp.push([r.x + 2, r.y + r.h - 3, 0], [r.x + (r.w >> 1), r.y + r.h - 3]);
      if (ex !== null) {
        const ent = this._entranceSpots.slice(), mouth = ent.pop();
        wsp.unshift(...(mouth ? [mouth] : []), ...ent, [clamp(ex, x0 + 1, x0 + w - 2), y0 + 1]);
      }
      this._walkJobs.push([x0, y0, w, h, wsp, T.RUINTILE, sp.traps]);  // 걸어서 닿는지는 마지막에
      this.ruins.push({ id: 'story' + i, x: cx, y: cy, w, h });
      this.ruinSites.push({ id: 'story' + i, n: spec.n, x: cx, y: cy, w, h, rooms, idx: i,
                            ent: (this._entranceRooms || []).slice(),
                            traps: (sp.traps || ['dart', 'crumble']).slice() });
    });

    /* --- 바이옴 유적 5곳 (스토리와 무관한 탐험 콘텐츠) --- */
    const mk = Object.keys(MYSTIC);
    const pick = RUIN_SPEC.map((_, i) => i);
    for (let i = pick.length - 1; i > 0; i--) { const j = rng.int(0, i); [pick[i], pick[j]] = [pick[j], pick[i]]; }
    pick.slice(0, 3).forEach((ri, k) => { RUIN_SPEC[ri].mystic = mk[k % mk.length]; });
    pick.slice(3).forEach(ri => { delete RUIN_SPEC[ri].mystic; });

    RUIN_SPEC.forEach((spec, i) => {
      this.ruinSites.push(this.buildRuinSite(spec, i, rng));
      this.ruins.push({ id: spec.id, x: spec.x, y: spec.y + (spec.h >> 1), w: spec.w, h: spec.h });
    });

    // 여명 마을(dawnCity, x 2850~2960) 지하에 둔다 — 사연: docs/code-history.md#h122
    const kx = SX(2800 + SHIFT), ky = SY(350), kw = 56, kh = 26;   // 심층 봉인실 — 여명 마을 지하(서쪽)
    const dx0 = kx - kw / 2;
    this.objects.push({ type: 'seal', x: (dx0 + 1) * TS, y: (ky - 2) * TS, w: 44, h: 66 });
    this.objects.push({ type: 'altar', boss: 'first_keeper', x: kx * TS, y: (ky + kh / 2 - 3) * TS - 48, w: 44, h: 48 });
    this.ruins.push({ id: 'seal', x: kx, y: ky, w: kw, h: kh });
    this.sealRoom = { x: kx, y: ky, w: kw, h: kh, dx: dx0 + 1, dy: ky };

    /* ★ 심층 봉인실로 내려가는 길. */
    const sx0 = clamp(kx - 45, 40, WW - 40);
    const surfY = this.surface[sx0];
    this._entranceLandX = null;
    this._carveEntranceShaft(sx0, surfY + 2, ky + 4, {   // 문턱과 같은 높이에서 끝난다
      w: 26, bg: 10, wall: T.RUINBRICK, floor: T.RUINTILE, torch: T.TORCH,
      entryKind: 'foothold', traps: ['dart', 'crumble', 'gas'],
      lo: sx0 - 22, hi: dx0 - 4                             // 봉인문 서쪽 벽을 넘지 않는다
    }, rng);
    // 지상 표식 — 부러진 기둥 셋.
    for (const dx of [-4, -3, 3, 4]) {          // 목(±1)은 비워 둔다 — 덮으면 못 들어간다
      const gx = sx0 + dx, gy = this.surface[clamp(gx, 0, WW - 1)] - 1;
      for (let k = 0; k < (Math.abs(dx) === 3 ? 3 : 2); k++) this.set(gx, gy - k, T.RUINBRICK);
    }
    /* 방과 통로를 짓는 일은 **세계를 다 만든 뒤로 미룬다**(restoreSealRoom). */
    this.sealRoom.endX = this._entranceLandX === null ? sx0 : this._entranceLandX;
    this.restoreSealRoom();
    /* 내려가는 통로도 다른 유적과 같이 "걸어서 오르내릴 수 있는가"를 본다. */
    const ent = this._entranceSpots.slice(), mouth = ent.pop();
    /* 왼쪽은 통로가 좌우로 꺾이며 내려가는 폭(목 기준 -22)까지 넉넉히 넣는다. */
    const jx0 = sx0 - 24, jw = dx0 - jx0 - 12;
    this._walkJobs.push([jx0, ky - 8, jw, 20,
      [...(mouth ? [mouth] : []), ...ent, [dx0 - 4, ky + 4]], T.RUINTILE,
      ['dart', 'crumble', 'gas']]);
  },

  /** 심층 봉인실의 방·문·복도를 (다시) 짓는다. */
  restoreSealRoom() {
    const s = this.sealRoom;
    if (!s) return;
    const kx = s.x, ky = s.y, kw = s.w, kh = s.h, dx0 = kx - kw / 2;
    for (let x = kx - kw / 2; x <= kx + kw / 2; x++)
      for (let y = ky - kh / 2; y <= ky + kh / 2; y++) {
        const edge = (x <= kx - kw / 2 + 2 || x >= kx + kw / 2 - 2 || y <= ky - kh / 2 + 2 || y >= ky + kh / 2 - 2);
        this.set(x, y, edge ? T.RUINBRICK : T.AIR);
        this.setWall(x, y, 10);
      }
    for (let x = kx - kw / 2 + 3; x < kx + kw / 2 - 2; x++) this.set(x, ky + kh / 2 - 3, T.RUINTILE);
    for (let x = kx - 20; x <= kx + 20; x += 10) this.set(x, ky - kh / 2 + 3, T.RUNESTONE);
    for (let x = kx - 22; x <= kx + 22; x += 6) { this.set(x, ky - 6, T.TORCH); this.set(x, ky + 5, T.TORCH); }
    // 봉인문 (세로 통로) — 열쇠로 연다.
    for (let y = ky - 4; y <= ky + 4; y++) { this.set(dx0 + 1, y, T.SEALSTONE); this.set(dx0 + 2, y, T.SEALSTONE); }
    /* 문 앞 복도와 봉인실 안 계단. */
    const ly = ky + 4, endX = s.endX === undefined ? dx0 - 8 : s.endX;
    for (let x = Math.min(endX, dx0 - 8); x <= dx0; x++) {
      for (let y = ly - 2; y <= ly; y++) { this.set(x, y, T.AIR); this.setWall(x, y, 10); }
      this.set(x, ly + 1, T.RUINTILE);                         // 문턱과 같은 높이의 바닥
    }
    // 안쪽 — 바닥(ky+9)에서 세 칸씩 끊어 문턱(ky+4)까지 오르는 발판 두 줄
    for (let x = dx0 + 3; x <= dx0 + 8; x++) this.set(x, ky + 7, T.PLATFORM);
    for (let x = dx0 + 3; x <= dx0 + 7; x++) this.set(x, ky + 5, T.PLATFORM);
  },

  /** 위치 지도를 세계에 흩뿌린다 — 입구 없는 유적(arch: 'buried')마다 두 군데. */
  buildRuinCaches(rng) {
    for (const spec of RUIN_SPEC) {
      if (spec.arch !== 'buried') continue;
      const mapId = 'ruinmap_' + spec.id;

      // ① 유적 바로 위 — 지표 아래 4~7칸에 묻힌 작은 방
      const cx = clamp(spec.x + rng.int(-6, 6), 40, WW - 40);
      const surf = this.surface[cx];
      const cy = surf + rng.int(4, 7);
      for (let x = cx - 3; x <= cx + 3; x++)
        for (let y = cy - 2; y <= cy + 2; y++) {
          const edge = (x === cx - 3 || x === cx + 3 || y === cy - 2 || y === cy + 2);
          this.set(x, y, edge ? T.RUINBRICK : T.AIR);
          this.setWall(x, y, 10);
        }
      for (let x = cx - 2; x <= cx + 2; x++) this.set(x, cy + 1, T.RUINTILE);
      this.set(cx - 2, cy - 1, T.TORCH);
      this.objects.push({ type: 'chest', tier: 2, ruinmap: mapId,
        x: cx * TS, y: (cy - 0.2) * TS, w: 30, h: 26, items: null });
      // 지상 돌무지 — 파 볼 이유를 만든다
      for (const dx of [-2, -1, 1, 2]) {        // 가운데는 비워 둔다 — 파 내려가는 자리
        const gx = cx + dx, gy = this.surface[clamp(gx, 0, WW - 1)] - 1;
        this.set(gx, gy, T.RUINBRICK);
        if (Math.abs(dx) === 1) this.set(gx, gy - 1, T.RUINBRICK);
      }

      // ② 세계 어딘가의 동굴 — 그 유적에서 멀리 떨어진 자리
      const cav = (this.caverns || []).filter(c => Math.abs(c.cx - spec.x) > 500);
      if (!cav.length) continue;
      const pick = cav[rng.int(0, cav.length - 1)];
      let px = clamp(pick.cx + rng.int(-6, 6), 40, WW - 40), py = pick.cy;
      for (let k = 0; k < 40 && py < WH - 8; k++) {          // 그 동굴 안에서 바닥을 찾는다
        if (this.get(px, py) === T.AIR && TILE_DEF[this.get(px, py + 1)].solid === 1) break;
        py++;
      }
      if (this.get(px, py) !== T.AIR) continue;
      this.objects.push({ type: 'chest', tier: 3, ruinmap: mapId,
        x: px * TS, y: (py - 0.2) * TS, w: 30, h: 26, items: null });
      this.set(px - 1, py, T.TORCH);
    }
  },

  /** 좌표가 유적 내부인지 */
  inRuin(tx, ty) {
    return !!this.ruinAt(tx, ty);
  },
  /** 이 좌표가 속한 유적 자체를 돌려준다 (id 가 붙어 있으면 어느 유적인지도 안다). */
  ruinAt(tx, ty) {
    if (!this.ruins) return null;
    for (const r of this.ruins)
      if (tx > r.x - r.w / 2 && tx < r.x + r.w / 2 && ty > r.y - r.h / 2 && ty < r.y + r.h / 2) return r;
    return null;
  },
  /** 이 좌표가 속한 바이옴 유적의 잡몹 배율. */
  ruinMobMul(tx, ty) {
    for (const spec of RUIN_SPEC) {
      const hw = spec.w / 2, y0 = spec.y, y1 = spec.y + spec.h;
      if (tx > spec.x - hw && tx < spec.x + hw && ty > y0 - 2 && ty < y1 + 2)
        return spec.mobMul === undefined ? 1 : spec.mobMul;
    }
    return 1;
  },

  buildAltars(rng) {
    // 제단 밑면이 바닥 타일 윗면에 정확히 닿도록: y = 바닥행*TS - h 부패 제단
    const cx1 = SX(2500 + SHIFT), sy1 = this.surface[cx1];
    this.clearBox(cx1 - 14, sy1 - 14, 28, 14);
    for (let x = cx1 - 14; x < cx1 + 14; x++) { this.set(x, sy1, T.EBONSTONE); this.set(x, sy1 + 1, T.EBONSTONE); }
    this.objects.push({ type: 'altar', boss: 'corrupt_heart', x: cx1 * TS, y: sy1 * TS - 44, w: 40, h: 44 });
    // 서리 왕좌
    const cx2 = SX(210 + SHIFT), sy2 = this.surface[cx2];   // 원래 자리 그대로 (밀린 만큼만 옮겨 간다)
    this.clearBox(cx2 - 16, sy2 - 15, 32, 15);
    for (let x = cx2 - 16; x < cx2 + 16; x++) { this.set(x, sy2, T.BRICK); this.set(x, sy2 + 1, T.BRICK); }
    this.objects.push({ type: 'altar', boss: 'frost_witch', x: cx2 * TS, y: sy2 * TS - 44, w: 40, h: 44 });
    // 슬라임 제단 (마을 근처 언덕) — 베이스캠프(vx0..vx1 = 1000..1100, 여유폭 포함 984..1115)와 겹치지 않도록 서쪽으로 충분히 떨어뜨려 둔다
    const cx3 = SX(800 + SHIFT), sy3 = this.surface[cx3];
    this.clearBox(cx3 - 14, sy3 - 13, 28, 13);
    for (let x = cx3 - 14; x < cx3 + 14; x++) { this.set(x, sy3, T.STONE); this.set(x, sy3 + 1, T.STONE); }
    this.objects.push({ type: 'altar', boss: 'king_slime', x: cx3 * TS, y: sy3 * TS - 44, w: 40, h: 44 });
    // 심연 투기장
    const cx4 = SX(1400 + SHIFT), cy4 = WORLD_BOT - 17;
    this.clearBox(cx4 - 36, cy4 - 22, 72, 22);
    for (let x = cx4 - 36; x < cx4 + 36; x++) { this.set(x, cy4, T.OBSIDIAN); this.set(x, cy4 + 1, T.OBSIDIAN); }
    for (let x = cx4 - 36; x < cx4 + 36; x++) for (let y = cy4 - 22; y < cy4; y++) this.setWall(x, y, 3);
    this.objects.push({ type: 'altar', boss: 'void_king', x: cx4 * TS, y: cy4 * TS - 48, w: 44, h: 48 });
    for (let x = cx4 - 32; x < cx4 + 33; x += 9) this.set(x, cy4 - 20, T.TORCH);
  },

  clearBox(x0, y0, w, h) {
    for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) {
      if (this.get(x, y) === T.LAVA || this.get(x, y) === T.BEDROCK) continue;
      this.set(x, y, T.AIR);
    }
  },
};
mixin(World.prototype, WorldRuinSite, true);
