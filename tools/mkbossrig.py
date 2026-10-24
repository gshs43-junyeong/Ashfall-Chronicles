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


def crack(F, pts, w, hot):
    """빛이 새는 금 — 속불 쐐기 + 위(그늘) 쪽 어두운 날 1px · 아래 쪽 깨진 날의 밝은 칸 몇 개"""
    L, R = [], []
    for i, (x, y) in enumerate(pts):
        x2, y2 = pts[min(i + 1, len(pts) - 1)]; x1, y1 = pts[max(i - 1, 0)]
        dx, dy = x2 - x1, y2 - y1; d = math.hypot(dx, dy) or 1
        ww = w * (1 - i / len(pts) * 0.6)
        L.append((x - dy / d * ww, y + dx / d * ww)); R.append((x + dy / d * ww, y - dx / d * ww))
    F.part('glow', hot, glow=True).poly(L + R[::-1])
    F.glow(pts[0][0] * K / K, pts[0][1], 3, hot, 0.25)
    for (a, b) in zip(R, R[1:]):
        fine(F, a, b, '#1c140e')
    for k, (a, b) in enumerate(zip(L, L[1:])):
        if k % 2 == 0:
            fine(F, a, b, '#d8a874', 230)


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


RIGS = {
    'king_slime': {'body': (64, 56, 8, 2, pool_shell), 'parts': (30, 30, 10, pool_parts, (6,))},
    'bone_lord': {'body': (80, 96, 8, 2, organ_body), 'parts': (64, 24, 3, organ_parts),
                  'more': {'chest': (58, 48, 6, organ_chest_piece), 'face': (24, 22, 4, organ_face)}},
    'corrupt_heart': {'body': (46, 80, 8, 0, cocoon_body), 'parts': (100, 80, 14, moth_frame)},
    'sand_guardian': {'body': (84, 104, 8, 2, colossus_body), 'parts': (40, 44, 8, colossus_parts)},
    'blight_maw': {'body': (HIVE_W, HIVE_H, 8, 2, hive_body), 'parts': (40, 36, 5, hive_parts)},
    'first_keeper': {'body': (JD_W, JD_H, 8, 2, judge_body), 'parts': (40, 44, 11, judge_parts)},
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
