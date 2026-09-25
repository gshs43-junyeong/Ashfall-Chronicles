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
| 게임 코드 전부 | `game/js/**`, `game/index.html`, `game/css/**` |
| 그림 애셋 전부 | `game/assets/` 중 **아래 '예외' 표에 없는 모든 것** — 캐릭터·보스·NPC·타일·아이템·배경·UI |
| 절차 생성 그림 | `game/js/tileart.js` · `itemart.js` · `titlebg.js` 가 그려 내는 것 |
| 도구·빌드 | `tools/**`, `.github/workflows/**`, `launchers/**` |
| 사이트 | `site/**` (아래 '글꼴' 참고) |
| 문서 | `README.md`, `CLAUDE.md`, `NOTICE.md`, `docs/**` |

그림 애셋은 이 저장소를 위해 제작했고, 제작에는 **Claude Design** 을 썼습니다.
사 오거나 다른 곳에서 받아 온 그림은 없습니다.

## MIT 에서 **빠지는 것**

| 무엇 | 어디 | 어떻게 만들었나 |
|---|---|---|
| 배경 음악 13곡 | `game/assets/audio/*.m4a` | [Suno](https://suno.com) |
| 효과음 87개 | `game/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |

이 두 폴더의 파일은 **각 서비스의 이용 약관을 따릅니다.**

- 게임을 받아 즐기는 데에는 아무 제한이 없습니다.
- **소리 파일만 떼어다 다른 곳에 쓰거나 따로 배포하는 것**은 MIT 가 허락하는 범위가
  아닙니다. 해당 서비스의 약관을 직접 확인하세요.
- 저장소를 포크해 공개하거나 빌드한 zip 을 다시 배포할 때도, 이 두 폴더에 대해서는
  MIT 가 아니라 각 서비스의 약관이 기준입니다.

포크에서 소리를 바꾸고 싶다면 두 폴더를 비우고 자기 파일로 채우면 됩니다. 소리는
매니페스트를 타지 않고 `game/js/music.js` 가 경로를 직접 알고 있으므로, **같은 이름**으로
갈아 끼우면 그대로 돕니다. 효과음은 **1.0초** 길이를 지켜야 `SfxLoop` 가 끊김 없이
이어 붙입니다. 파일이 없는 효과음은 게임이 합성음으로 대신 내므로, 일부만 바꿔도 돕니다.

## 글꼴

- **게임**은 글꼴 파일을 싣지 않습니다. 기기에 설치된 글꼴(Pretendard · Apple SD Gothic Neo ·
  맑은 고딕 · 시스템 글꼴 순)을 씁니다.
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

All game code (`game/js/**`, `game/index.html`, `game/css/**`); every visual asset under
`game/assets/` except the two folders below, together with the procedurally drawn art
from `tileart.js`, `itemart.js` and `titlebg.js`; tools, build workflows and launchers;
the website (`site/**`, see *Fonts*); and the
documentation.

The visual assets were created for this project with **Claude Design**. No artwork was
purchased or taken from elsewhere.

## Not covered by MIT

| What | Where | Made with |
|---|---|---|
| 13 background music tracks | `game/assets/audio/*.m4a` | [Suno](https://suno.com) |
| 87 sound effects | `game/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |

These files are governed by the terms of the respective services.

- Playing the game is unaffected.
- Extracting the audio files to use or distribute on their own is **not** granted by
  the MIT license; check the service's terms.
- When you publish a fork or redistribute a built archive, the service terms — not
  MIT — apply to these two folders.

To replace the audio in a fork, empty both folders and add your own files under the
**same names**; `game/js/music.js` references them directly. Sound effects should stay
**1.0 s** long so `SfxLoop` can chain them seamlessly. Missing sound effects fall back to
synthesized tones, so replacing only some of them works.

## Fonts

- The **game** ships no font files; it uses fonts installed on the device.
- The **website** loads Hahmlet, IBM Plex Sans KR and IBM Plex Mono from Google Fonts.
  They are not stored in this repository and are licensed under the
  [SIL Open Font License 1.1](https://openfontlicense.org), not MIT.
