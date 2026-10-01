#!/usr/bin/env python3
"""타이틀 로고 · 파비콘을 굽는다 — 글꼴 윤곽(tools/art/fonts, SIL OFL)을 그림·경로로 구워 게임·사이트는 글꼴 파일이 없다.

  python3 tools/mklogo.py            # play/assets/ui/logo.png · logo_small.png · favicon*.png · site/favicon.ico
  python3 tools/mklogo.py --preview  # 위 + /tmp 에 어두운 바탕 미리보기

로고 = 'ASHFALL' (Cinzel Black — 첫 A · 끝 L 이 큰 제목 글자, 위는 밝은 금 → 아래 잿불 주황, 아래로 민 두께와 검은 윤곽)
     + 'CHRONICLES' (Cinzel Bold, 넓게 벌려 양옆 마름모로 끝나는 금줄)
     + 'A' 의 꼭짓점에 앉은 별 하나와 오른쪽 위 하늘로 난 꼬리(게임의 시작 — 떨어진 별).
사이트 홈 히어로는 같은 윤곽을 SVG 로 받아 색을 뒤집는다(별빛 글자 · 잔불 아랫줄 — site/style.css .wordmark).
파비콘 = 네 갈래 별(별 조각) — 16px 에서도 읽히게 칸을 손으로 찍었다.
★ 게임 폴더의 로고를 이 도구에 다시 먹이지 말 것 — 원본은 글꼴 윤곽이다."""
import os, sys, math, random
from PIL import Image, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
UI = os.path.join(ROOT, 'play', 'assets', 'ui')

# ---- 글자 윤곽 — tools/art/fonts 의 OFL 글꼴(Cinzel Black · Bold)에서 뽑는다 ----
# 로고는 글꼴을 싣지 않는다: 윤곽을 PNG(게임) · SVG 경로(사이트)로 구워 넣으므로 게임·사이트 어디에도 글꼴 파일이 없다.
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import ImageChops, ImageDraw

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


def svg_path(font, glyphs):
    gs = font.getGlyphSet(); pen = SVGPathPen(gs, lambda v: f'{v:.1f}'.rstrip('0').rstrip('.'))
    for g, m in glyphs: gs[g].draw(TransformPen(pen, m))
    return pen.getCommands()


def polygons(font, glyphs):
    gs = font.getGlyphSet(); out = []
    for g, m in glyphs:
        fp = FlatPen(gs); gs[g].draw(TransformPen(fp, m)); out += fp.polys
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
    star_c = (apex[0] - 3, -BIG[0] * CAP + CAP - 30)
    tail = (star_c[0] + wA * 0.58, star_c[1] - wA * 0.07)
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


EMBER = [(0, (255, 244, 206)), (.38, (255, 204, 110)), (.72, (240, 128, 56)), (1, (186, 66, 28))]
BONE = (234, 224, 206)


