#!/usr/bin/env python3
"""주인공 '인형'(리그) 시트를 굽는다 — 몸 13장 + 헤엄 4장, 캐릭터 여섯.

    python3 tools/mkplayer.py            # 굽고 manifest.json 의 player_*_rig / _swim 을 고친다
    python3 tools/sync-manifest.py       # 그다음 매니페스트 옮겨 적기

★ 왜 다시 그렸나 — 원래 시트(char/player_<id>.png)는 팔 · 망토 · 다리를 한 장에 구워 두었다.
  그래서 세 가지가 끝내 안 맞았다.
    ① 무기는 코드가 고정된 자리(몸 가운데)에 그리는데 그림의 손은 프레임마다 다른 곳에 있어
       **손과 무기가 따로 놀았다.**
    ② 망토가 그림에 박혀 있어 달려도 떨어져도 등에 붙은 채였고, 떼어 내 흔들어 봐도 몸 그림에
       남은 윤곽·팔과 겹쳐 어색했다.
    ③ 헤엄 그림을 선 그림에서 만들면 이미 그려진 두 팔 위에 젓는 팔이 하나 더 붙어 **팔이 셋**이 됐고,
       프레임 폭(22칸)이 좁아 걷는 다리 끝이 잘렸다.
  지금은 **몸(머리·몸통·다리)만** 굽고, 두 팔과 망토는 게임이 그린다(game.js drawRigPlayer).
    · 팔: 어깨 자리(프레임마다 manifest rig.fs · rig.bs)에서 손까지. 손이 곧 무기 자루 자리라 늘 맞는다.
    · 망토: 목 뒤(rig.nk)에 매단 줄(점 일곱)을 흔들어 그린다 — 몸이 움직이면 늦게 따라온다.
    · 헤엄: 누운 몸만 굽고 두 팔은 게임이 크롤 박자로 돌린다 — 팔은 언제나 둘이다.

  머리·몸통은 각 캐릭터 원래 그림을 그대로 떼어 쓴다(누구인지는 머리·옷이 말한다). 다리는 원래
  그림의 바지·장화 색으로 **새로 그린다** — 걷기·점프·대시마다 무릎을 굽힌 자세를 줄 수 있게.
  프레임은 32×44(원래 22×41 + 여백) — 보폭이 커도 발끝이 안 잘린다.

  원래 시트 여섯은 같은 모양의 색 바꿈이라(알파 차이는 머리 위쪽뿐) 떼어 낼 자리(팔·망토)는
  player_wanderer.png 한 장에서 색으로 골라 다섯 장에 같은 자리로 쓴다.
  (옛 공용 시트 char/player.png 는 player_wanderer.png 와 픽셀까지 같아서 지웠다 — 이 도구가 지운다.)
"""
import json, math, os
from collections import Counter
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', 'game', 'assets')
CHAR = os.path.join(ROOT, 'char')
S = 4                                    # 시트는 4배
OW, OH = 22, 41                          # 원래 프레임
FW, FH = 32, 44                          # 새 프레임
OX, OY = 5, 3                            # 원래 좌표 → 새 좌표
SW, SH = 48, 28                          # 헤엄 프레임
OUT = (12, 12, 17, 255)
IDS = ['player_wanderer', 'player_digger', 'player_ranger', 'player_adept', 'player_stray']

# player.png 기준 색 — 망토 · 뒷팔(소매 끝·손) · 앞팔(소매·손)
CAPE = {(0x33, 0x3a, 0x4e), (0x25, 0x2b, 0x3a), (0x4a, 0x50, 0x65), (0x1e, 0x23, 0x30), (0x3f, 0x44, 0x52)}
BACKARM = {(0x38, 0x29, 0x1d), (0xb0, 0x85, 0x5c), (0x3e, 0x39, 0x33), (0x55, 0x51, 0x4b)}
FRONTARM = {(0x4a, 0x36, 0x26), (0xe6, 0xbb, 0x8a), (0xe9, 0xc3, 0x98), (0x1d, 0x1f, 0x29), (0xbd, 0x99, 0x71), (0x62, 0x5b, 0x50)}

HIP_Y = 28                               # 원래 좌표에서 다리가 시작하는 줄
THIGH, SHIN = 5, 4                       # 넓적다리 · 정강이 길이(칸)
LEG_W = 4

