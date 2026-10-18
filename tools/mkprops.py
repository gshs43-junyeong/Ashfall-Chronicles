#!/usr/bin/env python3
"""작은 그림 굽기 — 모루 · 하늘 섬 재료 · 먹구름 · 분수대 · 발광 버섯 · 말풍선.

쓰기: python3 tools/mkprops.py <anvil|skyitems|clouds|fountain|glowcap|bubble> [인자…]   (인자 없으면 all)
  하위 명령마다 아래 _<이름>() 의 첫 문자열이 그 도구의 설명이다(예전 파일 하나 = 하위 명령 하나, 본문은 그대로)."""
import os, sys
import os as _os, sys as _sys   # 하위 명령 본문이 os · sys 를 제 안에서 다시 import 해도 머리줄이 쓸 수 있게

# ===== anvil — 예전 tools/mkanvil.py ==============================
def _anvil(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkanvil.py')] + argv
    __name__ = '__main__'
    """강화 모루 그림 굽기 → play/assets/obj/anvil.png (44x44, 4배).

    예전 그림은 윤곽선이 없고 면이 평평해 옆의 재련대·금고·게시판과 따로 놀았다(받침이 가늘고 망치가 떠 보였다).
    같은 마을 시설처럼 짙은 윤곽선(#0d0d13) · 재련대의 쇳빛 팔레트 · 점 무늬 질감으로 다시 그린다:
    쇠띠 두른 나무 밑동 위에 모루(왼쪽 뿔 · 평평한 윗면 · 잘록한 허리 · 넓은 발), 윗면에 달군 쇳조각과 누운 망치.
    """
    import os, random
    from PIL import Image

    OUT = os.path.join(os.path.dirname(__file__), '..', 'play', 'assets', 'obj', 'anvil.png')
    W = H = 44
    K = 4
    OL = (0x0d, 0x0d, 0x13, 255)


    def hx(s):
        s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


    def main():
        rnd = random.Random(7)
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load()
        body = set()

        def put(x, y, c):
            if 0 <= x < W and 0 <= y < H: px[x, y] = hx(c) if isinstance(c, str) else c; body.add((x, y))

        # 나무 밑동(34~43줄) — 세로 결, 쇠띠 한 줄
        for y in range(33, 44):
            for x in range(10, 34):
                c = '#6a4a2e' if (x * 3 + y // 4) % 5 else '#5a3e26'
                if x in (10, 11): c = '#4a321e'
                if x in (32, 33): c = '#3e2a18'
                if y == 33: c = '#8a6440'
                if y in (38, 39): c = '#56565c' if y == 38 else '#3a3a42'
                put(x, y, c)
        # 모루 발(29~32) · 허리(25~28) · 몸(20~24) · 뿔(왼쪽으로 가늘어짐)
        def steel_row(y, x0, x1):
            for x in range(x0, x1 + 1):
                put(x, y, '#4a4a52')
        for y in range(29, 33): steel_row(y, 12 - (y - 29), 31 + (y - 29))
        for y in range(25, 29): steel_row(y, 16, 28)
        for y in range(19, 25): steel_row(y, 9, 36)
        for i, y in enumerate(range(19, 23)):          # 뿔 — 위는 길게, 아래로 짧게
            for x in range(2 + i * 2, 9): put(x, y, '#4a4a52')
        for x in range(36, 40):                         # 뒷굽(오른쪽 네모 끝)
            for y in range(19, 22): put(x, y, '#4a4a52')
        # 빛과 그늘 — 윗면이 밝고, 아래·오른쪽이 어둡다
        for (x, y) in list(body):
            p = px[x, y]
            if p[:3] != (0x4a, 0x4a, 0x52): continue
            up = (x, y - 1) not in body
            if up: px[x, y] = hx('#8a8a92')
            elif (x, y - 2) not in body: px[x, y] = hx('#6a6a74')
            elif (x + 1, y) not in body or (x, y + 1) not in body: px[x, y] = hx('#3a3a42')
            elif rnd.random() < 0.12: px[x, y] = hx('#56565c' if rnd.random() < 0.5 else '#3d3d43')
        # 허리의 어두운 홈
        for y in range(25, 29): px[16, y] = hx('#3a3a42'); px[28, y] = hx('#2b2b32')
        # 윗면에 달군 쇳조각
        for x in range(17, 23): put(x, 18, '#e0561c' if x in (18, 19, 20, 21) else '#8c2f0c')
        put(19, 17, '#ffb04a'); put(20, 17, '#ffb04a')
        # 누운 망치 — 머리는 쇠, 자루는 오른쪽으로
        for y in range(14, 19):
            for x in range(26, 32): put(x, y, '#5d5d63' if y > 14 else '#8a8a92')
        for x in range(32, 42): put(x, 17, '#8a6440'); put(x, 18, '#6a4a2e')
        # 윤곽선 — 몸 둘레의 빈 칸
        ring = [(x + dx, y + dy) for (x, y) in body for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
        for (x, y) in ring:
            if 0 <= x < W and 0 <= y < H and px[x, y][3] == 0: px[x, y] = OL
        im.resize((W * K, H * K), Image.NEAREST).save(OUT)
        print('wrote', OUT)


    if __name__ == '__main__':
        main()


# ===== skyitems — 예전 tools/mkskyitems.py ==============================
def _skyitems(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkskyitems.py')] + argv
    __name__ = '__main__'
    """하늘 섬 고유 재료 두 아이콘 굽기 → play/assets/item/storm_amber.png · cloud_pearl.png (32x32).

    폭풍 호박: 번개가 구름 수액을 굳힌 덩이 — 울퉁불퉁한 호박빛, 속에 갇힌 하얀 번개 한 줄.
    구름 진주: 구름 해파리 속에서 자란 진주 — 둥근 진줏빛에 무지갯빛 띠, 밑에 구름 한 줌.
    다른 아이템 그림처럼 짙은 윤곽선 · 왼쪽 위 빛 · 반짝임 몇 점.
    """
    import math, os
    from PIL import Image

    OUT = os.path.join(os.path.dirname(__file__), '..', 'play', 'assets', 'item')
    N = 32


    def hx(s, a=255):
        s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


    def mix(a, b, t):
        return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


    def outline(im, col):
        px = im.load(); add = []
        for y in range(N):
            for x in range(N):
                if px[x, y][3]: continue
                if any(0 <= x + dx < N and 0 <= y + dy < N and px[x + dx, y + dy][3] and px[x + dx, y + dy] != col
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): add.append((x, y))
        for p in add: px[p] = col


    def storm_amber():
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
        cx, cy = 15.5, 16.5
        lo, mid, hi = hx('#8a3e0a'), hx('#e08a1c'), hx('#ffd27a')
        for y in range(N):
            for x in range(N):
                a = math.atan2(y - cy, x - cx)
                r = 10.5 + 1.6 * math.sin(a * 3 + 0.6) + 0.9 * math.sin(a * 5 - 1.1)   # 울퉁불퉁한 덩이
                d = math.hypot(x - cx, (y - cy) * 1.08)
                if d > r: continue
                lit = max(0.0, min(1.0, 0.55 - ((x - cx) + (y - cy)) / 22 + (1 - d / r) * 0.35))
                px[x, y] = mix(lo, mid, lit / 0.6) if lit < 0.6 else mix(mid, hi, (lit - 0.6) / 0.4)
        # 갇힌 번개 — 가늘게 꺾이는 하얀 줄, 둘레는 옅은 금빛
        bolt = [(12, 9), (13, 10), (14, 11), (14, 12), (13, 13), (12, 14), (13, 15), (14, 16), (15, 17), (16, 17),
                (17, 18), (16, 19), (15, 20), (16, 21), (17, 22), (18, 23)]
        for x, y in bolt:
            for dx, dy in ((1, 0), (-1, 0)):
                if px[x + dx, y + dy][3]: px[x + dx, y + dy] = mix(px[x + dx, y + dy], hx('#fff3c0'), 0.5)
        for x, y in bolt: px[x, y] = hx('#fffbe8')
        # 속에 든 구름 알갱이 · 빛 받는 모서리
        for x, y in ((20, 12), (21, 13), (10, 20), (19, 21)): px[x, y] = mix(px[x, y], hx('#fff8e0'), 0.6)
        for x, y in ((9, 10), (10, 9), (11, 8), (9, 11)): px[x, y] = hx('#fff0c0')
        outline(im, hx('#2a1406'))
        for x, y in ((25, 6), (26, 5), (24, 5), (25, 4)): im.putpixel((x, y), hx('#fff3c0'))   # 반짝임
        return im


    def cloud_pearl():
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
        cx, cy, R = 15.5, 14.0, 9.2
        base, shade_, hi = hx('#dfe9f5'), hx('#8a9ab8'), hx('#ffffff')
        for y in range(N):
            for x in range(N):
                d = math.hypot(x - cx, y - cy)
                if d > R: continue
                l = max(0.0, min(1.0, 0.75 - ((x - cx) * 0.6 + (y - cy)) / (R * 1.6)))
                c = mix(shade_, base, l)
                # 무지갯빛 띠 — 비스듬한 줄을 따라 보라 · 분홍 · 하늘빛
                band = (x - cx) * 0.7 + (y - cy)
                if 1.5 < band < 5.5 and d < R - 1:
                    t = (band - 1.5) / 4
                    c = mix(c, hx('#e8c8f0') if t < 0.33 else hx('#f5d0dc') if t < 0.66 else hx('#c8e8f5'), 0.45)
                px[x, y] = c
        for x, y in ((11, 9), (12, 9), (11, 10), (12, 10), (13, 9), (10, 11)): px[x, y] = hi   # 창빛
        px[20, 18] = mix(px[20, 18], hi, 0.4)
        # 밑에 받친 구름 한 줌
        for (ox, oy, r) in ((9, 25, 3.2), (15, 26, 4.0), (21, 25, 3.4), (12, 23, 2.6), (19, 23, 2.4)):
            for y in range(N):
                for x in range(N):
                    if math.hypot(x - ox, y - oy) <= r and (px[x, y][3] == 0 or y >= 22):
                        px[x, y] = hx('#f4f8fc') if y < oy else hx('#c8d4e4')
        outline(im, hx('#1e2230'))
        for x, y in ((25, 7), (26, 6), (24, 6), (25, 5)): im.putpixel((x, y), hx('#ffffff'))
        return im


    def main():
        for name, fn in (('storm_amber', storm_amber), ('cloud_pearl', cloud_pearl)):
            p = os.path.join(OUT, name + '.png'); fn().save(p); print('wrote', p)


    if __name__ == '__main__':
        main()


# ===== clouds — 예전 tools/mkclouds.py ==============================
def _clouds(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkclouds.py')] + argv
    __name__ = '__main__'
    """먹구름을 굽는다 — cloud_6 · cloud_7.

    ■ 왜 더 필요했나

      비가 올 때 화면에 뜨는 구름을 먹구름만으로 채우게 바꿨는데(game.js drawClouds),
      폭우일 때 구름이 백 개 넘게 흐른다. 먹구름이 둘(cloud_4·5)뿐이면 같은 그림이
      줄줄이 지나가 벽지처럼 보인다. 흰 구름이 셋이므로 먹구름도 넷으로 맞춘다.

    ■ 기존 그림에서 읽어 낸 규격 (cloud_4·5 를 재서 그대로 따른다)

      · 판 256x128, **4배 격자** — 논리 64x32 칸을 4배로 키운 것이다.
      · 색은 네 단. 실루엣 **위쪽 표면에서 얼마나 내려왔나**로 가른다(가로로 뚝 자르는
        것이 아니다). 깊이 비율 0.22 / 0.55 / 0.75 에서 A→B→C→D 로 넘어간다.
        cloud_4 의 가장 높은 열에서 재면 A 가 3칸(0.18) · B 가 9칸까지(0.53) ·
        C 가 13칸까지(0.76)였다.
      · ★ 나누는 값은 **그림 전체의 높이**다. 열마다 제 높이로 나누면 얇은 가장자리 열이
        두어 칸 만에 가장 어두운 단까지 가서 테두리가 시커멓게 둘린다. 전체 높이로
        나눠야 가장자리가 밝은 단에 머물러 덩이가 부풀어 보인다(cloud_4 가 그렇다 —
        17줄 중 가장자리 열은 세 칸뿐이라 0.18, 끝까지 A 다).
      · 경계는 **톱니처럼 흔들린다.** 자로 자른 듯 매끈하면 구름이 아니라 판때기로
        보인다. 자리 해시로 한 칸씩 밀어 준다 — 난수를 쓰면 다시 구울 때마다 달라진다.
      · 그림은 판 가운데에 놓이고 가로로 41칸 안팎을 쓴다(cloud_4 가 41칸).

    사용법:
        python3 tools/mkclouds.py            # 무엇이 만들어질지만
        python3 tools/mkclouds.py --write    # assets/bg/ 에 굽는다
    """
    import math
    import os
    import sys

    from PIL import Image

    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    BG = os.path.join(ROOT, 'play', 'assets', 'bg')
    S = 4                      # 격자 배수
    LW, LH = 64, 32            # 논리 칸
    BAND = (0.22, 0.55, 0.75)  # 위 표면에서의 깊이 비율 — A/B/C/D 경계

    # (파일, 네 단 색 밝은 것부터, 덩이들 [중심x, 중심y, 반지름x, 반지름y])
    PLAN = [
        ('cloud_6',
         [(82, 92, 104), (64, 73, 84), (51, 59, 69), (41, 47, 56)],
         # ★ 덩이들의 **꼭대기 높이를 어긋나게** 둔다. 비슷하면 만나는 자리에 홈이 파여
         #   등이 톱니가 된다(cloud_4·5 는 큰 덩이 하나에 낮은 어깨가 붙은 모양이다).
         #   가운데가 가장 높고, 어깨는 네댓 칸 아래에서 시작한다.
         # 넓고 낮은 띠 — 가운데 마루가 왼쪽으로 치우쳤다
         [(29, 18, 14, 8.5), (18, 21, 9, 5.5), (43, 21, 9, 5.0)]),
        ('cloud_7',
         [(70, 80, 92), (55, 64, 74), (44, 51, 60), (33, 39, 47)],
         # 가운데가 높이 부풀고 오른쪽으로 낮은 꼬리가 길게 빠진다
         [(27, 17, 12, 9.5), (17, 21, 8, 5.0), (40, 22, 10, 4.5)]),
    ]


    def hash2(x, y):
        """자리로 정해지는 0~1. 난수를 안 쓰는 이유는 다시 구워도 같으라고."""
        h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
        h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
        return ((h ^ (h >> 16)) & 0xFFFF) / 0xFFFF


    def build(name, pal, lobes, write):
        fill = [[False] * LW for _ in range(LH)]
        for ly in range(LH):
            for lx in range(LW):
                for (cx, cy, rx, ry) in lobes:
                    # 가장자리를 한 칸 흔든다 — 매끈한 타원 여럿은 눈사람처럼 보인다
                    j = hash2(lx, ly) - 0.5
                    if ((lx - cx) / rx) ** 2 + ((ly - cy) / ry) ** 2 <= 1.0 + j * 0.05:
                        fill[ly][lx] = True
                        break

        # 덩이 여럿을 합치면 만나는 자리마다 톱니 홈이 남는다. 이웃 여덟 칸 중 다섯 이상이
        # 차 있으면 채우고 셋 이하면 비우는 다듬기를 두 번 — 덩이 수는 그대로 두고 윤곽만
        # 둥글려 준다. cloud_4·5 의 매끈한 등을 따라가려는 것이다.
        for _ in range(2):
            nxt = [row[:] for row in fill]
            for ly in range(LH):
                for lx in range(LW):
                    k = sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                            if (dx or dy) and 0 <= ly + dy < LH and 0 <= lx + dx < LW
                            and fill[ly + dy][lx + dx])
                    if k >= 5:
                        nxt[ly][lx] = True
                    elif k <= 3:
                        nxt[ly][lx] = False
            fill = nxt

        top = [next((y for y in range(LH) if fill[y][x]), None) for x in range(LW)]
        bot = [next((y for y in range(LH - 1, -1, -1) if fill[y][x]), None) for x in range(LW)]

        xs0 = [x for x in range(LW) if top[x] is not None]
        H = max(1, max(bot[x] - top[x] + 1 for x in xs0))   # 그림 전체의 높이
        im = Image.new('RGBA', (LW * S, LH * S), (0, 0, 0, 0))
        px = im.load()
        n = 0
        for ly in range(LH):
            for lx in range(LW):
                if not fill[ly][lx]:
                    continue
                d = (ly - top[lx]) / H                   # 위 표면에서 내려온 비율 (전체 높이 기준)
                d += (hash2(lx * 7 + 1, ly * 13 + 5) - 0.5) * 0.07   # 경계를 톱니로
                k = 0 if d < BAND[0] else 1 if d < BAND[1] else 2 if d < BAND[2] else 3
                c = pal[k] + (255,)
                for dy in range(S):
                    for dx in range(S):
                        px[lx * S + dx, ly * S + dy] = c
                n += 1
        xs = [x for x in range(LW) if top[x] is not None]
        print(f'  {name}  칸 {n} ({n / (LW * LH) * 100:.0f}%)  가로 {xs[-1] - xs[0] + 1}칸  '
              f'세로 {max(bot[x] - top[x] + 1 for x in xs)}칸')
        if write:
            im.save(os.path.join(BG, name + '.png'))


    def main(argv):
        write = '--write' in argv
        for name, pal, lobes in PLAN:
            build(name, pal, lobes, write)
        print('구웠다. ★ manifest.json 에 등록하고 sync-manifest 를 돌려야 한다.'
              if write else '보기만 했다(--write 로 저장).')
        return 0


    if __name__ == '__main__':
        raise SystemExit(main(sys.argv[1:]))


# ===== fountain — 예전 tools/mkfountain.py ==============================
def _fountain(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkfountain.py')] + argv
    __name__ = '__main__'
    """분수대 시트 굽기 — tools/art/fountain_src.png(110x66, 한 장) → play/assets/obj/fountain.png(4배, N장).

    원래 두 장은 물줄기 곡선 자체가 장마다 달라서 물이 위아래로 출렁이는 것처럼 보였다.
    곡선은 한 번만 맞춰 두고(원래 그림의 물방울 자리에 2차식 맞춤) **물방울이 그 길을 따라 흘러가게** 칠한다:
    포물선은 윗 물받이에서 바깥 아래로, 가운데 물줄기는 아래로, 꼭대기 물기둥은 위로, 물받이 수면은 바깥으로.
    N장·주기가 맞물려 끝 장과 첫 장이 끊김 없이 이어진다. 게임은 manifest frames 를 읽어 돌린다(game.js 분수대).
    """
    import os
    from PIL import Image

    ROOT = os.path.join(os.path.dirname(__file__), '..')
    SRC = os.path.join(ROOT, 'tools', 'art', 'fountain_src.png')
    OUT = os.path.join(ROOT, 'play', 'assets', 'obj', 'fountain.png')
    N, K = 8, 4
    MID, LIGHT, DEEP = (79, 164, 192, 255), (134, 208, 228, 255), (47, 114, 144, 255)
    W, H = 110, 66
    CX = (W - 1) / 2                     # 54.5 — 좌우 대칭 축


    def is_water(p):
        return p[3] and p[2] > p[0] + 40 and p[2] > 120


    def fit_arc(src):
        """왼쪽 포물선의 물방울 자리(9~43줄, 가운데 기둥·물줄기 밖)에 y = a x² + b x + c 를 맞춘다."""
        px = src.load()
        pts = [(x, y) for y in range(9, 44) for x in range(0, 36) if is_water(px[x, y])]
        n = len(pts)
        sx = [sum(x ** k for x, _ in pts) for k in range(5)]
        sy = [sum(y * x ** k for x, y in pts) for k in range(3)]
        # 정규방정식 3x3
        A = [[sx[4], sx[3], sx[2]], [sx[3], sx[2], sx[1]], [sx[2], sx[1], n]]
        B = [sy[2], sy[1], sy[0]]
        for i in range(3):
            for j in range(i + 1, 3):
                f = A[j][i] / A[i][i]
                A[j] = [a - f * b for a, b in zip(A[j], A[i])]; B[j] -= f * B[i]
        c = B[2] / A[2][2]; b = (B[1] - A[1][2] * c) / A[1][1]; a = (B[0] - A[0][1] * b - A[0][2] * c) / A[0][0]
        return a, b, c


    def base_of(src):
        """물줄기만 걷어 낸 바탕 — 물받이 수면(23~25줄 · 47줄 아래)과 윗 물받이 테두리(0~8줄)는 남긴다."""
        b = src.copy(); px = b.load()
        for y in range(9, 44):
            if 23 <= y <= 25:
                continue
            for x in range(W):
                if is_water(px[x, y]):
                    px[x, y] = (0, 0, 0, 0)
        return b


    def arc_samples(a, b, c):
        """왼쪽 포물선을 윗 물받이 가장자리(9줄)에서 아래 물받이(43줄)까지 호 길이로 촘촘히 짚는다."""
        y_of = lambda x: a * x * x + b * x + c
        xs, x = [], 45.0
        while y_of(x) < 9: x -= 0.02
        while y_of(x) <= 43.6 and x > 8:
            xs.append(x); x -= 0.02
        out, s, prev = [], 0.0, None
        for x in xs:
            y = y_of(x)
            if prev: s += ((x - prev[0]) ** 2 + (y - prev[1]) ** 2) ** 0.5
            out.append((x, y, s)); prev = (x, y)
        return out


    def frame(base, samples, f):
        im = base.copy(); px = im.load()
        put = lambda x, y, c: (0 <= x < W and 0 <= y < H) and px.__setitem__((x, y), c)
        # 포물선 — 길이 8 주기에 물방울 3칸, 앞머리가 밝다. 한 장에 1칸씩 바깥 아래로
        P, D = 8, 3
        for x, y, s in samples:
            u = (s - f) % P
            if u < D:
                col = LIGHT if u >= D - 1 else MID
                for xx in (round(x), round(2 * CX - x)):
                    put(xx, round(y), col)
        # 가운데 물줄기(가운데 물받이 밑 → 아래 물받이) — 주기 4, 한 장에 1칸 아래로
        for y in range(29, 44):
            u = (y - 29 - f) % 4
            if u < 3:
                for xl in (37, 72):
                    put(xl, y, LIGHT if u == 2 else MID)
        # 꼭대기 물기둥 — 밝은 줄이 아래에서 위로
        for y in range(0, 4):
            for x in range(51, 59):
                if is_water(px[x, y]):
                    inner = 52 <= x <= 57
                    px[x, y] = LIGHT if inner and (3 - y - f) % 4 in (0, 1) else (MID if not inner else DEEP if (3 - y - f) % 4 == 3 else MID)
        # 물받이 수면 — 가운데에서 바깥으로 번지는 잔물결
        for y, x0, x1 in ((47, 8, 101), (24, 40, 69)):
            for x in range(x0, x1 + 1):
                d = abs(x - CX)
                if is_water(px[x, y]):
                    px[x, y] = MID if (d - f) % 8 < 1 else LIGHT
        return im


    def main():
        src = Image.open(SRC).convert('RGBA')
        a, b, c = fit_arc(src)
        base = base_of(src)
        samples = arc_samples(a, b, c)
        sheet = Image.new('RGBA', (W * N * K, H * K), (0, 0, 0, 0))
        for f in range(N):
            sheet.paste(frame(base, samples, f).resize((W * K, H * K), Image.NEAREST), (f * W * K, 0))
        sheet.save(OUT)
        print('wrote', OUT, sheet.size, 'arc y=%.4fx²%+.3fx%+.2f' % (a, b, c))


    if __name__ == '__main__':
        main()


# ===== glowcap — 예전 tools/mkglowcap.py ==============================
def _glowcap(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkglowcap.py')] + argv
    __name__ = '__main__'
    """발광 버섯 타일(GLOWCAP) 갈래 여섯 장을 굽는다 → play/assets/tile/tile_glowcap.png (22×22 × 6 가로 띠)

        python3 tools/mkglowcap.py

    ★ 한 모양(갓 둘)이 골짜기 · 포자 굴 유적 전체에 도장 찍듯 되풀이됐다(사용자 지적 2026-10-15).
      타일 아틀라스는 칸마다 갈래(v 0~5)를 자리로 고르므로, 띠의 n번째 칸이 갈래 n 이 된다(tileart `applySprite`).
      0번은 원래 그림(tools/art/glowcap_src.png) 그대로 — 나머지는 같은 팔레트 · 같은 1칸 결로 길쭉한 외대 · 작은 무리 · 넓은 우산 · 종 둘 · 큰 것과 작은 것.
      아랫줄(21)이 땅에 닿는다. 빛 번짐(반투명)은 모양 둘레 2칸.
    """
    import os
    from PIL import Image

    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    OUT = os.path.join(ROOT, 'play', 'assets', 'tile', 'tile_glowcap.png')
    SRC = os.path.join(ROOT, 'tools', 'art', 'glowcap_src.png')
    TS, V = 22, 6

    HALO = (45, 225, 190, 51)
    CAP, CAP_LT, CAP_TOP, CAP_DK, GILL = (30, 138, 122, 255), (38, 168, 148, 255), (70, 214, 188, 255), (21, 104, 91, 255), (15, 74, 66, 255)
    SPOT = (143, 252, 230, 255)
    STEM, STEM_MD, STEM_DK = (240, 250, 246, 255), (207, 230, 223, 255), (154, 181, 174, 255)


    class Cell:
        def __init__(self):
            self.px = {}

        def put(self, x, y, c):
            if 0 <= x < TS and 0 <= y < TS:
                self.px[(x, y)] = c

        def stem(self, x0, y0, w, lean=0):
            """x0 왼끝 · y0 갓 밑부터 땅(21)까지 · lean: 위쪽 절반을 한 칸 민다"""
            for y in range(y0, TS):
                dx = lean if y < (y0 + TS) // 2 else 0
                for i in range(w):
                    self.put(x0 + dx + i, y, STEM if i == 0 else STEM_DK if i == w - 1 else STEM_MD)

        def dome(self, cx, top, hw, rows, spots=()):
            """둥근 갓 — 위로 갈수록 타원처럼 좁아지고 아랫줄은 주름(어두운 줄). cx 는 칸 가운데(반 칸 단위 허용)"""
            for r in range(rows):
                w = hw if r == rows - 1 else max(1, round(hw * (1 - ((rows - 1 - r) / rows) ** 2) ** 0.5))   # 타원 윤곽
                y = top + r
                xs = range(int(round(cx - w)), int(round(cx + w)))
                for x in xs:
                    t = (x - (cx - w)) / max(1, 2 * w)
                    if r == rows - 1:
                        c = GILL
                    elif r == 0:
                        c = CAP_TOP if t < 0.6 else CAP_LT
                    elif t > 0.82:
                        c = CAP_DK
                    elif r == 1 and t < 0.55:
                        c = CAP_LT
                    else:
                        c = CAP
                    self.put(x, y, c)
            for (sx, sy) in spots:
                self.put(int(cx + sx), top + sy, SPOT); self.put(int(cx + sx) + 1, top + sy, SPOT)

        def bell(self, cx, top, widths, spots=()):
            """종 모양 — 줄마다 반폭(widths), 마지막 줄이 주름"""
            n = len(widths)
            for r, w in enumerate(widths):
                y = top + r
                for x in range(int(round(cx - w)), int(round(cx + w))):
                    t = (x - (cx - w)) / max(1, 2 * w)
                    c = GILL if r == n - 1 else CAP_TOP if r == 0 else CAP_DK if t > 0.78 else CAP_LT if t < 0.4 else CAP
                    self.put(x, y, c)
            for (sx, sy) in spots:
                self.put(int(cx + sx), top + sy, SPOT)

        def image(self):
            im = Image.new('RGBA', (TS, TS), (0, 0, 0, 0))
            solid = set(self.px)
            for y in range(TS):
                for x in range(TS):
                    if (x, y) in solid:
                        continue
                    if any((x + dx, y + dy) in solid for dx in range(-2, 3) for dy in range(-2, 3) if abs(dx) + abs(dy) <= 3):
                        im.putpixel((x, y), HALO)
            for (x, y), c in self.px.items():
                im.putpixel((x, y), c)
            return im


    def v1():                                   # 길쭉한 외대 — 가는 자루 위 종 갓, 위가 살짝 기운다
        c = Cell(); c.stem(10, 9, 2, lean=1); c.bell(12, 2, [1, 2, 2, 3, 3, 4, 4], spots=((-1, 2), (1, 4))); return c.image()


    def v2():                                   # 작은 무리 — 키가 다른 꼬마 버섯 넷
        c = Cell()
        for cx, top in ((4, 15), (9, 12), (13.5, 16), (18, 14)):
            c.stem(int(cx) - 1, top + 3, 2)
            c.dome(cx, top, 3, 4, spots=((-1, 1),))
        return c.image()


    def v3():                                   # 넓은 우산 — 낮고 넓은 갓 하나 + 발치에 꼬마
        c = Cell(); c.stem(8, 14, 3); c.dome(9.5, 9, 9, 5, spots=((-5, 2), (0, 1), (4, 2))); c.stem(18, 19, 1); c.dome(18.5, 17, 2, 2); return c.image()


    def v4():                                   # 종 둘 — 큰 종 · 작은 종
        c = Cell(); c.stem(5, 13, 2); c.bell(6, 6, [1, 2, 3, 3, 4, 4, 5], spots=((-2, 3), (1, 2)))
        c.stem(15, 17, 2); c.bell(16, 12, [1, 2, 3, 3, 4], spots=((0, 2),)); return c.image()


    def v5():                                   # 큰 것 하나와 작은 것 둘
        c = Cell(); c.stem(5, 9, 3, lean=-1); c.dome(6.5, 4, 5, 5, spots=((-3, 2), (1, 1)))
        c.stem(13, 17, 2); c.dome(14, 14, 3, 3, spots=((-1, 1),)); c.stem(18, 19, 1); c.dome(18.5, 17, 2, 2)
        return c.image()


    def main():
        if not os.path.exists(SRC):            # 처음 한 번 — 원래 한 장을 원본으로 옮겨 둔다(산출물을 다시 먹이지 않게)
            Image.open(OUT).convert('RGBA').crop((0, 0, TS, TS)).save(SRC)
        strip = Image.new('RGBA', (TS * V, TS), (0, 0, 0, 0))
        strip.paste(Image.open(SRC).convert('RGBA'), (0, 0))
        for i, fn in enumerate((v1, v2, v3, v4, v5), 1):
            strip.paste(fn(), (i * TS, 0))
        strip.save(OUT, optimize=True)
        print('tile_glowcap.png', strip.size)


    if __name__ == '__main__':
        main()


# ===== bubble — 예전 tools/mkbubble.py ==============================
def _bubble(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkbubble.py')] + argv
    __name__ = '__main__'
    """대화 말풍선을 굽는다 — 칸(2배) 픽셀 그림 9조각 틀 + 꼬리 → play/assets/ui/

        python3 tools/mkbubble.py

      ui/bubble.png       NPC 말풍선(양피지) — 둥근 계단 모서리 · 1칸 윤곽 · 위 빛 · 아래 오른쪽 그늘 · 오른쪽 아래 그림자
      ui/bubble_tail.png  말풍선 꼬리(15×16칸 · 왼쪽 아래 초상 쪽으로 휜다) — 오른쪽 두 열이 말풍선 왼쪽 테를 덮어 이음매가 없다
      ui/bubble_lore.png  비석 · 석판 글(돌 판) — 모서리를 깎은 판 · 끌 자국 · 모서리 룬 점

    ★ CSS(`border-image`)가 9조각으로 늘린다 — 가장자리 줄은 고르게 칠해야 늘어나도 끊기지 않는다(무늬는 모서리 칸에만).
      조각 폭(SLICE)을 바꾸면 style.css 의 `border-image` 수치도 같이. 그림을 바꾸면 style.css url 의 ?v=(md5 앞 8자)도.
    """
    import hashlib, math, os
    from PIL import Image

    ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets', 'ui')
    K = 2                                   # 칸 하나 = 2px (초상과 같은 배율)


    def put(im, x, y, c):
        if 0 <= x < im.width // K and 0 <= y < im.height // K:
            for dy in range(K):
                for dx in range(K):
                    im.putpixel((x * K + dx, y * K + dy), c)


    def shape(w, h, inside, outline, fill, hi=None, lo=None, shadow=None, deco=None):
        """inside(x, y) 로 정한 모양을 칸 그림으로 — 바깥과 맞닿은 칸이 윤곽, 윤곽 바로 안쪽 위 줄이 빛 · 아래 · 오른쪽 줄이 그늘"""
        im = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0))
        ins = lambda x, y: 0 <= x < w and 0 <= y < h and inside(x, y)
        if shadow:
            for y in range(h):
                for x in range(w):
                    if not ins(x, y) and ins(x - 1, y - 1):
                        put(im, x, y, shadow)
        for y in range(h):
            for x in range(w):
                if not ins(x, y):
                    continue
                edge = not all(ins(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if edge:
                    put(im, x, y, outline)
                    continue
                c = fill
                if hi and not ins(x, y - 2):
                    c = hi
                elif lo and (not ins(x, y + 2) or not ins(x + 2, y)):
                    c = lo
                put(im, x, y, c)
        if deco:
            deco(im, ins)
        return im


    def rounded(w, h, r):
        """둥근 계단 모서리 — 칸 가운데가 반지름 안이면 안"""
        def f(x, y):
            cx = min(max(x + 0.5, r), w - r)
            cy = min(max(y + 0.5, r), h - r)
            return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r + 0.3
        return f


    # 양피지 — 따뜻한 흰빛, 윤곽은 짙은 밤색(검정이 아니라서 딱딱하지 않다)
    INK = (43, 33, 24, 255)
    PAPER = (236, 225, 198, 255)
    PAPER_HI = (248, 241, 222, 255)
    PAPER_LO = (214, 199, 165, 255)
    SHADOW = (0, 0, 0, 90)

    # 돌 판 — 푸른 회색, 룬 점은 청록
    STONE_LINE = (16, 17, 22, 255)
    STONE = (62, 66, 76, 255)
    STONE_HI = (92, 98, 110, 255)
    STONE_LO = (44, 47, 55, 255)
    RUNE = (110, 214, 196, 255)

    SLICE = 8                               # 9조각 가장자리 폭(칸) — style.css border-image 16px(=8칸 × 2)
    W = H = 2 * SLICE + 2                   # 가운데 2칸 + 그림자 자리


    def bubble():
        w, h = W - 1, H - 1                 # 그림자 한 칸 자리
        f = rounded(w, h, 6.2)
        im = shape(W, H, lambda x, y: x < w and y < h and f(x, y), INK, PAPER, PAPER_HI, PAPER_LO, SHADOW)
        return im


    def tail():
        """왼쪽 아래로 휘는 꼬리 — 15 × 16 칸. 오른쪽 두 열(13 · 14)은 말풍선 왼쪽 테 위에 놓여 틈을 메운다"""
        w, h, B = 15, 16, 13
        def inside(x, y):
            if x >= B:
                return 1 <= y <= 8
            t = (B - x) / B                 # 0 = 말풍선 쪽 · 1 = 끝
            top = 1 + t ** 1.7 * 13.2       # 윗변이 아래로 휘며 끝으로
            bot = 8 + t ** 0.75 * 6.4
            return top <= y + 0.5 <= bot
        im = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0))
        ins = lambda x, y: 0 <= x < w and 0 <= y < h and inside(x, y)
        for y in range(h):
            for x in range(w):
                if not ins(x, y) and ins(x - 1, y - 1) and x < B:
                    put(im, x, y, SHADOW)
        for y in range(h):
            for x in range(w):
                if not ins(x, y):
                    continue
                edge = not ins(x, y - 1) or not ins(x, y + 1) or (x < B and (not ins(x - 1, y) or not ins(x + 1, y)))
                c = INK if edge else PAPER if x >= B - 1 else PAPER_HI if not ins(x, y - 2) and x > 4 else PAPER_LO if not ins(x, y + 2) else PAPER
                put(im, x, y, c)
        return im


    def lore():
        w, h = W - 1, H - 1
        cut = 4
        def inside(x, y):
            if not (x < w and y < h):
                return False
            dx = min(x, w - 1 - x); dy = min(y, h - 1 - y)
            return dx + dy >= cut - 1
        def deco(im, ins):
            for (x, y) in ((4, 2), (w - 5, 2), (4, h - 3), (w - 5, h - 3)):
                put(im, x, y, RUNE)
            for (x, y) in ((2, 5), (w - 3, 5), (2, h - 6), (w - 3, h - 6)):
                put(im, x, y, STONE_LO)
        return shape(W, H, inside, STONE_LINE, STONE, STONE_HI, STONE_LO, SHADOW, deco)



    def main():
        os.makedirs(ROOT, exist_ok=True)
        for name, fn in (('bubble', bubble), ('bubble_tail', tail), ('bubble_lore', lore)):
            im = fn()
            p = os.path.join(ROOT, f'{name}.png')
            im.save(p, optimize=True)
            print(f'{name}.png  {im.width}x{im.height}  ?v={hashlib.md5(open(p, "rb").read()).hexdigest()[:8]}')


    if __name__ == '__main__':
        main()


CMDS = {'anvil': _anvil, 'skyitems': _skyitems, 'clouds': _clouds, 'fountain': _fountain, 'glowcap': _glowcap, 'bubble': _bubble}

if __name__ == '__main__':
    a = sys.argv[1:] or 'all'.split()
    if not a or (a[0] not in CMDS and a[0] != 'all'):
        sys.exit('쓰기: python3 tools/mkprops.py <' + '|'.join(list(CMDS) + ['all']) + '> [인자…]')
    if a[0] == 'all':   # 하위 명령이 raise SystemExit(0) 으로 끝나도 다음 것을 이어 돈다
        for f in CMDS.values():
            try: f([])
            except SystemExit as e:
                if e.code not in (None, 0): raise
    else:
        CMDS[a[0]](a[1:])
