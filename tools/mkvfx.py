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


def xy(W, H):
    """가로 u 0~1 · 세로 v −1~1(가운데 0)"""
    y, x = np.mgrid[0:H, 0:W]
    return x / (W - 1), (y - (H - 1) / 2) / ((H - 1) / 2)


def spark(W=96, H=16):
    """불티 줄기 — 오른쪽 끝이 머리(둥글고 짙다), 왼쪽으로 가늘어지는 꼬리. 속도 방향으로 늘여 쓴다"""
    u, v = xy(W, H)
    wid = 0.12 + 0.88 * u ** 1.6
    body = np.exp(-(v / (0.55 * wid)) ** 2) * u ** 0.9 * np.clip((1 - u) / 0.06, 0, 1) ** 0.5
    core = np.exp(-(v / (0.2 * wid)) ** 2) * np.clip((u - 0.35) / 0.4, 0, 1) * np.clip((1 - u) / 0.08, 0, 1)
    save('spark', np.clip(body * 1.2, 0, 1), np.clip(core, 0, 1))


def mote(N=48):
    """빛 알갱이 — 둥근 빛 + 가는 네 갈래 반짝임(오르는 치유 알갱이 · 별가루)"""
    r, a = polar(N)
    glow = (np.exp(-(r / 0.32) ** 2) + 0.3 * np.exp(-(r / 0.7) ** 2)) * np.clip((1 - r) / 0.35, 0, 1)
    cross = sum(np.exp(-(np.abs(np.angle(np.exp(1j * (a - t)))) * np.maximum(r, 0.04) / 0.035) ** 2) for t in (0, math.pi / 2, math.pi, -math.pi / 2)) * np.clip(1 - r, 0, 1) ** 1.5
    save('mote', np.clip(glow + cross * 0.8, 0, 1) * (r < 1), np.clip(np.exp(-(r / 0.13) ** 2) * 1.3 + cross * 0.5 * np.exp(-(r / 0.5) ** 2), 0, 1))


def _ss(S):
    im = Image.new('L', (S, S) if isinstance(S, int) else S, 0)
    return im, ImageDraw.Draw(im)


def _down(im, size, blur=0):
    out = im.resize(size, Image.LANCZOS)
    if blur: out = out.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(out, float) / 255


def shard(W=64, H=32):
    """얼음 · 수정 조각 — 깎인 면이 셋인 쐐기(오른쪽이 뾰족). 면마다 세기가 달라 돌 때 반짝인다"""
    K = 6; im, d = _ss((W * K, H * K)); co, dc = _ss((W * K, H * K))
    P = lambda x, y: (x * (W - 1) * K, (0.5 + y * 0.5) * (H - 1) * K)
    tip, top, bot, back_t, back_b = P(1, 0), P(0.42, -0.86), P(0.36, 0.8), P(0.02, -0.34), P(0.06, 0.38)
    mid = P(0.48, 0.04)
    d.polygon([tip, top, back_t, back_b, bot], fill=150)
    d.polygon([tip, top, mid], fill=235); d.polygon([back_t, top, mid, back_b], fill=120); d.polygon([tip, mid, bot], fill=190)
    for a_, b_ in ((tip, top), (top, back_t), (back_t, back_b), (back_b, bot), (bot, tip)): d.line([a_, b_], fill=255, width=K * 2)
    dc.line([tip, mid, back_b], fill=255, width=K); dc.line([tip, top], fill=200, width=K)
    shape = _down(im, (W, H)); glow = _down(im, (W, H), 1.6)
    save('shard', np.clip(shape + glow * 0.35, 0, 1), _down(co, (W, H)))


