#!/usr/bin/env python3
"""게임 글꼴 Ashfall 을 **처음부터** 짓는다 — 획 뼈대(tools/font/)를 굵기 있는 획으로 굽고 바깥 모서리를 깎는다 → play/assets/fonts/ashfall-{regular,bold}.woff2

★ 다른 글꼴의 윤곽을 쓰지 않는다(사용자 결정 2026-10-12 — Pretendard 를 고친 판이 아니라, 참고만 한 제 정체성의 글꼴).
  한글은 자모 뼈대(초성 19 · 중성 21 · 종성 27)를 모음 갈래(세로 · 가로 · 섞임) × 받침 유무에 따른 자리 상자에 놓아 음절마다 조립한다(조합형).
  라틴 · 숫자 · 기호도 같은 획 엔진(tools/font/latin.py). 둥근 글자(O · o · 0 · ㅇ)는 팔각으로 — 모든 바깥 모서리는 굵기의 36% 만큼 빗면으로 깎는다.
  그것이 이 글꼴의 얼굴(벼린 쇠 · 깎은 돌)이다. 안쪽(오목) 모서리는 그대로 둬 이음이 단단해 보이게.
★ 줄 높이(1950 / 494) · 한글 폭(1770) · 대문자(1448) · 소문자(1086) · 숫자 고정폭(1220)은 예전 글꼴과 같은 수치 — 창 배치가 흔들리지 않게.
  빠진 글자(드문 기호 · 그림 글자 · 일본어 · 중국어)는 CSS 다음 글꼴로 넘어간다.
필요: fonttools · skia-pathops · brotli
쓰기: python3 tools/mkfont.py            → woff2 두 벌 · OFL.txt · FONTLOG.txt + style.css 의 ?v= + tests/out/font-preview.png
      python3 tools/mkfont.py --check    → 굽는 결과가 커밋된 파일과 같은지(다르면 1)
"""
import glob, hashlib, io, math, os, re, sys
import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import RecordingPen
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'font'))
from latin import L as LATIN
from hangul import CONS, DOUBLE, VERT, HORZ, MIX, CHO, JUNG, JONG, BOX

OUT = os.path.join(ROOT, 'play', 'assets', 'fonts')
CSS = os.path.join(ROOT, 'play', 'css', 'style.css')   # @font-face 의 ?v= 를 파일 해시로 맞춘다(오래 두는 캐시)
FAMILY = 'Ashfall'
VERSION = '2.000'
REPO = 'https://github.com/gshs43-junyeong/Ashfall-Chronicles'
COPYRIGHT = f'Copyright 2026 The Ashfall Chronicles Project Authors ({REPO})'
OFL_DESC = ('This Font Software is licensed under the SIL Open Font License, Version 1.1. '
            'This license is available with a FAQ at: https://openfontlicense.org')
OFL_URL = 'https://openfontlicense.org'
UPM, ASC, DSC, HW = 2048, 1950, 494, 1770
STYLES = {'regular': ('Regular', 400, 150), 'bold': ('Bold', 700, 226)}   # 이름 · 굵기 등급 · 획 굵기(2048 단위)
CHAMFER = 0.36      # 바깥 모서리 깎기 = 획 굵기 × 이 몫


# ---------- 획 → 윤곽 ----------
def seg_quad(a, b, w, ext):
    dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1
    ux, uy = dx / l, dy / l; nx, ny = -uy * w / 2, ux * w / 2
    a2 = (a[0] - ux * ext[0], a[1] - uy * ext[0]); b2 = (b[0] + ux * ext[1], b[1] + uy * ext[1])
    return [(a2[0] + nx, a2[1] + ny), (b2[0] + nx, b2[1] + ny), (b2[0] - nx, b2[1] - ny), (a2[0] - nx, a2[1] - ny)]

def add_poly(path, pts):
    # 반시계로 맞춘다(넓이 부호) — 합칠 때 감김 방향이 섞이지 않게
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if area < 0: pts = pts[::-1]
    pen = path.getPen(); pen.moveTo(pts[0])
    for p in pts[1:]: pen.lineTo(p)
    pen.closePath()

