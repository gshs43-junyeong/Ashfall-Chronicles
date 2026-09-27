# 엔진 예제 — games/sample

`src/engine` **만** 써서 만든 최소 타일 게임입니다(게임 `src/game` 은 import 하지 않습니다). 엔진이 Ashfall 없이도 돈다는 증명이자,
새 게임을 시작할 때 복사해 쓰는 틀입니다. API 는 [docs/engine.md](../../docs/engine.md).

- 씨앗으로 만든 언덕 · 굴 · 떠 있는 발판 · 굴 속 횃불(240×90 칸)
- 걷기 · 점프 · 한 칸 턱 오르기 · 발판 위에 서기(↓ 로 내려가기)
- 왼쪽 클릭 캐기 · 오른쪽 클릭 놓기(1~4 · 휠로 블록 고르기) · 빛 번짐(하늘 · 횃불)
- P 멈춤(씬 겹) · S 저장 / L 불러오기(IndexedDB · 서명 · RLE · 판올림) · 한국어/영어(`?lang=en`) · 터치(`?touch=1`)

```bash
node tools/bundle.mjs      # src → sample.js (게임 번들과 함께 만든다 — 산출물도 커밋)
npm run test:sample        # 헤드리스 확인
```

`index.html` 을 브라우저로 열면 됩니다(file:// 로도 돈다). `sample.js` 는 산출물이니 손으로 고치지 말고 `src/` 를 고칠 것.
