#!/usr/bin/env python3
"""유적마다 하나 더 — 그 유적의 사건과 짝을 이루는 몬스터 아홉의 스프라이트를 굽는다.

  char/rimeguard.png     서리 방패병     얼음 던전   — 앞에서 치면 방패가 받는다
  char/sunscarab.png     태양 풍뎅이     피라미드    — 모래 속으로 숨었다 솟는다
  char/lampthief.png     등불 도둑       버려진 광산 — 불을 훔쳐 달아난다
  char/blightleech.png   옮는 거머리     부패한 둥지 — 몸에 붙어 빤다
  char/sporegnaw.png     포자갉이        포자 굴     — 안 맞으면 다시 자란다
  char/pagewisp.png      떠도는 낱장     가라앉은 유적 — 소리를 내야 깨어난다
  char/froststatue.png   서리 석상       서리 밑 석실 — 내가 움직일 때만 움직인다
  char/mazeshade.png     갈림길 그림자   겹친 길     — 등 뒤로 건너온다
  char/hollowling.png    빈 껍질         발 디딜 곳 없는 방 — 바닥 밑에 묻혀 기다린다
  char/nestsac.png       둥지 알주머니   부패한 둥지 — 사건 '둥지의 박동'의 과녁

■ 왜 하나 더인가

  유적 다섯 곳의 고유 몬스터(mkruinmobs.py)는 생김새만 달랐고 싸우는 법은
  세계 몹과 같았다(걷는다 · 뛴다 · 쏜다). 이번 아홉은 **싸우는 법이 다르다** —
  그 유적에 가야만 겪는 규칙 하나씩(게임 entity/enemy-traits.ts `trait`).
  석판 유적 셋은 고유 몬스터가 아예 없었다.

■ 규칙 — mkruinmobs.py 와 같다

  논리 크기로 그린 뒤 4배 최근접 확대 · 프레임 7장(0 idle1 1 idle2 2 move1 3 move2
  4 atk 5 death1 6 death2) · 칸 사이 틈 없음 · 다 그린 뒤 외곽선 한 겹.
  좌우 · 위에 두 칸 여백을 둔다 — 칸 벽에 닿으면 옆 칸 그림과 붙어 잘린 것처럼
  읽힌다(padframe.py). 발은 칸 맨 아랫줄에 닿는다(떠다니는 것 셋은 제외).

  매니페스트의 foot · side 는 굽는 김에 재서 찍어 준다(file:// 에서는 게임이 못 잰다).

사용법:  python3 tools/mkruinmobs2.py    (그다음 python3 tools/sync-manifest.py)
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mkruinmobs import Canvas, S, FRAMES, OUT  # noqa: E402

MANIFEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play', 'assets', 'manifest.json')


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- 서리 방패병
#  얼음 탑방패를 앞(오른쪽)에 세우고 천천히 걷는다. 방패가 몸보다 크다.
RG = dict(arm=rgb('#5a6e86'), arm2=rgb('#34445a'), arm3=rgb('#8aa0ba'), sh=rgb('#9fd8ea'),
          sh2=rgb('#6fa8c4'), sh3=rgb('#e0f6ff'), eye=rgb('#bfe8ff'), dark=rgb('#1a2230'))
RG_W, RG_H = 32, 44


def rimeguard(f):
    c = Canvas(RG_W, RG_H)
    bob = [0, 1, 0, 1, 0, 4, 8][f]
    step = [(0, 0), (0, 0), (-2, 2), (2, -2), (0, 0), (0, 0), (0, 0)][f]
    if f == 6:                                    # 갑옷만 주저앉고 방패가 앞으로 넘어졌다
        c.rect(5, 38, 12, 6, RG['arm2']); c.rect(6, 37, 10, 2, RG['arm'])
        c.rect(15, 40, 15, 4, RG['sh2']); c.rect(15, 40, 15, 1, RG['sh3'])
        c.dot(9, 39, RG['eye'])
        c.outline(); return c.im
    top = 4 + bob
    # 다리
    c.rect(8 + step[0], RG_H - 9, 4, 9, RG['arm2'])
    c.rect(14 + step[1], RG_H - 9, 4, 9, RG['arm2'])
    c.rect(7 + step[0], RG_H - 2, 6, 2, RG['dark']); c.rect(13 + step[1], RG_H - 2, 6, 2, RG['dark'])
    # 몸통 · 투구
    c.rect(6, top + 12, 14, 18 - bob // 2, RG['arm'])
    c.rect(6, top + 12, 3, 18 - bob // 2, RG['arm2'])
    c.rect(8, top + 2, 10, 10, RG['arm'])
    c.rect(8, top + 2, 10, 2, RG['arm3'])
    c.rect(11, top + 6, 7, 2, RG['dark'])
    c.dot(14, top + 6, RG['eye']); c.dot(16, top + 6, RG['eye'])
    c.line(13, top, 13, top + 2, RG['sh3'])          # 투구 볏 — 얼음 가시
    # 탑방패 — 앞(오른쪽). 칠 때는 앞으로 밀어낸다
    sx = 19 + (3 if f == 4 else 0)
    c.rect(sx, top + 6, 8, 28, RG['sh2'])
    c.rect(sx + 1, top + 7, 6, 26, RG['sh'])
    c.line(sx + 2, top + 9, sx + 2, top + 28, RG['sh3'])
    c.line(sx + 4, top + 12, sx + 6, top + 16, RG['sh3'])
    c.rect(sx, top + 18, 8, 1, RG['sh2'])
    if f == 5:                                     # 방패에 금이 간다
        c.line(sx + 1, top + 10, sx + 6, top + 26, RG['dark'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 태양 풍뎅이
#  금빛 등딱지 · 등에 해 무늬. 모래에 반쯤 묻혔다가 솟는다(그림은 다 나온 모습).
SC = dict(sh=rgb('#d8a832'), sh2=rgb('#9a6e1c'), sh3=rgb('#ffe28a'), leg=rgb('#4a3418'),
          sun=rgb('#fff2b8'), eye=rgb('#ff5a2a'))
SC_W, SC_H = 32, 20


def sunscarab(f):
    c = Canvas(SC_W, SC_H)
    if f == 6:                                     # 뒤집혀 다리를 오므렸다
        c.ell(14, 15, 9, 4, SC['sh2']); c.ell(14, 14, 7, 2, SC['sh'])
        for x in (8, 12, 16, 20):
            c.line(x, 11, x + 1, 9, SC['leg'])
        c.outline(); return c.im
    lift = [0, 1, 0, 1, -2, 2, 0][f]
    cy = 10 + lift
    # 다리 여섯 — 걸을 때 엇갈린다
    ph = [0, 0, 1, -1, 0, 0, 0][f]
    for i, x in enumerate((7, 13, 19)):
        d = ph if i % 2 else -ph
        c.line(x, cy + 4, x - 2 + d, SC_H - 1, SC['leg'])
        c.line(x + 2, cy + 4, x + 4 - d, SC_H - 1, SC['leg'])
    c.ell(14, cy, 10, 6, SC['sh2'])
    c.ell(14, cy - 1, 9, 5, SC['sh'])
    c.line(14, cy - 5, 14, cy + 4, SC['sh2'])         # 날개 덮개 가운데 금
    c.ell(14, cy - 1, 2, 2, SC['sun'])                # 등의 해 무늬
    for dx, dy in ((-4, -1), (4, -1), (0, -4), (-3, 2), (3, 2)):
        c.dot(14 + dx, cy - 1 + dy, SC['sh3'])
    # 머리 · 뿔 — 앞(오른쪽)
    hx = 23 + (2 if f == 4 else 0)
    c.ell(hx, cy + 1, 3, 3, SC['leg'])
    c.dot(hx + 1, cy, SC['eye'])
    c.line(hx + 1, cy - 2, hx + 3, cy - 5, SC['sh3'])
    if f == 5:
        c.line(8, cy - 3, 18, cy + 2, SC['sh2'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 등불 도둑
#  웅크린 작은 광부 유령. 훔친 등불을 앞으로 들고 있다 — 불빛이 이 녀석의 표지다.
LT = dict(cl=rgb('#4a3e52'), cl2=rgb('#2c2434'), skin=rgb('#a8b8b0'), lamp=rgb('#6a5a3a'),
          fire=rgb('#ffb04a'), fire2=rgb('#fff0a8'), eye=rgb('#ffe08a'), bag=rgb('#7a5a38'))
LT_W, LT_H = 30, 32


def lampthief(f):
    c = Canvas(LT_W, LT_H)
    if f == 6:                                     # 옷만 남고 등불이 굴렀다
        c.ell(10, 29, 8, 3, LT['cl2']); c.ell(10, 28, 6, 2, LT['cl'])
        c.rect(18, 26, 4, 5, LT['lamp']); c.dot(19, 27, LT['fire'])
        c.outline(); return c.im
    bob = [0, 1, 0, 1, -1, 3, 0][f]
    run = [0, 0, 2, -2, 0, 0, 0][f]
    top = 6 + bob
    # 등에 진 자루
    c.ell(6, top + 10, 4, 5, LT['bag'])
    # 몸 — 앞으로 숙였다
    c.ell(11, top + 12, 6, 8, LT['cl'])
    c.rect(6, top + 12, 3, 8, LT['cl2'])
    # 두건 · 얼굴
    c.ell(14, top + 4, 5, 5, LT['cl'])
    c.ell(16, top + 5, 3, 3, LT['cl2'])
    c.dot(16, top + 5, LT['eye']); c.dot(18, top + 5, LT['eye'])
    # 다리 — 뛸 때 넓게
    c.line(9, top + 19, 8 - run, LT_H - 1, LT['cl2'])
    c.line(13, top + 19, 14 + run, LT_H - 1, LT['cl2'])
    # 앞으로 든 등불
    lx = 20 + (2 if f == 4 else 0)
    ly = top + 10 + (-3 if f == 4 else 0)
    c.line(15, top + 11, lx, ly, LT['skin'])
    c.rect(lx - 1, ly, 4, 6, LT['lamp'])
    c.rect(lx, ly + 1, 2, 4, LT['fire'])
    c.dot(lx, ly + 2, LT['fire2'])
    c.line(lx + 1, ly - 2, lx + 1, ly, LT['lamp'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 옮는 거머리
#  마디진 거머리가 떠서 꿈틀댄다. 앞(오른쪽) 끝이 둥근 빨판 입.
BL = dict(b=rgb('#6a2a5a'), b2=rgb('#40183a'), b3=rgb('#a85a94'), mouth=rgb('#ff8ac8'),
          tooth=rgb('#f0e0e8'), glow=rgb('#d88ad0'))
BL_W, BL_H = 41, 20


def blightleech(f):
    c = Canvas(BL_W, BL_H)
    if f == 6:                                     # 축 늘어져 바닥에 떨어졌다
        for i in range(6):
            c.ell(6 + i * 4, 17, 3, 2, BL['b2'])
        c.outline(); return c.im
    ph = [0, 1, 2, 3, 0, 1, 0][f] * 0.9
    import math
    amp = 3 if f != 4 else 1
    pts = []
    for i in range(7):
        x = 7 + i * 3.7 + (2 if f == 4 else 0)
        y = 10 + math.sin(i * 0.9 + ph) * amp
        pts.append((x, y))
    for i, (x, y) in enumerate(pts):
        r = 3 + (1 if 2 <= i <= 4 else 0)
        c.ell(x, y, r, r, BL['b2'])
        c.ell(x, y - 1, r - 1, r - 1, BL['b'])
        c.dot(x, y - r + 1, BL['b3'])
        if i in (2, 4):
            c.dot(x, y, BL['glow'])
    hx, hy = pts[-1]
    c.ell(hx + 2, hy, 3, 3, BL['mouth'])
    c.ell(hx + 2, hy, 1, 1, BL['b2'])
    for dy in (-2, 0, 2):
        c.dot(hx + 4, hy + dy, BL['tooth'])
    if f == 5:
        c.line(6, 6, 24, 14, BL['b3'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 포자갉이
#  버섯갓을 머리에 인 털 짐승. 등에서 포자가 피어오른다.
SG = dict(fur=rgb('#6a7a4a'), fur2=rgb('#465430'), cap=rgb('#3fb0a0'), cap2=rgb('#2a7a70'),
          dot=rgb('#bff8e8'), tooth=rgb('#f0ecd0'), eye=rgb('#ffe050'))
SG_W, SG_H = 33, 26


def sporegnaw(f):
    c = Canvas(SG_W, SG_H)
    if f == 6:
        c.ell(14, 22, 10, 3, SG['fur2']); c.ell(10, 19, 6, 3, SG['cap2'])
        c.dot(8, 18, SG['dot']); c.dot(12, 18, SG['dot'])
        c.outline(); return c.im
    bob = [0, 1, 0, 1, 0, 2, 0][f]
    stp = [0, 0, 2, -2, 1, 0, 0][f]
    cy = 15 + bob
    # 다리 넷
    for x, d in ((7, stp), (11, -stp), (17, stp), (21, -stp)):
        c.rect(x + d // 2, cy + 3, 3, SG_H - cy - 3, SG['fur2'])
    c.ell(14, cy, 10, 6, SG['fur'])
    c.ell(13, cy + 2, 8, 3, SG['fur2'])
    # 머리 · 이빨
    hx = 23 + (2 if f == 4 else 0)
    c.ell(hx, cy - 1, 4, 4, SG['fur'])
    c.dot(hx + 1, cy - 2, SG['eye'])
    c.dot(hx + 3, cy + 1, SG['tooth']); c.dot(hx + 3, cy + 2, SG['tooth'])
    if f == 4:
        c.rect(hx + 2, cy, 3, 3, SG['fur2']); c.dot(hx + 4, cy - 1, SG['tooth'])
    # 등의 버섯갓
    c.ell(12, cy - 6, 7, 4, SG['cap2'])
    c.ell(12, cy - 7, 6, 3, SG['cap'])
    for dx in (-3, 0, 3):
        c.dot(12 + dx, cy - 8, SG['dot'])
    if f in (1, 3):
        c.dot(10, cy - 12, SG['dot']); c.dot(15, cy - 11, SG['dot'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 떠도는 낱장
#  찢긴 책장이 겹쳐 떠다닌다. 가운데에 눈 하나 — 깨면 붉게 뜬다(게임이 물들인다).
PW = dict(pg=rgb('#d8ccaa'), pg2=rgb('#a89a78'), ink=rgb('#4a4030'), eye=rgb('#7ad8e8'),
          eye2=rgb('#e8fbff'), glow=rgb('#9ae0ea'))
PW_W, PW_H = 26, 28


def pagewisp(f):
    c = Canvas(PW_W, PW_H)
    if f == 6:                                     # 낱장이 흩어져 바닥에
        for x, y in ((3, 25), (10, 26), (17, 24), (7, 22)):
            c.rect(x, y, 6, 2, PW['pg2']); c.rect(x, y, 6, 1, PW['pg'])
        c.outline(); return c.im
    fl = [0, 1, 2, 1, 3, 2, 0][f]
    cx, cy = 13, 13 + (1 if f in (1, 3) else 0)
    pages = [(-6, -5, -fl), (5, -4, fl), (-5, 4, fl), (6, 5, -fl), (0, -8, 0)]
    for dx, dy, tilt in pages:
        x, y = cx + dx - 4, cy + dy - 3
        for k in range(7):
            c.rect(x, y + k + (tilt * k) // 6, 8, 1, PW['pg'] if k else PW['pg2'])
        c.line(x + 1, y + 2 + tilt // 2, x + 6, y + 2, PW['ink'])
        c.line(x + 1, y + 4 + tilt // 2, x + 5, y + 4, PW['ink'])
    c.ell(cx, cy, 4, 4, PW['ink'])
    c.ell(cx, cy, 3, 3 if f != 4 else 2, PW['eye'])
    c.dot(cx - 1 if f != 4 else cx + 1, cy - 1, PW['eye2'])
    if f == 5:
        c.line(cx - 6, cy - 6, cx + 6, cy + 6, PW['pg2'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 서리 석상
#  날개 접은 돌 수호상. 서리가 앉아 있다. 움직일 때만 금이 번득인다.
FS = dict(st=rgb('#8a96a4'), st2=rgb('#5a6674'), st3=rgb('#bcc8d4'), fr=rgb('#e8f6ff'),
          eye=rgb('#6ae0ff'), dark=rgb('#2a3440'))
FS_W, FS_H = 32, 46


def froststatue(f):
    c = Canvas(FS_W, FS_H)
    if f == 6:                                     # 무너져 돌무더기
        for x, y, w, h in ((4, 40, 8, 6), (11, 38, 9, 8), (19, 41, 7, 5), (9, 35, 5, 4)):
            c.rect(x, y, w, h, FS['st2']); c.rect(x, y, w, 1, FS['st3'])
        c.dot(13, 37, FS['fr'])
        c.outline(); return c.im
    lean = [0, 0, 1, -1, 3, 1, 0][f]
    top = 4
    # 받침 없이 선 다리 — 움직일 땐 미끄러지듯
    c.rect(9, FS_H - 10, 5, 10, FS['st2']); c.rect(16, FS_H - 10, 5, 10, FS['st2'])
    # 접은 날개 — 등(왼쪽) 뒤로 높이 솟는다
    c.tri(2, top + 2, 9, 30, FS['st2'])
    c.line(4, top + 4, 4, top + 28, FS['st3'])
    c.line(7, top + 3, 7, top + 26, FS['st'])
    # 몸통 · 옷자락
    c.tri(8 + lean, top + 12, 15, 24, FS['st'])
    c.rect(9 + lean, top + 12, 3, 22, FS['st2'])
    # 머리 — 얼굴을 손으로 가렸다(공격할 땐 손을 내린다)
    c.ell(16 + lean, top + 7, 5, 6, FS['st'])
    c.ell(14 + lean, top + 5, 2, 2, FS['st3'])
    if f == 4:
        c.rect(15 + lean, top + 6, 6, 2, FS['dark'])
        c.dot(17 + lean, top + 6, FS['eye']); c.dot(19 + lean, top + 6, FS['eye'])
        c.line(21 + lean, top + 12, 27, top + 16, FS['st'])       # 뻗은 손
        c.rect(26, top + 15, 3, 3, FS['st3'])
    else:
        c.rect(14 + lean, top + 5, 7, 4, FS['st3'])               # 얼굴을 가린 손
        c.line(14 + lean, top + 9, 12 + lean, top + 14, FS['st'])
    # 서리 — 어깨와 머리 위
    for x, y in ((12, top + 1), (16, top), (20, top + 2), (10, top + 12), (22, top + 13)):
        c.dot(x + lean, y, FS['fr'])
    if f in (2, 3):                                 # 움직이는 순간 — 금이 번득인다
        c.line(12 + lean, top + 16, 18 + lean, top + 26, FS['eye'])
    if f == 5:
        c.line(10, top + 14, 22, top + 30, FS['dark'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 갈림길 그림자
#  얼굴이 앞뒤 둘인 두건 그림자. 아래가 연기처럼 흩어진다.
MS = dict(sh=rgb('#2a2440'), sh2=rgb('#181428'), sh3=rgb('#4a4070'), eye=rgb('#e8d070'),
          eye2=rgb('#8fd8ff'), wisp=rgb('#5a5090'))
MS_W, MS_H = 26, 44


def mazeshade(f):
    c = Canvas(MS_W, MS_H)
    if f == 6:
        c.ell(13, 40, 9, 3, MS['sh2'])
        for x, y in ((6, 36), (13, 33), (20, 37)):
            c.dot(x, y, MS['wisp'])
        c.outline(); return c.im
    sway = [0, 1, -1, 1, 2, 0, 0][f]
    top = 4 + (1 if f in (1, 3) else 0)
    # 흩어지는 아랫자락
    for k in range(5):
        x = 6 + k * 3 + (sway if k % 2 else -sway)
        c.line(x, top + 26, x + (1 if k % 2 else -1), MS_H - 1 - (k % 2) * 2, MS['wisp'])
    c.tri(5, top + 10, 16, 20, MS['sh'])
    c.rect(6, top + 10, 3, 18, MS['sh2'])
    # 두건 · 얼굴 둘(앞 노랑 · 뒤 하늘)
    c.ell(13, top + 6, 6, 6, MS['sh'])
    c.ell(13, top + 7, 4, 4, MS['sh2'])
    c.dot(16, top + 7, MS['eye']); c.dot(15, top + 7, MS['eye'])
    c.dot(9, top + 7, MS['eye2'])
    c.line(13, top, 13, top + 2, MS['sh3'])
    if f == 4:                                     # 칠 때 손이 앞으로 늘어난다
        c.line(18, top + 14, MS_W - 3, top + 12, MS['sh3'])
        c.line(18, top + 16, MS_W - 3, top + 17, MS['sh3'])
    if f == 5:
        c.line(6, top + 4, 20, top + 26, MS['wisp'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 빈 껍질
#  속이 빈 씨앗 껍질을 뒤집어쓴 것. 껍질 틈으로 안이 비어 보인다.
HL = dict(h=rgb('#7a6a48'), h2=rgb('#4e4230'), h3=rgb('#b0a070'), void=rgb('#140c10'),
          eye=rgb('#c8f070'), root=rgb('#5a4a30'))
HL_W, HL_H = 26, 34


def hollowling(f):
    c = Canvas(HL_W, HL_H)
    if f == 6:
        c.ell(12, 30, 9, 3, HL['h2']); c.ell(12, 29, 6, 2, HL['h'])
        c.rect(10, 28, 4, 1, HL['void'])
        c.outline(); return c.im
    bob = [0, 1, 0, 1, -2, 2, 0][f]
    stp = [0, 0, 2, -2, 0, 0, 0][f]
    top = 4 + bob
    # 뿌리 다리
    c.line(9, top + 20, 7 - stp, HL_H - 1, HL['root'])
    c.line(15, top + 20, 17 + stp, HL_H - 1, HL['root'])
    c.line(12, top + 21, 12, HL_H - 1, HL['root'])
    # 씨앗 껍질 몸 — 위가 뾰족하다
    c.ell(12, top + 13, 8, 10, HL['h2'])
    c.ell(12, top + 12, 7, 9, HL['h'])
    c.line(12, top + 2, 12, top + 4, HL['h3'])
    c.line(7, top + 8, 7, top + 18, HL['h3'])
    # 갈라진 틈 — 안이 비었다
    gap = 2 if f != 4 else 4
    c.rect(11, top + 8, gap, 12, HL['void'])
    c.dot(11, top + 11, HL['eye']); c.dot(11 + gap - 1, top + 11, HL['eye'])
    if f == 4:                                     # 칠 때 껍질이 벌어져 덮친다
        c.line(19, top + 8, HL_W - 3, top + 4, HL['h3'])
        c.line(19, top + 16, HL_W - 3, top + 18, HL['h3'])
    if f == 5:
        c.line(6, top + 6, 18, top + 20, HL['h2'])
    c.outline(); return c.im


# ---------------------------------------------------------------- 둥지 알주머니 (사건 '둥지의 박동' 표적)
#  벽에 붙은 알주머니. 장마다 크기가 숨쉬듯 바뀐다 — 게임은 박동에 맞춰 장을 고르지 않고 크기를 따로 키운다.
NS = dict(s=rgb('#8a4a80'), s2=rgb('#5e3058'), s3=rgb('#c87ab8'), egg=rgb('#f0b0e0'), vein=rgb('#4a1a40'))
NS_W, NS_H = 26, 28


def nestsac(f):
    c = Canvas(NS_W, NS_H)
    if f in (5, 6):                                # 터졌다 — 찢긴 껍질
        c.ell(13, 24, 9, 3, NS['s2'])
        for x, y in ((6, 20), (10, 18), (16, 19), (20, 21)):
            c.line(x, y, x + (1 if x > 13 else -1), y - 4 + (f - 5) * 2, NS['s'])
        c.outline(); return c.im
    r = [9, 10, 9, 10, 11][f]
    cy = NS_H - 2 - r
    c.rect(11, NS_H - 3, 4, 3, NS['vein'])        # 바닥에 박힌 줄기
    c.ell(13, cy, r - 1, r, NS['s2'])
    c.ell(13, cy - 1, r - 2, r - 1, NS['s'])
    c.line(8, cy - 4, 11, cy + 5, NS['vein']); c.line(17, cy - 5, 15, cy + 4, NS['vein'])
    for dx, dy in ((-3, -1), (2, 1), (0, -4), (-1, 3)):
        c.ell(13 + dx, cy + dy, 1, 1, NS['egg'])
    c.dot(10, cy - r + 3, NS['s3'])
    c.outline(); return c.im


SHEETS = [
    ('rimeguard', RG_W, RG_H, rimeguard),
    ('sunscarab', SC_W, SC_H, sunscarab),
    ('lampthief', LT_W, LT_H, lampthief),
    ('blightleech', BL_W, BL_H, blightleech),
    ('sporegnaw', SG_W, SG_H, sporegnaw),
    ('pagewisp', PW_W, PW_H, pagewisp),
    ('froststatue', FS_W, FS_H, froststatue),
    ('mazeshade', MS_W, MS_H, mazeshade),
    ('hollowling', HL_W, HL_H, hollowling),
    ('nestsac', NS_W, NS_H, nestsac),
]


def pad_of(sheet, fw, fh):
    """measurePad(engine/assets) 와 같은 계산 — 프레임 0 의 발 여백 · 가로 치우침(게임 픽셀)."""
    px = sheet.load()
    W, H = fw * S, fh * S
    bottom, left, right = -1, W, -1
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 10:
                bottom = max(bottom, y); left = min(left, x); right = max(right, x)
    return round(fh - bottom / S - 1, 3), round(((left + right + 1) / 2 - W / 2) / S, 3)


def main():
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    with open(MANIFEST, encoding='utf-8') as fp:
        man = json.load(fp)
    sheets = man['characters']['sheets']
    for name, fw, fh, fn in SHEETS:
        sheet = Image.new('RGBA', (FRAMES * fw * S, fh * S), (0, 0, 0, 0))
        for f in range(FRAMES):
            fr = fn(f)
            # 칸 벽 검사 — 좌우 · 위 두 칸 안에 칠한 칸이 있으면 멈춘다(잘려 보인다)
            bb = fr.getbbox()
            if bb and (bb[0] < 1 or bb[2] > fw - 1 or bb[1] < 1):
                raise SystemExit('%s 프레임 %d 이 칸 벽에 닿았다: %s' % (name, f, bb))
            sheet.paste(fr.resize((fw * S, fh * S), Image.NEAREST), (f * fw * S, 0))
        p = os.path.normpath(os.path.join(OUT, name + '.png'))
        sheet.save(p)
        foot, side = pad_of(sheet, fw, fh)
        sheets[name] = {'file': 'char/%s.png' % name, 'frameW': fw, 'frameH': fh, 'count': FRAMES,
                        'foot': foot, 'side': side}
        print('  %-16s %dx%d  (%dx%d x %d)  foot %.2f side %.2f' % (name + '.png', sheet.size[0], sheet.size[1], fw, fh, FRAMES, foot, side))
    with open(MANIFEST, 'w', encoding='utf-8') as fp:
        json.dump(man, fp, ensure_ascii=False, indent=2)
        fp.write('\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
