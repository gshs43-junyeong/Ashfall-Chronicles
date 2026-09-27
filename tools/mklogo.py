#!/usr/bin/env python3
"""타이틀 로고 · 파비콘을 굽는다 — 손으로 찍은 픽셀 글자(글꼴 파일을 쓰지 않는다: 라이선스 걱정 없음 · 게임 그림 결과 같다).

  python3 tools/mklogo.py            # game/assets/ui/logo.png · logo_small.png · favicon*.png · site/favicon.ico
  python3 tools/mklogo.py --preview  # 위 + /tmp 에 어두운 바탕 미리보기

로고 = 'ASHFALL' (금빛 불씨 — 위는 밝은 금, 아래로 갈수록 잿불 주황) + 'CHRONICLES' (재빛 돌)
     + 'A' 의 꼭짓점을 스치고 떨어지는 별 하나(게임의 시작 — 떨어진 별).
파비콘 = 네 갈래 별(별 조각) — 16px 에서도 읽히게 칸을 손으로 찍었다.
★ 게임 폴더의 로고를 이 도구에 다시 먹이지 말 것 — 원본은 이 파일의 글자 표다."""
import os, sys, math, random
from PIL import Image, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
UI = os.path.join(ROOT, 'game', 'assets', 'ui')

# ---- 글자 표 — 9칸 높이, 굵기 2칸. '#' = 칸 ----
G = {
 'A': ["..###..", ".##.##.", "##...##", "##...##", "##...##", "#######", "##...##", "##...##", "##...##"],
 'S': [".#####.", "##...##", "##.....", ".##....", "..###..", "....##.", ".....##", "##...##", ".#####."],
 'H': ["##...##", "##...##", "##...##", "##...##", "#######", "##...##", "##...##", "##...##", "##...##"],
 'F': ["#######", "##.....", "##.....", "##.....", "######.", "##.....", "##.....", "##.....", "##....."],
 'L': ["##.....", "##.....", "##.....", "##.....", "##.....", "##.....", "##.....", "##.....", "#######"],
 'C': [".#####.", "##...##", "##.....", "##.....", "##.....", "##.....", "##.....", "##...##", ".#####."],
 'R': ["######.", "##...##", "##...##", "##...##", "######.", "##.##..", "##..##.", "##...##", "##...##"],
 'O': [".#####.", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", ".#####."],
 'N': ["##...##", "###..##", "####.##", "##.####", "##..###", "##...##", "##...##", "##...##", "##...##"],
 'I': ["######", "..##..", "..##..", "..##..", "..##..", "..##..", "..##..", "..##..", "######"],
 'E': ["#######", "##.....", "##.....", "##.....", "######.", "##.....", "##.....", "##.....", "#######"],
}


def word_mask(word, gap=1):
    """글자 표를 이어 붙인 칸 지도 (w, h, set of (x,y))"""
    x, cells = 0, set()
    for ch in word:
        g = G[ch]
        for y, row in enumerate(g):
            for dx, c in enumerate(row):
                if c == '#': cells.add((x + dx, y))
        x += len(g[0]) + gap
    return x - gap, len(G['A']), cells


def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def paint_word(word, px, bands, rim, side, depth=2, gap=1):
    """칸 지도 → 그림. px = 칸 크기.
    bands = 위에서 아래로 칠할 색 띠(픽셀 그림답게 층으로 끊는다) · rim = 윗모서리 빛 · side = 아래로 밀린 두께(depth 칸) 색."""
    w, h, cells = word_mask(word, gap)
    pad = depth + 2
    im = Image.new('RGBA', ((w + pad * 2) * px, (h + pad * 2) * px), (0, 0, 0, 0))
    P = im.load()
    def cell(x, y, col):
        for yy in range((y + pad) * px, (y + pad + 1) * px):
            for xx in range((x + pad) * px, (x + pad + 1) * px): P[xx, yy] = col
    solid = set(cells)
    for d in range(1, depth + 1): solid |= {(x, y + d) for (x, y) in cells}
    for (x, y) in solid:                                           # 둘레 검은 테
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            if (x + ox, y + oy) not in solid: cell(x + ox, y + oy, (10, 7, 6, 255))
    for d in range(depth, 0, -1):                                  # 두께 — 아래로 밀린 옆면
        for (x, y) in cells:
            if (x, y + d) not in cells: cell(x, y + d, lerp(side, (0, 0, 0), .18 * (d - 1)) + (255,))
    nb = len(bands)
    for (x, y) in cells:
        col = bands[min(nb - 1, y * nb // h)] + (255,)
        if (x, y - 1) not in cells: col = rim + (255,)                     # 윗모서리 빛
        elif (x - 1, y) not in cells and y < h * .55: col = lerp(col[:3], rim, .4) + (255,)
        elif (x + 1, y) not in cells: col = lerp(col[:3], side, .35) + (255,)   # 오른쪽 모서리 그늘
        cell(x, y, col)
    return im


def star(size, core=(255, 252, 232), glow=(255, 196, 92)):
    """네 갈래 별 — 가운데 밝고 끝으로 갈수록 가늘다"""
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); P = im.load(); c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            dx, dy = abs(x - c), abs(y - c); m = max(dx, dy)
            w = max(0.5, (c - m) * 0.16)                               # 갈래 굵기 — 가운데로 올수록 굵다
            if (min(dx, dy) <= w and m < c) or dx + dy <= size * .12:
                P[x, y] = lerp(core, glow, min(1, m / c * 1.3)) + (255,)
    halo = im.filter(ImageFilter.GaussianBlur(size / 8))
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for _ in range(3): out.alpha_composite(halo)
    out.alpha_composite(im)
    return out


def logo(px=8):
    GOLD = [(255, 236, 164), (255, 208, 108), (242, 158, 64), (214, 104, 40), (170, 64, 28)]
    STONE = [(236, 230, 216), (206, 198, 184), (168, 158, 146)]
    a = paint_word('ASHFALL', px, GOLD, (255, 250, 222), (110, 42, 18), depth=2)
    bpx = max(3, px * 9 // 16)
    b = paint_word('CHRONICLES', bpx, STONE, (255, 252, 244), (58, 50, 46), depth=1, gap=2)
    top = px * 6                                                    # 별이 앉을 윗자리
    W = max(a.width, b.width) + px * 10
    H = top + a.height + b.height
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ax = (W - a.width) // 2
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); glow.alpha_composite(a, (ax, top))
    r, g, bb, al = glow.split()
    glow = Image.merge('RGBA', (r.point(lambda v: 255), g.point(lambda v: 130), bb.point(lambda v: 36), al.point(lambda v: int(v * .5))))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(px * 2.6)))
    im.alpha_composite(a, (ax, top))
    by = top + a.height - px * 2
    bx = (W - b.width) // 2
    im.alpha_composite(b, (bx, by))
    # CHRONICLES 양옆 금빛 가는 줄 — 끝이 한 칸 점으로 닫힌다
    Q = im.load(); ly = by + b.height // 2
    for side in (-1, 1):
        x0 = bx + bpx * 2 if side < 0 else bx + b.width - bpx * 2
        for i in range(px * 5):
            x = x0 - (i + px) if side < 0 else x0 + i + px
            if 0 <= x < W:
                for k in range(max(1, px // 4)):
                    Q[x, ly + k] = (230, 170, 80, int(230 * (1 - i / (px * 5)) ** .7))
    # 떨어지는 별 — 'A' 위 오른쪽 하늘에서 비스듬히 내려오는 꼬리, 글자를 가리지 않게 위에만
    st = star(px * 7 + 1)
    sx, sy = ax + px * 1, px * 0
    tail = Image.new('RGBA', (W, H), (0, 0, 0, 0)); T = tail.load()
    L = px * 40
    for i in range(L):
        t = i / L
        x = int(sx + st.width / 2 + i); y = int(sy + st.height / 2 - i * 0.12)
        if 0 <= x < W and 0 <= y < H:
            al = int(230 * (1 - t) ** 1.8)
            T[x, y] = (255, 224, 150, al)
            if y + 1 < H: T[x, y + 1] = (255, 180, 90, al // 3)
    im.alpha_composite(tail)
    im.alpha_composite(st, (sx, sy))
    rnd = random.Random(7); E = im.load()                       # 흩날리는 재
    for _ in range(30):
        x, y = rnd.randrange(px, W - px), rnd.randrange(top, H - px)
        if E[x, y][3] == 0:
            c = rnd.choice([(255, 170, 80), (230, 120, 50), (200, 190, 170)]); s2 = max(1, px // 2)
            for yy in range(y, min(H, y + s2)):
                for xx in range(x, min(W, x + s2)): E[xx, yy] = c + (rnd.randrange(110, 210),)
    return im.crop(im.getbbox())


def favicon(n):
    """n×n 파비콘 — 어두운 둥근 판 · 금빛 테 · 판을 꽉 채운 네 갈래 별(16px 에서도 별로 읽힌다)"""
    S = 128
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); P = im.load()
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - 63.5, y - 63.5)
            if d <= 63: P[x, y] = (214, 146, 62, 255) if d > 57 else lerp((52, 36, 50), (18, 13, 20), y / S) + (255,)
    im.alpha_composite(star(122), (3, 3))
    return im.resize((n, n), Image.LANCZOS)


def main():
    os.makedirs(UI, exist_ok=True)
    big = logo(8); big.save(os.path.join(UI, 'logo.png'))
    small = logo(3); small.save(os.path.join(UI, 'logo_small.png'))
    for n in (16, 32, 48, 180, 512):
        favicon(n).save(os.path.join(UI, f'favicon_{n}.png'))
    ico = favicon(256)
    ico.save(os.path.join(ROOT, 'game', 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    ico.save(os.path.join(ROOT, 'site', 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    print('logo', big.size, 'small', small.size)
    if '--preview' in sys.argv:
        bg = Image.new('RGBA', (big.width + 80, big.height + 80), (14, 12, 18, 255)); bg.alpha_composite(big, (40, 40))
        bg.save('/tmp/logo_preview.png')
        f = Image.new('RGBA', (16 + 32 + 48 + 40, 60), (40, 40, 40, 255)); x = 10
        for n in (16, 32, 48): f.alpha_composite(favicon(n), (x, 6)); x += n + 10
        f.save('/tmp/favicon_preview.png')


if __name__ == '__main__':
    main()
