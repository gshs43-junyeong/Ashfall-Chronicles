#!/usr/bin/env python3
"""게임 글꼴 Ashfall 을 **처음부터** 짓는다 — 획 뼈대(tools/font/)를 굵기 있는 획으로 굽고 바깥 모서리를 깎는다 → play/assets/fonts/ashfall-{regular,bold}.woff2

★ 다른 글꼴의 윤곽을 쓰지 않는다(사용자 결정 2026-10-12 — Pretendard 를 고친 판이 아니라, 참고만 한 제 정체성의 글꼴).
  한글은 자모 뼈대(초성 19 · 중성 21 · 종성 27)를 모음마다 · 받침 높이마다 정한 자리에 놓아 음절마다 조립한다(조합형).
  자리(어디에 · 얼마나 크게)는 시중 고딕(Pretendard, OFL)의 자모 상자를 재어 맞췄다 — 윤곽은 가져오지 않는다(tools/font/hangul.py).
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
from hangul import CONS, CONS_V, DOUBLE, VV, HV, MV, CHO, JUNG, JONG, LV, L_ADJ, T_V, T_H, T_SHIFT

OUT = os.path.join(ROOT, 'play', 'assets', 'fonts')
CSS = os.path.join(ROOT, 'play', 'css', 'style.css')   # @font-face 의 ?v= 를 파일 해시로 맞춘다(오래 두는 캐시)
FAMILY = 'Ashfall'
VERSION = '2.200'
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

def strokes_to_path(strokes, w0):
    """strokes: ('line', pts[, w]) · ('loop', pts[, w]) · ('fill', pts) — 다 합친다(셋째 칸이 있으면 그 획만의 굵기)"""
    path = pathops.Path()
    for s in strokes:
        kind, pts = s[0], s[1]; w = s[2] if len(s) > 2 else w0
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
            n = len(pts); wh = s[3] if len(s) > 3 else w
            # 가로 마디만 wh(좁은 자리에서 가늘게) — 시중 고딕처럼 세로는 굵기를 지킨다
            ws = [wh if abs(pts[i + 1][1] - pts[i][1]) < 1e-6 * (1 + abs(pts[i + 1][0] - pts[i][0])) + 0.5 else w for i in range(n - 1)]
            for i in range(n - 1):
                # 끝은 네모 끝(반 굵기 더) · 이음은 이웃 마디 굵기의 반만큼 겹친다 — 굵기가 다르면 굵은 쪽이 바깥으로 삐져나오지 않게
                e0 = ws[i - 1] / 2 if i > 0 else ws[i] / 2
                e1 = ws[i + 1] / 2 if i < n - 2 else ws[i] / 2
                add_poly(path, seg_quad(pts[i], pts[i + 1], ws[i], (e0, e1)))
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
def place(strokes, box, w=None):
    x0, y0, x1, y1 = box
    W, H = x1 - x0, y1 - y0
    tf = lambda p: (x0 + p[0] * W, y0 + p[1] * H)
    out = []
    ex = (w,) if not isinstance(w, tuple) and w is not None else (tuple(w) if w is not None else ())
    for s in strokes:
        if isinstance(s, tuple) and s[0] == 'oct':
            _, cx, cy, rx, ry = s; c = tf((cx, cy))
            out.append(('loop', octagon(c[0], c[1], rx * W, ry * H)) + ex)
        elif isinstance(s, tuple) and s[0] == 'loop':
            out.append(('loop', [tf(p) for p in s[1]]) + ex)
        else:
            out.append(('line', [tf(p) for p in s]) + ex)
    return out

COUNTER = 0.7       # 자모 안 속공간(나란한 획 사이 빈 곳)의 최소 = 획 굵기 × 이 몫
THIN = 0.6          # 그래도 모자라면 세로 · 빗획을 이만큼까지 가늘게
THIN_H = 0.45       # 가로획은 더 — 한글 고딕은 원래 가로가 세로보다 가늘다

def _levels(sk, axis):
    """뼈대에서 가로획(axis 1 → y) · 세로획(axis 0 → x)이 놓인 자리들 — 나란한 획 사이 속공간을 재려고"""
    lv = []
    for s in sk:
        if isinstance(s, tuple): continue                       # 고리(ㅇ · ㅁ 의 loop · ㅎ 동그라미)는 제 안이 비어 따로 본다
        for a, b in zip(s, s[1:]):
            if abs(a[axis] - b[axis]) < 0.03 and abs(a[1 - axis] - b[1 - axis]) > 0.3: lv.append(a[axis])
            if axis == 0 and abs(a[0] - b[0]) > 0.2 and abs(a[1] - b[1]) > 0.3:   # 빗획(ㅅ · ㅈ · ㅊ 다리) — 아래 끝끼리 벌어진 만큼이 속공간
                lv.append(min(a, b, key=lambda q: q[1])[0])
    for s in sk:
        if isinstance(s, tuple) and s[0] == 'loop':
            for a, b in zip(s[1], s[1][1:] + s[1][:1]):
                if abs(a[axis] - b[axis]) < 0.03: lv.append(a[axis])
    lv = sorted(set(round(v, 3) for v in lv))
    gaps = [b - a for a, b in zip(lv, lv[1:]) if b - a > 0.05]
    return min(gaps) if gaps else None

def fit_w(sk, box, w):
    """→ (세로 굵기, 가로 굵기)"""
    x0, y0, x1, y1 = box; wv = wh = w
    g = _levels(sk, 1)                                        # 위아래로 쌓인 가로획 — 가로획만 가늘게
    if g: wh = max(w * THIN_H, min(w, g * (y1 - y0) / (1 + COUNTER + g)))
    g = _levels(sk, 0)                                        # 옆으로 늘어선 세로획 · 빗획
    if g: wv = max(w * THIN, min(w, g * (x1 - x0) / (1 + COUNTER + g)))
    return wv, wh

def _fit_w_old(sk, box, w):
    """★ 작은 상자(겹받침 · 받침 위 초성 · 겹자음 반쪽)에 획 셋이 쌓이면 굵은꼴에서 속공간이 막혔다(ㄹ · ㄷ · ㅌ · ㅂ, 사용자 지적).
       나란한 획 사이 빈 곳이 굵기 × COUNTER 보다 좁아지면 그 자모만 획을 가늘게 한다 — 시중 고딕이 복잡한 글자에서 하는 것과 같다.
       속공간 = g × (H − w) − w ≥ k × w  →  w ≤ g × H / (1 + k + g)"""
    x0, y0, x1, y1 = box; lim = w
    for axis, size in ((1, y1 - y0), (0, x1 - x0)):
        g = _levels(sk, axis)
        if g: lim = min(lim, g * size / (1 + COUNTER + g))
    return max(w * THIN, lim)

def inset(box, w):
    """획 굵기 반만큼 안으로 — 뼈대가 상자 끝에 닿아도 윤곽은 상자 안"""
    x0, y0, x1, y1 = box; d = w / 2
    return (x0 + d, y0 + d, x1 - d, y1 - d)

def cons_strokes(j, box, w, form='base'):
    if j in DOUBLE:
        a, b = DOUBLE[j]; x0, y0, x1, y1 = box; gap = w * 0.45; mid = (x0 + x1) / 2
        # ★ 겹기역 · 겹키읔도 두 다리를 같은 꼴로 — 앞 것만 곧은 다리면 '1ㄱ' 처럼 읽혔다(사용자 지적). 반쪽 상자가 따로라 엉키지 않는다
        return cons_strokes(a, (x0, y0, mid - gap / 2, y1), w, form) + cons_strokes(b, (mid + gap / 2, y0, x1, y1), w, form)
    sk = (CONS_V.get(j) if form == 'V' else None) or CONS[j]
    wv, wh = fit_w(sk, box, w)
    x0, y0, x1, y1 = box                                       # 안으로 미는 양 — 옆은 세로 굵기 · 위아래는 가로 굵기의 반
    ib = (x0 + wv / 2, y0 + wh / 2, x1 - wv / 2, y1 - wh / 2)
    return place(sk, ib, None if wv > w - 0.5 and wh > w - 0.5 else (wv, wh))

def adj(box, l, kx, ky):
    """초성마다 상자 크기를 고친다 — 겹자음은 앞 자음 값에 폭을 더한다"""
    base = DOUBLE[l][0] if l in DOUBLE else l
    a = L_ADJ[base]; x0, y0, x1, y1 = box
    x0, y0, x1, y1 = x0 + a[0] * kx, y0 + a[1] * ky, x1 + a[2] * kx, y1 + a[3] * ky
    if l in DOUBLE: x0 -= 40 * kx; x1 += 90 * kx
    return (x0, y0, x1, y1)

def vert_strokes(v, ybr, top, bot, w, stem_x=None, br_from=None):
    """세로 모음 — 줄기(위 top · 아래 bot, 바깥 끝)와 가지(ybr 높이)"""
    spec = VV[v]; h = w / 2; st = list(spec['st'])
    if stem_x is not None: st[0] = stem_x
    out = []
    for i, x in enumerate(st):
        tp, b = top, bot
        if spec.get('short') == i: tp -= 44; b += 92                 # ㅔ 의 앞 줄기는 조금 짧다
        out.append(('line', [(x, tp - h), (x, b + h)]))
    for a, b, dy in spec['br']:
        ax = st[int(a[1])] if isinstance(a, str) else (br_from if br_from is not None else a) + h
        bx = st[int(b[1])] if isinstance(b, str) else b - h
        out.append(('line', [(ax, ybr + dy), (bx, ybr + dy)]))
    return out

def horz_strokes(v, bar_c, x0, x1, reach, w, xs=None):
    """가로 모음 — 막대(바깥 x0~x1)와 짧은 획(위로면 reach 까지 · 아래로면 reach 까지, 바깥 끝)"""
    h = w / 2; kind, sx = HV[v]
    if xs is not None: sx = xs
    out = [('line', [(x0 + h, bar_c), (x1 - h, bar_c)])]
    for x in sx:
        if kind == 'up': out.append(('line', [(x, bar_c), (x, reach - h)]))
        elif kind == 'down': out.append(('line', [(x, bar_c), (x, reach + h)]))
    return out

def tbox(t, table, v):
    x0, y0, x1, y1 = table[t]; dx = T_SHIFT.get(v, (0, 0))
    return (x0 + dx[0], y0, x1 + dx[1], y1)

def syllable(code, w, roles=None, f=None):
    """음절 짜임 — 자리 상자는 모음 갈래(세로 · 가로 · 섞임)와 받침 높이로 정한다. 사연: docs/code-history.md#h187"""
    s = code - 0xAC00; li, vi, ti = s // 588, (s % 588) // 28, s % 28
    l, v, t = CHO[li], JUNG[vi], JONG[ti]
    h = w / 2; st = []
    f = f or {}; F = lambda k: f.get(k, 0)                      # 짜임 고침(fit_syllable) — 초성 아래 · 오른 · 가지 · 줄기 끝 · 받침 위
    def Lfix(b): return (b[0], b[1] + F('lb'), b[2] - F('lr'), b[3])
    def Tfix(b): return (b[0], b[1], b[2], b[3] - F('tt'))
    def add(role, x):                                          # roles — 진단(tools/fontdiag.py)이 자모별로 나눠 본다
        st.extend(x)
        if roles is not None: roles.extend([role] * len(x))
    if v in VV:
        Lb = LV[v]
        if t:
            T = tbox(t, T_V, v); tt = T[3]
            Lb = (Lb[0], max(tt + 170, 620), Lb[2], 1500 + max(0, tt - 520) * 0.25)
            sb = tt - 140 if t == 'ㄴ' else tt + 95               # 니은 받침은 열린 위쪽으로 줄기가 내려간다
        else:
            sb = -162
        ybr = (Lb[1] + Lb[3]) / 2
        add('L', cons_strokes(l, Lfix(adj(Lb, l, 1, 0.6 if t else 1)), w, 'V'))
        bf = (VV[v]['br'][0][0] + F('br')) if F('br') and VV[v]['br'] and not isinstance(VV[v]['br'][0][0], str) else None
        add('V', vert_strokes(v, ybr, 1616, sb + F('sb'), w, br_from=bf))
        if t: add('T', cons_strokes(t, Tfix(T), w))
    elif v in HV:
        up, dn = v in 'ㅗㅛ', v in 'ㅜㅠ'
        if t:
            T = tbox(t, T_H, v); tt = T[3]
            # ★ 초성 높이를 먼저 지킨다 — 막대가 받침에서 멀면 ㄹ · ㅌ · ㅂ 초성이 350 단위 남짓으로 눌려 가로획 셋이 뭉쳤다(롤 · 톨 · 볼)
            if up: bc = tt + 220; Lb = (270, bc + 250, 1500, 1600)
            elif dn: bc = tt + 235; Lb = (278, bc + 205, 1508, 1600)
            else: bc = tt + 230; Lb = (278, bc + 210, 1508, 1600)
            low = tt + 70
        else:
            if up: bc = 135; Lb = (260, 600, 1500, 1440)
            elif dn: bc = 522; Lb = (296, 824, 1490, 1510)
            else: bc = 146; Lb = (280, 630, 1508, 1450)
            low = -156
        L0 = adj(Lb, l, 0.3, 0.3); L = Lfix(L0)                 # 짧은 획은 고치기 전 자리까지 — 초성만 올라가 빈틈이 생긴다
        add('L', cons_strokes(l, L, w))
        xs = [800] if v == 'ㅗ' and (DOUBLE.get(l, l)[-1] in 'ㄱㅋ') else None   # 기역 밑은 왼쪽이 비어 짧은 획이 그리로 간다
        add('H', horz_strokes(v, bc, 72, 1700, L0[1] - 36 if up else low, w, xs=xs))
        if t: add('T', cons_strokes(t, Tfix(T), w))
    else:
        hv, (bx0, bx1), vv, vx = MV[v]
        up, dn = hv == 'ㅗ', hv == 'ㅜ'
        if t:
            T = tbox(t, T_V, v); tt = T[3]
            if up: bc = tt + 220; Lb = (bx0 + 110, bc + 260, bx1 - 110, 1600)
            elif dn: bc = tt + 330; Lb = (bx0 + 180, bc + 195, bx1 - 150, 1610)   # 퀄 · 뤌 — 초성이 317 단위로 눌려 있었다
            else: bc = tt + 220; Lb = (bx0 + 146, bc + 230, bx1 - 144, 1590)
            vb = tt + 30; low = tt + 60
        else:
            if up: bc = 290; Lb = (bx0 + 110, 640, bx1 - 110, 1436)
            elif dn: bc = 655; Lb = (bx0 + 170, 880, bx1 - 140, 1515)
            else: bc = 350; Lb = (bx0 + 146, 736, bx1 - 144, 1442)
            vb = -162; low = -108
        L0 = adj(Lb, l, 0.5, 0.4); L = Lfix(L0)
        k = DOUBLE.get(l, l)[-1] in 'ㄱㅋ'
        cx = Lb[0] + (Lb[2] - Lb[0]) * (0.4 if k else 0.5)
        add('L', cons_strokes(l, L, w))                                # 가로 막대 위라 기역도 곧은 다리
        add('H', horz_strokes(hv, bc, bx0, bx1, L0[1] - 36 if up else low, w, xs=[cx] if hv != 'ㅡ' else []))
        if vv in ('ㅓ', 'ㅔ'):
            ybr = (bc - h + (tt if t else -108)) / 2 + (90 if t else 190)
            add('V', vert_strokes(vv, ybr, 1616, vb + F('sb'), w, br_from=vx + F('br')))
        else:
            ybr = (bc + Lb[3]) / 2 - (0 if t else 100)
            add('V', vert_strokes(vv, ybr, 1616, vb + F('sb'), w, stem_x=vx))
        if t: add('T', cons_strokes(t, Tfix(T), w))
    return st

