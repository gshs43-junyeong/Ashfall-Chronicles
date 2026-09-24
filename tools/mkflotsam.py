#!/usr/bin/env python3
"""바다 부유물 세 단계와 3단계 특별 아이템(뱃사람의 나침반)을 PNG 로 굽는다.

    python3 tools/mkflotsam.py

게임 크기(px) 그대로 한 픽셀씩 찍은 뒤 4배(nearest)로 키워 game/assets/obj/ 에 둔다
(manifest.json objects 절의 규격: 파일은 4배, w·h 는 게임 크기).
나침반은 아이템 아이콘 규격 32×32 로 game/assets/item/ 에 둔다.

부유물은 **물에 반쯤 잠겨** 보이도록 아래쪽 네댓 줄을 물빛으로 어둡게 적신다 — 게임은
그림의 55% 높이를 수면에 맞춘다(entity.js flotsam AI). 무늬를 바꾸면 그 비율도 같이 볼 것.
"""
import os, random
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets')
S = 4


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

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[x, y] = c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.put(xx, yy, c)

    def get(self, x, y):
        return self.p[x, y]

    def outline(self, c):
        """투명 칸 중 불투명 칸에 닿은 곳을 테두리 색으로 — 물 위에서 윤곽이 묻히지 않게"""
        src = self.im.copy().load()
        for y in range(self.h):
            for x in range(self.w):
                if src[x, y][3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < self.w and 0 <= yy < self.h and src[xx, yy][3] and src[xx, yy][:3] != c[:3]:
                        self.p[x, y] = c
                        break

    def wet(self, rows, tint=(40, 90, 120)):
        """아래 rows 줄을 물에 적신다 — 물빛을 섞고 조금 어둡게"""
        for y in range(self.h - rows, self.h):
            k = (y - (self.h - rows) + 1) / rows
            for x in range(self.w):
                r, g, b, a = self.p[x, y]
                if not a:
                    continue
                m = 0.25 + 0.35 * k
                self.p[x, y] = (int(r * (1 - m) + tint[0] * m), int(g * (1 - m) + tint[1] * m), int(b * (1 - m) + tint[2] * m), a)

    def save(self, path, scale=S):
        im = self.im.resize((self.w * scale, self.h * scale), Image.NEAREST) if scale != 1 else self.im
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path)
        print('wrote', os.path.relpath(path, ROOT), im.size)


def log(p, x0, y0, L, r, bark, rng):
    """가로로 누운 통나무 — 둥근 단면(왼쪽 끝 나이테)과 나무껍질 결"""
    lt, dk, dk2 = shade(bark, 1.25), shade(bark, .72), shade(bark, .5)
    for x in range(x0, x0 + L):
        for k in range(r * 2):
            c = lt if k == 0 else dk2 if k == r * 2 - 1 else dk if k >= r * 2 - 2 else bark
            if rng.random() < .12 and 0 < k < r * 2 - 2:
                c = dk
            p.put(x, y0 + k, c)
    ring = hexc('#c8a070')
    for k in range(r * 2):                                   # 잘린 면
        p.put(x0, y0 + k, ring if 0 < k < r * 2 - 1 else shade(ring, .7))
    p.put(x0 + 1, y0 + r - 1, shade(ring, .8))
    p.put(x0 + L - 1, y0 + r, dk2)


def flotsam1():
    """1단계 — 떠다니는 나뭇더미. 통나무 셋을 해초 밧줄로 묶었다. 해초 몇 가닥이 늘어진다"""
    rng = random.Random(1)
    p = Pix(32, 16)
    bark = hexc('#7a5a36')
    log(p, 1, 7, 29, 3, bark, rng)
    log(p, 3, 2, 24, 3, shade(bark, 1.08), rng)
    log(p, 6, 10, 20, 2, shade(bark, .9), rng)
    rope = hexc('#5f7a3a')
    for x in (9, 21):
        for y in range(2, 14):
            p.put(x, y, rope if y % 2 else shade(rope, 1.3))
    kelp = hexc('#3f7a5a')
    for x, n in ((4, 3), (15, 4), (27, 2)):
        for k in range(n):
            p.put(x + (k % 2), 13 + k, kelp)
    p.put(18, 1, hexc('#e0cdb8')); p.put(19, 1, hexc('#b8a890'))    # 얹힌 조개 하나
    p.wet(5)
    p.outline(hexc('#2a1c10'))
    return p


def flotsam2():
    """2단계 — 난파 상자. 널빤지 상자에 쇠띠, 한쪽 널이 부서졌고 따개비가 붙었다. 밧줄 한 바퀴"""
    rng = random.Random(2)
    p = Pix(26, 22)
    wood, iron = hexc('#8a6238'), hexc('#5a5e66')
    for y in range(2, 21):
        for x in range(1, 25):
            c = wood
            if (y - 2) % 5 == 0:
                c = shade(wood, .6)                                   # 널빤지 틈
            elif rng.random() < .1:
                c = shade(wood, .82)
            p.put(x, y, c)
    for x in range(1, 25):
        p.put(x, 2, shade(wood, 1.3))
    for x in (1, 24):                                                 # 모서리 쇠띠
        for y in range(2, 21):
            p.put(x, y, iron if y % 3 else shade(iron, 1.4))
    for y in (4, 17):
        for x in range(1, 25):
            p.put(x, y, iron if x % 3 else shade(iron, 1.4))
    for x in range(15, 22):                                           # 부서진 널 — 속이 어둡다
        for y in range(8, 11):
            p.put(x, y, hexc('#2a1c12'))
    p.put(15, 7, shade(wood, 1.2)); p.put(21, 11, shade(wood, 1.2))
    rope = hexc('#9a8a5a')
    for x in range(1, 25):
        p.put(x, 13 + (1 if 8 < x < 17 else 0), rope if x % 2 else shade(rope, .75))
    for bx, by in ((4, 18), (6, 19), (5, 16), (20, 19), (22, 18)):   # 따개비
        p.put(bx, by, hexc('#d8d0c0')); p.put(bx + 1, by, hexc('#9a9488'))
    p.wet(6)
    p.outline(hexc('#24160c'))
    return p


