"""왼쪽 보기 시트 — 무기 든 오른손이 몸 **뒤** 팔, 왼손이 몸 **앞** 팔인 그림(mkplayer.py 가 부른다).

★ 오른쪽 시트를 그대로 뒤집으면 왼쪽을 볼 때도 무기 팔이 몸 앞에 와서 무기를 왼손에 든 꼴이 된다(사용자 지적 2026-10-23 —
  "좌우반전시키면 왼손·오른손에 드는 방식 자체, 팔 구조가 이상하다"). 사용자 허락을 받아 팔만 고친 시트를 따로 굽는다.
  몸통 · 얼굴 · 다리 · 망토는 원본 픽셀 그대로다. 게임은 이 시트를 오른쪽 시트처럼 **뒤집어** 그린다(좌표는 오른쪽 보기 기준).

  · 무기 팔(W): 몸통을 가로지르던 칸은 몸통으로 메우고(hide) 나머지는 그늘(0.78배) — 몸 뒤로 돌아간 팔.
  · 왼팔(O): 어두운 팔목을 밝히고(1.32배) 망토 위로 소매를 그린다(sleeve) — 몸 앞의 팔. 숨어 있던 장은 다른 장에서 옮긴다(copy).
  · 손 자리는 장마다 손으로 적는다(h1 = 무기 손 · h2 = 왼손, None 이면 그 장엔 손이 안 보인다).
  자리는 방랑자 그림에서 잡았고 다섯 캐릭터는 몸 틀이 같아 그대로 쓴다(색만 그 캐릭터 것). 칸 번호는 36×46 기준.
  사연: docs/code-history.md#h223
"""
from collections import Counter

FW, FH = 36, 46
hx = lambda p: '%02x%02x%02x' % p[:3]
sh = lambda p, k: tuple(max(0, min(255, round(v * k))) for v in p[:3]) + (255,)
lum = lambda p: 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]

# 방랑자 색으로 가른 팔 칸 — 밝은 팔목 · 살 · 소맷부리 / 어두운 팔목 · 그늘 소매
WCOL = {'4a3626', 'e6bb8a', 'e9c296', 'bc9971', 'ead19e', '575149', 'a78864'}
OCOL = {'38291d', '3e3933', '2d2117'}

# 직사각형 (y0, y1, x0, x1[, '*']) — '*' 면 윤곽선 빼고 모든 색, 아니면 위 색만
LEFT = {
    0: dict(W=[(17, 28, 20, 24, '*'), (29, 32, 22, 25, '*')], O=[(25, 32, 8, 12)], sleeve=(17, 25, 9, 11),
            h1=[22, 29, 25, 32], h2=[9, 29, 12, 32]),
    1: dict(W=[(18, 29, 20, 25, '*'), (30, 33, 22, 26, '*')], O=[(26, 33, 8, 13)], sleeve=(18, 26, 9, 11),
            h1=[23, 30, 25, 33], h2=[9, 30, 11, 33]),
    2: dict(W=[(22, 31, 13, 18)], hide=[(22, 27, 13, 19, ('F', 0, 0, 0)), (28, 31, 12, 18, 'R')],
            O=[(29, 31, 20, 22)], copy=[('R', 5, (18, 33, 20, 26), 0, -1)],
            h1=[13, 28, 16, 31], h2=[22, 29, 25, 32]),
    3: dict(W=[(24, 33, 14, 21)], hide=[(24, 29, 14, 20, ('F', 5, 0, 0)), (30, 32, 14, 21, 'L'), (33, 33, 14, 21, 'D')],
            copy=[('L', 5, (17, 34, 6, 13), 0, 0)],
            h1=[15, 30, 20, 33], h2=[9, 30, 12, 33]),
    4: dict(W=[(19, 21, 21, 24, '*'), (22, 23, 23, 26, '*'), (24, 31, 23, 30, '*')], O=[(17, 25, 5, 10), (26, 30, 5, 9)],
            h1=[26, 28, 29, 31], h2=[6, 28, 8, 30]),
    5: dict(W=[(18, 29, 20, 24, '*'), (30, 33, 22, 25, '*')], O=[(27, 33, 8, 12)], sleeve=(18, 26, 9, 11),
            h1=[22, 30, 25, 33], h2=[9, 30, 12, 33]),
    6: dict(W=[(21, 24, 6, 16)], hide=[(21, 23, 12, 16, ('F', 0, 0, 0))], O=[(25, 27, 6, 9)],
            h1=[6, 21, 11, 24], h2=None),
    7: dict(W=[(14, 19, 6, 15)], hide=[(15, 19, 11, 15, ('F', 0, 0, 0))], O=[(18, 22, 6, 9)],
            h1=[6, 15, 10, 17], h2=None),
    8: dict(W=[(10, 16, 9, 16)], hide=[(13, 13, 13, 16, 'U'), (14, 15, 12, 16, ('C', 20, 14)), (16, 16, 14, 16, 'R')],
            O=[(16, 19, 6, 10)], h1=[10, 10, 13, 13], h2=None),
    9: dict(W=[(11, 18, 6, 14)], hide=[(13, 13, 12, 14, 'R'), (14, 18, 11, 14, 'R')], O=[(23, 32, 5, 10)],
            h1=[6, 11, 11, 14], h2=[6, 29, 10, 32]),
    10: dict(W=[(18, 20, 24, 28, '*'), (21, 23, 24, 29, '*'), (24, 24, 25, 28, '*')], O=[(23, 32, 5, 11)],
             h1=[26, 21, 29, 23], h2=[6, 29, 11, 32]),
    11: dict(W=[(14, 14, 25, 29, '*'), (15, 16, 23, 29, '*'), (17, 19, 24, 29, '*')],
             hide=[(31, 33, 12, 13, 'R')], copy=[('L', 0, (17, 33, 8, 12), 1, 1)],
             h1=[24, 14, 27, 18], h2=[10, 30, 12, 33]),
    12: dict(h1=[22, 29, 25, 32], h2=None),
}
ORDER = [0, 1, 4, 5, 6, 7, 8, 9, 10, 12, 2, 3, 11]   # copy 가 가져오는 장이 먼저