def logo(width, sub=None):
    """게임 타이틀 로고 — 잔불빛 글자 + 잿빛 아랫줄 + 떨어진 별. width = PNG 폭(픽셀)"""
    sub = sub or SUB
    g = geometry(sub); x0, y0, x1, y1 = g['box']
    k = width / (x1 - x0); W, H = width, round((y1 - y0) * k)
    ox, oy = -x0, -y0
    P = lambda x, y: ((x + ox) * k, (y + oy) * k)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
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
    sh = Image.new('RGBA', (W, H), (22, 11, 8, 0)); sh.putalpha(edge.point(lambda v: v * .92))
    im.alpha_composite(sh)
    _, sy0 = P(0, 0); _, sy1 = P(0, CAP + DEPTH)
    sidef = gradient(W, H, [(0, (150, 58, 24)), (.8, (110, 38, 16)), (1, (58, 20, 10))], sy0, sy1).convert('RGBA'); sidef.putalpha(side)
    im.alpha_composite(sidef)
    _, ay0 = P(0, 0); _, ay1 = P(0, CAP)
    fillA = gradient(W, H, EMBER, ay0, ay1).convert('RGBA'); fillA.putalpha(ma)
    im.alpha_composite(fillA)
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
        d.rectangle([xa, ly - th / 2, xb, ly + th / 2], fill=GOLD)
        ex = xa if outer == 0 else xb
        d.polygon([(ex - r, ly), (ex, ly - r), (ex + r, ly), (ex, ly + r)], fill=(22, 11, 8, 255))
        d.polygon([(ex - r * .7, ly), (ex, ly - r * .7), (ex + r * .7, ly), (ex, ly + r * .7)], fill=(255, 214, 128, 255))
    # 떨어진 별과 꼬리
    sx, sy = P(*g['star']); tx, ty = P(*g['tail'])
    tail = Image.new('RGBA', (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(tail); n = int(math.hypot(tx - sx, ty - sy))
    for i in range(n):
        t = i / n; x = sx + (tx - sx) * t; y = sy + (ty - sy) * t; w = max(.6, k * 1.9 * (1 - t))
        td.ellipse([x - w, y - w, x + w, y + w], fill=(255, 226, 160, int(235 * (1 - t) ** 1.7)))
    im.alpha_composite(tail.filter(ImageFilter.GaussianBlur(max(.5, k * .4))))
    st = star(int(k * 42) | 1); im.alpha_composite(st, (int(sx - st.width / 2), int(sy - st.height / 2)))
    return im.crop(im.getbbox())


def svg_wordmark(uid='wm'):
    """사이트용 SVG — 같은 윤곽을 벡터 그대로. 색과 움직임은 사이트 CSS 가 입힌다(클래스만 단다)"""
    g = geometry(); x0, y0, x1, y1 = g['box']
    (a0, a1), (b0, b1) = g['lines']; ly = g['lineY']; sx, sy = g['star']; tx, ty = g['tail']
    f = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
    return (f'<svg class="wordmark" viewBox="{f(x0)} {f(y0)} {f(x1 - x0)} {f(y1 - y0)}" role="img" aria-label="Ashfall Chronicles">'
            f'<defs><linearGradient id="{uid}-a" x1="0" y1="0" x2="0" y2="{CAP}" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" class="wm-a0"/><stop offset=".55" class="wm-a1"/><stop offset="1" class="wm-a2"/></linearGradient>'
            f'<linearGradient id="{uid}-l" x1="0" x2="1"><stop offset="0" class="wm-l0"/><stop offset="1" class="wm-l1"/></linearGradient>'
            f'<linearGradient id="{uid}-r" x1="1" x2="0"><stop offset="0" class="wm-l0"/><stop offset="1" class="wm-l1"/></linearGradient>'
            f'<linearGradient id="{uid}-t" x1="{f(sx)}" y1="{f(sy)}" x2="{f(tx)}" y2="{f(ty)}" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" class="wm-t0"/><stop offset="1" class="wm-t1"/></linearGradient>'
            f'<path id="{uid}-g" d="{svg_path(MAIN, g["a"])}"/><path id="{uid}-s" d="{svg_path(SUB, g["c"])}"/></defs>'
            f'<path class="wm-tail" d="M{f(tx)} {f(ty)}L{f(sx)} {f(sy)}" pathLength="1" stroke="url(#{uid}-t)"/>'
            + '<g class="wm-depth">' + ''.join(f'<use href="#{uid}-g" y="{i}"/>' for i in range(DEPTH, 0, -1)) + '</g>'
            + f'<use class="wm-main" href="#{uid}-g" fill="url(#{uid}-a)"/>'
            + '<g class="wm-subdepth">' + ''.join(f'<use href="#{uid}-s" y="{i}"/>' for i in (2, 1)) + '</g>' +
            f'<rect class="wm-line" x="{f(a0)}" y="{f(ly - .7)}" width="{f(a1 - a0)}" height="1.4"/>'
            f'<rect class="wm-line" x="{f(b0)}" y="{f(ly - .7)}" width="{f(b1 - b0)}" height="1.4"/>'
            + ''.join(f'<path class="wm-gem" d="M{f(ex - 3.2)} {f(ly)}L{f(ex)} {f(ly - 3.2)}L{f(ex + 3.2)} {f(ly)}L{f(ex)} {f(ly + 3.2)}Z"/>' for ex in (a0, b1)) +
            f'<use class="wm-sub" href="#{uid}-s"/>'
            f'<g class="wm-star" transform="translate({f(sx)} {f(sy)})"><path d="M0 -15L2.2 -2.2L15 0L2.2 2.2L0 15L-2.2 2.2L-15 0L-2.2 -2.2Z"/>'
            f'<circle r="3.2"/></g></svg>')


def write_site_svg():
    """사이트 홈 히어로의 <!-- wordmark --> 자리에 SVG 를 끼운다(사이트는 글꼴 없이 벡터로 그린다)"""
    p = os.path.join(ROOT, 'site', 'home', 'index.html'); t = open(p, encoding='utf-8').read()
    a, b = '<!-- wordmark:start -->', '<!-- wordmark:end -->'
    if a in t:
        i, j = t.index(a) + len(a), t.index(b)
        open(p, 'w', encoding='utf-8').write(t[:i] + svg_wordmark() + t[j:])


def favicon(n):
    """n×n 파비콘 — 어두운 둥근 판 · 금빛 테 · 판을 꽉 채운 네 갈래 별(16px 에서도 별로 읽힌다)"""
    S = 128
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); P = im.load()
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - 63.5, y - 63.5)
            if d <= 63: P[x, y] = (214, 146, 62, 255) if d > 57 else lerp((52, 36, 50), (18, 13, 20), y / S) + (255,)
    im.alpha_composite(star(122), (3, 3))
    return im.resize((n, n), Image.LANCZOS)


def main():
    os.makedirs(UI, exist_ok=True)
    big = logo(1112); big.save(os.path.join(UI, 'logo.png'))          # 2배로 구워 556px 로 보인다
    small = logo(320, SUB_BOLD); small.save(os.path.join(UI, 'logo_small.png'))
    write_site_svg()
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
