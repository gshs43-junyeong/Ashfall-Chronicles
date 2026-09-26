/* ===== data/achievements.js — 업적 ===== */
import { BIOMES, DEEP_Y, HELL_Y, SKY_Y } from '../size.js';
import { T } from '../data.js';
import { PET_LV_MAX } from './pets.js';
import { SESSIONS } from './story.js';
import { idef } from './values.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ---------------- 업적 ---------------- */
export const ACH_CAT = { story: '여정', farm: '농사', auto: '자동화', gather: '손재주',
  explore: '탐험', hunt: '토벌', life: '살림', odd: '별난 것' };
/* 난이도 — UI가 색으로 가른다. */
export const ACH_TIER = { easy: ['쉬움', '#6fbf5a'], mid: ['중간', '#d8b048'], hard: ['어려움', '#d05a4a'] };
/** 숨은 업적인가 — **어려움은 전부 숨긴다.** */
export function achHidden(a) { return !!a.h || a.t === 'hard'; }
/* h: 1 — **숨은 업적.** */

/* 업적 75개 — 사연: docs/code-history.md#h18 */
export const ACHIEVEMENTS = [
  // ---------------- 여정 (스토리) ----------------
  { id: 'a_ch1', cat: 'story', i: '✦', n: '첫 조각', d: '제 1 장이 끝났다.',
    check: g => g.chapter >= 2 },
  { id: 'a_village', cat: 'story', i: '🏚', n: '되살아난 마을', d: '여명 마을에 다시 불이 켜졌다.',
    check: g => !!g.villageUnlocked },
  { id: 'a_session2', cat: 'story', i: '🧱', n: '벽 너머', d: '벽 너머로 넘어갔다.',
    check: g => g.chapter >= SESSIONS[1].ch0 },
  { id: 'a_session3', cat: 'story', i: '🌊', n: '가라앉은 쪽', d: '물이 지운 쪽으로 내려갔다.',
    check: g => g.chapter >= SESSIONS[2].ch0 },
  { id: 'a_first_boss', cat: 'story', i: '👑', n: '처음 넘어뜨린 것', d: '처음으로 큰 것을 넘어뜨렸다.',
    check: g => Object.keys(g.player.bossKilled || {}).length >= 1 },
  { id: 'a_five_hearts', cat: 'story', i: '💠', n: '다섯 심장', d: '별을 쫓아온 것이 멈췄다.',
    check: g => !!g.player.bossKilled.pursuer },
  { id: 'a_story_bosses', cat: 'story', i: '⚔', n: '이야기를 끝까지', d: '이야기에 나온 것들이 모두 쓰러졌다.',
    check: g => ['king_slime', 'bone_lord', 'corrupt_heart', 'frost_witch', 'void_king',
      'storm_warden', 'first_keeper', 'pursuer', 'overseer', 'proliferator', 'hepha',
      'archetype', 'tide_warden'].every(k => g.player.bossKilled[k]) },
  /* 세션 3 의 종장. */
  { id: 'a_tide', cat: 'story', i: '🔔', n: '가라앉은 종', d: '물 밑에서 울리던 것이 멈췄다.',
    check: g => !!g.player.bossKilled.tide_warden },
  { id: 'a_three_ends', cat: 'story', i: '🌗', n: '세 번의 끝', d: '세 번의 결전을 모두 끝냈다.',
    check: g => ['pursuer', 'archetype', 'tide_warden'].every(k => g.player.bossKilled[k]) },
  { id: 'a_all_bosses', h: 1, cat: 'story', i: '🏆', n: '남김없이', d: '이름이 붙은 것은 하나도 남지 않았다.',
    check: g => ['king_slime', 'bone_lord', 'corrupt_heart', 'frost_witch', 'void_king',
      'storm_warden', 'first_keeper', 'pursuer', 'overseer', 'proliferator', 'hepha',
      'archetype', 'tide_warden', 'mine_horror', 'ice_warden', 'sand_guardian',
      'spore_queen', 'blight_maw', 'drowned_keeper', 'restorer', 'shaft_maw']
      .every(k => g.player.bossKilled[k]) },

  // ---------------- 농사 ----------------
  { id: 'a_first_crop', cat: 'farm', i: '🌱', n: '첫 이랑', d: '처음 심은 것을 거뒀다.',
    check: g => ['wheat', 'starroot', 'ashcap'].some(k => (g.player.gathered[k] || 0) >= 1) },
  { id: 'a_first_cook', cat: 'farm', i: '🍞', n: '첫 끼니', d: '불 위에 처음 냄비를 올렸다.',
    check: g => achCount(ACH_FOODS, k => (g.crafted || {})[k]) >= 1 },
  { id: 'a_harvest', cat: 'farm', i: '🌾', n: '첫 곳간', d: '곳간에 밀 100개가 쌓였다.',
    check: g => (g.player.gathered.wheat || 0) >= 100 },
  { id: 'a_three_crops', cat: 'farm', i: '🧺', n: '세 이랑', d: '밀·별무·잿버섯이 50개씩 쌓였다.',
    check: g => ['wheat', 'starroot', 'ashcap'].every(k => (g.player.gathered[k] || 0) >= 50) },
  { id: 'a_cook', cat: 'farm', i: '🍲', n: '부엌을 아는 사람', d: '여섯 가지 요리를 할 줄 알게 됐다.',
    check: g => achCount(ACH_FOODS, k => (g.crafted || {})[k]) >= 6 },
  { id: 'a_feast', cat: 'farm', i: '🥘', n: '잔칫상', d: '가장 손이 많이 가는 상을 차렸다.',
    check: g => !!(g.crafted || {}).food_feast },
  { id: 'a_farm_1000', cat: 'farm', i: '🚜', n: '들판을 통째로', d: '땅에서 거둔 것이 1,000개를 넘었다.',
    check: g => ['wheat', 'starroot', 'ashcap'].reduce((a, k) => a + (g.player.gathered[k] || 0), 0) >= 1000 },

  // ---------------- 자동화 ----------------
  { id: 'a_first_mach', cat: 'auto', i: '🔧', n: '처음 놓은 기계', d: '처음으로 기계 하나를 세웠다.',
    check: g => achMach(g) >= 1 },
  { id: 'a_power', cat: 'auto', i: '🔌', n: '전기를 끌어오다', d: '발전기와 축전지와 전주가 다 섰다.',
    check: g => ['m_gen', 'm_battery', 'm_pole'].every(k => (g.crafted || {})[k]) },
  { id: 'a_first_line', cat: 'auto', i: '⚙', n: '스스로 도는 것', d: '기계 스무 대가 저 혼자 돌고 있다.',
    check: g => achMach(g) >= 20 },
  { id: 'a_smart', cat: 'auto', i: '🤖', n: '기계를 만드는 기계', d: '조립기·제련기·압착기·정제기가 한 줄에 섰다.',
    check: g => ['m_assembler', 'm_smelter', 'm_press', 'm_refinery'].every(k => (g.crafted || {})[k]) },
  { id: 'a_lv4_mach', cat: 'auto', i: '🔩', n: '가압 설비', d: '가압 설비 넷을 다 갖췄다.',
    check: g => ['m_pressor', 'm_desal', 'm_belt_f', 'm_battery_hi'].every(k => (g.crafted || {})[k]) },
  { id: 'a_factory', cat: 'auto', i: '🏭', n: '공장', d: '기계 여든 대가 돈다. 이쯤 되면 공장이다.',
    check: g => achMach(g) >= 80 },
  /* crafted는 **제작 횟수**를 센다(한 번에 8개가 나와도 1). */
  { id: 'a_belt', cat: 'auto', i: '➡', n: '길게 잇다', d: '벨트 200개가 깔렸다.',
    check: g => (g.player.gathered.m_belt || 0) + (g.player.gathered.m_belt_f || 0) >= 200 },

  // ---------------- 손재주 ----------------
  { id: 'a_first_pick', cat: 'gather', i: '⛏', n: '연장부터', d: '연장부터 하나 만들었다.',
    check: g => ['pick_copper', 'pick_iron', 'pick_steel', 'pick_mythril', 'pick_abyss']
      .some(k => (g.crafted || {})[k]) },
  { id: 'a_wood_200', cat: 'gather', i: '🪵', n: '나무꾼', d: '나무 200개를 베어 왔다.',
    check: g => (g.player.gathered.wood || 0) >= 200 },
  { id: 'a_first_fish', cat: 'gather', i: '🐟', n: '첫 손맛', d: '처음으로 하나 걸렸다.',
    check: g => ['fish_common', 'fish_silver', 'fish_deep'].some(k => (g.player.gathered[k] || 0) >= 1) },
  { id: 'a_gunpowder', cat: 'gather', i: '💥', n: '터지는 것', d: '화약을 개어 봤다.',
    check: g => !!(g.crafted || {}).gunpowder },
  { id: 'a_fish', cat: 'gather', i: '🎣', n: '물가에 오래 앉아', d: '세 종류를 서른 마리씩 낚을 때까지 물가에 앉아 있었다.',
    check: g => ['fish_common', 'fish_silver', 'fish_deep'].every(k => (g.player.gathered[k] || 0) >= 30) },
  { id: 'a_abyss_gear', cat: 'gather', i: '🔱', n: '심해에서 온 것', d: '심해에서 난 것으로 벼린 장비를 들었다.',
    check: g => ['spear_tide', 'blade_shark', 'bow_harpoon', 'orb_abyss', 'hammer_tide',
      'gun_harpoon', 'tome_abyss', 'pick_abyss'].some(k => (g.crafted || {})[k]) },
  { id: 'a_glacium', cat: 'gather', i: '🔷', n: '빙정', d: '빙정석 200덩이를 깨 왔다.',
    check: g => (g.player.mined[T.GLACIUM] || 0) >= 200 },
  { id: 'a_abyss_core', cat: 'gather', i: '💠', n: '심해 노심', d: '4단계 설비의 심장을 손으로 굳혀 냈다.',
    check: g => !!(g.crafted || {}).abyss_core },
  { id: 'a_mine_2000', cat: 'gather', i: '🪓', n: '파고 또 파고', d: '곡괭이가 2,000번 땅을 물었다.',
    check: g => achSum(g.player.mined) >= 2000 },
  { id: 'a_enh10', cat: 'gather', i: '🔨', n: '열 겹', d: '모루 위에서 열 번을 견딘 물건이 있다.',
    check: g => achAnyItem(g, it => (it.e || 0) >= 10) },
  { id: 'a_mine_20000', h: 1, cat: 'gather', i: '🕳', n: '땅을 뒤집다', d: '20,000번. 땅을 통째로 뒤집었다.',
    check: g => achSum(g.player.mined) >= 20000 },

  // ---------------- 탐험 ----------------
  { id: 'a_cave', cat: 'explore', i: '🕯', n: '첫 동굴', d: '지하 60칸 아래를 봤다.',
    check: g => g.player.deepest >= 120 },
  { id: 'a_deep', cat: 'explore', i: '⬇', n: '심층', d: '심층까지 내려갔다.',
    check: g => g.player.deepest >= DEEP_Y },
  { id: 'a_hell', cat: 'explore', i: '🔥', n: '가장 아래', d: '가장 아래에 발을 디뎠다.',
    check: g => g.player.deepest >= HELL_Y },
  { id: 'a_sky', cat: 'explore', i: '☁', n: '구름 위', d: '구름 위에 올라섰다.',
    check: g => g.player.highest !== undefined && g.player.highest <= SKY_Y },
  { id: 'a_lore', cat: 'explore', i: '🪨', n: '읽은 사람', d: '유적 석판 셋을 다 읽었다.',
    check: g => Object.keys(g.tabletsRead || {}).length >= 3 },
  { id: 'a_seafloor', cat: 'explore', i: '🐙', n: '숨이 닿지 않는 곳', d: '숨이 닿지 않는 바닥까지 내려갔다.',
    check: g => g.player.deepest >= 690 },
  /* 세션 3 이 땅을 둘(바다·빙하) 늘려 BIOMES 가 아홉이 됐고, '아홉 땅'은 그 표를 그대로 읽는다 — 땅이 더 늘어도 조건이 저절로 따라간다. */
  { id: 'a_glacier', cat: 'explore', i: '❄', n: '갈라지는 땅', d: '빙하 지대에 발을 디뎠다.',
    check: g => !!(g.seenBiomes || {}).glacier },
  { id: 'a_all_zones', cat: 'explore', i: '🗺', n: '아홉 땅', d: '아홉 땅에 모두 발자국을 남겼다.',
    check: g => BIOMES.every(b => (g.seenBiomes || {})[b.id]) },
  /* 유적의 맥박 · 탐사 기록 — survey 는 세이브에 담긴다(SAVE_UPGRADES v6). */
  { id: 'a_pulse_rage', cat: 'explore', i: '💓', n: '격노를 견딘 자', d: '유적의 맥박이 격노에 닿았다.',
    check: g => Object.values(g.survey || {}).some(s => (s.peak || 0) >= 3) },
  { id: 'a_survey_s', cat: 'explore', i: '🏅', n: '샅샅이', d: '유적 하나를 탐사 기록 S로 남겼다.',
    check: g => Object.values(g.survey || {}).some(s => !!s.s) },
  /* 동굴 — tally.faults(무너뜨린 자갈 수) · tally.caves(들어가 본 갈래). */
  { id: 'a_fault', cat: 'explore', i: '🪨', n: '무너뜨린 사람', d: '금 간 자갈 셋을 무너뜨려 숨은 동굴을 열었다.',
    check: g => ((g.tally || {}).faults || 0) >= 3 },
  { id: 'a_cave_kinds', cat: 'explore', i: '🦇', n: '땅속의 네 얼굴', d: '이끼 굴 · 종유 동굴 · 수정 동굴 · 독기 굴에 모두 들어가 봤다.',
    check: g => ['moss', 'drip', 'geode', 'fume'].every(k => ((g.tally || {}).caves || {})[k]) },
  { id: 'a_yunseul', h: 1, cat: 'explore', i: '🫧', n: '물속의 집', d: '아무도 말해 주지 않은 사람을 만났다.',
    check: g => !!(g.talked || {}).yunseul },

  // ---------------- 토벌 ----------------
  { id: 'a_kill_50', cat: 'hunt', i: '🗡', n: '쉰 번', d: '쉰 마리를 넘어뜨렸다.',
    check: g => achSum(g.player.kills) >= 50 },
  { id: 'a_kill_300', cat: 'hunt', i: '💀', n: '삼백 번', d: '삼백 마리를 넘어뜨렸다.',
    check: g => achSum(g.player.kills) >= 300 },
  { id: 'a_bloodmoon', cat: 'hunt', i: '🌑', n: '붉은 밤을 견딘 자', d: '붉은 달에 나오는 것 쉰 마리를 견뎌 냈다.',
    check: g => (g.player.kills.crimson_howler || 0) + (g.player.kills.crimson_eye || 0) >= 50 },
  { id: 'a_ruin_bosses', cat: 'hunt', i: '🗝', n: '유적을 비운 자', d: '유적 다섯이 비었다.',
    check: g => ['mine_horror', 'ice_warden', 'sand_guardian', 'spore_queen', 'blight_maw']
      .every(k => g.player.bossKilled[k]) },
  /* 상자를 여는 것만으로는 안 준다 — **잡아야** 준다. */
  { id: 'a_isle', cat: 'hunt', i: '🏝', n: '섬을 내려놓게 하다', d: '섬을 붙들고 있던 것이 손을 놓았다.',
    check: g => !!g.player.bossKilled.isle_keeper },
  { id: 'a_deepsea', cat: 'hunt', i: '🦈', n: '물속의 것들', d: '바다에서 나는 다섯 종을 모두 만났다.',
    check: g => ACH_SEA_MOBS.every(k => (g.player.kills[k] || 0) >= 1) },
  { id: 'a_drowned_keeper', cat: 'hunt', i: '⚓', n: '가라앉은 지킴이', d: '물이 삼킨 유적 끝의 것이 쓰러졌다.',
    check: g => !!g.player.bossKilled.drowned_keeper },
  { id: 'a_secret_bosses', h: 1, cat: 'hunt', i: '🕳', n: '아무도 시키지 않은 일', d: '아무도 시키지 않은 둘을 끝냈다.',
    check: g => !!(g.player.bossKilled.restorer && g.player.bossKilled.shaft_maw) },
  { id: 'a_echo5', cat: 'hunt', i: '🌀', n: '마지막 메아리', d: '메아리 시련 다섯째 단계를 넘겼다.',
    check: g => Object.values(g.survey || {}).some(s => (s.echo || 0) >= 5) },
  { id: 'a_kill_3000', cat: 'hunt', i: '☠', n: '삼천 번', d: '삼천 마리를 넘어뜨렸다.',
    check: g => achSum(g.player.kills) >= 3000 },

  // ---------------- 살림 ----------------
  { id: 'a_inn', cat: 'life', i: '🛏', n: '하룻밤', d: '여관에서 하룻밤 잤다.',
    check: g => ((g.tally || {}).inn || 0) >= 1 },
  { id: 'a_village4', cat: 'life', i: '🏘', n: '여명 교역지', d: '마을이 교역지가 됐다.',
    check: g => g.villageLv() >= 4 },
  { id: 'a_side10', cat: 'life', i: '📜', n: '부탁받는 사람', d: '부탁 열 건을 들어줬다.',
    check: g => achSum(g.sideDone) >= 10 },
  { id: 'a_day50', cat: 'life', i: '🌅', n: '오십 일', d: '쉰 번째 아침이 왔다.',
    check: g => g.dayCount >= 50 },
  { id: 'a_gold', cat: 'life', i: '🪙', n: '금고가 무겁다', d: '금화 100만이 쌓였다.',
    check: g => g.player.gold >= 1000000 },
  { id: 'a_pet_max', cat: 'life', i: '🐾', n: '끝까지 키운 것', d: '한 마리를 끝까지 키웠다.',
    check: g => achAnyItem(g, it => idef(it).type === 'pet' && (it.lv || 1) >= PET_LV_MAX) },
  { id: 'a_gold10m', h: 1, cat: 'life', i: '💰', n: '쓸 데가 없다', d: '금화 1,000만. 쓸 데가 없다.',
    check: g => g.player.gold >= 10000000 },

  // ---------------- 별난 것 ----------------
  { id: 'a_trade1', cat: 'odd', i: '🤝', n: '첫 거래', d: '상인과 처음 물건을 주고받았다.',
    check: g => ((g.tally || {}).trade || 0) >= 1 },
  { id: 'a_play1h', cat: 'odd', i: '⏳', n: '한 시간', d: '한 시간이 지났다.',
    check: g => ((g.tally || {}).play || 0) >= 3600 },
  { id: 'a_drown', cat: 'odd', i: '🫁', n: '숨이 먼저 다했다', d: '물속에서 숨이 먼저 다했다.',
    check: g => ((g.tally || {}).drown || 0) >= 1 },
  { id: 'a_trade100', cat: 'odd', i: '🧾', n: '단골', d: '거래 백 건. 이제 단골이다.',
    check: g => ((g.tally || {}).trade || 0) >= 100 },
  { id: 'a_play10h', cat: 'odd', i: '🕰', n: '열 시간', d: '열 시간이 지났다.',
    check: g => ((g.tally || {}).play || 0) >= 36000 },
  { id: 'a_die20', cat: 'odd', i: '⚰', n: '그래도 다시', d: '스무 번 쓰러지고 스무 번 일어났다.',
    check: g => ((g.tally || {}).deaths || 0) >= 20 },
  /* 터뜨린 횟수는 세이브에 없던 값이라 tally 에 센다(gathered 는 **만든** 수라 쟁여 두기만 해도 오른다 — "터뜨려 봤다"와는 다른 이야기다). */
  { id: 'a_bomb', cat: 'odd', i: '💣', n: '터뜨려 본 사람', d: '폭탄을 서른 번 터뜨렸다.',
    check: g => ((g.tally || {}).bomb || 0) >= 30 },
  { id: 'a_detector', cat: 'odd', i: '📡', n: '두 개의 눈', d: '광맥을 보는 눈과 움직이는 것을 보는 눈을 둘 다 만들었다.',
    check: g => ['det_metal', 'det_mob'].every(k => (g.crafted || {})[k]) },
  { id: 'a_play100h', h: 1, cat: 'odd', i: '🌌', n: '백 시간', d: '백 시간이 지났다.',
    check: g => ((g.tally || {}).play || 0) >= 360000 },
  { id: 'a_level100', cat: 'odd', i: '⭐', n: '백 번째 아침', d: '레벨 100에 닿았다.',
    check: g => g.player.level >= 100 }
];
/* 업적의 품 — 1(시작하자마자) ~ 10(끝까지 파고든 사람). 닿을 수 있게 되는 때(몇 장 · 어느 세션)와 거기서 드는 시간으로 매겼다.
   ★ 난이도(t)는 손으로 적지 않는다 — 여기 점수에서 나온다(≤3 쉬움 · ≤6 중간 · 7↑ 어려움). 새 업적은 점수만 더할 것. */