def _jag(n, amp, seed, rough=0.55):
    """끝이 0 에 붙는 지그재그(가운데 점 흔들기) — 0~1 길이 n 칸"""
    r = np.random.default_rng(seed); pts = np.zeros(2 ** n + 1); step = amp; L = 1
    while L < 2 ** n:
        seg = (2 ** n) // L
        for i in range(L): pts[i * seg + seg // 2] = (pts[i * seg] + pts[(i + 1) * seg]) / 2 + (r.random() - 0.5) * step
        L *= 2; step *= rough
    return pts


def crack(W=512, H=48):
    """땅 금 — 가로로 이어 쓰는 띠. 굵은 본 금이 지그재그로 달리고 짧은 잔금이 갈라진다 · 금 둘레는 달아오른 빛"""
    K = 3; im, d = _ss((W * K, H * K)); co, dc = _ss((W * K, H * K)); c = H * K / 2
    j = _jag(7, 0.9, 41); xs = np.linspace(0, W * K, len(j)); ys = c + j * H * K * 0.32
    line = list(zip(xs, ys)); d.line(line, fill=255, width=4 * K, joint='curve'); dc.line(line, fill=255, width=K + 1)
    r = np.random.default_rng(43)
    for i in range(14):
        k = int(r.integers(4, len(line) - 6)); x0, y0 = line[k]; ang = (r.random() - 0.5) * 2.2 + (math.pi if r.random() < 0.5 else 0) * 0
        ang = math.pi / 2 * (1 if r.random() < 0.5 else -1) + (r.random() - 0.5) * 1.3
        L = (8 + r.random() * 14) * K; pts = [(x0, y0)]
        for s in range(3): x0 += math.cos(ang) * L / 3 + (r.random() - 0.5) * 3 * K; y0 += math.sin(ang) * L / 3; pts.append((x0, y0))
        d.line(pts, fill=200, width=2 * K)
    shape = _down(im, (W, H)); glow = _down(im, (W, H), 3)
    save('crack', np.clip(shape + glow * 0.9, 0, 1), _down(co, (W, H)))


def bolt(W=256, H=48, F=4):
    """번개 마디 — F 장(bolt0~3, 장마다 다른 지그재그 · 곁가지). 두 점 사이에 늘여 쓰고 장을 바꿔 깜빡인다"""
    K = 3
    for f in range(F):
        im, d = _ss((W * K, H * K)); co, dc = _ss((W * K, H * K)); c = H * K / 2
        j = _jag(6, 0.75, 60 + f, 0.6); xs = np.linspace(0, W * K, len(j)); ys = c + j * H * K * 0.42
        line = list(zip(xs, ys)); d.line(line, fill=255, width=3 * K); dc.line(line, fill=255, width=K + 1)
        r = np.random.default_rng(70 + f)
        for b in range(2):
            k = int(r.integers(8, len(line) - 16)); x0, y0 = line[k]; s = 1 if r.random() < 0.5 else -1; pts = [(x0, y0)]
            for q in range(5): x0 += (8 + r.random() * 8) * K; y0 += s * (2 + r.random() * 5) * K; pts.append((x0, y0))
            d.line(pts, fill=170, width=2 * K)
        shape = _down(im, (W, H)); glow = _down(im, (W, H), 3.5)
        u, _ = xy(W, H); ends = np.clip(np.minimum(u, 1 - u) / 0.04, 0, 1)
        save(f'bolt{f}', np.clip((shape + glow * 0.8) * ends, 0, 1), _down(co, (W, H)) * ends)


def meteor(W=96, H=320):
    """떨어지는 별 — 아래쪽이 머리(둥근 불덩이), 위로 길게 흩어지는 꼬리 · 꼬리를 따라 떨어져 나간 불씨"""
    y, x = np.mgrid[0:H, 0:W]; u = (x - (W - 1) / 2) / ((W - 1) / 2); hy = H - W / 2
    t = np.clip((hy - y) / (hy - 4), 0, 1)                                   # 0 = 머리 · 1 = 꼬리 끝
    nz = noise2(H, 10, 8, 3, 91); nz = np.asarray(Image.fromarray((nz * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), float) / 255
    hr = np.hypot(u, (y - hy) / ((W - 1) / 2))
    head = (np.exp(-(hr / 0.42) ** 2) * 1.3 + 0.45 * np.exp(-(hr / 0.8) ** 2)) * np.clip((1 - hr) / 0.3, 0, 1)
    wid = 0.42 + 0.25 * t
    tail = np.exp(-(u / wid) ** 2) * (1 - t) ** 1.3 * (0.45 + 0.55 * nz) * (y < hy + 4)
    em = np.zeros_like(u)
    for i in range(26):
        tt = rng.random() ** 0.7; my = hy - tt * (hy - 10); mx = (W - 1) / 2 + (rng.random() - 0.5) * W * 0.55 * (0.4 + tt); mr = 1.2 + rng.random() * 1.6
        em += np.exp(-(((x - mx) ** 2 + (y - my) ** 2) / mr ** 2)) * (1 - tt * 0.7)
    shape = np.clip(head + tail + em * 0.9, 0, 1)
    core = np.clip(np.exp(-(hr / 0.17) ** 2) * 1.4 + np.exp(-(u / (wid * 0.3)) ** 2) * (1 - t) ** 3 * 0.8 + em * 0.4, 0, 1)
    save('meteor', shape, core)


def impact(N=256):
    """충격 별 — 길이 · 굵기가 제각각인 뾰족한 가시 열여섯 + 가운데 빛(부딪힌 순간 · 큰 타격)"""
    r, a = polar(N); spk = np.zeros_like(r); cs = np.zeros_like(r)
    gr = np.random.default_rng(17)
    for i in range(16):
        t = i / 16 * 2 * math.pi + gr.random() * 0.25; L = 0.45 + gr.random() * 0.53 if i % 2 == 0 else 0.25 + gr.random() * 0.3
        w0 = 0.09 + gr.random() * 0.07; d = np.abs(np.angle(np.exp(1j * (a - t))))
        tri = np.clip(1 - d / (w0 * np.clip(1 - r / L, 0, 1) + 1e-4), 0, 1) * (r < L)
        spk = np.maximum(spk, tri * (1 - r / L * 0.5)); cs = np.maximum(cs, tri * (r < L * 0.55))
    glow = np.exp(-(r / 0.2) ** 2) * 1.2 + 0.25 * np.exp(-(r / 0.55) ** 2)
    save('impact', np.clip(spk + glow, 0, 1) * (r < 1), np.clip(cs * 0.8 + np.exp(-(r / 0.1) ** 2) * 1.3, 0, 1))


def swirl(N=256):
    """회오리 — 안에서 밖으로 감기는 바람 결 셋(끝이 가늘게 흩어진다). 돌려 쓰면 몸을 감는 칼바람"""
    r, a = polar(N); shape = np.zeros_like(r); core = np.zeros_like(r)
    for arm in range(3):
        for sub, (w, al) in enumerate(((0.05, 1.0), (0.025, 0.6))):
            ph = arm * 2 * math.pi / 3 + sub * 0.35
            th = np.angle(np.exp(1j * (a - ph - r * 4.2)))                    # 나선 위 거리(각)
            line = np.exp(-((th * np.maximum(r, 0.1)) / w) ** 2)
            fade = np.clip((r - 0.22) / 0.2, 0, 1) * np.clip((1 - r) / 0.12, 0, 1) * (0.35 + 0.65 * r)
            shape += line * fade * al; core += np.exp(-((th * np.maximum(r, 0.1)) / (w * 0.3)) ** 2) * fade * al * (r > 0.5)
    shape += band(r, 0.9, 0.05) * 0.25
    save('swirl', np.clip(shape, 0, 1) * (r < 1), np.clip(core, 0, 1))


def _facets(N, n, seed, w):
    """구면 보로노이 — 공 앞면에 흩은 점에서 가장 가까운 두 점의 거리 차가 작은 곳이 면 경계. 가장자리로 갈수록 면이 눌린다(공처럼 보인다)"""
    r_ = np.random.default_rng(seed); v = r_.normal(size=(n, 3)); v /= np.linalg.norm(v, axis=1)[:, None]; v[:, 2] = np.abs(v[:, 2])
    y, x = np.mgrid[0:N, 0:N]; c = (N - 1) / 2; X, Y = (x - c) / c, (y - c) / c
    Z = np.sqrt(np.clip(1 - X * X - Y * Y, 0, 1)); p = np.stack([X, Y, Z], -1)
    dist = np.linalg.norm(p[:, :, None, :] - v[None, None], axis=-1); dist.sort(axis=-1)
    return np.exp(-((dist[..., 1] - dist[..., 0]) / w) ** 2), dist[..., 0]


def dome(N=256):
    """결계 구 — 가장자리로 갈수록 짙은 막(프레넬) · 구면을 따라 깎인 결정면(보로노이) · 왼쪽 위 반사광"""
    r, a = polar(N); edge, d0 = _facets(N, 46, 21, 0.035)
    fres = np.clip(r, 0, 1) ** 3
    shell = band(r, 0.96, 0.03) + fres * 0.22                                 # 안쪽은 비친다 — 막이 몸을 가리지 않게
    tint = (np.sin(d0 * 40) * 0.5 + 0.5) * 0.05 * fres                        # 면마다 결이 조금씩 다르다
    shape = np.clip(shell + edge * (0.08 + 0.55 * fres ** 1.2) + tint, 0, 1) * (r < 0.99)
    hl = band(r, 0.8, 0.035) * np.exp(-(np.angle(np.exp(1j * (a + 2.3))) / 0.38) ** 2) + band(r, 0.72, 0.02) * np.exp(-(np.angle(np.exp(1j * (a + 2.15))) / 0.15) ** 2) * 0.6
    save('dome', shape, np.clip(hl * 0.9 + band(r, 0.965, 0.008) * 0.8 + edge * fres * 0.25, 0, 1))


def _sigil_finish(name, im, co, N, inner=0.14):
    shape = _down(im, (N, N)); blur = _down(im, (N, N), N / 90); r, a = polar(N)
    fill = np.clip((r - 0.84) / 0.16, 0, 1) * (r < 1) * 0.14 + np.exp(-(r / 0.3) ** 2) * inner
    save(name, np.clip(shape * 0.95 + blur * 0.55 + fill, 0, 1), _down(co, (N, N)))


def _sig_base(N):
    S = N * 2; im, d = _ss(S); co, dc = _ss(S); c = S / 2; R = lambda f: f * S / 2 * 0.96
    def ring(f, w, dr, v=255): dr.ellipse([c - R(f), c - R(f), c + R(f), c + R(f)], outline=v, width=max(1, int(w)))
    def P(f, t): return (c + math.cos(t) * R(f), c + math.sin(t) * R(f))
    return S, im, d, co, dc, c, R, ring, P


def sigil_aegis(N=512):
    """방패진(전사 · 방어) — 사슬 고리 띠 · 바깥을 향한 연 모양 방패 넷(사방 십자) · 그 사이 엇갈린 검 넷 · 가운데 둥근 방패(징 여덟)"""
    S, im, d, co, dc, c, R, ring, P = _sig_base(N)
    ring(1.0, 7, d); ring(0.985, 2, dc); ring(0.83, 5, d)
    for k in range(28):                                                         # 사슬 — 누운 고리와 선 고리(옆에서 본 막대)가 번갈아 맞물린다
        t = k / 28 * 2 * math.pi; x, y = P(0.915, t); tu = (-math.sin(t), math.cos(t))
        if k % 2 == 0:
            a, b = R(0.075), R(0.032)
            pts = [(x + math.cos(q) * a * tu[0] - math.sin(q) * b * tu[1], y + math.cos(q) * a * tu[1] + math.sin(q) * b * tu[0]) for q in np.linspace(0, 2 * math.pi, 24)]
            d.line(pts, fill=255, width=5)
        else:
            h = R(0.06); d.line([(x - tu[0] * h, y - tu[1] * h), (x + tu[0] * h, y + tu[1] * h)], fill=255, width=9); dc.line([(x - tu[0] * h * .6, y - tu[1] * h * .6), (x + tu[0] * h * .6, y + tu[1] * h * .6)], fill=255, width=2)
    for k in range(4):                                                          # 연 방패 — 끝이 바깥(0.8)
        t = -math.pi / 2 + k * math.pi / 2; u = (math.cos(t), math.sin(t)); n = (-u[1], u[0])
        Q = lambda f, w: (c + u[0] * R(f) + n[0] * R(w), c + u[1] * R(f) + n[1] * R(w))
        sh = [Q(0.78, 0), Q(0.62, 0.11), Q(0.46, 0.12), Q(0.4, 0.07), Q(0.42, 0), Q(0.4, -0.07), Q(0.46, -0.12), Q(0.62, -0.11)]
        d.line(sh + [sh[0]], fill=255, width=6, joint='curve'); dc.line(sh + [sh[0]], fill=255, width=2)
        d.line([Q(0.47, 0), Q(0.72, 0)], fill=255, width=3); d.line([Q(0.56, -0.08), Q(0.56, 0.08)], fill=255, width=3)
    for k in range(4):                                                          # 검 — 방패 사이 대각선, 칼끝이 바깥
        t = -math.pi / 4 + k * math.pi / 2; u = (math.cos(t), math.sin(t)); n = (-u[1], u[0])
        Q = lambda f, w: (c + u[0] * R(f) + n[0] * R(w), c + u[1] * R(f) + n[1] * R(w))
        d.polygon([Q(0.79, 0), Q(0.7, 0.025), Q(0.4, 0.025), Q(0.4, -0.025), Q(0.7, -0.025)], outline=255)
        d.line([Q(0.79, 0), Q(0.7, 0.025), Q(0.4, 0.025)], fill=255, width=4); d.line([Q(0.79, 0), Q(0.7, -0.025), Q(0.4, -0.025)], fill=255, width=4)
        dc.line([Q(0.76, 0), Q(0.44, 0)], fill=255, width=2)
        d.line([Q(0.4, 0.08), Q(0.4, -0.08)], fill=255, width=6); d.line([Q(0.4, 0), Q(0.33, 0)], fill=255, width=5)
    ring(0.3, 6, d); ring(0.3, 2, dc); ring(0.22, 3, d)                         # 둥근 방패 · 징 여덟
    for k in range(8):
        x, y = P(0.26, k * math.pi / 4); rr = R(0.022); d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255); dc.ellipse([x - rr * .5, y - rr * .5, x + rr * .5, y + rr * .5], fill=255)
    rr = R(0.07); d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=255, width=5); dc.ellipse([c - rr * .45, c - rr * .45, c + rr * .45, c + rr * .45], fill=255)
    _sigil_finish('sigil_aegis', im, co, N)


