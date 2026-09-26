/* ===== game/save.js — 저장 · 내보내기 · 세이브 슬롯 · 설정 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { escHtml } from '../util.js';
import { tr } from '../lang.js';
import { WH, WORLD_SIZES, WSIZE, WW } from '../size.js';
import { CHARACTERS, CHAR_OF, ITEMS, MODES, MODE_OF, PETS, SET_DEFAULT } from '../data.js';
import { TS, World, setWorldSize } from '../world.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { TitleBG } from '../titlebg.js';
import { Drop, Player, VAULT_SIZE, makeItem } from '../entity.js';
import { $, UI } from '../ui.js';
import { Ambient, Music, Sfx } from '../music.js';
import { G, NONAME, SAVE_KEY, SAVE_SLOTS, SAVE_VERSION, SET_KEY, SaveStore, TOUCH, saveHead, saveSealOk, saveSign,
  sigKey, slotKey, upgradeSave } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const SavePart = {

  /* ================= 저장 ================= */
  /** 저장이 끝나면 true. */
  async saveGame() {
    if (this.currentSlot === null) return false;   // 타이틀에서 슬롯을 거치지 않고는 저장할 수 없다
    if (this._saving) { this.toast(tr('저장하는 중이다'), 'info'); return false; }
    this._saving = true;
    try {
      const p = this.player;
      const data = {
        v: SAVE_VERSION, name: p.name, savedAt: Date.now(),
        world: this.world.serialize(), chapter: this.chapter, dayT: this.dayT,
        talked: this.talked, crafted: this.crafted,
        talkSeq: this.talkSeq, storyHeard: this.storyHeard, villageSeen: this.villageSeen,
        sideActive: this.sideActive, sideDone: this.sideDone, tabletsRead: this.tabletsRead, termsRead: this.termsRead, loreRead: this.loreRead,
        seenRuins: this.seenRuins, seenBiomes: this.seenBiomes, ruinMarks: this.ruinMarks, ruinEvDone: this.ruinEvDone,
        cipherSeen: this.cipherSeen,        // 어느 유적의 쪽지를 몇 장 읽었나
        deathMark: this.deathMark,
        villageUnlocked: this.villageUnlocked, goldRate: this.goldRate, dayCount: this.dayCount,
        lairs: this.lairs, asmRan: this.asmRan, everPlanted: this.everPlanted,
        vault: this.vault, vaultGold: this.vaultGold, bounties: this.bounties, bountyNext: this.bountyNext,
        shopStock: this.shopStock, shopStockDay: this.shopStockDay,
        achievements: this.achievements, tally: this.tally, survey: this.survey,
        p: {
          x: p.x, y: p.y, level: p.level, xp: p.xp, xpNext: p.xpNext, statPts: p.statPts, skillPts: p.skillPts,
          base: p.base, hp: p.hp, mp: p.mp, charge: p.charge, gold: p.gold, bag: p.bag, equip: p.equip, sel: p.sel,
          charId: p.charId,
          skills: p.skills, slots: p.slots, kills: p.kills, mined: p.mined, bossKilled: p.bossKilled,
          prof: p.prof,
          starOrbits: p.starOrbits, starLit: p.starLit, starFade: p.starFade,
          deepest: p.deepest, highest: p.highest, gathered: p.gathered
        }
      };
      data.sealed = 1;                                 // 서명이 있는 기록이라는 표시
      await SaveStore.put(this.currentSlot, JSON.stringify(data), saveHead(data));
      this.toast(tr('저장했다'), 'good');
      return true;
    } catch (e) {
      this.toast(e && e.name === 'QuotaExceededError' ? tr('저장 실패: 용량 초과') : tr('저장 실패'), 'bad'); console.error(e);
      return false;
    } finally { this._saving = false; }
  },
  /* ================= 저장 내보내기 / 가져오기 ================= */
  /* 파일은 슬롯 번호(0부터)를 열쇠로 본문 글자열을 담는다 — 저장소가 바뀌어도 파일 모양은 그대로다. */
  async exportSaves() {
    try {
      const out = { app: 'ashfall', key: SAVE_KEY, at: new Date().toISOString(), slots: {} };
      let n = 0;
      for (let i = 0; i < SAVE_SLOTS; i++) {
        const rec = await SaveStore.get(i);
        if (rec) { out.slots[i] = rec.raw; n++; }
      }
      const st = localStorage.getItem(SET_KEY);
      if (st) out.settings = st;
      if (!n) { this.toast(tr('내보낼 기록이 없다'), 'bad'); return; }
      const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ashfall-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      this.toast(tr('{n}칸을 파일로 내보냈다', { n }), 'good');
    } catch (e) { this.toast(tr('내보내기 실패'), 'bad'); console.error(e); }
  },
  /** 내보낸 파일을 되돌린다. */
  async importSaves(text) {
    try {
      const d = JSON.parse(text);
      if (!d || d.app !== 'ashfall' || !d.slots) { this.toast(tr('이 게임의 저장 파일이 아니다'), 'bad'); return; }
      if (d.key && d.key !== SAVE_KEY) { this.toast(tr('이전 판의 저장이라 열 수 없다'), 'bad'); return; }
      let n = 0;
      // 되돌린 기록도 이 기계에서 다시 봉인한다 — 안 그러면 봉인된 파일이 안 열린다
      for (const k in d.slots) {
        const i = +k;
        if (!(i >= 0 && i < SAVE_SLOTS) || !d.slots[k]) continue;
        await SaveStore.put(i, d.slots[k], saveHead(JSON.parse(d.slots[k])));
        n++;
      }
      if (d.settings) { localStorage.setItem(SET_KEY, d.settings); this.loadSettings(); UI.syncSettings(); }
      if (!n) { this.toast(tr('파일에 기록이 없다'), 'bad'); return; }
      this.toast(tr('{n}칸을 되돌렸다 — 이어하기에서 고르면 된다', { n }), 'good');
      this.renderSlotScreen();
    } catch (e) { this.toast(tr('저장 파일을 읽지 못했다'), 'bad'); console.error(e); }
  },

  async loadGame(slot) {
    let rec = null;
    try { rec = await SaveStore.get(slot); } catch (e) { console.error(e); }
    if (!rec) { this.toast(tr('저장된 기록이 없다'), 'bad'); return; }
    const raw = rec.raw;
    /* 손댄 기록은 열지 않는다. */
    let head = null;
    try { head = JSON.parse(raw); } catch (e) { }
    if (!saveSealOk(raw, head, rec.sig)) {
      this.toast(tr('이 기록은 저장한 뒤에 바뀌었다 — 열 수 없다'), 'bad');
      return;
    }
    this.currentSlot = slot;
    this.showLoading(tr('기록을 불러오는 중…'));
    setTimeout(() => { try { this._loadGame(raw); } finally { this.hideLoading(); } }, 40);
  },
  _loadGame(raw) {
    try {
      const d = JSON.parse(raw);
      upgradeSave(d);   // 옛 판으로 만든 기록을 지금 판 모양으로 올린다
      // 세계 폭이 바뀐 버전의 기록은 그대로 풀면 지형이 어긋난 채로 열린다 — 아예 막는다
      /* 세계 크기가 다른 판의 기록은 열지 않는다 — 사연: docs/code-history.md#h58 */
      /* 세계 크기(소형·중형·대형)를 **먼저** 맞추고 대조한다 — 크기마다 WW·WH 가 다르다. */
      const prevSize = WSIZE;
      setWorldSize((d.world && d.world.size) || 's');
      if (d.world && ((d.world.ww && d.world.ww !== WW) || (d.world.wh && d.world.wh !== WH))) {
        setWorldSize(prevSize);
        this.toast(tr('이전 크기({ww}×{v})의 세계라 열 수 없다 — 새로 시작해야 한다', { ww: d.world.ww, v: d.world.wh || '?' }), 'bad');
        return;
      }
      this.world = World.deserialize(d.world);
      this.fitMapAtlas();
      this._rigs = null; this._fbg = null;   // 다른 세계를 불러왔다 — 자리·원경 캐시를 버린다
      this.world.placeRigs(true);            // 채취탑이 object 가 되기 전 세이브 — 지금 지면으로 한 번 골라 세운다
      this.rng = new RNG(d.world.seed + '_g');
      const p = new Player(d.p.x, d.p.y);
      p.name = d.name || NONAME;
      Object.assign(p, {
        level: d.p.level, xp: d.p.xp, xpNext: d.p.xpNext, statPts: d.p.statPts, skillPts: d.p.skillPts,
        base: d.p.base, gold: d.p.gold, bag: d.p.bag, equip: d.p.equip, sel: d.p.sel,
        skills: d.p.skills, slots: d.p.slots, kills: d.p.kills, mined: d.p.mined,
        bossKilled: d.p.bossKilled, deepest: d.p.deepest, highest: d.p.highest, gathered: d.p.gathered || {}
      });
      p.charId = CHAR_OF(d.p.charId).id;
      /* 이전 세이브에는 생활 숙련이 없다 — 1레벨로 시작한다. */
      if (d.p.prof) for (const k in p.prof) if (d.p.prof[k]) Object.assign(p.prof[k], d.p.prof[k]);
      /* 별 조각 궤도 — 옛 기록에는 없다. */
      if (d.p.starOrbits === undefined) {
        p.starOrbits = clamp(d.chapter - 1, 0, 5);
        p.starLit = d.chapter > 5 ? 1 : 0;
        p.starFade = d.chapter > 8 ? 1 : 0;
      } else {
        p.starOrbits = d.p.starOrbits || 0; p.starLit = d.p.starLit || 0; p.starFade = d.p.starFade || 0;
      }
      let spent = 0; for (const k in p.skills) spent += p.skills[k] || 0;
      const due = p.level;                     // 1레벨에 1 + 레벨업마다 1
      if (spent + p.skillPts < due) p.skillPts = due - spent;
      // 옛 세이브는 펫이 도감(pets{}/activePet)이었다 — 그때 모은 펫을 잃지 않도록 전부 아이템으로 바꿔 가방에 넣고, 쓰고 있던 펫은 그대로 펫 슬롯에 끼워 준다.
      if (d.p.pets) {
        if (!p.equip.pet1) p.equip.pet1 = null;
        if (!p.equip.pet2) p.equip.pet2 = null;
        for (const id in d.p.pets) {
          if (!PETS[id] || !ITEMS['pet_' + id]) continue;
          const it = makeItem('pet_' + id, 1);
          if (id === d.p.activePet && !p.equip.pet1) p.equip.pet1 = it;
          else if (!p.addItem(it)) this.drops.push(new Drop(p.x, p.y, it));
        }
      }
      p.recalc(); p.hp = d.p.hp; p.mp = d.p.mp;   // recalc()가 가방 용량도 함께 동기화한다
      p.charge = d.p.charge === undefined ? p.d.maxCharge : d.p.charge;
      this.player = p;
      this.chapter = d.chapter; this.dayT = d.dayT;
      this.talked = d.talked || {}; this.crafted = d.crafted || {};
      this.talkSeq = d.talkSeq || {}; this.storyHeard = d.storyHeard || {}; this.villageSeen = d.villageSeen || {};
      this.sideActive = d.sideActive || {}; this.sideDone = d.sideDone || {};
      this.tabletsRead = d.tabletsRead || {}; this.termsRead = d.termsRead || {}; this.loreRead = d.loreRead || {};
      this.seenRuins = d.seenRuins || {};
      this.seenBiomes = d.seenBiomes || {};
      this._bgId = undefined;   // 불러온 자리의 배경을 기준으로 다시 잡는다
      this.ruinMarks = d.ruinMarks || {}; this.ruinEvDone = d.ruinEvDone || {};
      this.cipherSeen = d.cipherSeen || {};
      this.survey = d.survey || {}; this.ruinPulse = {}; this.pendingEcho = null; this.pulseHere = null;
      this.rocks = []; this.quake = null; this.meteor = null; this.meteorRolled = undefined; this.caveHere = 0; this._caveLast = 0;
      this.deathMark = d.deathMark || null;
      this.asmRan = d.asmRan || 0;
      this.everPlanted = d.everPlanted || 0;
      this.mode = MODE_OF(d.mode).id;
      this.villageUnlocked = d.villageUnlocked || false; this.goldRate = d.goldRate || 1;
      this.dayCount = d.dayCount || 0; this.market = {}; this.trainedToday = 0;
      this.nearStObj = { work: null, forge: null };
      this.event = null; this.eventRolled = -1; this.lairs = d.lairs || {};
      this.rainT = 0; this.rainDrops = null; this.smokes = []; this.smokeT = 0;
      this.vault = d.vault || new Array(VAULT_SIZE).fill(null); this.vaultGold = d.vaultGold || 0;
      while (this.vault.length < this.vaultCap()) this.vault.push(null);
      this.bounties = d.bounties || [];
      this.bountyNext = d.bountyNext || [];
      /* 옛 저장에는 "○○ 14마리"만 적힌 종이가 붙어 있다. */
      if (this.bounties.some(b => !b.obj)) this.bounties = [];
      this.shopStock = d.shopStock || {}; this.shopStockDay = d.shopStockDay === undefined ? -1 : d.shopStockDay;
      this.achievements = d.achievements || {};
      this.tally = d.tally || {};
      if (this.villageUnlocked && !this.bounties.length) this.rollBounties();
      this.ents = []; this.corpses = []; this.projs = []; this.parts = []; this.texts = []; this.drops = []; this.pending = []; this.boss = null;
      this.rings = []; this.bolts = []; this.warns = []; this.sigs = []; this.edge = null;
      this.guardCd = 0; this.facTimer = 0; this.cropTimer = 0;   // 새로 시작할 때 남아 있던 대기 시간을 지운다
      // 카메라를 저장된 위치로 바로 맞춘다 — 안 하면 (0,0) 근처에서 훅 팬 되는 게 첫 프레임에 보인다
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      $('#title-screen').style.display = 'none';
    if (typeof TitleBG !== 'undefined') TitleBG.stop();   // 화면 밖이면 프레임을 낭비하지 않는다
      this.closeAllModals();
      this.scenes.go('play'); this.scenes.close('pause');
      this.petEnts = []; this.syncPets();
      UI.refreshBag(); UI.refreshEquip(); UI.refreshTracker(); UI.refreshSkillbar(); UI.refreshStatAlloc(); UI.refreshSkillSlots();
      this.toast(tr('여정을 이어간다'), 'good');
      this.audioInit();
      this.buildMapAtlas();
    } catch (e) { this.toast(tr('불러오기 실패'), 'bad'); console.error(e); }
  },

  /* ================= 세이브 슬롯 ================= */
  /** 그 기록이 남아 있고 슬롯0이 아직 비어 있으면 한 번만 슬롯0으로 옮겨서 기존 진행을 잃지 않게 한다. */
  migrateLegacySave() {
    const legacy = localStorage.getItem(SAVE_KEY);
    if (!legacy || localStorage.getItem(slotKey(0))) return;
    try {
      const d = JSON.parse(legacy);
      d.name = d.name || NONAME;
      d.savedAt = d.savedAt || Date.now();
      d.sealed = 1;
      const text = JSON.stringify(d);
      localStorage.setItem(slotKey(0), text);          // 이어서 SaveStore.start() 가 IndexedDB 로 옮긴다
      localStorage.setItem(sigKey(0), saveSign(text));
      localStorage.removeItem(SAVE_KEY);
    } catch (e) { console.error(e); }
  },
  async deleteSlot(i) {
    if (!confirm(tr('이 세이브를 정말 삭제할까요? 되돌릴 수 없습니다.'))) return;
    try { await SaveStore.remove(i); } catch (e) { this.toast(tr('삭제하지 못했다'), 'bad'); console.error(e); }
    this.renderSlotScreen();
  },
  /** 타이틀 화면의 슬롯 목록을 새로 그린다. */
  async renderSlotScreen() {
    let slots;
    try { slots = await SaveStore.list(); } catch (e) { console.error(e); slots = new Array(SAVE_SLOTS).fill(null); }
    const box = $('#slot-list');
    box.innerHTML = slots.map((s, i) => {
      if (!s) {
        return `<div class="slot-card empty" data-slot="${i}">
          <div class="slot-empty-label">${tr('빈 슬롯')}</div>
          <button class="slot-new-btn" data-slot="${i}"><span class="ui-ic" data-ui-icon="ng_new"></span>${tr('새로운 여정')}</button>
        </div>`;
      }
      const when = s.savedAt ? new Date(s.savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      // 손댄 기록은 목록에서부터 알려 준다 — 눌러 보고 나서야 알면 답답하다
      return `<div class="slot-card filled${s.bad ? ' tampered' : ''}" data-slot="${i}">
        <div class="slot-info">
          <div class="slot-name">${escHtml(s.name === NONAME ? tr(NONAME) : s.name)}</div>
          <div class="slot-meta">${s.bad ? tr('저장한 뒤에 바뀐 기록 — 열 수 없다') : `Lv.${s.level} · ${(WORLD_SIZES[s.size] || WORLD_SIZES.s).n} · ${when}`}</div>
        </div>
        <div class="slot-actions">
          <button class="slot-load-btn" data-slot="${i}"><span class="ui-ic" data-ui-icon="ng_start"></span>${tr('이어하기')}</button>
          <button class="slot-del-btn" data-slot="${i}"><span class="ui-ic" data-ui-icon="trash"></span>${tr('삭제')}</button>
        </div>
      </div>`;
    }).join('');
    this.fillIcons(box);
    box.querySelectorAll('.slot-card.filled').forEach(el => {
      const i = +el.dataset.slot;
      el.addEventListener('click', (e) => { if (!e.target.closest('.slot-del-btn')) this.loadGame(i); });
      el.querySelector('.slot-del-btn').addEventListener('click', (e) => { e.stopPropagation(); this.deleteSlot(i); });
    });
    box.querySelectorAll('.slot-new-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showNewGameForm(+btn.dataset.slot));
    });
  },

  /* ---- 타이틀 팝업 ---- */
  openModal(sel) { $(sel).classList.add('open'); },
  closeModal(sel) { $(sel).classList.remove('open'); },
  /* 팝업은 여러 겹으로 열린다(슬롯 위에 새 게임). */
  MODAL_STACK: ['#code-screen', '#newgame-screen', '#bye-screen', '#credits-screen',
                '#settings-screen', '#slots-screen'],
  /** 열려 있는 팝업 중 가장 위의 것을 닫는다. */
  closeTopModal() {
    for (const sel of this.MODAL_STACK) {
      const el = $(sel);
      if (!el || !el.classList.contains('open')) continue;
      if (sel === '#code-screen') this.closeCodeDoor();   // 딸린 상태까지 같이 푼다
      else el.classList.remove('open');
      return true;
    }
    return false;
  },
  /** 게임에 들어갈 때 — 타이틀에서 열려 있던 팝업을 전부 걷는다 */
  closeAllModals() { this.MODAL_STACK.forEach(sel => { const el = $(sel); if (el) el.classList.remove('open'); }); },
  /** 나가기. */
  quit() {
    try { window.close(); } catch (e) { }
    setTimeout(() => { if (!window.closed) this.openModal('#bye-screen'); }, 120);
  },

  /** 새 게임 팝업 — 캐릭터를 가장 크게 고르고, 난이도·이름·씨앗을 그 아래에서 정한다. */
  /** 새로 그린 HTML 의 data-ui-icon 칸에 그림을 채운다(UI.init 은 처음 한 번만 훑는다) */
  fillIcons(root) {
    if (typeof Art === 'undefined' || !Art.ready) { setTimeout(() => this.fillIcons(root), 200); return; }
    root.querySelectorAll('[data-ui-icon]').forEach(el => UI.setIcon(el, Art.uiUrl(el.dataset.uiIcon)));
  },
  showNewGameForm(slot) {
    const box = $('#newgame-box');
    let ci = 0, mi = 0, sz = 's';
    const kit = ch => {
      const nameOf = id => (ITEMS[id] && ITEMS[id].n) || id;
      const parts = [ch.weapon ? `<b>${escHtml(nameOf(ch.weapon))}</b>` : tr('<b>맨손</b>')];
      (ch.bag || []).forEach(([id, n]) => parts.push(`${escHtml(nameOf(id))} ×${n}`));
      if (ch.gold) parts.push(tr('금화 {gold}', { gold: ch.gold }));
      return parts.join(' · ');
    };
    const sheet = ch => Sprites.url(`assets/char/player_${ch.id}.png`);
    box.innerHTML = `
      <div class="ng-sec"><span class="ui-ic" data-ui-icon="ng_char"></span>${tr('캐릭터')}</div>
      <div class="ng-chars">${CHARACTERS.map((ch, i) => `
        <button class="ng-char${i ? '' : ' on'}" data-i="${i}">
          <span class="por" style="background-image:url(${sheet(ch)})"></span>
          <span>${escHtml(ch.n)}</span>
        </button>`).join('')}</div>
      <div class="ng-detail">
        <span class="por-big" id="ng-por" style="background-image:url(${sheet(CHARACTERS[0])})"></span>
        <div class="ng-body">
          <div class="ng-name" id="ng-name"></div>
          <p class="ng-desc" id="ng-desc"></p>
          <p class="ng-story" id="ng-story"></p>
          <div class="ng-stats" id="ng-stats"></div>
          <p class="ng-kit" id="ng-kit"></p>
        </div>
      </div>

      <div class="ng-sec"><span class="ui-ic" data-ui-icon="ng_mode"></span>${tr('난이도')}</div>
      <div class="ng-modes" id="ng-modes">${MODES.map((m, i) => `
        <button class="ng-mode${i ? '' : ' on'}" data-i="${i}" style="--mc:${m.c}"><span class="ui-ic" data-ui-icon="mode_${m.id}"></span>${escHtml(m.n)}</button>`).join('')}</div>
      <p class="ng-mdesc" id="ng-mdesc">${escHtml(MODES[0].d)}</p>

      <div class="ng-sec"><span class="ui-ic" data-ui-icon="ng_world"></span>${tr('세계 크기')}</div>
      <div class="ng-modes" id="ng-sizes">${Object.keys(WORLD_SIZES).map(k => `
        <button class="ng-mode${k === 's' ? ' on' : ''}" data-k="${k}" style="--mc:#8fb8d8"><span class="ui-ic" data-ui-icon="size_${k}"></span>${escHtml(WORLD_SIZES[k].n)}</button>`).join('')}</div>
      <p class="ng-mdesc" id="ng-sdesc">${escHtml(WORLD_SIZES.s.d)}</p>

      <div class="ng-fields">
        <label><span class="ui-ic" data-ui-icon="ng_name"></span>${tr('이름')}<input class="ng-name-input" placeholder="${tr('이름 없는 모험가')}" maxlength="12"></label>
        <label><span class="ui-ic" data-ui-icon="ng_seed"></span>${tr('세계 씨앗')}<input class="ng-seed-input" placeholder="${tr('비워두면 무작위')}"></label>
      </div>
      <div class="ng-btns">
        <button class="ng-start"><span class="ui-ic" data-ui-icon="ng_start"></span>${tr('시작')}</button>
        <button class="ng-cancel"><span class="ui-ic" data-ui-icon="ng_cancel"></span>${tr('취소')}</button>
      </div>`;
    this.fillIcons(box);

    const paint = () => {
      const ch = CHARACTERS[ci];
      $('#ng-por').style.backgroundImage = `url(${sheet(ch)})`;
      $('#ng-name').textContent = ch.n;
      $('#ng-desc').textContent = ch.d;
      $('#ng-story').textContent = ch.story;
      $('#ng-stats').innerHTML = [[tr('힘'), 'str'], [tr('민첩'), 'dex'], [tr('지능'), 'int'], [tr('체력'), 'vit']]
        .map(([n, k]) => `<span>${n} <b>${ch.base[k]}</b></span>`).join('');
      $('#ng-kit').innerHTML = kit(ch);
    };
    paint();

    box.querySelectorAll('.ng-char').forEach(b => b.onclick = () => {
      ci = +b.dataset.i;
      box.querySelectorAll('.ng-char').forEach(x => x.classList.toggle('on', x === b));
      paint();
    });
    box.querySelectorAll('#ng-modes .ng-mode').forEach(b => b.onclick = () => {
      mi = +b.dataset.i;
      box.querySelectorAll('#ng-modes .ng-mode').forEach(x => x.classList.toggle('on', x === b));
      $('#ng-mdesc').textContent = MODES[mi].d;
    });
    box.querySelectorAll('#ng-sizes .ng-mode').forEach(b => b.onclick = () => {
      sz = b.dataset.k;
      box.querySelectorAll('#ng-sizes .ng-mode').forEach(x => x.classList.toggle('on', x === b));
      $('#ng-sdesc').textContent = WORLD_SIZES[sz].d;
    });
    box.querySelector('.ng-start').onclick = () => {
      const name = box.querySelector('.ng-name-input').value;
      const seed = box.querySelector('.ng-seed-input').value.trim();
      // 되돌릴 수 없는 선택이라 불가능 모드만 한 번 더 묻는다
      if (MODES[mi].id === 'impossible' &&
          !confirm(tr('불가능 모드입니다.\n한 번 죽으면 이 슬롯의 기록이 지워집니다. 시작할까요?'))) return;
      this.closeModal('#newgame-screen');
      this.closeModal('#slots-screen');
      this.newGame(seed, slot, name, CHARACTERS[ci].id, MODES[mi].id, sz);
    };
    box.querySelector('.ng-cancel').onclick = () => this.closeModal('#newgame-screen');
    this.openModal('#newgame-screen');
  },

  /* ================= 설정 ================= */
  loadSettings() {
    let v = {};
    try { v = JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch (e) { }
    this.settings = Object.assign({}, SET_DEFAULT, v);
    /* 낮은 폰 화면은 처음부터 UI 를 작게 — 한 번 고른 값은 그대로 둔다 */
    if (v.uiscale === undefined && TOUCH && Math.min(innerWidth, innerHeight) <= 540) this.settings.uiscale = 80;
    this.applySettings();
  },
  saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(this.settings)); } catch (e) { }
  },
  /** 설정값을 실제 동작에 반영한다. */
  applySettings() {
    const s = this.settings;
    if (Music) Music.vol = s.music / 100;
    if (Sfx) Sfx.vol = s.sfx / 100;
    if (Ambient) Ambient.vol = 0.45 * (s.sfx / 100);
    const mm = $('#minimap'); if (mm) mm.style.display = s.minimap ? '' : 'none';
    /* ★ 퀘스트 추적은 ui.js 가 style.display 를 직접 켜고 끄므로, 숨김은 body 클래스(!important)로 건다 */
    for (const k of ['tabbar', 'quest', 'buffs', 'clock', 'hotbar'])
      document.body.classList.toggle('hide-' + k, !s['hud_' + k]);
    document.documentElement.style.setProperty('--ui-scale', String((s.uiscale || 100) / 100));
    // 시야 배율은 캔버스 변환에 들어가므로 값이 바뀌면 다시 잡아 준다
    const vq = s.view + '/' + this.quality();
    if (this._viewApplied !== vq) { this._viewApplied = vq; this.resize(); }
    UI.syncSettings();
  },
  setOpt(k, v) {
    this.settings[k] = v;
    this.applySettings();
    this.saveSettings();
  },
};
mixin(G, SavePart);
