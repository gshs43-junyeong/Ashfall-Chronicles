# NOTICE — 무엇이 MIT 이고 무엇이 아닌가

`LICENSE` 의 MIT 는 **이 저장소에서 만든 것 전부**에 걸립니다. 다만 **음악과 효과음
두 폴더만은 예외**입니다. 그 둘은 바깥 서비스에서 받은 것이라 여기서 MIT 로 다시
내어 줄 권한이 없습니다.

`LICENSE` 파일은 표준 MIT 문구 그대로 두었습니다 — 조항을 손대면 자동 검사기가
"MIT 를 고친 것"으로 읽어서, 무엇이 예외인지는 이 문서에 따로 적습니다.

---

## MIT 로 쓸 수 있는 것 — 저작권은 gshs43-junyeong 에게 있습니다

| 무엇 | 어디 |
|---|---|
| 게임 코드 전부 | `game/js/**`, `game/index.html`, `game/css/**` |
| 그림 애셋 전부 | `game/assets/` 중 **아래 '예외' 표에 없는 모든 것** — 캐릭터·보스·NPC·타일·아이템·배경·UI |
| 절차 생성 그림 | `game/js/tileart.js` · `itemart.js` · `titlebg.js` 가 그려 내는 것 |
| 도구·빌드 | `tools/**`, `.github/workflows/**` |
| 사이트 | `site/**` |
| 문서 | `README.md`, `CLAUDE.md`, `docs/**` |

그림 애셋은 이 저장소 안에서 제작했으며, 제작 과정에는 **Claude Design**을 사용했습니다. 사 온 것도, 받아 온 것도 없습니다.

## MIT 에서 **빠지는 것**

| 무엇 | 어디 | 어디서 왔나 |
|---|---|---|
| 배경 음악 13곡 | `game/assets/audio/*.m4a` | [Suno](https://suno.com) 로 만든 것 |
| 효과음 89개 | `game/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) 로 만든 것 |

이 두 폴더의 파일은 **각 서비스의 이용 약관을 따릅니다.** 게임을 그대로 받아
즐기는 데에는 아무 제한이 없지만, **파일만 따로 떼어다 다른 곳에 쓰거나 다시
배포하려면** 해당 서비스의 약관을 직접 확인하세요. MIT 가 주는 "마음대로 써도
된다"는 이 두 폴더에는 걸리지 않습니다.

포크해서 소리까지 바꾸려면 그 두 폴더를 비우고 제 파일로 채우면 됩니다 —
매니페스트를 타지 않고 `game/js/music.js` 가 경로를 직접 알고 있어서, 같은 이름으로
갈아 끼우면 그대로 돕니다(효과음은 1.0초 길이를 지켜야 `SfxLoop` 이 끊기지 않게
이어 붙입니다).

---

# NOTICE (English)

The MIT license in `LICENSE` covers **everything created in this repository**,
with one carve-out: the **music and sound-effect folders**. Those came from
outside services, so they cannot be relicensed here.

**Covered by MIT** (copyright held by gshs43-junyeong): all game code, all
visual assets under `game/assets/` except the two folders below (produced with Claude Design as part of the project), the tools,
the build workflows, the website and the documentation.

**Not covered by MIT:**

| What | Where | Source |
|---|---|---|
| 13 background music tracks | `game/assets/audio/*.m4a` | generated with [Suno](https://suno.com) |
| 89 sound effects | `game/assets/sound_effects/*.mp3` | generated with [ElevenLabs](https://elevenlabs.io) |

Those files are governed by the terms of the respective services. Playing the
game is unaffected; extracting or redistributing the audio on its own is not
granted by the MIT license and must be checked against those services' terms.
