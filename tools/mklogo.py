#!/usr/bin/env python3
"""타이틀 로고 · 파비콘을 굽는다 — 글꼴 윤곽(tools/art/fonts, SIL OFL)을 그림·경로로 구워 게임·사이트는 글꼴 파일이 없다.

  python3 tools/mklogo.py            # play/assets/ui/logo.png · logo_small.png · favicon*.png · site/favicon.ico
  python3 tools/mklogo.py --preview  # 위 + /tmp 에 어두운 바탕 미리보기

로고 = 'ASHFALL' (Cinzel Black — 첫 A · 끝 L 이 큰 제목 글자, 위는 밝은 금 → 아래 잿불 주황, 아래로 민 두께와 검은 윤곽)
     + 'CHRONICLES' (Cinzel Bold, 넓게 벌려 양옆 마름모로 끝나는 금줄)
     + 'A' 의 꼭짓점에 앉은 별 하나와 오른쪽 위 하늘로 난 꼬리(게임의 시작 — 떨어진 별).
사이트 홈 히어로는 같은 그림을 쓴다(site/wordmark*.png) — 별똥별이 떨어져 앉는 움직임만 site/hero.js 가 더한다.
파비콘 = 네 갈래 별(별 조각) — 16px 에서도 읽히게 칸을 손으로 찍었다.
★ 게임 폴더의 로고를 이 도구에 다시 먹이지 말 것 — 원본은 글꼴 윤곽이다."""
import os, sys, math, random
from PIL import Image, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
UI = os.path.join(ROOT, 'play', 'assets', 'ui')

# ---- 글자 윤곽 — tools/art/fonts 의 OFL 글꼴(Cinzel Black · Bold)에서 뽑는다 ----
# 로고는 글꼴을 싣지 않는다: 윤곽을 PNG(게임 · 사이트 같은 그림)로 구워 넣으므로 게임·사이트 어디에도 글꼴 파일이 없다.
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen
from PIL import ImageChops, ImageDraw
import pathops

FONTS = os.path.join(ROOT, 'tools', 'art', 'fonts')
MAIN = TTFont(os.path.join(FONTS, 'Cinzel-Black.ttf'))
SUB = TTFont(os.path.join(FONTS, 'Cinzel-Bold.ttf'))
SUB_BOLD = SUB
CAP = 100                     # ASHFALL 대문자 높이 = 100 단위 — 모든 치수의 기준
BIG = {0: 1.22, 6: 1.22}       # 첫·끝 큰 글자 배율
SUB_CAP = 20                  # CHRONICLES 대문자 높이
GAP = 26                      # 두 줄 사이(두께 DEPTH 아래부터)
DEPTH = 6                     # 글자 두께 — 아래로 밀린 옆면(옛 픽셀 로고의 입체감을 잇는다)


class FlatPen(BasePen):
    """곡선을 잘게 끊어 다각형 목록으로 — PIL 로 칠하려고"""
    def __init__(self, gs, steps=10):
        super().__init__(gs); self.polys, self.cur, self.steps = [], [], steps
    def _moveTo(self, p): self.cur = [p]
    def _lineTo(self, p): self.cur.append(p)
    def _curveToOne(self, a, b, c):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps; u = 1 - t
            self.cur.append(tuple(u**3 * p0[k] + 3 * u*u*t * a[k] + 3 * u*t*t * b[k] + t**3 * c[k] for k in (0, 1)))
    def _qCurveToOne(self, a, b):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps; u = 1 - t
            self.cur.append(tuple(u*u * p0[k] + 2 * u*t * a[k] + t*t * b[k] for k in (0, 1)))
    def _closePath(self):
        if len(self.cur) > 2: self.polys.append(self.cur)
        self.cur = []
    _endPath = _closePath


def layout(font, text, cap, track, x0, base, big=None):
    """글자마다 (글리프 이름, 변환 행렬) — track 은 글자 사이 더할 간격(단위) · big = {글자 순번: 배율}(제목의 첫·끝 큰 글자)"""
    s0 = cap / font['OS/2'].sCapHeight
    cmap, hmtx = font.getBestCmap(), font['hmtx']
    out, x = [], x0
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]; s = s0 * (big or {}).get(i, 1)
        out.append((g, (s, 0, 0, -s, x, base)))
        x += hmtx[g][0] * s + track
    return out, x - track - x0


