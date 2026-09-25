#!/usr/bin/env python3
"""상인 NPC 굽기 — 잡화상(pedlar) · 재료상(oreman) · 장비상(armsman) · 윤슬(yunseul).

예전 세 장은 다른 NPC 열 명과 따로 그려져 검은 윤곽선이 없고, 눈이 2x2, 키가 2~4칸 작았다.
그래서 다른 NPC가 공유하는 몸 틀(tools/art/npc_template.png — 24x40, 윤곽선 #14111a, 눈 1칸)에서
옷 색을 바꾸고 소품(모자·짐·곡괭이·갑옷·검)을 윤곽선째 덧그린다. 두 번째 장은 다른 NPC처럼
윗몸(0~26줄)만 한 칸 내려 숨 쉬게 한다. 4배로 키워 char/npc_<id>.png 로 쓰고 매니페스트 foot/side 를 잰다.
윤슬은 일곱 장짜리 제 그림(tools/art/yunseul_src.png)이 있어 몸을 바꾸지 않고, 장마다 같은 윤곽선을 두르고
2x2 눈을 한 칸으로 줄인다. ★ 게임 폴더의 시트를 다시 먹이지 말 것 — 윤곽선이 두 겹이 된다.
"""
import json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'tools', 'art', 'npc_template.png')
CHAR = os.path.join(ROOT, 'game', 'assets', 'char')
MAN = os.path.join(ROOT, 'game', 'assets', 'manifest.json')
W, H, K = 24, 40, 4
OUT = (0x14, 0x11, 0x1a, 255)


def hx(s):
    s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


# 틀의 색 → 이름 (npc_haran 첫 장에서 읽은 것)
T = {'hair': '#3a2a1a', 'hairS': '#5c4426', 'beard': '#7c5e34', 'skin': '#e2ae83', 'skinS': '#c98d63', 'skinD': '#8c5a3a',
     'eye': '#1d1720', 'cloth': '#d8cdb0', 'clothS': '#b4a888', 'tunic': '#8c7444', 'tunicD': '#5a4a2e', 'tunicL': '#b09456',
     'mug1': '#e8e0c8', 'mug2': '#c8bc9c', 'mug3': '#8a5a2a', 'mug4': '#8a8068', 'belt': '#3a3028',
     'pants': '#8e7c5c', 'pantsD': '#6b5c44', 'pantsS': '#4a4030', 'boot': '#57493c', 'bootD': '#3a3024', 'bootX': '#241d18'}
T = {k: hx(v) for k, v in T.items()}


class Pic:
    def __init__(self, im):
        self.im = im.copy(); self.px = self.im.load(); self.new = set()

    def recolor(self, m):
        for y in range(H):
            for x in range(W):
                p = self.px[x, y]
                for k, v in m.items():
                    if p == T[k]: self.px[x, y] = hx(v) if isinstance(v, str) else v; break

    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = hx(c) if isinstance(c, str) else c; self.new.add((x, y))

    def shape(self, rows, x0, y0, pal):
        """rows: 문자열 목록, '.' 은 비움. pal: 글자 → 색."""
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch != '.': self.put(x0 + i, y0 + j, pal[ch])

    def outline(self):
        """덧그린 칸 둘레의 빈 칸에 윤곽선을 두른다 — 몸 틀과 같은 두께 한 칸."""
        add = []
        for (x, y) in self.new:
            if self.px[x, y] == OUT: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and self.px[nx, ny][3] == 0: add.append((nx, ny))
        for p in add: self.px[p] = OUT

    def clean_face(self, skin, skinS):
        # 수염 줄(11~13)의 수염·머리 그림자 색을 살색으로 — 윤곽선 안쪽만
        for y in (11, 12, 13):
            for x in range(8, 16):
                if self.px[x, y] in (T['beard'], T['hairS']): self.px[x, y] = hx(skinS if x in (8, 15) else skin)

    def clear_mug(self):
        # 오른손에 든 잔(17~21, 21~25줄)을 걷어 낸다 — 소품이 그 자리에 들어간다
        for y in range(21, 26):
            for x in range(17, 23):
                self.px[x, y] = (0, 0, 0, 0)
        for y in range(21, 26): self.px[16, y] = hx('#14111a') if self.px[16, y][3] else self.px[16, y]


def pedlar(p):
    p.recolor({'hair': '#2e2218', 'hairS': '#3e2e1e', 'tunic': '#9a7a4e', 'tunicD': '#6a5234', 'tunicL': '#b89a66',
               'cloth': '#c8925a', 'clothS': '#a8763e', 'pants': '#6e5a40', 'pantsD': '#54442e', 'pantsS': '#3e3222'})
    p.clean_face('#e2ae83', '#c98d63')
    p.clear_mug()
    # 챙 넓은 모자 — 정수리 위 세 줄과 챙
    p.shape(['..HHHHHH..', '..HHHHHH..', '..BBBBBB..', 'HHHHHHHHHH'], 7, 0, {'H': '#7a5634', 'B': '#c8925a'})
    # 가슴을 가로지르는 짐 끈
    for i in range(8): p.put(8 + i, 16 + i, '#4e3a24')
    # 등짐 — 왼쪽 등 뒤(바깥)
    p.shape(['.RRR', 'PPPP', 'PPPP', 'PBBP', 'PPPP', 'PPPP', 'PPPP', 'PPPP', 'PPPP'], 0, 15,
            {'R': '#8e6a4a', 'P': '#6d5334', 'B': '#c8a060'})
    # 오른손 등불
    p.shape(['.D.', 'DYD', 'DYD', 'DDD'], 18, 21, {'D': '#3a3028', 'Y': '#ffd27a'})
    p.outline()


