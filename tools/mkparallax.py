#!/usr/bin/env python3
"""잿빛 숲 · 울림 정글 원경을 **처음부터** 굽는다 — 1920×400, 가로로 이음매 없이 반복, 위쪽은 투명(게임 하늘이 비침).

    python3 tools/mkparallax.py

  bg/parallax_forest_lush.png   잎이 가장 우거진 것   (서장~1장)
  bg/parallax_forest_mid.png    성글어진 것           (3~4장)
  bg/parallax_forest_thin.png   가지 끝에만 남은 것   (5~7장)
  bg/parallax_forest.png        죽은 나무만           (8장 · 타이틀 · 캠프 · 마을)
  bg/parallax_jungle.png        울림 정글
  그 밖의 바이옴(서리 · 빙하 · 부패 · 사구 · 버섯 · 바다 · 하늘 · 마을 · 지옥 · 유적 · 공장)은 parallax_biomes.py — 같은 결로 굽는다

■ 왜 다시 굽나
  예전 숲 원경은 손그림(죽은 나무) 위에 잎을 **찾아 얹었다**(mkforestbg.py). 줄기를 그림에서 찾는 일이 늘 몇 그루를 놓쳐
  우거진 장에서도 앞 층 나무 절반이 맨 장대로 남았다(사용자 지적 2026-10-11). 여기서는 나무를 **먼저 정하고** 그린다 —
  네 장이 같은 언덕 · 같은 줄기를 쓰고 잎만 단계마다 줄어, 장이 넘어갈 때 섞어도 지형이 흔들리지 않는다.
  정글 원경은 평평한 반구 덩어리 아래 검은 네모가 뚫려 있어 숲으로 안 읽혔다 — 우산 수관 · 야자 · 늘어진 덩굴 · 고사리 덤불로.

■ 색
  숲은 푸른 회색(밝기만) — 초록은 게임(`G.forestBg`)이 장에 따라 눕힌다. 잎은 제 층 실루엣보다 **밝게**(더하기) 떠야 잎으로 읽힌다.
  정글은 색을 구워 둔다(게임이 다시 칠하지 않는다).
"""
import math, os, random
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets', 'bg')
W, H = 1920, 400


def lift(c, n):
    return tuple(max(0, min(255, v + n)) for v in c[:3])


class Canvas:
    """가로로 감기는 그림판 — 모든 도형을 x-W · x · x+W 세 번 그려 이음매를 없앤다"""
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def ell(self, cx, cy, rx, ry, c):
        for o in (-W, 0, W):
            if -rx - 2 <= cx + o <= W + rx + 2:
                self.d.ellipse([cx + o - rx, cy - ry, cx + o + rx, cy + ry], fill=c + (255,) if len(c) == 3 else c)

    def poly(self, pts, c):
        for o in (-W, 0, W):
            xs = [p[0] + o for p in pts]
            if max(xs) < -2 or min(xs) > W + 2:
                continue
            self.d.polygon([(p[0] + o, p[1]) for p in pts], fill=c + (255,) if len(c) == 3 else c)

    def line(self, pts, c, w):
        for o in (-W, 0, W):
            xs = [p[0] + o for p in pts]
            if max(xs) < -w - 2 or min(xs) > W + w + 2:
                continue
            self.d.line([(p[0] + o, p[1]) for p in pts], fill=c + (255,) if len(c) == 3 else c, width=w)

    def rect(self, x0, y0, x1, y1, c):
        self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], c)


def wave(rng, base, amp, terms):
    """가로로 감기는 언덕선 — 주기가 W 의 약수인 사인 합"""
    ks = [(rng.choice(terms), rng.uniform(0, math.tau), rng.uniform(0.5, 1)) for _ in range(len(terms))]
    tot = sum(a for _, _, a in ks)
    return [base + amp * sum(a * math.sin(k * math.tau * x / W + ph) for k, ph, a in ks) / tot for x in range(W)]