def word_width(font, text, cap, track):
    return layout(font, text, cap, track, 0, 0)[1]


def polygons(font, glyphs):
    """글자 윤곽을 다각형으로 — ★ 겹친 윤곽(Cinzel 의 획 조각)을 먼저 합친다. 안 합치면 XOR 로 칠할 때
    겹친 띠가 비어 H · F · L 획 안에 세로 실금이 그어졌다"""
    gs = font.getGlyphSet(); out = []
    for g, m in glyphs:
        path = pathops.Path(); gs[g].draw(TransformPen(path.getPen(), m))
        path.simplify(fix_winding=True); path.convertConicsToQuads()
        fp = FlatPen(gs); path.draw(fp); out += fp.polys
    return out


def fill_mask(polys, W, H, k, ox, oy, ss=4):
    """다각형들을 k 배로 칠한 알파 마스크 — 윤곽마다 XOR 해 속 구멍(A·O·R 의 속)을 비운다. ss 배로 칠해 줄여 가장자리를 부드럽게"""
    big = Image.new('L', (W * ss, H * ss), 0)
    for poly in polys:
        m = Image.new('L', big.size, 0)
        ImageDraw.Draw(m).polygon([((x + ox) * k * ss, (y + oy) * k * ss) for x, y in poly], fill=255)
        big = ImageChops.difference(big, m)
    return big.resize((W, H), Image.LANCZOS)


def geometry(sub=None):
    sub = sub or SUB
    """두 줄 · 가는 줄 · 별 자리를 단위 좌표로. ASHFALL 왼쪽 위 = (0, 0)"""
    trackA = 0.015 * CAP
    a_glyphs, wA = layout(MAIN, 'ASHFALL', CAP, trackA, 0, CAP, BIG)   # 첫 A · 끝 L 을 키워 제목 글자답게(바닥은 같은 선)
    wC_target = wA * 0.7                                            # 아랫줄은 윗줄의 7/10 — 양옆에 마름모로 끝나는 금줄
    raw = word_width(sub, 'CHRONICLES', SUB_CAP, 0)
    trackC = (wC_target - raw) / 9
    yC = CAP + DEPTH + GAP
    c_glyphs, wC = layout(sub, 'CHRONICLES', SUB_CAP, trackC, (wA - wC_target) / 2, yC + SUB_CAP)
    cx = wA / 2; lineY = yC + SUB_CAP / 2
    gapL = 9
    lines = [(wA * 0.06, cx - wC / 2 - gapL), (cx + wC / 2 + gapL, wA * 0.94)]   # 바깥 끝은 마름모
    # 별 — 첫 'A' 꼭짓점 왼쪽 위에서 반짝이고, 꼬리는 오른쪽 위 하늘로 길게(떨어져 내려온 길)
    apex = min(polygons(MAIN, a_glyphs[:1])[0], key=lambda p: p[1])
    star_c = (apex[0] - 3, -BIG[0] * CAP + CAP - 24)
    tail = (star_c[0] + wA * 0.52, star_c[1] - wA * 0.035)       # 낮게 눕혀 — 위로 솟으면 그만큼 로고가 높아진다
    return dict(a=a_glyphs, c=c_glyphs, wA=wA, wC=wC, lineY=lineY, lines=lines, star=star_c, tail=tail,
                box=(-30, -84, wA + 30, yC + SUB_CAP + 26))


def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def star(size, core=(255, 252, 232), glow=(255, 196, 92)):
    """네 갈래 별 — 가운데 밝고 끝으로 갈수록 가늘다"""
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); P = im.load(); c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            dx, dy = abs(x - c), abs(y - c); m = max(dx, dy)
            w = max(0.5, (c - m) * 0.16)                               # 갈래 굵기 — 가운데로 올수록 굵다
            if (min(dx, dy) <= w and m < c) or dx + dy <= size * .12:
                P[x, y] = lerp(core, glow, min(1, m / c * 1.3)) + (255,)
    halo = im.filter(ImageFilter.GaussianBlur(size / 8))
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for _ in range(3): out.alpha_composite(halo)
    out.alpha_composite(im)
    return out


