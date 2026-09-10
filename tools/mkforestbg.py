#!/usr/bin/env python3
"""잿빛 숲 원경에 **잎을 그려 넣는다** — 우거진 정도가 다른 세 장.

  bg/parallax_forest_lush.png   잎이 가장 우거진 것   (서장~1장)
  bg/parallax_forest_mid.png    성글어진 것           (3~4장)
  bg/parallax_forest_thin.png   가지 끝에만 남은 것   (5~7장)

  bg/parallax_forest.png (원본, 죽은 나무만 남은 것) 은 그대로 두고 8장에 쓴다.

■ 왜 색만으로는 부족했나

  앞서 원경은 **색만** 바꿨다 — 같은 죽은 나무 그림을 밝기만 남기고 초록으로
  눕힌 것이다. 그러니 1장에서도 8장에서도 서 있는 것은 똑같이 앙상한 장대였고,
  초록색 앙상한 장대는 살아 있는 숲으로 안 읽힌다. 색이 아니라 **모양**이
  바뀌어야 한다.

■ 원본 위에 덧그리는 이유

  능선과 줄기를 새로 그리지 않는다. 원본에서 나무를 **찾아내** 그 꼭대기에
  잎을 얹는다. 그래야 네 장의 능선과 줄기가 픽셀 단위로 같아서, 장이 넘어갈 때
  겹쳐 섞어도 지형이 흔들리지 않고 잎만 빠진다.

  나무 찾는 법: 열마다 맨 위 불투명 픽셀 top[x] 을 구한 뒤, 넓은 창(±26px)의
  **중앙값**을 언덕선으로 삼는다. 중앙값은 좁게 솟은 것(나무)에 흔들리지 않고
  넓은 것(언덕)만 따라간다. 언덕선보다 8px 이상 솟은 열이 나무다.

  처음에 최댓값을 썼다가 틀렸다 — 최댓값은 그 창에서 하늘이 가장 깊은 곳을
  집으므로 언덕 **봉우리 전체**가 "솟은 것"으로 걸려서, 폭 80px 짜리 갓이
  능선 위에 얹혔다. 나무는 폭 4~12px 이라 중앙값이 맞다.

■ 색

  잎은 그 나무 **자기 색**에서 뜬다. 원경은 앞뒤 두 겹으로 같은 그림을 두 번
  그리므로(drawParallaxArt), 나무마다 제 깊이의 회색을 갖고 있다. 거기서
  벗어난 색을 쓰면 그 나무만 다른 층에 뜬 것처럼 보인다.
  초록은 여기서 칠하지 않는다 — 장에 따라 G.forestBg() 가 밝기를 숲색으로
  눕힌다. 여기서는 **밝기의 짜임**만 만든다.

사용법:  python3 tools/mkforestbg.py
"""
import math, os, random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = os.path.join(ROOT, 'game', 'assets', 'bg')
SRC = os.path.join(BG, 'parallax_forest.png')


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3])


def find_trees(px, W, H):
    """원본에서 줄기를 찾아 (가운데 x, 꼭대기 y, 폭, 색) 로 돌려준다.

    **좁고 긴 세로 획**을 찾는다. 하늘선을 기준으로 삼으면 가까운 층의 나무를
    통째로 놓친다 — 그 나무들은 뒤의 언덕을 배경으로 서 있어서 하늘선을 안
    건드리기 때문이다(처음에 그렇게 했다가 먼 나무에만 잎이 달렸다).

    판정: 그 칸이 불투명하고, 15px 아래도 같은 색이며(길다), 좌우 11px 은
    다른 색이다(좁다). 이 셋을 만족하는 가장 위 칸이 그 줄기의 꼭대기다."""
    def rgb(x, y):
        p = px[x, y]
        return p[:3] if p[3] == 255 else None

    GAP, LONG = 11, 10
    tops = {}
    for x in range(GAP, W - GAP):
        for y in range(0, H - LONG):
            c = rgb(x, y)
            if c is None:
                continue
            if rgb(x, y + LONG) != c:            # 길지 않다 — 잔가지나 언덕
                continue
            if rgb(x - GAP, y) == c or rgb(x + GAP, y) == c:
                continue                          # 넓다 — 언덕이다
            tops[x] = (y, c)
            break

    runs = []
    for x in sorted(tops):
        if runs and x - runs[-1][-1] <= 4:
            runs[-1].append(x)
        else:
            runs.append([x])
    trees = []
    for r in runs:
        if len(r) > 26:                           # 이만큼 넓으면 나무가 아니다
            continue
        ty = min(tops[x][0] for x in r)
        cx = sum(r) // len(r)
        # 색은 줄기에서 가장 흔한 것으로. 한 점만 찍으면 반투명 가장자리
        # (RGB 에 아무 값이나 들어 있다)를 집어 갓이 흰색으로 튄다
        seen = {}
        for x in r:
            c = tops[x][1]
            seen[c] = seen.get(c, 0) + 1
        col = max(seen, key=seen.get)
        trees.append((cx, ty, len(r), col))
    return trees


