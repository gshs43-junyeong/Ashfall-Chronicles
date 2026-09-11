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
        [(41, 53, 26)],                       # ph1 바깥 고리가 벌어진다
        [(41, 53, 40), (32, 40, 24)],         # ph2 가운데 고리도
        [(41, 53, 58), (32, 40, 40)],         # ph3 조각으로 돈다
        [(41, 53, 74), (32, 40, 58), (22, 31, 34)],   # ph4 핵과 축만 온전하다
    ],
}
CUT_AT = (45, 135, 225, 315)                  # 세로 축·좌우 마디는 안 건드린다


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
            si = SRC_PH[i // 2] * 2 + i % 2
            # 구워진 4배 시트에서 **논리 픽셀로 되돌린 뒤** Scale2x 로 늘린다.
            # 4배 그림에 바로 걸면 이미 2x2 로 뭉쳐 있어 이웃 검사가 늘 같다고
            # 나와서 아무것도 안 깎인다 — 최근접과 똑같은 결과가 된다.
            g = SRC_GAP.get(name, 0)
            x0 = si * (ow * S + g)
            logi = src.crop((x0, 0, x0 + ow * S, oh * S)) \
                      .resize((ow, oh), Image.NEAREST)
            if name in CUT:
                cx, cy = CUT_CENTER[name]
                logi = cut_rings(logi.copy(), cx, cy, CUT[name][i // 2])
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
