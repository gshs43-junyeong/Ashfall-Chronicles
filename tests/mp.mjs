/* 멀티플레이(M2) — 두 창: 호스트가 ?mp=host 로 방을 열고 참가자가 ?mp=join 으로 붙는다.
   중개는 로컬에 띄운 PeerJS 서버(npm peer — 공개 0.peerjs.com 과 같은 서버) + 실제 WebRTC. MP_SIG 가 있으면 그 중개로
   (tests/relay.mjs 가 Cloudflare 중개를 로컬로 띄워 넘긴다).
   참가자가 세계 스냅샷을 받아 같은 세계에 서는가 · 서로의 아바타가 보이는가 · 참가자가 걸은 자리가 호스트에 닿는가 · 끊기면 빠지는가. */
import net from 'node:net';
import { PeerServer } from 'peer';
import { serve, browser, collectErrors, fail, ok } from './lib.mjs';

const peerSrv = await new Promise(r => PeerServer({ port: 0, host: '127.0.0.1', path: '/' }, srv => r({ srv, port: srv.address().port })));
const SIG = process.env.MP_SIG || `peer:ws://127.0.0.1:${peerSrv.port}/peerjs`;

const { srv, url } = await serve();
const b = await browser();
/* ★ 창(문맥)을 따로 — 한 창의 두 탭이면 뒤 탭의 화면 갱신이 느려져 게임 시간이 거의 안 흐른다(무적 시간이 안 풀려 시험이 흔들렸다). */
const host = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const guest = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const eh = collectErrors(host), eg = collectErrors(guest);
let bad = 0;
const check = (cond, msg) => { if (cond) ok(msg); else { bad++; fail(msg); } };

await host.goto(url + `/index.html?lang=ko&mp=host&sig=${encodeURIComponent(SIG)}`);
await host.waitForFunction(() => window.G && G.booted, null, { timeout: 60000 });
await host.evaluate(() => { G._newGame('d1', 'Host', 'wanderer', 'normal', 's'); G.dbgCalm = true; G.ents.length = 0; });   // 자연 생성은 끈다(시험이 흔들리지 않게)
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

/* 쓰러짐이 남에게 보이는가 — 참가자가 쓰러지면 호스트 화면의 아바타가 '쓰러짐'(생명 0 · 알림), 되살아나면 다시 선다 */
await guest.evaluate(() => { G.me.iframe = 0; G.me.hp = 1; G.me.hurt(1e6, G.me.cx + 10); });
await host.waitForTimeout(900);
const down = await host.evaluate(() => { const g = G.players.find(p => p.remote); return [g.hp, document.querySelector('#toasts') ? document.querySelector('#toasts').innerText.includes('쓰러졌다') : null]; });
await guest.evaluate(() => G.respawn());
await host.waitForTimeout(900);
const up = await host.evaluate(() => G.players.find(p => p.remote).hp);
check(down[0] <= 0 && down[1] !== false && up > 0, `참가자가 쓰러지면 호스트가 본다(생명 ${down[0]} · 알림 ${down[1]}) · 되살아나면 다시 선다(생명 ${up})`);

