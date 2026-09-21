#!/usr/bin/env python3
"""먹구름을 굽는다 — cloud_6 · cloud_7.

■ 왜 더 필요했나

  비가 올 때 화면에 뜨는 구름을 먹구름만으로 채우게 바꿨는데(game.js drawClouds),
  폭우일 때 구름이 백 개 넘게 흐른다. 먹구름이 둘(cloud_4·5)뿐이면 같은 그림이
  줄줄이 지나가 벽지처럼 보인다. 흰 구름이 셋이므로 먹구름도 넷으로 맞춘다.

■ 기존 그림에서 읽어 낸 규격 (cloud_4·5 를 재서 그대로 따른다)

  · 판 256x128, **4배 격자** — 논리 64x32 칸을 4배로 키운 것이다.
  · 색은 네 단. 실루엣 **위쪽 표면에서 얼마나 내려왔나**로 가른다(가로로 뚝 자르는
    것이 아니다). 깊이 비율 0.22 / 0.55 / 0.75 에서 A→B→C→D 로 넘어간다.
    cloud_4 의 가장 높은 열에서 재면 A 가 3칸(0.18) · B 가 9칸까지(0.53) ·
    C 가 13칸까지(0.76)였다.
  · ★ 나누는 값은 **그림 전체의 높이**다. 열마다 제 높이로 나누면 얇은 가장자리 열이
    두어 칸 만에 가장 어두운 단까지 가서 테두리가 시커멓게 둘린다. 전체 높이로
    나눠야 가장자리가 밝은 단에 머물러 덩이가 부풀어 보인다(cloud_4 가 그렇다 —
    17줄 중 가장자리 열은 세 칸뿐이라 0.18, 끝까지 A 다).
  · 경계는 **톱니처럼 흔들린다.** 자로 자른 듯 매끈하면 구름이 아니라 판때기로
    보인다. 자리 해시로 한 칸씩 밀어 준다 — 난수를 쓰면 다시 구울 때마다 달라진다.
  · 그림은 판 가운데에 놓이고 가로로 41칸 안팎을 쓴다(cloud_4 가 41칸).

사용법:
    python3 tools/mkclouds.py            # 무엇이 만들어질지만
    python3 tools/mkclouds.py --write    # assets/bg/ 에 굽는다
"""
import math
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = os.path.join(ROOT, 'game', 'assets', 'bg')
S = 4                      # 격자 배수
LW, LH = 64, 32            # 논리 칸
BAND = (0.22, 0.55, 0.75)  # 위 표면에서의 깊이 비율 — A/B/C/D 경계

# (파일, 네 단 색 밝은 것부터, 덩이들 [중심x, 중심y, 반지름x, 반지름y])
PLAN = [
    ('cloud_6',
     [(82, 92, 104), (64, 73, 84), (51, 59, 69), (41, 47, 56)],
     # ★ 덩이들의 **꼭대기 높이를 어긋나게** 둔다. 비슷하면 만나는 자리에 홈이 파여
     #   등이 톱니가 된다(cloud_4·5 는 큰 덩이 하나에 낮은 어깨가 붙은 모양이다).
     #   가운데가 가장 높고, 어깨는 네댓 칸 아래에서 시작한다.
     # 넓고 낮은 띠 — 가운데 마루가 왼쪽으로 치우쳤다
     [(29, 18, 14, 8.5), (18, 21, 9, 5.5), (43, 21, 9, 5.0)]),
    ('cloud_7',
     [(70, 80, 92), (55, 64, 74), (44, 51, 60), (33, 39, 47)],
     # 가운데가 높이 부풀고 오른쪽으로 낮은 꼬리가 길게 빠진다
     [(27, 17, 12, 9.5), (17, 21, 8, 5.0), (40, 22, 10, 4.5)]),
]


def hash2(x, y):
    """자리로 정해지는 0~1. 난수를 안 쓰는 이유는 다시 구워도 같으라고."""
    h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 0xFFFF


def build(name, pal, lobes, write):
    fill = [[False] * LW for _ in range(LH)]
    for ly in range(LH):
        for lx in range(LW):
            for (cx, cy, rx, ry) in lobes:
                # 가장자리를 한 칸 흔든다 — 매끈한 타원 여럿은 눈사람처럼 보인다
                j = hash2(lx, ly) - 0.5
                if ((lx - cx) / rx) ** 2 + ((ly - cy) / ry) ** 2 <= 1.0 + j * 0.05:
                    fill[ly][lx] = True
                    break

    # 덩이 여럿을 합치면 만나는 자리마다 톱니 홈이 남는다. 이웃 여덟 칸 중 다섯 이상이
    # 차 있으면 채우고 셋 이하면 비우는 다듬기를 두 번 — 덩이 수는 그대로 두고 윤곽만
    # 둥글려 준다. cloud_4·5 의 매끈한 등을 따라가려는 것이다.
    for _ in range(2):
        nxt = [row[:] for row in fill]
        for ly in range(LH):
            for lx in range(LW):
                k = sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                        if (dx or dy) and 0 <= ly + dy < LH and 0 <= lx + dx < LW
                        and fill[ly + dy][lx + dx])
                if k >= 5:
                    nxt[ly][lx] = True
                elif k <= 3:
                    nxt[ly][lx] = False
        fill = nxt

    top = [next((y for y in range(LH) if fill[y][x]), None) for x in range(LW)]
    bot = [next((y for y in range(LH - 1, -1, -1) if fill[y][x]), None) for x in range(LW)]

    xs0 = [x for x in range(LW) if top[x] is not None]
    H = max(1, max(bot[x] - top[x] + 1 for x in xs0))   # 그림 전체의 높이
    im = Image.new('RGBA', (LW * S, LH * S), (0, 0, 0, 0))
    px = im.load()
    n = 0
    for ly in range(LH):
        for lx in range(LW):
            if not fill[ly][lx]:
                continue
            d = (ly - top[lx]) / H                   # 위 표면에서 내려온 비율 (전체 높이 기준)
            d += (hash2(lx * 7 + 1, ly * 13 + 5) - 0.5) * 0.07   # 경계를 톱니로
            k = 0 if d < BAND[0] else 1 if d < BAND[1] else 2 if d < BAND[2] else 3
            c = pal[k] + (255,)
            for dy in range(S):
                for dx in range(S):
                    px[lx * S + dx, ly * S + dy] = c
            n += 1
    xs = [x for x in range(LW) if top[x] is not None]
    print(f'  {name}  칸 {n} ({n / (LW * LH) * 100:.0f}%)  가로 {xs[-1] - xs[0] + 1}칸  '
          f'세로 {max(bot[x] - top[x] + 1 for x in xs)}칸')
    if write:
        im.save(os.path.join(BG, name + '.png'))


def main(argv):
    write = '--write' in argv
    for name, pal, lobes in PLAN:
        build(name, pal, lobes, write)
    print('구웠다. ★ manifest.json 에 등록하고 sync-manifest 를 돌려야 한다.'
          if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
