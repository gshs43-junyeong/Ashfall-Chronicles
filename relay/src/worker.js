/* ===== relay/src/worker.js — 멀티플레이 방 중개(Cloudflare Workers + Durable Objects) =====
   WebRTC 제안/응답 글만 건네주는 우편함이다 — 붙은 뒤의 게임 데이터는 브라우저끼리 오가고 여기를 지나지 않는다.
   ★ 방 하나 = Durable Object 하나. 호스트는 WebSocket 을 열어 둔 채 기다리는데, **휴면(hibernation)** 이라 기다리는 동안
   깨어 있지 않고 요금도 붙지 않는다 — 비용은 참가할 때 오가는 글 몇 통에만 비례한다(Vercel 중개는 기다리는 내내 폴링했다).
   주소: /ws?role=host[&room=코드]  · /ws?role=guest&room=코드&id=참가자아이디
   서버가 보내는 것: {t:'room', room}(호스트에게, 열리면) · 그 밖에는 상대가 보낸 글 그대로(참가자 글에는 from 을 서버가 박는다). */
import { DurableObject } from 'cloudflare:workers';

const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 헷갈리는 0·O·1·I 는 뺐다
const ROOM_RE = /^[A-Z0-9]{4,8}$/, ID_RE = /^[a-z0-9]{1,16}$/;
const MAX_MSG = 12000, MAX_GUESTS = 6;
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), b => CODE_CH[b % CODE_CH.length]).join('');
const cors = { 'Access-Control-Allow-Origin': '*' };
/* 업그레이드 머리(Sec-WebSocket-*)는 그대로 두고 방 정보만 얹는다. */
const withHeaders = (req, extra) => { const r = new Request(req); for (const k in extra) r.headers.set(k, extra[k]); return r; };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok', { headers: cors });
    if (url.pathname !== '/ws') return new Response('not found', { status: 404, headers: cors });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426, headers: cors });
    const role = url.searchParams.get('role');
    if (role === 'host') {
      const want = (url.searchParams.get('room') || '').toUpperCase();
      /* 코드를 주면 그 방을 되찾고(호스트가 잠깐 끊겼다 다시 붙을 때), 없으면 빈 방을 골라 연다 */
      for (const room of want ? [want] : [newCode(), newCode(), newCode(), newCode(), newCode()]) {
        if (!ROOM_RE.test(room)) break;
        const res = await env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(withHeaders(req, { 'X-Room': room, 'X-Role': 'host' }));
        if (res.status === 101) return res;
      }
      return new Response('room taken', { status: 409, headers: cors });
    }
    if (role === 'guest') {
      const room = (url.searchParams.get('room') || '').toUpperCase(), id = url.searchParams.get('id') || '';
      if (!ROOM_RE.test(room) || !ID_RE.test(id)) return new Response('bad request', { status: 400, headers: cors });
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(withHeaders(req, { 'X-Room': room, 'X-Role': 'guest', 'X-Id': id }));
    }
    return new Response('bad request', { status: 400, headers: cors });
  }
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    /* 연결 유지용 ping 은 깨우지 않고 바로 답한다(휴면 그대로). */
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(req) {
    const room = req.headers.get('X-Room'), role = req.headers.get('X-Role');
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    if (role === 'host') {
      if (this.ctx.getWebSockets('host').length) return new Response('taken', { status: 409 });
      this.ctx.acceptWebSocket(server, ['host']);
      server.send(JSON.stringify({ t: 'room', room }));
      return new Response(null, { status: 101, webSocket: client });
    }
    const id = req.headers.get('X-Id');
    this.ctx.acceptWebSocket(server, ['g:' + id]);
    /* 호스트가 없으면 받아 놓고 오류 글을 보낸다(받은 쪽이 닫는다) — 브라우저는 거절된 업그레이드의 상태 번호를 못 읽고,
       응답 전에 닫으면 닫힘 코드도 안 간다(로컬 실측). */
    if (!this.ctx.getWebSockets('host').length) server.send(JSON.stringify({ t: 'err', e: 'no-room' }));
    else if (this.ctx.getWebSockets().length > MAX_GUESTS + 1) server.send(JSON.stringify({ t: 'err', e: 'full' }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    const tag = this.ctx.getTags(ws)[0];
    if (tag === 'host') {
      /* 호스트 → 그 참가자 하나 */
      if (typeof msg.to !== 'string' || !ID_RE.test(msg.to)) return;
      for (const g of this.ctx.getWebSockets('g:' + msg.to)) g.send(raw);
    } else {
      /* 참가자 → 호스트. 보낸 이(from)는 서버가 박는다 — 남을 사칭해 답을 가로채지 못하게. */
      msg.from = tag.slice(2);
      for (const h of this.ctx.getWebSockets('host')) h.send(JSON.stringify(msg));
    }
  }

  async webSocketClose(ws, code) {
    const tag = this.ctx.getTags(ws)[0];
    /* 호스트가 떠나면 방도 닫는다 — 기다리던 참가자에게 알린다. */
    if (tag === 'host') for (const g of this.ctx.getWebSockets()) if (g !== ws) g.close(4410, 'host-left');
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* 이미 닫힘 */ }
  }
}
