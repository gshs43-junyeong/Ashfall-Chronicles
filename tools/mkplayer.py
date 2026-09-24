#!/usr/bin/env python3
"""주인공 시트 다섯 장을 **원래 손그림 그대로**, 잘린 데 없이 다시 굽는다.

  python3 tools/mkplayer.py           # tools/art/player_<id>.png → game/assets/char/player_<id>.png
  python3 tools/sync-manifest.py      # 그다음 매니페스트 옮겨 적기

★ 원본은 tools/art/ 의 22×41 시트(unclip.py 를 거친 것)다. game/assets/char/ 의 것은 **산출물**이라
  그걸 다시 먹이면 두 번 늘어난다. 그림을 고치려면 tools/art/ 를 고치고 이걸 돌린다.

■ 왜 다시 굽나
  처음 그림은 20×40 칸에 꽉 차게 그려져 칸 벽에 닿은 곳이 칼로 자른 듯 끊겨 있었다 — 정수리 · 망토 뒷자락
  (왼쪽 벽) · 앞으로 뻗은 손과 발(오른쪽 벽). unclip.py 는 칸을 한 줄 넓혀 그 단면에 **윤곽선만** 그었다.
  그래서 잘린 자리가 "닫히기"는 했지만 모양은 그대로 납작했다(정수리가 평평하고 손이 네모로 끝났다).
  그 다음에는 팔·다리·망토를 코드로 새로 그렸는데(리그), 원래 그림의 명암·주름·옷 결이 다 빠져
  "그림이 너프됐다"는 말을 들었다. 이번에는 원래 그림을 **한 픽셀도 바꾸지 않고**, 잘린 자리만 이어 그린다.

■ 어떻게 잇나
  unclip.py 가 덧댄 칸(맨 왼쪽 · 맨 오른쪽 열, 맨 윗줄)의 픽셀이 곧 "여기서 잘렸다"는 표시다. 그것을 걷어 내고,
  잘린 줄마다 한 토막씩 묶어 바깥으로 늘인다 — 깊이는 상한(옆 2칸 · 위 1칸)까지 **곧게** 나가고 토막 양 끝에서만
  한 칸씩 깎는다(모서리 깎기). ★ 처음에는 반타원으로 둥글게 늘였는데, 망토 밑자락(왼쪽 벽에 잘린 긴 토막)이
  둥근 주머니처럼 부풀어 "물포대"가 도로 생겼고, 정수리는 뾰족한 두건이 됐다. 천 자락은 곧게 떨어져야 한다.
  ★ 정수리는 **늘리지 않는다**(상한 0 — 단면에 윤곽선만). 한 줄만 얹어도 머리 꼭대기 토막이 다섯 칸뿐이라
  가운데 세 칸이 솟아 두건 꼭지처럼 보였다. 원래 머리 모양이 우선이다. 채우는 색은 그 줄의 잘린 픽셀 색(윤곽선이면 한 칸
  안쪽 색)을 그대로 끌어 내므로 옷의 줄무늬·명암이 그 방향으로 이어진다. 끝으로 새로 칠한 칸 둘레에만
  윤곽선을 두른다 — 원래 윤곽선은 그대로다.

■ 칸과 판정
  22×41 을 32×46 칸의 (5,4) 에 놓는다. 매니페스트 ox/oy 를 -6/-5 로 두어 몸은 예전 자리 그대로 선다 —
  판정 상자(20×40)도 그림 속 발 위치도 그대로다. 좌우로 5칸씩 똑같이 넓혔으므로 뒤집어 그려도 가운데가 안 틀어진다.

■ 손 자리(무기 쥐는 곳)
  방랑자 시트에서 프레임마다 얼굴 아닌 살색 덩어리 중 가장 앞(오른쪽)에 있는 것을 무기 손으로 잡아(예외는 HIGH·FIXED)
  hand([x, y]) · handBox([x0, y0, x1, y1]) 로 매니페스트에 적는다. 다섯 장은 색만 다르고 몸 모양이 같아서
  (mkchars.py) 한 장에서 잰 것을 다섯 장에 쓴다. 게임은 무기를 이 손에 쥐여 그리고, 손 칸을 무기 위에 한 번 더
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
FW, FH = 32, 46                         # 새 프레임
PX, PY = 5, 4                           # 원본을 놓는 자리
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
#   다른 캐릭터는 같은 자리 색으로 옮겨 쓴다(mkchars.py 가 부위마다 색만 바꿔 구웠다).
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


def main():
    man_p = os.path.join(ROOT, 'manifest.json')
    man = json.load(open(man_p, encoding='utf-8'))
    sheets = man['characters']['sheets']
    hands = None
    for cid in IDS:
        key = 'player_' + cid
        wsrc = frames_of(os.path.join(SRC, 'player_wanderer.png'))
        src = fix_frames(frames_of(os.path.join(SRC, key + '.png')), wsrc)
        frames = [rebuild(g) for g in src]
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
