#!/usr/bin/env python3
"""대화 말풍선을 굽는다 — 칸(2배) 픽셀 그림 9조각 틀 + 꼬리 → play/assets/ui/

    python3 tools/mkbubble.py

  ui/bubble.png       NPC 말풍선(양피지) — 둥근 계단 모서리 · 1칸 윤곽 · 위 빛 · 아래 오른쪽 그늘 · 오른쪽 아래 그림자
  ui/bubble_tail.png  말풍선 꼬리(15×16칸 · 왼쪽 아래 초상 쪽으로 휜다) — 오른쪽 두 열이 말풍선 왼쪽 테를 덮어 이음매가 없다
  ui/bubble_lore.png  비석 · 석판 글(돌 판) — 모서리를 깎은 판 · 끌 자국 · 모서리 룬 점

★ CSS(`border-image`)가 9조각으로 늘린다 — 가장자리 줄은 고르게 칠해야 늘어나도 끊기지 않는다(무늬는 모서리 칸에만).
  조각 폭(SLICE)을 바꾸면 style.css 의 `border-image` 수치도 같이. 그림을 바꾸면 style.css url 의 ?v=(md5 앞 8자)도.
"""
import hashlib, math, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets', 'ui')
K = 2                                   # 칸 하나 = 2px (초상과 같은 배율)


def put(im, x, y, c):
    if 0 <= x < im.width // K and 0 <= y < im.height // K:
        for dy in range(K):
            for dx in range(K):
                im.putpixel((x * K + dx, y * K + dy), c)


def shape(w, h, inside, outline, fill, hi=None, lo=None, shadow=None, deco=None):
    """inside(x, y) 로 정한 모양을 칸 그림으로 — 바깥과 맞닿은 칸이 윤곽, 윤곽 바로 안쪽 위 줄이 빛 · 아래 · 오른쪽 줄이 그늘"""
    im = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0))
    ins = lambda x, y: 0 <= x < w and 0 <= y < h and inside(x, y)
    if shadow:
        for y in range(h):
            for x in range(w):
                if not ins(x, y) and ins(x - 1, y - 1):
                    put(im, x, y, shadow)
    for y in range(h):
        for x in range(w):
            if not ins(x, y):
                continue
            edge = not all(ins(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                put(im, x, y, outline)
                continue
            c = fill
            if hi and not ins(x, y - 2):
                c = hi
            elif lo and (not ins(x, y + 2) or not ins(x + 2, y)):
                c = lo
            put(im, x, y, c)
    if deco:
        deco(im, ins)
    return im


def rounded(w, h, r):
    """둥근 계단 모서리 — 칸 가운데가 반지름 안이면 안"""
    def f(x, y):
        cx = min(max(x + 0.5, r), w - r)
        cy = min(max(y + 0.5, r), h - r)
        return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r + 0.3
    return f


# 양피지 — 따뜻한 흰빛, 윤곽은 짙은 밤색(검정이 아니라서 딱딱하지 않다)
INK = (43, 33, 24, 255)
PAPER = (236, 225, 198, 255)
PAPER_HI = (248, 241, 222, 255)
PAPER_LO = (214, 199, 165, 255)
SHADOW = (0, 0, 0, 90)

# 돌 판 — 푸른 회색, 룬 점은 청록
STONE_LINE = (16, 17, 22, 255)
STONE = (62, 66, 76, 255)
STONE_HI = (92, 98, 110, 255)
STONE_LO = (44, 47, 55, 255)
RUNE = (110, 214, 196, 255)

SLICE = 8                               # 9조각 가장자리 폭(칸) — style.css border-image 16px(=8칸 × 2)
W = H = 2 * SLICE + 2                   # 가운데 2칸 + 그림자 자리


def bubble():
    w, h = W - 1, H - 1                 # 그림자 한 칸 자리
    f = rounded(w, h, 6.2)
    im = shape(W, H, lambda x, y: x < w and y < h and f(x, y), INK, PAPER, PAPER_HI, PAPER_LO, SHADOW)
    return im


def tail():
    """왼쪽 아래로 휘는 꼬리 — 15 × 16 칸. 오른쪽 두 열(13 · 14)은 말풍선 왼쪽 테 위에 놓여 틈을 메운다"""
    w, h, B = 15, 16, 13
    def inside(x, y):
        if x >= B:
            return 1 <= y <= 8
        t = (B - x) / B                 # 0 = 말풍선 쪽 · 1 = 끝
        top = 1 + t ** 1.7 * 13.2       # 윗변이 아래로 휘며 끝으로
        bot = 8 + t ** 0.75 * 6.4
        return top <= y + 0.5 <= bot
    im = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0))
    ins = lambda x, y: 0 <= x < w and 0 <= y < h and inside(x, y)
    for y in range(h):
        for x in range(w):
            if not ins(x, y) and ins(x - 1, y - 1) and x < B:
                put(im, x, y, SHADOW)
    for y in range(h):
        for x in range(w):
            if not ins(x, y):
                continue
            edge = not ins(x, y - 1) or not ins(x, y + 1) or (x < B and (not ins(x - 1, y) or not ins(x + 1, y)))
            c = INK if edge else PAPER if x >= B - 1 else PAPER_HI if not ins(x, y - 2) and x > 4 else PAPER_LO if not ins(x, y + 2) else PAPER
            put(im, x, y, c)
    return im


def lore():
    w, h = W - 1, H - 1
    cut = 4
    def inside(x, y):
        if not (x < w and y < h):
            return False
        dx = min(x, w - 1 - x); dy = min(y, h - 1 - y)
        return dx + dy >= cut - 1
    def deco(im, ins):
        for (x, y) in ((4, 2), (w - 5, 2), (4, h - 3), (w - 5, h - 3)):
            put(im, x, y, RUNE)
        for (x, y) in ((2, 5), (w - 3, 5), (2, h - 6), (w - 3, h - 6)):
            put(im, x, y, STONE_LO)
    return shape(W, H, inside, STONE_LINE, STONE, STONE_HI, STONE_LO, SHADOW, deco)



def main():
    os.makedirs(ROOT, exist_ok=True)
    for name, fn in (('bubble', bubble), ('bubble_tail', tail), ('bubble_lore', lore)):
        im = fn()
        p = os.path.join(ROOT, f'{name}.png')
        im.save(p, optimize=True)
        print(f'{name}.png  {im.width}x{im.height}  ?v={hashlib.md5(open(p, "rb").read()).hexdigest()[:8]}')


if __name__ == '__main__':
    main()
