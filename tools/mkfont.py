#!/usr/bin/env python3
"""게임 글꼴 Ashfall 을 굽는다 — Pretendard(SIL OFL 1.1)에서 갈라 낸 글꼴 → play/assets/fonts/ashfall-{regular,bold}.woff2

★ 원본 Pretendard 는 **예약 글꼴 이름(Reserved Font Name) 'Pretendard'** 가 걸려 있다 — 고친 판은 그 이름을 쓰면 안 된다(OFL 3조).
  그래서 이름표(name)와 CFF 안 이름을 전부 'Ashfall' 로 바꾸고, 저작권 줄에는 원작자 줄을 그대로 두고 우리 줄을 더한다.
  글꼴 안 저작권(name 0)과 play/assets/fonts/OFL.txt 첫 줄들이 같아야 한다(OFL 배포 관례) — COPYRIGHT 하나에서 둘 다 만든다.
게임에 맞춘 손질(사용자 결정 2026-10-03 — 느낌은 그대로, 디테일만 아주 약간 다르게):
  - 한글 획을 4.5% 가늘게(`HANGUL` — 크기 · 글자 폭은 그대로). UI 크기에서 원본과 갈리는 것은 이것뿐이다.
  - 획 모서리를 살짝 둥글게(`ROUND` — 2048 단위 중 반지름 14, 0.7%). 작은 글씨에선 거의 안 보이고 크게 보면 부드럽다.
  - 라틴 l 은 꼬리 · 대문자 I 는 세리프(Pretendard 대체 글자 cv05 · cv08) — 방 번호 · 이름에서 I · l · 1 이 갈린다.
  - 숫자를 기본으로 고정폭(tnum) — 생명 · 금화 · 시계 숫자가 바뀔 때 글자 폭이 달라 흔들리지 않게.
  - 글자 폭 · 줄 높이는 원본과 같다 — 창 배치가 바뀌지 않게.
  - 한글은 KS X 1001 완성형 2,350자 + 게임 글에 나오는 글자, 라틴 · 기호는 영어 · 독일어 · 스페인어에 쓰는 것.
    빠진 글자(드문 음절 · 일본어 · 중국어)는 CSS 다음 글꼴로 넘어간다 — 다 실으면 한 벌 650KB 라 웹 첫 화면이 늦다.
원본: tools/art/fonts/Pretendard-{Regular,Bold}.otf (Pretendard 1.3.9 — npm 'pretendard' 의 dist/public/static) · 라이선스 OFL-Pretendard.txt

필요: fonttools · brotli (pip install fonttools brotli)
쓰기: python3 tools/mkfont.py            → woff2 두 벌 · OFL.txt · FONTLOG.txt + style.css 의 ?v= + tests/out/font-preview.png
      python3 tools/mkfont.py --check    → 굽는 결과가 커밋된 파일과 같은지(다르면 1)
"""
import glob, hashlib, io, math, os, re, sys
import pathops
from fontTools.misc.bezierTools import splitCubicAtT, calcCubicArcLength
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'art', 'fonts')
OUT = os.path.join(ROOT, 'play', 'assets', 'fonts')
CSS = os.path.join(ROOT, 'play', 'css', 'style.css')   # @font-face 의 ?v= 를 파일 해시로 맞춘다(오래 두는 캐시)
FAMILY = 'Ashfall'
VERSION = '1.000'
STYLES = {'regular': ('Pretendard-Regular.otf', 'Regular', 400), 'bold': ('Pretendard-Bold.otf', 'Bold', 700)}
REPO = 'https://github.com/gshs43-junyeong/Ashfall-Chronicles'
COPYRIGHT = [
    'Copyright (c) 2021, Kil Hyung-jin (https://github.com/orioncactus/pretendard), with Reserved Font Name Pretendard.',
    f'Copyright 2026 The Ashfall Chronicles Project Authors ({REPO})',
]
OFL_DESC = ('This Font Software is licensed under the SIL Open Font License, Version 1.1. '
            'This license is available with a FAQ at: https://openfontlicense.org')
OFL_URL = 'https://openfontlicense.org'
ROUND = 14          # 모서리 둥글림 반지름(2048 단위) — 키우면 둥근 고딕이 되어 원래 느낌과 멀어진다
CORNER = 28         # 이보다 크게 꺾이는 곳(도)만 모서리로 본다 — 곡선 이음매는 건드리지 않게