def offset_loop(pts, d):
    """닫힌 볼록 다각형을 d 만큼 바깥(+)·안(−)으로 — 변을 밀고 이웃 변과 만나는 점"""
    n = len(pts)
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    s = 1 if area > 0 else -1
    lines = []
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]; dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1
        nx, ny = dy / l * s, -dx / l * s                     # 바깥 법선
        lines.append(((a[0] + nx * d, a[1] + ny * d), (dx, dy)))
    out = []
    for i in range(n):
        (p1, d1), (p2, d2) = lines[i - 1], lines[i]
        den = d1[0] * d2[1] - d1[1] * d2[0]
        if abs(den) < 1e-9: out.append(p2); continue
        t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den
        out.append((p1[0] + d1[0] * t, p1[1] + d1[1] * t))
    return out

def octagon(cx, cy, rx, ry, k=0.29):
    return [(cx - rx + 2 * rx * k, cy - ry), (cx + rx - 2 * rx * k, cy - ry), (cx + rx, cy - ry + 2 * ry * k), (cx + rx, cy + ry - 2 * ry * k),
            (cx + rx - 2 * rx * k, cy + ry), (cx - rx + 2 * rx * k, cy + ry), (cx - rx, cy + ry - 2 * ry * k), (cx - rx, cy - ry + 2 * ry * k)]

def strokes_to_path(strokes, w):
    """strokes: ('line', pts) · ('loop', pts) · ('fill', pts) — 다 합친다"""
    path = pathops.Path()
    for kind, pts in strokes:
        if kind == 'fill':
            add_poly(path, list(pts))
        elif kind == 'loop':
            outer = offset_loop(pts, w / 2); inner = offset_loop(pts, -w / 2)
            ring = pathops.Path(); add_poly(ring, outer)
            hole = pathops.Path(); add_poly(hole, inner)
            ring = pathops.op(ring, hole, pathops.PathOp.DIFFERENCE)
            path = pathops.op(path, ring, pathops.PathOp.UNION)
        else:
            if len(pts) == 1: pts = [pts[0], (pts[0][0] + 1, pts[0][1])]
            n = len(pts)
            for i in range(n - 1):
                # 끝은 네모 끝(반 굵기 더) · 이음은 서로 반 굵기씩 겹쳐 빈틈이 없게
                add_poly(path, seg_quad(pts[i], pts[i + 1], w, (w / 2, w / 2)))
    return pathops.simplify(path, fix_winding=True)

def contours(path):
    rec = RecordingPen(); path.draw(rec)
    out, cur = [], []
    for op, args in rec.value:
        if op == 'moveTo': cur = [args[0]]
        elif op == 'lineTo': cur.append(args[0])
        elif op in ('qCurveTo', 'curveTo'): cur.append(args[-1])
        elif op in ('closePath', 'endPath'):
            if len(cur) > 2:
                if cur[0] == cur[-1]: cur.pop()
                out.append(cur)
            cur = []
    return out

def chamfer(cs, c):
    """볼록 모서리를 c 만큼 깎는다(빗면) — Ashfall 글꼴의 얼굴. 오목 모서리(이음 안쪽)는 그대로"""
    out = []
    for pts in cs:
        n = len(pts)
        area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
        sgn = 1 if area > 0 else -1
        new = []
        for i in range(n):
            p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
            ax, ay = p1[0] - p0[0], p1[1] - p0[1]; bx, by = p2[0] - p1[0], p2[1] - p1[1]
            la, lb = math.hypot(ax, ay), math.hypot(bx, by)
            if la < 1e-6 or lb < 1e-6: continue
            cross = (ax * by - ay * bx) * sgn
            cosang = (ax * bx + ay * by) / (la * lb)
            turn = math.degrees(math.acos(max(-1, min(1, cosang))))
            if cross > 0 and turn > 50:
                d = min(c, la * 0.42, lb * 0.42)
                new.append((p1[0] - ax / la * d, p1[1] - ay / la * d)); new.append((p1[0] + bx / lb * d, p1[1] + by / lb * d))
            else:
                new.append(p1)
        out.append(new)
    return out

