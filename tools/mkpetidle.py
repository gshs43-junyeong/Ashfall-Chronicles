#!/usr/bin/env python3
"""떠 있기 장이 거의 같은 펫에 사이 장을 구워 넣는다 — 원본 세 장(떠 있기 0·1 · 공격 2)은 그대로 두고
떠 있기를 네 장 고리(0 → 사이 → 1 → 사이)로 늘린다. 매니페스트에 `idle: 4` 를 적으면 drawPet 이 넷을 돌고 공격은 5번째 장.

  python3 tools/mkpetidle.py     # tools/art/pets/<id>.png(원본) → play/assets/char/pet_<id>.png + 매니페스트 → 그다음 sync-manifest.py

■ 왜 그림을 통째로 돌리지 않나 — 몸 전체를 기울이거나 가로로 접으면(예전 PET_MOTION tilt · flapX) 날갯짓이 아니라 그림이 흔들려 보였다.
  움직여야 하는 부위만 칸 단위로 옮긴다:
  · 날개(나방 · 매) — 몸통 축에서 먼 열일수록 많이 올리고 내린다(열마다 통째로 옮겨 구멍이 안 난다). 매는 발(아래 줄)은 그대로.
  · 공허의 유생 — 몸이 한 칸 솟으며 다리가 모이고, 한 칸 주저앉으며 다리가 벌어진다(해파리처럼 맥박).
★ 게임 폴더의 시트를 다시 먹이지 말 것 — 원본은 tools/art/pets/ 다(장 수가 늘어난다)."""
import json, os
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
ART = os.path.join(ROOT, 'tools', 'art', 'pets')
CHAR = os.path.join(ROOT, 'play', 'assets', 'char')
MAN = os.path.join(ROOT, 'play', 'assets', 'manifest.json')
S = 4


def load(pid):
    im = Image.open(os.path.join(ART, pid + '.png')).convert('RGBA')
    W, H = im.width // S // 3, im.height // S
    g = im.resize((im.width // S, H), Image.NEAREST)
    return [g.crop((i * W, 0, (i + 1) * W, H)) for i in range(3)], W, H


def blank(W, H): return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def shift_cols(f, dy_of, keep=lambda x, y: False):
    """열마다 dy_of(x) 칸 옮긴다. keep(x, y) 인 칸은 제자리(먼저 깔고 옮긴 것을 위에)."""
    W, H = f.size; src = f.load(); out = blank(W, H); o = out.load()
    for y in range(H):
        for x in range(W):
            if src[x, y][3] and keep(x, y): o[x, y] = src[x, y]
    for y in range(H):
        for x in range(W):
            if not src[x, y][3] or keep(x, y): continue
            ny = y + dy_of(x)
            if 0 <= ny < H: o[x, ny] = src[x, y]
    return out


def moth(fr, W, H):
    cx = 14                                              # 몸통 가운데 열(12~16 이 몸)
    wing = lambda s: shift_cols(fr[0], lambda x: round(s * max(0, abs(x - cx) - 2) * 0.45))
    return [fr[0], wing(-0.8), fr[1], wing(0.7)]


def falcon(fr, W, H):
    sx = 10                                              # 어깨 열 — 그 왼쪽이 들린 날개·꼬리
    wing = lambda s: shift_cols(fr[0], lambda x: round(s * max(0, sx - x) * 0.5), keep=lambda x, y: y >= 12)
    return [fr[0], wing(-0.9), fr[1], wing(0.8)]


def hatchling(fr, W, H):
    leg_y, cx = 11, 12                                   # 11줄부터 다리
    def pulse(f, body_dy, spread):
        src = f.load(); out = blank(W, H); o = out.load()
        for y in range(leg_y, H):                        # 다리 — 가운데에서 벌어지거나 모인다
            for x in range(W):
                if src[x, y][3]:
                    nx = x + (spread if x >= cx else -spread)
                    if 0 <= nx < W: o[nx, y] = src[x, y]
        for y in range(leg_y):                           # 몸 — 솟거나 주저앉는다
            for x in range(W):
                if src[x, y][3] and 0 <= y + body_dy < H: o[x, y + body_dy] = src[x, y]
        if body_dy < 0:                                  # 솟으면 몸 밑줄을 한 줄 늘여 다리와 잇는다
            for x in range(W):
                if src[x, leg_y - 1][3]: o[x, leg_y - 1] = src[x, leg_y - 1]
        return out
    return [fr[0], pulse(fr[0], -1, -1), fr[1], pulse(fr[1], 1, 1)]


PETS = {'glass_moth': moth, 'storm_falcon': falcon, 'void_hatchling': hatchling}


def main():
    man = json.load(open(MAN, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for pid, fn in PETS.items():
        fr, W, H = load(pid)
        frames = fn(fr, W, H) + [fr[2]]
        for i, f in enumerate(frames):                   # 칸 테두리에 닿으면 잘린다 — 멈춘다
            px = f.load()
            edge = [(x, y) for y in range(H) for x in range(W) if (x in (0, W - 1) or y in (0, H - 1)) and px[x, y][3]]
            assert not edge, f'{pid}#{i} 테두리 {edge[:4]}'
        sheet = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
        for i, f in enumerate(frames): sheet.alpha_composite(f, (i * W, 0))
        sheet.resize((sheet.width * S, H * S), Image.NEAREST).save(os.path.join(CHAR, f'pet_{pid}.png'))
        sheets['pet_' + pid].update(count=len(frames), idle=4)
        print(pid, W, H, len(frames))
    json.dump(man, open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(MAN, 'a', encoding='utf-8').write('\n')


if __name__ == '__main__':
    main()
