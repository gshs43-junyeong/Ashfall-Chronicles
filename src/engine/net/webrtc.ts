/* ===== engine/net/webrtc.ts — 브라우저끼리 직접 잇는 통로(WebRTC 데이터 통로) ===== */
import type { Channel, Transport } from './transport.js';

/* ★ 후보(ICE)를 하나씩 흘려보내지(trickle) 않고 **다 모은 뒤** 제안·응답 글 하나에 담는다 — 중개가 짧은 폴링이라
   주고받는 횟수를 두 번(제안 · 응답)으로 줄여야 한다. 대신 모으는 데 최대 gatherMs 를 기다린다.
   통로 둘은 negotiated(번호를 미리 정함)로 양쪽이 똑같이 만든다 — 한쪽이 만들고 다른 쪽이 ondatachannel 로 받으면
   어느 쪽이 먼저 열리는지 순서를 따로 맞춰야 한다. */

export interface PeerOpts {
  iceServers?: RTCIceServer[];
  /** 후보를 모으는 최대 시간(ms) — 넘으면 모인 것만으로 보낸다. */
  gatherMs?: number;
  /** 응답을 받은 뒤 통로가 열리기까지 기다리는 최대 시간(ms). */
  openMs?: number;
}
export const DEFAULT_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

function gather(pc: RTCPeerConnection, ms: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(res => {
    const done = () => { clearTimeout(tm); pc.removeEventListener('icegatheringstatechange', on); res(); };
    const on = () => { if (pc.iceGatheringState === 'complete') done(); };
    const tm = setTimeout(done, ms);
    pc.addEventListener('icegatheringstatechange', on);
  });
}

function wrap(pc: RTCPeerConnection, openMs: number): { transport: Transport; ready: Promise<Transport> } {
  const rel = pc.createDataChannel('rel', { negotiated: true, id: 0 });
  const fast = pc.createDataChannel('fast', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
  let closed = false;
  const t: Transport = {
    onmessage: null, onclose: null,
    get open() { return !closed && rel.readyState === 'open' && fast.readyState === 'open'; },
    send(ch: Channel, data: string) {
      const dc = ch === 'rel' ? rel : fast;
      if (!closed && dc.readyState === 'open') dc.send(data);
    },
    close() { if (!closed) { closed = true; rel.close(); fast.close(); pc.close(); if (t.onclose) t.onclose(); } }
  };
  rel.onmessage = e => { if (t.onmessage) t.onmessage('rel', String(e.data)); };
  fast.onmessage = e => { if (t.onmessage) t.onmessage('fast', String(e.data)); };
  const lost = () => { if (!closed) t.close(); };
  rel.onclose = lost; fast.onclose = lost;
  pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') lost();
  });
  const ready = new Promise<Transport>((res, rej) => {
    const tm = setTimeout(() => { lost(); rej(new Error('webrtc: open timeout')); }, openMs);
    const check = () => { if (t.open) { clearTimeout(tm); res(t); } };
    rel.addEventListener('open', check); fast.addEventListener('open', check);
  });
  ready.catch(() => {});   // 기다리는 쪽이 없을 때(취소된 제안) 처리 안 된 거부로 새지 않게 — 기다리는 쪽은 여전히 거부를 받는다
  return { transport: t, ready };
}

/** 호스트 쪽 — 제안 글을 만들고, 참가자의 응답 글을 받으면 열린 통로를 돌려준다. 참가자마다 하나씩 부른다. */
export async function hostOffer(opts: PeerOpts = {}): Promise<{ offer: string; accept(answer: string): Promise<Transport>; cancel(): void }> {
  const pc = new RTCPeerConnection({ iceServers: opts.iceServers || DEFAULT_ICE });
  const { transport, ready } = wrap(pc, opts.openMs || 15000);
  await pc.setLocalDescription(await pc.createOffer());
  await gather(pc, opts.gatherMs || 3000);
  return {
    offer: JSON.stringify(pc.localDescription),
    async accept(answer: string) {
      await pc.setRemoteDescription(JSON.parse(answer));
      return ready;
    },
    cancel() { transport.close(); }
  };
}

/** 참가자 쪽 — 호스트의 제안 글로 응답 글을 만든다. ready 는 통로가 열리면 풀린다. */
export async function guestAnswer(offer: string, opts: PeerOpts = {}): Promise<{ answer: string; ready: Promise<Transport>; cancel(): void }> {
  const pc = new RTCPeerConnection({ iceServers: opts.iceServers || DEFAULT_ICE });
  const { transport, ready } = wrap(pc, opts.openMs || 15000);
  await pc.setRemoteDescription(JSON.parse(offer));
  await pc.setLocalDescription(await pc.createAnswer());
  await gather(pc, opts.gatherMs || 3000);
  return { answer: JSON.stringify(pc.localDescription), ready, cancel() { transport.close(); } };
}
