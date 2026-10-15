"""바이옴 원경 — 잿빛 숲 · 정글과 같은 결(가로로 감기는 그림판 · 세 겹 언덕 · 능선 한 줄 밝게 · 작은 덩이 겹친 갓)로 나머지를 굽는다.

mkparallax.py 가 부른다. 그림마다 1920×400 · 위는 투명(게임 하늘이 비침) · 맨 아랫줄은 꽉 채운다(게임이 아랫줄을 늘여 바닥 틈을 메운다).
★ PIL 은 반투명을 섞지 않고 덮어쓴다 — 연기 · 안개도 불투명한 색으로(반투명이면 뒤 그림에 구멍이 난다).
★ 모든 도형은 Canvas(x-W · x · x+W 세 번)로 그린다 — 맨손으로 d.polygon 을 부르면 반복 자리에서 능선이 끊긴다(예전 손그림 열한 장이
  첫 열 · 끝 열이 4~112px 어긋나 걸을 때 이음매가 꺾였다). 언덕선은 wave(주기가 W 의 약수)로만 만든다.
"""
import math, random
from mkparallax import Canvas, W, H, lift, wave, hill, canopy


def ridge_dust(cv, line, col, rng, step=3, rmin=1.2, rmax=3.0, k=0.5):
    """능선을 덮는 작은 덩이 — 맨 선 대신 결이 생긴다"""
    for x in range(0, W, step):
        if rng.random() > k:
            continue
        r = rng.uniform(rmin, rmax)
        cv.ell(x + rng.uniform(-1, 1), line[x] - rng.uniform(0, 2), r, r * 0.8, col)


def floor(cv, line, col, pad=10):
    lo = int(max(line)) + pad
    cv.rect(0, lo, W, H, col)
    for x in range(0, W, 2):
        cv.d.line([(x, line[x] + 6), (x, lo)], fill=col + (255,))


# ---------------- 서리 지대 — 눈 덮인 침엽수 언덕 · 먼 설산 ----------------
def pine(cv, x, gy, h, w, col, snow, rng):
    """톱니 원뿔 소나무 — 층마다 윗면에 눈"""
    tiers = max(3, int(h / 9))
    cv.line([(x, gy + 2), (x, gy - h * 0.25)], lift(col, -6), max(1, int(w * 0.18)))
    for i in range(tiers):
        u = i / tiers
        ty = gy - h * 0.15 - h * 0.85 * u
        bw = w * (1 - u * 0.85) * 0.5
        th = h * 0.85 / tiers * 1.6
        cv.poly([(x - bw, ty), (x, ty - th), (x + bw, ty)], col)
        if snow:
            cv.poly([(x - bw * 0.55, ty - th * 0.45), (x, ty - th * 0.98), (x + bw * 0.4, ty - th * 0.5), (x, ty - th * 0.62)], snow)
            if rng.random() < 0.7:
                cv.line([(x - bw + 1, ty - 1), (x - bw * 0.3, ty - 2)], snow, 1)


def snow():
    rng = random.Random(20261015)
    cv = Canvas()
    PEAK, PEAKS, FAR, MID, NEAR, DEEP = (122, 140, 166), (226, 236, 246), (96, 116, 140), (62, 80, 102), (36, 48, 64), (22, 30, 42)
    peaks = wave(rng, 150, 46, [2, 3, 4, 6])                          # 먼 설산 — 날카로운 봉우리
    pts = []
    for x in range(0, W, 6):
        jag = (x * 37 % 23) / 23 * 10
        pts.append((x, peaks[x] - jag))
    cv.poly(pts + [(W, peaks[0]), (W, H), (0, H)], PEAK)
    cap = [(x0, y0) for x0, y0 in pts]                                # 눈 덮인 봉우리 머리 — 능선을 따라 띠, 아래 끝은 톱니
    low = [(x0, y0 + 6 + (x0 * 13 % 17) / 17 * 14 * (1 if y0 < 140 else 0.4)) for x0, y0 in pts]
    cv.poly(cap + [(W, peaks[0]), (W, low[0][1])] + low[::-1], PEAKS)
    for x0, y0 in pts[::3]:                                           # 그늘진 골짜기 결
        cv.line([(x0, y0 + 4), (x0 + 6, y0 + 22)], lift(PEAK, -10), 1)
    cv.line([(x, y + 1) for x, y in pts] + [(W, peaks[0] + 1)], lift(PEAKS, -20), 1)
    for li, (col, base, amp, n, hr, wr) in enumerate([(FAR, 236, 20, 70, (18, 30), (8, 12)), (MID, 286, 16, 44, (34, 56), (14, 20)),
                                                     (NEAR, 340, 12, 24, (60, 96), (22, 32))]):
        line = wave(rng, base, amp, [1, 2, 3, 5])
        hill(cv, line, col)
        snowc = lift(PEAKS, -14 - li * 22)
        cv.line([(x, line[x]) for x in range(0, W, 3)] + [(W, line[0])], snowc, 3 + li)      # 언덕 위 눈 이불
        for _ in range(n):
            x = rng.uniform(0, W); gy = line[int(x) % W] + 2
            pine(cv, x, gy, rng.uniform(*hr), rng.uniform(*wr), lift(col, -8), snowc, rng)
        ridge_dust(cv, line, lift(snowc, 6), rng, 4, 1, 2.2, 0.4)
    floor(cv, wave(rng, 360, 4, [3]), DEEP)
    return cv.im


