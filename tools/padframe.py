#!/usr/bin/env python3
"""칸 가장자리에 **벽처럼 닿은** 그림에 좌우 여백을 준다.

■ 무엇이 문제였나

  몹 시트는 칸 사이 간격이 0 이라 칸이 딱 붙어 있다. 그림이 칸의 왼쪽이나 오른쪽
  끝에 닿아 있으면, 시트로 볼 때 **옆 칸 그림과 맞닿아** 잘린 것처럼 읽힌다.
  (보스 시트 중 열한 장은 간격이 4 라서 이 문제가 없다 — "보스는 괜찮다"는 말이
   여기서 나온다.)

■ 왜 게임 위치가 안 바뀌나 — 증명

  **가로.** dx = (e.w - frameW)/2 - side 이고, 게임이 다시 재는
  side = ((left+right+1)/2 - fw/2)/S 는 좌우가 함께 밀리면 값이 그대로다.
  좌우에 같은 양 k 를 덧대면 frameW 가 2k 늘어 dx 가 k 줄고, 그림도 칸 안에서
  k 오른쪽으로 가서 정확히 상쇄된다.

  **세로.** 그림은 `sy - dy` 에 그려진다(+dy 가 아니다).
  dy = frameH - e.h - foot 이고 foot = frameH - bottom/S - 1 이므로

      dy = bottom/S + 1 - e.h

  즉 dy 는 frameH 와 **무관**하고, 그림 발끝은 언제나 판정 박스 바닥에 떨어진다.
  위에 k 줄을 덧대면 frameH 와 bottom 이 같이 k 만큼 밀리므로 foot 은 그대로이고
  dy 만 k 늘어난다. 그림도 칸 안에서 k 아래로 가므로 `sy - dy + (y+k)` 에서
  둘이 상쇄된다. **매니페스트의 foot 도 안 고쳐도 된다.**

■ 아래는 안 덧댄다

  발이 칸 맨 아랫줄에 닿는 것이 정상이고, 아래에 여백을 주면 dy 계산의 bottom 이
  바뀌지 않으므로 그냥 빈 줄만 는다.

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
WANT = 2        # 좌우·위에 두고 싶은 최소 여백(논리 픽셀)
# ★ 플레이어 시트는 뺀다. 칸 이름표(playerFrames)도 그리는 길도 몹과 달라서,
#   위의 상쇄가 그대로 성립하는지 확인하지 않았다. 확인 안 한 것은 안 건드린다.
SKIP = ('player',)


def sides(px, ox, fw, fh):
    cols = [x for x in range(fw)
            if any(px[ox + x * S + 1, y * S + 1][3] > 8 for y in range(fh))]
    if not cols:
        return None
    return cols[0], fw - 1 - cols[-1]


def top(px, ox, fw, fh):
    for y in range(fh):
        if any(px[ox + x * S + 1, y * S + 1][3] > 8 for x in range(fw)):
            return y
    return None


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
        worst_x, worst_y = WANT, WANT
        for i in range(cnt):
            ox = i * (fw * S + gap)
            s = sides(px, ox, fw, fh)
            if s:
                worst_x = min(worst_x, s[0], s[1])
            t = top(px, ox, fw, fh)
            if t is not None:
                worst_y = min(worst_y, t)
        if worst_x >= WANT and worst_y >= WANT:
            continue
        kx = max(0, WANT - worst_x)
        ky = max(0, WANT - worst_y)
        todo.append((name, m, path, im, fw, fh, cnt, gap, kx, ky, worst_x, worst_y))

    for name, m, path, im, fw, fh, cnt, gap, kx, ky, wx, wy in todo:
        print(f'  {name:18} {fw}x{fh} → {fw + 2 * kx}x{fh + ky}'
              f'   좌우 +{kx} 위 +{ky} (가장 좁은 여백 좌우 {wx} 위 {wy})')
        if not write:
            continue
        nw, nh = fw + 2 * kx, fh + ky
        out = Image.new('RGBA', (nw * S * cnt + gap * (cnt - 1), nh * S), (0, 0, 0, 0))
        for i in range(cnt):
            fr = im.crop((i * (fw * S + gap), 0, i * (fw * S + gap) + fw * S, fh * S))
            out.paste(fr, (i * (nw * S + gap) + kx * S, ky * S))
        out.save(path)
        m['frameW'] = nw
        m['frameH'] = nh
    if write and todo:
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        print(f'\n덧댔다: {len(todo)}장. ★ node tools/sync-manifest.mjs 를 돌려야 한다.')
    else:
        print(f'\n{"바꿀 것 없음" if not todo else f"찾기만 했다(--write 로 저장): {len(todo)}장"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
