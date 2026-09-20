#!/usr/bin/env python3
"""빛나는 몹에서 **흘러내린 빛**을 걷어낸다 — 등불해파리.

■ 무엇이 문제인가

  등불해파리는 종(갓) 한가운데에 빛덩이가 있다. 그 빛이 종에서 끝나지 않고
  **촉수 자리까지 한 줄로 쭉 내려와** 있었다(칸마다 x11, 8~12칸). 촉수 사이는
  비어 있으므로, 그 한 줄은 몸도 촉수도 아닌 **허공에 그어진 흰 선**으로 읽힌다.
  다섯 칸 전부에 있어서 움직이는 내내 따라다닌다.

  종 안의 빛덩이는 그대로 둔다 — 이름이 등불인 까닭이 거기 있다. 걷어내는 것은
  **종 밑단보다 아래**에 있고, **좌우 어느 한쪽이 비어 있는** 흰 칸뿐이다.
  좌우가 다 몸이면 그건 종 아랫면의 빛이지 흘러내린 선이 아니다.

  그 자리는 지우지 않고 **촉수 색으로 바꾼다.** 지우면 가운데 촉수가 통째로
  없어진다 — 칸1·칸2 를 보면 그 줄 옆에 촉수 몸이 붙어 있어, 흰 줄은 촉수의
  하이라이트였지 촉수 자체가 아니었다.

■ 반투명 테두리

  때리는 칸에만 알파 71 짜리 옅은 흰 테가 77칸 둘려 있었다. 다른 여섯 칸에는
  반투명 픽셀이 한 점도 없다 — 시트를 구울 때 배경이 옅게 남은 자국이다
  (tools/fixdeadwash.py 가 죽는 칸에서 잡아낸 것과 같은 것). 걷어낸다.

사용법:
    python3 tools/glowtrim.py            # 무엇이 바뀔지만
    python3 tools/glowtrim.py --write    # 실제로 걷어낸다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4

# (시트, 흘러내린 빛 색, 촉수로 바꿀 색)
PLAN = [('lantern_jelly', (234, 255, 246), (74, 163, 160))]


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name, lit, body in PLAN:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        moved = semi = 0
        for fr in range(cnt):
            ox = fr * (fw * S + gap)

            def at(x, y):
                return px[ox + x * S + 1, y * S + 1]

            def put(x, y, c):
                for dy in range(S):
                    for dx in range(S):
                        px[ox + x * S + dx, y * S + dy] = c

            # 종 밑단 — 한 줄이 끊긴 데 없이 이어진 **마지막** 줄
            bell = -1
            for y in range(fh):
                xs = [x for x in range(fw) if at(x, y)[3] > 0]
                if xs and xs == list(range(xs[0], xs[-1] + 1)):
                    bell = y
            for y in range(fh):
                for x in range(fw):
                    c = at(x, y)
                    if c[3] == 0:
                        continue
                    if 0 < c[3] < 250:                      # 구워진 배경 자국
                        put(x, y, (0, 0, 0, 0)) if write else None
                        semi += 1
                        continue
                    if c[:3] != lit or y <= bell:
                        continue
                    l = at(x - 1, y)[3] > 0 if x else False
                    r = at(x + 1, y)[3] > 0 if x + 1 < fw else False
                    if l and r:
                        continue                            # 몸 안의 빛 — 둔다
                    if write:
                        put(x, y, body + (255,))
                    moved += 1
        print(f'  {name:14} 흘러내린 빛 {moved}칸 → 촉수색 · 반투명 자국 {semi}칸 지움')
        if write:
            im.save(path)
    print('걷어냈다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