def charset():
    """실을 글자 — 한글 KS X 1001 + 게임 글(일본어 · 중국어 번역은 기기 글꼴이라 뺀다) + 라틴 · 기호"""
    u = set(range(0x20, 0x7F)) | set(range(0xA0, 0x180)) | set(range(0x2010, 0x2050)) | set(range(0x3131, 0x3164))
    u |= {0x20AC, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2194, 0x21BA, 0x21BB, 0x2212, 0x2715, 0x25A0, 0x25B2,
          0x25B6, 0x25B8, 0x25BC, 0x25C0, 0x25C2, 0x25CF, 0x2605, 0x2606, 0x3000, 0x3001, 0x3002, 0x300C, 0x300D,
          0x300E, 0x300F, 0x3010, 0x3011, 0x301C, 0xFF5E}
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

def default_alternates(font, feats, chars):
    """cmap 의 chars 를 feats(단일 치환 기능)의 대체 글리프로 — 기능을 켜지 않아도 늘 그 모양"""
    gsub = font['GSUB'].table
    alt = {}
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag not in feats:
            continue
        for li in fr.Feature.LookupListIndex:
            for st in gsub.LookupList.Lookup[li].SubTable:
                st = getattr(st, 'ExtSubTable', st)
                for k, v in (getattr(st, 'mapping', None) or {}).items():
                    alt.setdefault(k, v)
    n = 0
    for t in font['cmap'].tables:
        for c in chars:
            g = t.cmap.get(c)
            if g in alt:
                t.cmap[c] = alt[g]; n += 1
    if not n:
        raise SystemExit(f'{feats} 대체 글자를 못 찾았다 — 원본 글꼴이 바뀌었나')

def _segments(rec):
    """RecordingPen 기록 → 닫힌 윤곽마다 [(시작점, 종류, 점들)] (종류 'L' 직선 · 'C' 3차 곡선)"""
    out, cur, start, p = [], None, None, None
    for op, args in rec:
        if op == 'moveTo':
            cur = []; start = p = args[0]
        elif op == 'lineTo':
            cur.append((p, 'L', [args[0]])); p = args[0]
        elif op == 'curveTo':
            cur.append((p, 'C', list(args))); p = args[-1]
        elif op in ('closePath', 'endPath'):
            if p != start:
                cur.append((p, 'L', [start]))
            if cur:
                out.append(cur)
            cur = None
    return out

