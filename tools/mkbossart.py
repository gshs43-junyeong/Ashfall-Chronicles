#!/usr/bin/env python3
"""보스 그림 둘을 굽는다 — ① 작던 보스 열둘을 2~3배로 다시 그리기 ② 모든 보스의 기술 자세(예고 · 내지르기) 시트.

① 원본(tools/art/boss_src/<id>.png · meta.json — 4배로 구운 1배 픽셀 그림)을 1배로 되읽어 Scale2x/Scale3x(EPX — 픽셀 그림의
   계단을 매끈한 대각으로 잇는 확대)로 키운 뒤, 큰 해상도에 맞는 결을 한 겹 더한다(위·왼쪽 테두리 빛 · 아래·오른쪽 그늘 · 넓은 면의 잔결).
   새 그림의 한 칸 = 게임 1px 이라 시트는 배율 1(manifest `scale: 1`)로 둔다 — 4배로 두면 열둘이 메모리를 수백 MB 먹는다.
② 기술 자세: 보스마다 기술 셋 + 필살기, 기술마다 예고 · 내지르기 두 장. 기술 틀(data/bossmoves.ts 의 k)에 따라
   내려찍기(웅크림 → 짓누름 · 흙먼지) · 부르기(뒤로 젖힘 · 진 → 앞으로 내밂 · 빛살) · 끌기(펼침 · 소용돌이 → 오므림) · 돌진(움츠림 → 앞으로 쏠림 · 잔상).
   같은 보스에 같은 틀이 둘 이상이면 다른 변주(머리 위 진 · 가슴 앞 구슬 · 발밑 고리)를 써서 기술마다 자세가 다르게 보인다.
   한 줄 = 한 마디(그 마디 첫 그림에서 만든다) · 맨 앞 칸은 손대지 않은 그림(여백 재기가 원래 시트와 같아지게).
★ 손그림 원본은 건드리지 않는다 — 다시 구우면 같은 결과(난수 없음).
쓰기: python3 tools/mkbossart.py → play/assets/boss/<id>.png(키운 것) · boss/<id>_pose.png + manifest → python3 tools/sync-manifest.py
"""
import json, math, os, re
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET = os.path.join(ROOT, 'play', 'assets')
SRC = os.path.join(ROOT, 'tools', 'art', 'boss_src')
MAN = os.path.join(ASSET, 'manifest.json')
# 키울 보스와 배율 — 유적 큰 홀(30×16칸)에서 싸우는 둘은 세 배, 나머지는 두 배
BIG = {'mine_horror': 3, 'blight_maw': 3, 'king_slime': 2, 'bone_lord': 2, 'corrupt_heart': 2, 'frost_witch': 2, 'void_king': 2,
       'storm_warden': 2, 'ice_warden': 2, 'vine_lord': 2, 'sand_guardian': 2, 'spore_queen': 2}

# ---------- 시트 읽기 · 쓰기 ----------
def frames_of(png, fw, fh, count, gap, S):
    a = np.array(Image.open(png).convert('RGBA'))
    out = []
    for i in range(count):
        x0 = i * (fw * S + gap)
        f = a[0:fh * S, x0:x0 + fw * S]
        out.append(f[::S, ::S].copy() if S > 1 else f.copy())
    return out

def sheet(frames, cols=None):
    cols = cols or len(frames); rows = math.ceil(len(frames) / cols)
    h, w = frames[0].shape[:2]
    out = np.zeros((h * rows, w * cols, 4), np.uint8)
    for i, f in enumerate(frames):
        r, c = divmod(i, cols); out[r * h:(r + 1) * h, c * w:(c + 1) * w] = f
    return out

# ---------- EPX 확대 ----------
def pack(a): return (a[..., 0].astype(np.uint32) << 24) | (a[..., 1].astype(np.uint32) << 16) | (a[..., 2].astype(np.uint32) << 8) | a[..., 3]
def unpack(p): return np.stack([(p >> 24) & 255, (p >> 16) & 255, (p >> 8) & 255, p & 255], -1).astype(np.uint8)