def gradient(W, H, stops, y0, y1):
    """세로 색 띠 — stops = [(위치 0~1, (r,g,b)), …], y0~y1 픽셀 사이에 건다"""
    col = []
    for y in range(H):
        t = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        for i in range(len(stops) - 1):
            (p0, c0), (p1, c1) = stops[i], stops[i + 1]
            if t <= p1: col.append(lerp(c0, c1, (t - p0) / max(1e-6, p1 - p0))); break
        else: col.append(stops[-1][1])
    im = Image.new('RGB', (1, H)); im.putdata(col)
    return im.resize((W, H))


def DECO_BOX(g):
    """장식 판의 상자 — 로고 상자보다 양옆 · 위 · 아래로 넓다"""
    x0, y0, x1, y1 = g['box']
    return (x0 - 120, y0, x1 + 120, y1 + 34)


def ornament(g, W, H, k, ox, oy, ss=3):
    """타이틀 화면 로고의 둘레 — 양옆 금빛 덩굴 장식 · 그 위 별자리 · CHRONICLES 아래 늘어진 마름모.
    글자 뒤에 깔리므로 옅게(잔불 금색 한 가지). 하늘 아치는 부피가 커서 뺐다(사용자 결정 2026-10-04)"""
    L = Image.new('RGBA', (W * ss, H * ss), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    P = lambda x, y: ((x + ox) * k * ss, (y + oy) * k * ss)
    u = k * ss
    GOLD = (236, 176, 92); PALE = (255, 220, 150); DARK = (22, 11, 8)
    wA = g['wA']; cx = wA / 2
    def line(pts, w, col, a):
        d.line([P(*q) for q in pts], fill=col + (int(255 * a),), width=max(1, round(w * u)), joint='curve')
    def diamond(x, y, r, col, a=1, edge=True):
        X, Y = P(x, y); R = r * u
        if edge: d.polygon([(X - R - u, Y), (X, Y - R - u), (X + R + u, Y), (X, Y + R + u)], fill=DARK + (int(230 * a),))
        d.polygon([(X - R, Y), (X, Y - R), (X + R, Y), (X, Y + R)], fill=col + (int(255 * a),))
    def spark(x, y, r, a):
        X, Y = P(x, y); R = r * u; w = R * .22
        d.polygon([(X, Y - R), (X + w, Y - w), (X + R, Y), (X + w, Y + w), (X, Y + R), (X - w, Y + w), (X - R, Y), (X - w, Y - w)], fill=PALE + (int(255 * a),))
    ay = 58                                         # 덩굴 높이(로고 글자 가운데쯤)
    # 별자리 — 양옆 덩굴 위 · 큰 A · L 어깨 바깥에 한 무리씩(옅은 선으로 잇는다). ★ 별(A 꼭짓점) 쪽으로 들이지 말 것
    for grp in (((-112, 34), (-92, 2), (-58, -14), (-40, -46)), ((wA + 40, -46), (wA + 58, -14), (wA + 92, 2), (wA + 112, 34))):
        line(list(grp), .6, GOLD, .4)
        for j, (x, y) in enumerate(grp): spark(x, y, 4.5 if j % 2 else 3.2, .85)
    # 양옆 덩굴 장식 — 글자 쪽이 굵고 바깥으로 가늘어지는 금줄 + 끝의 소용돌이 + 마름모
    for sgn in (-1, 1):
        x_in = -14 if sgn < 0 else wA + 14; x_out = x_in + sgn * 92; y = ay
        X0, Y0 = P(x_in, y); X1, Y1 = P(x_out, y)
        d.polygon([(X0, Y0 - 2.2 * u), (X1, Y1 - .7 * u), (X1, Y1 + .7 * u), (X0, Y0 + 2.2 * u)], fill=GOLD + (235,))
        line([(x_in + sgn * 8, y - 7), (x_in + sgn * 62, y - 7)], .6, GOLD, .55)       # 위 · 아래 가는 덧줄
        line([(x_in + sgn * 8, y + 7), (x_in + sgn * 62, y + 7)], .6, GOLD, .55)
        for up in (-1, 1):                                                              # 소용돌이 — 줄 끝에서 위아래로 말린다
            pts = [];
            for i in range(41):
                t = i / 40 * 1.6 * math.pi; r = 9 * (1 - i / 52)
                pts.append((x_out - sgn * 10 + sgn * r * math.sin(t), y + up * (9 - r * math.cos(t))))
            line(pts, 1.2, GOLD, .85)
        diamond(x_out + sgn * 6, y, 5.2, PALE)
        d.ellipse([P(x_out + sgn * 16 - 1.6, y - 1.6), P(x_out + sgn * 16 + 1.6, y + 1.6)], fill=GOLD + (230,))
        diamond(x_in + sgn * 40, y, 2.2, PALE, .9, edge=False)
    # CHRONICLES 아래 늘어진 장식 — 얕은 활 + 가운데 마름모 + 매달린 작은 별
    by = g['lineY'] + 22
    pts = [(cx + (i / 40 - .5) * 150, by - 6 * math.cos((i / 40 - .5) * math.pi)) for i in range(41)]
    line(pts, 1.1, GOLD, .7)
    diamond(cx, by - 6, 4, PALE); spark(cx, by + 8, 4, .8)
    for sx_ in (-1, 1): diamond(cx + sx_ * 75, by, 1.8, GOLD, .9, edge=False)
    L = L.resize((W, H), Image.LANCZOS)
    glow = L.filter(ImageFilter.GaussianBlur(k * 3)); out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(glow); out.alpha_composite(L)                   # 금빛이 살짝 번진다(잔불 빛을 받은 것처럼)
    return out


EMBER = [(0, (255, 244, 206)), (.38, (255, 204, 110)), (.72, (240, 128, 56)), (1, (186, 66, 28))]
BONE = (234, 224, 206)


def logo(width, sub=None, with_star=True, crop=True, deco=False):
    """게임 타이틀 로고 — 잔불빛 글자 + 잿빛 아랫줄 + 떨어진 별. width = PNG 폭(픽셀)"""
    sub = sub or SUB
    g = geometry(sub); x0, y0, x1, y1 = DECO_BOX(g) if deco else g['box']
    k = width / (x1 - x0); W, H = width, round((y1 - y0) * k)
    ox, oy = -x0, -y0
    P = lambda x, y: ((x + ox) * k, (y + oy) * k)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if deco: im.alpha_composite(ornament(g, W, H, k, ox, oy))
    ma = fill_mask(polygons(MAIN, g['a']), W, H, k, ox, oy)
    mc = fill_mask(polygons(sub, g['c']), W, H, k, ox, oy)
    # 뒤에 번지는 잔불 — 글자 모양 그대로 흐리게
    glow = Image.new('RGBA', (W, H), (255, 120, 40, 0)); glow.putalpha(ma.point(lambda v: v * .55))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(k * 9)))
    # 옆면 — 글자를 DEPTH 만큼 아래로 밀어 쌓는다(위는 짙은 잔불 → 아래는 그을음)
    dp = max(2, round(DEPTH * k)); side = Image.new('L', (W, H), 0)
    for i in range(1, dp + 1): side = ImageChops.lighter(side, ma.transform(ma.size, Image.AFFINE, (1, 0, 0, 0, 1, -i)))
    solid = ImageChops.lighter(side, ma)
    # 어두운 윤곽 — 앞면과 옆면을 한 덩어리로 두른다(밝은 하늘에서도 선다)
    edge = solid.filter(ImageFilter.MaxFilter(max(3, int(k * 3.6) | 1)))
    rim = ImageChops.subtract(edge.filter(ImageFilter.MaxFilter(max(3, int(k * 5.2) | 1))), edge)
    gr = gradient(W, H, [(0, (255, 214, 140)), (1, (196, 112, 48))], P(0, -20)[1], P(0, CAP + DEPTH)[1]).convert('RGBA')
    gr.putalpha(rim.point(lambda v: v * .3)); im.alpha_composite(gr)          # 바깥 금테 — 검은 윤곽 둘레의 가는 금줄
    sh = Image.new('RGBA', (W, H), (22, 11, 8, 0)); sh.putalpha(edge.point(lambda v: v * .92))
    im.alpha_composite(sh)
    _, sy0 = P(0, 0); _, sy1 = P(0, CAP + DEPTH)
    sidef = gradient(W, H, [(0, (150, 58, 24)), (.8, (110, 38, 16)), (1, (58, 20, 10))], sy0, sy1).convert('RGBA'); sidef.putalpha(side)
    im.alpha_composite(sidef)
    _, ay0 = P(0, 0); _, ay1 = P(0, CAP)
    fillA = gradient(W, H, EMBER, ay0, ay1).convert('RGBA'); fillA.putalpha(ma)
    im.alpha_composite(fillA)
    # 안쪽 모서리 — 왼쪽 위는 빛, 오른쪽 아래는 그늘(금속을 두드려 세운 듯한 각)
    bv = max(1, round(k * 2.2))
    shift = lambda m, dx, dy: m.transform(m.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy))
    lit = ImageChops.subtract(ma, shift(ma, bv, bv)).filter(ImageFilter.GaussianBlur(k * .5))
    shd = ImageChops.subtract(ma, shift(ma, -bv, -bv)).filter(ImageFilter.GaussianBlur(k * .5))
    for m_, col, a_ in ((lit, (255, 248, 220), .2), (shd, (150, 50, 18), .3)):
        lay = Image.new('RGBA', (W, H), col + (0,)); lay.putalpha(ImageChops.multiply(m_, ma).point(lambda v, a_=a_: v * a_)); im.alpha_composite(lay)
    # 윗모서리 빛 — 글자 윗면 한 줄만 밝게(위로 한 칸 민 마스크와의 차)
    up = ImageChops.subtract(ma, ma.transform(ma.size, Image.AFFINE, (1, 0, 0, 0, 1, max(1, round(k * 1.0)))))
    hl = Image.new('RGBA', (W, H), (255, 252, 236, 0)); hl.putalpha(up.point(lambda v: v * .38))
    im.alpha_composite(hl)
    dc = max(1, round(2.2 * k)); sc = mc
    for i in range(1, dc + 1): sc = ImageChops.lighter(sc, mc.transform(mc.size, Image.AFFINE, (1, 0, 0, 0, 1, -i)))
    shc = Image.new('RGBA', (W, H), (20, 12, 10, 0)); shc.putalpha(sc.filter(ImageFilter.MaxFilter(max(3, int(k * 2.4) | 1))).point(lambda v: v * .85))
    im.alpha_composite(shc)
    sdc = Image.new('RGBA', (W, H), (96, 86, 78, 0)); sdc.putalpha(sc); im.alpha_composite(sdc)
    fc = Image.new('RGBA', (W, H), BONE + (0,)); fc.putalpha(mc); im.alpha_composite(fc)
    # 아랫줄 양옆 금줄 — 바깥 끝에 마름모(책 제목의 장식선)
    d = ImageDraw.Draw(im); ly = P(0, g['lineY'])[1]; th = max(1, round(k * 1.3)); r = 4.2 * k
    GOLD = (236, 176, 92, 235)
    for (a, b), outer in zip(g['lines'], (0, 1)):
        xa, xb = P(a, 0)[0], P(b, 0)[0]
        ex, inn = (xa, xb) if outer == 0 else (xb, xa)
        t0, t1 = th * 1.3, th * .45                                      # 글자 쪽이 굵고 바깥으로 가늘어진다
        d.polygon([(inn, ly - t0 / 2 - k * .8), (ex, ly - t1 / 2 - k * .8), (ex, ly + t1 / 2 + k * .8), (inn, ly + t0 / 2 + k * .8)], fill=(22, 11, 8, 200))
        d.polygon([(inn, ly - t0 / 2), (ex, ly - t1 / 2), (ex, ly + t1 / 2), (inn, ly + t0 / 2)], fill=GOLD)
        d.polygon([(ex - r, ly), (ex, ly - r), (ex + r, ly), (ex, ly + r)], fill=(22, 11, 8, 255))
        d.polygon([(ex - r * .7, ly), (ex, ly - r * .7), (ex + r * .7, ly), (ex, ly + r * .7)], fill=(255, 214, 128, 255))
        dx = (-1 if outer == 0 else 1) * r * 2.1; rr = r * .38                 # 마름모 바깥의 작은 점
        d.ellipse([ex + dx - rr - k * .6, ly - rr - k * .6, ex + dx + rr + k * .6, ly + rr + k * .6], fill=(22, 11, 8, 255))
        d.ellipse([ex + dx - rr, ly - rr, ex + dx + rr, ly + rr], fill=(236, 176, 92, 255))
    # 불티 — 글자 위로 떠오르는 잔불(위로 갈수록 작고 옅다). 씨앗 고정
    ember = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ed = ImageDraw.Draw(ember); rnd = random.Random(5)
    for _ in range(44):
        u = rnd.random(); x = P(g['wA'] * (.03 + .94 * rnd.random()), 0)[0]
        y = P(0, CAP * (.12 - u * .75))[1]; r = k * (1.9 - u * 1.2) * (.6 + rnd.random() * .6)
        a = int(255 * (1 - u * .8) * (.6 + rnd.random() * .4))
        if r <= .3 or a < 20: continue
        col = rnd.choice([(255, 224, 150), (255, 186, 96), (255, 244, 210)])
        ed.ellipse([x - r, y - r, x + r, y + r], fill=col + (a,))
    off = ImageChops.invert(solid.filter(ImageFilter.MaxFilter(max(3, int(k * 6) | 1))))       # 글자 면 · 윤곽 위에는 안 놓는다(얼룩처럼 보였다)
    ember.putalpha(ImageChops.multiply(ember.getchannel('A'), off))
    halo = ember.filter(ImageFilter.GaussianBlur(k * 1.6))
    im.alpha_composite(halo); im.alpha_composite(halo); im.alpha_composite(ember)
    if not with_star: return im.crop(im.getbbox()) if crop else im
    # 떨어진 별과 꼬리
    sx, sy = P(*g['star']); tx, ty = P(*g['tail'])
    tail = Image.new('RGBA', (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(tail); n = int(math.hypot(tx - sx, ty - sy))
    for i in range(n):
        t = i / n; x = sx + (tx - sx) * t; y = sy + (ty - sy) * t; w = max(.6, k * 1.9 * (1 - t))
        td.ellipse([x - w, y - w, x + w, y + w], fill=(255, 226, 160, int(235 * (1 - t) ** 1.7)))
    im.alpha_composite(tail.filter(ImageFilter.GaussianBlur(max(.5, k * .4))))
    st = star(int(k * 42) | 1); im.alpha_composite(st, (int(sx - st.width / 2), int(sy - st.height / 2)))
    return im.crop(im.getbbox()) if crop else im


def write_site_logo(width=1440):
    """사이트 홈 히어로 — 게임과 **같은 그림**(별 없는 몸 + 별까지 다 있는 판, 같은 자르기 상자)과 별 · 꼬리 자리를
    <!-- wordmark --> 자리에 끼운다. 별똥별이 떨어져 앉는 움직임은 site/hero.js 가 그 자리 위에 그린다"""
    full = logo(width, crop=False, deco=True); bb = full.getbbox()
    body = logo(width, with_star=False, crop=False, deco=True).crop(bb); full = full.crop(bb)
    full.save(os.path.join(ROOT, 'site', 'wordmark.png'), optimize=True)
    body.save(os.path.join(ROOT, 'site', 'wordmark-body.png'), optimize=True)
    g = geometry(); x0, y0, x1, y1 = DECO_BOX(g); k = width / (x1 - x0)
    fx = lambda x: ((x - x0) * k - bb[0]) / full.width
    fy = lambda y: ((y - y0) * k - bb[1]) / full.height
    (sx, sy), (tx, ty) = g['star'], g['tail']
    f = lambda v: f'{v:.4f}'
    html = (f'<div class="wordmark" data-star="{f(fx(sx))},{f(fy(sy))}" data-tail="{f(fx(tx))},{f(fy(ty))}" '
            f'data-arm="{f(21 * k / full.width)}">'
            f'<img class="wm-body" src="../wordmark-body.png?v=dev" width="{full.width}" height="{full.height}" alt="Ashfall Chronicles">'
            f'<img class="wm-full" src="../wordmark.png?v=dev" width="{full.width}" height="{full.height}" alt="" aria-hidden="true">'
            '<canvas class="wm-fx" aria-hidden="true"></canvas>'
            '<script>document.currentScript.parentNode.classList.add(\'wm-anim\')</script></div>')
    p = os.path.join(ROOT, 'site', 'home', 'index.html'); t = open(p, encoding='utf-8').read()
    a, b = '<!-- wordmark:start -->', '<!-- wordmark:end -->'
    if a in t:
        i, j = t.index(a) + len(a), t.index(b)
        open(p, 'w', encoding='utf-8').write(t[:i] + html + t[j:])


def favicon(n):
    """n×n 탭 아이콘 — 가운데 별 하나가 오른쪽 위 하늘에서 휘어 내려온 빛 꼬리를 끌고 막 앉은 순간(로고의 떨어진 별).
    별은 칸의 한가운데보다 조금 아래 · 왼쪽, 꼬리는 별 쪽이 굵고 밝다. 작은 칸(16 · 32)은 별 · 꼬리를 키워 뭉개지지 않게 한다"""
    S = 256; small = n <= 32
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    plate = Image.new('L', (S, S), 0); ImageDraw.Draw(plate).rounded_rectangle([4, 4, S - 5, S - 5], radius=56, fill=255)
    bg = gradient(S, S, [(0, (30, 24, 44)), (.6, (22, 15, 22)), (1, (40, 18, 12))], 0, S).convert('RGBA'); bg.putalpha(plate)
    im.alpha_composite(bg)
    cx, cy = 104, 150                                                    # 별이 앉은 자리
    # 별 뒤 잔불 후광
    halo = Image.new('L', (S, S), 0); ImageDraw.Draw(halo).ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=255)
    hl = Image.new('RGBA', (S, S), (255, 150, 60, 0)); hl.putalpha(halo.filter(ImageFilter.GaussianBlur(30)).point(lambda v: v * .55))
    im.alpha_composite(hl)
    # 꼬리 — 오른쪽 위에서 별까지 휘어 내려오는 쐐기(별 쪽이 굵다) + 바깥 번짐
    tail = Image.new('RGBA', (S * 2, S * 2), (0, 0, 0, 0)); td = ImageDraw.Draw(tail)
    p0, p1, p2 = (236, 22), (196, 104), (cx, cy)                        # 2차 곡선 — 떨어지며 휘는 길
    N = 220
    for i in range(N + 1):
        t = i / N; x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]; y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        w = (3 + 20 * t ** 1.3) * (1.3 if small else 1); a = int(255 * min(1, .15 + t ** .7))
        col = lerp((240, 120, 50), (255, 236, 180), t ** 1.5)
        td.ellipse([(x - w) * 2, (y - w) * 2, (x + w) * 2, (y + w) * 2], fill=col + (a,))
    tail = tail.resize((S, S), Image.LANCZOS)
    tg = tail.filter(ImageFilter.GaussianBlur(9)); im.alpha_composite(tg); im.alpha_composite(tg); im.alpha_composite(tail)
    # 꼬리를 따라 떨어진 불티
    for (x, y, r) in ((214, 52, 4), (186, 84, 5), (226, 92, 3.5), (160, 108, 4)):
        g_ = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ImageDraw.Draw(g_).ellipse([x - r, y - r, x + r, y + r], fill=(255, 226, 160, 230))
        im.alpha_composite(g_.filter(ImageFilter.GaussianBlur(1)))
    # 별 — 네 갈래(로고와 같은 그림), 작은 칸에선 더 크게
    st = star(176 if small else 150)
    im.alpha_composite(st, (int(cx - st.width / 2), int(cy - st.height / 2)))
    ring = ImageChops.subtract(plate, plate.filter(ImageFilter.MinFilter(9)))
    gold = Image.new('RGBA', (S, S), (214, 146, 62, 0)); gold.putalpha(ring.point(lambda v: v * .9)); im.alpha_composite(gold)
    im = Image.composite(im, Image.new('RGBA', (S, S), (0, 0, 0, 0)), plate)
    return im.resize((n, n), Image.LANCZOS)


