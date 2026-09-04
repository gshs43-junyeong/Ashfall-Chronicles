#!/usr/bin/env python3
"""플레이어 시트가 프레임 밖으로 잘려 나간 자리를 되살린다.

char/player*.png 는 20x40 프레임에 그림을 **가장자리까지 꽉 채워** 구워 놓았다.
그래서 프레임 경계에 닿은 부분이 통째로 잘려 보인다. 실측하면 이렇다.

  - 머리 꼭대기(y=0) 에 **윤곽선이 없다.** 좌우에는 있는데 위만 없어서, 열세 프레임
    전부 정수리가 칼로 자른 듯 납작하다. 화면에서 "짤려 보인다"의 대부분이 이것.
  - 몇 프레임(공격 자세 등)은 팔이 x=0 · x=79 를 넘어가 **채움색 그대로 끊긴다.**
    윤곽선조차 없이 잘린 자리라 더 눈에 띈다.

여기서는 프레임을 사방 한 논리픽셀(4px) 넓히고, **잘린 자리에만** 윤곽선을 채워
넣는다. 이미 윤곽선이 있는 가장자리는 건드리지 않는다 — 그쪽은 잘린 게 아니라
여백 없이 딱 붙어 있을 뿐이라, 덧대면 윤곽선만 두 겹으로 두꺼워진다.

  20x40 (80x160) -> 22x41 (88x164), 그림은 (4,4) 에 놓인다.
  그리는 쪽은 manifest 의 ox/oy(-1,-1)로 그만큼 되밀어, 몸은 있던 자리에 그대로 선다.

    python3 tools/unclip.py            # game/assets/char/player*.png 전부
"""
import os
import sys
from collections import Counter

from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), '..', 'game', 'assets', 'char')
SHEETS = ['player.png'] + ['player_%s.png' % c for c in
                           ('wanderer', 'digger', 'ranger', 'adept', 'stray')]
S = 4            # 시트는 4배로 구워져 있다 (논리 1px = 4x4 블록)
FW, FH, N = 80, 160, 13
PAD = S          # 사방으로 논리 1px


def outline_color(px, x0, w, h):
    """이 프레임의 윤곽선 색 — 투명과 맞닿은 불투명 픽셀 중 가장 흔한 색."""
    c = Counter()
    for x in range(w):
        for y in range(h):
            p = px[x0 + x, y]
            if p[3] < 8:
                continue
            edge = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or px[x0 + nx, ny][3] < 8:
                    edge = True
                    break
            if edge:
                c[p] += 1
    if not c:
        return (18, 18, 26, 255)
    # 맞닿은 색 중에서도 어두운 쪽이 윤곽선이다 (밝은 쪽은 잘려 나간 채움색)
    top = c.most_common(8)
    return min(top, key=lambda kv: sum(kv[0][:3]))[0]


def lum(p):
    return p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114


def fix(path):
    im = Image.open(path).convert('RGBA')
    if im.size != (FW * N, FH):
        print('  건너뜀 (이미 손본 시트?):', os.path.basename(path), im.size)
        return False
    px = im.load()
    out = Image.new('RGBA', ((FW + 2 * PAD) * N, FH + PAD), (0, 0, 0, 0))
    od = out.load()
    patched = 0
    for f in range(N):
        sx0 = f * FW
        dx0 = f * (FW + 2 * PAD) + PAD
        # 그림을 새 프레임 안쪽으로 옮겨 놓는다
        out.paste(im.crop((sx0, 0, sx0 + FW, FH)), (dx0, PAD))
        ol = outline_color(px, sx0, FW, FH)
        olum = lum(ol)

        def cut(p):
            """잘린 자리인가 — 불투명한데 윤곽선보다 뚜렷하게 밝으면 채움색이 끊긴 것"""
            return p[3] > 8 and lum(p) > olum * 1.35 + 6

        def block(bx, by):
            for i in range(S):
                for j in range(S):
                    od[bx + i, by + j] = ol

        # ① 위 — 정수리. 윤곽선이 아예 없으므로 불투명한 칸 전부에 씌운다
        for bx in range(0, FW, S):
            if any(px[sx0 + bx + i, 0][3] > 8 for i in range(S)):
                block(dx0 + bx, 0)
                patched += 1
        # ② 좌우 — 채움색이 끊긴 자리에만. 이미 윤곽선이면 그대로 둔다
        for by in range(0, FH, S):
            if any(cut(px[sx0, by + j]) for j in range(S)):
                block(dx0 - PAD, by + PAD)
                patched += 1
            if any(cut(px[sx0 + FW - 1, by + j]) for j in range(S)):
                block(dx0 + FW, by + PAD)
                patched += 1
        # ③ 위쪽 모서리 — ①과 ②가 만나는 자리를 메워 선이 끊기지 않게
        for side, bx in ((0, dx0 - PAD), (FW - 1, dx0 + FW)):
            if px[sx0 + side, 0][3] > 8:
                block(bx, 0)
    out.save(path)
    print('  %-26s %s -> %s  (%d칸 되살림)'
          % (os.path.basename(path), im.size, out.size, patched))
    return True


def main():
    n = 0
    print('플레이어 시트의 잘린 가장자리를 되살립니다')
    for f in SHEETS:
        p = os.path.normpath(os.path.join(BASE, f))
        if os.path.exists(p):
            n += fix(p)
        else:
            print('  없음:', f)
    print('%d장 손봤습니다. manifest 의 frameW/frameH/ox/oy 도 함께 맞추세요.' % n)
    return 0


if __name__ == '__main__':
    sys.exit(main())
