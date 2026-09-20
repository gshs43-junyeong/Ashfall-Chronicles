#!/usr/bin/env python3
"""한 칸에서만 몸 밖으로 **흘러나온** 부분을 걷어낸다.

심연 아귀의 무는 칸은 입 안쪽 어둠(34,50,58)이 25~26줄까지 내려가 있었다. 다른
칸의 몸은 2~24줄이므로, 그 두 줄과 왼쪽에 매달린 검은 기둥은 입이 아니라 **흘러나온
얼룩**이다("입 안의 검은색 부분이 바깥쪽으로 튀어나옴").

■ 잣대 — 다른 산 칸의 실루엣을 합친 것 밖에 있으면 흘러나온 것

  자세가 달라도 몸이 있던 자리는 서로 크게 겹친다. 어느 칸에도 없던 자리에 혼자
  나와 있으면 그린 것이 아니라 샌 것이다.

■ 아무 시트나 하면 안 된다

  공격 칸이 **원래** 몸 밖으로 뻗는 것들이 있다 — 궁수의 활, 삿갓짐승의 포자,
  리베터의 총구 불꽃. 그래서 표에 적은 시트·칸·색만 본다.

사용법:
    python3 tools/spill.py            # 바뀔 것만
    python3 tools/spill.py --write    # 실제로 걷어낸다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4

# (시트, 볼 칸, 걷어낼 색들) — 다른 산 칸의 실루엣 밖으로 나간 것을 걷는다
PLAN = [('abyss_angler', 4, {(34, 50, 58)})]

# 입이 **몸 옆으로** 튀어나온 것 — (시트, 기준 줄, 볼 줄 범위)
#
#   심연 아귀의 몸은 왼쪽 끝이 x6 인데(15·21·22줄), 입은 x2 까지 네 칸을 더 나가
#   있었고 16줄에는 x5 에 구멍이 있어 **왼쪽 끝 이빨이 몸에서 떨어져** 보였다.
#   위아래 모든 칸에 똑같이 있는 것이라 앞의 잣대(다른 칸과 견주기)로는 안 걸린다.
#   그래서 **기준 줄에서 잰 몸의 왼쪽 끝**보다 왼쪽에 있는 것을 걷어낸다.
LEFT = [('abyss_angler', 15, range(15, 23))]


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    for name, frame, colours in PLAN:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)

        def at(i, x, y):
            return px[i * (fw * S + gap) + x * S + 1, y * S + 1]

        # 다른 산 칸의 실루엣을 합친다
        body = set()
        for i in range(max(0, cnt - 2)):
            if i == frame:
                continue
            for y in range(fh):
                for x in range(fw):
                    if at(i, x, y)[3] > 8:
                        body.add((x, y))
        gone = [(x, y) for y in range(fh) for x in range(fw)
                if at(frame, x, y)[3] > 8
                and at(frame, x, y)[:3] in colours
                and (x, y) not in body]
        ys = sorted({y for _, y in gone})
        print(f'  {name:14} 칸{frame}: 몸 밖으로 나온 {len(gone)}칸'
              + (f'  줄 {ys[0]}~{ys[-1]}' if ys else ''))
        if write and gone:
            ox = frame * (fw * S + gap)
            for lx, ly in gone:
                for dy in range(S):
                    for dx in range(S):
                        px[ox + lx * S + dx, ly * S + dy] = (0, 0, 0, 0)
            im.save(path)
    for name, ref, rows in LEFT:
        m = sheets[name]
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        px = im.load()
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        total = []
        for i in range(max(0, cnt - 2)):
            ox = i * (fw * S + gap)
            at = lambda x, y: px[ox + x * S + 1, y * S + 1]
            edge = next((x for x in range(fw) if at(x, ref)[3] > 8), None)
            if edge is None:
                continue
            gone = [(x, y) for y in rows for x in range(edge)
                    if 0 <= y < fh and at(x, y)[3] > 8]
            if not gone:
                continue
            total.append(f'칸{i}: {len(gone)}칸 (몸 왼끝 x{edge})')
            if write:
                for lx, ly in gone:
                    for dy in range(S):
                        for dx in range(S):
                            px[ox + lx * S + dx, ly * S + dy] = (0, 0, 0, 0)
        print(f'  {name:14} 입이 몸 옆으로 나간 것 — ' + ('  '.join(total) if total else '없음'))
        if write and total:
            im.save(path)
    print('걷어냈다.' if write else '보기만 했다(--write 로 저장).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