def sigil_frost(N=512):
    """서리진(마법사 · 얼음) — 여섯 갈래 눈꽃(가지마다 잔가지 둘) · 가는 바깥 고리 둘 · 고리 사이 결정 점"""
    S, im, d, co, dc, c, R, ring, P = _sig_base(N)
    ring(1.0, 5, d); ring(0.98, 2, dc); ring(0.9, 3, d)
    for k in range(36):
        t = k / 36 * 2 * math.pi; x, y = P(0.95, t); rr = R(0.012 if k % 3 else 0.022); d.polygon([(x, y - rr * 2), (x + rr, y), (x, y + rr * 2), (x - rr, y)], fill=255)
    for k in range(6):
        t = -math.pi / 2 + k * math.pi / 3; d.line([P(0.08, t), P(0.84, t)], fill=255, width=6); dc.line([P(0.1, t), P(0.8, t)], fill=255, width=2)
        for f, L in ((0.36, 0.17), (0.6, 0.13)):
            base = P(f, t)
            for s in (-1, 1):
                tt = t + s * math.pi / 3; end = (base[0] + math.cos(tt) * R(L), base[1] + math.sin(tt) * R(L)); d.line([base, end], fill=255, width=5)
        tip = P(0.84, t); rr = R(0.035); d.polygon([(tip[0] + math.cos(t) * rr * 1.6, tip[1] + math.sin(t) * rr * 1.6), (tip[0] + math.cos(t + 1.6) * rr, tip[1] + math.sin(t + 1.6) * rr), (tip[0] - math.cos(t) * rr * 0.6, tip[1] - math.sin(t) * rr * 0.6), (tip[0] + math.cos(t - 1.6) * rr, tip[1] + math.sin(t - 1.6) * rr)], outline=255, width=4)
    d.line([P(0.16, -math.pi / 2 + k * math.pi / 3) for k in range(7)], fill=255, width=4)
    _sigil_finish('sigil_frost', im, co, N, 0.2)