/* 세계 바뀜 — 참가자가 캔 칸이 호스트로, 호스트가 놓은 칸이 참가자로 · 기반암은 참가자 글로 안 바뀐다 · 문 */
const spot = await guest.evaluate(() => {
  const p = G.me, tx = Math.floor(p.cx / TS) + 3, ty = Math.floor((p.y + p.h + 1) / TS) + 1;
  const before = G.world.get(tx, ty);
  G.world.set(tx, ty, T.AIR);                              // 캐기와 같은 길(world.set)
  G.world.set(5, G.world.dims.WH - 1, T.AIR);              // 기반암 — 호스트가 거절해야 한다
  return { tx, ty, before };
});
await host.evaluate(({ tx, ty }) => G.world.set(tx, ty - 3, T.STONE), spot);
await guest.waitForTimeout(800);
const tilesHost = await host.evaluate(({ tx, ty }) => [G.world.get(tx, ty), G.world.get(5, G.world.dims.WH - 1) === T.BEDROCK], spot);
const tileGuest = await guest.evaluate(({ tx, ty }) => G.world.get(tx, ty - 3) === T.STONE, spot);
/* 블록 설치 — 참가자가 진짜 우클릭(가방의 돌 · 커서 칸)으로 놓은 블록이 호스트에 */
const placed = await guest.evaluate(() => {
  const p = G.me, tx = Math.floor(p.cx / TS) - 3;
  let ty = Math.floor(p.cy / TS); while (ty > 2 && G.world.get(tx, ty) !== T.AIR) ty--;
  while (G.world.get(tx, ty + 1) === T.AIR) ty++;   // 바닥 바로 위 빈칸
  p.bag[p.sel] = makeItem('stone', 20);
  G.input.wx = (tx + 0.5) * TS; G.input.wy = (ty + 0.5) * TS;
  G.rightClick();
  return { tx, ty, here: G.world.get(tx, ty) === T.STONE };
});
await host.waitForTimeout(800);
const placedHost = await host.evaluate(({ tx, ty }) => G.world.get(tx, ty) === T.STONE, placed);
check(placed.here && placedHost, `블록 설치: 참가자가 우클릭으로 놓은 돌 → 호스트(${placedHost})`);
/* 밭 — 참가자가 심고 물 준 칸이 호스트 작물 목록·젖음에 */
const farm = await guest.evaluate(({ tx, ty }) => {
  const w = G.world, x = tx + 6, y = ty - 1;
  for (let d = 0; d < 3; d++) w.set(x, y - d, T.AIR);
  w.set(x, y + 1, T.FARMLAND); w.plantSeed(x, y, Object.keys(SEED_TILE)[0]); w.waterFarm(x, y + 1, G.dayCount);
  return { x, y, k: y * w.dims.WW + x, kb: (y + 1) * w.dims.WW + x, t: w.get(x, y) };
}, spot);
await guest.waitForTimeout(600);
const farmHost = await host.evaluate(f => [G.world.get(f.x, f.y) === f.t, G.world.crops.has(f.k), (G.world.wet[f.kb] | 0) > G.dayCount], farm);
check(farmHost.every(Boolean), `밭: 참가자가 심은 씨앗이 호스트 작물 목록에 · 물 준 밭이 젖는다 (${farmHost})`);
check(spot.before !== 0 && tilesHost[0] === 0 && tilesHost[1] && tileGuest, `세계 바뀜: 참가자가 캔 칸 → 호스트 · 호스트가 놓은 칸 → 참가자 · 기반암은 그대로`);
const doorOk = await host.evaluate(() => { const d = G.world.doors[0]; if (!d) return null; d.closed = !d.closed; G.netDoor(d); return [d.x, d.y, d.closed]; });
await guest.waitForTimeout(600);
const doorG = doorOk && await guest.evaluate(([x, y]) => { const d = G.world.doors.find(o => o.x === x && o.y === y); return d && d.closed; }, doorOk);
check(!doorOk || doorG === doorOk[2], `문: 호스트가 여닫으면 참가자 화면도 (${doorOk ? doorOk[2] : '문 없음'})`);

/* 몹 — 호스트가 참가자 곁에 세운 몹이 참가자 화면에 그림자로 · 참가자가 치면 호스트에서 깎이고 · 잡으면 보상은 참가자에게 */
await host.evaluate(() => { const g = G.players.find(p => p.remote); const e = new Enemy('cartwraith', g.x + 70, g.y); e.tagT = 1; G.ents.push(e); });
await guest.waitForTimeout(700);
const ghost = await guest.evaluate(() => { const e = G.ents.find(e => e.ghost && e.type === 'cartwraith'); return e ? { nid: e.nid, hp: e.hp } : null; });
const xp0 = await guest.evaluate(() => [G.me.xp, G.me.level, G.me.kills.cartwraith || 0]);
await guest.evaluate(() => { const e = G.ents.find(e => e.ghost && e.type === 'cartwraith'); e.hurt(30, false, G.me, 0, 'slash'); });
await guest.waitForTimeout(500);
const hostHpAfter = await host.evaluate(() => { const e = G.ents.find(e => e.type === 'cartwraith'); return e ? [Math.round(e.hp), Math.round(e.maxHp)] : null; });
await guest.evaluate(() => { const e = G.ents.find(e => e.ghost && e.type === 'cartwraith'); if (e) e.hurt(999999, true, G.me, 0, 'slash'); });
await guest.waitForTimeout(800);
const after = await guest.evaluate(() => [G.me.xp, G.me.level, G.me.kills.cartwraith || 0, G.ents.some(e => e.ghost && e.type === 'cartwraith')]);
const hostAfter = await host.evaluate(() => [G.ents.some(e => e.type === 'cartwraith' && !e.dead), G.me.kills.cartwraith || 0]);
check(ghost && hostHpAfter && hostHpAfter[0] < hostHpAfter[1], `몹: 참가자 화면에 그림자(${ghost && ghost.nid}) · 참가자 공격이 호스트 몹을 깎는다 (${hostHpAfter})`);
check(after[2] === xp0[2] + 1 && (after[0] !== xp0[0] || after[1] > xp0[1]) && !after[3] && !hostAfter[0] && hostAfter[1] === 0,
  `몹: 참가자가 잡으면 처치·경험치는 참가자에게(처치 ${xp0[2]}→${after[2]}) · 호스트는 안 받는다(${hostAfter[1]})`);

