/* 스크린샷 대조 — 타이틀 · 새 게임 창 · 디버그 주소 9곳을 고정 씨앗 · 고정 프레임으로 찍어 기준 그림과 비교한다(엔진화 계획 §6-2).
   ★ 글꼴·브라우저 판이 다르면 글자 모양이 달라진다 — 기준 그림은 같은 환경(이 저장소의 Playwright 판 · Docker)에서 찍고 비교할 것.
   기준 다시 찍기: node tests/shots.mjs --update   · 다른 환경에서 건너뛰기: SKIP_SHOTS=1 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { serve, browser, DETERMINISM, collectErrors, boot, newGame, BASE, OUT, UPDATE, fail, ok } from './lib.mjs';

if (process.env.SKIP_SHOTS) { console.log('- 스크린샷 대조 건너뜀(SKIP_SHOTS)'); process.exit(0); }

const DIR = path.join(BASE, 'shots');
const TOL = 0.004;                               // 달라도 되는 화소 비율(0.4%) — 글자 안티에일리어싱 정도
const CASES = [
  { id: 'title', q: '', title: true },
  { id: 'newgame', q: '', form: true },
  { id: 'start', q: '' },
  { id: 'village', q: '?debug=village&lv=3&sess=2' },
  { id: 'price', q: '?debug=price' },
  { id: 'factory', q: '?debug=factory' },
  { id: 'sea', q: '?debug=sea' },
  { id: 'fishfarm', q: '?debug=fishfarm' },
  { id: 'ruin-mine', q: '?debug=ruin&id=mine&pulse=40' },
  { id: 'cave-geode', q: '?debug=cave&k=geode' },
  { id: 'bomb', q: '?debug=bomb' }
];

fs.mkdirSync(DIR, { recursive: true });
const { srv, url } = await serve();
const b = await browser();
let bad = 0;
for (const c of CASES) {
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(DETERMINISM(99));
  const errs = collectErrors(page);
  await boot(page, url + '/index.html' + c.q);
  if (c.form) await page.evaluate(() => { G.showNewGameForm(0); __step(10); });
  else if (!c.title) {
    await newGame(page, { seed: 'd1', size: 's' });
    await page.evaluate(() => { G.player.iframe = 1e9; __step(90); if (UI.dlg) UI.closeDialogue(); __step(90); });
  } else await page.evaluate(() => __step(60));
  const buf = await page.screenshot();
  await page.close();
  if (errs.length) { bad++; fail(`${c.id}: 콘솔 오류\n  ` + errs.slice(0, 4).join('\n  ')); }

  const f = path.join(DIR, c.id + '.png');
  if (UPDATE || !fs.existsSync(f)) { fs.writeFileSync(f, buf); ok(`${c.id}: 기준 그림을 적었다`); continue; }
  const A = PNG.sync.read(fs.readFileSync(f)), B = PNG.sync.read(buf);
  if (A.width !== B.width || A.height !== B.height) { bad++; fail(`${c.id}: 크기가 다르다`); continue; }
  const diff = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0.1 });
  const r = n / (A.width * A.height);
  if (r > TOL) {
    bad++;
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, c.id + '.now.png'), buf);
    fs.writeFileSync(path.join(OUT, c.id + '.diff.png'), PNG.sync.write(diff));
    fail(`${c.id}: 화소 ${(r * 100).toFixed(2)}% 가 다르다 (tests/out/${c.id}.diff.png)`);
  } else ok(`${c.id}: 같다 (${(r * 100).toFixed(3)}%)`);
}
await b.close(); srv.close();
if (!bad) ok('스크린샷 대조 통과');