# ---------------- 빙하 지대 — 깎인 얼음 절벽 · 세락 · 갈라진 틈(나무 없음) ----------------
def serac(cv, x, gy, h, w, col, rng):
    """세락 — 각진 얼음 탑: 날카로운 머리 · 빛 받는 왼면 · 그늘진 오른면 · 세로 결 · 푸른 틈"""
    lean = rng.uniform(-0.25, 0.25) * w
    top = gy - h
    a, b2, c2 = (x - w * 0.18 + lean, top), (x + w * 0.12 + lean * 0.9, top + h * 0.06), (x + w * 0.42 + lean * 0.4, top + h * 0.34)
    pts = [(x - w / 2, gy), (x - w * 0.44 + lean * 0.3, top + h * 0.38), a, b2, c2, (x + w / 2, gy)]
    cv.poly(pts, col)
    cv.poly([(x - w / 2, gy), (x - w * 0.44 + lean * 0.3, top + h * 0.38), a, (x - w * 0.05 + lean * 0.5, gy)], lift(col, 30))   # 빛 받는 면
    cv.poly([b2, c2, (x + w / 2, gy), (x + w * 0.2 + lean * 0.3, gy)], lift(col, -16))                                   # 그늘 면
    for k in range(1, 3):
        u = k / 3
        cv.line([(x - w * 0.5 + w * u * 0.45 + lean * 0.4, gy - 2), (a[0] + (b2[0] - a[0]) * u, top + h * 0.12)], lift(col, 44), 1)
    cv.line([a, b2], (236, 248, 255), 1)
    if h > 40:
        cv.line([(x + lean * 0.35, top + h * 0.3), (x + lean * 0.2 + 2, gy - h * 0.25)], (40, 96, 140), 2)


def ice_wall(cv, x, gy, h, w, col, rng):
    """얼음 절벽 — 평평한 머리 · 세로로 갈라진 앞면 · 눈 처마"""
    cv.rect(x - w / 2, gy - h, x + w / 2, gy, col)
    for k in range(int(w / 6)):
        xx = x - w / 2 + 3 + k * 6 + rng.uniform(-1, 1)
        cv.line([(xx, gy - h + 3), (xx + rng.uniform(-2, 2), gy)], lift(col, rng.choice([-14, 14, 24])), 1)
    cv.rect(x - w / 2 - 2, gy - h - 3, x + w / 2 + 2, gy - h + 1, (226, 240, 250))
    for k in range(int(w / 8)):                                       # 처마 밑 고드름
        xx = x - w / 2 + 4 + k * 8
        cv.poly([(xx - 2, gy - h + 1), (xx + 2, gy - h + 1), (xx, gy - h + rng.uniform(4, 10))], (200, 228, 244))


def glacier():
    rng = random.Random(20261016)
    cv = Canvas()
    SKYI, FAR, MID, NEAR, DEEP, CREV = (178, 214, 232), (136, 182, 208), (92, 146, 182), (58, 104, 140), (28, 56, 80), (36, 88, 128)
    far = wave(rng, 196, 18, [2, 3, 4])                               # 먼 빙상 — 평평하고 끝이 깎인 탁자 모양
    flat = [round(v / 10) * 10 for v in far]                         # 계단처럼 끊긴 빙상 윗면
    pts = [(x, flat[x]) for x in range(0, W, 2)]
    cv.poly(pts + [(W, flat[0]), (W, H), (0, H)], FAR)
    for x in range(0, W, 2):                                          # 빙상 앞면의 세로 결
        if flat[x] != flat[(x + 2) % W]:
            cv.line([(x, min(flat[x], flat[(x + 2) % W])), (x, max(flat[x], flat[(x + 2) % W]) + 30)], lift(FAR, 18), 1)
    cv.line([(x, flat[x]) for x in range(0, W, 2)] + [(W, flat[0])], SKYI, 1)
    for x in range(0, W, 9):                                          # 앞면에 내린 푸른 줄
        if rng.random() < 0.5:
            cv.line([(x, flat[x] + 3), (x, flat[x] + rng.uniform(10, 34))], lift(FAR, -16), 1)
    # 가운데 — 얼음 절벽과 세락 무리
    mid = wave(rng, 268, 22, [2, 3, 5, 7])
    hill(cv, mid, MID, SKYI)
    for _ in range(12):
        x = rng.uniform(0, W)
        ice_wall(cv, x, mid[int(x) % W] + 8, rng.uniform(30, 52), rng.uniform(60, 120), lift(MID, 8), rng)
    for _ in range(40):
        x = rng.uniform(0, W)
        serac(cv, x, mid[int(x) % W] + 8, rng.uniform(34, 96), rng.uniform(18, 40), MID, rng)
    for _ in range(16):                                               # 갈라진 틈 — 푸르게 깊다
        x = rng.uniform(0, W); y = mid[int(x) % W] + rng.uniform(10, 30)
        cv.poly([(x - 3, y), (x + 3, y), (x + 1, y + rng.uniform(14, 30)), (x - 1, y + 6)], CREV)
    # 가까운 — 부서진 얼음덩이와 빙퇴석
    near = wave(rng, 340, 12, [3, 4, 6])
    hill(cv, near, NEAR, lift(SKYI, -30))
    for _ in range(70):
        x = rng.uniform(0, W); gy = near[int(x) % W] + 3; s = rng.uniform(5, 14)
        cv.poly([(x - s, gy), (x - s * 0.5, gy - s * 0.9), (x + s * 0.3, gy - s * 1.1), (x + s, gy)], lift(NEAR, rng.choice([8, 16, 26])))
    for _ in range(40):
        x = rng.uniform(0, W); gy = near[int(x) % W] + rng.uniform(8, 24)
        cv.ell(x, gy, rng.uniform(1.5, 3), 1.2, lift(NEAR, -10))
    floor(cv, wave(rng, 362, 4, [2]), DEEP)
    return cv.im


