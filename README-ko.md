# Ashfall Chronicles

> 별이 잠든 땅

테라리아식 2D 샌드박스 위에 스토리·RPG 성장·무기/능력 빌드를 얹은 어드벤처 게임.
순수 HTML5 + JavaScript로 만들어졌고, 브라우저 안에서 돌아갑니다.

세션 셋 · 장 열여덟 · 결전 열셋. 지상 아홉 바이옴에 하늘 섬과 지하 넷이 붙고,
서쪽 끝에는 **가라앉은 바다**가 있습니다 — 숨이 닿는 만큼만 내려갈 수 있습니다.
세계는 새 게임마다 **소형 · 중형(1.5배) · 대형(2배)** 중에서 고릅니다.

| | | | | | |
|---|---|---|---|---|---|
| 아이템 **494** | 몬스터 **75** | 보스 **23** | 업적 **75** | 기계 **28** | 제작법 **230** |

<sub>세는 법: 아이템은 블록 · 장식 · 펫까지 표에 있는 것 전부, 몬스터는 보스를 뺀 것(바다 부유물 · 온순한 짐승 포함). 숫자는 `node tests/counts.mjs` 가 게임 표와 대조합니다.</sub>

보스 스물셋 중 **열셋이 이야기가 데려가는 것**이고, 나머지 열은 유적 안쪽과
아무도 말해 주지 않는 자리에 있습니다. 업적 일흔다섯 개는 갈래 여덟에 난이도 셋으로
나뉘고, 어려움 갈래는 달성하기 전까지 무엇인지도 보이지 않습니다.

