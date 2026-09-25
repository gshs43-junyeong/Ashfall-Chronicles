/* ===== game.js — 루프 / 입력 / 렌더 / 진행 ===== */
'use strict';

const SAVE_KEY = 'ashfall_save_v3';   // v1: 640×232 · v2: 2800×480 — 세계 폭이 바뀌면 호환 불가
const SAVE_SLOTS = 3;

/* ---------------- 세이브 판올림 ----------------
   세이브 모양이 바뀔 때마다 여기에 함수를 하나씩 **덧붙인다**. 이미 나간 판으로 만든
   기록도 계속 열려야 하므로, 옛 함수는 절대 고치거나 지우지 않는다 — 순서대로 통과시켜
   지금 판까지 끌어올리는 사다리다.

   규칙: 각 함수는 "그 판에서 새로 생긴 필드에 기본값을 채우는" 일만 한다. 이미 값이
   있으면 건드리지 않는다(두 번 돌아도 안전해야 한다). */
const SAVE_UPGRADES = [
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
  /* v3 → v4 — 업적.
     빈 칸으로만 열어 둔다. 옛 세이브에서 "이미 한 일"은 checkAch()가 처음 돌 때
     조건을 다시 재서 채운다 — 업적 조건이 전부 **이미 있는 카운터**를 읽기 때문에
     가능한 일이다(그래서 새 카운터를 안 만들었다). */
  (d) => { if (!d.achievements) d.achievements = {}; },
  /* v4 → v5 — 업적 중에 세이브에 없는 값을 묻는 것들이 생겼다
     (플레이 시간·거래 횟수·익사 같은 것). 하나하나 필드를 늘리는 대신 tally 한 칸에
     모아 둔다 — 나중에 세는 것이 더 생겨도 세이브 모양이 안 바뀐다.
     옛 세이브는 0부터 시작한다. 그건 어쩔 수 없다 — 지난 플레이 시간을 되살릴 방법이
     없기 때문이고, 그래서 **셀 수 있는 것은 최대한 기존 카운터로 물었다.** */
  (d) => { if (!d.tally) d.tally = {}; },
  /* v5 → v6 — 유적 탐사 기록. 유적마다 { rooms: 밟은 방, peak: 가장 높이 오른 맥박
     단계, echo: 넘긴 메아리 단계, a·s: 등급 보상을 받았는가 }. 옛 세이브는 빈 기록으로
     시작한다 — 이미 연 상자·잡은 주인·읽은 비문은 기록이 **세이브에서 바로 재므로**
     그대로 점수에 들어간다(방만 다시 밟으면 된다). 맥박 자체는 저장하지 않는다(나갔다
     들어오면 가라앉아 있는 것이 맞다). */
  (d) => { if (!d.survey) d.survey = {}; },
  /* v6 → v7 — 동굴 갈래(world.caveGrid)와 금 간 자갈(world.faults).
     옛 세계는 갈래 없이(전부 plain) 무너질 자갈도 없이 연다 — 타일은 이미 지어져 있으니
     새로 꾸밀 방법이 없다. 새 세계부터 갈래가 생긴다. */
  (d) => { if (d.world) { if (d.world.caveGrid === undefined) d.world.caveGrid = null; if (!d.world.faults) d.world.faults = []; } },
  /* v7 → v8 — 세계 크기(world.size: 's' 소형 · 'm' 중형 · 'l' 대형). 그전 세계는 전부 소형이다.
     불러오기는 이 값으로 setWorldSize 를 먼저 부른 뒤 ww·wh 를 대조한다. */
  (d) => { if (d.world && !d.world.size) d.world.size = 's'; }
];
const SAVE_VERSION = SAVE_UPGRADES.length + 1;

/** 옛 세이브를 지금 판까지 끌어올린다. d를 그 자리에서 고친다. */
function upgradeSave(d) {
  let v = d.v || 1;
  while (v < SAVE_VERSION) { SAVE_UPGRADES[v - 1](d); v++; }
  d.v = SAVE_VERSION;
  return d;
}
const slotKey = (i) => `${SAVE_KEY}_slot${i}`;
const sigKey = (i) => `${SAVE_KEY}_slot${i}_s`;

/* ================= 세이브 무결성 =================
   브라우저 게임에서 저장을 "고칠 수 없게" 만드는 것은 불가능하다 — 검사하는 코드가
   같은 기계 안에 있으므로 마음먹으면 서명을 다시 계산해 넣으면 된다. 여기서 하는 일은
   **문턱을 올리는 것**이다: 개발자 도구로 숫자만 고쳐 쓰는 가장 흔한 방식은 막힌다.

   서명은 세이브 **바깥 칸**에 적는다. 안에 넣으면 ① 키 순서에 따라 다시 만든 글자열이
   달라져 멀쩡한 기록이 헛되이 어긋나고 ② 문자열을 감싸며 이스케이프가 겹쳐 용량이
   분다(이미 용량 한계가 빠듯하다). 같은 이유로 암호화·base64도 쓰지 않는다 — 세이브가
   수 MB라 base64는 1/3을 더 불린다. 읽히는 것은 막지 않고, 고친 것을 잡아내기만 한다. */
const SAVE_SALT = 'ashfall-seal-1';
/** FNV-1a 32비트 두 벌. 한 벌이면 충돌이 잦아 다른 오프셋으로 한 번 더 돌린다. */
function saveSign(text) {
  let a = 0x811c9dc5, b = 0x01000193;
  const t = text + SAVE_SALT;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    a ^= c; a = (a + ((a << 1) + (a << 4) + (a << 7) + (a << 8) + (a << 24))) >>> 0;
    b = ((b ^ c) * 16777619) >>> 0;
  }
  return a.toString(36) + '.' + b.toString(36) + '.' + (t.length % 1e6).toString(36);
}
/** 열어도 되는 기록인가(sig 는 그 기록에 딸린 서명). 봉인 표시가 없는 옛 기록은 그냥 통과시킨다 —
    판을 올렸다고 남의 진행을 못 열게 만들 수는 없다. 다음 저장 때 저절로 봉인된다. */
function saveSealOk(raw, d, sig) {
  if (!d || !d.sealed) return true;
  return !!sig && sig === saveSign(raw);
}
/** 슬롯 목록에 띄울 요약 — 본문을 열지 않고 목록을 그리려고 따로 적는다 */
function saveHead(d) {
  return { name: d.name || '이름 없는 모험가', level: d.p ? d.p.level : 1, chapter: d.chapter,
    size: (d.world && d.world.size) || 's', savedAt: d.savedAt };
}

/* ================= 저장소 =================
   세이브는 **IndexedDB** 에 gzip 으로 넣는다. localStorage 는 출처마다 5 MB 남짓이고 글자당 2바이트로
   세서, 대형 세계(173만 글자 ≈ 3.5 MB) 슬롯 셋이면 넘친다. gzip 하면 대형 한 칸이 0.96 MB(소형 0.28 MB),
   IndexedDB 한도는 수백 MB 이상이다(실측 — 크로미움 file:// 에서도 열린다).
   IndexedDB 가 안 열리는 곳(일부 브라우저의 시크릿 창·file://)에서는 예전처럼 localStorage 에 쓴다.

   레코드 둘로 나눈다: 'data'(본문 gz + 서명)와 'head'(슬롯 요약). 타이틀 목록은 head 만 읽는다 —
   본문을 읽으면 슬롯마다 수백 KB 를 풀어야 한다.
   ★ 옛 localStorage 기록은 init 에서 옮긴다. **다시 읽어 원문과 같을 때만** 지운다 — 옮기다 실패해도
     원본은 남는다. 서명도 그대로 옮긴다(손댄 기록이 옮기는 길에 봉인이 풀리면 안 된다). */
const SaveStore = {
  mode: 'ls',
  db: null,
  ready: null,
  start() { return this.ready || (this.ready = this.init()); },
  async init() {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
      this.db = await new Promise((res, rej) => {
        const q = indexedDB.open('ashfall', 1);
        q.onupgradeneeded = () => { q.result.createObjectStore('data'); q.result.createObjectStore('head'); };
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error);
        q.onblocked = () => rej(new Error('blocked'));
        setTimeout(() => rej(new Error('timeout')), 4000);     // 열기가 멈춘 채로 안 돌아오는 브라우저가 있다
      });
      this.mode = 'idb';
    } catch (e) { console.warn('IndexedDB 를 못 열어 localStorage 에 저장한다:', e); this.mode = 'ls'; return; }
    try { await this.migrate(); } catch (e) { console.error(e); }
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
  },
  _req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  _tx(stores, mode, fn) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction(stores, mode);
      let out;
      Promise.resolve(fn(tx)).then(v => { out = v; }, rej);
      tx.oncomplete = () => res(out);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error('abort'));
    });
  },
  async _gz(text) {
    if (typeof CompressionStream === 'undefined') return null;
    return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  },
  async _ungz(buf) {
    return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  },
  /** 슬롯에 글자열을 넣으면서 서명도 같이 적는다. sig 를 주면 그것을 쓴다(옮기기 — 봉인을 그대로 둔다) */
  async put(slot, text, head, sig) {
    await this.start();
    if (sig === undefined) sig = saveSign(text);
    if (this.mode === 'ls') {
      localStorage.setItem(slotKey(slot), text);
      try { if (sig) localStorage.setItem(sigKey(slot), sig); else localStorage.removeItem(sigKey(slot)); } catch (e) { }
      return;
    }
    // 압축은 트랜잭션 **밖에서** 끝낸다 — 트랜잭션은 기다리는 동안 저절로 닫힌다
    const gz = await this._gz(text);
    const rec = gz ? { gz, sig } : { text, sig };
    await this._tx(['data', 'head'], 'readwrite', tx => {
      tx.objectStore('data').put(rec, slotKey(slot));
      tx.objectStore('head').put(head, slotKey(slot));
    });
  },
  /** { raw, sig } 또는 null */
  async get(slot) {
    await this.start();
    if (this.mode === 'ls') {
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) return null;
      let sig = null;
      try { sig = localStorage.getItem(sigKey(slot)); } catch (e) { }
      return { raw, sig };
    }
    const rec = await this._tx(['data'], 'readonly', tx => this._req(tx.objectStore('data').get(slotKey(slot))));
    if (!rec) return null;
    return { raw: rec.gz ? await this._ungz(rec.gz) : rec.text, sig: rec.sig || null };
  },
  async remove(slot) {
    await this.start();
    localStorage.removeItem(slotKey(slot));
    localStorage.removeItem(sigKey(slot));   // 서명만 남으면 다음 기록이 헛되이 잠긴다
    if (this.mode === 'idb') await this._tx(['data', 'head'], 'readwrite', tx => {
      tx.objectStore('data').delete(slotKey(slot)); tx.objectStore('head').delete(slotKey(slot));
    });
  },
  /** 슬롯 요약 SAVE_SLOTS 개(빈 칸은 null). localStorage 쪽은 본문을 풀어 손댄 기록(bad)까지 가린다 */
  async list() {
    await this.start();
    const out = [];
    for (let i = 0; i < SAVE_SLOTS; i++) {
      if (this.mode === 'idb') {
        out.push(await this._tx(['head'], 'readonly', tx => this._req(tx.objectStore('head').get(slotKey(i)))) || null);
        continue;
      }
      const raw = localStorage.getItem(slotKey(i));
      if (!raw) { out.push(null); continue; }
      try {
        const d = JSON.parse(raw);
        let sig = null;
        try { sig = localStorage.getItem(sigKey(i)); } catch (e) { }
        out.push(Object.assign(saveHead(d), { bad: !saveSealOk(raw, d, sig) }));
      } catch (e) { out.push(null); }
    }
    return out;
  },
  async migrate() {
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const raw = localStorage.getItem(slotKey(i));
      if (!raw) continue;
      const have = await this._tx(['head'], 'readonly', tx => this._req(tx.objectStore('head').get(slotKey(i))));
      if (have) continue;                         // 이미 옮긴 칸은 건드리지 않는다
      let d;
      try { d = JSON.parse(raw); } catch (e) { continue; }
      const sig = localStorage.getItem(sigKey(i));
      await this.put(i, raw, saveHead(d), sig);
      const back = await this.get(i);
      if (back && back.raw === raw && back.sig === sig) {
        localStorage.removeItem(slotKey(i)); localStorage.removeItem(sigKey(i));
      }
    }
  }
};
const SET_KEY = 'ashfall_settings';
/* 설정 기본값. 세이브와 별개로 저장되므로 새 게임을 시작해도 유지된다.
   view 는 시야 배율(%), keys 는 바꾼 조작키만 담는 표, notice 는 끈 알림만 담는 표 —
   둘 다 null 이면 "손댄 적 없음"이라 KEY_ACTIONS·NOTICE_KINDS 의 기본을 그대로 쓴다. */
const SET_DEFAULT = { music: 40, sfx: 50, shake: 100, dmgnum: 1, minimap: 1,
  dlgtype: 1,          // 대사가 한 글자씩 흘러나오는 연출 (끄면 한 번에 뜬다)
  view: 100, keys: null, notice: null };
// 완전한 암흑(0)은 지도에 남기지 않는다. 1 이상이면 횃불·용암·햇빛 등으로 최소한 보이는 상태다.
const MAP_REVEAL_LIGHT = 1;

const G = {
  cv: null, ctx: null, mm: null, mmx: null,
  W: 0, H: 0, cam: { x: 0, y: 0 },
  state: 'title',
  world: null, player: null, rng: new RNG(1),
  ents: [], projs: [], parts: [], texts: [], drops: [], pending: [], corpses: [],
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
    /* 그림이 다 붙은 다음에 타이틀을 연다 — 안 그러면 배경 없는 맨 글자가 먼저 보이고
       몇 초 뒤에 그림이 툭 얹힌다. */
    document.body.classList.add('booting');
    window.__acBooting = 1;                   // 로딩 화면은 이제 이쪽이 맡는다 (index.html 참고)
    this.showLoading('불러오는 중…');
    /* ★ 타이틀 배경은 여기서 바로 돌린다. bootDone() 에서만 켜면, 애셋이 늦을 때
       index.html 의 안전장치가 먼저 로딩을 걷어 배경 캔버스가 빈 채로 남는다.
       그림이 없어도 하늘·잔광·재는 그릴 수 있다(그림이 붙으면 useSprites 가 얹는다). */
    if (typeof TitleBG !== 'undefined') { TitleBG.init(); TitleBG.start(); }
    // 손그림 애셋은 비동기로 붙인다 — 실패해도 절차 생성 렌더로 계속 동작
    if (window.Sprites) {
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
          // 위에서 예외가 났더라도 그림 자체는 다 받아 놓았을 수 있다. 한 번 더 붙여 본다
          if (typeof TitleBG !== 'undefined') TitleBG.useSprites();
          /* ★ 여기서 bootDone() 을 부르지 않는다. Sprites.ready() 는 "약속이 끝났다"일
             뿐 "필요한 그림이 다 왔다"가 아니다(실패해도 finally 는 돈다) — 실측으로
             배경 PNG 를 막으니 2.1초 만에 능선 0겹으로 열렸다. 문을 여는 판단은
             waitForTitleArt() 한 곳에만 둔다. */
        });
    } else {
      this.bootDone();
    }
    this.waitForTitleArt();
    this.bindInput();
    this.loadSettings();
    if (window.Music) Music.armStart(() => this.pickBgm());
    this.migrateLegacySave();
    SaveStore.start();                   // 옛 localStorage 기록을 IndexedDB 로 옮기는 것도 여기서 시작한다
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
    /* 저장하기의 선택지 — 먼저 저장하고 그 결과를 파일로 내보낸다.
       순서가 중요하다: exportSaves() 는 저장소를 읽으므로, 저장이 **끝난 뒤에** 불러야
       방금 한 것이 빠지지 않는다(저장은 비동기다). */
    $('#btn-save-export').onclick = async () => { if (await this.saveGame()) this.exportSaves(); };
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
      else if (this.isKey('map', k)) { UI.openFullmap(); e.preventDefault(); }
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
    /* 타자가 도는 중이면 넘기지 말고 그 자리에서 끝까지 펼친다 — 한 번 누른 것이
       "다 읽었다"가 아니라 "빨리 보여 달라"인 경우가 훨씬 많다 */
    $('#dialogue').addEventListener('click', () => { if (UI.dlg && !UI.finishType()) UI.nextLine(false); });
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

  /* ================= 타이틀 그림을 다 받고 나서 연다 =================
     ★ 시간을 재지 말고 **그림이 왔는지**를 본다. 8초에 무조건 열던 시절에는, 회선이
       느리면 타이틀이 하늘 그라데이션만 깔린 채로 떴다.
     문을 셋 둔다 — ① 다 받았다 → 곧바로 ② 6초 동안 한 장도 안 늘었다 → 있는 것으로
     ③ 25초 → 무슨 일이 있어도. ②가 핵심이다(느린 회선은 끝까지 기다리고, 끊긴
     회선은 오래 안 붙잡는다). 받은 장수를 로딩 글에 적어 멈춘 것처럼 안 보이게 한다. */
  waitForTitleArt() {
    const NEED = (typeof TitleBG !== 'undefined') ? TitleBG.NEEDED.length : 0;
    if (!NEED) { setTimeout(() => this.bootDone(), 8000); return; }
    const t0 = Date.now();
    let best = -1, seenBest = -1, bestAt = t0;
    const STALL = 10000, CAP = 25000;
    const tick = () => {
      if (this.booted) return;
      const got = TitleBG.artReady();
      /* "멈췄다"의 판정은 타이틀 그림 넷만 보면 너무 성급하다 — 느린 회선에서는 큰
         그림 한 장을 받는 동안 넷 중 하나도 안 늘어난다. 그림이 **아무거나** 하나라도
         새로 붙으면 회선은 살아 있는 것이므로 그것도 진행으로 친다.
         (220KB/s 로 재 보니 넷만 보면 1/4 에서 포기했다) */
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
      this.showLoading(`불러오는 중… ${got}/${NEED}`);
      setTimeout(tick, 120);
    };
    tick();
  },

  /** 애셋이 다 붙었다 — 로딩을 걷고 타이틀을 연다 (한 번만) */
  bootDone() {
    if (this.booted) return;
    this.booted = true;
    window.__acBooted = 1;                    // index.html 의 안전장치에게 알린다
    /* 글꼴까지 기다린다. 안 그러면 로고가 기본 글꼴로 한 번 그려졌다가 바뀐다.
       다만 이 약속이 끝내 안 풀리는 브라우저가 있어 1.5초로 끊는다 — 글꼴 하나
       때문에 로딩에 갇히면 안 된다. */
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
    this.showLoading(size && size !== 's' ? `${WORLD_SIZES[size].n} 세계를 빚는 중… 조금 오래 걸린다` : '세계를 빚는 중…');
    // 다음 프레임에 생성해서 로딩 화면이 먼저 그려지게 한다
    setTimeout(() => { try { this._newGame(seed, name, charId, mode, size); } finally { this.hideLoading(); } }, 40);
  },
  _newGame(seed, name, charId, mode, size) {
    this.rng = new RNG(seed + '_g');
    // ★ World 를 만들기 **전에** — 배열 크기와 모든 좌표가 여기서 정해진다. 주소의 &size=m|l 은 디버그 바로가기용
    setWorldSize(size || new URLSearchParams(location.search).get('size') || 's');
    this.world = new World(seed).generate();
    this.fitMapAtlas();
    this._rigs = null; this._fbg = null;   // 세계가 바뀌었으니 자리·원경 캐시를 버린다
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
    this.corpses = [];
    this.rings = []; this.bolts = []; this.warns = []; this.sigs = []; this.edge = null;   // 특성 연출 — 화면 밖으로 넘어가지 않게 함께 비운다
    this.guardCd = 0; this.facTimer = 0; this.cropTimer = 0;   // 새로 시작할 때 남아 있던 대기 시간을 지운다
    this.chapter = 0; this.dayT = 7 * 60; this.time = 0; this.boss = null;
    this.talked = {}; this.crafted = {}; this.paused = false;
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
    /* ?debug=meteor — 2.5초 뒤 운석. &at=me 면 머리 위(즉사 확인), &at=<x> 면 그 칸, 없으면 오른쪽 &dx=(30)칸.
       자리 검사(meteorSiteOk)를 건너뛰는 시험 전용이다. */
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
      /* 스토리 진행도 함께 맞춘다 — 여명 마을은 종장(세션 2)을 지나야 열리는 곳이라,
         챕터를 0(세션 1)에 둔 채 마을만 열면 세계가 앞뒤가 안 맞는다. 그 상태에서는
         세션 2 물건이 상인 재고에서 걸러지고(sess 게이트) 마을 서비스 값도 세션 1
         배수로 계산돼, "고친 게 반영이 안 된" 것처럼 보인다(실제로 그렇게 보였다).
         sess= 로 세션을, ch= 로 챕터를, plv= 로 레벨을 직접 줄 수도 있다. */
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

    /* ?debug=price — 값 확인용. 여명 마을 4단계 광장에 상인 셋·조련사·대장장이가
       다 있는 상태로, 기본 100레벨·금화 1,000만으로 시작한다. 파는 값은 상인을 열어
       보고, 되파는 값은 아무 물건이나 상점 창에 넣어 보면 된다.
       &plv= 로 레벨, &gold= 로 금화, &sess= 로 세션을 바꿀 수 있다. */
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
      this.toast(`값 확인 자리 — ${plv}레벨 · 마을 ${VILLAGE.length - 1}단계 · 세션 ${sess}`, 'good');
    }

    /* ?debug=sea — 세션 3 확인 자리. 빙하 지대 물가에 서서 시작한다.
       왼쪽이 바다, 오른쪽이 빙하다. 산소통 세 종류와 심해 장비를 다 쥐여 주므로
       숨 계단(14 → 46 → 78초)을 그 자리에서 바꿔 가며 확인할 수 있다.
       &plv= 레벨 · &gold= 금화 · &ch= 장(기본 15 = 세션 3 서장). */
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
      this.toast('세션 3 확인 자리 — 왼쪽이 바다, 오른쪽이 빙하. 산소통 세 종류 지급', 'good');
    }

    /* ?debug=fishfarm — 낚시·농사만 확인하는 자리.
       울림 정글의 폭포 호수 기슭에 세운다. 그 한 자리에서 낚시(호수)와 농사(기슭의
       흙)를 둘 다 할 수 있어서, 확인하러 걸어다닐 일이 없다.
       &plv= 로 레벨, &gold= 로 금화를 줄 수 있다(기본 15레벨·5000). */
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
      /* 정글 호수 기슭 — 물가 바로 옆의 마른 땅에 세운다. 호수 자리는 세계마다
         달라서 좌표를 박지 않고 pools에서 정글 호수를 찾아 그 왼쪽 기슭을 잡는다. */
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
        /* 밭 감을 자리를 깔아 둔다. 이 기슭은 정글 풀·진흙이라 괭이가 안 먹는다
           (괭이는 흙·풀·눈·부패한 풀만 간다 — game.js의 농사 블록). 확인용 자리이므로
           호수 왼쪽으로 12칸을 흙/풀로 바꿔 둔다. 정상 플레이 지형은 안 건드린다. */
        for (let k = 1; k <= 12; k++) {
          const x = sx - k, sy = w.surface[clamp(x, 0, WW - 1)];
          if (TILE_DEF[w.get(x, sy)].liquid) continue;
          if (w.solid(x, sy - 1)) continue;                      // 나무 밑동은 건너뛴다
          /* 정글은 지면 바로 위가 덩굴·풀포기라 그 칸이 AIR가 아니다. 괭이는 "위가
             비어 있는" 칸만 갈아서(농사 블록), 치워 주지 않으면 12칸 중 두어 칸만
             갈린다(실제로 그랬다). 통과 가능한 장식만 걷어낸다. */
          if (w.get(x, sy - 1) !== T.AIR) w.set(x, sy - 1, T.AIR);
          w.set(x, sy, T.GRASS);
          if (!w.solid(x, sy + 1)) w.set(x, sy + 1, T.DIRT);
        }
        p.x = sx * TS;
        p.y = (w.surface[clamp(sx, 0, WW - 1)] - 2) * TS;
        p.vx = p.vy = 0;
        this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
        this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
        this.toast('낚시·농사 확인 자리 — 오른쪽이 호수, 왼쪽 12칸이 갈 수 있는 풀밭', 'good');
      }
      UI.refreshBag(); UI.refreshEquip();
    }

    /* ?debug=ruin&id=mine — 유적의 맥박·탐사 기록·메아리 확인 자리.
       그 유적 입구에서 가장 가까운 방에 서서 시작한다. id 는 RUIN_SPEC 의 여섯
       (mine · ice · pyramid · spore · blight · abyss). &pulse= 로 맥박을 미리 올리고,
       &boss=1 이면 주인을 이미 잡은 것으로 쳐서 빈 둥지(메아리)를 바로 볼 수 있다.
       맥박 물약·북과 결정을 조금 쥐여 준다. &plv= 레벨(기본 30). */
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

    /* ?debug=cave — 동굴 확인 자리. 기본은 가장 가까운 **금 간 자갈** 앞(무너뜨려 보라고
       곡괭이를 쥐여 준다). &k=moss|drip|geode|fume 이면 그 갈래 굴 한가운데에서 시작한다. */
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

    /* ?debug=bomb — 폭탄만 확인하는 자리.
       베이스캠프 오른쪽 지하에 시험장을 판다. 한가운데 기반암 기둥이 **안전 지대
       경계선(CAMP_X1+16)에 정확히** 서 있어서, 같은 폭탄을 왼쪽에 던지면 아무것도
       안 부서지고 오른쪽에 던지면 구덩이가 생긴다 — 보호 규칙을 한 화면에서 나란히
       볼 수 있다. 오른쪽에는 단단하기 1·2·3·4·5와 기반암 기둥을 세워 두었으니
       폭탄(2)·강력(3)·굴착(4) 등급이 각각 어디서 멈추는지 그대로 드러난다.
       물·용암 웅덩이와 기계 한 줄은 "안 건드린다"를 확인하는 자리다.
       &plv= 레벨 · &gold= 금화. */
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
      /* 깊이는 **안전 지대 판정이 정한다.** zoneAt은 캠프를 "지면에서 20칸 아래까지"로
         보므로(world.js), 바닥이 그보다 깊으면 왼쪽 방이 캠프가 아니게 되어 비교
         자체가 성립하지 않는다. 캠프 쪽 지면 중 가장 높은 곳에서 18칸 아래로 잡는다. */
      let smin = 1e9;
      for (let x = gx - 26; x <= gx; x++) smin = Math.min(smin, w.surface[clamp(x, 0, WW - 1)]);
      const gy = clamp(smin + 18, 60, WH - 40);
      const x0 = gx - 26, x1 = gx + 78, top = gy - 13;
      // 굴을 파고 바닥 여섯 줄을 돌로 깐다
      for (let x = x0; x <= x1; x++)
        for (let y = top; y <= gy + 6; y++) {
          if (!w.inB(x, y)) continue;
          w.set(x, y, y > gy ? T.STONE : T.AIR);
          /* 뒷벽을 반드시 발라 준다. 굴을 판다는 건 타일만 지우는 게 아니라 뒤에 벽을 남기는 일이다.
             사연: docs/code-history.md#h41 */
          w.walls[w.i(x, y)] = 2;
        }
      /* 천장 메우기. 천장 위 여덟 줄의 빈칸을 돌로 채워 굴을 닫는다. 확인용 지형이라 지상이 조금 뭉개지는 건 감수한다.
         사연: docs/code-history.md#h42 */
      for (let x = x0; x <= x1; x++)
        for (let y = Math.max(0, top - 8); y < top; y++)
          if (w.inB(x, y) && w.get(x, y) === T.AIR) w.set(x, y, T.STONE);
      // 경계 기둥 — 기반암이라 어떤 폭탄으로도 안 없어진다. 가운데 세 칸은 드나드는 문
      for (let y = top; y <= gy; y++) if (y < gy - 3 || y > gy - 1) w.set(gx, y, T.BEDROCK);
      // 천장 횃불
      /* 단단하기 시험 기둥 — 폭탄이 어디서 멈추는지가 이 줄에 다 나온다.
         폭탄 mine 2 / 강력 3 / 굴착 4 이므로 기대값은
         돌·금 → 셋 다 / 흑요암 → 강력·굴착 / 흑암석 → 굴착만 / 심층암·기반암 → 없음. */
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
      // 방어력이 폭탄 피해를 얼마나 깎는지 볼 표적. 게(방어 78)와 슬라임을 같이 둔다
      for (let i = 0; i < 3; i++)
        this.ents.push(new Enemy(i === 0 ? 'reef_crab' : 'slime', (gx + 30 + i * 4) * TS, (gy - 3) * TS, this.scale()));

      /* 불빛은 **마지막에** 건다. 기둥·웅덩이·기계를 다 세운 뒤라야 빈 칸만 골라
         걸 수 있다. 천장 하나만으로는 바닥이 캄캄해서(실제로 기둥이 안 보였다)
         천장·중간·바닥 세 줄로 건다. */
      for (const row of [top + 1, gy - 9, gy])
        for (let x = x0 + 2; x < x1; x += 3)
          if (w.get(x, row) === T.AIR) w.set(x, row, T.TORCH);

      p.x = (gx - 6) * TS; p.y = (gy - 2) * TS; p.vx = p.vy = 0;
      this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
      this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
      UI.refreshBag(); UI.refreshEquip();
      this.toast('폭탄 시험장 — 기반암 기둥 왼쪽이 안전 지대, 오른쪽이 부술 수 있는 곳', 'good');
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
    /* 이어지는 효과음 — 매 프레임 "지금 나야 하는가"만 넘긴다. 켜고 끄는 것과
       이음매 겹치기는 SfxLoop가 알아서 한다(1.0초 파일을 0.9초로 잘라 이어 붙인다). */
    if (window.SfxLoop) {
      const pl = this.player, playing = this.state === 'play' && !this.paused;
      const swim = playing && pl && (pl.swimming || pl.submerged > 0.5);
      const fuse = playing && this.projs.some(q => q instanceof Bomb);
      SfxLoop.set('swim', swim);
      SfxLoop.set('fuse', fuse);
    }
    // 환경음(폭포·호수)은 실제 플레이 중이고 안 멈춰 있을 때만 — 아니면 페이드아웃되게 dt만 흘려보낸다
    if (window.Ambient) {
      const active = this.state === 'play' && !this.paused && !!this.world && !!this.player;
      Ambient.updateFromWorld(this.world, this.player, dt, active);
    }
  },

  /** 지금 상황에 맞는 배경음악 키를 고른다 (music.js의 BGM 테이블과 짝) */
  pickBgm() {
    if (this.state !== 'play' || !this.player || !this.world) return 'title';
    /* 쓰러진 자리 — 사망 화면이 떠 있는 동안. 보스전보다 **먼저** 본다: 보스에게 죽으면
       화면은 사망 창인데 소리만 싸움이 이어져서, 진 것이 아니라 멈춘 것처럼 들렸다.
       판정은 화면의 클래스를 그대로 읽는다. 따로 깃발을 두면 부활·슬롯 초기화·불가능
       모드 삭제까지 세 군데에서 내려 줘야 하고, 한 군데만 빠져도 브금이 영영 안 돌아온다. */
    if (this._deathEl === undefined) this._deathEl = $('#death-screen');
    if (this._deathEl && this._deathEl.classList.contains('open')) return 'lastnote';
    /* 세션의 종장만 다른 곡을 쓴다. "5페이즈"가 곧 종장이라는 뜻이다 — 유적 미니보스는
       2페이즈, 보통 보스는 3페이즈고, 다섯을 가진 것은 별을 쫓아온 것·헤파·원형·환원기·
       갱을 메운 것 다섯뿐이다(ENEMIES 의 ph). 곡은 둘 중 하나가 무작위로 걸린다. */
    if (this.boss) return this.boss.phases >= 5 ? 'finale' : 'boss';
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

    /* 물에 잠겨 있으면 무조건 심해 곡. **어둠·심층 판정보다 먼저** 봐야 한다 —
       물속은 늘 어둡고 해저 평원은 y 600이 넘어 심층으로도 잡히므로, 뒤에 두면
       심해 곡이 영영 안 나온다(처음에 뒤에 뒀다가 실제로 그랬다).
       비도 이 아래다 — 물속에서는 비가 닿지 않는다. */
    if (p.swimming || p.submerged > 0.5) return 'seadeep';

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
    /* ---- 손이 멈추는 한 박자(히트스톱) ----
       큰 것이 닿는 순간 세계를 잠깐 세운다. 때린 쪽과 맞은 쪽이 그 한 프레임 동안
       붙어 있는 것이 무게로 읽힌다 — 화면 흔들림만으로는 "크다"가 아니라 "카메라가
       떨린다"로만 보인다.
       ★ dt 를 0 으로 두면 물리가 한 프레임 통째로 건너뛰어 관통이 생긴다. 0.12배면
         거의 선 것으로 보이면서 충돌은 계속 풀린다. 멈춤 시간은 실제 시간으로 줄인다. */
    if (this.stopT > 0) { this.stopT -= dt; dt *= 0.12; }
    this.time += dt;
    /* 플레이 시간(초). time은 연출용 시계라 일시정지·죽음 화면에서도 흐르지만,
       이쪽은 **실제로 노는 동안만** 쌓는다. 1분마다 업적을 본다 — 시간 업적은
       1·10·100시간이라 그보다 잦게 볼 이유가 없다. */
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
    /* 11장의 결전은 "세우고 · 물리고 · 끊기"다. 가운데 걸음(동력이 돈 적이 있다)은
       지나가면 사라지므로 여기서 한 번 적어 둔다. 그 장에서만 본다. */
    if (this.chapter === 11 && !this.asmRan && this.world && this.world.machines
        && typeof Factory !== 'undefined') {
      for (const m of this.world.machines.values())
        if (m.t === 'assembler' && Factory.sat(this.world, m) > 0) { this.asmRan = 1; break; }
    }
    /* 문짝이 여닫히는 동안만 움직인다. 판정(closed)은 누른 순간 바로 바뀌고 그림만
       따라붙는다 — 그림이 다 열릴 때까지 못 지나가면 조작이 그림을 기다리게 된다.
       열 때가 닫을 때보다 빠르다(밀면 열리고, 닫힐 때는 제 무게로 돌아온다). */
    if (w && w.doors) for (const d of w.doors) {
      const tgt = d.closed ? 0 : 1;
      if (d.sw === undefined) d.sw = tgt;
      else if (d.sw !== tgt) {
        const step = dt * (tgt > d.sw ? 7 : 5);
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
    /* ★ 입자에 상한이 없었다. 잰 최고치는 257개라 PART_CAP(900)에 정상 전투로는 닿지
       않지만, 난간이 없으면 언젠가 프레임으로 값을 치른다. 오래된 것부터 버린다. */
    if (this.parts.length > PART_CAP) this.parts.splice(0, this.parts.length - PART_CAP);
    for (let i = this.corpses.length - 1; i >= 0; i--) if ((this.corpses[i].t += dt) >= this.corpses[i].dur) this.corpses.splice(i, 1);
    for (let i = this.texts.length - 1; i >= 0; i--) if (!this.texts[i].update(dt)) this.texts.splice(i, 1);
    for (let i = this.pending.length - 1; i >= 0; i--) { this.pending[i].t -= dt; if (this.pending[i].t <= 0) { this.pending[i].fn(); this.pending.splice(i, 1); } }

    // 스폰
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = 1.1; this.trySpawn(); }
    this.updateRigs(dt);

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
          /* 촉발 지뢰 — 시간이 아니라 **밟는 순간** 터진다. 위 한 칸을 밟거나 몸이 닿으면
             그 자리에서 폭발하고 타일이 사라진다(한 번 쓰면 끝). 예고가 없는 대신 밟기
             전에는 바닥 원반으로 눈에 보인다 — 보고 걸으면 피할 수 있다. */
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
          /* 염수 분출구 — 위로 4칸 짠물을 뿜는다. 피해는 화염의 절반쯤이지만
             **숨을 5초 앗아간다.** 이미 숨을 참고 내려온 자리에서는 이쪽이 훨씬 무섭다.
             화염과 같은 방식으로 먼저 예고(물방울)를 보여 준다. */
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
              this.toast('짠물이 폐를 채운다 — 숨이 줄었다', 'bad');
            }
            for (const e of this.ents) if (e instanceof Enemy && !e.dead && aabb(r, e.rect())) e.hurt(24, false, null, 0);
          }
          if (Math.random() < 0.3) this.sfxAt('splash', x, y);
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

  /** 새 함정 셋. tickTileTraps 의 자리별 위상(tileHash)을 그대로 쓴다 —
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
      if (Math.random() < 0.2) this.sfxAt('hit_metal', x, y, this.strokeRate());   // 톱니는 쇠다
    }
  },

  /* ================= 좌클릭: 채굴 또는 공격 ================= */
  leftHold(dt) {
    const p = this.player, w = this.world;
    const held = p.held();
    const hd = held && idef(held);
    if (hd && hd.type === 'tool') { this.mine(dt, hd); return; }
    /* 낚싯대를 들고 좌클릭하면 아무 일도 없어야 한다 — 손에 낚싯대가 그려지는데
       장착 무기로 공격이 나가면 보이지 않는 검이 허공을 벤다. */
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
      if (o && o.placed && (OBJ_SIZE[o.type] || o.type === 'door')) {
        p.mineTx = -1; p.mineProg = 0;
        if (this.time - (this._stRm || -9) < 0.3) return;
        this._stRm = this.time;
        if (o.type === 'door') this.removeDoor(o); else this.removeStation(o);
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
      this.breakFx(tx, ty, id, 1);           // 쇠 파편 + 불티 + 기계가 꺼지는 소리
      return;
    }
    if (def.hard > (tool.power || 1) + (def.tree ? 2 : 0)) {
      p.mineTx = -1;
      if (!this._pickWarn || this.time - this._pickWarn > 1.5) { this._pickWarn = this.time; this.toast('더 좋은 곡괭이가 필요하다', 'bad'); }
      return;
    }
    if (p.mineTx !== tx || p.mineTy !== ty) { p.mineTx = tx; p.mineTy = ty; p.mineProg = 0; p.mineBeat = 0; }
    const rate = (0.6 + (tool.power || 1) * 0.55 + (tool.chop && def.tree ? 2 : 0)) / (0.45 + def.hard * 0.5);
    p.mineProg += rate * dt;
    /* ★ 캐는 소리는 **박자**로 친다. 주사위로 굴리면 초당 아홉 번까지 울려서
       곡괭이 한 획이 아니라 연속 소음이 되고, 간격도 들쭉날쭉해 손이 안 맞는다.
       좋은 곡괭이일수록 조금 빨리 친다(0.34초 → 0.18초). 파편도 같은 박자에
       튀어야 '한 획'으로 읽힌다. */
    p.mineBeat = (p.mineBeat || 0) - dt;
    if (p.mineBeat <= 0) {
      p.mineBeat = clamp(0.34 - (tool.power || 1) * 0.025, 0.18, 0.34);
      this.mineTickFx(tx, ty, id);
    }
    if (p.mineProg >= 1) {
      // 동력 곡괭이는 한 칸 캘 때마다 전하를 먹는다
      if (tool.pw && !p.useCharge(tool.pw)) {
        p.mineProg = 0;
        if (!this._pwWarn || this.time - this._pwWarn > 1.5) { this._pwWarn = this.time; this.toast('전하가 없다 — 충전된 배터리가 필요하다', 'bad'); }
        return;
      }
      p.mineProg = 0;
      // 수련·물풀·해초는 캐도 그 칸의 물이 남는다(data.js LEAVE_OF)
      w.set(tx, ty, LEAVE_OF[id] || T.AIR);
      p.mined[id] = (p.mined[id] || 0) + 1;
      if (id === T.FAULTSTONE) this.triggerFault(tx, ty);   // 숨은 동굴이 무너져 열린다
      // 등급 5 광물은 다른 돌과 소리가 다르다 — 캐는 순간 "이건 다른 돌"이 들려야 한다
      if (TILE_DEF[id] && TILE_DEF[id].hard >= 5) this.sfx('ore_hit');
      this.checkAch();
      /* ★ 다 여문 작물은 낫으로만 거둔다.
         곡괭이·도끼로 치면 이삭이 으스러져 **아무것도 남지 않는다** — 떨어지는 것도,
         씨앗도, 숙련도 없다. 밭 한 칸이 그냥 사라진다.
         덜 자란 칸은 그대로 둔다(그건 수확이 아니라 갈아엎는 일이고, 원래도
         나오는 것이 씨앗 한 톨뿐이라 막을 이유가 없다). */
      const reaping = def.crop && def.crop.ripe;
      if (reaping && !tool.scythe) {
        w.crops.delete(ty * WW + tx);
        this.matBurst('plant', (tx + .5) * TS, (ty + .5) * TS, 12, { spd: 1.1, vy: -40 });
        if (!this._scytheWarn || this.time - this._scytheWarn > 2.5) {
          this._scytheWarn = this.time;
          this.toast('낫 없이 거두면 다 으스러진다 — 낫이 필요하다', 'bad');
        }
        this.sfx('break_plant', this.strokeRate());
        return;
      }
      this.dropTile(tx, ty, id);
      // 다 여문 작물은 씨앗을 함께 돌려준다 — 한 번 시작하면 밭이 저절로 이어지도록
      if (def.crop) {
        w.crops.delete(ty * WW + tx);
        if (def.crop.ripe) this.harvestBonus(tx, ty, def, tool);
      }
      if (def.crop && def.crop.ripe) {
        // 다 여문 것을 거두는 소리는 부수는 소리가 아니다 — 그대로 둔다
        this.matBurst('plant', (tx + .5) * TS, (ty + .5) * TS, 10, { spd: .9, vy: -40 });
        this.sfx('harvest');
      } else this.breakFx(tx, ty, id);         // 재질 파편 + 재질 파괴음
      if (def.tree) this.fellTree(tx, ty, id === T.WOOD);
    }
  },

  /* ================= 밭은 아침에 자란다 =================
     4초마다 칸마다 주사위를 굴리면 밭 앞에 서서 야금야금 자라는 것을 **쳐다보는 일**이
     된다. 하루가 바뀔 때 한 단계씩 자란다 — 자고 일어나면 한 뼘 커져 있고, 그래야
     침대와 여관에도 이유가 생긴다. 숙련이 높으면 가끔 하루에 두 단계(레벨마다 7%). */
  growCropsDaily() {
    const w = this.world; if (!w || !w.crops || !w.crops.size) return;
    const lv = this.player.profLv('farm');
    let grew = 0, ripe = 0;
    const steps = 1 + (this.rng.chance((lv - 1) * 0.07) ? 1 : 0);
    for (let i = 0; i < steps; i++) {
      const g = w.growCrops(this.rng, 1, 99);   // 아침에는 반드시 한 단계 (확률 굴림 없음)
      grew += g.grew.length; ripe += g.ripe.length;
    }
    if (grew + ripe > 0 && this.everPlanted) {
      this.toast(`밤새 밭이 자랐다 — ${grew + ripe}칸${ripe ? ` · ${ripe}칸은 다 여물었다` : ''}`, 'good');
      // 화면 안에 밭이 있으면 티를 낸다
      for (const k of w.crops) {
        const x = k % WW, y = (k / WW) | 0;
        if (Math.abs(x * TS - this.cam.x - this.W / 2) > this.W / 2 + TS) continue;
        if (Math.abs(y * TS - this.cam.y - this.H / 2) > this.H / 2 + TS) continue;
        const d = TILE_DEF[w.get(x, y)];
        if (!d || !d.crop) continue;
        for (let i = 0; i < 2; i++)
          this.parts.push(new Part((x + .5) * TS, (y + .6) * TS, d.crop.ripe ? '#ffe08a' : '#8fc85a', -22, .5));
      }
    }
  },

  /* ================= 농사 숙련 =================
     다 여문 칸을 거둘 때만 불린다 — 씨앗을 돌려주고, 숙련 몫을 얹고, 숙련을 올린다.
     씨앗 1~2개가 1레벨의 모습이다. */
  harvestBonus(tx, ty, def, tool) {
    const p = this.player, lv = p.profLv('farm');
    const at = (it) => this.drops.push(new Drop((tx + .5) * TS, (ty + .5) * TS, it));
    // 별무늬 낫(reap)은 벤 자리마다 한 번 더 여문 것이 딸려 온다
    const reap = !!(tool && tool.reap);

    // ① 씨앗 — 3레벨 '고른 씨앗'부터는 반드시 하나 이상 돌아온다
    let seeds = (lv >= 3 ? 1 : 0) + (Math.random() < 0.5 + (lv - 1) * 0.04 ? 1 : 0);
    if (seeds > 0) at(makeItem(def.crop.seed, seeds));

    // ② 수확물 한 번 더 — 레벨마다 5%씩. 6레벨 '두 손 가득'은 그 위에 25%로 두 배
    const yieldId = def.drop;
    if (yieldId) {
      let extra = 0;
      if (Math.random() < (lv - 1) * 0.05) extra++;
      if (lv >= 6 && Math.random() < 0.25) extra++;
      if (reap) extra++;
      if (extra > 0) at(makeItem(yieldId, extra));
    }

    // ③ 10레벨 '풍요의 손' — 거둔 자리에 저절로 다시 심긴다
    if (lv >= PROF_MAX && this.world.plantSeed(tx, ty, def.crop.seed)) {
      for (let i = 0; i < 4; i++)
        this.parts.push(new Part((tx + .5) * TS, (ty + .6) * TS, '#8fc85a', -30, .5));
    }

    p.addProf('farm', 1);
  },

  /** 타일 하나가 부서질 때 떨어질 것을 굴린다. 잎은 leafDrop 가중치 표를 따로 타서
      대부분 빈손이고 바이옴별 재료가 낮은 확률로 섞인다('none'이면 아무것도 안 나온다). */
  dropTile(x, y, id) {
    const d = TILE_DEF[id];
    let out = d.drop;
    if (d.leafDrop) { const r = this.rng.weighted(d.leafDrop); out = r === 'none' ? null : r; }
    if (out) this.drops.push(new Drop((x + .5) * TS, (y + .5) * TS, makeItem(out, 1)));
    // 장식이면 그 장식도 하나 — 옮겨 놓을 수 있게(data.js 의 deco 절). 재료 드롭은 그대로 둔다
    const deco = DECO_OF[id];
    if (deco && deco !== out) this.drops.push(new Drop((x + .5) * TS, (y + .5) * TS, makeItem(deco, 1)));
  },

  /** 벌목 — 기둥을 자르면 그 위 기둥이 무너지고, 살아 있는 기둥에서 떨어져 나간 잎
      **덩어리**가 통째로 함께 떨어진다.

      ★ 잎을 한 장씩 보고 "기둥에 붙어 있나"를 따지면 안 된다. 수관은 기둥에서 반경
        2~5칸으로 퍼져 있어 멀쩡한 나무조차 바깥쪽 잎 대부분이 "기둥에 안 닿음"으로
        잡힌다. 맞닿은 잎을 한 덩어리로 묶고, 한 군데라도 기둥에 닿으면 통째로 살린다. */
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

  /** 폭탄 던지기 — 커서 쪽으로. 조준이 전부라 던지고 나면 손을 떠난다. */
  throwBomb(slot) {
    const p = this.player, it = p.bag[slot], d = idef(it);
    if (!it) return;
    const dx = this.input.wx - p.cx, dy = this.input.wy - p.cy;
    const len = Math.max(1, Math.hypot(dx, dy));
    const pow = clamp(len * 1.7, 240, 620);               // 멀리 찍을수록 세게, 상한 있음
    const b = new Bomb(p.cx, p.cy - 6, (dx / len) * pow, (dy / len) * pow - 140, d);
    this.projs.push(b);
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    // 터뜨린 횟수는 세이브에 없던 값이다 — 업적('터뜨려 본 사람')이 여기를 읽는다.
    // 만든 수(gathered)로는 못 센다. 쟁여 두기만 해도 오르기 때문이다.
    this.tally.bomb = (this.tally.bomb || 0) + 1;
    UI.refreshBag(); this.sfx('place');
  },

  /** (tx, ty) 바로 위로 전주 기둥이 내려오는가 — factory.js가 기둥을 그리는 규칙
      (전주 칸 아래로 첫 고체를 만날 때까지)과 같은 판정이다. */
  _poleAbove(tx, ty) {
    const w = this.world;
    for (let y = ty - 1; y >= ty - 40 && y > 2; y--) {
      const m = Factory.at(w, tx, y);
      if (m) return m.t === 'pole';
      if (w.solid(tx, y)) return false;        // 지붕·바위가 가로막으면 기둥은 여기까지 안 온다
    }
    return false;
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
    /* 1.55) 폭탄 — 커서 쪽으로 던진다. 소비품 판정보다 먼저 봐야 한다(둘 다 우클릭).
       던지는 세기는 거리에 비례하되 상한을 둔다 — 화면 끝을 찍어도 화면 밖으로는 안 간다. */
    {
      const hb = p.held();
      if (hb && idef(hb).type === 'bomb') { this.throwBomb(p.sel); return; }
    }

    /* 1.6) 소비품 — 핫바에 든 채로 바로 먹는다(급한 건 싸우는 도중인데 가방을 열었다
       닫는 사이에 죽는다). 상호작용 대상이 먼저라 상자 앞에서는 상자가 열린다. */
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
        /* 전주 기둥이 내려오는 열은 갈 수 없다. 기둥은 타일이 아니라 그림이라
           밭을 갈고 씨앗을 심으면 작물이 기둥과 같은 자리에 겹쳐 그려진다.
           같은 열 위쪽에 전주가 있고 사이가 뻥 뚫려 있으면 그 기둥이 여기까지 내려온다. */
        if (this._poleAbove(mtx, mty)) { this.toast('전신주 기둥이 지나가는 자리다', 'bad'); return; }
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
          // 전주 기둥이 지나가는 열에는 심지 않는다 — 괭이와 같은 이유(그림이 겹친다)
          if (this._poleAbove(mtx, mty + 1)) { this.toast('전신주 기둥이 지나가는 자리다', 'bad'); return; }
          if (!w.plantSeed(mtx, mty, hi.id)) { this.toast('갈아 둔 밭 위에만 심을 수 있다', 'bad'); return; }
          this.everPlanted = 1;   // 마을에 원래 있던 장식 밭 때문에 매일 알림이 뜨지 않게
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
      if (hi && idef(hi).type === 'door') { this.placeDoor(mtx, mty); return; }
    }

    // 4) 블록 설치
    const held = p.held();
    if (held && idef(held).type === 'block') {
      const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
      if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) return;
      /* 빈칸 말고 **액체 칸**에도 놓는다 — 물이 흐르게 된 뒤로는 블록을 물속에 끼워 넣어
         물길을 막는 것이 물을 다루는 유일한 방법이다. 수련·물풀·해초 칸은 장식이라 빼고. */
      const cur = w.get(tx, ty);
      if (cur !== T.AIR && !(FLUID_KIND[cur] && !LEAVE_OF[cur])) return;
      const near = w.get(tx - 1, ty) || w.get(tx + 1, ty) || w.get(tx, ty - 1) || w.get(tx, ty + 1) || w.wall(tx, ty);
      if (!near) return;
      /* 잠긴 골방 안에는 아무것도 못 놓는다 — 안에 발판을 놓아 밖에서 타고 넘거나,
         문틀 옆에 블록을 끼워 판정을 흔드는 길을 막는다. 암호를 풀면 풀린다. */
      if (w.inLockedVault(tx, ty)) { this.toast('잠긴 골방 안에는 놓을 수 없다', 'bad'); return; }
      const tileId = idef(held).tile;
      if (TILE_DEF[tileId].solid === 1 && aabb({ x: tx * TS, y: ty * TS, w: TS, h: TS }, p.rect())) return;
      // 장식은 기댈 데가 있어야 한다(data.js DECO_MOUNT) — 같은 장식끼리는 이어 붙는다
      const mount = DECO_MOUNT[tileId];
      if (mount === 'water') {
        if (cur !== T.WATER || TILE_DEF[w.get(tx, ty + 1)].solid !== 1) {
          this.toast('고인 물속 바닥에만 놓을 수 있다', 'bad');
          return;
        }
      } else if (mount && FLUID_KIND[cur]) {
        this.toast('물속에는 놓을 수 없다', 'bad');
        return;
      } else if (mount) {
        const by = mount === 'floor' ? ty + 1 : ty - 1, bt = w.get(tx, by);
        if (TILE_DEF[bt].solid !== 1 && bt !== tileId) {
          this.toast(mount === 'floor' ? '단단한 바닥 위에만 놓을 수 있다' : '천장에 매달아야 한다', 'bad');
          return;
        }
      }
      w.set(tx, ty, tileId);
      held.c--; if (held.c <= 0) p.bag[p.sel] = null;
      UI.refreshBag(); this.sfx('place');
    }
  },
  /* ================= 설치물 =================
     작업대·용광로·저장 상자는 타일이 아니라 w.objects에 얹히는 물건이라, 블록 설치나
     기계 설치와는 다른 경로가 필요하다. 한 칸 규격(OBJ_SIZE)이라 타일 하나를 차지한다. */
  /** tx,ty 는 발자국의 **왼쪽 아래** 칸. 2칸 이상인 시설은 거기서 오른쪽·위쪽으로
      넓힌다. tw×th 전체가 비어 있고, 그 폭만큼 바닥이 있고, 다른 설치물·NPC와도
      안 겹칠 때만 놓인다 — 발자국 전체를 보므로 반쪽이 벽에 박히는 일이 없다. */
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
  /* ================= 문 =================
     설치물(OBJ_SIZE 한 칸 규격)과 경로를 나눈다 — 문은 세로 두 칸, 성문은 세 칸이라
     한 칸 규격 표에 넣으면 성문이 눌린다. 닫힌 동안만 길을 막는다(World.hitSolid).
     ★ 경첩이 서는 쪽 = 열리는 쪽 = **놓을 때 바라본 쪽**. 짓는 자세가 그대로 결과가 된다. */
  placeDoor(tx, ty) {
    const p = this.player, w = this.world;
    const it = p.held();
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast('너무 멀다', 'bad'); return; }
    const y0 = ty - 1;                       // 겨눈 칸이 문의 **아랫칸** — 위로 한 칸 더 선다
    for (let yy = y0; yy <= ty; yy++) {
      if (w.get(tx, yy) !== T.AIR) { this.toast('빈 자리에만 달 수 있다', 'bad'); return; }
      if (Factory.at(w, tx, yy)) { this.toast('이미 기계가 있다', 'bad'); return; }
    }
    if (!w.solid(tx, ty + 1)) { this.toast('바닥이 있어야 문을 단다', 'bad'); return; }
    if (w.inLockedVault(tx, ty)) { this.toast('잠긴 골방 안에는 놓을 수 없다', 'bad'); return; }
    const box = { x: tx * TS, y: y0 * TS, w: TS, h: TS * 2 };
    for (const o of w.objects) {
      if (!OBJ_SIZE[o.type] && o.type !== 'npc' && o.type !== 'door') continue;
      if (aabb(box, { x: o.x, y: o.y, w: o.w, h: o.h })) { this.toast('그 자리에는 놓을 수 없다', 'bad'); return; }
    }
    /* 문틀 안에 서 있는 채로 달면 닫힌 문에 갇힌다 — 그때만 열어 둔 채로 세운다.
       "놓을 수 없다"고 막는 것보다 낫다. 어차피 한 번 누르면 닫힌다. */
    const inside = aabb(box, p.rect());
    w.pushDoor(tx * TS, y0 * TS, TS, TS * 2, p.facing >= 0 ? 1 : -1,
               { placed: 1, closed: !inside, sw: inside ? 1 : 0 });
    it.c--; if (it.c <= 0) p.bag[p.sel] = null;
    for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, (ty + .5) * TS, '#8a6a42', -30, .5));
    UI.refreshBag(); this.sfx('place');
  },
  /** 문 회수 — 내가 단 것만. 마을·캠프에 원래 서 있던 문과 성문은 손대지 않는다. */
  removeDoor(o) {
    const p = this.player, w = this.world;
    if (!o.placed) return false;
    const it = makeItem('door_wood', 1);
    if (!p.addItem(it)) this.drops.push(new Drop(o.x + o.w / 2, o.y + o.h / 2, it));
    let i = w.objects.indexOf(o); if (i >= 0) w.objects.splice(i, 1);
    i = w.doors.indexOf(o); if (i >= 0) w.doors.splice(i, 1);
    this.matBurst('wood', o.x + o.w / 2, o.y + o.h / 2, 12, { spd: 1.1 });
    UI.refreshBag(); this.sfx('break_wood', this.strokeRate());
    return true;
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
    // 작업대·화로는 나무와 돌로 짜인 것이다 — 쇠 기계와 다른 소리가 나야 한다
    this.matBurst('wood', o.x + o.w / 2, o.y + o.h / 2, 10, { spd: 1.1 });
    this.matBurst('stone', o.x + o.w / 2, o.y + o.h / 2, 5, { spd: .9 });
    UI.refreshBag(); this.sfx('break_wood', this.strokeRate());
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
      else { this.fishSplash(p.fish, 3); p.fish = null; this.toast('낚싯줄을 거두었다'); }
      return;
    }
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast('너무 멀다', 'bad'); return; }
    const t = w.get(tx, ty);
    // 타일 번호를 하나씩 세지 않고 liquid 표시로 본다 — 바닷물·수련칸이 늘 때마다 빠뜨렸다
    if (!TILE_DEF[t].liquid) { this.toast('물 위에 던져야 한다', 'bad'); return; }
    // 이 물이 특별히 매긴 웅덩이(정글 폭포호 등)에 속하면 rareMul을 물려받는다 —
    // 없으면 1(보정 없음). w.pools 좌표는 웅덩이의 대략적인 중심이라 넉넉한 상자로 판정한다.
    let rareMul = 1;
    for (const pl of (w.pools || [])) {
      if (pl.rareMul === undefined) continue;
      if (Math.abs(tx - pl.x) < 16 && Math.abs(ty - pl.y) < 10) { rareMul = pl.rareMul; break; }
    }
    // 낚시 숙련 — 레벨마다 입질까지의 대기가 4%씩 짧아진다
    const wait = this.rng.range(1.2, 2.8) * (rod.fishWait !== undefined ? rod.fishWait : 1)
      * (1 - (p.profLv('fish') - 1) * 0.04);
    p.fish = { tx, ty, t: wait, biting: false, bite: 0, rodId: p.held().id, rareMul };
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
        // 3레벨 '가벼운 손목' — 챌 수 있는 창이 1.0초에서 1.6초로 늘어난다
        f.biting = true; f.bite = f.biteMax = p.profLv('fish') >= 3 ? 1.6 : 1.0;
        this.toast('손끝이 흔들린다!', 'good');
        for (let i = 0; i < 10; i++) this.parts.push(new Part((f.tx + .5) * TS, f.ty * TS, '#ffe08a', -30, .6));
      }
    } else {
      f.bite -= dt;
      if (f.bite <= 0) this.resolveFish('auto');
    }
  },
  /** 놓쳤을 때의 뒤처리 — 미끼는 이미 먹혔다(resolveFish에서 뺀다) */
  _fishLost(msg) {
    this.player.fish = null;
    this.toast(msg, 'bad');
    UI.refreshBag();                // 물 튀김·소리는 resolveFish 가 줄을 걷는 순간 이미 냈다
  },
  /** 줄을 걷는 순간의 물 튀김. 챔질(reel)이면 크게 — "잡았다"가 손끝에 오게. */
  fishSplash(f, n) {
    const wx = (f.tx + .5) * TS, wy = f.ty * TS;
    for (let i = 0; i < n; i++)
      this.parts.push(new Part(wx, wy, i % 3 ? '#cfe8ff' : '#ffffff', -60 - Math.random() * 50, .55));
  },
  /** 낚시 판정 — quality: 'auto'(시간 초과, 기본 확률) | 'reel'(입질 중 즉시 챔질, 보너스)
      2단계로 굴린다 — 1단계는 "물고기가 아니라 다른 것"이 걸릴지(itemChance, 낚싯대별로
      크게 갈린다: 일반 낚싯대는 거의 안 걸리고 숙련된 낚싯대는 꽤 잦다), 걸리면 2단계로
      잡템·포션·장신구 표를 굴린다. 정글 폭포호처럼 rareMul이 낮게 매겨진 물에서는
      1단계 확률 자체가 그만큼 줄어든다. */
  /** 낚시 판정 — quality: 'auto'(시간 초과) | 'reel'(입질 중 즉시 챔질, 보너스).
      2단계다 — ① 물고기가 아니라 다른 것이 걸릴지(itemChance, 낚싯대별로 크게 갈린다)
      ② 걸렸으면 잡템·포션·장신구 표. rareMul 이 낮은 물에서는 ①부터 줄어든다. */
  resolveFish(quality) {
    const p = this.player;
    if (!p.fish) return;
    const rod = ITEMS[p.fish.rodId] || {};
    const rareMul = p.fish.rareMul === undefined ? 1 : p.fish.rareMul;
    const baited = p.removeItem('raw_meat', 1);
    /* 낚시 숙련 — 상위 어종 확률과 "잡것" 확률을 함께 밀어 올린다.
       6레벨 '깊은 눈'은 그 위에 심해어 쪽으로 한 번 더 기운다(아래 표에서 쓴다). */
    const flv = p.profLv('fish');
    const fishBonus = (rod.fishBonus || 0) + (baited ? 0.20 : 0) + (quality === 'reel' ? 0.12 : 0) + (flv - 1) * 0.02;
    const itemChance = clamp(((rod.fishItemChance || 0) + (baited ? 0.08 : 0) + (quality === 'reel' ? 0.05 : 0) + (flv - 1) * 0.015) * rareMul, 0, 0.85);
    // ★ 자리를 지우기 **전에** 튀긴다 — p.fish 가 null 이 되면 어디서 걷었는지 모른다
    this.fishSplash(p.fish, quality === 'reel' ? 14 : 7);
    this.sfx('splash');
    p.fish = null;
    p.addProf('fish', 1);

    /* 실패 — 오래 기다린 만큼 놓칠 수도 있어야 긴장이 생긴다.
       입질을 흘려보내면(auto) 대부분 놓치고, 제때 챔질하면(reel) 어쩌다 놓친다.
       좋은 낚싯대는 놓치는 일이 덜하다(fishBonus를 그대로 쓴다). */
    const missBase = quality === 'reel' ? 0.12 : 0.55;
    const miss = clamp(missBase - (rod.fishBonus || 0) * 0.5 - (baited ? 0.05 : 0), 0.04, 0.75);
    if (this.rng.chance(miss)) {
      this._fishLost(quality === 'reel'
        ? this.rng.chance(0.5) ? '챘지만 바늘이 빠졌다' : '줄이 끊겼다'
        : '입질을 흘렸다 — 미끼만 털렸다');
      return;
    }

    if (this.rng.chance(itemChance)) {
      // 1단계 통과 — 물고기 말고 다른 것. 흔한 몹 전리품(사실상 잡템)부터 장신구까지
      /* ★ 빼지 않고 **더한다**. 잡템(젤·뼈)이 대부분인 것이 낚시가 "가끔 뭔가 나온다"로
         느껴지는 밑바탕이라 그대로 두고, 그 위에 아주 가끔 걸리는 것을 얹는다.
         낚싯대·미끼·챔질·숙련이 그 칸을 굵게 만든다(아래 lucky). */
      /* ★ 물에서 올라오는 것이 세션마다 다르다. 원래 것은 셋만 남기고 (슬라임 젤·치유 물약·에테르 파편) 나머지를 물에서만 나오는 일곱으로 바꿨다.
           세션 1  물때 진주 · 가라앉은 주화 · 등불 치어 · 물비늘
           세션 2  물먹은 전지 · 냉각액 병 · 삭은 봉돌
         낚시꾼의 매듭만 양쪽에 걸쳐 있다.
         사연: docs/code-history.md#h43 */
      const lucky = (flv - 1) * 0.9 + fishBonus * 6;   // 0 ~ 대략 12
      const s2 = sessionOf(this.chapter).id >= 2;      // 세션 2 이후인가
      const itemTable = [
        // --- 원래 있던 것 셋. 여전히 대부분은 이쪽이다 ---
        ['slime_gel', 34], ['potion_hp', 20], ['aether_shard', 12],
        // --- 물에서만 나오는 일곱. 세션에 따라 무게가 갈린다 ---
        ['river_scale', s2 ? 3 : 16],
        ['tide_pearl', s2 ? 4 : 9 + lucky * 0.5],
        ['lantern_fry', s2 ? 2 : 8 + lucky * 0.4],
        ['sunken_coin', s2 ? 2.5 : 4 + lucky * 0.5],
        ['rust_sinker', s2 ? 16 : 1.5],
        ['drowned_cell', s2 ? 10 + lucky * 0.4 : 0],
        ['coolant_vial', s2 ? 7 + lucky * 0.4 : 0],
        /* --- 물에서만 나오는 무기 셋 · 장신구 셋 ---
           재료로는 못 만든다. 낚아야만 나오므로 낚싯대를 드는 데 이유가 생긴다.
           무기는 근접·원거리·마법으로 갈라 어느 갈래를 키우든 하나는 제 것이 된다. */
        ['spear_tide', s2 ? 0 : 0.30 + lucky * 0.10],
        ['bow_reed', s2 ? 0 : 0.30 + lucky * 0.10],
        ['staff_current', s2 ? 0 : 0.26 + lucky * 0.09],
        ['charm_float', s2 ? 0 : 0.22 + lucky * 0.08],
        ['ring_ripple', s2 ? 0 : 0.22 + lucky * 0.08],
        ['amul_scale', s2 ? 0 : 0.20 + lucky * 0.07],
        ['harpoon_cool', s2 ? 0.30 + lucky * 0.10 : 0],
        ['gun_pressure', s2 ? 0.26 + lucky * 0.09 : 0],
        ['staff_deluge', s2 ? 0.24 + lucky * 0.09 : 0],
        ['charm_conden', s2 ? 0.22 + lucky * 0.08 : 0],
        ['ring_sluice', s2 ? 0.22 + lucky * 0.08 : 0],
        ['amul_undertow', s2 ? 0.20 + lucky * 0.07 : 0],
        // --- 어느 물에서든 드물다 ---
        ['knot_angler', 0.35 + lucky * 0.15]
      ];
      const catchId = this.rng.weighted(itemTable);
      const stackN = {
        slime_gel: [2, 5], aether_shard: [1, 2],
        river_scale: [2, 4], tide_pearl: [1, 2], rust_sinker: [1, 3],
        drowned_cell: [1, 2], sunken_coin: [1, 1]
      }[catchId];
      const n = stackN ? this.rng.int(stackN[0], stackN[1]) : 1;
      const it = isGear(makeItem(catchId)) ? rollGear(catchId, this.rng, 0) : makeItem(catchId, n);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
      /* 한 번 낚으면 기억에 남아야 하는 것 — 물에서만 나오는 무기·장신구 전부와
         값나가는 셋. 여기 들면 연출이 커지고 숙련도 세 배로 붙는다. */
      const rare = isGear(makeItem(catchId))
        || ['knot_angler', 'sunken_coin', 'tide_pearl'].includes(catchId);
      if (rare) {
        // 이런 건 한 번 낚으면 기억에 남아야 한다
        this.toast(`물속에서 무언가 딸려 올라왔다 — ${itemName(it)}`, 'good');
        this.burst(p.cx, p.cy - 4, 'stargain', 52, 2.0);
        this.ringFx(p.cx, p.cy, 60, '#7fc8e8', .5);
        this.sfx('level');
      } else {
        this.toast(`뭔가 걸렸다 — ${itemName(it)}${n > 1 ? ' ×' + n : ''}`, 'good');
        this.sfx('open');
      }
      p.addProf('fish', rare ? 3 : 1);          // 빈 바늘보다 건진 쪽이 더 는다
      UI.refreshBag();
      return;
    }

    /* 물고기 자체도 세션마다 다르게 올라온다.
       세션 2의 물은 공창에서 흘러나온 냉각수라 얕은 물고기가 줄고 깊은 것이 늘었다 —
       "같은 낚싯대인데 세션 2에서는 심해어가 곧잘 나온다"가 손에 잡히도록. */
    const s2fish = sessionOf(this.chapter).id >= 2;
    const table = [
      ['none', Math.max(6, (s2fish ? 22 : 26) - fishBonus * 30)],
      ['fish_common', s2fish ? 30 : 44],
      ['fish_silver', (s2fish ? 24 : 16) + fishBonus * 26],
      ['fish_deep', ((s2fish ? 15 : 7) + fishBonus * 30) * (flv >= 6 ? 2.2 : 1)]
    ];
    const catchId = this.rng.weighted(table);
    if (catchId === 'none') { this.toast(baited ? '미끼만 사라졌다' : '빈 바늘만 올라왔다', 'bad'); UI.refreshBag(); return; }
    // 10레벨 '물때를 안다' — 가끔 한 마리가 더 딸려 온다
    const n = (flv >= PROF_MAX && this.rng.chance(0.25)) ? 2 : 1;
    const it = makeItem(catchId, n);
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    this.toast(`낚았다 — ${itemName(it)}${n > 1 ? ' ×' + n : ''}`, 'good');
    p.addProf('fish', 1);                      // 빈 바늘보다 건진 쪽이 더 는다
    this.sfx('open');
    UI.refreshBag();
  },
  findObjAt(wx, wy) {
    /* 내가 놓은 설치물부터 본다. 두 가지 이유가 있다.
       1) 이 함수는 objects 배열 **순서대로 첫 번째**를 집는데, 세계가 처음부터 놓아 둔
          물건(게시판·문 등)이 먼저 들어 있다. 그 앞에 상자를 놓으면 상자는 영영 안
          잡혀서 열 수도, 곡괭이로 걷어낼 수도 없었다.
       2) 상자 그림(18×16)은 한 칸(22)보다 작아 칸 위쪽을 찍으면 빗나간다 — 그림이
          아니라 **차지한 칸**으로 잡아야 "보이는 대로" 집힌다. */
    const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    for (const o of this.world.objects) {
      if (!o.placed || !OBJ_SIZE[o.type]) continue;
      const x0 = Math.floor(o.x / TS), x1 = Math.floor((o.x + o.w - 1) / TS);
      const y1 = Math.floor((o.y + o.h - 1) / TS);
      const y0 = y1 - ((OBJ_SIZE[o.type].th || 1) - 1);
      if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) return o;
    }
    for (const o of this.world.objects) {
      if (o.type === 'furniture') continue;   // 순수 장식물 — 상호작용 대상이 아니다
      if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
    }
    return null;
  },
  interact(o) {
    if (o.type === 'chest') {
      /* ★ 암호 골방의 상자는 그 유적의 암호문이 풀린 뒤에만 열린다. 상호작용은
         사거리(7칸)만 보고 시야는 안 보므로, 골방 바깥 벽에 붙어 **벽 너머로 상자만
         열고** 갈 수 있었다. 껍질을 두 겹으로 늘려 거리로도 막았지만(world.js),
         지형이 조금만 달라져도 다시 뚫린다 — 자물쇠는 상자 자신이 들어야 확실하다. */
      if (o.codeRuin && !this.ruinCodeDone(o.codeRuin)) {
        this.toast('상자에 손이 닿지 않는다 — 골방 문을 먼저 열어야 한다', 'bad');
        return;
      }
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
        // 그 유적에서만 나오는 재료 — 흔한 자원(bonus)과 나란히 넣는다
        if (o.bonus2 && ITEMS[o.bonus2]) o.items.push(makeItem(o.bonus2, this.rng.int(2, 4)));
        this.pulseChest(o, tx, ty);      // 맥박이 뛰는 유적의 상자 — 덤을 얹고 맥박을 올린다
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
      /* 보스가 달린 상자 — 잡몹 지킴이(o.guard)와 달리 하나가 제대로 깨어난다.
         떠 있는 섬의 황금 상자가 이것이다. 한 번 깨우면 다시 깨지 않는다(o.woke). */
      if (o.boss && !o.woke) {
        o.woke = 1;
        this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 80);
        this.toast('상자를 열자 섬이 흔들렸다', 'bad');
        this.shake = 20;
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
    } else if (o.type === 'ciphernote') {
      this.readCipherNote(o);
    } else if (o.type === 'mystic') {
      this.useMystic(o);
    } else if (o.type === 'vault') {
      UI.openVault(); this.sfx('open');
    } else if (o.type === 'board') {
      UI.openBoard(); this.sfx('open');
    } else if (o.type === 'reforge') {
      UI.openReforge(); this.sfx('open');
    } else if (o.type === 'anvil') {
      UI.openAnvil(); this.sfx('open');
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
      /* 닫을 때 문틀 안에 누가 서 있으면 닫히지 않는다 — 닫힌 문은 길을 막으므로
         제자리에서 닫으면 제 몸이 벽에 낀다(빠져나갈 길이 없다). */
      if (!o.closed && aabb({ x: o.x, y: o.y, w: o.w, h: o.h }, this.player.rect())) {
        this.toast('문틀에서 비켜야 닫힌다', 'bad'); return;
      }
      o.closed = !o.closed;
      this.sfx(o.closed ? 'door_shut' : 'door_open');
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
      t: `(${eulreul(ITEMS[give].n)} 뽑아낸다)`, quest: 1, fn: () => {
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
        t: `(금화 ${fmt(cost)}개를 던진다)`, quest: 1, fn: () => {
          UI.closeDialogue();
          p.gold -= cost;
          p.addBuff('wish');
          const mx = o.x + o.w / 2, my = o.y + o.h * 0.55;
          for (let i = 0; i < 16; i++) this.parts.push(new Part(mx, my, '#ffd85a', -40, 0.9));
          this.toast('분수의 축복 — 잠시 운이 따른다', 'good');
          this.sfx('coin');
        }
      });
    else lines.push(`동전을 던지려면 금화 ${fmt(cost)}개가 필요하다.`);
    UI.openLore('여명의 분수', lines, choices);
  },

  /** 여관 — 금화를 내고 아침까지 잔다. 체력·마나 회복 + 「잘 쉼」 */
  innCost() { return Math.round((40 + this.player.level * 12) * this.costMul() * (this.villageLv() >= 2 ? 0.7 : 1)); },
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
          this.tally = this.tally || {};
          this.tally.inn = (this.tally.inn || 0) + 1;
          this.checkAch();
        }
      }
    ]);
  },

  /* ================= 의뢰의 목표 =================
     의뢰(게시판)와 부탁(사람)이 같은 세 목표를 쓴다 — 잡기·모으기·캐기.
     ★ 둘 다 **받은 순간부터 센다**(그전에 잡아 둔 것으로 끝나면 의뢰가 아니라 정산이다).
       받을 때의 수를 start 에 적고 그 뒤의 몫만 본다. */
  objStart(o) {
    const p = this.player;
    if (o.type === 'kill') return p.kills[o.target] || 0;
    if (o.type === 'collect') return p.gathered[o.item] || 0;
    if (o.type === 'mine') return p.mined[o.tile] || 0;
    return 0;
  },
  objSince(o, start) {
    const cur = clamp(this.objStart(o) - start, 0, o.n);
    return { cur, max: o.n, done: cur >= o.n };
  },
  /* ================= 의뢰 · 부탁의 값 =================
     게시판과 부탁을 한 셈으로 매긴다.
       ① ★ 경험치는 **그 레벨의 필요 경험치를 기준으로**. 레벨업에 드는 것이 40·lv^1.42 이므로 그 45%를 한 건값으로 잡으면 한 장이 어느 레벨에서나
          "레벨의 절반쯤"으로 읽힌다.
       ② 일의 무게로 0.8~1.25배 보정. 무게는 그 일로 그냥 얻는 경험치가 한 레벨의 몇
          배인가로 잰다 — 그대로 더하면 후반 한 장이 세 레벨어치가 되어 게시판이 사냥을
          대신한다. 보정에 그쳐야 한다.
       ③ 금화는 레벨에 1차. 잡기는 상대가 떨구는 것의 1/4, 모으기·캐기는 물건값의 절반.
     ★ 값은 **저장하지 않고 그때그때 센다.** 굳혀 두면 레벨이 올라도 옛 값을 받는다.
     사연: docs/code-history.md#h44 */
  QUEST_PAY: {
    need: 0.45,               // 경험치 = 그 레벨 필요치의 몇 할
    tMin: 0.8, tMax: 1.25,    // 일의 무게 보정 폭
    g0: 300, gL: 110,         // 금화 레벨 몫
    killG: 0.25,              // 잡은 것이 떨구는 금화 중 얹는 몫
    matG: 0.5,                // 모으고 캔 것의 값 중 얹는 몫
    floor: 1.25,              // 옛 값의 이 배수 아래로는 안 내려간다
    side: 0.75                // 부탁 한 건은 게시판 한 장의 4분의 3 (게시판은 하루 석 장뿐이다)
  },
  MAT_VAL: 12,                // 재료 기본값 — price() 는 시세를 타서 값이 흔들린다
  xpNeed(lv) { return 40 * Math.pow(lv, 1.42); },
  questPay(obj, mul) {
    const Q = this.QUEST_PAY, lv = Math.max(1, this.player.level), m = mul || 1;
    const k = m * obj.n / (BOUNTY_UNIT[obj.type] || 12);
    const need = this.xpNeed(lv);
    const e = obj.type === 'kill' ? (ENEMIES[obj.target] || { gold: 0, xp: 0 }) : null;
    const t = e ? clamp(e.xp * obj.n / need, Q.tMin, Q.tMax) : 1;
    let gold = (Q.g0 + Q.gL * lv) * k;
    if (e) gold += e.gold * obj.n * Q.killG * m;
    else {
      const id = obj.type === 'collect' ? obj.item : (TILE_DEF[obj.tile] || {}).drop;
      gold += (id ? (ITEM_VAL[id] || this.MAT_VAL) : 0) * obj.n * Q.matG * m;
    }
    return {
      gold: Math.round(Math.max(gold, (160 + 55 * lv) * k * Q.floor)),
      xp: Math.round(Math.max(Q.need * need * k * t, (90 + 40 * lv) * k * Q.floor))
    };
  },
  /** 게시판 한 장의 값. 이미 떼어 간 종이는 그때 받은 값을 그대로 보여 준다. */
  bountyPay(b) {
    if (!b) return { gold: 0, xp: 0 };
    if (b.paid) return b.paid;
    if (!b.obj) return { gold: b.gold || 0, xp: b.xp || 0 };   // 아주 옛 저장
    return this.questPay(b.obj, b.mul === undefined ? 1 : b.mul);
  },
  /** 부탁 하나의 값. 표에 적힌 값보다 낮아지지는 않는다. */
  sidePay(sq) {
    const p = this.questPay(sq.obj, this.QUEST_PAY.side), r = sq.rw || {};
    return { gold: Math.max(p.gold, r.gold || 0), xp: Math.max(p.xp, r.xp || 0) };
  },

  /** 목표를 한 줄로 — "무덤지기 12마리" */
  objLabel(o) {
    if (o.type === 'kill') return `${ENEMIES[o.target].n} ${o.n}${mobCw(o.target)}`;
    if (o.type === 'collect') return `${ITEMS[o.item].n} ${o.n}개`;
    if (o.type === 'mine') return `${TILE_DEF[o.tile].n} ${o.n}번`;
    return '';
  },

  /* ---- 의뢰 게시판 ----
     하루마다 석 장. BOUNTY_POOL 에서 **지금 장에서 받을 수 있는 것**만 붙고,
     끝낸 종이에 뒷이야기(next)가 있으면 다음 날 그것이 붙는다. */
  bountyFits(t, ch) {
    return t && (!t.s || t.s === sessionOf(ch).id) && ch >= t.ch[0] && ch <= t.ch[1];
  },
  makeBounty(t, r) {
    const obj = t.obj(r, this.chapter);
    return {
      id: t.id, title: t.title, from: t.from, body: t.body,
      obj, start: this.objStart(obj), done: 0, mul: t.rw || 1,
      doneLine: t.done, next: t.next || '', items: t.items || null
    };
  },
  rollBounties() {
    const r = new RNG(this.world.seed + '_b' + this.dayCount);
    const ch = this.chapter || 0;
    const out = [];
    const take = t => {
      if (!t || out.length >= 3 || out.some(b => b.id === t.id)) return;
      out.push(this.makeBounty(t, r));
    };
    /* ① 어제 끝낸 것의 뒷이야기부터. 아직 못 받는 장이면 붙을 때까지 들고 있는다 */
    const keep = [];
    for (const id of (this.bountyNext || [])) {
      const t = BOUNTY_BY_ID[id];
      if (this.bountyFits(t, ch) && out.length < 3) take(t); else if (t) keep.push(id);
    }
    this.bountyNext = keep;
    // ② 나머지는 오늘 붙을 수 있는 것 중에서
    const pool = BOUNTY_POOL.filter(t => !t.pin && this.bountyFits(t, ch));
    while (out.length < 3 && pool.length) take(pool.splice(r.int(0, pool.length - 1), 1)[0]);
    this.bounties = out;
  },
  bountyProgress(b) {
    /* 옛 저장(잡을 것 하나만 적혀 있던 시절)도 읽을 수 있게 둔다 */
    if (!b.obj) return { cur: 0, max: b.n || 1, done: false };
    return this.objSince(b.obj, b.start);
  },
  claimBounty(i) {
    const b = this.bounties[i]; if (!b || b.done) return;
    if (!this.bountyProgress(b).done) { this.toast('아직 다 하지 못했다', 'bad'); return; }
    const p = this.player, pay = this.bountyPay(b);
    b.done = 1; b.paid = pay;          // 떼어 간 뒤에도 종이에 받은 값이 남는다
    p.addXp(pay.xp); p.gold += pay.gold;
    for (const [id, n] of (b.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 1);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    }
    /* 뒷이야기는 오늘 바로 붙지 않는다 — 다음에 게시판이 갈릴 때 붙는다.
       그래야 "끝냈더니 다음 날 답장이 와 있었다"로 읽힌다. */
    if (b.next && !(this.bountyNext || []).includes(b.next)) {
      this.bountyNext = (this.bountyNext || []).concat(b.next);
    }
    this.toast(`의뢰 완료: ${b.title} — 경험치 ${fmt(pay.xp)} · 금화 ${fmt(pay.gold)}`, 'good');
    UI.refreshBoard(); UI.refreshBag(); this.sfx('manycoins');
  },

  /* ---- 강화: 장비 수치를 한 단계씩 올린다 (여명 교역지 4단계, 강화 모루) ----
     재련과 **역할이 겹치지 않게** 짰다. 재련은 접사를 다시 굴리는 도박이고,
     강화는 실패가 없는 대신 값이 가파르게 오르는 축적이다. 둘 다 도박이면
     같은 감정이 두 번 나오고, 재련이 설 자리가 없어진다.
     그래서 강화는 **공격력·방어력만** 올린다 — 부가 스탯까지 건드리면 접사와
     구분이 흐려져 결국 재련과 같은 물건이 된다. */
  ENH_MAX: 10,
  /* 실패 확률 — 낮은 단계는 **반드시 성공한다.** 처음부터 실패가 뜨면 "값이 가파른
     대신 확실한 길"이라는 강화의 성격이 흐려지고, 재련(도박)과 구분이 안 된다.
     4단계부터 붙고 단계마다 5%p씩 올라 10단계 직전이 30%다.
     실패해도 **단계가 내려가지는 않는다** — 값을 잃는 것으로 충분하고, 쌓은 것까지
     깎으면 상한을 노릴 이유가 사라진다. */
  enhFail(e) { return e < 3 ? 0 : Math.min(0.30, (e - 2) * 0.05); },
  /** 단계마다 갈아타는 재료 — 무엇을 캐러 갈 때인지가 재료로 드러난다 */
  enhMat(e) {
    return e < 3 ? { id: 'iron_bar', n: 2 + e }
      : e < 6 ? { id: 'steel_plate', n: 2 + e }
        : e < 9 ? { id: 'mythril_bar', n: 2 + e }
          : { id: 'abyss_core', n: e - 6 };
  },
  enhCost(it) {
    const e = it.e || 0;
    return Math.round((this.price(it) * 0.5 + 300 * this.costMul()) * (1 + e * 0.6));
  },
  enhanceSlot(i) {
    const p = this.player, it = p.bag[i];
    if (!it || !isGear(it)) { this.toast('장비만 강화할 수 있다', 'bad'); return; }
    const d = idef(it);
    if (!d.dmg && !d.def) { this.toast('공격력도 방어력도 없는 것은 벼릴 데가 없다', 'bad'); return; }
    const e = it.e || 0;
    if (e >= this.ENH_MAX) { this.toast('더 두들길 데가 없다', 'bad'); return; }
    const cost = this.enhCost(it), mat = this.enhMat(e);
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    if (!p.hasAll({ [mat.id]: mat.n })) { this.toast(`${ITEMS[mat.id].n} ${mat.n}개가 필요하다`, 'bad'); return; }
    p.gold -= cost; p.removeItem(mat.id, mat.n);
    if (Math.random() < this.enhFail(e)) {
      this.toast(`${itemName(it)} — 결이 어긋났다. 단계는 그대로다`, 'bad');
      for (let k = 0; k < 12; k++) this.parts.push(new Part(p.cx, p.cy, '#8a8a96', -30, 0.6));
      this.shake = Math.max(this.shake, 3);
      UI.refreshAnvil(); UI.refreshBag(); this.sfx('damage');
      return;
    }
    it.e = e + 1;
    this.toast(`${itemName(it)} — 한 겹 더 두들겼다`, 'good');
    for (let k = 0; k < 18; k++) this.parts.push(new Part(p.cx, p.cy, '#ff9a3a', -50, 0.7));
    p.recalc();
    UI.refreshAnvil(); UI.refreshBag(); UI.refreshEquip(); this.sfx('craft');
  },

  /* ---- 재련: 금화를 내고 장비의 접사를 다시 굴린다 ---- */
  reforgeCost(it) { return Math.round((this.price(it) * 0.8 + 120 * this.costMul()) * (this.villageLv() >= 3 ? 0.75 : 1)); },
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
      /* ★ 암호 단서는 흔적에 얹지 않는다 — 흔적표(RUIN_HINTS)가 없는 유적에 골방을
         세우면 단서가 아예 안 나온다('겹친 길'의 암호는 실제로 풀 방법이 없었다).
         단서는 골방을 세우는 쪽이 흩뿌리는 쪽지(ciphernote)가 든다. */
      UI.openLore(h[0], h[1], []);
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

  /* ================= NPC ==========    this.sfx('talk');
  },

  /** 사람마다 다른 기능 선택지 (가게·수련·여관·재련 …)
      ★ 가게는 이름을 적어 두지 말고 NPCS 의 shop 을 그대로 본다 — 리카만 적혀 있던
        시절에는 케이드가 shop 을 들고도 열 방법이 없었다. */
  talkExtra(id) {
    const cs = [];
    if (NPCS[id].shop) cs.push({ t: '물건을 보여 달라', fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    if (id === 'trainer') {
      cs.push({ t: `스탯 재분배 · 🪙 ${fmt(this.respecCost())}`, fn: () => { UI.closeDialogue(); this.respecStats(); } });
      cs.push({ t: `수련 · 🪙 ${fmt(this.trainCost())} · 오늘 ${this.trainedToday}/5`, fn: () => { UI.closeDialogue(); this.trainXp(); } });
    } else if (id === 'haran') {
      cs.push({ t: '방을 잡는다', fn: () => { UI.closeDialogue(); this.useInn(); } });
    } else if (id === 'seira') {
      cs.push({ t: '장비를 다시 벼려 달라', fn: () => { UI.closeDialogue(); UI.openReforge(); } });
    } else if (NPCS[id].dynamicShop) {
      cs.push({ t: '오늘 실은 것을 보자', fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    }
    /* 볼일이 둘 이상이면 한 줄로 묶는다 — 교관은 일곱 줄이 깔려 정작 무슨 말을 할지가
       안 보였다. 하나뿐이면 묶지 않는다(한 줄을 두 번 누르게 만드는 꼴이다). */
    return cs.length > 1 ? [{ t: '볼일이 있다', sub: cs }] : cs;
  },

  talkTo(id) {
    this.talked = this.talked || {};
    const first = !this.talked[id];
    this.talked[id] = true;
    if (DAWN_NPCS.includes(id)) { this.talkVillager(id, first); return; }

    const story = this.storyOf(id, this.chapter) || [''];
    this.storyHeard = this.storyHeard || {};
    const fresh = this.storyHeard[id] !== this.chapter;   // 이 장의 이야기를 아직 안 들었다
    this.storyHeard[id] = this.chapter;

    /* 첫 대면에는 상황 한 줄을 붙이지 않는다 — 인사보다 먼저 날씨 얘기를 꺼내는
       사람은 없다. 그 뒤로는 이야기 뒤에(또는 이야기 없이) 오늘이 붙는다.
       (순번도 이때는 돌리지 않는다. 그래야 다음 대화에서 첫 말부터 들린다) */
    const pick = (first && this.chapter === 0) ? null : this.talkPick(id);
    const lines = fresh ? story.slice() : [];
    if (pick) lines.push(pick.say);
    if (!lines.length) lines.push(story[story.length - 1]);

    const rest = [];
    /* 이야기를 이미 들은 뒤에는 다시 듣는 길을 남겨 둔다 — 놓친 줄이 있을 수 있으니까 */
    if (!fresh) rest.push({ t: '다시 듣기', replay: 1, fn: () => {
      UI.closeDialogue();
      UI.openDialogue(id, story.slice(), rest);
      this.sfx('talk');
    } });
    rest.push(...this.talkExtra(id));
    if (SIDE_POOL[id]) rest.push({
      t: this.sideActive[id] ? '의뢰에 대해 묻는다' : '부탁할 일이 있는지 묻는다',
      quest: 1, fn: () => { UI.closeDialogue(); this.sideTalk(id); }
    });
    rest.push({ t: '지금 무엇을 해야 하지?', quest: 1, fn: () => { UI.closeDialogue(); this.tellQuest(); } });
    if (id === 'elara' && this.chapter === 0) rest.push({ t: '(여정을 시작한다)', quest: 1, fn: () => { UI.closeDialogue(); } });
    UI.openDialogue(id, lines, this.talkMenu(id, pick, rest));
    this.sfx('talk');
  },

  /** 그 사람이 이 장에 할 이야기. 표가 짧으면 마지막 칸을, 빈 칸이면 없음 */
  storyOf(id, ch) {
    const a = DIALOGUE[id];
    if (!a || !a.length) return null;
    /* 세션 3에서 처음 만나는 사람은 대사 묶음이 15장부터 시작한다 — 앞에 빈 칸 열다섯 개를 채워 넣을 수는 없으니, NPCS[id].from(첫 등장 장)만큼 빼서
       센다.
       사연: docs/code-history.md#h45 */
    const from = (NPCS[id] && NPCS[id].from) || 0;
    return a[clamp(ch - from, 0, a.length - 1)] || null;
  },

  /* ---- 여명 마을 주민 (종장 이후에만 세계에 존재한다) ---- */
  talkVillager(id, first) {
    const d = NPCS[id];
    /* ★ 여명 마을 다섯도 캠프 넷과 같은 식으로 장마다 한 번씩 이야기를 한다. 서명 한 줄과
       마을 단계 대사만 들고 있던 시절에는, 장 카드에서 가장 많이 말하는 케이드가 정작
       만나면 늘 같은 한 줄만 했다. 이미 들었으면 다시 듣는 길을 남긴다. */
    const story = this.storyOf(id, this.chapter);
    this.storyHeard = this.storyHeard || {};
    const fresh = !!story && this.storyHeard[id] !== this.chapter;
    if (story) this.storyHeard[id] = this.chapter;
    /* 그 사람을 처음 만나는 자리에서만 서명 같은 한 줄을 듣는다 — 매번 앞에 두면 열 번 말 걸어 열 번 같은 말이 된다. */
    const pick = (first || fresh) ? null : this.talkPick(id);
    const lines = [];
    if (first) lines.push(d.line);
    if (fresh) lines.push(...story);
    if (pick) lines.push(pick.say);
    /* 마을이 한 단계 자랐으면 그 사실을 한 번 알려 준다 — 매번이 아니라 바뀐 그때. */
    this.villageSeen = this.villageSeen || {};
    const lv = this.villageLv(), vt = VILLAGE_TALK[id];
    if (vt && vt[lv] && this.villageSeen[id] !== lv) { lines.push(vt[lv]); this.villageSeen[id] = lv; }
    if (!lines.length) lines.push(story ? story[story.length - 1] : d.line);
    const rest = this.talkExtra(id);
    if (story && !fresh) rest.push({ t: '다시 듣기', replay: 1, fn: () => {
      UI.closeDialogue();
      UI.openDialogue(id, story.slice(), rest);
      this.sfx('talk');
    } });
    /* 마을 주민에게도 부탁을 받는다 — 이 다섯에게만 부탁이 없으면 도시가 사람이 사는
       곳이 아니라 상점가로 보인다. */
    if (SIDE_POOL[id]) rest.push({
      t: this.sideActive[id] ? '맡은 일에 대해 묻는다' : '도울 일이 있는지 묻는다',
      quest: 1, fn: () => { UI.closeDialogue(); this.sideTalk(id); }
    });
    /* 마을 주민에게도 길을 물을 수 있다 — 세션 2는 대부분의 시간을 여기서 보낸다. */
    rest.push({ t: '지금 무엇을 해야 하지?', quest: 1, fn: () => { UI.closeDialogue(); this.tellQuest(); } });
    UI.openDialogue(id, lines, this.talkMenu(id, pick, rest));
    this.sfx('talk');
  },

  /* ---- 사이드 퀘스트 ---- */
  sideProgress(sq) { return this.objSince(sq.obj, sq.start); },
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
    /* 값을 먼저 알려 준다 — 고를 수 있는 것이 "한다·안 한다"뿐이라 값을 모르면 고를 수가 없다. */
    const pay = this.sidePay(tpl);
    UI.openDialogue(npcId, [`${tpl.desc}\n(보상은 🪙 ${fmt(pay.gold)} · 경험치 ${fmt(pay.xp)})`], [
      { t: '(수락한다)', quest: 1, fn: () => { this.acceptSideQuest(npcId, tpl); UI.closeDialogue(); } },
      { t: '(다음에 하겠다)', fn: () => UI.closeDialogue() }
    ]);
  },
  acceptSideQuest(npcId, tpl) {
    this.sideActive[npcId] = Object.assign({}, tpl, { start: this.objStart(tpl.obj) });
    this.toast(`부탁을 맡았다: ${tpl.title}`, 'good');
    UI.refreshQuest(); UI.refreshTracker();
  },
  completeSideQuest(npcId) {
    const sq = this.sideActive[npcId]; if (!sq) return;
    const p = this.player, pay = this.sidePay(sq);
    p.addXp(pay.xp); p.gold += pay.gold;
    for (const [id, n] of (sq.rw.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 1);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    }
    this.sideDone[npcId] = (this.sideDone[npcId] || 0) + 1;
    delete this.sideActive[npcId];
    this.toast(`부탁 완료: ${sq.title} — 경험치 ${fmt(pay.xp)} · 금화 ${fmt(pay.gold)}`, 'good');
    UI.refreshQuest(); UI.refreshTracker(); UI.refreshBag();
    this.sfx('manycoins');
  },
  tellQuest() {
    const ch = CHAPTERS[this.chapter];
    if (!ch) { this.toast('모든 여정이 끝났다.'); return; }
    const st = this.chapterState(ch);
    const session = sessionOf(this.chapter).n;
    if (st.complete) this.toast('할 일은 모두 끝냈다.');
    else if (st.ready) this.toast(`${session} · 목표 — ${st.goal ? st.goal.o.t : '이 장의 마지막'}`);
    else {
      // 아직 준비 중이면 고유 동사 쪽을 먼저 알려 준다 — 그게 이 장의 이야기다
      const pick = st.basics.find(b => !b.p.done && st.missing.includes(b.o.verb))
                || st.basics.find(b => !b.p.done);
      this.toast(`${session} · 준비 ${st.done}/${st.need}` + (pick ? ` · ${pick.o.t} (${pick.p.cur}/${pick.p.max})` : ''));
    }
    UI.togglePanel('quest');
  },
  /* ---- 경제: 화폐 가치와 품목별 시세가 하루 단위로 변동한다 ---- */
  updateEconomy() {
    this.goldRate = clamp((this.goldRate || 1) + (this.rng.next() - 0.5) * 0.14, 0.7, 1.4);
    this.market = {};   // 품목별 시세는 필요할 때(marketRate) 그날 시드로 다시 뽑는다
  },
  /* ---- 떠돌이 상인 재고 ----
     날마다 한 번 굴린다. 난수는 marketRate와 같은 방식으로 **그날 시드**에서 뽑는다 —
     같은 날 다시 불러와도 재고가 달라지지 않게 하려는 것. 다만 굴린 뒤에는 세이브에
     남긴다(산 물건이 빠진 상태를 기억해야 하므로 파생값으로 둘 수 없다). */
  merchantOf(npc) { return MERCHANTS.find(m => m.npc === npc); },

  /** 장비상 후보 — 지금 플레이어가 들 수 있는 것만 고른다. 고정 목록으로 두면
      레벨이 오를수록 죽은 재고가 되고, 전부 적어 두면 초반에 못 드는 것만 뜬다. */
  equipPool(spec) {
    const lim = this.player.level + (spec.lvSlack || 0);
    const out = [];
    for (const id in ITEMS) {
      const d = ITEMS[id];
      if (!spec.types.includes(d.type)) continue;
      if (SHOP_DENY.has(id)) continue;
      const req = equipReqLv(id);
      if (req > lim) continue;
      // 너무 낮은 것만 잔뜩 뜨지 않게, 레벨이 가까울수록 가중치를 준다
      const gap = lim - req;
      out.push({ id, w: gap <= 4 ? 6 : gap <= 10 ? 3 : 1, max: 1 });
    }
    return out;
  },

  /** 한 상인의 오늘 재고. 없으면 그 자리에서 굴린다. */
  stockOf(npc) {
    const m = this.merchantOf(npc); if (!m) return [];
    if (this.shopStockDay !== this.dayCount) { this.shopStock = {}; this.shopStockDay = this.dayCount; }
    if (!this.shopStock[npc]) {
      const r = new RNG(this.world.seed + '_shop_' + npc + '_' + this.dayCount);
      /* 재고 후보 거르기 — 세션(스토리 진행)과 마을 단계 둘 다 본다.
         sess: 그 세션에 들어서야 유통되는 물건(세션 3 지역 산물 등)
         vlv:  마을이 그 단계가 되어야 들어오는 물건(4단계 교역지에서 물건이 좋아진다) */
      const sess = sessionOf(this.chapter);
      /* 마을 단계(vlv) 조건은 **마을 상인에게만** 건다. 윤슬처럼 마을 밖에 있는 상인은
         마을을 안 열어도 만나므로, 그 조건을 그대로 태우면 재고가 통째로 비어 버린다
         (실제로 그랬다 — 마을이 0단계인 세계에서 좌판이 텅 비었다). */
      const vlv = m.spot ? this.villageLv() : 99;
      const bag = (m.pool ? m.pool.filter(e => (e.sess || 1) <= sess && (e.vlv || 1) <= vlv)
                          : this.equipPool(m.equip));
      // 4단계(교역지)가 되면 마을 상인 셋만 재고 칸이 한 칸씩 늘어난다
      const slots = m.slots + (m.spot && this.villageLv() >= 4 ? 1 : 0);
      const picked = [];
      // 가중치 뽑기 — 뽑은 것은 후보에서 빼서 같은 물건이 두 칸 차지하지 않게 한다
      for (let k = 0; k < slots && bag.length; k++) {
        let total = 0;
        for (const e of bag) total += e.w;
        let t = r.next() * total, idx = 0;
        for (; idx < bag.length; idx++) { t -= bag[idx].w; if (t <= 0) break; }
        const e = bag.splice(Math.min(idx, bag.length - 1), 1)[0];
        const max = e.max || 1;
        /* 반드시 makeItem으로 만든다.
           사연: docs/code-history.md#h46 */
        picked.push(makeItem(e.id, max > 1 ? 1 + Math.floor(r.next() * max) : 1, 0));
      }
      this.shopStock[npc] = picked;
    }
    // 예전 저장본에 등급 없는 재고가 남아 있으면 여기서 메운다 (값이 NaN이 되지 않게)
    for (const it of this.shopStock[npc]) if (it && it.r === undefined) it.r = 0;
    return this.shopStock[npc];
  },
  /** 떠돌이 상인에게서 산다 — 재고에서 실제로 덜어 낸다(고정 상점의 buy와 다른 점) */
  buyStock(npc, slotIdx) {
    const p = this.player, m = this.merchantOf(npc), stock = this.stockOf(npc);
    const row = stock[slotIdx]; if (!row || !m) return;
    const it = makeItem(row.id, row.c, 0);
    const cost = this.buyPrice(it, m.markup);
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    if (!p.addItem(it)) { this.toast('가방이 가득 찼다', 'bad'); return; }
    p.gold -= cost;
    stock.splice(slotIdx, 1);            // 하나뿐인 재고다 — 사면 그날은 끝
    this.toast(`${ITEMS[row.id].n} 구매`, 'good');
    UI.refreshChest(); UI.refreshBag(); this.sfx('coin');
    this.tradeDone();
  },
  marketRate(id) {
    if (!(id in this.market)) {
      const r = new RNG(this.world.seed + '_m' + this.dayCount + '_' + id);
      this.market[id] = 0.85 + r.next() * 0.3;   // 품목별 0.85~1.15
    }
    return this.market[id] * (this.goldRate || 1);
  },
  /* 상점에서 **사는** 값. price()는 물건의 값어치(팔 때 기준이기도 하다)라서,
     여기에 배수를 얹지 않으면 되팔기로 금화를 찍어 낼 수 있다. 그래서 사는 쪽에만
     붙인다 — 재련비(reforgeCost)도 price()를 그대로 써야 하므로 여기서 갈라 둔다. */
  SHOP_BUY_MUL: 6,
  buyPrice(it, markup, npc) {
    /* 값이 고정된 물건은 가게 배수도 상인 웃돈도 안 붙인다 — 조련사에게 사는 알이
       늘 10,000 / 30,000 / 100,000 이어야 한다. */
    if (idef(it).fixed) return this.price(it);
    // disc — 그 상인만의 할인(베이스캠프 보린). 캠프는 장사하는 자리가 아니다
    const disc = (npc && NPCS[npc] && NPCS[npc].disc) || 1;
    return Math.max(1, Math.round(this.price(it) * this.SHOP_BUY_MUL * (markup || 1) * disc));
  },
  price(it) {
    const d = idef(it);
    /* 값은 data.js 의 ITEM_VAL 이 한 벌로 매긴다 — 재료는 어디서 나오는지로, 만드는
       것은 재료값으로, 못 만드는 장비는 필요 레벨로. 아래 옛 어림은 표에 없는 물건을
       위한 그물로만 남겨 둔다. */
    let base = ITEM_VAL[it.id];
    if (base !== undefined) { /* 표가 정한다 */ }
    else if (d.price) base = d.price;
    else if (d.type === 'weapon') base = 60 + (d.tier || 0) * 90;
    else if (d.type === 'armor') base = 40 + (d.def || 0) * 12;
    else if (d.type === 'acc') base = 220;
    else if (d.type === 'tool') base = 80 + (d.power || 1) * 70;
    else if (d.type === 'consum') base = 22;
    else if (d.type === 'block') base = 2;
    else base = 12;
    const raw = base * (it.c > 1 ? it.c : 1) * RARITY_MULT[it.r] * this.marketRate(it.id);
    return Math.max(1, Math.round(raw));
  },
  /** 가게가 한 번에 파는 묶음 크기. 쌓이는 물건은 5개씩 묶어 팔지만, 값이 고정된
      물건(알)은 **낱개**로 판다 — 안 그러면 창에 10,000이 아니라 50,000이 뜬다. */
  shopBundle(id) { return ITEMS[id].fixed ? 1 : (ITEMS[id].stack > 1 ? 5 : 1); },
  buy(id, npc) {
    const p = this.player;
    const it = makeItem(id, this.shopBundle(id), 0);
    const cost = this.buyPrice(it, 1, npc);
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    if (!p.addItem(it)) { this.toast('가방이 가득 찼다', 'bad'); return; }
    p.gold -= cost;
    this.toast(`${ITEMS[id].n} 구매`, 'good');
    UI.refreshChest(); UI.refreshBag(); this.sfx('coin');
    this.tradeDone();
  },

  /* ---- 미니보스 둥지 ----
     제단과 달리 소환 아이템이 필요 없다. 방에 들어서서 둥지를 건드리면 깨어나고,
     한 번 잡으면 다시 깨지 않는다. 처치 여부는 세이브에 남는다. */
  wakeLair(o) {
    this.lairs = this.lairs || {};
    // 바이옴 유적의 빈 둥지는 메아리 시련 자리다(RUIN_SPEC 의 여섯만 — 나머지 둥지는 그대로 빈다)
    if (this.lairs[o.ruin] && RUIN_SPEC[o.ruin] && RUIN_SPEC[o.ruin].id) { this.openEcho(o); return; }
    if (this.lairs[o.ruin]) { this.toast('이미 비어 있다'); return; }
    if (this.boss) { this.toast('이미 무언가가 깨어 있다', 'bad'); return; }
    if (this.bossGated(o.boss)) return;
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
  /** 이 장의 결전 보스인데 아직 자격이 없으면 막는다 — 소환 아이템만으로 깨울 수 있으면
      장 목표를 통째로 건너뛴다. 다른 장의 보스는 그대로 자유롭게 깨운다. */
  bossGated(bossId) {
    const ch = CHAPTERS[this.chapter];
    if (!ch || !ch.goal || ch.goal.type !== 'boss' || ch.goal.target !== bossId) return false;
    const st = this.chapterState(ch);
    if (st.ready) return false;
    this.toast(this.goalLocked(ch, st), 'bad');
    return true;
  },
  altar(o) {
    const p = this.player;
    const need = Object.keys(ITEMS).find(k => ITEMS[k].boss === o.boss);
    if (this.boss) { this.toast('이미 무언가가 깨어 있다', 'bad'); return; }
    if (this.bossGated(o.boss)) return;
    // 소환 아이템이 아예 없는 보스라면 제단이 아니라 둥지로 다뤄야 한다.
    // 사연: docs/code-history.md#h47
    if (!need) { this.wakeLair({ boss: o.boss, ruin: 12, nm: '제단', x: o.x, y: o.y, w: o.w, h: o.h }); return; }
    if (p.countItem(need) <= 0) { this.toast(`${iga(ITEMS[need].n)} 필요하다`, 'bad'); return; }
    p.removeItem(need, 1);
    this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 60);
    UI.refreshBag();
  },
  useSummon(slot) {
    const p = this.player, it = p.bag[slot];
    const bossId = idef(it).boss;
    if (this.boss) { this.toast('이미 무언가가 깨어 있다', 'bad'); return; }
    if (this.bossGated(bossId)) return;
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
    /* 스토리 보스는 수치를 고정한다. scale() 은 플레이어의 진행도를 따라 커지는
       값이라, 늦게 온 사람일수록 결전이 더 두꺼워지고 페이즈가 지루해졌다.
       필드·미니보스는 그대로 scale() 을 탄다(그쪽은 "지나가다 만난 것"이라 맞다). */
    const e = new Enemy(id, x, y, STORY_BOSSES[id] ? 1 : this.scale() * 0.9);
    this.ents.push(e); this.boss = e;
    this.toast(`${iga(ENEMIES[id].n)} 깨어났다!`, 'bad');
    this.shake = 16;
    // 등장 효과음을 따로 두지 않고 보스 브금이 바로 치고 들어오게 한다
    if (window.Music) Music.play('boss', true);
  },
  onBossDown(id) {
    this.boss = null;
    this.pulseBossDown();          // 유적 주인 · 메아리 — 맥박을 가라앉히고 보상을 준다
    // 둥지에서 깨운 것이라면 그 둥지를 비운 것으로 남긴다
    if (this.pendingLair !== undefined && this.pendingLair !== null) {
      this.lairs = this.lairs || {};
      this.lairs[this.pendingLair] = 1;
      this.pendingLair = null;
    }
    this.toast(`${ENEMIES[id].n} 토벌!`, 'good');
    UI.bossBar(null);
  },
  /* 몹의 세기는 **스토리 진행(장)만** 따라간다.
     ★ 플레이어 레벨은 넣지 않는다 — 레벨을 올릴수록 세상이 같이 세지면 "강해진 느낌"이
       사라진다. 레벨은 내 쪽만 세게 만든다.
     ★ 장별 상승폭 0.09 — 9장 1.81배 · 마지막 장(17) 2.53배. 0.22 로 올리면 마지막 장이
       4.74배가 되어 "스토리를 미는 것이 곧 벌"이 된다.
     경험치·금화도 같은 배수를 쓰므로, 레벨을 올려도 몹의 보상이 부풀지 않는다. */
  scale() { return 1 + this.chapter * 0.09; },
  /** 난이도가 몹의 체력·공격력에만 곱하는 값. 경험치·금화는 건드리지 않는다. */
  modeMul() { return MODE_OF(this.mode).mul; },

  /* ================= 소비 / 제작 ================= */
  useConsumable(slot) {
    const p = this.player, it = p.bag[slot], d = idef(it);
    if (d.use.egg) { this.hatchEgg(d.use.egg); it.c--; if (it.c <= 0) p.bag[slot] = null; UI.refreshBag(); this.sfx('hatch'); return; }
    /* 펫 사탕 — 낀 펫이 없으면 그냥 사라지므로, 쓰기 전에 막아 준다 */
    if (d.use.petXp) {
      if (!p.equip.pet1 && !p.equip.pet2) { this.toast('펫을 끼고 있어야 준다', 'bad'); return; }
      p.addPetXp(d.use.petXp);
      it.c--; if (it.c <= 0) p.bag[slot] = null;
      UI.refreshBag(); this.sfx('drink'); return;
    }
    // instant(치유·마나 물약)는 공유 재사용 대기시간을 아예 안 걸고 안 본다 —
    // 음식·물고기 등 나머지 회복 소비품끼리는 여전히 potionCd를 공유한다
    /* 맥박을 움직이는 것(고요의 물약 · 맥박 북) — 유적 밖에서는 쓰지 않고 그대로 둔다 */
    if (d.use.pulse) {
      if (!this.pulseHere) { this.toast('유적 안에서만 듣는다', 'bad'); return; }
      this.addPulse(this.pulseHere, d.use.pulse, true);
      this.toast(d.use.pulse < 0 ? '유적의 맥박이 가라앉는다' : '유적이 북소리에 뒤척인다', d.use.pulse < 0 ? 'good' : 'bad');
      it.c--; if (it.c <= 0) p.bag[slot] = null;
      UI.refreshBag(); this.sfx(d.use.pulse < 0 ? 'drink' : 'chapter');
      return;
    }
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
  /** 거래 한 건 — 사든 팔든 한 번. 업적 「첫 거래」·「단골」이 이 값을 본다. */
  tradeDone() {
    this.tally = this.tally || {};
    this.tally.trade = (this.tally.trade || 0) + 1;
    this.checkAch();
  },
  sellItem(slot) {
    const p = this.player, it = p.bag[slot];
    if (!it) return;
    if (it.lk) { this.toast('잠긴 물건은 팔 수 없다 (Ctrl+좌클릭으로 해제)', 'bad'); return; }
    const price = Math.round(this.price(it) * 0.5 * this.villageTrade());
    p.gold += price;
    this.toast(`${itemName(it)} 판매 — 🪙 ${fmt(price)}`, 'good');
    p.bag[slot] = null;
    UI.refreshBag(); UI.refreshChest(); this.sfx('coin');
    this.tradeDone();
  },

  /* ================= 펫 =================
     펫은 도감이 아니라 장비 아이템이다 — 알을 깨면 펫 아이템이 나오고 장비창의 펫 슬롯
     두 칸에 끼운다. 같은 펫이 또 나와도 버릴 이유가 없어 중복 환불 처리도 필요 없다. */
  hatchEgg(tier) {
    const p = this.player;
    const id = this.rng.weighted(EGG_POOL[tier]);
    const it = makeItem('pet_' + id, 1);
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    this.toast(`${eulreul(PETS[id].n)} 얻었다! (장비창의 펫 칸에 끼울 수 있다)`, 'good');
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
  /* 세션이 넘어가면 금화가 도는 규모 자체가 달라진다(세션 2에서 상자·판매 수입이
     크게 뛴다). 마을 서비스 값이 그대로면 후반에 사실상 공짜가 되므로, 비용을 한
     배수로 묶어 두고 세션마다 올린다. 세션 3 값은 그 지역 수입이 잡히면 조정할 것 —
     지금은 세션 2의 두 배로 잡아 두었다. */
  costMul() { return [1, 1, 3.2, 7][sessionOf(this.chapter)] || 1; },
  respecCost() { return Math.round((60 + this.player.level * 25) * this.costMul()); },
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
  trainCost() { return Math.round((40 + this.trainedToday * 60) * this.costMul()); },
  trainXp() {
    const p = this.player;
    if (this.trainedToday >= 5) { this.toast('오늘은 더 가르칠 게 없다고 한다', 'bad'); return; }
    const cost = this.trainCost();
    if (p.gold < cost) { this.toast('금화가 부족하다', 'bad'); return; }
    p.gold -= cost; this.trainedToday++;
    const xp = Math.round(p.xpNext * 0.18);
    p.addXp(xp);
    this.toast(`수련으로 경험치 +${fmt(xp)}`, 'good');
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
    if (lv >= VILLAGE.length - 1) { this.toast('더 올릴 단계가 없다', 'bad'); return; }
    const spec = VILLAGE[lv + 1], p = this.player;
    if (!p.hasAll(spec.need)) { this.toast('재료가 부족하다', 'bad'); return; }
    for (const k in spec.need) p.removeItem(k, spec.need[k]);
    this.world.upgradeVillage(lv + 1);
    while (this.vault.length < this.vaultCap()) this.vault.push(null);
    /* 2단계에서 씨앗·괭이·낫을 가방에 바로 꽂아 주던 것을 없앴다.
       이제 그 한 벌은 밭 자리 울타리 옆 씨앗 상자에 들어 있다(world.js).
       가방에 저절로 생기는 것과 걸어가서 여는 것은 다르다 — 후자여야
       그 자리가 "내가 손댈 곳"으로 읽힌다. */
    if (lv + 1 === 2) this.toast('마을 서쪽에 땅을 내주었다 — 울타리 옆 상자에 연장과 씨앗이 있다', 'good');
    this.toast(`마을이 『${spec.n}』${josa(spec.n, '이', '가')} 되었다`, 'good');
    for (let i = 0; i < 40; i++) this.parts.push(new Part(p.cx + (Math.random() - .5) * 200, p.cy, '#ffe08a', -70, 1.2));
    UI.chapterCard({ sub: '마을 개선', title: spec.n, line: spec.d });
    UI.refreshBag(); this.sfx('chapter');
  },
  /* 마을 단계가 주는 혜택 — 여러 곳에서 쓰이므로 한군데 모아 둔다 */
  vaultCap() { const lv = this.villageLv(); return VAULT_SIZE + (lv >= 2 ? 12 : 0) + (lv >= 4 ? 12 : 0); },
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
    if (lv >= STATION_UP[kind].length) { this.toast('더 손볼 데가 없다', 'bad'); return; }
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
    this.checkAch();
    this.toast(`${ITEMS[r.out].n} 제작 완료`, 'good');
    UI.refreshCraft(); UI.refreshBag(); this.sfx('craft');
  },

  /* ================= 광역 피해 ================= */
  /** 폭발/타격 이펙트 등록 (kind: hit / fire / void / stargain / starmerge)
      slow: 재생을 늘리는 배수(기본 1 = 여섯 프레임 0.24초).
      타격은 짧아야 손맛이 나지만, 이야기의 한 순간은 그 속도로는 읽히지도 않는다. */
  burst(x, y, kind, size, slow) {
    if (!this.spritesOn) return;
    (this.bursts = this.bursts || []).push({ x, y, kind, s: size || 64, t: 0, sp: slow || 1 });
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

  /* ================= 특성 연출 =================
     입자만으로는 무슨 일이 일어났는지 안 보이는 스킬(번개가 어디로 튀었는지, 별이 어디에
     떨어질지)을 위한 셋 — 퍼지는 고리 · 튀는 번개 · 떨어질 자리 예고. 전부 선으로만 그린다. */
  /** 보스가 페이즈를 넘기며 던지는 한 줄. 대화창을 열면 싸움이 끊기므로
      화면 아래쪽에 잠깐 얹기만 한다(입력을 막지 않는다). */
  bossLine(who, text) {
    this.bossSay = { who, text, t: 3.2 };
  },

  /** 퍼져 나가는 고리. aoe 와 달리 피해가 없다 — 순수하게 보이기 위한 것 */
  /** 세계를 s초만큼 멈춘다(겹치면 긴 쪽). 0.12초를 넘기면 끊긴 것으로 보인다 */
  hitStop(s) { this.stopT = Math.min(0.12, Math.max(this.stopT || 0, s || 0)); },

  /* ★ 입력을 삼키면 안 된다. 재사용 대기 중에 조용히 return 하면, 눌렀는데 안 나간
     것인지 키가 안 먹은 것인지 구별할 수가 없다. 짧은 막힌 소리와 칸이 한 번 흔들리는
     것으로 "받았고, 안 된다"를 돌려준다. */
  skillDeny(slot, msg) {
    this.sfx('sk_deny');
    const el = document.querySelectorAll('#skillbar .sk')[slot];
    if (el) { el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); }
    if (msg) this.toast(msg, 'bad');
  },

  ringFx(x, y, r, c, life) {
    this.rings = this.rings || [];
    this.rings.push({ x, y, r, t: life || 0.3, max: life || 0.3, c });
  },
  /** 두 점을 잇는 번개. 마디마다 어긋나게 꺾어 한 번씩 다르게 보이도록 */
  boltFx(x0, y0, x1, y1, c) {
    this.bolts = this.bolts || [];
    const seg = 7, pts = [];
    for (let i = 0; i <= seg; i++) {
      const k = i / seg, j = i === 0 || i === seg ? 0 : (Math.random() - 0.5) * 26;
      const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * k + nx / L * j, y0 + (y1 - y0) * k + ny / L * j]);
    }
    this.bolts.push({ pts, t: 0.22, max: 0.22, c });
  },
  /** 떨어질 자리 예고 — 차오르는 원. 피할 시간을 눈으로 보여 준다 */
  warnFx(x, y, r, dur, c) {
    this.warns = this.warns || [];
    this.warns.push({ x, y, r, t: dur, max: dur, c });
  },

  /* ---- 특별한 스킬의 고유 연출 (SIG_FX) ----
     ★ 한 배열에 모아 두고 **두 번** 그린다. band·sigil·flash 는 적보다 먼저(아래에
       깔려 아무것도 안 가린다), fall 은 적보다 나중에(하늘에 있으니 위가 맞다).
       수명을 깎는 것은 앞쪽 한 곳뿐이다 — 두 곳에서 깎으면 두 배로 빨리 사라진다. */
  sigFx(o) { (this.sigs = this.sigs || []).push(o); },
  /** 유성 화살비가 떨어질 띠. 실제 퍼지는 폭(±130)을 그대로 보여 준다 */
  bandFx(x, y, hw, dur, c) { this.sigFx({ k: 'band', x, y, hw, t: dur, max: dur, c }); },
  /** 소환 문양 — 안으로 조여드는 고리. 이 게임의 다른 고리는 모두 퍼진다(반대라 바로 읽힌다) */
  sigilFx(x, y, r, c) { this.sigFx({ k: 'sigil', x, y, r, t: SIG_FX.wolf.t, max: SIG_FX.wolf.t, c }); },
  /** 하늘에서 떨어지는 별. 예고만 있고 정작 떨어지는 것이 안 보였다 */
  fallFx(x, y, dur, c) { this.sigFx({ k: 'fall', x, y, t: dur, max: dur, c }); },
  /** 착탄 섬광. 알파를 SIG_FX.flash.a 로 묶어 두어 적이 흰 바닥에 묻히지 않는다 */
  flashFx(x, y, r, c) { this.sigFx({ k: 'flash', x, y, r, t: SIG_FX.flash.t, max: SIG_FX.flash.t, c }); },
  /** 화면 테두리가 한 번 물든다. 전체를 덮으므로 짧게, 그리고 '화면 효과' 설정을 따른다.
      ★ 색은 'r,g,b' 로 받는다 — 'transparent' 에서 색으로 잇는 그라디언트는 가운데가
        **검게** 지나가서(투명의 속살이 검정이다) 붉은 대신 그을음이 낀 것으로 보였다. */
  edgeFx(rgb, dur) { this.edge = { rgb, t: dur, max: dur }; },

  /** '화면 효과' 설정(0~150%)을 1을 넘지 않게 돌려준다 — 0%면 화면을 덮는 연출이 없다 */
  fxScale() { return Math.min(1, (this.settings ? this.settings.shake : 100) / 100); },

  /* ================= 스폰 ================= */
  /* 개조가 걸리는 구역 — 세션 1 바이옴의 지층들. 유적(ruin)은 그 유적의 장식에서
     나온 몹이 따로 있고, 하늘·공창 계열(sky·works·runaway·atelier·citadel·
     deepshaft)은 애초에 세션 2 것이라 뺀다. */
  MECH_ZONE: { surface: 1, cave: 1, deep: 1, corrupt: 1, ice: 1, hell: 1, jungle: 1, glowfen: 1 },

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
      case 'sea': return [];                 // 바다는 trySpawnWater만 채운다
      // 해변 — 물 밖으로 밀려 나온 것들. 밤에는 서리 쪽에서 내려온 것도 섞인다
      case 'beach': return night ? ['driftling', 'driftling', 'glacier_stalker', 'zombie']
        : ['driftling', 'driftling', 'ashcrow', 'arctic_hare'];
      case 'ice': {
        /* 빙하 지대(세션 3)는 서리 지대와 같은 'ice' 구역 태그를 쓰지만 몹이 다르다.
           흙 한 겹 없이 얼음만 쌓인 곳이라 미끄러져 달려드는 것과 덩어리째 굴러오는 것뿐이다. */
        const glacier = tx !== undefined && this.world.biomeAt(clamp(tx, 0, WW - 1)).id === 'glacier';
        if (glacier) return night ? ['glacier_stalker', 'crevasse_maw', 'glacier_stalker', 'icewolf']
          : ['glacier_stalker', 'crevasse_maw', 'frostling', 'arctic_hare'];
        return night ? ['frostling', 'icewolf', 'zombie'] : ['frostling', 'icewolf', 'slime', 'arctic_hare', 'arctic_hare'];
      }
      case 'hell': return ['imp', 'golem', 'lavaslug', 'imp'];
      case 'sky': return ['gale', 'sky_sentry', 'cloudjelly', 'gale'];
      case 'ruin': {
        /* 유적마다 매긴 무리(RUIN_SPEC[].mobs)를 쓴다 — 셋으로 다 같으면 어디를 들어가도
           같은 곳처럼 느껴진다. 석판 유적과 심층 봉인실은 RUIN_SPEC 에 없어 옛 표를 쓴다. */
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
      // --- 새 바이옴. 밤에는 구성이 바뀐다 ---
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
    const bio = w.biomeAt(tx).id;
    if (e.biome && bio !== e.biome) return false;
    /* 그 바이옴에서만 안 오는 날씨 — 비는 지상 어디에나 오지만 사막에는 안 온다.
       zones 의 'surface' 에 사막도 들어 있어서 사구에 빗줄기가 내렸다. */
    if (e.notBiome && e.notBiome.indexOf(bio) >= 0) return false;
    const z = w.zoneAt(tx, Math.floor(p.cy / TS));
    return e.zones.indexOf(z) >= 0;
  },
  updateEvents(dt) {
    const night = this.dayT < 5 * 60 || this.dayT > 19 * 60;
    const phase = (this.dayCount * 2) + (night ? 1 : 0);
    /* 운석은 이벤트(this.event)와 따로 굴린다 — 비·붉은 달이 오는 중에도 떨어질 수 있다.
       불러온 직후의 국면은 굴리지 않는다(같은 국면을 다시 굴려 같은 운석이 또 떨어지는 것을 막는다). */
    if (this.meteorRolled === undefined) this.meteorRolled = phase;
    if (this.meteorRolled !== phase) {
      this.meteorRolled = phase;
      if (!this.meteor && new RNG(this.world.seed + '_meteor' + phase).chance(this.METEOR.chance)) this.startMeteor();
    }
    if (this.event) {
      this.event.t += dt;
      // 국면이 끝나면 이벤트도 끝난다. 비처럼 낮/밤 구분이 없는 이벤트는 dur(지속 시간)로 대신 끊는다
      const e = EVENTS[this.event.id];
      if ((e.night && !night) || (e.day && night) || (e.dur && this.event.t >= e.dur)) {
        this.toast(`${e.i} ${iga(e.n)} 지나갔다`);
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
      if (e.notBiome && e.notBiome.indexOf(biome) >= 0) continue;
      if (!r.chance(e.chance)) continue;
      this.event = { id, t: 0 };
      this.toast(`${e.i} ${e.n} — ${e.d}`, 'bad');
      this.sfx('boss');
      break;
    }
  },
  /* ================= 잿빛이 숲을 먹는다 =================
     장이 넘어갈수록 잎과 풀에서 색이 빠지고 잎이 한 칸씩 진다. 1장의 숲과 8장의 숲이
     달라야 이야기가 어디로 가든 세계가 가만히 있는 것으로 안 보인다.

     ★ 타일을 **부수지 않는다.** 그릴 때만 잿빛 판을 겹친다(TileArt.buildAsh). 칸을
       실제로 지우면 저장이 장마다 달라지고, 9장에서 잿빛이 걷힐 때 되돌릴 방법이 없다.
     ★ 어느 잎이 먼저 지는가는 **자리로 정해져 있다**(tileHash). 매 프레임 뽑으면 화면이
       지글거리고 카메라를 움직일 때마다 다른 잎이 사라진다.
     ★ 풀(GRASS)은 지지 않고 색만 빠진다 — 고체 타일이라 사라지면 발밑에 구멍이 뚫린
       것처럼 보인다. 9장에서 0으로 한 번에 돌아간다. */
  /* 잿빛에 먹히는 칸과 그 세기.
       shed  잿빛이 깊어질 때 **칸째로 지는** 비율의 상한 (0 이면 색만 빠진다)
       fade  이 칸에 잿빛이 얼마나 세게 드는가. 1 이 잿빛 숲이다.
       thin  칸 **안쪽**이 성글어지는 세기(성근 판으로 넘어가는 속도). 눈 지대는 소나무(PINELEAF)라 여기에 없다 — 늘푸른 잎이라 장이 넘어가도 안 진다.
     사연: docs/code-history.md#h48 */
  ASH_TILE: {
    [T.LEAF]: { shed: 0.82, fade: 1 },
    [T.FLOWER]: { shed: 0.95, fade: 1 },
    [T.WEED]: { shed: 0.70, fade: 1 },
    [T.GRASS]: { shed: 0, fade: 1 },
    [T.JUNGLELEAF]: { shed: 0.22, fade: 0.62, thin: 0.35 },
    [T.FERN]: { shed: 0.30, fade: 0.62 },
    [T.ORCHID]: { shed: 0.35, fade: 0.62 },
    [T.JUNGLEGRASS]: { shed: 0, fade: 0.62 }
  },
  ASH_BURNT: 0.30,          // 진 잎자리 중 타다 만 잎이 남는 비율
  /* 풀 갓이 바래는 규칙 (drawAshTile 의 !shed 갈래).
       EDGE  문턱을 넘고 나서 다 물들기까지의 폭 — 번지는 가장자리다. 0 이면 칸이
             초록에서 회색으로 **딱** 갈려 바둑판처럼 보인다.
       MIN   막 물들기 시작한 칸의 바램 정도. 0 부터 올리면 문턱 언저리 칸이 거의
             안 보여서 "수가 늘었다"가 안 읽힌다. */
  ASH_GRASS_EDGE: 0.16,
  ASH_GRASS_MIN: 0.40,

  /** 잎 칸의 변형(=가지 방향)을 줄기 쪽을 보고 고른다.
      0 왼쪽에서 · 1 오른쪽에서 · 2 아래에서 · 3 좌우로 지나감(수관 속).
      줄기에 안 닿은 칸은 3번이라 가로 가지가 이어져 수관에 뼈대가 생긴다. */
  pickLeafV(w, tx, ty) {
    /* ★ **바로 옆 칸만** 본다. 두 칸까지 넓히면 수관 한 줄에 서너 칸이 다 가지를 달아
       같은 높이의 가로 막대가 줄줄이 생긴다(살창처럼 보인다). */
    if (w.get(tx - 1, ty) === T.WOOD) return 0;
    if (w.get(tx + 1, ty) === T.WOOD) return 1;
    if (w.get(tx, ty + 1) === T.WOOD) return 2;
    return 3;
  },

  /** 잿빛에 먹히는 칸 한 장. 성한 판과 잿빛 판을 서로 반대 투명도로 겹쳐 색이 빠지는
      과정을 잇고, 자리마다 정해진 몫(r)을 잿빛이 넘어서면 0.2 구간에 걸쳐 진다 —
      한 장에서 우수수 사라지지 않고 하나씩 빠진다. */
  drawAshTile(c, id, v, sx, sy, tx, ty, ashF0) {
    const spec = this.ASH_TILE[id];
    const ashF = ashF0 * spec.fade;      // 지형마다 드는 세기가 다르다 (정글은 절반)
    const solid = ashF > 0.98;
    const pair = (a) => {     // 같은 그림의 성한 판·잿빛 판을 a 만큼 겹쳐 그린다
      if (!solid) { c.globalAlpha = (1 - ashF) * a; TileArt.draw(c, id, v, sx, sy); }
      c.globalAlpha = ashF * a; TileArt.drawAsh(c, id, v, sx, sy);
    };

    if (!spec.shed) {
      /* 풀 칸 — **흙은 건드리지 않고 초록 갓만** 바랜다(tileart.js buildCapAsh).

         장이 깊어질 때 두 가지가 같이 자란다.
           ① 물든 **칸의 수** — 칸마다 문턱이 다르고(자리 해시) 잿빛이 그 문턱을 넘으면
              그 칸이 물들기 시작한다. 그래서 군데군데 먼저 세다가 번져 나간다.
           ② 물든 칸의 **바램 깊이** — 처음 물든 칸도 단번에 회색이 되지 않는다.

         ★ 한 값(ashF)으로 화면 전체를 똑같이 덮으면 안 된다. 그러면 풀밭이 한 장의
           색판처럼 통째로 밝아졌다 어두워져서, 잿빛이 **번지는** 것이 아니라 조명이
           바뀌는 것으로 보인다. 자리마다 문턱을 달리해야 "여기부터 물들었다"가 읽힌다.
         ★ 문턱은 자리로 정해 둔다 — 매 프레임 뽑으면 카메라를 움직일 때마다 물든
           칸이 바뀌어 풀밭이 지글거린다(잎이 지는 쪽과 같은 이유). */
      TileArt.draw(c, id, v, sx, sy);                     // 흙까지 성한 판이 늘 바닥
      const on = clamp((ashF - tileHash(tx + 31337, ty + 6151)) / this.ASH_GRASS_EDGE, 0, 1);
      if (on > 0) {
        c.globalAlpha = on * (this.ASH_GRASS_MIN + (1 - this.ASH_GRASS_MIN) * ashF);
        TileArt.drawCapAsh(c, id, v, sx, sy);
      }
      c.globalAlpha = 1;
      return;
    }

    const gone = clamp((ashF * spec.shed - tileHash(tx + 7919, ty + 104729)) / 0.2, 0, 1);
    if (gone < 1) {
      /* 칸째로 지는 것만으로는 수관이 성글어지는 게 잘 안 보인다 — 남은 칸은
         끝까지 처음처럼 빽빽하기 때문이다. 그래서 **칸 안쪽 밀도**도 같이
         떨군다. 성근 판(잎덩이 15개 → 6개)을 깔고 그 위에서 성한 판을 걷는다.
         성근 판이 성한 판의 부분집합이라(같은 씨앗) 남은 잎만 정확히 사라진다. */
      const keep = 1 - gone;
      /* ★ 밀도 세 단계 — 빽빽 → 성근1 → 성근2(거의 앙상). 성근 판이 한 장뿐이던
         시절에는 1장 숲이 이미 9% 성글고 8장 숲도 14% 잎이 남아, 잿빛이 깊어지는 것이
         수관에서 안 보였다. 이제 1장은 온전히 빽빽하고 8장은 거의 가지만 남는다.
           d = 잿빛 깊이 0~1 · t1 = 빽빽→성근1(전반) · t2 = 성근1→성근2(후반)
         세 판이 서로 부분집합이라 겹쳐 놓고 위엣것을 걷으면 남은 잎만 사라진다. */
      const canThin = TileArt.thinAtlas && LEAF_TWIG[id];
      if (canThin) {
        const d = clamp((ashF - 0.10) / 0.80, 0, 1) * (spec.thin || 1);
        const t1 = clamp(d * 2, 0, 1), t2 = clamp(d * 2 - 1, 0, 1);
        const plate = (lv, a) => {
          if (a <= 0) return;
          if (!solid) { c.globalAlpha = (1 - ashF) * a; TileArt.drawThin(c, id, v, sx, sy, 0, lv); }
          c.globalAlpha = ashF * a; TileArt.drawThin(c, id, v, sx, sy, 1, lv);
        };
        plate(1, keep);                       // 바탕 — 가장 성근 판
        plate(0, keep * (1 - t2));            // 그 위에 성근1
        if (t1 < 1) pair(keep * (1 - t1));    // 그 위에 빽빽한 본판
      } else pair(keep);
    }
    /* 진 잎자리의 30%에는 타다 만 잎이 남는다. 전부 흔적 없이 사라지면 나무가 그냥
       앙상해지기만 하는데, 잿빛은 잎을 태워 없앤 것이므로 탄 자리가 보여야 한다.
       지는 것과 반대 투명도로 얹어, 잎이 빠지는 그 자리에서 그대로 검게 눌어붙는다. */
    if (gone > 0 && id === T.LEAF && tileHash(tx + 104729, ty + 7919) < this.ASH_BURNT) {
      c.globalAlpha = gone; TileArt.drawBurnt(c, v, sx, sy);
    }
    c.globalAlpha = 1;
  },

  /** 지금 잿빛이 얼마나 깊은가 (0 = 아직 색이 있다, 1 = 다 빠졌다) */
  /** 숲 원경의 잿빛 깊이(0=푸른 숲 · 1=죽은 나무만). 장이 지날수록 짙어진다.
      이제 서장부터 마지막 장까지 **한 방향으로** 짙어진다.
      ★ 상한 0.88 — 1.0(원본, 죽은 나무만)까지 보내지 않는다. 끝까지 밀면 원경이
        잿빛 벽 한 장이 되어 능선도 나무도 안 읽힌다. 짙어지되 어두워지지는 않게.
      사연: docs/code-history.md#h49 */
  ashF() {
    const last = Math.max(1, CHAPTERS.length - 1);
    const ch = clamp(this.chapter || 0, 0, last);
    return clamp(0.10 + (ch / last) * 0.78, 0.10, 0.88);
  },

  /* ================= 용광로 굴뚝 연기 =================
     · 한 덩이가 사는 동안 시트 여섯 장을 지난다 — 올라가는 내내 **모양이 바뀐다**
     · 위 칸이 막히면 그 아래에 멎어 옆으로 번진다(오를 수 있는 높이를 따로 안 정한다)
     · ★ 화면 근처 용광로만 뱉는다. 마을·캠프·플레이어가 놓은 것이 다 합쳐지면 세계에
       여럿이라, 거리로 먼저 거르지 않으면 안 보이는 곳에서 계속 쌓인다 */
  /* ================= 채취탑 — 세션 2 에 다시 도는 대형 기계 =================
     ★ 배경은 배경이어야 한다. 세 대로 줄이고, 사정권을 5칸으로 좁히고, 간격도 늦춰 탑 바로 밑에서만 들리게 했다. 부딪히지 않고(판정 없음) 피해도 주지 않으며,
       야영지·마을 근처에는 안 선다.
     사연: docs/code-history.md#h50 */
  /* ★ 설 자리를 **바이옴 이름으로** 묻는다. 주석에는 "숲 왼끝·오른끝"이라고 적혀 있는데 실제로 선 자리는 **서리 지대 둘과 메마른 사구 하나**였고, 사막 한 대는
       하필 피라미드 지붕 위였다. 세션 2 를 미리 흘리려고 세션 1 숲에 세운 것인데 정작 숲에 없었던 셈이다. 이름으로 물으면 세계가 또 늘어나도 따라온다
       (CLAUDE.md §1-5).
     사연: docs/code-history.md#h51 */
  RIG_IN: [['forest', 2], ['forest2', 1]],   // [바이옴 id, 몇 대]
  RIG_EDGE: 40,             // 바이옴 경계에서 이만큼은 떨어뜨린다
  RIG_THUD: 4.6,            // 쿵 간격(초)
  RIG_NEAR: 5 * 22,         // 쿵이 들리는 거리(px) — 탑 바로 밑
  /* 그림 배율. 1.0 은 260px(약 12칸) — 주인공 키의 여섯 배라 배경이 아니라 건물로
     읽혔다. 0.66 이면 172px(약 8칸), 주인공의 네 배다. 다리 사이 너비도 84 → 55px
     (2.5칸)로 줄어 숲 나무 사이에 들어간다. ★ 굴뚝 자리(연기가 나오는 곳)도 같은
     값으로 줄여야 한다 — updateSmoke 참고. */
  RIG_SCALE: 0.66,
  RIG_TOP: 256,             // 굴뚝 꼭대기(배율 1일 때 y)
  RIG_LEG: 2,               // 다리가 딛는 반폭(칸) — 이 안은 지면이 **똑같아야** 한다

  /** 채취탑 자리. 세계가 정해지면 한 번만 고르고 캐시한다. */
  rigs() {
    if (this._rigs) return this._rigs;
    const w = this.world;
    if (!w) return [];
    const out = [];
    const LEG = this.RIG_LEG;
    for (const [bid, n] of this.RIG_IN) {
      const b = BIOMES.find(q => q.id === bid);
      if (!b) continue;
      const x0 = b.x0 + this.RIG_EDGE, x1 = b.x1 - this.RIG_EDGE;
      for (let i = 0; i < n; i++) {
        // 띠를 n 등분한 가운데를 노리고, 거기서 바깥으로 훑어 평평한 자리를 찾는다
        const aim = Math.round(x0 + (x1 - x0) * (i + 0.5) / n);
        let at = null;
        for (let d = 0; d <= 120 && at === null; d++) {
          for (const tx of (d ? [aim - d, aim + d] : [aim])) {
            if (tx < x0 || tx > x1) continue;
            const s = w.surface[tx];
            const z = w.zoneAt(tx, s);
            if (z === 'camp' || z === 'village' || z === 'ruin') continue;   // 쉬는 자리는 비워 둔다
            /* ★ 유적은 **지붕 위도** 피한다. zoneAt 은 유적 상자 안에 들어와야 'ruin'
               이라, 지표에서 물으면 피라미드·얼음 신전 꼭대기가 그냥 'surface' 로
               나온다 — 사막 한 대가 실제로 피라미드 지붕에 서 있었다. */
            if (w.ruins && w.ruins.some(r => Math.abs(tx - r.x) <= (r.w >> 1) + LEG + 2)) continue;
            /* 다리가 딛는 칸(±LEG)은 **한 칸도 어긋나면 안 된다.** 그 바깥은 1칸까지 봐준다(받침이 아니라 배경).
               사연: docs/code-history.md#h52 */
            let flat = true;
            for (let k = -LEG; k <= LEG && flat; k++) if (w.surface[tx + k] !== s) flat = false;
            for (let k = -LEG - 2; k <= LEG + 2 && flat; k++) if (Math.abs(w.surface[tx + k] - s) > 1) flat = false;
            if (flat) { at = tx; break; }
          }
        }
        if (at !== null) out.push({ tx: at, ty: w.surface[at], wake: 9 + out.length, thud: 0 });
      }
    }
    return (this._rigs = out);
  },

  /** 이 탑이 지금 도는가. 장마다 한 대씩 깨어난다(9장 첫 대 · 10장 둘째 · 11장 셋째). */
  rigOn(r) { return this.chapter >= r.wake; },

  updateRigs(dt) {
    const p = this.player;
    if (!p || this.chapter < 9) return;
    for (const r of this.rigs()) {
      if (!this.rigOn(r)) continue;
      const dx = r.tx * TS + TS / 2 - p.cx, dy = r.ty * TS - p.cy;
      if (Math.abs(dx) > this.RIG_NEAR || Math.abs(dy) > this.RIG_NEAR * 1.4) { r.thud = 0; continue; }
      r.thud += dt;
      if (r.thud >= this.RIG_THUD) {
        r.thud = 0;
        this.shake = Math.max(this.shake, 2);     // 전투 타격(18)의 1/9 — 있는 줄만 알 정도
        this.sfxAt('drill', r.tx, r.ty);
      }
    }
  },

  SMOKE_EVERY: 0.42,        // 굴뚝 하나가 한 덩이를 뱉는 간격(초)
  SMOKE_MAX: 80,            // 동시에 살아 있는 덩이 수 상한
  SMOKE_RISE: 30,           // 오르는 속도(px/초)
  SMOKE_VENT_X: 15,         // 굴뚝 가운데 — 용광로 그림(44×44) 안의 자리
  SMOKE_VENT_Y: 6,          // 굴뚝 꼭대기

  /** 이 자리 위로 막힌 칸까지 몇 px인가. 열 칸 안에 없으면 null(하늘로 친다). */
  smokeCeil(x, y) {
    const w = this.world;
    const tx = clamp(Math.floor(x / TS), 0, WW - 1);
    const y0 = Math.floor(y / TS);
    for (let d = 1; d <= 10; d++) {
      const ty = y0 - d;
      if (ty < 0) return null;
      if (w.solid(tx, ty)) return y - (ty + 1) * TS;
    }
    return null;
  },

  updateSmoke(dt) {
    const w = this.world, p = this.player;
    if (!w || !p) return;
    if (!this.smokes) this.smokes = [];
    this.smokeT = (this.smokeT || 0) + dt;
    if (this.smokeT >= this.SMOKE_EVERY) {
      this.smokeT = 0;
      const rx = this.W * 0.7 + 90, ry = this.H * 0.7 + 90;
      /* 연기를 뿜는 것 = 용광로 + 도는 채취탑. 굴뚝 자리만 다르고 나머지 규칙
         (천장에 고이는 것 · 수명 · 크기)은 똑같으므로 한 표로 합쳐 돌린다. */
      const vents = [];
      for (const o of w.objects)
        if (o.type === 'forge') vents.push([o.x + this.SMOKE_VENT_X, o.y + this.SMOKE_VENT_Y]);
      for (const r of this.rigs())
        if (this.rigOn(r)) vents.push([r.tx * TS + TS / 2 + 17 * this.RIG_SCALE,
                                       r.ty * TS - this.RIG_TOP * this.RIG_SCALE]);
      for (const [vx, vy] of vents) {
        if (Math.abs(vx - p.cx) > rx || Math.abs(vy - p.cy) > ry) continue;
        if (this.smokes.length >= this.SMOKE_MAX) break;
        /* 위에 천장이 있으면 **닿을 만큼은 살게** 한다. 수명을 고정해 두면 방 높이가
           조금만 높아도 천장을 못 보고 도중에 흩어진다 — 굴뚝 연기가 천장에 고이는
           그림이 이 연출의 요점이라 거기까지는 가야 한다. 천장이 없으면(하늘) 평소
           수명대로 오르다 사그라든다. */
        const gap = this.smokeCeil(vx, vy);
        const dur = gap === null ? 3.6 + Math.random() * 1.4
                                 : Math.min(9, gap / this.SMOKE_RISE + 1.4 + Math.random() * 0.5);
        this.smokes.push({
          x: vx + (Math.random() - 0.5) * 3, y: vy,
          t: 0, dur,
          sway: Math.random() * TAU, sz: 10 + Math.random() * 3, stuck: 0
        });
      }
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.t += dt;
      if (s.t >= s.dur) { this.smokes.splice(i, 1); continue; }
      if (s.stuck) {
        // 천장에 닿았다 — 옆으로 번지며 사그라든다
        s.x += (s.sway < Math.PI ? 1 : -1) * 13 * dt;
      } else {
        const ny = s.y - this.SMOKE_RISE * dt;
        const tx = clamp(Math.floor(s.x / TS), 0, WW - 1);
        const ty = Math.floor((ny - s.sz * 0.4) / TS);
        if (ty >= 0 && w.solid(tx, ty)) { s.stuck = 1; s.y = (ty + 1) * TS + s.sz * 0.4; }
        else { s.y = ny; s.x += Math.sin(s.sway + s.t * 1.6) * 8 * dt; }
      }
    }
  },

  /** 채취탑 한 대. 원점은 **바닥 가운데**다. 도는 것과 죽은 것은 같은 그림이고
      색과 움직임만 다르다 — 세션 1 에 본 그 고철이 도는 것이라야 의미가 있으므로
      모양이 달라지면 안 된다. */
  drawRig(c, x, y, on, ph) {
    const dim = (hex, k) => {
      const n = parseInt(hex.slice(1), 16);
      const f = (v) => Math.round(v * k);
      return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`;
    };
    const k = on ? 1 : 0.52;          // 죽은 것은 같은 색을 어둡게 — 검게 칠하면 실루엣이 된다
    const DARK = dim('#39414a', k), MID = dim('#5a6470', k), LITE = dim('#7c8794', k);
    const RIVET = dim('#b9c4d0', k), RUST = dim('#7a5a38', k);

    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(this.RIG_SCALE, this.RIG_SCALE);   // 아래 좌표는 배율 1 기준 — RIG_SCALE 참고

    // 다리 넷 — 바깥 둘은 굵게, 안쪽 둘은 가늘게. 땅에 박혀 있다
    c.strokeStyle = DARK; c.lineCap = 'butt';
    for (const [bx, tx2, wdt] of [[-42, -15, 8], [42, 15, 8], [-22, -9, 4], [22, 9, 4]]) {
      c.lineWidth = wdt;
      c.beginPath(); c.moveTo(bx, 4); c.lineTo(tx2, -118); c.stroke();
    }
    c.lineWidth = 3;                  // 가새 — 다리 사이 X 자
    for (const yy of [-34, -76]) {
      const s = 1 - (yy + 118) / 118 * 0.0;
      c.beginPath();
      c.moveTo(-40 * s * 0.72, yy - 16); c.lineTo(40 * s * 0.72, yy + 16);
      c.moveTo(40 * s * 0.72, yy - 16); c.lineTo(-40 * s * 0.72, yy + 16);
      c.stroke();
    }

    // 몸통 — 리벳 박은 통
    c.fillStyle = MID; c.fillRect(-30, -190, 60, 72);
    c.fillStyle = LITE; c.fillRect(-30, -190, 60, 10);
    c.fillStyle = DARK; c.fillRect(-30, -130, 60, 12);
    c.fillStyle = RIVET;
    for (let ry = -184; ry < -124; ry += 14)
      for (let rx = -25; rx <= 25; rx += 10) c.fillRect(rx, ry, 2, 2);

    // 바퀴 — 돌 때만 돈다. 죽은 것은 늘 같은 자리에 멈춰 있다
    const wr = 24, wx = -40, wy = -156;
    c.strokeStyle = LITE; c.lineWidth = 4;
    c.beginPath(); c.arc(wx, wy, wr, 0, TAU); c.stroke();
    c.lineWidth = 3; c.strokeStyle = MID;
    for (let i = 0; i < 6; i++) {
      const a = (on ? ph * 0.9 : 0.4) + i * TAU / 6;
      c.beginPath(); c.moveTo(wx, wy);
      c.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); c.stroke();
    }
    c.fillStyle = RUST; c.beginPath(); c.arc(wx, wy, 5, 0, TAU); c.fill();

    // 굴뚝
    c.fillStyle = DARK; c.fillRect(8, -252, 18, 64);
    c.fillStyle = MID; c.fillRect(6, -256, 22, 7);

    // 등 — 꺼져 있으면 그냥 렌즈, 켜지면 맥이 뛴다
    const lx = 20, ly = -150;
    c.fillStyle = DARK; c.fillRect(lx - 7, ly - 7, 14, 14);
    if (on) {
      const a = 0.55 + Math.sin(ph * 1.7) * 0.3;
      c.save();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, 26);
      g.addColorStop(0, '#ffc878'); g.addColorStop(0.4, '#e07a1e'); g.addColorStop(1, '#e07a1e00');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 26, 0, TAU); c.fill();
      c.restore();
      c.fillStyle = '#ffd9a0'; c.fillRect(lx - 3, ly - 3, 6, 6);
    } else {
      c.fillStyle = dim('#6a5a48', k); c.fillRect(lx - 3, ly - 3, 6, 6);
    }
    c.restore();
  },

  drawRigs(c, camX, camY) {
    const rs = this.rigs();
    if (!rs.length) return;
    for (const r of rs) {
      const x = r.tx * TS + TS / 2 - camX, y = r.ty * TS - camY;
      if (x < -140 || x > this.W + 140 || y < -60 || y > this.H + 300) continue;
      this.drawRig(c, x, y, this.rigOn(r), this.time + r.tx * 0.37);
    }
  },

  drawSmoke(c, camX, camY) {
    if (!this.smokes || !this.smokes.length) return;
    for (const s of this.smokes) {
      const k = clamp(s.t / s.dur, 0, 1);
      const fr = Math.min(5, Math.floor(k * 6));
      const sz = s.sz * (1 + k * 1.6) * (s.stuck ? 1.3 : 1);
      const x = s.x - camX - sz / 2, y = s.y - camY - sz / 2;
      if (x < -sz || y < -sz || x > this.W || y > this.H) continue;
      c.globalAlpha = Math.min(1, (1 - k) * 1.7) * 0.86;
      if (!(this.spritesOn && Sprites.drawFx(c, 'smoke_forge', fr, x, y, sz))) {
        // 그림이 없으면 — 네모 한 장으로라도 연기가 오르는 것은 보이게 한다
        c.fillStyle = '#2c2722';
        c.fillRect(Math.round(x + sz * 0.2), Math.round(y + sz * 0.2), Math.round(sz * 0.6), Math.round(sz * 0.6));
      }
    }
    c.globalAlpha = 1;
  },

  /** 빗줄기 페이드 인/아웃 + 화면 좌표계 낙하 갱신. rainT는 구름 농도에도 같이 쓴다 —
      비가 그친 뒤에도 구름이 서서히 걷히도록 즉시 0으로 끊지 않는다. */
  updateWeather(dt) {
    /* ★ 비 이벤트의 zones 에는 village·camp 가 없다(안전 지대 몹까지 비로 강해지면
       안 되니까). 그 판정을 빗줄기 표시에도 쓰면 마을에 들어서는 순간 비가 뚝 그쳐
       보인다 — 게임성은 eventActive() 그대로 두고 **눈에 보이는 비**만 계속 내린다. */
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
      const table = pool.biome === 'sea'
        /* 바다는 깊이가 곧 난이도다 — 수면 가까이는 게·해파리, 내려갈수록 상어·문어,
           바닥 근처에서 초롱아귀. 산소가 먼저 닳으므로 "더 내려갈까"를 계속 묻게 된다. */
        /* 깊이 칸 수는 세계 크기만큼 늘린다(WSY) — 중형·대형 바다는 그만큼 깊어서, 그대로 두면
           바다 대부분이 '가장 깊은 층' 표로 떨어진다 */
        ? (ty > (w.sea.level + 220 * WSY) ? ['abyss_angler', 'deep_octopus', 'abyss_angler']
         : ty > (w.sea.level + 90 * WSY) ? ['deep_octopus', 'reef_shark', 'abyss_angler']
         : ty > (w.sea.level + 30 * WSY) ? ['reef_shark', 'reef_crab', 'lantern_jelly', 'reef_shark']
         : ['reef_crab', 'lantern_jelly', 'reef_crab'])
        : pool.biome === 'jungle'
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

  /** 바다 부유물 — 바다 수면 가까이 있을 때만, 드물게. 등급은 70 / 25 / 5.
      ★ 밀도는 **가로 200칸에 한둘**이다. 예전(틱마다 3%, 플레이어 곁에 둘까지)에는 화면 하나에
      둘이 금방 차서 바다가 짐짝 밭처럼 보였다. 지금은 틱마다 1.2%, 이미 떠 있는 것과 70칸 안에는
      안 띄우고, 플레이어 둘레 ±100칸에 둘을 넘기지 않는다. 화면 밖 수면 칸에만 띄운다. */
  trySpawnFlotsam() {
    const p = this.player, w = this.world;
    if (!w.sea || Math.random() > 0.012) return false;
    const ptx = Math.floor(p.cx / TS), pty = Math.floor(p.cy / TS), lv = w.sea.level;
    if (ptx >= SEA_X1 + 20 || Math.abs(pty - lv) > 30) return false;
    const fl = this.ents.filter(e => e instanceof Enemy && e.def.ai === 'flotsam');
    if (fl.filter(e => Math.abs(e.cx / TS - ptx) < 100).length >= 2) return false;
    for (let att = 0; att < 10; att++) {
      const tx = clamp(ptx + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.floor(Math.random() * 60)), 4, SEA_X1 - 6);
      if (fl.some(e => Math.abs(e.cx / TS - tx) < 70)) continue;
      if (w.get(tx, lv) !== T.SEAWATER || w.get(tx, lv - 1) !== T.AIR) continue;
      const sx = tx * TS - this.cam.x;
      if (sx > -60 && sx < this.W + 60) continue;
      const r = Math.random();
      const type = r < 0.70 ? 'flotsam1' : r < 0.95 ? 'flotsam2' : 'flotsam3';
      const d = ENEMIES[type];
      this.ents.push(new Enemy(type, tx * TS, lv * TS - d.h * 0.5, this.scale()));
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
    if (this.trySpawnFlotsam()) return;
    for (let att = 0; att < 22; att++) {
      const ang = Math.random() * TAU;
      const rad = 520 + Math.random() * 460;
      const tx = Math.floor((p.cx + Math.cos(ang) * rad) / TS);
      const ty = Math.floor((p.cy + Math.sin(ang) * rad) / TS);
      if (tx < 3 || ty < 3 || tx >= WW - 3 || ty >= WH - 6) continue;
      // 바다에는 지상 몹이 나오지 않는다 — 물속 몹은 trySpawnWater가 따로 낸다
      if (tx < SEA_X1 + 8) continue;
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
      if (!table.length) continue;            // 그 구역에 지상 몹이 없다(바다)
      const type = table[Math.floor(Math.random() * table.length)];
      const flying = ENEMIES[type].ai === 'flyer' || ENEMIES[type].ai === 'caster';
      let sy2 = ty;
      if (!flying) {
        // 몇 칸 아래까지 훑어 발 디딜 곳을 찾아 준다
        // 사연: docs/code-history.md#h53
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
      /* 개조 — 세션 2 에서는 옛 바이옴의 몹이 기계가 되어 서 있다. 장이 넘어갈수록
         넘어간 종류가 늘어난다(MECH_ORDER). 유적·하늘·공창 계열은 제 이야기가
         따로 있으므로 바이옴 구역에서만 건다. */
      if (this.MECH_ZONE[zone] && isMech(type, this.chapter)) e.makeMech(MECH_MUL);
      // buff형 이벤트(비 등) — 몹 종류는 평소 그대로, 체력·공격력만 따로 올린다
      if (evHere && evHere.buff) {
        if (evHere.buff.hp) { e.maxHp = Math.round(e.maxHp * evHere.buff.hp); e.hp = e.maxHp; }
        if (evHere.buff.dmg) e.dmg *= evHere.buff.dmg;
        e.weatherBuffed = true;
      }
      /* 붉은 달만 **플레이어 레벨을 탄다**(lvScale). 세계의 나머지는 레벨을 안 따라가는데,
         이 밤 하나만 예외로 둬서 후반에도 "오늘은 나가면 안 된다"가 성립하게 한다.
         50레벨 3배 · 100레벨 9배. 방어력은 안 건드린다 — 거기까지 9배가 되면
         피해가 낮은 무기로는 흠집도 안 난다. */
      if (evHere && evHere.lvScale) {
        // 몹이 제 lvScale을 이미 물고 있으면(좀비) 그것을 나눠 내고 이벤트 배수로
        // 갈아 끼운다 — 안 그러면 둘이 곱해져 좀비만 터무니없이 세진다
        const bm = bloodMult(p.level) / (e.lvFactor || 1);
        e.maxHp = Math.round(e.maxHp * bm); e.hp = e.maxHp;
        e.dmg *= bm;
        // 보상도 같은 배수를 탄다. 9배로 단단해진 것을 2.2배 값에 잡으라고 하면
        // 그냥 안 나가는 게 이득이 되어, 이벤트가 "피하는 것"이 되어 버린다
        e.xp = Math.round(e.xp * bm); e.gold = Math.round(e.gold * bm);
        e.weatherBuffed = true;
      }
      // 정예 — 어느 바이옴에서나 낮은 확률로, 그 자리에 있는 몹이 통째로 강해져 나온다.
      // 새 몹을 만드는 대신 스폰표에 이미 있는 몹을 그대로 부풀리는 쪽을 골랐다 —
      // "여기 원래 살던 게 오늘따라 사납다"는 인상을 주려는 것이다.
      if (ENEMIES[type].ai !== 'critter' && !this.boss && this.rng.chance(0.018)) {
        e.maxHp = Math.round(e.maxHp * 2.6); e.hp = e.maxHp;
        e.dmg *= 1.8; e.armor += 14; e.xp = Math.round(e.xp * 4); e.gold = Math.round(e.gold * 4);
        e.elite = true;
        this.toast(`어디선가 유난히 사나운 ${mobName(type, e.mech)}의 기척이 느껴진다`, 'bad');
      }
      this.ents.push(e);
      return;
    }
  },

  /* ================= 진행 ================= */
  /* 슬라임 10마리에 까마귀 8마리에 구리 15번에 장검 제작까지 전부 채워야 보스로 갈 수 있었으니, 이야기가 아니라 숙제 목록이었다. 정작 하고 싶은 것(내려가 보기,
     유적 들어가 보기)은 목록에 없거나 있어도 순서가 강제됐다.

     이제 셋으로 나뉜다.
       basics     넷 중 골라서 하는 것 (needBasics 개만 채우면 된다)
       require    이 장의 고유 동사. 그 verb 를 가진 basic 은 반드시 끝나 있어야 한다
       goal       결전. 보통 보스다
     그래서 "무엇을 할지"는 고르되 "이 장이 무엇에 관한 장인지"는 지켜진다.
     항목 수를 줄인 대신 개별 숫자는 조금만 낮췄다 — 플레이 시간을 깎는 것이
     목적이 아니라 **숙제처럼 느껴지는 것**을 없애는 것이 목적이다.
     사연: docs/code-history.md#h54 */
  objProgress(o) {
    const p = this.player;
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
      /* 가 본 곳 — 바이옴 이름표(seenBiomes)와 유적 첫 입장(seenRuins)을 그대로 쓴다.
         따로 세는 것을 만들지 않았다. 이미 "본 곳"을 기억하고 있었다. */
      case 'explore':
        cur = (o.zone ? (this.seenBiomes && this.seenBiomes[o.zone])
                      : (this.seenRuins && this.seenRuins[o.ruin])) ? 1 : 0;
        break;
      /* 세우고 · 물리고 · 끊기. 11장의 결전이다 — 자동화를 켜는 것이 아니라
         "켠 것을 내 손으로 멈출 수 있다"가 그 장의 이야기라서 세 걸음을 다 본다. */
      case 'place': cur = this.placeProgress(o); max = o.stop ? 3 : 1; break;
    }
    return { cur: Math.min(cur, max), max, done: cur >= max };
  },

  /** 조립기: 놓았나(1) · 동력이 돈 적 있나(2) · 지금 멈춰 있나(3) */
  placeProgress(o) {
    const w = this.world;
    if (!w || !w.machines) return 0;
    let m = null;
    /* 세계가 지어 둔 기계(m.gen)는 안 본다 — "세웠다"는 **내 손으로** 세웠다는 뜻이다.
       지금 이 목표는 조립기 하나뿐이라 생성기와 겹치지 않지만, 함정류로 목표를 하나
       더 붙이는 순간 유적 함정이 대신 채워 준다(data.js achMach 의 사고와 같은 꼴). */
    for (const q of w.machines.values()) if (q.t === o.mach && !q.gen) { m = q; break; }
    if (!m) return 0;
    if (!o.stop) return 1;
    if (!this.asmRan) return 1;
    return (typeof Factory !== 'undefined' && Factory.sat(w, m) > 0) ? 2 : 3;
  },

  /** 이 장이 지금 어디까지 왔는가 — 화면도 판정도 전부 이걸 본다 */
  chapterState(ch) {
    const basics = (ch.basics || []).map(o => ({ o, p: this.objProgress(o) }));
    const doneList = basics.filter(b => b.p.done);
    const need = ch.needBasics === undefined ? basics.length : ch.needBasics;
    const req = ch.require || [];
    const missing = req.filter(v => !doneList.some(b => b.o.verb === v));
    const ready = doneList.length >= need && !missing.length;
    const goal = ch.goal ? { o: ch.goal, p: this.objProgress(ch.goal) } : null;
    return {
      basics, done: doneList.length, need, ready, missing, goal,
      complete: ready && (!goal || goal.p.done)
    };
  },

  /** 아직 자격이 없는데 결전에 손대려 할 때 한 줄로 알려 준다 */
  goalLocked(ch, st) {
    if (!ch || st.ready) return '';
    if (st.missing.length) {
      const b = (ch.basics || []).find(o => o.verb === st.missing[0]);
      return '아직 자격이 없다 — ' + (b ? b.t : '이 장의 일이 남았다');
    }
    return `아직 자격이 없다 — 준비 ${st.done}/${st.need}`;
  },

  checkChapter() {
    const ch = CHAPTERS[this.chapter];
    if (!ch) return;
    if (!this.chapterState(ch).complete) { UI.refreshTracker(); return; }
    // 완료
    const p = this.player;
    p.addXp(ch.rw.xp); p.gold += ch.rw.gold;
    for (const [id, n] of (ch.rw.items || [])) {
      const it = ITEMS[id].stack > 1 ? makeItem(id, n) : rollGear(id, this.rng, 2);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it));
    }
    this.toast(`『${ch.title}』 완료 — 경험치 ${fmt(ch.rw.xp)} · 금화 ${fmt(ch.rw.gold)}`, 'good');
    /* 별 연출이 얼마나 걸리는지 되받는다. 아래 delay 를 이 값보다 짧게 두면
       조각이 맺히거나 하늘로 오르는 것이 **뒷이야기 창 뒤에서** 벌어진다 —
       실제로 5장에서 그랬다(합쳐지는 연출 1.5초, 창 열림 1.4초). */
    const starShow = this.gainStarOrbit(ch.id) || 0;
    this.chapter++;
    this.checkAch();
    UI.refreshBag();

    /* ★ 여명 마을 해금은 "다음 챕터가 없을 때"가 아니라 **8장(세션 1 종장)을 끝냈을 때**다.
       마지막 챕터 조건으로 걸어 두면 세션 2 챕터가 붙는 순간 영영 참이 되지 않아,
       마을이 안 열리고 9장의 「케이드와 대화」에서 진행이 막힌다. */
    /* 순서는 하나뿐이다 — 별 → 마을 → 뒷이야기 → 다음 장.
       셋이 겹치면 무엇 하나도 제대로 안 읽힌다. 그래서 뒤엣것의 시작을
       앞엣것이 끝나는 시각에서 잡는다(고정 숫자를 쓰지 않는다). */
    let delay = Math.max(1400, starShow);
    if (ch.id === 8 && !this.villageUnlocked) {
      this.villageUnlocked = true;
      this.world.restoreDawnCity();
      this.rollBounties();
      // 별이 하늘로 다 올라간 다음에 마을이 드러난다
      const villageAt = starShow + 600;
      setTimeout(() => {
        UI.chapterCard({ sub: '', title: '여명 마을', line: '잿빛이 걷혔다' });
        this.toast('동쪽 숲에 묻혀 있던 도시가 드러났다.', 'good');
        setTimeout(() => this.toast('베이스캠프의 귀환 비석으로 여명 마을에 갈 수 있다.', 'good'), 2400);
      }, villageAt);
      delay = villageAt + 4600;              // 마을 연출이 끝난 뒤에 뒷이야기
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
  onKill() {
    // 유적 안에서 피를 보면 맥박이 가라앉는다 — 싸우는 사람은 격노를 붙들어 둘 수 있다
    if (this.pulseHere) this.addPulse(this.pulseHere, -PULSE.kill * (this.hasSeal('spore') ? 2 : 1));
    this.checkAch();
  },
  /* 업적 판정. **프레임마다 돌리지 않는다** — 처치·제작·채굴·장 넘김·깊이 갱신처럼
     "무언가 달라진 순간"에만 부른다. 스물다섯 개를 훑는 것 자체는 싸지만, 매 프레임
     스물다섯 번의 객체 순회는 싸지 않다.
     처음 부를 때 옛 세이브의 "이미 한 일"도 함께 채워진다 — 조건이 전부 이미 있는
     카운터를 읽기 때문이다. 그래서 판을 올린 사람이 업적을 처음부터 다시 하지 않는다. */
  checkAch() {
    if (!this.player || !this.achievements) return;
    for (const a of ACHIEVEMENTS) {
      if (this.achievements[a.id]) continue;
      let ok = false;
      try { ok = !!a.check(this); } catch (e) { ok = false; }   // 아직 없는 값을 읽어도 죽지 않게
      if (!ok) continue;
      this.achievements[a.id] = Date.now();
      this.onAchieved(a);
    }
  },
  onAchieved(a) {
    this.toast(`업적 달성 — ${a.n}`, 'good');
    for (let i = 0; i < 24; i++)
      this.parts.push(new Part(this.player.cx, this.player.cy, '#ffe08a', -80, 1.0));
    this.sfx('chapter');
    if (UI.open === 'quest') UI.refreshQuest();
  },
  /** 이벤트 중 처치 보상 배수 (경험치·금화) */
  killMult() {
    const ev = this.eventActive() ? this.eventSpec() : null;
    return ev ? ev.rw : 1;
  },
  onPickup(it) {
    if (it && idef(it).type !== 'block' && idef(it).type !== 'mat') this.toast(`${itemName(it)} 획득`, 'good');
    UI.refreshBag();
  },
  /** 세션 1 의 진행 표시. 1~5장은 한 장에 조각 하나, 5장에서 다섯이 모이고,
      추적자(8장)를 넘기면 희미해진다. 매 장 같은 폭죽을 터뜨리지 않는다 —
      늘어나는 것은 별 하나와 짧은 한 줄뿐이다. */
  /* ================= 별이 하늘로 돌아간다 (세션 1 종장) =================
     8장을 끝내면 다섯 조각이 곁을 떠난다. starFade = 1 한 줄이면 조각이 그냥 옅어질
     뿐이라, 세션 1 이 닫히고 2 가 열리는 자리의 이음매가 비어 버린다.
     두 마디로 나눈다 — 다섯이 머리 위 한 점으로 모이고(GATHER), 위로 가속하며 꼬리를
     끌고 화면 밖으로(RISE). 끝나면 조각은 곁에 없고 희미한 잔상만 남는다. */
  /* ★ 별의 세 사건은 **천천히** 지나가야 한다.
       생성 3초 · 합성 5초(5장) · 상승 5초(8장)
     사연: docs/code-history.md#h55 */
  STAR_GAIN: 3.0,
  STAR_MERGE: 5.0,
  STAR_RISE_ALL: 5.0,
  get STAR_GATHER() { return this.STAR_RISE_ALL / 3; },   // 모이는 마디
  get STAR_RISE() { return this.STAR_RISE_ALL * 2 / 3; }, // 올라가는 마디
  startStarRise() {
    this.starRise = { t: 0, dur: this.STAR_GATHER + this.STAR_RISE, x: 0, y: 0 };
    /* 별의 세 사건은 제 소리를 쓴다(learn·level 을 빌리면 다섯 번뿐인 장면이 특성 창 소리로 지나간다).
       star_rise 는 1.5초짜리라 올라가는 5초를 받친다. */
    this.sfx('star_rise');
  },
  /** 남은 시간(초). 연출이 끝나면 상태를 정리한다 */
  tickStarRise(dt) {
    const s = this.starRise; if (!s) return;
    s.t += dt;
    const p = this.player;
    if (s.t < this.STAR_GATHER) {
      // 모이는 동안 반짝임이 조금씩 붙는다
      if (Math.random() < dt * 14)
        this.parts.push(new Part(p.cx + (Math.random() - .5) * 70, p.cy - 10 + (Math.random() - .5) * 40, '#ffe08a', -30, .6));
      return;
    }
    if (!s.popped) {                       // 한 점으로 모인 순간
      s.popped = 1;
      this.burst(p.cx, p.cy - 14, 'starmerge', 120, 2.6);
      this.ringFx(p.cx, p.cy - 14, 66, '#ffe8a8', .5);
      this.sfx('star_merge');
    }
    // 올라가는 동안 지나간 자리에 잔불을 남긴다
    const k = (s.t - this.STAR_GATHER) / this.STAR_RISE;
    const y = p.cy - 14 - k * k * 900;
    if (Math.random() < dt * 30)
      this.parts.push(new Part(p.cx + (Math.random() - .5) * 22, y + Math.random() * 40, '#ffe08a', 40, .7));
    if (s.t >= s.dur) {
      this.starRise = null;
      p.starOrbits = 0; p.starLit = 0; p.starFade = 1;
    }
  },

  gainStarOrbit(id) {
    const p = this.player;
    if (id >= 1 && id <= 5) {
      p.starOrbits = Math.min(5, (p.starOrbits || 0) + 1);
      /* 조각이 맺히는 것을 보여 준 다음에 말로 알린다 — 순서가 반대면 글자가 먼저 뜨고
         그림이 뒤따라서 둘이 따로 논다. 장 완료 토스트와도 겹치지 않게 한 박자 둔다. */
      /* 생성 3초 — 조각이 멀리서 내려와 궤도에 앉기까지. 폭죽 한 번으로 끝내지 않고
         내려앉는 동안 계속 반짝이도록 starGain 을 켜 둔다(그리는 쪽에서 쓴다). */
      this.starGain = { t: 0, dur: this.STAR_GAIN };
      setTimeout(() => {
        const q = this.player;
        this.burst(q.cx + 30, q.cy - 8, 'stargain', 46, this.STAR_GAIN * 0.8);
        this.sfx('star_gain');
      }, 700);
      setTimeout(() => this.toast(`별 조각이 하나 더 곁에 남았다 — ${p.starOrbits}/5`, 'good'),
                 this.STAR_GAIN * 1000 - 600);
      if (id === 5) {
        // 다섯이 한 점으로 모였다가 다시 퍼진다. 5장 outro 와 같은 사건이다
        p.starLit = 1;
        setTimeout(() => {
          this.starMerge = this.STAR_MERGE;
          this.burst(this.player.cx, this.player.cy - 4, 'starmerge', 176, this.STAR_MERGE * 0.9);
          this.shake = 10; this.sfx('star_merge');
        }, this.STAR_GAIN * 1000);
        // 생성이 끝난 뒤 합성이 시작되고, 그것도 다 보고 나서 뒷이야기로
        return (this.STAR_GAIN + this.STAR_MERGE) * 1000 + 900;
      }
      return this.STAR_GAIN * 1000 + 500;   // 조각이 맺히고 한 줄 뜰 때까지
    } else if (id === 8) {
      /* 세션 1 의 끝 — 조각이 곁을 떠나 하늘로 돌아간다. */
      setTimeout(() => this.startStarRise(), 700);
      setTimeout(() => this.toast('다섯 조각이 곁을 떠나 하늘로 돌아갔다', 'good'),
                 700 + (this.STAR_GATHER + this.STAR_RISE) * 1000 + 200);
      return 700 + (this.STAR_GATHER + this.STAR_RISE) * 1000 + 1200;
    }
    return 0;
  },

  onLevelUp(lv) {
    this.toast(`레벨 ${lv} 달성! 스탯 +3, 특성 +1`, 'good');
    for (let i = 0; i < 30; i++) this.parts.push(new Part(this.player.cx, this.player.cy, '#ffe08a', -80, 0.9));
    UI.refreshStatAlloc(); this.sfx('level');
  },

  /** 생활 숙련이 한 단계 올랐다. 레벨업만큼 크게 알리지는 않되, 특전이 열리는
      레벨(3·6·10)에서는 무엇이 열렸는지 이름을 붙여 준다 — 안 그러면 숫자만 오른다 */
  onProfUp(kind, lv) {
    const P = PROFS[kind]; if (!P) return;
    const perk = P.perks.find(([at]) => at === lv);
    this.toast(`${P.i} ${P.n} 숙련 ${lv}${perk ? ` — ${perk[1]}` : ''}`, 'good');
    const p = this.player;
    this.ringFx(p.cx, p.cy, perk ? 74 : 46, P.c, perk ? .55 : .35);
    for (let i = 0; i < (perk ? 26 : 12); i++)
      this.parts.push(new Part(p.cx, p.cy, P.c, -70, .8));
    this.sfx(perk ? 'level' : 'learn');
    if (perk) UI.chapterCard({ sub: `${P.n} 숙련 ${lv}`, title: perk[1], line: perk[2] });
    if (UI.open === 'skill') UI.refreshProf();
  },
  onDeath(cause) {
    if (this.state !== 'play') return;
    this.tally = this.tally || {};
    this.tally.deaths = (this.tally.deaths || 0) + 1;
    if (cause) this.tally[cause] = (this.tally[cause] || 0) + 1;
    this.checkAch();
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
      if (this.currentSlot !== null) SaveStore.remove(this.currentSlot).catch(e => console.error(e));
      $('#death-line').textContent = '불가능 모드였다. 이 슬롯의 기록이 지워졌다.';
      $('#death-screen').classList.add('open');
      $('#death-screen').classList.add('wipe');
      this.paused = true;
      this.sfx('death');
      return;
    }
    const parts = [`경험치 ${fmt(lostXp)}, 금화 ${fmt(lostG)}개를 잃었다.`];
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
    /* 나침반 — 준비 중에는 basics 를, 자격을 갖춘 뒤에는 결전만 가리킨다.
       사연: docs/code-history.md#h56 */
    const stt = this.chapterState(ch);
    const aim = stt.ready ? (stt.goal ? [stt.goal.o] : []) : stt.basics.filter(b => !b.p.done).map(b => b.o);
    aim.forEach((o) => {
      if (this.objProgress(o).done) return;
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
      /* ★ 화살표는 save/restore 로 감싼다. rotate(-a)·translate(-px,-py) 로 직접 되돌리면
         cos/sin(a) 와 cos/sin(-a) 가 부동소수점에서 정확한 역행렬이 아니라 오차가 쌓여,
         바로 뒤에 그리는 거리 라벨이 미세하게 기울어 보인다. */
      c.save();
      c.globalAlpha = .82;
      c.translate(px, py); c.rotate(a);
      c.fillStyle = col;
      c.beginPath(); c.moveTo(13, 0); c.lineTo(-7, -7); c.lineTo(-3, 0); c.lineTo(-7, 7); c.closePath(); c.fill();
      c.restore();
      // 거리 — 화살표 안쪽(플레이어 쪽)에 적어야 화면 밖으로 안 밀린다. 상자 폭을 먼저 재서 화살표 뒤끝을 안 넘어가게 띄우는 거리를 정한다.
      // 사연: docs/code-history.md#h57
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
    this.ents = []; this.corpses = []; this.boss = null; this.projs = [];
    /* ★ 깨워 둔 둥지·메아리 표시도 같이 지운다. 보스는 위에서 사라지는데 이 둘이 남아 있으면,
       나중에 **다른** 보스(제단·소환석)를 잡았을 때 그 둥지를 비운 것으로 적거나 메아리
       보상을 줬다. */
    this.pendingLair = null; this.pendingEcho = null;
    if (this.pulseEvent) this.endPulseEvent(false);   // 쓰러지면 사건도 놓친 것이다
    this.rocks = [];
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
  /** 저장이 끝나면 true. 저장은 비동기다(압축·IndexedDB) — 글자열은 부른 순간의 상태로 먼저 만든다 */
  async saveGame() {
    if (this.currentSlot === null) return false;   // 타이틀에서 슬롯을 거치지 않고는 저장할 수 없다
    if (this._saving) { this.toast('저장하는 중이다', 'info'); return false; }
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
      this.toast('저장했다', 'good');
      return true;
    } catch (e) {
      this.toast(e && e.name === 'QuotaExceededError' ? '저장 실패: 용량 초과' : '저장 실패', 'bad'); console.error(e);
      return false;
    } finally { this._saving = false; }
  },
  /* ================= 저장 내보내기 / 가져오기 =================
     저장은 브라우저 안(IndexedDB · 안 되면 localStorage)에만 있다. 브라우저를 바꾸거나, zip 폴더를 옮기거나,
     시크릿 창을 닫으면 그대로 사라진다 — file:// 은 경로가 곧 출처라 폴더 이름만
     바뀌어도 남남이 된다. 그래서 세 칸과 설정을 파일 한 장으로 꺼내고 되돌린다.
     웹이든 zip 이든 같은 파일이다. */
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
      if (!n) { this.toast('내보낼 기록이 없다', 'bad'); return; }
      const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ashfall-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      this.toast(`${n}칸을 파일로 내보냈다`, 'good');
    } catch (e) { this.toast('내보내기 실패', 'bad'); console.error(e); }
  },
  /** 내보낸 파일을 되돌린다. 같은 세계 폭(SAVE_KEY)만 받는다 */
  async importSaves(text) {
    try {
      const d = JSON.parse(text);
      if (!d || d.app !== 'ashfall' || !d.slots) { this.toast('이 게임의 저장 파일이 아니다', 'bad'); return; }
      if (d.key && d.key !== SAVE_KEY) { this.toast('이전 판의 저장이라 열 수 없다', 'bad'); return; }
      let n = 0;
      // 되돌린 기록도 이 기계에서 다시 봉인한다 — 안 그러면 봉인된 파일이 안 열린다
      for (const k in d.slots) {
        const i = +k;
        if (!(i >= 0 && i < SAVE_SLOTS) || !d.slots[k]) continue;
        await SaveStore.put(i, d.slots[k], saveHead(JSON.parse(d.slots[k])));
        n++;
      }
      if (d.settings) { localStorage.setItem(SET_KEY, d.settings); this.loadSettings(); UI.syncSettings(); }
      if (!n) { this.toast('파일에 기록이 없다', 'bad'); return; }
      this.toast(`${n}칸을 되돌렸다 — 이어하기에서 고르면 된다`, 'good');
      this.renderSlotScreen();
    } catch (e) { this.toast('저장 파일을 읽지 못했다', 'bad'); console.error(e); }
  },

  async loadGame(slot) {
    let rec = null;
    try { rec = await SaveStore.get(slot); } catch (e) { console.error(e); }
    if (!rec) { this.toast('저장된 기록이 없다', 'bad'); return; }
    const raw = rec.raw;
    /* 손댄 기록은 열지 않는다. **막을 뿐 지우지는 않는다** — 서명 쪽에 문제가 있어
       멀쩡한 기록을 잠갔더라도 파일은 그대로 남아 있어야 한다. */
    let head = null;
    try { head = JSON.parse(raw); } catch (e) { }
    if (!saveSealOk(raw, head, rec.sig)) {
      this.toast('이 기록은 저장한 뒤에 바뀌었다 — 열 수 없다', 'bad');
      return;
    }
    this.currentSlot = slot;
    this.showLoading('기록을 불러오는 중…');
    setTimeout(() => { try { this._loadGame(raw); } finally { this.hideLoading(); } }, 40);
  },
  _loadGame(raw) {
    try {
      const d = JSON.parse(raw);
      upgradeSave(d);   // 옛 판으로 만든 기록을 지금 판 모양으로 올린다
      // 세계 폭이 바뀐 버전의 기록은 그대로 풀면 지형이 어긋난 채로 열린다 — 아예 막는다
      /* 세계 크기가 다른 판의 기록은 열지 않는다. 타일이 RLE 배열이라 폭·높이가 어긋나면 지형이 통째로 밀려 버린다.
         사연: docs/code-history.md#h58 */
      /* 세계 크기(소형·중형·대형)를 **먼저** 맞추고 대조한다 — 크기마다 WW·WH 가 다르다.
         안 맞으면(옛 판의 폭이거나 크기 표시가 틀린 기록) 원래 크기로 되돌리고 열지 않는다. */
      const prevSize = WSIZE;
      setWorldSize((d.world && d.world.size) || 's');
      if (d.world && ((d.world.ww && d.world.ww !== WW) || (d.world.wh && d.world.wh !== WH))) {
        setWorldSize(prevSize);
        this.toast(`이전 크기(${d.world.ww}×${d.world.wh || '?'})의 세계라 열 수 없다 — 새로 시작해야 한다`, 'bad');
        return;
      }
      this.world = World.deserialize(d.world);
      this.fitMapAtlas();
      this._rigs = null; this._fbg = null;   // 다른 세계를 불러왔다 — 자리·원경 캐시를 버린다
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
      /* 이전 세이브에는 생활 숙련이 없다 — 1레벨로 시작한다. 특성 포인트는 지급
         속도가 두 배가 되었으므로 "이 레벨이면 받았어야 할 만큼"까지 채워 준다. */
      if (d.p.prof) for (const k in p.prof) if (d.p.prof[k]) Object.assign(p.prof[k], d.p.prof[k]);
      /* 별 조각 궤도 — 옛 기록에는 없다. 이미 지나온 장 수에서 되짚어 준다
         (그 장들을 끝냈다는 사실은 chapter 하나로 알 수 있다). */
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
      // 옛 세이브는 펫이 도감(pets{}/activePet)이었다 — 그때 모은 펫을 잃지 않도록
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
      /* 옛 저장에는 "○○ 14마리"만 적힌 종이가 붙어 있다. 새 게시판은 목표를
         obj 로 읽으므로 그런 종이는 읽을 수 없다 — 하루치를 새로 붙인다. */
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
      this.state = 'play'; this.paused = false;
      this.petEnts = []; this.syncPets();
      UI.refreshBag(); UI.refreshEquip(); UI.refreshTracker(); UI.refreshSkillbar(); UI.refreshStatAlloc(); UI.refreshSkillSlots();
      this.toast('여정을 이어간다', 'good');
      this.audioInit();
      this.buildMapAtlas();
    } catch (e) { this.toast('불러오기 실패', 'bad'); console.error(e); }
  },

  /* ================= 세이브 슬롯 ================= */
  /** 옛 판은 슬롯 없이 SAVE_KEY 하나였다. 그 기록이 남아 있고 슬롯0이 아직
      비어 있으면 한 번만 슬롯0으로 옮겨서 기존 진행을 잃지 않게 한다. */
  migrateLegacySave() {
    const legacy = localStorage.getItem(SAVE_KEY);
    if (!legacy || localStorage.getItem(slotKey(0))) return;
    try {
      const d = JSON.parse(legacy);
      d.name = d.name || '이름 없는 모험가';
      d.savedAt = d.savedAt || Date.now();
      d.sealed = 1;
      const text = JSON.stringify(d);
      localStorage.setItem(slotKey(0), text);          // 이어서 SaveStore.start() 가 IndexedDB 로 옮긴다
      localStorage.setItem(sigKey(0), saveSign(text));
      localStorage.removeItem(SAVE_KEY);
    } catch (e) { console.error(e); }
  },
  async deleteSlot(i) {
    if (!confirm('이 세이브를 정말 삭제할까요? 되돌릴 수 없습니다.')) return;
    try { await SaveStore.remove(i); } catch (e) { this.toast('삭제하지 못했다', 'bad'); console.error(e); }
    this.renderSlotScreen();
  },
  /** 타이틀 화면의 슬롯 목록을 새로 그린다. 빈 칸은 "새로운 여정" 버튼 하나만,
      찬 칸은 이름·레벨·장·마지막 저장 시각과 이어하기/삭제 버튼을 보여 준다. */
  async renderSlotScreen() {
    let slots;
    try { slots = await SaveStore.list(); } catch (e) { console.error(e); slots = new Array(SAVE_SLOTS).fill(null); }
    const box = $('#slot-list');
    box.innerHTML = slots.map((s, i) => {
      if (!s) {
        return `<div class="slot-card empty" data-slot="${i}">
          <div class="slot-empty-label">빈 슬롯</div>
          <button class="slot-new-btn" data-slot="${i}">새로운 여정</button>
        </div>`;
      }
      const when = s.savedAt ? new Date(s.savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      // 손댄 기록은 목록에서부터 알려 준다 — 눌러 보고 나서야 알면 답답하다
      return `<div class="slot-card filled${s.bad ? ' tampered' : ''}" data-slot="${i}">
        <div class="slot-info">
          <div class="slot-name">${escHtml(s.name)}</div>
          <div class="slot-meta">${s.bad ? '저장한 뒤에 바뀐 기록 — 열 수 없다' : `Lv.${s.level} · ${(WORLD_SIZES[s.size] || WORLD_SIZES.s).n} · ${when}`}</div>
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
  MODAL_STACK: ['#code-screen', '#newgame-screen', '#bye-screen', '#credits-screen',
                '#settings-screen', '#slots-screen'],
  /** 열려 있는 팝업 중 가장 위의 것을 닫는다. 닫을 게 없으면 false. */
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
    let ci = 0, mi = 0, sz = 's';
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
      <div class="ng-modes" id="ng-modes">${MODES.map((m, i) => `
        <button class="ng-mode${i ? '' : ' on'}" data-i="${i}" style="--mc:${m.c}">${escHtml(m.n)}</button>`).join('')}</div>
      <p class="ng-mdesc" id="ng-mdesc">${escHtml(MODES[0].d)}</p>

      <div class="ng-sec">세계 크기</div>
      <div class="ng-modes" id="ng-sizes">${Object.keys(WORLD_SIZES).map(k => `
        <button class="ng-mode${k === 's' ? ' on' : ''}" data-k="${k}" style="--mc:#8fb8d8">${escHtml(WORLD_SIZES[k].n)}</button>`).join('')}</div>
      <p class="ng-mdesc" id="ng-sdesc">${escHtml(WORLD_SIZES.s.d)}</p>

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
          !confirm('불가능 모드입니다.\n한 번 죽으면 이 슬롯의 기록이 지워집니다. 시작할까요?')) return;
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
  sfxAt(kind, tx, ty, rate, vol) {
    const p = this.player; if (!p) return;
    const dx = Math.abs(tx * TS - p.cx), dy = Math.abs(ty * TS - p.cy);
    if (dx > this.W * 0.6 + 120 || dy > this.H * 0.6 + 120) return;
    this.sfx(kind, rate, vol);
  },

  /* ================= 재질 파편 ================= 한 가지 표(MAT)에서 색·개수·중력·모양을 가져온다. 이제 돌은 네모난 조각이 돌면서
     떨어지고, 젤은 동그랗게 번지고, 불티와 영혼은 빛나며 위로 뜬다.

       n     개수(안 주면 재질 기본값)
       spd   튀는 속도 배수
       ring  이 반지름의 고리에서 시작한다(0 이면 한 점에서)
       in    1이면 안쪽으로 빨려 든다(공허가 무너질 때)
     사연: docs/code-history.md#h59 */
  /* ★ 이름은 반드시 matBurst 다. burst() 는 이미 타격 이펙트 시트를 터뜨리는
     메서드다(위쪽 2137줄) — 같은 이름으로 두면 객체 리터럴에서 **뒤엣것이
     이겨서** 타격 이펙트가 통째로 사라진다. 실제로 한 번 그렇게 덮어썼다. */
  matBurst(mat, x, y, n, o) {
    const m = MAT[mat] || MAT[MAT_DEF];
    o = o || {};
    const k = n === undefined || n === null ? m.n : n;
    const spd = o.spd === undefined ? 1 : o.spd;
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU, rr = o.ring ? o.ring * (0.7 + Math.random() * 0.3) : 0;
      const pt = new Part(x + Math.cos(a) * rr, y + Math.sin(a) * rr,
        m.c[(Math.random() * m.c.length) | 0], o.vy === undefined ? -20 : o.vy,
        m.life * (o.life || 1),
        { g: m.g, sq: m.sq, glow: m.glow, spd, r: o.r || 1, drag: m.glow ? 0.90 : 0.96 });
      if (rr) {                       // 고리에서 시작하면 방향을 반지름 축으로 다시 잡는다
        const v = Math.hypot(pt.vx, pt.vy) * (o.in ? -1 : 1);
        pt.vx = Math.cos(a) * v; pt.vy = Math.sin(a) * v;
      }
      this.parts.push(pt);
    }
  },
  /** 한 획마다 다른 음높이. ±6% — 음이 바뀐 것으로는 안 들리고 다른 타격으로만 들린다 */
  strokeRate() { return 0.94 + Math.random() * 0.12; },

  /** 무기가 닿는 순간 — 맞은 것의 재질로 소리와 파편을 낸다.

      소리는 **두 겹**이다.
        ① 재질 — 무엇에 맞았나. 돌은 돌 소리, 뼈는 뼈 소리. 늘 울린다.
        ② 무기 계열 — 어떻게 맞혔나. 베기·찌르기·둔기가 그 위에 얇게 얹힌다.
      두 절이 따로 쓰였던 터라 겹칠 자리가 하나 있다. C 절의 `hit_flesh` 는 "물렁한
      적에 맞을 때 위 셋을 대신한다"이고, D 절에서 flesh 의 재질음도 같은 `hit_flesh`
      다 — 그래서 **물렁한 것(flesh·gel)에는 ②를 안 얹는다.** 얹으면 같은 파일이
      두 겹으로 울려 한 대가 두 대로 들린다.
      ★ ②를 ①보다 작게(0.55) 두는 것이 요점이다. 같은 크기로 두면 두 소리가 각자
        "한 대"로 들려서, 때린 횟수가 두 배로 들린다. 작게 얹어야 색만 입는다. */
  hitFx(e, x, y, crit, fam) {
    const mat = mobMat(e.type, e.mech);
    this.matBurst(mat, x, y, crit ? 8 : 4, { spd: crit ? 1.15 : 0.85, life: 0.75 });
    const tx = x / TS, ty = y / TS;
    this.sfxAt(MAT[mat].hit, tx, ty, this.strokeRate());
    if (fam && mat !== 'flesh' && mat !== 'gel') this.sfxAt('hit_' + fam, tx, ty, this.strokeRate());
    /* 치명타는 계열마다 따로 굽지 않고 **한 겹을 얹는다** — 짧고 높고 금속적이라
       어느 계열 위에 올려도 섞인다. 계열 두 벌을 만들면 평타와 치명타가 서로 다른
       악기처럼 들려 오히려 따로 논다. */
    if (crit) this.sfxAt('hit_crit', tx, ty);
  },
  /** 한 칸이 떨어져 나가는 순간 */
  breakFx(tx, ty, id, mach) {
    const mat = tileMat(id);
    const x = (tx + .5) * TS, y = (ty + .5) * TS;
    this.matBurst(mat, x, y, mach ? 14 : undefined, { spd: mach ? 1.2 : 1 });
    if (mach) this.matBurst('ember', x, y, 6, { spd: 1.4, life: 0.6 });   // 기계는 불티가 튄다
    this.sfx(mach ? 'break_machine' : MAT[mat].brk, this.strokeRate());
  },
  /* 죽을 때 — 보스는 **무엇으로 만들어졌는지**에 따라 다르게 무너진다(BOSS_DIE).
     한 박자 늦게 두 번째 터짐이 온다: 껍데기가 먼저 날고 안에 있던 것이 뒤따른다.
     그 한 박자가 "터졌다"를 "무너졌다"로 바꾼다. */
  deathBurst(e) {
    const mat = mobMat(e.type, e.mech);
    if (!e.boss) {
      this.matBurst(mat, e.cx, e.cy, MAT[mat].n + 3, { spd: 1.15, life: 1.2 });
      return;
    }
    const d = BOSS_DIE[e.type] || { mat, n: 56, spd: 1.2, life: 1.3, shake: 20 };
    this.matBurst(d.mat || mat, e.cx, e.cy, d.n, {
      spd: d.spd, vy: d.vy, life: d.life, ring: d.ring, in: d.in, r: 1.35,
    });
    this.shake = Math.max(this.shake, d.shake || 20);
    if (!d.mat2) return;
    const x = e.cx, y = e.cy;
    this.pending.push({
      t: d.at || 0.2,
      fn: () => {
        this.matBurst(d.mat2, x, y, d.n2, {
          spd: (d.spd || 1) * 1.25, life: (d.life || 1) * 1.1, r: 1.2,
        });
        this.sfx(MAT[d.mat2].brk, 0.78 + Math.random() * 0.18);
        this.shake = Math.max(this.shake, (d.shake || 20) * 0.5);
      },
    });
  },

  /** 캐는 동안 한 획마다 — 파편 한 톨과 재질 타격음 */
  /* ★ 캐는 **도중**의 소리는 거의 들리지 않을 만큼 줄여 두었다.
       한 칸을 캐는 데 박자가 서넛씩 들어가고 그 박자마다 **무기 타격음과 같은 파일**이
       제 음량으로 울렸다 — 곡괭이질을 조금만 이어 가도 그 소리가 화면을 덮어서,
       정작 "칸이 떨어져 나가는" 소리(breakFx)가 그 속에 묻혔다. 기본으로 들려야 하는
       것은 부수는 소리다.
     ★ 없애지 않고 **깎아서** 남긴 까닭: 소리가 아예 없으면 단단한 돌을 팔 때 곡괭이가
       닿고 있는지 허공을 치고 있는지가 파편 하나로만 갈린다. 지금은 음높이를 낮추고
       (×0.62) 음량을 0.18 로 떨어뜨려, 같은 파일이지만 날 선 타격음이 아니라 **멀리서
       나는 둔한 톡 소리**로 들린다. 부수는 소리와 겹쳐도 그쪽을 안 가린다. */
  MINE_TICK_VOL: 0.18,
  MINE_TICK_RATE: 0.62,
  mineTickFx(tx, ty, id) {
    const mat = tileMat(id);
    const x = (tx + .5) * TS, y = (ty + .5) * TS;
    this.matBurst(mat, x, y, 1, { spd: 0.7, life: 0.6 });
    this.sfxAt(MAT[mat].hit, tx, ty,
      this.MINE_TICK_RATE * this.strokeRate(), this.MINE_TICK_VOL);
  },

  /* ================= 효과음 =================
     ★ rate — 한 획마다 음높이를 흔드는 배속. 같은 소리가 두 번 안 나게 한다.
       파일이 있으면 playbackRate 로, 없으면 합성음의 주파수로 그대로 먹는다.

     ★ nz — 합성음에 섞는 잡음의 양(0~1).
       돌이 깨지고 흙이 무너지는 소리는 **음정이 아니라 잡음**이다. 오실레이터
       하나로는 아무리 낮게 깔아도 "삐" 소리라 돌로 안 들린다. 그래서 짧은
       백색잡음을 대역통과로 깎아 함께 낸다. 파일이 오기 전까지의 대역이지만,
       이것만으로도 돌 · 흙 · 유리 · 쇠가 갈려 들린다. */
  sfx(kind, rate, volMul) {
    if (window.Sfx && Sfx.play(kind, rate, volMul)) return;   // 손그림 파일이 로드돼 있으면 그걸로 대신한다
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
      // 문 — 여는 쪽은 경첩이 풀리며 올라가고, 닫는 쪽은 문설주에 부딪혀 떨어진다
      door_open: [180, 300, 'triangle', .05, .35], door_shut: [320, 120, 'square', .055, .5],
      // --- 농사 · 정지 스위치 ---
      hoe: [180, 110, 'square', .04], harvest: [500, 700, 'triangle', .05],
      power_on: [200, 500, 'square', .05], power_off: [500, 150, 'square', .05],
      splash: [560, 140, 'sine', .045],    // 낚싯줄이 물에 떨어지는 짧은 퐁당 소리
      hatch: [300, 900, 'triangle', .06],  // 껍질이 깨지고 뭔가 튀어나오는 느낌으로 올라가는 톤
      /* --- 재질별 타격 (무기가 닿는 순간) --- */
      hit_flesh: [180, 90, 'sine', .05, .55], hit_bone: [430, 200, 'square', .045, .5],
      hit_stone: [200, 120, 'square', .05, .7], hit_dirt: [140, 80, 'triangle', .045, .85],
      hit_wood: [300, 160, 'triangle', .045, .45], hit_metal: [900, 520, 'square', .045, .3],
      hit_glass: [1500, 900, 'sine', .04, .5], hit_gel: [260, 120, 'sine', .05, .3],
      hit_plant: [520, 300, 'triangle', .04, .7], hit_ember: [700, 200, 'sawtooth', .045, .8],
      hit_void: [120, 60, 'sine', .05, .45],
      /* --- 재질별 파괴 (한 칸이 떨어져 나가는 순간) --- */
      break_stone: [150, 70, 'square', .06, .9], break_dirt: [110, 60, 'triangle', .055, .95],
      break_wood: [240, 110, 'triangle', .06, .6], break_plant: [440, 200, 'triangle', .05, .85],
      break_metal: [760, 300, 'square', .06, .5], break_glass: [1800, 700, 'sine', .055, .75],
      break_ice: [1300, 500, 'sine', .055, .7], break_ember: [420, 120, 'sawtooth', .06, .9],
      break_bone: [520, 200, 'square', .055, .6], break_flesh: [200, 90, 'sine', .06, .5],
      break_void: [90, 45, 'sine', .06, .6], break_machine: [520, 140, 'sawtooth', .07, .55],
      /* --- 스킬 (열아홉 가지를 열다섯 갈래로) ---
         파일이 오기 전에도 갈래마다 다르게 들린다. 재질음과 같은 방식이다 —
         [시작 주파수, 끝 주파수, 파형, 크기, 잡음 섞는 정도]. */
      sk_slash: [620, 200, 'sawtooth', .05, .55],   // 칼바람 — 빠르게 내려긋는다
      sk_whirl: [520, 260, 'sawtooth', .036, .5],   // 도는 동안 박자마다
      sk_charge: [260, 90, 'square', .06, .7],      // 부딪히며 밀고 들어간다
      sk_quake: [110, 45, 'sawtooth', .075, .95],   // 땅이 갈라진다
      sk_guard: [180, 300, 'square', .05, .35],     // 쇠가 맞물려 굳는다
      sk_shout: [300, 520, 'sawtooth', .07, .6],    // 사람 목소리처럼 올라간다
      sk_volley: [700, 400, 'square', .045, .45],   // 시위가 여러 번
      sk_pierce: [1200, 520, 'sine', .045, .3],     // 한 발이 꿰뚫는다
      sk_smoke: [420, 150, 'sine', .04, .9],        // 퍼지는 연기
      sk_mark: [900, 1350, 'sine', .04],            // 겨눈 곳에 찍히는 신호음
      sk_fire: [180, 520, 'sawtooth', .055, .75],   // 불이 붙는다
      sk_meteor: [90, 38, 'sawtooth', .1, .95],     // 떨어져 박힌다
      sk_frost: [1400, 600, 'sine', .05, .5],       // 얼음이 갈라진다
      sk_heal: [520, 880, 'sine', .05],             // 따뜻하게 올라가는 종
      sk_shield: [400, 760, 'triangle', .05, .25],  // 유리 돔이 씌워진다
      sk_bolt: [1600, 700, 'square', .05, .6],      // 전기가 튄다
      sk_blink: [900, 180, 'sine', .045, .35],      // 사라졌다 나타난다
      sk_summon: [260, 430, 'sawtooth', .055, .4],  // 부르는 소리
      sk_deny: [200, 150, 'square', .028, .25]      // 막힌 소리 — 짧고 낮게
    }[kind];
    if (!spec) return;
    /* ★ 파일이 없어 합성음으로 떨어질 때도 SFX_GAP 을 지킨다.
       Sfx.play 는 **파일이 있을 때만** 간격을 봤다. 그래서 아직 파일이 없는
       재질음이 어디선가 초당 열 번씩 불리면 그대로 다 울렸다. */
    const gap = window.SFX_GAP && SFX_GAP[kind];
    if (gap !== undefined) {
      this._synLast = this._synLast || {};
      const now = t;
      if (now - (this._synLast[kind] || -9) < gap) return;
      this._synLast[kind] = now;
    }
    const r = rate || 1;
    const [f0, f1, type, vol, nz] = spec;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0 * r, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1 * r), t + 0.16);
    g.gain.setValueAtTime(vol * (nz ? 0.55 : 1) * (volMul === undefined ? 1 : volMul), t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.24);
    if (!nz) return;
    /* 잡음 한 줌 — 대역통과로 재질의 '거칠기'를 만든다.
       버퍼는 한 번만 만들어 두고 돌려 쓴다(타격마다 새로 만들면 연타에서 튄다). */
    if (!this._nzBuf) {
      const n = Math.floor(ac.sampleRate * 0.25);
      const b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this._nzBuf = b;
    }
    const src = ac.createBufferSource(); src.buffer = this._nzBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f0 * r * 1.6, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(60, f1 * r), t + 0.14);
    const ng = ac.createGain();
    ng.gain.setValueAtTime(vol * nz * 1.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.16 + nz * 0.1);
    src.connect(bp); bp.connect(ng); ng.connect(ac.destination);
    src.start(t); src.stop(t + 0.3);
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
    // 발광 물약 — lit/lit_greater 버프가 있으면 미광 반경을 넓힌다. '등불'(등불 치어)도 같은 자리에 얹는다 — 삼키면 뱃속이 환하다는 설명대로 실제로
    // 밝아야 한다
    // 사연: docs/code-history.md#h60
    const litR = p.buffs.some(b => b.id === 'lit_greater') ? 9.5
      : p.buffs.some(b => b.id === 'lit') ? 6.8
      : p.buffs.some(b => b.id === 'lantern') ? 6.0 : 4.6;
    w.computeLight(tx0, ty0, tx1, ty1, dayLight,
      [[Math.floor(p.cx / TS), Math.floor(p.cy / TS), litR]]);   // 플레이어 미광

    // ---- 배경 지형 ----
    this.drawParallax(c, camX, camY, dayF);

    /* ---- 채취탑 ---- **타일보다 먼저 그린다.**
       ★ 자리를 옮기지 말 것. (코드 옆 주석은 "타일 뒤"라고 적혀 있었는데 실제 호출은 타일 **뒤쪽**,
          곧 화면에서는 앞이었다. 주석이 아니라 순서가 틀렸던 것이다.)
       이 탑은 세션 2 가 다가온다는 것을 멀리서 알리는 **배경**이지 만지는 물건이
       아니다. 판정도 피해도 없다. 여기서 그리면 지형이 탑을 가리므로, 땅 위의
       모든 것(적·주인공·드롭·굴)이 탑보다 앞에 온다. 굴뚝 연기만 늦게 그려
       지형 위로 올라간다(drawSmoke).
       사연: docs/code-history.md#h61 */
    this.drawRigs(c, camX, camY);

    // ---- 타일 (절차적 텍스처 아틀라스) ----
    const VA = TileArt.V;
    const ashF = this.ashF(), ashOn = ashF > 0.02 && TileArt.ashAtlas;
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
        /* 움직이는 타일(물·폭포·용암)은 아틀라스 칸을 **시간**으로 고른다. 위치(tx+ty)를
           위상으로 섞지 않으면 화면의 물이 전부 같은 순간에 같은 모양이 되어, 흐르는 게
           아니라 화면 전체가 깜빡이는 것처럼 보인다.
           잎은 변형이 곧 가지 방향이라 무작위로 뽑지 않는다 — 줄기 쪽을 보고 고른다. */
        const an = TileArt.ANIM[id];
        const v = an ? ((((this.time * an.fps) + tx * 0.7 + ty * 0.4) | 0) % an.fr)
                : LEAF_TWIG[id] ? this.pickLeafV(w, tx, ty) : (tileHash(tx, ty) * VA) | 0;
        if (id === T.AIR) { if (wl) TileArt.drawWall(c, wl, v, sx, sy); continue; }
        /* 바다 수면 — 타일을 통째로 칠하지 않고 **파도 높이만큼만** 채운다.
           평균 2/3칸, 마루가 1칸을 안 넘게 잡았다(1칸을 넘으면 위 칸이 공기라 물이
           허공에 뜬 것처럼 보인다). 주기가 다른 물결 둘에 칸마다 다른 위상을 섞어
           규칙적인 톱니가 되지 않게 한다. */
        if (id === T.SEAWATER && w.tiles[k - WW] === T.AIR) { this.drawWave(c, tx, ty, sx, sy, wl); continue; }
        if (ALPHA_TILE[id] && wl) TileArt.drawWall(c, wl, v, sx, sy);
        // 흐르는 액체 — 수위만큼만 (world.js '유체' 절)
        if (FLUID_FLOW[id]) { this.drawFlow(c, w, id, k, tx, ty, sx, sy); continue; }
        /* 물에 뜬·잠긴 장식(수련·물풀·해초)은 그 칸 밑에 **진짜 물 타일**을 옆 물칸과 같은
           프레임으로 먼저 깐다. 장식 그림에 물을 구워 넣으면 무늬·프레임이 따로 놀아
           장식 둘레만 네모나게 다른 물이 된다(tileart.js ART[T.LILY] 주석). */
        const ul = LEAVE_OF[id];
        if (ul) {
          const ua = TileArt.ANIM[ul];
          TileArt.draw(c, ul, ua ? ((((this.time * ua.fps) + tx * 0.7 + ty * 0.4) | 0) % ua.fr) : 0, sx, sy);
        }
        if (ashOn && this.ASH_TILE[id]) { this.drawAshTile(c, id, v, sx, sy, tx, ty, ashF); continue; }
        // 이웃을 보고 그리는 타일(이끼·종유석·위가 막힌 잔디 …) — tileart.js 의 ★ 참고.
        // 이것들은 전부 윗면 줄이 필요 없는 칸이라(위가 막혔거나 TOP_SKIP) 여기서 끝낸다.
        if ((BODY_ONLY[id] || CONN[id]) && TileArt.drawConn(c, w, id, tx, ty, sx, sy, v)) continue;
        if (id === T.PLATFORM) TileArt.draw(c, id, v, sx, sy, 7);
        else TileArt.draw(c, id, v, sx, sy);
        /* 상단 하이라이트는 **하늘에 드러난 윗면**을 흉내 내는 선이다. 세 가지를 다 봐야 한다.

           ① 윗칸이 **정확히 공기**일 것. "윗칸이 고체가 아니면"으로 두면 물에 잠긴
              바닥이나 잡초·조개가 얹힌 칸에도 줄이 그어진다.
           ② 타일 제가 **구멍 없이 꽉 찬** 것일 것 (TOP_SKIP — tileart.markFull 이 아틀라스
              알파를 직접 재서 정한다). 안 그러면 그림에서 떨어진 허공에 선이 뜬다.
           ③ ★ 그 공기가 **하늘로 이어진** 것일 것. ①②만으로는 모자랐다 — 지하 190m 동굴
              바닥 53칸에 전부 줄이 그어졌고(그중 20칸은 빛이 0인 칠흑), 마을에서도 88칸 중
              26칸이 **집 안 바닥**이었다. 햇빛 자국이 지하와 실내에 남는 셈이다.
              판정은 지어내지 않고 조명이 쓰는 것을 그대로 쓴다 — world.computeLight 가
              햇빛을 심는 조건이 `AIR && y <= surface[x] && walls[k] === 0` 이다. 같은 식을
              쓰면 "밝은데 줄이 없다"거나 "어두운데 줄이 있다"가 원리적으로 생기지 않는다.
              (제가 판 수직굴 바닥에는 안 그어진다. 조명도 거길 하늘로 안 치므로 어둡다 —
               어두운 칸에 줄이 없는 것이 맞다.) */
        if (!TOP_SKIP[id] && w.tiles[k - WW] === T.AIR
            && w.walls[k - WW] === 0 && ty - 1 <= w.surface[tx]) {
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
      } else if (o.type === 'ciphernote') {
        /* 암호 쪽지 — 벽에 못으로 박아 둔 종이 한 장. 비문(돌)과 다른 실루엣이라야
           "저건 읽을 게 또 있다"로 보인다. 아직 안 읽었으면 모서리가 깜빡인다. */
        const read = (this.cipherSeen || {})[o.ruin] && (this.cipherSeen[o.ruin] || {})[o.idx];
        c.fillStyle = shade('#3a3226', f); c.fillRect(sx - 1, sy - 1, o.w + 2, o.h + 2);
        c.fillStyle = shade(read ? '#9a9078' : '#cfc6a8', f); c.fillRect(sx, sy, o.w, o.h);
        c.fillStyle = shade('#7a6f56', f);
        for (let i = 1; i < 5; i++) c.fillRect(sx + 3, sy + 3 + i * 4, o.w - 6, 1);
        c.fillStyle = shade('#5a5142', f); c.fillRect(sx + o.w / 2 - 1, sy + 1, 2, 2);   // 못
        if (!read) {
          c.globalAlpha = .35 + Math.sin(this.time * 2.6 + o.idx) * .3;
          c.fillStyle = '#ffe9a8'; c.fillRect(sx - 2, sy - 2, o.w + 4, o.h + 4);
          c.globalAlpha = 1;
        }
      } else if (o.type === 'npc') {
        this.drawNpc(c, o, sx, sy, f);
      } else {
        this.drawFacility(c, o, sx, sy, f);
      }
      c.restore();
    }

    // ---- 특별한 스킬의 바닥 연출 ---- (적·플레이어보다 **먼저** — 아래에 깔려 안 가린다)
    this.drawSigGround(c, camX, camY);

    // ---- 드롭 ----
    c.textAlign = 'center'; c.textBaseline = 'middle';
    /* ---- 시체 ----
       **드롭보다 먼저** 깐다. 보스가 쏟아 낸 전리품을 1초 넘게 덮으면
       그것부터 손해다 — 떨어진 것이 바로 보여야 한다. */
    this.drawCorpses(c, camX, camY);

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
    this.drawStarOrbit(c, p, camX, camY);
    this.drawPlayer(c, p, p.x - camX, p.y - camY);
    for (const pet of (this.petEnts || [])) if (pet) this.drawPet(c, pet, camX, camY);
    /* 회오리 검무의 칼선 — 플레이어 바로 위에, 선으로만. 도는 것이 2.5초 내내
       보여야 하는데 채널 중에는 아무 표시도 없었다(잰 입자 0개). */
    this.drawWhirlArc(c, p, camX, camY);
    // ---- 떨어지는 별 ---- (적보다 나중 — 하늘에 있으니 위가 맞다)
    this.drawSigSky(c, camX, camY);

    // ---- 조명 (부드러운 그라디언트 오버레이) ----
    this.drawLightOverlay(c, camX, camY, tx0, ty0, tx1, ty1);
    this.drawGlow(c, camX, camY, tx0, ty0, tx1, ty1);   // 빛 색 — 어둠 위에 더한다
    this.drawFishCue(c, camX, camY);   // 입질 알림은 밤에도 보여야 한다 — 조명 위에
    /* 유적 고유 이벤트의 여운을 화면에 덮는다.
       불이 꺼졌을 때(ruinDark)는 타일을 건드리지 않고 화면만 어둡게 한다 — 장식을
       부수면 되돌릴 방법이 없다. 홀씨(ruinSpore)는 초록빛으로 시야를 흐린다.
       둘 다 끝날 때 마지막 2초 동안 서서히 걷힌다. */
    // 이름표는 원경이 바뀌는 자리에서 — 그리는 김에 같은 카메라 값으로 본다
    this.checkBiomeEntry(camX, camY);
    /* 그 땅의 공기색 — 아주 옅게. 없으면 일곱 땅이 다 같은 색으로 읽힌다. */
    const air = this.biomeAir(camX, camY);
    if (air) this.drawAir(c, air);
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
    this.drawCaves(c, camX, camY);

    // ---- 폭발/타격 이펙트 ----
    if (this.bursts) for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += 1 / 60;
      const fr = Math.floor(b.t / (0.04 * (b.sp || 1)));
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
      if (pr instanceof Bomb) { this.drawBomb(c, pr, sx, sy); continue; }
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
      const mx = r.max || 0.3, k = r.t / mx;
      c.strokeStyle = r.c; c.globalAlpha = k * .8; c.lineWidth = 3;
      c.beginPath(); c.arc(r.x - camX, r.y - camY, r.r * (1.3 - k * 0.3), 0, TAU); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 1;
    }

    // ---- 떨어질 자리 예고 (별의 낙하) ----
    if (this.warns) for (let i = this.warns.length - 1; i >= 0; i--) {
      const w = this.warns[i]; w.t -= 1 / 60;
      if (w.t <= 0) { this.warns.splice(i, 1); continue; }
      const k = 1 - w.t / w.max;                 // 0 -> 1 로 차오른다
      const x = w.x - camX, y = w.y - camY;
      c.globalAlpha = 0.22 + 0.2 * Math.sin(k * 18);
      c.fillStyle = w.c;
      c.beginPath(); c.arc(x, y, w.r * k, 0, TAU); c.fill();
      c.globalAlpha = 0.85; c.strokeStyle = w.c; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, w.r, 0, TAU); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 1;
    }

    // ---- 번개 (사슬 번개 · 차원 도약) ----
    if (this.bolts) for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.t -= 1 / 60;
      if (b.t <= 0) { this.bolts.splice(i, 1); continue; }
      const k = b.t / b.max;
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [lw, col, al] of [[6, b.c, 0.22 * k], [2.4, b.c, 0.9 * k], [1, '#ffffff', 0.9 * k]]) {
        c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = lw;
        c.beginPath();
        b.pts.forEach((p, j) => j ? c.lineTo(p[0] - camX, p[1] - camY) : c.moveTo(p[0] - camX, p[1] - camY));
        c.stroke();
      }
      c.globalAlpha = 1; c.lineWidth = 1; c.lineCap = 'butt';
    }

    // ---- 보스 대사 (화면 아래) ----
    if (this.bossSay) {
      const bs = this.bossSay; bs.t -= 1 / 60;
      if (bs.t <= 0) this.bossSay = null;
      else {
        const a = Math.min(1, bs.t / 0.6);
        c.save();
        c.globalAlpha = a;
        c.font = '600 15px "Pretendard",sans-serif';
        c.textAlign = 'center';
        const y = this.H - 96;
        c.fillStyle = '#000a'; c.fillText(bs.text, this.W / 2 + 1, y + 1);
        c.fillStyle = '#f0e2b1'; c.fillText(bs.text, this.W / 2, y);
        c.font = '11px "Pretendard",sans-serif'; c.fillStyle = '#c8a05a';
        c.fillText(bs.who, this.W / 2, y - 18);
        c.textAlign = 'left';
        c.restore();
      }
    }

    // ---- 비전 방벽 — 플레이어를 감싼 육각 결계 ----
    const pl = this.player;
    if (pl && pl.shield > 0) {
      const x = pl.cx - camX, y = pl.cy - camY;
      const rr = 30 + Math.sin(this.time * 5) * 1.5;
      const k = pl.shieldMax ? pl.shield / pl.shieldMax : 1;
      c.save();
      c.globalAlpha = 0.10 + 0.10 * k;
      c.fillStyle = '#6fb8ff';
      c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
      c.globalAlpha = 0.35 + 0.45 * k; c.strokeStyle = '#9fd4ff'; c.lineWidth = 1.6;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = this.time * 0.6 + i * TAU / 6;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 1.15;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath(); c.stroke();
      c.restore();
    }

    this.drawMeteorNear(c, camX, camY);                 // 가까이 떨어지는 운석 · 떨어진 순간의 섬광

    // ---- 용광로 굴뚝 연기 ---- (입자보다 먼저 — 불티가 연기 앞에 보이도록)
    this.drawSmoke(c, camX, camY);

    // ---- 입자 ----
    /* 파편 — 재질에 따라 모양이 다르다. 돌·쇠·유리는 네모 조각이 돌며 날고, 살·젤·연기는
       동그랗게 번지고, 불티와 영혼은 빛난다(lighter 합성). sq 없는 옛 파편은 네모. */
    let lit = false;
    for (const pt of this.parts) {
      const want = !!pt.glow;
      if (want !== lit) { c.globalCompositeOperation = want ? 'lighter' : 'source-over'; lit = want; }
      c.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      c.fillStyle = pt.c;
      const x = pt.x - camX, y = pt.y - camY, r = pt.r;
      if (pt.sq === 0) { c.beginPath(); c.arc(x, y, r * 0.6, 0, TAU); c.fill(); }
      else if (pt.spin && Math.abs(pt.rot) > 0.001 && r > 2.2) {
        c.save(); c.translate(x, y); c.rotate(pt.rot);
        c.fillRect(-r / 2, -r / 2, r, r); c.restore();
      } else c.fillRect(x - r / 2, y - r / 2, r, r);
    }
    if (lit) c.globalCompositeOperation = 'source-over';
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
    /* 불굴 — 테두리만 한 번 물든다. 120초에 한 번뿐인 순간이라 화면이 대답해야 하지만,
       가운데를 덮으면 정작 살아남은 직후의 싸움이 안 보인다. 그래서 **테두리만**,
       0.55초, 그리고 '화면 효과' 설정을 따른다. */
    if (this.edge) {
      this.edge.t -= 1 / 60;
      if (this.edge.t <= 0) this.edge = null;
      else {
        const k = this.edge.t / this.edge.max, a = SIG_FX.undying.a * k * this.fxScale();
        if (a > 0.004) {
          const eg = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .30,
            this.W / 2, this.H / 2, Math.max(this.W, this.H) * .62);
          eg.addColorStop(0, `rgba(${this.edge.rgb},0)`); eg.addColorStop(1, `rgba(${this.edge.rgb},1)`);
          c.globalAlpha = a; c.fillStyle = eg; c.fillRect(0, 0, this.W, this.H);
          c.globalAlpha = 1;
        }
      }
    }

    // ---- 길잡이 (비네트 위에 얹어야 어두운 곳에서도 읽힌다) ----
    if (this.settings === undefined || this.settings.compass !== false) this.drawCompass(c, camX, camY);
    this.drawPulse(c);
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
    /* ---- 노을 ----
       예전 하늘은 낮 파랑과 밤 남색 사이를 밝기(f)로만 오갔다. 해가 지평선에 걸려도 하늘은
       그냥 파랗게 어두워질 뿐이라 해넘이가 없었다. 해의 높이(sunUp)가 지평선 언저리일수록
       gold 가 1 에 가깝고, 그만큼 아래는 주황 · 가운데는 분홍 · 위는 보랏빛 남색으로 물든다.
       해가 **진 뒤에도** 잠깐 남는다(지평선 아래 0.3 까지) — 노을은 해가 넘어간 다음이 더 짙다. */
    const ang = (this.dayT / 1440) * TAU - Math.PI / 2;
    const sunUp = Math.sin(ang), sunX = this.W / 2 + Math.cos(ang) * this.W * .42;
    const gold = clamp(1 - Math.abs(sunUp - 0.02) / 0.32, 0, 1) * (ev ? 0.4 : 1);
    if (ev) { top = mixHex(top, ev.tint, ev.tintAmt); bot = mixHex(bot, ev.tint, ev.tintAmt * 0.7); }
    let mid = mixHex(top, bot, 0.55);
    if (gold > 0) {
      top = mixHex(top, '#3a3a78', gold * 0.5);
      mid = mixHex(mid, '#d8849a', gold * 0.6);
      bot = mixHex(bot, '#f3a45a', gold * 0.85);
    }
    /* 원경이 "멀어 보이는" 색으로 쓸 지금의 하늘색. 원경을 투명하게 만드는 대신
       이 색으로 물들이므로, 하늘이 물들면 원경도 같이 물든다(drawParallaxArt).
       노을이 지면 원경도 노을빛으로 씻긴다 — 해와 뒷배경이 한 빛 안에 있게 된다. */
    this.skyHaze = bot;
    if (camY < surfPx + 400) {
      const g = c.createLinearGradient(0, 0, 0, this.H);
      // 가장 따뜻한 띠(bot)가 원경 능선 높이(화면 0.5~0.8)에 오게 — 화면 맨 아래는 어차피 땅이다
      g.addColorStop(0, top); g.addColorStop(0.42, mid); g.addColorStop(0.78, bot); g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      // 해 쪽 지평선이 더 달아오른다 — 노을은 하늘 전체가 아니라 해가 있는 쪽이 짙다
      if (gold > 0.02) {
        /* ★ 달아오른 자리는 해보다 **위**(화면 0.5)에 둔다. 해가 지는 높이(0.7)에 두면 원경 능선이
           그 빛을 통째로 가려, 노을을 보여 주려고 칠한 빛이 한 줌도 안 보였다. */
        const hy = this.H * .5 - camY * .05;
        const hg = c.createRadialGradient(sunX, hy, 0, sunX, hy, this.W * .8);
        hg.addColorStop(0, `rgba(255,176,96,${0.6 * gold})`);
        hg.addColorStop(0.4, `rgba(240,130,110,${0.25 * gold})`);
        hg.addColorStop(1, 'rgba(240,130,110,0)');
        c.fillStyle = hg; c.fillRect(0, 0, this.W, this.H);
      }
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
      /* ---- 해와 달 ----
         호가 뒤집혀 있었다. sunY 가 sin(각)에 **더해지고** 있어서 한낮에 가장
         낮고 새벽·저녁에 가장 높았다 — 정오에는 화면 아래로 완전히 내려가고,
         아침 아홉 시에는 나무 높이에 해가 걸렸다. 뒷배경보다 먼저 그리는데도
         원경 나무 사이로 빛덩이가 새어 나와 "지형을 뚫고 나온" 것으로 보였다.

         이제 sin 을 빼서 **정오에 가장 높다.** 그리고 해와 달을 따로 두지 않고 반 바퀴 어긋난 같은 호 위에 올린다 — 해가 지면 달이 뜬다.

         지평선에 가까워지면 **흐려져 사라진다.** 지형에 닿기 전에 없어지므로
         무엇을 어떻게 그리든 다시는 땅을 뚫지 않는다.
         ★ 해는 번짐 셋(넓은 햇무리 · 안쪽 광채 · 원반)이 가운데서 바깥으로
           옅어지고, 지평선에 가까울수록(gold) 커지고 붉어진다 — 노을빛 하늘과 같은 색으로
           번지므로 해가 하늘에 박힌 스티커가 아니라 하늘의 가장 밝은 자리로 읽힌다.
           원경보다 **먼저** 그리므로 해가 지면 원경 능선 뒤로 넘어간다.
         사연: docs/code-history.md#h62 */
      for (const sun of [1, 0]) {
        const a = sun ? ang : ang + Math.PI;
        const up = Math.sin(a);
        const al = clamp((up + 0.04) / 0.16, 0, 1);       // 지평선 조금 아래까지 — 원경 뒤로 넘어간다
        if (al <= 0) continue;
        const bx = this.W / 2 + Math.cos(a) * this.W * .42;
        // 지평선을 0.80 → 0.70 으로 올렸다 — 노을 녘 해가 능선 위에 조금 더 오래 머문다
        const by = this.H * .70 - up * this.H * .55 - camY * .05;
        if (sun) this.drawSun(c, bx, by, al, gold);
        else this.drawMoon(c, bx, by, al);
      }
      c.globalAlpha = 1;
      // 구름 — 비가 오는 동안은 짙고 빽빽하게, 평소엔 옅게 흘러간다
      this.drawClouds(c, camX, camY, this.rainT || 0);
      this.drawMeteorSky(c, camY);                     // 운석 — 구름 앞, 원경 능선 뒤
    } else {
      const deep = camY > HELL_Y * TS - 400;
      const g = c.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, deep ? '#2a0d08' : '#0a0a10');
      g.addColorStop(1, deep ? '#4a1408' : '#06060a');
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      /* 땅속에서는 원경이 씻길 색도 땅속 색이다 — 하늘색을 그대로 두면 지옥의
         먼 바위가 파랗게 물든다 */
      this.skyHaze = deep ? '#4a1408' : '#06060a';
    }
  },
  /** 해 — 넓은 햇무리 · 안쪽 광채 · 원반. gold(0~1)가 오르면 커지고 주황·붉은빛으로 간다 */
  drawSun(c, x, y, al, gold) {
    const r = 22 * (1 + gold * 0.35);
    const core = mixHex('#fff6d8', '#ffd08a', gold), rim = mixHex('#ffd66a', '#ff7a3a', gold);
    const halo = mixHex('#fff0b8', '#ff9a50', gold);
    const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    c.save();
    c.globalAlpha = al;
    // 넓은 햇무리 — 하늘에 녹아드는 빛. 노을일수록 옆으로 퍼진다(지평선을 따라 번지는 빛)
    c.translate(x, y); c.scale(1 + gold * 0.6, 1);
    let g = c.createRadialGradient(0, 0, 0, 0, 0, r * 7);
    g.addColorStop(0, rgba(halo, 0.34)); g.addColorStop(0.35, rgba(halo, 0.12)); g.addColorStop(1, rgba(halo, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 7, 0, TAU); c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
    // 안쪽 광채
    g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 2.4);
    g.addColorStop(0, rgba(core, 0.55)); g.addColorStop(1, rgba(core, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.4, 0, TAU); c.fill();
    /* 원반 — 구운 그림(tools/mksky.py: 주변 감광 · 쌀알 무늬 · 코로나). 낮 원반과 노을 원반을 gold 로 섞고,
       지평선 가까이에서는 대기 굴절로 **위아래가 눌린다**(노을 해가 납작해 보이는 것 — 최대 12%).
       그림 속 원반 반지름은 칸의 30%(128칸 중 38.4) — 그 비로 r 에 맞춰 키운다. */
    const day = Sprites.img.sky_sun, set = Sprites.img.sky_sun_set;
    if (day && day.width) {
      const S = r / 38.4 * 128, sq = 1 - 0.12 * gold;
      c.drawImage(day, x - S / 2, y - S * sq / 2, S, S * sq);
      if (gold > 0.01 && set && set.width) {
        c.globalAlpha = al * gold;
        c.drawImage(set, x - S / 2, y - S * sq / 2, S, S * sq);
      }
    } else {
      g = c.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, core); g.addColorStop(1, rim);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.restore();
  },
  /** 달 — 차가운 원반에 옅은 얼룩 셋, 푸른 달무리 */
  drawMoon(c, x, y, al) {
    const r = 18;
    c.save();
    c.globalAlpha = al;
    let g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 5);
    g.addColorStop(0, 'rgba(190,210,255,0.22)'); g.addColorStop(1, 'rgba(190,210,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 5, 0, TAU); c.fill();
    g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, '#fbfcff'); g.addColorStop(1, '#c4cce0');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(120,130,160,0.22)';
    for (const [dx, dy, rr] of [[-5, -3, 4.5], [6, 4, 3.2], [-2, 8, 2.4]]) { c.beginPath(); c.arc(x + dx, y + dy, rr, 0, TAU); c.fill(); }
    c.restore();
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
      /* 손그림 구름 — 1~3 은 맑은 날, 4~7 은 먹구름. 파일이 없으면 아래 원 다섯 개로 돌아간다.

         ★ **비가 오면 먹구름만, 안 오면 흰 구름만.** 게다가 문턱이 0.35 라 가랑비에는 먹구름이 한 점도 안 떴다.
         ★ 갈리는 문턱을 구름마다 조금씩 어긋나게 둔다(자리 번호로). 한꺼번에 갈리면
           비가 시작하는 프레임에 하늘 전체가 툭 바뀐다 — 조금씩 어긋나야 먹구름이
           **몰려오는** 것으로 읽힌다. 비가 제대로 오는 동안(rainT ≳ 0.2)에는 어느
           문턱이든 다 넘어서 먹구름만 남는다.
         사연: docs/code-history.md#h63 */
      const dark = rainT > 0.02 + (i % 7) * 0.025;
      const im = this.spritesOn &&
        Sprites.img['cloud_' + (dark ? 4 + (i % 4) : 1 + (i % 3))];
      if (im && im.width) {
        const w2 = 128 * sc, h2 = 64 * sc;
        c.drawImage(im, cx - w2 / 2, cy - h2 / 2, w2, h2);
        continue;
      }
      // 그림이 없을 때의 대체 — 손그림 쪽과 같은 규칙으로 갈린다(섞지 않고 둘 중 하나)
      c.fillStyle = dark ? '#2e343c' : '#ffffff';
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
  /* 같은 죽은 나무 그림을 밝기만 남기고 초록으로 눕힌 것이라, 1장에서도 8장에서도 서 있는 것은 똑같이 앙상한 장대였다. 초록색 앙상한 장대는 살아 있는 숲으로 안 읽힌다
     — 색이 아니라 **모양**이 바뀌어야 한다. 그래서 잎이 달린 그림 셋을 따로 굽는다(tools/mkforestbg.py).

     네 장은 능선과 줄기가 픽셀 단위로 같다(원본 위에 잎만 얹어 구웠다). 그래서
     겹쳐 섞어도 지형이 흔들리지 않고 잎만 빠진다.

     섞는 순서가 거꾸로인 것에 주의: **성근 쪽을 먼저 깔고 우거진 쪽을 위에
     투명하게 얹는다.** 우거진 쪽이 성근 쪽을 포함하므로, 이 순서라야 남는 잎만
     서서히 사라진다. 반대로 하면 우거진 판의 잎이 끝까지 안 지워진다.
     사연: docs/code-history.md#h64 */
  FOREST_STAGE: [
    [0.10, 'parallax_forest_lush'],   // 1장 — 잎이 가장 우거진 것
    [0.38, 'parallax_forest_mid'],    // 3~4장 — 성글어진 것
    [0.66, 'parallax_forest_thin'],   // 5~7장 — 가지 끝에만
    [0.99, 'parallax_forest']         // 8장 — 죽은 나무만 (원본)
  ],

  /** 숲 원경을 지금 잿빛 깊이에 맞춰 섞어 둔다. 1920×400 을 매 프레임 픽셀 단위로
      섞을 수는 없어서 **장이 바뀔 때만** 다시 만들고 그 사이엔 만들어 둔 것을 쓴다. */
  forestBg(im) {
    const af = this.ashF();
    const S = this.FOREST_STAGE;
    /* 지금 잿빛 깊이가 어느 두 단계 사이인가. 그림이 하나라도 없으면(애셋이 아직
       안 붙었거나 옛 저장본) 원본 한 장으로 떨어진다 — 색만 바뀌던 예전 동작이다. */
    let a = 0;
    while (a < S.length - 2 && af > S[a + 1][0]) a++;
    const dense = Sprites.img[S[a][1]], sparse = Sprites.img[S[a + 1][1]];
    const t = clamp((af - S[a][0]) / (S[a + 1][0] - S[a][0]), 0, 1);
    const ok = dense && dense.width && sparse && sparse.width;
    const key = ok ? S[a][1] + '|' + t.toFixed(2) : 'plain';
    if (af > 0.98 && !ok) return im;              // 다 빠졌다 — 원본이 곧 그 상태다
    if (this._fbg && this._fbg.key === key && Math.abs(this._fbg.f - af) < 0.004) return this._fbg.cv;
    const cv = this._fbg ? this._fbg.cv : document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    if (ok) {
      g.drawImage(sparse, 0, 0);
      g.globalAlpha = 1 - t; g.drawImage(dense, 0, 0); g.globalAlpha = 1;
    } else {
      g.drawImage(im, 0, 0);
    }
    const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      /* 밝기는 그대로 두고 색만 숲으로 되돌린다. 파랑을 너무 깎으면 안 된다 —
         원본 원경은 **푸른 안개**로 거리를 만든다(가까운 언덕이 (18,20,25)로
         하늘색에 가깝다). 파랑을 0.47 로 눌렀더니 그 언덕이 (12,29,12) 이 되어
         하늘과 대비가 확 올라갔고, 멀리 있던 언덕이 눈앞의 시커먼 초록 벽이
         됐다. 파랑을 남겨야 멀리 있는 것이 멀리 있어 보인다. */
      const l = px[i] * 0.30 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      /* 잿빛이 짙을수록 아주 조금 **들어 올린다.** 색만 빼면 뒤 배경이 장이 갈수록
         시커먼 잿덩이 한 장으로 가라앉는데, 실제로 재가 낀 하늘은 어두워지는 게
         아니라 뿌예진다. 세 채널에 같은 값을 더하므로 밝아지면서 동시에 채도가
         빠진다 — 그게 안개다. 14는 눈에 띄게 뿌예지되 그림이 뜨지는 않는 선이다. */
      const haze = af * 14;
      px[i] = Math.min(255, px[i] * af + (l * 0.60 + 4) * (1 - af) + haze);
      px[i + 1] = Math.min(255, px[i + 1] * af + (l * 1.10 + 8) * (1 - af) + haze);
      px[i + 2] = Math.min(255, px[i + 2] * af + (l * 0.78 + 9) * (1 - af) + haze);
    }
    g.putImageData(d, 0, 0);
    this._fbg = { key, cv, f: af };
    return cv;
  },

  /** 손그림 원경 — 두 겹으로 무한 스크롤. 그릴 수 없으면 false */
  /* ================= 원경을 불투명하게 =================

     원경은 **알파로** 멀리와 밤을 표현하고 있었다 — 먼 층은 늘 0.45, 그리고 두 층
     모두 밤이 될수록 0.42배까지 옅어졌다. 투명해진다는 것은 **뒤가 비친다**는
     뜻이다. 그래서 하늘에 떠 있는 해와 달이, 그리고 밤에는 별까지, 원경의 나무와
     능선을 그대로 뚫고 나왔다.

     멀리 있는 것이 흐려 보이는 까닭은 뒤가 비쳐서가 아니라 **사이에 낀 공기 색에
     씻겨서**다. 그러니 알파를 쓸 일이 아니라 그림을 하늘색 쪽으로 물들일 일이다.
     밤도 마찬가지 — 어두워지는 것이지 비치는 것이 아니다.

     물들인 판은 색이 바뀔 때만 다시 굽는다(하루에 몇 번). 층마다 칸을 따로 둔다 —
     한 칸으로 돌려 쓰면 먼 층과 가까운 층이 한 프레임에 번갈아 구워진다. */
  tintBg(src, slot, ck, haze, hazeAmt, darkAmt) {
    if (hazeAmt <= 0 && darkAmt <= 0) return src;
    const q = v => Math.round(v * 12) / 12;
    /* 색도 **뭉뚱그려서** 열쇠에 넣는다. 하늘색은 매 프레임 조금씩 바뀌므로 그대로
       쓰면 열쇠가 매번 달라져 1920×400 판을 프레임마다 다시 굽는다. 채널을 16단계로
       끊으면 하루에 몇 번만 굽는다(눈으로는 차이가 안 보인다). */
    const n = parseInt(haze.slice(1), 16);
    haze = '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map(v => (Math.round(v / 16) * 16 & 255).toString(16).padStart(2, '0')).join('');
    const key = ck + '|' + haze + '|' + q(hazeAmt) + '|' + q(darkAmt);
    this._bgT = this._bgT || [];
    const slotT = this._bgT[slot] = this._bgT[slot] || {};
    if (slotT.key === key && slotT.cv) return slotT.cv;
    const cv = slotT.cv || document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    const g = cv.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(src, 0, 0);
    /* source-atop — 그림이 있는 자리에만 색을 얹는다. 하늘이 보여야 할 빈 자리는
       그대로 비워 두어야 한다(여기까지 칠하면 하늘이 네모로 덮인다). */
    g.globalCompositeOperation = 'source-atop';
    if (hazeAmt > 0) { g.globalAlpha = q(hazeAmt); g.fillStyle = haze; g.fillRect(0, 0, cv.width, cv.height); }
    if (darkAmt > 0) { g.globalAlpha = q(darkAmt); g.fillStyle = '#0a0c14'; g.fillRect(0, 0, cv.width, cv.height); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    slotT.key = key; slotT.cv = cv;
    return cv;
  },

  /** 바이옴 → 원경 그림 열쇠. 전용 그림이 없는 바이옴은 가장 덜 어긋나는 것으로 떨어뜨린다 */
  bgKeyFor(b) {
    return b === 'ice' ? 'parallax_snow' : b === 'corrupt' ? 'parallax_corrupt' : b === 'desert' ? 'parallax_desert'
      // jungle·glowfen 전용 배경(parallax_jungle·parallax_glowfen)은 아직 그림이 없다.
      // 파일이 들어오면 매니페스트 등록만으로 자동 전환되게 먼저 시도하고, 없으면
      // (Sprites.img에 안 잡히면) forest로 대체한다 — 키를 무작정 바꾸면 그림이 오기
      // 전까지 절차 생성 배경으로 떨어져 오히려 지금보다 못해 보이므로 이렇게 갈랐다.
      : (b === 'jungle' && Sprites.img.parallax_jungle && Sprites.img.parallax_jungle.width) ? 'parallax_jungle'
      : (b === 'glowfen' && Sprites.img.parallax_glowfen && Sprites.img.parallax_glowfen.width) ? 'parallax_glowfen'
      /* 세션 3(바다·빙하)이 이 사슬에 빠져 있어서 **바다 위에 잿빛 숲 원경**이 떴다.
         전용 그림이 오면 저절로 바뀌게 먼저 시도하고, 없는 동안은 숲 대신 설원으로
         떨어뜨린다 — 바다·빙하 옆에 숲 지평선이 서는 것보다 훨씬 덜 어긋난다. */
      : (b === 'sea' && Sprites.img.parallax_sea && Sprites.img.parallax_sea.width) ? 'parallax_sea'
      : (b === 'glacier' && Sprites.img.parallax_glacier && Sprites.img.parallax_glacier.width) ? 'parallax_glacier'
      : (b === 'sea' || b === 'glacier') ? 'parallax_snow'
      : 'parallax_forest';
  },

  drawParallaxArt(c, camX, camY, f) {
    const p = this.player;
    const zone = this.world.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    let key;
    // 하늘 섬은 지하 깊이와 무관하게 전용 배경을 쓴다
    if (zone === 'sky') key = 'parallax_sky';
    /* ★ 땅속에서는 원경이 **한 픽셀도** 안 보인다 — 재서 확인한 것이다.
       원경은 벽지(walls)보다 먼저 깔리므로 벽지가 있으면 덮인다. 세 시드에서 지하
       구역의 빈 칸을 전부 세니 **벽지 없는 빈 칸이 하나도 없었다** — 지옥 82,455 중 0 ·
       폭주로 3,190 중 0 · 공창 2,404 중 0 · 설계실 1,753 중 0 · 유적 10,403 중 0.
       (하늘 섬은 3,605칸 전부가 벽지 없는 빈 칸이라 parallax_sky 만 실제로 보인다.)

       보이게 하려면 벽지에 구멍을 내야 하는데, 땅속은 갇혀 있다는 것 자체가 분위기라
       바위 너머로 먼 하늘이 비치면 바깥으로 뚫린 구멍이 된다 — 고치는 쪽이 더 나쁘다.
       그래서 **그림 파일은 남기고 부르지 않는다.** 다시 붙이고 싶어지면 위 숫자를
       먼저 다시 잴 것. */
    else if (camY > SURF_BASE * TS + 500) return true;
    /* 여명 마을·베이스캠프 둘 다 **숲 원경**을 쓴다.
       ★ 마을에는 전용 그림(parallax_village)이 있었는데 걷어냈다 — 그림 속 건물이
         실제 마을 건물과 겹쳐 두 겹으로 서 있었고, 마을에 들어서는 순간 뒤 배경이
         통째로 갈려서 "같은 땅"이라는 느낌이 끊겼다. 마을도 동쪽 숲 한복판이므로
         뒤에 서 있어야 하는 것은 그 숲이다(장이 지날수록 같이 잿빛이 된다).
         그림 파일은 지우지 않고 남겨 둔다 — 다시 쓰고 싶어지면 이 줄만 되살리면 된다. */
    else if (zone === 'village' || zone === 'camp') key = 'parallax_forest';
    /* 바이옴 원경은 경계 양쪽 BG_BAND 칸에 걸쳐 두 그림을 **섞는다**. 카메라 가운데 칸 하나로
       고르면 경계를 넘는 순간 뒤 배경이 통째로 바뀌어, 지형은 아직 정글(지형은 BIOME_BAND 104칸에
       걸쳐 섞인다)인데 뒤에는 사막 산이 섰다. 섞는 비중은 경계에서 0.5 — 어느 쪽에서 넘어도 같다. */
    let layers;
    if (key) layers = [[key, 1]];
    else {
      const w = this.world, tx = clamp(Math.floor((camX + this.W / 2) / TS), 0, WW - 1);
      const i = w.biomeIndexAt(tx), bi = BIOMES[i], BG_BAND = 48;
      let j = i, wt = 0;                                   // 이웃 바이옴과 그 비중
      if (i > 0 && tx - bi.x0 < BG_BAND) { j = i - 1; wt = 0.5 - (tx - bi.x0) / (2 * BG_BAND); }
      else if (i < BIOMES.length - 1 && bi.x1 - tx <= BG_BAND) { j = i + 1; wt = 0.5 - (bi.x1 - tx) / (2 * BG_BAND); }
      const ka = this.bgKeyFor(bi.id), kb = this.bgKeyFor(BIOMES[j].id);
      layers = (kb === ka || wt <= 0.01) ? [[ka, 1]] : [[ka, 1 - wt], [kb, wt]];
    }
    const parts = [];
    for (const [k, a] of layers) {
      const im = Sprites.img[k];
      if (!im || !im.width) continue;
      /* 잿빛 숲 원경만 장에 따라 색이 빠진다. 그림은 이미 다 죽은 회색으로 그려져 있어서
         — 그게 8장의 모습이다 — 여기서 같은 밝기의 숲색을 만들어 두고 잿빛만큼
         원본 쪽으로 되돌린다. 지형의 잎·풀과 같은 곡선을 타야 능선만 따로 노는 일이 없다. */
      parts.push({ key: k, a, im, src: k === 'parallax_forest' ? this.forestBg(im) : im });
    }
    if (!parts.length) return false;
    const af = '|' + Math.round(this.ashF() * 20);   // 숲 원경은 장마다 그림이 달라진다

    // 배경의 세로 위치는 camY(카메라의 실제 세계 y좌표) 하나로만 정한다. camY는 플레이어가
    // 점프해서 오르든, 지형이 솟아 걸어 올라가든 값이 똑같이 줄어든다 — 지형 고도가 오르면
    // camY가 줄고, 그만큼 baseY가 커져(=화면에서 더 아래로) 배경이 내려간다. 반대로 지형이
    // 꺼지면 camY가 늘고 baseY가 작아져 배경이 올라간다. X축과 같은 spd 비율로만 반영해
    // 갑자기 움직이지 않고 서서히 따라가게 한다.
    // 여기까지 오는 것은 전부 지상(또는 하늘 섬)이다 — 지하는 위에서 끝난다
    const ref = SURF_BASE * TS;
    const restY = TS * 7 + this.H / 2;    // camY가 기준 고도와 같을 때 배경이 놓일 화면 위치
    const refCamY = ref - this.H / 2;
    c.save();
    c.imageSmoothingEnabled = false;
    const haze = this.skyHaze || '#a8c8e0';
    const dark = (1 - f) * 0.58;          // 밤에는 어두워진다 — 옅어지는 게 아니라
    /* ★ 잿빛 숲의 먼 층이 **거의 흰색**이었다. 먼 층은 지평선 하늘색(낮 #a8c8e0)으로 55% 씻기는데,
       숲 원경은 그림 자체가 옅은 회색이라 씻고 나면 흰 종이처럼 떴다. 숲만 씻는 색을 푸른 녹회색
       쪽으로 당기고(하늘색 반 · 숲 그늘 반) 양을 줄여, 멀어도 숲의 색이 남게 한다.
       노을·밤에는 haze 자체가 물들므로 그 빛은 그대로 따라간다. */
    /* 먼 층은 느리고 흐리게, 가까운 층은 빠르고 진하게. 두 그림을 섞을 때는 **층 순서로** 그린다
       (둘의 먼 층 → 둘의 가까운 층) — 그림 순서로 그리면 뒤 그림의 먼 산이 앞 그림의 가까운 숲을 덮는다.
       물들인 판의 캐시 칸도 그림마다 따로(slot + 2·n) — 한 칸을 둘이 나눠 쓰면 매 프레임 다시 굽는다. */
    for (const [slot, spd, dy, sc] of [[0, 0.16, -54, 1.15], [1, 0.34, 0, 1]]) {
      parts.forEach((pt, n) => {
        const forest = pt.key === 'parallax_forest';
        const hz = slot === 0 ? (forest ? .40 : .55) : 0;
        const tint = slot === 0 && forest ? mixHex(haze, '#4f7a6a', 0.5) : haze;
        const IW = pt.im.width, IH = pt.im.height, w = IW * sc, h = IH * sc;
        const baseY = restY + (refCamY - camY) * spd;
        const img = this.tintBg(pt.src, slot + 2 * n, pt.key + af, tint, hz, dark);
        let ox = -((camX * spd) % w);
        if (ox > 0) ox -= w;
        c.globalAlpha = pt.a;
        for (let x = ox; x < this.W; x += w) c.drawImage(img, x, baseY - h + dy, w, h);
        // 사막 분지 같은 저지대에서는 카메라가 내려가면서 근경 이미지의 바닥이 화면 바닥보다
        // 위로 올라와, 그 아래로 빈 캔버스가 그대로 드러나는 틈이 생긴다. 이미지 맨 아래 한 줄
        // 픽셀(경계와 맞닿는 바로 그 색)만 그대로 늘려 붙여서 이어붙인 자리가 티나지 않게 한다.
        // (여러 줄을 통째로 늘리면 그 띠의 위쪽 끝이 경계에 오게 되어, 정작 경계와 맞닿는 색은
        //  이미지의 몇 픽셀 안쪽 색이 되어버려 오히려 거기서 다시 끊겨 보인다.)
        if (slot === 1 && baseY + dy < this.H) {
          for (let x = ox; x < this.W; x += w) c.drawImage(img, 0, IH - 1, IW, 1, x, baseY + dy, w, this.H - baseY - dy);
        }
      });
    }
    c.globalAlpha = 1;
    c.restore();
    return true;
  },

  /** 타일 광원값을 저해상도 알파맵으로 만들어 확대 — 계단 없는 부드러운 명암 */
  /** 바다 수면 한 칸. 파도는 **지나가는 물결**이어야 한다. 이제 큰 물결 하나가 실제로 옆으로 흘러가고, 그 위에 작은 물결과 아주 약한 칸별 흔들림만 얹는다. 색은
      **물 타일 그림을 그대로 잘라서** 쓴다 — 단색으로 칠했더니 아래 물과 색이 달라 수면 한 줄만 다른 물처럼 보였다.
      사연: docs/code-history.md#h65 */
  /* 날아가는 폭탄 그림. 셋을 한 가지 회색 공으로 그렸더니 무엇을 던졌는지
     화면만 보고는 알 수 없었다 — 반경도 부술 등급도 다른데 생김새가 같으면
     조준할 근거가 없다. 생김새(look)로 셋을 가른다.
       iron  폭탄      — 작은 무쇠 공, 짧은 심지
       keg   강력 폭탄 — 큰 통에 붉은 쇠테 두 줄, 긴 심지
       stick 굴착 폭탄 — 공이 아니라 황토색 막대 세 개를 묶은 다발
     심지 불티는 **남은 시간에 따라 빨라진다** — 곧 터진다는 걸 색이 아니라
     깜빡임 속도로 알린다. 구르는 동안 spin만큼 돌린다.
     불티는 처음에 회전 밖에서 그렸는데, 심지 끝은 돌고 불티는 안 돌아서 **불이 공
     위에 따로 떠 있는** 그림이 됐다. 심지와 같은 회전 안에서 끝점에 붙여 그린다. */
  drawBomb(c, b, sx, sy) {
    const sp = b.spec, look = sp.look || 'iron';
    const t = clamp(b.life / (sp.fuse || 1.6), 0, 1);        // 1 → 0 으로 탄다
    const lit = Math.sin(this.time * (10 + (1 - t) * 44)) > -0.2;
    const top = look === 'keg' ? 8 : look === 'stick' ? 8 : 6;   // 몸통 윗면
    const fl = look === 'keg' ? 9 : 7;                           // 심지 길이
    c.save();
    c.translate(sx, sy);
    c.rotate(b.spin);
    if (look === 'stick') {
      // 막대 다발 — 세 개를 나란히, 가운데를 띠로 묶었다
      for (let i = -1; i <= 1; i++) {
        c.fillStyle = i === 0 ? '#c8a058' : '#a8843f';
        c.fillRect(i * 5 - 2, -8, 4, 16);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(i * 5 + 1, -8, 1, 16);
      }
      c.fillStyle = '#5a4a2a'; c.fillRect(-8, -2, 16, 3);
    } else {
      const r = look === 'keg' ? 8 : 6;
      c.fillStyle = look === 'keg' ? '#4a3a30' : '#2e2c28';
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      // 어두운 굴 벽 앞에서 검은 공은 그냥 사라진다 — 얇은 테두리로 윤곽을 남긴다
      c.strokeStyle = 'rgba(220,210,190,.45)'; c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, r - 0.5, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.20)';                 // 윗쪽 반사 — 돌면 같이 돈다
      c.beginPath(); c.arc(-r * .32, -r * .34, r * .30, 0, TAU); c.fill();
      if (look === 'keg') {                                  // 붉은 쇠테 두 줄
        c.fillStyle = '#a83a2a';
        c.fillRect(-r, -r * .55, r * 2, 2); c.fillRect(-r, r * .18, r * 2, 2);
      }
    }
    // 심지와 불티 — 같은 회전 안에서 그려야 불이 심지 끝에 붙어 있다
    c.strokeStyle = '#8a7a5a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -top); c.lineTo(2, -top - fl); c.stroke();
    c.lineWidth = 1;
    if (lit) {
      const r = look === 'keg' ? 2.6 : 2.0;
      c.fillStyle = '#ffd24a';
      c.globalAlpha = .28; c.beginPath(); c.arc(2, -top - fl, r * 2.2, 0, TAU); c.fill();
      c.globalAlpha = 1;  c.beginPath(); c.arc(2, -top - fl, r, 0, TAU); c.fill();
    }
    c.restore();
  },

  /** 바다 수면 칸에서 물이 차 있는 높이(0~1, 칸 아래에서부터). 그리기(drawWave)와
      뜨는 것(entity.js Drop·헤엄 부력)이 **같은 식**을 써야 물건이 파도와 같이 오르내린다.
      tx 는 소수도 받는다 — 칸 가운데가 아니라 몸 가운데의 물결을 따라가야 매끄럽다. */
  waveFrac(tx) {
    const t = this.time;
    const K = 0.34, W = 1.15;                             // 물결의 공간 주파수 · 진행 속도
    const main = Math.sin(tx * K - t * W);                // 지나가는 큰 물결
    const sub = Math.sin(tx * K * 2.7 - t * W * 1.6) * 0.32;   // 잔물결
    const jit = (tileHash(Math.floor(tx), 0) - 0.5) * 0.12;    // 칸마다 아주 약한 흔들림
    return clamp(0.66 + (main * 0.68 + sub + jit) * 0.32, 0.34, 1);
  },
  /** 이 열의 수면이 화면(세계) 몇 px 에 있나 — 수면 칸 ty 를 알 때. 바다 수면은 물결을,
      호수·흐르는 물은 칸 위쪽(흐르는 물은 수위)을 돌려준다. */
  surfacePx(tx, ty) {
    const w = this.world, t = w.get(Math.floor(tx), ty);
    if (t === T.SEAWATER) return (ty + 1) * TS - this.waveFrac(tx) * TS;
    if (FLUID_FLOW[t] && w.flv) return (ty + 1) * TS - (w.flv[ty * WW + Math.floor(tx)] || 8) / 8 * TS;
    return ty * TS;
  },

  drawWave(c, tx, ty, sx, sy, wl) {
    const t = this.time;
    const hFrac = this.waveFrac(tx);
    const h = Math.max(3, Math.round(hFrac * TS));
    const top = sy + TS - h;
    // 물 타일 그림을 파도 높이만큼만 잘라 그린다 (색·결이 아래 물과 같아진다)
    const an = TileArt.ANIM[T.SEAWATER];
    const v = an ? ((((t * an.fps) + tx * 0.7 + ty * 0.4) | 0) % an.fr) : 0;
    c.save();
    c.beginPath(); c.rect(sx, top, TS, h); c.clip();
    /* 물 타일은 반투명(a:1)이라 **뒤에 벽을 먼저 깔아야** 아래 물칸과 같은 색이 된다.
       이 한 줄을 빠뜨려서 수면 줄만 벽 없이 그려졌고, 그래서 아무리 같은 타일을 잘라
       써도 색이 계속 달랐다(렌더 루프는 continue 앞에서 벽을 깔지 못한다). */
    if (wl) { TileArt.drawWall(c, wl, v, sx, sy); TileArt.drawWall(c, wl, v, sx, sy + TS); }
    TileArt.draw(c, T.SEAWATER, v, sx, sy);
    // 타일 한 칸보다 파도가 낮으면 아래가 비므로, 잘라낸 만큼 한 칸 더 아래에서 끌어온다
    TileArt.draw(c, T.SEAWATER, v, sx, sy + TS);
    c.restore();
    // 마루 — 밝은 선 한 줄. 세게 넣으면 수면만 다른 물처럼 보여서 아주 옅게만
    c.globalAlpha = 0.26; c.fillStyle = shade(ART[T.SEAWATER].c, 1.8);
    c.fillRect(sx, top, TS, 1.5);
    c.globalAlpha = 1;
  },

  /** 흐르는 액체 한 칸 — 고인 것과 **같은 그림**을 수위만큼 잘라 그린다.
      위에서 같은 액체가 내려오고 있거나 수위 8(떨어지는 중)이면 칸을 꽉 채운다. */
  drawFlow(c, w, id, k, tx, ty, sx, sy) {
    const kind = FLUID_KIND[id], lv = w.flv ? (w.flv[k] || 7) : 7;
    const full = lv >= 8 || FLUID_KIND[w.tiles[k - WW]] === kind;
    const src = kind === 1 ? T.WATER : kind === 2 ? T.SEAWATER : T.LAVA;
    /* 떨어지는 물도 고인 물 그림 그대로 — 물줄기 그림은 폭포(FALLS)만 쓴다(world._fallsCol 의 ★) */
    const art = src;
    const an = TileArt.ANIM[art];
    const v = an ? ((((this.time * an.fps) + tx * 0.7 + ty * 0.4) | 0) % an.fr) : 0;
    const h = full ? TS : Math.max(3, Math.round(TS * lv / 8));
    c.save();
    c.beginPath(); c.rect(sx, sy + TS - h, TS, h); c.clip();
    TileArt.draw(c, art, v, sx, sy);
    c.restore();
    if (!full) {                                          // 얇은 수면 — 흐르는 결이 보이게 한 줄
      c.globalAlpha = 0.28; c.fillStyle = kind === 3 ? '#ffd27a' : '#dff2ff';
      c.fillRect(sx, sy + TS - h, TS, 1);
      c.globalAlpha = 1;
    }
  },

  /** 폭포 밑 물보라 — 물줄기가 수면·바닥에 닿는 칸에서 물방울이 튄다. 화면 안만 본다.
      폭포는 소리(music.js)만 있고 떨어지는 자리에 아무 일도 안 일어나서, 물줄기가 수면에
      그냥 꽂혀 사라지는 그림이었다. */
  updateFalls(dt) {
    this._fallsT = (this._fallsT || 0) - dt;
    if (this._fallsT > 0) return;
    this._fallsT = 0.08;
    const w = this.world, cam = this.cam;
    const tx0 = Math.max(1, Math.floor(cam.x / TS)), tx1 = Math.min(WW - 2, Math.ceil((cam.x + this.W) / TS));
    const ty0 = Math.max(1, Math.floor(cam.y / TS)), ty1 = Math.min(WH - 2, Math.ceil((cam.y + this.H) / TS));
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const k = ty * WW + tx, t = w.tiles[k];
        if (t !== T.FALLS) continue;                       // 폭포 판정(world._fallsCol)을 받은 줄기만
        const b = w.tiles[k + WW];
        if (b === T.FALLS || (FLUID_FLOW[b] && w.flv[k + WW] >= 8)) continue;   // 아직 떨어지는 중
        if (Math.random() > 0.55) continue;
        const px = (tx + Math.random()) * TS, py = (ty + 1) * TS - 2;
        this.parts.push(new Part(px, py, Math.random() < 0.5 ? '#dff2ff' : '#9fd0f0', -150, 0.45, { g: 0.9, sq: 0, r: 0.7, spd: 0.8 }));
        if (Math.random() < 0.3)                             // 물안개 — 느리게 떠오른다
          this.parts.push(new Part(px, py - 4, 'rgba(220,240,255,.5)', -30, 1.0, { g: -0.15, sq: 0, r: 1.8, spd: 0.25, drag: 0.9 }));
      }
  },

  /** 빛 색 — 빛나는 타일(data.js LIGHT_SPEC) 둘레에 제 색의 번짐을 **더하기**로 얹는다.
      조명 계산은 세기 하나뿐이라 수정도 횃불도 같은 흰빛이었다. 어두운 데서 더 잘 보이게
      어둠(조명 덮개) **위에** 칠한다. 번짐은 색·반지름마다 한 장씩 만들어 두고 찍기만 한다. */
  drawGlow(c, camX, camY, tx0, ty0, tx1, ty1) {
    const w = this.world;
    this._glowC = this._glowC || {};
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let ty = Math.max(0, ty0 - 2); ty <= Math.min(WH - 1, ty1 + 2); ty++)
      for (let tx = Math.max(0, tx0 - 2); tx <= Math.min(WW - 1, tx1 + 2); tx++) {
        const d = TILE_DEF[w.tiles[ty * WW + tx]];
        if (!d.lc) continue;
        const r = Math.round(10 + d.light * 5);
        const key = d.lc + r;
        let g = this._glowC[key];
        if (!g) {
          g = document.createElement('canvas'); g.width = g.height = r * 2;
          const gc = g.getContext('2d'), gr = gc.createRadialGradient(r, r, 0, r, r, r);
          gr.addColorStop(0, d.lc + '66'); gr.addColorStop(0.45, d.lc + '22'); gr.addColorStop(1, d.lc + '00');
          gc.fillStyle = gr; gc.fillRect(0, 0, r * 2, r * 2);
          this._glowC[key] = g;
        }
        c.globalAlpha = Math.min(1, 0.4 + d.light * 0.03);
        c.drawImage(g, tx * TS + TS / 2 - camX - r, ty * TS + TS / 2 - camY - r);
      }
    c.restore();
  },
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
      /* ★ 체력 문턱(66%/33%)을 여기서 다시 계산하면 안 된다. 보스가 전부 3페이즈일 때는
         우연히 맞지만, 페이즈 수가 보스마다 달라지면 그림과 실제 마디가 어긋난다
         (미니보스는 마디 둘에 그림 셋, 5페이즈는 마디 다섯에 그림 세 벌).
         e.phase 를 그대로 쓰고 시트가 가진 벌 수에 비례해 나눈다. */
      const m = Sprites.meta && Sprites.meta.bosses.sheets[e.type];
      /* ★ 시트 끝의 **쓰러지는 칸**(death)은 마디가 아니다. 안 빼면 칸이 둘
         늘어난 만큼 마디가 하나 더 있는 줄 알고, 마지막 마디에서 살아 있는
         보스가 무너진 그림으로 서 있게 된다. */
      const idle = m ? m.count - (m.death || 0) : 6;
      const pairs = m ? Math.max(1, Math.floor(idle / 2)) : 3;   // 시트에 든 페이즈 그림 벌 수
      /* 비율로 나누므로 2페이즈는 **첫 벌과 마지막 벌**을 쓴다(가운데를 쓰면 두 마디
         차이가 가장 작은 두 그림이 된다). 3페이즈는 0·1·2 그대로. 5페이즈는 세 벌을
         다섯 마디에 편다 — 시트를 10장으로 다시 구울 때까지의 가림막이다. */
      const sp = Math.min(pairs - 1, Math.round((e.pf || 0) * (pairs - 1)));
      return sp * 2 + (Math.floor(this.time * 2.5) % 2);
    }
    /* ★ 공격 직후는 atkPose 로 본다. atkCd 는 화살·마법을 쏘는 놈만 쓰는 값이라 접촉으로
       때리는 근접 몹은 늘 0 이었고, 프레임 4(공격 그림)를 한 번도 못 보여 주고 있었다. */
    if (e.atkPose > 0) return 4;
    if (Math.abs(e.vx) > 6) return 2 + (Math.floor(this.time * 7) % 2);
    return Math.floor(this.time * 2.4) % 2;
  },

  /* ================= 문 그리기 =================
     문은 널판 **한 장**이다. 닫히면 문틀을 채우고, 열리면 경첩을 축으로 옆으로 젖혀져
     좁아진다 — 좁아지는 쪽이 곧 경첩 쪽이라 어느 쪽으로 열렸는지가 한눈에 보인다.
     경첩은 o.dir(놓을 때 바라본 쪽) 가장자리에 서므로, 한 자리에 달아도 양쪽 중
     어느 쪽으로든 열린다.

     ★ 판정과 그림이 같은 것을 말해야 한다.
     ★ 끝까지 좁히지 않는다. 읽을 수 있는 폭에서 멈추고 남은 구간은 흐려지는 데 써서,
       다 열린 문은 아무것도 안 그린다(실오라기 한 줄은 보이지도 않으면서 문틀 옆에
       뭔가 낀 것처럼만 보인다).
     손잡이는 obj/door.png 것을 그대로 쓴다 — 경첩 반대쪽이라 젖혀질수록 먼저 말려 든다.
     사연: docs/code-history.md#h66 */
  drawDoor(c, o, sx, sy, f) {
    // 성문(gate)은 세로 3칸이라 집 문 그림을 쓰면 늘어난다 — 각자 제 그림이 있다
    const im = this.spritesOn && Sprites.img[o.gate ? 'obj_gate' : 'obj_door'];
    const sw = o.sw === undefined ? (o.closed ? 0 : 1) : o.sw;   // 0 닫힘 → 1 열림
    const hinge = o.dir === -1 ? -1 : 1;          // 경첩이 선 가장자리 (-1 왼쪽 / +1 오른쪽)
    c.save();
    c.imageSmoothingEnabled = false;
    // 열린 만큼 드러나는 문틀 안쪽 — 문짝 뒤로 먼저 깔아야 틈이 어둡게 읽힌다
    if (sw > 0.02) {
      c.globalAlpha = sw * 0.5;
      c.fillStyle = '#140e08'; c.fillRect(sx, sy, o.w, o.h);
      c.globalAlpha = 1;
    }
    /* ★ 끝까지 좁히지 않는다. 2.5px 짜리 마지막 한 장은 널도 경첩도 손잡이도 한 픽셀씩이라
       아무것도 안 보이는 실오라기 한 줄로만 읽힌다. 읽을 수 있는 폭(6px)에서 멈추고 남은
       구간은 사라지는 데 쓴다 — 다 열린 문은 아무것도 그리지 않는다. */
    const flat = Math.max(6, o.w * 0.28);         // 더는 안 좁아지는 폭
    const FADE = 0.82;                            // 여기까지 좁히고, 남은 구간은 흐려진다
    const alpha = 1 - clamp((sw - FADE) / (1 - FADE), 0, 1);
    if (alpha <= 0.02) { c.restore(); return; }   // 다 열림 — 마지막 한 장은 그리지 않는다
    const wN = o.w + (flat - o.w) * Math.min(1, sw / FADE);
    // 문틀 밖으로 젖혀 나가는 만큼 — 다 열린 문짝이 문틀 경계에 **걸쳐** 서는 정도로만.
    // 더 밀면 옆 칸 한가운데에 가서 서서, 옆 칸을 차지한 것처럼 보인다.
    const out = o.w * 0.12 * sw;
    const x = hinge < 0 ? sx - out : sx + o.w - wN + out;
    c.globalAlpha = alpha;
    if (im && im.width) {
      /* 그림은 경첩이 **왼쪽**에 있는 문이다(손잡이가 오른쪽). 오른쪽 경첩이면
         좌우를 뒤집어 경첩이 젖혀지는 쪽으로 오게 한다 — 원래 코드도 이 한 줄로
         경첩 쪽을 갈랐다. 젖혀질수록 가로로만 눌리므로 손잡이가 먼저 말려 든다. */
      c.save();
      if (hinge > 0) { c.translate(x + wN, sy); c.scale(-1, 1); } else c.translate(x, sy);
      c.drawImage(im, 0, 0, im.width, im.height, 0, 0, wN, o.h);
      c.restore();
    } else {
      c.fillStyle = shade('#3a2610', f); c.fillRect(x, sy, wN, o.h);
      c.fillStyle = shade('#5a3c22', f);
      c.fillRect(x + 1, sy + 1, Math.max(1, wN - 2), o.h - 2);
      c.fillStyle = shade('#6f4c2c', f);
      for (let i = 1; i < 4; i++) c.fillRect(x + 1, sy + i * o.h / 4, Math.max(1, wN - 2), 1.6);
      /* 손잡이 — 경첩 반대쪽. 굵기를 문짝 안으로 묶어 둔다(고정 폭으로 두면 다
         젖혀진 문짝보다 손잡이가 넓어져 놋쇠만 허공에 뜬다). */
      const hw = Math.min(2.6, Math.max(0, wN - 3));
      if (hw > 0.4) {
        const hx = hinge < 0 ? x + wN - 1.4 - hw : x + 1.4;
        const hy = sy + o.h * (o.gate ? 0.56 : 0.5) - 2.2;
        c.globalAlpha = alpha * Math.min(1, hw / 1.6);
        c.fillStyle = shade('#d8a94b', f); c.fillRect(hx, hy, hw, 4.4);
        if (hw > 1.8) {
          c.fillStyle = shade('#3a2610', f);
          c.fillRect(hx + hw * .27, hy + 1.3, hw * .46, 1.8);
        }
        c.globalAlpha = alpha;
      }
    }
    // 젖혀진 문짝의 앞모서리 — 두께가 보이는 자리라 한 줄 어둡게 닫는다
    if (sw > 0.05) {
      c.globalAlpha = alpha * 0.55;
      c.fillStyle = '#140e08';
      c.fillRect(hinge < 0 ? x + wN - 1.2 : x, sy, 1.2, o.h);
    }
    c.restore();
  },

  /** 여명 마을 시설물 — 손그림 애셋이 있으면 그것으로, 없으면 절차 렌더로 폴백 */
  drawFacility(c, o, sx, sy, f) {
    const t = this.time;
    if (o.type === 'door') { this.drawDoor(c, o, sx, sy, f); return; }
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
      /* 손그림은 1프레임(정지)과 2프레임(움직임) 둘 다 받는다.
         **프레임 수는 매니페스트가 아니라 비율로 알아낸다** — 가로가 규격 비율의
         꼭 두 배면 두 칸짜리 시트다. 이렇게 해야 새 그림을 넣는 날 매니페스트를
         같이 고치는 걸 잊어도 저절로 맞고, 옛 1프레임 그림도 그대로 돈다.
         2프레임이면 물도 그림이 맡으므로 절차 생성 물기둥을 덧그리지 않는다 —
         겹쳐 그리면 물이 두 겹으로 흐른다. */
      const im = this.spritesOn && Sprites.img.obj_fountain;
      if (im && im.width) {
        const want = o.w / o.h;
        const frames = Math.abs(im.width / im.height - want) < 0.03 ? 1
          : Math.abs(im.width / 2 / im.height - want) < 0.03 ? 2 : 0;
        if (frames) {
          const fw = im.width / frames;
          const fr = frames > 1 ? (((this.time * 3.5) | 0) % frames) : 0;
          c.save(); c.imageSmoothingEnabled = false;
          c.drawImage(im, fr * fw, 0, fw, im.height, Math.round(sx), Math.round(sy), o.w, o.h);
          c.restore();
          if (frames === 1) this.drawFountainWater(c, o, sx, sy);
          return;
        }
      }
      // 좌우 대칭은 중심(mx)에서 재서 애초에 대칭으로 그린다 — 사연: docs/code-history.md#h67
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
      this.drawFountainWater(c, o, sx, sy);
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
    } else if (o.type === 'anvil') {
      /* 강화 모루 — 재련대(붉게 달아오른 화덕)와 한눈에 구분되어야 한다. 같은 방에 나란히 서기 때문이다. 이쪽은 불이 아니라 **쇠와 망치**다. 자리는
         2×2칸(44×44)을 잡지만 **그림은 그 칸을 다 쓰지 않는다** — 모루는 낮고 넓은 물건이라 2×1에서 위로 조금 올라온 정도(칸 높이의 60%쯤)까지만
         차고, 나머지 위쪽은 비운다. 망치도 그 안에서 오르내린다.
         사연: docs/code-history.md#h68 */
      if (Sprites.drawObj(c, 'obj_anvil', sx, sy, o.w, o.h)) return;
      const W = o.w, H = o.h;
      const hb = Math.abs(Math.sin(t * 3.4));                     // 망치질 — 위아래로
      c.fillStyle = shade('#4a3a26', f);                          // 나무 그루터기
      c.fillRect(sx + W * 0.16, sy + H * 0.78, W * 0.68, H * 0.22);
      c.fillStyle = shade('#3a2c1c', f);
      c.fillRect(sx + W * 0.16, sy + H * 0.78, W * 0.68, 2);
      c.fillStyle = shade('#2e2e36', f);                          // 모루 허리
      c.fillRect(sx + W * 0.32, sy + H * 0.66, W * 0.36, H * 0.13);
      c.fillStyle = shade('#5d5d68', f);                          // 모루 상판
      c.fillRect(sx + W * 0.16, sy + H * 0.55, W * 0.68, H * 0.12);
      c.beginPath();                                              // 한쪽 뿔
      c.moveTo(sx + W * 0.16, sy + H * 0.55);
      c.lineTo(sx + W * 0.02, sy + H * 0.605);
      c.lineTo(sx + W * 0.16, sy + H * 0.67); c.fill();
      c.fillStyle = shade('#7a7a88', f);                          // 상판 윗면 빛
      c.fillRect(sx + W * 0.16, sy + H * 0.55, W * 0.68, 2);
      // 망치 — 상판 **바로 위**에서 오르내린다. 위쪽 빈 칸으로 올라가지 않는다
      const hy = sy + H * 0.24 + hb * H * 0.14;
      c.fillStyle = shade('#8a7a5a', f);
      c.fillRect(sx + W * 0.50 - 1, hy + H * 0.08, 3, H * 0.17);  // 자루
      c.fillStyle = shade('#9a9aa6', f);
      c.fillRect(sx + W * 0.38, hy, W * 0.26, H * 0.08);          // 머리
      if (hb > 0.9) {                                             // 내리친 순간에만 불똥
        c.globalAlpha = 0.85; c.fillStyle = '#ffd24a';
        c.fillRect(sx + W * 0.30, sy + H * 0.52, 2, 2);
        c.fillRect(sx + W * 0.64, sy + H * 0.50, 2, 2);
        c.globalAlpha = 1;
      }
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
      /* 침대 — 다리 밑면이 항상 sy+o.h(바닥선)에 닿는다. 매트리스가 몸통 안쪽에 뜨면
         바닥과 안 이어진 상자처럼 보인다. 옆에서 본 모양으로 그린다. */
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
  /** 펫 — 손그림 시트가 있으면 그것으로, 없으면 itemart 의 절차 생성 아이콘으로.
      (OS 이모지를 글자로 찍으면 폰트마다 모양이 달라진다) */
  drawPet(c, pet, camX, camY) {
    const sx = Math.round(pet.x - camX), sy = Math.round(pet.y - camY);
    const S = 20;
    c.save();
    c.imageSmoothingEnabled = false;
    // 공격 직후 잠깐 밝게 — 뭘 하고 있는지 눈에 보이게
    if (pet.flash > 0) { c.shadowColor = pet.def.c; c.shadowBlur = 10; }
    /* 손그림 시트가 있으면 그쪽을 쓴다.
       ★ 펫 시트는 **세 칸뿐이다**(idle1 · idle2 · atk). 펫은 죽지 않고(Pet 에 체력도
         die() 도 없다) 걷는 그림도 안 쓰므로, 다른 생물의 일곱 칸 규격에서 걷는 칸과
         죽는 칸을 떼어 냈다. 아무도 안 보는 칸이라 깨진 채로
         남아 있었다 — 안 그리는 그림은 아예 두지 않는다.
       칸 크기는 시트에 적힌 값으로 재서 가운데를 맞춘다(펫마다 크기가 달라도 안 흔들리게). */
    const sheet = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets['pet_' + pet.id];
    if (sheet) {
      const fr = pet.flash > 0 ? 2 : (Math.floor(this.time * 3 + pet.slot) % 2);
      if (Sprites.draw(c, 'pet_' + pet.id, fr, sx - sheet.frameW / 2, sy - sheet.frameH / 2, pet.facing < 0)) {
        c.restore(); return;
      }
    }
    if (pet.facing < 0) { c.translate(sx * 2, 0); c.scale(-1, 1); }
    Art.draw(c, 'p:' + pet.id, sx - S / 2, sy - S / 2, S);
    c.restore();
  },

  /* ================= 특별한 스킬의 고유 연출 =================
     비싼 스킬 다섯만 제 그림을 갖는다. 한도는 data.js 의 SIG_FX 한 표에 있다.
     ★ 수명은 **바닥 쪽에서만** 깎는다. 하늘 쪽(fall)에서 또 깎으면 두 배로 빨리 사라진다. */
  drawSigGround(c, camX, camY) {
    if (!this.sigs || !this.sigs.length) return;
    const fs = this.fxScale();
    for (let i = this.sigs.length - 1; i >= 0; i--) {
      const s = this.sigs[i];
      s.t -= 1 / 60;
      if (s.t <= 0) { this.sigs.splice(i, 1); continue; }
      const k = s.t / s.max, x = s.x - camX, y = s.y - camY;
      if (s.k === 'band') {
        /* 유성 화살비가 떨어질 띠. 실제 퍼짐(±130)과 같은 폭이라 보이는 대로 떨어진다.
           채우지 않고 바닥선 + 눈금만 — 이 아래 서 있는 적이 다 보여야 한다. */
        /* 처음에 가장 진하고 화살이 다 떨어질 때까지 옅어진다.
           ★ 유격의 초록(#9fe07a)을 **풀밭 위**에 그으면 픽셀로는 그려져 있는데(재 보니
             294픽셀) 눈에는 안 띈다. 어두운 밑줄을 먼저 깔아야 풀·돌·눈 어디에서나
             읽힌다 — 색만 바꾸면 다른 지형에서 같은 문제가 난다. */
        const a = SIG_FX.rain.a * Math.min(1, 0.35 + k);
        const line = () => {
          c.beginPath(); c.moveTo(x - s.hw, y); c.lineTo(x + s.hw, y); c.stroke();
          for (let j = -3; j <= 3; j++) {
            const tx = x + (s.hw / 3) * j;
            c.beginPath(); c.moveTo(tx, y - 16); c.lineTo(tx, y - 4); c.stroke();   // 내려오는 방향
            c.beginPath(); c.moveTo(tx - 3.5, y - 8); c.lineTo(tx, y - 4); c.lineTo(tx + 3.5, y - 8); c.stroke();
          }
        };
        c.lineJoin = 'round'; c.lineCap = 'round';
        c.globalAlpha = a * 0.8; c.strokeStyle = '#12100c'; c.lineWidth = 4.5; line();
        c.globalAlpha = a; c.strokeStyle = s.c; c.lineWidth = 2; line();
        c.lineCap = 'butt';
      } else if (s.k === 'sigil') {
        /* 소환 문양 — 안으로 **조여드는** 고리. 이 게임의 다른 고리는 전부 퍼지므로
           방향이 반대인 것만으로 "나가는 것이 아니라 오는 것"으로 읽힌다. */
        const a = SIG_FX.wolf.a * Math.min(1, k * 1.6);
        const rune = () => {
          c.beginPath(); c.arc(x, y, s.r * (0.25 + k * 0.75), 0, TAU); c.stroke();
          c.beginPath(); c.arc(x, y, s.r * 0.34, 0, TAU); c.stroke();
          c.beginPath();
          for (let j = 0; j < 6; j++) {                                      // 육각 룬
            const ang = -Math.PI / 2 + j * TAU / 6, rr = s.r * 0.34;
            j ? c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr)
              : c.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
          }
          c.closePath(); c.stroke();
        };
        c.lineJoin = 'round';
        c.globalAlpha = a * 0.75; c.strokeStyle = '#12100c'; c.lineWidth = 4; rune();   // 밑줄 — 밝은 바닥에서도 읽힌다
        c.globalAlpha = a; c.strokeStyle = s.c; c.lineWidth = 2; rune();
      } else if (s.k === 'flash') {
        /* 착탄 섬광. 화면을 덮는 쪽이라 알파를 SIG_FX.flash.a(0.2)로 묶고 '화면 효과'
           설정에 함께 걸어 둔다 — 0%면 아예 안 나온다. */
        const a = SIG_FX.flash.a * fs * k;
        if (a > 0.004) {
          const g = c.createRadialGradient(x, y, 0, x, y, s.r);
          g.addColorStop(0, s.c); g.addColorStop(1, 'transparent');
          c.globalAlpha = a; c.fillStyle = g;
          c.beginPath(); c.arc(x, y, s.r, 0, TAU); c.fill();
        }
      }
      c.globalAlpha = 1; c.lineWidth = 1;
    }
  },

  /** 떨어지는 별. 겨눈 자리 위 700px 에서 0.9초 동안 내려온다 — 예고와 착탄 사이가 비어 있었다 */
  drawSigSky(c, camX, camY) {
    if (!this.sigs) return;
    for (const s of this.sigs) {
      if (s.k !== 'fall') continue;
      const k = 1 - s.t / s.max;                       // 0 -> 1 로 내려온다
      /* ★ 높이 700 · 가속 k² 로 두었더니 0.9초 중 **0.6초를 화면 위 밖**에서 보냈다 —
         재 보니 0.5초 시점에 목표보다 483px 위, 화면(720px) 밖이었다. 420 · k^1.5 면
         0.25초쯤 화면에 들어와 나머지를 내려오는 것이 다 보인다. */
      const e = Math.pow(k, 1.5);
      const x = s.x - 150 * (1 - e) - camX, y = s.y - 420 * (1 - e) - camY;
      const a = SIG_FX.fall.a;
      c.save();
      c.globalAlpha = a * 0.5; c.strokeStyle = s.c; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x + 54, y - 150); c.lineTo(x, y); c.stroke();   // 꼬리 — 내려오는 각과 같게
      c.globalAlpha = a; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 22, y - 62); c.lineTo(x, y); c.stroke();    // 꼬리 심
      c.fillStyle = '#fff6dc'; c.globalAlpha = a;
      c.beginPath(); c.arc(x, y, 5 + k * 3, 0, TAU); c.fill();                // 머리 — 가까워지며 커진다
      c.restore();
      c.globalAlpha = 1; c.lineWidth = 1;
    }
  },

  /** 회오리 검무 — 도는 동안 칼선 둘. 선만 쓰므로 붙어 있는 적이 그대로 보인다 */
  drawWhirlArc(c, p, camX, camY) {
    const ch = p.channel;
    if (!ch || ch.id !== 's_whirl') return;
    const x = p.cx - camX, y = p.cy - camY, a = this.time * 13;
    const fade = Math.min(1, ch.t / 0.25);             // 끝맺을 때 사라진다
    c.save();
    c.lineCap = 'round';
    for (let j = 0; j < 2; j++) {
      const ang = a + j * Math.PI;
      c.globalAlpha = SIG_FX.whirl.a * fade;
      c.strokeStyle = '#ffcf6a'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, y, 96, ang, ang + 1.1); c.stroke();             // 96 = 실제 피해 반경
      c.globalAlpha = SIG_FX.whirl.a * fade * 0.45;
      c.lineWidth = 8;
      c.beginPath(); c.arc(x, y, 96, ang - 0.5, ang); c.stroke();             // 지나간 자취
    }
    c.restore();
    c.globalAlpha = 1; c.lineWidth = 1;
  },

  /* ---- 캐릭터 렌더 ---- */
  /* ================= 별 조각 궤도 (세션 1) =================
     장식이 아니라 **진행 표시**다. 한 장을 끝낼 때마다 조각 하나가 늘어 플레이어
     둘레를 돈다. 처음부터 다섯이 떠 있으면 아무 뜻이 없으므로 하나씩 붙는다.

     지켜야 할 것 — 전투를 가리지 않는다. 그래서
       · 플레이어보다 **먼저** 그린다(몸 뒤로 지나간다)
       · 작고(2.6px) 느리다(한 바퀴 9초)
       · 판정이 없다. 부딪히지도, 맞지도 않는다
     세션 2로 넘어가면(추적자 이후) 아주 희미해진다. 계속 돌면 주제가 안 바뀐다.

     ★ 그림은 아직 임시다. assets 에 'star_frag' 가 들어오면 그 자리에서 갈아 끼운다
       — 아래 im 분기 한 곳만 살아나고 나머지 배치·속도·밝기는 그대로 쓴다. */
  drawStarOrbit(c, p, camX, camY) {
    const n = p.starOrbits | 0;
    if (!n) return;
    const t = this.time;
    const cx = p.cx - camX, cy = p.cy - camY - 4;
    // 5장을 끝내면 다섯이 한 점으로 모였다가 다시 퍼진다 — 5장 outro 와 같은 사건이다
    const mg = this.starMerge > 0 ? Math.min(1, this.starMerge / this.STAR_MERGE) : 0;
    /* 8장 — 하늘로 돌아간다. 두 마디다:
         모임(0~1.1초)  궤도 반지름이 0 으로 줄고 머리 위 한 점으로 붙는다
         상승(1.1~3.5초) 가속하며 위로 빠져나간다(k²). 올라갈수록 작아지고 옅어진다
       궤도 계산은 아래 for 문 하나뿐이라, 여기서 반지름·중심·크기만 손보면
       그림이 있든 없든(spr 분기) 양쪽 다 저절로 따라온다. */
    let riseY = 0, riseK = 0, riseFade = 1;
    if (this.starRise) {
      const s = this.starRise;
      if (s.t < this.STAR_GATHER) {
        riseK = s.t / this.STAR_GATHER;            // 0 → 1 로 모인다
      } else {
        riseK = 1;
        const k = (s.t - this.STAR_GATHER) / this.STAR_RISE;
        riseY = -k * k * 900;                      // 가속하며 위로
        riseFade = Math.max(0, 1 - k * k * 1.15);
      }
    }
    const gather = Math.max(mg * 0.92, riseK);
    const rx = (30 + Math.sin(t * 0.7) * 1.5) * (1 - gather);
    const ry = rx * 0.42;
    const lit = p.starLit ? 1 : 0;
    const base = p.starFade ? 0.18 : (0.5 + lit * 0.25);
    const spr = this.spritesOn && typeof Sprites !== 'undefined'
      && Sprites.img && Sprites.img.proj_starfrag && Sprites.img.proj_starfrag.width;

    c.save();
    // 그림이 있으면 제 색으로(금빛이 하얗게 날아가지 않게), 없으면 빛으로 겹쳐 그린다
    if (!spr) c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = t * 0.7 + i * TAU / Math.max(n, 1);
      let x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry + riseY;
      /* 방금 얻은 조각(마지막 하나)은 3초에 걸쳐 위에서 내려와 궤도에 앉는다 — 얻는 장면. */
      if (this.starGain && i === n - 1) {
        const gk = Math.min(1, this.starGain.t / this.starGain.dur);
        const ease = 1 - Math.pow(1 - gk, 3);        // 빨리 내려와 천천히 앉는다
        y -= (1 - ease) * 240;
        x += (1 - ease) * 40;
      }
      // 뒤로 돌 때는 옅게 — 그래야 도는 것으로 보인다. 다 모인 뒤에는 앞뒤가 없다
      const back = (riseK > 0.9 || Math.sin(a) >= 0) ? 1 : 0.45;
      const r = (2.6 + mg * 2.2 + riseK * 1.6) * (0.85 + 0.15 * Math.sin(t * 3 + i));
      c.globalAlpha = (base * back * (0.7 + 0.3 * Math.sin(t * 2.4 + i * 1.7))
                       + mg * 0.35 + riseK * 0.4) * riseFade;
      if (spr) {
        // 조각마다 반짝이는 박자를 어긋나게 둔다 — 다섯이 한꺼번에 깜빡이면 기계 같다
        const fr = Math.floor(t * 6 + i * 1.7) % 4;
        const w = r * 5.4;
        Sprites.drawFx(c, 'proj_starfrag', fr, x - w / 2, y - w / 2, w);
      } else {
        const g = c.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, lit ? '#fff6d8' : '#e8dcb8');
        g.addColorStop(0.35, lit ? 'rgba(255,224,138,.55)' : 'rgba(200,190,160,.4)');
        g.addColorStop(1, 'rgba(255,224,138,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(x, y, r * 3.2, 0, TAU); c.fill();
        c.fillStyle = '#fff8e0';
        c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.fill();
      }
    }
    c.restore();
  },

  drawPlayer(c, p, sx, sy) {
    c.save();
    if (p.iframe > 0 && Math.floor(this.time * 24) % 2 === 0) c.globalAlpha = 0.45;
    /* ★ 주인공은 **손그림 시트 한 장이 전부**다(char/player_<id>.png, tools/mkplayer.py). 한동안 팔·다리·망토를 코드로 그리는
       인형(리그)을 썼는데, 원래 그림의 명암·주름·옷 결이 다 빠져 "그림이 너프됐다"는 말을 들었다. 지금은 원래 그림을 그대로 쓰고, 칸 벽에 잘려 있던 망토
       자락·손·발만 시트를 넓혀 이어 그렸다.
       사연: docs/code-history.md#h69 */
    const ch = CHAR_OF(p.charId);
    const fr = this.playerFrame(p);
    const key = 'player_' + ch.id;
    if (this.spritesOn && p.swimming && p.swimMove && !p.floating && !(p.swing > 0) && !p.channel
        && this.drawSwimPlayer(c, p, sx, sy, key)) { c.restore(); return; }
    if (this.spritesOn && Sprites.draw(c, key, fr, sx, sy, p.facing < 0)) {
      this.drawHeldWeapon(c, p, sx, sy, 0, this.playerHand(key, fr, sx, sy, p.facing < 0));
      c.restore();
      return;
    }
    /* 시트를 못 읽었으면 절차 렌더. 옛 공용 시트(char/player.png — 방랑자 시트와 같은 그림)에
       색조만 얹던 갈래는 그 시트를 지우면서 뺐다. */
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


  /** 시트에 적힌 이 프레임의 무기 손 — { pt:[x,y] 화면 좌표(손 가운데), box:[x,y,w,h], key, fr, flip } 또는 null.
      시트 좌표는 오른쪽을 볼 때 기준이라, 뒤집어 그릴 때는 칸 폭에서 거울로 뺀다(Sprites.draw 와 같은 식). */
  playerHand(key, fr, sx, sy, flip) {
    const m = Sprites.meta && Sprites.meta.characters.sheets[key];
    if (!m || !m.hand || !m.hand[fr]) return null;
    const X0 = Math.round(sx) + m.ox, Y0 = Math.round(sy) + m.oy;
    const [hx, hy] = m.hand[fr], [bx0, by0, bx1, by1] = m.handBox[fr];
    const px = flip ? X0 + m.frameW - (hx + 0.5) : X0 + hx + 0.5;
    const bx = flip ? X0 + m.frameW - bx1 - 1 : X0 + bx0;
    return { pt: [px, Y0 + hy + 0.5], box: [bx, Y0 + by0, bx1 - bx0 + 1, by1 - by0 + 1], key, fr, flip };
  },

  /** 헤엄 — 따로 그린 헤엄 그림 없이 **걷기 네 장을 눕혀서** 돌린다(머리가 나아가는 쪽).
      ★ 예전 헤엄 그림은 팔이 든 몸에 팔을 또 그려 팔이 셋이었다. 걷기 그림을 그대로 눕히면 팔 둘 ·
        망토 · 옷 결이 원래 그림 그대로이고, 걷는 다리가 그대로 발차기가 된다. 기울기는 헤엄치는 방향. */
  drawSwimPlayer(c, p, sx, sy, key) {
    const im = Sprites.img[key], m = Sprites.meta && Sprites.meta.characters.sheets[key];
    if (!im || !im.width || !m) return false;
    const dir = p.facing < 0 ? -1 : 1;
    const fr = 2 + (Math.floor((p.swimPh || 0) * 4) % 4);
    const a = clamp(Math.atan2(p.vy, Math.max(20, Math.abs(p.vx))), -1.1, 1.1);
    const S = Sprites.scale, fw = m.frameW, fh = m.frameH;
    // 판정 상자 가운데를 돌림 중심으로 — 시트 칸 안의 판정 상자 가운데는 (-ox + 10, -oy + 20)
    const ccx = -m.ox + p.w / 2, ccy = -m.oy + p.h / 2;
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(Math.round(sx + p.w / 2), Math.round(sy + p.h / 2));
    c.scale(dir, 1);
    c.rotate(Math.PI / 2 + a);                               // 머리(위)가 앞(오른쪽)으로
    c.drawImage(im, fr * fw * S, 0, fw * S, fh * S, -ccx, -ccy, fw, fh);
    c.restore();
    return true;
  },

  /** 장착 무기 + 스윙 궤적 + 채널링 링 (두 렌더 경로가 공유) */
  /* ================= 유적의 맥박 · 탐사 기록 · 메아리 시련 =================

     다른 게임의 던전과 다를 것이 없었고, 주인을 잡고 나면 돌아갈 까닭도 없었다. 셋을 서로 물리게 짰다 —
       맥박      머물수록·털수록 유적이 깨어나고, 깨어난 유적은 더 주고 더 친다(data.js PULSE)
       탐사 기록  무엇을 얼마나 봤는가를 등급으로(S 는 그 유적의 인장 — 맥박을 다루는 법이 바뀐다)
       메아리    잡은 주인을 **깨어난 유적에서만** 다시 부른다. 단계마다 세지고 더 준다
     맥박 값은 저장하지 않는다(나갔다 오면 가라앉아 있는 것이 자연스럽다). 기록만 남긴다.
     사연: docs/code-history.md#h70 */

  /** 그 자리의 바이옴 유적 — { r, spec, idx, id } 또는 null. 석판 유적·봉인실은 뺀다 */
  pulseRuinAt(tx, ty) {
    const r = this.world.ruinAt(tx, ty);
    if (!r || !r.id) return null;
    const spec = this.ruinSpec(r.id);
    if (!spec) return null;
    return { r, spec, idx: RUIN_SPEC.indexOf(spec), id: r.id };
  },
  /** 맥박·탐사 기록이 쓰는 유적 명세 — 바이옴 유적은 RUIN_SPEC 그대로, 석판 유적(story0~2)은
      STORY_RUIN 에서 한 벌 만든다(주인·메아리·인장 없음, story 에 석판 번호). 그 밖은 null.
      사연: docs/code-history.md#h71 */
  ruinSpec(id) {
    const s = RUIN_SPEC.find(q => q.id === id);
    if (s) return s;
    const m = /^story(\d)$/.exec(id || '');
    if (!m || !STORY_RUIN[+m[1]]) return null;
    this._storySpec = this._storySpec || {};
    if (!this._storySpec[id]) {
      const st = STORY_RUIN[+m[1]];
      this._storySpec[id] = { id, n: st.n, mobs: st.mobs || ['skeleton'], rank: st.rank || 3,
        tier: 3, bonus: st.bonus, story: +m[1] };
    }
    return this._storySpec[id];
  },
  pulseStage(v) {
    let s = 0;
    for (let i = 0; i < PULSE.stages.length; i++) if (v >= PULSE.stages[i].at) s = i;
    return s;
  },
  pulseOf(id) { return ((this.ruinPulse || {})[id]) || 0; },
  hasSeal(k) {
    const e = this.player && this.player.equip;
    return !!e && [e.acc1, e.acc2].some(it => it && it.id === 'seal_' + k);
  },
  /** 맥박을 움직인다. 오를 때만 갱부의 인장이 깎는다(가라앉는 쪽은 그대로).
      byHand 는 물약·북처럼 플레이어가 일부러 움직인 것 — 인장 감쇠를 안 건다 */
  addPulse(id, v, byHand) {
    this.ruinPulse = this.ruinPulse || {};
    if (v > 0 && !byHand && this.hasSeal('mine')) v *= 0.75;
    const before = this.ruinPulse[id] || 0;
    const now = clamp(before + v, 0, 100);
    this.ruinPulse[id] = now;
    const s0 = this.pulseStage(before), s1 = this.pulseStage(now);
    /* 가장 높이 오른 단계는 **단계가 바뀔 때가 아니라 늘** 본다 — 물약·북이나 디버그처럼
       값이 곧장 놓이면 경계를 안 넘고도 격노 안에 있을 수 있다 */
    const sv = this.surveyOf(id);
    if (s1 > (sv.peak || 0)) sv.peak = s1;
    if (s1 !== s0) this.onPulseStage(id, s0, s1);
  },
  onPulseStage(id, s0, s1) {
    const S = PULSE.stages[s1];
    if (s1 > s0) {
      /* 처음 한 번은 무엇이 일어나는지 말해 준다 — 규칙을 모르면 "갑자기 몹이 쏟아졌다"로만 읽힌다 */
      this.tally = this.tally || {};
      if (!this.tally.pulseHint) {
        this.tally.pulseHint = 1;
        this.toast('유적이 당신을 알아챘다 — 머물수록 · 상자를 열수록 깨어나고, 쓰러뜨릴수록 가라앉는다', 'bad');
      }
      this.toast(`유적의 맥박 — ${S.n}`, 'bad');
      this.shake = Math.max(this.shake || 0, 4 + s1 * 3);
      this.sfx('chapter');
      this._waveT = PULSE.wave[s1];
      if (s1 >= 3) { this._rageT = 8; this.checkSurvey(id); this.checkAch(); }
      /* 단계가 오르면 **사건**이 하나 터진다 — 몹이 늘어나는 것만으로는 "무엇을 하라"가
         없었다. 이미 벌어진 사건이 있으면 그것부터 끝내게 둔다(겹치면 둘 다 못 한다). */
      if (!this.pulseEvent && this.pulseHere === id) this.startPulseEvent(id, s1);
    } else if (this.pulseHere === id && s1 === 0) {
      this.toast('유적이 다시 잠든다', 'good');
    }
  },

  /** 매 프레임 — 유적 안이면 맥박을 올리고 기록을 적고, 밖에 있는 유적은 가라앉힌다 */
  updatePulse(dt) {
    const p = this.player, w = this.world;
    if (!p || !w || p.dead) return;
    this.ruinPulse = this.ruinPulse || {};
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    const here = this.pulseRuinAt(tx, ty);
    this.pulseHere = here ? here.id : null;
    if (this.pulseEvent) this.updatePulseEvent(here, dt);
    for (const k in this.ruinPulse)
      if ((!here || k !== here.id) && this.ruinPulse[k] > 0)
        this.ruinPulse[k] = Math.max(0, this.ruinPulse[k] - PULSE.fall * dt);
    if (!here) return;
    const id = here.id;
    /* 주인과 싸우는 동안은 오르지도 몰려오지도 않는다 — 그건 결판이지 탐험이 아니다.
       격노 중에 주인을 깨우면 그 격노를 그대로 들고 싸운다(보상은 pulseBossDown). */
    if (!this.boss) this.addPulse(id, PULSE.rise * dt);
    this.surveyTick(here, dt);
    const st = this.pulseStage(this.pulseOf(id));

    // 인장 — 2초짜리 버프를 1초마다 갱신한다(매 프레임 걸면 매 프레임 recalc 가 돈다)
    this._sealT = (this._sealT || 0) - dt;
    if (this._sealT <= 0) {
      this._sealT = 1;
      if (st >= 2 && this.hasSeal('ice')) p.addBuff('pulse_ward', 2);
      if (st >= 3 && this.hasSeal('blight')) p.addBuff('pulse_fury', 2);
    }
    if (this.boss || st === 0) return;
    if (st >= 3) {
      this._rageT = (this._rageT === undefined ? 5 : this._rageT) - dt;
      if (this._rageT <= 0) { this._rageT = PULSE.rageEvery; this.pulseRage(here); }
    }
    if (this.pulseEvent) return;             // 사건 중에는 사건이 몰고 오는 것만 온다
    this._waveT = (this._waveT === undefined ? PULSE.wave[st] : this._waveT) - dt;
    if (this._waveT <= 0) {
      this._waveT = PULSE.wave[st];
      /* 이미 둘레에 많으면 더 부르지 않는다 — 몰려오는 것이 쌓이기만 하면 "피하면 계속
         오른다"가 아니라 "그냥 못 버틴다"가 된다. 상한은 단계를 따라 6 · 8 · 10 */
      const near = this.ents.filter(e => e instanceof Enemy && !e.boss &&
        Math.abs(e.cx - p.cx) < 900 && Math.abs(e.cy - p.cy) < 600).length;
      if (near < 4 + st * 2) this.spawnRuinMobs(here, PULSE.waveN[st]);
    }
  },

  /** 유적의 것들을 **그 유적 안, 설 수 있는 자리에** 부른다.
      ★ 고유 이벤트가 쓰는 _ruinSpawn 은 플레이어 둘레 원 위에 곧장 놓아서 벽 속에 박히는
        일이 있었다. 몇 번이고 불리는 맥박에서는 그러면 안 된다 — 발밑이 단단하고 몸 두 칸이
        비어 있고, 같은 유적 안이고, 플레이어에게서 여섯 칸 이상 떨어진 자리만 쓴다. */
  spawnRuinMobs(here, n, mulX) {
    const w = this.world, p = this.player, pool = here.spec.mobs || ['skeleton'];
    const ptx = Math.floor(p.cx / TS), pty = Math.floor((p.y + p.h - 1) / TS);
    const mul = this.scale() * w.ruinMobMul(ptx, pty) * (mulX || 1);
    const out = [];
    for (let k = 0; k < n; k++) {
      const at = this.pulseSpot(here, 6, 20);
      if (!at) break;
      const e = new Enemy(pool[(k + (Math.random() * pool.length | 0)) % pool.length], at[0] * TS, at[1] * TS, mul);
      e.x = at[0] * TS + TS / 2 - e.w / 2; e.y = (at[1] + 1) * TS - e.h;
      this.ents.push(e); out.push(e);
      for (let q = 0; q < 10; q++) this.parts.push(new Part(e.cx, e.cy, '#e8303c', -40, .7));
    }
    return out;
  },
  /** 유적 안, 플레이어에게서 가로 minD~maxD 칸 떨어진 **설 수 있는** 칸 [tx, ty] (발은 ty+1 위) */
  pulseSpot(here, minD, maxD) {
    const w = this.world, p = this.player;
    const ptx = Math.floor(p.cx / TS), pty = Math.floor((p.y + p.h - 1) / TS);
    for (let att = 0; att < 80; att++) {
      const tx = ptx + (Math.random() < 0.5 ? -1 : 1) * (minD + Math.floor(Math.random() * (maxD - minD + 1)));
      const ty = pty + Math.floor(Math.random() * 11) - 6;
      if (w.solid(tx, ty) || w.solid(tx, ty - 1) || w.solid(tx + 1, ty) || w.solid(tx + 1, ty - 1)) continue;
      if (!w.solid(tx, ty + 1) || TILE_DEF[w.get(tx, ty)].liquid) continue;
      if (w.ruinAt(tx, ty) !== here.r) continue;
      return [tx, ty];
    }
    return null;
  },

  /* ---- 맥박 사건 (data.js PULSE_EVENTS) ----
     pulseEvent = { id, k, stage, t, max, ... } — 저장하지 않는다(나갔다 오면 끝난 일이다).
     성공은 탐사 기록(survey.ev · survey.evk)에 남아 A · S 등급의 조건이 된다. */
  startPulseEvent(id, stage, force) {          // force — 확인용으로 갈래를 고정한다
    const here = this.pulseRuinAt(Math.floor(this.player.cx / TS), Math.floor(this.player.cy / TS));
    if (!here || here.id !== id) return;
    const pool = Object.keys(PULSE_EVENTS).filter(k => PULSE_EVENTS[k].stages.includes(stage) && k !== this._lastPev);
    if (!pool.length && !force) return;
    const k = force || pool[Math.floor(Math.random() * pool.length)];
    const E = PULSE_EVENTS[k];
    const ev = { id, k, stage, t: E.t, max: E.t };
    if (k === 'hunt') {
      // 격노면 둘 — 주인의 전령이다. 정예 배수는 일반 정예(×2.6)보다 조금 세게
      ev.marks = this.spawnRuinMobs(here, stage >= 3 ? 2 : 1, 1.2);
      for (const e of ev.marks) {
        e.maxHp = Math.round(e.maxHp * 3); e.hp = e.maxHp; e.dmg *= 1.5; e.armor += 10;
        e.elite = true; e.pulseMark = true;
      }
      if (!ev.marks.length) return;
    } else if (k === 'stones') {
      /* 지금 방이 아닌 **다른 방** 셋에 — 가까운 방에서부터 고르되 서로 다른 방으로.
         사건의 요점은 유적을 가로질러 뛰게 만드는 것이다. */
      const site = (this.world.ruinSites || []).find(q => q.id === id);
      if (!site) return;
      const p = this.player, ptx = p.cx / TS, pty = p.cy / TS;
      const rooms = site.rooms.filter(r => !(ptx > r.x && ptx < r.x + r.w && pty > r.y && pty < r.y + r.h))
        .map(r => ({ r, d: Math.hypot(r.x + r.w / 2 - ptx, r.y + r.h / 2 - pty) }))
        .filter(q => q.d > 8).sort((a, b) => a.d - b.d).slice(0, 7);
      for (let i = rooms.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rooms[i], rooms[j]] = [rooms[j], rooms[i]]; }
      ev.stones = rooms.slice(0, 3).map(q => ({
        x: (q.r.x + (q.r.w >> 1) + 0.5) * TS, y: (q.r.y + q.r.h - 3) * TS, got: false }));
      if (ev.stones.length < 3) return;
    } else if (k === 'greed') {
      const at = this.pulseSpot(here, 4, 12);
      if (!at) return;
      const spec = here.spec;
      ev.chest = { type: 'chest', tier: clamp(spec.tier + 1, 1, 6), greed: 1,
        x: at[0] * TS, y: (at[1] + 0.8) * TS - 26, w: 30, h: 26, items: null,
        bonus: spec.bonus, bonus2: spec.bonus2,
        guard: { t: spec.mobs[0], n: 2 + stage } };
      this.world.objects.push(ev.chest);
      for (let q = 0; q < 30; q++) this.parts.push(new Part(ev.chest.x + 15, ev.chest.y + 13, '#ffd24a', -40, 1));
    } else if (k === 'siege') {
      ev.wave = 0; ev.waveT = 0; ev.mobs = [];
    }
    this._lastPev = k;
    this.pulseEvent = ev;
    this.toast(`${E.i} ${E.n} — ${E.d}`, 'bad');
    this.shake = Math.max(this.shake || 0, 8);
  },
  updatePulseEvent(here, dt) {
    const ev = this.pulseEvent, p = this.player;
    const inside = here && here.id === ev.id;
    // 유적을 나가면 5초 안에 돌아와야 한다 — 포위는 나가는 순간 실패
    ev.away = inside ? 0 : (ev.away || 0) + dt;
    if (!inside && (ev.k === 'siege' || ev.away > 5)) { this.endPulseEvent(false); return; }
    ev.t -= dt;
    if (ev.k === 'hunt') {
      if (ev.marks.every(e => e.dead)) { this.endPulseEvent(true); return; }
    } else if (ev.k === 'stones') {
      for (const s of ev.stones)
        if (!s.got && Math.abs(s.x - p.cx) < 30 && Math.abs(s.y - (p.y + p.h)) < 44) {
          s.got = true;
          this.sfx('coin');
          for (let q = 0; q < 24; q++) this.parts.push(new Part(s.x, s.y - 14, '#8fe0ff', -50, 1));
          const left = ev.stones.filter(q => !q.got).length;
          if (left) this.toast(`공명석 — ${3 - left}/3`, 'good');
        }
      if (ev.stones.every(q => q.got)) { this.endPulseEvent(true); return; }
    } else if (ev.k === 'greed') {
      if (ev.chest.items) { this.endPulseEvent(true); return; }
    } else if (ev.k === 'siege') {
      ev.waveT -= dt;
      if (ev.wave < 3 && ev.waveT <= 0) {
        ev.wave++; ev.waveT = 15;
        ev.mobs.push(...this.spawnRuinMobs(here, 1 + ev.stage + (ev.wave === 3 ? 1 : 0)));
        this.toast(`포위 — ${ev.wave}/3 무리`, 'bad');
      }
      if (ev.wave >= 3 && ev.mobs.every(e => e.dead)) { this.endPulseEvent(true); return; }
    }
    if (ev.t <= 0) this.endPulseEvent(false);
  },
  endPulseEvent(ok) {
    const ev = this.pulseEvent; if (!ev) return;
    this.pulseEvent = null;
    const E = PULSE_EVENTS[ev.k], p = this.player;
    const spec = this.ruinSpec(ev.id);
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    // 표식된 것이 살아 있으면 달아난다(사라진다) — 남겨 두면 표식 없는 정예가 되어 버린다
    if (ev.k === 'hunt') for (const e of ev.marks) if (!e.dead) {
      e.dead = true;
      for (let q = 0; q < 16; q++) this.parts.push(new Part(e.cx, e.cy, '#9a8aaa', -30, .8));
    }
    // 열지 않은 탐욕의 상자는 가라앉는다
    if (ev.k === 'greed' && !ev.chest.items) {
      const i = this.world.objects.indexOf(ev.chest);
      if (i >= 0) this.world.objects.splice(i, 1);
    }
    if (!ok) {
      this.addPulse(ev.id, 15);
      this.toast(`${E.n} — 놓쳤다. 유적이 더 깨어난다`, 'bad');
      this.sfx('mine');
      return;
    }
    const st = ev.stage, rank = (spec && spec.rank) || 3;
    const sv = this.surveyOf(ev.id);
    sv.ev = (sv.ev || 0) + 1;
    (sv.evk = sv.evk || {})[ev.k] = 1;
    const gold = 120 * rank * st;
    p.gold += gold;
    p.addXp(Math.round(400 * st * this.scale()));
    if (spec && spec.bonus2 && ITEMS[spec.bonus2] && ev.k !== 'greed') give(makeItem(spec.bonus2, 1 + st));
    if (st >= 2) give(makeItem('pulse_shard', st - 1));
    const calm = { hunt: 15, stones: 35, greed: 0, siege: 25 }[ev.k];
    if (calm) this.addPulse(ev.id, -calm);
    this.toast(`${E.n} — 해냈다 · 금화 ${fmt(gold)}${calm ? ' · 맥박 -' + calm : ''}`, 'good');
    this.sfx('chapter');
    this.checkSurvey(ev.id);
    UI.refreshBag();
  },
  /** 사건 표지 — 공명석 · 표식된 것 · 탐욕의 상자. 화면 밖이면 가장자리에 화살표 */
  drawPulseEvent(c) {
    const ev = this.pulseEvent; if (!ev) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, t = this.time || 0;
    const marks = [];
    if (ev.k === 'stones') for (const s of ev.stones) if (!s.got) marks.push([s.x, s.y - 16, '#8fe0ff', 'stone']);
    if (ev.k === 'hunt') for (const e of ev.marks) if (!e.dead) marks.push([e.cx, e.y - 14, '#ff5a4a', 'mark']);
    if (ev.k === 'greed' && !ev.chest.items) marks.push([ev.chest.x + 15, ev.chest.y - 10, '#ffd24a', 'mark']);
    c.save();
    for (const [x, y, col, kind] of marks) {
      const sx = x - cx0, sy = y - cy0;
      if (sx > 20 && sx < this.W - 20 && sy > 20 && sy < this.H - 20) {
        const bob = Math.sin(t * 4) * 3;
        if (kind === 'stone') {
          // 떠 있는 돌 — 빛기둥과 마름모
          const g = c.createLinearGradient(0, sy - 60, 0, sy + 16);
          g.addColorStop(0, 'rgba(143,224,255,0)'); g.addColorStop(1, 'rgba(143,224,255,0.35)');
          c.fillStyle = g; c.fillRect(sx - 6, sy - 60, 12, 76);
          c.fillStyle = col; c.beginPath();
          c.moveTo(sx, sy - 12 + bob); c.lineTo(sx + 8, sy + bob); c.lineTo(sx, sy + 12 + bob); c.lineTo(sx - 8, sy + bob);
          c.closePath(); c.fill();
          c.strokeStyle = '#ffffff'; c.globalAlpha = 0.6; c.stroke(); c.globalAlpha = 1;
        } else {
          c.fillStyle = col; c.beginPath();
          c.moveTo(sx, sy + 8 + bob); c.lineTo(sx - 7, sy - 4 + bob); c.lineTo(sx + 7, sy - 4 + bob); c.closePath(); c.fill();
        }
      } else {
        // 화면 밖 — 가장자리에 화살표
        const ax = clamp(sx, 26, this.W - 26), ay = clamp(sy, 70, this.H - 90);
        const ang = Math.atan2(sy - ay, sx - ax);
        c.translate(ax, ay); c.rotate(ang);
        c.fillStyle = col; c.globalAlpha = 0.85;
        c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -8); c.lineTo(-6, 8); c.closePath(); c.fill();
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      }
    }
    c.restore();
  },

  /** 격노 발작 — 그 유적 고유의 한 가지(data.js PULSE_RAGE). 타일은 건드리지 않는다 */
  pulseRage(here) {
    const R = PULSE_RAGE[here.id]; if (!R) return;
    const p = this.player;
    this.toast(R.t, 'bad');
    this.sfx('chapter');
    if (R.k === 'dark') { this.ruinDark = Math.max(this.ruinDark || 0, 6); this.spawnRuinMobs(here, 1); }
    else if (R.k === 'spore') this.ruinSpore = Math.max(this.ruinSpore || 0, 5);
    else if (R.k === 'heat') {
      p.hurt(8 + p.level * 0.6);
      for (let i = 0; i < 36; i++)
        this.parts.push(new Part(p.cx + (Math.random() - .5) * 320, p.cy - 120, '#ffb45a', 60, 1.0));
    } else if (R.k === 'quake') {
      this.shake = 18;
      for (let i = 0; i < 40; i++)
        this.parts.push(new Part(p.cx + (Math.random() - .5) * 300, p.cy - 110, '#6a5a48', 40, 1.1));
      this.spawnRuinMobs(here, 2);
    } else if (R.k === 'swarm') { this.shake = 12; this.spawnRuinMobs(here, 3); }
  },

  /** 유적 상자를 처음 열 때 — 맥박 단계만큼 덤을 얹고 맥박을 올린다.
      ★ 상자 **등급**은 안 올린다(rollChest 가 유적 상자를 4등급으로 묶는 이유를 따른다) */
  pulseChest(o, tx, ty) {
    const here = this.pulseRuinAt(tx, ty);
    if (!here) return;
    const st = this.pulseStage(this.pulseOf(here.id));
    const up = st > 0 ? st + (this.hasSeal('pyramid') ? 1 : 0) : 0;
    const big = !!(o.relic || o.guard || o.ruinmap);        // 보물방 상자
    if (up >= 1 && here.spec.bonus && ITEMS[here.spec.bonus]) o.items.push(makeItem(here.spec.bonus, 1 + up));
    if (up >= 2 && here.spec.bonus2 && ITEMS[here.spec.bonus2]) o.items.push(makeItem(here.spec.bonus2, up));
    if (up >= 3) o.items.push(makeItem('pulse_shard', (big ? 2 : 1) + (up >= 4 ? 1 : 0)));
    if (up > 0) this.toast(`맥박이 뛰는 상자 — ${PULSE.stages[st].n}의 덤`, 'good');
    this.addPulse(here.id, big ? PULSE.vault : PULSE.chest);
  },

  /** 보스가 쓰러졌을 때(onBossDown 맨 앞) — 유적 주인이나 메아리였다면 맥박을 가라앉히고 보상 */
  pulseBossDown() {
    const echo = this.pendingEcho;
    this.pendingEcho = null;
    const idx = echo ? echo.idx : this.pendingLair;
    const spec = (idx !== undefined && idx !== null) ? RUIN_SPEC[idx] : null;
    if (!spec || !spec.id) return;
    const p = this.player, st = this.pulseStage(this.pulseOf(spec.id));
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    if (echo) this.echoReward(spec, echo.lv);
    else if (st >= 3) {
      // 격노를 들고 주인을 쓰러뜨렸다 — 그 값을 따로 친다
      give(makeItem('pulse_shard', 3));
      this.toast('격노 속에서 주인을 쓰러뜨렸다 — 맥박 결정 셋', 'good');
    }
    /* 주인이 쓰러지면 유적이 잠잠해진다. 메아리는 절반만 — 메아리를 거듭 부르려면
       다시 깨워야 하지만, 처음부터 다시 쌓게 하면 되풀이가 지루하다. */
    this.ruinPulse = this.ruinPulse || {};
    this.ruinPulse[spec.id] = echo ? Math.min(this.pulseOf(spec.id), PULSE.stages[2].at) : 0;
    this.checkSurvey(spec.id);
    UI.refreshBag();
  },

  /* ---- 탐사 기록 ---- */
  surveyOf(id) {
    this.survey = this.survey || {};
    return this.survey[id] || (this.survey[id] = { rooms: {}, peak: 0, echo: 0 });
  },
  /** 유적 안에 있는 동안 — 밟은 방을 적고, 2초마다 등급을 다시 잰다 */
  surveyTick(here, dt) {
    this._svT = (this._svT || 0) - dt;
    if (this._svT > 0) return;
    this._svT = 0.5;
    const p = this.player, sv = this.surveyOf(here.id);
    const site = (this.world.ruinSites || []).find(s => s.id === here.id);
    if (!site) return;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    let fresh = false;
    site.rooms.forEach((r, i) => {
      if (sv.rooms[i]) return;
      if (tx > r.x && tx < r.x + r.w - 1 && ty > r.y && ty < r.y + r.h - 1) { sv.rooms[i] = 1; fresh = true; }
    });
    this._svFull = (this._svFull || 0) + 1;
    if (fresh || this._svFull >= 4) { this._svFull = 0; this.checkSurvey(here.id); }
  },
  /** 그 유적의 점수와 등급. 상자·비문·주인·골방은 **세이브에 이미 있는 것**에서 곧장 잰다 —
      따로 세면 옛 세이브에서 이미 한 일이 빠진다. */
  surveyScore(id) {
    const w = this.world, sv = (this.survey || {})[id] || { rooms: {} };
    const site = (w.ruinSites || []).find(s => s.id === id);
    const r = (w.ruins || []).find(q => q.id === id);
    const idx = RUIN_SPEC.findIndex(s => s.id === id);
    const part = {};
    const nRooms = site ? site.rooms.length : 0;
    part.rooms = nRooms ? [Object.keys(sv.rooms || {}).length, nRooms] : null;
    let chests = 0, opened = 0, code = null;
    if (r) {
      const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, y0 = r.y - r.h / 2, y1 = r.y + r.h / 2;
      for (const o of w.objects) {
        if (o.type === 'codedoor' && o.ruin === id) code = [o.opened ? 1 : 0, 1];
        if (o.type !== 'chest' || o.greed) continue;         // 탐욕의 상자는 사건의 몫이다
        const ox = o.x / TS, oy = o.y / TS;
        if (ox > x0 && ox < x1 && oy > y0 && oy < y1) { chests++; if (o.items) opened++; }
      }
    }
    part.chests = chests ? [opened, chests] : null;
    part.lore = RUIN_LORE[id] ? [(this.loreRead || {})[id] ? 1 : 0, 1] : null;
    const spec = this.ruinSpec(id), story = spec && spec.story !== undefined;
    // 석판 유적은 주인 대신 석판 — 읽었나(tabletsRead 는 석판 번호로 적힌다)
    part.boss = story ? [(this.tabletsRead || {})[spec.story] ? 1 : 0, 1]
                      : [idx >= 0 && (this.lairs || {})[idx] ? 1 : 0, 1];
    part.code = code;
    part.rage = [(sv.peak || 0) >= 3 ? 1 : 0, 1];
    part.events = [sv.ev || 0, 5];
    part.kinds = [Object.keys(sv.evk || {}).length, Object.keys(PULSE_EVENTS).length];
    part.echo = story ? null : [sv.echo || 0, ECHO.max];   // 석판 유적에는 메아리가 없다
    /* 점수는 진행 막대용 — 등급은 아래 문턱으로만 정한다(data.js SURVEY_TIERS 의 ★) */
    let got = 0, max = 0;
    for (const k in SURVEY_W) {
      if (!part[k]) continue;
      got += SURVEY_W[k] * Math.min(1, part[k][0] / part[k][1]); max += SURVEY_W[k];
    }
    const score = max ? Math.floor(got / max * 100) : 0;
    /* 조건 하나의 충족 여부 — rooms·chests 는 비율, events·kinds·echo 는 개수, 나머지는 했나.
       그 유적에 없는 항목(part 가 null)은 조건에서 빠진다. */
    const meets = (k, v) => {
      const q = part[k]; if (!q) return true;
      if (k === 'rooms' || k === 'chests') return q[0] / q[1] >= v - 1e-9;
      if (k === 'events' || k === 'kinds' || k === 'echo') return q[0] >= v;
      return q[0] >= 1;
    };
    let tier = SURVEY_TIERS[SURVEY_TIERS.length - 1], next = null, missing = [];
    for (let i = 0; i < SURVEY_TIERS.length; i++) {
      const T0 = SURVEY_TIERS[i];
      if (Object.keys(T0.need).every(k => meets(k, T0.need[k]))) {
        tier = T0; next = i > 0 ? SURVEY_TIERS[i - 1] : null; break;
      }
    }
    const label = k => (story && k === 'boss') ? '석판' : SURVEY_LABEL[k];
    if (next) missing = Object.keys(next.need).filter(k => !meets(k, next.need[k])).map(k => {
      const v = next.need[k], q = part[k];
      if (k === 'rooms' || k === 'chests') return `${label(k)} ${Math.round(v * 100)}% (지금 ${Math.floor(q[0] / q[1] * 100)}%)`;
      if (k === 'events' || k === 'kinds' || k === 'echo') return `${label(k)} ${v} (지금 ${q[0]})`;
      return label(k);
    });
    return { score, rank: tier.r, col: tier.c, next: next && next.r, missing, part, sv, story,
             seen: !!(this.seenRuins || {})[id] };
  },
  /** 등급이 오르면 알리고, A · S 에 처음 닿으면 보상을 준다 */
  checkSurvey(id) {
    const spec = this.ruinSpec(id); if (!spec) return;
    const sc = this.surveyScore(id), sv = sc.sv, p = this.player;
    const order = SURVEY_TIERS.map(q => q.r);
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    if (sv.best && order.indexOf(sc.rank) >= order.indexOf(sv.best)) return;   // 오르지 않았다
    const firstTime = !sv.best;
    sv.best = sc.rank;
    if (firstTime && sc.rank === 'D') return;      // 막 들어온 것 — 알릴 만한 일이 아니다
    this.toast(`탐사 기록 ${sc.rank} — ${spec.n} (진행 ${sc.score}%)`, 'good');
    if ((sc.rank === 'A' || sc.rank === 'S') && !sv.a) {
      sv.a = 1;
      const gold = 1200 * (spec.rank || 3);
      p.gold += gold;
      give(makeItem('pulse_shard', 3));
      this.toast(`${eulreul(spec.n)} 거의 다 봤다 — 금화 ${fmt(gold)} · 맥박 결정 셋`, 'good');
      this.sfx('manycoins');
    }
    if (sc.rank === 'S' && !sv.s) {
      sv.s = 1;
      const sid = 'seal_' + id;
      if (ITEMS[sid]) { give(makeItem(sid, 1)); this.toast(`샅샅이 뒤졌다 — ${ITEMS[sid].n}`, 'good'); }
      this.shake = 8; this.sfx('chapter');
    }
    this.checkAch();
    UI.refreshBag();
    if (UI.questTab === 'ruins') UI.refreshQuest();
  },

  /* ---- 메아리 시련 ---- */
  openEcho(o) {
    const spec = RUIN_SPEC[o.ruin];
    if (this.boss) { this.toast('이미 무언가가 깨어 있다', 'bad'); return; }
    const sv = this.surveyOf(spec.id);
    const best = sv.echo || 0, next = Math.min(ECHO.max, best + 1);
    const st = this.pulseStage(this.pulseOf(spec.id));
    const bn = ENEMIES[spec.boss] ? ENEMIES[spec.boss].n : '주인';
    const lines = ['주인은 쓰러졌지만, 둥지는 아직 그 모양을 기억한다.',
                   '유적이 깨어 있으면 그 기억이 다시 일어선다.', '',
                   `넘긴 메아리 ${best} / ${ECHO.max}` +
                   (best < ECHO.max ? ` · 다음 ${next}단계 — ${bn} 체력·공격 ×${ECHO.mul(next).toFixed(2)}` +
                     (next > 1 ? ` · 호위 ${next - 1}` : '') : ' · 끝까지 넘겼다')];
    if (st < ECHO.needStage) {
      lines.push('', `유적이 잠들어 있다 — 맥박이 「${PULSE.stages[ECHO.needStage].n}」에 닿아야 메아리가 대답한다.`);
      UI.openLore(`${spec.n} — 빈 둥지`, lines, [{ t: '(물러난다)', fn: () => UI.closeDialogue() }]);
      this.sfx('open');
      return;
    }
    const choices = [];
    const lvs = best < ECHO.max ? [next] : [];
    if (best >= 1) lvs.push(best);
    for (const lv of lvs) choices.push({
      t: `(메아리를 부른다 — ${lv}단계${lv > best ? ' · 처음' : ' · 다시'})`, quest: 1,
      fn: () => { UI.closeDialogue(); this.summonEcho(o, spec, lv); }
    });
    choices.push({ t: '(그냥 둔다)', fn: () => UI.closeDialogue() });
    UI.openLore(`${spec.n} — 메아리`, lines, choices);
    this.sfx('open');
  },
  summonEcho(o, spec, lv) {
    if (this.boss) return;
    this.pendingLair = null;
    this.pendingEcho = { idx: o.ruin, id: spec.id, lv };
    this.spawnBoss(spec.boss, o.x + o.w / 2, o.y - 70);
    const e = this.boss;
    if (e) {
      // 보스는 장 배수를 안 탄다(Enemy 생성자의 ★) — 메아리 배수는 여기서 직접 곱한다
      const m = ECHO.mul(lv);
      e.maxHp = Math.round(e.maxHp * m); e.hp = e.maxHp; e.dmg *= m; e.armor *= m;
      e.echo = lv;
    }
    const here = this.pulseRuinAt(Math.floor((o.x + o.w / 2) / TS), Math.floor(o.y / TS));
    if (here && lv > 1) this.spawnRuinMobs(here, lv - 1);
    this.toast(`메아리 ${lv}단계`, 'bad');
  },
  echoReward(spec, lv) {
    const p = this.player, sv = this.surveyOf(spec.id);
    const give = it => { if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it)); };
    const first = lv > (sv.echo || 0);
    sv.echo = Math.max(sv.echo || 0, lv);
    const k = this.hasSeal('abyss') ? 1.5 : 1;
    const gold = Math.round(350 * lv * (spec.rank || 3) * k * (first ? 1.5 : 1));
    p.gold += gold;
    p.addXp(Math.round(1200 * lv * this.scale() * k));
    give(makeItem('pulse_shard', Math.round((lv + 1) * k)));
    if (spec.bonus2 && ITEMS[spec.bonus2]) give(makeItem(spec.bonus2, Math.round(2 * lv * k)));
    // 마지막 단계를 처음 넘기면 그 유적의 유물을 한 번 더 — 이번엔 잘 벼린 것으로
    const relic = RUIN_RELIC[spec.id];
    if (first && lv === ECHO.max && relic && ITEMS[relic]) {
      give(rollGear(relic, this.rng, 3));
      this.toast(`마지막 메아리가 흩어졌다 — ${ITEMS[relic].n}`, 'good');
    }
    this.toast(`메아리 ${lv}단계를 넘겼다 — 금화 ${fmt(gold)}`, 'good');
    this.sfx('manycoins');
    this.checkAch();
  },

  /** 맥박 막대 — 바이옴 유적 안에 있을 때만. 보스 막대가 떠 있으면 그 아래로 내린다 */
  drawPulse(c) {
    const id = this.pulseHere; if (!id) return;
    const v = this.pulseOf(id), st = this.pulseStage(v), S = PULSE.stages[st];
    const Wd = 230, x = Math.round((this.W - Wd) / 2), y = this.boss ? 84 : 20;
    const t = this.time || 0;
    c.save();
    c.fillStyle = 'rgba(12,9,16,0.72)';
    c.fillRect(x, y, Wd, 30);
    c.strokeStyle = S.c; c.globalAlpha = 0.55; c.strokeRect(x + .5, y + .5, Wd - 1, 29); c.globalAlpha = 1;
    // 뛰는 심장 — 단계가 오를수록 빨리 뛴다
    const beat = Math.pow(Math.max(0, Math.sin(t * (2.2 + st * 1.6))), 6);
    const hr = 6 + beat * 2.2;
    c.fillStyle = S.c;
    c.beginPath();
    const hx = x + 16, hy = y + 15;
    c.moveTo(hx, hy + hr * 0.9);
    c.bezierCurveTo(hx - hr * 1.6, hy - hr * 0.2, hx - hr * 0.7, hy - hr * 1.3, hx, hy - hr * 0.35);
    c.bezierCurveTo(hx + hr * 0.7, hy - hr * 1.3, hx + hr * 1.6, hy - hr * 0.2, hx, hy + hr * 0.9);
    c.fill();
    // 막대 — 단계 경계에 눈금
    const bx = x + 32, bw = Wd - 44, by = y + 19;
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(bx, by, bw, 5);
    c.fillStyle = S.c; c.fillRect(bx, by, Math.round(bw * v / 100), 5);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    for (const s of PULSE.stages) if (s.at > 0) c.fillRect(bx + Math.round(bw * s.at / 100), by, 1, 5);
    c.font = '600 11px "Pretendard",sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillStyle = '#e8e0d0'; c.fillText('유적의 맥박', bx, y + 10);
    c.textAlign = 'right'; c.fillStyle = S.c; c.fillText(S.n, bx + bw, y + 10);
    // 사건 — 막대 바로 아래에 이름 · 진행 · 남은 시간
    const ev = this.pulseEvent;
    if (ev && ev.id === id) {
      const E = PULSE_EVENTS[ev.k];
      let prog = '';
      if (ev.k === 'stones') prog = `${ev.stones.filter(q => q.got).length}/3`;
      else if (ev.k === 'hunt') prog = `${ev.marks.filter(e => e.dead).length}/${ev.marks.length}`;
      else if (ev.k === 'siege') prog = `${ev.wave}/3 무리`;
      else if (ev.k === 'greed') prog = '상자';
      const ey = y + 32;
      c.fillStyle = 'rgba(12,9,16,0.72)'; c.fillRect(x, ey, Wd, 24);
      c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x + 8, ey + 19, Wd - 16, 2);
      c.fillStyle = ev.t < 10 ? '#e8303c' : '#e8dcc0';
      c.fillRect(x + 8, ey + 19, Math.max(0, (Wd - 16) * ev.t / ev.max), 2);
      c.textAlign = 'left'; c.fillStyle = '#e8dcc0'; c.fillText(`${E.i} ${E.n}  ${prog}`, x + 8, ey + 9);
      c.textAlign = 'right'; c.fillStyle = ev.t < 10 ? '#ff6a5a' : '#bdb49a';
      c.fillText(`${Math.max(0, Math.ceil(ev.t))}초`, x + Wd - 8, ey + 9);
    }
    c.restore();
    this.drawPulseEvent(c);
    // 격노 — 화면 테두리가 맥박에 맞춰 붉게 물든다('화면 효과' 설정을 따른다)
    if (st >= 3) {
      const a = 0.16 * beat * (this.fxScale ? this.fxScale() : 1);
      if (a > 0.004) {
        const eg = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .34,
          this.W / 2, this.H / 2, Math.max(this.W, this.H) * .64);
        eg.addColorStop(0, 'rgba(232,48,60,0)'); eg.addColorStop(1, 'rgba(232,48,60,1)');
        c.globalAlpha = a; c.fillStyle = eg; c.fillRect(0, 0, this.W, this.H); c.globalAlpha = 1;
      }
    }
  },

  /* 갈래(CAVE_TYPES)마다 몸에 오는 것이 다르게 했다: 이끼 굴은 아물고, 종유 동굴은 머리 위를 봐야 하고, 독기 굴은 숨이 따갑고, 금 간 자갈은 무너뜨리면 숨은
     동굴이 열린다. 전부 저장 없이 돈다 — 무너진 자갈(faults[].done)만 세계와 함께 남는다.
     사연: docs/code-history.md#h72 */
  updateCaves(dt) {
    const p = this.player, w = this.world;
    if (!p || !w || p.dead) return;
    this.rocks = this.rocks || [];
    this.updateRocks(dt);
    if (this.quake) this.updateQuake(dt);
    if (this.meteor) this.updateMeteor(dt);
    const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
    this._caveT = (this._caveT || 0) - dt;
    if (this._caveT > 0) return;
    this._caveT = 0.35;
    const k = w.caveKindAt(tx, ty), C = CAVE_TYPES[k];
    this.caveHere = k;
    // 갈래가 바뀌면 이름을 알린다 — 같은 갈래는 90초 안에 다시 안 띄운다
    if (k && k !== this._caveLast) {
      this._caveCard = this._caveCard || {};
      if (this.time - (this._caveCard[k] || -1e9) > 90) {
        this._caveCard[k] = this.time;
        this.toast(`${C.n} — ${C.line}`, C.id === 'moss' ? 'good' : 'bad');
      }
      this.tally = this.tally || {};
      (this.tally.caves = this.tally.caves || {})[C.id] = 1;
      this.checkAch();
    }
    this._caveLast = k;
    // 갈래마다 몸에 오는 것 — 1초에 한 번
    this._caveTick = (this._caveTick || 0) - 0.35;
    if (this._caveTick <= 0 && k) {
      this._caveTick = 1;
      if (C.id === 'moss' && p.hp < p.d.maxHp) p.heal(Math.max(1, Math.round(p.d.maxHp * 0.012)));
      if (C.id === 'fume') {
        p.hurt(3 + p.level * 0.25);
        for (let i = 0; i < 5; i++) this.parts.push(new Part(p.cx + (Math.random() - .5) * 26, p.cy, '#b8c85a', -18, .7));
      }
    }
    // 종유 동굴 — 머리 위 종유석이 흔들리다 떨어진다. 한 번 떨어지면 5초는 조용하다
    this._dripCd = (this._dripCd || 0) - 0.35;
    if (C.id === 'drip' && this._dripCd <= 0 && Math.random() < 0.3) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = tx + dx;
        let y = -1;
        for (let dy = 1; dy <= 10; dy++) {
          const t = w.get(x, ty - dy);
          if (t === T.STALACTITE) { if (w.get(x, ty - dy + 1) !== T.STALACTITE) y = ty - dy; break; }
          if (w.solid(x, ty - dy)) break;
        }
        if (y < 0) continue;
        w.set(x, y, T.AIR);
        this.rocks.push({ x: (x + .5) * TS, y: (y + .5) * TS, vy: 0, t: 0.7, dmg: 14 + p.level * 0.9, kind: 'drip' });
        this._dripCd = 5;
        this.tally = this.tally || {};
        if (!this.tally.dripHint) { this.tally.dripHint = 1; this.toast('머리 위 종유석이 흔들린다 — 비켜라!', 'bad'); }
        break;
      }
    }
    // 금 간 자갈 — 가까이 가면 금 사이로 먼지가 흘러내린다(알아보라는 표시)
    for (const f of (w.faults || [])) {
      if (f.done || Math.abs(f.x - tx) > 18 || Math.abs(f.y - ty) > 12) continue;
      if (w.get(f.x, f.y) !== T.FAULTSTONE) { f.done = 1; continue; }   // 다른 까닭으로 사라진 자갈
      this.parts.push(new Part((f.x + Math.random()) * TS, (f.y + 1) * TS, '#c8b890', 30, .9));
    }
  },

  /** 떨어지는 돌 — 흔들리는 동안(t) 제자리에서 먼지를 떨구고, 그다음 떨어진다 */
  updateRocks(dt) {
    const p = this.player, w = this.world;
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      if (r.t > 0) {
        r.t -= dt;
        if (Math.random() < dt * 14) this.parts.push(new Part(r.x + (Math.random() - .5) * 10, r.y + 8, '#a8a090', 40, .5));
        continue;
      }
      r.vy = Math.min(900, r.vy + 1500 * dt);
      r.y += r.vy * dt;
      const hitP = Math.abs(r.x - p.cx) < p.w / 2 + 6 && r.y > p.y && r.y < p.y + p.h;
      const hitW = w.solid(Math.floor(r.x / TS), Math.floor((r.y + 8) / TS));
      if (hitP || hitW || r.y > (WH - 2) * TS) {
        if (hitP) p.hurt(r.dmg, r.x);
        for (let k = 0; k < 12; k++) this.parts.push(new Part(r.x, r.y, '#8a8478', -60, .8));
        this.sfx('break_stone');
        this.rocks.splice(i, 1);
      }
    }
  },

  /* ================= 운석 =================
     아주 드문 사건 — 반나절(국면)마다 한 번 굴리고, 비(0.20)의 1/100 이 안 되는 0.0018 이다(0.9%).
     흐름: ① 하늘 원경을 가르는 불덩이 + 알림 → ② FALL 초 뒤 떨어진다 — 지진(가까울수록 세고 길다),
     구덩이, 폭발 반경 안의 생물은 죽는다. **플레이어 머리 위면 즉사**(onDeath('meteor')).
     떨어질 자리는 세계 아무 데나지만 **이미 무언가 지어진 곳은 빼고** 고른다(meteorSiteOk).
     ★ 운석 전용 타일·운석 수정은 아직 없다(사용자: "아직은 안 쓸 것"). 구덩이는 있는 타일로만 —
       판 자리는 공기, 바닥은 재(T.ASH), 테두리는 흙이 한 칸 솟는다.
     진행 상태(this.meteor)는 저장하지 않는다 — 떨어지는 몇 초 사이에 저장·불러오기를 하면 그냥 안 떨어진다.
     구덩이는 타일이라 저장된다. */
  METEOR: { chance: 0.0018, fall: 5.2, fg: 1.2, rMin: 5, rMax: 8 },

  /** 떨어져도 되는 자리인가 — 구덩이 상자(좌우 R+3, 위 18 · 아래 R+2) 안에 지은 것이 하나도 없어야 한다 */
  meteorSiteOk(cx, R) {
    const w = this.world;
    if (cx < 40 || cx > WW - 40 || inSeaZone(cx)) return false;
    const cy = w.surface[cx];
    const x0 = cx - R - 3, x1 = cx + R + 3, y0 = cy - 18, y1 = cy + R + 2;
    if (w.giantTree && x1 >= w.giantTree.x - 24 && x0 <= w.giantTree.x + 24) return false;
    const built = new Set([T.PLANK, T.BRICK, T.PLATFORM, T.TORCH, T.RUINBRICK, T.RUINTILE, T.ALTARSTONE]);
    for (let x = x0; x <= x1; x++) {
      if (Math.abs(w.surface[clamp(x, 0, WW - 1)] - cy) > R + 4) return false;     // 절벽 가장자리는 피한다
      for (let y = y0; y <= y1; y++) {
        const z = w.zoneAt(x, y);
        if (z === 'village' || z === 'camp' || z === 'citadel' || z === 'deepshaft') return false;
        if (w.ruinAt(x, y)) return false;
        const t = w.get(x, y);
        if (built.has(t) || MACH_OF_TILE[t] || TILE_DEF[t].liquid) return false;
        if (y < w.surface[clamp(x, 0, WW - 1)] && w.walls[w.i(x, y)]) return false;   // 땅 위의 벽 = 누가 지은 집
        if (w.machines && w.machines.has(y * WW + x)) return false;
      }
    }
    const bx0 = x0 * TS, bx1 = (x1 + 1) * TS, by0 = y0 * TS, by1 = (y1 + 1) * TS;
    for (const o of w.objects) if (o.x < bx1 && o.x + (o.w || TS) > bx0 && o.y < by1 && o.y + (o.h || TS) > by0) return false;
    return true;
  },

  /** 운석을 띄운다. at 을 주면 그 칸에(디버그), 아니면 지은 것이 없는 자리를 뽑는다 */
  startMeteor(at) {
    if (this.meteor) return false;
    const w = this.world, M = this.METEOR;
    let x = -1, R = M.rMin + Math.floor(Math.random() * (M.rMax - M.rMin + 1));
    if (at !== undefined) x = clamp(Math.round(at), 40, WW - 40);
    else for (let i = 0; i < 400 && x < 0; i++) {
      const c = 40 + Math.floor(Math.random() * (WW - 80));
      if (this.meteorSiteOk(c, R)) x = c;
    }
    if (x < 0) return false;                                  // 떨어질 데가 없다 — 이번엔 지나간다
    const p = this.player, pd = x - Math.floor(p.cx / TS);
    this.meteor = { t: 0, x, y: w.surface[x], R, dir: pd >= 0 ? 1 : -1, hit: false, quake: 0, amp: 0 };
    this.toast('☄ 하늘을 가르는 불덩이 — 운석이 떨어진다!', 'bad');
    this.sfx('boss');
    return true;
  },

  updateMeteor(dt) {
    const m = this.meteor, M = this.METEOR;
    m.t += dt;
    if (!m.hit && m.t >= M.fall) this.meteorImpact();
    if (m.hit) {
      /* 지진 — 떨어진 곳과의 거리로 세기(amp)와 길이(quake)가 갈린다. shake 는 초당 26씩 가라앉으므로
         길게 흔들리려면 끝날 때까지 다시 채워 줘야 한다. */
      if (m.quake > 0) {
        m.quake -= dt;
        this.shake = Math.max(this.shake, m.amp * clamp(m.quake / m.quakeMax, 0.25, 1));
      }
      if (m.t > M.fall + Math.max(4, m.quakeMax || 0)) this.meteor = null;
    }
  },

  meteorImpact() {
    const m = this.meteor, w = this.world, p = this.player;
    m.hit = true;
    const cx = m.x, cy = m.y, R = m.R;
    const ptx = p.cx / TS, pty = p.cy / TS;
    const dist = Math.hypot(ptx - (cx + 0.5), pty - cy);
    /* 세기: 바로 곁 34 → 400칸 너머 3. 길이: 곁 4초 → 멀면 1초 */
    const near = clamp(1 - dist / 420, 0, 1);
    m.amp = 3 + 31 * near * near; m.quakeMax = m.quake = 1 + 3 * near;
    this.shake = Math.max(this.shake, m.amp);
    this.sfx('boom_big', 0.7, 0.4 + 0.6 * near);
    this.sfx('sk_quake', 1, 0.3 + 0.7 * near);
    this.carveCrater(cx, cy, R);
    // 불티·흙
    if (dist < 80) for (let i = 0; i < 90; i++) {
      const c = i % 3 ? (i % 2 ? '#ffb24a' : '#ff6a2a') : '#6a5a48';
      this.parts.push(new Part((cx + 0.5) * TS + (Math.random() - 0.5) * R * TS, cy * TS, c, -260 - Math.random() * 260, 0.9 + Math.random() * 0.9,
        { glow: i % 3 ? 1 : 0, spd: 2.2, g: i % 3 ? 0.4 : 1.2, sq: i % 3 ? 0 : 1 }));
    }
    // 폭발 반경 안의 생물 — 주인은 버틴다(보스가 돌에 맞아 죽으면 이야기가 끊긴다)
    const bx = (cx + 0.5) * TS, by = cy * TS, br = (R + 2) * TS;
    for (const e of this.ents) {
      if (e.dead || e.boss) continue;
      // die() 는 경험치·금화를 준다 — 하늘이 잡은 것까지 플레이어 몫으로 치면 안 된다
      if (Math.hypot(e.cx - bx, e.cy - by) < br) { e.hp = 0; e.dead = true; }
    }
    // ★ 머리 위면 즉사 — 판정 상자가 폭발 원(R+1칸)에 닿으면. 무적 시간도 소용없다
    const qx = clamp(bx, p.x, p.x + p.w), qy = clamp(by, p.y, p.y + p.h);
    if (Math.hypot(qx - bx, qy - by) < (R + 1) * TS && this.state === 'play') {
      p.hp = 0;
      this.toast('☄ 운석에 맞았다.', 'bad');
      this.onDeath('meteor');
      return;
    }
    const dx = cx - Math.floor(ptx);
    const where = dist < 40 ? '바로 곁에' : `${dx >= 0 ? '동쪽' : '서쪽'}으로 ${Math.abs(dx)}칸 떨어진 곳에`;
    this.toast(`☄ 운석이 ${where} 떨어졌다. 땅이 울린다.`, 'bad');
  },

  /** 운석 구덩이 — 있는 타일로만. 나무·풀은 날아가고, 사발 모양으로 파이고, 바닥은 재, 테두리는 흙이 솟는다 */
  carveCrater(cx, cy, R) {
    const w = this.world;
    for (let dx = -R - 3; dx <= R + 3; dx++) {
      const x = cx + dx;
      if (x < 1 || x >= WW - 1) continue;
      // 위의 나무·잎·풀·덩굴은 날아간다(안 떨구면 구덩이 위에 수관이 뜬다)
      for (let y = cy - 24; y <= cy + R; y++) {
        const t = w.get(x, y), d = TILE_DEF[t];
        if (t !== T.AIR && (d.tree || d.leaf || d.plant || t === T.VINE || t === T.FLOWER || t === T.WEED)) w.set(x, y, T.AIR);
      }
      if (Math.abs(dx) <= R) {
        const depth = Math.round(Math.sqrt(R * R - dx * dx) * 0.75);
        const top = w.surface[x], bot = cy + depth;
        for (let y = Math.min(top, cy) - 2; y <= bot; y++) {
          if (w.get(x, y) === T.BEDROCK) continue;
          w.set(x, y, T.AIR); w.setWall(x, y, 0);                 // 벽도 걷는다 — 하늘이 트여야 햇빛이 든다
        }
        // 바닥 — 가운데(반지름의 7할)는 열에 녹아 굳은 돌, 바깥은 재
        const skin = Math.abs(dx) <= R * 0.7 ? T.FUSEDROCK : T.ASH;
        if (w.solid(x, bot + 1) && w.get(x, bot + 1) !== T.BEDROCK) w.set(x, bot + 1, skin);
        if (w.solid(x, bot + 2) && w.get(x, bot + 2) !== T.BEDROCK && Math.random() < 0.5) w.set(x, bot + 2, skin);
        w.surface[x] = bot + 1;
      } else if (Math.abs(dx) <= R + 2) {
        // 테두리 — 튀어나간 흙이 한 칸 쌓인다
        const s = w.surface[x];
        if (w.get(x, s - 1) === T.AIR) { w.set(x, s - 1, T.DIRT); w.surface[x] = s - 1; }
      }
    }
    this.placeMeteorite(cx, cy, R);
  },

  /** 구덩이 한가운데에 운석 덩이를 반쯤 묻고, 그 둘레 바닥에 별빛 수정을 틔운다.
      덩이는 줄마다 반폭을 적은 둥근 덩어리(R 7 이상 3·5·3칸, 아니면 1·3·3칸)이고 윗줄이 바닥 위로 솟는다 —
      다 묻으면 무엇이 떨어졌는지 모르고, 7칸 타원으로 깔았더니 구덩이 바닥을 다 메워 그릇이 평평해 보였다.
      수정은 **바닥 바로 위 빈 칸**에만(걸음을 안 막는다). */
  placeMeteorite(cx, cy, R) {
    const w = this.world;
    const floor = cy + Math.round(R * 0.75) + 1;            // 가운데 칸의 바닥(첫 고체) 높이
    const rows = R >= 7 ? [1, 2, 1] : [0, 1, 1], rx = R >= 7 ? 2 : 1;
    rows.forEach((hw, k) => {
      const y = floor - 1 + k;
      for (let dx = -hw; dx <= hw; dx++) {
        const x = cx + dx;
        if (w.get(x, y) === T.BEDROCK) continue;
        w.set(x, y, T.METEORITE); w.setWall(x, y, 0);
        if (y < w.surface[x]) w.surface[x] = y;
      }
    });
    // 수정 — 덩이 둘레(덩이 폭 + 4칸)의 바닥에 드문드문. 적어도 둘은 난다
    const spots = [];
    for (let dx = -rx - 4; dx <= rx + 4; dx++) {
      const x = cx + dx, s = w.surface[x];
      if (w.get(x, s - 1) === T.AIR && w.solid(x, s)) spots.push(x);
    }
    let n = 0;
    for (const x of spots) if (Math.random() < 0.4) { w.set(x, w.surface[x] - 1, T.STARCRYSTAL); n++; }
    for (let k = 0; n < 2 && k < spots.length; k++) {
      const x = spots[(k * 5 + 3) % spots.length];
      if (w.get(x, w.surface[x] - 1) === T.AIR) { w.set(x, w.surface[x] - 1, T.STARCRYSTAL); n++; }
    }
  },

  /** 하늘 원경의 불덩이 — drawSky 가 부른다(땅 위 하늘을 그릴 때만). 떨어질 쪽으로 사선을 긋는다 */
  drawMeteorSky(c, camY) {
    const m = this.meteor;
    if (!m) return;
    const M = this.METEOR;
    if (!m.hit) {
      const u = clamp(m.t / M.fall, 0, 1);
      const hx = this.W * (0.5 - m.dir * 0.42 + m.dir * 0.8 * u), hy = this.H * (0.04 + 0.62 * Math.pow(u, 1.3)) - camY * 0.05;
      const L = 90 + 240 * u, ang = Math.atan2(0.62 * this.H, m.dir * 0.8 * this.W);
      const tx = hx - Math.cos(ang) * L, ty = hy - Math.sin(ang) * L;
      /* 구운 그림(tools/mksky.py sky_meteor — 흰 머리 · 녹청빛 가장자리 · 노랑→붉은 꼬리 · 불티)을 나아가는
         쪽으로 돌려 그린다. 머리는 그림의 (242, 24). 가까워질수록(u) 커진다. 그림이 없으면 아래 선·원. */
      const im = Sprites.img.sky_meteor;
      if (im && im.width) {
        const k = 1.0 + 1.4 * u;                                     // 낮 하늘에서도 읽히게 — 0.55+0.9u 는 한낮에 거의 안 보였다
        c.save();
        c.translate(hx, hy); c.rotate(ang);
        c.drawImage(im, -242 * k, -24 * k, 256 * k, 48 * k);
        c.globalCompositeOperation = 'lighter';                    // 머리의 섬광만 더한다(밤하늘에서 빛나게)
        const hg = c.createRadialGradient(0, 0, 0, 0, 0, 14 * k);
        hg.addColorStop(0, 'rgba(255,245,220,.55)'); hg.addColorStop(1, 'rgba(255,200,120,0)');
        c.fillStyle = hg; c.beginPath(); c.arc(0, 0, 14 * k, 0, TAU); c.fill();
        c.restore();
        return;
      }
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(255,120,60,0)'); g.addColorStop(0.7, 'rgba(255,150,70,.45)'); g.addColorStop(1, 'rgba(255,230,170,.95)');
      c.strokeStyle = g; c.lineWidth = 3 + 4 * u; c.lineCap = 'round';
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
      const r = 5 + 7 * u, hg = c.createRadialGradient(hx, hy, 0, hx, hy, r * 3.5);
      hg.addColorStop(0, 'rgba(255,250,220,1)'); hg.addColorStop(0.3, 'rgba(255,190,100,.8)'); hg.addColorStop(1, 'rgba(255,120,60,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(hx, hy, r * 3.5, 0, TAU); c.fill();
      c.restore();
    } else {
      // 떨어진 뒤 — 지평선이 잠깐 달아오른다(멀리 떨어졌어도 어디쯤인지 보이게)
      const k = clamp(1 - (m.t - M.fall) / 2.5, 0, 1);
      if (k > 0) {
        const hx = this.W * (0.5 + m.dir * 0.38), hy = this.H * 0.7 - camY * 0.05;
        const hg = c.createRadialGradient(hx, hy, 0, hx, hy, this.W * 0.35);
        hg.addColorStop(0, `rgba(255,170,90,${0.55 * k})`); hg.addColorStop(1, 'rgba(255,120,60,0)');
        c.fillStyle = hg; c.fillRect(0, 0, this.W, this.H);
      }
    }
  },

  /** 가까이 떨어질 때 — 마지막 fg 초 동안 **세계 앞**으로 불덩이가 내리꽂힌다(화면 안이거나 곁이면) */
  drawMeteorNear(c, camX, camY) {
    const m = this.meteor;
    if (!m) return;
    const M = this.METEOR, ix = (m.x + 0.5) * TS, iy = m.y * TS;
    if (m.hit) {
      const k = clamp(1 - (m.t - M.fall) / 0.35, 0, 1);          // 떨어진 순간의 섬광
      if (k > 0 && Math.abs(ix - camX - this.W / 2) < this.W) {
        c.save(); c.globalAlpha = 0.8 * k; c.fillStyle = '#fff4d8'; c.fillRect(0, 0, this.W, this.H); c.restore();
      }
      return;
    }
    const left = M.fall - m.t;
    if (left > M.fg || Math.abs(ix - camX - this.W / 2) > this.W * 1.2) return;
    const u = 1 - left / M.fg;
    const sx = ix - m.dir * 420 * (1 - u) - camX, sy = iy - 900 * (1 - u) - camY;
    /* 구운 그림(sky_meteor_near — 울퉁불퉁한 바위 · 달아오른 앞면 · 불꼬리 · 연기). 바위 가운데는 그림의 (286, 56).
       내리꽂히는 방향(dir·420, 900)으로 돌린다. */
    const nim = Sprites.img.sky_meteor_near;
    if (nim && nim.width) {
      c.save();
      c.translate(sx, sy); c.rotate(Math.atan2(900, m.dir * 420));
      c.drawImage(nim, -286, -56, 320, 112);
      c.restore();
      return;
    }
    const tx = sx - m.dir * 120, ty = sy - 260;
    c.save();                                      // 보통 합성 — 밝은 낮 하늘에 lighter 로 더하면 하얗게 날아간다
    const g = c.createLinearGradient(tx, ty, sx, sy);
    /* ★ 한가운데까지 흰색으로 두고 lighter 로 더했더니 낮 하늘과 합쳐져 **흰 원반**만 보였다(스크린샷).
       보통 합성으로 · 불꼬리·불덩이 모두 주황 쪽으로 — 한가운데 작은 점만 밝게. */
    g.addColorStop(0, 'rgba(255,90,30,0)'); g.addColorStop(0.6, 'rgba(255,120,40,.5)'); g.addColorStop(1, 'rgba(255,190,90,.85)');
    c.strokeStyle = g; c.lineWidth = 14; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(sx, sy); c.stroke();
    const hg = c.createRadialGradient(sx, sy, 0, sx, sy, 34);
    hg.addColorStop(0, 'rgba(255,220,150,.9)'); hg.addColorStop(0.3, 'rgba(255,130,50,.7)'); hg.addColorStop(1, 'rgba(200,60,20,0)');
    c.fillStyle = hg; c.beginPath(); c.arc(sx, sy, 34, 0, TAU); c.fill();
    c.restore();
    c.fillStyle = '#3a2a22'; c.beginPath(); c.arc(sx, sy, 9, 0, TAU); c.fill();      // 돌덩이
  },

  /** 금 간 자갈을 깼다 — 곡괭이든 폭탄이든. 그 자리의 자갈 기록을 찾아 무너뜨린다 */
  triggerFault(tx, ty) {
    const w = this.world;
    if (this.quake) return;                  // 이미 울리는 중 — 남은 자갈은 다음에 캐면 무너진다
    /* 무너질 칸 = 깬 칸에 **맞닿아 이어진 자갈 전부**. 세계가 굴 자리 전체를 자갈로 채워 두므로
       (world.js buildFaults 의 ★) 덩어리 어디를 캐도 같은 굴이 열린다. 깬 자리에서 가까운
       칸부터 무너지게 거리로 줄 세운다 — 무너짐이 깬 자리에서 퍼져 나간다. */
    const cells = [], seen = new Set([ty * WW + tx]), st = [[tx, ty]];
    while (st.length && cells.length < 6000) {
      const [x, y] = st.pop();
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = ny * WW + nx;
        if (seen.has(k) || w.get(nx, ny) !== T.FAULTSTONE) continue;
        seen.add(k); cells.push([nx, ny]); st.push([nx, ny]);
      }
    }
    let f = (w.faults || []).find(q => !q.done && Math.abs(q.cx - tx) <= FAULT.rx + 8 && Math.abs(q.cy - ty) <= FAULT.ry + 8);
    // 자갈 한 칸만 박혀 있던 v7 첫 판 세계 — 그때처럼 씨앗에서 굴 모양을 뽑는다
    const old = !cells.length && !!f;
    if (old) cells.push(...w.faultCells(f));
    if (!cells.length) return;
    if (!f) f = { x: tx, y: ty, dir: 1, cx: tx, cy: ty, seed: tx * 9973 + ty * 31 };
    f.done = 1;
    cells.sort((a, b) => Math.hypot(a[0] - tx, a[1] - ty) - Math.hypot(b[0] - tx, b[1] - ty));
    this.quake = { f, cells, t: 0, i: 0, old };
    this.toast('자갈이 무너지자 땅이 울린다 — 물러서라!', 'bad');
    this.shake = 22;
    this.sfx('sk_quake');
  },
  /* 지진 — 2.6초 동안 흔들리며 새 굴을 차례로 판다(한 번에 파면 화면이 한 프레임에 뒤바뀐다).
     그동안 플레이어 둘레 천장에서 돌이 떨어진다. 다 파면 갈래를 입히고 상자·광석·굴의 것들. */
  updateQuake(dt) {
    const q = this.quake, w = this.world, p = this.player;
    q.t += dt;
    this.shake = Math.max(this.shake || 0, q.t < 2.2 ? 9 : 3);
    const want = Math.floor(q.cells.length * clamp((q.t - 0.4) / 1.8, 0, 1));
    for (; q.i < want; q.i++) {
      const [x, y] = q.cells[q.i];
      const t = w.get(x, y);
      if (t !== T.FAULTSTONE && !(q.old && w.solid(x, y))) continue;   // 그새 다른 것이 된 칸은 두고
      if (t === T.BEDROCK) continue;
      w.set(x, y, T.AIR);
      if (Math.random() < 0.05) this.parts.push(new Part((x + .5) * TS, (y + .5) * TS, '#7a7266', 20, 1));
    }
    q.rockT = (q.rockT || 0) - dt;
    if (q.t < 2.2 && q.rockT <= 0) {
      q.rockT = 0.35;
      const x = Math.floor(p.cx / TS) + Math.floor(Math.random() * 13) - 6;
      let y = Math.floor(p.cy / TS) - 2;
      while (y > Math.floor(p.cy / TS) - 14 && !w.solid(x, y - 1)) y--;
      this.rocks.push({ x: (x + .5) * TS, y: (y + .5) * TS, vy: 0, t: 0.25, dmg: 10 + p.level * 0.6 });
    }
    if (q.t < 2.6 || q.i < q.cells.length) return;
    this.quake = null;
    const f = q.f;
    const k = w.dressFault(f, q.cells);
    const C = CAVE_TYPES[k];
    // 상자 — 새 굴 한가운데에 가까운 바닥에. 깊이로 등급을 매긴다(큰 동굴과 같은 셈)
    const floors = q.cells.filter(([x, y]) => w.get(x, y) === T.AIR && w.solid(x, y + 1) && w.get(x, y - 1) === T.AIR);
    floors.sort((a, b) => Math.hypot(a[0] - f.cx, a[1] - f.cy) - Math.hypot(b[0] - f.cx, b[1] - f.cy));
    /* 상자는 **드물게**(열에 셋) — 무너진 굴마다 상자가 있으면 자갈을 보자마자 캐는 것이 곧
       정답이 된다. 굴 자체(장식·드러난 광맥·굴의 것들)가 보상의 몸통이다. */
    const chestRng = new RNG(f.seed + 13);
    if (floors.length && chestRng.chance(0.3)) {
      const [gx, gy] = floors[0];
      const tier = gy < SY(180) ? 3 : gy < DEEP_Y ? 4 : 5;
      w.objects.push({ type: 'chest', tier, x: gx * TS, y: (gy - 0.2) * TS, w: 30, h: 26, items: null });
    }
    // 굴에 살던 것들 — 셋, 플레이어에게서 떨어진 바닥에
    const pool = f.y > DEEP_Y ? ['skeleton', 'spider'] : ['bat', 'spider'];
    let made = 0;
    for (const [x, y] of floors.slice().reverse()) {
      if (made >= 3) break;
      if (Math.abs(x * TS - p.cx) < 8 * TS) continue;
      const e = new Enemy(pool[made % pool.length], x * TS, y * TS, this.scale());
      e.y = (y + 1) * TS - e.h;
      this.ents.push(e); made++;
    }
    this.tally = this.tally || {};
    this.tally.faults = (this.tally.faults || 0) + 1;
    this.toast(`무너진 벽 너머에 ${iga(C.n)} 숨어 있었다`, 'good');
    this.sfx('chapter');
    this.checkAch();
  },

  /** 동굴 쪽 그리기 — 떨어지는 돌(흔들리는 동안은 제자리에서 떤다)과 독기 굴의 탁한 공기 */
  drawCaves(c, camX, camY) {
    for (const r of (this.rocks || [])) {
      const jx = r.t > 0 ? (Math.random() - .5) * 3 : 0;
      const sx = r.x - camX + jx, sy = r.y - camY;
      if (sx < -30 || sx > this.W + 30 || sy < -30 || sy > this.H + 30) continue;
      c.fillStyle = r.kind === 'drip' ? '#9a9488' : '#6a6258';
      c.beginPath();
      if (r.kind === 'drip') { c.moveTo(sx - 7, sy - 10); c.lineTo(sx + 7, sy - 10); c.lineTo(sx, sy + 11); }
      else { c.moveTo(sx - 7, sy - 4); c.lineTo(sx - 2, sy - 8); c.lineTo(sx + 7, sy - 3); c.lineTo(sx + 5, sy + 6); c.lineTo(sx - 5, sy + 7); }
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(sx - 4, sy - 7, 2, 7);
    }
    if (this.caveHere && CAVE_TYPES[this.caveHere].id === 'fume') {
      c.save();
      c.globalAlpha = 0.16 + Math.sin((this.time || 0) * 1.3) * 0.03;
      c.fillStyle = '#9aa84a';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }
  },

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
      // 무엇을 맞춰야 하는지는 그 유적의 자물쇠 갈래를 따라간다(숫자 · 글자 · 풀어 읽기)
      const c = this.ruinCipher(e.ruin), K = c && CIPHER_KIND[c.kind];
      this.toast(K ? `벽 너머에 빈 곳이 있다 — ${K.n}이다` : '벽 너머에 빈 곳이 있다');
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

  /** 그 유적의 자물쇠 — 갈래 · 답 · 문에 새겨진 것 · 쪽지 셋.
      세계 씨앗에서 뽑으므로 세계마다 다르고, 같은 세계에서는 늘 같다
      (저장하지 않는다 — 굳혀 두면 옛 세이브에서 답이 갈린다).

      kind   digits 모으기 · word 글자 · decode 풀어 읽기
      ans    문이 받는 답 (대소문자·공백은 넣을 때 지운다)
      shown  문설주에 새겨져 보이는 것. 없으면 빈 글자
      notes  쪽지 셋의 글. 셋을 다 읽어야 답이 나오게 짰다 */
  ruinCipher(id) {
    const kind = RUIN_CIPHER[id];
    if (!kind) return null;
    this._cipherCache = this._cipherCache || {};
    const ck = this.world.seed + ':' + id;
    if (this._cipherCache[ck]) return this._cipherCache[ck];
    const h = hashStr(ck);
    const K = CIPHER_KIND[kind];
    let ans = '', shown = '', notes = [];
    const ord = ['첫', '둘째', '셋째'];
    if (kind === 'digits') {
      ans = String(100 + (h % 900));
      notes = ord.map((o, i) =>
        [`${o} 홈`, ['여기 새긴 것은 문을 여는 수의 한 자리다.',
                     '나머지는 다른 방에 나누어 적었다 — 한 사람이 다 알면 안 되었으므로.',
                     '', `『${o} 자리는 ${ans[i]}』`]]);
    } else if (kind === 'word') {
      ans = CIPHER_WORDS[h % CIPHER_WORDS.length];
      notes = ord.map((o, i) =>
        [`${o} 글자`, ['문을 여는 것은 수가 아니라 말이다. 세 글자짜리 말.',
                      '우리는 그 말을 셋으로 끊어 서로 다른 방에 두었다.',
                      '', `『${o} 글자는 ${ans[i]}』`]]);
    } else {
      /* 풀어 읽기 — 문에 새긴 수를 뒤에서부터 읽고 거기에 한 자리 수를 더한다.
         뒤집어도 세 자리이고 더해도 999 를 안 넘게 범위를 잡는다. */
      const base = 141 + (h % 850);              // 141~990
      const k = 1 + ((h >> 7) % 9);              // 1~9
      ans = String(base + k);                    // 142~999 — 반드시 세 자리
      shown = String(base).split('').reverse().join('');
      notes = [
        ['거짓으로 새긴 것', ['문설주의 수를 곧이곧대로 넣지 마라.',
                             '여기 사람들은 무엇이든 거꾸로 적는 버릇이 있었다.']],
        ['읽는 법', ['새긴 것을 뒤에서부터 읽어라. 마지막 자리가 첫 자리다.',
                    '그러면 우리가 원래 적으려 한 수가 나온다.']],
        ['마지막 한 걸음', ['거꾸로 읽어 낸 수가 아직 답은 아니다.',
                          `거기에 ${eulreul(String(k))} 더해야 홈이 물린다.`,
                          '문지기가 하루에 한 번씩 더하던 수다.']]
      ];
    }
    return (this._cipherCache[ck] = { id, kind, ans, shown, notes, len: K.len, numeric: K.numeric });
  },

  /** 암호 쪽지 하나를 읽는다 — 그 유적 자물쇠의 세 조각 중 하나 */
  readCipherNote(o) {
    const c = this.ruinCipher(o.ruin);
    if (!c) return;
    const nt = c.notes[o.idx] || c.notes[0];
    this.cipherSeen = this.cipherSeen || {};
    (this.cipherSeen[o.ruin] = this.cipherSeen[o.ruin] || {})[o.idx] = 1;
    const seen = Object.keys(this.cipherSeen[o.ruin]).length;
    const lines = nt[1].slice();
    lines.push('', `— 이 유적에서 찾은 쪽지 ${seen}/3`);
    UI.openLore(nt[0], lines, []);
    this.sfx('open');
  },

  /** ★ 암호는 게임 안 창(#code-screen)으로 받는다. 브라우저 prompt() 는 창 밖에 뜨는
      데다 그동안 게임이 통째로 얼어붙는다. */
  /** 그 유적의 암호 골방 문이 열렸는가 — 골방 상자의 자물쇠가 이 값을 본다 */
  ruinCodeDone(ruinId) {
    for (const o of (this.world.objects || []))
      if (o.type === 'codedoor' && o.ruin === ruinId) return !!o.opened;
    return true;          // 문이 아예 없으면 잠글 것도 없다
  },

  openCodeDoor(o) {
    if (o.opened) { this.toast('이미 열려 있다'); return; }
    const el = $('#code-screen'), inp = $('#code-input'), msg = $('#code-msg');
    const c = this.ruinCipher(o.ruin);
    const K = c ? CIPHER_KIND[c.kind] : null;
    inp.value = ''; msg.textContent = ''; msg.classList.remove('ok');
    /* 자물쇠 갈래마다 문에 적힌 것이 다르다 — 숫자 홈인지 글자 홈인지, 문설주에 새겨진 수가 있는지. */
    $('#code-title').textContent = K ? K.n : '돌판의 홈';
    $('#code-door').textContent = K ? K.door : '홈이 셋.';
    const seen = ((this.cipherSeen || {})[o.ruin]) || {};
    $('#code-hint').textContent =
      `유적 안에 흩어진 쪽지 셋이 답을 나눠 들고 있다 (찾은 것 ${Object.keys(seen).length}/3)`;
    const carved = $('#code-carved');
    if (c && c.shown) { carved.hidden = false; carved.textContent = `문설주에 새긴 것 — ${c.shown}`; }
    else carved.hidden = true;
    inp.maxLength = c ? c.len : 3;
    inp.placeholder = c && !c.numeric ? '○○○' : '000';
    inp.setAttribute('inputmode', c && !c.numeric ? 'text' : 'numeric');
    this.codeDoor = o;
    this.openModal('#code-screen');
    this.uiOpen = true;
    setTimeout(() => inp.focus(), 30);
    this.sfx('open');
    if (el.dataset.bound) return;              // 배선은 한 번만
    el.dataset.bound = '1';
    /* 받는 글자는 자물쇠에 따라 다르다 — 숫자 자물쇠는 숫자만, 글자 자물쇠는 글자만.
       (한글은 조합 중에도 input 이 뜨므로 조합이 끝난 글자 수로만 센다) */
    inp.addEventListener('input', () => {
      const cc = this.codeDoor ? this.ruinCipher(this.codeDoor.ruin) : null;
      const numeric = !cc || cc.numeric;
      const len = cc ? cc.len : 3;
      if (numeric) inp.value = inp.value.replace(/\D/g, '');
      else inp.value = inp.value.replace(/[\s0-9]/g, '');
      inp.value = inp.value.slice(0, len);
      if (inp.value.length === len && numeric) this.tryCodeDoor();
    });
    inp.addEventListener('keydown', e => {
      e.stopPropagation();                     // 게임 조작키로 새지 않게
      if (e.key === 'Enter') this.tryCodeDoor();
      if (e.key === 'Escape') this.closeCodeDoor();
    });
    $('#btn-code-ok').onclick = () => this.tryCodeDoor();
    $('#btn-code-cancel').onclick = () => this.closeCodeDoor();
    el.onclick = e => { if (e.target === el) this.closeCodeDoor(); };
  },

  closeCodeDoor() {
    this.closeModal('#code-screen');
    this.codeDoor = null;
    this.uiOpen = false;
  },

  /** 넣은 것을 맞춰 본다 — 자물쇠 갈래와 상관없이 여기 한 군데서 본다 */
  tryCodeDoor() {
    const o = this.codeDoor; if (!o) return;
    const w = this.world, inp = $('#code-input'), msg = $('#code-msg');
    const c = this.ruinCipher(o.ruin);
    const K = c ? CIPHER_KIND[c.kind] : null;
    const got = inp.value.replace(/\s/g, '');
    if (!c) { msg.textContent = '이 문은 여기서 열 수 없다'; return; }
    if (got.length < c.len) {
      msg.classList.remove('ok');
      msg.textContent = `${eulreul(K.ask)} 다 넣어야 한다`;
      return;
    }
    if (got !== c.ans) {
      msg.classList.remove('ok');
      msg.textContent = '맞지 않는다 — 홈이 그대로다';
      inp.value = ''; inp.focus();
      this.sfx('mine');
      return;
    }
    msg.classList.add('ok');
    msg.textContent = '맞물리는 소리가 났다';
    o.opened = true;
    if (w.openVaultAt) w.openVaultAt(o.dx, o.dy);   // 다시 봉하지 않게 표시
    w.openCodeDoorway(o.dx, o.dy);                  // 껍질 두 겹을 다 뚫는다 (world.js 의 ★)
    for (let i = 0; i < 30; i++)
      this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#ffe08a', -30, 1.1));
    this.shake = 10;
    this.toast('맞물리는 소리가 났다', 'good');
    this.sfx('chapter');
    setTimeout(() => this.closeCodeDoor(), 700);
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
    this.seenRuins[r.id] = 1;                  // 기록은 늘 남긴다(탐험 목표·지도가 읽는다)
    // 카드는 들어올 때마다. 다만 입구를 들락거려도 도배되지 않게 90초 간격을 둔다
    this._cardAt = this._cardAt || {};
    const key = 'ruin:' + r.id;
    if (this.time - (this._cardAt[key] || -1e9) < 90) return;
    this._cardAt[key] = this.time;
    const card = RUIN_CARD[r.id];
    const spec = RUIN_SPEC.find(s => s.id === r.id);
    // 석판 유적 셋은 RUIN_SPEC 에 없다 — STORY_RUIN 에서 이름을 가져온다
    const st = /^story(\d)$/.exec(r.id);
    const name = spec ? spec.n
      : (st && STORY_RUIN[+st[1]] && STORY_RUIN[+st[1]].n) || '이름 없는 유적';
    if (card) UI.chapterCard({ sub: card.sub, title: name, line: card.line });
    this.sfx('chapter');
  },

  /** 바이옴에 처음 들어섰을 때 — 그 땅이 어떤 곳인지 한 번 알린다.

      유적에는 카드가 있는데 땅에는 없어서, 걷다 보면 눈이 흙으로 바뀌고 흙이 모래로
      바뀌는데도 "여기가 어디"라는 말이 한 번도 없었다. 유적과 같은 카드를 쓰되
      **무엇이 사는가가 아니라 그 땅이 어떤 곳인가**를 적는다(BIOMES[].card).
      들어올 때마다 뜬다 — 같은 곳은 90초 안에는 다시 띄우지 않는다(도배 방지).
      seenBiomes 는 계속 남긴다(탐험 목표와 지도가 그걸 읽는다). */
  /** 지금 화면 뒤에 깔린 원경이 무엇인가 — drawParallaxArt 의 고르는 규칙과 같다.
      이름표는 **이 값이 바뀌는 순간**에 띄운다. 눈에 보이는 배경이 바뀌는 그 자리가
      "다른 땅에 들어섰다"고 느끼는 자리이기 때문이다. 원경이 없는 지하 중간층은 null. */
  bgId(camX, camY) {
    const p = this.player, w = this.world;
    if (!p || !w) return null;
    if (camY > HELL_Y * TS - 700) return 'hell';
    const zone = w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    if (zone === 'sky' || zone === 'ruin' || zone === 'village' || zone === 'camp') return zone;
    if (camY > SURF_BASE * TS + 500) return null;
    /* ★ 땅 이름은 **플레이어가 선 자리**로 정한다. 구역(zone)은 플레이어 자리를 보는데
       땅만 카메라 한가운데를 보면, 가장자리에서 아직 들어서지도 않은 땅의 이름표가 뜬다. */
    return w.biomeAt(clamp(Math.floor(p.cx / TS), 0, WW - 1)).id;
  },

  /** 땅·구역의 이름표. **원경 그림이 바뀔 때** 한 번 띄운다.

      유적에는 카드가 있는데 땅에는 없어서, 걷다 보면 눈이 흙으로 바뀌고 흙이 모래로
      바뀌는데도 "여기가 어디"라는 말이 한 번도 없었다. 유적과 같은 카드를 쓰되
      **무엇이 사는가가 아니라 그 땅이 어떤 곳인가**를 적는다(BIOMES[].card · ZONE_CARD).
      한 번뿐이라 다시 지나가도 뜨지 않는다(seenBiomes 는 세이브에 남는다). */
  checkBiomeEntry(camX, camY) {
    if (this.time < 3) return;                 // 시작 직후엔 장 카드와 겹친다
    const id = this.bgId(camX, camY);
    if (!id) return;                           // 원경이 없는 층 — 기준이 없으니 세지 않는다
    if (id === this._bgId) return;             // 배경이 그대로면 아무 일도 없다
    const first = this._bgId === undefined;
    this._bgId = id;
    if (first) return;                         // 들어온 첫 프레임은 "바뀐 것"이 아니다
    if (!this.seenBiomes) this.seenBiomes = {};
    const z = ZONE_CARD[id];
    const b = z ? null : BIOMES.find(q => q.id === id);
    const card = z ? z.card : (b && b.card);
    if (!card) return;                         // 유적·하늘 섬·지옥은 제 카드가 따로 있다
    /* ★ 기록(seenBiomes — 탐험 목표가 읽는다)은 남기되 카드는 **들어올 때마다** 띄운다.
       한 번 적히면 다시 안 뜨게 두면 한참 뒤에 돌아와도 여기가 어디인지 말해 주지 않는다.
       경계에서 왔다 갔다 하면 도배되므로 같은 곳은 90초 동안 다시 안 띄운다. */
    this.seenBiomes[id] = 1;
    this._cardAt = this._cardAt || {};
    if (this.time - (this._cardAt[id] || -1e9) < 90) return;
    this._cardAt[id] = this.time;
    /* 소리는 내지 않는다. 장 카드와 같은 UI를 빌려 쓰다 보니 장 전환 팡파르까지 같이
       울렸는데, 이름표는 "여기가 어디"라고 조용히 알려 주는 것이지 사건이 아니다.
       걷다 보면 경계가 여러 번 나오므로 그때마다 팡파르가 울리면 그게 더 크게 들린다. */
    UI.chapterCard({ sub: z ? z.sub : b.card.sub, title: z ? z.n : b.n, line: card.line });
  },

  /** 그 땅의 공기색. 경계에서는 두 색을 섞어 선이 보이지 않게 한다.
      깊이 내려갈수록 옅어진다 — 지옥에는 지옥의 색이 따로 있다. */
  biomeAir(camX, camY) {
    const w = this.world;
    const tx = clamp(Math.floor((camX + this.W / 2) / TS), 0, WW - 1);
    const [i, j, k] = w.biomeMix(tx);
    const A = BIOMES[i].air, B = BIOMES[j].air;
    if (!A || !B) return null;
    const ty = (camY + this.H / 2) / TS;
    // 지표 위에서는 그대로, 지옥에 가까울수록 사라진다
    const depth = 1 - clamp((ty - SURF_BASE - 60) / (HELL_Y - SURF_BASE - 60), 0, 1);
    const a = (A.a * (1 - k) + B.a * k) * (0.4 + 0.6 * depth);
    if (a < 0.004) return null;
    /* ★ 색도 채널별로 섞는다. `k > 0.25 ? B.c : A.c` 면 투명도는 부드러운데 색만 한
       프레임에 통째로 갈려, 경계를 걸어 넘을 때 공기색이 뚝 튄다. */
    /* k 는 0(한복판)~0.5(경계 한가운데) — 경계에서 딱 반반이라는 뜻이라 그대로 쓴다.
       ★ 두 배로 키우면 경계에서 100% 상대 색이 되어, 넘어서는 순간 A·B 의 자리가
         뒤바뀌며 또 튄다(그렇게 해서 75단계나 뛴 적이 있다). */
    return { c: mixHex(A.c, B.c, k), a };
  },

  /** 공기색을 화면에 덮는다. soft-light 한 겹으로 색을 물들이고, 아주 옅은 칠 한 겹으로
      전체 색조를 잡는다. 두 겹을 나눈 이유는 soft-light 만으로는 어두운 곳에서 거의
      드러나지 않고, 칠만 쓰면 화면이 뿌옇게 뜨기 때문이다. */
  drawAir(c, air) {
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.globalAlpha = Math.min(0.55, air.a * 2.2);
    c.fillStyle = air.c;
    c.fillRect(0, 0, this.W, this.H);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = air.a * 0.42;
    c.fillRect(0, 0, this.W, this.H);
    c.restore();
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

  drawHeldWeapon(c, p, sx, sy, bob, hand) {
    /* 손에 그려지는 것은 "지금 실제로 쓰는 것"이어야 한다 — 핫바에 도구·낚싯대가 있으면
       그것을, 아니면 장착 무기를. 장착 무기만 그리면 화면과 조작이 따로 논다. */
    const hi = p.held(), hd = hi && idef(hi);
    const tool = hd && (hd.type === 'tool' || hd.type === 'rod') ? hi : null;
    const wep = tool || p.equip.weapon;
    /* hand(game.js playerHand — 시트에 적힌 이 프레임의 무기 손)가 있으면 **그 손이 곧 자루 자리**다.
       사연: docs/code-history.md#h73 */
    const piv = hand ? hand.pt : [sx + 10, sy + 20 + bob];
    this._rodHand = hand ? piv : null;
    if (wep) {
      const d = idef(wep);
      c.save();
      c.translate(piv[0], piv[1]);
      if (hd && hd.type === 'rod') {
        /* 낚싯대는 아이템 그림(릴·줄·고리까지 그려진 32칸 도안)을 그대로 들면 손 옆에서
           뭉개져 무엇인지 안 읽힌다. 화면에서는 **막대기 하나로만** 그린다 — 줄은
           drawFishLine이 따로 긋고, 대 길이·굵기·끝 색으로 어떤 대인지 구분한다. */
        const L = this.rodLook(wep.id);
        c.scale(p.facing > 0 ? 1 : -1, 1);
        c.rotate(-0.4);
        c.lineCap = 'round';
        const line = (col, w) => {
          c.strokeStyle = col; c.lineWidth = w;
          c.beginPath(); c.moveTo(-3, 0); c.lineTo(L.len, 0); c.stroke();
        };
        line('#241c14', L.w + 1.6);                                 // 어두운 심 — 배경과 안 붙게
        line(L.c, L.w);
        c.strokeStyle = L.grip; c.lineWidth = L.w + 1.2;            // 손잡이
        c.beginPath(); c.moveTo(-3, 0); c.lineTo(4, 0); c.stroke();
        c.fillStyle = L.tip;                                        // 대 끝 — 등급 표시
        c.fillRect(L.len - 4, -L.w / 2 - 1, 4, L.w + 2);
        c.lineWidth = 1; c.lineCap = 'butt';
        c.restore();
      } else if (!tool && d.wc === 'ranged') {
        /* 활·쇠뇌·총은 겨눈 쪽을 향해야 한다. 아이콘이 이미 오른쪽(+x)을 쏘는 그림이라
           (활: 메긴 화살이 오른쪽, 레일건: 총구가 오른쪽) 겨눔 각도만큼 돌리면 그대로
           발사 방향이 된다. 자루 무기용 90° 보정을 여기서 걸면 아래를 겨누게 된다. */
        c.rotate(this.aimAngle(p));
        c.translate(hand ? 3 : BOW_HAND, 0);  // 팔을 뻗은 만큼 앞으로 — 손 자리면 이미 팔 끝이라 조금만
        Art.drawItem(c, wep.id, -13, -13, 26);
        c.restore();
      } else {
        if (tool && p.swing <= 0) {
          /* 도구는 **거울로 뒤집어** 그린다.
             사연: docs/code-history.md#h74 */
          c.scale(p.facing > 0 ? 1 : -1, 1);
          c.rotate(-0.4);
        } else {
          const ang = p.swing > 0
            ? (p.swingAng + (p.swingDir > 0 ? 1 : -1) * (p.swing / 0.24 - 0.5) * 2.0)
            : (p.facing > 0 ? -0.4 : Math.PI + 0.4);
          c.rotate(ang);
        }
        // 스프라이트는 위를 향하므로 90° 돌려 자루가 손에 오게 한다 — 손 자리면 자루 끝이 손을 한 칸 지나게(12)
        c.translate(hand ? 12 : 15, 0); c.rotate(Math.PI / 2);
        Art.drawItem(c, wep.id, -13, -13, 26);
        c.restore();
      }
      // 스윙 궤적 — 무기를 실제로 휘두를 때만(도구를 들고 있으면 베는 게 아니다)
      if (!tool && p.swing > 0 && d.wc === 'melee') {
        c.globalAlpha = p.swing / 0.24 * 0.32;
        c.strokeStyle = '#fff2c8'; c.lineWidth = 4;
        c.beginPath();
        c.arc(piv[0], piv[1], p.swingReach * 0.8, p.swingAng - 0.9, p.swingAng + 0.9);
        c.stroke(); c.lineWidth = 1; c.globalAlpha = 1;
      }
    }
    /* 손을 무기 **위에** 한 번 더 — 시트의 손 칸만 잘라 다시 그리면 손가락이 자루를 감싼 것처럼 보인다.
       (무기를 몸 뒤에 그리면 몸통에 가려지고, 몸 앞에 그리면 손 위를 덮어 "손 앞에 떠 있는" 무기가 된다) */
    if (hand && wep) {
      c.save();
      c.beginPath(); c.rect(hand.box[0], hand.box[1], hand.box[2], hand.box[3]); c.clip();
      Sprites.draw(c, hand.key, hand.fr, sx, sy, hand.flip);
      c.restore();
    }
    if (p.fish) this.drawFishLine(c, p, sx, sy, bob);
    if (p.channel) {
      c.globalAlpha = .5; c.strokeStyle = '#ffcf6a'; c.lineWidth = 3;
      c.beginPath(); c.arc(sx + 10, sy + 20, 60 + Math.sin(this.time * 20) * 8, 0, TAU); c.stroke();
      c.lineWidth = 1; c.globalAlpha = 1;
    }
  },

  /** 손그림 몹 위에 얹는 것들 — 피격 섬광 · 체력 막대 · 페이즈 전환 섬광.
      절차 흔들림 경로와 일반 경로가 같은 것을 그려야 해서 따로 뺐다. */
  drawEnemyOverlay(c, e, sx, sy, dy, meta, dx) {
    const w = meta ? meta.frameW : e.w;
    /* 개조된 것의 화로 — 구워 둔 시트에는 고정된 불빛만 들어 있다. 여기서 한 겹
       더 얹어 **뛰게** 만든다. 멈춰 있는 불빛은 칠해 놓은 무늬로 보이고, 뛰는
       불빛이라야 안에서 무언가 돌아가는 것으로 읽힌다.
       박자는 개체마다 어긋나게 둔다 — 스물다섯 마리가 한 박자로 뛰면 화면 전체가
       같이 깜빡여서 기계가 아니라 화면 오류처럼 보인다. */
    if (e.mech) {
      const ph = this.time * 3.4 + (e.cx % 97) * 0.31;
      const a = 0.30 + Math.sin(ph) * 0.22;
      const r = 3.4 + Math.sin(ph) * 0.9;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.max(0, a);
      const gx = sx + e.w / 2, gy = sy + e.h * 0.42;
      const gr = c.createRadialGradient(gx, gy, 0, gx, gy, r * 2.6);
      gr.addColorStop(0, '#ffb45a'); gr.addColorStop(0.45, '#d85a1e'); gr.addColorStop(1, '#d85a1e00');
      c.fillStyle = gr;
      c.beginPath(); c.arc(gx, gy, r * 2.6, 0, TAU); c.fill();
      c.restore();
    }
    if (e.flash > 0) {
      /* 피격 섬광 — 판정 박스가 아니라 **실제로 그려진 그림**을 덮는다.
         ★ 가로 자리는 dx 를 받아서 쓴다. 칸에 좌우 여백을 주면서(tools/padframe.py) frameW 가 늘어 어긋남이 더 눈에 띄었다.
         사연: docs/code-history.md#h75 */
      c.save(); c.globalAlpha = Math.min(.75, e.flash * 6); c.fillStyle = '#fff';
      c.fillRect(sx + (dx || 0), sy - dy, w, e.h + dy); c.restore();
    }
    /* 페이즈가 막 넘어간 보스를 금빛으로 덮는다. 시트가 페이즈마다 idle 두 장뿐이고
       그림 차이가 3% 안팎인 보스가 있어, 이게 없으면 바뀐 걸 알 수가 없다. */
    if (e.phaseT > 0) {
      c.save(); c.globalAlpha = Math.min(.55, e.phaseT * 0.8); c.fillStyle = '#ffe08a';
      c.fillRect(sx, sy - dy, w, e.h + dy); c.restore();
    }
    // 바다 부유물은 다치지 않아도 늘 보인다 — 막대 길이가 곧 "몇 대 쳐야 하나"(= 등급)라서
    if ((e.hp < e.maxHp || e.def.ai === 'flotsam') && !e.boss) {
      const bw = Math.max(22, e.w);
      c.fillStyle = '#000a'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw, 4);
      c.fillStyle = '#d0564c'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw * (e.hp / e.maxHp), 4);
    }
  },

  /** 바다 부유물 — 구운 그림(obj_flotsamN, tools/mkflotsam.py)을 물결 기울기(e.tilt)만큼
      기울여 그린다. 그림이 없으면 제 색 상자로 떨어진다. 3단계 궤짝은 봉인이 은은히 빛난다. */
  drawFlotsam(c, e, sx, sy) {
    const m = Sprites.meta && Sprites.meta.objects && Sprites.meta.objects.files[e.type];
    const w = m ? m.w : e.w, h = m ? m.h : e.h;
    const dx = (e.w - w) / 2, dy = h - e.h;
    c.save();
    c.translate(sx + e.w / 2, sy + e.h * 0.55);
    c.rotate(clamp(e.tilt || 0, -0.35, 0.35));
    c.translate(-(sx + e.w / 2), -(sy + e.h * 0.55));
    if (e.def.tier === 3) {
      const a = 0.25 + Math.sin(this.time * 2.6) * 0.12;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = '#6fe0ff';
      c.beginPath(); c.arc(sx + e.w / 2, sy + e.h * 0.5, 9, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    if (!(this.spritesOn && Sprites.drawObj(c, 'obj_' + e.type, sx + dx, sy - dy, w, h))) {
      c.fillStyle = e.def.c; c.fillRect(sx, sy, e.w, e.h);
    }
    c.restore();
    this.drawEnemyOverlay(c, e, sx, sy, dy, null, dx);
  },

  /* ================= 시체 ==========
  },

     ★ 죽은 놈은 **ents 에 한 프레임도 남기지 않는다.** ents 를 도는 곳이 스무 군데가 넘고 저마다 dead 를 다르게 검사한다 — 거기 남겨 두면 맞고,
       밀치고, 조준되고, 스폰 수에 세어지는 일이 어디선가 벌어진다. 보상·드롭·입자·흔들림· 효과음·보스바는 전부 죽는 그 순간 그대로다. 손맛은 한 톨도 안 바뀐다.

     시트의 마지막 두 칸이 쓰러지는 그림이다(몹은 death1·death2 = 5·6,
     보스는 시트 끝의 두 칸).
     사연: docs/code-history.md#h76 */
  CORPSE_MAX: 24,
  addCorpse(e) {
    if (!this.spritesOn || !Sprites.meta) return;
    const key = (e.mech && Sprites.mechSheet && Sprites.mechSheet(e.type))
      ? 'mech_' + e.type : e.type;
    const bm = Sprites.meta.bosses.sheets[key];
    const m = bm || Sprites.meta.characters.sheets[key];
    if (!m) return;
    const last = bm ? m.count - 1 : 6;                 // 보스는 끝의 두 칸
    if (last < 1 || m.count <= last) return;
    this.corpses.push({
      key, x: e.x, y: e.y, w: e.w, h: e.h, facing: e.facing,
      f0: last - 1, f1: last, t: 0, dur: e.boss ? 1.15 : 0.42,
    });
    if (this.corpses.length > this.CORPSE_MAX) this.corpses.shift();
  },
  drawCorpses(c, camX, camY) {
    if (!this.corpses.length || !Sprites.meta) return;   // 그림을 끈 뒤에도 안전하게
    for (const q of this.corpses) {
      const sx = q.x - camX, sy = q.y - camY;
      if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) continue;
      const m = Sprites.meta.bosses.sheets[q.key] || Sprites.meta.characters.sheets[q.key];
      if (!m) continue;
      const r = q.t / q.dur;
      // 살아 있는 그림과 **같은 자리 계산**을 쓴다 — 죽는 순간 그림이 튀면 안 된다
      const dy = m.frameH - q.h - (Sprites.footInset[q.key] || 0);
      const side = (Sprites.sideInset[q.key] || 0) * (q.facing < 0 ? -1 : 1);
      const dx = (q.w - m.frameW) / 2 - side;
      c.save();
      c.globalAlpha = r > 0.7 ? 1 - (r - 0.7) / 0.3 : 1;
      Sprites.draw(c, q.key, r < 0.35 ? q.f0 : q.f1, sx + dx, sy - dy, q.facing < 0);
      c.restore();
    }
  },

  /** 손에 그려지는 낚싯대의 생김새. 길이·굵기·끝 색으로 등급을 구분한다. */
  rodLook(id) {
    return ({
      rod_basic: { len: 25, w: 2.2, c: '#a9855a', grip: '#5a4632', tip: '#d8c49a' },
      rod_adv:   { len: 32, w: 2.8, c: '#6d5a42', grip: '#3a3a44', tip: '#8fd0e8' }
    })[id] || { len: 28, w: 2.4, c: '#9a7a4a', grip: '#5a4632', tip: '#cfc2a4' };
  },
  /** 낚싯대 끝의 화면 좌표 — 막대기를 우리가 직접 그리므로 길이만 알면 된다.
      drawHeldWeapon과 같은 손 위치(sx+10, sy+20)·같은 각도(-0.4)를 쓴다. */
  rodTip(id, face, sx, sy) {
    const L = this.rodLook(id), A = -0.4;
    // 시트에 손 자리가 적혀 있으면(playerHand) 그 손이 곧 대 손잡이다 — drawHeldWeapon 이 적어 둔 것을 쓴다
    const h = this._rodHand || [sx + 10, sy + 20];
    return [h[0] + face * Math.cos(A) * L.len, h[1] + Math.sin(A) * L.len];
  },

  /* 낚싯줄과 찌 — 낚싯대 끝에서 물까지 줄을 잇고 찌를 띄운다.
     입질하면 찌가 물속으로 쑥 들어갔다 나오고 물결이 퍼진다. */
  drawFishLine(c, p, sx, sy, bob) {
    const f = p.fish;
    const face = p.facing > 0 ? 1 : -1;
    const tip = this.rodTip(f.rodId, face, sx, sy + bob);
    const rx = tip[0], ry = tip[1];
    const fx = (f.tx + 0.5) * TS - this.cam.x;
    const wy = f.ty * TS - this.cam.y;                       // 수면
    // 입질 중이면 찌가 잠겼다 떴다 한다 — 3프레임으로 끊어(타일 애니메이션과 같은 방식)
    const fr = ((this.time * 9) | 0) % 3;
    const dip = f.biting ? [0, 5, 2][fr] : Math.sin(this.time * 2) * 1.2;
    const by = wy + 3 + dip;

    c.save();
    /* 물고기 그림자 — 입질 1.2초 전부터 옆에서 찌 쪽으로 다가온다. 기다리는 시간이
       "아무것도 안 보이는 시간"이면 낚시가 타이머로 읽힌다. 새 상태값 없이 남은 대기(f.t)로
       거리를 잰다. ★ **물이 더 넓은 쪽**에서 온다 — 칸 번호로 쪽을 정했더니 기슭에 찌를
       던지면 그림자가 흙 속을 헤엄쳐 와서 아예 안 보였다. */
    if (!f.biting && f.t < this.FISH_SHADOW_T) {
      const k = f.t / this.FISH_SHADOW_T;                    // 1 → 0 으로 다가온다
      const wet = dx => { let n = 0; for (let i = 1; i <= 3; i++) if (TILE_DEF[this.world.get(f.tx + dx * i, f.ty)].liquid) n++; return n; };
      const side = wet(1) >= wet(-1) ? 1 : -1;
      const sx2 = fx + side * (8 + k * 46) + Math.sin(this.time * 7) * 1.5;
      c.globalAlpha = 0.6 * (1 - k * 0.5);
      c.fillStyle = '#0b1a26';
      c.beginPath(); c.ellipse(sx2, wy + 12, 9, 3.2, 0, 0, TAU); c.fill();
      c.beginPath();                                          // 꼬리
      c.moveTo(sx2 + side * 8, wy + 12); c.lineTo(sx2 + side * 14, wy + 9); c.lineTo(sx2 + side * 14, wy + 15);
      c.fill();
      c.globalAlpha = 1;
    }
    // 줄 — 어두운 배경에서도 보이게 검은 심 위에 밝은 줄을 겹쳐 긋는다
    for (const [col, wdt] of [['rgba(0,0,0,.55)', 3], ['#eef6ff', 1.4]]) {
      c.strokeStyle = col; c.lineWidth = wdt;
      c.beginPath();
      c.moveTo(rx, ry);
      c.quadraticCurveTo((rx + fx) / 2, Math.max(ry, by) + 14, fx, by);   // 살짝 늘어지게
      c.stroke();
    }
    /* 물결 — 찌가 앉은 자리. ★ **물의 결(rareMul)을 물결 빛으로** 보여 준다. 웅덩이마다
       "잡것이 걸릴 확률"이 다른데(깊은 바다 1.4 · 정글 폭포호 0.3) 화면으론 티가 안 나서,
       좋은 물을 눈으로 익힐 길이 없었다. 물 전체를 칠하면 같은 호수 안에서 경계가 생겨
       어색하므로, 던진 사람이 보고 있는 찌 둘레만 바꾼다 — 좋은 물은 금빛이 반짝이고,
       묽은 물은 물결이 흐리다. */
    const rich = f.rareMul === undefined ? 1 : f.rareMul;
    c.strokeStyle = rich > 1 ? 'rgba(255,226,150,.85)' : rich < 1 ? 'rgba(170,186,196,.4)' : 'rgba(200,238,255,.7)';
    c.lineWidth = 1;
    // 가만히 있을 때 물결이 찌(폭 8px)보다 좁으면 찌에 가려 빛이 안 보인다 — 7px 로 숨 쉬게
    const rr = f.biting ? 5 + fr * 3 : 7 + Math.sin(this.time * 2);
    c.beginPath(); c.ellipse(fx, wy + 4, rr, rr * 0.35, 0, 0, TAU); c.stroke();
    if (rich > 1 && ((this.time * 3) | 0) % 3 === 0) {           // 좋은 물 — 물결 위 반짝임
      c.fillStyle = '#fff2c0';
      c.fillRect(fx + rr - 1, wy + 2, 2, 2); c.fillRect(fx - rr - 1, wy + 4, 2, 2);
    }
    // 찌 — 빨강/흰색 두 토막이라 물 위에서 눈에 띈다
    c.fillStyle = '#101018'; c.fillRect(fx - 4, by - 9, 8, 12);           // 테두리
    c.fillStyle = '#e8523c'; c.fillRect(fx - 3, by - 8, 6, 5);
    c.fillStyle = '#f2f2ee'; c.fillRect(fx - 3, by - 3, 6, 5);
    c.fillStyle = '#101018'; c.fillRect(fx - 1, by - 12, 2, 4);           // 고리
    c.restore();
  },
  FISH_SHADOW_T: 1.2,              // 입질 몇 초 전부터 그림자가 보이는가
  /** 입질 표시 — 느낌표와 **챔질 창 게이지**. 조명 **뒤에** 그린다. 찌는 물 위의 물건이라 밤이면 같이 어두워지는 게 맞지만, 입질은 "지금 눌러라"는 알림이라
      밤낚시에서 안 보이면 놓친다.
      사연: docs/code-history.md#h77 */
  drawFishCue(c, camX, camY) {
    const p = this.player, f = p && p.fish;
    if (!f || !f.biting) return;
    const fx = (f.tx + 0.5) * TS - camX, wy = f.ty * TS - camY;
    const left = clamp(f.bite / (f.biteMax || 1), 0, 1);
    c.save();
    c.globalAlpha = 0.65 + 0.35 * Math.abs(Math.sin(this.time * 12));
    // 느낌표는 게이지 **옆**에 — 찌 바로 위에 세우면 낚싯줄과 겹쳐 줄이 빛나는 것으로 보였다
    c.fillStyle = '#ffe08a';
    c.fillRect(fx + 17, wy - 45, 3, 8); c.fillRect(fx + 17, wy - 35, 3, 3);
    c.globalAlpha = 1;
    // 게이지 — 줄어드는 막대. 반 넘게 남았으면 금빛, 아니면 붉어진다
    c.fillStyle = 'rgba(8,10,16,.75)'; c.fillRect(fx - 13, wy - 38, 26, 5);
    c.fillStyle = left > 0.5 ? '#ffd24a' : left > 0.25 ? '#ff9a3a' : '#ff5a4a';
    c.fillRect(fx - 12, wy - 37, 24 * left, 3);
    c.restore();
  },

  drawEnemy(c, e, sx, sy) {
    if (e.def.ai === 'flotsam') { this.drawFlotsam(c, e, sx, sy); return; }
    /* 손그림 스프라이트 우선. ★ 프레임이 판정 박스보다 크면 **바닥을 맞춰** 그린다 —
       들토끼는 판정 12px 에 프레임 40px 이고 그림 속 발이 프레임 맨 아래에 있어서,
       위쪽을 맞추면 28px(1.27칸) 아래로 처져 "한 블록 아래에서 움직이는" 것처럼 보인다. */
    /* 개조된 개체는 원래 시트를 강철로 눕힌 사본으로 그린다(Sprites.mechSheet).
       한 번 구워 두고 재사용하므로 매 프레임 하는 일은 시트를 하나 더 고르는 것뿐이다.
       사본이 없으면(그림이 안 붙은 경우) 원래 시트로 떨어진다 — 세기는 이미 올라
       있으니 그림만 평소 것으로 나온다. */
    const key = (e.mech && this.spritesOn && Sprites.mechSheet && Sprites.mechSheet(e.type))
      ? 'mech_' + e.type : e.type;
    const meta = this.spritesOn && Sprites.meta &&
      (Sprites.meta.characters.sheets[key] || Sprites.meta.bosses.sheets[key]);
    // 프레임 바닥 = 그림 발끝이라고 가정했었는데, 실제로는 시트마다 몇 px 투명 여백이
    // 남아 있어(들토끼류 실측 2.25px) 판정 박스가 작을수록 그만큼 더 떠 보였다.
    // Sprites.footInset가 실측한 여백이라 그만큼 덜 밀어 올린다.
    /* ★ max(0, …) 를 쓰면 안 된다. 프레임이 판정 박스보다 **짧은** 몹이 스물 남짓 있는데
       (용접 팔 22x30 : 판정 26x44) 클램프가 있으면 dy 가 0 이 되어 발이 바닥에서 최대
       14px 뜬 채로 걷는다. 음수를 허용해야 발끝이 판정 바닥에 닿는다. */
    const dy = meta ? meta.frameH - e.h - (Sprites.footInset[key] || 0) : 0;
    /* ★ 가로는 **프레임이 아니라 그림**을 가운데 맞춘다. 프레임 중앙 정렬만으로는,
       그림 자체가 프레임 안에서 치우친 시트가 남는다(리벳 사수 2.5px). sideInset 이
       프레임 0 에서 잰 그 치우침이다 — 왼쪽을 볼 때는 치우침도 같이 뒤집는다. */
    const side = meta ? (Sprites.sideInset[key] || 0) * (e.facing < 0 ? -1 : 1) : 0;
    const dx = meta ? (e.w - meta.frameW) / 2 - side : 0;

    /* 물속 몹은 어둡게 깔린 물 위에 제 색이 묻혀 안 보인다 — 웅덩이 뱀장어(#3a6a5a)는
       어두운 물과 거의 같은 색이라 "보이지 않는 몬스터"가 됐다. 제 그림을 흰 실루엣으로
       만들어 사방 2px 밀어 깔면 **그림 모양 그대로** 밝은 테두리가 생긴다(판정 박스에
       네모를 두르면 실제 모양과 안 맞는다). 잠겼는지는 타일로 본다 — 수중 몹은
       move()에 aquatic으로 들어가 e.submerged가 늘 0이라 그 값은 못 믿는다.
       물에 잠긴 몹 전부를 밝히면 물속이 온통 번쩍이므로, 실제로 안 보였던 그 하나만. */
    const wet = e.type === 'grotto_eel' && this.world.liquid(Math.floor(e.cx / TS), Math.floor(e.cy / TS));
    if (this.spritesOn && wet && meta) {
      c.save();
      c.filter = 'brightness(0) invert(1)';
      c.globalAlpha = 0.5;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]])
        Sprites.draw(c, key, this.enemyFrame(e), sx + dx + ox, sy - dy + oy, e.facing < 0);
      c.restore();
      c.filter = 'none';
    }

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
      const ok = Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0);
      c.restore();
      if (ok) { this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx); return; }
    }

    if (this.spritesOn && Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0)) {
      this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx);
      return;
    }
    const f = 1;
    // 그림이 없어 절차 생성으로 떨어지는 경로 — 개조된 것은 여기서도 강철색이라야
    // 세기만 다르고 생김새는 같은 몹이 되는 일이 없다
    let col = e.mech ? '#79838f' : e.def.c;
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
       서 있는 것처럼 보인다. 시트 파일이 들어오면 1순위로 자동으로 넘어간다. */
    const flip = o.x + o.w / 2 > p.cx;                      // 늘 플레이어 쪽을 본다
    const fr = Math.floor(this.time * 1.6 + o.x * 0.05) % 2;
    // 시트 프레임(40px)이 판정 박스(44px)보다 짧아서, 위쪽을 맞춰 그리면 발이 바닥에서
    // 4px 뜬다. drawEnemy와 같은 방식으로 바닥(판정 박스 아래) 기준에 맞춘다.
    const meta = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets['npcw_' + d.art];
    const dy = meta ? meta.frameH - o.h - (Sprites.footInset['npcw_' + d.art] || 0) : 0;
    // 적과 같은 정렬 — 그림 중심을 판정 박스 중심에. 뒤집으면 치우침도 뒤집는다
    const nside = meta ? (Sprites.sideInset['npcw_' + d.art] || 0) * (flip ? -1 : 1) : 0;
    const dx = meta ? (o.w - meta.frameW) / 2 - nside : 0;
    if (!(this.spritesOn && Sprites.draw(c, 'npcw_' + d.art, fr, sx + dx, sy - dy, flip))) {
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
  /* 분수 물 — 손그림(정지)이든 절차 생성이든 그 위에 이것만 얹어 움직인다.
     핵심은 **위에서 아래로 떨어지는** 물이다: 꼭대기 물동이에서 솟은 물이 좌우로
     퍼져 포물선을 그리며 물받이로 떨어지고, 물동이 테두리에서도 물이 흘러내린다.
     타일 애니메이션처럼 시간을 3프레임으로 끊어 쓴다 — 연속 sin으로
     흔들면 도트 그림 위에서 혼자 매끄럽게 미끄러져 겉돈다.
     외형 틀(110×66 · 광장 5칸 중심)은 건드리지 않는다 — 바로 아래가 지하 공창으로
     내려가는 수직 통로이고 9장 대사와 짝이라 폭·위치를 바꾸면 안 된다. */
  drawFountainWater(c, o, sx, sy) {
    const FR = 3, fr = ((this.time * 6) | 0) % FR;
    const mx = sx + o.w / 2;
    const topY = sy + 8;                       // 물동이 수면
    const surf = sy + o.h - TS + 5;            // 물받이 수면
    const fall = surf - topY;                  // 떨어지는 높이
    c.save();

    // 1) 물동이에서 솟았다가 곧바로 떨어지는 물기둥
    c.globalAlpha = .8; c.fillStyle = '#8fd4ef';
    c.fillRect(mx - 2, topY - 7 + [0, -2, -1][fr], 4, 9 + [0, 2, 1][fr]);

    // 2) 좌우 포물선 — 물방울이 프레임마다 궤적을 따라 나아가 물받이로 떨어진다.
    //    u는 0(솟는 지점)에서 1(수면)까지. x는 고르게, y는 제곱으로 — 그래야 위는
    //    천천히 퍼지고 아래로 갈수록 빨라지는 낙하로 보인다.
    const N = 6, RX = 26;
    c.fillStyle = '#7fc8e8';
    for (const dir of [-1, 1])
      for (let k = 0; k < N; k++) {
        const u = (k + fr / FR) / N;
        const px = mx + dir * (4 + RX * u);
        const py = topY - 4 + fall * (u * u);
        if (py > surf) continue;
        c.globalAlpha = .8 - u * 0.25;
        c.fillRect(px - 1.5, py, 3, 3 + u * 3);            // 아래로 갈수록 길어진다 = 빨라 보인다
      }

    // 3) 물동이 테두리에서 흘러내리는 물 — 끊긴 세로줄이 프레임마다 내려간다
    c.globalAlpha = .45; c.fillStyle = '#bfe8ff';
    for (const dir of [-1, 1])
      for (let k = 0; k < 3; k++) {
        const py = topY + 4 + ((k * 9 + fr * 3) % (fall - 6));
        c.fillRect(mx + dir * 8 - 1, py, 2, 5);
      }

    // 4) 떨어진 자리의 물보라 + 수면 잔물결
    c.globalAlpha = .5; c.fillStyle = '#dff2ff';
    for (const dir of [-1, 1]) {
      const lx = mx + dir * (4 + RX);
      c.fillRect(lx - 4, surf - 1 - (fr === 1 ? 1 : 0), 8, 2);
      c.fillRect(lx - 6 - fr, surf - 3, 2, 2); c.fillRect(lx + 4 + fr, surf - 3, 2, 2);
    }
    c.globalAlpha = .38;
    for (let k = 0; k < 3; k++) {
      const rx = sx + 8 + ((k * 17 + fr * 6) % (o.w - 20));
      c.fillRect(rx, surf + 3, 6, 1);
    }
    c.restore();
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
          terminal: '단말 읽기', lorestone: '비문 읽기', tablet: '석판 읽기', lair: '둥지', seal: '봉인문',
          ciphernote: '쪽지 읽기', codedoor: '잠긴 홈'
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
  /** 축소 지도 캔버스를 지금 세계 크기(WW×WH)에 맞춘다 — 세계 크기가 바뀌면 다시 만든다.
      ★ 처음 한 번만 만들어 두면 중형·대형에서 지도가 소형 크기로 잘려 오른쪽·아래가 안 칠해진다. */
  fitMapAtlas() {
    if (this.mapAtlas.width === WW && this.mapAtlas.height === WH) return;
    this.mapAtlas.width = WW; this.mapAtlas.height = WH;
    this.mapAtlasX = this.mapAtlas.getContext('2d');
  },
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
  /* 탐지기 소리 — 잡힌 것이 **없다가 생겼을 때만** 한 번 운다. 반경 안에 계속
     들어 있는 동안 매번 울면 미니맵이 갱신될 때마다(초당 4회) 삑삑거린다. */
  _detPrev: 0,
  detBeep(n) {
    if (n > 0 && this._detPrev === 0) this.sfx('detector');
    this._detPrev = n;
  },
  /** 유틸리티 칸에 낀 탐지기 종류 — 'ore' | 'mob'. 없으면 false */
  hasDetector(kind) {
    const eq = this.player && this.player.equip;
    if (!eq) return false;
    return (eq.util1 && idef(eq.util1).det === kind) || (eq.util2 && idef(eq.util2).det === kind);
  },
  DET_R: 30,                                   // 탐지 반경(칸)
  drawMinimap() {
    const c = this.mmx, w = this.world, p = this.player;
    const MW = this.mm.width, MH = this.mm.height, S = 2;
    /* 탐지기 — **안개를 뚫고** 보여 준다. 이미 explored인 칸만 밝히는 것이라면
       탐지기가 아니라 색칠 도구다. 반경 안이면 아직 본 적 없는 칸도 비친다. */
    const detOre = this.hasDetector('ore'), detMob = this.hasDetector('mob');
    const DR = this.DET_R, DR2 = DR * DR;
    let detHit = 0;                                  // 이번 갱신에 잡힌 것 수 (소리용)
    c.fillStyle = '#07080c'; c.fillRect(0, 0, MW, MH);
    const px = Math.floor(p.cx / TS), py = Math.floor(p.cy / TS);
    const halfW = Math.floor(MW / S / 2), halfH = Math.floor(MH / S / 2);
    for (let y = 0; y < MH / S; y++) {
      for (let x = 0; x < MW / S; x++) {
        const tx = px - halfW + x, ty = py - halfH + y;
        if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) continue;
        const k = ty * WW + tx;
        const id = w.tiles[k];
        if (!w.explored[k]) {
          // 안개 — 눈으로 본 적 없는 칸은 그리지 않는다. 단, 금속 탐지기가 잡은 광맥은 예외
          if (!detOre || !TILE_DEF[id] || !TILE_DEF[id].ore) continue;
          const ddx = tx - px, ddy = ty - py;
          if (ddx * ddx + ddy * ddy > DR2) continue;
          c.fillStyle = TILE_DEF[id].c;
          c.fillRect(x * S, y * S, S, S);
          detHit++;
          continue;
        }
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
      // 몬스터 탐지기가 있으면 반경 안은 안개 속이라도 잡아낸다
      const near = detMob && (etx - px) * (etx - px) + (ety - py) * (ety - py) <= DR2;
      if (near) detHit++;
      if (!near && !w.explored[ety * WW + etx]) continue;
      const ox = etx - (px - halfW), oy = ety - (py - halfH);
      if (ox < 0 || oy < 0 || ox * S >= MW || oy * S >= MH) continue;
      c.fillStyle = e.boss ? '#ff4a4a' : '#e07070';
      c.fillRect(ox * S - 1, oy * S - 1, S + 2, S + 2);
    }
    this.detBeep(detHit);
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
