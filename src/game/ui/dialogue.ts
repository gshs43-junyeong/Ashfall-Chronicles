// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== ui/dialogue.js — 대화 · 흘러나오는 대사 · 연출 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { BOSS_TIER } from '../data/skills.js';
import { NPCS } from '../data/npcs.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { $, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const DialogueUIPart = {

  /* ---------------- 대화 ---------------- */
  /** '다시 듣기'는 이름 옆 작은 단추로 뺀다 (없으면 감춘다) */
  setReplay(c) {
    const b = $('#dlg-replay');
    if (!b) return;
    b.style.display = c ? '' : 'none';
    b.onclick = ev => { ev.stopPropagation(); if (c) c.fn(); };
  },

  openDialogue(npcId, lines, choices) {
    const d = NPCS[npcId];
    /* 다시 듣기는 고르는 말이 아니라 창의 기능이라 선택지 줄에서 빼낸다 — 선택지가 여섯 줄까지 늘어나 정작 할 말이 어느 것인지 안 보였다. */
    const cs = (choices || []).slice();
    const ri = cs.findIndex(c => c.replay);
    this.setReplay(ri >= 0 ? cs.splice(ri, 1)[0] : null);
    this.dlg = { npcId, lines: lines.slice(), i: 0, choices: cs };
    $('#dlg-portrait').textContent = '';
    this.setIcon($('#dlg-portrait'), this.npcPortrait(npcId));
    $('#dlg-name').textContent = `${d.n} · ${d.role}`;
    $('#dialogue').classList.add('open');
    G.uiOpen = true;
    this.nextLine(true);
  },
  /* ---- 한 글자씩 흘러나오는 대사 ---- */
  TYPE_MS: 34, TYPE_MIN: 300, TYPE_MAX: 1100,

  typeLine(text, done) {
    const el = $('#dlg-text');
    this.stopType();
    const n = text.length;
    if (!n || !(G.settings ? G.settings.dlgtype : 1)) { el.textContent = text; done(); return; }
    const dur = Math.max(this.TYPE_MIN, Math.min(this.TYPE_MAX, n * this.TYPE_MS));
    const t0 = performance.now();
    el.textContent = '';
    this.typing = { text, done, el };
    const step = () => {
      if (!this.typing) return;
      const k = Math.min(n, Math.ceil((performance.now() - t0) / dur * n));
      el.textContent = text.slice(0, k);
      if (k >= n) { this.typing = null; done(); return; }
      this._typeRaf = requestAnimationFrame(step);
    };
    this._typeRaf = requestAnimationFrame(step);
  },
  stopType() {
    if (this._typeRaf) { cancelAnimationFrame(this._typeRaf); this._typeRaf = 0; }
    this.typing = null;
  },
  /** 타자가 도는 중이면 끝까지 펼치고 true. */
  finishType() {
    if (!this.typing) return false;
    const t = this.typing;
    this.stopType();
    t.el.textContent = t.text;
    t.done();
    return true;
  },

  nextLine(first) {
    if (!this.dlg) return;
    const prevI = this.dlg.i;
    if (!first) this.dlg.i++;
    if (this.dlg.i >= this.dlg.lines.length) { this.stopType(); this.showChoices(); return; }
    const last = this.dlg.i >= this.dlg.lines.length - 1;
    $('#dlg-choices').innerHTML = '';
    if (this.dlg.i !== prevI || first) G.sfx('talk');
    const at = this.dlg.i;
    this.typeLine(this.dlg.lines[at], () => {
      if (!this.dlg || this.dlg.i !== at) return;      // 그 사이 창이 바뀌었으면 버린다
      if (last) this.showChoices();
      else $('#dlg-choices').innerHTML = `<div class="dlg-next"><span class="dlg-next-ic"></span>${tr('클릭하여 계속')}</div>`;
    });
  },
  /* 한 겹 더 들어가는 선택지(sub)를 받는다. */
  showChoices(list) {
    const box = $('#dlg-choices'); box.innerHTML = '';
    const cs = list || (this.dlg && this.dlg.choices) || [];
    for (const c of cs) {
      const b = document.createElement('button');
      b.className = 'dchoice' + (c.quest ? ' quest' : '') + (c.say ? ' say' : '')
        + (c.back ? ' meta' : '');
      b.textContent = c.t;
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        if (c.back) { this.showChoices(); return; }
        if (c.sub) { this.showChoices(c.sub.concat([{ t: tr('(돌아간다)'), back: 1 }])); return; }
        c.fn();
      });
      box.appendChild(b);
    }
    if (list) return;                       // 마치는 단추는 맨 윗겹에만
    const b = document.createElement('button');
    b.className = 'dchoice meta'; b.textContent = tr('(대화를 마친다)');
    b.addEventListener('click', ev => { ev.stopPropagation(); this.closeDialogue(); });
    box.appendChild(b);
  },
  closeDialogue() { this.stopType(); $('#dialogue').classList.remove('open'); this.dlg = null; G.uiOpen = false; },

  /** 장 도입·마무리 이야기. */
  storyScene(ch, kind, done) {
    const art = $('#cc-art');
    if (G.spritesOn && ch.art) { art.style.backgroundImage = `url(${Sprites.url(`assets/bg/${ch.art}.png`)})`; art.classList.add('show', 'story'); }
    const raw = (kind === 'outro' ? ch.outro : ch.intro) || '';
    const lines = raw.split('\n\n').map(s => s.trim()).filter(Boolean);
    // 장을 끝낼 때는 마지막에 "다음이 궁금해지는 한 줄"을 따로 한 장 더 넘긴다
    if (kind === 'outro' && ch.hook) lines.push('◆  ' + ch.hook);
    if (!lines.length) { if (done) done(); return; }
    const label = kind === 'outro' ? tr('{title} — 그 뒤', { title: ch.title }) : `${ch.sub} · ${ch.title}`;
    this.openLore(label, lines, [{
      t: kind === 'outro' ? tr('(다음 이야기로)') : tr('(계속한다)'), quest: 1,
      fn: () => { this.closeDialogue(); art.classList.remove('show', 'story'); if (done) done(); }
    }]);
    this._storyArt = true;
  },

  /** NPC가 아닌 화자(석판·문 등)의 대사창 */
  openLore(name, lines, choices) {
    this.setReplay(null);
    this.dlg = { npcId: null, lines: lines.slice(), i: 0, choices };
    $('#dlg-portrait').textContent = '';
    this.setIcon($('#dlg-portrait'), Art.itemUrl('rune_frag'));
    $('#dlg-name').textContent = name;
    $('#dialogue').classList.add('open');
    G.uiOpen = true;
    this.nextLine(true);
  },

  /* ---------------- 연출 ---------------- */
  chapterCard(ch) {
    if (!ch) return;                       // 넘어간 장을 뒤늦게 띄우려는 호출은 무시
    $('#cc-sub').textContent = ch.sub;
    $('#cc-title').textContent = ch.title;
    $('#cc-line').textContent = ch.line;
    // 장 도입 일러스트
    const art = $('#cc-art');
    if (G.spritesOn && ch.art) { art.style.backgroundImage = `url(${Sprites.url(`assets/bg/${ch.art}.png`)})`; art.classList.add('show'); }
    else art.classList.remove('show');
    const el = $('#chapter-card');
    el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); art.classList.remove('show'); }, 3800);
  },
  /* 보스 막대. */
  bossBar(e) {
    const el = $('#bossbar');
    if (!e || e.dead) { el.classList.remove('show'); this.bbFor = null; return; }
    el.classList.add('show');
    if (this.bbFor !== e) {
      this.bbFor = e;
      const tier = BOSS_TIER[e.type] || 'normal';
      el.classList.remove('t-mini', 't-normal', 't-grand');
      el.classList.add('t-' + tier);
      $('#bb-name').textContent = e.def.n;
    }
    // 마지막 페이즈면 막대가 보라색으로 넘어간다(색은 CSS 의 .last 가 들고 있다)
    el.classList.toggle('last', e.lastPh());
    const r = Math.max(0, e.hp / e.maxHp);
    $('#bb-fill').style.width = r * 100 + '%';
    /* 잔상은 같은 값을 넣고 **느리게 따라오게만** 한다(CSS: 0.18초 늦게 0.5초에 걸쳐). */
    $('#bb-ghost').style.width = r * 100 + '%';
    $('#bb-hp').textContent = `${fmt(Math.ceil(e.hp))} / ${fmt(e.maxHp)}`;
  },
};
mixin(UI, DialogueUIPart);
