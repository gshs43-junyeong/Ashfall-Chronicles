/* ===== engine/net/loopback.ts — 같은 탭 안의 두 끝(시험·혼자 두 플레이어 흉내) ===== */
import type { Channel, Transport } from './transport.js';

export interface LoopbackOpts {
  /** 한쪽으로 가는 데 걸리는 시간(ms) — 0 이어도 비동기로 닿는다(실제 통로처럼 send 안에서 바로 받지 않게). */
  latency?: number;
  /** fast 통로에서 버릴 비율(0~1) — 끊김·보간 시험용. rel 은 버리지 않는다. */
  loss?: number;
  rand?: () => number;
}

/** 서로 이어진 두 끝을 만든다. */
export function createLoopback(opts: LoopbackOpts = {}): [Transport, Transport] {
  const latency = opts.latency || 0, loss = opts.loss || 0, rand = opts.rand || Math.random;
  let alive = true;
  const make = (): Transport & { peer: Transport | null } => ({
    peer: null, onmessage: null, onclose: null,
    get open() { return alive; },
    send(ch: Channel, data: string) {
      if (!alive || (ch === 'fast' && loss && rand() < loss)) return;
      const to = this.peer;
      setTimeout(() => { if (alive && to && to.onmessage) to.onmessage(ch, data); }, latency);
    },
    close() {
      if (!alive) return;
      alive = false;
      for (const t of [a, b]) { const f = t.onclose; if (f) setTimeout(f, 0); }
    }
  });
  const a = make(), b = make();
  a.peer = b; b.peer = a;
  return [a, b];
}
