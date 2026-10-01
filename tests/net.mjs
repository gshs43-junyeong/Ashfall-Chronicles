/* 엔진 net — ① loopback · 조각 · 보간을 노드에서 ② 실제 WebRTC 두 끝을 헤드리스 크롬 한 페이지 안에서 잇는다.
   (같은 페이지라도 RTCPeerConnection 둘은 진짜 ICE · DTLS · SCTP 를 거친다 — 제안/응답 글만 손으로 건넨다.) */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { browser, collectErrors, ROOT, OUT, fail, ok } from './lib.mjs';

const NET = path.join(ROOT, 'src', 'engine', 'net');
fs.mkdirSync(OUT, { recursive: true });
const entry = path.join(OUT, '.net-entry.ts'), bundle = path.join(OUT, '.net.js');
fs.writeFileSync(entry, ['loopback', 'chunk', 'interp', 'webrtc']
  .map(m => `export * from ${JSON.stringify(path.join(NET, m + '.ts'))};`).join('\n'));
await build({ entryPoints: [entry], bundle: true, format: 'iife', globalName: 'NET', outfile: bundle, logLevel: 'silent' });
const code = fs.readFileSync(bundle, 'utf8');
const NET_ = new Function(code + '\nreturn NET;')();
let bad = 0;
const check = (cond, msg) => { if (cond) ok(msg); else { bad++; fail(msg); } };

/* ① 노드 */
{
  const [a, b] = NET_.createLoopback({ latency: 5 });
  const got = [];
  b.onmessage = (ch, d) => got.push(ch + ':' + d);
  a.send('rel', 'x'); a.send('fast', 'y'); a.send('rel', 'z');
  await new Promise(r => setTimeout(r, 30));
  check(got.join(',') === 'rel:x,fast:y,rel:z', `loopback: 순서대로 닿는다 (${got.join(',')})`);
  let closed = 0; a.onclose = () => closed++; b.onclose = () => closed++;
  a.close(); a.send('rel', 'after');
  await new Promise(r => setTimeout(r, 20));
  check(closed === 2 && got.length === 3, 'loopback: 닫으면 양쪽에 알리고 더는 안 간다');
}
{
  const text = 'ㄱ'.repeat(40000) + 'end';
  const parts = NET_.chunkText(7, text, 16000).reverse();   // 순서가 섞여도
  const j = NET_.createJoiner();
  let out = null;
  for (const m of parts) { const r = j.push(m); if (r) out = r; }
  check(parts.length === 3 && out && out.id === 7 && out.text === text, `조각: 3조각을 거꾸로 넣어도 원래 글 (${parts.length})`);
  check(NET_.isChunk(parts[0]) && !NET_.isChunk('{"k":1}'), '조각: 보통 메시지와 가른다');
}
{
  const sb = new NET_.SnapBuffer(0.1);
  sb.push(1.0, { x: 0, name: 'a' }); sb.push(1.1, { x: 10, name: 'b' }); sb.push(1.05, { x: 999 });
  const s = sb.sample(1.15);   // 1.05 를 그린다 → 0 과 10 의 가운데
  check(Math.abs(s.x - 5) < 1e-9 && s.name === 'a', `보간: 가운데 = ${s.x} · 거꾸로 온 장은 버림`);
  check(sb.sample(5).x === 10 && sb.sample(0).x === 0, '보간: 앞뒤 밖은 끝 장 그대로');
}

/* ② 브라우저 WebRTC */
const b = await browser();
const page = await b.newPage();
const errs = collectErrors(page);
await page.goto('about:blank');
await page.addScriptTag({ content: code });
const r = await page.evaluate(async () => {
  const opts = { iceServers: [], gatherMs: 2000 };   // 같은 기계라 STUN 없이 호스트 후보로 붙는다
  const h = await NET.hostOffer(opts);
  const g = await NET.guestAnswer(h.offer, opts);
  const [ht, gt] = await Promise.all([h.accept(g.answer), g.ready]);
  const got = { host: [], guest: [] };
  ht.onmessage = (ch, d) => got.host.push(ch + ':' + d.length);
  gt.onmessage = (ch, d) => got.guest.push(ch + ':' + d.length);
  const big = 'x'.repeat(200000), parts = NET.chunkText(1, big);
  for (const p of parts) ht.send('rel', p);
  gt.send('fast', 'hi');
  const j = NET.createJoiner();
  let joined = 0;
  gt.onmessage = (ch, d) => { const r = j.push(d); if (r) joined = r.text.length; };
  await new Promise(res => { const t0 = performance.now(); const tick = () => (joined || performance.now() - t0 > 5000) ? res() : setTimeout(tick, 20); tick(); });
  let closed = 0; gt.onclose = () => closed++;
  ht.close();
  await new Promise(res => setTimeout(res, 1500));
  return { open: true, joined, hostGot: got.host, closed, offerLen: h.offer.length };
});
check(r.joined === 200000, `WebRTC: 열리고 200,000자를 ${Math.ceil(200000 / 16000)}조각으로 보내 이었다`);
check(r.hostGot.includes('fast:2'), 'WebRTC: fast 통로로 참가자 → 호스트');
check(r.closed === 1, 'WebRTC: 호스트가 닫으면 참가자가 안다');
check(!errs.length, `콘솔 오류 0 ${errs.slice(0, 2).join(' | ')}`);
await b.close();
process.exit(bad ? 1 : 0);
