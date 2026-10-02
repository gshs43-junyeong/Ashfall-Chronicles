/* ===== engine/net/signal.ts — 처음 서로 찾기(중개) ===== */
/* WebRTC 는 제안/응답 글을 **다른 길로** 한 번 건네야 붙는다. 그 길의 모양만 정하고, 탭끼리(BroadcastChannel — 같은 브라우저의
   두 탭, 개발·시험용) 구현을 둔다. 인터넷 너머는 같은 모양의 WebSocket 중개 둘(자체 중개 · PeerJS 서버)이다. 글은 방 코드 안에서만 오간다. */
export interface SignalMsg { t: 'want' | 'offer' | 'answer' | 'full'; from: string; to?: string; sdp?: string; }

export interface Signal {
  post(msg: SignalMsg): void;
  onmessage: ((msg: SignalMsg) => void) | null;
  close(): void;
}

export function createTabSignal(room: string): Signal {
  const bc = new BroadcastChannel('ashfall-room-' + room);
  const s: Signal = {
    onmessage: null,
    post(msg) { bc.postMessage(msg); },
    close() { bc.close(); }
  };
  bc.onmessage = e => { if (s.onmessage) s.onmessage(e.data as SignalMsg); };
  return s;
}

/* ---- 인터넷 너머 — WebSocket 우편함(Cloudflare 중개 relay/src/worker.js) ----
   호스트는 연결을 열어 둔 채 기다린다 — 중개 쪽이 휴면이라 기다리는 동안 요청이 들지 않는다. */
export interface WsSignal extends Signal {
  onerror: ((e: Error) => void) | null;
  /** 방 코드 — 호스트는 중개가 고른 것, 참가자는 준 것. */
  room: Promise<string>;
}

export function createWsSignal(base: string, q: { role: 'host' | 'guest'; room?: string; id?: string }): WsSignal {
  let ws: WebSocket | null = null, alive = true, room = (q.room || '').toUpperCase(), tries = 0;
  let ping: ReturnType<typeof setInterval> | null = null, gotRoom: (r: string) => void = () => {}, failRoom: (e: Error) => void = () => {};
  const queue: string[] = [];
  const s: WsSignal = {
    onmessage: null, onerror: null,
    room: new Promise<string>((res, rej) => { gotRoom = res; failRoom = rej; }),
    post(msg) { const t = JSON.stringify(msg); if (ws && ws.readyState === 1) ws.send(t); else queue.push(t); },
    close() { alive = false; if (ping) clearInterval(ping); if (ws) ws.close(1000); }
  };
  s.room.catch(() => {});
  const fail = (e: Error) => { alive = false; failRoom(e); if (s.onerror) s.onerror(e); if (ws) ws.close(1000); };
  const connect = () => {
    const u = new URL(base);
    u.searchParams.set('role', q.role);
    if (room) u.searchParams.set('room', room);
    if (q.id) u.searchParams.set('id', q.id);
    const w = ws = new WebSocket(u.toString());
    let opened = false;
    w.onopen = () => {
      opened = true; tries = 0;
      if (q.role === 'guest') gotRoom(room);
      while (queue.length) w.send(queue.shift() as string);
      if (ping) clearInterval(ping);
      ping = setInterval(() => { if (w.readyState === 1) w.send('ping'); }, 30000);   // 중개가 깨지 않고 답한다
    };
    w.onmessage = e => {
      if (e.data === 'pong') return;
      let m: Record<string, unknown>;
      try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.t === 'room') { room = String(m.room); gotRoom(room); return; }
      if (m.t === 'err') { fail(new Error('signal: ' + m.e)); return; }
      if (s.onmessage) s.onmessage(m as unknown as SignalMsg);
    };
    w.onclose = e => {
      if (!alive) return;
      if (e.code === 4410) { fail(new Error('signal: host-left')); return; }
      /* 호스트는 잠깐 끊겨도(망 흔들림) 같은 코드로 다시 붙는다 — 다섯 번까지 */
      if (q.role === 'host' && room && tries++ < 5) { setTimeout(connect, 2000 * tries); return; }
      fail(new Error(opened ? 'signal: closed' : 'signal: unreachable'));
    };
  };
  connect();
  return s;
}

