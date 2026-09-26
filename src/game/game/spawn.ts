/* ===== game/spawn.js — 스폰 · 잿빛 · 굴뚝 연기 · 기계 놓기 · 채취탑 ===== */
import { TAU, clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG, tileHash } from '../../engine/core/rng.js';
import { tr } from '../lang.js';
import { SEA_X1, WH, WSY, WW } from '../size.js';
import { T } from '../data.js';
import { MACHINE } from '../data/recipes.js';
import { ENEMIES, MECH_MUL, isMech, mobName } from '../data/enemies.js';
import { EVENTS, RIG, RUIN_SPEC } from '../data/ruins.js';
import { bloodMult } from '../data/pets.js';
import { CHAPTERS, SESSIONS } from '../data/story.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { LEAF_TWIG, TileArt } from '../tileart.js';
import { Sprites } from '../sprites.js';
import { Drop, Enemy, makeItem } from '../entity.js';
import { DIR_NAME, Factory, dirTable } from '../factory.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const SpawnPart: Bag = {

  /* ================= 스폰 ================= */
  /* 개조가 걸리는 구역 — 세션 1 바이옴의 지층들. */
  MECH_ZONE: { surface: 1, cave: 1, deep: 1, corrupt: 1, ice: 1, hell: 1, jungle: 1, glowfen: 1 },

  zoneTable(zone, night, tx, ty) {
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
  eventActive() {
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
  updateEvents(dt) {
    const night = this.dayT < 5 * 60 || this.dayT > 19 * 60;
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
  /* ================= 잿빛이 숲을 먹는다 ================= */
  /* 잿빛에 먹히는 칸과 그 세기 — 사연: docs/code-history.md#h48 */
  ASH_TILE: {
    [T.LEAF]: { shed: 0.82, fade: 1 },
    [T.FLOWER]: { shed: 0.95, fade: 1 },
    [T.WEED]: { shed: 0.70, fade: 1 },
    [T.GRASS]: { shed: 0, fade: 1 },
    [T.JUNGLELEAF]: { shed: 0.22, fade: 0.62, thin: 0.35 },
    [T.FERN]: { shed: 0.30, fade: 0.62 },
    [T.ORCHID]: { shed: 0.35, fade: 0.62 },
    [T.JUNGLEGRASS]: { shed: 0, fade: 0.62 }
  },
  ASH_BURNT: 0.30,          // 진 잎자리 중 타다 만 잎이 남는 비율
  /* 풀 갓이 바래는 규칙 (drawAshTile 의 !shed 갈래). */
  ASH_GRASS_EDGE: 0.16,
  ASH_GRASS_MIN: 0.40,

  /** 잎 칸의 변형(=가지 방향)을 줄기 쪽을 보고 고른다. */
  pickLeafV(w, tx, ty) {
    /* ★ **바로 옆 칸만** 본다. */
    if (w.get(tx - 1, ty) === T.WOOD) return 0;
    if (w.get(tx + 1, ty) === T.WOOD) return 1;
    if (w.get(tx, ty + 1) === T.WOOD) return 2;
    return 3;
  },

  /** 잿빛에 먹히는 칸 한 장. */
  drawAshTile(c, id, v, sx, sy, tx, ty, ashF0) {
    const spec = this.ASH_TILE[id];
    const ashF = ashF0 * spec.fade;      // 지형마다 드는 세기가 다르다 (정글은 절반)
    const solid = ashF > 0.98;
    const pair = (a) => {     // 같은 그림의 성한 판·잿빛 판을 a 만큼 겹쳐 그린다
      if (!solid) { c.globalAlpha = (1 - ashF) * a; TileArt.draw(c, id, v, sx, sy); }
      c.globalAlpha = ashF * a; TileArt.drawAsh(c, id, v, sx, sy);
    };

    if (!spec.shed) {
      /* 풀 칸 — **흙은 건드리지 않고 초록 갓만** 바랜다(tileart.js buildCapAsh). */
      TileArt.draw(c, id, v, sx, sy);                     // 흙까지 성한 판이 늘 바닥
      const on = clamp((ashF - tileHash(tx + 31337, ty + 6151)) / this.ASH_GRASS_EDGE, 0, 1);
      if (on > 0) {
        c.globalAlpha = on * (this.ASH_GRASS_MIN + (1 - this.ASH_GRASS_MIN) * ashF);
        TileArt.drawCapAsh(c, id, v, sx, sy);
      }
      c.globalAlpha = 1;
      return;
    }

    const gone = clamp((ashF * spec.shed - tileHash(tx + 7919, ty + 104729)) / 0.2, 0, 1);
    if (gone < 1) {
      /* 칸째로 지는 것만으로는 수관이 성글어지는 게 잘 안 보인다 — 남은 칸은 끝까지 처음처럼 빽빽하기 때문이다. */
      const keep = 1 - gone;
      /* ★ 밀도 세 단계 — 빽빽 → 성근1 → 성근2(거의 앙상). */
      const canThin = TileArt.thinAtlas && LEAF_TWIG[id];
      if (canThin) {
        const d = clamp((ashF - 0.10) / 0.80, 0, 1) * (spec.thin || 1);
        const t1 = clamp(d * 2, 0, 1), t2 = clamp(d * 2 - 1, 0, 1);
        const plate = (lv, a) => {
          if (a <= 0) return;
          if (!solid) { c.globalAlpha = (1 - ashF) * a; TileArt.drawThin(c, id, v, sx, sy, 0, lv); }
          c.globalAlpha = ashF * a; TileArt.drawThin(c, id, v, sx, sy, 1, lv);
        };
        plate(1, keep);                       // 바탕 — 가장 성근 판
        plate(0, keep * (1 - t2));            // 그 위에 성근1
        if (t1 < 1) pair(keep * (1 - t1));    // 그 위에 빽빽한 본판
      } else pair(keep);
    }
    /* 진 잎자리의 30%에는 타다 만 잎이 남는다. */
    if (gone > 0 && id === T.LEAF && tileHash(tx + 104729, ty + 7919) < this.ASH_BURNT) {
      c.globalAlpha = gone; TileArt.drawBurnt(c, v, sx, sy);
    }
    c.globalAlpha = 1;
  },

  /** 지금 잿빛이 얼마나 깊은가 (0 = 아직 색이 있다, 1 = 다 빠졌다) */
  /** 숲 원경의 잿빛 깊이(0=푸른 숲 · 1=죽은 나무만) — 사연: docs/code-history.md#h49 */
  ashF() {
    const last = Math.max(1, CHAPTERS.length - 1);
    const ch = clamp(this.chapter || 0, 0, last);
    return clamp(0.10 + (ch / last) * 0.78, 0.10, 0.88);
  },

  /* ================= 용광로 굴뚝 연기 ================= */
  /* ================= 기계 놓기 ================= */
  /** 놓을 방향 — 방향 키(T)로 고르지 않았으면 보고 있는 쪽(벨트를 깔며 걸으면 자연히 이어진다). */
  placeDirFor(key) {
    const n = dirTable(key).length;
    return this.placeDir != null && this.placeDir < n ? this.placeDir : (this.player.facing >= 0 ? 0 : 2);
  },
  /** 방향 키 — 기계를 들었으면 놓을 방향을 [보는 쪽 → 오른쪽 → 아래 …] 로 돌리고, 아니면 커서 밑 기계를 돌린다. */
  rotatePlace() {
    const p = this.player, w = this.world, hi = p.held();
    const key = hi && idef(hi).type === 'machine' ? idef(hi).mach : null;
    if (key) {
      if (!MACHINE[key].rot) { this.toast(tr('방향이 없는 기계다'), 'info'); return; }
      const n = dirTable(key).length, cur = this.placeDir != null && this.placeDir < n ? this.placeDir : -1;
      this.placeDir = cur + 1 >= n ? null : cur + 1;
      this.toast(`${tr('놓을 방향 —')} ` + (this.placeDir == null ? tr('보는 쪽') : DIR_NAME[this.placeDir]), 'craft');
      this.sfx('place');
      return;
    }
    const mtx = Math.floor(this.input.wx / TS), mty = Math.floor(this.input.wy / TS);
    const mac = Factory.at(w, mtx, mty);
    if (mac && dist(p.cx, p.cy, (mtx + .5) * TS, (mty + .5) * TS) <= TS * 7 && Factory.rotate(mac)) {
      this.sfx('place');
      if (UI.open === 'machine' && UI.machRef === mac) UI.refreshMachine(true);
    }
  },
  /** 기계를 들고 있으면 커서 칸에 반투명 미리보기 + 방향 화살표. 못 놓는 자리는 붉게. */
  drawPlaceGhost(c, camX, camY) {
    const p = this.player, w = this.world, hi = p && p.held();
    if (!hi || idef(hi).type !== 'machine' || UI.open) return;
    const key = idef(hi).mach, s = MACHINE[key];
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (Factory.at(w, tx, ty) || dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 7) return;
    const sx = tx * TS - camX, sy = ty * TS - camY;
    const ok = Factory.canPlace(w, tx, ty) && !w.inRig(tx, ty);
    c.save();
    c.globalAlpha = 0.45;
    if (key === 'belt' || key === 'belt_fast') Factory.drawBelt(c, sx, sy, key, this.placeDirFor(key), 0);
    else TileArt.draw(c, s.tile, 0, sx, sy);
    c.globalAlpha = 1;
    c.strokeStyle = ok ? 'rgba(160,230,140,.9)' : 'rgba(230,90,70,.9)';
    c.lineWidth = 1; c.strokeRect(sx + .5, sy + .5, TS - 1, TS - 1);
    if (s.rot) {
      const [dx, dy] = dirTable(key)[this.placeDirFor(key)];
      const cx = sx + TS / 2, cy = sy + TS / 2, ang = Math.atan2(dy, dx);
      c.translate(cx, cy); c.rotate(ang);
      c.fillStyle = 'rgba(255,230,150,.95)';
      c.beginPath(); c.moveTo(TS / 2 + 5, 0); c.lineTo(TS / 2 - 3, -5); c.lineTo(TS / 2 - 3, 5); c.closePath(); c.fill();
    }
    c.restore();
  },

  /* ================= 채취탑 — 세션 2 에 다시 도는 대형 기계 ================= */
  /* 자리는 world.placeRigs 가 골라 object(type 'rig')로 저장한다 — 여기는 그림·쿵·해체만. */
  RIG_THUD: 4.6,            // 쿵 간격(초)
  RIG_NEAR: 5 * 22,         // 쿵이 들리는 거리(px) — 탑 바로 밑
  /* 그림 배율. */
  RIG_SCALE: 0.66,
  RIG_TOP: 256,             // 굴뚝 꼭대기(배율 1일 때 y)

  /** 서 있는 채취탑들(해체한 것은 빼고). */
  rigs() {
    const w = this.world;
    if (!w) return [];
    if (!this._rigs) this._rigs = w.objects.filter(o => o.type === 'rig');
    return this._rigs.filter(o => !o.gone);
  },

  /** 채취탑 해체 — 세션 2(공창)가 끝난 뒤에만. 부품(RIG.parts)이 쏟아지고 탑은 사라진다. */
  useRig(o) {
    const done = this.chapter >= SESSIONS[2].ch0;
    if (!done) {
      UI.openLore(tr('채취탑'), this.rigOn(o)
        ? [tr('공창의 채취탑이 아직 땅을 두드리고 있다. 다리 하나가 사람 몸통보다 굵다.'), tr('공창이 멈추기 전에는 손댈 엄두가 안 난다.')]
        : [tr('녹슨 채취탑이다. 리벳 틈마다 재가 쌓여 있다.'), tr('누가 세웠는지 아무도 모른다 — 뜯어낼 수 있는 때가 오면 쓸 만한 부품이 많아 보인다.')], []);
      this.sfx('open');
      return;
    }
    UI.openLore(tr('멈춘 채취탑'), [tr('공창이 멈춘 뒤로 이 탑도 더는 돌지 않는다.'), tr('볼트를 풀면 강철판과 톱니, 모터까지 건질 수 있겠다.')], [{
      t: tr('채취탑을 해체한다'), fn: () => {
        UI.closeDialogue();
        o.gone = 1;
        const cx = o.tx * TS + TS / 2, cy = (o.ty - 3) * TS;
        for (const [id, n] of RIG.parts) this.drops.push(new Drop(cx + (Math.random() - 0.5) * 60, cy, makeItem(id, n)));
        this.matBurst('metal', cx, cy, 30, { spd: 1.4 });
        this.shake = 10;
        this.sfx('break_machine');
        this.toast(tr('채취탑을 해체했다 — 부품이 쏟아졌다'), 'good');
      }
    }]);
    this.sfx('open');
  },

  /** 이 탑이 지금 도는가. */
  rigOn(r) { return this.chapter >= r.wake; },

  updateRigs(dt) {
    const p = this.player;
    if (!p || this.chapter < 9) return;
    for (const r of this.rigs()) {
      if (!this.rigOn(r)) continue;
      const dx = r.tx * TS + TS / 2 - p.cx, dy = r.ty * TS - p.cy;
      if (Math.abs(dx) > this.RIG_NEAR || Math.abs(dy) > this.RIG_NEAR * 1.4) { r.thud = 0; continue; }
      r.thud = (r.thud || 0) + dt;
      if (r.thud >= this.RIG_THUD) {
        r.thud = 0;
        this.shake = Math.max(this.shake, 2);     // 전투 타격(18)의 1/9 — 있는 줄만 알 정도
        this.sfxAt('drill', r.tx, r.ty);
      }
    }
  },

  SMOKE_EVERY: 0.42,        // 굴뚝 하나가 한 덩이를 뱉는 간격(초)
  SMOKE_MAX: 80,            // 동시에 살아 있는 덩이 수 상한
  SMOKE_RISE: 30,           // 오르는 속도(px/초)
  SMOKE_VENT_X: 15,         // 굴뚝 가운데 — 용광로 그림(44×44) 안의 자리
  SMOKE_VENT_Y: 6,          // 굴뚝 꼭대기

  /** 이 자리 위로 막힌 칸까지 몇 px인가. */
  smokeCeil(x, y) {
    const w = this.world;
    const tx = clamp(Math.floor(x / TS), 0, WW - 1);
    const y0 = Math.floor(y / TS);
    for (let d = 1; d <= 10; d++) {
      const ty = y0 - d;
      if (ty < 0) return null;
      if (w.solid(tx, ty)) return y - (ty + 1) * TS;
    }
    return null;
  },

  updateSmoke(dt) {
    const w = this.world, p = this.player;
    if (!w || !p) return;
    if (!this.smokes) this.smokes = [];
    this.smokeT = (this.smokeT || 0) + dt;
    if (this.smokeT >= this.SMOKE_EVERY) {
      this.smokeT = 0;
      const rx = this.W * 0.7 + 90, ry = this.H * 0.7 + 90;
      /* 연기를 뿜는 것 = 용광로 + 도는 채취탑. */
      const vents = [];
      for (const o of w.objects)
        if (o.type === 'forge') vents.push([o.x + this.SMOKE_VENT_X, o.y + this.SMOKE_VENT_Y]);
      for (const r of this.rigs())
        if (this.rigOn(r)) vents.push([r.tx * TS + TS / 2 + 17 * this.RIG_SCALE,
                                       r.ty * TS - this.RIG_TOP * this.RIG_SCALE]);
      for (const [vx, vy] of vents) {
        if (Math.abs(vx - p.cx) > rx || Math.abs(vy - p.cy) > ry) continue;
        if (this.smokes.length >= this.SMOKE_MAX) break;
        /* 위에 천장이 있으면 **닿을 만큼은 살게** 한다. */
        const gap = this.smokeCeil(vx, vy);
        const dur = gap === null ? 3.6 + Math.random() * 1.4
                                 : Math.min(9, gap / this.SMOKE_RISE + 1.4 + Math.random() * 0.5);
        this.smokes.push({
          x: vx + (Math.random() - 0.5) * 3, y: vy,
          t: 0, dur,
          sway: Math.random() * TAU, sz: 10 + Math.random() * 3, stuck: 0
        });
      }
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.t += dt;
      if (s.t >= s.dur) { this.smokes.splice(i, 1); continue; }
      if (s.stuck) {
        // 천장에 닿았다 — 옆으로 번지며 사그라든다
        s.x += (s.sway < Math.PI ? 1 : -1) * 13 * dt;
      } else {
        const ny = s.y - this.SMOKE_RISE * dt;
        const tx = clamp(Math.floor(s.x / TS), 0, WW - 1);
        const ty = Math.floor((ny - s.sz * 0.4) / TS);
        if (ty >= 0 && w.solid(tx, ty)) { s.stuck = 1; s.y = (ty + 1) * TS + s.sz * 0.4; }
        else { s.y = ny; s.x += Math.sin(s.sway + s.t * 1.6) * 8 * dt; }
      }
    }
  },

  /** 채취탑 한 대. */
  drawRig(c, x, y, on, ph) {
    const dim = (hex, k) => {
      const n = parseInt(hex.slice(1), 16);
      const f = (v) => Math.round(v * k);
      return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`;
    };
    const k = on ? 1 : 0.52;          // 죽은 것은 같은 색을 어둡게 — 검게 칠하면 실루엣이 된다
    const DARK = dim('#39414a', k), MID = dim('#5a6470', k), LITE = dim('#7c8794', k);
    const RIVET = dim('#b9c4d0', k);

    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(this.RIG_SCALE, this.RIG_SCALE);   // 아래 좌표는 배율 1 기준 — RIG_SCALE 참고

    // 다리 넷 — 바깥 둘은 굵게, 안쪽 둘은 가늘게.
    c.strokeStyle = DARK; c.lineCap = 'butt';
    for (const [bx, tx2, wdt] of [[-42, -15, 8], [42, 15, 8], [-22, -9, 4], [22, 9, 4]]) {
      c.lineWidth = wdt;
      c.beginPath(); c.moveTo(bx, 4); c.lineTo(tx2, -118); c.stroke();
    }
    c.lineWidth = 3;                  // 가새 — 다리 사이 X 자
    for (const yy of [-34, -76]) {
      const s = 1 - (yy + 118) / 118 * 0.0;
      c.beginPath();
      c.moveTo(-40 * s * 0.72, yy - 16); c.lineTo(40 * s * 0.72, yy + 16);
      c.moveTo(40 * s * 0.72, yy - 16); c.lineTo(-40 * s * 0.72, yy + 16);
      c.stroke();
    }

    // 몸통 — 리벳 박은 통
    c.fillStyle = MID; c.fillRect(-30, -190, 60, 72);
    c.fillStyle = LITE; c.fillRect(-30, -190, 60, 10);
    c.fillStyle = DARK; c.fillRect(-30, -130, 60, 12);
    c.fillStyle = RIVET;
    for (let ry = -184; ry < -124; ry += 14)
      for (let rx = -25; rx <= 25; rx += 10) c.fillRect(rx, ry, 2, 2);

    // 굴뚝
    c.fillStyle = DARK; c.fillRect(8, -252, 18, 64);
    c.fillStyle = MID; c.fillRect(6, -256, 22, 7);

    // 등 — 꺼져 있으면 그냥 렌즈, 켜지면 맥이 뛴다
    const lx = 20, ly = -150;
    c.fillStyle = DARK; c.fillRect(lx - 7, ly - 7, 14, 14);
    if (on) {
      const a = 0.55 + Math.sin(ph * 1.7) * 0.3;
      c.save();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, 26);
      g.addColorStop(0, '#ffc878'); g.addColorStop(0.4, '#e07a1e'); g.addColorStop(1, '#e07a1e00');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 26, 0, TAU); c.fill();
      c.restore();
      c.fillStyle = '#ffd9a0'; c.fillRect(lx - 3, ly - 3, 6, 6);
    } else {
      c.fillStyle = dim('#6a5a48', k); c.fillRect(lx - 3, ly - 3, 6, 6);
    }
    c.restore();
  },

  drawRigs(c, camX, camY) {
    const rs = this.rigs();
    if (!rs.length) return;
    for (const r of rs) {
      const x = r.tx * TS + TS / 2 - camX, y = r.ty * TS - camY;
      if (x < -140 || x > this.W + 140 || y < -60 || y > this.H + 300) continue;
      this.drawRig(c, x, y, this.rigOn(r), this.time + r.tx * 0.37);
    }
  },

  drawSmoke(c, camX, camY) {
    if (!this.smokes || !this.smokes.length) return;
    for (const s of this.smokes) {
      const k = clamp(s.t / s.dur, 0, 1);
      const fr = Math.min(5, Math.floor(k * 6));
      const sz = s.sz * (1 + k * 1.6) * (s.stuck ? 1.3 : 1);
      const x = s.x - camX - sz / 2, y = s.y - camY - sz / 2;
      if (x < -sz || y < -sz || x > this.W || y > this.H) continue;
      c.globalAlpha = Math.min(1, (1 - k) * 1.7) * 0.86;
      if (!(this.spritesOn && Sprites.drawFx(c, 'smoke_forge', fr, x, y, sz))) {
        // 그림이 없으면 — 네모 한 장으로라도 연기가 오르는 것은 보이게 한다
        c.fillStyle = '#2c2722';
        c.fillRect(Math.round(x + sz * 0.2), Math.round(y + sz * 0.2), Math.round(sz * 0.6), Math.round(sz * 0.6));
      }
    }
    c.globalAlpha = 1;
  },

  /** 빗줄기 페이드 인/아웃 + 화면 좌표계 낙하 갱신. */
  updateWeather(dt) {
    /* ★ 비 이벤트의 zones 에는 village·camp 가 없다(안전 지대 몹까지 비로 강해지면 안 되니까). */
    const isRain = this.event && this.event.id === 'rain';
    const p = this.player, w = this.world;
    const zone = (isRain && p && w) ? w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS)) : null;
    const inSafeZone = zone === 'village' || zone === 'camp';
    const raining = isRain && (this.eventActive() || inSafeZone);
    // 얼음 지형에서는 같은 비 이벤트가 눈으로 보여야 자연스럽다
    const snowing = !!(raining && zone === 'ice');     // ★ !! — 비가 그치면 null 이 되어 '눈↔비 바뀜'으로 읽혀 빗줄기가 한꺼번에 지워졌다
    if (snowing !== !!this.snowMode) { this.snowMode = snowing; this.rainDrops = null; }
    this.rainT = clamp((this.rainT || 0) + (raining ? 1 : -1) * dt / 2.5, 0, 1);
    /* ★ 빗줄기는 세계에 붙어 있다 — 카메라가 움직인 만큼 반대로 민다. 화면에 붙여 두면 떨어지거나 뛸 때
       세계에 비해 비가 갑자기 빨라졌다 느려졌다 했다. 켜고 끄기는 **위에서 새로 날 때만**(d.on) 바꿔
       비가 위에서부터 들어오고 빠져나간다 — 한꺼번에 깔고 투명도만 올리면 화면 전체에 쫘르륵 쏟아졌다. */
    const cam = this.cam, pc = this._rainCam;
    let mx = pc ? cam.x - pc.x : 0, my = pc ? cam.y - pc.y : 0;
    if (Math.abs(mx) > this.W || Math.abs(my) > this.H) mx = my = 0;       // 순간이동 · 불러오기
    this._rainCam = { x: cam.x, y: cam.y };
    if (this.rainT <= 0 && (!this.rainDrops || !this.rainDrops.some(d => d.on))) { this.rainDrops = null; return; }
    const W = this.W || 1280, H = this.H || 720;
    if (!this.rainDrops) {
      this.rainDrops = [];
      const n = this.snowMode ? 110 : 160;
      for (let i = 0; i < n; i++) this.rainDrops.push(this.snowMode ? {
        x: Math.random() * W, y: Math.random() * H, k: i / n, on: false,
        r: 1.5 + Math.random() * 2, spd: 40 + Math.random() * 50,
        drift: Math.random() * TAU, sway: 20 + Math.random() * 30
      } : {
        x: Math.random() * W, y: Math.random() * H, k: i / n, on: false,
        len: 10 + Math.random() * 14, spd: 480 + Math.random() * 260
      });
    }
    const top = d => { d.y -= H + 40; d.x = Math.random() * W; d.on = d.k < this.rainT; };
    for (const d of this.rainDrops) {
      if (this.snowMode) {
        d.y += d.spd * dt - my; d.drift += dt * 1.4;
        d.x += Math.sin(d.drift) * d.sway * dt - mx;
      } else {
        d.y += d.spd * dt - my; d.x -= d.spd * 0.15 * dt + mx;
      }
      if (d.y > H) top(d);
      else if (d.y < -40) d.y += H + 40;
      if (d.x < -20) d.x += W + 40; else if (d.x > W + 20) d.x -= W + 40;
    }
  },

  /** 근처 웅덩이 한 곳을 골라 물속 생물을 채운다. */
  trySpawnWater(normal) {
    const p = this.player, w = this.world;
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
      if (this.ents.filter(e => e instanceof Enemy && e.def.ai === 'swimmer').length >= 7) return false;
      this.ents.push(new Enemy(type, tx * TS, ty * TS, this.scale()));
      return true;
    }
    return false;
  },

  /** 바다 부유물 — 바다 수면 가까이 있을 때만, 드물게. */
  trySpawnFlotsam() {
    const p = this.player, w = this.world;
    if (!w.sea || Math.random() > 0.012) return false;
    const ptx = Math.floor(p.cx / TS), pty = Math.floor(p.cy / TS), lv = w.sea.level;
    if (ptx >= SEA_X1 + 20 || Math.abs(pty - lv) > 30) return false;
    const fl = this.ents.filter(e => e instanceof Enemy && e.def.ai === 'flotsam');
    if (fl.filter(e => Math.abs(e.cx / TS - ptx) < 100).length >= 2) return false;
    for (let att = 0; att < 10; att++) {
      const tx = clamp(ptx + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.floor(Math.random() * 60)), 4, SEA_X1 - 6);
      if (fl.some(e => Math.abs(e.cx / TS - tx) < 70)) continue;
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

  trySpawn() {
    if (this.dbgCalm) return;                           // 디버그 확인 자리(공장)만 켠다
    const p = this.player, w = this.world;
    const normal = this.ents.filter(e => e instanceof Enemy && !e.boss).length;
    const ev = this.eventActive() ? this.eventSpec() : null;
    if (normal >= (ev ? ev.cap : 22) || this.boss) return;
    const night = this.dayT < 5 * 60 || this.dayT > 19 * 60;
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
mixin(G, SpawnPart);