def hill(cv, line, c, shade=None):
    pts = [(x, line[x]) for x in range(0, W, 4)] + [(W, line[0]), (W, H), (0, H)]
    cv.poly(pts, c)
    if shade:                                                         # 능선 바로 밑 한 줄 밝게 — 겹이 갈린다
        cv.line([(x, line[x] + 1) for x in range(0, W, 4)] + [(W, line[0] + 1)], shade, 2)


def canopy(cv, cx, cy, rx, ry, col, rng, ragged=0.2, clumps=30):
    """작은 덩이 여럿을 겹친 갓 — 아래 그늘 · 가운데 · 빛 받는 위 · 꼭대기 한 겹"""
    dark, mid, leaf, lite = lift(col, 9), lift(col, 18), lift(col, 28), lift(col, 40)
    n = max(10, int(clumps * (1.2 + rx / 10)))
    blobs = []
    for _ in range(n):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0, 1) ** 0.5
        bx, by = cx + math.cos(a) * d * rx, cy + math.sin(a) * d * ry
        r = max(1.4, (0.07 + 0.12 * (1 - d)) * rx * (1 - ragged * rng.uniform(0, 0.6)))
        blobs.append((by, bx, r))
    for by, bx, r in sorted(blobs, key=lambda b: -b[0]):              # 아래 것부터 — 위 덩이가 덮는다
        rel = (by - cy) / max(ry, 1)
        c = dark if rel > 0.3 else mid if rel > -0.05 else lite if rel < -0.55 else leaf
        cv.ell(bx, by, r, r * 0.9, c)


def _limb(cv, x, y, a, L, bw, col, rng, depth):
    """가지 하나 — 살짝 굽어 뻗고 끝에서 둘(가끔 셋)로 갈라진다. a 는 수직에서 기운 각(라디안, 오른쪽 +)"""
    bend = rng.uniform(-0.25, 0.25)
    xm, ym = x + math.sin(a) * L * 0.5, y - math.cos(a) * L * 0.5
    x1, y1 = xm + math.sin(a + bend) * L * 0.5, ym - math.cos(a + bend) * L * 0.5
    cv.line([(x, y), (xm, ym), (x1, y1)], col, bw)
    if depth <= 0 or L < 4:
        return
    k = 3 if rng.random() < 0.3 else 2
    for j in range(k):
        da = (j - (k - 1) / 2) * rng.uniform(0.45, 0.75) + rng.uniform(-0.12, 0.12)
        _limb(cv, x1, y1, max(-1.45, min(1.45, a + bend + da)), L * rng.uniform(0.5, 0.68), max(1, bw - 1), col, rng, depth - 1)
    if rng.random() < 0.55:                                              # 곁가지 — 중간에서 바깥으로 짧게
        s = 1 if a >= 0 else -1
        _limb(cv, xm, ym, a + s * rng.uniform(0.5, 0.9), L * 0.38, max(1, bw - 1), col, rng, depth - 2)


def branches(cv, x, top, h, wdt, col, rng, n, reach):
    """맨 가지 — 줄기 위쪽 여러 높이에서 갈래 가지가 부채처럼 뻗는다. 끝은 갓 반지름(reach) 안 — 우거진 장에서 가지가 갓 밖으로 삐죽 나오면 맨 나무로 읽혔다
    ★ 가지 둘 · 한 번 갈래면 Y 자 장대로 읽혀 숲이 허전했다(사용자 지적 2026-10-15) — 줄기 끝 갈래 + 좌우 가지 n+2, 두세 번 갈라진다"""
    bw = max(1, int(wdt * 0.45))
    depth = 3 if reach > 25 else 2
    _limb(cv, x, top + 2, rng.uniform(-0.15, 0.15), reach * 0.36, max(1, bw), col, rng, depth)   # 줄기 끝 갈래
    m = n + 2
    for i in range(m):
        y0 = top + min(h * 0.5, reach * (0.12 + 0.6 * (i + rng.uniform(0, 0.8)) / m))
        s = -1 if i % 2 == 0 else 1
        a = s * math.radians(rng.uniform(32, 66))
        _limb(cv, x, y0, a, reach * rng.uniform(0.38, 0.55), bw, col, rng, depth - (1 if i >= m - 2 else 0))


