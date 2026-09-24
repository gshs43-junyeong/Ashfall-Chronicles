#!/usr/bin/env python3
"""유적 입구 통로의 발판을 **어디서 왔는지 갈라서** 센다.

  직접    통로를 지을 때(_buildPassage) 놓은 것 — 발판형 계단실의 나무 발판 계단뿐이어야 한다
  보수 뒤  세계를 다 만든 뒤 통행 보수(_ensureWalkable)까지 마친 최종 개수

같은 씨앗으로 보수를 끄고 한 번, 켜고 한 번 만들어 뺀다. 보수가 더한 것이 크면 통로에
되올라올 수 없는 턱이 남아 있다는 뜻이다(보수는 턱마다 두 칸짜리 발판 사다리를 세운다).
오름 = 작은 방이 앞 방보다 위에 놓인 횟수(입구가 무조건 내리막이 아닌지).

  기준(2026-09, 씨앗 d1~d4): 옛 수직 갱도 3485장 → 벽돌 복도 656장
  (피라미드는 빗면 문으로 들어가 _carveEntranceShaft 를 안 거치므로 이 표에 없다)

    python3 tools/entdiag.py [씨앗…]      # 정적 서버가 127.0.0.1:8777 에 떠 있어야 한다
"""
import asyncio, sys

SEEDS = sys.argv[1:] or ['d1', 'd2']

HOOK = r"""
(noRepair) => {
  if (!window.__origEW) window.__origEW = World.prototype._ensureWalkable;
  World.prototype._ensureWalkable = noRepair ? function(){} : window.__origEW;
  if (!window.__origCES) {
    window.__origCES = World.prototype._carveEntranceShaft;
    World.prototype._carveEntranceShaft = function(ex, yTop, yBot, spec, rng){
      const r = window.__origCES.call(this, ex, yTop, yBot, spec, rng);
      /* 재는 상자는 코드의 통로 폭과 **상관없이** 고정한다 — 목 둘레 ±60칸, 지상에서 유적 지붕
         바로 위까지. 통로 폭을 코드에서 읽어 오면 판마다 상자가 달라져 옛 판과 견줄 수 없다. */
      (window.__ent = window.__ent || []).push({ id: spec.id || 'seal',
        kind: spec.entryKind || 'foothold', x0: ex - 60, x1: ex + 60,
        y0: yTop - 3, y1: yBot - 1, rooms: this._entranceRooms.slice() });
      return r;
    };
  }
}
"""

COUNT = r"""
() => {
  const w = G.world, out = [];
  for (const e of window.__ent || []) {
    let p = 0;
    for (let x = e.x0; x <= e.x1; x++) for (let y = e.y0; y <= e.y1; y++)
      if (w.get(x, y) === T.PLATFORM) p++;
    let rise = 0;
    for (let i = 1; i < e.rooms.length; i++) if (e.rooms[i][4] < e.rooms[i - 1][4] - 1) rise++;
    out.push({ id: e.id, kind: e.kind, p, rooms: e.rooms.length, rise });
  }
  return out;
}
"""


async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium',
                                     args=['--use-gl=swiftshader'])
        pg = await b.new_page(viewport={'width': 900, 'height': 600})
        await pg.goto('http://127.0.0.1:8777/index.html')
        await pg.evaluate("localStorage.clear()"); await pg.reload()
        await pg.wait_for_timeout(2400)
        tot = {True: 0, False: 0}
        for seed in SEEDS:
            res = {}
            for nr in (True, False):
                await pg.evaluate(HOOK, nr)
                await pg.evaluate("() => { window.__ent = []; }")
                await pg.evaluate("(s) => G.newGame(s, 0, '진단', 'wanderer', 'normal')", seed)
                await pg.wait_for_timeout(3400)
                res[nr] = await pg.evaluate(COUNT)
            print('=== 씨앗', seed)
            for a, c in zip(res[True], res[False]):
                tot[True] += a['p']; tot[False] += c['p']
                print('  %-8s %-10s 방%2d 오름%d  발판 직접%4d  보수 뒤%4d  (보수가 더함 %+d)'
                      % (a['id'], a['kind'], a['rooms'], a['rise'], a['p'], c['p'], c['p'] - a['p']))
        print('--- 합계 직접 %d · 보수 뒤 %d' % (tot[True], tot[False]))
        await b.close()

asyncio.run(main())
