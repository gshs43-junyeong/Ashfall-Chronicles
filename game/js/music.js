/* ===== music.js — 배경음악: 상황별 자동 전환 + 무한 반복 + 부드러운 크로스페이드 =====
   상황 판정은 game.js의 G.pickBgm()이 맡고, 이 파일은 재생/페이드만 담당한다. */
'use strict';

/* ★ 소리 주소에도 판 번호를 붙인다. vercel.json 이 /play/assets/ 아래 mp3 를 1년짜리
   immutable 로 내보내는데, 그림 쪽(sprites.js·hero.js)과 달리 소리에는 ?v= 를 물려받는
   장치가 없어 늘 같은 주소를 불렀다 — 한 번 끊긴 채로 받힌 파일이 1년 박히고
   "일부 효과음만 안 들린다"가 계속된다. 배포마다 주소가 바뀌면 그 고리가 끊긴다. */
const AUD_VER = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
const aud = (src) => src + (AUD_VER ? (src.includes('?') ? '&' : '?') + AUD_VER : '');

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
  sky:      'assets/audio/skyward_overture.m4a',    // 하늘 섬
  // 세션 3 — 물 위와 물 아래. 같은 결의 두 곡이라 오갈 때 튀지 않는다
  sea:      'assets/audio/patient_emptiness.m4a',   // 바다 수면 · 해변 · 빙하 지대 (2:30)
  seadeep:  'assets/audio/deep_pressure.m4a',       // 물에 잠겨 있는 동안 (2:45)

  /* 쓰러진 자리 — 사망 화면이 떠 있는 동안. 다시 일어나면 원래 곡으로 돌아간다. */
  lastnote: 'assets/audio/the_final_note.m4a',
  /* ★ 값이 **배열**인 유일한 키다. 세션 종장(5페이즈 보스)에서 두 곡 중 하나가 나온다 —
     어느 쪽인지는 곡이 실제로 바뀌는 순간에 정한다(Music.pick). play() 가 첫 줄에서
     `curKey === key` 로 돌아서므로, 매 프레임 불려도 다시 뽑지 않는다. 프레임마다
     뽑으면 초당 60번 곡이 갈아엎혀 아무 소리도 안 난다. */
  finale:  ['assets/audio/final_reprise_1.m4a', 'assets/audio/final_reprise_2.m4a']
};

/* 파일이 아직 없는 곡은 여기 적힌 곡으로 대신한다. 스프라이트·효과음과 같은 규칙 —
   "있으면 쓰고, 없으면 원래 있던 것으로 돌아간다". 없는 파일을 매 프레임 다시 열려고
   드는 것을 막는 역할도 겸한다(그러면 초당 수십 개의 Audio가 새로 만들어진다). */
