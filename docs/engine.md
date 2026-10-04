# 엔진 안내 — `src/engine`

[← 문서 안내](README.md) · 예제: [`examples/sample`](../examples/sample/README.md) · 계획: [v1.1.1 엔진화](update/v1.1.1-engine-plan.md)

`src/engine` 은 Ashfall Chronicles 에서 떼어 낸 **게임을 모르는** 2D 타일 게임 엔진입니다. TypeScript(strict)이고,
게임 고유값(타일 표 · 키 · 곡 · DB 이름 …)은 전부 `create*({…})` 설정이나 생성자 인자로 받습니다.
엔진만으로 도는 최소 게임이 [`examples/sample`](../examples/sample/) 에 있고, `npm run test:sample` 이 그것을 헤드리스로 돌려 확인합니다.

## 1. 원칙 — 지키지 않으면 조용히 망가진다

| 원칙 | 왜 · 무엇이 막나 |
|---|---|
| **엔진은 게임을 import 하지 않는다** | `src/engine` → `src/game` 은 금지. 게임 값은 설정으로 넘긴다. `npm run test:modules` 가 막는다 |
| **예제는 엔진만 import 한다** | 엔진이 게임 가정에 기대기 시작하면 예제가 먼저 깨진다. `npm run test:sample` 이 막는다 |
| **클래스 필드는 `declare`** | 필드 정의(`x = 0`)를 내보내면 속성 순서 · 초기화 시점이 바뀐다. `TileMap` · `Entity` 를 잇는 쪽도 새 필드는 `declare` 로 |
| **결정론** | `RNG`(mulberry32) · `hashStr` · `tileHash` 한 줄만 바꿔도 모든 세계가 달라진다(`tests/gen-hash`). `bakeAtlas` 는 칸을 **행 → 열** 순서로 그린다 — 공유 난수를 쓰면 그 순서가 곧 그림이다 |
| **뜨거운 길에 분기를 더하지 않는다** | `TileMap.get` · `solid` 는 생성에서 수백만 번 불린다 — `get` 이 `inB` 를 부르게만 해도 생성이 16% 느려졌다 |
| **타일은 `set()` 으로만** | 게임이 `set` 을 덮어써 바뀐 칸을 알아챈다(조명 · 유체 · 지도). `tiles[i] = x` 는 그 알림을 건너뛴다 |
| **클래식 스크립트 하나로 묶는다** | esbuild IIFE — `file://`(zip)에서 `<script type=module>` 이 막히기 때문. 묶기는 `tools/bundle.mjs` |

## 2. 빠른 시작 — 예제 게임

```bash
npm ci                         # 처음 한 번
node tools/bundle.mjs          # src/game → play/js/ashfall.js · examples/sample/src → examples/sample/sample.js
# 열기: examples/sample/index.html 을 브라우저로(file:// 로도 된다) — ?lang=en 영어 · ?touch=1 터치 조작
npm run test:sample            # 엔진 밖 import 0 · 서기 · 걷기 · 캐기 · 멈춤 · 저장/불러오기 · 콘솔 오류 0
```

예제(`examples/sample/src`, 두 파일 약 300줄)가 쓰는 것:

| 파일 | 엔진 모듈 |
|---|---|
| `tiles.ts` — 타일 표 · 세계 만들기 · 아틀라스 | `core/rng` · `core/noise` · `core/color` · `tilemap/tilemap` · `render/atlas` |
| `main.ts` — 입력 · 플레이어 · 카메라 · 빛 · 씬 · 저장 · 번역 · 터치 | `core/loop` · `core/math` · `entity/entity` · `input/*` · `platform/viewport` · `render/pipeline` · `scene/scenes` · `tilemap/light` · `i18n/*` · `save/*` |

**새 게임을 시작하려면** `examples/sample` 을 통째로 복사하고, `tools/bundle.mjs` 의 `SAMPLE` 처럼 묶기 설정 하나와
`tsconfig.json` 의 `include`(이미 `examples/*/src/**/*.ts`)를 확인하면 됩니다.

## 3. 한 프레임의 모양

