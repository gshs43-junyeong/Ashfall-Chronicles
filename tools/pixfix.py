#!/usr/bin/env python3
"""칸 하나의 픽셀 몇 개를 **손으로** 고친다.

도구로 가릴 수 없고 사람이 보고 정해야 하는 것들이 남는다. 그런 것을 코드 밖
어딘가에 몰래 고쳐 두면 다음에 시트를 다시 구울 때 조용히 사라지므로, 무엇을 왜
고쳤는지 여기 적어 둔다.

좌표는 **논리 픽셀**(frameW x frameH 기준)이고, 색은 RGB 다.

사용법:
    python3 tools/pixfix.py            # 무엇이 바뀔지만
    python3 tools/pixfix.py --write    # 실제로 고친다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4

HOOD = (11, 7, 16)          # 서기의 두건 안쪽 어둠

PATCHES = [
    # 필경사의 공격 칸 — 망치와 눈이 구별되지 않는다.
    #
    # 서기는 두건 안에서 금빛 눈(216,169,75) 두 쌍이 빛난다. 공격 칸에서는 크림빛
    # 망치(232,203,147)가 머리 높이로 올라오는데, 그 망치가 **오른쪽 눈의 바깥
    # 절반(x16)을 먹고 눈에 딱 붙어** 있다. 둘 다 어둠 위의 밝은 색이라, 붙어 있으면
    # 하나의 밝은 덩어리로 읽힌다.
    #
    # 그래서 x16 을 두건 어둠으로 되돌려 **눈과 망치 사이에 한 칸의 어둠**을 넣는다.
    # 픽셀 그림에서 밝은 것 둘을 가르는 표준적인 방법이고, 아무것도 옮기거나
    # 다시 칠하지 않는다. 눈이 한 칸으로 좁아지지만 고개를 튼 자세라 어색하지 않다.
    ('archivist', 4, [((16, 7), HOOD), ((16, 8), HOOD)],
     '망치와 눈 사이에 어둠 한 칸'),
]


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name, frame, cells, why in PATCHES:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh = m['frameW'], m['frameH']
        gap = m.get('gap', 0)
        ox = frame * (fw * S + gap)
        shown = []
        for (lx, ly), col in cells:
            was = px[ox + lx * S + 1, ly * S + 1]
            shown.append(f'({lx},{ly}) {was[:3]}→{col}')
            if write:
                for dy in range(S):
                    for dx in range(S):
                        px[ox + lx * S + dx, ly * S + dy] = col + (255,)
        print(f'  {name:14} 칸{frame}  {why}')
        for line in shown:
            print(f'       {line}')
        if write:
            im.save(path)
    print('고쳤다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