def oreman(p):
    p.recolor({'hair': '#34302c', 'hairS': '#4a4038', 'beard': '#4a4038', 'tunic': '#6a6a70', 'tunicD': '#4a4a50',
               'tunicL': '#8a8a92', 'cloth': '#7a5a3a', 'clothS': '#5e4428', 'pants': '#5a5040', 'pantsD': '#443c30'})
    p.clear_mug()
    # 이마의 붉은 머리띠와 뒤로 늘어진 매듭
    for x in range(8, 16): p.put(x, 4, '#b04a3a')
    p.put(6, 4, '#b04a3a'); p.put(5, 5, '#8e3a2c')
    # 오른손 곡괭이 — 자루는 손에서 위로, 머리는 쇠
    for y in range(13, 26): p.put(19, y, '#8a6a42')
    p.shape(['.SSSSS.', 'SLLLLLS', 'S.....S'], 16, 11, {'S': '#7a7e88', 'L': '#c0c4cc'})
    p.outline()


def armsman(p):
    p.recolor({'hair': '#4a4454', 'hairS': '#5a5060', 'beard': '#6a6470', 'tunic': '#8a8e98', 'tunicD': '#5e626c',
               'tunicL': '#b4b8c0', 'cloth': '#a0a4ae', 'clothS': '#7a7e88', 'pants': '#4a4458', 'pantsD': '#3a3448',
               'pantsS': '#2e2a38'})
    p.clear_mug()
    # 옷깃은 보라 누빔(벽산의 색)
    for x in range(7, 17): 
        if p.px[x, 15][:3] == (0xa0, 0xa4, 0xae): p.px[x, 15] = hx('#6a5a8a')
    # 가슴판 리벳
    for x, y in ((9, 20), (14, 20), (9, 24), (14, 24)): p.put(x, y, '#e0e4ec')
    # 어깨받이
    p.shape(['PPP', 'PLP'], 3, 15, {'P': '#6e727c', 'L': '#c8ccd4'})
    p.shape(['PPP', 'PLP'], 18, 15, {'P': '#6e727c', 'L': '#c8ccd4'})
    # 오른손 검 — 날은 위로, 코등이는 금
    for y in range(6, 21): p.put(20, y, '#d8dce4')
    p.put(20, 5, '#b8bcc4')
    p.shape(['GGGGG'], 18, 21, {'G': '#c8a040'})
    for y in range(22, 25): p.put(20, y, '#5a3a2a')
    p.outline()


def frames(p):
    f0 = p.im
    f1 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    f1.paste(f0.crop((0, 27, W, H)), (0, 28))       # 다리는 그대로(한 줄 겹침은 윗몸이 덮는다)
    f1.paste(f0.crop((0, 0, W, 27)), (0, 1))
    # 27줄(허리띠 틈)은 윗몸에서 한 줄 내려온 26줄이 차지한다
    f1.paste(f0.crop((0, 26, W, 27)), (0, 27))
    return [f0, f1]


def measure(sheet):
    fw, fh = W * K, H * K
    fr = sheet.crop((0, 0, fw, fh)); px = fr.load()
    bottom, left, right = -1, fw, -1
    for y in range(fh):
        for x in range(fw):
            if px[x, y][3] > 10:
                bottom = max(bottom, y); left = min(left, x); right = max(right, x)
    return H - bottom / K - 1, ((left + right + 1) / 2 - fw / 2) / K


def yunseul(man):
    src = Image.open(os.path.join(ROOT, 'tools', 'art', 'yunseul_src.png')).convert('RGBA')
    fw, fh = 30, 44
    n = src.width // (fw * K)
    EYE, SKIN = (0x33, 0x40, 0x3f, 255), (0xcf, 0xc3, 0xad, 255)
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    for f in range(n):
        im = src.crop((f * fw * K, 0, (f + 1) * fw * K, fh * K)).resize((fw, fh), Image.NEAREST)
        px = im.load()
        eyes = [(x, y) for y in range(8, 20) for x in range(fw) if px[x, y] == EYE]
        if eyes:
            cx = sum(x for x, _ in eyes) / len(eyes)
            for side in (-1, 1):
                grp = [(x, y) for x, y in eyes if (x - cx) * side > 0]
                if not grp: continue
                keep = min(grp, key=lambda q: (q[1], abs(q[0] - cx)))      # 가운데 쪽 위 칸 하나
                for q in grp:
                    if q != keep: px[q] = SKIN
        add = [(x, y) for y in range(fh) for x in range(fw) if px[x, y][3] == 0 and any(
            0 <= x + dx < fw and 0 <= y + dy < fh and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for q in add: px[q] = OUT
        out.paste(im.resize((fw * K, fh * K), Image.NEAREST), (f * fw * K, 0))
    out.save(os.path.join(CHAR, 'yunseul.png'))
    print('wrote yunseul', n, 'frames')


def main():
    tpl = Image.open(SRC).convert('RGBA')
    man = json.load(open(MAN, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for key, fn in (('pedlar', pedlar), ('oreman', oreman), ('armsman', armsman)):
        p = Pic(tpl); fn(p)
        fs = frames(p)
        sheet = Image.new('RGBA', (W * K * 2, H * K), (0, 0, 0, 0))
        for i, f in enumerate(fs): sheet.paste(f.resize((W * K, H * K), Image.NEAREST), (i * W * K, 0))
        path = os.path.join(CHAR, 'npc_%s.png' % key); sheet.save(path)
        foot, side = measure(sheet)
        sheets['npcw_' + key].update({'frameW': W, 'frameH': H, 'count': 2, 'foot': round(foot, 2), 'side': round(side, 2)})
        print('wrote', path, 'foot', foot, 'side', side)
    yunseul(man)
    json.dump(man, open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(MAN, 'a', encoding='utf-8').write('\n')


if __name__ == '__main__':
    main()
