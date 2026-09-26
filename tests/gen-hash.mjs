/* 세계 생성 해시 — 씨앗 d1·d3 × 크기 s·m·l 의 타일·벽지·물건이 기준값과 **바이트 단위로** 같은가.
   ★ 난수를 부르는 순서가 하나라도 바뀌면 같은 씨앗이 다른 세계가 된다(엔진화 계획 §0). 이 검사가 그걸 막는다.
   기준값 다시 찍기: node tests/gen-hash.mjs --update (생성을 **일부러** 바꾼 커밋에서만) */
import path from 'node:path';
import fs from 'node:fs';
import { serve, browser, BASE, UPDATE, collectErrors, writeJSON, readJSON, fail, ok } from './lib.mjs';

const CASES = [['d1', 's'], ['d3', 's'], ['d1', 'm'], ['d3', 'm'], ['d1', 'l'], ['d3', 'l']];
const FILE = path.join(BASE, 'gen-hash.json');

const { srv, url } = await serve();
const b = await browser();
const page = await b.newPage();
const errs = collectErrors(page);
await page.goto(url + '/index.html');
await page.waitForFunction(() => typeof World === 'function' && typeof setWorldSize === 'function');

const got = {};
for (const [seed, size] of CASES) {
  const t0 = Date.now();
  got[`${seed}:${size}`] = await page.evaluate(([seed, size]) => {
    const fnv = (arr) => { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
    const str = s => fnv(new TextEncoder().encode(s));
    setWorldSize(size);
    const w = new World(seed); w.generate();
    return { ww: WW, wh: WH, tiles: fnv(w.tiles), walls: fnv(w.walls), objects: str(JSON.stringify(w.objects)),
      nObjects: w.objects.length, ruins: (w.ruins || []).length };
  }, [seed, size]);
  console.log(`  ${seed}:${size}  ${JSON.stringify(got[`${seed}:${size}`])}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
await b.close(); srv.close();

if (errs.length) fail('콘솔 오류: ' + errs.slice(0, 5).join('\n  '));
if (UPDATE || !fs.existsSync(FILE)) {
  writeJSON(FILE, got);
  ok('기준값을 적었다 — ' + path.relative(process.cwd(), FILE));
} else {
  const want = readJSON(FILE);
  let bad = 0;
  for (const k of Object.keys(want)) {
    const a = JSON.stringify(want[k]), g = JSON.stringify(got[k]);
    if (a !== g) { bad++; fail(`${k} 가 달라졌다\n    기준 ${a}\n    지금 ${g}`); }
  }
  if (!bad) ok(`세계 생성 ${Object.keys(want).length}건이 기준값과 같다`);
}
