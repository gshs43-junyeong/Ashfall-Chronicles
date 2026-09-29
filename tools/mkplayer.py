#!/usr/bin/env python3
"""주인공 시트 다섯 장을 **원래 손그림 그대로**, 잘린 데 없이 다시 굽는다.

  python3 tools/mkplayer.py           # tools/art/player_<id>.png → game/assets/char/player_<id>.png
  python3 tools/sync-manifest.py      # 그다음 매니페스트 옮겨 적기

★ 원본은 tools/art/ 의 22×41 시트다. game/assets/char/ 의 것은 **산출물**이라
  그걸 다시 먹이면 두 번 늘어난다. 그림을 고치려면 tools/art/ 를 고치고 이걸 돌린다.

■ 왜 다시 굽나
  처음 그림은 20×40 칸에 꽉 차게 그려져 칸 벽에 닿은 곳이 칼로 자른 듯 끊겨 있었다 — 정수리 · 망토 뒷자락
  (왼쪽 벽) · 앞으로 뻗은 손과 발(오른쪽 벽). 예전에 칸을 한 줄 넓혀 그 단면에 **윤곽선만** 그었다(tools/art/ 의 원본이 그 상태다).
  그래서 잘린 자리가 "닫히기"는 했지만 모양은 그대로 납작했다(정수리가 평평하고 손이 네모로 끝났다).
  그 다음에는 팔·다리·망토를 코드로 새로 그렸는데(리그), 원래 그림의 명암·주름·옷 결이 다 빠져
  "그림이 너프됐다"는 말을 들었다. 이번에는 원래 그림을 **한 픽셀도 바꾸지 않고**, 잘린 자리만 이어 그린다.

■ 어떻게 잇나
  원본에서 덧댄 칸(맨 왼쪽 · 맨 오른쪽 열, 맨 윗줄)의 픽셀이 곧 "여기서 잘렸다"는 표시다. 그것을 걷어 내고,
  잘린 줄마다 한 토막씩 묶어 바깥으로 늘인다 — 깊이는 상한(옆 2칸 · 위 1칸)까지 **곧게** 나가고 토막 양 끝에서만
  한 칸씩 깎는다(모서리 깎기). ★ 처음에는 반타원으로 둥글게 늘였는데, 망토 밑자락(왼쪽 벽에 잘린 긴 토막)이
  둥근 주머니처럼 부풀어 "물포대"가 도로 생겼고, 정수리는 뾰족한 두건이 됐다. 천 자락은 곧게 떨어져야 한다.
  ★ 정수리는 **늘리지 않는다**(상한 0 — 단면에 윤곽선만). 한 줄만 얹어도 머리 꼭대기 토막이 다섯 칸뿐이라
  가운데 세 칸이 솟아 두건 꼭지처럼 보였다. 원래 머리 모양이 우선이다. 채우는 색은 그 줄의 잘린 픽셀 색(윤곽선이면 한 칸
  안쪽 색)을 그대로 끌어 내므로 옷의 줄무늬·명암이 그 방향으로 이어진다. 끝으로 새로 칠한 칸 둘레에만
  윤곽선을 두른다 — 원래 윤곽선은 그대로다.

■ 칸과 판정
  22×41 을 36×46 칸의 (7,4) 에 놓는다(좌우 7칸씩 — 뒤로 끌리는 망토 자락 자리, 같게 두어 뒤집어도 안 밀린다). 매니페스트 ox/oy 를
  -8/-5 로 두어 몸은 예전 자리 그대로 선다 — 판정 상자(20×40)도 그림 속 발 위치도 그대로다.

■ 손 자리(무기 쥐는 곳)
  방랑자 시트에서 프레임마다 얼굴 아닌 살색 덩어리 중 가장 앞(오른쪽)에 있는 것을 무기 손으로 잡아(예외는 HIGH·FIXED)
  hand([x, y]) · handBox([x0, y0, x1, y1]) 로 매니페스트에 적는다. 다섯 장은 색만 다르고 몸 모양이 같아서
  한 장에서 잰 것을 다섯 장에 쓴다. 게임은 무기를 이 손에 쥐여 그리고, 손 칸을 무기 위에 한 번 더
  그려 손이 자루를 감싼 것처럼 보이게 한다(game.js drawHeldWeapon).
"""
import json, math, os
from collections import Counter
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'art')
ROOT = os.path.join(HERE, '..', 'game', 'assets')
CHAR = os.path.join(ROOT, 'char')
S = 4
OW, OH, N = 22, 41, 13                  # 원본(unclip 뒤) 프레임
FW, FH = 36, 46                         # 새 프레임(뒤로 끌리는 망토 자락 자리 · 좌우 7칸씩 같게 — 뒤집어도 몸이 안 밀린다)
PX, PY = 7, 4                           # 원본을 놓는 자리
IDS = ['wanderer', 'digger', 'ranger', 'adept', 'stray']
MAXR = {'L': 2, 'R': 2, 'T': 0}
SKIN = {'#e6bb8a', '#bc9971', '#a78864', '#ead19e'}   # 방랑자 살색(명암 넷)
FACE = 19                                             # 얼굴 살색 칸 수(열두 장 모두 같다) — 손과 가른다
# ★ 무기 쥐는 손은 대개 "가장 앞의 손"이지만 둘은 예외다(방랑자 시트를 한 장씩 열어 보고 정했다).
#   9 atk1  머리 옆으로 치켜든 주먹이 무기 손이다 — 허리께의 뒷손이 더 앞(x)이라 가장 높은 것을 고른다.
#  11 atk3  앞으로 뻗은 주먹이 장갑 색(#4a3626)이라 살색으로 안 잡힌다. 자리를 손으로 적는다.
HIGH = {9}
FIXED = {11: ([26.0, 16.0], [24, 14, 27, 18])}


