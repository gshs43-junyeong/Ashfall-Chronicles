# NOTICE — 무엇이 MIT 이고 무엇이 아닌가

`LICENSE` 의 MIT 허락은 이 저장소에서 만든 자료에 적용되며, AI/기계학습 모델의 훈련·미세 조정·평가 또는 개발과 그 목적의 학습 데이터 제작에는 사용할 수 없습니다. 예외는 **음악 · 효과음 · 글꼴**입니다. 음악과 효과음은 외부 서비스의 약관을 따르며, 글꼴은 SIL Open Font License 1.1 을 따릅니다.

`LICENSE` 에는 표준 MIT 허락에 더해 AI 학습 금지 제한이 명시되어 있습니다. 따라서 이 저장소의 MIT 적용 자료를 이용할 때는 그 제한도 따라야 합니다.

---

## MIT 로 쓸 수 있는 것 — 저작권은 gshs43-junyeong 에게 있습니다

| 무엇 | 어디 |
|---|---|
| 게임 코드 전부 | `play/js/**`, `play/index.html`, `play/css/**` |
| 그림 애셋 전부 | `play/assets/` 중 **아래 '예외' 표에 없는 모든 것** — 캐릭터·보스·NPC·타일·아이템·배경·UI |
| 절차 생성 그림 | `play/js/tileart.js` · `itemart.js` · `titlebg.js` 가 그려 내는 것 |
| 도구·빌드 | `tools/**`, `.github/workflows/**`, `launchers/**` |
| 사이트 | `site/**` (아래 '글꼴' 참고) |
| 문서 | `README.md`, `CLAUDE.md`, `NOTICE.md`, `docs/**` |

그림 애셋은 이 저장소를 위해 제작했고, 제작에는 **Claude Design** 을 썼습니다.
사 오거나 다른 곳에서 받아 온 그림은 없습니다.

## MIT 에서 **빠지는 것**