# ---------------- 부패한 땅 — 비틀린 가시 탑 · 살덩이 둔덕 · 죽은 가시나무 · 포자 ----------------
def spire(cv, x, gy, h, w, col, rng):
    """비틀린 가시 탑 — 세 마디로 꺾이며 가늘어진다"""
    pts_l, pts_r, cx = [], [], x
    for i in range(7):
        u = i / 6
        cx += rng.uniform(-w * 0.25, w * 0.25)
        ww = w * (1 - u * 0.92) / 2
        pts_l.append((cx - ww, gy - h * u)); pts_r.append((cx + ww, gy - h * u))
    cv.poly(pts_l + pts_r[::-1], col)
    for i in range(1, 5):                                             # 옆으로 돋은 가시
        u = i / 6; px, py = pts_r[i] if i % 2 else pts_l[i]
        s = 1 if i % 2 else -1
        cv.poly([(px, py), (px + s * w * 0.6, py - w * 0.5), (px, py - w * 0.3)], col)


def thorn_tree(cv, x, gy, h, col, rng):
    cv.line([(x, gy), (x + rng.uniform(-4, 4), gy - h)], col, 3)
    for _ in range(rng.randint(3, 5)):
        y0 = gy - h * rng.uniform(0.4, 0.95); s = rng.choice([-1, 1]); L = rng.uniform(8, 20)
        x1, y1 = x + s * L, y0 - L * rng.uniform(0.3, 0.9)
        cv.line([(x, y0), (x1, y1)], col, 2)
        cv.line([(x1, y1), (x1 + s * L * 0.4, y1 + L * 0.2)], col, 1)


def corrupt():
    rng = random.Random(20261017)
    cv = Canvas()
    FAR, MID, NEAR, DEEP, VEIN, GLOW = (92, 66, 112), (62, 40, 82), (38, 22, 52), (20, 10, 30), (156, 70, 122), (200, 120, 230)
    far = wave(rng, 190, 26, [1, 2, 3, 5])
    hill(cv, far, FAR, lift(FAR, 14))
    for _ in range(26):
        x = rng.uniform(0, W); spire(cv, x, far[int(x) % W] + 4, rng.uniform(40, 110), rng.uniform(8, 14), lift(FAR, -4), rng)
    mid = wave(rng, 262, 20, [2, 3, 4, 7])
    hill(cv, mid, MID, lift(MID, 16))
    for _ in range(40):                                               # 살덩이 둔덕 — 둥근 혹 · 핏줄
        x = rng.uniform(0, W); r = rng.uniform(10, 24); gy = mid[int(x) % W]
        cv.ell(x, gy, r, r * 0.55, lift(MID, 6))
        cv.line([(x - r * 0.6, gy - 1), (x - r * 0.1, gy - r * 0.35), (x + r * 0.5, gy - 2)], VEIN, 1)
    for _ in range(30):
        x = rng.uniform(0, W); thorn_tree(cv, x, mid[int(x) % W] + 2, rng.uniform(20, 44), lift(MID, -10), rng)
    for _ in range(14):
        x = rng.uniform(0, W); spire(cv, x, mid[int(x) % W] + 6, rng.uniform(60, 130), rng.uniform(12, 20), lift(MID, -6), rng)
    near = wave(rng, 334, 12, [3, 4, 6])
    hill(cv, near, NEAR, lift(NEAR, 18))
    for _ in range(24):                                               # 빛나는 웅덩이 — 땅에 고인 부패
        x = rng.uniform(0, W); gy = near[int(x) % W] + rng.uniform(6, 16); r = rng.uniform(6, 14)
        cv.ell(x, gy, r, 2.5, lift(GLOW, -40)); cv.ell(x, gy, r * 0.5, 1.2, GLOW)
    for _ in range(30):
        x = rng.uniform(0, W); thorn_tree(cv, x, near[int(x) % W] + 2, rng.uniform(30, 70), lift(NEAR, -8), rng)
    for _ in range(90):                                               # 떠다니는 포자
        x = rng.uniform(0, W); y = rng.uniform(80, 320)
        cv.ell(x, y, 1, 1, lift(GLOW, rng.choice([-30, 0])))
    floor(cv, wave(rng, 356, 4, [2]), DEEP)
    return cv.im


# ---------------- 메마른 사구 — 모래 언덕 · 층진 메사 · 먼 피라미드 · 선인장 · 바위 아치 ----------------
def mesa(cv, x, gy, h, w, col, rng):
    top = gy - h
    cv.poly([(x - w / 2, gy), (x - w * 0.42, top + 4), (x - w * 0.36, top), (x + w * 0.36, top), (x + w * 0.42, top + 4), (x + w / 2, gy)], col)
    for k in range(1, 5):                                             # 지층 띠
        y = top + h * k / 5
        cv.line([(x - w * 0.44 - k, y), (x + w * 0.44 + k, y)], lift(col, -10 if k % 2 else 8), 2)
    cv.line([(x - w * 0.36, top), (x + w * 0.36, top)], lift(col, 26), 1)


def cactus(cv, x, gy, h, col):
    cv.line([(x, gy), (x, gy - h)], col, 4)
    cv.line([(x - 6, gy - h * 0.45), (x - 6, gy - h * 0.75)], col, 3); cv.line([(x - 6, gy - h * 0.45), (x, gy - h * 0.45)], col, 3)
    cv.line([(x + 6, gy - h * 0.55), (x + 6, gy - h * 0.85)], col, 3); cv.line([(x + 6, gy - h * 0.55), (x, gy - h * 0.55)], col, 3)


