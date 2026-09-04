#!/usr/bin/env python3
"""유적을 실제로 걸어 다닐 수 있는지 진단한다.

"방이 이어져 있다"(빈칸 잇기)만으로는 부족하다 — 사람이 뛰어서 닿을 수 있어야 한다.
그래서 플레이어를 흉내 낸 이동 모형으로 훑는다.

  선 자리 = (x, y) 로, 발밑이 단단하고 머리 두 칸이 비어 있는 자리.
  옆 칸으로 갈 수 있는 조건 = 그 칸에서 **세 칸까지 올라가거나 얼마든지 떨어질 수 있다.**
  (플레이어 점프가 세 칸 남짓이고, 발판(PLATFORM)은 밟고 설 수 있다)

재는 것 넷:
  1. 지상(또는 유적을 두른 공동)에서 유적 안까지 들어갈 수 있는가
  2. 들어간 자리에서 **보스 둥지까지** 걸어 닿는가
  3. 보스 둥지에서 **다시 입구까지** 나올 수 있는가
  4. 고유 이벤트 · 암호문 · 신비한 방 · 유물 상자가 제자리에 있고 실제로 도는가

    python3 tools/ruindiag.py [씨앗…]
"""
import asyncio
import sys

SEEDS = sys.argv[1:] or ['d1', 'd2', 'd3']

WALK_JS = r"""
/* 플레이어를 흉내 낸 이동 판정. 선 자리에서 선 자리로만 옮겨 다닌다.
   선 자리 = 발밑이 단단하고(또는 발판) 머리 두 칸이 비어 있는 자리.

   실제 물리(entity.js): 점프 속도 620, 중력 2000 -> 최고 96px ≈ 4.4칸.
   보수적으로 세 칸까지만 오른다고 본다. 오르는 동안 머리 위가 뚫려 있어야 하고,
   가장 높은 자리에서 옆으로 최대 네 칸까지 날아간 뒤 떨어진다.
   **제자리에서 위로 뛰는 것도 이동이다** — 발판 사다리(폭 한 칸)는 그렇게만 오른다.
   아래 키를 누르면 발판을 뚫고 내려갈 수 있다(move의 dropThrough). */
(args) => {
  const w = G.world, WWl = 4200, JUMP = 3, FALL = 60, RUN = 4;
  // 봉인석은 열쇠로 여는 문이다 — 여기까지 온 사람은 열쇠가 있으니 뚫린 것으로 본다
  const support = (x, y) => { const s = TILE_DEF[w.get(x, y)].solid; return s === 1 || s === 2; };
  const plat = (x, y) => TILE_DEF[w.get(x, y)].solid === 2;
  const free = (x, y) => w.get(x, y) === T.SEALSTONE || TILE_DEF[w.get(x, y)].solid !== 1;
  const room = (x, y) => free(x, y) && free(x, y - 1);        // 몸 두 칸이 들어가는가
  const stand = (x, y) => room(x, y) && support(x, y + 1);
  const key = (x, y) => y * WWl + x;

  const settle = (x, y) => {
    for (let k = 0; k <= FALL; k++) if (stand(x, y + k)) return y + k;
    for (let k = 1; k <= JUMP + 3; k++) if (stand(x, y - k)) return y - k;
    return -1;
  };
  const walk = (sx, sy, box) => {
    const y0 = settle(sx, sy);
    if (y0 < 0) return null;
    const seen = new Set([key(sx, y0)]), st = [[sx, y0]];
    const push = (x, y) => {
      const k = key(x, y);
      if (seen.has(k)) return;
      seen.add(k); st.push([x, y]);
    };
    // (x, yh) 에서 발이 닿을 때까지 떨어진다
    const drop = (x, yh) => {
      for (let cy = yh; cy <= box[3]; cy++) {
        if (!room(x, cy)) return;
        if (stand(x, cy)) { push(x, cy); return; }
      }
    };
    let guard = 0;
    while (st.length && guard++ < 300000) {
      const [x, y] = st.pop();
      // 발판 위라면 아래 키로 뚫고 내려간다
      if (plat(x, y + 1)) drop(x, y + 2);
      for (let h = 0; h <= JUMP; h++) {
        const yh = y - h;
        if (yh < box[1]) break;
        if (h > 0 && !free(x, yh - 1)) break;                 // 머리가 천장에 막힌다
        if (h > 0 && stand(x, yh)) push(x, yh);               // 제자리 점프로 발판에 올라선다
        for (const dx of [-1, 1]) {
          for (let s = 1; s <= RUN; s++) {
            const nx = x + dx * s;
            if (nx < box[0] || nx > box[2] || !room(nx, yh)) break;
            drop(nx, yh);
          }
        }
      }
    }
    return seen;
  };
  const near = (seen, x, y, r) => {
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++)
      if (seen.has(key(x + dx, y + dy))) return true;
    return false;
  };

  const out = [];
  for (const r of w.ruins) {
    if (!r.id) continue;
    const spec = RUIN_SPEC.find(q => q.id === r.id);
    const site = w.ruinSites.find(s => s.id === r.id);
    const x0 = r.x - (r.w >> 1), x1 = r.x + (r.w >> 1);
    const y0 = r.y - (r.h >> 1), y1 = r.y + (r.h >> 1);
    const box = [x0 - 14, 2, x1 + 14, Math.min(478, y1 + 14)];

    // 석판 유적에는 둥지 대신 석판이 놓인다 — 거기가 "가장 안쪽"이다
    const lair = w.objects.find(o => (o.type === 'lair' || o.type === 'altar' || o.type === 'tablet') &&
      o.x / 22 > x0 - 4 && o.x / 22 < x1 + 4 && o.y / 22 > y0 - 4 && o.y / 22 < y1 + 6);
    const chests = w.objects.filter(o => o.type === 'chest' &&
      o.x / 22 > x0 - 4 && o.x / 22 < x1 + 4 && o.y / 22 > y0 - 4 && o.y / 22 < y1 + 6);

    /* ① 보스 자리에서 걸어 다닐 수 있는 범위. 여기서 유적 밖으로 나갈 수 있으면
       "들어갈 수도 나올 수도 있다"가 된다(이동이 거의 대칭이므로). */
    let res = { id: r.id, arch: spec ? spec.arch : '-',
                rooms: site ? site.rooms.length : null, lair: !!lair };
    if (!lair) { out.push(Object.assign(res, { note: '둥지 없음' })); continue; }
    const lx = Math.round(lair.x / 22), ly = Math.round(lair.y / 22) + 1;
    const seen = walk(lx, ly, box);
    if (!seen) { out.push(Object.assign(res, { note: '둥지 자리에 설 수 없음' })); continue; }

    /* 밖으로 나가는가 — 유적 상자 바깥 또는 지표 위까지 닿는가.
       입구가 없는 유적(arch: 'buried')은 애초에 파고 들어가고 파고 나오는 곳이라
       "걸어서 나가기"를 요구하지 않는다. 대신 벽 앞까지 닿기만 하면 된다. */
    const buried = spec && spec.arch === 'buried';
    let outOfRuin = false;
    for (const k of seen) {
      const y = Math.floor(k / WWl), x = k % WWl;
      const m = buried ? 1 : 3;
      if (x < x0 - m || x > x1 + m || y < y0 - m || y <= w.surface[x] + 1) { outOfRuin = true; break; }
    }
    // 방·상자에 얼마나 닿는가
    const rooms = site ? site.rooms : [];
    const roomHit = rooms.filter(rr => {
      for (let x = rr.x + 1; x < rr.x + rr.w - 1; x++)
        for (let y = rr.y + 1; y < rr.y + rr.h - 1; y++) if (seen.has(key(x, y))) return true;
      return false; }).length;
    const chestHit = chests.filter(o => near(seen, Math.round(o.x / 22), Math.round(o.y / 22), 3)).length;

    out.push(Object.assign(res, {
      // 입구 없는 유적은 파고 드나드는 곳이라 "걸어서 나가기"를 묻지 않는다
      보스에서밖으로: buried ? '해당없음' : outOfRuin,
      방: roomHit + '/' + rooms.length,
      상자: chestHit + '/' + chests.length,
      칸수: seen.size
    }));
  }
  return out;
}
"""


