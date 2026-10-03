# NOTICE — 무엇이 MIT 이고 무엇이 아닌가

`LICENSE` 의 MIT 는 **이 저장소에서 만든 것 전부**에 걸립니다. 예외는 **음악과 효과음
두 폴더뿐**입니다. 그 둘은 바깥 서비스로 만든 것이라, 여기서 MIT 로 다시 내어 줄 권한이
없습니다.

`LICENSE` 파일은 표준 MIT 문구를 그대로 둡니다. 조항에 손을 대면 자동 검사기가
"고친 MIT"로 읽기 때문에, 무엇이 예외인지는 이 문서에 따로 적습니다.

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
| 배경 음악 13곡 | `play/assets/audio/*.m4a` | [Suno](https://suno.com) |
| 효과음 87개 | `play/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |
| 게임 글꼴 Ashfall | `play/assets/fonts/` | Pretendard(SIL OFL 1.1)를 고친 판 — 아래 '글꼴' |

이 두 폴더의 파일은 **각 서비스의 이용 약관을 따릅니다.**

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

- **게임 글꼴 Ashfall**(`play/assets/fonts/ashfall-*.woff2`)은 [Pretendard](https://github.com/orioncactus/pretendard)
  (길형진, SIL OFL 1.1)를 고친 판입니다 — 한글 획 4.5% 가늘게 · 모서리를 살짝 둥글게 · l · I 대체 글자 · 숫자 고정폭 · 쓰는 글자만 남기기 · 이름 바꾸기(Pretendard 는 **예약 글꼴 이름**이라
  고친 판은 그 이름을 쓰지 않습니다). 이 글꼴은 MIT 가 아니라 **SIL OFL 1.1** 을 따르고, 라이선스 전문과 저작권은
  같은 폴더 `OFL.txt`, 바꾼 내용은 `FONTLOG.txt` 에 있습니다(글꼴 파일 안 이름표에도 저작권 · 라이선스가 들어 있습니다).
  원본 글꼴과 원본 라이선스는 `tools/art/fonts/`, 굽는 도구는 `tools/mkfont.py`. 글꼴에 없는 글자(드문 한글 음절 ·
  일본어 · 중국어)는 기기 글꼴로 나옵니다 — 일본어 Hiragino · Yu Gothic · Meiryo · Noto Sans JP, 중국어 PingFang SC ·
  Microsoft YaHei · Noto Sans SC, 그 밖 Pretendard · Apple SD Gothic Neo · 맑은 고딕 · 시스템 글꼴(기기 글꼴은 이름만 부릅니다).
  로고는 글꼴을 싣지 않고 `tools/mklogo.py` 가 Cinzel(SIL OFL 1.1, 파일과 라이선스 전문은 `tools/art/fonts/`)의
  글자 윤곽을 그림(PNG)·경로(SVG)로 구운 것이라 어느 언어에서나 같습니다.
- **사이트**(`site/home` · `site/download`)는 Hahmlet · IBM Plex Sans KR · IBM Plex Mono 를
  **Google Fonts 에서 불러옵니다.** 글꼴 파일은 이 저장소에 없고, 세 글꼴은
  [SIL Open Font License 1.1](https://openfontlicense.org) 을 따릅니다. `site/**` 의 MIT 는
  이 글꼴에 걸리지 않습니다.

---

# NOTICE (English)

The MIT license in `LICENSE` covers **everything created in this repository**.
The only exceptions are the **music and sound-effect folders**, which were generated
with external services and therefore cannot be relicensed here.

`LICENSE` keeps the standard MIT text unchanged so that license scanners read it as
plain MIT; the exceptions are documented here instead.

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
| 13 background music tracks | `play/assets/audio/*.m4a` | [Suno](https://suno.com) |
| 87 sound effects | `play/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |
| Game font Ashfall | `play/assets/fonts/` | Modified Pretendard (SIL OFL 1.1) — see 'Fonts' |

These files are governed by the terms of the respective services.

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

- The **game font Ashfall** (`play/assets/fonts/ashfall-*.woff2`) is a modified version of
  [Pretendard](https://github.com/orioncactus/pretendard) by Kil Hyung-jin (SIL OFL 1.1): Hangul strokes 4.5% thinner, slightly rounded corners, alternate l and I, tabular figures,
  subset to the characters the game uses, and renamed, because "Pretendard" is a Reserved Font Name.
  It is licensed under the **SIL OFL 1.1**, not MIT; the licence text and copyright are in `OFL.txt` and the
  changes in `FONTLOG.txt` in the same folder (the font's name table carries them too). The original fonts
  and licence are in `tools/art/fonts/`; `tools/mkfont.py` builds the font. Characters it does not cover
  (rare Hangul syllables, Japanese, Chinese) use device fonts, named only (Hiragino / Yu Gothic / Meiryo /
  Noto Sans JP, PingFang SC / Microsoft YaHei / Noto Sans SC, Pretendard / Apple SD Gothic Neo / Malgun Gothic,
  then the system font). The logo ships no font: `tools/mklogo.py` bakes the glyph outlines of Cinzel
  (SIL OFL 1.1; files and licence text in `tools/art/fonts/`) into a PNG and SVG paths.
- The **website** loads Hahmlet, IBM Plex Sans KR and IBM Plex Mono from Google Fonts.
  They are not stored in this repository and are licensed under the
  [SIL Open Font License 1.1](https://openfontlicense.org), not MIT.
