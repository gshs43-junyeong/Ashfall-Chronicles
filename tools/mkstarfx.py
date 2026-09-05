#!/usr/bin/env python3
"""별 조각 애셋을 굽는다 — 궤도를 도는 조각 하나와, 얻는 순간 / 다섯이 하나가 되는 순간.

  fx/proj_starfrag.png   16x16 x 4프레임   곁을 도는 조각 (천천히 반짝인다)
  fx/star_gain.png       64x64 x 6프레임   조각 하나를 얻었다
  fx/star_merge.png      64x64 x 6프레임   다섯이 한 점으로 모여 하나가 된다

게임의 다른 시트와 같은 규칙이다 — 원본 해상도로 그린 뒤 4배로 최근접 확대하고,
프레임 사이에 4px 틈을 둔다(assets/sprites.js 의 drawFx 가 그 간격으로 잘라 쓴다).
그래서 여기서 값을 바꾸고 다시 돌리면 게임 쪽은 손댈 것이 없다.

색은 이야기에서 가져왔다. 별은 "잠들면 꿈을 꾸고, 그 꿈이 잿빛을 만든다" — 그래서
조각은 따뜻한 금빛이고, 그 둘레는 잿빛으로 식어 간다. 순수한 흰색은 심지에만 쓴다.
"""
import math, os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'game', 'assets', 'fx')
S, GAP = 4, 4                       # 4배로 굽고, 프레임 사이 4px

CORE  = (255, 250, 235)             # 심지 — 거의 흰색이지만 아주 살짝 따뜻하다
HOT   = (255, 240, 190)
GOLD  = (255, 214, 122)
AMBER = (226, 160, 70)
ASH   = (176, 158, 132)             # 식어 가는 가장자리. 잿빛과 같은 계열이다


