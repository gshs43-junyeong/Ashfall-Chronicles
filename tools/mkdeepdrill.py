#!/usr/bin/env python3
"""심층 드릴 타일(tile/tile_m_drill_x.png)을 전동 드릴 그림에서 굽는다.

전동 드릴(tile_m_drill_e.png)의 모양은 그대로 두고
  - 푸른 몸통을 깊은 청록·강철색으로 낮춘다(한 단계 위 기계 — 더 무겁게)
  - 몸통 위아래에 가압판 띠 한 줄씩 + 모서리 리벳
  - 창(밝은 하늘색)은 더 밝게 빛나게
매니페스트 절: tiles.files.m_drill_x → python3 tools/sync-manifest.py
"""
from PIL import Image
import colorsys, os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'game', 'assets', 'tile')
src = Image.open(os.path.join(ROOT, 'tile_m_drill_e.png')).convert('RGBA')
im = src.copy(); px = im.load(); W, H = im.size

for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        if a == 0: continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if s > 0.18 and 0.5 < h < 0.72:                 # 푸른 몸통 → 청록으로 돌리고 어둡게
            if l > 0.7:                                  # 창 — 더 밝게
                r2, g2, b2 = colorsys.hls_to_rgb(0.51, min(0.86, l + 0.08), 0.9)
            else:
                r2, g2, b2 = colorsys.hls_to_rgb(0.52, l * 0.82, s * 0.7)
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)

# 몸통 = 불투명 칸이 가로 절반을 넘는 줄들. 그 안쪽 첫 줄·끝 줄에 가압판 띠 + 양끝 리벳
body = [y for y in range(H) if sum(1 for x in range(W) if px[x, y][3]) > W * 0.5]
if body:
    y0, y1 = body[0] + 1, body[-1] - 1
    xs = [x for x in range(W) if px[x, y0][3]]
    for yy in (y0, y1):
        for x in range(xs[0] + 1, xs[-1]):
            r, g, b, a = px[x, yy]
            if a and sum((r, g, b)) > 70 and not (r > 150 and b > 200):   # 창은 남긴다
                px[x, yy] = (42, 60, 68, 255)
        for x in (xs[0] + 2, xs[-1] - 2):
            px[x, yy] = (176, 204, 212, 255)
out = os.path.join(ROOT, 'tile_m_drill_x.png')
im.save(out)
print('wrote', out)
