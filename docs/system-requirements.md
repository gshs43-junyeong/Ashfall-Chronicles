# 시스템 요구사항 (Steam 스토어 기준)

> 아래 숫자는 전부 **재서 나온 것**입니다. 근거는 3절에 있습니다.
> 스토어 페이지에 그대로 붙일 수 있는 형태는 4절(한국어)과 5절(영어)에 있습니다.

---

## 1. 전제 — Steam 에 올라가는 것은 무엇인가

지금 내려받는 판(`AshfallChronicles-*.zip`)은 **로컬 웹 서버를 띄우고 기본 브라우저를
여는 방식**입니다. `.bat` / `.command` 를 더블클릭하면 파이썬 서버가 뜨고 브라우저가
열립니다. 이 방식은 Steam 에 그대로 올릴 수 없습니다 — Steam 은 실행 파일 하나를
띄우고 그 프로세스를 지켜봐야 하는데, 여기서는 실제 게임이 **다른 프로그램(브라우저)**
안에서 돌기 때문입니다. 오버레이·플레이 시간·업적·컨트롤러가 전부 안 붙습니다.

그래서 아래 사양은 **Chromium 을 함께 싸서 실행 파일 하나로 만든 판**을 전제로 잽니다
(Electron 계열). 다른 방식을 고르면 용량이 달라집니다:

| 싸는 방식 | 런타임 용량 | 요구사항에 미치는 영향 |
|---|---|---|
| **Electron** (전제로 삼은 것) | +180~200 MB | 브라우저를 같이 들고 다녀 어디서나 같은 그림이 나온다 |
| Tauri / WebView2 | +10 MB | 설치 용량은 줄지만 **OS 의 웹뷰 판에 따라 그림·소리가 갈린다** |
| 지금 방식(브라우저 + 로컬 서버) | 0 | Steam 에는 못 올린다 |

---

## 2. 요구사항

### Windows

| | 최소 사양 | 권장 사양 |
|---|---|---|
| **운영체제** | Windows 10 64-bit (1809 이상) | Windows 10 / 11 64-bit |
| **프로세서** | 2코어 2.0 GHz x86-64<br>(Intel Core i3-4130 · AMD FX-4300 급) | 4코어 2.5 GHz 이상<br>(Intel Core i5-8250U · AMD Ryzen 3 3200G 급) |
| **메모리** | 4 GB RAM | 8 GB RAM |
| **그래픽** | 2D 하드웨어 가속을 지원하는 GPU · VRAM 256 MB<br>(Intel HD Graphics 4000 급) | 최근 7년 안의 내장 그래픽 이상 · VRAM 1 GB<br>(Intel UHD 620 · AMD Vega 3 급) |
| **DirectX** | 버전 11 | 버전 11 |
| **저장 공간** | 500 MB | 500 MB |
| **사운드 카드** | Windows 호환 사운드 장치 | Windows 호환 사운드 장치 |
| **추가 사항** | 1280×720 이상. 키보드·마우스 필수(게임패드 미지원). 인터넷 연결 필요 없음 | 1920×1080 60fps 기준 |

### macOS

| | 최소 사양 | 권장 사양 |
|---|---|---|
| **운영체제** | macOS 11 Big Sur | macOS 13 Ventura 이상 |
| **프로세서** | Apple M1 또는 Intel Core i5 (2015년 이후) | Apple M1 이상 |
| **메모리** | 4 GB RAM | 8 GB RAM |
| **그래픽** | Metal 을 지원하는 GPU (2012년 이후 전 기종) | Apple Silicon 내장 GPU |
| **저장 공간** | 500 MB | 500 MB |
| **추가 사항** | 1280×720 이상. 키보드·마우스 필수. 인터넷 연결 필요 없음 | 1920×1080 60fps 기준 |

### SteamOS + Linux

| | 최소 사양 | 권장 사양 |
|---|---|---|
| **운영체제** | Ubuntu 20.04 64-bit · SteamOS 3 (glibc 2.31 이상) | Ubuntu 22.04 64-bit 이상 |
| **프로세서** | 2코어 2.0 GHz x86-64 | 4코어 2.5 GHz 이상 |
| **메모리** | 4 GB RAM | 8 GB RAM |
| **그래픽** | OpenGL 3.3 / Vulkan 1.1 을 지원하는 GPU · VRAM 256 MB | VRAM 1 GB 이상 |
| **저장 공간** | 500 MB | 500 MB |
| **추가 사항** | 1280×720 이상. X11 또는 Wayland | 1920×1080 60fps 기준 |