/* 펫 — 참가자 펫이 호스트 화면에도 따라다니고, 참가자 화면에서 그림자 몹을 물면 호스트 몹이 깎인다 */
await guest.evaluate(() => { const it = makeItem('pet_pebble_kin'); it.lv = 4; G.me.equip.pet1 = it; });
await host.evaluate(() => { const g = G.players.find(p => p.remote); const e = new Enemy('cartwraith', g.x + 40, g.y); e.tagT = 1; e.speed = 0; G.ents.push(e); });
await guest.waitForTimeout(800);
const petHost = await host.evaluate(() => { const g = G.players.find(p => p.remote), pe = g && g.petEnts && g.petEnts[0];
  return pe ? [pe.id, pe.lvOf(g), Math.round(Math.hypot(pe.x - g.cx, pe.y - g.cy))] : null; });
const petHp0 = await host.evaluate(() => { const e = G.ents.find(e => e.type === 'cartwraith' && !e.dead); return e ? Math.round(e.hp) : null; });
await guest.evaluate(() => { const pe = G.petEnts[0]; if (pe) pe.cd = 0; });
await guest.waitForTimeout(900);
const petHp1 = await host.evaluate(() => { const e = G.ents.find(e => e.type === 'cartwraith' && !e.dead); return e ? Math.round(e.hp) : null; });
check(petHost && petHost[0] === 'pebble_kin' && petHost[1] === 4 && petHost[2] < 120 && petHp0 !== null && petHp1 < petHp0,
  `펫: 참가자 펫이 호스트 화면에(${petHost && petHost.join('/')}) · 그림자 몹을 물면 호스트 몹이 깎인다(${petHp0}→${petHp1})`);
await host.evaluate(() => { for (const e of G.ents) if (e.type === 'cartwraith') e.dead = true; });
await guest.evaluate(() => { G.me.equip.pet1 = null; });

/* 물건 — 호스트가 놓은 나무 상자가 참가자에게 · 참가자가 넣은 물건이 호스트 상자에 · 걷으면 양쪽에서 */
const crateAt = await host.evaluate(() => {
  const g = G.players.find(p => p.remote);
  const o = { type: 'crate', placed: 1, x: Math.round(g.x + 40), y: Math.round(g.y + g.h - 26), w: 30, h: 26, slots: 24, items: new Array(24).fill(null) };
  G.world.objects.push(o); G.netObjAdd(o); return [o.x, o.y];
});
await guest.waitForTimeout(500);
await guest.evaluate(([x, y]) => { const o = G.world.objects.find(o => o.type === 'crate' && o.x === x && o.y === y); G.interact(o); o.items[0] = makeItem('wood', 7); UI.closePanel(); }, crateAt);
await guest.waitForTimeout(600);
const inHost = await host.evaluate(([x, y]) => { const o = G.world.objects.find(o => o.type === 'crate' && o.x === x && o.y === y); return o && o.items[0] && o.items[0].id + ':' + o.items[0].c; }, crateAt);
await host.evaluate(([x, y]) => { const o = G.world.objects.find(o => o.type === 'crate' && o.x === x && o.y === y); G.world.objects.splice(G.world.objects.indexOf(o), 1); G.netObjDel(o); }, crateAt);
await guest.waitForTimeout(500);
const gone = await guest.evaluate(([x, y]) => !G.world.objects.some(o => o.type === 'crate' && o.x === x && o.y === y), crateAt);
check(inHost === 'wood:7' && gone, `물건: 놓은 상자가 참가자에게 · 참가자가 넣은 물건이 호스트 상자에(${inHost}) · 걷으면 사라진다(${gone})`);

