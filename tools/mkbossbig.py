#!/usr/bin/env python3
"""5페이즈 보스 다섯의 시트를 다시 짠다 — 규격 · 실루엣 · 마감까지.

■ 왜 다시 짜나

  페이즈를 다섯으로 늘렸는데(ENEMIES 의 ph) 시트는 3페이즈 시절 그대로 여섯 칸
  이었다. 마디 다섯에 그림 세 벌이라 ph1·ph2 가 같고 ph3·ph4 가 같다.
  다섯 마디면 다섯 벌이어야 한다 — 10칸(5페이즈 × idle 2).

  파생이 아니라 **새로 그린다**. 남은 다섯은 세션 종장과 특별 유적의 주인이라
  게임에서 가장 큰 사건이고, 원본을 색만 눕혀서는 "더 커졌다"가 안 나온다.

■ 크기 — 기존 무엇보다 크게

  지금까지 가장 큰 보스가 환원기 118x132 였다. 다섯 모두 그보다 크게 잡고,
  다섯 사이의 서열도 유지한다(갱을 메운 것 < 별을 쫓아온 것 < 헤파 < 원형 <
  환원기). 판정 상자는 프레임보다 조금 작다 — 그림의 삐죽한 끝까지 맞으면
  억울하다.

■ 페이즈마다 무엇이 달라지나

  "색이 진해진다" 로는 안 보인다. 마디마다 **실루엣이 바뀌어야** 한 눈에 갈린다.
  다섯 모두 '무엇이 하나씩 풀리거나 벗겨지는' 한 줄기로 짰다.

  별을 쫓아온 것 — 형체가 정해져 있지 않은 것. 쫓다가 저를 잃는다.
     0 웅크린 덩어리, 팔 둘        1 일어선다, 팔 넷
     2 몸이 갈라져 안쪽 빛이 샌다   3 하체가 흩어지고 상체만 뜬다
     4 빛만 남은 뼈대 — 가장 크고 가장 비어 있다

  갱을 메운 것 — 무너진 갱 자체가 입이 된 것. 가로로 넓다.
     0 바위 더미, 틈 하나          1 틈이 벌어져 이빨이 보인다
     2 위턱이 들린다               3 목구멍이 드러나 빛난다
     4 바위가 다 떨어져 턱뼈만 남는다

  헤파 · 최초의 기계 — 만드는 중인 자세. 때려서는 안 멈춘다.
     0 앉아서 일하는 자세(팔 넷)    1 일어선다
     2 등의 화로가 열린다           3 팔 넷이 여덟으로 갈라진다
     4 외장이 벗겨지고 정지 핵이 드러난다

  원형 · 첫 번째 설계 — 사람을 본떠 만든 첫 번째 것. 받침대에 매달려 있다.
     0 받침대 넷에 매달린 미완성     1 한 팔이 풀린다
     2 두 다리가 땅을 짚는다        3 받침대가 깨져 몸이 기운다
     4 완전히 선다 — 사람의 자세

  환원기 · 되돌리려는 것 — 가장 크다. 발밑을 되돌린다.
     0 접힌 고리 다발               1 고리가 펼쳐진다
     2 안쪽 축이 드러난다           3 고리가 거꾸로 돈다
     4 축만 남고 고리는 궤도로 흩어진다

■ 마감은 기존 손그림 보스에서 가져왔다

  최초의 파수꾼 · 공창의 관리자 · 증식체를 늘어놓고 보면 마감이 셋뿐이다:
  평평한 덩어리에 **얼룩 점묘**, 덩어리마다 **위쪽 한 줄이 밝고**, 금·청록
  **작은 장식**. 두껍게 렌더링하지 않는다. 그 셋만 따라 해서 화풍을 맞췄다.

사용법:  python3 tools/mkbossbig.py && node tools/sync-manifest.mjs
"""
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'game', 'assets', 'boss')
S = 4                      # 시트는 4배로 굽는다
PHASES = 5
FRAMES = PHASES * 2        # 마디마다 idle 두 장