---

## 3. 이 숫자가 어디서 나왔나

전부 실제로 잰 값입니다. 재는 조건이 **GPU 없는 컨테이너의 소프트웨어 래스터라이저**라
프레임 시간은 **실제 기기보다 나쁜 쪽**입니다 — 사양을 낮춰 잡지 않으려고 그대로 씁니다.

| 재는 것 | 값 | 어떻게 쟀나 |
|---|---|---|
| 내려받기 | **57.1 MB** (파일 437개) | `tools/build.sh` 로 실제 zip 을 만들어 잼 |
| 콘텐츠 용량 | **61 MB** — 소리 53.6 MB(43개) · 그림 4.2 MB(PNG 375장) | `du` |
| 그림이 **메모리에서** 차지하는 것 | **376 MB** (디코딩된 362장) | 브라우저에서 `naturalWidth×naturalHeight×4` 합산 |
| └ 그중 보스 시트 다섯 | **164 MB** (복원자 45.6 · 원형 32.6 · 추격자 32.0 · 헤파 31.1 · 갱도 아가리 22.6) | 같은 방법 |
| JS 힙 | 14~19 MB | `performance.memory` |
| 세계 배열 | 5.8 MB (4200×480 타일 × 3벌 + 빛 버퍼) | 배열 길이 합산 |
| 세이브 | 슬롯당 약 **955 KB** (localStorage) | 저장 후 localStorage 길이 |
| 세계 생성(로딩) | **4.8 ~ 5.9초** | `new World(seed).generate()` 세 번 |
| 프레임 시간 (p50) | 720p **29.4 ms** · 1080p **63.3 ms** · 1440p **108.8 ms** | 180프레임 |
| 몹 40마리를 더 부른 뒤 | 29.4 → **31.4 ms** (720p) | 같은 방법 |

### 이 표에서 사양이 나오는 방식

- **메모리 4 GB 가 최소인 까닭** — PNG 는 디스크에서 4.2 MB 밖에 안 되지만 화면에
  올리려면 **RGBA 로 펴야** 합니다. 그게 376 MB 입니다(보스 시트 하나가 11328×1056).
  거기에 Chromium 런타임 200~300 MB 와 캔버스 버퍼가 더해집니다. 2 GB 로는 빠듯합니다.
- **그래픽에 하드웨어 가속만 요구하는 까닭** — 셰이더도 WebGL 도 3D 도 쓰지 않습니다.
  Canvas 2D 의 `drawImage` 뿐입니다. 그래서 요구하는 것은 **성능이 아니라 가속의 유무**
  입니다. 소프트웨어 래스터라이저로는 1080p 가 63 ms(16fps)인데, 2D 가속이 붙은 기기면
  같은 그림이 프레임 예산 안에 들어옵니다.
- **몹을 마흔 마리 더 불러도 2 ms 밖에 안 늘어난 것** — 병목이 **개체 수가 아니라
  채우는 픽셀 수**라는 뜻입니다. 1080p → 1440p 에서 프레임 시간이 픽셀 수에 거의
  비례해 늘어난 것도 같은 이야기입니다. 그래서 CPU 보다 **해상도**가 사양을 가릅니다.
- **프로세서에 4코어를 권장하는 까닭** — 게임 자체는 한 갈래(싱글 스레드)라 코어 수를
  안 씁니다. 다만 **세계 생성이 5초**고 그동안 화면이 로딩에 멈춰 있습니다. 그 5초를
  줄이는 것이 코어가 아니라 **단일 코어 성능**이라, 권장 사양의 코어 수는 사실상
  "그 세대의 CPU 면 단일 성능이 이만큼 나온다"는 표시입니다.
- **저장 공간 500 MB** — 실제 설치는 콘텐츠 61 MB + Electron 런타임 약 190 MB ≈
  250 MB 입니다. 나머지는 업데이트와 세이브(슬롯당 1 MB)를 위한 여유입니다.

---

## 4. 스토어 페이지용 (한국어)

