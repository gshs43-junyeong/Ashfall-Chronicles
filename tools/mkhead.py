#!/usr/bin/env python3
"""사람 시트(char/player*.png) 여섯 장의 **정수리를 새로 그린다.**

■ 무엇이 잘못돼 있었나

  머리 맨 윗줄이 **폭 9(까딱이는 프레임은 6)의 새까만 띠 한 줄**이었다. 바로 아래
  줄도 폭 9라서, 같은 너비의 검은 막대가 머리카락 위에 네모나게 얹힌 꼴이 된다.
  타이틀 화면은 사람을 원본 크기로 크게 그리기 때문에, 이 막대가 머리와 따로 놀며
  "머리 위에 뜬 검은 형체"로 읽혔다.

  앞서 두 번은 이 줄을 **깎아서** 고치려 했다(fixcrown.py 는 여분의 줄을 걷어냈고,
  roundcrown.py 는 좌우를 한 칸씩 깎았다). 폭만 줄어들 뿐 여전히 납작한 막대였다.
  그래서 이번에는 깎지 않고 **정수리를 다시 그린다.**

■ 새 그림

  머리 위 네 줄의 실루엣 폭을  9·9·11·13  에서  5·9·11·13  으로 바꾼다.

      옛 그림              새 그림
      #########            ..#####..        ← 꼭대기: 폭 5 의 작은 마루
      #hhhHHH##            ##hHbMM##        ← 폭 9, 양 끝 두 칸이 외곽선이 되어
      #hHbbbbbMM#          #hHbbbbbMM#         마루에서 옆머리로 사선이 이어진다
      #hHbbbbbbbbM#        #hHbbbbbbbbM#    (아래 두 줄은 손대지 않는다)

  꼭대기를 5칸으로 줄이고 그 아래 줄 양 끝에 외곽선 두 칸씩을 두면, 계단이 사선이
  되어 둥근 두상으로 읽힌다. 새로 드러난 두 번째 줄 안쪽에는 머리카락을 칠한다 —
  빛은 원래 그림과 같이 왼쪽 위에서 온다(밝은 쪽 hh → 중간 H → 바탕 b → 그늘 M).

  색은 시트마다 다르므로(은발·초록 두건·가죽 안전모·잿빛·남색) **그 프레임 자신의
  아래 두 줄에서 뽑아 쓴다.** 피격 프레임처럼 붉게 씻긴 것도 저절로 맞는다.

사용법:  python3 tools/mkhead.py [--check] [--preview 파일.png]
"""
import sys, os, glob
from PIL import Image

S = 4          # 논리픽셀 한 칸 = 4 화면픽셀
N = 13         # 프레임 수
NAMES = ['idle1', 'idle2', 'walk1', 'walk2', 'walk3', 'walk4',
         'jump', 'fall', 'dash', 'atk1', 'atk2', 'atk3', 'hurt']


class Sheet:
    """논리픽셀 격자로 시트를 읽고 쓴다 (한 칸 = SxS 블록)."""

    def __init__(self, path):
        self.path = path
        self.im = Image.open(path).convert('RGBA')
        self.W, self.H = self.im.size
        self.px = self.im.load()
        self.fw = self.W // N // S        # 프레임 가로 (논리)
        self.fh = self.H // S             # 프레임 세로 (논리)

    def get(self, f, x, y):
        if not (0 <= x < self.fw and 0 <= y < self.fh):
            return None
        c = self.px[(f * self.fw + x) * S + 1, y * S + 1]
        return None if c[3] <= 8 else c

    def put(self, f, x, y, c):
        if not (0 <= x < self.fw and 0 <= y < self.fh):
            return
        v = (0, 0, 0, 0) if c is None else (c[0], c[1], c[2], 255)
        bx, by = (f * self.fw + x) * S, y * S
        for dy in range(S):
            for dx in range(S):
                self.px[bx + dx, by + dy] = v

    def span(self, f, y):
        """그 줄의 (왼끝, 오른끝) 논리 x. 비었으면 (None, None)."""
        l = r = None
        for x in range(self.fw):
            if self.get(f, x, y) is not None:
                if l is None:
                    l = x
                r = x
        return l, r


