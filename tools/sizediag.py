#!/usr/bin/env python3
"""세계 크기(소형·중형·대형)마다 세계를 만들어 **특수 구조물이 서로 겹치지 않는지**, 세계 밖으로
나가지 않는지 본다. 생성 시간 · 세이브 글자 수 · 흩뿌린 것의 개수도 같이 찍는다.

    (game 폴더를 127.0.0.1:8777 로 띄운 채로 — tools/ruindiag.py 와 같다)
    python3 tools/sizediag.py [크기:씨앗 …]        # 기본 s:d1 m:d1 l:d1

구조물 상자는 유적(석판 유적 셋 · 바이옴 유적 여섯 · 봉인실) · 사막 던전 · 공창 · 폭주로 · 설계실 ·
부유 성채 · 최심부 폐광 · 여명 마을 · 베이스캠프 · 정글 폭포 · 떠 있는 섬 · 하늘 관문이다.
새 구조물을 더하면 아래 add(...) 에도 한 줄 더할 것 — 안 더하면 겹쳐도 모른다.
"""
import asyncio, json, sys
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--js-flags=--max-old-space-size=4096'])
        pg = await br.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('warn:' + m.text) if m.type in ('error', 'warning') and 'willReadFrequently' not in m.text else None)
        await pg.goto('http://127.0.0.1:8777/index.html'); await pg.evaluate("localStorage.clear()"); await pg.reload()
        await pg.wait_for_timeout(2200)
        for size, seed in [a.split(':') for a in (sys.argv[1:] or ['s:d1', 'm:d1', 'l:d1'])]:
            r = await pg.evaluate("""([size, seed]) => { try {
              setWorldSize(size); const t0 = performance.now(); const w = new World(seed).generate(); const gen = Math.round(performance.now() - t0);
              const B = [];
              const add = (n, x0, y0, x1, y1) => B.push({ n, x0, y0, x1, y1 });
              for (const r of w.ruins) add('ruin:' + r.id, r.x - (r.w >> 1), r.y - (r.h >> 1), r.x + (r.w >> 1), r.y + (r.h >> 1));
              if (w.dungeon) { const d = w.dungeon; add('dungeon', d.x - (d.w >> 1), d.y - (d.h >> 1), d.x + (d.w >> 1), d.y + (d.h >> 1)); }
              for (const k of ['works', 'runaway', 'atelier', 'citadel', 'deepShaft']) { const s = w[k]; if (s) add(k, s.x0, s.y0, s.x0 + s.w, s.y0 + s.h); }
              if (w.dawnCity) add('dawn', w.dawnCity.x0 - 20, w.dawnCity.gy - 30, w.dawnCity.x1 + 20, w.dawnCity.gy + 4);
              add('camp', CAMP_X0 - 12, w.villageY - 25, CAMP_X1 + 12, w.villageY + 4);
              if (w.jungleLake) add('junglefalls', w.jungleLake.x0 - 2, w.jungleLake.y - 22, w.jungleLake.x1 + 14, w.jungleLake.y + 8);
              if (w.isle) add('isle', w.isle.x - (w.isle.w >> 1), w.isle.y - 12, w.isle.x + (w.isle.w >> 1), w.isle.y + 9);
              if (w.skyGate) add('skygate', w.skyGate.x - 17, w.skyGate.y - 13, w.skyGate.x + 17, w.skyGate.y + 9);
              const ov = [];
              for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
                const a = B[i], b = B[j];
                if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) ov.push(a.n + ' x ' + b.n);
              }
              const inW = B.filter(b => b.x0 < 0 || b.x1 >= WW || b.y0 < 0 || b.y1 >= WH).map(b => b.n);
              const ser = JSON.stringify(w.serialize());
              let fallsT = 0; for (let k = 0; k < w.tiles.length; k++) if (w.tiles[k] === T.FALLS) fallsT++;
              const out = { size, seed, WW, WH, gen, ruins: w.ruins.length, sites: w.ruinSites.length, caverns: w.caverns.length, pools: w.pools.length, faults: w.faults.length, falls: w.falls.length,
                chests: w.objects.filter(o => o.type === 'chest').length, sky: w.skyIslands.length, saveChars: ser.length, overlaps: ov, outside: inW,
                boxes: B.map(b => b.n + '@' + b.x0 + ',' + b.y0) };
              return out; } catch (e) { return { size, seed, err: String(e && e.stack || e) }; } }""", [size, seed])
            r.pop('boxes', None)
            bad = r.get('err') or r.get('overlaps') or r.get('outside')
            print(('!! ' if bad else 'ok ') + json.dumps(r, ensure_ascii=False))
        await pg.evaluate("() => setWorldSize('s')")
        print('errs', errs[:8])
        await br.close()
asyncio.run(main())
