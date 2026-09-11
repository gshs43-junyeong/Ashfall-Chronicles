#!/usr/bin/env python3
"""원형 · 첫 번째 설계 — 열 칸을 한 칸씩 손으로 그린다.

■ 왜 다시 그리나

  전 그림은 96x116 로 그린 것을 2배로 늘린 것이었다. 그래서 이 보스만 픽셀이
  게임의 나머지보다 두 배 굵었고(주인공은 1픽셀 = 1게임픽셀이다), 형태도
  타원 몇 개를 쌓은 눈사람에 가까웠다. 크게만 만들었지 그릴 자리를 안 썼다.

  이번엔 **화면에 나가는 크기 그대로 192x232 에 그린다.** 픽셀 하나가 게임
  픽셀 하나다. 같은 화면 크기에 네 배 많은 칸을 쓰는 셈이라, 이음매도 금도
  눈금도 다 들어간다.

■ 무엇을 그리나 — 이야기가 형태를 정한다

  이름이 '첫 번째 설계' 고, 설명이 "사람을 본떠 만든 첫 번째 것" 이다.
  싸움도 탄막이 아니라 근접 연격이고(b_arche), 받침대 넷이 붙들고 있다가
  마지막 하나가 놓아 주면서 끝난다. 대사가 그대로 페이즈 순서다:

      →1 원형이 자세를 고친다
      →2 받침대 넷이 그것을 붙들고 있다
      →3 사람의 걸음을 흉내 내기 시작한다
      →4 마지막 받침대가 저를 놓는다

  그래서 **붙들린 것이 풀려나며 점점 사람이 되는** 다섯 장이다.

      마디0  매달려 있다. 고개를 떨구고, 두 다리는 아직 안 갈린 통짜 기둥이고,
             손은 모양이 안 난 덩어리다. 핵은 꺼져 가는 호박색.
      마디1  자세를 고친다. 척추가 서고 어깨가 펴진다. 쇠사슬 넷이 팽팽해진다.
      마디2  받침대가 붙든다. 물린 자리가 달아오르고 석고에 금이 뻗는다.
      마디3  걸음을 흉내 낸다. 다리가 갈리고 무릎 구슬이 생기고 손에 손가락이
             돋는다. 위쪽 받침대 둘이 끊어진다.
      마디4  놓인다. 받침대가 다 떨어져 고리 자국만 남고, 금 사이로 핵빛이
             온몸에 샌다.

  표면에는 **설계 선**을 새긴다 — 가운데 축선, 눈금, 핵 둘레의 각도 눈금.
  이게 다른 보스와 이 보스를 가르는 한 가지다. 이건 조각이 아니라 도면이다.

■ 어떻게 칠하나

  평평하게 안 칠한다. 구는 법선을 세워 람베르트로, 팔다리는 원기둥 단면으로
  칠하고, 그늘 쪽 가장자리에 한 단 밝은 테두리 빛(rim)을 준다. 그래야 굴곡이
  보인다 — 전 그림이 납작해 보인 진짜 이유가 이거였다.

  빛은 왼쪽 위에서 온다. 게임의 다른 캐릭터 시트와 같은 방향이다.

■ 규칙

  발바닥은 아래에서 두 번째 줄에 닿고(마지막 줄은 외곽선 몫), 그림은 가로로
  가운데에 온다. 그래야 Sprites 가 재는 footInset·sideInset 이 0 이 되고,
  file:// 로 열어 실측이 막혔을 때의 기본값 0 과도 어긋나지 않는다.

  칸 사이 틈 없음. 4배 최근접 확대. 시트 폭 192*4*10 = 7680 을 검산한다.

사용법:  python3 tools/mkarchetype.py && node tools/sync-manifest.mjs
"""
import math
import os

from PIL import Image

W, H, S, FRAMES = 192, 232, 4, 10
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   'game', 'assets', 'boss', 'archetype.png')

# ---------------------------------------------------------------- 색
# 밝은 것부터 어두운 것 순. 칠할 때 밝기 t(0~1) 를 이 순서에 맞춰 고른다.
PLASTER = [(0xfb, 0xf6, 0xe8), (0xee, 0xe3, 0xc9), (0xd8, 0xc9, 0xa8),
           (0xb3, 0xa4, 0x87), (0x8a, 0x7c, 0x63), (0x62, 0x58, 0x46)]