def flotsam3():
    """3단계 — 봉인된 표류 궤짝. 짙은 청록 나무에 금테, 자물쇠 자리에 푸르게 빛나는 봉인.
    산호가 한쪽을 덮었고 뚜껑 틈으로 금화가 비친다. 드물게만 떠오른다"""
    rng = random.Random(3)
    p = Pix(30, 24)
    body, gold = hexc('#2f5a5a'), hexc('#d8b04a')
    for y in range(9, 23):                                            # 몸통
        for x in range(1, 29):
            c = body if rng.random() > .12 else shade(body, .8)
            if (x - 1) % 7 == 0:
                c = shade(body, .62)
            p.put(x, y, c)
    for y in range(2, 9):                                             # 둥근 뚜껑
        inset = max(0, 3 - (y - 2)) if y < 5 else 0
        for x in range(1 + inset, 29 - inset):
            c = shade(body, 1.15) if y < 5 else body
            if rng.random() < .1:
                c = shade(c, .85)
            p.put(x, y, c)
    for x in range(1, 29):                                            # 금테
        p.put(x, 9, gold); p.put(x, 22, shade(gold, .7))
    for y in range(2, 23):
        for x in (2, 27):
            if p.get(x, y)[3]:
                p.put(x, y, gold if y % 4 else shade(gold, 1.2))
    for x in range(6, 25):
        p.put(x, 8, hexc('#ffe08a') if x % 3 == 0 else hexc('#b8902a'))   # 틈으로 비친 금화
    seal = hexc('#6fe0ff')
    for dx, dy in ((0, 0), (-1, 1), (1, 1), (0, 2), (0, 1)):          # 봉인
        p.put(15 + dx, 11 + dy, seal)
    for dx, dy in ((-2, 1), (2, 1), (0, -1), (0, 3)):
        p.put(15 + dx, 11 + dy, shade(seal, .6))
    p.put(15, 12, hexc('#e8fbff'))
    coral = hexc('#e07a6a')
    for x, y in ((22, 20), (23, 19), (24, 18), (24, 20), (25, 17), (26, 19), (21, 21), (25, 21), (26, 16)):
        p.put(x, y, coral if (x + y) % 2 else shade(coral, 1.25))
    for bx, by in ((4, 20), (6, 21), (8, 19)):
        p.put(bx, by, hexc('#d8d0c0'))
    p.wet(6, tint=(30, 80, 110))
    p.outline(hexc('#10201e'))
    return p


def compass():
    """뱃사람의 나침반 — 놋쇠 테 · 푸른 판 · 붉은 바늘. 3단계 궤짝에서만 아주 드물게"""
    p = Pix(32, 32)
    import math
    brass, face = hexc('#c8a050'), hexc('#1f4a5a')
    cx, cy = 15.5, 16.5
    for y in range(32):
        for x in range(32):
            d = math.hypot(x - cx, y - cy)
            if d <= 13.2:
                p.put(x, y, shade(brass, 1.25) if d > 12 and y < cy else brass if d > 10.4 else face)
            if 10.4 < d <= 11.2:
                p.put(x, y, shade(brass, .6))
    for a in range(0, 360, 45):                                       # 눈금
        r = math.radians(a)
        for k in (8.5, 9.4):
            p.put(round(cx + math.cos(r) * k), round(cy + math.sin(r) * k), hexc('#bfe8f0'))
    for k in range(1, 9):                                             # 바늘 — 북쪽이 붉다
        p.put(round(cx + k * .35), round(cy - k), hexc('#e05a4a'))
        p.put(round(cx - k * .35), round(cy + k), hexc('#dfe6ea'))
    p.put(15, 16, hexc('#ffe08a')); p.put(16, 17, hexc('#ffe08a'))
    p.rect(14, 1, 4, 3, shade(brass, .9)); p.put(15, 0, brass); p.put(16, 0, brass)   # 고리
    for x, y in ((6, 8), (7, 7), (24, 25)):                          # 반짝임
        p.put(x, y, hexc('#fff4c8'))
    p.outline(hexc('#2a1e0c'))
    return p


if __name__ == '__main__':
    flotsam1().save(os.path.join(ROOT, 'obj', 'flotsam1.png'))
    flotsam2().save(os.path.join(ROOT, 'obj', 'flotsam2.png'))
    flotsam3().save(os.path.join(ROOT, 'obj', 'flotsam3.png'))
    compass().save(os.path.join(ROOT, 'item', 'mariner_compass.png'), scale=1)
