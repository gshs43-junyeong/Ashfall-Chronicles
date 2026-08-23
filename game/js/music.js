/* ===== music.js — 배경음악: 상황별 자동 전환 + 무한 반복 + 부드러운 크로스페이드 =====
   상황 판정은 game.js의 G.pickBgm()이 맡고, 이 파일은 재생/페이드만 담당한다. */
'use strict';

const BGM = {
  // mp3 원본은 용량이 커서(5~11MB) AAC(m4a)로 다시 구웠다 — 브라우저 재생엔 문제없다.
  // falling_stars는 조용한 멜로디 구간만 남기고 드롭 직전(1:50)에서 잘랐다 — 루프 시작/끝에
  // 클릭 방지용 짧은 페이드(80ms)를 걸어 둔 버전이다.
  title:   'assets/audio/falling_stars.m4a',        // 타이틀 화면
  normal:  'assets/audio/stars_of_despair.m4a',     // 평상시
  tense:   'assets/audio/clockwork_hollow.m4a',     // 밤 · 어두움 · 저체력 · 비
  boss:    'assets/audio/bitcrusher_colossus.m4a',  // 보스전
  village: 'assets/audio/victorys_chiptune.m4a',    // 베이스캠프 · 여명 마을
  east:     'assets/audio/broken_quest.m4a',        // 버섯 골짜기 · 부패한 땅 (마을 동쪽)
  catacomb: 'assets/audio/catacomb_atlas.m4a',      // 심층 · 모든 던전과 유적
  sky:      'assets/audio/skyward_overture.m4a'     // 하늘 섬
};

/* 파일이 아직 없는 곡은 여기 적힌 곡으로 대신한다. 스프라이트·효과음과 같은 규칙 —
   "있으면 쓰고, 없으면 원래 있던 것으로 돌아간다". 없는 파일을 매 프레임 다시 열려고
   드는 것을 막는 역할도 겸한다(그러면 초당 수십 개의 Audio가 새로 만들어진다). */
