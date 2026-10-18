#!/usr/bin/env python3
"""스프라이트 시트 검사 · 손질 — 움직임(anim) · 칸 가장자리 잘림(clip) · 떨어진 덩어리(stray) · 좌우 여백 주기(pad).

쓰기: python3 tools/sprcheck.py <anim|clip|stray|pad> [인자…]
  하위 명령마다 아래 _<이름>() 의 첫 문자열이 그 도구의 설명이다(예전 파일 하나 = 하위 명령 하나, 본문은 그대로)."""
import os, sys
import os as _os, sys as _sys   # 하위 명령 본문이 os · sys 를 제 안에서 다시 import 해도 머리줄이 쓸 수 있게

# ===== anim — 예전 tools/animcheck.py ==============================
def _anim(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'animcheck.py')] + argv
    __name__ = '__main__'
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
    ASSETS = os.path.join(ROOT, 'play', 'assets')
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


# ===== clip — 예전 tools/clipcheck.py ==============================
def _clip(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'clipcheck.py')] + argv
    __name__ = '__main__'
    """칸 가장자리에서 **잘려 나간** 그림을 찾는다.

    ■ 무엇을 잘림으로 보나

      픽셀 그림은 실루엣 둘레에 어두운 윤곽선이 한 겹 있다. 그러니 그림이 제대로
      끝난 자리는 윤곽선이고, **윤곽선 없이 채움색이 그냥 끊긴 자리**는 칸에
      부딪혀 잘린 것이다.

      칸 가장자리에 닿았다는 것만으로는 부족하다 — 땅에 선 몹은 발바닥이 칸
      맨 아랫줄에 닿는 게 맞고, 거기엔 윤곽선이 있다. 색을 봐야 갈린다.

    ■ 내는 값

          잘린칸   윤곽선 없이 끊긴 가장자리 픽셀 수 (칸 전체를 합친 값)
          변       어느 쪽이 잘렸나 (위·아래·왼·오른)

    사용법:
        python3 tools/clipcheck.py            # 전부
        python3 tools/clipcheck.py blight_maw # 이름으로 골라서
    """
    import json
    import os
    import sys
    from collections import Counter

    from PIL import Image

    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ASSETS = os.path.join(ROOT, 'play', 'assets')
    S = 4
    MIN_CUT = 4          # 이 아래는 점 몇 개라 잘림으로 안 본다


    def lum(p):
        return p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114


    def outline_color(cells):
        """투명과 맞닿은 불투명 칸 중 가장 흔한 것들 가운데 제일 어두운 색."""
        c = Counter()
        for p in cells:
            c[p] += 1
        if not c:
            return (18, 18, 26, 255)
        return min(c.most_common(8), key=lambda kv: sum(kv[0][:3]))[0]


    def frame_grid(px, ox, fw, fh):
        g = {}
        for y in range(fh):
            for x in range(fw):
                p = px[ox + x * S + 1, y * S + 1]
                if p[3] > 8:
                    g[(x, y)] = p
        return g


    def edge_cells(g, fw, fh):
        out = []
        for (x, y), p in g.items():
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < fw and 0 <= ny < fh) or (nx, ny) not in g:
                    out.append(p)
                    break
        return out


    def check(g, fw, fh):
        """변마다 (잘린 칸수, 그 변에 닿은 칸수) 를 준다."""
        if not g:
            return {}
        ol = outline_color(edge_cells(g, fw, fh))
        thr = lum(ol) * 1.35 + 6

        def cut(p):
            return lum(p) > thr

        xs = [k[0] for k in g]
        ys = [k[1] for k in g]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        out = {}
        # ★ 아래쪽은 안 본다. 이 게임의 몹은 발바닥이 칸 맨 아랫줄에 닿도록 그려져
        #   있고(그래야 땅에 선다) 발밑에는 윤곽선을 안 긋는다. 아래를 세면 주인공과
        #   원형처럼 멀쩡한 시트까지 전부 걸린다 — 처음 돌렸을 때 101장이 나온 이유가
        #   그것이었다.
        for side, line, span in (
                ('위', [(x, y0) for x in range(fw)] if y0 <= 1 else [], fw),
                ('왼', [(x0, y) for y in range(fh)] if x0 <= 1 else [], fh),
                ('오른', [(x1, y) for y in range(fh)] if x1 >= fw - 2 else [], fh)):
            n = t = 0
            for k in line:
                p = g.get(k)
                if not p:
                    continue
                t += 1
                if cut(p):
                    n += 1
            # 점 몇 개는 무늬다. 변의 15% 넘게 끊겨야 잘린 것으로 본다.
            if n >= MIN_CUT and n >= span * 0.15:
                out[side] = (n, t)
        return out


    def main(argv):
        pick = [a for a in argv if not a.startswith('-')]
        man = json.load(open(os.path.join(ASSETS, 'manifest.json')))
        rows = []
        for sec in ('characters', 'bosses'):
            for name, m in man[sec]['sheets'].items():
                if pick and not any(p in name for p in pick):
                    continue
                fw, fh, cnt = m['frameW'], m['frameH'], m['count']
                gap = m.get('gap', 4 if sec == 'bosses' else 0)
                im = Image.open(os.path.join(ASSETS, m['file'])).convert('RGBA')
                px = im.load()
                tot = Counter()
                hit = Counter()
                for i in range(cnt):
                    g = frame_grid(px, i * (fw * S + gap), fw, fh)
                    for side, (n, t) in check(g, fw, fh).items():
                        tot[side] += n
                        hit[side] = max(hit[side], t)
                if tot:
                    rows.append((sec, name, fw, fh, dict(tot), dict(hit)))
        rows.sort(key=lambda r: -sum(r[4].values()))
        print('== 윤곽선 없이 끊긴 가장자리가 있는 시트')
        for sec, name, fw, fh, tot, hit in rows:
            s = ' · '.join('%s %d칸(변 %d)' % (k, v, hit[k]) for k, v in tot.items())
            print('  %-16s %-11s %2dx%-3d  %s' % (name, sec, fw, fh, s))
        print('\n  %d장' % len(rows))
        return 0


    if __name__ == '__main__':
        raise SystemExit(main(sys.argv[1:]))