export const ACH_LV = {
  a_ch1: 1,
  a_first_boss: 1,
  a_village: 5,
  a_five_hearts: 5,
  a_session2: 5,
  a_session3: 7,
  a_tide: 8,
  a_three_ends: 8,
  a_story_bosses: 9,
  a_all_bosses: 10,
  a_first_crop: 2,
  a_first_cook: 2,
  a_harvest: 4,
  a_three_crops: 5,
  a_cook: 5,
  a_feast: 7,
  a_farm_1000: 8,
  a_first_mach: 4,
  a_power: 5,
  a_first_line: 6,
  a_smart: 7,
  a_belt: 7,
  a_lv4_mach: 8,
  a_factory: 8,
  a_first_pick: 1,
  a_wood_200: 2,
  a_first_fish: 2,
  a_gunpowder: 3,
  a_mine_2000: 4,
  a_fish: 5,
  a_glacium: 7,
  a_abyss_core: 7,
  a_abyss_gear: 8,
  a_enh10: 8,
  a_mine_20000: 9,
  a_cave: 1,
  a_glacier: 2,
  a_deep: 4,
  a_sky: 4,
  a_fault: 4,
  a_cave_kinds: 4,
  a_pulse_rage: 4,
  a_hell: 5,
  a_lore: 5,
  a_all_zones: 6,
  a_yunseul: 7,
  a_seafloor: 8,
  a_survey_s: 8,
  a_kill_50: 1,
  a_kill_300: 3,
  a_bloodmoon: 5,
  a_deepsea: 6,
  a_ruin_bosses: 7,
  a_isle: 7,
  a_kill_3000: 7,
  a_drowned_keeper: 8,
  a_echo5: 9,
  a_secret_bosses: 9,
  a_inn: 4,
  a_side10: 5,
  a_day50: 6,
  a_village4: 6,
  a_gold: 6,
  a_pet_max: 8,
  a_gold10m: 9,
  a_drown: 1,
  a_trade1: 2,
  a_play1h: 2,
  a_bomb: 3,
  a_die20: 4,
  a_trade100: 5,
  a_detector: 5,
  a_play10h: 6,
  a_level100: 7,
  a_play100h: 10
};
for (const a of ACHIEVEMENTS) {
  a.lv = ACH_LV[a.id] || 5;
  a.t = a.lv <= 3 ? 'easy' : a.lv <= 6 ? 'mid' : 'hard';
}
ACHIEVEMENTS.sort((a, b) => a.lv - b.lv);      // 안정 정렬 — 같은 점수는 적힌 순서대로. 갈래별 목록(ui.js)이 이 순서를 그대로 쓴다
export const ACH_FOODS = ['food_bread', 'food_stew', 'food_soup', 'food_pie', 'food_curry',
  'food_jelly', 'food_mstew', 'food_tea', 'food_feast'];
/* 바다에서만 나는 것들(ENEMIES 의 biome: 'sea'). */
export const ACH_SEA_MOBS = ['reef_crab', 'lantern_jelly', 'reef_shark', 'deep_octopus', 'abyss_angler'];
/* 업적 판정에 쓰는 잔 도구들. */
export function achSum(o) { let n = 0; for (const k in (o || {})) n += o[k] | 0; return n; }
export function achCount(list, fn) { let n = 0; for (const k of list) if (fn(k)) n++; return n; }
/* ★ 세계가 지어 둔 기계(m.gen)는 빼고 센다. */
export function achMach(g) {
  if (!g.world || !g.world.machines) return 0;
  let n = 0;
  for (const m of g.world.machines.values()) if (!m.gen) n++;
  return n;
}
export function achEquip(g, fn) {
  const eq = g.player.equip;
  for (const k in eq) if (eq[k] && fn(eq[k])) return true;
  return false;
}
export function achAnyItem(g, fn) {
  if (achEquip(g, fn)) return true;
  for (const it of g.player.bag) if (it && fn(it)) return true;
  for (const it of (g.vault || [])) if (it && fn(it)) return true;
  return false;
}
