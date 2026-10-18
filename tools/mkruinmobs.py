#!/usr/bin/env python3
"""유적 고유 몬스터 열다섯 + 덩굴채찍을 다시 그린다 — 부위 명암 붓(pxfig)으로.

■ 왜

  mkruinmobs.py · mkruinmobs2.py 의 그림은 단색 사각형 · 타원을 쌓은 것이라 납작했다(사용자: "저퀄리티 —
  각각 스크린샷 찍어서 디테일 있게"). 덩굴채찍(vinelash)은 걸을 때 두 팔이 거의 안 흔들렸다.
  칸 크기 · 프레임 순서 · 발 자리는 그대로 두고(판정 상자 · foot 이 그대로 맞게) 그림만 바꾼다.

■ 규칙 — 앞 두 도구와 같다

  논리 크기로 그린 뒤 4배 최근접 확대 · 프레임 7장(0 idle1 1 idle2 2 move1 3 move2 4 atk 5 death1 6 death2) ·
  좌우 · 위 한 칸 여백(칸 벽에 닿으면 멈춘다) · 발은 칸 맨 아랫줄. foot · side 는 굽는 김에 매니페스트에 찍는다.

사용법:  python3 tools/mkruinmobs.py   (그다음 python3 tools/sync-manifest.py)
"""
import json
import math
import os
import sys

from PIL import Image  # noqa: E402


# ===== 부위 명암 붓(예전 tools/pxfig.py) ====================
# 작은 몬스터 그림의 붓 — 부위(part)를 모양으로 칠하고, 부위마다 빛 · 재질 · 외곽선을 한 번에 입힌다.
#
# ■ 왜
#
#   예전 붓(mkruinmobs.Canvas)은 단색 사각형 · 타원을 겹쳐 칠하고 맨 바깥에 검은 테 한 겹만 둘렀다.
#   그래서 부위가 납작한 색 덩어리로 보였다(사용자: "저퀄리티 — 디테일 있게"). 손으로 칸마다 명암을
#   찍으면 7장 프레임마다 어긋나므로, 부위의 **모양에서 명암을 계산**한다.
#
# ■ 어떻게
#
#   1. 부위마다 모양(타원 · 다각형 · 가는 캡슐 · 둥근 상자)을 그 부위의 '전체 마스크'로 칠한다 —
#      앞 부위에 가려진 칸도 마스크에는 남는다(명암은 가려지기 전 모양을 보고 정해야 둥글게 읽힌다).
#   2. 마스크 안 거리장(가장자리까지 몇 칸)의 기울기 = 겉면 기울기. 빛은 왼쪽 위에서.
#      가장자리에 가까울수록 기울기가 크게 먹혀 부위가 둥글게 부푼다(bevel).
#   3. 밝기를 다섯 단(그늘 깊음 · 그늘 · 바탕 · 밝음 · 반사)으로 끊는다 — 픽셀아트는 매끈한 그러데이션보다
#      단이 읽혀야 한다. 어두운 단은 푸르스름하게, 밝은 단은 따뜻하게 색을 튼다(납빛 명암 방지).
#   4. 재질 결 — stone(점박이) · cloth(세로 주름) · metal(가로 반사 띠) · chitin(마디 반사) · flesh(얼룩) ·
#      ice(면 · 반짝) · paper(글줄) · leaf(잎맥) · glow(빛 — 명암 없이 밝고 둘레에 번짐).
#   5. 앞 부위가 뒤 부위 위에 드리우는 그늘(오른쪽 아래로 한 칸) · 부위 사이 안쪽 선 · 바깥 테(이웃 부위 색을 어둡게).
#
# 사용: from pxfig import Fig — 몬스터 함수가 Fig 에 부위를 쌓고 fig.render() 가 RGBA Image 를 돌려준다.
import math
from PIL import Image

LIGHT = (-0.62, -0.72, 0.45)
_ln = math.sqrt(sum(v * v for v in LIGHT))
LIGHT = tuple(v / _ln for v in LIGHT)


def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hash(x, y, s=0):
    n = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xffffffff
    n = (n ^ (n >> 13)) * 1274126177 & 0xffffffff
    return ((n ^ (n >> 16)) & 0xffff) / 65535.0


def ramp(col, k):
    """밝기 단 k(0 깊은 그늘 · 1 그늘 · 2 바탕 · 3 밝음 · 4 반사) — 그늘은 푸르게 · 밝음은 따뜻하게"""
    r, g, b = col
    if k == 2:
        return col
    if k < 2:
        t = (2 - k) * 0.3
        dk = (int(r * 0.32 + 14), int(g * 0.3 + 12), int(b * 0.38 + 30))
        return tuple(int(c + (d - c) * t) for c, d in zip(col, dk))
    t = (k - 2) * 0.28
    lt = (min(255, r + 70), min(255, g + 62), min(255, b + 40))
    return tuple(int(c + (d - c) * t) for c, d in zip(col, lt))


class Part:
    __slots__ = ('mat', 'col', 'mask', 'glow', 'bevel', 'seed', 'flat')

    def __init__(self, mat, col, w, h, glow, bevel, seed, flat):
        self.mat, self.col, self.glow, self.bevel, self.seed, self.flat = mat, col, glow, bevel, seed, flat
        self.mask = [[False] * w for _ in range(h)]


