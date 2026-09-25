/* ===== music.js — 배경음악: 상황별 자동 전환 + 무한 반복 + 부드러운 크로스페이드 ===== */
'use strict';

/* ★ 소리 주소에도 판 번호를 붙인다. */
const AUD_VER = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
const aud = (src) => src + (AUD_VER ? (src.includes('?') ? '&' : '?') + AUD_VER : '');

const BGM = {
  // mp3 원본은 용량이 커서(5~11MB) AAC(m4a)로 다시 구웠다 — 브라우저 재생엔 문제없다.
  title:   'assets/audio/falling_stars.m4a',        // 타이틀 화면
  normal:  'assets/audio/stars_of_despair.m4a',     // 평상시
  tense:   'assets/audio/clockwork_hollow.m4a',     // 밤 · 어두움 · 저체력 · 비
  boss:    'assets/audio/bitcrusher_colossus.m4a',  // 보스전
  village: 'assets/audio/victorys_chiptune.m4a',    // 베이스캠프 · 여명 마을
  east:     'assets/audio/broken_quest.m4a',        // 버섯 골짜기 · 부패한 땅 (마을 동쪽)
  catacomb: 'assets/audio/catacomb_atlas.m4a',      // 심층 · 모든 던전과 유적
  sky:      'assets/audio/skyward_overture.m4a',    // 하늘 섬
  // 세션 3 — 물 위와 물 아래.
  sea:      'assets/audio/patient_emptiness.m4a',   // 바다 수면 · 해변 · 빙하 지대 (2:30)
  seadeep:  'assets/audio/deep_pressure.m4a',       // 물에 잠겨 있는 동안 (2:45)

  /* 쓰러진 자리 — 사망 화면이 떠 있는 동안. */
  lastnote: 'assets/audio/the_final_note.m4a',
  /* ★ 값이 **배열**인 유일한 키다. */
  finale:  ['assets/audio/final_reprise_1.m4a', 'assets/audio/final_reprise_2.m4a']
};

/* 파일이 아직 없는 곡은 여기 적힌 곡으로 대신한다. */
const BGM_FALLBACK = { east: 'normal', catacomb: 'tense', sky: 'normal',
  /* 바다 곡이 없으면 평상시 곡, 심해 곡이 없으면 바다 곡 → 결국 평상시 곡으로 내려간다. */
  sea: 'normal', seadeep: 'sea',
  // 종장 두 곡이 없으면 보스 곡, 마지막 음이 없으면 긴장 곡으로 내려간다
  finale: 'boss', lastnote: 'tense' };

const Music = {
  vol: 0.42, fadeDur: 0.9,
  cur: null, curKey: null, prev: null, fadeT: 0, fadeDurCur: 0, started: false,
  missing: {},   // 파일이 없다고 확인된 키

  /** 실제로 틀 수 있는 키로 바꾼다 — 파일이 없으면 대체 곡을 따라간다 */
  resolve(key) {
    let k = key;
    for (let i = 0; i < 4 && k && this.missing[k]; i++) k = BGM_FALLBACK[k];
    return k && BGM[k] && !this.missing[k] ? k : (BGM[key] && !this.missing[key] ? key : 'normal');
  },

  /** 브라우저 자동재생 정책 때문에 최초 사용자 입력이 있어야 재생을 시작할 수 있다. */
  armStart(getKeyFn) {
    if (this.started) return;
    const start = () => {
      if (this.started) return;
      this.started = true;
      this.play(getKeyFn());
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
    };
    document.addEventListener('pointerdown', start, { once: true });
    document.addEventListener('keydown', start, { once: true });
  },

  /** fast를 주면 거의 즉시 갈아탄다 — 보스전처럼 "지금 바로" 바뀌어야 하는 전환용. */
  /** 그 키가 이번에 실제로 틀 파일 하나. */
  pick(key) {
    const v = BGM[key];
    return Array.isArray(v) ? v[(Math.random() * v.length) | 0] : v;
  },

  play(key, fast) {
    key = this.resolve(key);
    if (!this.started || this.curKey === key || !BGM[key]) return;
    // curKey를 여기서 바로 확정하지 않는다 — play()가 (자동재생 차단 등으로) 실패하면 이 값만 미리 바뀐 채 굳어 버려서
    const prevKey = this.curKey;
    this.curKey = key;
    const a = new Audio(aud(this.pick(key)));
    a.loop = true; a.volume = 0;
    const dur = fast ? 0.12 : this.fadeDur;
    // 파일 자체가 없을 때(404) 울리는 신호.
    a.addEventListener('error', () => { this.missing[key] = true; }, { once: true });
    a.play().then(() => {
      if (this.prev) this.prev.pause();
      this.prev = this.cur;
      this.cur = a;
      this.fadeDurCur = dur;
      this.fadeT = dur;
    }).catch(err => {
      // 소스를 못 읽는 실패는 "없는 파일"로 확정하고 다시 시도하지 않는다.
      if (err && (err.name === 'NotSupportedError' || a.error)) this.missing[key] = true;
      this.curKey = prevKey;
    });
  },

  /** 매 프레임 호출 — 게임 상태(일시정지 등)와 무관하게 항상 불러서 페이드가 끊기지 않게 한다. */
  update(dt) {
    if (this.fadeT <= 0) { if (this.cur) this.cur.volume = this.vol; return; }
    const dur = this.fadeDurCur || this.fadeDur;
    this.fadeT = Math.max(0, this.fadeT - dt);
    const p = 1 - this.fadeT / dur;
    if (this.cur) this.cur.volume = this.vol * p;
    if (this.prev) {
      this.prev.volume = this.vol * (1 - p);
      if (p >= 1) { this.prev.pause(); this.prev = null; }
    }
  }
};
window.Music = Music;

