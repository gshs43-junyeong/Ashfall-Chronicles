#!/usr/bin/env python3
"""둔한 스프라이트 시트를 다시 굽는다 — 없는 자세를 만들어 넣는다.

`docs/v1.1-animation-fix.md` §4 의 "그림으로만 되는 일"을 실제로 하는 도구다.
프레임 하나를 원본 삼아 자세 변형(기울임 · 늘였다 줄이기 · 다리 갈라 옮기기 ·
발광 세기 · 파손)을 걸어 다른 프레임을 만든다. 손으로 다시 그리는 대신,
있는 그림의 부위를 실제로 움직여서 걸음과 숨을 만드는 방식이다.

시트는 논리 픽셀(frameW × frameH)을 4배로 구운 것이고, 4×4 블록이 전부 균일하다
(도구가 시작할 때 확인한다). 그래서 논리 해상도로 내려서 다루고 다시 4배로 굽는다.

    python3 tools/reanim.py            # 전부 다시 굽는다
    python3 tools/reanim.py glow_snail # 하나만

되돌리려면 git 으로 되돌리면 된다 — 원본을 따로 두지 않는다.
다 굽고 나면 `python3 tools/framediff.py` 로 수치를 확인하고,
10% 를 넘긴 개체는 `js/data.js` 에서 `stiff` 를 떼면 된다.
"""
import json
import math
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'game')
ASSETS = os.path.join(ROOT, 'assets')
M = json.load(open(os.path.join(ASSETS, 'manifest.json'), encoding='utf-8'))
S = 4


# ------------------------------------------------------------------ 격자
class Frame:
    """논리 해상도 한 프레임. p[(x,y)] = (r,g,b,a)"""

    def __init__(self, w, h, p=None):
        self.w, self.h = w, h
        self.p = dict(p or {})

    def copy(self):
        return Frame(self.w, self.h, self.p)

    def get(self, x, y):
        return self.p.get((x, y))

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c:
            self.p[(x, y)] = c

    def box(self):
        if not self.p:
            return (0, 0, 0, 0)
        xs = [k[0] for k in self.p]
        ys = [k[1] for k in self.p]
        return min(xs), min(ys), max(xs), max(ys)

    def bottom(self):
        return self.box()[3]


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def clamp8(v):
    return max(0, min(255, int(round(v))))


# ------------------------------------------------------------- 자세 변형
def shift(f, dx, dy, y0=None, y1=None):
    """(y0..y1 줄만) 통째로 옮긴다. 줄 범위를 주면 그 띠만 움직인다."""
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        if y0 is not None and not (y0 <= y <= (y1 if y1 is not None else f.h)):
            g.put(x, y, c)
        else:
            g.put(x + dx, y + dy, c)
    return g


def shear(f, deg, pivot=None):
    """발끝을 축으로 기울인다. 줄마다 가로로 미는 것이라 구멍이 안 생긴다."""
    if pivot is None:
        pivot = f.bottom()
    t = math.tan(math.radians(deg))
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        g.put(x + int(round((pivot - y) * t)), y, c)
    return g


def scale_y(f, k, pivot=None):
    """세로로 늘였다 줄인다(발끝 고정). 목적지에서 원본을 찍어 오므로 구멍이 없다."""
    if pivot is None:
        pivot = f.bottom() + 1
    g = Frame(f.w, f.h)
    for y in range(f.h):
        sy = pivot - (pivot - y) / k
        iy = int(math.floor(sy + 0.5))
        for x in range(f.w):
            c = f.get(x, iy)
            if c:
                g.put(x, y, c)
    return g


def scale_x(f, k, cx=None):
    """가로로 늘였다 줄인다(중심 고정)."""
    if cx is None:
        b = f.box()
        cx = (b[0] + b[2] + 1) / 2
    g = Frame(f.w, f.h)
    for x in range(f.w):
        sx = cx + (x - cx) / k
        ix = int(math.floor(sx + 0.5))
        for y in range(f.h):
            c = f.get(ix, y)
            if c:
                g.put(x, y, c)
    return g