```
startLoop(dt => scenes.frame(dt), 1/20)          core/loop — dt 는 maxDt 에서 자른다(탭을 비웠다 돌아와도 안 튄다)
  └ scenes.frame(dt)                              scene/scenes — 멈춤 겹이 없으면 update, 그리고 늘 render
      ├ update(dt)   입력(input.held) → Entity 이동 조각 → 카메라
      └ render()     pipe.run(frame)              render/pipeline — 단계 순서대로(sky → tiles → actors → light → hud …)
```

## 4. 모듈별 API

### core — 수학 · 난수 · 잡음 · 색 · 루프 · 조각 붙이기

| 이름 | 쓰임 |
|---|---|
| `clamp` · `lerp` · `inv(a, b, v)` · `TAU` · `aabb(a, b)` · `dist` · `dist2` · `angleTo` | 수학(`core/math`) |
| `new RNG(seed)` → `next()` · `range(a,b)` · `int(a,b)` · `chance(p)` · `pick(arr)` · `weighted([[값, 무게]…])` | 결정론 난수(문자열 씨앗은 `hashStr`) |
| `hashStr(s)` · `tileHash(x, y)` | 문자열 해시 · 칸 좌표 해시(0..1, 질감용) |
| `makeNoise1D(rng, oct)` → `(x, freq?, persist?)` · `makeNoise2D(rng)` → `(x, y, freq?, oct?, persist?)` | 지형선 · 동굴 값 잡음(0..1) |
| `shade(hex, amt)` · `mixHex(a, b, t)` | 색 밝기 · 섞기 |
| `startLoop(frame, maxDt)` | rAF 루프 — `frame(dt, rawDt)`. 다음 프레임을 먼저 걸어 frame 이 던져도 루프는 산다 |
| `mixin(target, part, classLike?)` | 큰 객체를 파일 여럿으로 나눠 붙인다 — 이름이 겹치면 **던진다**(뒤엣것이 조용히 덮지 않게) |

### tilemap — 타일맵 · 빛

```ts
class TileMap {
  constructor(w, h, ts, defs: TileDef[], edge)   // edge = 경계 밖을 읽으면 돌려줄 타일(보통 부술 수 없는 벽)
  tiles · walls · explored: Uint8Array            // 행 우선(w×h) — 세이브에 번호 그대로 담긴다
  get(x, y) · set(x, y, t) · wall · setWall · inB · i(x, y)
  solid(x, y)  // defs[id].solid === 1   ·   platform(x, y) // === 2(위에서만 막힘)   ·   liquid(x, y)
  hitSolid(px, py, w, h) · hitPlatform(px, py, w, h, prevBottom)   // 픽셀 사각형 판정 — Entity 가 쓴다
}
```

- `TileDef` 는 `{ solid?: 1 | 2, liquid? }` 만 엔진이 읽는다 — 이름 · 색 · 단단함 같은 나머지는 게임이 얹는다(예제 `SampleTile`).
- `sweepLight(L, w, h, x0, y0, passes, dec(x, y))` — 씨앗을 넣어 둔 `L`(w×h 칸)을 네 방향으로 번지게 한다. 무엇이 빛을 얼마나 먹는지는 `dec` 로 게임이 정한다.
- `sweepLightGrid(L, w, h, passes, dec, op?)` — 같은 일을 칸마다 미리 잰 표(`dec: Float32Array`)로 더 빠르게. `op` 를 주면 막힌 칸(1)은 빛을 받되 트인 칸으로 넘기지 않는다(벽 너머로 새지 않게).
- `castPointLight(strength, falloff, blocked(dx, dy))` → `{ r, v }` — 점 광원 하나가 둘레 (2r+1)² 칸에 주는 빛. 칸마다 광선을 쏘아 사이에 막힌 칸이 있으면 그늘(칸 안 다섯 점 — 가장자리가 부드럽다). 광원이 움직이지 않으면 결과를 저장해 두고 둘레가 바뀔 때만 다시 잴 것.

### entity — 위치 · 속도 · 칸 충돌 이동

