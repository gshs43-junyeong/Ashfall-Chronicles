/* ===== game/ruin-pulse.js — 유적의 맥박 · 탐사 기록 · 메아리 시련 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, fmt, tr } from '../lang.js';
import { WH } from '../size.js';
import { CAVE_TYPES, ECHO, ENEMIES, ITEMS, PULSE, PULSE_EVENTS, PULSE_RAGE, RUIN_LORE, RUIN_RELIC, RUIN_SPEC,
  STORY_RUIN, SURVEY_LABEL, SURVEY_TIERS, SURVEY_W, T, TILE_DEF } from '../data.js';
import { TS } from '../world.js';
import { Drop, Enemy, Part, makeItem, rollGear } from '../entity.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RuinPulsePart = {

  /** 장착 무기 + 스윙 궤적 + 채널링 링 (두 렌더 경로가 공유) */
  /* ================= 유적의 맥박 · 탐사 기록 · 메아리 시련 ================= */

  /** 그 자리의 바이옴 유적 — { r, spec, idx, id } 또는 null. */
  pulseRuinAt(tx, ty) {
    const r = this.world.ruinAt(tx, ty);
    if (!r || !r.id) return null;
    const spec = this.ruinSpec(r.id);
    if (!spec) return null;
    return { r, spec, idx: RUIN_SPEC.indexOf(spec), id: r.id };
  },
  /** 맥박·탐사 기록이 쓰는 유적 명세 — 바이옴 유적은 RUIN_SPEC 그대로, 석판 유적(story0~2)은 STORY_RUIN 에서 한 벌 만든다(주인·메아리·인장 없음, story 에
     석판 번호) — 사연: docs/code-history.md#h71 */
  ruinSpec(id) {
    const s = RUIN_SPEC.find(q => q.id === id);
    if (s) return s;
    const m = /^story(\d)$/.exec(id || '');
    if (!m || !STORY_RUIN[+m[1]]) return null;
    this._storySpec = this._storySpec || {};
    if (!this._storySpec[id]) {
      const st = STORY_RUIN[+m[1]];
      this._storySpec[id] = { id, n: st.n, mobs: st.mobs || ['skeleton'], rank: st.rank || 3,
        tier: 3, bonus: st.bonus, story: +m[1] };
    }
    return this._storySpec[id];
  },
  pulseStage(v) {
    let s = 0;
    for (let i = 0; i < PULSE.stages.length; i++) if (v >= PULSE.stages[i].at) s = i;
    return s;
  },
  pulseOf(id) { return ((this.ruinPulse || {})[id]) || 0; },
  hasSeal(k) {
    const e = this.player && this.player.equip;
    return !!e && [e.acc1, e.acc2].some(it => it && it.id === 'seal_' + k);
  },
  /** 맥박을 움직인다. */
  addPulse(id, v, byHand) {
    this.ruinPulse = this.ruinPulse || {};
    if (v > 0 && !byHand && this.hasSeal('mine')) v *= 0.75;
    const before = this.ruinPulse[id] || 0;
    const now = clamp(before + v, 0, 100);
    this.ruinPulse[id] = now;
    const s0 = this.pulseStage(before), s1 = this.pulseStage(now);
    /* 가장 높이 오른 단계는 **단계가 바뀔 때가 아니라 늘** 본다 — 물약·북이나 디버그처럼 값이 곧장 놓이면 경계를 안 넘고도 격노 안에 있을 수 있다 */
    const sv = this.surveyOf(id);
    if (s1 > (sv.peak || 0)) sv.peak = s1;
    if (s1 !== s0) this.onPulseStage(id, s0, s1);
  },
  onPulseStage(id, s0, s1) {
    const S = PULSE.stages[s1];
    if (s1 > s0) {
      /* 처음 한 번은 무엇이 일어나는지 말해 준다 — 규칙을 모르면 "갑자기 몹이 쏟아졌다"로만 읽힌다 */
      this.tally = this.tally || {};
      if (!this.tally.pulseHint) {
        this.tally.pulseHint = 1;
        this.toast(tr('유적이 당신을 알아챘다 — 머물수록 · 상자를 열수록 깨어나고, 쓰러뜨릴수록 가라앉는다'), 'bad');
      }
      this.toast(tr('유적의 맥박 — {S}', { S: S.n }), 'bad');
      this.shake = Math.max(this.shake || 0, 4 + s1 * 3);
      this.sfx('chapter');
      this._waveT = PULSE.wave[s1];
      if (s1 >= 3) { this._rageT = 8; this.checkSurvey(id); this.checkAch(); }
      /* 이미 벌어진 사건이 있으면 그것부터 끝내게 둔다(겹치면 둘 다 못 한다). */
      if (!this.pulseEvent && this.pulseHere === id) this.startPulseEvent(id, s1);
    } else if (this.pulseHere === id && s1 === 0) {
      this.toast(tr('유적이 다시 잠든다'), 'good');
    }
  },

  /** 매 프레임 — 유적 안이면 맥박을 올리고 기록을 적고, 밖에 있는 유적은 가라앉힌다 */
  updatePulse(dt) {
    const p = this.player, w = this.world;
    if (!p || !w || p.dead) return;
    this.ruinPulse = this.ruinPulse || {};
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    const here = this.pulseRuinAt(tx, ty);
    this.pulseHere = here ? here.id : null;
    if (this.pulseEvent) this.updatePulseEvent(here, dt);
    for (const k in this.ruinPulse)
      if ((!here || k !== here.id) && this.ruinPulse[k] > 0)
        this.ruinPulse[k] = Math.max(0, this.ruinPulse[k] - PULSE.fall * dt);
    if (!here) return;
    const id = here.id;
    /* 주인과 싸우는 동안은 오르지도 몰려오지도 않는다 — 그건 결판이지 탐험이 아니다. */
    if (!this.boss) this.addPulse(id, PULSE.rise * dt);
    this.surveyTick(here, dt);
    const st = this.pulseStage(this.pulseOf(id));

    // 인장 — 2초짜리 버프를 1초마다 갱신한다(매 프레임 걸면 매 프레임 recalc 가 돈다)
    this._sealT = (this._sealT || 0) - dt;
    if (this._sealT <= 0) {
      this._sealT = 1;
      if (st >= 2 && this.hasSeal('ice')) p.addBuff('pulse_ward', 2);
      if (st >= 3 && this.hasSeal('blight')) p.addBuff('pulse_fury', 2);
    }
    if (this.boss || st === 0) return;
    if (st >= 3) {
      this._rageT = (this._rageT === undefined ? 5 : this._rageT) - dt;
      if (this._rageT <= 0) { this._rageT = PULSE.rageEvery; this.pulseRage(here); }
    }
    if (this.pulseEvent) return;             // 사건 중에는 사건이 몰고 오는 것만 온다
    this._waveT = (this._waveT === undefined ? PULSE.wave[st] : this._waveT) - dt;
    if (this._waveT <= 0) {
      this._waveT = PULSE.wave[st];
      /* 이미 둘레에 많으면 더 부르지 않는다 — 몰려오는 것이 쌓이기만 하면 "피하면 계속 오른다"가 아니라 "그냥 못 버틴다"가 된다. */
      const near = this.ents.filter(e => e instanceof Enemy && !e.boss &&
        Math.abs(e.cx - p.cx) < 900 && Math.abs(e.cy - p.cy) < 600).length;
      if (near < 4 + st * 2) this.spawnRuinMobs(here, PULSE.waveN[st]);
    }
  },

  /** 유적의 것들을 **그 유적 안, 설 수 있는 자리에** 부른다. */
  spawnRuinMobs(here, n, mulX) {
    const w = this.world, p = this.player, pool = here.spec.mobs || ['skeleton'];
    const ptx = Math.floor(p.cx / TS), pty = Math.floor((p.y + p.h - 1) / TS);
    const mul = this.scale() * w.ruinMobMul(ptx, pty) * (mulX || 1);
    const out = [];
    for (let k = 0; k < n; k++) {
      const at = this.pulseSpot(here, 6, 20);
      if (!at) break;
      const e = new Enemy(pool[(k + (Math.random() * pool.length | 0)) % pool.length], at[0] * TS, at[1] * TS, mul);
      e.x = at[0] * TS + TS / 2 - e.w / 2; e.y = (at[1] + 1) * TS - e.h;
      this.ents.push(e); out.push(e);
      for (let q = 0; q < 10; q++) this.parts.push(new Part(e.cx, e.cy, '#e8303c', -40, .7));
    }
    return out;
  },
  /** 유적 안, 플레이어에게서 가로 minD~maxD 칸 떨어진 **설 수 있는** 칸 [tx, ty] (발은 ty+1 위) */
  pulseSpot(here, minD, maxD) {
    const w = this.world, p = this.player;
    const ptx = Math.floor(p.cx / TS), pty = Math.floor((p.y + p.h - 1) / TS);
    for (let att = 0; att < 80; att++) {
      const tx = ptx + (Math.random() < 0.5 ? -1 : 1) * (minD + Math.floor(Math.random() * (maxD - minD + 1)));
      const ty = pty + Math.floor(Math.random() * 11) - 6;
      if (w.solid(tx, ty) || w.solid(tx, ty - 1) || w.solid(tx + 1, ty) || w.solid(tx + 1, ty - 1)) continue;
      if (!w.solid(tx, ty + 1) || TILE_DEF[w.get(tx, ty)].liquid) continue;
      if (w.ruinAt(tx, ty) !== here.r) continue;
      return [tx, ty];
    }
    return null;
  },

  /* ---- 맥박 사건 (data.js PULSE_EVENTS) ---- */
  startPulseEvent(id, stage, force) {          // force — 확인용으로 갈래를 고정한다
    const here = this.pulseRuinAt(Math.floor(this.player.cx / TS), Math.floor(this.player.cy / TS));
    if (!here || here.id !== id) return;
    const pool = Object.keys(PULSE_EVENTS).filter(k => PULSE_EVENTS[k].stages.includes(stage) && k !== this._lastPev);
    if (!pool.length && !force) return;
    const k = force || pool[Math.floor(Math.random() * pool.length)];
    const E = PULSE_EVENTS[k];
    const ev = { id, k, stage, t: E.t, max: E.t };
    if (k === 'hunt') {
      // 격노면 둘 — 주인의 전령이다.
      ev.marks = this.spawnRuinMobs(here, stage >= 3 ? 2 : 1, 1.2);
      for (const e of ev.marks) {
        e.maxHp = Math.round(e.maxHp * 3); e.hp = e.maxHp; e.dmg *= 1.5; e.armor += 10;
        e.elite = true; e.pulseMark = true;
      }
      if (!ev.marks.length) return;
    } else if (k === 'stones') {
      /* 지금 방이 아닌 **다른 방** 셋에 — 가까운 방에서부터 고르되 서로 다른 방으로. */
      const site = (this.world.ruinSites || []).find(q => q.id === id);
      if (!site) return;
      const p = this.player, ptx = p.cx / TS, pty = p.cy / TS;
      const rooms = site.rooms.filter(r => !(ptx > r.x && ptx < r.x + r.w && pty > r.y && pty < r.y + r.h))
        .map(r => ({ r, d: Math.hypot(r.x + r.w / 2 - ptx, r.y + r.h / 2 - pty) }))
        .filter(q => q.d > 8).sort((a, b) => a.d - b.d).slice(0, 7);
      for (let i = rooms.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rooms[i], rooms[j]] = [rooms[j], rooms[i]]; }
      /* ★ 방 바닥 높이는 방마다 다르다 — 고정 높이(r.y+r.h-3)에 두면 발판 없는 허공에 떠 손이 안 닿았다(3씨앗 27유적 중 6).
         가운데에서 가까운 **설 수 있는 칸**의 발 높이에 둔다. */
      const w = this.world, standY = r => {
        const cx = r.x + (r.w >> 1);
        for (let d = 0; d < r.w >> 1; d++) for (const x of [cx + d, cx - d])
          for (let y = r.y + r.h - 2; y > r.y; y--)
            if (!w.solid(x, y) && !w.solid(x, y - 1) && TILE_DEF[w.get(x, y + 1)].solid) return [x, y + 1];
        return null;
      };
      ev.stones = rooms.map(q => standY(q.r)).filter(Boolean).slice(0, 3)
        .map(([x, y]) => ({ x: (x + 0.5) * TS, y: y * TS, got: false }));
      if (ev.stones.length < 3) return;
    } else if (k === 'greed') {
      const at = this.pulseSpot(here, 4, 12);
      if (!at) return;
      const spec = here.spec;
      ev.chest = { type: 'chest', tier: clamp(spec.tier + 1, 1, 6), greed: 1,
        x: at[0] * TS, y: (at[1] + 0.8) * TS - 26, w: 30, h: 26, items: null,
        bonus: spec.bonus, bonus2: spec.bonus2,
        guard: { t: spec.mobs[0], n: 2 + stage } };
      this.world.objects.push(ev.chest);
      for (let q = 0; q < 30; q++) this.parts.push(new Part(ev.chest.x + 15, ev.chest.y + 13, '#ffd24a', -40, 1));
    } else if (k === 'siege') {
      ev.wave = 0; ev.waveT = 0; ev.mobs = [];
    }
    this._lastPev = k;
    this.pulseEvent = ev;
    this.toast(`${E.i} ${E.n} — ${E.d}`, 'bad');
    this.shake = Math.max(this.shake || 0, 8);
  },
  updatePulseEvent(here, dt) {
    const ev = this.pulseEvent, p = this.player;
    const inside = here && here.id === ev.id;
    // 유적을 나가면 5초 안에 돌아와야 한다 — 포위는 나가는 순간 실패
    ev.away = inside ? 0 : (ev.away || 0) + dt;
    if (!inside && (ev.k === 'siege' || ev.away > 5)) { this.endPulseEvent(false); return; }
    ev.t -= dt;
    if (ev.k === 'hunt') {
      if (ev.marks.every(e => e.dead)) { this.endPulseEvent(true); return; }
    } else if (ev.k === 'stones') {
      for (const s of ev.stones)
        if (!s.got && Math.abs(s.x - p.cx) < 30 && Math.abs(s.y - (p.y + p.h)) < 44) {
          s.got = true;
          this.sfx('coin');
          for (let q = 0; q < 24; q++) this.parts.push(new Part(s.x, s.y - 14, '#8fe0ff', -50, 1));
          const left = ev.stones.filter(q => !q.got).length;
          if (left) this.toast(tr('공명석 — {n}/3', { n: 3 - left }), 'good');
        }
      if (ev.stones.every(q => q.got)) { this.endPulseEvent(true); return; }
    } else if (ev.k === 'greed') {
      if (ev.chest.items) { this.endPulseEvent(true); return; }
    } else if (ev.k === 'siege') {
      ev.waveT -= dt;
      if (ev.wave < 3 && ev.waveT <= 0) {
        ev.wave++; ev.waveT = 15;
        ev.mobs.push(...this.spawnRuinMobs(here, 1 + ev.stage + (ev.wave === 3 ? 1 : 0)));
        this.toast(tr('포위 — {wave}/3 무리', { wave: ev.wave }), 'bad');
      }
      if (ev.wave >= 3 && ev.mobs.every(e => e.dead)) { this.endPulseEvent(true); return; }
    }
    if (ev.t <= 0) this.endPulseEvent(false);
  },
  endPulseEvent(ok) {
    const ev = this.pulseEvent; if (!ev) return;
    this.pulseEvent = null;
    const E = PULSE_EVENTS[ev.k], p = this.player;
    const spec = this.ruinSpec(ev.id);
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    // 표식된 것이 살아 있으면 달아난다(사라진다) — 남겨 두면 표식 없는 정예가 되어 버린다
    if (ev.k === 'hunt') for (const e of ev.marks) if (!e.dead) {
      e.dead = true;
      for (let q = 0; q < 16; q++) this.parts.push(new Part(e.cx, e.cy, '#9a8aaa', -30, .8));
    }
    // 열지 않은 탐욕의 상자는 가라앉는다
    if (ev.k === 'greed' && !ev.chest.items) {
      const i = this.world.objects.indexOf(ev.chest);
      if (i >= 0) this.world.objects.splice(i, 1);
    }
    if (!ok) {
      this.addPulse(ev.id, 15);
      this.toast(tr('{E} — 놓쳤다. 유적이 더 깨어난다', { E: E.n }), 'bad');
      this.sfx('mine');
      return;
    }
    const st = ev.stage, rank = (spec && spec.rank) || 3;
    const sv = this.surveyOf(ev.id);
    sv.ev = (sv.ev || 0) + 1;
    (sv.evk = sv.evk || {})[ev.k] = 1;
    const gold = 120 * rank * st;
    p.gold += gold;
    p.addXp(Math.round(400 * st * this.scale()));
    if (spec && spec.bonus2 && ITEMS[spec.bonus2] && ev.k !== 'greed') give(makeItem(spec.bonus2, 1 + st));
    if (st >= 2) give(makeItem('pulse_shard', st - 1));
    const calm = { hunt: 15, stones: 35, greed: 0, siege: 25 }[ev.k];
    if (calm) this.addPulse(ev.id, -calm);
    this.toast(tr('{E} — 해냈다 · 금화 {gold}{v}', { E: E.n, gold: fmt(gold), v: calm ? ` ${tr('· 맥박 -')}` + calm : '' }), 'good');
    this.sfx('chapter');
    this.checkSurvey(ev.id);
    UI.refreshBag();
  },
  /** 사건 표지 — 공명석 · 표식된 것 · 탐욕의 상자. */
  drawPulseEvent(c) {
    const ev = this.pulseEvent; if (!ev) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, t = this.time || 0;
    const marks = [];
    if (ev.k === 'stones') for (const s of ev.stones) if (!s.got) marks.push([s.x, s.y - 16, '#8fe0ff', 'stone']);
    if (ev.k === 'hunt') for (const e of ev.marks) if (!e.dead) marks.push([e.cx, e.y - 14, '#ff5a4a', 'mark']);
    if (ev.k === 'greed' && !ev.chest.items) marks.push([ev.chest.x + 15, ev.chest.y - 10, '#ffd24a', 'mark']);
    c.save();
    for (const [x, y, col, kind] of marks) {
      const sx = x - cx0, sy = y - cy0;
      if (sx > 20 && sx < this.W - 20 && sy > 20 && sy < this.H - 20) {
        const bob = Math.sin(t * 4) * 3;
        if (kind === 'stone') {
          // 떠 있는 돌 — 빛기둥과 마름모
          const g = c.createLinearGradient(0, sy - 60, 0, sy + 16);
          g.addColorStop(0, 'rgba(143,224,255,0)'); g.addColorStop(1, 'rgba(143,224,255,0.35)');
          c.fillStyle = g; c.fillRect(sx - 6, sy - 60, 12, 76);
          c.fillStyle = col; c.beginPath();
          c.moveTo(sx, sy - 12 + bob); c.lineTo(sx + 8, sy + bob); c.lineTo(sx, sy + 12 + bob); c.lineTo(sx - 8, sy + bob);
          c.closePath(); c.fill();
          c.strokeStyle = '#ffffff'; c.globalAlpha = 0.6; c.stroke(); c.globalAlpha = 1;
        } else {
          c.fillStyle = col; c.beginPath();
          c.moveTo(sx, sy + 8 + bob); c.lineTo(sx - 7, sy - 4 + bob); c.lineTo(sx + 7, sy - 4 + bob); c.closePath(); c.fill();
        }
      } else {
        // 화면 밖 — 가장자리에 화살표
        const ax = clamp(sx, 26, this.W - 26), ay = clamp(sy, 70, this.H - 90);
        const ang = Math.atan2(sy - ay, sx - ax);
        c.translate(ax, ay); c.rotate(ang);
        c.fillStyle = col; c.globalAlpha = 0.85;
        c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -8); c.lineTo(-6, 8); c.closePath(); c.fill();
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      }
    }
    c.restore();
  },

  /** 격노 발작 — 그 유적 고유의 한 가지(data.js PULSE_RAGE). */
  pulseRage(here) {
    const R = PULSE_RAGE[here.id]; if (!R) return;
    const p = this.player;
    this.toast(R.t, 'bad');
    this.sfx('chapter');
    if (R.k === 'dark') { this.ruinDark = Math.max(this.ruinDark || 0, 6); this.spawnRuinMobs(here, 1); }
    else if (R.k === 'spore') this.ruinSpore = Math.max(this.ruinSpore || 0, 5);
    else if (R.k === 'heat') {
      p.hurt(8 + p.level * 0.6);
      for (let i = 0; i < 36; i++)
        this.parts.push(new Part(p.cx + (Math.random() - .5) * 320, p.cy - 120, '#ffb45a', 60, 1.0));
    } else if (R.k === 'quake') {
      this.shake = 18;
      for (let i = 0; i < 40; i++)
        this.parts.push(new Part(p.cx + (Math.random() - .5) * 300, p.cy - 110, '#6a5a48', 40, 1.1));
      this.spawnRuinMobs(here, 2);
    } else if (R.k === 'swarm') { this.shake = 12; this.spawnRuinMobs(here, 3); }
  },

  /** 유적 상자를 처음 열 때 — 맥박 단계만큼 덤을 얹고 맥박을 올린다. */
  pulseChest(o, tx, ty) {
    const here = this.pulseRuinAt(tx, ty);
    if (!here) return;
    const st = this.pulseStage(this.pulseOf(here.id));
    const up = st > 0 ? st + (this.hasSeal('pyramid') ? 1 : 0) : 0;
    const big = !!(o.relic || o.guard || o.ruinmap);        // 보물방 상자
    if (up >= 1 && here.spec.bonus && ITEMS[here.spec.bonus]) o.items.push(makeItem(here.spec.bonus, 1 + up));
    if (up >= 2 && here.spec.bonus2 && ITEMS[here.spec.bonus2]) o.items.push(makeItem(here.spec.bonus2, up));
    if (up >= 3) o.items.push(makeItem('pulse_shard', (big ? 2 : 1) + (up >= 4 ? 1 : 0)));
    if (up > 0) this.toast(tr('맥박이 뛰는 상자 — {stages}의 덤', { stages: PULSE.stages[st].n }), 'good');
    this.addPulse(here.id, big ? PULSE.vault : PULSE.chest);
  },

  /** 보스가 쓰러졌을 때(onBossDown 맨 앞) — 유적 주인이나 메아리였다면 맥박을 가라앉히고 보상 */
  pulseBossDown() {
    const echo = this.pendingEcho;
    this.pendingEcho = null;
    const idx = echo ? echo.idx : this.pendingLair;
    const spec = (idx !== undefined && idx !== null) ? RUIN_SPEC[idx] : null;
    if (!spec || !spec.id) return;
    const p = this.player, st = this.pulseStage(this.pulseOf(spec.id));
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    if (echo) this.echoReward(spec, echo.lv);
    else if (st >= 3) {
      // 격노를 들고 주인을 쓰러뜨렸다 — 그 값을 따로 친다
      give(makeItem('pulse_shard', 3));
      this.toast(tr('격노 속에서 주인을 쓰러뜨렸다 — 맥박 결정 셋'), 'good');
    }
    /* 주인이 쓰러지면 유적이 잠잠해진다. */
    this.ruinPulse = this.ruinPulse || {};
    this.ruinPulse[spec.id] = echo ? Math.min(this.pulseOf(spec.id), PULSE.stages[2].at) : 0;
    this.checkSurvey(spec.id);
    UI.refreshBag();
  },

  /* ---- 탐사 기록 ---- */
  surveyOf(id) {
    this.survey = this.survey || {};
    return this.survey[id] || (this.survey[id] = { rooms: {}, peak: 0, echo: 0 });
  },
  /** 유적 안에 있는 동안 — 밟은 방을 적고, 2초마다 등급을 다시 잰다 */
  surveyTick(here, dt) {
    this._svT = (this._svT || 0) - dt;
    if (this._svT > 0) return;
    this._svT = 0.5;
    const p = this.player, sv = this.surveyOf(here.id);
    const site = (this.world.ruinSites || []).find(s => s.id === here.id);
    if (!site) return;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    let fresh = false;
    site.rooms.forEach((r, i) => {
      if (sv.rooms[i]) return;
      if (tx > r.x && tx < r.x + r.w - 1 && ty > r.y && ty < r.y + r.h - 1) { sv.rooms[i] = 1; fresh = true; }
    });
    this._svFull = (this._svFull || 0) + 1;
    if (fresh || this._svFull >= 4) { this._svFull = 0; this.checkSurvey(here.id); }
  },
  /** 그 유적의 점수와 등급. */
  surveyScore(id) {
    const w = this.world, sv = (this.survey || {})[id] || { rooms: {} };
    const site = (w.ruinSites || []).find(s => s.id === id);
    const r = (w.ruins || []).find(q => q.id === id);
    const idx = RUIN_SPEC.findIndex(s => s.id === id);
    const part = {};
    const nRooms = site ? site.rooms.length : 0;
    part.rooms = nRooms ? [Object.keys(sv.rooms || {}).length, nRooms] : null;
    let chests = 0, opened = 0, code = null;
    if (r) {
      const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, y0 = r.y - r.h / 2, y1 = r.y + r.h / 2;
      for (const o of w.objects) {
        if (o.type === 'codedoor' && o.ruin === id) code = [o.opened ? 1 : 0, 1];
        // 탐욕의 상자는 사건의 몫, 동굴 상자(cave)는 둘레 사각형에 걸린 바깥 굴의 것이다
        if (o.type !== 'chest' || o.greed || o.cave) continue;
        const ox = o.x / TS, oy = o.y / TS;
        if (ox > x0 && ox < x1 && oy > y0 && oy < y1) { chests++; if (o.items) opened++; }
      }
    }
    part.chests = chests ? [opened, chests] : null;
    part.lore = RUIN_LORE[id] ? [(this.loreRead || {})[id] ? 1 : 0, 1] : null;
    const spec = this.ruinSpec(id), story = spec && spec.story !== undefined;
    // 석판 유적은 주인 대신 석판 — 읽었나(tabletsRead 는 석판 번호로 적힌다)
    part.boss = story ? [(this.tabletsRead || {})[spec.story] ? 1 : 0, 1]
                      : [idx >= 0 && (this.lairs || {})[idx] ? 1 : 0, 1];
    part.code = code;
    part.rage = [(sv.peak || 0) >= 3 ? 1 : 0, 1];
    part.events = [sv.ev || 0, 5];
    part.kinds = [Object.keys(sv.evk || {}).length, Object.keys(PULSE_EVENTS).length];
    part.echo = story ? null : [sv.echo || 0, ECHO.max];   // 석판 유적에는 메아리가 없다
    /* 점수는 진행 막대용 — 등급은 아래 문턱으로만 정한다(data.js SURVEY_TIERS 의 ★) */
    let got = 0, max = 0;
    for (const k in SURVEY_W) {
      if (!part[k]) continue;
      got += SURVEY_W[k] * Math.min(1, part[k][0] / part[k][1]); max += SURVEY_W[k];
    }
    const score = max ? Math.floor(got / max * 100) : 0;
    /* 조건 하나의 충족 여부 — rooms·chests 는 비율, events·kinds·echo 는 개수, 나머지는 했나. */
    const meets = (k, v) => {
      const q = part[k]; if (!q) return true;
      if (k === 'rooms' || k === 'chests') return q[0] / q[1] >= v - 1e-9;
      if (k === 'events' || k === 'kinds' || k === 'echo') return q[0] >= v;
      return q[0] >= 1;
    };
    let tier = SURVEY_TIERS[SURVEY_TIERS.length - 1], next = null, missing = [];
    for (let i = 0; i < SURVEY_TIERS.length; i++) {
      const T0 = SURVEY_TIERS[i];
      if (Object.keys(T0.need).every(k => meets(k, T0.need[k]))) {
        tier = T0; next = i > 0 ? SURVEY_TIERS[i - 1] : null; break;
      }
    }
    const label = k => (story && k === 'boss') ? tr('석판') : SURVEY_LABEL[k];
    if (next) missing = Object.keys(next.need).filter(k => !meets(k, next.need[k])).map(k => {
      const v = next.need[k], q = part[k];
      if (k === 'rooms' || k === 'chests') return tr('{label} {n}% (지금 {n2}%)', { label: label(k), n: Math.round(v * 100), n2: Math.floor(q[0] / q[1] * 100) });
      if (k === 'events' || k === 'kinds' || k === 'echo') return tr('{label} {v} (지금 {q})', { label: label(k), v, q: q[0] });
      return label(k);
    });
    return { score, rank: tier.r, col: tier.c, next: next && next.r, missing, part, sv, story,
             seen: !!(this.seenRuins || {})[id] };
  },
  /** 등급이 오르면 알리고, A · S 에 처음 닿으면 보상을 준다 */
  checkSurvey(id) {
    const spec = this.ruinSpec(id); if (!spec) return;
    const sc = this.surveyScore(id), sv = sc.sv, p = this.player;
    const order = SURVEY_TIERS.map(q => q.r);
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    if (sv.best && order.indexOf(sc.rank) >= order.indexOf(sv.best)) return;   // 오르지 않았다
    const firstTime = !sv.best;
    sv.best = sc.rank;
    if (firstTime && sc.rank === 'D') return;      // 막 들어온 것 — 알릴 만한 일이 아니다
    this.toast(tr('탐사 기록 {rank} — {spec} (진행 {score}%)', { rank: sc.rank, spec: spec.n, score: sc.score }), 'good');
    if ((sc.rank === 'A' || sc.rank === 'S') && !sv.a) {
      sv.a = 1;
      const gold = 1200 * (spec.rank || 3);
      p.gold += gold;
      give(makeItem('pulse_shard', 3));
      this.toast(tr('{spec|을} 거의 다 봤다 — 금화 {gold} · 맥박 결정 셋', { spec: spec.n, gold: fmt(gold) }), 'good');
      this.sfx('manycoins');
    }
    if (sc.rank === 'S' && !sv.s) {
      sv.s = 1;
      const sid = 'seal_' + id;
      if (ITEMS[sid]) { give(makeItem(sid, 1)); this.toast(tr('샅샅이 뒤졌다 — {item}', { item: ITEMS[sid].n }), 'good'); }
      this.shake = 8; this.sfx('chapter');
    }
    this.checkAch();
    UI.refreshBag();
    if (UI.questTab === 'ruins') UI.refreshQuest();
  },

  /* ---- 메아리 시련 ---- */
  openEcho(o) {
    const spec = RUIN_SPEC[o.ruin];
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    const sv = this.surveyOf(spec.id);
    const best = sv.echo || 0, next = Math.min(ECHO.max, best + 1);
    const st = this.pulseStage(this.pulseOf(spec.id));
    const bn = ENEMIES[spec.boss] ? ENEMIES[spec.boss].n : tr('주인');
    const lines = [tr('주인은 쓰러졌지만, 둥지는 아직 그 모양을 기억한다.'),
                   tr('유적이 깨어 있으면 그 기억이 다시 일어선다.'), '',
                   tr('넘긴 메아리 {best} / {max}', { best, max: ECHO.max }) +
                   (best < ECHO.max ? ` ${tr('· 다음 {next}단계 — {bn} 체력·공격 ×{mul}', { next, bn, mul: ECHO.mul(next).toFixed(2) })}` +
                     (next > 1 ? ` ${tr('· 호위 {n}', { n: next - 1 })}` : '') : ` ${tr('· 끝까지 넘겼다')}`)];
    if (st < ECHO.needStage) {
      lines.push('', tr('유적이 잠들어 있다 — 맥박이 「{stages}」에 닿아야 메아리가 대답한다.', { stages: PULSE.stages[ECHO.needStage].n }));
      UI.openLore(tr('{spec} — 빈 둥지', { spec: spec.n }), lines, [{ t: tr('(물러난다)'), fn: () => UI.closeDialogue() }]);
      this.sfx('open');
      return;
    }
    const choices = [];
    const lvs = best < ECHO.max ? [next] : [];
    if (best >= 1) lvs.push(best);
    for (const lv of lvs) choices.push({
      t: tr('(메아리를 부른다 — {lv}단계{v})', { lv, v: lv > best ? ` ${tr('· 처음')}` : ` ${tr('· 다시')}` }), quest: 1,
      fn: () => { UI.closeDialogue(); this.summonEcho(o, spec, lv); }
    });
    choices.push({ t: tr('(그냥 둔다)'), fn: () => UI.closeDialogue() });
    UI.openLore(tr('{spec} — 메아리', { spec: spec.n }), lines, choices);
    this.sfx('open');
  },
  summonEcho(o, spec, lv) {
    if (this.boss) return;
    this.pendingLair = null;
    this.pendingEcho = { idx: o.ruin, id: spec.id, lv };
    this.spawnBoss(spec.boss, o.x + o.w / 2, o.y - 70);
    const e = this.boss;
    if (e) {
      // 보스는 장 배수를 안 탄다(Enemy 생성자의 ★) — 메아리 배수는 여기서 직접 곱한다
      const m = ECHO.mul(lv);
      e.maxHp = Math.round(e.maxHp * m); e.hp = e.maxHp; e.dmg *= m; e.armor *= m;
      e.echo = lv;
    }
    const here = this.pulseRuinAt(Math.floor((o.x + o.w / 2) / TS), Math.floor(o.y / TS));
    if (here && lv > 1) this.spawnRuinMobs(here, lv - 1);
    this.toast(tr('메아리 {lv}단계', { lv }), 'bad');
  },
  echoReward(spec, lv) {
    const p = this.player, sv = this.surveyOf(spec.id);
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    const first = lv > (sv.echo || 0);
    sv.echo = Math.max(sv.echo || 0, lv);
    const k = this.hasSeal('abyss') ? 1.5 : 1;
    const gold = Math.round(350 * lv * (spec.rank || 3) * k * (first ? 1.5 : 1));
    p.gold += gold;
    p.addXp(Math.round(1200 * lv * this.scale() * k));
    give(makeItem('pulse_shard', Math.round((lv + 1) * k)));
    if (spec.bonus2 && ITEMS[spec.bonus2]) give(makeItem(spec.bonus2, Math.round(2 * lv * k)));
    // 마지막 단계를 처음 넘기면 그 유적의 유물을 한 번 더 — 이번엔 잘 벼린 것으로
    const relic = RUIN_RELIC[spec.id];
    if (first && lv === ECHO.max && relic && ITEMS[relic]) {
      give(rollGear(relic, this.rng, 3));
      this.toast(tr('마지막 메아리가 흩어졌다 — {item}', { item: ITEMS[relic].n }), 'good');
    }
    this.toast(tr('메아리 {lv}단계를 넘겼다 — 금화 {gold}', { lv, gold: fmt(gold) }), 'good');
    this.sfx('manycoins');
    this.checkAch();
  },

  /** 맥박 막대 — 바이옴 유적 안에 있을 때만. */
  drawPulse(c) {
    const id = this.pulseHere; if (!id) return;
    const v = this.pulseOf(id), st = this.pulseStage(v), S = PULSE.stages[st];
    const Wd = 230, x = Math.round((this.W - Wd) / 2), y = this.boss ? 84 : 20;
    const t = this.time || 0;
    c.save();
    c.fillStyle = 'rgba(12,9,16,0.72)';
    c.fillRect(x, y, Wd, 30);
    c.strokeStyle = S.c; c.globalAlpha = 0.55; c.strokeRect(x + .5, y + .5, Wd - 1, 29); c.globalAlpha = 1;
    // 뛰는 심장 — 단계가 오를수록 빨리 뛴다
    const beat = Math.pow(Math.max(0, Math.sin(t * (2.2 + st * 1.6))), 6);
    const hr = 6 + beat * 2.2;
    c.fillStyle = S.c;
    c.beginPath();
    const hx = x + 16, hy = y + 15;
    c.moveTo(hx, hy + hr * 0.9);
    c.bezierCurveTo(hx - hr * 1.6, hy - hr * 0.2, hx - hr * 0.7, hy - hr * 1.3, hx, hy - hr * 0.35);
    c.bezierCurveTo(hx + hr * 0.7, hy - hr * 1.3, hx + hr * 1.6, hy - hr * 0.2, hx, hy + hr * 0.9);
    c.fill();
    // 막대 — 단계 경계에 눈금
    const bx = x + 32, bw = Wd - 44, by = y + 19;
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(bx, by, bw, 5);
    c.fillStyle = S.c; c.fillRect(bx, by, Math.round(bw * v / 100), 5);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    for (const s of PULSE.stages) if (s.at > 0) c.fillRect(bx + Math.round(bw * s.at / 100), by, 1, 5);
    c.font = '600 11px ' + FONT; c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillStyle = '#e8e0d0'; c.fillText(tr('유적의 맥박'), bx, y + 10);
    c.textAlign = 'right'; c.fillStyle = S.c; c.fillText(S.n, bx + bw, y + 10);
    // 사건 — 막대 바로 아래에 이름 · 진행 · 남은 시간
    const ev = this.pulseEvent;
    if (ev && ev.id === id) {
      const E = PULSE_EVENTS[ev.k];
      let prog = '';
      if (ev.k === 'stones') prog = `${ev.stones.filter(q => q.got).length}/3`;
      else if (ev.k === 'hunt') prog = `${ev.marks.filter(e => e.dead).length}/${ev.marks.length}`;
      else if (ev.k === 'siege') prog = tr('{wave}/3 무리', { wave: ev.wave });
      else if (ev.k === 'greed') prog = tr('상자');
      const ey = y + 32;
      c.fillStyle = 'rgba(12,9,16,0.72)'; c.fillRect(x, ey, Wd, 24);
      c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x + 8, ey + 19, Wd - 16, 2);
      c.fillStyle = ev.t < 10 ? '#e8303c' : '#e8dcc0';
      c.fillRect(x + 8, ey + 19, Math.max(0, (Wd - 16) * ev.t / ev.max), 2);
      c.textAlign = 'left'; c.fillStyle = '#e8dcc0'; c.fillText(`${E.i} ${E.n}  ${prog}`, x + 8, ey + 9);
      c.textAlign = 'right'; c.fillStyle = ev.t < 10 ? '#ff6a5a' : '#bdb49a';
      c.fillText(tr('{n}초', { n: Math.max(0, Math.ceil(ev.t)) }), x + Wd - 8, ey + 9);
    }
    c.restore();
    this.drawPulseEvent(c);
    // 격노 — 화면 테두리가 맥박에 맞춰 붉게 물든다('화면 효과' 설정을 따른다)
    if (st >= 3) {
      const a = 0.16 * beat * (this.fxScale ? this.fxScale() : 1);
      if (a > 0.004) {
        const eg = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .34,
          this.W / 2, this.H / 2, Math.max(this.W, this.H) * .64);
        eg.addColorStop(0, 'rgba(232,48,60,0)'); eg.addColorStop(1, 'rgba(232,48,60,1)');
        c.globalAlpha = a; c.fillStyle = eg; c.fillRect(0, 0, this.W, this.H); c.globalAlpha = 1;
      }
    }
  },

  /* 갈래(CAVE_TYPES)마다 몸에 오는 것이 다르게 했다: 이끼 굴은 아물고, 종유 동굴은 머리 위를 봐야 하고, 독기 굴은 숨이 따갑고, 금 간 자갈은 무너뜨리면 숨은 동굴이 열린다 —
     사연: docs/code-history.md#h72 */
  updateCaves(dt) {
    const p = this.player, w = this.world;
    if (!p || !w || p.dead) return;
    this.rocks = this.rocks || [];
    this.updateRocks(dt);
    if (this.quake) this.updateQuake(dt);
    if (this.meteor) this.updateMeteor(dt);
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
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
    if (C.id === 'drip' && this._dripCd <= 0 && Math.random() < 0.3) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = tx + dx;
        let y = -1;
        for (let dy = 1; dy <= 10; dy++) {
          const t = w.get(x, ty - dy);
          if (t === T.STALACTITE) { if (w.get(x, ty - dy + 1) !== T.STALACTITE) y = ty - dy; break; }
          if (w.solid(x, ty - dy)) break;
        }
        if (y < 0) continue;
        w.set(x, y, T.AIR);
        this.rocks.push({ x: (x + .5) * TS, y: (y + .5) * TS, vy: 0, t: 0.7, dmg: 14 + p.level * 0.9, kind: 'drip' });
        this._dripCd = 5;
        this.tally = this.tally || {};
        if (!this.tally.dripHint) { this.tally.dripHint = 1; this.toast(tr('머리 위 종유석이 흔들린다 — 비켜라!'), 'bad'); }
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

  /** 떨어지는 돌 — 흔들리는 동안(t) 제자리에서 먼지를 떨구고, 그다음 떨어진다 */
  updateRocks(dt) {
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
        if (hitP) p.hurt(r.dmg, r.x);
        for (let k = 0; k < 12; k++) this.parts.push(new Part(r.x, r.y, '#8a8478', -60, .8));
        this.sfx('break_stone');
        this.rocks.splice(i, 1);
      }
    }
  },
};
mixin(G, RuinPulsePart);