def canopy(im, px, cx, ty, wide, col, rng, scale, clumps, ragged):
    """나무 하나의 갓. 매끈한 타원 하나가 아니라 **작은 덩이 여럿**을 겹쳐
       가장자리를 헤지게 만든다 — 매끈하면 나무가 아니라 구름으로 보인다."""
    W, H = im.size
    rx = (20 + wide * 1.15) * scale
    ry = rx * 0.70
    cy = ty - ry * 0.30            # 갓의 가운데는 꼭대기보다 조금 위

    # 값 네 단계. 두 단계로만 그렸더니 통짜 덩어리가 되어 나무가 아니라
    # 먹구름으로 보였다 — 잎은 안이 비어 보일 만큼 명암이 갈려야 한다.
    dark = shade(col, 0.72)        # 갓 안쪽 그늘
    mid = shade(col, 0.95)
    leaf = shade(col, 1.20)        # 빛 받는 면
    lite = shade(col, 1.52)        # 꼭대기 한 겹

    def blob(bx, by, r, c):
        rr = int(r) + 1
        for dy in range(-rr, rr + 1):
            for dx in range(-rr, rr + 1):
                if dx * dx + dy * dy > r * r:
                    continue
                x, y = int(bx + dx), int(by + dy)
                if 0 <= x < W and 0 <= y < H:
                    px[x, y] = (c[0], c[1], c[2], 255)

    # 작은 덩이를 아주 많이. 큰 덩이 몇 개로 채우면 가장자리가 매끈해져
    # 구름이 된다 — 잎은 낱개가 보여야 한다.
    n = max(8, int(clumps * (1.4 + rx / 9)))
    for i in range(n):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0, 1) ** 0.45        # 가운데가 빽빽하고 밖이 성글다
        bx = cx + math.cos(a) * d * rx
        by = cy + math.sin(a) * d * ry
        # 바깥으로 갈수록 잘게 — 가장자리가 헤진다
        r = (0.055 + 0.11 * (1 - d)) * rx * (1 - ragged * rng.uniform(0, 0.6))
        rel = (by - cy) / max(ry, 1)
        c = (dark if rel > 0.25 else mid if rel > -0.05
             else lite if rel < -0.55 else leaf)
        blob(bx, by, max(1.2, r), c)

    # 갓이 줄기 위쪽을 덮는다 — 살아 있는 나무는 윗동이 안 보인다
    if scale > 0.7:
        for k in range(int(ry * 0.7)):
            r = rx * 0.30 * (1 - k / max(ry * 0.7, 1))
            blob(cx + rng.uniform(-1.5, 1.5), cy + ry * 0.5 + k, max(1.5, r), dark)


def skyline(px, W, H):
    """열마다 (맨 위 불투명 픽셀 y, 그 아래 3px 의 색). **원본에서 한 번만** 잰다.

    ridge() 안에서 그때그때 재면 안 된다 — 같은 버퍼를 읽으면서 쓰기 때문에,
    한 열에 잎을 얹으면 다음 열이 그 잎을 능선으로 읽고 또 그 위에 얹는다.
    색까지 매번 밝게(×1.42) 뜨므로 밝기가 겹겹이 곱해져, 캔버스 위로 기어오르는
    **새하얀 계단**이 여러 줄 생겼다. 처음 구웠을 때 실제로 그랬다."""
    out = []
    for x in range(W):
        ty, col = None, None
        for y in range(H):
            if px[x, y][3] == 255:
                ty = y
                c = px[x, min(H - 1, y + 3)]
                col = c[:3] if c[3] == 255 else px[x, y][:3]
                break
        out.append((ty, col))
    return out


