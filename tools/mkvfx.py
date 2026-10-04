#!/usr/bin/env python3
"""스킬 연출 결 그림 — engine/fx/vfx.ts 가 도형(원 · 선) 대신 얹는 그림(play/assets/fx/vfx_*.png).
   그림마다 두 장: vfx_<이름>.png(모양 — 흰색, 알파가 세기 · 게임이 갈래 색으로 물들인다)와
   vfx_<이름>_core.png(흰 속불 — 물들이지 않고 위에 얹는다). 색을 굽지 않는 까닭: 한 그림을 불 · 얼음 · 독 · 빛에 다 쓴다.
   ★ 픽셀을 읽어 물들이지 않는다(file:// 에서 PNG 캔버스 getImageData 가 막힌다) — 합성(source-in)만으로 물들도록 모양과 속불을 나눴다.
   python3 tools/mkvfx.py → python3 tools/sync-manifest.py (numpy 필요 — pip install numpy)"""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'play', 'assets', 'fx')
rng = np.random.default_rng(7)


def noise1(n, octaves=4, seed=0):
    """둘레를 도는 1차원 잡음(끝이 이어진다) — 0~1"""
    r = np.random.default_rng(seed); out = np.zeros(n)
    for o in range(octaves):
        k = 2 ** (o + 2); v = r.random(k + 1); v[-1] = v[0]
        x = np.linspace(0, k, n, endpoint=False); i = x.astype(int); f = x - i; f = f * f * (3 - 2 * f)
        out += (v[i] * (1 - f) + v[i + 1] * f) / 2 ** o
    out -= out.min(); return out / out.max()


def noise2(h, w, scale=8, octaves=4, seed=0):
    r = np.random.default_rng(seed); out = np.zeros((h, w))
    for o in range(octaves):
        s = scale * 2 ** o; g = r.random((s + 2, s + 2))
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += np.asarray(im, float) / 255 / 2 ** o
    out -= out.min(); return out / out.max()


def noise2v(h, w, scale=8, octaves=4, seed=0):
    """위아래가 이어지는 잡음 — 두 배 높이를 뽑아 아래 · 위 절반을 엇갈려 섞는다(굴려도 이음매가 없다)"""
    n = noise2(h * 2, w, scale * 2, octaves, seed); t = (np.arange(h) / h)[:, None]
    return n[h:] * (1 - t) + n[:h] * t


def polar(N):
    y, x = np.mgrid[0:N, 0:N]; c = (N - 1) / 2
    dx, dy = (x - c) / c, (y - c) / c
    return np.hypot(dx, dy), np.arctan2(dy, dx)


def save(name, shape, core):
    """shape · core = 0~1 배열 → 흰 그림 두 장"""
    for suf, a in (('', shape), ('_core', core)):
        a = np.clip(a, 0, 1); im = np.zeros(a.shape + (4,), np.uint8); im[..., :3] = 255; im[..., 3] = (a * 255).astype(np.uint8)
        Image.fromarray(im, 'RGBA').save(os.path.join(OUT, f'vfx_{name}{suf}.png'), optimize=True)
    print('vfx_' + name, shape.shape)


def band(r, r0, w):
    """r0 에 선 띠(가우스)"""
    return np.exp(-((r - r0) / w) ** 2)


def shock(N=256):
    """충격파 고리 — 바깥 가장자리가 짙고 안쪽으로 번지는 기운 · 둘레를 따라 끊기는 결 · 바깥으로 튀는 먼지 줄"""
    r, a = polar(N); idx = ((a + math.pi) / (2 * math.pi) * 1024).astype(int) % 1024
    br = noise1(1024, 5, 3)[idx]; br2 = noise1(1024, 6, 9)[idx]
    rim = band(r, 0.86, 0.05) * (0.55 + 0.45 * br)
    inner = np.clip((r - 0.45) / 0.41, 0, 1) ** 2.2 * (r < 0.88) * 0.45 * (0.6 + 0.4 * br2)
    rays = np.zeros_like(r)
    for i in range(70):
        t = rng.random() * 2 * math.pi; L = 0.04 + rng.random() * 0.1
        d = np.abs(np.angle(np.exp(1j * (a - t))))
        rays += np.exp(-(d / 0.006) ** 2) * ((r > 0.86) & (r < 0.86 + L)) * (1 - (r - 0.86) / L) * 0.7
    shape = np.clip(rim + inner + rays, 0, 1) * (r < 1)
    core = band(r, 0.87, 0.012) * (br > 0.35) * (0.6 + 0.4 * br2)
    save('shock', shape, core)


