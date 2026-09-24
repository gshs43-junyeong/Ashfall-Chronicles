#!/usr/bin/env python3
"""하늘의 해와 운석 그림을 굽는다 — game/assets/bg/sky_*.png

  python3 tools/mksky.py && python3 tools/sync-manifest.py

■ 왜 그림으로 굽나
  해는 캔버스 원 세 겹(햇무리·광채·원반)이었고, 운석은 선 하나와 동그라미였다. 둘 다 "그림 도형"으로
  읽혀 사실감이 없었다(사용자: 더 사실적으로). 한 번 구울 때는 픽셀마다 계산을 얼마든지 할 수 있으므로
  여기서 물리적으로 그럴듯한 모양을 만든다.

  sky_sun.png        낮 해 원반 — 주변 감광(limb darkening: 가장자리로 갈수록 어둡고 붉다) · 쌀알 무늬
  sky_sun_set.png    노을 해 — 같은 원반을 대기가 붉게 거른 색. 게임이 gold 로 둘을 섞는다
  sky_meteor.png     먼 하늘 운석(오른쪽이 머리) — 흰 머리 · 이온화된 녹청빛 가장자리 · 노랑→주황→붉은 꼬리 · 불티
  sky_meteor_near.png 가까운 운석(오른쪽이 머리) — 울퉁불퉁한 바위 몸 · 달아오른 앞면과 금 · 불꼬리 · 연기

  해 둘레의 햇무리·노을 번짐은 하늘색에 맞춰 칠해야 하므로 게임(drawSun)에 그대로 둔다.
  같은 씨앗이라 다시 구워도 같은 그림이 나온다.
"""
import math, os, random
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'bg')
SS = 3                                   # 구울 때 크게 그렸다가 줄인다(가장자리 계단 없애기)


def noise2(seed, n=64):
    """부드러운 값 잡음 격자 — (x, y ∈ 0..1) → 0..1"""
    r = random.Random(seed)
    g = [[r.random() for _ in range(n + 1)] for _ in range(n + 1)]

    def f(x, y):
        x *= n; y *= n
        i, j = int(x) % n, int(y) % n
        fx, fy = x - int(x), y - int(y)
        sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = g[j][i] + (g[j][i + 1] - g[j][i]) * sx
        b = g[j + 1][i] + (g[j + 1][i + 1] - g[j + 1][i]) * sx
        return a + (b - a) * sy
    return f


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(lerp(a, b, t) for a, b in zip(c1, c2))


def ramp(stops, t):
    t = max(0.0, min(1.0, t))
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            return mix(c0, c1, (t - t0) / (t1 - t0) if t1 > t0 else 0)
    return stops[-1][1]


def finish(img, size):
    return img.resize(size, Image.LANCZOS)


def sun(sunset):
    S = 128 * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    px = im.load()
    n1, n2 = noise2(11, 48), noise2(12, 160)
    c = S / 2 - 0.5
    R = S * 0.30                                    # 원반 — 나머지는 원반에 붙은 빛(코로나)
    for y in range(S):
        for x in range(S):
            dx, dy = (x - c) / R, (y - c) / R
            r = math.hypot(dx, dy)
            if r <= 1:
                mu = math.sqrt(1 - r * r)
                # 주변 감광 — 태양 광구의 실측 근사 I(μ) = 1 - 0.56(1-μ) - 0.2(1-μ²)
                I = 1 - 0.56 * (1 - mu) - 0.2 * (1 - mu * mu)
                gran = (n2(x / S, y / S) - 0.5) * 0.06 + (n1(x / S, y / S) - 0.5) * 0.04
                I = max(0, min(1, I + gran * mu))
                if sunset:
                    col = ramp([(0, (150, 40, 20)), (0.55, (235, 95, 40)), (0.85, (255, 170, 80)), (1, (255, 215, 150))], I)
                else:
                    col = ramp([(0, (230, 120, 40)), (0.5, (255, 200, 110)), (0.8, (255, 240, 200)), (1, (255, 255, 246))], I)
                a = 255 * min(1, (1 - r) * R / 1.2 + 0.0) if r > 1 - 1.2 / R else 255
                px[x, y] = tuple(int(v) for v in col) + (int(a),)
            else:
                # 코로나 — 원반 바로 곁에서만 빠르게 옅어지는 빛(햇무리는 게임이 칠한다)
                k = math.exp(-(r - 1) * 5.5)
                ray = 1 + 0.25 * (n1(math.atan2(dy, dx) / (2 * math.pi) + 0.5, 0.3) - 0.5)
                a = 200 * k * ray
                col = (255, 150, 70) if sunset else (255, 236, 190)
                if a > 1:
                    px[x, y] = col + (int(min(255, a)),)
    return finish(im, (128, 128))


