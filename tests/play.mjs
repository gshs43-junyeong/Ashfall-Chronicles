/* 동작 스크립트 — 사람이 하는 몇 가지를 그대로 해 보고, 저장 → 불러오기 뒤 상태가 같은지 본다(엔진화 계획 §6-3).
   새 게임 → 걷기 · 점프 → 곡괭이로 캐기 → 횃불 놓기 → 문 열고 닫기 → 저장 → 불러오기 → 위치·가방·타일 대조,
   그리고 ?debug=factory 를 12초 돌려 공장이 움직이는지. 콘솔 오류는 0 이어야 한다. */
import { serve, browser, DETERMINISM, collectErrors, boot, newGame, fail, ok } from './lib.mjs';

const { srv, url } = await serve();
const b = await browser();

/* 페이지에 심는 도우미 — 세계 좌표 칸을 마우스로 겨눈다(readInput 이 mx/my 에서 wx/wy 를 다시 셈한다). */
const HELPERS = () => {
  window.__aim = (tx, ty) => {
    const z = G.viewZoom();
    G.input.mx = ((tx + 0.5) * TS - G.cam.x) * z; G.input.my = ((ty + 0.5) * TS - G.cam.y) * z;
  };
  window.__snap = () => {
    const p = G.player, w = G.world;
    let h = 0x811c9dc5; for (let i = 0; i < w.tiles.length; i++) { h ^= w.tiles[i]; h = Math.imul(h, 16777619); }
    return { x: Math.round(p.x), y: Math.round(p.y), hp: Math.round(p.hp), level: p.level, gold: p.gold,
      bag: JSON.stringify(p.bag.map(it => it && [it.id, it.c || 1])), tiles: (h >>> 0).toString(16),
      doors: w.objects.filter(o => o.type === 'door').map(o => o.closed ? 1 : 0).join(''), chapter: G.chapter };
  };
};

async function hold(page, key, frames) {
  await page.keyboard.down(key);
  await page.evaluate(n => __step(n), frames);
  await page.keyboard.up(key);
}

