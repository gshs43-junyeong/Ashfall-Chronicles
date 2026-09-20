#!/usr/bin/env python3
"""공격 칸이 서 있는 칸과 똑같아 **전조가 안 읽히는** 것을 고친다.

게임은 `e.atkPose > 0` 일 때 칸4 를 그린다(game.js enemyFrame). 그 그림이 서 있는
모습과 같으면 플레이어는 "지금 때리려 한다"를 볼 방법이 없다.

색까지 넣어 재 보면 평형추(ballast_form)가 99%로 서 있는 칸과 같았다 — 다른 것은
아래에 청록 막대 한 칸뿐이었다. 이 몹의 유일한 특징은 청록 눈이고, 숨 쉴 때 그 눈이
**사그라드는** 것이 이미 설계에 있다(reanim.mob_ballast_form 의 glow 0.72). 그래서
공격 칸에서는 반대로 **눈이 열리게** 한다 — 새 그림을 만드는 게 아니라 이미 있는
이야기를 뒤집는 것이다.

★ 처음에는 발광(glow)으로 밝히려 했는데, 재 보니 눈은 서 있는 칸에서도 이미
  최대 밝기(255)였다. 밝기로는 가를 수 없어서, 눈을 **한 칸 키우는** 쪽으로 바꿨다.
  눈 둘레의 어두운 테(13,40,54)로 청록을 한 칸 번지게 한다.

두 번 돌려도 같다 — 눈이 이미 서 있는 칸보다 크면 건드리지 않는다.

같이 재 보고 **안 고친 것**:
    sand_lizard 98% · reef_shark 95% — 수치는 높지만 붉은 혀와 벌린 입이 눈으로는
    또렷하다. 몸이 커서 작은 변화가 비율에 안 잡힐 뿐이다.
    jungle_frog 98% — 혀가 점 하나라 애매하다. 키우는 것은 그림 판단이라 남긴다.

사용법:
    python3 tools/atkflare.py            # 바뀔 것만
    python3 tools/atkflare.py --write    # 실제로 고친다
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reanim

NAME = 'ballast_form'
ATK = 4


EYE = (43, 224, 255)        # 눈
SOCKET = (13, 40, 54)       # 눈 둘레의 어두운 테


def eye_cells(f, col):
    return {k for k, c in f.p.items() if tuple(c[:3]) == col}


def dilate(f):
    """눈을 둘레의 어두운 테 쪽으로 한 칸 번지게 한다."""
    g = f.copy()
    eye = eye_cells(f, EYE)
    for (x, y) in eye:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = (x + dx, y + dy)
            c = f.p.get(k)
            if c and tuple(c[:3]) == SOCKET:
                g.p[k] = tuple(EYE) + (c[3],)
    return g


def main(argv):
    write = '--write' in argv
    fs, spec, gap = reanim.load('characters', NAME)
    n_idle = len(eye_cells(fs[0], EYE))
    n_atk = len(eye_cells(fs[ATK], EYE))
    print(f'  {NAME} 칸{ATK}: 눈 {n_atk}칸 (서 있는 칸 {n_idle}칸)')
    if n_atk > n_idle:
        print('        이미 열려 있다 — 안 건드림')
        return 0
    fs[ATK] = dilate(fs[ATK])
    print(f'        → {len(eye_cells(fs[ATK], EYE))}칸')
    if write:
        reanim.save('characters', NAME, fs, spec, gap)
        print('  고쳤다.')
    else:
        print('  보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
