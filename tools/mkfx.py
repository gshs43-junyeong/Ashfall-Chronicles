#!/usr/bin/env python3
"""효과 그림 굽기 — 마법 타격 · 물리 타격 · 용광로 연기 · 별 조각(play/assets/fx/).

쓰기: python3 tools/mkfx.py <hit|phys|smoke|star> [인자…]   (인자 없으면 all)
  하위 명령마다 아래 _<이름>() 의 첫 문자열이 그 도구의 설명이다(예전 파일 하나 = 하위 명령 하나, 본문은 그대로)."""
import os, sys
import os as _os, sys as _sys   # 하위 명령 본문이 os · sys 를 제 안에서 다시 import 해도 머리줄이 쓸 수 있게

# ===== hit — 예전 tools/mkhitfx.py ==============================
def _hit(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkhitfx.py')] + argv
    __name__ = '__main__'
    """마법이 맞는 순간을 굽는다 — 원소마다 다른 세 장.

      fx/hit_arcane.png  64x64 x 6프레임   비전 (bolt · rune · wind · star)
      fx/hit_frost.png   64x64 x 6프레임   서리 — 얼음이 돋았다 부서진다
      fx/hit_soul.png    64x64 x 6프레임   영혼 — 보랏빛이 피어올라 흩어진다

    ■ 왜 새로 그리나

      여태 마법이 맞는 순간은 hit_impact.png 한 장이었다. 그건 **물리 타격**이다 —
      따뜻한 금빛에 살점이 튀는 듯한 유기적인 파편. 화살이나 검에는 맞지만, 서리
      지팡이가 맞았을 때도 금빛이 튀니 "마법이 닿았다"로 안 읽혔다.
      그래서 물리(hit_impact)는 그대로 두고, 마법용 셋을 따로 굽는다.

    ■ 규칙 (게임의 다른 시트와 같다)

      64x64 원본으로 그린 뒤 4배 최근접 확대, 프레임 사이 4px 틈.
      assets/manifest.json 의 fx.bursts 가 그 규격으로 잘라 쓴다(scale 4 · gap 4 ·
      frameW/H 64 · count 6). 값을 바꾸고 다시 돌리면 게임 쪽은 손댈 것이 없다.

    ■ 형태를 나눈 기준

      세 장이 색만 다르면 결국 같은 그림이다. **모양이 달라야** 구분이 선다.
        비전  각진 육각 — 규칙이 깨지는 느낌. 기하학적으로 뻗었다가 고리로 남는다
        서리  바늘 — 사방으로 얼음이 돋았다가 조각으로 부서진다
        영혼  연기 — 위로 피어오르는 갈래. 아래가 먼저 비고 위가 늦게 흩어진다
    """
    import math, os
    from PIL import Image

    OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets', 'fx')
    N, S, GAP, FRAMES = 64, 4, 4, 6
    C = N / 2 - 0.5


    def blend(a, b, t):
        t = max(0.0, min(1.0, t))
        return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


    def put(px, x, y, rgb, a):
        """알파를 겹쳐 찍는다. 이미 밝은 것이 있으면 더 밝은 쪽을 남긴다."""
        if not (0 <= x < N and 0 <= y < N) or a <= 0:
            return
        a = min(1.0, a)
        old = px[x, y]
        na = old[3] / 255.0
        if a >= na:
            px[x, y] = (rgb[0], rgb[1], rgb[2], int(a * 255))


    def ring(px, r, w, rgb, a, squash=1.0):
        """반지름 r, 두께 w 의 고리."""
        rr = int(r + w + 2)
        for y in range(-rr, rr + 1):
            for x in range(-rr, rr + 1):
                d = math.hypot(x, y / squash)
                k = 1.0 - abs(d - r) / max(w, 0.001)
                if k > 0:
                    put(px, int(C + x), int(C + y), rgb, a * k)


    def spike(px, ang, r0, r1, half, rgb, a):
        """중심에서 뻗는 바늘 — r0 에서 r1 까지, 끝으로 갈수록 얇아진다."""
        steps = int((r1 - r0) * 2) + 2
        for i in range(steps + 1):
            t = i / steps
            r = r0 + (r1 - r0) * t
            w = half * (1 - t) + 0.4
            cx, cy = C + math.cos(ang) * r, C + math.sin(ang) * r
            for dy in range(-int(w) - 1, int(w) + 2):
                for dx in range(-int(w) - 1, int(w) + 2):
                    if math.hypot(dx, dy) <= w:
                        put(px, int(cx + dx), int(cy + dy), rgb, a * (1 - t * 0.45))


    def hexring(px, r, w, rgb, a, rot=0.0):
        """육각 고리 — 각진 마법진. 꼭짓점 여섯을 선으로 잇는다."""
        pts = [(C + math.cos(rot + i * math.pi / 3) * r,
                C + math.sin(rot + i * math.pi / 3) * r) for i in range(6)]
        for i in range(6):
            x0, y0 = pts[i]
            x1, y1 = pts[(i + 1) % 6]
            steps = int(math.hypot(x1 - x0, y1 - y0) * 2) + 2
            for s in range(steps + 1):
                t = s / steps
                px_, py_ = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                for dy in range(-int(w), int(w) + 1):
                    for dx in range(-int(w), int(w) + 1):
                        if math.hypot(dx, dy) <= w:
                            put(px, int(px_ + dx), int(py_ + dy), rgb, a)


    def core(px, r, rgb, a):
        for y in range(-int(r) - 2, int(r) + 3):
            for x in range(-int(r) - 2, int(r) + 3):
                d = math.hypot(x, y)
                if d <= r:
                    put(px, int(C + x), int(C + y), rgb, a)
                elif d <= r + 1.6:
                    put(px, int(C + x), int(C + y), rgb, a * (1 - (d - r) / 1.6))


    # ---------------------------------------------------------------- 비전
    A_CORE, A_HOT, A_MID, A_DIM = (240, 250, 255), (168, 220, 255), (96, 160, 232), (52, 88, 150)


    def frame_arcane(f):
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
        t = f / (FRAMES - 1)                       # 0 → 1
        rot = t * 0.5
        # 각진 고리 둘 — 바깥은 빨리 퍼지고 안쪽은 늦게 따라간다
        hexring(px, 6 + t * 24, 1.6 - t * 0.7, blend(A_MID, A_DIM, t), 0.95 - t * 0.55, rot)
        if f >= 1:
            hexring(px, 3 + t * 15, 1.3, blend(A_HOT, A_MID, t), 0.9 - t * 0.6, -rot * 1.7)
        # 여섯 갈래 — 고리 꼭짓점 방향으로
        for i in range(6):
            a = rot + i * math.pi / 3
            spike(px, a, 4 + t * 12, 10 + t * 26, 2.2 * (1 - t * 0.6),
                  blend(A_HOT, A_MID, t), 0.85 - t * 0.6)
        # 심지 — 처음엔 하얗게 타고 금방 꺼진다
        if t < 0.75:
            core(px, 7 - t * 8, blend(A_CORE, A_HOT, t * 1.3), 1 - t * 1.1)
        return im


    # ---------------------------------------------------------------- 서리
    F_CORE, F_HOT, F_MID, F_DIM = (244, 253, 255), (198, 240, 255), (128, 200, 232), (74, 130, 168)


    def frame_frost(f):
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
        t = f / (FRAMES - 1)
        # 바늘 열둘 — 길이가 서로 달라야 결정처럼 보인다
        for i in range(12):
            a = i * math.pi / 6 + (0.13 if i % 2 else 0)
            long = 1.0 if i % 2 == 0 else 0.62
            if t < 0.55:                            # 돋는다
                r1 = (8 + t * 40) * long
                spike(px, a, 1, r1, 2.4 * long, blend(F_CORE, F_HOT, t * 1.6), 0.95)
            else:                                   # 부서져 바깥으로 흩어진다
                k = (t - 0.55) / 0.45
                r0 = (8 + 0.55 * 40) * long + k * 16
                spike(px, a, r0, r0 + 7 * long * (1 - k), 1.9 * long * (1 - k * 0.7),
                      blend(F_MID, F_DIM, k), 0.85 * (1 - k))
        if t < 0.5:
            ring(px, 4 + t * 20, 2.2, blend(F_HOT, F_MID, t * 2), 0.7 - t)
            core(px, 6 - t * 9, F_CORE, 1 - t * 1.5)
        return im


    # ---------------------------------------------------------------- 영혼
    S_CORE, S_HOT, S_MID, S_DIM = (246, 238, 255), (206, 168, 255), (150, 100, 224), (86, 54, 136)


    def frame_soul(f):
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
        t = f / (FRAMES - 1)
        # 위로 피어오르는 갈래 다섯 — 아래가 먼저 비고 위가 늦게 흩어진다
        for i in range(5):
            base = -math.pi / 2 + (i - 2) * 0.42
            for s in range(9):
                u = s / 8
                # 갈래마다 다르게 흔들린다 — 연기처럼
                sway = math.sin(u * 3.4 + i * 1.9 + t * 5.2) * (2.2 + u * 5) * (0.3 + t)
                r = (5 + u * 26) * (0.35 + t * 0.9)
                x = C + math.cos(base) * r + sway
                y = C + math.sin(base) * r - t * 9 * u
                rad = (3.1 - u * 2.0) * (1 - t * 0.35)
                col = blend(blend(S_HOT, S_MID, u), S_DIM, t * 0.85)
                a = (0.9 - u * 0.5) * (1 - max(0, t - 0.45) * 1.7)
                for dy in range(-int(rad) - 1, int(rad) + 2):
                    for dx in range(-int(rad) - 1, int(rad) + 2):
                        d = math.hypot(dx, dy)
                        if d <= rad:
                            put(px, int(x + dx), int(y + dy), col, a * (1 - d / (rad + 1)))
        if t < 0.6:
            core(px, 6.5 - t * 8, blend(S_CORE, S_HOT, t * 1.6), 1 - t * 1.3)
            ring(px, 5 + t * 16, 1.8, S_MID, 0.55 - t * 0.8, 1.45)   # 바닥에 퍼지는 낮은 고리
        return im


    SHEETS = [('hit_arcane', frame_arcane), ('hit_frost', frame_frost), ('hit_soul', frame_soul)]


    def main():
        os.makedirs(OUT, exist_ok=True)
        fw = N * S
        W = FRAMES * fw + (FRAMES - 1) * GAP
        for name, fn in SHEETS:
            sheet = Image.new('RGBA', (W, N * S), (0, 0, 0, 0))
            for f in range(FRAMES):
                sheet.paste(fn(f).resize((fw, N * S), Image.NEAREST), (f * (fw + GAP), 0))
            p = os.path.join(OUT, name + '.png')
            sheet.save(p)
            print(f'  {name}.png  {sheet.size[0]}x{sheet.size[1]}  {os.path.getsize(p)}B')


    if __name__ == '__main__':
        main()


# ===== phys — 예전 tools/mkhitphys.py ==============================
def _phys(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkhitphys.py')] + argv
    __name__ = '__main__'
    """물리 타격이 맞는 순간을 굽는다 — 계열 셋 × 평타·치명타, 여섯 장.

      fx/hit_slash.png        64x64 x 6프레임   베기   (검 · 단검 · 낫 · 도끼 · 톱)
      fx/hit_slash_crit.png                     베기 치명타
      fx/hit_pierce.png                         찌르기 (창 · 랜스 · 작살 · 활 · 석궁 · 총)
      fx/hit_pierce_crit.png                    찌르기 치명타
      fx/hit_blunt.png                          둔기   (망치 · 철퇴 · 그 밖의 근접)
      fx/hit_blunt_crit.png                     둔기 치명타

    ■ 왜

      근접 타격에는 맞는 그림이 없었다 — 피해 숫자와 몬스터 색 파편 넷(치명타면
      여덟)이 전부였다. 128의 낫이든 9의 목검이든 화면에서 똑같이 생겼다.

    ■ 방향 C — 두 벌

      치명타를 계열 위에 얹는 한 겹으로 하지 않고, **계열마다 따로 그린다.**
      베기의 치명타는 초승달이 셋으로 갈라지고, 찌르기의 치명타는 뚫고 나가
      반대편에서 터지고, 둔기의 치명타는 고리가 두 겹으로 터진다 — 무기마다
      치명타의 얼굴이 다르다. 그림이 두 배가 되는 대신, 코드는 계열과 crit 으로
      시트 이름을 고르는 것뿐이라 가장 단순하다.

      설계 캔버스(지금은 지움 — git 기록)의 스케치를 그대로 옮겼다.
      스케치가 64x64 viewBox 라 좌표를 그 자리 그대로 쓴다 — 캔버스가 곧 사양이다.

    ■ 규칙 (게임의 다른 시트와 같다)

      64x64 원본으로 그린 뒤 4배 최근접 확대, 프레임 사이 4px 틈.
      manifest.json 의 fx.bursts 가 그 규격으로 잘라 쓴다(scale 4 · gap 4 ·
      frameW/H 64 · count 6).

    ■ 틀 맞춤 — 두 번 굽는다

      처음에는 스케치를 좌표 그대로 옮겼고, 그래서 큰 프레임이 틀을 넘었다.
      둔기 치명타의 바깥 고리는 rx 33(틀은 반지름 32)이고, 파편 하나는 x=0 에
      붙어 있었다. 넘은 자리는 **없어지는 것이 아니라 잘린 단면으로 남는다** —
      고리가 좌우에서 칼로 자른 듯 끊기고, 파편은 반쪽만 보인다.

      그래서 두 번 굽는다. 첫 번째는 **두 배 넓은 버퍼**에 잘리지 않게 그려
      시트가 실제로 얼마나 넓은지 재고, 그 시트에서 가장 넓은 프레임이 틀 안에
      여백 2px 을 남기고 들어가는 배율 하나를 구한다. 두 번째에 그 배율로 다시
      그린다 — 프레임마다 따로 맞추면 애니메이션이 프레임 단위로 커졌다 작아지므로
      **배율은 시트 하나에 하나**, 계열의 평타·치명타가 서로 커 보이지 않도록
      **계열 안에서는 둘 중 더 작은 쪽**으로 맞춘다.

      그림이 줄어든 만큼 화면에서 그리는 크기(data.js 의 HIT_FX size)를 나눠서
      올린다 — 틀에 맞추느라 타격이 작아지면 고친 것이 아니라 바꾼 것이 된다.
      이 스크립트가 그 숫자를 찍어 준다.

    ■ 색

      물리만 금빛을 쓴다 — 이미 있는 마법 다섯(비전·서리·영혼·불·공허)이 전부
      파랑·보라·주황이라, 금빛이면 무엇에 맞았는지 색만으로 갈린다.
      치명타는 거기에 순백을 더한다.

    사용법:  python3 tools/mkhitphys.py
    """
    import math, os
    from PIL import Image

    OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets', 'fx')
    N, S, GAP, FRAMES = 64, 4, 4, 6
    MARGIN = 2              # 틀 안쪽에 반드시 남는 여백(원본 px) — 단면이 안 생기는 최소치

    # 굽는 동안 바뀌는 것: 재는 판(CANV=128)과 내는 판(CANV=64), 그리고 틀 맞춤 배율.
    CANV, CEN, FIT = N, N / 2, 1.0

    W = (255, 246, 224)     # 심지 — 따뜻한 흰빛
    G = (255, 224, 138)     # 금빛 몸통
    D = (216, 169, 75)      # 저무는 금빛
    K = (138, 106, 42)      # 더 저문 것
    A = (106, 98, 90)       # 마지막 재
    P = (255, 255, 255)     # 순백 — 치명타에만


    # ---------------------------------------------------------------- 붓

    def tp(v):
        """스케치 좌표(가운데 32) → 지금 굽는 판의 좌표. FIT<1 이면 가운데로 당겨진다."""
        return CEN + (v - N / 2) * FIT


    def tw(v):
        """굵기·반지름도 같은 배율로 — 위치만 줄이면 획이 굵어져 고리가 도로 틀을 넘는다."""
        return max(v * FIT, 0.5)


    def put(px, x, y, rgb, a):
        """더 밝은(더 진한) 쪽을 남긴다. 겹칠 때 앞의 획이 뒤에 먹히지 않게.
           ★ 판의 좌표를 받는다(tp 를 이미 지난 값). 여기서 또 변환하면 두 번 줄어든다."""
        x, y = int(x), int(y)
        if not (0 <= x < CANV and 0 <= y < CANV) or a <= 0:
            return
        a = min(1.0, a)
        if a * 255 >= px[x, y][3]:
            px[x, y] = (rgb[0], rgb[1], rgb[2], int(a * 255))


    def dot(px, x, y, r, rgb, a):
        """둥근 점 하나 — 모든 획의 단위. 틀 맞춤이 걸리는 곳은 여기 한 군데다
           (bez·line·ell 이 전부 dot 을 거치므로 스케치 좌표를 그대로 넘겨도 된다)."""
        x, y, r = tp(x), tp(y), tw(r)
        rr = int(r) + 2
        for dy in range(-rr, rr + 1):
            for dx in range(-rr, rr + 1):
                d = math.hypot(dx, dy)
                if d <= r:
                    put(px, x + dx, y + dy, rgb, a)
                elif d <= r + 1:                    # 한 겹만 반투명 — 픽셀아트라 더 물리면 흐려진다
                    put(px, x + dx, y + dy, rgb, a * (1 - (d - r)))


    def bez(px, p0, c, p1, sw, rgb, a, taper=True):
        """2차 베지에 획 — SVG 의 `M p0 Q c p1` 과 같다. sw 는 SVG stroke-width.
           taper 면 양 끝이 얇아진다(초승달)."""
        n = int((abs(p1[0] - p0[0]) + abs(p1[1] - p0[1])) * 1.6) + 8
        for i in range(n + 1):
            t = i / n
            u = 1 - t
            x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0]
            y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]
            k = (0.42 + 0.58 * math.sin(t * math.pi) ** 0.55) if taper else 1.0
            dot(px, x, y, sw / 2 * k, rgb, a)


    def line(px, p0, p1, sw, rgb, a):
        n = int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 1.6) + 3
        for i in range(n + 1):
            t = i / n
            dot(px, p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, sw / 2, rgb, a)


    def ell(px, cx, cy, rx, ry, sw, rgb, a):
        """타원 테두리 — 둔기의 눌린 고리."""
        n = int((rx + ry) * 3) + 12
        for i in range(n + 1):
            th = i / n * math.tau
            dot(px, cx + math.cos(th) * rx, cy + math.sin(th) * ry, sw / 2, rgb, a)


    def ellfill(px, cx, cy, rx, ry, rgb, a):
        cx, cy, rx, ry = tp(cx), tp(cy), tw(rx), tw(ry)
        for y in range(int(-ry) - 1, int(ry) + 2):
            for x in range(int(-rx) - 1, int(rx) + 2):
                if (x / max(rx, .1)) ** 2 + (y / max(ry, .1)) ** 2 <= 1:
                    put(px, cx + x, cy + y, rgb, a)


    def box(px, x, y, w, h, rgb, a):
        """네모 파편 — 둔기가 튀겨 낸 덩어리."""
        x, y, w, h = tp(x), tp(y), max(round(w * FIT), 2), max(round(h * FIT), 2)
        for dy in range(int(h)):
            for dx in range(int(w)):
                put(px, x + dx, y + dy, rgb, a)


    def new():
        im = Image.new('RGBA', (CANV, CANV), (0, 0, 0, 0))
        return im, im.load()


    # ---------------------------------------------------------------- 베기 · 평타
    #  엇갈린 두 초승달이 열렸다 얇아진다. 셋 중 가장 빨리 사라진다 —
    #  연타가 겹쳐도 화면이 안 막히도록.

    def f_slash(f):
        im, px = new()
        if f == 0:
            bez(px, (26, 38), (32, 30), (40, 26), 2.5, W, 1)
        elif f == 1:
            bez(px, (17, 45), (32, 28), (47, 19), 8, G, .45)
            bez(px, (17, 45), (32, 28), (47, 19), 4, W, 1)
            bez(px, (24, 20), (30, 28), (34, 38), 2.5, G, 1)
        elif f == 2:
            bez(px, (11, 50), (32, 27), (53, 14), 11, G, .38)
            bez(px, (20, 15), (30, 29), (38, 45), 9, D, .30)
            bez(px, (11, 50), (32, 27), (53, 14), 3.5, W, 1)
            bez(px, (20, 15), (30, 29), (38, 45), 4, G, 1)
            for p0, p1 in [((52, 12), (57, 8)), ((9, 53), (4, 57)), ((40, 47), (44, 52))]:
                line(px, p0, p1, 2, G, 1)
        elif f == 3:
            bez(px, (9, 52), (32, 27), (55, 12), 2, G, .9)
            bez(px, (18, 13), (30, 29), (40, 47), 2.5, D, 1)
            for p0, p1 in [((55, 9), (61, 5)), ((6, 55), (1, 59)), ((42, 50), (47, 56))]:
                line(px, p0, p1, 1.8, G, .85)
        elif f == 4:
            bez(px, (12, 49), (32, 28), (52, 15), 1.4, D, .65)
            bez(px, (21, 17), (30, 29), (38, 43), 1.6, K, .70)
            for p0, p1 in [((57, 7), (61, 4)), ((4, 57), (1, 60))]:
                line(px, p0, p1, 1.4, D, .5)
        else:
            bez(px, (18, 44), (32, 30), (46, 21), 1.4, A, .50)
            bez(px, (25, 23), (30, 30), (35, 39), 1.2, A, .42)
        return im


    # ---------------------------------------------------------------- 베기 · 치명타
    #  초승달이 **셋으로 갈라진다.** 한 번 벤 자리가 세 갈래로 열린다.

    def f_slash_crit(f):
        im, px = new()
        if f == 0:
            bez(px, (24, 40), (32, 30), (42, 24), 5, P, 1)
            dot(px, 32, 32, 4, P, 1)
        elif f == 1:
            bez(px, (14, 48), (32, 26), (50, 16), 12, G, .42)
            bez(px, (14, 48), (32, 26), (50, 16), 5, P, 1)
            bez(px, (10, 42), (30, 22), (46, 12), 3, G, .85)     # 두 번째가 벗겨져 나온다
            bez(px, (22, 18), (30, 30), (36, 44), 3, W, 1)
            dot(px, 32, 32, 5, P, .9)
        elif f == 2:                                             # 마루 — 한 번 벤 자리가 셋으로
            # 갈래 둘은 본 획보다 짧고 얇게, 본 획에 붙여 둔다. 셋을 같은 길이로
            # 그으면 세 번 벤 것처럼 보인다 — 한 번이 갈라진 것이어야 한다.
            bez(px, (8, 52), (32, 26), (56, 12), 14, G, .34)
            bez(px, (8, 52), (32, 26), (56, 12), 4.5, P, 1)
            bez(px, (18, 46), (34, 28), (50, 17), 2.6, G, 1)
            bez(px, (15, 54), (33, 36), (48, 25), 2.6, G, 1)
            bez(px, (18, 12), (30, 30), (40, 50), 3, W, 1)
            for p0, p1 in [((56, 10), (62, 5)), ((6, 54), (1, 59)), ((41, 52), (45, 58))]:
                line(px, p0, p1, 2.2, P, 1)
        elif f == 3:                                             # 갈래가 본 획에서 떨어져 나간다
            bez(px, (5, 55), (32, 25), (59, 9), 3.2, G, .95)
            bez(px, (17, 42), (35, 24), (53, 12), 2.2, G, .9)
            bez(px, (13, 58), (33, 40), (50, 29), 2.2, G, .9)
            bez(px, (16, 9), (30, 30), (42, 54), 2.6, D, 1)
            for p0, p1 in [((59, 6), (63, 2)), ((3, 57), (0, 61)), ((44, 56), (48, 62))]:
                line(px, p0, p1, 1.8, G, .8)
        elif f == 4:
            bez(px, (4, 57), (32, 25), (61, 7), 1.8, D, .75)
            bez(px, (16, 38), (36, 20), (55, 8), 1.5, D, .6)
            bez(px, (11, 61), (33, 43), (52, 32), 1.5, D, .6)
            bez(px, (15, 7), (30, 30), (43, 57), 1.6, K, .75)
        else:
            bez(px, (10, 52), (32, 28), (54, 12), 1.4, A, .5)
            bez(px, (19, 40), (36, 24), (51, 14), 1.2, A, .4)
            bez(px, (16, 57), (33, 42), (49, 32), 1.2, A, .4)
            bez(px, (20, 14), (30, 30), (38, 48), 1.2, A, .42)
        return im


    # ---------------------------------------------------------------- 찌르기 · 평타
    #  앞으로만 뻗는 좁은 다발. 뒤로는 작게 튄다 — "뚫고 들어갔다"가 방향으로 읽히게.

    def f_pierce(f):
        im, px = new()
        if f == 0:
            dot(px, 28, 32, 3, W, 1)
        elif f == 1:
            for p1 in [(46, 25), (47, 32), (46, 39)]:
                line(px, (28, 32), p1, 2.6, W, 1)
            for p1 in [(20, 28), (20, 36)]:
                line(px, (28, 32), p1, 1.8, D, 1)
            dot(px, 28, 32, 3.4, W, 1)
        elif f == 2:
            for p1 in [(58, 20), (60, 32), (58, 44), (50, 15), (50, 49)]:
                line(px, (27, 32), p1, 2.4, G, 1)
            for p1 in [(57, 26), (57, 38)]:
                line(px, (27, 32), p1, 3, W, 1)
            for p1 in [(12, 25), (12, 39)]:
                line(px, (27, 32), p1, 2, D, 1)
            ellfill(px, 27, 32, 5, 7, W, 1)
        elif f == 3:
            for p0, p1 in [((40, 24), (56, 18)), ((42, 32), (60, 32)), ((40, 40), (56, 46)),
                           ((38, 20), (48, 12)), ((38, 44), (48, 52))]:
                line(px, p0, p1, 2.2, G, 1)
            for p0, p1 in [((16, 25), (8, 22)), ((16, 39), (8, 42))]:
                line(px, p0, p1, 1.8, D, .8)
            ellfill(px, 28, 32, 3, 5, G, .8)
        elif f == 4:
            for p0, p1 in [((50, 20), (58, 17)), ((52, 32), (62, 32)), ((50, 44), (58, 47)),
                           ((46, 13), (51, 8)), ((46, 51), (51, 56))]:
                line(px, p0, p1, 1.8, D, .85)
            for p0, p1 in [((10, 21), (5, 19)), ((10, 43), (5, 45))]:
                line(px, p0, p1, 1.5, K, .7)
        else:
            for p0, p1 in [((56, 19), (60, 18)), ((57, 32), (62, 32)), ((56, 45), (60, 46))]:
                line(px, p0, p1, 1.4, A, .55)
        return im


    # ---------------------------------------------------------------- 찌르기 · 치명타
    #  **뚫고 나간다.** 다발이 앞을 관통해 반대편에서 한 번 더 터진다.
    #  평타가 "박혔다"면 이쪽은 "나왔다" — 방향이 두 번 읽힌다.

    def f_pierce_crit(f):
        im, px = new()
        if f == 0:
            dot(px, 26, 32, 4.5, P, 1)
            line(px, (26, 32), (40, 32), 4, P, 1)
        elif f == 1:
            for p1 in [(50, 24), (52, 32), (50, 40)]:
                line(px, (25, 32), p1, 3.4, P, 1)
            for p1 in [(46, 18), (46, 46)]:
                line(px, (25, 32), p1, 2.4, G, 1)
            for p1 in [(14, 26), (14, 38)]:
                line(px, (25, 32), p1, 2.2, D, 1)
            ellfill(px, 25, 32, 5, 7, P, 1)
        elif f == 2:                                   # 마루 — 앞을 뚫고 나가 반대편에서 터진다
            for p1 in [(64, 18), (64, 32), (64, 46), (56, 8), (56, 56)]:
                line(px, (24, 32), p1, 2.6, G, 1)
            for p1 in [(64, 26), (64, 38)]:
                line(px, (24, 32), p1, 3.6, P, 1)
            for p1 in [(6, 22), (6, 42), (12, 14), (12, 50)]:
                line(px, (24, 32), p1, 2.2, D, 1)
            # 나온 자리 — 세로로 선 한 줄. 틀 안쪽에 둔다(가장자리에 붙이면 반이 잘려
            # 무엇이 터진 건지 안 보인다).
            line(px, (48, 12), (48, 52), 4, P, .95)
            for p0, p1 in [((48, 16), (56, 9)), ((48, 48), (56, 55)),
                           ((48, 24), (60, 21)), ((48, 40), (60, 43))]:
                line(px, p0, p1, 2.4, G, 1)
            ellfill(px, 24, 32, 6, 9, P, 1)
        elif f == 3:                                   # 나온 자리가 벌어지고 안쪽은 얇아진다
            for p0, p1 in [((38, 24), (58, 14)), ((40, 32), (62, 32)), ((38, 40), (58, 50))]:
                line(px, p0, p1, 2.4, G, 1)
            line(px, (51, 8), (51, 56), 2.8, G, .95)
            for p0, p1 in [((51, 12), (59, 5)), ((51, 52), (59, 59)),
                           ((51, 21), (62, 17)), ((51, 43), (62, 47))]:
                line(px, p0, p1, 2, G, .9)
            for p0, p1 in [((14, 24), (4, 19)), ((14, 40), (4, 45))]:
                line(px, p0, p1, 1.8, D, .8)
            ellfill(px, 26, 32, 3, 5, G, .75)
        elif f == 4:
            line(px, (54, 10), (54, 54), 1.8, D, .8)
            for p0, p1 in [((54, 14), (61, 7)), ((54, 50), (61, 57)),
                           ((54, 22), (63, 18)), ((54, 42), (63, 46))]:
                line(px, p0, p1, 1.6, D, .75)
            for p0, p1 in [((10, 20), (3, 16)), ((10, 44), (3, 48))]:
                line(px, p0, p1, 1.4, K, .65)
        else:
            line(px, (57, 16), (57, 48), 1.4, A, .5)
            for p0, p1 in [((57, 19), (62, 15)), ((57, 45), (62, 49))]:
                line(px, p0, p1, 1.2, A, .42)
        return im


    # ---------------------------------------------------------------- 둔기 · 평타
    #  납작하게 눌린 고리와 덩어리 파편. 셋 중 가장 크고 가장 늦게까지 남는다 —
    #  무게가 시간으로 읽히게.

    def f_blunt(f):
        im, px = new()
        if f == 0:
            ell(px, 32, 34, 8, 4, 3, W, 1)
        elif f == 1:
            ell(px, 32, 34, 18, 7, 4, W, 1)
            ell(px, 32, 34, 9, 4, 2, G, 1)
            box(px, 14, 24, 4, 4, D, 1); box(px, 46, 26, 5, 4, D, 1)
        elif f == 2:
            ell(px, 32, 34, 27, 11, 4.5, W, 1)
            ell(px, 32, 34, 16, 6.5, 2.6, G, 1)
            box(px, 6, 18, 5, 5, G, 1); box(px, 52, 20, 6, 5, G, 1)
            box(px, 18, 12, 4, 4, D, 1); box(px, 42, 14, 5, 4, D, 1); box(px, 30, 9, 4, 4, D, 1)
        elif f == 3:
            ell(px, 32, 34, 31, 13, 2.4, G, 1)
            ell(px, 32, 34, 20, 8, 1.8, D, .8)
            box(px, 2, 12, 5, 5, G, .9); box(px, 56, 14, 5, 5, G, .9)
            box(px, 16, 5, 4, 4, D, .85); box(px, 44, 7, 4, 4, D, .85)
        elif f == 4:
            ell(px, 32, 36, 30, 9, 1.6, K, .8)
            ellfill(px, 32, 38, 20, 6, A, .35)
            box(px, 4, 20, 4, 4, K, .7); box(px, 56, 22, 4, 4, K, .7)
        else:
            ellfill(px, 32, 39, 24, 7, A, .28)
            ellfill(px, 32, 40, 13, 4, A, .22)
        return im


    # ---------------------------------------------------------------- 둔기 · 치명타
    #  **고리가 두 겹으로 터진다.** 평타가 한 겹으로 눌린다면 이쪽은 두 겹이
    #  시차를 두고 나간다 — 한 번 친 것이 두 번 울린 것처럼.

    def f_blunt_crit(f):
        im, px = new()
        if f == 0:
            ell(px, 32, 34, 9, 4, 4, P, 1)
            ell(px, 32, 34, 4, 2, 2.4, P, 1)
        elif f == 1:
            ell(px, 32, 34, 20, 8, 4.5, P, 1)
            ell(px, 32, 34, 10, 4.5, 3, G, 1)
            box(px, 10, 20, 5, 5, G, 1); box(px, 48, 22, 5, 5, G, 1)
            box(px, 29, 14, 4, 4, P, 1)
        elif f == 2:                                   # 마루 — 세 겹이 한 번에 보인다
            ell(px, 32, 34, 29, 12, 4, P, 1)
            ell(px, 32, 34, 19, 8, 3, G, 1)
            ell(px, 32, 34, 9, 4, 2.4, W, 1)
            box(px, 3, 14, 6, 6, G, 1); box(px, 55, 16, 6, 6, G, 1)
            box(px, 29, 6, 5, 5, W, 1)
            box(px, 15, 8, 4, 4, G, 1); box(px, 45, 10, 4, 4, G, 1)
        elif f == 3:                                   # 바깥 고리는 틀을 넘고 안쪽이 그 자리로
            ell(px, 32, 34, 33, 15, 2.2, G, .9)
            ell(px, 32, 34, 24, 10, 3, G, 1)
            ell(px, 32, 34, 13, 5.5, 2, D, .85)
            box(px, 0, 8, 5, 5, G, .95); box(px, 58, 10, 5, 5, G, .95)
            box(px, 29, 1, 4, 4, G, .9)
            box(px, 12, 3, 4, 4, D, .8); box(px, 48, 5, 4, 4, D, .8)
        elif f == 4:
            ell(px, 32, 35, 31, 12, 1.8, D, .8)
            ell(px, 32, 36, 20, 8, 1.6, K, .8)
            ellfill(px, 32, 39, 18, 5, A, .3)
            box(px, 2, 16, 4, 4, D, .7); box(px, 58, 18, 4, 4, D, .7)
            box(px, 14, 10, 3, 3, K, .6); box(px, 47, 12, 3, 3, K, .6)
        else:
            ellfill(px, 32, 39, 27, 8, A, .28)
            ellfill(px, 32, 41, 15, 4, A, .22)
            box(px, 5, 24, 3, 3, A, .4); box(px, 56, 26, 3, 3, A, .4)
        return im


    # 계열 = 평타·치명타 한 쌍. 화면에서 그리는 크기(HIT_FX size)를 한 쌍이 같이 쓰므로
    # 틀 맞춤 배율도 쌍으로 하나여야 한다 — 따로 맞추면 치명타가 평타보다 작아진다.
    FAMS = [
        ('slash', 46, [('hit_slash', f_slash), ('hit_slash_crit', f_slash_crit)]),
        ('pierce', 44, [('hit_pierce', f_pierce), ('hit_pierce_crit', f_pierce_crit)]),
        ('blunt', 60, [('hit_blunt', f_blunt), ('hit_blunt_crit', f_blunt_crit)]),
    ]


    def measure(fn):
        """첫 번째 굽기 — 두 배 판에 잘리지 않게 그려, 가운데에서 가장 먼 픽셀을 잰다."""
        nonlocal CANV, CEN, FIT
        CANV, CEN, FIT = N * 2, N, 1.0
        far = 0.0
        for f in range(FRAMES):
            bb = fn(f).getbbox()
            if not bb:
                continue
            l, t, r, b = bb
            far = max(far, CEN - l, (r - 1) - CEN, CEN - t, (b - 1) - CEN)
        return far


    def main():
        os.makedirs(OUT, exist_ok=True)
        nonlocal CANV, CEN, FIT
        fw = N * S
        sw = FRAMES * fw + (FRAMES - 1) * GAP
        # 가운데 픽셀은 32번 칸이므로 오른쪽·아래로 남는 칸은 31개다 —
        # 여백 MARGIN 을 양쪽에 두려면 가운데에서 31-MARGIN 까지만 써야 한다.
        lim = N / 2 - 1 - MARGIN
        for fam, size, sheets in FAMS:
            far = max(measure(fn) for _, fn in sheets)
            k = min(1.0, lim / far) if far > 0 else 1.0
            print('  %-7s 가장 먼 픽셀 %.1f / 틀 %.0f → 배율 %.3f · HIT_FX size %d → %d'
                  % (fam, far, lim, k, size, round(size / k)))
            for name, fn in sheets:
                CANV, CEN, FIT = N, N / 2, k
                sheet = Image.new('RGBA', (sw, N * S), (0, 0, 0, 0))
                gap = N                      # 여섯 프레임 중 여백이 가장 좁은 곳
                for f in range(FRAMES):
                    im = fn(f)
                    bb = im.getbbox()
                    if bb:
                        gap = min(gap, bb[0], bb[1], N - bb[2], N - bb[3])
                    sheet.paste(im.resize((fw, N * S), Image.NEAREST), (f * (fw + GAP), 0))
                p = os.path.join(OUT, name + '.png')
                sheet.save(p)
                print('    %-18s %dx%d  %6dB  가장 좁은 여백 %dpx%s'
                      % (name + '.png', sheet.size[0], sheet.size[1], os.path.getsize(p),
                         gap, '' if gap >= MARGIN else '  ← 아직 붙는다'))
        return 0


    if __name__ == '__main__':
        raise SystemExit(main())