class Canvas:
    """mkruinmobs.py 의 것과 같은 붓. 저 파일과 화풍을 맞추려고 그대로 쓴다."""

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
        for y in range(int(-ry) - 1, int(ry) + 2):
            for x in range(int(-rx) - 1, int(rx) + 2):
                if (x / max(rx, .01)) ** 2 + (y / max(ry, .01)) ** 2 <= 1.0:
                    self.dot(cx + x, cy + y, col)

    def ring(self, cx, cy, rx, ry, t, col, a0=0.0, a1=math.tau):
        """속이 빈 고리(환원기). a0~a1 만 그리면 조각난 궤도가 된다."""
        n = int(max(rx, ry) * 8) + 24
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            for k in range(int(t)):
                self.dot(cx + math.cos(a) * (rx - k), cy + math.sin(a) * (ry - k), col)

    def line(self, x0, y0, x1, y1, col, t=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            u = i / n
            for k in range(t):
                self.dot(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + k, col)

    def stroke(self, x0, y0, x1, y1, r, col):
        """경로를 따라 원을 찍는 굵은 획.

        ★ line(..., t) 로는 안 된다. 그 굵기는 **아래로만** 번져서 세로획은
          두꺼워지지만 대각선은 1픽셀로 남는다 — 팔다리가 전부 성냥개비가
          되어 나왔다. 굵은 팔다리는 이쪽으로 긋는다."""
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            u = i / n
            self.ell(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, r, col)

    # ---------------- 마감 붓 — 다 그린 다음 한 번씩 지나간다 ----------------
    # 기존 손그림 보스(최초의 파수꾼 · 관리자 · 증식체)를 보면 마감이 셋뿐이다:
    # 평평한 덩어리에 **얼룩 점묘**, 덩어리마다 **위쪽 한 줄이 밝고**, 금·청록
    # **작은 장식**. 두껍게 렌더링하지 않는다. 그 셋만 따라 한다.

    def speck(self, seed, dens=0.12, dark=0.80, lite=1.16):
        """칠해진 칸에만 얼룩을 뿌린다. 칸마다 정해진 값이라 프레임이 넘어가도
           얼룩이 옮겨 다니지 않는다 — 난수로 뿌리면 그림이 지글거린다."""
        for y in range(self.h):
            for x in range(self.w):
                a = self.px[x, y]
                if a[3] == 0:
                    continue
                # ★ 단순 곱·xor 로는 안 된다. x·y 에 규칙이 남아 **골덴 같은
                #   사선 줄무늬**가 나왔다(얼룩이 아니라 무늬가 된다).
                #   정수 해시의 마무리 섞음(shift·곱·shift)까지 돌려야 흩어진다.
                v = (x * 374761393 + y * 668265263 + seed * 1442695041) & 0xFFFFFFFF
                v ^= v >> 13
                v = (v * 1274126177) & 0xFFFFFFFF
                v ^= v >> 16
                v &= 1023
                if v < dens * 1024:
                    self.dot(x, y, shade(a, dark))
                elif v > 1023 - dens * 512:
                    self.dot(x, y, shade(a, lite))

    def toplight(self, k=1.22, n=2):
        """열마다 맨 위 n 칸을 밝힌다. 덩어리가 위에서 빛을 받는 것처럼 보인다."""
        for x in range(self.w):
            hit = 0
            prev = False
            for y in range(self.h):
                on = self.px[x, y][3] > 0
                if on and not prev:
                    hit += 1
                    if hit <= 2:                 # 몸통과 그 위 덩어리까지만
                        for k2 in range(n):
                            if y + k2 < self.h and self.px[x, y + k2][3] > 0:
                                self.dot(x, y + k2, shade(self.px[x, y + k2], k))
                prev = on

    def trim(self, x, y, w, col, gap=3):
        """금속 띠에 박은 작은 장식 — 참고한 보스들이 다 갖고 있다."""
        self.rect(x, y, w, 3, shade(col, 0.55))
        for i in range(0, int(w), gap):
            self.dot(x + i + 1, y + 1, col)

    def outline(self, col=(10, 10, 14)):
        """몸에 닿은 빈 칸을 한 겹 두른다. 전부 그린 다음 마지막에 한 번."""
        on = [[self.px[x, y][3] > 0 for y in range(self.h)] for x in range(self.w)]
        for x in range(self.w):
            for y in range(self.h):
                if on[x][y]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and on[nx][ny]:
                        self.dot(x, y, col)
                        break


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3])


# 보스마다 (프레임 가로, 세로, 판정 가로, 세로, 바탕색, 빛깔)
SPEC = {
    'shaft_maw': (132, 120, 116, 106, (58, 52, 44), (232, 150, 60)),
    'pursuer':   (140, 150, 120, 136, (42, 32, 54), (196, 156, 255)),
    'hepha':     (136, 164, 116, 150, (200, 160, 90), (255, 176, 70)),
    'archetype': (144, 176, 124, 160, (232, 220, 192), (140, 228, 255)),
    'restorer':  (168, 200, 146, 182, (168, 200, 232), (255, 236, 170)),
}