def to_glyph(cs):
    pen = TTGlyphPen(None)
    for pts in cs:
        pts = [(round(x), round(y)) for x, y in pts]
        # TrueType 관례 — 바깥 윤곽은 시계 방향
        pen.moveTo(pts[0])
        for p in pts[1:]: pen.lineTo(p)
        pen.closePath()
    return pen.glyph()

# ---------- 뼈대 → 획 ----------
def place(strokes, box, fit=None):
    x0, y0, x1, y1 = box
    if fit:                                                    # 가로세로 비를 묶는다 — 넓은 받침 칸에서 자음이 납작해지지 않게
        w, h = x1 - x0, y1 - y0
        if w / h > fit: nw = h * fit; x0 += (w - nw) / 2; x1 = x0 + nw
        elif h / w > fit: nh = w * fit; y0 += (h - nh) / 2; y1 = y0 + nh
    W, H = x1 - x0, y1 - y0
    tf = lambda p: (x0 + p[0] * W, y0 + p[1] * H)
    out = []
    for s in strokes:
        if isinstance(s, tuple) and s[0] == 'oct':
            _, cx, cy, r = s; c = tf((cx, cy))
            out.append(('loop', octagon(c[0], c[1], r * W, r * H)))
        elif isinstance(s, tuple) and s[0] == 'loop':
            out.append(('loop', [tf(p) for p in s[1]]))
        else:
            out.append(('line', [tf(p) for p in s]))
    return out

def cons_strokes(j, box, fit, w):
    if j in DOUBLE:
        a, b = DOUBLE[j]; x0, y0, x1, y1 = box; gap = w * 0.55; mid = (x0 + x1) / 2
        return cons_strokes(a, (x0, y0, mid - gap / 2, y1), fit, w) + cons_strokes(b, (mid + gap / 2, y0, x1, y1), fit, w)
    return place(CONS[j], box, fit)

def inset(box, w):
    """획 굵기 반만큼 안으로 — 뼈대가 상자 끝에 닿아도 윤곽은 상자 안"""
    x0, y0, x1, y1 = box; d = w / 2
    return (x0 + d, y0 + d, x1 - d, y1 - d)

def syllable(code, w):
    s = code - 0xAC00; li, vi, ti = s // 588, (s % 588) // 28, s % 28
    l, v, t = CHO[li], JUNG[vi], JONG[ti]
    kind = 'V' if v in VERT else 'H' if v in HORZ else 'M'
    B = BOX[(kind, 1 if t else 0)]
    st = cons_strokes(l, inset(B['L'], w), 1.55, w)
    if kind == 'V': st += place(VERT[v], inset(B['V'], w))
    elif kind == 'H': st += place(HORZ[v], inset(B['H'], w))
    else: h, vv = MIX[v]; st += place(HORZ[h], inset(B['H'], w)) + place(VERT[vv], inset(B['V'], w))
    if t: st += cons_strokes(t, inset(B['T'], w), 1.65, w)
    return st

def jamo(ch, w):
    box = inset((260, 40, 1510, 1420), w)
    if ch in CONS or ch in DOUBLE: return cons_strokes(ch, box, 1.15, w)
    if ch in VERT: return place(VERT[ch], inset((560, -60, 1210, 1520), w))
    if ch in HORZ: return place(HORZ[ch], inset((180, 160, 1590, 1200), w))
    if ch in MIX: h, v = MIX[ch]; return place(HORZ[h], inset((140, 160, 1080, 1000), w)) + place(VERT[v], inset((1080, -60, 1640, 1520), w))
    return None

