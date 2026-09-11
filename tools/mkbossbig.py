#!/usr/bin/env python3
"""5페이즈 보스 다섯 — **원본 그림 그대로, 크기만 2배로** 키운다.

■ 두 번 틀리고 나서 정한 것

  1. 절차 도형으로 새로 그렸다 → 그림이 통째로 퇴화했다. 손그림(가시 달린
     공허별 · 리벳 박힌 놋쇠 기계 · 후광 두른 마네킹 · 청록 마디가 박힌 궤도 ·
     용암 금이 간 바위 입)을 평평한 타원과 네모로 갈아치운 셈이었다.
  2. 원본을 살리고 둘레에 부속(기둥 · 바위 · 후광 · 궤도)을 덧붙였다 → 그래도
     덧댄 티가 났다. 원본이 아닌 것이 화면에 늘어난 만큼 그림이 묽어진다.

  그래서 아무것도 안 그린다. **원본을 그대로 두고 크기만 바꾼다.**

■ 왜 정확히 2배인가

  픽셀 그림은 정수배로만 깨끗하게 커진다. 1.35배 같은 값으로 최근접 확대를
  하면 어떤 픽셀은 2칸이 되고 어떤 픽셀은 1칸으로 남아 격자가 들쭉날쭉해진다 —
  선이 울고 글자처럼 또렷하던 자리가 죽이 된다.

  2배면 원본 픽셀 하나가 정확히 2x2 블록이 된다. 한 점도 안 잃는다.

  다만 **그 2x2 블록 자체가 뭉개짐이다** — 대각선이 두 칸짜리 계단이 되고
  둥근 것이 팔각형이 된다. 그래서 최근접으로 끝내지 않고 Scale2x(EPX)로 늘린다.
  이건 픽셀 그림 전용 확대라 **원본에 있는 색만** 쓰고, 이웃 넷을 보고 2x2 의
  네 귀를 따로 정해 계단을 모서리로 푼다. 없던 색을 섞지 않으므로 덧그린 것이
  아니라 '원본이 그 해상도로 그려졌다면 이랬을 모양' 이 된다.
  원형의 후광이 팔각형에서 둥근 고리로 돌아오는 것이 그 차이다.

      별을 쫓아온 것  102x107 → 204x214
      갱을 메운 것     92x84  → 184x168
      헤파            94x113 → 188x226
      원형            96x116 → 192x232
      환원기         118x132 → 236x264

■ 마디 다섯에 그림 세 벌 — 그리고 환원기

  원본이 3페이즈 × idle 2 = 여섯 칸이므로 벌은 셋뿐이다. 다섯 마디를 세 벌에
  편다(0 0 1 1 2).

  그런데 환원기는 그 세 벌조차 거의 같다. 재 보면 구조가 한 번도 안 바뀐다 —
  고리 셋(r≈25·35·44)도 세로 축도 그대로고, 바뀌는 것은 가운데 핵과 작은
  마디 점이 몇 픽셀 도는 것뿐이다. 픽셀 차이는 13~20%로 잡히지만 그 전부가
  흩어진 점이라 눈에는 안 잡힌다.

  그래서 환원기만 **고리를 끊는다**(CUT). 새 픽셀은 한 점도 안 그리고 각도
  구간의 알파를 0 으로 지우기만 한다 — 덧댄 티가 날 여지가 없다. 마디가
  오를수록 바깥 고리부터 조각나고, 마지막에는 핵과 축만 온전하다.

  끊는 자리는 대각선(45·135·225·315도)이다. 세로 축과 좌우 마디는 이 그림의
  뼈대라 건드리면 다른 물건이 된다.

사용법:  python3 tools/mkbossbig.py && node tools/sync-manifest.mjs
"""
import os

from PIL import Image


