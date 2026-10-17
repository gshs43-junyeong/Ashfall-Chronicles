#!/usr/bin/env python3
"""작은 몬스터 그림의 붓 — 부위(part)를 모양으로 칠하고, 부위마다 빛 · 재질 · 외곽선을 한 번에 입힌다.

■ 왜

  예전 붓(mkruinmobs.Canvas)은 단색 사각형 · 타원을 겹쳐 칠하고 맨 바깥에 검은 테 한 겹만 둘렀다.
  그래서 부위가 납작한 색 덩어리로 보였다(사용자: "저퀄리티 — 디테일 있게"). 손으로 칸마다 명암을
  찍으면 7장 프레임마다 어긋나므로, 부위의 **모양에서 명암을 계산**한다.

■ 어떻게

  1. 부위마다 모양(타원 · 다각형 · 가는 캡슐 · 둥근 상자)을 그 부위의 '전체 마스크'로 칠한다 —
     앞 부위에 가려진 칸도 마스크에는 남는다(명암은 가려지기 전 모양을 보고 정해야 둥글게 읽힌다).
  2. 마스크 안 거리장(가장자리까지 몇 칸)의 기울기 = 겉면 기울기. 빛은 왼쪽 위에서.
     가장자리에 가까울수록 기울기가 크게 먹혀 부위가 둥글게 부푼다(bevel).
  3. 밝기를 다섯 단(그늘 깊음 · 그늘 · 바탕 · 밝음 · 반사)으로 끊는다 — 픽셀아트는 매끈한 그러데이션보다
     단이 읽혀야 한다. 어두운 단은 푸르스름하게, 밝은 단은 따뜻하게 색을 튼다(납빛 명암 방지).
  4. 재질 결 — stone(점박이) · cloth(세로 주름) · metal(가로 반사 띠) · chitin(마디 반사) · flesh(얼룩) ·
     ice(면 · 반짝) · paper(글줄) · leaf(잎맥) · glow(빛 — 명암 없이 밝고 둘레에 번짐).
  5. 앞 부위가 뒤 부위 위에 드리우는 그늘(오른쪽 아래로 한 칸) · 부위 사이 안쪽 선 · 바깥 테(이웃 부위 색을 어둡게).

사용: from pxfig import Fig — 몬스터 함수가 Fig 에 부위를 쌓고 fig.render() 가 RGBA Image 를 돌려준다.
"""
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
