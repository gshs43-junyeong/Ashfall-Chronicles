/* 가짜 로케일 검사 — 원문의 한글을 전부 Ж 로 바꾼 시험 언어(xx)로 게임을 돌린다.
   ① 콘솔 오류 0: 한국어 글을 값으로 비교·열쇠로 쓰는 로직이 있으면 여기서 깨진다.
   ② 화면에 한글이 남지 않는다: 옮기지 못한 글(감싸지 않은 문구 · 표 밖 글 · 코드가 이어 붙인 한국어)을 찾는다.
   ★ 다른 언어를 넣기 전(P8)에 이 검사가 먼저 통과해야 한다. 남은 글은 자리와 함께 보인다. */
import { serve, browser, DETERMINISM, collectErrors, boot, fail, ok, readJSON, ROOT } from './lib.mjs';
import path from 'node:path';

const src = readJSON(path.join(ROOT, 'src/game/locales/source.json'));
/* 한글 한 글자마다 Ж — 자리표 { } 안(조사 훅 이름)은 그대로. 화면에 한글이 하나라도 남으면 옮기지 못한 글이다. */
const pseudo = s => { let d = 0, o = ''; for (const c of s) { if (c === '{') d++; else if (c === '}') d--; o += !d && /[\uAC00-\uD7A3]/.test(c) ? 'Ж' : c; } return o; };
const XX = { msgs: {}, tables: {} };
for (const k in src.msgs) XX.msgs[k] = pseudo(k);
for (const k in src.tables) XX.tables[k] = pseudo(src.tables[k]);
const INIT = `globalThis.ASHFALL_LOCALES = { xx: ${JSON.stringify(XX)} };`;

/** 보이는 글에 남은 한글 */
const LEFTOVER = () => {
  const out = new Map();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE)$/.test(el.nodeName) || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue;
    const t = n.data.trim();
    if (/[\uAC00-\uD7A3]/.test(t)) out.set(t.slice(0, 60), (el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.nodeName));
  }
  for (const el of document.querySelectorAll('[placeholder],[title]'))
    for (const a of ['placeholder', 'title']) { const v = el.getAttribute(a); if (v && /[\uAC00-\uD7A3]/.test(v) && el.getClientRects().length) out.set(v.slice(0, 60), a); }
  return [...out].map(([t, w]) => `${w} "${t}"`);
};

const { srv, url } = await serve();
const b = await browser();
let leftAll = new Map(), errsAll = 0;
async function scene(q, steps) {
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(DETERMINISM(3));
  await page.addInitScript(INIT);
  const errs = collectErrors(page);
  await boot(page, url + '/index.html?lang=xx' + (q ? '&' + q : ''));
  const note = tag => page.evaluate(LEFTOVER).then(l => l.forEach(x => leftAll.has(x) || leftAll.set(x, tag)));
  await note('title');
  const lang = await page.evaluate(() => [LANG, document.documentElement.lang, document.title]);
  if (lang[0] !== 'xx' || /[\uAC00-\uD7A3]/.test(lang[2])) fail('가짜 언어가 켜지지 않았다: ' + lang.join(' / '));
  await page.evaluate(() => G.newGame('d1', 0, 'Tester', 'wanderer', 'normal', 's'));
  for (let i = 0; i < 1200; i++) {
    if (await page.evaluate(() => { __step(1); return G.state === 'play' && !!G.player; })) break;
    await page.waitForTimeout(25);
  }
  await page.evaluate(() => { G.player.iframe = 1e9; __step(60); });
  await note(q || 'play');
  for (const [name, fn] of steps) {
    await page.evaluate(fn).catch(e => errs.push(name + ': ' + e.message.split('\n')[0]));
    await page.evaluate(() => __step(20));
    await note((q || 'play') + ' ' + name);
  }
  if (errs.length) { errsAll += errs.length; fail(`${q || '새 게임'}: 오류 ${errs.length} — ${errs.slice(0, 3).join(' / ')}`); }
  await page.close();
}
await scene('', [
  ['걷기', () => { G.keys.KeyD = 1; __step(40); G.keys.KeyD = 0; }],
  ['가방', () => UI.togglePanel('inv')],
  ['특성', () => UI.togglePanel('skill')],
  ['일지', () => UI.togglePanel('quest')],
  ['제작', () => UI.togglePanel('craft')],
  ['닫기', () => UI.closePanel()],
  ['장 이야기', () => UI.storyScene(CHAPTERS[0], 'intro')],
  ['이야기 닫기', () => UI.closeDialogue()],
  ['멈춤', () => G.setPause(true)],
  ['설정', () => { $('#btn-settings-pause').click(); }],
  ['설정 닫기', () => { $('#btn-settings-close').click(); G.setPause(false); }],
  ['저장', () => G.saveGame()],
  ['쓰러짐', () => { G.player.iframe = 0; G.onDeath('test'); }],
  ['부활', () => G.respawn()],
  ['지도', () => UI.openFullmap()],
]);
await scene('debug=village&lv=3&sess=2&plv=40', [['상점', () => UI.openShop('borin')], ['마을', () => UI.openTownhall()], ['게시판', () => UI.openBoard()]]);
await scene('debug=factory', [['기계', () => UI.openMachine([...G.world.machines.values()].find(m => m.t === 'smelter'))], ['12초', () => __step(720)]]);
await scene('debug=ruin&id=mine&pulse=70', [['맥박', () => __step(300)]]);
await scene('debug=sea&sess=3&plv=80', [['헤엄', () => __step(300)]]);
await scene('debug=cave&k=geode', [['굴', () => __step(120)]]);
b.close(); srv.close();

if (leftAll.size) {
  console.log(`화면에 남은 한글 ${leftAll.size}곳(처음 본 장면):`);
  for (const [t, w] of leftAll) console.log(`   [${w}] ${t}`);
  fail('옮기지 못한 글이 화면에 남았다');
} else ok('가짜 언어(xx) — 옮기지 못한 글 0');
if (!errsAll) ok('가짜 언어(xx) — 콘솔 오류 0 (장면 6)');
