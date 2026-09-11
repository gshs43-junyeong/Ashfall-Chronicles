#!/usr/bin/env python3
"""칸 가장자리에서 **잘려 나간** 그림을 찾는다.

■ 무엇을 잘림으로 보나

  픽셀 그림은 실루엣 둘레에 어두운 윤곽선이 한 겹 있다. 그러니 그림이 제대로
  끝난 자리는 윤곽선이고, **윤곽선 없이 채움색이 그냥 끊긴 자리**는 칸에
  부딪혀 잘린 것이다. tools/unclip.py 가 플레이어 시트에 쓴 판별법과 같다.

  칸 가장자리에 닿았다는 것만으로는 부족하다 — 땅에 선 몹은 발바닥이 칸
  맨 아랫줄에 닿는 게 맞고, 거기엔 윤곽선이 있다. 색을 봐야 갈린다.

■ 내는 값

      잘린칸   윤곽선 없이 끊긴 가장자리 픽셀 수 (칸 전체를 합친 값)
      변       어느 쪽이 잘렸나 (위·아래·왼·오른)

사용법:
    python3 tools/clipcheck.py            # 전부
    python3 tools/clipcheck.py blight_maw # 이름으로 골라서
"""
import json
import os
import sys
from collections import Counter

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
S = 4
MIN_CUT = 4          # 이 아래는 점 몇 개라 잘림으로 안 본다


def lum(p):
    return p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114


def outline_color(cells):
    """투명과 맞닿은 불투명 칸 중 가장 흔한 것들 가운데 제일 어두운 색."""
    c = Counter()
    for p in cells:
        c[p] += 1
    if not c:
        return (18, 18, 26, 255)
    return min(c.most_common(8), key=lambda kv: sum(kv[0][:3]))[0]


def frame_grid(px, ox, fw, fh):
    g = {}
    for y in range(fh):
        for x in range(fw):
            p = px[ox + x * S + 1, y * S + 1]
            if p[3] > 8:
                g[(x, y)] = p
    return g


def edge_cells(g, fw, fh):
    out = []
    for (x, y), p in g.items():
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < fw and 0 <= ny < fh) or (nx, ny) not in g:
                out.append(p)
                break
    return out


def check(g, fw, fh):
    """변마다 (잘린 칸수, 그 변에 닿은 칸수) 를 준다."""
    if not g:
        return {}
    ol = outline_color(edge_cells(g, fw, fh))
    thr = lum(ol) * 1.35 + 6

    def cut(p):
        return lum(p) > thr

    xs = [k[0] for k in g]
    ys = [k[1] for k in g]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    out = {}
    # ★ 아래쪽은 안 본다. 이 게임의 몹은 발바닥이 칸 맨 아랫줄에 닿도록 그려져
    #   있고(그래야 땅에 선다) 발밑에는 윤곽선을 안 긋는다. 아래를 세면 주인공과
    #   원형처럼 멀쩡한 시트까지 전부 걸린다 — 처음 돌렸을 때 101장이 나온 이유가
    #   그것이었다.
    for side, line, span in (
            ('위', [(x, y0) for x in range(fw)] if y0 <= 1 else [], fw),
            ('왼', [(x0, y) for y in range(fh)] if x0 <= 1 else [], fh),
            ('오른', [(x1, y) for y in range(fh)] if x1 >= fw - 2 else [], fh)):
        n = t = 0
        for k in line:
            p = g.get(k)
            if not p:
                continue
            t += 1
            if cut(p):
                n += 1
        # 점 몇 개는 무늬다. 변의 15% 넘게 끊겨야 잘린 것으로 본다.
        if n >= MIN_CUT and n >= span * 0.15:
            out[side] = (n, t)
    return out


def main(argv):
    pick = [a for a in argv if not a.startswith('-')]
    man = json.load(open(os.path.join(ASSETS, 'manifest.json')))
    rows = []
    for sec in ('characters', 'bosses'):
        for name, m in man[sec]['sheets'].items():
            if pick and not any(p in name for p in pick):
                continue
            fw, fh, cnt = m['frameW'], m['frameH'], m['count']
            gap = m.get('gap', 4 if sec == 'bosses' else 0)
            im = Image.open(os.path.join(ASSETS, m['file'])).convert('RGBA')
            px = im.load()
            tot = Counter()
            hit = Counter()
            for i in range(cnt):
                g = frame_grid(px, i * (fw * S + gap), fw, fh)
                for side, (n, t) in check(g, fw, fh).items():
                    tot[side] += n
                    hit[side] = max(hit[side], t)
            if tot:
                rows.append((sec, name, fw, fh, dict(tot), dict(hit)))
    rows.sort(key=lambda r: -sum(r[4].values()))
    print('== 윤곽선 없이 끊긴 가장자리가 있는 시트')
    for sec, name, fw, fh, tot, hit in rows:
        s = ' · '.join('%s %d칸(변 %d)' % (k, v, hit[k]) for k, v in tot.items())
        print('  %-16s %-11s %2dx%-3d  %s' % (name, sec, fw, fh, s))
    print('\n  %d장' % len(rows))
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
