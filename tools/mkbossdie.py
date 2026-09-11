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

■ 마리마다 다르게 무너진다

  스물세 마리가 전부 같은 식으로 눌려 사라지면 "죽는 연출이 하나 있다"가 된다.
  **무엇으로 만들어진 놈인지**에 따라 무너지는 방식을 여덟 갈래로 갈랐다.
  data.js 의 BOSS_DIE(입자)와 같은 결로 짝지어 둔다 — 그림과 입자가 따로
  놀면 둘 다 겉돈다.

      splat      젤·살    납작하게 퍼진다
      crumble    돌       주저앉으며 잘게 부서진다
      topple     쇠       옆으로 기울며 무너진다
      shatter    얼음·석고 높이를 지킨 채 산산조각 난다
      wither     풀       사방으로 오그라들며 옅어진다
      emberfall  불       가라앉으며 더 타오르다 꺼진다
      implode    공허     가운데로 빨려 들어간다
      dissipate  고리     모양을 지킨 채 흩어져 사라진다

■ 어떻게 만드나 — 새로 그리지 않는다

  마지막 마디의 숨쉬기 첫 칸을 밑그림 삼아 tools/reanim.py 의 변형을 건다.
  scale_y 는 **발끝을 축으로** 누르므로 선 자리에서 그대로 주저앉고, shear 는
  기울이고, tone / fade 는 색만 건드리고, damage 는 원본 픽셀을 뜯어낸다.
  새 픽셀은 한 점도 안 그린다.

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
import math
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
    여유를 딱 맞게 쓰면 가장자리에 **닿는다** — 그것도 잘림으로 잡히므로
    한 칸 남긴다."""
    if k == 1.0:
        return f
    x0, y0, x1, y1 = f.box()
    grow = (x1 - x0 + 1) * (k - 1) / 2
    return R.scale_x(f, k if (k < 1 or grow <= room_x(f) - 1) else 1.0 / k)


# 갈래별 두 칸. (세로눌림, 가로, 기울임(도), 밝기, 뜯는 칸수, 금, 옅기, 가운데축)
STYLE = {
    'splat':     [(.45, 1.25, 0, .82, 12, 6, 1.0, 0), (.18, 1.40, 0, .60, 26, 12, .70, 0)],
    'crumble':   [(.62, 1.08, 0, .76, 14, 8, 1.0, 0), (.30, 1.18, 0, .52, 30, 16, .72, 0)],
    'topple':    [(.72, 1.04, 14, .74, 12, 7, 1.0, 0), (.34, 1.12, 30, .50, 28, 14, .70, 0)],
    'shatter':   [(.92, 1.02, 4, .86, 22, 10, .92, 0), (.80, 1.06, 9, .62, 44, 20, .50, 0)],
    'wither':    [(.70, .86, 0, .72, 10, 6, .90, 1), (.40, .62, 0, .50, 22, 10, .55, 1)],
    'emberfall': [(.66, 1.10, 0, .95, 12, 8, 1.0, 0), (.30, 1.20, 0, .64, 28, 16, .68, 0)],
    'implode':   [(.62, .70, 0, .70, 10, 5, .88, 1), (.26, .32, 0, .44, 20, 9, .48, 1)],
    'dissipate': [(.96, 1.00, 0, .84, 26, 12, .78, 1), (.90, 1.00, 0, .58, 50, 24, .38, 1)],
}

BOSS_STYLE = {
    'king_slime': 'splat', 'blight_maw': 'splat', 'mine_horror': 'splat',
    'tide_warden': 'splat',
    'storm_warden': 'crumble', 'sand_guardian': 'crumble', 'shaft_maw': 'crumble',
    'isle_keeper': 'crumble',
    'first_keeper': 'topple', 'overseer': 'topple', 'proliferator': 'topple',
    'drowned_keeper': 'topple',
    'frost_witch': 'shatter', 'ice_warden': 'shatter', 'archetype': 'shatter',
    'bone_lord': 'shatter',
    'vine_lord': 'wither', 'spore_queen': 'wither',
    'hepha': 'emberfall',
    'void_king': 'implode', 'corrupt_heart': 'implode',
    'pursuer': 'dissipate', 'restorer': 'dissipate',
}
DEFAULT_STYLE = 'crumble'
GLOW_HUE = {'emberfall': 'amber', 'implode': 'violet', 'dissipate': 'cyan'}


def lean(f, deg):
    """옆으로 기울인다 — **칸 안에 들어갈 만큼만.**

    전단은 밑에서 위로 갈수록 옆으로 민다. 90칸짜리 파수꾼을 30도로 기울이면
    꼭대기가 52칸 밀려 칸 밖으로 나간다(실제로 최초의 파수꾼과 증식체가 그렇게
    잘렸다). 남은 여유로 각도를 되잡고, 여유가 넓은 쪽으로 기운다."""
    if not deg:
        return f
    x0, y0, x1, y1 = f.box()
    h = max(y1 - y0 + 1, 1)
    left, right = x0, f.w - 1 - x1
    room = max(left, right) - 1
    if room <= 0:
        return f
    lim = math.degrees(math.atan(room / h))
    d = min(abs(deg), lim) * (1 if right >= left else -1)
    return R.shear(f, d)


def fall(base, style, hard):
    """한 칸을 만든다. hard 0 = 첫 칸, 1 = 두 번째 칸."""
    sq, sx, sh, tn, chip, crack, fd, mid = STYLE[style][hard]
    g = base
    if sq != 1.0:
        # 가운데축이면 발끝이 아니라 몸 한가운데를 축으로 — 오그라들거나 빨려 든다
        piv = None
        if mid:
            b = g.box()
            piv = (b[1] + b[3]) / 2
        g = R.scale_y(g, sq, piv)
    g = spread(g, sx)
    g = lean(g, sh)          # 눌러서 낮아진 뒤에 기울인다 — 밀리는 폭이 그만큼 준다
    g = R.tone(g, tn)
    hue = GLOW_HUE.get(style)
    if hue:
        g = R.glow(g, 1.5 if not hard else 1.2, hue=hue)
    plan = R._damage_plan(g, chip, crack, 97 + hard * 31 + len(style),
                          (40, 36, 34, 255), top_keep=0.0)
    g = R.damage(g, plan, 0.9 if not hard else 0.7, 1.0)
    return g if fd >= 1.0 else R.fade(g, fd)


def main():
    mani = json.load(open(MANI, encoding='utf-8'))
    sheets = mani['bosses']['sheets']
    for name in list(sheets):
        spec = sheets[name]
        fs, _, gap = R.load('bosses', name)
        idle = spec['count'] - spec.get('death', 0)      # 다시 돌려도 같게
        fs = fs[:idle]
        base = fs[idle - 2] if idle >= 2 else fs[0]      # 마지막 마디의 숨쉬기 첫 칸
        st = BOSS_STYLE.get(name, DEFAULT_STYLE)
        fs = fs + [fall(base, st, 0), fall(base, st, 1)]
        spec['count'] = idle + NDEATH
        spec['death'] = NDEATH
        R.save('bosses', name, fs, spec, gap)
        print('  %-15s %-10s 숨쉬기 %d칸 + 쓰러짐 %d칸 = %d칸'
              % (name, st, idle, NDEATH, spec['count']))
    json.dump(mani, open(MANI, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('매니페스트에 count·death 적음 — sync-manifest.mjs 를 돌릴 것')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
