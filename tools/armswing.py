#!/usr/bin/env python3
"""걸을 때 **팔이 안 흔들리는** 이족 보행 몹에 팔 엇갈림을 넣는다.

■ 무엇을 쟀나

  걷는 두 칸에서 팔 띠(바깥 28%)의 맨 위 y 가 얼마나 바뀌는지 재면, 대부분의
  이족 몹은 **양쪽 팔이 같은 방향으로** 1칸씩 움직인다(곰팡이 걷는 것 16→17,
  16→17). 그건 팔이 흔들리는 게 아니라 **몸 전체가 내려간 것**이다. 좌우 차이를
  보면 열넷 중 **좀비 하나만** 진짜로 엇갈린다.

      엇갈림 = (왼팔 이동) - (오른팔 이동)     ← 0 이면 팔이 안 흔들린다

■ 어떻게 넣나

  걷는 칸을 **다시 만들지 않는다.** walk 변환을 통째로 걸면 팔은 엇갈리지만 몸
  윤곽이 겹쳐 번진다(곰팡이 걷는 것에서 특히 심했다). 지금 그림에 `limbs` 로
  **팔 띠만** 위아래로 옮긴다 — 몸은 한 픽셀도 안 건드린다.

■ 사람이 보고 고른 넷만 손댄다

  자동으로 하면 안 되는 것들이 있다 —
    orbit_sentry  십자 몸통이라 바깥 띠가 팔이 아니다. 옮기면 몸이 삐뚤어진다.
    ruin_guard    가슴의 십자 무늬가 「┤」로 일그러진다.
    weldarm · draft_form   어깨가 번진다.
  그래서 표에 적은 것만 한다.

■ 두 번 돌려도 같다 — **git HEAD 의 시트를 원본 삼는다**

  `limbs` 는 순수 함수라 두 번 걸면 두 번 옮겨진다. 그래서 작업 중인 시트가 아니라
  **마지막 커밋의 시트**에서 걷는 두 칸을 읽어 거기에 팔을 얹는다. 몇 번을 돌려도
  결과가 같다.

  ★ 팔 띠의 맨 위/아래 y 로 "이미 엇갈리나"를 재려 했는데, 재 보니 그 값은 팔이
    아니라 몸통·다리 끝을 따라간다(`limbs` 가 빈자리를 메우려고 끝 칸을 늘이기도
    한다). 못 미더운 지표로 만든 안전장치는 안 넣느니만 못하므로 버렸다.

사용법:
    python3 tools/armswing.py            # 바뀔 것만
    python3 tools/armswing.py --write    # 실제로 넣는다
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reanim

NAMES = ('archer', 'canopy_ape', 'mold_walker', 'vinelash')
FRAC = 0.28
SWING2 = (1, -1)        # 걷기 첫 칸 — 왼팔 내리고 오른팔 올린다
SWING3 = (-2, 2)        # 걷기 둘째 칸 — 반대로


def head_frames(name, spec, gap):
    """마지막 커밋의 시트에서 논리 프레임을 읽어 온다 — 이 도구의 원본."""
    import io
    import subprocess

    from PIL import Image

    path = os.path.join('game', 'assets', spec['file'])
    raw = subprocess.run(['git', 'show', f'HEAD:{path}'],
                         capture_output=True, cwd=reanim.ROOT + '/..').stdout
    if not raw:
        return None
    im = Image.open(io.BytesIO(raw)).convert('RGBA')
    px = im.load()
    fw, fh, cnt = spec['frameW'], spec['frameH'], spec['count']
    S = reanim.S
    out = []
    for i in range(cnt):
        ox = i * (fw * S + gap)
        f = reanim.Frame(fw, fh)
        for y in range(fh):
            for x in range(fw):
                c = px[ox + x * S + 1, y * S + 1]
                if c[3] > 8:
                    f.p[(x, y)] = c
        out.append(f)
    return out


def swing(f, dl, dr):
    y0, y1 = reanim._band(f, 0.26, 0.88)
    return reanim.limbs(f, dl, dr, frac=FRAC, y0=y0, y1=y1)


def main(argv):
    write = '--write' in argv
    for name in NAMES:
        fs, spec, gap = reanim.load('characters', name)
        base = head_frames(name, spec, gap)
        if base is None or len(base) < 4:
            print(f'  {name:14} 마지막 커밋에서 못 읽었다 — 건너뜀')
            continue
        n0 = len(fs[2].p), len(fs[3].p)
        fs[2] = swing(base[2], *SWING2)
        fs[3] = swing(base[3], *SWING3)
        print(f'  {name:14} 칸2 {len(base[2].p)}→{len(fs[2].p)}칸, '
              f'칸3 {len(base[3].p)}→{len(fs[3].p)}칸'
              + ('' if n0 == (len(base[2].p), len(base[3].p)) else '   (이미 얹혀 있던 것을 원본에서 다시 만듦)'))
        if write:
            reanim.save('characters', name, fs, spec, gap)
    print('넣었다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