def desert():
    rng = random.Random(20261018)
    cv = Canvas()
    FAR, MESA, MID, NEAR, DEEP = (214, 176, 128), (176, 120, 84), (196, 148, 96), (150, 104, 64), (92, 62, 40)
    far = wave(rng, 236, 10, [2, 3, 4])
    hill(cv, far, FAR)
    for x0 in (300, 1260):                                            # 먼 피라미드 둘
        gy = far[x0] + 4; h = 74
        cv.poly([(x0 - h * 1.1, gy), (x0, gy - h), (x0 + h * 1.1, gy)], lift(FAR, -18))
        cv.poly([(x0, gy - h), (x0 + h * 1.1, gy), (x0 + h * 0.2, gy)], lift(FAR, -34))
        for k in range(1, 7):
            y = gy - h * k / 7; hw = h * 1.1 * (1 - k / 7)
            cv.line([(x0 - hw, y), (x0 + hw, y)], lift(FAR, -26), 1)
    for x0 in (700, 1640, 980):
        mesa(cv, x0, far[x0] + 8, rng.uniform(54, 80), rng.uniform(140, 220), MESA, rng)
    arch_x = 1500                                                     # 바위 아치
    gy = far[arch_x] + 10
    cv.poly([(arch_x - 60, gy), (arch_x - 52, gy - 62), (arch_x + 48, gy - 70), (arch_x + 60, gy), (arch_x + 36, gy), (arch_x + 30, gy - 44),
             (arch_x - 28, gy - 40), (arch_x - 36, gy)], lift(MESA, 8))
    mid = wave(rng, 288, 18, [2, 3, 5, 7])                            # 모래 언덕 — 한쪽이 밝은 능선
    pts = [(x, mid[x]) for x in range(0, W, 3)]
    cv.poly(pts + [(W, mid[0]), (W, H), (0, H)], MID)
    for x in range(0, W, 3):
        if mid[(x + 3) % W] < mid[x]:                                 # 바람 받는 면만 밝게
            cv.line([(x, mid[x]), (x, mid[x] + 10)], lift(MID, 18), 3)
    cv.line([(x, mid[x]) for x in range(0, W, 3)] + [(W, mid[0])], lift(MID, 34), 1)
    for x in range(0, W, 14):                                         # 바람 물결
        y = mid[x] + rng.uniform(10, 40)
        cv.line([(x, y), (x + 8, y - 1), (x + 14, y)], lift(MID, -10), 1)
    near = wave(rng, 342, 10, [3, 4, 6])
    hill(cv, near, NEAR, lift(NEAR, 22))
    for _ in range(18):
        x = rng.uniform(0, W); cactus(cv, x, near[int(x) % W] + 2, rng.uniform(20, 38), lift(NEAR, -26))
    for _ in range(40):
        x = rng.uniform(0, W); gy = near[int(x) % W] + 2; s = rng.uniform(3, 9)
        cv.poly([(x - s, gy), (x - s * 0.4, gy - s * 0.7), (x + s * 0.5, gy - s * 0.6), (x + s, gy)], lift(NEAR, -14))
    floor(cv, wave(rng, 360, 4, [2]), DEEP)
    return cv.im


# ---------------- 버섯 골짜기 — 여러 갈래 큰 버섯 · 빛나는 갓 · 포자 ----------------
def mushroom(cv, x, gy, h, r, kind, col, cap, glow, rng):
    """kind 0 우산 · 1 길쭉한 종 · 2 겹 선반 · 3 작은 무리"""
    if kind == 3:
        for _ in range(rng.randint(3, 6)):
            xx = x + rng.uniform(-r, r); hh = rng.uniform(h * 0.2, h * 0.45); rr = rng.uniform(r * 0.2, r * 0.4)
            mushroom(cv, xx, gy, hh, rr, 0, col, cap, glow, rng)
        return
    sway = rng.uniform(-0.2, 0.2) * h
    stem = [(x + sway * (k / 8) ** 2, gy - h * k / 8) for k in range(9)]
    cv.line(stem, col, max(2, int(r * 0.22)))
    tx, ty = stem[-1]
    if kind == 0:
        cv.ell(tx, ty, r, r * 0.42, cap)
        cv.ell(tx, ty + r * 0.18, r * 0.92, r * 0.18, lift(cap, -26))    # 갓 밑 주름
        cv.line([(tx - r * 0.85, ty + r * 0.15), (tx + r * 0.85, ty + r * 0.15)], glow, 1)
    elif kind == 1:
        cv.poly([(tx - r * 0.55, ty + r * 0.2), (tx - r * 0.35, ty - r * 1.2), (tx, ty - r * 1.6), (tx + r * 0.35, ty - r * 1.2), (tx + r * 0.55, ty + r * 0.2)], cap)
        cv.line([(tx - r * 0.5, ty + r * 0.2), (tx + r * 0.5, ty + r * 0.2)], glow, 1)
    else:
        for k in range(3):                                            # 줄기 옆 선반 갓
            yy = gy - h * (0.35 + k * 0.25); s = -1 if k % 2 else 1; rr = r * (0.7 - k * 0.12)
            sx = x + sway * ((0.35 + k * 0.25)) ** 2
            cv.ell(sx + s * rr * 0.6, yy, rr, rr * 0.3, cap)
            cv.line([(sx + s * rr * 0.1, yy + rr * 0.2), (sx + s * rr * 1.4, yy + rr * 0.2)], glow, 1)
        cv.ell(tx, ty, r * 0.6, r * 0.3, cap)
    for _ in range(int(r / 3)):                                       # 갓의 빛 점
        a = rng.uniform(math.pi * 1.1, math.pi * 1.9); d = rng.uniform(0.3, 0.8)
        cv.ell(tx + math.cos(a) * r * d, ty + math.sin(a) * r * 0.35 * d, 1.2, 1.2, glow)