/* 기계 — 호스트가 놓은 벨트가 참가자에게 · 참가자가 돌리면 호스트도 · 호스트 벨트 위 물건이 참가자 화면에 · 참가자가 걷으면 호스트에서 */
const mk = await host.evaluate(() => {
  const g = G.players.find(p => p.remote), w = G.world, x = Math.floor(g.cx / TS) + 5, y = Math.floor((g.y + g.h - 1) / TS);
  w.set(x, y, T.AIR); const m = Factory.place(w, x, y, 'belt', 0); G.netBroadcast({ k: 'madd', x, y, m }); return { x, y, key: y * w.dims.WW + x };
});
await guest.waitForTimeout(600);
const gHas = await guest.evaluate(k => { const m = G.world.machines.get(k.key); if (!m) return null; Factory.rotate(m); G.netMachState(m); return m.dir; }, mk);
await host.waitForTimeout(600);
const hDir = await host.evaluate(k => { const m = G.world.machines.get(k.key); m.it = makeItem('wood', 1); return m.dir; }, mk);
await guest.waitForTimeout(1200);
const gIt = await guest.evaluate(k => { const m = G.world.machines.get(k.key); return m && m.it && m.it.id; }, mk);
await guest.evaluate(k => { Factory.remove(G.world, k.x, k.y); G.netBroadcast({ k: 'mrem', x: k.x, y: k.y }); }, mk);
await host.waitForTimeout(600);
const hGone = await host.evaluate(k => !G.world.machines.has(k.key), mk);
check(gHas !== null && hDir === gHas && gIt === 'wood' && hGone, `기계: 놓기 → 참가자 · 돌리기 → 호스트(${gHas}/${hDir}) · 벨트 위 물건 → 참가자(${gIt}) · 걷기 → 호스트(${hGone})`);

/* 시계·사건 · 적 투사체 — 호스트 것이 참가자 화면에 */
await host.evaluate(() => {
  G.dayT = 20 * 60; G.event = { id: 'rain', t: 0 };
  const g = G.players.find(p => p.remote);
  G.projs.push(new Proj(g.cx + 300, g.cy - 200, -40, 0, 1, 'enemy', 'orb'));
});
await guest.waitForTimeout(1600);
const sync = await guest.evaluate(() => ({ d: Math.round(G.dayT), ev: G.event && G.event.id, gp: G.projs.filter(q => q.ghost).length }));
check(Math.abs(sync.d - 1200) < 10 && sync.ev === 'rain' && sync.gp >= 1, `시계·사건·투사체: 참가자 화면 ${sync.d}분 · 사건 ${sync.ev} · 그림자 투사체 ${sync.gp}`);

/* 앞의 몹에게 맞았으면 무적 시간이 풀릴 때까지 — 이 기계는 두 판을 같이 돌려 참가자 쪽 게임 시간이 느리게 흐른다 */
await guest.waitForFunction(() => G.me.iframe <= 0, null, { timeout: 20000 });
await host.waitForFunction(() => { const r = G.players.find(p => p.remote); return !r._hurtAt || G.time - r._hurtAt > 0.4; }, null, { timeout: 20000 });   // 호스트의 넘기기 간격(0.3초)
const hp0 = await guest.evaluate(() => G.me.hp);
await host.evaluate(() => G.players.find(p => p.remote).hurt(20, 0));
await guest.waitForTimeout(500);
const hp1 = await guest.evaluate(() => G.me.hp);
const hostHp = await host.evaluate(() => G.me.hp);
check(hp1 < hp0 && hostHp > 0, `호스트 쪽에서 참가자 아바타가 맞으면 피해는 참가자에게 (${hp0} → ${hp1})`);

/* 쓰러짐 — 여럿이면 세계가 멈추지 않고(남의 판이 끊긴다) 부활해도 세계의 몹을 지우지 않는다 */
const death = await host.evaluate(async () => {
  const g = G.players.find(p => p.remote); G.ents.push(new Enemy('cartwraith', g.x + 400, g.y));
  G.me.iframe = 0; G.me.hp = 1; G.me.hurt(9999, G.me.cx);
  const t0 = G.time; await new Promise(r => setTimeout(r, 500));
  const r = [G.paused, G.time > t0, G.ents.length]; G.respawn(); return [...r, G.ents.length];
});
check(death[0] === false && death[1] && death[2] >= 1 && death[3] === death[2], `쓰러짐: 호스트가 쓰러져도 세계는 돈다(멈춤 ${death[0]}) · 부활해도 몹이 남는다(${death[2]}→${death[3]})`);