def meteor_far():
    W, H = 256 * SS, 48 * SS
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    rnd = random.Random(7)
    nz = noise2(21, 80)
    hx, cy = W - 14 * SS, H / 2
    for y in range(H):
        for x in range(W):
            d = hx - x                                  # 머리에서 꼬리 쪽으로 떨어진 거리
            v = (y - cy)
            if d < -6 * SS:
                continue
            if d <= 0:
                r = math.hypot(d, v) / (4.5 * SS)
                a = max(0, 1 - r) ** 1.4
                col = (255, 255, 250)
            else:
                t = d / (hx)                            # 0 머리 → 1 꼬리 끝
                wid = (3.2 + 10 * t ** 0.8) * SS        # 꼬리는 뒤로 갈수록 퍼진다
                flick = 0.75 + 0.5 * nz(x / W * 3, y / H)
                a = math.exp(-(v / wid) ** 2 * 2.2) * (1 - t) ** 1.6 * flick
                col = ramp([(0, (255, 252, 235)), (0.08, (255, 226, 140)), (0.3, (255, 150, 60)),
                            (0.65, (210, 70, 40)), (1, (120, 40, 40))], t)
                # 머리 곁 가장자리에 이온화된 녹청빛(유성의 초록 섬광)
                edge = math.exp(-((abs(v) - wid * 0.7) / (1.5 * SS)) ** 2) * math.exp(-t * 18)
                col = mix(col, (150, 255, 200), 0.5 * edge)
                a = max(a, 0.5 * edge)
            if a > 0.004:
                px[x, y] = tuple(int(c) for c in col) + (int(255 * min(1, a)),)
    # 불티 — 꼬리를 따라 흩어진 작은 불똥
    for _ in range(70):
        t = rnd.random() ** 1.5
        x = int(hx - t * hx * 0.9); y = int(cy + rnd.gauss(0, (3 + 12 * t) * SS))
        r = rnd.uniform(0.6, 1.4) * SS
        col = ramp([(0, (255, 240, 180)), (1, (255, 110, 50))], t)
        for yy in range(int(y - r - 1), int(y + r + 2)):
            for xx in range(int(x - r - 1), int(x + r + 2)):
                if 0 <= xx < W and 0 <= yy < H and math.hypot(xx - x, yy - y) <= r:
                    o = px[xx, yy]
                    px[xx, yy] = tuple(int(c) for c in col) + (max(o[3], int(220 * (1 - t))),)
    im = im.filter(ImageFilter.GaussianBlur(SS * 0.6))
    return finish(im, (256, 48))


