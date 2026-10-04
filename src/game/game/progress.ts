/* ===== game/progress.js — 장 진행 · 업적 · 길잡이 표지 ===== */
import { checkUnlocks } from '../../engine/core/achieve.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT_UI, fmt, tr } from '../lang.js';
import { altOf, dimsOf } from '../size.js';
import { ITEMS } from '../data/items.js';
import { PULSE, RUIN_SPEC } from '../data/ruins.js';
import { CHAPTERS } from '../data/story.js';
import { idef } from '../data/values.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { TS } from '../world.js';
import { itemName, makeItem, rollGear } from '../items.js';
import { Drop, Part } from '../entity.js';
import { Factory } from '../factory.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const ProgressPart: Bag = {

  /* ================= 진행 ================= */
  /* 정작 하고 싶은 것(내려가 보기, 유적 들어가 보기)은 목록에 없거나 있어도 순서가 강제됐다 — 사연: docs/code-history.md#h54 */
  /** 목표 글 — 깊이 목표('지하 ○○m')는 그 세계의 고도로 고쳐 쓴다(표는 소형 기준 줄 o.y · 고도 0m 은 가장 깊은 지형). */
  objTask(o: Bag) {
    const t = (o && o.task) || '';
    if (!o || o.type !== 'depth' || o.up || !/[0-9]+ ?m/.test(t)) return t;
    const d = dimsOf(this.world);
    return tr('고도 {alt}m 아래', { alt: fmt(altOf(d, d.SY(o.y))) });
  },
  objProgress(o: Bag) { const { SURF_BASE, SY } = dimsOf(this.world);
    const p = this.player;
    /* 멀티플레이면 방 모두의 값 중 큰 것과 견준다(netprog.ts — 혼자면 제 값 그대로) */
    const sh = (key: string, v: number) => { const s = this.progShared(key); return s === null ? v : Math.max(v, s); };
    let cur = 0, max = 1, label = null;
    switch (o.type) {
      case 'kill': cur = sh('k:' + o.target, p.kills[o.target] || 0); max = o.n; break;
      case 'mine': cur = sh('m:' + o.tile, p.mined[o.tile] || 0); max = o.n; break;
      case 'collect': cur = sh('c:' + o.item, Math.max(p.countItem(o.item), p.gathered[o.item] || 0)); max = o.n; break;
      case 'craft': cur = sh('cr:' + o.item, (this.crafted && this.crafted[o.item]) ? 1 : 0); max = 1; break;
      case 'talk': cur = sh('t:' + o.npc, (this.talked && this.talked[o.npc]) ? 1 : 0); max = 1; break;
      case 'depth':
        if (o.up) {   // 위로 올라가는 목표: 낮은 y일수록 진행
          const top = -sh('h', -(p.highest === undefined ? SURF_BASE : p.highest));
          const gained = clamp(SURF_BASE - top, 0, SURF_BASE - SY(o.y));
          cur = gained; max = SURF_BASE - SY(o.y);
        } else { cur = Math.min(sh('d', p.deepest), SY(o.y)); max = SY(o.y); }   // 표의 깊이는 소형 기준
        break;
      case 'boss': cur = sh('b:' + o.target, p.bossKilled[o.target] ? 1 : 0); max = 1; break;
      /* 가 본 곳 — 바이옴 이름표(seenBiomes)와 유적 첫 입장(seenRuins)을 그대로 쓴다. */
      case 'explore':
        cur = o.zone ? sh('z:' + o.zone, this.seenBiomes && this.seenBiomes[o.zone] ? 1 : 0)
                     : sh('r:' + o.ruin, this.seenRuins && this.seenRuins[o.ruin] ? 1 : 0);
        break;
      /* 세우고 · 물리고 · 끊기. */
      case 'place': cur = this.placeProgress(o); max = o.stop ? 3 : 1; break;
      /* 이어서 하는 일(모으고 → 만들기) — 칸마다 단위가 달라 숫자를 더하지 않고 끝낸 칸을 센다. 앞 칸이 덜 됐으면 뒤 칸이 됐어도 못 넘긴다. */
      case 'and': {
        const ps = o.parts.map((q: any) => this.objProgress(q));
        max = ps.length;
        cur = ps.findIndex((q: any) => !q.done);
        if (cur < 0) cur = max;
        // 지금 칸의 진행을 함께 보인다 — '1/2' 만으로는 나무를 몇 개 더 모아야 하는지 모른다
        else label = tr('{n}/{max}단계', { n: cur + 1, max }) + (ps[cur].max > 1 ? ` · ${ps[cur].cur}/${ps[cur].max}` : '');
        break;
      }
    }
    return { cur: Math.min(cur, max), max, done: cur >= max, label };
  },

  /** 조립기: 놓았나(1) · 동력이 돈 적 있나(2) · 지금 멈춰 있나(3) */
  placeProgress(o: Bag) {
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
  chapterState(ch: any) {
    const basics = (ch.basics || []).map((o: Bag) => ({ o, p: this.objProgress(o) }));
    const doneList = basics.filter((b: any) => b.p.done);
    const need = ch.needBasics === undefined ? basics.length : ch.needBasics;
    const req = ch.require || [];
    const missing = req.filter((v: number) => !doneList.some((b: any) => b.o.verb === v));
    const ready = doneList.length >= need && !missing.length;
    const goal = ch.goal ? { o: ch.goal, p: this.objProgress(ch.goal) } : null;
    return {
      basics, done: doneList.length, need, ready, missing, goal,
      complete: ready && (!goal || goal.p.done)
    };
  },

  /** 아직 자격이 없는데 결전에 손대려 할 때 한 줄로 알려 준다 */
  goalLocked(ch: any, st: Bag) {
    if (!ch || st.ready) return '';
    if (st.missing.length) {
      const b = (ch.basics || []).find((o: Bag) => o.verb === st.missing[0]);
      return `${tr('아직 자격이 없다 —')} ` + (b ? b.t : tr('이 장의 일이 남았다'));
    }
    return tr('아직 자격이 없다 — 준비 {done}/{need}', { done: st.done, need: st.need });
  },

  checkChapter() {
    const ch = CHAPTERS[this.chapter];
    if (!ch) return;
    if (!this.chapterState(ch).complete) { UI.refreshTracker(); return; }
    /* 멀티플레이 — 장 완료는 호스트만 판정하고 알린다(참가자는 netChapterIn 에서 같은 보상·연출) */
    if (this.net && this.net.role === 'guest') { UI.refreshTracker(); return; }
    if (this.net) { const msg = { k: 'chap', i: this.chapter }; for (const q of this.net.peers.values()) if (q.rp) this.netSend(q.t, 'rel', msg); }
    this.completeChapter(ch);
  },
  /** 장을 끝낸다 — 보상 · 별 · (8장이면) 여명 마을 · 뒷이야기 → 다음 장. */
  completeChapter(ch: any) {
    const p = this.player;
    p.addXp(ch.rw.xp); p.gold += ch.rw.gold;
    for (const [id, n] of (ch.rw.items || [])) {
      const it = ITEMS[id].stack! > 1 ? makeItem(id, n) : rollGear(id, this.rng, 2);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
    }
    this.toast(tr('『{title}』 완료 — 경험치 {xp} · 금화 {gold}', { title: ch.title, xp: fmt(ch.rw.xp), gold: fmt(ch.rw.gold) }), 'good');
    /* 별 연출이 얼마나 걸리는지 되받는다. */
    const starShow = this.gainStarOrbit(ch.id) || 0;
    this.chapter++;
    this.ashHold = this.time + starShow / 1000 + (ch.id === 8 ? 0.6 : 0);   // 잿빛은 별이 다 오른 뒤에 걷힌다
    this.checkAch();
    UI.refreshBag();

    /* ★ 여명 마을 해금은 "다음 챕터가 없을 때"가 아니라 **8장(세션 1 종장)을 끝냈을 때**다. */
    /* 순서는 하나뿐이다 — 별 → 마을 → 뒷이야기 → 다음 장. */
    let delay = Math.max(1400, starShow);
    if (ch.id === 8 && !this.villageUnlocked) {
      this.villageUnlocked = true;
      /* 참가자도 같은 도시를 세운다(난수 없음) — 칸은 호스트가 보내니 되보내지 않는다 */
      const guest = this.net && this.net.role === 'guest';
      if (guest) this.world.netMute = true;
      this.world.restoreDawnCity();
      if (guest) this.world.netMute = false;
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
    if (ch.rw.gold) this.after(0.45, () => this.sfx('manycoins'));
  },
  onKill() {
    // 유적 안에서 피를 보면 맥박이 가라앉는다 — 싸우는 사람은 격노를 붙들어 둘 수 있다
    if (this.pulseHere) this.addPulse(this.pulseHere, -PULSE.kill * (this.hasSeal('spore') ? 2 : 1));
    this.checkAch();
  },
  /* 업적 판정. */
  checkAch() {
    if (!this.player || !this.achievements) return;
    checkUnlocks(ACHIEVEMENTS as any[], this.achievements, this, (a: any) => this.onAchieved(a));   // 아직 없는 값을 읽어도 죽지 않게(engine core/achieve)
  },
  onAchieved(a: any) {
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
  onPickup(it: Bag) {
    if (it && idef(it).type !== 'block' && idef(it).type !== 'mat') this.toast(tr('{itemName} 획득', { itemName: itemName(it) }), 'good');
    UI.refreshBag();
  },

  /* ---- 길잡이 ---- */
  questTargets() {
    const w = this.world, ch = CHAPTERS[this.chapter];
    const out = [];
    if (this.deathMark) out.push({ x: this.deathMark.x, y: this.deathMark.y, k: 'death', t: tr('쓰러진 자리') });
    /* 지도를 편 유적 — 입구가 없어 지도 없이는 못 찾는 곳이라, 표시가 곧 길이다. */
    for (const id in (this.ruinMarks || {})) {
      if (this.seenRuins && this.seenRuins[id]) continue;
      const r = w && w.ruins && w.ruins.find((q: any) => q.id === id);
      if (!r) continue;
      const sp = RUIN_SPEC.find(q => q.id === id);
      out.push({ x: (r.x + 0.5) * TS, y: r.y * TS, k: 'ruin', t: (sp ? sp.n : tr('유적')) + ` ${tr('— 지도의 자리')}` });
    }
    if (!ch || !w) return out;
    /* 나침반 — 준비 중에는 basics 를, 자격을 갖춘 뒤에는 결전만 가리킨다 — 사연: docs/code-history.md#h56 */
    const stt = this.chapterState(ch);
    const aim = (stt.ready ? (stt.goal ? [stt.goal.o] : []) : stt.basics.filter((b: any) => !b.p.done).map((b: any) => b.o))
      .flatMap((o: Bag) => o.type === 'and' ? o.parts : [o]);
    aim.forEach((o: Bag) => {
      if (this.objProgress(o).done) return;
      if (o.type === 'boss') {
        const ob = w.objects.find((q: any) => (q.type === 'altar' || q.type === 'lair') && q.boss === o.target);
        if (ob) out.push({ x: ob.x + ob.w / 2, y: ob.y, k: 'boss', t: o.t });
      } else if (o.type === 'talk') {
        const ob = w.objects.find((q: any) => q.type === 'npc' && q.npc === o.npc);
        if (ob) out.push({ x: ob.x + ob.w / 2, y: ob.y, k: 'npc', t: o.t });
      } else if (o.type === 'collect' && o.item === 'rune_frag') {
        for (const q of w.objects) if (q.type === 'tablet') out.push({ x: q.x, y: q.y, k: 'tablet', t: o.t });
      }
    });
    return out;
  },
  /** 화면 밖 목표를 플레이어 주변 원 위의 화살표로 알려 준다. */
  drawCompass(c: any, camX: number, camY: number) {
    const targets = this.questTargets();
    if (!targets.length) return;
    const COL: Record<string, string> = { boss: '#e0563c', npc: '#7fe0a0', tablet: '#c8a86a', death: '#9fa8c0', ruin: '#c8a04a' };
    const p = this.player;
    const ox = p.cx - camX, oy = p.cy - camY;      // 플레이어의 화면 좌표
    const R = 132;
    c.save();
    c.font = '11px ' + FONT_UI; c.textAlign = 'left'; c.textBaseline = 'middle';
    // 같은 방향에 여럿이 겹치지 않도록 살짝 밀어 놓는다
    const used: number[] = [];
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
  drawCompassGlyph(c: any, kind: string, cx: number, cy: number, col: string) {
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
};

mixin(Game.prototype, ProgressPart, true);
