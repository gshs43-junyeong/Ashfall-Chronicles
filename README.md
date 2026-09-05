# Ashfall Chronicles

> 별이 잠든 땅

테라리아식 2D 샌드박스 위에 스토리·RPG 성장·무기/능력 빌드를 얹은 어드벤처 게임.
순수 HTML5 + JavaScript로 만들어졌고, 브라우저 안에서 돌아갑니다.

**[▶ 브라우저에서 바로 플레이](https://ashfall-chronicles.vercel.app/)** ·
**[내려받기](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)**

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
| `tools/` | 배포용 zip 빌드 스크립트 |
| `.github/workflows/` | Release 자동 첨부, Pages 자동 배포 |

배포용 zip은 저장소에 커밋하지 않습니다(`.gitignore`). 태그를 push하면 Actions가
그때 만들어 Release에 첨부합니다.

---

## 새 버전 내보내기

```bash
git tag v1.0.6
git push origin v1.0.6
```

태그가 올라가면 `.github/workflows/release.yml`이 자동으로:

1. `tools/build.sh`로 Windows·macOS용 zip을 만들고
2. `SHA256SUMS.txt`를 생성한 뒤
3. 셋 다 해당 Release에 첨부합니다.

로컬에서 직접 만들려면:

```bash
bash tools/build.sh 1.0.6
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
xattr -dr com.apple.quarantine AshfallChronicles-1.0.5/
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
| `A` / `D` | 이동 |
| `Space` | 점프 (특성·장신구로 이중 점프) |
| `S` | 나무 발판 아래로 내려가기 |
| 좌클릭 | 공격 — 곡괭이/괭이를 든 상태면 채굴·밭갈이 |
| 우클릭 | 설치 · 상호작용 · 낚싯대 던지기 |
| `Shift` | 회피 대시 (무적 프레임) |
| `Q` `E` `R` `F` | 스킬 슬롯 |
| `1`~`9`, `0` | 핫바 (마우스 휠로도 전환) |
| `I` `K` `J` `H` | 가방 · 능력 · 일지 · 제작 |
| `Esc` | 일시정지 |
| `F5` | 저장 |

버전별 변경 사항은 [릴리스 목록](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases)과
`launchers/*/README.md`에 있습니다.