def glowfen():
    rng = random.Random(20261019)
    cv = Canvas()
    FAR, MID, NEAR, DEEP = (40, 74, 92), (26, 52, 66), (16, 34, 44), (8, 20, 28)
    CAPS = [(52, 112, 140), (70, 92, 150), (40, 120, 120)]
    GLOW = (130, 240, 230)
    far = wave(rng, 214, 18, [1, 2, 3, 5])
    hill(cv, far, FAR, lift(FAR, 14))
    for _ in range(26):
        x = rng.uniform(0, W)
        mushroom(cv, x, far[int(x) % W] + 4, rng.uniform(40, 90), rng.uniform(12, 26), rng.choice([0, 0, 1, 2]), lift(FAR, -6), lift(FAR, 18), lift(GLOW, -60), rng)
    mid = wave(rng, 278, 16, [2, 3, 5])
    hill(cv, mid, MID, lift(MID, 16))
    for _ in range(30):
        x = rng.uniform(0, W)
        mushroom(cv, x, mid[int(x) % W] + 4, rng.uniform(50, 130), rng.uniform(16, 38), rng.choice([0, 0, 1, 2, 3]), lift(MID, -4), rng.choice(CAPS), GLOW, rng)
    near = wave(rng, 340, 10, [3, 4, 6])
    hill(cv, near, NEAR, lift(NEAR, 14))
    for _ in range(40):
        x = rng.uniform(0, W)
        mushroom(cv, x, near[int(x) % W] + 3, rng.uniform(12, 34), rng.uniform(5, 12), rng.choice([0, 1, 3]), lift(NEAR, -4), lift(rng.choice(CAPS), -16), GLOW, rng)
    for _ in range(120):
        cv.ell(rng.uniform(0, W), rng.uniform(60, 330), 1, 1, lift(GLOW, rng.choice([-50, -20, 0])))
    floor(cv, wave(rng, 360, 4, [2]), DEEP)
    return cv.im


# ---------------- 가라앉은 바다 — 수평선 · 먼 섬과 야자 · 바위 기둥 · 물결 띠 ----------------
def sea():
    rng = random.Random(20261020)
    cv = Canvas()
    ISLE, ISLE2, SEA1, SEA2, SEA3, FOAM = (64, 96, 104), (84, 118, 120), (66, 118, 156), (44, 88, 126), (28, 60, 92), (210, 232, 240)
    hz = 250
    for x0, wdt, hgt in ((260, 220, 46), (980, 140, 30), (1520, 300, 58)):   # 먼 섬 — 야자 몇 그루
        pts = [(x0 - wdt / 2 + k * wdt / 20, hz - hgt * math.sin(math.pi * k / 20) ** 0.7 * (0.85 + 0.15 * math.sin(k * 1.7))) for k in range(21)]
        cv.poly(pts + [(x0 + wdt / 2, hz + 2), (x0 - wdt / 2, hz + 2)], ISLE)
        cv.line(pts, ISLE2, 1)
        for _ in range(int(wdt / 50)):
            px = x0 + rng.uniform(-wdt * 0.3, wdt * 0.3); py = hz - hgt * 0.7; ph = rng.uniform(18, 30); bend = rng.uniform(-6, 6)
            cv.line([(px, py), (px + bend * 0.5, py - ph * 0.5), (px + bend, py - ph)], lift(ISLE, -14), 2)
            for a in range(6):
                ang = math.radians(-170 + a * 32); L = rng.uniform(8, 13)
                cv.line([(px + bend, py - ph), (px + bend + math.cos(ang) * L, py - ph + math.sin(ang) * L * 0.5 + L * 0.3)], lift(ISLE, -8), 2)
    for x0 in (640, 1180, 1800):                                      # 바위 기둥 · 아치
        h = rng.uniform(60, 96); w = rng.uniform(26, 44)
        cv.poly([(x0 - w / 2, hz + 4), (x0 - w * 0.4, hz - h * 0.7), (x0 - w * 0.2, hz - h), (x0 + w * 0.3, hz - h * 0.9), (x0 + w / 2, hz + 4)], lift(ISLE, -18))
        cv.line([(x0 - w * 0.2, hz - h), (x0 + w * 0.3, hz - h * 0.9)], lift(ISLE2, 10), 1)
        for k in range(1, 4):
            y = hz - h * k / 4
            cv.line([(x0 - w * 0.4, y), (x0 + w * 0.35, y + 2)], lift(ISLE, -26), 1)
    cv.rect(0, hz, W, H, SEA1)                                        # 수면 — 멀수록 밝고 가늘게
    y, band = hz + 2, 2
    while y < H:
        col = SEA1 if y < 290 else SEA2 if y < 340 else SEA3
        cv.rect(0, y, W, y + band + 4, col)
        for x in range(0, W, 7):
            if rng.random() < 0.35:
                L = rng.uniform(4, 10 + (y - hz) * 0.12)
                cv.line([(x, y), (x + L, y)], lift(col, 22), 1)
        y += band + 4; band += 1
    for x in range(0, W, 3):                                          # 수평선 반짝임
        if rng.random() < 0.3:
            cv.line([(x, hz + 1), (x + 2, hz + 1)], FOAM, 1)
    return cv.im