def meteor_near():
    W, H = 320 * SS, 112 * SS
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    rnd = random.Random(9)
    nz, nr, nc = noise2(31, 60), noise2(32, 24), noise2(33, 90)
    hx, cy, RR = W - 34 * SS, H / 2, 17 * SS          # 바위 가운데 · 반지름
    # ① 불꼬리와 연기(뒤에 깔린다)
    for y in range(H):
        for x in range(W):
            d = hx - x
            if d < 0:
                continue
            v = y - cy
            t = d / hx
            wid = (RR * 0.9 + 26 * SS * t ** 0.7)
            flick = 0.6 + 0.8 * nz(x / W * 4, y / H * 2)
            fire = min(1, 1.5 * math.exp(-(v / wid) ** 2 * 1.6) * math.exp(-t * 2.2) * flick)
            smoke = math.exp(-(v / (wid * 1.3)) ** 2 * 1.6) * (1 - t) ** 1.2 * 0.55 * (0.5 + nz(x / W * 6 + 3, y / H * 3))
            fc = ramp([(0, (255, 250, 225)), (0.12, (255, 214, 110)), (0.4, (255, 130, 45)), (1, (170, 40, 20))], t * 1.8)
            sc = (70, 58, 54)
            a = min(1, fire + smoke * (1 - fire))
            if a < 0.01:
                continue
            col = mix(sc, fc, fire / a if a else 0)
            px[x, y] = tuple(int(c) for c in col) + (int(255 * a),)
    # ② 바위 — 울퉁불퉁한 가장자리, 앞(오른쪽)이 녹아 희게 달아올랐다
    for y in range(int(cy - RR * 1.4), int(cy + RR * 1.4)):
        for x in range(int(hx - RR * 1.4), int(hx + RR * 1.4)):
            dx, dy = x - hx, y - cy
            ang = math.atan2(dy, dx)
            rr = RR * (0.82 + 0.3 * nr(ang / (2 * math.pi) + 0.5, 0.2))
            r = math.hypot(dx, dy)
            if r > rr:
                continue
            front = max(0, dx / rr)                     # 오른쪽(나아가는 쪽)일수록 1
            # 빛: 달아오른 앞면에서 온다 — 가짜 법선으로 명암
            nzv = math.sqrt(max(0, 1 - (r / rr) ** 2))
            shade = 0.35 + 0.65 * max(0, (dx / rr) * 0.8 + nzv * 0.4)
            rock = mix((38, 30, 28), (96, 78, 66), shade * (0.7 + 0.6 * nc(x / W * 8, y / H * 8)))
            heat = front ** 2.2
            col = mix(rock, (255, 170, 70), heat * 0.85)
            col = mix(col, (255, 245, 210), max(0, front - 0.8) * 4)
            crack = nc(x / W * 18, y / H * 14)
            if 0.47 < crack < 0.53 and front > 0.15:   # 달아오른 금
                col = mix(col, (255, 140, 40), 0.9)
            edge = max(0, 1 - (rr - r) / (1.5 * SS))
            a = 255 * (1 - edge * 0.6)
            px[x, y] = tuple(int(c) for c in col) + (int(a),)
    # ③ 앞면 섬광 — 충격파 앞 공기가 달아올라 바위 앞쪽을 **초승달 모양으로** 감싼다(플라스마 막)
    for y in range(H):
        for x in range(int(hx - RR * 1.5), W):
            dx, dy = x - hx, y - cy
            r = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            rr = RR * (0.82 + 0.3 * nr(ang / (2 * math.pi) + 0.5, 0.2))
            face = max(0, math.cos(ang))                # 앞쪽일수록 1
            sheath = math.exp(-((r - rr) / (4.5 * SS)) ** 2) * (0.25 + 0.75 * face) if r >= rr * 0.96 else 0
            glow = max(0, 1 - math.hypot(dx - RR * 0.6, dy) / (RR * 2.2)) ** 1.5 * 0.55
            k = min(1, sheath + glow)
            if k <= 0.01:
                continue
            o = px[x, y]
            base = o[:3] if o[3] else (255, 200, 120)
            col = mix(base, (255, 235, 190), k)
            px[x, y] = tuple(int(c) for c in col) + (max(o[3], int(255 * k)),)
    for _ in range(90):                                 # 불똥
        t = rnd.random() ** 1.3
        x = int(hx - RR * 0.6 - t * hx * 0.8); y = int(cy + rnd.gauss(0, (8 + 26 * t) * SS))
        r = rnd.uniform(0.8, 2.0) * SS
        col = ramp([(0, (255, 240, 170)), (1, (255, 100, 40))], t)
        for yy in range(int(y - r - 1), int(y + r + 2)):
            for xx in range(int(x - r - 1), int(x + r + 2)):
                if 0 <= xx < W and 0 <= yy < H and math.hypot(xx - x, yy - y) <= r:
                    o = px[xx, yy]
                    px[xx, yy] = tuple(int(c) for c in col) + (max(o[3], int(240 * (1 - t * 0.7))),)
    return finish(im, (320, 112))


def main():
    os.makedirs(OUT, exist_ok=True)
    sun(False).save(os.path.join(OUT, 'sky_sun.png'))
    sun(True).save(os.path.join(OUT, 'sky_sun_set.png'))
    meteor_far().save(os.path.join(OUT, 'sky_meteor.png'))
    meteor_near().save(os.path.join(OUT, 'sky_meteor_near.png'))
    print('wrote sky_sun · sky_sun_set · sky_meteor · sky_meteor_near')


if __name__ == '__main__':
    main()
