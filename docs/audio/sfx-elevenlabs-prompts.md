# 효과음 의뢰서 — ElevenLabs Sound Effects (2026-10-16 · H · I 는 v1.1.5, 2026-10-18 · J 2026-10-22 · 파일 일곱)

> v1.1.4 에서 새로 생긴 자리(스킬 · 보스 · 몬스터 기술 · 대사 · 줍기 · 버리기 · 공장)에 넣을 효과음 프롬프트.
> 옛 `talk` 효과음은 지웠다 — 말하는 쪽마다 넷으로 나뉜다(아래 B).

## 0. 공통 규칙 (먼저 읽을 것)

**생성 설정(ElevenLabs Sound Effects · `eleven_text_to_sound_v2`)**
- 프롬프트는 **영어**로, 표에 적힌 그대로 붙여 넣는다. 모든 프롬프트 끝에 공통 꼬리를 붙인다:
  `, dry, close-mic, no music, no voice, no reverb tail, clean start, game sound effect`
  (대사 효과음 B 와 루프 표시가 있는 것은 각 줄의 꼬리를 따른다.)
- `duration_seconds` · `prompt_influence` · `loop` 는 표의 값. 표에 없으면 길이 1.0 · 영향 0.6 · 루프 끔.
- 한 프롬프트로 **4개 생성** → 가장 짧고 앞이 깨끗한 것을 고른다. 첫 소리가 0.05초 안에 시작해야 한다(게임이 앞 무음을 `SFX_START` 로 건너뛰지만 길면 반 박자 늦게 들린다).

**파일로 넣기**
- MP3 · 44.1 kHz · 모노(또는 스테레오) · 128 kbps 이상.
- **1.0초로 자른다**(이 저장소의 효과음은 전부 1.0초 — `SfxLoop` 가 0.9초에 겹쳐 잇는다). 1.0초보다 짧으면 뒤를 무음으로 채운다.
  루프(🔁) 표시는 1.0초 안에서 앞뒤가 이어지게 — ElevenLabs `loop: true` 로 만든 뒤 1.0초 구간을 잘라 끝 10ms 를 크로스페이드.
- 이름은 **표의 파일 이름 그대로** → `play/assets/sound_effects/<파일>.mp3`.
- 크기 기준: 피크 −1 dBFS · 체감 음량은 기존 `sk_slash.mp3` · `mine.mp3` 와 비슷하게(작은 UI 소리는 그보다 −6 dB).

**연결 상태**: ✅ = 코드가 이미 그 이름을 부른다(지금은 합성 톤 — 파일을 넣고 `src/game/music.ts` `SFX_FILES` 에 한 줄 적으면 파일 소리로 바뀐다) · ⏳ = 파일이 들어오면 코드에 연결한다.
★ 파일이 없는 이름을 `SFX_FILES` 에 미리 적지 말 것 — 불러오다 404 가 나고 `npm run test:play` 의 콘솔 오류 검사가 멈춘다.

---

## A. 플레이어 스킬 — 지금 다른 스킬 소리를 빌려 쓰는 셋

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `sk_rain` | ⏳ | 유성 화살비 시전(지금은 화살 세례 소리) — 하늘로 쏘아 올린 화살 다발이 불붙어 멈춘다 | 1.0 · 0.6 | `a volley of arrows launched straight up into the sky, many bowstrings snapping at once, then a whooshing ignition as the arrowheads catch fire overhead` |
| `sk_meteor_cast` | ⏳ | 별의 낙하 시전(지금은 화염구 소리) — 하늘 높이 별이 부름에 응해 빛나기 시작 | 1.0 · 0.55 | `a distant celestial hum swelling upward, a high crystalline shimmer like a star waking up far above, ominous and building` |
| `sk_whirl_cast` | ⏳ | 회오리 검무 시작(지금은 광폭 베기 소리) — 칼을 쥐고 몸을 틀어 첫 바퀴 | 1.0 · 0.6 | `a heavy steel sword drawn in a fast full spin, rising metallic whoosh circling around the listener, ending in a sharp swish` |