def sigil_leaf(N=512):
    """사냥진(궁수) — 고리 두 겹 · 안쪽을 겨눈 화살촉 여덟 · 그 사이 잎맥 · 가운데 과녁"""
    S, im, d, co, dc, c, R, ring, P = _sig_base(N)
    ring(1.0, 6, d); ring(0.985, 2, dc); ring(0.78, 4, d); ring(0.2, 4, d); ring(0.08, 3, d); ring(0.2, 2, dc)
    for k in range(8):
        t = -math.pi / 2 + k * math.pi / 4
        tip, l, rgt = P(0.8, t), P(0.95, t - 0.09), P(0.95, t + 0.09); d.line([l, tip, rgt], fill=255, width=6, joint='curve'); dc.line([l, tip, rgt], fill=255, width=2)
        d.line([P(0.95, t), P(0.99, t)], fill=255, width=4)
        tm = t + math.pi / 8                                                    # 잎 — 가운데 맥 + 곁맥
        d.line([P(0.3, tm), P(0.7, tm)], fill=255, width=4)
        for f in (0.4, 0.5, 0.6):
            b = P(f, tm)
            for s in (-1, 1): d.line([b, (b[0] + math.cos(tm + s * 0.9) * R(0.06), b[1] + math.sin(tm + s * 0.9) * R(0.06))], fill=255, width=3)
        lf = [P(0.3, tm)] + [P(0.3 + 0.4 * q, tm + 0.16 * math.sin(math.pi * q)) for q in np.linspace(0, 1, 9)] + [P(0.3 + 0.4 * q, tm - 0.16 * math.sin(math.pi * q)) for q in np.linspace(1, 0, 9)]
        d.line(lf, fill=255, width=4, joint='curve')
    for k in range(4):
        t = k * math.pi / 2; d.line([P(0.22, t), P(0.36, t)], fill=255, width=4)
    _sigil_finish('sigil_leaf', im, co, N)


