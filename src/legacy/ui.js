/* ===== ui.js — DOM 인터페이스 ===== */
import { app as G, bindUI } from './ctx.js';
import { TAU, clamp } from '../engine/core/math.js';
import { eulreul } from '../engine/i18n/ko.js';
import { createPanels } from '../engine/ui/panels.js';
import { makeSlot, paintSlot, setIcon } from '../engine/ui/slots.js';
import { createTooltip } from '../engine/ui/tooltip.js';
import { fmt, pad2 } from './util.js';
import { tr } from './lang.js';
import { SURF_BASE, WH, WW } from './size.js';
import { ACHIEVEMENTS, ACH_CAT, ACH_TIER, BOSS_TIER, BRANCHES, BUFFS, CHAPTERS, ECHO, FUEL, ITEMS, KEY_ACTIONS,
  MACHINE, MRECIPES, MULTI_FALLOFF, NOTICE_KINDS, NPCS, PETS, PET_LV_MAX, PROFS, PROF_MAX, PULSE, RARITY,
  RARITY_MULT, RECIPES, RUIN_SPEC, SESSIONS, SET_DEFAULT, SIDE_POOL, SKILLS, STATION_DESC, STATION_NAME, STATION_UP,
  STORY_RUIN, TIER_REQ, VILLAGE, achHidden, chaptersOf, idef, petAtkMul, petLvMul, petXpNext, profNeed, sessionOf } from './data.js';
import { TS } from './world.js';
import { Art } from './itemart.js';
import { Sprites } from './sprites.js';
import { HOTBAR, MAX_BAG_SIZE, enhMul, equipReqLv, isGear, itemDamage, itemName, itemSpeed, itemStats, makeItem,
  maxStack } from './entity.js';
import { DIR_NAME, FAC_TICK, Factory } from './factory.js';

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));