def legs(f, ytop, dxl, dyl, dxr, dyr, xmid=None):
    """ytop 아래(다리)를 좌우로 갈라 서로 반대로 옮긴다 — 걸음의 뼈대."""
    if xmid is None:
        b = f.box()
        xmid = (b[0] + b[2] + 1) / 2
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        if y < ytop:
            g.put(x, y, c)
        elif x < xmid:
            g.put(x + dxl, y + dyl, c)
        else:
            g.put(x + dxr, y + dyr, c)
    return g


def glow(f, k, sat=40, minl=60, hue=None):
    """발광부만 밝기를 올리거나 내린다 — 눈·결정·용암.

    hue 를 주면(예: 'cyan') 그 계열만 골라 손댄다. 안 주면 채도 높은 픽셀 전부라,
    몸통이 원래 진한 색인 개체는 몸까지 물들어 버린다(수정게가 분홍이 됐던 이유)."""
    def pick(c):
        r, gg, b = c[0], c[1], c[2]
        if hue == 'cyan':
            return b > r * 1.25 and gg > r * 1.15
        if hue == 'amber':
            return r > b * 1.5 and gg > b * 1.15
        if hue == 'violet':
            return b > gg * 1.25 and r > gg * 1.1
        return True
    g = f.copy()
    for (x, y), c in f.p.items():
        if max(c[:3]) - min(c[:3]) >= sat and lum(c) >= minl and pick(c):
            g.p[(x, y)] = (clamp8(c[0] * k), clamp8(c[1] * k), clamp8(c[2] * k), c[3])
    return g


def tone(f, k):
    """전체 밝기. 죽음 프레임을 어둡게 할 때."""
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        g.p[(x, y)] = (clamp8(c[0] * k), clamp8(c[1] * k), clamp8(c[2] * k), c[3])
    return g


def fade(f, a):
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        g.p[(x, y)] = (c[0], c[1], c[2], clamp8(c[3] * a))
    return g


# ------------------------------------------- 보스 파손 (페이즈 구분용)
def _rng(seed):
    s = [seed & 0xffffffff or 1]

    def r():
        s[0] ^= (s[0] << 13) & 0xffffffff
        s[0] ^= s[0] >> 17
        s[0] ^= (s[0] << 5) & 0xffffffff
        return s[0] / 4294967296.0
    return r


def _edge(f):
    """실루엣 바깥 테두리에 닿은 픽셀들."""
    out = []
    for (x, y) in f.p:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in f.p:
                out.append((x, y))
                break
    return out


def _damage_plan(f, n_chip, n_crack, seed, color, rad=2, top_keep=0.12, top_bias=0.7):
    """어디를 뜯고 어디에 균열을 낼지 좌표만 정한다.

    같은 페이즈의 두 장(idle1·idle2)에 같은 계획을 적용해야 숨쉬기 차이는 남고
    파손만 겹친다. 프레임마다 따로 굴리면 두 장이 서로 다르게 부서져 깜빡인다."""
    r = _rng(seed)
    b = f.box()
    h = b[3] - b[1]
    lo, hi = b[1] + h * top_keep, b[1] + h * top_bias      # 관·뿔은 남기고 그 아래를 뜯는다
    cand = sorted(p for p in _edge(f) if lo <= p[1] <= hi) or sorted(_edge(f))
    holes = set()
    for _ in range(n_chip):
        cx, cy = cand[int(r() * len(cand)) % len(cand)]
        rr = rad if r() < 0.55 else rad - 1
        for dy in range(-rr, rr + 1):
            for dx in range(-rr, rr + 1):
                if dx * dx + dy * dy <= rr * rr:
                    holes.add((cx + dx, cy + dy))
    pts = sorted(f.p.keys())
    marks = []
    for _ in range(n_crack):
        x, y = pts[int(r() * len(pts)) % len(pts)]
        dx = 1 if r() < 0.5 else -1
        for _i in range(7):
            marks.append((x, y))
            if r() < 0.45:
                x += dx
            y += 1
            if r() < 0.2:
                dx = -dx
    return holes, marks, color


