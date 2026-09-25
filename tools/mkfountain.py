#!/usr/bin/env python3
"""분수대 시트 굽기 — tools/art/fountain_src.png(110x66, 한 장) → game/assets/obj/fountain.png(4배, N장).

원래 두 장은 물줄기 곡선 자체가 장마다 달라서 물이 위아래로 출렁이는 것처럼 보였다.
곡선은 한 번만 맞춰 두고(원래 그림의 물방울 자리에 2차식 맞춤) **물방울이 그 길을 따라 흘러가게** 칠한다:
포물선은 윗 물받이에서 바깥 아래로, 가운데 물줄기는 아래로, 꼭대기 물기둥은 위로, 물받이 수면은 바깥으로.
N장·주기가 맞물려 끝 장과 첫 장이 끊김 없이 이어진다. 게임은 manifest frames 를 읽어 돌린다(game.js 분수대).
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'tools', 'art', 'fountain_src.png')
OUT = os.path.join(ROOT, 'game', 'assets', 'obj', 'fountain.png')
N, K = 8, 4
MID, LIGHT, DEEP = (79, 164, 192, 255), (134, 208, 228, 255), (47, 114, 144, 255)
W, H = 110, 66
CX = (W - 1) / 2                     # 54.5 — 좌우 대칭 축


def is_water(p):
    return p[3] and p[2] > p[0] + 40 and p[2] > 120


def fit_arc(src):
    """왼쪽 포물선의 물방울 자리(9~43줄, 가운데 기둥·물줄기 밖)에 y = a x² + b x + c 를 맞춘다."""
    px = src.load()
    pts = [(x, y) for y in range(9, 44) for x in range(0, 36) if is_water(px[x, y])]
    n = len(pts)
    sx = [sum(x ** k for x, _ in pts) for k in range(5)]
    sy = [sum(y * x ** k for x, y in pts) for k in range(3)]
    # 정규방정식 3x3
    A = [[sx[4], sx[3], sx[2]], [sx[3], sx[2], sx[1]], [sx[2], sx[1], n]]
    B = [sy[2], sy[1], sy[0]]
    for i in range(3):
        for j in range(i + 1, 3):
            f = A[j][i] / A[i][i]
            A[j] = [a - f * b for a, b in zip(A[j], A[i])]; B[j] -= f * B[i]
    c = B[2] / A[2][2]; b = (B[1] - A[1][2] * c) / A[1][1]; a = (B[0] - A[0][1] * b - A[0][2] * c) / A[0][0]
    return a, b, c


def base_of(src):
    """물줄기만 걷어 낸 바탕 — 물받이 수면(23~25줄 · 47줄 아래)과 윗 물받이 테두리(0~8줄)는 남긴다."""
    b = src.copy(); px = b.load()
    for y in range(9, 44):
        if 23 <= y <= 25:
            continue
        for x in range(W):
            if is_water(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return b


def arc_samples(a, b, c):
    """왼쪽 포물선을 윗 물받이 가장자리(9줄)에서 아래 물받이(43줄)까지 호 길이로 촘촘히 짚는다."""
    y_of = lambda x: a * x * x + b * x + c
    xs, x = [], 45.0
    while y_of(x) < 9: x -= 0.02
    while y_of(x) <= 43.6 and x > 8:
        xs.append(x); x -= 0.02
    out, s, prev = [], 0.0, None
    for x in xs:
        y = y_of(x)
        if prev: s += ((x - prev[0]) ** 2 + (y - prev[1]) ** 2) ** 0.5
        out.append((x, y, s)); prev = (x, y)
    return out


def frame(base, samples, f):
    im = base.copy(); px = im.load()
    put = lambda x, y, c: (0 <= x < W and 0 <= y < H) and px.__setitem__((x, y), c)
    # 포물선 — 길이 8 주기에 물방울 3칸, 앞머리가 밝다. 한 장에 1칸씩 바깥 아래로
    P, D = 8, 3
    for x, y, s in samples:
        u = (s - f) % P
        if u < D:
            col = LIGHT if u >= D - 1 else MID
            for xx in (round(x), round(2 * CX - x)):
                put(xx, round(y), col)
    # 가운데 물줄기(가운데 물받이 밑 → 아래 물받이) — 주기 4, 한 장에 1칸 아래로
    for y in range(29, 44):
        u = (y - 29 - f) % 4
        if u < 3:
            for xl in (37, 72):
                put(xl, y, LIGHT if u == 2 else MID)
    # 꼭대기 물기둥 — 밝은 줄이 아래에서 위로
    for y in range(0, 4):
        for x in range(51, 59):
            if is_water(px[x, y]):
                inner = 52 <= x <= 57
                px[x, y] = LIGHT if inner and (3 - y - f) % 4 in (0, 1) else (MID if not inner else DEEP if (3 - y - f) % 4 == 3 else MID)
    # 물받이 수면 — 가운데에서 바깥으로 번지는 잔물결
    for y, x0, x1 in ((47, 8, 101), (24, 40, 69)):
        for x in range(x0, x1 + 1):
            d = abs(x - CX)
            if is_water(px[x, y]):
                px[x, y] = MID if (d - f) % 8 < 1 else LIGHT
    return im


def main():
    src = Image.open(SRC).convert('RGBA')
    a, b, c = fit_arc(src)
    base = base_of(src)
    samples = arc_samples(a, b, c)
    sheet = Image.new('RGBA', (W * N * K, H * K), (0, 0, 0, 0))
    for f in range(N):
        sheet.paste(frame(base, samples, f).resize((W * K, H * K), Image.NEAREST), (f * W * K, 0))
    sheet.save(OUT)
    print('wrote', OUT, sheet.size, 'arc y=%.4fx²%+.3fx%+.2f' % (a, b, c))


if __name__ == '__main__':
    main()
