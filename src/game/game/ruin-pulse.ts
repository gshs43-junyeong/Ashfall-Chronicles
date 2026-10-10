/* ===== game/ruin-pulse.js — 유적의 맥박 · 탐사 기록 · 메아리 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, fmt, tr } from '../lang.js';
import { T, TILE_DEF } from '../data.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { ECHO, PULSE, PULSE_EVENTS, PULSE_RAGE, RUIN_LORE, RUIN_RELIC, RUIN_SPEC, STORY_RUIN, SURVEY_LABEL,
  SURVEY_TIERS, SURVEY_W } from '../data/ruins.js';
import { TS } from '../world.js';
import { makeItem, rollGear } from '../items.js';
import { Drop, Enemy, Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
import { EV_SURVIVE } from './ruin-events.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RuinPulsePart: Bag = {

  /** 장착 무기 + 스윙 궤적 + 채널링 링 (두 렌더 경로가 공유) */
  /* ================= 유적의 맥박 · 탐사 기록 · 메아리 시련 ================= */

  /** 그 자리의 바이옴 유적 — { r, spec, idx, id } 또는 null. */
  pulseRuinAt(tx: number, ty: number) {
    const r = this.world.ruinInside(tx, ty);
    if (!r || !r.id) return null;
    const spec = this.ruinSpec(r.id);
    if (!spec) return null;
    return { r, spec, idx: RUIN_SPEC.indexOf(spec), id: r.id };
  },
  /** 맥박·탐사 기록이 쓰는 유적 명세 — 바이옴 유적은 RUIN_SPEC 그대로, 석판 유적(story0~2)은 STORY_RUIN 에서 한 벌 만든다(주인·메아리·인장 없음, story 에
     석판 번호) — 사연: docs/code-history.md#h71 */
  ruinSpec(id: string) {
    const s = RUIN_SPEC.find(q => q.id === id);
    if (s) return s;
    const m = /^story(\d)$/.exec(id || '');
    if (!m || !STORY_RUIN[+m[1]]) return null;
    this._storySpec = this._storySpec || {};
    if (!this._storySpec[id]) {
      const st = STORY_RUIN[+m[1]];
      this._storySpec[id] = { id, n: st.n, mobs: st.mobs || ['skeleton'], rank: st.rank || 3,
        tier: 3, bonus: st.bonus, bonus2: st.bonus2, story: +m[1],
        wall: st.wall || T.RUINBRICK, floor: T.RUINTILE, bg: 10, torch: T.TORCH };
    }
    return this._storySpec[id];
  },
  pulseStage(v: number) {
    let s = 0;
    for (let i = 0; i < PULSE.stages.length; i++) if (v >= PULSE.stages[i].at) s = i;
    return s;
  },
  pulseOf(id: string) { return ((this.ruinPulse || {})[id]) || 0; },
  hasSeal(k: any) {
    const e = this.player && this.player.equip;
    return !!e && [e.acc1, e.acc2].some(it => it && it.id === 'seal_' + k);
  },
  /** 맥박을 움직인다. */
  addPulse(id: string, v: number, byHand: any) {
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
  onPulseStage(id: string, s0: any, s1: any) {
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
      if (!this.pulseEvent && !this.puzzle && this.pulseHere === id) this.startPulseEvent(id, s1);
    } else if (this.pulseHere === id && s1 === 0) {
      this.toast(tr('유적이 다시 잠든다'), 'good');
    }
  },

  /** 매 프레임 — 유적 안이면 맥박을 올리고 기록을 적고, 밖에 있는 유적은 가라앉힌다 */
  updatePulse(dt: number) {
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
      const near = this.ents.filter((e: Enemy) => e instanceof Enemy && !e.boss &&
        Math.abs(e.cx - p.cx) < 900 && Math.abs(e.cy - p.cy) < 600).length;
      if (near < 4 + st * 2) this.spawnRuinMobs(here, PULSE.waveN[st]);
    }
  },

  /** 유적의 것들을 **그 유적 안, 설 수 있는 자리에** 부른다. */
  spawnRuinMobs(here: any, n: number, mulX: any) {
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
  pulseSpot(here: any, minD: any, maxD: any) {
    const w = this.world, p = this.player;
    const ptx = Math.floor(p.cx / TS), pty = Math.floor((p.y + p.h - 1) / TS);
    for (let att = 0; att < 80; att++) {
      const tx = ptx + (Math.random() < 0.5 ? -1 : 1) * (minD + Math.floor(Math.random() * (maxD - minD + 1)));
      const ty = pty + Math.floor(Math.random() * 11) - 6;
      if (w.solid(tx, ty) || w.solid(tx, ty - 1) || w.solid(tx + 1, ty) || w.solid(tx + 1, ty - 1)) continue;
      if (!w.solid(tx, ty + 1) || TILE_DEF[w.get(tx, ty)].liquid) continue;
      if (w.ruinInside(tx, ty) !== here.r) continue;
      return [tx, ty];
    }
    return null;
  },

  /* ---- 맥박 사건 (data.js PULSE_EVENTS) ---- */
  startPulseEvent(id: any, stage: any, force: any) {          // force — 확인용으로 갈래를 고정한다
    const here = this.pulseRuinAt(Math.floor(this.player.cx / TS), Math.floor(this.player.cy / TS));
    if (!here || here.id !== id) return;
    /* 그 유적의 것만 — 앞의 것과 번갈아(둘이니 늘 다른 쪽이 온다). 사연: docs/code-history.md#h169 */
    const mine = Object.keys(PULSE_EVENTS).filter(k => PULSE_EVENTS[k].ruin === id);
    const pool = mine.filter(k => k !== (this._lastPev || {})[id]);
    const order = force ? [force] : (pool.length ? pool : mine).sort(() => Math.random() - 0.5).concat(mine);
    for (const k of order) {
      const E = PULSE_EVENTS[k]; if (!E) continue;
      const ev: Bag = { id, k, stage, t: E.t, max: E.t };
      if (!this.evSetup(ev, here)) continue;               // 자리가 안 나오면 다른 쪽으로
      (this._lastPev = this._lastPev || {})[id] = k;
      this.pulseEvent = ev;
      this.toast(`${E.i} ${E.n} — ${E.d}`, 'bad');
      this.shake = Math.max(this.shake || 0, 8);
      this.sfx('chapter');
      return;
    }
  },
  updatePulseEvent(here: any, dt: number) {
    const ev = this.pulseEvent;
    const inside = here && here.id === ev.id;
    // 유적을 나가면 5초 안에 돌아와야 한다
    ev.away = inside ? 0 : (ev.away || 0) + dt;
    if (ev.away > 5) { this.endPulseEvent(false); return; }
    ev.t -= dt;
    const r = this.evTick(ev, here || { id: ev.id, spec: this.ruinSpec(ev.id) }, dt);
    if (this.pulseEvent !== ev) return;                     // 사건 안에서 끝났다(저울에서 물러남 따위)
    if (r === true) { this.endPulseEvent(true); return; }
    if (r === false) { this.endPulseEvent(false); return; }
    if (ev.t <= 0) this.endPulseEvent(!!EV_SURVIVE[ev.k]);
  },
  endPulseEvent(ok: boolean, quiet?: boolean) {
    const ev = this.pulseEvent; if (!ev) return;
    this.pulseEvent = null;
    const E = PULSE_EVENTS[ev.k], p = this.player;
    const spec = this.ruinSpec(ev.id);
    const give = (it: Bag) => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    this.evCleanup(ev, ok);
    if (quiet) return;                                      // 저울 앞에서 물러났다 — 놓친 것도 해낸 것도 아니다
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
    p.addXp(Math.round(p.xpNext * 0.15 * st));          // 레벨 곡선을 따른다 — 사연: docs/code-history.md#h44
    if (spec && spec.bonus2 && ITEMS[spec.bonus2]) give(makeItem(spec.bonus2, 1 + st)!);
    if (st >= 2) give(makeItem('pulse_shard', st - 1)!);
    const calm = E.calm === undefined ? 25 : E.calm;
    if (calm) this.addPulse(ev.id, -calm);
    this.toast(tr('{E} — 해냈다 · 금화 {gold}{v}', { E: E.n, gold: fmt(gold), v: calm ? ` ${tr('· 맥박 -')}` + calm : '' }), 'good');
    this.sfx('chapter');
    this.checkSurvey(ev.id);
    UI.refreshBag();
  },
  /** 격노 발작 — 그 유적 고유의 한 가지(data.js PULSE_RAGE). */
  pulseRage(here: any) {
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
  pulseChest(o: Bag, tx: number, ty: number) {
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
    const give = (it: Bag) => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    if (echo) this.echoReward(spec, echo.lv);
    else if (st >= 3) {
      // 격노를 들고 주인을 쓰러뜨렸다 — 그 값을 따로 친다
      give(makeItem('pulse_shard', 3)!);
      this.toast(tr('격노 속에서 주인을 쓰러뜨렸다 — 맥박 결정 셋'), 'good');
    }
    /* 주인이 쓰러지면 유적이 잠잠해진다. */
    this.ruinPulse = this.ruinPulse || {};
    this.ruinPulse[spec.id] = echo ? Math.min(this.pulseOf(spec.id), PULSE.stages[2].at) : 0;
    this.checkSurvey(spec.id);
    UI.refreshBag();
  },

  /* ---- 탐사 기록 ---- */
  surveyOf(id: string) {
    this.survey = this.survey || {};
    return this.survey[id] || (this.survey[id] = { rooms: {}, peak: 0, echo: 0 });
  },
  /** 유적 안에 있는 동안 — 밟은 방을 적고, 2초마다 등급을 다시 잰다 */
  surveyTick(here: any, dt: number) {
    this._svT = (this._svT || 0) - dt;
    if (this._svT > 0) return;
    this._svT = 0.5;
    const p = this.player, sv = this.surveyOf(here.id);
    const site = (this.world.ruinSites || []).find((s: any) => s.id === here.id);
    if (!site) return;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    let fresh = false;
    site.rooms.forEach((r: any, i: number) => {
      if (sv.rooms[i]) return;
      if (tx > r.x && tx < r.x + r.w - 1 && ty > r.y && ty < r.y + r.h - 1) { sv.rooms[i] = 1; fresh = true; }
    });
    this._svFull = (this._svFull || 0) + 1;
    if (fresh || this._svFull >= 4) { this._svFull = 0; this.checkSurvey(here.id); }
  },
  /** 그 유적의 점수와 등급. */
  surveyScore(id: string) {
    const w = this.world, sv = (this.survey || {})[id] || { rooms: {} };
    const site = (w.ruinSites || []).find((s: any) => s.id === id);
    const r = (w.ruins || []).find((q: any) => q.id === id);
    const idx = RUIN_SPEC.findIndex(s => s.id === id);
    const part: Bag = {};
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
    part.kinds = [Object.keys(sv.evk || {}).filter(k => PULSE_EVENTS[k] && PULSE_EVENTS[k].ruin === id).length,
                  Object.keys(PULSE_EVENTS).filter(k => PULSE_EVENTS[k].ruin === id).length];
    part.echo = story ? null : [sv.echo || 0, ECHO.max];   // 석판 유적에는 메아리가 없다
    const nPuz = site ? this.puzzleRooms(site).length : 0;
    part.puz = nPuz ? [Object.keys(sv.puz || {}).length, nPuz] : null;
    const dMax = site ? this.deepMax(site) : 0;
    part.deep = dMax ? [Math.min(sv.deepDone || 0, dMax), dMax] : null;   // 단계마다 깊은 곳 홀의 봉인
    /* 점수는 진행 막대용 — 등급은 아래 문턱으로만 정한다(data.js SURVEY_TIERS 의 ★) */
    let got = 0, max = 0;
    for (const k in SURVEY_W) {
      if (!part[k]) continue;
      got += SURVEY_W[k] * Math.min(1, part[k][0] / part[k][1]); max += SURVEY_W[k];
    }
    const score = max ? Math.floor(got / max * 100) : 0;
    /* 조건 하나의 충족 여부 — rooms·chests 는 비율, events·kinds·echo 는 개수, 나머지는 했나. */
    const meets = (k: any, v: number) => {
      const q = part[k]; if (!q) return true;
      if (k === 'rooms' || k === 'chests' || k === 'puz' || k === 'deep') return q[0] / q[1] >= v - 1e-9;
      if (k === 'events' || k === 'kinds' || k === 'echo') return q[0] >= v;
      return q[0] >= 1;
    };
    let tier = SURVEY_TIERS[SURVEY_TIERS.length - 1], next = null, missing: string[] = [];
    for (let i = 0; i < SURVEY_TIERS.length; i++) {
      const T0 = SURVEY_TIERS[i];
      if (Object.keys(T0.need).every(k => meets(k, T0.need[k]))) {
        tier = T0; next = i > 0 ? SURVEY_TIERS[i - 1] : null; break;
      }
    }
    const label = (k: any) => (story && k === 'boss') ? tr('석판') : SURVEY_LABEL[k];
    if (next) missing = Object.keys(next.need).filter(k => !meets(k, next.need[k])).map(k => {
      const v = next.need[k], q = part[k];
      if (k === 'rooms' || k === 'chests' || k === 'puz' || k === 'deep') return tr('{label} {n}% (지금 {n2}%)', { label: label(k), n: Math.round(v * 100), n2: Math.floor(q[0] / q[1] * 100) });
      if (k === 'events' || k === 'kinds' || k === 'echo') return tr('{label} {v} (지금 {q})', { label: label(k), v, q: q[0] });
      return label(k);
    });
    return { score, rank: tier.r, col: tier.c, next: next && next.r, missing, part, sv, story,
             seen: !!(this.seenRuins || {})[id] };
  },
  /** 등급이 오르면 알리고, A · S 에 처음 닿으면 보상을 준다 */
  checkSurvey(id: string) {
    const spec = this.ruinSpec(id); if (!spec) return;
    const sc = this.surveyScore(id), sv = sc.sv, p = this.player;
    const order = SURVEY_TIERS.map(q => q.r);
    const give = (it: Bag) => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    if (sv.best && order.indexOf(sc.rank) >= order.indexOf(sv.best)) return;   // 오르지 않았다
    const firstTime = !sv.best;
    sv.best = sc.rank;
    if (firstTime && sc.rank === 'D') return;      // 막 들어온 것 — 알릴 만한 일이 아니다
    this.toast(tr('탐사 기록 {rank} — {spec} (진행 {score}%)', { rank: sc.rank, spec: spec.n, score: sc.score }), 'good');
    if ((sc.rank === 'A' || sc.rank === 'S') && !sv.a) {
      sv.a = 1;
      const gold = 1200 * (spec.rank || 3);
      p.gold += gold;
      give(makeItem('pulse_shard', 3)!);
      this.toast(tr('{spec|을} 거의 다 봤다 — 금화 {gold} · 맥박 결정 셋', { spec: spec.n, gold: fmt(gold) }), 'good');
      this.sfx('manycoins');
    }
    if (sc.rank === 'S' && !sv.s) {
      sv.s = 1;
      const sid = 'seal_' + id;
      if (ITEMS[sid]) { give(makeItem(sid, 1)!); this.toast(tr('샅샅이 뒤졌다 — {item}', { item: ITEMS[sid].n }), 'good'); }
      this.shake = 8; this.sfx('chapter');
    }
    this.checkAch();
    UI.refreshBag();
    if (UI.questTab === 'ruins') UI.refreshQuest();
  },

  /* ---- 메아리 시련 ---- */
  openEcho(o: Bag) {
    const spec = RUIN_SPEC[o.ruin];
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    const sv = this.surveyOf(spec.id);
    const best = sv.echo || 0, next = Math.min(ECHO.max, best + 1);
    const st = this.pulseStage(this.pulseOf(spec.id));
    const bn = ENEMIES[spec.boss!] ? ENEMIES[spec.boss!].n : tr('주인');
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
  summonEcho(o: Bag, spec: Bag, lv: number) {
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
  echoReward(spec: Bag, lv: number) {
    const p = this.player, sv = this.surveyOf(spec.id);
    const give = (it: Bag) => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    const first = lv > (sv.echo || 0);
    sv.echo = Math.max(sv.echo || 0, lv);
    const k = this.hasSeal('abyss') ? 1.5 : 1;
    const gold = Math.round(350 * lv * (spec.rank || 3) * k * (first ? 1.5 : 1));
    p.gold += gold;
    p.addXp(Math.round(p.xpNext * 0.25 * lv * k));   // 되풀이할 수 있어 한 번에 한 레벨 남짓까지만
    give(makeItem('pulse_shard', Math.round((lv + 1) * k))!);
    if (spec.bonus2 && ITEMS[spec.bonus2]) give(makeItem(spec.bonus2, Math.round(2 * lv * k))!);
    // 마지막 단계를 처음 넘기면 그 유적의 유물을 한 번 더 — 이번엔 잘 벼린 것으로
    const relic = RUIN_RELIC[spec.id];
    if (first && lv === ECHO.max && relic && ITEMS[relic]) {
      give(rollGear(relic, this.rng, 3)!);
      this.toast(tr('마지막 메아리가 흩어졌다 — {item}', { item: ITEMS[relic].n }), 'good');
    }
    this.toast(tr('메아리 {lv}단계를 넘겼다 — 금화 {gold}', { lv, gold: fmt(gold) }), 'good');
    this.sfx('manycoins');
    this.checkAch();
  },

  /** 맥박 막대 — 바이옴 유적 안에 있을 때만. */
  drawPulse(c: any) {
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
      const prog = this.evProgress(ev);
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
    this.drawRuinEvent(c);
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
};

mixin(Game.prototype, RuinPulsePart, true);