`class Entity(x, y, w, h)` — `vx vy onGround hitWall dead` · `cx cy` · `rect()`. 이동은 **조각**으로 부른다:

```ts
e.moveX(map, nx, step, retry)          // 막히면 바닥에 선 채로 step px 올라 retry 로 다시(계단), 그래도 막히면 붙고 멈춤
e.fall(dt, grav, up, cap)              // 중력 — vy 를 [up, cap] 로
e.moveY(map, ny, prevBottom, platforms)// 막히면 붙고(내려가다 막히면 onGround), 아니면 발판에 선다
e.keepIn(x0, x1, yMax)                 // 세계 안에 가둔다
```

★ 조각 안의 순서(계단 → 한 픽셀씩 붙기 · 막힘 → 발판)가 곧 손맛입니다 — 바꾸면 벽 · 발판에 붙는 자리가 1px 씩 달라집니다.
물 · 바람처럼 속도를 바꾸는 것은 게임이 조각 **사이**에 끼웁니다(Ashfall 은 헤엄 · 사다리 · 대시).

### render — 파이프라인 · 아틀라스 · 연결 타일

| 이름 | 쓰임 |
|---|---|
| `createPipeline<F>(['sky', 'tiles', …])` → `add(단계, fn)` · `run(frame)` · `profile(on)` · `stats()` · `names()` | 이름 붙은 단계를 정해진 순서로. 없는 단계에 `add` 하면 **던진다**. 한 단계 안은 건 순서대로(캔버스 상태가 이어진다) |
| `tileView(camX, camY, W, H, ts)` → `{tx0, tx1, ty0, ty1}` | 화면에 걸친 칸 범위 |
| `bakeAtlas(ts, cols, rows, paint(g, ox, oy, row, col))` | 칸마다 **잘라서** 굽는다 — 안 자르면 옆 칸 붓질이 새어 경계에 줄이 생긴다 |
| `blitCell(c, atlas, ts, col, row, sx, sy, h?)` · `clipCell` · `cacheGet(map, key, make, max)` | 칸 하나 그리기 · 칸 가두기 · 그림 캐시(넘치면 통째로 비움) |
| `createConnTiles({ ts, bodyOnly, solid })` → `add(id, draw)` · `draw(…)` | 이웃을 보고 그리는 타일 틀(몸통만 그리기 · 번호별 그리기) |

### input — 액션 · 마우스 · 터치

- `createInput({ actions: [{ id, def: ['KeyA', …] }], custom: () => 사용자 키 })` → `held(id)` · `isKey(id, code)` · `keysFor(id)` · `keys` · `virt` · `bindKeyboard({ capture?, down?, blur? })`.
  **게임은 키가 아니라 액션을 묻습니다** — 키는 사용자가 다시 매기고, 터치 단추는 `virt[액션] = 1` 로 켭니다.
- `bindPointer(canvas, st, { rightDown?, wheel? })` — `st = { m1, m2, mx, my }`(화면 CSS px)에 적는다. 누름은 캔버스에서, 뗌 · 이동은 창 전체에서.
- `mountTouch({ input, ptr, surface, buttons: [{ id, label }], altLabel, rightDown? })` → `{ el, destroy() }` — 가상 스틱(left/right/down) · 단추 · 탭(= 마우스 칸) · 전환 단추(탭을 오른쪽 단추로). 오른쪽 단추 높이는 CSS 변수 `--ti-bottom`.

### scene · platform

- `createScenes({ scenes: { 이름: { update?, render? } }, layers: { 이름: { pause?, input? } }, start })` →
  `current` · `go(씬)` · `open/close/set/has(겹)` · `top()` · `paused()` · `inputBlocked()` · `frame(dt)`.
  바닥 씬은 하나, 겹(멈춤 · 창)은 이름으로 연다. **그리기는 막지 않는다** — 멈춘 화면도 그린다.
- `fitCanvas(canvas, ctx, zoom, dprMax = 2)` → `{ W, H }` — 캔버스를 창 × DPR 로 잡고 zoom 배로 그린다. 돌려주는 W · H 는 **월드 좌표로 본 시야**. DPR 은 2 에서 자른다(3배 화면에서 채움 비용이 2.25배).

