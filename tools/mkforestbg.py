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


def lift(c, n):
    """밝기를 n 만큼 **더한다**(곱하지 않는다).

    원본 원경은 거의 검다 — 가까운 언덕이 (18,20,25) 다. 여기에 곱하기로 밝기를
    주면(×1.2 → (21,24,30)) 언덕과 구분이 안 가는 실루엣이 나오고, 잎을 아무리
    많이 얹어도 화면에서는 시커먼 덩어리 하나로 보인다. 실제로 그렇게 나왔다.
    더하기라야 어두운 바탕에서도 잎이 확실히 떠오른다."""
    return tuple(max(0, min(255, v + n)) for v in c[:3])


def trunk_colors(px, W, H):
    """줄기 색을 골라낸다 — **가로 런 길이**로 가른다.

    원경은 층마다 제 회색을 쓴다. 언덕은 가로로 길게 칠해져 있고(런 중앙값
    24~40px) 줄기는 좁다(4~16px). 이 하나로 둘이 깨끗이 갈린다."""
    from collections import defaultdict
    runs, cnt = defaultdict(list), defaultdict(int)
    for y in range(H):
        x = 0
        while x < W:
            p = px[x, y]
            if p[3] != 255:
                x += 1
                continue
            c, x0 = p[:3], x
            while x < W and px[x, y][3] == 255 and px[x, y][:3] == c:
                x += 1
            runs[c].append(x - x0)
            cnt[c] += x - x0
    out = []
    for c, n in cnt.items():
        if n < 1500:
            continue
        r = sorted(runs[c])
        if r[len(r) // 2] <= 18:
            out.append(c)
    return set(out)


def vrun_max(px, W, H, c):
    """그 색이 세로로 가장 길게 이어지는 길이. 층을 가르는 두 번째 잣대다.

    가로 런으로 언덕을 걸러도 언덕의 **그라데이션 띠** 색들이 남는다(가로로도
    짧게 끊겨 칠해져 있다). 그것들은 세로로 4~12px 밖에 안 가고, 굵은 줄기는
    52~116px 를 간다 — 사이가 텅 비어 있어 20 이면 깨끗이 갈린다."""
    best = 0
    for x in range(W):
        y = 0
        while y < H:
            if px[x, y][3] == 255 and px[x, y][:3] == c:
                n = 0
                while y + n < H and px[x, y + n][3] == 255 and px[x, y + n][:3] == c:
                    n += 1
                if n > best:
                    best = n
                y += n
            else:
                y += 1
    return best


def find_trees(px, W, H):
    """줄기를 찾아 (가운데 x, 꼭대기 y, 폭, 색) 로 돌려준다.

    판정은 하나뿐이다 — **그 색이 그 열에서 처음 나타나는 칸.**
    줄기 색은 제 층만 쓰므로, 뒤에 무엇이 그려져 있든 헷갈릴 수 없다.
    그래서 색마다 따로 훑는다. 한 열에서 '줄기 색 아무거나 첫 칸' 을 집으면
    안 된다 — 앞 층 줄기 위로 뒤 층 잔가지가 걸친 자리에서 뒤 것을 집어,
    앞 층 큰 나무 전체가 통째로 빠진다(아래 5번).

    ─ 여기까지 오는 데 다섯 번 틀렸다. 남겨 둔다, 같은 데 또 빠지지 않게:
      1. 넓은 창의 **최댓값**을 언덕선으로 삼음 → 언덕 봉우리 전체가 '솟은 것'
         으로 걸려 폭 80px 짜리 갓이 능선에 얹혔다.
      2. **중앙값**으로 고침 → 하늘선을 안 건드리는 가까운 층 나무를 통째로
         놓쳤다(그 나무들은 뒤 언덕을 배경으로 서 있다).
      3. **좁고 긴 세로 획** 판정 → 언덕 가장자리를 줄기로 오인해서 ty 가 거의
         전부 244 로 같았고, 갓이 줄기 중턱에 얹혀 맨 줄기가 위로 솟았다.
      4. 그 열의 **알파 60 이상 첫 칸** → 가까운 줄기 앞을 먼 언덕이 가리는
         자리에서 먼 언덕의 꼭대기를 집어, 갓이 줄기에서 떨어져 공중에 떴다.
      5. 열마다 **줄기 색 아무거나 첫 칸** → 색은 맞게 봤지만 열마다 한 번만
         봐서, 앞 층 어두운 줄기(14,16,20)가 한 그루도 안 잡혔다. 화면 아래
         절반이 통째로 맨 장대였다.
      1~4 는 '평평하게 합쳐진 그림에서 어느 것이 어느 층인지'를 짐작하려 한
      탓이고, 5 는 색으로 물어 놓고 층마다 묻지 않은 탓이다."""
    cols = trunk_colors(px, W, H)
    trees = []

    def group(hits, col):
        """꼭대기가 붙어 가는 열끼리 한 그루로 묶는다. x 가 붙어 있다는 것만
           보면 1900열이 한 덩어리가 되어 폭 제한에 다 걸린다(0그루가 나왔다)."""
        runs = []
        for x in sorted(hits):
            if runs and x - runs[-1][-1] <= 4 and abs(hits[x][0] - hits[runs[-1][-1]][0]) <= 8:
                runs[-1].append(x)
            else:
                runs.append([x])
        for r in runs:
            if len(r) > 26:                      # 이만큼 넓으면 나무가 아니다
                continue
            ty = min(hits[x][0] for x in r)
            c = col or max(set(hits[x][1] for x in r),
                           key=lambda k: sum(1 for x in r if hits[x][1] == k))
            trees.append((sum(r) // len(r), ty, len(r), c))

    # ── 앞 층: 한 색이 세로로 길게 이어지는 굵은 줄기.
    # 색마다 따로 훑는다. '줄기 색 아무거나 첫 칸' 으로 한 열을 한 번만 보면,
    # 앞 줄기 위로 뒤 언덕의 그라데이션 색이 걸친 자리에서 뒤 것을 집어
    # 가장 어두운 앞 층(14,16,20)이 한 그루도 안 잡힌다.
    for c in cols:
        if vrun_max(px, W, H, c) < 20:
            continue
        hits = {}
        for x in range(W):
            for y in range(H):
                p = px[x, y]
                if p[3] != 255 or p[:3] != c:
                    continue
                n = 0
                while y + n < H and px[x, y + n][3] == 255 and px[x, y + n][:3] == c:
                    n += 1
                if n >= 16:                      # 언덕에 박힌 점 하나를 거른다
                    hits[x] = (y, c)
                break
        group(hits, c)

    # ── 먼 층: 줄기가 세로 그라데이션으로 칠해져 있어 한 색이 4~8px 밖에
    # 안 이어진다. 여기서는 층을 색 하나로 못 가르므로, 열마다 줄기 색이
    # 처음 나오는 칸을 쓴다(먼 층 앞에는 가릴 것이 없어 이걸로 맞는다).
    hits = {}
    for x in range(W):
        for y in range(H):
            p = px[x, y]
            if p[3] == 255 and p[:3] in cols:
                hits[x] = (y, p[:3])
                break
    group(hits, None)

    # 그라데이션으로 그려진 먼 줄기는 색이 여러 개라 여러 그루로 잡힌다.
    # 가까이 붙고 **높이도 비슷한** 것만 묶는다 — 높이를 안 보면 앞 줄기가
    # 그 뒤 먼 줄기에 흡수되어 갓이 저 위 먼 층에 얹힌다.
    trees.sort()
    merged = []
    for t in trees:
        if merged and t[0] - merged[-1][0] <= 10 and abs(t[1] - merged[-1][1]) <= 12:
            a = merged[-1]
            merged[-1] = (a[0], min(a[1], t[1]), max(a[2], t[2]), a[3] if a[1] <= t[1] else t[3])
        else:
            merged.append(t)
    return merged


def canopy(im, px, cx, ty, wide, col, rng, scale, clumps, ragged):
    """나무 하나의 갓. 매끈한 타원 하나가 아니라 **작은 덩이 여럿**을 겹쳐
       가장자리를 헤지게 만든다 — 매끈하면 나무가 아니라 구름으로 보인다."""
    W, H = im.size
    rx = (20 + wide * 1.15) * scale
    ry = rx * 0.70
    cy = ty - ry * 0.30            # 갓의 가운데는 꼭대기보다 조금 위

    # 값 네 단계. 두 단계로만 그렸더니 통짜 덩어리가 되어 나무가 아니라
    # 먹구름으로 보였다 — 잎은 안이 비어 보일 만큼 명암이 갈려야 한다.
    # 모두 줄기보다 **밝다**. 갓이 줄기·언덕과 같은 값이면 실루엣이라 잎으로
    # 안 읽히고, 화면에서는 하늘을 가린 시커먼 벽이 된다.
    dark = lift(col, 9)            # 갓 안쪽 그늘 — 그래도 언덕보다는 밝다
    mid = lift(col, 18)
    leaf = lift(col, 28)           # 빛 받는 면
    lite = lift(col, 41)           # 꼭대기 한 겹

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
        leaf, lite = lift(col, 22), lift(col, 35)
        for _ in range(1):
            r = rng.uniform(1.6, 3.4) * size
            bx = x + rng.uniform(-2, 2)
            by = ty - rng.uniform(0, 3) * size
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
    ('lush', 0.92, 30, 0.20, 1.00, 0.52, 1.00),
    ('mid', 0.68, 16, 0.42, 0.88, 0.26, 0.74),
    ('thin', 0.42, 8, 0.66, 0.55, 0.08, 0.52),
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