const BGM_FALLBACK = { east: 'normal', catacomb: 'tense', sky: 'normal',
  /* 바다 곡이 없으면 평상시 곡, 심해 곡이 없으면 바다 곡 → 결국 평상시 곡으로
     내려간다. 심해가 바다를 거쳐 가게 둔 이유는, 바다 곡만 먼저 들어와도
     물속에서 그 곡이 나오게 하려는 것이다. */
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
  /** 그 키가 이번에 실제로 틀 파일 하나. 배열로 적힌 키(finale)만 여기서 갈린다.
      ★ play() 안에서만 부른다 — 곡이 바뀌는 순간에 한 번. */
  pick(key) {
    const v = BGM[key];
    return Array.isArray(v) ? v[(Math.random() * v.length) | 0] : v;
  },

  play(key, fast) {
    key = this.resolve(key);
    if (!this.started || this.curKey === key || !BGM[key]) return;
    // curKey를 여기서 바로 확정하지 않는다 — play()가 (자동재생 차단 등으로) 실패하면
    // 이 값만 미리 바뀐 채 굳어 버려서, 그 뒤로는 "이미 이 곡으로 바뀐 줄 알고" 같은 상황이
    // 와도 다시 시도조차 안 하는 채로 무음이 계속되는 버그가 있었다(보스전·저체력 등
    // "위기 상황"에서 브금이 안 나온다는 제보의 원인). 성공했을 때만 교체를 확정한다.
    const prevKey = this.curKey;
    this.curKey = key;
    const a = new Audio(aud(this.pick(key)));
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
   파일은 assets/sound_effects/ 에 있고, 없는 키는 game.js 가 합성음으로 대신한다 —
   파일을 하나 빼도 게임은 그대로 돈다.
   · 목소리 풀 — 키마다 몇 개만 돌려 쓰고, 앞의 것이 울리는 중이면 되감아 다시 쓴다
     (클릭할 때마다 Audio 를 새로 만들면 요소가 계속 쌓인다)
   · 최소 간격 — 피해·벨트 소리는 한 프레임에 수십 번 들어온다. 키별로 간격을 둔다 */
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
  /* v1.1 세션 3 — 전부 1.0초짜리로 들어왔다. 단발은 그대로 쓰고, 계속 울려야 하는
     둘(swim·fuse)만 아래 SFX_LOOP가 0.9초로 잘라 겹쳐 이어 붙인다. */
  swim: 'swim', bubble: 'bubble', drown: 'drown', fuse: 'fuse',
  boom_small: 'boom_small', boom_big: 'boom_big',
  ore_hit: 'ore_hit', detector: 'detector',
  /* boss(보스 등장)는 일부러 없다 — 대신 보스 브금이 곧장 치고 들어온다 */

  /* ===== 재질음 — 열 개로 스물세 자리 =====
     스물세 키(hit_* 열하나 · break_* 열둘)를 파일 열 개로 덮는다. 어느 키가 어느 파일을
     빌리는지는 아래 SFX_FAM 이 정한다. */
  mat_flesh: 'mat_flesh', mat_bone: 'mat_bone', mat_stone: 'mat_stone',
  mat_dirt: 'mat_dirt', mat_wood: 'mat_wood', mat_metal: 'mat_metal',
  mat_glass: 'mat_glass', mat_plant: 'mat_plant', mat_ember: 'mat_ember',
  mat_void: 'mat_void',

  /* ===== 스킬음 — 열아홉 =====
     data.js 의 SKILL_FX(s: 키)와 SKILL_HIT 이 부르는 이름 그대로다. */
  sk_slash: 'sk_slash', sk_whirl: 'sk_whirl', sk_charge: 'sk_charge',
  sk_quake: 'sk_quake', sk_guard: 'sk_guard', sk_shout: 'sk_shout',
  sk_volley: 'sk_volley', sk_pierce: 'sk_pierce', sk_smoke: 'sk_smoke',
  sk_mark: 'sk_mark', sk_fire: 'sk_fire', sk_meteor: 'sk_meteor',
  sk_frost: 'sk_frost', sk_heal: 'sk_heal', sk_shield: 'sk_shield',
  sk_bolt: 'sk_bolt', sk_blink: 'sk_blink', sk_summon: 'sk_summon',
  sk_deny: 'sk_deny',

  /* ===== 타격 그림의 소리 =====
     ★ 이 키들은 **무엇에 맞았나(재질)** 가 아니라 **어떻게 맞았나(무기 계열·원소)** 다.
       재질 쪽은 위의 mat_* 한 벌이 SFX_FAM 을 거쳐 맡는다. 두 축이 겹치는 이름이 둘
       있는데(hit_flesh · hit_void), Sfx.play 가 "제 이름 파일이 있으면 그것, 없으면
       계열음"의 순서로 고르므로 이제 그 둘은 제 파일로 울린다 — 계열음은 break_* 쪽에
       그대로 남는다. 일부러 그렇게 둔다: 닿는 소리와 부서지는 소리가 갈려야 한다. */
  hit_slash: 'hit_slash', hit_pierce: 'hit_pierce', hit_blunt: 'hit_blunt',
  hit_crit: 'hit_crit', hit_fire: 'hit_fire', hit_frost: 'hit_frost',
  hit_soul: 'hit_soul', hit_arcane: 'hit_arcane',
  hit_flesh: 'hit_flesh', hit_void: 'hit_void',
  hit_water: 'hit_water',
  /* hit_shock 은 파일만 받아 두고 아직 아무 데서도 안 부른다 — 전격은 이미 zap 이
     맡고 있어서, 어느 자리를 넘겨야 하는지 정해지기 전에는 비워 둔다. */
  hit_shock: 'hit_shock',

  /* 별 조각 — 얻을 때 · 다섯이 합쳐질 때 · 떠오를 때. 셋 다 이야기의 한 순간이라
     다른 효과음보다 길다(0.9~1.5초). */
  star_gain: 'star_gain', star_merge: 'star_merge', star_rise: 'star_rise'
};

/* ================= 재질음 한 벌 =================

   재질마다 닿는 소리와 부서지는 소리를 따로 두면 파일이 스물세 개다. 그런데 부서지는
   소리는 대개 닿는 소리의 큰 판이라(돌을 때리는 톡 소리와 떨어져 나가는 와르르 소리는
   결이 같다), 결이 같은 것끼리 **열 갈래로 묶고**(젤→살, 얼음→유리) 닿는 쪽과 부수는
   쪽은 같은 파일을 다르게 틀어서 가른다 — 부수는 쪽은 음을 낮추고 크게.

     [파일, 음높이 배수, 음량 배수]

   파일이 하나도 없으면 합성음 스물세 가지가 그대로 울린다. 열 개를 넣으면 그 열 개가
   스물세 자리를 전부 채운다. */
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

  /* ★ 내가 맞는 소리 — 제 파일 없이 hit_flesh 를 **빌려서** 음높이를 낮추고 음량을 크게 줄인다. 싸움 중에는 소리가 쉴 새 없이 겹치는데, 그중 "지금 내가
     맞았다"만은 즉시 갈려 들려야 한다. 같은 결의 소리를 **작고 둔하게** 내는 쪽을 골랐다 — 아예 다른 소리를 쓰면 무엇에 맞았는지가 아니라 "무슨 소리지"가 되어 한
     박자 늦는다. 0.42 는 내가 때리는 소리(배수 1)의 절반이 채 안 된다.
     사연: docs/code-history.md#h79 */
  hurt_player: ['hit_flesh', .88, .42],

  /* ★ 몹·보스가 쏘는 소리. 제 파일이 없어서 **내가 쏘는 소리를 빌린다** — 물리는
     bow, 마법은 magic 을 음높이 낮추고 절반 음량으로 낸다.

     여기 없으면 쏘는 자리 스무 군데가 통째로 무음이었다. 해골이 뼈를 던지든 원형이
     공허탄을 뿌리든 **날아오는 것이 눈에 들어오기 전에는 아무 신호가 없어서**,
     화면 가장자리에서 온 것은 맞고 나서야 알았다.

     음높이를 낮추는 것이 요점이다. 같은 음으로 두면 내가 쏜 소리와 구별이 안 되어,
     연사 중에는 "내 화살이 한 발 더 나갔나"로 들린다. 한 음 아래로 깔면 같은 종류의
     사건이되 내 것이 아니라는 것이 바로 읽힌다. */
  efire_phys:  ['bow', .82, .5],
  efire_magic: ['magic', .80, .5]
};

