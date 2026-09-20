#!/usr/bin/env python3
"""가장자리에 **테두리가 빠진 자리**만 찾아 둘러 준다.

궁수의 공격 칸은 활을 펼친 양팔이 테두리 없이 끝나 있었다 — 오른쪽 x21(14~16줄),
왼쪽 x2(17~20줄). 픽셀 그림에서 밝은 색이 배경과 맞닿아 끝나면 **잘린 것처럼**
읽힌다. 서 있는 칸은 가장자리의 99%가 테두리인데 공격 칸만 92%였다.

■ 어떻게 두르나

  가장자리 픽셀(투명한 이웃이 있는 불투명 픽셀) 중 **밝은 것**만 골라, 그 바깥
  투명한 자리에 시트의 가장 어두운 색을 놓는다. 이미 테두리가 둘린 자리는 그냥
  지나간다. 그러므로 실루엣이 통째로 1칸 두꺼워지지 않는다 — 궁수 칸4 는 여덟 칸만
  늘었다.

■ 아무 시트나 하면 안 된다

  빛달팽이·물안개·얼음벽처럼 **애초에 테두리가 없는 디자인**이 있다. 그런 시트에
  걸면 없던 테두리가 생겨 그림이 달라진다. 그래서 표에 적은 것만 한다.

사용법:
    python3 tools/outline.py            # 바뀔 것만
    python3 tools/outline.py --write    # 실제로 두른다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
BRIGHT = 60          # 이 밝기 위면 "테두리가 아니다"

# 사람이 보고 적은 표 — (시트, 칸들)
PLAN = [('archer', (4,))]


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name, frames in PLAN:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        # 시트에서 가장 어두운 색 = 테두리 색
        dark, best = None, 1e9
        for i in range(cnt):
            ox = i * (fw * S + gap)
            for y in range(fh):
                for x in range(fw):
                    c = px[ox + x * S + 1, y * S + 1]
                    if c[3] > 8 and lum(c) < best:
                        best, dark = lum(c), c[:3]
        added = []
        for i in frames:
            ox = i * (fw * S + gap)
            a = [[px[ox + x * S + 1, y * S + 1] for x in range(fw)] for y in range(fh)]
            put = []
            for y in range(fh):
                for x in range(fw):
                    if a[y][x][3] <= 8 or lum(a[y][x]) < BRIGHT:
                        continue
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < fw and 0 <= ny < fh and a[ny][nx][3] <= 8:
                            put.append((nx, ny))
            put = sorted(set(put))
            added.append((i, put))
            if write:
                for lx, ly in put:
                    for ddy in range(S):
                        for ddx in range(S):
                            px[ox + lx * S + ddx, ly * S + ddy] = dark + (255,)
        print(f'  {name:12} 테두리 색 {dark}')
        for i, put in added:
            print(f'      칸{i}: {len(put)}칸 두름 {put}')
        if write:
            im.save(path)
    print('둘렀다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