def breath(fr):
    """idle 두 장의 차이. 1픽셀 오르내림 — 시트가 두 장인 이유가 이것뿐이다."""
    return 0 if fr == 0 else -1


# ---------------------------------------------------------------- 보스별 붓

def draw_pursuer(c, ph, fr, W, H, base, glow):
    """형체가 정해져 있지 않은 것. 마디마다 몸이 덜 남는다."""
    b = breath(fr)
    cx, floor = W / 2, H - 4
    body = shade(base, 1.0)
    dark = shade(base, 0.62)
    # 하체 — 마디가 오를수록 흩어진다
    solid = [1.0, 0.9, 0.72, 0.35, 0.0][ph]
    if solid > 0:
        c.ell(cx, floor - 26 * solid, 34 * solid + 10, 26 * solid + 6, dark)
    else:
        for i in range(7):                       # 다 흩어진 뒤 남는 부스러기
            a = i * math.tau / 7 + 0.4
            c.ell(cx + math.cos(a) * 34, floor - 18 + math.sin(a) * 10, 4, 3, dark)
    # 몸통 — 웅크렸다가 선다
    rise = [0, 16, 26, 34, 40][ph]
    cy = floor - 46 - rise + b
    hollow = ph >= 2
    if hollow:
        c.ell(cx, cy, 30, 34, body)
        c.ell(cx, cy + 2, 20, 24, glow if ph >= 3 else shade(glow, 0.5))
        c.ell(cx, cy + 2, 12, 15, (0, 0, 0))     # 안쪽이 비어 보이게
        c.ell(cx, cy + 2, 11, 14, shade(glow, 1.0))
    else:
        c.ell(cx, cy, 30, 34, body)
    # 팔 — 둘에서 넷으로
    arms = [2, 4, 4, 4, 4][ph]
    for i in range(arms):
        a = -2.5 + i * (1.7 / max(arms - 1, 1))
        ex, ey = cx + math.cos(a) * 58, cy + math.sin(a) * 46
        c.stroke(cx, cy, ex, ey, 6 if ph < 3 else 3, body if ph < 4 else glow)
        c.ell(ex, ey, 5, 5, dark if ph < 4 else glow)
    # 눈 — 마디마다 늘어난다
    for i in range(ph + 1):
        c.ell(cx - 12 + i * 8, cy - 8, 3, 4, glow)


def draw_shaft_maw(c, ph, fr, W, H, base, glow):
    """무너진 갱이 곧 입이다. 위턱이 점점 들린다."""
    b = breath(fr)
    cx, floor = W / 2, H - 4
    rock = shade(base, 1.0)
    dark = shade(base, 0.6)
    gape = [4, 14, 28, 44, 58][ph]               # 벌어진 높이
    # 아래턱 — 늘 바닥에 붙어 있다
    c.ell(cx, floor - 16, W * 0.44, 20, rock)
    c.rect(cx - W * 0.44, floor - 16, W * 0.88, 18, rock)
    # 목구멍
    if ph >= 1:
        c.rect(cx - W * 0.34, floor - 18 - gape, W * 0.68, gape,
               shade(glow, 0.35) if ph >= 3 else (14, 12, 10))
    if ph >= 3:
        c.ell(cx, floor - 18 - gape * 0.5, W * 0.22, gape * 0.34, glow)
    # 위턱 — 마디가 오를수록 들리고 바위가 떨어져 나간다
    crumble = [0, 0, 1, 2, 3][ph]
    top = floor - 20 - gape + b
    if ph < 4:
        c.ell(cx, top - 14 + crumble * 3, W * (0.44 - crumble * 0.04), 18 - crumble * 3, rock)
        c.rect(cx - W * (0.44 - crumble * 0.04), top - 16, W * (0.88 - crumble * 0.08),
               14 - crumble * 2, rock)
    else:
        for i in range(6):                       # 턱뼈만 남는다
            x = cx - W * 0.36 + i * W * 0.144
            c.rect(x, top - 12, 7, 12, dark)
        c.rect(cx - W * 0.38, top - 14, W * 0.76, 5, dark)
    # 이빨
    if ph >= 1:
        n = 5 + ph
        for i in range(n):
            x = cx - W * 0.32 + i * (W * 0.64 / max(n - 1, 1))
            c.rect(x, floor - 20, 5, 9, (226, 222, 206))
            c.rect(x, top - 4, 5, 8, (226, 222, 206))


