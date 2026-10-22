/* ===== ui/dialogue.js — 대화 · 흘러나오는 대사 · 연출 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { typewrite } from '../../engine/ui/typewriter.js';
import { fmt, tr } from '../lang.js';
import { BOSS_TIER } from '../data/skills.js';
import { NPCS } from '../data/npcs.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { $, UI } from '../ui.js';
import { Face, moodOf } from './portrait.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const DialogueUIPart: Bag = {

  /* ---------------- 대화 ---------------- */
  /** '다시 듣기'는 이름 옆 작은 단추로 뺀다 (없으면 감춘다) */
  setReplay(c: any) {
    const b = $('#dlg-replay');
    if (!b) return;
    b.style.display = c ? '' : 'none';
    b.onclick = (ev: MouseEvent) => { ev.stopPropagation(); if (c) c.fn(); };
  },

  openDialogue(npcId: string, lines: any, choices: any) {
    const d = NPCS[npcId];
    /* 다시 듣기는 고르는 말이 아니라 창의 기능이라 선택지 줄에서 빼낸다 — 선택지가 여섯 줄까지 늘어나 정작 할 말이 어느 것인지 안 보였다. */
    const cs = (choices || []).slice();
    const ri = cs.findIndex((c: any) => c.replay);
    this.setReplay(ri >= 0 ? cs.splice(ri, 1)[0] : null);
    this.dlg = { npcId, lines: lines.slice(), i: 0, choices: cs, voice: 'talk_npc' };
    $('#dlg-portrait').textContent = '';
    this.setIcon($('#dlg-portrait'), this.npcPortrait(npcId));
    this.faces();
    this.faceN.set(this.faceUrl(this.npcArt && this.npcArt[npcId]));
    const me = G.spritesOn && G.player ? this.faceUrl('pc_' + (G.player.charId || 'wanderer')) : null;
    $('#dlg-mewrap').classList.toggle('on', !!me);
    this.faceM.set(me);
    this.speaker(false);
    $('#dlg-name').textContent = `${d.n} · ${d.role}`;
    this.popBubble(false);
    G.uiOpen = true;
    this.nextLine(true);
  },
  /** 말풍선을 연다 — 돌 판(lore)이면 꼬리 없는 석판. 이미 열려 있어도 처음부터 튀어나오게 애니메이션을 다시 건다 */
  popBubble(lore: boolean) {
    const el = $('#dialogue'), m = $('.dlg-main');
    el.classList.toggle('lore', lore);
    el.classList.add('open');
    m.classList.remove('bump'); m.style.animation = 'none'; void m.offsetWidth; m.style.animation = '';
  },
  /** 대사가 흐르는 동안 초상이 들썩인다(말하는 중) — 돌 판은 말하지 않는다 */
  setTalk(on: boolean) {
    const p = $('#dlg-portrait');
    const npc = on && !!this.dlg && !!this.dlg.npcId;
    if (p) p.classList.toggle('talk', npc);
    if (this.faceN) this.faceN.setTalk(npc);
  },
  /* ---- 움직이는 초상(ui/portrait.ts) — 표정 띠는 매니페스트 npc.anim 에 있는 것만 ---- */
  faceN: null, faceM: null, saying: null,
  faces() {
    if (!this.faceN) { this.faceN = new Face($('#dlg-portrait')); this.faceM = new Face($('#dlg-me')); }
  },
  faceUrl(key: string | null) {
    const a = key && Sprites.meta && Sprites.meta.npc && Sprites.meta.npc.anim;
    return a && a[key!] ? Sprites.url('assets/' + a[key!]) : null;
  },
  /** 말하는 쪽만 밝게 — 듣는 쪽 초상은 흐려지고 조금 물러난다 */
  speaker(me: boolean) { $('#dialogue').classList.toggle('who-me', me); },
  /** 대사 한 줄의 몸짓 — 물음은 고개를 갸웃, 외침은 한 번 튀어 오른다. 쉬는 표정은 줄이 다 흐른 뒤에 */
  gesture(text: string) {
    const p = $('#dlg-portrait'), t = (text || '').trim();
    p.classList.toggle('ask', /[?？]\s*$/.test(t));
    p.classList.remove('hop');
    if (/[!！]/.test(t)) { void p.offsetWidth; p.classList.add('hop'); }
    if (this.faceN) this.faceN.setMood(null);
  },
  restMood(text: string) {
    if (!this.faceN) return;
    const m = moodOf(text);
    this.faceN.setMood(m, m === 'wow' ? 900 : 0);
  },
  /** 내가 하는 말 — 내 초상이 말하고, 말풍선 꼬리가 내 쪽으로 돈다. 짧게 보인 뒤 원래 할 일(fn)을 한다 */
  sayLine(c: any) {
    if (!this.faceM || !this.faceM.on || !$('#dlg-mewrap').classList.contains('on')) return false;
    this.endSay(false);
    this.speaker(true);
    $('#dlg-choices').innerHTML = '';
    this.stopType();
    $('#dlg-text').textContent = `“${c.t}”`;
    this.faceM.setTalk(true);
    if (this.faceN) this.faceN.setMood(null);
    const t = setTimeout(() => this.endSay(true), Math.min(1300, 420 + c.t.length * 28));
    const nm = $('#dlg-name'), was = nm.textContent;
    if (G.player && G.player.name) nm.textContent = G.player.name;
    this.saying = { t, fn: c.fn, was };
    return true;
  },
  /** run 이면 미뤄 둔 일을 한다 — 대사창을 누르면 기다리지 않고 바로 */
  endSay(run: boolean) {
    const s = this.saying;
    if (!s) return;
    clearTimeout(s.t); this.saying = null;
    if (this.faceM) this.faceM.setTalk(false);
    this.speaker(false);
    $('#dlg-name').textContent = s.was;
    if (run) s.fn();
  },
  /* ---- 한 글자씩 흘러나오는 대사 ---- */
  TYPE_MS: 34, TYPE_MIN: 300, TYPE_MAX: 1100,

  /* 쉼표·마침표 뒤에서 잠깐 숨을 쉬고(engine ui/typewriter), 끄는 설정이면 한 번에 */
  typeLine(text: string, done: Function) {
    const el = $('#dlg-text');
    this.stopType();
    if (!text.length || !(G.settings ? G.settings.dlgtype : 1)) { el.textContent = text; done(); return; }
    this.setTalk(true);
    this.typing = typewrite(el, text, { msPer: this.TYPE_MS, min: this.TYPE_MIN, max: this.TYPE_MAX, done: () => { this.typing = null; this.setTalk(false); done(); } });
  },
  stopType() {
    if (this.typing) this.typing.stop();
    this.typing = null;
    this.setTalk(false);
  },
  /** 타자가 도는 중이면 끝까지 펼치고 true. */
  finishType() {
    if (!this.typing) return false;
    return this.typing.finish();
  },

  nextLine(first: boolean) {
    if (this.saying) { this.endSay(true); return; }
    if (!this.dlg) return;
    const prevI = this.dlg.i;
    if (!first) this.dlg.i++;
    if (this.dlg.i >= this.dlg.lines.length) { this.stopType(); this.showChoices(); return; }
    const last = this.dlg.i >= this.dlg.lines.length - 1;
    $('#dlg-choices').innerHTML = '';
    if (this.dlg.i !== prevI || first) G.sfx(this.dlg.voice || 'talk_npc');   // 말하는 쪽마다 다른 소리 — NPC · 이야기 · 비문
    if (!first) { const m = $('.dlg-main'); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump'); }
    const at = this.dlg.i;
    this.speaker(false);
    if (this.dlg.npcId) this.gesture(this.dlg.lines[at]);
    this.typeLine(this.dlg.lines[at], () => {
      if (!this.dlg || this.dlg.i !== at) return;      // 그 사이 창이 바뀌었으면 버린다
      if (this.dlg.npcId) this.restMood(this.dlg.lines[at]);
      if (last) this.showChoices();
      else $('#dlg-choices').innerHTML = `<div class="dlg-next"><span class="dlg-next-ic"></span>${tr('클릭하여 계속')}</div>`;
    });
  },
  /* 한 겹 더 들어가는 선택지(sub)를 받는다. */
  showChoices(list: any) {
    const box = $('#dlg-choices'); box.innerHTML = '';
    const cs = list || (this.dlg && this.dlg.choices) || [];
    for (const c of cs) {
      const b = document.createElement('button');
      b.className = 'dchoice' + (c.quest ? ' quest' : '') + (c.say ? ' say' : '')
        + (c.back ? ' meta' : '');
      b.textContent = c.say ? `“${c.t}”` : c.t;   // 내가 하는 말 — 따옴표로 기능 단추와 가른다
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        if (c.back) { this.showChoices(); return; }
        if (c.sub) { this.showChoices(c.sub.concat([{ t: tr('(돌아간다)'), back: 1 }])); return; }
        if (c.say) { G.sfx('talk_player'); if (this.sayLine(c)) return; }   // 내가 하는 말
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
  closeDialogue() { this.stopType(); $('#dialogue').classList.remove('open'); this.dlg = null; G.uiOpen = false;
    this.endSay(false);
    if (this.faceN) { this.faceN.stop(); this.faceM.stop(); }
    /* ★ 이야기 삽화는 대사창과 함께 걷는다 — 마지막 단추 말고 다른 길로 닫히면 반투명 삽화가 남아 땅속에 그림자처럼 비쳤다 */
    const art = $('#cc-art'); if (art.classList.contains('story')) art.classList.remove('show', 'story');
  },

  /** 장 도입·마무리 이야기. */
  storyScene(ch: any, kind: string, done: Function) {
    const art = $('#cc-art');
    if (G.spritesOn && ch.art) { art.style.backgroundImage = `url(${Sprites.url(`assets/bg/${ch.art}.png`)})`; art.classList.add('show', 'story'); }
    const raw = (kind === 'outro' ? ch.outro : ch.intro) || '';
    const lines = raw.split('\n\n').map((s: any) => s.trim()).filter(Boolean);
    // 장을 끝낼 때는 마지막에 "다음이 궁금해지는 한 줄"을 따로 한 장 더 넘긴다
    if (kind === 'outro' && ch.hook) lines.push('◆  ' + ch.hook);
    if (!lines.length) { if (done) done(); return; }
    const label = kind === 'outro' ? tr('{title} — 그 뒤', { title: ch.title }) : `${ch.sub} · ${ch.title}`;
    this.openLore(label, lines, [{
      t: kind === 'outro' ? tr('(다음 이야기로)') : tr('(계속한다)'), quest: 1,
      fn: () => { this.closeDialogue(); art.classList.remove('show', 'story'); if (done) done(); }
    }], 'talk_story');   // 장 도입 · 마무리 — 이야기 목소리
    this._storyArt = true;
  },

  /** NPC가 아닌 화자(석판·문 등)의 대사창 */
  openLore(name: string, lines: any, choices: any, voice = 'talk_lore') {
    this.setReplay(null);
    this.dlg = { npcId: null, lines: lines.slice(), i: 0, choices, voice };   // 비문 · 석판 · 문(이야기 장면은 talk_story)
    this.endSay(false);
    if (this.faceN) { this.faceN.set(null); this.faceM.set(null); }
    $('#dlg-mewrap').classList.remove('on');
    $('#dlg-portrait').classList.remove('ask', 'hop');
    $('#dlg-portrait').textContent = '';
    this.setIcon($('#dlg-portrait'), Art.itemUrl('rune_frag'));
    $('#dlg-name').textContent = name;
    this.popBubble(true);
    G.uiOpen = true;
    this.nextLine(true);
  },

  /* ---------------- 연출 ---------------- */
  chapterCard(ch: any) {
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
  bossBar(e: Enemy) {
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
    el.classList.toggle('gap', e.gapT > 0);             // 틈 — 막대 테두리가 금빛으로 고동친다(글 알림 대신)
    el.classList.toggle('brace', e.bracing());          // 방어 자세 — 막대가 잿빛으로 식는다
    /* 갈라진 둘은 합쳐 하나의 막대로 · 방어막은 체력 끝에 파랗게 이어 붙인다(entity/boss-forms — 손님은 net 이 준 값) */
    const tw = e.ghost ? null : e.twinLive(), pn = e.ghost ? e.poolNet : null;
    const hp = pn ? pn[0] : Math.max(0, e.hp) + (tw ? Math.max(0, tw.hp) : 0), mx = pn ? pn[1] : (e.poolMax || e.maxHp);
    const sh = (e.shield || 0) + (tw ? tw.shield || 0 : 0), r = Math.max(0, hp / mx);
    $('#bb-fill').style.width = r * 100 + '%';
    /* 잔상은 같은 값을 넣고 **느리게 따라오게만** 한다(CSS: 0.18초 늦게 0.5초에 걸쳐). */
    $('#bb-ghost').style.width = r * 100 + '%';
    const sb = $('#bb-shield'); sb.style.left = r * 100 + '%'; sb.style.width = (sh > 0 ? sh / mx * 100 : 0) + '%';
    const wd = e.ward > 0 ? e : tw && tw.ward > 0 ? tw : null;
    el.classList.toggle('ward', !!wd);
    $('#bb-hp').textContent = `${fmt(Math.ceil(hp))} / ${fmt(mx)}` + (sh > 0 ? ` + ${fmt(Math.ceil(sh))}` : '')
      + (wd ? ' · ' + tr('결계 {n}', { n: wd.ward }) : '');
  },
};
mixin(UI, DialogueUIPart);
