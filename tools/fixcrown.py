#!/usr/bin/env python3
"""머리 위 검은 슬래브를 걷어낸다 (char/player*.png).

■ 무엇이 잘못돼 있었나

  캐릭터 시트는 13프레임짜리 가로 스트립이고, 프레임마다 머리 꼭대기에 외곽선
  (#0c0c11)이 한 줄 얹힌다. 그런데 캐릭터가 걸으면서 위아래로 까딱이는 프레임
  (idle2 · walk2 · walk4 · atk3 · hurt)에서는 머리가 논리 1픽셀 아래로 내려간다.
  그때 생기는 위쪽 빈칸을 **투명으로 두지 않고 외곽선으로 메워** 두었다.

  그 결과 그 프레임들만 외곽선이 논리 2픽셀 두께가 된다. 걷기 순환은
  walk1·walk2·walk3·walk4 = 1px·2px·1px·2px 라서, 초당 9프레임으로
  **머리 위 검은 띠가 두꺼워졌다 얇아졌다를 반복한다.** 화면에서는 사람 머리에서
  검은 덩어리가 나타났다 사라지는 것으로 보인다 — 그게 "미상 형체"의 정체다.
  (배경 마른 나무가 아니었다. 나무는 지나가기만 할 뿐 이건 사람을 따라다닌다.)

■ 무엇을 하는가

  프레임마다 맨 위 외곽선 띠의 두께를 재서, 논리 2픽셀 이상이면 위쪽 여분만
  투명으로 되돌린다(항상 논리 1픽셀만 남긴다). 머리 자체는 손대지 않으므로
  까딱이는 움직임은 그대로 남고, 검은 띠만 모든 프레임에서 같은 두께가 된다.

  판단 기준은 "그 행의 불투명 픽셀 평균 밝기가 45 미만" — 외곽선(#0c0c11, 밝기 14)만
  걸리고 머리카락(#3c4257, 밝기 74)은 안 걸린다.

사용법:  python3 tools/fixcrown.py [--check]
        --check 면 고치지 않고 지금 상태만 보고한다.
"""
import sys, glob, os
from PIL import Image

SCALE = 4          # 시트는 논리 픽셀의 4배
FRAMES = 13
DARK = 45          # 외곽선으로 칠 평균 밝기 문턱
NAMES = ['idle1', 'idle2', 'walk1', 'walk2', 'walk3', 'walk4',
         'jump', 'fall', 'dash', 'atk1', 'atk2', 'atk3', 'hurt']


def band_rows(px, ox, fw, h):
    """프레임 맨 위에서 외곽선으로 꽉 찬 행이 몇 줄인가."""
    n = 0
    for y in range(min(24, h)):
        vs = [px[ox + x, y] for x in range(fw) if px[ox + x, y][3] > 8]
        if not vs:
            break
        if sum(r + g + b for r, g, b, _ in vs) / (3 * len(vs)) < DARK:
            n += 1
        else:
            break
    return n


def main():
    check = '--check' in sys.argv
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'char')
    files = sorted(glob.glob(os.path.join(root, 'player*.png')))
    if not files:
        print('char/player*.png 을 못 찾음'); return 1

    total = 0
    for f in files:
        im = Image.open(f).convert('RGBA')
        W, H = im.size
        fw = W // FRAMES
        if fw * FRAMES != W:
            print(f'  건너뜀 {os.path.basename(f)} — 폭 {W} 가 {FRAMES} 프레임으로 안 나뉜다')
            continue
        px = im.load()
        fixed = []
        for i in range(FRAMES):
            ox = i * fw
            n = band_rows(px, ox, fw, H)
            extra = n - SCALE                      # 논리 1픽셀만 남긴다
            if extra < SCALE:                      # 논리 1픽셀 미만은 손대지 않는다
                continue
            fixed.append(f'{NAMES[i]}({n // SCALE}→1)')
            if not check:
                for y in range(extra):
                    for x in range(fw):
                        px[ox + x, y] = (0, 0, 0, 0)
        total += len(fixed)
        mark = '지금' if check else '고침'
        print(f'  {os.path.basename(f):22} {mark}: ' + (', '.join(fixed) if fixed else '깨끗함'))
        if fixed and not check:
            im.save(f)

    print(f'\n{"확인" if check else "수정"}한 프레임 {total}개')
    return 0


if __name__ == '__main__':
    sys.exit(main())
