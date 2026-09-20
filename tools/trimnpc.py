#!/usr/bin/env python3
"""마을 사람 시트에서 **아무도 안 쓰는 칸**을 떼어 낸다.

펫과 같은 이야기다(tools/trimpets.py). 마을 사람은 걷지도 죽지도 않는다. 그리는
쪽(game.js drawNpc)은 칸을 이렇게만 고른다 —

    fr = Math.floor(time * 1.6 + o.x * 0.05) % 2      // 0·1 만

즉 **걷는 칸(2·3)·공격 칸(4)·죽는 칸(5·6)은 한 번도 화면에 안 나온다.** 실제로
재 보면 그 다섯 칸은 열세 장 모두 칸0 의 복사본이다 — 일곱 칸 규격에 맞추느라
같은 그림을 다섯 번 더 구워 둔 것이고, 시트로 보면 "같은 사람이 일곱 번 서 있는"
그림이 된다.

숨(칸1)은 살아 있으므로 그대로 둔다 — 칸0 과 다르다는 것을 재서 확인했다.

    idle1 · idle2 두 칸만 남긴다. drawNpc 의 `% 2` 는 안 고쳐도 된다.

사용법:
    python3 tools/trimnpc.py            # 무엇이 어떻게 바뀌는지만
    python3 tools/trimnpc.py --write    # 실제로 자른다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
KEEP = (0, 1)           # idle1 · idle2 — drawNpc 이 실제로 쓰는 칸


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    names = sorted(n for n in sheets if n.startswith('npcw_'))
    done = 0
    for name in names:
        m = sheets[name]
        if m['count'] == len(KEEP):
            print(f'  {name:16} 이미 {len(KEEP)}칸')
            continue
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        # ★ 버리기 전에 확인한다 — 버리는 칸이 정말 칸0 의 복사본인가.
        #   하나라도 다르면 그 칸에는 아무도 못 본 그림이 들어 있다는 뜻이므로 멈춘다.
        def frame(i):
            ox = i * (fw * S + gap)
            return im.crop((ox, 0, ox + fw * S, fh * S)).tobytes()
        base = frame(0)
        odd = [i for i in range(cnt) if i not in KEEP and frame(i) != base]
        if odd:
            print(f'  {name:16} ★ 칸 {odd} 이 칸0 과 다르다 — 건너뛴다')
            continue
        print(f'  {name:16} {cnt}칸 → {len(KEEP)}칸  ({fw}x{fh})  버리는 칸 '
              + ', '.join(str(i) for i in range(cnt) if i not in KEEP))
        if not write:
            continue
        out = Image.new('RGBA', (fw * S * len(KEEP) + gap * (len(KEEP) - 1), fh * S),
                        (0, 0, 0, 0))
        for j, i in enumerate(KEEP):
            ox = i * (fw * S + gap)
            out.paste(im.crop((ox, 0, ox + fw * S, fh * S)), (j * (fw * S + gap), 0))
        out.save(path)
        m['count'] = len(KEEP)
        done += 1
    if write and done:
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        print(f'\n잘랐다: {done}장. ★ node tools/sync-manifest.mjs 를 돌려야 한다.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
