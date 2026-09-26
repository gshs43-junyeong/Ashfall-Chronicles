/* ===== data/enemies.js — 적 · 기계 몹 ===== */
import { clamp } from '../../engine/core/math.js';
import { tr } from '../lang.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ---------------- 적 ---------------- */
// ai: walker / jumper / flyer / archer / caster / boss별 전용 stiff: 그림이 거의 안 움직이는 개체를 렌더러가 절차적으로 흔들어 주는 값.
export const ENEMIES = {
  /* --- 순한 동물: 적대하지 않고 어슬렁거리다 맞으면 도망친다. 잡으면 생고기를 준다 --- */
  rabbit:      { n: '들토끼', hp: 8, dmg: 0, def: 0, spd: 70, ai: 'critter', w: 16, h: 12, c: '#ad9678', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  arctic_hare: { n: '눈산토끼', hp: 8, dmg: 0, def: 0, spd: 70, ai: 'critter', w: 16, h: 12, c: '#e8eef2', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  sand_lizard: { n: '모래 도마뱀', hp: 10, dmg: 0, def: 0, spd: 60, ai: 'critter', w: 18, h: 10, c: '#c8a45a', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  jungle_frog: { n: '정글 개구리', hp: 9, dmg: 0, def: 0, spd: 90, ai: 'critter', w: 14, h: 12, c: '#5ab04a', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },
  glow_snail:  { n: '빛달팽이', hp: 12, dmg: 0, def: 0, spd: 24, ai: 'critter', w: 22, h: 14, c: '#7fe0c8', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1], ['glowcap', .15, 1, 1]] },
  ash_vole:    { n: '잿들쥐', hp: 9, dmg: 0, def: 0, spd: 85, ai: 'critter', w: 14, h: 10, c: '#8a7a8c', xp: 2, gold: 0, passive: 1,
                drops: [['raw_meat', 1, 1, 1]] },

  slime:      { n: '잿빛 슬라임', hp: 34, dmg: 8, def: 0, spd: 34, ai: 'jumper', squish: 1, w: 24, h: 18, c: '#6f8ba0', xp: 9, gold: 3, biome: 'surface', aggro: 320,
                drops: [['slime_gel', .9, 1, 3], ['potion_hp_small', .06, 1, 1]] },
  /* 좀비만 잡몹 중에 **플레이어 레벨을 탄다**(lvScale). */
  zombie:     { n: '떠도는 시체', hp: 60, dmg: 14, def: 2, spd: 30, ai: 'walker', w: 20, h: 40, c: '#5b7a52', xp: 16, gold: 6, biome: 'night', aggro: 460, lvScale: 0.5,
                drops: [['bone_frag', .5, 1, 2], ['iron_ore', .12, 1, 2], ['potion_hp_small', .07, 1, 1]] },
  bat:        { n: '동굴 박쥐', hp: 26, dmg: 11, def: 0, spd: 84, ai: 'flyer', w: 22, h: 16, c: '#6b4a6b', xp: 12, gold: 4, biome: 'cave', aggro: 420,
                drops: [['bone_frag', .3, 1, 1]] },
  skeleton:   { n: '무덤지기', hp: 88, dmg: 19, def: 5, spd: 38, ai: 'walker', w: 20, h: 40, c: '#c9c3b0', xp: 26, gold: 12, biome: 'cave', aggro: 480,
                drops: [['bone_frag', .8, 2, 4], ['iron_ore', .3, 1, 3], ['copper_bar', .1, 1, 2], ['crossbow_bone', .03, 1, 1], ['tome_bone', .025, 1, 1]] },
  archer:     { n: '해골 궁수', hp: 70, dmg: 16, def: 3, spd: 30, ai: 'archer', w: 20, h: 40, c: '#a89e88', xp: 30, gold: 14, biome: 'cave', range: 300, aggro: 560,
                drops: [['bone_frag', .7, 2, 3], ['bow_hunt', .05, 1, 1], ['crossbow_bone', .035, 1, 1], ['tome_bone', .025, 1, 1]] },
  crawler:    { n: '부패한 사냥꾼', hp: 130, dmg: 27, def: 8, spd: 62, ai: 'walker', w: 24, h: 38, c: '#6b4a86', xp: 48, gold: 22, biome: 'corrupt', aggro: 520,
                drops: [['corrupt_ess', .7, 1, 3], ['ebon_chunk', .4, 1, 3], ['mace_thorn', .025, 1, 1]] },
  shadoweye:  { n: '그림자 눈', hp: 110, dmg: 24, def: 4, spd: 70, ai: 'caster', w: 22, h: 22, c: '#3d2a54', xp: 52, gold: 24, biome: 'corrupt', range: 340, aggro: 520,
                drops: [['corrupt_ess', .8, 2, 4], ['soul_shard', .15, 1, 2]] },
  frostling:  { n: '서리 정령', hp: 175, dmg: 33, def: 12, spd: 46, ai: 'caster', w: 24, h: 32, c: '#8fd0e8', xp: 70, gold: 32, biome: 'ice', range: 300, aggro: 480,
                drops: [['frost_core', .6, 1, 2], ['ice_shard', .8, 2, 5], ['crystal', .2, 1, 2]] },
  imp:        { n: '화염 임프', hp: 210, dmg: 40, def: 10, spd: 92, ai: 'caster', w: 22, h: 26, c: '#e0662a', xp: 92, gold: 44, biome: 'hell', range: 320, aggro: 560,
                drops: [['hell_ore', .5, 1, 3], ['soul_shard', .3, 1, 2], ['bow_ash', .03, 1, 1], ['tome_ash', .025, 1, 1]] },
  golem:      { n: '재의 골렘', hp: 380, dmg: 56, def: 22, spd: 34, ai: 'walker', w: 34, h: 48, c: '#7a5c4a', xp: 130, gold: 66, biome: 'hell', aggro: 380,
                drops: [['hell_ore', .8, 2, 5], ['obsidian', .4, 1, 3], ['soul_shard', .4, 1, 3], ['mace_lava', .03, 1, 1], ['tome_ash', .02, 1, 1], ['ring_brand', .05, 1, 1]] },
  wraith:     { n: '심연의 망령', hp: 300, dmg: 50, def: 14, spd: 80, ai: 'flyer', w: 26, h: 38, c: '#4a3a6e', xp: 120, gold: 60, biome: 'deep', aggro: 560,
                drops: [['void_frag', .35, 1, 2], ['soul_shard', .6, 1, 3], ['dagger_void', .03, 1, 1], ['bow_void', .025, 1, 1], ['tome_void', .025, 1, 1]] },

  /* --- 지역별 추가 몬스터 --- */
  ashcrow:    { n: '잿빛 까마귀', hp: 42, dmg: 11, def: 1, spd: 96, ai: 'flyer', w: 24, h: 18, c: '#6a6a72', xp: 14, gold: 5, biome: 'surface', aggro: 420,
                drops: [['ash_feather', .7, 1, 2]] },
  spider:     { n: '동굴 거미', hp: 70, dmg: 16, def: 2, spd: 70, ai: 'jumper', w: 26, h: 18, c: '#5a4a6a', xp: 22, gold: 9, biome: 'cave', aggro: 440,
                drops: [['spider_silk', .7, 1, 3], ['bone_frag', .2, 1, 2]] },
  minerghost: { n: '광부의 유령', hp: 96, dmg: 22, def: 4, spd: 66, ai: 'flyer', w: 22, h: 34, c: '#8fa8b0', xp: 34, gold: 18, biome: 'cave', aggro: 480,
                drops: [['iron_ore', .6, 2, 4], ['gold_ore', .25, 1, 3], ['lost_lamp', .12, 1, 1]] },
  scorpion:   { n: '사막 전갈', hp: 100, dmg: 30, def: 6, spd: 78, ai: 'walker', w: 28, h: 20, c: '#a06a3a', xp: 40, gold: 22, biome: 'desert', aggro: 440,
                drops: [['venom_sting', .65, 1, 3], ['spear_venom', .03, 1, 1], ['bow_venom', .03, 1, 1], ['orb_venom', .025, 1, 1]] },
  sandmaw:    { n: '모래 아가리', hp: 130, dmg: 26, def: 10, spd: 56, ai: 'walker', w: 34, h: 26, c: '#c0a05a', xp: 44, gold: 20, biome: 'desert', aggro: 380,
                drops: [['sand', .8, 3, 8], ['venom_sting', .3, 1, 2], ['spear_venom', .025, 1, 1], ['bow_venom', .025, 1, 1]] },
  icewolf:    { n: '얼음 늑대', hp: 165, dmg: 34, def: 10, spd: 108, ai: 'walker', w: 32, h: 24, c: '#bcd8ee', xp: 66, gold: 30, biome: 'ice', aggro: 560,
                drops: [['ice_fang', .6, 1, 3], ['ice_shard', .7, 2, 4], ['dagger_frost', .03, 1, 1], ['charm_hawk', .06, 1, 1]] },
  corrupttree:{ n: '부패한 나무', hp: 260, dmg: 40, def: 20, spd: 26, ai: 'walker', w: 34, h: 48, c: '#5a3f78', xp: 86, gold: 40, biome: 'corrupt', aggro: 340,
                drops: [['corrupt_ess', .8, 2, 4], ['moss_core', .45, 1, 2], ['wood', .9, 3, 8], ['mace_thorn', .025, 1, 1]] },
  crystalcrab:{ n: '수정 게', hp: 300, dmg: 44, def: 28, spd: 44, ai: 'walker', w: 32, h: 19, c: '#7fd8e8', xp: 110, gold: 55, biome: 'deep', aggro: 400,
                drops: [['crystal_claw', .6, 1, 2], ['crystal', .7, 2, 5], ['dagger_void', .025, 1, 1], ['tome_void', .02, 1, 1]] },
  lavaslug:   { n: '용암 슬러그', hp: 340, dmg: 52, def: 18, spd: 40, ai: 'walker', w: 32, h: 20, c: '#e0703a', xp: 120, gold: 58, biome: 'hell', aggro: 360,
                drops: [['lava_gel', .7, 1, 3], ['hell_ore', .5, 1, 3], ['mace_lava', .035, 1, 1]] },
  cloudjelly: { n: '구름 해파리', hp: 300, dmg: 48, def: 14, spd: 62, ai: 'flyer', w: 28, h: 30, c: '#e8f0fa', xp: 130, gold: 60, biome: 'sky', aggro: 460,
                drops: [['cloud_jelly', .7, 1, 3], ['cloud_block', .6, 3, 8], ['cloud_pearl', .04, 1, 1]] },
  archivist:  { n: '잊힌 사서', hp: 420, dmg: 70, def: 22, spd: 68, ai: 'caster', w: 24, h: 36, c: '#c8b98a', xp: 220, gold: 120, biome: 'ruin', range: 340, aggro: 560,
                drops: [['archive_seal', .55, 1, 2], ['aether_shard', .4, 1, 3]] },

  /* --- 2부 일반 --- */
  sky_sentry: { n: '하늘 파수꾼', cw: '기', hp: 420, dmg: 62, def: 20, spd: 96, ai: 'caster', w: 26, h: 34, c: '#a8c8e0', xp: 160, gold: 80, biome: 'sky', range: 340, aggro: 560,
                drops: [['sky_feather', .7, 1, 3], ['aether_shard', .3, 1, 2], ['cloud_block', .5, 2, 6], ['spear_storm', .02, 1, 1]] },
  gale:       { n: '바람 정령', hp: 340, dmg: 54, def: 12, spd: 130, ai: 'flyer', w: 22, h: 22, c: '#cfe8ff', xp: 140, gold: 66, biome: 'sky', aggro: 480,
                drops: [['sky_feather', .8, 2, 4], ['cloud_block', .6, 3, 8], ['spear_storm', .025, 1, 1], ['charm_zenith', .04, 1, 1]] },
  ruin_guard: { n: '유적 수호병', cw: '기', hp: 620, dmg: 78, def: 40, spd: 40, ai: 'walker', w: 30, h: 46, c: '#8a8270', xp: 240, gold: 130, biome: 'ruin', aggro: 420,
                drops: [['ruin_brick', .8, 2, 6], ['aether_shard', .4, 1, 3], ['soul_shard', .5, 2, 4], ['mace_ruin', .03, 1, 1]] },
  lantern:    { n: '잊힌 등불', hp: 380, dmg: 66, def: 16, spd: 74, ai: 'caster', w: 22, h: 30, c: '#e0c86a', xp: 200, gold: 110, biome: 'ruin', range: 330, aggro: 520,
                drops: [['aether_shard', .5, 1, 3], ['crystal', .5, 2, 5]] },

  /* ================= 유적마다 그곳에서만 나오는 것 하나 ================= */
  cartwraith: { n: '빈 광차', cw: '기', hp: 140, dmg: 30, def: 8, spd: 124, ai: 'walker', w: 30, h: 22, c: '#7a5a38', xp: 44, gold: 24, biome: 'ruin', aggro: 400,
                d: '아무도 밀지 않는데 굴러온다. 안에서 잉걸이 아직 타고 있다.',
                drops: [['deep_ember', .7, 1, 3], ['iron_ore', .5, 1, 3], ['rust_gear', .2, 1, 1]] },
  frostbound: { n: '언 순례자', hp: 260, dmg: 40, def: 20, spd: 34, ai: 'walker', w: 26, h: 38, c: '#9fd8ea', xp: 84, gold: 40, biome: 'ruin', aggro: 380,
                d: '얼음 안에 언 채로 걸어온다. 무엇을 하러 왔는지는 얼음이 안 말해 준다.',
                drops: [['neverthaw', .7, 1, 2], ['ice_shard', .8, 2, 5], ['frost_core', .3, 1, 2]] },
  jarhusk:    { n: '단지 껍데기', hp: 230, dmg: 46, def: 12, spd: 74, ai: 'jumper', w: 24, h: 26, c: '#c8a86a', xp: 92, gold: 46, biome: 'ruin', aggro: 420,
                d: '단지 안에 있던 것. 봉을 뜯은 사람이 없다는 말은, 스스로 나왔다는 뜻이다.',
                drops: [['sealed_ash', .7, 1, 3], ['gold_ore', .4, 1, 3], ['bone_frag', .6, 2, 4]] },
  ventspitter:{ n: '구멍벌레', hp: 240, dmg: 42, def: 14, spd: 30, ai: 'caster', w: 26, h: 28, c: '#5a8a74', xp: 110, gold: 52, biome: 'ruin', range: 320, aggro: 460, proj: 'rune',
                d: '포자 구멍에 살던 것. 구멍이 벌레의 집인지 벌레가 구멍인지는 모른다.',
                drops: [['spore_dust', .7, 1, 3], ['spore_sac', .5, 1, 3], ['glowcap', .4, 2, 4]] },
  sacling:    { n: '주머니의 것', hp: 300, dmg: 54, def: 16, spd: 88, ai: 'flyer', w: 24, h: 30, c: '#8a4a80', xp: 150, gold: 70, biome: 'ruin', aggro: 500,
                d: '알주머니에서 나온 것. 아직 다 자라지 않았다.',
                drops: [['blight_spawn', .7, 1, 3], ['corrupt_ess', .5, 1, 3], ['soul_shard', .3, 1, 2]] },

  /* --- 지하 공창 --- */
  scrapcrawler: { n: '고철 기어다니개', cw: '기', hp: 900, dmg: 62, def: 30, spd: 92, ai: 'walker', w: 30, h: 19, c: '#6a6a74', xp: 900, gold: 240, aggro: 420,
                 drops: [['steel_plate', 1, 3, 7], ['conduit_part', .5, 1, 2], ['gun_scrap', .02, 1, 1]] },
  sparkwisp:    { n: '불티 정령', cw: '기', hp: 620, dmg: 55, def: 18, spd: 168, ai: 'flyer', w: 20, h: 20, c: '#e8a53a', xp: 820, gold: 210, aggro: 500,
                 drops: [['power_core', .6, 1, 2], ['conduit_part', 1, 1, 3]] },
  riveter:      { n: '대갈못 사수', cw: '기', hp: 1150, dmg: 74, def: 34, spd: 74, ai: 'archer', w: 24, h: 40, c: '#8a8a96', xp: 1150, gold: 300, aggro: 620, proj: 'bone',
                 drops: [['steel_plate', 1, 4, 9], ['iron_bar', .6, 2, 4], ['gun_scrap', .025, 1, 1]] },
  foreman:      { n: '옛 십장', cw: '기', hp: 1900, dmg: 88, def: 44, spd: 88, ai: 'caster', w: 26, h: 42, c: '#c8a06a', xp: 1700, gold: 480, aggro: 640, range: 380, proj: 'rune',
                 drops: [['power_core', 1, 2, 4], ['steel_plate', 1, 5, 10], ['blueprint_frag', .4, 1, 1]] },

  /* --- 울림 정글 --- */
  vinelash:   { n: '덩굴채찍', hp: 162, dmg: 29, def: 8, spd: 74, ai: 'walker', w: 26, h: 40, c: '#3f7a34', xp: 62, gold: 28, biome: 'jungle', aggro: 500,
                drops: [['vine_coil', .7, 1, 3], ['fern_frond', .5, 1, 3]] },
  bloomspitter:{ n: '꽃뱉이', hp: 128, dmg: 26, def: 4, spd: 58, ai: 'caster', w: 26, h: 26, c: '#c85a9a', xp: 58, gold: 26, biome: 'jungle', range: 320, aggro: 480,
                drops: [['orchid', .6, 1, 2], ['vine_coil', .4, 1, 2]] },
  canopy_ape: { n: '수관 원숭이', hp: 196, dmg: 34, def: 10, spd: 118, ai: 'jumper', w: 28, h: 30, c: '#7a5a3a', xp: 84, gold: 40, biome: 'jungle', aggro: 560,
                drops: [['raw_meat', .8, 1, 2], ['vine_coil', .5, 1, 2]] },
  /* --- 버섯 골짜기 --- */
  sporeling:  { n: '포자 정령', hp: 165, dmg: 28, def: 6, spd: 96, ai: 'flyer', w: 22, h: 22, c: '#6fe0c0', xp: 60, gold: 26, biome: 'glowfen', aggro: 460,
                drops: [['spore_sac', .7, 1, 3], ['glowcap', .5, 1, 2]] },
  capbeast:   { n: '갓짐승', hp: 280, dmg: 44, def: 16, spd: 52, ai: 'jumper', w: 32, h: 26, c: '#8fd0b0', xp: 96, gold: 44, biome: 'glowfen', aggro: 420,
                drops: [['glowcap', .8, 2, 4], ['spore_sac', .4, 1, 2]] },
  /* --- 동굴 물웅덩이 · 폭포 --- */
  cave_minnow:{ n: '눈먼 송사리', hp: 12, dmg: 0, def: 0, spd: 62, ai: 'swimmer', passive: 1, w: 16, h: 10, c: '#9fd8e8', xp: 6, gold: 2, aggro: 0,
                drops: [['raw_meat', .5, 1, 1]] },
  // 정글 폭포호 전용 — 동굴 웅덩이의 눈먼 송사리와 같은 자리지만, 지상 호수답게 화사한 색을 준다
  jungle_koi: { n: '비단잉어', hp: 14, dmg: 0, def: 0, spd: 74, ai: 'swimmer', passive: 1, w: 18, h: 11, c: '#ff8a4a', xp: 7, gold: 3, aggro: 0,
                drops: [['raw_meat', .5, 1, 1]] },
  grotto_eel: { n: '웅덩이 뱀장어', hp: 150, dmg: 32, def: 8, spd: 128, ai: 'swimmer', w: 34, h: 14, c: '#3a6a5a', xp: 64, gold: 30, aggro: 300,
                drops: [['raw_meat', .6, 1, 2], ['crystal', .25, 1, 2]] },
  /* === 세션 3 몹 세기 기준 === */

  /* --- 해변 (지상, 물가) --- */
  driftling:  { n: '표류물 더미', hp: 1400, dmg: 96, def: 48, spd: 62, ai: 'walker', w: 32, h: 30, c: '#9a8a6a', biome: 'beach', xp: 620, gold: 260, aggro: 340,
                drops: [['kelp', .7, 2, 5], ['rope_kelp', .3, 1, 2], ['crab_shell', .35, 1, 3], ['lost_lamp', .12, 1, 1]] },

  /* --- 바다 부유물 (ai 'flotsam') --- */
  flotsam1:   { n: '떠다니는 나뭇더미', hp: 240, dmg: 0, def: 4, spd: 0, ai: 'flotsam', passive: 1, w: 32, h: 16, c: '#7a5a36', biome: 'sea', xp: 18, gold: 8, tier: 1,
                drops: [['wood', 1, 3, 7], ['kelp', .6, 1, 3], ['rope_kelp', .25, 1, 2], ['crab_shell', .15, 1, 1]] },
  flotsam2:   { n: '난파 상자', hp: 640, dmg: 0, def: 14, spd: 0, ai: 'flotsam', passive: 1, w: 26, h: 22, c: '#8a6238', biome: 'sea', xp: 55, gold: 40, tier: 2,
                drops: [['wood', .8, 2, 5], ['rope_kelp', .6, 1, 3], ['sea_salt', .5, 1, 3], ['iron_ore', .35, 1, 3], ['crab_shell', .35, 1, 2], ['lost_lamp', .05, 1, 1]] },
  flotsam3:   { n: '봉인된 표류 궤짝', hp: 1500, dmg: 0, def: 30, spd: 0, ai: 'flotsam', passive: 1, w: 30, h: 24, c: '#2f5a5a', biome: 'sea', xp: 160, gold: 180, tier: 3,
                drops: [['sea_salt', .7, 2, 4], ['rope_kelp', .6, 2, 4], ['shark_tooth', .35, 1, 2], ['ink_sac', .3, 1, 2], ['lost_lamp', .15, 1, 1], ['mariner_compass', .02, 1, 1]] },

  /* --- 빙하 지대 (지상) --- */
  glacier_stalker:{ n: '빙하 추적자', hp: 1250, dmg: 92, def: 36, spd: 152, ai: 'jumper', w: 30, h: 28, c: '#bfe8ff', xp: 560, gold: 240, biome: 'glacier', aggro: 620,
                drops: [['ice_shard', .7, 3, 6], ['frost_core', .35, 1, 2], ['raw_meat', .4, 1, 2]] },
  crevasse_maw: { n: '크레바스 아가리', hp: 2100, dmg: 116, def: 74, spd: 44, ai: 'walker', w: 42, h: 40, c: '#6a9ac0', xp: 900, gold: 400, biome: 'glacier', aggro: 380,
                drops: [['ice_shard', .8, 6, 12], ['frost_core', .5, 2, 4], ['crystal', .3, 1, 3]] },

  /* --- 가라앉은 바다 --- */
  reef_crab:  { n: '암초 게', hp: 1600, dmg: 100, def: 78, spd: 54, ai: 'swimmer', w: 26, h: 18, c: '#c86a4a', xp: 760, gold: 330, biome: 'sea', aggro: 260,
                drops: [['crab_shell', .65, 1, 3], ['raw_meat', .4, 1, 2]] },
  lantern_jelly:{ n: '초롱해파리', hp: 1100, dmg: 112, def: 20, spd: 46, ai: 'swimmer', passive: 1, w: 20, h: 26, c: '#8fd0e8', xp: 820, gold: 300, biome: 'sea', aggro: 200,
                drops: [['jelly_lamp', .5, 1, 2], ['aether_shard', .3, 1, 2]] },
  reef_shark: { n: '암초 상어', hp: 2200, dmg: 128, def: 52, spd: 168, ai: 'swimmer', w: 44, h: 20, c: '#5a6a78', xp: 1150, gold: 520, biome: 'sea', aggro: 520,
                drops: [['shark_tooth', .7, 1, 3], ['raw_meat', .6, 1, 3]] },
  deep_octopus:{ n: '심해 문어', hp: 2900, dmg: 146, def: 84, spd: 96, ai: 'swimmer', w: 40, h: 34, c: '#7a4a7a', xp: 1500, gold: 700, biome: 'sea', aggro: 480,
                drops: [['ink_sac', .7, 1, 3], ['abyss_pearl', .22, 1, 1]] },
  abyss_angler:{ n: '심연 초롱아귀', hp: 3600, dmg: 168, def: 96, spd: 78, ai: 'swimmer', w: 38, h: 30, c: '#3a5a6a', xp: 1950, gold: 940, biome: 'sea', aggro: 560,
                drops: [['jelly_lamp', .6, 1, 3], ['abyss_pearl', .35, 1, 2], ['soul_shard', .3, 1, 2]] },
  drowned_hand:{ n: '가라앉은 손', hp: 260, dmg: 46, def: 18, spd: 88, ai: 'swimmer', w: 24, h: 32, c: '#6a7a86', xp: 120, gold: 62, aggro: 340,
                drops: [['bone_frag', .7, 2, 4], ['lost_lamp', .3, 1, 1], ['soul_shard', .25, 1, 2]] },
  /* --- 붉은 달 전용 (이벤트 중에만 나온다) --- */
  crimson_howler: { n: '붉은 울음', hp: 450, dmg: 78, def: 22, spd: 128, ai: 'walker', w: 26, h: 40, c: '#c03a3a', xp: 220, gold: 130, aggro: 700,
                drops: [['bone_frag', .8, 2, 5], ['soul_shard', .3, 1, 2], ['potion_hp', .2, 1, 2]] },
  crimson_eye:{ n: '붉은 눈', hp: 380, dmg: 70, def: 18, spd: 112, ai: 'flyer', w: 28, h: 28, c: '#e0503c', xp: 200, gold: 120, aggro: 760,
                drops: [['corrupt_ess', .6, 1, 3], ['soul_shard', .35, 1, 2]] },

  /* --- 유적 미니보스 --- */
  /* 이제 갱도(rank 1)와 부패(rank 6)가 체력 4배 · 공격력 3배 가까이 차이 난다 — 사연: docs/code-history.md#h9 */
  /* rank 1 — 베이스캠프 옆. */
  mine_horror:  { n: '갱도의 것', hp: 1900, dmg: 42, def: 16, spd: 96, ai: 'b_slime', w: 60, h: 52, c: '#6a5a4a', xp: 1500, gold: 620, ph: 2, boss: 1,
                 drops: [['rust_gear', 1, 2, 3], ['iron_ore', 1, 20, 30], ['lost_lamp', 1, 1, 2], ['foreman_tag', 1, 1, 1]] },
  /* rank 2 */
  ice_warden:   { n: '얼음 감시자', hp: 2800, dmg: 56, def: 24, spd: 74, ai: 'b_witch', w: 40, h: 54, c: '#9fd8f0', xp: 2300, gold: 950, ph: 2, boss: 1,
                 drops: [['frozen_core', 1, 2, 3], ['frost_core', 1, 8, 14], ['ice_shard', 1, 20, 30], ['warden_seal', 1, 1, 1]] },
  /* rank 3 */
  vine_lord:    { n: '덩굴 군주', hp: 4100, dmg: 74, def: 34, spd: 80, ai: 'b_bone', w: 50, h: 74, c: '#3f7a34', xp: 3400, gold: 1500, ph: 2, boss: 1,
                 drops: [['heartwood', 1, 2, 3], ['vine_coil', 1, 12, 20], ['orchid', 1, 8, 14]] },
  /* rank 4 — 함정이 가장 촘촘한 유적의 주인 */
  sand_guardian:{ n: '모래 파수꾼', hp: 5600, dmg: 92, def: 46, spd: 66, ai: 'b_bone', w: 54, h: 70, c: '#d8b878', xp: 4800, gold: 2100, ph: 2, boss: 1,
                 drops: [['sun_disc', 1, 2, 3], ['gold_ore', 1, 15, 25], ['venom_sting', 1, 6, 10], ['caged_sun', 1, 1, 1]] },
  /* rank 5 — 입구가 없는 굴. */
  spore_queen:  { n: '포자 여왕', hp: 7200, dmg: 110, def: 42, spd: 92, ai: 'b_heart', w: 50, h: 72, c: '#6fe0c0', xp: 6400, gold: 2800, ph: 2, boss: 1,
                 drops: [['queen_spore', 1, 2, 3], ['spore_sac', 1, 12, 20], ['glowcap', 1, 15, 25], ['cap_signet', 1, 1, 1]] },
  /* rank 6 — 동쪽 끝, 가장 깊은 곳 */
  blight_maw:   { n: '부패한 아가리', hp: 9400, dmg: 132, def: 58, spd: 88, ai: 'b_heart', w: 66, h: 58, c: '#7a3f9c', xp: 9000, gold: 4000, ph: 2, boss: 1,
                 drops: [['blight_bile', 1, 2, 3], ['corrupt_ess', 1, 15, 25], ['ebon_chunk', 1, 10, 18], ['nest_crown', 1, 1, 1]] },

  /* ★ 다른 보스 열여섯은 전부 0.49~1.12배다 — 보스는 한 대가 센 것이 아니라 체력과 마디로 버티는 것이 이 게임의 규칙이다. */
  drowned_keeper:{ n: '가라앉은 지킴이', hp: 18000, dmg: 290, def: 110, spd: 84, ai: 'b_keeper', w: 54, h: 62, c: '#3f6a7a', xp: 17000, gold: 7400, boss: 1,
                 drops: [['keeper_seal', 1, 1, 1], ['abyss_pearl', 1, 6, 10], ['pressure_plate_m', 1, 8, 14]] },

  /* --- 폭주로 --- */
  splitter:   { n: '증식 기계', cw: '기', hp: 1500, dmg: 84, def: 40, spd: 84, ai: 'walker', w: 28, h: 34, c: '#8a7a6a', xp: 2600, gold: 520, aggro: 520,
                drops: [['core_shard', .8, 1, 3], ['steel_plate', .7, 3, 7], ['gear_basic', .5, 2, 5], ['orb_core', .02, 1, 1]] },
  weldarm:    { n: '용접 팔', cw: '기', hp: 1800, dmg: 92, def: 46, spd: 64, ai: 'archer', w: 26, h: 44, c: '#c8763a', xp: 2900, gold: 600, aggro: 640, proj: 'fire',
                drops: [['core_shard', .8, 1, 3], ['conduit_part', .6, 2, 4], ['refined_oil', .4, 2, 5]] },
  coreling:   { n: '노심 파편체', cw: '기', hp: 1200, dmg: 76, def: 26, spd: 176, ai: 'flyer', w: 20, h: 22, c: '#e8b04a', xp: 2400, gold: 480, aggro: 620,
                drops: [['core_shard', 1, 2, 4], ['power_core', .5, 1, 2], ['orb_core', .025, 1, 1]] },

  /* --- 보스 --- */
  king_slime:  { n: '슬라임 왕', hp: 900, dmg: 24, def: 6, spd: 60, ai: 'b_slime', w: 76, h: 58, c: '#4f7fc0', xp: 420, gold: 200, boss: 1,
                 drops: [['slime_gel', 1, 25, 40], ['ring_vigor', 1, 1, 1], ['star_heart', 1, 1, 1], ['sword_copper', .5, 1, 1]] },
  bone_lord:   { n: '뼈의 군주', hp: 2000, dmg: 36, def: 14, spd: 70, ai: 'b_bone', w: 52, h: 68, c: '#ded6bd', xp: 900, gold: 480, boss: 1,
                 drops: [['bone_frag', 1, 30, 45], ['sword_bone', 1, 1, 1], ['star_heart', 1, 1, 1], ['pick_iron', .6, 1, 1]] },
  corrupt_heart:{ n: '부패의 심장', hp: 3600, dmg: 48, def: 18, spd: 105, ai: 'b_heart', w: 54, h: 54, c: '#7a3f9c', xp: 1700, gold: 900, boss: 1,
                 drops: [['corrupt_ess', 1, 30, 50], ['charm_leech', 1, 1, 1], ['star_heart', 1, 1, 1], ['mythril_ore', 1, 12, 20]] },
  frost_witch: { n: '서리 마녀 실비아', hp: 5600, dmg: 67, def: 24, spd: 90, ai: 'b_witch', w: 34, h: 56, c: '#a8dcf0', xp: 3000, gold: 1600, boss: 1,
                 drops: [['frost_core', 1, 25, 40], ['staff_frost', 1, 1, 1], ['star_heart', 1, 1, 1], ['amul_swift', 1, 1, 1]] },
  void_king:   { n: '공허의 왕', hp: 12000, dmg: 82, def: 32, spd: 110, ai: 'b_void', w: 66, h: 88, c: '#5e3fa8', xp: 9000, gold: 5000, boss: 1,
                 drops: [['void_frag', 1, 30, 50], ['charm_star', 1, 1, 1], ['star_heart', 1, 1, 1]] },

  storm_warden: { n: '폭풍의 수호자', hp: 13000, dmg: 117, def: 38, spd: 150, ai: 'b_storm', w: 66, h: 70, c: '#bcd8f0', xp: 16000, gold: 8000, boss: 1,
                 drops: [['sky_feather', 1, 30, 50], ['aether_shard', 1, 20, 35], ['charm_feather', 1, 1, 1], ['star_heart', 1, 1, 1]] },
  first_keeper: { n: '최초의 파수꾼', cw: '기', hp: 20000, dmg: 120, def: 52, spd: 96, ai: 'b_keeper', w: 64, h: 86, c: '#c8b98a', xp: 40000, gold: 20000, boss: 1,
                 minion: 'ruin_guard',
                 drops: [['aether_shard', 1, 40, 60], ['ruin_brick', 1, 40, 70], ['charm_rune', 1, 1, 1], ['star_heart', 1, 2, 2]] },

  /* 종장 — 별이 도망쳐 온 그것 */
  pursuer:      { n: '별을 쫓아온 것', hp: 42000, dmg: 165, def: 68, spd: 128, ai: 'b_pursuer', w: 172, h: 192, c: '#2a2036', xp: 120000, gold: 60000, ph: 5, boss: 1,
                 minion: 'wraith', aggro: 4000,
                 drops: [['void_frag', 1, 60, 90], ['star_heart', 1, 3, 3], ['charm_dawn', 1, 1, 1], ['scythe_void', 1, 1, 1]] },

  /* 7단계 보스 */
  proliferator: { n: '증식체', cw: '기', hp: 46000, dmg: 150, def: 62, spd: 112, ai: 'b_prolif', w: 88, h: 72, c: '#9a8a76', boss: 1,
                 xp: 150000, gold: 70000, minion: 'splitter',
                 drops: [['core_shard', 1, 40, 60], ['machine_frame', 1, 6, 10], ['power_core', 1, 25, 40]] },
  hepha:        { n: '헤파 · 최초의 기계', cw: '기', hp: 72000, dmg: 190, def: 80, spd: 120, ai: 'b_hepha', w: 172, h: 216, c: '#c8a05a', ph: 5, boss: 1,
                 xp: 400000, gold: 180000, minion: 'coreling', aggro: 4000,
                 drops: [['hepha_heart', 1, 1, 1], ['core_shard', 1, 60, 90], ['aether_shard', 1, 30, 45]] },

  /* 세션 2 — 지하 공창의 관리자 */
  overseer:     { n: '공창의 관리자', cw: '기', hp: 30000, dmg: 140, def: 60, spd: 104, ai: 'b_overseer', w: 68, h: 88, c: '#8a8a96', xp: 90000, gold: 44000, boss: 1,
                 minion: 'riveter',
                 drops: [['steel_plate', 1, 60, 90], ['power_core', 1, 20, 30], ['blueprint_core', 1, 1, 1], ['pick_drill', 1, 1, 1]] },

  /* --- 세션 2 종장: 설계실 --- */
  draft_form:   { n: '미완의 형상', cw: '기', hp: 1600, dmg: 96, def: 52, spd: 82, ai: 'walker', w: 26, h: 44, c: '#cfc7b8', xp: 3200, gold: 700, aggro: 520,
                 drops: [['proto_ash', 1, 2, 5], ['draft_glass', .5, 1, 3]] },
  scribe_hand:  { n: '기록하는 손', cw: '기', hp: 1300, dmg: 88, def: 34, spd: 150, ai: 'caster', w: 24, h: 30, c: '#8fd8e8', xp: 3000, gold: 660, aggro: 620, range: 360, proj: 'rune',
                 drops: [['draft_glass', 1, 2, 4], ['proto_ash', .5, 1, 2], ['aether_shard', .3, 1, 3]] },
  mold_walker:  { n: '거푸집 보행체', cw: '기', hp: 2400, dmg: 110, def: 66, spd: 62, ai: 'walker', w: 34, h: 50, c: '#b8a878', xp: 3800, gold: 820, aggro: 440,
                 drops: [['archestone', 1, 4, 9], ['proto_ash', .6, 2, 4], ['draft_glass', .4, 1, 2]] },

  /* 세션 2 최종 — 사람을 본떠 만든 첫 번째 것 */
  archetype:    { n: '원형 · 첫 번째 설계', cw: '기', hp: 105000, dmg: 215, def: 92, spd: 126, ai: 'b_arche', w: 192, h: 232, c: '#e8dcc0', ph: 5, boss: 1,
                 xp: 900000, gold: 400000, minion: 'draft_form', aggro: 4000,
                 drops: [['arche_core', 1, 1, 1], ['draft_glass', 1, 40, 60], ['archestone', 1, 30, 50]] },

  /* --- 세션 3 보스 --- */
  tide_warden:  { n: '조수의 파수꾼 · 물이 지운 것', hp: 148000, dmg: 310, def: 104, spd: 96, ai: 'b_keeper', w: 104, h: 120, c: '#3f7fa8', boss: 1,
                 xp: 1200000, gold: 520000, minion: 'deep_octopus', aggro: 4200,
                 drops: [['abyss_pearl', 1, 20, 30], ['abyss_core', 1, 4, 6], ['tide_heart', 1, 1, 1]] },

  /* --- 특별 유적 ① 부유 성채 (하늘) --- */
  orbit_sentry: { n: '궤도 파수병', cw: '기', hp: 3200, dmg: 128, def: 74, spd: 112, ai: 'caster', w: 28, h: 40, c: '#8fa8c8', xp: 5200, gold: 1200, range: 380, proj: 'star', aggro: 640,
                 drops: [['orbit_plate', 1, 3, 8], ['orbit_gear', .5, 1, 2], ['aether_shard', .4, 2, 5]] },
  meridian_eye: { n: '자오선의 눈', cw: '기', hp: 2600, dmg: 116, def: 44, spd: 186, ai: 'flyer', w: 26, h: 26, c: '#7fe0ff', xp: 4800, gold: 1100, aggro: 720,
                 drops: [['void_lens', .25, 1, 1], ['orbit_gear', .6, 1, 3], ['sky_feather', .7, 2, 5]] },
  ballast_form: { n: '평형추', cw: '기', hp: 5200, dmg: 152, def: 96, spd: 54, ai: 'walker', w: 38, h: 54, c: '#5a6a80', xp: 6400, gold: 1500, aggro: 460,
                 drops: [['orbit_plate', 1, 6, 12], ['star_ash', .3, 1, 2], ['orbit_gear', .5, 2, 4]] },

  /* 부유 성채의 주인 — 지금까지 나온 무엇보다 세다. */
  restorer:     { n: '환원기 · 되돌리려는 것', cw: '기', hp: 320000, dmg: 340, def: 130, spd: 132, ai: 'b_restorer', w: 236, h: 264, c: '#a8c8e8', ph: 5, boss: 1,
                 xp: 2600000, gold: 1200000, minion: 'orbit_sentry', aggro: 5000,
                 drops: [['star_ash', 1, 4, 6], ['orbit_gear', 1, 40, 60], ['void_lens', 1, 2, 3], ['lance_orbit', 1, 1, 1]] },

  /* --- 특별 유적 ② 무너진 갱 (최심부) --- */
  gloom_crawler:{ n: '어둠을 기는 것', hp: 2800, dmg: 118, def: 56, spd: 128, ai: 'walker', w: 30, h: 24, c: '#2e2a26', xp: 4200, gold: 900, aggro: 560,
                 drops: [['deep_alloy', 1, 2, 5], ['gloom_pearl', .2, 1, 1], ['bone_frag', .6, 3, 7]] },
  damp_wisp:    { n: '가스 도깨비불', hp: 1800, dmg: 104, def: 28, spd: 158, ai: 'flyer', w: 22, h: 22, c: '#8aa05a', xp: 3800, gold: 820, aggro: 620,
                 drops: [['deep_alloy', .6, 1, 3], ['hell_ore', .5, 3, 8]] },
  lost_miner:   { n: '올라오지 못한 사람', cw: '명', hp: 4200, dmg: 136, def: 68, spd: 88, ai: 'walker', w: 22, h: 42, c: '#7a6a58', xp: 5600, gold: 1300, aggro: 600,
                 drops: [['miner_tag', .5, 1, 1], ['deep_alloy', 1, 3, 7], ['lost_lamp', .35, 1, 2]] },

  /* 무너진 갱의 주인 — 스토리와 무관한 순수 탐험 보상 */
  /* 떠 있는 섬을 붙들고 있는 것 — 스토리와 무관하다. */
  isle_keeper:  { n: '섬을 든 것', hp: 34000, dmg: 300, def: 118, spd: 92, ai: 'b_keeper', w: 88, h: 96, c: '#4a7a86', boss: 1,
                 xp: 480000, gold: 240000, minion: 'reef_shark', aggro: 3200,
                 drops: [['abyss_pearl', 1, 6, 10], ['abyss_core', 1, 2, 3], ['coconut', 1, 8, 14]] },
  shaft_maw:    { n: '갱을 메운 것', hp: 88000, dmg: 244, def: 112, spd: 74, ai: 'b_heart', w: 184, h: 168, c: '#3a342c', ph: 5, boss: 1,
                 xp: 620000, gold: 300000, minion: 'gloom_crawler', aggro: 3600,
                 drops: [['gloom_pearl', 1, 3, 4], ['deep_alloy', 1, 40, 60], ['miner_tag', 1, 2, 3], ['hammer_cave', 1, 1, 1]] }
};

/* ================= 개조 — 세션 2에서 옛 몹이 기계가 되어 돌아온다 ================= */
export const mobCw = t => (ENEMIES[t] && ENEMIES[t].cw) || tr('마리');

export const MECH_MUL = 1.5;                 // 체력·공격력·방어·보상 모두 원래의 1.5배
/* ★ 개조된 것에서는 **부품만** 나온다. */
export const MECH_PART = 'rust_gear';
export const MECH_CH0 = 9;                   // 세션 2 서장
export const MECH_CH1 = 14;                  // 세션 2 종장 — 이때 전부 넘어간다
export const MECH_ORDER = [
  /* 9장 */  'slime', 'ashcrow', 'bat', 'zombie',
  /* 10장 */ 'spider', 'skeleton', 'archer', 'sporeling',
  /* 11장 */ 'scorpion', 'sandmaw', 'minerghost', 'vinelash',
  /* 12장 */ 'icewolf', 'frostling', 'bloomspitter', 'canopy_ape', 'imp',
  /* 13장 */ 'crawler', 'shadoweye', 'wraith', 'crystalcrab',
  /* 14장 */ 'lavaslug', 'capbeast', 'corrupttree', 'golem'
];

/** 그 장까지 개조가 끝난 몹의 수. */
export function mechCount(chapter) {
  if (chapter < MECH_CH0) return 0;
  const t = clamp((chapter - MECH_CH0) / (MECH_CH1 - MECH_CH0), 0, 1);
  return Math.round(4 + t * (MECH_ORDER.length - 4));
}
/** 이 장에서 이 몹이 개조되어 나오는가. */
export function isMech(type, chapter) {
  const n = mechCount(chapter);
  if (!n) return false;
  const i = MECH_ORDER.indexOf(type);
  return i >= 0 && i < n;
}
/** 살아 있는 개체의 이름. */
export function mobName(type, mech) {
  const n = (ENEMIES[type] || {}).n || type;
  return mech ? `${tr('개조된')} ` + n : n;
}
