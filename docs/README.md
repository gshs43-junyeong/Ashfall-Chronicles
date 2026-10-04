# 문서 안내 / Documentation map

[← 한국어 README](../README-ko.md) · [English README](../README.md)

이 폴더에는 지금 쓰는 운영 문서만 있습니다. 처음 읽는 사람은 아래 순서로 시작하세요.

## 시작점

| 문서 | 대상 | 설명 |
|---|---|---|
| [README](../README.md) · [README-ko](../README-ko.md) | 플레이어·기여자 | 게임 소개, 실행 방법, 조작, 저장, 저장소 구조 — 영어판이 먼저, 한국어판이 그 짝 |
| [About 문구](about-copy.md) | 저장소·배포 담당자 | GitHub About과 소개 페이지에 바로 쓸 한국어·영어 문구 |
| [v1.1 한눈에](update/v1.1-changelog.md#한눈에) | 플레이어·QA | v1.1 에 들어간 것을 여섯 줄로 |
| [세션과 이야기 공용 규약](story-and-sessions.md) | 콘텐츠 제작자 | 장·세션을 늘릴 때 반드시 확인할 표와 세이브·애셋 규칙 |
| [v1.1 변경 사항](update/v1.1-changelog.md) | QA·릴리스 | 개발 중인 웹 빌드에 들어간 변경 기록 |
| [update/](update/) | 플레이어·QA·릴리스 | **판마다의 변경 기록과 계획** — `v<판>-changelog.md`(영어, 릴리스 본문) · `.ko.md` · `v1.1.1-engine-plan.md` · `v1.1.2-multiplayer-plan.md` |

## 운영 문서

- [system-requirements.md](system-requirements.md): 실행 환경과 기술적 전제
- [deploy-cache.md](deploy-cache.md): 배포와 캐시 무효화 절차
- [update/v1.1.4-plan.md](update/v1.1.4-plan.md): **다음 판 v1.1.4 할 일**(착수 전) — 눈 지역 유적 거리 · 탈 것 · 탭 UI 역동화 · 보스 공략 틈
- [update/v1.1.1-engine-plan.md](update/v1.1.1-engine-plan.md): v1.1.1 엔진화·모듈 분리·TypeScript·다국어(6개)·모바일·Docker 계획과 단계별 작업 프롬프트
- [engine.md](engine.md): 엔진(`src/engine`) 공개 API · 원칙 · 엔진만으로 도는 예제 게임(`examples/sample`)
- [debug-urls.md](debug-urls.md): 구역·기능 앞에서 바로 시작하는 디버그 주소(`?debug=village` · `factory` · `sea` …)와 옵션
- [../NOTICE.md](../NOTICE.md): MIT 에서 빠지는 것(음악·효과음)과 사이트 글꼴
- [CLAUDE.md](../CLAUDE.md): 코드·월드·세이브를 안전하게 고치기 위한 제약
- [code-history.md](code-history.md): 코드 주석에서 옮겨 온 「예전에는 …였다」 사연 모음(코드의 `사연: …#hN` 이 가리키는 곳)

## 제작 기록

v1.1 을 만들며 쓴 작업 지시서·계획서·중간 보고(최초 작업 지시서, 낚시 계획, 둔한 애셋 대응, 원격 변경 정리, 효과음
프롬프트)는 일이 끝나 지웠습니다. 필요하면 git 기록에서 꺼내 볼 수 있습니다 — 현재 기능의 기준은 README·공용 규약·changelog 입니다.

## 문서 작성 원칙

- 플레이어용 문서는 “어떻게 시작하고, 무엇이 저장되는가”를 먼저 말합니다.
- 작업 문서는 원본 경로와 생성물 경로를 분명히 구분합니다.
- 변경 중인 기능은 릴리스된 기능처럼 쓰지 않고, 버전과 상태를 함께 적습니다.
- 영어 공개 안내는 루트 [README.md](../README.md)(영어 우선)이고 한국어판은 [README-ko.md](../README-ko.md)입니다 — 하나를 고치면 둘 다. 숫자(아이템 · 몬스터 …)는 `node tests/counts.mjs` 가 게임 표와 대조합니다.
- About·소개 문구는 [about-copy.md](about-copy.md)를 원본으로 삼고, 수정한 뒤 GitHub·사이트에 같은 문구를 반영합니다.
