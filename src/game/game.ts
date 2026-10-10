/* ===== game.js — 루프 / 입력 / 렌더 / 진행 ===== */
import { bindApp } from './ctx.js';
import { DayCycle } from '../engine/core/daycycle.js';
import { startLoop } from '../engine/core/loop.js';
import { aabb, clamp, dist, dist2 } from '../engine/core/math.js';
import { mixin } from '../engine/core/mixin.js';
import { RNG, tileHash } from '../engine/core/rng.js';
import { SpatialHash } from '../engine/core/spatial.js';
import { TimeScale } from '../engine/core/timescale.js';
import { Tweens } from '../engine/core/tween.js';
import { stepParticles } from '../engine/fx/particles.js';
import { ShapeFx } from '../engine/fx/shapes.js';
import { Afterimages } from '../engine/fx/trail.js';
import { Vfx } from '../engine/fx/vfx.js';
import { createInput } from '../engine/input/actions.js';
import { createGamepad } from '../engine/input/gamepad.js';
import { bindPointer } from '../engine/input/pointer.js';
import { mountTouch } from '../engine/input/touch.js';
import { fitCanvas } from '../engine/platform/viewport.js';
import { Camera } from '../engine/render/camera.js';
import { ScreenFade } from '../engine/render/fade.js';
import { MapAtlas } from '../engine/render/minimap.js';
import { createAutosave } from '../engine/save/autosave.js';
import { createScenes } from '../engine/scene/scenes.js';
import { PerfPanel } from '../engine/ui/perf.js';
import { fmt, tr } from './lang.js';
import { dimsOf } from './size.js';
import { T, TILE_DEF, TILE_SPRITE } from './data.js';
import { CHAR_OF, KEY_ACTIONS, MODE_OF } from './data/start.js';
import { CHAPTERS } from './data/story.js';
import { PART_CAP, idef } from './data/values.js';
import { TS, World, setWorldSize } from './world.js';
import { TileArt } from './tileart.js';
import { Art } from './itemart.js';
import { Sprites } from './sprites.js';
import { TitleBG } from './titlebg.js';
import { Bomb, Drop, Enemy, Guard, HOTBAR, Part, Proj, VAULT_SIZE } from './entity.js';
import { FAC_TICK, Factory } from './factory.js';
import { $, $$, UI } from './ui.js';
import { Ambient, Music, SfxLoop } from './music.js';
import { SaveStore } from './savefmt.js';

// 완전한 암흑(0)은 지도에 남기지 않는다.
export const MAP_REVEAL_LIGHT = 1;

/** 화질 — 픽셀 밀도 상한 · 입자 상한. ★ 헤드리스 폰 흉내에서 밀도 1.5 → 1 로 프레임이 10.8 → 21.2 로 두 배였다(JS 시간은 같음 — 막히는 곳은 화면 합성) */
/** 하루 — 해 5:30~18:30 · 밝아짐 4~7시 · 어두워짐 17~20시(engine core/daycycle). 그린 해 자리 · 그림자 방향 · 밤이 같은 식을 쓴다 */
export const DAY_CYCLE = new DayCycle({ rise: 330, set: 1110, dawn: [240, 420], dusk: [1020, 1200] });
/** 자동 저장 간격(초) */
export const AUTOSAVE_SEC = 300;
/** 한 프레임에 찾는 몹 길의 수(entity/enemy-ai walkPath) */
export const PATH_BUDGET = 3;
export const QUALITY: Bag = { high: { dpr: 2, parts: PART_CAP }, mid: { dpr: 1.5, parts: 600 }, low: { dpr: 1, parts: 300 } };

/** 터치 기기인가 — ?touch=1 / 0 이 먼저, 아니면 손가락이 주 포인터인 기기(폰 · 태블릿) */
export const TOUCH = (() => {
  const q = new URLSearchParams(location.search).get('touch');
  if (q === '1' || q === '0') return q === '1';
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
})();