## B. 대사 — 말하는 쪽마다 (옛 `talk` 대신)

대사는 **한 줄이 넘어갈 때마다 한 번** 난다. 말소리 자체가 아니라 "목소리의 결"을 알리는 짧은 소리다 — 사람 목소리 · 단어가 들리면 안 된다.

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트(꼬리 포함) |
|---|---|---|---|---|
| `talk_npc` | ✅ | 마을 사람 · 상인 대화 한 줄 | 0.5 · 0.7 | `a soft warm wooden tick followed by a tiny breathy murmur-like tone, friendly and gentle, like a page turning in a cozy room, very short, no words, no voice, dry, game UI sound` |
| `talk_story` | ✅ | 장 도입 · 마무리 이야기 한 줄(그림이 깔린 장면) | 0.9 · 0.6 | `a single low distant chime with a faint wind of ash drifting, solemn and cinematic, like turning a page of an old chronicle, no words, no voice, soft tail allowed, game UI sound` |
| `talk_lore` | ✅ | 비문 · 석판 · 봉인문 · 기억의 조각 · 귀환 비석 | 0.8 · 0.65 | `a stone tablet resonating with a faint ancient glow, low gritty stone scrape with a hollow mystical hum, carved runes awakening, no words, no voice, dry, game UI sound` |
| `talk_player` | ✅ | 내가 고른 말("…" 선택지)을 할 때 | 0.4 · 0.7 | `a short clear cloth rustle with a soft brief exhale, the hero speaking up, quiet and confident, no words, no voice, dry, game UI sound` |

## C. 줍기 · 버리기

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `pickup` | ✅ | 떨어진 물건을 주울 때(빛 구슬처럼 몸으로 빨려 든다 · 게임이 음높이를 ±6% 흔든다) | 0.4 · 0.7 | `a small glowing orb being absorbed into the body, quick bright rising sparkle with a soft pop at the end, magical pickup` |
| `trash` | ✅ | 가방에서 버리기(휴지통 · Shift+좌클릭) | 0.5 · 0.7 | `an item crumpling and falling into a metal bin, short paper and cloth crunch then a dull tin thud` |

## D. 보스 — 막 · 결계 · 치유 · 변신 (entity/boss-forms)

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `boss_shield_up` | ⏳ | 보스가 방어막을 두른다(막대에 파란 몫이 붙는 순간) | 1.0 · 0.6 | `a protective energy barrier forming around a giant creature, rising glassy shimmer with hexagonal crystal clicks locking into place` |
| `boss_shield_hit` | ⏳ | 방어막이 피해를 받을 때(자주 — 아주 짧게) | 0.3 · 0.75 | `a quick muffled glassy thunk against an energy shield, bright ripple` |
| `boss_shield_break` | ⏳ | 방어막이 깨진다 | 1.0 · 0.6 | `an energy shield shattering into glass shards, bright crash with tinkling fragments scattering` |
| `boss_ward_up` | ⏳ | 완전 결계가 선다(금빛 고리) | 1.0 · 0.6 | `a golden holy ward sealing shut, deep resonant bell strike with a ring of chimes locking one after another` |
| `boss_ward_hit` | ⏳ | 결계에 막힘("무효" — 고리 한 칸이 꺼짐) | 0.3 · 0.75 | `a short dull metallic clang deflected by a magic seal, one chime dying out` |
| `boss_ward_break` | ⏳ | 결계가 깨지고 보스가 크게 비틀거림 | 1.0 · 0.55 | `a massive golden seal cracking and bursting apart, heavy bell shatter followed by a stunned low groan of magic` |
| `boss_heal` 🔁 | ⏳ | 보스가 멈춰 서서 치유하는 동안(루프) | 1.0 · 0.5 · loop | `a slow pulsing organic healing hum, wet breathing vitality drawn inward, soft green magic swirling, seamless loop` |
| `boss_heal_break` | ⏳ | 치유가 끊겼다 | 0.7 · 0.65 | `a healing spell abruptly interrupted, choked magical whoosh cut off with a sharp crack` |
| `boss_takeoff` | ⏳ | 마디를 넘어 날아오른다(분사구 · 날개 · 물기둥 공통 — 몸이 뜨는 순간) | 1.0 · 0.55 | `a huge creature lifting off the ground, powerful downward gust and rumble rising into the air` |
| `boss_jets` 🔁 | ⏳ | 헤파 — 분사구로 떠 있는 동안 | 1.0 · 0.5 · loop | `steady roaring rocket thrusters of an ancient furnace machine, deep fiery hiss, seamless loop` |
| `boss_split` | ⏳ | 둘로 갈라진다(슬라임 왕 · 증식체 · 별을 쫓아온 것) | 1.0 · 0.55 | `a creature tearing itself into two halves, wet stretching rip followed by a heavy double thud as both land` |
| `boss_twin_down` | ⏳ | 갈라진 둘 중 하나가 먼저 쓰러질 때 | 1.0 · 0.6 | `one of two twin monsters collapsing, hollow thud and fading shriek while the other roars in anger` |

