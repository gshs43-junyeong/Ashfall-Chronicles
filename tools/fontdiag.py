#!/usr/bin/env python3
"""한글 글꼴 짜임 진단 — 음절마다 초성 · 중성 · 종성을 따로 그려 서로 사이의 빈틈을 잰다(겹침 · 닿음 · 너무 좁음).
쓰기: python3 tools/fontdiag.py [--style bold] [--min 0.45] [--sheet tests/out/fontdiag.png] [--chars 갈곬…]
      나쁜 것이 있으면 1 을 돌려준다. 빈틈 기준 = 그 굵기 획 × --min(기본 0.45) — 생성기(mkfont._hits)와 같은 기하 검사(굵힌 획의 겹침).
사연: docs/code-history.md#h190"""
import argparse, io, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import mkfont

def gap(a, b, w, cap):
    """a · b 윤곽 사이 빈틈(단위) — 굵힌 획이 맞닿는 첫 값을 반으로 좁혀 찾는다(겹치면 0)"""
    if not a or not b: return cap
    if mkfont._hits(a, b, w, 0): return 0
    lo, hi = 0.0, cap
    if not mkfont._hits(a, b, w, hi): return cap
    for _ in range(10):
        mid = (lo + hi) / 2
        if mkfont._hits(a, b, w, mid): hi = mid
        else: lo = mid
    return lo

def check(code, style, kmin):
    _, _, w = mkfont.STYLES[style]
    roles = []
    st = mkfont.fit_syllable(code, w, roles)
    parts = {r: [s for s, q in zip(st, roles) if q == r or (r == 'V' and q == 'H')] for r in 'LVT'}
    bad = []
    for a, b in (('L', 'V'), ('L', 'T'), ('V', 'T')):
        if mkfont._hits(parts[a], parts[b], w, w * kmin): bad.append((a + b, round(gap(parts[a], parts[b], w, w))))
    return bad

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--style', default='both'); ap.add_argument('--min', type=float, default=0.45)
    ap.add_argument('--sheet', default=os.path.join(ROOT, 'tests', 'out', 'fontdiag.png')); ap.add_argument('--chars')
    o = ap.parse_args()
    codes = sorted(ord(c) for c in o.chars) if o.chars else sorted(c for c in mkfont.charset() if 0xAC00 <= c <= 0xD7A3)
    styles = ['regular', 'bold'] if o.style == 'both' else [o.style]
    found = []
    for style in styles:
        for c in codes:
            b = check(c, style, o.min)
            if b: found.append((style, chr(c), b))
    by = {}
    for style, ch, b in found:
        for pair, d in b: by.setdefault((style, pair), []).append(ch)
    print(f'{len(codes)}자 × {len(styles)}벌 — 빈틈 기준 획 × {o.min}')
    for (style, pair), chs in sorted(by.items()):
        print(f'  {style:7} {pair}: {len(chs):4}  {"".join(chs[:60])}{" …" if len(chs) > 60 else ""}')
    if found and o.sheet:
        sheet(sorted({ch for _, ch, _ in found})[:120], o.sheet)
        print('견본:', os.path.relpath(o.sheet, ROOT))
    sys.exit(1 if found else 0)

def sheet(chs, path):
    from PIL import ImageFont
    need = {ord(c) for c in chs}
    fonts = {}
    for st in ('regular', 'bold'):
        b = io.BytesIO(); mkfont.build(st, need).save(b); fonts[st] = ImageFont.truetype(io.BytesIO(b.getvalue()), 64)
    per = 20; rows = (len(chs) + per - 1) // per
    img = Image.new('RGB', (per * 72 + 20, rows * 160 + 20), '#14161c'); d = ImageDraw.Draw(img)
    for i, ch in enumerate(chs):
        x, y = 10 + (i % per) * 72, 10 + (i // per) * 160
        d.text((x, y), ch, font=fonts['regular'], fill='#e8dcc0'); d.text((x, y + 74), ch, font=fonts['bold'], fill='#ffd27a')
    os.makedirs(os.path.dirname(path), exist_ok=True); img.save(path)

if __name__ == '__main__':
    main()