/* ---- 인터넷 너머 — PeerJS 서버(공개 0.peerjs.com 따위)를 우편함으로만 쓴다 ----
   PeerJS 라이브러리는 안 싣는다 — 서버는 {type, dst, payload} 를 받아 보낸 이(src)를 박아 넘길 뿐이라 그 글 모양만 맞춘다.
   방 코드 room → 호스트 아이디 `<prefix>-<room>`, 참가자 아이디 `<prefix>-g-<id>`. 없는 상대에게 보낸 글은 서버가 몇 초 쥐고 있다가
   EXPIRE 로 돌려준다 → 참가자에게는 no-room. 호스트는 같은 아이디·토큰으로 다시 붙을 수 있다. */
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(n: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), b => CODE_CH[b % CODE_CH.length]).join('');
}

export function createPeerSignal(base: string, q: { role: 'host' | 'guest'; room?: string; id?: string; prefix?: string; codeLen?: number }): WsSignal {
  const pre = q.prefix || 'ashfall', token = randomCode(12).toLowerCase();
  let ws: WebSocket | null = null, alive = true, room = (q.room || '').toUpperCase(), tries = 0, picks = 0, opened = false;
  let beat: ReturnType<typeof setInterval> | null = null, gotRoom: (r: string) => void = () => {}, failRoom: (e: Error) => void = () => {};
  const hostId = () => pre + '-' + room.toLowerCase(), myId = () => q.role === 'host' ? hostId() : pre + '-g-' + q.id;
  const queue: string[] = [];
  const send = (t: string) => { if (ws && ws.readyState === 1 && opened) ws.send(t); else queue.push(t); };
  const s: WsSignal = {
    onmessage: null, onerror: null,
    room: new Promise<string>((res, rej) => { gotRoom = res; failRoom = rej; }),
    post(msg) {
      const dst = q.role === 'host' ? pre + '-g-' + msg.to : hostId();
      send(JSON.stringify({ type: 'OFFER', dst, payload: msg }));
    },
    close() { alive = false; if (beat) clearInterval(beat); if (ws) ws.close(1000); }
  };
  s.room.catch(() => {});
  const fail = (e: Error) => { alive = false; if (beat) clearInterval(beat); failRoom(e); if (s.onerror) s.onerror(e); if (ws) ws.close(1000); };
  const connect = () => {
    if (q.role === 'host' && !room) room = randomCode(q.codeLen || 6);
    const u = new URL(base);
    u.searchParams.set('key', 'peerjs'); u.searchParams.set('id', myId()); u.searchParams.set('token', token);
    const w = ws = new WebSocket(u.toString()), re = tries > 0;
    opened = false;
    const ready = () => {
      if (opened) return;
      opened = true; tries = 0; gotRoom(room);
      while (queue.length) w.send(queue.shift() as string);
      if (beat) clearInterval(beat);
      beat = setInterval(() => { if (w.readyState === 1) w.send('{"type":"HEARTBEAT"}'); }, 15000);
    };
    /* 되붙을 때 서버가 옛 연결을 아직 쥐고 있으면(같은 토큰) OPEN 없이 그대로 잇는다 */
    w.onopen = () => { if (re) ready(); };
    w.onmessage = e => {
      let m: Record<string, unknown>;
      try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.type === 'OPEN') ready();
      else if (m.type === 'ID-TAKEN') {
        /* 새 방이면 다른 코드로(다섯 번까지), 되붙는 중이면 서버가 옛 연결을 정리할 때까지 기다렸다 다시 */
        if (q.role === 'host' && !opened && tries === 0 && picks++ < 5) { room = ''; w.onclose = null; w.close(); connect(); }
      } else if (m.type === 'ERROR') fail(new Error('signal: ' + String((m.payload as Record<string, unknown> || {}).msg || 'error')));
      else if (m.type === 'EXPIRE' || m.type === 'LEAVE') {
        if (q.role === 'guest' && m.src === hostId()) fail(new Error('signal: no-room'));
      } else if (m.type === 'OFFER' && s.onmessage && m.payload && typeof m.payload === 'object') {
        const src = String(m.src || ''), msg = m.payload as SignalMsg;
        if (q.role === 'host') {
          if (!src.startsWith(pre + '-g-')) return;
          msg.from = src.slice(pre.length + 3);              // 보낸 이는 서버가 박은 src 로(사칭 막기)
        } else if (src !== hostId()) return;
        s.onmessage(msg);
      }
    };
    w.onclose = () => {
      if (!alive || ws !== w) return;
      if (q.role === 'host' && room && tries++ < 5) { setTimeout(connect, 2000 * tries); return; }
      fail(new Error(opened ? 'signal: closed' : 'signal: unreachable'));
    };
  };
  connect();
  return s;
}