/* ===== Sfx: 짧은 효과음 ===== */
'use strict';

const SFX_DIR = 'assets/sound_effects/';

/* 게임 안에서 쓰는 키 → 실제 파일 이름 (다른 것만 적어 두면 나머지는 이름이 같다) */
const SFX_FILES = {
  swing: 'swing', bow: 'bow', magic: 'magic', mine: 'mine', place: 'place',
  die: 'die', bossdie: 'bossdie', level: 'level', craft: 'craft', equip: 'equip',
  drink: 'drink', dash: 'dash', skill: 'skill', chapter: 'chapter', talk: 'talk',
  open: 'open', learn: 'learn',
  coin: 'coin',                 // 상점 매매 등 소액
  manycoins: 'manycoins',       // 퀘스트 보상 등 대량
  damage: 'damage',             // 플레이어/몹이 피해를 입을 때
  death: 'playerdeath',         // 플레이어 사망
  belt: 'beltmove',             // 컨베이어 이송
  drill: 'drill', smelt: 'smelt', turret: 'turret', zap: 'zap', cook: 'cook',
  power_on: 'power_on', power_off: 'power_off',
  hoe: 'hoe', harvest: 'harvest',
  splash: 'splash',             // 낚싯줄 던질 때 — 파일 없으면 sfx()의 절차생성 톤으로 대신함
  hatch: 'hatch',               // 알에서 펫이 나올 때 — 사연: docs/code-history.md#h78
  /* 전부 1.0초짜리다. */
  swim: 'swim', bubble: 'bubble', drown: 'drown', fuse: 'fuse',
  boom_small: 'boom_small', boom_big: 'boom_big',
  ore_hit: 'ore_hit', detector: 'detector',
  /* boss(보스 등장)는 일부러 없다 — 대신 보스 브금이 곧장 치고 들어온다 */

  /* ===== 재질음 — 열 개로 스물세 자리 ===== */
  mat_flesh: 'mat_flesh', mat_bone: 'mat_bone', mat_stone: 'mat_stone',
  mat_dirt: 'mat_dirt', mat_wood: 'mat_wood', mat_metal: 'mat_metal',
  mat_glass: 'mat_glass', mat_plant: 'mat_plant', mat_ember: 'mat_ember',
  mat_void: 'mat_void',

  /* ===== 스킬음 — 열아홉 ===== */
  sk_slash: 'sk_slash', sk_whirl: 'sk_whirl', sk_charge: 'sk_charge',
  sk_quake: 'sk_quake', sk_guard: 'sk_guard', sk_shout: 'sk_shout',
  sk_volley: 'sk_volley', sk_pierce: 'sk_pierce', sk_smoke: 'sk_smoke',
  sk_mark: 'sk_mark', sk_fire: 'sk_fire', sk_meteor: 'sk_meteor',
  sk_frost: 'sk_frost', sk_heal: 'sk_heal', sk_shield: 'sk_shield',
  sk_bolt: 'sk_bolt', sk_blink: 'sk_blink', sk_summon: 'sk_summon',
  sk_deny: 'sk_deny',

  /* ===== 타격 그림의 소리 ===== */
  hit_slash: 'hit_slash', hit_pierce: 'hit_pierce', hit_blunt: 'hit_blunt',
  hit_crit: 'hit_crit', hit_fire: 'hit_fire', hit_frost: 'hit_frost',
  hit_soul: 'hit_soul', hit_arcane: 'hit_arcane',
  hit_flesh: 'hit_flesh', hit_void: 'hit_void',

  /* 몸짓 — 발소리(걷기 박자마다) · 점프 · 공중 점프 · 문 */
  step: 'step', jump: 'jump', jump2: 'jump2', door_open: 'door_open', door_shut: 'door_shut',

  /* 별 조각 — 얻을 때 · 다섯이 합쳐질 때 · 떠오를 때. */
  star_gain: 'star_gain', star_merge: 'star_merge', star_rise: 'star_rise'
};

