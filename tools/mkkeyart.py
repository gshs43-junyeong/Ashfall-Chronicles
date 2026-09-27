#!/usr/bin/env python3
"""대표 그림(16:9 · 1920×1080 — 상점 대표 이미지 · 사이트 공유 그림)을 굽는다.

  node tools/keyart-capture.mjs tools/art/keyart 6   # 게임 장면(하늘 섬 · 잿빛 숲 · 주인공 · 노을)을 찍는다
  python3 tools/mkkeyart.py [장면.png]               # → site/keyart.png (+ --preview 는 /tmp 에 작은 그림)

장면은 실제 게임 화면 그대로 두고, 위에 떨어지는 별(bg/sky_meteor_near) · 노을 빛 · 가장자리 어둠 · 로고만 얹는다.
★ 로고는 mklogo.logo() 로 새로 찍는다 — 게임 폴더의 logo.png 를 늘리면 칸이 뭉개진다."""
import os, sys, math
from PIL import Image, ImageFilter, ImageEnhance

sys.path.insert(0, os.path.dirname(__file__))
from mklogo import logo

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
W, H = 1920, 1080
MET = (1180, -30)            # 떨어지는 별 그림의 왼쪽 위 — 섬 위 하늘(장면을 바꾸면 같이 옮길 것)


def radial(w, h, cx, cy, r, col, amax):
    """(cx, cy) 에서 퍼지는 둥근 빛 한 겹"""
    im = Image.new('RGBA', (w, h), col + (0,)); P = im.load()
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            d = math.hypot(x - cx, y - cy) / r
            if d < 1:
                a = int(amax * (1 - d) ** 2)
                for yy in (y, y + 1):
                    for xx in (x, x + 1):
                        if xx < w and yy < h: P[xx, yy] = col + (a,)
    return im


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    src = args[0] if args else os.path.join(ROOT, 'tools', 'art', 'keyart', 'scene_6.png')
    im = Image.open(src).convert('RGBA').resize((W, H), Image.NEAREST)
    im = ImageEnhance.Contrast(im).enhance(1.08)

    # 떨어지는 별 — 오른쪽 위에서 왼쪽 아래로. 게임 그림(sky_meteor_near, 머리가 오른쪽)을 뒤집어 기울인다
    met = Image.open(os.path.join(ROOT, 'game', 'assets', 'bg', 'sky_meteor_near.png')).convert('RGBA')
    met = met.resize((met.width * 2, met.height * 2), Image.NEAREST).transpose(Image.FLIP_LEFT_RIGHT)
    met = met.rotate(24, resample=Image.BICUBIC, expand=True)
    mx, my = MET
    hx, hy = mx + met.width * .1, my + met.height * .78          # 머리 자리(대략)
    im.alpha_composite(radial(W, H, hx, hy, 300, (255, 190, 110), 80))
    im.alpha_composite(met, (int(mx), int(my)))

    # 가장자리 어둠 — 로고 쪽(왼쪽 위)과 아래를 조금 더
    vig = Image.new('L', (W // 4, H // 4), 0); V = vig.load()
    for y in range(vig.height):
        for x in range(vig.width):
            u, v = x / vig.width - .5, y / vig.height - .5
            d = math.hypot(u * 1.1, v * 1.3)
            a = max(0, d - .28) * 1.5 + max(0, v - .25) * .9 + max(0, .1 - u) * max(0, -v) * 1.4
            V[x, y] = min(200, int(a * 255))
    vig = vig.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(8))
    dark = Image.new('RGBA', (W, H), (10, 7, 14, 255)); dark.putalpha(vig)
    im.alpha_composite(dark)

    # 로고 — 왼쪽 위 하늘. 칸 크기 11 로 새로 찍는다(섬에 안 걸리게)
    lg = logo(11)
    sh = Image.new('RGBA', lg.size, (0, 0, 0, 0)); sh.putalpha(lg.split()[3].point(lambda v: int(v * .55)))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    lx, ly = 70, 60
    im.alpha_composite(sh, (lx + 6, ly + 12))
    im.alpha_composite(lg, (lx, ly))

    out = os.path.join(ROOT, 'site', 'keyart.png')
    im.convert('RGB').save(out, optimize=True)
    print('keyart', im.size, os.path.getsize(out) // 1024, 'KB', '←', os.path.relpath(src, ROOT))
    if '--preview' in sys.argv:
        im.convert('RGB').resize((960, 540), Image.LANCZOS).save('/tmp/keyart_preview.png')


if __name__ == '__main__':
    main()
