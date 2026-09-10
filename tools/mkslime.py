#!/usr/bin/env python3
"""잿빛 슬라임 시트를 고친다 — 튀어오르는 칸(2)은 다시 그리고, 눌린 칸(3)과
공격 칸(4)은 빠진 테두리를 채운다.

■ 무엇이 잘못돼 있었나

  프레임 2 의 오른쪽 아래에 몸에서 떨어져 나온 것처럼 보이는 검은 지느러미가
  1~3px 폭으로 y10~21 을 따라 흘러내리고 있었다. 외곽선이 몸을 따라 닫히지
  않고 한 칸 바깥에서 따로 한 줄 더 그어진 것이다. 알파로는 몸에 붙어 있어서
  (4-이웃으로 이어져 있다) "떨어진 덩이 찾기"로는 안 잡혔고, 눈으로 봐야
  보였다 — 튀어오를 때만 나오는 칸이라 더 늦게 발견됐다.

  덤으로 그 칸만 몸이 x4~26 으로 왼쪽에 치우쳐 있었다(다른 칸은 x2~27).
  뒤집어 왼쪽을 볼 때 지느러미가 반대쪽으로 옮겨 붙어 더 눈에 띄었다.

■ 왜 손으로 안 고치고 다시 그리나

  그 줄만 지우면 오른쪽 외곽선이 비고, 그 자리를 메우면 또 그 안쪽이 빈다.
  칸 하나가 통째로 어긋나 있으므로 통째로 다시 그리는 편이 확실하다.

■ 무엇에 맞춰 그리나

  프레임 3(눌린 칸)의 짝이 되는 **늘어난 칸**이다. 눌린 칸이 y6~21 · x2~27
  이므로 늘어난 칸은 좁고 길게 y1~21 · x6~24 로 잡았다. 색과 이목구비는
  프레임 0 에서 그대로 가져온다 — 눈은 3x3 에 왼쪽 위 한 칸이 회색 반짝임,
  배는 아래쪽 어두운 덩이, 그 한가운데 금빛 십자, 위쪽 왼편에 큰 광택.

  바닥은 반드시 y21 에 닿아야 한다. Sprites.footInset 은 **프레임 0 만** 재서
  모든 칸에 같이 쓰므로, 이 칸만 바닥이 뜨면 튀어오를 때 한 칸 솟는다.

■ 프레임 3·4 — 테두리가 아예 없다

  눌린 칸은 y11~18, 공격 칸은 y10~17 이 **양옆에 외곽선 없이** 몸통 색이 그대로
  프레임 가장자리까지 나간다. 여덟 줄씩이다. 둘 다 몸이 x2~27 로 30칸 프레임에
  꽉 차 있어서, 선 그을 자리가 없자 선을 뺀 것으로 보인다. 그래서 옆구리가
  뭉개져 보이고 어두운 데서는 배경에 녹는다.

  여기는 다시 그리지 않는다. 줄마다 **맨 바깥 칸 하나를 외곽선으로 바꾸기만**
  하면 실루엣은 그대로 두고 선만 닫힌다. 원래 그림을 최대한 살리는 쪽이다.

  죽는 칸(5)도 y15~19 가 같다. 다만 그 칸은 팔레트를 통째로 어둡게 쓰므로
  (외곽선이 (12,12,17) 이 아니라 (10,10,14)) 선 색을 박아 두면 안 되고
  칸마다 실제 쓰는 색에서 가장 어두운 것을 골라야 한다.
  흩어지는 칸(6)은 손대지 않는다 — 낱알로 부서지는 그림이라 '줄의 양 끝'이
  테두리일 이유가 없다.

■ 프레임 3·4 — 입이 어긋나 있다

  입은 금빛 덩이다. 프레임 0·1 을 보면 짜임이 정해져 있다:

      그늘 F F F F        ← 윗입술 위에 지는 그늘 한 줄
      금빛 . G G .
           G G g G
           G G h G
           G G G G
           . G G .

  프레임 3 은 그 **그늘줄이 금빛 한가운데** 들어가 있다(GG / FFFF / GGhG …).
  그래서 맨 위 GG 가 몸에서 떨어져 뜬 금빛 부스러기로 보인다. 그늘을 한 줄
  위로 올리고 그 자리를 금빛으로 이으면 프레임 0 과 같은 짜임이 된다.

  프레임 4 는 벌린 입을 7x3 짜리 각진 검은 덩이로 따로 그려서, 그늘줄과
  윗입술을 통째로 밀어내고 금빛 위에 딱 붙어 있다. 검은 것과 금빛이 한 덩이로
  뭉쳐 보이고, 남은 금빛은 위가 잘려 다른 칸보다 작다.
  검은 덩이를 따로 그리는 대신 **같은 금빛 입을 벌린다** — 금빛 테두리는
  그대로 두고 안쪽만 검게 판다. 그러면 다른 칸과 같은 입이 열린 것으로 읽힌다.

사용법:  python3 tools/mkslime.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'game', 'assets', 'char', 'slime.png')
S, FW, FH, FRAME = 4, 30, 22, 2

PAL = {
    'K': (12, 12, 17),      # 외곽선
    'k': (20, 20, 27),      # 눈
    's': (138, 138, 141),   # 눈 반짝임
    'L': (131, 155, 173),   # 위쪽 밝은 테
    'B': (111, 139, 160),   # 몸통
    'M': (89, 111, 128),    # 아래쪽 테
    'W': (182, 211, 226),   # 광택
    'D': (63, 87, 104),     # 배
    'E': (50, 70, 83),      # 배 맨 아래
    'F': (43, 61, 73),      # 배 위 그늘
    'G': (216, 169, 75),    # 금
    'g': (230, 199, 138),
    'h': (236, 212, 165),
}

# 늘어난 칸의 가로 반지름. 위가 좁고 배가 가장 넓다 — 튀어오르며 위로
# 뽑히는 모양이라 눌린 칸(프레임 3)과 정반대가 되어야 한 쌍으로 읽힌다.
CX = 15
HALF = {
    1: 3, 2: 5, 3: 7, 4: 8, 5: 8, 6: 9, 7: 9, 8: 9, 9: 9, 10: 9,
    11: 9, 12: 9, 13: 9, 14: 9, 15: 9, 16: 9, 17: 8, 18: 8, 19: 7, 20: 6, 21: 5,
}


def build():
    g = [['.'] * FW for _ in range(FH)]

    def put(x, y, ch):
        if 0 <= x < FW and 0 <= y < FH:
            g[y][x] = ch

    def row_span(y):
        h = HALF.get(y)
        return None if h is None else (CX - h, CX + h)

    # 몸통을 통짜로 채운 뒤 테두리를 덮어쓴다. 외곽선을 먼저 긋고 안을 채우면
    # 폭이 바뀌는 줄에서 선이 한 칸씩 새는데, 그게 원래 지느러미가 생긴 방식이다.
    for y in range(FH):
        sp = row_span(y)
        if not sp:
            continue
        for x in range(sp[0], sp[1] + 1):
            put(x, y, 'B')

    def blob(cx, cy, rx, ry, ch, over):
        """타원 덩이. 배도 광택도 프레임 0 에서는 **테두리에서 안쪽으로 들어간
           둥근 덩이**다 — 줄 단위로 폭만 정하면 위가 일자로 잘린 띠가 되고,
           띠는 슬라임이 아니라 물통에 든 물처럼 보인다. 실제로 그렇게 나왔다."""
        for y in range(FH):
            for x in range(FW):
                if g[y][x] not in over:
                    continue
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    put(x, y, ch)

    # 배 — 아래쪽에 치우친 둥근 덩이. 가운데가 아니라 살짝 오른쪽이다(프레임 0 과 같다)
    blob(CX + 1, 18, 7.6, 5.2, 'D', 'B')
    blob(CX + 1, 21.5, 6.0, 2.6, 'E', 'D')      # 배 맨 아래 한 겹

    # 광택 — 위쪽 왼편. 왼눈이 이 안에 박힌다
    blob(CX - 4, 8, 4.0, 4.0, 'W', 'B')

    # 눈 — 3x3, 왼쪽 위 한 칸이 회색 반짝임 (프레임 0 과 같은 규격)
    for ex in (CX - 6, CX + 3):
        for dy in range(3):
            for dx in range(3):
                put(ex + dx, 7 + dy, 'k')
        put(ex, 7, 's')

    # 금빛 십자 — 배 한가운데. 프레임 0 의 모양을 그대로 옮겼다
    ox, oy = CX - 1, 14
    for dx in (1, 2):
        put(ox + dx, oy, 'G'); put(ox + dx, oy + 4, 'G')
    for dy, mid in ((1, 'g'), (2, 'h')):
        put(ox, oy + dy, 'G'); put(ox + 1, oy + dy, 'G')
        put(ox + 2, oy + dy, mid); put(ox + 3, oy + dy, 'G')
    for dx in range(4):
        put(ox + dx, oy + 3, 'G')
    for dx in range(4):                          # 금 바로 위 그늘 한 줄
        put(ox + dx, oy - 1, 'F')

    # 테두리 — 각 줄의 양 끝을 외곽선으로. 줄 사이에 폭이 두 칸 넘게 벌어지면
    # 그 사이도 메워서 선이 끊기지 않게 한다(끊긴 자리가 곧 지느러미였다).
    for y in range(FH):
        sp = row_span(y)
        if not sp:
            continue
        put(sp[0], y, 'K'); put(sp[1], y, 'K')
        prev = row_span(y - 1)
        if prev:
            for x in range(min(prev[0], sp[0]), max(prev[0], sp[0]) + 1):
                put(x, y - 1 if prev[0] > sp[0] else y, 'K')
            for x in range(min(prev[1], sp[1]), max(prev[1], sp[1]) + 1):
                put(x, y - 1 if prev[1] < sp[1] else y, 'K')
    for x in range(*row_span(1)):            # 머리 꼭대기
        put(x, 1, 'K')
    for x in range(row_span(21)[0], row_span(21)[1] + 1):
        put(x, 21, 'K')                      # 바닥 — 반드시 y21

    # 밝은 테(L)와 아래쪽 테(M) — 외곽선 바로 안쪽 한 겹
    for y in range(FH):
        sp = row_span(y)
        if not sp:
            continue
        ring = 'L' if y <= 6 else 'M' if y >= 18 else None
        if not ring:
            continue
        for x in (sp[0] + 1, sp[1] - 1):
            if g[y][x] in 'BD':
                put(x, y, ring)
    for x in range(row_span(2)[0] + 1, row_span(2)[1]):
        if g[2][x] == 'B':
            put(x, 2, 'L')
    for x in range(row_span(20)[0] + 1, row_span(20)[1]):
        if g[20][x] in 'BD':
            put(x, 20, 'E' if g[20][x] == 'D' else 'M')
    return g


def px_get(px, fi, x, y):
    return px[fi * FW * S + x * S, y * S]


def px_put(px, fi, x, y, c):
    for dy in range(S):
        for dx in range(S):
            px[fi * FW * S + x * S + dx, y * S + dy] = c


def close_outline(px, fi):
    """줄마다 맨 바깥 칸을 외곽선으로 바꾼다. 실루엣은 하나도 안 건드린다.

    외곽선 색은 **그 칸에서 실제로 쓰는 것**을 세어 고른다. 죽는 칸처럼
    팔레트가 통째로 어두운 칸이 있어서, (12,12,17) 하나를 박아 두면 그 칸에서만
    선이 튄다."""
    from collections import Counter
    cnt = Counter()
    for y in range(FH):
        for x in range(FW):
            p = px_get(px, fi, x, y)
            if p[3] == 255:
                cnt[p] += 1
    ink = min((c for c in cnt if cnt[c] >= 12), key=lambda c: c[0] + c[1] + c[2])
    n = 0
    for y in range(FH):
        band = [x for x in range(FW) if px_get(px, fi, x, y)[3] > 0]
        if not band:
            continue
        for x in (band[0], band[-1]):
            if px_get(px, fi, x, y) != ink:
                px_put(px, fi, x, y, ink)
                n += 1
    return n, ink


MOUTH = {
    # 프레임: (그늘줄 y, 금빛 왼쪽 x)  — 금빛은 늘 4칸 폭이다
    3: (14, 14),
    4: (13, 14),
}


def fix_mouth3(px):
    """프레임 3 — 그늘줄을 금빛 위로 올리고, 비는 자리를 금빛으로 잇는다."""
    y0, x0 = MOUTH[3]
    for i in range(4):                                   # 그늘 한 줄 (원래 없던 자리)
        px_put(px, 3, x0 + i, y0, PAL['F'] + (255,))
    for i, ch in enumerate('GGgG'):                      # 그늘이 차지하던 자리
        px_put(px, 3, x0 + i, y0 + 2, PAL[ch] + (255,))
    return 8


def fix_mouth4(px):
    """프레임 4 — 검은 덩이를 걷어 내고 같은 금빛 입을 벌린다."""
    y0, x0 = MOUTH[4]
    # 1. 예전 검은 덩이(x12~18, y13~15)를 배 색으로 되돌린다.
    #    y13 은 아직 배가 시작되기 전이라 몸통 색, 그 아래는 배 색이다.
    for y, ch in ((13, 'B'), (14, 'D'), (15, 'D')):
        for x in range(12, 19):
            px_put(px, 4, x, y, PAL[ch] + (255,))
    # 2. 그늘 · 윗입술 · 벌어진 안 · 아랫입술
    # 금빛 테두리 안쪽만 세로로 팠더니 입이 아니라 **금빛 상자에 난 열쇠구멍**이
    # 되었다. 입은 세로로 뚫리는 게 아니라 입술이 위아래로 갈라진다.
    # '.' 은 건드리지 않는 칸(다물었을 때의 십자 팔 자리).
    rows = ['FFFF', '.GG.', 'GGGG', 'kkkk', 'kkkk', 'GGGG', '.GG.']
    for dy, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != '.':
                px_put(px, 4, x0 + i, y0 + dy, PAL[ch] + (255,))
    return 7 * 3 + sum(len(r.replace('.', '')) for r in rows)


def main():
    im = Image.open(SHEET).convert('RGBA')
    px = im.load()

    # 1. 튀어오르는 칸은 통째로 다시 그린다
    g = build()
    x0 = FRAME * FW * S
    for y in range(FH):
        for x in range(FW):
            ch = g[y][x]
            c = PAL[ch] + (255,) if ch != '.' else (0, 0, 0, 0)
            for dy in range(S):
                for dx in range(S):
                    px[x0 + x * S + dx, y * S + dy] = c
    print('프레임 %d · 다시 그림' % FRAME)

    # 2. 눌린 칸·공격 칸·죽는 칸은 빠진 테두리만 채운다.
    #    흩어지는 칸(6)은 낱알로 부서지는 그림이라 줄마다 테두리를 두르면 안 된다.
    for fi in (3, 4, 5):
        n, ink = close_outline(px, fi)
        print('프레임 %d · 테두리 %d칸 채움 (선 색 %s)' % (fi, n, ink[:3]))
    print('프레임 3 · 입 %d칸 고침' % fix_mouth3(px))
    print('프레임 4 · 입 %d칸 고침' % fix_mouth4(px))

    im.save(SHEET)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
