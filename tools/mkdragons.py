#!/usr/bin/env python3
"""드래곤 펫 그림 — 속성 넷(불·흙·전기·암흑) × 진화 단계 넷(새끼·어린 용·성룡·고룡)을 굽는다.

  python3 tools/mkdragons.py            # game/assets/char/pet_dragon_<속성>_s<단계>.png + 매니페스트 characters.sheets
  python3 tools/sync-manifest.py        # 그다음 매니페스트 옮겨 적기

■ 그리는 법
  SS 배 크기 캔버스에 매끈한 도형(몸 타원 · 목 · 머리 · 주둥이 · 꼬리 · 날개 막 · 뿔 · 등가시)을 부위별 평면색으로 칠하고,
  칸 가운데 한 점만 떠서 도트 그림으로 줄인 뒤(색이 섞이지 않는다) 1칸 윤곽을 두른다. 윗면 한 줄은 밝게 — 기존 펫 그림과 같은 화풍.
■ 장 — 날갯짓 FLAP 장 + 공격 1장(입을 벌리고 숨결). 날개 끝 각도는 WING_A 를 따른다(내려치기는 빠르게 두 장, 올리기는 천천히
  세 장), 내려칠 때 몸이 1칸 뜬다(BOB) — 날개가 몸을 들어 올리는 것처럼. 먼 쪽 날개는 어둡게 몸 뒤에, 가까운 날개는 몸 앞에.
■ ★ 잘림 — 칸 크기를 손으로 정하지 않는다. 그 단계의 모든 장·모든 속성을 한 번 그려 그림 범위를 재고, 사방 MARGIN 칸을
  더해 칸을 정한다. 굽고 나서 check() 가 칸 테두리 한 줄에 칠한 칸이 없음을 확인한다(있으면 멈춘다).
"""
import json, math, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', 'game', 'assets')
CHAR = os.path.join(ROOT, 'char')
SS = 8          # 매끈한 도형을 그리는 배율
S = 4           # 파일 배율(기존 펫 시트와 같다)
MARGIN = 2
FLAP = 6
WING_A = [75, 38, 2, -48, -22, 30]       # 날개 각도(도) — 위가 +, 0 이면 날을 본다
BOB = [0, 0, -1, -1, 0, 0]               # 몸 높이(칸) — 내려칠 때 뜬다

ELEM = {
    'fire':  dict(body='#c8442e', dark='#8a2a1c', belly='#f2b454', wing='#e8843c', wfar='#a8502c', horn='#f2e2b4',
                  eye='#ffe46a', line='#1e0c08', acc='#ffd24a', breath=['#ffe46a', '#ff9a3a', '#e8502c']),
    'earth': dict(body='#7e6c3c', dark='#54462a', belly='#cdb47c', wing='#a2905c', wfar='#6e6038', horn='#e0d8c0',
                  eye='#f0cc48', line='#1a140a', acc='#8a9a6a', breath=['#d8c49a', '#a8946a', '#7e6c3c']),
    'storm': dict(body='#3c7cbc', dark='#23507e', belly='#bce2f4', wing='#6cb4e4', wfar='#3a6a98', horn='#f4f4ff',
                  eye='#ffffff', line='#0c1a2c', acc='#ffe864', breath=['#ffffff', '#ffe864', '#8ad0ff']),
    'dark':  dict(body='#40305a', dark='#261a38', belly='#7e5ea6', wing='#5e3e86', wfar='#3a2654', horn='#cdbde6',
                  eye='#ff5aa0', line='#0a0612', acc='#b07aff', breath=['#e0b0ff', '#a06fff', '#5a2e9a']),
}
# 단계 — 크기 배율 · 머리 비율 · 날개 길이 · 꼬리 · 뿔 · 등가시 수
STAGE = [
    dict(k=1.00, head=1.30, wing=0.70, tail=0.80, horn=0.3, spikes=0),
    dict(k=1.15, head=1.10, wing=0.85, tail=1.00, horn=0.8, spikes=3),
    dict(k=1.35, head=1.00, wing=1.05, tail=1.10, horn=1.2, spikes=5),
    dict(k=1.60, head=0.95, wing=1.20, tail=1.20, horn=1.7, spikes=7),
]