/* ================= 재질음 한 벌 ================= */
const SFX_FAM = {
  hit_flesh: ['mat_flesh', 1, 1], hit_gel: ['mat_flesh', 1.22, .9],
  hit_bone: ['mat_bone', 1, 1], hit_stone: ['mat_stone', 1, 1],
  hit_dirt: ['mat_dirt', 1, 1], hit_wood: ['mat_wood', 1, 1],
  hit_metal: ['mat_metal', 1, 1], hit_glass: ['mat_glass', 1, 1],
  hit_plant: ['mat_plant', 1, 1], hit_ember: ['mat_ember', 1, 1],
  hit_void: ['mat_void', 1, 1],
  break_flesh: ['mat_flesh', .74, 1.4], break_bone: ['mat_bone', .78, 1.4],
  break_stone: ['mat_stone', .74, 1.45], break_dirt: ['mat_dirt', .8, 1.35],
  break_wood: ['mat_wood', .78, 1.4], break_metal: ['mat_metal', .78, 1.4],
  break_glass: ['mat_glass', .84, 1.45], break_ice: ['mat_glass', .7, 1.4],
  break_plant: ['mat_plant', .82, 1.35], break_ember: ['mat_ember', .78, 1.4],
  break_void: ['mat_void', .72, 1.4], break_machine: ['mat_metal', .66, 1.5],

  /* ★ 내가 맞는 소리 — 제 파일 없이 hit_flesh 를 **빌려서** 음높이를 낮추고 음량을 크게 줄인다 — 사연: docs/code-history.md#h79 */
  hurt_player: ['hit_flesh', .88, .42],

  /* ★ 몹·보스가 쏘는 소리. */
  efire_phys:  ['bow', .82, .5],
  efire_magic: ['magic', .80, .5]
};

/* 키별 최소 간격(초). */
const SFX_GAP = {
  damage: 0.07, swing: 0.04, mine: 0.05, turret: 0.09, zap: 0.18,
  belt: 0.34, drill: 0.28, smelt: 0.24, cook: 0.3,
  // 스킬 — 막힌 소리는 키를 누르고 있으면 연달아 울린다.
  sk_deny: 0.14, sk_whirl: 0.22,
  // 재질 타격음은 damage 와 같은 박자로 울린다.
  hit_flesh: 0.06, hit_bone: 0.06, hit_stone: 0.06, hit_dirt: 0.06, hit_wood: 0.06,
  hit_metal: 0.06, hit_glass: 0.06, hit_gel: 0.06, hit_plant: 0.06, hit_ember: 0.06,
  hit_void: 0.06,
  // 세션 3 — 물방울은 잦아서 묶고, 탐지기는 반경에 들 때마다 울지 않게 넉넉히
  bubble: 0.45, ore_hit: 0.12, detector: 0.6, splash: 0.25,
  // 내가 맞는 소리는 damage 와 같은 박자로 (여러 마리에게 둘러싸이면 초당 수십 번 들어온다)
  hurt_player: 0.07,
  // 재질음 위에 얹는 겹들.
  hit_slash: 0.06, hit_pierce: 0.06, hit_blunt: 0.06, hit_crit: 0.06,
  hit_fire: 0.06, hit_frost: 0.06, hit_soul: 0.06, hit_arcane: 0.06,
  /* ★ 몹의 발사음은 **한 묶음에 한 번**만 울려야 한다. */
  efire_phys: 0.1, efire_magic: 0.1,
  /* 별 조각은 이야기의 한 순간이라 막을 일이 없다. */
  star_gain: 0.2,
  step: 0.12
};
/* 키별 음량 배수 — 공장 상시음은 전투음보다 한참 작게 깔린다 */
const SFX_VOL = { step: 0.8, jump: 0.6, jump2: 0.6, belt: 0.3, drill: 0.45, smelt: 0.5, cook: 0.55, turret: 0.6, zap: 0.7,
  bubble: 0.5, detector: 0.45, ore_hit: 0.7, drown: 0.85, boom_small: 0.9, boom_big: 1,
  /* 별 조각 셋은 다른 효과음보다 길어서(0.9~1.5초) 같은 크기로 두면 그 동안 다른 소리를 전부 덮는다. */
  star_gain: 0.7, star_merge: 0.85, star_rise: 0.9,
  /* ★ 재질음 위에 **얹는** 겹이라 재질음(배수 1)보다 작아야 한다. */
  hit_slash: 0.55, hit_pierce: 0.55, hit_blunt: 0.55, hit_crit: 0.7,
  hit_fire: 0.6, hit_frost: 0.6, hit_soul: 0.6, hit_arcane: 0.6 };