IRON = [(0x8a, 0x95, 0xa6), (0x6b, 0x75, 0x85), (0x4c, 0x54, 0x61),
        (0x35, 0x3b, 0x45), (0x23, 0x28, 0x30)]
BRASS = [(0xf0, 0xd2, 0x8a), (0xc8, 0x9a, 0x4e), (0x9a, 0x72, 0x34),
         (0x6e, 0x50, 0x23)]
CORE = [(0xff, 0xff, 0xf2), (0xff, 0xf3, 0xc4), (0xff, 0xd9, 0x68),
        (0xe8, 0xa0, 0x28), (0xa8, 0x5f, 0x16)]
DRAFT = (0x7f, 0xc9, 0xe0)          # 설계 선
HOT = (0xff, 0x9a, 0x3c)            # 물린 자리가 달아오른 색
INK = (0x17, 0x14, 0x20)            # 외곽선

LX, LY = -0.55, -0.62               # 빛 방향(왼쪽 위)
LZ = math.sqrt(max(0.0, 1 - LX * LX - LY * LY))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def clamp(v, a, b):
    return a if v < a else (b if v > b else v)


# ---------------------------------------------------------------- 붓
class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def dot(self, x, y, col, a=255):
        x, y = int(round(x)), int(round(y))
        if not (0 <= x < self.w and 0 <= y < self.h):
            return
        if a >= 255:
            self.px[x, y] = (col[0], col[1], col[2], 255)
        else:
            o = self.px[x, y]
            base = o[:3] if o[3] else col
            self.px[x, y] = mix(base, col, a / 255.0) + (255,)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[x, y]
        return (0, 0, 0, 0)

    def rect(self, x, y, w, h, col):
        for dy in range(int(h)):
            for dx in range(int(w)):
                self.dot(x + dx, y + dy, col)

    # -- 구: 법선을 세워 칠한다. 공처럼 보이는 유일한 방법이다 --------------
    def sphere(self, cx, cy, rx, ry, ramp, bias=0.0, rim=True, squash=1.0):
        n = len(ramp) - 1
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                nx = (x - cx) / max(rx, .01)
                ny = (y - cy) / max(ry, .01)
                s = nx * nx + ny * ny
                if s > 1.0:
                    continue
                nz = math.sqrt(max(0.0, 1 - s)) * squash
                lam = nx * LX + ny * LY + nz * LZ
                t = clamp((lam + 0.22) / 1.05 + bias, 0, 1)
                i = int(round((1 - t) * n))
                if rim and s > 0.80 and lam < 0.05:      # 그늘 쪽 테두리 빛
                    i = max(0, i - 1)
                self.dot(x, y, ramp[i])

    # -- 원기둥(팔다리): 단면으로 칠한다 ----------------------------------
    def limb(self, x0, y0, x1, y1, r, ramp, bias=0.0, cap=True):
        n = len(ramp) - 1
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy or 1.0
        for y in range(int(min(y0, y1) - r) - 1, int(max(y0, y1) + r) + 2):
            for x in range(int(min(x0, x1) - r) - 1, int(max(x0, x1) + r) + 2):
                t = ((x - x0) * dx + (y - y0) * dy) / L2
                tc = clamp(t, 0, 1)
                if not cap and not (0 <= t <= 1):
                    continue
                px, py = x0 + dx * tc, y0 + dy * tc
                d = math.hypot(x - px, y - py)
                if d > r:
                    continue
                # 단면을 가로지르는 위치 u(-1..1). 축에 수직인 쪽으로 잰다.
                nlen = math.hypot(dy, -dx) or 1.0
                u = clamp(((x - px) * dy + (y - py) * (-dx)) / nlen / r, -1, 1)
                nz = math.sqrt(max(0.0, 1 - u * u))
                lam = u * LX + nz * LZ
                v = clamp((lam + 0.18) / 1.02 + bias, 0, 1)
                i = int(round((1 - v) * n))
                if abs(u) > 0.84 and lam < 0.05:
                    i = max(0, i - 1)
                self.dot(x, y, ramp[i])

    # -- 몸통: 줄마다 반너비가 다른 원기둥 --------------------------------
    def trunk(self, cx, y0, halfw, ramp, bias=0.0):
        """halfw 는 y0 부터 한 줄씩의 반너비 목록."""
        n = len(ramp) - 1
        for k, hw in enumerate(halfw):
            y = y0 + k
            if hw <= 0:
                continue
            for x in range(int(cx - hw), int(cx + hw) + 1):
                u = clamp((x - cx) / hw, -1, 1)
                nz = math.sqrt(max(0.0, 1 - u * u))
                lam = u * LX + nz * LZ
                # 위아래 끝은 살짝 눌러 둥글게 보이게
                edge = min(k, len(halfw) - 1 - k)
                v = clamp((lam + 0.18) / 1.02 + bias - (0.10 if edge < 2 else 0), 0, 1)
                i = int(round((1 - v) * n))
                if abs(u) > 0.86 and lam < 0.05:
                    i = max(0, i - 1)
                self.dot(x, y, ramp[i])

    def line(self, x0, y0, x1, y1, col, a=255):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            self.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col, a)

    def poly(self, pts, col, a=255):
        for i in range(len(pts) - 1):
            self.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, a)

    def ring(self, cx, cy, r, col, a=255, a0=0.0, a1=math.tau, th=1):
        steps = int(r * 8) + 8
        for i in range(steps + 1):
            ang = a0 + (a1 - a0) * i / steps
            for k in range(th):
                self.dot(cx + math.cos(ang) * (r - k), cy + math.sin(ang) * (r - k), col, a)

    def outline(self, col=INK):
        """빈 칸 중 몸에 닿은 칸을 한 겹 두른다. 손으로 두르면 칸마다 어긋난다."""
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[x, y][3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if self.get(x + dx, y + dy)[3]:
                        add.append((x, y))
                        break
        for x, y in add:
            self.px[x, y] = col + (255,)


# ---------------------------------------------------------------- 자세
# 마디마다 달라지는 값만 모았다. 나머지 뼈대는 다섯 장이 공유한다.
def pose(ph, tick):
    # 숨쉬기. 몸통은 두 칸 들리고 머리는 한 칸만 따라온다(늦게 따라붙는다).
    #   ★ 전에는 한 칸 평행이동이 전부였다. 그러면 관절이 하나도 안 움직여서
    #     '그림이 미끄러지는' 것으로만 보인다 — 실제로 두 칸을 1칸 맞춰 겹치면
    #     95%가 같았다. 팔은 좌우가 **엇갈려** 흔들려야 움직이는 것으로 읽힌다.
    bob = -2 if tick else 0
    P = {
        'bob': bob,
        'head_dy': 0, 'head_dx': 0, 'lean': 0,
        'arm_out': 0,                              # 팔꿈치가 바깥으로 벌어지는 정도
        'split': 0,                                # 다리가 갈렸나 (0 통짜 / 1 갈림)
        'stride': 0,                               # 앞으로 내민 정도
        'fingers': 0, 'core': 0.0, 'chains': 4, 'caps': 2, 'slump': 0, 'sw': 2,
        'planted': 0,
        'hot': 0.0, 'cracks': 0, 'spill': 0.0,
    }
    if ph == 0:      # 매달려 있다
        P.update(head_dy=7, head_dx=2, lean=1, arm_out=-1,
                 core=0.18, chains=4, slump=5, sw=2)
    elif ph == 1:    # 자세를 고친다
        P.update(head_dy=0, arm_out=0, core=0.38, chains=4, sw=2)
    elif ph == 2:    # 받침대가 붙든다
        P.update(head_dy=-1, lean=2, arm_out=3, core=0.58, chains=4, sw=3,
                 hot=1.0, cracks=1)
    elif ph == 3:    # 걸음을 흉내 낸다
        P.update(head_dy=-1, lean=2, arm_out=2, split=1, stride=7,
                 fingers=1, core=0.78, chains=2, caps=1, hot=0.5, cracks=2,
                 spill=0.35, sw=3, planted=1)
    else:            # 놓인다
        P.update(head_dy=-2, lean=3, arm_out=1, split=1, stride=18,
                 fingers=1, core=1.0, chains=0, caps=0, cracks=3, spill=1.0,
                 sw=4, planted=1)
    P['dir'] = 1 if tick else -1                  # 스윙 방향(칸마다 뒤집힌다)
    if tick:
        P['core'] = min(1.0, P['core'] + 0.10)
    return P


# ---------------------------------------------------------------- 부품
def core_ramp(level):
    """핵 밝기. 꺼져 가는 호박색에서 흰 금빛까지."""
    dim = [(0x8a, 0x5c, 0x22), (0x6e, 0x46, 0x1a), (0x4c, 0x30, 0x14),
           (0x33, 0x21, 0x10), (0x24, 0x17, 0x0c)]
    return [mix(dim[i], CORE[i], clamp(level, 0, 1)) for i in range(5)]


def prof(keys, y0, y1):
    """(y, 반너비) 몇 점을 주면 y0..y1 한 줄씩의 반너비를 이어 준다.
       목록을 손으로 타이핑하면 어디선가 한 줄이 빠져 허리가 잘록해진다 —
       실제로 처음에 가슴 목록이 골반까지 안 닿아 몸통에 구멍이 났었다."""
    out = []
    for y in range(y0, y1 + 1):
        for i in range(len(keys) - 1):
            (ya, wa), (yb, wb) = keys[i], keys[i + 1]
            if ya <= y <= yb:
                t = (y - ya) / max(yb - ya, 1)
                out.append(wa + (wb - wa) * t)
                break
        else:
            out.append(keys[-1][1] if y > keys[-1][0] else keys[0][1])
    return out


def clamp_back(c, x_ring, y, side, broken, hot):
    """받침대에서 뻗은 쇠 집게 — 몸 **뒤**로 가는 부분.
       side +1 오른쪽 / -1 왼쪽. broken 이면 화면 끝의 끊긴 동강만 남는다."""
    edge = W - 1 if side > 0 else 0
    if not broken:
        c.limb(edge, y, x_ring, y, 4, IRON, bias=-0.05)
        for t in (0.34, 0.66):                      # 놋쇠 죔쇠 두 줄
            mx = edge + (x_ring - edge) * t
            c.limb(mx - 1.5, y, mx + 1.5, y, 5, BRASS, bias=-0.12)
    else:
        c.limb(edge, y, edge - side * 9, y, 4, IRON, bias=-0.22)
        c.line(edge - side * 9, y - 4, edge - side * 9, y + 4, INK)
    c.ring(x_ring, y, 12, IRON[3], 255, th=4)       # 고리 뒤쪽 반


def clamp_front(c, x_ring, y, hot, broken):
    """고리의 **앞쪽 반** — 몸을 그린 뒤에 덮어야 물린 것으로 보인다."""
    c.ring(x_ring, y, 12, IRON[2], 255, a0=0.45, a1=math.pi - 0.45, th=4)
    c.ring(x_ring, y, 12, IRON[0], 190, a0=math.pi * 1.08, a1=math.pi * 1.7, th=1)
    if broken:                                       # 끊어진 고리는 한쪽이 벌어진다
        c.ring(x_ring, y, 12, (0, 0, 0), 0, th=4)
        for k in range(4):
            c.dot(x_ring + 11 - k, y - 9 + k, INK)
    if hot > 0:
        c.ring(x_ring, y, 9, mix(IRON[1], HOT, hot), int(210 * hot), th=2)
        c.ring(x_ring, y, 13, HOT, int(90 * hot), th=1)

CRACKS = [
    [[(66, 96), (74, 108), (70, 120)], [(126, 96), (118, 106), (123, 118)]],
    [[(66, 96), (74, 108), (70, 120), (78, 132)], [(126, 96), (118, 106), (123, 118)],
     [(96, 116), (89, 130), (94, 144)], [(80, 198), (76, 210), (81, 220)]],
    [[(66, 96), (74, 108), (70, 120), (78, 132), (72, 144)],
     [(126, 96), (118, 106), (123, 118), (115, 130)],
     [(96, 116), (89, 130), (94, 144), (87, 154)],
     [(80, 198), (76, 210), (81, 220)], [(112, 196), (117, 208), (111, 218)],
     [(89, 22), (94, 33)], [(102, 40), (98, 50)]],
]

# 석고를 파낸 자리 — 밑의 뼈대가 드러난다. 마디마다 넓어진다.
CUTAWAY = [[], [], [(60, 120, 74, 142)],
           [(60, 120, 74, 142), (118, 120, 132, 142)],
           [(60, 116, 74, 146), (118, 116, 132, 146), (88, 140, 104, 156)]]


def cutaway(c, x0, y0, x1, y1, lit):
    """석고가 떨어져 나간 구멍. 안은 쇠 뼈대와 놋쇠 봉이다.
       칸을 고르게 채우면 격자무늬 벽지가 된다 — 봉을 드문드문 세운다."""
    c.rect(x0, y0, x1 - x0, y1 - y0, IRON[4])
    c.limb(x0 + 4, y0 + 1, x0 + 3, y1 - 2, 2, IRON, bias=-0.2)
    c.limb(x1 - 4, y0 + 2, x1 - 5, y1 - 1, 1.6, IRON, bias=-0.3)
    for y in (y0 + 6, y1 - 7):
        c.limb(x0 + 1, y, x1 - 2, y + 1, 1.2, BRASS, bias=-0.42)
    if lit > 0:
        g = mix(IRON[4], CORE[3], clamp(lit, 0, 1))
        for k in range(y0 + 1, y1 - 1):
            c.dot(x0 + 1, k, g, int(150 * lit))
            c.dot(x1 - 2, k, g, int(110 * lit))
        c.line(x0 + 1, y1 - 2, x1 - 2, y1 - 2, g, int(120 * lit))
    # 깨진 가장자리 — 톱니처럼 들쭉날쭉해야 부순 것으로 보인다
    for k in range(y0, y1):
        c.dot(x0 - 1 + ((k * 7) % 3 == 0), k, PLASTER[4])
        c.dot(x1 + ((k * 5) % 3 == 0), k, PLASTER[4])
    for k in range(x0, x1):
        c.dot(k, y0 - 1 + ((k * 3) % 3 == 0), PLASTER[1])
        c.dot(k, y1 + ((k * 5) % 3 == 0), PLASTER[4])


def cuff(c, cx, y, halfw, hot, broken):
    y = int(round(y))
    """팔다리에 물린 쇠 족쇄. 고리를 원근으로 그리면 U자 쪼가리로 보인다 —
       팔을 가로지르는 **띠**로 그려야 문 것으로 읽힌다."""
    hw = halfw + 2
    c.trunk(cx, y, [hw] * 7, IRON, bias=-0.02)
    c.line(cx - hw, y, cx + hw, y, IRON[0], 170)
    c.line(cx - hw, y + 6, cx + hw, y + 6, IRON[4], 220)
    c.trunk(cx + hw - 5, y - 1, [3.5] * 9, IRON, bias=0.16)      # 죔쇠판
    for k in (-1, 1):                                            # 대갈못
        c.sphere(cx + k * (hw - 3), y + 3, 2, 2, IRON, bias=0.25)
    if broken:                                          # 한쪽이 터져 벌어졌다
        for x in range(int(cx + hw - 4), int(cx + hw + 1)):
            for yy in range(y - 1, y + 8):
                c.px[max(0, min(W - 1, x)), max(0, min(H - 1, yy))] = (0, 0, 0, 0)
        c.line(cx + hw - 5, y, cx + hw - 5, y + 6, INK, 220)
    if hot > 0:
        c.line(cx - hw + 1, y + 2, cx + hw - 1, y + 2, mix(IRON[1], HOT, hot),
               int(200 * hot))
        c.line(cx - hw + 1, y + 3, cx + hw - 1, y + 3, HOT, int(130 * hot))


def chain(c, x, y, n, sway=0):
    """족쇄에 매달린 사슬. 고리를 번갈아 눕혀야 사슬로 보인다."""
    for i in range(n):
        yy = y + i * 7
        xx = x + math.sin((i + sway) * 0.9) * 2
        rx, ry = (4.2, 3.4) if i % 2 == 0 else (2.4, 4.4)
        c.sphere(xx, yy + 4, rx, ry, IRON, bias=-0.04)
        c.sphere(xx, yy + 4, rx - 2, ry - 2, [(0, 0, 0)] * 2, rim=False)
        for dy in range(int(-ry) + 2, int(ry) - 1):
            for dx in range(int(-rx) + 2, int(rx) - 1):
                if (dx / max(rx - 2, .6)) ** 2 + (dy / max(ry - 2, .6)) ** 2 <= 1:
                    c.px[max(0, min(W - 1, int(xx + dx))),
                         max(0, min(H - 1, int(yy + 4 + dy)))] = (0, 0, 0, 0)


def draw_frame(ph, tick):
    c = Canvas(W, H)
    P = pose(ph, tick)
    B = P['bob']
    ln = P['lean']
    cx0 = 96 + ln
    cr = core_ramp(P['core'])
    dark = PLASTER[1:] + [PLASTER[-1]]              # 먼 쪽 팔다리(한 단 어둡게)

    SH_Y = 70 + B + P['slump']
    HIP_Y = 158 + B
    head_c = (cx0 + P['head_dx'], 28 + P['head_dy'] + B - B // 2)
    ao = P['arm_out']

    # 좌우가 엇갈려 흔들린다 — 한 팔이 올라갈 때 다른 팔은 내려간다.
    # 두 팔이 같이 움직이면 몸통 바브에 묻혀 안 보인다.
    sw, dr = P['sw'], P['dir']
    arms = {}
    for sgn in (-1, 1):
        d = sgn * dr                                # 이 팔의 이번 칸 방향
        sx = cx0 + sgn * 40
        ex = sx + sgn * (ao - 2) + d * (sw // 2)
        ey = 118 + B + d * sw
        wx = ex + sgn * (ao // 2 - 1) + d * sw
        wy = 154 + B + int(d * sw * 1.6)
        arms[sgn] = (sx, ex, wx, ey, wy)
    st = P['stride']
    legs = {}
    for sgn in (-1, 1):
        hx = cx0 + sgn * 18
        off = (st // 2) * sgn
        legs[sgn] = (hx, hx + off * 0.5, hx + off)

    # ---- 다리 ----------------------------------------------------------
    if not P['split']:
        # 아직 안 갈린 통짜 기둥 — 조각가의 받침대에서 안 떨어진 것이다
        col = prof([(HIP_Y, 29), (HIP_Y + 18, 30), (200 + B, 28),
                    (216 + B, 27), (221 + B, 32), (230 + B, 32)], HIP_Y, 230 + B)
        c.trunk(cx0, HIP_Y, col, PLASTER, bias=-0.02)
        c.line(cx0, HIP_Y + 8, cx0, 218 + B, PLASTER[4], 110)
        c.line(cx0 - 1, HIP_Y + 8, cx0 - 1, 218 + B, PLASTER[0], 60)
        for yy in (186, 208):
            c.line(cx0 - 28, yy + B, cx0 + 28, yy + B, PLASTER[3], 90)
        c.line(cx0 - 30, 221 + B, cx0 + 30, 221 + B, PLASTER[4], 130)
    else:
        for sgn in (-1, 1):
            ramp = PLASTER if sgn > 0 else dark
            hx, kx, fx = legs[sgn]
            lift = 2 if (sgn < 0 and st > 8) else 0    # 뒤꿈치가 든다
            FB = 0 if P['planted'] else B        # 발은 땅에 붙어 있다
            KB = B // 2 - (sgn * dr)              # 무릎이 접힌다(좌우 엇갈려)
            c.limb(hx, HIP_Y + 2, kx, 190 + KB, 14, ramp, bias=-0.02)
            c.sphere(kx, 192 + KB, 12, 12, ramp, bias=-0.04)
            c.limb(kx, 196 + KB, fx, 222 + FB - lift, 10, ramp, bias=-0.02)
            c.trunk(fx, 222 + FB - lift, prof([(0, 15), (5, 16), (8, 14)], 0, 8),
                    ramp, bias=-0.14)
            c.ring(kx, 192 + KB, 12, PLASTER[4], 110)

    # ---- 몸통 ----------------------------------------------------------
    body = prof([(58 + B, 25), (64 + B, 30), (76 + B, 32), (92 + B, 31),
                 (110 + B, 28), (126 + B, 24), (134 + B, 26), (144 + B, 30),
                 (152 + B, 30), (HIP_Y + 2, 28)], 58 + B, HIP_Y + 2)
    c.trunk(cx0, 58 + B, body, PLASTER)
    c.line(cx0, 62 + B, cx0, 152 + B, PLASTER[3], 110)
    c.line(cx0 - 1, 62 + B, cx0 - 1, 152 + B, PLASTER[0], 60)
    for yy, half in ((118, 27), (142, 29)):
        c.line(cx0 - half, yy + B, cx0 + half, yy + B, PLASTER[3], 95)
        c.line(cx0 - half, yy + 1 + B, cx0 + half, yy + 1 + B, PLASTER[0], 45)
    for sgn in (-1, 1):
        c.line(cx0 + sgn * 26, 72 + B, cx0 + sgn * 22, 124 + B, PLASTER[4], 85)
    for r in CUTAWAY[ph]:
        cutaway(c, r[0] + ln, r[1] + B, r[2] + ln, r[3] + B, P['spill'])

    # ---- 팔 ------------------------------------------------------------
    for sgn in (-1, 1):
        ramp = PLASTER
        sx, ex, wx, ey, wy = arms[sgn]
        d = sgn * dr
        sy = SH_Y + d                                # 어깨도 한 칸 따라간다
        c.sphere(sx, sy, 13, 13, ramp, bias=-0.02)
        c.limb(sx, sy + 6, ex, ey - 2, 10, ramp, bias=-0.02)
        c.sphere(ex, ey, 11, 11, ramp, bias=-0.04)
        c.limb(ex, ey + 4, wx, wy, 9, ramp, bias=-0.02)
        if P['fingers']:
            c.limb(wx, wy + 2, wx + sgn * 2, wy + 12, 7, ramp, bias=-0.04)
            for k in range(3):
                fxx = wx + (k - 1) * 4 + sgn * 2
                c.limb(fxx, wy + 11, fxx + sgn, wy + 21, 1.6, ramp, bias=-0.07)
            c.limb(wx - sgn * 5, wy + 9, wx - sgn * 7, wy + 16, 1.6, ramp, bias=-0.07)
        else:
            # 아직 모양이 안 난 덩어리 — 손이 되다 만 것
            c.trunk(wx, wy, prof([(0, 8), (4, 10), (12, 9), (18, 6)], 0, 18),
                    ramp, bias=-0.05)
        c.ring(sx, sy, 13, PLASTER[4], 100)
        c.ring(ex, ey, 11, PLASTER[4], 100)
        # 어깨 덮개 — 각진 석고 판. 둥글기만 하면 인형으로 보인다.
        keep = P['caps'] == 2 or (P['caps'] == 1 and sgn < 0)
        capx = sx + sgn * 1
        if keep:
            capw = prof([(0, 9), (2, 13), (9, 16), (11, 15)], 0, 11)
            for k, w in enumerate(capw):             # 모서리를 깎은 판
                c.trunk(capx, sy - 12 + k, [w], ramp, bias=0.10 - k * 0.010)
            c.line(capx - 8, sy - 12, capx + 8, sy - 12, PLASTER[0], 170)
            c.line(capx - 14, sy - 1, capx + 14, sy - 1, PLASTER[4], 180)
            c.line(capx + sgn * 10, sy - 6, capx + sgn * 13, sy - 2, PLASTER[3], 120)
        elif P['caps'] == 1:
            for k in range(-9, 10):                  # 부러진 밑동만 남는다
                c.dot(capx + k, sy - 10 + (k % 2), PLASTER[4])
                c.dot(capx + k, sy - 9 + (k % 2), PLASTER[3])

    # ---- 족쇄 넷 --------------------------------------------------------
    #   받침대 자체는 방에 선 딴 놈(draft_form)이다. 이 몸에 남는 것은 물린
    #   자국과 끊긴 사슬이다. 마디가 오를수록 하나씩 터져 벌어진다.
    ch = P['chains']
    cuffs = []
    for sgn in (-1, 1):
        sx, ex, _, ey, _ = arms[sgn]
        ax = sx + (ex - sx) * 0.6
        sy = SH_Y + sgn * dr
        ay = (sy + 6) + (ey - 2 - sy - 6) * 0.6 - 4
        cuffs.append((ax, ay, 10, ch >= (4 if sgn > 0 else 3), sgn))
    for sgn in (-1, 1):
        if not P['split']:
            lx, lw = cx0 + sgn * 15, 12
        else:
            hx, kx, _ = legs[sgn]
            lx, lw = hx + (kx - hx) * 0.5, 13
        ly = 174 + (B if not P['planted'] else B // 2)
        cuffs.append((lx, ly, lw, ch >= (2 if sgn > 0 else 1), sgn))
    for (xx, yy, hw, live, sgn) in cuffs:
        cuff(c, xx, yy, hw, P['hot'], not live)
        n = (4 if yy < 140 else 3) if live else 1
        chain(c, xx + sgn * (hw + 3), yy + 3, n, tick)

    # ---- 목 · 머리 ------------------------------------------------------
    c.limb(cx0, 56 + B, head_c[0], head_c[1] + 13, 10, IRON, bias=-0.06)
    for yy in range(50, 60, 3):
        c.line(cx0 - 9, yy + B, cx0 + 9, yy + B, IRON[3], 160)
    c.trunk(cx0, 57 + B, prof([(0, 17), (3, 18), (7, 16)], 0, 7), PLASTER, bias=-0.06)
    c.sphere(head_c[0], head_c[1], 18, 21, PLASTER)
    c.sphere(head_c[0], head_c[1] + 8, 14, 12, PLASTER, bias=0.04)  # 턱 쪽 면
    c.line(head_c[0], head_c[1] - 20, head_c[0], head_c[1] + 20, PLASTER[3], 115)
    c.line(head_c[0] - 1, head_c[1] - 20, head_c[0] - 1, head_c[1] + 20, PLASTER[0], 55)
    # 얼굴은 없다. 기준선과 눈금만 있다 — 이건 조각이 아니라 도면이다.
    c.line(head_c[0] - 16, head_c[1] - 2, head_c[0] + 16, head_c[1] - 2, DRAFT, 95)
    for k in (-8, 8):
        c.line(head_c[0] + k, head_c[1] - 5, head_c[0] + k, head_c[1] - 1, DRAFT, 150)
    c.line(head_c[0] - 7, head_c[1] + 11, head_c[0] + 7, head_c[1] + 11, PLASTER[4], 110)
    # 이마의 만든 이 표시 — 첫 번째라는 표
    mk = mix(DRAFT, CORE[1], P['core'])
    c.ring(head_c[0], head_c[1] - 12, 4, mk, 150)
    c.dot(head_c[0], head_c[1] - 12, mk, 220)
    c.limb(head_c[0], head_c[1] - 23, head_c[0], head_c[1] - 27, 3, IRON, bias=-0.05)
    c.ring(head_c[0], head_c[1] - 29, 4, IRON[2], 235, th=2)      # 매다는 고리

    # ---- 가슴의 핵 ------------------------------------------------------
    kx, ky = cx0, 92 + B
    plate = prof([(0, 20), (5, 24), (34, 24), (40, 19)], 0, 40)
    c.trunk(kx, ky - 20, plate, PLASTER, bias=0.05)
    c.line(kx - 23, ky - 20, kx + 23, ky - 20, PLASTER[0], 180)
    c.line(kx - 23, ky + 20, kx + 23, ky + 20, PLASTER[4], 190)
    for sg in (-1, 1):
        c.line(kx + sg * 23, ky - 15, kx + sg * 23, ky + 15, PLASTER[4], 130)
    c.sphere(kx, ky, 16, 16, PLASTER, bias=-0.26)
    c.ring(kx, ky, 16, PLASTER[4], 160, th=2)
    c.ring(kx, ky, 15, IRON[3], 200, th=1)
    for i in range(12):
        a = i * math.tau / 12 - math.pi / 2
        c.line(kx + math.cos(a) * 19, ky + math.sin(a) * 19,
               kx + math.cos(a) * 22, ky + math.sin(a) * 22, DRAFT, 130)
    c.ring(kx, ky, 20, DRAFT, 70)
    c.sphere(kx, ky, 12, 12, cr, bias=0.08 + P['core'] * 0.35)
    c.sphere(kx - 3, ky - 3, 4, 4, cr, bias=0.55)
    if P['core'] > 0.5:
        c.ring(kx, ky, 14, cr[1], int(150 * P['core']))

    # ---- 설계 선 --------------------------------------------------------
    for yy, half in ((108, 25), (150, 28)):
        c.line(cx0 - half, yy + B, cx0 - half + 5, yy + B, DRAFT, 105)
        c.line(cx0 + half - 5, yy + B, cx0 + half, yy + B, DRAFT, 105)
    if not P['split']:
        c.line(cx0, HIP_Y + 10, cx0, 214 + B, DRAFT, 40)

    # ---- 금 -------------------------------------------------------------
    if P['cracks']:
        glow = mix(INK, CORE[3], P['spill'] * 0.75)
        for pts in CRACKS[P['cracks'] - 1]:
            c.poly([(x + ln + 1, y + B + 1) for x, y in pts], PLASTER[0], 150)
            c.poly([(x + ln, y + B) for x, y in pts], INK, 225)
            c.poly([(x + ln, y + B + 1) for x, y in pts], PLASTER[4], 170)
            if P['spill'] > 0:
                c.poly([(x + ln, y + B) for x, y in pts], glow,
                       int(150 * P['spill']))

    c.outline()
    return c.im


def main():
    sheet = Image.new('RGBA', (W * FRAMES * S, H * S), (0, 0, 0, 0))
    for i in range(FRAMES):
        f = draw_frame(i // 2, i % 2)
        sheet.paste(f.resize((W * S, H * S), Image.NEAREST), (i * W * S, 0))
    assert sheet.size == (7680, 928), sheet.size
    sheet.save(OUT)
    print('  archetype  %dx%d · %d칸 · %dB · frameW %d frameH %d'
          % (W, H, FRAMES, os.path.getsize(OUT), W, H))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