def flare(N=256):
    """섬광 — 둥근 빛 + 길이가 제각각인 빛살 스물넷 + 큰 네 갈래"""
    r, a = polar(N)
    glow = np.exp(-(r / 0.22) ** 2) + 0.35 * np.exp(-(r / 0.5) ** 2)
    rays = np.zeros_like(r)
    for i in range(24):
        t = i / 24 * 2 * math.pi + rng.random() * 0.12; L = 0.35 + rng.random() * 0.45
        d = np.abs(np.angle(np.exp(1j * (a - t))))
        rays += np.exp(-(d * np.maximum(r, 0.05) / 0.01) ** 2) * np.clip(1 - r / L, 0, 1) * 0.55
    main = np.zeros_like(r)
    for i in range(4):
        t = i * math.pi / 2; L = 0.98 if i % 2 == 0 else 0.7
        d = np.abs(np.angle(np.exp(1j * (a - t))))
        main += np.exp(-(d * np.maximum(r, 0.03) / 0.016) ** 2) * np.clip(1 - r / L, 0, 1) ** 1.4
    shape = np.clip(glow + rays + main, 0, 1)
    core = np.clip(np.exp(-(r / 0.09) ** 2) * 1.2 + main * 0.7 * np.exp(-(r / 0.45) ** 2), 0, 1)
    save('flare', shape, core)


def sigil(N=512):
    """마법진 — 겹 고리 · 고리 사이 글자 띠 · 여섯 끝 별 · 안쪽 눈금 고리 · 별 끝마다 작은 원. 선만 그리지 않고 띠 안쪽이 옅게 빛난다"""
    S = N * 2; im = Image.new('L', (S, S), 0); co = Image.new('L', (S, S), 0)
    d, dc = ImageDraw.Draw(im), ImageDraw.Draw(co); c = S / 2
    R = lambda f: f * S / 2 * 0.96
    def ring(f, w, dr, v=255):
        dr.ellipse([c - R(f), c - R(f), c + R(f), c + R(f)], outline=v, width=max(1, int(w)))
    ring(1.0, 7, d); ring(0.985, 3, dc); ring(0.84, 5, d); ring(0.835, 2, dc); ring(0.56, 4, d); ring(0.30, 4, d); ring(0.30, 2, dc)
    # 글자 띠 — 0.86~0.98 사이에 짧은 획을 엮은 글자 마흔여덟
    gr = np.random.default_rng(11)
    for i in range(48):
        t = i / 48 * 2 * math.pi; rm = R(0.92); cx, cy = c + math.cos(t) * rm, c + math.sin(t) * rm
        u = (math.cos(t + math.pi / 2), math.sin(t + math.pi / 2)); n = (math.cos(t), math.sin(t)); h = R(0.05); wdt = R(0.022)
        P = lambda p, q: (cx + u[0] * p * wdt + n[0] * q * h, cy + u[1] * p * wdt + n[1] * q * h)
        pts = [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1), (0, -1), (0, 1)]
        for _ in range(3):
            p0, p1 = gr.choice(len(pts), 2, replace=False)
            d.line([P(*pts[p0]), P(*pts[p1])], fill=255, width=5)
    # 여섯 끝 별(두 삼각형)
    for k in (0, 1):
        pts = [(c + math.cos(-math.pi / 2 + k * math.pi / 3 + j * 2 * math.pi / 3) * R(0.82), c + math.sin(-math.pi / 2 + k * math.pi / 3 + j * 2 * math.pi / 3) * R(0.82)) for j in range(3)]
        d.line(pts + [pts[0]], fill=255, width=6, joint='curve'); dc.line(pts + [pts[0]], fill=255, width=2)
    for j in range(6):
        t = -math.pi / 2 + j * math.pi / 3; x, y = c + math.cos(t) * R(0.82), c + math.sin(t) * R(0.82); rr = R(0.055)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=255, width=5); dc.ellipse([x - rr * .35, y - rr * .35, x + rr * .35, y + rr * .35], fill=255)
    # 눈금 고리(0.56~0.62)
    for i in range(72):
        t = i / 72 * 2 * math.pi; l = 0.62 if i % 6 == 0 else 0.59
        d.line([(c + math.cos(t) * R(0.56), c + math.sin(t) * R(0.56)), (c + math.cos(t) * R(l), c + math.sin(t) * R(l))], fill=255, width=4 if i % 6 == 0 else 2)
    # 가운데 — 작은 네 갈래 별
    for j in range(4):
        t = j * math.pi / 2; d.line([(c, c), (c + math.cos(t) * R(0.22), c + math.sin(t) * R(0.22))], fill=255, width=5)
    shape = np.asarray(im.resize((N, N), Image.LANCZOS), float) / 255
    blur = np.asarray(im.resize((N, N), Image.LANCZOS).filter(ImageFilter.GaussianBlur(N / 90)), float) / 255
    r, a = polar(N)
    fill = (np.clip((r - 0.84) / 0.16, 0, 1) * (r < 1) * 0.16) + (np.exp(-(r / 0.3) ** 2) * 0.14)
    core = np.asarray(co.resize((N, N), Image.LANCZOS), float) / 255
    save('sigil', np.clip(shape * 0.95 + blur * 0.6 + fill, 0, 1), core)


