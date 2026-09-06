#!/usr/bin/env python3
"""마법이 맞는 순간을 굽는다 — 원소마다 다른 세 장.

  fx/hit_arcane.png  64x64 x 6프레임   비전 (bolt · rune · wind · star)
  fx/hit_frost.png   64x64 x 6프레임   서리 — 얼음이 돋았다 부서진다
  fx/hit_soul.png    64x64 x 6프레임   영혼 — 보랏빛이 피어올라 흩어진다

■ 왜 새로 그리나

  여태 마법이 맞는 순간은 hit_impact.png 한 장이었다. 그건 **물리 타격**이다 —
  따뜻한 금빛에 살점이 튀는 듯한 유기적인 파편. 화살이나 검에는 맞지만, 서리
  지팡이가 맞았을 때도 금빛이 튀니 "마법이 닿았다"로 안 읽혔다.
  그래서 물리(hit_impact)는 그대로 두고, 마법용 셋을 따로 굽는다.

■ 규칙 (게임의 다른 시트와 같다)

  64x64 원본으로 그린 뒤 4배 최근접 확대, 프레임 사이 4px 틈.
  assets/manifest.json 의 fx.bursts 가 그 규격으로 잘라 쓴다(scale 4 · gap 4 ·
  frameW/H 64 · count 6). 값을 바꾸고 다시 돌리면 게임 쪽은 손댈 것이 없다.

■ 형태를 나눈 기준

  세 장이 색만 다르면 결국 같은 그림이다. **모양이 달라야** 구분이 선다.
    비전  각진 육각 — 규칙이 깨지는 느낌. 기하학적으로 뻗었다가 고리로 남는다
    서리  바늘 — 사방으로 얼음이 돋았다가 조각으로 부서진다
    영혼  연기 — 위로 피어오르는 갈래. 아래가 먼저 비고 위가 늦게 흩어진다
"""
import math, os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'fx')
N, S, GAP, FRAMES = 64, 4, 4, 6
C = N / 2 - 0.5


def blend(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def put(px, x, y, rgb, a):
    """알파를 겹쳐 찍는다. 이미 밝은 것이 있으면 더 밝은 쪽을 남긴다."""
    if not (0 <= x < N and 0 <= y < N) or a <= 0:
        return
    a = min(1.0, a)
    old = px[x, y]
    na = old[3] / 255.0
    if a >= na:
        px[x, y] = (rgb[0], rgb[1], rgb[2], int(a * 255))


def ring(px, r, w, rgb, a, squash=1.0):
    """반지름 r, 두께 w 의 고리."""
    rr = int(r + w + 2)
    for y in range(-rr, rr + 1):
        for x in range(-rr, rr + 1):
            d = math.hypot(x, y / squash)
            k = 1.0 - abs(d - r) / max(w, 0.001)
            if k > 0:
                put(px, int(C + x), int(C + y), rgb, a * k)


def spike(px, ang, r0, r1, half, rgb, a):
    """중심에서 뻗는 바늘 — r0 에서 r1 까지, 끝으로 갈수록 얇아진다."""
    steps = int((r1 - r0) * 2) + 2
    for i in range(steps + 1):
        t = i / steps
        r = r0 + (r1 - r0) * t
        w = half * (1 - t) + 0.4
        cx, cy = C + math.cos(ang) * r, C + math.sin(ang) * r
        for dy in range(-int(w) - 1, int(w) + 2):
            for dx in range(-int(w) - 1, int(w) + 2):
                if math.hypot(dx, dy) <= w:
                    put(px, int(cx + dx), int(cy + dy), rgb, a * (1 - t * 0.45))


def hexring(px, r, w, rgb, a, rot=0.0):
    """육각 고리 — 각진 마법진. 꼭짓점 여섯을 선으로 잇는다."""
    pts = [(C + math.cos(rot + i * math.pi / 3) * r,
            C + math.sin(rot + i * math.pi / 3) * r) for i in range(6)]
    for i in range(6):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % 6]
        steps = int(math.hypot(x1 - x0, y1 - y0) * 2) + 2
        for s in range(steps + 1):
            t = s / steps
            px_, py_ = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for dy in range(-int(w), int(w) + 1):
                for dx in range(-int(w), int(w) + 1):
                    if math.hypot(dx, dy) <= w:
                        put(px, int(px_ + dx), int(py_ + dy), rgb, a)


def core(px, r, rgb, a):
    for y in range(-int(r) - 2, int(r) + 3):
        for x in range(-int(r) - 2, int(r) + 3):
            d = math.hypot(x, y)
            if d <= r:
                put(px, int(C + x), int(C + y), rgb, a)
            elif d <= r + 1.6:
                put(px, int(C + x), int(C + y), rgb, a * (1 - (d - r) / 1.6))


# ---------------------------------------------------------------- 비전
A_CORE, A_HOT, A_MID, A_DIM = (240, 250, 255), (168, 220, 255), (96, 160, 232), (52, 88, 150)