def frames_of(path):
    im = Image.open(path).convert('RGBA')
    assert im.size == (OW * S * N, OH * S), '원본은 22×41 × 13 이어야 한다: %s %s' % (path, im.size)
    px = im.load()
    return [[[px[f * OW * S + x * S + 1, y * S + 1] for x in range(OW)] for y in range(OH)] for f in range(N)]


def outline_color(g):
    c = Counter()
    for y in range(OH):
        for x in range(OW):
            if not g[y][x][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if not (0 <= xx < OW and 0 <= yy < OH) or not g[yy][xx][3]:
                    c[g[y][x]] += 1
                    break
    return c.most_common(1)[0][0]


def runs(flags):
    out, a = [], None
    for i, f in enumerate(flags + [False]):
        if f and a is None:
            a = i
        if not f and a is not None:
            out.append((a, i - 1)); a = None
    return out


def rebuild(g):
    """22×41 한 장 → 32×46 한 장(원본 픽셀 그대로 + 잘린 자리 이어 그리기)"""
    OUTC = outline_color(g)
    cut = {'L': [False] * OH, 'R': [False] * OH, 'T': [False] * OW}
    for y in range(OH):
        if g[y][0][3]: cut['L'][y] = True
        if g[y][OW - 1][3]: cut['R'][y] = True
    for x in range(OW):
        if g[0][x][3]: cut['T'][x] = True
    # 덧댄 단면선을 걷는다
    for y in range(OH):
        g[y][0] = g[y][OW - 1] = (0, 0, 0, 0)
    for x in range(OW):
        g[0][x] = (0, 0, 0, 0)
    c = [[(0, 0, 0, 0)] * FW for _ in range(FH)]
    for y in range(OH):
        for x in range(OW):
            c[y + PY][x + PX] = g[y][x]
    new = set()

    def src(x, y, sx, sy):
        """(x,y) 에서 안쪽(sx,sy 방향)으로 들어가며 윤곽선이 아닌 첫 색"""
        for k in range(4):
            p = c[y + sy * k][x + sx * k]
            if p[3] and p != OUTC:
                return p
        return None

    for side in ('L', 'R', 'T'):
        for a, b in runs(cut[side]):
            n = b - a + 1
            R = min(MAXR[side], round(n / 2))
            e = 0 if side == 'T' else 1
            for j in range(a, b + 1):
                d = min(R, j - a + e, b - j + e)
                if side == 'L':
                    x0, y0, ox, oy, ix, iy = PX + 1, j + PY, -1, 0, 1, 0
                elif side == 'R':
                    x0, y0, ox, oy, ix, iy = PX + OW - 2, j + PY, 1, 0, -1, 0
                else:
                    x0, y0, ox, oy, ix, iy = j + PX, PY + 1, 0, -1, 0, 1
                if not c[y0][x0][3]:
                    continue
                col = src(x0, y0, ix, iy)
                if col is None:
                    continue
                # 원래 끝 칸(단면)이 윤곽선이었으면 그 자리도 속색으로 — 안 그러면 이음매에 줄이 남는다
                if d <= 0:                                  # 안 늘리는 끝 칸 — 단면에 윤곽선만 다시 두른다
                    xx, yy = x0 + ox, y0 + oy
                    if not c[yy][xx][3]:
                        c[yy][xx] = OUTC
                    continue
                if c[y0][x0] == OUTC:
                    c[y0][x0] = col; new.add((x0, y0))
                for k in range(1, d + 1):
                    xx, yy = x0 + ox * k, y0 + oy * k
                    if 0 <= xx < FW and 0 <= yy < FH and not c[yy][xx][3]:
                        c[yy][xx] = col; new.add((xx, yy))
    # 새로 칠한 칸 둘레에만 윤곽선
    for (x, y) in list(new):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
            xx, yy = x + dx, y + dy
            if 0 <= xx < FW and 0 <= yy < FH and not c[yy][xx][3]:
                # 대각선만 닿은 칸은 계단이 두꺼워지지 않게, 곧은 이웃이 둘 다 비었을 때만
                if dx and dy and (c[y][xx][3] or c[yy][x][3]):
                    continue
                c[yy][xx] = OUTC
    return c


def hand_of(c, high=False):
    """살색 덩어리(얼굴 19칸 제외) 중 가장 앞(오른쪽) — high 면 가장 높은 것. (중심, 상자). 없으면 None"""
    hexc = lambda p: '#%02x%02x%02x' % p[:3]
    seen, best = set(), None
    for y in range(FH):
        for x in range(FW):
            if (x, y) in seen or not c[y][x][3] or hexc(c[y][x]) not in SKIN:
                continue
            comp, st = [], [(x, y)]
            seen.add((x, y))
            while st:
                q = st.pop(); comp.append(q)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = q[0] + dx, q[1] + dy
                    if (xx, yy) in seen or not (0 <= xx < FW and 0 <= yy < FH):
                        continue
                    if c[yy][xx][3] and hexc(c[yy][xx]) in SKIN:
                        seen.add((xx, yy)); st.append((xx, yy))
            if len(comp) < 2 or len(comp) == FACE:
                continue
            mx = -min(p[1] for p in comp) if high else max(p[0] for p in comp)
            if best is None or mx > best[0]:
                best = (mx, comp)
    if not best:
        return None
    comp = best[1]
    xs, ys = [p[0] for p in comp], [p[1] for p in comp]
    return [round(sum(xs) / len(xs), 1), round(sum(ys) / len(ys), 1)], [min(xs), min(ys), max(xs), max(ys)]


def polish(c):
    """디테일 한 겹 — 원래 그림의 색·모양은 두고 **빛과 결**만 더한다(사용자 요청: "조금만 더 디테일있게").
      · 테두리 빛: 몸 앞·위(오른쪽·위)가 트인 칸은 한 톤 밝게, 뒤·아래가 트인 칸은 한 톤 어둡게 —
        원래 그림의 명암(앞쪽 외투가 밝다)과 같은 쪽에서 빛이 든다. 한 칸짜리 가는 부분은 안 건드린다
        (양쪽이 다 트여 밝고 어두운 게 겹치면 번쩍인다).
      · 부드러운 윤곽(sel-out): 빛 드는 쪽 **바깥** 윤곽선은 까만색 대신 맞닿은 옷 색을 아주 어둡게 —
        실루엣은 그대로 읽히면서 덩어리가 둥글어 보인다. 몸 안쪽의 구분선(팔과 몸 사이 등)은 그대로 까맣다.
      · 옷 결: 같은 색이 사방으로 이어진 넓은 면에만 성긴 점무늬(어둡게 · 밝게)를 찍는다. 자리로 정해져
        있어(좌표 식) 프레임마다 결이 들끓지 않는다 — 몸이 움직이면 결도 몸을 따라 움직인다.
      ★ 손 자리(hand_of)는 살색을 보고 찾으므로 이 단계 **전에** 잰다."""
    OUTC = None
    cnt = Counter()
    for y in range(FH):
        for x in range(FW):
            if c[y][x][3] and any(not (0 <= x + dx < FW and 0 <= y + dy < FH) or not c[y + dy][x + dx][3]
                                  for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                cnt[c[y][x]] += 1
    OUTC = cnt.most_common(1)[0][0]
    at = lambda x, y: c[y][x] if 0 <= x < FW and 0 <= y < FH else (0, 0, 0, 0)
    fill = lambda p: p[3] and p != OUTC
    open_ = lambda p: not p[3] or p == OUTC
    sh = lambda p, k: tuple(max(0, min(255, round(v * k))) for v in p[:3]) + (255,)
    lum = lambda p: 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]
    out = [row[:] for row in c]
    for y in range(FH):
        for x in range(FW):
            p = c[y][x]
            if not p[3]:
                continue
            if p == OUTC:
                # 바깥 윤곽(한쪽이 투명)이면서 왼쪽/아래에 옷이 있으면 = 몸 오른쪽·위 가장자리
                L, D, R, U = at(x - 1, y), at(x, y + 1), at(x + 1, y), at(x, y - 1)
                src = L if fill(L) and not R[3] else D if fill(D) and not U[3] else None
                if src is not None:
                    out[y][x] = sh(src, 0.42)
                continue
            nb = [at(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            nfill = sum(1 for q in nb if fill(q))
            lit = open_(nb[0]) or open_(nb[3])
            dark = open_(nb[1]) or open_(nb[2])
            if nfill >= 2 and lit and not dark and lum(p) < 200:
                out[y][x] = sh(p, 1.16)
            elif nfill >= 2 and dark and not lit:
                out[y][x] = sh(p, 0.84)
            elif lum(p) < 150 and all(at(x + dx, y + dy) == p for dx in (-1, 0, 1) for dy in (-1, 0, 1)):   # 살·흰 머리엔 결을 안 찍는다(잡티로 보인다)
                if (x * 2 + y * 3) % 7 == 0:
                    out[y][x] = sh(p, 0.9)
                elif (x * 5 + y) % 11 == 3:
                    out[y][x] = sh(p, 1.08)
    return out


# ── 망토(rebuild 뒤, 34×46 좌표) ─────────────────────────────────────────────────────
# ★ 원래 망토는 허리 뒤에서 무릎까지의 좁은 판이라 "망토"로 안 읽혔다(어깨 쪽은 몸 윤곽에 가려 1~2칸).
#   등 쪽(원본 6열까지)의 망토색을 걷어 내고, 목도리 바로 아래 어깨에서 발목(발 3줄 위)까지 늘어져
#   아래로 갈수록 넓어지는 천을 새로 그린다. 투명한 칸에만 칠하므로 몸·뒷손·다리는 늘 망토 앞에 있다.
#   주름은 좌표로 정한 세로 줄(5칸마다 한 번 어둡게·밝게)이라 프레임이 바뀌어도 들끓지 않고, 밑단은 톱니.
# 프레임별 (뒤로 끌림, 밑단 올라감): 0·1 서기 · 2~5 걷기 · 6 점프 · 7 낙하 · 8 대시 · 9~11 공격 · 12 피격
CAPE_MOTION = {0: (0, 0), 1: (0, 0), 2: (2, 0), 3: (3, 1), 4: (2, 0), 5: (3, 1), 6: (2, 1), 7: (4, 4),
               8: (16, 10), 9: (1, 0), 10: (2, 1), 11: (2, 1), 12: (2, 1)}
AIR_FRAMES = (6, 7, 8)                               # 점프 · 낙하 · 대시
AIR_ANCHOR = {6: 10, 7: 11, 8: 17}                   # 방랑자에서 잰 값(그리면서 다시 채운다)
CAPE_HEX = ('20232e', '272a38', '35394b', '494e5e')   # 방랑자 망토색(어둡게→밝게)


def drape(c, f, pal, near=None):
    OUTC = outline_color(c)
    tr = (0, 0, 0, 0)
    dk2, dk, mid, lt = pal
    XB = PX + 6
    d2 = lambda p, q: sum((p[i] - q[i]) ** 2 for i in range(3))
    head = min(y for y in range(FH) for x in range(FW) if c[y][x][3])
    for y in range(head + 9, FH):                      # 옛 망토 걷기(머리 9줄은 안 건드린다)
        for x in range(XB + 1):
            p = c[y][x]
            if p[3] and (p[:3] in [q[:3] for q in pal] or (near and min(d2(p, q) for q in pal) < near)):
                c[y][x] = tr
    for _ in range(2):                                 # 몸과 떨어진 윤곽선 지우기
        for y in range(FH):
            for x in range(XB + 2):
                if c[y][x] == OUTC and not any(0 <= x + dx < FW and 0 <= y + dy < FH and c[y + dy][x + dx][3]
                                               and c[y + dy][x + dx] != OUTC for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    c[y][x] = tr
    bx = {}
    for y in range(FH):
        xs = [x for x in range(FW) if c[y][x][3] and c[y][x] != OUTC]
        if xs:
            bx[y] = xs[0]
    feet = max(bx)
    scarf = [y for y in range(FH) for x in range(FW) if c[y][x][3] and hx(c[y][x]) == '9c463f']
    top = min(scarf) + 1 if scarf else head + 10
    sway, lift = CAPE_MOTION[f]
    hem = feet - 3 - lift
    anchor = min(bx.get(y, 99) for y in range(top, top + 4))
    # 공중·대시 장은 팔을 뒤로 뻗어 몸 왼끝이 팔끝이다 — 거기 매달면 망토가 몸에서 떨어져 난다.
    # 이 장만 목도리(몸통) 기준으로 걸고, 팔 줄도 망토를 채운다(팔은 불투명이라 앞에 남는다).
    air = f in AIR_FRAMES
    if air and scarf:
        anchor = min(x for y in range(FH) for x in range(FW) if c[y][x][3] and hx(c[y][x]) == '9c463f') - 2
        AIR_ANCHOR[f] = anchor
    elif air:
        anchor = AIR_ANCHOR[f]                         # 목도리 색이 다른 캐릭터 — 자세는 방랑자와 같다
    new = []
    for y in range(top, hem + 1):
        t = (y - top) / max(1, hem - top)
        xl = round(anchor - (1.2 + 3.0 * t ** 0.85) - sway * t * t)
        xr = min(bx.get(y, anchor + 2), anchor + 2) if y > top + 3 else bx.get(y, anchor + 1)
        if air:
            xr = anchor + 2 if y > top + 3 else anchor + 1
        for x in range(max(1, xl), xr):
            if c[y][x][3] or (y == hem and (x + f) % 3 == 0):
                continue
            u, fold = x - xl, (x * 2 + (y - top) // 5) % 5
            col = dk if u == 0 or (y <= top + 1) else (dk2 if fold == 0 else lt if fold == 3 else mid)
            c[y][x] = col
            new.append((x, y))
    for x, y in new:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < FW and 0 <= ny < FH and not c[ny][nx][3]:
                c[ny][nx] = OUTC
    return c


def cape_palettes(w, g):
    """이 캐릭터의 망토색 넷(방랑자 같은 자리 색으로 옮김)과 피격 장(12)용으로 물든 넷.
    피격 장은 통째로 붉게 물들인 장이라, 자세가 가장 가까운 9번과 같은 자리 색으로 채널별 1차 맞춤을 구해 똑같이 물들인다."""
    fwd = {}
    for f in range(N):
        for y in range(OH):
            for x in range(OW):
                a, b = w[f][y][x], g[f][y][x]
                if a[3] and b[3]:
                    fwd.setdefault(hx(a), Counter())[b] += 1
    pal = tuple(fwd[k].most_common(1)[0][0] for k in CAPE_HEX)
    xs, ys = [[], [], []], [[], [], []]
    for y in range(OH):
        for x in range(OW):
            a, b = g[9][y][x], g[12][y][x]
            if a[3] and b[3]:
                for k in range(3):
                    xs[k].append(a[k]); ys[k].append(b[k])

    def fit(X, Y):
        n = len(X); mx = sum(X) / n; my = sum(Y) / n
        k = sum((x - mx) * (y - my) for x, y in zip(X, Y)) / (sum((x - mx) ** 2 for x in X) or 1)
        return k, my - k * mx
    F = [fit(xs[k], ys[k]) for k in range(3)]
    tint = lambda p: tuple(max(0, min(255, round(F[k][0] * p[k] + F[k][1]))) for k in range(3)) + (255,)
    return pal, tuple(tint(p) for p in pal)


def save(frames, path):
    im = Image.new('RGBA', (FW * S * N, FH * S), (0, 0, 0, 0))
    px = im.load()
    for f, c in enumerate(frames):
        for y in range(FH):
            for x in range(FW):
                p = c[y][x]
                if not p[3]:
                    continue
                for yy in range(S):
                    for xx in range(S):
                        px[f * FW * S + x * S + xx, y * S + yy] = p
    im.save(path)


# ── 손그림 고치기(rebuild 전에, 22×41 원본 좌표) ─────────────────────────────────────────
# ★ 서 있을 때(0 idle1 · 1 idle2) 망토가 걸을 때와 딴판이었다 — 뒷팔이 늘어져 손 밑에 망토가 뭉쳐 있어
#   허리 뒤에 자루를 매단 것처럼 보였다(걸을 때는 어깨에서 무릎까지 곧은 판). 사용자가 걸을 때 쪽을 골랐다.
#   서 있는 두 장의 등 뒤(0~4열 · 17~35줄)를 walk4(5번 — 까딱인 높이가 idle2 와 같다)의 것으로 바꾼다.
#   idle1 은 한 줄 덜 까딱이므로 한 줄 위에서 가져온다.
# ★ walk3(4번, 깃허브에서 왼쪽 다섯째 그림)은 보폭이 칸보다 넓어 뒷다리가 망토에 파묻히고 뒷발이 벽에 잘려
#   다리가 쐐기 한 덩어리로 보였다. walk1(2번)의 다리(28줄 아래)를 가져오되 **앞다리·뒷다리 색을 맞바꾼다**
#   — 안 바꾸면 같은 다리만 늘 앞으로 나가 절뚝이는 걸음이 된다. 색 짝은 방랑자 기준(가까운 다리 ↔ 먼 다리)이고,
#   다른 캐릭터는 같은 자리 색으로 옮겨 쓴다(다섯 장은 부위마다 색만 바꿔 구운 것이다).
LEG_SWAP = {'33384a': '232632', '2a2e3d': '1c1f29', '494d5e': '3a3f50', '4a3626': '34261b',
            '3d2c1f': '2b1f16', '575149': '47423b'}
LEG_SWAP.update({v: k for k, v in LEG_SWAP.items()})
hx = lambda p: '%02x%02x%02x' % p[:3]


def fix_frames(g, w):
    """g: 이 캐릭터의 13장(22×41, 고친다), w: 방랑자 13장(색 짝 찾기용, 안 고친다)"""
    fwd, inv = {}, {}
    for f in range(N):
        for y in range(OH):
            for x in range(OW):
                a, b = w[f][y][x], g[f][y][x]
                if a[3] and b[3]:
                    fwd.setdefault(hx(a), Counter())[b] += 1
                    inv.setdefault(b, Counter())[hx(a)] += 1
    fwd = {k: v.most_common(1)[0][0] for k, v in fwd.items()}
    inv = {k: v.most_common(1)[0][0] for k, v in inv.items()}

    def swap(p):
        if not p[3] or p not in inv:
            return p
        q = LEG_SWAP.get(inv[p])
        return fwd.get(q, p) if q else p

    def close(fr, x0, x1, y0, y1):
        """고친 자리에서 윤곽 없이 투명과 맞닿은 칸에 윤곽선(벽 칸 0·21열 · 0줄은 잘림 표시라 안 건드림)"""
        OUTC = outline_color(fr)
        for y in range(max(1, y0), min(OH, y1 + 1)):
            for x in range(max(1, x0), min(OW - 1, x1 + 1)):
                if fr[y][x][3]:
                    continue
                if any(0 <= y + dy < OH and fr[y + dy][x + dx][3] and fr[y + dy][x + dx] != OUTC
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    fr[y][x] = OUTC

    # 서 있을 때 망토 = 걸을 때 망토
    for f, dy in ((0, 1), (1, 0)):
        for y in range(17, 36):
            sy = y + dy
            if sy >= OH:
                continue
            for x in range(0, 5):
                g[f][y][x] = g[5][sy][x]
        close(g[f], 0, 7, 16, 38)
    # walk3 다리 = walk1 다리(앞뒤 색 맞바꿈)
    for y in range(28, OH):
        for x in range(OW):
            g[4][y][x] = swap(g[2][y][x])
    close(g[4], 0, OW - 1, 26, OH - 1)
    return g


# ★ 사냥꾼이 등에 멘 활 윗가지(원본 #ded6bd · #a89c80 · #9f9a91, 옅은 회베이지)는 밝은 하늘·배경과 색이 비슷해 눈으로 보면 투명한 틈처럼
#   보였다. 등 쪽(원본 0~7열 · 25줄 위)의 그 색만 명암 순서대로 짙은 황갈색으로 바꾼다 — 활 모양은 그대로(사용자 요청 2026-09-28).
GEAR_RECOLOR = {'ranger': {'ded6bd': (0x9a, 0x6b, 0x35, 255), 'a89c80': (0x80, 0x57, 0x2b, 255), '9f9a91': (0x6c, 0x4a, 0x26, 255)}}
# 사냥꾼은 원본에서 활과 몸통 사이가 망토색이었는데, drape 가 옛 망토색을 걷고 새 망토를 활 바깥에만 그려 그 사이(9~12열 ·
# 15~28줄)가 투명으로 남았다(배경이 비쳤다). 그 장들에서 양옆이 막힌 빈 칸만 망토색으로 채운다.
GEAR_GAP = {'ranger': (0, 1, 4, 5, 10)}


def fill_gear_gap(c, cid, f, pal):
    if f not in GEAR_GAP.get(cid, ()):
        return c
    for y in range(15, 29):
        for x in range(9, 13):
            if not c[y][x][3] and any(c[y][k][3] for k in range(x)) and any(c[y][k][3] for k in range(x + 1, FW)):
                c[y][x] = pal[1]
    return c


def recolor_gear(g, cid):
    rc = GEAR_RECOLOR.get(cid)
    if not rc:
        return g
    for fr in g:
        for y in range(26):
            for x in range(8):
                if fr[y][x][3] and hx(fr[y][x]) in rc:
                    fr[y][x] = rc[hx(fr[y][x])]
    return g

# ★ 손 색 맞추기 — 원본은 뒷손을 그늘 살색(방랑자 #a78864, 24~29줄에만 있다)으로 칠해 앞손과 색이 달라 보였다(사용자 지적).
#   그 자리를 그 캐릭터의 앞손 살색(방랑자 #e6bb8a 자리의 가장 흔한 색)으로 바꾼다. 방랑자에서 자리를 재서 다섯 캐릭터에 쓴다.
def unify_hands(g, w):
    from collections import Counter
    lit = Counter(g[f][y][x] for f in range(N) for y in range(20, OH) for x in range(OW)
                  if w[f][y][x][3] and hx(w[f][y][x]) == 'e6bb8a' and g[f][y][x][3]).most_common(1)[0][0]
    for f in range(N - 1):                              # 피격 장(12)은 통째로 물든 장이라 뺀다
        for y in range(20, OH):
            for x in range(OW):
                if w[f][y][x][3] and hx(w[f][y][x]) == 'a78864' and g[f][y][x][3]:
                    g[f][y][x] = lit
    return g


# 서기·걷기 장에서 팔과 몸통 사이에 한 줄로 남은 투명 칸(배경이 비쳐 팔이 가운데서 끊겨 보였다 — 걷기 4번째 장 9열 27~30줄)을
# 왼쪽(팔) 색으로 메운다. 오른쪽 두 칸 안에 몸이 있을 때만 — 다리 사이 같은 넓은 틈은 그대로 둔다.
SLIT_FRAMES = range(6)


def fill_slits(c):
    OUTC = outline_color(c)
    body = lambda p: p[3] and p != OUTC
    for y in range(16, 35):
        for x in range(4, 17):
            if not c[y][x][3] and body(c[y][x - 1]) and (body(c[y][x + 1]) or (not c[y][x + 1][3] and body(c[y][x + 2]))):
                c[y][x] = c[y][x - 1]
    for y in range(30, 15, -1):                         # 틈 맨 윗칸(왼쪽이 윤곽선) — 바로 아래 메운 칸을 잇는다
        for x in range(4, 17):
            if not c[y][x][3] and c[y][x - 1][3] and body(c[y][x + 1]) and body(c[y + 1][x]):
                c[y][x] = c[y + 1][x]
    return c


# ★ 가슴 끈(방랑자 #3f2e20, 1칸 사선)은 **걸어도 흔들리지 않는다** — 원본 그림은 걷기 2·3·4번 장만 끈이 2칸 오른쪽(또는
#   1칸 아래)에 그려져 걸을 때 좌우로 튀었다. 서기·걷기 여섯 장 모두 0번 장의 모양을 목도리 높이에 맞춰 건다.
#   끈 칸과 그 자리 옷 칸만 바꾼다(사용자 허락 범위 2026-09-28). 다섯 캐릭터는 몸 모양이 같아 방랑자에서 잰 자리를 쓰되,
#   그 자리에 끈이 없는 캐릭터(방랑자 말고 넷)는 건너뛴다.
STRAP, SHIRT = '3f2e20', {'5f584f', '736d65', '8d909a'}
STRAP_FRAMES = range(6)


def strap_fix(g, w):
    scarf = lambda fr: min(y for y in range(OH) for x in range(OW) if fr[y][x][3] and hx(fr[y][x]) == '9c463f')
    cells = lambda fr: [(y, x) for y in range(10, 26) for x in range(2, 16) if fr[y][x][3] and hx(fr[y][x]) == STRAP]
    s0 = scarf(w[0])
    shape = [(y - s0, x) for y, x in cells(w[0])]
    for f in STRAP_FRAMES:
        old, dy = cells(w[f]), scarf(w[f]) - s0
        own = {g[f][y][x] for y, x in old}
        if len(own) != 1 or own & {g[f][y][x + d] for y, x in old for d in (-1, 1)}:
            continue   # 이 캐릭터엔 끈이 없다(그 자리가 옷 색)
        strap = next(iter(own))
        want = {(y + s0 + dy, x) for y, x in shape}
        for y, x in old:
            if (y, x) in want:
                continue
            nb = [w[f][y][x + d] for d in (-1, 1)] + [w[f][y + d][x] for d in (-1, 1)]
            k = next((i for i, q in enumerate(nb) if q[3] and hx(q) in SHIRT), None)
            if k is not None:
                g[f][y][x] = [g[f][y][x - 1], g[f][y][x + 1], g[f][y - 1][x], g[f][y + 1][x]][k]
        for y, x in want:
            if w[f][y][x][3] and hx(w[f][y][x]) in SHIRT:
                g[f][y][x] = strap
    return g


# ★ 걷기 3번째 장(4번)은 뒤로 흔든 왼팔과 몸통 사이가 비어 배경이 비쳤고, 망토도 그 틈에서 윤곽선으로 끊겨 있었다.
#   팔 모양은 원본 그대로 두고, 20~30줄에서 팔(또는 손) 오른끝과 몸통 사이의 빈 칸·윤곽선 칸만 망토로 채운다
#   (주름 색은 팔 아래 망토의 같은 열 색, 팔에 붙은 칸은 가장 어두운 색 = 그늘). 칸 번호는 36×46 기준.
GAP_FRAME, GAP_ROWS = 4, range(20, 31)
# 윗팔 띠(줄: 소매 왼끝·그늘 시작) — 어깨에서 팔꿈치로 내려가며 왼쪽(뒤)으로 기운다
UPPER_ARM = {17: (10, 12), 18: (10, 12), 19: (9, 12), 20: (9, 11), 21: (8, 11), 22: (8, 11), 23: (7, 11), 24: (7, 11), 25: (7, 11)}


def fill_arm_gap(c, pal):
    OUTC = outline_color(c)
    capec = set(pal)
    colc = {x: c[33][x] for x in range(4, 13)}          # 팔 아래 망토의 열마다 색(주름)
    body = lambda p: p[3] and p != OUTC and p not in capec
    for y in GAP_ROWS:
        te = next(x for x in range(10, FW - 2) if all(body(c[y][x + k]) for k in range(3)))   # 몸통 왼끝
        arm = [x for x in range(3, te) if body(c[y][x])]
        x0 = (max(arm) + 1) if arm else next((x for x in range(3, te) if c[y][x] in capec), te)
        for x in range(x0, te):
            if not c[y][x][3] or c[y][x] == OUTC:
                c[y][x] = pal[0] if arm and x == x0 else colc.get(x, pal[1])
    # ★ 윗팔 — 원본은 소매가 23줄(허리 높이)에서 갑자기 시작하고 그 위 어깨까지는 망토뿐이라, 팔이 어깨가 아니라 허리에서
    #   돋은 것처럼 보였다(사용자 지적 · 거짓 색 지도로 확인). 어깨(17줄 몸통 가장자리)에서 소매 윗끝까지 비스듬한 소매 띠를
    #   칠하고(몸통에 붙는 칸은 그늘), 망토 쪽 바깥에 윤곽선을 둔다. 23~25줄은 소매를 몸통까지 잇는다 — 망토는 팔꿈치 아래만.
    sleeve = c[24][7]
    shade = tuple(max(0, round(v * 0.8)) for v in sleeve[:3]) + (255,)
    for y, (x0, x1) in UPPER_ARM.items():
        te = next(x for x in range(10, FW - 2) if all(body(c[y][x + k]) for k in range(3)))
        for x in range(x0, te):
            c[y][x] = shade if x >= x1 else sleeve
        if c[y][x0 - 1] in capec or not c[y][x0 - 1][3]:
            c[y][x0 - 1] = OUTC
    return c

# ★ 테두리에서 닿지 않는 속 빈 칸(몸 윤곽 안의 구멍 — 공격 장 뒷팔과 몸통 사이 9~10열 24~29줄 따위)은 배경이 비쳐 팔이
#   끊겨 보였다(사용자 지적). 몸 뒤는 늘 망토라 망토색으로 메운다(몸에 붙은 칸은 그늘). 다리 사이 틈(11~15열 · 31줄 아래에만
#   있는 구멍)은 그림이 그런 것이라 그대로 둔다.
def fill_holes(c, pal):
    from collections import deque
    OUTC = outline_color(c)
    capec = set(pal)
    out = [[False] * FW for _ in range(FH)]
    q = deque((x, y) for y in range(FH) for x in range(FW)
              if (x in (0, FW - 1) or y in (0, FH - 1)) and not c[y][x][3])
    for x, y in q:
        out[y][x] = True
    while q:
        x, y = q.popleft()
        for a, b in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= a < FW and 0 <= b < FH and not c[b][a][3] and not out[b][a]:
                out[b][a] = True
                q.append((a, b))
    seen = set()
    for y in range(FH):
        for x in range(FW):
            if c[y][x][3] or out[y][x] or (x, y) in seen:
                continue
            comp, q = [], deque([(x, y)])
            seen.add((x, y))
            while q:
                a, b = q.popleft()
                comp.append((a, b))
                for u, v in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if not c[v][u][3] and (u, v) not in seen:
                        seen.add((u, v))
                        q.append((u, v))
            if all(11 <= a <= 15 and b >= 31 for a, b in comp):
                continue                                # 다리 사이
            body = lambda p: p[3] and p != OUTC and p not in capec
            for a, b in comp:
                near = any(body(c[v][u]) for u, v in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)))
                c[b][a] = pal[0] if near else pal[1]
    return c


def main():
    man_p = os.path.join(ROOT, 'manifest.json')
    man = json.load(open(man_p, encoding='utf-8'))
    sheets = man['characters']['sheets']
    hands = None
    for cid in IDS:
        key = 'player_' + cid
        wsrc = frames_of(os.path.join(SRC, 'player_wanderer.png'))
        raw = fix_frames(frames_of(os.path.join(SRC, key + '.png')), wsrc)
        pal, pal12 = cape_palettes(wsrc, raw)            # 손을 고치기 전 그림으로 — 피격 장 물들임 맞춤이 흔들리지 않게
        src = recolor_gear(strap_fix(unify_hands([[r[:] for r in f] for f in raw], wsrc), wsrc), cid)
        frames = [drape(rebuild(g), i, pal12 if i == 12 else pal, 900 if i == 12 else None) for i, g in enumerate(src)]
        frames[GAP_FRAME] = fill_arm_gap(frames[GAP_FRAME], pal)
        frames = [fill_gear_gap(c, cid, i, pal) for i, c in enumerate(frames)]
        frames = [fill_slits(c) if i in SLIT_FRAMES else c for i, c in enumerate(frames)]
        frames = [fill_holes(c, pal12 if i == 12 else pal) for i, c in enumerate(frames)]
        if cid == 'wanderer':
            hs = [FIXED.get(i) or hand_of(c, i in HIGH) for i, c in enumerate(frames)]
            # 피격(붉게 물든 장)처럼 살색이 안 잡히는 장은 첫 장의 손을 쓴다
            hands = [h or hs[0] for h in hs]
        frames = [polish(c) for c in frames]
        save(frames, os.path.join(CHAR, key + '.png'))
        m = sheets[key]
        m.update({'file': 'char/%s.png' % key, 'frameW': FW, 'frameH': FH, 'ox': -1 - PX, 'oy': -1 - PY, 'count': N,
                  'hand': [h[0] for h in hands], 'handBox': [h[1] for h in hands]})
        print('wrote', key)
    # 리그 시절 산출물(팔·망토를 코드로 그리던 몸 시트 · 누운 헤엄 시트)은 이제 안 쓴다
    for cid in IDS:
        for suf in ('_rig', '_swim', '_body', '_cape'):
            sheets.pop('player_' + cid + suf, None)
            p = os.path.join(CHAR, 'player_' + cid + suf + '.png')
            if os.path.exists(p):
                os.remove(p)
    json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(man_p, 'a', encoding='utf-8').write('\n')


if __name__ == '__main__':
    main()
