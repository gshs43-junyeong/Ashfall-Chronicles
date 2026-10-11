#!/usr/bin/env python3
"""탈 것 셋(말 · 조각배 · 광산 수레)과 그 아이템 넷(+ 레일)을 PNG 로 굽는다.

    python3 tools/mkrides.py

게임 크기(px) 그대로 한 픽셀씩 찍은 뒤 4배(nearest)로 키워 play/assets/obj/ 에 둔다(manifest objects 절 — 파일 4배).
시트는 가로로 장을 잇는다: 말 = 서기 · 달리기 넷 · 뛰기(6장), 수레 = 바퀴 두 장(살이 45° 돈다), 배 = 한 장.
아이템은 32×32 를 play/assets/item/ 에. 빛은 왼쪽 위 · 바깥 윤곽 1칸 · 칸 바깥 2칸 비우기(DESIGN.md).
"""
import math, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets')
S = 4
OUT = (12, 12, 17, 255)


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (c[3],)


class Pix:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.p = self.im.load()
        self.ox = self.oy = 0                         # 그리는 좌표를 통째로 민다(꼬리 · 노가 칸 벽에 닿지 않게)

    def put(self, x, y, c):
        x, y = int(round(x + self.ox)), int(round(y + self.oy))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[x, y] = c

    def get(self, x, y):
        return self.p[x, y] if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.put(xx, yy, c)

    def ellipse(self, cx, cy, rx, ry, col, lit=None, dk=None):
        """빛은 왼쪽 위 — 위쪽 테두리 두 줄은 밝게, 오른쪽 아래 사분면은 그늘"""
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                dx, dy = (x - cx) / rx, (y - cy) / ry
                d = dx * dx + dy * dy
                if d > 1:
                    continue
                c = col
                if lit and dy < -0.55 and d > 0.35:
                    c = lit
                elif dk and (dx + dy > 0.75 or dy > 0.6):
                    c = dk
                self.put(x, y, c)

    def line(self, x0, y0, x1, y1, c, wdt=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for ox in range(-(wdt // 2), wdt - wdt // 2):
                for oy in range(-(wdt // 2), wdt - wdt // 2):
                    self.put(x + ox, y + oy, c)

    def outline(self, c=OUT):
        src = self.im.copy().load()
        for y in range(self.h):
            for x in range(self.w):
                if src[x, y][3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < self.w and 0 <= yy < self.h and src[xx, yy][3]:
                        self.p[x, y] = c
                        break

    def check(self, name):
        """칸 테두리 두 줄에 칠한 칸이 있으면 멈춘다 — 잘림 방지(DESIGN.md §3)"""
        for y in range(self.h):
            for x in range(self.w):
                if self.p[x, y][3] and (x < 1 or y < 1 or x >= self.w - 1 or y >= self.h - 1):
                    raise SystemExit(f'{name}: 칸 가장자리({x},{y})까지 칠해졌다 — 칸을 키울 것')


def save(img, path):
    im = img.resize((img.width * S, img.height * S), Image.NEAREST)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    print('wrote', os.path.relpath(path, ROOT), im.size)


def sheet(frames):
    w = sum(f.w for f in frames)
    im = Image.new('RGBA', (w, frames[0].h), (0, 0, 0, 0))
    x = 0
    for f in frames:
        im.paste(f.im, (x, 0)); x += f.w
    return im


# ---------------- 말 ----------------
HW, HH = 54, 47
COAT, COAT_L, COAT_D = hexc('#8a5a34'), hexc('#a87444'), hexc('#5e3a20')
MANE, MANE_L = hexc('#2e2018'), hexc('#4a3426')
HOOF = hexc('#1c1410')
SADDLE, SADDLE_L = hexc('#5a3220'), hexc('#7a4a2e')
BLANKET, TRIM = hexc('#8a2a2a'), hexc('#d8a94b')


def leg(p, hx, hy, ang, bend, length=13, col=COAT, dk=COAT_D):
    """엉덩이(hx,hy)에서 내려가는 다리 — ang 은 앞뒤로 흔든 각(rad), bend 는 무릎 굽힘"""
    kx, ky = hx + math.sin(ang) * length * 0.5, hy + math.cos(ang) * length * 0.5
    a2 = ang - bend
    fx, fy = kx + math.sin(a2) * length * 0.5, ky + math.cos(a2) * length * 0.5
    p.line(hx, hy, kx, ky, col, 3)
    p.line(kx, ky, fx, fy, dk, 2)
    p.rect(int(round(fx)) - 1, int(round(fy)), 3, 2, HOOF)
    return fx, fy


def tack(p, by):
    """안장 · 담요 · 등자"""
    p.rect(19, by - 6, 11, 3, BLANKET)
    p.rect(19, by - 4, 11, 1, TRIM)
    p.rect(21, by - 8, 7, 3, SADDLE)
    p.rect(21, by - 8, 7, 1, SADDLE_L)
    p.put(20, by - 8, SADDLE); p.put(28, by - 9, SADDLE)       # 앞뒤 턱
    p.line(25, by - 3, 25, by + 4, SADDLE, 1)                   # 등자끈
    p.rect(24, by + 4, 3, 1, hexc('#9a9aa4'))


def horse(frame, wild=False):
    """frame 0 서기 · 1~4 달리기 · 5 뛰기. 오른쪽을 본다. wild = 안장 · 담요 없는 야생 말(잿빛 숲 — game/rides.ts)"""
    p = Pix(HW, HH)
    p.ox = 3
    run = 1 <= frame <= 4
    ph = (frame - 1) / 4 if run else 0
    bob = round(math.sin(ph * 2 * math.pi) * 1) if run else 0
    by = 24 + bob                                   # 몸통 가운데
    # 뒤쪽 다리 둘(그늘 색) — 몸 뒤에 먼저
    if frame == 5:
        legs_far = [(-0.9, 0.9), (0.8, 1.2)]
        legs_near = [(-0.6, 0.6), (1.0, 1.4)]
    elif run:
        s = lambda o: math.sin((ph + o) * 2 * math.pi)
        legs_far = [(s(0.1) * 0.7, max(0, s(0.35)) * 1.2), (s(0.6) * 0.7, max(0, s(0.85)) * 1.2)]
        legs_near = [(s(0.0) * 0.75, max(0, s(0.25)) * 1.3), (s(0.5) * 0.75, max(0, s(0.75)) * 1.3)]
    else:
        legs_far = [(0.05, 0.05), (-0.05, 0.05)]
        legs_near = [(-0.08, 0.1), (0.08, 0.1)]
    hipB, hipF = 15, 33
    leg(p, hipB + 2, by + 4, legs_far[0][0], legs_far[0][1], col=COAT_D, dk=shade(COAT_D, .8))
    leg(p, hipF + 2, by + 4, legs_far[1][0], legs_far[1][1], col=COAT_D, dk=shade(COAT_D, .8))
    # 꼬리 — 달릴 때 뒤로 휘날린다
    lift = 4 if run or frame == 5 else 0
    for i in range(10):
        t = i / 9
        x = 10 - t * 7 - (lift * t * 0.6)
        y = by - 3 + t * (11 - lift) + math.sin(t * 3 + ph * 6) * (1.2 if run else 0.4)
        p.line(x, y, x - 1, y + 1, MANE if i % 3 else MANE_L, 2)
    # 몸통
    p.ellipse(24, by, 13, 6.5, COAT, COAT_L, COAT_D)
    p.ellipse(13, by + 0.5, 5.5, 6, COAT, COAT_L, COAT_D)       # 엉덩이
    p.ellipse(34, by - 0.5, 5.5, 6, COAT, COAT_L, COAT_D)       # 가슴
    # 목 · 머리
    nx0, ny0 = 35, by - 3
    p.line(nx0, ny0, 40, by - 13, COAT, 6)
    p.line(nx0 - 1, ny0 - 1, 39, by - 14, COAT_L, 2)
    p.ellipse(42, by - 13, 3.2, 3, COAT, COAT_L, COAT_D)
    p.line(42, by - 13, 46, by - 9, COAT, 4)                   # 콧등
    p.line(44, by - 9, 46, by - 8, shade(COAT, 1.15), 2)       # 주둥이
    p.put(46, by - 9, MANE)                                     # 콧구멍
    p.put(42, by - 14, MANE); p.put(43, by - 14, hexc('#f0e8d8'))   # 눈 · 빛
    p.line(40, by - 16, 39, by - 19, COAT_D, 2)                 # 귀
    # 갈기 — 목 위쪽을 따라
    for i in range(9):
        t = i / 8
        x, y = 34 + t * 6, by - 4 - t * 11
        p.line(x - 1, y, x - 3 - (2 if run else 1), y + 1 + (1 if run else 0), MANE if i % 2 else MANE_L, 2)
    # 안장 · 담요(야생 말은 없다)
    if not wild:
        tack(p, by)
    # 가까운 다리 둘
    leg(p, hipB, by + 4, legs_near[0][0], legs_near[0][1])
    leg(p, hipF, by + 4, legs_near[1][0], legs_near[1][1])
    p.outline()
    p.check(f'horse{frame}')
    return p


# ---------------- 조각배 ----------------
def boat(cargo=False):
    """2×1 칸(44×22) 노 젓는 배 — 왼쪽이 고물(평평한 판), 오른쪽이 이물(뾰족하게 들림), 바닥은 곧은 용골.
    물에 잠기는 아랫줄(16줄부터)을 적신다 — 게임은 그림 16줄을 수면에 맞춘다(game/rides.ts)."""
    p = Pix(48, 24)
    p.ox, p.oy = 2, 1
    wood, lit, dk, dk2 = hexc('#8a6238'), hexc('#b0844e'), hexc('#5e4024'), hexc('#40281a')
    inner = hexc('#2e1e12')
    W = 44
    for x in range(W):
        # 뱃전(윗선) — 고물 쪽 높이 8, 가운데로 내려가 9, 이물로 갈수록 들려 4
        sheer = 8 if x < 4 else 9 if x < 32 else 9 - (x - 31) * 0.5
        # 바닥 — 곧은 용골(20), 이물 쪽은 위로 비스듬히 깎이고 고물은 판으로 선다
        keel = 20 if x < 30 else 20 - (x - 29) * 0.9
        if x < 2:
            keel = 18
        top, bot = int(round(sheer)), int(round(keel))
        if bot <= top:
            continue
        for y in range(top, bot + 1):
            c = wood
            if y == top:
                c = lit                                             # 뱃전 테두리
            elif y == top + 1:
                c = dk2                                             # 테두리 밑 그늘
            elif (y - top) % 4 == 0:
                c = dk                                              # 널 이음(가로 결)
            elif y >= bot - 1:
                c = dk
            p.put(x, y, c)
    for x in range(3, 33):                                         # 안쪽 바닥 그늘 — 배 속이 비어 보이게
        p.put(x, 9, inner)
    p.rect(0, 7, 2, 12, dk); p.rect(0, 7, 2, 1, lit)                # 고물 판
    p.line(43, 3, 41, 9, dk, 2); p.put(43, 2, lit)                  # 이물 기둥
    for x in (12, 22):
        p.rect(x, 7, 2, 3, dk2)                                     # 가로 앉음판 끝
    p.rect(17, 6, 2, 3, dk); p.rect(16, 6, 4, 1, lit)               # 노걸이
    p.line(18, 6, 4, 13, hexc('#a87a48'), 1)                        # 노 — 고물 쪽 물로 비스듬히
    p.rect(2, 13, 3, 3, hexc('#9a7048'))                            # 노 날
    for x in range(4, 30, 6):
        p.put(x, 12, hexc('#c8a070'))                               # 못
    if cargo:                                                       # 짐칸 — 고물 쪽에 묶은 나무 상자
        cw, cl, cd = hexc('#7a5326'), hexc('#a87a40'), hexc('#4a3218')
        p.rect(3, 2, 10, 7, cw); p.rect(3, 2, 10, 1, cl); p.rect(3, 5, 10, 1, cd); p.rect(12, 2, 1, 7, cd)
        p.rect(7, 4, 2, 2, hexc('#d8a94b'))                         # 걸쇠
        p.line(2, 2, 2, 8, hexc('#5f7a3a'), 1); p.line(13, 2, 13, 8, hexc('#5f7a3a'), 1)   # 밧줄
    for y in range(17, 24):
        k = (y - 16) / 7
        for x in range(p.w):
            r, g, b, a = p.get(x, y)
            if a:
                m = 0.22 + 0.38 * k
                p.p[x, y] = (int(r * (1 - m) + 40 * m), int(g * (1 - m) + 90 * m), int(b * (1 - m) + 120 * m), a)
    p.outline(hexc('#24160c'))
    p.check('boat')
    return p


# ---------------- 광산 수레 ----------------
def cart(frame):
    p = Pix(34, 24)
    iron, lit, dk = hexc('#6a6e78'), hexc('#9aa0aa'), hexc('#3e4048')
    rust = hexc('#8a5a3a')
    for y in range(3, 16):
        t = (y - 3) / 12
        x0, x1 = int(3 + t * 3), int(30 - t * 3)                   # 위가 넓은 통
        for x in range(x0, x1 + 1):
            c = iron
            if y == 3:
                c = lit
            elif x == x0 or y == 15:
                c = dk if x != x0 else lit
            elif x == x1:
                c = dk
            elif y in (7, 11):
                c = dk
            p.put(x, y, c)
    for x, y in ((6, 5), (27, 5), (8, 13), (25, 13), (16, 9), (17, 9)):
        p.put(x, y, lit)                                           # 리벳
    for x, y in ((10, 9), (11, 10), (22, 6), (23, 12)):
        p.put(x, y, rust)
    p.rect(2, 2, 30, 2, dk); p.rect(2, 2, 30, 1, lit)                # 테
    for cx in (9, 24):                                             # 바퀴 — 살이 장마다 45° 돈다
        cy = 18
        p.ellipse(cx, cy, 3.6, 3.6, dk)
        p.ellipse(cx, cy, 2.4, 2.4, iron)
        a0 = frame * math.pi / 4
        for k in range(2):
            a = a0 + k * math.pi / 2
            p.line(cx - math.cos(a) * 2.4, cy - math.sin(a) * 2.4, cx + math.cos(a) * 2.4, cy + math.sin(a) * 2.4, dk, 1)
        p.put(cx, cy, lit)
    p.outline()
    p.check(f'cart{frame}')
    return p


# ---------------- 아이템(32×32) ----------------
def icon_horse():
    p = Pix(32, 32)
    p.ellipse(15, 18, 7, 9, COAT, COAT_L, COAT_D)                  # 머리 · 목(옆얼굴)
    p.line(17, 14, 25, 21, COAT, 6)
    p.line(23, 19, 27, 23, shade(COAT, 1.15), 4)                    # 주둥이
    p.put(27, 22, MANE)
    p.put(17, 14, MANE); p.put(18, 14, hexc('#f0e8d8'))
    p.line(13, 9, 12, 5, COAT_D, 2); p.line(16, 9, 16, 5, COAT, 2)  # 귀
    for i in range(10):
        p.line(9 - i * 0.2, 9 + i * 2, 6 - i * 0.2, 10 + i * 2, MANE if i % 2 else MANE_L, 2)
    p.line(17, 17, 22, 22, SADDLE, 1); p.line(15, 20, 23, 24, SADDLE, 1)   # 굴레
    p.put(22, 22, TRIM)
    p.outline(); p.check('item horse')
    return p


def icon_boat():
    p = Pix(32, 32)
    b = boat()
    small = b.im.crop((1, 1, 47, 23)).resize((30, 14), Image.NEAREST)
    p.im.paste(small, (1, 12), small)
    p.p = p.im.load()
    p.check('item boat')
    return p


def icon_boatc():
    p = Pix(32, 32)
    b = boat(True)
    small = b.im.crop((1, 1, 47, 23)).resize((30, 14), Image.NEAREST)
    p.im.paste(small, (1, 12), small)
    p.p = p.im.load()
    p.check('item boatc')
    return p


def icon_cart():
    p = Pix(32, 32)
    c = cart(0)
    sm = c.im.resize((28, 20), Image.NEAREST)
    p.im.paste(sm, (2, 8), sm)
    p.p = p.im.load()
    for x, y in ((9, 7), (12, 6), (16, 7), (19, 6)):               # 실린 광석
        p.rect(x, y, 3, 2, hexc('#c8a070')); p.put(x, y, hexc('#e8c890'))
    p.check('item cart')
    return p


def icon_rail():
    p = Pix(32, 32)
    tie, tie_d = hexc('#7a5434'), hexc('#4a3220')
    for x in (4, 12, 20, 26):
        p.rect(x, 18, 4, 5, tie); p.rect(x, 22, 4, 1, tie_d)
    p.rect(2, 15, 28, 3, hexc('#8a8e98')); p.rect(2, 15, 28, 1, hexc('#c0c6d0')); p.rect(2, 17, 28, 1, hexc('#4a4c54'))
    p.outline(); p.check('item rail')
    return p


if __name__ == '__main__':
    save(sheet([horse(i) for i in range(6)]), os.path.join(ROOT, 'obj', 'ride_horse.png'))
    save(sheet([horse(i, True) for i in range(6)]), os.path.join(ROOT, 'obj', 'ride_horsew.png'))
    save(boat().im, os.path.join(ROOT, 'obj', 'ride_boat.png'))
    save(boat(True).im, os.path.join(ROOT, 'obj', 'ride_boatc.png'))
    save(sheet([cart(0), cart(1)]), os.path.join(ROOT, 'obj', 'ride_cart.png'))
    for name, fn in (('mount_horse', icon_horse), ('mount_boat', icon_boat), ('mount_boatc', icon_boatc), ('mount_cart', icon_cart), ('rail', icon_rail)):
        im = fn().im
        path = os.path.join(ROOT, 'item', name + '.png')
        im.save(path); print('wrote', os.path.relpath(path, ROOT), im.size)