def damage(f, plan, shade=1.0, gl=1.0, hue=None):
    """계획대로 뜯고 균열을 낸다. 균열은 몸 안쪽에만 남는다.

    shade / gl 은 몸 전체의 명암과 발광 세기다. 뜯어낸 자국만으로는 큰 보스에서
    바뀐 픽셀 비율이 몇 %밖에 안 나온다 — 페이즈가 넘어간 걸 알아보려면
    몸 전체가 한 단계 달라져야 한다. 세부는 그대로 두고 밝기만 옮기는 것이라
    손으로 그린 그림을 잃지 않는다."""
    holes, marks, color = plan
    g = f.copy()
    if shade != 1.0:
        g = tone(g, shade)
    if gl != 1.0:
        g = glow(g, gl, hue=hue)
    for k in holes:
        g.p.pop(k, None)
    for k in marks:
        if k in g.p:
            g.p[k] = color
    return g


# --------------------------------------------------------------- 입출력
def load(kind, name):
    spec = M[kind]['sheets'][name]
    im = Image.open(os.path.join(ASSETS, spec['file'])).convert('RGBA')
    fw, fh, n = spec['frameW'], spec['frameH'], spec['count']
    gap = spec.get('gap', M[kind].get('gap', 0) if kind == 'bosses' else 0)
    step = fw * S + gap
    # 4×4 블록이 균일한지 확인 — 아니면 논리 해상도로 못 내린다
    px = im.load()
    for i in range(n):
        ox = i * step
        for y in range(0, fh * S, S):
            for x in range(0, fw * S, S):
                if px[ox + x, y] != px[ox + x + S - 1, y + S - 1]:
                    raise SystemExit('%s: 4배 블록이 균일하지 않다 (%d,%d)' % (name, x, y))
    out = []
    for i in range(n):
        f = Frame(fw, fh)
        ox = i * step
        for y in range(fh):
            for x in range(fw):
                c = px[ox + x * S + 1, y * S + 1]
                if c[3] > 0:
                    f.p[(x, y)] = c
        out.append(f)
    return out, spec, gap


def save(kind, name, fs, spec, gap):
    fw, fh, n = spec['frameW'], spec['frameH'], spec['count']
    step = fw * S + gap
    im = Image.new('RGBA', (step * n - gap, fh * S), (0, 0, 0, 0))
    px = im.load()
    for i, f in enumerate(fs):
        ox = i * step
        for (x, y), c in f.p.items():
            if not (0 <= x < fw and 0 <= y < fh):
                continue
            for dy in range(S):
                for dx in range(S):
                    px[ox + x * S + dx, y * S + dy] = c
    im.save(os.path.join(ASSETS, spec['file']))


# =================================================================== 몹
# 프레임: 0 idle1 · 1 idle2 · 2 move1 · 3 move2 · 4 atk · 5 death1 · 6 death2
def mob_ballast_form(f):
    """평형추 — 통짜 원통이라 다리보다 기울임이 걸음을 읽게 한다."""
    base = f[0]
    f[1] = glow(scale_y(base, 0.98), 0.72, hue='cyan')           # 숨 — 눈이 사그라든다
    f[2] = legs(shear(base, -4), base.bottom() - 4, 2, 0, -2, 0)
    f[3] = legs(shear(base, 4), base.bottom() - 4, -2, 0, 2, 0)
    f[4] = glow(shift(shear(f[4], 6), -1, 0), 1.6, hue='cyan')   # 겨누며 몸을 젖힌다
    return f


def mob_lost_miner(f):
    """길 잃은 광부 — 팔은 그대로 두고 다리와 몸통 기울임으로 걷게 한다."""
    base = f[0]
    f[1] = scale_y(base, 0.97)
    f[2] = legs(shift(shear(base, -3), 0, -1), base.bottom() - 7, 2, 0, -1, 0)
    f[3] = legs(shift(shear(base, 3), 0, -1), base.bottom() - 7, -1, 0, 2, 0)
    f[4] = shift(shear(f[4], -8), 2, 0)                          # 덤벼드는 자세
    return f


