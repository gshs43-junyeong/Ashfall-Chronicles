#!/usr/bin/env python3
"""5페이즈 보스 다섯 — **원본 손그림에서** 다섯 마디를 뽑는다.

■ 앞서 한 번 크게 틀렸다

  다섯을 절차 도형으로 새로 그렸다가 그림이 통째로 퇴화했다. 원본은 손으로 그린
  것이었다 — 가시 달린 공허별, 화로 격자와 리벳이 박힌 놋쇠 기계, 후광 두른
  마네킹, 청록 마디가 박힌 궤도, 용암 금이 간 바위 입. 그것을 평평한 타원과
  네모로 갈아치웠으니 크기만 커지고 그림은 잃었다.

  슬라임과 개조 시트에서 통했던 길이 여기서도 맞다: **원본을 한 픽셀도 건드리지
  않고, 그 둘레에 얹어서** 마디를 만든다.

■ 다섯 마디를 어떻게 나누나

  원본 시트는 3페이즈 × idle 2 = 여섯 칸이다. 그 셋이 그림가가 정한 진행이므로
  그걸 기둥으로 삼는다:

      ph0 = 원본 p1            ph1 = 원본 p1 + 덧붙임 1
      ph2 = 원본 p2 + 덧붙임 2  ph3 = 원본 p2 + 덧붙임 3
      ph4 = 원본 p3 + 덧붙임 4

  원본 세 벌은 그대로 보이고, 사이에 새 마디가 둘 끼어든다.

■ "기존 보스보다 더 크게" 는 덧붙여서 만든다

  원본을 확대하면 픽셀 격자가 깨져 죽이 된다. 대신 더 큰 칸 가운데에 원본을
  **원래 크기 그대로** 놓고 둘레에 부속을 그려 화면에서 커지게 한다. 부속 색은
  원본에서 뽑은 것만 쓴다 — 새 색을 섞으면 덧댄 티가 난다.

      별을 쫓아온 것  102x107 → 140x146   가시가 길어지고 후광이 넓어진다
      갱을 메운 것     92x84  → 128x116   둘레에 무너진 바위가 쌓인다
      헤파            94x113 → 130x152   옆 기둥이 서고 화로 격자가 늘어난다
      원형            96x116 → 132x156   후광이 커지고 받침대가 선다
      환원기         118x132 → 158x178   바깥 궤도가 한 겹 더 돈다

■ 마디마다 무엇이 달라지나

  별을 쫓아온 것  가시가 길어진다 → 후광이 넓어진다 → 핵이 밝아진다 → 별먼지가 흩어진다
  갱을 메운 것    바위가 쌓인다 → 용암 금이 벌어진다 → 금이 늘어난다 → 안이 환해진다
  헤파           기둥이 선다 → 화로가 열린다 → 팔이 갈라진다 → 팔이 더 갈라진다
  원형           후광이 커진다 → 받침대가 선다 → 받침대가 깨진다 → 가슴이 열린다
  환원기         궤도 한 겹 → 두 겹 → 마디가 빛난다 → 궤도가 조각난다

  원본(_src/)은 읽기만 한다. 다시 구울 때마다 거기서 시작하므로 몇 번을 돌려도
  그림이 뭉개지지 않는다.

사용법:  python3 tools/mkbossbig.py && node tools/sync-manifest.mjs
"""
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'game', 'assets', 'boss')
SRC = os.path.join(OUT, '_src')          # 손대지 않은 원본. 여기서만 읽는다
S = 4
PHASES = 5
FRAMES = PHASES * 2

# 보스마다 (원본 w,h · 새 프레임 w,h · 판정 w,h)
SPEC = {
    'pursuer':   (102, 107, 140, 146, 120, 130),
    'shaft_maw': (92, 84, 128, 116, 112, 102),
    'hepha':     (94, 113, 130, 152, 112, 140),
    'archetype': (96, 116, 132, 156, 114, 144),
    'restorer':  (118, 132, 158, 178, 138, 162),
}

# 원본에서 실제로 센 색만 쓴다 (골격 · 어두운 쪽 · 빛)
PAL = {
    'pursuer':   ((75, 48, 104), (33, 21, 48), (242, 217, 138)),
    'shaft_maw': ((109, 103, 92), (58, 45, 28), (232, 150, 60)),
    'hepha':     ((138, 106, 58), (64, 69, 78), (255, 210, 122)),
    'archetype': ((184, 180, 168), (58, 47, 24), (201, 162, 75)),
    'restorer':  ((138, 148, 168), (60, 68, 84), (164, 174, 194)),
}