/* 키별 재생 시작 지점(초). */
/* jump 은 앞 0.15초가 무음이라 누른 뒤 늦게 들렸다(실측: 50ms 창 봉우리 200ms) · jump2 는 0.1초에 걸쳐 차오른다. */
const SFX_START = { hatch: 1.60, jump: 0.12, jump2: 0.08 };

const Sfx = {
  vol: 0.5,
  voices: {},   // key -> [Audio, ...] (로드 성공한 것만)
  turn: {},     // key -> 다음에 쓸 목소리 번호
  last: {},     // key -> 마지막 재생 시각

  init() {
    for (const k in SFX_FILES) {
      const src = aud(SFX_DIR + SFX_FILES[k] + '.mp3');
      const probe = new Audio(src);
      probe.preload = 'auto';
      probe.addEventListener('canplaythrough', () => {
        // 같은 소리가 겹쳐 울릴 수 있도록 몇 개를 미리 복제해 둔다
        const n = SFX_GAP[k] !== undefined && SFX_GAP[k] < 0.15 ? 4 : 2;
        const pool = [probe];
        for (let i = 1; i < n; i++) { const a = new Audio(src); a.preload = 'auto'; pool.push(a); }
        this.voices[k] = pool; this.turn[k] = 0;
      }, { once: true });
      probe.addEventListener('error', () => {}, { once: true });   // 파일이 없으면 조용히 포기
      probe.load();
    }
  },

  /** 재생을 시도한다. */
  /** vol — 이 한 번만 음량을 더 줄이거나 키우는 배수(기본 1). */
  play(kind, rate, vol) {
    /* 제 이름의 파일이 없으면 **같은 결의 한 벌**을 대신 튼다(SFX_FAM). */
    let pool = this.voices[kind], fr = 1, fg = 1;
    if (!pool) {
      const f = SFX_FAM[kind];
      if (f && this.voices[f[0]]) { pool = this.voices[f[0]]; fr = f[1]; fg = f[2]; }
    }
    if (!pool) return false;
    const now = performance.now() / 1000;
    const gap = SFX_GAP[kind];
    if (gap !== undefined && now - (this.last[kind] || -9) < gap) return true;   // 너무 잦다 — 조용히 건너뛴다
    this.last[kind] = now;
    /* 순번은 ||0 으로 받는다 — 한 벌을 빌려 쓰는 키(hit_stone → mat_stone)는 제 이름으로 로드된 적이 없어 turn 에 자리가 없다. */
    const i = this.turn[kind] = ((this.turn[kind] || 0) + 1) % pool.length;
    const a = pool[i];
    a.volume = Math.min(1, this.vol * (SFX_VOL[kind] === undefined ? 1 : SFX_VOL[kind]) * fg * (vol === undefined ? 1 : vol));
    /* ★ 한 획마다 음높이를 흔든다. */
    a.playbackRate = (rate || 1) * fr;
    try { a.currentTime = SFX_START[kind] || 0; } catch (e) { }
    a.play().catch(() => { });
    return true;
  }
};
Sfx.init();
window.Sfx = Sfx;
window.SFX_GAP = SFX_GAP;   // 합성음 폴백도 같은 간격을 지키게 (game.js sfx())

