/* 엔진 예제(games/sample) — ① 엔진 밖을 import 하지 않는가 ② 헤드리스로 돌려 서기 · 걷기 · 캐기 · 멈춤 · 저장/불러오기가 되는가.
   엔진이 게임(src/game)을 모르고도 도는지의 증명이다 — 엔진을 고치다 이것이 깨지면 게임만 쓰던 가정이 엔진에 스며든 것이다. */
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, DETERMINISM, collectErrors, ROOT, OUT, fail, ok } from './lib.mjs';

const SRC = path.join(ROOT, 'games', 'sample', 'src');
const ENGINE = path.join(ROOT, 'src', 'engine');
let bad = 0;
for (const f of fs.readdirSync(SRC).filter(n => n.endsWith('.ts'))) {
  const text = fs.readFileSync(path.join(SRC, f), 'utf8');
  for (const m of text.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
    const to = path.resolve(SRC, m[1].replace(/\.js$/, '.ts'));
    if (!to.startsWith(ENGINE + path.sep) && path.dirname(to) !== SRC) { bad++; fail(`games/sample/src/${f}: 엔진 밖을 import 한다 — ${m[1]}`); }
  }
}
if (!bad) ok('예제는 src/engine 만 import 한다');

const { srv, url } = await serve(ROOT);
const b = await browser();
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(DETERMINISM(3));
const errs = collectErrors(page);
await page.goto(url + '/games/sample/index.html?lang=ko');
await page.waitForFunction(() => window.SAMPLE && window.__step, null, { timeout: 15000 });

const r = await page.evaluate(async () => {
  const S = window.SAMPLE, TS = 16, out = {};
  __step(120);
  out.landed = S.player.onGround;
  const x0 = S.player.x;
  S.input.keys.ArrowRight = 1; __step(60); S.input.keys.ArrowRight = 0; __step(5);
  out.walked = S.player.x - x0;
  /* 발밑 칸을 캔다 — 커서(화면 px) = (세계 px − 카메라) × 확대 */
  const z = innerHeight > 700 ? 2 : 1.5, p = S.player;
  const tx = Math.floor(p.cx / TS), ty = Math.floor((p.y + p.h + 1) / TS);
  out.before = S.map.get(tx, ty);
  S.ptr.mx = ((tx + 0.5) * TS - S.cam.x) * z; S.ptr.my = ((ty + 0.5) * TS - S.cam.y) * z;
  S.ptr.m1 = 1; __step(70); S.ptr.m1 = 0; __step(2);
  out.after = S.map.get(tx, ty);
  /* 멈춤 겹 — 갱신이 멈춘다 */
  S.scenes.set('pause', true); const y0 = S.player.y; S.player.vy = 300; __step(30);
  out.pausedMoved = S.player.y !== y0; S.scenes.set('pause', false);
  /* 저장 → 칸을 바꿈 → 불러오기 = 되돌아온다 */
  await S.save(); const mark = S.map.get(10, 5); S.map.set(10, 5, 3); await S.load();
  out.restored = S.map.get(10, 5) === mark;
  __step(2);                                                     // 멈춤을 푼 화면으로 찍는다
  return out;
});
await page.screenshot({ path: path.join(OUT, 'sample.png') });
await b.close(); srv.close();

if (r.landed) ok('떨어져 땅에 선다'); else fail('땅에 서지 않았다');
if (r.walked > 60) ok(`오른쪽으로 걷는다(${r.walked.toFixed(0)}px)`); else fail(`거의 안 걸었다(${r.walked}px)`);
if (r.before !== 0 && r.after === 0) ok('발밑 칸을 캤다'); else fail(`캐지 못했다(${r.before} → ${r.after})`);
if (!r.pausedMoved) ok('멈춤 겹이 갱신을 막는다'); else fail('멈춘 동안에도 움직였다');
if (r.restored) ok('저장 → 불러오기로 칸이 되돌아온다'); else fail('불러오기가 칸을 되돌리지 못했다');
if (errs.length) fail('콘솔 오류\n  ' + errs.slice(0, 4).join('\n  ')); else ok('콘솔 오류 0');