# ---------------- 하늘 섬 — 떠 있는 섬과 폐허 · 구름 바다 ----------------
def sky():
    rng = random.Random(20261021)
    cv = Canvas()
    CL1, CL2, CL3, ROCK, ROCK2, GRASS, PIL = (226, 236, 246), (196, 214, 232), (166, 188, 214), (98, 112, 148), (70, 82, 116), (120, 168, 104), (196, 180, 140)
    for x0, y0, w in ((160, 120, 150), (560, 70, 90), (900, 150, 190), (1340, 96, 120), (1700, 136, 160)):   # 떠 있는 섬
        h = w * 0.55
        pts = [(x0 - w / 2 + k * w / 16, y0 + 6 + h * math.sin(math.pi * k / 16) ** 1.6 * (0.8 + 0.2 * math.sin(k * 2.3))) for k in range(17)]
        cv.poly([(x0 - w / 2, y0)] + pts + [(x0 + w / 2, y0)], ROCK)
        for k in range(2, 15, 3):                                     # 바위 결
            px, py = pts[k]
            cv.line([(px, y0 + 8), (px + 2, py - 4)], ROCK2, 1)
        cv.rect(x0 - w / 2, y0 - 2, x0 + w / 2, y0 + 6, ROCK2)
        cv.rect(x0 - w / 2, y0 - 5, x0 + w / 2, y0 - 1, GRASS)
        for k in range(0, int(w), 4):
            cv.line([(x0 - w / 2 + k, y0 - 5), (x0 - w / 2 + k + 1, y0 - 8)], lift(GRASS, 18), 1)
        for c in range(rng.randint(1, 3)):                            # 무너진 열주
            px = x0 + rng.uniform(-w * 0.35, w * 0.35); ph = rng.uniform(16, 34)
            cv.rect(px - 3, y0 - 5 - ph, px + 3, y0 - 5, PIL)
            cv.rect(px - 5, y0 - 8 - ph, px + 5, y0 - 5 - ph, lift(PIL, 10))
            cv.line([(px - 1, y0 - 5 - ph), (px - 1, y0 - 5)], lift(PIL, -24), 1)
        for _ in range(3):                                            # 늘어진 뿌리
            rx = x0 + rng.uniform(-w * 0.3, w * 0.3); L = rng.uniform(10, 30)
            cv.line([(rx, y0 + 6), (rx + rng.uniform(-4, 4), y0 + 6 + L)], ROCK2, 1)
    for li, (col, base, amp, r0) in enumerate([(CL3, 268, 12, 18), (CL2, 300, 10, 22), (CL1, 340, 8, 26)]):   # 구름 바다 — 세 겹
        line = wave(rng, base, amp, [2, 3, 5, 7])
        for x in range(0, W, 8):
            r = rng.uniform(r0 * 0.6, r0 * 1.2)
            cv.ell(x, line[x], r, r * 0.6, col)
        cv.rect(0, max(line) + 4, W, H, col)
        cv.poly([(x, line[x] + 4) for x in range(0, W, 4)] + [(W, line[0] + 4), (W, H), (0, H)], col)
        for x in range(0, W, 8):
            if rng.random() < 0.6:
                cv.ell(x, line[x] - r0 * 0.4, r0 * 0.5, r0 * 0.2, lift(col, 14))
    return cv.im


# ---------------- 여명 마을 원경 — 지붕 · 굴뚝 연기 · 종탑 · 나무 ----------------
def house(cv, x, gy, w, h, wall, roof, win, rng):
    cv.rect(x - w / 2, gy - h, x + w / 2, gy, wall)
    cv.line([(x - w / 2, gy - h), (x - w / 2, gy)], lift(wall, -14), 1)
    rh = w * 0.42
    cv.poly([(x - w / 2 - 3, gy - h), (x, gy - h - rh), (x + w / 2 + 3, gy - h)], roof)
    cv.line([(x - w / 2 - 3, gy - h), (x, gy - h - rh)], lift(roof, 22), 1)
    for k in range(int(w / 9)):                                       # 창 — 반쯤 불이 켜졌다
        wx = x - w / 2 + 5 + k * 9
        cv.rect(wx, gy - h + 6, wx + 4, gy - h + 11, win if rng.random() < 0.6 else lift(wall, -22))
    if rng.random() < 0.5:                                            # 굴뚝 · 연기
        cx = x + w * 0.22
        cv.rect(cx - 2, gy - h - rh * 0.8, cx + 3, gy - h - rh * 0.2, lift(wall, -10))
        for k in range(4):
            cv.ell(cx + k * 3, gy - h - rh * 0.9 - k * 6, 2 + k, 1.6 + k * 0.6, lift((150, 156, 168), k * 10))


def village():
    rng = random.Random(20261022)
    cv = Canvas()
    HILL, WALL1, WALL2, ROOF1, ROOF2, WIN, TREE, DEEP = (96, 108, 120), (150, 132, 108), (120, 104, 86), (150, 82, 62), (112, 70, 58), (250, 214, 120), (62, 84, 70), (54, 58, 66)
    far = wave(rng, 210, 16, [1, 2, 3])
    hill(cv, far, HILL, lift(HILL, 14))
    for _ in range(40):
        x = rng.uniform(0, W); canopy(cv, x, far[int(x) % W] - 4, rng.uniform(8, 14), rng.uniform(6, 9), lift(HILL, -10), random.Random(rng.randrange(1 << 30)), 0.2, 10)
    for x0 in (420, 1380):                                            # 종탑
        gy = far[x0] + 30
        cv.rect(x0 - 10, gy - 110, x0 + 10, gy, lift(WALL2, -8))
        cv.poly([(x0 - 14, gy - 110), (x0, gy - 146), (x0 + 14, gy - 110)], ROOF2)
        cv.rect(x0 - 4, gy - 98, x0 + 4, gy - 86, WIN)
    base = wave(rng, 300, 8, [2, 3])
    for row, (n, wall, roof, sc) in enumerate([(26, WALL2, ROOF2, 0.8), (22, WALL1, ROOF1, 1.0)]):
        xs = sorted(rng.uniform(0, W) for _ in range(n))
        for x in xs:
            gy = base[int(x) % W] + row * 22 + 10
            house(cv, x, gy, rng.uniform(30, 52) * sc, rng.uniform(28, 46) * sc, lift(wall, row * 6), roof, WIN, rng)
        for _ in range(14):
            x = rng.uniform(0, W); gy = base[int(x) % W] + row * 22 + 10
            cv.line([(x, gy), (x, gy - 24)], lift(TREE, -20), 2)
            canopy(cv, x, gy - 30, rng.uniform(10, 16), rng.uniform(8, 12), lift(TREE, row * 8), random.Random(rng.randrange(1 << 30)), 0.2, 12)
    near = wave(rng, 352, 6, [2, 3])
    hill(cv, near, DEEP, lift(DEEP, 16))
    for x in range(0, W, 26):                                         # 울타리
        cv.line([(x, near[x] - 10), (x, near[x] + 2)], lift(DEEP, 24), 2)
    cv.line([(x, near[x] - 7) for x in range(0, W, 4)] + [(W, near[0] - 7)], lift(DEEP, 20), 1)
    floor(cv, near, DEEP, 4)
    return cv.im