# 프레임: [이름, 몸 dx, 몸 dy, 뒷다리(넓적 각, 무릎), 앞다리(넓적 각, 무릎), 땅에 붙이나]
#   각은 도(°), 앞(+x)으로 내미는 쪽이 +. 무릎은 뒤로 굽는 만큼.
FRAMES = [
    ['idle1', 0, 0, (-4, 0), (5, 0), True],
    ['idle2', 0, 1, (-4, 4), (5, 4), True],
    ['walk1', 0, 0, (-26, 6), (26, 10), True],
    ['walk2', 0, -1, (-6, 34), (12, 0), True],
    ['walk3', 0, 0, (24, 10), (-26, 6), True],
    ['walk4', 0, -1, (12, 0), (-6, 34), True],
    ['jump', 0, -1, (-14, 64), (34, 72), False],
    ['fall', 0, 0, (-18, 22), (20, 30), False],
    ['dash', 2, 1, (-48, 12), (42, 24), True],
    ['atk1', 1, 0, (-22, 10), (22, 16), True],
    ['atk2', 2, 1, (-32, 16), (32, 22), True],
    ['atk3', 1, 0, (-26, 10), (26, 16), True],
    ['hurt', -1, 0, (-12, 22), (12, 22), True],
]


def frame0(path):
    im = Image.open(path).convert('RGBA')
    return im.crop((0, 0, OW * S, OH * S)).resize((OW, OH), Image.NEAREST)


def masks(base):
    """player.png 첫 프레임에서 떼어 낼 칸 — 망토·뒷팔·앞팔(+ 거기에만 닿은 윤곽)"""
    px = base.load()
    cape, back, front = set(), set(), set()
    for y in range(9, OH):
        for x in range(OW):
            p = px[x, y]
            if p[3] < 128:
                continue
            c = p[:3]
            if c in CAPE and x <= 6:
                cape.add((x, y))
            elif c in BACKARM and x <= 6 and 17 <= y <= 30:
                back.add((x, y))
            elif c in FRONTARM and x >= 13 and 18 <= y <= 30:
                front.add((x, y))
    gone = cape | back | front
    edge = set()
    for y in range(9, OH):
        for x in range(OW):
            if px[x, y][3] < 128 or px[x, y][:3] != OUT[:3]:
                continue
            nb = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            solid = [q for q in nb if 0 <= q[0] < OW and 0 <= q[1] < OH and px[q][3] > 127 and px[q][:3] != OUT[:3]]
            if solid and all(q in gone for q in solid):
                edge.add((x, y))
    return gone | edge, cape, back, front


def most(px, pts):
    cnt = Counter(px[p][:3] for p in pts if px[p][3] > 127 and px[p][:3] != OUT[:3])
    return cnt.most_common(1)[0][0] if cnt else (80, 80, 80)


def hexc(c):
    return '#%02x%02x%02x' % tuple(c[:3])


def palette(f, cape, back, front):
    px = f.load()
    sleeve = most(px, [p for p in front if p[1] <= 24])
    hand = most(px, [p for p in front if p[1] >= 25])
    capes = Counter(px[p][:3] for p in cape if px[p][3] > 127).most_common(3)
    cc = [c for c, _ in capes] + [(40, 40, 50)] * 3
    return {
        'sleeve': hexc(sleeve), 'hand': hexc(hand), 'cuff': hexc(most(px, [p for p in back if p[1] <= 24] or list(back))),
        'cape': [hexc(cc[0]), hexc(cc[1]), hexc(cc[2])],
        'pant': px[9, 32][:3], 'pant2': px[13, 32][:3],
        'boot': px[10, 39][:3], 'sole': px[10, 40][:3],
    }


def upper(f, gone):
    """머리+몸통+엉덩이(원래 0~HIP_Y 줄) — 팔·망토를 떼고, 앞팔이 가리던 몸통 옆구리를 메운다"""
    im = Image.new('RGBA', (OW, HIP_Y + 1), (0, 0, 0, 0))
    src, dst = f.load(), im.load()
    for y in range(HIP_Y + 1):
        for x in range(OW):
            if (x, y) in gone or src[x, y][3] < 128:
                continue
            dst[x, y] = src[x, y]
    # ★ 몸통은 줄마다 **한 덩어리 띠**로 다듬는다 — 팔·망토를 떼고 나면 옆구리에 구멍(앞팔 자리 x14~16)과
    #   떨어진 부스러기(어깨 위 망토 윤곽, 앞쪽의 망토색 한 줄)가 남았다. 목도리 아래(12줄~)는 몸통 폭
    #   5~16(엉덩이 5~15)만 남기고, 그 안의 빈칸·안쪽 윤곽은 같은 줄 왼쪽(없으면 오른쪽) 몸 색으로 메운다.
    for y in range(12, HIP_Y + 1):
        lo, hi = 5, (16 if y <= 24 else 15)
        for x in range(OW):
            if x < lo or x > hi:
                dst[x, y] = (0, 0, 0, 0)
        row = [dst[x, y] for x in range(lo, hi + 1)]
        ok = lambda c: c[3] and c[:3] != OUT[:3] and c[:3] not in CAPE
        for i in range(len(row)):
            if ok(row[i]):
                continue
            fill = next((row[j] for j in range(i - 1, -1, -1) if ok(row[j])), None) \
                or next((row[j] for j in range(i + 1, len(row)) if ok(row[j])), None)
            if fill:
                row[i] = fill
        for i, c in enumerate(row):
            dst[lo + i, y] = c
    return im


