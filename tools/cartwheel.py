#!/usr/bin/env python3
"""광차 유령 — 굴러가는데 바퀴가 안 돈다.

재 보면 칸0=칸2, 칸1=칸3 이다. 즉 **걷는 두 칸이 서 있는 두 칸의 복사본**이라,
지나가는 광차를 보면 바퀴가 멈춘 채 미끄러진다.

바퀴는 테(106,98,88) 안에 살(64,58,52)이 **십자(+)** 로 박혀 있다. 걷는 칸에서
그 십자를 45° 돌려 **×자**로 바꾸면 한 칸 굴렀다는 것이 읽힌다 — 바퀴 그림을
다시 그리는 게 아니라, 이미 있는 살을 옮기는 것이다.

    칸2(move1) — 살을 ×자로
    칸3(move2) — 살을 ×자로 두고 수레를 한 칸 튀어 오르게 (덜컹임)

수레는 칸 전체를 한 칸 올리는 것으로 튀게 한다. 발 높이는 칸0 에서만 재므로
(sprites.js _measurePad) 다른 칸을 올려도 정렬은 안 흔들린다.

사용법:
    python3 tools/cartwheel.py            # 바뀔 것만
    python3 tools/cartwheel.py --write    # 실제로 고친다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
RIM = (106, 98, 88)        # 바퀴 테
SPOKE = (64, 58, 52)       # 바퀴 살
R = 3                      # 살이 뻗는 길이
RIM_EDGE = (12, 12, 17)    # 테 바깥 선


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    m = man['characters']['sheets']['cartwraith']
    path = os.path.join(ASSETS, m['file'])
    im = Image.open(path).convert('RGBA')
    px = im.load()
    fw, fh, cnt = m['frameW'], m['frameH'], m['count']
    gap = m.get('gap', 0)

    def at(i, x, y):
        return px[i * (fw * S + gap) + x * S + 1, y * S + 1]

    def put(i, x, y, c):
        ox = i * (fw * S + gap)
        for dy in range(S):
            for dx in range(S):
                px[ox + x * S + dx, y * S + dy] = c

    # 바퀴 축을 찾는다 — 살 색이 **테에 둘러싸여** 가로로 길게 이어지는 줄이고,
    # 그런 줄은 바퀴 수만큼(둘) 끊겨 있어야 한다. 수레 밑틀도 살 색이 길게 이어지지만
    # 그건 한 덩어리라 이 조건에서 빠진다(처음엔 밑틀을 축으로 잘못 잡았다).
    def runs(y):
        out, cur = [], []
        for x in range(fw):
            if at(0, x, y)[:3] == SPOKE:
                cur.append(x)
            elif cur:
                out.append(cur); cur = []
        if cur:
            out.append(cur)
        return [g for g in out if len(g) >= 7]

    axis = None
    for y in range(fh):
        g = runs(y)
        if len(g) == 2 and all(at(0, r[0] - 1, y)[:3] == RIM_EDGE or
                               at(0, r[0] - 1, y)[3] > 8 for r in g):
            axis = y
            centres = [((r[0] + r[-1]) // 2, y) for r in g]
            break
    if axis is None:
        print('바퀴 축을 못 찾았다 — 아무것도 안 한다.')
        return 1
    print(f'  바퀴 축 y={axis}, 가운데 {centres}')

    for i in (2, 3):
        for cx, cy in centres:
            # 있던 살을 테로 되돌린다
            for y in range(cy - R - 1, cy + R + 2):
                for x in range(cx - R - 1, cx + R + 2):
                    if 0 <= x < fw and 0 <= y < fh and at(i, x, y)[:3] == SPOKE:
                        if write:
                            put(i, x, y, RIM + (255,))
            # 대각선 둘로 다시 박는다 — 테 안(불투명한 자리)에만
            for k in range(-R, R + 1):
                for (dx, dy) in ((k, k), (k, -k)):
                    x, y = cx + dx, cy + dy
                    if 0 <= x < fw and 0 <= y < fh and at(i, x, y)[3] > 8:
                        if write:
                            put(i, x, y, SPOKE + (255,))
        print(f'  칸{i}: 살을 ×자로')

    # 칸3 은 한 칸 튀어 오른다
    if write:
        ox = 3 * (fw * S + gap)
        col = [[px[ox + x, y] for y in range(fh * S)] for x in range(fw * S)]
        for x in range(fw * S):
            for y in range(fh * S):
                src = y + S
                px[ox + x, y] = col[x][src] if src < fh * S else (0, 0, 0, 0)
    print('  칸3: 수레를 한 칸 올려 덜컹이게')

    if write:
        im.save(path)
    print('고쳤다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
