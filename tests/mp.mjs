/* 멀티플레이(M2) — 같은 브라우저의 두 탭: 호스트가 ?mp=host 로 방을 열고 참가자가 ?mp=join 으로 붙는다(탭 중개 + 실제 WebRTC).
   참가자가 세계 스냅샷을 받아 같은 세계에 서는가 · 서로의 아바타가 보이는가 · 참가자가 걸은 자리가 호스트에 닿는가 · 끊기면 빠지는가. */
import { serve, browser, collectErrors, fail, ok } from './lib.mjs';

const { srv, url } = await serve();
const b = await browser();
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const host = await ctx.newPage(), guest = await ctx.newPage();
const eh = collectErrors(host), eg = collectErrors(guest);
let bad = 0;
const check = (cond, msg) => { if (cond) ok(msg); else { bad++; fail(msg); } };

await host.goto(url + '/index.html?lang=ko&mp=host&room=t1');
await host.waitForFunction(() => window.G && G.booted, null, { timeout: 60000 });
await host.evaluate(() => G._newGame('d1', 'Host', 'wanderer', 'normal', 's'));
await guest.goto(url + '/index.html?lang=ko&mp=join&room=t1&name=Guest&char=ranger');
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

const hp0 = await guest.evaluate(() => G.me.hp);
await host.evaluate(() => G.players.find(p => p.remote).hurt(20, 0));
await guest.waitForTimeout(500);
const hp1 = await guest.evaluate(() => G.me.hp);
const hostHp = await host.evaluate(() => G.me.hp);
check(hp1 < hp0 && hostHp > 0, `호스트 쪽에서 참가자 아바타가 맞으면 피해는 참가자에게 (${hp0} → ${hp1})`);

await guest.close();
await host.waitForTimeout(1500);
const left = await host.evaluate(() => G.players.length);
check(left === 1, `참가자가 나가면 호스트 쪽에서 빠진다 (${left}명)`);
check(!eh.length && !eg.length, `콘솔 오류 0 ${[...eh, ...eg].slice(0, 2).join(' | ')}`);
srv.close(); await b.close();
process.exit(bad ? 1 : 0);
