/* ===== ui.js — DOM 인터페이스 ===== */
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const UI = {
  cursor: null,        // 집어든 아이템
  cursorEl: null,

  /** 요소에 스프라이트를 배경으로 넣는다 (이모지 대신) */
  setIcon(el, url) { if (el) el.style.backgroundImage = url ? `url(${url})` : ''; },

  /* 손그림 애셋이 로드되면 코드 생성분 위에 덮어쓴다 */
  npcArt: null,
  applySpriteOverrides() {
    // 손그림 초상화가 실제로 로드된 NPC만 덮어쓴다 — 아직 애셋이 없는 NPC(여명 마을 주민 등)는
    // 매핑하지 않고 두어야 Art.npcUrl()의 절차 생성 초상화로 자연스럽게 폴백된다
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
    if (this.npcArt && this.npcArt[id]) return `assets/npc/portrait_${this.npcArt[id]}.png`;
    return Art.npcUrl(id);
  },
  open: null,          // 열린 패널 id
  chestRef: null, storeRef: null,
  shopRef: null,
  dlg: null,

  init() {
    this.cursorEl = document.createElement('div');
    this.cursorEl.style.cssText = 'position:absolute;width:40px;height:40px;display:none;pointer-events:none;z-index:200;' +
      'background-repeat:no-repeat;background-position:center;background-size:contain;image-rendering:pixelated;' +
      'filter:drop-shadow(0 2px 5px #000c);font-size:11px;color:#fff;text-align:right;line-height:52px';
    document.body.appendChild(this.cursorEl);

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

    const trash = $('#trash-zone');
    if (trash) {
      trash.addEventListener('mousedown', e => {
        e.preventDefault();
        if (this.cursor) this.discardCursor();
        else this.toast('버릴 아이템을 먼저 집으세요 (칸을 클릭)');
      });
      trash.addEventListener('mouseenter', e => { this.tipText('휴지통', '커서에 든 아이템을 버립니다 · Shift+좌클릭으로 칸에서 바로 버리기', e); });
      trash.addEventListener('mouseleave', () => this.hideTip());
    }
    const sortBtn = $('#btn-sort-bag');
    if (sortBtn) {
      sortBtn.addEventListener('click', () => this.sortBag());
      sortBtn.addEventListener('mouseenter', e => this.tipText('가방 정리', '같은 것끼리 합치고 종류·등급 순으로 정렬합니다. 잠근 물건은 자리를 지킵니다.', e));
      sortBtn.addEventListener('mouseleave', () => this.hideTip());
    }
    const depBtn = $('#btn-vault-deposit'), wdBtn = $('#btn-vault-withdraw');
    if (depBtn) depBtn.addEventListener('click', () => this.depositGold());
    if (wdBtn) wdBtn.addEventListener('click', () => this.withdrawGold());
  },
  /* ---------------- 보관고 금화 ----------------
     아이템 칸과 달리 금화는 하나의 총액이라 슬롯이 아니라 넣기/빼기 버튼 두 개와
     프롬프트로 액수를 받는다. 저장 상자(storeRef)에는 안 붙는다 — 마을 금고 전용. */
  depositGold() {
    const p = G.player;
    if (p.gold <= 0) { this.toast('가진 금화가 없다', 'bad'); return; }
    const raw = prompt(`보관고에 넣을 금화 (최대 ${p.gold})`, p.gold);
    if (raw === null) return;
    const amt = Math.floor(+raw);
    if (!amt || amt <= 0 || amt > p.gold) { this.toast('넣을 수 없는 금액이다', 'bad'); return; }
    p.gold -= amt; G.vaultGold += amt;
    this.refreshVault(); G.sfx('coin');
    this.toast(`금화 ${fmt(amt)}개를 보관했다`, 'good');
  },
  withdrawGold() {
    if (G.vaultGold <= 0) { this.toast('보관된 금화가 없다', 'bad'); return; }
    const raw = prompt(`보관고에서 뺄 금화 (최대 ${G.vaultGold})`, G.vaultGold);
    if (raw === null) return;
    const amt = Math.floor(+raw);
    if (!amt || amt <= 0 || amt > G.vaultGold) { this.toast('뺄 수 없는 금액이다', 'bad'); return; }
    G.vaultGold -= amt; G.player.gold += amt;
    this.refreshVault(); G.sfx('coin');
    this.toast(`금화 ${fmt(amt)}개를 꺼냈다`, 'good');
  },
  /* ---------------- 설정 (일시정지 화면) ----------------
     값은 G.settings가 들고 있고, 여기서는 화면과 맞춰 주기만 한다. */
  bindSettings() {
    const num = [['music', 'set-music', '%'], ['sfx', 'set-sfx', '%'], ['shake', 'set-shake', '%']];
    for (const [key, id] of num) {
      const el = $('#' + id); if (!el) continue;
      el.addEventListener('input', () => G.setOpt(key, +el.value));
    }
    for (const [key, id] of [['dmgnum', 'set-dmgnum'], ['minimap', 'set-minimap']]) {
      const el = $('#' + id); if (!el) continue;
      el.addEventListener('change', () => G.setOpt(key, el.checked ? 1 : 0));
    }
    const view = $('#set-view');
    if (view) view.addEventListener('input', () => G.setOpt('view', +view.value));

    this.buildNotices();
    this.buildKeys();

    /* 갈래 전환. 열 때는 늘 첫 갈래(화면·소리)로 돌아간다 — 지난번에 조작 갈래를
       보다 닫았다고 다음에 조작부터 열리면, 소리를 줄이러 온 사람이 헤맨다. */
    const tabs = document.querySelectorAll('.set-tab');
    tabs.forEach(t => t.addEventListener('click', () => this.setTab(t.dataset.tab)));

    const kr = $('#set-keys-reset');
    if (kr) kr.addEventListener('click', () => {
      if (!G.settings) return;
      G.settings.keys = null; G.applySettings(); G.saveSettings();
      this.buildKeys(); this.toast('조작키를 기본값으로 되돌렸다');
    });

    const r = $('#set-reset');
    if (r) r.addEventListener('click', () => {
      G.settings = Object.assign({}, SET_DEFAULT);
      G.applySettings(); G.saveSettings();
      this.buildNotices(); this.buildKeys();
      this.toast('설정을 기본값으로 되돌렸다');
    });
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
  /* 누르면 그 항목이 대기 상태가 되고, 다음에 눌린 키를 그 자리에 넣는다.
     Esc 는 취소로만 쓴다 — 바꿀 수 있게 두면 메뉴를 못 여는 상태를 만들 수 있다. */
  buildKeys() {
    const box = $('#set-keys'); if (!box) return;
    const ARROW = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
    const NAMED = { ShiftLeft: 'Shift(왼)', ShiftRight: 'Shift(오)', ControlLeft: 'Ctrl(왼)',
      ControlRight: 'Ctrl(오)', AltLeft: 'Alt(왼)', AltRight: 'Alt(오)', Space: 'Space' };
    const label = c => ARROW[c] || NAMED[c] || c.replace(/^Key/, '').replace(/^Digit/, '');
    box.innerHTML = KEY_ACTIONS.map(a =>
      `<div class="set-row key"><span>${a.n}</span>` +
      `<button class="keybtn" data-act="${a.id}">${G.keysFor(a.id).map(label).join(' · ')}</button></div>`).join('');
    box.querySelectorAll('.keybtn').forEach(btn => btn.addEventListener('click', () => {
      if (this.keyWait) return;
      btn.classList.add('waiting'); btn.textContent = '키를 누르세요…';
      this.keyWait = { act: btn.dataset.act, btn };
    }));
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
    return true;
  },
  /** G.settings → 화면 (열 때와 값이 바뀔 때마다) */
  syncSettings() {
    this.setTab('disp');                       // 열 때는 늘 첫 갈래부터
    const s = G.settings; if (!s) return;
    const set = (id, v) => { const el = $('#' + id); if (el) el.value = v; };
    const txt = (id, v) => { const el = $('#' + id); if (el) el.textContent = v + '%'; };
    const chk = (id, v) => { const el = $('#' + id); if (el) el.checked = !!v; };
    set('set-music', s.music); txt('set-music-v', s.music);
    set('set-sfx', s.sfx); txt('set-sfx-v', s.sfx);
    set('set-shake', s.shake); txt('set-shake-v', s.shake);
    chk('set-dmgnum', s.dmgnum); chk('set-minimap', s.minimap);
    set('set-view', s.view); txt('set-view-v', s.view);
  },

  /** 아이템이 아닌 순수 텍스트 툴팁(휴지통 안내 등) */
  tipText(title, desc, e) {
    const t = $('#tooltip');
    t.innerHTML = `<div class="tname c0">${title}</div><div class="tdesc">${desc}</div>`;
    t.style.display = 'block'; this.tipTarget = true; this.placeTip(e.clientX, e.clientY);
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
    el.classList.add('open'); this.open = id;
    G.uiOpen = true;
    if (id === 'inv') { this.refreshBag(); this.refreshEquip(); this.refreshStatSheet(); }
    if (id === 'skill') { this.setSkillTab(this.skillTab || 'tree'); this.refreshTree(); this.refreshSkillSlots(); this.refreshProf(); }
    if (id === 'quest') this.refreshQuest();
    if (id === 'craft') this.refreshCraft();
  },
  closePanel() {
    if (this.open) { const el = $('#panel-' + this.open); if (el) el.classList.remove('open'); }
    this.open = null; G.uiOpen = false; this.hideTip();
    if (this.cursor) { G.player.addItem(this.cursor); this.setCursor(null); }
    this.chestRef = null; this.shopRef = null; this.machRef = null; this.storeRef = null;
  },

  /* ---------------- 핫바 ---------------- */
  buildHotbar() {
    const hb = $('#hotbar'); hb.innerHTML = '';
    for (let i = 0; i < HOTBAR; i++) {
      const d = document.createElement('div');
      d.className = 'slot'; d.dataset.bag = i;
      d.innerHTML = `<span class="num">${(i + 1) % 10}</span><span class="ic"></span><span class="cnt"></span>`;
      d.addEventListener('mousedown', e => { e.preventDefault(); G.player.sel = i; this.refreshHotbar(); });
      d.addEventListener('mouseenter', e => this.showTip(G.player.bag[i], e));
      d.addEventListener('mouseleave', () => this.hideTip());
      hb.appendChild(d);
    }
  },
  refreshHotbar() {
    const p = G.player;
    $$('#hotbar .slot').forEach((el, i) => {
      const it = p.bag[i];
      el.className = 'slot' + (i === p.sel ? ' sel' : '') + (it ? ' r' + it.r : '');
      this.setIcon(el.querySelector('.ic'), it ? Art.itemUrl(it.id) : '');
      el.querySelector('.cnt').textContent = it && it.c > 1 ? it.c : '';
    });
  },

  /* ---------------- 가방 ---------------- */
  buildBagSlots() {
    const g = $('#bag-grid'); g.innerHTML = '';
    for (let i = 0; i < MAX_BAG_SIZE; i++) {
      const d = document.createElement('div');
      d.className = 'slot' + (i < HOTBAR ? ' hb-slot' : ''); d.dataset.bag = i;
      d.innerHTML = `<span class="ic"></span><span class="cnt"></span>`;
      d.addEventListener('mousedown', e => { e.preventDefault(); this.bagClick(i, e.button, e.shiftKey, e.ctrlKey || e.metaKey); });
      d.addEventListener('contextmenu', e => e.preventDefault());
      d.addEventListener('mouseenter', e => this.showTip(G.player.bag[i], e));
      d.addEventListener('mouseleave', () => this.hideTip());
      g.appendChild(d);
    }
  },
  refreshBag() {
    // 손그림 스프라이트가 비동기로 도착하면 새 게임 전에도 이 함수가 호출될 수 있다.
    // 그 시점에는 플레이어가 아직 없으므로 UI만 조용히 건너뛴다.
    if (!G.player) return;
    const p = G.player, cap = p.bag.length;
    $$('#bag-grid .slot').forEach((el, i) => {
      if (i >= cap) { el.classList.add('locked'); this.setIcon(el.querySelector('.ic'), ''); el.querySelector('.cnt').textContent = ''; return; }
      const it = p.bag[i];
      el.className = 'slot' + (i < HOTBAR ? ' hb-slot' : '') + (it ? ' r' + it.r : '') + (it && it.lk ? ' is-locked' : '');
      this.setIcon(el.querySelector('.ic'), it ? Art.itemUrl(it.id) : '');
      el.querySelector('.cnt').textContent = it && it.c > 1 ? it.c : '';
    });
    this.refreshHotbar();
  },
  bagClick(i, btn, shift, ctrl) {
    const p = G.player;
    if (i >= p.bag.length) return;         // 아직 열리지 않은 확장 칸
    // Ctrl+좌클릭: 잠금 토글. 잠근 것은 버리기·팔기·정렬이 모두 건너뛴다 —
    // 좋은 물건을 Shift+좌클릭 한 번에 날려 먹는 사고를 막기 위한 자물쇠다
    if (ctrl && btn === 0) {
      const it = p.bag[i]; if (!it) return;
      it.lk = it.lk ? 0 : 1;
      this.toast(it.lk ? `${itemName(it)} 잠금` : `${itemName(it)} 잠금 해제`);
      this.refreshBag(); return;
    }
    if (shift && btn === 0) { this.discardSlot(i); return; }   // Shift+좌클릭: 즉시 버리기
    if (btn === 2) {                      // 우클릭: 사용 / 장착
      if (this.cursor) return;
      const it = p.bag[i]; if (!it) return;
      const d = idef(it);
      if (d.type === 'consum') { G.useConsumable(i); }
      else if (d.type === 'summon') { G.useSummon(i); }
      else if (d.type === 'tool') { this.toast('도구는 핫바에 두고 좌클릭으로 사용한다'); }
      else if (d.type === 'rod') { this.toast('낚싯대는 핫바에 두고 물가에서 우클릭한다'); }
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
    if (it.lk) { this.toast('잠긴 물건이다 (Ctrl+좌클릭으로 해제)', 'bad'); return; }
    this.toast(`버렸다: ${itemName(it)}${it.c > 1 ? ' ×' + it.c : ''}`, 'bad');
    p.bag[i] = null;
    this.refreshBag();
    G.sfx('place');
  },
  /** 가방 정리 — 같은 것끼리 합치고, 종류·등급 순으로 앞에서부터 채운다.
      잠근 물건은 자리를 그대로 지킨다(찾던 자리에 그대로 있어야 잠근 보람이 있다). */
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
    this.toast('가방을 정리했다');
  },
  /** 휴지통에 커서 아이템을 놓으면 전량 삭제 */
  discardCursor() {
    if (!this.cursor) return;
    this.toast(`버렸다: ${itemName(this.cursor)}${this.cursor.c > 1 ? ' ×' + this.cursor.c : ''}`, 'bad');
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
    // 칸마다 비었을 때 깔릴 실루엣. acc1/acc2는 같은 그림을 쓴다
    const SLOT_IC = { weapon: 'weapon', helm: 'helm', chest: 'chest', boots: 'boots', acc1: 'acc', acc2: 'acc', bag: 'bag', pet1: 'pet', pet2: 'pet' };
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
            (d.type === 'bag' && key === 'bag');
          if (!ok) return;
          if (p.level < equipReqLv(this.cursor.id)) { G.toast(`레벨 ${equipReqLv(this.cursor.id)} 필요`, 'bad'); return; }
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
      <h4>기본</h4>
      힘<span class="sv">${d.str}</span><br>민첩<span class="sv">${d.dex}</span><br>
      지능<span class="sv">${d.int}</span><br>체력<span class="sv">${d.vit}</span>
      <h4>전투</h4>
      공격력<span class="sv">${wd}</span><br>
      방어<span class="sv">${d.def}</span><br>
      치명<span class="sv">${d.crit.toFixed(1)}%</span><br>
      치명피해<span class="sv">${Math.round(d.critD)}%</span><br>
      흡혈<span class="sv">${d.lifesteal.toFixed(0)}%</span><br>
      쿨감<span class="sv">${Math.round(d.cdr)}%</span><br>
      이동<span class="sv">${Math.round(d.ms)}</span>`;
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
    const defs = [['str', '힘', '근접 피해'], ['dex', '민첩', '원거리 · 치명'], ['int', '지능', '마법 · 마나'], ['vit', '체력', '생명 · 방어']];
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

  /* ---------------- 특성 트리 ----------------
     v1.1 — 세 분기가 각각 4단×3열의 **판**이 되었다. 예전에는 세로로 늘어놓은
     목록이라 "무엇 다음에 무엇"이 코드에만 있었는데, 이제 잇는 선이 화면에 있다.

     자리 계산은 SKILLS 의 tier(세로) 와 col(가로, 0~2, .5 는 사이) 하나로 끝난다.
     선은 SVG <line> 한 겹이고 x 는 백분율이라 판 너비가 바뀌어도 따라온다. */
  TREE_TOP: 16, TREE_ROW: 94, TREE_BOX: 44,
  _nodeX(id) { return ((SKILLS[id].col + 0.5) / 3 * 100) + '%'; },
  _nodeY(id) { return this.TREE_TOP + SKILLS[id].tier * this.TREE_ROW; },

  buildTree() {
    const w = $('#tree-wrap'); if (!w) return;
    w.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';
    for (const br of BRANCHES) {
      const b = document.createElement('div');
      b.className = 'branch';
      b.style.setProperty('--bc', br.c);
      b.innerHTML = `<h3 style="color:${br.c}">${br.n}</h3><div class="btag">${br.tag}</div>`;

      const grid = document.createElement('div');
      grid.className = 'bgrid';
      const rows = 1 + Math.max(...br.nodes.map(id => SKILLS[id].tier));
      grid.style.height = (this.TREE_TOP + (rows - 1) * this.TREE_ROW + this.TREE_BOX + 36) + 'px';

      // ① 잇는 선 — 노드보다 먼저 넣어야 뒤로 깔린다
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'blines');
      for (const id of br.nodes) for (const rq of (SKILLS[id].req || [])) {
        const ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', this._nodeX(rq)); ln.setAttribute('y1', this._nodeY(rq) + this.TREE_BOX / 2);
        ln.setAttribute('x2', this._nodeX(id)); ln.setAttribute('y2', this._nodeY(id) + this.TREE_BOX / 2);
        ln.setAttribute('class', 'bline');
        ln.dataset.from = rq; ln.dataset.to = id;
        svg.appendChild(ln);
      }
      grid.appendChild(svg);

      // ② 칸
      for (const id of br.nodes) {
        const sk = SKILLS[id];
        const n = document.createElement('div');
        n.className = 'node'; n.dataset.sk = id;
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
      b.appendChild(grid);
      w.appendChild(b);
    }
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

  branchPts(brId) {
    const p = G.player; let n = 0;
    for (const br of BRANCHES) if (br.id === brId) for (const id of br.nodes) n += p.skills[id] || 0;
    return n;
  },
  /** 이어진 윗칸 중 하나라도 배웠는가. 윗칸이 없는 첫 단은 늘 열려 있다 */
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
    if (have < need) return `이 분기에 ${need}포인트 필요 (지금 ${have})`;
    if (!this.reqMet(id)) return '윗단계 ' + sk.req.map(r => SKILLS[r].n).join(' 또는 ') + ' 을(를) 먼저';
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
  /** 칸 위에 올렸을 때의 설명. 지금 랭크와 다음 랭크를 나란히 보여 준다 */
  showSkillTip(id, e) {
    const p = G.player, sk = SKILLS[id], rank = p.skills[id] || 0;
    const why = this.lockReason(id);
    const kind = sk.type === 'active' ? '액티브' : '패시브';
    let h = `<div class="tname c${rank > 0 ? 3 : 0}">${sk.n}</div>`;
    h += `<div class="tmeta">${kind} · ${rank}/${sk.max} 랭크` +
      (sk.type === 'active' ? ` · 마나 ${sk.mana} · 재사용 ${sk.cd}초` : '') + `</div>`;
    h += `<div class="tdesc">${this.skDesc(id, rank)}</div>`;
    if (rank > 0 && rank < sk.max)
      h += `<div class="tnext">다음 랭크 — ${this.skDesc(id, rank + 1)}</div>`;
    if (why) h += `<div class="tbad">${why}</div>`;
    else if (rank >= sk.max) h += `<div class="tdim">최대 랭크</div>`;
    else if (p.skillPts <= 0) h += `<div class="tbad">특성 포인트가 없다</div>`;
    else h += `<div class="tgood">좌클릭으로 습득${sk.type === 'active' ? ' · 우클릭으로 슬롯 등록' : ''}</div>`;
    const t = $('#tooltip');
    t.innerHTML = h; t.style.display = 'block'; this.tipTarget = true;
    this.placeTip(e.clientX, e.clientY);
  },

  refreshTree() {
    const p = G.player;
    $$('#tree-wrap .node').forEach(el => {
      const id = el.dataset.sk, sk = SKILLS[id], rank = p.skills[id] || 0;
      const locked = !!this.lockReason(id);
      const can = !locked && rank < sk.max && p.skillPts > 0;
      el.className = 'node' + (rank > 0 ? ' learned' : '') + (rank >= sk.max ? ' maxed' : '') +
        (locked ? ' locked' : '') + (can ? ' can' : '') + (p.slots.includes(id) ? ' active' : '');
      el.querySelector('.nrank').textContent = `${rank}/${sk.max}`;
    });
    // 선 — 윗칸을 배운 순간부터 길이 열린 것으로 본다
    $$('#tree-wrap .bline').forEach(ln => {
      const a = (p.skills[ln.dataset.from] || 0) > 0, b = (p.skills[ln.dataset.to] || 0) > 0;
      ln.classList.toggle('on', a);
      ln.classList.toggle('full', a && b);
    });
    this.refreshStatAlloc();
  },

  learn(id) {
    const p = G.player, sk = SKILLS[id];
    if (p.skillPts <= 0) { this.toast('특성 포인트가 없다', 'bad'); return; }
    if ((p.skills[id] || 0) >= sk.max) { this.toast('이미 최대 랭크다', 'bad'); return; }
    const why = this.lockReason(id);
    if (why) { this.toast(why, 'bad'); return; }
    p.skillPts--; p.skills[id] = (p.skills[id] || 0) + 1;
    if (sk.type === 'active' && !p.slots.includes(id)) {
      const empty = p.slots.indexOf(null);
      if (empty >= 0) p.slots[empty] = id;
    }
    p.recalc();
    this.toast(`${sk.n} 습득 (${p.skills[id]}/${sk.max})`, 'good');
    G.sfx('learn');
    this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar(); this.refreshStatSheet();
    this.flashNode(id);
  },

  /** 습득 연출 — 찍은 칸이 한 번 부풀고, 그 칸에서 뻗어 나가는 선에 빛이 흐른다.
      CSS 애니메이션이라 클래스를 붙였다가 떼기만 하면 된다(다시 찍으면 다시 돈다). */
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

  /* ---------------- 생활 숙련 ----------------
     같은 팝업의 다른 갈래다. 포인트가 없다 — 밭에서 거두고 물에서 올린 횟수가
     그대로 눈금이 된다. 그래서 여기엔 누를 것이 없고, 지금 어디까지 왔는지와
     다음에 무엇이 열리는지만 보여 준다. */
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
      el.querySelector('.plv').textContent = capped ? `Lv ${PROF_MAX} · 끝` : `Lv ${pr.lv}`;
      el.querySelector('.pbar i').style.width = (capped ? 100 : Math.min(100, pr.xp / need * 100)) + '%';
      el.querySelector('.pxp').textContent = capped ? '더 오를 곳이 없다' : `${pr.xp} / ${need}`;
      el.querySelector('.plin').innerHTML = P.lin
        .map(([n, f]) => `<span class="pl"><b>${f(pr.lv)}</b>${n}</span>`).join('');
      el.querySelector('.pperks').innerHTML = P.perks.map(([at, n, dsc]) =>
        `<div class="perk${pr.lv >= at ? ' on' : ''}"><span class="pk">Lv ${at}</span>` +
        `<span class="pkn">${n}</span><span class="pkd">${dsc}</span></div>`).join('');
    }
  },

  /* ---------------- 퀘스트 ---------------- */
  refreshQuest() {
    const g = G;
    const currentSession = g.chapter >= 9 ? 's2' : 's1';
    const selectedSession = this.questSession || currentSession;
    const sessions = [
      { key: 's1', label: '세션 1', title: '잿빛의 여정', chapters: CHAPTERS.filter(ch => ch.id < 9) },
      // 세션 2도 종장(제 13 장 「벽 너머」)까지 쓰여 끝을 맺었다 — 이제 완료 딱지가 붙는다
      { key: 's2', label: '세션 2', title: '벽 너머', chapters: CHAPTERS.filter(ch => ch.id >= 9) }
    ];
    let h = '<div class="session-tabs">' + sessions.map(s => {
      const isCurrent = s.key === currentSession;
      const isSelected = s.key === selectedSession;
      const done = s.chapters.every(ch => g.chapter > ch.id);
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
        h += `<div class="session-note">전 <b>${totalN}개 장</b>` +
          (clearedN >= totalN ? ' — 전부 지났다.' : ` · <b>${clearedN}개</b> 완료`) +
          `</div>`;
      }
      for (const ch of chapterBlock.chapters) {
        const state = ch.id < g.chapter ? 'done' : ch.id === g.chapter ? 'cur' : 'locked';
        // 세션 2의 sub는 "세션 2 · 제 1 장" 꼴이라, 세션 2 탭 안에서는 앞의 "세션 2 · "가
        // 줄마다 반복돼 군더더기다. 그 접두어만 떼고 장 번호는 살린다 —
        // 예전에는 아예 제목만 남겨서 몇 장인지 알 수 없었다.
        const sub = ch.sub.replace(/^세션\s*\d+\s*·\s*/, '');
        const titleText = `${sub} · ${ch.title}`;
        h += `<div class="chap ${state}"><div class="chap-badge ${state}">${state === 'done' ? '완료' : state === 'cur' ? '진행 중' : '대기'}</div><h3>${titleText}</h3>`;
        if (state !== 'locked') {
          /* 끝낸 장은 도입부와 뒷이야기를 **둘 다** 남긴다. 예전에는 완료 순간 도입부가
             사라져서, 나중에 기록을 펼쳐도 이야기가 중간부터 시작하는 것처럼 끊겼다. */
          const para = t => (t || '').split('\n\n').map(s =>
            `<p>${s.trim().replace(/\n/g, '<br>')}</p>`).join('');
          h += `<div class="cdesc">${para(ch.intro)}`;
          if (state === 'done') {
            h += `<div class="cdesc-sep">그 뒤</div>${para(ch.outro)}`;
            if (ch.hook) h += `<p class="cdesc-hook">◆ ${ch.hook}</p>`;
          }
          h += '</div>';
          if (state === 'cur') for (let i = 0; i < ch.obj.length; i++) {
            const o = ch.obj[i], p = g.objProgress(ch, i);
            h += `<div class="obj ${p.done ? 'ok' : ''}">${p.done ? '✔' : '◆'} ${o.t} <b>${p.cur}/${p.max}</b></div>`;
          }
        } else h += `<div class="cdesc">???</div>`;
        h += '</div>';
      }
      h += '</div>';
    }

    // 의뢰(사이드 퀘스트)
    let sh = '<div class="side-head">의뢰</div>';
    const sideNpcIds = Object.keys(NPCS).filter(k => SIDE_POOL[k]);
    let hasActive = false;
    for (const id of sideNpcIds) {
      const active = G.sideActive[id];
      if (!active) continue;
      hasActive = true;
      const done = G.sideDone[id] || 0;
      const p = G.sideProgress(active);
      sh += `<div class="side-npc"><b>${NPCS[id].n}</b><span class="side-done">완료 ${done}건</span>`;
      sh += `<div class="side-q ${p.done ? 'ok' : ''}">${active.title} — ${active.desc} <b>${p.cur}/${p.max}</b></div>`;
      sh += '</div>';
    }
    if (!hasActive) sh += '<div class="side-q empty">현재 진행 중인 의뢰가 없다.</div>';
    const questBody = $('#quest-body');
    if (questBody) {
      questBody.innerHTML = h + sh;
      this.syncSessionBorder(this.questSession || currentSession, null, currentSession);
      questBody.onclick = ev => {
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
      h += `<div style="color:#c9b07a;margin-bottom:4px">${ch.title}</div>`;
      for (let i = 0; i < ch.obj.length; i++) {
        const o = ch.obj[i], p = G.objProgress(ch, i);
        h += `<div class="qt-obj ${p.done ? 'done' : ''}">${o.t} <b>${p.cur}/${p.max}</b></div>`;
      }
    }
    const activeSide = Object.values(G.sideActive).filter(Boolean);
    if (activeSide.length) h += `<div class="qt-side">의뢰 ${activeSide.length}건 진행 중 (J로 확인)</div>`;
    if (!ch && !activeSide.length) { $('#quest-tracker').style.display = 'none'; return; }
    $('#quest-tracker').style.display = '';
    $('#qt-body').innerHTML = h;
  },

  /* ---------------- 제작 ----------------
     작업대와 용광로가 완전히 갈라졌으므로 탭도 갈라 놓는다. 탭 안에는 그 시설의
     현재 단계와 다음 단계 개조 비용이 함께 붙어, 무엇을 열려면 무엇을 모아야 하는지가
     한 화면에서 읽힌다. */
  craftTab: 'work',
  questSession: 's1',
  craftGroup: 'all',
  craftShowLocked: false,
  craftQuery: '',
  /** 제작품의 쓰임새 기준 분류. 아이템 데이터의 type만으로는 기계와 설치물을 가릴 수 있어 보완한다. */
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
    // H로 열었을 때(tab==='hand') 예전엔 "마지막으로 들렀던 시설" 탭을 기억해 뒀다가
    // 같이 보여줬다 — 그 시설에서 몇 리 떨어져 있어도 탭과 레벨 표시("작업대 Lv.2")가
    // 그대로 남아 있어서 실제로는 아무 시설도 없는데 있는 것처럼 보였다. 이제는 **지금
    // 이 순간 실제로 근처(70px)에 있는 시설만** 같이 보여준다 — 없으면 맨손 탭 하나뿐.
    if (tab !== 'hand' && !near[tab]) tab = this.craftTab = 'hand';
    const allTabs = { work: ['work', `작업대 Lv.${lv.work}`], forge: ['forge', `용광로 Lv.${lv.forge}`], hand: ['hand', '맨손'] };
    const tabs = [];
    if (tab === 'work' || (tab === 'hand' && near.work)) tabs.push(allTabs.work);
    if (tab === 'forge' || (tab === 'hand' && near.forge)) tabs.push(allTabs.forge);
    tabs.push(allTabs.hand);
    let head = '<div class="craft-tabs">' + tabs.map(([k, n]) =>
      `<button class="ctab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('') + '</div>';

    if (tab === 'hand') {
      head += '<div class="st-info">시설 없이 만들 수 있는 것들이다.</div>';
    } else {
      const L = lv[tab];
      head += `<div class="st-info"><b>${STATION_NAME[tab][L]}</b> — ${STATION_DESC[tab][L]}` +
        (near[tab] ? '' : ' <span class="lack">· 시설 앞으로 가야 쓸 수 있다</span>') + '</div>';
      if (L < 3) {
        const up = STATION_UP[tab][L], can = near[tab] && p.hasAll(up.need);
        head += `<div class="st-up${can ? '' : ' no'}" data-up="${tab}">` +
          `<div class="rname">▲ ${STATION_NAME[tab][L + 1]}${josaRo(STATION_NAME[tab][L + 1])} 개조</div>` +
          `<div class="rmat">${this.matLine(p, up.need)}</div></div>`;
      } else {
        head += '<div class="st-up done">더 손볼 데가 없다. 마지막 단계다.</div>';
      }
    }
    // 만들 수 있는 것 → 재료만 모자란 것 → 아직 안 열린 것 순.
    // 기본값은 잠긴 제작법을 감춰 초반에 긴 목록을 한꺼번에 읽지 않게 한다.
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

    const groups = [['all', '전체'], ['gear', '장비'], ['survival', '생존'], ['build', '건축'], ['factory', '자동화'], ['other', '기타']];
    const escapedQuery = this.craftQuery.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    head += `<div class="craft-filter"><input id="craft-search" type="search" value="${escapedQuery}" placeholder="제작품 검색">` +
      groups.map(([key, label]) => `<button class="cg${this.craftGroup === key ? ' on' : ''}" data-cgroup="${key}">${label}</button>`).join('') +
      `<button class="lock-toggle${this.craftShowLocked ? ' on' : ''}" data-lock-toggle>${this.craftShowLocked ? '잠긴 제작법 숨기기' : '잠긴 제작법 보기'}</button>` +
      `<span class="craft-count">${rows.length}개 표시</span></div>`;
    $('#craft-note').innerHTML = head;

    let h = '';
    for (const { i, r, locked, mat } of rows) {
      const d = ITEMS[r.out];
      const ok = !locked && mat && (!r.station || near[r.station]);
      let mats = this.matLine(p, r.need);
      if (locked) mats = `<span class="lack">[${STATION_NAME[tab][r.lv]} 필요]</span> ` + mats;
      h += `<div class="recipe ${ok ? '' : 'no'}" data-r="${i}"><div class="ric"></div><div>` +
        `<div class="rname">${d.n}${r.n > 1 ? ' ×' + r.n : ''}</div><div class="rmat">${mats}</div></div></div>`;
    }
    $('#craft-list').innerHTML = h || '<div class="st-info">여기서 만들 수 있는 것이 아직 없다.</div>';

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

  /* ---------------- 마을 회관 ----------------
     지금 등급이 무엇을 주고 있는지, 다음 등급이 무엇을 더 주는지를 한 화면에 놓는다.
     베이스캠프는 이 체계 바깥이므로 여기 나오지 않는다. */
  openTownhall() {
    this.closePanel();
    $('#panel-town').classList.add('open'); this.open = 'town'; G.uiOpen = true;
    this.refreshTownhall();
  },
  refreshTownhall() {
    const p = G.player, lv = G.villageLv();
    $('#town-title').textContent = `여명 마을 — ${VILLAGE[lv] ? VILLAGE[lv].n : '—'}`;
    let h = '';
    for (let i = 1; i <= 3; i++) {
      const v = VILLAGE[i];
      const state = i <= lv ? 'done' : i === lv + 1 ? 'next' : 'far';
      h += `<div class="tv ${state}">` +
        `<div class="tv-head"><b>${i}단계 · ${v.n}</b>` +
        `<span class="tv-tag">${state === 'done' ? '완료' : state === 'next' ? '다음' : '잠김'}</span></div>` +
        `<div class="tv-desc">${v.d}</div>` +
        '<ul class="tv-gain">' + v.gain.map(g => `<li>${g}</li>`).join('') + '</ul>';
      if (state === 'next') {
        const can = p.hasAll(v.need);
        h += `<div class="tv-cost">필요한 것 — ${this.matLine(p, v.need)}</div>` +
          `<button class="tv-btn${can ? '' : ' no'}" id="town-up">이 단계로 올린다</button>`;
      }
      h += '</div>';
    }
    h += '<div class="tv-note">지어 올린 것은 되돌릴 수 없다. 베이스캠프는 이 개선의 대상이 아니다 — ' +
      '엘라라가 거긴 그냥 두라고 했다.</div>';
    $('#town-body').innerHTML = h;
    const b = $('#town-up');
    if (b) b.addEventListener('click', () => { G.upgradeVillage(); this.refreshTownhall(); });
  },

  /* ---------------- 기계 ----------------
     공장은 8틱/초로 계속 움직이므로, 패널이 열려 있는 동안은 HUD 주기(10Hz)에 맞춰
     다시 그려 준다. 값이 살아 움직이는 게 보여야 어디가 막혔는지 알 수 있다. */
  openMachine(m) {
    this.closePanel();
    this.machRef = m;
    $('#panel-machine').classList.add('open'); this.open = 'machine'; G.uiOpen = true;
    this.refreshMachine();
  },
  /** id별 개수 묶음을 클릭 가능한 칸으로 */
  bufGrid(buf, cls) {
    let h = '';
    for (const k in buf) {
      if (!buf[k]) continue;
      h += `<div class="slot ${cls}" data-id="${k}"><span class="ic"></span><span class="cnt">${buf[k]}</span></div>`;
    }
    return h || '<div class="mach-empty">비어 있음</div>';
  },
  refreshMachine() {
    const m = this.machRef; if (!m) return;
    const s = MACHINE[m.t], w = G.world, p = G.player;
    // 방금 설치한 기계를 바로 열면 아직 전력망 계산 전이라 "망 없음"으로 보인다 — 먼저 갱신
    if (w.netDirty) Factory.buildNets(w);
    $('#mach-title').textContent = s.n;

    // ---- 상태 줄 ----
    let info = `<div class="mach-desc">${s.d}</div>`;
    const dot = Factory.statusColor(m);
    info += `<div class="mach-row"><span class="mdot" style="background:${dot}"></span>` +
      `<b>${m.st || '대기'}</b>`;
    if (s.rot) info += ` · 방향 <b>${DIR_NAME[m.dir]}</b>`;
    info += '</div>';

    if (s.power || s.gen || s.store) {
      const n = m.net >= 0 ? w.nets[m.net] : null;
      if (!n) info += '<div class="mach-row lack">전력망에 이어져 있지 않다 — 반경 5칸 안에 전주를 세워라.</div>';
      else {
        const pct = Math.round(n.sat * 100);
        info += `<div class="mach-row">전력망 #${m.net + 1} · 발전 <b>${n.gen}</b> / 수요 <b>${n.dem}</b>` +
          ` · 충족 <b class="${pct < 100 ? 'lack' : ''}">${pct}%</b>` +
          (n.emax ? ` · 축전 <b>${Math.round(n.e)}</b>/${n.emax}` : '') +
          (n.off ? ' · <b class="lack">정지 스위치 내려짐</b>' : '') + '</div>';
      }
      if (s.power) info += `<div class="mach-row dim">소비 ${s.power}/틱</div>`;
      if (s.gen) info += `<div class="mach-row dim">생산 ${s.gen}/틱</div>`;
      if (s.store) info += `<div class="mach-row dim">축전 잔량 ${Math.round(m.e)} / ${s.store}</div>`;
    }
    if (s.fuelIn) info += `<div class="mach-row dim">연료 잔량 ${m.fuel} 틱</div>`;
    if (m.t === 'sorter') {
      info += `<div class="mach-row">필터: <b>${m.f ? ITEMS[m.f].n : '없음 (전부 통과)'}</b>` +
        ' <span class="dim">— 아래 가방 칸을 클릭해 지정</span></div>';
    }

    // ---- 버튼 ----
    let btns = `<button class="mbtn" data-act="power">${m.on ? '■ 정지' : '▶ 가동'}</button>`;
    if (s.rot) btns += '<button class="mbtn" data-act="rot">↻ 방향 돌리기</button>';
    if (s.slots) btns += `<button class="mbtn" data-act="feed">${m.feed ? '배출 끄기' : '배출 켜기'}</button>`;
    if (m.t === 'sorter' && m.f) btns += '<button class="mbtn" data-act="clearf">필터 해제</button>';

    // ---- 내용물 ----
    let body = '';
    if (s.slots) {
      body += '<div class="mach-sec">보관 <small>(클릭해서 가방으로)</small></div><div class="mach-grid" id="mg-store"></div>';
    } else {
      if (m.in) body += '<div class="mach-sec">투입</div><div class="mach-grid" id="mg-in">' + this.bufGrid(m.in, 'mi') + '</div>';
      if (m.out) body += '<div class="mach-sec">산출 <small>(클릭해서 가방으로)</small></div><div class="mach-grid" id="mg-out">' + this.bufGrid(m.out, 'mo') + '</div>';
      if (m.it) body += '<div class="mach-sec">이송 중</div><div class="mach-grid">' +
        `<div class="slot"><span class="ic" style="background-image:url(${Art.itemUrl(m.it.id)})"></span></div></div>`;
    }
    body += `<div class="mach-sec">소지품 <small>(${m.t === 'sorter' ? '클릭해서 필터 지정' : '클릭해서 기계에 넣기'})</small></div><div class="mach-grid" id="mg-bag"></div>`;

    $('#mach-body').innerHTML = info + '<div class="mach-btns">' + btns + '</div>' + body;

    // ---- 연결 ----
    $$('#mach-body .mbtn').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act;
      let snd = 'place';
      if (a === 'power') {
        m.on = m.on ? 0 : 1;
        if (m.t === 'switch') { w.netDirty = true; snd = m.on ? 'power_on' : 'power_off'; }
      }
      else if (a === 'rot') Factory.rotate(m);
      else if (a === 'feed') m.feed = m.feed ? 0 : 1;
      else if (a === 'clearf') m.f = null;
      G.sfx(snd); this.refreshMachine();
    }));
    const store = $('#mg-store');
    if (store) {
      m.items.forEach((it, i) => {
        const d = document.createElement('div');
        d.className = 'slot' + (it ? ' r' + it.r : '');
        if (it) { d.innerHTML = `<span class="ic"></span><span class="cnt">${it.c > 1 ? it.c : ''}</span>`; this.setIcon(d.querySelector('.ic'), Art.itemUrl(it.id)); }
        d.addEventListener('click', () => {
          if (!it) return;
          if (p.addItem(it)) { m.items[i] = null; this.refreshMachine(); this.refreshBag(); }
          else this.toast('가방이 가득 찼다', 'bad');
        });
        d.addEventListener('mouseenter', e => this.showTip(it, e));
        d.addEventListener('mouseleave', () => this.hideTip());
        store.appendChild(d);
      });
    }
    for (const [sel, which] of [['#mg-in', 'in'], ['#mg-out', 'out']]) {
      const host = $(sel); if (!host) continue;
      $$(sel + ' .slot').forEach(el => {
        const id = el.dataset.id;
        this.setIcon(el.querySelector('.ic'), Art.itemUrl(id));
        el.addEventListener('click', () => {
          Factory.playerTake(w, m, which, id, p);
          this.refreshMachine(); this.refreshBag();
        });
        el.addEventListener('mouseenter', e => this.showTip(makeItem(id, 1, 0), e));
        el.addEventListener('mouseleave', () => this.hideTip());
      });
    }
    const bag = $('#mg-bag');
    p.bag.forEach((it, i) => {
      if (!it) return;
      const d = document.createElement('div');
      d.className = 'slot' + (it ? ' r' + it.r : '');
      d.innerHTML = `<span class="ic"></span><span class="cnt">${it.c > 1 ? it.c : ''}</span>`;
      this.setIcon(d.querySelector('.ic'), Art.itemUrl(it.id));
      d.addEventListener('click', () => {
        if (m.t === 'sorter') { m.f = it.id; this.refreshMachine(); G.sfx('place'); return; }
        if (Factory.playerInsert(w, m, i, p) > 0) { this.refreshMachine(); this.refreshBag(); G.sfx('place'); }
        else this.toast('이 기계가 받지 않는 물건이다', 'bad');
      });
      d.addEventListener('mouseenter', e => this.showTip(it, e));
      d.addEventListener('mouseleave', () => this.hideTip());
      bag.appendChild(d);
    });
  },

  /* ---------------- 상자 / 상점 ---------------- */
  openChest(obj) {
    this.closePanel();
    this.chestRef = obj; this.shopRef = null;
    $('#chest-title').textContent = '상자';
    $('#panel-chest').classList.add('open'); this.open = 'chest'; G.uiOpen = true;
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
    toggle.textContent = '판매하기 ▸';
    $('#panel-chest').classList.add('open'); this.open = 'chest'; G.uiOpen = true;
    this.refreshChest();
  },
  shopTitle() {
    const rate = G.marketRate ? Math.round((G.goldRate || 1) * 100) : 100;
    const arrow = rate > 105 ? ' 📈' : rate < 95 ? ' 📉' : '';
    return `${NPCS[this.shopRef].n}의 상점 — 🪙 ${fmt(G.player.gold)} · 환율 ${rate}%${arrow}`;
  },
  refreshChest() {
    const g = $('#chest-grid'); g.innerHTML = '';
    const toggle = $('#shop-mode-btn');
    if (this.shopRef) {
      if (toggle) { toggle.style.display = ''; toggle.textContent = this.shopMode === 'buy' ? '판매하기 ▸' : '◂ 구매하기'; }
      if (this.shopMode === 'sell') {
        const p = G.player;
        p.bag.forEach((it, i) => {
          if (!it) return;
          const price = Math.round(G.price(it) * 0.5);
          const d = document.createElement('div');
          d.className = 'slot' + (it.r ? ' r' + it.r : '');
          d.innerHTML = `<span class="ic"></span><span class="cnt">${it.c > 1 ? it.c : ''}</span>`;
          this.setIcon(d.querySelector('.ic'), Art.itemUrl(it.id));
          d.addEventListener('click', () => G.sellItem(i));
          d.addEventListener('mouseenter', e => this.showTip(it, e, `판매가 🪙 ${price}`));
          d.addEventListener('mouseleave', () => this.hideTip());
          g.appendChild(d);
        });
        $('#chest-title').textContent = this.shopTitle();
        return;
      }
      const list = NPCS[this.shopRef].shop || [];
      list.forEach(id => {
        const it = makeItem(id, ITEMS[id].stack > 1 ? 5 : 1, 0);
        const price = G.price(it);
        const d = document.createElement('div');
        d.className = 'slot';
        d.innerHTML = `<span class="ic"></span><span class="cnt">${price}</span>`;
        this.setIcon(d.querySelector('.ic'), Art.itemUrl(id));
        d.addEventListener('click', () => G.buy(id));
        d.addEventListener('mouseenter', e => this.showTip(it, e, `가격 🪙 ${price}`));
        d.addEventListener('mouseleave', () => this.hideTip());
        g.appendChild(d);
      });
      $('#chest-title').textContent = this.shopTitle();
      return;
    }
    if (toggle) toggle.style.display = 'none';
    const c = this.chestRef; if (!c) return;
    (c.items || []).forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'slot' + (it ? ' r' + it.r : '');
      if (it) {
        d.innerHTML = `<span class="ic"></span><span class="cnt">${it.c > 1 ? it.c : ''}</span>`;
        this.setIcon(d.querySelector('.ic'), Art.itemUrl(it.id));
      }
      d.addEventListener('click', () => {
        if (!it) return;
        if (G.player.addItem(it)) { c.items[i] = null; G.onPickup(it); this.refreshChest(); this.refreshBag(); }
        else this.toast('가방이 가득 찼다', 'bad');
      });
      d.addEventListener('mouseenter', e => this.showTip(it, e));
      d.addEventListener('mouseleave', () => this.hideTip());
      g.appendChild(d);
    });
  },

  /* ---------------- 여명 마을 시설 ---------------- */

  /** 보관고 — 가방과 별개로 유지되는 60칸 창고. 좌우 클릭 한 번으로 옮긴다 */
  openVault() {
    this.closePanel();
    this.storeRef = null;
    $('#panel-vault').classList.add('open'); this.open = 'vault'; G.uiOpen = true;
    this.refreshVault();
  },
  /** 플레이어가 놓은 저장 상자 — 마을 보관고와 같은 두 칸짜리 화면을 그대로 쓴다.
      넣고 빼는 조작이 이미 여기 다 있어서 새 패널을 만들 이유가 없다. */
  openStore(obj) {
    this.closePanel();
    this.storeRef = obj;
    $('#panel-vault').classList.add('open'); this.open = 'vault'; G.uiOpen = true;
    this.refreshVault();
  },
  refreshVault() {
    const p = G.player;
    const store = this.storeRef ? this.storeRef.items : G.vault;
    const used = store.filter(Boolean).length;
    const label = this.storeRef ? (this.storeRef.gold ? '황금 저장 상자' : '저장 상자') : '보관고';
    $('#vault-title').textContent = `${label} — ${used} / ${store.length}`;
    const goldRow = $('#vault-gold-row');
    if (goldRow) {
      goldRow.style.display = this.storeRef ? 'none' : 'flex';   // 마을 금고에만 있다
      $('#vault-gold-amt').textContent = fmt(G.vaultGold);
    }
    const fill = (host, arr, onClick) => {
      host.innerHTML = '';
      arr.forEach((it, i) => {
        const d = document.createElement('div');
        d.className = 'slot' + (it ? ' r' + it.r : '');
        if (it) {
          d.innerHTML = `<span class="ic"></span><span class="cnt">${it.c > 1 ? it.c : ''}</span>`;
          this.setIcon(d.querySelector('.ic'), Art.itemUrl(it.id));
        }
        d.addEventListener('click', () => onClick(i));
        d.addEventListener('mouseenter', e => this.showTip(it, e));
        d.addEventListener('mouseleave', () => this.hideTip());
        host.appendChild(d);
      });
    };
    fill($('#vault-grid'), store, i => {
      const it = store[i]; if (!it) return;
      if (p.addItem(it)) { store[i] = null; this.refreshVault(); this.refreshBag(); G.sfx('place'); }
      else this.toast('가방이 가득 찼다', 'bad');
    });
    fill($('#vault-bag'), p.bag, i => {
      const it = p.bag[i]; if (!it) return;
      const slot = store.indexOf(null);
      if (slot < 0) { this.toast(`${label}가 가득 찼다`, 'bad'); return; }
      store[slot] = it; p.bag[i] = null;
      this.refreshVault(); this.refreshBag(); G.sfx('place');
    });
  },

  /** 의뢰 게시판 — 하루마다 갱신되는 반복 사냥 의뢰 */
  openBoard() {
    this.closePanel();
    if (!G.bounties || !G.bounties.length) G.rollBounties();
    $('#panel-board').classList.add('open'); this.open = 'board'; G.uiOpen = true;
    this.refreshBoard();
  },
  refreshBoard() {
    const b = $('#board-body'); b.innerHTML = '';
    $('#board-title').textContent = `의뢰 게시판 — ${G.dayCount}일차`;
    const note = document.createElement('div');
    note.className = 'qt-title';
    note.style.cssText = 'margin-bottom:8px;opacity:.75';
    note.textContent = '의뢰는 하루가 지나거나 여관에서 자고 나면 새로 붙는다.';
    b.appendChild(note);
    (G.bounties || []).forEach((q, i) => {
      const pr = G.bountyProgress(q);
      const el = document.createElement('div');
      el.className = 'quest-card' + (q.done ? ' done' : pr.done ? ' ready' : '');
      el.innerHTML = `<div class="qc-title">${ENEMIES[q.target].n} ${q.n}마리</div>` +
        `<div class="qc-obj">${q.done ? '완료됨' : `${pr.cur} / ${pr.max}`}</div>` +
        `<div class="qc-rw">보상 🪙 ${fmt(q.gold)} · 경험치 ${fmt(q.xp)}</div>`;
      if (!q.done && pr.done) {
        const btn = document.createElement('button');
        btn.textContent = '보상 받기';
        btn.addEventListener('click', () => G.claimBounty(i));
        el.appendChild(btn);
      }
      b.appendChild(el);
    });
  },

  /** 재련대 — 금화를 내고 장비 접사를 다시 굴린다 */
  openReforge() {
    this.closePanel();
    $('#panel-reforge').classList.add('open'); this.open = 'reforge'; G.uiOpen = true;
    this.refreshReforge();
  },
  refreshReforge() {
    $('#reforge-title').textContent = `재련대 — 🪙 ${fmt(G.player.gold)}`;
    $('#reforge-note').textContent = '다시 벼릴 장비를 고르시오. 접사가 새로 붙지만, 더 나빠질 수도 있다.';
    const g = $('#reforge-grid'); g.innerHTML = '';
    G.player.bag.forEach((it, i) => {
      if (!it || !isGear(it)) return;
      const cost = G.reforgeCost(it);
      const d = document.createElement('div');
      d.className = 'slot r' + it.r;
      d.innerHTML = `<span class="ic"></span><span class="cnt">${fmt(cost)}</span>`;
      this.setIcon(d.querySelector('.ic'), Art.itemUrl(it.id));
      d.addEventListener('click', () => G.reforgeSlot(i));
      d.addEventListener('mouseenter', e => this.showTip(it, e, `재련 비용 🪙 ${fmt(cost)}`));
      d.addEventListener('mouseleave', () => this.hideTip());
      g.appendChild(d);
    });
    if (!g.children.length) $('#reforge-note').textContent = '가방에 다시 벼릴 만한 장비가 없다.';
  },

  /* 펫 목록 패널은 없앴다 — v1.0.2부터 펫이 인벤토리 아이템이라, 가방에서 바로
     장비창의 펫 칸으로 끼우면 된다(다른 장비와 똑같은 조작). */

  /* ---------------- 툴팁 ---------------- */
  /** 같은 자리에 차고 있는 장비와 견준 한 줄. 비교할 게 없으면 null */
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
    if (!cur) return `<div class="tcmp new">빈 자리에 낄 수 있다</div>`;
    if (cur === it) return `<div class="tcmp same">지금 차고 있는 것</div>`;
    const rows = [];
    const push = (label, a, b, unit) => {
      const dv = Math.round((a - b) * 10) / 10;
      if (!dv) return;
      rows.push(`<span class="${dv > 0 ? 'up' : 'down'}">${dv > 0 ? '▲' : '▼'} ${label} ${dv > 0 ? '+' : ''}${dv}${unit || ''}</span>`);
    };
    if (d.dmg || idef(cur).dmg) push('공격력', Math.round(itemDamage(it)), Math.round(itemDamage(cur)));
    if (d.def || idef(cur).def) push('방어', Math.round((d.def || 0) * RARITY_MULT[it.r]), Math.round((idef(cur).def || 0) * RARITY_MULT[cur.r]));
    if (d.slots || idef(cur).slots) push('가방 칸', d.slots || 0, idef(cur).slots || 0);
    const sa = itemStats(it), sb = itemStats(cur);
    const NM = { hp: '생명', mp: '마나', def: '방어', ms: '이속', crit: '치명', critD: '치명피해', cdr: '쿨감', lifesteal: '흡혈', str: '힘', dex: '민첩', int: '지능', vit: '체력', jump: '점프', mpreg: '마나재생', hpreg: '생명재생' };
    for (const k in NM) {
      const a = sa[k] || 0, b = sb[k] || 0;
      if (a || b) push(NM[k], a, b);
    }
    if (!rows.length) return `<div class="tcmp same">차고 있는 것과 큰 차이 없다</div>`;
    return `<div class="tcmp"><span class="cmp-h">지금 낀 것과 비교</span>${rows.join('')}</div>`;
  },

  showTip(it, e, extra) {
    if (!it) { this.hideTip(); return; }
    const d = idef(it), st = itemStats(it);
    const t = $('#tooltip');
    let h = `<div class="thead"><span class="tip-ic" style="background-image:url(${Art.itemUrl(it.id)})"></span>` +
      `<span class="tname c${it.r}">${itemName(it)}</span></div>`;
    const typeName = d.type === 'weapon' ? ({ melee: '근접 무기', ranged: '원거리 무기', magic: '마법 무기' })[d.wc]
      : d.type === 'armor' ? '방어구' : d.type === 'acc' ? '장신구' : d.type === 'tool' ? '도구'
        : d.type === 'rod' ? '낚싯대' : d.type === 'pet' ? '펫' : d.type === 'station' ? '설치물'
          : d.type === 'bag' ? '가방' : d.type === 'consum' ? '소비품' : d.type === 'block' ? '설치물'
            : d.type === 'machine' ? '기계' : d.type === 'seed' ? (d.fert ? '비료' : '씨앗')
              : d.type === 'summon' ? '소환' : '재료';
    h += `<div class="ttype">${RARITY[it.r]} · ${typeName}</div>`;
    if (d.dmg) h += `<div class="tstat">공격력 <b>${Math.round(itemDamage(it))}</b> · 속도 <b>${itemSpeed(it).toFixed(2)}/초</b></div>`;
    if (d.def) h += `<div class="tstat">방어 <b>${Math.round(d.def * RARITY_MULT[it.r])}</b></div>`;
    if (d.power) h += `<div class="tstat">채굴 등급 <b>${d.power}</b></div>`;
    if (d.type === 'tool') h += `<div class="tstat">필요 레벨 <b>Lv.${equipReqLv(it.id)}</b></div>`;
    if (d.pw) h += `<div class="tstat">전하 소모 <b>${d.pw}</b> / 사용</div>`;
    // 기계는 정보를 MACHINE 표가 들고 있다 — 아이템 쪽에 같은 내용을 또 쓰지 않는다
    if (d.mach) {
      const M = MACHINE[d.mach];
      if (M.power) h += `<div class="tstat">전력 <b>${M.power}</b>/틱</div>`;
      if (M.gen) h += `<div class="tstat">발전 <b>${M.gen}</b>/틱</div>`;
      if (M.store) h += `<div class="tstat">축전 <b>${M.store}</b></div>`;
      if (M.fuelIn) h += `<div class="tstat">연료를 직접 태운다</div>`;
      if (M.mine) h += `<div class="tstat">채굴 등급 <b>${M.mine}</b> · 반경 <b>${M.range}</b>칸</div>`;
      h += `<div class="tdesc">"${M.d}"</div>`;
    }
    // 펫 — 고유 자동 공격이 이 펫의 정체성이라 수치를 그대로 보여 준다
    if (d.pet && PETS[d.pet] && PETS[d.pet].atk) {
      const a = PETS[d.pet].atk;
      h += `<div class="tstat">고유 공격 <b>${a.k === 'melee' ? '물어뜯기' : '투사체'}</b> · 피해 <b>${a.dmg}</b>` +
        ` · ${a.cd}초마다 · 사거리 <b>${Math.round(a.range / TS)}</b>칸</div>`;
      h += `<div class="tstat">필요 레벨 <b>Lv.${equipReqLv(it.id)}</b></div>`;
    }
    if (d.mana) h += `<div class="tstat">소모 마나 <b>${d.mana}</b></div>`;
    if (d.multi) h += `<div class="tstat">투사체 <b>${d.multi}발</b></div>`;
    if (d.slots) h += `<div class="taff">+${d.slots} 가방 칸</div>`;
    const NAME = { hp: '최대 생명', mp: '최대 마나', def: '방어', ms: '이동 속도', crit: '치명타', critD: '치명 피해', cdr: '재사용 감소', lifesteal: '흡혈', jump: '추가 점프', str: '힘', dex: '민첩', int: '지능', vit: '체력', dmgP: '피해', spdP: '공격 속도', fire: '화염 부여', frost: '냉기 부여', mpreg: '마나 재생', hpreg: '생명 재생', magicP: '마법 피해' };
    for (const k in st) {
      if (!NAME[k] || !st[k]) continue;
      const pct = (k === 'ms' || k === 'crit' || k === 'critD' || k === 'cdr' || k === 'lifesteal' || k === 'mpreg' || k === 'magicP');
      const v = (k === 'dmgP' || k === 'spdP') ? Math.round(st[k] * 100) + '%' : st[k] + (pct ? '%' : '');
      h += `<div class="taff">+${v} ${NAME[k]}</div>`;
    }
    if (d.use) {
      if (d.use.hp) h += `<div class="taff">생명 ${d.use.hp} 회복</div>`;
      if (d.use.mp) h += `<div class="taff">마나 ${d.use.mp} 회복</div>`;
      if (d.use.buff) h += `<div class="taff">${BUFFS[d.use.buff].n} 효과</div>`;
    }
    /* 지금 차고 있는 것과의 비교 — 장비가 100종을 넘어가면서 "이게 더 나은가"를
       수치를 외워서 판단해야 하는 상태였다. 같은 자리에 낀 것과 견줘 증감만 보여 준다.
       장신구는 두 칸이라 더 약한 쪽과 견준다(어차피 그쪽을 갈아 끼우게 된다). */
    const cmp = this.compareLine(it);
    if (cmp) h += cmp;
    if (d.d) h += `<div class="tdesc">"${d.d}"</div>`;
    if (extra) h += `<div class="thint">${extra}</div>`;
    else if (d.type === 'tool') h += `<div class="thint">핫바에 두고 좌클릭으로 채굴</div>`;
    else if (d.type === 'rod') h += `<div class="thint">핫바에 두고 물 블록에 우클릭 — 입질 중 우클릭하면 즉시 챔질(보너스)</div>`;
    else if (d.type === 'pet') h += `<div class="thint">우클릭으로 펫 칸에 장착 — 두 마리까지 데리고 다닐 수 있다</div>`;
    else if (d.type === 'station') h += `<div class="thint">핫바에 두고 빈 자리에 우클릭해 설치 · 설치한 것은 좌클릭으로 회수(내용물째)</div>`;
    else if (isGear(it)) h += `<div class="thint">우클릭으로 장착</div>`;
    else if (d.type === 'consum' || d.type === 'summon') h += `<div class="thint">우클릭으로 사용</div>`;
    else if (d.type === 'machine') h += `<div class="thint">우클릭으로 설치 (보는 방향으로) · 설치된 것을 우클릭하면 설정</div>`;
    else if (d.type === 'seed') h += `<div class="thint">${d.fert ? '자라는 중인 작물에 우클릭' : '갈아 둔 밭 위에 우클릭해 심기'}</div>`;
    else if (d.hoe) h += `<div class="thint">흙이나 풀에 우클릭해 밭 갈기</div>`;
    t.innerHTML = h; t.style.display = 'block';
    this.tipTarget = true;
    this.placeTip(e.clientX, e.clientY);
  },
  placeTip(x, y) {
    const t = $('#tooltip');
    let lx = x + 18, ly = y + 14;
    if (lx + 280 > innerWidth) lx = x - 288;
    if (ly + t.offsetHeight > innerHeight) ly = innerHeight - t.offsetHeight - 8;
    t.style.left = lx + 'px'; t.style.top = Math.max(4, ly) + 'px';
  },
  hideTip() { $('#tooltip').style.display = 'none'; this.tipTarget = false; },

  /* ---------------- 대화 ---------------- */
  openDialogue(npcId, lines, choices) {
    const d = NPCS[npcId];
    this.dlg = { npcId, lines: lines.slice(), i: 0, choices };
    $('#dlg-portrait').textContent = '';
    this.setIcon($('#dlg-portrait'), this.npcPortrait(npcId));
    $('#dlg-name').textContent = `${d.n} · ${d.role}`;
    $('#dialogue').classList.add('open');
    G.uiOpen = true;
    this.nextLine(true);
  },
  nextLine(first) {
    if (!this.dlg) return;
    const prevI = this.dlg.i;
    if (!first) this.dlg.i++;
    if (this.dlg.i >= this.dlg.lines.length) { this.showChoices(); return; }
    $('#dlg-text').textContent = this.dlg.lines[this.dlg.i];
    $('#dlg-choices').innerHTML = this.dlg.i >= this.dlg.lines.length - 1 ? '' : '<div class="dlg-next"><span class="dlg-next-ic"></span>클릭하여 계속</div>';
    if (this.dlg.i !== prevI || first) G.sfx('talk');
    if (this.dlg.i >= this.dlg.lines.length - 1) this.showChoices();
  },
  showChoices() {
    const box = $('#dlg-choices'); box.innerHTML = '';
    const cs = this.dlg.choices || [];
    for (const c of cs) {
      const b = document.createElement('button');
      b.className = 'dchoice' + (c.quest ? ' quest' : '');
      b.textContent = c.t;
      b.addEventListener('click', ev => { ev.stopPropagation(); c.fn(); });
      box.appendChild(b);
    }
    const b = document.createElement('button');
    b.className = 'dchoice'; b.textContent = '(대화를 마친다)';
    b.addEventListener('click', ev => { ev.stopPropagation(); this.closeDialogue(); });
    box.appendChild(b);
  },
  closeDialogue() { $('#dialogue').classList.remove('open'); this.dlg = null; G.uiOpen = false; },

  /** 장 도입·마무리 이야기. 대사창을 쓰되 뒤에 장 삽화를 깔아 "읽는 장면"으로 만든다.
      intro/outro는 원래 여정의 기록 패널에만 있어서, 실제로 플레이하는 동안에는
      이야기를 한 줄도 못 보고 지나가는 게 문제였다. */
  storyScene(ch, kind, done) {
    const art = $('#cc-art');
    if (G.spritesOn && ch.art) { art.style.backgroundImage = `url(assets/bg/${ch.art}.png)`; art.classList.add('show', 'story'); }
    const raw = (kind === 'outro' ? ch.outro : ch.intro) || '';
    const lines = raw.split('\n\n').map(s => s.trim()).filter(Boolean);
    // 장을 끝낼 때는 마지막에 "다음이 궁금해지는 한 줄"을 따로 한 장 더 넘긴다
    if (kind === 'outro' && ch.hook) lines.push('◆  ' + ch.hook);
    if (!lines.length) { if (done) done(); return; }
    const label = kind === 'outro' ? `${ch.title} — 그 뒤` : `${ch.sub} · ${ch.title}`;
    this.openLore(label, lines, [{
      t: kind === 'outro' ? '(다음 이야기로)' : '(계속한다)', quest: 1,
      fn: () => { this.closeDialogue(); art.classList.remove('show', 'story'); if (done) done(); }
    }]);
    this._storyArt = true;
  },

  /** NPC가 아닌 화자(석판·문 등)의 대사창 */
  openLore(name, lines, choices) {
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
    if (G.spritesOn && ch.art) { art.style.backgroundImage = `url(assets/bg/${ch.art}.png)`; art.classList.add('show'); }
    else art.classList.remove('show');
    const el = $('#chapter-card');
    el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); art.classList.remove('show'); }, 3800);
  },
  bossBar(e) {
    const el = $('#bossbar');
    if (!e || e.dead) { el.classList.remove('show'); return; }
    el.classList.add('show');
    $('#bb-name').textContent = e.def.n;
    $('#bb-fill').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
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
      $('#pw-text').textContent = `${Math.floor(p.charge)} / ${d.maxCharge}`;
    }
    $('#gold-text').innerHTML = `<span class="ui-ic" style="background-image:url(${Art.uiUrl('coin')})"></span>${fmt(p.gold)}`;
    // 발밑 지형이 아니라 세계 공통 기준선(SURF_BASE)에서 잰다 — 발밑 지형 기준이면
    // 어디를 걷든 "발밑에서 몇 칸 떠 있나"만 재서 늘 비슷한 값(예: 항상 5m)이 나오고,
    // 사막 분지처럼 실제로 낮은 지형으로 이동해도 그 고도 변화가 반영되지 않는다.
    const ty = Math.floor(p.cy / TS);
    const depth = Math.round((ty - SURF_BASE) * 5);
    $('#depth-text').textContent = depth > 0 ? `지하 ${depth}m` : `지상 ${-depth}m`;
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

  /* ---------------- 전체 지도 ----------------
     축소 지도(G.mapAtlas, 타일당 1px)를 확대해서 보여준다. 미니맵을 눌러 연다.
     안개(fog) 판정은 minimap과 같은 원본(explored)을 쓰므로 둘이 항상 일치한다. */
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