def sigil_life(N=512):
    """생명진(치유) — 여덟 꽃잎이 겹친 연꽃 · 꽃잎 끝마다 작은 점 · 바깥 고리에 덩굴 물결"""
    S, im, d, co, dc, c, R, ring, P = _sig_base(N)
    ring(1.0, 5, d); ring(0.985, 2, dc); ring(0.86, 3, d)
    wave = [P(0.93 + 0.035 * math.sin(q * 24), q) for q in np.linspace(0, 2 * math.pi, 400)]
    d.line(wave, fill=255, width=4)
    for k in range(8):
        t = -math.pi / 2 + k * math.pi / 4
        for f0, f1, wd, wid in ((0.12, 0.8, 0.3, 6), (0.12, 0.55, 0.2, 4)):
            pet = [P(f0 + (f1 - f0) * q, t + wd * math.sin(math.pi * q) ** 0.8 * (1 - q * 0.35)) for q in np.linspace(0, 1, 16)] + \
                  [P(f0 + (f1 - f0) * q, t - wd * math.sin(math.pi * q) ** 0.8 * (1 - q * 0.35)) for q in np.linspace(1, 0, 16)]
            d.line(pet, fill=255, width=wid, joint='curve')
        x, y = P(0.82, t); rr = R(0.022); dc.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255); d.ellipse([x - rr * 1.6, y - rr * 1.6, x + rr * 1.6, y + rr * 1.6], fill=255)
    ring(0.12, 5, d); ring(0.12, 2, dc)
    _sigil_finish('sigil_life', im, co, N, 0.22)


def sigil_beast(N=512):
    """짐승진(소환) — 이빨처럼 안으로 물린 톱니 고리 · 세 줄 발톱 자국 · 바깥 고리의 매듭 넷"""
    S, im, d, co, dc, c, R, ring, P = _sig_base(N)
    ring(1.0, 7, d); ring(0.985, 2, dc); ring(0.82, 4, d)
    teeth = []
    for k in range(48):
        t = k / 48 * 2 * math.pi; teeth.append(P(0.82 if k % 2 == 0 else 0.68, t))
    d.line(teeth + [teeth[0]], fill=255, width=4, joint='curve')
    for k in range(4):
        t = -math.pi / 4 + k * math.pi / 2; x, y = P(0.91, t); rr = R(0.06)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=255, width=6); d.line([P(0.84, t), P(0.98, t)], fill=255, width=4); dc.ellipse([x - rr * .35, y - rr * .35, x + rr * .35, y + rr * .35], fill=255)
    for s in (-1, 0, 1):                                                        # 발톱 자국 — 비스듬히 휜 세 줄
        pts = [(c + R(0.16) * s + R(0.12) * (q - 0.5) * 2 * 0.5, c + R(0.42) * (q - 0.5) * 2) for q in np.linspace(0, 1, 12)]
        pts = [(x + R(0.08) * math.sin(math.pi * q), y) for (x, y), q in zip(pts, np.linspace(0, 1, 12))]
        for i in range(len(pts) - 1):
            w = int(3 + 9 * math.sin(math.pi * (i + 0.5) / (len(pts) - 1))); d.line([pts[i], pts[i + 1]], fill=255, width=w)
        dc.line(pts[2:-2], fill=255, width=2)
    _sigil_finish('sigil_beast', im, co, N)