/* 키별 최소 간격(초). 없으면 제한 없음 */
const SFX_GAP = {
  damage: 0.07, swing: 0.04, mine: 0.05, turret: 0.09, zap: 0.18,
  belt: 0.34, drill: 0.28, smelt: 0.24, cook: 0.3,
  // 스킬 — 막힌 소리는 키를 누르고 있으면 연달아 울린다. 회오리는 박자가 0.28초다
  sk_deny: 0.14, sk_whirl: 0.22,
  // 재질 타격음은 damage 와 같은 박자로 울린다. 파괴음은 한 칸에 한 번뿐이라 안 막는다
  hit_flesh: 0.06, hit_bone: 0.06, hit_stone: 0.06, hit_dirt: 0.06, hit_wood: 0.06,
  hit_metal: 0.06, hit_glass: 0.06, hit_gel: 0.06, hit_plant: 0.06, hit_ember: 0.06,
  hit_void: 0.06,
  // 세션 3 — 물방울은 잦아서 묶고, 탐지기는 반경에 들 때마다 울지 않게 넉넉히
  bubble: 0.45, ore_hit: 0.12, detector: 0.6, splash: 0.25,
  // 내가 맞는 소리는 damage 와 같은 박자로 (여러 마리에게 둘러싸이면 초당 수십 번 들어온다)
  hurt_player: 0.07,
  // 재질음 위에 얹는 겹들. 재질음과 같은 박자로 막아야 둘이 어긋나지 않는다
  hit_slash: 0.06, hit_pierce: 0.06, hit_blunt: 0.06, hit_crit: 0.06,
  hit_fire: 0.06, hit_frost: 0.06, hit_soul: 0.06, hit_arcane: 0.06,
  /* ★ 몹의 발사음은 **한 묶음에 한 번**만 울려야 한다. 한 번에 서너 발을 부채꼴로
     뿌리는 패턴이 많아서(서리 마녀의 고드름 · 공허의 왕 · 폭풍의 수호자), 발마다
     울리면 한 번 쏜 것이 네 번으로 들린다.

     0.1초로 잡은 근거 — 보스 넷을 각각 20초씩 돌려 게임 시간으로 잰 값:
       뼈의 군주     탄 47 → 42묶음 (묶음당 1.1발 · 2.1번/초)
       서리 마녀     탄 102 → 27묶음 (묶음당 3.8발 · 1.4번/초)
       공허의 왕     탄 136 → 38묶음 (묶음당 3.6발 · 1.9번/초)
       폭풍의 수호자 탄 153 → 38묶음 (묶음당 4.0발 · 1.9번/초)
     부채꼴 서넛은 한 소리로 묶이고, 따로 쏜 것은 따로 울린다. 더 넓히면(0.22초)
     뼈의 군주처럼 **실제로 초당 두 번 던지는** 것이 절반으로 깎여 정보가 준다. */
  efire_phys: 0.1, efire_magic: 0.1,
  // 물에 드는 소리 — 물가에서 들락날락하면 계속 울린다. splash 보다 긴 소리라 더 넉넉히
  hit_water: 0.4,
  /* 별 조각은 이야기의 한 순간이라 막을 일이 없다. star_rise 는 한 판에 몇 번뿐이고
     star_gain 도 조각을 주울 때만 울린다 — 간격을 두면 오히려 빠진 것처럼 들린다. */
  star_gain: 0.2
};
/* 키별 음량 배수 — 공장 상시음은 전투음보다 한참 작게 깔린다 */
const SFX_VOL = { belt: 0.3, drill: 0.45, smelt: 0.5, cook: 0.55, turret: 0.6, zap: 0.7,
  bubble: 0.5, detector: 0.45, ore_hit: 0.7, drown: 0.85, boom_small: 0.9, boom_big: 1,
  /* 별 조각 셋은 다른 효과음보다 길어서(0.9~1.5초) 같은 크기로 두면 그 동안 다른 소리를
     전부 덮는다. 떠오르는 쪽은 화면이 멈춰 있는 순간이라 오히려 크게 둔다. */
  star_gain: 0.7, star_merge: 0.85, star_rise: 0.9,
  // 물에 드는 소리는 몸이 잠기는 소리지 사건이 아니다 — 전투음보다 한 단계 아래로
  hit_water: 0.6,
  /* ★ 재질음 위에 **얹는** 겹이라 재질음(배수 1)보다 작아야 한다. 같은 크기로 두면
     두 소리가 각자 "한 대"로 들려서 때린 횟수가 두 배로 들린다 — 작게 깔려야 색만
     입는다. 치명타는 강조라 조금 더 크고, 원소는 그 사이다. */
  hit_slash: 0.55, hit_pierce: 0.55, hit_blunt: 0.55, hit_crit: 0.7,
  hit_fire: 0.6, hit_frost: 0.6, hit_soul: 0.6, hit_arcane: 0.6 };
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

  /** 재생을 시도한다. 파일이 있으면 틀고 true, 없으면 false (호출자가 합성음으로 대신) */
  /** vol — 이 한 번만 음량을 더 줄이거나 키우는 배수(기본 1). SFX_VOL 은 키마다
      한 값이라, **같은 소리를 자리에 따라 다르게** 내야 할 때 쓴다(캐는 박자음이
      무기 타격음과 같은 파일을 쓰면서 훨씬 작아야 하는 것 같은 경우). */
  play(kind, rate, vol) {
    /* 제 이름의 파일이 없으면 **같은 결의 한 벌**을 대신 튼다(SFX_FAM).
       재질음 스물세 자리를 파일 열 개로 채우는 장치다 — 부수는 쪽은 음을
       낮추고 크게 틀어 "같은 것이 더 크게 일어났다"로 들리게 한다.
       간격과 순번은 **원래 키로** 센다. 안 그러면 돌을 때리는 소리가 돌이
       부서지는 소리를 막는다(같은 파일을 쓴다는 이유로). */
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
    /* 순번은 ||0 으로 받는다 — 한 벌을 빌려 쓰는 키(hit_stone → mat_stone)는
       제 이름으로 로드된 적이 없어 turn 에 자리가 없다. undefined + 1 은 NaN 이고
       pool[NaN] 은 없는 목소리라, 파일을 넣는 순간 재질음이 통째로 터진다. */
    const i = this.turn[kind] = ((this.turn[kind] || 0) + 1) % pool.length;
    const a = pool[i];
    a.volume = Math.min(1, this.vol * (SFX_VOL[kind] === undefined ? 1 : SFX_VOL[kind]) * fg * (vol === undefined ? 1 : vol));
    /* ★ 한 획마다 음높이를 흔든다. 같은 파일을 그대로 되풀이하면 세 번째
       휘두를 때부터 "같은 소리"로 들리고 손맛이 밋밋해진다. ±6% 면 음이
       바뀐 것으로는 안 들리고 '다른 타격'으로만 들린다. */
    a.playbackRate = (rate || 1) * fr;
    try { a.currentTime = SFX_START[kind] || 0; } catch (e) { }
    a.play().catch(() => { });
    return true;
  }
};
Sfx.init();
window.Sfx = Sfx;
window.SFX_GAP = SFX_GAP;   // 합성음 폴백도 같은 간격을 지키게 (game.js sfx())

