#!/usr/bin/env python3
"""움직임 검사 — 프레임 두 장이 **정말 움직이는지** 잰다.

■ 왜 이 도구가 필요한가

  원형 보스의 숨쉬기 두 칸은 픽셀 차이가 26~50% 로 잡혔다. 수치만 보면
  잘 움직이는 그림이다. 그런데 눈으로 보면 팔이 안 움직였다.

  이유는 그 26~50% 가 **전부 그림이 통째로 한 칸 미끄러진 값**이었기
  때문이다. 몸 전체를 1칸 올리면 윤곽선이 다 어긋나므로 픽셀 차이는 크게
  나오지만, 관절은 하나도 안 움직인다. 애니메이션이 아니라 슬라이드다.

  그래서 이렇게 잰다: **두 프레임을 가장 잘 겹쳐지는 위치로 밀어 놓고**
  그래도 남는 차이를 센다. 평행이동뿐이면 이 값이 0 에 가깝다. 관절이
  실제로 움직였으면 그만큼 남는다. 이 값이 진짜 움직임이다.

      날것 차이  두 프레임을 그냥 뺀 값. 미끄러짐도 여기 들어간다.
      실움직임  ±4칸 안에서 가장 잘 맞는 자리로 겹친 뒤 남는 차이.
      밀림      그때 민 거리. (0,0) 이 아니면 그림이 통째로 움직였다는 뜻.

■ 읽는 법

      실움직임 0%      멈춘 그림. 두 칸이 똑같다.
              1~7%    사실상 평행이동. 눈에는 안 움직이는 것으로 보인다.
              8~20%   조금 움직인다. 작은 몹이면 이 정도로 충분하다.
              20% 이상 관절이 확실히 움직인다.

  작은 몹은 몸이 20~40칸이라 팔 한 칸만 움직여도 비율이 크게 나온다.
  그래서 비율과 함께 **바뀐 칸 수**도 같이 낸다 — 26x38 짜리에서 3칸은
  실수로 남은 점일 수 있지만 30칸이면 팔이 접힌 것이다.

사용법:
    python3 tools/animcheck.py              # 다 본다. 문제 있는 것만 모아 준다
    python3 tools/animcheck.py --all        # 통과한 것도 전부 표로
    python3 tools/animcheck.py slime bat    # 이름으로 골라서
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game', 'assets')
S = 4                                       # 시트는 4배로 구워져 있다
SHIFT = 4                                   # 겹쳐 볼 때 밀어 보는 최대 칸수
THIN = 8                                    # 이 아래면 "사실상 평행이동"
DEAD = 1                                    # 이 아래면 "멈춘 그림"

# ■ 게임이 **실제로 그리는 칸**만 잰다
#
#   시트 규격은 7칸(idle1 idle2 move1 move2 atk death1 death2)이지만 게임이
#   다 쓰지는 않는다. 안 쓰는 칸까지 세면 고칠 것이 아닌 데로 일이 샌다 —
#   처음 돌렸을 때 손볼 목록 155칸 중 40칸이 화면에 한 번도 안 나오는
#   NPC 걷기·죽음 칸이었다.
#
#     적      enemyFrame(): 0·1 가만히 / 2·3 걷기 / 4 때리기. 죽음 칸은 안 쓴다
#     펫      drawPet():    0·1 과 문 직후 4 뿐
#     NPC     drawNpc():    0·1 뿐 (제자리에 서 있다)
#     주인공  13칸 규격이라 뜻이 다르다 — 0·1 가만히, 2~5 걸음
def char_pairs(name, cnt):
    if name.startswith('player'):
        return [('가만히', 0, 1), ('걸음1', 2, 3), ('걸음2', 4, 5)]
    if name.startswith('pet_') or name.startswith('npcw_'):
        return [('가만히', 0, 1)]
    return [('가만히', 0, 1), ('걷기', 2, 3)]


def load_sheet(rel):
    return Image.open(os.path.join(ASSETS, rel)).convert('RGBA')


def frames(im, fw, fh, n, gap):
    """4배로 구워진 시트에서 칸을 잘라 **논리 픽셀로 되돌려** 준다.
       4배 그림끼리 재면 한 칸 어긋남이 네 칸으로 부풀어 값이 뻥튀기된다."""
    out = []
    for i in range(n):
        x0 = i * (fw * S + gap)
        if x0 + fw * S > im.size[0]:
            break
        out.append(im.crop((x0, 0, x0 + fw * S, fh * S))
                     .resize((fw, fh), Image.NEAREST))
    return out


def diff(a, b, dx, dy):
    """b 를 (dx,dy) 만큼 민 뒤 a 와 다른 칸 수와, 둘 중 하나라도 칠해진 칸 수."""
    pa, pb = a.load(), b.load()
    w, h = a.size
    n = t = 0
    for y in range(h):
        for x in range(w):
            A = pa[x, y]
            bx, by = x + dx, y + dy
            B = pb[bx, by] if 0 <= bx < w and 0 <= by < h else (0, 0, 0, 0)
            if A[3] < 20 and B[3] < 20:
                continue
            t += 1
            if (abs(A[0] - B[0]) + abs(A[1] - B[1]) + abs(A[2] - B[2]) > 40
                    or abs(A[3] - B[3]) > 60):
                n += 1
    return n, t


def measure(a, b):
    """(날것%, 실움직임%, 바뀐칸수, 밀림)."""
    raw, tot = diff(a, b, 0, 0)
    best = (raw, 0, 0)
    for dy in range(-SHIFT, SHIFT + 1):
        for dx in range(-SHIFT, SHIFT + 1):
            n, t = diff(a, b, dx, dy)
            if n < best[0]:
                best = (n, dx, dy)
    return (100.0 * raw / max(tot, 1), 100.0 * best[0] / max(tot, 1),
            best[0], (best[1], best[2]))


def sheets(man, pick):
    """(구역, 이름, 파일, 칸크기, 칸수, gap, 재 볼 칸쌍들) 을 차례로 준다."""
    for sec, pairs in (('characters', None), ('bosses', None)):
        for name, m in man[sec]['sheets'].items():
            if pick and not any(p in name for p in pick):
                continue
            cnt = m['count']
            if sec == 'characters':
                ps = [(t, i, j) for t, i, j in char_pairs(name, cnt) if j < cnt]
            else:
                # 시트 끝의 쓰러지는 칸은 숨쉬기 쌍이 아니다 — 게임도 마디로
                # 안 센다(enemyFrame 이 count - death 로 나눈다).
                idle = cnt - m.get('death', 0)
                ps = [('%d마디' % (k + 1), k * 2, k * 2 + 1)
                      for k in range(idle // 2)]
            yield sec, name, m['file'], (m['frameW'], m['frameH']), cnt, \
                m.get('gap', 4 if sec == 'bosses' else 0), ps


def main(argv):
    show_all = '--all' in argv
    pick = [a for a in argv if not a.startswith('-')]
    man = json.load(open(os.path.join(ASSETS, 'manifest.json')))

    bad, ok, rows = [], 0, []
    for sec, name, rel, (fw, fh), cnt, gap, ps in sheets(man, pick):
        im = load_sheet(rel)
        fs = frames(im, fw, fh, cnt, gap)
        for label, i, j in ps:
            if j >= len(fs):
                continue
            raw, real, px, sh = measure(fs[i], fs[j])
            row = (sec, name, label, raw, real, px, sh, fw, fh)
            rows.append(row)
            if real < DEAD or px < 2:
                bad.append(('멈춤', row))
            elif real < THIN:
                bad.append(('미끄러짐', row))
            else:
                ok += 1

    def line(r):
        sec, name, label, raw, real, px, sh, fw, fh = r
        return ('  %-14s %-6s %2dx%-3d  날것 %5.1f%%  실움직임 %5.1f%% (%3d칸)'
                '  밀림 %s' % (name, label, fw, fh, raw, real, px,
                               '-' if sh == (0, 0) else str(sh)))

    if show_all:
        print('== 전체')
        for r in rows:
            print(line(r))
        print()
    print('== 손봐야 하는 것  (실움직임 %d%% 미만)' % THIN)
    if not bad:
        print('  없음')
    for kind, r in sorted(bad, key=lambda b: rows.index(b[1])):
        print('  [%s]' % kind, line(r)[2:])
    print('\n  잰 칸쌍 %d · 통과 %d · 손봐야 함 %d'
          % (len(rows), ok, len(bad)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
