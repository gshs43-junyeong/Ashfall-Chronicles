#!/usr/bin/env python3
"""칸 가장자리에 **벽처럼 닿은** 그림에 좌우 여백을 준다.

■ 무엇이 문제였나

  몹 시트는 칸 사이 간격이 0 이라 칸이 딱 붙어 있다. 그림이 칸의 왼쪽이나 오른쪽
  끝에 닿아 있으면, 시트로 볼 때 **옆 칸 그림과 맞닿아** 잘린 것처럼 읽힌다.
  (보스 시트 중 열한 장은 간격이 4 라서 이 문제가 없다 — "보스는 괜찮다"는 말이
   여기서 나온다.)

■ 왜 좌우만 하나 — 게임 위치가 안 바뀌는 것이 **증명되는** 쪽이라서

      dx = (e.w - frameW) / 2 - side          (game.js drawEnemy)

  좌우에 **같은 양 k** 를 덧대면 frameW 가 2k 늘어 dx 가 k 줄고, 그림도 칸 안에서
  k 오른쪽으로 간다. 둘이 정확히 상쇄되므로 화면에서 한 픽셀도 안 움직인다.

  세로는 dy = frameH - e.h - foot 이라 위에 k 를 덧대면 foot 을 2k 만큼 같이
  고쳐야 상쇄된다. 그건 이 도구가 안 한다 — 맞물린 값이 하나 더 늘면 틀릴 자리도
  하나 더 는다.

■ 아래 벽은 건드리지 않는다

  땅에 서려면 발이 칸 맨 아랫줄에 닿아야 한다. 아래가 꽉 찬 것은 정상이다.

사용법:
    python3 tools/padframe.py            # 얼마나 덧댈지만
    python3 tools/padframe.py --write    # 실제로 덧댄다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
WANT = 2        # 좌우에 두고 싶은 최소 여백(논리 픽셀)
# ★ 플레이어 시트는 뺀다. 칸 이름표(playerFrames)도 그리는 길도 몹과 달라서,
#   위의 상쇄가 그대로 성립하는지 확인하지 않았다. 확인 안 한 것은 안 건드린다.
SKIP = ('player',)


def sides(px, ox, fw, fh):
    cols = [x for x in range(fw)
            if any(px[ox + x * S + 1, y * S + 1][3] > 8 for y in range(fh))]
    if not cols:
        return None
    return cols[0], fw - 1 - cols[-1]


def main(argv):
    write = '--write' in argv
    only = [x for x in argv if not x.startswith('-')]
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    todo = []
    for name, m in sorted(sheets.items()):
        if only and name not in only:
            continue
        if name.startswith(SKIP):
            continue
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        worst = WANT
        for i in range(cnt):
            s = sides(px, i * (fw * S + gap), fw, fh)
            if s:
                worst = min(worst, s[0], s[1])
        if worst >= WANT:
            continue
        k = WANT - worst
        todo.append((name, m, path, im, fw, fh, cnt, gap, k, worst))

    for name, m, path, im, fw, fh, cnt, gap, k, worst in todo:
        print(f'  {name:18} {fw}x{fh} → {fw + 2 * k}x{fh}   양쪽 +{k} (가장 좁은 여백 {worst})')
        if not write:
            continue
        nw = fw + 2 * k
        out = Image.new('RGBA', (nw * S * cnt + gap * (cnt - 1), fh * S), (0, 0, 0, 0))
        for i in range(cnt):
            fr = im.crop((i * (fw * S + gap), 0, i * (fw * S + gap) + fw * S, fh * S))
            out.paste(fr, (i * (nw * S + gap) + k * S, 0))
        out.save(path)
        m['frameW'] = nw
    if write and todo:
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        print(f'\n덧댔다: {len(todo)}장. ★ node tools/sync-manifest.mjs 를 돌려야 한다.')
    else:
        print(f'\n{"바꿀 것 없음" if not todo else f"찾기만 했다(--write 로 저장): {len(todo)}장"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
