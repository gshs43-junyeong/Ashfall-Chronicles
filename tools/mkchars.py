#!/usr/bin/env python3
"""시작 캐릭터 5종의 스프라이트 시트를 굽는다.

원본 game/assets/char/player.png (20x40 논리픽셀 x 4배, 13프레임)을 읽어
픽셀마다 어느 부위인지(머리/피부/외투/바지/가죽/목도리/허리띠/외곽선) 가려낸 뒤,
캐릭터별 색표로 갈아끼우고 실루엣을 조금씩 고쳐 5장을 굽는다.

프레임 순서는 원본과 완전히 동일하다 — manifest.json의 playerFrames:
  0 idle1  1 idle2  2 walk1  3 walk2  4 walk3  5 walk4
  6 jump   7 fall   8 dash   9 atk1  10 atk2  11 atk3  12 hurt

  python3 tools/mkchars.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'game/assets/char/player.png')
OUT = os.path.join(ROOT, 'game/assets/char')
FW, FH, S, N = 20, 40, 4, 13
OUTLINE = (0x0c, 0x0c, 0x11)

# 12번(피격) 프레임은 통째로 붉게 씻겨 있다. 실측으로 맞춘 값 — 되돌렸다가 다시 씌운다.
WASH_C, WASH_T = (208, 48, 48), 0.42


# ---------------------------------------------------------------- 색 도우미
def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def mixc(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def clamp8(v):
    return max(0, min(255, round(v)))


# ------------------------------------------------- 원본 색 -> 부위 분류표
# navy 무리는 머리카락/모자와 바지가 같은 색이라 y 위치로 한 번 더 가른다.
ANCHORS = [
    ('#0c0c11', 'out'),
    ('#3c4257', 'navy'), ('#2a2f3f', 'navy'), ('#707a94', 'navy'), ('#53596b', 'navy'),
    ('#33384a', 'navy'), ('#333a4e', 'navy'), ('#4a5065', 'navy'), ('#252b3a', 'navy'),
    ('#232632', 'navy'), ('#1e2330', 'navy'), ('#5d6885', 'navy'), ('#949aa8', 'navy'),
    ('#e6bb8a', 'skin'), ('#b0855c', 'skin'), ('#e9c398', 'skin'), ('#bd9971', 'skin'),
    ('#d3836a', 'skin'),
    ('#5f584f', 'coat'), ('#776f61', 'coat'), ('#4c4036', 'coat'), ('#3e3933', 'coat'),
    ('#878074', 'coat'), ('#604e40', 'coat'), ('#625b50', 'coat'), ('#55514b', 'coat'),
    ('#4a3626', 'leat'), ('#34261b', 'leat'), ('#3d2c1f', 'leat'), ('#38291d', 'leat'),
    ('#2b1f16', 'leat'),
    ('#9c463f', 'scarf'), ('#7f3b35', 'scarf'), ('#ae4845', 'scarf'), ('#854038', 'scarf'),
    ('#d8a94b', 'belt'), ('#ffd76a', 'belt'),
]
ANCHORS = [(hx(h), r) for h, r in ANCHORS]

# 부위별 대표색 — 밝기 차이를 그대로 옮기기 위한 기준점
REF = {k: hx(v) for k, v in {
    'out': '#0c0c11', 'head': '#3c4257', 'pant': '#33384a', 'skin': '#e6bb8a',
    'coat': '#5f584f', 'leat': '#4a3626', 'scarf': '#9c463f', 'belt': '#d8a94b',
}.items()}


def classify(c, y, head_bottom):
    if lum(c) < 20:
        return 'out'
    best, bd = None, 1 << 30
    for a, r in ANCHORS:
        d = (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2 + (c[2] - a[2]) ** 2
        if d < bd:
            bd, best = d, r
    if best == 'navy':
        return 'head' if y <= head_bottom else 'pant'
    return best


def remap(c, region, pal):
    """원본 픽셀의 밝기 차이를 유지한 채 부위 색만 갈아끼운다."""
    if region == 'out':
        return OUTLINE
    base = pal[region]
    tgt = lum(base) + (lum(c) - lum(REF[region]))
    lb = lum(base)
    if tgt <= lb:
        k = max(0.0, tgt) / max(1e-6, lb)
        return tuple(clamp8(ch * k) for ch in base)
    k = min(1.0, (tgt - lb) / max(1e-6, 255.0 - lb))
    return mixc(base, (255, 255, 255), k * 0.9)


# ---------------------------------------------------------------- 격자 도구
class Grid:
    def __init__(self):
        self.p = {}          # (x,y) -> rgb
        self.r = {}          # (x,y) -> region
        self.added = set()

    def get(self, x, y):
        return self.p.get((x, y))

    def put(self, x, y, c, region=None, new=False):
        if not (0 <= x < FW and 0 <= y < FH):
            return
        if new and (x, y) not in self.p:
            self.added.add((x, y))
        self.p[(x, y)] = c
        if region:
            self.r[(x, y)] = region

    def erase(self, x, y):
        self.p.pop((x, y), None)
        self.r.pop((x, y), None)

    def box(self, *regions):
        pts = [k for k, v in self.r.items() if v in regions]
        if not pts:
            return None
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    def outline_new(self):
        for (x, y) in list(self.added):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < FW and 0 <= ny < FH and (nx, ny) not in self.p:
                    self.put(nx, ny, OUTLINE, 'out')

    def strip_lone_outline(self):
        for (x, y), reg in list(self.r.items()):
            if reg != 'out':
                continue
            if not any(self.r.get((x + dx, y + dy), 'out') != 'out'
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                                      (1, 1), (1, -1), (-1, 1), (-1, -1))):
                self.erase(x, y)


# ---------------------------------------------------------------- 캐릭터 표
def P(head, skin, coat, pant, leat, scarf, belt):
    return {'head': hx(head), 'skin': hx(skin), 'coat': hx(coat), 'pant': hx(pant),
            'leat': hx(leat), 'scarf': hx(scarf), 'belt': hx(belt), 'out': OUTLINE}


CHARS = {
    # 떠돌이 — 원본 색을 그대로 쓰되 가슴 멜빵과 허리 주머니로 "길 위의 사람"을 만든다
    'wanderer': dict(
        pal=P('#3c4257', '#e6bb8a', '#5f584f', '#33384a', '#4a3626', '#9c463f', '#d8a94b'),
        ops=['strap', 'pouch']),
    # 굴 파는 이 — 챙 달린 가죽 안전모 + 이마 램프, 황토색 작업복
    'digger': dict(
        pal=P('#6f4a24', '#d9ab7a', '#96793f', '#3b3b42', '#5c4028', '#6d4c30', '#c08c2e'),
        ops=['brim', 'lamp']),
    # 사냥꾼 — 뒤로 흘러내린 초록 두건, 등에 멘 화살통
    'ranger': dict(
        pal=P('#3d5a35', '#dcb184', '#4d6b3c', '#4b4232', '#4a3626', '#6f7d42', '#a8863a'),
        ops=['hoodtail', 'hoodrim', 'quiver']),
    # 수련생 — 길게 늘어뜨린 은발, 다리를 덮는 보라 로브, 어깨 옆의 룬 불빛
    'adept': dict(
        pal=P('#cfc9de', '#e9cba6', '#5b4a90', '#443a72', '#3f3663', '#8172c4', '#cfa96a'),
        ops=['longhair', 'robe']),
    # 빈손 — 잿빛 헝클어진 머리, 밑단이 뜯긴 누더기, 다 닳은 신
    'stray': dict(
        pal=P('#c0b7a5', '#e3c9ab', '#575249', '#403c36', '#453d34', '#6e6559', '#7d7466'),
        ops=['tuft', 'ragged', 'wornshoe']),
}


# ------------------------------------------------------------------ 실루엣
def op_strap(g, pal):
    """가슴을 가로지르는 멜빵 한 줄 (외투 위에만 얹는다)."""
    b = g.box('coat')
    if not b:
        return
    x0, y0, x1, y1 = b
    c = mixc(pal['leat'], (0, 0, 0), 0.15)
    for i in range(11):
        x, y = x0 + 3 + i * 6 // 11, y0 + 1 + i
        if g.r.get((x, y)) == 'coat':
            g.put(x, y, c, 'leat')


def op_pouch(g, pal):
    """허리띠 아래 작은 주머니."""
    b = g.box('belt')
    if not b:
        return
    x0, y0, x1, y1 = b
    c = pal['leat']
    for dy in range(3):
        for dx in range(3):
            x, y = x1 - 3 + dx, y1 + 1 + dy
            if g.r.get((x, y)) in ('coat', 'pant'):
                g.put(x, y, mixc(c, (255, 255, 255), 0.12 if dy == 0 else 0.0), 'leat')


def op_brim(g, pal):
    """안전모 챙 — 앞으로 세 칸, 뒤로 한 칸 튀어나온다."""
    b = g.box('head')
    if not b:
        return
    x0, y0, x1, y1 = b
    y = y0 + 3
    c = mixc(pal['head'], (0, 0, 0), 0.25)
    for x in range(x0 - 1, x1 + 3):
        g.put(x, y, c, 'head', new=True)
    for x in range(x0, x1 + 1):
        if g.r.get((x, y - 1)) == 'head':
            g.put(x, y - 1, mixc(pal['head'], (255, 255, 255), 0.10), 'head')


def op_lamp(g, pal):
    """안전모 앞의 램프 — 두 칸 불빛."""
    b = g.box('head')
    if not b:
        return
    x0, y0, x1, y1 = b
    lx = x1 - 2
    g.put(lx, y0 + 1, hx('#fff2c0'), 'belt')
    g.put(lx + 1, y0 + 1, hx('#ffd76a'), 'belt')
    g.put(lx, y0 + 2, hx('#e0a832'), 'belt')
    g.put(lx + 1, y0 + 2, hx('#a8701c'), 'belt')


def op_hoodtail(g, pal):
    """두건 자락 — 뒤통수에서 어깨까지 흘러내린다."""
    b = g.box('head')
    if not b:
        return
    x0, y0, x1, y1 = b
    c = mixc(pal['head'], (0, 0, 0), 0.22)
    for i, y in enumerate(range(y0 + 3, y0 + 9)):
        w = 2 if i < 4 else 1
        for dx in range(w):
            g.put(x0 - 2 + dx, y, mixc(c, (0, 0, 0), 0.05 * i), 'head', new=True)


def op_hoodrim(g, pal):
    """이마를 덮는 두건 테두리."""
    b = g.box('head')
    if not b:
        return
    x0, y0, x1, y1 = b
    c = mixc(pal['head'], (255, 255, 255), 0.18)
    y = y0 + 3
    for x in range(x0, x1 + 1):
        if g.r.get((x, y)) == 'head':
            g.put(x, y, c, 'head')


def op_quiver(g, pal):
    """등에 멘 화살통 — 통 끝에 화살깃이 하얗게 보인다."""
    b = g.box('coat')
    if not b:
        return
    x0, y0, x1, y1 = b
    c = pal['leat']
    for y in range(y0 + 2, min(y0 + 11, y1 + 2)):
        g.put(x0 - 1, y, mixc(c, (255, 255, 255), 0.14), 'leat', new=True)
        if g.r.get((x0, y)) in ('coat', 'pant'):
            g.put(x0, y, mixc(c, (0, 0, 0), 0.20), 'leat')
    g.put(x0 - 1, y0 + 1, hx('#ded6bd'), 'leat', new=True)
    g.put(x0, y0 + 1, hx('#a89c80'), 'leat')


def op_longhair(g, pal):
    """등까지 내려온 긴 머리."""
    b = g.box('head')
    if not b:
        return
    x0, y0, x1, y1 = b
    for i, y in enumerate(range(y0 + 4, y0 + 15)):
        w = 2 if i < 8 else 1
        for dx in range(w):
            g.put(x0 - 2 + dx, y, mixc(pal['head'], (0, 0, 0), 0.10 + 0.03 * i),
                  'head', new=True)


def op_robe(g, pal):
    """허리 아래로 이어지는 로브 자락 — 바지 윗부분을 덮는다."""
    b = g.box('coat')
    if not b:
        return
    x0, y0, x1, y1 = b
    for (x, y), reg in list(g.r.items()):
        if reg == 'pant' and y1 < y <= y1 + 7:
            g.put(x, y, mixc(pal['coat'], (0, 0, 0), 0.10 + 0.02 * (y - y1)), 'coat')


def op_rune(g, pal):
    """어깨 옆에 떠 있는 룬 불빛."""
    b = g.box('head')
    if not b:
        return
    x0, y0, x1, y1 = b
    cx, cy = min(FW - 2, x1 + 3), y0 + 6
    g.put(cx, cy, hx('#5fd0c0'), 'belt', new=True)
    g.put(cx + 1, cy, hx('#a8f0e4'), 'belt', new=True)
    g.put(cx, cy + 1, hx('#2f8a80'), 'belt', new=True)
    g.put(cx + 1, cy + 1, hx('#5fd0c0'), 'belt', new=True)


def op_tuft(g, pal):
    """헝클어진 머리 몇 가닥."""
    b = g.box('head')
    if not b:
        return
    x0, y0, x1, y1 = b
    for y in (y0 + 2, y0 + 4):
        g.put(x0 - 1, y, mixc(pal['head'], (0, 0, 0), 0.18), 'head', new=True)


def op_ragged(g, pal):
    """외투 밑단이 톱니처럼 뜯겨 있다 (구멍이 아니라 늘어진 자락)."""
    b = g.box('coat')
    if not b:
        return
    x0, y0, x1, y1 = b
    dark = mixc(pal['coat'], (0, 0, 0), 0.34)
    for x in range(x0, x1 + 1):
        col = [y for y in range(y0, y1 + 1) if g.r.get((x, y)) == 'coat']
        if not col:
            continue
        bot = max(col)
        for dy in range(2 if x % 2 else 1):
            y = bot + dy
            if g.r.get((x, y)) in ('coat', 'pant'):
                g.put(x, y, mixc(dark, (0, 0, 0), 0.10 * dy), 'coat')


def op_wornshoe(g, pal):
    """신이 다 닳아 발이 드러난다."""
    for (x, y), reg in list(g.r.items()):
        if reg == 'leat' and y >= FH - 3:
            g.put(x, y, remap(REF['skin'], 'skin', pal), 'skin')


OPS = {'strap': op_strap, 'pouch': op_pouch, 'brim': op_brim, 'lamp': op_lamp,
       'hoodtail': op_hoodtail, 'hoodrim': op_hoodrim, 'quiver': op_quiver,
       'longhair': op_longhair, 'robe': op_robe, 'rune': op_rune,
       'tuft': op_tuft, 'ragged': op_ragged, 'wornshoe': op_wornshoe}


# ---------------------------------------------------------------------- 굽기
def read_frames():
    im = Image.open(SRC).convert('RGBA')
    # tools/unclip.py 를 돌린 뒤라면 프레임이 사방 한 논리픽셀씩 넓어져 있다.
    # 여기서는 옛 규격(20x40)을 기준으로 부위를 가려내므로 여백을 도로 벗겨 낸다.
    # (구워 낸 다섯 장에는 마지막에 unclip.py 를 다시 돌려 같은 여백을 주면 된다)
    pad = (im.size[0] - FW * S * N) // (2 * N)
    if pad:
        cut = Image.new('RGBA', (FW * S * N, FH * S), (0, 0, 0, 0))
        step = FW * S + 2 * pad
        for f in range(N):
            cut.paste(im.crop((f * step + pad, pad, f * step + pad + FW * S, pad + FH * S)),
                      (f * FW * S, 0))
        im = cut
    assert im.size == (FW * S * N, FH * S), im.size
    out = []
    for f in range(N):
        g = {}
        for y in range(FH):
            for x in range(FW):
                p = im.getpixel((f * FW * S + x * S + 1, y * S + 1))
                if p[3] > 0:
                    g[(x, y)] = p[:3]
        out.append(g)
    return out


def detint(g):
    """피격 프레임의 붉은 물을 걷어낸다 (분류를 위해서만)."""
    t = WASH_T
    return {k: tuple(clamp8((v[i] - WASH_C[i] * t) / (1 - t)) for i in range(3))
            for k, v in g.items()}


def build(name, spec):
    frames = read_frames()
    pal = spec['pal']
    sheet = Image.new('RGBA', (FW * S * N, FH * S), (0, 0, 0, 0))
    for f, src in enumerate(frames):
        raw = detint(src) if f == 12 else src
        # 목도리 윗줄 위쪽을 머리 구역으로 본다 (머리카락과 바지가 같은 색이라)
        scarf_top = min((y for (x, y), c in raw.items()
                         if classify(c, 0, FH) == 'scarf'), default=10)
        g = Grid()
        for (x, y), c in raw.items():
            reg = classify(c, y, scarf_top - 1)
            g.put(x, y, remap(c, reg, pal), reg)
        for op in spec['ops']:
            OPS[op](g, pal)
        g.outline_new()
        g.strip_lone_outline()
        for (x, y), c in g.p.items():
            if f == 12 and g.r.get((x, y)) != 'out':
                c = mixc(c, WASH_C, WASH_T)
            for dy in range(S):
                for dx in range(S):
                    sheet.putpixel((f * FW * S + x * S + dx, y * S + dy), c + (255,))
    path = os.path.join(OUT, 'player_%s.png' % name)
    sheet.save(path)
    return path


if __name__ == '__main__':
    for name, spec in CHARS.items():
        print(build(name, spec))
