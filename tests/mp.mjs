/* 멀티플레이(M2) — 두 탭: 호스트가 ?mp=host 로 방을 열고 참가자가 ?mp=join 으로 붙는다.
   중개는 api/_room-core.js 를 메모리 저장소로 돌리는 로컬 HTTP 서버(배포된 Vercel 함수와 같은 규칙) + 실제 WebRTC.
   참가자가 세계 스냅샷을 받아 같은 세계에 서는가 · 서로의 아바타가 보이는가 · 참가자가 걸은 자리가 호스트에 닿는가 · 끊기면 빠지는가. */
import http from 'node:http';
import { serve, browser, collectErrors, fail, ok } from './lib.mjs';
import { handleRoom, memoryStore } from '../api/_room-core.js';

/* 중개 규칙 — 서버 없이 먼저 */
{
  const st = memoryStore();
  const { body: { room, key } } = await handleRoom(st, { op: 'open' });
  const a = await handleRoom(st, { op: 'post', room, to: 'host', msg: { t: 'want', from: 'abc' } });
  const b = await handleRoom(st, { op: 'poll', room, id: 'host', key });
  const c = await handleRoom(st, { op: 'poll', room, id: 'host', key });
  const thief = await handleRoom(st, { op: 'poll', room, id: 'host' });
  const d = await handleRoom(st, { op: 'post', room: 'ZZZZZ', to: 'host', msg: {} });
  const e = await handleRoom(st, { op: 'post', room, to: 'host', msg: { sdp: 'x'.repeat(13000) } });
  const okRule = /^[A-Z0-9]{5}$/.test(room) && a.status === 200 && b.body.msgs.length === 1 && b.body.msgs[0].from === 'abc'
    && c.body.msgs.length === 0 && d.status === 404 && e.status === 413 && thief.status === 403;
  if (okRule) ok(`중개 규칙: 방 ${room} · 우편함 비우기 · 없는 방 404 · 큰 글 413 · 열쇠 없이 호스트 우편함 403`); else fail('중개 규칙');
  /* 되찾기 — 만료된(지워진) 방은 같은 열쇠로 같은 코드를 다시, 남의 열쇠로는 409 */
  const steal = await handleRoom(st, { op: 'open', room, key: 'nope' });
  await handleRoom(st, { op: 'close', room, key });
  const r1 = await handleRoom(st, { op: 'open', room: room.toLowerCase(), key });
  if (steal.status === 409 && r1.status === 200 && r1.body.room === room) ok('중개 규칙: 같은 열쇠로 같은 코드를 되찾고 남의 열쇠는 막는다'); else fail(`중개 규칙: 되찾기 ${JSON.stringify(r1)}`);
}
const store = memoryStore();
const sigSrv = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    const { status, body: out } = await handleRoom(store, JSON.parse(body || '{}'));
    res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
  });
});
await new Promise(r => sigSrv.listen(0, '127.0.0.1', r));
/* MP_SIG 가 있으면 그 중개로(tests/relay.mjs 가 Cloudflare 중개를 로컬로 띄워 넘긴다) */
const SIG = process.env.MP_SIG || `http://127.0.0.1:${sigSrv.address().port}/api/room`;

const { srv, url } = await serve();
const b = await browser();
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const host = await ctx.newPage(), guest = await ctx.newPage();
const eh = collectErrors(host), eg = collectErrors(guest);
let bad = 0;
const check = (cond, msg) => { if (cond) ok(msg); else { bad++; fail(msg); } };

await host.goto(url + `/index.html?lang=ko&mp=host&sig=${encodeURIComponent(SIG)}`);
await host.waitForFunction(() => window.G && G.booted, null, { timeout: 60000 });
await host.evaluate(() => G._newGame('d1', 'Host', 'wanderer', 'normal', 's'));
await host.waitForFunction(() => G.net && G.net.sig, null, { timeout: 10000 });
const room = await host.evaluate(() => G.net.room);
await guest.goto(url + `/index.html?lang=ko&mp=join&room=${room.toLowerCase()}&name=Guest&char=ranger&sig=${encodeURIComponent(SIG)}`);
await guest.waitForFunction(() => G.net && G.net.id > 0 && G.world, null, { timeout: 60000 });
await guest.waitForTimeout(1000);
const seen = await guest.evaluate(() => ({ seed: G.world.seed, n: G.players.length, hostName: (G.players.find(p => p.remote) || {}).name }));
check(seen.seed === 'd1' && seen.n === 2 && seen.hostName === 'Host', `참가자가 호스트 세계(${seen.seed})에서 호스트를 본다 (${seen.n}명)`);