def latin(ch, w):
    if ch not in LATIN: return None
    adv, strokes = LATIN[ch]
    SB = 40 if ch != ' ' else 20                             # 옆 여백 — 작은 글씨에서 글자가 붙지 않게
    mv = lambda pts: [(x + SB, y) for x, y in pts]
    out = []
    for s in strokes:
        if isinstance(s, tuple) and s[0] == 'loop': out.append(('loop', mv(s[1])))
        elif isinstance(s, tuple) and s[0] == 'fill': out.append(('fill', mv(s[1])))
        else: out.append(('line', mv(s)))
    return adv + SB * 2, out

# 악센트 — 바탕 글자 + 표
MARKS = {'grave': [(-120, 1660), (80, 1500)], 'acute': [(-80, 1500), (120, 1660)], 'circ': [(-170, 1500), (0, 1660), (170, 1500)],
         'tilde': [(-200, 1540), (-80, 1640), (80, 1540), (200, 1640)], 'diaer': None, 'ring': None}
COMP = {'À': 'A grave', 'Á': 'A acute', 'Â': 'A circ', 'Ã': 'A tilde', 'Ä': 'A diaer', 'Å': 'A ring', 'È': 'E grave', 'É': 'E acute',
        'Ê': 'E circ', 'Ë': 'E diaer', 'Ì': 'I grave', 'Í': 'I acute', 'Î': 'I circ', 'Ï': 'I diaer', 'Ñ': 'N tilde', 'Ò': 'O grave',
        'Ó': 'O acute', 'Ô': 'O circ', 'Õ': 'O tilde', 'Ö': 'O diaer', 'Ù': 'U grave', 'Ú': 'U acute', 'Û': 'U circ', 'Ü': 'U diaer',
        'Ý': 'Y acute', 'à': 'a grave', 'á': 'a acute', 'â': 'a circ', 'ã': 'a tilde', 'ä': 'a diaer', 'å': 'a ring', 'è': 'e grave',
        'é': 'e acute', 'ê': 'e circ', 'ë': 'e diaer', 'ì': 'ı grave', 'í': 'ı acute', 'î': 'ı circ', 'ï': 'ı diaer', 'ñ': 'n tilde',
        'ò': 'o grave', 'ó': 'o acute', 'ô': 'o circ', 'õ': 'o tilde', 'ö': 'o diaer', 'ù': 'u grave', 'ú': 'u acute', 'û': 'u circ',
        'ü': 'u diaer', 'ý': 'y acute', 'ÿ': 'y diaer'}

def composed(ch, w):
    base, mark = COMP[ch].split()
    dotless = base == 'ı'
    if dotless: base = 'i'
    adv, strokes = latin(base, w)
    if dotless: strokes = strokes[:1]
    cx = adv / 2
    up = 0 if base.islower() else 420
    if mark == 'diaer':
        ms = [('line', [(cx - 200, 1300 + up), (cx - 200, 1420 + up)]), ('line', [(cx + 200, 1300 + up), (cx + 200, 1420 + up)])]
    elif mark == 'ring':
        ms = [('loop', octagon(cx, 1400 + up, 150, 150))]
    else:
        ms = [('line', [(cx + x, y - 160 + up) for x, y in MARKS[mark]])]
    return adv, strokes + ms

def build_glyph(ch, w, chamf):
    """한 글자 → (너비, 글리프) · 뼈대가 없으면 None"""
    code = ord(ch)
    adv = None; st = None
    if 0xAC00 <= code <= 0xD7A3: adv, st = HW, syllable(code, w)
    elif 0x3131 <= code <= 0x3163:
        st = jamo(ch, w); adv = HW
    elif ch in COMP: adv, st = composed(ch, w)
    else:
        r = latin(ch, w)
        if r: adv, st = r
    if st is None: return None
    path = strokes_to_path(st, w) if st else pathops.Path()
    cs = chamfer(contours(path), chamf) if st else []
    return adv, to_glyph(cs)