## E. 몬스터 고유 기술 (entity/enemy-kits — 바이옴 몹 아홉)

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `mob_crow_swoop` | ⏳ | 잿빛 까마귀 급강하 | 0.8 · 0.65 | `a large crow diving from above, sharp feather whoosh and a harsh caw at the end` |
| `mob_wolf_howl` | ⏳ | 얼음 늑대 무리 부르기 | 1.0 · 0.6 | `a lone wolf howl in icy wind, short and piercing, answered faintly by others` |
| `mob_scorpion_grab` | ⏳ | 전갈 집게로 붙잡기 | 0.6 · 0.7 | `chitin pincers snapping shut on armor, dry clicking claw grab` |
| `mob_ape_throw` | ⏳ | 수관 원숭이 열매 던지기 | 0.6 · 0.7 | `an ape grunting and hurling a heavy fruit, quick throw whoosh` |
| `mob_spore_puff` | ⏳ | 버섯 짐승 포자 뿜기 | 0.7 · 0.7 | `a mushroom creature puffing a cloud of spores, soft wet pop and powdery hiss` |
| `mob_root_burst` | ⏳ | 부패한 나무 뿌리 솟기 | 0.8 · 0.65 | `gnarled roots bursting up through soil, cracking wood and crumbling earth` |
| `mob_web_shot` | ⏳ | 거미줄 쏘기 | 0.5 · 0.7 | `a spider shooting a sticky web strand, quick wet thwip` |
| `mob_ink_squirt` | ⏳ | 심해 문어 먹물 | 0.6 · 0.7 | `an octopus squirting ink underwater, muffled bubbly gush` |
| `mob_lava_sizzle` | ⏳ | 용암 민달팽이 흔적(밟을 때) | 0.6 · 0.65 | `a hot lava trail sizzling under footsteps, crackling hiss` |

## F. 지속 피해 박자 (1초마다 한 번 — 숫자가 뜰 때)

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `dot_burn` | ⏳ | 불 · 화상 한 박자 | 0.3 · 0.75 | `a short sharp flame flare-up crackle, tiny burst of fire` |
| `dot_poison` | ⏳ | 독 한 박자 | 0.3 · 0.75 | `a small sickly wet bubble pop with a faint hiss` |

## G. 공장 — 더 풍부한 가동 소리 (지금은 `drill` · `beltmove` · `smelt` · `zap` · `power_on/off` 뿐)

