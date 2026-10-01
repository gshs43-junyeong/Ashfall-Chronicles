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
