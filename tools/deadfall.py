#!/usr/bin/env python3
"""죽는 첫 칸이 **무너지지 않는** 시트를 내려앉힌다.

■ 무엇이 문제인가

  몹 일흔 장의 "죽는 첫 칸 높이 ÷ 선 키"를 재 보면 두 무리로 갈린다.

      제대로 구워진 것   50~65%   (골렘 50 · 궁수 50 · 해골 51 · 폐허 파수병 49 …)
      안 무너진 것       85~100%  (평형추 96 · 눈산토끼 96 · 곰팡이 걷는 것 93 …)

  뒤쪽은 죽는 칸이 **서 있는 몸 그대로**다. 그래서 쓰러뜨리고 나면 몸 크기의
  덩어리가 그 자리에 그대로 남아, 배경에 네모난 색판이 깔린 것처럼 읽힌다
  ("죽을 때 회색 배경"). 평형추는 통짜 돌덩이라 특히 그렇게 보인다.

■ 어떻게 내려앉히나

  reanim.scale_y 와 같은 방식으로 **목적지에서 원본을 찍어 온다** — 줄이는
  쪽으로 찍어 오므로 구멍이 안 생긴다. 발끝을 고정하고 세로로 누른 뒤 가로로
  조금 벌린다(무너지는 것은 퍼진다).

■ 두 번 돌려도 같은 결과다

  이미 70% 아래로 내려앉은 칸은 건드리지 않는다. 그래서 몇 번을 돌려도 된다.

사용법:
    python3 tools/deadfall.py ballast_form            # 얼마나 눌릴지만
    python3 tools/deadfall.py ballast_form --write    # 실제로 누른다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
KY = 0.58       # 세로로 누르는 정도 — 제대로 구워진 것들의 가운데값
KX = 1.08       # 가로로 벌리는 정도
DONE = 0.70     # 이미 이보다 낮으면 손대지 않는다


def logical(px, ox, fw, fh):
    return [[px[ox + x * S + 1, y * S + 1] for x in range(fw)] for y in range(fh)]


def span(a, fw, fh):
    ys = [y for y in range(fh) if any(a[y][x][3] > 8 for x in range(fw))]
    return (ys[0], ys[-1]) if ys else None


def main(argv):
    write = '--write' in argv
    names = [x for x in argv if not x.startswith('-')]
    if not names:
        print('시트 이름을 주세요.')
        return 1
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name in names:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        i = cnt - 2                                   # 죽는 첫 칸
        a0 = logical(px, 0, fw, fh)
        ad = logical(px, i * (fw * S + gap), fw, fh)
        s0, sd = span(a0, fw, fh), span(ad, fw, fh)
        if not s0 or not sd:
            print(f'  {name}: 빈 칸'); continue
        h0, hd = s0[1] - s0[0] + 1, sd[1] - sd[0] + 1
        print(f'  {name:16} 칸{i}: 선 키 {h0} → 죽는 키 {hd} ({hd/h0*100:.0f}%)')
        if hd / h0 <= DONE:
            print('        이미 내려앉았다 — 안 건드림')
            continue
        # 발끝 고정 세로 누름 + 가로 벌림 (목적지에서 원본을 찍어 온다)
        pivot = sd[1] + 1
        b = [[(0, 0, 0, 0)] * fw for _ in range(fh)]
        cx = (min(x for y in range(fh) for x in range(fw) if ad[y][x][3] > 8)
              + max(x for y in range(fh) for x in range(fw) if ad[y][x][3] > 8) + 1) / 2
        for y in range(fh):
            sy = int(pivot - (pivot - y) / KY + 0.5)
            if not (0 <= sy < fh):
                continue
            for x in range(fw):
                sx = int(cx + (x - cx) / KX + 0.5)
                if 0 <= sx < fw and ad[sy][sx][3] > 8:
                    b[y][x] = ad[sy][sx]
        nh = span(b, fw, fh)
        print(f'        → {nh[1]-nh[0]+1} ({(nh[1]-nh[0]+1)/h0*100:.0f}%)')
        if not write:
            continue
        ox = i * (fw * S + gap)
        for y in range(fh):
            for x in range(fw):
                for dy in range(S):
                    for dx in range(S):
                        px[ox + x * S + dx, y * S + dy] = b[y][x]
        im.save(path)
    print('눌렀다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