/* ---- 1. 새 게임 · 움직임 · 캐기 · 놓기 · 문 · 저장/불러오기 ---- */
{
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(DETERMINISM(7));
  const errs = collectErrors(page);
  await boot(page, url + '/index.html');
  await newGame(page, { seed: 'd1', size: 's' });
  await page.evaluate(HELPERS);
  await page.evaluate(() => { G.player.iframe = 1e9; __step(30); if (UI.dlg) UI.closeDialogue(); });

  const x0 = await page.evaluate(() => G.player.x);
  await hold(page, 'KeyD', 60);
  await hold(page, 'Space', 12);
  await page.evaluate(() => __step(40));
  const x1 = await page.evaluate(() => G.player.x);
  x1 > x0 + 40 ? ok(`걷기: ${Math.round(x1 - x0)}px 움직였다`) : fail(`걷기: ${Math.round(x1 - x0)}px 밖에 안 움직였다`);

  // 곡괭이(1번 칸)로 발밑 오른쪽 땅 한 칸을 캔다
  const mined = await page.evaluate(() => {
    const p = G.player; p.sel = 0;
    const tx = Math.floor(p.cx / TS) + 1;
    let ty = Math.floor((p.y + p.h - 1) / TS);                 // 발밑에서 아래로 첫 캘 수 있는 칸
    while (ty < WH - 1 && !(G.world.get(tx, ty) !== T.AIR && TILE_DEF[G.world.get(tx, ty)].drop && TILE_DEF[G.world.get(tx, ty)].hard <= 1)) ty++;
    const before = G.world.get(tx, ty);
    G.input.m1 = 1;
    for (let i = 0; i < 600 && G.world.get(tx, ty) === before; i++) { __aim(tx, ty); __step(1); }
    G.input.m1 = 0;
    return { before, after: G.world.get(tx, ty), tx, ty };
  });
  mined.after !== mined.before ? ok(`캐기: (${mined.tx},${mined.ty}) ${mined.before} → ${mined.after}`) : fail('캐기: 칸이 그대로다');

  // 횃불(2번 칸)을 옆 빈 칸에 놓는다 — 바닥이 있는 가장 가까운 빈 칸을 찾는다
  const placed = await page.evaluate(() => {
    const p = G.player, w = G.world; p.sel = 1;
    const cx = Math.floor(p.cx / TS), fy = Math.floor((p.y + p.h) / TS) - 1;
    for (const dx of [-2, 2, -3, 3, -1]) {
      const tx = cx + dx;
      for (let ty = fy - 2; ty <= fy + 2; ty++) {
        if (w.get(tx, ty) !== T.AIR || !w.solid(tx, ty + 1)) continue;
        __aim(tx, ty); __step(1); G.rightClick(); __step(2);
        if (w.get(tx, ty) === T.TORCH) return { tx, ty, ok: true };
      }
    }
    return { ok: false };
  });
  placed.ok ? ok(`놓기: 횃불을 (${placed.tx},${placed.ty}) 에`) : fail('놓기: 횃불이 놓이지 않았다');

  // 캠프 오두막 문 하나를 열고 닫는다(플레이어를 문 옆으로 옮겨서)
  const door = await page.evaluate(() => {
    const d = G.world.objects.find(o => o.type === 'door'); if (!d) return null;
    const p = G.player; p.x = d.x + (d.dir > 0 ? 3 * TS : -3 * TS); p.y = d.y + d.h - p.h; __step(5);
    const a = d.closed; G.interact(d); const b1 = d.closed; __step(20); G.interact(d); const c = d.closed;
    return [a, b1, c];
  });
  door && door[0] !== door[1] && door[1] !== door[2] ? ok('문: 열고 닫힌다') : fail('문: ' + JSON.stringify(door));

  // 저장 → 불러오기
  await page.evaluate(() => __step(30));
  const before = await page.evaluate(async () => { G.currentSlot = 0; const r = await G.saveGame(); return r ? __snap() : null; });
  if (!before) fail('저장이 실패했다');
  await page.evaluate(async () => { G.player.x += 999; await G.loadGame(0); });
  for (let i = 0; i < 400; i++) {
    const done = await page.evaluate(() => { __step(1); return G.state === 'play' && G.player && Math.abs(G.player.x - (window.__beforeX || 0)) >= 0; });
    await page.waitForTimeout(15);
    if (done && i > 60) break;
  }
  const after = await page.evaluate(() => __snap());
  const diff = before ? Object.keys(before).filter(k => k !== 'hp' && String(before[k]) !== String(after[k])) : ['저장 실패'];
  diff.length ? fail('저장→불러오기 뒤 달라진 것: ' + diff.map(k => `${k} ${before && before[k]} → ${after[k]}`).join(' · '))
              : ok(`저장→불러오기: 위치·가방·타일·문·장 같음 (타일 해시 ${after.tiles})`);

  errs.length ? fail('콘솔 오류:\n  ' + errs.slice(0, 6).join('\n  ')) : ok('콘솔 오류 0 (새 게임)');
  await page.close();
}

/* ---- 2. 예시 공장 12초 ---- */
{
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(DETERMINISM(11));
  const errs = collectErrors(page);
  await boot(page, url + '/index.html?debug=factory');
  await newGame(page, { seed: 'd1', size: 's' });
  await page.evaluate(() => { G.player.iframe = 1e9; if (UI.dlg) UI.closeDialogue(); });
  const sig = () => page.evaluate(() => JSON.stringify([...G.world.machines.values()].map(m => [m.t, m.items || m.inv || m.buf || null, m.prog || 0, m.charge || 0])));
  const a = await sig();
  await page.evaluate(() => { for (let i = 0; i < 12; i++) __step(60); });
  const c = await sig();
  const n = await page.evaluate(() => G.world.machines.size);
  a !== c ? ok(`공장: 기계 ${n}대가 12초 동안 움직였다`) : fail('공장: 12초 동안 아무것도 바뀌지 않았다');
  errs.length ? fail('콘솔 오류:\n  ' + errs.slice(0, 6).join('\n  ')) : ok('콘솔 오류 0 (예시 공장)');
  await page.close();
}

await b.close(); srv.close();
