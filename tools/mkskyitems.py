#!/usr/bin/env python3
"""하늘 섬 고유 재료 두 아이콘 굽기 → game/assets/item/storm_amber.png · cloud_pearl.png (32x32).

폭풍 호박: 번개가 구름 수액을 굳힌 덩이 — 울퉁불퉁한 호박빛, 속에 갇힌 하얀 번개 한 줄.
구름 진주: 구름 해파리 속에서 자란 진주 — 둥근 진줏빛에 무지갯빛 띠, 밑에 구름 한 줌.
다른 아이템 그림처럼 짙은 윤곽선 · 왼쪽 위 빛 · 반짝임 몇 점.
"""
import math, os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'game', 'assets', 'item')
N = 32


def hx(s, a=255):
    s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


def outline(im, col):
    px = im.load(); add = []
    for y in range(N):
        for x in range(N):
            if px[x, y][3]: continue
            if any(0 <= x + dx < N and 0 <= y + dy < N and px[x + dx, y + dy][3] and px[x + dx, y + dy] != col
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): add.append((x, y))
    for p in add: px[p] = col


def storm_amber():
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
    cx, cy = 15.5, 16.5
    lo, mid, hi = hx('#8a3e0a'), hx('#e08a1c'), hx('#ffd27a')
    for y in range(N):
        for x in range(N):
            a = math.atan2(y - cy, x - cx)
            r = 10.5 + 1.6 * math.sin(a * 3 + 0.6) + 0.9 * math.sin(a * 5 - 1.1)   # 울퉁불퉁한 덩이
            d = math.hypot(x - cx, (y - cy) * 1.08)
            if d > r: continue
            lit = max(0.0, min(1.0, 0.55 - ((x - cx) + (y - cy)) / 22 + (1 - d / r) * 0.35))
            px[x, y] = mix(lo, mid, lit / 0.6) if lit < 0.6 else mix(mid, hi, (lit - 0.6) / 0.4)
    # 갇힌 번개 — 가늘게 꺾이는 하얀 줄, 둘레는 옅은 금빛
    bolt = [(12, 9), (13, 10), (14, 11), (14, 12), (13, 13), (12, 14), (13, 15), (14, 16), (15, 17), (16, 17),
            (17, 18), (16, 19), (15, 20), (16, 21), (17, 22), (18, 23)]
    for x, y in bolt:
        for dx, dy in ((1, 0), (-1, 0)):
            if px[x + dx, y + dy][3]: px[x + dx, y + dy] = mix(px[x + dx, y + dy], hx('#fff3c0'), 0.5)
    for x, y in bolt: px[x, y] = hx('#fffbe8')
    # 속에 든 구름 알갱이 · 빛 받는 모서리
    for x, y in ((20, 12), (21, 13), (10, 20), (19, 21)): px[x, y] = mix(px[x, y], hx('#fff8e0'), 0.6)
    for x, y in ((9, 10), (10, 9), (11, 8), (9, 11)): px[x, y] = hx('#fff0c0')
    outline(im, hx('#2a1406'))
    for x, y in ((25, 6), (26, 5), (24, 5), (25, 4)): im.putpixel((x, y), hx('#fff3c0'))   # 반짝임
    return im


def cloud_pearl():
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
    cx, cy, R = 15.5, 14.0, 9.2
    base, shade_, hi = hx('#dfe9f5'), hx('#8a9ab8'), hx('#ffffff')
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - cx, y - cy)
            if d > R: continue
            l = max(0.0, min(1.0, 0.75 - ((x - cx) * 0.6 + (y - cy)) / (R * 1.6)))
            c = mix(shade_, base, l)
            # 무지갯빛 띠 — 비스듬한 줄을 따라 보라 · 분홍 · 하늘빛
            band = (x - cx) * 0.7 + (y - cy)
            if 1.5 < band < 5.5 and d < R - 1:
                t = (band - 1.5) / 4
                c = mix(c, hx('#e8c8f0') if t < 0.33 else hx('#f5d0dc') if t < 0.66 else hx('#c8e8f5'), 0.45)
            px[x, y] = c
    for x, y in ((11, 9), (12, 9), (11, 10), (12, 10), (13, 9), (10, 11)): px[x, y] = hi   # 창빛
    px[20, 18] = mix(px[20, 18], hi, 0.4)
    # 밑에 받친 구름 한 줌
    for (ox, oy, r) in ((9, 25, 3.2), (15, 26, 4.0), (21, 25, 3.4), (12, 23, 2.6), (19, 23, 2.4)):
        for y in range(N):
            for x in range(N):
                if math.hypot(x - ox, y - oy) <= r and (px[x, y][3] == 0 or y >= 22):
                    px[x, y] = hx('#f4f8fc') if y < oy else hx('#c8d4e4')
    outline(im, hx('#1e2230'))
    for x, y in ((25, 7), (26, 6), (24, 6), (25, 5)): im.putpixel((x, y), hx('#ffffff'))
    return im


def main():
    for name, fn in (('storm_amber', storm_amber), ('cloud_pearl', cloud_pearl)):
        p = os.path.join(OUT, name + '.png'); fn().save(p); print('wrote', p)


if __name__ == '__main__':
    main()
