/* ===== music.js — 곡 · 효과음 · 환경음 표와 거리로 맞추는 환경음(틀은 src/engine/audio) ===== */
import { app as G } from './ctx.js';
import { createAmbient } from '../engine/audio/ambient.js';
import { createMusic } from '../engine/audio/music.js';
import { createSfx, createSfxLoop } from '../engine/audio/sfx.js';
import { createPanRouter } from '../engine/audio/spatial.js';
import { clamp, lerp } from '../engine/core/math.js';
import { dimsOf } from './size.js';
import { TS } from './world.js';


/* 배경음악 — 파일은 play/assets/bgm/<상황 키>.<확장자>(같은 키에 여럿이면 <키>_1 · <키>_2 … 중 하나를 틀 때마다 고른다).
   목록은 tools/sync-bgm.mjs 가 폴더를 훑어 assets/bgm-manifest.js(window.BGM_MANIFEST)에 적는다 — 적힌 곡만 부르므로
   빈 칸은 404 없이 대체 곡(BGM_FALLBACK)으로 내려간다. 상황 키를 고르는 곳은 game.ts pickBgm.
   ★ 키를 더하면 BGM_KEYS 에도 — sync-bgm 이 이 줄을 읽어 모르는 파일 이름을 막는다. */
export const BGM_KEYS = ['title', 'normal', 'tense', 'rain', 'boss', 'village', 'east', 'catacomb', 'sky', 'sea', 'seadeep', 'lastnote', 'finale'];
export const BGM: Record<string, string | string[]> = {};
{
  const man = (typeof window !== 'undefined' && window.BGM_MANIFEST) || {};
  for (const k of BGM_KEYS) { const v = man[k]; if (v && v.length) BGM[k] = v.length === 1 ? v[0] : v.slice(); }
}

/* 파일이 아직 없는 곡은 여기 적힌 곡으로 대신한다. */
export const BGM_FALLBACK = { east: 'normal', catacomb: 'tense', sky: 'normal', rain: 'tense',
  /* 바다 곡이 없으면 평상시 곡, 심해 곡이 없으면 바다 곡 → 결국 평상시 곡으로 내려간다. */
  sea: 'normal', seadeep: 'sea',
  // 종장 두 곡이 없으면 보스 곡, 마지막 음이 없으면 긴장 곡으로 내려간다
  finale: 'boss', lastnote: 'tense',
  // 곡이 몇 개만 있어도 어디서든 무엇인가 흐르게 — 결국 평상시 곡으로 모인다
  title: 'normal', village: 'normal', boss: 'tense', tense: 'normal' };

export const Music = createMusic({ tracks: BGM, fallback: BGM_FALLBACK });
/* 목록에 없는 키는 처음부터 '없는 파일'로 — resolve 가 대체 곡 사슬을 따라간다(안 하면 곧장 normal 로 떨어졌다) */
for (const k of BGM_KEYS) if (!BGM[k]) Music.missing[k] = true;

/* ===== Sfx: 짧은 효과음 ===== */

export const SFX_DIR = 'assets/sound_effects/';

