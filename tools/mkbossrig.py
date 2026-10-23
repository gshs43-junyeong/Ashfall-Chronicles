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


def pool_shell(f):
    """몸 시트 6장 — 0·1 1막(숨 · 눈 깜빡) · 2·3 2막(금 간 투구 · 붉은 등불) · 4·5 쓰러짐(투구가 잿물에 잠긴다)"""
    W, H = 64, 56
    F = ZFig(W, H)
    cx = W // 2
    crack = f >= 2
    sink = (0, 0, 0, 0, 6, 13)[f]                       # 쓰러짐 — 몸은 퍼지고 투구만 가라앉는다
    b = (0, 1, 0, 1, 0, 0)[f]
    base = H - 6                                        # 웅덩이 면(몸 밑동) — 장마다 같다
    lamp = '#ff5a3a' if crack else '#ffd27a'
    # 잿물 몸 — 밑이 넓다 · 쓰러질수록 낮고 넓게
    bh = 11 - sink * 0.55
    F.part('flesh', SLUDGE, bevel=5).ell(cx, base - bh + 2 - b, 25 + sink * 0.3, bh)
    F.part('flesh', SLUDGE_D, bevel=3).ell(cx, base, 28, 4)
    for ex, ey in ((-18, -3), (16, -2), (3, -1)):
        F.px(cx + ex, base + ey, '#ff8a40'); F.glow(cx + ex, base + ey, 2, '#ff8a40', 0.18)
    y0 = base - 40 + sink + b                           # 투구 기준선
    if sink < 13:
        # 챙에서 흘러내리는 방울 — 둥근 머리
        for k, (dx, ln) in enumerate(((-21, 4), (-11, 6), (12, 5), (22, 3))):
            F.part('flesh', SLUDGE, bevel=1.5).ell(cx + dx, min(base - 3, y0 + 30 + ln + (k + f) % 2), 1.8, 2.4)
    # 투구 — 낮은 갓(녹슨 쇠) · 둘레 띠 · 넓은 챙
    F.part('stone', RUST, bevel=5).ell(cx, y0 + 17, 17, 12)
    F.part('stone', '#9a7650', bevel=2).ell(cx - 6, y0 + 11, 6, 3.2, -0.3)
    F.part('metal', '#4e3c2c', bevel=1.2).box(cx - 17, y0 + 22, 34, 3, 1)
    F.part('metal', '#5e4632', bevel=2).ell(cx, y0 + 27, 27, 3.4)
    for rx in (-14, -7, 7, 14):
        F.px(cx + rx, y0 + 23, '#c8a070')
    # 등불 — 이마의 철 상자와 유리
    F.part('metal', '#3e342c', bevel=1.5).box(cx - 5, y0 + 6, 10, 8, 2)
    F.part('glow', lamp if f < 5 else '#6a3a2a', glow=f < 5).box(cx - 3, y0 + 8, 6, 4, 1)
    if f < 5:
        F.glow(cx, y0 + 10, 8, lamp, 0.4)
    F.part('stone', '#77706a', bevel=1.5).ell(cx + 10, y0 + 14, 3.4, 2.2, -0.3)   # 굳은 재 딱지
    # 챙 밑 눈 — 쓰러지면 잿물에 잠겨 안 보인다
    eye = '#ff6a3a' if crack else EMBER
    if sink == 0:
        for ex in (-9, 9):
            if f in (1, 3):
                F.line(cx + ex - 2, y0 + 32, cx + ex + 2, y0 + 32, eye)
            else:
                F.part('glow', eye, glow=True).ell(cx + ex, y0 + 32, 2.6, 1.8)
                F.px(cx + ex - 1, y0 + 31, '#fff2c0')
                F.glow(cx + ex, y0 + 32, 5, eye, 0.32)
    if crack:                                           # 금 — 갓을 가로지른다 · 틈으로 불빛
        F.line(cx - 12, y0 + 12, cx - 6, y0 + 17, '#2a2018'); F.line(cx - 6, y0 + 17, cx - 8, y0 + 22, '#2a2018')
        F.line(cx + 8, y0 + 8, cx + 12, y0 + 15, '#2a2018')
        F.glow(cx - 6, y0 + 17, 3, '#ff6a3a', 0.3)
    # 쓰러질 때 투구를 덮는 잿물 테
    if sink:
        F.part('flesh', SLUDGE, bevel=3).ell(cx, base - 4, 27, 3 + sink * 0.25)
    return F.render()