def blend(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shard(px, n, cx, cy, arm, thick, rot, alpha=1.0, tail=1.0):
    """네 갈래 별 — 세로로 길고 가로로 짧다. rot 만큼 기울여 그린다.

    수학으로 그리는 이유: 16px 안에서 손으로 찍으면 프레임마다 각이 튀는데,
    거리장으로 그리면 아주 조금씩 도는 것이 자연스럽게 이어진다."""
    ca, sa = math.cos(rot), math.sin(rot)
    for y in range(n):
        for x in range(n):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            # 별의 축으로 좌표를 돌린다
            u = dx * ca + dy * sa
            v = -dx * sa + dy * ca
            v *= 1.0 / max(tail, 0.001)      # tail<1 이면 세로로 더 길어진다
            d = math.hypot(u, v)
            if d > arm:
                continue
            # 네 갈래: 축에 가까울수록 멀리 뻗는다
            ang = math.atan2(v, u)
            spike = abs(math.cos(2 * ang)) ** 3
            reach = thick + (arm - thick) * spike
            if d > reach:
                continue
            k = 1.0 - d / max(reach, 0.001)       # 0(끝) ~ 1(심지)
            if k > 0.80:   col, a = CORE, 1.0
            elif k > 0.55: col, a = HOT, 1.0
            elif k > 0.30: col, a = GOLD, 0.95
            elif k > 0.14: col, a = AMBER, 0.80
            else:          col, a = blend(AMBER, ASH, 0.5), 0.45
            a *= alpha
            if a <= 0.02:
                continue
            old = px[x, y]
            na = min(255, int(old[3] + a * 255))
            px[x, y] = (col[0], col[1], col[2], na)


def ring(px, n, cx, cy, r, w, col, alpha):
    """퍼져 나가는 고리 — 얇을수록 빠르게 지나간 것처럼 보인다"""
    for y in range(n):
        for x in range(n):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            k = 1.0 - abs(d - r) / max(w, 0.001)
            if k <= 0:
                continue
            a = alpha * (k ** 1.5)
            if a <= 0.02:
                continue
            old = px[x, y]
            px[x, y] = (col[0], col[1], col[2], min(255, int(old[3] + a * 255)))


def mote(px, n, x0, y0, r, col, alpha):
    """작은 티끌 하나"""
    for y in range(max(0, int(y0 - r - 1)), min(n, int(y0 + r + 2))):
        for x in range(max(0, int(x0 - r - 1)), min(n, int(x0 + r + 2))):
            d = math.hypot(x + 0.5 - x0, y + 0.5 - y0)
            k = 1.0 - d / max(r, 0.001)
            if k <= 0:
                continue
            a = alpha * k
            old = px[x, y]
            px[x, y] = (col[0], col[1], col[2], min(255, int(old[3] + a * 255)))


def sheet(frames, n, name):
    """프레임들을 4배로 키워 한 줄로 잇는다"""
    w = len(frames) * (n * S + GAP)
    im = Image.new('RGBA', (w, n * S), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f.resize((n * S, n * S), Image.NEAREST), (i * (n * S + GAP), 0))
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    im.save(path)
    print(f'  {name}  {im.width}x{im.height}  ({len(frames)}프레임)')


def make_frag():
    """곁을 도는 조각 — 아주 천천히 돌며 숨 쉬듯 커졌다 작아진다.
    네 프레임을 반복해서 쓰므로 처음과 끝이 이어져야 한다."""
    n, frames = 16, []
    for i in range(4):
        img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        px = img.load()
        # ★ 돌리지 않고 **반짝이게** 한다.
        #   처음에는 프레임마다 22.5도씩 돌렸는데, 16px 격자에서 22.5도와 67.5도는
        #   팔이 계단으로 깨져서 네 갈래가 다섯 갈래처럼 보였다. 격자에 깨끗하게
        #   떨어지는 각은 0도와 45도뿐이라 그 둘만 오간다. 크기와 심지 밝기가 같이
        #   숨 쉬어서, 도는 대신 "빛을 받아 반짝이는 것"으로 읽힌다.
        rot = (math.pi / 4) if i % 2 else 0.0
        arm = (7.3, 5.6, 6.5, 4.9)[i]
        shard(px, n, n / 2, n / 2, arm, 1.5, rot)
        # 심지에 흰 점 하나 — 작아도 "빛나는 것"으로 읽히게 한다
        mote(px, n, n / 2, n / 2, 1.0 + 0.5 * (arm - 4.9) / 2.4, CORE, 0.9)
        frames.append(img)
    sheet(frames, n, 'proj_starfrag.png')


def make_gain():
    """조각 하나를 얻었다 — 티끌이 안으로 모여들고, 조각이 맺히고, 고리가 한 번 퍼진다.
    폭죽이 아니다. 여섯 프레임 안에서 조용히 끝난다."""
    n, frames = 64, []
    c = n / 2
    for i in range(6):
        t = i / 5.0
        img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        px = img.load()
        # ① 바깥에서 모여드는 티끌 (앞 세 프레임)
        if t < 0.62:
            k = 1.0 - t / 0.62
            for m in range(8):
                a = m * math.tau / 8 + t * 1.1
                d = 8 + k * 20
                mote(px, n, c + math.cos(a) * d, c + math.sin(a) * d * 0.85,
                     1.0 + k * 0.8, blend(GOLD, ASH, 0.35), 0.30 + 0.45 * k)
        # ② 맺히는 조각 — 커졌다가 제 크기로 내려앉는다
        grow = min(1.0, t / 0.45)
        settle = 1.0 + 0.55 * math.sin(min(1.0, t / 0.7) * math.pi)
        shard(px, n, c, c, (5 + 12 * grow) * settle, 2.2 + 2.0 * grow,
              t * 0.9, alpha=min(1.0, 0.35 + t * 1.4), tail=0.8)
        # ③ 한 번만 퍼지는 고리
        if t > 0.3:
            k = (t - 0.3) / 0.7
            ring(px, n, c, c, 6 + k * 22, 3.0 - k * 1.8, HOT, 0.55 * (1 - k))
        frames.append(img)
    sheet(frames, n, 'star_gain.png')


def make_merge():
    """다섯이 하나가 된다 — 다섯 갈래가 한 점으로 빨려 들고, 터지고, 큰 별이 남는다.
    5장 outro 와 같은 사건이라 이것 하나만 크게 잡았다."""
    n, frames = 64, []
    c = n / 2
    for i in range(6):
        t = i / 5.0
        img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        px = img.load()
        # ① 다섯 조각이 안으로 (앞 절반)
        if t < 0.55:
            k = 1.0 - t / 0.55
            for m in range(5):
                a = m * math.tau / 5 - math.pi / 2 + t * 0.8
                d = 4 + k * 24
                shard(px, n, c + math.cos(a) * d, c + math.sin(a) * d,
                      3.4 + k * 1.6, 1.2, a + math.pi / 2, alpha=0.55 + 0.45 * (1 - k))
        # ② 터지는 순간 — 가운데가 하얗게 찬다
        if 0.35 < t < 0.75:
            k = 1 - abs(t - 0.55) / 0.20
            mote(px, n, c, c, 6 + 12 * k, CORE, 0.85 * k)
        # ③ 남는 큰 별 (뒤 절반)
        if t > 0.35:
            k = (t - 0.35) / 0.65
            shard(px, n, c, c, 10 + 18 * k, 2.4 + 1.2 * k, t * 0.6,
                  alpha=min(1.0, 0.5 + k), tail=0.9)
            ring(px, n, c, c, 8 + k * 26, 3.4 - k * 2.2, GOLD, 0.6 * (1 - k))
            # 사방으로 흩어지는 잔티끌
            for m in range(10):
                a = m * math.tau / 10 + 0.3
                d = 10 + k * 22
                mote(px, n, c + math.cos(a) * d, c + math.sin(a) * d,
                     1.4 * (1 - k * 0.6), HOT, 0.55 * (1 - k))
        frames.append(img)
    sheet(frames, n, 'star_merge.png')


if __name__ == '__main__':
    print('별 조각 애셋을 굽는다 —')
    make_frag()
    make_gain()
    make_merge()
    print('끝. assets/manifest.json 의 fx 항목과 짝이 맞아야 한다.')
