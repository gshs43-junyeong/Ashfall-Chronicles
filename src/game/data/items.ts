// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== data/items.js — 아이템 · 유적 전리품 · 맞는 순간 연출 · 설치물 크기 · 제작 시설 ===== */
import { T } from '../data.js';
/* data.js 에서 나눈 표 — data.js 다음 층에서 소스 순서대로 읽힌다 */

/* ---------------- 아이템 ---------------- */
// type: weapon / tool / armor / acc / consum / mat / block / summon
export const ITEMS = {
  /* --- 근접 --- */
  sword_wood:   { n: '금 간 목검', i: '🗡', type: 'weapon', wc: 'melee', dmg: 9,  spd: 2.2, kb: 3, reach: 40, tier: 0, d: '아버지의 창고 구석에서 찾아낸 연습용 검.'  },
  sword_copper: { n: '구리 장검', i: '⚔', type: 'weapon', wc: 'melee', dmg: 16, spd: 2.0, kb: 4, reach: 44, tier: 1, d: '무르지만 정직하게 벤다.'  },
  sword_iron:   { n: '강철 브로드소드', i: '⚔', type: 'weapon', wc: 'melee', dmg: 28, spd: 1.9, kb: 5, reach: 48, tier: 2, d: '잿빛 마을 대장간의 표준품.'  },
  sword_bone:   { n: '뼈의 군주의 이빨', i: '🦴', type: 'weapon', wc: 'melee', dmg: 42, spd: 2.3, kb: 4, reach: 46, tier: 3, lifesteal: 5, d: '휘두를 때마다 낮은 웃음소리가 난다.'  },
  sword_mythril:{ n: '미스릴 세이버', i: '⚔', type: 'weapon', wc: 'melee', dmg: 58, spd: 2.4, kb: 5, reach: 50, tier: 4, d: '푸른 잔상이 궤적을 따라 남는다.'  },
  sword_dawn:   { n: '여명의 대검', i: '🌅', type: 'weapon', wc: 'melee', dmg: 88, spd: 1.7, kb: 9, reach: 62, tier: 5, fire: 2, d: '한 번의 일격에 밤을 걷어낸다.'  },
  scythe_void:  { n: '공허의 낫', i: '🌑', type: 'weapon', wc: 'melee', dmg: 128, spd: 2.1, kb: 7, reach: 66, tier: 6, lifesteal: 9, d: '벤 자리에 잠시 별이 보인다.'  },

  /* --- 원거리 --- */
  bow_hunt:     { n: '사냥용 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 10, spd: 2.0, kb: 2, tier: 0, proj: 'arrow', d: '숲의 첫 친구.'  },
  bow_copper:   { n: '구리 강궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 19, spd: 2.0, kb: 3, tier: 1, proj: 'arrow'  },
  bow_iron:     { n: '강철 장궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 32, spd: 2.1, kb: 3, tier: 2, proj: 'arrow'  },
  bow_storm:    { n: '폭풍의 활', i: '🌪', type: 'weapon', wc: 'ranged', dmg: 48, spd: 2.6, kb: 3, tier: 4, proj: 'arrow', multi: 2, d: '시위를 놓으면 바람이 먼저 간다.'  },
  bow_starfall: { n: '별똥의 사수', i: '☄', type: 'weapon', wc: 'ranged', dmg: 96, spd: 2.4, kb: 4, tier: 6, proj: 'star', multi: 3, d: '떨어진 별의 파편으로 만든 시위.'  },

  /* --- 마법 --- */
  staff_branch: { n: '옹이진 나뭇가지', i: '🪄', type: 'weapon', wc: 'magic', dmg: 11, spd: 1.8, kb: 2, mana: 4, tier: 0, proj: 'bolt', d: '마을 마녀가 쥐여준 물건.'  },
  staff_flame:  { n: '불꽃의 홀', i: '🔥', type: 'weapon', wc: 'magic', dmg: 26, spd: 1.6, kb: 3, mana: 7, tier: 2, proj: 'fire', d: '손잡이가 늘 따뜻하다.'  },
  staff_frost:  { n: '서리 지팡이', i: '❄', type: 'weapon', wc: 'magic', dmg: 40, spd: 1.9, kb: 2, mana: 8, tier: 3, proj: 'frost', d: '맞은 것은 느려진다.'  },
  staff_soul:   { n: '영혼 수확자', i: '💠', type: 'weapon', wc: 'magic', dmg: 62, spd: 2.2, kb: 2, mana: 9, tier: 4, proj: 'soul', multi: 2  },
  staff_abyss:  { n: '심연의 홀', i: '🔮', type: 'weapon', wc: 'magic', dmg: 110, spd: 2.0, kb: 4, mana: 14, tier: 6, proj: 'void', multi: 2, d: '별이 잠든 자리에서 자란 결정.'  },

  /* --- 도구 --- */
  pick_copper:  { n: '구리 곡괭이', i: '⛏', type: 'tool', power: 1, dmg: 6, spd: 2.2, d: '돌 · 얼음 · 구리 · 철까지 캘 수 있다.' , lvReq: 0},
  /* 굴 파는 이의 시작 곡괭이. */
  pick_sharp:   { n: '날카로운 곡괭이', i: '⛏', type: 'tool', power: 1, dmg: 9, spd: 2.2, d: '구리 곡괭이와 같은 것을 캐지만, 날을 세워 두어 더 아프게 때린다.' , lvReq: 0},
  pick_iron:    { n: '강철 곡괭이', i: '⛏', type: 'tool', power: 2, dmg: 9, spd: 2.4, d: '금 · 수정 · 미스릴을 캘 수 있다.' , lvReq: 5},
  pick_mythril: { n: '미스릴 곡괭이', i: '⛏', type: 'tool', power: 3, dmg: 14, spd: 2.7, d: '흑요암 · 영혼석 · 지옥석을 캘 수 있다.' , lvReq: 10},
  pick_soul:    { n: '영혼 착암기', i: '⛏', type: 'tool', power: 4, dmg: 20, spd: 3.2, d: '기반암 외의 모든 것을 뚫는다.' , lvReq: 16},
  axe_iron:     { n: '강철 도끼', i: '🪓', type: 'tool', power: 1, dmg: 12, spd: 2.0, chop: 3 , lvReq: 5},

  /* --- 낚시 --- */
  /* fishItemChance — 물고기가 아니라 "무언가 다른 것"이 걸릴 기본 확률. */
  rod_basic: { n: '평범한 낚싯대', i: '🎣', type: 'rod', fishWait: 1, fishBonus: 0, fishItemChance: 0.015,
               d: '물 블록에 우클릭해 던진다. 생고기가 있으면 자동으로 미끼가 된다.' , lvReq: 1 },
  rod_adv:   { n: '숙련된 낚싯대', i: '🎣', type: 'rod', fishWait: 0.7, fishBonus: 0.15, fishItemChance: 0.22,
               d: '입질이 빠르고, 손끝이 더 잘 읽힌다. 물고기 말고 다른 것도 곧잘 걸려 나온다.' , lvReq: 14 },
  fish_common: { n: '잔가시 물고기', i: '🐟', type: 'consum', use: { hp: 26 }, cd: 6, stack: 30,
                 d: '흔하지만 억센 가시가 많다.' },
  fish_silver: { n: '은빛 물고기', i: '🐠', type: 'consum', use: { hp: 55, buff: 'fed_soup' }, cd: 6, stack: 20,
                 d: '비늘이 동전처럼 반짝인다.' },
  fish_deep:   { n: '심해어', i: '🐡', type: 'consum', use: { hp: 90, buff: 'fed_stew' }, cd: 6, stack: 12,
                 d: '이런 깊이에 살 리 없는 눈을 하고 있다.' },
  /* 산소통 — 잠수 시간을 늘린다. */
  /* 산소통 — **유틸리티 칸(util)** 에 낀다. */
  tank_air:    { n: '휴대용 산소통', i: '🫧', type: 'util', b: { oxyMax: 14, ms: -2 },
                 d: '등에 메는 낡은 통. 숨을 오래 참게 해 주지만 물살을 조금 더 탄다.', lvReq: 8 },
  tank_deep:   { n: '심해용 산소통', i: '🫧', type: 'util', b: { oxyMax: 32, def: 6 },
                 d: '깊은 곳에서도 견디도록 겹으로 두른 통. 휴대용 통을 뜯어 다시 감았다.', lvReq: 20 },
  tank_abyss:  { n: '심연용 산소통', i: '🫧', type: 'util', b: { oxyMax: 64, def: 12, oxyReg: 1 },
                 d: '노심으로 공기를 다시 짜낸다. 물 밖에서 숨이 차는 속도까지 달라진다.', lvReq: 32 },
  ring_angler: { n: '낚시꾼의 반지', i: '💍', type: 'acc', b: { crit: 8, lifesteal: 3, ms: 4 },
                 d: '미끼도 없이 이걸 낚았다는 사람이 있다. 아무도 안 믿는다.' , lvReq: 1 },

  /* ================= 물에서만 나오는 것 일곱 ================= */
  tide_pearl:   { n: '물때 진주', i: '🫧', type: 'mat', stack: 999, price: 620,
                  d: '조수가 바뀔 때만 열리는 조개 속에 있다. 재가 내린 뒤로는 더 귀해졌다.' },
  sunken_coin:  { n: '가라앉은 주화', i: '🪙', type: 'mat', stack: 999, price: 1100,
                  d: '앞면이 닳아 누구 얼굴인지 알 수 없다. 값은 여전히 나간다.' },
  lantern_fry:  { n: '등불 치어', i: '🏮', type: 'consum', use: { hp: 70, buff: 'lantern' }, cd: 6, stack: 20,
                  d: '삼키면 뱃속이 한동안 환하다. 어두운 데서 앞이 보인다.' },
  river_scale:  { n: '물비늘', i: '🐚', type: 'mat', stack: 999, price: 260,
                  d: '겹쳐 꿰매면 물에 젖지 않는 갑옷이 된다.' },
  drowned_cell: { n: '물먹은 전지', i: '🪫', type: 'mat', stack: 999, price: 340,
                  d: '공창이 물길에 흘려보낸 것. 말리면 아직 쓸 수 있다.' },
  coolant_vial: { n: '냉각액 병', i: '🧴', type: 'consum', use: { mp: 80, buff: 'coolant' }, cd: 8, stack: 20,
                  d: '공창의 냉각수를 병에 담았다. 마시면 몸이 식으면서 손이 빨라진다.' },
  rust_sinker:  { n: '삭은 봉돌', i: '🔩', type: 'mat', stack: 999, price: 180,
                  d: '납덩이에 대갈못을 박아 만든 것. 녹만 털면 다시 쓴다.' },
  knot_angler:  { n: '낚시꾼의 매듭', i: '🪢', type: 'acc', b: { crit: 10, ms: 6, cdr: 6, hp: 60 },
                  d: '누가 언제 묶었는지 모른다. 풀리지도 않고, 끊기지도 않는다.' , lvReq: 1 },

  /* ---- 물에서만 나오는 무기 여섯 (세션마다 셋) ---- */
  spear_river:    { n: '물살 작살', i: '🔱', type: 'weapon', wc: 'melee', dmg: 46, spd: 2.8, kb: 4, reach: 62, tier: 3,
                   d: '물속에서 던지라고 만든 것이라 유난히 길다. 뭍에서도 잘 든다.' },
  bow_reed:      { n: '갈대 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 36, spd: 2.8, kb: 2, tier: 3, proj: 'arrow',
                   d: '물가에서 자란 갈대는 잘 휘고 잘 돌아온다.' },
  staff_current: { n: '물길의 홀', i: '🌊', type: 'weapon', wc: 'magic', dmg: 52, spd: 2.1, kb: 3, mana: 8, tier: 4, proj: 'frost',
                   d: '물이 어디로 가고 싶어 하는지를 알려 준다. 맞은 것도 그쪽으로 간다.' },
  harpoon_cool:  { n: '냉각 작살', i: '🔱', type: 'weapon', wc: 'melee', dmg: 138, spd: 2.6, kb: 8, reach: 70, tier: 6,
                   d: '공창이 과열된 것을 찍어 식히던 연장. 사람에게 쓰라고 만든 게 아니다.' },
  gun_pressure:  { n: '수압 사출기', i: '💦', type: 'weapon', wc: 'ranged', dmg: 126, spd: 2.8, kb: 6, tier: 7, proj: 'bolt',
                   d: '물을 실처럼 가늘게 뽑아 쏜다. 강철도 그렇게 잘랐다고 한다.' },
  staff_deluge:  { n: '범람의 홀', i: '🌀', type: 'weapon', wc: 'magic', dmg: 144, spd: 2.2, kb: 5, mana: 14, tier: 7, proj: 'void', multi: 2,
                   d: '수문을 여는 손잡이였다. 열면 무엇이 오는지는 그때도 알고 있었다.' },

  /* ---- 물에서만 나오는 장신구 여섯 (세션마다 셋) ---- */
  /* 뱃사람의 나침반 — 바다 부유물 3단계(봉인된 표류 궤짝)에서만 2%. 그림은 PNG(item/mariner_compass) */
  mariner_compass: { n: '뱃사람의 나침반', i: '🧭', type: 'acc', b: { ms: 14, oxyMax: 8, crit: 6, dex: 4, oxyReg: 1 }, lvReq: 28, price: 4200,
                   d: '바늘이 북쪽이 아니라 뭍을 가리킨다. 한 번도 틀린 적이 없다고 한다.' },
  charm_float:   { n: '찌 부적', i: '🎏', type: 'acc', b: { jump: 1, ms: 8, dex: 3 },
                   d: '가라앉지 않는다. 차고 있으면 발도 그렇게 된다.' , lvReq: 8 },
  ring_ripple:   { n: '물결 반지', i: '💍', type: 'acc', b: { cdr: 10, mp: 40, int: 4 },
                   d: '한 번 던지면 끝까지 퍼진다. 되돌아오지도 않는다.' , lvReq: 8 },
  amul_river:    { n: '비늘 목걸이', i: '📿', type: 'acc', b: { def: 12, hp: 50, frost: 1 },
                   d: '물비늘을 겹쳐 꿰었다. 찬 것이 잘 튕겨 나간다.' , lvReq: 10 },
  charm_conden:  { n: '응축기', i: '💧', type: 'acc', b: { charge: 140, cdr: 12, int: 8 },
                   d: '공창의 냉각탑에서 떼어 온 것. 아직도 안쪽에 물이 맺힌다.' , lvReq: 30 },
  ring_sluice:   { n: '수문 반지', i: '💍', type: 'acc', b: { def: 20, dr: 6, vit: 8 },
                   d: '닫으라고 만든 것이라, 차고 있으면 무엇이든 잘 닫힌다.' , lvReq: 30 },
  amul_undertow: { n: '저류 목걸이', i: '📿', type: 'acc', b: { crit: 14, ms: 10, lifesteal: 4 },
                   d: '겉은 잔잔하다. 아래에서 끌고 가는 것은 따로 있다.' , lvReq: 32 },

  /* --- 방어구 --- */
  helm_cloth:  { n: '천 두건', i: '🧢', type: 'armor', slot: 'helm', def: 2, b: { mp: 8 } , lvReq: 1 },
  chest_cloth: { n: '여행자의 상의', i: '👕', type: 'armor', slot: 'chest', def: 3, b: { ms: 3 } , lvReq: 1 },
  boots_cloth: { n: '해진 장화', i: '👞', type: 'armor', slot: 'boots', def: 1, b: { ms: 5 } , lvReq: 1 },
  helm_copper: { n: '구리 투구', i: '⛑', type: 'armor', slot: 'helm', def: 5, b: { hp: 10 } , lvReq: 6 },
  chest_copper:{ n: '구리 흉갑', i: '🦺', type: 'armor', slot: 'chest', def: 7, b: { hp: 14 } , lvReq: 6 },
  boots_copper:{ n: '구리 각반', i: '🥾', type: 'armor', slot: 'boots', def: 4, b: { ms: 4 } , lvReq: 6 },
  helm_iron:   { n: '강철 투구', i: '⛑', type: 'armor', slot: 'helm', def: 9, b: { hp: 20, vit: 2 } , lvReq: 12 },
  chest_iron:  { n: '강철 판금', i: '🦺', type: 'armor', slot: 'chest', def: 13, b: { hp: 30, def: 3 } , lvReq: 12 },
  boots_iron:  { n: '강철 정강이받이', i: '🥾', type: 'armor', slot: 'boots', def: 7, b: { ms: 5, vit: 2 } , lvReq: 12 },
  /* 낚시로만 모을 수 있는 물비늘을 겹쳐 꿰맨 갑옷. */
  chest_river: { n: '물비늘 갑옷', i: '🐚', type: 'armor', slot: 'chest', def: 11, b: { hp: 24, ms: 12, dex: 4 },
                 d: '물에 젖지 않는다. 물에서 건진 것으로 지었으니 당연한 일인지도 모른다.' , lvReq: 12 },
  helm_mythril:{ n: '미스릴 투구', i: '👑', type: 'armor', slot: 'helm', def: 16, b: { mp: 30, int: 4, cdr: 6 } , lvReq: 20 },
  chest_mythril:{ n: '미스릴 흉갑', i: '🛡', type: 'armor', slot: 'chest', def: 22, b: { hp: 55, allStat: 3 } , lvReq: 20 },
  boots_mythril:{ n: '미스릴 부츠', i: '🥾', type: 'armor', slot: 'boots', def: 12, b: { ms: 10, dex: 4 } , lvReq: 20 },
  helm_soul:   { n: '영혼 관', i: '👑', type: 'armor', slot: 'helm', def: 26, b: { mp: 60, int: 8, cdr: 12 } , lvReq: 28 },
  chest_soul:  { n: '별빛 흉갑', i: '🛡', type: 'armor', slot: 'chest', def: 36, b: { hp: 110, allStat: 6 } , lvReq: 28 },
  boots_soul:  { n: '유성 보행자', i: '👟', type: 'armor', slot: 'boots', def: 20, b: { ms: 18, jump: 1, dex: 7 } , lvReq: 28 },

  /* --- 장신구 --- */
  band_worn:   { n: '낡은 손목대', i: '🧵', type: 'acc', b: { hp: 15, def: 2 }, d: '누군가 오래 차고 있던 것. 그래도 아직 쓸 만하다.' , lvReq: 1 },
  ring_vigor:  { n: '활력의 반지', i: '💍', type: 'acc', b: { hp: 25, vit: 3 } , lvReq: 4 },
  ring_focus:  { n: '집중의 반지', i: '💍', type: 'acc', b: { mp: 25, int: 3 } , lvReq: 4 },
  amul_swift:  { n: '질풍의 부적', i: '📿', type: 'acc', b: { ms: 12, dex: 4 } , lvReq: 4 },
  amul_ember:  { n: '잉걸불 목걸이', i: '🔴', type: 'acc', b: { str: 5, fire: 1 } , lvReq: 4 },
  charm_cloud: { n: '구름 결정', i: '☁', type: 'acc', b: { jump: 1, ms: 6 }, d: '공중에서 한 번 더 도약할 수 있다.' , lvReq: 8 },
  charm_leech: { n: '거머리 문양', i: '🩸', type: 'acc', b: { lifesteal: 7 } , lvReq: 10 },
  charm_star:  { n: '별의 조각', i: '⭐', type: 'acc', b: { allStat: 8, cdr: 10, hp: 40, mp: 40 }, d: '떨어진 별의 심장 한 조각.' , lvReq: 24 },

  /* --- 가방 (장비 슬롯에 끼워 소지품 칸을 늘린다) --- */
  bag_pouch:   { n: '거미줄 쌈지', i: '👝', type: 'bag', slots: 4, d: '거미줄로 성기게 짠 작은 주머니. 그래도 없는 것보단 낫다.' , lvReq: 1 },
  bag_satchel: { n: '가죽 배낭', i: '🎒', type: 'bag', slots: 8, d: '대장장이 손끝에서 나온 튼튼한 배낭.' , lvReq: 6 },
  bag_pack:    { n: '구름결 배낭', i: '🎒', type: 'bag', slots: 12, d: '무게가 반쯤 사라진 것처럼 가볍다.' , lvReq: 24 },
  bag_vault:   { n: '유적의 보관함', i: '🧳', type: 'bag', slots: 16, d: '안쪽이 바깥보다 넓다. 어떻게 만든 건지는 아무도 모른다.' , lvReq: 20 },

  /* --- 소비 --- */
  potion_hp_small: { n: '작은 치유 물약', i: '🧪', type: 'consum', use: { hp: 60 }, instant: 1, stack: 20, d: '즉시 체력 60 회복. 재사용 대기시간이 없다.' },
  potion_hp:   { n: '치유 물약', i: '🧪', type: 'consum', use: { hp: 140 }, instant: 1, stack: 20, d: '즉시 체력 140 회복. 재사용 대기시간이 없다.' },
  potion_hp_greater: { n: '상급 치유 물약', i: '🧪', type: 'consum', use: { hp: 280 }, instant: 1, stack: 20,
                       d: '즉시 체력 280 회복. 재사용 대기시간이 없다.' },
  potion_mp_small: { n: '작은 마나 물약', i: '⚗', type: 'consum', use: { mp: 45 }, instant: 1, stack: 20, d: '즉시 마나 45 회복. 재사용 대기시간이 없다.' },
  potion_mp:   { n: '마나 물약', i: '⚗', type: 'consum', use: { mp: 100 }, instant: 1, stack: 20, d: '즉시 마나 100 회복. 재사용 대기시간이 없다.' },
  potion_mp_greater: { n: '상급 마나 물약', i: '⚗', type: 'consum', use: { mp: 200 }, instant: 1, stack: 20,
                       d: '즉시 마나 200 회복. 재사용 대기시간이 없다.' },
  potion_str:  { n: '분노의 비약', i: '🍶', type: 'consum', use: { buff: 'rage' }, cd: 4, stack: 10, d: '3분간 피해 +20%.' },
  potion_str_greater: { n: '상급 분노의 비약', i: '🍶', type: 'consum', use: { buff: 'rage_greater' }, cd: 4, stack: 10, d: '4분간 피해 +32%.' },
  potion_iron: { n: '무쇠 비약', i: '🍯', type: 'consum', use: { buff: 'iron' }, cd: 4, stack: 10, d: '3분간 방어 +12.' },
  potion_iron_greater: { n: '상급 무쇠 비약', i: '🍯', type: 'consum', use: { buff: 'iron_greater' }, cd: 4, stack: 10, d: '4분간 방어 +22.' },
  food_stew:   { n: '따뜻한 스튜', i: '🍲', type: 'consum', use: { hp: 40, buff: 'well' }, cd: 4, stack: 10, d: '체력 회복 + 재생 버프.' },
  raw_meat:    { n: '생고기', i: '🥩', type: 'consum', use: { hp: 30 }, cd: 8, stack: 20, d: '안 익혔다. 그래도 없는 것보단 낫다.' },

  /* --- 펫 알 (우클릭으로 깨서 펫을 얻는다) --- */
  /* 알값 — 파는 사람(조련사 리카)이 여명 마을 주민이라 세션 2에나 만난다. */
  /* 알은 값이 흔들리면 안 된다. */
  egg_common:  { n: '평범한 알', i: '🥚', type: 'consum', use: { egg: 'common' }, price: 10000, fixed: 1, stack: 20, d: '깨 보기 전까지는 무엇이 나올지 모른다.' },
  egg_rare:    { n: '푸른 알', i: '🥚', type: 'consum', use: { egg: 'rare' }, price: 30000, fixed: 1, stack: 20, d: '희귀한 짐승의 기운이 느껴진다.' },
  egg_epic:    { n: '보랏빛 알', i: '🥚', type: 'consum', use: { egg: 'epic' }, price: 100000, fixed: 1, stack: 20, d: '알 속에서 무언가 조용히 뛰고 있다.' },
  /* 펫 사탕 — 낀 펫 둘 다에게 경험치를 준다. */
  glacium_ore: { n: '빙정 원석', i: '🔷', type: 'mat', stack: 999, price: 140,
    d: '빙하 깊은 곳에서만 나온다. 손에 쥐면 손끝이 아리다.' },
  tide_ore:    { n: '조수 원석', i: '🔶', type: 'mat', stack: 999, price: 140,
    d: '해저 바위에 박혀 있다. 물기가 마르지 않는다.' },
  glacium_bar: { n: '빙정 주괴', i: '🧊', type: 'mat', stack: 999, price: 460,
    d: '녹이면 오히려 더 차가워진다.' },
  tide_bar:    { n: '조수 주괴', i: '🌀', type: 'mat', stack: 999, price: 460,
    d: '두드릴 때마다 물결 무늬가 남는다.' },
  /* 운석 구덩이에서만 나온다(game.js carveCrater). */
  meteorite:    { n: '운석 조각', i: '☄️', type: 'mat', stack: 999, price: 180,
    d: '하늘에서 떨어진 쇳덩이. 아직 식지 않은 듯 손바닥이 따뜻하다.' },
  star_crystal: { n: '별빛 수정', i: '✨', type: 'mat', stack: 999, price: 320,
    d: '운석이 떨어진 자리에만 자란다. 밤이 되면 더 밝아진다.' },
  /* --- 유틸리티 탐지기 둘 --- */
  det_metal:   { n: '금속 탐지기', i: '📡', type: 'util', det: 'ore', b: { ms: -3 },
    d: '가까운 광맥이 지도에 비친다. 반경 30칸. 들고 다니면 조금 무겁다.' },
  det_mob:     { n: '몬스터 탐지기', i: '📡', type: 'util', det: 'mob', b: { ms: -3 },
    d: '가까운 것들이 지도에 비친다. 반경 30칸. 보고 싶지 않은 것까지 보인다.' },
  coconut:     { n: '코코넛', i: '🥥', type: 'consum', use: { hp: 90, buff: 'fed_coconut' }, cd: 8, price: 90, stack: 99,
    d: '단단한 껍질 안에 물이 차 있다. 섬에서만 난다.' },
  pet_candy:   { n: '펫 사탕', i: '🍬', type: 'consum', use: { petXp: 1200 }, price: 6000, fixed: 1, stack: 99, instant: 1, d: '주머니에 넣어 두면 녀석들이 먼저 안다.' },

  /* --- 채집물: 들판에 흩어진 장식이 주는 재료. 아직 이걸 쓰는 제작법은 없다 --- */
  wildflower:   { n: '들꽃', i: '🌸', type: 'mat', stack: 999, d: '숲과 초원 어디에나 핀다.' },
  weed:         { n: '잡초', i: '🌿', type: 'mat', stack: 999, d: '뽑아도 뽑아도 다시 난다.' },
  cactus_flesh: { n: '선인장 속살', i: '🌵', type: 'mat', stack: 999, d: '메마른 땅에서도 물기를 머금고 있다.' },
  mushroom:     { n: '버섯', i: '🍄', type: 'mat', stack: 999, d: '축축하고 어두운 곳에서 자란다.' },

  /* --- 재료 --- */
  wood:        { n: '나무', i: '🪵', type: 'mat', stack: 999 },
  stone:       { n: '돌', i: '🪨', type: 'block', tile: T.STONE, stack: 999 },
  limestone:   { n: '석회암', i: '🪨', type: 'block', tile: T.LIMESTONE, stack: 999, d: '무르고 밝은 돌. 물이 스민 자리에 종유석이 자란다.' },
  granite:     { n: '화강암', i: '🪨', type: 'block', tile: T.GRANITE, stack: 999, d: '깊은 데서 굳은 돌. 알갱이가 굵고 단단하다.' },
  dirt:        { n: '흙', i: '🟤', type: 'block', tile: T.DIRT, stack: 999 },
  sand:        { n: '모래', i: '🟨', type: 'block', tile: T.SAND, stack: 999 },
  ash:         { n: '재', i: '⬛', type: 'block', tile: T.ASH, stack: 999 },
  plank:       { n: '판자', i: '🟫', type: 'block', tile: T.PLANK, stack: 999 },
  brick:       { n: '석벽돌', i: '🧱', type: 'block', tile: T.BRICK, stack: 999 },
  torch:       { n: '횃불', i: '🕯', type: 'block', tile: T.TORCH, stack: 999, d: '어둠은 좋은 사냥터가 아니다.' },
  platform:    { n: '나무 발판', i: '➖', type: 'block', tile: T.PLATFORM, stack: 999 },
  copper_ore:  { n: '구리 원석', i: '🟠', type: 'mat', stack: 999 },
  iron_ore:    { n: '철 원석', i: '⚪', type: 'mat', stack: 999 },
  gold_ore:    { n: '금 원석', i: '🟡', type: 'mat', stack: 999 },
  mythril_ore: { n: '미스릴 원석', i: '🟩', type: 'mat', stack: 999 },
  hell_ore:    { n: '지옥석', i: '🔶', type: 'mat', stack: 999 },
  copper_bar:  { n: '구리 주괴', i: '🟧', type: 'mat', stack: 999 },
  iron_bar:    { n: '강철 주괴', i: '⬜', type: 'mat', stack: 999 },
  gold_bar:    { n: '금 주괴', i: '🟨', type: 'mat', stack: 999 },
  mythril_bar: { n: '미스릴 주괴', i: '💚', type: 'mat', stack: 999 },
  obsidian:    { n: '흑암석', i: '⬛', type: 'block', tile: T.OBSIDIAN, stack: 999 },
  ebon_chunk:  { n: '흑요암 덩이', i: '🟣', type: 'mat', stack: 999 },
  ice_shard:   { n: '얼음 파편', i: '🧊', type: 'mat', stack: 999 },
  crystal:     { n: '수정', i: '💎', type: 'mat', stack: 999 },
  slime_gel:   { n: '슬라임 젤', i: '🫧', type: 'mat', stack: 999 },
  bone_frag:   { n: '뼛조각', i: '🦴', type: 'mat', stack: 999 },
  corrupt_ess: { n: '부패의 정수', i: '🟪', type: 'mat', stack: 999 },
  frost_core:  { n: '서리 결정', i: '❄', type: 'mat', stack: 999 },
  void_frag:   { n: '공허 조각', i: '🌌', type: 'mat', stack: 999 },
  soul_shard:  { n: '영혼 파편', i: '✨', type: 'mat', stack: 999 },
  star_heart:  { n: '별의 심장', i: '💛', type: 'mat', stack: 9, d: '다섯 개를 모아야 한다.' },

  /* === 몬스터 전리품 === */
  ash_feather:  { n: '잿빛 깃', i: '🪶', type: 'mat', stack: 999, d: '까마귀는 잿빛에 가장 먼저 적응한 것들이다.' },
  spider_silk:  { n: '거미 실', i: '🕸', type: 'mat', stack: 999 },
  lost_lamp:    { n: '잃어버린 등', i: '🏮', type: 'mat', stack: 99, d: '아직도 희미하게 켜져 있다.' },
  venom_sting:  { n: '독침', i: '🦂', type: 'mat', stack: 999 },
  ice_fang:     { n: '얼음 송곳니', i: '🦷', type: 'mat', stack: 999 },
  moss_core:    { n: '이끼 심장', i: '🟢', type: 'mat', stack: 999 },
  crystal_claw: { n: '수정 집게', i: '🦞', type: 'mat', stack: 999 },
  lava_gel:     { n: '용암 점액', i: '🟥', type: 'mat', stack: 999 },
  cloud_jelly:  { n: '구름 젤리', i: '🫧', type: 'mat', stack: 999 },
  archive_seal: { n: '사서의 인장', i: '📜', type: 'mat', stack: 999 },

  /* === 전리품으로 만드는 무기 === */
  bow_crow:     { n: '까마귀 사수', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 17, spd: 2.5, kb: 2, tier: 1, proj: 'arrow', d: '깃이 가벼워 시위가 빨리 돌아온다.'  },
  dagger_venom: { n: '독니 단검', i: '🗡', type: 'weapon', wc: 'melee', dmg: 15, spd: 4.0, kb: 1, reach: 32, tier: 2, poison: 2, d: '느리게 죽이지만, 확실하게 죽인다.'  },
  bow_silk:     { n: '거미줄 활', i: '🕸', type: 'weapon', wc: 'ranged', dmg: 26, spd: 2.2, kb: 2, tier: 2, proj: 'arrow', frost: 1, d: '맞은 것은 실에 감겨 느려진다.'  },
  axe_frost:    { n: '서리 도끼', i: '🪓', type: 'weapon', wc: 'melee', dmg: 48, spd: 1.6, kb: 8, reach: 52, tier: 3, frost: 2, d: '한 번에 크게, 그리고 얼린다.'  },
  staff_moss:   { n: '이끼의 홀', i: '🌿', type: 'weapon', wc: 'magic', dmg: 34, spd: 1.9, kb: 2, mana: 7, tier: 3, proj: 'bolt', lifesteal: 6, d: '베어낸 것을 조금씩 돌려받는다.'  },
  hammer_lava:  { n: '용암 망치', i: '🔨', type: 'weapon', wc: 'melee', dmg: 105, spd: 1.4, kb: 12, reach: 60, tier: 5, fire: 3, d: '내려칠 때마다 바닥이 잠깐 녹는다.'  },
  staff_archive:{ n: '사서의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 96, spd: 2.4, kb: 3, mana: 12, tier: 6, proj: 'soul', multi: 3, d: '읽는 것만으로 문장이 날아간다.'  },
  charm_prism:  { n: '프리즘 부적', i: '🔷', type: 'acc', b: { crit: 10, critD: 40, int: 5 } , lvReq: 14 },
  charm_lamp:   { n: '잃어버린 등불', i: '🏮', type: 'acc', b: { hp: 40, mp: 30, vit: 4 }, d: '들고 있으면 주변이 조금 밝아진다.' , lvReq: 10 },
  charm_hawk:   { n: '매눈 부적', i: '🪶', type: 'acc', b: { crit: 7, dex: 5 }, d: '늑대들 사이에서도 유난히 눈이 밝던 것의 발톱.' , lvReq: 12 },
  ring_brand:   { n: '낙인의 고리', i: '💍', type: 'acc', b: { str: 7, crit: 6 }, d: '재의 골렘 가슴팍에 박혀 있던 것.' , lvReq: 20 },

  /* --- 유적 유물 --- */
  relic_frostpane:  { n: '서리 낀 창', i: '🪟', type: 'acc', b: { def: 12, vit: 4, frost: 1 },
                      d: '얼음 안에 갇힌 채로 아직 김이 서려 있다. 안쪽에서 누가 닦아 낸 자국이 있다.', lvReq: 10 },
  relic_sundial:    { n: '멈춘 해시계', i: '🕛', type: 'acc', b: { crit: 9, dex: 5, ms: 6 },
                      d: '바늘이 정오에 멈춰 있다. 별이 떨어진 시각이라고들 한다.', lvReq: 16 },
  relic_lastlamp:   { n: '마지막 안전등', i: '🏮', type: 'acc', b: { hp: 35, def: 4, hpreg: 2 },
                      d: '심지가 아직 남아 있다. 이걸 켜 둔 사람은 끝내 올라오지 못했다.', lvReq: 6 },
  relic_rotcore:    { n: '썩지 않은 심', i: '🫀', type: 'acc', b: { allStat: 7, lifesteal: 6, hp: 60 },
                      d: '둥지 한가운데에서 이것만 성했다. 부패가 이것을 피해 자랐다.', lvReq: 30 },
  relic_sporebell:  { n: '홀씨 방울', i: '🔔', type: 'acc', b: { mp: 55, int: 7, cdr: 8 },
                      d: '흔들면 소리 대신 홀씨가 난다. 굴 전체가 이 소리를 듣고 자랐다.', lvReq: 26 },
  relic_frostmark:  { n: '언 손자국', i: '🤍', type: 'acc', b: { vit: 5, hp: 45, frost: 1 },
                      d: '벽에 찍힌 손자국을 그대로 떠낸 것. 손가락이 넷뿐이다.', lvReq: 14 },
  relic_mazeeye:    { n: '길 잃지 않는 눈', i: '👁', type: 'acc', b: { dex: 6, ms: 9, crit: 5 },
                      d: '들여다보면 지나온 길이 비친다. 앞길은 비추지 않는다.', lvReq: 18 },
  relic_hollowseed: { n: '빈 씨앗', i: '🌑', type: 'acc', b: { int: 6, str: 6, critD: 30 },
                      d: '흔들어도 소리가 없다. 심으면 안 된다고 석판에 적혀 있었다.', lvReq: 22 },

  /* --- 유적의 맥박 --- */
  /* --- 장식 — 숲·동굴·유적의 장식을 **캐면 그 장식이 그대로** 나온다(deco: 1) — 사연: docs/code-history.md#h3 */
  deco_flower:     { n: '들꽃 포기', i: '🌼', type: 'block', tile: T.FLOWER, stack: 999, deco: 1 },
  deco_weed:       { n: '풀 포기', i: '🌱', type: 'block', tile: T.WEED, stack: 999, deco: 1 },
  deco_cactus:     { n: '작은 선인장', i: '🌵', type: 'block', tile: T.CACTUS, stack: 999, deco: 1 },
  deco_mushroom:   { n: '버섯 무리', i: '🍄', type: 'block', tile: T.MUSHROOM, stack: 999, deco: 1 },
  deco_fern:       { n: '고사리 포기', i: '🌿', type: 'block', tile: T.FERN, stack: 999, deco: 1 },
  deco_orchid:     { n: '밀림꽃 포기', i: '🌺', type: 'block', tile: T.ORCHID, stack: 999, deco: 1 },
  deco_glowcap:    { n: '발광 버섯 무리', i: '🍄', type: 'block', tile: T.GLOWCAP, stack: 999, deco: 1 },
  deco_vine:       { n: '덩굴 줄기', i: '🌿', type: 'block', tile: T.VINE, stack: 999, deco: 1 },
  deco_shell:      { n: '조개 껍데기', i: '🐚', type: 'block', tile: T.SEASHELL, stack: 999, deco: 1 },
  deco_sac:        { n: '알주머니 장식', i: '🫧', type: 'block', tile: T.BLIGHTSAC, stack: 999, deco: 1 },
  deco_bones:      { n: '뼈 더미', i: '🦴', type: 'block', tile: T.BONEHEAP, stack: 999, deco: 1 },
  deco_hyphae:     { n: '균사 발 장식', i: '🕸', type: 'block', tile: T.HYPHAE, stack: 999, deco: 1 },
  deco_canopic:    { n: '장기 단지', i: '🏺', type: 'block', tile: T.CANOPIC, stack: 999, deco: 1 },
  deco_tools:      { n: '버린 연장 더미', i: '🛠', type: 'block', tile: T.TOOLPILE, stack: 999, deco: 1 },
  deco_minelamp:   { n: '매단 갱등', i: '🏮', type: 'block', tile: T.MINELAMP, stack: 999, deco: 1 },
  deco_icebanner:  { n: '언 깃발', i: '🚩', type: 'block', tile: T.ICEBANNER, stack: 999, deco: 1 },
  deco_hangmoss:   { n: '늘어진 이끼', i: '🌿', type: 'block', tile: T.HANGMOSS, stack: 999, deco: 1 },
  deco_stalactite: { n: '종유석', i: '🪨', type: 'block', tile: T.STALACTITE, stack: 999, deco: 1 },
  deco_stalagmite: { n: '석순', i: '🪨', type: 'block', tile: T.STALAGMITE, stack: 999, deco: 1 },
  deco_geode:      { n: '수정 무리', i: '💎', type: 'block', tile: T.GEODE, stack: 999, deco: 1 },
  deco_mossstone:  { n: '이끼 낀 바위', i: '🪨', type: 'block', tile: T.MOSSSTONE, stack: 999, deco: 1 },
  deco_cattail:    { n: '부들', i: '🌾', type: 'block', tile: T.CATTAIL, stack: 999, deco: 1 },
  deco_pondweed:   { n: '물풀', i: '🌿', type: 'block', tile: T.PONDWEED, stack: 999, deco: 1 },
  deco_pebbles:    { n: '물가 조약돌', i: '🪨', type: 'block', tile: T.PEBBLES, stack: 999, deco: 1 },
  /* 동굴 이끼 — 이끼 굴의 늘어진 이끼에서만 난다. */
  cave_moss:     { n: '동굴 이끼', i: '🌿', type: 'mat', stack: 999, price: 40,
                   d: '빛이 안 드는 데서 물만 먹고 자랐다. 손에 쥐면 차갑고 축축하다.' },
  moss_poultice: { n: '이끼 찜질', i: '🩹', type: 'consum', use: { hp: 110, buff: 'well' }, cd: 8, stack: 20,
                   d: '체력 110 회복, 한동안 천천히 아문다. 동굴 이끼 넷을 찧어 만든다.' },
  pulse_shard: { n: '맥박 결정', i: '❤', type: 'mat', stack: 999, price: 900,
                 d: '깨어난 유적의 벽에서 떨어져 나온 것. 손바닥 위에서 아직 뛴다.' },
  tonic_hush:  { n: '고요의 물약', i: '🧪', type: 'consum', use: { pulse: -40 }, stack: 20,
                 d: '유적 안에서 마시면 맥박이 40 가라앉는다. 유적 밖에서는 아무 일도 없다.' },
  drum_pulse:  { n: '맥박 북', i: '🥁', type: 'consum', use: { pulse: 35 }, stack: 20,
                 d: '유적 안에서 두드리면 맥박이 35 오른다. 메아리를 부르려면 유적이 깨어 있어야 한다.' },
  seal_mine:    { n: '갱부의 인장', i: '⛏', type: 'acc', b: { hp: 45, def: 8, hpreg: 1 }, seal: 'mine', lvReq: 8,
                  d: '버려진 광산을 샅샅이 뒤진 표식. 어느 유적에서든 맥박이 4분의 1 느리게 오른다.' },
  seal_ice:     { n: '서리 인장', i: '❄', type: 'acc', b: { def: 12, vit: 5, frost: 1 }, seal: 'ice', lvReq: 12,
                  d: '얼음 던전을 샅샅이 뒤진 표식. 유적이 깨어나면(2단계부터) 몸이 얼음처럼 단단해진다.' },
  seal_pyramid: { n: '태양 인장', i: '☀', type: 'acc', b: { crit: 9, dex: 6, ms: 5 }, seal: 'pyramid', lvReq: 16,
                  d: '피라미드를 샅샅이 뒤진 표식. 맥박이 뛸 때 연 상자에 덤이 한 단계 더 얹힌다.' },
  seal_spore:   { n: '포자 인장', i: '🍄', type: 'acc', b: { int: 7, mp: 55, cdr: 6 }, seal: 'spore', lvReq: 24,
                  d: '포자 굴을 샅샅이 뒤진 표식. 유적 안에서 적을 쓰러뜨리면 맥박이 두 배로 가라앉는다.' },
  seal_blight:  { n: '부패 인장', i: '🩸', type: 'acc', b: { str: 8, lifesteal: 4, hp: 50 }, seal: 'blight', lvReq: 30,
                  d: '부패한 둥지를 샅샅이 뒤진 표식. 유적이 격노하면 피해가 20% 오른다.' },
  seal_abyss:   { n: '심해 인장', i: '🌊', type: 'acc', b: { allStat: 6, hp: 70, oxyMax: 3 }, seal: 'abyss', lvReq: 34,
                  d: '가라앉은 유적을 샅샅이 뒤진 표식. 메아리 시련의 보상이 절반 더 나온다.' },

  /* --- 유적 위치 지도 --- */
  ruinmap_ice:    { n: '얼어붙은 골짜기 지도', i: '🗺', type: 'map', ruin: 'ice', stack: 1,
                    d: '가죽에 그린 골짜기 지도. 한 지점에만 구멍이 뚫려 있다.' },
  ruinmap_spore:  { n: '포자 굴 지도', i: '🗺', type: 'map', ruin: 'spore', stack: 1,
                    d: '지도라기보다 냄새의 기록이다. 짙은 쪽으로 가면 된다고 적혀 있다.' },
  ruinmap_blight: { n: '둥지 지도', i: '🗺', type: 'map', ruin: 'blight', stack: 1,
                    d: '그린 사람이 도중에 손을 떨었다. 동쪽 끝에서 선이 끊긴다.' },

  /* === 2부: 하늘 섬 / 숨겨진 유적 === */
  sword_aether: { n: '에테르 검', i: '⚔', type: 'weapon', wc: 'melee', dmg: 150, spd: 2.5, kb: 6, reach: 58, tier: 7, d: '무게가 느껴지지 않는다. 손이 아니라 바람이 든 것 같다.'  },
  bow_gale:     { n: '질풍궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 90, spd: 3.0, kb: 3, tier: 7, proj: 'star', multi: 3, d: '구름 위에서는 화살이 떨어지지 않는다.'  },
  staff_storm:  { n: '뇌운의 홀', i: '🔮', type: 'weapon', wc: 'magic', dmg: 132, spd: 2.3, kb: 4, mana: 15, tier: 7, proj: 'bolt', multi: 3, d: '천둥은 늘 한 박자 늦게 온다.'  },
  sword_first:  { n: '최초의 빛', i: '⚔', type: 'weapon', wc: 'melee', dmg: 210, spd: 2.2, kb: 10, reach: 70, tier: 8, fire: 3, lifesteal: 6, d: '별이 처음 떨어지기 전에 벼려진 것.'  },
  helm_aether:  { n: '에테르 관', i: '👑', type: 'armor', slot: 'helm', def: 34, b: { mp: 90, int: 10, cdr: 14 } , lvReq: 36 },
  chest_aether: { n: '창공의 흉갑', i: '🛡', type: 'armor', slot: 'chest', def: 46, b: { hp: 150, allStat: 8 } , lvReq: 36 },
  boots_aether: { n: '창공 보행자', i: '👟', type: 'armor', slot: 'boots', def: 26, b: { ms: 24, jump: 1, dex: 10 } , lvReq: 36 },
  charm_feather:{ n: '깃털 부적', i: '🪶', type: 'acc', b: { jump: 1, ms: 8, glide: 1 }, d: '떨어지는 동안 점프를 누르면 천천히 내려온다.' , lvReq: 28 },
  charm_rune:   { n: '룬 각인', i: '🔯', type: 'acc', b: { allStat: 10, cdr: 14, def: 12 }, d: '읽을 수 없는 문자가 계속 자리를 바꾼다.' , lvReq: 32 },
  charm_zenith: { n: '창공의 목걸이', i: '📿', type: 'acc', b: { allStat: 12, critD: 30, hp: 80 }, d: '바람 정령이 몸에 두르고 있던 것.' , lvReq: 36 },

  cloud_block:  { n: '구름 덩이', i: '☁', type: 'block', tile: T.CLOUD, stack: 999 },
  skystone:     { n: '하늘돌', i: '🪨', type: 'block', tile: T.SKYSTONE, stack: 999 },
  ruin_brick:   { n: '유적 벽돌', i: '🧱', type: 'block', tile: T.RUINBRICK, stack: 999 },
  aether_shard: { n: '에테르 파편', i: '💠', type: 'mat', stack: 999 },
  sky_feather:  { n: '하늘 깃털', i: '🪶', type: 'mat', stack: 999 },
  /* 하늘 섬에서만 — 쓰임은 다음 판. 폭풍 호박은 큰 섬 굴·신전 상자, 구름 진주는 지킴이 상자·구름 해파리 */
  storm_amber:  { n: '폭풍 호박', i: '🟠', type: 'mat', stack: 999,
    d: '번개가 구름 수액을 한순간에 굳힌 덩이. 속에 갇힌 번개가 아직 희미하게 꺾인다.' },
  cloud_pearl:  { n: '구름 진주', i: '⚪', type: 'mat', stack: 999,
    d: '구름 해파리 속에서 자란다. 손에 쥐면 무게가 없는 것처럼 떠오르려 한다.' },
  rune_frag:    { n: '룬 조각', i: '🔹', type: 'mat', stack: 9, d: '세 유적의 석판에서 하나씩 나온다.' },
  ruin_key:     { n: '유적의 열쇠', i: '🗝', type: 'mat', stack: 9, d: '심층 유적의 봉인문을 연다.' },

  /* --- 종장 --- */
  charm_dawn:   { n: '여명의 인장', i: '🌅', type: 'acc', b: { allStat: 14, cdr: 18, def: 18, hp: 120, lifesteal: 5 }, d: '잿빛이 걷힌 첫 아침의 빛을 굳혀 만들었다.' , lvReq: 34 },
  star_whole:   { n: '되맞춘 별', i: '🌟', type: 'mat', stack: 9, d: '다섯 조각이 서로를 붙들고 있다. 손바닥이 계속 뜨겁다.' },

  sum_storm:    { n: '폭풍의 뿔피리', i: '📯', type: 'summon', boss: 'storm_warden', stack: 9, d: '하늘 섬 위에서만 소리가 난다.' },
  sum_keeper:   { n: '봉인의 인장', i: '🗝', type: 'summon', boss: 'first_keeper', stack: 9, d: '유적 가장 깊은 곳에서 사용하라.' },
  sum_pursuer:  { n: '되맞춘 별의 부름', i: '🌌', type: 'summon', boss: 'pursuer', stack: 9, d: '높이 들면, 쫓아오던 것이 마침내 방향을 안다.' },

  /* --- 지하 공창 --- */
  steel_plate:    { n: '강철판', i: '🔩', type: 'block', tile: T.STEELPLATE, stack: 999 },
  power_core:     { n: '동력석', i: '🔆', type: 'mat', stack: 999, d: '아직 따뜻하다. 몇백 년째 식지 않고 있다.' },
  conduit_part:   { n: '동력관 조각', i: '🧵', type: 'mat', stack: 999, d: '안쪽에서 무언가가 계속 흐른다.' },
  blueprint_frag: { n: '설계도 조각', i: '📐', type: 'mat', stack: 99, d: '읽을 수는 있는데, 만드는 법이 아니라 만들게 하는 법이 적혀 있다.' },
  blueprint_core: { n: '공창의 설계 핵', i: '📀', type: 'mat', stack: 9, d: '『인력을 쓰지 마라. 그것이 우리가 배운 전부다.』' },
  gear_basic:     { n: '톱니바퀴', i: '⚙', type: 'mat', stack: 999, d: '맞물릴 상대만 있으면 언제든 다시 돈다.' },
  pick_drill:     { n: '시추 곡괭이', i: '🪛', type: 'tool', power: 4, spd: 2.6, dmg: 46, d: '손잡이가 스스로 떤다. 아직은 손으로 잡아야 한다.' , lvReq: 20},

  /* ================= 공장 ================= */
  /* --- 동력 자원 · 중간재 --- */
  coal:          { n: '석탄', i: '⚫', type: 'mat', stack: 999, d: '어디서나 나온다. 오래 타지는 않는다.' },
  lead_ore:      { n: '납 원석', i: '🔘', type: 'mat', stack: 999 },
  lead_bar:      { n: '납 주괴', i: '⬛', type: 'mat', stack: 999, d: '무겁고 무르다. 전지를 만들려면 이게 있어야 한다.' },
  crude_oil:     { n: '원유', i: '🛢', type: 'mat', stack: 999, d: '사구 아래 유혈암에서만 나온다. 그대로 태우기엔 아깝다.' },
  refined_oil:   { n: '정제유', i: '🧴', type: 'mat', stack: 999, d: '석탄 예닐곱 덩이 몫을 혼자 해낸다.' },
  polymer:       { n: '합성수지', i: '🧬', type: 'mat', stack: 999, d: '원유를 정제할 때 같이 나온다. 녹지도 얼지도 않는다.' },
  fuel_brick:    { n: '압축 연료', i: '🧱', type: 'mat', stack: 999, d: '석탄 다섯 덩이를 벽돌 하나로 눌러 담았다.' },
  wire:          { n: '전선', i: '🧵', type: 'mat', stack: 999 },
  circuit:       { n: '회로 기판', i: '🟩', type: 'mat', stack: 999, d: '얇은 금선이 미로처럼 깔려 있다.' },
  motor:         { n: '전동기', i: '🌀', type: 'mat', stack: 999, d: '전기를 주면 스스로 돈다. 멈추라고 하기 전까지.' },
  machine_frame: { n: '기계 골조', i: '🏗', type: 'mat', stack: 999, d: '큰 기계의 뼈대. 공장에서 쓰는 설비는 대부분 이 위에 짓는다.' },
  battery_empty: { n: '방전된 배터리', i: '🪫', type: 'mat', stack: 99, d: '축전지에 넣어 두면 다시 찬다.' },
  battery_cell:  { n: '충전된 배터리', i: '🔋', type: 'mat', stack: 99, d: '동력 장비의 전하가 바닥나면 자동으로 한 개씩 끼워 전하를 200 채운다. 전주 곁에 서 있으면 전력망에서도 찬다.' },
  rivet:         { n: '대갈못', i: '📌', type: 'mat', stack: 999, d: '자동 포탑이 이걸 쏜다.' },

  /* --- 기계 (우클릭으로 설치) --- */
  m_belt:      { n: '컨베이어 벨트', i: '➡', type: 'machine', mach: 'belt', stack: 999 },
  m_drill:     { n: '기계식 드릴', i: '🛠', type: 'machine', mach: 'drill', stack: 99 },
  m_drill_e:   { n: '전동 드릴', i: '⚒', type: 'machine', mach: 'drill_e', stack: 99 },
  m_pump:      { n: '시추 펌프', i: '🛢', type: 'machine', mach: 'pump', stack: 99 },
  m_smelter:   { n: '자동 용광로', i: '🏭', type: 'machine', mach: 'smelter', stack: 99 },
  m_press:     { n: '압축기', i: '🗜', type: 'machine', mach: 'press', stack: 99 },
  m_refinery:  { n: '정제기', i: '⚗', type: 'machine', mach: 'refinery', stack: 99 },
  m_assembler: { n: '조립기', i: '⚙', type: 'machine', mach: 'assembler', stack: 99 },
  m_crate:     { n: '수집 상자', i: '📦', type: 'machine', mach: 'crate', stack: 99 },
  m_gen:       { n: '화력 발전기', i: '🔥', type: 'machine', mach: 'gen', stack: 99 },
  m_battery:   { n: '축전지', i: '🔋', type: 'machine', mach: 'battery', stack: 99 },
  m_pole:      { n: '전주', i: '🗼', type: 'machine', mach: 'pole', stack: 999 },
  m_sorter:    { n: '분류기', i: '🔀', type: 'machine', mach: 'sorter', stack: 99 },
  m_turret:    { n: '자동 포탑', i: '🔫', type: 'machine', mach: 'turret', stack: 99 },
  m_trap:      { n: '전격 함정', i: '⚡', type: 'machine', mach: 'trap', stack: 99 },
  m_switch:    { n: '정지 스위치', i: '🛑', type: 'machine', mach: 'switch', stack: 99 },

  /* --- 손으로 놓는 설치물 (type:'station') --- */
  station_work:  { n: '작업대', i: '🔨', type: 'station', obj: 'workbench', stack: 20,
                   d: '어디든 펴면 그 자리가 작업장이 된다. 개조는 놓은 것마다 따로 쌓인다.' },
  station_forge: { n: '용광로', i: '🔥', type: 'station', obj: 'forge', stack: 20,
                   d: '벽돌을 쌓아 만든 화덕. 광석을 녹이려면 이게 있어야 한다.' },
  crate_wood:    { n: '저장 상자', i: '🧰', type: 'station', obj: 'crate', slots: 24, stack: 20,
                   d: '24칸. 벨트도 전력도 필요 없이 그냥 넣어 두는 상자다.' },
  crate_gold:    { n: '황금 저장 상자', i: '🧰', type: 'station', obj: 'crate', slots: 48, gold: 1, stack: 20,
                   d: '48칸. 금테를 두른 만큼 두 배로 들어간다.' },

  /* --- 문 (type:'door') --- */
  door_wood:     { n: '나무 문', i: '🚪', type: 'door', stack: 20,
                   d: '경첩은 다는 사람이 바라본 쪽에 붙는다. 그쪽으로 열린다.' },

  /* --- 동력 장비: 전하를 쓴다. 바닥나면 가방의 충전된 배터리를 한 개씩 자동으로 소모 --- */
  pick_arc:    { n: '아크 착암기', i: '🔌', type: 'tool', power: 5, dmg: 60, spd: 4.2, pw: 2.5,
                 d: '기반암 말고는 전부 뚫는다. 전하를 먹는다.' , lvReq: 20},
  saw_auto:    { n: '회전 톱날', i: '🪚', type: 'weapon', wc: 'melee', dmg: 74, spd: 5.2, kb: 2, reach: 40, tier: 5, pw: 1.6,
                 d: '멈추지 않는다. 손을 놓아도 한동안 돈다.'  },
  gun_rail:    { n: '레일 사수', i: '🔫', type: 'weapon', wc: 'ranged', dmg: 168, spd: 1.5, kb: 8, tier: 7, proj: 'star', pw: 6,
                 d: '탄이 아니라 전하를 쏜다. 벽 하나쯤은 세지 않는다.'  },
  helm_exo:    { n: '관측 바이저', i: '🥽', type: 'armor', slot: 'helm', def: 30, b: { crit: 8, dex: 6, mp: 40 } , lvReq: 30 },
  chest_exo:   { n: '동력 외골격', i: '🦾', type: 'armor', slot: 'chest', def: 42, b: { hp: 130, str: 8, def: 6 } , lvReq: 30 },
  boots_exo:   { n: '서보 각반', i: '🦿', type: 'armor', slot: 'boots', def: 24, b: { ms: 22, jump: 1, dex: 6 } , lvReq: 30 },
  charm_cap:   { n: '축전 부적', i: '🔆', type: 'acc', b: { charge: 220, cdr: 8, int: 5 },
                 d: '몸에 지닌 전하가 늘어난다. 동력 장비를 오래 쓸 수 있다.' , lvReq: 18 },
  charm_conduit:{ n: '도관 부적', i: '🔌', type: 'acc', b: { charge: 150, def: 10, hp: 60 },
                 d: '케이드가 시제품이라며 슬쩍 건네준 물건.' , lvReq: 30 },

  /* ================= 마을 ================= */
  /* --- 건축 블록 --- */
  thatch:     { n: '초가지붕', i: '🟨', type: 'block', tile: T.THATCH, stack: 999, d: '값싸고 따뜻하다. 불은 조심해야 한다.' },
  rooftile:   { n: '기와지붕', i: '🟥', type: 'block', tile: T.ROOFTILE, stack: 999, d: '한 번 얹으면 손자 대까지 간다.' },
  timberwall: { n: '목골벽', i: '🟫', type: 'block', tile: T.TIMBERWALL, stack: 999, d: '기둥 사이를 회반죽으로 메운 벽.' },
  wallstone:  { n: '성벽돌', i: '🧱', type: 'block', tile: T.WALLSTONE, stack: 999, d: '사람 키만 한 돌을 다듬어 쌓는다.' },
  battlement: { n: '흉벽', i: '🏰', type: 'block', tile: T.BATTLEMENT, stack: 999, d: '몸을 숨기고 내다볼 수 있게 이가 빠져 있다.' },
  window:     { n: '창문', i: '🪟', type: 'block', tile: T.WINDOW, stack: 999, d: '빛은 들이고 바람은 막는다.' },
  fence:      { n: '울타리', i: '🚧', type: 'block', tile: T.FENCE, stack: 999 },
  lamppost:   { n: '가로등', i: '🏮', type: 'block', tile: T.LAMPPOST, stack: 999, d: '밤에도 길이 보인다는 건 생각보다 큰 일이다.' },
  banner:     { n: '깃발', i: '🚩', type: 'block', tile: T.BANNER, stack: 999, d: '여명 마을의 문장.' },
  haybale:    { n: '건초더미', i: '🌾', type: 'block', tile: T.HAYBALE, stack: 999, d: '위로 떨어져도 다치지 않는다.' },
  sandbag:    { n: '모래주머니', i: '🟤', type: 'block', tile: T.SANDBAG, stack: 999, d: '급하게 쌓는 방벽.' },

  /* --- 농기구 · 씨앗 · 작물 --- */
  hoe_iron:   { n: '강철 괭이', i: '🛠', type: 'tool', power: 0, dmg: 8, spd: 2.0, hoe: 1,
                d: '흙이나 풀을 우클릭해 밭을 간다. 씨앗은 밭 위에 심는다.' , lvReq: 3},
  /* --- 낫 --- */
  scythe_iron:  { n: '강철 낫', i: '🌾', type: 'tool', power: 0, dmg: 14, spd: 2.4, scythe: 1,
                  d: '다 여문 작물을 이걸로 베어야 알곡이 성하게 남는다. 다른 연장으로 치면 다 으스러진다.', lvReq: 3 },
  scythe_star:  { n: '별무늬 낫', i: '🌾', type: 'tool', power: 0, dmg: 34, spd: 2.8, scythe: 1, reap: 1,
                  d: '날에 별가루를 먹였다. 벤 자리마다 한 번 더 여문 것이 딸려 온다.', lvReq: 16 },
  seed_wheat:    { n: '밀 씨앗', i: '🌱', type: 'seed', stack: 999, d: '밭에 우클릭해 심는다.' },
  seed_starroot: { n: '별무 씨앗', i: '🌱', type: 'seed', stack: 999, d: '떨어진 별 근처에서만 돋던 뿌리채소다.' },
  seed_ashcap:   { n: '잿버섯 홀씨', i: '🌱', type: 'seed', stack: 999, d: '어두운 곳에서도 잘 자란다.' },
  /* --- 전리품으로만 씨를 얻는 작물 넷 --- */
  seed_bloodbean: { n: '핏빛 콩 씨앗', i: '🌱', type: 'seed', stack: 999, d: '슬라임 젤을 굳혀 뭉친 씨. 젤 냄새가 난다.' },
  seed_bonebloom: { n: '뼈꽃 씨앗', i: '🌱', type: 'seed', stack: 999, d: '뼛가루를 뭉쳤더니 싹이 텄다. 왜 그런지는 아무도 모른다.' },
  seed_frostherb: { n: '서리쑥 씨앗', i: '🌱', type: 'seed', stack: 999, d: '심은 자리 흙이 하얗게 언다.' },
  seed_emberpod: { n: '불씨 꼬투리 씨앗', i: '🌱', type: 'seed', stack: 999, d: '만지면 미지근하다. 물을 주면 김이 오른다.' },
  wheat:      { n: '밀', i: '🌾', type: 'mat', stack: 999 },
  starroot:   { n: '별무', i: '🥕', type: 'mat', stack: 999, d: '자른 단면이 희미하게 빛난다.' },
  bloodbean:  { n: '핏빛 콩', i: '🫘', type: 'mat', stack: 999, d: '삶으면 국물이 붉어진다. 맛은 의외로 담백하다.' },
  bonebloom:  { n: '뼈꽃', i: '🤍', type: 'mat', stack: 999, d: '꽃잎이 뼈처럼 희고 단단하다. 갈면 약이 된다.' },
  frostherb:  { n: '서리쑥', i: '🌿', type: 'mat', stack: 999, d: '한여름에 뜯어도 손이 시리다.' },
  emberpod:   { n: '불씨 꼬투리', i: '🔥', type: 'mat', stack: 999, d: '까면 안에서 아직 타고 있는 알갱이가 나온다.' },
  flour:      { n: '밀가루', i: '🥛', type: 'mat', stack: 999 },
  fertilizer: { n: '퇴비', i: '🪵', type: 'seed', fert: 1, stack: 999, d: '작물에 우클릭하면 한 단계 자란다.' },

  /* --- 음식: 한 번에 한 가지만 유지된다 (새로 먹으면 이전 것이 사라진다) --- */
  food_bread: { n: '갓 구운 빵', i: '🍞', type: 'consum', use: { hp: 50, buff: 'fed_bread' }, cd: 4, stack: 30, d: '5분간 생명 재생과 체력이 오른다.' },
  food_pie:   { n: '고기 파이', i: '🥧', type: 'consum', use: { hp: 90, buff: 'fed_pie' }, cd: 4, stack: 30, d: '5분간 힘과 피해가 오른다.' },
  food_mstew: { n: '버섯 스튜', i: '🍲', type: 'consum', use: { mp: 60, buff: 'fed_stew' }, cd: 4, stack: 30, d: '5분간 마나 재생과 지능이 오른다.' },
  food_soup:  { n: '별무 수프', i: '🥣', type: 'consum', use: { hp: 70, buff: 'fed_soup' }, cd: 4, stack: 30, d: '5분간 방어가 크게 오른다.' },
  food_tea:   { n: '들꽃차', i: '🍵', type: 'consum', use: { mp: 40, buff: 'fed_tea' }, cd: 4, stack: 30, d: '5분간 재사용 대기가 줄어든다.' },
  food_jelly: { n: '선인장 젤리', i: '🍮', type: 'consum', use: { hp: 40, buff: 'fed_jelly' }, cd: 4, stack: 30, d: '5분간 이동 속도와 민첩이 오른다.' },
  food_feast: { n: '잔칫상', i: '🍱', type: 'consum', use: { hp: 200, mp: 120, buff: 'fed_feast' }, cd: 6, stack: 9,
                d: '10분간 모든 능력치가 오른다. 마을이 살아 있다는 증거다.' },

  /* --- 마을 기계 --- */
  m_windmill: { n: '풍차', i: '🌬', type: 'machine', mach: 'windmill', stack: 99 },
  m_mill:     { n: '밀링기', i: '⚙', type: 'machine', mach: 'mill', stack: 99 },
  m_oven:     { n: '화덕', i: '🔥', type: 'machine', mach: 'oven', stack: 99 },
  /* --- 유적 --- */
  icebrick:   { n: '얼음 벽돌', i: '🧊', type: 'block', tile: T.ICEBRICK, stack: 999 },
  sandbrick:  { n: '사암 벽돌', i: '🟨', type: 'block', tile: T.SANDBRICK, stack: 999 },
  m_dart:     { n: '화살 발사기', i: '🎯', type: 'machine', mach: 'dart', stack: 99 },
  m_flame:    { n: '화염 분사구', i: '🔥', type: 'machine', mach: 'flamejet', stack: 99 },
  m_frost:    { n: '서리 분사구', i: '❄', type: 'machine', mach: 'frostjet', stack: 99 },
  /* --- 4단계 설비 --- */
  m_pressor:  { n: '가압기', i: '🗜', type: 'machine', mach: 'pressor', stack: 99 },
  m_desal:    { n: '염수 증류기', i: '💧', type: 'machine', mach: 'desal', stack: 99 },
  m_belt_f:   { n: '고속 컨베이어 벨트', i: '⏩', type: 'machine', mach: 'belt_fast', stack: 999 },
  m_battery_hi:{ n: '강화 축전지', i: '🔋', type: 'machine', mach: 'battery_hi', stack: 99 },
  m_drill_x:  { n: '심층 드릴', i: '⛏', type: 'machine', mach: 'drill_x', stack: 99 },
  /* 미니보스 전리품 */
  frozen_core:{ n: '얼어붙은 핵', i: '🔷', type: 'mat', stack: 99 },
  sun_disc:   { n: '태양 원반', i: '🌞', type: 'mat', stack: 99 },
  rust_gear:  { n: '녹슨 톱니', i: '⚙', type: 'mat', stack: 99 },
  blight_bile:{ n: '역병 담즙', i: '🟣', type: 'mat', stack: 99 },
  heartwood:  { n: '심재', i: '🪵', type: 'mat', stack: 99 },
  queen_spore:{ n: '여왕 포자', i: '🫧', type: 'mat', stack: 99 },
  /* 유적 보상 장비 */
  charm_delver:{ n: '탐굴자의 인장', i: '🗿', type: 'acc', b: { def: 14, hp: 55, ms: 8 },
                 d: '다섯 유적을 다 뒤진 자에게만 맞는 크기다.' , lvReq: 22 },

  /* ================= 폭주로 ================= */
  core_shard:  { n: '노심 파편', i: '🔶', type: 'mat', stack: 999, d: '아직 미지근하다. 손에 쥐면 맥박처럼 뛴다.' },
  sword_arc:   { n: '전격 세이버', i: '⚡', type: 'weapon', wc: 'melee', dmg: 152, spd: 2.6, kb: 9, reach: 54, tier: 7, pw: 3,
                 d: '증식체의 핵에서 뽑아낸 전류가 날을 타고 흐른다. 스치기만 해도 크게 튕겨 나간다.'  },
  stop_core:   { n: '정지 핵', i: '🛑', type: 'mat', stack: 9,
                 d: '『멈춰라』 하나만 아주 크게 적어 넣은 물건. 공창이 끝내 만들지 않은 것.' },
  hepha_heart: { n: '헤파의 심장', i: '🫀', type: 'mat', stack: 9, d: '멈춘 뒤에도 한참을 따뜻했다.' },
  charm_govern:{ n: '조속기', i: '⏱', type: 'acc', b: { allStat: 12, cdr: 16, def: 16, charge: 160 },
                 d: '너무 빨라지면 스스로 늦춘다. 그게 이 물건의 전부다.' , lvReq: 34 },
  hammer_still:{ n: '정지의 망치', i: '🔨', type: 'weapon', wc: 'melee', dmg: 196, spd: 1.6, kb: 14, reach: 68, tier: 8, pw: 4,
                 d: '맞은 것은 잠시 아무것도 하지 못한다. 부수는 무기가 아니라 멈추는 무기다.'  },

  /* ================= 세션 2 종장: 설계실 ================= */
  archestone:  { n: '원형석', i: '🪨', type: 'block', tile: T.ARCHESTONE, stack: 999,
                 d: '자른 자국이 없다. 처음부터 이 모양이었던 것처럼 생겼다.' },
  draft_glass: { n: '설계 유리', i: '🔷', type: 'mat', stack: 999,
                 d: '안쪽에 도면이 떠 있다. 무엇의 도면인지는 읽히지 않는다.' },
  proto_ash:   { n: '미완의 재', i: '🫧', type: 'mat', stack: 999,
                 d: '끝까지 조립되지 못한 것이 부서지면 이것만 남는다.' },
  atelier_key: { n: '설계실의 인장', i: '🔑', type: 'mat', stack: 9,
                 d: '헤파의 심장을 녹여 다시 굳혔다. 벽 너머로 들어가려면 벽이 만든 것이 필요했다.' },
  arche_core:  { n: '원형의 핵', i: '💠', type: 'mat', stack: 9,
                 d: '사람을 본떠 만든 첫 번째 것의 한가운데. 아직도 사람처럼 미지근하다.' },
  /* 종장 보상 */
  /* 이 둘만 등급 표(WEAPON_TIER_LV)를 안 따르고 lvReq를 직접 갖는다 — 같은 8등급이어도 설계실에서 마지막 장에 나오는 물건이라, 8등급 기본값(44)으로는 한참
     헐거워진다. */
  blade_arche: { n: '원형의 칼', i: '⚔', type: 'weapon', wc: 'melee', dmg: 238, spd: 2.4, kb: 11, reach: 72, tier: 8,
                 lifesteal: 7, fire: 2, lvReq: 95,
                 d: '설계도에만 있고 한 번도 벼려진 적 없던 칼. 결국 우리가 처음으로 만들었다.'  },
  tome_origin: { n: '기원의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 127, spd: 2.5, kb: 5, mana: 16, tier: 8,
                 proj: 'soul', multi: 4, lvReq: 95,
                 d: '첫 장에 이렇게 적혀 있다 — 「이것을 읽는 너는 우리가 아니다. 그래도 괜찮다.」'  },
  charm_maker: { n: '만든 이의 표식', i: '🔯', type: 'acc', b: { allStat: 18, cdr: 20, def: 22, hp: 150, mpreg: 40 },
                 d: '무엇을 만들었느냐가 아니라, 멈출 줄 알았느냐를 적어 두는 표식.' , lvReq: 38 },

  /* ================= 특별 유적 ① 부유 성채 (하늘) ================= */
  orbit_plate: { n: '궤도판', i: '🔩', type: 'block', tile: T.ORBITPLATE, stack: 999,
                 d: '떠 있는 것을 떠 있게 하는 판. 손에 들면 아주 조금 가볍다.' },
  orbit_gear:  { n: '궤도 톱니', i: '⚙', type: 'mat', stack: 999,
                 d: '멈춘 적이 없는 톱니. 놓아두면 저 혼자 아주 느리게 돈다.' },
  void_lens:   { n: '공허 렌즈', i: '🔭', type: 'mat', stack: 99,
                 d: '이걸로 보면 별이 어디로 도망쳤는지가 보인다. 보고 나면 한동안 잠이 안 온다.' },
  star_ash:    { n: '별의 재', i: '✨', type: 'mat', stack: 99,
                 d: '한 번 하늘로 돌아갔다가 다시 떨어진 것에서만 나온다.' },
  lance_orbit: { n: '궤도창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 262, spd: 2.2, kb: 16, reach: 88, tier: 9,
                 d: '찌른 자리가 잠깐 위로 끌려 올라간다. 성채를 띄우던 힘을 창끝에 몰아넣었다.'  },
  bow_meridian:{ n: '자오선', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 120, spd: 3.2, kb: 4, tier: 9, proj: 'star', multi: 5,
                 d: '겨눈 곳이 아니라 겨눈 것이 지나갈 곳으로 날아간다.'  },
  charm_orbit: { n: '궤도 인장', i: '🛰', type: 'acc', b: { allStat: 16, jump: 1, ms: 20, cdr: 18, glide: 1 },
                 d: '떨어지는 것을 조금 늦춘다. 성채가 천 년을 떠 있던 방식 그대로.' , lvReq: 42 },

  /* ================= 특별 유적 ② 무너진 갱 (최심부) ================= */
  deep_stone:  { n: '심층암', i: '🪨', type: 'block', tile: T.DEEPROCK, stack: 999 },
  deep_alloy:  { n: '심층 합금', i: '🔗', type: 'mat', stack: 999,
                 d: '지옥보다 아래에서만 굳는다. 뜨겁지도 차갑지도 않은 게 오히려 불쾌하다.' },
  miner_tag:   { n: '광부의 표찰', i: '🏷', type: 'mat', stack: 99,
                 d: '이름이 긁혀 지워져 있다. 번호만 남았다 — 그것도 세 자리씩 세 번.' },
  gloom_pearl: { n: '어둠 진주', i: '⚫', type: 'mat', stack: 99,
                 d: '빛을 되쏘지 않는다. 들여다보면 눈이 초점을 잡지 못한다.' },
  drill_abyss: { n: '심연 착암기', i: '⛏', type: 'tool', power: 6, dmg: 96, spd: 4.6, pw: 3.2,
                 d: '기반암도 긁는다. 다만 긁을 뿐, 뚫리지는 않는다.' , lvReq: 40 },
  hammer_cave: { n: '갱도 붕괴추', i: '🔨', type: 'weapon', wc: 'melee', dmg: 288, spd: 1.3, kb: 20, reach: 62, tier: 9,
                 d: '한 번 휘두르면 천장이 먼저 놀란다.'  },
  charm_lamp2: { n: '꺼지지 않는 안전등', i: '🏮', type: 'acc', b: { hp: 180, def: 26, vit: 10, hpreg: 2 },
                 d: '마지막까지 켜져 있던 등. 든 사람은 끝내 올라오지 못했다.' , lvReq: 40 },

  /* ================= 제트팩 ================= */
  jetpack:     { n: '제트팩', i: '🚀', type: 'acc', b: { jet: 1, charge: 260, ms: 10 },
                 d: '점프를 누르고 있으면 떠오른다. 발밑에서 30칸까지, 한 번에 4초까지. 그 뒤엔 식혀야 한다.' , lvReq: 40 },

  /* ================= 무기 다양화 — 몬스터 전리품 위주로 검·활·마법서 계열을 늘렸다 ================= */
  spear_reed:    { n: '갈대 창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 14, spd: 2.6, kb: 2, reach: 58, tier: 1,
                   d: '찌르기 한 번으로 거리부터 벌린다.'  },
  mace_iron:     { n: '무쇠 철퇴', i: '🔨', type: 'weapon', wc: 'melee', dmg: 24, spd: 1.5, kb: 9, reach: 42, tier: 2,
                   d: '정교함 대신 무게로 해결한다.'  },
  dagger_frost:  { n: '서리 발톱', i: '🗡', type: 'weapon', wc: 'melee', dmg: 38, spd: 3.6, kb: 2, reach: 34, tier: 3, frost: 1,
                   d: '얼음 늑대의 발톱을 그대로 갈아 세웠다.'  },
  spear_venom:   { n: '독전갈의 창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 40, spd: 2.4, kb: 3, reach: 60, tier: 3, poison: 2,
                   d: '전갈의 독침을 창끝에 이었다.'  },
  mace_thorn:    { n: '가시 철퇴', i: '🔨', type: 'weapon', wc: 'melee', dmg: 56, spd: 1.6, kb: 10, reach: 44, tier: 4, poison: 1,
                   d: '내려칠 때마다 가시가 파고든다.'  },
  mace_lava:     { n: '용암 철퇴', i: '🔨', type: 'weapon', wc: 'melee', dmg: 98, spd: 1.5, kb: 13, reach: 46, tier: 5, fire: 3,
                   d: '식지 않는 쇳덩이를 통째로 매달았다.'  },
  dagger_void:   { n: '심연의 발톱', i: '🗡', type: 'weapon', wc: 'melee', dmg: 118, spd: 4.2, kb: 3, reach: 36, tier: 6, lifesteal: 8,
                   d: '벤 만큼 돌려받는다.'  },
  spear_storm:   { n: '돌풍의 창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 145, spd: 2.8, kb: 7, reach: 64, tier: 7,
                   d: '바람 정령의 깃털을 감아 만들었다. 던진 듯 빠르다.'  },
  mace_ruin:     { n: '유적 파쇄추', i: '🔨', type: 'weapon', wc: 'melee', dmg: 158, spd: 1.4, kb: 15, reach: 50, tier: 7,
                   d: '유적을 지키던 손이 마지막으로 남긴 것.'  },
  crossbow_bone: { n: '뼈 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 15, spd: 1.6, kb: 3, tier: 1, proj: 'arrow',
                   d: '뼈로 얼기설기 엮었지만 시위는 팽팽하다.'  },
  bow_venom:     { n: '독니 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 24, spd: 2.0, kb: 2, tier: 2, proj: 'arrow', poison: 2,
                   d: '화살에 독을 바를 필요가 없다. 활 자체가 독이다.'  },
  crossbow_iron: { n: '강철 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 40, spd: 1.4, kb: 5, tier: 3, proj: 'arrow',
                   d: '느리지만, 맞으면 반드시 넘어뜨린다.'  },
  bow_ash:       { n: '잿불 활', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 54, spd: 2.1, kb: 3, tier: 4, proj: 'arrow', fire: 2,
                   d: '시위를 놓으면 재가 흩날린다.'  },
  crossbow_mythril:{ n: '미스릴 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 92, spd: 1.3, kb: 9, tier: 5, proj: 'star',
                   d: '한 발, 한 발이 무겁다.'  },
  bow_void:      { n: '공허궁', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 104, spd: 2.3, kb: 3, tier: 6, proj: 'void',
                   d: '시위가 없다. 당기는 시늉만 해도 쏘아진다.'  },
  gun_scrap:     { n: '고철총', i: '🔫', type: 'weapon', wc: 'ranged', dmg: 140, spd: 1.8, kb: 6, tier: 7, proj: 'star', pw: 2,
                   d: '공창이 버린 총열에 손잡이만 새로 달았다.'  },
  crossbow_first:{ n: '최초의 쇠뇌', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 200, spd: 1.6, kb: 11, tier: 8, proj: 'star',
                   d: '최초의 파수꾼이 문 앞에 세워 두던 것.'  },
  orb_ember:     { n: '잉걸 구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 18, spd: 1.8, kb: 2, mana: 5, tier: 1, proj: 'fire',
                   d: '꺼지지 않는 잉걸 하나를 구슬에 가뒀다.'  },
  tome_bone:     { n: '백골의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 30, spd: 1.9, kb: 2, mana: 6, tier: 2, proj: 'soul',
                   d: '펼치면 죽은 이의 목소리가 들린다.'  },
  orb_venom:     { n: '독구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 42, spd: 1.8, kb: 2, mana: 7, tier: 3, proj: 'bolt', poison: 2,
                   d: '안개처럼 퍼지는 독을 구슬 안에 압축했다.'  },
  tome_ash:      { n: '재의 경전', i: '📖', type: 'weapon', wc: 'magic', dmg: 60, spd: 1.7, kb: 3, mana: 9, tier: 4, proj: 'fire',
                   d: '책장 사이에서 불씨가 새어 나온다.'  },
  orb_storm:     { n: '뇌구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 88, spd: 2.0, kb: 4, mana: 10, tier: 5, proj: 'bolt', multi: 2,
                   d: '쥐고 있으면 손끝이 저릿하다.'  },
  tome_void:     { n: '공허의 서', i: '📖', type: 'weapon', wc: 'magic', dmg: 112, spd: 2.1, kb: 3, mana: 13, tier: 6, proj: 'void',
                   d: '읽을수록 페이지가 사라진다.'  },
  orb_core:      { n: '노심 구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 138, spd: 2.2, kb: 4, mana: 14, tier: 7, proj: 'soul', multi: 2,
                   d: '증식체의 핵 조각이 아직도 맥동한다.'  },
  tome_first:    { n: '최초의 경전', i: '📖', type: 'weapon', wc: 'magic', dmg: 205, spd: 2.0, kb: 5, mana: 16, tier: 8, proj: 'void', multi: 3,
                   d: '처음 별이 떨어지던 밤을 기록한 유일한 책.'  },

  /* --- 바다 장비 --- */
  spear_tide:    { n: '조수의 삼지창', i: '🔱', type: 'weapon', wc: 'melee', dmg: 168, spd: 2.0, kb: 12, reach: 92, tier: 7,
                   d: '물살을 가르는 데 익숙한 모양이다. 뭍에서는 조금 무겁다.' },
  blade_shark:   { n: '상어이빨 검', i: '🗡', type: 'weapon', wc: 'melee', dmg: 152, spd: 2.4, kb: 8, reach: 62, tier: 7,
                   d: '이빨을 줄줄이 박아 넣었다. 빠지면 또 박으면 된다.' },
  bow_harpoon:   { n: '작살 사수', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 146, spd: 2.2, kb: 10, tier: 7, proj: 'arrow', pierce: 2,
                   d: '줄이 달려 있었지만 아무도 되감지 않는다.' },
  orb_abyss:     { n: '심연의 구슬', i: '🔮', type: 'weapon', wc: 'magic', dmg: 158, spd: 2.1, kb: 4, mana: 17, tier: 7, proj: 'frost', multi: 2,
                   d: '빛이 닿은 적 없는 곳의 물을 담았다.' },

  helm_diver:  { n: '잠수 투구', i: '🪖', type: 'armor', slot: 'helm', def: 22, b: { oxyMax: 20, vit: 4 }, lvReq: 26,
                 d: '숨을 오래 붙잡아 준다. 소리는 잘 안 들린다.' },
  chest_scale: { n: '비늘 갑옷', i: '🎽', type: 'armor', slot: 'chest', def: 34, b: { hp: 60, def: 6, oxyMax: 8 }, lvReq: 26 },
  boots_fin:   { n: '지느러미 각반', i: '🦶', type: 'armor', slot: 'boots', def: 18, b: { ms: 14, dex: 5, oxyMax: 6 }, lvReq: 26,
                 d: '물속에서는 걷는 것보다 미끄러지는 편이 빠르다.' },
  ring_pearl:  { n: '심연 진주 반지', i: '💍', type: 'acc', b: { oxyMax: 26, int: 6, mpreg: 15 }, lvReq: 28,
                 d: '숨이 짧아질수록 더 밝게 빛난다.' },
  charm_ink:   { n: '먹물 부적', i: '🖤', type: 'acc', b: { dashCd: 0.4, dashI: 90, crit: 6 }, lvReq: 28,
                 d: '한 번 사라졌다 나타나는 법을 문어에게 배웠다.' },

  /* --- 「윤슬」의 좌판에서만 나오는 것들 --- */
  amul_scale:  { n: '물비늘 목걸이', i: '📿', type: 'acc', b: { oxyMax: 18, ms: 8, def: 4 }, lvReq: 30,
                 d: '비늘을 한 장씩 꿰어 만들었다. 물속에서 숨이 조금 덜 급해진다.' },
  charm_bell:  { n: '가라앉은 종의 조각', i: '🔔', type: 'acc', b: { cdr: 10, mpreg: 20, int: 6 }, lvReq: 30,
                 d: '종에서 떨어져 나온 조각. 아직도 아주 작게 울린다.' },
  ring_deep:   { n: '깊은 잠의 반지', i: '💍', type: 'acc', b: { hp: 80, hpreg: 25, def: 8 }, lvReq: 30,
                 d: '깊은 데서는 잠들면 안 된다고들 한다. 이건 그 반대를 견디게 해 준다.' },
  sigil_current:{ n: '해류의 표식', i: '🌀', type: 'acc', b: { dashCd: 0.5, dashI: 110, dex: 7 }, lvReq: 30,
                 d: '물살이 어디로 가는지 아는 사람이 새긴 것.' },
  mace_bell:   { n: '가라앉은 종채', i: '🔨', type: 'weapon', wc: 'melee', dmg: 232, spd: 2.1, kb: 22, reach: 70, tier: 8,
                 d: '종을 치던 것. 한 번 휘두를 때마다 물이 먼저 울린다.' },
  harpoon_lamp:{ n: '등불 작살', i: '🏹', type: 'weapon', wc: 'ranged', dmg: 168, spd: 1.05, kb: 9, tier: 8, proj: 'star', pierce: 2, multi: 2,
                 d: '초롱을 매단 작살. 어두운 데서 쏘면 날아가는 길이 보인다.' },

  /* --- 시설 4단계 전용 --- */
  bag_abyss:   { n: '심해 짐가방', i: '🧳', type: 'bag', slots: 22, lvReq: 30,
                 d: '물이 안 새게 겹으로 여몄다. 안쪽이 바깥보다 넓은 건 유적 보관함에서 배웠다.' },
  pick_abyss:  { n: '가압 곡괭이', i: '⛏', type: 'tool', power: 5, dmg: 26, spd: 2.1, pw: 3,
                 d: '누르는 힘으로 캔다. 기반암 말고는 전부 부순다.', lvReq: 30 },
  hammer_tide: { n: '해일 망치', i: '🔨', type: 'weapon', wc: 'melee', dmg: 214, spd: 1.9, kb: 18, reach: 76, tier: 8,
                 d: '휘두르면 물이 먼저 간다. 뭍에서도 그렇다.' },
  gun_harpoon: { n: '연발 작살포', i: '🔫', type: 'weapon', wc: 'ranged', dmg: 178, spd: 2.2, kb: 8, tier: 8, proj: 'arrow', pierce: 3, pw: 5,
                 d: '되감을 줄을 아예 없앴다. 그만큼 빨리 나간다.' },
  tome_abyss:  { n: '심연의 서', i: '📘', type: 'weapon', wc: 'magic', dmg: 188, spd: 2.0, kb: 5, mana: 18, tier: 8, proj: 'void', multi: 3,
                 d: '빛이 닿은 적 없는 곳에도 글자가 있었다.' },
  chest_abyss: { n: '가압 갑주', i: '🛡', type: 'armor', slot: 'chest', def: 46, b: { hp: 90, def: 10, oxyMax: 16 }, lvReq: 32,
                 d: '깊은 물의 압력을 견디게 만든 것이라, 뭍에서 맞는 것쯤은 아무것도 아니다.' },
  charm_core:  { n: '노심 부적', i: '💠', type: 'acc', b: { charge: 320, cdr: 12, oxyMax: 12, int: 8 }, lvReq: 32,
                 d: '심해 노심 조각 하나를 그대로 달았다. 계속 미지근하다.' },

  /* ================= 바이옴 채집물 ================= */
  mud:         { n: '진흙', i: '🟫', type: 'block', tile: T.MUD, stack: 999 },
  fern_frond:  { n: '고사리 잎', i: '🌿', type: 'mat', stack: 999, d: '정글 바닥을 뒤덮고 있다. 짓이기면 진한 냄새가 난다.' },
  orchid:      { n: '밀림꽃', i: '🌺', type: 'mat', stack: 999, d: '어두울수록 더 선명하게 핀다.' },
  lily_pad:    { n: '수련잎', i: '🪷', type: 'mat', stack: 999, d: '폭포호 수면에 떠 있다.' },
  /* 나뭇잎 — 나무마다 다른 잎이 떨어진다(TILE_DEF leafDrop) — 사연: docs/code-history.md#h4 */
  leaf_oak:     { n: '떡갈잎', i: '🍂', type: 'mat', stack: 999, d: '잿빛 숲의 넓적한 잎. 잿가루가 앉아 있다.' },
  leaf_pine:    { n: '솔잎', i: '🌲', type: 'mat', stack: 999, d: '눈 속에서도 푸른 바늘잎. 송진 냄새가 난다.' },
  leaf_jungle:  { n: '정글 잎사귀', i: '🍃', type: 'mat', stack: 999, d: '손바닥 둘을 합친 것보다 넓다. 빗물이 고여 있다.' },
  leaf_corrupt: { n: '말린 부패 잎', i: '🍂', type: 'mat', stack: 999, d: '보랏빛으로 말려 들어간 잎. 만지면 손끝이 저리다.' },
  leaf_sky:     { n: '하늘 잎', i: '🍀', type: 'mat', stack: 999, d: '별 모양으로 갈라진 잎. 바람이 없어도 흔들린다.' },
  leaf_palm:    { n: '야자 잎사귀', i: '🌴', type: 'mat', stack: 999, d: '깃처럼 갈라진 긴 잎. 엮으면 지붕이 된다.' },
  /* --- 바다 재료 --- */
  crab_shell:  { n: '게딱지', i: '🦀', type: 'mat', stack: 999, d: '두껍고 가볍다. 갑옷 속대로 쓴다.' },
  shark_tooth: { n: '상어 이빨', i: '🦈', type: 'mat', stack: 999, d: '빠지고 또 나는 이빨. 아무리 갈아도 무뎌지지 않는다.' },
  ink_sac:     { n: '먹물주머니', i: '🖤', type: 'mat', stack: 999, d: '터뜨리면 물이 밤이 된다.' },
  jelly_lamp:  { n: '초롱 주머니', i: '🏮', type: 'mat', stack: 999, d: '물속에서 저 혼자 빛난다.' },
  abyss_pearl: { n: '심연 진주', i: '🔮', type: 'mat', stack: 999, d: '햇빛이 닿은 적 없는 것치고는 너무 밝다.' },
  kelp:        { n: '해초', i: '🌿', type: 'mat', stack: 999, d: '질기다. 엮으면 밧줄이 된다.' },
  rope_kelp:   { n: '해초 밧줄', i: '🪢', type: 'mat', stack: 999, d: '물에 젖어도 늘어지지 않는다.' },
  sea_salt:    { n: '바다 소금', i: '🧂', type: 'mat', stack: 999, d: '해저 모래를 졸이면 남는다.' },
  sulfur:      { n: '유황', i: '🟡', type: 'mat', stack: 999, d: '빙하와 해저 바위에 박혀 있다. 성냥을 그으면 안 된다.' },
  gunpowder:   { n: '화약', i: '💥', type: 'mat', stack: 999, d: '유황과 소금을 숯에 섞어 빻았다. 다루기 나름이다.' },
  /* --- 폭탄 --- */
  bomb_small:  { n: '폭탄', i: '💣', type: 'bomb', r: 3, dmg: 150, mine: 2, fuse: 1.6, look: 'iron', stack: 99,
                 d: '심지에 불을 붙여 던진다. 붙이고 나면 되돌릴 수 없다.' },
  bomb_big:    { n: '강력 폭탄', i: '🧨', type: 'bomb', r: 5, dmg: 340, mine: 3, fuse: 1.9, look: 'keg', stack: 99,
                 d: '화약을 두 배로 넣었다. 던지고 나서 뒤로 물러설 것.' },
  bomb_dig:    { n: '굴착 폭탄', i: '⛏', type: 'bomb', r: 7, dmg: 60, mine: 4, fuse: 1.4, look: 'stick', stack: 99,
                 d: '사람을 상하게 하려고 만든 게 아니다. 벽을 없애려고 만든 것이다.' },
  pressure_plate_m: { n: '내압판', i: '🛡', type: 'mat', stack: 999, d: '깊은 물의 압력을 견디도록 겹쳐 두른 판.' },
  abyss_core:  { n: '심해 노심', i: '💠', type: 'mat', stack: 99, d: '진주와 내압판을 함께 눌러 굳힌 것. 4단계 설비의 심장이다.' },
  tide_heart:  { n: '파수꾼의 심장', i: '🫀', type: 'mat', stack: 9, d: '물속에서도 식지 않았다.' },
  keeper_seal: { n: '지킴이의 봉인', i: '🔱', type: 'mat', stack: 9, d: '누가 무엇을 가두려던 것인지는 적혀 있지 않다.' },
  sum_tide:    { n: '가라앉은 종', i: '🔔', type: 'summon', boss: 'tide_warden', stack: 9, d: '해저에서 울려라. 물이 대신 대답한다.' },
  glowcap:     { n: '발광 버섯', i: '🍄', type: 'mat', stack: 999, d: '떼어내도 한동안 빛이 남아 있다.' },
  /* 새 바이옴 전리품 */
  vine_coil:   { n: '덩굴 타래', i: '🪢', type: 'mat', stack: 999 },
  spore_sac:   { n: '포자 주머니', i: '🫧', type: 'mat', stack: 999 },
  /* 새 요리 · 장비 */
  food_curry:  { n: '정글 카레', i: '🍛', type: 'consum', use: { hp: 110, buff: 'fed_curry' }, cd: 4, stack: 30, d: '5분간 화염 저항과 힘이 오른다.' },
  potion_glow: { n: '발광 물약', i: '🔦', type: 'consum', use: { buff: 'lit' }, cd: 4, stack: 20, d: '8분간 주변이 환해진다.' },
  potion_glow_greater: { n: '상급 발광 물약', i: '🔦', type: 'consum', use: { buff: 'lit_greater' }, cd: 4, stack: 20, d: '15분간 주변이 더 넓게 환해진다.' },
  charm_canopy:{ n: '수관의 부적', i: '🍃', type: 'acc', b: { ms: 14, jump: 1, dex: 6 }, d: '나뭇가지 사이를 뛰어다니던 것의 발톱.' , lvReq: 16 },
  charm_spore: { n: '포자 결정', i: '💠', type: 'acc', b: { mp: 45, mpreg: 30, int: 6 }, d: '손안에서 계속 숨 쉬듯 밝아졌다 어두워진다.' , lvReq: 16 },

  /* --- 소환 --- */
  sum_slime:   { n: '왕관 젤리', i: '👑', type: 'summon', boss: 'king_slime', stack: 9, d: '지상에서 사용하면 슬라임 왕이 온다.' },
  sum_bone:    { n: '저주받은 두개골', i: '💀', type: 'summon', boss: 'bone_lord', stack: 9, d: '깊은 곳에서만 반응한다.' },
  sum_heart:   { n: '고동치는 씨앗', i: '🫀', type: 'summon', boss: 'corrupt_heart', stack: 9, d: '부패한 땅에서 사용하라.' },
  sum_frost:   { n: '얼어붙은 왕관', i: '🔷', type: 'summon', boss: 'frost_witch', stack: 9, d: '서리 지대에서 사용하라.' },
  sum_void:    { n: '별의 눈물', i: '💧', type: 'summon', boss: 'void_king', stack: 9, d: '심연 앞에서만 열린다.' },

  /* ================= 유적마다 그곳에서만 나오는 전리품 둘 ================= */
  neverthaw:    { n: '식지 않는 서리', i: '🧊', type: 'mat', stack: 999, price: 340,
                  d: '얼음 던전 밖으로 꺼내도 녹지 않는다. 손에 쥐면 손이 먼저 식는다.' },
  warden_seal:  { n: '파수꾼의 인장', i: '🛡', type: 'mat', stack: 99, price: 5200,
                  d: '무엇을 지키라고 받은 것인지는 적혀 있지 않다. 지켰다는 것만 적혀 있다.' },
  sealed_ash:   { n: '봉인된 재', i: '🏺', type: 'mat', stack: 999, price: 520,
                  d: '단지 안의 재는 아직 따뜻하다. 봉을 뜯은 사람은 여태 없었다.' },
  caged_sun:    { n: '가둔 해', i: '🥇', type: 'mat', stack: 99, price: 9800,
                  d: '해를 새긴 게 아니라 해를 가둔 것이라고 벽에 적혀 있었다.' },
  deep_ember:   { n: '깊은 잉걸', i: '🔥', type: 'mat', stack: 999, price: 180,
                  d: '갱등에 남아 있던 불씨. 이 불은 갱도가 버려진 뒤에도 꺼지지 않았다.' },
  foreman_tag:  { n: '십장의 표찰', i: '🏷', type: 'mat', stack: 99, price: 2600,
                  d: '이름 자리가 긁혀 있다. 마지막까지 남은 사람이 지운 것이다.' },
  blight_spawn: { n: '부패한 알', i: '🥚', type: 'mat', stack: 999, price: 860,
                  d: '안에서 아직 무언가 움직인다. 오래 들고 있으면 손이 저리다.' },
  nest_crown:   { n: '둥지의 관', i: '👑', type: 'mat', stack: 99, price: 16000,
                  d: '뼈로 엮은 것인데, 사람의 것은 하나도 섞여 있지 않다.' },
  spore_dust:   { n: '포자 가루', i: '🍄', type: 'mat', stack: 999, price: 700,
                  d: '숨을 참고 담아야 한다. 숨을 쉬면 그때부터 내 안에서 자란다.' },
  cap_signet:   { n: '갓의 인장', i: '💍', type: 'mat', stack: 99, price: 12500,
                  d: '포자 굴에는 문이 없다. 그런데 여는 데 쓰는 물건이 있었다.' }
};

/* 유적 → 그곳에서만 나오는 전리품 [재료, 유물]. */
export const RUIN_LOOT = {
  ice: ['neverthaw', 'warden_seal'],
  pyramid: ['sealed_ash', 'caged_sun'],
  mine: ['deep_ember', 'foreman_tag'],
  blight: ['blight_spawn', 'nest_crown'],
  spore: ['spore_dust', 'cap_signet']
};

/* ★ 한 번 쏜 것이 **같은 적에게 겹쳐** 맞을 때, 두 번째부터의 몫. */
export const MULTI_FALLOFF = 0.35;

/* ================= 맞는 순간 — 물리 타격 계열 ================= */
export const HIT_FAM = {
  sword: 'slash', blade: 'slash', dagger: 'slash', scythe: 'slash', axe: 'slash', saw: 'slash',
  spear: 'pierce', lance: 'pierce', harpoon: 'pierce', bow: 'pierce', crossbow: 'pierce', gun: 'pierce',
  hammer: 'blunt', mace: 'blunt'
};
/* 계열마다 크기와 남는 시간이 다르다. */
export const HIT_FX = {
  slash: { size: 52, slow: 0.80 },
  pierce: { size: 52, slow: 0.90 },
  blunt: { size: 72, slow: 1.35 }
};

/** 이 무기로 때렸을 때 어느 타격 그림을 쓰는가. */
export function hitFam(it) {
  if (!it || !it.id) return null;
  const f = HIT_FAM[it.id.split('_')[0]];
  if (f) return f;
  // 규칙에 없는 이름이면 근접은 둔기로 친다 — 안 그리는 것보다 낫다
  const d = ITEMS[it.id];
  return d && d.type === 'weapon' && d.wc !== 'magic' ? 'blunt' : null;
}

/* ---------------- 제작 시설 ---------------- */
/* 설치물 규격 — 전부 한 타일(TS=22px) 안에 들어가야 한다 — 사연: docs/code-history.md#h6 */
/* tw/th = 실제로 차지하는 칸 수(충돌 판정용). */
export const OBJ_SIZE = {
  // 작업대는 낮고 넓은 상판이라 2×1(가로로 긴 모양)이 실물에 더 가깝다는 판단 — 나머지 둘은 2×2 그대로.
  workbench: { w: 40, h: 20, tw: 2, th: 1 },
  forge: { w: 40, h: 40, tw: 2, th: 2 },
  chest: { w: 18, h: 16 },
  crate: { w: 18, h: 16 }      // 플레이어가 놓는 저장 상자(아래 CRATE_KIND)
};

/* 4단계 추가 — 세션 3(바다) 재료로만 올릴 수 있다. */
export const STATION_NAME = {
  work: ['—', '작업대', '정밀 작업대', '자동 조립대', '심해 공작대'],
  forge: ['—', '용광로', '고로', '아크 용광로', '가압 제련로']
};
export const STATION_DESC = {
  work: ['', '판자와 못으로 되는 것들.', '치수를 재고 깎는다. 부품이 나오기 시작한다.', '설계 핵을 얹었다. 이제 기계를 만드는 기계를 만든다.',
         '심해 노심을 물려 압력으로 눌러 붙인다. 물속에서 쓸 것을 물 밖에서 만드는 자리다.'],
  forge: ['', '광석을 녹여 주괴로.', '풀무를 걸었다. 강철판이 나온다.', '전기로 녹인다. 이제 공장처럼 돌린다.',
          '노를 통째로 가압해 녹인다. 소금과 진주까지 재료가 된다.']
};
/* STATION_UP[종류][현재레벨] = 다음 레벨로 올리는 비용 4단계는 **세션 3 재료(심해 노심)를 요구한다** — 바다에 들어가 보지 않으면 못 올린다. */
export const STATION_UP = {
  work: [null,
    { need: { plank: 40, iron_bar: 14, gear_basic: 8 } },
    { need: { steel_plate: 30, circuit: 12, motor: 6 } },
    { need: { machine_frame: 6, abyss_core: 4, pressure_plate_m: 20, abyss_pearl: 6 } }],
  forge: [null,
    { need: { brick: 60, iron_bar: 20, coal: 40 } },
    { need: { steel_plate: 40, circuit: 14, power_core: 8 } },
    { need: { machine_frame: 8, abyss_core: 5, sea_salt: 40, mythril_bar: 12 } }]
};
