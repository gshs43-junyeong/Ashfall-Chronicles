"""스프라이트 시트의 프레임끼리 실제로 얼마나 다른지 잰다.

"움직임이 둔해 보인다"를 눈이 아니라 숫자로 판정하기 위한 도구다. 지표는
'두 프레임을 겹쳤을 때 달라지는 픽셀이 불투명 면적의 몇 %인가'이고, 경험적으로
5% 아래면 사람 눈에는 정지로 읽힌다.

    python3 tools/framediff.py

ENEMIES 의 stiff 표시(js/data.js)를 정할 때 쓴 값이 이 스크립트에서 나왔다.
그림을 다시 그린 뒤 다시 돌려서 수치가 올라갔는지 확인하고, 올라갔으면
해당 개체의 stiff 를 뗀다.
"""
import json, os, sys
from PIL import Image, ImageChops

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
M = json.load(open(os.path.join(ROOT, 'assets/manifest.json')))


def frames(kind, name):
    """시트를 프레임 이미지 리스트로 자른다. 보스는 프레임 사이 여백이 제각각이라
    폭에서 역산한다(매니페스트의 gap 값 하나로는 안 맞는다 — content.js 주석 참고)."""
    spec = M[kind]['sheets'].get(name)
    if not spec:
        return None, None
    path = os.path.join(ROOT, 'assets', spec['file'])
    if not os.path.exists(path):
        return None, None
    im = Image.open(path).convert('RGBA')
    sc = M[kind].get('scale', 4)
    fw, fh, n = spec['frameW'] * sc, spec['frameH'] * sc, spec['count']
    gap = 0 if n < 2 else max(0, round((im.width - n * fw) / (n - 1)))
    out = []
    for i in range(n):
        x = i * (fw + gap)
        if x + fw > im.width:
            break
        out.append(im.crop((x, 0, x + fw, fh)))
    return out, gap


def diff_pct(a, b):
    """달라지는 픽셀 비율(%). 둘 중 하나라도 불투명한 자리를 분모로 삼는다."""
    if a is None or b is None:
        return None
    d = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
    dm = d.convert('L').point(lambda v: 255 if v > 12 else 0)
    aa, ab = a.getchannel('A'), b.getchannel('A')
    area = ImageChops.lighter(aa, ab).point(lambda v: 255 if v > 8 else 0)
    n_area = sum(area.histogram()[255:])
    n_diff = sum(ImageChops.multiply(dm, area).histogram()[255:])
    return 100.0 * n_diff / n_area if n_area else 0.0


CHARS = ['ballast_form', 'lost_miner', 'lavaslug', 'riveter', 'crystalcrab',
         'scrapcrawler', 'glow_snail', 'arctic_hare', 'ash_vole', 'jungle_frog',
         'golem', 'corrupttree', 'zombie']
BOSSES = ['first_keeper', 'void_king', 'king_slime', 'bone_lord', 'frost_witch',
          'shaft_maw', 'pursuer']

print('=== 몹 (characters) — 프레임: idle1 idle2 move1 move2 atk death1 death2 ===')
print('%-14s %7s %7s %7s %7s' % ('이름', 'idle쌍', 'move쌍', 'idle→move', 'atk차이'))
char_rows = []
for n in CHARS:
    f, gap = frames('characters', n)
    if not f or len(f) < 5:
        print('%-14s (프레임 부족: %s)' % (n, len(f) if f else 0)); continue
    r = (diff_pct(f[0], f[1]), diff_pct(f[2], f[3]), diff_pct(f[0], f[2]), diff_pct(f[0], f[4]))
    char_rows.append((n, r))
    print('%-14s %6.1f%% %6.1f%% %8.1f%% %6.1f%%' % (n, *r))

print()
print('=== 보스 (bosses) — 프레임: p1i1 p1i2 p2i1 p2i2 p3i1 p3i2 ===')
print('%-14s %8s %8s %8s %9s %9s' % ('이름', 'p1숨쉬기', 'p2숨쉬기', 'p3숨쉬기', 'p1→p2', 'p2→p3'))
boss_rows = []
for n in BOSSES:
    f, gap = frames('bosses', n)
    if not f or len(f) < 6:
        print('%-14s (프레임 부족: %s)' % (n, len(f) if f else 0)); continue
    r = (diff_pct(f[0], f[1]), diff_pct(f[2], f[3]), diff_pct(f[4], f[5]),
         diff_pct(f[0], f[2]), diff_pct(f[2], f[4]))
    boss_rows.append((n, r))
    print('%-14s %7.1f%% %7.1f%% %7.1f%% %8.1f%% %8.1f%%' % (n, *r))

print()
print('※ 이 수치는 "겹쳤을 때 달라지는 픽셀이 불투명 면적의 몇 %인가"다.')
print('   경험적으로 5% 미만이면 사람 눈에 거의 정지로 읽힌다.')
