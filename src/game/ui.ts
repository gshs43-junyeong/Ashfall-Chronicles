/* ===== ui.js — DOM 인터페이스 ===== */
import { app as G, bindUI } from './ctx.js';
import { createPanels } from '../engine/ui/panels.js';
import { makeSlot, paintSlot, setIcon } from '../engine/ui/slots.js';
import { createTooltip } from '../engine/ui/tooltip.js';
import { LANG, LANGS, LANG_KEY, LANG_NAMES, fmt, setLang, tr } from './lang.js';
import { KEY_ACTIONS, NOTICE_KINDS } from './data/start.js';
import { SKILLS } from './data/skills.js';
import { NPCS } from './data/npcs.js';
import { SET_DEFAULT, idef } from './data/values.js';
import { Art } from './itemart.js';
import { Sprites } from './sprites.js';
import { HOTBAR, MAX_BAG_SIZE, equipReqLv, isGear, itemDamage, itemName, maxStack } from './entity.js';

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));

export const UI: Bag = {
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
    const num = [['music', 'set-music', '%'], ['sfx', 'set-sfx', '%'], ['shake', 'set-shake', '%'], ['uiscale', 'set-uiscale', '%']];
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
    const ql = $('#set-quality');
    if (ql) ql.addEventListener('change', () => G.setOpt('quality', ql.value));
    const view = $('#set-view');
    if (view) view.addEventListener('input', () => G.setOpt('view', +view.value));
    /* 언어 — 둘 이상 실렸을 때만 보인다. 글·표는 켤 때 정해지므로 게임 중이면 다음에 켤 때부터 */
    const ls = $('#set-lang');
    if (ls && LANGS.length > 1) {
      $('#set-lang-row').hidden = false;
      ls.innerHTML = LANGS.map(l => `<option value="${l}"${l === LANG ? ' selected' : ''}>${LANG_NAMES[l] || l}</option>`).join('');
      ls.addEventListener('change', () => {
        if (G.state === 'play') {
          try { localStorage.setItem(LANG_KEY, ls.value); } catch (e) { }
          this.toast(tr('다음에 켤 때부터 이 언어로 나온다'));
        } else setLang(ls.value);
      });
    }

    this.buildNotices();
    this.buildKeys();

    /* 갈래 전환. */
    const tabs = document.querySelectorAll<HTMLElement>('.set-tab');
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
    document.querySelectorAll<HTMLElement>('.set-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === id));
    document.querySelectorAll<HTMLElement>('.set-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === id));
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
    set('set-quality', s.quality || 'auto');
    set('set-uiscale', s.uiscale || 100); txt('set-uiscale-v', s.uiscale || 100);
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
};
bindUI(UI);
