#!/usr/bin/env python3
"""칸 하나의 픽셀 몇 개를 **손으로** 고친다.

도구로 가릴 수 없고 사람이 보고 정해야 하는 것들이 남는다. 그런 것을 코드 밖
어딘가에 몰래 고쳐 두면 다음에 시트를 다시 구울 때 조용히 사라지므로, 무엇을 왜
고쳤는지 여기 적어 둔다.

좌표는 **논리 픽셀**(frameW x frameH 기준)이고, 색은 RGB 다. 색 대신 None 을 주면
그 칸을 **비운다**(투명). 어느 쪽이든 칸마다 결과를 통째로 지정하므로, 몇 번을
돌려도 같은 그림이 된다 — 값을 더하거나 빼지 않는다.

사용법:
    python3 tools/pixfix.py            # 무엇이 바뀔지만
    python3 tools/pixfix.py --write    # 실제로 고친다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4

HOOD = (11, 7, 16)          # 서기의 두건 안쪽 어둠
INK = (12, 12, 17)          # 해골 시트의 윤곽선
SHAFT = (232, 226, 192)     # 궁수의 화살대
ICE = (111, 168, 196)       # 얼음에 갇힌 순례자의 얼음 밑색
HORN = (235, 215, 180)      # 화염 임프의 뿔


def _imp_horn(get, fw, fh):
    """임프의 뿔 끝 한 줄. 칸0 의 그 줄을 그대로 옮겨 적은 것이다 —
       왼뿔(x7~10) · 정수리(x13~14) · 오른뿔(x18~20).

    ★ 줄 번호를 못 박으면 안 된다. tools/padframe.py 가 위에 여백을 한 줄 덧대면
      그림이 통째로 한 줄 내려가고, 그러면 못 박아 둔 줄에 **뿔이 하나 더** 그려진다
      (실제로 한 번 그럴 뻔했다). 머리 윗변 — x7~20 이 한 칸도 안 비고 찬 첫 줄 —
      을 찾아 그 **한 줄 위**에 놓는다. 뿔 줄 자체는 x11·12·15~17 이 비어 있어
      윗변으로 잡히지 않으므로, 두 번 돌려도 같은 자리를 가리킨다."""
    HEAD = range(7, 21)
    for y in range(fh):
        if all(get(x, y) for x in HEAD):
            if y == 0:
                return []                    # 자리가 없다 — 덧댈 여백부터 준다
            return [((x, y - 1), c) for (x, c) in
                    ((7, INK), (8, HORN), (9, HORN), (10, INK),
                     (13, INK), (14, INK), (18, INK), (19, HORN), (20, INK))]
    return []


def _frostbound_legs(left, lift=False):
    """서릿결박의 밑 세 줄(36·37·38)을 **칸0 과 같은 짜임**으로 다시 놓는다.

    칸0 은 몸통 밑너비 18칸을 2(윤곽)·6(다리)·2(사이)·6(다리)·2(윤곽) 로 나눈다 —
    좌우 여백이 똑같아 두 다리가 몸통에 같은 식으로 붙는다. 칸3·칸4 는 그 짜임이
    깨져 있었다(칸3 은 다리가 한 덩어리로 붙어 **10칸짜리 기둥 하나**, 칸4 는
    다리 한 쌍이 왼쪽으로 2칸 쏠려 **오른쪽에 4칸짜리 검은 턱**이 남았다).

    left 는 그 칸의 몸통 채움이 시작하는 x(윤곽선 바로 안쪽). 칸마다 결과를 통째로
    적어 내므로 몇 번을 돌려도 같다.

    lift 를 주면 **오른다리를 한 줄 든다**(맨 아랫줄을 밑창 윤곽으로 바꾼다).
    걷기 두 칸이 다리 벌림만 다르면 animcheck 가 "미끄러짐"으로 잡는다 — 실제로
    한 발이 땅에서 떨어져야 걸음으로 읽힌다."""
    def col(o, y):
        if o in (-1, 18):
            return None
        if y == 36:
            return INK if o in (0, 1, 8, 9, 16, 17) else ICE
        if o in (0, 17):
            return None
        if lift and y == 38 and 10 <= o <= 15:
            return INK                      # 든 발의 밑창 — 배경이 밝아도 테두리가 산다
        return INK if o in (1, 8, 9, 16) else ICE
    return [((left + o, y), col(o, y))
            for y in (36, 37, 38) for o in range(-1, 19)]


PATCHES = [
    # 필경사의 공격 칸 — 망치와 눈이 구별되지 않는다.
    #
    # 서기는 두건 안에서 금빛 눈(216,169,75) 두 쌍이 빛난다. 공격 칸에서는 크림빛
    # 망치(232,203,147)가 머리 높이로 올라오는데, 그 망치가 **오른쪽 눈의 바깥
    # 절반(x16)을 먹고 눈에 딱 붙어** 있다. 둘 다 어둠 위의 밝은 색이라, 붙어 있으면
    # 하나의 밝은 덩어리로 읽힌다.
    #
    # 그래서 x16 을 두건 어둠으로 되돌려 **눈과 망치 사이에 한 칸의 어둠**을 넣는다.
    # 픽셀 그림에서 밝은 것 둘을 가르는 표준적인 방법이고, 아무것도 옮기거나
    # 다시 칠하지 않는다. 눈이 한 칸으로 좁아지지만 고개를 튼 자세라 어색하지 않다.
    ('archivist', 4, [((16, 7), HOOD), ((16, 8), HOOD)],
     '망치와 눈 사이에 어둠 한 칸'),

    # 해골의 숨 쉬는 칸 — 왼팔이 갈비뼈에 **가름선 없이** 붙어 있다.
    #
    # 서 있는 칸(칸0)은 팔과 갈비뼈 사이에 윤곽선 한 칸이 22~25줄에 걸쳐 서 있는데,
    # 칸1 은 그것이 24~25줄에만 남아 있다. 두 줄이 빠진 자리에서 팔과 몸이 한 덩어리로
    # 뭉쳐 보인다. 칸0 과 같은 구조가 되도록 두 칸을 채운다.
    ('skeleton', 1, [((9, 22), INK), ((9, 23), INK)],
     '왼팔과 갈비뼈 사이 가름선 두 칸 (칸0 과 같은 구조로)'),

    # 궁수의 공격 칸 — 화살이 **당긴 손에 닿지 않는다.**
    #
    # 활은 오른쪽(x20~23), 화살대는 21줄에 가로로 누워 x7~x21 을 지난다. 시위를
    # 당긴 팔은 왼쪽 아래로 뻗어 21줄에서 x3 까지 온다. 그 사이 x4·x5·x6 세 칸이
    # **순전한 검정(12,12,17)** 이라, 손끝과 화살대 사이에 세 칸짜리 검은 틈이
    # 벌어져 화살이 허공에 떠 보인다.
    #
    # 활을 쥔 손 쪽(오른쪽)은 이미 닿아 있다 — 화살 끝이 활대를 지나간다. 모자란
    # 것은 **오늬 쪽**뿐이므로 화살대를 손까지 세 칸 늘인다. 활을 힘껏 당기면
    # 오늬가 몸 뒤까지 오는 것이 맞는 자세다. 아무것도 옮기지 않는다.
    ('archer', 4, [((4, 21), SHAFT), ((5, 21), SHAFT), ((6, 21), SHAFT)],
     '화살대를 당긴 손까지 세 칸 잇는다'),

    # 서릿결박의 걷기 둘째 칸 — 다리 둘이 **한 덩어리**로 붙어 있었다.
    # (다른 여섯 칸은 모두 6칸짜리 다리 둘인데 이 칸만 10칸짜리 기둥 하나였다.)
    ('frostbound', 3, _frostbound_legs(7, lift=True),
     '붙어 버린 다리를 칸0 과 같은 6·2·6 으로 가르고, 오른발을 든다'),

    # 서릿결박의 공격 칸 — 다리 한 쌍이 왼쪽으로 2칸 쏠려 **왼다리는 몸통 왼쪽
    # 끝에 딱 붙고 오른다리 바깥에는 4칸짜리 검은 턱**이 매달려 있었다. 그 턱
    # 밑에는 아무것도 없어서 오른다리가 몸통에서 떨어진 것처럼 읽힌다.
    ('frostbound', 4, _frostbound_legs(9),
     '다리 한 쌍을 2칸 오른쪽으로 — 좌우 여백을 2칸씩 똑같이'),

    # 화염 임프 — 걷는 칸과 때리는 칸에서 **뿔이 통째로 없다.**
    #
    # 임프는 제자리에서 위아래로 까딱인다. 칸2(걷기 첫 장)와 칸4(공격)는 칸0 을
    # 한 줄 **위로** 민 그림인데, 미는 과정에서 맨 윗줄이 칸 밖으로 나가 잘렸다.
    # 그 맨 윗줄이 하필 뿔 끝이라, 두 칸만 정수리가 납작하다(머리 윗변이
    # `##############` 한 줄로 끝난다). 칸0·칸1·칸3 은 멀쩡하다.
    #
    # 칸 위쪽 두 줄(0·1)은 어느 칸에서도 비어 있으므로 자리는 있다. 칸0 의 뿔 줄을
    # 한 줄 위(1줄)에 그대로 옮겨 적는다 — 칸2·칸4 가 "칸0 을 한 줄 올린 것"이라는
    # 원래 모양이 그대로 완성된다. 아무것도 옮기거나 다시 칠하지 않는다.
    ('imp', 2, _imp_horn, '잘려 나간 뿔 끝 한 줄을 되살린다'),
    ('imp', 4, _imp_horn, '잘려 나간 뿔 끝 한 줄을 되살린다'),
]


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name, frame, cells, why in PATCHES:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh = m['frameW'], m['frameH']
        gap = m.get('gap', 0)
        ox = frame * (fw * S + gap)
        # 자리를 그림에서 찾아야 하는 것은 함수로 적는다 — _imp_horn 참고
        if callable(cells):
            cells = cells(lambda x, y: px[ox + x * S + 1, y * S + 1][3] > 0, fw, fh)
        shown = []
        for (lx, ly), col in cells:
            was = px[ox + lx * S + 1, ly * S + 1]
            now = col + (255,) if col else (0, 0, 0, 0)
            if was == now:
                continue                      # 이미 그렇게 되어 있다
            shown.append(f'({lx},{ly}) {was[:3] if was[3] else "빔"}'
                         f'→{col if col else "빔"}')
            if write:
                for dy in range(S):
                    for dx in range(S):
                        px[ox + lx * S + dx, ly * S + dy] = now
        print(f'  {name:14} 칸{frame}  {why}'
              f'{"" if shown else "  (바뀔 것 없음)"}')
        for line in shown:
            print(f'       {line}')
        if write:
            im.save(path)
    print('고쳤다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