# ---------------- 지옥 — 현무암 탑 · 용암 호수 · 재 연기 ----------------
def hell():
    rng = random.Random(20261023)
    cv = Canvas()
    FAR, MID, NEAR, LAVA, LAVA2, EMBER = (84, 40, 36), (58, 26, 24), (34, 16, 16), (232, 104, 32), (255, 196, 90), (255, 160, 60)
    far = wave(rng, 190, 30, [1, 2, 3, 5])
    hill(cv, far, FAR, lift(FAR, 20))
    for _ in range(30):
        x = rng.uniform(0, W); h = rng.uniform(40, 120); w = rng.uniform(10, 22); gy = far[int(x) % W] + 6
        cv.poly([(x - w / 2, gy), (x - w * 0.25, gy - h), (x + w * 0.2, gy - h * 0.94), (x + w / 2, gy)], lift(FAR, -10))
        for k in range(1, 4):                                         # 주상 절리 결
            cv.line([(x - w * 0.35 + k * w * 0.2, gy), (x - w * 0.2 + k * w * 0.12, gy - h * 0.85)], lift(FAR, -20), 1)
    for _ in range(14):                                               # 재 기둥
        x = rng.uniform(0, W); y = far[int(x) % W]
        for k in range(6):
            cv.ell(x + k * 4, y - 20 - k * 16, 8 + k * 3, 6 + k * 2, lift((74, 52, 50), k * 6))
    mid = wave(rng, 262, 18, [2, 3, 5])
    hill(cv, mid, MID, lift(MID, 22))
    for x in range(0, W, 5):                                          # 능선의 달군 금
        if rng.random() < 0.3:
            y = mid[x] + rng.uniform(4, 30)
            cv.line([(x, y), (x + rng.uniform(-4, 4), y + rng.uniform(4, 10))], lift(LAVA, -60), 1)
    lake = 318
    cv.rect(0, lake, W, H, LAVA)
    for x in range(0, W, 4):                                          # 용암 물결 · 굳은 껍질
        y = lake + 2 + 2 * math.sin(x * math.tau * 8 / W)
        cv.line([(x, y), (x + 3, y)], LAVA2, 1)
        if rng.random() < 0.18:
            cv.ell(x, lake + rng.uniform(10, 70), rng.uniform(4, 12), 1.6, (90, 36, 20))
    near = wave(rng, 330, 10, [3, 4, 6])
    for _ in range(26):                                               # 용암에 박힌 바위 이빨
        x = rng.uniform(0, W); h = rng.uniform(12, 40); w = rng.uniform(8, 16)
        cv.poly([(x - w, lake + 8), (x - w * 0.3, lake - h), (x + w * 0.4, lake - h * 0.8), (x + w, lake + 8)], NEAR)
        cv.line([(x - w * 0.3, lake - h), (x + w * 0.4, lake - h * 0.8)], lift(LAVA, -80), 1)
    for _ in range(140):
        cv.ell(rng.uniform(0, W), rng.uniform(60, 330), 1, 1, lift(EMBER, rng.choice([-60, -20, 0])))
    return cv.im