def sigil_void(N=512):
    """공허진(순간이동 · 비전) — 엇갈려 끊긴 고리 셋 · 안으로 말려 드는 나선 둘 · 고리 위 점 무리"""
    S, im, d, co, dc, c, R, ring, P = _sig_base(N)
    gr = np.random.default_rng(23)
    for f, w, n in ((1.0, 6, 5), (0.8, 4, 7), (0.6, 3, 4)):
        off = gr.random() * 360; span = 360 / n
        for k in range(n):
            a0 = off + k * span; a1 = a0 + span * (0.55 + gr.random() * 0.3)
            d.arc([c - R(f), c - R(f), c + R(f), c + R(f)], a0, a1, fill=255, width=w)
            if f == 1.0: dc.arc([c - R(0.985), c - R(0.985), c + R(0.985), c + R(0.985)], a0, a1, fill=255, width=2)
    for s in range(2):
        sp = [P(0.08 + 0.48 * q, s * math.pi + q * 4.6) for q in np.linspace(0, 1, 120)]; d.line(sp, fill=255, width=5); dc.line(sp[30:], fill=255, width=2)
    for k in range(40):
        t = gr.random() * 2 * math.pi; f = 0.66 + gr.random() * 0.12; x, y = P(f, t); rr = R(0.006 + gr.random() * 0.012); d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
    _sigil_finish('sigil_void', im, co, N)


def beam_spiral(W=320, H=64):
    """감기는 빛줄기(관통 화살 · 바람) — 가는 속 둘레를 세 갈래 결이 꼬며 감는다 · 앞쪽(오른쪽)이 짙다"""
    u, v = xy(W, H); nz = noise2(H, W, 4, 4, 51)
    ends = np.clip(u / 0.12, 0, 1) * np.clip((1 - u) / 0.04, 0, 1)
    body = np.exp(-(v / 0.18) ** 2) * (0.6 + 0.4 * nz)
    st = sum(np.exp(-((v - 0.62 * np.sin(2 * math.pi * (u * 5 + ph)) * (0.5 + 0.5 * u)) / 0.06) ** 2) * (0.55 + 0.45 * np.cos(2 * math.pi * (u * 5 + ph))) for ph in (0, 1 / 3, 2 / 3))
    shape = np.clip((body + st * 0.75) * ends * (0.4 + 0.6 * u), 0, 1)
    save('beam_spiral', shape, np.clip(np.exp(-(v / 0.06) ** 2) * ends * u, 0, 1))


def _crescent(r, a, span, rout, thick, skew=0.6):
    """a 0 을 가운데로 span 만큼 펼친 초승달 — 꼬리(−) 가늘고 머리(+) 쪽이 두껍다. 바깥 날 rout"""
    t = np.clip((a + span / 2) / span, 0, 1) * (np.abs(a) <= span / 2)
    th = thick * t ** skew * (1 - t) ** 0.3 * 1.6
    inner = rout - th
    body = np.clip((r - inner) / np.maximum(th, 1e-3), 0, 1) ** 0.9 * (r < rout) * (th > 0.004)
    edge = np.exp(-((r - rout) / 0.012) ** 2) * (t > 0.02) * (t < 0.995) * t ** 0.4
    return body, edge, t