def scale2x(a):
    P = np.pad(pack(a), 1, mode='edge')
    E = P[1:-1, 1:-1]; A = P[:-2, 1:-1]; B = P[1:-1, 2:]; C = P[1:-1, :-2]; D = P[2:, 1:-1]
    h, w = E.shape; o = np.zeros((h * 2, w * 2), np.uint32)
    o[0::2, 0::2] = np.where((C == A) & (C != D) & (A != B), A, E)
    o[0::2, 1::2] = np.where((A == B) & (A != C) & (B != D), B, E)
    o[1::2, 0::2] = np.where((D == C) & (D != B) & (C != A), C, E)
    o[1::2, 1::2] = np.where((B == D) & (B != A) & (D != C), D, E)
    return unpack(o)

def scale3x(a):
    P = np.pad(pack(a), 1, mode='edge')
    A, B, C = P[:-2, :-2], P[:-2, 1:-1], P[:-2, 2:]
    D, E, F = P[1:-1, :-2], P[1:-1, 1:-1], P[1:-1, 2:]
    G, H, I = P[2:, :-2], P[2:, 1:-1], P[2:, 2:]
    h, w = E.shape; o = np.zeros((h * 3, w * 3), np.uint32)
    c1 = (D == B) & (D != H) & (B != F); c2 = (B == F) & (B != D) & (F != H)
    c3 = (D == H) & (D != B) & (H != F); c4 = (H == F) & (D != H) & (B != F)
    o[0::3, 0::3] = np.where(c1, D, E)
    o[0::3, 1::3] = np.where((c1 & (E != C)) | (c2 & (E != A)), B, E)
    o[0::3, 2::3] = np.where(c2, F, E)
    o[1::3, 0::3] = np.where((c1 & (E != G)) | (c3 & (E != A)), D, E)
    o[1::3, 1::3] = E
    o[1::3, 2::3] = np.where((c2 & (E != I)) | (c4 & (E != C)), F, E)
    o[2::3, 0::3] = np.where(c3, D, E)
    o[2::3, 1::3] = np.where((c3 & (E != I)) | (c4 & (E != G)), H, E)
    o[2::3, 2::3] = np.where(c4, F, E)
    return unpack(o)

def detail(a):
    """큰 해상도의 결 — 위·왼쪽 테두리 빛 · 아래·오른쪽 그늘 · 넓은 한 색 면에 잔결(칸 좌표 해시, 난수 없음)"""
    f = a.astype(np.int16); al = a[..., 3] > 0
    up = np.pad(al, ((1, 0), (0, 0)))[:-1]; lf = np.pad(al, ((0, 0), (1, 0)))[:, :-1]
    dn = np.pad(al, ((0, 1), (0, 0)))[1:]; rt = np.pad(al, ((0, 0), (0, 1)))[:, 1:]
    lit = al & (~up | ~lf); shd = al & (~dn | ~rt) & ~lit
    f[lit, :3] = np.minimum(255, f[lit, :3] * 1.14 + 6)
    f[shd, :3] = f[shd, :3] * 0.84
    p = pack(a); same = al & up & dn & lf & rt
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        same &= p == np.roll(np.roll(p, dy, 0), dx, 1)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    hsh = (xx * 73856093 ^ yy * 19349663) % 9
    f[same & (hsh == 0), :3] = f[same & (hsh == 0), :3] * 0.93
    f[same & (hsh == 4), :3] = np.minimum(255, f[same & (hsh == 4), :3] * 1.06)
    return np.clip(f, 0, 255).astype(np.uint8)

def enlarge(f, k):
    return detail(scale3x(f) if k == 3 else scale2x(f))

# ---------- 기술 자세 ----------
FAMILY = {'leap': 'slam', 'quake': 'slam', 'march': 'slam',
          'rain': 'cast', 'ring': 'cast', 'spiral': 'cast', 'homing': 'cast', 'beam': 'cast', 'wall': 'cast', 'zone': 'cast', 'clones': 'cast', 'rewind': 'cast',
          'vortex': 'pull', 'push': 'pull', 'summon': 'pull',
          'dash': 'lunge', 'blink': 'lunge', 'burrow': 'lunge'}

def boss_moves():
    """data/bossmoves.ts 에서 보스마다 (빛깔, [기술 셋의 k], 필살기 k)"""
    src = open(os.path.join(ROOT, 'src', 'game', 'data', 'bossmoves.ts'), encoding='utf8').read()
    out = {}
    for mo in re.finditer(r"^\s{2}(\w+): \{ c: '(#[0-9a-fA-F]{6})'", src, re.M):
        bid, col = mo.group(1), mo.group(2)
        rest = src[mo.end():]
        nxt = re.search(r"^\s{2}\w+: \{ c: '#", rest, re.M)
        blk = rest[:nxt.start()] if nxt else rest
        ks = re.findall(r"\{ k: '(\w+)'", blk)
        ult = re.search(r"ult: \{ k: '(\w+)'", blk)
        out[bid] = (col, ks[:3], ult.group(1) if ult else (ks[-1] if ks else 'ring'))
    return out

