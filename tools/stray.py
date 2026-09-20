#!/usr/bin/env python3
"""몸에서 떨어져 나온 덩어리를 **지우거나 이어 붙인다**.

tools/straycheck.py 가 후보를 찾아 주지만, 찾은 것의 대부분은 **일부러 떨어뜨린
것**이었다 — 삿갓짐승과 하늘 파수병의 공격 입자, 리베터의 총구 불꽃, 필경사의 잉크
방울, 꽃뿜이의 잎, 자오선 눈의 고리, 어스름 기는 것의 떠 있는 다리. 그래서 이 도구는
**자동으로 판단하지 않는다.** 아래 표에 사람이 보고 적은 것만 손댄다.

    'cut'  — 지운다. 몸에 없는 색으로 된 뜻 없는 덩어리.
    'join' — 몸까지 가장 짧은 길을 제 색으로 메워 잇는다.

■ 왜 색을 보나

  색은 **무엇에서 떨어져 나왔는지**를 알려 준다. 붉은 울음꾼의 떠 있는 네모는
  (225,90,75) 인데, 등 줄무늬가 (224,90,74) 다 — 채널마다 1씩만 다른, 사실상
  같은 색이다. 즉 이물질이 아니라 **변환이 줄무늬에서 떼어 내 허공에 흘린 조각**이다.
  몸에서 두 칸 넘게 떨어진 빈 곳에 떠 있으므로 지운다.

  (처음에는 "몸에 없는 색"이라고 적었는데 틀렸다. 몸의 주된 색만 세어 보고
   줄무늬 색을 놓쳤다. 색이 같다고 남길 일도, 다르다고 지울 일도 아니다 —
   **떨어져 빈 곳에 떠 있는가**가 잣대다.)

  반대로 등불 해파리의 촉수와 덩굴채찍의 팔은 몸과 같은 색이고 두 칸 떨어져 있을
  뿐이다. 그건 흘린 조각이 아니라 **끊긴 몸**이므로 이어 붙인다.

사용법:
    python3 tools/stray.py            # 무엇을 어떻게 할지만
    python3 tools/stray.py --write    # 실제로 손댄다
"""
import json
import os
import sys
from collections import Counter

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from straycheck import blobs, gap_to           # 찾는 눈은 그쪽 것을 쓴다

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4

# 사람이 보고 적은 표. 여기 없는 시트는 건드리지 않는다.
#   cut    — 떨어진 덩어리 안에서 이 색만 지운다 (몸에는 없는 색이어야 한다)
#   join   — 지우고 남은 것을 몸까지 잇는다
#   frames — 이 칸들만 본다. **죽는 칸을 보려면 반드시 적어야 한다** — 기본값은
#            죽는 칸을 건너뛴다(무너진 잔해가 흩어지는 것은 정상이라서).
#   cut_all— frames 에 적은 칸에서 떨어진 덩어리를 색과 상관없이 지운다
PLAN = {
    # 등 줄무늬에서 떨어져 나온 (225,90,75) 조각이 칸0~4 의 빈 곳에 떠 있다.
    # 칸3 은 그 조각이 떨어진 뒷다리에 엉겨 있어서, 지운 다음 다리를 몸에 잇는다.
    'crimson_howler': {'cut': {(225, 90, 75)}, 'join': True},
    # 촉수가 갓에서 두 칸 떨어졌다("다리가 본체와 연결 안됨").
    'lantern_jelly': {'join': True},
    # 공격 칸에서 왼팔이 몸에서 떨어졌다("공격할 때 왼쪽 팔 연결 안됨").
    'vinelash': {'join': True},
    # 죽는 첫 칸에서 몸은 무너졌는데 **왼쪽에 2x8 기둥 하나만 그대로 서 있다**
    # ("죽을 때 좌측 상단 이상"). 칸4 에는 없는 것이라 무너지다 남은 잔해로 본다.
    'glacier_stalker': {'frames': (5,), 'cut_all': True},
}
MAX_JOIN = 3        # 이보다 멀면 잇지 않는다 — 멀리 있는 것은 잇는 게 아니라 딴 것이다


def line(a, b):
    """두 칸 사이의 곧은 길(양 끝 제외)."""
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0))
    return [(round(x0 + (x1 - x0) * t / n), round(y0 + (y1 - y0) * t / n))
            for t in range(1, n)]


def nearest(cells, body):
    best, pair = 10 ** 9, None
    for c in cells:
        for bcell in body:
            d = max(abs(c[0] - bcell[0]), abs(c[1] - bcell[1]))
            if d < best:
                best, pair = d, (c, bcell)
    return best, pair


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name, plan in sorted(PLAN.items()):
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        acted = []
        # ★ 기본값은 죽는 칸(마지막 둘)을 안 본다 — 무너진 잔해는 원래 흩어진다.
        #   표에 frames 를 적은 시트만 그 칸을 본다.
        for i in (plan['frames'] if 'frames' in plan else range(max(0, cnt - 2))):
            ox = i * (fw * S + gap)
            at = lambda x, y: px[ox + x * S + 1, y * S + 1]

            def put(lx, ly, c):
                for dy in range(S):
                    for dx in range(S):
                        px[ox + lx * S + dx, ly * S + dy] = c

            def detached():
                """이 칸에서 몸과 두 칸 이상 떨어진 덩어리들."""
                a = [[at(x, y)[3] for x in range(fw)] for y in range(fh)]
                bl = blobs(a, fw, fh)
                if len(bl) < 2:
                    return [], []
                bl.sort(key=len, reverse=True)
                return bl[0], [c for c in bl[1:] if gap_to(c, bl[0]) >= 2]

            # (0) 색과 상관없이 떨어진 덩어리를 통째로 지운다
            if plan.get('cut_all'):
                body, loose = detached()
                for cells in loose:
                    if write:
                        for lx, ly in cells:
                            put(lx, ly, (0, 0, 0, 0))
                    acted.append(f'칸{i}: {len(cells)}칸 지움')

            # (1) 떨어진 덩어리 안에서 표에 적은 색만 지운다
            if plan.get('cut'):
                body, loose = detached()
                for cells in loose:
                    bad = [(x, y) for x, y in cells if at(x, y)[:3] in plan['cut']]
                    if not bad:
                        continue
                    if write:
                        for lx, ly in bad:
                            put(lx, ly, (0, 0, 0, 0))
                    acted.append(f'칸{i}: {len(bad)}칸 지움')

            # (2) 남은 것을 몸까지 잇는다
            if plan.get('join'):
                body, loose = detached()
                for cells in loose:
                    d, pair = nearest(cells, body)
                    if d > MAX_JOIN:
                        continue
                    c = Counter(at(x, y) for x, y in cells).most_common(1)[0][0]
                    fill = line(*pair)
                    if write:
                        for lx, ly in fill:
                            put(lx, ly, c)
                    acted.append(f'칸{i}: {len(cells)}칸을 {len(fill)}칸으로 이음')
        print(f'  {name:18} ' + ('  '.join(acted) if acted else '바뀔 것 없음'))
        if write and acted:
            im.save(path)
    print('손댔다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
