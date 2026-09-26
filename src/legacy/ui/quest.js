/* ===== ui/quest.js — 퀘스트 일지 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { ACHIEVEMENTS, ACH_CAT, ACH_TIER, CHAPTERS, ECHO, ITEMS, NPCS, PULSE, RUIN_SPEC, SESSIONS, SIDE_POOL,
  STORY_RUIN, achHidden, chaptersOf, sessionOf } from '../data.js';
import { Art } from '../itemart.js';
import { $, $$, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const QuestUIPart = {

  /* ---------------- 퀘스트 ---------------- */
  questTab: 'journey',      // 'journey' | 'ach' | 'ruins'
  refreshQuest() {
    const g = G;
    /* 창 하나에 탭 둘. */
    const done = Object.keys(g.achievements || {}).length;
    const topTabs = `<div class="qtabs">` +
      `<button class="qtab${this.questTab === 'journey' ? ' on' : ''}" data-qtab="journey">${tr('여정')}</button>` +
      `<button class="qtab${this.questTab === 'ach' ? ' on' : ''}" data-qtab="ach">${tr('업적 <b>{done}/{achievementsCount}</b>', { done, achievementsCount: ACHIEVEMENTS.length })}</button>` +
      `<button class="qtab${this.questTab === 'ruins' ? ' on' : ''}" data-qtab="ruins">${tr('유적')}</button>` +
      `</div>`;
    if (this.questTab === 'ach') { this.renderAch(topTabs); return; }
    if (this.questTab === 'ruins') { this.renderRuins(topTabs); return; }
    /* 탭은 SESSIONS 표에서 만든다 — 사연: docs/code-history.md#h92 */
    const currentSession = 's' + sessionOf(g.chapter).id;
    const selectedSession = this.questSession || currentSession;
    const sessions = SESSIONS.map(x =>
      ({ key: 's' + x.id, label: x.n, title: x.t, chapters: chaptersOf(x.id) }));
    /* 버튼이 셋 이상이면 창 폭을 넘긴다 — 줄바꿈하면 탭 줄이 두 줄이 되어 아래 내용이 밀리므로, 가로로 스크롤하게 둔다(스크롤바는 CSS에서 얇게 그린다). */
    let h = '<div class="session-tabs">' + sessions.map(s => {
      const isCurrent = s.key === currentSession;
      const isSelected = s.key === selectedSession;
      // 세션 3은 종장이 없다(계속 이어질 이야기) — 다 지나도 '완료'로 닫지 않는다
      const done = s.key !== 's3' && s.chapters.length > 0 && s.chapters.every(ch => g.chapter > ch.id);
      const state = done ? 'done' : isCurrent ? 'cur' : 'locked';
      const classes = ['session-tab', state];
      if (isSelected) classes.push('is-selected');
      return `<button type="button" class="${classes.join(' ')}" data-session="${s.key}"><strong>${s.label}</strong><span>${s.title}</span></button>`;
    }).join('') + '</div>';

    const chapterBlock = sessions.find(s => s.key === selectedSession);
    if (chapterBlock) {
      h += `<div class="session-panel">`;
      {
        const clearedN = chapterBlock.chapters.filter(ch => ch.id < g.chapter).length;
        const totalN = chapterBlock.chapters.length;
        h += `<div class="session-note">${tr('전 <b>{totalN}개 장</b>', { totalN })}` +
          (clearedN >= totalN ? ` ${tr('— 전부 지났다.')}` : ` ${tr('· <b>{clearedN}개</b> 완료', { clearedN })}`) +
          `</div>`;
      }
      for (const ch of chapterBlock.chapters) {
        const state = ch.id < g.chapter ? 'done' : ch.id === g.chapter ? 'cur' : 'locked';
        // 세션 2의 sub는 "세션 2 · 제 1 장" 꼴이라, 세션 2 탭 안에서는 앞의 "세션 2 · "가 줄마다 반복돼 군더더기다 — 사연: docs/code-history.md#h93
        const sub = ch.sub.replace(/^세션\s*\d+\s*·\s*/, '');
        /* 아직 안 열린 장은 **제목도 가린다.** — 사연: docs/code-history.md#h94 */
        const titleText = state === 'locked' ? `${sub} · ???` : `${sub} · ${ch.title}`;
        h += `<div class="chap ${state}"><div class="chap-badge ${state}">${state === 'done' ? tr('완료') : state === 'cur' ? tr('진행 중') : tr('대기')}</div><h3>${titleText}</h3>`;
        if (state !== 'locked') {
          /* 끝낸 장은 도입부와 뒷이야기를 **둘 다** 남긴다 — 사연: docs/code-history.md#h95 */
          const para = t => (t || '').split('\n\n').map(s =>
            `<p>${s.trim().replace(/\n/g, '<br>')}</p>`).join('');
          h += `<div class="cdesc">${para(ch.intro)}`;
          if (state === 'done') {
            h += `<div class="cdesc-sep">${tr('그 뒤')}</div>${para(ch.outro)}`;
            if (ch.hook) h += `<p class="cdesc-hook">◆ ${ch.hook}</p>`;
          }
          h += '</div>';
          /* 목록은 여기(일지)에만 편다. */
          if (state === 'cur') {
            const st = g.chapterState(ch);
            h += `<div class="obj-head">${tr('준비 <b>{done}/{need}</b>', { done: st.done, need: st.need })}` +
              (st.missing.length ? ` ${tr('· <em>이 장의 일이 남았다</em>')}` : '') + '</div>';
            /* ★ 제목은 이야기, 부제는 과제. */
            for (const b of st.basics) {
              const must = (ch.require || []).includes(b.o.verb);
              h += `<div class="obj ${b.p.done ? 'ok' : ''}${must ? ' must' : ''}">` +
                `${b.p.done ? '✔' : '◆'} ${must ? `<span class="objreq">${tr('필수')}</span> ` : ''}${b.o.t}` +
                `<span class="obj-task">${b.o.task || ''} <b>${b.p.label || b.p.cur + '/' + b.p.max}</b></span></div>`;
            }
            if (st.goal) {
              const gp = st.goal.p, go = st.goal.o;
              h += `<div class="obj-head">${tr('목표')}</div>`;
              h += `<div class="obj goal ${gp.done ? 'ok' : ''}${st.ready ? '' : ' locked'}">` +
                `${gp.done ? '✔' : (st.ready ? '◆' : '🔒')} ${go.t}` +
                `<span class="obj-task">${go.task || ''} <b>${gp.cur}/${gp.max}</b></span></div>`;
            }
          }
        } else h += `<div class="cdesc">???</div>`;
        h += '</div>';
      }
      h += '</div>';
    }

    // 부탁(사이드 퀘스트)
    let sh = `<div class="side-head">${tr('사람들의 부탁')}</div>`;
    const sideNpcIds = Object.keys(NPCS).filter(k => SIDE_POOL[k]);
    let hasActive = false;
    for (const id of sideNpcIds) {
      const active = G.sideActive[id];
      if (!active) continue;
      hasActive = true;
      const done = G.sideDone[id] || 0;
      const p = G.sideProgress(active);
      sh += `<div class="side-npc"><b>${NPCS[id].n}</b><span class="side-done">${tr('완료 {done}건', { done })}</span>`;
      const sp = G.sidePay(active);
      sh += `<div class="side-q ${p.done ? 'ok' : ''}">${active.title} — ${active.desc} <b>${p.cur}/${p.max}</b>` +
        `<span class="side-rw">${tr('🪙 {gold} · 경험치 {xp}', { gold: fmt(sp.gold), xp: fmt(sp.xp) })}</span></div>`;
      sh += '</div>';
    }
    if (!hasActive) sh += `<div class="side-q empty">${tr('지금 맡아 둔 부탁이 없다.')}</div>`;
    /* 게시판에 붙은 종이도 일지에서 보인다 — 사연: docs/code-history.md#h96 */
    if ((G.bounties || []).length) {
      sh += `<div class="side-head">${tr('의뢰 게시판')}</div>`;
      for (const q of G.bounties) {
        const p = G.bountyProgress(q);
        sh += `<div class="side-npc"><b>${q.title || ''}</b><span class="side-done">${q.from || ''}</span>`;
        sh += `<div class="side-q ${q.done ? '' : p.done ? 'ok' : ''}">${G.objLabel(q.obj)} ` +
          `${q.done ? tr('<b>떼어 감</b>') : `<b>${p.cur}/${p.max}</b>`}</div></div>`;
      }
    }
    const questBody = $('#quest-body');
    if (questBody) {
      questBody.innerHTML = topTabs + h + sh;
      this.syncSessionBorder(this.questSession || currentSession, null, currentSession);
      questBody.onclick = ev => {
        const tab = ev.target.closest('.qtab');
        if (tab) { this.questTab = tab.dataset.qtab; this.refreshQuest(); return; }
        const btn = ev.target.closest('.session-tab');
        if (!btn) return;
        this.questSession = btn.dataset.session;
        this.refreshQuest();
      };
      questBody.onmouseover = ev => {
        const btn = ev.target.closest('.session-tab');
        if (!btn) return;
        this.syncSessionBorder(this.questSession || currentSession, btn.dataset.session, currentSession);
      };
      questBody.onmouseout = ev => {
        const nextBtn = ev.relatedTarget && ev.relatedTarget.closest ? ev.relatedTarget.closest('.session-tab') : null;
        if (nextBtn) {
          this.syncSessionBorder(this.questSession || currentSession, nextBtn.dataset.session, currentSession);
          return;
        }
        this.syncSessionBorder(this.questSession || currentSession, null, currentSession);
      };
    }
  },
  /** 업적 목록 — 갈래(cat)별로 묶어 보여 준다. */
  /** 유적 탐사 기록 — 여섯 유적의 등급 · 무엇이 남았는가 · 메아리 · 인장. */
  renderRuins(topTabs) {
    const g = G;
    let h = topTabs + `<div class="rv-note">${tr('유적은 들어온 사람을 알아챈다. 머물수록 · 상자를 열수록 <b>맥박</b>이 오르고,\n      쓰러뜨릴수록 가라앉는다. 깨어난 유적은 더 몰려오고 더 준다. 주인을 잡은 둥지는 유적이\n      <b>「{stages}」</b> 이상일 때 <b>메아리</b>를 다시 부른다.\n      맥박이 한 단계 오를 때마다 <b>사건</b>(표식된 것 · 공명석 · 탐욕의 상자 · 포위)이 하나 터진다.\n      등급은 조건을 <b>모두</b> 채워야 오른다 — 아래에 다음 등급까지 남은 것을 적었다.\n      기록이 <b>A</b> 면 금화, <b>S</b> 면 그 유적의 인장.', { stages: PULSE.stages[ECHO.needStage].n })}</div>`;
    // 바이옴 유적 여섯 + 석판 유적 셋(G.ruinSpec 이 STORY_RUIN 에서 만든 것) — 등급(난이도) 순
    const list = RUIN_SPEC.concat(STORY_RUIN.map((_, i) => g.ruinSpec('story' + i)).filter(Boolean))
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    for (const spec of list) {
      const sc = g.surveyScore(spec.id), P = sc.part, sv = sc.sv;
      const cell = (label, q) => !q ? '' :
        `<span class="${q[0] >= q[1] ? 'ok' : ''}">${label} <b>${q[1] === 1 ? (q[0] ? '✔' : '—') : q[0] + '/' + q[1]}</b></span>`;
      const seal = ITEMS['seal_' + spec.id];
      h += `<div class="rv${sc.seen ? '' : ' off'}">` +
        `<div class="rv-rank" style="color:${sc.seen ? sc.col : '#5a5448'}">${sc.seen ? sc.rank : '?'}<small>${sc.seen ? sc.score + '%' : ''}</small></div>` +
        `<div class="rv-body"><h4>${sc.seen ? spec.n : tr('아직 발을 들이지 않은 유적')}</h4>`;
      if (sc.seen) {
        h += `<div class="rv-grid">` + cell(tr('방'), P.rooms) + cell(tr('상자'), P.chests) + cell(tr('비문'), P.lore) +
          cell(sc.story ? tr('석판') : tr('주인'), P.boss) + cell(tr('골방'), P.code) + cell(tr('격노'), P.rage) +
          cell(tr('사건'), P.events) + cell(tr('갈래'), P.kinds) + cell(tr('메아리'), P.echo) + `</div>`;
        if (sc.next) h += `<div class="rv-next">${tr('다음 {next} 까지 — {join}', { next: sc.next, join: sc.missing.join(' · ') })}</div>`;
        if (seal) h += `<div class="rv-seal">${sv.s ? '✔ ' + seal.n + ' — ' + seal.d.replace(/^[^.]*\.\s*/, '') : `${tr('S 등급 보상 ·')} ` + seal.n}</div>`;
      }
      h += '</div></div>';
    }
    const body = $('#quest-body');
    if (!body) return;
    body.innerHTML = h;
    body.onmouseover = null; body.onmouseout = null;
    body.onclick = ev => {
      const tab = ev.target.closest('.qtab');
      if (tab) { this.questTab = tab.dataset.qtab; this.refreshQuest(); }
    };
  },

  renderAch(topTabs) {
    const g = G, got = g.achievements || {};
    // 난이도별 진행도를 맨 위에 — 쉬운 것부터 얼마나 남았는지가 한눈에 보인다
    let sum = '<div class="ach-sum">';
    for (const t in ACH_TIER) {
      const list = ACHIEVEMENTS.filter(a => a.t === t);
      const n = list.filter(a => got[a.id]).length;
      sum += `<span style="color:${ACH_TIER[t][1]}">${ACH_TIER[t][0]} <b>${n}/${list.length}</b></span>`;
    }
    sum += '</div>';
    let h = topTabs + sum;
    const fmtDate = t => { const d = new Date(t); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
    for (const cat in ACH_CAT) {
      const list = ACHIEVEMENTS.filter(a => a.cat === cat);
      if (!list.length) continue;
      const n = list.filter(a => got[a.id]).length;
      h += `<div class="ach-head">${ACH_CAT[cat]} <span>${n}/${list.length}</span></div>`;
      /* ★ 여기서 다시 줄 세우지 않는다 — data.js 가 ACHIEVEMENTS 를 품(ACH_LV) 순으로 이미 정렬해 둔다. */
      for (const a of list) {
        const on = !!got[a.id];
        const [tn, tc] = ACH_TIER[a.t] || ACH_TIER.mid;
        // 숨은 업적은 달성 전까지 이름도 조건도 안 보인다.
        const hide = achHidden(a) && !on;
        const nm = hide ? '???' : a.n;
        const ds = hide ? tr('숨겨진 업적 — 해내면 그때 드러난다.') : a.d;
        h += `<div class="ach ${on ? 'on' : 'off'}${hide ? ' hid' : ''} t-${a.t}">` +
          `<span class="ach-ic" style="background-image:url(${hide ? Art.achHiddenUrl() : Art.achUrl(a.id)})"></span>` +
          `<span class="ach-txt"><b>${nm}</b><i>${ds}</i></span>` +
          `<span class="ach-tier" style="color:${tc};border-color:${tc}66">${tn}</span>` +
          `<span class="ach-when">${on ? fmtDate(got[a.id]) : ''}</span></div>`;
      }
    }
    const body = $('#quest-body');
    if (!body) return;
    body.innerHTML = h;
    body.onmouseover = null; body.onmouseout = null;
    body.onclick = ev => {
      const tab = ev.target.closest('.qtab');
      if (tab) { this.questTab = tab.dataset.qtab; this.refreshQuest(); }
    };
  },
  syncSessionBorder(activeKey, hoverKey, currentSession) {
    $$('#quest-body .session-tab').forEach(b => {
      const key = b.dataset.session;
      const isActive = key === activeKey;
      const isHovered = !!(hoverKey && hoverKey !== activeKey && key === hoverKey);
      const isCurrent = key === currentSession;
      b.classList.toggle('is-active', isActive);
      b.classList.toggle('is-hovered', isHovered);
      b.classList.toggle('is-current', isCurrent);
    });
  },
  refreshTracker() {
    const ch = CHAPTERS[G.chapter];
    let h = '';
    if (ch) {
      /* ★ HUD 는 한 줄이다. */
      const st = G.chapterState(ch);
      h += `<div style="color:#c9b07a;margin-bottom:4px">${ch.title}</div>`;
      if (st.ready) {
        h += `<div class="qt-obj">${st.goal ? st.goal.o.t : tr('목표')}` +
          (st.goal && st.goal.o.task ? `<span class="qt-task">${st.goal.o.task}</span>` : '') + '</div>';
      } else {
        /* ★ 갈림길은 **고를 수 있다는 것을 보여 주는 것**이다. */
        h += `<div class="qt-obj">${tr('준비 <b>{done}/{need}</b>', { done: st.done, need: st.need })}</div>`;
        h += '<div class="qt-list">';
        for (const b of st.basics) {
          const must = (ch.require || []).includes(b.o.verb);
          // HUD 는 좁으므로 이야기 한 줄만 두고, 과제와 숫자는 작게 뒤에 붙인다
          /* '필수' 는 제목과 같은 줄에 붙인다 — 제목·필수·과제 셋이 각자 줄을 차지하면 한 항목이 세 줄이 되어 목록이 다시 길어진다. */
          h += `<div class="qt-pick${b.p.done ? ' done' : ''}${must ? ' must' : ''}">` +
            `<span class="qt-line">${b.p.done ? '✔' : '·'} ` +
            (must ? `<span class="qt-must">${tr('필수')}</span> ` : '') + `${b.o.t}</span>` +
            `<span class="qt-task">${b.o.task || ''} <b>${b.p.label || b.p.cur + '/' + b.p.max}</b></span></div>`;
        }
        h += '</div>';
      }
    }
    const activeSide = Object.values(G.sideActive).filter(Boolean);
    if (activeSide.length) h += `<div class="qt-side">${tr('부탁 {activeSideCount}건 진행 중 (J로 확인)', { activeSideCount: activeSide.length })}</div>`;
    if (!ch && !activeSide.length) { $('#quest-tracker').style.display = 'none'; return; }
    $('#quest-tracker').style.display = '';
    $('#qt-body').innerHTML = h;
  },
};
mixin(UI, QuestUIPart);
