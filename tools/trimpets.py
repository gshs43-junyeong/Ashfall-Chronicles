#!/usr/bin/env python3
"""펫 시트에서 **아무도 안 쓰는 칸**을 떼어 낸다.

펫은 죽지 않는다. `class Pet`(entity.js)에는 체력도 die() 도 없고, 그리는 쪽
(game.js drawPet)은 칸을 이렇게만 고른다 —

    fr = pet.flash > 0 ? 4 : (시간 % 2)      // 0·1 은 서 있기, 4 는 문 직후

즉 **걷는 칸(2·3)과 죽는 칸(5·6)은 한 번도 화면에 안 나온다.** 그런데 시트에는
일곱 칸이 다 들어 있고, 안 쓰는 칸이라 아무도 안 봐서 깨진 채로 남아 있었다.

그래서 쓰는 셋만 남겨 다시 굽는다 — idle1 · idle2 · atk 순서로 세 칸.
매니페스트의 count 도 3 으로 줄이고, drawPet 의 atk 칸 번호도 4 → 2 로 바꾼다
(이 도구가 코드는 안 고친다 — 아래 한 줄을 같이 고쳐야 한다).

    const fr = pet.flash > 0 ? 2 : (Math.floor(this.time * 3 + pet.slot) % 2);

사용법:
    python3 tools/trimpets.py            # 무엇이 어떻게 바뀌는지만
    python3 tools/trimpets.py --write    # 실제로 자른다
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')
S = 4
KEEP = (0, 1, 4)        # idle1 · idle2 · atk — drawPet 이 실제로 쓰는 칸


def main(argv):
    write = '--write' in argv
    man = json.load(open(MANIFEST, encoding='utf-8'))
    sheets = man['characters']['sheets']
    names = sorted(n for n in sheets if n.startswith('pet_'))
    done = 0
    for name in names:
        m = sheets[name]
        if m['count'] == len(KEEP):
            print(f"  {name:22} 이미 {len(KEEP)}칸")
            continue
        fw, fh, cnt = m['frameW'], m['frameH'], m['count']
        gap = m.get('gap', 0)
        path = os.path.join(ASSETS, m['file'])
        im = Image.open(path).convert('RGBA')
        print(f"  {name:22} {cnt}칸 → {len(KEEP)}칸  ({fw}x{fh})  버리는 칸 "
              + ', '.join(str(i) for i in range(cnt) if i not in KEEP))
        if not write:
            continue
        out = Image.new('RGBA', (fw * S * len(KEEP), fh * S), (0, 0, 0, 0))
        for j, i in enumerate(KEEP):
            ox = i * (fw * S + gap)
            out.paste(im.crop((ox, 0, ox + fw * S, fh * S)), (j * fw * S, 0))
        out.save(path)
        m['count'] = len(KEEP)
        done += 1
    if write and done:
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        print(f"\n잘랐다: {done}장. ★ game.js drawPet 의 atk 칸 번호를 4 → 2 로 고치고"
              "\n   node tools/sync-manifest.mjs 를 돌려야 한다.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