### save — 저장소 · 서명 · RLE · 판올림

| 이름 | 쓰임 |
|---|---|
| `createSaveStore({ dbName, slots, slotKey, sigKey, sign, head, sealOk })` → `start()` · `put(slot, text, head, sig?)` · `get(slot)` → `{ raw, sig }` · `remove` · `list` · `migrate` | IndexedDB(gzip + 서명), 안 열리면 localStorage. ★ 세이브를 읽고 쓰는 곳은 전부 이것을 거친다 |
| `makeSigner(salt)` → `sign(text)` | 고쳐 쓴 기록을 가려내는 서명(FNV-1a 두 벌) |
| `rleEncode(arr)` → 글자열 · `rleDecode(s, len, Uint8Array)` | 타일 배열 압축(한 토막 두 글자 — Ashfall 소형 세이브 119만 → 52만 글자) |
| `upgrade(d, steps)` | 판올림 사슬 — `steps[i]` 는 판 i+1 → i+2. **판 번호는 `steps.length + 1`** 로 저절로 오른다(손으로 올리지 않는다) |

### i18n — 번역

- `createI18n({ source, lang, locales: { en: { msgs, tables } }, fallback, hooks })` → `tr(원문, 값)` · `applyTables(roots)` · `isSource`.
  **원문이 곧 열쇠**입니다 — 원본 언어에서는 번역을 찾지 않고 원문을 그대로 씁니다. 표(아이템 이름 등)는 id 경로(`ITEMS.wood.n`)로 덮습니다.
- 형식(`i18n/format`): `{이름}` · `{이름|훅}`(언어 문법) · `{n, plural, one {…} other {…}}` · `{x, select, …}`. 원문에 `{ }` 글자는 못 씁니다.
- 한국어 조사(`i18n/ko`): `koParticle` 을 훅으로 걸면 `{name|을}` 이 받침에 맞춰 `을/를` 을 붙입니다. `josa` · `josaRo` · `iga` · `eulreul` · `eunneun`.
- `fontStack(lang, source, base)` · `collectTables(roots, keep)`(추출 도구용).

### audio · assets · ui

