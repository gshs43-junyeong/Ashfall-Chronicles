#!/usr/bin/env python3
"""assets/manifest.json 을 assets/sprites-manifest.js 로 옮겨 적는다.

왜 두 벌인가 — 크롬은 `file://` 에서 fetch 를 막는다. 그래서 zip 을 풀어
index.html 을 그냥 더블클릭하면 매니페스트를 못 읽어 그림이 하나도 안 붙었고,
그걸 우회하려고 런처가 `python -m http.server` 를 띄우고 있었다. 게임을 하려고
파이썬을 깔게 만드는 셈이었다. fetch 는 그 한 줄뿐이라, 같은 내용을 `<script>` 로
한 번 더 두는 것으로 서버가 통째로 없어진다.

손으로 두 벌을 관리하면 반드시 어긋나므로 **manifest.json 이 원본이고 이 파일은
산출물이다**. build-site.sh 가 배포 때마다 다시 만들고, 어긋나 있으면 빌드를
실패시킨다(--check).

  python3 tools/sync-manifest.py           다시 만든다
  python3 tools/sync-manifest.py --check   어긋나면 1을 돌려준다
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'game', 'assets', 'manifest.json')
DST = os.path.join(ROOT, 'game', 'assets', 'sprites-manifest.js')

HEAD = """/* assets/sprites-manifest.js — 자동 생성물. 손으로 고치지 마세요.
   원본은 assets/manifest.json 이고, tools/sync-manifest(.mjs/.py) 가 옮겨 적습니다.

   file:// 에서는 fetch 가 막혀 매니페스트를 읽을 수 없습니다. 그래서 zip 을 풀어
   index.html 을 더블클릭했을 때도 그림이 붙도록 같은 내용을 여기에 한 벌 둡니다
   (그 덕에 런처가 파이썬 서버를 띄울 이유가 없어졌습니다). */
window.SPRITE_MANIFEST = """


def jsnum(o):
    """★ 자바스크립트와 **똑같은 글자**가 나오게 정수인 실수를 정수로 만든다.

    이 파일과 sync-manifest.mjs 는 같은 것을 옮겨 적는데, manifest.json 의 `-1.0`
    을 파이썬은 `-1.0` 으로, 자바스크립트는 `-1` 로 적는다(JS 에는 정수와 실수의
    구분이 없다). 그래서 두 도구가 **같은 입력에서 다른 바이트**를 냈고, 나중에
    돌린 쪽이 이기면 다른 쪽의 --check 가 깨졌다. tools/build-site.sh 는 mjs 를
    먼저 쓰는데 CLAUDE.md 는 py 의 --check 가 배포를 막는다고 적어 둔 자리라,
    사이트를 한 번 빌드하면 그다음 배포가 막히는 덫이었다(실측 78군데).
    고치는 쪽을 파이썬으로 잡은 것은, 산출물이 **JS 파일**이라 JS 표기가 기준이기
    때문이다. manifest.json 에 `2.0` 을 새로 적어도 저절로 맞는다."""
    if isinstance(o, dict):
        return {k: jsnum(v) for k, v in o.items()}
    if isinstance(o, list):
        return [jsnum(v) for v in o]
    if isinstance(o, float) and o.is_integer():
        return int(o)
    return o


def build():
    with open(SRC, encoding='utf-8') as f:
        data = json.load(f)
    return HEAD + json.dumps(jsnum(data), ensure_ascii=False, indent=2) + ';\n'


if __name__ == '__main__':
    out = build()
    if '--check' in sys.argv:
        cur = open(DST, encoding='utf-8').read() if os.path.exists(DST) else ''
        if cur != out:
            print('sprites-manifest.js 가 manifest.json 과 어긋납니다 — '
                  'python3 tools/sync-manifest.py 를 돌리세요.', file=sys.stderr)
            sys.exit(1)
        print('sprites-manifest.js 최신')
    else:
        open(DST, 'w', encoding='utf-8').write(out)
        print(f'sprites-manifest.js 갱신 ({len(out)}바이트)')