def scale2x(im):
    """EPX/Scale2x. 이웃 넷(위·아래·좌·우)을 보고 2x2 의 네 귀를 따로 정한다.
       마주 보는 두 이웃이 같고 그 직각 이웃들과는 다르면 그 귀를 이웃 색으로
       깎는다 — 그게 계단을 모서리로 만든다. 새 색은 한 번도 안 만든다."""
    w, h = im.size
    p = im.load()
    out = Image.new('RGBA', (w * 2, h * 2))
    q = out.load()

    def g(x, y):
        return p[min(max(x, 0), w - 1), min(max(y, 0), h - 1)]

    for y in range(h):
        for x in range(w):
            P, B, D = g(x, y), g(x, y - 1), g(x - 1, y)
            F, H = g(x + 1, y), g(x, y + 1)
            q[x * 2, y * 2] = D if (D == B and D != H and B != F) else P
            q[x * 2 + 1, y * 2] = F if (B == F and B != D and F != H) else P
            q[x * 2, y * 2 + 1] = D if (H == D and H != F and D != B) else P
            q[x * 2 + 1, y * 2 + 1] = F if (F == H and F != B and H != D) else P
    return out

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'game', 'assets', 'boss')
SRC = os.path.join(OUT, '_src')          # 손대지 않은 원본. 여기서만 읽는다
S = 4                                    # 시트는 4배로 구워져 있다
UP = 2                                   # 정수배만 — 아래 머리말 참고
PHASES = 5
FRAMES = PHASES * 2
SRC_PH = [0, 0, 1, 1, 2]                 # 마디 → 원본의 어느 벌
# 한 벌을 이루는 원본 칸 두 장. 보통은 (0,1) (2,3) (4,5) 이다.
#   ★ 별을 쫓아온 것만 칸이 일곱이고 **뒤 두 칸이 idle 이 아니라 무너지는
#     그림**이다(별이 납작해진다). 세 번째 벌을 (4,5) 로 잡으면 숨쉬기 두 칸
#     사이에서 별이 접혔다 펴졌다 한다 — 실제로 마지막 마디에서 그렇게 떨고
#     있었다(두 칸 차이 91%). 성한 칸 다섯 중 뒤 둘로 벌을 짓는다.
SRC_PAIR = {'pursuer': [(0, 1), (2, 3), (3, 4)]}
DEF_PAIR = [(0, 1), (2, 3), (4, 5)]

# 원본 프레임 크기
SRC_SIZE = {
    'pursuer': (102, 107), 'shaft_maw': (92, 84), 'hepha': (94, 113),
    'archetype': (96, 116), 'restorer': (118, 132),
}
# ★ 원본 시트의 칸 **간격**(장치 픽셀). 다섯이 다 같지 않다 —
#   별을 쫓아온 것만 7칸에 간격 4 이고 나머지 넷은 6칸에 간격 0 이다.
#   (파일 폭으로 검산: 2880 = 7*102*4 + 6*4 · 2256 = 6*94*4)
#   전부 간격 0 으로 자르면 두 번째 칸부터 4px 씩 밀려 옆 칸을 물고 잘린다.
#   실제로 그렇게 굽혀서 별을 쫓아온 것 하나만 그림이 어긋나 있었다.
SRC_GAP = {'pursuer': 4}                 # 적지 않은 것은 0
# 판정 상자는 원본 ENEMIES 값을 그대로 2배 한다 — 크기만 바꾸는 것이므로
# 그림과 판정의 비율이 달라지면 안 된다
SRC_HIT = {
    'pursuer': (86, 96), 'shaft_maw': (92, 84), 'hepha': (86, 108),
    'archetype': (96, 116), 'restorer': (118, 132),
}

# 환원기만 — 마디마다 끊어 내는 고리. (가운데 x,y) 와 마디별 [(안반지름, 바깥반지름,
# 끊는 폭(도)), ...]. 끊는 자리는 늘 대각선 넷이다.
CUT_CENTER = {'restorer': (59, 66)}
CUT = {
    'restorer': [
        [],                                   # ph0 온전하다
        [(41, 53, 40)],                       # ph1 바깥 고리가 벌어진다
        [(41, 53, 56), (32, 40, 34)],         # ph2 가운데 고리도
        [(41, 53, 72), (32, 40, 52), (22, 31, 24)],   # ph3 조각으로 돈다
        [(41, 53, 86), (32, 40, 70), (22, 31, 44)],   # ph4 핵과 축만 온전하다
    ],
}
CUT_AT = (45, 135, 225, 315)                  # 세로 축·좌우 마디는 안 건드린다