def ridge(im, px, sky, rng, dens, size):
    """능선을 따라 깔리는 잎 띠.

    나무마다 갓을 하나씩 얹는 것만으로는 숲이 안 된다 — 막대에 사탕을 꽂아 둔
    것처럼 낱낱이 떨어져 보인다. 진짜 원경 숲은 **능선 자체가 잎으로 덮여**
    윤곽이 뭉개져 있고, 그 위로 큰 나무 몇 그루만 삐죽 솟는다.

    그래서 열마다 맨 위 불투명 픽셀을 찾아 그 자리에 그 언덕 **자기 색**으로
    잎덩이를 흩뿌린다. 언덕이 여럿이면 각자 제 색으로 덮이므로 앞뒤 깊이가
    그대로 유지된다."""
    W, H = im.size
    for x in range(0, W, 2):
        ty, col = sky[x]
        # 괄호가 필요하다. not rng.random() < dens 는 (not rng.random()) < dens 로
        # 묶여 늘 참이 되고, 그러면 이 띠가 한 점도 안 그려진다
        if ty is None or ty < 2 or rng.random() >= dens:
            continue
        leaf, lite = shade(col, 1.16), shade(col, 1.42)
        for _ in range(2):
            r = rng.uniform(2.5, 5.5) * size
            bx = x + rng.uniform(-3, 3)
            by = ty - rng.uniform(-1, 4) * size
            c = lite if rng.random() < 0.3 else leaf
            rr = int(r) + 1
            for dy in range(-rr, rr + 1):
                for dx in range(-rr, rr + 1):
                    if dx * dx + dy * dy > r * r:
                        continue
                    ix, iy = int(bx + dx), int(by + dy)
                    if 0 <= ix < W and 0 <= iy < H:
                        px[ix, iy] = (c[0], c[1], c[2], 255)


STAGES = [
    # 이름,        갓 크기, 덩이 수, 헤짐, 남은 나무, 능선 띠 밀도, 띠 크기
    ('lush', 1.00, 34, 0.15, 1.00, 0.92, 1.00),
    ('mid', 0.72, 18, 0.40, 0.88, 0.48, 0.72),
    ('thin', 0.44, 9, 0.65, 0.55, 0.14, 0.50),
]


def main():
    src = Image.open(SRC).convert('RGBA')
    W, H = src.size
    trees = find_trees(src.load(), W, H)
    sky = skyline(src.load(), W, H)          # 원본에서 한 번만 — ridge() 설명 참고
    print('원본에서 찾은 나무 %d그루' % len(trees))
    for name, scale, clumps, ragged, keep, rdens, rsize in STAGES:
        im = src.copy()
        px = im.load()
        # 능선 띠를 먼저 깔고 그 위에 갓을 얹는다 — 큰 나무가 띠 위로 솟아야 한다.
        # 씨앗을 고정해 세 장의 잎이 같은 자리에서 빠지게 한다(옮겨 다니면 안 된다)
        ridge(im, px, sky, random.Random(20260910), rdens, rsize)
        for i, (cx, ty, wide, col) in enumerate(trees):
            # 어느 나무가 먼저 잎을 잃는지는 나무마다 정해져 있다 —
            # 단계마다 다른 나무가 벗겨지면 잎이 옮겨 다니는 것처럼 보인다
            if (i * 7919 % 1000) / 1000.0 >= keep:
                continue
            canopy(im, px, cx, ty, wide, col, random.Random(1000 + i), scale, clumps, ragged)
        p = os.path.join(BG, 'parallax_forest_%s.png' % name)
        im.save(p)
        print('  %-28s %dx%d  %dB'
              % (os.path.basename(p), im.size[0], im.size[1], os.path.getsize(p)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
