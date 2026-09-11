#!/usr/bin/env python3
"""보스 시트에 **쓰러지는 두 칸**을 붙인다.

■ 왜 없었나

  보스 시트 규격은 마디별 숨쉬기 쌍뿐이다(p1_idle1 … p3_idle2). 죽는 칸이
  아예 없다. 그래서 챕터의 절정인 보스 처치가 한 프레임 만에 "펑" 하고
  사라지는 것으로 끝났다.

  몹(characters)은 반대로 death1·death2 가 시트에 있는데 게임이 한 번도
  안 그리고 있었다 — 주저앉은 자세와 흩어지는 더미까지 제대로 그려진
  그림이 여든세 장 놀고 있었다. 보스도 그 결을 그대로 따른다.

      death1  주저앉는다   — 세로로 눌리고 어두워지고 껍질이 뜯긴다
      death2  무너진 더미  — 더 눌리고 더 어두워지고 옅어진다

■ 어떻게 만드나 — 새로 그리지 않는다

  마지막 마디의 숨쉬기 첫 칸을 밑그림 삼아 tools/reanim.py 의 변형을 건다.
  scale_y 는 **발끝을 축으로** 누르므로 선 자리에서 그대로 주저앉고, tone /
  fade 는 색만 건드리고, damage 는 원본 픽셀을 뜯어낸다. 새 픽셀은 한 점도
  안 그린다.

  가로로 퍼뜨리는 것은 **칸에 여유가 있을 때만** 한다. 여유 없이 늘리면
  저장할 때 그대로 잘린다(tools/clipcheck.py 가 잡아내는 그 잘림이다).

■ 매니페스트

  count 가 2 늘고 "death": 2 가 붙는다. game.js 의 enemyFrame 은 마디 수를
  셀 때 이 값을 빼야 한다 — 안 빼면 칸이 둘 늘어난 만큼 마디가 하나 더
  있는 줄 알고 마지막 마디에 쓰러진 그림을 띄운다.

  밑그림을 늘 같은 자리(마지막 숨쉬기 칸)에서 뽑고 늘 같은 개수를 쓰므로
  몇 번을 돌려도 결과가 같다.

사용법:  python3 tools/mkbossdie.py && node tools/sync-manifest.mjs
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reanim as R                                     # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANI = os.path.join(ROOT, 'game', 'assets', 'manifest.json')
NDEATH = 2


def room_x(f):
    """칸 안에서 좌우로 남은 여유(칸)."""
    x0, y0, x1, y1 = f.box()
    return min(x0, f.w - 1 - x1)


def spread(f, k):
    """가로로 퍼뜨린다 — 여유가 있을 때만.

    여유가 없으면 **반대로 조금 오므린다.** 그대로 두면 원래 칸 가장자리에
    닿아 있던 밝은 칸이 그대로 남아 "칸에 부딪혀 잘린 그림"이 된다
    (포자 여왕의 갓이 프레임 폭을 꽉 채워서 실제로 그렇게 걸렸다).
    무너진 더미는 좁아지는 쪽이 오히려 자연스럽다."""
    x0, y0, x1, y1 = f.box()
    grow = (x1 - x0 + 1) * (k - 1) / 2
    # 여유를 딱 맞게 쓰면 그림이 칸 가장자리에 **닿는다** — 그것도 잘림으로
    # 잡힌다(포자 여왕이 2.9 칸 늘리는데 여유가 3 칸이라 딱 걸렸다). 한 칸 남긴다.
    return R.scale_x(f, k if grow <= room_x(f) - 1 else 1.0 / k)


def fall(base, hard):
    """주저앉는 한 칸. hard 0 = 첫 칸, 1 = 무너진 더미."""
    sq = 0.60 if not hard else 0.30
    g = spread(R.scale_y(base, sq), 1.10 if not hard else 1.22)
    g = R.tone(g, 0.76 if not hard else 0.52)
    plan = R._damage_plan(g, 10 if not hard else 26, 6 if not hard else 14,
                          97 + hard * 31, (40, 36, 34, 255), top_keep=0.0)
    g = R.damage(g, plan, 0.9 if not hard else 0.7, 1.0)
    return g if not hard else R.fade(g, 0.72)


def main():
    mani = json.load(open(MANI, encoding='utf-8'))
    sheets = mani['bosses']['sheets']
    for name in list(sheets):
        spec = sheets[name]
        fs, _, gap = R.load('bosses', name)
        idle = spec['count'] - spec.get('death', 0)      # 다시 돌려도 같게
        fs = fs[:idle]
        base = fs[idle - 2] if idle >= 2 else fs[0]      # 마지막 마디의 숨쉬기 첫 칸
        fs = fs + [fall(base, 0), fall(base, 1)]
        spec['count'] = idle + NDEATH
        spec['death'] = NDEATH
        R.save('bosses', name, fs, spec, gap)
        print('  %-15s 숨쉬기 %d칸 + 쓰러짐 %d칸 = %d칸'
              % (name, idle, NDEATH, spec['count']))
    json.dump(mani, open(MANI, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('매니페스트에 count·death 적음 — sync-manifest.mjs 를 돌릴 것')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