/* 호스트 탭이 숨어도 세계가 돈다 — 숨은 탭은 화면 갱신(rAF)이 멈춘다. 숨김을 흉내 내면 루프는 rAF 틱을 버리고 워커 틱만 받는다 */
await host.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
  const g = G.players.find(p => p.remote); G.ents.push(new Enemy('slime', g.x + 260, g.y - 40)); });
await host.waitForTimeout(400);
const hid0 = await Promise.all([host.evaluate(() => G.time), guest.evaluate(() => G.ents.filter(e => e.ghost).map(e => Math.round(e.x)).join('/'))]);
await host.waitForTimeout(1500);
const hid1 = await Promise.all([host.evaluate(() => G.time), guest.evaluate(() => G.ents.filter(e => e.ghost).map(e => Math.round(e.x)).join('/'))]);
await host.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
check(hid1[0] - hid0[0] > 0.8 && hid1[1] !== hid0[1], `호스트 탭이 숨어도 세계가 돈다(게임 시간 +${(hid1[0] - hid0[0]).toFixed(1)}초) · 참가자 화면 몹이 움직인다(${hid0[1]} → ${hid1[1]})`);

/* 채팅 — Enter 로 열어 친 글이 호스트를 거쳐 모두에게(치는 동안 캐릭터는 안 걷는다) · 호스트가 끄면 막힌다 */
await guest.bringToFront();
const gx0 = await guest.evaluate(() => G.me.x);
await guest.keyboard.press('Enter');
await guest.keyboard.type('dddd hello');
const typing = await guest.evaluate(() => [document.activeElement && document.activeElement.id, G.keys.KeyD | 0]);
await guest.keyboard.press('Enter');
await host.waitForTimeout(800);
const chat1 = await Promise.all([host, guest].map(pg => pg.evaluate(() => (G.chatLog || []).map(l => l.n + ':' + l.s).join('|'))));
const gx1 = await guest.evaluate(() => G.me.x);
check(typing[0] === 'chat-input' && !typing[1] && Math.abs(gx1 - gx0) < 4 && chat1[0].includes('Guest:dddd hello') && chat1[1].includes('Guest:dddd hello'),
  `채팅: Enter → 입력 칸(${typing[0]}) · 치는 동안 안 걷는다(${Math.round(gx1 - gx0)}px) · 호스트·참가자 둘 다 받는다`);
await host.evaluate(() => G.mpSetCfg('chat', false));
await host.waitForTimeout(500);
await guest.evaluate(() => G.sendChat('blocked'));
await host.waitForTimeout(500);
const chat2 = await Promise.all([host.evaluate(() => G.chatLog.some(l => l.s === 'blocked')), guest.evaluate(() => G.net.cfg.chat)]);
check(!chat2[0] && chat2[1] === false, '채팅: 호스트가 끄면 참가자에게 알리고 글이 막힌다');
await host.evaluate(() => G.mpSetCfg('chat', true));
/* PvP — 꺼져 있으면 안 아프고, 켜면 반(PVP_SCALE)만큼 주인 화면에서 */
const hitHost = () => guest.evaluate(() => { const h = G.players.find(p => p.remote && p.netId === 0); G.pvpHit(h, 40, h.cx - 30); });
await host.evaluate(() => { G.me.iframe = 0; G.me.hp = G.me.d.maxHp; });
await hitHost(); await host.waitForTimeout(500);
const pv0 = await host.evaluate(() => [G.me.hp, G.me.d.maxHp]);
await host.evaluate(() => G.mpSetCfg('pvp', true));
await host.waitForTimeout(500);
await host.evaluate(() => { G.me.iframe = 0; });
await hitHost(); await host.waitForTimeout(500);
const pv1 = await host.evaluate(() => G.me.hp);
await guest.evaluate(() => { G.me.iframe = 0; G.me.hp = G.me.d.maxHp; });
const ghp0 = await guest.evaluate(() => G.me.hp);
await host.evaluate(() => { const g = G.players.find(p => p.remote); G.pvpHit(g, 40, g.cx - 30); });
await guest.waitForTimeout(500);
const ghp1 = await guest.evaluate(() => [G.me.hp, G.net.cfg.pvp]);
check(pv0[0] === pv0[1] && pv1 < pv0[0] && ghp1[0] < ghp0 && ghp1[1] === true, `PvP: 꺼짐이면 그대로(${pv0[0]}) · 켜면 호스트 ${pv0[0]}→${pv1} · 참가자 ${ghp0}→${ghp1[0]}`);
await host.evaluate(() => G.mpSetCfg('pvp', false));