def draw_hepha(c, ph, fr, W, H, base, glow):
    """만드는 중인 자세. 팔이 갈라지고 끝내 외장이 벗겨진다."""
    b = breath(fr)
    cx, floor = W / 2, H - 4
    body = shade(base, 1.0)
    dark = shade(base, 0.52)
    sit = [26, 10, 4, 0, 0][ph]                  # 앉은 정도
    cy = floor - 62 + sit + b
    # 다리
    for sx in (-1, 1):
        c.rect(cx + sx * 20 - 7, cy + 34, 14, floor - (cy + 34), dark)
    # 몸통
    c.rect(cx - 30, cy - 30, 60, 66, body)
    c.rect(cx - 30, cy - 30, 60, 10, shade(base, 1.18))
    c.trim(cx - 26, cy - 18, 52, (60, 44, 24), 4)     # 어깨띠
    c.trim(cx - 26, cy + 24, 52, (60, 44, 24), 4)     # 허리띠
    # 등의 화로 — 2페이즈에 열린다
    if ph >= 2:
        c.rect(cx - 14, cy - 12, 28, 30, (24, 18, 12))
        c.ell(cx, cy + 3, 11 + ph, 12 + ph, glow)
        c.ell(cx, cy + 3, 5, 6, (255, 244, 214))
    # 팔 — 넷에서 여덟으로
    arms = 4 if ph < 3 else 8
    for i in range(arms):
        side = -1 if i % 2 == 0 else 1
        k = i // 2
        a = -0.5 - k * 0.34
        ex = cx + side * (34 + math.cos(a) * 40)
        ey = cy - 10 + math.sin(a) * 34
        c.stroke(cx + side * 26, cy - 8, ex, ey, 5 if arms == 4 else 3, body)
        c.ell(ex, ey, 5, 5, dark)
    # 머리
    c.rect(cx - 13, cy - 48, 26, 20, body)
    c.ell(cx, cy - 38, 5, 4, glow)
    # 4페이즈 — 외장이 벗겨지고 정지 핵이 드러난다
    if ph == 4:
        c.rect(cx - 30, cy - 30, 60, 66, (0, 0, 0))
        for i in range(7):                       # 골조만
            c.rect(cx - 28 + i * 9, cy - 28, 4, 62, dark)
        c.rect(cx - 30, cy - 30, 60, 5, dark)
        c.rect(cx - 30, cy + 30, 60, 5, dark)
        c.ell(cx, cy + 2, 16, 18, glow)
        c.ell(cx, cy + 2, 8, 9, (255, 250, 232))


def draw_archetype(c, ph, fr, W, H, base, glow):
    """받침대에 매달린 미완성이 마디마다 풀려 끝내 사람처럼 선다."""
    b = breath(fr)
    cx, floor = W / 2, H - 4
    body = shade(base, 1.0)
    dark = shade(base, 0.66)
    hang = [30, 24, 10, 4, 0][ph]                # 떠 있는 높이
    tilt = [0, 0, 0, 7, 0][ph]                   # 3페이즈만 기운다
    cy = floor - 74 - hang + b
    # 받침대 — 마디마다 하나씩 깨진다
    peds = [4, 4, 3, 1, 0][ph]
    for i in range(peds):
        x = cx - 54 + i * (108 / 3)
        c.rect(x - 6, floor - 30, 12, 30, dark)
        c.rect(x - 10, floor - 34, 20, 6, shade(base, 0.8))
        c.line(x, floor - 34, cx, cy + 10, shade(base, 0.5))
    # 다리 — 2페이즈에 땅을 짚는다
    if ph >= 2:
        for sx in (-1, 1):
            c.stroke(cx + sx * 12, cy + 30, cx + sx * 18 + tilt, floor, 7, body)
    else:
        for sx in (-1, 1):
            c.stroke(cx + sx * 12, cy + 30, cx + sx * 16, cy + 56, 6, dark)
    # 몸통 — 참고한 보스들처럼 가슴에 띠 하나와 어깨판을 둔다.
    # 이게 없으면 그냥 네모라 크기만 커지고 '만들다 만 사람'으로 안 읽힌다.
    c.rect(cx - 22 + tilt, cy - 24, 44, 56, body)
    c.rect(cx - 22 + tilt, cy - 24, 44, 8, shade(base, 1.1))
    for sx in (-1, 1):                           # 어깨판
        c.rect(cx + sx * 22 - 9 + tilt, cy - 22, 18, 12, shade(base, 0.82))
    c.trim(cx - 17 + tilt, cy - 4, 34, glow)     # 가슴 띠
    c.line(cx + tilt, cy + 6, cx + tilt, cy + 30, shade(base, 0.72))   # 이음매
    # 팔 — 1페이즈에 한 쪽이 풀린다
    free = [0, 1, 1, 2, 2][ph]
    for i, sx in enumerate((-1, 1)):
        if i < free:
            c.stroke(cx + sx * 20 + tilt, cy - 14, cx + sx * 44, cy + 22, 6, body)
        else:
            c.stroke(cx + sx * 20 + tilt, cy - 14, cx + sx * 34, cy - 44, 6, dark)
    # 머리
    c.ell(cx + tilt, cy - 36, 14, 16, body)
    for sx in (-1, 1):
        c.ell(cx + tilt + sx * 6, cy - 38, 3, 4, glow)
    if ph == 4:                                  # 다 서면 안쪽에 불이 든다
        c.ell(cx, cy + 4, 9, 11, glow)