/** 게임 하나 — 상태는 인스턴스 칸(생성자), 메서드는 프로토타입(이 파일의 GameCore 와 game/*.ts 조각이 붙인다).
    ★ 조각에 새 칸을 만들 때 객체·배열을 처음 값으로 두면 인스턴스끼리 나눠 쓴다 — null 로 두고 쓸 때 새로 만들 것. */
export class Game {
  constructor() {
    const g: Bag = this;   // 씬·입력 콜백이 부르는 이 게임
    Object.assign(this, {
      cv: null, ctx: null, mm: null, mmx: null,
      W: 0, H: 0, cam: new Camera({ follow: 0.002, leadX: 56, leadY: 64, leadSpeed: 320, leadEase: 0.08 }),
      world: null, rng: new RNG(1),
      /* 플레이어 — players 는 이 세계에 있는 모두, me 는 이 화면의 플레이어(혼자 할 때는 players = [me]). 설계: docs/update/v1.1.2-multiplayer-plan.md */
      players: [], me: null,
      ents: [], projs: [], parts: [], texts: [], drops: [], tweens: new Tweens(), corpses: [],
      time: 0, dayT: 6 * 60, shake: 0, pathBudget: 0, timeScale: new TimeScale(), fade: new ScreenFade(), perf: new PerfPanel(), shapes: new ShapeFx(), vfx: new Vfx(), trail: new Afterimages<Bag>(0.028, 0.2, 7), entHash: new SpatialHash<Enemy>(64),
      /* 씬 스택 — 바닥 씬(타이틀·플레이) 위에 멈춤(메뉴·쓰러짐)과 창(패널·대화·자물쇠) 겹이 얹힌다.
         ★ 멈춤·창은 각각 **한 겹**이다 — 여러 곳이 같은 겹을 열고 닫는다(대화를 닫으면 패널이 열려 있어도 창 겹이 걷힌다). */
      scenes: createScenes({
        scenes: { title: {}, play: { update: dt => g.update(dt), render: () => { g.syncCtl(); g.render(); } } },
        /* 멀티플레이에서는 멈춤 메뉴·쓰러짐이 세계를 멈추면 안 된다(남의 판이 같이 멈추고 끊긴다) — 입력만 막는 겹(mpause·mdeath)을 쓴다. */
        layers: { pause: { pause: true }, death: { pause: true }, ui: { input: true }, mpause: { input: true }, mdeath: { input: true } },   // ★ 쓰러짐은 멈춤 메뉴와 다른 겹 — 메뉴를 열고 닫아도 부활 전엔 안 돈다
        start: 'title'
      }),
      /* 창·대화·멈춤·쓰러짐 동안 터치 스틱·단추를 숨긴다 — 창 위에 떠서 능력치 칸·메뉴를 가렸다(style.css body.ctl-off) */
      _ctlOff: false,
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

      /* ================= 입력 ================= */
      /** 키 · 액션(engine/input) — 액션 표는 data.js KEY_ACTIONS, 다시 매긴 키는 설정. */
      inp: createInput({ actions: KEY_ACTIONS, custom: () => g.settings && g.settings.keys }),
    });
  }
}