# ---------------- 잿빛 숲 ----------------
FOREST_LAYERS = [
    # 실루엣 색,       능선 기준 · 진폭, 나무 수, 줄기 폭, 키,          갓 반지름
    ((56, 63, 73), 196, 26, 70, (2, 3), (26, 46), (11, 17)),
    ((30, 34, 42), 252, 22, 46, (4, 6), (44, 80), (18, 27)),
    ((18, 20, 25), 318, 16, 26, (7, 11), (78, 150), (30, 44)),
]
STAGES = [
    # 이름(파일)                  갓 크기  남는 나무  헤짐   능선 잎
    ('parallax_forest_lush.png', 1.00, 1.00, 0.18, 1.0),
    ('parallax_forest_mid.png', 0.70, 0.86, 0.40, 0.5),
    ('parallax_forest_thin.png', 0.42, 0.55, 0.65, 0.15),
    ('parallax_forest.png', 0.0, 0.0, 0.0, 0.0),
]


def forest_plan():
    rng = random.Random(20261011)
    plan = []
    for li, (col, base, amp, n, tw, th, cr) in enumerate(FOREST_LAYERS):
        line = wave(rng, base, amp, [1, 2, 3, 5, 7])
        trees = []
        xs = sorted(rng.uniform(0, W) for _ in range(n))
        for i, x in enumerate(xs):
            wdt = rng.randint(*tw); h = rng.randint(*th)
            gy = line[int(x) % W]
            trees.append(dict(x=x, gy=gy, top=gy - h, h=h, w=wdt, r=rng.uniform(*cr), seed=rng.randrange(1 << 30),
                              keep=rng.random(), nb=rng.randint(2, 4)))
        plan.append((col, line, trees))
    return plan


def forest(stage, plan):
    name, scale, keep, ragged, ridge = stage
    cv = Canvas()
    for li, (col, line, trees) in enumerate(plan):
        hill(cv, line, col, lift(col, 6))
        # 능선을 덮는 잎 띠 — 낱낱이 선 나무 사이를 메운다(우거진 장만)
        if ridge > 0:
            r2 = random.Random(77 + li)
            for x in range(0, W, 3):
                if r2.random() > ridge * 0.55:
                    continue
                rr = r2.uniform(1.5, 3.6) * (1 + li * 0.5)
                cv.ell(x + r2.uniform(-1, 1), line[x] - r2.uniform(0, 2.5) * (1 + li * 0.3), rr, rr * 0.85,
                       lift(col, 24 if r2.random() < 0.7 else 34))
        for t in trees:
            rng = random.Random(t['seed'])
            x, top, h, wdt = t['x'], t['top'], t['h'], t['w']
            tcol = lift(col, -3) if li == 2 else col
            cv.poly([(x - wdt / 2, t['gy'] + 4), (x - wdt * 0.32, top + 2), (x + wdt * 0.32, top + 2), (x + wdt / 2, t['gy'] + 4)], tcol)   # 위로 가늘어진다
            branches(cv, x, top, h, wdt, tcol, rng, t['nb'], t['r'])
            if scale > 0 and t['keep'] < keep:
                rx = t['r'] * scale
                canopy(cv, x, top + t['r'] * 0.05, rx, rx * 0.78, col, random.Random(t['seed'] + 1), ragged, 40)
                if scale > 0.6 and li > 0:                                    # 곁 뭉치 — 큰 나무는 갓이 여럿
                    for s in (-1, 1):
                        canopy(cv, x + s * rx * 0.62, top + rx * 0.55, rx * 0.5, rx * 0.38, col, random.Random(t['seed'] + 2 + s), ragged, 14)
    return cv.im


