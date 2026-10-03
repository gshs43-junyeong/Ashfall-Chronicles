/* ===== game/spawn.js — 몹 생성 · 세계 사건 ===== */
import { TAU, clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { T } from '../data.js';
import { ENEMIES, MECH_MUL, isMech, mobName } from '../data/enemies.js';
import { EVENTS, RUIN_SPEC } from '../data/ruins.js';
import { bloodMult } from '../data/pets.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
import { DAY_CYCLE, Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const SpawnPart: Bag = {

  /* ================= 스폰 ================= */
  /* 개조가 걸리는 구역 — 세션 1 바이옴의 지층들. */
  MECH_ZONE: { surface: 1, cave: 1, deep: 1, corrupt: 1, ice: 1, hell: 1, jungle: 1, glowfen: 1 },

  zoneTable(zone: string, night: any, tx: number, ty: number) { const { WW } = dimsOf(this.world);
    // 사막은 지상/동굴 판정 안에 들어가므로 x로 따로 갈라준다
    const desert = tx !== undefined && this.world.biomeAt(clamp(tx, 0, WW - 1)).id === 'desert';
    switch (zone) {
      case 'surface':
        // 까마귀는 원래 비중의 40%로 줄이고, 슬라임은 2배로 늘렸다 (기존 슬라임2:까마귀1 → 슬라임10:까마귀1) 낮에는 순한 동물(토끼/도마뱀)도 소량 섞여 지형을 채운다 —
        // 야간에는 등장하지 않는다
        if (desert) return night ? ['scorpion', 'sandmaw', 'zombie']
          : ['scorpion', 'sandmaw', 'ashcrow', 'sand_lizard'];
        return night ? [...Array(5).fill('zombie'), ...Array(5).fill('slime'), 'ashcrow']
          : [...Array(10).fill('slime'), 'ashcrow', 'rabbit', 'rabbit', 'rabbit'];
      case 'cave': return desert ? ['spider', 'scorpion', 'minerghost', 'bat']
        : ['bat', 'skeleton', 'archer', 'spider', 'minerghost'];
      case 'deep': return ['skeleton', 'archer', 'wraith', 'crystalcrab', 'minerghost'];
      case 'corrupt': return night ? ['crawler', 'shadoweye', 'corrupttree']
        : ['crawler', 'shadoweye', 'corrupttree', 'ash_vole'];
      case 'sea': return [];                 // 바다는 trySpawnWater만 채운다
      // 해변 — 물 밖으로 밀려 나온 것들.
      case 'beach': return night ? ['driftling', 'driftling', 'glacier_stalker', 'zombie']
        : ['driftling', 'driftling', 'ashcrow', 'arctic_hare'];
      case 'ice': {
        /* 빙하 지대(세션 3)는 서리 지대와 같은 'ice' 구역 태그를 쓰지만 몹이 다르다. */
        const glacier = tx !== undefined && this.world.biomeAt(clamp(tx, 0, WW - 1)).id === 'glacier';
        if (glacier) return night ? ['glacier_stalker', 'crevasse_maw', 'glacier_stalker', 'icewolf']
          : ['glacier_stalker', 'crevasse_maw', 'frostling', 'arctic_hare'];
        return night ? ['frostling', 'icewolf', 'zombie'] : ['frostling', 'icewolf', 'slime', 'arctic_hare', 'arctic_hare'];
      }
      case 'hell': return ['imp', 'golem', 'lavaslug', 'imp'];
      case 'sky': return ['gale', 'sky_sentry', 'cloudjelly', 'gale'];
      case 'ruin': {
        /* 유적마다 매긴 무리(RUIN_SPEC[].mobs)를 쓴다 — 셋으로 다 같으면 어디를 들어가도 같은 곳처럼 느껴진다. */
        const r = ty !== undefined && this.world.ruinAt(tx, ty);
        const sp = r && r.id && RUIN_SPEC.find(q => q.id === r.id);
        if (sp && sp.mobs) {
          // 유적 지킴이(ruin_guard)는 어디에나 한 자리 섞는다 — 여덟 곳을 잇는 공통 설정이다
          return night ? [...sp.mobs, ...sp.mobs, 'ruin_guard'] : [...sp.mobs, 'ruin_guard', 'lantern'];
        }
        return ['ruin_guard', 'lantern', 'archivist'];
      }
      case 'works': return ['scrapcrawler', 'sparkwisp', 'riveter', 'foreman'];
      case 'runaway': return ['splitter', 'weldarm', 'coreling', 'splitter'];
      case 'atelier': return ['draft_form', 'scribe_hand', 'mold_walker', 'draft_form'];
      case 'citadel': return ['orbit_sentry', 'meridian_eye', 'ballast_form', 'meridian_eye'];
      case 'deepshaft': return ['gloom_crawler', 'damp_wisp', 'lost_miner', 'gloom_crawler'];
      // --- 바이옴. 밤에는 구성이 바뀐다 ---
      case 'jungle': return night ? ['vinelash', 'canopy_ape', 'bloomspitter', 'zombie']
        : ['vinelash', 'bloomspitter', 'canopy_ape', 'spider', 'jungle_frog'];
      case 'glowfen': return night ? ['sporeling', 'capbeast', 'sporeling', 'shadoweye']
        : ['sporeling', 'capbeast', 'bat', 'glow_snail'];
    }
    return ['slime'];
  },
  /* ---- 세계 이벤트 ---- */
  eventSpec() { return this.event ? EVENTS[this.event.id] : null; },
  /** 이 이벤트가 지금 플레이어 위치에서 실제로 작동하는가 */
  eventActive() { const { WW } = dimsOf(this.world);
    const e = this.eventSpec();
    if (!e) return false;
    const w = this.world, p = this.player;
    const tx = clamp(Math.floor(p.cx / TS), 0, WW - 1);
    const bio = w.biomeAt(tx).id;
    if (e.biome && bio !== e.biome) return false;
    /* 그 바이옴에서만 안 오는 날씨 — 비는 지상 어디에나 오지만 사막에는 안 온다. */
    if (e.notBiome && e.notBiome.indexOf(bio) >= 0) return false;
    const z = w.zoneAt(tx, Math.floor(p.cy / TS));
    return e.zones.indexOf(z) >= 0;
  },
  updateEvents(dt: number) { const { WW } = dimsOf(this.world);
    const night = DAY_CYCLE.isNight(this.dayT);
    const phase = (this.dayCount * 2) + (night ? 1 : 0);
    /* 운석은 이벤트(this.event)와 따로 굴린다 — 비·붉은 달이 오는 중에도 떨어질 수 있다. */
    if (this.meteorRolled === undefined) this.meteorRolled = phase;
    if (this.meteorRolled !== phase) {
      this.meteorRolled = phase;
      if (!this.meteor && new RNG(this.world.seed + '_meteor' + phase).chance(this.METEOR.chance)) this.startMeteor();
    }
    if (this.event) {
      this.event.t += dt;
      // 국면이 끝나면 이벤트도 끝난다.
      const e = EVENTS[this.event.id];
      if ((e.night && !night) || (e.day && night) || (e.dur && this.event.t >= e.dur)) {
        this.toast(tr('{e} {e2|이} 지나갔다', { e: e.i, e2: e.n }));
        this.event = null;
      }
      return;
    }
    if (this.eventRolled === phase) return;
    this.eventRolled = phase;
    const p = this.player;
    const tx = clamp(Math.floor(p.cx / TS), 0, WW - 1);
    const biome = this.world.biomeAt(tx).id;
    const r = new RNG(this.world.seed + '_ev' + phase);
    for (const id in EVENTS) {
      const e = EVENTS[id];
      if (e.night && !night) continue;
      if (e.day && night) continue;
      if (e.biome && e.biome !== biome) continue;
      if (e.notBiome && e.notBiome.indexOf(biome) >= 0) continue;
      if (!r.chance(e.chance)) continue;
      this.event = { id, t: 0 };
      this.toast(`${e.i} ${e.n} — ${e.d}`, 'bad');
      this.sfx('boss');
      break;
    }
  },

  /** 근처 웅덩이 한 곳을 골라 물속 생물을 채운다. */
  trySpawnWater(normal: any) { const { WSY } = dimsOf(this.world);
    const p = this.spawnFor || this.player, w = this.world;
    const pools = w.pools;
    if (!pools || !pools.length) return false;
    if (normal >= 20) return false;
    if (Math.random() > 0.35) return false;
    const near = [];
    for (const pl of pools) {
      const d = dist(p.cx, p.cy, (pl.x + .5) * TS, (pl.y + .5) * TS);
      if (d > 300 && d < 1100) near.push(pl);
    }
    if (!near.length) return false;
    const pool = near[Math.floor(Math.random() * near.length)];
    // 정글 폭포호처럼 spawnMul이 붙은 웅덩이는 그 비율만큼만 실제로 채운다 (동굴 호수 대비 60% — 지상 지형이라 은신처가 적다는 설정)
    if (pool.spawnMul !== undefined && Math.random() > pool.spawnMul) return false;
    // 웅덩이 표면 근처에서 실제로 물인 칸을 찾는다
    for (let att = 0; att < 12; att++) {
      const tx = pool.x + Math.round((Math.random() - .5) * (pool.big ? 18 : 8));
      const ty = pool.y + Math.floor(Math.random() * (pool.big ? 6 : 3));
      if (!w.liquid(tx, ty)) continue;
      const sx = tx * TS - this.cam.x, sy = ty * TS - this.cam.y;
      if (sx > -60 && sx < this.W + 60 && sy > -60 && sy < this.H + 60) continue;
      // 정글 폭포호는 위험한 웅덩이 뱀장어보다 눈에 잘 띄는 비단잉어가 대부분이어야 "물고기가 사는 호수"로 보인다 — 그래도 가끔은 긴장감이 있게 한 마리는 남겨 둔다
      const table = pool.biome === 'sea'
        /* 바다는 깊이가 곧 난이도다 — 수면 가까이는 게·해파리, 내려갈수록 상어·문어, 바닥 근처에서 초롱아귀. */
        /* 깊이 칸 수는 세계 크기만큼 늘린다(WSY) — 중형·대형 바다는 그만큼 깊어서, 그대로 두면 바다 대부분이 '가장 깊은 층' 표로 떨어진다 */
        ? (ty > (w.sea.level + 220 * WSY) ? ['abyss_angler', 'deep_octopus', 'abyss_angler']
         : ty > (w.sea.level + 90 * WSY) ? ['deep_octopus', 'reef_shark', 'abyss_angler']
         : ty > (w.sea.level + 30 * WSY) ? ['reef_shark', 'reef_crab', 'lantern_jelly', 'reef_shark']
         : ['reef_crab', 'lantern_jelly', 'reef_crab'])
        : pool.biome === 'jungle'
        ? ['jungle_koi', 'jungle_koi', 'jungle_koi', 'grotto_eel']
        : pool.big
        ? ['grotto_eel', 'cave_minnow', 'drowned_hand', 'grotto_eel']
        : ['cave_minnow', 'cave_minnow', 'grotto_eel'];
      const type = table[Math.floor(Math.random() * table.length)];
      if (this.ents.filter((e: Enemy) => e instanceof Enemy && e.def.ai === 'swimmer').length >= 7) return false;
      this.ents.push(new Enemy(type, tx * TS, ty * TS, this.scale()));
      return true;
    }
    return false;
  },

  /** 바다 부유물 — 바다 수면 가까이 있을 때만, 드물게. */
  trySpawnFlotsam() { const { SEA_X1 } = dimsOf(this.world);
    const p = this.spawnFor || this.player, w = this.world;
    if (!w.sea || Math.random() > 0.012) return false;
    const ptx = Math.floor(p.cx / TS), pty = Math.floor(p.cy / TS), lv = w.sea.level;
    if (ptx >= SEA_X1 + 20 || Math.abs(pty - lv) > 30) return false;
    const fl = this.ents.filter((e: Enemy) => e instanceof Enemy && e.def.ai === 'flotsam');
    if (fl.filter((e: Enemy) => Math.abs(e.cx / TS - ptx) < 100).length >= 2) return false;
    for (let att = 0; att < 10; att++) {
      const tx = clamp(ptx + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.floor(Math.random() * 60)), 4, SEA_X1 - 6);
      if (fl.some((e: Enemy) => Math.abs(e.cx / TS - tx) < 70)) continue;
      if (w.get(tx, lv) !== T.SEAWATER || w.get(tx, lv - 1) !== T.AIR) continue;
      const sx = tx * TS - this.cam.x;
      if (sx > -60 && sx < this.W + 60) continue;
      const r = Math.random();
      const type = r < 0.70 ? 'flotsam1' : r < 0.95 ? 'flotsam2' : 'flotsam3';
      const d = ENEMIES[type];
      this.ents.push(new Enemy(type, tx * TS, lv * TS - d.h * 0.5, this.scale()));
      return true;
    }
    return false;
  },

  trySpawn() { const { WW, WH, SEA_X1 } = dimsOf(this.world);
    if (this.dbgCalm) return;                           // 디버그 확인 자리(공장)만 켠다
    const p = this.spawnFor || this.player, w = this.world;
    const normal = this.ents.filter((e: Enemy) => e instanceof Enemy && !e.boss).length;
    const ev = this.eventActive() ? this.eventSpec() : null;
    /* 여럿이면 세계 전체 상한을 인원 × 0.75 까지 올린다(혼자면 그대로) — 멀티플레이 설계 §3-2 */
    if (normal >= (ev ? ev.cap : 22) * Math.max(1, 0.75 * this.players.length) || this.boss) return;
    const night = DAY_CYCLE.isNight(this.dayT);
    // 스폰 반경(최대 980px≈44타일)이 수직으로도 적용되므로, 하늘/유적처럼 고도로만 갈리는 구역은 플레이어가 실제로 그 구역에 있을 때만 후보로 허용한다 (지상에서 하늘 몹이 쏟아지는
    // 것 방지)
    const playerZone = w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    // 물속 생물은 웅덩이 안에서만 산다.
    if (this.trySpawnWater(normal)) return;
    if (this.trySpawnFlotsam()) return;
    for (let att = 0; att < 22; att++) {
      const ang = Math.random() * TAU;
      const rad = 520 + Math.random() * 460;
      const tx = Math.floor((p.cx + Math.cos(ang) * rad) / TS);
      const ty = Math.floor((p.cy + Math.sin(ang) * rad) / TS);
      if (tx < 3 || ty < 3 || tx >= WW - 3 || ty >= WH - 6) continue;
      // 바다에는 지상 몹이 나오지 않는다 — 물속 몹은 trySpawnWater가 따로 낸다
      if (tx < SEA_X1 + 8) continue;
      // 화면 밖이어야 함
      const sx = tx * TS - this.cam.x, sy = ty * TS - this.cam.y;
      if (sx > -80 && sx < this.W + 80 && sy > -80 && sy < this.H + 80) continue;
      if (w.get(tx, ty) !== T.AIR || w.get(tx, ty - 1) !== T.AIR) continue;
      const zone = w.zoneAt(tx, ty);
      if (zone === 'sky' && playerZone !== 'sky') continue;
      if (zone === 'ruin' && playerZone !== 'ruin') continue;
      if (zone === 'works' && playerZone !== 'works') continue;
      if (zone === 'runaway' && playerZone !== 'runaway') continue;
      if (zone === 'atelier' && playerZone !== 'atelier') continue;
      if (zone === 'citadel' && playerZone !== 'citadel') continue;
      if (zone === 'deepshaft' && playerZone !== 'deepshaft') continue;
      // 이벤트 중에는 해당 구역의 스폰표를 통째로 갈아 끼운다 — 단, 비처럼 table이 없는 이벤트는 몹 종류는 그대로 두고 세기만(buff) 바꾼다
      const evHere = ev && ev.zones.indexOf(zone) >= 0 ? ev : null;
      const table = (evHere && evHere.table) ? evHere.table : this.zoneTable(zone, night, tx, ty);
      if (!table.length) continue;            // 그 구역에 지상 몹이 없다(바다)
      const type = table[Math.floor(Math.random() * table.length)];
      const flying = ENEMIES[type].ai === 'flyer' || ENEMIES[type].ai === 'caster';
      let sy2 = ty;
      if (!flying) {
        // 몇 칸 아래까지 훑어 발 디딜 곳을 찾아 준다 — 사연: docs/code-history.md#h53
        let ok = false;
        for (let d = 0; d < 14; d++) {
          const yy = ty + d;
          if (yy >= WH - 6) break;
          if (w.solid(tx, yy + 1) && w.get(tx, yy) === T.AIR && w.get(tx, yy - 1) === T.AIR) { sy2 = yy; ok = true; break; }
        }
        if (!ok) continue;
      }
      // 안전 지대(베이스캠프·여명 마을) 근처 스폰 억제 — 발 디딜 곳을 찾은 뒤(sy2)의 실제 위치로 판정해야, 경계에서 위쪽 절반만 살짝 걸치는 어긋남이 안 생긴다
      if (w.zoneAt(tx, sy2) === 'camp' || w.zoneAt(tx, sy2) === 'village') continue;
      // 바이옴 유적 안이면 그 유적에 매긴 배율을 태운다 — 같은 잡몹이라도 갱도의 거미와 부패한 둥지의 사냥꾼은 세기가 달라야 유적을 고르는 의미가 생긴다
      const ruinMul = zone === 'ruin' ? w.ruinMobMul(tx, sy2) : 1;
      const e = new Enemy(type, tx * TS, (sy2 - 1) * TS, this.scale() * ruinMul);
      /* 개조 — 세션 2 에서는 옛 바이옴의 몹이 기계가 되어 서 있다. */
      if (this.MECH_ZONE[zone] && isMech(type, this.chapter)) e.makeMech(MECH_MUL);
      // buff형 이벤트(비 등) — 몹 종류는 평소 그대로, 체력·공격력만 따로 올린다
      if (evHere && evHere.buff) {
        if (evHere.buff.hp) { e.maxHp = Math.round(e.maxHp * evHere.buff.hp); e.hp = e.maxHp; }
        if (evHere.buff.dmg) e.dmg *= evHere.buff.dmg;
        e.weatherBuffed = true;
      }
      /* 붉은 달만 **플레이어 레벨을 탄다**(lvScale). */
      if (evHere && evHere.lvScale) {
        // 몹이 제 lvScale을 이미 물고 있으면(좀비) 그것을 나눠 내고 이벤트 배수로 갈아 끼운다 — 안 그러면 둘이 곱해져 좀비만 터무니없이 세진다
        const bm = bloodMult(p.level) / (e.lvFactor || 1);
        e.maxHp = Math.round(e.maxHp * bm); e.hp = e.maxHp;
        e.dmg *= bm;
        // 보상도 같은 배수를 탄다.
        e.xp = Math.round(e.xp * bm); e.gold = Math.round(e.gold * bm);
        e.weatherBuffed = true;
      }
      // 정예 — 어느 바이옴에서나 낮은 확률로, 그 자리에 있는 몹이 통째로 강해져 나온다.
      if (ENEMIES[type].ai !== 'critter' && !this.boss && this.rng.chance(0.018)) {
        e.maxHp = Math.round(e.maxHp * 2.6); e.hp = e.maxHp;
        e.dmg *= 1.8; e.armor += 14; e.xp = Math.round(e.xp * 4); e.gold = Math.round(e.gold * 4);
        e.elite = true;
        this.toast(tr('어디선가 유난히 사나운 {mobName}의 기척이 느껴진다', { mobName: mobName(type, e.mech) }), 'bad');
      }
      this.ents.push(e);
      return;
    }
  },
};

mixin(Game.prototype, SpawnPart, true);