/* ===== SfxLoop: 계속 울려야 하는 효과음 ===== */
const SFX_LOOP_LEN = 0.90;      // 실제로 쓰는 길이 — 파일 끝 0.1초는 버린다
const SFX_LOOP_OV = 0.12;       // 겹치는 구간
const SFX_LOOP_KEYS = { swim: 0.55, fuse: 0.5 };   // 키 → 음량 배수

const SfxLoop = {
  pair: {}, active: {}, on: {}, cur: {}, missing: {},
  ensure(key) {
    if (this.pair[key] || this.missing[key]) return;
    const src = SFX_DIR + (SFX_FILES[key] || key) + '.mp3';
    const mk = () => { const a = new Audio(src); a.loop = false; a.preload = 'auto'; a.volume = 0; return a; };
    const a0 = mk(), a1 = mk();
    a0.addEventListener('error', () => { this.missing[key] = true; }, { once: true });
    this.pair[key] = [a0, a1]; this.active[key] = 0; this.on[key] = false;
  },
  /** 이 프레임에 이 소리가 나야 하는가. */
  set(key, want, vol) {
    this.ensure(key);
    if (this.missing[key]) return;
    const target = want ? (SFX_LOOP_KEYS[key] || 1) * (vol === undefined ? 1 : vol) * Sfx.vol : 0;
    const c = this.cur[key] || 0;
    this.cur[key] = c + (target - c) * 0.25;             // 켜고 끌 때 툭 끊기지 않게
    const v = this.cur[key];
    const [a, b] = this.pair[key];
    if (v < 0.004) {                                     // 다 잦아들었으면 멈춘다
      if (!a.paused) a.pause(); if (!b.paused) b.pause();
      a.currentTime = 0; b.currentTime = 0; this.on[key] = false; this.cur[key] = 0;
      return;
    }
    const ai = this.active[key];
    const cur = ai === 0 ? a : b, other = ai === 0 ? b : a;
    if (!this.on[key]) {
      cur.currentTime = 0; cur.volume = v; cur.play().catch(() => { });
      this.on[key] = true; return;
    }
    const remain = SFX_LOOP_LEN - cur.currentTime;
    if (remain <= SFX_LOOP_OV) {
      if (other.paused) { other.currentTime = 0; other.play().catch(() => { }); }
      const t = Math.max(0, Math.min(1, 1 - remain / SFX_LOOP_OV));
      cur.volume = v * Math.sqrt(1 - t);
      other.volume = v * Math.sqrt(t);
      if (remain <= 0) { cur.pause(); cur.currentTime = 0; this.active[key] = ai === 0 ? 1 : 0; }
    } else {
      cur.volume = v;
      if (!other.paused && other.currentTime > SFX_LOOP_OV) { other.pause(); other.currentTime = 0; }
    }
  },
  /** 이번 프레임에 아무도 안 켠 소리는 꺼 준다 */
  idle(except) {
    for (const k in SFX_LOOP_KEYS) if (!except || !except[k]) this.set(k, false);
  }
};
window.SfxLoop = SfxLoop;

/* ===== Ambient: 위치 기반 환경음 (폭포·호수) ===== */
/* sea·glacier는 '가까운 지형까지의 거리'가 아니라 **어느 구역에 있는가**로 켜진다. */
const AMBIENT_FILES = { waterfall: 'waterfall_loop', water: 'water_ambient_loop',
  sea: 'amb_sea', glacier: 'amb_glacier' };
const AMBIENT_RADIUS = { waterfall: 13 * TS, water: 9 * TS };   // 이 거리 안이면 소리가 들리기 시작한다
const AMBIENT_OVERLAP = 0.3;   // 겹쳐 트는 구간(초)

