/* 사이트·배포용 게임 화면(16:9 · 영어 화면)을 찍는다 — 바이옴별이 아니라 핵심 시스템 장면(유적 결전 · 공장 · 운석 · 바다 · 하늘 섬 ·
   동굴 폭포 · 마을). 사이트가 바로 쓰는 JPEG(품질 82)로 site/shots/<장면>.jpg 에 적는다. 디버그 바로가기로 그 자리에 가서 장면을 꾸린 뒤 HUD 까지 그대로 찍는다(알림·장 카드만 숨김).
     node tools/shots-capture.mjs [출력 폴더] [장면…]   (LANG=en · W=1920 · H=1080)
   ★ 결정론 장치(tests/lib.mjs)로 찍어 같은 씨앗이면 같은 그림이 나온다. */
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, DETERMINISM, collectErrors, boot, ROOT } from '../tests/lib.mjs';

const out = process.argv[2] || path.join(ROOT, 'site', 'shots');
const only = process.argv.slice(3);
const LANG = process.env.LANG_SHOT || 'en';
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);   // VIEW=150 — 시야 배율 %(1920 폭에선 100 이면 인물이 너무 작다)

/* 장면: q = 디버그 주소, set = 게임 안에서 장면을 꾸리는 함수(브라우저에서 돈다), steps = 찍기 전 흘릴 프레임 */
const SCENES = [
  { id: 'ruin', q: 'debug=ruin&id=mine&pulse=70&plv=30', steps: 90, set: () => {
    const p = G.player;
    G.spawnBoss('mine_horror', p.cx + 260, p.cy - 60);
    p.face = 1;
  } },
  { id: 'factory', q: 'debug=factory', steps: 240, set: () => {
    const w = G.world, p = G.player, TS = 22, ms = [...w.machines.values()];
    const xs = ms.map(m => m.x).sort((a, b) => a - b), mx = xs[Math.floor(xs.length * 0.3)];
    const m = ms.find(m => m.x === mx);
    p.x = mx * TS; p.y = (m.y - 3) * TS; p.vx = p.vy = 0; G.dayT = 11 * 60;
  } },
  { id: 'sea', q: 'debug=sea', steps: 60, set: () => {
    const w = G.world, p = G.player, TS = 22;
    const x = Math.floor(p.cx / TS) - 60, y = w.sea.level + 14;
    p.x = x * TS; p.y = y * TS; p.vx = p.vy = 0; G.dayT = 12 * 60;
    for (const [t, dx, dy] of [['reef_shark', 9, -2], ['lantern_jelly', -8, -4], ['reef_crab', 6, 5], ['lantern_jelly', 15, -6], ['reef_shark', -14, 4]])
      G.ents.push(new Enemy(t, (x + dx) * TS, (y + dy) * TS, 1));
  } },
  { id: 'meteor', q: 'debug=meteor&dx=16', steps: 0, set: () => { G.dayT = 18 * 60 + 40; }, wait: 'meteor' },
  { id: 'sky', q: '', steps: 120, set: () => {
    const w = G.world, p = G.player, TS = 22, s = w.skyIslands[6] || w.skyIslands[0];
    p.x = (s.x - 2) * TS; p.y = (s.y - 4) * TS; p.vx = p.vy = 0; p.face = 1; G.dayT = 1080;
  } },
  { id: 'waterfall', q: '', steps: 180, set: () => {
    const w = G.world, p = G.player, TS = 22;
    let best = null;
    for (let x = 0; x < w.w && !best; x += 1) for (let y = 60; y < 260; y++) if (w.get(x, y) === T.FALLS && w.get(x, y + 5) === T.FALLS) { best = [x, y]; break; }
    if (best) { p.x = (best[0] - 7) * TS; p.y = (best[1] + 4) * TS; let k = 0; while (!w.solid(Math.floor(p.cx / TS), Math.floor((p.y + p.h) / TS)) && k++ < 60) p.y += TS; p.y -= TS; }
    G.dayT = 13 * 60;
  } },
  { id: 'village', q: 'debug=village&lv=4&sess=2', steps: 200, set: () => { G.dayT = 17 * 60; } }
];

fs.mkdirSync(out, { recursive: true });
const { srv, url } = await serve();
const b = await browser();
for (const s of SCENES) {
  if (only.length && !only.includes(s.id)) continue;
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.addInitScript(DETERMINISM(11));
  const errs = collectErrors(page);
  await boot(page, `${url}/index.html?lang=${LANG}${s.q ? '&' + s.q : ''}`);
  await page.evaluate(() => G.newGame('d1', 0, 'Wren', 'wanderer', 'normal', 's'));
  for (let i = 0; i < 1200; i++) {
    if (await page.evaluate(() => { __step(1); return G.state === 'play' && !!G.world && !!G.player; })) break;
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(4800);
  await page.evaluate(() => { G.player.iframe = 1e9; for (let i = 0; i < 3; i++) { if (UI.dlg) UI.closeDialogue(); __step(30); } });
  await page.addStyleTag({ content: '#chapter-card,#toasts,#cc-art{visibility:hidden!important}' });
  await page.evaluate(v => { G.settings.view = v; G.resize(); }, +(process.env.VIEW || 150));
  await page.evaluate(s.set);
  if (s.wait === 'meteor') {
    for (let i = 0; i < 400; i++) { if (await page.evaluate(() => { __step(1); return !!(G.meteor && G.meteor.t > 3.2); })) break; }
  }
  await page.evaluate(n => { for (let i = 0; i < n; i++) __step(1); if (UI.dlg) UI.closeDialogue(); }, s.steps);
  await page.screenshot({ path: path.join(out, s.id + '.jpg'), type: 'jpeg', quality: 82 });
  console.log(s.id, errs.length ? 'errors: ' + errs.slice(0, 2).join(' | ') : 'ok');
  await page.close();
}
await b.close(); srv.close();
