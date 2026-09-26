/* ===== game.js — 루프 / 입력 / 렌더 / 진행 ===== */
import { bindApp } from './ctx.js';
import { startLoop } from '../engine/core/loop.js';
import { aabb, clamp, dist, dist2, lerp } from '../engine/core/math.js';
import { RNG, tileHash } from '../engine/core/rng.js';
import { createInput } from '../engine/input/actions.js';
import { bindPointer } from '../engine/input/pointer.js';
import { mountTouch } from '../engine/input/touch.js';
import { fitCanvas } from '../engine/platform/viewport.js';
import { makeSigner } from '../engine/save/seal.js';
import { createSaveStore } from '../engine/save/store.js';
import { upgrade } from '../engine/save/upgrade.js';
import { createScenes } from '../engine/scene/scenes.js';
import { N_, fmt, tr } from './lang.js';
import { CAMP_X1, DEEP_Y, HELL_Y, SEA_X1, SKY_Y, WH, WW } from './size.js';
import { T, TILE_DEF, TILE_SPRITE } from './data.js';
import { ITEMS } from './data/items.js';
import { CHAR_OF, KEY_ACTIONS, MODE_OF, VILLAGE } from './data/start.js';
import { CAVE_TYPES, RUIN_SPEC } from './data/ruins.js';
import { CHAPTERS, SESSIONS } from './data/story.js';
import { PART_CAP, idef } from './data/values.js';
import { DAWN_WALL, TS, World, setWorldSize } from './world.js';
import { TileArt } from './tileart.js';
import { Art } from './itemart.js';
import { Sprites } from './sprites.js';
import { TitleBG } from './titlebg.js';
import { Bomb, Drop, Enemy, Guard, HOTBAR, Part, Player, Proj, VAULT_SIZE, makeItem } from './entity.js';
import { FAC_TICK, Factory } from './factory.js';
import { $, $$, UI } from './ui.js';
import { Ambient, Music, SfxLoop } from './music.js';

export const SAVE_KEY = 'ashfall_save_v3';   // v1: 640×232 · v2: 2800×480 — 세계 폭이 바뀌면 호환 불가
export const SAVE_SLOTS = 3;

/* ---------------- 세이브 판올림 ---------------- */
export const SAVE_UPGRADES = [
  // v1 → v2
  (d) => {
    // 상인 재고 — 하루 단위로 갈리는 무작위 재고를 세이브에 담는다
    if (!d.shopStock) d.shopStock = {};
    if (d.shopStockDay === undefined) d.shopStockDay = -1;
  },
  // v2 → v3 — 유틸리티 장비 칸 두 개가 생겼다
  (d) => {
    const eq = d.player && d.player.equip;
    if (!eq) return;
    if (eq.util1 === undefined) eq.util1 = null;
    if (eq.util2 === undefined) eq.util2 = null;
  },
  /* v3 → v4 — 업적. */
  (d) => { if (!d.achievements) d.achievements = {}; },
  /* v4 → v5 — 업적 중에 세이브에 없는 값을 묻는 것들이 생겼다 (플레이 시간·거래 횟수·익사 같은 것). */
  (d) => { if (!d.tally) d.tally = {}; },
  /* v5 → v6 — 유적 탐사 기록. */
  (d) => { if (!d.survey) d.survey = {}; },
  /* v6 → v7 — 동굴 갈래(world.caveGrid)와 금 간 자갈(world.faults). */
  (d) => { if (d.world) { if (d.world.caveGrid === undefined) d.world.caveGrid = null; if (!d.world.faults) d.world.faults = []; } },
  /* v7 → v8 — 세계 크기(world.size: 's' 소형 · 'm' 중형 · 'l' 대형). */
  (d) => { if (d.world && !d.world.size) d.world.size = 's'; },
  /* v8 → v9 — 드릴이 광맥 칸마다 더 캘 수 있는 횟수(world.oreHits). */
  (d) => { if (d.world && !d.world.oreHits) d.world.oreHits = {}; },
  /* v9 → v10 — 바다 수면(world.sea). 없으면 World.deserialize 가 타일에서 다시 잰다(null 로 두면 그쪽이 채운다). */
  (d) => { if (d.world && d.world.sea === undefined) d.world.sea = null; }
];
export const SAVE_VERSION = SAVE_UPGRADES.length + 1;

/** 옛 세이브를 지금 판까지 끌어올린다. */
export function upgradeSave(d) { return upgrade(d, SAVE_UPGRADES); }
export const slotKey = (i) => `${SAVE_KEY}_slot${i}`;
export const sigKey = (i) => `${SAVE_KEY}_slot${i}_s`;

/* ================= 세이브 무결성 ================= */
export const SAVE_SALT = 'ashfall-seal-1';
/** FNV-1a 32비트 두 벌 — 소금은 게임 것(engine/save/seal.js). */
export const saveSign = makeSigner(SAVE_SALT);
/** 열어도 되는 기록인가(sig 는 그 기록에 딸린 서명). */
export function saveSealOk(raw, d, sig) {
  if (!d || !d.sealed) return true;
  return !!sig && sig === saveSign(raw);
}
/** 슬롯 목록에 띄울 요약 — 본문을 열지 않고 목록을 그리려고 따로 적는다 */
export function saveHead(d) {
  return { name: d.name || NONAME, level: d.p ? d.p.level : 1, chapter: d.chapter,
    size: (d.world && d.world.size) || 's', savedAt: d.savedAt };
}

/* ================= 저장소 ================= */
export const SaveStore = createSaveStore({ dbName: 'ashfall', slots: SAVE_SLOTS, slotKey, sigKey,
  sign: saveSign, head: saveHead, sealOk: saveSealOk });
export const SET_KEY = 'ashfall_settings';
// 완전한 암흑(0)은 지도에 남기지 않는다.
export const MAP_REVEAL_LIGHT = 1;

/** 화질 — 픽셀 밀도 상한 · 입자 상한. ★ 헤드리스 폰 흉내에서 밀도 1.5 → 1 로 프레임이 10.8 → 21.2 로 두 배였다(JS 시간은 같음 — 막히는 곳은 화면 합성) */
export const QUALITY = { high: { dpr: 2, parts: PART_CAP }, mid: { dpr: 1.5, parts: 600 }, low: { dpr: 1, parts: 300 } };

/** 터치 기기인가 — ?touch=1 / 0 이 먼저, 아니면 손가락이 주 포인터인 기기(폰 · 태블릿) */
export const TOUCH = (() => {
  const q = new URLSearchParams(location.search).get('touch');
  if (q === '1' || q === '0') return q === '1';
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
})();

/** 이름을 비워 둔 모험가 — 세이브에는 원문으로 남기고 보일 때 옮긴다(언어를 바꿔도 따라온다) */
export const NONAME = N_('이름 없는 모험가');

