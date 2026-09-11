#!/usr/bin/env python3
"""칸에 부딪혀 잘린 몹·보스 시트에 여백을 주고 끊긴 자리를 되살린다.

tools/unclip.py 가 플레이어 시트에 한 일을 몹과 보스 전부에 한다.
대상은 tools/clipcheck.py 가 짚어 준 시트다.

■ 무엇을 하나

  ① 칸을 넓힌다. 좌우는 **같은 만큼**, 위로는 필요한 만큼. 아래는 안 넓힌다.
  ② 잘린 자리를 한 칸 바깥으로 이어 붙이고(끊긴 색 그대로) 그 바깥에
     윤곽선을 씌운다. 없던 모양을 지어내지 않는다 — 칼로 자른 단면을
     둥글려 닫아 주는 것뿐이다.

■ 왜 아래는 안 넓히나 — 그림이 제자리에 그대로 서 있어야 한다

  게임은 이렇게 그린다(game.js drawEnemy):

      dy = frameH - e.h - footInset      footInset = 칸 바닥부터 그림 밑까지
      dx = (e.w - frameW) / 2 - sideInset

  아래를 안 넓히면 footInset 은 그대로이고 frameH 만 padT 만큼 커지므로 dy 도
  padT 만큼 커진다. 그림은 칸 안에서 padT 만큼 내려가 있으니 둘이 상쇄되어
  **화면에서는 한 칸도 안 움직인다.** 좌우를 같은 만큼 넓히면 sideInset 도
  안 변하고 dx 만 줄어드는데, 그림도 그만큼 안쪽에 있으니 역시 상쇄된다.
  그래서 manifest 의 ox/oy 를 건드릴 필요가 없다.

  단 footInset·sideInset 은 file:// 에서 못 잰다(캔버스가 오염돼 getImageData
  가 막힌다). 그때를 위해 매니페스트에 foot/side 를 적어 두고 sprites.js 가
  그 값을 쓰게 했다 — 안 그러면 여백을 준 만큼 그림이 떠 보인다.

사용법:
    python3 tools/unclipmob.py            # clipcheck 가 짚은 것 전부
    python3 tools/unclipmob.py weldarm    # 이름으로 골라서
    python3 tools/unclipmob.py --pad      # 매니페스트의 foot/side 만 다시 적는다
"""
import json
import os
import sys

from PIL import Image

import clipcheck as CC

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
PAD = 2               # 잘린 변마다 주는 여백(논리 픽셀). 이어 붙이기 1 + 윤곽선 1


def load_frames(path, fw, fh, cnt, gap):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    out = []
    for i in range(cnt):
        ox = i * (fw * S + gap)
        g = {}
        for y in range(fh):
            for x in range(fw):
                p = px[ox + x * S + 1, y * S + 1]
                if p[3] > 8:
                    g[(x, y)] = p
        out.append(g)
    return out


def save_frames(path, frames, fw, fh, gap):
    im = Image.new('RGBA', ((fw * S + gap) * len(frames) - gap, fh * S), (0, 0, 0, 0))
    px = im.load()
    for i, g in enumerate(frames):
        ox = i * (fw * S + gap)
        for (x, y), c in g.items():
            if not (0 <= x < fw and 0 <= y < fh):
                continue
            for dy in range(S):
                for dx in range(S):
                    px[ox + x * S + dx, y * S + dy] = c
    im.save(path)


def mend(g, fw, fh, pad_l, pad_t, nfw, nfh):
    """여백만큼 옮긴 뒤 잘린 자리를 한 칸 잇고 윤곽선으로 닫는다."""
    ol = CC.outline_color(CC.edge_cells(g, fw, fh))
    thr = CC.lum(ol) * 1.35 + 6
    xs = [k[0] for k in g]
    ys = [k[1] for k in g]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    out = {(x + pad_l, y + pad_t): c for (x, y), c in g.items()}
    grown = set()

    def cut(p):
        return CC.lum(p) > thr

    # 여백을 준 변만 손댄다 — 여백이 없는 쪽으로 이어 붙이면 칸 밖으로 나가
    # 저장할 때 그대로 잘린다(고치려다 다시 자르는 셈이다).
    sides = []
    if pad_t and y0 <= 1:
        sides.append(('위', [(x, y0) for x in range(fw)], (0, -1)))
    if pad_l and x0 <= 1:
        sides.append(('왼', [(x0, y) for y in range(fh)], (-1, 0)))
    if pad_l and x1 >= fw - 2:
        sides.append(('오른', [(x1, y) for y in range(fh)], (1, 0)))
    for _, line, (dx, dy) in sides:
        for k in line:
            p = g.get(k)
            if not p or not cut(p):
                continue
            nx, ny = k[0] + pad_l + dx, k[1] + pad_t + dy
            out[(nx, ny)] = p                       # 끊긴 색 그대로 한 칸 잇고
            grown.add((nx, ny))
    # 이어 붙인 칸 둘레에 윤곽선을 둘러 단면을 닫는다
    for (x, y) in list(grown):
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                k = (x + dx, y + dy)
                if k not in out and 0 <= k[0] < nfw and 0 <= k[1] < nfh:
                    out[k] = ol
    return out


