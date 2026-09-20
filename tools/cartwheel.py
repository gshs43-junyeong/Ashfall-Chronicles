#!/usr/bin/env python3
"""광차 유령 — 굴러가는데 걷는 칸이 서 있는 칸의 복사본이었다.

재 보면 칸0=칸2, 칸1=칸3 이라 지나가는 광차가 멈춘 그림으로 미끄러졌다.

■ 바퀴 살을 돌리려다 물러섰다 — 9픽셀 바퀴에서는 대각선이 안 읽힌다

  바퀴에는 살이 **십자(+)** 로 박혀 있어서, 걷는 칸에서 45° 돌려 ×자로 만들면
  굴렀다는 것이 읽히리라 보았다. 실제로 해 보니 안 됐다 —

    · 1픽셀 대각선은 픽셀끼리 **모서리로만** 닿아 끊겨 보인다. 같은 색·같은 굵기인데도
      이어진 막대인 +자보다 훨씬 흐리다(팔 길이 2·3·4 를 다 그려 놓고 견줬다).
    · 흐린 것을 메우려고 가운데를 3x3 으로 채웠더니 이번엔 살이 아니라 **어두운
      네모 덩어리**가 됐다. 바퀴가 통째로 어두워져 다른 칸과 안 맞았다
      ("바퀴 일관성 문제"로 지적받은 것이 이것이다).

  그래서 **바퀴는 원래 십자 그대로 둔다.** 아홉 픽셀 안에서 회전을 그리려면 살을
  옮길 게 아니라 바퀴를 다시 그려야 하고, 그건 이 도구가 할 일이 아니다.

■ 대신 광차가 **튄다**

  레일 위를 구르는 광차는 덜컹인다. 손대지 않는 서 있는 두 칸에서 만들되 높이만
  달리해서 걷는 두 칸을 만든다 —

      칸2 = 칸0 을 한 칸 올림
      칸3 = 칸1 을 두 칸 올림

  칸0 과 칸1 이 서로 다르므로(숨) 걷는 두 칸도 서로 다르고, 넷이 모두 구별된다.
  두 번 돌려도 같다 — 늘 칸0·칸1 에서 만든다.

사용법:
    python3 tools/cartwheel.py            # 바뀔 것만
    python3 tools/cartwheel.py --write    # 실제로 고친다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
PLAN = [(2, 0, 1), (3, 1, 2)]       # (만들 칸, 바탕 칸, 올릴 높이)


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    m = man['characters']['sheets']['cartwraith']
    path = os.path.join(ASSETS, m['file'])
    im = Image.open(path).convert('RGBA')
    px = im.load()
    fw, fh = m['frameW'], m['frameH']
    gap = m.get('gap', 0)

    for dst, src, lift in PLAN:
        so, do = src * (fw * S + gap), dst * (fw * S + gap)
        grid = [[px[so + x * S + 1, y * S + 1] for x in range(fw)] for y in range(fh)]
        out = [grid[y + lift] if y + lift < fh else [(0, 0, 0, 0)] * fw
               for y in range(fh)]
        n = sum(1 for row in out for c in row if c[3] > 8)
        print(f'  칸{dst} ← 칸{src} 을 {lift}칸 올림   ({n}칸)')
        if write:
            for y in range(fh):
                for x in range(fw):
                    for dy in range(S):
                        for dx in range(S):
                            px[do + x * S + dx, y * S + dy] = out[y][x]
    if write:
        im.save(path)
    print('고쳤다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
