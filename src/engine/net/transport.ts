/* ===== engine/net/transport.ts — 두 끝을 잇는 통로의 모양 ===== */
/* 통로는 둘이다: rel(순서·도착 보장 — 타일 변경·요청·채팅) · fast(순서 없음·재전송 없음 — 초당 여러 번 덮어쓰는 위치).
   글자열만 싣는다(JSON) — 게임 쪽이 메시지 모양을 정한다. */
export type Channel = 'rel' | 'fast';

export interface Transport {
  /** 열려 있지 않으면 조용히 버린다(끊긴 뒤 남은 send 가 예외를 던지지 않게). */
  send(ch: Channel, data: string): void;
  onmessage: ((ch: Channel, data: string) => void) | null;
  onclose: (() => void) | null;
  readonly open: boolean;
  close(): void;
}
