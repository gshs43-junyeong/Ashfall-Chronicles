#!/usr/bin/env python3
"""강화 모루 그림 굽기 → game/assets/obj/anvil.png (44x44, 4배).

예전 그림은 윤곽선이 없고 면이 평평해 옆의 재련대·금고·게시판과 따로 놀았다(받침이 가늘고 망치가 떠 보였다).
같은 마을 시설처럼 짙은 윤곽선(#0d0d13) · 재련대의 쇳빛 팔레트 · 점 무늬 질감으로 다시 그린다:
쇠띠 두른 나무 밑동 위에 모루(왼쪽 뿔 · 평평한 윗면 · 잘록한 허리 · 넓은 발), 윗면에 달군 쇳조각과 누운 망치.
"""
import os, random
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'game', 'assets', 'obj', 'anvil.png')
W = H = 44
K = 4
OL = (0x0d, 0x0d, 0x13, 255)


def hx(s):
    s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


def main():
    rnd = random.Random(7)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load()
    body = set()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H: px[x, y] = hx(c) if isinstance(c, str) else c; body.add((x, y))

    # 나무 밑동(34~43줄) — 세로 결, 쇠띠 한 줄
    for y in range(33, 44):
        for x in range(10, 34):
            c = '#6a4a2e' if (x * 3 + y // 4) % 5 else '#5a3e26'
            if x in (10, 11): c = '#4a321e'
            if x in (32, 33): c = '#3e2a18'
            if y == 33: c = '#8a6440'
            if y in (38, 39): c = '#56565c' if y == 38 else '#3a3a42'
            put(x, y, c)
    # 모루 발(29~32) · 허리(25~28) · 몸(20~24) · 뿔(왼쪽으로 가늘어짐)
    def steel_row(y, x0, x1):
        for x in range(x0, x1 + 1):
            put(x, y, '#4a4a52')
    for y in range(29, 33): steel_row(y, 12 - (y - 29), 31 + (y - 29))
    for y in range(25, 29): steel_row(y, 16, 28)
    for y in range(19, 25): steel_row(y, 9, 36)
    for i, y in enumerate(range(19, 23)):          # 뿔 — 위는 길게, 아래로 짧게
        for x in range(2 + i * 2, 9): put(x, y, '#4a4a52')
    for x in range(36, 40):                         # 뒷굽(오른쪽 네모 끝)
        for y in range(19, 22): put(x, y, '#4a4a52')
    # 빛과 그늘 — 윗면이 밝고, 아래·오른쪽이 어둡다
    for (x, y) in list(body):
        p = px[x, y]
        if p[:3] != (0x4a, 0x4a, 0x52): continue
        up = (x, y - 1) not in body
        if up: px[x, y] = hx('#8a8a92')
        elif (x, y - 2) not in body: px[x, y] = hx('#6a6a74')
        elif (x + 1, y) not in body or (x, y + 1) not in body: px[x, y] = hx('#3a3a42')
        elif rnd.random() < 0.12: px[x, y] = hx('#56565c' if rnd.random() < 0.5 else '#3d3d43')
    # 허리의 어두운 홈
    for y in range(25, 29): px[16, y] = hx('#3a3a42'); px[28, y] = hx('#2b2b32')
    # 윗면에 달군 쇳조각
    for x in range(17, 23): put(x, 18, '#e0561c' if x in (18, 19, 20, 21) else '#8c2f0c')
    put(19, 17, '#ffb04a'); put(20, 17, '#ffb04a')
    # 누운 망치 — 머리는 쇠, 자루는 오른쪽으로
    for y in range(14, 19):
        for x in range(26, 32): put(x, y, '#5d5d63' if y > 14 else '#8a8a92')
    for x in range(32, 42): put(x, 17, '#8a6440'); put(x, 18, '#6a4a2e')
    # 윤곽선 — 몸 둘레의 빈 칸
    ring = [(x + dx, y + dy) for (x, y) in body for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
    for (x, y) in ring:
        if 0 <= x < W and 0 <= y < H and px[x, y][3] == 0: px[x, y] = OL
    im.resize((W * K, H * K), Image.NEAREST).save(OUT)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