**[▶ 브라우저에서 바로 플레이](https://ashfall-chronicles.vercel.app/)** ·
**[내려받기](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)** ·
**[English README](README.md)**

> **v1.1.3 (2026-10-04)** — 새로 그린 스킬 연출(결이 살아 있는 칼선 · 충격파 · 룬 마법진 · 빛기둥) · **불이 붙어 타오르고** 윤곽째 얼어붙는
> 몬스터 · 떠 있는 몬스터를 따라붙는 연출 · 깡충 뛰는 토끼 · 캠프 · 마을 위 하늘 섬 정리 · 가벼워진 타이틀 로고와 새 앱 아이콘.
> 무엇이 들어갔는지는 [`docs/v1.1.3-changelog.ko.md`](docs/v1.1.3-changelog.ko.md) 에 있습니다.
> v1.1.2 에는 **멀티플레이**(2~4명) · 몬스터 스킬 · 게임 글꼴 **Ashfall** · **앱으로 여는 판**(Electron, 서명 없음)이 들어왔습니다 —
> [`docs/v1.1.2-changelog.ko.md`](docs/v1.1.2-changelog.ko.md). v1.1.x 의 저장은 그대로 열립니다.
>
> ⚠ **v1.0.x 의 저장은 v1.1 부터 열리지 않습니다** — 세계 폭이 4200 → 5000 칸으로 넓어졌습니다.
> 새로 시작해야 하며, 옛 기록은 슬롯에 그대로 남습니다.

---

## 저장소 구조

| 경로 | 내용 |
|---|---|
| `play/` | 게임 본체. 이 폴더만 있으면 정적 서버 위에서 그대로 돌아갑니다. |
| `launchers/windows/` | `AshfallChronicles.bat` + Windows용 README |
| `launchers/macos/` | `AshfallChronicles.command`, `launch.sh` + macOS용 README |
| `desktop/` | 앱으로 여는 판(Electron 껍데기) — 같은 `play/` 를 제 창으로 엽니다 |
| `src/` | 코드 원본(TypeScript) — `src/game`(게임) · `src/engine`(게임을 모르는 엔진). `play/js/ashfall.js` 는 그 번들 |
| `site/` | 배포 사이트. 빌드할 때 `play/`이 `site/play/`로 복사됩니다. |
| `site/home/` | 홈 페이지 — 주소는 `/home` (루트 `/`는 이쪽으로 넘깁니다) |
| `site/download/` | 다운로드 페이지 — 주소는 `/download` |
| `docs/` | 변경 사항 · 세션 규약 · 배포 캐시 · 시스템 요구사항 |
| `LICENSE` · `NOTICE.md` | MIT 본문과, **거기서 빠지는 두 폴더**(음악·효과음)에 대한 설명 |
| `tools/` | 배포용 zip 빌드 스크립트(브라우저 판 · 앱 판), 애셋을 굽고 재는 파이썬 도구들 |
| `.github/workflows/` | Release 자동 첨부, Pages 자동 배포 |
| `Dockerfile` · `docker-compose.yml` · `docker/` | 컨테이너로 묶기 · 검사 · 서빙(아래 「개발 · Docker」) |

**`play/` 만이 원본입니다.** `site/play/` 는 빌드 산출물이고 `.gitignore` 되어
있습니다 — 거기를 고치면 다음 빌드에 날아갑니다.

배포용 zip은 저장소에 커밋하지 않습니다(`.gitignore`). 태그를 push하면 Actions가
그때 만들어 Release에 첨부합니다.

---

## 문서

| 문서 | 내용 |
|---|---|
| [`docs/README.md`](docs/README.md) | **문서 안내** — 어떤 문서를 어디서부터 읽으면 되는지 |
| [`README.md`](README.md) | 영어 안내(이 문서의 영어판 — 영어가 먼저입니다) |
| [`docs/about-copy.md`](docs/about-copy.md) | GitHub About · 소개 문구(한국어·영어)의 원본 |
| [`docs/story-and-sessions.md`](docs/story-and-sessions.md) | **세션·장을 늘릴 때의 공용 규약** — 손대는 자리 목록과 지켜야 할 규칙. 세션 3 을 붙일 때 실제로 쓴 문서이고, 다음 세션도 여기서 시작합니다 |
| [`docs/v1.1.3-changelog.ko.md`](docs/v1.1.3-changelog.ko.md) · [`docs/v1.1.2-changelog.ko.md`](docs/v1.1.2-changelog.ko.md) | **v1.1.3 · v1.1.2 에 무엇이 들어갔는가**(릴리스 본문은 영어판 `docs/v<판>-changelog.md`) |
| [`docs/v1.1.1-changelog.md`](docs/v1.1.1-changelog.md) | v1.1.1 에 무엇이 들어갔는가 |
| [`docs/debug-urls.md`](docs/debug-urls.md) | 구역 · 기능 앞에서 바로 시작하는 디버그 주소(영상 촬영용 `?debug=showcase` 포함) |
| [`docs/v1.1-changelog.md`](docs/v1.1-changelog.md) | v1.1.0 에 무엇이 들어갔는가 |
| [`docs/system-requirements.md`](docs/system-requirements.md) | 시스템 요구사항과 그 숫자를 잰 방법 |
| [`CLAUDE.md`](CLAUDE.md) | 이 저장소에서 코드를 고칠 때의 규칙 — 타일 번호·좌표(`SHIFT`)·세이브처럼 **어기면 조용히 망가지는 것들** |
| [`docs/deploy-cache.md`](docs/deploy-cache.md) | 배포와 캐시 무효화 |

---

## 새 버전 내보내기

```bash
git tag v1.1.3
git push origin v1.1.3
```

태그가 올라가면 `.github/workflows/release.yml`이 자동으로:

1. `tools/build.sh`로 **브라우저로 여는 판**(Windows · macOS zip)을 만들고
2. `tools/build-desktop.sh`로 **앱으로 여는 판**(Windows · macOS Intel · macOS Apple 실리콘 · Linux zip)을 만들고 —
   macOS 앱은 macOS 러너에서 **임시 서명(ad-hoc)** 을 해 "손상되었으므로 휴지통으로 이동" 대신 "확인되지 않은 개발자" 경고만 뜨게 하고
3. `SHA256SUMS.txt` · `SHA256SUMS-App.txt`와 함께 Release에 첨부합니다. 본문은 `docs/v<판>-changelog.md`.

로컬에서 직접 만들려면:

```bash
bash tools/build.sh 1.1.3
(cd desktop && npm ci) && bash tools/build-desktop.sh 1.1.3
```

결과물은 `dist/`에 생깁니다.

---

## 실행에 필요한 것

- 최신 브라우저(Chrome · Safari · Edge) 하나면 됩니다.
- 설치할 것은 없습니다. **서버도 파이썬도 필요하지 않습니다** — zip 을 풀고
  `index.html`(또는 런처)을 더블클릭하면 그대로 돌아갑니다.
- 시크릿 창에서는 하지 마세요. 저장이 창을 닫는 순간 사라집니다.
  폴더를 옮길 때는 게임 안 **설정 → 저장 내보내기/가져오기**를 쓰세요.

### 서명하지 않은 판이라 처음 한 번 경고가 뜹니다

개발자 인증서로 서명하지 않았기 때문에 처음 열 때 운영체제가 한 번 묻습니다(파일이 망가졌거나 위험해서가 아닙니다).

- **Windows** — "Windows의 PC 보호" 창이 뜨면 **추가 정보 → 실행**.
- **macOS 13 이하** — **우클릭 → 열기 → 열기**.
- **macOS 14 · 15** — 처음 열면 "악성 코드가 없음을 확인할 수 없습니다" 창이 뜹니다. **완료**를 누르고(**휴지통으로 이동은 앱을 지웁니다**)
  **시스템 설정 → 개인정보 보호 및 보안 → 맨 아래 "그래도 열기"**. Apple 공증(유료)을 받지 않은 앱이면 모두 뜨는 창이고, 무언가를 찾았다는 뜻이 아닙니다.
  창 없이 열려면 터미널에서 `xattr -dr com.apple.quarantine "/Applications/Ashfall Chronicles.app"` (브라우저 판은 받은 폴더 이름으로).
- **Linux(앱 판)** — 풀어서 `./ashfall-chronicles`.

| 판 | 크기 | 여는 법 |
|---|---|---|
| 브라우저로 여는 판 | 수십 MB | 런처(또는 `index.html`)가 기본 브라우저로 엽니다 |
| 앱으로 여는 판 | 200 MB 남짓 | 제 창으로 엽니다(Electron) — 브라우저 설정 · 확장과 상관없이 늘 같은 화면 |


---

## 개발 · Docker

코드 원본은 `src/`(TypeScript)이고 `play/js/ashfall.js` 는 그것을 묶은 **산출물**입니다(커밋됨 — `play/` 만 받아도 빌드 없이 돕니다).

```bash
npm ci            # 처음 한 번
npm run dev       # 소스를 고치면 번들을 다시 만들고 play/ 를 띄웁니다
npm run check     # 회귀 검사 한 벌(문법 · 타입 · 모듈 · 번역 · 생성 해시 · 동작 · 스크린샷)
```

Node 없이 **Docker 만으로**도 같은 일을 합니다:

| 명령 | 하는 일 |
|---|---|
| `docker compose up dev` | 소스를 걸어 두고 고치면 다시 묶으며 게임을 띄웁니다 → http://localhost:8000/index.html |
| `docker compose up game` | 지금 소스로 만든 게임만 nginx 로 → http://localhost:8001 |
| `docker compose up site` | 배포 사이트와 같은 모양(`/home` · `/download` · `/play`, `vercel.json` 의 되돌려 보내기·캐시 규칙) → http://localhost:8002 |
| `docker compose run --rm check` | 회귀 검사 한 벌을 Playwright 공식 이미지 안에서 |

- 이미지 안에서 만든 번들은 저장소로 돌아오지 않습니다 — **커밋할 번들은 늘 `npm run build`** 로 만드세요(`dev` 는 소스를 걸어 두므로 예외).
- 회사·학교 프록시처럼 TLS 를 가로채는 망이라 `npm ci` 가 인증서 오류를 내면 그 CA 를 넘기세요:
  `CA_CERT=/path/to/ca.crt docker compose build` (또는 `docker build --secret id=ca,src=/path/to/ca.crt …`).
- 기존 방식(`index.html` 더블클릭 · `python3 -m http.server` · Vercel)은 그대로입니다.

---

## 멀티플레이

타이틀의 **멀티플레이**에서 방을 만들거나(내 세계를 골라 엽니다) 방 코드를 넣어 들어갑니다. 2~4명이 **방장의 세계를 함께** 씁니다.

- 세계 · 몬스터 · 시간 · 이야기 진행은 방장 것이고, 캐릭터는 각자 것입니다 — 손님 캐릭터는 그 세계가 기억해 두었다가 다시 오면 이어 갑니다(싱글플레이 슬롯과 따로).
- 채팅 · PvP 는 방장이 켜고 끕니다. 파티 목록에서 체력 · 지연을 보고, 방장은 내보낼 수 있습니다.
- 브라우저끼리 직접 잇는 방식(WebRTC)이라 서버에 세계가 올라가지 않습니다. 회사 · 학교 망처럼 직접 연결을 막는 곳에서는 안 될 수 있습니다.

---

## 저장 데이터

진행 상황은 서버가 아니라 **브라우저 안에**(IndexedDB, 압축해서) 저장됩니다. 대형 세계 슬롯 셋도 넉넉히 들어갑니다.

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
| `Z` `X` | 유틸리티 칸(탐지기 · 산소통 따위) |
| `T` | 놓을 기계 방향 돌리기 |
| `1`~`9`, `0` | 핫바 (마우스 휠로도 전환) |
| `I` `K` `J` `H` `M` | 가방 · 능력 · 일지 · 제작 · 지도 — 화면 오른쪽 아래 단추로도 엽니다 |
| `Esc` | 일시정지 |
| `F5` | 저장 |

이동·점프·대시·스킬·패널·저장은 게임 안 **설정 → 조작**에서 다른 키로 바꿀 수 있습니다.

멀티플레이에서는 `Enter` 로 채팅을 엽니다(방장이 끌 수 있습니다).

물에 들어가면 화면에 **숨 막대**가 생깁니다. 숨이 다하면 체력이 깎이므로, 더 내려가려면
휴대용 산소통을 만들어 유틸리티 칸에 끼워야 합니다.

---

## 라이선스

**[MIT](LICENSE)** 입니다. 코드도 그림도 마음대로 쓰고 고치고 다시 내어도 됩니다 —
저작권 표시만 남겨 주세요. 저작권은 `gshs43-junyeong` 에게 있습니다.

**딱 두 폴더만 예외입니다.**

| 무엇 | 어디 | 어디서 왔나 |
|---|---|---|
| 배경 음악 14곡 | `play/assets/audio/*.m4a` | [Suno](https://suno.com) |
| 효과음 92개 | `play/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |

이 둘은 바깥 서비스에서 만든 것이라 여기서 MIT 로 다시 내어 줄 권한이 없습니다.
게임을 받아 즐기는 데에는 아무 제한이 없지만, **소리 파일만 따로 떼어다 쓰려면**
해당 서비스의 약관을 직접 확인하세요. 자세한 것은 [`NOTICE.md`](NOTICE.md) 에
적어 두었습니다.

그 둘을 뺀 **그림은 전부 이 저장소 안에서 만들었습니다.** 사 온 것도 받아 온 것도
없습니다 — 손으로 그린 시트와 `tileart.js`·`itemart.js` 가 그때그때 그려 내는 것뿐입니다.

## 만든 것

기획 `gshs43-junyeong` · 제작 Claude Code + Codex · 그림 애셋 Claude Design · 글꼴 Ashfall(Pretendard 고친 판, SIL OFL 1.1) ·
음악 [Suno](https://suno.com) · 효과음 [ElevenLabs](https://elevenlabs.io).

버전별 변경 사항은 [릴리스 목록](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases)과
[다운로드 페이지의 변경 이력](https://ashfall-chronicles.vercel.app/download#changelog)에 있습니다.
v1.1.3 · v1.1.2 · v1.1.1 · v1.1.0 의 전체 목록은 [`docs/v1.1.3-changelog.ko.md`](docs/v1.1.3-changelog.ko.md) · [`docs/v1.1.2-changelog.ko.md`](docs/v1.1.2-changelog.ko.md) · [`docs/v1.1.1-changelog.md`](docs/v1.1.1-changelog.md) · [`docs/v1.1-changelog.md`](docs/v1.1-changelog.md) 에 있습니다.
