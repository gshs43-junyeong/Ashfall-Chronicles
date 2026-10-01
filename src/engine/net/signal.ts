/* ===== engine/net/signal.ts — 처음 서로 찾기(중개) ===== */
/* WebRTC 는 제안/응답 글을 **다른 길로** 한 번 건네야 붙는다. 그 길의 모양만 정하고, 탭끼리(BroadcastChannel — 같은 브라우저의
   두 탭, 개발·시험용) 구현을 둔다. 인터넷 너머는 같은 모양의 HTTP 중개를 따로 붙인다. 글은 방 코드 안에서만 오간다. */
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

/* ---- 인터넷 너머 — HTTP 우편함(짧은 폴링). 서버 규칙은 api/_room-core.js ---- */
async function call(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('signal: ' + (j.error || r.status));
  return j;
}

/** 새 방을 연다(room·key 를 주면 그 방을 되찾는다) — 중개가 고른 방 코드(다섯 글자)와 호스트 열쇠. */
export async function openRoom(url: string, room?: string, key?: string): Promise<{ room: string; key: string }> {
  const j = await call(url, room ? { op: 'open', room, key } : { op: 'open' });
  return { room: String(j.room), key: String(j.key) };
}
export function closeRoom(url: string, room: string, key: string) { call(url, { op: 'close', room, key }).catch(() => {}); }

export interface HttpSignal extends Signal {
  onerror: ((e: Error) => void) | null;
  /** 우편함 확인을 ms 동안 (다시) 켠다 — 그 뒤엔 저절로 쉰다. 요청량은 연 시간이 아니라 이 창의 길이에 비례한다. */
  resume(ms?: number): void;
  readonly polling: boolean;
}

/** id 의 우편함을 every ms 마다 비운다. 보내는 글은 msg.to(없으면 'host')의 우편함으로.
    windowMs 가 있으면 그만큼만 확인하고 쉰다(resume 으로 다시). onerror 는 방이 사라졌을 때(만료·닫힘) — 그 뒤로는 확인을 멈춘다. */
export function createHttpSignal(url: string, room: string, id: string, every = 1500, windowMs = 0, key = ''): HttpSignal {
  let alive = true, timer: ReturnType<typeof setTimeout> | null = null, until = windowMs ? Date.now() + windowMs : Infinity, running = false;
  const s: HttpSignal = {
    onmessage: null, onerror: null,
    get polling() { return running; },
    post(msg) { call(url, { op: 'post', room, to: msg.to || 'host', msg }).catch(e => { if (s.onerror) s.onerror(e); }); },
    close() { alive = false; if (timer) clearTimeout(timer); },
    resume(ms = windowMs || 300000) { alive = true; until = Date.now() + ms; if (!running) poll(); }
  };
  const poll = async () => {
    running = alive && Date.now() < until;
    if (!running) return;
    try {
      const j = await call(url, { op: 'poll', room, id, key });
      for (const m of (j.msgs as SignalMsg[]) || []) if (s.onmessage) s.onmessage(m);
    } catch (e) {
      if (String(e).includes('no-room')) { alive = running = false; if (s.onerror) s.onerror(e as Error); return; }
    }
    if (alive) timer = setTimeout(poll, every); else running = false;
  };
  poll();
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