const BGM_FALLBACK = { east: 'normal', catacomb: 'tense', sky: 'normal' };

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

  /** 브라우저 자동재생 정책 때문에 최초 사용자 입력이 있어야 재생을 시작할 수 있다.
      클릭이든 키 입력이든 첫 입력 한 번에 걸어 두고, 그 시점의 상황에 맞는 곡을 곧장 튼다. */
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

  /** fast를 주면 거의 즉시 갈아탄다 — 보스전처럼 "지금 바로" 바뀌어야 하는 전환용.
      (보스 등장 효과음을 따로 두지 않고 브금이 곧장 치고 들어오게 하기로 했다) */
  play(key, fast) {
    key = this.resolve(key);
    if (!this.started || this.curKey === key || !BGM[key]) return;
    // curKey를 여기서 바로 확정하지 않는다 — play()가 (자동재생 차단 등으로) 실패하면
    // 이 값만 미리 바뀐 채 굳어 버려서, 그 뒤로는 "이미 이 곡으로 바뀐 줄 알고" 같은 상황이
    // 와도 다시 시도조차 안 하는 채로 무음이 계속되는 버그가 있었다(보스전·저체력 등
    // "위기 상황"에서 브금이 안 나온다는 제보의 원인). 성공했을 때만 교체를 확정한다.
    const prevKey = this.curKey;
    this.curKey = key;
    const a = new Audio(BGM[key]);
    a.loop = true; a.volume = 0;
    const dur = fast ? 0.12 : this.fadeDur;
    // 파일 자체가 없을 때(404) 울리는 신호. 이걸 안 잡으면 아래 catch가 매번 되돌려 놓아
    // 프레임마다 Audio를 새로 만들며 무한히 재시도한다.
    a.addEventListener('error', () => { this.missing[key] = true; }, { once: true });
    a.play().then(() => {
      if (this.prev) this.prev.pause();
      this.prev = this.cur;
      this.cur = a;
      this.fadeDurCur = dur;
      this.fadeT = dur;
    }).catch(err => {
      // 소스를 못 읽는 실패는 "없는 파일"로 확정하고 다시 시도하지 않는다.
      // 자동재생 차단 같은 일시적 실패만 되돌려서 다음 프레임에 다시 시도되게 한다.
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

/* ===== Sfx: 짧은 효과음 =====
   파일은 assets/sound_effects/ 에 있고, 없는 키는 game.js가 기존 합성음으로 대신한다.
   그래서 파일을 하나 빼도 게임은 그대로 돈다.

   두 가지를 신경 썼다:
   · 목소리 풀 — 클릭할 때마다 Audio를 새로 만들면 요소가 계속 쌓인다. 키마다 몇 개만
     돌려 쓰고, 앞의 것이 아직 울리는 중이면 되감아서 다시 쓴다.
   · 최소 간격 — 피해 소리나 벨트 소리는 한 프레임에 수십 번도 들어온다. 키별로 최소
     간격을 두어 겹쳐 터지는 걸 막는다. */
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
  hatch: 'hatch'                // 알에서 펫이 나올 때 (예전엔 챕터 전환 팡파르를 빌려 썼다)
  /* boss(보스 등장)는 일부러 없다 — 대신 보스 브금이 곧장 치고 들어온다 */
};

/* 키별 최소 간격(초). 없으면 제한 없음 */
const SFX_GAP = {
  damage: 0.07, swing: 0.04, mine: 0.05, turret: 0.09, zap: 0.18,
  belt: 0.34, drill: 0.28, smelt: 0.24, cook: 0.3
};
/* 키별 음량 배수 — 공장 상시음은 전투음보다 한참 작게 깔린다 */
const SFX_VOL = { belt: 0.3, drill: 0.45, smelt: 0.5, cook: 0.55, turret: 0.6, zap: 0.7 };
/* 키별 재생 시작 지점(초). 앞에 쓸데없는 공백이 붙어 온 파일을 자르지 않고 건너뛴다.
   hatch는 생성 AI가 2초짜리로 뽑아 줬는데 정작 "빵!" 하는 순간이 1.70초에 있어서,
   0초부터 틀면 죽은 공기 1.7초를 듣고 나서야 소리가 난다. 파형을 재서 상승 직전
   (1.65초에 소리가 오르기 시작)보다 살짝 앞에서 시작하도록 잡았다. */
const SFX_START = { hatch: 1.60 };

const Sfx = {
  vol: 0.5,
  voices: {},   // key -> [Audio, ...] (로드 성공한 것만)
  turn: {},     // key -> 다음에 쓸 목소리 번호
  last: {},     // key -> 마지막 재생 시각

  init() {
    for (const k in SFX_FILES) {
      const src = SFX_DIR + SFX_FILES[k] + '.mp3';
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

  /** 재생을 시도한다. 파일이 있으면 틀고 true, 없으면 false (호출자가 합성음으로 대신) */
  play(kind) {
    const pool = this.voices[kind];
    if (!pool) return false;
    const now = performance.now() / 1000;
    const gap = SFX_GAP[kind];
    if (gap !== undefined && now - (this.last[kind] || -9) < gap) return true;   // 너무 잦다 — 조용히 건너뛴다
    this.last[kind] = now;
    const i = this.turn[kind] = (this.turn[kind] + 1) % pool.length;
    const a = pool[i];
    a.volume = this.vol * (SFX_VOL[kind] === undefined ? 1 : SFX_VOL[kind]);
    try { a.currentTime = SFX_START[kind] || 0; } catch (e) { }
    a.play().catch(() => { });
    return true;
  }
};
Sfx.init();
window.Sfx = Sfx;

/* ===== Ambient: 위치 기반 환경음 (폭포·호수) =====
   Music(브금)·Sfx(단발)와는 성격이 달라서 따로 뒀다 — 플레이어와 소리 나는 지형 사이
   거리로 볼륨을 계속 매기고, 파일이 없으면(아직 안 넣었으면) 그냥 조용할 뿐 아무 것도
   대신하지 않는다(절차생성 폴백 없음 — 환경음은 없어도 게임 진행에 지장이 없어서).

   지금 받은 waterfall_loop·water_ambient_loop 원본이 2초 남짓으로 짧고 루프 지점도
   매끄럽지 않아서(다시 만들기 어렵다고 확인됨), 같은 파일 두 벌을 엇갈려 틀어 이음매를
   서로 가리는 크로스페이드 루프로 대신한다 — "짧은 루프 소스를 이어 붙이는" 흔한 트릭. */
const AMBIENT_FILES = { waterfall: 'waterfall_loop', water: 'water_ambient_loop' };
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
      const a = new Audio(SFX_DIR + AMBIENT_FILES[key] + '.mp3');
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

  /** 두 플레이어를 엇갈려 틀며 볼륨을 맞춘다. targetVol은 이번 프레임의 "거리 기반" 최종 음량. */
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
      // other(=새 메인)는 이미 겹침 구간 동안 재생 중이었으니 볼륨만 곧장 채워 준다 —
      // 안 그러면 다음 프레임까지 한 틱(최대 16ms) 무음이 낀다.
      cur.pause(); cur.currentTime = 0; cur.volume = 0;
      other.volume = targetVol;
      this.active[key] = 1 - ai;
    } else if (remaining <= ov) {
      if (other.paused) { other.currentTime = 0; other.volume = 0; other.play().catch(() => { }); }
      const p = 1 - remaining / ov;             // 0(겹침 시작)~1(끝)
      // 등가파워(equal-power) 크로스페이드 — 직선(1-p)/p로 섞으면 서로 다른 두 소리가
      // 겹치는 중간 지점에서 체감 음량이 살짝 꺼져 보인다(선형 합이 지각 음량과 안 맞음).
      // sqrt 곡선을 쓰면 두 볼륨의 "파워"(제곱합)가 항상 targetVol²로 일정해서 안 꺼진다 —
      // 크로스페이드에서 표준으로 쓰는 방식이다.
      cur.volume = targetVol * Math.sqrt(1 - p);
      other.volume = targetVol * Math.sqrt(p);
    } else {
      cur.volume = targetVol;
      if (!other.paused) { other.pause(); other.currentTime = 0; }
    }
  },

  /** 매 프레임 — 플레이어와 가장 가까운 폭포/큰 웅덩이까지 거리를 재서 음량을 맞춘다.
      world가 없거나(타이틀 화면 등) 일시정지 중이면 dt만 받아 페이드아웃시킨다. */
  updateFromWorld(w, p, dt, active) {
    for (const key in AMBIENT_FILES) {
      let target = 0;
      if (active && w && p) {
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