def swipe(N=256):
    """칼 자국 넷(swipe0~3) — 오른쪽(각 0)을 가운데로 150° 펼친 초승달. 게임이 휘두른 각 · 방향으로 돌리고 뒤집어 섞어 쓴다.
       0 맑은 초승달 · 1 겹 초승달 · 2 결이 갈라진 바람 베기 · 3 무거운 마무리(넓은 몸 + 날 끝 파편)"""
    r, a = polar(N); span = math.radians(150); idx = ((a + math.pi) / (2 * math.pi) * 2048).astype(int) % 2048
    b, e, t = _crescent(r, a, span, 0.95, 0.26)
    save('swipe0', np.clip(b * 0.75 + e, 0, 1), np.clip(e * 0.9 + np.exp(-((r - 0.935) / 0.008) ** 2) * (b > 0.2) * 0.6, 0, 1))
    b2, e2, _ = _crescent(r, a + 0.12, math.radians(120), 0.74, 0.11)
    save('swipe1', np.clip(b * 0.65 + e + b2 * 0.55 + e2 * 0.7, 0, 1), np.clip(e * 0.9 + e2 * 0.5, 0, 1))
    st = np.zeros_like(r)
    for i in range(14):
        rr0 = 0.62 + i * 0.024; ns = noise1(2048, 6, 300 + i)[idx]
        st += band(r, rr0, 0.007) * (ns > 0.45) * (0.3 + 0.7 * ns)
    m = (np.abs(a) <= span / 2) * np.clip(t * 3, 0, 1) * (1 - t) ** 0.2
    save('swipe2', np.clip(st * m * 0.9 + e + b * 0.25, 0, 1), np.clip(e * 0.8 + st * m * 0.3, 0, 1))
    b3, e3, t3 = _crescent(r, a, math.radians(165), 0.96, 0.42, 0.45)
    chips = np.zeros_like(r)
    for i in range(30):
        ta = (rng.random() - 0.3) * math.radians(80); rr = 0.97 + rng.random() * 0.03
        d = np.abs(np.angle(np.exp(1j * (a - ta))))
        chips += np.exp(-(d / 0.01) ** 2) * ((r > rr - 0.02) & (r < 1)) * 0.8
    save('swipe3', np.clip(b3 * 0.8 + e3 * 1.1 + chips + st * b3 * 0.4, 0, 1) * (r < 1), np.clip(e3 + b3 * 0.25 * (t3 > 0.5), 0, 1))


def cut(N=128):
    """맞은 자리의 베인 자국 셋(cut0~2) — 0 한 줄 · 1 엇갈린 두 줄(X) · 2 나란한 세 줄. 가로(각 0)가 베는 방향"""
    y, x = np.mgrid[0:N, 0:N]; c = (N - 1) / 2
    def line(ang, off=0.0, L=0.92, w=0.06):
        u = ((x - c) * math.cos(ang) + (y - c) * math.sin(ang)) / c; v = (-(x - c) * math.sin(ang) + (y - c) * math.cos(ang)) / c - off
        tp = np.clip(1 - (u / L) ** 2, 0, 1)                 # 양끝이 뾰족
        return np.exp(-(v / (w * tp + 1e-3)) ** 2) * (np.abs(u) < L), np.exp(-(v / (w * 0.3 * tp + 1e-3)) ** 2) * (np.abs(u) < L * 0.85)
    r = np.hypot(x - c, y - c) / c; glow = np.exp(-(r / 0.35) ** 2) * 0.35
    s0, c0 = line(-0.12); save('cut0', np.clip(s0 + glow, 0, 1), c0)
    s1, c1 = line(0.42, 0, 0.85); s2, c2 = line(-0.42, 0, 0.85)
    save('cut1', np.clip(s1 + s2 + glow, 0, 1), np.clip(c1 + c2, 0, 1))
    acc, acc_c = 0, 0
    for off, L in ((-0.32, 0.7), (0, 0.9), (0.32, 0.7)):
        s_, c_ = line(-0.2, off, L, 0.045); acc = acc + s_; acc_c = acc_c + c_
    save('cut2', np.clip(acc + glow * 0.6, 0, 1), np.clip(acc_c, 0, 1))


def lens(W=512, H=32):
    """가로 빛살(렌즈 섬광) — 가운데 짙고 양끝으로 길게 사라지는 한 줄 + 옅은 띠"""
    u, v = xy(W, H); d = np.abs(u - 0.5) * 2
    shape = np.exp(-(v / (0.16 * (1 - d) + 0.04)) ** 2) * (1 - d) ** 1.6 + np.exp(-(v / 0.6) ** 2) * (1 - d) ** 3 * 0.25
    save('lens', np.clip(shape, 0, 1), np.clip(np.exp(-(v / 0.06) ** 2) * (1 - d) ** 3, 0, 1))


def ward_shell(N=256):
    """방벽 겹 — 유리 공(프레넬) + 비스듬한 경선 · 위선(지구본 결) + 아래쪽 모인 빛. 고리(ward_ring)가 그 둘레를 돈다"""
    K = 2; S = N * K; im, d = _ss(S); c = S / 2; Rr = S / 2 * 0.95
    for k in range(1, 4):                                                       # 경선 — 세로로 눌린 타원
        w = Rr * math.cos(k * math.pi / 8); d.ellipse([c - w, c - Rr, c + w, c + Rr], outline=255, width=2 * K)
    for f in (-0.55, 0, 0.55):                                                  # 위선
        yy = c + f * Rr; hw = Rr * math.sqrt(1 - f * f); d.ellipse([c - hw, yy - hw * 0.18, c + hw, yy + hw * 0.18], outline=255, width=2 * K)
    lines = _down(im.rotate(-18, Image.BICUBIC), (N, N), 0.5); r, a = polar(N)
    fres = np.clip(r, 0, 1) ** 2.6
    shape = np.clip(band(r, 0.955, 0.03) + fres * 0.24 + lines * (0.1 + 0.45 * fres) * (r < 0.95), 0, 1) * (r < 0.99)
    hl = band(r, 0.78, 0.04) * np.exp(-(np.angle(np.exp(1j * (a + 2.2))) / 0.42) ** 2)
    pool = band(r, 0.86, 0.07) * np.exp(-(np.angle(np.exp(1j * (a - math.pi / 2))) / 0.6) ** 2) * 0.5
    save('ward_shell', shape, np.clip(hl + pool + band(r, 0.96, 0.008) * 0.7, 0, 1))


