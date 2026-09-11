#!/usr/bin/env python3
"""유적 미니보스 여섯 — 시트에서 **가운데 두 칸을 덜어낸다**.

  이 여섯은 2페이즈다(ENEMIES 의 ph). 그런데 시트는 3페이즈 시절 그대로 여섯
  칸(3페이즈 × idle 2)이라, 게임은 첫 벌과 마지막 벌만 쓰고 가운데 벌은 한 번도
  안 쓴다(enemyFrame 이 마디를 벌 수에 비례해 나눠서 ph0→0벌 ph1→마지막 벌).

  안 쓰는 칸을 시트에 두면 파일이 1.5배 무겁고, 다음에 이 시트를 만지는 사람이
  "가운데 벌은 언제 나오나" 를 또 찾아보게 된다. 덜어낸다.

      6칸(0 1 | 2 3 | 4 5) → 4칸(0 1 | 4 5)

  원본은 game/assets/boss/_src/ 에 있다. 거기서 읽으므로 몇 번을 돌려도 같다.

사용법:  python3 tools/mkmini2.py && node tools/sync-manifest.mjs
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'game', 'assets', 'boss')
SRC = os.path.join(OUT, '_src')
MANI = os.path.join(ROOT, 'game', 'assets', 'manifest.json')
S = 4
KEEP = (0, 1, 4, 5)                      # 첫 벌과 마지막 벌만 남긴다
# ★ 역병 아귀는 여기서 빠졌다. 그 놈은 머리를 좌우로 부풀려야 해서
#   tools/mkblightmaw.py 가 따로 굽는다. 여기 두면 좁은 시트로 되돌린다.
MINI = ('mine_horror', 'ice_warden', 'vine_lord',
        'sand_guardian', 'spore_queen')


def main():
    with open(MANI, encoding='utf-8') as f:
        mani = json.load(f)
    sheets = mani['bosses']['sheets']
    dflt = mani['bosses']['gap']
    for name in MINI:
        e = sheets[name]
        fw, fh = e['frameW'], e['frameH']
        gap = e.get('gap', dflt)
        src = Image.open(os.path.join(SRC, name + '.png')).convert('RGBA')
        out = Image.new('RGBA', (fw * S * len(KEEP), fh * S), (0, 0, 0, 0))
        for j, i in enumerate(KEEP):
            x0 = i * (fw * S + gap)
            out.paste(src.crop((x0, 0, x0 + fw * S, fh * S)), (j * fw * S, 0))
        p = os.path.join(OUT, name + '.png')
        out.save(p)
        e['count'] = len(KEEP)
        e['gap'] = 0
        print('  %-14s %d칸 → %d칸 · %dx%d · %dB'
              % (name, 6, len(KEEP), out.size[0], out.size[1], os.path.getsize(p)))
    with open(MANI, 'w', encoding='utf-8') as f:
        json.dump(mani, f, ensure_ascii=False, indent=2)
    print('매니페스트 count=4 gap=0 으로 고침')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
