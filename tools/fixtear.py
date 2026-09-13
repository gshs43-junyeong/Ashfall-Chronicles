#!/usr/bin/env python3
"""몸을 세로로 갈라 놓은 **틈**을 메운다.

사막 전갈은 걷는 둘째 그림(칸 3)에서 몸 한가운데에 두 픽셀 너비의 투명한 금이
세로로 나 있었다(x16~17, y12~17). 그래서 머리가 몸에서 잘려 나간 것처럼 보였다.
reanim.py 가 자세를 만들려고 앞뒤를 따로 밀면서 그 사이가 비어 버린 자국이다.

■ 무엇을 틈으로 보나 — **채움색 사이에 낀 투명**만

  이 그림들에는 원래 비어 있어야 할 곳이 있다. 전갈은 말아 올린 꼬리와 등 사이가
  비어 있고, 그 자리는 **윤곽선으로 둘러싸여** 있다. 그래서 갈래를 이렇게 나눈다.

      양옆이 다 **채움색**이고 폭이 좁다  → 찢어진 것. 메운다
      한쪽이라도 **윤곽선**이다            → 원래 비어 있는 곳. 그냥 둔다

  윤곽선이 없다는 것은 그림이 거기서 끝난 적이 없다는 뜻이다 — 픽셀 그림은 실루엣이
  끝나는 자리에 반드시 윤곽선을 두르기 때문이다. tools/clipcheck.py 가 칸 가장자리에
  쓰는 잣대와 같은 것을, 그림 **안쪽**에 쓴다.

  ★ 여기에 둘을 더 건다.

    ① **세로로 길게 이어져야** 한다(MINRUN 줄 이상). 이게 없으면 밝은 부분 사이에 낀
       어두운 한 점까지 전부 걸린다 — 안 걸었을 때 시트 아흔둘이 잡혔고 원형만
       1038칸이었다. 그건 찢어진 게 아니라 그냥 그림이다.

    ② **다른 칸에는 그 자리가 차 있어야** 한다. 이게 결정적이다 — 원래 디자인인 빈틈은
       **모든 칸에 똑같이** 있고(마을 사람 시트가 일곱 칸 모두 같은 자리에 98칸씩
       비어 있었다), 자세를 밀다 찢어진 자국은 **그 칸에만** 있다. 전갈의 금은 칸 3
       에만 있고 칸 0·1·2·4 에는 그 자리가 몸으로 차 있다.

■ 무엇으로 메우나

  왼쪽 이웃의 색을 그대로 가져온다. 없던 색을 만들지 않는다.

■ ★ 찾은 것을 **그대로 믿고 다 메우면 안 된다**

  위의 셋을 다 걸어도 스물넷이 걸리는데, 눈으로 보면 전갈 말고는 전부 **다리 사이 ·
  사슬 고리 사이**였다. 원형(archetype)은 늘어뜨린 사슬의 고리 틈이었고, 쪼개지는 것
  (splitter)은 이름 그대로 갈라진 게 제 모습이다. 그걸 메우면 사슬이 쇠막대가 된다.

  다리 사이와 몸의 금을 자동으로 가를 잣대를 못 찾았다 — 전갈의 금도 위아래가 뚫려
  있어서 "위아래가 막혔나"로는 안 갈린다. 그래서 이 도구는 **찾아 주기만** 하고,
  메울지는 사람이 보고 정한다. 그 뜻으로 `--write` 는 시트 이름을 반드시 받는다.

  볼 때는 메울 자리를 자홍색으로 칠해 놓고 보면 한눈에 갈린다(다리 사이면 다리
  사이에 칠해진다).

사용법:
    python3 tools/fixtear.py                  # 전부 훑어 후보만 본다
    python3 tools/fixtear.py scorpion         # 하나만 본다
    python3 tools/fixtear.py scorpion --write # 눈으로 확인한 것만 메운다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
MAXGAP = 2        # 이보다 넓으면 다리 사이처럼 원래 빈 곳으로 본다
MINRUN = 4        # 같은 x 에서 이만큼 세로로 이어져야 '금'으로 본다


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def outline_color(cells):
    """가장 어두운 색을 윤곽선으로 본다 — clipcheck 와 같은 잣대."""
    return min(cells, key=lum) if cells else (0, 0, 0, 255)


def load(path, fw, fh, cnt, gap):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    out = []
    for i in range(cnt):
        ox = i * (fw * S + gap)
        g = {}
        for y in range(fh):
            for x in range(fw):
                p = px[ox + x * S + 1, y * S + 1]
                if p[3] > 8:
                    g[(x, y)] = p
        out.append(g)
    return out


def save(path, frames, fw, fh, gap):
    im = Image.new('RGBA', ((fw * S + gap) * len(frames) - gap, fh * S), (0, 0, 0, 0))
    px = im.load()
    for i, g in enumerate(frames):
        ox = i * (fw * S + gap)
        for (x, y), c in g.items():
            if not (0 <= x < fw and 0 <= y < fh):
                continue
            for dy in range(S):
                for dx in range(S):
                    px[ox + x * S + dx, y * S + dy] = c
    im.save(path)


def tears(g, fw, fh, thr, elsewhere=None, need=0):
    """메워야 할 칸 목록. 양옆이 다 채움색인 좁은 투명 구간만 고른다.
       elsewhere[(x,y)] 는 다른 칸에서 그 자리가 차 있던 횟수다."""
    found = []
    for y in range(fh):
        x = 0
        while x < fw:
            if (x, y) in g:
                x += 1
                continue
            x0 = x
            while x < fw and (x, y) not in g:
                x += 1
            x1 = x - 1                      # 투명 구간 [x0, x1]
            if x1 - x0 + 1 > MAXGAP:
                continue
            left, right = g.get((x0 - 1, y)), g.get((x1 + 1, y))
            if not left or not right:
                continue                    # 칸 끝까지 뚫린 것은 틈이 아니다
            if lum(left) <= thr or lum(right) <= thr:
                continue                    # 한쪽이 윤곽선 → 원래 비어 있는 곳
            for gx in range(x0, x1 + 1):
                # 다른 칸에서는 그 자리가 몸으로 차 있어야 '이 칸만 찢어진 것'이다
                if elsewhere is not None and elsewhere.get((gx, y), 0) < need:
                    continue
                found.append(((gx, y), left))

    # 세로로 MINRUN 줄 이상 이어진 것만 남긴다 — 흩어진 점은 그림이지 금이 아니다
    by_x = {}
    for (x, y), c in found:
        by_x.setdefault(x, {})[y] = c
    keep = []
    for x, col in by_x.items():
        ys = sorted(col)
        run = [ys[0]]
        for y in ys[1:] + [None]:
            if y is not None and y == run[-1] + 1:
                run.append(y)
                continue
            if len(run) >= MINRUN:
                keep += [((x, yy), col[yy]) for yy in run]
            run = [y] if y is not None else []
    return keep


def scan(name, man):
    sec = 'bosses' if name in man['bosses']['sheets'] else 'characters'
    m = man[sec]['sheets'][name]
    fw, fh, cnt = m['frameW'], m['frameH'], m['count']
    gap = m.get('gap', 4 if sec == 'bosses' else 0)
    path = os.path.join(ASSETS, m['file'])
    frames = load(path, fw, fh, cnt, gap)
    ol = outline_color(list(frames[0].values()))
    thr = lum(ol) * 1.35 + 6
    hits = []
    for i, g in enumerate(frames):
        others = [o for j, o in enumerate(frames) if j != i]
        seen = {}
        for o in others:
            for k in o:
                seen[k] = seen.get(k, 0) + 1
        need = max(1, (len(others) + 1) // 2)      # 나머지 칸의 절반 이상에서 차 있어야
        hits.append(tears(g, fw, fh, thr, seen, need))
    return path, m, fw, fh, gap, frames, hits


def main(argv):
    write = '--write' in argv
    only = [a for a in argv if not a.startswith('-')]
    if write and not only:
        print('시트 이름 없이는 안 메운다 — 후보 대부분이 다리 사이·사슬 틈이다.\n'
              '  먼저 이름 없이 돌려 후보를 보고, 눈으로 확인한 것만 이름을 주어 메워라.')
        return 2
    man = json.load(open(MANIFEST, encoding='utf-8'))
    names = only or [n for sec in ('characters', 'bosses') for n in man[sec]['sheets']]
    total = 0
    for name in names:
        try:
            path, m, fw, fh, gap, frames, hits = scan(name, man)
        except Exception as e:
            print(f'  {name}: 못 읽음 ({e})')
            continue
        n = sum(len(h) for h in hits)
        if not n:
            if only:
                print(f'  {name}: 갈라진 곳 없음')
            continue
        total += 1
        which = [i for i, h in enumerate(hits) if h]
        print(f'  {name:16} 칸 {which}  메울 칸 {n}개')
        if write:
            for g, h in zip(frames, hits):
                for k, c in h:
                    g[k] = c
            save(path, frames, fw, fh, gap)
    print(('메웠다: ' if write else '찾기만 했다(--write 로 저장): ') + f'시트 {total}개'
          if total else '갈라진 곳 없음.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
