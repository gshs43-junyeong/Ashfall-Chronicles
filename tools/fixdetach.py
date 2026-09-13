#!/usr/bin/env python3
"""걸을 때 몸에서 떨어져 나오는 조각을 찾아 도로 붙인다.

리베터는 걷는 둘째 그림(프레임 3)에서 **머리가 몸 위로 8px 떠 있었다.** 서 있을 때는
붙어 있다가 걸을 때만 떨어지니, 지나가는 것을 보면 머리가 따로 떠서 따라오는 것처럼
보인다.

시트 한 장은 일곱 칸이다 — idle1 idle2 move1 move2 atk death1 death2.

찾는 법 — 알파가 있는 픽셀을 8방향으로 묶어(연결 요소) 프레임마다 덩어리 수를 센다.
  · 서 있는 그림(0·1)이 **한 덩어리**인데 걷는 그림(2·3)에서 둘 이상 → 그 프레임이 깨진 것
  · 서 있을 때부터 떨어져 있으면 원래 그런 것이다(떠다니는 눈알·촉수·포자 갓).
    실제로 mold_walker 와 crimson_eye 는 모든 프레임에서 틈이 4px·8px 로 **일정**했다 —
    이런 것을 붙이면 고치는 게 아니라 디자인을 바꾸는 것이다.
  · ★ **걷는 두 칸만 본다.** 죽는 그림(5·6)은 조각이 흩어지는 것이 그림의 목적이고,
    공격(4)도 포자를 뿌리거나 덩굴을 휘두르느라 떨어진 조각이 생긴다. 처음에 일곱 칸을
    다 보게 했더니 시트 스물셋이 걸렸는데 그 대부분이 죽는 그림이었다 — 그것을 도로
    붙이면 죽는 연출이 통째로 없어진다.

고치는 법 — 떨어진 조각을 몸에 닿을 때까지 **가장 조금** 움직인다. 아래로 붙는 것을
먼저 보고(머리가 뜬 경우가 대부분이다), 한도(MAXMOVE)를 넘어야 붙는 것은 건드리지
않고 알리기만 한다. 조각을 통째로 옮기는 것이라 그림 자체는 한 픽셀도 안 바뀐다.

  python3 tools/fixdetach.py            # 찾기만(아무것도 안 쓴다)
  python3 tools/fixdetach.py --write    # 고쳐서 저장
"""
import os
import sys
from collections import deque

from PIL import Image

DIR = 'game/assets/char'
FRAMES = 7          # 시트는 전부 가로 일곱 칸(manifest 의 count)
ALPHA = 24          # 이 아래는 거의 안 보이는 픽셀이라 없는 셈 친다
MINPX = 8           # 이보다 작은 덩어리는 먼지(눈 반짝임)라 세지 않는다
IDLE = (0, 1)       # 서 있는 그림 — 이게 성한지로 "원래 그런 것"을 가른다
MOVE = (2, 3)       # 걷는 그림 — 여기만 고친다(4 공격, 5·6 죽음은 흩어지는 게 맞다)
MAXMOVE = 12        # 4배 시트 기준 12px = 원본 3px. 이보다 멀면 손대지 않는다


def components(mask, w, h):
    """8방향으로 이어진 덩어리 목록. 각 덩어리는 인덱스 집합이다."""
    seen = bytearray(w * h)
    out = []
    for i in range(w * h):
        if seen[i] or not mask[i]:
            continue
        q = deque([i])
        seen[i] = 1
        cur = []
        while q:
            j = q.popleft()
            cur.append(j)
            y, x = divmod(j, w)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w:
                        k = ny * w + nx
                        if not seen[k] and mask[k]:
                            seen[k] = 1
                            q.append(k)
        if len(cur) >= MINPX:
            out.append(cur)
    return out


