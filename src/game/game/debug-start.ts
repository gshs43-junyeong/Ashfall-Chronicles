/* ===== game/debug-start.js — 디버그 바로가기 시험장(?debug=) ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { ITEMS } from '../data/items.js';
import { MACHINE } from '../data/recipes.js';
import { VILLAGE } from '../data/start.js';
import { CAVE_TYPES, RUIN_SPEC } from '../data/ruins.js';
import { SESSIONS } from '../data/story.js';
import { DAWN_WALL, TS } from '../world.js';
import { makeItem } from '../items.js';
import { Drop, Enemy } from '../entity.js';
import { Factory } from '../factory.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const DebugStartPart: Bag = {
  /** 새 게임을 막 만든 뒤 — ?debug= 시험장으로 옮겨 준다(정상 플레이에는 영향 없음 · 주소 목록 docs/debug-urls.md). */
  debugStart(qs: any) {
    const p = this.player, { WW, WH, HELL_Y, CAMP_X1, SEA_X1 } = this.world.dims;
    /* ?debug=meteor — 2.5초 뒤 운석. */
    if (qs.get('debug') === 'meteor') {
      const at = qs.get('at'), me = Math.floor(this.player.cx / TS);
      setTimeout(() => this.startMeteor(at === 'me' ? me : at ? +at : me + (+qs.get('dx') || 30)), 2500);
    }
    if (qs.get('debug') === 'village') {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      // 단계 수가 늘어도 따라오게 VILLAGE 표를 기준으로 돌린다 — 사연: docs/code-history.md#h40
      const lv = clamp(+qs.get('lv') || 1, 1, VILLAGE.length - 1);
      for (let k = 2; k <= lv; k++) this.world.upgradeVillage(k);
      this.world.dawnCity.lv = lv;
      /* 스토리 진행도 함께 맞춘다 — 여명 마을은 종장(세션 2)을 지나야 열리는 곳이라, 챕터를 0(세션 1)에 둔 채 마을만 열면 세계가 앞뒤가 안 맞는다. */
      const sess = clamp(+qs.get('sess') || 2, 1, SESSIONS.length);
      this.chapter = qs.get('ch') !== null ? +qs.get('ch') : SESSIONS[sess - 1].ch0;
      const plv = +qs.get('plv') || (sess >= 3 ? 60 : sess >= 2 ? 40 : 1);
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 20000;
      const d = this.world.dawnCity;
      // 3단계면 서쪽 성문 앞에 세운다 — 마을에 들어서는 순간 성벽이 바로 보인다
      if (lv >= 3) { p.x = (d.x0 + DAWN_WALL.leftOff + 4) * TS; p.y = (d.gy - 3) * TS; }
      else { p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; }
      p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    }

    /* ?debug=price — 값 확인용. */
    if (qs.get('debug') === 'price') {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      for (let k = 2; k <= VILLAGE.length - 1; k++) this.world.upgradeVillage(k);
      this.world.dawnCity.lv = VILLAGE.length - 1;
      const sess = clamp(+qs.get('sess') || 2, 1, SESSIONS.length);
      this.chapter = qs.get('ch') !== null ? +qs.get('ch') : SESSIONS[sess - 1].ch0;
      const plv = +qs.get('plv') || 100;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 10000000;
      // 되팔 거리 — 알 세 종류와 공장 물건·재료를 한 벌씩 쥐여 준다
      const give = (id: string, n: number) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
        }
      };
      for (const id of ['egg_common', 'egg_rare', 'egg_epic']) give(id, 3);
      for (const id of ['m_belt', 'm_assembler', 'm_gen', 'steel_plate', 'circuit', 'motor',
                        'iron_bar', 'wood', 'potion_hp', 'station_work', 'crate_wood']) give(id, 5);
      const d = this.world.dawnCity;
      p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      UI.refreshBag(); UI.refreshEquip();
      this.toast(tr('값 확인 자리 — {plv}레벨 · 마을 {n}단계 · 세션 {sess}', { plv, n: VILLAGE.length - 1, sess }), 'good');
    }

    /* ?debug=sea — 세션 3 확인 자리. */
    if (qs.get('debug') === 'sea') {
      const give = (id: string, n: number) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
        }
      };
      this.chapter = qs.get('ch') !== null ? +qs.get('ch') : SESSIONS[2].ch0;
      const plv = +qs.get('plv') || 60;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.gold = +qs.get('gold') || 300000;
      // 숨 계단 · 심해 장비 · 불빛 · 채굴
      for (const id of ['tank_air', 'tank_deep', 'tank_abyss']) give(id, 1);
      for (const id of ['helm_diver', 'chest_scale', 'boots_fin', 'ring_pearl', 'charm_ink',
                        'spear_tide', 'bow_harpoon', 'orb_abyss', 'pick_abyss']) give(id, 1);
      give('torch', 200); give('potion_hp_greater', 20); give('rod_adv', 1); give('raw_meat', 20);
      // 4단계 설비를 바로 세워 볼 수 있게 재료도 준다
      for (const id of ['abyss_core', 'pressure_plate_m', 'abyss_pearl', 'jelly_lamp',
                        'crab_shell', 'shark_tooth', 'ink_sac', 'kelp', 'sea_salt']) give(id, 40);
      for (const id of ['m_pressor', 'm_desal', 'm_belt_f', 'm_battery_hi', 'm_gen', 'm_pole']) give(id, 8);
      p.equip.util1 = makeItem('tank_deep', 1, 0);
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      const w = this.world;
      const sx = SEA_X1 + 6;                                  // 물가 바로 오른쪽(빙하 쪽)
      p.x = sx * TS; p.y = (w.surface[sx] - 3) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      UI.refreshBag(); UI.refreshEquip();
      this.toast(tr('세션 3 확인 자리 — 왼쪽이 바다, 오른쪽이 빙하. 산소통 세 종류 지급'), 'good');
    }

    /* ?debug=fishfarm — 낚시·농사만 확인하는 자리. */
    if (qs.get('debug') === 'fishfarm') {
      // 한 칸 최대치(stack)를 넘겨 주면 한 슬롯에 몰아 담겨 버린다 — 나눠서 넣는다
      const give = (id: string, n: number) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
        }
      };
      give('rod_basic', 1); give('rod_adv', 1);
      give('raw_meat', 40);                                   // 미끼 — 생고기가 있으면 자동으로 걸린다
      give('hoe_iron', 1);
      give('seed_wheat', 60); give('seed_starroot', 40); give('seed_ashcap', 40);
      give('fertilizer', 40);
      give('pick_iron', 1); give('torch', 40);
      const plv = +qs.get('plv') || 15;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 5000;
      /* 정글 호수 기슭 — 물가 바로 옆의 마른 땅에 세운다. */
      const w = this.world;
      const lake = (w.pools || []).find((q: any) => q.biome === 'jungle') || (w.pools || []).find((q: any) => q.big);
      if (lake) {
        let sx = lake.x;
        // 호수 왼쪽으로 걸어 나가 물이 끝나는 첫 마른 바닥을 찾는다
        for (let k = 0; k < 40; k++) {
          const tx = lake.x - k;
          const ty = w.surface[clamp(tx, 0, WW - 1)];
          if (!TILE_DEF[w.get(tx, ty)].liquid && w.solid(tx, ty + 1)) { sx = tx; break; }
        }
        /* 밭 감을 자리를 깔아 둔다. */
        for (let k = 1; k <= 12; k++) {
          const x = sx - k, sy = w.surface[clamp(x, 0, WW - 1)];
          if (TILE_DEF[w.get(x, sy)].liquid) continue;
          if (w.solid(x, sy - 1)) continue;                      // 나무 밑동은 건너뛴다
          /* 정글은 지면 바로 위가 덩굴·풀포기라 그 칸이 AIR가 아니다. */
          if (w.get(x, sy - 1) !== T.AIR) w.set(x, sy - 1, T.AIR);
          w.set(x, sy, T.GRASS);
          if (!w.solid(x, sy + 1)) w.set(x, sy + 1, T.DIRT);
        }
        p.x = sx * TS;
        p.y = (w.surface[clamp(sx, 0, WW - 1)] - 2) * TS;
        p.vx = p.vy = 0;
        this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
        this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
        this.toast(tr('낚시·농사 확인 자리 — 오른쪽이 호수, 왼쪽 12칸이 갈 수 있는 풀밭'), 'good');
      }
      UI.refreshBag(); UI.refreshEquip();
    }

    /* ?debug=ruin&id=mine — 유적의 맥박·탐사 기록·메아리 확인 자리. */
    if (qs.get('debug') === 'ruin') {
      const w = this.world, id = qs.get('id') || 'mine';
      const idx = RUIN_SPEC.findIndex(s => s.id === id);
      const site = (w.ruinSites || []).find((s: any) => s.id === id);
      if (idx >= 0 && site && site.rooms.length) {
        const plv = +qs.get('plv') || 30;
        while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
        p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
        const give = (iid: any, n: number) => { const it = makeItem(iid, n); if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!)); };
        give('tonic_hush', 4); give('drum_pulse', 4); give('pulse_shard', 3); give('potion_hp', 20);
        const r = site.rooms.slice().sort((a: any, b: any) => a.y - b.y)[0];
        p.x = (r.x + (r.w >> 1)) * TS; p.y = (r.y + r.h - 3) * TS - p.h + TS; p.vx = p.vy = 0;
        this.seenRuins[id] = 1;
        if (qs.get('boss') === '1') this.lairs[idx] = 1;
        this.ruinPulse = { [id]: clamp(+qs.get('pulse') || 0, 0, 100) };
        this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
        this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
        UI.refreshBag();
      }
    }

    /* ?debug=cave — 동굴 확인 자리. */
    if (qs.get('debug') === 'cave') {
      const w = this.world, kq = qs.get('k');
      const plv = +qs.get('plv') || 30;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      const give = (iid: any, n: number) => { const it = makeItem(iid, n); if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!)); };
      give('pick_iron', 1); give('potion_hp', 20); give('bomb_small', 10); give('torch', 60);
      let at = null;
      if (kq) {
        const k = CAVE_TYPES.findIndex(c => c.id === kq);
        const cx0 = w.spawnX;
        // 그 갈래의 장식이 **실제로 깔린** 자리여야 한다(캠프 둘레처럼 갈래만 있고 안 꾸민 곳이 있다)
        const mark = ({ moss: T.HANGMOSS, drip: T.STALACTITE, geode: T.GEODE, fume: T.GASVENT } as Bag)[kq];
        const near = (x: number, y: number) => {
          let n = 0;
          for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 3; dy++) if (w.get(x + dx, y + dy) === mark) n++;
          return n >= (kq === 'fume' ? 1 : 3);
        };
        for (let r = 0; r < WW && !at; r += 7)
          for (const x of [cx0 + r, cx0 - r]) {
            if (x < 5 || x >= WW - 5 || at) continue;
            for (let y = w.surface[x] + 14; y < HELL_Y - 4; y++)
              if (w.caveKindAt(x, y) === k && w.get(x, y) === T.AIR && w.get(x, y - 1) === T.AIR && w.solid(x, y + 1) && near(x, y)) { at = [x, y]; break; }
          }
      } else {
        const f = (w.faults || []).filter((q: any) => !q.done).sort((a: any, b: any) => Math.abs(a.x - w.spawnX) - Math.abs(b.x - w.spawnX))[0];
        if (f) at = [f.x - f.dir * 3, f.y + 1];
      }
      if (at) {
        p.x = at[0] * TS + TS / 2 - p.w / 2; p.y = (at[1] + 1) * TS - p.h; p.vx = p.vy = 0;
        this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
        this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      }
      UI.refreshBag();
    }

    /* ?debug=factory — 기계 화면·애셋 확인 자리. 캠프 오른쪽 평지에 기계 전 종류를 재료를 채워 한 줄로 세운다. */
    if (qs.get('debug') === 'factory') this.buildDebugFactory(qs);

    /* ?debug=bomb — 폭탄만 확인하는 자리. */
    if (qs.get('debug') === 'bomb') {
      const give = (id: string, n: number) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
        }
      };
      for (const id of ['bomb_small', 'bomb_big', 'bomb_dig']) give(id, 99);
      // 제작도 그 자리에서 해 볼 수 있게 재료를 함께 준다 (화약 = 유황3+바다소금2+석탄2)
      give('sulfur', 99); give('sea_salt', 99); give('coal', 99); give('gunpowder', 99);
      give('iron_bar', 40); give('steel_plate', 30); give('rope_kelp', 40); give('pressure_plate_m', 20);
      give('station_work', 3); give('pick_iron', 1); give('torch', 60); give('potion_hp', 20);
      const plv = +qs.get('plv') || 60;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 200000;

      const w = this.world;
      const gx = CAMP_X1 + 16;                               // 안전 지대의 오른쪽 경계
      /* 깊이는 **안전 지대 판정이 정한다.** */
      let smin = 1e9;
      for (let x = gx - 26; x <= gx; x++) smin = Math.min(smin, w.surface[clamp(x, 0, WW - 1)]);
      const gy = clamp(smin + 18, 60, WH - 40);
      const x0 = gx - 26, x1 = gx + 78, top = gy - 13;
      // 굴을 파고 바닥 여섯 줄을 돌로 깐다
      for (let x = x0; x <= x1; x++)
        for (let y = top; y <= gy + 6; y++) {
          if (!w.inB(x, y)) continue;
          w.set(x, y, y > gy ? T.STONE : T.AIR);
          /* 뒷벽을 반드시 발라 준다 — 사연: docs/code-history.md#h41 */
          w.walls[w.i(x, y)] = 2;
        }
      /* 천장 메우기 — 사연: docs/code-history.md#h42 */
      for (let x = x0; x <= x1; x++)
        for (let y = Math.max(0, top - 8); y < top; y++)
          if (w.inB(x, y) && w.get(x, y) === T.AIR) w.set(x, y, T.STONE);
      // 경계 기둥 — 기반암이라 어떤 폭탄으로도 안 없어진다.
      for (let y = top; y <= gy; y++) if (y < gy - 3 || y > gy - 1) w.set(gx, y, T.BEDROCK);
      // 천장 횃불
      /* 단단하기 시험 기둥 — 폭탄이 어디서 멈추는지가 이 줄에 다 나온다. */
      const PILLARS = [T.STONE, T.GOLD, T.EBONSTONE, T.OBSIDIAN, T.DEEPROCK, T.BEDROCK];
      PILLARS.forEach((tile, i) => {
        const px = gx + 6 + i * 8;
        for (let dx = 0; dx < 5; dx++) for (let y = gy - 7; y <= gy; y++) w.set(px + dx, y, tile);
      });
      // 왼쪽(안전 지대)에도 같은 돌기둥 하나 — 같은 폭탄을 두 쪽에 던져 비교하라고
      for (let dx = 0; dx < 5; dx++) for (let y = gy - 7; y <= gy; y++) w.set(gx - 12 + dx, y, T.STONE);
      // 물·용암 웅덩이 — 액체는 건너뛴다
      for (let x = gx + 56; x <= gx + 68; x++)
        for (let y = gy - 2; y <= gy; y++) w.set(x, y, x < gx + 63 ? T.WATER : T.LAVA);
      // 기계 한 줄 — 남의 기계는 안 날린다
      ['belt', 'belt', 'gen', 'battery'].forEach((k, i) => Factory.place(w, gx + 72 + i, gy, k, 0));
      // 방어력이 폭탄 피해를 얼마나 깎는지 볼 표적.
      for (let i = 0; i < 3; i++)
        this.ents.push(new Enemy(i === 0 ? 'reef_crab' : 'slime', (gx + 30 + i * 4) * TS, (gy - 3) * TS, this.scale()));

      /* 불빛은 **마지막에** 건다. */
      for (const row of [top + 1, gy - 9, gy])
        for (let x = x0 + 2; x < x1; x += 3)
          if (w.get(x, row) === T.AIR) w.set(x, row, T.TORCH);

      p.x = (gx - 6) * TS; p.y = (gy - 2) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      UI.refreshBag(); UI.refreshEquip();
      this.toast(tr('폭탄 시험장 — 기반암 기둥 왼쪽이 안전 지대, 오른쪽이 부술 수 있는 곳'), 'good');
    }
  },

  /** ?debug=factory — 캠프 오른쪽을 평평하게 밀고 기계 스물여섯 종을 한 줄로 세운다.
      전주는 10칸마다(반경 5 · 이음 10) 서서 줄 전체가 망 하나다. 몹은 &mobs=1 일 때만 나온다. */
  buildDebugFactory(qs: any) { const { WW, WH, WORLD_BOT, CAMP_X1 } = dimsOf(this.world);
    const p = this.player, w = this.world;
    const give = (id: string, n: number) => {
      const max = ITEMS[id].stack || 1;
      for (let left = n; left > 0; left -= max) {
        const it = makeItem(id, Math.min(max, left), 0);
        if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
      }
    };
    const plv = +qs.get('plv') || 50;
    while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
    p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
    p.gold = +qs.get('gold') || 200000;
    this.dbgCalm = qs.get('mobs') !== '1';
    this.dayT = 12 * 60;
    for (const k in MACHINE) give(MACHINE[k].item!, 10);   // 가방엔 기계만 — 재료는 줄 왼쪽 끝 자재 상자에

    const X0 = CAMP_X1 + 8, LEN = 84, AX = X0 + LEN + 12, BX = AX + 40, XEND = BX + 28;
    let gy = 0;
    for (let x = X0 - 8; x <= XEND; x++) gy = Math.max(gy, w.surface[clamp(x, 0, WW - 1)]);
    gy = Math.min(gy, WORLD_BOT - 20);
    // 시험장 자리에 걸린 채취탑은 걷는다(디버그 전용)
    for (const o of w.objects) if (o.type === 'rig' && o.tx >= X0 - 16 && o.tx <= XEND + 8) o.gone = 1;
    this._rigs = null;
    for (let x = X0 - 8; x <= XEND; x++) {
      for (let y = gy - 30; y <= gy + 6; y++) {
        if (!w.inB(x, y)) continue;
        w.set(x, y, y < gy ? T.AIR : y === gy ? T.GRASS : T.DIRT);
        if (y < gy) w.walls[w.i(x, y)] = 0;               // 풍차가 볼 하늘 — 뒷벽도 걷는다
      }
      w.surface[x] = gy;
    }
    const Y = gy - 1;
    for (let x = 0; x <= 8; x++) for (let y = gy + 1; y <= gy + 4; y++) w.set(X0 + 28 + (x % 5), y, T.OILSHALE);
    [T.IRON, T.COPPER, T.COAL, T.GOLD, T.IRON, T.LEAD, T.COPPER, T.IRON, T.COAL].forEach((t, i) => {
      for (let y = gy + 1; y <= gy + 3; y++) w.set(X0 + 50 + i, y, t);
    });
    // 드릴 바로 밑은 광상 — 줄지 않고 계속 나오는 모습을 보인다(기계식 = 철, 전동 = 금 · 등급 3)
    w.set(X0 + 51, gy + 1, T.IRONRICH); w.set(X0 + 55, gy + 1, T.GOLDRICH);

    const put = (dx: any, key: any, dir?: any, fill?: any) => {
      const m = Factory.place(w, X0 + dx, Y, key, dir || 0);
      if (!m) return null;
      if (MACHINE[key].proj) { m.own = 1; }
      if (fill) for (const id in fill) {
        if (m.items) Factory.insert(w, m, id, fill[id]);
        else if (m.in) Factory.bufAdd(m.in, id, fill[id]);
      }
      return m;
    };
    for (let dx = 0; dx <= LEN; dx += 10) put(dx, 'pole');
    put(-3, 'crate', 0, { coal: 99, fuel_brick: 99, iron_ore: 99, copper_ore: 99, gold_ore: 99, iron_bar: 99,
      copper_bar: 99, gold_bar: 99, steel_plate: 99, polymer: 99, wire: 99, crude_oil: 99, rivet: 99, wheat: 99,
      flour: 99, raw_meat: 20, sand: 99, kelp: 99, crab_shell: 99, sea_salt: 99, battery_empty: 20 });
    // 1. 전력
    put(1, 'gen', 0, { coal: 40 }); put(2, 'gen', 0, { fuel_brick: 20 });
    const b1 = put(3, 'battery'); if (b1) b1.e = 1500;
    const b2 = put(4, 'battery_hi', 0, { battery_empty: 3 }); if (b2) b2.e = 7000;
    put(6, 'windmill'); put(8, 'switch');
    // 2. 제련 줄: 상자(배출) → 벨트 → 자동 용광로 → 벨트·고속 벨트 → 상자
    const c1 = put(11, 'crate', 0, { iron_ore: 99, copper_ore: 60 }); if (c1) c1.feed = 1;
    put(12, 'belt'); put(13, 'belt'); put(14, 'smelter', 0, { coal: 30 });
    put(15, 'belt'); put(16, 'belt_fast'); put(17, 'belt_fast'); put(18, 'crate');
    // 3. 압축 줄: 석탄 → 압축기 → 분류기(압축 연료만) → 상자
    const c2 = put(21, 'crate', 0, { coal: 99 }); if (c2) c2.feed = 1;
    put(22, 'belt'); put(23, 'press'); put(24, 'belt');
    const so = put(25, 'sorter'); if (so) so.f = 'fuel_brick';
    put(26, 'crate');
    // 4. 원유: 유혈암 위 시추 펌프 → 정제기 → 벨트 → 상자
    put(31, 'pump'); put(32, 'refinery', 0, { crude_oil: 20 }); put(33, 'belt'); put(34, 'crate');
    put(36, 'turret', 0, { rivet: 100 }); put(38, 'trap');
    // 5. 조립 줄
    const c3 = put(41, 'crate', 0, { copper_bar: 60 }); if (c3) c3.feed = 1;   // 상자는 한 가지만 흘리니 수지는 조립기에 미리
    put(42, 'belt'); put(43, 'assembler', 0, { polymer: 40, wire: 6, gold_bar: 4 }); put(44, 'belt'); put(45, 'crate');
    // 6. 광맥 위 드릴
    put(51, 'drill', 0, { coal: 30 }); put(52, 'crate');
    put(55, 'drill_e'); put(56, 'crate');
    w.set(X0 + 58, gy + 1, T.GLACIUM); put(58, 'drill_x'); put(59, 'crate');   // 심층 드릴 — 세션 3 빙정석(등급 5)
    // 7. 4단계 설비 · 마을 설비
    put(61, 'pressor', 0, { steel_plate: 12, crab_shell: 16, sea_salt: 8 }); put(62, 'crate');
    put(64, 'desal', 0, { sand: 40, kelp: 30 }); put(65, 'crate');
    put(67, 'mill', 0, { wheat: 30 }); put(68, 'crate');
    put(71, 'oven', 0, { wood: 30, flour: 20, raw_meat: 10 }); put(72, 'crate');
    // 8. 함정(위를 보게 — 줄을 따라 쏘지 않는다)
    put(74, 'dart', 3); put(76, 'flamejet', 3); put(78, 'frostjet', 3);
    put(81, 'battery', 0, { battery_empty: 4 });
    this.buildDebugTowers(w, AX, BX, gy);
    Factory.buildNets(w);

    p.x = (X0 - 5) * TS; p.y = (gy - 3) * TS; p.vx = p.vy = 0;
    this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
    this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    UI.refreshBag(); UI.refreshEquip();
    this.toast(tr('공장 확인 자리 — 오른쪽으로 기계 전 종류, 그 너머에 여러 층 공장 둘. 기계를 우클릭하면 기계 화면이 열린다'), 'good');
  },

  /** ?debug=factory 의 여러 층 공장 둘 — A: 3층 금속 공장(광석 → 주괴 → 강철판·전선), B: 지하 탄광이 제 발전기를 먹이는 순환 발전소 + 방어 갑판.
      층 사이는 위로 가는 벨트 기둥, 사람은 오른쪽(A)·왼쪽(B) 발판 사다리로 오간다. */
  buildDebugTowers(w: any, AX: any, BX: any, gy: any) {
    const P = (x: any, y: any, key: any, dir?: any, fill?: any) => {
      const m = Factory.place(w, x, y, key, dir || 0);
      if (!m) return null;
      if (MACHINE[key].proj) m.own = 1;
      if (fill) for (const id in fill) {
        if (m.items) Factory.insert(w, m, id, fill[id]);
        else if (m.in) Factory.bufAdd(m.in, id, fill[id]);
      }
      return m;
    };
    const shell = (x0: any, x1: any, top: any, holes: any, ladder: any, slabs: any) => {
      for (let x = x0; x <= x1; x++) {
        for (let y = top; y < gy; y++) { w.set(x, y, T.AIR); if (x > x0 && x < x1) w.setWall(x, y, 6); }
        w.set(x, top, T.STEELPLATE);
        for (const sy of slabs) w.set(x, sy, holes.includes(x) ? T.AIR : ladder.includes(x) ? T.PLATFORM : T.STEELPLATE);
      }
      for (const x of [x0, x1]) for (let y = top; y < gy; y++) w.set(x, y, y >= gy - 3 ? T.AIR : T.WALLSTONE);   // 양쪽 문
      for (const x of ladder) for (const sy of slabs) { w.set(x, sy + 2, T.PLATFORM); }
      for (const x of ladder) w.set(x, gy - 3, T.PLATFORM);
      // 층마다 벽 횃불 — 벽지 친 실내라 햇빛이 안 든다
      for (let y = gy - 4; y > top; y -= 5) for (let x = x0 + 3; x < x1; x += 6) if (w.get(x, y) === T.AIR) w.set(x, y, T.TORCH);
    };
    const feed = (m: any) => { if (m) m.feed = 1; return m; };

    /* ---- A. 3층 금속 공장 ---- */
    const A1 = gy - 1, A2 = gy - 6, A3 = gy - 11;
    shell(AX, AX + 31, gy - 15, [AX + 14, AX + 16], [AX + 28, AX + 29], [gy - 5, gy - 10]);
    // 1층 — 발전 · 철광 줄(왼쪽에서) · 동광 줄(오른쪽에서) → 위로 가는 기둥(AX+14)
    P(AX + 2, A1, 'gen', 0, { coal: 60 }); P(AX + 3, A1, 'gen', 0, { fuel_brick: 30 });
    const ab = P(AX + 4, A1, 'battery_hi'); if (ab) ab.e = 6000;
    P(AX + 6, A1, 'pole'); P(AX + 22, A1, 'pole');
    feed(P(AX + 8, A1, 'crate', 0, { iron_ore: 99 }));
    P(AX + 9, A1, 'belt'); P(AX + 10, A1, 'smelter', 0, { coal: 60 }); P(AX + 11, A1, 'belt'); P(AX + 12, A1, 'belt'); P(AX + 13, A1, 'belt');
    feed(P(AX + 20, A1, 'crate', 2, { copper_ore: 99 }));
    P(AX + 19, A1, 'belt', 2); P(AX + 18, A1, 'smelter', 2, { coal: 60 }); P(AX + 17, A1, 'belt', 2); P(AX + 16, A1, 'belt_fast', 2); P(AX + 15, A1, 'belt', 2);
    for (let y = A1; y > A2; y--) P(AX + 14, y, 'belt', 3);
    // 2층 — 분류기: 동 주괴는 위로, 나머지(철 주괴)는 오른쪽 압축기로 → 강철판 상자
    P(AX + 14, A2, 'belt'); P(AX + 15, A2, 'belt');
    const sA = P(AX + 16, A2, 'sorter', 3); if (sA) sA.f = 'copper_bar';
    P(AX + 17, A2, 'belt'); P(AX + 18, A2, 'press'); P(AX + 19, A2, 'belt'); P(AX + 20, A2, 'belt_fast'); P(AX + 21, A2, 'crate');
    // 전주는 10칸 안이어야 서로 잇는다 — 1층 둘(6·22)은 16칸이라 가운데(13)에 하나 더 세워 한 망으로 묶는다
    P(AX + 8, A2, 'pole'); P(AX + 13, A2, 'pole'); P(AX + 24, A2, 'pole'); P(AX + 26, A2, 'battery', 0, { battery_empty: 5 });
    for (let y = A2 - 1; y > A3; y--) P(AX + 16, y, 'belt', 3);
    // 3층 — 조립기(수지 미리)로 전선 → 상자, 지붕 위 풍차
    P(AX + 16, A3, 'belt'); P(AX + 17, A3, 'belt'); P(AX + 18, A3, 'assembler', 0, { polymer: 60 }); P(AX + 19, A3, 'belt'); P(AX + 20, A3, 'crate');
    P(AX + 10, A3, 'pole'); P(AX + 22, A3, 'pole');
    P(AX + 6, gy - 16, 'windmill');

    /* ---- B. 지하 탄광 순환 발전소 + 방어 갑판 ---- */
    const B0 = gy + 4, B1 = gy - 1, B2 = gy - 7;
    shell(BX, BX + 23, gy - 12, [], [BX + 2, BX + 3], [gy - 6]);
    // 지하층 — 땅(gy)이 천장, 기둥 구멍(BX+9)과 사다리 구멍(BX+2~3)만 뚫는다. 벽과 바닥에 석탄층
    for (let x = BX; x <= BX + 23; x++) {
      for (let y = gy + 1; y <= gy + 9; y++) w.set(x, y, y <= B0 && x > BX && x < BX + 23 ? T.AIR : y === gy + 5 ? T.STEELPLATE : T.STONE);
      w.set(x, gy, x === BX + 9 ? T.AIR : (x === BX + 2 || x === BX + 3) ? T.PLATFORM : T.STEELPLATE);
      for (let y = gy + 1; y <= B0; y++) if (x > BX && x < BX + 23) w.setWall(x, y, 6);
    }
    for (let x = BX + 1; x <= BX + 16; x++) for (let y = gy + 6; y <= gy + 8; y++) w.set(x, y, T.COAL);
    w.set(BX + 4, gy + 6, T.COALRICH);                 // 드릴 바로 밑은 광상 — 공장 B 가 연료를 끝없이 댄다
    for (const x of [BX + 2, BX + 3]) w.set(x, gy + 2, T.PLATFORM);
    for (let x = BX + 5; x < BX + 23; x += 6) w.set(x, gy + 1, T.TORCH);
    P(BX + 4, B0, 'drill_e'); for (let x = BX + 5; x <= BX + 8; x++) P(x, B0, 'belt');
    for (let y = B0; y > B1; y--) P(BX + 9, y, 'belt', 3);
    P(BX + 6, gy + 1, 'pole');
    // 1층 — 석탄 → 압축기 → 압축 연료가 벨트로 발전기에 들어간다(발전기가 드릴·압축기를 돌린다)
    P(BX + 9, B1, 'belt'); P(BX + 10, B1, 'press'); P(BX + 11, B1, 'belt'); P(BX + 12, B1, 'belt'); P(BX + 13, B1, 'belt_fast');
    P(BX + 14, B1, 'gen', 0, { fuel_brick: 4 });
    const bb = P(BX + 16, B1, 'battery_hi'); if (bb) bb.e = 2000;
    P(BX + 6, B1, 'pole'); P(BX + 18, B1, 'pole');
    // 방어 갑판 — 대갈못 상자 둘이 포탑 둘을 먹이고, 가운데 전격 함정
    feed(P(BX + 6, B2, 'crate', 0, { rivet: 200 })); P(BX + 7, B2, 'belt'); P(BX + 8, B2, 'belt'); P(BX + 9, B2, 'turret');
    feed(P(BX + 18, B2, 'crate', 2, { rivet: 200 })); P(BX + 17, B2, 'belt', 2); P(BX + 16, B2, 'turret');
    P(BX + 12, B2, 'trap'); P(BX + 12, gy - 9, 'pole');
    P(BX + 12, gy - 13, 'windmill');
  },
};

mixin(Game.prototype, DebugStartPart, true);