def frame_arcane(f):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
    t = f / (FRAMES - 1)                       # 0 → 1
    rot = t * 0.5
    # 각진 고리 둘 — 바깥은 빨리 퍼지고 안쪽은 늦게 따라간다
    hexring(px, 6 + t * 24, 1.6 - t * 0.7, blend(A_MID, A_DIM, t), 0.95 - t * 0.55, rot)
    if f >= 1:
        hexring(px, 3 + t * 15, 1.3, blend(A_HOT, A_MID, t), 0.9 - t * 0.6, -rot * 1.7)
    # 여섯 갈래 — 고리 꼭짓점 방향으로
    for i in range(6):
        a = rot + i * math.pi / 3
        spike(px, a, 4 + t * 12, 10 + t * 26, 2.2 * (1 - t * 0.6),
              blend(A_HOT, A_MID, t), 0.85 - t * 0.6)
    # 심지 — 처음엔 하얗게 타고 금방 꺼진다
    if t < 0.75:
        core(px, 7 - t * 8, blend(A_CORE, A_HOT, t * 1.3), 1 - t * 1.1)
    return im


# ---------------------------------------------------------------- 서리
F_CORE, F_HOT, F_MID, F_DIM = (244, 253, 255), (198, 240, 255), (128, 200, 232), (74, 130, 168)


def frame_frost(f):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
    t = f / (FRAMES - 1)
    # 바늘 열둘 — 길이가 서로 달라야 결정처럼 보인다
    for i in range(12):
        a = i * math.pi / 6 + (0.13 if i % 2 else 0)
        long = 1.0 if i % 2 == 0 else 0.62
        if t < 0.55:                            # 돋는다
            r1 = (8 + t * 40) * long
            spike(px, a, 1, r1, 2.4 * long, blend(F_CORE, F_HOT, t * 1.6), 0.95)
        else:                                   # 부서져 바깥으로 흩어진다
            k = (t - 0.55) / 0.45
            r0 = (8 + 0.55 * 40) * long + k * 16
            spike(px, a, r0, r0 + 7 * long * (1 - k), 1.9 * long * (1 - k * 0.7),
                  blend(F_MID, F_DIM, k), 0.85 * (1 - k))
    if t < 0.5:
        ring(px, 4 + t * 20, 2.2, blend(F_HOT, F_MID, t * 2), 0.7 - t)
        core(px, 6 - t * 9, F_CORE, 1 - t * 1.5)
    return im


# ---------------------------------------------------------------- 영혼
S_CORE, S_HOT, S_MID, S_DIM = (246, 238, 255), (206, 168, 255), (150, 100, 224), (86, 54, 136)


def frame_soul(f):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
    t = f / (FRAMES - 1)
    # 위로 피어오르는 갈래 다섯 — 아래가 먼저 비고 위가 늦게 흩어진다
    for i in range(5):
        base = -math.pi / 2 + (i - 2) * 0.42
        for s in range(9):
            u = s / 8
            # 갈래마다 다르게 흔들린다 — 연기처럼
            sway = math.sin(u * 3.4 + i * 1.9 + t * 5.2) * (2.2 + u * 5) * (0.3 + t)
            r = (5 + u * 26) * (0.35 + t * 0.9)
            x = C + math.cos(base) * r + sway
            y = C + math.sin(base) * r - t * 9 * u
            rad = (3.1 - u * 2.0) * (1 - t * 0.35)
            col = blend(blend(S_HOT, S_MID, u), S_DIM, t * 0.85)
            a = (0.9 - u * 0.5) * (1 - max(0, t - 0.45) * 1.7)
            for dy in range(-int(rad) - 1, int(rad) + 2):
                for dx in range(-int(rad) - 1, int(rad) + 2):
                    d = math.hypot(dx, dy)
                    if d <= rad:
                        put(px, int(x + dx), int(y + dy), col, a * (1 - d / (rad + 1)))
    if t < 0.6:
        core(px, 6.5 - t * 8, blend(S_CORE, S_HOT, t * 1.6), 1 - t * 1.3)
        ring(px, 5 + t * 16, 1.8, S_MID, 0.55 - t * 0.8, 1.45)   # 바닥에 퍼지는 낮은 고리
    return im


SHEETS = [('hit_arcane', frame_arcane), ('hit_frost', frame_frost), ('hit_soul', frame_soul)]


def main():
    os.makedirs(OUT, exist_ok=True)
    fw = N * S
    W = FRAMES * fw + (FRAMES - 1) * GAP
    for name, fn in SHEETS:
        sheet = Image.new('RGBA', (W, N * S), (0, 0, 0, 0))
        for f in range(FRAMES):
            sheet.paste(fn(f).resize((fw, N * S), Image.NEAREST), (f * (fw + GAP), 0))
        p = os.path.join(OUT, name + '.png')
        sheet.save(p)
        print(f'  {name}.png  {sheet.size[0]}x{sheet.size[1]}  {os.path.getsize(p)}B')


if __name__ == '__main__':
    main()