def slash(N=256):
    """칼선 고리 — 바깥 날이 가장 짙고 안으로 갈수록 결이 흩어지는 띠(0.7~1.0). 결은 둘레를 따라 길게 늘어진 잡음.
       게임이 꼬리~머리 각만 잘라(clip) 휘두르는 것처럼 그린다"""
    r, a = polar(N); idx = ((a + math.pi) / (2 * math.pi) * 2048).astype(int) % 2048
    streak = np.zeros_like(r)
    for i in range(10):     # 반지름마다 다른 잡음 — 둘레로 늘어진 털결
        rr0 = 0.72 + i * 0.028; ns = noise1(2048, 6, 40 + i)[idx]
        streak += band(r, rr0, 0.012) * (ns > 0.42) * (0.4 + 0.6 * ns)
    edge = band(r, 0.975, 0.02)
    body = np.clip((r - 0.7) / 0.28, 0, 1) ** 1.6 * (r < 1.0)
    shape = np.clip(edge + body * 0.55 + streak * 0.6, 0, 1)
    core = band(r, 0.97, 0.007) * 1.0 + band(r, 0.93, 0.004) * 0.5 * (noise1(2048, 4, 77)[idx] > 0.5)
    save('slash', shape, np.clip(core, 0, 1))


def column(W=96, H=320):
    """빛기둥 — 가운데 짙은 줄기 · 둘레로 흔들리는 결 · 위로 갈수록 흩어진다 · 오르는 빛 알갱이"""
    y, x = np.mgrid[0:H, 0:W]; u = (x - (W - 1) / 2) / ((W - 1) / 2); v = y / (H - 1)   # v 0 = 위
    nz = noise2(H, W, 3, 4, 5); nzv = noise2(H, 12, 6, 3, 8); nzv = np.asarray(Image.fromarray((nzv * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), float) / 255
    width = 0.35 + 0.65 * v ** 0.6
    body = np.exp(-(u / (0.55 * width)) ** 2) * (0.35 + 0.65 * nzv) * np.clip(v * 1.6, 0, 1)
    fringe = np.exp(-(u / width) ** 2) * nz * 0.35 * v
    motes = np.zeros_like(body)
    for i in range(40):
        mx, my, mr = rng.random() * W, rng.random() * H, 1 + rng.random() * 1.8
        motes += np.exp(-(((x - mx) ** 2 + (y - my) ** 2) / mr ** 2)) * 0.9
    shape = np.clip(body + fringe + motes * (np.abs(u) < 0.9), 0, 1)
    core = np.clip(np.exp(-(u / (0.12 * width)) ** 2) * np.clip(v * 1.3 - 0.1, 0, 1) * (0.5 + 0.5 * nzv) + motes * 0.6, 0, 1)
    save('column', shape, core)


def beam(W=320, H=64):
    """빛줄기 — 가운데 곧은 속 · 둘레를 감는 두 갈래 물결 · 결 잡음. 길이로 늘려 쓴다(양끝은 둥글게 사라진다)"""
    y, x = np.mgrid[0:H, 0:W]; u = x / (W - 1); v = (y - (H - 1) / 2) / ((H - 1) / 2)
    nz = noise2(H, W, 4, 4, 13)
    ends = np.clip(np.minimum(u, 1 - u) / 0.08, 0, 1)
    body = np.exp(-(v / 0.42) ** 2) * (0.5 + 0.5 * nz)
    wave = sum(np.exp(-((v - 0.45 * np.sin(2 * math.pi * (u * 3 + ph))) / 0.07) ** 2) for ph in (0, 0.5)) * 0.6
    shape = np.clip((body + wave) * ends, 0, 1)
    core = np.clip(np.exp(-(v / 0.1) ** 2) * ends * (0.7 + 0.3 * nz), 0, 1)
    save('beam', shape, core)


def puff(N=128):
    """연기 덩이 — 가장자리가 울퉁불퉁한 구름(둥근 그라데이션 대신)"""
    r, a = polar(N); nz = noise2(N, N, 4, 5, 21)
    edge = 0.62 + 0.3 * nz
    shape = np.clip((edge - r) / 0.35, 0, 1) ** 1.3 * (0.55 + 0.45 * nz)
    save('puff', shape, np.zeros_like(shape))


def ring(N=256):
    """주문 고리(ShapeFx.ring · 경고 원) — 얇은 두 줄 + 그 사이 끊긴 점선 + 바깥 옅은 빛"""
    r, a = polar(N); idx = ((a + math.pi) / (2 * math.pi) * 1024).astype(int) % 1024
    dash = (np.sin(a * 36) > 0.2).astype(float)
    shape = band(r, 0.95, 0.025) + band(r, 0.86, 0.015) * 0.8 + band(r, 0.905, 0.01) * dash * 0.9 + np.exp(-((r - 0.95) / 0.09) ** 2) * 0.25
    core = band(r, 0.95, 0.008) * (0.6 + 0.4 * noise1(1024, 4, 5)[idx])
    save('ring', np.clip(shape, 0, 1) * (r < 1), np.clip(core, 0, 1))


def fire(W=48, H=96, F=8):
    """불길 — 몸에 붙어 타오르는 혀 F 장(가로로 이어 붙인 띠). 이것만은 색을 굽는다(불은 언제나 불빛).
       잡음을 위로 굴려(np.roll — 끝이 이어진다) 장이 돌아도 이음매가 없다"""
    y, x = np.mgrid[0:H, 0:W]; u = (x - (W - 1) / 2) / ((W - 1) / 2); v = 1 - y / (H - 1)      # v 0 = 바닥
    n1, n2 = noise2v(H, W, 3, 4, 31), noise2v(H, W, 6, 3, 32)
    stops = [(0.0, (120, 20, 8)), (0.35, (220, 70, 20)), (0.6, (255, 150, 40)), (0.82, (255, 220, 120)), (1.0, (255, 250, 225))]
    def cmap(t):
        out = np.zeros(t.shape + (3,))
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            m = (t >= p0) & (t <= p1); k = ((t - p0) / (p1 - p0))[..., None]
            out[m] = (np.array(c0) * (1 - k) + np.array(c1) * k)[m]
        return out
    sheet = np.zeros((H, W * F, 4), np.uint8)
    for f in range(F):
        sh = f * H // F
        a, b = np.roll(n1, -sh, axis=0), np.roll(n2, -2 * sh, axis=0)
        sway = (a - 0.5) * 0.55 * v
        width = 0.95 * (1 - v) ** 0.75 + 0.05
        inten = np.clip(1 - np.abs(u + sway) / width, 0, 1) * (0.55 + 0.6 * b) * np.clip(1.15 - v * 0.9, 0, 1)
        inten *= np.clip(1 - np.maximum(0, v - 0.55) * (1.6 + 1.5 * (1 - b)), 0, 1)        # 위로 갈수록 끊겨 혀가 된다
        inten *= np.clip(v / 0.14, 0, 1) ** 0.8                                         # 밑동도 둥글게 사라진다(떠 있는 몸에 바닥 선이 안 생기게)
        inten = np.clip(inten * 1.35, 0, 1)
        rgb = cmap(inten); al = np.clip(inten * 2.2 - 0.12, 0, 1)
        sheet[:, f * W:(f + 1) * W, :3] = rgb.astype(np.uint8); sheet[:, f * W:(f + 1) * W, 3] = (al * 255).astype(np.uint8)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'vfx_fire.png'), optimize=True)
    print('vfx_fire', (W * F, H), F, '장')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    shock(); flare(); sigil(); slash(); column(); beam(); puff(); ring(); fire()