# ---------------- 유적 안 — 아치 회랑 · 기둥 · 벽돌 · 횃불 ----------------
def ruin():
    rng = random.Random(20261024)
    cv = Canvas()
    WALL, BRICK, COL, COL2, ARCH, FLOOR, TORCH = (70, 76, 92), (58, 62, 78), (150, 138, 112), (118, 108, 88), (132, 120, 98), (44, 40, 40), (255, 190, 90)
    cv.rect(0, 40, W, H, WALL)
    for y in range(44, 380, 10):                                      # 벽돌 줄 — 주기 W 에 맞춘 칸
        off = 0 if (y // 10) % 2 else 12
        cv.line([(0, y), (W, y)], BRICK, 1)
        for x in range(off, W, 24):
            cv.line([(x, y), (x, y + 10)], BRICK, 1)
    for x in range(0, W, 7):                                          # 얼룩 · 이끼
        if rng.random() < 0.25:
            cv.ell(x, rng.uniform(60, 340), rng.uniform(2, 6), rng.uniform(1, 3), lift(WALL, rng.choice([-8, 6])))
    span = W / 8
    for i in range(8):                                                # 아치 회랑
        x0 = i * span; xm = x0 + span / 2
        pts = [(x0 + span * k / 24, 120 - 60 * math.sin(math.pi * k / 24)) for k in range(25)]
        cv.line(pts, ARCH, 8); cv.line([(px, py + 4) for px, py in pts], lift(ARCH, -24), 2)
        cv.rect(x0 - 12, 110, x0 + 12, 362, COL)                      # 기둥
        cv.rect(x0 - 12, 110, x0 - 6, 362, lift(COL, 18))
        cv.rect(x0 + 6, 110, x0 + 12, 362, COL2)
        cv.rect(x0 - 16, 102, x0 + 16, 112, lift(COL, 10)); cv.rect(x0 - 16, 350, x0 + 16, 362, lift(COL, 10))
        for k in range(130, 350, 22):
            cv.line([(x0 - 12, k), (x0 + 12, k)], lift(COL, -14), 1)
        cv.rect(xm - 18, 180, xm + 18, 300, lift(WALL, -16))         # 벽감 — 깨진 조각상 자리
        cv.poly([(xm - 18, 180), (xm, 166), (xm + 18, 180)], lift(WALL, -16))
        if i % 2 == 0:
            cv.rect(xm - 6, 230, xm + 6, 300, lift(COL2, -10)); cv.ell(xm, 222, 7, 8, lift(COL2, -10))
        else:                                                         # 횃불
            cv.rect(xm - 2, 250, xm + 2, 270, (70, 50, 30))
            cv.ell(xm, 244, 4, 7, TORCH); cv.ell(xm, 246, 2, 4, (255, 240, 180))
    cv.rect(0, 362, W, H, FLOOR)
    for x in range(0, W, 32):
        cv.line([(x, 362), (x - 10, H)], lift(FLOOR, 10), 1)
    cv.line([(0, 362), (W, 362)], lift(FLOOR, 30), 2)
    return cv.im


# ---------------- 공장 유적 — 굴뚝 · 배관 · 톱니 · 철골 · 전선 ----------------
def works():
    rng = random.Random(20261025)
    cv = Canvas()
    FAR, MID, NEAR, PIPE, RUST, LAMP, SMOKE = (72, 78, 92), (48, 52, 64), (28, 30, 38), (92, 98, 112), (126, 78, 52), (255, 200, 110), (110, 112, 120)
    far = wave(rng, 210, 8, [2, 3])
    hill(cv, far, FAR)
    for i in range(10):                                               # 먼 공장 덩어리 · 굴뚝
        x = (i + rng.uniform(0.1, 0.9)) * W / 10; gy = far[int(x) % W] + 4; w = rng.uniform(60, 120); h = rng.uniform(40, 80)
        cv.rect(x - w / 2, gy - h, x + w / 2, gy, lift(FAR, -8))
        for k in range(int(w / 16)):                                  # 톱날 지붕
            sx = x - w / 2 + k * 16
            cv.poly([(sx, gy - h), (sx + 12, gy - h - 10), (sx + 16, gy - h)], lift(FAR, -8))
        cx = x + rng.uniform(-w * 0.3, w * 0.3); ch = rng.uniform(60, 120)
        cv.rect(cx - 5, gy - h - ch, cx + 5, gy - h, lift(FAR, -14))
        for k in range(3):
            cv.line([(cx - 5, gy - h - ch + 10 + k * 22), (cx + 5, gy - h - ch + 10 + k * 22)], RUST, 2)
        for k in range(6):
            cv.ell(cx + k * 5, gy - h - ch - 8 - k * 12, 6 + k * 2, 4 + k * 1.5, lift(SMOKE, k * 8))
    mid = wave(rng, 274, 10, [2, 3, 5])
    hill(cv, mid, MID, lift(MID, 12))
    for x in range(0, W, 160):                                        # 철골 탑 · 전선
        gy = mid[x] + 4; h = 120
        cv.line([(x - 10, gy), (x, gy - h), (x + 10, gy)], lift(MID, -10), 2)
        for k in range(1, 7):
            y = gy - h * k / 7; hw = 10 * (1 - k / 7)
            cv.line([(x - hw, y), (x + hw, y - h / 14)], lift(MID, -10), 1)
        cv.line([(x - 16, gy - h + 8), (x + 16, gy - h + 8)], lift(MID, -10), 2)
        nx = x + 160; ny = mid[nx % W] + 4 - h + 8
        sag = [(x + 16 + (nx - 16 - x - 16) * k / 12, gy - h + 8 + (ny - (gy - h + 8)) * k / 12 + 14 * math.sin(math.pi * k / 12)) for k in range(13)]
        cv.line(sag, (24, 26, 32), 1)
        cv.ell(x, gy - h - 2, 2, 2, LAMP)
    for _ in range(6):                                                # 큰 톱니
        x = rng.uniform(0, W); y = mid[int(x) % W] - rng.uniform(10, 30); r = rng.uniform(16, 30)
        for k in range(12):
            a = k / 12 * math.tau
            cv.poly([(x + math.cos(a - 0.12) * r, y + math.sin(a - 0.12) * r), (x + math.cos(a - 0.08) * r * 1.2, y + math.sin(a - 0.08) * r * 1.2),
                     (x + math.cos(a + 0.08) * r * 1.2, y + math.sin(a + 0.08) * r * 1.2), (x + math.cos(a + 0.12) * r, y + math.sin(a + 0.12) * r)], lift(MID, -6))
        cv.ell(x, y, r, r, lift(MID, -6)); cv.ell(x, y, r * 0.35, r * 0.35, lift(MID, 8))
    near = wave(rng, 330, 8, [3, 4])
    hill(cv, near, NEAR, lift(NEAR, 14))
    pipe_y = 318                                                      # 긴 배관 — 이음매 · 밸브
    cv.rect(0, pipe_y, W, pipe_y + 10, PIPE); cv.line([(0, pipe_y + 2), (W, pipe_y + 2)], lift(PIPE, 22), 1)
    for x in range(0, W, 60):
        cv.rect(x - 3, pipe_y - 2, x + 3, pipe_y + 12, lift(PIPE, -20))
        if x % 180 == 0:
            cv.ell(x + 30, pipe_y - 6, 5, 5, RUST); cv.line([(x + 30, pipe_y - 6), (x + 30, pipe_y)], RUST, 2)
    for x in range(0, W, 46):
        cv.rect(x, pipe_y + 10, x + 4, near[x % W] + 6, lift(NEAR, 6))
    for _ in range(50):
        cv.ell(rng.uniform(0, W), rng.uniform(260, 350), 1, 1, LAMP)
    floor(cv, near, NEAR, 6)
    return cv.im


BIOMES = [('parallax_snow.png', snow), ('parallax_glacier.png', glacier), ('parallax_corrupt.png', corrupt), ('parallax_desert.png', desert),
          ('parallax_glowfen.png', glowfen), ('parallax_sea.png', sea), ('parallax_sky.png', sky), ('parallax_village.png', village),
          ('parallax_hell.png', hell), ('parallax_ruin.png', ruin), ('parallax_works.png', works)]
