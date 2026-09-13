#!/usr/bin/env python3
"""칸 전체를 덮은 **반투명 배경**을 걷어낸다.

죽는 첫 칸(death1)에서 몹 아홉 마리가 "넓은 범위에 회색빛이 도는" 상태였다. 재 보니
그 칸은 픽셀이 딱 두 가지였다 —

    α255  진짜 그림
    α41   그 밖의 **전부**. 투명해야 할 자리에 옅은 판이 깔려 있다

그래서 게임에서는 쓰러진 몹 자리에 칸만 한 네모난 회색 판이 같이 떴다. 시트를 구울 때
배경이 지워지지 않고 옅게 남은 자국이다.

■ 어떻게 가리나 — **투명한 자리가 한 점도 안 남았으면** 배경이 구워진 것이다

  몹 그림은 칸보다 작다. 그러니 칸에는 반드시 완전히 투명한 자리가 남는다. 그게
  하나도 없다는 것은 빈 곳을 무언가가 다 채웠다는 뜻이고, 그 무언가가 이 판이다.

  여기에 하나를 더 건다 — 그 칸의 **반투명 값이 하나뿐**이어야 한다. 여러 값이 섞여
  있으면 사라져 가는 몸을 단계로 흐리게 한 것이라(damp_wisp·coreling·glow_snail 이
  그렇다) 걷어내면 안 된다.

  ★ 처음에는 "네 귀퉁이가 다 반투명이면"으로 잡으려 했는데, 아홉 중 셋(얼음 사냥꾼 ·
    암초 게 · крев 협곡아가리)은 쓰러진 몸이 아래 귀퉁이를 덮고 있어서 빠졌다.
    "투명이 안 남았다"가 아홉을 다 잡는다.

  살아 있는 칸에 옅게 깔린 것(α34 로 몸만 흐려 둔 것)은 빈 자리를 안 덮으므로 저절로
  빠진다 — 그 칸들에는 투명한 자리가 그대로 남아 있다.

■ 판을 걷어내고 나면 **틀**이 남는 시트가 있다

  셋(얼음 사냥꾼 · 암초 게 · 협곡아가리)은 같은 칸에 칸 테두리를 따라 도는 얇은 네모가
  불투명하게 한 겹 더 그려져 있었다. 판과 같은 뿌리(칸 하나를 통째로 따로 구운 흔적)라
  여기서 같이 걷는다. 몸에 붙어 있지 않은 **따로 떨어진 덩어리**이고 그 덩어리의 3/4
  이상이 테두리 위에 있을 때만 지운다 — 몸은 칸 테두리를 그렇게 두르지 않는다.

사용법:
    python3 tools/fixdeadwash.py            # 찾기만
    python3 tools/fixdeadwash.py --write    # 걷어낸다
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


def frame_alpha(px, ox, fw, fh):
    """칸 하나의 알파를 논리 픽셀로 읽는다."""
    return [[px[ox + x * S + 1, y * S + 1][3] for x in range(fw)] for y in range(fh)]


def wash_value(a, fw, fh):
    """이 칸을 덮은 배경 판의 알파값. 없으면 None."""
    flat = [t for row in a for t in row]
    # 완전히 투명한 자리가 (거의) 안 남았는가 — 남았으면 배경이 안 덮인 것이다
    if sum(1 for t in flat if t == 0) > len(flat) * 0.01:
        return None
    # 반투명 값이 하나뿐이어야 한다 — 여럿이면 몸을 단계로 흐린 것이다
    semis = {t for t in flat if 0 < t < 255}
    if len(semis) != 1:
        return None
    v = semis.pop()
    # 판이 칸의 한 자리만 차지하는 것은 배경이 아니다
    if sum(1 for t in flat if t == v) < len(flat) * 0.10:
        return None
    return v


def rings(px, ox, fw, fh):
    """칸 테두리를 따라 도는 얇은 틀 덩어리의 논리 좌표. 없으면 빈 목록."""
    cells = {(x, y) for y in range(fh) for x in range(fw)
             if px[ox + x * S + 1, y * S + 1][3] > 8}
    out = []
    todo = set(cells)
    while todo:
        stack = [todo.pop()]
        cur = [stack[0]]
        while stack:
            x, y = stack.pop()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    k = (x + dx, y + dy)
                    if k in todo:
                        todo.discard(k)
                        stack.append(k)
                        cur.append(k)
        if len(cur) < 20:
            continue
        edge = sum(1 for x, y in cur if x in (0, fw - 1) or y in (0, fh - 1))
        peri = 2 * (fw + fh) - 4
        if edge / len(cur) > 0.75 and edge / peri > 0.5:
            out += cur
    return out


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    total = 0
    for sec in ('characters', 'bosses'):
        for name, m in sorted(man[sec]['sheets'].items()):
            path = os.path.join(ASSETS, m['file'])
            im = Image.open(path).convert('RGBA')
            px = im.load()
            fw, fh, cnt = m['frameW'], m['frameH'], m['count']
            gap = m.get('gap', 4 if sec == 'bosses' else 0)
            hit, ring = [], []
            for i in range(cnt):
                ox = i * (fw * S + gap)
                v = wash_value(frame_alpha(px, ox, fw, fh), fw, fh)
                if v is not None:
                    hit.append((i, v))
                r = rings(px, ox, fw, fh)
                if r:
                    ring.append((i, r))
            if not hit and not ring:
                continue
            total += 1
            what = ['칸%d: α%d 판' % (i, v) for i, v in hit]
            what += ['칸%d: 틀 %dpx' % (i, len(r)) for i, r in ring]
            print(f"  {name:18} {sec[:4]}  " + '  '.join(what))
            if not write:
                continue
            for i, v in hit:
                ox = i * (fw * S + gap)
                for y in range(fh * S):
                    for x in range(fw * S):
                        if px[ox + x, y][3] == v:
                            px[ox + x, y] = (0, 0, 0, 0)
            for i, r in ring:
                ox = i * (fw * S + gap)
                for (lx, ly) in r:
                    for dy in range(S):
                        for dx in range(S):
                            px[ox + lx * S + dx, ly * S + dy] = (0, 0, 0, 0)
            im.save(path)
    print(('걷어냈다: ' if write else '찾기만 했다(--write 로 저장): ') + f'시트 {total}개'
          if total else '덮인 칸 없음.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