def charset():
    """실을 글자 — 한글 KS X 1001 + 게임 글 + 호환 자모 + 뼈대가 있는 라틴 · 기호"""
    u = set(range(0x3131, 0x3164)) | {ord(c) for c in LATIN} | {ord(c) for c in COMP}
    for b1 in range(0xB0, 0xC9):
        for b2 in range(0xA1, 0xFF):
            try:
                u.add(ord(bytes([b1, b2]).decode('euc-kr')))
            except UnicodeDecodeError:
                pass
    files = glob.glob(os.path.join(ROOT, 'src/game/**/*.ts'), recursive=True) \
        + [f for f in glob.glob(os.path.join(ROOT, 'src/game/locales/*.json')) if not f.endswith(('ja.json', 'zh-Hans.json'))] \
        + [os.path.join(ROOT, 'play/index.html')]
    for f in sorted(files):
        for c in open(f, encoding='utf8').read():
            if 0xAC00 <= ord(c) <= 0xD7A3:
                u.add(ord(c))
    return u

def build(style, only=None):
    sub, weight, w = STYLES[style]
    chamf = w * CHAMFER
    glyphs, adv, cmap, order = {'.notdef': TTGlyphPen(None).glyph(), 'space': TTGlyphPen(None).glyph()}, {'.notdef': 1000, 'space': 560}, {32: 'space'}, ['.notdef', 'space']
    for code in sorted(only if only is not None else charset()):
        if code == 32:
            continue
        r = build_glyph(chr(code), w, chamf)
        if not r:
            continue
        a, gl = r
        gn = 'uni%04X' % code
        glyphs[gn] = gl; adv[gn] = a; cmap[code] = gn; order.append(gn)
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    gt = fb.font['glyf']; met = {}
    for gn in order:
        g = gt[gn]; g.recalcBounds(gt)
        met[gn] = (adv[gn], g.xMin if g.numberOfContours else 0)
    fb.setupHorizontalMetrics(met)
    fb.setupHorizontalHeader(ascent=ASC, descent=-DSC)
    ps = f'{FAMILY}-{sub}'
    fb.setupNameTable({'copyright': COPYRIGHT, 'familyName': FAMILY, 'styleName': sub, 'uniqueFontIdentifier': f'{VERSION};ASHF;{ps}',
                       'fullName': f'{FAMILY} {sub}', 'version': f'Version {VERSION}', 'psName': ps, 'manufacturer': 'Ashfall Chronicles Project',
                       'designer': 'Ashfall Chronicles Project', 'vendorURL': REPO, 'licenseDescription': OFL_DESC, 'licenseInfoURL': OFL_URL})
    fb.setupOS2(sTypoAscender=ASC, sTypoDescender=-DSC, sTypoLineGap=0, usWinAscent=ASC, usWinDescent=DSC, sxHeight=1086, sCapHeight=1448,
                usWeightClass=weight, achVendID='ASHF', fsType=0)
    fb.setupPost()
    fb.font['head'].fontRevision = float(VERSION)
    fb.font['head'].created = fb.font['head'].modified = 3870000000      # 두 번 구워도 같은 파일
    return fb.font

def license_files():
    ofl = open(os.path.join(OUT, 'OFL.txt'), encoding='utf8').read()
    body = ofl[ofl.index('This Font Software is licensed'):]
    log = f"""FONTLOG for Ashfall (game font of Ashfall Chronicles)
======================================================

Ashfall is an original typeface made for the game Ashfall Chronicles ({REPO}).
It is licensed under the SIL Open Font License 1.1 (see OFL.txt).

How it is made
- Every glyph is generated by tools/mkfont.py from stroke skeletons in tools/font/
  (no outlines are taken from any other font).
- Hangul syllables are composed from designed jamo: 19 initials, 21 medials and
  27 finals, placed in layout boxes chosen by vowel shape (vertical, horizontal,
  mixed) and by whether there is a final consonant.
- Strokes have a fixed weight per style (Regular 150, Bold 226 of 2048 units).
  Round letters are octagonal, and every outer corner is cut at 36% of the stroke
  weight - the chiselled look of the game's ash-and-iron world. Inner corners stay
  sharp.
- Vertical metrics, the Hangul advance width (1770) and the tabular figures (1220)
  match the game's previous font, so the interface layout does not move.
- Character set: Hangul KS X 1001 (2,350 syllables) plus every syllable used in
  the game text, Hangul compatibility jamo, Basic Latin, the Latin-1 letters used
  in German and Spanish, punctuation, and the symbols the game text uses.

Version {VERSION} (2026-10-12)
- New original design, replacing 1.000 (a modified Pretendard).
"""
    return {'OFL.txt': COPYRIGHT + '\n\n' + body, 'FONTLOG.txt': log}