# ---------------- 울림 정글 ----------------
def jungle():
    rng = random.Random(20261012)
    cv = Canvas()
    FAR, MIDC, NEAR, DEEP = (60, 104, 72), (34, 66, 44), (20, 42, 28), (11, 24, 17)
    # 먼 산 능선 + 그 위 우거진 수관선(브로콜리 지평)
    far = wave(rng, 168, 30, [1, 2, 3, 4])
    hill(cv, far, FAR)
    for x in range(0, W, 9):
        r = rng.uniform(9, 17)
        cv.ell(x, far[x] - r * 0.35, r, r * 0.75, lift(FAR, rng.choice([0, 6, 12])))
    for _ in range(9):                                                 # 우뚝 솟은 큰 나무(우산 수관)
        x = rng.uniform(0, W); gy = far[int(x)] - 6; h = rng.uniform(34, 56)
        cv.line([(x, gy), (x, gy - h)], lift(FAR, -8), 3)
        canopy(cv, x, gy - h, rng.uniform(20, 30), rng.uniform(6, 9), lift(FAR, -6), random.Random(rng.randrange(1 << 30)), 0.15, 18)
    # 안개 띠는 넣지 않는다 — 옅게 깔아도 먼 산 위 밝은 줄로 떠서 강처럼 보였다
    # 수관 벽 — 가운데 겹 나무 뒤를 빽빽한 잎으로 메운다(틈으로 먼 산이 비치면 숲이 성겨 보였다)
    wall = wave(rng, 214, 14, [3, 5, 7])
    for x in range(0, W, 6):
        r = rng.uniform(10, 18)
        cv.ell(x, wall[x], r, r * 0.8, lift((46, 86, 58), rng.choice([0, 6, 12, 18])))
    cv.poly([(x, wall[x] + 6) for x in range(0, W, 4)] + [(W, wall[0] + 6), (W, 300), (0, 300)], (40, 78, 52))
    # 가운데 겹 — 곧은 줄기 · 넓은 우산 수관 · 야자 · 늘어진 덩굴
    mid = wave(rng, 268, 16, [2, 3, 5])
    hill(cv, mid, MIDC)
    for x in range(0, W, 7):
        r = rng.uniform(7, 13)
        cv.ell(x, mid[x] - r * 0.3, r, r * 0.7, lift(MIDC, rng.choice([4, 10, 16])))
    xs = sorted(rng.uniform(0, W) for _ in range(34))
    for i, x in enumerate(xs):
        gy = mid[int(x) % W]
        if i % 3 == 2:                                                 # 야자 — 굽은 줄기 · 부채 잎
            h = rng.uniform(70, 110); bend = rng.uniform(-18, 18)
            pts = [(x + bend * (k / 10) ** 2, gy - h * k / 10) for k in range(11)]
            cv.line(pts, lift(MIDC, -6), 4)
            hx, hy = pts[-1]
            for a in range(9):
                ang = math.radians(-170 + a * 20 + rng.uniform(-6, 6))
                L = rng.uniform(22, 32)
                tip = (hx + math.cos(ang) * L, hy + math.sin(ang) * L * 0.6 + L * 0.35)
                midp = (hx + math.cos(ang) * L * 0.55, hy + math.sin(ang) * L * 0.35 - 3)
                cv.line([(hx, hy), midp, tip], lift(MIDC, 14), 3)
        else:                                                          # 큰 나무 — 버팀뿌리 · 우산 수관
            h = rng.uniform(80, 140); wdt = rng.randint(5, 8)
            cv.poly([(x - wdt, gy + 2), (x - wdt * 0.4, gy - h), (x + wdt * 0.4, gy - h), (x + wdt, gy + 2)], lift(MIDC, -8))
            for s in (-1, 1):                                          # 버팀뿌리
                cv.poly([(x, gy - 18), (x + s * 14, gy + 2), (x + s * 6, gy + 2)], lift(MIDC, -8))
            rx = rng.uniform(30, 46)
            canopy(cv, x, gy - h, rx, rx * 0.36, MIDC, random.Random(rng.randrange(1 << 30)), 0.15, 26)
            for _ in range(rng.randint(2, 5)):                         # 늘어진 덩굴
                vx = x + rng.uniform(-rx * 0.8, rx * 0.8); vy = gy - h + rx * 0.2; L = rng.uniform(20, 60)
                cv.line([(vx, vy), (vx + rng.uniform(-3, 3), vy + L)], lift(MIDC, 4), 1)
                for k in range(3, int(L), 7):
                    cv.ell(vx + (2 if k % 2 else -2), vy + k, 2, 1.4, lift(MIDC, 16))
    # 가까운 겹 — 짙은 덤불 · 큰 잎(바나나 · 고사리)
    near = wave(rng, 336, 10, [3, 4, 6])
    hill(cv, near, NEAR)
    for x in range(0, W, 5):
        r = rng.uniform(6, 11)
        cv.ell(x, near[x] - r * 0.25, r, r * 0.6, lift(NEAR, rng.choice([2, 8, 14])))
    for _ in range(46):
        x = rng.uniform(0, W); gy = near[int(x) % W]
        if rng.random() < 0.5:                                         # 바나나 잎 — 굽은 넓은 잎
            for a in range(rng.randint(3, 5)):
                ang = math.radians(rng.uniform(-150, -30)); L = rng.uniform(22, 40)
                tip = (x + math.cos(ang) * L, gy + math.sin(ang) * L)
                nx, ny = -math.sin(ang) * L * 0.18, math.cos(ang) * L * 0.18
                m = (x + math.cos(ang) * L * 0.5, gy + math.sin(ang) * L * 0.5)
                cv.poly([(x, gy), (m[0] + nx, m[1] + ny), tip, (m[0] - nx, m[1] - ny)], lift(NEAR, rng.choice([6, 12, 18])))
        else:                                                          # 고사리 — 깃털 잎
            for a in range(5):
                ang = math.radians(-160 + a * 35); L = rng.uniform(14, 24)
                for k in range(1, 7):
                    px, py = x + math.cos(ang) * L * k / 6, gy + math.sin(ang) * L * k / 6 + (k / 6) ** 2 * 6
                    cv.ell(px, py, 2.4 - k * 0.25, 1.2, lift(NEAR, 10 + k))
    cv.rect(0, max(near) + 12, W, H, DEEP)
    for x in range(0, W, 3):                                           # 바닥 그늘 — 가장 가까운 덤불이 화면 밑을 닫는다
        cv.d.line([(x, near[x] + 14), (x, H)], fill=DEEP + (255,))
    return cv.im


def check_wrap(im, name):
    """첫 열과 끝 열이 이어지는지 — 감기 그림이 틀리면 원경이 반복 자리에서 끊긴다"""
    px = im.load()
    bad = sum(1 for y in range(H) if (px[0, y][3] > 0) != (px[W - 1, y][3] > 0))
    if bad > 12:
        raise SystemExit(f'{name}: 가장자리 열이 {bad}줄 어긋난다')


def main():
    plan = forest_plan()
    for st in STAGES:
        im = forest(st, plan)
        check_wrap(im, st[0])
        im.save(os.path.join(ROOT, st[0]))
        print('wrote', st[0])
    im = jungle()
    check_wrap(im, 'jungle')
    im.save(os.path.join(ROOT, 'parallax_jungle.png'))
    print('wrote parallax_jungle.png')
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from parallax_biomes import BIOMES
    for name, fn in BIOMES:
        im = fn()
        check_wrap(im, name)
        im.save(os.path.join(ROOT, name), optimize=True)
        print('wrote', name)


if __name__ == '__main__':
    main()