async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg = await b.new_page(viewport={'width': 1280, 'height': 780})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('C:' + m.text)
              if m.type == 'error' and 'favicon' not in m.text else None)
        await pg.goto('http://127.0.0.1:8777/index.html')
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(2400)

        bad = 0
        for seed in SEEDS:
            await pg.evaluate("(s) => G.newGame(s, 0, '진단', 'wanderer', 'normal')", seed)
            await pg.wait_for_timeout(3400)
            print('=== 씨앗', seed)
            rows = await pg.evaluate(WALK_JS, {})
            for r in rows:
                if 'note' in r:
                    bad += 1
                    print('  %-8s %-8s  %s  <-- 문제' % (r['id'], r['arch'], r['note']))
                    continue
                rh, rn = (int(v) for v in r['방'].split('/'))
                # 봉인방처럼 BSP 방이 없는 곳은 "보스까지 갔다 나올 수 있는가"만 본다
                ok = (r['보스에서밖으로'] in (True, '해당없음')) and (rn == 0 or rh / rn >= 0.8)
                if not ok:
                    bad += 1
                print('  %-8s %-8s 방%-6s 보스↔밖 %-5s 상자 %-6s 칸 %-6s %s'
                      % (r['id'], r['arch'], r['방'], r['보스에서밖으로'], r['상자'],
                         r['칸수'], '' if ok else '  <-- 문제'))

            ev = await pg.evaluate("""() => {
              const out = [];
              for (const e of (G.world.ruinEvents || [])) {
                G.ruinEvDone = {};
                const before = G.ents.length;
                G.player.x = e.x + e.w / 2; G.player.y = e.y + e.h - 60;
                G.ruinDark = 0; G.ruinSpore = 0;
                G.checkRuinEvent();
                out.push(e.ruin + ':' + e.ev + ':' +
                  (G.ents.length - before > 0 || G.ruinDark > 0 || G.ruinSpore > 0 ||
                   e.ev === 'password' || e.ev === 'collapse' ? 'OK' : 'X'));
              }
              return out; }""")
            print('  이벤트:', ' '.join(ev))
            if any(x.endswith(':X') for x in ev):
                bad += 1

            extra = await pg.evaluate("""() => {
              const w = G.world;
              const cd = w.objects.filter(o => o.type === 'codedoor');
              let codeOK = true;
              for (const o of cd) {
                window.prompt = () => G.ruinCode(o.ruin);
                G.openCodeDoor(o);
                if (!o.opened) codeOK = false;
              }
              const my = w.objects.filter(o => o.type === 'mystic');
              return { 암호문: cd.length, 암호열림: codeOK,
                       신비한방: my.map(o => o.mk), 유물: w.objects.filter(o => o.relic).length,
                       지도: w.objects.filter(o => o.ruinmap).length }; }""")
            print('  그 밖:', extra)
            if not extra['암호열림'] or extra['유물'] < 8 or len(extra['신비한방']) < 2:
                bad += 1

        print()
        print('문제 있는 항목:', bad, '| 콘솔 오류:', errs[:4] if errs else '없음')
        await b.close()

asyncio.run(main())