class Pen:
    """덧붙임만 그리는 붓. 그린 것은 원본 **아래** 에 깔린다."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def dot(self, x, y, col):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = (col[0], col[1], col[2], 255)

    def ell(self, cx, cy, rx, ry, col):
        for y in range(int(-ry) - 1, int(ry) + 2):
            for x in range(int(-rx) - 1, int(rx) + 2):
                if (x / max(rx, .01)) ** 2 + (y / max(ry, .01)) ** 2 <= 1.0:
                    self.dot(cx + x, cy + y, col)

    def rect(self, x, y, w, h, col):
        for dy in range(int(round(h))):
            for dx in range(int(round(w))):
                self.dot(x + dx, y + dy, col)

    def stroke(self, x0, y0, x1, y1, r, col):
        """경로를 따라 원을 찍는 굵은 획. 선 굵기를 세로로만 번지게 하면
           대각선이 1픽셀로 남아 팔다리가 성냥개비가 된다(한 번 그랬다)."""
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            u = i / n
            self.ell(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, r, col)

    def ring(self, cx, cy, r, t, col, a0=0.0, a1=math.tau):
        n = int(r * 9) + 24
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            for k in range(int(t)):
                self.dot(cx + math.cos(a) * (r - k), cy + math.sin(a) * (r - k), col)

    def speck(self, seed, dens=0.10, k=0.82):
        """덧붙인 부속에만 얼룩. 정수 해시의 마무리 섞음(shift·곱·shift)까지
           돌려야 흩어진다 — 단순 곱·xor 은 골덴 같은 사선 줄무늬가 된다."""
        for y in range(self.h):
            for x in range(self.w):
                a = self.px[x, y]
                if a[3] == 0:
                    continue
                v = (x * 374761393 + y * 668265263 + seed * 1442695041) & 0xFFFFFFFF
                v ^= v >> 13
                v = (v * 1274126177) & 0xFFFFFFFF
                v = (v ^ (v >> 16)) & 1023
                if v < dens * 1024:
                    self.dot(x, y, tuple(int(c * k) for c in a[:3]))

    def outline(self, col=(10, 10, 14)):
        on = [[self.px[x, y][3] > 0 for y in range(self.h)] for x in range(self.w)]
        for x in range(self.w):
            for y in range(self.h):
                if on[x][y]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and on[nx][ny]:
                        self.dot(x, y, col)
                        break


def glowdisc(im, cx, cy, r, col, a0):
    """원본 **위** 에 얹는 빛. 더하기라 아래 그림이 비쳐 남는다 — 덮으면 안 된다."""
    px = im.load()
    for y in range(max(0, int(cy - r)), min(im.size[1], int(cy + r) + 1)):
        for x in range(max(0, int(cx - r)), min(im.size[0], int(cx + r) + 1)):
            d = math.hypot(x - cx, y - cy) / r
            if d > 1:
                continue
            a = (1 - d) ** 2 * a0
            o = px[x, y]
            if o[3] == 0:
                continue                     # 빈 칸에는 안 번진다
            px[x, y] = (min(255, int(o[0] + col[0] * a)),
                        min(255, int(o[1] + col[1] * a)),
                        min(255, int(o[2] + col[2] * a)), o[3])


# ------------------------------------------------- 보스별 덧붙임 (k = 0~4)

def add_pursuer(p, k, ox, oy, ow, oh, pal):
    body, dark, glow = pal
    cx, cy = ox + ow / 2, oy + oh / 2
    for i in range(8):                          # 원본 가시를 바깥으로 잇는다
        a = i * math.tau / 8 + 0.39
        r0, r1 = ow * 0.44, ow * 0.44 + 8 + k * 5
        p.stroke(cx + math.cos(a) * r0, cy + math.sin(a) * r0,
                 cx + math.cos(a) * r1, cy + math.sin(a) * r1, 4 - min(2, k // 2), dark)
    if k >= 2:
        p.ring(cx, cy, ow * 0.5 + 8 + k * 4, 2, body)
    if k >= 4:
        for i in range(14):
            a = i * math.tau / 14 + 0.2
            r = ow * 0.6 + (i % 3) * 7
            p.ell(cx + math.cos(a) * r, cy + math.sin(a) * r, 2, 2, glow)


def add_shaft_maw(p, k, ox, oy, ow, oh, pal):
    rock, dark, glow = pal
    cx, base = ox + ow / 2, oy + oh
    n = 6 + k * 2
    for i in range(n):
        a = math.pi + i * math.pi / (n - 1)
        x = cx + math.cos(a) * (ow * 0.52 + 6)
        y = base - 10 + math.sin(a) * (oh * 0.40)
        p.ell(x, y, 9 - (i % 3), 7 - (i % 3), rock if i % 2 else dark)
    for i in range(k * 2):                      # 용암 금
        x = ox + 8 + i * (ow - 16) / max(k * 2 - 1, 1)
        p.stroke(x, base - 2, x + (6 if i % 2 else -6), base - 16 - k * 3, 1, glow)


def add_hepha(p, k, ox, oy, ow, oh, pal):
    brass, steel, fire = pal
    cx, base = ox + ow / 2, oy + oh
    for sx in (-1, 1):                          # 옆 기둥
        x = cx + sx * (ow * 0.5 + 8)
        p.rect(x - 6, oy + 12, 12, oh - 10, steel)
        for yy in range(int(oy) + 18, int(base) - 8, 14):
            p.rect(x - 8, yy, 16, 4, brass)
    if k >= 1:                                  # 화로 격자가 아래로 늘어난다
        for i in range(3 + k):
            p.rect(cx + (i - (2 + k) / 2) * 9, base - 4, 4, 14 + k * 2,
                   fire if k >= 2 else brass)
    if k >= 3:                                  # 갈라져 나온 팔
        for i in range(k - 2):
            for sx in (-1, 1):
                p.stroke(cx + sx * ow * 0.42, oy + 30 + i * 18,
                         cx + sx * (ow * 0.5 + 28), oy + 14 + i * 24, 3, steel)


def add_archetype(p, k, ox, oy, ow, oh, pal):
    pale, shadow, gold = pal
    cx, base = ox + ow / 2, oy + oh
    p.ring(cx, oy + 16, 20 + k * 5, 2, gold)    # 후광
    for i in range([0, 0, 4, 2, 0][k]):         # 받침대 — 섰다가 깨진다
        x = cx - 46 + i * (92 / 3)
        p.rect(x - 6, base - 22, 12, 22, shadow)
        p.rect(x - 10, base - 26, 20, 5, pale)


def add_restorer(p, k, ox, oy, ow, oh, pal):
    steel, dark, lite = pal
    cx, cy = ox + ow / 2, oy + oh / 2
    r = ow * 0.5 + 10
    if k <= 2:
        p.ring(cx, cy, r, 3, steel)
        if k >= 1:
            p.ring(cx, cy, r + 8, 2, dark)
    else:
        for i in range(4):                      # 조각난 궤도
            a0 = i * math.tau / 4 + (0.3 if k == 4 else 0)
            p.ring(cx, cy, r + (i % 2) * 8, 3, steel, a0, a0 + 1.0)
    if k >= 2:
        for i in range(8):
            a = i * math.tau / 8
            p.ell(cx + math.cos(a) * r, cy + math.sin(a) * r, 3, 3, lite)


ADD = {'pursuer': add_pursuer, 'shaft_maw': add_shaft_maw, 'hepha': add_hepha,
       'archetype': add_archetype, 'restorer': add_restorer}
SRC_PH = [0, 0, 1, 1, 2]      # 마디 → 원본의 어느 벌 (원본은 세 벌뿐이다)


def main():
    for name, (ow, oh, fw, fh, hw, hh) in SPEC.items():
        src = Image.open(os.path.join(SRC, name + '.png')).convert('RGBA')
        sheet = Image.new('RGBA', (fw * FRAMES * S, fh * S), (0, 0, 0, 0))
        ox, oy = (fw - ow) // 2, fh - oh - 2      # 가운데 · 바닥 맞춤
        for i in range(FRAMES):
            ph, fr = i // 2, i % 2
            p = Pen(fw, fh)                       # 1. 덧붙임 — 원본 아래
            ADD[name](p, ph, ox, oy, ow, oh, PAL[name])
            p.speck(seed=i * 13 + len(name))
            p.outline()
            frame = p.im
            si = SRC_PH[ph] * 2 + fr               # 2. 원본을 그대로 얹는다
            cut = src.crop((si * ow * S, 0, (si + 1) * ow * S, oh * S)) \
                     .resize((ow, oh), Image.NEAREST)
            frame.alpha_composite(cut, (ox, oy))
            if ph >= 2:                            # 3. 빛은 더하기로만
                glowdisc(frame, ox + ow / 2, oy + oh * 0.5, ow * 0.40,
                         PAL[name][2], 0.09 * (ph - 1))
            sheet.paste(frame.resize((fw * S, fh * S), Image.NEAREST), (i * fw * S, 0))
        pth = os.path.join(OUT, name + '.png')
        sheet.save(pth)
        print('  %-11s 원본 %3dx%-3d → %3dx%-3d · 판정 %3dx%-3d · %d칸 · %dB'
              % (name, ow, oh, fw, fh, hw, hh, FRAMES, os.path.getsize(pth)))
    print('\n매니페스트·ENEMIES 값:')
    for k, (_, _, fw, fh, hw, hh) in SPEC.items():
        print('  %-11s frameW %d frameH %d count %d · w %d h %d' % (k, fw, fh, FRAMES, hw, hh))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