def ward_ring(N=512):
    """방벽 고리 — 글자 띠(굵은 획 · 사이사이 마름모) 한 바퀴. 게임이 납작하게 눌러 기울인 궤도로 돌린다(두 개를 엇갈려 혼천의처럼)"""
    S, im, d, co, dc, c, R, ring, P = _sig_base(N)
    ring(0.99, 5, d); ring(0.80, 4, d); ring(0.985, 2, dc)
    gr = np.random.default_rng(31)
    for i in range(30):
        t = i / 30 * 2 * math.pi
        if i % 5 == 0:                                                          # 마름모 매듭
            pts = [P(0.895 + 0.075, t), P(0.895, t + 0.05), P(0.895 - 0.075, t), P(0.895, t - 0.05)]
            d.polygon(pts, fill=255); dc.polygon([P(0.92, t), P(0.895, t + 0.02), P(0.87, t), P(0.895, t - 0.02)], fill=255); continue
        rm = R(0.895); cx, cy = c + math.cos(t) * rm, c + math.sin(t) * rm
        u = (math.cos(t + math.pi / 2), math.sin(t + math.pi / 2)); n = (math.cos(t), math.sin(t)); h = R(0.06); wd = R(0.03)
        Q = lambda p, q: (cx + u[0] * p * wd + n[0] * q * h, cy + u[1] * p * wd + n[1] * q * h)
        pts = [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1), (0, -1), (0, 1), (0, 0)]
        for _ in range(4):
            p0, p1 = gr.choice(len(pts), 2, replace=False); d.line([Q(*pts[p0]), Q(*pts[p1])], fill=255, width=6)
    shape = _down(im, (N, N)); blur = _down(im, (N, N), N / 80); r, a = polar(N)
    save('ward_ring', np.clip(shape + blur * 0.6 + band(r, 0.9, 0.06) * 0.12, 0, 1) * (r < 1), _down(co, (N, N)))


def ward_crack(N=256):
    """방벽 금 — 오른쪽 위 한 점에서 갈라져 나가는 금 + 거미줄처럼 잇는 가로 금. 남은 방벽이 줄수록 짙게 얹는다"""
    K = 4; S = N * K; im, d = _ss(S); co, dc = _ss(S); c = S / 2; Rr = S / 2 * 0.96
    ox, oy = c + Rr * 0.32, c - Rr * 0.28; gr = np.random.default_rng(5); arms = []
    for k in range(9):
        t = k / 9 * 2 * math.pi + gr.uniform(-0.2, 0.2); L = Rr * gr.uniform(0.7, 1.5); pts = [(ox, oy)]; x, y = ox, oy
        for q in range(7):
            t += gr.uniform(-0.35, 0.35); x += math.cos(t) * L / 7; y += math.sin(t) * L / 7; pts.append((x, y))
        arms.append(pts)
        for i in range(len(pts) - 1):
            d.line([pts[i], pts[i + 1]], fill=255, width=int(K * (3.2 - i * 0.38))); dc.line([pts[i], pts[i + 1]], fill=255, width=max(1, int(K * (1.2 - i * 0.15))))
    for ring_i in (1, 2, 4):                                                     # 거미줄 — 이웃 갈래의 같은 마디를 잇는다
        for k in range(9):
            a0, a1 = arms[k], arms[(k + 1) % 9]
            if ring_i < len(a0) and ring_i < len(a1) and gr.random() < 0.8:
                m = ((a0[ring_i][0] + a1[ring_i][0]) / 2 + gr.uniform(-1, 1) * K * 6, (a0[ring_i][1] + a1[ring_i][1]) / 2 + gr.uniform(-1, 1) * K * 6)
                d.line([a0[ring_i], m, a1[ring_i]], fill=255, width=int(K * 1.6))
    r, a = polar(N); inside = (r < 0.97)
    shape = (_down(im, (N, N)) + _down(im, (N, N), 1.5) * 0.4) * inside
    save('ward_crack', np.clip(shape, 0, 1), np.clip(_down(co, (N, N)) * inside, 0, 1))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    shock(); flare(); sigil(); slash(); column(); beam(); puff(); ring(); fire()
    spark(); mote(); shard(); crack(); bolt(); meteor(); impact(); swirl(); dome()
    sigil_aegis(); sigil_frost(); sigil_leaf(); sigil_life(); sigil_beast(); sigil_void(); beam_spiral()
    swipe(); cut(); lens()
    ward_shell(); ward_ring(); ward_crack()
