# tools/ — 도구 목록

게임은 `game/` 만으로 돈다. 여기 것은 굽고 · 재고 · 묶는 도구이고, **원본 그림은 `tools/art/`** 에 있다
(게임 폴더의 산출물을 도구에 다시 먹이지 말 것 — 두 번 늘어난다). 파이썬 도구는 Pillow 만 쓴다.

## 빌드 · 개발

| 도구 | 하는 일 |
|---|---|
| `bundle.mjs` | `src/game/main.ts` → `game/js/ashfall.js`(+소스맵) · `--check` · `--watch` |
| `dev.mjs` | `npm run dev` — 고치면 다시 묶고 `game/` 을 정적 서버로 |
| `build.sh` · `mkzip.py` | 배포 zip(Windows·macOS) + `SHA256SUMS.txt` → `dist/` (재현 가능) |
| `build-site.sh` | `game/` → `site/play/` 복사 + 매니페스트 검사 |
| `sync-manifest.py` · `.mjs` | `assets/manifest.json` → `sprites-manifest.js` (`--check`) |
| `i18n.mjs` · `site-i18n.mjs` | 게임 · 사이트 번역(`wrap` · `extract` · `build` · `check`) |
| `imports.mjs` · `srcmods.mjs` | `src/game` import 줄 다시 짜기 · 모듈 읽기(검사가 쓴다) |
| `split.mjs` · `split-switch.mjs` · `split-top.mjs` | 큰 객체 · switch · 최상위 표를 조각 모듈로 (글자 그대로 옮긴다) |

## 세계 진단

`sizediag.py`(크기별 구조물 겹침·세계 밖) · `ruindiag.py`(유적 통행) · `entdiag.py`(입구 발판 출처).

## 그림 굽기 — 원본이 바뀌면 다시 돌리고 `sync-manifest.py`

| 도구 | 산출물 |
|---|---|
| `mkplayer.py` | 주인공 시트 다섯(원본 `art/player_*.png`) — ★ 사용자 허락 없이 고치지 말 것 |
| `mknpc.py` · `mkanvil.py` · `mkfountain.py` | 상인 NPC · 강화 모루 · 분수대 |
| `mkdragons.py` | 드래곤 펫 4속성 × 4단계 |
| `mkruinmobs.py` · `mkarchetype.py` | 유적 고유 몹 · 원형 |
| `mkdeepdrill.py` · `mkflotsam.py` · `mkskyitems.py` | 심층 드릴 · 바다 부유물 · 하늘 섬 재료 |
| `mksky.py` · `mkclouds.py` · `mkforestbg.py` · `mksmoke.py` | 해·운석 · 먹구름 · 잿빛 숲 원경 · 굴뚝 연기 |
| `mkhitfx.py` · `mkhitphys.py` · `mkstarfx.py` | 마법 · 물리 타격 · 별 조각 효과 |
| `mklogo.py` · `mkkeyart.py` + `keyart-capture.mjs` | 로고(글꼴 윤곽 `art/fonts/` → 게임 PNG · 사이트 SVG)·파비콘 · 대표 그림(장면 찍기) |
| `shots-capture.mjs` | 사이트 스크린샷 `site/shots/*.jpg` |

## 그림 점검 · 손질 — 한 번 쓰고 끝난 것도 다시 쓸 일이 있어 둔다

점검: `animcheck.py`(프레임이 움직이나) · `framediff.py`(프레임 차이) · `clipcheck.py`(칸에 잘린 그림) ·
`straycheck.py`(떨어진 덩어리) · `orphan.py`(게임이 안 그리는 시트 → 매니페스트 `unused`).
손질: `unclipmob.py`(잘린 몹·보스에 여백 — 손대기 전 원본은 `art/boss/`) · `padframe.py` · `outline.py` ·
`stray.py` · `pixfix.py`(몇 픽셀 손으로).
