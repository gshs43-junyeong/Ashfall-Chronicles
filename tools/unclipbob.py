#!/usr/bin/env python3
"""까딱이다 **칸 아래로 밀려나 잘린** 꼬리를 되살린다.

■ 무엇이 문제인가

  등불(lantern)은 제자리에서 위아래로 까딱인다. 칸1 은 칸0 을 한 줄, 칸3 은 두 줄
  아래로 민 그림이다. 그런데 **칸0 의 밑동이 이미 칸 맨 아랫줄에 닿아 있다**
  (26x34 칸에 5~33줄). 그래서 아래로 밀면 민 만큼이 칸 밖으로 나가 그대로 잘린다 —
  칸1 은 한 줄(3칸), 칸3 은 두 줄(11칸). 게임에서는 걸을 때마다 등불 밑의 뾰족한
  꼬리가 뭉툭하게 끊겼다 돌아온다.

  위로 까딱이게 바꾸면 안 되나? 칸1·칸3 에는 불꽃이 흔들리는 제 색이 42칸·29칸씩
  따로 들어 있다(칸0 을 민 것과 색이 다른 칸들). 칸0 에서 다시 만들면 그 손그림을
  잃는다. 그래서 **칸을 늘려 자리를 만들고, 잘려 나간 줄만 칸0 에서 가져다 메운다.**

■ 아래로 늘려도 게임 위치는 안 바뀐다 — 증명

  그림은 `sy - dy` 에 그려지고 `dy = frameH - e.h - foot`, `foot = frameH - bottom/S - 1`
  이므로 `dy = bottom/S + 1 - e.h` 다. **frameH 와 무관**하고, bottom 은 칸0 의 맨 아래
  불투명 줄이라 빈 줄을 뒤에 붙여도 그대로다. tools/padframe.py 의 증명과 같은 것이고,
  그쪽이 아래를 안 덧대는 이유는 "덧대 봐야 빈 줄만 는다"였다 — 여기서는 그 빈 줄이
  까딱일 자리라 쓸모가 있다.

■ 어느 칸이 얼마나 밀렸는지는 재서 안다

  칸0 을 -6..+6 으로 밀어 보며 가장 많이 겹치는 자리를 고른다. 손으로 적어 두면
  그림이 바뀔 때 어긋난다.

사용법:
    python3 tools/unclipbob.py            # 무엇이 잘렸는지만
    python3 tools/unclipbob.py --write    # 칸을 늘리고 메운다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
REACH = 6          # 칸0 을 이만큼까지 밀어 보며 맞춰 본다

# (시트, 볼 칸들) — 까딱이는 칸만 적는다. 공격·죽음은 제 그림이라 뺀다.
PLAN = [('lantern', (1, 3))]


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name, frames in PLAN:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)

        def cell(fr, x, y):
            return px[fr * (fw * S + gap) + x * S + 1, y * S + 1]

        base = {(x, y): cell(0, x, y)
                for y in range(fh) for x in range(fw) if cell(0, x, y)[3] > 0}

        # 칸마다 가장 잘 겹치는 밀림과, 그때 칸 밖으로 나가는 칸들
        jobs, need = [], 0
        for fr in frames:
            cur = {(x, y) for y in range(fh) for x in range(fw) if cell(fr, x, y)[3] > 0}
            best = None
            for dy in range(-REACH, REACH + 1):
                for dx in range(-REACH, REACH + 1):
                    n = len({(x + dx, y + dy) for (x, y) in base} & cur)
                    if best is None or n > best[0]:
                        best = (n, dx, dy)
            _, dx, dy = best
            lost = {(x + dx, y + dy): c for (x, y), c in base.items() if y + dy >= fh}
            print(f'  {name:12} 칸{fr}: 칸0 을 ({dx},{dy}) 민 그림 · '
                  f'칸 밖으로 나가 잘린 칸 {len(lost)}')
            if lost:
                need = max(need, max(y for _, y in lost) + 1 - fh)
                jobs.append((fr, lost))
        if not jobs:
            print('    잘린 것 없음.')
            continue
        print(f'    → 아래로 {need}줄 늘리고 메운다 ({fh} → {fh + need})')
        if not write:
            continue

        # 칸을 아래로 늘린다 — 뒤에 빈 줄을 붙이는 것뿐이라 그림은 그대로다
        big = Image.new('RGBA', (im.width, (fh + need) * S), (0, 0, 0, 0))
        big.paste(im, (0, 0))
        bp = big.load()
        for fr, lost in jobs:
            ox = fr * (fw * S + gap)
            for (x, y), c in lost.items():
                for ddy in range(S):
                    for ddx in range(S):
                        bp[ox + x * S + ddx, y * S + ddy] = c
        big.save(path)
        m['frameH'] = fh + need
    if write:
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        print('메웠다. ★ node tools/sync-manifest.mjs 를 돌려야 한다.')
    else:
        print('보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
