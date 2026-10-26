#!/usr/bin/env python3
"""리그 보스 그림 — 몸을 한 장짜리 시트가 아니라 부위 조각으로 굽는다(v1.1.5 보스 개편 · docs/update/v1.1.5-boss-plan.md).

■ 왜

  20배 크기 보스를 시트 한 장으로 구우면 수십 MB 이고(h206), 장 넘김 몇 장으로는 "머리만 돌리는" 모션이 된다.
  그래서 부위(껍데기 · 팔 마디 · 손 · 거품)를 작은 조각으로 굽고, 게임이 매 프레임 자리 · 회전 · 늘임을 계산해 맞춘다
  (game/boss-pool-art 따위). 붓은 가장 최근 몬스터 커밋(3010ec9)의 부위 명암 붓 `Fig`(tools/mkruinmobs.py)를 그대로 쓴다.

■ 규칙

  설계 좌표(작은 칸)로 적고 K(4)배 해상도에서 다시 칠한다(ZFig) — 몬스터와 같은 붓이되 게임 1px = 그림 1px(manifest scale 1).
  늘려 붙인 확대가 아니라서 크게 그려도 명암 · 결이 뭉개지지 않는다 · 칸 벽에 닿으면 멈춘다.
  보스 몸(히트 상자를 가진 부위)은 bosses 시트(`<id>`)로, 나머지 조각은 `<id>_parts` 로 — 쓰러지는 장은 몸 시트 끝(`death`).

사용법:  python3 tools/mkbossrig.py [보스 id …]   (그다음 python3 tools/sync-manifest.py)
"""
import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mkruinmobs import Fig  # noqa: E402  — 부위 명암 붓(가장 최근 몬스터 그림과 같은 붓)

K = 4      # 설계 칸 하나 = 게임 4px — 부위 명암은 그 해상도로 다시 칠한다(몬스터와 같은 결 · 더 고운 결)
OUT = os.path.join(HERE, '..', 'play', 'assets', 'boss')
MANIFEST = os.path.join(HERE, '..', 'play', 'assets', 'manifest.json')


class ZFig(Fig):
    """설계 좌표(작은 칸)로 적고, K 배 해상도에서 칠한다 — 확대가 아니라 다시 칠하기라 명암 · 결이 곱다"""
    def __init__(self, w, h):
        super().__init__(w * K, h * K)

    def part(self, mat, col, glow=False, bevel=None, seed=0, flat=False):
        return _ZPen(super().part(mat, col, glow, None if bevel is None else bevel * K, seed, flat))

    def px(self, x, y, col, a=255):
        for j in range(K):
            for i in range(K):
                Fig.px(self, x * K + i, y * K + j, col, a)

    def line(self, x0, y0, x1, y1, col, a=255):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * K) + 1
        for i in range(n + 1):
            t = i / n
            x, y = (x0 + (x1 - x0) * t) * K, (y0 + (y1 - y0) * t) * K
            for jy in range(K // 2 + 1):
                for jx in range(K // 2 + 1):
                    Fig.px(self, x + jx, y + jy, col, a)

    def glow(self, x, y, r, col, a=0.45):
        super().glow(x * K, y * K, r * K, col, a)


class _ZPen:
    def __init__(self, pen):
        self.p = pen

    def ell(self, cx, cy, rx, ry, rot=0.0):
        self.p.ell(cx * K, cy * K, rx * K, ry * K, rot); return self

    def poly(self, pts):
        self.p.poly([(x * K, y * K) for x, y in pts]); return self

    def cap(self, x0, y0, x1, y1, r0, r1=None):
        self.p.cap(x0 * K, y0 * K, x1 * K, y1 * K, r0 * K, None if r1 is None else r1 * K); return self

    def box(self, x, y, w, h, r=0):
        self.p.box(x * K, y * K, w * K, h * K, r * K); return self


# ===== 잿물 군체(king_slime 자리) — 굴 바닥 잿물 웅덩이가 몸, 옛 광부 투구 껍데기만 떠 있다 =====
SLUDGE = '#4a4541'        # 재와 기름이 엉긴 잿물
SLUDGE_D = '#2f2b29'
RUST = '#7a5a40'          # 녹슨 투구
EMBER = '#ffb050'


def bitten(cx, cy, rx, ry, bites, n=64):
    """타원 둘레 점 — bites[(각, 폭, 깊이)] 자리는 들쭉날쭉 뜯겨 나간다(깨진 쇠 테두리)"""
    pts = []
    for k in range(n):
        a = k / n * math.tau
        r = 1.0
        for (ba, bw, bd) in bites:
            da = math.atan2(math.sin(a - ba), math.cos(a - ba))
            if abs(da) < bw:
                jag = 0.55 + 0.45 * ((k * 7) % 3) / 2                  # 톱니 — 깊이가 고르지 않게
                r = min(r, 1 - bd * jag * (1 - (abs(da) / bw) ** 3))
        pts.append((cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r))
    return pts


def fine(F, a, b, col, alpha=255):
    """그림 해상도 1px 선(설계 좌표) — ZFig.line 은 3px 라 가는 금 테두리가 속불을 덮었다"""
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * K) + 1
    for i in range(n + 1):
        t = i / n
        Fig.px(F, (a[0] + (b[0] - a[0]) * t) * K, (a[1] + (b[1] - a[1]) * t) * K, col, alpha)


def _organic(pts, rnd, depth=3, amp=0.22):
    """금의 길 — 마디마다 가운데를 옆으로 밀어 잘게 꺾는다(곧은 토막이 번개처럼 보였다)"""
    out = [pts[0]]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        seg = [(x0, y0), (x1, y1)]
        for d in range(depth):
            nxt = [seg[0]]
            for (ax, ay), (bx, by) in zip(seg, seg[1:]):
                L = math.hypot(bx - ax, by - ay) or 1
                off = (rnd() - 0.5) * 2 * L * amp / (1 + d * 0.4)
                mx, my = (ax + bx) / 2 - (by - ay) / L * off, (ay + by) / 2 + (bx - ax) / L * off
                nxt += [(mx, my), (bx, by)]
            seg = nxt
        out += seg[1:]
    return out


def _wedge(F, path, w0, w1, hot, rnd):
    """속불 쐐기 — 굵기가 w0 에서 w1 로 가늘어지고(마디마다 조금씩 달라진다) · 그늘 쪽 날은 어둡게 · 깨진 날 몇 칸은 밝게"""
    n = len(path)
    L, R = [], []
    for i, (x, y) in enumerate(path):
        x2, y2 = path[min(i + 1, n - 1)]; x1, y1 = path[max(i - 1, 0)]
        dx, dy = x2 - x1, y2 - y1; d = math.hypot(dx, dy) or 1
        u = i / max(1, n - 1)
        ww = (w0 + (w1 - w0) * u) * (0.75 + 0.5 * rnd())
        if i == n - 1:
            ww = 0.05
        L.append((x - dy / d * ww, y + dx / d * ww)); R.append((x + dy / d * ww, y - dx / d * ww))
    F.part('glow', hot, glow=True).poly(L + R[::-1])
    for (a, b) in zip(R, R[1:]):
        fine(F, a, b, '#1c140e')
    for k, (a, b) in enumerate(zip(L, L[1:])):
        if rnd() < 0.35:
            fine(F, a, b, '#d8a874', 220)


def crack(F, pts, w, hot):
    """빛이 새는 금 — 잘게 꺾인 길을 따라 가늘어지는 속불 쐐기 + 가는 곁금 한두 갈래.
       ★ 곧은 토막 몇 개로 그으면 번개 · 직선처럼 보였다(사용자 지적 2026-10-24) — 길은 _organic 이 꺾고, 난수는 점에서 씨를 받아 장마다 같다"""
    sd = [int(abs(x * 131 + y * 71)) % 2147483647 + 1 for (x, y) in pts]
    state = [sum(sd) % 2147483647 or 7]

    def rnd():
        state[0] = state[0] * 48271 % 2147483647
        return state[0] / 2147483647
    path = _organic(pts, rnd)
    _wedge(F, path, w, w * 0.3, hot, rnd)
    F.glow(pts[0][0], pts[0][1], 2.5, hot, 0.22)
    total = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path, path[1:]))
    for k in range(1 + (total > 10)):                     # 곁금 — 길 중간에서 비스듬히 갈라져 금방 사라진다
        i = int(len(path) * (0.25 + 0.45 * rnd()))
        x, y = path[i]; x2, y2 = path[min(i + 1, len(path) - 1)]
        a = math.atan2(y2 - y, x2 - x) + (1 if rnd() < 0.5 else -1) * (0.5 + 0.6 * rnd())
        ln = total * (0.18 + 0.15 * rnd())
        tip = (x + math.cos(a) * ln, y + math.sin(a) * ln)
        mid = (x + math.cos(a) * ln * 0.5 + (rnd() - 0.5) * ln * 0.3, y + math.sin(a) * ln * 0.5 + (rnd() - 0.5) * ln * 0.3)
        _wedge(F, _organic([(x, y), mid, tip], rnd, 2, 0.25), w * 0.45, w * 0.1, hot, rnd)