/* 장 진행 공유(M5) — 참가자가 센 값이 호스트 장 목표에 들어간다(최댓값) · 장 완료는 호스트가 알리고 참가자도 보상 */
const k0 = await host.evaluate(() => { const ks = G.progKeys(CHAPTERS[G.chapter]); return ks.find(k => k.startsWith('k:')); });
await guest.evaluate(k => { G.me.kills[k.slice(2)] = 99; }, k0);
await host.waitForTimeout(2600);
const shared = await Promise.all([host.evaluate(k => [G.net.progAll && G.net.progAll[k], G.me.kills[k.slice(2)] || 0], k0), guest.evaluate(k => G.net.progAll && G.net.progAll[k], k0)]);
check(k0 && shared[0][0] === 99 && shared[0][1] < 99 && shared[1] === 99, `장 진행 공유: 참가자 처치 수가 호스트 목표에 (${k0} = ${shared[0][0]} · 호스트 혼자 ${shared[0][1]})`);
const chBefore = await guest.evaluate(() => [G.chapter, G.me.xp, G.me.level, G.me.gold]);
await host.evaluate(() => { const real = G.chapterState; G.chapterState = ch => Object.assign(real.call(G, ch), { complete: true }); try { G.checkChapter(); } finally { G.chapterState = real; } });
await guest.waitForTimeout(1200);
const chAfter = await Promise.all([host.evaluate(() => G.chapter), guest.evaluate(() => [G.chapter, G.me.xp, G.me.level, G.me.gold])]);
check(chAfter[0] === chBefore[0] + 1 && chAfter[1][0] === chBefore[0] + 1 && (chAfter[1][2] > chBefore[2] || chAfter[1][1] > chBefore[1]) && chAfter[1][3] > chBefore[3],
  `장 완료: 호스트가 알리면 참가자도 다음 장(${chBefore[0]}→${chAfter[1][0]}) · 보상(Lv.${chBefore[2]}→${chAfter[1][2]} · 금화 ${chBefore[3]}→${chAfter[1][3]})`);
/* 보스 체력은 인원만큼 · 운석은 참가자 화면에도 */
const boss = await host.evaluate(() => { const hp0 = new Enemy('king_slime', 0, 0, 1).maxHp; const e = new Enemy('king_slime', G.me.x + 600, G.me.y - 200, 1); G.netBossScale(e); const r = [hp0, e.maxHp]; return r; });
check(Math.abs(boss[1] / boss[0] - 1.6) < 0.01, `보스 체력 × 1.6 (2명 · ${boss[0]} → ${boss[1]})`);
await host.evaluate(() => { G.startMeteor(Math.floor(G.me.cx / TS) + 200); });
await guest.waitForTimeout(800);
const met = await guest.evaluate(() => !!(G.meteor && G.meteor.remote));
check(met, '운석: 호스트가 굴리면 참가자 화면에도 불덩이·알림');
await host.waitForTimeout(6500);

/* PeerJS 쪽 — 방 코드 여섯 글자 · 자체 중개가 닿지 않으면 PeerJS 로 넘어간다 · 없는 방은 '그런 방이 없다' */
if (!process.env.MP_SIG) {
  check(room.length === 6, `PeerJS 중개: 방 코드 여섯 글자 (${room})`);
  const dead = await new Promise(r => { const t = net.createServer().listen(0, '127.0.0.1', () => { const p = t.address().port; t.close(() => r(p)); }); });
  const fb = await host.evaluate(async ([peer, dead]) => {
    const o = await G.netOpenSignal({ relay: `ws://127.0.0.1:${dead}/ws`, peer });
    if (o) o.sig.close();
    return o && [o.kind, o.room.length];
  }, [SIG.slice(5), dead]);
  eh.splice(0, eh.length, ...eh.filter(e => !e.includes(`127.0.0.1:${dead}`)));   // 일부러 닿지 않게 한 중개
  check(fb && fb[0] === 'peer' && fb[1] === 6, `자체 중개가 닿지 않으면 PeerJS 로 방을 연다 (${fb})`);
  const third = await (await b.newContext()).newPage();
  await third.goto(url + `/index.html?lang=ko&mp=join&room=zzzzzz&name=X&char=ranger&sig=${encodeURIComponent(SIG)}`);
  await third.waitForFunction(() => window.G && G.booted && !G.net, null, { timeout: 30000 }).catch(() => {});
  check(await third.evaluate(() => !G.net), '없는 방(여섯 글자)에 붙으려 하면 그만둔다');
  await third.close();
}