/* ===== SfxLoop: 계속 울려야 하는 효과음 =====
   헤엄(swim)·심지(fuse)는 상태가 이어지는 동안 끊기지 않아야 한다. 그런데 받은 파일이
   1.0초짜리라 그대로 `loop = true`를 걸면 끝과 처음 사이에서 **한 프레임짜리 정적**이
   생긴다(브라우저가 되감는 동안 소리가 끊긴다).

   그래서 **0.9초까지만 쓰고 나머지 0.1초는 버린 뒤**, 같은 파일 두 벌을 엇갈려 틀어
   이음매를 서로 가린다 — 앰비언트가 쓰는 것과 같은 방식이다. 겹치는 구간에서는
   sqrt 곡선으로 볼륨을 나눠 체감 음량이 꺼지지 않게 한다. */
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
  /** 이 프레임에 이 소리가 나야 하는가. vol 0~1 (거리·상황에 따라 줄여 부를 수 있다) */
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

/* ===== Ambient: 위치 기반 환경음 (폭포·호수) =====
   플레이어와 소리 나는 지형 사이 거리로 볼륨을 계속 매기고, 파일이 없으면 그냥 조용할
   뿐 아무것도 대신하지 않는다(절차생성 폴백 없음 — 없어도 진행에 지장이 없어서).
   ★ 받은 원본이 2초 남짓으로 짧고 루프 지점도 매끄럽지 않아, 같은 파일 두 벌을 엇갈려
     틀어 이음매를 서로 가리는 크로스페이드 루프로 대신한다. */
/* sea·glacier는 '가까운 지형까지의 거리'가 아니라 **어느 구역에 있는가**로 켜진다.
   그래서 updateFromWorld가 키마다 다르게 목표 음량을 잡는다. 30초짜리라 이음매가
   드물지만, 같은 크로스페이드 장치를 그대로 쓴다. */
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
