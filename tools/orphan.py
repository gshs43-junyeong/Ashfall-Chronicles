#!/usr/bin/env python3
"""게임이 **한 번도 안 그리는** 시트를 찾아 매니페스트에 표시한다.

협곡 아가리(crevasse_maw)가 "애셋 매칭이 안 되어 있다"고 지목받아 찾아보니,
매니페스트에만 있고 data.js · world.js · factory.js 어디에도 참조가 없었다.
같은 것이 열둘이었다.

게임이 시트 이름을 만드는 방식은 넷뿐이다 —

    적 · 보스   e.type            (ENEMIES / STORY_BOSSES 의 키)
    플레이어    'player_' + id    (CHARS 의 id)
    마을 사람   'npcw_' + art     (NPCS 의 art)  — 몸통 시트
    마을 사람   'npc_'  + art     (NPCS 의 art)  — 얼굴 한 장(초상화와 같은 이름칸)
    펫          'pet_' + id       (PETS 의 키)

그래서 시트 이름이나 그 접두어를 뗀 이름이 게임 소스에 나오면 쓰이는 것으로 본다.
하나도 안 나오면 고아다.

★ 처음에는 **따옴표로 묶인** 것만 찾았는데, 보스는 `vine_lord:` 처럼 **맨 키**로
  쓰여서 넷이 잘못 걸렸다. 밑줄이 든 이름은 낱말 경계로 찾아도 헷갈릴 일이 없으므로
  그렇게 바꿨다. 접두어를 뗀 짧은 이름('guard' 같은 것)만 따옴표를 요구한다.

지우지는 않는다 — 바다·얼음 한 벌과 이야기 인물이라 앞으로 쓸 그림으로 보인다.
대신 매니페스트에 `"unused": true` 를 달아, 점검판에서 바로 눈에 띄게 한다.
(게임 쪽은 frameW·frameH·count·gap 만 읽으므로 키가 하나 늘어도 무시한다.)

사용법:
    python3 tools/orphan.py            # 찾기만
    python3 tools/orphan.py --write    # 매니페스트에 표시
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(ASSETS, 'manifest.json')


def game_source():
    src = ''
    js = os.path.join(ROOT, 'game', 'js')
    for f in sorted(os.listdir(js)):
        if f.endswith('.js'):
            src += open(os.path.join(js, f), encoding='utf-8').read()
    return src


def main(argv):
    write = '--write' in argv
    src = game_source()
    man = json.load(open(MANIFEST, encoding='utf-8'))

    def used(name):
        if re.search(r'\b' + re.escape(name) + r'\b', src):
            return True
        for pre in ('player_', 'npcw_', 'npc_', 'pet_'):
            if name.startswith(pre):
                short = name[len(pre):]
                if re.search(r"['\"]" + re.escape(short) + r"['\"]", src):
                    return True
        return False

    changed = 0
    for sec in ('characters', 'bosses'):
        for name, m in sorted(man[sec]['sheets'].items()):
            orphan = not used(name)
            if orphan and not m.get('unused'):
                print(f'  {sec:11} {name:18} ← 게임이 안 그린다')
                m['unused'] = True
                changed += 1
            elif not orphan and m.pop('unused', None):
                print(f'  {sec:11} {name:18} ← 이제 쓰인다 (표시 뗌)')
                changed += 1
    if not changed:
        print('바뀔 것 없음.')
    elif write:
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        print(f'\n표시했다: {changed}장. ★ node tools/sync-manifest.mjs 를 돌려야 한다.')
    else:
        print(f'\n찾기만 했다(--write 로 저장): {changed}장')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