# ===== stray — 예전 tools/straycheck.py ==============================
def _stray(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'straycheck.py')] + argv
    __name__ = '__main__'
    """몸에서 **떨어져 나와 떠 있는 작은 덩어리**를 찾는다.

    붉은 울음꾼(crimson_howler)의 몸 양옆에 연분홍 네모가 떠 있는 것을 흰 바탕에
    놓고서야 봤다. 게임에서는 배경에 묻혀 안 보이지만 시트로 보면 "뜬금없이 붙어
    있는 것"으로 읽힌다.

    가리는 잣대 — 덩어리가

      · 칸에서 **가장 큰 덩어리(몸)** 가 아니고
      · 넓이가 몸의 STRAY_REL 미만이며
      · 몸과 GAP_MIN 칸 이상 떨어져 있고
      · 죽는 칸이 아니다 (무너진 잔해는 원래 흩어진다)

    면 잔해로 본다. 죽는 칸을 빼는 것이 중요하다 — 거기서는 떨어져 나온 덩어리가
    정상이다.

    사용법:
        python3 tools/straycheck.py            # 찾기만
        python3 tools/straycheck.py --write    # 지운다
        python3 tools/straycheck.py imp        # 하나만
    """
    import json
    import os
    import sys
    from collections import deque

    from PIL import Image

    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ASSETS = os.path.join(ROOT, 'play', 'assets')
    MANIFEST = os.path.join(ASSETS, 'manifest.json')
    S = 4
    STRAY_REL = 0.08     # 몸 넓이의 이만큼 미만이어야 잔해
    GAP_MIN = 2          # 몸과 이만큼 이상 떨어져 있어야 잔해
    MAX_CELLS = 24       # 이보다 크면 잔해로 보지 않는다


    def blobs(a, fw, fh):
        """이어진 덩어리들 → [(칸 목록)] (여덟 방향)"""
        seen = [[False] * fw for _ in range(fh)]
        out = []
        for y in range(fh):
            for x in range(fw):
                if seen[y][x] or a[y][x] <= 8:
                    continue
                q, cells = deque([(x, y)]), []
                seen[y][x] = True
                while q:
                    cx, cy = q.popleft()
                    cells.append((cx, cy))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < fw and 0 <= ny < fh and not seen[ny][nx] and a[ny][nx] > 8:
                                seen[ny][nx] = True
                                q.append((nx, ny))
                out.append(cells)
        return out


    def gap_to(cells, body):
        """잔해와 몸 사이의 가장 가까운 거리(체비쇼프)."""
        best = 1e9
        for x, y in cells:
            for bx, by in body:
                d = max(abs(x - bx), abs(y - by))
                if d < best:
                    best = d
                    if best <= 1:
                        return best
        return best


    def main(argv):
        write = '--write' in argv
        only = [x for x in argv if not x.startswith('-')]
        man = json.load(open(MANIFEST, encoding='utf-8'))
        total = 0
        for name, m in sorted(man['characters']['sheets'].items()):
            if only and name not in only:
                continue
            path = os.path.join(ASSETS, m['file'])
            im = Image.open(path).convert('RGBA')
            px = im.load()
            fw, fh, cnt = m['frameW'], m['frameH'], m['count']
            gap = m.get('gap', 0)
            found = []
            # ★ 죽는 칸(마지막 둘)은 보지 않는다 — 무너진 잔해가 흩어지는 것이 정상이다.
            for i in range(max(0, cnt - 2)):
                ox = i * (fw * S + gap)
                a = [[px[ox + x * S + 1, y * S + 1][3] for x in range(fw)] for y in range(fh)]
                bl = blobs(a, fw, fh)
                if len(bl) < 2:
                    continue
                bl.sort(key=len, reverse=True)
                body = bl[0]
                for cells in bl[1:]:
                    if len(cells) > MAX_CELLS or len(cells) > len(body) * STRAY_REL:
                        continue
                    if gap_to(cells, body) < GAP_MIN:
                        continue
                    found.append((i, cells))
            if not found:
                continue
            total += 1
            print(f'  {name:18} ' + '  '.join(
                f'칸{i}: {len(c)}칸 @({min(x for x,_ in c)},{min(y for _,y in c)})'
                for i, c in found))
            if not write:
                continue
            for i, cells in found:
                ox = i * (fw * S + gap)
                for lx, ly in cells:
                    for dy in range(S):
                        for dx in range(S):
                            px[ox + lx * S + dx, ly * S + dy] = (0, 0, 0, 0)
            im.save(path)
        print(('지웠다: ' if write else '찾기만 했다(--write 로 지움): ') + f'시트 {total}개'
              if total else '떠 있는 잔해 없음.')
        return 0


    if __name__ == '__main__':
        raise SystemExit(main(sys.argv[1:]))