def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def warp(f, PW, PH, sx=1.0, sy=1.0, shear=0.0, bend=0.0, dx=0):
    """발끝 가운데를 잡고 늘이고 · 기울이고 · 휜다(역사상 · 가장 가까운 칸)"""
    fh, fw = f.shape[:2]; out = np.zeros((PH, PW, 4), np.uint8)
    ax, ay = (PW - fw) / 2 + fw / 2 + dx, PH                   # 출력의 발끝 자리
    Y, X = np.mgrid[0:PH, 0:PW]
    hy = (ay - Y - 0.5)                                         # 발에서 위로
    hs = hy / sy
    u = (X + 0.5 - ax - shear * hy - bend * hy * hy / max(1, fh)) / sx
    srcx = np.floor(fw / 2 + u).astype(int); srcy = np.floor(fh - hs).astype(int)
    ok = (srcx >= 0) & (srcx < fw) & (srcy >= 0) & (srcy < fh) & (hy >= 0)
    out[ok] = f[srcy[ok], srcx[ok]]
    return out

def aura(a, col, r):
    """윤곽 바깥에 빛 테 — r 칸, 바깥으로 옅게"""
    al = a[..., 3] > 0; out = a.copy(); ring = np.zeros(al.shape, bool); cur = al
    for i in range(r):
        grow = cur.copy()
        grow[1:] |= cur[:-1]; grow[:-1] |= cur[1:]; grow[:, 1:] |= cur[:, :-1]; grow[:, :-1] |= cur[:, 1:]
        edge = grow & ~cur & ~al
        out[edge] = (*col, int(200 * (1 - i / (r + 0.5))))
        cur = grow
    return out

def tint(a, col, k):
    out = a.astype(np.float32); al = a[..., 3] > 0
    for i in range(3): out[al, i] = out[al, i] * (1 - k) + col[i] * k
    return out.astype(np.uint8)

def paste_over(dst, src, alpha=1.0, ox=0):
    s = np.roll(src, ox, axis=1).astype(np.float32); d = dst.astype(np.float32)
    a = s[..., 3:4] / 255 * alpha
    out = d.copy(); out[..., :3] = s[..., :3] * a + d[..., :3] * (1 - a); out[..., 3:4] = np.maximum(d[..., 3:4], s[..., 3:4] * alpha)
    return out.astype(np.uint8)