# 원형·헤파도 원본 세 벌 차이가 3~6% 뿐이다(밝기만 오르고 실루엣이 한 번도 안
# 바뀐다). 여기도 **지우기만** 한다 — 껍데기가 마디마다 떨어져 나간다.
# 좌표는 원본 논리 픽셀에서 직접 재서 집었다.
#
# ■ 한 마디에 한 덩어리
#   처음에는 "조금씩 벗겨진다" 는 생각으로 작게 잡았다. 전수로 재 보니 이웃한
#   마디 차이가 1~3% 였다 — 화면에서는 같은 그림이다. 마디가 바뀐 것을 눈으로
#   알아채려면 **한 마디에 알아볼 만한 덩어리 하나**가 통째로 없어져야 한다.
#   그래서 좌우 대칭으로 한 쌍씩 떼어 낸다: 오른쪽 → 왼쪽 → 오른쪽 → 왼쪽.
ERASE = {
    'archetype': [
        [],                                                   # ph0 온전하다
        [(62, 38, 92, 54)],                                   # ph1 오른 어깨 덮개
        [(62, 38, 92, 54), (4, 38, 34, 54)],                  # ph2 왼 어깨도
        # 팔은 통째로 지운다. 팔뚝만 지우면 어깨 덮개가 이미 없어서 팔 기둥이
        # 몸에 안 닿은 채 공중에 뜬다 — 부서진 게 아니라 어긋나 보인다.
        [(62, 38, 92, 94), (4, 38, 34, 54)],                  # ph3 오른 팔이 통째로
        [(62, 38, 92, 94), (4, 38, 34, 94)],                  # ph4 두 팔 다 없다
    ],
    'hepha': [
        [],                                                   # ph0
        # 좌표는 성긴 지도(두 칸 간격)로 읽으면 틀린다 — 오른 기둥을 x62~71 로
        # 봤는데 실제로는 61~76 이라 끝 네 칸이 남아 머리 옆에 실 한 가닥처럼
        # 떠 있었다. 한 칸 간격으로 다시 재서 집었다.
        # 어깨 바는 y29 부터이므로 굴뚝은 y<29 까지만 지운다.
        [(60, 0, 78, 29), (58, 47, 92, 71)],                  # ph1 오른 굴뚝 · 오른 팔뚝
        [(60, 0, 78, 29), (58, 47, 92, 71),                   # ph2 왼쪽도 같이
         (16, 0, 34, 29), (2, 47, 36, 71)],
        [(60, 0, 78, 29), (58, 47, 92, 71),                   # ph3 오른 어깨 · 오른 허리판
         (16, 0, 34, 29), (2, 47, 36, 71),
         (58, 28, 92, 48), (70, 70, 94, 85)],
        [(60, 0, 78, 29), (58, 47, 92, 71),                   # ph4 왼 어깨 · 왼 허리판
         (16, 0, 34, 29), (2, 47, 36, 71),
         (58, 28, 92, 48), (70, 70, 94, 85),
         (2, 28, 36, 48), (0, 70, 24, 85)],
    ],
}
# 원형의 후광은 고리라 환원기와 같은 방식으로 끊는다
CUT_CENTER['archetype'] = (48, 26)
CUT['archetype'] = [[], [(17, 25, 40)], [(17, 25, 56)], [(17, 25, 72)], [(17, 25, 86)]]


