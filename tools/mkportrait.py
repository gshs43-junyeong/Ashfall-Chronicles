#!/usr/bin/env python3
"""마을 NPC · 상인 초상(9장)을 기준 초상(엘라라 · 보린 · 미라 · 장로)과 같은 짜임으로 굽는다 → play/assets/npc/portrait_<id>.png

★ 초상 일관성 규칙은 DESIGN.md '초상' — 요약: 64×64 칸을 2배(128×128)로 · 배경 투명 · 머리~어깨 흉상 · 바깥 윤곽 1칸 진한 색 ·
  빛은 왼쪽 위(머리 · 옷은 가운데가 밝고 양 끝이 어둡다 · 오른쪽 끝이 가장 어둡다) · 얼굴 짜임은 엘라라와 같다
  (눈 6×4 · 흰자 · 홍채 3칸 · 하이라이트 + 동공 · 볼 홍조 · 코 그늘 2칸 · 웃는 입 · 턱 모서리 그늘).
  인물마다 바꾸는 것은 머리 모양 · 색 · 옷 · 소품뿐 — 얼굴 자리를 옮기지 말 것(나란히 놓으면 눈높이가 같아야 한다).
쓰기: python3 tools/mkportrait.py  → 초상 9장 + tests/out/portraits-sheet.png(기준 4장과 나란히)
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NPC = os.path.join(ROOT, 'play', 'assets', 'npc')
N = 64
OUTLINE = (12, 12, 17, 255)

def sh(c, k):
    """밝기 바꾸기 — k < 1 어둡게 · k > 1 밝게"""
    return tuple(max(0, min(255, int(round(v * k)))) for v in c[:3]) + (255,)

class Canvas:
    def __init__(self):
        self.px = [[None] * N for _ in range(N)]
    def put(self, x, y, c):
        if 0 <= x < N and 0 <= y < N and c is not None:
            self.px[y][x] = c if len(c) == 4 else tuple(c) + (255,)
    def get(self, x, y):
        return self.px[y][x] if 0 <= x < N and 0 <= y < N else None
    def region(self, cells, base, light=1.12, dark=0.72, edge=0.84, top=None):
        """칸 묶음을 입체로 칠한다 — 줄마다 왼끝 · 오른끝을 재어 왼쪽 끝은 조금 어둡게, 가운데 밝게, 오른쪽 4할 뒤는 가장 어둡게"""
        rows = {}
        for x, y in cells:
            rows.setdefault(y, []).append(x)
        y0 = min(rows) if rows else 0
        for y, xs in rows.items():
            a, b = min(xs), max(xs)
            w = max(1, b - a)
            for x in xs:
                t = (x - a) / w
                c = sh(base, edge) if t < 0.14 else sh(base, dark) if t > 0.80 else sh(base, light) if 0.3 < t < 0.55 else base
                if top is not None and y - y0 < top and 0.15 < t < 0.8:
                    c = sh(base, 1.22)
                self.put(x, y, c)
    def outline(self):
        """바깥 윤곽 — 투명 칸 중 칠한 칸과 맞닿은 곳(상하좌우)"""
        add = []
        for y in range(N):
            for x in range(N):
                if self.px[y][x] is None and any(self.get(x + dx, y + dy) is not None and self.get(x + dx, y + dy) != OUTLINE
                                                 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    add.append((x, y))
        for x, y in add:
            self.px[y][x] = OUTLINE
    def image(self):
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        for y in range(N):
            for x in range(N):
                if self.px[y][x]:
                    im.putpixel((x, y), self.px[y][x])
        return im.resize((N * 2, N * 2), Image.NEAREST)

def cells(fn, x0=0, x1=N - 1, y0=0, y1=N - 1):
    return [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if fn(x, y)]

# ---------------------------------------------------------------- 얼굴(엘라라 짜임) — 가운데 31.5 · 눈 28~31줄 · 턱 끝 45줄
CX = 31.5
def face_hw(y):
    if y < 18: return -1
    if y == 18: return 7
    if y == 19: return 9
    if y <= 40: return 10
    return {41: 9.5, 42: 8.5, 43: 7.5, 44: 6.5, 45: 5}.get(y, -1)

def in_face(x, y):
    hw = face_hw(y)
    return hw > 0 and abs(x + 0.5 - (CX + 0.5)) <= hw + 0.5

def body(c, cloth, neck_skin, collar=None, shoulder_top=46):
    """어깨 · 몸통 — 엘라라와 같은 실루엣(목 아래로 둥글게 넓어진다)"""
    def bw(y):
        if y < shoulder_top: return -1
        d = y - shoulder_top
        return min(26.5, 14.5 + d * 2.2) if d < 6 else min(27.5, 26 + (d - 6) * 0.2)
    c.region(cells(lambda x, y: bw(y) > 0 and abs(x - CX) <= bw(y)), cloth, light=1.1, dark=0.66, edge=0.62)
    # 목
    c.region(cells(lambda x, y: 44 <= y <= shoulder_top + 1 and abs(x - CX) <= 5), neck_skin, dark=0.8, edge=0.8)
    for x in range(int(CX) - 5, int(CX) + 7):
        c.put(x, 45, sh(neck_skin, 0.74))                      # 턱 밑 그늘
    if collar:
        for x in range(int(CX) - 8, int(CX) + 10):
            c.put(x, shoulder_top, collar)

def face(c, skin, iris, brow=None, smile=1, freckles=False, scar=False, old=False):
    # 피부는 평평하게 — 오른쪽 끝 두 칸만 그늘(엘라라와 같다). 줄마다 띠를 넣으면 얼굴에 세로 줄이 생긴다
    for x, y in cells(in_face, y0=17, y1=45):
        hw = face_hw(y)
        c.put(x, y, sh(skin, 0.88) if x - CX >= hw - 1.5 else skin)
    lo, md = sh(skin, 0.86), sh(skin, 0.78)
    # 턱 모서리 · 턱 밑
    for (x, y) in ((22, 41), (41, 41), (23, 42), (40, 42), (24, 43), (39, 43)):
        c.put(x, y, md)
    for x in range(26, 38):
        c.put(x, 44, lo)
    # 눈 — 왼눈 22~27, 오른눈 36~41 (엘라라 그대로)
    W = (242, 236, 224)
    for ex, mir in ((22, False), (36, True)):
        pat = ["..WrW.", "WWhPrW", "WWrrrW", ".WWrW."] if not mir else [".WrW..", "WhPrWW", "WrrrWW", ".WrWW."]
        for dy, row in enumerate(pat):
            for dx, ch in enumerate(row):
                col = {'W': W, 'r': iris, 'h': (255, 255, 255), 'P': (20, 20, 27)}.get(ch)
                if col:
                    c.put(ex + dx, 28 + dy, col)
        if brow:
            for dx in range(1, 6):
                c.put(ex + dx - (1 if mir else 0), 26 if dx not in (1, 5) or old else 27, brow)
    # 코 · 볼 · 입
    nose = sh(skin, 0.78)
    for y in range(32, 36):
        c.put(31 if y < 35 else 30, y, nose)
    c.put(32, 35, nose)
    blush = sh(skin, 0.82)
    for x in (26, 27, 28, 36, 37, 38):
        c.put(x, 33, blush)
    mouth = sh(skin, 0.62)
    for x in range(29, 35):
        c.put(x, 39, mouth)
    if smile:
        c.put(28, 38, sh(skin, 0.78)); c.put(35, 38, sh(skin, 0.78))
    if smile > 1:                                    # 활짝 — 입이 벌어져 이가 보인다
        for x in range(30, 34):
            c.put(x, 40, (236, 228, 214))
        c.put(29, 40, mouth); c.put(34, 40, mouth)
        for x in range(30, 34):
            c.put(x, 41, mouth)
    if freckles:
        for x, y in ((25, 34), (27, 35), (29, 34), (34, 34), (36, 35), (38, 34)):
            c.put(x, y, sh(skin, 0.72))
    if scar:
        for i in range(6):
            c.put(23 + i // 2, 25 + i, (150, 70, 60))
    if old:
        for x in (23, 24, 25, 38, 39, 40):
            c.put(x, 32, sh(skin, 0.86))           # 눈 밑 주름

# ---------------------------------------------------------------- 머리카락
def hair_dome(top=7, wid=15, side_bot=30, fringe=24, long=0, cx=CX):
    """윗머리 둥근 갓 + 옆머리(side_bot 줄까지) + 앞머리 아랫줄(fringe). long > 0 이면 어깨 뒤로 그만큼 내려온다"""
    def f(x, y):
        dx = abs(x - cx)
        if y < top: return False
        # 둥근 윗머리
        r = wid + 0.5
        cy = top + wid * 0.95
        if y < cy and (dx / r) ** 2 + ((y - cy) / (cy - top + 0.5)) ** 2 > 1: return False
        if dx > wid + 0.5: return False
        if y <= fringe: return True                     # 이마까지는 다 머리
        if y <= side_bot and dx >= 9.5: return True      # 옆머리(귀 쪽)
        if long and y <= side_bot + long and dx >= 9.5 and dx <= wid + 0.5 + (y - side_bot) * 0.15: return True
        return False
    return f

def paint_hair(c, mask_fn, col, strands=0, jag=0, part=None, front_only=False):
    pts = cells(mask_fn)
    c.region(pts, col, light=1.1, dark=0.66, edge=0.8, top=2)
    ys = {}
    for x, y in pts:
        ys.setdefault(x, []).append(y)
    # 앞머리 결 — 아랫단 몇 줄에 세로 결을 넣는다
    if strands:
        for x, colys in ys.items():
            if abs(x - CX) < 9.5 and (x % strands == 0):
                bot = max(colys)
                for y in range(bot - 7, bot + 1):
                    if (x, y) in pts:
                        c.put(x, y, sh(col, 0.72))
    # 들쭉날쭉한 끝(삐친 머리)
    if jag:
        for x, colys in ys.items():
            bot = max(colys)
            if abs(x - CX) < 10 and (x * 7 + 3) % jag == 0:
                c.put(x, bot + 1, sh(col, 0.85))
    if part is not None:
        for y in range(min(ys.get(part, [10])), min(ys.get(part, [10])) + 5):
            c.put(part, y, sh(col, 0.66))

# ---------------------------------------------------------------- 인물
def P_rika():
    c = Canvas(); skin = (222, 176, 138); hair = (122, 80, 50)
    body(c, (128, 92, 58), skin, collar=(206, 186, 140))
    for x in range(int(CX) - 9, int(CX) + 11):              # 목도리
        c.put(x, 47, (206, 186, 140)); c.put(x, 48, sh((206, 186, 140), 0.85))
    face(c, skin, (176, 120, 52), freckles=True)
    paint_hair(c, hair_dome(top=8, wid=15, side_bot=36, fringe=25), hair, strands=3, jag=2)
    # 오른 어깨의 너구리
    rac = (128, 124, 120)
    for (x, y) in cells(lambda x, y: (x - 50) ** 2 / 30 + (y - 45) ** 2 / 20 <= 1):
        c.put(x, y, rac)
    for x in range(46, 55):
        c.put(x, 45, (40, 38, 40))                               # 너구리 눈 띠
    c.put(48, 45, (240, 240, 240)); c.put(52, 45, (240, 240, 240))
    for (x, y) in ((46, 40), (47, 41), (54, 40), (53, 41)):
        c.put(x, y, sh(rac, 0.7))                                # 귀
    c.put(50, 48, (30, 28, 30))
    c.outline(); return c

def P_garn():
    c = Canvas(); skin = (214, 168, 132); hair = (150, 150, 152)
    body(c, (74, 98, 72), skin, collar=(110, 84, 56))
    for i in range(12):                                         # 가죽 어깨끈
        c.put(23 + i, 50 + i, (110, 84, 56)); c.put(24 + i, 50 + i, (92, 70, 46))
    face(c, skin, (110, 150, 100), brow=sh(hair, 0.7), smile=0, scar=True, old=True)
    paint_hair(c, hair_dome(top=10, wid=14, side_bot=30, fringe=21), hair, strands=0)
    beard = sh(hair, 1.0)
    c.region(cells(lambda x, y: 36 <= y <= 49 and abs(x - CX) <= (10 if y < 44 else 10 - (y - 44) * 1.6) and not (y <= 38 and abs(x - CX) < 4)), beard, light=1.12, dark=0.7, edge=0.82)
    for x in range(29, 35):
        c.put(x, 39, sh(skin, 0.55))                             # 수염 사이 입
    c.outline(); return c

def P_haran():
    c = Canvas(); skin = (226, 178, 140); hair = (176, 72, 46)
    body(c, (126, 74, 52), skin)
    apron = (226, 212, 182)
    c.region(cells(lambda x, y: y >= 50 and abs(x - CX) <= 11), apron, light=1.03, dark=0.82, edge=0.9)
    for y in range(47, 50):
        c.put(int(CX) - 9, y, apron); c.put(int(CX) + 10, y, apron)   # 앞치마 끈
    face(c, skin, (120, 82, 50), brow=sh(hair, 0.7), smile=2)
    paint_hair(c, hair_dome(top=9, wid=14, side_bot=29, fringe=23), hair, strands=2, jag=3)
    c.outline(); return c

def P_seira():
    c = Canvas(); skin = (224, 182, 150); hair = (74, 104, 156)
    body(c, (84, 100, 140), skin)
    c.region(cells(lambda x, y: y >= 51 and abs(x - CX) <= 13), (118, 82, 54), light=1.06, dark=0.75, edge=0.85)   # 가죽 앞치마
    for x in (int(CX) - 12, int(CX) + 13):
        for y in range(47, 51):
            c.put(x, y, (118, 82, 54))
    face(c, skin, (96, 124, 170), brow=sh(hair, 0.7))
    paint_hair(c, hair_dome(top=8, wid=15, side_bot=38, fringe=24), hair, strands=3)
    # 이마 위 고글
    for ex in (24, 35):
        for (x, y) in cells(lambda x, y: (x - ex - 2) ** 2 + (y - 20) ** 2 <= 9):
            c.put(x, y, (226, 230, 234))
        for (x, y) in cells(lambda x, y: (x - ex - 2) ** 2 + (y - 20) ** 2 <= 3):
            c.put(x, y, (150, 206, 230))
        c.put(ex + 1, 19, (255, 255, 255))
    for x in range(17, 47):
        if c.get(x, 20) == sh(hair, 1.0) or not (23 <= x <= 41):
            c.put(x, 21, (70, 60, 50))                           # 고글 끈
    c.outline(); return c

def P_kade():
    c = Canvas(); skin = (218, 172, 136); hair = (52, 50, 56)
    body(c, (112, 114, 124), skin, collar=(80, 82, 92))
    for (x, y) in cells(lambda x, y: y >= 50 and x >= 44):        # 오른 어깨 기계 팔 판
        c.put(x, y, (176, 184, 194) if (x + y) % 5 else (120, 126, 136))
    face(c, skin, (110, 110, 120), brow=(60, 56, 60), smile=1)
    paint_hair(c, hair_dome(top=13, wid=13, side_bot=31, fringe=22), hair)
    cap = (66, 68, 78)
    c.region(cells(lambda x, y: 9 <= y <= 21 and abs(x - CX) <= (14 if y > 13 else 14 - (13 - y) * 1.3)), cap, light=1.12, dark=0.7, edge=0.85, top=2)
    for x in range(17, 47):
        c.put(x, 21, sh(cap, 0.6))                               # 모자 챙
    for (x, y) in cells(lambda x, y: (x - 31.5) ** 2 + (y - 16) ** 2 <= 9):
        c.put(x, y, (200, 236, 250))                             # 이마 등불
    for (x, y) in cells(lambda x, y: (x - 31.5) ** 2 + (y - 16) ** 2 <= 2.5):
        c.put(x, y, (255, 255, 255))
    c.outline(); return c

def P_pedlar():
    c = Canvas(); skin = (220, 172, 134); hair = (96, 68, 46)
    body(c, (132, 98, 64), skin, collar=(176, 150, 110))
    for i in range(16):                                         # 가방끈(왼 어깨 → 오른 허리)
        c.put(22 + i, 48 + i, (88, 62, 40)); c.put(23 + i, 48 + i, (88, 62, 40))
    for (x, y) in ((29, 55), (30, 55), (29, 56), (30, 56)):
        c.put(x, y, (196, 198, 204))                             # 버클
    face(c, skin, (124, 88, 56), brow=sh(hair, 0.7))
    paint_hair(c, hair_dome(top=14, wid=13, side_bot=31, fringe=22), hair)
    hat = (112, 82, 52)
    c.region(cells(lambda x, y: 8 <= y <= 18 and abs(x - CX) <= 12), hat, light=1.12, dark=0.7, edge=0.82, top=2)
    c.region(cells(lambda x, y: 18 <= y <= 21 and abs(x - CX) <= 23 - (21 - y) * 0.4), sh(hat, 0.92), light=1.1, dark=0.7, edge=0.8)   # 넓은 챙
    for x in range(20, 44):
        c.put(x, 17, (60, 44, 30))                               # 모자 띠
    c.outline(); return c

def P_oreman():
    c = Canvas(); skin = (204, 154, 116); hair = (54, 44, 38)
    body(c, (112, 86, 62), skin, collar=(84, 64, 46))
    for (x, y) in ((42, 53), (43, 53), (42, 54), (43, 54)):
        c.put(x, y, (140, 186, 212))                             # 가슴 배지
    face(c, skin, (84, 62, 48), brow=sh(hair, 0.8), smile=1)
    paint_hair(c, hair_dome(top=9, wid=14, side_bot=31, fringe=21), hair)
    band = (184, 52, 46)
    for x in range(17, 47):
        for y in (19, 20, 21):
            c.put(x, y, band if y < 21 else sh(band, 0.7))
    for (x, y) in ((46, 22), (47, 23), (47, 24), (48, 25)):      # 매듭 끝
        c.put(x, y, band)
    for x in range(26, 38, 2):
        c.put(x, 42, sh(skin, 0.8))                              # 짧은 수염 자국
    c.outline(); return c

def P_armsman():
    c = Canvas(); skin = (208, 160, 124); hair = (46, 40, 38)
    body(c, (100, 106, 118), skin, collar=(70, 74, 84))
    red = (150, 50, 46)
    for (x, y) in cells(lambda x, y: y >= 49 and (x <= 13 or x >= 50) and y - 49 <= 10):
        c.put(x, y, red if y < 57 else sh(red, 0.8))             # 붉은 어깨받이
    for x in range(int(CX) - 6, int(CX) + 8):
        c.put(x, 56, (140, 146, 158))                            # 흉갑 이음
    face(c, skin, (70, 60, 56), brow=sh(hair, 0.8), smile=0)
    paint_hair(c, hair_dome(top=10, wid=14, side_bot=31, fringe=21), hair)
    for x in range(17, 47):
        c.put(x, 19, (150, 156, 168)); c.put(x, 20, (118, 124, 136))   # 쇠 머리띠
    c.outline(); return c

def P_yunseul():
    c = Canvas(); skin = (234, 214, 198); hair = (226, 230, 236)
    long_hair = hair_dome(top=8, wid=16, side_bot=40, fringe=24, long=16)
    paint_hair(c, lambda x, y: long_hair(x, y) and y > 30, hair)       # 뒷머리(어깨 뒤)
    body(c, (58, 120, 126), skin)
    for x in range(int(CX) - 9, int(CX) + 11):
        c.put(x, 48, (176, 210, 206))                            # 옷깃
    for (x, y) in cells(lambda x, y: (x - 31.5) ** 2 + (y - 55) ** 2 <= 6):
        c.put(x, y, (255, 226, 140))                             # 빛나는 목걸이
    c.put(31, 54, (255, 255, 230)); c.put(32, 54, (255, 255, 230))
    for y in range(49, 53):
        c.put(31, y, (200, 180, 120))
    face(c, skin, (110, 176, 186), brow=sh(hair, 0.8))
    paint_hair(c, lambda x, y: long_hair(x, y) and y <= 40, hair, strands=3)
    c.outline(); return c

PEOPLE = {'rika': P_rika, 'garn': P_garn, 'haran': P_haran, 'seira': P_seira, 'kade': P_kade,
          'pedlar': P_pedlar, 'oreman': P_oreman, 'armsman': P_armsman, 'yunseul': P_yunseul}

def main():
    out = {}
    for k, fn in PEOPLE.items():
        im = fn().image()
        im.save(os.path.join(NPC, f'portrait_{k}.png'))
        out[k] = im
    # 기준 4장과 나란히 — 눈높이 · 크기 · 윤곽이 맞는지 한눈에
    refs = ['elara', 'borin', 'mira', 'elder']
    S = 160
    names = refs + list(PEOPLE)
    sheet = Image.new('RGBA', (S * 7, S * 2), (46, 44, 52, 255))
    for i, n in enumerate(names):
        im = Image.open(os.path.join(NPC, f'portrait_{n}.png')).convert('RGBA').resize((S, S), Image.NEAREST)
        sheet.alpha_composite(im, ((i % 7) * S, (i // 7) * S))
    os.makedirs(os.path.join(ROOT, 'tests', 'out'), exist_ok=True)
    sheet.save(os.path.join(ROOT, 'tests', 'out', 'portraits-sheet.png'))
    print('초상', len(PEOPLE), '장 → play/assets/npc · 대조표 tests/out/portraits-sheet.png')

if __name__ == '__main__':
    main()
