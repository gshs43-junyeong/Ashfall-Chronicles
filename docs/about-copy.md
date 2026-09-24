# About 문구 / About Copy

GitHub 저장소의 **About** 칸과 소개 페이지·릴리스 첫 줄에 쓰는 문구의 원본입니다.
문구를 고치면 여기부터 고치고, 같은 문구를 GitHub·사이트에 옮깁니다.

> 원칙 — **자주 바뀌는 숫자·버전·출시 상태는 넣지 않습니다.** 장 수·아이템 수·판 번호는
> 세션이 붙을 때마다 바뀌므로 README 와 릴리스 노트에서만 관리합니다.
> 제작 크레딧도 About 이 아니라 README · 게임 내 크레딧 · `NOTICE.md` 에 둡니다.

---

## 1. GitHub About — Description

GitHub 의 Description 칸은 **350자**까지 들어갑니다. 저장소의 기본 언어가 한국어이므로
기본값은 **한국어 한 줄**을 권합니다. 두 언어를 한 칸에 넣고 싶으면 1-3 을 씁니다.

### 1-1. 한국어 (권장 · 117자)

> 별이 잠든 땅을 파고, 짓고, 싸우며 건너는 스토리 중심 2D 샌드박스 어드벤처. 채굴·제작·전투에 농사·낚시·설비 자동화까지 — 설치 없이 브라우저에서 바로 하는 순수 HTML5 + JavaScript 게임.

### 1-2. English (200자)

> A story-driven 2D sandbox adventure through the land where the stars sleep. Mine, craft and fight, then farm, fish and automate production — pure HTML5 + JavaScript, playable instantly in the browser.

### 1-3. 두 언어 한 칸 (243자)

> 별이 잠든 땅을 파고, 짓고, 싸우며 건너는 스토리 중심 2D 샌드박스 어드벤처. 설치 없이 브라우저에서 바로. · A story-driven 2D sandbox adventure: mine, craft, fight, farm, fish and automate your way across the land where the stars sleep. Pure HTML5 + JavaScript, playable in the browser.

## 2. GitHub About — 나머지 칸

| 칸 | 넣을 것 |
|---|---|
| Website | `https://ashfall-chronicles.vercel.app/` |
| Topics | 아래 목록 |
| Releases · Packages · Deployments | Releases 만 켭니다(태그를 올리면 Actions 가 zip 을 붙입니다) |

Topics (GitHub 은 소문자·하이픈만 받습니다):

`html5-game` · `javascript` · `canvas` · `2d-game` · `sandbox-game` · `browser-game` ·
`pixel-art` · `crafting` · `automation` · `procedural-generation` · `rpg` · `korean`

## 3. 짧은 소개 / Short introduction

사이트 첫 화면·릴리스 노트 첫 줄·홍보 글에 쓰는 두세 문장입니다.

**한국어**

> 떨어진 별의 조각을 좇아, 잿빛에 먹혀 가는 땅을 파고 짓고 싸우며 건너세요.
> 길은 직접 내되, 장마다 이어지는 이야기가 다음에 갈 곳을 알려 줍니다.
> 숲과 사막, 무너진 유적과 기계 도시를 지나면 서쪽 끝에는 가라앉은 바다가 기다립니다.

**English**

> Follow the shards of a fallen star across a land slowly swallowed by ash — dig, build and fight your own way through.
> You carve the routes; a chapter-by-chapter story tells you where to go next.
> Past forests and deserts, buried ruins and a machine city, a sunken sea waits at the western edge.

## 4. 한 줄 태그라인 / Tagline

| 한국어 | English |
|---|---|
| 별이 잠든 땅 — 파고, 짓고, 싸우며 건너는 2D 샌드박스 | The land where stars sleep — dig, build and fight your way across |

---

### 고칠 때 확인할 것

- 1-1 · 1-2 · 1-3 은 **350자 안**이어야 합니다(괄호 안 글자 수는 공백 포함).
- 게임에 없는 것을 약속하지 않습니다 — 멀티플레이·Steam·모바일은 아직 없습니다.
- "브라우저에서 바로"는 웹 개발판 기준입니다. 내려받는 판도 서버 없이
  `index.html` 을 열면 돌기 때문에 About 문구는 둘 다에 맞습니다.
