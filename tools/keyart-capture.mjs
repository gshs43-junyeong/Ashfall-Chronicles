/* 대표 그림(tools/mkkeyart.py)에 쓸 게임 장면을 찍는다 — 헤드리스 브라우저로 새 게임을 열고 하늘 섬 · 지표 · 땅속이 한 화면에
   들어오게 시야를 넓힌 뒤 UI 를 걷어 캔버스만 찍는다.
     node tools/keyart-capture.mjs [출력 폴더] [섬 번호…]   (VIEW=100 시야 % · DAY=1090 하루 중 분)
   ★ 결정론 장치(tests/lib.mjs)로 찍어 같은 씨앗이면 같은 그림이 나온다. */
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, DETERMINISM, boot, newGame, ROOT } from '../tests/lib.mjs';

const out = process.argv[2] || path.join(ROOT, 'tools', 'art', 'keyart');
const pick = process.argv.slice(3).map(Number);
fs.mkdirSync(out, { recursive: true });
const { srv, url } = await serve();
const b = await browser();
const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript(DETERMINISM(7));
await boot(page, url + '/index.html');
await newGame(page, { seed: 'd1', size: 's' });
await page.waitForTimeout(4800);
await page.evaluate(({ VIEW }) => {
  G.player.iframe = 1e9;
  for (let i = 0; i < 3; i++) { if (UI.dlg) UI.closeDialogue(); __step(60); }
  G.settings.view = +(VIEW || 100); G.settings.quality = 'low'; G.resize();
  G.spawnEnemy = () => null;
  const r = G.render.bind(G);          // 카메라는 플레이어를 따라가지 않고 정해 둔 자리에 — 그리기 바로 앞에서 덮는다
  G.render = (...a) => { if (window.__cam) { G.cam.x = __cam.x; G.cam.y = __cam.y; } return r(...a); };
}, { VIEW: process.env.VIEW || 100 });
await page.addStyleTag({ content: 'body > *:not(#app){visibility:hidden!important} #app > *:not(#game){visibility:hidden!important}' });
const isl = await page.evaluate(() => G.world.skyIslands.map((s, i) => ({ i, ...s })));
const list = pick.length ? pick : isl.map(s => s.i);
for (const i of list) {
  const s = isl[i];
  await page.evaluate(({ s, DAY }) => {
    const TS = 22, w = G.world, p = G.player;
    const x = s.x - 22;                // 섬 왼쪽 아래 땅 위 — 섬 · 주인공 · 하늘(로고 자리)이 한 화면에
    let y = 0; while (y < w.surface.length * 0 + 400 && !(w.solid(x, y) && y > s.y + 14)) y++;
    p.x = x * TS; p.y = (y - 2) * TS; p.vx = 0; p.vy = 0; p.face = 1;
    G.dayT = DAY;
    window.__cam = { x: s.x * TS - G.W * 0.66, y: (s.y - 12) * TS };
    __step(90);
  }, { s, DAY: +(process.env.DAY || 1090) });
  await page.screenshot({ path: path.join(out, `scene_${i}.png`) });
  console.log(i, s.x, s.y, s.k || '');
}
await b.close(); srv.close();