공장은 기계가 여럿 동시에 돈다 — **짧고 또렷한 한 박자**와 **낮은 루프 바닥**을 나눠 만든다(루프는 기계 수만큼 겹쳐도 웅웅거리지 않게 음량을 낮게).

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `drill_mech` | ⏳ | 기계식 드릴(디젤 천공기)이 광맥을 한 번 칠 때 | 1.0 · 0.6 | `a diesel rock drill rig hammering into stone, rhythmic pneumatic percussion with engine chug underneath` |
| `drill_elec` | ⏳ | 전동 드릴(점보) | 1.0 · 0.6 | `an electric hydraulic jumbo drill boring into rock, high whirring motor and grinding bit` |
| `drill_deep` | ⏳ | 심층 드릴(시추탑) | 1.0 · 0.55 | `a deep drilling derrick, heavy rotary table grinding, drill string clanking deep underground` |
| `ore_crack` | ⏳ | 드릴이 광맥 한 칸을 다 캐서 무너질 때 | 0.8 · 0.65 | `a vein of ore cracking and collapsing into rubble, crunchy rock break` |
| `press_stamp` | ⏳ | 압착기 · 가압기 한 번 찍기 | 0.6 · 0.7 | `a heavy industrial press stamping metal, pneumatic hiss then a deep clank` |
| `assembler` | ⏳ | 조립기 한 개 완성 | 0.8 · 0.65 | `robotic arms assembling a part, quick servo whirs, ratchet clicks and a final latch` |
| `refinery` 🔁 | ⏳ | 정제기 · 증류기 가동 | 1.0 · 0.5 · loop | `a small oil refinery bubbling, liquid boiling in pipes with soft gurgles, seamless loop` |
| `smelter_roar` 🔁 | ⏳ | 자동 용광로 불(가동 중 루프) | 1.0 · 0.5 · loop | `a furnace fire roaring steadily inside brick walls, low blower whoosh, seamless loop` |
| `pour_metal` | ⏳ | 용광로가 쇳물을 틀에 부을 때 | 0.9 · 0.65 | `molten metal pouring into a mold, thick sizzling flow and a steam hiss` |
| `generator` 🔁 | ⏳ | 발전기 가동 | 1.0 · 0.5 · loop | `a small combustion generator idling, steady mechanical thrum, seamless loop` |
| `windmill` 🔁 | ⏳ | 풍차 | 1.0 · 0.5 · loop | `a wooden windmill turning slowly, creaking gears and soft wind on the blades, seamless loop` |
| `pump` 🔁 | ⏳ | 시추 펌프 | 1.0 · 0.5 · loop | `a piston water pump cycling, rhythmic suction and gush, seamless loop` |
| `mill_grind` 🔁 | ⏳ | 제분기 | 1.0 · 0.5 · loop | `a stone mill grinding grain, rumbling stone on stone, seamless loop` |
| `battery_charge` | ⏳ | 축전지 충전이 한 칸 오를 때 | 0.5 · 0.7 | `an electric capacitor charging up, short rising electrical whine with a click` |
| `sprinkler` | ⏳ | 스프링클러가 아침에 물을 뿜을 때 | 1.0 · 0.6 | `a garden sprinkler spraying water in arcs, rhythmic ticking and splashing` |
| `belt_handoff` | ⏳ | 벨트에서 기계 · 상자로 물건이 넘어갈 때 | 0.3 · 0.75 | `a small item dropping onto a metal conveyor, light clack` |
| `gate_click` | ⏳ | 분기기 · 컨버터가 물건을 갈라 보낼 때 | 0.3 · 0.75 | `a mechanical sorting flap switching, crisp metal click` |
| `machine_break` | ⏳ | 기계 고장(드문 사건) | 1.0 · 0.6 | `a machine breaking down, grinding gears seizing, sputtering motor and a spring popping` |
| `wrench_fix` | ⏳ | 렌치로 고칠 때 | 0.8 · 0.65 | `a wrench tightening bolts on a machine, ratchet clicks then the motor restarting` |
| `factory_amb` 🔁 | ⏳ | 공장 둘레 환경음(기계가 여럿 돌 때 낮게) | 1.0 · 0.45 · loop | `a distant busy workshop ambience, layered soft machinery hum and faint clanks, seamless loop, low and unobtrusive` |

## H. 짐승 포효 — v1.1.5 (지금 `sk_shout` 하나를 사람 · 짐승이 같이 쓴다)

