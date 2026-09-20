#!/usr/bin/env python3
"""칸 끝에서 **폭이 깎인 다리 기둥**을 제 폭으로 되돌린다.

어스름 기는 것(gloom_crawler)의 다리는 떠 있는 기둥 여섯인데, 모두 3칸 폭인 반면
**맨 오른쪽만** 칸0 에서 2칸, 칸2 에서 1칸이었다. 원래 칸의 오른쪽 끝을 넘어가 있던
것이 구울 때 잘린 자국이다("걸을 때 오른쪽 다리가 짤려 보임"). 칸에 여백을 준
지금은(tools/padframe.py) 되돌릴 자리가 있다.

■ 어떻게 가리나

  다리 줄에서 이어진 x 묶음을 세고, 그 중 **가장 흔한 폭**을 제 폭으로 본다.
  그보다 좁은 묶음만, 그것도 **칸 가장자리에 붙은 것만** 늘린다 — 가운데에 있는
  좁은 묶음은 그렇게 그린 것이지 잘린 게 아니다.

  늘릴 때는 옆 기둥의 세로 모양을 그대로 베낀다. 새로 그리는 게 아니라 있는 것을
  복사하는 것이므로 모양이 어긋나지 않는다.

사용법:
    python3 tools/legwidth.py            # 바뀔 것만
    python3 tools/legwidth.py --write    # 실제로 되돌린다
"""
import json
import os
import sys
from collections import Counter

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4

PLAN = ['gloom_crawler']          # 사람이 보고 적은 표


def runs(on, n):
    out, cur = [], None
    for x in range(n):
        if on(x) and cur is None:
            cur = x
        elif not on(x) and cur is not None:
            out.append((cur, x - 1)); cur = None
    if cur is not None:
        out.append((cur, n - 1))
    return out


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name in PLAN:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        acted = []
        for i in range(max(0, cnt - 2)):          # 산 칸만
            ox = i * (fw * S + gap)
            at = lambda x, y: px[ox + x * S + 1, y * S + 1]
            rows = [y for y in range(fh) if any(at(x, y)[3] > 8 for x in range(fw))]
            if not rows:
                continue
            ly = rows[-1] - 2                      # 다리 줄 — 아랫줄에서 조금 위
            grp = runs(lambda x: at(x, ly)[3] > 8, fw)
            if len(grp) < 3:
                continue
            want = Counter(b - a + 1 for a, b in grp).most_common(1)[0][0]
            for a, b in grp:
                w = b - a + 1
                if w >= want:
                    continue
                # 칸 가장자리에 붙은 것만 — 가운데 좁은 것은 그렇게 그린 것이다
                near = (a <= 2) or (b >= fw - 3)
                if not near:
                    continue
                src = a if b >= fw - 3 else b      # 베낄 열: 바깥쪽 끝
                for k in range(want - w):
                    dst = b + 1 + k if b >= fw - 3 else a - 1 - k
                    if not (0 <= dst < fw):
                        break
                    acted.append(f'칸{i}: x{dst} 되살림 ({w + k + 1}/{want}칸)')
                    if write:
                        for y in range(fh):
                            c = at(src, y)
                            for dy in range(S):
                                for dx in range(S):
                                    px[ox + dst * S + dx, y * S + dy] = c
        print(f'  {name:16} ' + ('  '.join(acted) if acted else '바뀔 것 없음'))
        if write and acted:
            im.save(path)
    print('되돌렸다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