def hexc(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def lighten(c, f):
    return tuple(min(255, round(v + (255 - v) * f)) for v in c[:3]) + (255,)


def draw_dragon(el, st, frame, W, H, ox, oy):
    """ox, oy — 몸 가운데(칸). 돌려주는 것은 W×H 칸 그림(RGBA 칸 목록)."""
    P = {k: (hexc(v) if isinstance(v, str) else v) for k, v in ELEM[el].items()}
    sp = STAGE[st]; k = sp['k']
    attack = frame >= FLAP
    a = math.radians(WING_A[frame % FLAP] if not attack else 25)
    bob = 0 if attack else BOB[frame]
    im = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    X = lambda x: x * SS
    cx, cy = ox, oy + bob
    brx, bry = 5.2 * k, 3.3 * k
    hs = 2.4 * k * sp['head'] ** 0.5 * (1.18 if st == 0 else 1)

    def ell(x, y, rx, ry, col):
        d.ellipse([X(x - rx), X(y - ry), X(x + rx), X(y + ry)], fill=col)

    def poly(pts, col):
        d.polygon([(X(x), X(y)) for x, y in pts], fill=col)

    def line(pts, col, w):
        d.line([(X(x), X(y)) for x, y in pts], fill=col, width=max(1, round(w * SS)), joint='curve')

    sx, sy = cx + 0.9 * k, cy - bry * 0.7            # 어깨(날개 뿌리)
    # ★ 옆에서 본 날갯짓 = 날개가 몸통 축을 돈다 — 앞뒤(u)는 그대로, 위아래(v)만 sin(각)으로 줄고 는다.
    #   수평일 때는 날을 보는 얇은 선, 내리면 막이 배 아래로 드리운다. 막은 손가락뼈 사이가 물결로 파인 박쥐 날개.
    WU, WV = 3.6 * k * sp['wing'], 11.0 * k * sp['wing']
    sa = math.sin(a) if not attack else 0.45
    TPL = [(0, 0), (1.3, .55), (2.2, 1.0), (1.55, .78), (2.05, .62), (1.25, .5), (1.6, .3), (.85, .26), (.9, .06), (-.1, -.02)]
    BONES = [[0, 1, 2], [1, 4], [1, 6]]

    def wing(col, bone, scale, dx):
        pts = [(sx + dx - u * WU * scale, sy - v * WV * scale * sa) for u, v in TPL]
        poly(pts, col)
        for b in BONES[:1 + (2 if st >= 1 else 0)]:
            line([pts[i] for i in b], bone, 0.55 + 0.12 * k)
    # 먼 쪽 날개 — 몸 뒤, 어둡게, 조금 작게
    wing(P['wfar'], P['dark'], 0.82, -1.2 * k)
    # 꼬리 — 뒤로 뻗어 내려갔다가 끝이 들린다
    tl = 9.0 * k * sp['tail']
    t0 = (cx - brx * 0.8, cy + bry * 0.1)
    t1 = (t0[0] - tl * 0.45, t0[1] + 2.2 * k)
    ph = 2 * math.pi * (frame % FLAP) / FLAP          # 꼬리는 날갯짓을 따라 부드럽게 물결친다(장마다 번갈지 않게)
    t2 = (t0[0] - tl * 0.8, t0[1] + 1.2 * k + 0.5 * k * math.sin(ph))
    t3 = (t0[0] - tl, t0[1] - 0.6 * k + 0.8 * k * math.sin(ph - 0.8))
    line([t0, t1], P['body'], 2.6 * k)
    line([t1, t2], P['body'], 1.8 * k)
    line([t2, t3], P['body'], 1.1 * k)
    if st >= 1:                                       # 꼬리 끝 — 화살촉 · 불은 불꽃
        tipc = P['acc'] if el in ('fire', 'storm') else P['dark']
        poly([(t3[0] + 0.6 * k, t3[1] - 1.1 * k), (t3[0] - 1.6 * k, t3[1] - 0.2 * k), (t3[0] + 0.6 * k, t3[1] + 1.0 * k)], tipc)
    # 다리 — 날며 접은 모양
    for lx in (cx - brx * 0.35, cx + brx * 0.35):
        line([(lx, cy + bry * 0.6), (lx - 0.5 * k, cy + bry + 1.1 * k), (lx + 0.6 * k, cy + bry + 1.3 * k)], P['dark'], 1.1 * k)
    # 몸 · 배
    ell(cx, cy, brx, bry, P['body'])
    ell(cx + 0.4 * k, cy + bry * 0.45, brx * 0.78, bry * 0.5, P['belly'])
    # 등가시
    for i in range(sp['spikes']):
        u = (i + 0.5) / max(1, sp['spikes'])
        bx = cx - brx * 0.85 + u * brx * 1.5
        by = cy - bry * math.sqrt(max(0, 1 - ((bx - cx) / brx) ** 2)) + 0.4
        h = (1.0 + 0.5 * (1 - abs(u - 0.5) * 2)) * k * 0.8
        poly([(bx - 0.7 * k, by + 0.2), (bx, by - h), (bx + 0.7 * k, by + 0.2)], P['acc'] if el == 'earth' else P['dark'])
    # 목 · 머리
    hx, hy = cx + brx * 0.95 + hs * 0.55, cy - bry * 0.9 - hs * 0.35
    poly([(cx + brx * 0.3, cy - bry * 0.8), (hx - hs * 0.2, hy - hs * 0.5), (hx + hs * 0.1, hy + hs * 0.55), (cx + brx * 0.75, cy + bry * 0.1)], P['body'])
    poly([(cx + brx * 0.55, cy - bry * 0.1), (hx - hs * 0.1, hy + hs * 0.2), (hx + hs * 0.2, hy + hs * 0.6), (cx + brx * 0.8, cy + bry * 0.25)], P['belly'])
    ell(hx, hy, hs, hs * 0.82, P['body'])
    jaw = 1.1 * hs if attack else 0.45 * hs
    poly([(hx + hs * 0.3, hy - hs * 0.55), (hx + hs * 1.75, hy - hs * 0.05), (hx + hs * 1.7, hy + hs * 0.25), (hx + hs * 0.4, hy + hs * 0.3)], P['body'])
    poly([(hx + hs * 0.2, hy + hs * 0.3), (hx + hs * 1.45, hy + hs * 0.2 + jaw * 0.35), (hx + hs * 1.35, hy + hs * 0.35 + jaw * 0.5), (hx, hy + hs * 0.7)], P['belly'])
    # 뿔 — 뒤로 휘어 오른다
    hl = sp['horn'] * 2.2 * k
    line([(hx - hs * 0.2, hy - hs * 0.55), (hx - hs * 0.2 - hl * 0.7, hy - hs * 0.6 - hl * 0.55), (hx - hs * 0.2 - hl, hy - hs * 0.45 - hl * 0.6)], P['horn'], 0.9 + 0.25 * k)
    if st >= 3:                                       # 고룡 — 뿔 한 쌍 더 · 턱 갈기
        line([(hx + hs * 0.2, hy - hs * 0.7), (hx - hl * 0.1, hy - hs * 0.8 - hl * 0.6)], P['horn'], 0.9)
        poly([(hx - hs * 0.3, hy + hs * 0.5), (hx - hs * 1.1, hy + hs * 1.1), (hx + hs * 0.2, hy + hs * 0.8)], P['acc'] if el != 'fire' else P['dark'])
    # 가까운 날개 — 몸 앞, 따로 한 겹(몸과 맞닿는 가장자리에 선을 긋는다)
    base_im, base_d = im, d
    im = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    wing(P['wing'], P['dark'], 1.0, 0)
    near_im = im
    im, d = base_im, base_d
    # 숨결(공격 장)
    if attack:
        mx, my = hx + hs * 1.8, hy + hs * 0.25
        for i, c in enumerate(P['breath']):
            r = (1.5 - i * 0.35) * k
            ell(mx + (2 - i) * 1.3 * k, my, r * 1.4, r, c)
    # 칸 가운데 한 점씩 뜬다 — 색이 섞이지 않는다
    def sample(img):
        px = img.load()
        g = [[px[x * SS + SS // 2, y * SS + SS // 2] for x in range(W)] for y in range(H)]
        for y in range(H):
            for x in range(W):
                if g[y][x][3] < 128: g[y][x] = (0, 0, 0, 0)
        return g
    g, nw = sample(im), sample(near_im)
    wl = P['dark']
    for y in range(H):
        for x in range(W):
            if not nw[y][x][3]: continue
            # 날개 가장자리가 몸 위에 걸치면 어두운 선 — 겹쳐도 날개로 읽힌다(새끼는 날개가 작아 뺀다)
            edge = any(not (0 <= y + dy < H and 0 <= x + dx < W and nw[y + dy][x + dx][3]) and
                       0 <= y + dy < H and 0 <= x + dx < W and g[y + dy][x + dx][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            g[y][x] = wl if (edge and st >= 1 and nw[y][x][:3] != P['dark'][:3]) else nw[y][x]
    # 윗면 밝게(몸·머리) — 기존 펫처럼 한 줄
    body = P['body']
    for y in range(1, H):
        for x in range(W):
            if g[y][x][:3] == body[:3] and g[y - 1][x][3] == 0:
                g[y][x] = lighten(body, 0.28)
    # 눈
    ex, ey = round(hx + hs * 0.35), round(hy - hs * 0.15)
    if 0 <= ex < W and 0 <= ey < H and g[ey][ex][3]:
        g[ey][ex] = P['eye'] if el in ('dark', 'storm') else P['line']
    # 윤곽
    out = [row[:] for row in g]
    for y in range(H):
        for x in range(W):
            if g[y][x][3]: continue
            if any(0 <= y + dy < H and 0 <= x + dx < W and g[y + dy][x + dx][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = P['line']
    return out


def bbox(g):
    ys = [y for y, r in enumerate(g) for p in r if p[3]]
    xs = [x for r in g for x, p in enumerate(r) if p[3]]
    return min(xs), min(ys), max(xs), max(ys)


def layout(st):
    """이 단계 칸 크기와 몸 가운데 — 큰 캔버스에 전부 그려 범위를 잰다."""
    W0, H0, ox0, oy0 = 90, 70, 45, 35
    x0 = y0 = 10 ** 9; x1 = y1 = -1
    for el in ELEM:
        for f in range(FLAP + 1):
            a, b, c, e = bbox(draw_dragon(el, st, f, W0, H0, ox0, oy0))
            x0, y0, x1, y1 = min(x0, a), min(y0, b), max(x1, c), max(y1, e)
    W, H = x1 - x0 + 1 + 2 * MARGIN, y1 - y0 + 1 + 2 * MARGIN
    return W, H, ox0 - x0 + MARGIN, oy0 - y0 + MARGIN


def check(g, name):
    W, H = len(g[0]), len(g)
    edge = [(x, y) for y in range(H) for x in range(W) if (x in (0, W - 1) or y in (0, H - 1)) and g[y][x][3]]
    assert not edge, '잘림: %s %s' % (name, edge[:5])


def save(frames, path):
    W, H = len(frames[0][0]), len(frames[0])
    im = Image.new('RGBA', (W * S * len(frames), H * S), (0, 0, 0, 0))
    px = im.load()
    for f, g in enumerate(frames):
        for y in range(H):
            for x in range(W):
                if g[y][x][3]:
                    for i in range(S):
                        for j in range(S):
                            px[(f * W + x) * S + i, y * S + j] = g[y][x]
    im.save(path)


def main():
    man_p = os.path.join(ROOT, 'manifest.json')
    man = json.load(open(man_p, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for st in range(len(STAGE)):
        W, H, ox, oy = layout(st)
        for el in ELEM:
            key = 'pet_dragon_%s_s%d' % (el, st)
            frames = [draw_dragon(el, st, f, W, H, ox, oy) for f in range(FLAP + 1)]
            for f, g in enumerate(frames): check(g, '%s#%d' % (key, f))
            save(frames, os.path.join(CHAR, key + '.png'))
            sheets[key] = {'file': 'char/%s.png' % key, 'frameW': W, 'frameH': H, 'count': FLAP + 1, 'flap': FLAP}
        print('stage', st, W, H)
    json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(man_p, 'a', encoding='utf-8').write('\n')


if __name__ == '__main__':
    main()