def main():
    os.makedirs(UI, exist_ok=True)
    big = logo(1112); big.save(os.path.join(UI, 'logo.png'))          # 2배로 구워 556px 로 보인다
    title = logo(1440, deco=True); title.save(os.path.join(UI, 'logo_title.png'))   # 타이틀 화면 — 같은 글자 크기에 둘레 장식
    print('title', title.size, 'css width', round(title.width * 556 / big.width))
    small = logo(320, SUB_BOLD); small.save(os.path.join(UI, 'logo_small.png'))
    write_site_logo()
    for n in (16, 32, 48, 180, 512):
        favicon(n).save(os.path.join(UI, f'favicon_{n}.png'))
    ico = favicon(256)
    ico.save(os.path.join(ROOT, 'play', 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    ico.save(os.path.join(ROOT, 'site', 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    print('logo', big.size, 'small', small.size)
    if '--preview' in sys.argv:
        bg = Image.new('RGBA', (big.width + 80, big.height + 80), (14, 12, 18, 255)); bg.alpha_composite(big, (40, 40))
        bg.save('/tmp/logo_preview.png')
        f = Image.new('RGBA', (16 + 32 + 48 + 40, 60), (40, 40, 40, 255)); x = 10
        for n in (16, 32, 48): f.alpha_composite(favicon(n), (x, 6)); x += n + 10
        f.save('/tmp/favicon_preview.png')


if __name__ == '__main__':
    main()