`sk_shout` 는 사람 함성이라 늑대 · 원숭이 · 괴물이 동료를 북돋을 때도 사람 목소리가 났다(사용자 2026-10-18).
`sk_shout` 는 **플레이어 전투 함성 · 사람 몹(작업반장 · 유적 경비)** 에만 남기고, 짐승은 아래 갈래로 나눈다.
같은 갈래 안에서 **둘씩** 만들어(`_1` · `_2`) 번갈아 튼다 — 무리가 한꺼번에 울 때 똑같은 소리가 겹치지 않게.

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `roar_wolf_1` · `_2` | ⏳ | 얼음 늑대 · 붉은 울음꾼 북돋우기 · 늑대 무리 부르기(`pack`) | 1.0 · 0.6 | `a wolf pack leader snarling then letting out a short rallying howl, raw animal throat, aggressive, no human voice` |
| `roar_ape_1` · `_2` | ⏳ | 수관 원숭이 북돋우기 | 0.9 · 0.65 | `a large ape hooting and chest-beating, rapid aggressive hoots rising into a shriek, primate, no human voice` |
| `roar_beast_1` · `_2` | ⏳ | 덩치 큰 짐승(곰 · 멧돼지 · 뿔짐승)의 위협 | 1.0 · 0.6 | `a huge bear-like beast roaring, deep guttural chest roar with spit and breath, close, no human voice` |
| `roar_reptile_1` · `_2` | ⏳ | 도마뱀 · 뱀 · 전갈 · 사막 짐승 | 0.9 · 0.65 | `a giant lizard hissing then bellowing, dry raspy reptile throat rattle, no human voice` |
| `roar_insect_1` · `_2` | ⏳ | 거미 · 벌레 · 포자 짐승 · 증식체 무리 | 0.8 · 0.7 | `a swarm-like giant insect screech, clicking mandibles and buzzing chitin shriek, no human voice` |
| `roar_bird_1` · `_2` | ⏳ | 까마귀 · 매 · 하늘 짐승 | 0.8 · 0.7 | `a large bird of prey screeching, sharp piercing raptor cry with wing flaps, no human voice` |
| `roar_deep_1` · `_2` | ⏳ | 심해 · 바다 괴물 | 1.0 · 0.6 | `a sea monster groaning underwater, deep muffled whale-like moan with bubbles, no human voice` |
| `roar_void_1` · `_2` | ⏳ | 공허 · 망령 · 유적 괴물 | 1.0 · 0.6 | `an otherworldly creature wailing, distorted hollow howl with ghostly echo layers, inhuman` |
| `roar_slime` | ⏳ | 슬라임 무리 | 0.6 · 0.7 | `a big slime gurgling angrily, wet bubbling blorp rising in pitch, cartoonish but heavy` |
| `boss_roar_beast` | ⏳ | 짐승 보스가 막을 넘길 때(울부짖으며 다음 막) | 1.0 · 0.55 | `a colossal monster roaring in rage, earth-shaking low roar with layered growls and debris rattling, no human voice` |
| `boss_roar_machine` | ⏳ | 기계 보스 막 넘김(관리자 · 헤파 · 원형 …) | 1.0 · 0.55 | `a giant war machine overloading, metal groan, hydraulic scream and a deep engine roar` |
| `boss_roar_spirit` | ⏳ | 정령 · 공허 보스 막 넘김(마녀 · 공허의 왕 · 쫓아온 것 …) | 1.0 · 0.55 | `a vast spirit entity shrieking, choir-like distorted wail swelling with a low rumble, inhuman` |

**연결 계획**: 몹마다 목소리 갈래 `voice`(data/enemies.ts — 표에 한 칸)를 달고, `sk_shout` 를 부르던 자리(mobskills `empower` · enemy-kits `pack`)가
`roar_<voice>_<1|2>` 를 고른다(없으면 `sk_shout`). 보스 막 넘김은 boss-forms 의 막 바뀜에서 `boss_roar_<갈래>`.

## I. 손맛 — v1.1.5 (때리고 · 캐고 · 얻는 순간을 더 또렷하게)

지금 비어 있거나 합성 톤인 자리 중 **매번 손에 닿는 것**부터. 맞히는 소리는 짧고 단단하게(0.3~0.5초), 앞 0.02초 안에 정점.