def bbox(a):
    ys, xs = np.nonzero(a[..., 3])
    return (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else (0, 0, a.shape[1] - 1, a.shape[0] - 1)

def pose(f, PW, PH, fam, var, strike, col, ult):
    """한 장 — 틀(fam) · 변주(var) · 예고/내지르기 · 필살기면 더 세게"""
    g = 1.35 if ult else 1.0
    T = {('slam', 0): dict(sx=0.9, sy=1 + 0.14 * g), ('slam', 1): dict(sx=1 + 0.2 * g, sy=1 - 0.2 * g),
         ('cast', 0): dict(sy=1.05, shear=-0.16 * g, bend=-0.08), ('cast', 1): dict(sx=1.04, shear=0.12 * g, bend=0.06),
         ('pull', 0): dict(sx=1 + 0.16 * g, sy=0.94), ('pull', 1): dict(sx=1 - 0.1 * g, sy=1 + 0.06 * g),
         ('lunge', 0): dict(sy=0.86, shear=-0.22 * g, dx=-3), ('lunge', 1): dict(sx=1.1, shear=0.3 * g, dx=4)}[(fam, strike)]
    if fam == 'cast' and var == 1: T = dict(T, shear=-T.get('shear', 0) * 0.5, sy=T.get('sy', 1) * 1.04)   # 변주 — 곧추선 채
    if fam == 'cast' and var == 2: T = dict(T, sx=T.get('sx', 1) * 1.06, sy=T.get('sy', 1) * 0.96)
    if fam == 'slam' and var == 1: T = dict(T, shear=0.1 if strike else -0.1)
    if fam == 'pull' and var == 1: T = dict(T, shear=-0.08)
    body = warp(f, PW, PH, **T)
    rgb = hexrgb(col)
    if strike: body = tint(body, rgb, 0.22 * g)
    x0, y0, x1, y1 = bbox(body); w = x1 - x0
    lw = max(1, round(w / 45))                                   # 선 굵기 — 큰 보스는 굵게
    body = aura(body, rgb, (2 if ult else 1) + lw) if (strike or ult) else body
    im = Image.fromarray(np.zeros((PH, PW, 4), np.uint8)); x0, y0, x1, y1 = bbox(body)
    cx, w, h = (x0 + x1) / 2, x1 - x0, y1 - y0
    if fam == 'lunge' and strike:                                # 돌진 잔상
        ghost = tint(body, rgb, 0.6)
        im = Image.fromarray(paste_over(np.array(im), ghost, 0.35, -int(w * 0.18)))
        im = Image.fromarray(paste_over(np.array(im), ghost, 0.18, -int(w * 0.34)))
    # ★ 진 · 구슬 · 빛살 같은 공용 덧그림은 굽지 않는다 — 기술마다의 소품(고드름 · 해골 · 시계 …)은 게임이 그 기술을 보고 그린다
    #   (game/boss-tell-art). 여기는 몸짓만: 틀(fam)에 따른 휨 · 내지르기의 물든 윤곽 · 돌진 잔상.
    return paste_over(np.array(im), body, 1.0)

def build_pose(bid, frames, meta, mv):
    col, ks, uk = mv
    fh, fw = frames[0].shape[:2]
    PW, PH = int(math.ceil(fw * 1.6 / 2) * 2), int(math.ceil(fh * 1.35))
    idle = meta['count'] - meta.get('death', 0)
    rows = max(1, idle // 2)
    fams = [FAMILY.get(k, 'cast') for k in ks] + [FAMILY.get(uk, 'cast')]
    var, seen = [], {}
    for fm in fams[:3]: var.append(seen.get(fm, 0)); seen[fm] = seen.get(fm, 0) + 1
    var.append(seen.get(fams[3], 0) % 3)
    out = []
    for r in range(rows):
        f = frames[r * 2]
        out.append(warp(f, PW, PH))                              # 0번 — 손대지 않은 그림(여백 재기용)
        for i in range(4):
            for s in (0, 1): out.append(pose(f, PW, PH, fams[i], var[i] % 3, s, col, i == 3))
    return sheet(out, 9), PW, PH, rows

def main():
    man = json.load(open(MAN, encoding='utf8'))
    B = man['bosses']; src_meta = json.load(open(os.path.join(SRC, 'meta.json'), encoding='utf8'))
    moves = boss_moves()
    for bid, m in list(B['sheets'].items()):
        if bid.endswith('_pose'): continue
        if bid in BIG:
            sm = src_meta['sheets'][bid]; k = BIG[bid]
            fr = frames_of(os.path.join(SRC, bid + '.png'), sm['frameW'], sm['frameH'], sm['count'], sm.get('gap', src_meta['gap']), src_meta['scale'])
            fr = [enlarge(f, k) for f in fr]
            Image.fromarray(sheet(fr)).save(os.path.join(ASSET, sm['file']), optimize=True)
            nm = dict(sm); nm.update(frameW=sm['frameW'] * k, frameH=sm['frameH'] * k, foot=round(sm.get('foot', 0) * k, 2),
                                     side=round(sm.get('side', 0) * k, 2), scale=1, gap=0, big=k)
            B['sheets'][bid] = nm; m = nm
        else:
            S = m.get('scale', B['scale']); fr = frames_of(os.path.join(ASSET, m['file']), m['frameW'], m['frameH'], m['count'], m.get('gap', B['gap']), S)
        if bid not in moves: continue
        img, PW, PH, rows = build_pose(bid, fr, m, moves[bid])
        file = f'boss/{bid}_pose.png'
        Image.fromarray(img).save(os.path.join(ASSET, file), optimize=True)
        B['sheets'][bid + '_pose'] = {'file': file, 'frameW': PW, 'frameH': PH, 'count': rows * 9, 'cols': 9, 'scale': 1, 'gap': 0,
                                      'foot': m.get('foot', 0), 'side': m.get('side', 0), 'pose': 1}
        print(f'{bid}: {"×%d " % BIG[bid] if bid in BIG else ""}자세 {rows}줄 × 9 ({PW}×{PH})')
    json.dump(man, open(MAN, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    open(MAN, 'a').write('\n')

if __name__ == '__main__':
    main()
