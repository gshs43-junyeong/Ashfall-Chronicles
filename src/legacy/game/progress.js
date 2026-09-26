/* ===== game/progress.js — 진행 · 세션 1 종장 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT_UI, fmt, tr } from '../lang.js';
import { SURF_BASE } from '../size.js';
import { ITEMS } from '../data/items.js';
import { MODE_OF } from '../data/start.js';
import { PROFS } from '../data/skills.js';
import { PULSE, RUIN_SPEC } from '../data/ruins.js';
import { CHAPTERS } from '../data/story.js';
import { idef } from '../data/values.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { TS } from '../world.js';
import { Drop, Part, itemName, makeItem, rollGear } from '../entity.js';
import { Factory } from '../factory.js';
import { $, UI } from '../ui.js';
import { G, SaveStore } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const ProgressPart = {

  /* ================= 진행 ================= */
  /* 정작 하고 싶은 것(내려가 보기, 유적 들어가 보기)은 목록에 없거나 있어도 순서가 강제됐다 — 사연: docs/code-history.md#h54 */
  objProgress(o) {
    const p = this.player;
    let cur = 0, max = 1, label = null;
    switch (o.type) {
      case 'kill': cur = p.kills[o.target] || 0; max = o.n; break;
      case 'mine': cur = p.mined[o.tile] || 0; max = o.n; break;
      case 'collect': cur = Math.max(p.countItem(o.item), p.gathered[o.item] || 0); max = o.n; break;
      case 'craft': cur = (this.crafted && this.crafted[o.item]) ? 1 : 0; max = 1; break;
      case 'talk': cur = (this.talked && this.talked[o.npc]) ? 1 : 0; max = 1; break;
      case 'depth':
        if (o.up) {   // 위로 올라가는 목표: 낮은 y일수록 진행
          const gained = clamp(SURF_BASE - (p.highest === undefined ? SURF_BASE : p.highest), 0, SURF_BASE - o.y);
          cur = gained; max = SURF_BASE - o.y;
        } else { cur = Math.min(p.deepest, o.y); max = o.y; }
        break;
      case 'boss': cur = p.bossKilled[o.target] ? 1 : 0; max = 1; break;
      /* 가 본 곳 — 바이옴 이름표(seenBiomes)와 유적 첫 입장(seenRuins)을 그대로 쓴다. */
      case 'explore':
        cur = (o.zone ? (this.seenBiomes && this.seenBiomes[o.zone])
                      : (this.seenRuins && this.seenRuins[o.ruin])) ? 1 : 0;
        break;
      /* 세우고 · 물리고 · 끊기. */
      case 'place': cur = this.placeProgress(o); max = o.stop ? 3 : 1; break;
      /* 이어서 하는 일(모으고 → 만들기) — 칸마다 단위가 달라 숫자를 더하지 않고 끝낸 칸을 센다. 앞 칸이 덜 됐으면 뒤 칸이 됐어도 못 넘긴다. */
      case 'and': {
        const ps = o.parts.map(q => this.objProgress(q));
        max = ps.length;
        cur = ps.findIndex(q => !q.done);
        if (cur < 0) cur = max;
        // 지금 칸의 진행을 함께 보인다 — '1/2' 만으로는 나무를 몇 개 더 모아야 하는지 모른다
        else label = tr('{n}/{max}단계', { n: cur + 1, max }) + (ps[cur].max > 1 ? ` · ${ps[cur].cur}/${ps[cur].max}` : '');
        break;
      }
    }
    return { cur: Math.min(cur, max), max, done: cur >= max, label };
  },

  /** 조립기: 놓았나(1) · 동력이 돈 적 있나(2) · 지금 멈춰 있나(3) */
  placeProgress(o) {
    const w = this.world;
    if (!w || !w.machines) return 0;
    let m = null;
    /* 세계가 지어 둔 기계(m.gen)는 안 본다 — "세웠다"는 **내 손으로** 세웠다는 뜻이다. */
    for (const q of w.machines.values()) if (q.t === o.mach && !q.gen) { m = q; break; }
    if (!m) return 0;
    if (!o.stop) return 1;
    if (!this.asmRan) return 1;
    return (typeof Factory !== 'undefined' && Factory.sat(w, m) > 0) ? 2 : 3;
  },

  /** 이 장이 지금 어디까지 왔는가 — 화면도 판정도 전부 이걸 본다 */
  chapterState(ch) {
    const basics = (ch.basics || []).map(o => ({ o, p: this.objProgress(o) }));
    const doneList = basics.filter(b => b.p.done);
    const need = ch.needBasics === undefined ? basics.length : ch.needBasics;
    const req = ch.require || [];
    const missing = req.filter(v => !doneList.some(b => b.o.verb === v));
    const ready = doneList.length >= need && !missing.length;
    const goal = ch.goal ? { o: ch.goal, p: this.objProgress(ch.goal) } : null;
    return {
      basics, done: doneList.length, need, ready, missing, goal,
      complete: ready && (!goal || goal.p.done)
    };
  },

  /** 아직 자격이 없는데 결전에 손대려 할 때 한 줄로 알려 준다 */
  goalLocked(ch, st) {
    if (!ch || st.ready) return '';
    if (st.missing.length) {
      const b = (ch.basics || []).find(o => o.verb === st.missing[0]);
      return `${tr('아직 자격이 없다 —')} ` + (b ? b.t : tr('이 장의 일이 남았다'));
    }
    return tr('아직 자격이 없다 — 준비 {done}/{need}', { done: st.done, need: st.need });
  },

  checkChapter() {
    const ch = CHAPTERS[this.chapter];
    if (!ch) return;
    if (!this.chapterState(ch).complete) { UI.refreshTracker(); return; }
    // 완료
    const p = this.player;
    p.addXp(ch.rw.xp); p.gold += ch.rw.gold;
    for (const [id, n] of (ch.rw.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 2);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    }
    this.toast(tr('『{title}』 완료 — 경험치 {xp} · 금화 {gold}', { title: ch.title, xp: fmt(ch.rw.xp), gold: fmt(ch.rw.gold) }), 'good');
    /* 별 연출이 얼마나 걸리는지 되받는다. */
    const starShow = this.gainStarOrbit(ch.id) || 0;
    this.chapter++;
    this.checkAch();
    UI.refreshBag();

    /* ★ 여명 마을 해금은 "다음 챕터가 없을 때"가 아니라 **8장(세션 1 종장)을 끝냈을 때**다. */
    /* 순서는 하나뿐이다 — 별 → 마을 → 뒷이야기 → 다음 장. */
    let delay = Math.max(1400, starShow);
    if (ch.id === 8 && !this.villageUnlocked) {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      this.rollBounties();
      // 별이 하늘로 다 올라간 다음에 마을이 드러난다
      const villageAt = starShow + 600;
      setTimeout(() => {
        UI.chapterCard({ sub: '', title: tr('여명 마을'), line: tr('잿빛이 걷혔다') });
        this.toast(tr('동쪽 숲에 묻혀 있던 도시가 드러났다.'), 'good');
        setTimeout(() => this.toast(tr('베이스캠프의 귀환 비석으로 여명 마을에 갈 수 있다.'), 'good'), 2400);
      }, villageAt);
      delay = villageAt + 4600;              // 마을 연출이 끝난 뒤에 뒷이야기
    }
    // 다음 장을 지금 붙잡아 둔다 — setTimeout 안에서 this.chapter를 다시 읽으면, 두 장이 잇달아 완료될 때 이미 넘어간 값을 읽어 엉뚱한 카드가 뜨거나 터진다
    const next = CHAPTERS[this.chapter];
    /* 끝난 장의 뒷이야기(outro) → 다음 장 카드 → 다음 장 도입(intro) 순으로 잇는다. */
    setTimeout(() => {
      UI.storyScene(ch, 'outro', () => {
        if (next) {
          UI.chapterCard(next);
          setTimeout(() => UI.storyScene(next, 'intro'), 4000);
        } else {
          // 이야기는 끝난 게 아니라 "여기까지 쓰였다". 뒤로 계속 이어붙일 자리를 남겨 둔다
          UI.chapterCard({ sub: tr('이야기는 계속된다'), title: tr('벽 너머'), line: tr('— 여기까지가 지금까지 쓰인 이야기다 —') });
          this.toast(tr('아직 열리지 않은 장이 남아 있다. 그때까지 이 세계는 당신 것이다.'), 'good');
        }
      });
    }, delay);
    UI.refreshTracker(); UI.refreshQuest();
    this.sfx('story');
    if (ch.rw.gold) this.pending.push({ t: 0.45, fn: () => this.sfx('manycoins') });
  },
  onKill() {
    // 유적 안에서 피를 보면 맥박이 가라앉는다 — 싸우는 사람은 격노를 붙들어 둘 수 있다
    if (this.pulseHere) this.addPulse(this.pulseHere, -PULSE.kill * (this.hasSeal('spore') ? 2 : 1));
    this.checkAch();
  },
  /* 업적 판정. */
  checkAch() {
    if (!this.player || !this.achievements) return;
    for (const a of ACHIEVEMENTS) {
      if (this.achievements[a.id]) continue;
      let ok = false;
      try { ok = !!a.check(this); } catch (e) { ok = false; }   // 아직 없는 값을 읽어도 죽지 않게
      if (!ok) continue;
      this.achievements[a.id] = Date.now();
      this.onAchieved(a);
    }
  },
  onAchieved(a) {
    this.toast(tr('업적 달성 — {a}', { a: a.n }), 'good');
    for (let i = 0; i < 24; i++)
      this.parts.push(new Part(this.player.cx, this.player.cy, '#ffe08a', -80, 1.0));
    this.sfx('ach');
    if (UI.open === 'quest') UI.refreshQuest();
  },
  /** 이벤트 중 처치 보상 배수 (경험치·금화) */
  killMult() {
    const ev = this.eventActive() ? this.eventSpec() : null;
    return ev ? ev.rw : 1;
  },
  onPickup(it) {
    if (it && idef(it).type !== 'block' && idef(it).type !== 'mat') this.toast(tr('{itemName} 획득', { itemName: itemName(it) }), 'good');
    UI.refreshBag();
  },
  /** 세션 1 의 진행 표시. */
  /* ================= 별이 하늘로 돌아간다 (세션 1 종장) ================= */
  /* ★ 별의 세 사건은 **천천히** 지나가야 한다 — 사연: docs/code-history.md#h55 */
  STAR_GAIN: 3.0,
  STAR_MERGE: 5.0,
  STAR_RISE_ALL: 5.0,
  get STAR_GATHER() { return this.STAR_RISE_ALL / 3; },   // 모이는 마디
  get STAR_RISE() { return this.STAR_RISE_ALL * 2 / 3; }, // 올라가는 마디
  startStarRise() {
    this.starRise = { t: 0, dur: this.STAR_GATHER + this.STAR_RISE, x: 0, y: 0 };
    /* 별의 세 사건은 제 소리를 쓴다(learn·level 을 빌리면 다섯 번뿐인 장면이 특성 창 소리로 지나간다). */
    this.sfx('star_rise');
  },
  /** 남은 시간(초). */
  tickStarRise(dt) {
    const s = this.starRise; if (!s) return;
    s.t += dt;
    const p = this.player;
    if (s.t < this.STAR_GATHER) {
      // 모이는 동안 반짝임이 조금씩 붙는다
      if (Math.random() < dt * 14)
        this.parts.push(new Part(p.cx + (Math.random() - .5) * 70, p.cy - 10 + (Math.random() - .5) * 40, '#ffe08a', -30, .6));
      return;
    }
    if (!s.popped) {                       // 한 점으로 모인 순간
      s.popped = 1;
      this.burst(p.cx, p.cy - 14, 'starmerge', 120, 2.6);
      this.ringFx(p.cx, p.cy - 14, 66, '#ffe8a8', .5);
      this.sfx('star_merge');
    }
    // 올라가는 동안 지나간 자리에 잔불을 남긴다
    const k = (s.t - this.STAR_GATHER) / this.STAR_RISE;
    const y = p.cy - 14 - k * k * 900;
    if (Math.random() < dt * 30)
      this.parts.push(new Part(p.cx + (Math.random() - .5) * 22, y + Math.random() * 40, '#ffe08a', 40, .7));
    if (s.t >= s.dur) {
      this.starRise = null;
      p.starOrbits = 0; p.starLit = 0; p.starFade = 1;
    }
  },

  gainStarOrbit(id) {
    const p = this.player;
    if (id >= 1 && id <= 5) {
      p.starOrbits = Math.min(5, (p.starOrbits || 0) + 1);
      /* 조각이 맺히는 것을 보여 준 다음에 말로 알린다 — 순서가 반대면 글자가 먼저 뜨고 그림이 뒤따라서 둘이 따로 논다. */
      /* 생성 3초 — 조각이 멀리서 내려와 궤도에 앉기까지. */
      this.starGain = { t: 0, dur: this.STAR_GAIN };
      setTimeout(() => {
        const q = this.player;
        this.burst(q.cx + 30, q.cy - 8, 'stargain', 46, this.STAR_GAIN * 0.8);
        this.sfx('star_gain');
      }, 700);
      setTimeout(() => this.toast(tr('별 조각이 하나 더 곁에 남았다 — {starOrbits}/5', { starOrbits: p.starOrbits }), 'good'),
                 this.STAR_GAIN * 1000 - 600);
      if (id === 5) {
        // 다섯이 한 점으로 모였다가 다시 퍼진다.
        p.starLit = 1;
        setTimeout(() => {
          this.starMerge = this.STAR_MERGE;
          this.burst(this.player.cx, this.player.cy - 4, 'starmerge', 176, this.STAR_MERGE * 0.9);
          this.shake = 10; this.sfx('star_merge');
        }, this.STAR_GAIN * 1000);
        // 생성이 끝난 뒤 합성이 시작되고, 그것도 다 보고 나서 뒷이야기로
        return (this.STAR_GAIN + this.STAR_MERGE) * 1000 + 900;
      }
      return this.STAR_GAIN * 1000 + 500;   // 조각이 맺히고 한 줄 뜰 때까지
    } else if (id === 8) {
      /* 세션 1 의 끝 — 조각이 곁을 떠나 하늘로 돌아간다. */
      setTimeout(() => this.startStarRise(), 700);
      setTimeout(() => this.toast(tr('다섯 조각이 곁을 떠나 하늘로 돌아갔다'), 'good'),
                 700 + (this.STAR_GATHER + this.STAR_RISE) * 1000 + 200);
      return 700 + (this.STAR_GATHER + this.STAR_RISE) * 1000 + 1200;
    }
    return 0;
  },

  onLevelUp(lv) {
    this.toast(tr('레벨 {lv} 달성! 스탯 +3, 특성 +1', { lv }), 'good');
    for (let i = 0; i < 30; i++) this.parts.push(new Part(this.player.cx, this.player.cy, '#ffe08a', -80, 0.9));
    UI.refreshStatAlloc(); this.sfx('level');
  },

  /** 생활 숙련이 한 단계 올랐다. */
  onProfUp(kind, lv) {
    const P = PROFS[kind]; if (!P) return;
    const perk = P.perks.find(([at]) => at === lv);
    this.toast(tr('{P} {P2} 숙련 {lv}{v}', { P: P.i, P2: P.n, lv, v: perk ? ` — ${perk[1]}` : '' }), 'good');
    const p = this.player;
    this.ringFx(p.cx, p.cy, perk ? 74 : 46, P.c, perk ? .55 : .35);
    for (let i = 0; i < (perk ? 26 : 12); i++)
      this.parts.push(new Part(p.cx, p.cy, P.c, -70, .8));
    this.sfx(perk ? 'level' : 'learn');
    if (perk) UI.chapterCard({ sub: tr('{P} 숙련 {lv}', { P: P.n, lv }), title: perk[1], line: perk[2] });
    if (UI.open === 'skill') UI.refreshProf();
  },
  onDeath(cause) {
    if (this.state !== 'play') return;
    this.tally = this.tally || {};
    this.tally.deaths = (this.tally.deaths || 0) + 1;
    if (cause) this.tally[cause] = (this.tally[cause] || 0) + 1;
    this.checkAch();
    const p = this.player;
    this.endBossFight();
    const lostXp = Math.floor(p.xp * 0.15), lostG = Math.floor(p.gold * 0.4);
    p.xp -= lostXp; p.gold -= lostG;
    // 죽은 자리를 남긴다 — 세계가 5000타일이 넘어 "어디서 죽었더라"를 기억으로 버티기 어렵다.
    /* 하드는 가방의 절반까지 비석에 함께 담는다. */
    const md = MODE_OF(this.mode);
    let lostItems = [];
    if (md.death === 'drop') {
      const filled = p.bag.map((it, i) => it ? i : -1).filter(i => i >= 0);
      // 잠근 칸(Ctrl+좌클릭)은 남긴다 — 잠금은 "이건 잃고 싶지 않다"는 표시다
      const droppable = filled.filter(i => !p.bag[i].lock);
      for (let n = Math.floor(droppable.length / 2); n > 0; n--) {
        const k = droppable.splice(Math.floor(Math.random() * droppable.length), 1)[0];
        lostItems.push(p.bag[k]); p.bag[k] = null;
      }
      UI.refreshBag();
    }
    this.deathMark = {
      x: p.cx, y: p.cy, gold: lostG, xp: lostXp, items: lostItems,
      // 게임 시간 12시간이 지나면 사라진다.
      at: this.dayCount * 1440 + this.dayT
    };
    if (md.death === 'wipe') {
      // 불가능 모드 — 이 슬롯의 기록을 지운다.
      this.deathMark = null;
      if (this.currentSlot !== null) SaveStore.remove(this.currentSlot).catch(e => console.error(e));
      $('#death-line').textContent = tr('불가능 모드였다. 이 슬롯의 기록이 지워졌다.');
      $('#death-screen').classList.add('open');
      $('#death-screen').classList.add('wipe');
      this.scenes.open('pause');
      this.sfx('death');
      return;
    }
    const parts = [tr('경험치 {lostXp}, 금화 {lostG}개를 잃었다.', { lostXp: fmt(lostXp), lostG: fmt(lostG) })];
    if (lostItems.length) parts.push(tr('가방에서 {lostItemsCount}칸이 떨어졌다.', { lostItemsCount: lostItems.length }));
    parts.push(tr('쓰러진 자리에 비석이 섰다 — 돌아가면 절반을 되찾는다.'));
    $('#death-line').textContent = parts.join(' ');
    $('#death-screen').classList.add('open');
    this.scenes.open('pause');
    this.sfx('death');
  },

  /** 쓰러지면 싸움은 없던 일 — 깨운 보스는 조용히 사라지고(처치 아님 · 보상 없음) 제단·둥지·메아리는 다시 깨울 수 있다. */
  endBossFight() {
    if (this.boss) { this.boss.dead = true; this.boss = null; }       // die() 를 거치지 않는다
    this.pendingLair = null; this.pendingEcho = null;
    UI.bossBar(null);
  },

  /* ---- 길잡이 ---- */
  questTargets() {
    const w = this.world, ch = CHAPTERS[this.chapter];
    const out = [];
    if (this.deathMark) out.push({ x: this.deathMark.x, y: this.deathMark.y, k: 'death', t: tr('쓰러진 자리') });
    /* 지도를 편 유적 — 입구가 없어 지도 없이는 못 찾는 곳이라, 표시가 곧 길이다. */
    for (const id in (this.ruinMarks || {})) {
      if (this.seenRuins && this.seenRuins[id]) continue;
      const r = w && w.ruins && w.ruins.find(q => q.id === id);
      if (!r) continue;
      const sp = RUIN_SPEC.find(q => q.id === id);
      out.push({ x: (r.x + 0.5) * TS, y: r.y * TS, k: 'ruin', t: (sp ? sp.n : tr('유적')) + ` ${tr('— 지도의 자리')}` });
    }
    if (!ch || !w) return out;
    /* 나침반 — 준비 중에는 basics 를, 자격을 갖춘 뒤에는 결전만 가리킨다 — 사연: docs/code-history.md#h56 */
    const stt = this.chapterState(ch);
    const aim = (stt.ready ? (stt.goal ? [stt.goal.o] : []) : stt.basics.filter(b => !b.p.done).map(b => b.o))
      .flatMap(o => o.type === 'and' ? o.parts : [o]);
    aim.forEach((o) => {
      if (this.objProgress(o).done) return;
      if (o.type === 'boss') {
        const ob = w.objects.find(q => (q.type === 'altar' || q.type === 'lair') && q.boss === o.target);
        if (ob) out.push({ x: ob.x + ob.w / 2, y: ob.y, k: 'boss', t: o.t });
      } else if (o.type === 'talk') {
        const ob = w.objects.find(q => q.type === 'npc' && q.npc === o.npc);
        if (ob) out.push({ x: ob.x + ob.w / 2, y: ob.y, k: 'npc', t: o.t });
      } else if (o.type === 'collect' && o.item === 'rune_frag') {
        for (const q of w.objects) if (q.type === 'tablet') out.push({ x: q.x, y: q.y, k: 'tablet', t: o.t });
      }
    });
    return out;
  },
  /** 화면 밖 목표를 플레이어 주변 원 위의 화살표로 알려 준다. */
  drawCompass(c, camX, camY) {
    const targets = this.questTargets();
    if (!targets.length) return;
    const COL = { boss: '#e0563c', npc: '#7fe0a0', tablet: '#c8a86a', death: '#9fa8c0', ruin: '#c8a04a' };
    const p = this.player;
    const ox = p.cx - camX, oy = p.cy - camY;      // 플레이어의 화면 좌표
    const R = 132;
    c.save();
    c.font = '11px ' + FONT_UI; c.textAlign = 'left'; c.textBaseline = 'middle';
    // 같은 방향에 여럿이 겹치지 않도록 살짝 밀어 놓는다
    const used = [];
    for (const g of targets) {
      const sx = g.x - camX, sy = g.y - camY;
      if (sx > -30 && sx < this.W + 30 && sy > -30 && sy < this.H + 30) continue;   // 이미 보인다
      let a = Math.atan2(sy - oy, sx - ox);
      for (let k = 0; k < 8; k++) {
        if (!used.some(u => Math.abs(((a - u + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.22)) break;
        a += 0.24;
      }
      used.push(a);
      // 카메라가 세계 경계에서 멈추면 플레이어가 화면 구석에 서게 된다.
      const px = clamp(ox + Math.cos(a) * R, 46, this.W - 46);
      const py = clamp(oy + Math.sin(a) * R, 46, this.H - 56);
      const col = COL[g.k] || '#e0c86a';
      /* ★ 화살표는 save/restore 로 감싼다. */
      c.save();
      c.globalAlpha = .82;
      c.translate(px, py); c.rotate(a);
      c.fillStyle = col;
      c.beginPath(); c.moveTo(13, 0); c.lineTo(-7, -7); c.lineTo(-3, 0); c.lineTo(-7, 7); c.closePath(); c.fill();
      c.restore();
      // 거리 — 화살표 안쪽(플레이어 쪽)에 적어야 화면 밖으로 안 밀린다 — 사연: docs/code-history.md#h57
      const distTxt = Math.round(Math.hypot(g.x - p.cx, g.y - p.cy) / TS) + 'm';
      const tw = c.measureText(distTxt).width;
      const boxW = 15 + tw + 10;
      const gap = 7 + boxW / 2 + 4;
      const lx = clamp(px - Math.cos(a) * gap, boxW / 2 + 2, this.W - boxW / 2 - 2);
      const ly = clamp(py - Math.sin(a) * gap, 12, this.H - 12);
      c.fillStyle = '#000b'; c.fillRect(lx - boxW / 2, ly - 7, boxW, 14);
      this.drawCompassGlyph(c, g.k, lx - boxW / 2 + 8, ly, col);
      c.fillStyle = col;
      c.fillText(distTxt, lx - boxW / 2 + 16, ly + 1);
    }
    c.restore();
  },
  /** 나침반 라벨 앞에 붙는 작은 아이콘 — 이모지 대신 캔버스로 직접 그린다(플랫폼마다 이모지 폰트가 달라 삐뚤빼뚤 보이는 문제, 픽셀아트 톤과도 안 맞는 문제를 함께 없앤다). */
  drawCompassGlyph(c, kind, cx, cy, col) {
    c.save();
    c.translate(cx, cy);
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.2;
    if (kind === 'npc') {
      // 말풍선 — 몸통 + 꼬리
      c.beginPath(); c.roundRect ? c.roundRect(-4.5, -3.5, 9, 6, 1.5) : c.rect(-4.5, -3.5, 9, 6);
      c.fill();
      c.beginPath(); c.moveTo(-1.5, 2.3); c.lineTo(-3, 4.5); c.lineTo(0.5, 2.3); c.closePath(); c.fill();
    } else if (kind === 'boss') {
      // 위협 표시 — 마름모 + 느낌표
      c.beginPath(); c.moveTo(0, -5); c.lineTo(5, 0); c.lineTo(0, 5); c.lineTo(-5, 0); c.closePath(); c.fill();
      c.fillStyle = '#1a1108';
      c.fillRect(-0.7, -2.6, 1.4, 3); c.fillRect(-0.7, 1.2, 1.4, 1.4);
    } else if (kind === 'tablet') {
      // 비문 — 세로 판 + 가로줄 둘
      c.beginPath(); c.roundRect ? c.roundRect(-3.5, -5, 7, 10, 1) : c.rect(-3.5, -5, 7, 10);
      c.fill();
      c.strokeStyle = '#1a1108'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-2, -1.5); c.lineTo(2, -1.5); c.moveTo(-2, 1.5); c.lineTo(2, 1.5); c.stroke();
    } else if (kind === 'death') {
      // 쓰러진 자리 — 십자
      c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -5); c.lineTo(0, 3.5); c.moveTo(-3, -1.5); c.lineTo(3, -1.5); c.stroke();
    }
    c.restore();
  },
  respawn() {
    const p = this.player, w = this.world;
    // 여명 마을이 드러난 뒤(세션 2)부터는 거기서 부활한다 — 그 전까지는 베이스캠프가 유일한 정착지라 거기서 부활하는 게 맞지만
    const d = w.dawnCity;
    // 광장 정중앙(cx)은 분수대 자리다(restoreDawnCity의 fountain: (cx-2)~(cx+2)) — 그 위에 그대로 부활하면 캐릭터가 분수 위에 겹쳐 보인다.
    if (this.villageUnlocked && d) { p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; }
    else { p.x = w.spawnX * TS; p.y = (w.spawnY - 3) * TS; }
    p.vx = p.vy = 0;
    p.hp = p.d.maxHp; p.mp = p.d.maxMp; p.iframe = 2; p.buffs = [];
    this.ents = []; this.corpses = []; this.boss = null; this.projs = [];
    /* ★ 깨워 둔 둥지·메아리 표시도 같이 지운다. */
    this.pendingLair = null; this.pendingEcho = null;
    if (this.pulseEvent) this.endPulseEvent(false);   // 쓰러지면 사건도 놓친 것이다
    this.rocks = [];
    $('#death-screen').classList.remove('open');
    this.scenes.close('pause');
  },
  setPause(on) {
    this.scenes.set('pause', on);
    $('#pause-screen').classList.toggle('open', on);
    if (on) UI.syncSettings();      // 열 때마다 현재 값으로 맞춘다
  },
  /* 설정에서 끈 갈래는 띄우지 않는다. */
  toast(m, k) {
    if (k && k !== 'bad') {
      const n = this.settings && this.settings.notice;
      if (n && n[k] === 0) return;
    }
    UI.toast(m, k);
  },
};
mixin(G, ProgressPart);