# 별을 쫓아온 것 · 갱을 메운 것은 ph0≡ph1, ph2≡ph3 으로 차이가 **0%** 였다.
# 원본 벌을 두 마디씩 그대로 쓰는데 가르는 장치가 없었기 때문이다. 전수로 재
# 보고서야 찾았다 — 눈으로만 봤으면 "비슷하네" 로 넘어갔을 자리다.
#
#   별을 쫓아온 것: 가시가 마디마다 짧아진다(반지름 밖을 지운다). 쫓다가 저를
#     잃는 것이니 줄어드는 쪽이 이야기와 맞는다.
#   갱을 메운 것: 위에 쌓인 바위부터 무너져 내린다(윗줄을 지운다).
#   가시 끝은 r≈50 까지 뻗고 보라색 몸통은 r≈24, 금빛 핵은 r≈12 다. 47 로
#   깎으면 끝만 조금 잘려 눈에 안 띄었다(2%). 26 까지 내리면 마지막 마디에는
#   몸통과 핵만 남는다 — 별이 가시를 다 잃는다.
TRIM_CENTER = {'pursuer': (50.5, 54.5)}
TRIM = {'pursuer': [None, 42, 37, 32, 26]}          # 마디별 남기는 반지름
ERASE['pursuer'] = [[], [], [], [], []]              # 네모로는 안 지운다
#   바위 윗면은 y≈10(가운데)~18(가장자리)에서 시작한다. y<7 을 지우면 흐린
#   후광만 닿아 ph0 과 ph1 이 사실상 같은 그림이었다. 입은 y33~52 이므로
#   위는 y32 까지, 아래는 y64 까지 무너뜨리고 입이 있는 띠만 남긴다.
ERASE['shaft_maw'] = [
    [],
    [(0, 0, 92, 16)],                                # ph1 윗바위가 무너진다
    [(0, 0, 92, 22)],                                # ph2 더
    [(0, 0, 92, 28), (0, 70, 92, 84)],               # ph3 아래도 빠진다
    [(0, 0, 92, 32), (0, 64, 92, 84)],               # ph4 입이 있는 띠만 남는다
]


def trim_radius(im, cx, cy, r):
    """가운데에서 r 밖을 지운다. 새 픽셀은 한 점도 안 그린다."""
    if r is None:
        return im
    import math as _m
    px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if px[x, y][3] and _m.hypot(x - cx, y - cy) > r:
                px[x, y] = (0, 0, 0, 0)
    return im


def erase_rects(im, rects):
    """네모 구간의 알파를 0 으로. 새 픽셀은 한 점도 안 그린다."""
    if not rects:
        return im
    px = im.load()
    w, h = im.size
    for x0, y0, x1, y1 in rects:
        for y in range(max(0, y0), min(h, y1)):
            for x in range(max(0, x0), min(w, x1)):
                px[x, y] = (0, 0, 0, 0)
    return im


def _components(im):
    """알파가 있는 칸을 8방향으로 묶는다. (라벨맵, 덩어리별 칸수) 를 준다."""
    w, h = im.size
    px = im.load()
    lab = [[-1] * w for _ in range(h)]
    sizes = []
    for sy in range(h):
        for sx in range(w):
            if lab[sy][sx] >= 0 or px[sx, sy][3] == 0:
                continue
            k = len(sizes)
            stack = [(sx, sy)]
            lab[sy][sx] = k
            n = 0
            while stack:
                x, y = stack.pop()
                n += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and lab[ny][nx] < 0 \
                           and px[nx, ny][3]:
                            lab[ny][nx] = k
                            stack.append((nx, ny))
            sizes.append(n)
    return lab, sizes


def drop_fragments(orig, im, max_area=400, ratio=4):
    """지우기 때문에 **떨어져 나온** 조각을 마저 지운다.

       팔을 지우면 원본에서 팔에 매달려 있던 주먹이 허공에 뜬 네모로 남는다 —
       부서진 게 아니라 그림이 깨진 것으로 보인다. 좌표를 하나씩 더 집어도
       되지만 원본 벌마다 조금씩 달라서 번번이 놓쳤다.

       그래서 기계로 판정한다: 지운 뒤 홀로 남은 작은 덩어리가, **원본에서는**
       저보다 몇 배 큰 덩어리의 일부였다면 그건 내가 떼어 낸 조각이다. 원본
       그대로 홀로 있던 반짝임·돌부스러기는 원본에서도 작은 덩어리이므로
       건드리지 않는다. 여기서도 새 픽셀은 한 점도 안 그린다."""
    lab, sizes = _components(im)
    if not sizes:
        return im
    olab, osizes = _components(orig)
    px = im.load()
    w, h = im.size
    kill = set()
    for k, n in enumerate(sizes):
        if n > max_area:
            continue
        kill.add(k)
    if not kill:
        return im
    # 원본에서 어느 덩어리였는지 보고, 그때 충분히 컸던 것만 조각으로 친다
    parent = {}
    for y in range(h):
        for x in range(w):
            k = lab[y][x]
            if k in kill and olab[y][x] >= 0:
                parent.setdefault(k, osizes[olab[y][x]])
    for y in range(h):
        for x in range(w):
            k = lab[y][x]
            if k in kill and parent.get(k, 0) >= sizes[k] * ratio:
                px[x, y] = (0, 0, 0, 0)
    return im