def mob_lavaslug(f):
    """용암 민달팽이 — 쉴 때는 웅크리고, 나아갈 때 몸을 늘인다."""
    mv = f[2]
    f[0] = scale_x(scale_y(mv, 0.88), 0.94)
    f[1] = glow(scale_x(scale_y(mv, 0.92), 0.96), 1.25)
    f[2] = scale_x(mv, 1.06)
    f[3] = shift(scale_x(mv, 0.96), 0, -1)
    return f


def mob_riveter(f):
    """리벳공 — 걸음은 이미 살아 있는데 선 자세가 걸음 첫 장과 같았다.
    다리를 모으고 어깨를 내린 "쉬는 자세"를 만들어 걷기 시작이 또렷해지게 한다."""
    base = f[0]
    rest = legs(base, base.bottom() - 9, 1, 0, -1, 0)            # 다리를 모은다
    f[0] = rest
    f[1] = glow(shift(scale_y(rest, 0.96), 0, 1), 1.3, hue='amber')
    return f


def mob_crystalcrab(f):
    """수정게 — 걸음은 훌륭한데 서 있는 자세가 걸음과 같았다. 쉬는 자세를 만든다."""
    mv = f[2]
    f[0] = shift(scale_y(mv, 0.84), 0, 1)
    f[1] = glow(shift(scale_y(mv, 0.88), 0, 1), 1.35, hue='cyan')
    return f


def mob_scrapcrawler(f):
    """고철 기어다니는 것 — idle 두 장이 완전히 같았다."""
    base = f[0]
    f[1] = glow(shift(scale_y(base, 0.94), 0, 1), 1.4, hue='amber')
    return f


def mob_glow_snail(f):
    """빛달팽이 — 일곱 장이 전부 같았다. 껍질 발광과 몸의 신축으로 살린다."""
    base = f[0]
    f[0] = glow(base, 0.78, hue='cyan')
    f[1] = glow(base, 1.4, hue='cyan')
    f[2] = scale_x(shift(base, 0, -1), 1.14)                     # 몸을 앞으로 늘인다
    f[3] = scale_x(base, 0.9)                                    # 껍질을 당겨 붙인다
    f[4] = glow(base, 1.25, hue='cyan')
    f[5] = fade(scale_y(base, 0.6), 0.9)
    f[6] = fade(tone(scale_y(base, 0.3), 0.7), 0.55)
    return f


def mob_arctic_hare(f):
    """눈산토끼 — 토끼는 걷지 않고 뛴다. 웅크림과 도약 두 장."""
    base = f[0]
    f[2] = scale_x(scale_y(base, 0.82), 1.1)                     # 웅크림
    f[3] = shift(scale_x(scale_y(base, 1.14), 0.94), 0, -3)      # 도약
    return f


def mob_ash_vole(f):
    """잿들쥐 — 종종걸음. 몸통을 앞뒤로 신축시킨다."""
    base = f[0]
    f[2] = shift(scale_x(base, 1.12), 0, -1)
    f[3] = shift(shear(base, 8), 0, 1)
    f[4] = shift(shear(base, -10), 2, 0)
    return f


def mob_jungle_frog(f):
    """정글 개구리 — 도약은 살아 있다. 앉아 있을 때 숨만 쉬게."""
    base = f[0]
    f[1] = shift(scale_y(base, 0.92), 0, 1)
    f[4] = scale_x(scale_y(f[4], 1.1), 0.94)
    return f


def mob_corrupttree(f):
    """썩은 나무 — 느린 건 무게감이라 그대로 두되, 선 자세가 걸음 첫 장과 같았다.
    가지를 늘어뜨린 쉬는 자세를 만든다."""
    base = f[0]
    f[0] = scale_y(base, 0.96)
    f[1] = shear(scale_y(base, 0.98), 2)
    return f


# ================================================================ 보스
# 프레임: 0 p1i1 · 1 p1i2 · 2 p2i1 · 3 p2i2 · 4 p3i1 · 5 p3i2
#
# 원칙 둘.
#  ① 이미 서로 다른 프레임은 건드리지 않는다. 페이즈 그림은 손으로 그린 것이고,
#     새로 만들어 덮으면 오히려 나빠진다(파수꾼의 금빛 균열, 막장의 붉은 이빨).
#  ② 파손은 "덮어쓰기"가 아니라 "덧붙이기"다. 원래 페이즈 그림 위에 얹으므로
#     원래 차이는 그대로 남고 페이즈 구분만 커진다.
def breathe(f, k=1.03, g=1.3, hue=None):
    return glow(scale_y(f, k), g, hue=hue)


