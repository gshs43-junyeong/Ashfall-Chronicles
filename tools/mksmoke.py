#!/usr/bin/env python3
"""용광로 굴뚝에서 오르는 검은 연기를 굽는다.

  fx/smoke_forge.png   16x16 x 6프레임

■ 왜

  용광로는 불구멍이 깜빡이는 것 말고는 아무 일도 안 하고 있었다. 쇠를 녹이는
  물건인데 굴뚝이 조용하다. 굴뚝은 세 레벨 다 같은 자리에 있다(논리 x 9~21,
  가운데 15 · 꼭대기 y 6).

■ 규칙 (게임의 다른 이펙트 시트와 같다)

  16x16 원본으로 그린 뒤 4배 최근접 확대, 프레임 사이 4px 틈.
  manifest.json 의 fx.smoke 가 그 규격으로 잘라 쓴다(scale 4 · gap 4 ·
  frameW/H 16 · count 6).

■ 여섯 장이 하는 일

  한 덩이가 **살아 있는 동안 여섯 장을 차례로 지난다.** 그래서 올라가는 내내
  모양이 바뀐다 — 같은 그림이 커지기만 하는 게 아니다.

    1  갓 나온 것. 작고 빽빽하다
    2  부풀기 시작. 위쪽이 먼저 부푼다
    3  두 덩이로 갈라진다
    4  세 덩이. 가운데가 얇아진다
    5  가운데가 뚫린다. 가장자리가 헤진다
    6  가닥만 남는다

■ 색

  진짜 검정(#000)은 동굴 배경에서 안 보이고 하늘에서는 구멍처럼 보인다.
  따뜻한 진회색 세 단계를 쓴다 — 하늘에서는 어둡게, 바위 앞에서는 밝게 읽힌다.

사용법:  python3 tools/mksmoke.py
"""
import math, os, random
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'fx')
N, S, GAP, FRAMES = 16, 4, 4, 6
C = N / 2 - 0.5

CORE = (0x17, 0x14, 0x12)     # 가장 빽빽한 속 — 거의 검다
MID = (0x2c, 0x27, 0x22)      # 몸통
RIM = (0x6e, 0x64, 0x57)      # 가장자리 — 여기가 배경과 갈라지는 선이다.
                              # 속만 검게 두면 어두운 바위 앞에서 통째로 사라진다


def rnd(v):
    """파이썬 round() 는 .5 를 **짝수 쪽으로** 보낸다(6.5→6, 7.5→8, 8.5→8).
       가운데가 7.5 인 16칸 격자에서는 그 탓에 열이 통째로 빠져 덩이에 구멍이 났다.
       .5 는 늘 위로 올린다."""
    return int(math.floor(v + 0.5))


def put(px, x, y, rgb, a):
    if not (0 <= x < N and 0 <= y < N) or a <= 0:
        return
    a = min(1.0, a)
    old = px[x, y]
    if a * 255 > old[3]:
        px[x, y] = (rgb[0], rgb[1], rgb[2], int(a * 255))


def lobe(px, cx, cy, r, alpha, hollow=0.0):
    """둥근 덩이 하나 — 속을 꽉 채우고 가장자리 한 겹만 밝게.
       hollow>0 이면 가운데부터 비어 간다(마지막 두 장에서 쓴다)."""
    rr = int(r + 2)
    for y in range(-rr, rr + 1):
        for x in range(-rr, rr + 1):
            d = math.hypot(x, y)
            if d > r:
                continue
            edge = d > r - 1.1
            a = alpha * (0.9 if edge else 1.0)
            if hollow > 0 and d < r * hollow:
                a *= max(0.0, (d / (r * hollow)) ** 1.6)
            rgb = RIM if edge else (MID if d > r * 0.5 else CORE)
            put(px, rnd(C + cx + x), rnd(C + cy + y), rgb, a)


def frame(i):
    """i번째(0~5) 프레임 하나."""
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    px = im.load()
    rng = random.Random(1000 + i)          # 판마다 같은 그림이 나오도록 고정 시드
    t = i / (FRAMES - 1.0)                 # 0 → 1

    if i == 0:
        lobe(px, 0, 1.5, 2.6, 0.95)
    elif i == 1:
        lobe(px, 0, 0.8, 3.4, 0.92)
        lobe(px, -0.8, -1.6, 2.1, 0.8)
    elif i == 2:
        lobe(px, -1.4, 0.4, 3.2, 0.88)
        lobe(px, 1.8, -0.8, 2.8, 0.85)
    elif i == 3:
        lobe(px, -2.2, 0.8, 3.0, 0.8)
        lobe(px, 1.6, -1.4, 3.2, 0.82)
        lobe(px, 2.6, 2.0, 2.2, 0.7)
    elif i == 4:
        lobe(px, -3.0, 0.6, 2.8, 0.62, hollow=0.5)
        lobe(px, 1.2, -2.4, 2.6, 0.6, hollow=0.5)
        lobe(px, 2.8, 2.2, 2.4, 0.55, hollow=0.5)
        # 헤진 가닥
        for _ in range(5):
            a = rng.uniform(0, math.tau)
            d = rng.uniform(4.5, 6.4)
            put(px, rnd(C + math.cos(a) * d), rnd(C + math.sin(a) * d), RIM, 0.45)
    else:
        for _ in range(14):
            a = rng.uniform(0, math.tau)
            d = rng.uniform(3.4, 6.8)
            put(px, rnd(C + math.cos(a) * d), rnd(C + math.sin(a) * d), RIM, 0.34)
        lobe(px, -1.0, -1.0, 2.0, 0.26, hollow=0.85)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    W = FRAMES * N * S + (FRAMES - 1) * GAP
    sheet = Image.new('RGBA', (W, N * S), (0, 0, 0, 0))
    for i in range(FRAMES):
        big = frame(i).resize((N * S, N * S), Image.NEAREST)
        sheet.paste(big, (i * (N * S + GAP), 0))
    p = os.path.normpath(os.path.join(OUT, 'smoke_forge.png'))
    sheet.save(p)
    print('%s  %dx%d  (%d프레임 · %dx%d · %d배 · 틈 %d)'
          % (p, W, N * S, FRAMES, N, N, S, GAP))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
