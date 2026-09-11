#!/usr/bin/env python3
"""둔한 스프라이트 시트를 다시 굽는다 — 없는 자세를 만들어 넣는다.

`docs/v1.1-animation-fix.md` §4 의 "그림으로만 되는 일"을 실제로 하는 도구다.
프레임 하나를 원본 삼아 자세 변형(기울임 · 늘였다 줄이기 · 다리 갈라 옮기기 ·
발광 세기 · 파손)을 걸어 다른 프레임을 만든다. 손으로 다시 그리는 대신,
있는 그림의 부위를 실제로 움직여서 걸음과 숨을 만드는 방식이다.

시트는 논리 픽셀(frameW × frameH)을 4배로 구운 것이고, 4×4 블록이 전부 균일하다
(도구가 시작할 때 확인한다). 그래서 논리 해상도로 내려서 다루고 다시 4배로 굽는다.

    python3 tools/reanim.py            # 손그림 작업 + 갈래별 일괄
    python3 tools/reanim.py --auto     # 갈래별 일괄만
    python3 tools/reanim.py glow_snail # 손그림 작업 하나만

★ 보스 시트를 굽는 순서: tools/mkbossbig.py → tools/mkarchetype.py →
  **tools/reanim.py**. 앞의 둘이 마디별 그림을 만들고, 여기서 숨을 넣는다.
  (원형 archetype 은 열 칸을 손으로 그렸으므로 여기서 안 건드린다)

되돌리려면 git 으로 되돌리면 된다 — 원본을 따로 두지 않는다.
다 굽고 나면 **`python3 tools/animcheck.py`** 로 확인한다. framediff.py 는
제자리에서 뺀 값이라 그림이 통째로 미끄러지기만 해도 높게 나온다 — 그 함정에
129 칸쌍이 걸려 있었다.
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




# ★ 메워진 막장 · 별을 쫓아온 것의 낡은 작업은 뺐다. 그 둘은 이제 10칸 규격으로
#   tools/mkbossbig.py 가 굽고, 마디 구분도 거기서 낸다. 여기 남겨 두면 6칸
#   시절 좌표로 엉뚱한 칸에 파손을 얹는다.
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
]
# ================================================ 숨·걸음 되살리기 (일괄)
#
# ■ 왜 한꺼번에 하나
#
#   tools/animcheck.py 로 게임이 **실제로 그리는** 칸쌍 260 개를 전부 재 보니
#   129 개가 "실움직임 8% 미만" 이었다. 대부분은 픽셀 차이만 보면 30~50% 라
#   멀쩡해 보이는데, 가장 잘 맞는 자리로 겹쳐 보면 0~5% 로 주저앉는다 —
#   그림이 통째로 한 칸 미끄러지기만 하고 관절은 하나도 안 움직인 것이다.
#   눈에는 애니메이션이 아니라 슬라이드로 보인다.
#
#   한 마리씩 다른 이야기를 붙일 일이 아니다. **생김새가 같으면 숨 쉬는 법도
#   같다.** 그래서 여섯 갈래로 나누고 갈래마다 한 가지 변형을 쓴다. 원본
#   픽셀을 옮길 뿐 새 픽셀은 한 점도 안 그린다 — 덧댄 티가 날 여지가 없다.
#
#       biped  두 발로 선 것    숨으로 눌리고 두 팔이 **엇갈려** 흔들린다
#       quad   네 발 · 낮은 것  몸이 눌리고 앞뒤 다리가 엇갈린다
#       hover  떠 있는 것       늘었다 줄고 아랫자락이 물결친다
#       orb    구슬 · 눈        늘었다 줄고 빛이 세진다
#       fish   헤엄치는 것      꼬리가 휜다
#       blob   덩어리           눌렸다 펴진다
#
#   ★ 두 팔을 **같이** 올리면 안 된다. 그러면 몸통 눌림과 합쳐져 결국 그림이
#     통째로 움직인 것과 구별이 안 된다. 엇갈려야 관절이 보인다 — 원형 보스에서
#     이걸로 실움직임이 7% 에서 66% 로 올라갔다.


def _colspan(f):
    """열마다 (맨 위 y, 맨 아래 y). 칸 밖으로 밀지 않으려면 이게 필요하다."""
    sp = {}
    for (x, y) in f.p:
        a, b = sp.get(x, (y, y))
        sp[x] = (min(a, y), max(b, y))
    return sp


def _rowspan(f):
    sp = {}
    for (x, y) in f.p:
        a, b = sp.get(y, (x, x))
        sp[y] = (min(a, x), max(b, x))
    return sp


def limbs(f, dyl, dyr, frac=0.30, y0=None, y1=None):
    """바깥쪽 세로 띠(팔·날개·집게)를 좌우 **반대로** 올렸다 내린다.

    두 가지를 챙긴다.
      ① 그냥 옮기면 띠가 몸에 닿던 자리에 한 칸 구멍이 난다 — 작은 몹에서는
         팔이 끊어진 것으로 보인다. 옮기면서 **끝 칸을 늘여** 빈자리를 메운다.
      ② 칸 밖으로 나가면 저장할 때 잘려 나간다. 거미가 다리 18칸을 그렇게
         잃었다. 그래서 **열마다 여유를 재서** 그만큼만 민다."""
    bx0, by0, bx1, by1 = f.box()
    w = bx1 - bx0 + 1
    lc, rc = bx0 + w * frac, bx1 - w * frac
    y0 = by0 if y0 is None else y0
    y1 = by1 if y1 is None else y1
    span = _colspan(f)
    cols = {}
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        d = 0
        if y0 <= y <= y1:
            if x < lc:
                d = dyl
            elif x > rc:
                d = dyr
        if d:
            a, b = span[x]
            d = max(-a, min(f.h - 1 - b, d))
        if d:
            cols.setdefault((x, d), []).append((y, c))
        g.put(x, y + d, c)
    for (x, d), ys in cols.items():
        ys.sort()
        if d > 0:                      # 내려갔으니 위쪽이 빈다
            yy, c = ys[0]
            for k in range(d):
                g.put(x, yy + k, c)
        else:                          # 올라갔으니 아래쪽이 빈다
            yy, c = ys[-1]
            for k in range(-d):
                g.put(x, yy - k, c)
    return g


def wave(f, amp=1.5, k=0.7, phase=0.0, y0=None, y1=None):
    """줄마다 가로로 민다 — 옷자락 · 촉수 · 유령의 아랫단이 물결친다.
       아래로 갈수록 크게 민다(위는 몸에 붙어 있어야 하므로). 한 줄이 통째로
       움직이므로 구멍이 안 생긴다."""
    bx0, by0, bx1, by1 = f.box()
    y0 = by0 if y0 is None else y0
    y1 = by1 if y1 is None else y1
    span = _rowspan(f)
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        dx = 0
        if y0 <= y <= y1:
            t = (y - y0) / max(y1 - y0, 1)
            dx = int(round(math.sin(y * k + phase) * amp * t))
            a, b = span[y]                       # 줄마다 여유만큼만 민다
            dx = max(-a, min(f.w - 1 - b, dx))
        g.put(x + dx, y, c)
    return g


def tailwag(f, dy, frac=0.45, side=1):
    """한쪽 끝(꼬리)이 휜다. 끝으로 갈수록 크게 — 열마다 세로로 미는 전단이라
       기울임과 같은 원리로 구멍이 안 생긴다."""
    bx0, by0, bx1, by1 = f.box()
    w = bx1 - bx0 + 1
    reach = max(w * frac, 1)
    span = _colspan(f)
    g = Frame(f.w, f.h)
    for (x, y), c in f.p.items():
        t = (x - (bx1 - reach)) / reach if side > 0 else ((bx0 + reach) - x) / reach
        d = int(round(dy * min(max(t, 0.0), 1.0)))
        a, b = span[x]                           # 열마다 여유만큼만 민다
        g.put(x, y + max(-a, min(f.h - 1 - b, d)), c)
    return g


# ------------------------------------------------------------ 갈래별 변형
def squash(b, k=1.07):
    """부피를 지키며 눌렀다 폈다. **세로는 늘 누른다** — 늘이면 발끝을 축으로
       위로 자라서 머리가 칸 밖으로 잘린다(작은 펫에서 16%를 그렇게 잃었다).
       가로는 좌우 여유만큼만 늘리고, 여유가 없으면 같이 누른다."""
    x0, y0, x1, y1 = b.box()
    w, h = x1 - x0 + 1, y1 - y0 + 1
    # 작은 그림에서는 4% 를 눌러도 반올림하면 한 줄도 안 줄어든다 — 20x20 짜리
    # 펫 둘이 그래서 두 칸이 똑같이 나왔다. 적어도 한 줄은 줄도록 키운다.
    while h - round(h / k) < 1 and k < 1.5:
        k += 0.01
    grow = w * (k - 1) / 2
    # 가로로 늘릴 자리가 없으면 **그냥 둔다**. 같이 누르면 그림이 통째로
    # 작아져서 숨이 아니라 쪼그라든 것으로 보인다(별을 쫓아온 것이 13% 를
    # 그렇게 잃었다).
    kx = k if grow <= min(x0, b.w - 1 - x1) else 1.0
    return scale_x(scale_y(b, 1.0 / k), kx)


def _band(b, a, z):
    bx0, by0, bx1, by1 = b.box()
    h = by1 - by0 + 1
    return by0 + int(h * a), by0 + int(h * z)


def idle_biped(b):
    y0, y1 = _band(b, 0.26, 0.88)
    return limbs(scale_y(b, 0.96), 1, -1, frac=0.28, y0=y0, y1=y1)


def idle_quad(b):
    y0, y1 = _band(b, 0.50, 1.0)
    return limbs(scale_y(b, 0.94), 1, -1, frac=0.26, y0=y0, y1=y1)


def idle_hover(b):
    y0, y1 = _band(b, 0.42, 1.0)
    return wave(squash(b, 1.03), 1.8, 0.7, y0=y0, y1=y1)


def idle_orb(b):
    return glow(squash(b, 1.04), 1.24)


def idle_fish(b):
    return tailwag(b, 2, 0.5, side=-1)


def idle_blob(b):
    return squash(b, 1.04)


def idle_ice(b):
    """얼음에 갇힌 것 — 팔이 얼음 속이라 사람꼴 변형이 안 먹고(7.5%), 살짝
       누르는 것만으로도 모자랐다(5.1%). 얼음덩이째 크게 눌리고 푸른빛이
       함께 일렁인다."""
    return glow(squash(b, 1.10), 1.20, sat=14, minl=70)


def walk_biped(b):
    y0, y1 = _band(b, 0.60, 1.0)
    return limbs(legs(b, y0, -1, 0, 1, -1), -2, 2, frac=0.28,
                 y0=_band(b, 0.26, 0.88)[0], y1=_band(b, 0.26, 0.88)[1])


def walk_quad(b):
    y0, _ = _band(b, 0.52, 1.0)
    return legs(b, y0, -1, 0, 1, -1)


def walk_hover(b):
    y0, y1 = _band(b, 0.38, 1.0)
    return wave(squash(b, 1.05), 2.6, 0.8, phase=1.1, y0=y0, y1=y1)


def walk_orb(b):
    return glow(squash(b, 1.06), 1.38)


def walk_fish(b):
    return tailwag(b, 3, 0.55, side=-1)


def walk_blob(b):
    return squash(b, 1.06)


SHAPE = {
    'biped': (idle_biped, walk_biped), 'quad': (idle_quad, walk_quad),
    'hover': (idle_hover, walk_hover), 'orb': (idle_orb, walk_orb),
    'fish': (idle_fish, walk_fish), 'blob': (idle_blob, walk_blob),
    'ice': (idle_ice, idle_ice),
}

# 생김새는 눈으로 보고 붙였다(tools/animcheck.py 가 짚어 준 것만 여기 있다).
AUTO_CHARS = {
    # --- 사람꼴 ---
    'zombie': 'biped', 'skeleton': 'biped', 'archer': 'biped', 'crawler': 'biped',
    'ruin_guard': 'biped', 'canopy_ape': 'biped', 'weldarm': 'biped',
    'mold_walker': 'biped', 'draft_form': 'biped', 'lost_miner': 'biped',
    'vinelash': 'biped', 'sky_sentry': 'biped',
    'orbit_sentry': 'biped',
    'yunseul': 'biped', 'npcw_guard': 'biped', 'npcw_pedlar': 'biped',
    'npcw_oreman': 'biped', 'npcw_armsman': 'biped',
    # --- 네 발 · 낮은 것 ---
    'spider': 'quad', 'icewolf': 'quad', 'scrapcrawler': 'quad',
    'crimson_howler': 'quad', 'capbeast': 'quad', 'rabbit': 'quad',
    'arctic_hare': 'quad', 'sand_lizard': 'quad', 'jungle_frog': 'quad',
    'ash_vole': 'quad', 'scorpion': 'quad', 'crystalcrab': 'quad', 'drowned_hand': 'quad',
    'reef_crab': 'quad', 'glacier_stalker': 'quad',
    'pet_ember_squirrel': 'quad', 'pet_frost_kit': 'quad',
    # 바위꼴·두꺼비는 몸이 10칸밖에 안 돼 눌러도 한 줄이 겨우 줄었다(4.7%·2.3%).
    # 다리를 엇갈리게 옮기는 쪽이 작은 몸에서는 훨씬 크게 읽힌다.
    'pet_pebble_kin': 'quad', 'pet_cinder_toad': 'quad',
    # --- 떠 있는 것 ---
    # ★ 물결은 **헐렁한 것**에만 쓴다. 옷자락 · 촉수 · 유령. 단단한 것에 걸면
    #   몸이 출렁여서 그림이 뭉개진다 — 얼음에 갇힌 순례자는 얼음덩이 밑단이
    #   톱니처럼 일그러졌고, 쇠로 만든 파수병은 받침 고리가 휘었다. 그 넷은
    #   사람꼴·구슬로 옮겼다.
    'wraith': 'hover', 'archivist': 'hover', 'gloom_crawler': 'hover',
    'minerghost': 'hover', 'deep_octopus': 'hover', 'scribe_hand': 'hover',
    'pet_glass_moth': 'hover', 'pet_dust_sparrow': 'hover', 'pet_ash_owl': 'hover',
    'pet_ember_drake': 'hover', 'pet_storm_falcon': 'hover',
    # --- 구슬 · 눈 ---
    'shadoweye': 'orb', 'crimson_eye': 'orb', 'coreling': 'orb',
    'meridian_eye': 'orb', 'damp_wisp': 'orb', 'frostling': 'orb',
    'pet_thorn_wisp': 'orb', 'pet_star_sprite': 'orb', 'pet_void_hatchling': 'orb',
    # --- 헤엄치는 것 ---
    'grotto_eel': 'fish', 'jungle_koi': 'fish', 'reef_shark': 'fish',
    'abyss_angler': 'fish',
    # --- 덩어리 ---
    'bloomspitter': 'blob', 'sporeling': 'blob', 
    'ballast_form': 'blob', 'ventspitter': 'blob',
    # 얼음에 갇힌 순례자 — 팔이 얼음 속이라 사람꼴로는 7.5% 밖에 안 움직였다.
    # 얼음덩이째 눌렸다 펴지는 쪽이 이야기와도 맞는다.
    'frostbound': 'ice',
}

# 걷기 칸(2·3)까지 멈춰 있던 것들. 나머지는 가만히 칸만 손본다.
WALK_FIX = {'minerghost', 'scorpion', 'crystalcrab', 'archivist', 'sporeling',
            'coreling', 'rabbit', 'jungle_frog', 'drowned_hand', 'scribe_hand',
            'damp_wisp', 'reef_crab', 'reef_shark', 'yunseul'}

AUTO_BOSSES = {
    'frost_witch': 'hover', 'void_king': 'hover', 'storm_warden': 'biped',
    'first_keeper': 'biped', 'overseer': 'biped', 'ice_warden': 'biped',
    'sand_guardian': 'biped', 'mine_horror': 'blob', 'blight_maw': 'blob',
    'vine_lord': 'hover', 'spore_queen': 'hover', 'proliferator': 'biped',
    'drowned_keeper': 'biped', 'isle_keeper': 'biped',
    'hepha': 'biped', 'restorer': 'orb', 'shaft_maw': 'blob', 'pursuer': 'orb',
}


def run_auto():
    """가만히 칸(1)은 0 에서, 걷기 칸(3)은 2 에서 만든다. 보스는 마디마다
       홀수 칸을 짝수 칸에서 만든다. 늘 원본 칸에서 만들므로 몇 번을 돌려도
       결과가 같다(겹쳐 걸리지 않는다)."""
    n = 0
    for name, shape in sorted(AUTO_CHARS.items()):
        fs, spec, gap = load('characters', name)
        idle, walk = SHAPE[shape]
        fs[1] = idle(fs[0])
        if name in WALK_FIX and len(fs) > 3:
            fs[3] = walk(fs[2])
        save('characters', name, fs, spec, gap)
        n += 1
    for name, shape in sorted(AUTO_BOSSES.items()):
        fs, spec, gap = load('bosses', name)
        idle, _ = SHAPE[shape]
        for k in range(len(fs) // 2):
            fs[k * 2 + 1] = idle(fs[k * 2])
        save('bosses', name, fs, spec, gap)
        n += 1
    return n


if __name__ == '__main__':
    only = sys.argv[1:]
    if only == ['--auto']:
        print('생김새 갈래로 다시 구움:', run_auto(), '장')
        raise SystemExit(0)
    for kind, name, fn in JOBS:
        if only and name not in only:
            continue
        fs, spec, gap = load(kind, name)
        save(kind, name, fn(fs), spec, gap)
        print('구움:', name, spec['file'])
    if not only:
        print('생김새 갈래로 다시 구움:', run_auto(), '장')
