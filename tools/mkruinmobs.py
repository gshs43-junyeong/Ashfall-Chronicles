#!/usr/bin/env python3
"""유적마다 그곳에서만 나오는 몬스터 한 종의 스프라이트를 굽는다 — 다섯 장.

  char/frostbound.png    26x38 x 7  얼음 던전   — 언 순례자
  char/jarhusk.png       24x26 x 7  피라미드    — 단지 껍데기
  char/cartwraith.png    30x22 x 7  버려진 광산 — 빈 광차
  char/sacling.png       24x30 x 7  부패한 둥지 — 주머니의 것
  char/ventspitter.png   26x28 x 7  포자 굴     — 구멍벌레

■ 왜

  유적 다섯 곳의 잡몹이 전부 세계 어디서나 나오는 것들이었다. 얼음 던전엔
  얼음 지대의 서리 정령, 광산엔 동굴의 광부 유령 — 유적에 들어와야만 볼 수
  있는 것은 유적 수호병 하나뿐이고 그건 다섯 곳에 다 나온다.

■ 무엇을 그리나

  다섯 다 **그 유적의 장식에서 나온 것**이다. 몬스터와 장식이 같은 이야기를
  해야 붙여 넣은 것처럼 안 보인다.

    언 순례자    얼음 안에 언 채로 걸어온다        ← 언 깃발 · 서리 글자
    단지 껍데기  장기 단지 안에 있던 것            ← 장기 단지
    빈 광차      아무도 안 미는데 굴러온다          ← 버린 연장
    주머니의 것  알주머니에서 나온 것              ← 알주머니
    구멍벌레     포자 구멍에 살던 것               ← 포자 구멍

  실루엣도 겹치지 않게 갈랐다 — 서 있는 것 / 웅크린 것 / 낮고 넓은 것 /
  매달린 것 / 세로로 긴 것. 어두운 방에서 형체만 보고도 갈려야 한다.

■ 규칙 (게임의 다른 캐릭터 시트와 같다)

  논리 크기로 그린 뒤 4배 최근접 확대. 프레임 사이 틈은 **없다**(캐릭터 시트는
  fx 시트와 달리 gap 이 없다 — 실측: player 22x13x4 = 1144 = 파일 너비).
  프레임 순서는 manifest 의 characters.frames 그대로:
    0 idle1  1 idle2  2 move1  3 move2  4 atk  5 death1  6 death2

■ 외곽선

  몸을 다 그린 뒤 **빈 칸 중 몸에 닿은 칸**을 한 겹 어두운 색으로 두른다.
  손으로 두르면 프레임마다 어긋나고, 어긋난 외곽선은 픽셀아트에서 제일 먼저
  눈에 띈다. 기존 시트도 같은 굵기(1px)라 나란히 놓아도 튀지 않는다.

사용법:  python3 tools/mkruinmobs.py
"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'char')
S, FRAMES = 4, 7
OUTLINE = (0x0c, 0x0c, 0x11)


# ---------------------------------------------------------------- 붓
class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def dot(self, x, y, col):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = (col[0], col[1], col[2], 255)

    def rect(self, x, y, w, h, col):
        for dy in range(int(round(h))):
            for dx in range(int(round(w))):
                self.dot(x + dx, y + dy, col)

    def ell(self, cx, cy, rx, ry, col):
        """가운데 (cx,cy), 반지름 (rx,ry) 의 꽉 찬 타원."""
        for y in range(int(-ry) - 1, int(ry) + 2):
            for x in range(int(-rx) - 1, int(rx) + 2):
                if (x / max(rx, .01)) ** 2 + (y / max(ry, .01)) ** 2 <= 1.0:
                    self.dot(cx + x, cy + y, col)

    def tri(self, x, y, w, h, col, flip=False):
        """사다리꼴 — 위가 좁고 아래가 넓다(flip 이면 반대)."""
        for dy in range(int(h)):
            t = dy / max(h - 1, 1)
            k = (1 - t) if flip else t
            ww = w * (0.45 + 0.55 * k)
            self.rect(x + (w - ww) / 2, y + dy, ww, 1, col)

    def line(self, x0, y0, x1, y1, col):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            self.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)

    def outline(self):
        """몸에 닿은 빈 칸을 한 겹 두른다. 전부 그린 다음 마지막에 한 번."""
        filled = [[self.px[x, y][3] > 0 for y in range(self.h)] for x in range(self.w)]
        for x in range(self.w):
            for y in range(self.h):
                if filled[x][y]:
                    continue
                near = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and filled[nx][ny]:
                        near = True
                        break
                if near:
                    self.px[x, y] = (OUTLINE[0], OUTLINE[1], OUTLINE[2], 255)


# ---------------------------------------------------------------- 언 순례자
#  얼음 안에 언 채로 걸어온다. 얼음 껍질이 몸보다 크고, 안이 비쳐 보인다.
FB = dict(ice=(0x9f, 0xd8, 0xea), ice2=(0x6f, 0xa8, 0xc4), ice3=(0xd8, 0xf4, 0xff),
          body=(0x2a, 0x36, 0x48), body2=(0x18, 0x22, 0x30), eye=(0xbf, 0xe8, 0xff))
FB_W, FB_H = 26, 38


def frostbound(f):
    c = Canvas(FB_W, FB_H)
    bob = [0, 1, 0, 1, 0, 3, 6][f]
    lean = [0, 0, -1, 1, 3, 2, 0][f]
    if f == 6:                                   # 다 부서지고 조각만 남는다
        for x, y, w in ((4, 34, 5), (11, 35, 6), (18, 33, 4), (8, 31, 3), (15, 30, 3)):
            c.rect(x, y, w, 3, FB['ice2'])
            c.rect(x, y, w, 1, FB['ice'])
        c.rect(9, 32, 6, 2, FB['body2'])
        c.outline()
        return c.im
    top = 3 + bob
    # 얼음 껍질 — 몸보다 두 칸 크다
    c.ell(13 + lean, top + 9, 9, 10, FB['ice2'])
    c.rect(4 + lean, top + 16, 18, 16 - bob, FB['ice2'])
    # 안에 비치는 몸 (두건 쓴 사람)
    c.ell(13 + lean, top + 9, 5, 6, FB['body'])
    c.rect(9 + lean, top + 13, 8, 12 - bob, FB['body'])
    c.rect(9 + lean, top + 13, 3, 12 - bob, FB['body2'])
    c.dot(11 + lean, top + 9, FB['eye']); c.dot(15 + lean, top + 9, FB['eye'])
    # 껍질에 든 빛 — 왼쪽 위 모서리
    c.line(6 + lean, top + 5, 6 + lean, top + 20, FB['ice3'])
    c.line(7 + lean, top + 3, 11 + lean, top + 1, FB['ice3'])
    if f == 4:                                   # 칠 때 껍질이 갈라진다
        c.line(18, top + 6, 21, top + 18, FB['ice3'])
        c.line(19, top + 11, 23, top + 9, FB['ice3'])
    if f == 5:                                   # 무너지기 시작
        for x, y in ((5, top + 22), (20, top + 20), (12, top + 26)):
            c.rect(x, y, 3, 3, FB['ice'])
    # 발 — 걸음마다 좌우가 엇갈린다
    lf, rf = [(0, 0), (0, 0), (-2, 2), (2, -2), (1, 1), (0, 0), (0, 0)][f]
    c.rect(6 + lf, FB_H - 4, 6, 4, FB['ice2'])
    c.rect(14 + rf, FB_H - 4, 6, 4, FB['ice2'])
    c.outline()
    return c.im


# ---------------------------------------------------------------- 단지 껍데기
#  장기 단지 안에 있던 것. 붕대에 감긴 채로 뛴다. 눈이 하나뿐이다.
JH = dict(wrap=(0xc8, 0xa8, 0x6a), wrap2=(0x9a, 0x7e, 0x4c), wrap3=(0xe4, 0xcc, 0x9a),
          dark=(0x3a, 0x2c, 0x1e), eye=(0xe8, 0xa0, 0x3a))
JH_W, JH_H = 24, 26


def jarhusk(f):
    c = Canvas(JH_W, JH_H)
    # 뛰는 몹이라 눌렸다 늘어난다 — 세로로 찌그러지는 정도를 프레임마다 다르게
    sq = [0, 1, 2, -2, -1, 2, 0][f]
    if f == 6:                                   # 감은 것만 풀려 쌓여 있다
        for y, x, w in ((22, 3, 18), (20, 6, 13), (18, 9, 8)):
            c.rect(x, y, w, 2, JH['wrap2'])
            c.rect(x, y, w, 1, JH['wrap'])
        c.rect(10, 16, 5, 2, JH['dark'])
        c.outline()
        return c.im
    cy = 14 + sq // 2
    ry = 10 - sq
    c.ell(12, cy, 9 + max(0, sq) // 2, ry, JH['wrap2'])
    c.ell(12, cy - 1, 8 + max(0, sq) // 2, ry - 1, JH['wrap'])
    # 감은 띠 — 가로줄 셋
    for k, dy in enumerate((-5, -1, 3)):
        c.rect(4, cy + dy + sq // 3, 16, 1, JH['wrap2'])
        c.rect(4, cy + dy + sq // 3 - 1, 16, 1, JH['wrap3'])
    # 벌어진 틈과 그 안의 눈 하나
    c.rect(8, cy - 4, 9, 4, JH['dark'])
    c.rect(11 if f != 4 else 13, cy - 3, 3, 2, JH['eye'])
    if f == 4:                                   # 칠 때 붕대가 풀려 앞으로 뻗는다
        c.line(20, cy - 2, JH_W - 1, cy - 5, JH['wrap'])
        c.line(20, cy + 1, JH_W - 1, cy + 3, JH['wrap2'])
        c.rect(8, cy - 5, 10, 6, JH['dark'])
        c.rect(13, cy - 4, 4, 3, JH['eye'])
    if f == 5:
        c.line(2, cy + 6, 6, cy + 10, JH['wrap2'])
        c.line(21, cy + 5, 18, cy + 10, JH['wrap2'])
    c.outline()
    return c.im


# ---------------------------------------------------------------- 빈 광차
#  아무도 안 미는데 굴러온다. 안에서 잉걸이 아직 타고 있다.
CW = dict(iron=(0x6a, 0x62, 0x58), iron2=(0x40, 0x3a, 0x34), wood=(0x7a, 0x5a, 0x38),
          em=(0xe8, 0x84, 0x2a), em2=(0xff, 0xd0, 0x7a))
CW_W, CW_H = 30, 22


def cartwraith(f):
    c = Canvas(CW_W, CW_H)
    rock = [0, -1, 0, -1, -2, 1, 0][f]
    if f == 6:                                   # 부서져 바퀴만 굴러 나갔다
        c.rect(2, 17, 14, 4, CW['iron2'])
        c.rect(5, 15, 8, 2, CW['wood'])
        c.ell(24, 17, 4, 4, CW['iron'])
        c.ell(24, 17, 2, 2, CW['iron2'])
        c.dot(9, 16, CW['em'])
        c.outline()
        return c.im
    top = 3 + rock
    c.tri(3, top, 24, 12, CW['wood'], flip=True)   # 위가 넓은 광차 몸통
    c.rect(3, top, 24, 2, CW['iron'])              # 테두리 쇠
    c.rect(3, top + 10, 24, 2, CW['iron2'])
    # 안에서 타는 잉걸
    glow = 4 if f in (0, 2) else 5 if f in (1, 3) else 7
    c.ell(15, top + 5, glow, 3, CW['em'])
    c.ell(15, top + 5, glow - 2, 2, CW['em2'])
    if f == 4:                                     # 칠 때 앞으로 기울여 쏟는다
        c.line(26, top + 3, CW_W - 1, top, CW['em'])
        c.line(26, top + 6, CW_W - 1, top + 4, CW['em2'])
    if f == 5:
        c.rect(3, top + 4, 24, 2, CW['iron2'])     # 몸통이 갈라진다
    # 바퀴 둘 — 살 각도가 프레임마다 돌아간다
    for wx in (8, 21):
        c.ell(wx, CW_H - 5, 4, 4, CW['iron'])
        c.ell(wx, CW_H - 5, 2, 2, CW['iron2'])
        if f % 2 == 0:
            c.line(wx - 4, CW_H - 5, wx + 4, CW_H - 5, CW['iron2'])
        else:
            c.line(wx - 3, CW_H - 8, wx + 3, CW_H - 2, CW['iron2'])
    c.outline()
    return c.im


# ---------------------------------------------------------------- 주머니의 것
#  알주머니에서 나온 것. 실을 늘어뜨린 채 떠 있다.
SL = dict(sac=(0x8a, 0x4a, 0x80), sac2=(0x5e, 0x30, 0x58), glow=(0xd8, 0x8a, 0xd0),
          thread=(0x6a, 0x3a, 0x62), eye=(0xff, 0xd0, 0xf0))
SL_W, SL_H = 24, 30


def sacling(f):
    c = Canvas(SL_W, SL_H)
    bob = [0, 1, 0, 2, -2, 3, 0][f]
    sway = [0, 1, -1, 1, 2, 0, 0][f]
    if f == 6:                                   # 터져서 껍질만 남았다
        c.ell(12, 25, 9, 4, SL['sac2'])
        c.ell(12, 25, 6, 2, SL['sac'])
        for x in (5, 10, 15, 19):
            c.dot(x, 22, SL['glow'])
        c.outline()
        return c.im
    cy = 11 + bob
    ry = 8 if f != 4 else 6                      # 칠 때 몸을 오므린다
    c.ell(12, cy, 8, ry, SL['sac2'])
    c.ell(12, cy - 1, 6, ry - 1, SL['sac'])
    # 안에 비치는 알 셋 — 늘 같은 자리
    for dx, dy in ((-3, -2), (2, 0), (-1, 3)):
        c.rect(12 + dx, cy + dy, 2, 2, SL['glow'])
    # 눈 넷
    for dx in (-4, -1, 2, 5):
        c.dot(12 + dx, cy - ry + 2, SL['eye'])
    # 늘어뜨린 실 — 프레임마다 흔들린다
    for k, x in enumerate((6, 10, 14, 18)):
        ln = 8 + ((k * 3) % 5)
        c.line(x, cy + ry - 1, x + sway * (1 if k % 2 else -1), cy + ry - 1 + ln, SL['thread'])
        c.dot(x + sway * (1 if k % 2 else -1), cy + ry - 1 + ln, SL['glow'])
    if f == 4:                                   # 칠 때 실을 앞으로 뻗는다
        c.line(19, cy, SL_W - 1, cy - 4, SL['thread'])
        c.line(19, cy + 2, SL_W - 1, cy + 5, SL['thread'])
    c.outline()
    return c.im


# ---------------------------------------------------------------- 구멍벌레
#  포자 구멍에 살던 것. 마디가 셋이고, 갓 같은 입으로 포자를 뿜는다.
VS = dict(body=(0x5a, 0x8a, 0x74), body2=(0x36, 0x5a, 0x4c), cap=(0x8f, 0xe0, 0xc4),
          spore=(0xcf, 0xff, 0xe8), dark=(0x1c, 0x2c, 0x26))
VS_W, VS_H = 26, 28


def ventspitter(f):
    c = Canvas(VS_W, VS_H)
    lean = [0, 0, -1, 1, 2, 1, 0][f]
    if f == 6:                                   # 무너져 포자만 흩어졌다
        c.ell(13, 25, 8, 3, VS['body2'])
        for x, y in ((4, 21), (9, 19), (16, 20), (21, 22), (13, 17)):
            c.dot(x, y, VS['spore'])
        c.outline()
        return c.im
    # 마디 셋 — 아래가 넓고 위로 갈수록 좁다
    for k, (y, w) in enumerate(((20, 16), (14, 13), (9, 10))):
        dx = lean * k
        c.rect(13 + dx - w / 2, y, w, 6, VS['body2'])
        c.rect(13 + dx - w / 2, y, w, 4, VS['body'])
        c.rect(13 + dx - w / 2, y + 4, w, 1, VS['dark'])   # 마디 사이 골
    top = 8 + lean * 3
    # 갓 같은 입 — 칠 때 활짝 벌어진다
    open_ = f == 4
    cw = 13 if open_ else 8
    c.ell(13 + lean * 3, top, cw / 2, 4 if open_ else 3, VS['cap'])
    c.ell(13 + lean * 3, top + 1, cw / 2 - 2, 2, VS['dark'])
    if open_:
        for dx, dy in ((-7, -4), (0, -6), (7, -4), (-4, -7), (4, -7)):
            c.dot(13 + lean * 3 + dx, top + dy, VS['spore'])
        c.dot(13 + lean * 3, top - 9, VS['spore'])
    if f in (0, 2):
        c.dot(13 + lean * 3 - 3, top - 3, VS['spore'])
    if f == 5:
        c.rect(5, 22, 16, 2, VS['body2'])
    c.outline()
    return c.im


SHEETS = [
    ('frostbound', FB_W, FB_H, frostbound),
    ('jarhusk', JH_W, JH_H, jarhusk),
    ('cartwraith', CW_W, CW_H, cartwraith),
    ('sacling', SL_W, SL_H, sacling),
    ('ventspitter', VS_W, VS_H, ventspitter),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fw, fh, fn in SHEETS:
        sheet = Image.new('RGBA', (FRAMES * fw * S, fh * S), (0, 0, 0, 0))
        for f in range(FRAMES):
            sheet.paste(fn(f).resize((fw * S, fh * S), Image.NEAREST), (f * fw * S, 0))
        p = os.path.normpath(os.path.join(OUT, name + '.png'))
        sheet.save(p)
        print('  %-14s %dx%d  (%dx%d x %d프레임 · %d배)  %dB'
              % (name + '.png', sheet.size[0], sheet.size[1], fw, fh, FRAMES, S, os.path.getsize(p)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