def outline_of(c):
    cnt = Counter()
    for y in range(FH):
        for x in range(FW):
            if c[y][x][3] and any(not (0 <= x + dx < FW and 0 <= y + dy < FH) or not c[y + dy][x + dx][3]
                                  for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                cnt[c[y][x]] += 1
    return cnt.most_common(1)[0][0]


def cells(w, rects, cols, OUTW):
    out = set()
    for r in rects or ():
        y0, y1, x0, x1 = r[:4]
        every = len(r) > 4
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                p = w[y][x]
                if p[3] and p != OUTW and (every or hx(p) in cols):
                    out.add((x, y))
    return out


def make_left(c_frames, w_frames):
    """c_frames: 이 캐릭터의 다듬기 전 13장(36×46), w_frames: 방랑자의 같은 13장 → 왼쪽 보기 13장, 손 자리 [(h1, h2)]"""
    L = [None] * len(c_frames)
    for f in ORDER:
        spec, c, w = LEFT[f], c_frames[f], w_frames[f]
        g = [row[:] for row in c]
        OUTC, OUTW = outline_of(c), outline_of(w)
        Ws = cells(w, spec.get('W'), WCOL, OUTW)
        Os = cells(w, spec.get('O'), OCOL, OUTW)
        # 무기 팔이 몸통을 가로지른 칸 — 몸통(또는 다리)으로 메운다
        for y0, y1, x0, x1, src in spec.get('hide', ()):
            donor = isinstance(src, tuple) and src[0] == 'F'      # 다른 장의 몸통을 통째로 — 칸 안을 다 바꾼다
            todo = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)
                    if (x, y) in Ws or (c[y][x][3] and c[y][x] == OUTC) or (donor and c[y][x][3])]
            gone = set(todo)
            for x, y in todo:
                if isinstance(src, tuple) and src[0] == 'F':
                    p = c_frames[src[1]][y + src[3]][x + src[2]]
                elif isinstance(src, tuple):
                    p = c[src[2]][src[1]]
                else:
                    dx, dy = {'L': (-1, 0), 'R': (1, 0), 'U': (0, -1), 'D': (0, 1)}[src]
                    k, p = 1, None
                    while 0 <= x + dx * k < FW and 0 <= y + dy * k < FH:
                        q = g[y + dy * k][x + dx * k]
                        if (x + dx * k, y + dy * k) not in gone and q[3] and q != OUTC:
                            p = q; break
                        k += 1
                if p and p[3]:
                    g[y][x] = p
            Ws -= gone
        # 뒤로 간 무기 팔은 그늘에 든다
        body = lambda x, y: 0 <= x < FW and g[y][x][3] and g[y][x] != OUTC and (x, y) not in Ws
        for x, y in Ws:
            if g[y][x][3] and g[y][x] != OUTC:
                seam = body(x - 1, y) or body(x + 1, y)         # 몸통과 맞닿은 칸은 더 짙게 — 몸통이 앞에 선다
                g[y][x] = sh(g[y][x], 0.55 if seam else 0.74)
        # 앞으로 나온 왼팔은 빛을 받는다(살은 그대로)
        for x, y in Os:
            if g[y][x][3] and g[y][x] != OUTC and lum(g[y][x]) < 150:
                g[y][x] = sh(g[y][x], 1.32)
        # 망토 위로 소매 — 어깨에서 팔목 위까지(몸통 옷의 가운데 색)
        if spec.get('sleeve'):
            y0, y1, x0, x1 = spec['sleeve']
            shirt = Counter(c[y][x] for y in range(y0 + 2, y1) for x in range(13, 19) if c[y][x][3] and c[y][x] != OUTC).most_common(1)[0][0]
            # 바깥 칸은 그늘 · 가운데는 밝게 · 몸통 쪽 칸은 주름(짙은 선) — 몸통과 갈라져 팔로 읽힌다
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    g[y][x] = sh(shirt, 0.85) if x == x0 else sh(shirt, 0.5) if x == x1 else sh(shirt, 1.12)
                g[y][x0 - 1] = OUTC                        # 망토 쪽 윤곽
        # 숨어 있던 팔 — 다른 장에서 옮긴다
        for which, src, (y0, y1, x0, x1), dx, dy in spec.get('copy', ()):
            s = (L if which == 'L' else c_frames)[src]
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    if s[y][x][3] and 0 <= y + dy < FH and 0 <= x + dx < FW:
                        g[y + dy][x + dx] = s[y][x]
        L[f] = g
    return L


def hands():
    """매니페스트에 적을 손 자리 — (hand, handBox, hand2, hand2Box)"""
    ctr = lambda b: b and [round((b[0] + b[2]) / 2, 1), round((b[1] + b[3]) / 2 + 0.5, 1)]
    order = sorted(LEFT)
    return ([ctr(LEFT[f]['h1']) for f in order], [LEFT[f]['h1'] for f in order],
            [ctr(LEFT[f]['h2']) for f in order], [LEFT[f]['h2'] for f in order])
