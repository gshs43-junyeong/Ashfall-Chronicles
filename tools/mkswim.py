#!/usr/bin/env python3
"""주인공 시트(char/player_<id>.png)에서 두 가지를 굽는다.

    python3 tools/mkswim.py

1) **망토 분리** — player_<id>_body.png(망토를 뺀 몸) · player_<id>_cape.png(망토만).
   망토가 몸 그림에 박혀 있어서, 달리든 떨어지든 망토가 등에 붙은 채 꼼짝하지 않았다.
   둘로 나눠 두면 게임(game.js drawCape)이 망토만 줄마다 밀어 **뒤로 날리게** 그린다.
   망토 칸은 player.png 기준 색(아래 CAPE)으로 고르고, 여섯 시트는 모양이 같으므로
   (알파 차이는 머리·모자에만 있다) **같은 자리**를 각 시트에서 떼어 낸다.
   망토를 두른 테두리(검은 윤곽)는 망토 쪽으로 따라간다 — 몸에 남기면 망토가 날릴 때
   빈 윤곽선만 등에 남는다.

2) **헤엄 시트** — player_<id>_swim.png, 네 장(48×28 — 위 네 칸은 등 위로 넘기는 팔 자리). 선 그림(idle1)을 시계 방향으로
   눕혀(머리가 앞, 등·망토가 위) 엎드려 헤엄치는 몸으로 쓰고, 다리는 가위차기로 벌리고
   오므리며, 앞팔은 네 박자(앞으로 뻗기 → 당기기 → 옆으로 밀기 → 등 위로 되돌리기)로
   새로 그린다. 팔 색은 그 시트의 소매·손 색을 그대로 뽑아 쓴다(캐릭터마다 다르다).

규격은 전부 4배(scale 4) — manifest.json characters 절과 같다.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'char')
S = 4
FW, FH, N = 22, 41, 13
IDS = ['player', 'player_wanderer', 'player_digger', 'player_ranger', 'player_adept', 'player_stray']
OUT = (12, 12, 17)                         # 윤곽선 색(#0c0c11)
CAPE = {(0x33, 0x3a, 0x4e), (0x25, 0x2b, 0x3a), (0x4a, 0x50, 0x65), (0x1e, 0x23, 0x30), (0x3f, 0x44, 0x52)}
SW, SH, SN = 48, 28, 4


def frames(im):
    return [im.crop((i * FW * S, 0, (i + 1) * FW * S, FH * S)).resize((FW, FH), Image.NEAREST) for i in range(N)]


def cape_masks(base):
    """player.png 에서 프레임마다 망토 칸 집합을 고른다 — 등 쪽(x ≤ 7), 목 아래(y ≥ 10)의 망토 색 +
    그 망토에만 닿은 윤곽선"""
    out = []
    for f in frames(base):
        px = f.load()
        m = set()
        for y in range(10, FH):
            for x in range(0, 8):
                p = px[x, y]
                if p[3] > 127 and p[:3] in CAPE:
                    m.add((x, y))
        # 윤곽선 — 불투명 이웃이 전부 망토이거나 윤곽선이면 망토 쪽
        add = set()
        for y in range(9, FH):
            for x in range(0, 9):
                p = px[x, y]
                if p[3] < 128 or p[:3] != OUT:
                    continue
                nb = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                solid = [q for q in nb if 0 <= q[0] < FW and 0 <= q[1] < FH and px[q][3] > 127 and px[q][:3] != OUT]
                if solid and all(q in m for q in solid):
                    add.add((x, y))
        out.append(m | add)
    return out


def split(sheet, masks):
    fs = frames(sheet)
    body = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))
    cape = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))
    for i, f in enumerate(fs):
        b, c = f.copy(), Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        bp, cp, fp = b.load(), c.load(), f.load()
        for (x, y) in masks[i]:
            if fp[x, y][3] > 127:
                cp[x, y] = fp[x, y]
                bp[x, y] = (0, 0, 0, 0)
        body.paste(b, (i * FW, 0)); cape.paste(c, (i * FW, 0))
    return body, cape


def pick(f, box, avoid=()):
    """상자 안에서 가장 많은 불투명 색(윤곽선·avoid 제외)"""
    from collections import Counter
    cnt = Counter()
    px = f.load()
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            p = px[x, y]
            if p[3] > 127 and p[:3] != OUT and p[:3] not in avoid:
                cnt[p] += 1
    return cnt.most_common(1)[0][0]


def line(px, x0, y0, x1, y1, c, w=2):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    pts = []
    for i in range(n + 1):
        x = round(x0 + (x1 - x0) * i / n); y = round(y0 + (y1 - y0) * i / n)
        for dx in range(w):
            for dy in range(w):
                if 0 <= x + dx < SW and 0 <= y + dy < SH:
                    px[x + dx, y + dy] = c
                    pts.append((x + dx, y + dy))
    return pts


def outline(im):
    src = im.copy().load(); px = im.load()
    for y in range(SH):
        for x in range(SW):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if 0 <= q[0] < SW and 0 <= q[1] < SH and src[q][3] and src[q][:3] != OUT:
                    px[x, y] = OUT + (255,)
                    break


def swim(sheet):
    f = frames(sheet)[0]
    sleeve = pick(f, (15, 18, 20, 25), CAPE)              # 앞팔 소매
    hand = pick(f, (15, 25, 20, 29), CAPE | {sleeve[:3]})  # 손
    lying = f.transpose(Image.Transpose.ROTATE_270)       # 41×22 — 머리 오른쪽, 등 위
    out = Image.new('RGBA', (SW * SN * S, SH * S), (0, 0, 0, 0))
    kick = [2, 0, -2, 0]
    # 팔: 어깨(눕힌 좌표 x≈28, y≈18 — 몸을 4칸 내려 붙였다)에서 끝점까지. 끝 두 칸은 손
    reach = [(45, 16), (37, 24), (22, 22), (33, 1)]
    sheets = []
    for k in range(SN):
        fr = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
        body = lying.copy()
        bp = body.load()
        # 가위차기 — 다리(x ≤ 11) 중 등 쪽 다리(y ≤ 11)와 배 쪽 다리를 반대로 벌린다
        legs = Image.new('RGBA', body.size, (0, 0, 0, 0)); lp = legs.load()
        for y in range(body.height):
            for x in range(0, 12):
                if bp[x, y][3]:
                    lp[x, y] = bp[x, y]; bp[x, y] = (0, 0, 0, 0)
        moved = Image.new('RGBA', body.size, (0, 0, 0, 0)); mp = moved.load()
        for y in range(body.height):
            for x in range(0, 12):
                p = lp[x, y]
                if not p[3]:
                    continue
                d = round(kick[k] * (1 - x / 12) * (1 if y <= 11 else -1))
                if 0 <= y + d < body.height:
                    mp[x, y + d] = p
        body.alpha_composite(moved)
        fr.paste(body, (0, 4), body)
        px = fr.load()
        tx, ty = reach[k]
        pts = line(px, 28, 18, tx, ty, sleeve)
        for (x, y) in pts[-4:]:
            px[x, y] = hand
        outline(fr)
        sheets.append(fr)
    for k, fr in enumerate(sheets):
        out.paste(fr.resize((SW * S, SH * S), Image.NEAREST), (k * SW * S, 0))
    return out


if __name__ == '__main__':
    base = Image.open(os.path.join(ROOT, 'player.png')).convert('RGBA')
    masks = cape_masks(base)
    print('망토 칸(프레임별):', [len(m) for m in masks])
    for idn in IDS:
        sh = Image.open(os.path.join(ROOT, idn + '.png')).convert('RGBA')
        body, cape = split(sh, masks)
        body.resize((FW * N * S, FH * S), Image.NEAREST).save(os.path.join(ROOT, idn + '_body.png'))
        cape.resize((FW * N * S, FH * S), Image.NEAREST).save(os.path.join(ROOT, idn + '_cape.png'))
        swim(sh).save(os.path.join(ROOT, idn + '_swim.png'))
        print('wrote', idn, '_body _cape _swim')
