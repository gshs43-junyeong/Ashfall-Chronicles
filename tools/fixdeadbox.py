#!/usr/bin/env python3
"""쓰러진 그림 뒤에 깔린 **반투명 네모 판**을 걷어낸다.

tools/fixdeadwash.py 는 "칸에 투명한 자리가 한 점도 안 남은" 경우만 잡았다. 그런데
훨씬 흔한 것은 **칸보다 작은 네모**가 시체 뒤에 깔린 경우였다 — 게임에서는 쓰러진
자리에 회색 상자가 같이 뜬다.

■ 어떻게 가리나 — 판은 **꽉 찬 네모**다

  반투명 값 v 마다, "v 이거나 불투명"인 칸만으로 이루어진 **가장 큰 직사각형**을 찾는다
  (히스토그램 최대직사각형). 그 네모가

      · 칸의 BOX_MIN 이상을 차지하고
      · 그 값 픽셀의 BOX_HOLD 이상을 품으면

  판으로 본다. 판 안쪽의 v 픽셀만 지운다. 네모 **밖에 남은 v 는 안 건드린다** —
  그건 몸이 흐려지는 것이지 판이 아니다.

  값마다 따로 보므로, 한 칸에 판과 페이드가 섞여 있어도 판만 걷힌다.

■ 왜 네모인지 확신하나

  털보 원숭이(canopy_ape) 칸5 를 찍어 보면 x6~27 · y7~25 가 **한 칸도 빠짐없이**
  판 아니면 몸이다. 몸이 우연히 그런 네모를 만들 수는 없다.

사용법:
    python3 tools/fixdeadbox.py            # 찾기만
    python3 tools/fixdeadbox.py --write    # 걷어낸다
    python3 tools/fixdeadbox.py capbeast   # 하나만
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
MIN_CELLS = 20      # 이보다 적은 반투명은 판일 수 없다
BOX_MIN = 0.18      # 판이 칸에서 차지해야 하는 최소 넓이
BOX_HOLD = 0.55     # 그 값 픽셀 중 판 안에 들어야 하는 비율
SIDE_MIN = 5        # 판의 가로·세로 최소 길이


def max_rect(ok, fw, fh):
    """ok[y][x] 가 True 인 칸만으로 된 가장 큰 직사각형 → (x0,y0,x1,y1,넓이)."""
    best = (0, 0, -1, -1, 0)
    height = [0] * fw
    for y in range(fh):
        for x in range(fw):
            height[x] = height[x] + 1 if ok[y][x] else 0
        stack = []
        for x in range(fw + 1):
            h = height[x] if x < fw else 0
            start = x
            while stack and stack[-1][1] >= h:
                sx, sh = stack.pop()
                area = sh * (x - sx)
                if area > best[4]:
                    best = (sx, y - sh + 1, x - 1, y, area)
                start = sx
            stack.append((start, h))
    return best


def boxes(px, ox, fw, fh):
    """이 칸에서 걷어낼 (반투명값, 네모, 지울 좌표들) 목록."""
    a = [[px[ox + x * S + 1, y * S + 1][3] for x in range(fw)] for y in range(fh)]
    out = []
    for v, n in Counter(t for row in a for t in row if 0 < t < 255).items():
        if n < MIN_CELLS:
            continue
        ok = [[a[y][x] in (v, 255) for x in range(fw)] for y in range(fh)]
        x0, y0, x1, y1, area = max_rect(ok, fw, fh)
        if area <= 0 or (x1 - x0 + 1) < SIDE_MIN or (y1 - y0 + 1) < SIDE_MIN:
            continue
        if area < fw * fh * BOX_MIN:
            continue
        inside = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)
                  if a[y][x] == v]
        if len(inside) < n * BOX_HOLD:
            continue
        out.append((v, (x0, y0, x1, y1), inside))
    return out


def rectness(px, ox, fw, fh):
    """이 칸의 반투명이 얼마나 '네모답나' — 0~1. 반투명이 거의 없으면 None."""
    a = [[px[ox + x * S + 1, y * S + 1][3] for x in range(fw)] for y in range(fh)]
    semi = [(x, y) for y in range(fh) for x in range(fw) if 0 < a[y][x] < 255]
    if len(semi) < 12:
        return None, None, None
    ok = [[a[y][x] > 0 for x in range(fw)] for y in range(fh)]
    x0, y0, x1, y1, area = max_rect(ok, fw, fh)
    if area <= 0:
        return None, None, None
    inside = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)
              if 0 < a[y][x] < 255]
    return len(inside) / len(semi), (x0, y0, x1, y1), inside


def glow_box(px, fw, fh, cnt, gap):
    """살아 있는 칸과 견줘 죽는 칸만 유독 네모나면, 그건 빛무리가 아니라 판이다.

    빛무리는 몸을 따라 둥글게 퍼지므로 네모 안에 다 안 들어간다 — 재 보니 살아 있는
    칸은 11~34%였는데, 판이 깔린 죽는 칸은 78~100%로 뛰었다. 이 **차이**로 가른다.
    진짜 빛무리인 진홍 눈알(24→48%)과 코어링(57→60%)은 안 뛰므로 저절로 빠진다."""
    live = []
    for i in range(max(0, cnt - 2)):
        r, _, _ = rectness(px, i * (fw * S + gap), fw, fh)
        live.append(r if r is not None else 0.0)
    base = sorted(live)[len(live) // 2] if live else 0.0
    out = []
    for i in range(max(0, cnt - 2), cnt):
        r, box, cells = rectness(px, i * (fw * S + gap), fw, fh)
        if r is None:
            continue
        # 판이라면 네모다워야 할 뿐 아니라 **네모 꼴**이어야 한다. 폭이 두 줄짜리
        # 띠는 판이 아니라 흩어진 잔해다(coreling 칸6 이 그렇게 걸렸다).
        bw, bh = box[2] - box[0] + 1, box[3] - box[1] + 1
        if bw < SIDE_MIN or bh < SIDE_MIN or bw * bh < fw * fh * BOX_MIN:
            continue
        if r >= 0.75 and r >= base + 0.35:
            out.append((i, box, cells, r, base))
    return out


def main(argv):
    write = '--write' in argv
    only = [x for x in argv if not x.startswith('-')]
    man = json.load(open(MANIFEST, encoding='utf-8'))
    total = 0
    # ★ 보스는 손대지 않는다(멀쩡하다고 확인됐다). 그리고 **죽는 칸만** 본다 —
    #   살아 있는 칸의 반투명 네모는 빛무리인 경우가 있다(coreling 칸0~3 이 그렇다).
    for sec in ('characters',):
        for name, m in sorted(man[sec]['sheets'].items()):
            if only and name not in only:
                continue
            path = os.path.join(ASSETS, m['file'])
            im = Image.open(path).convert('RGBA')
            px = im.load()
            fw, fh, cnt = m['frameW'], m['frameH'], m['count']
            gap = m.get('gap', 4 if sec == 'bosses' else 0)
            found = []
            for i in range(max(0, cnt - 2), cnt):        # 죽는 칸(death1·death2)만
                for v, box, cells in boxes(px, i * (fw * S + gap), fw, fh):
                    found.append((i, v, box, cells))
            # 알파가 여러 단계로 섞인 판(빛무리처럼 보이는 것)은 따로 가려낸다
            seen = {(i, tuple(sorted(c))) for i, _, _, c in found}
            for i, box, cells, r, base in glow_box(px, fw, fh, cnt, gap):
                if (i, tuple(sorted(cells))) in seen:
                    continue
                found.append((i, f'섞임 {r*100:.0f}%↔{base*100:.0f}%', box, cells))
            if not found:
                continue
            total += 1
            print(f"  {name:18} " + '  '.join(
                f'칸{i}: α{v} {box[2]-box[0]+1}x{box[3]-box[1]+1} ({len(c)}칸)'
                for i, v, box, c in found))
            if not write:
                continue
            for i, v, box, cells in found:
                ox = i * (fw * S + gap)
                for (lx, ly) in cells:
                    for dy in range(S):
                        for dx in range(S):
                            px[ox + lx * S + dx, ly * S + dy] = (0, 0, 0, 0)
            im.save(path)
    print(('걷어냈다: ' if write else '찾기만 했다(--write 로 저장): ') + f'시트 {total}개'
          if total else '판 없음.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