def pads(name, man):
    """이 시트가 어느 변에 얼마나 여백이 필요한가."""
    sec = 'bosses' if name in man['bosses']['sheets'] else 'characters'
    m = man[sec]['sheets'][name]
    fw, fh, cnt = m['frameW'], m['frameH'], m['count']
    gap = m.get('gap', 4 if sec == 'bosses' else 0)
    frames = load_frames(os.path.join(ASSETS, m['file']), fw, fh, cnt, gap)
    need = set()
    for g in frames:
        need |= set(CC.check(g, fw, fh))
    return sec, m, fw, fh, cnt, gap, frames, need


def measure(g, fw, fh):
    """게임의 _measurePad 와 같은 계산 — 매니페스트에 적어 둘 값."""
    if not g:
        return 0.0, 0.0
    xs = [k[0] for k in g]
    ys = [k[1] for k in g]
    # 게임은 **장치 픽셀**로 잰다. 그림의 맨 아랫줄은 논리 y 의 네 칸 중
    # 마지막 줄이므로 bottom/S 가 y + 0.75 다. 그 0.75 를 빼먹으면 file:// 에서
    # 그림이 0.75px 만큼 내려앉는다.
    return (round((fh - (max(ys) + (S - 1) / S) - 1) * 4) / 4,
            round(((min(xs) + max(xs) + 1) / 2 - fw / 2) * 4) / 4)


def write_pads(man):
    """모든 캐릭터·보스 시트의 foot/side 를 재서 매니페스트에 적는다."""
    n = 0
    for sec in ('characters', 'bosses'):
        for name, m in man[sec]['sheets'].items():
            fw, fh = m['frameW'], m['frameH']
            gap = m.get('gap', 4 if sec == 'bosses' else 0)
            g = load_frames(os.path.join(ASSETS, m['file']), fw, fh, 1, gap)[0]
            foot, side = measure(g, fw, fh)
            m['foot'], m['side'] = foot, side
            n += 1
    return n


def main(argv):
    only = [a for a in argv if not a.startswith('-')]
    man = json.load(open(MANIFEST, encoding='utf-8'))
    if '--pad' not in argv:
        names = only or [r[1] for r in scan(man)]
        for name in names:
            sec, m, fw, fh, cnt, gap, frames, need = pads(name, man)
            if not need:
                print('  건너뜀 (안 잘림):', name)
                continue
            pad_l = PAD if ('왼' in need or '오른' in need) else 0
            pad_t = PAD if '위' in need else 0
            nfw, nfh = fw + pad_l * 2, fh + pad_t
            frames = [mend(g, fw, fh, pad_l, pad_t, nfw, nfh) for g in frames]
            save_frames(os.path.join(ASSETS, m['file']), frames, nfw, nfh, gap)
            m['frameW'], m['frameH'] = nfw, nfh
            print('  %-18s %2dx%-3d → %2dx%-3d  (%s)'
                  % (name, fw, fh, nfw, nfh, ' '.join(sorted(need))))
    print('  매니페스트에 foot/side 적음:', write_pads(man), '장')
    json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    return 0


def scan(man):
    """clipcheck 와 같은 잣대로 잘린 시트를 골라낸다."""
    rows = []
    for sec in ('characters', 'bosses'):
        for name, m in man[sec]['sheets'].items():
            fw, fh, cnt = m['frameW'], m['frameH'], m['count']
            gap = m.get('gap', 4 if sec == 'bosses' else 0)
            frames = load_frames(os.path.join(ASSETS, m['file']), fw, fh, cnt, gap)
            if any(CC.check(g, fw, fh) for g in frames):
                rows.append((sec, name))
    return rows


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