await guest.close();
await host.waitForTimeout(1500);
const left = await host.evaluate(() => G.players.length);
check(left === 1, `참가자가 나가면 호스트 쪽에서 빠진다 (${left}명)`);
/* 창으로 — 일시정지 방 줄 · 타이틀 멀티플레이 창에서 저장 슬롯 캐릭터로 참가 · 나가면 캐릭터 몫만 그 슬롯에 · 호스트가 방을 닫으면 타이틀로 */
const ps = await host.evaluate(() => { G.setPause(true); const q = s => document.querySelector(s);
  const r = [!q('#ps-room').hidden, q('#ps-room-code').textContent, q('#btn-room-close').hidden, q('#btn-room-open').hidden]; G.setPause(false); return r; });
check(ps[0] && ps[1] === room && !ps[2] && ps[3], `일시정지: 호스트에게 방 코드(${ps[1]}) · 방 닫기`);
const g2 = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const eg2 = collectErrors(g2);
await g2.goto(url + `/index.html?lang=ko&sig=${encodeURIComponent(SIG)}`);
await g2.waitForFunction(() => window.G && G.booted, null, { timeout: 60000 });
await g2.evaluate(async () => { G.currentSlot = 2; G._newGame('d2', 'Saver', 'ranger', 'normal', 's'); G.me.level = 7; await G.saveGame(); G.toTitle(); });
const sBefore = await g2.evaluate(async () => (await SaveStore.get(2)).raw);
await g2.click('#btn-multi');
const cells = () => g2.evaluate(() => [document.querySelector('#mp-code').value, document.querySelector('#btn-mp-join').disabled,
  [...document.querySelectorAll('#mp-cells i')].map(e => e.textContent || '_').join('')]);
await g2.fill('#mp-code', 'ab-c 1한!');
const codeA = await cells();
await g2.fill('#mp-code', 'xy7k9q2z');
const codeB = await cells();
check(codeA[0] === 'ABC1' && codeA[1] && codeA[2] === 'ABC1__' && codeB[0] === 'XY7K9Q' && !codeB[1] && codeB[2] === 'XY7K9Q',
  `방 코드 네모 6칸: 'ab-c 1한!' → ${codeA[2]}(참가 잠김) · 'xy7k9q2z' → ${codeB[2]}(6자까지 · 열림)`);
const noSlotPick = await g2.evaluate(() => !document.querySelector('#mp-char'));
await g2.fill('#mp-code', room.toLowerCase());
await g2.fill('#mp-name', 'Visitor');
await g2.click('#btn-mp-join');
await g2.waitForFunction(() => G.net && G.net.id > 0 && G.state === 'play', null, { timeout: 60000 });
const joined = await g2.evaluate(() => [G.me.name, G.me.level, G.world.seed, document.querySelector('#mp-screen').classList.contains('open')]);
check(noSlotPick && joined[0] === 'Visitor' && joined[1] === 1 && joined[2] !== 'd2' && !joined[3], `창으로 참가: 싱글 캐릭터를 고르지 않고 새 손님 캐릭터(${joined[0]} Lv.${joined[1]})로 호스트 세계(${joined[2]})에`);
await g2.evaluate(() => { G.me.gold = 12345; G.setPause(true); document.querySelector('#btn-room-leave').click(); });
await g2.waitForFunction(() => !G.net && G.state === 'title', null, { timeout: 5000 });
await g2.waitForTimeout(500);
const sAfter = await g2.evaluate(async () => (await SaveStore.get(2)).raw);
check(sAfter === sBefore, '나가도 손님의 싱글플레이 슬롯은 그대로(멀티 캐릭터와 따로)');
await host.waitForTimeout(1500);
await g2.evaluate(code => { document.querySelector('#btn-multi').click(); const c = document.querySelector('#mp-code'); c.value = code; c.dispatchEvent(new Event('input')); }, room);
await g2.waitForTimeout(300);
await g2.evaluate(() => document.querySelector('#btn-mp-join').click());
await g2.waitForFunction(() => G.net && G.net.id > 0 && G.state === 'play', null, { timeout: 60000 });
await host.waitForTimeout(2500);
const party = await Promise.all([host, g2].map(pg => pg.evaluate(() => {
  const box = document.querySelector('#party'); return [box.hidden, box.querySelectorAll('.pt-row').length, [...box.querySelectorAll('.pt-ping')].map(e => e.textContent).join(',')];
})));
check(!party[0][0] && party[0][1] === 2 && /\d+ms/.test(party[0][2]) && !party[1][0] && party[1][1] === 2,
  `파티 목록: 양쪽 다 2명 · 왕복 시간(${party[0][2]} / ${party[1][2]})`);