export const UI = {
  cursor: null,        // 집어든 아이템
  cursorEl: null,

  /** 요소에 스프라이트를 배경으로 넣는다 (이모지 대신) */
  setIcon(el, url) { setIcon(el, url); },

  /* 손그림 애셋이 로드되면 코드 생성분 위에 덮어쓴다 */
  npcArt: null,
  applySpriteOverrides() {
    // 손그림 초상화가 실제로 로드된 NPC만 덮어쓴다 — 아직 애셋이 없는 NPC(여명 마을 주민 등)는 매핑하지 않고 두어야 Art.npcUrl()의 절차 생성 초상화로 자연스럽게 폴백된다
    this.npcArt = {};
    for (const id in NPCS) {
      const art = NPCS[id].art;
      const im = art && Sprites.img['npc_' + art];
      if (im && im.width) this.npcArt[id] = art;
    }
    $('#title-screen').classList.add('has-art');
    document.body.classList.add('sprites-on');
    if (this.dlg) this.setIcon($('#dlg-portrait'), this.npcPortrait(this.dlg.npcId));
  },
  npcPortrait(id) {
    if (this.npcArt && this.npcArt[id]) return Sprites.url(`assets/npc/portrait_${this.npcArt[id]}.png`);
    return Art.npcUrl(id);
  },
  panels: createPanels(id => $('#panel-' + id)),
  get open() { return this.panels.current; },   // 열린 패널 id
  tip: null,           // 툴팁(init 에서 만든다)
  chestRef: null, storeRef: null,
  shopRef: null,
  dlg: null,

  init() {
    this.cursorEl = document.createElement('div');
    this.cursorEl.style.cssText = 'position:absolute;width:40px;height:40px;display:none;pointer-events:none;z-index:200;' +
      'background-repeat:no-repeat;background-position:center;background-size:contain;image-rendering:pixelated;' +
      'filter:drop-shadow(0 2px 5px #000c);font-size:11px;color:#fff;text-align:right;line-height:52px';
    document.body.appendChild(this.cursorEl);
    this.tip = createTooltip($('#tooltip'));

    document.addEventListener('mousemove', e => {
      this.mx = e.clientX; this.my = e.clientY;
      if (this.cursor) { this.cursorEl.style.left = (e.clientX - 20) + 'px'; this.cursorEl.style.top = (e.clientY - 20) + 'px'; }
      if (this.tipTarget) this.placeTip(e.clientX, e.clientY);
    });
    $$('[data-close]').forEach(b => b.addEventListener('click', () => this.closePanel()));

    this.buildHotbar();
    this.buildBagSlots();
    this.buildEquipSlots();
    this.initFullmap();
    this.buildSkillbar();
    this.buildStatAlloc();
    this.buildTree();
    this.buildSkillSlots();
    this.buildProf();
    $$('[data-ui-icon]').forEach(el => this.setIcon(el, Art.uiUrl(el.dataset.uiIcon)));
    this.bindSettings();
    this.bindTabBar();

    const trash = $('#trash-zone');
    if (trash) {
      trash.addEventListener('mousedown', e => {
        e.preventDefault();
        if (this.cursor) this.discardCursor();
        else this.toast(tr('버릴 아이템을 먼저 집어야 한다 (칸을 클릭)'));
      });
      trash.addEventListener('mouseenter', e => { this.tipText(tr('휴지통'), tr('커서에 든 아이템을 버립니다 · Shift+좌클릭으로 칸에서 바로 버리기'), e); });
      trash.addEventListener('mouseleave', () => this.hideTip());
    }
    const sortBtn = $('#btn-sort-bag');
    if (sortBtn) {
      sortBtn.addEventListener('click', () => this.sortBag());
      sortBtn.addEventListener('mouseenter', e => this.tipText(tr('가방 정리'), tr('같은 것끼리 합치고 종류·등급 순으로 정렬합니다. 잠근 물건은 자리를 지킵니다.'), e));
      sortBtn.addEventListener('mouseleave', () => this.hideTip());
    }
    const depBtn = $('#btn-vault-deposit'), wdBtn = $('#btn-vault-withdraw');
    if (depBtn) depBtn.addEventListener('click', () => this.depositGold());
    if (wdBtn) wdBtn.addEventListener('click', () => this.withdrawGold());
  },
  /* ---------------- 보관고 금화 ---------------- */
  depositGold() {
    const p = G.player;
    if (p.gold <= 0) { this.toast(tr('가진 금화가 없다'), 'bad'); return; }
    const raw = prompt(tr('보관고에 넣을 금화 (최대 {gold})', { gold: p.gold }), p.gold);
    if (raw === null) return;
    const amt = Math.floor(+raw);
    if (!amt || amt <= 0 || amt > p.gold) { this.toast(tr('넣을 수 없는 금액이다'), 'bad'); return; }
    p.gold -= amt; G.vaultGold += amt;
    this.refreshVault(); G.sfx('coin');
    this.toast(tr('금화 {amt}개를 보관했다', { amt: fmt(amt) }), 'good');
  },
  withdrawGold() {
    if (G.vaultGold <= 0) { this.toast(tr('보관된 금화가 없다'), 'bad'); return; }
    const raw = prompt(tr('보관고에서 뺄 금화 (최대 {vaultGold})', { vaultGold: G.vaultGold }), G.vaultGold);
    if (raw === null) return;
    const amt = Math.floor(+raw);
    if (!amt || amt <= 0 || amt > G.vaultGold) { this.toast(tr('뺄 수 없는 금액이다'), 'bad'); return; }
    G.vaultGold -= amt; G.player.gold += amt;
    this.refreshVault(); G.sfx('coin');
    this.toast(tr('금화 {amt}개를 꺼냈다', { amt: fmt(amt) }), 'good');
  },
  /* ---------------- 설정 (일시정지 화면) ---------------- */
  bindSettings() {
    const num = [['music', 'set-music', '%'], ['sfx', 'set-sfx', '%'], ['shake', 'set-shake', '%']];
    for (const [key, id] of num) {
      const el = $('#' + id); if (!el) continue;
      el.addEventListener('input', () => G.setOpt(key, +el.value));
    }
    for (const [key, id] of [['dmgnum', 'set-dmgnum'], ['minimap', 'set-minimap'], ['dlgtype', 'set-dlgtype'],
      ['hud_tabbar', 'set-hud-tabbar'], ['hud_quest', 'set-hud-quest'], ['hud_buffs', 'set-hud-buffs'],
      ['hud_clock', 'set-hud-clock'], ['hud_hotbar', 'set-hud-hotbar']]) {
      const el = $('#' + id); if (!el) continue;
      el.addEventListener('change', () => G.setOpt(key, el.checked ? 1 : 0));
    }
    const view = $('#set-view');
    if (view) view.addEventListener('input', () => G.setOpt('view', +view.value));

    this.buildNotices();
    this.buildKeys();

    /* 갈래 전환. */
    const tabs = document.querySelectorAll('.set-tab');
    tabs.forEach(t => t.addEventListener('click', () => this.setTab(t.dataset.tab)));

    const kr = $('#set-keys-reset');
    if (kr) kr.addEventListener('click', () => {
      if (!G.settings) return;
      G.settings.keys = null; G.applySettings(); G.saveSettings();
      this.buildKeys(); this.toast(tr('조작키를 기본값으로 되돌렸다'));
    });

    const r = $('#set-reset');
    if (r) r.addEventListener('click', () => {
      G.settings = Object.assign({}, SET_DEFAULT);
      G.applySettings(); G.saveSettings();
      this.buildNotices(); this.buildKeys();
      this.toast(tr('설정을 기본값으로 되돌렸다'));
    });

    /* ---- 저장 내보내기 / 가져오기 ---- */
    const ex = $('#set-export');
    if (ex) ex.addEventListener('click', () => G.exportSaves());
    const im = $('#set-import'), imf = $('#set-import-file');
    if (im && imf) {
      im.addEventListener('click', () => { imf.value = ''; imf.click(); });
      imf.addEventListener('change', () => {
        const f = imf.files && imf.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => G.importSaves(rd.result);
        rd.onerror = () => this.toast(tr('파일을 읽지 못했다'), 'bad');
        rd.readAsText(f);
      });
    }
  },

  /** 설정 갈래를 고른다 (disp · noti · keys) */
  setTab(id) {
    document.querySelectorAll('.set-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === id));
    document.querySelectorAll('.set-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === id));
    const body = $('.set-body'); if (body) body.scrollTop = 0;
  },

  /* ---- 알림 갈래 ---- */
  /* 'bad'(죽음·실패)는 목록에 없다 — 끌 수 있게 두면 놓치면 곤란한 것까지 사라진다. */
  buildNotices() {
    const box = $('#set-notices'); if (!box) return;
    const off = (G.settings && G.settings.notice) || {};
    box.innerHTML = NOTICE_KINDS.map(k =>
      `<label class="set-row chk"><span>${k.n}</span>` +
      `<input type="checkbox" data-notice="${k.id}"${off[k.id] === 0 ? '' : ' checked'}></label>`).join('');
    box.querySelectorAll('[data-notice]').forEach(el => el.addEventListener('change', () => {
      const n = Object.assign({}, (G.settings && G.settings.notice) || {});
      n[el.dataset.notice] = el.checked ? 1 : 0;
      G.setOpt('notice', n);
    }));
  },

  /* ---- 조작키 ---- */
  /* 누르면 그 항목이 대기 상태가 되고, 다음에 눌린 키를 그 자리에 넣는다. */
  buildKeys() {
    const box = $('#set-keys'); if (!box) return;
    const label = c => this.keyLabel(c);
    box.innerHTML = KEY_ACTIONS.map(a =>
      `<div class="set-row key"><span>${a.n}</span>` +
      `<button class="keybtn" data-act="${a.id}">${G.keysFor(a.id).map(label).join(' · ')}</button></div>`).join('');
    box.querySelectorAll('.keybtn').forEach(btn => btn.addEventListener('click', () => {
      if (this.keyWait) return;
      btn.classList.add('waiting'); btn.textContent = tr('키를 누르세요…');
      this.keyWait = { act: btn.dataset.act, btn };
    }));
  },
  /** 키 코드 → 화면에 적을 이름(설정 창 · 화면 아래 탭 단추가 같이 쓴다) */
  keyLabel(c) {
    const ARROW = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
    const NAMED = { ShiftLeft: tr('Shift(왼)'), ShiftRight: tr('Shift(오)'), ControlLeft: tr('Ctrl(왼)'),
      ControlRight: tr('Ctrl(오)'), AltLeft: tr('Alt(왼)'), AltRight: tr('Alt(오)'), Space: 'Space' };
    return ARROW[c] || NAMED[c] || c.replace(/^Key/, '').replace(/^Digit/, '');
  },
  /* ---- 화면 아래 탭 단추 ---- */
  bindTabBar() {
    const bar = $('#tabbar'); if (!bar) return;
    bar.querySelectorAll('.tb').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const t = b.dataset.tab;
      if (t === 'inv') this.togglePanel('inv');
      else if (t === 'skills') this.togglePanel('skill');
      else if (t === 'quest') this.togglePanel('quest');
      else if (t === 'craft') { this.craftTab = 'hand'; this.togglePanel('craft'); }
      else if (t === 'map') this.openFullmap();
      else if (t === 'menu') { if (this.open || this.dlg) { this.closePanel(); this.closeDialogue(); } else G.setPause(true); }
      b.blur();                                   // 단추에 초점이 남으면 Space(점프)가 단추를 또 누른다
    }));
    this.refreshTabBar();
  },
  refreshTabBar() {
    const bar = $('#tabbar'); if (!bar) return;
    bar.querySelectorAll('.tb').forEach(b => {
      const t = b.dataset.tab, kb = b.querySelector('kbd');
      if (t !== 'menu' && kb) kb.textContent = G.keysFor(t).slice(0, 1).map(c => this.keyLabel(c)).join('');
      const open = { inv: 'inv', skills: 'skill', quest: 'quest', craft: 'craft', map: 'fullmap' }[t];
      b.classList.toggle('on', !!open && this.open === open);
    });
  },
  /** bindInput 의 keydown 이 설정 창에서 먼저 들르는 자리 */
  captureKey(code) {
    if (!this.keyWait) return false;
    const { act } = this.keyWait;
    this.keyWait = null;
    if (code !== 'Escape') {
      const keys = Object.assign({}, (G.settings && G.settings.keys) || {});
      keys[act] = [code];
      G.setOpt('keys', keys);
    }
    this.buildKeys();
    this.refreshTabBar();
    return true;
  },
  /** G.settings → 화면 (열 때와 값이 바뀔 때마다) */
  syncSettings() {
    const s = G.settings; if (!s) return;
    const set = (id, v) => { const el = $('#' + id); if (el) el.value = v; };
    const txt = (id, v) => { const el = $('#' + id); if (el) el.textContent = v + '%'; };
    const chk = (id, v) => { const el = $('#' + id); if (el) el.checked = !!v; };
    set('set-music', s.music); txt('set-music-v', s.music);
    set('set-sfx', s.sfx); txt('set-sfx-v', s.sfx);
    set('set-shake', s.shake); txt('set-shake-v', s.shake);
    chk('set-dmgnum', s.dmgnum); chk('set-minimap', s.minimap);
    for (const k of ['tabbar', 'quest', 'buffs', 'clock', 'hotbar']) chk('set-hud-' + k, s['hud_' + k]);
    chk('set-dlgtype', s.dlgtype === undefined ? 1 : s.dlgtype);
    set('set-view', s.view); txt('set-view-v', s.view);
  },

  /** 아이템이 아닌 순수 텍스트 툴팁(휴지통 안내 등) */
  tipText(title, desc, e) {
    this.tip.show(`<div class="tname c0">${title}</div><div class="tdesc">${desc}</div>`, e.clientX, e.clientY);
    this.tipTarget = true;
  },

  /* ---------------- 토스트 ---------------- */
  toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 2200);
    setTimeout(() => el.remove(), 2700);
  },

  /* ---------------- 패널 ---------------- */
  togglePanel(id) {
    if (this.open === id) { this.closePanel(); return; }
    this.closePanel();
    const el = $('#panel-' + id);
    if (!el) return;
    this.panels.show(id);
    G.uiOpen = true;
    if (id === 'inv') { this.refreshBag(); this.refreshEquip(); this.refreshStatSheet(); }
    if (id === 'skill') { this.setSkillTab(this.skillTab || 'tree'); this.refreshTree(); this.refreshSkillSlots(); this.refreshProf(); }
    if (id === 'quest') this.refreshQuest();
    if (id === 'craft') this.refreshCraft();
    this.refreshTabBar();
  },
  closePanel() {
    this.panels.hide();
    G.uiOpen = false; this.hideTip();
    if (this.cursor) { G.player.addItem(this.cursor); this.setCursor(null); }
    this.chestRef = null; this.shopRef = null; this.machRef = null; this.storeRef = null;
    this.refreshTabBar();
  },

  /* ---------------- 핫바 ---------------- */
  buildHotbar() {
    const hb = $('#hotbar'); hb.innerHTML = '';
    for (let i = 0; i < HOTBAR; i++)
      makeSlot('slot', { data: { bag: i }, html: `<span class="num">${(i + 1) % 10}</span><span class="ic"></span><span class="cnt"></span>`,
        down: () => { G.player.sel = i; this.refreshHotbar(); },
        enter: e => this.showTip(G.player.bag[i], e), leave: () => this.hideTip() }, hb);
  },
  refreshHotbar() {
    const p = G.player;
    $$('#hotbar .slot').forEach((el, i) => {
      const it = p.bag[i];
      paintSlot(el, 'slot' + (i === p.sel ? ' sel' : '') + (it ? ' r' + it.r : ''), it ? Art.itemUrl(it.id) : '', it && it.c > 1 ? it.c : '');
    });
  },

  /* ---------------- 가방 ---------------- */
  buildBagSlots() {
    const g = $('#bag-grid'); g.innerHTML = '';
    for (let i = 0; i < MAX_BAG_SIZE; i++)
      makeSlot('slot' + (i < HOTBAR ? ' hb-slot' : ''), { data: { bag: i }, html: `<span class="ic"></span><span class="cnt"></span>`,
        down: e => this.bagClick(i, e.button, e.shiftKey, e.ctrlKey || e.metaKey), noMenu: true,
        enter: e => this.showTip(G.player.bag[i], e), leave: () => this.hideTip() }, g);
  },
  refreshBag() {
    // 손그림 스프라이트가 비동기로 도착하면 새 게임 전에도 이 함수가 호출될 수 있다.
    if (!G.player) return;
    const p = G.player, cap = p.bag.length;
    $$('#bag-grid .slot').forEach((el, i) => {
      if (i >= cap) { el.classList.add('locked'); this.setIcon(el.querySelector('.ic'), ''); el.querySelector('.cnt').textContent = ''; return; }
      const it = p.bag[i];
      paintSlot(el, 'slot' + (i < HOTBAR ? ' hb-slot' : '') + (it ? ' r' + it.r : '') + (it && it.lk ? ' is-locked' : ''),
        it ? Art.itemUrl(it.id) : '', it && it.c > 1 ? it.c : '');
    });
    this.refreshHotbar();
  },
  bagClick(i, btn, shift, ctrl) {
    const p = G.player;
    if (i >= p.bag.length) return;         // 아직 열리지 않은 확장 칸
    // Ctrl+좌클릭: 잠금 토글.
    if (ctrl && btn === 0) {
      const it = p.bag[i]; if (!it) return;
      it.lk = it.lk ? 0 : 1;
      this.toast(it.lk ? tr('{itemName} 잠금', { itemName: itemName(it) }) : tr('{itemName} 잠금 해제', { itemName: itemName(it) }));
      this.refreshBag(); return;
    }
    if (shift && btn === 0) { this.discardSlot(i); return; }   // Shift+좌클릭: 즉시 버리기
    if (btn === 2) {                      // 우클릭: 사용 / 장착
      if (this.cursor) return;
      const it = p.bag[i]; if (!it) return;
      const d = idef(it);
      if (d.type === 'consum') { G.useConsumable(i); }
      else if (d.type === 'summon') { G.useSummon(i); }
      else if (d.type === 'tool') { this.toast(tr('도구는 핫바에 두고 좌클릭으로 사용한다')); }
      else if (d.type === 'rod') { this.toast(tr('낚싯대는 핫바에 두고 물가에서 우클릭한다')); }
      else if (isGear(it)) { p.equipFrom(i); this.refreshBag(); this.refreshEquip(); this.refreshStatSheet(); G.sfx('equip'); }
      this.refreshBag();
      return;
    }
    // 좌클릭: 집기 / 놓기 / 합치기
    const cur = this.cursor, it = p.bag[i];
    if (cur && it && cur.id === it.id && !cur.a && !it.a && cur.r === it.r && maxStack(it) > 1) {
      const room = maxStack(it) - it.c, mv = Math.min(room, cur.c);
      it.c += mv; cur.c -= mv;
      this.setCursor(cur.c > 0 ? cur : null);
    } else { p.bag[i] = cur; this.setCursor(it); }
    this.refreshBag();
  },
  /** 슬롯의 아이템을 확인 없이 즉시 버린다 (Shift+좌클릭 / 휴지통 드롭 공용) */
  discardSlot(i) {
    const p = G.player, it = p.bag[i];
    if (!it) return;
    if (it.lk) { this.toast(tr('잠긴 물건이다 (Ctrl+좌클릭으로 해제)'), 'bad'); return; }
    this.toast(tr('버렸다: {itemName}{v}', { itemName: itemName(it), v: it.c > 1 ? ' ×' + it.c : '' }), 'bad');
    p.bag[i] = null;
    this.refreshBag();
    G.sfx('place');
  },
  /** 가방 정리 — 같은 것끼리 합치고, 종류·등급 순으로 앞에서부터 채운다. */
  sortBag() {
    const p = G.player;
    const keep = [];                                   // [index, item] — 잠긴 것
    const move = [];
    p.bag.forEach((it, i) => { if (!it) return; if (it.lk) keep.push([i, it]); else move.push(it); });
    // 같은 아이템끼리 합친다 (접사 붙은 장비는 각각 하나짜리라 합쳐지지 않는다)
    const merged = [];
    for (const it of move) {
      const same = merged.find(q => q.id === it.id && !q.a && !it.a && q.r === it.r && maxStack(q) > 1 && q.c < maxStack(q));
      if (same) {
        const room = maxStack(same) - same.c, mv = Math.min(room, it.c);
        same.c += mv; it.c -= mv;
        if (it.c > 0) merged.push(it);
      } else merged.push(it);
    }
    const ORDER = { weapon: 0, tool: 1, armor: 2, acc: 3, bag: 4, consum: 5, summon: 6, seed: 7, mat: 8, block: 9, machine: 10 };
    merged.sort((a, b) => {
      const da = idef(a), db = idef(b);
      const oa = ORDER[da.type] === undefined ? 99 : ORDER[da.type];
      const ob = ORDER[db.type] === undefined ? 99 : ORDER[db.type];
      if (oa !== ob) return oa - ob;
      if (b.r !== a.r) return b.r - a.r;                // 등급 높은 것 먼저
      return da.n.localeCompare(db.n, 'ko');
    });
    const out = new Array(p.bag.length).fill(null);
    for (const [i, it] of keep) out[i] = it;            // 잠긴 것은 원래 자리에
    let k = 0;
    for (const it of merged) { while (out[k] !== null && k < out.length) k++; if (k >= out.length) break; out[k] = it; }
    p.bag = out;
    this.refreshBag(); this.refreshHotbar();
    G.sfx('place');
    this.toast(tr('가방을 정리했다'));
  },
  /** 휴지통에 커서 아이템을 놓으면 전량 삭제 */
  discardCursor() {
    if (!this.cursor) return;
    this.toast(tr('버렸다: {itemName}{v}', { itemName: itemName(this.cursor), v: this.cursor.c > 1 ? ' ×' + this.cursor.c : '' }), 'bad');
    this.setCursor(null);
    G.sfx('place');
  },
  setCursor(it) {
    this.cursor = it;
    if (it) {
      this.cursorEl.style.display = 'block';
      this.setIcon(this.cursorEl, Art.itemUrl(it.id));
      this.cursorEl.textContent = it.c > 1 ? it.c : '';
    } else { this.cursorEl.style.display = 'none'; this.setIcon(this.cursorEl, ''); }
  },

  /* ---------------- 장비 ---------------- */
  buildEquipSlots() {
    // 칸마다 비었을 때 깔릴 실루엣.
    const SLOT_IC = { weapon: 'weapon', helm: 'helm', chest: 'chest', boots: 'boots', acc1: 'acc', acc2: 'acc', util1: 'util', util2: 'util', bag: 'bag', pet1: 'pet', pet2: 'pet' };
    $$('.slot.equip').forEach(el => {
      const key = el.dataset.eq;
      el.insertAdjacentHTML('beforeend', '<span class="eqic"></span><span class="ic"></span>');
      const ic = SLOT_IC[key];
      if (ic) this.setIcon(el.querySelector('.eqic'), Art.uiUrl('slot_' + ic));
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const p = G.player;
        if (this.cursor) {
          const d = idef(this.cursor);
          const ok = (key === 'weapon' && d.type === 'weapon') ||
            (d.type === 'armor' && d.slot === key) || (d.type === 'acc' && key.startsWith('acc')) ||
            (d.type === 'util' && key.startsWith('util')) ||
            (d.type === 'bag' && key === 'bag');
          if (!ok) return;
          if (p.level < equipReqLv(this.cursor.id)) { G.toast(tr('레벨 {equipReqLv} 필요', { equipReqLv: equipReqLv(this.cursor.id) }), 'bad'); return; }
          const old = p.equip[key]; p.equip[key] = this.cursor; this.setCursor(old);
        } else {
          const old = p.equip[key]; if (!old) return;
          p.equip[key] = null; this.setCursor(old);
        }
        p.recalc(); this.refreshEquip(); this.refreshBag(); this.refreshStatSheet(); G.sfx('equip');
      });
      el.addEventListener('contextmenu', e => e.preventDefault());
      el.addEventListener('mouseenter', e => this.showTip(G.player.equip[key], e));
      el.addEventListener('mouseleave', () => this.hideTip());
    });
  },
  refreshEquip() {
    if (!G.player) return;
    const p = G.player;
    $$('.slot.equip').forEach(el => {
      const it = p.equip[el.dataset.eq];
      el.className = 'slot equip' + (it ? ' filled r' + it.r : '');
      this.setIcon(el.querySelector('.ic'), it ? Art.itemUrl(it.id) : '');
    });
  },
  refreshStatSheet() {
    const p = G.player, d = p.d;
    const w = p.equip.weapon;
    const wd = w && idef(w).dmg ? Math.round(p.scaleDmg(itemDamage(w), idef(w).wc === 'melee' ? 'str' : idef(w).wc === 'ranged' ? 'dex' : 'int')) : '—';
    $('#stat-sheet').innerHTML = `
      <h4>${tr('기본')}</h4>
      ${tr('힘')}<span class="sv">${d.str}</span><br>${tr('민첩')}<span class="sv">${d.dex}</span><br>
      ${tr('지능')}<span class="sv">${d.int}</span><br>${tr('체력')}<span class="sv">${d.vit}</span>
      <h4>${tr('전투')}</h4>
      ${tr('공격력')}<span class="sv">${wd}</span><br>
      ${tr('방어')}<span class="sv">${d.def}</span><br>
      ${tr('치명')}<span class="sv">${d.crit.toFixed(1)}%</span><br>
      ${tr('치명피해')}<span class="sv">${Math.round(d.critD)}%</span><br>
      ${tr('흡혈')}<span class="sv">${d.lifesteal.toFixed(0)}%</span><br>
      ${tr('쿨감')}<span class="sv">${Math.round(d.cdr)}%</span><br>
      ${tr('이동')}<span class="sv">${Math.round(d.ms)}</span>
      <h4>${tr('잠수')}</h4>
      ${tr('숨')}<span class="sv">${tr('{oxyMax}초', { oxyMax: d.oxyMax })}</span><br>
      ${tr('숨 회복')}<span class="sv">${tr('{v}배', { v: (d.oxyReg || 1).toFixed(1) })}</span>`;
  },

  /* ---------------- 스킬바 ---------------- */
  buildSkillbar() {
    const bar = $('#skillbar'); bar.innerHTML = '';
    const keys = ['Q', 'E', 'R', 'F'];
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'sk empty';
      d.innerHTML = `<span class="key">${keys[i]}</span><span class="ic"></span><span class="cdnum"></span>`;
      bar.appendChild(d);
    }
  },
  refreshSkillbar() {
    const p = G.player;
    $$('#skillbar .sk').forEach((el, i) => {
      const id = p.slots[i];
      if (!id) { el.className = 'sk empty'; this.setIcon(el.querySelector('.ic'), ''); el.querySelector('.cdnum').textContent = ''; return; }
      const sk = SKILLS[id], cd = p.cd[id] || 0;
      el.className = 'sk' + (cd <= 0 && p.mp >= sk.mana ? ' ready' : '');
      this.setIcon(el.querySelector('.ic'), Art.skillUrl(id));
      el.querySelector('.cdnum').textContent = cd > 0 ? (cd > 1 ? Math.ceil(cd) : cd.toFixed(1)) : '';
      el.style.filter = cd > 0 ? 'grayscale(1) brightness(.55)' : (p.mp < sk.mana ? 'hue-rotate(0) brightness(.7)' : '');
    });
  },

  /* ---------------- 스탯 분배 ---------------- */
  buildStatAlloc() {
    const defs = [['str', tr('힘'), tr('근접 피해')], ['dex', tr('민첩'), tr('원거리 · 치명')], ['int', tr('지능'), tr('마법 · 마나')], ['vit', tr('체력'), tr('생명 · 방어')]];
    const box = $('#stat-alloc'); box.innerHTML = '';
    for (const [k, n, dsc] of defs) {
      const el = document.createElement('div');
      el.className = 'stat-chip';
      el.innerHTML = `<span class="sname">${n}</span><span class="snum" data-s="${k}">0</span><button data-add="${k}">+</button><span class="sdesc">${dsc}</span>`;
      el.querySelector('button').addEventListener('click', () => {
        const p = G.player;
        if (p.statPts <= 0) return;
        p.statPts--; p.base[k]++; p.recalc();
        this.refreshStatAlloc(); this.refreshStatSheet();
      });
      box.appendChild(el);
    }
  },
  refreshStatAlloc() {
    const p = G.player;
    $('#stat-pts').textContent = p.statPts;
    $('#skill-pts').textContent = p.skillPts;
    $$('#stat-alloc .snum').forEach(el => { el.textContent = p.base[el.dataset.s] + ' (' + p.d[el.dataset.s] + ')'; });
    $$('#stat-alloc button').forEach(b => b.style.opacity = p.statPts > 0 ? 1 : .35);
  },

  /* ---------------- 특성 트리 ---------------- */
  /* ★ 세 갈래를 **한 판**에 그린다 — 사연: docs/code-history.md#h90 */
  TREE_TOP: 14, TREE_ROW: 89, TREE_BOX: 44,
  TREE_COLS: 9,                                   // 갈래 셋 × 가로 세 칸
  _brIdx(br) { return BRANCHES.findIndex(b => b.id === br); },
  /** 가로 자리 — 갈래 순서를 앞에 얹어 아홉 칸 중 하나로 편다 */
  _nodeX(id) {
    const sk = SKILLS[id];
    return ((this._brIdx(sk.br) * 3 + sk.col + 0.5) / this.TREE_COLS * 100) + '%';
  },
  _nodeY(id) { return this.TREE_TOP + SKILLS[id].tier * this.TREE_ROW; },

  buildTree() {
    const w = $('#tree-wrap'); if (!w) return;
    w.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';

    // ① 갈래 머리글 — 아홉 칸 중 제 셋 위에 걸린다
    const head = document.createElement('div');
    head.className = 'bheads';
    for (const br of BRANCHES)
      head.innerHTML += `<div class="bhead" style="--bc:${br.c}">` +
        `<h3>${br.n}</h3><div class="btag">${br.tag}</div></div>`;
    w.appendChild(head);
    /* 규칙을 한 줄로 적어 둔다. */
    const note = document.createElement('div');
    note.className = 'bnote';
    note.innerHTML = `${tr('점선은 <b>갈래를 건너는 길</b> — 이어진 칸을 하나라도 배우면 열립니다.')} ` +
      tr('단을 여는 점수는 다른 갈래에 찍은 것도 <b>절반</b>이 쌓입니다.');
    w.appendChild(note);

    const grid = document.createElement('div');
    grid.className = 'bgrid';
    const rows = 1 + Math.max(...Object.values(SKILLS).map(s => s.tier));
    grid.style.height = (this.TREE_TOP + (rows - 1) * this.TREE_ROW + this.TREE_BOX + 36) + 'px';

    // ② 잇는 선 — 칸보다 먼저 넣어야 뒤로 깔린다.
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'blines');
    for (const id in SKILLS) for (const rq of (SKILLS[id].req || [])) {
      const cross = SKILLS[rq].br !== SKILLS[id].br;
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', this._nodeX(rq)); ln.setAttribute('y1', this._nodeY(rq) + this.TREE_BOX / 2);
      ln.setAttribute('x2', this._nodeX(id)); ln.setAttribute('y2', this._nodeY(id) + this.TREE_BOX / 2);
      ln.setAttribute('class', 'bline' + (cross ? ' cross' : ''));
      /* 선 색은 **도착하는 칸**의 갈래를 쓴다. */
      ln.style.setProperty('--bc', BRANCHES[this._brIdx(SKILLS[id].br)].c);
      ln.dataset.from = rq; ln.dataset.to = id;
      svg.appendChild(ln);
    }
    grid.appendChild(svg);

    // ③ 칸
    for (const id in SKILLS) {
      const sk = SKILLS[id];
      const n = document.createElement('div');
      n.className = 'node'; n.dataset.sk = id; n.dataset.br = sk.br;
      n.style.setProperty('--bc', BRANCHES[this._brIdx(sk.br)].c);
      n.style.left = this._nodeX(id);
      n.style.top = this._nodeY(id) + 'px';
      n.innerHTML = `<div class="nbox"><span class="nic"></span><span class="nlock">🔒</span></div>` +
        `<div class="nname">${sk.n}</div><div class="nrank"></div>`;
      this.setIcon(n.querySelector('.nic'), Art.skillUrl(id));
      n.addEventListener('click', () => this.learn(id));
      n.addEventListener('contextmenu', e => { e.preventDefault(); this.assign(id); });
      n.addEventListener('mouseenter', e => this.showSkillTip(id, e));
      n.addEventListener('mousemove', e => this.placeTip(e.clientX, e.clientY));
      n.addEventListener('mouseleave', () => this.hideTip());
      grid.appendChild(n);
    }
    w.appendChild(grid);
    this.bindSkillTabs();
  },

  /** 팝업 위쪽 두 갈래 — 특성 트리 / 생활 숙련 */
  bindSkillTabs() {
    const box = $('#panel-skill'); if (!box || box.dataset.tabBound) return;
    box.dataset.tabBound = '1';
    $$('#panel-skill .sk-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setSkillTab(btn.dataset.sktab));
    });
  },
  setSkillTab(id) {
    $$('#panel-skill .sk-tab').forEach(b => b.classList.toggle('on', b.dataset.sktab === id));
    $$('#panel-skill .sk-pane').forEach(p => p.classList.toggle('on', p.id === 'sk-pane-' + id));
    this.skillTab = id;
    if (id === 'prof') this.refreshProf();
  },

  /** 이 분기가 단을 여는 데 쓸 수 있는 점수 — 사연: docs/code-history.md#h91 */
  BR_CROSS: 0.5,
  branchPts(brId) {
    const p = G.player;
    let own = 0, other = 0;
    for (const br of BRANCHES) for (const id of br.nodes)
      (br.id === brId ? (n => own += n) : (n => other += n))(p.skills[id] || 0);
    return own + Math.floor(other * this.BR_CROSS);
  },
  /** 이어진 윗칸 중 하나라도 배웠는가. */
  reqMet(id) {
    const req = SKILLS[id].req;
    if (!req || !req.length) return true;
    const p = G.player;
    return req.some(r => (p.skills[r] || 0) > 0);
  },
  /** 이 칸이 왜 잠겨 있는지 — 잠겨 있지 않으면 빈 문자열 */
  lockReason(id) {
    const sk = SKILLS[id];
    const need = TIER_REQ[sk.tier], have = this.branchPts(sk.br);
    /* 모자란 까닭을 **내역까지** 적는다. */
    if (have < need) {
      let own = 0;
      for (const br of BRANCHES) if (br.id === sk.br)
        for (const q of br.nodes) own += G.player.skills[q] || 0;
      const lend = have - own;
      return tr('이 갈래에 {need}점 필요 (지금 {have}', { need, have }) +
        (lend > 0 ? ` ${tr('= 제 갈래 {own} + 다른 갈래 {lend}', { own, lend })}` : '') + ')';
    }
    if (!this.reqMet(id)) { const nm = sk.req.map(r => SKILLS[r].n).join(` ${tr('또는')} `); return `${tr('윗단계')} ` + eulreul(nm) + ` ${tr('먼저')}`; }
    return '';
  },
  skDesc(id, rank) {
    const sk = SKILLS[id];
    const r = Math.max(1, rank);
    let txt = sk.d;
    if (sk.v) txt = txt.replace(/%d/g, sk.v(r));
    else if (sk.b) { const b = sk.b(r); const vals = Object.values(b); let i = 0; txt = txt.replace(/%d/g, () => vals[i++] ?? 0); }
    return txt.replace(/%%/g, '%');
  },
  /** 칸 위에 올렸을 때의 설명. */
  showSkillTip(id, e) {
    const p = G.player, sk = SKILLS[id], rank = p.skills[id] || 0;
    const why = this.lockReason(id);
    const kind = sk.type === 'active' ? tr('액티브') : tr('패시브');
    let h = `<div class="tname c${rank > 0 ? 3 : 0}">${sk.n}</div>`;
    h += `<div class="tmeta">${tr('{kind} · {rank}/{max} 랭크', { kind, rank, max: sk.max })}` +
      (sk.type === 'active' ? ` ${tr('· 마나 {mana} · 재사용 {cd}초', { mana: sk.mana, cd: sk.cd })}` : '') + `</div>`;
    h += `<div class="tdesc">${this.skDesc(id, rank)}</div>`;
    if (rank > 0 && rank < sk.max)
      h += `<div class="tnext">${tr('다음 랭크 — {skDesc}', { skDesc: this.skDesc(id, rank + 1) })}</div>`;
    if (why) h += `<div class="tbad">${why}</div>`;
    else if (rank >= sk.max) h += `<div class="tdim">${tr('최대 랭크')}</div>`;
    else if (p.skillPts <= 0) h += `<div class="tbad">${tr('특성 포인트가 없다')}</div>`;
    else h += `<div class="tgood">${tr('좌클릭으로 습득{v}', { v: sk.type === 'active' ? ` ${tr('· 우클릭으로 슬롯 등록')}` : '' })}</div>`;
    this.tip.show(h, e.clientX, e.clientY);
    this.tipTarget = true;
  },

  refreshTree() {
    const p = G.player;
    /* 잠긴 칸은 열린 칸과 선으로 바로 이어진 것만 보인다 — 트리 전체를 처음부터 펼치면
       갈 길보다 못 갈 길이 더 많이 보인다. 열린 칸 = 배웠거나 지금 배울 수 있는 칸. */
    const open = {};
    for (const id in SKILLS) open[id] = (p.skills[id] || 0) > 0 || !this.lockReason(id);
    const seen = { ...open };
    for (const id in SKILLS) for (const r of (SKILLS[id].req || []))
      if (open[r] || open[id]) seen[id] = seen[r] = true;
    $$('#tree-wrap .node').forEach(el => {
      const id = el.dataset.sk, sk = SKILLS[id], rank = p.skills[id] || 0;
      const locked = !!this.lockReason(id);
      const can = !locked && rank < sk.max && p.skillPts > 0;
      el.className = 'node' + (rank > 0 ? ' learned' : '') + (rank >= sk.max ? ' maxed' : '') +
        (locked ? ' locked' : '') + (can ? ' can' : '') + (p.slots.includes(id) ? ' active' : '') +
        (seen[id] ? '' : ' unseen');
      el.querySelector('.nrank').textContent = `${rank}/${sk.max}`;
    });
    // 선 — 윗칸을 배운 순간부터 길이 열린 것으로 본다
    $$('#tree-wrap .bline').forEach(ln => {
      const a = (p.skills[ln.dataset.from] || 0) > 0, b = (p.skills[ln.dataset.to] || 0) > 0;
      ln.classList.toggle('on', a);
      ln.classList.toggle('full', a && b);
      ln.classList.toggle('unseen', !seen[ln.dataset.from] || !seen[ln.dataset.to]);
    });
    this.refreshStatAlloc();
  },

  learn(id) {
    const p = G.player, sk = SKILLS[id];
    if (p.skillPts <= 0) { this.toast(tr('특성 포인트가 없다'), 'bad'); return; }
    if ((p.skills[id] || 0) >= sk.max) { this.toast(tr('이미 최대 랭크다'), 'bad'); return; }
    const why = this.lockReason(id);
    if (why) { this.toast(why, 'bad'); return; }
    p.skillPts--; p.skills[id] = (p.skills[id] || 0) + 1;
    if (sk.type === 'active' && !p.slots.includes(id)) {
      const empty = p.slots.indexOf(null);
      if (empty >= 0) p.slots[empty] = id;
    }
    p.recalc();
    this.toast(tr('{sk} 습득 ({skills}/{max})', { sk: sk.n, skills: p.skills[id], max: sk.max }), 'good');
    G.sfx('learn');
    this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar(); this.refreshStatSheet();
    this.flashNode(id);
  },

  /** 습득 연출 — 찍은 칸이 한 번 부풀고, 그 칸에서 뻗어 나가는 선에 빛이 흐른다. */
  flashNode(id) {
    const el = $(`#tree-wrap .node[data-sk="${id}"]`);
    if (el) {
      el.classList.remove('just'); void el.offsetWidth; el.classList.add('just');
      setTimeout(() => el.classList.remove('just'), 900);
      // 칸 둘레로 튀는 불티 — 요소를 만들어 던지고 끝나면 지운다
      const box = el.querySelector('.nbox');
      for (let i = 0; i < 10; i++) {
        const sp = document.createElement('i');
        sp.className = 'nspark';
        const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 20;
        sp.style.setProperty('--dx', Math.cos(a) * d + 'px');
        sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
        sp.style.animationDelay = (Math.random() * 0.12) + 's';
        box.appendChild(sp);
        setTimeout(() => sp.remove(), 900);
      }
    }
    $$('#tree-wrap .bline').forEach(ln => {
      if (ln.dataset.from !== id && ln.dataset.to !== id) return;
      ln.classList.remove('flow'); void ln.getBoundingClientRect(); ln.classList.add('flow');
      setTimeout(() => ln.classList.remove('flow'), 900);
    });
  },

  assign(id) {
    const p = G.player, sk = SKILLS[id];
    if (sk.type !== 'active' || !(p.skills[id] > 0)) return;
    const cur = p.slots.indexOf(id);
    if (cur >= 0) { p.slots[cur] = null; }
    else { const e = p.slots.indexOf(null); p.slots[e >= 0 ? e : 0] = id; }
    this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar();
  },
  buildSkillSlots() {
    const box = $('#skill-slots'); box.innerHTML = '';
    const keys = ['Q', 'E', 'R', 'F'];
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'ss'; d.innerHTML = `<span class="key">${keys[i]}</span><span class="ic"></span>`;
      d.addEventListener('click', () => { G.player.slots[i] = null; this.refreshSkillSlots(); this.refreshTree(); this.refreshSkillbar(); });
      box.appendChild(d);
    }
  },
  refreshSkillSlots() {
    const p = G.player;
    $$('#skill-slots .ss').forEach((el, i) => {
      const id = p.slots[i];
      el.className = 'ss' + (id ? ' filled' : '');
      this.setIcon(el.querySelector('.ic'), id ? Art.skillUrl(id) : '');
    });
  },

  /* ---------------- 생활 숙련 ---------------- */
  buildProf() {
    const w = $('#prof-wrap'); if (!w) return;
    w.innerHTML = '';
    for (const k in PROFS) {
      const P = PROFS[k];
      const d = document.createElement('div');
      d.className = 'prof'; d.dataset.pf = k;
      d.style.setProperty('--pc', P.c);
      d.innerHTML =
        `<div class="phead"><span class="pic"></span>` +
        `<span class="pn">${P.n}</span><span class="plv">Lv 1</span></div>` +
        `<div class="pline">${P.line}</div>` +
        `<div class="pbar"><i></i></div><div class="pxp"></div>` +
        `<div class="plin"></div>` +
        `<div class="pperks"></div>`;
      d.querySelector('.pic').textContent = P.i;   // 그림 아이콘을 따로 굽지 않는다 — 이 둘뿐이라 글자로 충분하다
      w.appendChild(d);
    }
  },
  refreshProf() {
    const w = $('#prof-wrap'); if (!w) return;
    if (!w.firstChild) this.buildProf();
    const p = G.player;
    for (const k in PROFS) {
      const P = PROFS[k], el = w.querySelector(`.prof[data-pf="${k}"]`);
      if (!el) continue;
      const pr = (p.prof && p.prof[k]) || { lv: 1, xp: 0 };
      const capped = pr.lv >= PROF_MAX;
      const need = capped ? 1 : profNeed(pr.lv);
      el.querySelector('.plv').textContent = capped ? tr('Lv {profMax} · 끝', { profMax: PROF_MAX }) : `Lv ${pr.lv}`;
      el.querySelector('.pbar i').style.width = (capped ? 100 : Math.min(100, pr.xp / need * 100)) + '%';
      el.querySelector('.pxp').textContent = capped ? tr('더 오를 곳이 없다') : `${pr.xp} / ${need}`;
      el.querySelector('.plin').innerHTML = P.lin
        .map(([n, f]) => `<span class="pl"><b>${f(pr.lv)}</b>${n}</span>`).join('');
      el.querySelector('.pperks').innerHTML = P.perks.map(([at, n, dsc]) =>
        `<div class="perk${pr.lv >= at ? ' on' : ''}"><span class="pk">Lv ${at}</span>` +
        `<span class="pkn">${n}</span><span class="pkd">${dsc}</span></div>`).join('');
    }
  },

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

  /* ---------------- 제작 ---------------- */
  craftTab: 'work',
  /* null이면 **지금 진행 중인 세션**을 연다 — 사연: docs/code-history.md#h97 */
  questSession: null,
  craftGroup: 'all',
  craftShowLocked: false,
  craftQuery: '',
  /** 제작품의 쓰임새 기준 분류. */
  craftGroupFor(r) {
    const id = r.out, type = ITEMS[id].type;
    const factory = new Set(['wire', 'circuit', 'motor', 'machine_frame', 'battery_empty', 'battery_cell', 'fuel_brick', 'refined_oil', 'polymer', 'steel_plate', 'rivet']);
    if (id.startsWith('m_') || factory.has(id)) return 'factory';
    if (['weapon', 'tool', 'armor', 'acc', 'bag'].includes(type)) return 'gear';
    if (type === 'consum' || type === 'summon' || id.startsWith('food_') || id.startsWith('potion_')) return 'survival';
    if (type === 'block') return 'build';
    return 'other';
  },
  matLine(p, need) {
    return Object.entries(need).map(([k, v]) => {
      const have = p.countItem(k);
      return `<span class="${have < v ? 'lack' : ''}">${ITEMS[k].n} ${have}/${v}</span>`;
    }).join(' · ');
  },
  refreshCraft() {
    const p = G.player, near = G.nearSt;
    const lv = { work: (G.nearStObj.work && G.nearStObj.work.lv) || 1, forge: (G.nearStObj.forge && G.nearStObj.forge.lv) || 1 };
    let tab = this.craftTab;
    // 이제는 **지금 이 순간 실제로 근처(70px)에 있는 시설만** 같이 보여준다 — 없으면 맨손 탭 하나뿐 — 사연: docs/code-history.md#h98
    if (tab !== 'hand' && !near[tab]) tab = this.craftTab = 'hand';
    const allTabs = { work: ['work', tr('작업대 Lv.{work}', { work: lv.work })], forge: ['forge', tr('용광로 Lv.{forge}', { forge: lv.forge })], hand: ['hand', tr('맨손')] };
    const tabs = [];
    if (tab === 'work' || (tab === 'hand' && near.work)) tabs.push(allTabs.work);
    if (tab === 'forge' || (tab === 'hand' && near.forge)) tabs.push(allTabs.forge);
    tabs.push(allTabs.hand);
    let head = '<div class="craft-tabs">' + tabs.map(([k, n]) =>
      `<button class="ctab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('') + '</div>';

    if (tab === 'hand') {
      head += `<div class="st-info">${tr('시설 없이 만들 수 있는 것들이다.')}</div>`;
    } else {
      const L = lv[tab];
      head += `<div class="st-info"><b>${STATION_NAME[tab][L]}</b> — ${STATION_DESC[tab][L]}` +
        (near[tab] ? '' : ` <span class="lack">${tr('· 시설 앞으로 가야 쓸 수 있다')}</span>`) + '</div>';
      if (L < STATION_UP[tab].length) {
        const up = STATION_UP[tab][L], can = near[tab] && p.hasAll(up.need);
        head += `<div class="st-up${can ? '' : ' no'}" data-up="${tab}">` +
          `<div class="rname">${tr('▲ {stationName|으로} 개조', { stationName: STATION_NAME[tab][L + 1] })}</div>` +
          `<div class="rmat">${this.matLine(p, up.need)}</div></div>`;
      } else {
        head += `<div class="st-up done">${tr('더 손볼 데가 없다. 마지막 단계다.')}</div>`;
      }
    }
    // 만들 수 있는 것 → 재료만 모자란 것 → 아직 안 열린 것 순.
    const rows = [];
    for (let i = 0; i < RECIPES.length; i++) {
      const r = RECIPES[i];
      if (tab === 'hand' ? r.station : r.station !== tab) continue;
      const need = r.lv || 1;
      const locked = tab !== 'hand' && lv[tab] < need;
      const group = this.craftGroupFor(r);
      const query = this.craftQuery.trim().toLowerCase();
      const matches = !query || ITEMS[r.out].n.toLowerCase().includes(query);
      if ((!this.craftShowLocked && locked) || (this.craftGroup !== 'all' && group !== this.craftGroup) || !matches) continue;
      rows.push({ i, r, locked, mat: p.hasAll(r.need), group });
    }
    rows.sort((a, b) => (a.locked - b.locked) || (b.mat - a.mat) || ((a.r.lv || 1) - (b.r.lv || 1)));

    const groups = [['all', tr('전체')], ['gear', tr('장비')], ['survival', tr('생존')], ['build', tr('건축')], ['factory', tr('자동화')], ['other', tr('기타')]];
    const escapedQuery = this.craftQuery.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    head += `<div class="craft-filter"><input id="craft-search" type="search" value="${escapedQuery}" placeholder="${tr('제작품 검색')}">` +
      groups.map(([key, label]) => `<button class="cg${this.craftGroup === key ? ' on' : ''}" data-cgroup="${key}">${label}</button>`).join('') +
      `<button class="lock-toggle${this.craftShowLocked ? ' on' : ''}" data-lock-toggle>${this.craftShowLocked ? tr('잠긴 제작법 숨기기') : tr('잠긴 제작법 보기')}</button>` +
      `<span class="craft-count">${tr('{rowsCount}개 표시', { rowsCount: rows.length })}</span></div>`;
    $('#craft-note').innerHTML = head;

    let h = '';
    for (const { i, r, locked, mat } of rows) {
      const d = ITEMS[r.out];
      const ok = !locked && mat && (!r.station || near[r.station]);
      let mats = this.matLine(p, r.need);
      if (locked) mats = `<span class="lack">${tr('[{stationName} 필요]', { stationName: STATION_NAME[tab][r.lv] })}</span> ` + mats;
      h += `<div class="recipe ${ok ? '' : 'no'}" data-r="${i}"><div class="ric"></div><div>` +
        `<div class="rname">${d.n}${r.n > 1 ? ' ×' + r.n : ''}</div><div class="rmat">${mats}</div></div></div>`;
    }
    $('#craft-list').innerHTML = h || `<div class="st-info">${tr('여기서 만들 수 있는 것이 아직 없다.')}</div>`;

    $$('#craft-note .ctab').forEach(b => b.addEventListener('click', () => {
      this.craftTab = b.dataset.tab;
      this.craftGroup = 'all'; this.craftQuery = ''; this.refreshCraft();
    }));
    $$('#craft-note .cg').forEach(b => b.addEventListener('click', () => { this.craftGroup = b.dataset.cgroup; this.refreshCraft(); }));
    const lockToggle = $('#craft-note [data-lock-toggle]');
    if (lockToggle) lockToggle.addEventListener('click', () => { this.craftShowLocked = !this.craftShowLocked; this.refreshCraft(); });
    const search = $('#craft-search');
    if (search) search.addEventListener('change', () => { this.craftQuery = search.value; this.refreshCraft(); });
    const upEl = $('#craft-note .st-up[data-up]');
    if (upEl) upEl.addEventListener('click', () => G.upgradeStation(upEl.dataset.up));
    $$('#craft-list .recipe').forEach(el => {
      const i = +el.dataset.r;
      this.setIcon(el.querySelector('.ric'), Art.itemUrl(RECIPES[i].out));
      el.addEventListener('click', () => G.craft(i));
      el.addEventListener('mouseenter', e => this.showTip(makeItem(RECIPES[i].out, 1, 0), e));
      el.addEventListener('mouseleave', () => this.hideTip());
    });
  },

  /* ---------------- 마을 회관 ---------------- */
  openTownhall() {
    this.closePanel();
    this.panels.show('town'); G.uiOpen = true;
    this.refreshTownhall();
  },
  refreshTownhall() {
    const p = G.player, lv = G.villageLv();
    $('#town-title').textContent = tr('여명 마을 — {v}', { v: VILLAGE[lv] ? VILLAGE[lv].n : '—' });
    let h = '';
    // 단계 수는 VILLAGE 표가 정한다 — 3으로 박아 두면 표에 단계를 더해도 창에 안 뜬다
    for (let i = 1; i <= VILLAGE.length - 1; i++) {
      const v = VILLAGE[i];
      const state = i <= lv ? 'done' : i === lv + 1 ? 'next' : 'far';
      h += `<div class="tv ${state}">` +
        `<div class="tv-head">${tr('<b>{i}단계 · {v}</b>', { i, v: v.n })}` +
        `<span class="tv-tag">${state === 'done' ? tr('완료') : state === 'next' ? tr('다음') : tr('잠김')}</span></div>` +
        `<div class="tv-desc">${v.d}</div>` +
        '<ul class="tv-gain">' + v.gain.map(g => `<li>${g}</li>`).join('') + '</ul>';
      if (state === 'next') {
        const can = p.hasAll(v.need);
        h += `<div class="tv-cost">${tr('필요한 것 — {matLine}', { matLine: this.matLine(p, v.need) })}</div>` +
          `<button class="tv-btn${can ? '' : ' no'}" id="town-up">${tr('이 단계로 올린다')}</button>`;
      }
      h += '</div>';
    }
    h += `<div class="tv-note">${tr('지어 올린 것은 되돌릴 수 없다. 베이스캠프는 이 개선의 대상이 아니다 —')} ` +
      `${tr('엘라라가 거긴 그냥 두라고 했다.')}</div>`;
    $('#town-body').innerHTML = h;
    const b = $('#town-up');
    if (b) b.addEventListener('click', () => { G.upgradeVillage(); this.refreshTownhall(); });
  },

  /* ---------------- 기계 ---------------- */
  openMachine(m) {
    this.closePanel();
    this.machRef = m; this._machSig = null;
    this.panels.show('machine'); G.uiOpen = true;
    this.refreshMachine(true);
  },
  /** id별 개수 묶음을 클릭 가능한 칸으로 */
  bufGrid(buf, cls) {
    let h = '';
    for (const k in buf) {
      if (!buf[k]) continue;
      h += `<div class="slot ${cls}" data-id="${k}"><span class="ic"></span><span class="cnt">${buf[k]}</span></div>`;
    }
    return h || `<div class="mach-empty">${tr('비어 있음')}</div>`;
  },
  /** 창을 다시 짜야 하는 것만 모은 열쇠 — 상태·전력·진행처럼 계속 바뀌는 값은 machLive 가 제자리에서 고친다.
      ★ 0.1초마다 통째로 다시 짜면 누르는 사이에 칸이 바뀌어 클릭이 씹히고 툴팁이 깜빡였다. */
  machSig(m, p) {
    // 개수는 빼고 **무엇이 어느 칸에 있는가**만 — 개수는 machLive 가 고친다(도는 기계는 매 틱 개수가 바뀐다)
    const j = b => b ? Object.keys(b).filter(k => b[k] > 0).join(',') : '';
    const ok = m.in && MACHINE[m.t].proc ? MRECIPES.map(r => r.m === MACHINE[m.t].proc &&
      Object.keys(r.in).every(k => (m.in[k] || 0) >= r.in[k]) ? 1 : 0).join('') : '';
    return [m.t, m.on, m.dir, m.feed, m.f, m.rec, j(m.in), j(m.out), ok, m.it ? m.it.id : '',
      m.items ? m.items.map(it => it ? it.id : '').join(',') : '',
      p.bag.map(it => it ? it.id : '').join(','), m.net].join('|');
  },
  /** 계속 바뀌는 값 — 상태 · 전력망 · 축전 · 연료 · 진행 막대 */
  machLive(m) {
    const s = MACHINE[m.t], w = G.world;
    const st = $('#mach-st');
    if (st) st.innerHTML = `<span class="mdot" style="background:${Factory.statusColor(m)}"></span><b>${Factory.stLabel(m)}</b>` +
      (s.rot ? ` ${tr('· 방향 <b>{dirName}</b>', { dirName: DIR_NAME[m.dir] })}` : '');
    const net = $('#mach-net');
    if (net) {
      const n = m.net >= 0 ? w.nets[m.net] : null;
      if (!n) { net.className = 'mach-row lack'; net.textContent = tr('전력망에 이어져 있지 않다 — 반경 5칸 안에 전주를 세워라.'); }
      else {
        const pct = Math.round(n.sat * 100);
        net.className = 'mach-row';
        net.innerHTML = tr('전력망 #{n} · 발전 <b>{gen}</b> / 수요 <b>{dem}</b>', { n: m.net + 1, gen: n.gen, dem: n.dem }) +
          ` ${tr('· 충족')} <b class="${pct < 100 ? 'lack' : ''}">${pct}%</b>` +
          (n.emax ? ` ${tr('· 축전 <b>{e}</b>/{emax}', { e: Math.round(n.e), emax: n.emax })}` : '') +
          (n.off ? ` · <b class="lack">${tr('정지 스위치 내려짐</b>')}` : '');
      }
    }
    const sto = $('#mach-store');
    if (sto) sto.textContent = tr('축전 잔량 {e} / {store}', { e: Math.round(m.e), store: s.store });
    const fu = $('#mach-fuel');
    if (fu) {
      let left = 0;
      for (const k in m.in) if (FUEL[k]) left += m.in[k] * FUEL[k];
      fu.textContent = tr('연료 — 타는 중 {n}초 · 넣어 둔 연료로 {n2}초 더', { n: (m.fuel * FAC_TICK).toFixed(1), n2: Math.round(left * FAC_TICK) });
    }
    // 개수 — 칸 구성은 같고 수만 바뀐 경우
    for (const [sel, buf] of [['#mg-in', m.in], ['#mg-out', m.out]])
      if (buf) $$(sel + ' .slot').forEach(el => { const c = el.querySelector('.cnt'); if (c) c.textContent = buf[el.dataset.id] || ''; });
    const cnt = (sel, arr) => { const els = $$(sel + ' .slot'); els.forEach(el => { const it = arr[+el.dataset.i]; const c = el.querySelector('.cnt'); if (c && it) c.textContent = it.c > 1 ? it.c : ''; }); };
    if (m.items) cnt('#mg-store', m.items);
    cnt('#mg-bag', G.player.bag);
    const pr = $('#mach-prog');
    if (pr) {
      const r = m.rec >= 0 ? MRECIPES[m.rec] : null;
      const k = r ? clamp(m.prog / r.t, 0, 1) : 0;
      pr.querySelector('i').style.width = (k * 100).toFixed(1) + '%';
      pr.querySelector('span').textContent = r
        ? Object.keys(r.out).map(id => ITEMS[id].n + ' ×' + r.out[id]).join(' · ') + ` ${tr('— {n}% · {n2}초 남음', { n: Math.round(k * 100), n2: ((r.t - m.prog) * FAC_TICK).toFixed(1) })}`
        : tr('만들 것이 없다 — 아래 목록의 재료를 넣어라');
    }
  },
  refreshMachine(force) {
    const m = this.machRef; if (!m) return;
    const s = MACHINE[m.t], w = G.world, p = G.player;
    // 방금 설치한 기계를 바로 열면 아직 전력망 계산 전이라 "망 없음"으로 보인다 — 먼저 갱신
    if (w.netDirty) Factory.buildNets(w);
    const sig = this.machSig(m, p);
    if (!force && sig === this._machSig) { this.machLive(m); return; }
    this._machSig = sig;
    $('#mach-title').textContent = s.n;

    // ---- 상태 줄 ----
    let info = `<div class="mach-desc">${s.d}</div><div class="mach-row" id="mach-st"></div>`;
    if (s.power || s.gen || s.store) {
      info += '<div class="mach-row" id="mach-net"></div>';
      if (s.power) info += `<div class="mach-row dim">${tr('소비 {power}/틱 (1틱 = {facTick}초)', { power: s.power, facTick: FAC_TICK })}</div>`;
      if (s.gen) info += `<div class="mach-row dim">${tr('생산 {gen}/틱', { gen: s.gen })}</div>`;
      if (s.store) info += '<div class="mach-row dim" id="mach-store"></div>';
    }
    if (s.fuelIn) info += '<div class="mach-row dim" id="mach-fuel"></div>';
    if (m.t === 'sorter') {
      info += `<div class="mach-row">${tr('필터: <b>{v}</b>', { v: m.f ? ITEMS[m.f].n : tr('없음 (전부 통과)') })}` +
        ` <span class="dim">${tr('— 맞는 것은 앞으로, 나머지는 시계 방향 옆으로. 아래 가방 칸을 클릭해 지정')}</span></div>`;
    }
    if (s.proc) info += '<div class="mach-prog" id="mach-prog"><i></i><span></span></div>';

    // ---- 버튼 ----
    let btns = `<button class="mbtn" data-act="power">${m.on ? tr('■ 정지') : tr('▶ 가동')}</button>`;
    if (s.rot) btns += `<button class="mbtn" data-act="rot">${tr('↻ 방향 돌리기')}</button>`;
    if (s.slots) btns += `<button class="mbtn" data-act="feed">${m.feed ? tr('배출 끄기') : tr('배출 켜기')}</button>`;
    if (m.t === 'sorter' && m.f) btns += `<button class="mbtn" data-act="clearf">${tr('필터 해제')}</button>`;
    if ((m.out && Factory.bufTotal(m.out)) || (m.items && m.items.some(Boolean)))
      btns += `<button class="mbtn" data-act="takeall">${tr('⤓ 전부 가방으로')}</button>`;

    // ---- 만드는 것 — 이 기계의 제작법. 지금 하는 것은 금색, 재료가 다 들어 있으면 초록 ----
    const ic = id => `<span class="ri" style="background-image:url(${Art.itemUrl(id)})" title="${ITEMS[id].n}"></span>`;
    let recs = '';
    if (s.proc) {
      MRECIPES.forEach((r, i) => {
        if (r.m !== s.proc) return;
        let ok = true;
        for (const k in r.in) if ((m.in[k] || 0) < r.in[k]) { ok = false; break; }
        const side = o => Object.keys(o).map(k => `${ic(k)}<small>${o[k]}</small>`).join('');
        recs += `<div class="mrec${i === m.rec ? ' cur' : ok ? ' ok' : ''}">${side(r.in)}<b>→</b>${side(r.out)}` +
          `${tr('<em>{n}초</em>', { n: (r.t * FAC_TICK).toFixed(1) })}</div>`;
      });
    }

    // ---- 내용물 ----
    let body = '';
    if (s.slots) {
      body += `<div class="mach-sec">${tr('보관')} <small>${tr('(클릭해서 가방으로)')}</small></div><div class="mach-grid" id="mg-store"></div>`;
    } else {
      if (m.in) body += `<div class="mach-sec">${tr('투입')} <small>${tr('(클릭해서 되찾기)')}</small></div><div class="mach-grid" id="mg-in">` + this.bufGrid(m.in, 'mi') + '</div>';
      if (m.out) body += `<div class="mach-sec">${tr('산출')} <small>${tr('(클릭해서 가방으로)')}</small></div><div class="mach-grid" id="mg-out">` + this.bufGrid(m.out, 'mo') + '</div>';
      if (m.it) body += `<div class="mach-sec">${tr('이송 중')} <small>${tr('(3초 넘게 멈춘 물건은 클릭해서 가방으로)')}</small></div><div class="mach-grid">` +
        `<div class="slot" id="mg-it"><span class="ic" style="background-image:url(${Art.itemUrl(m.it.id)})"></span></div></div>`;
    }
    if (recs) body += `<div class="mach-sec">${tr('만드는 것')} <small>${tr('(재료가 다 들어 있으면 초록 · 지금 만드는 것은 금색)')}</small></div><div class="mrecs">${recs}</div>`;
    body += `<div class="mach-sec">${tr('소지품')} <small>(${m.t === 'sorter' ? tr('클릭해서 필터 지정') : tr('클릭해서 기계에 넣기 · 흐린 것은 이 기계가 안 받는다')})</small></div><div class="mach-grid" id="mg-bag"></div>`;

    $('#mach-body').innerHTML = info + '<div class="mach-btns">' + btns + '</div>' + body;
    this.machLive(m);

    // ---- 연결 ----
    /* 누르는 순간 처리한다 — 떼는 사이에 창이 다시 짜이면 click 이 사라진다 */
    const press = (el, fn) => el.addEventListener('mousedown', e => { if (e.button === 0) { e.preventDefault(); fn(); } });
    $$('#mach-body .mbtn').forEach(b => press(b, () => {
      const a = b.dataset.act;
      let snd = 'place';
      if (a === 'power') {
        m.on = m.on ? 0 : 1;
        if (m.t === 'switch') { w.netDirty = true; snd = m.on ? 'power_on' : 'power_off'; }
      }
      else if (a === 'rot') Factory.rotate(m);
      else if (a === 'feed') m.feed = m.feed ? 0 : 1;
      else if (a === 'clearf') m.f = null;
      else if (a === 'takeall') {
        let full = false;
        if (m.out) for (const k of Object.keys(m.out)) if (Factory.playerTake(w, m, 'out', k, p) < 1) full = true;
        if (m.items) m.items.forEach((it, i) => { if (!it) return; if (p.addItem(it)) m.items[i] = null; else full = true; });
        if (full) this.toast(tr('가방이 가득 찼다'), 'bad');
        this.refreshBag();
      }
      G.sfx(snd); this.refreshMachine(true);
    }));
    const itEl = $('#mg-it');
    if (itEl) press(itEl, () => {
      if (Factory.takeStalled(m, p)) { this.refreshMachine(true); this.refreshBag(); G.sfx('place'); }
      else this.toast(Factory.stalled(m) ? tr('가방이 가득 찼다') : tr('움직이는 중이다 — 3초 넘게 멈춘 것만 꺼낼 수 있다'), 'bad');
    });
    const store = $('#mg-store');
    if (store) {
      m.items.forEach((it, i) => {
        const d = makeSlot('slot' + (it ? ' r' + it.r : ''), { data: { i }, fill: it ? { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' } : undefined,
          enter: e => this.showTip(it, e), leave: () => this.hideTip() }, store);
        press(d, () => {
          if (!it) return;
          if (p.addItem(it)) { m.items[i] = null; this.refreshMachine(true); this.refreshBag(); }
          else { this.toast(tr('가방이 가득 찼다'), 'bad'); this.refreshMachine(true); }
        });
      });
    }
    for (const [sel, which] of [['#mg-in', 'in'], ['#mg-out', 'out']]) {
      const host = $(sel); if (!host) continue;
      $$(sel + ' .slot').forEach(el => {
        const id = el.dataset.id;
        this.setIcon(el.querySelector('.ic'), Art.itemUrl(id));
        press(el, () => {
          if (Factory.playerTake(w, m, which, id, p) <= 0) this.toast(tr('가방이 가득 찼다'), 'bad');
          this.refreshMachine(true); this.refreshBag();
        });
        el.addEventListener('mouseenter', e => this.showTip(makeItem(id, 1, 0), e));
        el.addEventListener('mouseleave', () => this.hideTip());
      });
    }
    const bag = $('#mg-bag');
    const order = p.bag.map((it, i) => i).filter(i => p.bag[i]);
    const yes = i => m.t === 'sorter' || Factory.accepts(m, p.bag[i].id);
    order.sort((a2, b2) => (yes(b2) ? 1 : 0) - (yes(a2) ? 1 : 0) || a2 - b2);   // 받는 것을 앞으로
    for (const i of order) {
      const it = p.bag[i];
      const d = makeSlot('slot r' + it.r + (yes(i) ? '' : ' no'), { data: { i }, fill: { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' },
        enter: e => this.showTip(it, e), leave: () => this.hideTip() }, bag);
      press(d, () => {
        if (m.t === 'sorter') { m.f = it.id; this.refreshMachine(true); G.sfx('place'); return; }
        if (Factory.playerInsert(w, m, i, p) > 0) { this.refreshMachine(true); this.refreshBag(); G.sfx('place'); }
        else this.toast(yes(i) ? (m.on ? tr('더 들어갈 자리가 없다') : tr('멈춘 기계에는 넣을 수 없다')) : tr('이 기계가 받지 않는 물건이다'), 'bad');
      });
    }
  },

  /* ---------------- 상자 / 상점 ---------------- */
  openChest(obj) {
    this.closePanel();
    this.chestRef = obj; this.shopRef = null;
    $('#chest-title').textContent = tr('상자');
    this.panels.show('chest'); G.uiOpen = true;
    this.refreshChest();
  },
  openShop(npcId) {
    this.closePanel();
    this.shopRef = npcId; this.chestRef = null; this.shopMode = 'buy';
    let toggle = $('#shop-mode-btn');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'shop-mode-btn'; toggle.className = 'x';
      toggle.style.cssText = 'width:auto;padding:2px 10px;font-size:12px';
      toggle.addEventListener('click', () => { this.shopMode = this.shopMode === 'buy' ? 'sell' : 'buy'; this.refreshChest(); });
      $('#panel-chest header').insertBefore(toggle, $('#panel-chest header .x'));
    }
    toggle.style.display = '';
    toggle.textContent = tr('판매하기 ▸');
    this.panels.show('chest'); G.uiOpen = true;
    this.refreshChest();
  },
  shopTitle() {
    const rate = G.marketRate ? Math.round((G.goldRate || 1) * 100) : 100;
    const arrow = rate > 105 ? ' 📈' : rate < 95 ? ' 📉' : '';
    return tr('{npc}의 상점 — 🪙 {gold} · 환율 {rate}%{arrow}', { npc: NPCS[this.shopRef].n, gold: fmt(G.player.gold), rate, arrow });
  },
  refreshChest() {
    const g = $('#chest-grid'); g.innerHTML = '';
    const toggle = $('#shop-mode-btn');
    if (this.shopRef) {
      if (toggle) { toggle.style.display = ''; toggle.textContent = this.shopMode === 'buy' ? tr('판매하기 ▸') : tr('◂ 구매하기'); }
      if (this.shopMode === 'sell') {
        const p = G.player;
        p.bag.forEach((it, i) => {
          if (!it) return;
          const price = Math.round(G.price(it) * 0.5);
          makeSlot('slot' + (it.r ? ' r' + it.r : ''), { fill: { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' },
            click: () => G.sellItem(i), enter: e => this.showTip(it, e, tr('판매가 🪙 {price}', { price })), leave: () => this.hideTip() }, g);
        });
        $('#chest-title').textContent = this.shopTitle();
        return;
      }
      /* 재고가 날마다 바뀌는 상인(dynamicShop)은 정적 shop 배열 대신 G가 굴려 둔 재고를 읽는다. */
      if (NPCS[this.shopRef].dynamicShop) {
        const npc = this.shopRef, m = G.merchantOf(npc);
        const stock = G.stockOf(npc);
        if (!stock.length) {
          g.innerHTML = `<div class="st-info">${tr('오늘은 다 팔렸다. 내일 다시 오라는군.')}</div>`;
          $('#chest-title').textContent = this.shopTitle();
          return;
        }
        stock.forEach((row, i) => {
          const it = makeItem(row.id, row.c, 0);
          const price = G.buyPrice(it, m.markup);
          makeSlot('slot', { fill: { icon: Art.itemUrl(row.id), count: price, extra: row.c > 1 ? `<span class="num">×${row.c}</span>` : '' },
            click: () => G.buyStock(npc, i), enter: e => this.showTip(it, e, tr('가격 🪙 {price} · 오늘 재고 {row}개', { price, row: row.c })), leave: () => this.hideTip() }, g);
        });
        $('#chest-title').textContent = this.shopTitle();
        return;
      }
      const list = NPCS[this.shopRef].shop || [];
      list.forEach(id => {
        const it = makeItem(id, G.shopBundle(id), 0);
        const price = G.buyPrice(it, 1, this.shopRef);
        makeSlot('slot', { fill: { icon: Art.itemUrl(id), count: price },
          click: () => G.buy(id, this.shopRef), enter: e => this.showTip(it, e, tr('가격 🪙 {price}', { price })), leave: () => this.hideTip() }, g);
      });
      $('#chest-title').textContent = this.shopTitle();
      return;
    }
    if (toggle) toggle.style.display = 'none';
    const c = this.chestRef; if (!c) return;
    (c.items || []).forEach((it, i) => {
      makeSlot('slot' + (it ? ' r' + it.r : ''), { fill: it ? { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' } : undefined,
        click: () => {
          if (!it) return;
          if (G.player.addItem(it)) { c.items[i] = null; G.onPickup(it); this.refreshChest(); this.refreshBag(); }
          else this.toast(tr('가방이 가득 찼다'), 'bad');
        },
        enter: e => this.showTip(it, e), leave: () => this.hideTip() }, g);
    });
  },

  /* ---------------- 여명 마을 시설 ---------------- */

  /** 보관고 — 가방과 별개로 유지되는 60칸 창고. */
  openVault() {
    this.closePanel();
    this.storeRef = null;
    this.panels.show('vault'); G.uiOpen = true;
    this.refreshVault();
  },
  /** 플레이어가 놓은 저장 상자 — 마을 보관고와 같은 두 칸짜리 화면을 그대로 쓴다. */
  openStore(obj) {
    this.closePanel();
    this.storeRef = obj;
    this.panels.show('vault'); G.uiOpen = true;
    this.refreshVault();
  },
  refreshVault() {
    const p = G.player;
    const store = this.storeRef ? this.storeRef.items : G.vault;
    const used = store.filter(Boolean).length;
    const label = this.storeRef ? (this.storeRef.gold ? tr('황금 저장 상자') : tr('저장 상자')) : tr('보관고');
    $('#vault-title').textContent = `${label} — ${used} / ${store.length}`;
    const goldRow = $('#vault-gold-row');
    if (goldRow) {
      goldRow.style.display = this.storeRef ? 'none' : 'flex';   // 마을 금고에만 있다
      $('#vault-gold-amt').textContent = fmt(G.vaultGold);
    }
    const fill = (host, arr, onClick) => {
      host.innerHTML = '';
      arr.forEach((it, i) => makeSlot('slot' + (it ? ' r' + it.r : ''), { fill: it ? { icon: Art.itemUrl(it.id), count: it.c > 1 ? it.c : '' } : undefined,
        click: () => onClick(i), enter: e => this.showTip(it, e), leave: () => this.hideTip() }, host));
    };
    fill($('#vault-grid'), store, i => {
      const it = store[i]; if (!it) return;
      if (p.addItem(it)) { store[i] = null; this.refreshVault(); this.refreshBag(); G.sfx('place'); }
      else this.toast(tr('가방이 가득 찼다'), 'bad');
    });
    fill($('#vault-bag'), p.bag, i => {
      const it = p.bag[i]; if (!it) return;
      const slot = store.indexOf(null);
      if (slot < 0) { this.toast(tr('{label|이} 가득 찼다', { label }), 'bad'); return; }
      store[slot] = it; p.bag[i] = null;
      this.refreshVault(); this.refreshBag(); G.sfx('place');
    });
  },

  /** 의뢰 게시판 — 하루마다 갱신되는 반복 사냥 의뢰 */
  openBoard() {
    this.closePanel();
    if (!G.bounties || !G.bounties.length) G.rollBounties();
    this.panels.show('board'); G.uiOpen = true;
    this.refreshBoard();
  },
  refreshBoard() {
    const b = $('#board-body'); b.innerHTML = '';
    $('#board-title').textContent = tr('의뢰 게시판 — {dayCount}일차', { dayCount: G.dayCount });
    const note = document.createElement('div');
    note.className = 'qt-title';
    note.style.cssText = 'margin-bottom:8px;opacity:.75';
    note.textContent = tr('하루가 지나거나 여관에서 자고 나면 새 종이가 붙는다.');
    b.appendChild(note);
    (G.bounties || []).forEach((q, i) => {
      const pr = G.bountyProgress(q);
      const el = document.createElement('div');
      el.className = 'quest-card' + (q.done ? ' done' : pr.done ? ' ready' : '');
      /* 종이 한 장을 그대로 옮긴다 — 제목 · 본문 · 붙인 사람 · 목표 · 값. */
      const body = (q.done && q.doneLine) ? `<div class="qc-say">${q.doneLine}</div>`
        : (q.body || []).map(l => `<div class="qc-line">${l}</div>`).join('');
      /* 값은 그때그때 센다 — 레벨이 오르면 종이에 적힌 값도 같이 오른다. */
      const pay = G.bountyPay(q);
      el.innerHTML = `<div class="qc-title">${q.title || ''}</div>` + body +
        `<div class="qc-from">— ${q.from || ''}</div>` +
        `<div class="qc-obj">${G.objLabel(q.obj)}` +
        `${q.done ? ` ${tr('· 완료됨')}` : ` <b>${pr.cur} / ${pr.max}</b>`}</div>` +
        `<div class="qc-rw">${tr('보상 🪙 {gold} · 경험치 {xp}', { gold: fmt(pay.gold), xp: fmt(pay.xp) })}` +
        `${(q.items || []).map(([id, n]) => ` · ${ITEMS[id].n}×${n}`).join('')}</div>`;
      if (!q.done && pr.done) {
        const btn = document.createElement('button');
        btn.textContent = tr('떼어 간다');
        btn.addEventListener('click', () => G.claimBounty(i));
        el.appendChild(btn);
      }
      b.appendChild(el);
    });
  },

  /** 재련대 — 금화를 내고 장비 접사를 다시 굴린다 */
  openReforge() {
    this.closePanel();
    this.panels.show('reforge'); G.uiOpen = true;
    this.refreshReforge();
  },
  refreshReforge() {
    $('#reforge-title').textContent = tr('재련대 — 🪙 {gold}', { gold: fmt(G.player.gold) });
    $('#reforge-note').textContent = tr('다시 벼릴 장비를 고르시오. 접사가 새로 붙지만, 더 나빠질 수도 있다.');
    const g = $('#reforge-grid'); g.innerHTML = '';
    G.player.bag.forEach((it, i) => {
      if (!it || !isGear(it)) return;
      const cost = G.reforgeCost(it);
      makeSlot('slot r' + it.r, { fill: { icon: Art.itemUrl(it.id), count: fmt(cost) },
        click: () => G.reforgeSlot(i), enter: e => this.showTip(it, e, tr('재련 비용 🪙 {cost}', { cost: fmt(cost) })), leave: () => this.hideTip() }, g);
    });
    if (!g.children.length) $('#reforge-note').textContent = tr('가방에 다시 벼릴 만한 장비가 없다.');
  },

  /** 강화 모루 — 금화와 재료를 내고 장비 수치를 한 단계 올린다 */
  openAnvil() {
    this.closePanel();
    this.panels.show('anvil'); G.uiOpen = true;
    this.refreshAnvil();
  },
  refreshAnvil() {
    $('#anvil-title').textContent = tr('강화 모루 — 🪙 {gold}', { gold: fmt(G.player.gold) });
    $('#anvil-note').textContent =
      tr('한 단계마다 공격력·방어력이 오른다 (최대 +{ENH_MAX}). +2부터 실패(단계 그대로), +4부터 파괴(한 단계 하락)가 있다.', { ENH_MAX: G.ENH_MAX });
    const g = $('#anvil-grid'); g.innerHTML = '';
    G.player.bag.forEach((it, i) => {
      if (!it || !isGear(it)) return;
      const d = idef(it);
      if (!d.dmg && !d.def) return;                     // 벼릴 수치가 없는 장신구는 뺀다
      const e = it.e || 0, max = e >= G.ENH_MAX;
      const cost = G.enhCost(it), mat = G.enhMat(e);
      const fail = Math.round(G.enhFail(e) * 100), brk = Math.round(G.enhBreak(e) * 100);
      const risk = (fail ? ` ${tr('· 실패 {fail}%', { fail })}` : '') + (brk ? ` ${tr('· 파괴 {brk}%', { brk })}` : '');
      makeSlot('slot r' + it.r + (max ? ' dim' : ''), { fill: { icon: Art.itemUrl(it.id), count: max ? 'MAX' : '+' + (e + 1) },
        click: max ? undefined : () => G.enhanceSlot(i),
        enter: ev => this.showTip(it, ev, max
          ? tr('더 두들길 데가 없다')
          : tr('+{e} → +{n} · 🪙 {cost} · {item} {mat}개', { e, n: e + 1, cost: fmt(cost), item: ITEMS[mat.id].n, mat: mat.n }) + risk),
        leave: () => this.hideTip() }, g);
    });
    if (!g.children.length) $('#anvil-note').textContent = tr('가방에 두들길 만한 장비가 없다.');
  },

  /* 펫 목록 패널은 없다 — 펫이 인벤토리 아이템이라, 가방에서 바로 장비창의 펫 칸으로 끼우면 된다(다른 장비와 똑같은 조작). */

  /* ---------------- 툴팁 ---------------- */
  /** 같은 자리에 차고 있는 장비와 견준 한 줄. */
  compareLine(it) {
    const p = G.player;
    if (!p || !it) return null;
    const d = idef(it);
    let key = null;
    if (d.type === 'weapon') key = 'weapon';
    else if (d.type === 'armor') key = d.slot;
    else if (d.type === 'bag') key = 'bag';
    else if (d.type === 'acc') {
      // 두 칸 중 약한 쪽과 견준다 — 실제로 갈아 끼우게 되는 쪽이 그쪽이다
      const score = q => { if (!q) return -1; const s = itemStats(q); let v = 0; for (const k in s) v += s[k]; return v; };
      key = score(p.equip.acc1) <= score(p.equip.acc2) ? 'acc1' : 'acc2';
    }
    if (!key) return null;
    const cur = p.equip[key];
    if (!cur) return `<div class="tcmp new">${tr('빈 자리에 낄 수 있다')}</div>`;
    if (cur === it) return `<div class="tcmp same">${tr('지금 차고 있는 것')}</div>`;
    const rows = [];
    const push = (label, a, b, unit) => {
      const dv = Math.round((a - b) * 10) / 10;
      if (!dv) return;
      rows.push(`<span class="${dv > 0 ? 'up' : 'down'}">${dv > 0 ? '▲' : '▼'} ${label} ${dv > 0 ? '+' : ''}${dv}${unit || ''}</span>`);
    };
    if (d.dmg || idef(cur).dmg) push(tr('공격력'), Math.round(itemDamage(it)), Math.round(itemDamage(cur)));
    if (d.def || idef(cur).def) push(tr('방어'), Math.round((d.def || 0) * RARITY_MULT[it.r]), Math.round((idef(cur).def || 0) * RARITY_MULT[cur.r]));
    if (d.type === 'bag' && (d.slots || idef(cur).slots)) push(tr('가방 칸'), d.slots || 0, idef(cur).slots || 0);
    const sa = itemStats(it), sb = itemStats(cur);
    const NM = { hp: tr('생명'), mp: tr('마나'), def: tr('방어'), ms: tr('이속'), crit: tr('치명'), critD: tr('치명피해'), cdr: tr('쿨감'), lifesteal: tr('흡혈'), str: tr('힘'), dex: tr('민첩'), int: tr('지능'), vit: tr('체력'), jump: tr('점프'), mpreg: tr('마나재생'), hpreg: tr('생명재생'),
      // 산소통·잠수 장비.
      oxyMax: tr('숨(초)'), oxyReg: tr('숨 회복'), charge: tr('전하') };
    for (const k in NM) {
      const a = sa[k] || 0, b = sb[k] || 0;
      if (a || b) push(NM[k], a, b);
    }
    if (!rows.length) return `<div class="tcmp same">${tr('차고 있는 것과 큰 차이 없다')}</div>`;
    return `<div class="tcmp"><span class="cmp-h">${tr('지금 낀 것과 비교')}</span>${rows.join('')}</div>`;
  },

  showTip(it, e, extra) {
    if (!it) { this.hideTip(); return; }
    const d = idef(it), st = itemStats(it);
    let h = `<div class="thead"><span class="tip-ic" style="background-image:url(${Art.itemUrl(it.id)})"></span>` +
      `<span class="tname c${it.r}">${itemName(it)}</span></div>`;
    const typeName = d.type === 'weapon' ? ({ melee: tr('근접 무기'), ranged: tr('원거리 무기'), magic: tr('마법 무기') })[d.wc]
      : d.type === 'armor' ? tr('방어구') : d.type === 'acc' ? tr('장신구') : d.type === 'tool' ? tr('도구')
        : d.type === 'rod' ? tr('낚싯대') : d.type === 'pet' ? tr('펫') : d.type === 'station' ? tr('설치물')
          : d.type === 'door' ? tr('문')
          : d.type === 'bag' ? tr('가방') : d.type === 'consum' ? tr('소비품') : d.type === 'block' ? tr('설치물')
            : d.type === 'machine' ? tr('기계') : d.type === 'seed' ? (d.fert ? tr('비료') : tr('씨앗'))
              : d.type === 'summon' ? tr('소환') : tr('재료');
    h += `<div class="ttype">${RARITY[it.r]} · ${typeName}</div>`;
    if (d.dmg) {
      h += `<div class="tstat">${tr('공격력 <b>{itemDamage}</b> · 속도 <b>{itemSpeed}/초</b>', { itemDamage: Math.round(itemDamage(it)), itemSpeed: itemSpeed(it).toFixed(2) })}</div>`;
      /* ★ 초당 피해를 같이 적는다. */
      const n = d.multi || 1;
      const one = itemDamage(it) * itemSpeed(it);
      const eff = one * (n > 1 ? 1 + MULTI_FALLOFF * (n - 1) : 1);
      h += `<div class="tstat">${tr('초당 피해 <b>{eff}</b>', { eff: Math.round(eff) })}` +
        (n > 1 ? ` <span class="thint">${tr('(한 몸에 다 맞을 때 · 흩어지면 {n})', { n: Math.round(one * n) })}</span>` : '') +
        `</div>`;
    }
    if (d.def) h += `<div class="tstat">${tr('방어 <b>{n}</b>', { n: Math.round(d.def * enhMul(it)) })}</div>`;
    if (it.e) h += `<div class="tstat">${tr('강화 <b>+{e}</b>', { e: it.e })} <span class="thint">${tr('(공격·방어 +{n}%p)', { n: it.e * 5 })}</span></div>`;
    /* 펫은 레벨이 곧 값어치다 — 패시브가 통째로 커지므로 지금 몇 레벨이고 다음까지 얼마나 남았는지가 한눈에 보여야 한다. */
    if (d.type === 'pet') {
      const lv = it.lv || 1, max = lv >= PET_LV_MAX;
      h += `<div class="tstat">${tr('레벨 <b>{lv}</b> / {petLvMax}', { lv, petLvMax: PET_LV_MAX })}` +
        (max ? ` <span class="thint">${tr('(끝까지 키웠다)')}</span>` : ` <span class="thint">${tr('패시브 ×{petLvMul} · 공격 ×{petAtkMul}', { petLvMul: petLvMul(lv).toFixed(2), petAtkMul: petAtkMul(lv).toFixed(2) })}</span>`) +
        `</div>`;
      if (!max) {
        const need = petXpNext(lv), cur = it.xp || 0;
        h += `<div class="petxp"><i style="width:${Math.round(clamp(cur / need, 0, 1) * 100)}%"></i></div>` +
          `<div class="thint">${tr('다음 레벨까지 {n}', { n: fmt(need - cur) })}</div>`;
      }
    }
    if (d.power) h += `<div class="tstat">${tr('채굴 등급 <b>{power}</b>', { power: d.power })}</div>`;
    if (d.type === 'tool') h += `<div class="tstat">${tr('필요 레벨 <b>Lv.{equipReqLv}</b>', { equipReqLv: equipReqLv(it.id) })}</div>`;
    if (d.pw) h += `<div class="tstat">${tr('전하 소모 <b>{pw}</b> / 사용', { pw: d.pw })}</div>`;
    // 기계는 정보를 MACHINE 표가 들고 있다 — 아이템 쪽에 같은 내용을 또 쓰지 않는다
    if (d.mach) {
      const M = MACHINE[d.mach];
      if (M.power) h += `<div class="tstat">${tr('전력 <b>{power}</b>/틱', { power: M.power })}</div>`;
      if (M.gen) h += `<div class="tstat">${tr('발전 <b>{gen}</b>/틱', { gen: M.gen })}</div>`;
      if (M.store) h += `<div class="tstat">${tr('축전 <b>{store}</b>', { store: M.store })}</div>`;
      if (M.fuelIn) h += `<div class="tstat">${tr('연료를 직접 태운다')}</div>`;
      if (M.mine) h += `<div class="tstat">${tr('채굴 등급 <b>{mine}</b> · 반경 <b>{range}</b>칸', { mine: M.mine, range: M.range })}</div>`;
      h += `<div class="tdesc">"${M.d}"</div>`;
    }
    // 펫 — 고유 자동 공격이 이 펫의 정체성이라 수치를 그대로 보여 준다
    if (d.pet && PETS[d.pet] && PETS[d.pet].atk) {
      const a = PETS[d.pet].atk;
      h += `<div class="tstat">${tr('고유 공격 <b>{v}</b> · 피해 <b>{dmg}</b>', { v: a.k === 'melee' ? tr('물어뜯기') : tr('투사체'), dmg: a.dmg })}` +
        ` ${tr('· {cd}초마다 · 사거리 <b>{n}</b>칸', { cd: a.cd, n: Math.round(a.range / TS) })}</div>`;
      h += `<div class="tstat">${tr('필요 레벨 <b>Lv.{equipReqLv}</b>', { equipReqLv: equipReqLv(it.id) })}</div>`;
    }
    if (d.mana) h += `<div class="tstat">${tr('소모 마나 <b>{mana}</b>', { mana: d.mana })}</div>`;
    if (d.multi) h += `<div class="tstat">${tr('투사체 <b>{multi}발</b>', { multi: d.multi })}</div>`;
    /* 칸 수 표기 — 가방은 "가방이 몇 칸 늘어난다", 저장 상자는 "상자에 몇 칸이 있다"로 뜻이 다르다 — 사연: docs/code-history.md#h99 */
    // 심연용 산소통만 가진 값 — 배수라 위 표(+n)로는 뜻이 안 통한다
    if (st.oxyReg) h += `<div class="taff">${tr('물 밖 숨 회복 {n}배', { n: 1 + st.oxyReg })}</div>`;
    if (d.slots) h += d.type === 'bag'
      ? `<div class="taff">${tr('+{slots} 가방 칸', { slots: d.slots })}</div>`
      : `<div class="taff">${tr('{slots}개 칸', { slots: d.slots })}</div>`;
    const NAME = { hp: tr('최대 생명'), mp: tr('최대 마나'), def: tr('방어'), ms: tr('이동 속도'), crit: tr('치명타'), critD: tr('치명 피해'), cdr: tr('재사용 감소'), lifesteal: tr('흡혈'), jump: tr('추가 점프'), str: tr('힘'), dex: tr('민첩'), int: tr('지능'), vit: tr('체력'), dmgP: tr('피해'), spdP: tr('공격 속도'), fire: tr('화염 부여'), frost: tr('냉기 부여'), mpreg: tr('마나 재생'), hpreg: tr('생명 재생'), magicP: tr('마법 피해'),
      // 산소통·잠수 장비가 늘려 주는 값.
      oxyMax: tr('숨 참는 시간'), charge: tr('전하') };
    for (const k in st) {
      if (!NAME[k] || !st[k]) continue;
      const pct = (k === 'ms' || k === 'crit' || k === 'critD' || k === 'cdr' || k === 'lifesteal' || k === 'mpreg' || k === 'magicP');
      const v = (k === 'dmgP' || k === 'spdP') ? Math.round(st[k] * 100) + '%'
        : k === 'oxyMax' ? st[k] + tr('초') : st[k] + (pct ? '%' : '');
      h += `<div class="taff">${st[k] < 0 ? '' : '+'}${v} ${NAME[k]}</div>`;
    }
    if (d.use) {
      if (d.use.hp) h += `<div class="taff">${tr('생명 {hp} 회복', { hp: d.use.hp })}</div>`;
      if (d.use.mp) h += `<div class="taff">${tr('마나 {mp} 회복', { mp: d.use.mp })}</div>`;
      if (d.use.buff) h += `<div class="taff">${tr('{buff} 효과', { buff: BUFFS[d.use.buff].n })}</div>`;
    }
    /* 같은 자리에 낀 것과 견줘 증감만 보여 준다. */
    const cmp = this.compareLine(it);
    if (cmp) h += cmp;
    if (d.d) h += `<div class="tdesc">"${d.d}"</div>`;
    if (extra) h += `<div class="thint">${extra}</div>`;
    else if (d.type === 'tool') h += `<div class="thint">${tr('핫바에 두고 좌클릭으로 채굴')}</div>`;
    else if (d.type === 'rod') h += `<div class="thint">${tr('핫바에 두고 물 블록에 우클릭 — 입질 중 우클릭하면 즉시 챔질(보너스)')}</div>`;
    else if (d.type === 'pet') h += `<div class="thint">${tr('우클릭으로 펫 칸에 장착 — 두 마리까지 데리고 다닐 수 있다')}</div>`;
    else if (d.type === 'station') h += `<div class="thint">${tr('핫바에 두고 빈 자리에 우클릭해 설치 · 설치한 것은 좌클릭으로 회수(내용물째)')}</div>`;
    else if (d.type === 'door') h += `<div class="thint">${tr('바닥 바로 위 칸에 우클릭 — 위로 두 칸을 쓴다 · <b>바라본 쪽으로 열린다</b> · 좌클릭으로 회수')}</div>`;
    else if (isGear(it)) h += `<div class="thint">${tr('우클릭으로 장착')}</div>`;
    else if (d.type === 'consum' || d.type === 'summon') h += `<div class="thint">${tr('우클릭으로 사용')}</div>`;
    else if (d.type === 'machine') h += `<div class="thint">${tr('우클릭으로 설치 (보는 방향으로) · 설치된 것을 우클릭하면 설정')}</div>`;
    else if (d.type === 'seed') h += `<div class="thint">${d.fert ? tr('자라는 중인 작물에 우클릭') : tr('갈아 둔 밭 위에 우클릭해 심기')}</div>`;
    else if (d.hoe) h += `<div class="thint">${tr('흙이나 풀에 우클릭해 밭 갈기')}</div>`;
    else if (d.scythe) h += `<div class="thint">${tr('다 여문 작물을 좌클릭해 거두기 — 다른 연장으로 치면 아무것도 안 나온다')}</div>`;
    this.tip.show(h, e.clientX, e.clientY);
    this.tipTarget = true;
  },
  placeTip(x, y) { this.tip.place(x, y); },
  hideTip() { this.tip.hide(); this.tipTarget = false; },

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

  /* ---------------- HUD ---------------- */
  updateHUD() {
    const p = G.player, d = p.d;
    $('#hp-fill').style.width = (p.hp / d.maxHp * 100) + '%';
    $('#hp-text').textContent = `${Math.ceil(p.hp)} / ${d.maxHp}`;
    $('#hp-fill').parentElement.classList.toggle('low', p.hp / d.maxHp < 0.3);
    $('#mp-fill').style.width = (p.mp / d.maxMp * 100) + '%';
    $('#mp-text').textContent = `${Math.floor(p.mp)} / ${d.maxMp}`;
    $('#xp-fill').style.width = (p.xp / p.xpNext * 100) + '%';
    $('#xp-text').textContent = `Lv.${p.level}   ${fmt(p.xp)} / ${fmt(p.xpNext)}`;
    // 전하 막대 — 동력 장비를 쓸 때만 나타난다
    const held = p.held(), wp = p.weapon();
    const usesPw = (held && idef(held).pw) || (wp && idef(wp).pw) || p.charge < d.maxCharge;
    $('#hp-fill').closest('.orb-row').classList.toggle('has-pw', !!usesPw);
    if (usesPw) {
      $('#pw-fill').style.width = (p.charge / d.maxCharge * 100) + '%';
      const grid = p.gridT !== undefined && G.time - p.gridT < 0.4;   // 전주 곁에서 망으로 차는 중
      $('#pw-text').textContent = `${grid ? '⚡ ' : ''}${Math.floor(p.charge)} / ${d.maxCharge}`;
    }
    /* 추진기 열 — 제트팩을 낀 동안에만. */
    $('#hp-fill').closest('.orb-row').classList.toggle('has-jet', !!d.jet);
    if (d.jet) {
      const jb = $('#jet-bar');
      // 남은 쪽을 채운다 — 열이 오를수록 줄어든다(체력·마나와 같은 방향으로 읽히게)
      $('#jet-fill').style.width = Math.round((1 - (p.jetHeat || 0)) * 100) + '%';
      jb.classList.toggle('over', !!p.jetOver);
      /* ★ 평상시에는 **숫자만** 쓴다. */
      $('#jet-text').textContent = p.jetOver ? tr('과열 — 식는 중')
        : (p.jetGap > 30 ? tr('한계 높이') : `${Math.round((1 - (p.jetHeat || 0)) * 100)}%`);
    }
    /* 산소 막대 — 물속이거나 아직 덜 찼을 때만 나온다(전하 막대와 같은 방식). */
    const oxy = p.oxygen === undefined ? d.oxyMax : p.oxygen;
    const showAir = p.headUnder || oxy < d.oxyMax - 0.05;
    $('#hp-fill').closest('.orb-row').classList.toggle('has-air', !!showAir);
    if (showAir) {
      const r = oxy / d.oxyMax;
      $('#air-fill').style.width = (r * 100) + '%';
      $('#air-text').textContent = `${Math.ceil(oxy)} / ${d.oxyMax}`;
      $('#air-fill').parentElement.classList.toggle('low', r < 0.3);
    }
    $('#gold-text').innerHTML = `<span class="ui-ic" style="background-image:url(${Art.uiUrl('coin')})"></span>${fmt(p.gold)}`;
    // 발밑 지형이 아니라 세계 공통 기준선(SURF_BASE)에서 잰다 — 발밑 지형 기준이면 어디를 걷든 "발밑에서 몇 칸 떠 있나"만 재서 늘 비슷한 값(예: 항상 5m)이 나오고
    const ty = Math.floor(p.cy / TS);
    const depth = Math.round((ty - SURF_BASE) * 5);
    $('#depth-text').textContent = depth > 0 ? tr('지하 {depth}m', { depth }) : tr('지상 {n}m', { n: -depth });
    const hh = Math.floor(G.dayT / 60), mm = Math.floor(G.dayT % 60);
    $('#clock-text').textContent = `${pad2(hh)}:${pad2(mm)}`;
    $('#clock-icon').textContent = '';
    this.setIcon($('#clock-icon'), Art.uiUrl((hh >= 6 && hh < 19) ? 'sun' : 'moon'));
    // 버프
    const bf = $('#buffs');
    bf.innerHTML = p.buffs.map(b =>
      `<div class="buff" title="${BUFFS[b.id].n}"><span class="bi" style="background-image:url(${Art.buffUrl(b.id)})"></span>` +
      `<span class="bt">${Math.ceil(b.t)}</span></div>`).join('');
    this.refreshSkillbar();
  },

  /* ---------------- 전체 지도 ---------------- */
  initFullmap() {
    const canvas = $('#fullmap-canvas');
    this.fmCanvas = canvas; this.fmC = canvas.getContext('2d');
    this.fmZoom = 3; this.fmX = 0; this.fmY = 0; this.fmDrag = null;
    $('#minimap').addEventListener('click', () => this.openFullmap());

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const wx = this.fmX + (mx - this.fmDprW / 2) / this.fmZoom;
      const wy = this.fmY + (my - this.fmDprH / 2) / this.fmZoom;
      this.fmZoom = clamp(this.fmZoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), 0.4, 16);
      this.fmX = wx - (mx - this.fmDprW / 2) / this.fmZoom;
      this.fmY = wy - (my - this.fmDprH / 2) / this.fmZoom;
      this.renderFullmap();
    }, { passive: false });
    canvas.addEventListener('mousedown', e => {
      this.fmDrag = { x: e.clientX, y: e.clientY, fx: this.fmX, fy: this.fmY };
    });
    addEventListener('mousemove', e => {
      if (!this.fmDrag) return;
      this.fmX = this.fmDrag.fx - (e.clientX - this.fmDrag.x) / this.fmZoom;
      this.fmY = this.fmDrag.fy - (e.clientY - this.fmDrag.y) / this.fmZoom;
      this.renderFullmap();
    });
    addEventListener('mouseup', () => { this.fmDrag = null; });
    addEventListener('resize', () => { if (this.open === 'fullmap') { this.resizeFullmap(); this.renderFullmap(); } });
  },
  openFullmap() {
    const already = this.open === 'fullmap';
    this.togglePanel('fullmap');
    if (already) return;
    const p = G.player;
    this.fmX = p.cx / TS; this.fmY = p.cy / TS; this.fmZoom = 3; this.fmDrag = null;
    this.resizeFullmap();
    this.renderFullmap();
  },
  resizeFullmap() {
    const wrap = $('#fullmap-wrap'), c = this.fmCanvas;
    const w = wrap.clientWidth, h = wrap.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    c.width = w * dpr; c.height = h * dpr;
    this.fmC.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.fmDprW = w; this.fmDprH = h;
  },
  renderFullmap() {
    if (this.open !== 'fullmap' || !this.fmDprW) return;
    const c = this.fmC, W = this.fmDprW, H = this.fmDprH, z = this.fmZoom;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#050609'; c.fillRect(0, 0, W, H);
    const sw = W / z, sh = H / z;
    let sx0 = this.fmX - sw / 2, sy0 = this.fmY - sh / 2;
    // 세계 범위 밖으로 너무 벗어나 헤매지 않게 살짝만 여유를 두고 막는다
    this.fmX = clamp(this.fmX, -sw * 0.4, WW + sw * 0.4);
    this.fmY = clamp(this.fmY, -sh * 0.4, WH + sh * 0.4);
    sx0 = this.fmX - sw / 2; sy0 = this.fmY - sh / 2;
    c.drawImage(G.mapAtlas, sx0, sy0, sw, sh, 0, 0, W, H);
    // 플레이어 위치
    const p = G.player;
    const px = (p.cx / TS - sx0) * z, py = (p.cy / TS - sy0) * z;
    c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(clamp(px, 4, W - 4), clamp(py, 4, H - 4), 4, 0, TAU); c.fill(); c.stroke();
  }
};
bindUI(UI);