| 무엇 | 어디 | 어떻게 만들었나 |
|---|---|---|
| 배경음악 | `play/assets/bgm/*.mp3` | 원본 메타데이터와 각 음원 공급자의 이용 조건 |
| 효과음 92개 | `play/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |
| 게임 글꼴 Ashfall | `play/assets/fonts/ashfall-*.woff2` | MIT 제외. SIL Open Font License 1.1 — 아래 '글꼴' |
| 글꼴 원본 | `tools/art/fonts/` | 로고에 쓰는 Cinzel 원본과 OFL 전문(`OFL-Cinzel.txt`) |

효과음 폴더의 파일은 **그 서비스의 이용 약관을 따르고**, 글꼴 두 폴더는 **SIL OFL 1.1** 을 따릅니다(아래 '글꼴').

- 게임을 받아 즐기는 데에는 아무 제한이 없습니다.
- **소리 파일만 떼어다 다른 곳에 쓰거나 따로 배포하는 것**은 MIT 가 허락하는 범위가
  아닙니다. 해당 서비스의 약관을 직접 확인하세요.
- 저장소를 포크해 공개하거나 빌드한 zip 을 다시 배포할 때도, 이 두 폴더에 대해서는
  MIT 가 아니라 각 서비스의 약관이 기준입니다.

포크에서 소리를 바꾸고 싶다면 두 폴더를 비우고 자기 파일로 채우면 됩니다. 소리는
매니페스트를 타지 않고 `play/js/music.js` 가 경로를 직접 알고 있으므로, **같은 이름**으로
갈아 끼우면 그대로 돕니다. 효과음은 **1.0초** 길이를 지켜야 `SfxLoop` 가 끊김 없이
이어 붙입니다. 파일이 없는 효과음은 게임이 합성음으로 대신 내므로, 일부만 바꿔도 돕니다.

## 글꼴

- **게임 글꼴 Ashfall**(`play/assets/fonts/ashfall-*.woff2`)은 이 프로젝트가 직접 만든 글꼴입니다 — 다른 글꼴의 윤곽을 쓰지 않고
  `tools/mkfont.py` 가 획 뼈대(`tools/font/`)에서 모든 글자를 그립니다(한글은 자모를 짜 맞춘다 · 둥근 글자는 팔각 · 바깥 모서리를 깎은 결).
  한글 자모의 **자리**(위치 · 크기)만 [Pretendard](https://github.com/orioncactus/pretendard)(길형진, SIL OFL 1.1)의 자모 상자를 재어 참고했습니다 — 글자 윤곽은 가져오지 않았습니다.
  이 글꼴은 MIT 가 아니라 **SIL OFL 1.1** 을 따르고, 라이선스 전문과 저작권은
  같은 폴더 `OFL.txt`, 만든 방법과 판 기록은 `FONTLOG.txt` 에 있습니다(글꼴 파일 안 이름표에도 저작권 · 라이선스가 들어 있습니다).
  글꼴에 없는 글자(드문 한글 음절 ·
  일본어 · 중국어)는 기기 글꼴로 나옵니다 — 일본어 Hiragino · Yu Gothic · Meiryo · Noto Sans JP, 중국어 PingFang SC ·
  Microsoft YaHei · Noto Sans SC, 그 밖 Pretendard · Apple SD Gothic Neo · 맑은 고딕 · 시스템 글꼴(기기 글꼴은 이름만 부릅니다).
  로고는 글꼴을 싣지 않고 `tools/mklogo.py` 가 Cinzel(SIL OFL 1.1, 파일과 라이선스 전문은 `tools/art/fonts/`)의
  글자 윤곽을 그림(PNG)·경로(SVG)로 구운 것이라 어느 언어에서나 같습니다.
- **OFL 로 할 수 있는 것 · 지킬 것** — 글꼴을 쓰고 고치고 게임 · 문서에 담아 함께 배포하는 것은 자유롭고(판매하는 게임에 넣는 것도 됩니다),
  글꼴 파일만 **따로 팔 수는 없습니다.** 고친 글꼴도 OFL 그대로 내야 하고, 원본에 **예약 글꼴 이름**이 있으면 고친 판에 쓰지 못하며,
  저작권 표시와 라이선스 전문(`OFL.txt`)을 함께 둡니다. 포크에서 글꼴을 고치면 이름을 바꾸고 `FONTLOG.txt` 에 바꾼 것을 적으세요.
- **사이트**(`site/home` · `site/download`)는 Hahmlet · IBM Plex Sans KR · IBM Plex Mono 를
  **Google Fonts 에서 불러옵니다.** 글꼴 파일은 이 저장소에 없고, 세 글꼴은
  [SIL Open Font License 1.1](https://openfontlicense.org) 을 따릅니다. `site/**` 의 MIT 는
  이 글꼴에 걸리지 않습니다.

---

# NOTICE (English)

The MIT grant in `LICENSE` covers material created for this repository, with an additional restriction: it may not be used to train, fine-tune, evaluate, or otherwise develop AI/ML models, or to create datasets for those purposes. The **music and sound-effect folders** follow the terms of their external services. The **fonts** are excluded from MIT and licensed under the SIL Open Font License 1.1 (OFL), which requires modified fonts to remain under the OFL.

`LICENSE` states the additional AI-training restriction alongside the MIT terms. The exclusions and separate font licenses are detailed here.

## Covered by MIT — copyright gshs43-junyeong

All game code (`play/js/**`, `play/index.html`, `play/css/**`); every visual asset under
`play/assets/` except the two folders below, together with the procedurally drawn art
from `tileart.js`, `itemart.js` and `titlebg.js`; tools, build workflows and launchers;
the website (`site/**`, see *Fonts*); and the
documentation.

The visual assets were created for this project with **Claude Design**. No artwork was
purchased or taken from elsewhere.

## Not covered by MIT

| What | Where | Made with |
|---|---|---|
| Background music | `play/assets/bgm/*.mp3` | Original metadata and the applicable provider terms |
| 92 sound effects | `play/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |
| Game font Ashfall | `play/assets/fonts/ashfall-*.woff2` | Excluded from MIT; SIL Open Font License 1.1 — see 'Fonts' |
| Font sources | `tools/art/fonts/` | Cinzel (used by the logo) with its OFL text (`OFL-Cinzel.txt`) |

The sound effect files are governed by the terms of that service; the two font folders are governed by the SIL OFL 1.1 (see *Fonts*).

- Playing the game is unaffected.
- Extracting the audio files to use or distribute on their own is **not** granted by
  the MIT license; check the service's terms.
- When you publish a fork or redistribute a built archive, the service terms — not
  MIT — apply to these two folders.

To replace the audio in a fork, empty both folders and add your own files under the
**same names**; `play/js/music.js` references them directly. Sound effects should stay
**1.0 s** long so `SfxLoop` can chain them seamlessly. Missing sound effects fall back to
synthesized tones, so replacing only some of them works.

## Fonts

- The **game font Ashfall** (`play/assets/fonts/ashfall-*.woff2`) is an original typeface made by this project:
  no outlines are taken from another font — `tools/mkfont.py` draws every glyph from stroke skeletons in `tools/font/`
  (Hangul composed from jamo, octagonal round letters, chiselled outer corners).
  Only the Hangul jamo **placement** (positions and sizes) was studied by measuring the jamo boxes of
  [Pretendard](https://github.com/orioncactus/pretendard) (Kil Hyung-jin, SIL OFL 1.1); no glyph outlines were taken.
  It is licensed under the **SIL OFL 1.1**, not MIT; the licence text and copyright are in `OFL.txt` and how it is
  made in `FONTLOG.txt` in the same folder (the font's name table carries them too). Characters it does not cover
  (rare Hangul syllables, Japanese, Chinese) use device fonts, named only (Hiragino / Yu Gothic / Meiryo /
  Noto Sans JP, PingFang SC / Microsoft YaHei / Noto Sans SC, Pretendard / Apple SD Gothic Neo / Malgun Gothic,
  then the system font). The logo ships no font: `tools/mklogo.py` bakes the glyph outlines of Cinzel
  (SIL OFL 1.1; files and licence text in `tools/art/fonts/`) into a PNG and SVG paths.
- **What the OFL allows and requires** — you may use, modify, embed and redistribute the fonts with the game or documents
  (commercial games included), but may not sell the font files on their own. Modified fonts must stay under the OFL,
  must not use any **Reserved Font Names** of the original, and must ship with the copyright notice and licence text (`OFL.txt`).
  If you modify the font in a fork, rename it and record the changes in `FONTLOG.txt`.
- The **website** loads Hahmlet, IBM Plex Sans KR and IBM Plex Mono from Google Fonts.
  They are not stored in this repository and are licensed under the
  [SIL Open Font License 1.1](https://openfontlicense.org), not MIT.