const x0 = await guest.evaluate(() => G.me.x);
await guest.keyboard.down('d'); await guest.waitForTimeout(900); await guest.keyboard.up('d');
await guest.waitForTimeout(700);
const r = await host.evaluate(() => { const g = G.players.find(p => p.remote); return g ? { x: g.x, name: g.name, n: G.players.length } : null; });
const gx = await guest.evaluate(() => G.me.x);
check(r && r.name === 'Guest' && gx - x0 > 100 && Math.abs(r.x - gx) < 24, `호스트가 참가자 걸음을 본다 (참가자 ${Math.round(gx - x0)}px 걸음 · 어긋남 ${r ? Math.round(Math.abs(r.x - gx)) : '?'}px)`);

/* 세계 바뀜 — 참가자가 캔 칸이 호스트로, 호스트가 놓은 칸이 참가자로 · 기반암은 참가자 글로 안 바뀐다 · 문 */
const spot = await guest.evaluate(() => {
  const p = G.me, tx = Math.floor(p.cx / 16) + 3, ty = Math.floor((p.y + p.h + 1) / 16) + 1;
  const before = G.world.get(tx, ty);
  G.world.set(tx, ty, T.AIR);                              // 캐기와 같은 길(world.set)
  G.world.set(5, G.world.dims.WH - 1, T.AIR);              // 기반암 — 호스트가 거절해야 한다
  return { tx, ty, before };
});
await host.evaluate(({ tx, ty }) => G.world.set(tx, ty - 3, T.STONE), spot);
await guest.waitForTimeout(800);
const tilesHost = await host.evaluate(({ tx, ty }) => [G.world.get(tx, ty), G.world.get(5, G.world.dims.WH - 1) === T.BEDROCK], spot);
const tileGuest = await guest.evaluate(({ tx, ty }) => G.world.get(tx, ty - 3) === T.STONE, spot);
check(spot.before !== 0 && tilesHost[0] === 0 && tilesHost[1] && tileGuest, `세계 바뀜: 참가자가 캔 칸 → 호스트 · 호스트가 놓은 칸 → 참가자 · 기반암은 그대로`);
const doorOk = await host.evaluate(() => { const d = G.world.doors[0]; if (!d) return null; d.closed = !d.closed; G.netDoor(d); return [d.x, d.y, d.closed]; });
await guest.waitForTimeout(600);
const doorG = doorOk && await guest.evaluate(([x, y]) => { const d = G.world.doors.find(o => o.x === x && o.y === y); return d && d.closed; }, doorOk);
check(!doorOk || doorG === doorOk[2], `문: 호스트가 여닫으면 참가자 화면도 (${doorOk ? doorOk[2] : '문 없음'})`);

const hp0 = await guest.evaluate(() => G.me.hp);
await host.evaluate(() => G.players.find(p => p.remote).hurt(20, 0));
await guest.waitForTimeout(500);
const hp1 = await guest.evaluate(() => G.me.hp);
const hostHp = await host.evaluate(() => G.me.hp);
check(hp1 < hp0 && hostHp > 0, `호스트 쪽에서 참가자 아바타가 맞으면 피해는 참가자에게 (${hp0} → ${hp1})`);

/* 참가 받기 창 — 지나면 호스트가 우편함 확인을 멈추고(중개 요청 0), mpInvite 로 다시 켠다(폴링 중개만) */
if (!process.env.MP_SIG) {
await host.evaluate(() => G.net.sig.resume(300));
await host.waitForTimeout(2600);
const idle = await host.evaluate(() => G.net.sig.polling);
await host.evaluate(() => G.mpInvite());
await host.waitForTimeout(400);
const again = await host.evaluate(() => G.net.sig.polling);
check(idle === false && again === true, `참가 받기 창: 지나면 확인을 멈추고(${idle}) 다시 켠다(${again})`);
}

await guest.close();
await host.waitForTimeout(1500);
const left = await host.evaluate(() => G.players.length);
check(left === 1, `참가자가 나가면 호스트 쪽에서 빠진다 (${left}명)`);
check(!eh.length && !eg.length, `콘솔 오류 0 ${[...eh, ...eg].slice(0, 2).join(' | ')}`);
srv.close(); sigSrv.close(); await b.close();
process.exit(bad ? 1 : 0);