const kickRow = await host.evaluate(() => { G.setPause(true); const b = document.querySelector('#ps-party [data-kick]'); const ok = !!b; if (b) b.click(); G.setPause(false); return ok; });
await g2.waitForFunction(() => !G.net && G.state === 'title', null, { timeout: 5000 }).catch(() => {});
const kicked = await Promise.all([g2.evaluate(() => [!G.net, G.state]), host.evaluate(() => [G.net && G.net.peers.size, G.players.length])]);
check(kickRow && kicked[0][0] && kicked[0][1] === 'title' && kicked[1][0] === 0 && kicked[1][1] === 1, `내보내기: 일시정지 창 단추 → 참가자는 타이틀로(${kicked[0][1]}) · 호스트 쪽에서 빠진다`);
await host.waitForTimeout(800);
await g2.evaluate(code => { document.querySelector('#btn-multi').click(); const c = document.querySelector('#mp-code'); c.value = code; c.dispatchEvent(new Event('input')); }, room);
await g2.waitForTimeout(300);
await g2.evaluate(() => document.querySelector('#btn-mp-join').click());
await g2.waitForFunction(() => G.net && G.net.id > 0 && G.state === 'play', null, { timeout: 60000 });
/* 다시 온 손님 — 새로 만든 캐릭터는 호스트 세계에 맡겨 두었다가 돌려받는다 · 지난 자리에서 */
await host.evaluate(async () => { G.currentSlot = 1; await G.saveGame(); });
const left2 = await g2.evaluate(() => { G.me.gold = 777; G.me.x += 3 * TS; const pid = G.mpPlayerId(); return [pid, Math.round(G.me.x)]; });
await g2.waitForTimeout(1300);
await g2.evaluate(() => { G.setPause(true); document.querySelector('#btn-room-leave').click(); });
await g2.waitForFunction(() => !G.net && G.state === 'title', null, { timeout: 5000 });
await host.waitForTimeout(800);
await host.waitForTimeout(1500);
const rec2 = await host.evaluate(async pid => { const r = G.mpGuests[pid], d = JSON.parse((await SaveStore.get(1)).raw), s = d.mpGuests && d.mpGuests[pid];
  return r && [r.char && r.char.gold, Math.round(r.x), !!(s && s.char && s.char.gold === 777)]; }, left2[0]);
await g2.evaluate(code => { document.querySelector('#btn-multi').click(); const c = document.querySelector('#mp-code'); c.value = code; c.dispatchEvent(new Event('input')); }, room);
await g2.waitForTimeout(300);
await g2.evaluate(() => document.querySelector('#btn-mp-join').click());
await g2.waitForFunction(() => G.net && G.net.id > 0 && G.state === 'play', null, { timeout: 60000 });
const back2 = await g2.evaluate(() => [G.me.gold, Math.round(G.me.x)]);
check(rec2 && rec2[0] === 777 && rec2[2] && back2[0] === 777 && Math.abs(back2[1] - left2[1]) < 3 * 22,
  `다시 온 손님: 호스트 세계가 캐릭터·자리를 기억(금화 ${rec2 && rec2[0]}) → 다시 들어오면 그대로(금화 ${back2[0]} · x ${left2[1]}→${back2[1]}) · 호스트가 다시 저장하지 않아도 호스트 슬롯에 남는다`);
await host.evaluate(() => G.mpClose());
await g2.waitForFunction(() => !G.net && G.state === 'title', null, { timeout: 5000 }).catch(() => {});
const closed = await Promise.all([g2.evaluate(() => [!G.net, G.state]), host.evaluate(() => [!G.net, G.players.length, G.state])]);
check(closed[0][0] && closed[0][1] === 'title' && closed[1][0] && closed[1][1] === 1 && closed[1][2] === 'play',
  `호스트가 방을 닫으면 참가자는 타이틀로(${closed[0][1]}) · 호스트는 혼자 계속(${closed[1][2]})`);
check(!eg2.length, `콘솔 오류 0 (창 참가자) ${eg2.slice(0, 2).join(' | ')}`);

check(!eh.length && !eg.length, `콘솔 오류 0 ${[...eh, ...eg].slice(0, 2).join(' | ')}`);
srv.close(); peerSrv.srv.close(); await b.close();
process.exit(bad ? 1 : 0);
