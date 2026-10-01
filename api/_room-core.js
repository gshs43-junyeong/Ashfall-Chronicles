/* ===== api/_room-core.js — 멀티플레이 방 중개의 규칙(저장소를 모른다) =====
   WebRTC 제안/응답 글을 몇 초 맡아 두는 우편함이다. 게임 데이터는 여기를 지나지 않는다(붙은 뒤엔 브라우저끼리).
   ★ 밑줄로 시작하는 파일은 Vercel 이 함수로 내보내지 않는다 — room.js(Upstash)와 tests/mp.mjs(메모리)가 같이 쓴다.
   store: claim(key, val, ttl) → bool(없을 때만 만듦) · get(key) → val|null · touch(key, ttl) · del(key) · push(key, val, ttl, cap) · drain(key) → []
   ★ 방 코드는 친구에게 공개적으로 알려 주는 것이라, 호스트 우편함 비우기·방 되찾기·닫기는 방을 열 때 받은 열쇠(key)가 있어야 한다. */
export const ROOM_TTL = 600;          // 초 — 호스트가 폴링할 때마다 늘어난다
export const MAX_MSG = 12000;         // 글자 — 후보를 다 담은 SDP 가 2~4천 자
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 헷갈리는 0·O·1·I 는 뺐다
const ROOM_RE = /^[A-Z0-9]{4,8}$/, ID_RE = /^[a-z0-9]{1,16}$/;

const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');

export function newCode(rand = Math.random) {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_CH[Math.floor(rand() * CODE_CH.length)];
  return s;
}

/** 한 요청 → { status, body }. body 는 JSON 으로 보낸다. */
export async function handleRoom(store, q) {
  const op = q && q.op;
  if (op === 'open') {
    /* 코드를 주면 그 방을 되찾는다 — 호스트가 참가 받기를 쉬는 동안 방이 만료됐을 때(다른 사람이 가져갔으면 409). */
    if (q.room !== undefined) {
      const want = String(q.room).toUpperCase(), key = String(q.key || '');
      if (!ROOM_RE.test(want) || !key) return { status: 400, body: { error: 'room' } };
      const cur = await store.get('o:' + want);
      if (cur === key) { await store.touch('o:' + want, ROOM_TTL); return { status: 200, body: { room: want, key } }; }
      if (cur === null && await store.claim('o:' + want, key, ROOM_TTL)) return { status: 200, body: { room: want, key } };
      return { status: 409, body: { error: 'taken' } };
    }
    for (let i = 0; i < 6; i++) {
      const room = newCode(), key = newKey();
      if (await store.claim('o:' + room, key, ROOM_TTL)) return { status: 200, body: { room, key } };
    }
    return { status: 503, body: { error: 'busy' } };
  }
  const room = String(q.room || '').toUpperCase();
  if (!ROOM_RE.test(room)) return { status: 400, body: { error: 'room' } };
  const owner = await store.get('o:' + room);
  if (owner === null) return { status: 404, body: { error: 'no-room' } };
  const isOwner = q.key && String(q.key) === owner;
  if (op === 'post') {
    const to = String(q.to || ''), msg = q.msg;
    if (!ID_RE.test(to) || !msg || typeof msg !== 'object') return { status: 400, body: { error: 'msg' } };
    const text = JSON.stringify(msg);
    if (text.length > MAX_MSG) return { status: 413, body: { error: 'big' } };
    await store.push(`q:${room}:${to}`, text, ROOM_TTL, 40);
    return { status: 200, body: { ok: 1 } };
  }
  if (op === 'poll') {
    const id = String(q.id || '');
    if (!ID_RE.test(id)) return { status: 400, body: { error: 'id' } };
    if (id === 'host') { if (!isOwner) return { status: 403, body: { error: 'key' } }; await store.touch('o:' + room, ROOM_TTL); }
    const list = await store.drain(`q:${room}:${id}`);
    return { status: 200, body: { msgs: list.map(s => JSON.parse(s)) } };
  }
  if (op === 'close') {
    if (!isOwner) return { status: 403, body: { error: 'key' } };
    await store.del('o:' + room); return { status: 200, body: { ok: 1 } };
  }
  return { status: 400, body: { error: 'op' } };
}

/** 시험·개발용 메모리 저장소. */
export function memoryStore() {
  const m = new Map(), exp = new Map(), now = () => Date.now() / 1000;
  const alive = k => { if (exp.has(k) && exp.get(k) < now()) { m.delete(k); exp.delete(k); } return m.has(k); };
  return {
    async claim(k, v, ttl) { if (alive(k)) return false; m.set(k, v); exp.set(k, now() + ttl); return true; },
    async get(k) { return alive(k) ? m.get(k) : null; },
    async touch(k, ttl) { if (alive(k)) exp.set(k, now() + ttl); },
    async del(k) { m.delete(k); exp.delete(k); },
    async push(k, v, ttl, cap) { const a = alive(k) ? m.get(k) : []; a.push(v); if (a.length > cap) a.splice(0, a.length - cap); m.set(k, a); exp.set(k, now() + ttl); },
    async drain(k) { const a = alive(k) ? m.get(k) : []; m.delete(k); exp.delete(k); return a; }
  };
}
