/* Cloudflare 중개(relay/) — wrangler 로 Worker 를 로컬에 띄워 ① 규칙(사칭 막기 · 호스트 하나 · 없는 방 · 호스트가 떠나면 닫힘 · 되찾기)
   ② 두 탭 접속 시험(tests/mp.mjs)을 이 중개로 한 번 더. relay/node_modules 가 없으면 건너뛴다(cd relay && npm ci). */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT, fail, ok } from './lib.mjs';

const RELAY = path.join(ROOT, 'relay');
if (!fs.existsSync(path.join(RELAY, 'node_modules', 'wrangler'))) { ok('중개(relay): wrangler 가 없어 건너뜀 — cd relay && npm ci'); process.exit(0); }
const PORT = 8790 + Math.floor(Math.random() * 100);
const dev = spawn(path.join(RELAY, 'node_modules', '.bin', 'wrangler'), ['dev', '--port', String(PORT), '--ip', '127.0.0.1'], { cwd: RELAY, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; dev.stdout.on('data', d => log += d); dev.stderr.on('data', d => log += d);
const stop = code => { dev.kill('SIGTERM'); process.exit(code); };
const wait = ms => new Promise(r => setTimeout(r, ms));
let up = false;
for (let i = 0; i < 60 && !up; i++) { await wait(500); up = await fetch(`http://127.0.0.1:${PORT}/health`).then(r => r.ok).catch(() => false); }
if (!up) { fail('중개(relay): wrangler dev 가 뜨지 않았다\n' + log.slice(-800)); stop(1); }

const B = `ws://127.0.0.1:${PORT}/ws`;
const open = u => new Promise((res, rej) => { const w = new WebSocket(u), q = []; w.onmessage = e => q.push(JSON.parse(e.data)); w.onopen = () => res({ w, q }); w.onerror = rej; w.onclose = e => { w.code = e.code; }; });
let bad = 0;
const check = (c, m) => { if (c) ok(m); else { bad++; fail(m); } };
const h = await open(B + '?role=host'); await wait(200);
const room = (h.q.shift() || {}).room;
const g = await open(`${B}?role=guest&room=${String(room).toLowerCase()}&id=abc`);
g.w.send(JSON.stringify({ t: 'want', from: 'evil' })); await wait(200);
const toHost = h.q.shift();
h.w.send(JSON.stringify({ t: 'offer', to: 'abc', sdp: 'x' })); await wait(200);
const toGuest = g.q.shift();
check(/^[A-Z0-9]{5}$/.test(room) && toHost && toHost.from === 'abc' && toGuest && toGuest.sdp === 'x', `중개(relay): 방 ${room} · 참가자 → 호스트(보낸 이는 서버가 박음) · 호스트 → 참가자`);
const second = await open(`${B}?role=host&room=${room}`).then(() => 'accepted', () => 'rejected');
const none = await open(`${B}?role=guest&room=ZZZZZ&id=q`); await wait(300);
check(second === 'rejected' && none.q[0] && none.q[0].e === 'no-room', '중개(relay): 한 방에 호스트 하나 · 없는 방은 no-room');
h.w.close(); await wait(500);
const back = await open(`${B}?role=host&room=${room}`); await wait(200);
check(g.w.code === 4410 && (back.q[0] || {}).room === room, '중개(relay): 호스트가 떠나면 참가자에게 4410 · 같은 코드로 되찾기');
back.w.close(); g.w.close(); none.w.close();

/* ② 두 탭 접속을 이 중개로 */
const r = spawnSync(process.execPath, [path.join(ROOT, 'tests', 'mp.mjs')], { env: { ...process.env, MP_SIG: B }, encoding: 'utf8', timeout: 240000 });
for (const line of (r.stdout + r.stderr).split('\n')) if (/^[✓✗]/.test(line)) console.log(line.replace(/^([✓✗]) /, '$1 [relay] '));
check(r.status === 0, '중개(relay): 두 탭이 Cloudflare 중개로 붙는다');
stop(bad ? 1 : 0);