GAP = 0.5          # 자모 사이 빈틈의 최소 = 획 굵기 × 이 몫
STEP = 16

def _fat(strokes, w, g):
    out = []
    for s in strokes:
        if s[0] == 'fill': out.append(s); continue
        sw = s[2] if len(s) > 2 else w
        out.append((s[0], s[1], sw + 2 * g) + ((s[3] + 2 * g,) if len(s) > 3 else ()))
    return strokes_to_path(out, w)

def _hits(a, b, w, g):
    if not a or not b: return False
    x = pathops.op(_fat(a, w, g), strokes_to_path(b, w), pathops.PathOp.INTERSECTION)
    return bool(contours(x))

def fit_syllable(code, w, roles=None):
    """★ 자모 사이를 벌린다 — 자리 상자만으로는 ㄱ 다리가 ㅓ 가지에(거 · 겠), 초성이 ㅗ ㅜ 막대에(괘 · 교 · 권),
       ㅆ · ㅅ 받침 꼭대기가 줄기 · 초성에(갔 · 깼 · 첫) 닿았다(사용자 지적). 빈틈이 획 × GAP 보다 좁은 짝마다
       그 짝을 맡은 자리를 STEP 씩 민다: 초성↔모음 = 가지 시작을 오른쪽(ㅓ 갈래) · 아니면 초성 아래를 올림,
       모음↔받침 = 줄기 끝을 올리고 받침 위를 내림, 초성↔받침 = 초성 아래를 올리고 받침 위를 내림. 사연: docs/code-history.md#h190"""
    s = code - 0xAC00; v = JUNG[(s % 588) // 28]
    branchy = v in 'ㅓㅕㅔㅖㅝㅞ'
    f = {}; g = w * GAP
    add = lambda k, d: f.__setitem__(k, f.get(k, 0) + d)
    for _ in range(30):
        rl = []; st = syllable(code, w, rl, f)
        part = {r: [x for x, q in zip(st, rl) if q == r] for r in 'LVHT'}
        hit = lambda a, b: _hits(part[a], part[b], w, g)
        moved = False
        if hit('L', 'V'):                                      # 초성 ↔ 세로 모음(줄기 · 가지)
            if branchy and f.get('br', 0) < 220: add('br', STEP)
            else: add('lr', STEP)
            moved = True
        if hit('L', 'H'): add('lb', STEP); moved = True        # 초성 ↔ 가로 막대 · 짧은 획
        if hit('V', 'T'):                                      # 줄기 끝 ↔ 받침
            if f.get('sb', 0) < 180: add('sb', STEP)
            else: add('tt', STEP / 2)
            moved = True
        if hit('H', 'T'): add('tt', STEP / 2); moved = True
        if hit('L', 'T'): add('lb', STEP); add('tt', STEP / 2); moved = True
        if not moved: break
    if roles is not None: syllable(code, w, roles, f)
    fit_syllable.last = f
    return st

def _shift(st, dx):
    return [(s[0], [(x + dx, y) for x, y in s[1]]) + tuple(s[2:]) for s in st]

def jamo(ch, w):
    """호환 자모(ㄱ ㅏ …) — 홀로 선 꼴"""
    if ch in CONS or ch in DOUBLE: return cons_strokes(ch, (252, 258, 1582, 1188) if ch in DOUBLE else (328, 258, 1442, 1184), w)
    if ch in VV:
        st = vert_strokes(ch, 710, 1582, -162, w); xs = [x for _, pts in st for x, _ in pts]
        return _shift(st, 960 - (min(xs) + max(xs)) / 2)
    if ch in HV:
        bc, reach = {'ㅗ': (437, 1248), 'ㅛ': (437, 1248), 'ㅜ': (944, 114), 'ㅠ': (944, 114), 'ㅡ': (755, 0)}[ch]
        return horz_strokes(ch, bc, 76, 1690, reach, w)
    if ch in MV:
        hv, (bx0, bx1), vv, vx = MV[ch]
        bc, reach = {'ㅗ': (345, 1036), 'ㅜ': (760, 0), 'ㅡ': (496, 0)}[hv]
        st = horz_strokes(hv, bc, bx0, bx1, reach, w, xs=[(bx0 + bx1) / 2] if hv != 'ㅡ' else [])
        st += vert_strokes(vv, 330 if vv in 'ㅓㅔ' else 710, 1582, -162, w, stem_x=vx if vv == 'ㅣ' else None, br_from=vx if vv in 'ㅓㅔ' else None)
        return st
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
    if 0xAC00 <= code <= 0xD7A3: adv, st = HW, fit_syllable(code, w)
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
  27 finals. Where each jamo sits and how large it is depends on the vowel and on
  the height of the final consonant; initials before vertical vowels use their
  own forms (the sweeping leg of giyeok, the split strokes of siot and jieut).
- The jamo placement (positions and sizes only) was studied from Pretendard
  (Kil Hyung-jin, SIL OFL 1.1) by measuring its jamo bounding boxes. No glyph
  outlines were taken from it.
- Strokes have a fixed weight per style (Regular 150, Bold 226 of 2048 units).
  Round letters are octagonal, and every outer corner is cut at 36% of the stroke
  weight - the chiselled look of the game's ash-and-iron world. Inner corners stay
  sharp.
- Vertical metrics, the Hangul advance width (1770) and the tabular figures (1220)
  match the game's previous font, so the interface layout does not move.
- Character set: Hangul KS X 1001 (2,350 syllables) plus every syllable used in
  the game text, Hangul compatibility jamo, Basic Latin, the Latin-1 letters used
  in German and Spanish, punctuation, and the symbols the game text uses.

Version {VERSION} (2026-10-16)
- Jamo no longer touch: each syllable is checked for the gap between initial,
  medial and final, and the branch, initial floor, stem end or final top is
  moved until the gap is at least half a stroke (tools/fontdiag.py checks all).
- Stacked horizontals (ㄹ ㄷ ㅌ ㅂ ㅋ in small boxes) thin only the horizontal
  strokes so the counters stay open, especially in Bold; diagonal legs of ㅅ ㅈ ㅊ
  in double consonants thin the same way.
- Initials over ㅗ ㅜ ㅡ with a final get more height; both halves of ㄲ ㅋㅋ use
  the same leg.

Version 2.100 (2026-10-12)
- Hangul structure reworked: jamo placement per vowel and per final height,
  positional consonant forms, larger initials and finals.

Version 2.000 (2026-10-12)
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