def cut_rings(im, cx, cy, bands):
    """각도 구간의 알파를 0 으로 지운다. **새 픽셀을 한 점도 안 그린다** —
       원본에 무엇이든 더하면 덧댄 티가 나는데, 지우기만 하면 그럴 여지가 없다."""
    if not bands:
        return im
    import math as _m
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            dx, dy = x - cx, y - cy
            r = _m.hypot(dx, dy)
            a = _m.degrees(_m.atan2(dy, dx)) % 360
            for r0, r1, wid in bands:
                if not (r0 <= r <= r1):
                    continue
                if any(min(abs(a - c), 360 - abs(a - c)) <= wid / 2 for c in CUT_AT):
                    px[x, y] = (0, 0, 0, 0)
                    break
    return im


def main():
    for name, (ow, oh) in SRC_SIZE.items():
        src = Image.open(os.path.join(SRC, name + '.png')).convert('RGBA')
        fw, fh = ow * UP, oh * UP
        sheet = Image.new('RGBA', (fw * FRAMES * S, fh * S), (0, 0, 0, 0))
        for i in range(FRAMES):
            si = SRC_PAIR.get(name, DEF_PAIR)[SRC_PH[i // 2]][i % 2]
            # 구워진 4배 시트에서 **논리 픽셀로 되돌린 뒤** Scale2x 로 늘린다.
            # 4배 그림에 바로 걸면 이미 2x2 로 뭉쳐 있어 이웃 검사가 늘 같다고
            # 나와서 아무것도 안 깎인다 — 최근접과 똑같은 결과가 된다.
            g = SRC_GAP.get(name, 0)
            x0 = si * (ow * S + g)
            logi = src.crop((x0, 0, x0 + ow * S, oh * S)) \
                      .resize((ow, oh), Image.NEAREST)
            if name in CUT or name in ERASE or name in TRIM:
                logi = logi.copy()
                if name in CUT:
                    cx, cy = CUT_CENTER[name]
                    logi = cut_rings(logi, cx, cy, CUT[name][i // 2])
                if name in TRIM:
                    tx, ty = TRIM_CENTER[name]
                    logi = trim_radius(logi, tx, ty, TRIM[name][i // 2])
                # 조각 판정은 **네모로 지우기 직전**의 그림과 견준다. 고리를
                # 끊어 생긴 호는 이미 그 그림에 따로 떨어져 있으므로 조각으로
                # 안 잡힌다 — 일부러 끊은 것을 도로 지우면 안 된다.
                if name in ERASE and ERASE[name][i // 2]:
                    base = logi
                    logi = erase_rects(logi.copy(), ERASE[name][i // 2])
                    logi = drop_fragments(base, logi)
            sheet.paste(scale2x(logi).resize((fw * S, fh * S), Image.NEAREST),
                        (i * fw * S, 0))
        pth = os.path.join(OUT, name + '.png')
        sheet.save(pth)
        hw, hh = SRC_HIT[name][0] * UP, SRC_HIT[name][1] * UP
        print('  %-11s %3dx%-3d → %3dx%-3d · 판정 %3dx%-3d · %d칸 · %dB'
              % (name, ow, oh, fw, fh, hw, hh, FRAMES, os.path.getsize(pth)))
    print('\n매니페스트·ENEMIES 값:')
    for k, (ow, oh) in SRC_SIZE.items():
        fw, fh = ow * UP, oh * UP
        print('  %-11s frameW %d frameH %d count %d · w %d h %d'
              % (k, fw, fh, FRAMES, SRC_HIT[k][0] * UP, SRC_HIT[k][1] * UP))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
