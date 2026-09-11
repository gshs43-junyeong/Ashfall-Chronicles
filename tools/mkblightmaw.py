#!/usr/bin/env python3
"""역병 아귀 — 머리에 **볼**을 넣어 넓힌다.

■ 무엇이 잘려 보였나

  이 놈은 둥근 머리에 입이 가로로 벌어진 모양이다. 그런데 64칸 프레임에
  머리를 꽉 채워 그리는 바람에 **입이 머리 폭을 다 먹었다.** 이가 x=8 부터
  x=61 까지 늘어서는데 머리 실루엣이 x=2..62 이니, 이와 바깥 테두리 사이에
  이끼색 테 서너 칸밖에 없다. 볼이 없는 것이다.

  그래서 화면에서는 옆구리가 세로로 싹둑 잘린 네모로 보이고, 양끝 이는
  테두리에 딱 붙어 반쯤 썰린 것처럼 읽힌다.

  2마디는 더 심하다. 입이 더 크게 벌어지면서 **이가 머리 테 바깥으로
  삐져나가** 있다(x=55 가 이끼 테인데 이가 56~60 에 또 있다). 화면에서는
  머리 옆에 반쯤 썰린 이 하나가 붙어 있는 것으로 보인다.

■ 어떻게 고쳤나 — 입은 한 픽셀도 안 건드린다

  입 그림(이 · 혀 · 입안)이 이 놈의 얼굴이다. 그걸 다시 그리면 다른 놈이 된다.
  그래서 얼굴은 그대로 두고 **머리 실루엣만 좌우로 여덟 칸씩 부풀린다.**

  처음에는 정해진 자리(x=8, x=56)에 기둥을 끼워 넣었다. 그런데 머리는
  둥글어서 줄마다 폭이 다르고, 마디마다 입의 좌우 끝도 다르다. 고정된 자리로는
  1마디에서는 오른쪽 이 하나가 볼 바깥에 남고 2마디에서는 아예 안 맞았다.

  이제 **줄마다 그 줄의 양 끝에서** 여덟 칸씩 늘린다. 어느 줄이든 머리가
  그만큼 두꺼워지므로 둥글기가 그대로 유지되고, 얼굴은 한가운데 그대로 있다.
  늘린 자리는 머리의 짙은 껍질색이고, 맨 바깥 두 칸은 원래 있던 이끼 테를
  다시 두른다(테를 그대로 두면 새 머리 **안쪽**에 초록 줄이 남는다).

      64칸 → 80칸.  머리 실루엣 61칸 → 77칸, 입은 그대로.
      입과 머리 테 사이에 볼이 여덟 칸씩 생긴다.

  판정 상자도 같이 넓힌다(52 → 66). 보이는 몸과 맞는 자리를 때려야 한다.

■ 굽는 순서

  tools/mkmini2.py 는 이 놈을 더 이상 굽지 않는다(여기서 굽는다).
  여기서 구운 뒤 tools/reanim.py --auto 가 숨쉬기 칸을 만든다.

사용법:  python3 tools/mkblightmaw.py && python3 tools/reanim.py --auto
         && node tools/sync-manifest.mjs
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'game', 'assets', 'boss')
SRC = os.path.join(OUT, '_src')
MANI = os.path.join(ROOT, 'game', 'assets', 'manifest.json')
S = 4
FW, FH = 64, 67
KEEP = (0, 1, 4, 5)             # mkmini2 와 같다 — 첫 벌과 마지막 벌
K = 8                           # 좌우로 부풀리는 칸 수
CHEEK = (0x2b, 0x33, 0x25, 255)  # 머리의 짙은 테 색 — 입 위아래 옆구리와 같다
FRINGE = (0x6d, 0x92, 0x37, 255)  # 옆구리의 이끼 테


def widen(g):
    """머리 실루엣을 좌우로 K 칸씩 부풀린다. 얼굴은 한 칸도 안 옮긴다.

    줄마다 이렇게 나눈다.

        [ 왼쪽 이끼 테 ][      얼굴·몸      ][ 오른쪽 이끼 테 ]
          제자리            K 만큼 밖으로        2K 만큼 밖으로

    그러면 테와 몸 사이에 K 칸이 벌어진다. 거기를 머리의 짙은 껍질색으로
    채우면 그게 볼이다. 이끼 테는 원본 픽셀 그대로라 모양이 안 뭉개진다 —
    테를 벗겼다가 두 칸만 다시 두르니 초록 실오라기처럼 보였다.

    테가 없는 줄(정수리·턱)은 몸을 K 만큼 옮기고 양옆으로 K 씩 늘린다.
    어느 줄이든 2K 만큼 두꺼워지므로 둥근 머리가 가로로 늘어난 둥근 머리가
    되고 어깨에 턱이 안 진다."""
    rows = {}
    for (x, y), c in g.items():
        rows.setdefault(y, []).append(x)
    out = {}
    for y, xs in rows.items():
        xs.sort()
        lf = 0
        while lf < len(xs) and g[(xs[lf], y)][:3] == FRINGE[:3]:
            lf += 1
        rf = 0
        while rf < len(xs) - lf and g[(xs[-1 - rf], y)][:3] == FRINGE[:3]:
            rf += 1
        for i, x in enumerate(xs):
            d = 0 if i < lf else (2 * K if i >= len(xs) - rf else K)
            out[(x + d, y)] = g[(x, y)]
        core = xs[lf:len(xs) - rf]
        if not core:
            continue
        a, b = core[0] + K, core[-1] + K
        for t in range(1, K + 1):
            out.setdefault((a - t, y), CHEEK)
            out.setdefault((b + t, y), CHEEK)
    return out


def main():
    mani = json.load(open(MANI, encoding='utf-8'))
    e = mani['bosses']['sheets']['blight_maw']
    gap = e.get('gap', mani['bosses']['gap'])
    src = Image.open(os.path.join(SRC, 'blight_maw.png')).convert('RGBA')
    px = src.load()
    nfw = FW + 2 * K
    out = Image.new('RGBA', (nfw * S * len(KEEP), FH * S), (0, 0, 0, 0))
    op = out.load()
    for j, i in enumerate(KEEP):
        ox = i * (FW * S + gap)
        g = {}
        for y in range(FH):
            for x in range(FW):
                p = px[ox + x * S + 1, y * S + 1]
                if p[3] > 8:
                    g[(x, y)] = p
        for (x, y), c in widen(g).items():
            if not (0 <= x < nfw and 0 <= y < FH):
                continue
            for dy in range(S):
                for dx in range(S):
                    op[j * nfw * S + x * S + dx, y * S + dy] = c
    p = os.path.join(OUT, 'blight_maw.png')
    out.save(p)
    e['frameW'], e['frameH'], e['count'], e['gap'] = nfw, FH, len(KEEP), 0
    json.dump(mani, open(MANI, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('  blight_maw  %dx%d → %dx%d · %d칸 · %dB'
          % (FW, FH, nfw, FH, len(KEEP), os.path.getsize(p)))
    print('  ENEMIES 의 판정 상자도 w 52 → 66 으로 올려야 한다(data.js)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
