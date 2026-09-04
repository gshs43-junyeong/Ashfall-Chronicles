/* ===== game.js — 루프 / 입력 / 렌더 / 진행 ===== */
'use strict';

const SAVE_KEY = 'ashfall_save_v3';   // v1: 640×232 · v2: 2800×480 — 세계 폭이 바뀌면 호환 불가
const SAVE_SLOTS = 3;
const slotKey = (i) => `${SAVE_KEY}_slot${i}`;
const SET_KEY = 'ashfall_settings';
/* 설정 기본값. 세이브와 별개로 저장되므로 새 게임을 시작해도 유지된다.
   view 는 시야 배율(%), keys 는 바꾼 조작키만 담는 표, notice 는 끈 알림만 담는 표 —
   둘 다 null 이면 "손댄 적 없음"이라 KEY_ACTIONS·NOTICE_KINDS 의 기본을 그대로 쓴다. */
const SET_DEFAULT = { music: 40, sfx: 50, shake: 100, dmgnum: 1, minimap: 1,
  view: 100, keys: null, notice: null };
// 완전한 암흑(0)은 지도에 남기지 않는다. 1 이상이면 횃불·용암·햇빛 등으로 최소한 보이는 상태다.
const MAP_REVEAL_LIGHT = 1;

const G = {
  cv: null, ctx: null, mm: null, mmx: null,
  W: 0, H: 0, cam: { x: 0, y: 0 },
  state: 'title',
  world: null, player: null, rng: new RNG(1),
  ents: [], projs: [], parts: [], texts: [], drops: [], pending: [],
  time: 0, dayT: 6 * 60, shake: 0, uiOpen: false,
  mode: 'normal',        // 새 게임에서 정하고 저장에 남는다. 설정에서 못 바꾼다.
  chapter: 0, boss: null,
  /* 제작 시설: nearSt는 지금 어떤 시설 앞에 서 있는가. 개조 단계(lv)는 이제 시설 개체마다
     따로 붙는다(o.lv) — 캠프 작업대를 올려도 마을 작업대는 그대로다. */
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
    // 전체 지도용 축소 버전 — 타일 하나당 1px. 실제로 화면에 그려진 칸만 여기 색이 입혀진다
    this.mapAtlas = document.createElement('canvas');
    this.mapAtlas.width = WW; this.mapAtlas.height = WH;
    this.mapAtlasX = this.mapAtlas.getContext('2d');
    addEventListener('resize', () => this.resize()); this.resize();
    TileArt.build();
    Art.build();
    UI.init();
    /* 다 불러올 때까지 로딩 화면을 띄워 둔다.
       예전에는 애셋을 붙이는 동안에도 타이틀이 그대로 떠 있어서, 배경 없는 맨 글자가
       먼저 보이고 몇 초 뒤에 그림이 툭 얹혔다. 이제 그림이 다 붙은 다음에 연다. */
    document.body.classList.add('booting');
    this.showLoading('불러오는 중…');
    if (typeof TitleBG !== 'undefined') TitleBG.init();
    // 손그림 애셋은 비동기로 붙인다 — 실패해도 절차 생성 렌더로 계속 동작
    if (window.Sprites) {
      Sprites.ready().then(() => {
        this.spritesOn = true;
        UI.applySpriteOverrides();
        // 손그림 타일 텍스처가 있으면 절차 생성 아틀라스의 해당 칸을 덮어 그린다
        for (const name in TILE_SPRITE) TileArt.applySprite(TILE_SPRITE[name], Sprites.img['tile_' + name]);
        // 아이템 아이콘도 같은 방식으로 — 아틀라스를 갈아 끼우면 UI와 캔버스가 함께 바뀐다
        if (Sprites.meta && Sprites.meta.items) {
          for (const id in Sprites.meta.items.files) Art.applyItemSprite(id, Sprites.img['item_' + id]);
          UI.refreshBag(); UI.refreshEquip();
        }
        if (typeof TitleBG !== 'undefined') TitleBG.useSprites();
      }).catch(e => { console.warn('sprite load failed, using procedural render', e); })
        .finally(() => this.bootDone());
    } else {
      this.bootDone();
    }
    // 애셋 하나가 영영 안 오더라도 로딩에 갇히지 않게 — 8초면 그냥 연다
    setTimeout(() => this.bootDone(), 8000);
    this.bindInput();
    this.loadSettings();
    if (window.Music) Music.armStart(() => this.pickBgm());
    this.migrateLegacySave();
    this.renderSlotScreen();
    /* 타이틀에는 버튼 넷만 둔다 — 저장 슬롯도, 캐릭터 선택도 팝업으로 뺐다.
       조작법은 설정 안으로 합쳤다(조작키 목록 바로 아래). */
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
    const openSettings = () => { UI.syncSettings(); $('#settings-screen').classList.add('open'); };
    $('#btn-settings-title').onclick = openSettings;
    $('#btn-settings-pause').onclick = openSettings;
    $('#btn-settings-close').onclick = () => $('#settings-screen').classList.remove('open');
    $('#btn-title').onclick = () => {
      this.setPause(false); this.state = 'title'; $('#title-screen').style.display = '';
      if (typeof TitleBG !== 'undefined') TitleBG.start();
      UI.bossBar(null); this.renderSlotScreen();
    };
    $('#btn-respawn').onclick = () => this.respawn();
    requestAnimationFrame(t => this.loop(t));
  },
  /** 설정의 시야 배율. 1 보다 크면 확대(좁게 보임), 작으면 축소(넓게 보임). */
  viewZoom() { return clamp((this.settings && this.settings.view || 100) / 100, 0.6, 1.6); },

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const z = this.viewZoom();
    this.cv.width = innerWidth * dpr; this.cv.height = innerHeight * dpr;
    /* W·H 는 이제 화면 픽셀이 아니라 **월드 좌표계로 본 시야 크기**다. 확대는 캔버스
       변환이 통째로 처리하므로, 카메라·타일 범위·컬링에서 W·H 를 쓰던 코드는 그대로
       둬도 맞는다. 미니맵은 제 캔버스(MW/MH)로 계산하므로 여기 영향을 받지 않는다 —
       "미니맵 범위는 변하면 안 된다"는 요구가 이 구조로 저절로 지켜진다. */
    this.W = innerWidth / z; this.H = innerHeight / z;
    this.ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  },

  /* ================= 입력 ================= */
  /** 이 액션에 걸린 키 목록. 설정에서 바꿨으면 그것을, 아니면 기본값을 쓴다. */
  keysFor(id) {
    const custom = this.settings && this.settings.keys && this.settings.keys[id];
    if (custom && custom.length) return custom;
    const a = KEY_ACTIONS.find(k => k.id === id);
    return a ? a.def : [];
  },
  /** 지금 눌려 있는가 */
  held(id) { const K = this.keys; return this.keysFor(id).some(c => K[c]); },
  /** 방금 눌린 code 가 이 액션인가 */
  isKey(id, code) { return this.keysFor(id).indexOf(code) >= 0; },

  bindInput() {
    const K = {};
    this.keys = K;
    addEventListener('keydown', e => {
      if (e.repeat) { K[e.code] = 1; return; }
      // 조작키를 다시 매기는 중이면 그 키를 여기서 삼킨다
      if (UI.captureKey && UI.captureKey(e.code)) { e.preventDefault(); return; }
      K[e.code] = 1;
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
      else if (this.isKey('save', k)) { e.preventDefault(); this.saveGame(); }
      else if (k.startsWith('Digit')) {
        const n = +k.slice(5); this.player.sel = (n === 0 ? 9 : n - 1); UI.refreshHotbar();
      }
      else if (!UI.dlg && !UI.open) {
        if (this.isKey('skill1', k)) this.player.useSkill(0, this.input.wx, this.input.wy);
        else if (this.isKey('skill2', k)) this.player.useSkill(1, this.input.wx, this.input.wy);
        else if (this.isKey('skill3', k)) this.player.useSkill(2, this.input.wx, this.input.wy);
        else if (this.isKey('skill4', k)) this.player.useSkill(3, this.input.wx, this.input.wy);
      }
    });
    addEventListener('keyup', e => { K[e.code] = 0; });
    addEventListener('blur', () => { for (const k in K) K[k] = 0; this.input.m1 = this.input.m2 = 0; });

    this.cv.addEventListener('mousedown', e => {
      e.preventDefault();
      if (e.button === 0) this.input.m1 = 1; if (e.button === 2) this.input.m2 = 1;
      if (e.button === 2) this.rightClick();
    });
    addEventListener('mouseup', e => { if (e.button === 0) this.input.m1 = 0; if (e.button === 2) this.input.m2 = 0; });
    addEventListener('mousemove', e => { this.input.mx = e.clientX; this.input.my = e.clientY; });
    this.cv.addEventListener('contextmenu', e => e.preventDefault());
    this.cv.addEventListener('wheel', e => {
      if (this.state !== 'play') return;
      const p = this.player;
      p.sel = (p.sel + (e.deltaY > 0 ? 1 : -1) + HOTBAR) % HOTBAR;
      UI.refreshHotbar();
    }, { passive: true });
    $('#dialogue').addEventListener('click', () => { if (UI.dlg) UI.nextLine(false); });
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

  /** 애셋이 다 붙었다 — 로딩을 걷고 타이틀을 연다 (한 번만) */
  bootDone() {
    if (this.booted) return;
    this.booted = true;
    /* 글꼴까지 기다린다. 안 그러면 로고가 기본 글꼴로 한 번 그려졌다가 바뀐다. */
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    fonts.catch(() => {}).then(() => {
      document.body.classList.remove('booting');
      if (this.state === 'title' && typeof TitleBG !== 'undefined') TitleBG.start();
      const el = $('#loading');
      el.classList.add('fade');
      setTimeout(() => { if (el.classList.contains('fade')) el.classList.remove('open', 'fade'); }, 480);
    });
  },

  newGame(seedStr, slot, name, charId, mode) {
    const seed = seedStr || ('' + Math.floor(Math.random() * 1e9));
    this.currentSlot = slot;
    this.showLoading('세계를 빚는 중…');
    // 다음 프레임에 생성해서 로딩 화면이 먼저 그려지게 한다
    setTimeout(() => { try { this._newGame(seed, name, charId, mode); } finally { this.hideLoading(); } }, 40);
  },
  _newGame(seed, name, charId, mode) {
    this.rng = new RNG(seed + '_g');
    this.world = new World(seed).generate();
    this.player = new Player(this.world.spawnX * TS, (this.world.spawnY - 2) * TS);
    const p = this.player;
    p.name = (name || '').trim().slice(0, 12) || '이름 없는 모험가';
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
    this.guardCd = 0; this.facTimer = 0; this.cropTimer = 0;   // 새로 시작할 때 남아 있던 대기 시간을 지운다
    this.chapter = 0; this.dayT = 7 * 60; this.time = 0; this.boss = null;
    this.talked = {}; this.crafted = {}; this.paused = false;
    this.sideActive = {}; this.sideDone = {}; this.tabletsRead = {}; this.termsRead = {}; this.loreRead = {};
    this.deathMark = null;
    this.villageUnlocked = false; this.goldRate = 1; this.market = {}; this.dayCount = 0; this.trainedToday = 0;
    this.nearStObj = { work: null, forge: null };
    this.event = null; this.eventRolled = -1; this.lairs = {}; this.seenRuins = {}; this.ruinMarks = {}; this.ruinEvDone = {}; this.trapTimer = 0;
    this.rainT = 0; this.rainDrops = null;
    this.vault = new Array(VAULT_SIZE).fill(null); this.vaultGold = 0; this.bounties = [];
    this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
    this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    $('#title-screen').style.display = 'none';
    if (typeof TitleBG !== 'undefined') TitleBG.stop();   // 화면 밖이면 프레임을 낭비하지 않는다
    this.closeAllModals();
    this.state = 'play';
    this.petEnts = []; this.syncPets();
    UI.refreshBag(); UI.refreshEquip(); UI.refreshTracker(); UI.refreshSkillbar(); UI.refreshStatAlloc();
    UI.chapterCard(CHAPTERS[0]);
    setTimeout(() => UI.storyScene(CHAPTERS[0], 'intro'), 4000);   // 서장 도입부를 실제로 읽힌다
    this.toast('별이 떨어진 다음 날 아침이다.');
    this.audioInit();
    this.buildMapAtlas();
    // 디버그 바로가기 — 주소 끝에 ?debug=village를 붙이고 "새로운 여정"을 누르면
    // 종장을 안 깨도 여명 마을이 바로 열리고 그 앞에서 시작한다. 확인 전용, 정상
    // 플레이에는 영향 없음(파라미터가 없으면 이 블록은 그냥 안 탄다).
    // &lv=2 또는 &lv=3을 붙이면 그 단계까지(2층 증축, 3단계 성벽) 미리 올려서 시작한다.
    const qs = new URLSearchParams(location.search);
    if (qs.get('debug') === 'village') {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      const lv = +qs.get('lv') || 1;
      if (lv >= 2) this.world.upgradeVillage(2);
      if (lv >= 3) this.world.upgradeVillage(3);
      const d = this.world.dawnCity;
      // 3단계면 서쪽 성문 앞에 세운다 — 마을에 들어서는 순간 성벽이 바로 보인다
      if (lv >= 3) { p.x = (d.x0 + DAWN_WALL.leftOff + 4) * TS; p.y = (d.gy - 3) * TS; }
      else { p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; }
      p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
    }
  },

  /* ================= 루프 ================= */
  loop(t) {
    requestAnimationFrame(t2 => this.loop(t2));
    const now = t / 1000;
    const rawDt = now - (this.last || now);
    let dt = Math.min(0.033, rawDt);
    this.last = now;
    if (this.state === 'play' && !this.paused) { this.update(dt); }
    if (this.state === 'play') this.render();
    // 배경음악은 일시정지/타이틀과 무관하게 항상 갱신해야 크로스페이드가 끊기지 않는다.
    // dt(위, 0.033초로 물리용으로 잘라 둔 값)를 그대로 쓰면 탭이 백그라운드로 가서
    // rAF가 느려지거나 멎어 있던 동안 진행됐어야 할 크로스페이드가 탭이 돌아온 뒤에도
    // 프레임당 33ms씩만 흘러 사실상 멈춘 것처럼 들린다("긴장 상태 브금 전환이 안 된다"는
    // 제보의 원인) — 페이드에는 실제로 흐른 시간(rawDt)을 그대로 준다.
    if (window.Music) { Music.update(Math.min(rawDt, 3)); Music.play(this.pickBgm()); }
    // 환경음(폭포·호수)은 실제 플레이 중이고 안 멈춰 있을 때만 — 아니면 페이드아웃되게 dt만 흘려보낸다
    if (window.Ambient) {
      const active = this.state === 'play' && !this.paused && !!this.world && !!this.player;
      Ambient.updateFromWorld(this.world, this.player, dt, active);
    }
  },

  /** 지금 상황에 맞는 배경음악 키를 고른다 (music.js의 BGM 테이블과 짝) */
  pickBgm() {
    if (this.state !== 'play' || !this.player || !this.world) return 'title';
    if (this.boss) return 'boss';
    const p = this.player, w = this.world;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    // 베이스캠프는 기본 브금을 그대로 쓰고(낮/밤 전환도 평소처럼 적용), 여명 마을에만
    // 승리의 칩튠을 튼다 — 마을에서는 비가 와도 이 곡이 우선한다(보스전 다음으로 높은 우선순위)
    const d = w.dawnCity;
    const inDawn = d && tx > d.x0 - 20 && tx < d.x1 + 20 && Math.abs(ty - d.gy) < 20;
    if (inDawn) return 'village';

    const zone = w.zoneAt(tx, ty);
    const lowHp = p.hp / p.d.maxHp < 0.3;
    const raining = !!(this.event && this.event.id === 'rain' && this.eventActive());

    // 부유 성채도 하늘 곡을 쓴다 — 하늘 위에 떠 있는 유적이라서
    if (zone === 'citadel') return (lowHp || raining) ? 'tense' : 'sky';
    // 하늘 섬 — 고도로만 갈리는 구역이라 지상 판정보다 먼저 본다
    if (zone === 'sky' || ty < SKY_Y) return 'sky';

    // 던전·유적·심층은 전부 카타콤 한 곡으로 통일한다. 다만 실제로 위험한 상황
    // (저체력·폭우)에서는 긴장 곡이 이긴다. 밤과 어둠은 뺐다 — 지하에서는 늘 참이라
    // 그대로 두면 이 곡이 영영 나오지 않는다.
    if (this.inCatacomb(tx, ty, zone)) return (lowHp || raining) ? 'tense' : 'catacomb';

    // 비는 평소 몬스터를 강화하는 위협 이벤트다. 마을 밖에서 실제로 비가 닿는 곳이면
    // 긴장 상태 BGM(clockwork_hollow)을 우선한다.
    if (raining) return 'tense';
    const night = this.dayT < 5 * 60 || this.dayT > 19 * 60;
    const dark = w.lightAt(tx, ty) < 4;
    if (night || dark || lowHp) return 'tense';

    // 여명 마을 동쪽 — 버섯 골짜기와 부패한 땅
    if (zone === 'glowfen' || zone === 'corrupt') return 'east';
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
    this.time += dt;
    const nextDayT = (this.dayT + dt * 2) % 1440;
    if (nextDayT < this.dayT) { this.dayCount++; this.updateEconomy(); }
    this.dayT = nextDayT;
    this.readInput();
    const p = this.player, w = this.world;

    // 스킬 채널 중 이동 제한 등은 Player 내부에서 처리
    p.update(dt, w, this.input);
    this.updateFishing(dt);
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
    for (let i = this.texts.length - 1; i >= 0; i--) if (!this.texts[i].update(dt)) this.texts.splice(i, 1);
    for (let i = this.pending.length - 1; i >= 0; i--) { this.pending[i].t -= dt; if (this.pending[i].t <= 0) { this.pending[i].fn(); this.pending.splice(i, 1); } }

    // 스폰
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = 1.1; this.trySpawn(); }

    // 공장 — 프레임률과 무관하게 고정 8틱/초로 돌린다
    this.facTimer = (this.facTimer || 0) - dt;
    if (this.facTimer <= 0) { this.facTimer = FAC_TICK; Factory.tick(w, this); }

    // 고대 유적의 타일 함정 — 화면 근처만 훑는다
    this.trapTimer = (this.trapTimer || 0) - dt;
    if (this.trapTimer <= 0) { this.trapTimer = 0.2; this.tickTileTraps(); }
    w.tickCrumble(dt, p);

    // 세계 이벤트 (붉은 달 · 모래폭풍 · 포자 개화 · 비)
    this.updateEvents(dt);
    this.updateWeather(dt);

    // 작물 — 심어 둔 것만 훑으므로 플레이어가 어디 있든 자란다
    this.cropTimer = (this.cropTimer || 0) - dt;
    if (this.cropTimer <= 0) {
      this.cropTimer = 4;
      /* 밭은 여태 아무 기별 없이 조용히 자랐다 — 4초마다 타일만 바뀌니, 보고 있어도
         뭐가 일어나는지 알 수가 없었다. 자란 칸에서 잎이 튀고, 다 여문 칸에서는
         금빛이 튄다. 화면 밖은 건너뛴다(밭 하나에 수백 칸이 될 수 있다). */
      const g = w.growCrops(this.rng, this.dayFactor());
      const onScreen = (x, y) => Math.abs(x * TS - this.cam.x - this.W / 2) < this.W / 2 + TS &&
                                 Math.abs(y * TS - this.cam.y - this.H / 2) < this.H / 2 + TS;
      for (const k of g.grew) {
        const x = k % WW, y = (k / WW) | 0;
        if (!onScreen(x, y)) continue;
        for (let i = 0; i < 2; i++)
          this.parts.push(new Part((x + .5) * TS, (y + .6) * TS, '#8fc85a', -18, .45));
      }
      for (const k of g.ripe) {
        const x = k % WW, y = (k / WW) | 0;
        if (!onScreen(x, y)) continue;
        for (let i = 0; i < 5; i++)
          this.parts.push(new Part((x + .5) * TS, (y + .5) * TS, '#ffe08a', -26, .6));
      }
    }

    this.checkRuinEntry();
    this.checkRuinEvent();
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
    // 시설끼리 가까이 붙어 있어도 서로 넘나들며 못 쓰게, 반경을 좁히고 가장 가까운
    // "그 개체"만 붙잡는다 — 업그레이드도 이 개체 하나에만 적용된다
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

    /* 비석 — 닿으면 잃은 것의 절반을 돌려준다. 게임 시간 12시간이 지나면 사라진다.
       절반만 주는 것은 "돌아갈 이유는 주되 죽음을 공짜로 만들지 않는다"는 선이다. */
    if (this.deathMark) {
      const dm = this.deathMark;
      const now = this.dayCount * 1440 + this.dayT;
      if (now - (dm.at || 0) >= 720) {          // 12시간 = 720분
        this.deathMark = null;
        this.toast('비석이 잿빛에 삼켜졌다', 'bad');
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
        if (gxp) bits.push(`경험치 ${fmt(gxp)}`);
        if (ggold) bits.push(`금화 ${fmt(ggold)}`);
        if (back.length) bits.push(`물건 ${back.length}칸`);
        this.toast(bits.length ? bits.join(' · ') + '을 되찾았다' : '쓰러졌던 자리로 돌아왔다', 'good');
        if (dropped) this.toast('가방이 차서 일부는 바닥에 떨어졌다', 'info');
        UI.refreshBag();
        this.sfx('chapter');
      }
    }

    this.mmTimer -= dt;
    if (this.mmTimer <= 0) { this.mmTimer = 0.25; if (this.settings.minimap) this.drawMinimap(); }
  },

  /* ---- 고대 유적 함정 ----
     기계 체계를 쓰지 않는다. 세션 1의 유적은 기계 문명 이전 것이라 저장할 상태가 없어야 하고,
     그래서 타일 좌표 해시로 각자 다른 박자를 만들어 낸다. 같은 자리는 언제 와도 같은 박자다. */
  tickTileTraps() {
    const w = this.world, p = this.player;
    const cx = Math.floor(p.cx / TS), cy = Math.floor(p.cy / TS);
    const R = 26;                                   // 화면 언저리만
    const x0 = Math.max(1, cx - R), x1 = Math.min(WW - 2, cx + R);
    const y0 = Math.max(1, cy - 18), y1 = Math.min(WH - 2, cy + 18);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const def = TILE_DEF[w.get(x, y)];
        if (!def.tdart && !def.tvent && !def.tcoil && !def.tgas && !def.tgrind) continue;
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
        } else {
          // 분출구는 위로 3칸을 태운다. 예고 없이 터지지 않도록 앞부분에 불씨가 보인다
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

  /** v1.1 새 함정 셋. tickTileTraps 의 자리별 위상(tileHash)을 그대로 쓴다 —
      같은 자리는 언제 와도 같은 박자라, 외워서 지나갈 수 있어야 함정이 함정이다. */
  tickTileTrap2(def, x, y) {
    const w = this.world, p = this.player;
    const ph = tileHash(x, y);
    if (def.tcoil) {
      /* 방전 코일 — 마주 보는 코일을 찾아 그 사이에 아크를 놓는다.
         짝이 없으면 아무 일도 안 한다(혼자 선 코일은 장식). */
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
      // 가스 분출 — 위로 다섯 칸까지 넓게 퍼진다. 예고가 길어 지나갈 틈을 잴 수 있다
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
      // 톱니 — 벽에서 두 칸 튀어나온다. 벽에 붙어 걷지 못하게 만든다
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
      if (Math.random() < 0.2) this.sfxAt('mine', x, y);
    }
  },

  /* ================= 좌클릭: 채굴 또는 공격 ================= */
  leftHold(dt) {
    const p = this.player, w = this.world;
    const held = p.held();
    const hd = held && idef(held);
    if (hd && hd.type === 'tool') { this.mine(dt, hd); return; }
    /* 낚싯대를 들고 좌클릭하면 아무 일도 없어야 한다. 예전에는 장착 무기로 공격이
       나갔는데, 이제 손에 실제로 낚싯대가 그려지므로 보이지 않는 검이 허공을 베는 꼴이
       된다. 싸우려면 핫바에서 무기로 바꾸면 된다(숫자 키 하나). */
    if (hd && hd.type === 'rod') return;
    if (p.attackReady()) p.doAttack(this.input.wx, this.input.wy);
  },
  mine(dt, tool) {
    const p = this.player, w = this.world;
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { p.mineTx = -1; return; }
    /* 내가 놓은 설치물이 겨눈 자리에 있으면 그것부터 걷어낸다 — 타일이 아니라
       오브젝트라서 아래의 타일 채굴 로직으로는 잡히지 않는다. 기계 회수와 같이
       한 번 누르면 끝나므로 연타로 중복 회수되지 않게 짧은 간격을 둔다. */
    {
      const o = this.findObjAt(this.input.wx, this.input.wy);
      if (o && o.placed && OBJ_SIZE[o.type]) {
        p.mineTx = -1; p.mineProg = 0;
        if (this.time - (this._stRm || -9) < 0.3) return;
        this._stRm = this.time;
        this.removeStation(o);
        return;
      }
    }
    const id = w.get(tx, ty);
    const def = TILE_DEF[id];
    if (id === T.AIR || !def.drop) { p.mineTx = -1; return; }
    // 기계는 곡괭이 등급과 무관하게 한 번에 회수된다 — 안에 든 것도 같이 돌려준다.
    // 좌클릭을 누르고 있으면 매 프레임 들어오므로 짧은 간격을 둔다
    if (MACH_OF_TILE[id]) {
      p.mineTx = -1; p.mineProg = 0;
      if (this.time - (this._machRm || -9) < 0.25) return;
      this._machRm = this.time;
      const back = Factory.remove(w, tx, ty);
      if (back) for (const it of back) this.drops.push(new Drop((tx + .5) * TS, (ty + .5) * TS, it));
      for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, (ty + .5) * TS, def.c));
      this.sfx('mine');
      return;
    }
    if (def.hard > (tool.power || 1) + (def.tree ? 2 : 0)) {
      p.mineTx = -1;
      if (!this._pickWarn || this.time - this._pickWarn > 1.5) { this._pickWarn = this.time; this.toast('더 좋은 곡괭이가 필요하다', 'bad'); }
      return;
    }
    if (p.mineTx !== tx || p.mineTy !== ty) { p.mineTx = tx; p.mineTy = ty; p.mineProg = 0; }
    const rate = (0.6 + (tool.power || 1) * 0.55 + (tool.chop && def.tree ? 2 : 0)) / (0.45 + def.hard * 0.5);
    p.mineProg += rate * dt;
    if (Math.random() < dt * 12) this.parts.push(new Part((tx + .5) * TS, (ty + .5) * TS, def.c));
    if (p.mineProg >= 1) {
      // 동력 곡괭이는 한 칸 캘 때마다 전하를 먹는다
      if (tool.pw && !p.useCharge(tool.pw)) {
        p.mineProg = 0;
        if (!this._pwWarn || this.time - this._pwWarn > 1.5) { this._pwWarn = this.time; this.toast('전하가 없다 — 충전된 배터리가 필요하다', 'bad'); }
        return;
      }
      p.mineProg = 0;
      w.set(tx, ty, T.AIR);
      p.mined[id] = (p.mined[id] || 0) + 1;
      this.dropTile(tx, ty, id);
      // 다 여문 작물은 씨앗을 함께 돌려준다 — 한 번 시작하면 밭이 저절로 이어지도록
      if (def.crop) {
        w.crops.delete(ty * WW + tx);
        if (def.crop.ripe) {
          const n = 1 + (Math.random() < 0.5 ? 1 : 0);
          this.drops.push(new Drop((tx + .5) * TS, (ty + .5) * TS, makeItem(def.crop.seed, n)));
        }
      }
      for (let i = 0; i < 5; i++) this.parts.push(new Part((tx + .5) * TS, (ty + .5) * TS, def.c));
      if (def.tree) this.fellTree(tx, ty, id === T.WOOD);
      // 다 여문 작물이면 harvest, 그 밖엔 전부 기존 mine
      this.sfx(def.crop && def.crop.ripe ? 'harvest' : 'mine');
    }
  },

  /** 타일 하나가 부서질 때 떨어질 것을 굴린다. 잎은 leafDrop 가중치 표를 따로 타서
      대부분 빈손이고 바이옴별 재료가 낮은 확률로 섞인다('none'이면 아무것도 안 나온다). */
  dropTile(x, y, id) {
    const d = TILE_DEF[id];
    let out = d.drop;
    if (d.leafDrop) { const r = this.rng.weighted(d.leafDrop); out = r === 'none' ? null : r; }
    if (out) this.drops.push(new Drop((x + .5) * TS, (y + .5) * TS, makeItem(out, 1)));
  },

  /** 벌목 — 기둥을 자르면 잘린 높이 위쪽 기둥이 통째로 무너지고, 그 결과 살아 있는
      기둥에서 완전히 떨어져 나간 잎 "덩어리"가 통째로 함께 떨어진다.

      잎을 한 장씩 보고 "기둥에 붙어 있나"를 따지지 않는 이유: 수관은 기둥에서 반경
      2~5칸으로 퍼져 있어서, 개별 타일 기준으로는 아직 멀쩡한 나무조차 바깥쪽 잎
      대부분이 처음부터 "기둥에 안 닿음"으로 잡힌다. 그래서 서로 맞닿은 잎을 한
      덩어리로 묶고, 그 덩어리가 어디 한 군데라도 기둥에 닿아 있으면 통째로 살린다. */
  fellTree(tx, ty, wasTrunk) {
    const w = this.world;
    const leafy = id => !!TILE_DEF[id].leaf;

    // 1) 기둥 — 잘린 높이(ty)와 그 위쪽만 무너진다. 아래는 그루터기로 남는다.
    //    폭이 2칸인 나무도 있어서 같은 높이의 옆 기둥으로도 번져야 하는데, 세계 생성은
    //    나무 간격을 따로 안 봐서(특히 정글은 열마다 34% 확률) 기둥끼리 맞붙어 서 있는
    //    일이 흔하다. 가로 번짐을 안 막으면 한 번 찍었을 때 맞붙은 숲이 줄줄이 쓰러진다.
    if (wasTrunk) {
      const st = [[tx, ty - 1], [tx - 1, ty], [tx + 1, ty]];
      let guard = 0;
      while (st.length && guard++ < 600) {
        const [x, y] = st.pop();
        if (y > ty || Math.abs(x - tx) > 3 || w.get(x, y) !== T.WOOD) continue;
        w.set(x, y, T.AIR);
        this.dropTile(x, y, T.WOOD);
        st.push([x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]);
      }
    }

    // 2) 잎 덩어리 — 잘린 자리 주변만 훑는다(가장 큰 정글 수관이 반경 5, 높이 13).
    const R = 9, seen = new Set();
    for (let y = ty - 22; y <= ty + R; y++) {
      for (let x = tx - R; x <= tx + R; x++) {
        const id0 = w.get(x, y);
        if (!leafy(id0) || seen.has(y * WW + x)) continue;
        const group = [], st = [[x, y]];
        seen.add(y * WW + x);
        let touching = false, guard = 0;
        while (st.length && guard++ < 900) {
          const [cx, cy] = st.pop();
          group.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy, nid = w.get(nx, ny);
            if (nid === T.WOOD) { touching = true; continue; }
            if (!leafy(nid)) continue;
            const k = ny * WW + nx;
            if (seen.has(k)) continue;
            seen.add(k); st.push([nx, ny]);
          }
        }
        if (touching) continue;                 // 아직 기둥에 걸려 있다 — 살린다
        for (const [gx, gy] of group) {
          const gid = w.get(gx, gy);
          w.set(gx, gy, T.AIR);
          this.dropTile(gx, gy, gid);
          // 그 잎에 매달려 있던 덩굴도 같이 쏟아진다
          for (let v = 1; v <= 8 && w.get(gx, gy + v) === T.VINE; v++) {
            w.set(gx, gy + v, T.AIR);
            this.dropTile(gx, gy + v, T.VINE);
          }
        }
      }
    }
  },

  /* ================= 우클릭 ================= */
  rightClick() {
    if (this.state !== 'play' || this.uiOpen) return;
    const p = this.player, w = this.world;
    // 1) 상호작용 대상
    const o = this.findObjAt(this.input.wx, this.input.wy);
    if (o && dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2) < TS * 7) { this.interact(o); return; }
    // 1.5) 낚싯대 — 물 블록을 겨눠야 캐스팅된다
    {
      const heldR = p.held();
      if (heldR && idef(heldR).type === 'rod') { this.tryFish(); return; }
    }
    /* 1.6) 소비품 — 핫바에 든 채로 바로 먹는다. 예전에는 물약 한 모금 마시려고 매번
       가방을 열었다 닫아야 했는데, 정작 급한 건 싸우는 도중이라 그 사이에 죽는다.
       상호작용 대상(위 1번)이 먼저라 상자 앞에서 물약을 들고 있어도 상자가 열린다. */
    {
      const hc = p.held();
      if (hc && idef(hc).type === 'consum') { this.useConsumable(p.sel); return; }
      // 1.7) 유적 위치 지도 — 펴 보면 그 유적 자리가 나침반에 잡힌다
      if (hc && idef(hc).type === 'map') { this.useRuinMap(p.sel); return; }
    }
    // 2) 기계: 이미 놓인 것은 열고, 손에 든 것은 설치한다
    const mtx = Math.floor(this.input.wx / TS), mty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (mtx + .5) * TS, (mty + .5) * TS) <= TS * 7) {
      const mac = Factory.at(w, mtx, mty);
      if (mac) { UI.openMachine(mac); this.sfx('open'); return; }
      const hi = p.held();
      if (hi && idef(hi).type === 'machine') {
        if (!Factory.canPlace(w, mtx, mty)) { this.toast('그 자리에는 놓을 수 없다', 'bad'); return; }
        // 설치 방향은 플레이어가 보고 있는 쪽 — 벨트를 깔면서 걸으면 자연히 이어진다
        const dir = p.facing >= 0 ? 0 : 2;
        const placed = Factory.place(w, mtx, mty, idef(hi).mach, dir);
        // 발사형 함정은 누가 놓았는지에 따라 편이 갈린다 — 내가 놓은 건 적을 쏜다
        if (placed && MACHINE[placed.t].proj) placed.own = 1;
        hi.c--; if (hi.c <= 0) p.bag[p.sel] = null;
        UI.refreshBag(); this.sfx('place');
        return;
      }
    }
    // 3) 농사 — 괭이로 밭을 갈고, 씨앗을 심고, 퇴비를 준다
    if (dist(p.cx, p.cy, (mtx + .5) * TS, (mty + .5) * TS) <= TS * 6) {
      const hi = p.held();
      const hd = hi && idef(hi);
      if (hd && hd.hoe) {
        const t = w.get(mtx, mty);
        if ((t === T.DIRT || t === T.GRASS || t === T.SNOW || t === T.CORRUPTGRASS) && w.get(mtx, mty - 1) === T.AIR) {
          w.set(mtx, mty, T.FARMLAND);
          for (let i = 0; i < 5; i++) this.parts.push(new Part((mtx + .5) * TS, mty * TS, '#6b4a2f'));
          this.sfx('hoe');
        } else this.toast('흙이나 풀 위에서만 밭을 갈 수 있다', 'bad');
        return;
      }
      if (hd && hd.type === 'seed') {
        if (hd.fert) {                               // 퇴비 — 자라는 중인 작물을 한 단계 밀어 준다
          if (!w.forceGrow(mtx, mty)) { this.toast('다 자란 작물에는 쓸 수 없다', 'bad'); return; }
          for (let i = 0; i < 8; i++) this.parts.push(new Part((mtx + .5) * TS, (mty + .5) * TS, '#8fd06a', -40));
        } else {
          if (!w.plantSeed(mtx, mty, hi.id)) { this.toast('갈아 둔 밭 위에만 심을 수 있다', 'bad'); return; }
        }
        hi.c--; if (hi.c <= 0) p.bag[p.sel] = null;
        UI.refreshBag(); this.sfx('place');
        return;
      }
    }

    // 3.5) 설치물(작업대·용광로·저장 상자) 놓기
    {
      const hi = p.held();
      if (hi && idef(hi).type === 'station') { this.placeStation(mtx, mty); return; }
    }

    // 4) 블록 설치
    const held = p.held();
    if (held && idef(held).type === 'block') {
      const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
      if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) return;
      if (w.get(tx, ty) !== T.AIR) return;
      const near = w.get(tx - 1, ty) || w.get(tx + 1, ty) || w.get(tx, ty - 1) || w.get(tx, ty + 1) || w.wall(tx, ty);
      if (!near) return;
      const tileId = idef(held).tile;
      if (TILE_DEF[tileId].solid === 1 && aabb({ x: tx * TS, y: ty * TS, w: TS, h: TS }, p.rect())) return;
      w.set(tx, ty, tileId);
      held.c--; if (held.c <= 0) p.bag[p.sel] = null;
      UI.refreshBag(); this.sfx('place');
    }
  },
  /* ================= 설치물 =================
     작업대·용광로·저장 상자는 타일이 아니라 w.objects에 얹히는 물건이라, 블록 설치나
     기계 설치와는 다른 경로가 필요하다. 한 칸 규격(OBJ_SIZE)이라 타일 하나를 차지한다. */
  /** tx,ty는 커서가 가리키는 칸 — 발자국의 **왼쪽 아래** 칸으로 삼는다(1칸짜리 상자류는
      그대로 그 칸 하나). 2칸 이상인 시설(작업대·용광로)은 거기서 오른쪽·위쪽으로
      칸을 넓혀 자리를 잡는다. tw×th 전체가 비어 있고, 바로 아래 바닥이 그 폭만큼
      전부 있고, 다른 설치물·NPC와도 안 겹칠 때만 놓인다 — 발자국 전체를 검사하므로
      2칸짜리를 좁은 곳에 욱여넣어 반쪽이 벽이나 다른 물건에 박히는 일이 없다. */
  placeStation(tx, ty) {
    const p = this.player, w = this.world;
    const it = p.held(), d = idef(it);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast('너무 멀다', 'bad'); return; }
    const s = OBJ_SIZE[d.obj];
    const tw = s.tw || 1, th = s.th || 1;
    const x0 = tx, y0 = ty - th + 1;   // 발자국 좌상단
    for (let yy = y0; yy <= ty; yy++) for (let xx = x0; xx < x0 + tw; xx++) {
      if (w.get(xx, yy) !== T.AIR) { this.toast('빈 자리에만 놓을 수 있다', 'bad'); return; }
      if (Factory.at(w, xx, yy)) { this.toast('이미 기계가 있다', 'bad'); return; }
    }
    for (let xx = x0; xx < x0 + tw; xx++)
      if (!w.solid(xx, ty + 1)) { this.toast('바닥이 있어야 놓을 수 있다', 'bad'); return; }
    // 이미 다른 설치물·NPC가 그 자리를 쓰고 있는지 — 발자국 전체(px)로 검사한다
    const box = { x: x0 * TS, y: y0 * TS, w: tw * TS, h: th * TS };
    for (const o of w.objects) {
      if (!OBJ_SIZE[o.type] && o.type !== 'npc') continue;
      if (aabb(box, { x: o.x, y: o.y, w: o.w, h: o.h })) { this.toast('그 자리에는 놓을 수 없다', 'bad'); return; }
    }
    const o = {
      type: d.obj, placed: 1,
      x: Math.round(x0 * TS + (tw * TS - s.w) / 2), y: (ty + 1) * TS - s.h, w: s.w, h: s.h
    };
    if (d.obj === 'crate') { o.slots = d.slots; o.items = new Array(d.slots).fill(null); if (d.gold) o.gold = 1; }
    else o.lv = 1;
    w.objects.push(o);
    it.c--; if (it.c <= 0) p.bag[p.sel] = null;
    for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, (ty + .5) * TS, '#d8b06a', -30, .5));
    UI.refreshBag(); this.sfx('place');
  },
  /** 설치물 회수 — 곡괭이 등급과 무관하게 한 번에 걷어낸다(기계와 같은 감각).
      상자 안에 든 것도 같이 돌려주므로 잃어버릴 걱정 없이 옮겨 놓을 수 있다.
      단, 세계가 처음부터 놓아 둔 것(placed 플래그가 없는 것)은 손대지 않는다 —
      마을·캠프의 시설이나 유적 상자까지 걷어 가면 지형이 망가진다. */
  removeStation(o) {
    const p = this.player, w = this.world;
    if (!o.placed) return false;
    const back = [];
    if (o.type === 'crate') {
      back.push(makeItem(o.gold ? 'crate_gold' : 'crate_wood', 1));
      for (const it of (o.items || [])) if (it) back.push(it);
    } else back.push(makeItem(o.type === 'forge' ? 'station_forge' : 'station_work', 1));
    for (const it of back) if (!p.addItem(it)) this.drops.push(new Drop(o.x + o.w / 2, o.y + o.h / 2, it));
    const i = w.objects.indexOf(o);
    if (i >= 0) w.objects.splice(i, 1);
    for (let k = 0; k < 8; k++) this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#c8a04a'));
    UI.refreshBag(); this.sfx('mine');
    return true;
  },

  /* ================= 낚시 =================
     p.fish = null | { tx, ty, t, biting, bite, rodId, rareMul }
     캐스팅 → 대기(t) → 입질(biting, bite 창) → 자동 해소, 또는 입질 중 우클릭으로 즉시 챔질(보너스).
     미끼(생고기) 소모는 판정 순간에만 일어나, 입질 전에 거두면 미끼를 잃지 않는다. */
  tryFish() {
    const p = this.player, w = this.world;
    const rod = idef(p.held());
    if (p.fish) {
      // 이미 드리운 줄 — 입질 중이면 즉시 챔질(보너스), 대기 중이면 거둔다
      if (p.fish.biting) { this.resolveFish('reel'); }
      else { p.fish = null; this.toast('낚싯줄을 거두었다'); }
      return;
    }
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast('너무 멀다', 'bad'); return; }
    const t = w.get(tx, ty);
    if (t !== T.WATER && t !== T.FALLS) { this.toast('물 위에 던져야 한다', 'bad'); return; }
    // 이 물이 특별히 매긴 웅덩이(정글 폭포호 등)에 속하면 rareMul을 물려받는다 —
    // 없으면 1(보정 없음). w.pools 좌표는 웅덩이의 대략적인 중심이라 넉넉한 상자로 판정한다.
    let rareMul = 1;
    for (const pl of (w.pools || [])) {
      if (pl.rareMul === undefined) continue;
      if (Math.abs(tx - pl.x) < 16 && Math.abs(ty - pl.y) < 10) { rareMul = pl.rareMul; break; }
    }
    p.fish = { tx, ty, t: rod.fishWait !== undefined ? this.rng.range(1.2, 2.8) * rod.fishWait : this.rng.range(1.2, 2.8), biting: false, bite: 0, rodId: p.held().id, rareMul };
    for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, ty * TS, '#cfe8ff', -20, .5));
    this.sfx('splash');
    this.toast('낚싯줄을 드리웠다');
  },
  updateFishing(dt) {
    const p = this.player;
    if (!p.fish) return;
    // 손에서 낚싯대를 놓으면(핫바를 바꾸면) 줄도 같이 놓인다
    const held = p.held();
    if (!held || idef(held).type !== 'rod') { p.fish = null; return; }
    const f = p.fish;
    if (!f.biting) {
      f.t -= dt;
      if (f.t <= 0) {
        f.biting = true; f.bite = 1.0;
        this.toast('손끝이 흔들린다!', 'good');
        for (let i = 0; i < 10; i++) this.parts.push(new Part((f.tx + .5) * TS, f.ty * TS, '#ffe08a', -30, .6));
      }
    } else {
      f.bite -= dt;
      if (f.bite <= 0) this.resolveFish('auto');
    }
  },
  /** 낚시 판정 — quality: 'auto'(시간 초과, 기본 확률) | 'reel'(입질 중 즉시 챔질, 보너스)
      2단계로 굴린다 — 1단계는 "물고기가 아니라 다른 것"이 걸릴지(itemChance, 낚싯대별로
      크게 갈린다: 일반 낚싯대는 거의 안 걸리고 숙련된 낚싯대는 꽤 잦다), 걸리면 2단계로
      잡템·포션·장신구 표를 굴린다. 정글 폭포호처럼 rareMul이 낮게 매겨진 물에서는
      1단계 확률 자체가 그만큼 줄어든다. */
  resolveFish(quality) {
    const p = this.player;
    if (!p.fish) return;
    const rod = ITEMS[p.fish.rodId] || {};
    const rareMul = p.fish.rareMul === undefined ? 1 : p.fish.rareMul;
    const baited = p.removeItem('raw_meat', 1);
    const fishBonus = (rod.fishBonus || 0) + (baited ? 0.20 : 0) + (quality === 'reel' ? 0.12 : 0);
    const itemChance = clamp(((rod.fishItemChance || 0) + (baited ? 0.08 : 0) + (quality === 'reel' ? 0.05 : 0)) * rareMul, 0, 0.85);
    p.fish = null;

    if (this.rng.chance(itemChance)) {
      // 1단계 통과 — 물고기 말고 다른 것. 흔한 몹 전리품(사실상 잡템)부터 장신구까지
      const itemTable = [
        ['slime_gel', 30], ['bone_frag', 30],
        ['potion_hp', 14], ['potion_hp_greater', 6],
        ['potion_mp_greater', 6],
        ['aether_shard', 8], ['ring_angler', 2]
      ];
      const catchId = this.rng.weighted(itemTable);
      const n = catchId === 'aether_shard' ? this.rng.int(1, 2) : catchId === 'slime_gel' || catchId === 'bone_frag' ? this.rng.int(2, 5) : 1;
      const it = isGear(makeItem(catchId)) ? rollGear(catchId, this.rng, 0) : makeItem(catchId, n);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
      this.toast(`뭔가 걸렸다 — ${itemName(it)}${n > 1 ? ' ×' + n : ''}`, 'good');
      this.sfx('open'); UI.refreshBag();
      return;
    }

    const table = [
      ['none', Math.max(6, 26 - fishBonus * 30)],
      ['fish_common', 44],
      ['fish_silver', 16 + fishBonus * 26],
      ['fish_deep', 7 + fishBonus * 30]
    ];
    const catchId = this.rng.weighted(table);
    if (catchId === 'none') { this.toast(baited ? '미끼만 사라졌다' : '빈 바늘만 올라왔다', 'bad'); UI.refreshBag(); return; }
    const it = makeItem(catchId, 1);
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    this.toast(`낚았다 — ${itemName(it)}`, 'good');
    this.sfx('open');
    UI.refreshBag();
  },
  findObjAt(wx, wy) {
    for (const o of this.world.objects) {
      if (o.type === 'furniture') continue;   // 순수 장식물 — 상호작용 대상이 아니다
      if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
    }
    return null;
  },
  interact(o) {
    if (o.type === 'chest') {
      if (!o.items) {
        const tx = Math.floor(o.x / TS), ty = Math.floor(o.y / TS);
        const source = o.loot || this.world.chestLootProfile(tx, ty);
        o.items = rollChest(o.tier, new RNG(Math.floor(o.x) * 7919 + Math.floor(o.y) * 104729 + hashStr(this.world.seed)), source);
        /* 유적 유물은 굴리지 않는다 — 유적마다 하나뿐이라 확률에 맡기면
           끝까지 들어간 값이 안 된다. 상자를 처음 열 때 맨 앞에 놓는다. */
        if (o.relic && ITEMS[o.relic]) {
          const relic = makeItem(o.relic, 1);
          o.items.unshift(relic);
          this.toast(`${itemName(relic)} — 이 유적의 것`, 'good');
        }
        // 다른 유적의 위치 지도 — 입구 없는 유적으로 이어지는 사슬
        if (o.ruinmap && ITEMS[o.ruinmap]) o.items.unshift(makeItem(o.ruinmap, 1));
        // 그 유적 상자에만 섞이는 전리품
        if (o.bonus && ITEMS[o.bonus]) o.items.push(makeItem(o.bonus, this.rng.int(2, 5)));
      }
      UI.openChest(o); this.sfx('open');
      // 지킴이가 붙은 상자 — 열면 그 자리에서 깨어난다. 상자만 훔치고 달아나지 못하게.
      if (o.guard && !o.guarded) {
        o.guarded = true;
        const n = o.guard.n || 2;
        for (let i = 0; i < n; i++) {
          const e = new Enemy(o.guard.t, o.x + (i - n / 2) * 34, o.y - 40, this.scale());
          this.ents.push(e);
        }
        this.toast('상자를 열자 무언가 깨어났다', 'bad');
        this.shake = 10;
      }
    } else if (o.type === 'crate') {
      if (!o.items) o.items = new Array(o.slots || 24).fill(null);
      UI.openStore(o); this.sfx('open');
    } else if (o.type === 'lorestone') {
      this.readRuinLore(o);
    } else if (o.type === 'workbench' || o.type === 'forge') {
      const kind = o.type === 'forge' ? 'forge' : 'work';
      this.nearSt[kind] = true; this.nearStObj[kind] = o;
      UI.craftTab = kind;
      UI.togglePanel('craft');
    } else if (o.type === 'npc') {
      this.talkTo(o.npc);
    } else if (o.type === 'altar') {
      this.altar(o);
    } else if (o.type === 'tablet') {
      this.readTablet(o);
    } else if (o.type === 'seal') {
      this.openSeal(o);
    } else if (o.type === 'codedoor') {
      this.openCodeDoor(o);
    } else if (o.type === 'mystic') {
      this.useMystic(o);
    } else if (o.type === 'vault') {
      UI.openVault(); this.sfx('open');
    } else if (o.type === 'board') {
      UI.openBoard(); this.sfx('open');
    } else if (o.type === 'reforge') {
      UI.openReforge(); this.sfx('open');
    } else if (o.type === 'waystone') {
      this.useWaystone();
    } else if (o.type === 'fountain') {
      this.useFountain(o);
    } else if (o.type === 'inn') {
      this.useInn();
    } else if (o.type === 'lair') {
      this.wakeLair(o);
    } else if (o.type === 'townhall') {
      UI.openTownhall(); this.sfx('open');
    } else if (o.type === 'terminal') {
      this.readTerminal(o);
    } else if (o.type === 'door') {
      o.closed = !o.closed;
      this.sfx('place');
    }
  },

  /** 공창 단말 — 로어를 읽고 설계도 조각을 얻는다 (단말마다 1회) */
  readTerminal(o) {
    const t = TERMINALS[o.term];
    this.termsRead = this.termsRead || {};
    const first = !this.termsRead[o.term];
    const choices = [];
    const give = t.it || 'blueprint_frag';
    if (first) choices.push({
      t: `(${ITEMS[give].n}을(를) 뽑아낸다)`, quest: 1, fn: () => {
        this.termsRead[o.term] = true;
        const it = makeItem(give, t.it ? 8 : 1);
        if (!this.player.addItem(it)) this.drops.push(new Drop(this.player.cx, this.player.cy, it));
        this.toast(`${ITEMS[give].n} 획득`, 'good');
        UI.closeDialogue(); UI.refreshBag(); this.checkChapter();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('talk');
  },

  /* ================= 여명 마을 시설 ================= */

  /** 귀환 비석 — 베이스캠프 ↔ 여명 마을 왕복 */
  useWaystone() {
    const p = this.player, w = this.world;
    const d = w.dawnCity;
    if (!this.villageUnlocked) {
      UI.openLore('귀환 비석', ['표면의 홈이 잿빛으로 막혀 있다. 아직 이어진 곳이 없다.'], []);
      return;
    }
    const atDawn = d && Math.abs(p.cx / TS - (d.x0 + d.x1) / 2) < 90;
    const [tx, ty] = atDawn ? [w.spawnX, w.spawnY - 3]
      : [(d.x0 + d.x1) >> 1, d.gy - 3];
    const to = atDawn ? '베이스캠프' : '여명 마을';
    UI.openLore('귀환 비석', [`비석에 손을 대면 ${to}(으)로 돌아간다.`], [
      {
        t: `(${to}(으)로 이동한다)`, quest: 1, fn: () => {
          UI.closeDialogue();
          p.x = tx * TS - p.w / 2; p.y = ty * TS; p.vx = p.vy = 0;
          this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
          this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
          for (let i = 0; i < 30; i++) this.parts.push(new Part(p.cx, p.cy, '#9fe8dc', -60, 1.1));
          this.toast(`${to}에 도착했다`, 'good');
          this.sfx('chapter');
        }
      }
    ]);
  },

  /** 분수대 — 금화를 던져 소원을 빈다.
      여관(유료·아침까지 시간 경과·전체 회복 +「잘 쉼」)과 겹치지 않게 회복은 일부러
      넣지 않았다. 이쪽은 "운을 사는" 쪽이라 값도 여관보다 싸고 언제든 다시 빌 수 있다. */
  wishCost() { return Math.round(25 + this.player.level * 7); },
  useFountain(o) {
    const p = this.player, cost = this.wishCost();
    const lines = ['물속에 동전이 여럿 가라앉아 있다. 오래된 것도, 어제 것도 있다.'];
    const choices = [];
    if (p.gold >= cost)
      choices.push({
        t: `(금화 ${fmt(cost)}를 던진다)`, quest: 1, fn: () => {
          UI.closeDialogue();
          p.gold -= cost;
          p.addBuff('wish');
          const mx = o.x + o.w / 2, my = o.y + o.h * 0.55;
          for (let i = 0; i < 16; i++) this.parts.push(new Part(mx, my, '#ffd85a', -40, 0.9));
          this.toast('분수의 축복 — 잠시 운이 따른다', 'good');
          this.sfx('coin');
        }
      });
    else lines.push(`동전을 던지려면 금화 ${fmt(cost)}가 필요하다.`);
    UI.openLore('여명의 분수', lines, choices);
  },

  /** 여관 — 금화를 내고 아침까지 잔다. 체력·마나 회복 + 「잘 쉼」 */
  innCost() { return Math.round((40 + this.player.level * 12) * (this.villageLv() >= 2 ? 0.7 : 1)); },
  useInn() {
    const p = this.player;
    const cost = this.innCost();
    UI.openLore('여관', [`하란: "한숨 자고 가. 아침까진 봐 줄게. 🪙 ${fmt(cost)}."`], [
      {
        t: `(🪙 ${fmt(cost)} 내고 잔다)`, quest: 1, fn: () => {
          UI.closeDialogue();
          if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
          p.gold -= cost;
          this.dayT = 6 * 60; this.dayCount++; this.trainedToday = 0;
          this.updateEconomy(); this.rollBounties();
          p.hp = p.d.maxHp; p.mp = p.d.maxMp;
          p.addBuff('rested');
          this.toast('푹 잤다 — 아침이다', 'good');
          this.sfx('level');
        }
      }
    ]);
  },

  /* ---- 의뢰 게시판: 하루마다 갱신되는 반복 의뢰 3건 ---- */
  rollBounties() {
    const r = new RNG(this.world.seed + '_b' + this.dayCount);
    const pool = ['slime', 'zombie', 'skeleton', 'archer', 'bat', 'spider', 'crawler', 'shadoweye',
      'frostling', 'icewolf', 'imp', 'wraith', 'ashcrow', 'scorpion', 'sandmaw', 'crystalcrab',
      'lavaslug', 'gale', 'sky_sentry', 'cloudjelly', 'ruin_guard', 'lantern', 'archivist'];
    const picked = [];
    while (picked.length < 3) {
      const t = pool[r.int(0, pool.length - 1)];
      if (!picked.includes(t)) picked.push(t);
    }
    const p = this.player;
    this.bounties = picked.map(target => {
      const n = r.int(8, 20);
      const lv = Math.max(1, p.level);
      return {
        target, n, start: p.kills[target] || 0,
        gold: Math.round((160 + lv * 55) * n / 10),
        xp: Math.round((90 + lv * 40) * n / 10),
        done: 0
      };
    });
  },
  bountyProgress(b) {
    const cur = clamp((this.player.kills[b.target] || 0) - b.start, 0, b.n);
    return { cur, max: b.n, done: cur >= b.n };
  },
  claimBounty(i) {
    const b = this.bounties[i]; if (!b || b.done) return;
    if (!this.bountyProgress(b).done) { this.toast('아직 다 잡지 못했다', 'bad'); return; }
    const p = this.player;
    b.done = 1;
    p.addXp(b.xp); p.gold += b.gold;
    this.toast(`의뢰 완료 — 경험치 ${fmt(b.xp)} · 금화 ${fmt(b.gold)}`, 'good');
    UI.refreshBoard(); this.sfx('manycoins');
  },

  /* ---- 재련: 금화를 내고 장비의 접사를 다시 굴린다 ---- */
  reforgeCost(it) { return Math.round((this.price(it) * 0.8 + 120) * (this.villageLv() >= 3 ? 0.75 : 1)); },
  reforgeSlot(i) {
    const p = this.player, it = p.bag[i];
    if (!it || !isGear(it)) { this.toast('장비만 재련할 수 있다', 'bad'); return; }
    const cost = this.reforgeCost(it);
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    p.gold -= cost;
    const fresh = rollGear(it.id, this.rng, Math.max(1, it.r));
    fresh.c = it.c;
    p.bag[i] = fresh;
    this.toast(`${itemName(fresh)} — 다시 벼렸다`, fresh.r > it.r ? 'good' : '');
    UI.refreshReforge(); UI.refreshBag(); this.sfx('craft');
  },

  /** 유적 석판 — 로어를 읽고 룬 조각을 얻는다 (1회) */
  readTablet(o) {
    const t = TABLETS[o.tablet];
    this.tabletsRead = this.tabletsRead || {};
    const first = !this.tabletsRead[o.tablet];
    const choices = [];
    if (first) choices.push({
      t: '(룬 조각을 떼어낸다)', quest: 1, fn: () => {
        this.tabletsRead[o.tablet] = true;
        const it = makeItem('rune_frag', 1);
        if (!this.player.addItem(it)) this.drops.push(new Drop(this.player.cx, this.player.cy, it));
        this.toast('룬 조각 획득', 'good');
        UI.closeDialogue(); UI.refreshBag(); UI.refreshTracker();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('open');
  },

  /** 유적 비문 — 본편이 아직 말하지 않은 것을 유적마다 한 조각씩 흘린다 */
  readRuinLore(o) {
    // 흔적(hint)은 보상 없이 읽기만 한다 — 방마다 흩어 둔 짧은 이야기 조각
    if (o.hint !== undefined) {
      const hs = RUIN_HINTS[o.lore];
      const h = hs && hs[o.hint];
      if (!h) return;
      /* 숫자 잠긴 문이 있는 유적이면, 흔적 세 개에 세 자리를 한 자리씩 흩어 둔다.
         돌아다니며 셋을 다 읽어야 문이 열린다 — 흔적을 읽을 이유가 그제야 생긴다. */
      let lines = h[1];
      const sp = RUIN_SPEC.find(q => q.id === o.lore);
      if (sp && sp.event === 'password' && o.hint < 3) {
        const digit = this.ruinCode(o.lore)[o.hint];
        lines = lines.concat([
          '',
          `— 구석에 다른 손으로 새긴 것이 있다. 『${['첫', '둘째', '셋째'][o.hint]} 자리는 ${digit}』`
        ]);
      }
      UI.openLore(h[0], lines, []);
      this.sfx('open');
      return;
    }
    const t = RUIN_LORE[o.lore];
    if (!t) return;
    this.loreRead = this.loreRead || {};
    const first = !this.loreRead[o.lore];
    const choices = [];
    if (first) choices.push({
      t: '(비문을 옮겨 적는다)', quest: 1, fn: () => {
        this.loreRead[o.lore] = true;
        const p = this.player;
        p.addXp(Math.round(600 * this.scale()));
        const it = makeItem('aether_shard', 3);
        if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
        this.toast('비문을 옮겨 적었다 — 여정의 기록에 남는다', 'good');
        // 여섯 유적의 비문을 모두 옮겨 적으면 — 탐굴자의 인장은 그런 자에게만 맞는 크기다
        if (Object.keys(RUIN_LORE).every(k => this.loreRead[k])) {
          const seal = rollGear('charm_delver', this.rng, 3);
          if (!p.addItem(seal)) this.drops.push(new Drop(p.cx, p.cy, seal));
          this.toast('여섯 유적을 모두 뒤졌다 — 탐굴자의 인장을 얻었다', 'good');
        }
        UI.closeDialogue(); UI.refreshBag();
      }
    });
    UI.openLore(t.n, t.lines, choices);
    this.sfx('open');
  },

  /** 봉인문 — 유적의 열쇠로 연다 */
  openSeal(o) {
    const p = this.player, w = this.world;
    if (o.opened) { this.toast('이미 열려 있다'); return; }
    // 봉인문은 두 곳에 있다 — 심층 봉인실(유적의 열쇠)과 설계실(설계실의 인장).
    // o.gate가 어느 쪽인지 알려 주고, 없으면 예전 세이브의 심층 봉인실이다.
    const atelier = o.gate === 'atelier';
    const keyId = o.key || 'ruin_key';
    if (p.countItem(keyId) <= 0) {
      UI.openLore(atelier ? '설계실 봉인' : '봉인문', atelier
        ? ['벽에 이음매가 없다. 문이 아니라, 문이었던 적이 없는 벽이다.',
           '가운데에 손바닥만 한 홈이 하나 파여 있다 — 안쪽에서 만든 것만 맞는 크기다.',
           '『이 벽은 밖에서 열리지 않습니다.』']
        : ['문에는 손잡이가 없다. 대신 세 개의 홈이 파여 있다.',
           '『세 석판을 모두 읽은 자만이 이 문을 연다.』'], []);
      return;
    }
    p.removeItem(keyId, 1);
    o.opened = true;
    if (atelier) {
      const a = w.atelier;
      for (let dy = -1; dy <= 1; dy++) { w.set(a.sealX, a.sealY + dy, T.AIR); w.set(a.sealX + 1, a.sealY + dy, T.AIR); }
    } else {
      const s = w.sealRoom;
      for (let y = s.dy - 4; y <= s.dy + 4; y++) { w.set(s.dx, y, T.AIR); w.set(s.dx + 1, y, T.AIR); }
    }
    for (let i = 0; i < 40; i++)
      this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, atelier ? '#ffe8a0' : '#a06fff', -30, 1.2));
    this.shake = 12;
    this.toast('봉인이 풀렸다', 'good');
    UI.refreshBag(); this.sfx('chapter');
  },

  /* ================= NPC ================= */
  talkTo(id) {
    this.talked = this.talked || {};
    this.talked[id] = true;
    if (DAWN_NPCS.includes(id)) { this.talkVillager(id); return; }
    const lines = DIALOGUE[id][Math.min(this.chapter, DIALOGUE[id].length - 1)];
    const choices = [];
    if (NPCS[id].shop) choices.push({ t: '물건을 보여 달라', fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    if (SIDE_POOL[id]) {
      const label = this.sideActive[id] ? '의뢰에 대해 묻는다' : '부탁할 일이 있는지 묻는다';
      choices.push({ t: label, quest: 1, fn: () => { UI.closeDialogue(); this.sideTalk(id); } });
    }
    choices.push({ t: '지금 무엇을 해야 하지?', quest: 1, fn: () => { UI.closeDialogue(); this.tellQuest(); } });
    if (id === 'elara' && this.chapter === 0) choices.push({ t: '(여정을 시작한다)', quest: 1, fn: () => { UI.closeDialogue(); } });
    UI.openDialogue(id, lines, choices);
    this.sfx('talk');
  },

  /* ---- 여명 마을 주민 (종장 이후에만 세계에 존재한다) ---- */
  talkVillager(id) {
    const d = NPCS[id], choices = [];
    if (id === 'tamer') {
      choices.push({ t: '물건을 보여 달라', fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    } else if (id === 'trainer') {
      choices.push({ t: `스탯 재분배 (🪙 ${fmt(this.respecCost())})`, fn: () => { UI.closeDialogue(); this.respecStats(); } });
      choices.push({ t: `수련하기 (🪙 ${fmt(this.trainCost())}, 오늘 ${this.trainedToday}/5)`, fn: () => { UI.closeDialogue(); this.trainXp(); } });
    } else if (id === 'haran') {
      choices.push({ t: '방을 잡는다', fn: () => { UI.closeDialogue(); this.useInn(); } });
    } else if (id === 'seira') {
      choices.push({ t: '장비를 다시 벼려 달라', fn: () => { UI.closeDialogue(); UI.openReforge(); } });
    }
    UI.openDialogue(id, [d.line], choices);
    this.sfx('talk');
  },

  /* ---- 사이드 퀘스트 ---- */
  sideProgress(sq) {
    const p = this.player;
    let cur = 0;
    if (sq.obj.type === 'kill') cur = (p.kills[sq.obj.target] || 0) - sq.start;
    else if (sq.obj.type === 'collect') cur = (p.gathered[sq.obj.item] || 0) - sq.start;
    else if (sq.obj.type === 'mine') cur = (p.mined[sq.obj.tile] || 0) - sq.start;
    cur = clamp(cur, 0, sq.obj.n);
    return { cur, max: sq.obj.n, done: cur >= sq.obj.n };
  },
  sideTalk(npcId) {
    const active = this.sideActive[npcId];
    if (active) {
      const p = this.sideProgress(active);
      if (p.done) {
        UI.openDialogue(npcId, [active.doneLine], [{ t: '(보상을 받는다)', quest: 1, fn: () => { this.completeSideQuest(npcId); UI.closeDialogue(); } }]);
      } else {
        UI.openDialogue(npcId, [`${active.desc}  (${p.cur}/${p.max})`], []);
      }
      return;
    }
    const pool = SIDE_POOL[npcId];
    if (!pool) return;
    const tpl = pool[this.rng.int(0, pool.length - 1)](this.chapter, this.rng);
    UI.openDialogue(npcId, [tpl.desc], [
      { t: '(수락한다)', quest: 1, fn: () => { this.acceptSideQuest(npcId, tpl); UI.closeDialogue(); } },
      { t: '(다음에 하겠다)', fn: () => UI.closeDialogue() }
    ]);
  },
  acceptSideQuest(npcId, tpl) {
    const p = this.player;
    let start = 0;
    if (tpl.obj.type === 'kill') start = p.kills[tpl.obj.target] || 0;
    else if (tpl.obj.type === 'collect') start = p.gathered[tpl.obj.item] || 0;
    else if (tpl.obj.type === 'mine') start = p.mined[tpl.obj.tile] || 0;
    this.sideActive[npcId] = Object.assign({}, tpl, { start });
    this.toast(`의뢰 수락: ${tpl.title}`, 'good');
    UI.refreshQuest(); UI.refreshTracker();
  },
  completeSideQuest(npcId) {
    const sq = this.sideActive[npcId]; if (!sq) return;
    const p = this.player;
    p.addXp(sq.rw.xp); p.gold += sq.rw.gold;
    for (const [id, n] of (sq.rw.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 1);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    }
    this.sideDone[npcId] = (this.sideDone[npcId] || 0) + 1;
    delete this.sideActive[npcId];
    this.toast(`의뢰 완료: ${sq.title} — 경험치 ${fmt(sq.rw.xp)} · 금화 ${fmt(sq.rw.gold)}`, 'good');
    UI.refreshQuest(); UI.refreshTracker(); UI.refreshBag();
    this.sfx('manycoins');
  },
  tellQuest() {
    const ch = CHAPTERS[this.chapter];
    if (!ch) { this.toast('모든 여정이 끝났다.'); return; }
    const remain = ch.obj.map((o, i) => ({ o, p: this.objProgress(ch, i) })).filter(x => !x.p.done);
    const session = this.chapter >= 9 ? '세션 2' : '세션 1';
    if (!remain.length) this.toast('할 일은 모두 끝냈다.');
    else this.toast(`${session} · ` + remain[0].o.t + `  (${remain[0].p.cur}/${remain[0].p.max})`);
    UI.togglePanel('quest');
  },
  /* ---- 경제: 화폐 가치와 품목별 시세가 하루 단위로 변동한다 ---- */
  updateEconomy() {
    this.goldRate = clamp((this.goldRate || 1) + (this.rng.next() - 0.5) * 0.14, 0.7, 1.4);
    this.market = {};   // 품목별 시세는 필요할 때(marketRate) 그날 시드로 다시 뽑는다
  },
  marketRate(id) {
    if (!(id in this.market)) {
      const r = new RNG(this.world.seed + '_m' + this.dayCount + '_' + id);
      this.market[id] = 0.85 + r.next() * 0.3;   // 품목별 0.85~1.15
    }
    return this.market[id] * (this.goldRate || 1);
  },
  price(it) {
    const d = idef(it);
    let base = 12;
    if (d.price) base = d.price;
    else if (d.type === 'weapon') base = 60 + (d.tier || 0) * 90;
    else if (d.type === 'armor') base = 40 + (d.def || 0) * 12;
    else if (d.type === 'acc') base = 220;
    else if (d.type === 'tool') base = 80 + (d.power || 1) * 70;
    else if (d.type === 'consum') base = 22;
    else if (d.type === 'block') base = 2;
    const raw = base * (it.c > 1 ? it.c : 1) * RARITY_MULT[it.r] * this.marketRate(it.id);
    return Math.max(1, Math.round(raw));
  },
  buy(id) {
    const p = this.player;
    const it = makeItem(id, ITEMS[id].stack > 1 ? 5 : 1, 0);
    const cost = this.price(it);
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    if (!p.addItem(it)) { this.toast('가방이 가득 찼다', 'bad'); return; }
    p.gold -= cost;
    this.toast(`${ITEMS[id].n} 구매`, 'good');
    UI.refreshChest(); UI.refreshBag(); this.sfx('coin');
  },

  /* ---- 미니보스 둥지 ----
     제단과 달리 소환 아이템이 필요 없다. 방에 들어서서 둥지를 건드리면 깨어나고,
     한 번 잡으면 다시 깨지 않는다. 처치 여부는 세이브에 남는다. */
  wakeLair(o) {
    this.lairs = this.lairs || {};
    if (this.lairs[o.ruin]) { this.toast('이미 비어 있다'); return; }
    if (this.boss) { this.toast('이미 무언가가 깨어 있다', 'bad'); return; }
    const spec = RUIN_SPEC[o.ruin];
    const name = o.nm || (spec ? spec.n : '둥지');
    UI.openLore(name, [
      '무언가가 이 자리에서 아주 오래 기다렸다.',
      '건드리면 깨어난다.'
    ], [
      {
        t: '(깨운다)', quest: 1, fn: () => {
          UI.closeDialogue();
          // 어느 둥지를 깨웠는지 기억해 둔다 — 잡으면 그 둥지를 비운 것으로 남긴다
          this.pendingLair = o.ruin;
          this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 70);
        }
      },
      { t: '(그냥 둔다)', fn: () => UI.closeDialogue() }
    ]);
  },

  /* ================= 제단 / 보스 ================= */
  altar(o) {
    const p = this.player;
    const need = Object.keys(ITEMS).find(k => ITEMS[k].boss === o.boss);
    if (this.boss) { this.toast('이미 무언가가 깨어 있다', 'bad'); return; }
    // 소환 아이템이 아예 없는 보스라면 제단이 아니라 둥지로 다뤄야 한다.
    // 예전에 이 자리에서 ITEMS[undefined]를 읽어 예외가 났었다
    if (!need) { this.wakeLair({ boss: o.boss, ruin: 12, nm: '제단', x: o.x, y: o.y, w: o.w, h: o.h }); return; }
    if (p.countItem(need) <= 0) { this.toast(`${ITEMS[need].n}이(가) 필요하다`, 'bad'); return; }
    p.removeItem(need, 1);
    this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 60);
    UI.refreshBag();
  },
  useSummon(slot) {
    const p = this.player, it = p.bag[slot];
    const bossId = idef(it).boss;
    if (this.boss) { this.toast('이미 무언가가 깨어 있다', 'bad'); return; }
    const zone = this.world.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    const req = {
      king_slime: ['surface', 'cave'], bone_lord: ['cave', 'deep'], corrupt_heart: ['corrupt'],
      frost_witch: ['ice'], void_king: ['hell'], storm_warden: ['sky'], first_keeper: ['ruin'],
      pursuer: ['surface'],  // 하늘이 트인 지상에서만 — 숨는 대신 위치를 알려주는 의식이다
      overseer: ['works']
    }[bossId];
    if (req && !req.includes(zone)) { this.toast('여기서는 반응하지 않는다', 'bad'); return; }
    p.removeItem(it.id, 1);
    this.spawnBoss(bossId, p.cx + 160 * (p.facing || 1), p.cy - 90);
    UI.refreshBag();
  },
  spawnBoss(id, x, y) {
    const e = new Enemy(id, x, y, this.scale() * 0.9);
    this.ents.push(e); this.boss = e;
    this.toast(`${ENEMIES[id].n}이(가) 깨어났다!`, 'bad');
    this.shake = 16;
    // 등장 효과음을 따로 두지 않고 보스 브금이 바로 치고 들어오게 한다
    if (window.Music) Music.play('boss', true);
  },
  onBossDown(id) {
    this.boss = null;
    // 둥지에서 깨운 것이라면 그 둥지를 비운 것으로 남긴다
    if (this.pendingLair !== undefined && this.pendingLair !== null) {
      this.lairs = this.lairs || {};
      this.lairs[this.pendingLair] = 1;
      this.pendingLair = null;
    }
    this.toast(`${ENEMIES[id].n} 토벌!`, 'good');
    UI.bossBar(null);
  },
  scale() { return 1 + this.chapter * 0.22 + this.player.level * 0.03; },
  /** 난이도가 몹의 체력·공격력에만 곱하는 값. 경험치·금화는 건드리지 않는다. */
  modeMul() { return MODE_OF(this.mode).mul; },

  /* ================= 소비 / 제작 ================= */
  useConsumable(slot) {
    const p = this.player, it = p.bag[slot], d = idef(it);
    if (d.use.egg) { this.hatchEgg(d.use.egg); it.c--; if (it.c <= 0) p.bag[slot] = null; UI.refreshBag(); this.sfx('hatch'); return; }
    // instant(치유·마나 물약)는 공유 재사용 대기시간을 아예 안 걸고 안 본다 —
    // 음식·물고기 등 나머지 회복 소비품끼리는 여전히 potionCd를 공유한다
    if (!d.instant && p.potionCd > 0 && d.use.hp) { this.toast('아직 회복할 수 없다', 'bad'); return; }
    if (d.use.hp) { p.heal(d.use.hp); if (!d.instant) p.potionCd = d.cd || 10; }
    if (d.use.mp) p.mp = Math.min(p.d.maxMp, p.mp + d.use.mp);
    if (d.use.buff) {
      // 음식(fed_)은 한 가지만 유지된다 — 겹쳐 먹을 수 있으면 요리를 고를 이유가 없어진다
      if (d.use.buff.startsWith('fed_')) p.buffs = p.buffs.filter(b => !b.id.startsWith('fed_'));
      p.addBuff(d.use.buff);
    }
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    UI.refreshBag(); this.sfx('drink');
  },

  /* ================= 판매 ================= */
  sellItem(slot) {
    const p = this.player, it = p.bag[slot];
    if (!it) return;
    if (it.lk) { this.toast('잠긴 물건은 팔 수 없다 (Ctrl+좌클릭으로 해제)', 'bad'); return; }
    const price = Math.round(this.price(it) * 0.5 * this.villageTrade());
    p.gold += price;
    this.toast(`${itemName(it)} 판매 — 🪙 ${fmt(price)}`, 'good');
    p.bag[slot] = null;
    UI.refreshBag(); UI.refreshChest(); this.sfx('coin');
  },

  /* ================= 펫 =================
     v1.0.2부터 펫은 도감이 아니라 장비 아이템이다 — 알을 깨면 펫 아이템이 나오고,
     장비창의 펫 슬롯 두 칸에 끼워서 데리고 다닌다. 같은 펫이 또 나와도 버릴 이유가
     없어서(팔거나 두 마리째로 쓰거나) 예전의 "중복 환불" 처리도 필요 없어졌다. */
  hatchEgg(tier) {
    const p = this.player;
    const id = this.rng.weighted(EGG_POOL[tier]);
    const it = makeItem('pet_' + id, 1);
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    this.toast(`${PETS[id].n}를 얻었다! (장비창의 펫 칸에 끼울 수 있다)`, 'good');
    UI.refreshBag(); UI.refreshChest();
  },
  /** 장비창의 펫 슬롯을 실제로 따라다니는 펫 인스턴스와 맞춘다.
      장착이 바뀔 때마다 부르면 되고, 이미 같은 펫이 그 칸에 있으면 그대로 둔다
      (매번 새로 만들면 위치가 튀고 공격 쿨다운도 초기화된다). */
  syncPets() {
    const p = this.player;
    if (!this.petEnts) this.petEnts = [];
    ['pet1', 'pet2'].forEach((key, slot) => {
      const it = p.equip[key];
      const id = it && idef(it).pet;
      const cur = this.petEnts[slot];
      if (!id) { this.petEnts[slot] = null; return; }
      if (cur && cur.id === id) return;
      const np = new Pet(id, slot);
      const [ax, ay] = np.anchor(p);
      np.x = ax; np.y = ay;
      this.petEnts[slot] = np;
    });
  },

  /* ================= 훈련소 ================= */
  respecCost() { return 60 + this.player.level * 25; },
  respecStats() {
    const p = this.player;
    const cost = this.respecCost();
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    p.gold -= cost;
    const spent = (p.base.str - 5) + (p.base.dex - 5) + (p.base.int - 5) + (p.base.vit - 5);
    p.statPts += spent;
    p.base = { str: 5, dex: 5, int: 5, vit: 5 };
    p.recalc();
    this.toast('스탯을 초기화했다. 능력 창에서 다시 분배하라', 'good');
    UI.refreshStatAlloc(); UI.refreshStatSheet();
  },
  trainCost() { return 40 + this.trainedToday * 60; },
  trainXp() {
    const p = this.player;
    if (this.trainedToday >= 5) { this.toast('오늘은 더 가르칠 게 없다고 한다', 'bad'); return; }
    const cost = this.trainCost();
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    p.gold -= cost; this.trainedToday++;
    const xp = Math.round(p.xpNext * 0.18);
    p.addXp(xp);
    this.toast(`수련으로 경험치 ${fmt(xp)}를 얻었다`, 'good');
  },
  /* ================= 마을 개선 =================
     등급은 world.dawnCity.lv 에 둔다 — 마을은 세계의 일부라 세계와 함께 저장되어야
     불러오기 후에도 지어 둔 성벽과 등급이 어긋나지 않는다. */
  villageLv() {
    const d = this.world && this.world.dawnCity;
    return (d && d.restored) ? (d.lv || 1) : 0;
  },
  /** 지금 여명 마을 안에 있는가 (마을 회관·경비병 판정용) */
  inDawn(margin) {
    const d = this.world && this.world.dawnCity;
    if (!d || !d.restored) return false;
    const p = this.player, m = margin === undefined ? 24 : margin;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    return tx > d.x0 - m && tx < d.x1 + m && Math.abs(ty - d.gy) < 26;
  },
  upgradeVillage() {
    const lv = this.villageLv();
    if (!lv) { this.toast('아직 마을이 없다', 'bad'); return; }
    if (lv >= 3) { this.toast('더 올릴 단계가 없다', 'bad'); return; }
    const spec = VILLAGE[lv + 1], p = this.player;
    if (!p.hasAll(spec.need)) { this.toast('재료가 부족하다', 'bad'); return; }
    for (const k in spec.need) p.removeItem(k, spec.need[k]);
    this.world.upgradeVillage(lv + 1);
    while (this.vault.length < this.vaultCap()) this.vault.push(null);
    if (lv + 1 === 2) {
      // 밭을 준 김에 씨앗과 괭이도 같이 — 무엇을 하라는 자리인지 손에 쥐여 준다
      for (const [id, n] of [['seed_wheat', 12], ['seed_starroot', 8], ['hoe_iron', 1]]) {
        const it = makeItem(id, ITEMS[id].stack > 1 ? n : 1);
        if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
      }
    }
    this.toast(`마을이 『${spec.n}』이 되었다`, 'good');
    for (let i = 0; i < 40; i++) this.parts.push(new Part(p.cx + (Math.random() - .5) * 200, p.cy, '#ffe08a', -70, 1.2));
    UI.chapterCard({ sub: '마을 개선', title: spec.n, line: spec.d });
    UI.refreshBag(); this.sfx('chapter');
  },
  /* 마을 단계가 주는 혜택 — 여러 곳에서 쓰이므로 한군데 모아 둔다 */
  vaultCap() { return VAULT_SIZE + (this.villageLv() >= 2 ? 12 : 0); },
  villageTrade() { return this.villageLv() >= 3 ? 1.1 : 1; },

  /** 이 제작법을 지금 쓸 수 있는가 — 시설 종류와 그 개체의 개조 단계를 함께 본다 */
  craftOk(r) {
    if (!r.station) return true;
    const o = this.nearStObj[r.station];
    return !!o && (o.lv || 1) >= (r.lv || 1);
  },
  /** 시설 개조. 지금 서 있는 그 개체 하나에만 적용된다 */
  upgradeStation(kind) {
    const o = this.nearStObj[kind];
    if (!o) { this.toast(`${STATION_NAME[kind][1]} 앞에서만 개조할 수 있다`, 'bad'); return; }
    const lv = o.lv || 1;
    if (lv >= 3) { this.toast('더 손볼 데가 없다', 'bad'); return; }
    const up = STATION_UP[kind][lv], p = this.player;
    if (!p.hasAll(up.need)) { this.toast('재료가 부족하다', 'bad'); return; }
    for (const k in up.need) p.removeItem(k, up.need[k]);
    o.lv = lv + 1;
    const nm = STATION_NAME[kind][lv + 1];
    this.toast(`${nm}${josaRo(nm)} 개조했다`, 'good');
    for (let i = 0; i < 22; i++) this.parts.push(new Part(p.cx, p.cy, kind === 'forge' ? '#ff9a3a' : '#d8b06a', -50, 0.8));
    UI.refreshCraft(); UI.refreshBag(); this.sfx('craft');
  },
  craft(i) {
    const r = RECIPES[i], p = this.player;
    const st = r.station ? this.nearStObj[r.station] : null;
    if (r.station && !st) {
      this.toast(`${STATION_NAME[r.station][1]} 앞에서만 만들 수 있다`, 'bad'); return;
    }
    if (r.station && (st.lv || 1) < (r.lv || 1)) {
      const nm = STATION_NAME[r.station][r.lv];
      this.toast(`${nm}${josaRo(nm)} 개조해야 만들 수 있다`, 'bad'); return;
    }
    if (!p.hasAll(r.need)) { this.toast('재료가 부족하다', 'bad'); return; }
    for (const k in r.need) p.removeItem(k, r.need[k]);
    const out = isGear(makeItem(r.out)) ? rollGear(r.out, this.rng, 1) : makeItem(r.out, r.n);
    if (out.c !== undefined && !isGear(out)) out.c = r.n;
    if (!p.addItem(out)) { this.drops.push(new Drop(p.cx, p.cy, out)); }
    this.crafted = this.crafted || {};
    this.crafted[r.out] = (this.crafted[r.out] || 0) + 1;
    this.toast(`${ITEMS[r.out].n} 제작 완료`, 'good');
    UI.refreshCraft(); UI.refreshBag(); this.sfx('craft');
  },

  /* ================= 광역 피해 ================= */
  /** 폭발/타격 이펙트 등록 (kind: hit / fire / void) */
  burst(x, y, kind, size) {
    if (!this.spritesOn) return;
    (this.bursts = this.bursts || []).push({ x, y, kind, s: size || 64, t: 0 });
  },

  aoe(x, y, r, dmg, kb, color, effect) {
    for (const e of this.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      if (dist(x, y, e.cx, e.cy) > r + e.w / 2) continue;
      const crit = this.player.rollCrit();
      e.hurt(dmg * (crit ? 1 + this.player.d.critD / 100 : 1), crit, this.player, kb);
      if (effect === 'frost') e.slow(0.5, 3);
    }
    this.rings = this.rings || [];
    this.rings.push({ x, y, r, t: 0.3, c: color });
  },

  /* ================= 스폰 ================= */
  zoneTable(zone, night, tx, ty) {
    // 사막은 지상/동굴 판정 안에 들어가므로 x로 따로 갈라준다
    const desert = tx !== undefined && this.world.biomeAt(clamp(tx, 0, WW - 1)).id === 'desert';
    switch (zone) {
      case 'surface':
        // 까마귀는 원래 비중의 40%로 줄이고, 슬라임은 2배로 늘렸다 (기존 슬라임2:까마귀1 → 슬라임10:까마귀1)
        // 낮에는 순한 동물(토끼/도마뱀)도 소량 섞여 지형을 채운다 — 야간에는 등장하지 않는다
        if (desert) return night ? ['scorpion', 'sandmaw', 'zombie']
          : ['scorpion', 'sandmaw', 'ashcrow', 'sand_lizard'];
        return night ? [...Array(5).fill('zombie'), ...Array(5).fill('slime'), 'ashcrow']
          : [...Array(10).fill('slime'), 'ashcrow', 'rabbit', 'rabbit', 'rabbit'];
      case 'cave': return desert ? ['spider', 'scorpion', 'minerghost', 'bat']
        : ['bat', 'skeleton', 'archer', 'spider', 'minerghost'];
      case 'deep': return ['skeleton', 'archer', 'wraith', 'crystalcrab', 'minerghost'];
      case 'corrupt': return night ? ['crawler', 'shadoweye', 'corrupttree']
        : ['crawler', 'shadoweye', 'corrupttree', 'ash_vole'];
      case 'ice': return night ? ['frostling', 'icewolf', 'zombie'] : ['frostling', 'icewolf', 'slime', 'arctic_hare', 'arctic_hare'];
      case 'hell': return ['imp', 'golem', 'lavaslug', 'imp'];
      case 'sky': return ['gale', 'sky_sentry', 'cloudjelly', 'gale'];
      case 'ruin': {
        /* 유적은 여덟 곳인데 나오는 몹이 셋으로 다 같았다 — 어디를 들어가도 같은 곳처럼
           느껴지던 가장 큰 이유다. 이제 그 유적에 매긴 무리(RUIN_SPEC[].mobs)를 쓴다.
           석판 유적과 심층 봉인실은 RUIN_SPEC 에 없으므로 예전 표가 그대로 남는다. */
        const r = ty !== undefined && this.world.ruinAt(tx, ty);
        const sp = r && r.id && RUIN_SPEC.find(q => q.id === r.id);
        if (sp && sp.mobs) {
          // 유적 지킴이(ruin_guard)는 어디에나 한 자리 섞는다 — 여덟 곳을 잇는 공통 설정이다
          return night ? [...sp.mobs, ...sp.mobs, 'ruin_guard'] : [...sp.mobs, 'ruin_guard', 'lantern'];
        }
        return ['ruin_guard', 'lantern', 'archivist'];
      }
      case 'works': return ['scrapcrawler', 'sparkwisp', 'riveter', 'foreman'];
      case 'runaway': return ['splitter', 'weldarm', 'coreling', 'splitter'];
      case 'atelier': return ['draft_form', 'scribe_hand', 'mold_walker', 'draft_form'];
      case 'citadel': return ['orbit_sentry', 'meridian_eye', 'ballast_form', 'meridian_eye'];
      case 'deepshaft': return ['gloom_crawler', 'damp_wisp', 'lost_miner', 'gloom_crawler'];
      // --- 5단계: 새 바이옴. 밤에는 구성이 바뀐다 ---
      case 'jungle': return night ? ['vinelash', 'canopy_ape', 'bloomspitter', 'zombie']
        : ['vinelash', 'bloomspitter', 'canopy_ape', 'spider', 'jungle_frog'];
      case 'glowfen': return night ? ['sporeling', 'capbeast', 'sporeling', 'shadoweye']
        : ['sporeling', 'capbeast', 'bat', 'glow_snail'];
    }
    return ['slime'];
  },
  /* ---- 세계 이벤트 ----
     낮/밤이 바뀔 때 한 번만 주사위를 굴린다. 켜져 있는 동안 스폰표·상한·하늘색이 바뀐다.
     조건(밤인가 · 어느 바이옴인가)에서 벗어나면 스스로 꺼진다 — 사막을 벗어나면
     모래폭풍이 따라오지 않는다. */
  eventSpec() { return this.event ? EVENTS[this.event.id] : null; },
  /** 이 이벤트가 지금 플레이어 위치에서 실제로 작동하는가 */
  eventActive() {
    const e = this.eventSpec();
    if (!e) return false;
    const w = this.world, p = this.player;
    const tx = clamp(Math.floor(p.cx / TS), 0, WW - 1);
    if (e.biome && w.biomeAt(tx).id !== e.biome) return false;
    const z = w.zoneAt(tx, Math.floor(p.cy / TS));
    return e.zones.indexOf(z) >= 0;
  },
  updateEvents(dt) {
    const night = this.dayT < 5 * 60 || this.dayT > 19 * 60;
    const phase = (this.dayCount * 2) + (night ? 1 : 0);
    if (this.event) {
      this.event.t += dt;
      // 국면이 끝나면 이벤트도 끝난다. 비처럼 낮/밤 구분이 없는 이벤트는 dur(지속 시간)로 대신 끊는다
      const e = EVENTS[this.event.id];
      if ((e.night && !night) || (e.day && night) || (e.dur && this.event.t >= e.dur)) {
        this.toast(`${e.i} ${e.n}이(가) 지나갔다`);
        this.event = null;
      }
      return;
    }
    if (this.eventRolled === phase) return;
    this.eventRolled = phase;
    const p = this.player;
    const tx = clamp(Math.floor(p.cx / TS), 0, WW - 1);
    const biome = this.world.biomeAt(tx).id;
    const r = new RNG(this.world.seed + '_ev' + phase);
    for (const id in EVENTS) {
      const e = EVENTS[id];
      if (e.night && !night) continue;
      if (e.day && night) continue;
      if (e.biome && e.biome !== biome) continue;
      if (!r.chance(e.chance)) continue;
      this.event = { id, t: 0 };
      this.toast(`${e.i} ${e.n} — ${e.d}`, 'bad');
      this.sfx('boss');
      break;
    }
  },
  /** 빗줄기 페이드 인/아웃 + 화면 좌표계 낙하 갱신. rainT는 구름 농도에도 같이 쓴다 —
      비가 그친 뒤에도 구름이 서서히 걷히도록 즉시 0으로 끊지 않는다. */
  updateWeather(dt) {
    /* 비 이벤트의 zones 목록엔 'village'·'camp'가 없다 — 안전 지대 몹까지 비로
       강해지면 안 되니까 일부러 뺐다. 그런데 그 판정을 그대로 빗줄기 표시에도 썼더니,
       마을·캠프에 들어서는 순간 비가 시각적으로 뚝 그쳐 보였다(브금은 pickBgm()이
       이미 우선하게 따로 처리해 둬서 안 끊겼는데, 비 연출만 끊긴 것). 게임성(몹 버프·
       스폰표)은 eventActive() 그대로 두고, **눈에 보이는 비**만 두 안전 지대에서도
       계속 나오게 한다. */
    const isRain = this.event && this.event.id === 'rain';
    const p = this.player, w = this.world;
    const zone = (isRain && p && w) ? w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS)) : null;
    const inSafeZone = zone === 'village' || zone === 'camp';
    const raining = isRain && (this.eventActive() || inSafeZone);
    // 얼음 지형에서는 같은 비 이벤트가 눈으로 보여야 자연스럽다
    const snowing = raining && zone === 'ice';
    if (snowing !== !!this.snowMode) { this.snowMode = snowing; this.rainDrops = null; }
    this.rainT = clamp((this.rainT || 0) + (raining ? 1 : -1) * dt / 2.5, 0, 1);
    if (this.rainT <= 0) { this.rainDrops = null; return; }
    if (!this.rainDrops) {
      this.rainDrops = [];
      const n = this.snowMode ? 110 : 160;
      for (let i = 0; i < n; i++) this.rainDrops.push(this.snowMode ? {
        x: Math.random() * (this.W || 1280), y: Math.random() * (this.H || 720),
        r: 1.5 + Math.random() * 2, spd: 40 + Math.random() * 50,
        drift: Math.random() * TAU, sway: 20 + Math.random() * 30
      } : {
        x: Math.random() * (this.W || 1280), y: Math.random() * (this.H || 720),
        len: 10 + Math.random() * 14, spd: 480 + Math.random() * 260
      });
    }
    if (this.snowMode) {
      for (const d of this.rainDrops) {
        d.y += d.spd * dt; d.drift += dt * 1.4;
        d.x += Math.sin(d.drift) * d.sway * dt;
        if (d.y > this.H) { d.y = -10; d.x = Math.random() * this.W; }
        if (d.x < -20) d.x = this.W + 20; else if (d.x > this.W + 20) d.x = -20;
      }
    } else {
      for (const d of this.rainDrops) {
        d.y += d.spd * dt; d.x -= d.spd * 0.15 * dt;
        if (d.y > this.H) { d.y = -20; d.x = Math.random() * this.W; }
        if (d.x < -20) d.x = this.W + 20;
      }
    }
  },

  /** 근처 웅덩이 한 곳을 골라 물속 생물을 채운다. 채웠으면 true.
      큰 웅덩이일수록 사나운 것이 살고, 작은 웅덩이에는 송사리만 있다. */
  trySpawnWater(normal) {
    const p = this.player, w = this.world;
    const pools = w.pools;
    if (!pools || !pools.length) return false;
    if (normal >= 20) return false;
    if (Math.random() > 0.35) return false;
    const near = [];
    for (const pl of pools) {
      const d = dist(p.cx, p.cy, (pl.x + .5) * TS, (pl.y + .5) * TS);
      if (d > 300 && d < 1100) near.push(pl);
    }
    if (!near.length) return false;
    const pool = near[Math.floor(Math.random() * near.length)];
    // 정글 폭포호처럼 spawnMul이 붙은 웅덩이는 그 비율만큼만 실제로 채운다
    // (동굴 호수 대비 60% — 지상 지형이라 은신처가 적다는 설정)
    if (pool.spawnMul !== undefined && Math.random() > pool.spawnMul) return false;
    // 웅덩이 표면 근처에서 실제로 물인 칸을 찾는다
    for (let att = 0; att < 12; att++) {
      const tx = pool.x + Math.round((Math.random() - .5) * (pool.big ? 18 : 8));
      const ty = pool.y + Math.floor(Math.random() * (pool.big ? 6 : 3));
      if (!w.liquid(tx, ty)) continue;
      const sx = tx * TS - this.cam.x, sy = ty * TS - this.cam.y;
      if (sx > -60 && sx < this.W + 60 && sy > -60 && sy < this.H + 60) continue;
      // 정글 폭포호는 위험한 웅덩이 뱀장어보다 눈에 잘 띄는 비단잉어가 대부분이어야
      // "물고기가 사는 호수"로 보인다 — 그래도 가끔은 긴장감이 있게 한 마리는 남겨 둔다
      const table = pool.biome === 'jungle'
        ? ['jungle_koi', 'jungle_koi', 'jungle_koi', 'grotto_eel']
        : pool.big
        ? ['grotto_eel', 'cave_minnow', 'drowned_hand', 'grotto_eel']
        : ['cave_minnow', 'cave_minnow', 'grotto_eel'];
      const type = table[Math.floor(Math.random() * table.length)];
      if (this.ents.filter(e => e instanceof Enemy && e.def.ai === 'swimmer').length >= 7) return false;
      this.ents.push(new Enemy(type, tx * TS, ty * TS, this.scale()));
      return true;
    }
    return false;
  },

  trySpawn() {
    const p = this.player, w = this.world;
    const normal = this.ents.filter(e => e instanceof Enemy && !e.boss).length;
    const ev = this.eventActive() ? this.eventSpec() : null;
    if (normal >= (ev ? ev.cap : 22) || this.boss) return;
    const night = this.dayT < 5 * 60 || this.dayT > 19 * 60;
    // 스폰 반경(최대 980px≈44타일)이 수직으로도 적용되므로, 하늘/유적처럼 고도로만 갈리는
    // 구역은 플레이어가 실제로 그 구역에 있을 때만 후보로 허용한다 (지상에서 하늘 몹이 쏟아지는 것 방지)
    const playerZone = w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    // 물속 생물은 웅덩이 안에서만 산다. 무작위 좌표가 물에 떨어질 확률은 거의 0이라
    // 근처 웅덩이 목록에서 직접 골라 채운다 (그 물이 화면 밖일 때만).
    if (this.trySpawnWater(normal)) return;
    for (let att = 0; att < 22; att++) {
      const ang = Math.random() * TAU;
      const rad = 520 + Math.random() * 460;
      const tx = Math.floor((p.cx + Math.cos(ang) * rad) / TS);
      const ty = Math.floor((p.cy + Math.sin(ang) * rad) / TS);
      if (tx < 3 || ty < 3 || tx >= WW - 3 || ty >= WH - 6) continue;
      // 화면 밖이어야 함
      const sx = tx * TS - this.cam.x, sy = ty * TS - this.cam.y;
      if (sx > -80 && sx < this.W + 80 && sy > -80 && sy < this.H + 80) continue;
      if (w.get(tx, ty) !== T.AIR || w.get(tx, ty - 1) !== T.AIR) continue;
      const zone = w.zoneAt(tx, ty);
      if (zone === 'sky' && playerZone !== 'sky') continue;
      if (zone === 'ruin' && playerZone !== 'ruin') continue;
      if (zone === 'works' && playerZone !== 'works') continue;
      if (zone === 'runaway' && playerZone !== 'runaway') continue;
      if (zone === 'atelier' && playerZone !== 'atelier') continue;
      if (zone === 'citadel' && playerZone !== 'citadel') continue;
      if (zone === 'deepshaft' && playerZone !== 'deepshaft') continue;
      // 이벤트 중에는 해당 구역의 스폰표를 통째로 갈아 끼운다 — 단, 비처럼 table이 없는
      // 이벤트는 몹 종류는 그대로 두고 세기만(buff) 바꾼다
      const evHere = ev && ev.zones.indexOf(zone) >= 0 ? ev : null;
      const table = (evHere && evHere.table) ? evHere.table : this.zoneTable(zone, night, tx, ty);
      const type = table[Math.floor(Math.random() * table.length)];
      const flying = ENEMIES[type].ai === 'flyer' || ENEMIES[type].ai === 'caster';
      let sy2 = ty;
      if (!flying) {
        // 무작위로 찍은 점이 마침 땅 위일 확률은 낮아서, 예전에는 지상 몹이 거의 안 나오고
        // 비행·캐스터만 뽑히는 편향이 있었다. 몇 칸 아래까지 훑어 발 디딜 곳을 찾아 준다
        let ok = false;
        for (let d = 0; d < 14; d++) {
          const yy = ty + d;
          if (yy >= WH - 6) break;
          if (w.solid(tx, yy + 1) && w.get(tx, yy) === T.AIR && w.get(tx, yy - 1) === T.AIR) { sy2 = yy; ok = true; break; }
        }
        if (!ok) continue;
      }
      // 안전 지대(베이스캠프·여명 마을) 근처 스폰 억제 — 발 디딜 곳을 찾은 뒤(sy2)의
      // 실제 위치로 판정해야, 경계에서 위쪽 절반만 살짝 걸치는 어긋남이 안 생긴다
      if (w.zoneAt(tx, sy2) === 'camp' || w.zoneAt(tx, sy2) === 'village') continue;
      // 바이옴 유적 안이면 그 유적에 매긴 배율을 태운다 — 같은 잡몹이라도 갱도의 거미와
      // 부패한 둥지의 사냥꾼은 세기가 달라야 유적을 고르는 의미가 생긴다
      const ruinMul = zone === 'ruin' ? w.ruinMobMul(tx, sy2) : 1;
      const e = new Enemy(type, tx * TS, (sy2 - 1) * TS, this.scale() * ruinMul);
      // buff형 이벤트(비 등) — 몹 종류는 평소 그대로, 체력·공격력만 따로 올린다
      if (evHere && evHere.buff) {
        if (evHere.buff.hp) { e.maxHp = Math.round(e.maxHp * evHere.buff.hp); e.hp = e.maxHp; }
        if (evHere.buff.dmg) e.dmg *= evHere.buff.dmg;
        e.weatherBuffed = true;
      }
      // 정예 — 어느 바이옴에서나 낮은 확률로, 그 자리에 있는 몹이 통째로 강해져 나온다.
      // 새 몹을 만드는 대신 스폰표에 이미 있는 몹을 그대로 부풀리는 쪽을 골랐다 —
      // "여기 원래 살던 게 오늘따라 사납다"는 인상을 주려는 것이다.
      if (ENEMIES[type].ai !== 'critter' && !this.boss && this.rng.chance(0.018)) {
        e.maxHp = Math.round(e.maxHp * 2.6); e.hp = e.maxHp;
        e.dmg *= 1.8; e.armor += 14; e.xp = Math.round(e.xp * 4); e.gold = Math.round(e.gold * 4);
        e.elite = true;
        this.toast(`어디선가 유난히 사나운 ${ENEMIES[type].n}의 기척이 느껴진다`, 'bad');
      }
      this.ents.push(e);
      return;
    }
  },

  /* ================= 진행 ================= */
  objProgress(ch, i) {
    const o = ch.obj[i], p = this.player;
    let cur = 0, max = 1;
    switch (o.type) {
      case 'kill': cur = p.kills[o.target] || 0; max = o.n; break;
      case 'mine': cur = p.mined[o.tile] || 0; max = o.n; break;
      case 'collect': cur = Math.max(p.countItem(o.item), p.gathered[o.item] || 0); max = o.n; break;
      case 'craft': cur = (this.crafted && this.crafted[o.item]) ? 1 : 0; max = 1; break;
      case 'talk': cur = (this.talked && this.talked[o.npc]) ? 1 : 0; max = 1; break;
      case 'depth':
        if (o.up) {   // 위로 올라가는 목표: 낮은 y일수록 진행
          const gained = clamp(SURF_BASE - (p.highest === undefined ? SURF_BASE : p.highest), 0, SURF_BASE - o.y);
          cur = gained; max = SURF_BASE - o.y;
        } else { cur = Math.min(p.deepest, o.y); max = o.y; }
        break;
      case 'boss': cur = p.bossKilled[o.target] ? 1 : 0; max = 1; break;
    }
    return { cur: Math.min(cur, max), max, done: cur >= max };
  },
  checkChapter() {
    const ch = CHAPTERS[this.chapter];
    if (!ch) return;
    for (let i = 0; i < ch.obj.length; i++) if (!this.objProgress(ch, i).done) { UI.refreshTracker(); return; }
    // 완료
    const p = this.player;
    p.addXp(ch.rw.xp); p.gold += ch.rw.gold;
    for (const [id, n] of (ch.rw.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 2);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    }
    this.toast(`『${ch.title}』 완료 — 경험치 ${fmt(ch.rw.xp)} · 금화 ${fmt(ch.rw.gold)}`, 'good');
    this.chapter++;
    UI.refreshBag();

    /* 여명 마을 해금은 "다음 챕터가 없을 때"가 아니라 **8장(세션 1 종장)을 끝냈을 때**다.
       예전에는 마지막 챕터 조건으로 걸어 두었는데, 세션 2 챕터가 붙으면서 조건이 영영
       참이 되지 않았다 — 마을이 안 열리고, 9장의 「케이드와 대화」가 불가능해져
       거기서 진행이 막혀 있었다. */
    let delay = 1400;
    if (ch.id === 8 && !this.villageUnlocked) {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      this.rollBounties();
      setTimeout(() => {
        UI.chapterCard({ sub: '', title: '여명 마을', line: '잿빛이 걷혔다' });
        this.toast('동쪽 숲에 묻혀 있던 도시가 드러났다.', 'good');
        setTimeout(() => this.toast('베이스캠프의 귀환 비석으로 여명 마을에 갈 수 있다.', 'good'), 2400);
      }, 1400);
      delay = 6000;                          // 마을 연출이 끝난 뒤에 다음 장 카드
    }
    // 다음 장을 지금 붙잡아 둔다 — setTimeout 안에서 this.chapter를 다시 읽으면,
    // 두 장이 잇달아 완료될 때 이미 넘어간 값을 읽어 엉뚱한 카드가 뜨거나 터진다
    const next = CHAPTERS[this.chapter];
    /* 끝난 장의 뒷이야기(outro) → 다음 장 카드 → 다음 장 도입(intro) 순으로 잇는다.
       이 글들은 원래 여정의 기록 패널에만 있어서, 그냥 플레이만 하면 이야기를 한 줄도
       못 보고 지나갔다. 이제 장이 넘어갈 때마다 실제로 읽게 된다. */
    setTimeout(() => {
      UI.storyScene(ch, 'outro', () => {
        if (next) {
          UI.chapterCard(next);
          setTimeout(() => UI.storyScene(next, 'intro'), 4000);
        } else {
          // 이야기는 끝난 게 아니라 "여기까지 쓰였다". 뒤로 계속 이어붙일 자리를 남겨 둔다
          UI.chapterCard({ sub: '이야기는 계속된다', title: '벽 너머', line: '— 여기까지가 지금까지 쓰인 이야기다 —' });
          this.toast('아직 열리지 않은 장이 남아 있다. 그때까지 이 세계는 당신 것이다.', 'good');
        }
      });
    }, delay);
    UI.refreshTracker(); UI.refreshQuest();
    this.sfx('chapter');
    if (ch.rw.gold) this.pending.push({ t: 0.45, fn: () => this.sfx('manycoins') });
  },
  onKill() { },
  /** 이벤트 중 처치 보상 배수 (경험치·금화) */
  killMult() {
    const ev = this.eventActive() ? this.eventSpec() : null;
    return ev ? ev.rw : 1;
  },
  onPickup(it) {
    if (it && idef(it).type !== 'block' && idef(it).type !== 'mat') this.toast(`${itemName(it)} 획득`, 'good');
    UI.refreshBag();
  },
  onLevelUp(lv) {
    this.toast(`레벨 ${lv} 달성! 스탯 +3, ${lv % 2 === 0 ? '특성 +1' : ''}`, 'good');
    for (let i = 0; i < 30; i++) this.parts.push(new Part(this.player.cx, this.player.cy, '#ffe08a', -80, 0.9));
    UI.refreshStatAlloc(); this.sfx('level');
  },
  onDeath() {
    if (this.state !== 'play') return;
    const p = this.player;
    const lostXp = Math.floor(p.xp * 0.15), lostG = Math.floor(p.gold * 0.4);
    p.xp -= lostXp; p.gold -= lostG;
    // 죽은 자리를 남긴다 — 세계가 4200타일이라 "어디서 죽었더라"를 기억으로 버티기 어렵다.
    // 화면 가장자리 나침반과 지도 양쪽에 뜨고, 그 자리에 다시 가면 저절로 지워진다.
    /* 하드는 가방의 절반까지 비석에 함께 담는다. 불가능은 아래에서 슬롯째 지운다. */
    const md = MODE_OF(this.mode);
    let lostItems = [];
    if (md.death === 'drop') {
      const filled = p.bag.map((it, i) => it ? i : -1).filter(i => i >= 0);
      // 잠근 칸(Ctrl+좌클릭)은 남긴다 — 잠금은 "이건 잃고 싶지 않다"는 표시다
      const droppable = filled.filter(i => !p.bag[i].lock);
      for (let n = Math.floor(droppable.length / 2); n > 0; n--) {
        const k = droppable.splice(Math.floor(Math.random() * droppable.length), 1)[0];
        lostItems.push(p.bag[k]); p.bag[k] = null;
      }
      UI.refreshBag();
    }
    this.deathMark = {
      x: p.cx, y: p.cy, gold: lostG, xp: lostXp, items: lostItems,
      // 게임 시간 12시간이 지나면 사라진다. dayT 는 하루 1440분이라 절대 시각으로 재둔다.
      at: this.dayCount * 1440 + this.dayT
    };
    if (md.death === 'wipe') {
      // 불가능 모드 — 이 슬롯의 기록을 지운다. 비석도 남지 않는다.
      this.deathMark = null;
      if (this.currentSlot !== null) localStorage.removeItem(slotKey(this.currentSlot));
      $('#death-line').textContent = '불가능 모드였다. 이 슬롯의 기록이 지워졌다.';
      $('#death-screen').classList.add('open');
      $('#death-screen').classList.add('wipe');
      this.paused = true;
      this.sfx('death');
      return;
    }
    const parts = [`경험치 ${fmt(lostXp)}와 금화 ${fmt(lostG)}를 잃었다.`];
    if (lostItems.length) parts.push(`가방에서 ${lostItems.length}칸이 떨어졌다.`);
    parts.push('쓰러진 자리에 비석이 섰다 — 돌아가면 절반을 되찾는다.');
    $('#death-line').textContent = parts.join(' ');
    $('#death-screen').classList.add('open');
    this.paused = true;
    this.sfx('death');
  },

  /* ---- 길잡이 ----
     지금 장의 목표 중 "갈 곳이 정해져 있는 것"만 골라 좌표로 바꾼다. 세계가 넓어지면서
     "부패한 땅으로 가라"는 말만으로는 방향을 못 잡는 일이 생겼다. 사냥·채집처럼 자리가
     정해지지 않은 목표는 일부러 넣지 않는다 — 다 찍어 주면 탐험할 이유가 없어진다. */
  questTargets() {
    const w = this.world, ch = CHAPTERS[this.chapter];
    const out = [];
    if (this.deathMark) out.push({ x: this.deathMark.x, y: this.deathMark.y, k: 'death', t: '쓰러진 자리' });
    /* 지도를 편 유적 — 입구가 없어 지도 없이는 못 찾는 곳이라, 표시가 곧 길이다.
       그 유적에 한 번 들어가 보고 나면 표시를 거둔다(다 아는 자리를 계속 가리키지 않게). */
    for (const id in (this.ruinMarks || {})) {
      if (this.seenRuins && this.seenRuins[id]) continue;
      const r = w && w.ruins && w.ruins.find(q => q.id === id);
      if (!r) continue;
      const sp = RUIN_SPEC.find(q => q.id === id);
      out.push({ x: (r.x + 0.5) * TS, y: r.y * TS, k: 'ruin', t: (sp ? sp.n : '유적') + ' — 지도의 자리' });
    }
    if (!ch || !w) return out;
    ch.obj.forEach((o, i) => {
      if (this.objProgress(ch, i).done) return;
      if (o.type === 'boss') {
        const ob = w.objects.find(q => (q.type === 'altar' || q.type === 'lair') && q.boss === o.target);
        if (ob) out.push({ x: ob.x + ob.w / 2, y: ob.y, k: 'boss', t: o.t });
      } else if (o.type === 'talk') {
        const ob = w.objects.find(q => q.type === 'npc' && q.npc === o.npc);
        if (ob) out.push({ x: ob.x + ob.w / 2, y: ob.y, k: 'npc', t: o.t });
      } else if (o.type === 'collect' && o.item === 'rune_frag') {
        for (const q of w.objects) if (q.type === 'tablet') out.push({ x: q.x, y: q.y, k: 'tablet', t: o.t });
      }
    });
    return out;
  },
  /** 화면 밖 목표를 플레이어 주변 원 위의 화살표로 알려 준다.
      화면 가장자리에 붙이면 미니맵·퀘스트 트래커에 가려지므로, 플레이어를 중심으로 한
      원 위에 놓는다. 시선이 늘 머무는 자리라 눈에도 더 잘 들어온다. */
  drawCompass(c, camX, camY) {
    const targets = this.questTargets();
    if (!targets.length) return;
    const COL = { boss: '#e0563c', npc: '#7fe0a0', tablet: '#c8a86a', death: '#9fa8c0', ruin: '#c8a04a' };
    const p = this.player;
    const ox = p.cx - camX, oy = p.cy - camY;      // 플레이어의 화면 좌표
    const R = 132;
    c.save();
    c.font = '11px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    // 같은 방향에 여럿이 겹치지 않도록 살짝 밀어 놓는다
    const used = [];
    for (const g of targets) {
      const sx = g.x - camX, sy = g.y - camY;
      if (sx > -30 && sx < this.W + 30 && sy > -30 && sy < this.H + 30) continue;   // 이미 보인다
      let a = Math.atan2(sy - oy, sx - ox);
      for (let k = 0; k < 8; k++) {
        if (!used.some(u => Math.abs(((a - u + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.22)) break;
        a += 0.24;
      }
      used.push(a);
      // 카메라가 세계 경계에서 멈추면 플레이어가 화면 구석에 서게 된다. 그때 원 일부가
      // 화면 밖으로 나가므로, 생략하지 않고 안쪽으로 끌어당겨 항상 보이게 한다.
      const px = clamp(ox + Math.cos(a) * R, 46, this.W - 46);
      const py = clamp(oy + Math.sin(a) * R, 46, this.H - 56);
      const col = COL[g.k] || '#e0c86a';
      /* 화살표는 save/restore로 감싼다. 예전에는 rotate(-a)·translate(-px,-py)로 직접
         되돌렸는데, cos/sin(a)와 cos/sin(-a)가 부동소수점에서 정확한 역행렬이 아니라서
         화살표를 하나 그릴 때마다 아주 작은 오차가 남았다. 그게 쌓여 바로 뒤에 그리는
         거리 라벨이 미세하게 기울어 보였다(화살표와 글자가 맞닿는 부분이 뒤틀리던 원인). */
      c.save();
      c.globalAlpha = .82;
      c.translate(px, py); c.rotate(a);
      c.fillStyle = col;
      c.beginPath(); c.moveTo(13, 0); c.lineTo(-7, -7); c.lineTo(-3, 0); c.lineTo(-7, 7); c.closePath(); c.fill();
      c.restore();
      // 거리 — 화살표 안쪽(플레이어 쪽)에 적어야 화면 밖으로 안 밀린다.
      // 예전엔 고정 24px만 띄웠는데, 화살표 몸통이 중심에서 뒤로 7px까지 나와 있어서
      // 라벨 상자가 그 폭의 절반만큼(글자가 길수록 더 크게) 화살표 쪽으로 파고들어
      // 겹쳐 보였다. 상자 폭을 먼저 재서 화살표 뒤끝을 안 넘어가게 띄우는 거리를 정한다.
      const distTxt = Math.round(Math.hypot(g.x - p.cx, g.y - p.cy) / TS) + 'm';
      const tw = c.measureText(distTxt).width;
      const boxW = 15 + tw + 10;
      const gap = 7 + boxW / 2 + 4;
      const lx = clamp(px - Math.cos(a) * gap, boxW / 2 + 2, this.W - boxW / 2 - 2);
      const ly = clamp(py - Math.sin(a) * gap, 12, this.H - 12);
      c.fillStyle = '#000b'; c.fillRect(lx - boxW / 2, ly - 7, boxW, 14);
      this.drawCompassGlyph(c, g.k, lx - boxW / 2 + 8, ly, col);
      c.fillStyle = col;
      c.fillText(distTxt, lx - boxW / 2 + 16, ly + 1);
    }
    c.restore();
  },
  /** 나침반 라벨 앞에 붙는 작은 아이콘 — 이모지 대신 캔버스로 직접 그린다(플랫폼마다
      이모지 폰트가 달라 삐뚤빼뚤 보이는 문제, 픽셀아트 톤과도 안 맞는 문제를 함께 없앤다).
      cx, cy는 아이콘 중심. 8px 안팎의 작은 그림이라 형태는 최대한 단순하게 잡았다. */
  drawCompassGlyph(c, kind, cx, cy, col) {
    c.save();
    c.translate(cx, cy);
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.2;
    if (kind === 'npc') {
      // 말풍선 — 몸통 + 꼬리
      c.beginPath(); c.roundRect ? c.roundRect(-4.5, -3.5, 9, 6, 1.5) : c.rect(-4.5, -3.5, 9, 6);
      c.fill();
      c.beginPath(); c.moveTo(-1.5, 2.3); c.lineTo(-3, 4.5); c.lineTo(0.5, 2.3); c.closePath(); c.fill();
    } else if (kind === 'boss') {
      // 위협 표시 — 마름모 + 느낌표
      c.beginPath(); c.moveTo(0, -5); c.lineTo(5, 0); c.lineTo(0, 5); c.lineTo(-5, 0); c.closePath(); c.fill();
      c.fillStyle = '#1a1108';
      c.fillRect(-0.7, -2.6, 1.4, 3); c.fillRect(-0.7, 1.2, 1.4, 1.4);
    } else if (kind === 'tablet') {
      // 비문 — 세로 판 + 가로줄 둘
      c.beginPath(); c.roundRect ? c.roundRect(-3.5, -5, 7, 10, 1) : c.rect(-3.5, -5, 7, 10);
      c.fill();
      c.strokeStyle = '#1a1108'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-2, -1.5); c.lineTo(2, -1.5); c.moveTo(-2, 1.5); c.lineTo(2, 1.5); c.stroke();
    } else if (kind === 'death') {
      // 쓰러진 자리 — 십자
      c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -5); c.lineTo(0, 3.5); c.moveTo(-3, -1.5); c.lineTo(3, -1.5); c.stroke();
    }
    c.restore();
  },
  respawn() {
    const p = this.player, w = this.world;
    // 여명 마을이 드러난 뒤(세션 2)부터는 거기서 부활한다 — 그 전까지는 베이스캠프가
    // 유일한 정착지라 거기서 부활하는 게 맞지만, 마을이 열린 뒤에도 계속 베이스캠프로
    // 돌아가게 두면 9~12장(x2680~3960대) 사망마다 세계를 절반 가로질러 돌아와야 했다.
    const d = w.dawnCity;
    // 광장 정중앙(cx)은 분수대 자리다(restoreDawnCity의 fountain: (cx-2)~(cx+2)) —
    // 그 위에 그대로 부활하면 캐릭터가 분수 위에 겹쳐 보인다. 분수 바로 옆(서쪽,
    // 게시판과 분수 사이 빈 자리)으로 5칸 옮겨 둔다.
    if (this.villageUnlocked && d) { p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; }
    else { p.x = w.spawnX * TS; p.y = (w.spawnY - 3) * TS; }
    p.vx = p.vy = 0;
    p.hp = p.d.maxHp; p.mp = p.d.maxMp; p.iframe = 2; p.buffs = [];
    this.ents = []; this.boss = null; this.projs = [];
    $('#death-screen').classList.remove('open');
    this.paused = false;
  },
  setPause(on) {
    this.paused = on;
    $('#pause-screen').classList.toggle('open', on);
    if (on) UI.syncSettings();      // 열 때마다 현재 값으로 맞춘다
  },
  /* 설정에서 끈 갈래는 띄우지 않는다. 'bad'(죽음·실패)와 갈래 없는 것은 항상 띄운다 —
     놓치면 곤란한 것까지 끌 수 있게 두지는 않는다. */
  toast(m, k) {
    if (k && k !== 'bad') {
      const n = this.settings && this.settings.notice;
      if (n && n[k] === 0) return;
    }
    UI.toast(m, k);
  },

  /* ================= 저장 ================= */
  saveGame() {
    if (this.currentSlot === null) return;   // 타이틀에서 슬롯을 거치지 않고는 저장할 수 없다
    try {
      const p = this.player;
      const data = {
        v: 1, name: p.name, savedAt: Date.now(), mode: this.mode, charId: p.charId,
        world: this.world.serialize(), chapter: this.chapter, dayT: this.dayT,
        talked: this.talked, crafted: this.crafted,
        sideActive: this.sideActive, sideDone: this.sideDone, tabletsRead: this.tabletsRead, termsRead: this.termsRead, loreRead: this.loreRead,
        seenRuins: this.seenRuins, ruinMarks: this.ruinMarks, ruinEvDone: this.ruinEvDone,
        deathMark: this.deathMark,
        villageUnlocked: this.villageUnlocked, goldRate: this.goldRate, dayCount: this.dayCount,
        lairs: this.lairs,
        vault: this.vault, vaultGold: this.vaultGold, bounties: this.bounties,
        p: {
          x: p.x, y: p.y, level: p.level, xp: p.xp, xpNext: p.xpNext, statPts: p.statPts, skillPts: p.skillPts,
          base: p.base, hp: p.hp, mp: p.mp, charge: p.charge, gold: p.gold, bag: p.bag, equip: p.equip, sel: p.sel,
          charId: p.charId,
          skills: p.skills, slots: p.slots, kills: p.kills, mined: p.mined, bossKilled: p.bossKilled,
          deepest: p.deepest, highest: p.highest, gathered: p.gathered
        }
      };
      localStorage.setItem(slotKey(this.currentSlot), JSON.stringify(data));
      this.toast('저장했다', 'good');
    } catch (e) { this.toast('저장 실패: 용량 초과', 'bad'); console.error(e); }
  },
  loadGame(slot) {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) { this.toast('저장된 기록이 없다', 'bad'); return; }
    this.currentSlot = slot;
    this.showLoading('기록을 불러오는 중…');
    setTimeout(() => { try { this._loadGame(raw); } finally { this.hideLoading(); } }, 40);
  },
  _loadGame(raw) {
    try {
      const d = JSON.parse(raw);
      // 세계 폭이 바뀐 버전의 기록은 그대로 풀면 지형이 어긋난 채로 열린다 — 아예 막는다
      if (d.world && d.world.ww && d.world.ww !== WW) {
        this.toast(`이전 크기(${d.world.ww})의 세계라 열 수 없다 — 새로 시작해야 한다`, 'bad');
        return;
      }
      this.world = World.deserialize(d.world);
      this.rng = new RNG(d.world.seed + '_g');
      const p = new Player(d.p.x, d.p.y);
      p.name = d.name || '이름 없는 모험가';
      Object.assign(p, {
        level: d.p.level, xp: d.p.xp, xpNext: d.p.xpNext, statPts: d.p.statPts, skillPts: d.p.skillPts,
        base: d.p.base, gold: d.p.gold, bag: d.p.bag, equip: d.p.equip, sel: d.p.sel,
        skills: d.p.skills, slots: d.p.slots, kills: d.p.kills, mined: d.p.mined,
        bossKilled: d.p.bossKilled, deepest: d.p.deepest, highest: d.p.highest, gathered: d.p.gathered || {}
      });
      p.charId = CHAR_OF(d.p.charId).id;
      // v1.0.1까지의 세이브는 펫이 도감(pets{}/activePet)이었다 — 그때 모은 펫을 잃지 않도록
      // 전부 아이템으로 바꿔 가방에 넣고, 쓰고 있던 펫은 그대로 펫 슬롯에 끼워 준다.
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
      this.sideActive = d.sideActive || {}; this.sideDone = d.sideDone || {};
      this.tabletsRead = d.tabletsRead || {}; this.termsRead = d.termsRead || {}; this.loreRead = d.loreRead || {};
      this.seenRuins = d.seenRuins || {};
      this.ruinMarks = d.ruinMarks || {}; this.ruinEvDone = d.ruinEvDone || {};
      this.deathMark = d.deathMark || null;
      this.mode = MODE_OF(d.mode).id;
      this.villageUnlocked = d.villageUnlocked || false; this.goldRate = d.goldRate || 1;
      this.dayCount = d.dayCount || 0; this.market = {}; this.trainedToday = 0;
      this.nearStObj = { work: null, forge: null };
      this.event = null; this.eventRolled = -1; this.lairs = d.lairs || {};
      this.rainT = 0; this.rainDrops = null;
      this.vault = d.vault || new Array(VAULT_SIZE).fill(null); this.vaultGold = d.vaultGold || 0;
      while (this.vault.length < this.vaultCap()) this.vault.push(null);
      this.bounties = d.bounties || [];
      if (this.villageUnlocked && !this.bounties.length) this.rollBounties();
      this.ents = []; this.projs = []; this.parts = []; this.texts = []; this.drops = []; this.pending = []; this.boss = null;
      this.guardCd = 0; this.facTimer = 0; this.cropTimer = 0;   // 새로 시작할 때 남아 있던 대기 시간을 지운다
      // 카메라를 저장된 위치로 바로 맞춘다 — 안 하면 (0,0) 근처에서 훅 팬 되는 게 첫 프레임에 보인다
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      $('#title-screen').style.display = 'none';
    if (typeof TitleBG !== 'undefined') TitleBG.stop();   // 화면 밖이면 프레임을 낭비하지 않는다
      this.closeAllModals();
      this.state = 'play'; this.paused = false;
      this.petEnts = []; this.syncPets();
      UI.refreshBag(); UI.refreshEquip(); UI.refreshTracker(); UI.refreshSkillbar(); UI.refreshStatAlloc(); UI.refreshSkillSlots();
      this.toast('여정을 이어간다', 'good');
      this.audioInit();
      this.buildMapAtlas();
    } catch (e) { this.toast('불러오기 실패', 'bad'); console.error(e); }
  },

  /* ================= 세이브 슬롯 ================= */
  /** v1.0.4까지는 슬롯 없이 SAVE_KEY 하나였다. 그 기록이 남아 있고 슬롯0이 아직
      비어 있으면 한 번만 슬롯0으로 옮겨서 기존 진행을 잃지 않게 한다. */
  migrateLegacySave() {
    const legacy = localStorage.getItem(SAVE_KEY);
    if (!legacy || localStorage.getItem(slotKey(0))) return;
    try {
      const d = JSON.parse(legacy);
      d.name = d.name || '이름 없는 모험가';
      d.savedAt = d.savedAt || Date.now();
      localStorage.setItem(slotKey(0), JSON.stringify(d));
      localStorage.removeItem(SAVE_KEY);
    } catch (e) { console.error(e); }
  },
  /** 슬롯 요약만 가볍게 읽는다 — World.deserialize()까지 갈 필요 없이 JSON.parse만 하면 된다 */
  listSlots() {
    const out = [];
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const raw = localStorage.getItem(slotKey(i));
      if (!raw) { out.push(null); continue; }
      try {
        const d = JSON.parse(raw);
        out.push({ name: d.name || '이름 없는 모험가', level: d.p.level, chapter: d.chapter, savedAt: d.savedAt });
      } catch (e) { out.push(null); }
    }
    return out;
  },
  deleteSlot(i) {
    if (!confirm('이 세이브를 정말 삭제할까요? 되돌릴 수 없습니다.')) return;
    localStorage.removeItem(slotKey(i));
    this.renderSlotScreen();
  },
  /** 타이틀 화면의 슬롯 목록을 새로 그린다. 빈 칸은 "새로운 여정" 버튼 하나만,
      찬 칸은 이름·레벨·장·마지막 저장 시각과 이어하기/삭제 버튼을 보여 준다. */
  renderSlotScreen() {
    const slots = this.listSlots();
    const box = $('#slot-list');
    box.innerHTML = slots.map((s, i) => {
      if (!s) {
        return `<div class="slot-card empty" data-slot="${i}">
          <div class="slot-empty-label">빈 슬롯</div>
          <button class="slot-new-btn" data-slot="${i}">새로운 여정</button>
        </div>`;
      }
      const when = s.savedAt ? new Date(s.savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="slot-card filled" data-slot="${i}">
        <div class="slot-info">
          <div class="slot-name">${escHtml(s.name)}</div>
          <div class="slot-meta">Lv.${s.level} · ${when}</div>
        </div>
        <div class="slot-actions">
          <button class="slot-load-btn" data-slot="${i}">이어하기</button>
          <button class="slot-del-btn" data-slot="${i}">삭제</button>
        </div>
      </div>`;
    }).join('');
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
  /* 팝업은 여러 겹으로 열린다(슬롯 위에 새 게임). 위에서부터 닫아야 한다. */
  MODAL_STACK: ['#newgame-screen', '#bye-screen', '#credits-screen', '#settings-screen', '#slots-screen'],
  /** 열려 있는 팝업 중 가장 위의 것을 닫는다. 닫을 게 없으면 false. */
  closeTopModal() {
    for (const sel of this.MODAL_STACK) {
      const el = $(sel);
      if (el && el.classList.contains('open')) { el.classList.remove('open'); return true; }
    }
    return false;
  },
  /** 게임에 들어갈 때 — 타이틀에서 열려 있던 팝업을 전부 걷는다 */
  closeAllModals() { this.MODAL_STACK.forEach(sel => { const el = $(sel); if (el) el.classList.remove('open'); }); },
  /** 나가기. 스크립트가 연 창이 아니면 브라우저가 close()를 막으므로,
      정말 닫혔는지 한 박자 뒤에 확인하고 안 닫혔으면 작별 화면을 띄운다. */
  quit() {
    try { window.close(); } catch (e) { }
    setTimeout(() => { if (!window.closed) this.openModal('#bye-screen'); }, 120);
  },

  /** 새 게임 팝업 — 캐릭터를 가장 크게 고르고, 난이도·이름·씨앗을 그 아래에서 정한다.
      여기서 고른 캐릭터와 난이도는 되돌릴 수 없다(설정에 없다). */
  showNewGameForm(slot) {
    const box = $('#newgame-box');
    let ci = 0, mi = 0;
    const kit = ch => {
      const nameOf = id => (ITEMS[id] && ITEMS[id].n) || id;
      const parts = [ch.weapon ? `<b>${escHtml(nameOf(ch.weapon))}</b>` : '<b>맨손</b>'];
      (ch.bag || []).forEach(([id, n]) => parts.push(`${escHtml(nameOf(id))} ×${n}`));
      if (ch.gold) parts.push(`금화 ${ch.gold}`);
      return parts.join(' · ');
    };
    const sheet = ch => `assets/char/player_${ch.id}.png`;
    box.innerHTML = `
      <div class="ng-sec">캐릭터</div>
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

      <div class="ng-sec">난이도</div>
      <div class="ng-modes">${MODES.map((m, i) => `
        <button class="ng-mode${i ? '' : ' on'}" data-i="${i}" style="--mc:${m.c}">${escHtml(m.n)}</button>`).join('')}</div>
      <p class="ng-mdesc" id="ng-mdesc">${escHtml(MODES[0].d)}</p>

      <div class="ng-fields">
        <label>이름<input class="ng-name-input" placeholder="이름 없는 모험가" maxlength="12"></label>
        <label>세계 씨앗<input class="ng-seed-input" placeholder="비워두면 무작위"></label>
      </div>
      <div class="ng-btns">
        <button class="ng-start">시작</button>
        <button class="ng-cancel">취소</button>
      </div>`;

    const paint = () => {
      const ch = CHARACTERS[ci];
      $('#ng-por').style.backgroundImage = `url(${sheet(ch)})`;
      $('#ng-name').textContent = ch.n;
      $('#ng-desc').textContent = ch.d;
      $('#ng-story').textContent = ch.story;
      $('#ng-stats').innerHTML = [['힘', 'str'], ['민첩', 'dex'], ['지능', 'int'], ['체력', 'vit']]
        .map(([n, k]) => `<span>${n} <b>${ch.base[k]}</b></span>`).join('');
      $('#ng-kit').innerHTML = kit(ch);
    };
    paint();

    box.querySelectorAll('.ng-char').forEach(b => b.onclick = () => {
      ci = +b.dataset.i;
      box.querySelectorAll('.ng-char').forEach(x => x.classList.toggle('on', x === b));
      paint();
    });
    box.querySelectorAll('.ng-mode').forEach(b => b.onclick = () => {
      mi = +b.dataset.i;
      box.querySelectorAll('.ng-mode').forEach(x => x.classList.toggle('on', x === b));
      $('#ng-mdesc').textContent = MODES[mi].d;
    });
    box.querySelector('.ng-start').onclick = () => {
      const name = box.querySelector('.ng-name-input').value;
      const seed = box.querySelector('.ng-seed-input').value.trim();
      // 되돌릴 수 없는 선택이라 불가능 모드만 한 번 더 묻는다
      if (MODES[mi].id === 'impossible' &&
          !confirm('불가능 모드입니다.\n한 번 죽으면 이 슬롯의 기록이 지워집니다. 시작할까요?')) return;
      this.closeModal('#newgame-screen');
      this.closeModal('#slots-screen');
      this.newGame(seed, slot, name, CHARACTERS[ci].id, MODES[mi].id);
    };
    box.querySelector('.ng-cancel').onclick = () => this.closeModal('#newgame-screen');
    this.openModal('#newgame-screen');
  },

  /* ================= 설정 ================= */
  loadSettings() {
    let v = {};
    try { v = JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch (e) { }
    this.settings = Object.assign({}, SET_DEFAULT, v);
    this.applySettings();
  },
  saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(this.settings)); } catch (e) { }
  },
  /** 설정값을 실제 동작에 반영한다. 슬라이더를 움직일 때마다 불린다 */
  applySettings() {
    const s = this.settings;
    if (window.Music) Music.vol = s.music / 100;
    if (window.Sfx) Sfx.vol = s.sfx / 100;
    if (window.Ambient) Ambient.vol = 0.45 * (s.sfx / 100);
    const mm = $('#minimap'); if (mm) mm.style.display = s.minimap ? '' : 'none';
    // 시야 배율은 캔버스 변환에 들어가므로 값이 바뀌면 다시 잡아 준다
    if (this._viewApplied !== s.view) { this._viewApplied = s.view; this.resize(); }
    UI.syncSettings();
  },
  setOpt(k, v) {
    this.settings[k] = v;
    this.applySettings();
    this.saveSettings();
  },

  /* ================= 사운드 ================= */
  audioInit() {
    if (this.ac) return;
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
  },
  /** 타일 좌표에서 나는 소리 — 화면 근처가 아니면 아예 재생하지 않는다.
      공장이 커지면 화면 밖 기계들이 초당 수십 번씩 완료 이벤트를 내기 때문에,
      거리로 먼저 거르지 않으면 드릴·벨트 소리가 끊임없이 겹쳐 운다. */
  sfxAt(kind, tx, ty) {
    const p = this.player; if (!p) return;
    const dx = Math.abs(tx * TS - p.cx), dy = Math.abs(ty * TS - p.cy);
    if (dx > this.W * 0.6 + 120 || dy > this.H * 0.6 + 120) return;
    this.sfx(kind);
  },
  sfx(kind) {
    if (window.Sfx && Sfx.play(kind)) return;   // 손그림 파일이 로드돼 있으면 그걸로 대신한다
    const ac = this.ac; if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const spec = {
      swing: [220, 90, 'triangle', .05], bow: [520, 180, 'square', .04], magic: [700, 340, 'sine', .05],
      mine: [140, 90, 'square', .035], place: [300, 220, 'square', .03], die: [180, 60, 'sawtooth', .05],
      bossdie: [90, 40, 'sawtooth', .12], level: [520, 880, 'sine', .08], coin: [880, 1200, 'square', .04],
      craft: [420, 620, 'triangle', .05], equip: [340, 460, 'sine', .04], drink: [300, 520, 'sine', .05],
      dash: [600, 260, 'sine', .04], skill: [420, 760, 'triangle', .06], boss: [70, 40, 'sawtooth', .16],
      chapter: [400, 720, 'sine', .09], death: [200, 60, 'sawtooth', .12], talk: [420, 460, 'sine', .03],
      open: [260, 380, 'square', .035], learn: [600, 900, 'triangle', .06],
      // --- 4단계: 농사 · 정지 스위치 ---
      hoe: [180, 110, 'square', .04], harvest: [500, 700, 'triangle', .05],
      power_on: [200, 500, 'square', .05], power_off: [500, 150, 'square', .05],
      splash: [560, 140, 'sine', .045],    // 낚싯줄이 물에 떨어지는 짧은 퐁당 소리
      hatch: [300, 900, 'triangle', .06]   // 껍질이 깨지고 뭔가 튀어나오는 느낌으로 올라가는 톤
    }[kind];
    if (!spec) return;
    const [f0, f1, type, vol] = spec;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + 0.16);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.24);
  },

  /* ================= 렌더 ================= */
  render() {
    const c = this.ctx, w = this.world, p = this.player;
    const shk = this.shake * (this.settings ? this.settings.shake / 100 : 1);
    const shX = (Math.random() - 0.5) * shk, shY = (Math.random() - 0.5) * shk;
    const camX = Math.round(this.cam.x + shX), camY = Math.round(this.cam.y + shY);

    // ---- 하늘 ----
    const dayF = this.dayFactor();
    this.drawSky(c, dayF, camX, camY);

    const tx0 = Math.floor(camX / TS), tx1 = Math.ceil((camX + this.W) / TS);
    const ty0 = Math.floor(camY / TS), ty1 = Math.ceil((camY + this.H) / TS);
    const dayLight = lerp(3.0, 15, dayF);
    // 발광 물약 — lit/lit_greater 버프가 있으면 미광 반경을 넓힌다. 예전엔 버프만 걸리고
    // 실제로 반경에 반영되는 곳이 없어서(죽은 버프) 상급/일반이 켜져 있으나 마나 똑같았다.
    const litR = p.buffs.some(b => b.id === 'lit_greater') ? 9.5 : p.buffs.some(b => b.id === 'lit') ? 6.8 : 4.6;
    w.computeLight(tx0, ty0, tx1, ty1, dayLight,
      [[Math.floor(p.cx / TS), Math.floor(p.cy / TS), litR]]);   // 플레이어 미광

    // ---- 배경 지형 ----
    this.drawParallax(c, camX, camY, dayF);

    // ---- 타일 (절차적 텍스처 아틀라스) ----
    const VA = TileArt.V;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) continue;
        const k = ty * WW + tx;
        const id = w.tiles[k], wl = w.walls[k];
        // 화면에 들어왔다고 곧바로 지도에 남기지 않는다. 실제로 빛이 닿은 칸만 탐험 처리해
        // 어두운 동굴 너머나 암흑 속 지형이 미니맵에 먼저 새는 일을 막는다.
        if (w.lightAt(tx, ty) >= MAP_REVEAL_LIGHT) {
          w.explored[k] = 1;
          this.mapAtlasX.fillStyle = this.mapColorAt(tx, ty, id, wl);
          this.mapAtlasX.fillRect(tx, ty, 1, 1);
        }
        const sx = tx * TS - camX, sy = ty * TS - camY;
        const v = (tileHash(tx, ty) * VA) | 0;
        if (id === T.AIR) { if (wl) TileArt.drawWall(c, wl, v, sx, sy); continue; }
        if (ALPHA_TILE[id] && wl) TileArt.drawWall(c, wl, v, sx, sy);
        if (id === T.PLATFORM) TileArt.draw(c, id, v, sx, sy, 7);
        else TileArt.draw(c, id, v, sx, sy);
        if (!TOP_SKIP[id] && !w.solid(tx, ty - 1)) {
          c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(sx, sy, TS, 2);
        }
      }
    }

    // ---- 기계 오버레이 (방향 · 벨트 위 아이템 · 진행/연료 · 상태등) ----
    Factory.render(c, w, camX, camY, tx0, ty0, tx1, ty1, this.time);

    // ---- 오브젝트 ----
    for (const o of w.objects) {
      const sx = o.x - camX, sy = o.y - camY;
      if (sx < -120 || sx > this.W + 120 || sy < -140 || sy > this.H + 140) continue;
      const f = 1;   // 명암은 조명 오버레이가 담당
      c.save(); c.globalAlpha = 1;
      /* 아래 셋(상자·작업대·용광로)은 이제 한 타일(22px) 안에 그려진다. 작아진 만큼
         "무엇인지"가 실루엣만으로 읽혀야 해서, 서로 겹치지 않는 특징을 하나씩 준다 —
         상자는 뚜껑 띠와 자물쇠, 작업대는 상판 아래 뚫린 다리 사이 공간, 용광로는
         네모난 몸통에 뚫린 불구멍. */
      if (o.type === 'chest' || o.type === 'crate') {
        const gold = o.gold || (o.type === 'chest' && o.tier >= 6);
        const body = shade(gold ? '#8a6a1a' : '#7a5326', f);
        const band = shade(gold ? '#ffd85a' : '#c8a04a', f);
        if (gold) {   // 황금 상자는 은은한 후광으로 멀리서도 눈에 띈다
          c.globalAlpha = .30 + Math.sin(this.time * 3) * .16;
          c.fillStyle = '#ffe58a';
          c.beginPath(); c.arc(sx + o.w / 2, sy + o.h / 2, o.w * .78, 0, TAU); c.fill();
          c.globalAlpha = 1;
        }
        c.fillStyle = body; c.fillRect(sx, sy + 3, o.w, o.h - 3);      // 몸통
        c.fillStyle = shade(gold ? '#a8841f' : '#96683a', f);
        c.fillRect(sx, sy, o.w, 5);                                    // 뚜껑
        c.fillStyle = band; c.fillRect(sx, sy + 4, o.w, 2);            // 뚜껑 띠
        c.fillStyle = band; c.fillRect(sx + o.w / 2 - 2, sy + 3, 4, 5); // 자물쇠
        c.strokeStyle = shade(gold ? '#e8b830' : '#3a2610', f);
        c.strokeRect(sx + .5, sy + .5, o.w - 1, o.h - 1);
      } else if (o.type === 'workbench') {
        // 손그림(레벨별 obj_workbench_lvN)이 있으면 그걸 쓰고, 없으면 절차 생성으로 폴백.
        // render()의 이 분기가 drawFacility()보다 먼저 걸려서, 손그림 우선순위 코드는
        // 여기 있어야 실제로 실행된다(drawFacility에 넣었던 건 도달 자체가 안 됐었다).
        if (!(this.spritesOn && Sprites.drawObj(c, 'obj_workbench_lv' + (o.lv || 1), sx, sy, o.w, o.h))) {
          // 상판 + 다리 두 개. 다리 사이가 비어 보여야 "책상"으로 읽힌다
          c.fillStyle = shade('#9c7a4a', f); c.fillRect(sx, sy, o.w, 3);
          c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + 3, o.w, 3);
          c.fillRect(sx + 2, sy + 6, 4, o.h - 6);
          c.fillRect(sx + o.w - 6, sy + 6, 4, o.h - 6);
          c.fillStyle = shade('#5c4026', f); c.fillRect(sx + 2, sy + o.h - 4, o.w - 4, 2);  // 아래 가로대
        }
      } else if (o.type === 'forge') {
        if (!(this.spritesOn && Sprites.drawObj(c, 'obj_forge_lv' + (o.lv || 1), sx, sy, o.w, o.h))) {
          // 꽉 찬 돌 몸통 + 아래쪽 불구멍. 작업대와 달리 밑이 막혀 있다
          c.fillStyle = shade('#4a4a52', f); c.fillRect(sx, sy + 3, o.w, o.h - 3);
          c.fillStyle = shade('#33333a', f); c.fillRect(sx, sy, o.w, 4);                    // 굴뚝 갓
          c.fillStyle = shade('#5c5c66', f); c.fillRect(sx + 1, sy + 5, o.w - 2, 2);
          c.fillStyle = '#ff8a3a'; c.globalAlpha = .8 + Math.sin(this.time * 6) * .18;
          c.fillRect(sx + 4, sy + o.h - 8, o.w - 8, 5);                                     // 불구멍
          c.globalAlpha = 1;
        }
      } else if (o.type === 'altar') {
        const gl = 0.6 + Math.sin(this.time * 2) * 0.25;
        c.fillStyle = shade('#2e2438', Math.max(f, .5)); c.fillRect(sx, sy + 10, o.w, o.h - 10);
        c.fillStyle = shade('#463a55', Math.max(f, .5)); c.fillRect(sx - 4, sy + 4, o.w + 8, 9);
        c.globalAlpha = gl; c.fillStyle = this.boss ? '#e05050' : '#a06fff';
        c.fillRect(sx + o.w / 2 - 5, sy - 12, 10, 16);
        c.globalAlpha = gl * .35; c.beginPath(); c.arc(sx + o.w / 2, sy - 4, 26, 0, TAU); c.fill();
      } else if (o.type === 'lorestone') {
        // 유적 비문 — 벽에 기대 세운 낮은 비석. 아직 안 읽었으면 글자가 은은히 빛난다
        // (흔적은 늘 흐릿하게 — 본 비문과 구분되게)
        const done = o.hint !== undefined || (this.loreRead && this.loreRead[o.lore]);
        c.fillStyle = shade('#4a4438', f); c.fillRect(sx, sy + 5, o.w, o.h - 5);
        c.fillStyle = shade('#5d5648', f); c.fillRect(sx - 2, sy, o.w + 4, 8);
        c.fillStyle = done ? '#4a5f7a' : '#e8d8a0';
        c.globalAlpha = done ? .5 : .55 + Math.sin(this.time * 2.2) * .3;
        for (let k = 0; k < 3; k++) c.fillRect(sx + 5, sy + 13 + k * 7, o.w - 10, 2.5);
        c.globalAlpha = 1;
      } else if (o.type === 'tablet') {
        c.fillStyle = '#57503f'; c.fillRect(sx, sy + 4, o.w, o.h - 4);
        c.fillStyle = '#6a6250'; c.fillRect(sx - 3, sy, o.w + 6, 7);
        c.fillStyle = (this.tabletsRead && this.tabletsRead[o.tablet]) ? '#4a5f7a' : '#9fe8d8';
        c.globalAlpha = .55 + Math.sin(this.time * 2.4 + o.tablet) * .28;
        for (let k = 0; k < 4; k++) c.fillRect(sx + 7, sy + 12 + k * 8, o.w - 14, 3);
        c.globalAlpha = 1;
      } else if (o.type === 'seal') {
        c.fillStyle = o.opened ? '#2a2634' : '#3a3550';
        c.fillRect(sx, sy, o.w, o.h);
        if (!o.opened) {
          c.globalAlpha = .4 + Math.sin(this.time * 1.8) * .22;
          c.strokeStyle = '#a06fff'; c.lineWidth = 2.5;
          c.beginPath(); c.arc(sx + o.w / 2, sy + o.h / 2, 15, 0, TAU); c.stroke();
          c.fillStyle = '#a06fff'; c.fillRect(sx + o.w / 2 - 1.5, sy + 8, 3, o.h - 16);
          c.globalAlpha = 1; c.lineWidth = 1;
        }
      } else if (o.type === 'mystic') {
        // 떠 있는 빛무리 하나 — 여기 무언가 있다는 것만 알리고, 무엇인지는 다가가야 안다
        const t = this.time;
        c.save();
        for (let i = 0; i < 3; i++) {
          const a = t * (0.5 + i * 0.2) + i * 2.1;
          c.globalAlpha = o.used ? 0.16 : 0.34 + Math.sin(t * 1.6 + i) * 0.2;
          c.fillStyle = o.used ? '#5a5a66' : '#bfe8ff';
          c.beginPath();
          c.arc(sx + o.w / 2 + Math.cos(a) * (10 + i * 5), sy + o.h / 2 + Math.sin(a * 1.3) * (7 + i * 3),
            2.4 - i * 0.4, 0, TAU);
          c.fill();
        }
        c.restore();
      } else if (o.type === 'codedoor') {
        /* 숫자 잠긴 문 — 세 자리를 넣는 홈 셋을 그려서, 무엇을 요구하는 문인지
           설명 없이도 보이게 한다. 열리면 홈만 남은 문틀이 된다. */
        c.fillStyle = o.opened ? '#2b2a22' : '#4a4432';
        c.fillRect(sx, sy, o.w, o.h);
        for (let i = 0; i < 3; i++) {
          const gy = sy + o.h * (0.24 + i * 0.24);
          c.fillStyle = '#191712';
          c.fillRect(sx + o.w * 0.22, gy, o.w * 0.56, 5);
          if (!o.opened) {
            c.globalAlpha = .45 + Math.sin(this.time * 2.2 + i) * .3;
            c.fillStyle = '#e0c86a';
            c.fillRect(sx + o.w * 0.3, gy + 1.5, o.w * 0.4, 2);
            c.globalAlpha = 1;
          }
        }
      } else if (o.type === 'npc') {
        this.drawNpc(c, o, sx, sy, f);
      } else {
        this.drawFacility(c, o, sx, sy, f);
      }
      c.restore();
    }

    // ---- 드롭 ----
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const d of this.drops) {
      const sx = d.x - camX + 8, sy = d.y - camY + 8 + Math.sin(this.time * 3 + d.t) * 3;
      if (sx < -30 || sx > this.W + 30) continue;
      c.globalAlpha = d.life < 8 ? (Math.sin(this.time * 12) * .5 + .5) : 1;
      Art.drawItem(c, d.item.id, sx - 11, sy - 11, 22);
      c.globalAlpha = 1;
    }

    // ---- 적 ----
    for (const e of this.ents) {
      const sx = e.x - camX, sy = e.y - camY;
      if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) continue;
      if (e instanceof Wolf) this.drawWolf(c, e, sx, sy);
      else if (e instanceof Guard) this.drawGuard(c, e, sx, sy);
      else this.drawEnemy(c, e, sx, sy);
    }

    // ---- 플레이어 ----
    /* 비석 — 쓰러진 자리에 실제로 세워 둔다. 지금까지는 지도 표식만 있어서
       현장에 가도 아무것도 안 보였다. 남은 시간에 따라 잿빛에 잠겨 간다. */
    if (this.deathMark) {
      const dm = this.deathMark;
      const left = 1 - (this.dayCount * 1440 + this.dayT - (dm.at || 0)) / 720;
      const gx = Math.round(dm.x - camX), gy = Math.round(dm.y - camY);
      if (gx > -60 && gx < this.W + 60 && gy > -80 && gy < this.H + 80) {
        c.save();
        c.globalAlpha = clamp(0.35 + left * 0.65, 0.2, 1);
        c.fillStyle = '#6a6458';
        c.fillRect(gx - 9, gy - 20, 18, 22);                 // 비석 몸
        c.fillRect(gx - 13, gy + 1, 26, 4);                  // 받침
        c.fillStyle = '#4a463c';
        c.beginPath(); c.arc(gx, gy - 20, 9, Math.PI, 0); c.fill();   // 둥근 윗머리
        c.fillStyle = '#2a2620';
        c.fillRect(gx - 1.5, gy - 16, 3, 11);                // 십자
        c.fillRect(gx - 5, gy - 13, 10, 3);
        c.globalAlpha = clamp(left, 0, 1) * (0.5 + 0.5 * Math.sin(this.time * 2.2));
        c.fillStyle = '#ffe08a';
        c.beginPath(); c.arc(gx, gy - 26, 2.6, 0, TAU); c.fill();     // 남아 있다는 불빛
        c.restore();
      }
    }
    this.drawRipeCrops(c, camX, camY);
    this.drawPlayer(c, p, p.x - camX, p.y - camY);
    for (const pet of (this.petEnts || [])) if (pet) this.drawPet(c, pet, camX, camY);

    // ---- 조명 (부드러운 그라디언트 오버레이) ----
    this.drawLightOverlay(c, camX, camY, tx0, ty0, tx1, ty1);
    /* 유적 고유 이벤트의 여운을 화면에 덮는다.
       불이 꺼졌을 때(ruinDark)는 타일을 건드리지 않고 화면만 어둡게 한다 — 장식을
       부수면 되돌릴 방법이 없다. 홀씨(ruinSpore)는 초록빛으로 시야를 흐린다.
       둘 다 끝날 때 마지막 2초 동안 서서히 걷힌다. */
    if (this.ruinDark > 0) {
      c.save();
      c.globalAlpha = Math.min(1, this.ruinDark / 2) * 0.72;
      c.fillStyle = '#04050a';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }
    if (this.ruinSpore > 0) {
      c.save();
      c.globalAlpha = Math.min(1, this.ruinSpore / 2) * 0.26;
      c.fillStyle = '#7fd08a';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }

    // ---- 폭발/타격 이펙트 ----
    if (this.bursts) for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += 1 / 60;
      const fr = Math.floor(b.t / 0.04);
      if (fr >= 6) { this.bursts.splice(i, 1); continue; }
      Sprites.drawFx(c, 'burst_' + b.kind, fr, b.x - camX - b.s / 2, b.y - camY - b.s / 2, b.s);
    }

    // ---- 투사체 ----
    for (const pr of this.projs) {
      const st = PROJ_STYLE[pr.type] || PROJ_STYLE.bolt;
      const sx = pr.cx - camX, sy = pr.cy - camY;
      if (this.spritesOn && PROJ_FX[pr.type]) {
        const fr = Math.floor(this.time * 14) % 4;
        c.save();
        c.translate(sx, sy); c.rotate(Math.atan2(pr.vy, pr.vx));
        Sprites.drawFx(c, 'proj_' + PROJ_FX[pr.type], fr, -9, -9, 18);
        c.restore();
        continue;
      }
      c.fillStyle = st.c;
      if (st.glow) { c.globalAlpha = .28; c.beginPath(); c.arc(sx, sy, st.r * 2.4, 0, TAU); c.fill(); c.globalAlpha = 1; }
      if (st.len) {
        const a = Math.atan2(pr.vy, pr.vx);
        c.save(); c.translate(sx, sy); c.rotate(a);
        c.fillRect(-st.len / 2, -1.5, st.len, 3);
        c.fillStyle = '#fff'; c.fillRect(st.len / 2 - 4, -1.5, 4, 3);
        c.restore();
      } else { c.beginPath(); c.arc(sx, sy, st.r, 0, TAU); c.fill(); }
    }

    // ---- 링 이펙트 ----
    if (this.rings) for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t -= 1 / 60;
      if (r.t <= 0) { this.rings.splice(i, 1); continue; }
      c.strokeStyle = r.c; c.globalAlpha = r.t / 0.3 * .8; c.lineWidth = 3;
      c.beginPath(); c.arc(r.x - camX, r.y - camY, r.r * (1.3 - r.t / 0.3 * 0.3), 0, TAU); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 1;
    }

    // ---- 입자 ----
    for (const pt of this.parts) {
      c.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      c.fillStyle = pt.c;
      c.fillRect(pt.x - camX - pt.r / 2, pt.y - camY - pt.r / 2, pt.r, pt.r);
    }
    c.globalAlpha = 1;

    // ---- 피해 숫자 ----
    if (!this.settings || this.settings.dmgnum) for (const t of this.texts) {
      c.globalAlpha = clamp(t.life / 0.85, 0, 1);
      c.font = (t.crit ? 'bold 19px' : '14px') + ' "Pretendard",sans-serif';
      c.fillStyle = '#000'; c.fillText(t.v, t.x - camX + 1, t.y - camY + 1);
      c.fillStyle = t.c; c.fillText(t.v, t.x - camX, t.y - camY);
      if (t.crit) { c.font = '10px sans-serif'; c.fillStyle = '#ffd24a'; c.fillText('치명', t.x - camX, t.y - camY - 15); }
    }
    c.globalAlpha = 1;

    // ---- 조준/채굴 표시 ----
    this.drawCursor(c, camX, camY);

    // ---- 비 (하늘이 트인 근처에서만) ----
    if (camY < SURF_BASE * TS + 400) this.drawRain(c);

    // ---- 비네트 ----
    const vg = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .38, this.W / 2, this.H / 2, Math.max(this.W, this.H) * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = vg; c.fillRect(0, 0, this.W, this.H);
    if (p.flash > 0) { c.fillStyle = `rgba(180,30,30,${p.flash * .5})`; c.fillRect(0, 0, this.W, this.H); }

    // ---- 길잡이 (비네트 위에 얹어야 어두운 곳에서도 읽힌다) ----
    if (this.settings === undefined || this.settings.compass !== false) this.drawCompass(c, camX, camY);
  },

  dayFactor() {
    const t = this.dayT;
    if (t >= 7 * 60 && t <= 17 * 60) return 1;
    if (t > 17 * 60 && t < 20 * 60) return 1 - inv(17 * 60, 20 * 60, t);
    if (t >= 20 * 60 || t < 4 * 60) return 0;
    return inv(4 * 60, 7 * 60, t);
  },
  drawSky(c, f, camX, camY) {
    const surfPx = SURF_BASE * TS;
    let top = mixHex('#0a0d1c', '#4a86c8', f);
    let bot = mixHex('#141020', '#a8c8e0', f);
    // 이벤트 중에는 하늘 자체가 물든다 — 붉은 달이 떴다는 걸 UI 없이 알 수 있게.
    // 비만은 마을 안에서도 물든다 — updateWeather()와 같은 이유로, 몹 버프는 안 걸려도
    // 하늘색·빗줄기 같은 연출까지 마을에서 뚝 끊길 필요는 없다(다른 이벤트는 그대로 둔다).
    let ev = this.eventActive() ? this.eventSpec() : null;
    if (!ev && this.event && this.event.id === 'rain') {
      const p = this.player, w = this.world;
      const zone = p && w ? w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS)) : null;
      if (zone === 'village' || zone === 'camp') ev = this.eventSpec();
    }
    if (ev) { top = mixHex(top, ev.tint, ev.tintAmt); bot = mixHex(bot, ev.tint, ev.tintAmt * 0.7); }
    if (camY < surfPx + 400) {
      const g = c.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, top); g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      // 별
      if (f < 0.55) {
        c.fillStyle = `rgba(255,255,255,${(1 - f / .55) * .8})`;
        for (let i = 0; i < 90; i++) {
          const sx = (i * 137.5) % this.W, sy = ((i * 73.3) % (this.H * .6));
          const tw = 0.5 + Math.sin(this.time * 2 + i) * 0.5;
          c.globalAlpha = (1 - f / .55) * (0.25 + tw * 0.55);
          c.fillRect(sx, sy - camY * 0.02, 2, 2);
        }
        c.globalAlpha = 1;
      }
      // 해/달
      const ang = (this.dayT / 1440) * TAU - Math.PI / 2;
      const sunX = this.W / 2 + Math.cos(ang) * this.W * .42;
      const sunY = this.H * .52 + Math.sin(ang) * this.H * .66 - camY * .05;
      c.globalAlpha = .9;
      c.fillStyle = f > .4 ? '#ffe9a8' : '#dfe8f5';
      c.beginPath(); c.arc(sunX, sunY, f > .4 ? 26 : 20, 0, TAU); c.fill();
      c.globalAlpha = .12; c.beginPath(); c.arc(sunX, sunY, 60, 0, TAU); c.fill();
      c.globalAlpha = 1;
      // 구름 — 비가 오는 동안은 짙고 빽빽하게, 평소엔 옅게 흘러간다
      this.drawClouds(c, camX, camY, this.rainT || 0);
    } else {
      const deep = camY > HELL_Y * TS - 400;
      const g = c.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, deep ? '#2a0d08' : '#0a0a10');
      g.addColorStop(1, deep ? '#4a1408' : '#06060a');
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
    }
  },
  /** 하늘에 늘 몇 점씩 흘러가는 구름. rainT(0~1)가 오르면 색이 짙어지고 빽빽해진다 —
      비가 오기 전에 구름부터 몰려오는 것처럼 보이도록 같은 값을 그대로 쓴다. */
  drawClouds(c, camX, camY, rainT) {
    // 맑을 때는 16개가 옅게 흘러가고, 비가 짙어질수록 개수·범위·불투명도가 함께 올라
    // 폭우일 때는 하늘 대부분이 구름으로 덮인다.
    const n = Math.round(16 + 90 * rainT);
    const wrapW = 2600;
    // 뒷 배경(원경 언덕·나무)과 안 겹치게, 비가 와도 화면 위쪽 띠 안에서만 빽빽해진다
    const bandH = this.H * 0.22;
    for (let i = 0; i < n; i++) {
      const seed = i * 91.7 + 13.1;
      const speed = 4 + (i % 7) * 2.1;
      const cy = 6 + ((i * 53 + (i * i * 7) % 211) % Math.round(bandH)) - camY * 0.03;
      if (cy < -70 || cy > this.H * 0.3) continue;
      const cx = ((seed + this.time * speed - camX * 0.1) % wrapW + wrapW) % wrapW - 260;
      const sc = 0.65 + (i % 5) * 0.24;
      const alpha = (0.14 + rainT * 0.62) * (0.65 + (i % 3) * 0.18);
      c.globalAlpha = Math.min(1, alpha);
      c.fillStyle = mixHex('#ffffff', '#2e343c', rainT);
      for (const [dx, dy, r] of [[0, 0, 22], [18, -4, 17], [-16, -2, 16], [8, 6, 15], [-8, 7, 14]]) {
        c.beginPath(); c.arc(cx + dx * sc, cy + dy * sc, r * sc, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  },
  /** 빗줄기. 화면 좌표계에서 직접 떨어뜨린다 — 세계 좌표를 안 써도 되니 가볍다. */
  drawRain(c) {
    if (!this.rainDrops || !this.rainT) return;
    if (this.snowMode) {
      c.globalAlpha = Math.min(1, this.rainT) * 0.85;
      c.fillStyle = '#f0f6ff';
      for (const d of this.rainDrops) { c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      return;
    }
    c.globalAlpha = Math.min(1, this.rainT) * 0.55;
    c.strokeStyle = '#bcd0e0';
    c.lineWidth = 1.4;
    c.beginPath();
    for (const d of this.rainDrops) { c.moveTo(d.x, d.y); c.lineTo(d.x - 5, d.y + d.len); }
    c.stroke();
    c.globalAlpha = 1;
  },
  drawParallax(c, camX, camY, f) {
    // 손그림 원경이 있으면 그것으로
    if (this.spritesOn && this.drawParallaxArt(c, camX, camY, f)) return;
    if (camY > SURF_BASE * TS + 500) return;
    c.save();
    const layers = [[0.22, '#2b3a4a', 150], [0.38, '#25313f', 90]];
    const groundCamY = SURF_BASE * TS - this.H / 2;
    for (const [sp, col, off] of layers) {
      c.fillStyle = mixHex('#0d1018', col, 0.3 + f * 0.7);
      // 수직도 X축과 같은 sp 비율로만 반응(멀리 있는 배경일수록 카메라 이동에 덜 흔들려야 한다)
      const ox = -camX * sp, base = SURF_BASE * TS - groundCamY + off + (groundCamY - camY) * sp;
      c.beginPath(); c.moveTo(0, this.H);
      for (let x = -100; x < this.W + 100; x += 40) {
        const wx = x - (ox % 400);
        const h = Math.sin((x + ox) * 0.004) * 70 + Math.sin((x + ox) * 0.011) * 34;
        c.lineTo(x, base - h);
      }
      c.lineTo(this.W, this.H); c.closePath(); c.fill();
    }
    c.restore();
  },
  /** 손그림 원경 — 두 겹으로 무한 스크롤. 그릴 수 없으면 false */
  drawParallaxArt(c, camX, camY, f) {
    const deep = camY > HELL_Y * TS - 700;
    const p = this.player;
    const zone = this.world.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    let key;
    if (deep) key = 'parallax_hell';
    // 하늘 섬 / 유적 구역은 지하 깊이와 무관하게 전용 배경을 쓴다 — 매니페스트에는 이미
    // parallax_sky·parallax_ruin이 들어와 있었는데 여기서 참조하지 않아 그동안 안 쓰이고 있었다
    else if (zone === 'sky') key = 'parallax_sky';
    else if (zone === 'ruin') key = 'parallax_ruin';
    // 여명 마을은 전용 그림. 베이스캠프는 숲 배경 그대로 (마을 배경 쓰면 안 됨)
    else if (zone === 'village') key = 'parallax_village';
    else if (zone === 'camp') key = 'parallax_forest';
    else {
      if (camY > SURF_BASE * TS + 500) return true;   // 지하 중간층은 원경 없음
      const b = this.world.biomeAt(clamp(Math.floor((camX + this.W / 2) / TS), 0, WW - 1)).id;
      key = b === 'ice' ? 'parallax_snow' : b === 'corrupt' ? 'parallax_corrupt' : b === 'desert' ? 'parallax_desert'
        // jungle·glowfen 전용 배경(parallax_jungle·parallax_glowfen)은 아직 그림이 없다.
        // 파일이 들어오면 매니페스트 등록만으로 자동 전환되게 먼저 시도하고, 없으면
        // (Sprites.img에 안 잡히면) forest로 대체한다 — 키를 무작정 바꾸면 그림이 오기
        // 전까지 절차 생성 배경으로 떨어져 오히려 지금보다 못해 보이므로 이렇게 갈랐다.
        : (b === 'jungle' && Sprites.img.parallax_jungle && Sprites.img.parallax_jungle.width) ? 'parallax_jungle'
        : (b === 'glowfen' && Sprites.img.parallax_glowfen && Sprites.img.parallax_glowfen.width) ? 'parallax_glowfen'
        : 'parallax_forest';
    }
    const im = Sprites.img[key];
    if (!im || !im.width) return false;

    const IW = im.width, IH = im.height;
    // 배경의 세로 위치는 camY(카메라의 실제 세계 y좌표) 하나로만 정한다. camY는 플레이어가
    // 점프해서 오르든, 지형이 솟아 걸어 올라가든 값이 똑같이 줄어든다 — 지형 고도가 오르면
    // camY가 줄고, 그만큼 baseY가 커져(=화면에서 더 아래로) 배경이 내려간다. 반대로 지형이
    // 꺼지면 camY가 늘고 baseY가 작아져 배경이 올라간다. X축과 같은 spd 비율로만 반영해
    // 갑자기 움직이지 않고 서서히 따라가게 한다.
    const ref = (deep ? HELL_Y : SURF_BASE) * TS;
    const restY = TS * 7 + this.H / 2;    // camY가 기준 고도와 같을 때 배경이 놓일 화면 위치
    const refCamY = ref - this.H / 2;
    c.save();
    c.imageSmoothingEnabled = false;
    let nearBaseY = 0, nearW = IW, nearOx = 0;
    // parallax_village는 그림 속 건물이 이미지 아래쪽에 낮게 그려져 있어, 다른 배경과
    // 같은 기준으로 앉히면 실제 지형선 아래로 절반 넘게 파묻힌다. 이 키만 통째로 끌어올린다.
    const lift = key === 'parallax_village' ? 90 : 0;
    // 먼 층은 느리고 흐리게, 가까운 층은 빠르고 진하게
    for (const [spd, alpha, dy, sc] of [[0.16, .45, -54 - lift, 1.15], [0.34, 1, -lift, 1]]) {
      const w = IW * sc, h = IH * sc;
      const baseY = restY + (refCamY - camY) * spd;
      c.globalAlpha = alpha * (0.42 + f * 0.58);
      let ox = -((camX * spd) % w);
      if (ox > 0) ox -= w;
      for (let x = ox; x < this.W; x += w) c.drawImage(im, x, baseY - h + dy, w, h);
      if (spd === 0.34) { nearBaseY = baseY + dy; nearW = w; nearOx = ox; }
    }
    // 사막 분지 같은 저지대에서는 카메라가 내려가면서 근경 이미지의 바닥이 화면 바닥보다
    // 위로 올라와, 그 아래로 빈 캔버스가 그대로 드러나는 틈이 생긴다. 이미지 맨 아래 한 줄
    // 픽셀(경계와 맞닿는 바로 그 색)만 그대로 늘려 붙여서 이어붙인 자리가 티나지 않게 한다.
    // (여러 줄을 통째로 늘리면 그 띠의 위쪽 끝이 경계에 오게 되어, 정작 경계와 맞닿는 색은
    //  이미지의 몇 픽셀 안쪽 색이 되어버려 오히려 거기서 다시 끊겨 보인다.)
    if (nearBaseY < this.H) {
      c.globalAlpha = 1 * (0.42 + f * 0.58);
      for (let x = nearOx; x < this.W; x += nearW) {
        c.drawImage(im, 0, IH - 1, IW, 1, x, nearBaseY, nearW, this.H - nearBaseY);
      }
    }
    c.restore();
    return true;
  },

  /** 타일 광원값을 저해상도 알파맵으로 만들어 확대 — 계단 없는 부드러운 명암 */
  drawLightOverlay(c, camX, camY, tx0, ty0, tx1, ty1) {
    const w = this.world;
    const x0 = tx0 - 1, y0 = ty0 - 1, x1 = tx1 + 1, y1 = ty1 + 1;
    const lw = x1 - x0 + 1, lh = y1 - y0 + 1;
    if (!this.lightCv || this.lightCv.width !== lw || this.lightCv.height !== lh) {
      this.lightCv = document.createElement('canvas');
      this.lightCv.width = lw; this.lightCv.height = lh;
      this.lightCx = this.lightCv.getContext('2d');
      this.lightImg = this.lightCx.createImageData(lw, lh);
    }
    // 깊이에 따른 색조: 지하는 푸른 기운, 지옥은 붉은 기운
    const mid = (ty0 + ty1) / 2;
    let tr = 0, tg = 0, tb = 0;
    if (mid > HELL_Y - 24) { tr = 44; tg = 8; tb = 2; }
    else if (mid > SURF_BASE + 24) { tr = 4; tg = 7; tb = 18; }
    const d = this.lightImg.data;
    let i = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        // 하한을 조금 남겨 완전한 암흑에서도 블록 실루엣은 읽히게
        const f = Math.pow(clamp(w.lightAt(x, y) / 15, 0.022, 1), 0.72);
        d[i] = tr; d[i + 1] = tg; d[i + 2] = tb; d[i + 3] = 255 * (1 - f);
        i += 4;
      }
    }
    this.lightCx.putImageData(this.lightImg, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(this.lightCv, x0 * TS - camX, y0 * TS - camY, lw * TS, lh * TS);
    c.imageSmoothingEnabled = false;
  },

  /* ---- 프레임 선택 (우리 엔티티 필드 기준) ---- */
  playerFrame(p) {
    if (p.flash > 0.12) return 12;                                  // 피격
    if (p.dashV > 0) return 8;                                      // 대시
    if (p.swing > 0) return 9 + Math.min(2, Math.floor((0.24 - p.swing) / 0.08));
    if (!p.onGround) return p.vy < 0 ? 6 : 7;                       // 점프 / 낙하
    if (Math.abs(p.vx) > 20) return 2 + (Math.floor(this.time * 9) % 4);
    return Math.floor(this.time * 2) % 2;
  },
  enemyFrame(e) {
    if (e.boss) {
      const r = e.hp / e.maxHp;
      const ph = r > .66 ? 0 : r > .33 ? 1 : 2;
      return ph * 2 + (Math.floor(this.time * 2.5) % 2);
    }
    /* 예전에는 `atkCd > 1.4` 로 공격 직후를 판정했다. 그런데 atkCd 는 화살·마법을
       쏘는 놈만 쓰는 값이라, 접촉으로 때리는 근접 몹은 늘 0 이었다 — 프레임 4(공격
       그림)를 한 번도 못 보여 주고 있었다. 이제 때린 순간에 켜는 atkPose 를 본다. */
    if (e.atkPose > 0) return 4;
    if (Math.abs(e.vx) > 6) return 2 + (Math.floor(this.time * 7) % 2);
    return Math.floor(this.time * 2.4) % 2;
  },

  /** 여명 마을 시설물 — 손그림 애셋이 있으면 그것으로, 없으면 절차 렌더로 폴백 */
  drawFacility(c, o, sx, sy, f) {
    const t = this.time;
    if (o.type === 'door') {
      if (o.closed) {
        // 닫히면 문틀에 파묻혀 가운데 얇은 막대(문설주)만 보인다 — 원래 모습대로
        const thinW = Math.max(6, o.w * 0.4);
        const dx0 = sx + (o.w - thinW) / 2;
        // 성문(gate)은 세로 3칸이라 집 문(22×44) 그림을 쓰면 1.5배로 늘어나 찌그러진다.
      // 전용 그림이 없으면 아래 절차 생성으로 떨어뜨린다(늘리지는 않는다).
      const im = this.spritesOn && Sprites.img[o.gate ? 'obj_gate' : 'obj_door'];
        if (im && im.width) {
          c.save(); c.imageSmoothingEnabled = false;
          c.drawImage(im, im.width * 0.3, 0, im.width * 0.4, im.height, dx0, sy, thinW, o.h);
          c.restore();
          return;
        }
        c.fillStyle = shade('#3a2610', f); c.fillRect(dx0, sy, thinW, o.h);
        c.fillStyle = shade('#5a3c22', f); c.fillRect(dx0 + 1, sy + 1, thinW - 2, o.h - 2);
        c.fillStyle = shade('#d8a94b', f);
        c.beginPath(); c.arc(sx + o.w / 2, sy + o.h / 2, 1.3, 0, TAU); c.fill();
        return;
      }
      // 열리면 문틀 자리를 꽉 채운다. 왼쪽으로 여닫히는 문(dir=-1)만 좌우반전해
      // 경첩이 반대쪽에 있는 것처럼 보이게 한다.
      const flip = o.dir === -1;
      // 성문(gate)은 세로 3칸이라 집 문(22×44) 그림을 쓰면 1.5배로 늘어나 찌그러진다.
      // 전용 그림이 없으면 아래 절차 생성으로 떨어뜨린다(늘리지는 않는다).
      const im = this.spritesOn && Sprites.img[o.gate ? 'obj_gate' : 'obj_door'];
      c.save(); c.imageSmoothingEnabled = false;
      if (flip) { c.translate(sx + o.w, sy); c.scale(-1, 1); } else { c.translate(sx, sy); }
      if (im && im.width) {
        c.drawImage(im, 0, 0, im.width, im.height, 0, 0, o.w, o.h);
      } else {
        c.fillStyle = shade('#3a2610', f); c.fillRect(0, 0, o.w, o.h);
        c.fillStyle = shade('#5a3c22', f); c.fillRect(2, 2, o.w - 4, o.h - 4);
        c.fillStyle = shade('#6f4c2c', f);
        for (let i = 1; i < 4; i++) c.fillRect(2, i * (o.h - 4) / 4 + 2, o.w - 4, 2);
        c.fillStyle = shade('#d8a94b', f);
        c.beginPath(); c.arc(o.w - 6, o.h / 2, 1.6, 0, TAU); c.fill();
      }
      c.restore();
      return;
    }
    if (o.type === 'furniture') {
      // 집이 실제로 들어갈 수 있는 방이 아니라 벽지(setWall) 위에 얹힌 얇은 장식이다 —
      // 그래도 아무것도 없으면 벽지만 밋밋하게 보여서, 문·창 옆에 살림살이 실루엣을 둔다.
      // 책장만 손그림 요청 대상이라 그것만 스프라이트 우선순위를 본다(탁자는 계속 절차 생성).
      if (o.kind === 'shelf' && this.spritesOn && Sprites.drawObj(c, 'obj_shelf', sx, sy, o.w, o.h)) return;
      if (o.kind === 'shelf') {
        c.fillStyle = shade('#5a3c22', f); c.fillRect(sx, sy, o.w, o.h);
        c.fillStyle = shade('#3a2610', f);
        for (let k = 1; k < 4; k++) c.fillRect(sx + 1, sy + k * (o.h - 2) / 4, o.w - 2, 2);
        const cols = ['#b03a3a', '#3a6a8a', '#c8a03a', '#4a7a4a'];
        for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) {
          c.fillStyle = shade(cols[(row * 3 + k) % cols.length], f);
          c.fillRect(sx + 2 + k * 4, sy + 2 + row * (o.h - 2) / 4, 3, (o.h - 2) / 4 - 3);
        }
      } else {   // table
        c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + o.h - 5, o.w, 5);
        c.fillStyle = shade('#5a3c22', f); c.fillRect(sx + 2, sy + o.h - 3, 3, 3); c.fillRect(sx + o.w - 5, sy + o.h - 3, 3, 3);
        c.fillStyle = shade('#8a8a96', f); c.fillRect(sx + o.w / 2 - 3, sy + o.h - 10, 6, 5);
      }
      return;
    }
    if (o.type === 'fountain') {
      /* 분수대는 세로 3칸(66px) 중 맨 아래 1칸이 실제 solid 물받이고, 위 2칸은 통과
         가능한 물기둥이다 — world.js가 딱 그 폭(DAWN_PLAZA의 w 5칸)으로 블록을 깔아
         두므로 그림과 구조물이 1:1로 맞는다.
         손그림은 새 규격(110×66, 비율 1.667)으로 온 것만 쓴다. 옛 88×44 그림은 비율이
         2.0이라 늘려 붙이면 찌그러지므로, 그때는 아래 절차 생성으로 그린다. */
      const im = this.spritesOn && Sprites.img.obj_fountain;
      if (im && im.width && Math.abs(im.width / im.height - o.w / o.h) < 0.03) {
        c.save(); c.imageSmoothingEnabled = false;
        c.drawImage(im, Math.round(sx), Math.round(sy), o.w, o.h);
        c.restore();
        return;
      }
      // 좌우 대칭은 중심(mx)에서 재서 그린다 — 예전처럼 그림 절반을 뒤집어 덮는
      // 임시방편이 아니라, 애초에 대칭으로 그린다
      const mx = sx + o.w / 2, base = sy + o.h - TS;
      c.fillStyle = shade('#6d6d7c', f); c.fillRect(sx, base, o.w, TS);          // 물받이
      c.fillStyle = shade('#8a8a98', f); c.fillRect(sx, base, o.w, 4);           // 테두리 윗면
      c.fillStyle = shade('#4a4a56', f); c.fillRect(sx, base + TS - 3, o.w, 3);
      c.globalAlpha = .85; c.fillStyle = '#4a9ec8';
      c.fillRect(sx + 4, base + 4, o.w - 8, 7);                                  // 고인 물
      c.globalAlpha = 1;
      c.fillStyle = shade('#7a7a88', f); c.fillRect(mx - 6, sy + 12, 12, base - sy - 12);
      c.fillStyle = shade('#9a9aa8', f); c.fillRect(mx - 6, sy + 12, 3, base - sy - 12);
      c.fillStyle = shade('#8a8a98', f); c.fillRect(mx - 11, sy + 7, 22, 6);     // 물동이
      const wob = Math.sin(this.time * 2.6) * 1.5;
      c.globalAlpha = .75; c.fillStyle = '#7fc8e8';
      for (const dir of [-1, 1])                                                 // 물줄기 — 좌우 같은 식으로
        for (let k = 0; k < 5; k++)
          c.fillRect(mx + dir * (5 + k * 4) - 1.5, sy + 14 + k * k * 1.5 + wob, 3, 3);
      c.fillRect(mx - 2, sy + 3 + wob, 4, 9);                                    // 솟는 물
      c.globalAlpha = 1;
      return;
    }
    if (this.spritesOn) {
      // workbench/forge는 render()의 상자 오브젝트 루프에서 먼저 걸려 이 함수까지
      // 오지 않는다 — 그 둘의 레벨별 스프라이트 우선순위는 거기 있다.
      const variant = o.type === 'waystone' ? (this.villageUnlocked ? '' : '_off')
        : o.type === 'terminal' ? (this.termsRead && this.termsRead[o.term] ? '_read' : '')
        : '';
      if (Sprites.drawObj(c, 'obj_' + o.type + variant, sx, sy, o.w, o.h)) return;
    }
    if (o.type === 'vault') {
      c.fillStyle = shade('#4a4a56', f); c.fillRect(sx, sy, o.w, o.h);
      c.fillStyle = shade('#6d6d7c', f); c.fillRect(sx + 2, sy + 2, o.w - 4, o.h - 4);
      c.fillStyle = shade('#d8a94b', f); c.fillRect(sx + o.w / 2 - 6, sy + o.h / 2 - 6, 12, 12);
      c.fillStyle = shade('#2e2e36', f); c.fillRect(sx + o.w / 2 - 2, sy + o.h / 2 - 2, 4, 4);
    } else if (o.type === 'board') {
      c.fillStyle = shade('#5a3c22', f);
      c.fillRect(sx + 4, sy + 18, 5, o.h - 18); c.fillRect(sx + o.w - 9, sy + 18, 5, o.h - 18);
      c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy, o.w, 24);
      c.fillStyle = shade('#e8dcc0', f);
      c.fillRect(sx + 4, sy + 4, 9, 11); c.fillRect(sx + 16, sy + 5, 9, 10); c.fillRect(sx + 26, sy + 4, 6, 12);
    } else if (o.type === 'reforge') {
      c.fillStyle = shade('#3a3a44', f); c.fillRect(sx, sy + o.h - 16, o.w, 16);
      c.fillStyle = shade('#5d5d68', f); c.fillRect(sx + 4, sy + 10, o.w - 8, o.h - 24);
      const gl = 0.5 + Math.sin(t * 3) * 0.3;
      c.globalAlpha = gl; c.fillStyle = '#ff8a3a';
      c.fillRect(sx + 8, sy + 14, o.w - 16, 7);
      c.globalAlpha = 1;
      c.fillStyle = shade('#8a8a96', f); c.fillRect(sx + o.w / 2 - 3, sy, 6, 12);
    } else if (o.type === 'waystone') {
      const gl = 0.45 + Math.sin(t * 1.8) * 0.25;
      c.fillStyle = shade('#6b5a34', f);
      c.beginPath(); c.moveTo(sx + 4, sy + o.h); c.lineTo(sx + o.w - 4, sy + o.h);
      c.lineTo(sx + o.w - 7, sy + 6); c.lineTo(sx + o.w / 2, sy); c.lineTo(sx + 7, sy + 6);
      c.closePath(); c.fill();
      c.globalAlpha = this.villageUnlocked ? gl : gl * 0.25;
      c.fillStyle = '#9fe8dc';
      c.beginPath(); c.arc(sx + o.w / 2, sy + o.h * 0.42, 7, 0, TAU); c.fill();
      c.globalAlpha = 1;
    } else if (o.type === 'inn') {
      /* 침대 — 다리 밑면이 항상 sy+o.h(바닥선)에 닿는다. 예전엔 매트리스가 몸통
         안쪽에 떠 있어서 "바닥과 안 이어진" 상자처럼 보였다. 옆에서 본 침대 모양
         (머리판+프레임+매트리스+이불+베개)으로 다시 그린다. */
      const legH = 4;
      c.fillStyle = shade('#3a2610', f);
      c.fillRect(sx + 2, sy + o.h - legH, 4, legH); c.fillRect(sx + o.w - 6, sy + o.h - legH, 4, legH);
      c.fillStyle = shade('#5a3c22', f); c.fillRect(sx, sy + o.h - legH - 6, o.w, 6);   // 프레임
      c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + 4, 6, o.h - legH - 4);      // 머리판
      c.fillStyle = shade('#e8dcc0', f); c.fillRect(sx + 6, sy + o.h - legH - 14, o.w - 8, 8);   // 매트리스
      c.fillStyle = shade('#8a6a4a', f); c.fillRect(sx + 6, sy + o.h - legH - 14, (o.w - 8) * 0.6, 8);   // 이불
      c.fillStyle = shade('#f0ece0', f); c.fillRect(sx + 8, sy + o.h - legH - 20, 12, 7);   // 베개
    } else if (o.type === 'terminal') {
      const read = this.termsRead && this.termsRead[o.term];
      c.fillStyle = shade('#4a4a52', f); c.fillRect(sx, sy + 6, o.w, o.h - 6);
      c.fillStyle = shade('#6a6a74', f); c.fillRect(sx + 2, sy, o.w - 4, 22);
      c.globalAlpha = read ? 0.3 : 0.55 + Math.sin(t * 4) * 0.25;
      c.fillStyle = read ? '#4a5f7a' : '#e8a53a';
      c.fillRect(sx + 5, sy + 4, o.w - 10, 14);
      c.globalAlpha = 1;
      c.fillStyle = shade('#8a6a3a', f); c.fillRect(sx + o.w / 2 - 2, sy + 26, 4, o.h - 26);
    } else if (o.type === 'lair') {
      // 미니보스 둥지 — 비어 있으면 불이 꺼진다
      const done = this.lairs && this.lairs[o.ruin];
      const gl = done ? 0.12 : 0.5 + Math.sin(t * 1.9) * 0.28;
      c.fillStyle = shade('#2a2620', f); c.fillRect(sx, sy + 12, o.w, o.h - 12);
      c.fillStyle = shade('#3d372e', f); c.fillRect(sx - 4, sy + 6, o.w + 8, 9);
      for (let k = 0; k < 3; k++) {
        c.fillStyle = shade('#4a4238', f);
        c.fillRect(sx + 4 + k * 11, sy + 16, 7, o.h - 20);
      }
      c.globalAlpha = gl;
      c.fillStyle = done ? '#4a4a52' : '#e0563c';
      c.fillRect(sx + o.w / 2 - 6, sy - 10, 12, 18);
      c.globalAlpha = gl * 0.4;
      c.beginPath(); c.arc(sx + o.w / 2, sy - 2, 24, 0, TAU); c.fill();
      c.globalAlpha = 1;
    } else if (o.type === 'townhall') {
      // 마을 설계도가 펼쳐진 판 — 등급이 오를수록 판에 못이 하나씩 더 박힌다
      const lv = this.villageLv();
      c.fillStyle = shade('#5a3f28', f); c.fillRect(sx + 3, sy + 18, 4, o.h - 18);
      c.fillRect(sx + o.w - 7, sy + 18, 4, o.h - 18);
      c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + 4, o.w, 24);
      c.fillStyle = shade('#e8dcc0', f); c.fillRect(sx + 3, sy + 7, o.w - 6, 18);
      c.fillStyle = shade('#8a7a5a', f);
      for (let k = 0; k < 4; k++) c.fillRect(sx + 6, sy + 10 + k * 4, o.w - 12 - (k % 2) * 6, 1.6);
      c.fillStyle = shade('#4a6a8a', f); c.fillRect(sx + 7, sy + 12, 8, 8);
      for (let k = 0; k < 3; k++) {
        c.fillStyle = k < lv ? '#d8a94b' : '#3a3527';
        c.beginPath(); c.arc(sx + o.w / 2 - 8 + k * 8, sy + 32, 2.2, 0, TAU); c.fill();
      }
      c.fillStyle = shade('#b03a3a', f); c.fillRect(sx + o.w - 10, sy - 2, 7, 12);
    } else if (o.type === 'fountain') {
      c.fillStyle = shade('#6d6d7c', f); c.fillRect(sx, sy + o.h - 14, o.w, 14);
      c.fillStyle = shade('#8a8a98', f); c.fillRect(sx + 3, sy + o.h - 17, o.w - 6, 4);
      c.fillStyle = shade('#7a7a88', f); c.fillRect(sx + o.w / 2 - 5, sy + 10, 10, o.h - 27);
      c.globalAlpha = 0.55 + Math.sin(t * 2.6) * 0.14;
      c.fillStyle = '#7fc8e8';
      c.fillRect(sx + 5, sy + o.h - 13, o.w - 10, 5);
      c.beginPath(); c.arc(sx + o.w / 2, sy + 8, 7, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
  },

  /** 장착한 펫을 플레이어 뒤에 둥실둥실 띄워 그린다 (별도 물리 없이 위치만 따라감) */
  /** 펫 — 예전엔 OS 이모지를 캔버스에 글자로 찍었다(폰트마다 모양이 달라지고, 이 게임에서
      유일하게 그림이 없는 캐릭터였다). 지금은 손그림 시트가 있으면 그것으로, 없으면
      itemart의 절차 생성 아이콘으로 그린다. */
  drawPet(c, pet, camX, camY) {
    const sx = Math.round(pet.x - camX), sy = Math.round(pet.y - camY);
    const S = 20;
    c.save();
    c.imageSmoothingEnabled = false;
    // 공격 직후 잠깐 밝게 — 뭘 하고 있는지 눈에 보이게
    if (pet.flash > 0) { c.shadowColor = pet.def.c; c.shadowBlur = 10; }
    /* 손그림 시트가 있으면 그쪽을 쓴다. 다른 생물과 같은 7프레임 규격을 그대로 따르므로
       (idle1·idle2·move1·move2·atk·death1·death2) 새로 외울 규칙이 없다 —
       평소엔 idle 두 장을 번갈아 쓰고, 방금 문 직후에는 atk 프레임을 보여 준다.
       칸 크기는 시트에 적힌 값으로 재서 가운데를 맞춘다(펫마다 크기가 달라도 안 흔들리게). */
    const sheet = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets['pet_' + pet.id];
    if (sheet) {
      const fr = pet.flash > 0 ? 4 : (Math.floor(this.time * 3 + pet.slot) % 2);
      if (Sprites.draw(c, 'pet_' + pet.id, fr, sx - sheet.frameW / 2, sy - sheet.frameH / 2, pet.facing < 0)) {
        c.restore(); return;
      }
    }
    if (pet.facing < 0) { c.translate(sx * 2, 0); c.scale(-1, 1); }
    Art.draw(c, 'p:' + pet.id, sx - S / 2, sy - S / 2, S);
    c.restore();
  },

  /* ---- 캐릭터 렌더 ---- */
  drawPlayer(c, p, sx, sy) {
    c.save();
    if (p.iframe > 0 && Math.floor(this.time * 24) % 2 === 0) c.globalAlpha = 0.45;
    // 손그림 스프라이트가 있으면 그것으로, 없으면 아래 절차 렌더로 폴백
    /* 캐릭터마다 제 시트를 쓴다 (char/player_<id>.png). 프레임 순서는 다섯 장 모두
       원본 player.png와 같으므로 playerFrame() 은 그대로 쓴다. */
    const ch = CHAR_OF(p.charId);
    const fr = this.playerFrame(p);
    if (this.spritesOn && Sprites.draw(c, 'player_' + ch.id, fr, sx, sy, p.facing < 0)) {
      this.drawHeldWeapon(c, p, sx, sy, 0);
      c.restore();
      return;
    }
    /* 전용 시트를 못 읽었으면 옛 방식 — 공용 시트 한 장에 색조만 얹는다 */
    if (this.spritesOn && Sprites.draw(c, 'player', fr, sx, sy, p.facing < 0)) {
      if (ch.tint) {
        const m = Sprites.meta && Sprites.meta.characters.sheets.player;
        c.save();
        c.globalCompositeOperation = 'source-atop';
        c.globalAlpha = 0.34;
        c.fillStyle = ch.tint;
        c.fillRect(sx - 2, sy - 2, (m ? m.frameW : p.w) + 4, (m ? m.frameH : p.h) + 4);
        c.restore();
      }
      this.drawHeldWeapon(c, p, sx, sy, 0);
      c.restore();
      return;
    }
    const f = 1;
    const skin = shade('#e8c39a', f), cloth = shade('#4a6fa8', f), pant = shade('#33384a', f), hair = shade('#3a2a1e', f);
    const bob = p.onGround && Math.abs(p.vx) > 20 ? Math.sin(this.time * 14) * 1.6 : 0;
    // 다리
    c.fillStyle = pant;
    const legSwing = p.onGround && Math.abs(p.vx) > 20 ? Math.sin(this.time * 14) * 4 : 0;
    c.fillRect(sx + 3, sy + 26 + bob, 6, 14 - bob);
    c.fillRect(sx + 11, sy + 26 + bob, 6, 14 - bob);
    if (legSwing) { c.fillRect(sx + 3 + legSwing, sy + 34, 6, 6); c.fillRect(sx + 11 - legSwing, sy + 34, 6, 6); }
    // 몸
    c.fillStyle = cloth; c.fillRect(sx + 2, sy + 13 + bob, 16, 15);
    // 머리
    c.fillStyle = skin; c.fillRect(sx + 4, sy + 2 + bob, 12, 12);
    c.fillStyle = hair; c.fillRect(sx + 3, sy + 1 + bob, 14, 5);
    c.fillRect(sx + (p.facing > 0 ? 3 : 14), sy + 1 + bob, 3, 9);
    // 눈
    c.fillStyle = '#1a1a22';
    c.fillRect(sx + (p.facing > 0 ? 11 : 6), sy + 7 + bob, 2, 2);
    this.drawHeldWeapon(c, p, sx, sy, bob);
    c.restore();
  },

  /** 장착 무기 + 스윙 궤적 + 채널링 링 (두 렌더 경로가 공유) */
  /* ================= 유적 — 지도 · 고유 이벤트 · 암호문 ================= */

  /** 위치 지도를 편다. 그 유적 자리가 나침반에 잡히고, 지도는 사라진다.
      입구가 없는 유적(arch: 'buried')은 이것 없이는 사실상 못 찾는다. */
  useRuinMap(slot) {
    const p = this.player, it = p.bag[slot];
    const d = it && idef(it); if (!d || d.type !== 'map') return;
    if (!this.ruinMarks) this.ruinMarks = {};
    const r = this.world.ruins.find(q => q.id === d.ruin);
    if (!r) { this.toast('여기서는 쓸 수 없다', 'bad'); return; }
    if (this.ruinMarks[d.ruin]) { this.toast('이미 자리를 안다'); return; }
    this.ruinMarks[d.ruin] = 1;
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    const spec = RUIN_SPEC.find(s => s.id === d.ruin);
    this.toast(`${spec ? spec.n : '유적'}의 자리를 알았다 — 나침반을 보라`, 'good');
    this.sfx('chapter');
    UI.refreshBag();
  },

  /** 그 유적에만 있는 방을 밟으면 한 번 터지는 일. 한 번 겪으면 세이브에 남는다. */
  checkRuinEvent() {
    const p = this.player, evs = this.world.ruinEvents;
    if (!evs || !evs.length) return;
    if (!this.ruinEvDone) this.ruinEvDone = {};
    for (const e of evs) {
      if (this.ruinEvDone[e.ruin]) continue;
      if (p.cx < e.x || p.cx > e.x + e.w || p.cy < e.y || p.cy > e.y + e.h) continue;
      this.ruinEvDone[e.ruin] = 1;
      this.fireRuinEvent(e);
      return;
    }
  },

  /** 유적 잡몹을 플레이어 둘레에 불러낸다 — swarm·blackout·bloom 이 같이 쓴다 */
  _ruinSpawn(ruinId, n, spread) {
    const spec = RUIN_SPEC.find(s => s.id === ruinId);
    const pool = (spec && spec.mobs) || ['crawler', 'skeleton'];
    const p = this.player;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.4;
      const e = new Enemy(pool[i % pool.length],
        p.cx + Math.cos(a) * spread, p.cy - 20 + Math.sin(a) * spread * 0.5);
      this.ents.push(e);
      for (let k = 0; k < 8; k++) this.parts.push(new Part(e.cx, e.cy, '#a06fff', -40, .7));
    }
  },

  fireRuinEvent(e) {
    const p = this.player;
    if (e.ev === 'blackout') {
      /* 불이 꺼진다 — 화면이 한동안 어두워지고 서리 것들이 몰려온다.
         타일을 지우지 않고 화면만 덮는다(장식을 부수면 되돌릴 수가 없다). */
      this.ruinDark = 16;
      this.shake = 10; this.sfx('chapter');
      this.toast('불이 한꺼번에 꺼졌다', 'bad');
      this._ruinSpawn(e.ruin, 5, 150);
    } else if (e.ev === 'swarm') {
      this.shake = 14; this.sfx('chapter');
      this.toast('둥지가 깨어났다', 'bad');
      this._ruinSpawn(e.ruin, 8, 170);
    } else if (e.ev === 'collapse') {
      /* 갱도가 무너진다 — 발밑 바닥이 부서지는 바닥으로 바뀌고 천장에서 돌이 떨어진다 */
      const w = this.world, ty = Math.floor((p.y + p.h + 2) / TS);
      const tx = Math.floor(p.cx / TS);
      for (let x = tx - 8; x <= tx + 8; x++)
        if (TILE_DEF[w.get(x, ty)].solid === 1) w.set(x, ty, T.CRUMBLE);
      this.shake = 18; this.sfx('chapter');
      this.toast('발밑이 내려앉는다', 'bad');
      for (let i = 0; i < 40; i++)
        this.parts.push(new Part(p.cx + (Math.random() - 0.5) * 260, p.cy - 90, '#6a5a48', 40, 1.1));
      this._ruinSpawn(e.ruin, 3, 190);
    } else if (e.ev === 'bloom') {
      /* 홀씨가 터진다 — 한동안 독에 잠기고 굴의 것들이 깨어난다 */
      this.ruinSpore = 9;                     // 이 동안 홀씨에 잠긴다 (update 가 깎으며 물린다)
      this.shake = 8; this.sfx('chapter');
      this.toast('홀씨가 한꺼번에 터졌다', 'bad');
      this._ruinSpawn(e.ruin, 5, 150);
    } else if (e.ev === 'password') {
      this.toast('벽 너머에 빈 곳이 있다 — 숫자를 맞춰야 열린다');
      this.sfx('open');
    }
  },

  /** 신비한 방 — 한 세계에 세 곳뿐이고, 한 번 쓰면 끝난다.
      싸움이 아니라 "고르는 것"이 내용이라 되돌릴 수 없게 뒀다. */
  useMystic(o) {
    const m = MYSTIC[o.mk]; if (!m) return;
    const p = this.player;
    if (o.used) { UI.openLore(m.n, ['한 번 쓰고 나면 아무 일도 일어나지 않는다.'], []); this.sfx('open'); return; }
    const choices = [];
    const afford = !m.cost || p.gold >= m.cost;
    choices.push({
      t: m.ask + (afford ? '' : ' (금화가 모자란다)'),
      fn: () => {
        if (!afford) { this.toast('금화가 모자란다', 'bad'); UI.closeDialogue(); return; }
        if (m.cost) p.gold -= m.cost;
        o.used = 1;
        p.addBuff(m.buff);
        if (m.heal) { p.hp = p.d.maxHp; p.mp = p.d.maxMp; }
        p.addXp(Math.round(900 * this.scale()));
        for (let i = 0; i < 44; i++)
          this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#bfe8ff', -34, 1.3));
        this.shake = 8;
        this.toast(m.got, 'good');
        this.sfx('chapter');
        UI.closeDialogue(); UI.refreshBag(); UI.updateHUD();
      }
    });
    UI.openLore(m.n, m.lines, choices);
    this.sfx('open');
  },

  /** 유적마다 다른 세 자리 숫자. 세계 씨앗에서 뽑으므로 세계마다 다르다.
      비문 흔적에 한 자리씩 흩어져 있다(readLorestone 이 덧붙인다). */
  ruinCode(id) {
    const h = hashStr(this.world.seed + ':' + id);
    return String(100 + (h % 900));
  },

  /** 숫자 잠긴 문 — 세 자리를 맞추면 열린다 */
  openCodeDoor(o) {
    const w = this.world;
    if (o.opened) { this.toast('이미 열려 있다'); return; }
    const code = this.ruinCode(o.ruin);
    const got = prompt('돌판에 숫자 세 자리를 넣는 홈이 있다.\n(유적 안 비문 흔적에 한 자리씩 적혀 있다)');
    if (got === null) return;
    if (got.trim() !== code) {
      this.toast('맞지 않는다 — 홈이 그대로다', 'bad');
      this.sfx('mine');
      return;
    }
    o.opened = true;
    for (let y = o.dy - 4; y <= o.dy; y++) w.set(o.dx, y, T.AIR);
    for (let i = 0; i < 30; i++)
      this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#ffe08a', -30, 1.1));
    this.shake = 10;
    this.toast('맞물리는 소리가 났다', 'good');
    this.sfx('chapter');
  },

  /** 유적에 처음 발을 들였을 때 — 그 유적만의 카드를 한 번 띄운다.

      유적이 열 곳인데 밖에서는 다 똑같은 벽돌 더미였고, 들어가도 "여기가 어디였나"를
      말해 주는 게 없었다. 한 번뿐인 카드라 다시 와도 뜨지 않는다(seenRuins 는 세이브에
      남는다). 어느 유적인지 알 수 없는 옛 세이브의 유적은 조용히 건너뛴다. */
  checkRuinEntry() {
    const p = this.player, w = this.world;
    const r = w.ruinAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    if (!r || !r.id) return;
    if (!this.seenRuins) this.seenRuins = {};
    if (this.seenRuins[r.id]) return;
    this.seenRuins[r.id] = 1;
    const card = RUIN_CARD[r.id];
    const spec = RUIN_SPEC.find(s => s.id === r.id);
    // 석판 유적 셋은 RUIN_SPEC 에 없다 — STORY_RUIN 에서 이름을 가져온다
    const st = /^story(\d)$/.exec(r.id);
    const name = spec ? spec.n
      : (st && STORY_RUIN[+st[1]] && STORY_RUIN[+st[1]].n) || '이름 없는 유적';
    if (card) UI.chapterCard({ sub: card.sub, title: name, line: card.line });
    this.sfx('chapter');
  },

  /** 다 여문 작물에 얹는 반짝임.

      밭을 한참 키워 놓고도 어느 줄이 거둘 때가 됐는지 알려면 타일 그림을 하나하나
      들여다봐야 했다. 다 여문 칸만 천천히 반짝이게 해서 멀리서도 한눈에 보이게 한다.
      world.crops 는 심은 칸만 들고 있어서 밭이 커도 도는 양이 그만큼이다. */
  drawRipeCrops(c, camX, camY) {
    const w = this.world;
    if (!w.crops || !w.crops.size) return;
    c.save();
    c.fillStyle = '#ffe9a8';
    for (const k of w.crops) {
      const def = TILE_DEF[w.tiles[k]];
      if (!def || !def.crop || !def.crop.ripe) continue;
      const x = k % WW, y = (k / WW) | 0;
      const sx = x * TS - camX, sy = y * TS - camY;
      if (sx < -TS || sy < -TS || sx > this.W || sy > this.H) continue;
      // 칸마다 위상을 어긋나게 — 밭 전체가 한꺼번에 깜빡이면 경고등처럼 보인다
      const ph = (this.time * 0.8 + (x * 7 + y * 13) * 0.19) % 1;
      if (ph > 0.34) continue;
      c.globalAlpha = Math.sin(ph / 0.34 * Math.PI);
      const gx = sx + 4 + ((x * 5 + y * 3) % 3) * 5;
      const gy = sy + 4 + ((x * 3 + y * 7) % 3) * 4;
      c.fillRect(gx, gy - 3, 1, 7);
      c.fillRect(gx - 3, gy, 7, 1);
      c.fillRect(gx - 1, gy - 1, 3, 3);
    }
    c.restore();
  },

  /** 지금 겨누고 있는 각도 — doAttack 이 화살을 쏘는 각도와 같은 식이다.
      겨눈 곳이 아직 없으면(터치 등) 바라보는 쪽으로 둔다. */
  aimAngle(p) {
    const i = this.input;
    if (!i || i.wx === undefined || i.wy === undefined) return p.facing > 0 ? 0 : Math.PI;
    return angleTo(p.cx, p.cy, i.wx, i.wy);
  },

  drawHeldWeapon(c, p, sx, sy, bob) {
    /* 손에 그려지는 것은 "지금 실제로 쓰는 것"이어야 한다. 곡괭이·괭이·낚싯대를 핫바에서
       고르면 그것으로 캐고 갈고 던지는데, 예전에는 장착 무기(검)만 그려서 화면과 조작이
       따로 놀았다. 핫바에 도구/낚싯대가 있으면 그것을, 아니면 장착 무기를 든다. */
    const hi = p.held(), hd = hi && idef(hi);
    const tool = hd && (hd.type === 'tool' || hd.type === 'rod') ? hi : null;
    const wep = tool || p.equip.weapon;
    if (wep) {
      const d = idef(wep);
      c.save();
      c.translate(sx + 10, sy + 20 + bob);
      /* 활·쇠뇌·총은 겨눈 쪽을 향해야 한다. 아이콘이 이미 오른쪽(+x)을 쏘는 그림이라
         (활: 메긴 화살이 오른쪽, 레일건: 총구가 오른쪽) 겨눔 각도만큼 돌리면 그대로
         발사 방향이 된다. 자루 무기용 90° 보정을 여기서 걸면 아래를 겨누게 된다. */
      if (!tool && d.wc === 'ranged') {
        c.rotate(this.aimAngle(p));
        c.translate(BOW_HAND, 0);          // 팔을 뻗은 만큼 앞으로 — 몸에 겹치지 않게
      } else {
        const ang = p.swing > 0
          ? (p.swingAng + (p.swingDir > 0 ? 1 : -1) * (p.swing / 0.24 - 0.5) * 2.0)
          : (p.facing > 0 ? -0.4 : Math.PI + 0.4);
        c.rotate(ang);
        // 스프라이트는 위를 향하므로 90° 돌려 자루가 손에 오게 한다
        c.translate(15, 0); c.rotate(Math.PI / 2);
      }
      Art.drawItem(c, wep.id, -13, -13, 26);
      c.restore();
      // 스윙 궤적 — 무기를 실제로 휘두를 때만(도구를 들고 있으면 베는 게 아니다)
      if (!tool && p.swing > 0 && d.wc === 'melee') {
        c.globalAlpha = p.swing / 0.24 * 0.32;
        c.strokeStyle = '#fff2c8'; c.lineWidth = 4;
        c.beginPath();
        c.arc(sx + 10, sy + 20, p.swingReach * 0.8, p.swingAng - 0.9, p.swingAng + 0.9);
        c.stroke(); c.lineWidth = 1; c.globalAlpha = 1;
      }
    }
    if (p.channel) {
      c.globalAlpha = .5; c.strokeStyle = '#ffcf6a'; c.lineWidth = 3;
      c.beginPath(); c.arc(sx + 10, sy + 20, 60 + Math.sin(this.time * 20) * 8, 0, TAU); c.stroke();
      c.lineWidth = 1; c.globalAlpha = 1;
    }
  },

  /** 손그림 몹 위에 얹는 것들 — 피격 섬광 · 체력 막대 · 페이즈 전환 섬광.
      절차 흔들림 경로와 일반 경로가 같은 것을 그려야 해서 따로 뺐다. */
  drawEnemyOverlay(c, e, sx, sy, dy, meta) {
    const w = meta ? meta.frameW : e.w;
    if (e.flash > 0) {   // 피격 섬광 — 판정 박스가 아니라 실제로 그려진 그림을 덮는다
      c.save(); c.globalAlpha = Math.min(.75, e.flash * 6); c.fillStyle = '#fff';
      c.fillRect(sx, sy - dy, w, e.h + dy); c.restore();
    }
    /* 페이즈가 막 넘어간 보스를 금빛으로 덮는다. 시트가 페이즈마다 idle 두 장뿐이고
       그림 차이가 3% 안팎인 보스가 있어, 이게 없으면 바뀐 걸 알 수가 없다. */
    if (e.phaseT > 0) {
      c.save(); c.globalAlpha = Math.min(.55, e.phaseT * 0.8); c.fillStyle = '#ffe08a';
      c.fillRect(sx, sy - dy, w, e.h + dy); c.restore();
    }
    if (e.hp < e.maxHp && !e.boss) {
      const bw = Math.max(22, e.w);
      c.fillStyle = '#000a'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw, 4);
      c.fillStyle = '#d0564c'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw * (e.hp / e.maxHp), 4);
    }
  },

  drawEnemy(c, e, sx, sy) {
    /* 손그림 스프라이트 우선. 프레임이 판정 박스보다 크면 **바닥을 맞춰** 그린다.
       들토끼·눈산토끼는 판정 박스가 12px인데 시트 프레임은 40px이고, 그림 속 토끼 발이
       프레임 맨 아래에 있다. 위쪽을 맞춰 그리던 예전 방식에서는 그림이 28px(=1.27칸)
       아래로 처져서 "토끼가 한 블록 아래에서 움직이는" 것처럼 보였다.
       프레임과 판정 박스가 같은 몹(대부분)은 dy가 0이라 달라지는 게 없다. */
    const meta = this.spritesOn && Sprites.meta &&
      (Sprites.meta.characters.sheets[e.type] || Sprites.meta.bosses.sheets[e.type]);
    // 프레임 바닥 = 그림 발끝이라고 가정했었는데, 실제로는 시트마다 몇 px 투명 여백이
    // 남아 있어(들토끼류 실측 2.25px) 판정 박스가 작을수록 그만큼 더 떠 보였다.
    // Sprites.footInset가 실측한 여백이라 그만큼 덜 밀어 올린다.
    const dy = meta ? Math.max(0, meta.frameH - e.h - (Sprites.footInset[e.type] || 0)) : 0;

    /* 그림이 거의 안 움직이는 개체는(ENEMIES 의 stiff — 프레임 간 픽셀 차를 재서
       골랐다) 렌더러가 대신 흔들어 준다. 걸을 때는 속도에 맞춰 위아래로 튀고 진행
       방향으로 살짝 기울이고, 보스처럼 서 있기만 하는 것은 숨을 쉬게 한다.
       그림을 다시 그리기 전까지의 가림막이라, 다시 그린 개체는 stiff 를 떼면 된다. */
    const st = e.def.stiff;
    if (st && this.spritesOn) {
      const moving = Math.abs(e.vx) > 6;
      if (moving) {
        const ph = this.time * 7 * Math.PI;                 // 걸음 프레임과 같은 박자
        const bob = Math.abs(Math.sin(ph)) * 2.6 * st;
        const lean = Math.sin(ph * 0.5) * 0.035 * st * (e.facing < 0 ? -1 : 1);
        c.save();
        c.translate(sx + e.w / 2, sy + e.h);
        c.rotate(lean);
        c.translate(-(sx + e.w / 2), -(sy + e.h) - bob);
      } else {
        const br = Math.sin(this.time * 2.4 * Math.PI) * 1.1 * st;   // idle 박자
        c.save();
        c.translate(0, br);
      }
      const ok = Sprites.draw(c, e.type, this.enemyFrame(e), sx, sy - dy, e.facing < 0);
      c.restore();
      if (ok) { this.drawEnemyOverlay(c, e, sx, sy, dy, meta); return; }
    }

    if (this.spritesOn && Sprites.draw(c, e.type, this.enemyFrame(e), sx, sy - dy, e.facing < 0)) {
      this.drawEnemyOverlay(c, e, sx, sy, dy, meta);
      return;
    }
    const f = 1;
    let col = e.def.c;
    if (e.flash > 0) col = '#ffffff';
    c.save();
    const t = e.type;
    if (e.def.ai === 'jumper' || t === 'king_slime') {
      const sq = e.onGround ? 1 : 0.86;
      const hh = e.h * sq, ww = e.w * (2 - sq);
      c.fillStyle = col; c.globalAlpha = .88;
      c.beginPath(); c.roundRect(sx - (ww - e.w) / 2, sy + (e.h - hh), ww, hh, 8); c.fill();
      c.globalAlpha = 1; c.fillStyle = '#1a1a22';
      c.fillRect(sx + ww * .26, sy + e.h - hh * .62, 4, 5); c.fillRect(sx + ww * .62, sy + e.h - hh * .62, 4, 5);
      if (t === 'king_slime') { c.fillStyle = shade('#d8b13d', f); c.fillRect(sx + e.w * .3, sy + e.h - hh - 8, e.w * .4, 8); }
    } else if (e.def.ai === 'flyer') {
      c.fillStyle = col;
      const flap = Math.sin(this.time * 18) * 6;
      c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h / 2, e.w * .32, e.h * .42, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(sx + e.w / 2, sy + e.h / 2);
      c.lineTo(sx - 6, sy + e.h / 2 - flap); c.lineTo(sx + 4, sy + e.h / 2 + 6); c.fill();
      c.beginPath(); c.moveTo(sx + e.w / 2, sy + e.h / 2);
      c.lineTo(sx + e.w + 6, sy + e.h / 2 - flap); c.lineTo(sx + e.w - 4, sy + e.h / 2 + 6); c.fill();
      c.fillStyle = '#ff5a5a'; c.fillRect(sx + e.w * .34, sy + e.h * .38, 3, 3); c.fillRect(sx + e.w * .58, sy + e.h * .38, 3, 3);
    } else if (e.def.ai === 'swimmer') {
      // 물속 생물 — 몸통 하나에 꼬리지느러미. 헤엄치는 방향으로 몸이 살짝 굽는다
      const wag = Math.sin(this.time * 9 + e.x * .05) * (e.h * .28);
      const fx = e.facing < 0 ? -1 : 1;
      const mx = sx + e.w / 2, my = sy + e.h / 2;
      c.fillStyle = col; c.globalAlpha = .95;
      c.beginPath(); c.ellipse(mx, my, e.w * .40, e.h * .42, 0, 0, TAU); c.fill();
      c.beginPath();                                   // 꼬리
      c.moveTo(mx - fx * e.w * .34, my);
      c.lineTo(mx - fx * (e.w * .62), my - e.h * .40 + wag);
      c.lineTo(mx - fx * (e.w * .62), my + e.h * .40 + wag);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = shade(col, 1.45);                  // 등지느러미
      c.fillRect(mx - e.w * .10, my - e.h * .56, e.w * .22, e.h * .18);
      c.fillStyle = e.def.passive ? '#e8f4ff' : '#ffcf5a';
      c.fillRect(mx + fx * e.w * .20, my - e.h * .10, 3, 3);
    } else if (e.def.ai === 'caster' || e.boss) {
      c.fillStyle = col; c.globalAlpha = .92;
      c.beginPath(); c.roundRect(sx, sy, e.w, e.h, 10); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = '#0e0e14'; c.fillRect(sx + e.w * .2, sy + e.h * .22, e.w * .6, e.h * .24);
      c.fillStyle = e.boss ? '#ff7a4a' : '#ffdd66';
      const ey = Math.sin(this.time * 3) * 1.5;
      c.fillRect(sx + e.w * .27, sy + e.h * .28 + ey, e.w * .16, e.h * .1);
      c.fillRect(sx + e.w * .57, sy + e.h * .28 + ey, e.w * .16, e.h * .1);
      if (e.boss) {
        c.globalAlpha = .2; c.fillStyle = e.def.c;
        c.beginPath(); c.arc(sx + e.w / 2, sy + e.h / 2, e.w * (0.9 + Math.sin(this.time * 3) * .08), 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
    } else {
      // 인간형
      c.fillStyle = col;
      c.fillRect(sx + 2, sy + e.h * .3, e.w - 4, e.h * .5);
      c.fillRect(sx + 3, sy + e.h * .8, 5, e.h * .2);
      c.fillRect(sx + e.w - 8, sy + e.h * .8, 5, e.h * .2);
      c.fillStyle = shade(e.def.c, f * 1.12);
      c.fillRect(sx + 3, sy + 2, e.w - 6, e.h * .28);
      c.fillStyle = '#1a1a22';
      c.fillRect(sx + (e.facing > 0 ? e.w - 9 : 5), sy + e.h * .12, 3, 3);
      if (e.type === 'archer') { c.strokeStyle = shade('#8a6a3a', f); c.beginPath(); c.arc(sx + e.w / 2 + e.facing * 10, sy + e.h * .45, 9, -1, 1); c.stroke(); }
    }
    c.restore();
    // 체력바
    if (e.hp < e.maxHp && !e.boss) {
      const bw = Math.max(22, e.w);
      c.fillStyle = '#000a'; c.fillRect(sx + (e.w - bw) / 2, sy - 8, bw, 4);
      c.fillStyle = '#d0564c'; c.fillRect(sx + (e.w - bw) / 2, sy - 8, bw * (e.hp / e.maxHp), 4);
    }
  },
  /** 마을 경비병 — 여명 마을의 남색 겉옷에 창과 활 */
  drawGuard(c, e, sx, sy) {
    const f = e.face || 1, t = this.time;
    // 손그림 시트가 있으면 그걸로 (일반 몹과 같은 7프레임 규격)
    if (this.spritesOn && Sprites.img.npc_guard) {
      c.fillStyle = '#00000038';
      c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h, 11, 3.5, 0, 0, TAU); c.fill();
      const fr = e.shootCd > 0.85 || e.atkCd > 0.5 ? 4
        : Math.abs(e.vx) > 6 ? 2 + (Math.floor(t * 7) % 2)
          : Math.floor(t * 2.4) % 2;
      if (Sprites.draw(c, 'npc_guard', fr, sx, sy, f < 0)) {
        if (e.hp < e.maxHp) {
          c.fillStyle = '#00000088'; c.fillRect(sx - 2, sy - 7, e.w + 4, 3);
          c.fillStyle = '#5fc45f'; c.fillRect(sx - 2, sy - 7, (e.w + 4) * clamp(e.hp / e.maxHp, 0, 1), 3);
        }
        return;
      }
    }
    const bob = e.onGround && Math.abs(e.vx) > 20 ? Math.sin(t * 11) * 1.4 : 0;
    c.save();
    c.fillStyle = '#00000038';
    c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h, 11, 3.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#2f3f5e'; c.fillRect(sx + 3, sy + 14 + bob, 14, 18);           // 겉옷
    c.fillStyle = '#3f5580'; c.fillRect(sx + 4, sy + 15 + bob, 12, 8);
    c.fillStyle = '#d8a94b'; c.fillRect(sx + 8, sy + 17 + bob, 4, 12);            // 문장 띠
    c.fillStyle = '#33333a'; c.fillRect(sx + 4, sy + 31, 5, 9);                   // 다리
    c.fillRect(sx + 11, sy + 31, 5, 9);
    c.fillStyle = '#c8a488'; c.fillRect(sx + 5, sy + 4 + bob, 10, 11);            // 얼굴
    c.fillStyle = '#6a7a8e'; c.fillRect(sx + 4, sy + 2 + bob, 12, 6);             // 투구
    c.fillRect(sx + (f > 0 ? 13 : 3), sy + 6 + bob, 3, 7);                        // 볼가리개
    c.fillStyle = '#8a6a3a';                                                       // 창
    c.fillRect(sx + (f > 0 ? 16 : 2), sy + 6 + bob, 2, 26);
    c.fillStyle = '#c8ccd4';
    c.fillRect(sx + (f > 0 ? 15.5 : 1.5), sy + 2 + bob, 3, 6);
    if (e.hp < e.maxHp) {                                                          // 체력
      c.fillStyle = '#00000088'; c.fillRect(sx - 2, sy - 7, e.w + 4, 3);
      c.fillStyle = '#5fc45f'; c.fillRect(sx - 2, sy - 7, (e.w + 4) * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
    c.restore();
  },
  drawWolf(c, e, sx, sy) {
    c.save();
    c.globalAlpha = .65 + Math.sin(this.time * 6) * .1;
    c.fillStyle = '#9fd8ff';
    c.beginPath(); c.roundRect(sx, sy + 4, e.w, e.h - 4, 5); c.fill();
    c.beginPath(); c.moveTo(sx + e.w - 4, sy + 4); c.lineTo(sx + e.w + 6, sy); c.lineTo(sx + e.w + 6, sy + 12); c.fill();
    c.fillStyle = '#fff'; c.fillRect(sx + e.w, sy + 4, 3, 3);
    c.restore();
  },
  drawNpc(c, o, sx, sy, f) {
    const d = NPCS[o.npc], p = this.player;
    /* 1순위 — 손그림 캐릭터 시트(char/npc_*.png, 매니페스트 키 npcw_*).
       2순위 — 몸통 네모 + 대화창 초상화를 얼굴 자리에 얹기.
       2순위는 초상화가 128×128 상반신 그림이라, 세계에 세워 두면 사람이 아니라 액자가
       서 있는 것처럼 보인다. v1.0.4에서 NPC 9종 시트를 따로 그리기로 했고 파일이
       들어오는 대로 1순위로 자동으로 넘어간다(코드는 더 안 고쳐도 된다). */
    const flip = o.x + o.w / 2 > p.cx;                      // 늘 플레이어 쪽을 본다
    const fr = Math.floor(this.time * 1.6 + o.x * 0.05) % 2;
    // 시트 프레임(40px)이 판정 박스(44px)보다 짧아서, 위쪽을 맞춰 그리면 발이 바닥에서
    // 4px 뜬다. drawEnemy와 같은 방식으로 바닥(판정 박스 아래) 기준에 맞춘다.
    const meta = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets['npcw_' + d.art];
    const dy = meta ? meta.frameH - o.h - (Sprites.footInset['npcw_' + d.art] || 0) : 0;
    if (!(this.spritesOn && Sprites.draw(c, 'npcw_' + d.art, fr, sx, sy - dy, flip))) {
      c.fillStyle = shade(d.c, f);
      c.fillRect(sx + 3, sy + 14, 16, 20);
      c.fillRect(sx + 5, sy + 34, 5, 10); c.fillRect(sx + 13, sy + 34, 5, 10);
      const im = this.spritesOn && Sprites.img['npc_' + d.art];
      if (im && im.width) {
        c.save();
        c.imageSmoothingEnabled = false;
        c.drawImage(im, sx + o.w / 2 - 14, sy - 2, 28, 28);
        c.restore();
      } else {
        c.fillStyle = shade('#e8c39a', f); c.fillRect(sx + 5, sy + 3, 12, 12);
        c.fillStyle = shade('#2a2018', f); c.fillRect(sx + 4, sy + 2, 14, 4);
        c.fillStyle = '#1a1a22'; c.fillRect(sx + 8, sy + 8, 2, 2); c.fillRect(sx + 13, sy + 8, 2, 2);
      }
    }
    // 상호작용 표시 — 이모지 대신 나침반과 같은 손그림 말풍선 아이콘을 재사용
    if (dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2) < TS * 7) {
      c.globalAlpha = .6 + Math.sin(this.time * 4) * .3;
      this.drawCompassGlyph(c, 'npc', sx + o.w / 2, sy - 9, '#e8c86a');
      c.globalAlpha = 1;
    }
  },
  drawCursor(c, camX, camY) {
    const p = this.player;
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    const near = dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) <= TS * 6;
    const held = p.held();
    const showTile = held && (idef(held).type === 'tool' || idef(held).type === 'block');
    if (showTile && near && !this.uiOpen) {
      c.strokeStyle = 'rgba(255,235,180,.55)'; c.lineWidth = 1.5;
      c.strokeRect(tx * TS - camX + .5, ty * TS - camY + .5, TS - 1, TS - 1);
      c.lineWidth = 1;
    }
    if (p.mineTx >= 0 && p.mineProg > 0) {
      c.fillStyle = `rgba(255,255,255,${0.12 + p.mineProg * 0.2})`;
      c.fillRect(p.mineTx * TS - camX, p.mineTy * TS - camY, TS, TS * p.mineProg);
    }
    if (this.hoverObj) {
      const o = this.hoverObj;
      if (dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2) < TS * 7) {
        c.strokeStyle = 'rgba(216,169,75,.8)'; c.lineWidth = 1.5;
        c.strokeRect(o.x - camX - 2.5, o.y - camY - 2.5, o.w + 5, o.h + 5);
        c.lineWidth = 1;
        const label = o.type === 'door' ? (o.closed ? '문 열기' : '문 닫기') : {
          chest: '상자 열기', workbench: '작업대', forge: '용광로', npc: '대화', altar: '제단',
          vault: '보관고', board: '의뢰 게시판', reforge: '재련대', waystone: '귀환 비석', inn: '여관',
          terminal: '단말 읽기', lorestone: '비문 읽기', tablet: '석판 읽기', lair: '둥지', seal: '봉인문'
        }[o.type];
        if (label) {
          c.fillStyle = '#e8dcc0'; c.font = '11px "Pretendard",sans-serif'; c.textAlign = 'center';
          c.fillText(label + ' (우클릭)', o.x - camX + o.w / 2, o.y - camY - 12);
        }
      }
    }
    // 조준선
    c.strokeStyle = 'rgba(255,255,255,.35)';
    c.beginPath();
    c.arc(this.input.mx, this.input.my, 5, 0, TAU); c.stroke();
  },

  /* ---- 지도 색 (미니맵 · 전체 지도 공용) ---- */
  mapColorAt(tx, ty, id, wl) {
    const w = this.world, k = ty * WW + tx;
    if (id === undefined) { id = w.tiles[k]; wl = w.walls[k]; }
    if (id === T.AIR) return wl ? '#20202c' : '#141620';
    const d = TILE_DEF[id];
    return d.ore ? d.c : shade(d.c || '#333', 0.65);
  },
  /** 세이브를 막 불러왔을 때(또는 새 게임 시작 시) explored 비트로부터 축소 지도를 다시 칠한다.
      화면에 실제로 그려질 때는 render()가 칸 단위로 이 캔버스를 계속 갱신한다. */
  buildMapAtlas() {
    const c = this.mapAtlasX, w = this.world;
    c.fillStyle = '#07080c'; c.fillRect(0, 0, WW, WH);
    const img = c.getImageData(0, 0, WW, WH), buf = img.data;
    for (let k = 0; k < WW * WH; k++) {
      if (!w.explored[k]) continue;
      const hex = this.mapColorAt(k % WW, (k / WW) | 0);
      const n = parseInt(hex.slice(1), 16), o = k * 4;
      buf[o] = (n >> 16) & 255; buf[o + 1] = (n >> 8) & 255; buf[o + 2] = n & 255; buf[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  },

  /* ---- 미니맵 ---- */
  drawMinimap() {
    const c = this.mmx, w = this.world, p = this.player;
    const MW = this.mm.width, MH = this.mm.height, S = 2;
    c.fillStyle = '#07080c'; c.fillRect(0, 0, MW, MH);
    const px = Math.floor(p.cx / TS), py = Math.floor(p.cy / TS);
    const halfW = Math.floor(MW / S / 2), halfH = Math.floor(MH / S / 2);
    for (let y = 0; y < MH / S; y++) {
      for (let x = 0; x < MW / S; x++) {
        const tx = px - halfW + x, ty = py - halfH + y;
        if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) continue;
        const k = ty * WW + tx;
        if (!w.explored[k]) continue;   // 안개 — 눈으로 본 적 없는 칸은 그리지 않는다
        const id = w.tiles[k];
        if (id === T.AIR) {
          const wl = w.walls[k];
          if (wl) { c.fillStyle = '#181820'; c.fillRect(x * S, y * S, S, S); }
          continue;
        }
        const d = TILE_DEF[id];
        c.fillStyle = d.ore ? d.c : shade(d.c || '#333', 0.65);
        c.fillRect(x * S, y * S, S, S);
      }
    }
    // NPC·상자 — 빛을 받아 공개된 칸에 있을 때만 위치를 보여 준다.
    for (const o of w.objects) {
      if (o.type !== 'npc' && o.type !== 'chest') continue;
      const otx = Math.floor(o.x / TS), oty = Math.floor(o.y / TS);
      if (!w.explored[clamp(oty, 0, WH - 1) * WW + clamp(otx, 0, WW - 1)]) continue;
      const ox = otx - (px - halfW), oy = oty - (py - halfH);
      if (ox < 0 || oy < 0 || ox * S >= MW || oy * S >= MH) continue;
      c.fillStyle = o.type === 'npc' ? '#6fd8ff' : '#d8a94b';
      c.fillRect(ox * S - 1, oy * S - 1, S + 2, S + 2);
    }
    // 적도 미지의 어둠 속에서는 보이지 않는다. 공개된 지형 안에 들어왔을 때만 표식이 생긴다.
    for (const e of this.ents) {
      if (!(e instanceof Enemy)) continue;
      const etx = clamp(Math.floor(e.cx / TS), 0, WW - 1), ety = clamp(Math.floor(e.cy / TS), 0, WH - 1);
      if (!w.explored[ety * WW + etx]) continue;
      const ox = etx - (px - halfW), oy = ety - (py - halfH);
      if (ox < 0 || oy < 0 || ox * S >= MW || oy * S >= MH) continue;
      c.fillStyle = e.boss ? '#ff4a4a' : '#e07070';
      c.fillRect(ox * S - 1, oy * S - 1, S + 2, S + 2);
    }
    // 쓰러진 자리 — 안개와 무관하게 늘 보인다(내가 죽은 자리는 내가 안다)
    if (this.deathMark) {
      const dx = Math.floor(this.deathMark.x / TS) - (px - halfW);
      const dy = Math.floor(this.deathMark.y / TS) - (py - halfH);
      if (dx >= 0 && dy >= 0 && dx * S < MW && dy * S < MH) {
        c.fillStyle = '#cfd8ff';
        c.fillRect(dx * S - 1, dy * S - 3, 3, 7);
        c.fillRect(dx * S - 3, dy * S - 1, 7, 3);
      }
    }
    // 플레이어
    c.fillStyle = '#fff';
    c.fillRect(halfW * S - 1, halfH * S - 1, 3, 3);
    c.strokeStyle = '#3b3527'; c.strokeRect(.5, .5, MW - 1, MH - 1);
  }
};

addEventListener('DOMContentLoaded', () => G.init());
