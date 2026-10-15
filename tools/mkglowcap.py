#!/usr/bin/env python3
"""발광 버섯 타일(GLOWCAP) 갈래 여섯 장을 굽는다 → play/assets/tile/tile_glowcap.png (22×22 × 6 가로 띠)

    python3 tools/mkglowcap.py

★ 한 모양(갓 둘)이 골짜기 · 포자 굴 유적 전체에 도장 찍듯 되풀이됐다(사용자 지적 2026-10-15).
  타일 아틀라스는 칸마다 갈래(v 0~5)를 자리로 고르므로, 띠의 n번째 칸이 갈래 n 이 된다(tileart `applySprite`).
  0번은 원래 그림(tools/art/glowcap_src.png) 그대로 — 나머지는 같은 팔레트 · 같은 1칸 결로 길쭉한 외대 · 작은 무리 · 넓은 우산 · 종 둘 · 큰 것과 작은 것.
  아랫줄(21)이 땅에 닿는다. 빛 번짐(반투명)은 모양 둘레 2칸.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'play', 'assets', 'tile', 'tile_glowcap.png')
SRC = os.path.join(ROOT, 'tools', 'art', 'glowcap_src.png')
TS, V = 22, 6

HALO = (45, 225, 190, 51)
CAP, CAP_LT, CAP_TOP, CAP_DK, GILL = (30, 138, 122, 255), (38, 168, 148, 255), (70, 214, 188, 255), (21, 104, 91, 255), (15, 74, 66, 255)
SPOT = (143, 252, 230, 255)
STEM, STEM_MD, STEM_DK = (240, 250, 246, 255), (207, 230, 223, 255), (154, 181, 174, 255)


class Cell:
    def __init__(self):
        self.px = {}

    def put(self, x, y, c):
        if 0 <= x < TS and 0 <= y < TS:
            self.px[(x, y)] = c

    def stem(self, x0, y0, w, lean=0):
        """x0 왼끝 · y0 갓 밑부터 땅(21)까지 · lean: 위쪽 절반을 한 칸 민다"""
        for y in range(y0, TS):
            dx = lean if y < (y0 + TS) // 2 else 0
            for i in range(w):
                self.put(x0 + dx + i, y, STEM if i == 0 else STEM_DK if i == w - 1 else STEM_MD)

    def dome(self, cx, top, hw, rows, spots=()):
        """둥근 갓 — 위로 갈수록 타원처럼 좁아지고 아랫줄은 주름(어두운 줄). cx 는 칸 가운데(반 칸 단위 허용)"""
        for r in range(rows):
            w = hw if r == rows - 1 else max(1, round(hw * (1 - ((rows - 1 - r) / rows) ** 2) ** 0.5))   # 타원 윤곽
            y = top + r
            xs = range(int(round(cx - w)), int(round(cx + w)))
            for x in xs:
                t = (x - (cx - w)) / max(1, 2 * w)
                if r == rows - 1:
                    c = GILL
                elif r == 0:
                    c = CAP_TOP if t < 0.6 else CAP_LT
                elif t > 0.82:
                    c = CAP_DK
                elif r == 1 and t < 0.55:
                    c = CAP_LT
                else:
                    c = CAP
                self.put(x, y, c)
        for (sx, sy) in spots:
            self.put(int(cx + sx), top + sy, SPOT); self.put(int(cx + sx) + 1, top + sy, SPOT)

    def bell(self, cx, top, widths, spots=()):
        """종 모양 — 줄마다 반폭(widths), 마지막 줄이 주름"""
        n = len(widths)
        for r, w in enumerate(widths):
            y = top + r
            for x in range(int(round(cx - w)), int(round(cx + w))):
                t = (x - (cx - w)) / max(1, 2 * w)
                c = GILL if r == n - 1 else CAP_TOP if r == 0 else CAP_DK if t > 0.78 else CAP_LT if t < 0.4 else CAP
                self.put(x, y, c)
        for (sx, sy) in spots:
            self.put(int(cx + sx), top + sy, SPOT)

    def image(self):
        im = Image.new('RGBA', (TS, TS), (0, 0, 0, 0))
        solid = set(self.px)
        for y in range(TS):
            for x in range(TS):
                if (x, y) in solid:
                    continue
                if any((x + dx, y + dy) in solid for dx in range(-2, 3) for dy in range(-2, 3) if abs(dx) + abs(dy) <= 3):
                    im.putpixel((x, y), HALO)
        for (x, y), c in self.px.items():
            im.putpixel((x, y), c)
        return im


def v1():                                   # 길쭉한 외대 — 가는 자루 위 종 갓, 위가 살짝 기운다
    c = Cell(); c.stem(10, 9, 2, lean=1); c.bell(12, 2, [1, 2, 2, 3, 3, 4, 4], spots=((-1, 2), (1, 4))); return c.image()


def v2():                                   # 작은 무리 — 키가 다른 꼬마 버섯 넷
    c = Cell()
    for cx, top in ((4, 15), (9, 12), (13.5, 16), (18, 14)):
        c.stem(int(cx) - 1, top + 3, 2)
        c.dome(cx, top, 3, 4, spots=((-1, 1),))
    return c.image()


def v3():                                   # 넓은 우산 — 낮고 넓은 갓 하나 + 발치에 꼬마
    c = Cell(); c.stem(8, 14, 3); c.dome(9.5, 9, 9, 5, spots=((-5, 2), (0, 1), (4, 2))); c.stem(18, 19, 1); c.dome(18.5, 17, 2, 2); return c.image()


def v4():                                   # 종 둘 — 큰 종 · 작은 종
    c = Cell(); c.stem(5, 13, 2); c.bell(6, 6, [1, 2, 3, 3, 4, 4, 5], spots=((-2, 3), (1, 2)))
    c.stem(15, 17, 2); c.bell(16, 12, [1, 2, 3, 3, 4], spots=((0, 2),)); return c.image()


def v5():                                   # 큰 것 하나와 작은 것 둘
    c = Cell(); c.stem(5, 9, 3, lean=-1); c.dome(6.5, 4, 5, 5, spots=((-3, 2), (1, 1)))
    c.stem(13, 17, 2); c.dome(14, 14, 3, 3, spots=((-1, 1),)); c.stem(18, 19, 1); c.dome(18.5, 17, 2, 2)
    return c.image()


def main():
    if not os.path.exists(SRC):            # 처음 한 번 — 원래 한 장을 원본으로 옮겨 둔다(산출물을 다시 먹이지 않게)
        Image.open(OUT).convert('RGBA').crop((0, 0, TS, TS)).save(SRC)
    strip = Image.new('RGBA', (TS * V, TS), (0, 0, 0, 0))
    strip.paste(Image.open(SRC).convert('RGBA'), (0, 0))
    for i, fn in enumerate((v1, v2, v3, v4, v5), 1):
        strip.paste(fn(), (i * TS, 0))
    strip.save(OUT, optimize=True)
    print('tile_glowcap.png', strip.size)


if __name__ == '__main__':
    main()