| 파일 | 상태 | 쓰는 곳 | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `hit_heavy` | ⏳ | 묵직한 무기(망치 · 도끼 · 대검)가 몹에 맞을 때 — 지금은 `hit_blunt` 하나 | 0.4 · 0.75 | `a heavy weapon smashing into a creature, deep meaty thump with a bone crack, punchy` |
| `kill_pop` | ⏳ | 몹이 쓰러지는 마지막 한 방(경험치 구슬이 튀는 순간) | 0.5 · 0.7 | `a satisfying final hit, short punchy impact with a bright rising sparkle burst` |
| `block_clang` | ⏳ | 방패 · 방어 자세로 막을 때 · 보스 방어 자세에 맞을 때 | 0.4 · 0.75 | `a sword hitting a raised steel shield, sharp metallic clang with a short ring` |
| `stagger_crack` | ⏳ | 보스 틈이 열릴 때(비틀거림 · 균열) | 0.7 · 0.65 | `armor plates cracking and a giant creature staggering, heavy crunch and a dull thud` |
| `miss_whiff` | ⏳ | 보스 헛손질(아무도 못 맞힘) | 0.6 · 0.7 | `a giant weapon swinging through empty air, huge heavy whoosh with no impact` |
| `land_heavy` | ⏳ | 높은 데서 떨어져 착지(낙하 피해 직전 높이부터) | 0.4 · 0.75 | `a person landing hard on stone from a height, boots thud and a grunt-free body impact, gravel scatter` |
| `step_grass` · `step_stone` · `step_sand` · `step_snow` · `step_wood` | ⏳ | 발밑 재질마다 걸음(지금은 `step` 하나) | 0.25 · 0.8 | `a single footstep on <grass/stone/sand/snow/wooden planks>, soft leather boot, close` |
| `ore_ping` | ⏳ | 광석 칸을 곡괭이로 칠 때 — 돌과 다른 맑은 쇳소리(`ore_hit` 위에 얹는다) | 0.3 · 0.75 | `a pickaxe striking a metal ore vein, bright metallic ping with rock chips` |
| `chest_open` | ⏳ | 상자 열기(지금 `open` 은 문과 같다) · 유적 상자는 낮게 | 0.8 · 0.65 | `a wooden treasure chest creaking open, latch click and a soft magical shimmer` |
| `loot_rare` | ⏳ | 희귀 이상 장비가 떨어질 때 · 손에 들어올 때 | 0.8 · 0.6 | `a rare item dropping, crystalline chime rising with a glittering sparkle tail` |
| `enhance_hit` | ⏳ | 모루 망치 세 박자 한 번 | 0.4 · 0.75 | `a blacksmith hammer striking glowing steel on an anvil, bright clang with sparks` |
| `enhance_ok` · `enhance_fail` · `enhance_break` | ⏳ | 강화 성공 · 실패 · 파괴 | 0.9 · 0.6 | 성공 `a triumphant metallic ring with a magical shine rising` · 실패 `a dull clank and a fizzling hiss of cooling steel` · 파괴 `a blade shattering into metal shards, harsh crack and scattering pieces` |
| `reel_tick` 🔁 | ⏳ | 낚시 겨루기 동안 릴 감기(게이지가 찰 때 빨라진다) | 1.0 · 0.5 · loop | `a fishing reel clicking as line is wound in, steady ratchet ticks, seamless loop` |
| `fish_bite` · `fish_land` | ⏳ | 입질(찌가 잠길 때) · 잡아 올렸을 때 | 0.5 · 0.7 | 입질 `a fishing float plunging underwater, quick plop and line tug` · 잡음 `a fish splashing out of water and flopping onto ground, wet slap` |
| `horse_gallop` 🔁 · `horse_neigh` | ⏳ | 말 달리기 · 탈 때 · 길들일 때 | 1.0 · 0.5 · loop / 0.9 · 0.6 | `horse hooves galloping on dirt, steady rhythm, seamless loop` · `a horse neighing briefly, friendly` |
| `cart_rail` 🔁 · `boat_paddle` | ⏳ | 광산 수레 레일 · 조각배 노 젓기 | 1.0 · 0.5 · loop / 0.6 · 0.7 | `a mine cart rolling on iron rails, rhythmic clacking, seamless loop` · `a wooden paddle dipping into water, gentle splash` |
| `jet_burn` 🔁 | ⏳ | 제트팩 분사 | 1.0 · 0.5 · loop | `a small jetpack thruster burning, steady roaring hiss, seamless loop` |
| `low_hp_beat` 🔁 | ⏳ | 체력 30% 아래 심장 박동(화면 붉어질 때 같이) | 1.0 · 0.5 · loop | `a slow heavy heartbeat, muffled and tense, seamless loop` |