def pool_parts(f):
    """조각 6장 — 0·1·2 팔 마디(크기 · 박힌 잡동사니가 다르다) · 3 손(곡괭이 머리 발톱) · 4 거품 · 5 튐(왕관 모양 물보라)"""
    F = ZFig(30, 30)
    if f == 0:
        F.part('flesh', SLUDGE, bevel=4).ell(15, 15, 11, 10)
        F.part('stone', '#6e6862', bevel=1.5).ell(10, 11, 3, 2)
        F.px(19, 18, EMBER); F.glow(19, 18, 2, EMBER, 0.3)
    elif f == 1:
        F.part('flesh', SLUDGE, bevel=3).ell(15, 15, 9, 8.5)
        F.part('metal', '#8a8a92', bevel=1.2).poly([(8, 9), (14, 12), (12, 14), (6, 11)])   # 박힌 곡괭이 날
        F.part('wood', '#6a4a2a', bevel=1).cap(13, 13, 18, 19, 1.2, 1.0)
    elif f == 2:
        F.part('flesh', SLUDGE_D, bevel=4).ell(15, 15, 12.5, 11)
        F.part('metal', '#6a6058', bevel=1.2).box(6, 13, 18, 3, 1)                         # 박힌 레일 토막
        F.px(9, 14, '#a89a88'); F.px(20, 14, '#a89a88')
    elif f == 3:                                                                           # 손 — 녹슨 곡괭이 머리들이 발톱
        F.part('flesh', SLUDGE, bevel=4).ell(13, 17, 9, 8)
        for a in (-0.9, -0.3, 0.35):
            x1, y1 = 15 + math.cos(a) * 13, 17 + math.sin(a) * 13
            F.part('metal', '#8a7a68', bevel=1.2).cap(17, 17, x1, y1, 2.2, 0.6)
        F.part('stone', '#6e6862', bevel=1.2).ell(9, 14, 3, 2)
    elif f == 4:
        F.part('flesh', '#5a544e', bevel=3).ell(15, 15, 6, 6)
        F.px(13, 12, '#c8bfb4'); F.px(12, 13, '#c8bfb4')
    else:
        for k in range(7):
            a = -math.pi + (k + 0.5) / 7 * math.pi
            F.part('flesh', SLUDGE, bevel=1.5).cap(15, 24, 15 + math.cos(a) * 11, 24 + math.sin(a) * 13, 2.4, 1.0)
        F.part('flesh', SLUDGE_D, bevel=2).ell(15, 25, 10, 3)
    return F.render()


RIGS = {
    'king_slime': {'body': (64, 56, 6, 2, pool_shell), 'parts': (30, 30, 6, pool_parts)},
}


def pad1(sheet, W, H):
    """0번 장의 밑 여백 · 가로 치우침(배율 1 시트 — mkruinmobs.pad_of 와 같은 뜻)"""
    bb = sheet.crop((0, 0, W, H)).getbbox()
    return H - bb[3], round((bb[0] + bb[2]) / 2 - W / 2, 1)


def sheet_of(fw, fh, n, fn, name):
    """설계 칸 fw×fh → 게임 px (fw·K)×(fh·K) · 시트 배율 1(manifest scale 1)"""
    W, H = fw * K, fh * K
    sheet = Image.new('RGBA', (n * W, H), (0, 0, 0, 0))
    for f in range(n):
        fr = fn(f)
        bb = fr.getbbox()
        if bb and (bb[0] < 1 or bb[2] > W - 1 or bb[1] < 1 or bb[3] > H):
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
        pw, ph, pn, pfn = R['parts']
        ps = sheet_of(pw, ph, pn, pfn, bid + '_parts')
        ps.save(os.path.join(OUT, bid + '_parts.png'))
        B[bid + '_parts'] = {'file': 'boss/%s_parts.png' % bid, 'frameW': pw * K, 'frameH': ph * K, 'count': pn, 'scale': 1, 'gap': 0, 'rig': 1}
        B.pop(bid + '_pose', None)                     # 리그 보스는 기술 자세를 몸 모션이 맡는다
        print('  %-14s 몸 %dx%d ×%d · 조각 %dx%d ×%d' % (bid, fw * K, fh * K, n, pw * K, ph * K, pn))
    json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(MANIFEST, 'a').write('\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:] or None))