def disc(px, w, h, x, y, r, c):
    for yy in range(int(y - r) - 1, int(y + r) + 2):
        for xx in range(int(x - r) - 1, int(x + r) + 2):
            if 0 <= xx < w and 0 <= yy < h and (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r:
                px[xx, yy] = c


def seg(px, w, h, a, b, r, c):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
    for i in range(n + 1):
        t = i / n
        disc(px, w, h, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, c)


def leg_points(hip, th, kn, flip=False):
    """넓적다리·정강이 끝점. 각은 수직 아래에서 앞(+x)으로 잰다"""
    t1 = math.radians(th)
    knee = (hip[0] + math.sin(t1) * THIGH, hip[1] + math.cos(t1) * THIGH)
    t2 = math.radians(th - kn)
    ank = (knee[0] + math.sin(t2) * SHIN, knee[1] + math.cos(t2) * SHIN)
    return knee, ank


def draw_leg(img, hip, th, kn, col, pal, outline_first):
    px = img.load(); w, h = img.size
    knee, ank = leg_points(hip, th, kn)
    boot = [(ank[0] + dx, ank[1] + 1.2) for dx in (-1.2, 0.4, 1.8)]
    if outline_first:                                          # 앞다리는 제 윤곽을 먼저 둘러 뒷다리와 갈라 보이게
        seg(px, w, h, hip, knee, LEG_W / 2 + 1, OUT); seg(px, w, h, knee, ank, LEG_W / 2 + 1, OUT)
        for b in boot:
            disc(px, w, h, b[0], b[1], 2.1, OUT)
    seg(px, w, h, hip, knee, LEG_W / 2, col + (255,))
    seg(px, w, h, knee, ank, LEG_W / 2 - 0.2, col + (255,))
    for b in boot:
        disc(px, w, h, b[0], b[1], 1.5, pal['boot'] + (255,))
    for dx in range(-2, 4):                                    # 밑창 — 발끝 쪽으로
        x, y = int(round(ank[0] + dx)), int(round(ank[1] + 2.4))
        if 0 <= x < w and 0 <= y < h and px[x, y][3]:
            px[x, y] = pal['sole'] + (255,)
    return max(b[1] for b in boot) + 2.4


def outline(img):
    src = img.copy().load(); px = img.load(); w, h = img.size
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if 0 <= q[0] < w and 0 <= q[1] < h and src[q][3] and src[q][:3] != OUT[:3]:
                    px[x, y] = OUT
                    break


def compose(up, pal, spec, w=FW, h=FH):
    name, dx, dy, bl, fl, grounded = spec
    # 발바닥 높이를 먼저 재서, 땅에 붙는 프레임은 가장 낮은 발이 맨 아래 줄에 닿게 몸 전체를 내린다
    hipB = (OX + 9 + dx, OY + HIP_Y + dy); hipF = (OX + 13 + dx, OY + HIP_Y + dy)
    lowest = max(leg_points(hipB, *bl)[1][1], leg_points(hipF, *fl)[1][1]) + 1.2 + 2.4
    sink = int(round((h - 1) - lowest)) if grounded else 0
    dy += sink
    hipB = (hipB[0], hipB[1] + sink); hipF = (hipF[0], hipF[1] + sink)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw_leg(img, hipB, bl[0], bl[1], pal['pant2'], pal, False)
    img.alpha_composite(up, (OX + dx, OY + dy))
    draw_leg(img, hipF, fl[0], fl[1], pal['pant'], pal, True)
    outline(img)
    # 닻 — 앞어깨 · 뒷어깨 · 목 뒤(망토)
    anchors = {'fs': [OX + 15 + dx, OY + 13 + dy], 'bs': [OX + 6 + dx, OY + 13 + dy], 'nk': [OX + 6 + dx, OY + 11 + dy]}
    return img, anchors


def tint_hurt(img):
    px = img.load(); w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a or (r, g, b) == OUT[:3]:
                continue
            l = (r * 0.3 + g * 0.59 + b * 0.11) / 255
            px[x, y] = (int(90 + 150 * l), int(30 + 60 * l), int(28 + 50 * l), a)


def swim_frames(up, pal):
    """누운 몸 네 장 — 팔 없이. 머리가 오른쪽(앞), 등이 위. 다리는 가위차기"""
    out = []
    kicks = [(-12, 14), (4, -2), (12, -14), (-4, 2)]
    for k, (a, b) in enumerate(kicks):
        img = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        hipB = (OX + 9, OY + HIP_Y); hipF = (OX + 13, OY + HIP_Y)
        draw_leg(img, hipB, a, 8, pal['pant2'], pal, False)
        img.alpha_composite(up, (OX, OY))
        draw_leg(img, hipF, b, 8, pal['pant'], pal, True)
        outline(img)
        lying = img.transpose(Image.Transpose.ROTATE_270)      # 44×32 — 머리 오른쪽, 등 위
        fr = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
        fr.alpha_composite(lying.crop((0, 2, 44, 30)), (2, 0))
        out.append(fr)
    # 누운 좌표의 닻: 원래 (x, y) → 누운 (FH-1-(y), x) → 자르기(-2 세로) · 붙이기(+2 가로)
    def lay(p):
        return [FH - 1 - p[1] + 2, p[0] - 2]
    anchors = {'fs': lay([OX + 15, OY + 13]), 'bs': lay([OX + 6, OY + 13]), 'nk': lay([OX + 6, OY + 11])}
    return out, anchors


def sheet(frames, w, h):
    im = Image.new('RGBA', (w * len(frames) * S, h * S), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f.resize((w * S, h * S), Image.NEAREST), (i * w * S, 0))
    return im


def main():
    base = frame0(os.path.join(CHAR, 'player_wanderer.png'))
    gone, cape, back, front = masks(base)
    man_p = os.path.join(ROOT, 'manifest.json')
    man = json.load(open(man_p, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for idn in IDS:
        f = frame0(os.path.join(CHAR, idn + '.png'))
        pal = palette(f, cape, back, front)
        up = upper(f, gone)
        frames, fs, bs, nk = [], [], [], []
        for spec in FRAMES:
            img, an = compose(up, pal, spec)
            if spec[0] == 'hurt':
                tint_hurt(img)
            frames.append(img); fs.append(an['fs']); bs.append(an['bs']); nk.append(an['nk'])
        sheet(frames, FW, FH).save(os.path.join(CHAR, idn + '_rig.png'))
        sw, swa = swim_frames(up, pal)
        sheet(sw, SW, SH).save(os.path.join(CHAR, idn + '_swim.png'))
        rig = {'sleeve': pal['sleeve'], 'hand': pal['hand'], 'cuff': pal['cuff'], 'cape': pal['cape'],
               'fs': fs, 'bs': bs, 'nk': nk, 'swim': swa}
        sheets[idn + '_rig'] = {'file': 'char/%s_rig.png' % idn, 'frameW': FW, 'frameH': FH,
                                'ox': -1 - OX, 'oy': -1 - OY, 'count': len(FRAMES), 'rig': rig}
        sheets[idn + '_swim'] = {'file': 'char/%s_swim.png' % idn, 'frameW': SW, 'frameH': SH, 'count': 4}
        for suf in ('_body', '_cape'):                       # 옛 망토 떼기(mkswim.py) 산출물은 쓰지 않는다
            sheets.pop(idn + suf, None)
            p = os.path.join(CHAR, idn + suf + '.png')
            if os.path.exists(p):
                os.remove(p)
        print('wrote', idn, '_rig', '_swim')
    # 옛 공용 시트와 그 파생물 — 캐릭터마다 제 시트가 있어 아무도 안 쓴다
    for key in ('player', 'player_rig', 'player_swim'):
        sheets.pop(key, None)
        p = os.path.join(CHAR, key + '.png')
        if os.path.exists(p):
            os.remove(p)
    json.dump(man, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(man_p, 'a', encoding='utf-8').write('\n')


if __name__ == '__main__':
    main()