def _dir(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l = math.hypot(dx, dy)
    return (dx / l, dy / l) if l > 1e-6 else None

def _tangents(seg):
    p0, k, pts = seg
    if k == 'L':
        d = _dir(p0, pts[0]); return d, d
    c1, c2, p3 = pts
    tin = _dir(p0, c1) or _dir(p0, c2) or _dir(p0, p3)
    tout = _dir(c2, p3) or _dir(c1, p3) or _dir(p0, p3)
    return tin, tout

def _length(seg):
    p0, k, pts = seg
    return math.hypot(pts[0][0] - p0[0], pts[0][1] - p0[1]) if k == 'L' else calcCubicArcLength(p0, *pts)

def _trim(seg, head, tail):
    """선분 앞에서 head, 뒤에서 tail 길이만큼 깎는다"""
    p0, k, pts = seg
    L = _length(seg)
    if L < 1e-6:
        return seg
    t0, t1 = head / L, 1 - tail / L
    if k == 'L':
        a, b = p0, pts[0]
        lerp = lambda t: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        return (lerp(t0), 'L', [lerp(t1)])
    c = (p0, *pts)
    if t0 > 0:
        c = splitCubicAtT(*c, t0)[1]
        t1 = (t1 - t0) / (1 - t0)
    if t1 < 1:
        c = splitCubicAtT(*c, t1)[0]
    return (c[0], 'C', list(c[1:]))

def round_corners(rec, r):
    """꺾인 모서리마다 반지름 r 쯤의 곡선을 넣는다 — 이웃 선분 길이의 3할을 넘지 않게"""
    out = []
    for segs in _segments(rec):
        n = len(segs)
        cut = [[0.0, 0.0] for _ in range(n)]     # 선분마다 [앞 깎기, 뒤 깎기]
        corner = [None] * n                       # i 번 선분 끝(= i+1 앞)의 모서리
        for i in range(n):
            a, b = segs[i], segs[(i + 1) % n]
            ta, tb = _tangents(a)[1], _tangents(b)[0]
            if not ta or not tb:
                continue
            ang = math.degrees(math.acos(max(-1, min(1, ta[0] * tb[0] + ta[1] * tb[1]))))
            if ang < CORNER:
                continue
            d = min(r * math.tan(math.radians(ang) / 2) if ang < 170 else r, _length(a) * 0.3, _length(b) * 0.3)
            if d < 1:
                continue
            cut[i][1] = d; cut[(i + 1) % n][0] = d
            corner[i] = (ta, tb, d, ang)
        new = [_trim(segs[i], *cut[i]) if any(cut[i]) else segs[i] for i in range(n)]
        pen = []
        pen.append(('moveTo', (new[0][0],)))
        for i in range(n):
            p0, k, pts = new[i]
            pen.append(('lineTo' if k == 'L' else 'curveTo', tuple(pts)))
            if corner[i]:
                ta, tb, d, ang = corner[i]
                q0 = pts[-1]; q3 = new[(i + 1) % n][0]
                h = 4 / 3 * math.tan(math.radians(ang) / 4) * (d / math.tan(math.radians(ang) / 2) if ang < 170 else d)
                h = min(h, d)
                pen.append(('curveTo', ((q0[0] + ta[0] * h, q0[1] + ta[1] * h), (q3[0] - tb[0] * h, q3[1] - tb[1] * h), q3)))
        pen.append(('closePath', ()))
        out.extend(pen)
    return out

def soften(font, r):
    """모든 글리프의 모서리를 둥글린다(CFF 윤곽을 다시 쓴다 — 힌트는 버린다, 원래 모양에 맞춘 힌트라 어긋난다)"""
    cff = font['CFF '].cff
    top = cff.topDictIndex[0]
    cs = top.CharStrings
    gs = font.getGlyphSet()
    for name in font.getGlyphOrder():
        rec = DecomposingRecordingPen(gs)
        gs[name].draw(rec)
        old = cs[name]
        priv = old.private                       # CID 글꼴이라 Private 는 글리프의 FD 마다 따로
        nominal, default = getattr(priv, 'nominalWidthX', 0), getattr(priv, 'defaultWidthX', 0)
        w = font['hmtx'][name][0]
        pen = T2CharStringPen(None if w == default else w - nominal, None)
        if rec.value:
            for op, args in round_corners(rec.value, r):
                getattr(pen, op)(*args)
        new = pen.getCharString(private=priv, globalSubrs=cff.GlobalSubrs)
        if hasattr(cs, 'charStringsIndex'):
            cs.charStringsIndex[cs.charStrings[name]] = new
        else:
            cs[name] = new
    for fd in (getattr(top, 'FDArray', None) or [top]):
        p = fd.Private
        for k in ('BlueValues', 'OtherBlues', 'FamilyBlues', 'FamilyOtherBlues', 'StdHW', 'StdVW', 'StemSnapH', 'StemSnapV'):
            if k in p.rawDict:
                del p.rawDict[k]
            if hasattr(p, k):
                try: delattr(p, k)
                except AttributeError: pass

HANGUL = {'round': 0, 'thin': 0.045, 'scale': 1.0}   # 한글만 손질 — 사용자 결정(2026-10-03): 획 굵기만 4~5% 가늘게 · 크기 그대로
# (견본: 모서리 둥글기만은 UI 크기에서 차이가 안 보였다 · 굵게 · 작게도 봤다 — tests/out/_fontvar.py)

def _morph(path, d):
    """d > 0 이면 d 만큼 두껍게, d < 0 이면 얇게 — 둥근 이음(모서리가 둥글어진다)"""
    s = pathops.Path(); path.draw(s.getPen())
    s.stroke(abs(d) * 2, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    s.convertConicsToQuads()            # 둥근 이음은 원뿔 곡선(conic)으로 나온다 — 글꼴엔 없는 꼴이라 2차 곡선으로
    return pathops.op(path, s, pathops.PathOp.UNION if d > 0 else pathops.PathOp.DIFFERENCE, fix_winding=True)

def _stem(font):
    """한글 세로 획 굵기 — 호환 자모 ㅣ 의 폭"""
    gs = font.getGlyphSet(); rec = DecomposingRecordingPen(gs); gs[font.getBestCmap()[0x3163]].draw(rec)
    xs = [p[0] for _, args in rec.value for p in args]
    return max(xs) - min(xs)

def hangul_style(font, round_r=0, bold=0, scale=1.0):
    """한글(완성형 · 호환 자모) 글리프만 — 깎았다 되살려 볼록 모서리를 반지름 round_r 로 둥글게(굵기는 그대로),
       bold 만큼 굵게, scale 로 크기(글자 폭 · 줄 높이는 그대로 — 가운데 기준)."""
    if not (round_r or bold or scale != 1.0):
        return
    cmap = font.getBestCmap()
    names = {g for c, g in cmap.items() if 0xAC00 <= c <= 0xD7A3 or 0x3131 <= c <= 0x318E}
    cff = font['CFF '].cff
    cs = cff.topDictIndex[0].CharStrings
    gs = font.getGlyphSet()
    up = font['head'].unitsPerEm
    for name in names:
        path = pathops.Path(); gs[name].draw(path.getPen())
        if scale != 1.0:
            w = font['hmtx'][name][0]
            cx, cy = w / 2, up * 0.36
            rec = DecomposingRecordingPen(gs); path.draw(rec)
            path = pathops.Path(); pen = path.getPen()
            tf = lambda p: (cx + (p[0] - cx) * scale, cy + (p[1] - cy) * scale)
            for op, args in rec.value:
                getattr(pen, op)(*[tf(a) for a in args])
        if round_r:
            path = _morph(_morph(path, -round_r), round_r)
        if bold:
            path = _morph(path, bold)
        old = cs[name]; priv = old.private
        nominal, default = getattr(priv, 'nominalWidthX', 0), getattr(priv, 'defaultWidthX', 0)
        w = font['hmtx'][name][0]
        pen = T2CharStringPen(None if w == default else w - nominal, None)
        path.draw(pen)
        new = pen.getCharString(private=priv, globalSubrs=cff.GlobalSubrs)
        if hasattr(cs, 'charStringsIndex'):
            cs.charStringsIndex[cs.charStrings[name]] = new
        else:
            cs[name] = new

def rename(font, sub, weight):
    """이름 바꾸기 — 'Pretendard' 가 이름 칸 어디에도 남지 않게(예약 글꼴 이름). 원작자 이름은 저작권 · 디자이너 칸에만."""
    ps = f'{FAMILY}-{sub}'
    names = {0: ' '.join(COPYRIGHT), 1: FAMILY, 2: sub, 3: f'{VERSION};ASHF;{ps}', 4: f'{FAMILY} {sub}',
             5: f'Version {VERSION}; modified from Pretendard 1.309', 6: ps, 8: 'Ashfall Chronicles Project',
             9: 'Kil Hyung-jin (Pretendard); Ashfall Chronicles Project (modifications)', 11: REPO,
             13: OFL_DESC, 14: OFL_URL, 16: FAMILY, 17: sub}
    nt = font['name']
    nt.names = [n for n in nt.names if n.nameID not in names and n.nameID > 255]
    for nid, v in names.items():
        nt.setName(v, nid, 3, 1, 0x409)
        nt.setName(v, nid, 1, 0, 0)
    cff = font['CFF '].cff
    cff.fontNames = [ps]
    top = cff.topDictIndex[0]
    top.FullName = f'{FAMILY} {sub}'; top.FamilyName = FAMILY; top.Weight = sub
    top.Notice = ' '.join(COPYRIGHT)
    if hasattr(top, 'Copyright'):
        top.Copyright = ' '.join(COPYRIGHT)
    font['OS/2'].achVendID = 'ASHF'
    font['OS/2'].usWeightClass = weight
    font['head'].fontRevision = float(VERSION)

def build(style, only=None):
    fn, sub, weight = STYLES[style]
    font = TTFont(os.path.join(SRC, fn), recalcTimestamp=False)   # 시각을 원본 그대로 — 두 번 구워도 같은 파일
    stem = _stem(font)                     # 줄이기 전에 잰다(견본처럼 ㅣ 가 빠진 묶음도 있다)
    default_alternates(font, ('tnum',), range(0x30, 0x3A))
    default_alternates(font, ('cv05', 'cv08'), (ord('l'), ord('I')))
    opts = subset.Options()
    opts.desubroutinize = True             # 윤곽을 다시 쓰므로 공유 조각(subr)을 풀어 둔다
    opts.layout_features = ['*']
    opts.name_IDs = ['*']; opts.name_languages = ['*']; opts.notdef_outline = True
    opts.drop_tables += ['DSIG']
    s = subset.Subsetter(opts)
    s.populate(unicodes=only if only is not None else charset())
    s.subset(font)
    soften(font, ROUND)
    hangul_style(font, HANGUL['round'], -HANGUL['thin'] * stem / 2, HANGUL['scale'])
    rename(font, sub, weight)
    return font

def license_files():
    ofl = open(os.path.join(SRC, 'OFL-Pretendard.txt'), encoding='utf8').read()
    body = ofl[ofl.index('This Font Software is licensed'):]
    head = COPYRIGHT[0].replace(', with Reserved', ',\nwith Reserved') + '\n' + COPYRIGHT[1] + '\n\n'
    log = f"""FONTLOG for Ashfall (game font of Ashfall Chronicles)
======================================================

Ashfall is a modified version of Pretendard 1.3.9 (Regular, Bold) by Kil Hyung-jin,
made for the game Ashfall Chronicles ({REPO}).
It is licensed under the SIL Open Font License 1.1 (see OFL.txt). Pretendard is
distributed with the Reserved Font Name "Pretendard", so this modified version is
named "Ashfall" and does not use the reserved name.

Changes from Pretendard
- Renamed to "Ashfall" (name table and CFF names).
- Corners of every glyph are slightly rounded (radius 14 of 2048 units); outlines are
  rewritten without hints.
- Hangul strokes are 4.5% thinner (outlines eroded evenly); glyph size and advance
  widths are unchanged.
- Lowercase l with a tail and capital I with serifs by default (Pretendard's cv05 and
  cv08 glyphs mapped in cmap), so I, l and 1 are easy to tell apart.
- Figures 0-9 are tabular by default (the 'tnum' glyphs are mapped in cmap), so
  numbers in the game HUD keep their width while they change.
- Subset: Hangul KS X 1001 (2,350 syllables) plus every Hangul syllable used in the
  game text, Hangul compatibility jamo, Latin-1, Latin Extended-A, general
  punctuation and a few symbols. OpenType layout features are kept.
- Built by tools/mkfont.py in the repository above.

Version {VERSION} (2026-10-03)
- First release.

Acknowledgements
- Pretendard: Kil Hyung-jin, https://github.com/orioncactus/pretendard
  (Pretendard is based on Inter, Source Han Sans and M PLUS 1p, all SIL OFL 1.1.)
"""
    return {'OFL.txt': head + body, 'FONTLOG.txt': log}

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
    """견본 — 줄마다 원본 Pretendard(파랑) 다음 Ashfall(노랑) → tests/out/font-preview.png"""
    from PIL import Image, ImageDraw, ImageFont
    lines = ['별이 잠든 땅 — 잿빛 숲의 오래된 유적', '곡괭이로 광맥을 캐면 철광석 3개를 얻는다.', '다람쥐 헌 쳇바퀴에 타고파',
             'Ashfall Chronicles: The Land Where Stars Sleep', 'HP 1,111 / 8,888 · 20,000 · 07:06',
             'Größe · Über · Añadir · ¿Qué? ¡Sí! «Ja» — “Hi” 50% +12 x3 [Lv.45]']
    img = Image.new('RGB', (1300, 40 + len(lines) * 2 * 96), '#14161c')
    d = ImageDraw.Draw(img)
    y = 20
    for style in STYLES:
        f = build(style, {ord(c) for ln in lines for c in ln} | set(range(0x20, 0x7F)))
        b = io.BytesIO(); f.save(b); b.seek(0)
        mine = ImageFont.truetype(b, 34)
        orig = ImageFont.truetype(os.path.join(SRC, STYLES[style][0]), 34)
        for ln in lines:
            d.text((20, y), ln, font=orig, fill='#7fa7d8'); d.text((20, y + 44), ln, font=mine, fill='#e8dcc0'); y += 96
    os.makedirs(os.path.join(ROOT, 'tests', 'out'), exist_ok=True)
    img.save(os.path.join(ROOT, 'tests', 'out', 'font-preview.png'))

if __name__ == '__main__':
    main()
