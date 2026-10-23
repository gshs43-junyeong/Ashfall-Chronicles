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
    # 등뼈 — 가운데 마디 줄
    for y in range(38, 80, 4):
        F.part('clay', BONE if y % 8 else BONE_D, bevel=1.2).ell(cx, y + fall * 2, 3.2, 1.7)
    # 갈비 — 여섯 쌍. 닫히면 앞으로 감겨 핵을 덮고, 열리면 풀무처럼 벌어진다. 손상 단계마다 부러진 갈비가 는다
    broken = {1: {(1, -1), (3, 1)}, 2: {(1, -1), (3, 1), (0, 1), (4, -1), (5, 1)}}.get(st, set())
    for k in range(6):
        y = 46 + k * 5.2
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
        F.part('clay', BONE, bevel=2).poly([(cx + sd * 18, 40), (cx + sd * 27, 42), (cx + sd * 26, 52), (cx + sd * 19, 50)])
        F.part('clay', BONE_D, bevel=1).ell(cx + sd * 24, 44, 2.4, 2.4)
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
    # 두개골 — 오르간의 얼굴(바람통 앞 · 갈비 위)
    sy0 = 36 + fall * 3
    F.part('clay', BONE_L, bevel=3).ell(cx, sy0, 9, 7.5)
    F.part('clay', BONE, bevel=2).box(cx - 6, sy0 + 4, 12, 4, 1.5)
    if st < 2:
        F.part('clay', BONE_D, bevel=1.5).box(cx - 5.5, sy0 + 8, 11, 3, 1)       # 아래턱(3막은 빠졌다)
        for k in range(5):
            F.px(cx - 4 + k * 2, sy0 + 8, '#2a2620')
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
        F.part('clay', BONE, bevel=2.4).poly([(3, 8), (24, 4), (34, 8), (34, 17), (22, 20), (3, 16)])    # 견갑 날 손바닥
        fine(F, (6, 12), (30, 9), BONE_D); fine(F, (6, 14), (30, 14), BONE_D)
        for k, (y0, ln) in enumerate(((6, 26), (10, 28), (14, 27), (18, 22))):
            F.part('clay', BONE if k % 2 else BONE_L, bevel=1.2).cap(33, y0 + 1, 33 + ln * 0.55, y0, 1.6, 1.3)
            F.part('clay', BONE, bevel=1.1).cap(33 + ln * 0.55, y0, 33 + ln, y0 + 2.5 + k * 0.4, 1.3, 0.7)
    return F.render()


RIGS = {
    'king_slime': {'body': (64, 56, 8, 2, pool_shell), 'parts': (30, 30, 10, pool_parts, (6,))},
    'bone_lord': {'body': (80, 96, 8, 2, organ_body), 'parts': (64, 24, 3, organ_parts)},
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
        B.pop(bid + '_pose', None)                     # 리그 보스는 기술 자세를 몸 모션이 맡는다
        print('  %-14s 몸 %dx%d ×%d · 조각 %dx%d ×%d' % (bid, fw * K, fh * K, n, pw * K, ph * K, pn))
    json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(MANIFEST, 'a').write('\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:] or None))