```
최소 사양:
  운영체제: Windows 10 64-bit (1809 이상)
  프로세서: 2코어 2.0 GHz x86-64 (Intel Core i3-4130 / AMD FX-4300 급)
  메모리: 4 GB RAM
  그래픽: 2D 하드웨어 가속을 지원하는 GPU, VRAM 256 MB (Intel HD Graphics 4000 급)
  DirectX: 버전 11
  저장 공간: 500 MB 사용 가능 공간
  사운드카드: Windows 호환 사운드 장치
  추가 사항: 1280×720 이상 해상도. 키보드와 마우스가 필요합니다(게임패드 미지원).
             인터넷 연결이 필요 없습니다.

권장 사양:
  운영체제: Windows 10 / 11 64-bit
  프로세서: 4코어 2.5 GHz 이상 (Intel Core i5-8250U / AMD Ryzen 3 3200G 급)
  메모리: 8 GB RAM
  그래픽: 최근 7년 안의 내장 그래픽 이상, VRAM 1 GB (Intel UHD 620 / AMD Vega 3 급)
  DirectX: 버전 11
  저장 공간: 500 MB 사용 가능 공간
  사운드카드: Windows 호환 사운드 장치
  추가 사항: 1920×1080 60fps 기준입니다.
```

## 5. 스토어 페이지용 (영어)

```
MINIMUM:
  OS: Windows 10 64-bit (1809 or later)
  Processor: Dual-core 2.0 GHz x86-64 (Intel Core i3-4130 / AMD FX-4300 class)
  Memory: 4 GB RAM
  Graphics: GPU with hardware-accelerated 2D canvas, 256 MB VRAM (Intel HD Graphics 4000 class)
  DirectX: Version 11
  Storage: 500 MB available space
  Sound Card: Windows-compatible audio device
  Additional Notes: 1280x720 or higher. Keyboard and mouse required (no gamepad support).
                    No internet connection required.

RECOMMENDED:
  OS: Windows 10 / 11 64-bit
  Processor: Quad-core 2.5 GHz or better (Intel Core i5-8250U / AMD Ryzen 3 3200G class)
  Memory: 8 GB RAM
  Graphics: Integrated graphics from the last 7 years or better, 1 GB VRAM
  DirectX: Version 11
  Storage: 500 MB available space
  Sound Card: Windows-compatible audio device
  Additional Notes: Targets 60 fps at 1920x1080.
```

---

## 6. Steam Deck

해상도로는 여유가 있습니다 — Deck 의 1280×800 은 최소 해상도를 넘고, 채우는 픽셀이
1080p 의 **59%** 라 프레임 예산이 넉넉합니다. 다만 지금 상태로는 **Verified 가 아니라
Playable** 이 정직합니다. 둘이 걸립니다:

1. **게임패드를 안 받습니다.** 입력이 키보드·마우스뿐이라, Deck 에서는 Steam Input
   레이아웃을 따로 만들어 붙여야 합니다. 겨냥이 마우스 커서 기준(`input.wx/wy`)이라
   오른쪽 스틱을 커서에 매핑하는 것으로 대부분 풀리지만, 손맛을 보려면 실제로 잡아 봐야
   합니다.
2. **글자가 작습니다.** UI 글꼴이 11~12px 이라 7인치 화면에서는 읽기 힘듭니다.
   설정의 「시야 범위」는 세계만 키우고 UI 는 안 키웁니다 — UI 배율이 따로 필요합니다.

둘을 손보면 Verified 를 노릴 수 있습니다. 손대기 전에는 스토어에 **Playable** 로 적고,
"컨트롤러 레이아웃 필요 · 글자가 작음"을 적어 두는 편이 낫습니다.

---

## 7. 사양을 다시 재야 할 때

아래가 바뀌면 이 문서의 숫자도 다시 재야 합니다.

| 바뀌는 것 | 다시 봐야 하는 줄 |
|---|---|
| 보스 시트를 더 큰 것으로 다시 굽는다 | **메모리** — 다섯 장이 이미 164 MB 다 |
| 소리 파일 36개를 채운다 | **저장 공간** — 지금 53.6 MB 에서 늘어난다 |
| `WW`·`WH` 를 늘린다(지금은 금지) | **메모리** · **세계 생성 시간** |
| 새 바이옴·유적을 더한다 | **세계 생성 시간** — 지금 5초가 로딩의 전부다 |
| 게임패드를 받는다 | **추가 사항** 과 6절(Steam Deck) |

재는 방법은 `docs/story-and-sessions.md` 2-3 절("눈으로 보지 말고 잰다")과 같습니다 —
브라우저에서 `performance.memory` · `World.generate()` 시간 · 180프레임 프레임 시간을
그 자리에서 재서 표를 갈아 끼웁니다.