def draw_restorer(c, ph, fr, W, H, base, glow):
    """접힌 고리가 펼쳐지고 끝내 축만 남는다. 다섯 중 가장 크다."""
    b = breath(fr)
    cx, cy = W / 2, H / 2 + b
    body = shade(base, 1.0)
    dark = shade(base, 0.58)
    spread = [0.30, 0.58, 0.80, 0.94, 1.0][ph]
    # 고리 — 마디마다 펼쳐지고 4페이즈엔 조각나 흩어진다
    for i in range(3):
        rx = (34 + i * 22) * spread + 16
        ry = rx * (0.34 + 0.16 * spread)
        t = 6 - i
        if ph == 4:
            for k in range(3):                   # 궤도 조각
                a0 = k * math.tau / 3 + i * 0.5
                c.ring(cx, cy, rx, ry, t, dark, a0, a0 + 1.1)
        else:
            c.ring(cx, cy, rx, ry, t, body if i == 0 else dark)
    # 축 — 2페이즈부터 드러난다
    if ph >= 2:
        c.rect(cx - 9, cy - 44, 18, 88, body)
        c.rect(cx - 9, cy - 44, 18, 8, shade(base, 1.15))
        for yy in range(-30, 44, 18):                # 축의 마디
            c.rect(cx - 11, cy + yy, 22, 3, shade(base, 0.62))
    core = [10, 13, 17, 21, 26][ph]
    c.ell(cx, cy, core, core, glow if ph >= 2 else shade(glow, 0.55))
    c.ell(cx, cy, core * 0.45, core * 0.45, (255, 252, 240))
    # 3페이즈 — 거꾸로 도는 표시로 고리마다 갈고리를 반대로 단다
    if ph >= 3:
        for i in range(6):
            a = i * math.tau / 6 + (0.4 if ph == 3 else 0)
            r = 60 * spread + 18
            c.ell(cx + math.cos(a) * r, cy + math.sin(a) * r * 0.5, 5, 4, glow)


PAINT = {
    'pursuer': draw_pursuer,
    'shaft_maw': draw_shaft_maw,
    'hepha': draw_hepha,
    'archetype': draw_archetype,
    'restorer': draw_restorer,
}


def main():
    out = {}
    for name, (fw, fh, hw, hh, base, glow) in SPEC.items():
        sheet = Image.new('RGBA', (fw * FRAMES * S, fh * S), (0, 0, 0, 0))
        for i in range(FRAMES):
            ph, fr = i // 2, i % 2
            c = Canvas(fw, fh)
            PAINT[name](c, ph, fr, fw, fh, base, glow)
            c.toplight()
            c.speck(seed=i * 7 + len(name))
            c.outline()
            sheet.paste(c.im.resize((fw * S, fh * S), Image.NEAREST), (i * fw * S, 0))
        p = os.path.join(OUT, name + '.png')
        sheet.save(p)
        out[name] = (fw, fh, hw, hh, os.path.getsize(p))
        print('  %-11s %3dx%-3d 판정 %3dx%-3d · %d칸 · %s  %dB'
              % (name, fw, fh, hw, hh, FRAMES, os.path.basename(p), os.path.getsize(p)))
    print('\n매니페스트와 ENEMIES 의 w/h 를 아래 값으로 맞춰야 한다:')
    for k, (fw, fh, hw, hh, _) in out.items():
        print('  %-11s frameW %d frameH %d count %d · w %d h %d' % (k, fw, fh, FRAMES, hw, hh))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
