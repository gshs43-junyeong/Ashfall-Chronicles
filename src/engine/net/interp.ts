/* ===== engine/net/interp.ts — 늦게 오는 위치를 부드럽게(보간 버퍼) ===== */
/* 남의 캐릭터·몹은 호스트가 초당 십여 번 보내는 상태를 **조금 늦춰**(delay) 그 앞뒤 두 장 사이를 보간해 그린다.
   늦추지 않으면 다음 장이 오기 전까지 멈췄다 튄다. 숫자 칸만 보간하고 나머지 칸은 앞 장 것을 그대로 쓴다. */
export type NetState = Record<string, unknown>;

export class SnapBuffer {
  declare delay: number; declare cap: number; declare list: { t: number; s: NetState }[];

  /** delay — 그리는 시각을 얼마나 늦출지(초) · cap — 들고 있을 최대 장 수. */
  constructor(delay = 0.1, cap = 32) { this.delay = delay; this.cap = cap; this.list = []; }

  /** t(받는 쪽 시계, 초)의 상태를 넣는다 — 시각이 거꾸로 온 장은 버린다. */
  push(t: number, s: NetState) {
    const L = this.list;
    if (L.length && t <= L[L.length - 1].t) return;
    L.push({ t, s });
    if (L.length > this.cap) L.splice(0, L.length - this.cap);
  }

  /** now(받는 쪽 시계)에 그릴 상태 — 아직 한 장도 없으면 null. 마지막 장보다 늦으면 마지막 장 그대로(넘겨 짐작하지 않는다). */
  sample(now: number): NetState | null {
    const L = this.list, t = now - this.delay;
    if (!L.length) return null;
    if (t <= L[0].t) return L[0].s;
    const last = L[L.length - 1];
    if (t >= last.t) return last.s;
    let i = L.length - 2;
    while (i > 0 && L[i].t > t) i--;
    const a = L[i], b = L[i + 1], k = (t - a.t) / (b.t - a.t), out: NetState = {};
    for (const key in a.s) {
      const va = a.s[key], vb = b.s[key];
      out[key] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * k : va;
    }
    if (i > 2) L.splice(0, i - 1);   // 지난 장은 하나만 남기고 버린다
    return out;
  }

  clear() { this.list.length = 0; }
}
