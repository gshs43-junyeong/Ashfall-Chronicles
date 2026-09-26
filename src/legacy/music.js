/* ===== music.js — 곡 · 효과음 · 환경음 표와 거리로 맞추는 환경음(틀은 src/engine/audio) ===== */
import { createAmbient } from '../engine/audio/ambient.js';
import { createMusic } from '../engine/audio/music.js';
import { createSfx, createSfxLoop } from '../engine/audio/sfx.js';
import { clamp, lerp } from '../engine/core/math.js';
import { WW } from './size.js';
import { TS } from './world.js';


export const BGM = {
  // mp3 원본은 용량이 커서(5~11MB) AAC(m4a)로 다시 구웠다 — 브라우저 재생엔 문제없다.
  title:   'assets/audio/falling_stars.m4a',        // 타이틀 화면
  normal:  'assets/audio/stars_of_despair.m4a',     // 평상시
  tense:   'assets/audio/clockwork_hollow.m4a',     // 밤 · 어두움 · 저체력 · 비 말고 날씨(붉은 달·모래 폭풍·포자)
  rain:    'assets/audio/lonely_rain.m4a',          // 비(눈) 올 때만 (2:59)
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
export const BGM_FALLBACK = { east: 'normal', catacomb: 'tense', sky: 'normal', rain: 'tense',
  /* 바다 곡이 없으면 평상시 곡, 심해 곡이 없으면 바다 곡 → 결국 평상시 곡으로 내려간다. */
  sea: 'normal', seadeep: 'sea',
  // 종장 두 곡이 없으면 보스 곡, 마지막 음이 없으면 긴장 곡으로 내려간다
  finale: 'boss', lastnote: 'tense' };

export const Music = createMusic({ tracks: BGM, fallback: BGM_FALLBACK });

/* ===== Sfx: 짧은 효과음 ===== */

export const SFX_DIR = 'assets/sound_effects/';

/* 게임 안에서 쓰는 키 → 실제 파일 이름 (다른 것만 적어 두면 나머지는 이름이 같다) */
export const SFX_FILES = {
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
export const SFX_FAM = {
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
  efire_magic: ['magic', .80, .5],
  /* 업적 — 장 넘김(chapter)과 같은 소리를 조금 작게. 따로 두어야 업적만 줄일 수 있다 */
  ach: ['chapter', 1, .7],
  story: ['chapter', 1, .7]         // 장(이야기) 완료 — 업적과 같은 크기
};

/* 키별 최소 간격(초). */
export const SFX_GAP = {
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
export const SFX_VOL = { step: 0.5, jump: 0.24, jump2: 0.27, level: 0.75, place: 2, sk_heal: 1.8, sk_shield: 1.8, splash: 1.8,   // 최대 0.1~0.19 로 거의 안 들렸다
  belt: 0.3, drill: 0.45, smelt: 0.5, cook: 0.55, turret: 0.6, zap: 0.7,
  bubble: 0.5, detector: 0.45, ore_hit: 0.7, drown: 0.85, boom_small: 0.9, boom_big: 1,
  /* 별 조각 셋은 다른 효과음보다 길어서(0.9~1.5초) 같은 크기로 두면 그 동안 다른 소리를 전부 덮는다. */
  star_gain: 0.7, star_merge: 0.85, star_rise: 0.9,
  /* ★ 재질음 위에 **얹는** 겹이라 재질음(배수 1)보다 작아야 한다. */
  hit_slash: 0.55, hit_pierce: 0.55, hit_blunt: 0.55, hit_crit: 0.7,
  hit_fire: 0.6, hit_frost: 0.6, hit_soul: 0.6, hit_arcane: 0.6 };
/* 키별 재생 시작 지점(초). */
/* jump 은 앞 0.15초가 무음이라 누른 뒤 늦게 들렸다(실측: 50ms 창 봉우리 200ms) · jump2 는 0.1초에 걸쳐 차오른다. */
/* 파일 앞 무음(실측, 최대의 10% 가 처음 넘는 곳) — 곡괭이가 닿은 뒤 0.14~0.2초 늦게 들려 손맛이 빠졌다.
   빌려 쓰는 키(hit_stone → mat_stone)는 파일 이름으로 찾는다. */
export const SFX_START = { hatch: 1.60, jump: 0.12, jump2: 0.08,
  mine: 0.19, mat_stone: 0.13, ore_hit: 0.16, open: 0.12, hit_blunt: 0.13, power_on: 0.06,
  swing: 0.15, hit_crit: 0.14, sk_guard: 0.13, sk_whirl: 0.12, drown: 0.11, sk_charge: 0.1, sk_slash: 0.08,
  mat_plant: 0.08, mat_flesh: 0.08 };

export const Sfx = createSfx({ dir: SFX_DIR, files: SFX_FILES, fam: SFX_FAM, gap: SFX_GAP, vol: SFX_VOL, start: SFX_START });
Sfx.init();

/* ===== SfxLoop: 계속 울려야 하는 효과음 ===== */
export const SFX_LOOP_KEYS = { swim: 0.55, fuse: 0.5 };   // 키 → 음량 배수

export const SfxLoop = createSfxLoop({ dir: SFX_DIR, files: SFX_FILES, keys: SFX_LOOP_KEYS, sfx: Sfx });

/* ===== Ambient: 위치 기반 환경음 (폭포·호수) ===== */
/* sea·glacier는 '가까운 지형까지의 거리'가 아니라 **어느 구역에 있는가**로 켜진다. */
export const AMBIENT_FILES = { waterfall: 'waterfall_loop', water: 'water_ambient_loop',
  sea: 'amb_sea', glacier: 'amb_glacier' };
export const AMBIENT_RADIUS = { waterfall: 13 * TS, water: 9 * TS };   // 이 거리 안이면 소리가 들리기 시작한다

export const Ambient = createAmbient({ dir: SFX_DIR, files: AMBIENT_FILES });
Object.assign(Ambient, {
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
});