export const GameCore: Bag = {
  /** 이 화면의 플레이어(= me). 넣으면 혼자 하는 판으로 players 를 [p] 로 맞춘다. */
  get player() { return this.me; },
  set player(p) { this.me = p; this.players = p ? [p] : []; },
  get state() { return this.scenes.current; },
  get paused() { return this.scenes.paused(); },
  get uiOpen() { return this.scenes.has('ui'); },
  set uiOpen(on) { this.scenes.set('ui', on); },     // ui.js 의 패널·대화가 연다
  syncCtl() {
    const off = this.uiOpen || this.paused || this.scenes.has('mpause') || this.scenes.has('mdeath') || !!(this.player && this.player.hp <= 0);   // 멀티플레이 멈춤·쓰러짐은 세계를 안 멈추는 층
    if (off !== this._ctlOff) { this._ctlOff = off; document.body.classList.toggle('ctl-off', off); }
  },

  /* ================= 초기화 ================= */
  init() { const { WW, WH } = dimsOf(this.world);
    this.cv = $('#game'); this.ctx = this.cv.getContext('2d');
    this.mm = $('#minimap'); this.mmx = this.mm.getContext('2d');
    // 전체 지도용 축소 버전 — 타일 하나당 1px(engine render/minimap)
    this.mapAtlas = new MapAtlas(); this.mapAtlas.fit(WW, WH);
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
        this.vfx.art = this.shapes.art = (n: string, c: string) => Sprites.vfxArt(n, c);   // 스킬 연출 — 도형 대신 결 그림
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
      }).catch((e: any) => { console.warn('sprite load failed, using procedural render', e); })
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
    $('#btn-single').onclick = () => { this.mpWant = null; this.renderSlotScreen(); this.openModal('#slots-screen'); };
    this.bindMpUi(); this.bindChat();
    $('#btn-slots-close').onclick = () => this.closeModal('#slots-screen');
    $('#btn-credits').onclick = () => this.openModal('#credits-screen');
    $('#btn-credits-close').onclick = () => this.closeModal('#credits-screen');
    $('#btn-quit').onclick = () => this.quit();
    $('#btn-bye-back').onclick = () => this.closeModal('#bye-screen');
    // 바깥을 누르면 닫힌다 (새 게임 폼은 입력 중 실수로 닫히면 곤란해 뺀다)
    ['#slots-screen', '#credits-screen'].forEach(sel => {
      const el = $(sel);
      el.onclick = (e: any) => { if (e.target === el) this.closeModal(sel); };
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
      if (this.net && this.net.role === 'guest') { this.mpLeave(); return; }
      if (this.net) this.mpClose();
      this.toTitle();
    };
    $('#btn-respawn').onclick = () => this.respawn();
    this.buildPipeline();
    startLoop((dt, rawDt) => this.frame(dt, rawDt), 0.033, { background: () => !!this.net });   // 방이 열렸으면 탭을 내려도 돈다
  },
  /** 타이틀로 돌아간다(저장은 부르는 쪽이 정한다). */
  toTitle() {
    this.setPause(false); this.scenes.go('title'); $('#title-screen').style.display = '';
    if (typeof TitleBG !== 'undefined') TitleBG.start();
    UI.bossBar(null); this.renderSlotScreen();
  },
  /** 화질 — 자동이면 폰 절약 · 태블릿 보통 · 컴퓨터 높음 */
  quality() {
    const q = (this.settings && this.settings.quality) || 'auto';
    if (QUALITY[q]) return q;
    return !TOUCH ? 'high' : Math.min(screen.width, screen.height) <= 540 ? 'low' : 'mid';
  },
  /** 설정의 시야 배율. */
  /** sec 초 뒤에 fn — 세계 시간으로 흐른다(멈추면 같이 멈춘다) */
  after(sec: number, fn: () => void) { return this.tweens.after(sec, fn); },
  viewZoom() { return clamp((this.settings && this.settings.view || 100) / 100, 0.6, 1.6); },

  resize() {
    /* W·H 는 화면 픽셀이 아니라 **월드 좌표계로 본 시야 크기**다. */
    const v = fitCanvas(this.cv, this.ctx, this.viewZoom(), QUALITY[this.quality()].dpr);
    this.W = v.W; this.H = v.H;
  },
  /** 이 액션에 걸린 키 목록. */
  keysFor(id: string) { return this.inp.keysFor(id); },
  /** 지금 눌려 있는가 */
  held(id: string) { return this.inp.held(id); },
  /** 방금 눌린 code 가 이 액션인가 */
  isKey(id: string, code: string) { return this.inp.isKey(id, code); },

  bindInput() {
    this.keys = this.inp.keys;
    this.inp.bindKeyboard({
      // 조작키를 다시 매기는 중이면 그 키를 여기서 삼킨다
      capture: (e: any) => !!(UI.captureKey && UI.captureKey(e.code)),
      down: (e: any) => this.keyDown(e),
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
    /* 자동 저장 — 5분마다 · 탭을 내리거나 닫을 때(engine save/autosave). 결전 중 · 쓰러진 동안 · 남의 세계(손님)에서는 세계를 저장하지 않는다 */
    this.autosave = createAutosave({ every: AUTOSAVE_SEC,
      can: () => this.state === 'play' && this.currentSlot !== null && !!this.player && this.player.hp > 0 && !this.boss && !(this.net && this.net.role === 'guest'),
      save: (quiet: boolean) => this.saveGame(quiet) });
    /* 게임패드 — A 점프 · B 대시 · X/L3/R3 스킬 · Y 가방 · Back 지도 · Start 메뉴 · LB/RB 핫바 · RT 공격·캐기 · LT 놓기·쓰기 · 오른쪽 스틱 조준 */
    this.pad = createGamepad({ input: this.inp, ptr: this.input,
      hold: { 0: 'jump', 1: 'dash', 12: 'jump' },
      tap: { 2: 'skill1', 10: 'skill2', 11: 'skill3', 3: 'inv', 8: 'map', 9: 'menu', 4: 'slotPrev', 5: 'slotNext' },
      press: (a: string) => this.padPress(a),
      anchor: () => { const z = this.viewZoom(), p = this.player; return p ? { x: (p.cx - this.cam.x) * z, y: (p.cy - this.cam.y) * z } : { x: innerWidth / 2, y: innerHeight / 2 }; },
      rightDown: () => { if (this.state === 'play') this.rightClick(); },
      active: (on: boolean) => document.body.classList.toggle('pad', on) });
    if (this.touch) document.body.classList.add('touch');   // 낮은 화면에선 미니맵·퀘스트 창을 숨긴다(style.css)
    if (this.touch) {         // 오른쪽 단추가 탭 단추 줄(패널을 여는 유일한 길)을 가리지 않게 그 윗변 위로 올린다 — 좁은 화면에선 줄이 핫바 위에 있다
      const lift = () => { const bar = $('#tabbar'), r = bar && bar.getBoundingClientRect();
        this.touch.el.style.setProperty('--ti-bottom', (r && r.height ? innerHeight - r.top + 14 : 24) + 'px'); };
      lift(); addEventListener('resize', lift);
      /* 스킬 칸을 누르면 그 스킬 — 겨누는 곳은 마지막으로 짚은 자리 */
      $$('#skillbar .sk').forEach((el, i) => el.addEventListener('pointerdown', (e: any) => {
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
  /** 패드의 한 번 누르는 단추 — 그 액션에 걸린 첫 키를 누른 것으로 친다(키 처리 한 곳을 같이 쓴다) */
  padPress(a: string) {
    if (a === 'slotPrev' || a === 'slotNext') {
      if (this.state !== 'play' || !this.player) return;
      const p = this.player; p.sel = (p.sel + (a === 'slotNext' ? 1 : -1) + HOTBAR) % HOTBAR; UI.refreshHotbar(); return;
    }
    const code = a === 'menu' ? 'Escape' : this.keysFor(a)[0];
    if (code) this.keyDown({ code, preventDefault() {} });
  },
  keyDown(e: any) {
    if (e.code === 'F3') { this.pipe.profile(this.perf.toggle()); if (e.preventDefault) e.preventDefault(); return; }   // 성능 판(engine ui/perf) · 단계별 시간
    // 타이틀에서는 Esc 로 열려 있는 팝업을 한 겹씩 닫는다
    if (this.state !== 'play') {
      if (e.code === 'Escape' && this.closeTopModal()) e.preventDefault();
      return;
    }
    const k = e.code;
    /* Esc 는 바꿀 수 없게 둔다 — 다시 못 빠져나오는 자리를 만들지 않기 위해서다. */
    if ((k === 'Enter' || k === 'NumpadEnter') && this.net && !UI.dlg && !UI.open) { this.openChat(); e.preventDefault(); return; }
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
      else if (this.isKey('util1', k)) this.useUtil(0);
      else if (this.isKey('util2', k)) this.useUtil(1);
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
  showLoading(msg: string) {
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
    /* ?mp=join&room=&name=&char= — 열린 방에 새 캐릭터로 붙는다(개발판 시험용, 창은 M4). */
    const mq = new URLSearchParams(location.search);
    if (mq.get('mp') === 'join') setTimeout(() => this.mpJoin(mq.get('room') || 'test', this.freshPlayer(0, 0, mq.get('name') || '', mq.get('char') || '')), 300);
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

  newGame(seedStr: string, slot: number, name: string, charId: string, mode: string, size: any) {
    const seed = seedStr || ('' + Math.floor(Math.random() * 1e9));
    this.currentSlot = slot;
    this.showLoading(tr('세계를 빚는 중…'));           // 크기와 상관없이 같은 문구
    // 다음 프레임에 생성해서 로딩 화면이 먼저 그려지게 한다
    setTimeout(() => { try { this._newGame(seed, name, charId, mode, size); } finally { this.hideLoading(); } }, 40);
  },
  _newGame(seed: string, name: string, charId: string, mode: string, size: any) {
    this.rng = new RNG(seed + '_g');
    // ★ World 를 만들기 **전에** — 배열 크기와 모든 좌표가 여기서 정해진다.
    setWorldSize(size || new URLSearchParams(location.search).get('size') || 's');
    this.world = new World(seed).generate();
    const { WW, WH } = this.world.dims;
    this.fitMapAtlas();
    this._rigs = null; this._fbg = null;   // 세계가 바뀌었으니 자리·원경 캐시를 버린다
    this.player = this.freshPlayer(this.world.spawnX * TS, (this.world.spawnY - 2) * TS, name, charId);
    const p = this.player;
    /* 난이도와 캐릭터는 새 게임에서 한 번 정하고 끝이다 — 설정에서 못 바꾼다. */
    this.mode = MODE_OF(mode).id;
    this.ents = []; this.projs = []; this.parts = []; this.texts = []; this.drops = []; this.tweens.clear();
    this.corpses = [];
    this.shapes.clear(); this.vfx.clear(); this.trail.clear(); this.sigs = []; this.edge = null; this.stage = null;   // 특성 연출 — 화면 밖으로 넘어가지 않게 함께 비운다
    this.puzzle = null; this._puzRooms = null; this._pzLeft = null; this._deepFail = null; this.bhz = null;   // 봉인 방은 저장하지 않는다 — 새 판은 열린 방
    this.guardCd = 0; this.facTimer = 0; this.cropTimer = 0;   // 새로 시작할 때 남아 있던 대기 시간을 지운다
    this.chapter = 0; this.dayT = 7 * 60; this.time = 0; this.boss = null;
    this.talked = {}; this.crafted = {}; this.scenes.close('pause'); this.scenes.close('death'); this.scenes.close('mpause'); this.scenes.close('mdeath');
    /* 대화 — 상황 대사의 순번 · 장 이야기를 들은 기록 · 마을 단계를 들은 기록 */
    this.talkSeq = {}; this.storyHeard = {}; this.villageSeen = {};
    this.sideActive = {}; this.sideDone = {}; this.tabletsRead = {}; this.termsRead = {}; this.loreRead = {};
    this.deathMark = null;
    this.villageUnlocked = false; this.goldRate = 1; this.market = {}; this.dayCount = 0; this.trainedToday = 0;
    this.achievements = {}; this.tally = {}; this.mpGuests = {};
    this.survey = {}; this.ruinPulse = {}; this.pendingEcho = null; this.pulseHere = null;
    this.rocks = []; this.quake = null; this.meteor = null; this.meteorRolled = undefined; this.caveHere = 0; this._caveLast = 0;
    this.nearStObj = { work: null, forge: null };
    this.event = null; this.eventRolled = -1; this.lairs = {}; this.seenRuins = {}; this.seenBiomes = {}; this._bgId = undefined; this._layerId = undefined; this.ruinMarks = {}; this.ruinEvDone = {}; this.trapTimer = 0;
    this.rainT = 0; this.precip = null; this.smokes = []; this.smokeT = 0;
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
    /* 영상 촬영용 바로가기(?debug=showcase)는 장 카드 · 서장 · 알림 없이 바로 논다 — game/debug-showcase.ts */
    const quiet = new URLSearchParams(location.search).get('debug') === 'showcase';
    if (!quiet) {
      UI.chapterCard(CHAPTERS[0]);
      setTimeout(() => UI.storyScene(CHAPTERS[0], 'intro'), 4000);   // 서장 도입부를 실제로 읽힌다
      this.toast(tr('별이 떨어진 다음 날 아침이다.'));
    }
    this.audioInit();
    this.buildMapAtlas();
    this.mpAuto();
    // 디버그 바로가기 — 주소 끝에 ?debug=village를 붙이고 "새로운 여정"을 누르면 그 시험장에서 시작한다(game/debug-start.ts)
    this.debugStart(new URLSearchParams(location.search));
  },

  /* ================= 루프 ================= */
  /** 한 프레임 — dt 는 0.033초로 자른 것, rawDt 는 실제로 흐른 시간(engine/core/loop.js). */
  frame(dt: number, rawDt: any) {
    if (this.pad) this.pad.poll();
    this.fade.update(Math.min(rawDt, 0.1));
    this.perf.frame(rawDt);   // 화면 가리기는 진짜 시간으로(멈춤과 상관없이)   // 게임패드는 상태만 준다 — 매 프레임 읽는다(engine input/gamepad)
    this.scenes.frame(dt);
    // 배경음악은 일시정지/타이틀과 무관하게 항상 갱신해야 크로스페이드가 끊기지 않는다.
    if (Music) { Music.update(Math.min(rawDt, 3)); Music.play(this.pickBgm()); }
    /* 이어지는 효과음 — 매 프레임 "지금 나야 하는가"만 넘긴다. */
    if (SfxLoop) {
      const pl = this.player, playing = this.state === 'play' && !this.paused;
      /* 헤엄 소리는 물속에서 **움직일 때만** — 가만히 떠 있어도 팔 젓는 소리가 났다 */
      const swim = playing && pl && (pl.swimming || pl.submerged > 0.5) && !!pl.swimMove;
      const fuse = playing && this.projs.some((q: any) => q instanceof Bomb);
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
  pickBgm() { const { SKY_Y } = dimsOf(this.world);
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
  inCatacomb(tx: number, ty: number, zone: string) { const { DEEP_Y } = dimsOf(this.world);
    if (ty > DEEP_Y) return true;
    if (zone === 'ruin' || zone === 'works' || zone === 'runaway' || zone === 'atelier'
      || zone === 'deepshaft') return true;
    // 사막 지하 묘실은 DEEP_Y보다 얕은 곳에 있어 좌표로 따로 짚어야 한다 (중심 기준 크기)
    const d = this.world.dungeon;
    if (d && Math.abs(tx - d.x) <= d.w / 2 + 2 && Math.abs(ty - d.y) <= d.h / 2 + 2) return true;
    return false;
  },

  update(dt: number) { const { WW, WH } = dimsOf(this.world);
    /* ---- 손이 멈추는 한 박자(히트스톱) ---- */
    dt = this.timeScale.step(dt);   // 히트스톱 · 느린 화면(engine core/timescale)
    if (this.autosave && !this.net) this.autosave.tick(dt);
    this.time += dt;
    /* 플레이 시간(초). */
    if (this.state === 'play' && !this.paused) {
      this.tally = this.tally || {};
      const before = this.tally.play || 0;
      this.tally.play = before + dt;
      if ((before / 60 | 0) !== (this.tally.play / 60 | 0)) this.checkAch();
    }
    const nextDayT = (this.dayT + dt * 2) % 1440;
    /* ★ 참가자는 세계를 돌리지 않는다 — 몹·공장·날짜·사건은 호스트 것을 받는다(멀티플레이 설계 §3). */
    const guest = !!(this.net && this.net.role === 'guest');
    if (nextDayT < this.dayT && !guest) { this.dayCount++; this.updateEconomy(); this.growCropsDaily(); }
    this.dayT = nextDayT;
    this.readInput();
    const p = this.player, w = this.world;

    // 스킬 채널 중 이동 제한 등은 Player 내부에서 처리
    p.update(dt, w, this.input);
    if (this.net) this.netTick(dt);
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
    for (const q of this.players) if (q.remote && q.petEnts) for (const pet of q.petEnts) if (pet) pet.follow(dt, q);

    // 공격 / 채굴
    if (this.input.m1 && !this.uiOpen) this.leftHold(dt);
    else { p.mineTx = -1; p.mineProg = 0; }

    // 엔티티 — 길찾기는 프레임마다 몇 번만(몹이 몰려도 한 프레임이 길어지지 않게)
    this.pathBudget = PATH_BUDGET;
    for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i];
      const tp = this.nearestPlayer(e.cx, e.cy);
      if (e.ghost) this.netGhostStep(e, dt);   // 참가자 화면의 몹 — 호스트 것을 받아 그린다(AI 없음)
      else e.update(dt, w, tp);
      // 정예는 은은한 금빛 입자를 계속 흘려 눈에 띄게 한다 (평범한 놈이 아니라는 신호)
      if (e.elite && !e.dead && Math.random() < 0.2) this.parts.push(new Part(e.cx + (Math.random() - 0.5) * e.w, e.cy + (Math.random() - 0.5) * e.h, '#ffd24a', -34, 0.55));
      if (e.dead) this.ents.splice(i, 1);
      // 경비병은 마을 반대편 감시탑에 서 있어도 거리로 정리하면 안 된다 — 마을을 벗어날 때 따로 거둔다
      else if (!e.boss && !e.minion && !e.guard && dist2(e.cx, e.cy, tp.cx, tp.cy) > 2400 * 2400) this.ents.splice(i, 1);
    }
    this.entHash.rebuild(this.ents, (e: any) => e instanceof Enemy && !e.dead);   // 투사체가 근처 몹만 보게
    for (let i = this.projs.length - 1; i >= 0; i--) { this.projs[i].update(dt, w, p); if (this.projs[i].dead) this.projs.splice(i, 1); }
    for (let i = this.drops.length - 1; i >= 0; i--) { const d = this.drops[i]; d.update(dt, w, this.nearestPlayer(d.x, d.y)); if (this.drops[i].dead) this.drops.splice(i, 1); }
    /* ★ 잰 최고치는 257개라 PART_CAP(900)에 정상 전투로는 닿지 않지만, 난간이 없으면 언젠가 프레임으로 값을 치른다. */
    stepParticles(this.parts, dt, QUALITY[this.quality()].parts);   // engine fx/particles
    this.shapes.update(dt);
    this.vfx.density = QUALITY[this.quality()].parts / PART_CAP; this.vfx.update(dt);
    /* 대시 잔상 — 한순간에 멀리 가는 움직임을 눈이 따라가게(engine fx/trail) */
    this.trail.update(dt, (p.dashV > 0 || p.chargeT > 0) && !p.swimming, p.x, p.y, () => ({ fr: this.playerFrame(p), flip: p.facing < 0, key: 'player_' + CHAR_OF(p.charId).id }));
    this.walkDust(p);
    for (let i = this.corpses.length - 1; i >= 0; i--) if ((this.corpses[i].t += dt) >= this.corpses[i].dur) this.corpses.splice(i, 1);
    for (let i = this.texts.length - 1; i >= 0; i--) if (!this.texts[i].update(dt)) this.texts.splice(i, 1);
    this.tweens.update(dt);   // 미뤄 둔 일 · 값 옮기기(engine core/tween)

    // 스폰
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && !guest) {
      this.spawnTimer = 1.1;
      for (const q of this.players) { this.spawnFor = q; this.trySpawn(); }   // 플레이어마다 제 주변에
      this.spawnFor = null;
    }
    this.updateRigs(dt);

    // 공장 — 프레임률과 무관하게 고정 8틱/초로 돌린다
    this.facTimer = (this.facTimer || 0) - dt;
    /* 남은 시간을 이어 간다 — FAC_TICK 으로 되돌리면 60fps 에서 8프레임(0.133초)마다 돌아 벨트 1초가 1.07초가 되고,
       물건이 칸마다 가운데서 멈칫했다 */
    if (this.facTimer <= 0 && !guest) { this.facTimer = Math.max(this.facTimer + FAC_TICK, -FAC_TICK); Factory.tick(w, this); }

    // 고대 유적의 타일 함정 — 화면 근처만 훑는다
    this.trapTimer = (this.trapTimer || 0) - dt;
    if (this.trapTimer <= 0) { this.trapTimer = 0.2; this.tickTileTraps(); }
    if (!guest) for (const q of this.players) w.tickCrumble(dt, q);

    // 세계 이벤트 (붉은 달 · 모래폭풍 · 포자 개화 · 비)
    if (!guest) this.updateEvents(dt);
    this.updateWeather(dt);
    this.updateSmoke(dt);        // 용광로 굴뚝 연기

    this.checkRuinEntry();
    this.checkRuinEvent();
    this.updatePulse(dt);          // 유적의 맥박 · 탐사 기록 (아래 '유적의 맥박' 절)
    this.updatePuzzle(dt);         // 봉인 방(game/ruin-puzzle)
    this.updateBossHazards(dt);    // 보스 기술이 남긴 것(game/boss-hazards)
    this.updateCaves(dt);          // 동굴 갈래 · 낙석 · 무너지는 자갈 (아래 '동굴' 절)
    if (!guest) this.world.fluidTick(dt);   // 물·바닷물·용암이 흐른다 (world.js '유체' 절) — 참가자는 호스트 것을 받는다
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
      const gs = this.ents.filter((e: any) => e instanceof Guard);
      if (!inV) { for (const g of gs) g.dead = true; this.guardCd = 0; }
      else {
        this.guardCd = (this.guardCd || 0) - dt;
        const posts = (w.dawnCity.posts || [w.dawnCity.x0 - 12]);
        if (gs.length < posts.length && this.guardCd <= 0) {
          // 아직 아무도 안 선 초소를 찾아 세운다
          const taken = new Set(gs.map((g: any) => g.homeTx));
          const tx = posts.find((t: any) => !taken.has(t));
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
    if (this.growTimer <= 0 && !guest) { this.growTimer = 5; for (const q of this.players) w.regrow(this.rng, 4, Math.floor(q.cx / TS)); }

    // 카메라
    /* 달리는 쪽 · 떨어지는 아래쪽을 조금 더 보여 준다(engine Camera — 멈추면 천천히 가운데로 돌아온다) */
    this.cam.update(dt, p.cx - this.W / 2, p.cy - this.H / 2 - 30, p.vx, p.vy, WW * TS - this.W, WH * TS - this.H);
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

    /* 비석 — 닿으면 잃은 것의 절반을 돌려준다. ★ 쓰러진 몸은 비석 바로 위다 — 되살아난 뒤에만 줍는다
       (안 막으면 죽는 그 프레임에 되찾아 죽는 소리 위에 'chapter' 팡파르가 겹쳤다. 사연: docs/code-history.md#h149) */
    if (this.deathMark && this.player.hp > 0 && !this.scenes.has('death') && !this.scenes.has('mdeath')) {
      const dm = this.deathMark;
      if (!dm.g) { const g = this.graveGround(dm.x, dm.y + 16); dm.x = g.x; dm.y = g.y; dm.g = 1; }   // 옛 세이브는 몸 가운데였다
      const now = this.dayCount * 1440 + this.dayT;
      if (now - (dm.at || 0) >= 720) {          // 12시간 = 720분
        this.deathMark = null;
        this.toast(tr('비석이 잿빛에 삼켜졌다'), 'bad');
      } else if (dist(p.cx, p.cy, dm.x, dm.y - 16) < 70) {
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
  tickTileTraps() { const { WW, WH } = dimsOf(this.world);
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
  tickTileTrap2(def: any, x: any, y: any) {
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
mixin(Game.prototype, GameCore, true);

/** 이 페이지의 게임 — 아래층(world · entity · factory · ui)은 ctx.js 의 app 으로 이것을 본다 */
export const G: Bag = new Game();

bindApp(G);
addEventListener('DOMContentLoaded', () => G.init());
