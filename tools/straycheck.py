#!/usr/bin/env python3
"""몸에서 **떨어져 나와 떠 있는 작은 덩어리**를 찾는다.

붉은 울음꾼(crimson_howler)의 몸 양옆에 연분홍 네모가 떠 있는 것을 흰 바탕에
놓고서야 봤다. 게임에서는 배경에 묻혀 안 보이지만 시트로 보면 "뜬금없이 붙어
있는 것"으로 읽힌다.

가리는 잣대 — 덩어리가

  · 칸에서 **가장 큰 덩어리(몸)** 가 아니고
  · 넓이가 몸의 STRAY_REL 미만이며
  · 몸과 GAP_MIN 칸 이상 떨어져 있고
  · 죽는 칸이 아니다 (무너진 잔해는 원래 흩어진다)

면 잔해로 본다. 죽는 칸을 빼는 것이 중요하다 — 거기서는 떨어져 나온 덩어리가
정상이다.

사용법:
    python3 tools/straycheck.py            # 찾기만
    python3 tools/straycheck.py --write    # 지운다
    python3 tools/straycheck.py imp        # 하나만
"""
import json
import os
import sys
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
STRAY_REL = 0.08     # 몸 넓이의 이만큼 미만이어야 잔해
GAP_MIN = 2          # 몸과 이만큼 이상 떨어져 있어야 잔해
MAX_CELLS = 24       # 이보다 크면 잔해로 보지 않는다


def blobs(a, fw, fh):
    """이어진 덩어리들 → [(칸 목록)] (여덟 방향)"""
    seen = [[False] * fw for _ in range(fh)]
    out = []
    for y in range(fh):
        for x in range(fw):
            if seen[y][x] or a[y][x] <= 8:
                continue
            q, cells = deque([(x, y)]), []
            seen[y][x] = True
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < fw and 0 <= ny < fh and not seen[ny][nx] and a[ny][nx] > 8:
                            seen[ny][nx] = True
                            q.append((nx, ny))
            out.append(cells)
    return out


def gap_to(cells, body):
    """잔해와 몸 사이의 가장 가까운 거리(체비쇼프)."""
    best = 1e9
    for x, y in cells:
        for bx, by in body:
            d = max(abs(x - bx), abs(y - by))
            if d < best:
                best = d
                if best <= 1:
                    return best
    return best


def main(argv):
    write = '--write' in argv
    only = [x for x in argv if not x.startswith('-')]
    man = json.load(open(MANIFEST, encoding='utf-8'))
    total = 0
    for name, m in sorted(man['characters']['sheets'].items()):
        if only and name not in only:
            continue
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        found = []
        # ★ 죽는 칸(마지막 둘)은 보지 않는다 — 무너진 잔해가 흩어지는 것이 정상이다.
        for i in range(max(0, cnt - 2)):
            ox = i * (fw * S + gap)
            a = [[px[ox + x * S + 1, y * S + 1][3] for x in range(fw)] for y in range(fh)]
            bl = blobs(a, fw, fh)
            if len(bl) < 2:
                continue
            bl.sort(key=len, reverse=True)
            body = bl[0]
            for cells in bl[1:]:
                if len(cells) > MAX_CELLS or len(cells) > len(body) * STRAY_REL:
                    continue
                if gap_to(cells, body) < GAP_MIN:
                    continue
                found.append((i, cells))
        if not found:
            continue
        total += 1
        print(f'  {name:18} ' + '  '.join(
            f'칸{i}: {len(c)}칸 @({min(x for x,_ in c)},{min(y for _,y in c)})'
            for i, c in found))
        if not write:
            continue
        for i, cells in found:
            ox = i * (fw * S + gap)
            for lx, ly in cells:
                for dy in range(S):
                    for dx in range(S):
                        px[ox + lx * S + dx, ly * S + dy] = (0, 0, 0, 0)
        im.save(path)
    print(('지웠다: ' if write else '찾기만 했다(--write 로 지움): ') + f'시트 {total}개'
          if total else '떠 있는 잔해 없음.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