---

## J. 축하 · 알림 — 파일 일곱 (v1.1.5 · 예전엔 열몇 자리가 `chapter` 하나를 같이 썼다)

코드는 자리마다 제 키(스물)를 이미 부른다 — 키는 아래 **파일 일곱**을 음높이 · 크기만 바꿔 나눠 쓴다(music.ts `SFX_FAM`, 지금은 `chapter` · `level` 을 빌림).
파일이 오면 `SFX_FILES` 에 `cele_*` 일곱을 적고 `SFX_FAM` 의 첫 칸을 그 파일로 바꾼다.
축하는 **끝이 열린 채로 1.0초 안에 잦아들게**(다음 소리와 겹쳐도 깨끗하게) · 음높이를 0.8~1.15배로 바꿔 써도 어색하지 않게 너무 높거나 낮지 않은 음역으로.

| 파일 | 상태 | 쓰는 키(음높이) | 길이 · 영향 | 프롬프트 |
|---|---|---|---|---|
| `cele_ach` | ⏳ | `ach`(1) · `ach_big` 어려운 업적(0.9) · `prof_perk` 숙련 특전(1.08) | 1.0 · 0.6 | `a short bright achievement fanfare, two rising bell notes and a brass sparkle swell` |
| `cele_story` | ⏳ | `story` 장 완료(1) · `ch_start` 새 장(0.84) · `village_up` 마을 단계(1.06) | 1.0 · 0.6 | `a warm resolving chord on harp and soft strings, a story chapter closing, gentle and hopeful` |
| `cele_find` | ⏳ | `discover` 숨은 굴 · 유적 자리 · 기억 조각(1) · `travel` 귀환(1.15) · `recover` 되찾기(0.95) | 1.0 · 0.6 | `a curious discovery sting, airy rising glissando on glass chimes, wonder` |
| `cele_treasure` | ⏳ | `rare_get` 귀한 물건 · 인장 · 물속 보물(1) · `ev_clear` 유적 사건을 해냄(0.9) | 1.0 · 0.6 | `a precious treasure obtained, crystalline sparkle burst over a warm low bell` |
| `cele_unseal` | ⏳ | `unseal` 봉인 · 퍼즐 · 궤도 닻 · 바치기(1) · `deep_open` 깊은 층(0.8) | 1.0 · 0.65 | `an ancient stone mechanism unlocking, heavy click and grind resolving into a soft magical hum` |
| `cele_warn` | ⏳ | `danger` 맥박 · 격노 · 유적 사건(1) · `seal_shut` 봉인 방이 닫힘(1.1) · `timestop` 시간 멈춤(0.8) | 1.0 · 0.65 | `an ominous warning pulse, deep heartbeat thud with a dissonant low swell, danger approaching` |
| `cele_grow` | ⏳ | `pet_up` 펫 레벨업(1.1) · `pet_evolve` 드래곤 단계(0.85) · `tame` 길들이기(1) · `rest` 잠 · 아침(0.8) | 1.0 · 0.6 | `a gentle growth chime, soft rising pluck notes with a warm creature-like purr undertone, friendly` |

## 넣은 뒤

1. 파일을 `play/assets/sound_effects/` 에 넣는다(이름 그대로).
2. ✅ 표시는 그대로 난다. ⏳ 표시는 연결이 필요하다 — "효과음 넣었음" 하고 알려 주면 `music.ts SFX_FILES` 와 각 자리(boss-forms · enemy-kits · factory/tick …)에 잇는다.
3. 확인: 브라우저 콘솔 `Sfx.play('<파일>')`.