export const G: Bag = {
  cv: null, ctx: null, mm: null, mmx: null,
  W: 0, H: 0, cam: { x: 0, y: 0 },
  world: null, player: null, rng: new RNG(1),
  ents: [], projs: [], parts: [], texts: [], drops: [], pending: [], corpses: [],
  time: 0, dayT: 6 * 60, shake: 0,
  /* 씬 스택 — 바닥 씬(타이틀·플레이) 위에 멈춤(메뉴·쓰러짐)과 창(패널·대화·자물쇠) 겹이 얹힌다.
     ★ 멈춤·창은 각각 **한 겹**이다 — 여러 곳이 같은 겹을 열고 닫는다(대화를 닫으면 패널이 열려 있어도 창 겹이 걷힌다). */
  scenes: createScenes({
    scenes: { title: {}, play: { update: dt => G.update(dt), render: () => G.render() } },
    layers: { pause: { pause: true }, ui: { input: true } },
    start: 'title'
  }),
  get state() { return this.scenes.current; },
  get paused() { return this.scenes.has('pause'); },
  get uiOpen() { return this.scenes.has('ui'); },
  set uiOpen(on) { this.scenes.set('ui', on); },     // ui.js 의 패널·대화가 연다
  mode: 'normal',        // 새 게임에서 정하고 저장에 남는다. 설정에서 못 바꾼다.
  chapter: 0, boss: null,
  /* 제작 시설: nearSt는 지금 어떤 시설 앞에 서 있는가. */
  nearSt: { work: false, forge: false }, nearStObj: { work: null, forge: null },
  event: null,            // 진행 중인 세계 이벤트 {id, t}
  eventRolled: -1,        // 이 국면(낮/밤)에 이미 주사위를 굴렸는가
  sideActive: {}, sideDone: {},
  input: { left: 0, right: 0, up: 0, down: 0, jump: 0, dash: 0, m1: 0, m2: 0, mx: 0, my: 0, wx: 0, wy: 0 },
  spawnTimer: 0, mmTimer: 0, hoverObj: null,
  currentSlot: null,      // 지금 열려 있는 세이브가 몇 번 슬롯인지 — saveGame()이 여길 본다

  /* ================= 초기화 ================= */
  init() {
    this.cv = $('#game'); this.ctx = this.cv.getContext('2d');
    this.mm = $('#minimap'); this.mmx = this.mm.getContext('2d');
    // 전체 지도용 축소 버전 — 타일 하나당 1px.
    this.mapAtlas = document.createElement('canvas');
    this.mapAtlas.width = WW; this.mapAtlas.height = WH;
    this.mapAtlasX = this.mapAtlas.getContext('2d');
    addEventListener('resize', () => this.resize()); this.resize();
    TileArt.build();
    Art.build();
    UI.init();
    /* 그림이 다 붙은 다음에 타이틀을 연다 — 안 그러면 배경 없는 맨 글자가 먼저 보이고 몇 초 뒤에 그림이 툭 얹힌다. */
    document.body.classList.add('booting');
    window.__acBooting = 1;                   // 로딩 화면은 이제 이쪽이 맡는다 (index.html 참고)
    this.showLoading(tr('불러오는 중…'));
    /* ★ 타이틀 배경은 여기서 바로 돌린다. */
    if (typeof TitleBG !== 'undefined') { TitleBG.init(); TitleBG.start(); }
    // 손그림 애셋은 비동기로 붙인다 — 실패해도 절차 생성 렌더로 계속 동작
    if (Sprites) {
      Sprites.ready().then(() => {
        this.spritesOn = true;
        UI.applySpriteOverrides();
        // 손그림 타일 텍스처가 있으면 절차 생성 아틀라스의 해당 칸을 덮어 그린다
        for (const name in TILE_SPRITE) TileArt.applySprite(TILE_SPRITE[name], Sprites.img['tile_' + name]);
        TileArt.buildAsh();       // 잿빛 판은 아틀라스에서 뜬다 — 갈아 끼운 다음 다시 떠야 한다
        TileArt.markFull();       // 상단 하이라이트 판정도 갈아 끼운 그림으로 다시 잰다
        // 아이템 아이콘도 같은 방식으로 — 아틀라스를 갈아 끼우면 UI와 캔버스가 함께 바뀐다
        if (Sprites.meta && Sprites.meta.items) {
          for (const id in Sprites.meta.items.files) Art.applyItemSprite(id, Sprites.img['item_' + id]);
          UI.refreshBag(); UI.refreshEquip();
        }
        if (typeof TitleBG !== 'undefined') TitleBG.useSprites();
      }).catch(e => { console.warn('sprite load failed, using procedural render', e); })
        .finally(() => {
          // 위에서 예외가 났더라도 그림 자체는 다 받아 놓았을 수 있다.
          if (typeof TitleBG !== 'undefined') TitleBG.useSprites();
          /* ★ 여기서 bootDone() 을 부르지 않는다. */
        });
    } else {
      this.bootDone();
    }
    this.waitForTitleArt();
    this.bindInput();
    this.loadSettings();
    if (Music) Music.armStart(() => this.pickBgm());
    this.migrateLegacySave();
    SaveStore.start();                   // 옛 localStorage 기록을 IndexedDB 로 옮기는 것도 여기서 시작한다
    this.renderSlotScreen();
    /* 타이틀에는 버튼 넷만 둔다 — 저장 슬롯도, 캐릭터 선택도 팝업으로 뺐다. */
    $('#btn-single').onclick = () => { this.renderSlotScreen(); this.openModal('#slots-screen'); };
    $('#btn-slots-close').onclick = () => this.closeModal('#slots-screen');
    $('#btn-credits').onclick = () => this.openModal('#credits-screen');
    $('#btn-credits-close').onclick = () => this.closeModal('#credits-screen');
    $('#btn-quit').onclick = () => this.quit();
    $('#btn-bye-back').onclick = () => this.closeModal('#bye-screen');
    // 바깥을 누르면 닫힌다 (새 게임 폼은 입력 중 실수로 닫히면 곤란해 뺀다)
    ['#slots-screen', '#credits-screen'].forEach(sel => {
      const el = $(sel);
      el.onclick = e => { if (e.target === el) this.closeModal(sel); };
    });
    $('#btn-resume').onclick = () => this.setPause(false);
    $('#btn-save').onclick = () => this.saveGame();
    /* 저장하기의 선택지 — 먼저 저장하고 그 결과를 파일로 내보낸다. */
    $('#btn-save-export').onclick = async () => { if (await this.saveGame()) this.exportSaves(); };
    const openSettings = () => { UI.setTab('disp'); UI.syncSettings(); $('#settings-screen').classList.add('open'); };
    $('#btn-settings-title').onclick = openSettings;
    $('#btn-settings-pause').onclick = openSettings;
    $('#btn-settings-close').onclick = () => $('#settings-screen').classList.remove('open');
    $('#btn-title').onclick = () => {
      this.setPause(false); this.scenes.go('title'); $('#title-screen').style.display = '';
      if (typeof TitleBG !== 'undefined') TitleBG.start();
      UI.bossBar(null); this.renderSlotScreen();
    };
    $('#btn-respawn').onclick = () => this.respawn();
    this.buildPipeline();
    startLoop((dt, rawDt) => this.frame(dt, rawDt), 0.033);
  },
  /** 화질 — 자동이면 폰 절약 · 태블릿 보통 · 컴퓨터 높음 */
  quality() {
    const q = (this.settings && this.settings.quality) || 'auto';
    if (QUALITY[q]) return q;
    return !TOUCH ? 'high' : Math.min(screen.width, screen.height) <= 540 ? 'low' : 'mid';
  },
  /** 설정의 시야 배율. */
  viewZoom() { return clamp((this.settings && this.settings.view || 100) / 100, 0.6, 1.6); },

  resize() {
    /* W·H 는 화면 픽셀이 아니라 **월드 좌표계로 본 시야 크기**다. */
    const v = fitCanvas(this.cv, this.ctx, this.viewZoom(), QUALITY[this.quality()].dpr);
    this.W = v.W; this.H = v.H;
  },

  /* ================= 입력 ================= */
  /** 키 · 액션(engine/input) — 액션 표는 data.js KEY_ACTIONS, 다시 매긴 키는 설정. */
  inp: createInput({ actions: KEY_ACTIONS, custom: () => G.settings && G.settings.keys }),
  /** 이 액션에 걸린 키 목록. */
  keysFor(id) { return this.inp.keysFor(id); },
  /** 지금 눌려 있는가 */
  held(id) { return this.inp.held(id); },
  /** 방금 눌린 code 가 이 액션인가 */
  isKey(id, code) { return this.inp.isKey(id, code); },

  bindInput() {
    this.keys = this.inp.keys;
    this.inp.bindKeyboard({
      // 조작키를 다시 매기는 중이면 그 키를 여기서 삼킨다
      capture: e => !!(UI.captureKey && UI.captureKey(e.code)),
      down: e => this.keyDown(e),
      blur: () => { this.input.m1 = this.input.m2 = 0; }
    });
    bindPointer(this.cv, this.input, {
      rightDown: () => this.rightClick(),
      wheel: e => {
        if (this.state !== 'play') return;
        const p = this.player;
        p.sel = (p.sel + (e.deltaY > 0 ? 1 : -1) + HOTBAR) % HOTBAR;
        UI.refreshHotbar();
      }
    });
    /* 터치 조작 — 손가락이 주 포인터인 기기면 켠다(?touch=1 / 0 으로 강제) */
    if (TOUCH)
      this.touch = mountTouch({ input: this.inp, ptr: this.input, surface: this.cv, rightDown: () => this.rightClick(),
        buttons: [{ id: 'jump', label: tr('점프') }, { id: 'dash', label: tr('대시') }], altLabel: tr('사용') });
    if (this.touch) document.body.classList.add('touch');   // 낮은 화면에선 미니맵·퀘스트 창을 숨긴다(style.css)
    if (this.touch) {         // 오른쪽 단추가 탭 단추 줄(패널을 여는 유일한 길)을 가리지 않게 그 윗변 위로 올린다 — 좁은 화면에선 줄이 핫바 위에 있다
      const lift = () => { const bar = $('#tabbar'), r = bar && bar.getBoundingClientRect();
        this.touch.el.style.setProperty('--ti-bottom', (r && r.height ? innerHeight - r.top + 14 : 24) + 'px'); };
      lift(); addEventListener('resize', lift);
      /* 스킬 칸을 누르면 그 스킬 — 겨누는 곳은 마지막으로 짚은 자리 */
      $$('#skillbar .sk').forEach((el, i) => el.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (this.state === 'play' && !UI.dlg && !UI.open) this.player.useSkill(i, this.input.wx, this.input.wy);
      }));
      /* 전체 화면(안드로이드 · 태블릿) — 아이폰 사파리는 요소 전체 화면이 없어 단추를 안 둔다 */
      if (document.fullscreenEnabled) {
        const fs = document.createElement('div'); fs.className = 'ti-fs'; fs.textContent = '⛶';
        fs.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { });
        });
        this.touch.el.appendChild(fs);
      }
    }
    /* 타자가 도는 중이면 넘기지 말고 그 자리에서 끝까지 펼친다 — 한 번 누른 것이 "다 읽었다"가 아니라 "빨리 보여 달라"인 경우가 훨씬 많다 */
    $('#dialogue').addEventListener('click', () => { if (UI.dlg && !UI.finishType()) UI.nextLine(false); });
  },
  /** 새로 눌린 키 하나(반복 아님) — 패널 · 저장 · 핫바 · 스킬. */
  keyDown(e) {
    // 타이틀에서는 Esc 로 열려 있는 팝업을 한 겹씩 닫는다
    if (this.state !== 'play') {
      if (e.code === 'Escape' && this.closeTopModal()) e.preventDefault();
      return;
    }
    const k = e.code;
    /* Esc 는 바꿀 수 없게 둔다 — 다시 못 빠져나오는 자리를 만들지 않기 위해서다. */
    if (k === 'Escape') { if (UI.open || UI.dlg) { UI.closePanel(); UI.closeDialogue(); } else this.setPause($('#pause-screen').className !== 'open'); }
    else if (this.isKey('inv', k)) { UI.togglePanel('inv'); e.preventDefault(); }
    else if (this.isKey('skills', k)) { UI.togglePanel('skill'); e.preventDefault(); }
    else if (this.isKey('quest', k)) { UI.togglePanel('quest'); e.preventDefault(); }
    else if (this.isKey('craft', k)) { UI.craftTab = 'hand'; UI.togglePanel('craft'); e.preventDefault(); }
    else if (this.isKey('map', k)) { UI.openFullmap(); e.preventDefault(); }
    else if (this.isKey('save', k)) { e.preventDefault(); this.saveGame(); }
    else if (k.startsWith('Digit')) {
      const n = +k.slice(5); this.player.sel = (n === 0 ? 9 : n - 1); UI.refreshHotbar();
    }
    else if (!UI.dlg && !UI.open) {
      if (this.isKey('rotate', k)) this.rotatePlace();
      else if (this.isKey('skill1', k)) this.player.useSkill(0, this.input.wx, this.input.wy);
      else if (this.isKey('skill2', k)) this.player.useSkill(1, this.input.wx, this.input.wy);
      else if (this.isKey('skill3', k)) this.player.useSkill(2, this.input.wx, this.input.wy);
      else if (this.isKey('skill4', k)) this.player.useSkill(3, this.input.wx, this.input.wy);
    }
  },
  readInput() {
    const I = this.input;
    const block = this.uiOpen || this.state !== 'play';
    I.left = !block && this.held('left') ? 1 : 0;
    I.right = !block && this.held('right') ? 1 : 0;
    I.down = !block && this.held('down') ? 1 : 0;
    I.jump = !block && this.held('jump') ? 1 : 0;
    I.dash = !block && this.held('dash') ? 1 : 0;
    const z = this.viewZoom();
    I.wx = I.mx / z + this.cam.x; I.wy = I.my / z + this.cam.y;
  },

  /* ================= 게임 시작 ================= */
  showLoading(msg) {
    const el = $('#loading');
    $('#loading-text').textContent = msg;
    el.classList.remove('fade'); el.classList.add('open');
  },
  hideLoading() { const el = $('#loading'); el.classList.remove('open', 'fade'); },

  /* ================= 타이틀 그림을 다 받고 나서 연다 ================= */
  waitForTitleArt() {
    const NEED = (typeof TitleBG !== 'undefined') ? TitleBG.NEEDED.length : 0;
    if (!NEED) { setTimeout(() => this.bootDone(), 8000); return; }
    const t0 = Date.now();
    let best = -1, seenBest = -1, bestAt = t0;
    const STALL = 10000, CAP = 25000;
    const tick = () => {
      if (this.booted) return;
      const got = TitleBG.artReady();
      /* "멈췄다"의 판정은 타이틀 그림 넷만 보면 너무 성급하다 — 느린 회선에서는 큰 그림 한 장을 받는 동안 넷 중 하나도 안 늘어난다. */
      const seen = (typeof Sprites !== 'undefined' && Sprites.img) ? Object.keys(Sprites.img).length : 0;
      if (got !== best || seen !== seenBest) {
        best = got; seenBest = seen; bestAt = Date.now();
        TitleBG.useSprites();
      }
      /* 진행 상황을 index.html 안전장치에도 알려 준다 — 받는 중이면 걷지 말라고 */
      window.__acDeadline = bestAt + STALL;
      if (got >= NEED) { TitleBG.useSprites(); this.bootDone(); return; }
      const now = Date.now();
      if (now - bestAt > STALL || now - t0 > CAP) {
        console.warn(`[부팅] 타이틀 그림 ${got}/${NEED} 에서 더 안 온다 — 그대로 연다`);
        this.bootDone(); return;
      }
      this.showLoading(tr('불러오는 중… {got}/{need}', { got, need: NEED }));
      setTimeout(tick, 120);
    };
    tick();
  },

  /** 애셋이 다 붙었다 — 로딩을 걷고 타이틀을 연다 (한 번만) */
  bootDone() {
    if (this.booted) return;
    this.booted = true;
    window.__acBooted = 1;                    // index.html 의 안전장치에게 알린다
    /* 글꼴까지 기다린다. */
    const fr = document.fonts && document.fonts.ready;
    const fonts = fr ? Promise.race([fr, new Promise(r => setTimeout(r, 1500))])
                     : Promise.resolve();
    fonts.catch(() => {}).then(() => {
      document.body.classList.remove('booting');
      if (this.state === 'title' && typeof TitleBG !== 'undefined') TitleBG.start();
      const el = $('#loading');
      el.classList.add('fade');
      setTimeout(() => { if (el.classList.contains('fade')) el.classList.remove('open', 'fade'); }, 480);
    });
  },

  newGame(seedStr, slot, name, charId, mode, size) {
    const seed = seedStr || ('' + Math.floor(Math.random() * 1e9));
    this.currentSlot = slot;
    this.showLoading(tr('세계를 빚는 중…'));           // 크기와 상관없이 같은 문구
    // 다음 프레임에 생성해서 로딩 화면이 먼저 그려지게 한다
    setTimeout(() => { try { this._newGame(seed, name, charId, mode, size); } finally { this.hideLoading(); } }, 40);
  },
  _newGame(seed, name, charId, mode, size) {
    this.rng = new RNG(seed + '_g');
    // ★ World 를 만들기 **전에** — 배열 크기와 모든 좌표가 여기서 정해진다.
    setWorldSize(size || new URLSearchParams(location.search).get('size') || 's');
    this.world = new World(seed).generate();
    this.fitMapAtlas();
    this._rigs = null; this._fbg = null;   // 세계가 바뀌었으니 자리·원경 캐시를 버린다
    this.player = new Player(this.world.spawnX * TS, (this.world.spawnY - 2) * TS);
    const p = this.player;
    p.name = (name || '').trim().slice(0, 12) || NONAME;
    /* 난이도와 캐릭터는 새 게임에서 한 번 정하고 끝이다 — 설정에서 못 바꾼다. */
    this.mode = MODE_OF(mode).id;
    const ch = CHAR_OF(charId);
    p.charId = ch.id;
    p.base = Object.assign({}, ch.base);
    if (ch.weapon) p.equip.weapon = makeItem(ch.weapon);
    p.equip.chest = makeItem('chest_cloth'); p.equip.boots = makeItem('boots_cloth');
    if (ch.gold) p.gold = ch.gold;
    ch.bag.forEach(([id, n], i) => { p.bag[i] = makeItem(id, ITEMS[id].stack > 1 ? n : 1); });
    p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
    this.ents = []; this.projs = []; this.parts = []; this.texts = []; this.drops = []; this.pending = [];
    this.corpses = [];
    this.rings = []; this.bolts = []; this.warns = []; this.sigs = []; this.edge = null;   // 특성 연출 — 화면 밖으로 넘어가지 않게 함께 비운다
    this.guardCd = 0; this.facTimer = 0; this.cropTimer = 0;   // 새로 시작할 때 남아 있던 대기 시간을 지운다
    this.chapter = 0; this.dayT = 7 * 60; this.time = 0; this.boss = null;
    this.talked = {}; this.crafted = {}; this.scenes.close('pause');
    /* 대화 — 상황 대사의 순번 · 장 이야기를 들은 기록 · 마을 단계를 들은 기록 */
    this.talkSeq = {}; this.storyHeard = {}; this.villageSeen = {};
    this.sideActive = {}; this.sideDone = {}; this.tabletsRead = {}; this.termsRead = {}; this.loreRead = {};
    this.deathMark = null;
    this.villageUnlocked = false; this.goldRate = 1; this.market = {}; this.dayCount = 0; this.trainedToday = 0;
    this.achievements = {}; this.tally = {};
    this.survey = {}; this.ruinPulse = {}; this.pendingEcho = null; this.pulseHere = null;
    this.rocks = []; this.quake = null; this.meteor = null; this.meteorRolled = undefined; this.caveHere = 0; this._caveLast = 0;
    this.nearStObj = { work: null, forge: null };
    this.event = null; this.eventRolled = -1; this.lairs = {}; this.seenRuins = {}; this.seenBiomes = {}; this._bgId = undefined; this.ruinMarks = {}; this.ruinEvDone = {}; this.trapTimer = 0;
    this.rainT = 0; this.rainDrops = null; this.smokes = []; this.smokeT = 0;
    this.vault = new Array(VAULT_SIZE).fill(null); this.vaultGold = 0; this.bounties = []; this.bountyNext = [];
    this.shopStock = {}; this.shopStockDay = -1;
    this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
    this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    $('#title-screen').style.display = 'none';
    if (typeof TitleBG !== 'undefined') TitleBG.stop();   // 화면 밖이면 프레임을 낭비하지 않는다
    this.closeAllModals();
    this.scenes.go('play');
    this.petEnts = []; this.syncPets();
    UI.refreshBag(); UI.refreshEquip(); UI.refreshTracker(); UI.refreshSkillbar(); UI.refreshStatAlloc();
    UI.chapterCard(CHAPTERS[0]);
    setTimeout(() => UI.storyScene(CHAPTERS[0], 'intro'), 4000);   // 서장 도입부를 실제로 읽힌다
    this.toast(tr('별이 떨어진 다음 날 아침이다.'));
    this.audioInit();
    this.buildMapAtlas();
    // 디버그 바로가기 — 주소 끝에 ?debug=village를 붙이고 "새로운 여정"을 누르면 종장을 안 깨도 여명 마을이 바로 열리고 그 앞에서 시작한다.
    const qs = new URLSearchParams(location.search);
    /* ?debug=meteor — 2.5초 뒤 운석. */
    if (qs.get('debug') === 'meteor') {
      const at = qs.get('at'), me = Math.floor(this.player.cx / TS);
      setTimeout(() => this.startMeteor(at === 'me' ? me : at ? +at : me + (+qs.get('dx') || 30)), 2500);
    }
    if (qs.get('debug') === 'village') {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      // 단계 수가 늘어도 따라오게 VILLAGE 표를 기준으로 돌린다 — 사연: docs/code-history.md#h40
      const lv = clamp(+qs.get('lv') || 1, 1, VILLAGE.length - 1);
      for (let k = 2; k <= lv; k++) this.world.upgradeVillage(k);
      this.world.dawnCity.lv = lv;
      /* 스토리 진행도 함께 맞춘다 — 여명 마을은 종장(세션 2)을 지나야 열리는 곳이라, 챕터를 0(세션 1)에 둔 채 마을만 열면 세계가 앞뒤가 안 맞는다. */
      const sess = clamp(+qs.get('sess') || 2, 1, SESSIONS.length);
      this.chapter = qs.get('ch') !== null ? +qs.get('ch') : SESSIONS[sess - 1].ch0;
      const plv = +qs.get('plv') || (sess >= 3 ? 40 : sess >= 2 ? 25 : 1);
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 20000;
      const d = this.world.dawnCity;
      // 3단계면 서쪽 성문 앞에 세운다 — 마을에 들어서는 순간 성벽이 바로 보인다
      if (lv >= 3) { p.x = (d.x0 + DAWN_WALL.leftOff + 4) * TS; p.y = (d.gy - 3) * TS; }
      else { p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; }
      p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    }

    /* ?debug=price — 값 확인용. */
    if (qs.get('debug') === 'price') {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      for (let k = 2; k <= VILLAGE.length - 1; k++) this.world.upgradeVillage(k);
      this.world.dawnCity.lv = VILLAGE.length - 1;
      const sess = clamp(+qs.get('sess') || 2, 1, SESSIONS.length);
      this.chapter = qs.get('ch') !== null ? +qs.get('ch') : SESSIONS[sess - 1].ch0;
      const plv = +qs.get('plv') || 100;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 10000000;
      // 되팔 거리 — 알 세 종류와 공장 물건·재료를 한 벌씩 쥐여 준다
      const give = (id, n) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
        }
      };
      for (const id of ['egg_common', 'egg_rare', 'egg_epic']) give(id, 3);
      for (const id of ['m_belt', 'm_assembler', 'm_gen', 'steel_plate', 'circuit', 'motor',
                        'iron_bar', 'wood', 'potion_hp', 'station_work', 'crate_wood']) give(id, 5);
      const d = this.world.dawnCity;
      p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      UI.refreshBag(); UI.refreshEquip();
      this.toast(tr('값 확인 자리 — {plv}레벨 · 마을 {n}단계 · 세션 {sess}', { plv, n: VILLAGE.length - 1, sess }), 'good');
    }

    /* ?debug=sea — 세션 3 확인 자리. */
    if (qs.get('debug') === 'sea') {
      const give = (id, n) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
        }
      };
      this.chapter = qs.get('ch') !== null ? +qs.get('ch') : SESSIONS[2].ch0;
      const plv = +qs.get('plv') || 40;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.gold = +qs.get('gold') || 300000;
      // 숨 계단 · 심해 장비 · 불빛 · 채굴
      for (const id of ['tank_air', 'tank_deep', 'tank_abyss']) give(id, 1);
      for (const id of ['helm_diver', 'chest_scale', 'boots_fin', 'ring_pearl', 'charm_ink',
                        'spear_tide', 'bow_harpoon', 'orb_abyss', 'pick_abyss']) give(id, 1);
      give('torch', 200); give('potion_hp_greater', 20); give('rod_adv', 1); give('raw_meat', 20);
      // 4단계 설비를 바로 세워 볼 수 있게 재료도 준다
      for (const id of ['abyss_core', 'pressure_plate_m', 'abyss_pearl', 'jelly_lamp',
                        'crab_shell', 'shark_tooth', 'ink_sac', 'kelp', 'sea_salt']) give(id, 40);
      for (const id of ['m_pressor', 'm_desal', 'm_belt_f', 'm_battery_hi', 'm_gen', 'm_pole']) give(id, 8);
      p.equip.util1 = makeItem('tank_deep', 1, 0);
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      const w = this.world;
      const sx = SEA_X1 + 6;                                  // 물가 바로 오른쪽(빙하 쪽)
      p.x = sx * TS; p.y = (w.surface[sx] - 3) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      UI.refreshBag(); UI.refreshEquip();
      this.toast(tr('세션 3 확인 자리 — 왼쪽이 바다, 오른쪽이 빙하. 산소통 세 종류 지급'), 'good');
    }

    /* ?debug=fishfarm — 낚시·농사만 확인하는 자리. */
    if (qs.get('debug') === 'fishfarm') {
      // 한 칸 최대치(stack)를 넘겨 주면 한 슬롯에 몰아 담겨 버린다 — 나눠서 넣는다
      const give = (id, n) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
        }
      };
      give('rod_basic', 1); give('rod_adv', 1);
      give('raw_meat', 40);                                   // 미끼 — 생고기가 있으면 자동으로 걸린다
      give('hoe_iron', 1);
      give('seed_wheat', 60); give('seed_starroot', 40); give('seed_ashcap', 40);
      give('fertilizer', 40);
      give('pick_iron', 1); give('torch', 40);
      const plv = +qs.get('plv') || 15;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 5000;
      /* 정글 호수 기슭 — 물가 바로 옆의 마른 땅에 세운다. */
      const w = this.world;
      const lake = (w.pools || []).find(q => q.biome === 'jungle') || (w.pools || []).find(q => q.big);
      if (lake) {
        let sx = lake.x;
        // 호수 왼쪽으로 걸어 나가 물이 끝나는 첫 마른 바닥을 찾는다
        for (let k = 0; k < 40; k++) {
          const tx = lake.x - k;
          const ty = w.surface[clamp(tx, 0, WW - 1)];
          if (!TILE_DEF[w.get(tx, ty)].liquid && w.solid(tx, ty + 1)) { sx = tx; break; }
        }
        /* 밭 감을 자리를 깔아 둔다. */
        for (let k = 1; k <= 12; k++) {
          const x = sx - k, sy = w.surface[clamp(x, 0, WW - 1)];
          if (TILE_DEF[w.get(x, sy)].liquid) continue;
          if (w.solid(x, sy - 1)) continue;                      // 나무 밑동은 건너뛴다
          /* 정글은 지면 바로 위가 덩굴·풀포기라 그 칸이 AIR가 아니다. */
          if (w.get(x, sy - 1) !== T.AIR) w.set(x, sy - 1, T.AIR);
          w.set(x, sy, T.GRASS);
          if (!w.solid(x, sy + 1)) w.set(x, sy + 1, T.DIRT);
        }
        p.x = sx * TS;
        p.y = (w.surface[clamp(sx, 0, WW - 1)] - 2) * TS;
        p.vx = p.vy = 0;
        this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
        this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
        this.toast(tr('낚시·농사 확인 자리 — 오른쪽이 호수, 왼쪽 12칸이 갈 수 있는 풀밭'), 'good');
      }
      UI.refreshBag(); UI.refreshEquip();
    }

    /* ?debug=ruin&id=mine — 유적의 맥박·탐사 기록·메아리 확인 자리. */
    if (qs.get('debug') === 'ruin') {
      const w = this.world, id = qs.get('id') || 'mine';
      const idx = RUIN_SPEC.findIndex(s => s.id === id);
      const site = (w.ruinSites || []).find(s => s.id === id);
      if (idx >= 0 && site && site.rooms.length) {
        const plv = +qs.get('plv') || 30;
        while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
        p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
        const give = (iid, n) => { const it = makeItem(iid, n); if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
        give('tonic_hush', 4); give('drum_pulse', 4); give('pulse_shard', 3); give('potion_hp', 20);
        const r = site.rooms.slice().sort((a, b) => a.y - b.y)[0];
        p.x = (r.x + (r.w >> 1)) * TS; p.y = (r.y + r.h - 3) * TS - p.h + TS; p.vx = p.vy = 0;
        this.seenRuins[id] = 1;
        if (qs.get('boss') === '1') this.lairs[idx] = 1;
        this.ruinPulse = { [id]: clamp(+qs.get('pulse') || 0, 0, 100) };
        this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
        this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
        UI.refreshBag();
      }
    }

    /* ?debug=cave — 동굴 확인 자리. */
    if (qs.get('debug') === 'cave') {
      const w = this.world, kq = qs.get('k');
      const plv = +qs.get('plv') || 30;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      const give = (iid, n) => { const it = makeItem(iid, n); if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
      give('pick_iron', 1); give('potion_hp', 20); give('bomb_small', 10); give('torch', 60);
      let at = null;
      if (kq) {
        const k = CAVE_TYPES.findIndex(c => c.id === kq);
        const cx0 = w.spawnX;
        // 그 갈래의 장식이 **실제로 깔린** 자리여야 한다(캠프 둘레처럼 갈래만 있고 안 꾸민 곳이 있다)
        const mark = { moss: T.HANGMOSS, drip: T.STALACTITE, geode: T.GEODE, fume: T.GASVENT }[kq];
        const near = (x, y) => {
          let n = 0;
          for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 3; dy++) if (w.get(x + dx, y + dy) === mark) n++;
          return n >= (kq === 'fume' ? 1 : 3);
        };
        for (let r = 0; r < WW && !at; r += 7)
          for (const x of [cx0 + r, cx0 - r]) {
            if (x < 5 || x >= WW - 5 || at) continue;
            for (let y = w.surface[x] + 14; y < HELL_Y - 4; y++)
              if (w.caveKindAt(x, y) === k && w.get(x, y) === T.AIR && w.get(x, y - 1) === T.AIR && w.solid(x, y + 1) && near(x, y)) { at = [x, y]; break; }
          }
      } else {
        const f = (w.faults || []).filter(q => !q.done).sort((a, b) => Math.abs(a.x - w.spawnX) - Math.abs(b.x - w.spawnX))[0];
        if (f) at = [f.x - f.dir * 3, f.y + 1];
      }
      if (at) {
        p.x = at[0] * TS + TS / 2 - p.w / 2; p.y = (at[1] + 1) * TS - p.h; p.vx = p.vy = 0;
        this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
        this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      }
      UI.refreshBag();
    }

    /* ?debug=factory — 기계 화면·애셋 확인 자리. 캠프 오른쪽 평지에 기계 전 종류를 재료를 채워 한 줄로 세운다. */
    if (qs.get('debug') === 'factory') this.buildDebugFactory(qs);

    /* ?debug=bomb — 폭탄만 확인하는 자리. */
    if (qs.get('debug') === 'bomb') {
      const give = (id, n) => {
        const max = ITEMS[id].stack || 1;
        for (let left = n; left > 0; left -= max) {
          const it = makeItem(id, Math.min(max, left), 0);
          if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
        }
      };
      for (const id of ['bomb_small', 'bomb_big', 'bomb_dig']) give(id, 99);
      // 제작도 그 자리에서 해 볼 수 있게 재료를 함께 준다 (화약 = 유황3+바다소금2+석탄2)
      give('sulfur', 99); give('sea_salt', 99); give('coal', 99); give('gunpowder', 99);
      give('iron_bar', 40); give('steel_plate', 30); give('rope_kelp', 40); give('pressure_plate_m', 20);
      give('station_work', 3); give('pick_iron', 1); give('torch', 60); give('potion_hp', 20);
      const plv = +qs.get('plv') || 40;
      while (p.level < plv) { p.level++; p.statPts += 3; p.skillPts++; p.xpNext = Math.round(p.xpNext * 1.18); }
      p.recalc(); p.hp = p.d.maxHp; p.mp = p.d.maxMp;
      p.gold = +qs.get('gold') || 200000;

      const w = this.world;
      const gx = CAMP_X1 + 16;                               // 안전 지대의 오른쪽 경계
      /* 깊이는 **안전 지대 판정이 정한다.** */
      let smin = 1e9;
      for (let x = gx - 26; x <= gx; x++) smin = Math.min(smin, w.surface[clamp(x, 0, WW - 1)]);
      const gy = clamp(smin + 18, 60, WH - 40);
      const x0 = gx - 26, x1 = gx + 78, top = gy - 13;
      // 굴을 파고 바닥 여섯 줄을 돌로 깐다
      for (let x = x0; x <= x1; x++)
        for (let y = top; y <= gy + 6; y++) {
          if (!w.inB(x, y)) continue;
          w.set(x, y, y > gy ? T.STONE : T.AIR);
          /* 뒷벽을 반드시 발라 준다 — 사연: docs/code-history.md#h41 */
          w.walls[w.i(x, y)] = 2;
        }
      /* 천장 메우기 — 사연: docs/code-history.md#h42 */
      for (let x = x0; x <= x1; x++)
        for (let y = Math.max(0, top - 8); y < top; y++)
          if (w.inB(x, y) && w.get(x, y) === T.AIR) w.set(x, y, T.STONE);
      // 경계 기둥 — 기반암이라 어떤 폭탄으로도 안 없어진다.
      for (let y = top; y <= gy; y++) if (y < gy - 3 || y > gy - 1) w.set(gx, y, T.BEDROCK);
      // 천장 횃불
      /* 단단하기 시험 기둥 — 폭탄이 어디서 멈추는지가 이 줄에 다 나온다. */
      const PILLARS = [T.STONE, T.GOLD, T.EBONSTONE, T.OBSIDIAN, T.DEEPROCK, T.BEDROCK];
      PILLARS.forEach((tile, i) => {
        const px = gx + 6 + i * 8;
        for (let dx = 0; dx < 5; dx++) for (let y = gy - 7; y <= gy; y++) w.set(px + dx, y, tile);
      });
      // 왼쪽(안전 지대)에도 같은 돌기둥 하나 — 같은 폭탄을 두 쪽에 던져 비교하라고
      for (let dx = 0; dx < 5; dx++) for (let y = gy - 7; y <= gy; y++) w.set(gx - 12 + dx, y, T.STONE);
      // 물·용암 웅덩이 — 액체는 건너뛴다
      for (let x = gx + 56; x <= gx + 68; x++)
        for (let y = gy - 2; y <= gy; y++) w.set(x, y, x < gx + 63 ? T.WATER : T.LAVA);
      // 기계 한 줄 — 남의 기계는 안 날린다
      ['belt', 'belt', 'gen', 'battery'].forEach((k, i) => Factory.place(w, gx + 72 + i, gy, k, 0));
      // 방어력이 폭탄 피해를 얼마나 깎는지 볼 표적.
      for (let i = 0; i < 3; i++)
        this.ents.push(new Enemy(i === 0 ? 'reef_crab' : 'slime', (gx + 30 + i * 4) * TS, (gy - 3) * TS, this.scale()));

      /* 불빛은 **마지막에** 건다. */
      for (const row of [top + 1, gy - 9, gy])
        for (let x = x0 + 2; x < x1; x += 3)
          if (w.get(x, row) === T.AIR) w.set(x, row, T.TORCH);

      p.x = (gx - 6) * TS; p.y = (gy - 2) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      UI.refreshBag(); UI.refreshEquip();
      this.toast(tr('폭탄 시험장 — 기반암 기둥 왼쪽이 안전 지대, 오른쪽이 부술 수 있는 곳'), 'good');
    }
  },

  /* ================= 루프 ================= */
  /** 한 프레임 — dt 는 0.033초로 자른 것, rawDt 는 실제로 흐른 시간(engine/core/loop.js). */
  frame(dt, rawDt) {
    this.scenes.frame(dt);
    // 배경음악은 일시정지/타이틀과 무관하게 항상 갱신해야 크로스페이드가 끊기지 않는다.
    if (Music) { Music.update(Math.min(rawDt, 3)); Music.play(this.pickBgm()); }
    /* 이어지는 효과음 — 매 프레임 "지금 나야 하는가"만 넘긴다. */
    if (SfxLoop) {
      const pl = this.player, playing = this.state === 'play' && !this.paused;
      const swim = playing && pl && (pl.swimming || pl.submerged > 0.5);
      const fuse = playing && this.projs.some(q => q instanceof Bomb);
      SfxLoop.set('swim', swim);
      SfxLoop.set('fuse', fuse);
    }
    // 환경음(폭포·호수)은 실제 플레이 중이고 안 멈춰 있을 때만 — 아니면 페이드아웃되게 dt만 흘려보낸다
    if (Ambient) {
      const active = this.state === 'play' && !this.paused && !!this.world && !!this.player;
      Ambient.updateFromWorld(this.world, this.player, dt, active);
    }
  },

  /** 지금 상황에 맞는 배경음악 키를 고른다 (music.js의 BGM 테이블과 짝) */
  pickBgm() {
    if (this.state !== 'play' || !this.player || !this.world) return 'title';
    /* 쓰러진 자리 — 사망 화면이 떠 있는 동안. */
    if (this._deathEl === undefined) this._deathEl = $('#death-screen');
    if (this._deathEl && this._deathEl.classList.contains('open')) return 'lastnote';
    /* 세션의 종장만 다른 곡을 쓴다. */
    if (this.boss) return this.boss.phases >= 5 ? 'finale' : 'boss';
    const p = this.player, w = this.world;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    // 베이스캠프는 기본 브금을 그대로 쓰고(낮/밤 전환도 평소처럼 적용), 여명 마을에만 승리의 칩튠을 튼다 — 마을에서는 비가 와도 이 곡이 우선한다(보스전 다음으로 높은 우선순위)
    const d = w.dawnCity;
    const inDawn = d && tx > d.x0 - 20 && tx < d.x1 + 20 && Math.abs(ty - d.gy) < 20;
    if (inDawn) return 'village';

    const zone = w.zoneAt(tx, ty);
    const lowHp = p.hp / p.d.maxHp < 0.3;
    /* 날씨 — 비(눈)는 제 곡, 나머지 날씨(붉은 달·모래 폭풍·포자)는 긴장 곡. 저체력은 날씨보다 먼저 긴장 곡이다. */
    const wx = this.event && this.eventActive() ? this.event.id : null;
    const weather = lowHp ? 'tense' : wx === 'rain' ? 'rain' : wx ? 'tense' : null;

    // 부유 성채도 하늘 곡을 쓴다 — 하늘 위에 떠 있는 유적이라서
    if (zone === 'citadel') return weather || 'sky';
    // 하늘 섬 — 고도로만 갈리는 구역이라 지상 판정보다 먼저 본다
    if (zone === 'sky' || ty < SKY_Y) return 'sky';

    /* 물에 잠겨 있으면 무조건 심해 곡. */
    if (p.swimming || p.submerged > 0.5) return 'seadeep';

    // 던전·유적·심층은 전부 카타콤 한 곡으로 통일한다.
    if (this.inCatacomb(tx, ty, zone)) return weather || 'catacomb';

    if (weather) return weather;
    const night = this.dayT < 5 * 60 || this.dayT > 19 * 60;
    const dark = w.lightAt(tx, ty) < 4;
    if (night || dark) return 'tense';

    // 여명 마을 동쪽 — 버섯 골짜기와 부패한 땅
    if (zone === 'glowfen' || zone === 'corrupt') return 'east';
    // 바다·해변·빙하 — 밤과 어둠은 다른 바이옴처럼 긴장 곡이 이긴다(위에서 이미 걸러졌다)
    if (zone === 'sea' || zone === 'beach' || w.biomeAt(tx).id === 'glacier') return 'sea';
    return 'normal';
  },
  /** 카타콤 곡을 쓰는 자리인가 — 심층 전부와, 깊이와 무관한 모든 던전·유적 */
  inCatacomb(tx, ty, zone) {
    if (ty > DEEP_Y) return true;
    if (zone === 'ruin' || zone === 'works' || zone === 'runaway' || zone === 'atelier'
      || zone === 'deepshaft') return true;
    // 사막 지하 묘실은 DEEP_Y보다 얕은 곳에 있어 좌표로 따로 짚어야 한다 (중심 기준 크기)
    const d = this.world.dungeon;
    if (d && Math.abs(tx - d.x) <= d.w / 2 + 2 && Math.abs(ty - d.y) <= d.h / 2 + 2) return true;
    return false;
  },

  update(dt) {
    /* ---- 손이 멈추는 한 박자(히트스톱) ---- */
    if (this.stopT > 0) { this.stopT -= dt; dt *= 0.12; }
    this.time += dt;
    /* 플레이 시간(초). */
    if (this.state === 'play' && !this.paused) {
      this.tally = this.tally || {};
      const before = this.tally.play || 0;
      this.tally.play = before + dt;
      if ((before / 60 | 0) !== (this.tally.play / 60 | 0)) this.checkAch();
    }
    const nextDayT = (this.dayT + dt * 2) % 1440;
    if (nextDayT < this.dayT) { this.dayCount++; this.updateEconomy(); this.growCropsDaily(); }
    this.dayT = nextDayT;
    this.readInput();
    const p = this.player, w = this.world;

    // 스킬 채널 중 이동 제한 등은 Player 내부에서 처리
    p.update(dt, w, this.input);
    this.updateFishing(dt);
    if (this.starMerge > 0) this.starMerge = Math.max(0, this.starMerge - dt);
    if (this.starGain) { this.starGain.t += dt; if (this.starGain.t >= this.starGain.dur) this.starGain = null; }
    this.tickStarRise(dt);
    /* 11장의 결전은 "세우고 · 물리고 · 끊기"다. */
    if (this.chapter === 11 && !this.asmRan && this.world && this.world.machines
        && typeof Factory !== 'undefined') {
      for (const m of this.world.machines.values())
        if (m.t === 'assembler' && Factory.sat(this.world, m) > 0) { this.asmRan = 1; break; }
    }
    /* 문짝이 여닫히는 동안만 움직인다. */
    if (w && w.doors) for (const d of w.doors) {
      const tgt = d.closed ? 0 : 1;
      if (d.sw === undefined) d.sw = tgt;
      else if (d.sw !== tgt) {
        const step = dt * (tgt > d.sw ? 3.2 : 3.6);   // 여는 데 0.31초 · 닫는 데 0.28초
        d.sw = tgt > d.sw ? Math.min(tgt, d.sw + step) : Math.max(tgt, d.sw - step);
      }
    }
    // 펫 — 장비창 상태와 맞춘 뒤 각자 알아서 따라오고 알아서 문다
    this.syncPets();
    for (const pet of this.petEnts) if (pet) pet.update(dt, p);

    // 공격 / 채굴
    if (this.input.m1 && !this.uiOpen) this.leftHold(dt);
    else { p.mineTx = -1; p.mineProg = 0; }

    // 엔티티
    for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i];
      e.update(dt, w, p);
      // 정예는 은은한 금빛 입자를 계속 흘려 눈에 띄게 한다 (평범한 놈이 아니라는 신호)
      if (e.elite && !e.dead && Math.random() < 0.2) this.parts.push(new Part(e.cx + (Math.random() - 0.5) * e.w, e.cy + (Math.random() - 0.5) * e.h, '#ffd24a', -34, 0.55));
      if (e.dead) this.ents.splice(i, 1);
      // 경비병은 마을 반대편 감시탑에 서 있어도 거리로 정리하면 안 된다 — 마을을 벗어날 때 따로 거둔다
      else if (!e.boss && !e.minion && !e.guard && dist2(e.cx, e.cy, p.cx, p.cy) > 2400 * 2400) this.ents.splice(i, 1);
    }
    for (let i = this.projs.length - 1; i >= 0; i--) { this.projs[i].update(dt, w, p); if (this.projs[i].dead) this.projs.splice(i, 1); }
    for (let i = this.drops.length - 1; i >= 0; i--) { this.drops[i].update(dt, w, p); if (this.drops[i].dead) this.drops.splice(i, 1); }
    for (let i = this.parts.length - 1; i >= 0; i--) if (!this.parts[i].update(dt)) this.parts.splice(i, 1);
    this.walkDust(p);
    /* ★ 잰 최고치는 257개라 PART_CAP(900)에 정상 전투로는 닿지 않지만, 난간이 없으면 언젠가 프레임으로 값을 치른다. */
    const cap = QUALITY[this.quality()].parts;
    if (this.parts.length > cap) this.parts.splice(0, this.parts.length - cap);
    for (let i = this.corpses.length - 1; i >= 0; i--) if ((this.corpses[i].t += dt) >= this.corpses[i].dur) this.corpses.splice(i, 1);
    for (let i = this.texts.length - 1; i >= 0; i--) if (!this.texts[i].update(dt)) this.texts.splice(i, 1);
    for (let i = this.pending.length - 1; i >= 0; i--) { this.pending[i].t -= dt; if (this.pending[i].t <= 0) { this.pending[i].fn(); this.pending.splice(i, 1); } }

    // 스폰
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = 1.1; this.trySpawn(); }
    this.updateRigs(dt);

    // 공장 — 프레임률과 무관하게 고정 8틱/초로 돌린다
    this.facTimer = (this.facTimer || 0) - dt;
    /* 남은 시간을 이어 간다 — FAC_TICK 으로 되돌리면 60fps 에서 8프레임(0.133초)마다 돌아 벨트 1초가 1.07초가 되고,
       물건이 칸마다 가운데서 멈칫했다 */
    if (this.facTimer <= 0) { this.facTimer = Math.max(this.facTimer + FAC_TICK, -FAC_TICK); Factory.tick(w, this); }

    // 고대 유적의 타일 함정 — 화면 근처만 훑는다
    this.trapTimer = (this.trapTimer || 0) - dt;
    if (this.trapTimer <= 0) { this.trapTimer = 0.2; this.tickTileTraps(); }
    w.tickCrumble(dt, p);

    // 세계 이벤트 (붉은 달 · 모래폭풍 · 포자 개화 · 비)
    this.updateEvents(dt);
    this.updateWeather(dt);
    this.updateSmoke(dt);        // 용광로 굴뚝 연기

    this.checkRuinEntry();
    this.checkRuinEvent();
    this.updatePulse(dt);          // 유적의 맥박 · 탐사 기록 (아래 '유적의 맥박' 절)
    this.updateCaves(dt);          // 동굴 갈래 · 낙석 · 무너지는 자갈 (아래 '동굴' 절)
    this.world.fluidTick(dt);      // 물·바닷물·용암이 흐른다 (world.js '유체' 절)
    this.updateFalls(dt);          // 폭포 밑 물보라
    /* 유적 고유 이벤트의 여운 — 꺼진 불(화면 어둠)과 홀씨(지속 피해)는 시간이 지나면 걷힌다 */
    if (this.ruinDark > 0) this.ruinDark -= dt;
    if (this.ruinSpore > 0) {
      this.ruinSpore -= dt;
      this.sporeTick = (this.sporeTick || 0) - dt;
      if (this.sporeTick <= 0) {
        this.sporeTick = 1;
        p.hurt(6 + this.player.level * 0.5);
        for (let i = 0; i < 6; i++)
          this.parts.push(new Part(p.cx + (Math.random() - .5) * 30, p.cy, '#8fd0a0', -20, .7));
      }
    }

    // 마을 경비병 — 요새 단계에서 마을에 들어와 있는 동안만 감시탑마다 하나씩 선다
    if (this.villageLv() >= 3) {
      const inV = this.inDawn(30);
      const gs = this.ents.filter(e => e instanceof Guard);
      if (!inV) { for (const g of gs) g.dead = true; this.guardCd = 0; }
      else {
        this.guardCd = (this.guardCd || 0) - dt;
        const posts = (w.dawnCity.posts || [w.dawnCity.x0 - 12]);
        if (gs.length < posts.length && this.guardCd <= 0) {
          // 아직 아무도 안 선 초소를 찾아 세운다
          const taken = new Set(gs.map(g => g.homeTx));
          const tx = posts.find(t => !taken.has(t));
          if (tx !== undefined) {
            const g = new Guard(tx * TS, (w.dawnCity.gy - 3) * TS, p.level);
            g.homeTx = tx;
            this.ents.push(g);
          }
          this.guardCd = gs.length === 0 ? 0.4 : 25;   // 전투 중에 죽으면 한참 뒤에 교대가 온다
        }
      }
    }

    // 나무 재생성 (플레이어 주변)
    this.growTimer = (this.growTimer || 0) - dt;
    if (this.growTimer <= 0) { this.growTimer = 5; w.regrow(this.rng, 4, Math.floor(p.cx / TS)); }

    // 카메라
    const tx = p.cx - this.W / 2, ty = p.cy - this.H / 2 - 30;
    this.cam.x = lerp(this.cam.x, clamp(tx, 0, WW * TS - this.W), 1 - Math.pow(0.002, dt));
    this.cam.y = lerp(this.cam.y, clamp(ty, 0, WH * TS - this.H), 1 - Math.pow(0.002, dt));
    this.shake = Math.max(0, this.shake - dt * 26);

    // 곡괭이를 들면 채굴 커서로
    const heldTool = p.held() && idef(p.held()).type === 'tool';
    if (heldTool !== this._mining) { this._mining = heldTool; this.cv.classList.toggle('mining', heldTool); }

    // 상호작용 대상 / 제작대
    this.hoverObj = this.findObjAt(this.input.wx, this.input.wy);
    // 시설끼리 가까이 붙어 있어도 서로 넘나들며 못 쓰게, 반경을 좁히고 가장 가까운 "그 개체"만 붙잡는다 — 업그레이드도 이 개체 하나에만 적용된다
    this.nearStObj.work = null; this.nearStObj.forge = null;
    let bestWork = 70, bestForge = 70;
    for (const o of w.objects) {
      if (o.type !== 'workbench' && o.type !== 'forge') continue;
      const d = dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2);
      if (o.type === 'forge') { if (d < bestForge) { bestForge = d; this.nearStObj.forge = o; } }
      else { if (d < bestWork) { bestWork = d; this.nearStObj.work = o; } }
    }
    this.nearSt.work = !!this.nearStObj.work; this.nearSt.forge = !!this.nearStObj.forge;

    // 보스 바 / HUD (10Hz)
    if (this.boss && this.boss.dead) this.boss = null;
    this.hudTimer = (this.hudTimer || 0) - dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      UI.bossBar(this.boss);
      UI.updateHUD();
      // 공장은 계속 움직이므로, 기계 패널이 열려 있으면 값도 같이 갱신한다
      if (UI.open === 'machine') UI.refreshMachine();
      this.checkChapter();
    }

    /* 비석 — 닿으면 잃은 것의 절반을 돌려준다. */
    if (this.deathMark) {
      const dm = this.deathMark;
      const now = this.dayCount * 1440 + this.dayT;
      if (now - (dm.at || 0) >= 720) {          // 12시간 = 720분
        this.deathMark = null;
        this.toast(tr('비석이 잿빛에 삼켜졌다'), 'bad');
      } else if (dist(p.cx, p.cy, dm.x, dm.y) < 70) {
        const gxp = Math.floor((dm.xp || 0) / 2), ggold = Math.floor((dm.gold || 0) / 2);
        if (gxp) p.addXp(gxp);
        if (ggold) p.gold += ggold;
        const back = (dm.items || []).slice(0, Math.ceil((dm.items || []).length / 2));
        let dropped = 0;
        for (const it of back) if (!p.addItem(it)) { this.drops.push(new Drop(p.cx, p.cy, it)); dropped++; }
        this.deathMark = null;
        for (let i = 0; i < 18; i++) this.parts.push(new Part(p.cx, p.cy - 10, '#ffe08a', -90, 1));
        const bits = [];
        if (gxp) bits.push(tr('경험치 {gxp}', { gxp: fmt(gxp) }));
        if (ggold) bits.push(tr('금화 {ggold}', { ggold: fmt(ggold) }));
        if (back.length) bits.push(tr('물건 {backCount}칸', { backCount: back.length }));
        this.toast(bits.length ? bits.join(' · ') + tr('을 되찾았다') : tr('쓰러졌던 자리로 돌아왔다'), 'good');
        if (dropped) this.toast(tr('가방이 차서 일부는 바닥에 떨어졌다'), 'info');
        UI.refreshBag();
        this.sfx('chapter');
      }
    }

    this.mmTimer -= dt;
    if (this.mmTimer <= 0) { this.mmTimer = 0.25; if (this.settings.minimap) this.drawMinimap(); }
  },

  /* ---- 고대 유적 함정 ---- */
  tickTileTraps() {
    const w = this.world, p = this.player;
    const cx = Math.floor(p.cx / TS), cy = Math.floor(p.cy / TS);
    const R = 26;                                   // 화면 언저리만
    const x0 = Math.max(1, cx - R), x1 = Math.min(WW - 2, cx + R);
    const y0 = Math.max(1, cy - 18), y1 = Math.min(WH - 2, cy + 18);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const def = TILE_DEF[w.get(x, y)];
        if (!def.tdart && !def.tvent && !def.tcoil && !def.tgas && !def.tgrind && !def.tbrine && !def.tmine) continue;
        // 좌표마다 다른 위상 — 한꺼번에 터지지 않게
        const ph = tileHash(x, y);
        if (def.tcoil || def.tgas || def.tgrind) { this.tickTileTrap2(def, x, y); continue; }
        if (def.tdart) {
          if ((this.time / 2.4 + ph) % 1 > 0.09) continue;     // 2.4초에 한 번
          const dir = def.tdart;
          for (let k = 1; k <= 11; k++) {
            const tx = x + dir * k;
            if (w.solid(tx, y)) break;
            const r = { x: tx * TS, y: y * TS, w: TS, h: TS };
            if (!aabb(r, p.rect())) continue;
            const pr = new Proj(x * TS + TS / 2 + dir * 14, y * TS + TS / 2, dir * 560, 0,
              22 + this.player.level * 1.4, 'enemy', 'arrow');
            this.projs.push(pr);
            this.sfxAt('turret', x, y);
            break;
          }
        } else if (def.tmine) {
          /* 촉발 지뢰 — 시간이 아니라 **밟는 순간** 터진다. */
          const box = { x: x * TS - 4, y: (y - 1) * TS, w: TS + 8, h: TS * 2 };
          if (!aabb(box, p.rect())) continue;
          w.set(x, y, T.AIR);
          this.aoe(x * TS + TS / 2, y * TS, 74, 46 + this.player.level * 1.6, 0, '#ff9a3a');
          if (p.iframe <= 0) {
            p.hurt(46 + this.player.level * 1.6, x * TS + TS / 2);
            p.vy = -420;                                   // 위로 띄운다 — 발밑이 터진 느낌
          }
          for (let k = 0; k < 22; k++)
            this.parts.push(new Part(x * TS + TS / 2 + (Math.random() - .5) * 20, y * TS + 8,
              Math.random() < .5 ? '#ff9a3a' : '#e8dcc0', -160, .7));
          this.shake = Math.max(this.shake, 8);
          this.sfxAt('zap', x, y);
        } else if (def.tbrine) {
          /* 염수 분출구 — 위로 4칸 짠물을 뿜는다. */
          const t = (this.time / 3.6 + ph) % 1;
          if (t > 0.24) continue;
          if (t < 0.12) {
            if (Math.random() < 0.4) this.parts.push(new Part(x * TS + TS / 2, y * TS, '#8fd4ef', -40, .35));
            continue;
          }
          for (let k = 1; k <= 4; k++) {
            const ty = y - k;
            if (w.solid(x, ty)) break;
            if (Math.random() < 0.7) this.parts.push(new Part(x * TS + TS / 2 + (Math.random() - .5) * 14, ty * TS + 10, '#bfe8ff', -150, .5));
            const r = { x: x * TS, y: ty * TS, w: TS, h: TS };
            if (aabb(r, p.rect()) && p.iframe <= 0) {
              p.hurt(16 + this.player.level * 0.6);
              p.oxygen = Math.max(0, (p.oxygen === undefined ? p.d.oxyMax : p.oxygen) - 5);
              this.toast(tr('짠물이 폐를 채운다 — 숨이 줄었다'), 'bad');
            }
            for (const e of this.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) e.hurt(24, false, null, 0);
          }
          if (Math.random() < 0.3) this.sfxAt('splash', x, y);
        } else {
          // 분출구는 위로 3칸을 태운다.
          const t = (this.time / 3.2 + ph) % 1;
          if (t > 0.22) continue;
          if (t < 0.1) {                                        // 예고 — 불씨만
            if (Math.random() < 0.4) this.parts.push(new Part(x * TS + TS / 2, y * TS, '#e8842a', -40, .3));
            continue;
          }
          for (let k = 1; k <= 3; k++) {
            const ty = y - k;
            if (w.solid(x, ty)) break;
            if (Math.random() < 0.7) this.parts.push(new Part(x * TS + TS / 2 + (Math.random() - .5) * 14, ty * TS + 10, '#ff9a3a', -120, .45));
            const r = { x: x * TS, y: ty * TS, w: TS, h: TS };
            if (aabb(r, p.rect()) && p.iframe <= 0) { p.hurt(30 + this.player.level * 1.2); }
            for (const e of this.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) e.hurt(40, false, null, 0);
          }
          if (Math.random() < 0.3) this.sfxAt('zap', x, y);
        }
      }
    }
  },

  /** 새 함정 셋. */
  tickTileTrap2(def, x, y) {
    const w = this.world, p = this.player;
    const ph = tileHash(x, y);
    if (def.tcoil) {
      /* 방전 코일 — 마주 보는 코일을 찾아 그 사이에 아크를 놓는다. */
      let mate = -1;
      for (let k = 2; k <= 10; k++) {
        const t = w.get(x + k, y);
        if (TILE_DEF[t].tcoil) { mate = x + k; break; }
        if (TILE_DEF[t].solid === 1) break;
      }
      if (mate < 0) return;
      const t = (this.time / 2.8 + ph) % 1;
      if (t > 0.3) return;
      if (t < 0.18) {                                   // 예고 — 양 끝에 불꽃만 튄다
        if (Math.random() < 0.5) this.parts.push(new Part(x * TS + TS, y * TS + TS / 2, '#9fd8ff', -30, .25));
        return;
      }
      for (let tx = x + 1; tx < mate; tx++) {
        if (Math.random() < 0.6)
          this.parts.push(new Part(tx * TS + TS / 2, y * TS + TS / 2 + (Math.random() - .5) * 10, '#bfe8ff', -10, .2));
        const r = { x: tx * TS, y: y * TS, w: TS, h: TS };
        if (aabb(r, p.rect()) && p.iframe <= 0) p.hurt(26 + this.player.level * 1.1);
        for (const e of this.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) e.hurt(34, false, null, 0);
      }
      if (Math.random() < 0.35) this.sfxAt('zap', x, y);
    } else if (def.tgas) {
      // 가스 분출 — 위로 다섯 칸까지 넓게 퍼진다.
      const t = (this.time / 4.4 + ph) % 1;
      if (t > 0.34) return;
      if (t < 0.16) {
        if (Math.random() < 0.3) this.parts.push(new Part(x * TS + TS / 2, y * TS, '#8aa860', -18, .5));
        return;
      }
      for (let k = 1; k <= 5; k++) {
        const ty = y - k;
        if (w.solid(x, ty)) break;
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.random() < 0.35)
            this.parts.push(new Part((x + dx) * TS + TS / 2, ty * TS + 10, '#9ac070', -50, .55));
          const r = { x: (x + dx) * TS, y: ty * TS, w: TS, h: TS };
          if (aabb(r, p.rect()) && p.iframe <= 0) p.hurt(16 + this.player.level * 0.7);
        }
      }
    } else if (def.tgrind) {
      // 톱니 — 벽에서 두 칸 튀어나온다.
      const t = (this.time / 1.9 + ph) % 1;
      if (t > 0.26) return;
      const dir = w.solid(x - 1, y) ? 1 : -1;           // 뚫린 쪽으로 튀어나온다
      for (let k = 1; k <= 2; k++) {
        const tx = x + dir * k;
        if (w.solid(tx, y)) break;
        if (Math.random() < 0.5)
          this.parts.push(new Part(tx * TS + TS / 2, y * TS + TS / 2, '#c8ccd4', 0, .2));
        const r = { x: tx * TS, y: y * TS, w: TS, h: TS };
        if (aabb(r, p.rect()) && p.iframe <= 0) p.hurt(24 + this.player.level * 1.0);
        for (const e of this.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) e.hurt(30, false, null, 0);
      }
      if (Math.random() < 0.2) this.sfxAt('hit_metal', x, y, this.strokeRate());   // 톱니는 쇠다
    }
  },
};

bindApp(G);
addEventListener('DOMContentLoaded', () => G.init());