def touches(piece, main, w, h, dx, dy):
    """조각을 (dx,dy) 옮기면 본체에 닿는가(겹치는 것도 닿은 것으로 본다)."""
    for j in piece:
        y, x = divmod(j, w)
        ny, nx = y + dy, x + dx
        if not (0 <= ny < h and 0 <= nx < w):
            return False          # 칸 밖으로 나가면 안 된다
        for ay in (-1, 0, 1):
            for ax in (-1, 0, 1):
                by, bx = ny + ay, nx + ax
                if 0 <= by < h and 0 <= bx < w and (by * w + bx) in main:
                    return True
    return False


def best_move(piece, main, w, h):
    """가장 적게 움직여 붙는 (dx,dy). 아래로 내리는 쪽을 먼저 본다."""
    cands = []
    for dy in range(0, MAXMOVE + 1):
        for dx in range(-4, 5):
            if dx == 0 and dy == 0:
                continue
            # 비용: 세로를 싸게 친다 — 뜬 머리를 내리는 것이 이 버그의 본래 모습이다
            cands.append((dy * dy + dx * dx * 4, dx, dy))
    for dy in range(-MAXMOVE, 0):
        for dx in range(-4, 5):
            cands.append((dy * dy * 2 + dx * dx * 4, dx, dy))
    cands.sort()
    for _, dx, dy in cands:
        if touches(piece, main, w, h, dx, dy):
            return dx, dy
    return None


def scan(path, write):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    if W % FRAMES:
        return None
    fw = W // FRAMES
    alpha = im.getchannel('A')

    per = {}
    for fi in range(FRAMES):
        band = alpha.crop((fi * fw, 0, (fi + 1) * fw, H))
        mask = bytearray(1 if v >= ALPHA else 0 for v in band.getdata())
        per[fi] = components(mask, fw, H)

    # 서 있을 때부터 여러 덩어리면 원래 그렇게 생긴 것이다 — 건드리지 않는다
    if any(len(per[i]) != 1 for i in IDLE):
        return None

    fixes, skipped = [], []
    for fi in MOVE:
        comps = sorted(per[fi], key=len, reverse=True)
        if len(comps) < 2:
            continue
        main = set(comps[0])
        for piece in comps[1:]:
            mv = best_move(piece, main, fw, H)
            if mv is None:
                skipped.append((fi, len(piece)))
                continue
            fixes.append((fi, piece, mv, len(piece)))

    if not fixes and not skipped:
        return None

    if write and fixes:
        for fi, piece, (dx, dy), _ in fixes:
            band = im.crop((fi * fw, 0, (fi + 1) * fw, H))
            moved = Image.new('RGBA', (fw, H), (0, 0, 0, 0))
            px = band.load()
            mp = moved.load()
            for j in piece:
                y, x = divmod(j, fw)
                mp[x + dx, y + dy] = px[x, y]
                px[x, y] = (0, 0, 0, 0)      # 원래 자리는 비운다
            band.alpha_composite(moved)
            im.paste(band, (fi * fw, 0))
        im.save(path)

    return {'file': os.path.basename(path), 'fixes': fixes, 'skipped': skipped}


def main():
    write = '--write' in sys.argv
    rows = []
    for f in sorted(os.listdir(DIR)):
        if not f.endswith('.png'):
            continue
        r = scan(os.path.join(DIR, f), write)
        if r:
            rows.append(r)

    if not rows:
        print('떨어져 나온 조각 없음.')
        return
    for r in rows:
        print(r['file'])
        for fi, _, (dx, dy), n in r['fixes']:
            print(f"  프레임 {fi}: {n:5}px 조각을 ({dx:+d},{dy:+d}) 옮겨 붙임")
        for fi, n in r['skipped']:
            print(f"  프레임 {fi}: {n:5}px 조각 — {MAXMOVE}px 안에서 안 붙어 **그대로 뒀다**")
    print(f"\n{'고쳤다' if write else '찾기만 했다(--write 로 저장)'}: 시트 {len(rows)}개")


if __name__ == '__main__':
    main()