| 이름 | 쓰임 |
|---|---|
| `createMusic({ tracks, fallback })` → `play(key, fast?)` · `update(dt)` · `armStart(getKey)` | 곡 넘김(교차 페이드) · 없는 파일은 대체 곡 |
| `createSfx({ dir, files, fam, gap, vol, start })` → `init()` · `play(kind, rate?, vol?)` | 효과음 — 목소리 여럿 돌려 쓰기 · 최소 간격 · 파일 앞 무음 건너뛰기 |
| `createSfxLoop({…})` → `set(key, on, vol?)` · `idle()` | 이어지는 효과음(1초 파일을 0.9초에 겹쳐 잇는다) |
| `createAmbient({ dir, files })` → `step(key, vol)` | 환경음(두 벌을 겹쳐 끊김 없이) |
| `imageJob(src, onImage)` · `measurePad(im, fw, fh, scale)` · `ASSET_VER` · `aud(src)` | 그림 받기 · 시트 발 여백 재기(file:// 에서는 던진다 — 받아서 대체값으로) · 캐시 판 번호 |
| `createPanels(el)` → `show(id)` · `hide()` · `current` | 한 번에 하나 열리는 창('open' 클래스) |
| `createTooltip(el, opts)` → `show(html, x, y)` · `hide()` · `place` | 화면 밖으로 안 나가는 툴팁 |
| `makeSlot(cls, opts, host?)` · `paintSlot(el, cls, icon, count)` · `setIcon` | 아이콘 + 개수 칸 |

### net — 두 끝 잇기(멀티플레이 바탕)

| 이름 | 쓰임 |
|---|---|
| `Transport` — `send(ch, data)` · `onmessage(ch, data)` · `onclose` · `open` · `close()` | 통로 모양. `ch` 는 `'rel'`(순서·도착 보장) · `'fast'`(순서 없음·재전송 없음). 글자열만 싣는다 |
| `createLoopback({ latency, loss })` → `[a, b]` | 같은 탭 안의 두 끝(시험·흉내) — fast 만 `loss` 비율로 버린다 |
| `hostOffer(opts)` → `{ offer, accept(answer), cancel }` · `guestAnswer(offer, opts)` → `{ answer, ready, cancel }` | WebRTC — 후보를 다 모은 뒤 제안/응답 글 한 번씩만 주고받는다(중개 왕복을 두 번으로) |
| `chunkText(id, text)` · `createJoiner()` → `push(msg)` · `isChunk(msg)` | 큰 글(세계 스냅샷)을 16,000자 조각으로 · 순서가 섞여도 잇는다 |
| `new SnapBuffer(delay, cap)` → `push(t, state)` · `sample(now)` | 늦게 오는 상태를 delay 만큼 늦춰 두 장 사이를 보간(숫자 칸만) |
| `Signal` — `post(msg)` · `onmessage` · `close()` · (인터넷) `room` 약속 · `onerror` | 처음 서로 찾기(제안/응답 글 건네기). `createTabSignal(room)`(같은 브라우저 탭끼리) · `createWsSignal(url, { role, room, id })`(자체 WebSocket 중개 — `relay/`) · `createPeerSignal(url, { role, room, id, prefix, codeLen })`(PeerJS 서버를 우편함으로만) · `randomCode(n)` |

### 더 붙은 틀 — 게임을 모르는 도구들

Ashfall 이 손으로 들고 있던 일 중 다른 게임에도 쓰일 것을 엔진으로 옮겼다. 게임 값은 전부 설정이나 콜백으로 받는다.

| 파일 | 이름 | 쓰임 |
|---|---|---|
| `core/tween.ts` | `Tweens` · `EASE` · `pop` · `approach` | 시간 지난 뒤 할 일(`after`) · 값 보간 · 튀는 크기 |
| `core/spatial.ts` | `SpatialHash` | 칸 단위 공간 해시 — 투사체·몹 근처 찾기(`query` · `near`) |
| `core/daycycle.ts` | `DayCycle` | 하루 시각 → 낮빛 · 해·달 호 · 해 방향(`sunDir` — 그림자 각도) · 밤 |
| `core/timescale.ts` | `TimeScale` | 맞힐 때 잠깐 멈춤 · 슬로 모션 |
| `core/inventory.ts` | `stackAdd` · `countOf` · `takeOut` · `sortSlots` · `moveAll` · `quickStack` | 가방 칸 — 겹치기 규칙은 게임이(`StackRules`) |
| `core/loot.ts` | `rollLoot` · `mapPity` | 전리품 표 굴리기 · 연속 꽝 보정 |
| `core/achieve.ts` | `checkUnlocks` · `unlockProgress` | 조건 표로 업적 열기 |
| `tilemap/ray.ts` | `gridRay` · `lineOfSight` · `rayHit` · `seesBox` | 칸 광선 — 시야 · 지도 밝히기 · 몹 감각 |
| `tilemap/path.ts` | `findGroundPath` · `findOpenPath` · `PathFollower` | 걷는 몹(점프 높이 · 낙하 고려) · 나는 몹의 A* |
| `tilemap/lightfield.ts` | `LightField` | 빛 버퍼 · 점 광원 조각 캐시(`touch` 로 무효) · 해(`castSunlight`) — `World.computeLight` 가 쓴다 |
| `tilemap/cellqueue.ts` | `CellQueue` | 바뀐 칸만 다시 보는 칸 오토마타(유체) — 다 잰 뒤 한꺼번에 바꾼다 |
| `procgen/cells.ts` | `floodFill` · `distanceField` · `BoxSet` · `automataStep` · `poissonDisc` · `weightedKey` | 생성 도구 |
| `entity/sense.ts` · `steer.ts` · `status.ts` | `Senses` · `seek`/`flee`/`separation`/`wander` · `addDot`/`tickDots`/`Timed` | 보고 듣고 기억하기 · 조향 · 지속 피해 |
| `render/camera.ts` · `fade.ts` · `outline.ts` · `anim.ts` | `Camera` · `ScreenFade` · `drawOutlined` · `Animator`/`cycleFrame` | 따라가는 카메라(흔들림) · 화면 페이드 · 윤곽 · 장 넘김 |
| `render/minimap.ts` · `lightoverlay.ts` | `MapAtlas` · `drawTileWindow` · `LightOverlay` | 지도 아틀라스 · 빛 덮개 |
| `fx/particles.ts` · `floattext.ts` · `shapes.ts` · `trail.ts` · `precip.ts` · `wind.ts` | `Particle` · `FloatText` · `ShapeFx` · `Afterimages` · `Precip` · `Wind` | 입자 · 뜨는 숫자 · 고리/번개 · 잔상 · 비/눈 · 바람 |
| `fx/vfx.ts` | `Vfx` → `slash` · `shock` · `flare` · `sparks` · `sigil` · `shards` · `crack` · `column` · `puffs` · `reticle` · `beam` | 스킬 연출 도형 — 칼선 · 충격파 · 섬광 · 불티 줄기 · 마법진 · 얼음 조각 · 땅 갈라짐 · 빛기둥 · 연기 · 조준 · 빛줄기(빛은 더하기로 짧게, 연기만 보통 섞기). `vfx.art = (이름, 색) => 그림 | null` 을 걸면 칼선 · 충격파 · 섬광 · 마법진 · 빛기둥 · 빛줄기 · 연기를 그 그림으로 그린다(`ShapeFx.art` 는 고리 · 예고 원 = 'ring'). 안 걸면 도형 |
| `audio/spatial.ts` | `spatialMix` · `createPanRouter` | 거리 감쇠 · 좌우 소리 위치 |
| `input/gamepad.ts` | `createGamepad` | 패드 → 액션 |
| `save/settings.ts` · `autosave.ts` | `createSettingsStore` · `createAutosave` | 설정 저장 · 자동 저장 타이머 |
| `ui/toasts.ts` · `modal.ts` · `typewriter.ts` · `panzoom.ts` · `perf.ts` | `createToasts` · `confirmBox` · `typewrite` · `PanZoom` · `PerfPanel` | 알림 · 확인 창 · 한 글자씩 · 끌고 확대 · 성능 판(F3) |

## 5. Ashfall 은 엔진을 어떻게 쓰나

| 엔진 | 게임(`src/game`) |
|---|---|
| `TileMap` | `class World extends TileMap` — 타일 표 `TILE_DEF`, `set` 을 덮어써 조명 · 유체 · 지도를 깨운다 |
| `Entity` | `class Ent extends Entity` → `Player` · `Enemy` · 투사체. 헤엄 · 사다리 · 대시를 이동 조각 사이에 끼운다 |
| `createPipeline` | `G.pipe` — sky → light → far → tiles → machines → objects → ground → drops → actors → lighting → fx → screen |
| `createScenes` | `G.state` · `G.paused` · `G.uiOpen` 은 씬 스택의 접근자 |
| `createInput` · `mountTouch` | `KEY_ACTIONS`(data/start.ts) · 설정 창에서 다시 매긴 키 · `?touch=1` |
| `createSaveStore` · `upgrade` | `SaveStore` · `SAVE_UPGRADES`(CLAUDE.md §1-4) |
| `createI18n` | `tr` · `N_` · 로케일 6개(`src/game/locales`) |
| `mixin` | `G` · `UI` · `World` 를 조각 파일로 나눠 붙인다 |

## 6. 검사

`npm run test:net` — loopback · 조각 · 보간(노드) + 헤드리스 크롬 안의 실제 WebRTC 두 끝(20만 자 · fast 통로 · 끊김 알림).


```bash
npm run typecheck      # 엔진 · 예제 strict, 게임은 느슨하게(tsconfig.game.json)
npm run test:modules   # 순환 0 · 역방향 0 · 엔진 → 게임 0 · import 줄
npm run test:sample    # 예제: 엔진 밖 import 0 · 헤드리스 동작 · 콘솔 오류 0
npm run check          # 위 전부 + 세계 생성 해시 · 동작 · 스크린샷
```