def _stamp(style, data):
    h = hashlib.sha1(data).hexdigest()[:8]
    css = open(CSS, encoding='utf8').read()
    new = re.sub(r'(ashfall-%s\.woff2\?v=)[0-9a-f]+' % style, r'\g<1>' + h, css)
    if new != css:
        open(CSS, 'w', encoding='utf8').write(new)

def main():
    if '--preview' in sys.argv:
        preview(); return
    check = '--check' in sys.argv
    outs = {}
    for style in STYLES:
        font = build(style)
        font.flavor = 'woff2'
        b = io.BytesIO(); font.save(b, reorderTables=False)
        outs[f'ashfall-{style}.woff2'] = b.getvalue()
    for k, v in license_files().items():
        outs[k] = v.encode('utf8')
    os.makedirs(OUT, exist_ok=True)
    bad = 0
    for name, data in outs.items():
        dst = os.path.join(OUT, name)
        if check:
            if not (os.path.exists(dst) and open(dst, 'rb').read() == data):
                print(f'다름: {os.path.relpath(dst, ROOT)} — python3 tools/mkfont.py'); bad = 1
            continue
        open(dst, 'wb').write(data)
        if name.endswith('.woff2'):
            _stamp(name[len('ashfall-'):-len('.woff2')], data)
            print(f'{os.path.relpath(dst, ROOT)}  {len(data) // 1024} KB')
    if not check:
        preview()
    sys.exit(bad)

def preview():
    """견본 — 큰 글씨 · UI 크기(13 · 16px) · 굵은꼴 → tests/out/font-preview.png"""
    from PIL import Image, ImageDraw, ImageFont
    lines = ['별이 잠든 땅 — 잿빛 숲의 오래된 유적', '곡괭이로 광맥을 캐면 철광석 3개를 얻는다.', '다람쥐 헌 쳇바퀴에 타고파 · 꿇어앉은 닭',
             'Ashfall Chronicles: The Land Where Stars Sleep', 'HP 1,111 / 8,888 · 20,000 · 07:06',
             'Größe · Über · Añadir · ¿Qué? ¡Sí! «Ja» — “Hi” 50% +12 ×3 [Lv.45]']
    need = {ord(c) for ln in lines for c in ln} | set(range(0x20, 0x7F))
    data = {}
    for style in STYLES:
        b = io.BytesIO(); build(style, need).save(b); data[style] = b.getvalue()
    img = Image.new('RGB', (1300, 40 + len(lines) * 196), '#14161c')
    d = ImageDraw.Draw(img); y = 20
    for ln in lines:
        d.text((20, y), ln, font=ImageFont.truetype(io.BytesIO(data['regular']), 34), fill='#e8dcc0')
        d.text((20, y + 48), ln, font=ImageFont.truetype(io.BytesIO(data['bold']), 34), fill='#ffd27a')
        d.text((20, y + 100), ln, font=ImageFont.truetype(io.BytesIO(data['regular']), 13), fill='#e8dcc0')
        d.text((20, y + 122), ln, font=ImageFont.truetype(io.BytesIO(data['regular']), 16), fill='#e8dcc0')
        y += 196
    os.makedirs(os.path.join(ROOT, 'tests', 'out'), exist_ok=True)
    img.save(os.path.join(ROOT, 'tests', 'out', 'font-preview.png'))

if __name__ == '__main__':
    main()