/* 게임 안에서 쓰는 키 → 실제 파일 이름 (다른 것만 적어 두면 나머지는 이름이 같다) */
export const SFX_FILES = {
  swing: 'swing', bow: 'bow', magic: 'magic', mine: 'mine', place: 'place',
  die: 'die', bossdie: 'bossdie', level: 'level', craft: 'craft', equip: 'equip',
  drink: 'drink', dash: 'dash', skill: 'skill', chapter: 'chapter',
  /* 대사(talk_npc · talk_story · talk_lore · talk_player) · 줍기(pickup) · 버리기(trash)는 파일이 오면 여기에 적는다
     (docs/audio/sfx-elevenlabs-prompts.md ⏳) — 없는 파일을 적어 두면 불러오다 404 가 나고 test:play 가 멈춘다. 그동안은 sfx() 의 합성 톤 */
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
export const SFX_FAM: Record<string, [string, number, number]> = {
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

  /* 잿물 군체 — 무거운 잿물이 끓고 철썩인다(물 소리를 낮게 늘여 빌린다) */
  pool_spit: ['splash', 1.3, .45], pool_rise: ['bubble', .55, .8], pool_slam: ['boom_small', .62, .9],
  pool_bubble: ['bubble', .75, .7], pool_sink: ['drown', .7, .75], pool_geyser: ['splash', .6, 1],
  /* 뼈 오르간 — 관 울림은 관마다 음높이를 달리 부른다(sfxAt 의 rate) */
  organ_pipe: ['sk_mark', .62, .55], organ_breath: ['sk_smoke', .6, .7], organ_lift: ['swing', .5, .8], organ_sweep: ['sk_whirl', .62, .85],
  organ_scatter: ['mat_bone', .7, 1.3], organ_requiem: ['chapter', .5, .9],
  arena_crumble: ['boom_small', .45, 1.1],          // 싸움터가 무너져 넓어진다(game/boss-arena)
  /* 잿빛 고치 · 불나방 — 실이 삐걱이고, 날개는 바람 소리를 낮게 늘여 빌린다 */
  cocoon_creak: ['door_open', .55, .7], cocoon_silk: ['sk_mark', 1.3, .4], cocoon_swing: ['sk_whirl', .55, .9],
  moth_burst: ['mat_ember', .6, 1.3], moth_gust: ['swing', .45, .85], moth_scale: ['sk_smoke', .9, .6], moth_dive: ['sk_whirl', .8, .9],
  /* 모래시계 거상 — 돌 주먹은 낮게 깨는 소리, 모래는 연기 · 바람 소리를 낮춰 빌린다 */
  hg_lift: ['door_open', .45, .8], hg_slam: ['boom_small', .5, 1.2], hg_pour: ['sk_smoke', .55, .8], hg_quick: ['drown', .55, .7],
  hg_deadline: ['chapter', .45, .9], hg_storm: ['sk_whirl', .5, 1.1], hg_flip: ['mat_stone', .45, 1.1], hg_crack: ['mat_glass', .7, 1.3],
  /* 곪은 벌집 어미 — 젖은 살 · 거품 · 밀랍이 깨지는 소리를 낮춰 빌린다 */
  hive_crawl: ['mat_flesh', .55, .6], hive_pop: ['bubble', .6, .8], hive_bulge: ['mat_flesh', .7, .7], hive_crack: ['mat_wood', .8, 1.1],
  hive_ooze: ['bubble', .5, .8], hive_splash: ['splash', .6, .9], hive_hiss: ['sk_smoke', .8, .7], hive_spit: ['splash', 1.1, .7], hive_roar: ['chapter', .4, 1],
  /* 판결석 좌상 — 돌이 갈리는 낮은 소리 · 금속 저울 · 빛줄기는 마법 소리를 늘여 빌린다 */
  jd_weigh: ['door_open', .4, .7], jd_verdict: ['boom_small', .45, 1.1], jd_tablet: ['mat_stone', .5, .9], jd_slam: ['mat_stone', .6, 1.2],
  jd_lift: ['door_open', .45, .8], jd_gavel: ['boom_small', .5, 1.2], jd_eye: ['magic', .5, .7], jd_beam: ['magic', .7, 1],
  jd_sentence: ['chapter', .45, .9], jd_tear: ['mat_glass', .6, 1.2],

  /* ★ 몹·보스가 쏘는 소리. */
  efire_phys:  ['bow', .82, .5],
  efire_magic: ['magic', .80, .5],
  /* ★ 축하 · 알림 갈래 — 예전엔 열몇 자리가 chapter 하나를 같이 울려 무엇이 일어났는지 귀로 가를 수 없었다. 자리마다 제 키를 부르고,
     키는 파일 일곱(cele_*, 의뢰서 J)을 음높이로 나눠 쓴다. 파일이 오기 전에는 chapter · level 을 빌린다 —
     오면 SFX_FILES 에 cele_* 를 적고 아래 첫 칸을 그 파일로 바꾼다(음높이 · 크기는 그대로). 사연: docs/code-history.md#h208 */
  ach: ['chapter', 1, .7],          // → cele_ach 1
  ach_big: ['chapter', .9, .9],     // → cele_ach 0.9 — 어려운 업적(품 7 이상)
  prof_perk: ['level', 1.08, .8],   // → cele_ach 1.08 — 숙련 특전
  story: ['chapter', 1, .7],        // → cele_story 1 — 장 완료
  ch_start: ['chapter', .84, .8],   // → cele_story 0.84 — 새 장 카드
  village_up: ['chapter', 1.06, .9],// → cele_story 1.06
  discover: ['chapter', 1.18, .65], // → cele_find 1 — 숨은 굴 · 유적 자리 · 기억 조각
  travel: ['chapter', 1.34, .5],    // → cele_find 1.15 — 비석 · 구슬로 옮겨짐
  recover: ['chapter', 1.12, .55],  // → cele_find 0.95 — 쓰러진 자리에서 되찾음
  rare_get: ['chapter', 1.26, .6],  // → cele_treasure 1 — 귀한 것
  ev_clear: ['chapter', 1.1, .7],   // → cele_treasure 0.9 — 유적 사건을 해냄
  unseal: ['chapter', .94, .8],     // → cele_unseal 1 — 봉인 · 퍼즐 · 닻
  deep_open: ['chapter', .76, 1],   // → cele_unseal 0.8 — 깊은 층
  danger: ['chapter', .6, .9],      // → cele_warn 1 — 맥박 · 격노 · 유적 사건
  seal_shut: ['chapter', .66, .85], // → cele_warn 1.1 — 봉인 방이 닫힘
  timestop: ['chapter', .5, .7],    // → cele_warn 0.8
  pet_up: ['level', 1.18, .55],     // → cele_grow 1.1
  pet_evolve: ['level', .86, .9],   // → cele_grow 0.85 — 드래곤 단계
  tame: ['level', 1.14, .65],       // → cele_grow 1
  rest: ['level', .8, .5]           // → cele_grow 0.8 — 여관에서 잠
};

/* 키별 최소 간격(초). */
export const SFX_GAP: Record<string, number> = {
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

/* 좌우 가르기 — 게임이 만든 AudioContext 가 돌고 있을 때만(멈춘 컨텍스트에 이으면 그 목소리가 들리지 않는다) */
export const SFX_PAN = createPanRouter(() => (G && G.ac && G.ac.state === 'running' ? G.ac : null));
export const Sfx = createSfx({ dir: SFX_DIR, files: SFX_FILES, fam: SFX_FAM, gap: SFX_GAP, vol: SFX_VOL, start: SFX_START, panner: SFX_PAN });
Sfx.init();

/* ===== SfxLoop: 계속 울려야 하는 효과음 ===== */
export const SFX_LOOP_KEYS = { swim: 0.55, fuse: 0.5 };   // 키 → 음량 배수

export const SfxLoop = createSfxLoop({ dir: SFX_DIR, files: SFX_FILES, keys: SFX_LOOP_KEYS, sfx: Sfx });

/* ===== Ambient: 위치 기반 환경음 (폭포·호수) ===== */
/* sea·glacier는 '가까운 지형까지의 거리'가 아니라 **어느 구역에 있는가**로 켜진다. */
export const AMBIENT_FILES = { waterfall: 'waterfall_loop', water: 'water_ambient_loop',
  sea: 'amb_sea', glacier: 'amb_glacier' };
export const AMBIENT_RADIUS: Bag = { waterfall: 13 * TS, water: 9 * TS };   // 이 거리 안이면 소리가 들리기 시작한다

export const Ambient: Bag = createAmbient({ dir: SFX_DIR, files: AMBIENT_FILES });
Object.assign(Ambient, {
  /** 매 프레임 — 플레이어와 가장 가까운 폭포/큰 웅덩이까지 거리를 재서 음량을 맞춘다. */
  updateFromWorld(w: any, p: any, dt: any, active: any) { const { WW } = dimsOf(w);
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
        const list = key === 'waterfall' ? (w.falls || []) : (w.pools || []).filter((pl: any) => pl.big);
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
} as Bag);