def redraw(sh, f):
    """한 프레임의 정수리를 새로 그린다. (설명 문자열, 고쳤는지) 를 돌려준다."""
    top = None
    for y in range(sh.fh):
        if sh.span(f, y)[0] is not None:
            top = y
            break
    if top is None:
        return '빈 프레임', False

    w = []
    for k in range(4):
        l, r = sh.span(f, top + k)
        w.append((l, r, (r - l + 1) if l is not None else 0))

    # 옛 그림인지 확인 — 꼭대기 6/9, 그 아래 9. 이미 새로 그렸으면 꼭대기가 5다.
    # (셋째 줄은 굴 파는 이의 램프처럼 덧붙은 것이 있어 폭이 11보다 넓을 수 있다)
    if w[0][2] == 5:
        return '이미 새 그림', False
    if w[0][2] not in (6, 9) or w[1][2] != 9 or w[2][2] < 11:
        return '모양이 예상과 다르다 (%d/%d/%d) — 건너뜀' % (w[0][2], w[1][2], w[2][2]), False

    cx = (w[1][0] + w[1][1]) // 2         # 폭 9 줄의 한가운데
    if (w[1][0] + w[1][1]) % 2:
        return '가운데가 반 칸 어긋난다 — 건너뜀', False

    # 색은 이 프레임 자신에게서 뽑는다
    OUT = sh.get(f, cx - 4, top + 1)      # 외곽선
    HL = sh.get(f, cx - 2, top + 1)       # 머리카락 밝은 쪽
    HL2 = sh.get(f, cx - 3, top + 2)      # 그 다음 밝기
    BASE = sh.get(f, cx - 1, top + 2)     # 바탕
    MID = sh.get(f, cx + 1, top + 1)      # 그늘 쪽
    if None in (OUT, HL, HL2, BASE, MID):
        return '색을 못 뽑았다 — 건너뜀', False

    # 옛 두 줄을 지운다
    for k in (0, 1):
        l, r = w[k][0], w[k][1]
        for x in range(l, r + 1):
            sh.put(f, x, top + k, None)

    # 꼭대기 — 폭 5 의 마루
    for x in range(cx - 2, cx + 3):
        sh.put(f, x, top, OUT)
    # 그 아래 — 폭 9, 양 끝 두 칸이 외곽선, 안쪽 다섯 칸이 머리카락
    row = [OUT, OUT, HL, HL2, BASE, MID, MID, OUT, OUT]
    for i, c in enumerate(row):
        sh.put(f, cx - 4 + i, top + 1, c)
    return '%d→5 · 가운데 x%d' % (w[0][2], cx), True


def preview(files, out, frames=(2, 3, 8, 9), zoom=3):
    """고치기 전/후를 나란히 크게 뽑아 눈으로 볼 수 있게 한다."""
    cells = []
    for path in files:
        sh = Sheet(path)
        for f in frames:
            box = (f * sh.fw * S, 0, (f + 1) * sh.fw * S, 14 * S)
            cells.append(sh.im.crop(box))
    cw, chh = cells[0].size
    cols = len(frames)
    rows = len(files)
    pad = 8
    cv = Image.new('RGBA', (cols * (cw * zoom + pad) + pad,
                            rows * (chh * zoom + pad) + pad), (24, 24, 30, 255))
    for i, cell in enumerate(cells):
        r, c = divmod(i, cols)
        big = cell.resize((cw * zoom, chh * zoom), Image.NEAREST)
        cv.paste(big, (pad + c * (cw * zoom + pad), pad + r * (chh * zoom + pad)), big)
    cv.save(out)
    return out


def main():
    check = '--check' in sys.argv
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..',
                        'game', 'assets', 'char')
    files = sorted(glob.glob(os.path.join(root, 'player*.png')))
    if '--preview' in sys.argv:
        print(preview(files, sys.argv[sys.argv.index('--preview') + 1]))
        return 0

    total = 0
    for path in files:
        sh = Sheet(path)
        done = []
        for f in range(N):
            msg, ok = redraw(sh, f)
            if ok:
                done.append('%s(%s)' % (NAMES[f], msg))
            elif '건너뜀' in msg:
                print('  ! %s %s: %s' % (os.path.basename(path), NAMES[f], msg))
        total += len(done)
        print('  %-24s %s %d개' % (os.path.basename(path),
                                   '고칠 것' if check else '새로 그림', len(done)))
        if done and not check:
            sh.im.save(path)
    print('\n프레임 %d개 (시트 %d장)' % (total, len(files)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