const Ambient = {
  vol: 0.45,
  pair: {},      // key -> [AudioA, AudioB]
  active: {},    // key -> 지금 "메인"인 쪽의 인덱스(0|1)
  started: {},   // key -> 재생을 이미 시작했는가(다시 가까워질 때 처음부터 틀기 위한 리셋용)
  dur: {},       // key -> 파일 길이(초). loadedmetadata 전에는 모름 — 그동안은 크로스페이드 없이 튼다
  missing: {},   // key -> 파일 없음 확인됨
  cur: {},       // key -> 지금 부드럽게 따라가는 중인 음량(0~1, 거리 기반)

  ensure(key) {
    if (this.pair[key] || this.missing[key]) return;
    const mk = () => {
      const a = new Audio(aud(SFX_DIR + AMBIENT_FILES[key] + '.mp3'));
      a.loop = false; a.preload = 'auto'; a.volume = 0;   // loop는 직접 관리 — 끝나기 전에 다음 걸 겹쳐 튼다
      return a;
    };
    const a0 = mk(), a1 = mk();
    a0.addEventListener('error', () => { this.missing[key] = true; }, { once: true });
    a0.addEventListener('loadedmetadata', () => { this.dur[key] = a0.duration; }, { once: true });
    this.pair[key] = [a0, a1];
    this.active[key] = 0;
    this.started[key] = false;
  },

  /** 두 플레이어를 엇갈려 틀며 볼륨을 맞춘다. */
  step(key, targetVol) {
    const [a, b0] = this.pair[key];
    const ai = this.active[key];
    const cur = ai === 0 ? a : b0, other = ai === 0 ? b0 : a;

    if (!this.started[key]) {
      cur.currentTime = 0; cur.volume = targetVol; cur.play().catch(() => { });
      other.pause(); other.currentTime = 0;
      this.started[key] = true;
      return;
    }
    const dur = this.dur[key];
    if (!dur) { cur.volume = targetVol; return; }   // 길이를 아직 몰라 크로스페이드 타이밍을 못 잰다

    const ov = Math.min(AMBIENT_OVERLAP, dur * 0.4);   // 곡이 아주 짧으면 겹침도 비례해 줄인다
    const remaining = dur - cur.currentTime;
    if (remaining <= 0) {
      // 넘어갔다 — 역할을 교대하고 방금 것은 다음 순번을 위해 처음으로 되돌려 둔다.
      cur.pause(); cur.currentTime = 0; cur.volume = 0;
      other.volume = targetVol;
      this.active[key] = 1 - ai;
    } else if (remaining <= ov) {
      if (other.paused) { other.currentTime = 0; other.volume = 0; other.play().catch(() => { }); }
      const p = 1 - remaining / ov;             // 0(겹침 시작)~1(끝)
      // 등가파워(equal-power) 크로스페이드 — 직선(1-p)/p로 섞으면 서로 다른 두 소리가 겹치는 중간 지점에서 체감 음량이 살짝 꺼져 보인다(선형 합이 지각 음량과 안
      // 맞음).
      cur.volume = targetVol * Math.sqrt(1 - p);
      other.volume = targetVol * Math.sqrt(p);
    } else {
      cur.volume = targetVol;
      if (!other.paused) { other.pause(); other.currentTime = 0; }
    }
  },

  /** 매 프레임 — 플레이어와 가장 가까운 폭포/큰 웅덩이까지 거리를 재서 음량을 맞춘다. */
  updateFromWorld(w, p, dt, active) {
    for (const key in AMBIENT_FILES) {
      let target = 0;
      if (active && w && p && (key === 'sea' || key === 'glacier')) {
        // 구역으로 켠다 — 물속이면 바다, 빙하 지상이면 빙하
        const tx = Math.floor(p.cx / TS), ty = Math.floor(p.cy / TS);
        if (key === 'sea') target = (p.swimming || p.submerged > 0.5) ? 1 : 0;
        else target = (w.biomeAt(clamp(tx, 0, WW - 1)).id === 'glacier'
          && !(p.swimming || p.submerged > 0.5)) ? 0.8 : 0;
      } else if (active && w && p) {
        const R = AMBIENT_RADIUS[key];
        const list = key === 'waterfall' ? (w.falls || []) : (w.pools || []).filter(pl => pl.big);
        let best = Infinity;
        for (const src of list) {
          const dx = p.cx - src.x * TS, dy = p.cy - src.y * TS;
          const d = Math.hypot(dx, dy);
          if (d < best) best = d;
        }
        if (best < R) target = 1 - best / R;
      }
      const c = this.cur[key] || 0;
      const nc = lerp(c, target, Math.min(1, dt * 2.5));
      this.cur[key] = nc < 0.003 ? 0 : nc;
      if (this.cur[key] > 0) {
        this.ensure(key);
        if (!this.missing[key]) this.step(key, this.vol * this.cur[key]);
      } else if (this.pair[key]) {
        const [a, b] = this.pair[key];
        if (!a.paused) a.pause();
        if (!b.paused) b.pause();
        this.started[key] = false;
      }
    }
  }
};
window.Ambient = Ambient;