# ===== pad — 예전 tools/padframe.py ==============================
def _pad(argv):
    _sys.argv = [_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'padframe.py')] + argv
    __name__ = '__main__'
    """칸 가장자리에 **벽처럼 닿은** 그림에 좌우 여백을 준다.

    ■ 무엇이 문제였나

      몹 시트는 칸 사이 간격이 0 이라 칸이 딱 붙어 있다. 그림이 칸의 왼쪽이나 오른쪽
      끝에 닿아 있으면, 시트로 볼 때 **옆 칸 그림과 맞닿아** 잘린 것처럼 읽힌다.
      (보스 시트 중 열한 장은 간격이 4 라서 이 문제가 없다 — "보스는 괜찮다"는 말이
       여기서 나온다.)

    ■ 왜 게임 위치가 안 바뀌나 — 증명

      **가로.** dx = (e.w - frameW)/2 - side 이고, 게임이 다시 재는
      side = ((left+right+1)/2 - fw/2)/S 는 좌우가 함께 밀리면 값이 그대로다.
      좌우에 같은 양 k 를 덧대면 frameW 가 2k 늘어 dx 가 k 줄고, 그림도 칸 안에서
      k 오른쪽으로 가서 정확히 상쇄된다.

      **세로.** 그림은 `sy - dy` 에 그려진다(+dy 가 아니다).
      dy = frameH - e.h - foot 이고 foot = frameH - bottom/S - 1 이므로

          dy = bottom/S + 1 - e.h

      즉 dy 는 frameH 와 **무관**하고, 그림 발끝은 언제나 판정 박스 바닥에 떨어진다.
      위에 k 줄을 덧대면 frameH 와 bottom 이 같이 k 만큼 밀리므로 foot 은 그대로이고
      dy 만 k 늘어난다. 그림도 칸 안에서 k 아래로 가므로 `sy - dy + (y+k)` 에서
      둘이 상쇄된다. **매니페스트의 foot 도 안 고쳐도 된다.**

    ■ 아래는 안 덧댄다

      발이 칸 맨 아랫줄에 닿는 것이 정상이고, 아래에 여백을 주면 dy 계산의 bottom 이
      바뀌지 않으므로 그냥 빈 줄만 는다.

    ■ 아래 벽은 건드리지 않는다

      땅에 서려면 발이 칸 맨 아랫줄에 닿아야 한다. 아래가 꽉 찬 것은 정상이다.

    사용법:
        python3 tools/padframe.py            # 얼마나 덧댈지만
        python3 tools/padframe.py --write    # 실제로 덧댄다
    """
    import json
    import os
    import sys

    from PIL import Image

    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ASSETS = os.path.join(ROOT, 'play', 'assets')
    MANIFEST = os.path.join(ASSETS, 'manifest.json')
    S = 4
    WANT = 2        # 좌우·위에 두고 싶은 최소 여백(논리 픽셀)
    # ★ 플레이어 시트는 뺀다. 칸 이름표(playerFrames)도 그리는 길도 몹과 달라서,
    #   위의 상쇄가 그대로 성립하는지 확인하지 않았다. 확인 안 한 것은 안 건드린다.
    SKIP = ('player',)


    def sides(px, ox, fw, fh):
        cols = [x for x in range(fw)
                if any(px[ox + x * S + 1, y * S + 1][3] > 8 for y in range(fh))]
        if not cols:
            return None
        return cols[0], fw - 1 - cols[-1]


    def top(px, ox, fw, fh):
        for y in range(fh):
            if any(px[ox + x * S + 1, y * S + 1][3] > 8 for x in range(fw)):
                return y
        return None


    def main(argv):
        write = '--write' in argv
        only = [x for x in argv if not x.startswith('-')]
        man = json.load(open(MANIFEST, encoding='utf-8'))
        sheets = man['characters']['sheets']
        todo = []
        for name, m in sorted(sheets.items()):
            if only and name not in only:
                continue
            if name.startswith(SKIP):
                continue
            path = os.path.join(ASSETS, m['file'])
            im = Image.open(path).convert('RGBA')
            px = im.load()
            fw, fh, cnt = m['frameW'], m['frameH'], m['count']
            gap = m.get('gap', 0)
            worst_x, worst_y = WANT, WANT
            for i in range(cnt):
                ox = i * (fw * S + gap)
                s = sides(px, ox, fw, fh)
                if s:
                    worst_x = min(worst_x, s[0], s[1])
                t = top(px, ox, fw, fh)
                if t is not None:
                    worst_y = min(worst_y, t)
            if worst_x >= WANT and worst_y >= WANT:
                continue
            kx = max(0, WANT - worst_x)
            ky = max(0, WANT - worst_y)
            todo.append((name, m, path, im, fw, fh, cnt, gap, kx, ky, worst_x, worst_y))

        for name, m, path, im, fw, fh, cnt, gap, kx, ky, wx, wy in todo:
            print(f'  {name:18} {fw}x{fh} → {fw + 2 * kx}x{fh + ky}'
                  f'   좌우 +{kx} 위 +{ky} (가장 좁은 여백 좌우 {wx} 위 {wy})')
            if not write:
                continue
            nw, nh = fw + 2 * kx, fh + ky
            out = Image.new('RGBA', (nw * S * cnt + gap * (cnt - 1), nh * S), (0, 0, 0, 0))
            for i in range(cnt):
                fr = im.crop((i * (fw * S + gap), 0, i * (fw * S + gap) + fw * S, fh * S))
                out.paste(fr, (i * (nw * S + gap) + kx * S, ky * S))
            out.save(path)
            m['frameW'] = nw
            m['frameH'] = nh
        if write and todo:
            json.dump(man, open(MANIFEST, 'w', encoding='utf-8'),
                      ensure_ascii=False, indent=2)
            print(f'\n덧댔다: {len(todo)}장. ★ node tools/sync-manifest.mjs 를 돌려야 한다.')
        else:
            print(f'\n{"바꿀 것 없음" if not todo else f"찾기만 했다(--write 로 저장): {len(todo)}장"}')
        return 0


    if __name__ == '__main__':
        raise SystemExit(main(sys.argv[1:]))


CMDS = {'anim': _anim, 'clip': _clip, 'stray': _stray, 'pad': _pad}

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or (a[0] not in CMDS and a[0] != 'all'):
        sys.exit('쓰기: python3 tools/sprcheck.py <' + '|'.join(CMDS) + '> [인자…]')
    if a[0] == 'all':
        for f in CMDS.values(): f([])
    else:
        CMDS[a[0]](a[1:])