class Fig:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.parts = []
        self.top = [[-1] * w for _ in range(h)]       # 칸마다 맨 앞 부위
        self.lines = []                               # 덧그리는 한 칸 선(눈 · 글자 · 금) — 명암 없이
        self.halo = []                                # 빛 번짐 (x, y, r, col, a)

    # ---------------- 부위
    def part(self, mat, col, glow=False, bevel=None, seed=0, flat=False):
        p = Part(mat, hx(col) if isinstance(col, str) else col, self.w, self.h, glow, bevel, seed, flat)
        self.parts.append(p)
        return _Pen(self, len(self.parts) - 1)

    def _put(self, i, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.parts[i].mask[y][x] = True
            self.top[y][x] = i

    def px(self, x, y, col, a=255):
        """명암 없이 한 칸(눈동자 · 무늬)"""
        self.lines.append((int(round(x)), int(round(y)), hx(col) if isinstance(col, str) else col, a))

    def line(self, x0, y0, x1, y1, col, a=255):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            self.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col, a)

    def glow(self, x, y, r, col, a=0.45):
        self.halo.append((x, y, r, hx(col) if isinstance(col, str) else col, a))

    # ---------------- 칠하기
    def render(self):
        W, H, P = self.w, self.h, self.parts
        out = [[None] * W for _ in range(H)]
        lvl = [[2] * W for _ in range(H)]
        for i, p in enumerate(P):
            # 거리장 — 마스크 가장자리까지(체스판 BFS)
            INF = 99
            d = [[INF if p.mask[y][x] else 0 for x in range(W)] for y in range(H)]
            for _ in range(2):
                for y in range(H):
                    for x in range(W):
                        if d[y][x]:
                            v = d[y][x]
                            if x > 0: v = min(v, d[y][x - 1] + 1)
                            if y > 0: v = min(v, d[y - 1][x] + 1)
                            if x > 0 and y > 0: v = min(v, d[y - 1][x - 1] + 1.4)
                            if x < W - 1 and y > 0: v = min(v, d[y - 1][x + 1] + 1.4)
                            d[y][x] = v
                for y in range(H - 1, -1, -1):
                    for x in range(W - 1, -1, -1):
                        if d[y][x]:
                            v = d[y][x]
                            if x < W - 1: v = min(v, d[y][x + 1] + 1)
                            if y < H - 1: v = min(v, d[y + 1][x] + 1)
                            if x < W - 1 and y < H - 1: v = min(v, d[y + 1][x + 1] + 1.4)
                            if x > 0 and y < H - 1: v = min(v, d[y + 1][x - 1] + 1.4)
                            d[y][x] = v
            mx = max((d[y][x] for y in range(H) for x in range(W) if p.mask[y][x]), default=1)
            R = p.bevel or max(1.5, min(4.0, mx * 0.75))
            for y in range(H):
                for x in range(W):
                    if self.top[y][x] != i:
                        continue
                    if p.glow:
                        out[y][x] = p.col; lvl[y][x] = 3; continue
                    if p.flat:
                        k = 2
                    else:
                        g = lambda xx, yy: min(d[yy][xx], R) if 0 <= xx < W and 0 <= yy < H else 0
                        nx = -(g(x + 1, y) - g(x - 1, y)) / 2
                        ny = -(g(x, y + 1) - g(x, y - 1)) / 2
                        e = 1 - min(d[y][x], R) / R           # 가장자리일수록 1
                        nx, ny = nx * (0.4 + e), ny * (0.4 + e)
                        nz = max(0.25, 1 - math.hypot(nx, ny))
                        ln = math.sqrt(nx * nx + ny * ny + nz * nz)
                        lit = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / ln
                        k = 0 if lit < -0.05 else 1 if lit < 0.32 else 2 if lit < 0.66 else 3
                        if k == 3 and d[y][x] <= 1.5 and lit > 0.78:
                            k = 4                              # 왼쪽 위 테두리 반사
                    k += self._tex(p, x, y, d[y][x])
                    # 앞 부위가 드리운 그늘 — 왼쪽 위 칸이 더 앞 부위면 한 단 어둡게
                    if y > 0 and x > 0 and self.top[y - 1][x - 1] > i and not P[self.top[y - 1][x - 1]].glow:
                        k -= 1
                    k = max(0, min(4, k))
                    lvl[y][x] = k
                    out[y][x] = ramp(p.col, k)
        # 부위 사이 안쪽 선 — 앞 부위의 가장자리 칸이 뒤 부위와 닿으면 그 칸을 한 단 더 어둡게(겹친 결이 읽힌다)
        for y in range(H):
            for x in range(W):
                i = self.top[y][x]
                if i < 0 or P[i].glow:
                    continue
                for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H:
                        j = self.top[yy][xx]
                        if 0 <= j < i and P[j].col != P[i].col and not P[j].glow:
                            out[y][x] = ramp(P[i].col, max(0, lvl[y][x] - 2 if (dx, dy) in ((1, 0), (0, 1)) else lvl[y][x] - 1))
                            break
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        pxl = im.load()
        for y in range(H):
            for x in range(W):
                if out[y][x]:
                    c = out[y][x]
                    pxl[x, y] = (c[0], c[1], c[2], 255)
        for x, y, c, a in self.lines:
            if 0 <= x < W and 0 <= y < H:
                if a >= 255:
                    pxl[x, y] = (c[0], c[1], c[2], 255)
                else:
                    o = pxl[x, y]
                    k = a / 255
                    pxl[x, y] = (int(o[0] + (c[0] - o[0]) * k), int(o[1] + (c[1] - o[1]) * k), int(o[2] + (c[2] - o[2]) * k), max(o[3], a))
        # 바깥 테 — 닿은 부위 색을 아주 어둡게(검정 한 색이면 부위마다 같은 테라 납작했다)
        filled = [[pxl[x, y][3] > 200 for x in range(W)] for y in range(H)]
        for y in range(H):
            for x in range(W):
                if filled[y][x]:
                    continue
                best = None
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and filled[yy][xx]:
                        i = self.top[yy][xx]
                        c = P[i].col if i >= 0 else pxl[xx, yy][:3]
                        if i >= 0 and P[i].glow:
                            continue
                        oc = (int(c[0] * 0.18 + 8), int(c[1] * 0.16 + 7), int(c[2] * 0.2 + 12))
                        if best is None or sum(oc) < sum(best):
                            best = oc
                if best:
                    pxl[x, y] = (best[0], best[1], best[2], 255)
        # 빛 번짐 — 빈 칸에만 반투명으로(몸 위는 이미 밝다)
        for (gx, gy, r, c, a) in self.halo:
            for y in range(int(gy - r - 1), int(gy + r + 2)):
                for x in range(int(gx - r - 1), int(gx + r + 2)):
                    if not (1 <= x < W - 1 and 1 <= y < H):      # 칸 벽 한 칸은 비워 둔다(옆 칸과 붙어 보이지 않게)
                        continue
                    dd = math.hypot(x - gx, y - gy)
                    if dd > r:
                        continue
                    k = a * (1 - dd / r) ** 1.6
                    o = pxl[x, y]
                    if o[3] > 200:
                        nc = tuple(min(255, int(o[j] + c[j] * k * 0.5)) for j in range(3))
                        pxl[x, y] = (nc[0], nc[1], nc[2], o[3])
                    else:
                        na = int(255 * k * 0.8)
                        if na > o[3]:
                            pxl[x, y] = (c[0], c[1], c[2], na)
        return im

    def _tex(self, p, x, y, d):
        """재질 결 — 밝기 단을 ±1 흔든다"""
        m, s = p.mat, p.seed
        h = _hash(x, y, s)
        if m == 'stone':
            return -1 if h < 0.16 else 1 if h > 0.93 and d > 1 else 0
        if m == 'cloth':
            return -1 if (x + (y // 4)) % 4 == 0 and h < 0.6 and d > 1 else 0
        if m == 'metal':
            return 1 if (y + s) % 5 == 1 and d > 1 else -1 if h < 0.06 else 0
        if m == 'chitin':
            return 1 if (x + y * 2 + s) % 7 == 0 and d > 1 else 0
        if m == 'flesh':
            return -1 if _hash(x // 2, y // 2, s) < 0.2 else 0
        if m == 'ice':
            return 1 if (x - y + s) % 6 == 0 and d > 1 else (1 if h > 0.95 else 0)
        if m == 'paper':
            return -1 if y % 3 == 0 and 1 < d and h < 0.75 else 0
        if m == 'leaf':
            return 1 if (x + y + s) % 5 == 0 and d > 1 else -1 if h < 0.1 else 0
        if m == 'wood':
            return -1 if (x * 3 + (y // 3) + s) % 5 == 0 else 0
        if m == 'clay':
            return -1 if h < 0.1 else 0
        return 0


class _Pen:
    """부위 하나에 모양을 칠하는 붓"""
    def __init__(self, fig, i):
        self.f, self.i = fig, i

    def ell(self, cx, cy, rx, ry, rot=0.0):
        c, s = math.cos(rot), math.sin(rot)
        R = int(max(rx, ry)) + 2
        for y in range(int(cy) - R, int(cy) + R + 1):
            for x in range(int(cx) - R, int(cx) + R + 1):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                u, v = dx * c + dy * s, -dx * s + dy * c
                if (u / max(rx, .01)) ** 2 + (v / max(ry, .01)) ** 2 <= 1.0:
                    self.f._put(self.i, x, y)
        return self

    def poly(self, pts):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
            for x in range(int(min(xs)) - 1, int(max(xs)) + 2):
                px, py = x + 0.5, y + 0.5
                ins = False
                j = len(pts) - 1
                for k in range(len(pts)):
                    xi, yi = pts[k]; xj, yj = pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi:
                        ins = not ins
                    j = k
                if ins:
                    self.f._put(self.i, x, y)
        return self

    def cap(self, x0, y0, x1, y1, r0, r1=None):
        """가늘어지는 캡슐 — 팔 · 다리 · 꼬리"""
        r1 = r0 if r1 is None else r1
        R = int(max(r0, r1)) + 2
        L2 = (x1 - x0) ** 2 + (y1 - y0) ** 2 or 1e-9
        for y in range(int(min(y0, y1)) - R, int(max(y0, y1)) + R + 1):
            for x in range(int(min(x0, x1)) - R, int(max(x0, x1)) + R + 1):
                px, py = x + 0.5, y + 0.5
                t = max(0, min(1, ((px - x0) * (x1 - x0) + (py - y0) * (y1 - y0)) / L2))
                qx, qy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                if math.hypot(px - qx, py - qy) <= r0 + (r1 - r0) * t:
                    self.f._put(self.i, x, y)
        return self

    def box(self, x, y, w, h, r=0):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                if r:
                    cx = min(max(xx + 0.5, x + r), x + w - r); cy = min(max(yy + 0.5, y + r), y + h - r)
                    if math.hypot(xx + 0.5 - cx, yy + 0.5 - cy) > r:
                        continue
                self.f._put(self.i, xx, yy)
        return self

    def dot(self, x, y):
        self.f._put(self.i, int(x), int(y))
        return self

# ===== 유적 몬스터 ==============================
S, FRAMES = 4, 7
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'play', 'assets', 'char')
MANIFEST = os.path.join(HERE, '..', 'play', 'assets', 'manifest.json')

WALK = [0, 0, 1, -1, 0, 0, 0]          # 걸음 — move1 / move2 에서 다리가 엇갈린다
BOB = [0, 1, 0, 1, 0, 0, 0]


# ======================================================== 언 순례자 (얼음 던전) 30x39
def frostbound(f):
    F = Fig(30, 39)
    b, w = BOB[f], WALK[f]
    if f == 6:                                     # 얼음이 깨져 흩어지고 몸은 주저앉았다
        F.part('cloth', '#2a3a52').ell(15, 35, 7, 3)
        for (x, y, r) in ((6, 36, 2.6), (11, 37, 2), (21, 36, 3), (25, 37, 2), (17, 33, 1.6)):
            F.part('ice', '#a8dcef').ell(x, y, r, r * 0.7)
        F.px(13, 34, '#bfe8ff'); F.px(16, 34, '#bfe8ff')
        return F.render()
    lean = 2 if f == 4 else 0
    sink = 6 if f == 5 else 0
    y0 = 3 + b + sink
    # 지팡이(뒤) — 얼어붙은 깃발이 매달렸다
    sx = 20 + (2 if f == 4 else 0)
    F.part('wood', '#5a4a3a').cap(sx, y0 + 4 - (3 if f == 4 else 0), sx - 1, 37, 0.8)
    F.part('cloth', '#7a3a4a').poly([(sx, y0 + 6), (sx + 5, y0 + 7), (sx + 4, y0 + 13), (sx, y0 + 12)])
    F.part('ice', '#cfeefc').poly([(sx, y0 + 12), (sx + 4, y0 + 13), (sx + 2, y0 + 16)])
    # 다리 — 얼음 덩이 발
    for side, dx in ((-1, 10), (1, 17)):
        st = w * side * 2
        F.part('ice', '#7fb8d2').cap(dx + st * 0.3, 30 + sink // 2, dx + st, 37, 2.2, 2.6)
    # 얼음 껍질 — 몸보다 크고, 면이 갈린다
    shell = F.part('ice', '#9fd8ea', bevel=3.5)
    shell.poly([(9 + lean, y0 + 2), (15 + lean, y0 - 1), (21 + lean, y0 + 2), (24, y0 + 14), (23, 33), (7, 33), (6, y0 + 14)])
    # 안에 비치는 순례자 — 두건 · 어깨 · 손
    F.part('cloth', '#22324a', bevel=2).poly([(11 + lean, y0 + 5), (15 + lean, y0 + 2), (19 + lean, y0 + 5), (20, 30), (10, 30)])
    F.part('cloth', '#33486a').ell(15 + lean, y0 + 7, 3.6, 3.4)
    F.px(14 + lean, y0 + 7, '#bfe8ff'); F.px(16 + lean, y0 + 7, '#bfe8ff')
    F.glow(15 + lean, y0 + 7, 3, '#9fe0ff', 0.35)
    # 얼음 겉면의 금 · 반짝
    F.line(9, y0 + 10, 12, y0 + 16, '#e8faff', 170)
    F.line(20, y0 + 18, 22, y0 + 24, '#e8faff', 150)
    if f == 5:
        F.line(10, y0 + 4, 18, y0 + 20, '#f4fdff'); F.line(18, y0 + 20, 14, 32, '#f4fdff')
    if f == 4:                                    # 지팡이 끝에서 얼음 조각이 튄다
        for k in range(3):
            F.part('ice', '#e0f6ff', glow=True).dot(sx + 2 + k * 2, y0 + 2 - k)
        F.glow(sx + 2, y0 + 2, 4, '#bfeaff', 0.5)
    F.px(8, y0 + 6, '#f4fdff'); F.px(9, y0 + 5, '#f4fdff')
    return F.render()


# ======================================================== 서리 방패병 (얼음 던전) 32x44
def rimeguard(f):
    F = Fig(32, 44)
    b, w = BOB[f], WALK[f]
    if f == 6:
        F.part('metal', '#4a5a72').ell(12, 40, 8, 3)
        F.part('metal', '#5e7290').ell(9, 37, 3.5, 3)
        F.part('ice', '#9fd8ea', bevel=2).poly([(16, 41), (29, 38), (30, 42), (17, 43)])
        return F.render()
    sink = 5 if f == 5 else 0
    y0 = 3 + b + sink
    push = 2 if f == 4 else 0
    # 다리 — 정강이 갑옷 · 발
    for side, lx in ((-1, 10), (1, 15)):
        st = w * side * 2
        F.part('metal', '#3e4e66').cap(lx, y0 + 26, lx + st, 40, 2.4, 2.2)
        F.part('metal', '#5a6e86').box(lx + st - 3, 39, 6, 3, 1)
    # 몸통 · 허리띠 · 쇠사슬 치마
    F.part('metal', '#4e627c', bevel=3).poly([(6, y0 + 12), (19, y0 + 12), (20, y0 + 26), (5, y0 + 26)])
    F.part('cloth', '#3a3048').box(5, y0 + 23, 16, 3)
    F.part('metal', '#7a8aa0').box(11, y0 + 23, 3, 3)
    F.part('metal', '#5a6e86').poly([(5, y0 + 26), (20, y0 + 26), (21, y0 + 30), (4, y0 + 30)])
    # 뒷팔(창) · 어깨받이
    F.part('wood', '#6a5040').cap(4, y0 + 6, 4, y0 + 34, 0.7)
    F.part('metal', '#bcd0e0', bevel=1.5).poly([(4, y0 + 0), (6, y0 + 6), (2, y0 + 6)])
    F.part('metal', '#5a6e86').ell(6, y0 + 13, 3.5, 3)
    # 투구 — 뺨막이 · 눈구멍 빛 · 꼭지
    F.part('metal', '#6a7e98', bevel=2.5).poly([(8, y0 + 2), (16, y0 + 1), (18, y0 + 6), (17, y0 + 12), (8, y0 + 12), (7, y0 + 6)])
    F.part('metal', '#8aa0ba').poly([(12, y0 - 1), (13, y0 - 1), (13, y0 + 2), (12, y0 + 2)])
    F.part('cloth', '#0e1420', flat=True).box(10, y0 + 6, 7, 2)
    F.px(14, y0 + 6, '#bfe8ff'); F.px(15, y0 + 6, '#bfe8ff'); F.glow(15, y0 + 7, 3, '#9fe0ff', 0.4)
    # 얼음 탑방패 — 몸보다 크고 금속 테 · 면 · 가운데 별 문장
    sx = 15 + push
    F.part('metal', '#4a5a72', bevel=1.5).poly([(sx, y0 + 5), (sx + 11, y0 + 4), (sx + 12, y0 + 33), (sx + 1, y0 + 35)])
    F.part('ice', '#9fd8ea', bevel=3).poly([(sx + 1, y0 + 6), (sx + 10, y0 + 5), (sx + 11, y0 + 32), (sx + 2, y0 + 34)])
    F.line(sx + 3, y0 + 9, sx + 5, y0 + 20, '#e8faff', 200); F.line(sx + 8, y0 + 18, sx + 9, y0 + 28, '#e8faff', 150)
    cx, cy = sx + 6, y0 + 18
    for a in range(4):
        t = a * math.pi / 2
        F.line(cx, cy, cx + round(math.cos(t) * 3), cy + round(math.sin(t) * 3), '#5a8aa8')
    F.px(cx, cy, '#e0f6ff')
    if f == 5:
        F.line(sx + 2, y0 + 8, sx + 10, y0 + 30, '#f8feff'); F.line(sx + 9, y0 + 14, sx + 4, y0 + 24, '#f8feff')
    if f == 4:
        for k in range(4):
            F.part('ice', '#e8faff', glow=True).dot(sx + 13, y0 + 10 + k * 5)
        F.glow(sx + 13, y0 + 18, 5, '#bfeaff', 0.45)
    return F.render()


# ======================================================== 단지 껍데기 (피라미드) 28x28
def jarhusk(f):
    F = Fig(28, 28)
    b, w = BOB[f], WALK[f]
    if f == 6:                                     # 깨진 단지 조각 · 흘러나온 붕대
        F.part('cloth', '#c8b890').cap(6, 25, 20, 26, 1)
        for (x, y, r) in ((7, 23, 3), (14, 24, 2.6), (20, 23, 3.2)):
            F.part('clay', '#b0884a').ell(x, y, r, r * 0.7)
        F.px(14, 22, '#ffb04a')
        return F.render()
    y0 = 5 + b + (4 if f == 5 else 0)
    lid = -1 if f == 4 else 0
    # 붕대 다리 둘 — 짧게 아장아장
    for side, lx in ((-1, 10), (1, 17)):
        F.part('cloth', '#c8b890').cap(lx, y0 + 16, lx + w * side * 2, 25, 1.6, 1.4)
    # 단지 몸 — 어깨가 넓고 아래로 좁아진다, 띠 무늬
    F.part('clay', '#c8964e', bevel=4).poly([(7, y0 + 4), (21, y0 + 4), (23, y0 + 9), (22, y0 + 16), (18, y0 + 19), (10, y0 + 19), (6, y0 + 16), (5, y0 + 9)])
    F.part('clay', '#3a6a8a', flat=True).box(6, y0 + 9, 17, 2)
    for x in range(7, 22, 3):
        F.px(x, y0 + 9, '#e8c070'); F.px(x + 1, y0 + 10, '#e8c070')
    F.part('cloth', '#d8c8a0').poly([(8, y0 + 13), (20, y0 + 12), (20, y0 + 14), (8, y0 + 15)])   # 감긴 붕대 한 줄
    # 뚜껑 — 자칼 머리, 공격 때 들린다
    hy = y0 + lid
    F.part('clay', '#b08040', bevel=2).poly([(9, hy + 4), (19, hy + 4), (18, hy), (10, hy)])
    F.part('clay', '#c8964e', bevel=2).poly([(10, hy), (11, hy - 3), (13, hy - 1), (15, hy - 1), (17, hy - 3), (18, hy)])
    F.part('cloth', '#1a1008', flat=True).box(11, hy + 5, 6, 1 + (2 if f == 4 else 0))   # 틈 — 안이 어둡다
    F.px(12, hy + 5, '#ffb04a'); F.px(15, hy + 5, '#ffb04a'); F.glow(14, hy + 6, 3, '#ffa040', 0.4)
    if f == 4:                                     # 틈에서 붕대 채찍이 뻗는다
        F.part('cloth', '#d8c8a0').cap(17, hy + 6, 25, hy + 3, 1.1, 0.7)
    if f == 5:
        F.line(9, y0 + 6, 13, y0 + 15, '#3a2410'); F.line(13, y0 + 15, 11, y0 + 19, '#3a2410')
    return F.render()


# ======================================================== 빈 광차 (버려진 광산) 34x25
def cartwraith(f):
    F = Fig(34, 25)
    if f == 6:
        F.part('metal', '#5a4a3e').poly([(4, 22), (26, 21), (28, 24), (5, 24)])
        F.part('metal', '#3a3a40').ell(28, 21, 3, 3)
        return F.render()
    jolt = [0, 1, 0, 1, 0, 2, 0][f]
    tilt = 0.12 if f == 4 else -0.15 if f == 5 else 0
    y0 = 8 + jolt
    # 유령불 — 짐칸에서 피어오른다(몸보다 먼저: 짐칸 테가 앞을 가린다)
    fl = [3, 4, 3, 4, 4, 2, 0][f]
    F.part('glow', '#7ad8ff', glow=True).poly([(10, y0 + 2), (13, y0 - fl), (16, y0 - 1), (19, y0 - fl - 2), (22, y0 + 1), (24, y0 + 3), (9, y0 + 3)])
    F.part('glow', '#e0f8ff', glow=True).poly([(13, y0 + 2), (16, y0 - fl + 3), (19, y0 + 2)])
    F.glow(16, y0, 7, '#6ad0ff', 0.4)
    # 짐칸 — 녹슨 철판 · 리벳 · 가로 띠
    def rot(x, y):
        cx, cy = 17, y0 + 7
        return (cx + (x - cx) * math.cos(tilt) - (y - cy) * math.sin(tilt), cy + (x - cx) * math.sin(tilt) + (y - cy) * math.cos(tilt))
    F.part('metal', '#7a5a42', bevel=2.5).poly([rot(5, y0 + 2), rot(29, y0 + 2), rot(26, y0 + 13), rot(8, y0 + 13)])
    F.part('metal', '#5a4436').poly([rot(5, y0 + 2), rot(29, y0 + 2), rot(29, y0 + 4), rot(5, y0 + 4)])
    F.part('metal', '#9a7454', flat=True).poly([rot(7, y0 + 7), rot(27, y0 + 7), rot(27, y0 + 8), rot(7, y0 + 8)])
    for x in (8, 13, 18, 23, 27):
        rx, ry = rot(x, y0 + 3); F.px(rx, ry, '#c8a070')
        rx, ry = rot(x - 0.5, y0 + 10); F.px(rx, ry, '#c8a070')
    F.line(*rot(10, y0 + 9), *rot(13, y0 + 12), '#c86a3a', 150)     # 녹물 자국
    # 바퀴 — 바큇살이 돈다
    for wx in (11, 23):
        cy = 21
        F.part('metal', '#3e3e46', bevel=1.5).ell(wx, cy, 3.4, 3.4)
        F.part('metal', '#6a6a74').ell(wx, cy, 1.2, 1.2)
        a = f * 0.9
        for k in range(3):
            t = a + k * math.pi / 3
            F.line(wx - math.cos(t) * 2.6, cy - math.sin(t) * 2.6, wx + math.cos(t) * 2.6, cy + math.sin(t) * 2.6, '#8a8a94')
    if f == 4:                                     # 앞으로 들이받으며 불티
        for k in range(4):
            F.part('glow', '#ffd07a', glow=True).dot(30, 12 + k * 2)
        F.glow(29, 15, 3, '#ffb050', 0.5)
    if f == 5:
        F.line(*rot(14, y0 + 3), *rot(18, y0 + 12), '#1a1410')
    return F.render()


# ======================================================== 주머니의 것 (부패한 둥지) 28x30
def sacling(f):
    F = Fig(28, 30)
    b, w = BOB[f], WALK[f]
    if f == 6:
        F.part('flesh', '#6a3a6a').ell(14, 27, 9, 2.4)
        F.part('flesh', '#8a4a7a').ell(11, 26, 3, 1.6)
        F.px(16, 26, '#f08ac8')
        return F.render()
    y0 = 3 + b * 1 + (5 if f == 5 else 0)
    # 촉수 다리 — 걸을 때 앞뒤로 휜다
    for k, lx in enumerate((7, 11, 16, 20)):
        sw = w * (1 if k % 2 else -1) * 2.5
        F.part('flesh', '#5a2a5a').cap(lx, y0 + 15, lx + sw, 28, 1.3, 0.6)
    # 주머니 — 반투명 막, 핏줄, 안에 웅크린 것
    F.part('flesh', '#9a4a8a', bevel=4).ell(14, y0 + 9, 9.5 - (0.5 if f == 1 else 0), 8 + (0.5 if f == 1 else 0))
    F.part('flesh', '#c870b0').ell(13, y0 + 9, 5.5, 4.6)                    # 비치는 속
    F.part('flesh', '#5a2050').ell(14, y0 + 10, 3, 2.4)                      # 웅크린 것
    F.px(15, y0 + 9, '#ffd0f0')
    for (x0, y_0, x1, y_1) in ((7, y0 + 4, 10, y0 + 10), (20, y0 + 5, 18, y0 + 12), (11, y0 + 15, 16, y0 + 14)):
        F.line(x0, y_0, x1, y_1, '#5a1a4a', 200)
    for (x, y) in ((9, y0 + 3), (19, y0 + 6), (17, y0 + 15)):
        F.px(x, y, '#f0b0e0')                                                # 젖은 반사
    F.glow(14, y0 + 9, 6, '#e080c0', 0.25)
    if f == 4:                                     # 앞으로 뿜는 산성 방울
        for k in range(3):
            F.part('glow', '#b0ff6a', glow=True).ell(22 + k * 2, y0 + 8 - k, 1, 1)
        F.glow(24, y0 + 7, 4, '#a0f060', 0.45)
    return F.render()


# ======================================================== 구멍벌레 (포자 굴) 30x29
def ventspitter(f):
    F = Fig(30, 29)
    if f == 6:
        F.part('stone', '#3e5a48').poly([(4, 27), (26, 27), (22, 23), (8, 23)])
        F.part('flesh', '#a07aa0').ell(15, 24, 3, 1.2)
        return F.render()
    rise = [5, 6, 5, 6, 7, 3, 0][f]
    # 포자 구멍 — 이끼 낀 둔덕(앞에서 벌레를 받친다)
    # 벌레 — 마디진 몸이 구멍에서 솟고, 머리에 고리 이빨
    top = 21 - rise * 2
    for k in range(5):
        y = 21 - k * (rise * 2 / 5)
        F.part('flesh', '#b88ab0' if k % 2 else '#a07aa0', bevel=2).ell(15 + math.sin(k * 0.9 + f) * 1.2, y, 4.2 - k * 0.15, 2.6)
    hx_ = 15 + math.sin(4 * 0.9 + f) * 1.2
    F.part('flesh', '#c89ac0', bevel=2.5).ell(hx_, top, 4.6, 3.6)
    F.part('flesh', '#2a0e20', flat=True).ell(hx_, top - 1 if f != 4 else top - 2, 2.2, 1.6 if f != 4 else 2.4)   # 입
    for a in range(6):
        t = a * math.pi / 3
        F.px(hx_ + math.cos(t) * 2.6, top - 1 + math.sin(t) * 2, '#f0e8d0')
    F.part('stone', '#4a6a52', bevel=3).poly([(3, 27), (27, 27), (24, 20), (19, 18), (11, 18), (6, 20)])
    F.part('leaf', '#5a8a4a').poly([(5, 21), (10, 18), (13, 19), (8, 22)])
    F.part('leaf', '#5a8a4a').poly([(18, 19), (23, 19), (26, 22), (21, 22)])
    for (x, y) in ((8, 24), (21, 25), (14, 22)):
        F.part('glow', '#9ae0a0', glow=True).dot(x, y)
    F.part('cloth', '#141a12', flat=True).ell(15, 20, 4.5, 1.2)
    if f == 4:                                     # 포자 뭉치를 뱉는다
        for k in range(4):
            F.part('glow', '#d8f08a', glow=True).ell(hx_ + 4 + k * 2.2, top + 1 - k * 0.6, 1.1, 1.1)
        F.glow(hx_ + 7, top, 4, '#c8e870', 0.45)
    return F.render()


# ======================================================== 태양 풍뎅이 (피라미드) 32x20
def sunscarab(f):
    F = Fig(32, 20)
    if f == 6:                                     # 뒤집혀 다리가 하늘로
        F.part('chitin', '#b88a2a', bevel=2.5).ell(16, 15, 9, 3.5)
        for k in range(6):
            F.part('chitin', '#4a3018').cap(9 + k * 3, 12, 9 + k * 3 + (1 if k % 2 else -1), 8, 0.6)
        return F.render()
    w = WALK[f]
    burrow = 4 if f == 5 else 0
    y0 = 6 + burrow
    lunge = 1 if f == 4 else 0
    # 다리 여섯 — 세 쌍이 엇갈린다
    for k in range(3):
        lx = 10 + k * 6 + lunge
        sw = (w if k % 2 == 0 else -w) * 1.6
        F.part('chitin', '#4a3018').cap(lx, y0 + 8, lx - 2 + sw, 18, 0.7)
        F.part('chitin', '#3a2410').cap(lx + 2, y0 + 8, lx + 3 - sw, 18, 0.6)
    # 몸 — 앞가슴 · 딱지날개 둘(가운데 갈라진 줄) · 태양 원반
    F.part('chitin', '#d8a838', bevel=3).ell(13 + lunge, y0 + 5, 9, 5.4)
    F.line(5 + lunge, y0 + 4, 21 + lunge, y0 + 4, '#7a5418', 220)
    F.part('chitin', '#c89030', bevel=2).ell(23 + lunge, y0 + 5, 4, 3.6)
    F.part('chitin', '#8a5a1a', bevel=1.5).poly([(26 + lunge, y0 + 4), (29 + lunge, y0), (28 + lunge, y0 + 4), (27 + lunge, y0 + 6)])   # 뿔
    F.px(25 + lunge, y0 + 4, '#ff4a2a')
    F.part('glow', '#fff0a0', glow=True).ell(13 + lunge, y0 + 4, 2, 2)
    for a in range(8):
        t = a * math.pi / 4 + f * 0.2
        F.px(13 + lunge + math.cos(t) * 3.4, y0 + 4 + math.sin(t) * 2.2, '#ffe070', 220)
    F.glow(13 + lunge, y0 + 4, 5, '#ffd050', 0.35)
    if f == 5:                                     # 모래 속으로 — 둘레 모래 튐
        F.part('stone', '#d8c08a').poly([(3, 19), (29, 19), (26, 15), (6, 15)])
    if f == 4:
        F.glow(29, y0 + 2, 2, '#ffe0a0', 0.5)
    return F.render()


# ======================================================== 등불 도둑 (버려진 광산) 30x32
def lampthief(f):
    F = Fig(30, 32)
    b, w = BOB[f], WALK[f]
    if f == 6:
        F.part('cloth', '#3a2e3e').poly([(5, 30), (21, 29), (23, 31), (4, 31)])
        F.part('cloth', '#6a5236').ell(9, 28, 3.5, 2.4)
        F.part('glow', '#ffb04a', glow=True).ell(24, 29, 1.5, 1.5); F.glow(24, 29, 4, '#ff9a3a', 0.4)
        return F.render()
    y0 = 5 + b + (4 if f == 5 else 0)
    hunch = 1 if f in (2, 3) else 0
    # 훔친 자루(등 뒤)
    F.part('cloth', '#7a6040', bevel=3).ell(8, y0 + 12, 5, 6)
    F.line(6, y0 + 7, 10, y0 + 9, '#4a3a24'); F.px(7, y0 + 13, '#a08050')
    # 다리 — 살금살금 넓은 보폭
    for side, lx in ((-1, 12), (1, 17)):
        st = w * side * 3
        F.part('cloth', '#2e2432').cap(lx, y0 + 18, lx + st, 30, 1.4, 1.1)
        F.part('cloth', '#1e1820').ell(lx + st + 1, 30, 2, 1)
    # 몸 — 두건 망토(뾰족 끝) · 웅크린 등
    F.part('cloth', '#4a3a52', bevel=3).poly([(10, y0 + 4 + hunch), (17, y0 + 2 + hunch), (22, y0 + 8), (21, y0 + 20), (9, y0 + 20)])
    F.part('cloth', '#3a2e44', bevel=2).poly([(11, y0 + 4 + hunch), (16, y0 - 2 + hunch), (20, y0 + 5 + hunch), (18, y0 + 9 + hunch), (12, y0 + 9 + hunch)])
    F.part('cloth', '#0e0a12', flat=True).ell(17, y0 + 6 + hunch, 2.6, 2)
    F.px(17, y0 + 6 + hunch, '#ffd050'); F.px(19, y0 + 6 + hunch, '#ffd050')
    F.glow(18, y0 + 6 + hunch, 3, '#ffc040', 0.35)
    # 팔 · 훔친 등불 — 앞(오른쪽)에서 흔들린다, 공격 때 낚아채듯 뻗는다
    reach = 2 if f == 4 else 0
    ax, ay = 22 + reach, y0 + 13 + (1 if f == 1 else 0)
    F.part('cloth', '#4a3a52').cap(18, y0 + 10, ax, ay, 1.3, 1.0)
    F.part('cloth', '#c8a080').ell(ax, ay, 1.2, 1.2)
    lx, ly = ax + 1, ay + 3
    F.part('metal', '#5a4a30').box(lx - 2, ly - 1, 4, 1)
    F.part('glow', '#ffd070', glow=True).box(lx - 1, ly, 3, 3)
    F.part('metal', '#4a3a24').box(lx - 2, ly + 3, 5, 1)
    F.glow(lx, ly + 1, 6, '#ffb040', 0.5)
    return F.render()


# ======================================================== 옮는 거머리 (부패한 둥지) 41x20
def blightleech(f):
    F = Fig(41, 20)
    if f == 6:
        F.part('flesh', '#5a2a52').ell(20, 18, 14, 1.6)
        return F.render()
    flat = f == 5
    ph = [0, 0.5, 1.2, 2.4, 0, 0, 0][f]
    stretch = 3 if f == 4 else 0
    n = 9
    pts = []
    for k in range(n):
        x = 5 + k * (24 + stretch) / (n - 1)
        y = 13 - (0 if flat else math.sin(k * 0.8 + ph) * 2.6) - (k * 0.4 if f == 4 else 0)
        pts.append((x, y))
    # 끈적한 자국
    F.part('glow', '#8a5a7a', glow=True).box(5, 18, 27, 1)
    for k, (x, y) in enumerate(pts):
        r = 3.6 if 2 < k < 7 else 3.0 if k > 0 else 2.6
        F.part('flesh', '#7a3a72' if k % 2 else '#6a3064', bevel=2.5, seed=k).ell(x, y, r, r * (0.7 if flat else 1))
    for k, (x, y) in enumerate(pts[1:-1]):
        F.px(x, y - 2, '#d890c8'); F.px(x - 1, y + 2, '#3a1438')       # 마디 반사 · 마디 골
    hx_, hy = pts[-1]
    F.part('flesh', '#b05a98', bevel=2).ell(hx_ + 3, hy, 3, 3)          # 빨판
    F.part('flesh', '#2a0a20', flat=True).ell(hx_ + 4, hy, 1.4, 1.8)
    for a in range(6):
        t = a * math.pi / 3
        F.px(hx_ + 4 + math.cos(t) * 2, hy + math.sin(t) * 2, '#ffd0e8')
    F.glow(hx_ + 4, hy, 4, '#ff70b0', 0.3)
    return F.render()


# ======================================================== 포자갉이 (포자 굴) 33x26
def sporegnaw(f):
    F = Fig(33, 26)
    b, w = BOB[f], WALK[f]
    if f == 6:
        F.part('leaf', '#3a5a2e').ell(16, 23, 11, 2.6)
        F.part('flesh', '#3aa098').ell(13, 21, 5, 2.4)
        return F.render()
    y0 = 7 + b + (4 if f == 5 else 0)
    jaw = 3 if f == 4 else 1 if f == 1 else 0
    # 다리 — 두꺼비처럼 짧고 굵다
    for k, lx in enumerate((8, 13, 20, 25)):
        sw = w * (1 if k % 2 else -1) * 2
        F.part('leaf', '#4a6e34').cap(lx, y0 + 10, lx + sw, 24, 2, 1.8)
    # 몸 · 머리
    F.part('leaf', '#5e8a40', bevel=4).ell(16, y0 + 9, 11, 6)
    F.part('leaf', '#6a9a48', bevel=3).ell(26, y0 + 9, 5, 4.4)
    F.part('cloth', '#1e1410', flat=True).poly([(27, y0 + 10), (31, y0 + 9 + jaw * 0.3), (31, y0 + 11 + jaw), (27, y0 + 12)])
    for k in range(3):
        F.px(28 + k, y0 + 10, '#f0ead0'); F.px(28 + k, y0 + 11 + jaw, '#f0ead0')
    F.px(26, y0 + 7, '#ffe070'); F.px(27, y0 + 7, '#2a1a0a')
    # 등의 버섯갓 — 반점 · 주름
    F.part('flesh', '#3ab0a8', bevel=3).ell(14, y0 + 3, 9, 4.6)
    F.part('flesh', '#2a7a74').box(6, y0 + 5, 17, 2)
    for (x, y) in ((10, y0 + 1), (15, y0), (19, y0 + 2), (12, y0 + 3)):
        F.part('glow', '#d8fff8', glow=True).dot(x, y)
    if f in (0, 1):                                # 포자가 피어오른다
        F.px(9, y0 - 3 - f, '#b8f8e8', 180); F.px(18, y0 - 4 + f, '#b8f8e8', 160)
    return F.render()


# ======================================================== 떠도는 낱장 (가라앉은 유적) 26x28
def pagewisp(f):
    F = Fig(26, 28)
    if f == 6:
        for (x, y, a) in ((7, 25, 0.2), (13, 26, -0.1), (19, 25, 0.3)):
            F.part('paper', '#d8ccaa', seed=x).poly([(x - 3, y - 1), (x + 3, y - 1 + a * 4), (x + 3, y + 1), (x - 3, y + 1)])
        return F.render()
    b = [0, 1, 0, 1, 0, 0, 0][f]
    cx, cy = 13, 15 + b + (5 if f == 5 else 0)
    spin = f * 0.55
    core = 3.2 if f != 4 else 4
    F.glow(cx, cy, 8 if f != 5 else 4, '#6ad8ff', 0.4)
    # 뒤로 도는 낱장(어둡게) → 핵 → 앞으로 도는 낱장
    pages = []
    for k in range(6):
        t = spin + k * math.pi / 3
        px_, py = cx + math.cos(t) * 6.5, cy + math.sin(t) * 6
        pages.append((math.sin(t), px_, py, t, k))
    pages.sort()
    for front in (False, True):
        if front:
            F.part('glow', '#7ae0ff', glow=True).ell(cx, cy, core, core)
            F.part('glow', '#f0fcff', glow=True).ell(cx - 0.5, cy - 0.5, core * 0.45, core * 0.45)
        for (sv, px_, py, t, k) in pages:
            if (sv > 0) != front:
                continue
            a = t * 0.5 + k
            c, s_ = math.cos(a) * 3.8, math.sin(a) * 3.8
            F.part('paper', '#e8dcb8' if front else '#a89c80', seed=k, bevel=1.5).poly([(px_ - c - s_ * 0.6, py - s_ * 0.6 + c * 0.6), (px_ + c - s_ * 0.6, py + s_ * 0.6 * 0 + c * 0.6), (px_ + c + s_ * 0.5, py + s_ * 0.5), (px_ - c + s_ * 0.5, py - s_ * 0.5)])
            F.px(px_ - 1, py, '#4a3a2a', 160); F.px(px_ + 1, py + 1, '#4a3a2a', 160)
    if f == 4:                                     # 글자가 튀어나간다
        for k in range(3):
            F.px(cx + 8 + k, cy - 2 + k, '#bfefff')
    return F.render()


# ======================================================== 서리 석상 (서리 밑 석실) 32x46
def froststatue(f):
    F = Fig(32, 46)
    if f == 6:
        for (x, y, r) in ((8, 43, 3.6), (15, 44, 3), (22, 43, 4), (27, 44, 2.4), (12, 40, 2.4)):
            F.part('stone', '#8a96a2', seed=x).ell(x, y, r, r * 0.65)
        return F.render()
    sink = 3 if f == 5 else 0
    y0 = 3 + sink
    reach = f == 4
    step = WALK[f]
    # 접힌 날개(뒤)
    F.part('stone', '#7a8692', bevel=3, seed=2).poly([(5, y0 + 8), (11, y0 + 4), (12, y0 + 30), (7, y0 + 34), (3, y0 + 24)])
    for k in range(4):
        F.line(5 + k, y0 + 12 + k * 5, 10, y0 + 10 + k * 5, '#5a6672', 200)
    # 받침돌 · 옷자락
    F.part('stone', '#6a7682', bevel=2, seed=5).box(8, 40 + sink, 18, 4, 1)
    F.part('stone', '#a0acb8', bevel=4, seed=7).poly([(11, y0 + 10), (21, y0 + 10), (24, 41 + sink - step), (8, 41 + sink + step)])
    for x in (13, 16, 19, 22):
        F.line(x - 1, y0 + 18, x - 1 + (x - 16) * 0.2, 40 + sink, '#7a8692', 160)   # 옷 주름
    # 머리 · 두건 · 얼굴을 가린 손(보통) / 뻗은 손(공격)
    F.part('stone', '#b0bcc6', bevel=3, seed=9).ell(16, y0 + 7, 5, 5.6)
    F.part('stone', '#949fac', bevel=2, seed=3).poly([(10, y0 + 9), (12, y0 + 1), (16, y0 - 1), (20, y0 + 1), (22, y0 + 9), (20, y0 + 6), (12, y0 + 6)])
    if reach:
        F.part('stone', '#a8b4be', seed=11).cap(20, y0 + 14, 27, y0 + 12, 1.8, 1.4)
        F.part('stone', '#b8c4ce').ell(27, y0 + 12, 1.6, 1.8)
        F.px(15, y0 + 7, '#9fe8ff'); F.px(17, y0 + 7, '#9fe8ff'); F.glow(16, y0 + 7, 3, '#8fe0ff', 0.5)
    else:
        F.part('stone', '#a8b4be', seed=11).cap(12, y0 + 16, 15, y0 + 8, 1.8, 1.6)
        F.part('stone', '#a8b4be', seed=12).cap(20, y0 + 16, 17, y0 + 8, 1.8, 1.6)
    # 서리 — 어깨 · 머리에 눈, 고드름
    for x in range(12, 21):
        if (x * 7) % 3:
            F.px(x, y0 - (1 if 14 < x < 18 else 0), '#f4fbff')
    for x in (11, 21):
        F.part('ice', '#d8f2ff', bevel=1).poly([(x - 1, y0 + 10), (x + 1, y0 + 10), (x, y0 + 14)])
    if f == 5:
        F.line(12, y0 + 12, 18, y0 + 30, '#3a4652'); F.line(18, y0 + 30, 15, y0 + 38, '#3a4652')
    return F.render()


# ======================================================== 갈림길 그림자 (겹친 길) 26x44
def mazeshade(f):
    F = Fig(26, 44)
    if f == 6:
        F.part('cloth', '#1e1a30').ell(13, 41, 9, 2)
        F.px(11, 40, '#ffd060'); F.px(15, 40, '#6ac8ff')
        return F.render()
    b = [0, 1, 1, 0, 0, 0, 0][f]
    y0 = 3 + b + (6 if f == 5 else 0)
    sway = [0, 1, -1, 1, 2, 0, 0][f]
    # 연기처럼 흩어지는 꼬리 — 바닥에서 갈라진다
    for k in range(5):
        x = 6 + k * 3.6 + math.sin(f + k) * 1.2
        F.part('cloth', '#2a2444', bevel=1.5, seed=k).cap(x, 30 + (k % 2) * 2, x + math.sin(f * 1.3 + k) * 2, 41, 1.6, 0.6)
    # 망토 몸 — 긴 물방울꼴, 두건
    F.part('cloth', '#3a3260', bevel=4).poly([(13 + sway, y0), (19 + sway, y0 + 8), (21, y0 + 22), (20, 33), (6, 33), (5, y0 + 22), (7 + sway, y0 + 8)])
    F.part('cloth', '#100c1c', flat=True).ell(13 + sway, y0 + 9, 4, 4.6)
    F.px(11 + sway, y0 + 9, '#ffd060'); F.px(15 + sway, y0 + 8, '#6ac8ff')      # 짝 안 맞는 눈
    F.glow(11 + sway, y0 + 9, 3, '#ffc040', 0.35); F.glow(15 + sway, y0 + 8, 3, '#6ac8ff', 0.35)
    # 몸을 가로지르는 갈림길 무늬
    F.line(9, y0 + 18, 13, y0 + 22, '#6a5aa0', 170); F.line(13, y0 + 22, 17, y0 + 18, '#6a5aa0', 170); F.line(13, y0 + 22, 13, y0 + 28, '#6a5aa0', 170)
    if f == 4:                                     # 그림자 손이 앞으로
        F.part('cloth', '#2a2444').cap(18, y0 + 16, 22, y0 + 14, 1.4, 0.8)
        for k in range(3):
            F.px(22, y0 + 12 + k * 2, '#8a7ad8')
    return F.render()


# ======================================================== 빈 껍질 (발 디딜 곳 없는 방) 26x34
def hollowling(f):
    F = Fig(26, 34)
    if f == 6:
        F.part('chitin', '#8a7044').ell(13, 31, 9, 2)
        F.part('chitin', '#6a5434').ell(9, 30, 3, 1.6)
        return F.render()
    sink = [0, 0, 0, 0, 0, 6, 0][f]
    y0 = 4 + BOB[f] + sink
    w = WALK[f]
    # 가는 마디 다리 여섯(뒤 셋은 어둡게)
    for k in range(3):
        lx = 8 + k * 5
        F.part('chitin', '#5a4628').cap(lx + 1, y0 + 18, lx - 2 + w * (1 if k % 2 else -1) * 1.5, 32, 0.7)
    # 몸 — 매미 허물: 등이 세로로 갈라져 속이 비었다
    F.part('chitin', '#a88a54', bevel=3).ell(13, y0 + 13, 7, 9)
    F.part('chitin', '#b89a60', bevel=2).ell(13, y0 + 3, 5, 4)
    F.part('cloth', '#1a120a', flat=True).poly([(12, y0 + 2), (14, y0 + 2), (15, y0 + 14), (13, y0 + 20), (11, y0 + 14)])   # 갈라진 틈
    for k in range(4):
        F.line(7, y0 + 9 + k * 3, 19, y0 + 9 + k * 3, '#7a6034', 140)   # 마디
    F.px(10, y0 + 3, '#ffe070'); F.px(16, y0 + 3, '#ffe070'); F.glow(13, y0 + 3, 4, '#ffd050', 0.3)
    for k in range(3):
        lx = 10 + k * 4
        F.part('chitin', '#8a6e40').cap(lx, y0 + 19, lx + 2 + w * (-1 if k % 2 else 1) * 1.5, 32, 0.8)
    if f == 4:                                     # 앞다리 둘을 쳐든다
        F.part('chitin', '#8a6e40').cap(18, y0 + 10, 22, y0 + 3, 0.9)
        F.part('chitin', '#8a6e40').cap(17, y0 + 13, 22, y0 + 9, 0.9)
    return F.render()


# ======================================================== 둥지 알주머니 (부패한 둥지) 26x28
def nestsac(f):
    F = Fig(26, 28)
    if f >= 5:
        F.part('flesh', '#5a2a52').poly([(4, 27), (22, 27), (19, 22), (7, 22)])
        for x in (8, 12, 16, 19):
            F.part('flesh', '#8a4a7a').poly([(x, 23), (x + 1, 17 + (x % 3)), (x + 2, 23)])
        if f == 5:
            F.part('glow', '#c8ff8a', glow=True).ell(13, 21, 2, 1.5); F.glow(13, 21, 5, '#b0f070', 0.5)
        return F.render()
    pulse = [0, 1, 0.5, 1.5, 2.2][f]
    # 둥지 덩굴 받침
    F.part('flesh', '#4a2246').poly([(3, 27), (23, 27), (20, 21), (6, 21)])
    # 알 셋 — 가운데 큰 알이 뛴다
    for (x, y, r) in ((7, 19, 4.6), (19, 19, 4.4)):
        F.part('flesh', '#a05a90', bevel=3, seed=x).ell(x, y, r, r)
        F.px(x - 1, y - 2, '#f0b8e0')
    R = 7 + pulse * 0.5
    F.part('flesh', '#b8609c', bevel=4).ell(13, 15, R, R + 0.5)
    F.part('glow', '#e890d0', glow=True).ell(13, 15, R * 0.45, R * 0.5)
    F.part('flesh', '#4a1a40', flat=True).ell(13, 16, 1.8, 2.6)               # 속에서 꿈틀대는 것
    for (x0, y_0, x1, y_1) in ((8, 11, 11, 18), (18, 10, 16, 19), (10, 21, 16, 21)):
        F.line(x0, y_0, x1, y_1, '#5a1a4a', 210)
    F.px(9, 10, '#fff0fa'); F.px(10, 9, '#fff0fa')
    F.glow(13, 15, 9, '#e070c0', 0.15 + pulse * 0.08)
    return F.render()


# ======================================================== 덩굴채찍 (정글) 28x34 — 두 팔(덩굴 채찍)이 크게 휘둘린다
def vinelash(f):
    F = Fig(28, 34)
    if f == 6:
        F.part('leaf', '#2e5a26').ell(14, 31, 10, 2.4)
        F.part('leaf', '#4a8a3a').ell(10, 30, 3, 1.4); F.part('leaf', '#4a8a3a').ell(19, 30, 3, 1.4)
        return F.render()
    b, w = BOB[f], WALK[f]
    y0 = 4 + b + (4 if f == 5 else 0)
    # ★ 예전 그림은 걸음마다 팔 끝이 한두 칸만 움직였다(사용자). 팔을 어깨에서 크게 흔들고 끝은 늦게 따라온다(채찍)
    swing = [(-0.5, 0.4), (-0.3, 0.6), (-1.0, 0.9), (1.1, -1.05), (0, 0), (0.2, -0.2), (0, 0)][f]
    def arm(sx, sy, a, col, lag, back):
        L1, L2 = 6, 6
        a0 = math.pi / 2 + a                                   # 아래로 늘어진 것이 0
        ex, ey = sx + math.cos(a0) * L1, sy + math.sin(a0) * L1
        a1 = a0 + lag
        tx, ty = ex + math.cos(a1) * L2, ey + math.sin(a1) * L2
        F.part('leaf', col, bevel=1.5).cap(sx, sy, ex, ey, 1.6, 1.3)
        F.part('leaf', col, bevel=1.2).cap(ex, ey, tx, ty, 1.3, 0.6)
        F.part('leaf', '#7ac85a', bevel=1).ell(tx, ty, 1.4, 1.0, a1)          # 끝의 잎
        if not back:
            F.px(ex, ey, '#a8e070')
    # 뒷팔(어둡게) · 다리
    arm(12, y0 + 9, swing[1], '#2e6a2a', -swing[1] * 0.6 + 0.2, True)
    for side, lx in ((-1, 11), (1, 16)):
        st = w * side * 2.6
        F.part('wood', '#4a3a24').cap(lx, y0 + 18, lx + st, 32, 1.8, 1.3)
        F.part('leaf', '#3e7a32').ell(lx + st, 32, 2.2, 1)
    # 몸 — 꼬인 덩굴 줄기 · 가슴의 꽃눈 · 잎 머리
    F.part('wood', '#5a4428', bevel=3).poly([(10, y0 + 7), (18, y0 + 7), (19, y0 + 19), (9, y0 + 19)])
    for k in range(4):
        F.line(9, y0 + 9 + k * 3, 19, y0 + 7 + k * 3, '#3e7a32', 230)       # 감긴 덩굴
    F.part('leaf', '#5aa040', bevel=3).ell(14, y0 + 4, 5.4, 4.2)
    F.part('leaf', '#4a8a34').poly([(9, y0 + 3), (5, y0 - 1), (10, y0 + 1)])
    F.part('leaf', '#4a8a34').poly([(19, y0 + 3), (23, y0 - 1), (18, y0 + 1)])
    F.px(13, y0 + 4, '#ffe060'); F.px(16, y0 + 4, '#ffe060'); F.glow(14, y0 + 4, 3, '#f0e060', 0.25)
    F.part('glow', '#f070a0', glow=True).ell(14, y0 + 12, 1.4, 1.4)
    # 앞팔 — 공격 때는 앞으로 길게 채찍질
    if f == 4:
        F.part('leaf', '#4a9a3a', bevel=1.5).cap(18, y0 + 9, 23, y0 + 6, 1.6, 1.3)
        F.part('leaf', '#4a9a3a', bevel=1.2).cap(23, y0 + 6, 25, y0 + 12, 1.3, 0.6)
        F.part('leaf', '#7ac85a').ell(24.5, y0 + 12, 1.4, 1)
        F.glow(24, y0 + 10, 2, '#c8ff8a', 0.4)
    else:
        arm(17, y0 + 9, swing[0], '#4a9a3a', -swing[0] * 0.7 - 0.2, False)
    return F.render()


SHEETS = [
    ('frostbound', 30, 39, frostbound),
    ('jarhusk', 28, 28, jarhusk),
    ('cartwraith', 34, 25, cartwraith),
    ('sacling', 28, 30, sacling),
    ('ventspitter', 30, 29, ventspitter),
    ('rimeguard', 32, 44, rimeguard),
    ('sunscarab', 32, 20, sunscarab),
    ('lampthief', 30, 32, lampthief),
    ('blightleech', 41, 20, blightleech),
    ('sporegnaw', 33, 26, sporegnaw),
    ('pagewisp', 26, 28, pagewisp),
    ('froststatue', 32, 46, froststatue),
    ('mazeshade', 26, 44, mazeshade),
    ('hollowling', 26, 34, hollowling),
    ('nestsac', 26, 28, nestsac),
    ('vinelash', 28, 34, vinelash),
]


def pad_of(sheet, fw, fh):
    px = sheet.load()
    W, H = fw * S, fh * S
    bottom, left, right = -1, W, -1
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 10:
                bottom = max(bottom, y); left = min(left, x); right = max(right, x)
    return round(fh - bottom / S - 1, 3), round(((left + right + 1) / 2 - W / 2) / S, 3)


def main(only=None):
    os.makedirs(OUT, exist_ok=True)
    with open(MANIFEST, encoding='utf-8') as fp:
        man = json.load(fp)
    sheets = man['characters']['sheets']
    for name, fw, fh, fn in SHEETS:
        if only and name not in only:
            continue
        sheet = Image.new('RGBA', (FRAMES * fw * S, fh * S), (0, 0, 0, 0))
        for f in range(FRAMES):
            fr = fn(f)
            bb = fr.getbbox()
            if bb and (bb[0] < 1 or bb[2] > fw - 1 or bb[1] < 1):
                raise SystemExit('%s 프레임 %d 이 칸 벽에 닿았다: %s' % (name, f, bb))
            sheet.paste(fr.resize((fw * S, fh * S), Image.NEAREST), (f * fw * S, 0))
        p = os.path.normpath(os.path.join(OUT, name + '.png'))
        sheet.save(p)
        foot, side = pad_of(sheet, fw, fh)
        sheets[name] = {**sheets.get(name, {}), 'file': 'char/%s.png' % name, 'frameW': fw, 'frameH': fh, 'count': FRAMES, 'foot': foot, 'side': side}
        print('  %-16s %dx%d  foot %.2f side %.2f' % (name + '.png', fw, fh, foot, side))
    with open(MANIFEST, 'w', encoding='utf-8') as fp:
        json.dump(man, fp, ensure_ascii=False, indent=2)
        fp.write('\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:] or None))
