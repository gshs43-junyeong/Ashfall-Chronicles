# tools/ — 도구 목록

게임은 `play/` 만으로 돈다. 여기 것은 굽고 · 재고 · 묶는 도구이고, **원본 그림은 `tools/art/`** 에 있다
(게임 폴더의 산출물을 도구에 다시 먹이지 말 것 — 두 번 늘어난다). 파이썬 도구는 Pillow 만 쓴다.

## 빌드 · 개발

| 도구 | 하는 일 |
|---|---|
| `bundle.mjs` | `src/game/main.ts` → `play/js/ashfall.js`(+소스맵) · `--check` · `--watch` |
| `dev.mjs` | `npm run dev` — 고치면 다시 묶고 `play/` 를 정적 서버로 |
| `build.sh` · `mkzip.py` | 배포 zip(Windows·macOS) + `SHA256SUMS.txt` → `dist/` (재현 가능) |
| `build-site.sh` | `play/` → `site/play/` 복사 + 매니페스트 검사 |
| `sync-manifest.py` · `.mjs` | `assets/manifest.json` → `sprites-manifest.js` (`--check`) |
| `i18n.mjs` · `site-i18n.mjs` | 게임 · 사이트 번역(`wrap` · `extract` · `build` · `check`) |
| `imports.mjs` · `srcmods.mjs` | `src/game` import 줄 다시 짜기 · 모듈 읽기(검사가 쓴다) |
| `split.mjs` · `split-switch.mjs` · `split-top.mjs` | 큰 객체 · switch · 최상위 표를 조각 모듈로 (글자 그대로 옮긴다) |

## 세계 진단

`sizediag.py`(크기별 구조물 겹침·세계 밖) · `ruindiag.py`(유적 통행 · `ruindiag.py ent` 입구 발판 출처).

## 그림 굽기 — 원본이 바뀌면 다시 돌리고 `sync-manifest.py`

| 도구 | 산출물 |
|---|---|
| `mkplayer.py` | 주인공 시트 다섯(원본 `art/player_*.png`) — ★ 사용자 허락 없이 고치지 말 것 |
| `mknpc.py` `sheet` · `portrait` | 상인 걷는 시트 · 마을 NPC · 상인 초상(DESIGN.md '초상') |
| `mkpets.py` `dragons` · `idle` | 드래곤 펫 4속성 × 4단계 · 매 · 나방 · 공허의 유생 떠 있기 사이 장(원본 `art/pets/`) |
| `mkruinmobs.py` | 유적 고유 몹 열다섯 + 덩굴채찍(부위 명암 붓이 같은 파일에) |
| `mkbossart.py` | 키운 보스 열둘 · 모든 보스의 기술 자세 시트 |
| `mkdrills.py` · `mkflotsam.py` · `mkrides.py` | 드릴 셋 · 바다 부유물 · 탈 것 |
| `mkprops.py` `anvil` · `skyitems` · `clouds` · `fountain` · `glowcap` · `bubble` | 강화 모루 · 하늘 섬 재료 · 먹구름 · 분수대 · 발광 버섯 · 말풍선 |
| `mksky.py` · `mkparallax.py` | 해·운석 · 원경 전부(잿빛 숲 네 장 · 울림 정글 · 바이옴들) |
| `mkfx.py` `hit` · `phys` · `smoke` · `star` | 마법 · 물리 타격 · 굴뚝 연기 · 별 조각 효과 |
| `mkvfx.py` | 스킬 연출 결 그림 |
| `mkfont.py` (`diag` 한글 짜임 진단) | 게임 글꼴 Ashfall |
| `mklogo.py` (`appicon` 앱 아이콘만) · `mkkeyart.py` + `keyart-capture.mjs` | 로고 · 파비콘 · 앱 아이콘 · 대표 그림(장면 찍기) |
| `shots-capture.mjs` | 사이트 스크린샷 `site/shots/*.jpg` |

## 그림 점검 · 손질

`sprcheck.py` 하나에 하위 명령으로: `anim`(프레임이 정말 움직이나) · `clip`(칸 가장자리에 잘린 그림) · `stray`(몸에서 떨어진 덩어리) ·
`pad`(칸 벽에 닿은 그림에 좌우 여백). 찾기만 하고, 고치는 것은 `--write`.

여러 그림 도구를 묶은 파일(`mkfx` · `mkprops` · `mkpets` · `mknpc` · `sprcheck`)은 하위 명령 없이 돌리면 전부(`all`)를 돈다(`sprcheck` 는 하나를 고를 것).
하위 명령 본문은 예전 파일 그대로라, 묶은 뒤 다시 구운 그림이 바이트 단위로 같았다(2026-10-18).
