# Ashfall Chronicles

> 별이 잠든 땅

테라리아식 2D 샌드박스 위에 스토리·RPG 성장·무기/능력 빌드를 얹은 어드벤처 게임.
순수 HTML5 + JavaScript로 만들어졌고, 브라우저 안에서 돌아갑니다.

세션 셋 · 장 열여덟 · 결전 열셋. 지상 아홉 바이옴에 하늘 섬과 지하 넷이 붙고,
서쪽 끝에는 **가라앉은 바다**가 있습니다 — 숨이 닿는 만큼만 내려갈 수 있습니다.
세계는 새 게임마다 **소형 · 중형(1.5배) · 대형(2배)** 중에서 고릅니다.

| | | | | | |
|---|---|---|---|---|---|
| 아이템 **447** | 몬스터 **72** | 보스 **23** | 업적 **75** | 기계 **26** | 제작법 **223** |

보스 스물셋 중 **열셋이 이야기가 데려가는 것**이고, 나머지 열은 유적 안쪽과
아무도 말해 주지 않는 자리에 있습니다. 업적 일흔다섯 개는 갈래 여덟에 난이도 셋으로
나뉘고, 그중 여섯은 달성하기 전까지 무엇인지도 보이지 않습니다.

**[▶ 브라우저에서 바로 플레이](https://ashfall-chronicles.vercel.app/)** ·
**[내려받기](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)** ·
**[영문 안내](docs/README.en.md)**

> **웹과 내려받는 판은 지금 다릅니다.** 웹(`/play`)에서는 **v1.1 개발판**이 돌고,
> 내려받는 zip 은 아직 **v1.0.5** 입니다. v1.1 에 무엇이 들어갔는지는
> [`docs/v1.1-changelog.md`](docs/v1.1-changelog.md) 에 있습니다 — **세션 2 「벽 너머」와
> 세션 3 「물이 지운 쪽」이 모두 들어가** 장이 열다섯에서 **열여덟**으로 늘었습니다.

---

## 저장소 구조

| 경로 | 내용 |
|---|---|
| `game/` | 게임 본체. 이 폴더만 있으면 정적 서버 위에서 그대로 돌아갑니다. |
| `launchers/windows/` | `AshfallChronicles.bat` + Windows용 README |
| `launchers/macos/` | `AshfallChronicles.command`, `launch.sh` + macOS용 README |
| `site/` | 배포 사이트. 빌드할 때 `game/`이 `site/play/`로 복사됩니다. |
| `site/home/` | 홈 페이지 — 주소는 `/home` (루트 `/`는 이쪽으로 넘깁니다) |
| `site/download/` | 다운로드 페이지 — 주소는 `/download` |
| `docs/` | 변경 사항 · 세션 규약 · 배포 캐시 · 시스템 요구사항 |
| `LICENSE` · `NOTICE.md` | MIT 본문과, **거기서 빠지는 두 폴더**(음악·효과음)에 대한 설명 |
| `tools/` | 배포용 zip 빌드 스크립트, 애셋을 굽고 재는 파이썬 도구들 |
| `.github/workflows/` | Release 자동 첨부, Pages 자동 배포 |

**`game/` 만이 원본입니다.** `site/play/` 는 빌드 산출물이고 `.gitignore` 되어
있습니다 — 거기를 고치면 다음 빌드에 날아갑니다.

배포용 zip은 저장소에 커밋하지 않습니다(`.gitignore`). 태그를 push하면 Actions가
그때 만들어 Release에 첨부합니다.

---

## 문서

| 문서 | 내용 |
|---|---|
| [`docs/README.md`](docs/README.md) | **문서 안내** — 어떤 문서를 어디서부터 읽으면 되는지 |
| [`docs/README.en.md`](docs/README.en.md) | 영어권 플레이어·기여자를 위한 프로젝트 안내 |
| [`docs/about-copy.md`](docs/about-copy.md) | GitHub About · 소개 문구(한국어·영어)의 원본 |
| [`docs/game-assessment.md`](docs/game-assessment.md) | 게임 평가와 우선순위 개선 로드맵 |
| [`docs/story-and-sessions.md`](docs/story-and-sessions.md) | **세션·장을 늘릴 때의 공용 규약** — 손대는 자리 목록과 지켜야 할 규칙. 세션 3 을 붙일 때 실제로 쓴 문서이고, 다음 세션도 여기서 시작합니다 |
| [`docs/v1.1-changelog.md`](docs/v1.1-changelog.md) | **v1.1 에 무엇이 들어갔는가** (릴리스 준비 중 — 남은 것은 애셋 다듬기) |
| [`docs/system-requirements.md`](docs/system-requirements.md) | 시스템 요구사항과 그 숫자를 잰 방법 |
| [`CLAUDE.md`](CLAUDE.md) | 이 저장소에서 코드를 고칠 때의 규칙 — 타일 번호·좌표(`SHIFT`)·세이브처럼 **어기면 조용히 망가지는 것들** |
| [`docs/deploy-cache.md`](docs/deploy-cache.md) | 배포와 캐시 무효화 |

---

## 새 버전 내보내기

```bash
git tag v1.1.0
git push origin v1.1.0
```

태그가 올라가면 `.github/workflows/release.yml`이 자동으로:

1. `tools/build.sh`로 Windows·macOS용 zip을 만들고
2. `SHA256SUMS.txt`를 생성한 뒤
3. 셋 다 해당 Release에 첨부합니다.

로컬에서 직접 만들려면:

```bash
bash tools/build.sh 1.1.0
```

결과물은 `dist/`에 생깁니다.

---

## 실행에 필요한 것

- 최신 브라우저(Chrome · Safari · Edge) 하나면 됩니다.
- 설치할 것은 없습니다. **서버도 파이썬도 필요하지 않습니다** — zip 을 풀고
  `index.html`(또는 런처)을 더블클릭하면 그대로 돌아갑니다.
- 시크릿 창에서는 하지 마세요. 저장이 창을 닫는 순간 사라집니다.
  폴더를 옮길 때는 게임 안 **설정 → 저장 내보내기/가져오기**를 쓰세요.

### macOS에서 "확인되지 않은 개발자" 경고가 뜬다면

파일을 **우클릭 → 열기**로 실행하면 그 뒤로는 경고 없이 열립니다. 그래도 막히면:

```bash
xattr -dr com.apple.quarantine AshfallChronicles-1.0.5/   # 받은 판 번호로
```

---

## 저장 데이터

진행 상황은 서버가 아니라 **브라우저 안에**(`localStorage`) 저장됩니다.

- 같은 브라우저로 다시 실행하면 이어하기가 됩니다.
- 브라우저를 바꾸거나 "사이트 데이터 삭제"를 누르면 사라집니다.
- 시크릿/프라이빗 모드에서는 창을 닫는 순간 없어집니다.
- **웹에서 한 저장과 내려받은 버전의 저장은 서로 다른 곳에 쌓입니다.** 출처(origin)가
  다르기 때문입니다. 이어서 하려면 같은 쪽을 계속 쓰세요.

---

## 조작

| 입력 | 동작 |
|---|---|
| `A` `D` · `←` `→` | 이동 |
| `Space` `W` `↑` | 점프 (특성·장신구로 이중 점프) · 물속에서는 위로 저음 |
| `S` `↓` | 나무 발판 아래로 내려가기 |
| 좌클릭 | 공격 — 곡괭이/괭이를 든 상태면 채굴·밭갈이 |
| 우클릭 | 설치 · 상호작용 · 낚싯대 던지기 |
| `Shift` | 회피 대시 (무적 프레임) |
| `Q` `E` `R` `F` | 스킬 슬롯 |
| `1`~`9`, `0` | 핫바 (마우스 휠로도 전환) |
| `I` `K` `J` `H` `M` | 가방 · 능력 · 일지 · 제작 · 지도 — 화면 오른쪽 아래 단추로도 엽니다 |
| `Esc` | 일시정지 |
| `F5` | 저장 |

이동·점프·대시·스킬·패널·저장은 게임 안 **설정 → 조작**에서 다른 키로 바꿀 수 있습니다.

물에 들어가면 화면에 **숨 막대**가 생깁니다. 숨이 다하면 체력이 깎이므로, 더 내려가려면
휴대용 산소통을 만들어 유틸리티 칸에 끼워야 합니다.

---

## 라이선스

**[MIT](LICENSE)** 입니다. 코드도 그림도 마음대로 쓰고 고치고 다시 내어도 됩니다 —
저작권 표시만 남겨 주세요. 저작권은 `gshs43-junyeong` 에게 있습니다.

**딱 두 폴더만 예외입니다.**

| 무엇 | 어디 | 어디서 왔나 |
|---|---|---|
| 배경 음악 13곡 | `game/assets/audio/*.m4a` | [Suno](https://suno.com) |
| 효과음 89개 | `game/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |

이 둘은 바깥 서비스에서 만든 것이라 여기서 MIT 로 다시 내어 줄 권한이 없습니다.
게임을 받아 즐기는 데에는 아무 제한이 없지만, **소리 파일만 따로 떼어다 쓰려면**
해당 서비스의 약관을 직접 확인하세요. 자세한 것은 [`NOTICE.md`](NOTICE.md) 에
적어 두었습니다.

그 둘을 뺀 **그림은 전부 이 저장소 안에서 만들었습니다.** 사 온 것도 받아 온 것도
없습니다 — 손으로 그린 시트와 `tileart.js`·`itemart.js` 가 그때그때 그려 내는 것뿐입니다.

## 만든 것

기획 `gshs43-junyeong` · 제작 Claude Code + Codex · 그림 애셋 Claude Design ·
음악 [Suno](https://suno.com) · 효과음 [ElevenLabs](https://elevenlabs.io).

버전별 변경 사항은 [릴리스 목록](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases)과
[다운로드 페이지의 변경 이력](https://ashfall-chronicles.vercel.app/download#changelog)에 있습니다.
릴리스를 앞둔 v1.1 은 [`docs/v1.1-changelog.md`](docs/v1.1-changelog.md) 를 보세요.
