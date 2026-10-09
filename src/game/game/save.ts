/* ===== game/save.js — 세이브 — 캐릭터 · 세계 · 슬롯 · 내보내기 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { escHtml } from '../util.js';
import { tr } from '../lang.js';
import { WORLD_SIZES, dimsOf } from '../size.js';
import { ITEMS } from '../data/items.js';
import { CHARACTERS, CHAR_OF, MODES, MODE_OF } from '../data/start.js';
import { PETS } from '../data/pets.js';
import { TS, World, setWorldSize } from '../world.js';
import { Sprites } from '../sprites.js';
import { TitleBG } from '../titlebg.js';
import { makeItem } from '../items.js';
import { Drop, Player, VAULT_SIZE } from '../entity.js';
import { $, UI } from '../ui.js';
import { NONAME, SAVE_KEY, SAVE_SLOTS, SAVE_VERSION, SET_KEY, SaveStore, saveHead, saveSealOk, saveSign, sigKey,
  slotKey, upgradeSave } from '../savefmt.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const SavePart: Bag = {

  /* ================= 저장 ================= */
  /** 그 캐릭터의 새 플레이어(시작 장비·가방) — 새 게임과 멀티플레이 새 참가자가 같이 쓴다. */
  freshPlayer(x: number, y: number, name: string, charId: string) {
    const p = new Player(x, y);
    p.name = (name || '').trim().slice(0, 12) || NONAME;
    const ch = CHAR_OF(charId);
    p.charId = ch.id;
    p.base = Object.assign({}, ch.base);
    if (ch.weapon) p.equip.weapon = makeItem(ch.weapon);
    p.equip.chest = makeItem('chest_cloth'); p.equip.boots = makeItem('boots_cloth');
    if (ch.gold) p.gold = ch.gold;
    ch.bag.forEach(([id, n]: [string, number], i: number) => { p.bag[i] = makeItem(id, ITEMS[id].stack! > 1 ? n : 1); });
    p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
    return p;
  },
  /** 캐릭터 몫(레벨·가방·장비·스킬·통계…) — 세계와 떼어 들고 다닐 수 있는 덩어리. 멀티플레이 참가자는 이것만 들고 남의 세계에 들어간다. */
  packChar(p: Player) {
    return {
      x: p.x, y: p.y, level: p.level, xp: p.xp, xpNext: p.xpNext, statPts: p.statPts, skillPts: p.skillPts,
      base: p.base, hp: p.hp, mp: p.mp, charge: p.charge, gold: p.gold, bag: p.bag, equip: p.equip, sel: p.sel,
      charId: p.charId,
      skills: p.skills, slots: p.slots, kills: p.kills, mined: p.mined, bossKilled: p.bossKilled,
      prof: p.prof,
      starOrbits: p.starOrbits, starLit: p.starLit, starFade: p.starFade,
      deepest: p.deepest, highest: p.highest, gathered: p.gathered
    };
  },
  /** packChar 로 만든 덩어리에서 플레이어를 되살린다 — chapter 는 옛 기록(별 조각 궤도 없음)을 채울 때만 쓴다. */
  unpackChar(c: any, name: string, chapter: any) {
    const p = new Player(c.x, c.y);
    p.name = name || NONAME;
    Object.assign(p, {
      level: c.level, xp: c.xp, xpNext: c.xpNext, statPts: c.statPts, skillPts: c.skillPts,
      base: c.base, gold: c.gold, bag: c.bag, equip: c.equip, sel: c.sel,
      skills: c.skills, slots: c.slots, kills: c.kills, mined: c.mined,
      bossKilled: c.bossKilled, deepest: c.deepest, highest: c.highest, gathered: c.gathered || {}
    });
    p.charId = CHAR_OF(c.charId).id;
    /* 이전 세이브에는 생활 숙련이 없다 — 1레벨로 시작한다. */
    if (c.prof) for (const k in p.prof) if (c.prof[k]) Object.assign(p.prof[k], c.prof[k]);
    /* 별 조각 궤도 — 옛 기록에는 없다. */
    if (c.starOrbits === undefined) {
      p.starOrbits = clamp(chapter - 1, 0, 5);
      p.starLit = chapter > 5 ? 1 : 0;
      p.starFade = chapter > 8 ? 1 : 0;
    } else {
      p.starOrbits = c.starOrbits || 0; p.starLit = c.starLit || 0; p.starFade = c.starFade || 0;
    }
    let spent = 0; for (const k in p.skills) spent += p.skills[k] || 0;
    const due = p.level;                     // 1레벨에 1 + 레벨업마다 1
    if (spent + p.skillPts < due) p.skillPts = due - spent;
    // 옛 세이브는 펫이 도감(pets{}/activePet)이었다 — 그때 모은 펫을 잃지 않도록 전부 아이템으로 바꿔 가방에 넣고, 쓰고 있던 펫은 그대로 펫 슬롯에 끼워 준다.
    if (c.pets) {
      if (!p.equip.pet1) p.equip.pet1 = null;
      if (!p.equip.pet2) p.equip.pet2 = null;
      for (const id in c.pets) {
        if (!PETS[id] || !ITEMS['pet_' + id]) continue;
        const it = makeItem('pet_' + id, 1);
        if (id === c.activePet && !p.equip.pet1) p.equip.pet1 = it;
        else if (!p.addItem(it!)) this.drops.push(new Drop(p.x, p.y, it!));
      }
    }
    p.recalc(); p.hp = c.hp; p.mp = c.mp;   // recalc()가 가방 용량도 함께 동기화한다
    p.charge = c.charge === undefined ? p.d.maxCharge : c.charge;
    return p;
  },
  /** 저장이 끝나면 true. */
  async saveGame(quiet?: boolean) {
    if (this.net && this.net.role === 'guest') return this.netSaveChar(this.net, true);   // 남의 세계 — 캐릭터만
    if (this.currentSlot === null) return false;   // 타이틀에서 슬롯을 거치지 않고는 저장할 수 없다
    if (this._saving) { this.toast(tr('저장하는 중이다'), 'info'); return false; }
    this._saving = true; this._saveSeq = (this._saveSeq || 0) + 1;   // 손님 기록만 적는 netGuestPersist 가 이 저장을 덮지 않게
    try {
      const data = this.saveData();
      data.sealed = 1;                                 // 서명이 있는 기록이라는 표시
      await SaveStore.put(this.currentSlot, JSON.stringify(data), saveHead(data));
      if (!quiet) this.toast(tr('저장했다'), 'good');
      if (this.autosave) this.autosave.reset();
      return true;
    } catch (e) {
      this.toast(e && (e as Error).name === 'QuotaExceededError' ? tr('저장 실패: 용량 초과') : tr('저장 실패'), 'bad'); console.error(e);
      return false;
    } finally { this._saving = false; }
  },
  /** 지금 판의 세이브 본문 — 저장과 멀티플레이 참가자에게 보내는 세계 스냅샷이 같이 쓴다. */
  saveData() {
    const p = this.player;
    const data: Bag = {
      v: SAVE_VERSION, name: p.name, savedAt: Date.now(), mode: this.mode,
      world: this.withoutSeal(() => this.world.serialize()), chapter: this.chapter, dayT: this.dayT,
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
      achievements: this.achievements, tally: this.tally, survey: this.survey, mpGuests: this.mpGuests || {},
      p: this.packChar(p)
    };
    return data;
  },
  /* ================= 저장 내보내기 / 가져오기 ================= */
  /* 파일은 슬롯 번호(0부터)를 열쇠로 본문 글자열을 담는다 — 저장소가 바뀌어도 파일 모양은 그대로다. */
  async exportSaves() {
    try {
      const out: Bag = { app: 'ashfall', key: SAVE_KEY, at: new Date().toISOString(), slots: {} };
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
  async importSaves(text: string) {
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

  async loadGame(slot: number) {
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
  _loadGame(raw: any) {
    try {
      const d = JSON.parse(raw);
      upgradeSave(d);   // 옛 판으로 만든 기록을 지금 판 모양으로 올린다
      // 세계 폭이 바뀐 버전의 기록은 그대로 풀면 지형이 어긋난 채로 열린다 — 아예 막는다
      /* 세계 크기가 다른 판의 기록은 열지 않는다 — 사연: docs/code-history.md#h58 */
      /* 세계 크기(소형·중형·대형)를 **먼저** 맞추고 대조한다 — 크기마다 WW·WH 가 다르다. */
      const prevSize = dimsOf(this.world).WSIZE;
      setWorldSize((d.world && d.world.size) || 's');
      const { WW, WH } = dimsOf();                 // 고른 크기의 치수 — 아직 세계가 없다
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
      const p = this.unpackChar(d.p, d.name, d.chapter);
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
      this.rainT = 0; this.precip = null; this.smokes = []; this.smokeT = 0;
      this.vault = d.vault || new Array(VAULT_SIZE).fill(null); this.vaultGold = d.vaultGold || 0;
      while (this.vault.length < this.vaultCap()) this.vault.push(null);
      this.bounties = d.bounties || [];
      this.bountyNext = d.bountyNext || [];
      /* 옛 저장에는 "○○ 14마리"만 적힌 종이가 붙어 있다. */
      if (this.bounties.some((b: any) => !b.obj)) this.bounties = [];
      this.shopStock = d.shopStock || {}; this.shopStockDay = d.shopStockDay === undefined ? -1 : d.shopStockDay;
      this.achievements = d.achievements || {};
      this.mpGuests = d.mpGuests || {};
      this.tally = d.tally || {};
      if (this.villageUnlocked && !this.bounties.length) this.rollBounties();
      this.ents = []; this.corpses = []; this.projs = []; this.parts = []; this.texts = []; this.drops = []; this.tweens.clear(); this.boss = null;
      this.shapes.clear(); this.vfx.clear(); this.trail.clear(); this.sigs = []; this.edge = null; this.stage = null;
      this.puzzle = null; this._puzRooms = null; this._pzLeft = null; this._deepFail = null; this.bhz = null;
      this.guardCd = 0; this.facTimer = 0; this.cropTimer = 0;   // 새로 시작할 때 남아 있던 대기 시간을 지운다
      // 카메라를 저장된 위치로 바로 맞춘다 — 안 하면 (0,0) 근처에서 훅 팬 되는 게 첫 프레임에 보인다
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      $('#title-screen').style.display = 'none';
    if (typeof TitleBG !== 'undefined') TitleBG.stop();   // 화면 밖이면 프레임을 낭비하지 않는다
      this.closeAllModals();
      this.scenes.go('play'); this.scenes.close('pause'); this.scenes.close('death'); this.scenes.close('mpause'); this.scenes.close('mdeath');
      this.petEnts = []; this.syncPets();
      UI.refreshBag(); UI.refreshEquip(); UI.refreshTracker(); UI.refreshSkillbar(); UI.refreshStatAlloc(); UI.refreshSkillSlots();
      this.toast(tr('여정을 이어간다'), 'good');
      this.audioInit();
      this.buildMapAtlas();
      this.mpAuto();
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
  async deleteSlot(i: number) {
    if (!await this.askConfirm(tr('이 세이브를 정말 삭제할까요? 되돌릴 수 없습니다.'), tr('삭제'))) return;
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
    box.querySelectorAll('.slot-card.filled').forEach((el: any) => {
      const i = +el.dataset.slot;
      el.addEventListener('click', (e: any) => { if (!e.target.closest('.slot-del-btn')) this.loadGame(i); });
      el.querySelector('.slot-del-btn').addEventListener('click', (e: any) => { e.stopPropagation(); this.deleteSlot(i); });
    });
    box.querySelectorAll('.slot-new-btn').forEach((btn: any) => {
      btn.addEventListener('click', () => this.showNewGameForm(+btn.dataset.slot));
    });
  },
  showNewGameForm(slot: any) {
    const box = $('#newgame-box');
    let ci = 0, mi = 0, sz = 's';
    const kit = (ch: any) => {
      const nameOf = (id: string) => (ITEMS[id] && ITEMS[id].n) || id;
      const parts = [ch.weapon ? `<b>${escHtml(nameOf(ch.weapon))}</b>` : tr('<b>맨손</b>')];
      (ch.bag || []).forEach(([id, n]: [string, number]) => parts.push(`${escHtml(nameOf(id))} ×${n}`));
      if (ch.gold) parts.push(tr('금화 {gold}', { gold: ch.gold }));
      return parts.join(' · ');
    };
    const sheet = (ch: any) => Sprites.url(`assets/char/player_${ch.id}.png`);
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

    box.querySelectorAll('.ng-char').forEach((b: any) => b.onclick = () => {
      ci = +b.dataset.i;
      box.querySelectorAll('.ng-char').forEach((x: any) => x.classList.toggle('on', x === b));
      paint();
    });
    box.querySelectorAll('#ng-modes .ng-mode').forEach((b: any) => b.onclick = () => {
      mi = +b.dataset.i;
      box.querySelectorAll('#ng-modes .ng-mode').forEach((x: any) => x.classList.toggle('on', x === b));
      $('#ng-mdesc').textContent = MODES[mi].d;
    });
    box.querySelectorAll('#ng-sizes .ng-mode').forEach((b: any) => b.onclick = () => {
      sz = b.dataset.k;
      box.querySelectorAll('#ng-sizes .ng-mode').forEach((x: any) => x.classList.toggle('on', x === b));
      $('#ng-sdesc').textContent = WORLD_SIZES[sz].d;
    });
    box.querySelector('.ng-start').onclick = async () => {
      const name = box.querySelector('.ng-name-input').value;
      const seed = box.querySelector('.ng-seed-input').value.trim();
      // 되돌릴 수 없는 선택이라 불가능 모드만 한 번 더 묻는다
      if (MODES[mi].id === 'impossible' &&
          !await this.askConfirm(tr('불가능 모드입니다.\n한 번 죽으면 이 슬롯의 기록이 지워집니다. 시작할까요?'), tr('시작'))) return;
      this.closeModal('#newgame-screen');
      this.closeModal('#slots-screen');
      this.newGame(seed, slot, name, CHARACTERS[ci].id, MODES[mi].id, sz);
    };
    box.querySelector('.ng-cancel').onclick = () => this.closeModal('#newgame-screen');
    this.openModal('#newgame-screen');
  },
};

mixin(Game.prototype, SavePart, true);