# ===== smoke — 예전 tools/mksmoke.py ==============================
def _smoke(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mksmoke.py')] + argv
    __name__ = '__main__'
    """용광로 굴뚝에서 오르는 검은 연기를 굽는다.

      fx/smoke_forge.png   16x16 x 6프레임

    ■ 왜

      용광로는 불구멍이 깜빡이는 것 말고는 아무 일도 안 하고 있었다. 쇠를 녹이는
      물건인데 굴뚝이 조용하다. 굴뚝은 세 레벨 다 같은 자리에 있다(논리 x 9~21,
      가운데 15 · 꼭대기 y 6).

    ■ 규칙 (게임의 다른 이펙트 시트와 같다)

      16x16 원본으로 그린 뒤 4배 최근접 확대, 프레임 사이 4px 틈.
      manifest.json 의 fx.smoke 가 그 규격으로 잘라 쓴다(scale 4 · gap 4 ·
      frameW/H 16 · count 6).

    ■ 여섯 장이 하는 일

      한 덩이가 **살아 있는 동안 여섯 장을 차례로 지난다.** 그래서 올라가는 내내
      모양이 바뀐다 — 같은 그림이 커지기만 하는 게 아니다.

        1  갓 나온 것. 작고 빽빽하다
        2  부풀기 시작. 위쪽이 먼저 부푼다
        3  두 덩이로 갈라진다
        4  세 덩이. 가운데가 얇아진다
        5  가운데가 뚫린다. 가장자리가 헤진다
        6  가닥만 남는다

    ■ 색

      진짜 검정(#000)은 동굴 배경에서 안 보이고 하늘에서는 구멍처럼 보인다.
      따뜻한 진회색 세 단계를 쓴다 — 하늘에서는 어둡게, 바위 앞에서는 밝게 읽힌다.

    사용법:  python3 tools/mksmoke.py
    """
    import math, os, random
    from PIL import Image

    OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets', 'fx')
    N, S, GAP, FRAMES = 16, 4, 4, 6
    C = N / 2 - 0.5

    CORE = (0x17, 0x14, 0x12)     # 가장 빽빽한 속 — 거의 검다
    MID = (0x2c, 0x27, 0x22)      # 몸통
    RIM = (0x6e, 0x64, 0x57)      # 가장자리 — 여기가 배경과 갈라지는 선이다.
                                  # 속만 검게 두면 어두운 바위 앞에서 통째로 사라진다


    def rnd(v):
        """파이썬 round() 는 .5 를 **짝수 쪽으로** 보낸다(6.5→6, 7.5→8, 8.5→8).
           가운데가 7.5 인 16칸 격자에서는 그 탓에 열이 통째로 빠져 덩이에 구멍이 났다.
           .5 는 늘 위로 올린다."""
        return int(math.floor(v + 0.5))


    def put(px, x, y, rgb, a):
        if not (0 <= x < N and 0 <= y < N) or a <= 0:
            return
        a = min(1.0, a)
        old = px[x, y]
        if a * 255 > old[3]:
            px[x, y] = (rgb[0], rgb[1], rgb[2], int(a * 255))


    def lobe(px, cx, cy, r, alpha, hollow=0.0):
        """둥근 덩이 하나 — 속을 꽉 채우고 가장자리 한 겹만 밝게.
           hollow>0 이면 가운데부터 비어 간다(마지막 두 장에서 쓴다)."""
        rr = int(r + 2)
        for y in range(-rr, rr + 1):
            for x in range(-rr, rr + 1):
                d = math.hypot(x, y)
                if d > r:
                    continue
                edge = d > r - 1.1
                a = alpha * (0.9 if edge else 1.0)
                if hollow > 0 and d < r * hollow:
                    a *= max(0.0, (d / (r * hollow)) ** 1.6)
                rgb = RIM if edge else (MID if d > r * 0.5 else CORE)
                put(px, rnd(C + cx + x), rnd(C + cy + y), rgb, a)


    def frame(i):
        """i번째(0~5) 프레임 하나."""
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        px = im.load()
        rng = random.Random(1000 + i)          # 판마다 같은 그림이 나오도록 고정 시드
        t = i / (FRAMES - 1.0)                 # 0 → 1

        if i == 0:
            lobe(px, 0, 1.5, 2.6, 0.95)
        elif i == 1:
            lobe(px, 0, 0.8, 3.4, 0.92)
            lobe(px, -0.8, -1.6, 2.1, 0.8)
        elif i == 2:
            lobe(px, -1.4, 0.4, 3.2, 0.88)
            lobe(px, 1.8, -0.8, 2.8, 0.85)
        elif i == 3:
            lobe(px, -2.2, 0.8, 3.0, 0.8)
            lobe(px, 1.6, -1.4, 3.2, 0.82)
            lobe(px, 2.6, 2.0, 2.2, 0.7)
        elif i == 4:
            lobe(px, -3.0, 0.6, 2.8, 0.62, hollow=0.5)
            lobe(px, 1.2, -2.4, 2.6, 0.6, hollow=0.5)
            lobe(px, 2.8, 2.2, 2.4, 0.55, hollow=0.5)
            # 헤진 가닥
            for _ in range(5):
                a = rng.uniform(0, math.tau)
                d = rng.uniform(4.5, 6.4)
                put(px, rnd(C + math.cos(a) * d), rnd(C + math.sin(a) * d), RIM, 0.45)
        else:
            for _ in range(14):
                a = rng.uniform(0, math.tau)
                d = rng.uniform(3.4, 6.8)
                put(px, rnd(C + math.cos(a) * d), rnd(C + math.sin(a) * d), RIM, 0.34)
            lobe(px, -1.0, -1.0, 2.0, 0.26, hollow=0.85)
        return im


    def main():
        os.makedirs(OUT, exist_ok=True)
        W = FRAMES * N * S + (FRAMES - 1) * GAP
        sheet = Image.new('RGBA', (W, N * S), (0, 0, 0, 0))
        for i in range(FRAMES):
            big = frame(i).resize((N * S, N * S), Image.NEAREST)
            sheet.paste(big, (i * (N * S + GAP), 0))
        p = os.path.normpath(os.path.join(OUT, 'smoke_forge.png'))
        sheet.save(p)
        print('%s  %dx%d  (%d프레임 · %dx%d · %d배 · 틈 %d)'
              % (p, W, N * S, FRAMES, N, N, S, GAP))
        return 0


    if __name__ == '__main__':
        raise SystemExit(main())


# ===== star — 예전 tools/mkstarfx.py ==============================
def _star(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'mkstarfx.py')] + argv
    __name__ = '__main__'
    """별 조각 애셋을 굽는다 — 궤도를 도는 조각 하나와, 얻는 순간 / 다섯이 하나가 되는 순간.

      fx/proj_starfrag.png   16x16 x 4프레임   곁을 도는 조각 (천천히 반짝인다)
      fx/star_gain.png       64x64 x 6프레임   조각 하나를 얻었다
      fx/star_merge.png      64x64 x 6프레임   다섯이 한 점으로 모여 하나가 된다

    게임의 다른 시트와 같은 규칙이다 — 원본 해상도로 그린 뒤 4배로 최근접 확대하고,
    프레임 사이에 4px 틈을 둔다(src/game/sprites.ts 의 drawFx 가 그 간격으로 잘라 쓴다).
    그래서 여기서 값을 바꾸고 다시 돌리면 게임 쪽은 손댈 것이 없다.

    색은 이야기에서 가져왔다. 별은 "잠들면 꿈을 꾸고, 그 꿈이 잿빛을 만든다" — 그래서
    조각은 따뜻한 금빛이고, 그 둘레는 잿빛으로 식어 간다. 순수한 흰색은 심지에만 쓴다.
    """
    import math, os
    from PIL import Image

    OUT = os.path.join(os.path.dirname(__file__), '..', 'play', 'assets', 'fx')
    S, GAP = 4, 4                       # 4배로 굽고, 프레임 사이 4px

    CORE  = (255, 250, 235)             # 심지 — 거의 흰색이지만 아주 살짝 따뜻하다
    HOT   = (255, 240, 190)
    GOLD  = (255, 214, 122)
    AMBER = (226, 160, 70)
    ASH   = (176, 158, 132)             # 식어 가는 가장자리. 잿빛과 같은 계열이다


    def blend(a, b, t):
        t = max(0.0, min(1.0, t))
        return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


    def shard(px, n, cx, cy, arm, thick, rot, alpha=1.0, tail=1.0):
        """네 갈래 별 — 세로로 길고 가로로 짧다. rot 만큼 기울여 그린다.

        수학으로 그리는 이유: 16px 안에서 손으로 찍으면 프레임마다 각이 튀는데,
        거리장으로 그리면 아주 조금씩 도는 것이 자연스럽게 이어진다."""
        ca, sa = math.cos(rot), math.sin(rot)
        for y in range(n):
            for x in range(n):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                # 별의 축으로 좌표를 돌린다
                u = dx * ca + dy * sa
                v = -dx * sa + dy * ca
                v *= 1.0 / max(tail, 0.001)      # tail<1 이면 세로로 더 길어진다
                d = math.hypot(u, v)
                if d > arm:
                    continue
                # 네 갈래: 축에 가까울수록 멀리 뻗는다
                ang = math.atan2(v, u)
                spike = abs(math.cos(2 * ang)) ** 3
                reach = thick + (arm - thick) * spike
                if d > reach:
                    continue
                k = 1.0 - d / max(reach, 0.001)       # 0(끝) ~ 1(심지)
                if k > 0.80:   col, a = CORE, 1.0
                elif k > 0.55: col, a = HOT, 1.0
                elif k > 0.30: col, a = GOLD, 0.95
                elif k > 0.14: col, a = AMBER, 0.80
                else:          col, a = blend(AMBER, ASH, 0.5), 0.45
                a *= alpha
                if a <= 0.02:
                    continue
                old = px[x, y]
                na = min(255, int(old[3] + a * 255))
                px[x, y] = (col[0], col[1], col[2], na)


    def ring(px, n, cx, cy, r, w, col, alpha):
        """퍼져 나가는 고리 — 얇을수록 빠르게 지나간 것처럼 보인다"""
        for y in range(n):
            for x in range(n):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                k = 1.0 - abs(d - r) / max(w, 0.001)
                if k <= 0:
                    continue
                a = alpha * (k ** 1.5)
                if a <= 0.02:
                    continue
                old = px[x, y]
                px[x, y] = (col[0], col[1], col[2], min(255, int(old[3] + a * 255)))


    def mote(px, n, x0, y0, r, col, alpha):
        """작은 티끌 하나"""
        for y in range(max(0, int(y0 - r - 1)), min(n, int(y0 + r + 2))):
            for x in range(max(0, int(x0 - r - 1)), min(n, int(x0 + r + 2))):
                d = math.hypot(x + 0.5 - x0, y + 0.5 - y0)
                k = 1.0 - d / max(r, 0.001)
                if k <= 0:
                    continue
                a = alpha * k
                old = px[x, y]
                px[x, y] = (col[0], col[1], col[2], min(255, int(old[3] + a * 255)))


    def sheet(frames, n, name):
        """프레임들을 4배로 키워 한 줄로 잇는다"""
        w = len(frames) * (n * S + GAP)
        im = Image.new('RGBA', (w, n * S), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            im.paste(f.resize((n * S, n * S), Image.NEAREST), (i * (n * S + GAP), 0))
        os.makedirs(OUT, exist_ok=True)
        path = os.path.join(OUT, name)
        im.save(path)
        print(f'  {name}  {im.width}x{im.height}  ({len(frames)}프레임)')


    def make_frag():
        """곁을 도는 조각 — 아주 천천히 돌며 숨 쉬듯 커졌다 작아진다.
        네 프레임을 반복해서 쓰므로 처음과 끝이 이어져야 한다."""
        n, frames = 16, []
        for i in range(4):
            img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
            px = img.load()
            # ★ 돌리지 않고 **반짝이게** 한다.
            #   처음에는 프레임마다 22.5도씩 돌렸는데, 16px 격자에서 22.5도와 67.5도는
            #   팔이 계단으로 깨져서 네 갈래가 다섯 갈래처럼 보였다. 격자에 깨끗하게
            #   떨어지는 각은 0도와 45도뿐이라 그 둘만 오간다. 크기와 심지 밝기가 같이
            #   숨 쉬어서, 도는 대신 "빛을 받아 반짝이는 것"으로 읽힌다.
            rot = (math.pi / 4) if i % 2 else 0.0
            arm = (7.3, 5.6, 6.5, 4.9)[i]
            shard(px, n, n / 2, n / 2, arm, 1.5, rot)
            # 심지에 흰 점 하나 — 작아도 "빛나는 것"으로 읽히게 한다
            mote(px, n, n / 2, n / 2, 1.0 + 0.5 * (arm - 4.9) / 2.4, CORE, 0.9)
            frames.append(img)
        sheet(frames, n, 'proj_starfrag.png')


    def make_gain():
        """조각 하나를 얻었다 — 티끌이 안으로 모여들고, 조각이 맺히고, 고리가 한 번 퍼진다.
        폭죽이 아니다. 여섯 프레임 안에서 조용히 끝난다."""
        n, frames = 64, []
        c = n / 2
        for i in range(6):
            t = i / 5.0
            img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
            px = img.load()
            # ① 바깥에서 모여드는 티끌 (앞 세 프레임)
            if t < 0.62:
                k = 1.0 - t / 0.62
                for m in range(8):
                    a = m * math.tau / 8 + t * 1.1
                    d = 8 + k * 20
                    mote(px, n, c + math.cos(a) * d, c + math.sin(a) * d * 0.85,
                         1.0 + k * 0.8, blend(GOLD, ASH, 0.35), 0.30 + 0.45 * k)
            # ② 맺히는 조각 — 커졌다가 제 크기로 내려앉는다
            grow = min(1.0, t / 0.45)
            settle = 1.0 + 0.55 * math.sin(min(1.0, t / 0.7) * math.pi)
            shard(px, n, c, c, (5 + 12 * grow) * settle, 2.2 + 2.0 * grow,
                  t * 0.9, alpha=min(1.0, 0.35 + t * 1.4), tail=0.8)
            # ③ 한 번만 퍼지는 고리
            if t > 0.3:
                k = (t - 0.3) / 0.7
                ring(px, n, c, c, 6 + k * 22, 3.0 - k * 1.8, HOT, 0.55 * (1 - k))
            frames.append(img)
        sheet(frames, n, 'star_gain.png')


    def make_merge():
        """다섯이 하나가 된다 — 다섯 갈래가 한 점으로 빨려 들고, 터지고, 큰 별이 남는다.
        5장 outro 와 같은 사건이라 이것 하나만 크게 잡았다."""
        n, frames = 64, []
        c = n / 2
        for i in range(6):
            t = i / 5.0
            img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
            px = img.load()
            # ① 다섯 조각이 안으로 (앞 절반)
            if t < 0.55:
                k = 1.0 - t / 0.55
                for m in range(5):
                    a = m * math.tau / 5 - math.pi / 2 + t * 0.8
                    d = 4 + k * 24
                    shard(px, n, c + math.cos(a) * d, c + math.sin(a) * d,
                          3.4 + k * 1.6, 1.2, a + math.pi / 2, alpha=0.55 + 0.45 * (1 - k))
            # ② 터지는 순간 — 가운데가 하얗게 찬다
            if 0.35 < t < 0.75:
                k = 1 - abs(t - 0.55) / 0.20
                mote(px, n, c, c, 6 + 12 * k, CORE, 0.85 * k)
            # ③ 남는 큰 별 (뒤 절반)
            if t > 0.35:
                k = (t - 0.35) / 0.65
                shard(px, n, c, c, 10 + 18 * k, 2.4 + 1.2 * k, t * 0.6,
                      alpha=min(1.0, 0.5 + k), tail=0.9)
                ring(px, n, c, c, 8 + k * 26, 3.4 - k * 2.2, GOLD, 0.6 * (1 - k))
                # 사방으로 흩어지는 잔티끌
                for m in range(10):
                    a = m * math.tau / 10 + 0.3
                    d = 10 + k * 22
                    mote(px, n, c + math.cos(a) * d, c + math.sin(a) * d,
                         1.4 * (1 - k * 0.6), HOT, 0.55 * (1 - k))
            frames.append(img)
        sheet(frames, n, 'star_merge.png')


    if __name__ == '__main__':
        print('별 조각 애셋을 굽는다 —')
        make_frag()
        make_gain()
        make_merge()
        print('끝. assets/manifest.json 의 fx 항목과 짝이 맞아야 한다.')


CMDS = {'hit': _hit, 'phys': _phys, 'smoke': _smoke, 'star': _star}

if __name__ == '__main__':
    a = sys.argv[1:] or 'all'.split()
    if not a or (a[0] not in CMDS and a[0] != 'all'):
        sys.exit('쓰기: python3 tools/mkfx.py <' + '|'.join(list(CMDS) + ['all']) + '> [인자…]')
    if a[0] == 'all':   # 하위 명령이 raise SystemExit(0) 으로 끝나도 다음 것을 이어 돈다
        for f in CMDS.values():
            try: f([])
            except SystemExit as e:
                if e.code not in (None, 0): raise
    else:
        CMDS[a[0]](a[1:])