def boss_first_keeper(f):
    """최초의 파수꾼 — 페이즈 그림은 멀쩡한데 숨을 안 쉬었다(0.2% / 0.1%).
    세 페이즈의 idle2 만 다시 만든다."""
    f[1] = breathe(f[0], 1.035, 1.5, hue='cyan')
    f[3] = breathe(f[2], 1.035, 1.5, hue='cyan')
    f[5] = breathe(f[4], 1.04, 1.55, hue='cyan')
    return f


def boss_void_king(f):
    """공허의 왕 — 1→2 가 1.5%였다. 2페이즈에 파손을 얹는다(3페이즈는 이미 다르다)."""
    plan = _damage_plan(f[2], 14, 9, 31, (208, 168, 255, 255))
    f[2] = damage(f[2], plan, 1.28, 1.2, 'violet')
    f[3] = damage(f[3], plan, 1.28, 1.2, 'violet')
    return f


def boss_bone_lord(f):
    """뼈의 군주 — 1→2 가 3.3%였다. 뼈가 깨져 나간 것으로 간다."""
    plan = _damage_plan(f[2], 15, 8, 41, (255, 232, 180, 255))
    f[2] = damage(f[2], plan, 0.82, 1.25, 'violet')
    f[3] = damage(f[3], plan, 0.82, 1.25, 'violet')
    return f


def boss_shaft_maw(f):
    """메워진 막장 — 1→2(6.6%) · 2→3(8.3%) 이 둘 다 약했다.
    페이즈마다 바위가 더 무너져 내리고 안쪽이 더 타오른다."""
    p2 = _damage_plan(f[2], 14, 9, 53, (255, 160, 80, 255))
    f[2] = damage(f[2], p2, 0.84, 1.2, 'amber')
    f[3] = damage(f[3], p2, 0.84, 1.2, 'amber')
    p3 = _damage_plan(f[4], 22, 13, 67, (255, 110, 50, 255))
    f[4] = damage(f[4], p3, 0.70, 1.35, 'amber')
    f[5] = damage(f[5], p3, 0.70, 1.35, 'amber')
    return f


def boss_pursuer(f):
    """추격자 — 1→2 가시 배치가 거의 같았다(8.1%)."""
    plan = _damage_plan(f[2], 16, 10, 71, (255, 130, 130, 255))
    f[2] = damage(f[2], plan, 1.22, 1.2, 'amber')
    f[3] = damage(f[3], plan, 1.22, 1.2, 'amber')
    return f


JOBS = [
    ('characters', 'ballast_form', mob_ballast_form),
    ('characters', 'lost_miner', mob_lost_miner),
    ('characters', 'lavaslug', mob_lavaslug),
    ('characters', 'riveter', mob_riveter),
    ('characters', 'crystalcrab', mob_crystalcrab),
    ('characters', 'scrapcrawler', mob_scrapcrawler),
    ('characters', 'glow_snail', mob_glow_snail),
    ('characters', 'arctic_hare', mob_arctic_hare),
    ('characters', 'ash_vole', mob_ash_vole),
    ('characters', 'jungle_frog', mob_jungle_frog),
    ('characters', 'corrupttree', mob_corrupttree),
    ('bosses', 'first_keeper', boss_first_keeper),
    ('bosses', 'void_king', boss_void_king),
    ('bosses', 'bone_lord', boss_bone_lord),
    ('bosses', 'shaft_maw', boss_shaft_maw),
    ('bosses', 'pursuer', boss_pursuer),
]

if __name__ == '__main__':
    only = sys.argv[1:]
    for kind, name, fn in JOBS:
        if only and name not in only:
            continue
        fs, spec, gap = load(kind, name)
        save(kind, name, fn(fs), spec, gap)
        print('구움:', name, spec['file'])