def pool_shell(f):
    """몸 시트 8장 — 0·1 1막(멀쩡한 투구) · 2·3 2막(뜯겨 나간 갓 · 빛 새는 금 · 흘러내리는 잿물 · 금 간 유리)
       · 4·5 3막(갓 절반이 날아가 속불이 드러남 · 휜 챙 · 깨진 등불) · 6·7 쓰러짐(잿물에 잠긴다). 짝수 장은 숨 · 홀수 장은 깜빡"""
    W, H = 64, 56
    F = ZFig(W, H)
    cx = W // 2
    st = min(2, f // 2) if f < 6 else 2                # 손상 단계
    sink = 0 if f < 6 else (6 if f == 6 else 13)
    b = f % 2 if f < 6 else 0
    base = H - 6
    hot = ('#ff9a40', '#ff7a30', '#ff5a24')[st]
    # 잿물 몸 — 단계가 오를수록 부풀고 불씨가 많다
    bh = (11 + st * 0.8) - sink * 0.55
    F.part('flesh', SLUDGE, bevel=5).ell(cx, base - bh + 2 - b, 25 + st + sink * 0.3, bh)
    F.part('flesh', SLUDGE_D, bevel=3).ell(cx, base, 28 + st, 4)
    for k, (ex, ey) in enumerate(((-18, -3), (16, -2), (3, -1), (-8, -6), (11, -7), (-21, -1))[:3 + st * 2]):
        F.px(cx + ex, base + ey, '#ff8a40'); F.glow(cx + ex, base + ey, 2 + st * 0.6, '#ff8a40', 0.2)
    y0 = base - 40 + sink + b
    dy0 = y0 + 17                                       # 갓 가운데
    # 속불 — 뜯겨 나간 자리 너머로 보이는 몸속(갓보다 먼저 칠해 갓이 덮는다)
    if st:
        F.part('flesh', '#6a5446', flat=True).ell(cx, dy0 + 1.5, 16, 10.5)          # 갓 속 — 잿물 속살(뜯긴 구멍으로만 보인다 · 명암을 넣으면 배경처럼 꺼졌다)
        F.part('flesh', '#4a3a30', flat=True).ell(cx, dy0 - 4, 15, 5)        # 위 테두리 밑 그늘
        for (gx, gy, gr) in ((-9, -4, 2.2 + st), (8, -6, 1.6 * (st == 2)))[:st]:   # 깊은 곳의 불씨
            if gr:
                F.part('glow', hot, glow=True).ell(cx + gx, dy0 + gy, gr, gr * 0.75)
                F.part('glow', '#ffe0a0', glow=True).ell(cx + gx - 0.4, dy0 + gy - 0.3, gr * 0.4, gr * 0.3)
    # 갓 — 뜯긴 자리(bites: 각 · 폭 · 깊이)
    bites = [] if st == 0 else [(-2.4, 0.42, 0.55)] if st == 1 else [(-2.3, 0.62, 0.8), (-0.75, 0.38, 0.55)]
    dome = bitten(cx, dy0, 17, 12, bites)
    F.part('stone', RUST, bevel=5).poly(dome)
    for (a, b2) in zip(dome, dome[1:] + dome[:1]):     # 뜯긴 쇠 단면 — 두께가 보이는 밝은 날
        ra = math.hypot((a[0] - cx) / 17, (a[1] - dy0) / 12)
        if ra < 0.93:
            fine(F, a, b2, '#d8b088')
            fine(F, (a[0] + 0.25, a[1] + 0.3), (b2[0] + 0.25, b2[1] + 0.3), '#5a4030')
    if st < 2:
        F.part('stone', '#9a7650', bevel=2).ell(cx - 6 + st * 9, y0 + 11 + st * 2, 6 - st * 2, 3.2 - st, -0.3)   # 빛 받는 면
    # 금 — 뜯긴 자리에서 챙으로 뻗는다(속불이 샌다)
    if st >= 1:
        crack(F, [(cx - 8, dy0 - 3), (cx - 6.5, dy0 - 1), (cx - 7.5, dy0 + 1), (cx - 5.5, dy0 + 3), (cx - 6.5, dy0 + 5.5)], 0.45, hot)
    if st >= 2:
        crack(F, [(cx + 6, dy0 - 5), (cx + 7.5, dy0 - 2.5), (cx + 6, dy0), (cx + 8, dy0 + 2.5), (cx + 7, dy0 + 5.5)], 0.5, hot)
    # 갓 둘레 띠 · 챙 — 3막은 오른쪽 챙이 휘어 처진다
    droop = 3 if st == 2 else 0
    F.part('metal', '#4e3c2c', bevel=1.2).poly([(cx - 17, y0 + 22), (cx + 17, y0 + 22 + droop * 0.5), (cx + 17, y0 + 25 + droop * 0.5), (cx - 17, y0 + 25)])
    F.part('metal', '#5e4632', bevel=2).poly([(cx - 27, y0 + 27), (cx - 18, y0 + 24), (cx + 2, y0 + 23.6), (cx + 18, y0 + 24 + droop * 0.4),
                                             (cx + 27, y0 + 27 + droop), (cx + 26, y0 + 30 + droop), (cx + 10, y0 + 30.4), (cx - 10, y0 + 30.4), (cx - 26, y0 + 30)])
    if st == 2:                                         # 챙 끝이 꺾여 이가 빠졌다
        F.part('metal', '#5e4632', bevel=1).poly([(cx + 24, y0 + 28 + droop), (cx + 30, y0 + 31 + droop), (cx + 27, y0 + 32 + droop)])
    for k, rx in enumerate((-14, -7, 7, 14)):
        if st and k in ((1,) if st == 1 else (1, 3)):
            F.px(cx + rx, y0 + 23, '#2a1e14')           # 빠진 대갈못 구멍
        else:
            F.px(cx + rx, y0 + 23, '#c8a070')
    # 흘러내리는 잿물 — 금과 뜯긴 자리에서 챙을 넘어 떨어진다
    if st >= 1:
        for (x0, ln) in (((-6.5, 4),) if st == 1 else ((-6.5, 5), (7, 4), (-14, 3))):   # 금에서 나와 챙 끝을 넘어 방울진다
            ey = y0 + 29 + (droop if x0 > 0 else 0)
            F.part('flesh', SLUDGE, bevel=1.2).cap(cx + x0, ey - 1, cx + x0 + 0.3, ey + ln, 1.1, 0.7)
            F.part('flesh', SLUDGE, bevel=1.2).ell(cx + x0 + 0.3, ey + ln + 1 + (f % 2) * 0.6, 1.3, 1.7)
    # 등불 — 1막 온전 · 2막 유리에 금 · 3막 유리가 깨져 불꽃이 드러난다
    F.part('metal', '#3e342c', bevel=1.5).poly([(cx - 5, y0 + 6), (cx + 5, y0 + 6 + (1 if st == 2 else 0)), (cx + 5, y0 + 14), (cx - 5, y0 + 14)])
    lamp = ('#ffd27a', '#ffb060', '#ff5a3a')[st]
    if f >= 7:
        F.part('glow', '#6a3a2a', glow=False).box(cx - 3, y0 + 8, 6, 4, 1)
    elif st < 2:
        F.part('glow', lamp, glow=True).box(cx - 3, y0 + 8, 6, 4, 1)
        if st == 1:
            F.line(cx - 2, y0 + 8, cx + 2, y0 + 11.5, '#6a3a1a')
            F.line(cx + 2, y0 + 8.5, cx + 1, y0 + 10, '#6a3a1a')
        F.glow(cx, y0 + 10, 8, lamp, 0.4)
    else:
        F.part('glow', '#2a1610', glow=True).box(cx - 3, y0 + 8, 6, 4, 1)          # 빈 등불 속
        F.part('glow', '#ff7a30', glow=True).poly([(cx - 2, y0 + 12), (cx, y0 + 6.5 - (f % 2)), (cx + 2, y0 + 12)])
        F.part('glow', '#ffd060', glow=True).poly([(cx - 1, y0 + 12), (cx, y0 + 9 - (f % 2)), (cx + 1, y0 + 12)])
        for (gx, gy) in ((-3, 8), (3, 9), (-2, 12)):                             # 남은 유리 조각
            F.px(cx + gx, y0 + gy, '#e8d0a0')
        F.glow(cx, y0 + 9, 10, '#ff6a30', 0.45)
    F.part('stone', '#77706a', bevel=1.5).ell(cx + 10, y0 + 14, 3.4, 2.2, -0.3) if st < 2 else None
    # 챙 밑 눈 — 단계마다 좁아지고 붉어진다(1막 둥글게 · 2막 가늘게 노려봄 · 3막 크게 이글거림)
    eye = (EMBER, '#ff7a3a', '#ff4a2a')[st]
    if sink == 0:
        for k, ex in enumerate((-9, 9)):
            ey = y0 + 32 + droop * (k == 1) * 0.6
            if f in (1, 3, 5):
                F.line(cx + ex - 2, ey, cx + ex + 2, ey, eye)
            elif st == 1:
                F.part('glow', eye, glow=True).ell(cx + ex, ey + 0.3, 2.8, 1.1, 0.25 if ex < 0 else -0.25)
                F.glow(cx + ex, ey, 5, eye, 0.36)
            else:
                F.part('glow', eye, glow=True).ell(cx + ex, ey, 2.6 + st * 0.4, 1.8 + st * 0.3)
                F.px(cx + ex - 1, ey - 1, '#fff2c0')
                F.glow(cx + ex, ey, 5 + st * 2, eye, 0.32 + st * 0.08)
    if sink:                                            # 쓰러질 때 투구를 덮는 잿물 테
        F.part('flesh', SLUDGE, bevel=3).ell(cx, base - 4, 27, 3 + sink * 0.25)
    return F.render()


def pool_parts(f):
    """조각 10장 — 0·1·2 팔 마디 · 3 손(곡괭이 머리 발톱) · 4 거품 · 5 튐(왕관 물보라)
       · 6 잿물 결(팔 · 기둥 · 웅덩이를 칠하는 무늬 — 칸을 꽉 채운다) · 7 곡괭이 머리 · 8 휜 레일 토막 · 9 불씨 박힌 돌(팔에 박힌 잡동사니)"""
    F = ZFig(30, 30)
    if f == 0:
        F.part('flesh', SLUDGE, bevel=4).ell(15, 15, 11, 10)
        F.part('stone', '#6e6862', bevel=1.5).ell(10, 11, 3, 2)
        F.px(19, 18, EMBER); F.glow(19, 18, 2, EMBER, 0.3)
    elif f == 1:
        F.part('flesh', SLUDGE, bevel=3).ell(15, 15, 9, 8.5)
        F.part('metal', '#8a8a92', bevel=1.2).poly([(8, 9), (14, 12), (12, 14), (6, 11)])
        F.part('wood', '#6a4a2a', bevel=1).cap(13, 13, 18, 19, 1.2, 1.0)
    elif f == 2:
        F.part('flesh', SLUDGE_D, bevel=4).ell(15, 15, 12.5, 11)
        F.part('metal', '#6a6058', bevel=1.2).box(6, 13, 18, 3, 1)
        F.px(9, 14, '#a89a88'); F.px(20, 14, '#a89a88')
    elif f == 3:
        F.part('flesh', SLUDGE, bevel=4).ell(13, 17, 9, 8)
        for a in (-0.9, -0.3, 0.35):
            x1, y1 = 15 + math.cos(a) * 13, 17 + math.sin(a) * 13
            F.part('metal', '#8a7a68', bevel=1.2).cap(17, 17, x1, y1, 2.2, 0.6)
        F.part('stone', '#6e6862', bevel=1.2).ell(9, 14, 3, 2)
    elif f == 4:
        F.part('flesh', '#5a544e', bevel=3).ell(15, 15, 6, 6)
        F.px(13, 12, '#c8bfb4'); F.px(12, 13, '#c8bfb4')
    elif f == 5:
        for k in range(7):
            a = -math.pi + (k + 0.5) / 7 * math.pi
            F.part('flesh', SLUDGE, bevel=1.5).cap(15, 24, 15 + math.cos(a) * 11, 24 + math.sin(a) * 13, 2.4, 1.0)
        F.part('flesh', SLUDGE_D, bevel=2).ell(15, 25, 10, 3)
    elif f == 6:
        F.part('flesh', SLUDGE, flat=True).box(0, 0, 30, 30)
        for k in range(9):                              # 섞여 든 재 · 기름 얼룩
            x, y = (k * 11) % 27 + 1.5, (k * 7) % 26 + 2
            F.part('flesh', SLUDGE_D if k % 3 else '#5a544e', flat=True).ell(x, y, 2.2 + k % 2, 1.2, 0.4)
    elif f == 7:
        F.part('metal', '#8a7a68', bevel=1.4).poly([(4, 13), (15, 10), (26, 12), (24, 15), (15, 13.5), (6, 16)])
        F.part('wood', '#6a4a2a', bevel=1).cap(15, 13, 16, 24, 1.6, 1.3)
        F.px(23, 12, '#c8b090')
    elif f == 8:
        F.part('metal', '#6a6058', bevel=1.2).poly([(4, 16), (13, 13), (25, 9), (26, 12), (14, 16), (5, 19)])
        for x in (9, 17, 22):
            F.px(x, 14 - (x - 9) * 0.25, '#a89a88')
    else:
        F.part('stone', '#6e6862', bevel=2).poly([(8, 10), (17, 7), (23, 12), (21, 20), (11, 22), (6, 16)])
        crack(F, [(10, 13), (14, 15), (19, 13)], 0.8, '#ff8a40')
    return F.render()


# ===== 뼈 오르간(bone_lord 자리) — 무덤 뒷벽에 박힌 갈비 오르간 · 넓적다리뼈 관 · 견갑골 두 팔 =====
BONE, BONE_D, BONE_L = '#e2d8bc', '#a89c80', '#f2ead4'
SOUL = '#8fe8c8'
ORGAN_PIPES = [(-24, 14), (-16, 19), (-8, 24), (0, 28), (8, 24), (16, 19), (24, 14)]   # (x, 높이) — game/boss-organ-art 의 PIPE_X 와 같게
ORGAN_CHEST = 30                                                                        # 관을 받치는 바람통 높이(설계 y)


def organ_chest(F, cx, st, opn, dying, fall, oy=0):
    """등뼈 · 갈비 · 견갑 — 살아 있는 동안은 따로 굽는 가슴 조각(게임이 숨 쉬듯 늘였다 줄인다)"""
    # 등뼈 — 가운데 마디 줄
    for y in range(38, 80, 4):
        F.part('clay', BONE if y % 8 else BONE_D, bevel=1.2).ell(cx, y + fall * 2 + oy, 3.2, 1.7)
    # 갈비 — 여섯 쌍. 닫히면 앞으로 감겨 핵을 덮고, 열리면 풀무처럼 벌어진다. 손상 단계마다 부러진 갈비가 는다
    broken = {1: {(1, -1), (3, 1)}, 2: {(1, -1), (3, 1), (0, 1), (4, -1), (5, 1)}}.get(st, set())
    for k in range(6):
        y = 46 + k * 5.2 + oy
        for sd in (-1, 1):
            spread = 1.0 if opn else 0.0
            if dying:
                spread = 0.5 + fall * 0.3
            p0 = (cx + sd * 2.5, y)
            p1 = (cx + sd * (17 - k * 0.6), y - 3)
            p2 = (cx + sd * (16 - k * 0.6 + spread * 8), y + 3)
            p3 = (cx + sd * (4 + spread * 18), y + 5 - spread * 2 + fall * 2)
            pts = [p0, p1, p2, p3]
            if (k, sd) in broken:
                pts = pts[:3]                            # 부러진 갈비 — 끝이 들쭉날쭉 끊긴다
            for a, b in zip(pts, pts[1:]):
                F.part('clay', BONE, bevel=1.2).cap(a[0], a[1], b[0], b[1], 1.5, 1.2)
            if (k, sd) in broken:
                e = pts[-1]
                F.part('clay', BONE_D, bevel=0.8).poly([(e[0] - 1.2, e[1] - 1), (e[0] + sd * 2, e[1] + 0.5), (e[0] - 0.4, e[1] + 1.4)])
    # 어깨 견갑 — 팔이 붙는 자리(게임이 그 위에 팔 조각을 잇는다)
    for sd in (-1, 1):
        F.part('clay', BONE, bevel=2).poly([(cx + sd * 18, 40 + oy), (cx + sd * 27, 42 + oy), (cx + sd * 26, 52 + oy), (cx + sd * 19, 50 + oy)])
        F.part('clay', BONE_D, bevel=1).ell(cx + sd * 24, 44 + oy, 2.4, 2.4)


def organ_skull(F, cx, oy, st, dying, fall, jaw=False):
    """두개골 — 살아 있는 동안은 따로 굽는 얼굴 조각(게임이 기울이고 · 끄덕이고 · 아래턱을 따로 벌린다)"""
    sy0 = 36 + fall * 3 + oy
    F.part('clay', BONE_L, bevel=3).ell(cx, sy0, 9, 7.5)
    F.part('clay', BONE, bevel=2).box(cx - 6, sy0 + 4, 12, 4, 1.5)
    if jaw and st < 2:
        organ_jaw(F, cx, sy0)
    eye = SOUL if not dying else '#2a2620'
    for sd in (-1, 1):
        F.part('stone', '#1e1c18', bevel=0.8).ell(cx + sd * 3.6, sy0 + 0.5, 2.6, 2.4)
        if not dying:
            F.part('glow', eye, glow=True).ell(cx + sd * 3.6, sy0 + 0.8, 1.1 + st * 0.3, 1.1 + st * 0.3)
            F.glow(cx + sd * 3.6, sy0 + 0.8, 4 + st, eye, 0.35)
    F.part('stone', '#1e1c18', bevel=0.5).poly([(cx - 1.2, sy0 + 4.5), (cx + 1.2, sy0 + 4.5), (cx, sy0 + 2.5)])
    if st >= 1:
        fine(F, (cx - 3, sy0 - 6.5), (cx - 1, sy0 - 3), '#4a4234'); fine(F, (cx - 1, sy0 - 3), (cx - 2.5, sy0 - 0.5), '#4a4234')
    if st >= 2:
        fine(F, (cx + 4, sy0 - 6), (cx + 6, sy0 - 2.5), '#4a4234'); fine(F, (cx + 6, sy0 - 2.5), (cx + 8, sy0 - 1), '#4a4234')


def organ_jaw(F, cx, sy0):
    F.part('clay', BONE_D, bevel=1.5).box(cx - 5.5, sy0 + 8, 11, 3, 1)       # 아래턱(3막은 빠졌다)
    for k in range(5):
        F.px(cx - 4 + k * 2, sy0 + 8, '#2a2620')


def organ_chest_piece(f):
    """가슴 조각 6장(58×48 설계 칸) — 막(0~2) × 풀무(닫힘 · 열림). 오르간 설계 (40, 34) 가 칸의 (29, 0)"""
    F = ZFig(58, 48)
    organ_chest(F, 29, f // 2, f % 2 == 1, False, 0, oy=-34)
    return F.render()


def organ_face(f):
    """얼굴 조각 4장(24×22 설계 칸) — 0~2 막별 두개골(턱 없음) · 3 아래턱. 오르간 설계 (40, 36) 이 칸의 (12, 9)"""
    F = ZFig(24, 22)
    if f < 3:
        organ_skull(F, 12, -27, f, False, 0)
    else:
        organ_jaw(F, 12, 9)
    return F.render()


def organ_body(f):
    """몸 시트 8장 — 0·1 1막(닫힘 · 풀무 열림) · 2·3 2막(갈비 둘 · 관 하나 부러짐 · 두개골 금) · 4·5 3막(갈비 넷 · 관 셋 · 턱 빠짐 · 속불이 새어 나옴)
       · 6·7 쓰러짐(관이 기울고 갈비가 흩어진다). 핵(가슴의 혼불)이 판정 상자의 가운데 — 설계 (40, 58)"""
    W, H = 80, 96
    F = ZFig(W, H)
    cx, base = 40, 93
    st = min(2, f // 2) if f < 6 else 2
    opn = f % 2 == 1 and f < 6
    dying = f >= 6
    fall = 0 if not dying else (1 if f == 6 else 2)
    # 뒷판 — 무덤 벽에 박힌 자리(어두운 흙 테두리 · 오르간 받침)
    def niche(rx, ry, top, jag):
        pts = [(cx - rx, base)]
        for k in range(25):
            t = math.pi + k / 24 * math.pi
            j = jag * (((k * 7) % 5) / 4 - 0.5)
            pts.append((cx + math.cos(t) * (rx + j), top + ry + math.sin(t) * (ry + j)))
        pts.append((cx + rx, base))
        return pts
    F.part('stone', '#5a5044', bevel=3).poly(niche(33, 30, 22, 2.4))          # 벽감 테두리 돌
    F.part('stone', '#2e2a24', bevel=2).poly(niche(30, 27, 25, 1.2))          # 벽감 안 — 깊은 그늘
    # 건반 — 이빨이 늘어선 손건반
    F.part('stone', '#5a5044', bevel=2).box(cx - 24, 80, 48, 9, 1)
    for k in range(11):
        x = cx - 21 + k * 4.2
        F.part('clay', BONE_L if k % 3 else BONE, bevel=1).box(x, 81.5, 3.2, 5.5, 1)
    # 핵 — 갈비 안의 혼불(열리면 드러난다 · 3막은 닫혀도 틈으로 샌다)
    core = SOUL if not dying else '#4a6a60'
    F.part('flesh', '#2a2a26', bevel=3).ell(cx, 58, 13, 15)
    F.part('glow', core, glow=not dying).ell(cx, 58, 7 + opn * 1.5, 9 + opn * 1.5)
    F.part('glow', '#e8fff4', glow=not dying).ell(cx - 1, 56, 2.6, 3.4)
    if not dying:
        F.glow(cx, 58, 14 + opn * 6, core, 0.3 + opn * 0.2 + st * 0.05)
    if dying:
        organ_chest(F, cx, st, opn, dying, fall)
    # 바람통 — 골반 · 척추 마디를 이은 받침대
    F.part('clay', BONE_D, bevel=2).box(cx - 29, ORGAN_CHEST, 58, 5, 2)
    for x in range(cx - 27, cx + 28, 6):
        F.part('clay', BONE, bevel=1).ell(x, ORGAN_CHEST + 2.5, 2.4, 2)
    # 관 — 넓적다리뼈. 손상 단계마다 부러진 관(끝이 깨져 짧다) · 쓰러지면 기운다
    snapped = {1: {5}, 2: {1, 5, 6}}.get(st, set())
    for i, (px, ph) in enumerate(ORGAN_PIPES):
        x = cx + px
        top = ORGAN_CHEST - ph
        if i in snapped:
            top += ph * 0.45
        tilt = (fall * (0.5 if i % 2 else -0.4) * (1 + abs(px) / 24)) if dying else 0
        tx = x + tilt * (ORGAN_CHEST - top) * 0.25
        F.part('clay', BONE if i % 2 else BONE_L, bevel=1.6).cap(x, ORGAN_CHEST, tx, top + 1.5, 2.3, 2.0)
        if i in snapped:
            F.part('clay', BONE_D, bevel=0.8).poly([(tx - 2.2, top + 2), (tx - 0.5, top - 0.8), (tx + 0.7, top + 1), (tx + 2.2, top - 0.4), (tx + 2.2, top + 2.5)])
        else:
            F.part('clay', BONE_L, bevel=1.4).ell(tx - 1.2, top + 1.2, 1.8, 1.6)
            F.part('clay', BONE_L, bevel=1.4).ell(tx + 1.2, top + 1.2, 1.8, 1.6)    # 넓적다리 머리 두 혹
        F.part('stone', '#2a2620', bevel=0.6).box(x - 1.3, ORGAN_CHEST - 6.5, 2.6, 2.2, 0.6)   # 소리 나는 입(게임이 여기에 빛을 얹는다)
    if dying:
        organ_skull(F, cx, 0, st, dying, fall, jaw=True)
    elif st >= 2:
        F.glow(cx, 58, 9, SOUL, 0.25)                    # 닫혀도 새는 혼불
    return F.render()


def organ_parts(f):
    """팔 조각 3장(64×24 설계 칸 — 오른쪽을 향해 누운 뼈) · 0 윗팔(위팔뼈) · 1 아래팔(노뼈 · 자뼈 둘) · 2 손(견갑 날 손바닥 + 손가락뼈 넷)"""
    F = ZFig(64, 24)
    if f == 0:
        F.part('clay', BONE, bevel=2).cap(6, 12, 58, 12, 2.6, 2.2)
        F.part('clay', BONE_L, bevel=2).ell(5, 12, 4.4, 4)
        F.part('clay', BONE_L, bevel=2).ell(58.5, 10.5, 3, 2.6); F.part('clay', BONE_L, bevel=2).ell(58.5, 13.8, 3, 2.6)
        fine(F, (20, 11), (40, 11.4), BONE_D)
    elif f == 1:
        F.part('clay', BONE_D, bevel=1.6).cap(5, 10, 58, 9.5, 1.7, 1.5)
        F.part('clay', BONE, bevel=1.6).cap(5, 14, 58, 14.5, 2.0, 1.6)
        F.part('clay', BONE_L, bevel=1.6).ell(5, 12, 3.4, 4)
        F.part('clay', BONE_L, bevel=1.4).ell(58, 12, 2.6, 3.6)
    else:
        F.part('clay', BONE, bevel=2.4).poly([(3, 8), (22, 3.5), (35, 5), (36, 20.5), (22, 22.2), (3, 16.5)])    # 견갑 날 손바닥 — 네 손가락 뿌리를 다 덮게(아래 손가락이 잘려 보였다)
        fine(F, (6, 11), (31, 8), BONE_D); fine(F, (6, 14), (31, 16), BONE_D)
        for k, (y0, ln) in enumerate(((6, 26), (10, 28), (14, 27), (18, 25))):
            F.part('clay', BONE if k % 2 else BONE_L, bevel=1.2).cap(33, y0 + 1, 33 + ln * 0.55, y0, 1.6, 1.3)
            F.part('clay', BONE, bevel=1.1).cap(33 + ln * 0.55, y0, 33 + ln, y0 + 2.5 + k * 0.4, 1.3, 0.7)
    return F.render()


# ===== 잿빛 고치(corrupt_heart 자리) — 천장에 실로 매달린 거대 번데기 → 2막에 갈라져 불나방이 난다 =====
SILK, SILK_D, SILK_L = '#8a847c', '#5e5952', '#b4ada2'      # 재가 엉긴 실
MOTH, MOTH_D, MOTH_L = '#7a2e1a', '#3e1a12', '#c8582a'      # 불나방 앞날개 — 그을린 붉은 갈색 · 그늘 · 불꽃 띠
HINDC, HINDC_L = '#e0561c', '#ff9a3a'                       # 뒷날개 — 타오르는 주홍
FIRE, FIRE_H = '#ff7a2a', '#ffd27a'                          # 날개 눈 무늬 · 속불


def spindle(cx, top, bot, rx, n=40, skew=0.0, bulge=0.58):
    """방추형 윤곽 — 위 · 아래가 가늘고 bulge 높이가 가장 넓다(번데기)"""
    L, R = [], []
    for k in range(n + 1):
        t = k / n
        y = top + (bot - top) * t
        u = t / bulge if t < bulge else (1 - t) / (1 - bulge)
        w = rx * math.sin(min(1, u) * math.pi / 2) ** 0.75
        off = skew * math.sin(t * math.pi)
        L.append((cx - w + off, y)); R.append((cx + w + off, y))
    return L + R[::-1]


def cocoon_body(f):
    """고치 8장(46×80 설계 칸 · 매단 실 끝 (23, 3)) — 0·1 멀쩡(속불이 숨 쉰다) · 2·3 금(빛 새는 금) · 4·5 갈라짐(날개 끝 · 눈이 비친다)
       · 6·7 빈 허물(갈라진 자락이 바깥으로 말린다 — 나방이 나간 뒤에도 실에 매달려 흔들린다)"""
    W, H = 46, 80
    F = ZFig(W, H)
    cx, top, bot = 23, 5, 77
    st = min(3, f // 2)
    b = f % 2
    # 매단 실 — 꼭대기의 꼬인 실 매듭
    F.part('cloth', SILK_L, bevel=1).cap(cx, 2.6, cx, top + 3, 1.2, 2.2)
    if st < 3:
        F.part('paper', SILK, bevel=5).poly(spindle(cx, top + 2, bot, 15.5, skew=0.6))
        for k in range(11):                                  # 감긴 실 — 몸을 비스듬히 돌며 굽이친다(겹친 자리는 짙고, 군데군데 끊긴다)
            y = top + 8 + k * 6.3
            t = (y - top) / (bot - top)
            u = t / 0.58 if t < 0.58 else (1 - t) / 0.42
            half = 15 * math.sin(min(1, u) * math.pi / 2) ** 0.75 - 0.6
            pts = [(cx - half + half * 2 * j / 12, y + 1.8 - 3.4 * j / 12 + math.sin(j * 1.3 + k) * 0.5) for j in range(13)]
            for j, (a0, a1) in enumerate(zip(pts, pts[1:])):
                if (j + k * 5) % 9 == 4:
                    continue
                fine(F, a0, a1, SILK_D, 190 if j > 6 else 120)
                fine(F, (a0[0], a0[1] + 0.35), (a1[0], a1[1] + 0.35), SILK_L, 90 if j < 6 else 50)
        for (x, y, r) in ((-8, 20, 1.6), (6, 31, 1.3), (-5, 49, 1.8), (9, 58, 1.2), (-10, 64, 1.0)):   # 엉겨 붙은 재 · 마른 잎
            F.part('leaf', '#4e463e', bevel=1).ell(cx + x, y, r * 1.6, r, 0.5)
        # 속불 — 얇은 곳으로 비친다(1장 · 3장 · 5장은 더 밝게 — 숨)
        glow = (0.18, 0.3, 0.42)[min(st, 2)] + b * 0.12
        F.glow(cx, 44, 13 + st * 2, FIRE, glow)
        if st >= 1:
            crack(F, [(cx - 3, 18), (cx - 5, 26), (cx - 2, 33), (cx - 6, 41), (cx - 3, 48)], 0.55, FIRE)
            crack(F, [(cx + 7, 38), (cx + 5, 45), (cx + 8, 52), (cx + 5, 60)], 0.45, FIRE)
        if st >= 2:                                         # 갈라짐 — 가운데가 벌어지고 속의 날개 · 눈이 보인다
            F.part('flesh', '#2a1a14', flat=True).poly(spindle(cx, top + 14, bot - 8, 4.2 + b * 0.6))
            F.part('cloth', '#8a4a24', bevel=1.4).poly(spindle(cx - 1, top + 20, bot - 18, 2.6))
            for (ex, ey) in ((-1.6, 30), (1.6, 30)):
                F.part('glow', FIRE_H, glow=True).ell(cx + ex, ey, 1.1, 1.4)
            F.glow(cx, 30, 6, FIRE, 0.5)
            crack(F, [(cx - 4, 64), (cx - 1, 70), (cx - 3, 75)], 0.5, FIRE)
    else:                                                    # 빈 허물 — 갈라진 자락 둘이 바깥으로 젖혀지고, 찢긴 가장자리에 실이 늘어진다
        sw = 0.6 * b
        def flap(side, col):
            out = [(cx + side * 3, top + 4)]
            for k in range(1, 15):                           # 바깥 가장자리 — 부풀었다 가늘어진다
                t = k / 14
                y = top + 4 + (bot - 3 - top - 4) * t
                w = 3 + 14 * math.sin(t * math.pi) ** 0.8 + (sw if 0.3 < t < 0.7 else 0)
                out.append((cx + side * w, y))
            for k in range(14, 0, -1):                       # 안쪽 찢긴 날 — 들쭉날쭉
                t = k / 14
                y = top + 4 + (bot - 3 - top - 4) * t
                w = 2 + 5 * math.sin(t * math.pi) + (1.3 if k % 3 == 0 else 0) - (0.9 if k % 4 == 1 else 0)
                out.append((cx + side * w, y))
            F.part('paper', col, bevel=3).poly(out)
        F.part('flesh', '#1e1612', flat=True).poly(spindle(cx, top + 8, bot - 4, 6.5))   # 빈 속 — 그을음
        flap(-1, SILK_D); flap(1, SILK)
        for (x, y, ln) in ((-5, 24, 7), (-6.5, 40, 9), (-5, 57, 6), (5.5, 30, 8), (6.5, 47, 10), (4, 62, 5)):   # 찢긴 날에서 늘어진 실
            fine(F, (cx + x, y), (cx + x + 0.4 * (1 if x > 0 else -1), y + ln), SILK_L, 170)
        for (x, y) in ((-3, 30), (2, 45), (-1, 56)):
            F.px(cx + x, y, '#ff8a40'); F.glow(cx + x, y, 2, '#ff8a40', 0.3)                  # 남은 불씨
    return F.render()


def wing_pts(pts, hx, hy, a, side):
    """날개 점을 날갯짓 각 a 로 — 경첩(몸통)에서 멀수록 위아래로 기울고, 가로는 cos 만큼 줄어든다(앞에서 본 날갯짓)"""
    out = []
    for (x, y) in pts:
        dx, dy = (x - hx) * side, y - hy
        out.append((hx + side * dx * (0.55 + 0.45 * math.cos(a)), hy + dy * (0.9 + 0.1 * math.cos(a)) - dx * math.sin(a) * 0.42))
    return out


def spline(pts, n=6):
    """닫힌 캣멀롬 곡선 — 날개 윤곽을 꺾인 점이 아니라 매끄러운 곡선으로(곧은 날개 끝이 각져 보였다)"""
    out, m = [], len(pts)
    for i in range(m):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % m], pts[(i + 2) % m]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    return out


FORE = [(0, 0), (8, -10), (22, -18), (38, -22), (46, -19), (44, -12), (34, -4), (20, 3), (6, 5)]        # 앞날개(오른쪽 · 경첩 (0, 0) 기준)
HIND = [(0, 2), (10, 6), (24, 8), (32, 14), (30, 22), (20, 25), (10, 21), (3, 12)]                        # 뒷날개


def moth_frame(f):
    """조각 14장(100×80 설계 칸 · 몸통 가운데 (50, 40)) — 0~5 불나방 날갯짓(2막) · 6~11 찢긴 날개 · 달아오른 몸(3막) · 12 번데기 추(실 끝 장애물) · 13 돌진(날개를 접어 뒤로)"""
    W, H = 100, 80
    F = ZFig(W, H)
    cx, cy = 50, 40
    if f == 12:                                              # 실 끝에 매달린 작은 번데기 — 속불이 비친다
        F.part('cloth', SILK_L, bevel=1).cap(cx, 4, cx, 14, 0.8, 1.2)
        F.part('paper', SILK, bevel=3).poly(spindle(cx, 12, 40, 6.5, skew=0.3))
        crack(F, [(cx - 1, 20), (cx - 2.5, 26), (cx - 0.5, 32)], 0.5, FIRE)
        F.glow(cx, 27, 7, FIRE, 0.4)
        return F.render()
    torn = 6 <= f < 12
    dive = f == 13
    a = -0.15 if dive else (0.95, 0.55, 0.05, -0.45, -0.1, 0.5)[f % 6]
    fold = 0.55 if dive else 1.0
    for side in (-1, 1):
        def tr(pts, smooth=True):
            q = wing_pts([(cx + side * x * fold, cy + y * (0.8 if dive else 1)) for (x, y) in pts], cx, cy, a, side)
            return spline(q) if smooth else q
        hind = HIND if not torn else [(0, 2), (10, 6), (19, 7), (22, 11), (27, 12), (31, 18), (29, 23), (22, 24), (17, 20), (10, 22), (3, 12)]
        fore = FORE if not torn else [(0, 0), (8, -10), (22, -18), (30, -20), (33, -15), (38, -21), (46, -19), (43, -13), (38, -10), (34, -4), (20, 3), (6, 5)]
        F.glow(*tr([(26, 14)], False)[0], 10, HINDC_L, 0.25 + torn * 0.1)                 # 뒷날개가 안에서 비친다
        F.part('cloth', HINDC, bevel=3).poly(tr(hind))
        F.part('cloth', '#8a2414', bevel=2).poly(tr([(5, 6), (13, 10), (19, 13), (16, 19), (8, 16)]))      # 뒷날개 밑동 — 그을린 붉음
        for (x, y, r) in ((22, 17, 2.4), (28, 19, 1.6), (15, 21, 1.4)):                    # 뒷날개 검은 점
            px, py = tr([(x, y)], False)[0]; F.part('cloth', '#2a120c', flat=True).ell(px, py, r * fold * (0.55 + 0.45 * math.cos(a)), r * 0.85)
        F.part('cloth', MOTH, bevel=3).poly(tr(fore))
        for band in ([(6, -2), (15, -9), (26, -14), (33, -16), (27, -10), (16, -4), (8, 1)],      # 불꽃 띠 — 앞 가장자리에서 날개 끝으로 번진다
                     [(20, -3), (30, -8), (40, -15), (43, -14), (35, -6), (24, 0)]):
            F.part('cloth', MOTH_L, bevel=2).poly(tr(band))
        F.part('glow', '#ffb060', glow=True).poly(tr([(36, -18), (44, -18.5), (42.5, -14), (37, -15)]))   # 날개 끝 — 불이 타오르는 가장자리
        F.glow(*tr([(41, -16.5)], False)[0], 5 + torn * 2, FIRE, 0.45)
        for (x0, y0, x1, y1) in ((4, 0, 40, -18), (6, 2, 34, -6), (8, 3, 22, 2), (4, 4, 26, 20)):   # 날개맥 — 속불이 비친다
            p0, p1 = tr([(x0, y0)], False)[0], tr([(x1, y1)], False)[0]
            fine(F, p0, p1, '#ffb070' if torn else '#ff8a4a', 230 if torn else 170)
        ex, ey = tr([(27, -9)], False)[0]                       # 눈 무늬 — 불씨 눈
        sq = fold * (0.55 + 0.45 * math.cos(a))
        F.part('cloth', '#1e0c08', flat=True).ell(ex, ey, 5.2 * sq, 4.2)
        F.part('glow', FIRE, glow=True).ell(ex, ey, 3.4 * sq, 2.8)
        F.part('glow', FIRE_H, glow=True).ell(ex - 0.6, ey - 0.5, 1.4 * fold, 1.1)
        F.glow(ex, ey, 7 + torn * 3, FIRE, 0.4 + torn * 0.15)
        for (x, y) in ((12, -6), (20, -12), (33, -14), (14, 14)):   # 인분 — 반짝이는 점
            px, py = tr([(x, y)], False)[0]; F.px(px, py, '#ffd8a0', 210)
        if torn:                                             # 찢긴 자리 끝에서 불씨가 샌다
            for (x, y) in ((33, -15), (22, 11)):
                px, py = tr([(x, y)], False)[0]; F.glow(px, py, 3, FIRE, 0.55); F.px(px, py, FIRE_H)
    # 몸통 — 털 많은 가슴 · 마디진 배 · 깃털 더듬이
    F.part('flesh', '#5a2414', bevel=3).ell(cx, cy + 9, 4.2, 10)                     # 배
    for k in range(4):
        fine(F, (cx - 3.6 + k * 0.3, cy + 4 + k * 3.4), (cx + 3.6 - k * 0.3, cy + 4.6 + k * 3.4), '#ff8a40', 200)
    F.part('flesh', '#c8642a', bevel=3).ell(cx, cy - 1, 6, 6.5)                      # 털 많은 가슴 — 불티 색 털
    F.part('flesh', '#f0a050', bevel=2).ell(cx - 1.4, cy - 3, 2.6, 2.4)
    F.part('flesh', '#6a2a16', bevel=2).ell(cx, cy - 8, 4.2, 3.4)                    # 머리
    for s2 in (-1, 1):
        F.part('glow', FIRE_H if torn else '#ffb060', glow=True).ell(cx + s2 * 2.4, cy - 8.4, 1.6, 1.4)   # 겹눈 — 불빛을 쫓는 눈
        F.glow(cx + s2 * 2.4, cy - 8.4, 3, FIRE, 0.4)
        ax0, ay0 = cx + s2 * 1.6, cy - 10.5
        ax1, ay1 = cx + s2 * 9, cy - 21
        F.part('cloth', '#a0502a', bevel=0.8).cap(ax0, ay0, ax1, ay1, 0.6, 0.4)
        for k in range(1, 6):                                # 깃털 더듬이의 빗살
            t = k / 6
            px, py = ax0 + (ax1 - ax0) * t, ay0 + (ay1 - ay0) * t
            fine(F, (px, py), (px + s2 * 2.2 * (1 - t * 0.5), py + 1.2), '#e0884a', 210)
    if torn:
        crack(F, [(cx - 1, cy + 3), (cx + 1, cy + 8), (cx - 0.5, cy + 13)], 0.5, FIRE)
        F.glow(cx, cy + 4, 8, FIRE, 0.35)
    return F.render()


# ===== 모래시계 거상(sand_guardian 자리) — 피라미드 주인 방에 앉은 사암 석상, 가슴에 박힌 모래시계가 목(약점) =====
SANDST, SANDST_D, SANDST_L = '#c8a46a', '#8a6a3e', '#e8cc94'   # 사암 · 그늘 · 빛 받는 면
BRONZE, BRONZE_D, AMBER = '#a8743a', '#5a3a1a', '#ffc85a'     # 청동 · 그늘 · 호박빛
HG_C = (42, 52)                                               # 모래시계 홈 가운데(게임 HG.GLASS_Y 와 같다)


def colossus_head(F, cx, hy, st, f=0):
    """머리 — 두건(옆 자락) · 사암 가면 · 이마 왕관 · 눈(손상 단계 st 의 금 · 깨진 조각까지). 몸 시트(쓰러지는 장)와 조각 5~7 이 같이 쓴다"""
    F.part('cloth', '#3a5a8a', bevel=2).poly([(cx - 13, hy - 8), (cx + 13, hy - 8), (cx + 17, hy + 16), (cx + 12, hy + 18), (cx - 12, hy + 18), (cx - 17, hy + 16)])
    F.part('stone', SANDST_L, bevel=3).poly([(cx - 10, hy - 9), (cx + 10, hy - 9), (cx + 11, hy + 6), (cx + 6, hy + 14), (cx - 6, hy + 14), (cx - 11, hy + 6)])
    for k in range(5):                                    # 두건 줄무늬 — 얼굴 밖 자락에만
        y = hy - 4 + k * 4.2
        for s2 in (-1, 1):
            fine(F, (cx + s2 * 11.5, y), (cx + s2 * (13.5 + k * 0.7), y), '#d8b060', 220)
    F.part('stone', SANDST_D, bevel=1).box(cx - 1, hy - 2, 2, 7, 1)
    F.part('stone', SANDST_D, bevel=1).box(cx - 4, hy + 8.5, 8, 1.4, 0.5)
    F.part('metal', BRONZE, bevel=2).poly([(cx - 10, hy - 9), (cx + 10, hy - 9), (cx + 7, hy - 14), (cx, hy - 18), (cx - 7, hy - 14)])
    F.part('glow', AMBER, glow=True).ell(cx, hy - 13, 1.8, 1.8)
    eye, b = ('#ffb040', '#ff9a30', '#ff7020')[st], 0
    for s2 in (-1, 1):
        if f >= 7:
            F.line(cx + s2 * 5 - 1.5, hy + 1, cx + s2 * 5 + 1.5, hy + 1, '#4a3a20')
        else:
            F.part('glow', eye, glow=True).ell(cx + s2 * 4.6, hy + 1, 2.2, 1.0 + b * 0.3)
            F.glow(cx + s2 * 4.6, hy + 1, 4 + st + b, eye, 0.35 + b * 0.1)
    if st >= 1:
        crack(F, [(cx - 6, hy - 8), (cx - 4, hy - 3), (cx - 7, hy + 3), (cx - 5, hy + 9)], 0.45, AMBER)
    if st >= 2:
        F.part('stone', SANDST_D, flat=True).ell(cx + 7, hy - 12, 3, 2.2)
        fine(F, (cx + 4.4, hy - 13), (cx + 9.6, hy - 11), SANDST_L, 220)


def colossus_body(f):
    """몸 시트 8장(84×104 설계 칸 · 바닥 101) — 0·1 멀쩡(눈이 숨 쉰다) · 2·3 금 · 4·5 깨진 왕관 · 무너진 어깨 · 6·7 쓰러짐(무너져 내린다).
       왕좌에 앉은 거상 — 가슴 가운데 둥근 홈에 모래시계(조각 0)가 박히고 그 속 모래는 게임이 그린다 · 팔은 조각(1 · 2 · 3)으로 무릎에 얹힌다.
       ★ fine() · F.line 은 부위 위에 덧그려진다(칠 순서와 상관없다) — 얼굴을 가로지르는 줄은 옆 자락에만 긋는다"""
    W, H = 84, 104
    F = ZFig(W, H)
    cx, base = 42, 101
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    fall = 0 if f < 6 else (5 if f == 6 else 12)
    # 왕좌 — 등판(몸 뒤로 보이는 어두운 판) · 팔걸이 · 계단진 받침
    F.part('stone', '#7a5a32', bevel=3).poly([(cx - 33, 92), (cx - 33, 34), (cx - 26, 26), (cx + 26, 26), (cx + 33, 34), (cx + 33, 92)])
    for s2 in (-1, 1):
        F.part('stone', SANDST_D, bevel=3).box(cx + s2 * 34 - 5, 60, 10, 32, 2)                     # 팔걸이 기둥
        F.part('stone', SANDST, bevel=2).box(cx + s2 * 34 - 6, 57, 12, 6, 2)                         # 팔걸이 머리
        F.part('metal', BRONZE, bevel=1).ell(cx + s2 * 34, 60, 2.2, 2)
    F.part('stone', SANDST_D, bevel=3).box(cx - 39, base - 8, 78, 8, 1)
    F.part('stone', SANDST, bevel=3).box(cx - 36, base - 14, 72, 7, 1)
    # 머리 뒤 해 고리
    F.part('stone', SANDST_D, bevel=3).ell(cx, 20 + fall, 17, 16)
    # 다리 — 앞으로 나온 무릎(둥근 머리) · 정강이 · 발
    for s2 in (-1, 1):
        x = cx + s2 * 17
        F.part('stone', SANDST, bevel=3).poly([(x - 8, 76 + fall * 0.4), (x + 8, 76 + fall * 0.4), (x + 7, base - 16), (x - 7, base - 16)])
        F.part('stone', SANDST_L, bevel=3).ell(x, 75 + fall * 0.4, 10, 7)                           # 무릎 — 앞으로 나와 빛을 받는다
        F.part('stone', SANDST_D, bevel=2).poly([(x - 10, base - 17), (x + 10, base - 17), (x + 11, base - 13), (x - 11, base - 13)])   # 발
    # 몸통 — 넓은 가슴 · 좁아지는 허리 · 허리띠
    F.part('stone', SANDST, bevel=4).poly([(cx - 26, 34 + fall), (cx + 26, 34 + fall), (cx + 23, 50), (cx + 18, 70), (cx - 18, 70), (cx - 23, 50)])
    F.part('stone', SANDST_L, bevel=2).poly([(cx - 24, 35 + fall), (cx - 15, 35 + fall), (cx - 17, 47), (cx - 18, 64), (cx - 21, 50)])
    F.part('cloth', '#3a5a8a', bevel=2).poly([(cx - 19, 66), (cx + 19, 66), (cx + 23, 76), (cx - 23, 76)])
    F.part('metal', BRONZE, bevel=1.5).box(cx - 20, 65, 40, 2.6, 1)
    F.part('metal', BRONZE_D, bevel=2).ell(HG_C[0], HG_C[1] + fall * 0.6, 12.5, 15)              # 홈 테두리 — 청동 고리
    F.part('stone', '#3a2c1c', flat=True).ell(HG_C[0], HG_C[1] + fall * 0.6, 10.5, 13)
    # 어깨받이 — 청동 반원 판
    for s2 in (-1, 1):
        F.part('metal', BRONZE, bevel=2).poly([(cx + s2 * 15, 33 + fall), (cx + s2 * 30, 33 + fall), (cx + s2 * 32, 40 + fall), (cx + s2 * 27, 44 + fall), (cx + s2 * 17, 40 + fall)])
        F.part('metal', '#c8925a', bevel=1).poly([(cx + s2 * 17, 34 + fall), (cx + s2 * 28, 34 + fall), (cx + s2 * 29, 37 + fall), (cx + s2 * 18, 37 + fall)])
    # 목 — 머리는 조각(5~7)이라 게임이 돌린다. 쓰러지는 장(6 · 7)만 머리를 몸에 같이 그린다
    F.part('stone', SANDST_D, bevel=2).box(cx - 6, 29 + fall, 12, 9, 2)
    hy = 20 + fall
    if fall:
        colossus_head(F, cx, hy, st, f)
    if st >= 1:
        crack(F, [(cx + 19, 40 + fall), (cx + 15, 48), (cx + 17, 56), (cx + 13, 63)], 0.5, AMBER)
    if st >= 2:
        crack(F, [(cx - 20, 46 + fall), (cx - 15, 54), (cx - 17, 62)], 0.5, AMBER)
        crack(F, [(cx + 17, 72), (cx + 14, 80), (cx + 18, 86)], 0.45, AMBER)
        for (x, y) in ((cx - 26, 38 + fall), (cx + 12, 58)):
            F.part('stone', SANDST_D, flat=True).ell(x, y, 3, 2.2)
            fine(F, (x - 2.6, y - 1), (x + 2.6, y + 1), SANDST_L, 220)
    if fall:
        for k in range(9):
            x = cx - 34 + k * 7.6 + (k % 2) * 2
            F.part('stone', SANDST if k % 2 else SANDST_D, bevel=2).poly([(x, base - 1), (x + 4, base - 6 - (k % 3) * 2), (x + 9, base - 3), (x + 8, base - 1)])
    return F.render()


def colossus_parts(f):
    """조각 8장(40×44 설계 칸) — 5~7 머리(손상 단계) · 0 모래시계(청동 마개 · 기둥 둘 · 유리의 빛 — 속은 비었다: 모래는 게임이 그린다) · 1 위팔 · 2 아래팔 · 3 주먹 · 4 사암 덩이"""
    F = ZFig(40, 44)
    cx = 20
    if f == 0:
        for (y0, sgn) in ((3, 1), (41, -1)):             # 위 · 아래 청동 마개
            F.part('metal', BRONZE, bevel=2).box(cx - 13, y0 - 2 if sgn > 0 else y0 - 3, 26, 5, 2)
            F.part('metal', BRONZE_D, bevel=1).box(cx - 11, y0 + 2 if sgn > 0 else y0 - 5, 22, 1.4, 0.5)
            F.part('glow', AMBER, glow=True).ell(cx, y0 if sgn > 0 else y0 - 1, 1.6, 1.2)
        for x in (cx - 12, cx + 12):                     # 기둥 — 마개 사이
            F.part('metal', BRONZE_D, bevel=1).box(x - 1, 6, 2.2, 32, 1)
        F.part('metal', BRONZE, bevel=1).box(cx - 1, 6, 1.4, 1, 0.3)
        L = []                                            # 유리 — 윤곽과 빛줄만(속은 비워 둔다)
        for k in range(41):
            y = 6 + k * 0.8
            u = abs(y - 22) / 16
            L.append((cx - (1.2 + 9 * u ** 0.8), y))
        for (a, b2) in zip(L, L[1:]):
            fine(F, a, b2, '#f0e8d0', 200); fine(F, (2 * cx - a[0], a[1]), (2 * cx - b2[0], b2[1]), '#a89878', 170)
        for k in range(8):                                # 유리의 빛줄 — 왼쪽 위 볼록한 데
            fine(F, (cx - 7.5 + k * 0.2, 9 + k * 1.1), (cx - 6.8 + k * 0.2, 9.6 + k * 1.1), '#ffffff', 150)
    elif f in (1, 2):
        r0, r1 = (6.5, 5.5) if f == 1 else (5.5, 4.6)
        F.part('stone', SANDST, bevel=3).cap(8, 22, 32, 22, r0, r1)
        F.part('stone', SANDST_L, bevel=2).cap(9, 20, 30, 20.5, r0 * 0.35, r1 * 0.3)
        fine(F, (12, 25), (28, 24.5), SANDST_D, 200)
        F.part('metal', BRONZE, bevel=1.4).box(8 if f == 1 else 27, 16, 3, 12, 1)       # 청동 팔찌
    elif f == 3:
        F.part('stone', SANDST, bevel=4).box(6, 12, 26, 22, 6)                           # 주먹 — 쥔 손가락 마디가 앞
        for k in range(4):
            F.part('stone', SANDST_L, bevel=2).box(9 + k * 5.6, 12, 5, 7, 2)
            fine(F, (9 + k * 5.6, 19), (14 + k * 5.6, 19), SANDST_D, 220)
        F.part('stone', SANDST_D, bevel=2).box(4, 20, 6, 10, 2)                           # 엄지
        F.part('metal', BRONZE, bevel=1.4).box(28, 15, 4, 16, 1)
    elif f == 4:
        F.part('stone', SANDST, bevel=3).poly([(8, 14), (22, 9), (32, 16), (30, 30), (16, 34), (7, 26)])
        crack(F, [(14, 18), (20, 24), (26, 21)], 0.6, AMBER)
    else:                                                 # 5~7 머리(손상 0 · 1 · 2) — 목 축 (20, 34) 둘레로 게임이 돌린다
        colossus_head(F, cx, 20, f - 5)
    return F.render()


# ===== 곪은 벌집 어미(blight_maw 자리) — 둥지 뒷벽 전체가 육각 방 벌집, 어미 머리가 아랫줄 방 다섯 중 하나에서 내민다 =====
HIVE_W, HIVE_H, HIVE_R = 120, 90, 11
HIVE_CELLS = [(41, 16), (60, 16), (79, 16),
              (31.5, 33), (50.5, 33), (69.5, 33), (88.5, 33),
              (22, 50), (41, 50), (60, 50), (79, 50), (98, 50),
              (31.5, 67), (50.5, 67), (69.5, 67), (88.5, 67)]     # game/boss-hive.ts HIVE.CELLS 와 같게
WAX, WAX_D, WAX_L = '#9a7a44', '#5e4424', '#c8a868'
HIVE_M, HIVE_MD = '#4a2a3e', '#2a1422'                              # 곪은 벌집 살 · 그늘
BILE, BILE_D = '#b8c83a', '#6a7a20'


def hexpts(cx, cy, r, rot=0.0):
    return [(cx + r * math.cos(-math.pi / 2 + k * math.pi / 3 + rot), cy + r * math.sin(-math.pi / 2 + k * math.pi / 3 + rot)) for k in range(6)]


def hive_body(f):
    """몸 시트 8장(120×90 설계 칸 · 바닥 88) — 0·1 1막(핏줄이 숨 쉰다) · 2·3 곪은 반점 · 4·5 갈라짐 · 6·7 쓰러짐(벌집이 내려앉는다).
       방은 모두 열린 구멍으로 그린다 — 밀랍 뚜껑(조각 2 · 3)과 어미 머리(조각 0 · 1)는 게임이 얹는다"""
    F = ZFig(HIVE_W, HIVE_H)
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    sag = 0 if f < 6 else (3 if f == 6 else 7)
    # 벌집 덩어리 — 방들을 감싸는 울퉁불퉁한 살
    hull = []
    for k in range(48):
        a = k / 48 * math.tau
        rx, ry = 55, 41
        j = 2.0 * math.sin(a * 7 + 1.3) + 1.2 * math.sin(a * 13)
        hull.append((60 + math.cos(a) * (rx + j), 45 + sag * 0.5 + math.sin(a) * (ry + j)))
    hull = [(x, min(y, 86)) for (x, y) in hull]
    F.part('flesh', HIVE_MD, bevel=4).poly(hull)
    F.part('flesh', HIVE_M, bevel=3).poly([(60 + (x - 60) * 0.94, 45 + sag * 0.5 + (y - 45 - sag * 0.5) * 0.92) for (x, y) in hull])
    # 핏줄 — 살 위를 기는 보랏빛 줄(숨 쉴 때 밝다)
    vein = ('#8a4a9a', '#b06ac0')[b]
    for (x0, y0, x1, y1) in ((8, 40, 20, 30), (112, 44, 100, 30), (14, 70, 24, 58), (106, 72, 96, 60), (60, 2, 52, 8), (60, 2, 70, 8)):
        F.line(x0, y0 + sag, (x0 + x1) / 2 + 2, (y0 + y1) / 2 + sag, vein); F.line((x0 + x1) / 2 + 2, (y0 + y1) / 2 + sag, x1, y1 + sag, vein)
    # 방 — 밀랍 테 · 깊은 구멍 · 테의 빛 받는 윗면
    for i, (cx, cy) in enumerate(HIVE_CELLS):
        cy += sag * (0.3 + cy / 90)
        F.part('clay', WAX_D, bevel=2).poly(hexpts(cx, cy, HIVE_R - 0.3))
        F.part('clay', WAX, bevel=2).poly(hexpts(cx, cy, HIVE_R - 1.4))
        F.part('stone', '#140a12', flat=True).poly(hexpts(cx, cy + 0.6, HIVE_R - 3.4))
        F.part('stone', '#24121e', flat=True).poly(hexpts(cx, cy + 2.2, HIVE_R - 5.4))
        a, c2 = hexpts(cx, cy, HIVE_R - 1.6)[5], hexpts(cx, cy, HIVE_R - 1.6)[0]
        fine(F, a, c2, WAX_L, 220); fine(F, c2, hexpts(cx, cy, HIVE_R - 1.6)[1], WAX_L, 160)
    # 담즙 자국 — 방 밑으로 흘러내린 얼룩
    for (cx, cy, L) in ((41, 50, 12), (79, 50, 9), (50.5, 67, 10), (98, 50, 14), (31.5, 33, 8), (69.5, 33, 11)):
        y0 = cy + HIVE_R - 2 + sag * 0.6
        F.part('glow' if b else 'flesh', BILE_D if not b else '#8a9a2a', glow=bool(b)).poly([(cx - 1.6, y0), (cx + 1.6, y0), (cx + 0.9, y0 + L), (cx, y0 + L + 2), (cx - 0.9, y0 + L)])
    # 밑동 — 바닥에 고인 곪은 진액
    F.part('flesh', '#3a2a24', bevel=3).poly([(6, 88), (10, 80), (22, 78), (40, 81), (60, 79), (82, 81), (100, 78), (114, 81), (116, 88)])
    F.part('glow', BILE_D, glow=False).poly([(18, 88), (24, 84), (44, 85), (58, 83), (76, 85), (96, 83), (104, 88)])
    # 손상 — 곪은 반점 · 갈라짐
    if st >= 1:
        for (x, y, r) in ((24, 30, 3.2), (96, 26, 2.6), (12, 58, 2.8), (108, 64, 3), (60, 80, 2.4)):
            F.part('flesh', '#6a3a4a', bevel=1).ell(x, y + sag, r, r * 0.8)
            F.part('glow', '#c8e050', glow=True).ell(x - 0.4, y - 0.3 + sag, r * 0.45, r * 0.35)
    if st >= 2:
        crack(F, [(30, 8 + sag), (34, 18 + sag), (28, 26 + sag)], 0.6, '#c8e050')
        crack(F, [(92, 10 + sag), (88, 22 + sag), (94, 28 + sag)], 0.6, '#c8e050')
        crack(F, [(112, 40 + sag), (106, 52 + sag)], 0.5, '#c8e050')
    return F.render()


def hive_parts(f):
    """조각 5장(40×36 설계 칸) — 0 어미 머리(턱 닫힘) · 1 머리(턱 벌림 · 목구멍 빛) · 2 밀랍 뚜껑 · 3 금 간 뚜껑 · 4 기어 나오는 애벌레"""
    F = ZFig(40, 36)
    cx, cy = 20, 18
    if f in (0, 1):
        opn = f == 1
        for d in (-1, 1):                                             # 더듬이
            F.line(cx + d * 4, cy - 9, cx + d * 10, cy - 15, '#2a1424'); F.line(cx + d * 10, cy - 15, cx + d * 15, cy - 14, '#2a1424')
            F.part('glow', '#d8f060', glow=True).ell(cx + d * 15, cy - 14, 1, 1)
        F.part('chitin', '#3a1e3e', bevel=4).ell(cx, cy, 14, 11)       # 머리 껍질
        F.part('chitin', '#5a2e5a', bevel=3).ell(cx, cy - 2.5, 12, 7.5)
        for k in range(3):                                            # 등판 마디
            fine(F, (cx - 11 + k * 0.5, cy - 4 + k * 3.2), (cx + 11 - k * 0.5, cy - 4 + k * 3.2), '#2a1424', 200)
        F.part('chitin', '#7a3e7a', bevel=2).poly([(cx - 4, cy - 10.5), (cx, cy - 13), (cx + 4, cy - 10.5), (cx, cy - 8)])   # 이마 뿔
        for (x, y, r) in ((-6, -3, 1.8), (6, -3, 1.8), (-9.5, 0, 1.3), (9.5, 0, 1.3), (-3.2, 1.5, 1.1), (3.2, 1.5, 1.1)):   # 눈 여섯
            F.part('glow', '#d8f060', glow=True).ell(cx + x, cy + y, r, r * 0.8)
            F.glow(cx + x, cy + y, r * 2.2, '#c8e050', 0.3)
        sp = 5 if opn else 1.5
        for d in (-1, 1):                                             # 큰 턱 — 낫처럼 휜 집게
            F.part('chitin', '#2a1424', bevel=2).poly([(cx + d * 3, cy + 6), (cx + d * (6 + sp), cy + 9), (cx + d * (4 + sp), cy + 15), (cx + d * (1 + sp * 0.3), cy + 13.5), (cx + d * 2.5, cy + 9)])
            F.part('chitin', '#c8b890', bevel=1).poly([(cx + d * (4 + sp), cy + 15), (cx + d * (2 + sp * 0.4), cy + 14), (cx + d * (3 + sp * 0.6), cy + 12)])
        if opn:
            F.part('flesh', '#5a1a2a', bevel=2).ell(cx, cy + 9, 4, 3.4)
            F.part('glow', BILE, glow=True).ell(cx, cy + 9.5, 2.6, 2)
            F.part('glow', BILE, glow=True).poly([(cx - 0.8, cy + 11), (cx + 0.8, cy + 11), (cx + 0.4, cy + 16), (cx, cy + 17), (cx - 0.4, cy + 16)])
    elif f in (2, 3):
        F.part('clay', '#b8954e', bevel=3).poly(hexpts(cx, cy, 9.6))
        for r2 in (7, 4.4):
            pts = hexpts(cx, cy, r2)
            for a, b2 in zip(pts, pts[1:] + pts[:1]):
                fine(F, a, b2, '#7a5a2a', 200)
        F.part('clay', '#e0c888', bevel=1).ell(cx - 2.5, cy - 3, 3, 2)
        if f == 3:
            crack(F, [(cx - 6, cy - 5), (cx - 1, cy), (cx - 3, cy + 6)], 0.55, BILE)
            crack(F, [(cx - 1, cy), (cx + 5, cy - 2), (cx + 7, cy + 4)], 0.5, BILE)
    else:
        for k in range(5):                                            # 애벌레 — 둥글게 말린 마디
            a = math.pi * 0.9 - k * 0.5
            F.part('flesh', '#e8dcc0' if k % 2 else '#d8c8a8', bevel=2).ell(cx + math.cos(a) * 7, cy + 4 + math.sin(a) * 6, 4.4 - k * 0.3, 4 - k * 0.3)
        F.part('flesh', '#c8a888', bevel=2).ell(cx - 7, cy + 2, 4.6, 4.2)
        F.part('stone', '#1a0e14', flat=True).ell(cx - 8.6, cy + 2.6, 1.6, 1.2)
        for d in (-1, 1):
            F.part('glow', '#d8f060', glow=True).ell(cx - 8 + d * 1.6, cy + 0.6, 0.6, 0.6)
    return F.render()


# ===== 판결석 좌상(first_keeper 자리) — 신전 뒷벽 벽감에 앉은 눈 가린 재판관 석상, 한 손에 저울 · 한 손은 몸짓 =====
MARB, MARB_D, MARB_L = '#bdb5a0', '#77705e', '#e2dccb'        # 대리석 · 그늘 · 빛 받는 면
ROBE, ROBE_D = '#9a9484', '#5e5a4e'                           # 옷 주름 돌
GILT, GILT_D, RUNE = '#d8b04a', '#7a5a1e', '#fff0b0'          # 금박 · 그늘 · 룬 빛
JD_W, JD_H = 96, 112                                          # 게임 entity/boss-judge.ts JD 와 같게


def judge_head(F, cx, hy, st, fall=0):
    """머리 — 뾰족한 두건 · 고요한 얼굴 · 금 눈가리개(st 1 금 · st 2 찢어져 늘어지고 외눈이 뜬다). 목 축 (cx, hy + 14)"""
    F.part('stone', ROBE_D, bevel=3).poly([(cx - 17, hy + 17), (cx - 14, hy + 8), (cx - 13, hy - 2), (cx - 7, hy - 13), (cx, hy - 17), (cx + 7, hy - 13), (cx + 13, hy - 2), (cx + 14, hy + 8), (cx + 17, hy + 17), (cx + 8, hy + 15), (cx - 8, hy + 15)])
    F.part('stone', ROBE, bevel=2).poly([(cx - 14, hy + 15), (cx - 11, hy + 7), (cx - 11, hy - 1), (cx - 6, hy - 11), (cx, hy - 15), (cx + 6, hy - 11), (cx + 11, hy - 1), (cx + 11, hy + 7), (cx + 14, hy + 15), (cx + 6, hy + 13), (cx - 6, hy + 13)])
    F.part('stone', MARB, bevel=3).poly([(cx - 8, hy - 7), (cx + 8, hy - 7), (cx + 9, hy + 4), (cx + 5, hy + 11), (cx - 5, hy + 11), (cx - 9, hy + 4)])
    F.part('stone', MARB_L, bevel=1.5).poly([(cx - 7, hy - 6), (cx - 2, hy - 6), (cx - 3, hy + 2), (cx - 7, hy + 3)])
    F.part('stone', MARB_D, bevel=1).box(cx - 0.8, hy - 1, 1.6, 6, 0.6)                 # 콧날
    F.part('stone', MARB_D, bevel=0.6).box(cx - 3, hy + 7, 6, 1, 0.4)                   # 다문 입
    if st < 2:                                                                          # 금 눈가리개 — 귀 뒤로 매듭
        F.part('metal', GILT, bevel=1.2).poly([(cx - 10, hy - 4), (cx + 10, hy - 4), (cx + 10, hy + 1), (cx - 10, hy + 1)])
        fine(F, (cx - 9, hy - 3.4), (cx + 9, hy - 3.4), '#fff0c0', 200)
        for s2 in (-1, 1):
            F.part('glow', RUNE, glow=True).ell(cx + s2 * 4, hy - 1.5, 1.2, 0.6)     # 천 너머로 비치는 눈빛
        if st == 1:
            crack(F, [(cx + 2, hy - 4), (cx + 3.5, hy - 1.5), (cx + 2.5, hy + 1)], 0.45, RUNE)
    else:                                                                               # 찢어진 가리개 — 한쪽이 늘어지고 가운데 외눈
        F.part('metal', GILT, bevel=1.2).poly([(cx - 10, hy - 4), (cx - 3, hy - 4), (cx - 4, hy + 1), (cx - 10, hy + 1)])
        F.part('metal', GILT_D, bevel=1).poly([(cx + 3, hy - 4), (cx + 10, hy - 4), (cx + 9, hy + 9), (cx + 6, hy + 12), (cx + 5, hy + 2)])
        F.part('stone', '#1c1812', bevel=0.8).ell(cx, hy - 1.5, 3.4, 2.4)
        F.part('glow', RUNE, glow=True).ell(cx, hy - 1.5, 2.2, 1.6)
        F.part('glow', '#ffffff', glow=True).ell(cx - 0.4, hy - 1.9, 0.8, 0.6)
        F.glow(cx, hy - 1.5, 7, RUNE, 0.45)
        crack(F, [(cx - 6, hy - 9), (cx - 4, hy - 4), (cx - 6.5, hy + 3), (cx - 4.5, hy + 9)], 0.45, RUNE)
    F.part('metal', GILT, bevel=1).poly([(cx - 4, hy - 12), (cx, hy - 16.5), (cx + 4, hy - 12), (cx, hy - 10)])   # 이마의 저울 문장


def judge_body(f):
    """몸 시트 8장(96×112 설계 칸 · 바닥 109) — 0·1 멀쩡(가슴 문장이 숨 쉰다) · 2·3 금(금빛이 새는 금) · 4·5 깨진 어깨 · 무너지는 벽감 · 6·7 쓰러짐.
       벽감(뒷벽에 판 아치) · 옥좌 · 앉은 몸(두건 망토 · 무릎 · 흘러내린 옷자락). 머리 · 팔 · 저울은 조각이라 게임이 움직인다"""
    W, H = JD_W, JD_H
    F = ZFig(W, H)
    cx, base = 48, 109
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    fall = 0 if f < 6 else (4 if f == 6 else 10)
    # 벽감 — 바깥 테(조각 띠) · 안의 깊은 그늘 · 아치 꼭대기 쐐기돌
    arch = lambda r, top, n=28: [(cx - r, base)] + [(cx + math.cos(math.pi + k / n * math.pi) * r, top + r + math.sin(math.pi + k / n * math.pi) * r) for k in range(n + 1)] + [(cx + r, base)]
    F.part('stone', MARB_D, bevel=4).poly(arch(46, 2))
    F.part('stone', '#c9c1aa', bevel=3).poly(arch(43, 5))
    F.part('stone', '#26221c', bevel=2).poly(arch(38, 10))
    for k in range(9):                                                                  # 아치 테의 돌 마디
        a = math.pi + (k + 0.5) / 9 * math.pi
        x0, y0 = cx + math.cos(a) * 38, 48 + math.sin(a) * 38
        x1, y1 = cx + math.cos(a) * 43, 48 + math.sin(a) * 43
        fine(F, (x0, y0), (x1, y1), MARB_D, 230)
    F.part('metal', GILT, bevel=2).poly([(cx - 5, 3), (cx + 5, 3), (cx + 3.5, 11), (cx - 3.5, 11)])
    F.part('glow', RUNE, glow=True).ell(cx, 7, 1.4, 1.6)
    # 옥좌 — 높은 등판(뾰족한 꼭대기) · 팔걸이
    F.part('stone', '#4a4436', bevel=3).poly([(cx - 22, 88), (cx - 22, 30), (cx - 12, 18), (cx, 12), (cx + 12, 18), (cx + 22, 30), (cx + 22, 88)])
    F.part('stone', '#5e5848', bevel=2).poly([(cx - 18, 86), (cx - 18, 31), (cx - 10, 21), (cx, 16), (cx + 10, 21), (cx + 18, 31), (cx + 18, 86)])
    for s2 in (-1, 1):
        F.part('stone', MARB_D, bevel=3).box(cx + s2 * 27 - 5, 62, 10, 28, 2)
        F.part('stone', MARB, bevel=2).box(cx + s2 * 27 - 6, 59, 12, 5, 2)
        F.part('metal', GILT, bevel=1).ell(cx + s2 * 27, 61.5, 1.8, 1.6)
    # 계단 받침
    F.part('stone', MARB_D, bevel=3).box(cx - 40, base - 8, 80, 8, 1)
    F.part('stone', MARB, bevel=3).box(cx - 34, base - 14, 68, 7, 1)
    fine(F, (cx - 33, base - 13.4), (cx + 33, base - 13.4), MARB_L, 220)
    # 무릎과 옷자락 — 무릎 둘이 앞으로, 그 사이로 옷이 흘러 발등을 덮는다
    for s2 in (-1, 1):
        x = cx + s2 * 12
        F.part('stone', ROBE, bevel=3).poly([(x - 9, 72 + fall * 0.4), (x + 9, 72 + fall * 0.4), (x + 9, base - 15), (x - 9, base - 15)])
        F.part('stone', '#b2ac9c', bevel=3).ell(x, 72 + fall * 0.4, 9.5, 6.5)
        F.part('stone', MARB_D, bevel=2).poly([(x - 8, base - 16), (x + 8, base - 16), (x + 9, base - 14), (x - 9, base - 14)])
    F.part('stone', ROBE_D, bevel=2).poly([(cx - 4, 74), (cx + 4, 74), (cx + 6, base - 14), (cx - 6, base - 14)])
    for k in range(7):                                                                  # 옷 주름 — 무릎에서 아래로 내리는 결
        x = cx - 18 + k * 6
        fine(F, (x, 79), (x + (k - 3) * 0.4, base - 16), ROBE_D, 200)
    # 몸통 — 좁아지는 허리 · 두건 망토가 목에서 둥근 어깨로 흘러내려 팔꿈치까지 덮는다 · 가슴에 저울 문장(속불)
    F.part('stone', ROBE, bevel=4).poly([(cx - 18, 40 + fall), (cx + 18, 40 + fall), (cx + 19, 54), (cx + 15, 72), (cx - 15, 72), (cx - 19, 54)])
    F.part('stone', '#aaa494', bevel=2).poly([(cx - 6, 44 + fall), (cx + 6, 44 + fall), (cx + 4, 70), (cx - 4, 70)])        # 가운데 앞섶
    for s2 in (-1, 1):
        sh = [(cx + s2 * 5, 30 + fall)] + [(cx + s2 * (6 + 19 * math.sin(k / 8 * math.pi / 2)), 30 + fall + 12 * (1 - math.cos(k / 8 * math.pi / 2))) for k in range(1, 9)]
        sh += [(cx + s2 * 26, 46 + fall), (cx + s2 * 24, 56), (cx + s2 * 17, 52), (cx + s2 * 12, 42 + fall)]
        F.part('stone', ROBE_D, bevel=3).poly(sh)
        F.part('stone', '#aaa494', bevel=1.5).poly([(cx + s2 * 7, 32 + fall), (cx + s2 * 15, 34 + fall), (cx + s2 * 13, 37 + fall), (cx + s2 * 8, 36 + fall)])
        fine(F, (cx + s2 * 15, 39 + fall), (cx + s2 * 21, 51), ROBE, 200)
    F.part('metal', GILT, bevel=1.5).box(cx - 18, 68, 36, 2.6, 1)                       # 허리띠
    F.part('metal', GILT_D, bevel=2).ell(cx, 51 + fall * 0.6, 8.5, 8.5)                 # 가슴 문장 — 금 고리 · 그 안 룬
    F.part('stone', '#2a2418', flat=True).ell(cx, 51 + fall * 0.6, 6.6, 6.6)
    if f < 6:
        lit = RUNE if b else '#f0d890'
        F.part('glow', lit, glow=True).box(cx - 0.6, 46 + fall * 0.6, 1.2, 9, 0.3)
        F.part('glow', lit, glow=True).box(cx - 4.5, 47.5, 9, 1.1, 0.3)
        for s2 in (-1, 1):
            F.part('glow', lit, glow=True).ell(cx + s2 * 3.6, 52.5, 1.6, 0.7)
        F.glow(cx, 51, 9 + b * 2, RUNE, 0.3 + b * 0.1)
    # 목 — 머리는 조각(0~2). 쓰러지는 장만 머리를 몸에 같이 그린다
    F.part('stone', MARB_D, bevel=2).box(cx - 5, 30 + fall, 10, 8, 2)
    if fall:
        judge_head(F, cx, 20 + fall, 2)
    if st >= 1:
        crack(F, [(cx + 17, 40 + fall), (cx + 13, 48), (cx + 16, 57), (cx + 12, 66)], 0.5, RUNE)
        crack(F, [(cx - 36, 30), (cx - 33, 40), (cx - 35, 50)], 0.45, RUNE)
    if st >= 2:
        crack(F, [(cx - 18, 44 + fall), (cx - 14, 54), (cx - 17, 62)], 0.5, RUNE)
        crack(F, [(cx + 10, 76), (cx + 13, 86), (cx + 9, 94)], 0.45, RUNE)
        crack(F, [(cx + 30, 14), (cx + 34, 24), (cx + 31, 34)], 0.45, RUNE)
        for (x, y) in ((cx + 23, 37 + fall), (cx - 8, 82)):
            F.part('stone', MARB_D, flat=True).ell(x, y, 3, 2.2)
            fine(F, (x - 2.6, y - 1), (x + 2.6, y + 1), MARB_L, 220)
    if fall:
        for k in range(10):
            x = cx - 38 + k * 7.8 + (k % 2) * 2
            F.part('stone', MARB if k % 2 else MARB_D, bevel=2).poly([(x, base - 1), (x + 4, base - 6 - (k % 3) * 2), (x + 9, base - 3), (x + 8, base - 1)])
    return F.render()


def judge_parts(f):
    """조각 11장(40×44 설계 칸) — 0~2 머리(목 축 (20, 34)) · 3 윗소매 · 4 아랫소매(가로 · 8→32) · 5 편 손바닥 · 6 가리키는 손 · 7 쥔 손(손목 (8, 22) · 손끝 +x)
       · 8 저울대(가운데 (20, 22) · 양끝 고리) · 9 접시(가운데 (20, 22)) · 10 증언 석판(밑동 (20, 41))"""
    F = ZFig(40, 44)
    cx = 20
    if f <= 2:
        judge_head(F, cx, 20, f)
    elif f in (3, 4):
        r0, r1 = (7.5, 6.5) if f == 3 else (6.5, 5)
        F.part('stone', ROBE, bevel=3).cap(8, 22, 32, 22, r0, r1)
        F.part('stone', '#b2ac9c', bevel=2).cap(9, 19.5, 30, 20, r0 * 0.35, r1 * 0.3)
        for k in range(3):
            fine(F, (12 + k * 6, 22 + r0 * 0.6), (16 + k * 6, 22 - r0 * 0.4), ROBE_D, 200)
        if f == 4:
            F.part('metal', GILT, bevel=1.2).box(28, 22 - r1 - 0.5, 3, r1 * 2 + 1, 1)    # 소맷부리 금테
    elif f == 5:                                                                        # 편 손바닥 — 손가락 넷이 +x 로 · 엄지는 위
        F.part('stone', MARB, bevel=3).box(7, 16, 14, 12, 4)
        for k in range(4):
            F.part('stone', MARB_L if k % 2 else MARB, bevel=1.4).cap(20, 17.5 + k * 3, 31 - abs(k - 1.5), 17.5 + k * 3, 1.5, 1.3)
        F.part('stone', MARB_D, bevel=1.4).cap(12, 16, 17, 10, 1.8, 1.5)
        F.part('glow', RUNE, glow=True).ell(14, 22, 2.2, 2.2)                         # 손바닥의 룬
    elif f == 6:                                                                        # 가리키는 손 — 검지만 뻗고 나머지는 말아 쥔다
        F.part('stone', MARB, bevel=3).box(7, 16, 15, 13, 5)
        F.part('stone', MARB_L, bevel=1.5).cap(20, 18, 34, 18, 1.6, 1.4)
        for k in range(3):
            F.part('stone', MARB_D, bevel=1).box(19, 21 + k * 2.6, 4, 2.4, 1)
        F.part('stone', MARB_D, bevel=1.4).cap(12, 16, 17, 12, 1.8, 1.5)
    elif f == 7:                                                                        # 쥔 손 — 저울 고리를 움켜쥔다
        F.part('stone', MARB, bevel=4).box(7, 15, 16, 15, 6)
        for k in range(4):
            F.part('stone', MARB_L, bevel=2).box(19, 15.5 + k * 3.6, 5, 3.2, 1.4)
        F.part('stone', MARB_D, bevel=2).box(8, 13, 7, 6, 2)
    elif f == 8:                                                                        # 저울대 — 금 막대 · 가운데 고리와 바늘 · 양끝 갈고리
        F.part('metal', GILT, bevel=1.6).box(2, 20.6, 36, 2.8, 1.2)
        F.part('metal', GILT_D, bevel=1).box(2, 22.8, 36, 0.8, 0.3)
        F.part('metal', GILT, bevel=1.6).ell(20, 22, 3.2, 3.2)
        F.part('stone', '#2a2418', flat=True).ell(20, 22, 1.4, 1.4)
        F.part('metal', GILT, bevel=1).poly([(19.2, 18.5), (20.8, 18.5), (20, 9)])       # 바늘(위로)
        for x in (3, 37):
            F.part('metal', GILT_D, bevel=1).ell(x, 24.5, 1.6, 1.6)
        F.part('glow', RUNE, glow=True).ell(20, 22, 0.8, 0.8)
    elif f == 9:                                                                        # 접시 — 얕은 금 대접 · 테 · 룬 한 자
        F.part('metal', GILT_D, bevel=1.5).poly([(8, 21), (32, 21), (29, 26), (24, 28), (16, 28), (11, 26)])
        F.part('metal', GILT, bevel=1.4).box(7, 19.6, 26, 2.2, 1)
        fine(F, (8, 20.2), (32, 20.2), '#fff0c0', 210)
        F.part('glow', RUNE, glow=True).box(19.4, 23, 1.2, 3, 0.3)
    else:                                                                               # 증언 석판 — 둥근 머리 돌판 · 새긴 룬 줄
        F.part('stone', MARB_D, bevel=3).poly([(11, 41), (11, 12), (14, 7), (20, 5), (26, 7), (29, 12), (29, 41)])
        F.part('stone', MARB, bevel=2).poly([(13, 40), (13, 13), (15.5, 9), (20, 7.5), (24.5, 9), (27, 13), (27, 40)])
        for k in range(6):
            y = 14 + k * 4.2
            F.part('glow', RUNE, glow=True).box(15.5, y, 9 - (k % 3) * 2, 1, 0.3)
        F.glow(20, 24, 6, RUNE, 0.25)
    return F.render()


# ===== 일식(pursuer 자리) — 하늘에 뚫린 별의 음화: 검은 원판 · 보랏빛 코로나 · 가운데 외눈 · 그림자 손 =====
VOIDK, CORONA, CORONA_L, RIM = '#07050c', '#b48aff', '#f0e0ff', '#ffe6b0'
EC_W = 136                                                     # 게임 game/boss-eclipse-art.ts EC 와 같게(가운데 68, 68 · 원판 반지름 36)


def eclipse_body(f):
    """몸 시트 8장(136×136 설계 칸) — 0·1 코로나가 일렁인다 · 2·3 빛의 금 · 4·5 테가 깨지고 코로나가 사납다 · 6·7 무너짐(원판이 조각나며 줄어든다).
       원판 속은 거의 검다 — 별이 있어야 할 자리에 검은 별(음화)이 희미한 테두리만 남는다. 눈은 조각(0~2)이라 게임이 뜨고 감긴다"""
    F = ZFig(EC_W, EC_W)
    cx = cy = 68
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dying = f >= 6
    R = 36 if not dying else (30 if f == 6 else 22)
    state = [97 + f * 13]

    def rnd():
        state[0] = state[0] * 48271 % 2147483647
        return state[0] / 2147483647
    if not dying:                                              # 코로나 — 부드러운 빛무리 + 테에서 휘어 나가는 가는 빛줄기(막이 오를수록 길고 사납다)
        F.glow(cx, cy, R + 12 + st * 3, CORONA, 0.34 + b * 0.05)
        F.glow(cx, cy, R + 5, CORONA_L, 0.36)
        for k in range(22):
            a = k / 22 * math.tau + (rnd() - 0.5) * 0.12 + b * 0.05
            ln = 9 + rnd() * (8 + st * 4) + (5 if k % 5 == 0 else 0)
            bend = (rnd() - 0.5) * 0.5
            pts = []
            for j in range(7):
                u = j / 6
                aa = a + bend * u * u
                pts.append((cx + math.cos(aa) * (R + ln * u), cy + math.sin(aa) * (R + ln * u)))
            w0 = 1.1 + rnd() * 0.9
            L, Rr = [], []
            for j, (x, y) in enumerate(pts):
                x2, y2 = pts[min(j + 1, 6)]; x1, y1 = pts[max(j - 1, 0)]
                dx, dy = x2 - x1, y2 - y1; d = math.hypot(dx, dy) or 1
                ww = w0 * (1 - j / 6) + 0.05
                L.append((x - dy / d * ww, y + dx / d * ww)); Rr.append((x + dy / d * ww, y - dx / d * ww))
            F.part('glow', CORONA_L if k % 3 == 0 else CORONA, glow=True).poly(L + Rr[::-1])
    F.part('stone', VOIDK, flat=True).ell(cx, cy, R, R)               # 원판 — 빛을 먹은 구멍
    for k in range(5):                                         # 음화의 별 — 검은 별의 희미한 테
        a = k / 5 * math.tau + 0.4
        sx, sy, sr = cx + math.cos(a) * R * 0.55, cy + math.sin(a) * R * 0.5, 2.6 + rnd() * 1.6
        pts = [(sx + math.cos(j / 10 * math.tau - math.pi / 2) * (sr if j % 2 == 0 else sr * 0.42), sy + math.sin(j / 10 * math.tau - math.pi / 2) * (sr if j % 2 == 0 else sr * 0.42)) for j in range(10)]
        for (p0, p1) in zip(pts, pts[1:] + pts[:1]):
            fine(F, p0, p1, '#5a3a8a', 170)
    for k in range(64):                                        # 테 — 금빛 고리(다이아몬드 고리), 한 점이 가장 밝다
        a = k / 64 * math.tau
        if dying and rnd() < 0.35:
            continue
        x0, y0 = cx + math.cos(a) * R, cy + math.sin(a) * R
        x1, y1 = cx + math.cos(a + math.tau / 64) * R, cy + math.sin(a + math.tau / 64) * R
        fine(F, (x0, y0), (x1, y1), RIM if (k + b * 7) % 9 else '#ffffff', 255)
    ba = 2.3 + b * 0.5
    F.part('glow', '#ffffff', glow=True).ell(cx + math.cos(ba) * R, cy + math.sin(ba) * R, 2.2, 2.2)
    F.glow(cx + math.cos(ba) * R, cy + math.sin(ba) * R, 7, RIM, 0.55)
    if st >= 1:
        crack(F, [(cx - 20, cy - 26), (cx - 12, cy - 12), (cx - 16, cy + 2)], 0.6, CORONA_L)
        crack(F, [(cx + 30, cy + 10), (cx + 18, cy + 16), (cx + 14, cy + 28)], 0.55, CORONA_L)
    if st >= 2:
        crack(F, [(cx + 6, cy - 34), (cx + 10, cy - 20), (cx + 4, cy - 10)], 0.6, RIM)
        crack(F, [(cx - 34, cy + 12), (cx - 22, cy + 18), (cx - 18, cy + 30)], 0.5, RIM)
        for k in range(3):                                     # 깨져 나간 테 — 빛이 새는 홈
            a = 0.8 + k * 2.1
            F.part('stone', VOIDK, flat=True).ell(cx + math.cos(a) * R, cy + math.sin(a) * R, 3.4, 3.4)
    if dying:                                                  # 조각 — 원판에서 떨어져 나가는 검은 파편과 그 테
        for k in range(9):
            a = k / 9 * math.tau + rnd()
            d = R + 6 + rnd() * 14 + (f - 6) * 8
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
            F.part('stone', VOIDK, flat=True).poly([(x - 3, y - 1), (x + 1, y - 4), (x + 4, y + 1), (x - 1, y + 3)])
            fine(F, (x - 3, y - 1), (x + 1, y - 4), RIM, 200)
        F.glow(cx, cy, R + 10, CORONA_L, 0.25)
    return F.render()


def eclipse_parts(f):
    """조각 7장(48×48 설계 칸) — 0~2 눈(감김 · 반쯤 · 뜸, 가운데 (24, 24)) · 3 편 그림자 손 · 4 움켜쥔 손(손목 (24, 4) · 손끝 아래)
       · 5 팔뚝 마디(세로, 위아래로 이어 그린다) · 6 별 파편"""
    F = ZFig(48, 48)
    cx = 24
    if f <= 2:
        op = (0.0, 0.45, 1.0)[f]
        F.glow(cx, 24, 14, CORONA, 0.25 + op * 0.25)
        lid = [(cx - 15, 24)] + [(cx + math.cos(math.pi - k / 12 * math.pi) * 15, 24 - math.sin(k / 12 * math.pi) * (1.2 + 7.5 * op)) for k in range(13)] + \
              [(cx + math.cos(k / 12 * math.pi) * 15, 24 + math.sin(k / 12 * math.pi) * (1.0 + 6.5 * op)) for k in range(13)]
        F.part('glow', CORONA_L, glow=True).poly(lid)
        if op > 0.1:
            F.part('stone', '#1a0e2a', flat=True).ell(cx, 24, 6 + op * 1.5, (1 + 6 * op) * 0.95)
            F.part('glow', '#ffffff', glow=True).poly([(cx + math.cos(j / 8 * math.tau - math.pi / 2) * (3.4 if j % 2 == 0 else 1.2) * op, 24 + math.sin(j / 8 * math.tau - math.pi / 2) * (3.4 if j % 2 == 0 else 1.2) * op) for j in range(8)])
        else:
            fine(F, (cx - 14, 24), (cx + 14, 24), '#ffffff', 255)
    elif f in (3, 4):
        curl = f == 4
        F.part('stone', '#0c0814', bevel=3).poly([(cx - 8, 2), (cx + 8, 2), (cx + 11, 18), (cx + 9, 24), (cx - 9, 24), (cx - 11, 18)])   # 손등
        for k in range(4):                                     # 손가락 — 아래로 벌어지거나(편 손) 움켜쥔다
            x0 = cx - 9 + k * 6
            if curl:
                pts = [(x0, 22), (x0 + 1, 31), (x0 + (k - 1.5) * 1.2, 36), (x0 + 3 - (k - 1.5) * 0.5, 33)]
            else:
                pts = [(x0, 22), (x0 + (k - 1.5) * 2.4, 34), (x0 + (k - 1.5) * 3.6, 44 - abs(k - 1.5) * 2)]
            for (a, b2) in zip(pts, pts[1:]):
                F.part('stone', '#120c1e', bevel=1.4).cap(a[0], a[1], b2[0], b2[1], 2.2, 1.6)
            tip = pts[-1]
            F.part('glow', CORONA_L, glow=True).ell(tip[0], tip[1], 0.9, 0.9)
        F.part('stone', '#120c1e', bevel=1.4).cap(cx + 10, 16, cx + 16 + (0 if curl else 3), 26 + (2 if curl else 6), 2.2, 1.7)   # 엄지
        for k in range(6):                                     # 속의 별 — 그림자 속에 박힌 작은 빛
            F.part('glow', CORONA_L if k % 2 else CORONA, glow=True).ell(cx - 6 + (k * 37 % 13), 6 + (k * 23 % 16), 0.6, 0.6)
        F.glow(cx, 18, 10, CORONA, 0.22)
    elif f == 5:                                               # 팔뚝 — 위아래 끝이 그대로 이어지게(벽에 닿지 않게 가로만 좁힌다)
        F.part('stone', '#0c0814', flat=True).box(cx - 7, 0, 14, 48, 0)
        F.part('stone', '#160e24', flat=True).box(cx - 4, 0, 4, 48, 0)
        for k in range(5):
            F.part('glow', CORONA, glow=True).ell(cx - 3 + (k * 29 % 7), 5 + k * 9, 0.5, 0.5)
        fine(F, (cx - 7, 0), (cx - 7, 47.8), '#5a3a8a', 180); fine(F, (cx + 7, 0), (cx + 7, 47.8), '#3a2458', 180)
    else:                                                      # 별 파편 — 무너질 때 흩어지는 조각
        F.part('stone', VOIDK, flat=True).poly([(14, 20), (24, 10), (34, 18), (30, 32), (18, 34)])
        for (a, b2) in (((14, 20), (24, 10)), ((24, 10), (34, 18))):
            fine(F, a, b2, RIM, 230)
        F.glow(24, 22, 6, CORONA, 0.3)
    return F.render()


# ===== 뿌리 대성당(vine_lord 자리) — 정글 뒷벽에 박힌 속 빈 고목: 뾰족 아치의 빈 속(입)과 그 위 옹이 눈 · 펼친 뿌리 · 두 큰 가지 =====
BARK, BARK_D, BARK_L = '#5a4230', '#33251a', '#806048'       # 나무껍질 · 그늘 · 빛 받는 결
MOSS, MOSS_D, SAP = '#5f8a3c', '#3a5a26', '#d8f080'          # 이끼 · 그늘 · 수액빛
LEAF, LEAF_D, LEAF_L = '#4f8a3a', '#2e5a26', '#8cc860'
PETAL, PETAL_D = '#f0b8d8', '#b86a98'
RT_W, RT_H = 104, 120                                         # 게임 entity/boss-root.ts RT 와 같게(바닥 117 · 판정 가운데 52, 84)


def _bark_lines(F, x0, y0, x1, y1, n, seed, col=BARK_D, a=200):
    """세로 껍질 결 — 위아래로 흐르며 살짝 휜다"""
    for k in range(n):
        u = (k + 0.5) / n
        x = x0 + (x1 - x0) * u
        w = math.sin(seed + k * 1.7) * 1.4
        fine(F, (x, y0 + (k % 3) * 2), (x + w, y1 - (k % 2) * 3), col, a)


def root_body(f):
    """몸 시트 8장(104×120 · 바닥 117) — 0·1 숨(빈 속 빛이 차고 빠진다 · 이끼 흔들림) · 2·3 수액이 새는 금 · 4·5 벗겨진 껍질 · 깊은 금 · 6·7 쓰러짐(줄기가 갈라지며 주저앉는다).
       눈(옹이 속 눈동자) · 두 큰 가지 · 우듬지 · 아랫입술은 조각이라 게임이 움직인다"""
    F = ZFig(RT_W, RT_H)
    cx, base = 52, 117
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    sag = 0 if f < 6 else (5 if f == 6 else 12)
    # 뿌리 — 줄기 밑에서 양옆으로 펼쳐져 바닥에 박힌다(굵게 · 끝으로 가늘게)
    for (s2, ex, ey, r0) in ((-1, 4, 116, 6), (-1, 14, 112, 5), (-1, 30, 116, 5), (1, 100, 116, 6), (1, 90, 112, 5), (1, 74, 116, 5)):
        sx0 = cx + s2 * 16
        F.part('wood', BARK_D, bevel=3).cap(sx0, 104, (sx0 + ex) / 2, 108 + (ey - 108) * 0.4 - 3, r0, r0 * 0.7)
        F.part('wood', BARK, bevel=2).cap((sx0 + ex) / 2, 108 + (ey - 108) * 0.4 - 3, ex, ey, r0 * 0.7, 1.2)
    # 줄기 — 밑동이 넓고 위로 좁아진다 · 위에서 두 갈래 어깨(가지가 붙는 자리)
    def half(sd):                                                                       # 옆선 — 밑동이 불룩하고 허리가 잘록 · 마디마다 울퉁불퉁
        pts = []
        for k in range(23):
            y = base - 2 - k * (base - 30 - sag) / 22
            u = (base - y) / (base - 30)
            w = 29 - 10 * min(1, u * 1.6) + 3 * max(0, u - 0.75) * 4 + math.sin(k * 1.9 + sd) * 1.3
            pts.append((cx + sd * w, y))
        return pts
    L, R = half(-1), half(1)
    top = [(cx - 30, 22 + sag), (cx - 18, 17 + sag), (cx - 9, 24 + sag), (cx, 19 + sag), (cx + 9, 24 + sag), (cx + 18, 17 + sag), (cx + 30, 22 + sag)]
    trunk = L + top + R[::-1]
    F.part('wood', BARK_D, bevel=5).poly(trunk)
    F.part('wood', BARK, bevel=4).poly([(x + (cx - x) * 0.1, y + 1.5) for (x, y) in trunk])
    for (bx, w0) in ((-17, 5), (-2, 4), (14, 5)):                                       # 굵은 버팀 골 — 그늘 띠 + 왼쪽 날의 빛
        pts = [(cx + bx + math.sin(k * 0.8 + bx) * 1.2, base - 3 - k * 7) for k in range(12)]
        for (a, b2) in zip(pts, pts[1:]):
            F.part('wood', BARK_D, bevel=1).cap(a[0], a[1], b2[0], b2[1], w0 * 0.45, w0 * 0.42)
            fine(F, (a[0] - w0 * 0.5, a[1]), (b2[0] - w0 * 0.5, b2[1]), BARK_L, 170)
    _bark_lines(F, cx - 24, 26 + sag, cx + 24, base - 4, 9, 1.3, '#2a1d14', 150)
    for (x, y) in ((cx - 17, 84), (cx + 18, 40 + sag), (cx - 14, 32 + sag)):         # 옹이
        F.part('wood', BARK_D, bevel=1.5).ell(x, y, 2.6, 3.4)
        F.part('wood', '#1e140c', flat=True).ell(x, y + 0.4, 1.2, 1.8)
    # 빈 속 — 뾰족 아치(대성당 문) · 기둥처럼 선 껍질 테 · 안쪽의 장미창(수액빛) — 이 아치가 입이다
    ah, aw = 104, 13 + st * 2
    arch = [(cx - aw, ah)] + [(cx - aw + aw * (1 - math.cos(k / 10 * math.pi / 2)) , ah - 26 - 14 * math.sin(k / 10 * math.pi / 2)) for k in range(11)]
    arch += [(cx + aw - aw * (1 - math.cos(k / 10 * math.pi / 2)), ah - 26 - 14 * math.sin(k / 10 * math.pi / 2)) for k in range(10, -1, -1)] + [(cx + aw, ah)]
    F.part('wood', BARK_L, bevel=3).poly([(x + (2.5 if x > cx else -2.5), y + (0 if y > 90 else -2.5)) for (x, y) in arch])
    F.part('wood', '#120c08', flat=True).poly(arch)
    F.part('wood', '#1c140d', flat=True).poly([(x + (cx - x) * 0.25, y + (ah - y) * 0.12) for (x, y) in arch])
    rose = SAP if b else '#b8d070'
    ry0 = 76
    F.part('glow', rose, glow=True).ell(cx, ry0, 5.5 + b * 0.5, 5.5 + b * 0.5)
    F.part('wood', '#120c08', flat=True).ell(cx, ry0, 3.6, 3.6)
    for k in range(8):                                                                   # 장미창 살 — 수액빛이 바퀴살로
        a = k / 8 * math.tau
        fine(F, (cx + math.cos(a) * 1.2, ry0 + math.sin(a) * 1.2), (cx + math.cos(a) * 5.2, ry0 + math.sin(a) * 5.2), rose, 230)
    F.glow(cx, ry0, 9 + b * 2, SAP, 0.28 + b * 0.08)
    for s2 in (-1, 1):                                                                   # 기둥 껍질 — 아치 양옆
        F.part('wood', BARK_D, bevel=2).box(cx + s2 * (aw + 3) - 2, 82, 4, 22, 1.5)
    # 얼굴 — 이마 주름 · 옹이 눈구멍 둘(눈동자는 게임이 그린다) · 코 마루
    F.part('wood', BARK_D, bevel=3).poly([(cx - 20, 50), (cx - 6, 45), (cx, 47), (cx + 6, 45), (cx + 20, 50), (cx + 18, 54), (cx + 6, 50), (cx, 52), (cx - 6, 50), (cx - 18, 54)])
    for s2 in (-1, 1):
        F.part('wood', BARK_L, bevel=2).ell(cx + s2 * 11, 56, 6.2, 4.6)
        F.part('wood', '#0c0806', flat=True).ell(cx + s2 * 11, 56.4, 4.4, 3.2)
    F.part('wood', BARK_L, bevel=2).poly([(cx - 2, 53), (cx + 2, 53), (cx + 3.5, 64), (cx, 66), (cx - 3.5, 64)])
    # 이끼 · 늘어진 덩굴 — 이마와 어깨에서 늘어진다(숨에 따라 길이가 조금 다르다)
    F.part('leaf', MOSS, bevel=2).poly([(cx - 22, 48), (cx - 10, 44), (cx - 4, 47), (cx - 14, 51)])
    F.part('leaf', MOSS, bevel=2).poly([(cx + 24, 30 + sag), (cx + 30, 24 + sag), (cx + 32, 30 + sag), (cx + 26, 34 + sag)])
    for (x, y0, L) in ((cx - 19, 50, 14), (cx - 14, 51, 9), (cx + 26, 33 + sag, 18), (cx + 29, 31 + sag, 11), (cx - 26, 30 + sag, 16)):
        L2 = L + b * 1.5
        F.part('leaf', MOSS_D, bevel=1).cap(x, y0, x + math.sin(x) * 1.5, y0 + L2, 0.8, 0.5)
        F.part('leaf', LEAF_L, bevel=0.8).ell(x + math.sin(x) * 1.5, y0 + L2, 1.2, 1.4)
    # 막마다 — 수액이 새는 금 · 벗겨진 껍질
    if st >= 1:
        crack(F, [(cx + 21, 58), (cx + 17, 68), (cx + 21, 80), (cx + 16, 90)], 0.55, SAP)
        crack(F, [(cx - 22, 40 + sag), (cx - 17, 47), (cx - 20, 58)], 0.45, SAP)
    if st >= 2:
        crack(F, [(cx - 6, 24 + sag), (cx - 3, 32 + sag), (cx - 7, 40)], 0.5, SAP)
        crack(F, [(cx - 24, 70), (cx - 19, 80), (cx - 25, 94)], 0.5, SAP)
        for (x, y) in ((cx + 12, 36 + sag), (cx - 13, 92)):                             # 벗겨진 껍질 — 찢긴 테두리 · 속살은 결이 선다
            pe = [(x + math.cos(k / 9 * math.tau) * (3.2 + 1.6 * ((k * 5) % 3) / 2), y + math.sin(k / 9 * math.tau) * (5 + 1.5 * ((k * 7) % 3) / 2)) for k in range(9)]
            F.part('wood', '#2a1d14', bevel=0.8).poly([(a + (a - x) * 0.18, b2 + (b2 - y) * 0.12) for (a, b2) in pe])
            F.part('wood', '#b0905e', bevel=1.2).poly(pe)
            _bark_lines(F, x - 2.5, y - 4, x + 2.5, y + 4, 3, 2.2, '#86643e', 220)
    if sag:                                                                              # 쓰러짐 — 가운데가 갈라져 수액이 흐른다
        crack(F, [(cx, 22 + sag), (cx + 2, 40 + sag), (cx - 1, 60), (cx + 1, 76)], 0.9, SAP)
        for k in range(8):
            x = cx - 34 + k * 9.5
            F.part('wood', BARK if k % 2 else BARK_D, bevel=2).poly([(x, base - 1), (x + 3, base - 5 - (k % 3) * 2), (x + 8, base - 3), (x + 7, base - 1)])
    return F.render()


def root_crown(f):
    """우듬지 3장(120×60 · 밑 가운데 (60, 57)이 줄기 꼭대기) — 0 무성 · 1 꽃이 핀다(막 1) · 2 성기고 시든다(막 2)"""
    F = ZFig(120, 60)
    rnd_s = [0.3, 1.7, 2.9, 4.1, 5.3, 0.9, 2.2, 3.6, 4.8, 1.1, 2.6, 3.9, 5.6, 0.5]
    blobs = [(60, 26, 22, 15), (34, 34, 18, 12), (86, 34, 18, 12), (16, 44, 12, 8), (104, 44, 12, 8), (48, 14, 14, 10), (74, 14, 14, 10),
             (24, 26, 12, 9), (96, 26, 12, 9), (60, 44, 20, 9)]
    # 가지 — 잎보다 먼저(잎 사이로 몇 군데만 비친다)
    for (ex, ey) in ((30, 30), (90, 30), (50, 16), (70, 16), (14, 44), (106, 44)):
        F.part('wood', BARK_D, bevel=1.5).cap(60, 57, ex, ey, 3, 0.8)
    keep = 1.0 if f < 2 else 0.72
    for i, (x, y, rx, ry) in enumerate(blobs):
        if f == 2 and i % 3 == 2:
            continue
        F.part('leaf', LEAF_D if f < 2 else '#5a5a2a', bevel=4).ell(x, y + 2, rx * keep, ry * keep)
    for i, (x, y, rx, ry) in enumerate(blobs):
        if f == 2 and i % 3 == 2:
            continue
        F.part('leaf', LEAF if f < 2 else '#7a7a3a', bevel=3).ell(x - 1, y, rx * 0.85 * keep, ry * 0.8 * keep)
        F.part('leaf', LEAF_L if f < 2 else '#9a904a', bevel=2).ell(x - rx * 0.3, y - ry * 0.35, rx * 0.4 * keep, ry * 0.35 * keep)
    if f == 1:                                                                           # 꽃 — 분홍 꽃송이가 잎 사이에
        for k in range(14):
            x = 14 + (k * 37) % 92; y = 10 + (k * 23) % 38
            F.part('glow', PETAL, glow=True).ell(x, y, 1.8, 1.6)
            F.part('glow', '#fff0a0', glow=True).ell(x, y, 0.6, 0.6)
    if f == 2:
        for k in range(6):
            x = 18 + k * 17; y = 50 - (k % 3) * 6
            fine(F, (x, y), (x + 3, y + 5), BARK_D, 220)
    return F.render()


def root_parts(f):
    """조각 8장(64×40 설계 칸) — 0 큰 가지(밑동 (7, 20) → +x · 잎 다발) · 1 시든 가지 · 2 솟는 뿌리(밑 (32, 39) → 위로) · 3 꽃봉오리 · 4 핀 꽃(가운데 (32, 22))
       · 5 쓰러지는 줄기 토막(가로로 이어 붙인다 · 가운데 줄 20) · 6 줄기 단면(나이테 · 가운데 (20, 20)) · 7 아랫입술(빈 속의 아래 테 · 가운데 (32, 20))"""
    F = ZFig(64, 40)
    if f in (0, 1):
        dead = f == 1
        F.part('wood', BARK_D, bevel=3).cap(7, 20, 56, 16, 6, 2)
        F.part('wood', BARK, bevel=2).cap(8, 18.5, 54, 15, 4, 1.2)
        _bark_lines(F, 6, 17, 50, 21, 4, 0.7, BARK_D, 160)
        for (bx, by, ex, ey) in ((22, 18, 30, 8), (36, 17, 45, 27), (44, 16, 51, 7), (50, 15, 56, 22)):
            F.part('wood', BARK, bevel=1).cap(bx, by, ex, ey, 1.6, 0.6)
            if not dead:
                F.part('leaf', LEAF_D, bevel=2).ell(ex, ey, 5, 4)
                F.part('leaf', LEAF, bevel=1.5).ell(ex - 0.6, ey - 0.6, 3.8, 3)
                F.part('leaf', LEAF_L, bevel=1).ell(ex - 1.4, ey - 1.4, 1.6, 1.2)
        if not dead:
            F.part('leaf', MOSS, bevel=1.5).poly([(8, 14), (20, 13), (22, 16), (10, 17)])
        else:
            crack(F, [(14, 18), (20, 20), (28, 18)], 0.4, SAP)
    elif f == 2:
        F.part('wood', BARK_D, bevel=3).poly([(25, 39), (27, 26), (29.5, 12), (32, 2), (34.5, 12), (37, 26), (39, 39)])
        F.part('wood', BARK, bevel=2).poly([(27.5, 39), (29, 26), (31, 13), (32, 5), (33, 13), (35, 26), (36.5, 39)])
        _bark_lines(F, 29, 10, 35, 38, 3, 2.1, BARK_D, 200)
        for (x, y, s2) in ((28, 30, -1), (36, 22, 1), (29.5, 16, -1)):                  # 잔뿌리 가시
            F.part('wood', BARK, bevel=1).cap(x, y, x + s2 * 5, y - 3, 1.2, 0.4)
        F.part('leaf', MOSS, bevel=1).ell(31, 34, 3.5, 1.6)
    elif f == 3:
        F.part('leaf', LEAF_D, bevel=1.5).cap(32, 39, 32, 26, 1.2, 1)
        F.part('leaf', LEAF, bevel=1.2).ell(28, 33, 3.2, 1.4, -0.5)
        F.part('glow', PETAL_D, glow=True).ell(32, 23, 3.2, 4.2)
        F.part('leaf', LEAF, bevel=1).poly([(29, 26), (32, 19), (35, 26), (32, 27)])
    elif f == 4:
        F.part('leaf', LEAF_D, bevel=1.5).cap(32, 39, 32, 26, 1.2, 1)
        for k in range(6):                                                               # 꽃잎 여섯 — 바깥이 짙고 안이 밝다
            a = k / 6 * math.tau - math.pi / 2
            px, py = 32 + math.cos(a) * 6.5, 22 + math.sin(a) * 6
            F.part('glow', PETAL_D, glow=True).ell(px, py, 4.6, 3.2, a)
            F.part('glow', PETAL, glow=True).ell(32 + math.cos(a) * 5.4, 22 + math.sin(a) * 5, 3.2, 2.2, a)
        F.part('glow', '#ffe070', glow=True).ell(32, 22, 2.8, 2.8)
        F.part('glow', '#fffbe0', glow=True).ell(31.4, 21.4, 1, 1)
        F.glow(32, 22, 9, PETAL, 0.3)
    elif f == 5:
        F.part('wood', BARK_D, bevel=3).box(0, 12, 64, 16, 3)
        F.part('wood', BARK, bevel=2).box(0, 13.5, 64, 11, 2)
        _bark_lines(F, 2, 14, 62, 14.5, 9, 0.4, BARK_D, 0)
        for k in range(9):
            fine(F, (k * 7 + 1, 15 + (k % 2)), (k * 7 + 6, 15.4 + (k % 2)), BARK_D, 210)
            fine(F, (k * 7 + 3, 21 - (k % 2)), (k * 7 + 7, 21.5 - (k % 2)), BARK_D, 190)
        F.part('leaf', MOSS, bevel=1.5).poly([(10, 12), (24, 11), (26, 13.5), (12, 14)])
        F.part('leaf', MOSS, bevel=1.5).poly([(40, 12), (52, 11.5), (53, 13.5), (41, 13.8)])
    elif f == 6:
        F.part('wood', BARK_D, bevel=3).ell(20, 20, 15, 15)
        F.part('wood', '#c8a070', bevel=2).ell(20, 20, 12.5, 12.5)
        for r in (10.5, 8.5, 6.5, 4.5, 2.6):                                            # 나이테
            for k in range(36):
                a = k / 36 * math.tau
                Fig.px(F, (20 + math.cos(a) * r) * K, (20 + math.sin(a) * r) * K, '#8a6040', 230)
        F.part('glow', SAP, glow=True).ell(20, 20, 1.4, 1.4)
    else:
        F.part('wood', BARK_D, bevel=3).poly([(14, 16), (50, 16), (54, 22), (46, 27), (18, 27), (10, 22)])
        F.part('wood', BARK_L, bevel=2).poly([(16, 16.5), (48, 16.5), (51, 20), (13, 20)])
        for k in range(6):                                                               # 이빨처럼 갈라진 나뭇결
            x = 18 + k * 5.6
            F.part('wood', '#c0a070', bevel=1).poly([(x, 16.5), (x + 2.6, 16.5), (x + 1.3, 12.5 - (k % 2) * 1.5)])
    return F.render()


# ===== 서리 마녀 실비아(frost_witch) — 떠 있는 서리의 여왕: 얼음 왕관 · 은빛 머리 · 끝이 얼음 조각으로 부서지는 치맛자락 =====
SKIN, SKIN_D = '#f2e0d6', '#c8a8a4'
HAIR, HAIR_D, HAIR_L = '#cfe4f4', '#86aacc', '#f4fbff'
GOWN, GOWN_D, GOWN_L = '#5d8cc4', '#34588c', '#9ccaf0'
FUR, ICE_C, ICE_E, FROSTG = '#f0f6ff', '#dff6ff', '#6fb8e8', '#bfefff'
FW_W, FW_H = 44, 58                                           # 게임 entity/boss-witch.ts FW 와 같게(가운데 22, 31 · 어깨 22±7, 22 · 머리 22, 13)


def witch_head(F, cx, hy, st, look=0):
    """머리 — 얼굴 · 앞머리 · 얼음 왕관(st 2: 금 · 눈이 빛난다)"""
    F.part('cloth', HAIR, bevel=1.5).ell(cx, hy - 3.0, 5.4, 3.6)                        # 정수리 — 얼굴 뒤에 먼저(왕관이 그 위에 얹힌다 · 떠 있던 틈을 메운다)
    F.part('clay', SKIN, bevel=1.5).ell(cx, hy, 4.4, 5.2)
    F.part('clay', '#e6cec6', bevel=0.5).ell(cx, hy + 4.2, 2.0, 0.6)                       # 턱 그늘(옅게 — 짙으면 수염처럼 보였다)
    for s2 in (-1, 1):                                                                   # 눈 — 길게 내리깐 눈 · 옅은 하늘빛 눈동자
        ex = cx + s2 * 1.9 + look * 0.4
        F.part('cloth', '#2a3048', flat=True).box(ex - 1.1, hy - 0.2, 2.2, 0.9, 0.3)
        F.part('glow', FROSTG if st >= 2 else '#9cc8e8', glow=st >= 2).box(ex - 0.5 + look * 0.2, hy + 0.3, 1.0, 0.7, 0.2)
        fine(F, (ex - 1.4, hy - 1.4), (ex + 1.2, hy - 1.7 + s2 * 0.2), HAIR_D, 220)       # 가는 눈썹
    F.part('flesh', '#b86a78', bevel=0.4).box(cx - 1.0, hy + 2.6, 2.0, 0.6, 0.3)         # 입술
    F.part('cloth', HAIR, bevel=1.5).poly([(cx - 5, hy - 2), (cx - 3, hy - 5.6), (cx + 1, hy - 6), (cx + 4.8, hy - 4), (cx + 5, hy), (cx + 2.5, hy - 3), (cx - 1, hy - 2.6), (cx - 3.5, hy - 1)])
    band = lambda dx: hy - 4.6 + 0.9 * (dx / 4.6) ** 2                                   # 머리 곡선을 따라 휜 띠
    for k in range(5):                                                                   # 왕관 — 다섯 얼음 가시(가운데가 높다)
        dx = -3.6 + k * 1.8; x = cx + dx; hgt = 2.6 + (2 - abs(k - 2)) * 1.5; by = band(dx)
        F.part('ice', ICE_E, bevel=0.8).poly([(x - 1.0, by), (x, by - hgt), (x + 1.0, by)])
        F.part('glow', ICE_C, glow=True).poly([(x - 0.35, by - 0.2), (x, by - hgt * 0.8), (x + 0.3, by - 0.2)])
    F.part('ice', '#a8dcf0', bevel=0.6).poly([(cx + dx, band(dx) - 0.5) for dx in (-4.6, -2.3, 0, 2.3, 4.6)] + [(cx + dx, band(dx) + 0.8) for dx in (4.6, 2.3, 0, -2.3, -4.6)])
    if st >= 2:
        crack(F, [(cx + 2, hy - 7.2), (cx + 2.5, hy - 5.2)], 0.3, FROSTG)
        F.glow(cx, hy + 0.5, 4, FROSTG, 0.35)


def witch_body(f):
    """몸 시트 8장(44×58 · 떠 있다 — 발 없음) — 0·1 숨(머리카락 · 치맛자락 끝 조각이 흔들림) · 2·3 서리가 치마를 타고 오른다 · 4·5 금 · 하얗게 센 머리 · 빛나는 눈 · 6·7 산산이 부서짐.
       팔 · 지팡이 · 망토는 조각이라 게임이 움직인다"""
    F = ZFig(FW_W, FW_H)
    cx = 22
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    brk = 0 if f < 6 else (1 if f == 6 else 2)
    hy = 13 + brk * 2
    hair = HAIR_L if st >= 2 else HAIR
    # 뒷머리 — 어깨 뒤로 허리까지 흘러내린다(숨마다 끝이 흔들린다)
    sway = (-0.8 if b else 0.8)
    F.part('cloth', HAIR_D, bevel=2).poly([(cx - 6.4, hy), (cx - 4.6, hy - 3.6), (cx, hy - 4.6), (cx + 4.6, hy - 3.6), (cx + 6.4, hy), (cx + 8, hy + 10), (cx + 9 + sway, hy + 20), (cx + 5 + sway, hy + 24), (cx - 5 + sway, hy + 24), (cx - 9 + sway, hy + 20), (cx - 8, hy + 10)])
    F.part('cloth', hair, bevel=1.5).poly([(cx - 5.4, hy), (cx - 3.8, hy - 3), (cx, hy - 3.8), (cx + 3.8, hy - 3), (cx + 5.4, hy), (cx + 7, hy + 10), (cx + 7.5 + sway, hy + 19), (cx + 4 + sway, hy + 22), (cx - 4 + sway, hy + 22), (cx - 7.5 + sway, hy + 19), (cx - 7, hy + 10)])
    for k in range(3):                                                                   # 머릿결 — 얼굴 양옆에만(얼굴 위로 줄이 그어졌다)
        for s2 in (-1, 1):
            fine(F, (cx + s2 * (5.6 + k * 0.8), hy + 6), (cx + s2 * (6.4 + k * 1.2) + sway, hy + 21), HAIR_D, 150)
    # 치마 — 허리에서 넓어지고, 끝은 얼음 조각으로 부서져 떠 있다(발이 없다)
    wy, hem = 28, 49
    sk = [(cx - 5, wy), (cx + 5, wy), (cx + 9, 37), (cx + 13, hem - 2), (cx + 11, hem), (cx - 11, hem), (cx - 13, hem - 2), (cx - 9, 37)]
    F.part('cloth', GOWN_D, bevel=3).poly(sk)
    F.part('cloth', GOWN, bevel=2).poly([(cx - 4, wy + 1), (cx + 4, wy + 1), (cx + 7, 37), (cx + 10, hem - 2), (cx - 10, hem - 2), (cx - 7, 37)])
    for k in range(6):                                                                   # 주름 — 허리에서 퍼지는 결
        x0 = cx - 3 + k * 1.2; x1 = cx - 11 + k * 4.4
        fine(F, (x0, wy + 2), (x1, hem - 3), GOWN_D, 190)
        fine(F, (x0 + 0.5, wy + 2), (x1 + 0.9, hem - 3), GOWN_L, 120)
    for k in range(7):                                                                   # 치맛자락 끝 — 얼음 조각(장마다 조금씩 떨어져 떠 있다)
        x = cx - 10 + k * 3.3; dy = (k + b) % 2 * 1.2 + brk * (k % 2)
        F.part('ice', ICE_E, bevel=0.8).poly([(x - 1.4, hem - 1 + dy), (x + 1.4, hem - 1 + dy), (x, hem + 3 + (k % 3) + dy)])
        F.part('glow', ICE_C, glow=True).poly([(x - 0.4, hem - 0.6 + dy), (x + 0.3, hem - 0.6 + dy), (x, hem + 1.6 + dy)])
    if st >= 1:                                                                          # 서리가 치마를 타고 오른다 — 결정 무늬
        for k in range(9):
            x = cx - 9 + (k * 37) % 18; y = 39 + (k * 11) % 9
            for a in range(3):
                an = a / 3 * math.pi + k
                fine(F, (x - math.cos(an) * 1.6, y - math.sin(an) * 1.6), (x + math.cos(an) * 1.6, y + math.sin(an) * 1.6), FROSTG, 230)
        F.glow(cx, 43, 9, FROSTG, 0.18 + 0.06 * b)
    # 몸통 — 좁은 허리 · 털 깃 · 가슴의 서리 브로치
    F.part('cloth', GOWN_D, bevel=2).poly([(cx - 6, hy + 8), (cx + 6, hy + 8), (cx + 5, wy + 1), (cx - 5, wy + 1)])
    F.part('cloth', GOWN, bevel=1.5).poly([(cx - 4.6, hy + 8.5), (cx + 4.6, hy + 8.5), (cx + 3.6, wy), (cx - 3.6, wy)])
    F.part('cloth', '#2a4470', bevel=1).box(cx - 5, wy - 1.2, 10, 1.6, 0.6)               # 허리띠
    F.part('cloth', FUR, bevel=2).poly([(cx - 8, hy + 7), (cx - 3, hy + 5.6), (cx, hy + 7), (cx + 3, hy + 5.6), (cx + 8, hy + 7), (cx + 7, hy + 10), (cx, hy + 11), (cx - 7, hy + 10)])
    for k in range(6):
        fine(F, (cx - 7 + k * 2.8, hy + 7.4), (cx - 6.6 + k * 2.8, hy + 9.8), '#c8d8ec', 200)
    F.part('ice', ICE_E, bevel=0.8).poly([(cx, hy + 11), (cx + 1.6, hy + 13), (cx, hy + 15), (cx - 1.6, hy + 13)])
    F.part('glow', ICE_C, glow=True).ell(cx, hy + 13, 0.7, 0.9)
    F.glow(cx, hy + 13, 3 + b, FROSTG, 0.35)
    F.part('clay', SKIN, bevel=1).box(cx - 1.5, hy + 4, 3, 3, 1)                       # 목
    witch_head(F, cx, hy, st)
    F.part('cloth', hair, bevel=1).poly([(cx - 5, hy - 2), (cx - 6.4, hy + 6), (cx - 5, hy + 9), (cx - 3.6, hy + 2)])   # 옆머리 — 얼굴 양옆
    F.part('cloth', hair, bevel=1).poly([(cx + 5, hy - 2), (cx + 6.4, hy + 6), (cx + 5, hy + 9), (cx + 3.6, hy + 2)])
    if st >= 2:
        crack(F, [(cx + 3, hy + 9), (cx + 4, wy - 2), (cx + 7, 36)], 0.4, FROSTG)
        crack(F, [(cx - 6, 39), (cx - 8, 44), (cx - 7, hem - 3)], 0.4, FROSTG)
    if brk:                                                                              # 부서짐 — 몸에서 얼음 조각이 떨어져 나간다
        for k in range(10 * brk):
            x = 6 + (k * 29) % 32; y = 8 + (k * 17) % 40
            F.part('ice', ICE_E, bevel=0.6).poly([(x, y), (x + 1.8, y + 0.6), (x + 0.8, y + 2.4)])
        crack(F, [(cx - 2, hy - 4), (cx + 1, hy + 6), (cx - 1, wy + 4), (cx + 2, hem - 6)], 0.6, FROSTG)
    return F.render()


def witch_parts(f):
    """조각 5장(28×56 설계 칸) — 0 지팡이(쥔 자리 (14, 34) · 꼭대기 수정 (14, 6)) · 1 팔(어깨 (4, 28) → 손 (23, 28) · 소매가 종처럼 퍼진다)
       · 2 주문 손(같은 팔 · 손바닥에 서리) · 3 망토 천(걸이 (6, 3) → 아래 · 바깥) · 4 얼음 결정 날개(같은 걸이)"""
    F = ZFig(28, 56)
    if f == 0:
        F.part('wood', '#c8dcec', bevel=1.2).cap(14, 52, 14, 12, 1.1, 0.9)               # 서리 낀 은빛 자루
        for k in range(5):
            fine(F, (13.2, 16 + k * 7), (14.8, 18 + k * 7), '#7aa0c0', 220)
        F.part('ice', ICE_E, bevel=0.8).poly([(11, 13), (14, 9), (17, 13), (14, 15)])
        for (dx, h) in ((-3.5, 4), (3.5, 4), (0, 7)):                                     # 수정 가지 — 오브를 감싼다
            F.part('ice', ICE_E, bevel=0.6).poly([(14 + dx - 0.8, 10), (14 + dx * 1.2, 10 - h), (14 + dx + 0.8, 10)])
        F.part('glow', ICE_C, glow=True).ell(14, 6, 3.6, 3.6)
        F.part('glow', '#ffffff', glow=True).ell(13.2, 5.2, 1.2, 1.2)
        F.glow(14, 6, 7, FROSTG, 0.45)
    elif f in (1, 2):
        F.part('cloth', GOWN_D, bevel=2).poly([(3, 25.5), (14, 25.6), (19, 24), (21, 28), (19, 32), (14, 30.5), (3, 30.5)])   # 종 소매
        F.part('cloth', GOWN, bevel=1.5).poly([(4, 26.2), (14, 26.4), (18, 25.2), (19.5, 28), (14, 29.6), (4, 29.6)])
        F.part('cloth', FUR, bevel=1).poly([(17.5, 24), (19.5, 23.6), (21.5, 28), (19.5, 32.4), (17.5, 32)])
        F.part('clay', SKIN, bevel=1.2).ell(23.2, 28, 2.1, 1.7)                         # 손
        if f == 1:
            for k in range(3):
                F.part('flesh', SKIN, bevel=0.6).cap(24.5, 27 + k * 1, 26.2, 27.4 + k * 1.2, 0.5, 0.4)
        else:
            for k in range(4):                                                           # 편 손가락 · 손바닥의 서리 꽃
                a = -0.7 + k * 0.45
                F.part('flesh', SKIN, bevel=0.6).cap(24.5, 28, 24.5 + math.cos(a) * 2.6, 28 + math.sin(a) * 2.6, 0.5, 0.4)
            for a in range(6):
                an = a / 6 * math.tau
                fine(F, (24, 28), (24 + math.cos(an) * 2.6, 28 + math.sin(an) * 2.6), FROSTG, 230)
            F.glow(24, 28, 4, FROSTG, 0.5)
    elif f == 3:
        F.part('cloth', '#2c4878', bevel=3).poly([(6, 3), (12, 4), (18, 16), (24, 34), (26, 50), (20, 47), (14, 51), (9, 46), (5, 26), (4, 8)])
        F.part('cloth', '#4a6ea4', bevel=2).poly([(7, 5), (11, 6), (16, 17), (21, 33), (22, 46), (16, 44), (11, 47), (8, 26)])
        for k in range(4):
            fine(F, (8 + k * 2, 8 + k * 2), (10 + k * 4, 46 - k), '#2c4878', 170)
        F.part('cloth', FUR, bevel=1.5).poly([(4, 2), (12, 2.5), (12, 6), (5, 6)])
    else:
        for k in range(6):                                                               # 얼음 날개 — 걸이에서 부채꼴로 뻗는 결정 깃
            a = 0.45 + k * 0.2
            L = 26 + (2.5 - abs(k - 2.5)) * 6
            ex, ey = 6 + math.cos(a) * L * 0.62, 4 + math.sin(a) * L
            F.part('ice', ICE_E, bevel=1).poly([(6, 4), (ex + math.sin(a) * 2.4, ey - math.cos(a) * 2.4), (ex + math.cos(a) * 3, ey + math.sin(a) * 3), (ex - math.sin(a) * 2.4, ey + math.cos(a) * 2.4)])
            F.part('glow', ICE_C, glow=True).poly([(6.5, 5), (ex * 0.94 + 0.4, ey * 0.94), (ex * 0.9, ey * 0.92 + 0.8)])
        F.glow(10, 20, 10, FROSTG, 0.3)
    return F.render()


# ===== 공허의 왕(void_king) — 심연 투기장 뒷벽 전체를 덮은 어둠 망토 · 그 속에서 왕관 쓴 머리와 손만 나온다 =====
VOID, VOID_D, VOID_L, VRUNE, VGOLD = '#160c26', '#08040f', '#3c2666', '#b48aff', '#c8a860'
VK_W, VK_H = 220, 86                                          # 게임 entity/boss-void.ts VK 와 같게(망토 가운데 110 · 바닥 85)


def void_cloak(f):
    """망토 8장(220×86 · 바닥 85 · 위 막대 y 3) — 0·1 주름이 일렁인다 · 2·3 찢긴 틈(별빛 테) · 4·5 더 찢기고 왕의 문장이 깨진다 · 6·7 무너져 내린다.
       머리 · 손은 조각, 걷힌 틈의 별은 게임이 그린다"""
    F = ZFig(VK_W, VK_H)
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    sag = 0 if f < 6 else (8 if f == 6 else 22)
    # 망토 몸 — 위는 고리마다 물결, 아래는 땅에 끌리는 찢긴 단(장마다 일렁임이 다르다)
    top = [(10 + k * 200 / 36, 3 + sag * 0.3 + 3.2 * abs(math.sin(k * 1.7 + b * 0.6)) + 1.4 * (k % 3)) for k in range(37)]   # 위는 어둠 속으로 풀려 사라진다(장대 없이)
    bot = []
    for k in range(40, -1, -1):
        x = 8 + k * 204 / 40
        y = 84 - (3 if (k + b) % 3 == 0 else 0) - (k * 7 % 5) * 0.6
        bot.append((x, min(85, y)))
    edgeL = [(8 - math.sin(u * 3 + b) * 1.5, 6 + u * 76) for u in [k / 8 for k in range(1, 8)]]
    edgeR = [(VK_W - 8 + math.sin(u * 3 + b) * 1.5, 6 + u * 76) for u in [k / 8 for k in range(7, 0, -1)]]
    F.part('cloth', VOID_D, bevel=3).poly(top + edgeR + bot + edgeL)
    F.part('cloth', VOID, bevel=2.5).poly([(x, y + 1.5) for (x, y) in top] + [(x - 1.5, y) for (x, y) in edgeR] + [(x, y - 1.5) for (x, y) in bot] + [(x + 1.5, y) for (x, y) in edgeL])
    # 주름 — 고리 사이에서 늘어진 굵은 골 · 빛 받는 마루(일렁임은 장마다 좌우로 조금)
    xs, x = [], 14.0
    while x < VK_W - 14:                                                                 # 골 간격이 고르지 않게
        xs.append(x); x += 5.5 + 5 * abs(math.sin(len(xs) * 2.3))
    for k, x in enumerate(xs):
        x += (1.2 if (k + b) % 2 else -1.2) * 0.8
        w = 2.2 + (k % 3) * 1.1
        F.part('cloth', VOID_D, bevel=1.2).poly([(x - w * 0.5, 7), (x + w * 0.5, 7), (x + w * 0.7 + math.sin(k) * 1.5, 82), (x - w * 0.7 + math.sin(k) * 1.5, 82)])
        fine(F, (x + w * 0.8, 8), (x + w * 0.9 + math.sin(k) * 1.5, 80), VOID_L, 150)
    for k in range(5):                                                                   # 비스듬히 쓸린 큰 결 — 무게가 처진 곳
        x0 = 30 + k * 40
        for j in range(3):
            fine(F, (x0 + j * 2.5, 12 + j), (x0 - 16 + j * 3 + b, 60 + j * 4), VOID_L, 110)
    # 단 — 금빛 룬 띠(왕의 옷자락)
    for k in range(34):
        x = 12 + k * 5.9
        y = 78 - (k * 7 % 5) * 0.4
        F.part('glow', VRUNE if (k + b) % 4 else '#e0c8ff', glow=True).box(x, y, 2.2 if k % 3 else 1.2, 0.8, 0.2)
    fine(F, (10, 76), (VK_W - 10, 76), VGOLD, 180)
    # 왕의 문장 — 가운데 위 나선(막 2 에 쪼개진다)
    cx, cy = VK_W / 2, 20
    F.part('metal', VGOLD, bevel=1).ell(cx, cy, 9, 9)
    F.part('cloth', VOID_D, flat=True).ell(cx, cy, 7.6, 7.6)
    for k in range(40):
        a = k / 40 * math.tau * 2.2; r = 1 + k / 40 * 6.4
        Fig.px(F, (cx + math.cos(a) * r) * K, (cy + math.sin(a) * r) * K, VRUNE, 240)
    F.glow(cx, cy, 10 + b * 2, VRUNE, 0.3)
    if st >= 1:                                                                          # 찢긴 틈 — 테가 별빛으로 탄다(안의 별은 게임이)
        for (x, y, w, h) in ((48, 40, 6, 16), (168, 34, 5, 18)) + (((80, 60, 5, 12), (142, 58, 7, 14), (30, 64, 4, 10)) if st >= 2 else ()):
            F.part('cloth', '#000000', flat=True).poly([(x, y - h), (x + w * 0.6, y - h * 0.3), (x + w, y + h * 0.2), (x + w * 0.2, y + h), (x - w * 0.5, y + h * 0.3), (x - w * 0.3, y - h * 0.4)])
            for (a, b2) in (((x, y - h), (x + w, y + h * 0.2)), ((x + w, y + h * 0.2), (x + w * 0.2, y + h)), ((x - w * 0.5, y + h * 0.3), (x, y - h))):
                fine(F, a, b2, VRUNE, 220)
    if st >= 2:
        crack(F, [(cx - 6, cy - 6), (cx - 1, cy), (cx + 4, cy + 7)], 0.6, VRUNE)
    if sag:                                                                              # 무너짐 — 고리가 풀려 한쪽부터 흘러내린다
        for k in range(6):
            x = 16 + k * 33
            F.part('cloth', VOID_D, bevel=2).poly([(x, 84), (x + 10, 84 - sag * 0.5), (x + 22, 84)])
    return F.render()


def void_parts(f):
    """조각 6장(48×48 설계 칸) — 0 머리(가운데 (24, 25) · 높은 깃 아래가 망토 속으로) · 1 입 벌린 머리 · 2 금 간 왕관 · 3 편 손(손목 (8, 24) → +x)
       · 4 갈퀴 손 · 5 쥔 주먹"""
    F = ZFig(48, 48)
    if f <= 2:
        cx, cy = 24, 25
        F.part('cloth', VOID_D, bevel=3).poly([(cx - 17, 46), (cx - 14, 30), (cx - 8, 36), (cx, 33), (cx + 8, 36), (cx + 14, 30), (cx + 17, 46)])   # 높은 깃
        F.part('cloth', VOID_L, bevel=1.5).poly([(cx - 15, 45), (cx - 12.5, 32), (cx - 10, 36), (cx - 13, 45)])
        F.part('stone', '#a49ab4', bevel=2.5).poly([(cx - 9, cy - 7), (cx + 9, cy - 7), (cx + 9.5, cy + 2), (cx + 6, cy + 12), (cx + 2, cy + 16), (cx - 2, cy + 16), (cx - 6, cy + 12), (cx - 9.5, cy + 2)])   # 길쭉한 해골 가면
        F.part('stone', '#cfc6dc', bevel=1.5).poly([(cx - 7, cy - 6), (cx + 7, cy - 6), (cx + 7.5, cy + 1), (cx + 3, cy + 4), (cx - 3, cy + 4), (cx - 7.5, cy + 1)])   # 이마 · 광대 — 빛 받는 면
        for s2 in (-1, 1):                                                               # 광대 아래 그늘 · 비스듬한 눈 틈(안으로 내리꽂힌 성난 눈)
            F.part('stone', '#5e5274', bevel=0.8).poly([(cx + s2 * 8.5, cy + 2), (cx + s2 * 3.5, cy + 6), (cx + s2 * 5, cy + 11), (cx + s2 * 8, cy + 6)])
            F.part('stone', '#06030c', flat=True).poly([(cx + s2 * 1.4, cy + 0.6), (cx + s2 * 7.6, cy - 2.6), (cx + s2 * 7.0, cy + 0.8), (cx + s2 * 2.4, cy + 2.4)])
            F.part('glow', VRUNE, glow=True).poly([(cx + s2 * 2.6, cy + 0.9), (cx + s2 * 6.6, cy - 1.4), (cx + s2 * 6.2, cy - 0.2), (cx + s2 * 3.0, cy + 1.7)])
            fine(F, (cx + s2 * 1.2, cy - 1.0), (cx + s2 * 8.2, cy - 4.0), '#2a2238', 230)   # 눈썹뼈
        F.glow(cx, cy, 9, VRUNE, 0.35)
        F.part('stone', '#0a0612', flat=True).poly([(cx - 1.0, cy + 4.6), (cx + 1.0, cy + 4.6), (cx, cy + 7.4)])
        if f == 1:                                                                       # 벌린 입 — 안이 별 없는 어둠 · 빛 한 점
            F.part('stone', '#0a0612', flat=True).ell(cx, cy + 11, 3.6, 3.6)
            F.part('glow', VRUNE, glow=True).ell(cx, cy + 11.2, 1.4, 1.0)
        else:
            for k in range(5):
                F.part('stone', '#bcb0cc', bevel=0.5).box(cx - 4.5 + k * 2, cy + 10, 1.4, 2.6, 0.4)
        for k in range(7):                                                               # 왕관 — 검은 쇠 가시 · 끝마다 보랏빛
            a = -math.pi / 2 + (k - 3) * 0.32
            x0, y0 = cx + math.cos(a) * 8, cy - 6 + math.sin(a) * 3
            x1, y1 = cx + math.cos(a) * 11, cy - 9 + math.sin(a) * (8 + (3 - abs(k - 3)) * 2)
            F.part('metal', '#2a2238', bevel=1).poly([(x0 - 1.4, y0), (x1, y1), (x0 + 1.4, y0)])
            F.part('glow', VRUNE, glow=True).ell(x1, y1 + 0.6, 0.7, 0.7)
        F.part('metal', VGOLD, bevel=1).box(cx - 9.5, cy - 9, 19, 2.4, 1)
        if f == 2:
            crack(F, [(cx - 3, cy - 9), (cx - 1, cy - 4), (cx - 4, cy + 1)], 0.5, VRUNE)
            crack(F, [(cx + 6, cy - 11), (cx + 7, cy - 6)], 0.4, VRUNE)
    else:
        F.part('cloth', VOID_D, bevel=2).cap(7, 24, 13, 24, 5.5, 5)                       # 소맷부리
        F.part('metal', '#2a2238', bevel=2).box(9, 18, 12, 12, 3)                         # 쇠 장갑 손등
        F.part('glow', VRUNE, glow=True).ell(15, 24, 1.6, 1.6)
        if f == 3:
            for k in range(4):
                F.part('metal', '#3a3050', bevel=1).cap(20, 19.5 + k * 3, 31 - abs(k - 1.5) * 1.5, 18 + k * 4, 1.3, 1.0)
            F.part('metal', '#3a3050', bevel=1).cap(13, 18, 17, 11, 1.4, 1.1)
        elif f == 4:
            for k in range(4):
                bx, by = 20, 19.5 + k * 3
                F.part('metal', '#3a3050', bevel=1).cap(bx, by, bx + 6, by - 2 + k, 1.3, 1.1)
                F.part('metal', VGOLD, bevel=0.6).poly([(bx + 5.6, by - 3 + k), (bx + 10, by + k), (bx + 6, by + k)])
        else:
            F.part('metal', '#3a3050', bevel=1.5).box(19, 18, 8, 12, 3)
            for k in range(4):
                fine(F, (20, 20.5 + k * 2.8), (26.5, 20.5 + k * 2.8), '#120c1e', 220)
    return F.render()


# ===== 폭풍의 수호자(storm_warden) — 하늘 신전의 풍화된 석상: 피뢰침 뿔 · 폭풍의 눈 핵 · 아래는 구름으로 풀린다 · 팔 대신 도는 두 고리 =====
SGRAY, SGRAY_D, SGRAY_L, SBOLT, SCOPPER = '#8c98ac', '#4c5668', '#c4ccd8', '#cfe6ff', '#b07848'
SW_W, SW_H = 60, 60                                           # 게임 game/boss-storm-art.ts SW 와 같게(가운데 30, 32 · 뿔끝 30±9, 4 · 핵 30, 30)


def storm_body(f):
    """몸 8장(60×60 · 아래 끝은 구름이 덮는다 — 게임이 그린다) — 0·1 핵이 숨 쉰다 · 2·3 금 · 이끼 대신 서리 · 4·5 깨진 어깨 · 핵이 사납다 · 6·7 무너짐"""
    F = ZFig(SW_W, SW_H)
    cx = 30
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    sag = 0 if f < 6 else (4 if f == 6 else 10)
    # 뿔 — 머리 양쪽에서 솟은 피뢰침(구리 감김 · 끝이 번개빛)
    for s2 in (-1, 1):
        F.part('metal', '#3e4452', bevel=1).cap(cx + s2 * 7, 12 + sag, cx + s2 * 10, 6 + sag, 1.6, 1.1)       # 휘어 오르는 뿔 — 두 마디
        F.part('metal', '#3e4452', bevel=1).cap(cx + s2 * 10, 6 + sag, cx + s2 * 12.5, 1.6 + sag, 1.1, 0.6)
        for k in range(3):
            F.part('metal', SCOPPER, bevel=0.6).ell(cx + s2 * (7.8 + k * 1.1), 10.0 - k * 2.0 + sag, 1.6, 0.6, s2 * 0.6)
        F.part('glow', SBOLT, glow=True).ell(cx + s2 * 12.5, 1.6 + sag, 1.0, 1.0)
        F.glow(cx + s2 * 12.5, 1.8 + sag, 3 + b, SBOLT, 0.4)
    # 몸통 — 넓은 어깨 · 좁아지는 허리 · 아래는 깨진 돌(구름이 덮는다)
    body = [(cx - 19, 22 + sag), (cx - 14, 18 + sag), (cx + 14, 18 + sag), (cx + 19, 22 + sag), (cx + 21, 30), (cx + 15, 36), (cx + 11, 48), (cx + 8, 56), (cx + 3, 53), (cx - 2, 57), (cx - 7, 54), (cx - 11, 48), (cx - 15, 36), (cx - 21, 30)]
    F.part('stone', SGRAY_D, bevel=4).poly(body)
    F.part('stone', SGRAY, bevel=3).poly([(x + (cx - x) * 0.1, y + 1) for (x, y) in body])
    F.part('stone', SGRAY_L, bevel=2).poly([(cx - 17, 23 + sag), (cx - 12, 20 + sag), (cx - 4, 20 + sag), (cx - 6, 27), (cx - 16, 29)])   # 왼쪽 위 — 빛 받는 면
    for s2 in (-1, 1):                                                                   # 어깨 판 · 새긴 룬 줄
        sx = cx + s2 * 17                                                                # 모난 어깨 갑주 — 위로 솟은 돌 날
        F.part('stone', SGRAY_D, bevel=2).poly([(sx - s2 * 7, 20 + sag), (sx + s2 * 2, 13 + sag), (sx + s2 * 8, 21 + sag), (sx + s2 * 7, 29), (sx - s2 * 4, 28)])
        F.part('stone', SGRAY, bevel=1.5).poly([(sx - s2 * 5.5, 20.5 + sag), (sx + s2 * 2, 15 + sag), (sx + s2 * 6.4, 21.5 + sag), (sx + s2 * 5.6, 27), (sx - s2 * 3.6, 26.4)])
        F.part('glow', SBOLT, glow=True).poly([(sx - s2 * 3, 22 + sag), (sx + s2 * 4, 21.6 + sag), (sx + s2 * 3.6, 22.6 + sag), (sx - s2 * 3, 23 + sag)])
    for k in range(4):                                                                   # 몸에 새긴 번개 홈
        y = 36 + k * 4.5
        fine(F, (cx - 9 + k, y), (cx - 5 + k, y + 2), SGRAY_D, 220)
        fine(F, (cx + 9 - k, y), (cx + 5 - k, y + 2), SGRAY_D, 220)
    # 폭풍의 눈 — 가슴의 둥근 틀 · 안은 게임이 돌린다(소용돌이 · 번개)
    F.part('stone', SGRAY_D, bevel=2).ell(cx, 30, 7.4, 7.4)
    F.part('metal', SCOPPER, bevel=1.2).ell(cx, 30, 6.4, 6.4)
    F.part('stone', '#141a26', flat=True).ell(cx, 30, 5.2, 5.2)
    F.part('glow', '#9cd0ff' if b else '#bfe2ff', glow=True).ell(cx, 30, 2.4 + b * 0.4, 2.4 + b * 0.4)
    F.glow(cx, 30, 8 + b * 2, SBOLT, 0.3 + 0.1 * b)
    # 머리 — 볏 솟은 투구 · 아래로 꺾인 볼가리개 · 가늘게 빛나는 눈 틈 하나
    hy = 4 + sag
    F.part('stone', SGRAY_D, bevel=3).poly([(cx - 8, hy + 16), (cx - 9, hy + 8), (cx - 6, hy + 3), (cx, hy), (cx + 6, hy + 3), (cx + 9, hy + 8), (cx + 8, hy + 16), (cx + 4, hy + 18), (cx - 4, hy + 18)])
    F.part('stone', SGRAY, bevel=2).poly([(cx - 6.6, hy + 15), (cx - 7.4, hy + 8), (cx - 5, hy + 4), (cx, hy + 1.6), (cx + 5, hy + 4), (cx + 7.4, hy + 8), (cx + 6.6, hy + 15), (cx + 3.4, hy + 16.6), (cx - 3.4, hy + 16.6)])
    F.part('stone', SGRAY_L, bevel=1).poly([(cx - 1.2, hy + 0.6), (cx + 1.2, hy + 0.6), (cx + 0.8, hy + 8), (cx - 0.8, hy + 8)])   # 볏
    for s2 in (-1, 1):
        F.part('stone', SGRAY_D, bevel=1).poly([(cx + s2 * 3, hy + 12), (cx + s2 * 8, hy + 10), (cx + s2 * 7.4, hy + 16), (cx + s2 * 4, hy + 17.4)])
    F.part('stone', '#141a26', flat=True).poly([(cx - 6, hy + 9), (cx + 6, hy + 9), (cx + 5, hy + 11.4), (cx - 5, hy + 11.4)])
    F.part('glow', SBOLT, glow=True).box(cx - 4.6, hy + 9.7, 9.2, 0.9, 0.4)
    F.glow(cx, hy + 10.2, 5, SBOLT, 0.4)
    if st >= 1:
        crack(F, [(cx + 12, 22 + sag), (cx + 9, 30), (cx + 12, 38)], 0.45, SBOLT)
        crack(F, [(cx - 4, 7 + sag), (cx - 3, 12 + sag)], 0.3, SBOLT)
    if st >= 2:
        crack(F, [(cx - 14, 24 + sag), (cx - 10, 33), (cx - 13, 42)], 0.5, SBOLT)
        crack(F, [(cx + 4, 37), (cx + 6, 45), (cx + 3, 51)], 0.45, SBOLT)
        F.part('stone', '#141a26', flat=True).poly([(cx + 19, 22 + sag), (cx + 22, 26), (cx + 18, 27)])   # 깨진 어깨 끝
    if sag:
        for k in range(8):
            x = 12 + k * 5; y = 50 + (k % 3) * 3
            F.part('stone', SGRAY if k % 2 else SGRAY_D, bevel=1.5).poly([(x, y), (x + 3, y - 2), (x + 5, y + 1), (x + 2, y + 3)])
    return F.render()


def storm_parts(f):
    """조각 3장(64×64 설계 칸) — 0 고리(가운데 (32, 32) · 반지름 28 · 룬을 새긴 돌 띠) · 1 금 간 고리 · 2 피뢰침(밑 (32, 62) → 끝 (32, 4))"""
    F = ZFig(64, 64)
    if f <= 1:
        n = 48
        for k in range(n):                                                               # 띠 — 마디마다 돌 덩이(한 장짜리 원보다 무게가 있다)
            a0, a1 = k / n * math.tau, (k + 0.92) / n * math.tau
            pts = [(32 + math.cos(a0) * 30, 32 + math.sin(a0) * 30), (32 + math.cos(a1) * 30, 32 + math.sin(a1) * 30),
                   (32 + math.cos(a1) * 25.5, 32 + math.sin(a1) * 25.5), (32 + math.cos(a0) * 25.5, 32 + math.sin(a0) * 25.5)]
            if f == 1 and k in (7, 8, 30):
                continue
            F.part('stone', SGRAY if k % 2 else SGRAY_D, bevel=1).poly(pts)
            if k % 4 == 0:
                am = (a0 + a1) / 2
                F.part('glow', SBOLT, glow=True).ell(32 + math.cos(am) * 27.8, 32 + math.sin(am) * 27.8, 0.7, 0.7)
        for k in range(4):                                                               # 구리 죔쇠 넷
            a = k / 4 * math.tau + 0.4
            F.part('metal', SCOPPER, bevel=0.8).ell(32 + math.cos(a) * 27.8, 32 + math.sin(a) * 27.8, 2.2, 2.2)
    else:
        F.part('metal', '#3e4452', bevel=1).cap(32, 60, 32, 8, 1.6, 1.0)
        for k in range(5):
            F.part('metal', SCOPPER, bevel=0.6).ell(32, 22 + k * 5, 2.4, 0.9)
        F.part('metal', '#c8ccd6', bevel=0.8).poly([(30, 9), (34, 9), (32, 3)])
        F.part('stone', SGRAY_D, bevel=1.5).poly([(26, 62), (38, 62), (35, 57), (29, 57)])   # 박히는 쐐기 발
        F.part('glow', SBOLT, glow=True).ell(32, 5, 1.2, 1.2)
        F.glow(32, 6, 4, SBOLT, 0.4)
    return F.render()


# ===== 갱도의 것(mine_horror) — 길 잃은 광부들을 삼킨 살덩이가 녹슨 광차에 실려 레일 위만 달린다 · 삼킨 투구의 등불이 눈이다 =====
MH_FL, MH_FL_D, MH_FL_L = '#7a2e34', '#4a1a22', '#a8464a'
MH_IRON, MH_IRON_D, MH_RUST, MH_HELM, MH_LAMP = '#555a64', '#2c2f36', '#8a5232', '#b89a4a', '#ffd27a'
MH_W, MH_H = 72, 56                                           # 게임 game/boss-cart-art.ts MH 와 같게(바퀴 (21, 47) · (51, 47) r6.5 · 땅 54 · 판정 52×46 · 가운데 36)
MH_LAMPS = [(26, 15, -0.3), (44, 12, 0.25), (35, 21, 0.0), (52, 19, 0.5)]   # 투구 등불(눈) — 넷째는 막 2 부터


def mh_helmet(F, x, y, a, lit):
    """삼킨 투구 하나 — 살에 반쯤 묻혀 기울었다 · 등불이 눈"""
    ca, sa = math.cos(a), math.sin(a)
    R = lambda dx, dy: (x + dx * ca - dy * sa, y + dx * sa + dy * ca)
    F.part('metal', MH_HELM, bevel=1.2).poly([R(-4.6, 1.6), R(-4.2, -1.6), R(-2.4, -3.6), R(0, -4.2), R(2.4, -3.6), R(4.2, -1.6), R(4.6, 1.6)])
    F.part('metal', '#7a6430', bevel=0.6).poly([R(-5.6, 1.2), R(5.6, 1.2), R(5.4, 2.2), R(-5.4, 2.2)])     # 챙
    F.part('metal', '#3a3020', bevel=0.5).ell(*R(0, -1.8), 1.8, 1.6)
    if lit:
        F.part('glow', MH_LAMP, glow=True).ell(*R(0, -1.8), 1.2, 1.1)
        F.glow(*R(0, -1.8), 4.5, MH_LAMP, 0.35)
    else:
        F.part('metal', '#4a4030', flat=True).ell(*R(0, -1.8), 1.1, 1.0)


def mine_body(f):
    """몸 8장(72×56) — 0·1 살이 숨 쉰다(입 틈이 열린다) · 2·3 녹 · 고름 · 4·5 앞판이 찢겨 살이 비어져 나온다 · 6·7 무너짐(등불이 꺼진다)"""
    F = ZFig(MH_W, MH_H)
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = 0 if f < 6 else (1 if f == 6 else 2)
    sag = dead * 4
    # 살 무더기 — 광차 위로 솟고 가장자리로 흘러넘친다(뒤 겹)
    top = 7 - b * 0.8 + sag
    mound = [(11, 30), (12, 24), (16, 17 + sag * 0.6), (22, top + 4), (30, top), (40, top - 1 + b * 0.3), (50, top + 2), (57, 13 + sag * 0.7), (61, 20), (62, 30)]
    F.part('flesh', MH_FL_D, bevel=4).poly(mound)
    F.part('flesh', MH_FL, bevel=3).poly([(x + (36 - x) * 0.07, y + 1.4) for (x, y) in mound])
    for (x, y, rx, ry) in [(24, 14 + sag, 6, 4), (42, 11 + sag, 7, 4.5), (54, 18 + sag, 4.5, 3.4), (33, 22, 5, 3)]:     # 불룩한 혹
        F.part('flesh', MH_FL_L, bevel=2).ell(x - 1, y - 1 + b * 0.3, rx, ry)
    for (x0, y0, x1, y1) in [(20, 18, 27, 24), (39, 14, 46, 20), (48, 22, 55, 27), (29, 12, 33, 19)]:   # 핏줄
        fine(F, (x0, y0 + sag), (x1, y1 + sag * 0.5), '#3a1218', 200)
    # 꽂힌 것들 — 부러진 버팀목 · 곡괭이 자루(삼킨 갱도의 흔적)
    F.part('wood', '#6a4a2a', bevel=1).cap(15, 20 + sag, 6, 6 + sag, 1.4, 1.1)
    F.part('wood', '#4a3420', flat=True).poly([(5.2, 5 + sag), (7.6, 4.2 + sag), (6.8, 7.4 + sag)])      # 쪼개진 끝
    F.part('wood', '#7a5a34', bevel=0.6).cap(57, 16 + sag, 64, 5 + sag, 0.6, 0.6)
    F.part('metal', '#6a6e78', bevel=0.8).poly([(61, 3.4 + sag), (67, 6.6 + sag), (66.4, 7.6 + sag), (62.4, 5.4 + sag), (60, 6 + sag)])
    # 입 — 살 가운데 가로로 갈라진 틈 · 이빨은 부러진 광석 조각
    my = 25 + sag * 0.5
    F.part('flesh', '#1e0a0e', flat=True).poly([(28, my), (36, my - 1.2 - b * 1.4), (45, my), (36, my + 1.2 + b * 1.6)])
    for k in range(6):
        x = 30 + k * 2.6
        F.part('stone', '#c8bca0', bevel=0.4).poly([(x, my - 0.6), (x + 1.2, my - 0.6), (x + 0.6, my + 0.8 + (k % 2) * 0.6)])
    # 투구 등불 — 막이 오를수록 하나 더 · 쓰러지면 꺼진다
    for i, (x, y, a) in enumerate(MH_LAMPS):
        if i == 3 and st < 2:
            continue
        mh_helmet(F, x, y + sag + (b * 0.4 if i % 2 else 0), a + dead * 0.4, not dead)
    # 광차 — 아래로 좁아지는 쇠 통 · 리벳 · 녹물 · 번호판
    cart = [(9, 28), (63, 28), (60, 46), (12, 46)]
    F.part('metal', MH_IRON_D, bevel=2).poly(cart)
    F.part('metal', MH_IRON, bevel=1.5).poly([(10.6, 29.4), (61.4, 29.4), (58.8, 44.6), (13.2, 44.6)])
    F.part('metal', '#6a707c', bevel=1).box(8, 27, 56, 2.4, 0.8)                                       # 테두리 쇠띠
    for k in range(4):                                                                                    # 판 이음 · 리벳
        x = 16 + k * 13
        fine(F, (x, 29.6), (x - 0.6 + k * 0.4, 44.4), MH_IRON_D, 230)
        for y in (31, 37.5, 43):
            F.part('metal', '#8a8e98', bevel=0.4).ell(x + 1.2, y, 0.55, 0.55)
    for (x, ln) in [(20, 9), (33, 6), (47, 11), (55, 5)]:                                                 # 녹물 줄
        F.part('metal', MH_RUST, flat=True).poly([(x, 29.6), (x + 1.4, 29.6), (x + 1.0, 29.6 + ln), (x + 0.4, 29.6 + ln)])
    F.part('metal', '#3a3020', bevel=0.6).box(32, 33, 9, 6, 0.6)                                          # 번호판 — 7호차
    fine(F, (34, 34.4), (39, 34.4), '#d8c890'); fine(F, (39, 34.4), (36, 38), '#d8c890')
    for s2 in (-1, 1):                                                                                    # 완충 고무
        bx = 36 + s2 * 28
        F.part('metal', MH_IRON_D, bevel=1).box(bx - 2 + (s2 > 0) * 0.5, 36, 4, 4, 1)
        F.part('metal', '#6a6e78', bevel=0.8).ell(bx + s2 * 1.6, 38, 1.4, 2.2)
    # 차축 받침
    for wx in (21, 51):
        F.part('metal', MH_IRON_D, bevel=1).box(wx - 4, 44, 8, 3, 1)
    # 흘러내린 살 — 테두리를 넘어 판 위로 늘어진 혀
    for (x, ln, w) in [(14, 7 + st * 2, 2.6), (27, 4 + st, 2), (49, 6 + st * 2, 2.4), (59, 4, 1.8)]:
        F.part('flesh', MH_FL, bevel=1).cap(x, 28, x - 0.4, 28 + ln + b * 0.6, w, w * 0.6)
        F.part('flesh', MH_FL_L, flat=True).ell(x - 0.6, 28.6, w * 0.5, 0.7)
    if st >= 1:                                                                                           # 고름 방울 · 녹 구멍
        for (x, y) in [(23, 17), (47, 15), (40, 21)]:
            F.part('flesh', '#d8c070', bevel=0.6).ell(x, y + sag, 1.2, 1.0)
        F.part('metal', '#1a1a1e', flat=True).poly([(44, 40), (47, 39), (48, 42), (45, 43)])
    if st >= 2:                                                                                           # 찢긴 앞판 — 살이 비어져 나온다
        F.part('metal', '#1a1a1e', flat=True).poly([(20, 31), (30, 30.6), (31, 38), (26, 41), (19, 37)])
        F.part('flesh', MH_FL, bevel=2).ell(25, 35, 5, 4)
        F.part('flesh', MH_FL_L, flat=True).ell(24, 34, 2.2, 1.6)
        F.part('flesh', '#1e0a0e', flat=True).ell(26, 36.5, 1.8, 0.8)                                     # 그 안에도 틈
        for (x0, y0, x1, y1) in [(20, 31, 17, 28.6), (30, 30.6, 32.6, 28.4)]:                            # 젖혀진 쇠판 끝
            F.part('metal', MH_IRON, bevel=0.6).poly([(x0, y0), (x1, y1), (x1 + 1.2, y1 + 0.6), (x0 + 1, y0 + 0.6)])
    if dead:
        for k in range(6):                                                                                # 흘러내린 살 웅덩이
            x = 12 + k * 9
            F.part('flesh', MH_FL_D, bevel=1).ell(x, 46 + dead, 4 + (k % 2), 1.4)
    return F.render()


def mine_parts(f):
    """조각 5장(24×24) — 0 바퀴(가운데 (12, 12) · r 6.5 · 살이 엉긴 바퀴살) · 1 팔 마디(살 촉수 (3, 12) → (21, 12))
       2 곡괭이 손((3, 12) 에서 쥔 녹슨 곡괭이 · 날끝 (21, 4)) · 3 솟는 촉수(밑 (12, 23) → 끝 (12, 2) · 갈고리 이빨) · 4 금 간 바퀴"""
    F = ZFig(24, 24)
    if f in (0, 4):
        F.part('metal', MH_IRON_D, bevel=1).ell(12, 12, 6.6, 6.6)
        F.part('metal', MH_IRON, bevel=1).ell(12, 12, 5.6, 5.6)
        F.part('metal', '#1e2026', flat=True).ell(12, 12, 4.2, 4.2)
        for k in range(6):                                                                                # 바퀴살 — 돌 때 보이게 하나는 살이 감겼다
            a = k / 6 * math.tau
            F.part('metal', '#6a6e78', bevel=0.4).cap(12, 12, 12 + math.cos(a) * 4.4, 12 + math.sin(a) * 4.4, 0.6, 0.5)
        F.part('flesh', MH_FL, bevel=0.6).cap(12, 12, 12 + 4.2, 12 - 0.6, 1.1, 0.7)
        F.part('metal', '#8a8e98', bevel=0.6).ell(12, 12, 1.4, 1.4)
        F.part('metal', '#6a707c', bevel=0.4).ell(12 - 4.6, 12 - 3.4, 0.6, 0.6)
        if f == 4:
            crack(F, [(12, 6), (14, 9), (13, 12)], 0.3, '#ffb050')
    elif f == 1:
        F.part('flesh', MH_FL_D, bevel=1.5).cap(4.5, 12, 20, 12, 3.4, 2.6)
        F.part('flesh', MH_FL, bevel=1).cap(4.8, 11.4, 19.6, 11.6, 2.4, 1.8)
        for k in range(4):
            fine(F, (6 + k * 4, 9.6), (7 + k * 4, 14.4), '#3a1218', 180)                                 # 주름
    elif f == 2:
        F.part('wood', '#6a4a2a', bevel=0.6).cap(5, 16, 17, 5, 0.8, 0.8)                                 # 자루
        F.part('metal', '#6a6e78', bevel=0.8).poly([(12, 2.4), (21.4, 4), (22, 5.4), (17.6, 5.2), (14.4, 8.6), (13, 7.6), (15.6, 4.4)])
        F.part('metal', MH_RUST, flat=True).poly([(18, 4.2), (20.4, 4.4), (19.6, 5.0)])
        F.part('flesh', MH_FL_D, bevel=1.2).cap(3.6, 13, 8, 13.6, 2.8, 2.6)                                 # 감아쥔 촉수 끝
        F.part('flesh', MH_FL, bevel=1).ell(8.4, 13.4, 2.6, 2.4)
        for k in range(3):
            F.part('flesh', MH_FL_L, bevel=0.6).cap(7 + k * 1.2, 11.4, 9.6 + k * 1.2, 16 - k * 0.6, 0.7, 0.5)
    elif f == 3:
        pts = [(12 + math.sin(t * 2.4) * 2.2 * (1 - t), 23 - t * 20) for t in [k / 10 for k in range(11)]]
        for (a, b2), k in zip(zip(pts, pts[1:]), range(10)):
            r = 3.2 - k * 0.24
            F.part('flesh', MH_FL_D if k % 2 else MH_FL, bevel=1).cap(a[0], a[1], b2[0], b2[1], r, r - 0.24)
        for k in range(4):                                                                                # 갈고리 이빨
            x, y = pts[2 + k * 2]
            s2 = 1 if k % 2 else -1
            F.part('stone', '#d8ccb0', bevel=0.3).poly([(x + s2 * 1.8, y), (x + s2 * 3.8, y - 1.6), (x + s2 * 1.6, y - 1.2)])
        F.part('flesh', '#1e0a0e', flat=True).ell(pts[-1][0], pts[-1][1] + 1, 0.8, 1.1)
    return F.render()


# ===== 얼음 감시자(ice_warden) — 얼음 유적의 망루 구조물: 청동 띠로 묶은 빙하 덩이 몸 · 등롱 머리의 큰 렌즈 하나가 눈 · 어깨 포탑 둘 =====
IW_ICE, IW_ICE_D, IW_ICE_L, IW_BRZ, IW_BRZ_D, IW_LENS = '#8cc8e0', '#3e6a84', '#d4f0fa', '#9a7444', '#5a4228', '#e8fbff'
IW_W, IW_H, IW_DY = 56, 68, 4                                 # 게임 game/boss-watch-art.ts IW 와 같게(가운데 28 · 엉덩이 (19, 60) · (37, 60) · 렌즈 (28, 15) · 어깨 받침 (11, 29) · (45, 29)) — 그린 뒤 IW_DY 만큼 내린다(지붕 고드름)


def watch_body(f):
    """몸 8장(56×64 · 다리는 조각) — 0·1 속의 톱니가 돈다 · 2·3 금 · 서리 결정이 자란다 · 4·5 어깨 받침이 비었다(포탑이 떨어져 나감) · 금이 깊다 · 6·7 무너짐"""
    F = ZFig(IW_W, IW_H - IW_DY)
    cx = 28
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    sag = 0 if f < 6 else (3 if f == 6 else 8)
    # 몸통 — 넓은 가슴에서 허리로 좁아지는 빙하 덩이
    body = [(cx - 19, 22 + sag), (cx - 13, 16 + sag), (cx + 13, 16 + sag), (cx + 19, 22 + sag), (cx + 17, 34), (cx + 11, 47), (cx - 11, 47), (cx - 17, 34)]
    F.part('ice', IW_ICE_D, bevel=4).poly(body)
    F.part('ice', IW_ICE, bevel=3).poly([(x + (cx - x) * 0.09, y + 1.2) for (x, y) in body])
    F.part('ice', IW_ICE_L, bevel=2).poly([(cx - 15, 22 + sag), (cx - 11, 18.4 + sag), (cx - 3, 18.4 + sag), (cx - 5, 26), (cx - 14, 29)])
    # 허리 아래 — 청동 비늘 치마(엉덩이 관절을 덮는다 · 다리는 그 밑에서 나온다)
    F.part('metal', IW_BRZ_D, bevel=2).poly([(cx - 12, 45), (cx + 12, 45), (cx + 15, 52), (cx - 15, 52)])
    for k in range(-1, 2):
        x = cx + k * 9
        F.part('metal', IW_BRZ, bevel=1.2).poly([(x - 4.6, 46), (x + 4.6, 46), (x + 5.2 + k * 0.8, 55 - abs(k)), (x - 5.2 + k * 0.8, 55 - abs(k))])
        F.part('metal', '#c8a060', bevel=0.4).ell(x, 48, 0.7, 0.7)
        fine(F, (x - 4.4 + k * 0.4, 53.6 - abs(k)), (x + 4.4 + k * 0.8, 53.6 - abs(k)), IW_BRZ_D, 230)
    # 얼음 속에 갇힌 시계 장치 — 망루의 톱니(장마다 조금 돈다)
    F.part('ice', '#2a4a60', flat=True).ell(cx, 33, 8.4, 8.4)
    a0 = b * 0.26 + st * 0.5
    for k in range(10):
        a = a0 + k / 10 * math.tau
        F.part('metal', IW_BRZ, bevel=0.5).poly([(cx + math.cos(a - 0.12) * 6.2, 33 + math.sin(a - 0.12) * 6.2), (cx + math.cos(a - 0.08) * 7.6, 33 + math.sin(a - 0.08) * 7.6),
                                                   (cx + math.cos(a + 0.08) * 7.6, 33 + math.sin(a + 0.08) * 7.6), (cx + math.cos(a + 0.12) * 6.2, 33 + math.sin(a + 0.12) * 6.2)])
    F.part('metal', IW_BRZ, bevel=1).ell(cx, 33, 6.3, 6.3)
    F.part('metal', '#2a3a48', flat=True).ell(cx, 33, 4.6, 4.6)
    F.part('metal', '#c8a060', bevel=0.6).cap(cx, 33, cx + math.cos(a0 * 3) * 3.6, 33 + math.sin(a0 * 3) * 3.6, 0.5, 0.3)   # 바늘
    F.part('metal', '#c8a060', bevel=0.6).ell(cx, 33, 1.0, 1.0)
    F.part('ice', IW_ICE_L, flat=True).poly([(cx - 7, 27), (cx - 3, 26), (cx - 6, 30)])                                  # 얼음 겉의 반사
    for (y, w) in ((21.5 + sag * 0.6, 14.6), (42.5, 12.2)):                                                              # 청동 띠
        F.part('metal', IW_BRZ_D, bevel=1).poly([(cx - w, y - 1.2), (cx + w, y - 1.2), (cx + w - 0.4, y + 1.4), (cx - w + 0.4, y + 1.4)])
        F.part('metal', IW_BRZ, bevel=0.6).poly([(cx - w + 0.4, y - 1.0), (cx + w - 0.4, y - 1.0), (cx + w - 0.6, y + 0.2), (cx - w + 0.6, y + 0.2)])
        for k in range(5):
            F.part('metal', '#c8a060', bevel=0.3).ell(cx - w * 0.8 + k * w * 0.4, y + 0.2, 0.6, 0.6)
    # 어깨 — 빙하 견갑 위에 포탑이 앉는 청동 고리(포탑은 게임이 그린다) · 막 2 엔 비어 서리가 낀다
    for s2 in (-1, 1):
        sx = cx + s2 * 18
        F.part('ice', IW_ICE_D, bevel=3).ell(sx, 25 + sag, 7.4, 6.4)
        F.part('ice', IW_ICE, bevel=2).ell(sx - s2 * 0.4, 24.4 + sag, 6.2, 5.2)
        F.part('ice', IW_ICE_L, flat=True).ell(sx - 2, 22.4 + sag, 2.4, 1.4)
        F.part('metal', IW_BRZ_D, bevel=1.2).ell(sx, 21.2 + sag, 4.8, 1.8)
        F.part('metal', IW_BRZ, bevel=0.8).ell(sx, 20.8 + sag, 4.0, 1.3)
        for k in range(4):
            F.part('metal', '#c8a060', bevel=0.3).ell(sx - 3 + k * 2, 21.4 + sag, 0.45, 0.45)
        if st >= 2:
            F.part('metal', '#1e2a34', flat=True).ell(sx, 20.8 + sag, 2.8, 0.8)
            for k in range(3):
                F.part('ice', IW_ICE_L, bevel=0.4).poly([(sx - 3 + k * 2.6, 20.6 + sag), (sx - 2.2 + k * 2.6, 17.4 + sag - (k % 2)), (sx - 1.4 + k * 2.6, 20.6 + sag)])
    # 머리 — 등롱: 청동 틀 · 큰 렌즈 하나(눈 · 빛은 게임이 돌린다) · 지붕의 뾰족한 서리 꼭지
    hy = 2 + sag
    F.part('metal', IW_BRZ_D, bevel=2).poly([(cx - 9, hy + 15), (cx - 10, hy + 6), (cx - 6, hy + 2), (cx + 6, hy + 2), (cx + 10, hy + 6), (cx + 9, hy + 15)])
    F.part('metal', IW_BRZ, bevel=1.5).poly([(cx - 11, hy + 3.4), (cx - 4, hy - 1.2), (cx + 4, hy - 1.2), (cx + 11, hy + 3.4), (cx + 9, hy + 4.2), (cx - 9, hy + 4.2)])   # 처마 진 지붕
    F.part('ice', IW_ICE_L, bevel=0.6).poly([(cx - 1, hy - 1), (cx, hy - 5.4), (cx + 1, hy - 1)])                        # 꼭지 고드름
    F.part('metal', '#1a2632', flat=True).ell(cx, hy + 9, 6.6, 6.0)
    F.part('ice', '#6aa8c8', bevel=1).ell(cx, hy + 9, 5.4, 5.0)
    F.part('ice', IW_LENS, bevel=0.6).ell(cx - 1.2, hy + 7.8, 2.2, 1.8)
    F.part('glow', '#bff0ff', glow=True).ell(cx, hy + 9, 1.6 + b * 0.3, 1.6 + b * 0.3)
    F.glow(cx, hy + 9, 6 + b, '#bff0ff', 0.3)
    for s2 in (-1, 1):                                                                                                    # 렌즈 틀의 살 · 볼트
        fine(F, (cx + s2 * 6.6, hy + 4), (cx + s2 * 6.6, hy + 14), '#c8a060', 220)
        F.part('metal', '#c8a060', bevel=0.4).ell(cx + s2 * 8.4, hy + 13, 0.7, 0.7)
    F.part('metal', IW_BRZ_D, bevel=0.8).box(cx - 11, hy + 14.4, 22, 1.6, 0.4)                                            # 망루 난간
    for k in range(6):
        fine(F, (cx - 10 + k * 4, hy + 14.4), (cx - 10 + k * 4, hy + 12.4), IW_BRZ, 230)
    fine(F, (cx - 10.4, hy + 12.4), (cx + 10.4, hy + 12.4), IW_BRZ, 230)
    # 서리 결정 — 막이 오를수록 많이
    crys = [(cx - 23, 24 + sag, -1.0, 4), (cx + 23, 23 + sag, 0.9, 5), (cx - 7, 17 + sag, -0.2, 3)]
    if st >= 1:
        crys += [(cx + 7, 17 + sag, 0.25, 4), (cx - 15, 36, -1.2, 3.5), (cx + 13, 41, 1.1, 3)]
    if st >= 2:
        crys += [(cx + 21, 20 + sag, 0.5, 6), (cx - 21, 20 + sag, -0.5, 5)]
    for (x, y, a, ln) in crys:
        tx, ty = x + math.sin(a) * ln, y - math.cos(a) * ln
        F.part('ice', IW_ICE_L, bevel=0.6).poly([(x - math.cos(a) * 1.1, y - math.sin(a) * 1.1), (tx, ty), (x + math.cos(a) * 1.1, y + math.sin(a) * 1.1)])
    if st >= 1:
        crack(F, [(cx + 10, 18 + sag), (cx + 7, 26), (cx + 11, 34)], 0.4, '#e8fbff')
    if st >= 2:
        crack(F, [(cx - 12, 30), (cx - 8, 38), (cx - 12, 48)], 0.5, '#e8fbff')
        crack(F, [(cx + 3, 42), (cx + 6, 49)], 0.35, '#e8fbff')
    if sag:
        for k in range(7):
            x = 12 + k * 5.4; y = 56 + (k % 3) * 1.6
            F.part('ice', IW_ICE if k % 2 else IW_ICE_D, bevel=1).poly([(x, y), (x + 3, y - 2.4), (x + 5, y + 0.6), (x + 1.6, y + 2.4)])
    out = Image.new('RGBA', (IW_W * K, IW_H * K), (0, 0, 0, 0))
    out.paste(F.render(), (0, IW_DY * K))
    return out


def watch_parts(f):
    """조각 5장(20×36) — 0 다리(엉덩이 (10, 5) → 발 (10, 33) · 얼음 덮인 청동 기둥 · 넓은 발) · 1 어깨 포탑(받침 (10, 22) · 포신 → (10, 4) 위로)
       2 내려앉은 포탑(세 다리 · 바닥 (10, 34) · 렌즈 (10, 14)) · 3 다리 — 막 2(서리 덮임) · 4 금 간 포탑"""
    F = ZFig(20, 36)
    if f in (0, 3):
        F.part('metal', IW_BRZ_D, bevel=1.5).cap(10, 5.4, 10, 18, 4.4, 4.0)
        F.part('ice', IW_ICE_D, bevel=1.5).poly([(3.6, 8), (16.4, 8), (15.2, 17), (4.8, 17)])          # 넓적다리 얼음 갑
        F.part('ice', IW_ICE, bevel=1).poly([(4.8, 8.8), (14.6, 8.8), (13.8, 15.6), (5.8, 15.6)])
        F.part('metal', IW_BRZ, bevel=1).ell(10, 19, 5.0, 3.0)                                    # 무릎
        F.part('metal', '#c8a060', bevel=0.4).ell(10, 19, 1.0, 1.0)
        F.part('metal', IW_BRZ_D, bevel=1.5).cap(10, 21, 10, 30, 4.2, 4.0)
        F.part('ice', IW_ICE_L if f == 3 else IW_ICE, bevel=1).poly([(4.8, 22), (15.2, 22), (14.4, 30), (5.6, 30)])   # 정강이 얼음 갑
        F.part('metal', IW_BRZ_D, bevel=1.2).poly([(2.4, 35), (17.6, 35), (16, 31), (4, 31)])           # 발
        F.part('metal', IW_BRZ, bevel=0.6).box(4, 31, 12, 1.4, 0.4)
        if f == 3:
            for k in range(3):
                F.part('ice', IW_ICE_L, bevel=0.4).poly([(6 + k * 3, 31), (6.8 + k * 3, 27.6), (7.6 + k * 3, 31)])
    elif f in (1, 4):
        F.part('metal', IW_BRZ_D, bevel=1.4).box(5, 17, 10, 6, 1.4)                                # 받침
        F.part('metal', IW_BRZ, bevel=1.2).ell(10, 15, 4.6, 4.2)                                    # 회전 머리
        F.part('metal', '#4a5868', bevel=1.2).cap(10, 13, 10, 3.4, 2.2, 1.8)                         # 포신
        F.part('metal', IW_BRZ, bevel=0.6).box(7.4, 6, 5.2, 1.4, 0.5)
        F.part('ice', '#6aa8c8', bevel=0.6).ell(10, 3.0, 1.9, 1.2)
        F.part('glow', '#bff0ff', glow=True).ell(10, 3.0, 1.0, 0.7)
        F.part('ice', '#6aa8c8', bevel=0.6).ell(10, 15, 2.2, 2.0)                                   # 작은 렌즈(제 눈)
        F.part('glow', '#bff0ff', glow=True).ell(10, 15, 1.0, 1.0)
        if f == 4:
            crack(F, [(7, 17), (9, 20), (8, 22)], 0.3, '#e8fbff')
    else:
        for (x0, x1) in [(10, 3.4), (10, 16.6), (10, 10)]:                                          # 세 다리
            F.part('metal', IW_BRZ_D, bevel=0.8).cap(x0, 22, x1, 33.4, 1.0, 0.8)
        F.part('metal', IW_BRZ, bevel=0.6).box(2, 33, 16, 1.6, 0.6)
        F.part('metal', IW_BRZ_D, bevel=1.4).box(5, 19, 10, 5, 1.4)
        F.part('metal', IW_BRZ, bevel=1.2).ell(10, 15, 4.6, 4.2)
        F.part('metal', '#4a5868', bevel=1.2).cap(10, 13, 10, 3.4, 2.2, 1.8)
        F.part('ice', '#6aa8c8', bevel=0.6).ell(10, 3.0, 1.9, 1.2)
        F.part('glow', '#bff0ff', glow=True).ell(10, 3.0, 1.0, 0.7)
        F.part('ice', '#6aa8c8', bevel=0.6).ell(10, 15, 2.2, 2.0)
        F.part('glow', '#bff0ff', glow=True).ell(10, 15, 1.0, 1.0)
    return F.render()


# ===== 포자 여왕(spore_queen) — 포자 굴의 버섯 여왕: 망사 치마(망태버섯)를 두른 대 · 갓 아래 가면 같은 얼굴 · 갓은 조각(닫힘 · 열림 · 펼침) =====
SQ_STALK, SQ_STALK_D, SQ_LACE, SQ_CAP, SQ_CAP_D, SQ_CAP_L, SQ_GILL, SQ_GLOW = '#e6dcc4', '#9a8e74', '#f4eedc', '#8a5a7a', '#4e2e48', '#b884a4', '#d8c8b0', '#8ff0c8'
SQ_W, SQ_H = 44, 76                                           # 게임 game/boss-spore-art.ts SQ 와 같게(가운데 22 · 갓 자리 (22, 9) · 땅 74 · 팔 어깨 (15, 24) · (29, 24))


def spore_body(f):
    """몸 8장(44×76 · 갓은 조각) — 0·1 망사가 숨 쉰다 · 2·3 망사가 길게 · 균사가 감긴다 · 4·5 매달린 몸(대 아래가 실로 풀린다) · 6·7 시듦"""
    F = ZFig(SQ_W, SQ_H)
    cx = 22
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = 0 if f < 6 else (1 if f == 6 else 2)
    sag = dead * 3
    hang = st >= 2 and not dead
    # 대 — 망사 뒤로 비치는 줄기(위는 매끈 · 아래는 대주머니)
    bot = 58 if hang else 70
    F.part('flesh', SQ_STALK_D, bevel=2).cap(cx, 12 + sag, cx, bot - 2, 4.4, 5.2)
    F.part('flesh', SQ_STALK, bevel=1.5).cap(cx - 0.6, 12 + sag, cx - 0.6, bot - 6, 3.4, 4.0)
    if not hang:
        F.part('flesh', '#b8a888', bevel=2).poly([(cx - 8, bot + 4), (cx - 7, bot - 2), (cx - 3, bot - 4), (cx + 3, bot - 4), (cx + 7, bot - 2), (cx + 8, bot + 4)])   # 대주머니
        for k in range(5):                                                                      # 뿌리 균사
            x0 = cx - 6 + k * 3
            fine(F, (x0, bot + 3.6), (x0 + (k - 2) * 2.4, bot + 5.6), '#f0ead8', 220)
    else:
        for k in range(6):                                                                      # 매달린 몸 — 대 아래가 실로 풀린다
            x0 = cx - 3 + k * 1.2
            fine(F, (x0, bot - 2), (x0 + (k - 2.5) * 1.8 + b * 0.4, bot + 8 + (k % 3) * 2), '#f0ead8', 230)
    # 망사 치마 — 고리에서 늘어진 그물(망태버섯) · 마름모 그물눈 사이로 대가 비친다
    sk = 13 + b * 0.6 + st * 1.2
    y0, y1 = 18 + sag, bot - 1
    half = lambda y: 5.6 + (sk - 5.6) * ((y - y0) / (y1 - y0)) ** 0.8 + math.sin(y * 0.9 + b) * 0.3
    N = 5
    for fam in (-1, 1):                                                                         # 두 갈래 비스듬한 실 — 마름모 그물
        for i in range(-N - 9, N + 10):
            prev = None
            for k in range(41):
                y = y0 + (y1 - y0) * k / 40
                v = i / N + fam * (y - y0) / (y1 - y0) * 1.2
                if abs(v) > 1:
                    prev = None; continue
                pt = (cx + v * half(y), y)
                if prev:
                    F.line(prev[0], prev[1], pt[0], pt[1], '#d8ceb4' if fam > 0 else SQ_LACE, 215)
                prev = pt
    for s2 in (-1, 1):                                                                          # 가장자리 실
        prev = None
        for k in range(41):
            y = y0 + (y1 - y0) * k / 40; pt = (cx + s2 * half(y), y)
            if prev:
                F.line(prev[0], prev[1], pt[0], pt[1], SQ_LACE, 255)
            prev = pt
    hem = [(cx - half(y1), y1)] + [(cx + v / 6 * half(y1), y1 + 0.8 + (abs(v) % 2) * 0.8) for v in range(-6, 7)] + [(cx + half(y1), y1)]
    for (p0, p1) in zip(hem, hem[1:]):                                                          # 치맛단 — 매듭진 끝
        F.line(p0[0], p0[1], p1[0], p1[1], SQ_LACE, 255)
    F.part('cloth', SQ_LACE, bevel=1).ell(cx, 18 + sag, 7, 1.8)                                 # 고리(턱받이)
    # 얼굴 — 갓 그늘의 가면: 감은 눈 · 이마의 빛 점(막 1 부터 눈을 뜬다)
    hy = 8 + sag
    F.part('flesh', '#d8ccb0', bevel=2).ell(cx, hy + 4, 4.6, 5.4)
    F.part('flesh', '#efe6d0', bevel=1).ell(cx - 0.6, hy + 3.4, 3.4, 4.0)
    for s2 in (-1, 1):
        if st == 0 or dead:
            fine(F, (cx + s2 * 1.0, hy + 4), (cx + s2 * 2.6, hy + 4.4), '#4e3e38', 230)
        else:
            F.part('flesh', '#1e2a24', flat=True).ell(cx + s2 * 1.8, hy + 4.2, 1.0, 0.6)
            F.part('glow', SQ_GLOW, glow=True).ell(cx + s2 * 1.8, hy + 4.2, 0.5, 0.35)
    fine(F, (cx - 0.8, hy + 7.2), (cx + 0.8, hy + 7.2), '#8a6a5a', 220)
    F.part('glow', SQ_GLOW, glow=True).ell(cx, hy + 1.4, 0.7, 0.7)
    for (x, y) in [(cx - 2.6, hy + 6.4), (cx + 2.8, hy + 5.8), (cx - 3.4, hy + 2.6)]:          # 볼의 작은 버섯 반점
        F.part('flesh', SQ_CAP_L, flat=True).ell(x, y, 0.5, 0.4)
    if st >= 1:                                                                                  # 감긴 균사 · 줄기에 돋은 새끼 버섯
        for k in range(4):
            y = 28 + k * 7
            fine(F, (cx - 5, y + sag), (cx + 5, y + 2.4 + sag), '#f0ead8', 200)
        for (x, y, r) in [(cx - 5, 34, 1.6), (cx + 4.6, 41, 1.2), (cx - 3, 48, 1.0)]:
            F.part('flesh', SQ_CAP, bevel=0.6).ell(x, y + sag - 0.8, r * 1.4, r * 0.8)
            F.part('glow', SQ_GLOW, glow=True).ell(x, y + sag, r * 0.6, r * 0.3)
    if dead:
        for k in range(5):
            x = 10 + k * 6
            F.part('cloth', '#a89e86', bevel=0.6).poly([(x, 72), (x + 3, 70 - k % 2), (x + 5, 72.4), (x + 2, 73.6)])
    return F.render()


def spore_parts(f):
    """조각 5장(80×36) — 갓 자리 (40, 30) 가 대 꼭대기(얼굴 위)에 앉는다.
       0 닫힌 갓(둥근 지붕) · 1 들린 갓(주름이 보이고 빛난다) · 2 펼친 갓(넓고 납작 — 매달림) · 3 펼친 갓 주름 열림 · 4 균사 팔((4, 18) → (36, 18) · 끝이 가늘게 갈라진다)"""
    F = ZFig(80, 36)
    def spots(cx, cy, rx, ry, n):
        for k in range(n):
            a = math.pi * (0.12 + 0.76 * k / max(1, n - 1))
            r = 0.55 + 0.3 * ((k * 7) % 3) / 2
            x, y = cx - math.cos(a) * rx * r, cy - math.sin(a) * ry * r
            F.part('flesh', '#e8d8e0', bevel=0.5).ell(x, y, 1.4 + (k % 2) * 0.6, 0.9 + (k % 2) * 0.3)
    if f in (0, 1):
        lift = 2.4 if f == 1 else 0
        if f == 1:                                                                               # 주름 — 갓 아래 부채살 · 빛
            F.part('flesh', SQ_GILL, bevel=1).ell(40, 30 - lift + 0.6, 17, 3.6)
            for k in range(23):
                x = 24 + k * 1.45
                fine(F, (40 + (x - 40) * 0.2, 29.4 - lift), (x, 31.8 - lift + abs(x - 40) * 0.04), '#9a8a74', 230)
            F.part('glow', SQ_GLOW, glow=True).ell(40, 31 - lift, 12, 1.0)
            F.glow(40, 31 - lift, 10, SQ_GLOW, 0.35)
        dome = [(40 + math.cos(a) * 19, 29 - lift - math.sin(a) * 17) for a in [math.pi * k / 24 for k in range(25)]]
        dome += [(57, 31 - lift), (23, 31 - lift)]
        F.part('flesh', SQ_CAP_D, bevel=4).poly(dome)
        F.part('flesh', SQ_CAP, bevel=3).poly([(40 + (x - 40) * 0.9, y + 1) for (x, y) in dome])
        F.part('flesh', SQ_CAP_L, flat=True).ell(34, 18 - lift, 6, 3)
        spots(40, 29 - lift, 17, 15, 7)
        F.part('flesh', '#3a2236', bevel=0.8).box(22, 29.4 - lift, 36, 1.8, 0.8)                 # 갓 테두리
    elif f in (2, 3):
        if f == 3:
            F.part('flesh', SQ_GILL, bevel=1).ell(40, 29.6, 34, 3.4)
            for k in range(45):
                x = 8 + k * 1.45
                fine(F, (40 + (x - 40) * 0.15, 28.4), (x, 31.0 + abs(x - 40) * 0.02), '#9a8a74', 230)
            F.part('glow', SQ_GLOW, glow=True).ell(40, 30.2, 26, 1.0)
            F.glow(40, 30.2, 16, SQ_GLOW, 0.4)
        flat = [(40 + math.cos(a) * 36, 29 - math.sin(a) * 9) for a in [math.pi * k / 30 for k in range(31)]]
        flat += [(75, 30), (5, 30)]
        F.part('flesh', SQ_CAP_D, bevel=3).poly(flat)
        F.part('flesh', SQ_CAP, bevel=2).poly([(40 + (x - 40) * 0.94, y + 0.8) for (x, y) in flat])
        F.part('flesh', SQ_CAP_L, flat=True).ell(30, 23.4, 10, 1.8)
        spots(40, 29, 33, 8, 11)
        for k in range(9):                                                                       # 펼친 갓 테두리 — 물결 · 늘어진 망사 실
            x = 8 + k * 8
            F.part('flesh', '#3a2236', bevel=0.5).ell(x, 29.8, 4.4, 1.0)
            fine(F, (x + 2, 30.4), (x + 2.4, 33.6 + (k % 3)), '#f0ead8', 200)
    else:
        pts = [(4 + t * 32, 18 + math.sin(t * 5.2) * 3 * t) for t in [k / 12 for k in range(13)]]
        for (a, b2), k in zip(zip(pts, pts[1:]), range(12)):
            r = 1.8 - k * 0.11
            F.part('flesh', SQ_STALK_D if k % 3 == 0 else SQ_STALK, bevel=0.6).cap(a[0], a[1], b2[0], b2[1], r, r - 0.1)
        x, y = pts[-1]
        for s2 in (-1, 0, 1):                                                                    # 갈라진 끝 — 실 셋
            fine(F, (x - 0.6, y), (x + 4, y + s2 * 2.6 + 0.4), '#f0ead8', 240)
        for k in range(3):
            F.part('glow', SQ_GLOW, glow=True).ell(pts[3 + k * 3][0], pts[3 + k * 3][1] - 1.0, 0.5, 0.5)
    return F.render()


# ===== 증식체(proliferator) — 핵 하나에 꽂힌 모듈 덩어리: 맞을수록 모듈이 떨어져 나가 기어 다니고, 핵은 작아지고 빨라진다 =====
PF_STEEL, PF_STEEL_D, PF_STEEL_L, PF_RUST, PF_CORE = '#8a8478', '#4a463e', '#b8b0a0', '#9a6a42', '#ffc860'
PF_W, PF_H = 32, 32                                           # 게임 game/boss-prolif-art.ts PF 와 같게(핵 가운데 (16, 16) · 반지름 11 · 꽂는 구멍 여섯)


def prolif_core(f):
    """핵 8장(32×32) — 0·1 렌즈가 숨 쉰다 · 2·3 금 · 4·5 드러난 핵(구멍이 비어 빛이 샌다) · 6·7 꺼짐"""
    F = ZFig(PF_W, PF_H)
    cx = cy = 16
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = f >= 6
    F.part('metal', PF_STEEL_D, bevel=3).ell(cx, cy, 11.4, 11.4)
    F.part('metal', PF_STEEL, bevel=2).ell(cx - 0.4, cy - 0.4, 10, 10)
    F.part('metal', PF_STEEL_L, flat=True).ell(cx - 4, cy - 5, 3.4, 1.8)
    for k in range(6):                                                                          # 꽂는 구멍 — 모듈이 박히는 자리
        a = k / 6 * math.tau + 0.26
        x, y = cx + math.cos(a) * 8.4, cy + math.sin(a) * 8.4
        F.part('metal', '#2a2620', flat=True).ell(x, y, 1.6, 1.6)
        if st >= 2 and not dead:
            F.part('glow', PF_CORE, glow=True).ell(x, y, 0.9, 0.9)
        F.part('metal', '#6a6458', bevel=0.4).ell(x + math.cos(a) * 1.8, y + math.sin(a) * 1.8, 0.5, 0.5)
    for k in range(12):                                                                         # 리벳 테
        a = k / 12 * math.tau
        F.part('metal', '#c8c0b0', bevel=0.3).ell(cx + math.cos(a) * 10.6, cy + math.sin(a) * 10.6, 0.45, 0.45)
    # 렌즈 — 조리개 날 · 가운데 빛
    F.part('metal', '#2a2620', bevel=1).ell(cx, cy, 5.6, 5.6)
    for k in range(6):
        a = k / 6 * math.tau + b * 0.3
        F.part('metal', '#5a5448', bevel=0.4).poly([(cx + math.cos(a) * 5.2, cy + math.sin(a) * 5.2), (cx + math.cos(a + 1.0) * 5.2, cy + math.sin(a + 1.0) * 5.2),
                                                    (cx + math.cos(a + 0.7) * 2.2, cy + math.sin(a + 0.7) * 2.2)])
    if not dead:
        r = 2.0 + b * 0.4 + (1.0 if st >= 2 else 0)
        F.part('glow', PF_CORE, glow=True).ell(cx, cy, r, r)
        F.part('glow', '#fff4d0', glow=True).ell(cx - 0.4, cy - 0.4, r * 0.4, r * 0.4)
        F.glow(cx, cy, 7 + b + st, PF_CORE, 0.35)
    else:
        F.part('metal', '#3a3428', flat=True).ell(cx, cy, 2.2, 2.2)
    if st >= 1:
        crack(F, [(cx + 6, cy - 8), (cx + 3, cy - 4)], 0.3, PF_CORE)
    if st >= 2:
        crack(F, [(cx - 8, cy + 5), (cx - 4, cy + 2)], 0.35, PF_CORE)
    return F.render()


def prolif_parts(f):
    """모듈 6장(14×14 · 가운데 (7, 7) · 한 변 11) — 0 판 · 1 리벳 포 · 2 피스톤 · 3 배기구 · 4 다리 · 5 떨어져 나온 모듈의 작은 다리 셋"""
    F = ZFig(14, 14)
    if f <= 4:
        F.part('metal', PF_STEEL_D, bevel=2).box(1.5, 1.5, 11, 11, 1.4)
        F.part('metal', PF_STEEL, bevel=1.5).box(2.3, 2.1, 9.4, 9.4, 1.0)
        F.part('metal', PF_STEEL_L, flat=True).box(2.8, 2.6, 4.4, 1.2, 0.4)
        for (x, y) in [(3.2, 3.2), (10.8, 3.2), (3.2, 10.8), (10.8, 10.8)]:
            F.part('metal', '#c8c0b0', bevel=0.3).ell(x, y, 0.55, 0.55)
        if f == 0:
            fine(F, (3.4, 7), (10.6, 7), PF_STEEL_D, 220); F.part('metal', PF_RUST, flat=True).poly([(5, 8), (8, 8.2), (6.4, 10.6)])
        elif f == 1:
            F.part('metal', '#2a2620', bevel=0.8).ell(7, 7, 3.0, 3.0)
            F.part('metal', '#6a6458', bevel=0.8).cap(7, 7, 11.8, 7, 1.5, 1.2)                   # 포신(오른쪽)
            F.part('metal', '#2a2620', flat=True).ell(11.8, 7, 0.7, 0.7)
        elif f == 2:
            F.part('metal', '#6a6458', bevel=0.6).box(4.4, 4.2, 5.2, 5.6, 0.6)
            F.part('metal', '#d8d0c0', bevel=0.4).cap(7, 4, 7, 1.7, 0.8, 0.8)                    # 피스톤 대
        elif f == 3:
            for k in range(4):
                F.part('metal', '#2a2620', flat=True).box(3.6, 3.8 + k * 1.8, 6.8, 0.9, 0.3)
            F.part('glow', PF_CORE, glow=True).box(4.2, 4.0, 5.6, 0.5, 0.2)
        else:
            F.part('metal', '#6a6458', bevel=0.8).cap(7, 9, 7, 13.0, 1.6, 1.2)                   # 발목
            F.part('metal', PF_STEEL_D, bevel=0.8).box(3.4, 12.0, 7.2, 1.6, 0.6)
    else:
        for (x0, x1) in [(4, 1.4), (7, 7), (10, 12.6)]:
            F.part('metal', '#4a463e', bevel=0.4).cap(x0, 9, x1, 12.8, 0.6, 0.45)
    return F.render()


# ===== 헤파(hepha) — 최초의 기계: 공장 건물째가 몸 · 가운데 용광로 탑(현창 눈 둘 · 아래 화로 문이 입) · 양 날개 · 굴뚝 · 기중기 팔 둘 =====
HP_IRON, HP_IRON_D, HP_IRON_L, HP_BRICK, HP_BRICK_D, HP_BRASS, HP_FIRE = '#5a5450', '#2e2a28', '#8a8278', '#7a4a36', '#4a2a20', '#c8a05a', '#ffb050'
HP_W, HP_H = 200, 104                                         # 게임 game/boss-hepha-art.ts HP 와 같게(가운데 100 · 바닥 103 · 화로 문 82~118 × 56~103 · 눈 (88, 24) · (112, 24) · 팔 어깨 (62, 40) · (138, 40) · 굴뚝 (30, 4) · (170, 4))


def hepha_body(f):
    """몸 8장(200×104 · 화로 문 · 핵 · 팔은 조각) — 0·1 창이 숨 쉰다 · 2·3 금 · 깨진 창 · 4·5 이음매가 달아오른다 · 6·7 꺼짐"""
    F = ZFig(HP_W, HP_H)
    cx = 100
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = f >= 6
    lit = (lambda c: '#3a2a20') if dead else (lambda c: c)
    # 양 날개 — 벽돌 벽 · 쇠 틀 · 지붕
    for s2 in (-1, 1):
        x0, x1 = (12, 74) if s2 < 0 else (126, 188)
        F.part('stone', HP_BRICK_D, bevel=2).poly([(x0, 32), (x1, 26), (x1, 103), (x0, 103)] if s2 < 0 else [(x0, 26), (x1, 32), (x1, 103), (x0, 103)])
        F.part('stone', HP_BRICK, bevel=1.5).poly([(x0 + 1.5, 33.5), (x1 - 1.5, 27.6), (x1 - 1.5, 101.5), (x0 + 1.5, 101.5)] if s2 < 0 else [(x0 + 1.5, 27.6), (x1 - 1.5, 33.5), (x1 - 1.5, 101.5), (x0 + 1.5, 101.5)])
        for row in range(int((103 - 34) / 3)):                                                   # 벽돌 줄눈
            y = 34 + row * 3
            fine(F, (x0 + 2, y), (x1 - 2, y), HP_BRICK_D, 120)
            for k in range(int((x1 - x0) / 6)):
                x = x0 + 3 + k * 6 + (3 if row % 2 else 0)
                if x < x1 - 2:
                    fine(F, (x, y), (x, y + 3), HP_BRICK_D, 110)
        F.part('metal', HP_IRON_D, bevel=1.5).poly([(x0 - 1, 33 if s2 < 0 else 27), (x1 + 1, 27 if s2 < 0 else 33), (x1 + 1, 30 if s2 < 0 else 36), (x0 - 1, 36 if s2 < 0 else 30)])   # 처마 쇠띠
        for k in range(3):                                                                        # 창 — 아치 · 안이 달아오른다
            wx = x0 + 10 + k * 18
            for wy in (48, 70):
                F.part('metal', HP_IRON_D, bevel=1).box(wx - 4, wy - 5, 8, 12, 3.4)
                broken = st >= 1 and (k + wy) % 3 == 0
                F.part('glow' if not dead else 'metal', '#1a1210' if broken else lit('#ff9a40' if b else '#ffb050'), glow=not dead and not broken).box(wx - 3, wy - 4, 6, 10, 2.8)
                fine(F, (wx, wy - 4), (wx, wy + 6), HP_IRON_D, 240); fine(F, (wx - 3, wy + 1), (wx + 3, wy + 1), HP_IRON_D, 240)
        # 굴뚝
        chx = 30 if s2 < 0 else 170
        F.part('metal', HP_IRON_D, bevel=1.5).box(chx - 4.5, 4, 9, 28, 1)
        F.part('stone', HP_BRICK, bevel=1).box(chx - 3.6, 5, 7.2, 26, 0.6)
        for y in (8, 16, 24):
            F.part('metal', HP_IRON, bevel=0.6).box(chx - 4.8, y, 9.6, 1.6, 0.4)
        F.part('metal', HP_IRON_D, bevel=1).box(chx - 5.4, 3, 10.8, 2.2, 0.6)
        # 압력계
        gx = x0 + 31 if s2 < 0 else x1 - 31
        F.part('metal', HP_BRASS, bevel=1).ell(gx, 90, 3.4, 3.4)
        F.part('metal', '#e8e0d0', flat=True).ell(gx, 90, 2.4, 2.4)
        fine(F, (gx, 90), (gx + 1.6 * s2 * (1 if st < 2 else -1), 88.4), '#a03020', 255)
    # 날개 → 탑으로 잇는 관
    for s2 in (-1, 1):
        F.part('metal', HP_IRON, bevel=1).cap(cx + s2 * 44, 60, cx + s2 * 32, 46, 2.2, 2.2)
        F.part('metal', HP_BRASS, bevel=0.6).ell(cx + s2 * 38, 53, 2.6, 2.6)
    # 용광로 탑 — 아래가 넓다 · 쇠 띠 · 리벳
    tower = [(cx - 26, 10), (cx + 26, 10), (cx + 33, 103), (cx - 33, 103)]
    F.part('metal', HP_IRON_D, bevel=4).poly(tower)
    F.part('metal', HP_IRON, bevel=3).poly([(x + (cx - x) * 0.05, y + 1.2) for (x, y) in tower])
    F.part('metal', HP_IRON_L, flat=True).poly([(cx - 22, 12), (cx - 14, 12), (cx - 18, 50), (cx - 26, 50)])
    for y in (16, 38, 52):
        w = 26 + (y - 10) / 93 * 7
        F.part('metal', HP_IRON_D, bevel=1).box(cx - w, y, w * 2, 2.4, 0.6)
        for k in range(9):
            F.part('metal', '#b0a898', bevel=0.3).ell(cx - w + 3 + k * (w * 2 - 6) / 8, y + 1.2, 0.55, 0.55)
    # 탑 꼭대기 — 굴뚝 왕관 · 불빛
    F.part('metal', HP_IRON_D, bevel=1.5).poly([(cx - 20, 10), (cx - 16, 2), (cx + 16, 2), (cx + 20, 10)])
    for k in range(5):
        x = cx - 12 + k * 6
        F.part('metal', HP_IRON, bevel=0.6).box(x - 1.4, 1, 2.8, 4, 0.4)
    if not dead:
        F.part('glow', HP_FIRE, glow=True).box(cx - 14, 3.4, 28, 1.6, 0.6)
    # 눈 — 현창 둘 · 무거운 쇠 눈썹 · 가운데 쇠창살 코
    for s2 in (-1, 1):
        ex = cx + s2 * 12
        F.part('metal', HP_IRON_D, bevel=1.5).ell(ex, 25, 6.4, 6.4)
        F.part('metal', HP_BRASS, bevel=1).ell(ex, 25, 5.4, 5.4)
        F.part('metal', '#1a1210', flat=True).ell(ex, 25, 4.2, 4.2)
        if not dead:
            F.part('glow', HP_FIRE, glow=True).ell(ex, 25.4, 2.8 + b * 0.4, 2.2 + b * 0.3)
            F.part('glow', '#fff0c0', glow=True).ell(ex - 0.6, 24.8, 1.0, 0.8)
            F.glow(ex, 25, 7, HP_FIRE, 0.3)
        for k in range(8):
            a = k / 8 * math.tau
            F.part('metal', '#d8c090', bevel=0.3).ell(ex + math.cos(a) * 5.4, 25 + math.sin(a) * 5.4, 0.5, 0.5)
        F.part('metal', HP_IRON_D, bevel=1.2).poly([(ex - s2 * 8, 18 + (0 if st < 2 else 1)), (ex + s2 * 7, 16.4), (ex + s2 * 7.4, 18.6), (ex - s2 * 8, 20.4)])   # 눈썹
    for k in range(4):
        F.part('metal', HP_IRON_D, flat=True).box(cx - 4 + k * 2.4, 31, 1.2, 8, 0.3)
    # 화로 문 자리 — 아치 테(문 · 핵은 게임이 그린다) · 위의 '1호' 판
    arch = [(cx - 18 + 36 * k / 20, 74 - math.sqrt(max(0, 1 - ((k - 10) / 10) ** 2)) * 18) for k in range(21)]
    F.part('metal', HP_IRON_D, bevel=2).poly([(cx - 21, 103), (cx - 21, 74)] + [(x + (x - cx) * 0.16, y - 3) for (x, y) in arch] + [(cx + 21, 74), (cx + 21, 103)])
    F.part('metal', '#100a08', flat=True).poly([(cx - 18, 103), (cx - 18, 74)] + arch + [(cx + 18, 74), (cx + 18, 103)])
    if not dead:
        for (x, y) in arch[2:19:2]:
            F.part('glow', '#ff7a30', glow=True).ell(x, y + 0.6, 0.7, 0.5)
    for k in range(11):                                                                           # 아치 쐐기돌
        x, y = arch[k * 2]
        F.part('metal', HP_IRON_L if k % 2 else HP_IRON, bevel=0.5).ell(x + (x - cx) * 0.1, y - 1.6, 1.2, 1.2)
    F.part('metal', HP_BRASS, bevel=1).box(cx - 6, 44, 12, 6, 1)
    fine(F, (cx - 1, 45.4), (cx + 0.4, 45), '#3a2a18'); fine(F, (cx + 0.4, 45), (cx + 0.4, 48.6), '#3a2a18')     # '1'
    fine(F, (cx - 1.2, 48.6), (cx + 2, 48.6), '#3a2a18')
    # 팔 어깨 — 톱니 집
    for s2 in (-1, 1):
        sx = cx + s2 * 38
        F.part('metal', HP_IRON_D, bevel=1.5).ell(sx, 40, 6.6, 6.6)
        for k in range(10):
            a = k / 10 * math.tau + b * 0.3
            F.part('metal', HP_IRON, bevel=0.4).box(sx + math.cos(a) * 6.4 - 0.8, 40 + math.sin(a) * 6.4 - 0.8, 1.6, 1.6, 0.3)
        F.part('metal', HP_BRASS, bevel=1).ell(sx, 40, 3.6, 3.6)
    if st >= 1:
        crack(F, [(cx + 20, 14), (cx + 16, 24), (cx + 22, 34)], 0.5, HP_FIRE)
        crack(F, [(52, 40), (46, 52), (50, 62)], 0.45, HP_FIRE)
    if st >= 2:
        crack(F, [(cx - 22, 56), (cx - 26, 70), (cx - 22, 84)], 0.55, HP_FIRE)
        crack(F, [(150, 44), (156, 58), (152, 70)], 0.5, HP_FIRE)
        for x in (cx - 30, cx + 30):                                                              # 달아오른 이음매
            F.part('glow', '#ff7a30', glow=True).box(x - 0.5, 60, 1.0, 40, 0.3)
    if dead:
        for k in range(10):
            x = 20 + k * 17
            F.part('stone', HP_BRICK if k % 2 else HP_IRON_D, bevel=1).poly([(x, 101), (x + 4, 98), (x + 7, 101.6), (x + 3, 103)])
    return F.render()


def hepha_parts(f):
    """조각 7장(40×48) — 0 화로 문 왼쪽 반(경첩 (2, 47) · 문 18×44, 오른쪽 위가 아치) · 1 핵(가운데 (20, 24)) · 2 팔 윗마디((4, 24) → (36, 24) 격자 들보)
       3 팔 아랫마디((4, 24) → (30, 24) · 끝에 걸쇠 (33, 24)) · 4 국자(걸이 (20, 8) · 그릇 아래 · 위에 쇳물) · 5 문 — 막 2(찌그러짐 · 금) · 6 금 간 핵"""
    F = ZFig(40, 48)
    if f in (0, 5):
        pts = [(2, 47), (2, 22)] + [(20 - 18 * math.cos(math.pi / 2 * k / 10), 22 - 18 * math.sin(math.pi / 2 * k / 10)) for k in range(11)] + [(20, 47)]
        F.part('metal', HP_IRON_D, bevel=2).poly(pts)
        F.part('metal', '#6a625a', bevel=1.5).poly([(x + (11 - x) * 0.08, y + (30 - y) * 0.04) for (x, y) in pts])
        for y in (14, 26, 38):                                                                    # 띠 · 리벳
            F.part('metal', HP_IRON_D, bevel=0.8).box(2.6, y, 16.8, 2, 0.4)
            for k in range(5):
                F.part('metal', '#b0a898', bevel=0.3).ell(4 + k * 3.6, y + 1, 0.5, 0.5)
        F.part('metal', HP_BRASS, bevel=1).ell(12, 31, 2.6, 2.6)                                  # 들여다보는 구멍
        F.part('glow', HP_FIRE, glow=True).ell(12, 31, 1.4, 1.4)
        F.part('metal', HP_IRON_D, bevel=0.8).box(16, 28, 3, 8, 0.8)                              # 손잡이
        for y in (8, 42):
            F.part('metal', '#3a3430', bevel=0.8).box(1.4, y, 4, 3, 0.6)                          # 경첩
        if f == 5:
            crack(F, [(6, 18), (9, 24), (7, 30)], 0.4, HP_FIRE)
            F.part('metal', '#3a3430', flat=True).ell(14, 40, 3, 2)
    elif f in (1, 6):
        F.glow(20, 24, 14, HP_FIRE, 0.5)
        F.part('glow', '#ff7a30', glow=True).ell(20, 24, 12, 12)
        F.part('glow', HP_FIRE, glow=True).ell(19, 23, 8.6, 8.6)
        F.part('glow', '#fff0c0', glow=True).ell(17.6, 21.4, 3.6, 3.2)
        for k in range(6):                                                                        # 쇠 갈비 우리
            a = k / 6 * math.pi + 0.26
            fine(F, (20 + math.cos(a) * 12.6, 24 - math.sin(a) * 12.6), (20 + math.cos(a) * 12.6, 24 + math.sin(a) * 12.6), HP_IRON_D, 240)
            F.part('metal', HP_IRON_D, bevel=0.6).cap(20 + math.cos(a) * 12.4, 24 - math.sin(a) * 12.4, 20 + math.cos(a) * 12.4, 24 + math.sin(a) * 12.4, 0.8, 0.8)
        F.part('metal', HP_IRON_D, bevel=1).box(6, 23, 28, 2, 0.6)
        if f == 6:
            crack(F, [(12, 16), (16, 22), (13, 30)], 0.5, '#1a1210')
    elif f in (2, 3):
        L = 36 if f == 2 else 30
        for s2 in (-1, 1):                                                                        # 위아래 현
            F.part('metal', HP_IRON_D, bevel=1).cap(4, 24 + s2 * 3.4, L, 24 + s2 * 2.6, 1.1, 1.0)
        for k in range(int((L - 4) / 4)):                                                         # 격자
            x = 4 + k * 4
            fine(F, (x, 20.6), (x + 4, 27.4), HP_IRON, 255); fine(F, (x, 27.4), (x + 4, 20.6), HP_IRON, 255)
        F.part('metal', HP_BRASS, bevel=1).ell(4, 24, 3.2, 3.2)                                   # 관절
        F.part('metal', '#3a3430', bevel=0.6).ell(4, 24, 1.2, 1.2)
        if f == 3:
            F.part('metal', HP_IRON_D, bevel=1).poly([(L, 21), (L + 4, 22), (L + 4, 26), (L, 27)])
            F.part('metal', HP_BRASS, bevel=0.8).ell(L + 3, 24, 2.0, 2.0)
    else:
        F.part('metal', '#3a3430', bevel=0.8).cap(20, 8, 12, 14, 0.8, 0.8)                         # 걸이줄
        F.part('metal', '#3a3430', bevel=0.8).cap(20, 8, 28, 14, 0.8, 0.8)
        F.part('metal', HP_BRASS, bevel=0.8).ell(20, 8, 1.6, 1.6)
        bowl = [(9, 14), (31, 14), (29, 24), (24, 30), (16, 30), (11, 24)]
        F.part('metal', HP_IRON_D, bevel=2).poly(bowl)
        F.part('metal', HP_IRON, bevel=1.5).poly([(x + (20 - x) * 0.1, y + 0.6) for (x, y) in bowl])
        F.part('glow', HP_FIRE, glow=True).ell(20, 15, 10, 1.6)                                   # 쇳물 면
        F.part('glow', '#fff0c0', glow=True).ell(17, 14.8, 3, 0.6)
        F.part('metal', HP_IRON_D, bevel=0.8).poly([(31, 14), (35, 12.6), (35.6, 14.2), (31, 16)])  # 주둥이
        F.part('metal', '#7a4a2a', flat=True).poly([(14, 22), (18, 22.4), (15, 26)])
    return F.render()


# ===== 공창의 관리자(overseer) — 브라운관 얼굴의 감독 기계: 단말기와 지시봉 · 등의 드론 거치대 셋 · 가는 유압 다리 =====
OV_S, OV_S_D, OV_S_L, OV_Y, OV_SCR = '#7a8090', '#3a3e4a', '#b0b8c8', '#e8c040', '#1a2a20'
OV_W, OV_H, OV_DY = 40, 55, 3                                 # 게임 game/boss-overseer-art.ts OV 와 같게(그린 뒤 OV_DY 내린 자리: 가운데 20 · 엉덩이 (15, 50) · (25, 50) · 어깨 (9, 25) · (31, 25) · 거치대 (8, 7.6) · (20, 3.2) · (32, 7.6))


def overseer_body(f):
    """몸 8장(40×52 · 다리 · 팔 · 드론은 조각 · 화면 글은 게임) — 0·1 안테나가 깜빡 · 2·3 금 · 경고 줄 벗겨짐 · 4·5 화면 테가 깨짐 · 6·7 꺼짐"""
    F = ZFig(OV_W, OV_H - OV_DY)
    cx = 20
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = f >= 6
    sag = 0 if f < 6 else (2 if f == 6 else 5)
    # 등의 드론 거치대 — 머리 뒤 반원 틀 · 받침 셋
    F.part('metal', OV_S_D, bevel=1.2).cap(cx - 13, 18 + sag, cx - 12, 7 + sag, 1.0, 0.9)
    F.part('metal', OV_S_D, bevel=1.2).cap(cx + 13, 18 + sag, cx + 12, 7 + sag, 1.0, 0.9)
    prev = None
    for k in range(13):                                                                           # 반원 틀
        a = math.pi * (1 - k / 12)
        pt = (cx + math.cos(a) * 12, 8 + sag - math.sin(a) * 6)
        if prev:
            F.part('metal', OV_S_D, bevel=0.8).cap(prev[0], prev[1], pt[0], pt[1], 0.9, 0.9)
        prev = pt
    for (x, y) in [(8, 6), (20, 1.6), (32, 6)]:                                                   # 받침(드론이 앉는 곳)
        F.part('metal', '#5a6070', bevel=0.8).box(x - 3, y + sag + 1.8, 6, 1.6, 0.5)
        F.part('glow' if not dead else 'metal', '#80e0ff' if not dead else '#2a3038', glow=not dead).box(x - 1.4, y + sag + 2.2, 2.8, 0.6, 0.2)
    # 몸통 — 좁은 사물함 같은 몸 · 경고 줄 띠 · 명찰
    torso = [(cx - 9, 18 + sag), (cx + 9, 18 + sag), (cx + 8, 44), (cx - 8, 44)]
    F.part('metal', OV_S_D, bevel=2.5).poly(torso)
    F.part('metal', OV_S, bevel=2).poly([(x + (cx - x) * 0.1, y + 0.8) for (x, y) in torso])
    F.part('metal', OV_S_L, flat=True).poly([(cx - 7, 20 + sag), (cx - 3, 20 + sag), (cx - 4, 30), (cx - 7, 30)])
    for k in range(7):                                                                            # 경고 줄(노랑 · 검정 빗금)
        x = cx - 8 + k * 2.4
        if st >= 1 and k in (2, 5):
            continue
        F.part('metal', OV_Y, flat=True).poly([(x, 37), (x + 1.2, 37), (x + 2.4, 39.4), (x + 1.2, 39.4)])
    F.part('metal', '#1e2026', flat=True).box(cx - 8, 36.4, 16, 0.5, 0.1); F.part('metal', '#1e2026', flat=True).box(cx - 8, 39.4, 16, 0.5, 0.1)
    F.part('metal', '#e8e4d8', bevel=0.5).box(cx + 1.6, 23 + sag, 5, 3.4, 0.4)                     # 명찰 — 바코드
    for k in range(6):
        fine(F, (cx + 2.4 + k * 0.7, 23.6 + sag), (cx + 2.4 + k * 0.7, 25.6 + sag), '#2a2a2a', 255 if k % 3 else 160)
    for k in range(3):                                                                            # 상태등
        F.part('glow' if not dead else 'metal', ['#7dff9a', OV_Y, '#ff6050'][k] if not dead else '#2a3038', glow=not dead).ell(cx - 5 + k * 2.2, 33, 0.7, 0.7)
    # 허리 — 유압 골반
    F.part('metal', OV_S_D, bevel=1.5).box(cx - 8, 43, 16, 4, 1.2)
    for s2 in (-1, 1):
        F.part('metal', '#5a6070', bevel=1).ell(cx + s2 * 5, 47, 2.2, 2.2)
    # 머리 — 브라운관 상자 · 화면(게임이 글을 띄운다) · 안테나
    hy = 4 + sag
    F.part('metal', OV_S_D, bevel=2).box(cx - 8.4, hy, 16.8, 13.6, 1.8)
    F.part('metal', '#c8c0b0', bevel=1.5).box(cx - 7.6, hy + 0.6, 15.2, 12.2, 1.4)                 # 베이지 브라운관 테
    F.part('metal', '#1e2026', flat=True).box(cx - 6.2, hy + 1.8, 12.4, 9.2, 1.6)
    F.part('metal', OV_SCR, flat=True).box(cx - 5.6, hy + 2.2, 11.2, 8.4, 1.4)
    if not dead:
        F.part('glow', '#2a5a3a', glow=True).box(cx - 5.4, hy + 2.4, 10.8, 8.0, 1.3)
    for k in range(3):                                                                            # 아래 단추 · 통풍구
        F.part('metal', '#8a8478', bevel=0.3).ell(cx - 4 + k * 2, hy + 12, 0.5, 0.5)
    fine(F, (cx + 2, hy + 12), (cx + 6, hy + 12), '#6a645a', 220)
    if st >= 2:                                                                                   # 깨진 화면 테
        crack(F, [(cx + 6.4, hy + 1), (cx + 4.4, hy + 4), (cx + 6, hy + 7)], 0.35, '#e8f8ff')
    F.part('metal', OV_S_D, bevel=0.6).cap(cx + 5, hy, cx + 7, hy - 3.4, 0.5, 0.4)                   # 안테나
    F.part('glow' if not dead else 'metal', '#ff6050' if b else '#7a2a20', glow=not dead and b == 1).ell(cx + 7, hy - 3.6, 0.8, 0.8)
    if st >= 1:
        crack(F, [(cx - 7, 24 + sag), (cx - 5, 30), (cx - 7, 35)], 0.35, OV_Y)
    if st >= 2:
        crack(F, [(cx + 6, 28), (cx + 4, 34), (cx + 6, 41)], 0.4, OV_Y)
    if dead:
        for k in range(5):
            x = 8 + k * 6
            F.part('metal', OV_S if k % 2 else OV_S_D, bevel=0.8).poly([(x, 50), (x + 3, 48.4), (x + 5, 50.4), (x + 2, 51.6)])
    out = Image.new('RGBA', (OV_W * K, OV_H * K), (0, 0, 0, 0))
    out.paste(F.render(), (0, OV_DY * K))
    return out


def overseer_parts(f):
    """조각 5장(16×30) — 0 다리(엉덩이 (8, 3) → 발 (8, 29)) · 1 윗팔((8, 3) → 팔꿈치 (8, 14)) · 2 아래팔 + 단말기(팔꿈치 (8, 3) → 손 (8, 12) · 단말 판)
       3 아래팔 + 지시봉(팔꿈치 (8, 3) → 봉 끝 (8, 28)) · 4 점검 드론(가운데 (8, 8) · 아래 렌즈)"""
    F = ZFig(16, 30)
    if f == 0:
        F.part('metal', OV_S_D, bevel=1.2).cap(8, 3.4, 8, 15, 2.4, 2.0)
        F.part('metal', '#d8d4c8', bevel=0.6).cap(8, 6, 8, 14, 0.8, 0.8)                           # 유압 대
        F.part('metal', '#5a6070', bevel=1).ell(8, 15.6, 2.4, 2.0)
        F.part('metal', OV_S, bevel=1.2).cap(8, 16, 8, 26, 2.2, 1.8)
        F.part('metal', OV_Y, flat=True).box(6.4, 20, 3.2, 1.2, 0.3)
        F.part('metal', OV_S_D, bevel=1).poly([(3.4, 29.4), (12.6, 29.4), (11, 26.6), (5, 26.6)])
    elif f == 1:
        F.part('metal', '#5a6070', bevel=1).ell(8, 3.4, 2.4, 2.4)
        F.part('metal', OV_S, bevel=1).cap(8, 4, 8, 13.4, 1.8, 1.6)
        F.part('metal', '#5a6070', bevel=0.8).ell(8, 14, 1.8, 1.8)
    elif f == 2:
        F.part('metal', OV_S, bevel=1).cap(8, 3.4, 8, 11.6, 1.6, 1.4)
        F.part('metal', '#3a3430', bevel=1).box(2.4, 11, 11.2, 8, 1.0)                            # 단말 판
        F.part('metal', OV_SCR, flat=True).box(3.4, 12, 9.2, 5.6, 0.6)
        F.part('glow', '#7dff9a', glow=True).box(4.0, 12.8, 5, 0.6, 0.2); F.part('glow', '#7dff9a', glow=True).box(4.0, 14.4, 7, 0.6, 0.2)
        F.part('glow', OV_Y, glow=True).box(4.0, 16.0, 3, 0.6, 0.2)
        F.part('metal', OV_S_D, bevel=0.6).ell(8, 11.4, 1.6, 1.2)                                  # 쥔 손
    elif f == 3:
        F.part('metal', OV_S, bevel=1).cap(8, 3.4, 8, 11.6, 1.6, 1.4)
        F.part('metal', OV_S_D, bevel=0.6).ell(8, 12, 1.7, 1.4)
        F.part('metal', '#2a2a2e', bevel=0.5).cap(8, 12, 8, 27, 0.55, 0.45)                         # 지시봉
        F.part('glow', '#ff6050', glow=True).ell(8, 27.6, 0.9, 0.9)
    else:
        F.part('metal', OV_S_D, bevel=1.2).ell(8, 8, 6.4, 3.4)
        F.part('metal', OV_S, bevel=1).ell(8, 7.4, 5.4, 2.6)
        F.part('metal', OV_S_L, flat=True).ell(6.4, 6.4, 2.2, 0.8)
        for s2 in (-1, 1):                                                                        # 날개 팔 · 회전 날개 자리
            F.part('metal', OV_S_D, bevel=0.4).cap(8 + s2 * 5, 6.4, 8 + s2 * 7.2, 4.4, 0.5, 0.4)
        F.part('metal', '#1e2026', bevel=0.6).ell(8, 10.4, 2.0, 1.4)                                # 렌즈
        F.part('glow', '#ffe08a', glow=True).ell(8, 10.6, 1.0, 0.7)
        F.part('metal', OV_Y, flat=True).box(4.4, 7.8, 7.2, 0.6, 0.2)
    return F.render()


# ===== 원형(archetype) — 첫 번째 설계: 사람을 본뜬 상아빛 마네킹 · 판마다 설계 치수선이 새겨졌다 · 자 칼날 팔 · 얼굴 없는 가면에 컴퍼스 표 =====
AR_IV, AR_IV_D, AR_IV_L, AR_JOINT, AR_LINE, AR_GLOW = '#e8dcc0', '#9a8e74', '#f8f2e4', '#5a5448', '#4a7aa8', '#9fd0ff'
AR_W, AR_H = 32, 44                                           # 게임 game/boss-arche-art.ts AR 와 같게(몸통 · 머리 — 가운데 16 · 엉덩이 (12, 40) · (20, 40) · 어깨 (7, 15) · (25, 15) · 목 (16, 10))


def _measure(F, a, b, col=AR_LINE):
    """치수선 — 양끝 짧은 가름선 · 가운데 눈금(설계도 결)"""
    fine(F, a, b, col, 200)
    dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
    for p in (a, b):
        fine(F, (p[0] - nx * 0.8, p[1] - ny * 0.8), (p[0] + nx * 0.8, p[1] + ny * 0.8), col, 220)
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    fine(F, (m[0] - nx * 0.5, m[1] - ny * 0.5), (m[0] + nx * 0.5, m[1] + ny * 0.5), col, 220)


def arche_body(f):
    """몸통 · 머리 8장(32×44 · 팔다리는 조각) — 0·1 이음매 빛이 숨 쉰다 · 2·3 판이 벌어진다 · 4·5 설계선이 몸 밖으로 번진다 · 6·7 흩어짐"""
    F = ZFig(AR_W, AR_H)
    cx = 16
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = 0 if f < 6 else (1 if f == 6 else 2)
    gap = st * 0.6 + dead * 1.6                                                                   # 판 사이 틈 — 막이 오를수록 벌어진다
    # 골반
    F.part('metal', AR_JOINT, bevel=1).ell(cx, 39, 6, 2.4)
    F.part('stone', AR_IV_D, bevel=2).poly([(cx - 7, 34 + gap), (cx + 7, 34 + gap), (cx + 6, 40 + gap), (cx - 6, 40 + gap)])
    F.part('stone', AR_IV, bevel=1.5).poly([(cx - 6.2, 34.6 + gap), (cx + 6.2, 34.6 + gap), (cx + 5.4, 39.4 + gap), (cx - 5.4, 39.4 + gap)])
    # 허리 관절(구슬)
    F.part('metal', AR_JOINT, bevel=1).ell(cx, 32.4 + gap * 0.5, 3.4, 2.2)
    # 가슴판 — 위가 넓은 방패꼴 · 가운데 이음매
    for s2 in (-1, 1):                                                                            # 좌우 두 판 — 가운데가 틈으로 벌어진다
        pts = [(cx + s2 * gap * 0.5, 13), (cx + s2 * (9 + gap * 0.5), 13), (cx + s2 * (8 + gap * 0.5), 22), (cx + s2 * (5 + gap * 0.5), 30), (cx + s2 * gap * 0.5, 30)]
        F.part('stone', AR_IV_D, bevel=2).poly(pts)
        F.part('stone', AR_IV if s2 < 0 else '#ddd0b2', bevel=1.5).poly([(x + (cx - x) * 0.08, y + 0.6) for (x, y) in pts])
    F.part('stone', AR_IV_L, flat=True).poly([(cx - 7.4, 14.4), (cx - 3, 14.4), (cx - 4, 20), (cx - 7, 20)])
    if not dead:
        F.part('glow', AR_GLOW, glow=True).box(cx - 0.4, 14, 0.8, 15, 0.3)                          # 가운데 이음매 빛
        F.glow(cx, 21, 4 + b, AR_GLOW, 0.25 + 0.1 * st)
    # 새긴 설계 치수선 — 가슴 · 골반
    _measure(F, (cx - 8, 24), (cx - 1.6, 24))
    _measure(F, (cx + 1.6, 17), (cx + 8, 17))
    _measure(F, (cx - 5, 37 + gap), (cx + 5, 37 + gap))
    for k in range(3):                                                                            # 판 번호 눈금
        fine(F, (cx + 3 + k * 1.4, 27), (cx + 3 + k * 1.4, 28.2), AR_LINE, 200)
    # 목 · 머리 — 얼굴 없는 달걀 가면 · 이마에 컴퍼스 표 · 가늘게 빛나는 눈 틈
    F.part('metal', AR_JOINT, bevel=0.8).cap(cx, 12.6, cx, 9.6, 1.4, 1.2)
    hy = max(1.3, 1.6 - gap * 0.6)                                                               # 머리가 벌어져 뜨되 칸 벽엔 닿지 않게
    F.part('stone', AR_IV_D, bevel=2).ell(cx, hy + 4.4, 4.6, 5.0)
    F.part('stone', AR_IV, bevel=1.5).ell(cx - 0.3, hy + 4.0, 3.9, 4.4)
    F.part('stone', AR_IV_L, flat=True).ell(cx - 1.6, hy + 2.4, 1.4, 1.0)
    fine(F, (cx, hy + 0.6), (cx - 1.4, hy + 3.2), AR_LINE, 230); fine(F, (cx, hy + 0.6), (cx + 1.4, hy + 3.2), AR_LINE, 230)   # 컴퍼스 다리
    F.part('metal', AR_LINE, flat=True).ell(cx, hy + 0.7, 0.4, 0.4)
    if not dead:
        F.part('glow', AR_GLOW, glow=True).box(cx - 2.6, hy + 4.8, 5.2, 0.7, 0.3)
    else:
        fine(F, (cx - 2.6, hy + 5.1), (cx + 2.6, hy + 5.1), AR_IV_D, 230)
    if st >= 2 and not dead:                                                                      # 몸 밖으로 번지는 설계선
        for (a, bb) in [((cx - 13, 12), (cx - 9, 13)), ((cx + 9, 30), (cx + 14, 34)), ((cx - 14, 30), (cx - 6, 30))]:
            fine(F, a, bb, AR_GLOW, 200)
    if st >= 1:
        crack(F, [(cx + 6, 15), (cx + 4, 20)], 0.3, AR_GLOW)
    return F.render()


def arche_parts(f):
    """조각 6장(12×26) — 0 넓적다리((6, 3) → 무릎 (6, 13)) · 1 정강이((6, 3) → 발끝 (6, 25) · 발) · 2 윗팔((6, 3) → 팔꿈치 (6, 12))
       3 아래팔 = 자 칼날((6, 3) → 날끝 (6, 25) · 눈금 · 빛 날) · 4 아래팔 = 손(빈손 · 손가락 셋) · 5 흩어진 판 조각"""
    F = ZFig(12, 26)
    def limb(y0, y1, r0, r1):
        F.part('metal', AR_JOINT, bevel=0.8).ell(6, y0, r0 * 0.9, r0 * 0.9)
        F.part('stone', AR_IV_D, bevel=1.2).cap(6, y0 + 0.6, 6, y1, r0, r1)
        F.part('stone', AR_IV, bevel=1).cap(5.7, y0 + 0.8, 5.7, y1 - 0.4, r0 * 0.78, r1 * 0.78)
        _measure(F, (6 + r0 * 0.4, y0 + 2), (6 + r1 * 0.3, y1 - 1.4))
    if f == 0:
        limb(3, 13, 2.6, 2.2)
    elif f == 1:
        limb(3, 21, 2.2, 1.6)
        F.part('stone', AR_IV_D, bevel=1).poly([(3.4, 21), (8, 21), (10.6, 24.4), (3.2, 24.6)])
        F.part('stone', AR_IV, bevel=0.6).poly([(3.8, 21.4), (7.8, 21.4), (9.6, 23.8), (3.6, 24)])
    elif f == 2:
        limb(3, 12, 2.2, 1.9)
    elif f == 3:
        F.part('metal', AR_JOINT, bevel=0.8).ell(6, 3, 2.0, 2.0)
        F.part('stone', AR_IV_D, bevel=1).cap(6, 3.6, 6, 8, 1.8, 1.6)
        F.part('metal', '#c8c0b0', bevel=0.8).poly([(4.4, 8), (7.6, 8), (7.2, 23), (6, 25.4), (4.8, 23)])   # 자 칼날
        for k in range(8):
            fine(F, (4.8, 9.4 + k * 1.7), (5.8 + (k % 2) * 0.6, 9.4 + k * 1.7), '#3a3430', 230)        # 눈금
        F.part('glow', AR_GLOW, glow=True).poly([(7.0, 9), (7.5, 9), (7.1, 22.8), (6.3, 24.6)])       # 빛 날
    elif f == 4:
        limb(3, 9, 1.9, 1.6)
        for k in range(3):
            F.part('stone', AR_IV, bevel=0.5).cap(5 + k, 10, 4.6 + k * 1.3, 13.4, 0.55, 0.45)
    else:
        for (x, y, w, h, a) in [(3, 4, 5, 3, 0.3), (6, 11, 4, 4, -0.4), (2.6, 18, 6, 2.6, 0.1)]:
            F.part('stone', AR_IV, bevel=0.8).poly([(x, y), (x + w, y + a), (x + w - 0.6, y + h), (x + 0.4, y + h - a)])
            fine(F, (x + 0.6, y + h / 2), (x + w - 0.8, y + h / 2), AR_LINE, 200)
    return F.render()


# ===== 환원기(restorer) — 하늘의 고리 장치: 시계 눈 핵 · 저마다 다른 축으로 도는 고리 셋(별 · 톱니 · 눈금) · 시곗바늘 · 위성 =====
RS_GOLD, RS_GOLD_D, RS_IVORY, RS_NIGHT, RS_GLOW = '#d8b060', '#7a5a28', '#f0e8d0', '#1e2a48', '#bcd8f4'
RS_W = RS_H = 48                                              # 게임 game/boss-restorer-art.ts RS 와 같게(핵 가운데 (24, 24) · 반지름 18)


def _star4(F, x, y, r, col):
    F.part('glow', col, glow=True).poly([(x, y - r), (x + r * 0.28, y - r * 0.28), (x + r, y), (x + r * 0.28, y + r * 0.28), (x, y + r), (x - r * 0.28, y + r * 0.28), (x - r, y), (x - r * 0.28, y - r * 0.28)])


def restorer_core(f):
    """핵 8장(48×48) — 0·1 눈동자가 숨 쉰다 · 2·3 금 · 4·5 유리가 깨져 별빛이 샌다 · 6·7 멎음"""
    F = ZFig(RS_W, RS_H)
    cx = cy = 24
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = f >= 6
    F.part('metal', RS_GOLD_D, bevel=3).ell(cx, cy, 18.6, 18.6)
    F.part('metal', RS_GOLD, bevel=2).ell(cx - 0.3, cy - 0.3, 17.4, 17.4)
    for k in range(24):                                                                           # 테의 홈
        a = k / 24 * math.tau
        fine(F, (cx + math.cos(a) * 16.2, cy + math.sin(a) * 16.2), (cx + math.cos(a) * 17.6, cy + math.sin(a) * 17.6), RS_GOLD_D, 230)
    F.part('metal', RS_NIGHT if not dead else '#14182a', flat=True).ell(cx, cy, 15.2, 15.2)
    for (x, y) in [(cx - 8, cy - 9), (cx - 5, cy - 11), (cx + 9, cy - 6), (cx + 11, cy + 3), (cx - 10, cy + 7), (cx + 3, cy + 11), (cx - 3, cy + 12.4)]:   # 별자리
        F.part('glow' if not dead else 'metal', RS_GLOW if not dead else '#2a3048', glow=not dead).ell(x, y, 0.45, 0.45)
    fine(F, (cx - 8, cy - 9), (cx - 5, cy - 11), '#6a7ab0', 160); fine(F, (cx + 9, cy - 6), (cx + 11, cy + 3), '#6a7ab0', 160)
    for k in range(12):                                                                           # 눈금 — 3 · 6 · 9 · 12 는 길게
        a = k / 12 * math.tau - math.pi / 2
        r0 = 11.6 if k % 3 else 10.2
        F.part('metal', RS_IVORY, bevel=0.3).cap(cx + math.cos(a) * r0, cy + math.sin(a) * r0, cx + math.cos(a) * 14.2, cy + math.sin(a) * 14.2, 0.45 if k % 3 else 0.7, 0.4)
    # 눈 — 홍채 고리 · 렌즈 · 동공
    F.part('metal', RS_GOLD_D, bevel=1).ell(cx, cy, 7.6, 7.6)
    F.part('metal', '#6a88b8' if not dead else '#2a3048', bevel=1).ell(cx, cy, 6.6, 6.6)
    for k in range(16):
        a = k / 16 * math.tau
        fine(F, (cx + math.cos(a) * 2.6, cy + math.sin(a) * 2.6), (cx + math.cos(a) * 6.2, cy + math.sin(a) * 6.2), '#3a5080', 200)
    if not dead:
        F.part('glow', RS_GLOW, glow=True).ell(cx, cy, 2.6 + b * 0.5, 2.6 + b * 0.5)
        F.part('glow', '#ffffff', glow=True).ell(cx - 0.6, cy - 0.6, 1.0, 1.0)
        F.glow(cx, cy, 10 + b * 2, RS_GLOW, 0.3)
    else:
        F.part('metal', '#0a0c14', flat=True).ell(cx, cy, 2.4, 2.4)
    F.part('metal', RS_IVORY, flat=True).ell(cx - 7, cy - 9, 3.2, 1.4)                            # 유리 반사
    if st >= 1:
        crack(F, [(cx + 10, cy - 10), (cx + 6, cy - 5), (cx + 8, cy)], 0.35, RS_GLOW)
    if st >= 2:
        crack(F, [(cx - 12, cy + 4), (cx - 7, cy + 6), (cx - 9, cy + 11)], 0.4, RS_GLOW)
        for (x, y) in [(cx + 4, cy + 8), (cx - 6, cy - 3)]:
            _star4(F, x, y, 1.6, '#ffffff')
    return F.render()


def restorer_parts(f):
    """조각 6장(64×64 · 가운데 (32, 32)) — 0 별 고리(반지름 30) · 1 톱니 고리(26) · 2 눈금 고리(22) · 3 긴 바늘((32, 32) → (32, 8)) · 4 짧은 바늘(→ (32, 16)) · 5 위성"""
    F = ZFig(64, 64)
    cx = cy = 32
    def band(r0, r1, n, col, col2):
        for k in range(n):
            a0, a1 = k / n * math.tau, (k + 0.94) / n * math.tau
            F.part('metal', col if k % 2 else col2, bevel=0.8).poly([(cx + math.cos(a0) * r1, cy + math.sin(a0) * r1), (cx + math.cos(a1) * r1, cy + math.sin(a1) * r1),
                                                                     (cx + math.cos(a1) * r0, cy + math.sin(a1) * r0), (cx + math.cos(a0) * r0, cy + math.sin(a0) * r0)])
    if f == 0:
        band(27.6, 30.6, 56, RS_GOLD, '#c8a050')
        for k in range(8):
            a = k / 8 * math.tau
            _star4(F, cx + math.cos(a) * 29.1, cy + math.sin(a) * 29.1, 1.5, '#fff4d0')
    elif f == 1:
        band(23.4, 25.6, 48, '#a8804a', '#8a6a3a')
        for k in range(36):                                                                       # 톱니(바깥)
            a = k / 36 * math.tau
            F.part('metal', '#8a6a3a', bevel=0.4).poly([(cx + math.cos(a - 0.04) * 25.4, cy + math.sin(a - 0.04) * 25.4), (cx + math.cos(a - 0.025) * 27.2, cy + math.sin(a - 0.025) * 27.2),
                                                        (cx + math.cos(a + 0.025) * 27.2, cy + math.sin(a + 0.025) * 27.2), (cx + math.cos(a + 0.04) * 25.4, cy + math.sin(a + 0.04) * 25.4)])
    elif f == 2:
        band(19.6, 22.4, 60, RS_IVORY, '#d8d0b8')
        for k in range(12):                                                                       # 숫자 대신 금 묶음(1~12)
            a = k / 12 * math.tau - math.pi / 2
            for j in range(min(4, k % 4 + 1)):
                aa = a + (j - 1.5) * 0.03
                fine(F, (cx + math.cos(aa) * 20.2, cy + math.sin(aa) * 20.2), (cx + math.cos(aa) * 21.8, cy + math.sin(aa) * 21.8), RS_GOLD_D, 255)
    elif f in (3, 4):
        L = 24 if f == 3 else 16
        F.part('metal', RS_GOLD_D, bevel=0.6).poly([(cx - 1.1, cy + 3), (cx + 1.1, cy + 3), (cx + 0.7, cy - L + 4), (cx, cy - L), (cx - 0.7, cy - L + 4)])
        F.part('metal', RS_GOLD, bevel=0.4).poly([(cx - 0.6, cy + 2), (cx + 0.2, cy + 2), (cx, cy - L + 3)])
        F.part('metal', RS_GOLD, bevel=0.8).ell(cx, cy, 1.8, 1.8)
    else:
        F.part('metal', '#3a4a6a', bevel=1.5).ell(cx, cy, 4.4, 4.4)
        F.part('metal', '#7a90c0', bevel=1).ell(cx - 0.8, cy - 0.8, 3.0, 3.0)
        F.part('metal', RS_GOLD, bevel=0.6).ell(cx, cy, 6.4, 1.0)                                   # 위성의 고리
        F.part('glow', RS_GLOW, glow=True).ell(cx - 1.4, cy - 1.6, 0.9, 0.9)
    return F.render()


# ===== 갱을 메운 것(shaft_maw) — 갱 바닥 흙이 몸: 다져진 잡석 턱 · 박힌 버팀목 · 휜 레일 · 깨진 등 · 어둠 진주 눈 둘 · 아래턱은 조각 =====
SM_ROCK, SM_ROCK_D, SM_ROCK_L, SM_DIRT, SM_WOOD, SM_EYE = '#5a5248', '#2e2a24', '#8a8070', '#4a3a2a', '#6a4a2a', '#b8a0ff'
SM_W, SM_H = 64, 48                                           # 게임 game/boss-shaft-art.ts SM 와 같게(가운데 32 · 땅 46 · 턱 경첩 (32, 34) · 눈 (22, 16) · (42, 16))


def shaft_head(f):
    """윗턱 8장(64×48 · 아래턱은 조각) — 0·1 진주 눈이 숨 쉰다 · 2·3 금 · 버팀목이 부러짐 · 4·5 이마가 갈라져 진주가 더 드러난다 · 6·7 무너짐"""
    F = ZFig(SM_W, SM_H)
    cx = 32
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = 0 if f < 6 else (1 if f == 6 else 2)
    sag = dead * 4
    # 머리 — 다져진 잡석 둥근 지붕(울퉁불퉁) · 아래가 입
    head = []
    for k in range(25):
        a = math.pi * (1 - k / 24)
        r = 1.0 + 0.06 * math.sin(k * 2.7) + 0.04 * math.cos(k * 5.1)
        head.append((cx + math.cos(a) * 29 * r, 34 + sag - math.sin(a) * (28 - sag) * r))
    F.part('stone', SM_ROCK_D, bevel=4).poly(head + [(cx + 29, 38), (cx - 29, 38)])
    F.part('stone', SM_ROCK, bevel=3).poly([(x + (cx - x) * 0.07, y + 1.4) for (x, y) in head] + [(cx + 26, 37), (cx - 26, 37)])
    for (x, y, r) in [(cx - 18, 18, 4), (cx + 14, 12, 5), (cx - 6, 9, 3.4), (cx + 22, 24, 3.6), (cx - 23, 28, 3), (cx + 4, 22, 2.6)]:   # 박힌 바위
        F.part('stone', SM_ROCK_L if (x + y) % 2 else SM_ROCK, bevel=1.5).ell(x, y + sag, r, r * 0.8)
    for k in range(9):                                                                             # 흙이 흘러내린 결
        x = cx - 24 + k * 6
        F.part('stone', SM_DIRT, flat=True).poly([(x, 30 + sag), (x + 2.4, 30 + sag), (x + 1.6, 36), (x + 0.6, 36)])
    # 박힌 것들 — 버팀목(막 1 부터 부러짐) · 휜 레일 · 깨진 등
    if st < 1:
        F.part('wood', SM_WOOD, bevel=1).cap(cx - 30, 14 + sag, cx - 12, 4 + sag, 1.6, 1.4)
    else:
        F.part('wood', SM_WOOD, bevel=1).cap(cx - 30, 14 + sag, cx - 20, 9 + sag, 1.6, 1.4)
        F.part('wood', '#4a3420', flat=True).poly([(cx - 21, 7.6 + sag), (cx - 18, 8.6 + sag), (cx - 20, 10.6 + sag)])
    F.part('metal', '#6a6e78', bevel=0.8).cap(cx + 10, 4 + sag, cx + 27, 11 + sag, 0.8, 0.8)       # 휜 레일
    F.part('metal', '#6a6e78', bevel=0.8).cap(cx + 27, 11 + sag, cx + 28.6, 19 + sag, 0.8, 0.8)
    for k in range(4):
        F.part('wood', '#3e2a18', bevel=0.4).box(cx + 12 + k * 4.6, 5 + k * 1.8 + sag, 1.6, 3, 0.3)
    F.part('metal', '#3a3020', bevel=0.8).box(cx - 3, 3 + sag, 6, 5, 1.2)                           # 깨진 갱도 등
    F.part('glow' if not dead else 'metal', '#ffb050' if (b and not dead) else '#8a5a28', glow=not dead and b == 1).ell(cx, 5.6 + sag, 1.4, 1.4)
    # 눈 — 잡석 사이 어둠 진주 둘
    for s2 in (-1, 1):
        ex, ey = cx + s2 * 10, 16 + sag
        F.part('stone', '#14100c', flat=True).ell(ex, ey, 4.4 + st * 0.4, 3.4 + st * 0.3)
        if not dead:
            F.part('glow', SM_EYE, glow=True).ell(ex, ey + 0.4, 2.6 + b * 0.3, 2.2 + b * 0.3)
            F.part('glow', '#f0e8ff', glow=True).ell(ex - 0.8, ey - 0.3, 0.8, 0.7)
            F.glow(ex, ey, 6 + b, SM_EYE, 0.35)
        else:
            F.part('stone', '#3a3048', flat=True).ell(ex, ey + 0.4, 2.2, 1.8)
        F.part('stone', SM_ROCK_D, bevel=1).poly([(ex - s2 * 6, ey - 4.6), (ex + s2 * 5, ey - 6), (ex + s2 * 5.4, ey - 4.2), (ex - s2 * 6, ey - 3)])   # 눈두덩 바위
    # 입 — 위 이빨(석순처럼 늘어진 바위 · 광석 결정 몇)
    F.part('stone', '#0e0a08', flat=True).poly([(cx - 24, 34 + sag), (cx + 24, 34 + sag), (cx + 22, 38), (cx - 22, 38)])
    for k in range(11):
        x = cx - 21 + k * 4.2
        ln = 4 + (k * 7) % 4 + (2 if k in (2, 8) else 0)
        col = '#9fd8e8' if k in (4, 7) else ('#c8bca0' if k % 2 else '#a89c84')
        F.part('stone', col, bevel=0.6).poly([(x - 1.6, 33.6 + sag), (x + 1.6, 33.6 + sag), (x + 0.2, 33.6 + sag + ln)])
    if st >= 1:
        crack(F, [(cx + 18, 8 + sag), (cx + 13, 16), (cx + 17, 24)], 0.45, SM_EYE)
    if st >= 2:
        crack(F, [(cx - 4, 8 + sag), (cx - 1, 13), (cx - 5, 19)], 0.5, SM_EYE)
        F.part('glow', SM_EYE, glow=True).ell(cx - 2, 13 + sag, 1.4, 1.1)                         # 이마 속 진주가 드러난다
    if dead:
        for k in range(8):
            x = 5 + k * 7
            F.part('stone', SM_ROCK if k % 2 else SM_ROCK_D, bevel=1).poly([(x, 46), (x + 3, 42.6), (x + 6, 46), (x + 3, 47.4)])
    return F.render()


def shaft_parts(f):
    """조각 5장(64×24) — 0 아래턱(경첩 (32, 2) · 아래 이빨이 위로) · 1 바윗덩이(가운데 (32, 12)) · 2 부러진 버팀목 · 3 휜 레일 토막 · 4 금 간 아래턱"""
    F = ZFig(64, 24)
    if f in (0, 4):
        jaw = [(6, 4), (58, 4), (54, 14), (44, 20), (20, 20), (10, 14)]
        F.part('stone', SM_ROCK_D, bevel=3).poly(jaw)
        F.part('stone', SM_ROCK, bevel=2).poly([(x + (32 - x) * 0.06, y + (12 - y) * 0.08) for (x, y) in jaw])
        F.part('stone', '#0e0a08', flat=True).poly([(9, 3), (55, 3), (53, 6), (11, 6)])
        for k in range(10):
            x = 11 + k * 4.6
            F.part('stone', '#c8bca0' if k % 2 else '#a89c84', bevel=0.6).poly([(x - 1.5, 6), (x + 1.5, 6), (x + 0.1, 6 - 3.6 - (k % 3))])
        for (x, y, r) in [(20, 12, 3), (40, 14, 3.4), (30, 16, 2.4)]:
            F.part('stone', SM_ROCK_L, bevel=1).ell(x, y, r, r * 0.8)
        if f == 4:
            crack(F, [(24, 8), (28, 13), (25, 18)], 0.4, SM_EYE)
    elif f == 1:
        F.part('stone', SM_ROCK_D, bevel=2).poly([(26, 6), (36, 4), (41, 11), (37, 19), (27, 19), (23, 12)])
        F.part('stone', SM_ROCK, bevel=1.5).poly([(27, 7), (35, 5.6), (39, 11), (35, 17), (28, 17), (25, 12)])
    elif f == 2:
        F.part('wood', SM_WOOD, bevel=1).cap(12, 12, 50, 10, 1.8, 1.6)
        F.part('wood', '#4a3420', flat=True).poly([(49, 8), (53, 7), (51, 11.6)])
        fine(F, (16, 11.4), (46, 9.8), '#3e2a18', 200)
    else:
        F.part('metal', '#6a6e78', bevel=0.8).cap(10, 14, 34, 10, 0.9, 0.9)
        F.part('metal', '#6a6e78', bevel=0.8).cap(34, 10, 52, 16, 0.9, 0.9)
        for k in range(4):
            F.part('wood', '#3e2a18', bevel=0.4).box(14 + k * 9, 11.6 - (k < 3) * k * 0.6, 2, 4, 0.3)
    return F.render()


# ===== 가라앉은 지킴이(drowned_keeper) — 가라앉은 유적의 잠수 기사: 녹슨 놋쇠 잠수 투구(청록 현창) · 따개비 갑옷 · 해초 · 사슬에 매단 닻 =====
DK_BRASS, DK_BRASS_D, DK_VERD, DK_ARMOR, DK_ARMOR_D, DK_WEED, DK_GLOW = '#a8884a', '#5a4422', '#5a9a8a', '#3e5a62', '#22343a', '#4a7a3a', '#7fe8d8'
DK_W, DK_H = 40, 44                                           # 게임 game/boss-drowned-art.ts DK 와 같게(가운데 20 · 엉덩이 (15, 40) · (25, 40) · 어깨 (8, 19) · (32, 19) · 현창 (20, 9))


def drowned_body(f):
    """몸통 · 투구 8장(40×44 · 팔다리 · 닻은 조각) — 0·1 현창이 숨 쉰다(거품) · 2·3 따개비가 번진다 · 4·5 투구 유리가 금 가 물이 샌다 · 6·7 무너짐"""
    F = ZFig(DK_W, DK_H)
    cx = 20
    st = min(2, f // 2) if f < 6 else 2
    b = f % 2 if f < 6 else 0
    dead = f >= 6
    sag = 0 if f < 6 else (2 if f == 6 else 5)
    # 몸통 — 둥근 잠수복 가슴 · 놋쇠 목 받침(코르셋) · 허리 띠 · 납 추
    F.part('metal', DK_ARMOR_D, bevel=3).poly([(cx - 12, 19 + sag), (cx + 12, 19 + sag), (cx + 11, 30), (cx + 8, 38), (cx - 8, 38), (cx - 11, 30)])
    F.part('metal', DK_ARMOR, bevel=2).poly([(cx - 10.6, 20 + sag), (cx + 10.6, 20 + sag), (cx + 9.6, 30), (cx + 7, 37), (cx - 7, 37), (cx - 9.6, 30)])
    F.part('metal', DK_BRASS_D, bevel=1.5).ell(cx, 19 + sag, 12.4, 4.4)                               # 목 받침
    F.part('metal', DK_BRASS, bevel=1).ell(cx, 18.6 + sag, 11.4, 3.6)
    for k in range(8):
        a = math.pi * (0.1 + 0.8 * k / 7)
        F.part('metal', '#d8c080', bevel=0.3).ell(cx - math.cos(a) * 10.4, 19.4 + sag + math.sin(a) * 2.6, 0.55, 0.55)
    F.part('metal', DK_BRASS_D, bevel=1).box(cx - 9, 33, 18, 3, 0.8)                                  # 허리 띠 · 납 추
    for s2 in (-1, 1):
        F.part('metal', '#4a4a50', bevel=1).box(cx + s2 * 6 - 2, 26, 4, 6, 1)
    F.part('metal', DK_BRASS, bevel=0.6).ell(cx, 34.5, 1.6, 1.2)
    # 따개비 · 녹 — 막이 오를수록 번진다
    spots = [(cx - 8, 24), (cx + 7, 29), (cx - 5, 31)] + ([(cx + 9, 23), (cx - 9, 34), (cx + 3, 27)] if st >= 1 else []) + ([(cx - 2, 22), (cx + 6, 35), (cx - 10, 28)] if st >= 2 else [])
    for (x, y) in spots:
        F.part('stone', '#c8c0a8', bevel=0.6).ell(x, y + (sag if y < 25 else 0), 1.4, 1.1)
        F.part('stone', '#5a5448', flat=True).ell(x, y - 0.2 + (sag if y < 25 else 0), 0.5, 0.4)
    for (x, y) in [(cx - 6, 27), (cx + 4, 32)]:
        F.part('metal', DK_VERD, flat=True).ell(x, y, 2.2, 1.2)
    # 투구 — 둥근 놋쇠 잠수 투구 · 큰 앞 현창 · 옆 작은 현창 · 위 공기 밸브
    hy = 3 + sag
    F.part('metal', DK_BRASS_D, bevel=3).ell(cx, hy + 7.6, 9.2, 9.0)
    F.part('metal', DK_BRASS, bevel=2).ell(cx - 0.4, hy + 7.2, 8.2, 8.0)
    F.part('metal', '#d8c080', flat=True).ell(cx - 3.6, hy + 3.4, 2.6, 1.6)
    for (x, y) in [(cx - 8.6, hy + 8), (cx + 8.6, hy + 8)]:                                          # 옆 현창
        F.part('metal', DK_BRASS_D, bevel=0.8).ell(x, y, 2.0, 2.4)
        F.part('glow' if not dead else 'metal', '#2a5a58' if not dead else '#1a2a2a', glow=not dead).ell(x, y, 1.2, 1.6)
    F.part('metal', DK_BRASS_D, bevel=1.4).ell(cx, hy + 8.4, 5.6, 5.4)                               # 앞 현창 테
    F.part('metal', '#0e1a1c', flat=True).ell(cx, hy + 8.4, 4.4, 4.2)
    if not dead:
        F.part('glow', DK_GLOW, glow=True).ell(cx, hy + 8.6, 2.6 + b * 0.3, 2.4 + b * 0.3)
        F.part('glow', '#e8fff8', glow=True).ell(cx - 0.8, hy + 7.8, 0.9, 0.8)
        F.glow(cx, hy + 8.6, 6 + b, DK_GLOW, 0.35)
    for k in range(4):                                                                               # 현창 창살
        a = k / 4 * math.pi
        fine(F, (cx + math.cos(a) * 4.4, hy + 8.4 + math.sin(a) * 4.2), (cx - math.cos(a) * 4.4, hy + 8.4 - math.sin(a) * 4.2), DK_BRASS_D, 230)
    for k in range(10):
        a = k / 10 * math.tau
        F.part('metal', '#d8c080', bevel=0.3).ell(cx + math.cos(a) * 5.2, hy + 8.4 + math.sin(a) * 5.0, 0.45, 0.45)
    F.part('metal', DK_BRASS_D, bevel=0.8).box(cx + 4, hy - 1.4, 3, 3, 0.8)                           # 공기 밸브
    F.part('metal', DK_VERD, flat=True).ell(cx + 6, hy + 2, 1.6, 0.9)
    if st >= 2:
        crack(F, [(cx + 2, hy + 5), (cx + 3.4, hy + 8), (cx + 1.6, hy + 11)], 0.3, '#e8fff8')
    # 해초 — 투구와 어깨에서 늘어진다
    for (x0, y0, ln, w) in [(cx - 7, hy + 12, 10, 1.0), (cx + 9, 21 + sag, 12, 0.9), (cx - 11, 22 + sag, 9, 0.8)]:
        pts = [(x0 + math.sin(t * 3 + x0) * 1.4, y0 + t * ln) for t in [k / 6 for k in range(7)]]
        for (a, bb) in zip(pts, pts[1:]):
            F.part('cloth', DK_WEED, bevel=0.4).cap(a[0], a[1], bb[0], bb[1], w, w * 0.8)
    if dead:
        for k in range(5):
            x = 8 + k * 6
            F.part('metal', DK_ARMOR if k % 2 else DK_BRASS_D, bevel=0.8).poly([(x, 42), (x + 3, 40.4), (x + 5, 42.4), (x + 2, 43.6)])
    return F.render()


def drowned_parts(f):
    """조각 6장(20×36) — 0 다리((10, 3) → 발 (10, 33) · 납 장화) · 1 윗팔((10, 3) → (10, 14)) · 2 아래팔 + 집게 장갑((10, 3) → 손 (10, 14))
       3 닻(고리 (10, 3) · 아래 갈고리 둘 · 따개비) · 4 사슬 고리 하나(가운데 (10, 18)) · 5 금 간 닻"""
    F = ZFig(20, 36)
    if f == 0:
        F.part('metal', DK_ARMOR_D, bevel=1.5).cap(10, 4, 10, 18, 3.4, 3.0)
        F.part('metal', DK_ARMOR, bevel=1).cap(9.6, 5, 9.6, 17, 2.4, 2.2)
        F.part('metal', DK_BRASS, bevel=1).ell(10, 19, 3.2, 2.4)
        F.part('metal', DK_ARMOR_D, bevel=1.5).cap(10, 20, 10, 28, 3.0, 2.8)
        F.part('metal', '#4a4a50', bevel=1.4).poly([(4, 34.6), (16.4, 34.6), (15, 28.4), (5.4, 28.4)])   # 납 장화
        F.part('metal', DK_BRASS, bevel=0.6).box(5.4, 28.4, 9.6, 1.4, 0.4)
    elif f == 1:
        F.part('metal', DK_BRASS, bevel=1).ell(10, 3.4, 3.0, 3.0)
        F.part('metal', DK_ARMOR, bevel=1).cap(10, 4, 10, 13.4, 2.6, 2.4)
    elif f == 2:
        F.part('metal', DK_ARMOR, bevel=1).cap(10, 3.4, 10, 11, 2.4, 2.2)
        F.part('metal', DK_BRASS_D, bevel=1).ell(10, 12.6, 3.0, 2.6)
        for s2 in (-1, 1):
            F.part('metal', DK_BRASS, bevel=0.6).cap(10 + s2 * 1.4, 13.6, 10 + s2 * 2.4, 17, 1.0, 0.7)
    elif f in (3, 5):
        F.part('metal', '#4a4e54', bevel=1.2).ell(10, 3.4, 2.4, 2.4)                                   # 고리
        F.part('metal', '#1e2226', flat=True).ell(10, 3.4, 1.2, 1.2)
        F.part('metal', '#4a4e54', bevel=1.4).cap(10, 5.6, 10, 30, 1.6, 1.6)                          # 자루
        F.part('metal', '#4a4e54', bevel=1.2).box(5, 9, 10, 2.2, 0.8)                                  # 가로대
        arc = [(10 + math.sin(a) * 8, 30 - math.cos(a) * 4 + 4) for a in [math.pi * (-0.5 + k / 10) for k in range(11)]]
        for (a, bb) in zip(arc, arc[1:]):
            F.part('metal', '#4a4e54', bevel=1).cap(a[0], a[1], bb[0], bb[1], 1.5, 1.5)
        for s2 in (-1, 1):
            F.part('metal', '#5a5e64', bevel=0.8).poly([(10 + s2 * 8, 30), (10 + s2 * 9.6, 26), (10 + s2 * 6.8, 28.6)])
        for (x, y) in [(8.6, 16), (11.4, 22), (14, 33)]:
            F.part('stone', '#c8c0a8', bevel=0.5).ell(x, y, 1.1, 0.9)
        F.part('metal', DK_VERD, flat=True).ell(9.4, 26, 1.0, 2.0)
        if f == 5:
            crack(F, [(9, 12), (11, 18), (9.6, 24)], 0.35, DK_GLOW)
    else:
        F.part('metal', '#4a4e54', bevel=0.8).ell(10, 18, 2.6, 3.6)
        F.part('metal', '#1e2226', flat=True).ell(10, 18, 1.2, 2.2)
    return F.render()


RIGS = {
    'king_slime': {'body': (64, 56, 8, 2, pool_shell), 'parts': (30, 30, 10, pool_parts, (6,))},
    'bone_lord': {'body': (80, 96, 8, 2, organ_body), 'parts': (64, 24, 3, organ_parts),
                  'more': {'chest': (58, 48, 6, organ_chest_piece), 'face': (24, 22, 4, organ_face)}},
    'corrupt_heart': {'body': (46, 80, 8, 0, cocoon_body), 'parts': (100, 80, 14, moth_frame)},
    'sand_guardian': {'body': (84, 104, 8, 2, colossus_body), 'parts': (40, 44, 8, colossus_parts)},
    'blight_maw': {'body': (HIVE_W, HIVE_H, 8, 2, hive_body), 'parts': (40, 36, 5, hive_parts)},
    'first_keeper': {'body': (JD_W, JD_H, 8, 2, judge_body), 'parts': (40, 44, 11, judge_parts)},
    'pursuer': {'body': (EC_W, EC_W, 8, 2, eclipse_body), 'parts': (48, 48, 7, eclipse_parts, (5,))},
    'frost_witch': {'body': (FW_W, FW_H, 8, 2, witch_body), 'parts': (28, 56, 5, witch_parts)},
    'void_king': {'body': (VK_W, VK_H, 8, 2, void_cloak), 'parts': (48, 48, 6, void_parts)},
    'storm_warden': {'body': (SW_W, SW_H, 8, 2, storm_body), 'parts': (64, 64, 3, storm_parts)},
    'mine_horror': {'body': (MH_W, MH_H, 8, 2, mine_body), 'parts': (24, 24, 5, mine_parts)},
    'ice_warden': {'body': (IW_W, IW_H, 8, 2, watch_body), 'parts': (20, 36, 5, watch_parts)},
    'spore_queen': {'body': (SQ_W, SQ_H, 8, 2, spore_body), 'parts': (80, 36, 5, spore_parts)},
    'proliferator': {'body': (PF_W, PF_H, 8, 2, prolif_core), 'parts': (14, 14, 6, prolif_parts)},
    'hepha': {'body': (HP_W, HP_H, 8, 2, hepha_body), 'parts': (40, 48, 7, hepha_parts)},
    'overseer': {'body': (OV_W, OV_H, 8, 2, overseer_body), 'parts': (16, 30, 5, overseer_parts)},
    'archetype': {'body': (AR_W, AR_H, 8, 2, arche_body), 'parts': (12, 26, 6, arche_parts)},
    'restorer': {'body': (RS_W, RS_H, 8, 2, restorer_core), 'parts': (64, 64, 6, restorer_parts)},
    'shaft_maw': {'body': (SM_W, SM_H, 8, 2, shaft_head), 'parts': (64, 24, 5, shaft_parts)},
    'drowned_keeper': {'body': (DK_W, DK_H, 8, 2, drowned_body), 'parts': (20, 36, 6, drowned_parts)},
    'vine_lord': {'body': (RT_W, RT_H, 8, 2, root_body), 'parts': (64, 40, 8, root_parts, (5,)), 'more': {'crown': (120, 60, 3, root_crown)}},
}


def pad1(sheet, W, H):
    """0번 장의 밑 여백 · 가로 치우침(배율 1 시트 — mkruinmobs.pad_of 와 같은 뜻)"""
    bb = sheet.crop((0, 0, W, H)).getbbox()
    return H - bb[3], round((bb[0] + bb[2]) / 2 - W / 2, 1)


def sheet_of(fw, fh, n, fn, name, full=()):
    """설계 칸 fw×fh → 게임 px (fw·K)×(fh·K) · 시트 배율 1(manifest scale 1)"""
    W, H = fw * K, fh * K
    sheet = Image.new('RGBA', (n * W, H), (0, 0, 0, 0))
    for f in range(n):
        fr = fn(f)
        bb = fr.getbbox()
        if f not in full and bb and (bb[0] < 1 or bb[2] > W - 1 or bb[1] < 1 or bb[3] > H):
            raise SystemExit('%s 장 %d 이 칸 벽에 닿았다: %s' % (name, f, bb))
        sheet.paste(fr, (f * W, 0))
    return sheet


def main(only=None):
    os.makedirs(OUT, exist_ok=True)
    man = json.load(open(MANIFEST, encoding='utf-8'))
    B = man['bosses']['sheets']
    for bid, R in RIGS.items():
        if only and bid not in only:
            continue
        fw, fh, n, death, fn = R['body']
        sh = sheet_of(fw, fh, n, fn, bid)
        sh.save(os.path.join(OUT, bid + '.png'))
        foot, side = pad1(sh, fw * K, fh * K)
        B[bid] = {'file': 'boss/%s.png' % bid, 'frameW': fw * K, 'frameH': fh * K, 'count': n, 'foot': foot, 'side': side, 'death': death, 'scale': 1, 'gap': 0, 'rig': 1}
        pw, ph, pn, pfn = R['parts'][:4]
        ps = sheet_of(pw, ph, pn, pfn, bid + '_parts', R['parts'][4] if len(R['parts']) > 4 else ())
        ps.save(os.path.join(OUT, bid + '_parts.png'))
        B[bid + '_parts'] = {'file': 'boss/%s_parts.png' % bid, 'frameW': pw * K, 'frameH': ph * K, 'count': pn, 'scale': 1, 'gap': 0, 'rig': 1}
        for nm, (mw, mh, mn, mfn) in R.get('more', {}).items():    # 몸에서 떼어 따로 움직이는 부위(가슴 · 얼굴 …)
            ms = sheet_of(mw, mh, mn, mfn, bid + '_' + nm)
            ms.save(os.path.join(OUT, '%s_%s.png' % (bid, nm)))
            B['%s_%s' % (bid, nm)] = {'file': 'boss/%s_%s.png' % (bid, nm), 'frameW': mw * K, 'frameH': mh * K, 'count': mn, 'scale': 1, 'gap': 0, 'rig': 1}
        B.pop(bid + '_pose', None)                     # 리그 보스는 기술 자세를 몸 모션이 맡는다
        print('  %-14s 몸 %dx%d ×%d · 조각 %dx%d ×%d' % (bid, fw * K, fh * K, n, pw * K, ph * K, pn))
    json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(MANIFEST, 'a').write('\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:] or None))
