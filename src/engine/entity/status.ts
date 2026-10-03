/* ===== engine/entity/status.ts — 걸린 것들: 지속 피해(불 · 독 · 냉기) · 시간 효과(느려짐 · 표식) ===== */
/* 같은 갈래의 지속 피해는 maxStacks 겹까지만 — 넘치면 가장 약한 겹을 더 센 것으로 바꾸고, 아니면 가장 짧은 겹의 시간만 새로 채운다.
   예전에는 걸 때마다 한 겹씩 쌓여 빠른 무기로 불을 수십 겹 겹쳐 보스를 녹였다. */

export interface Dot { kind: string; dps: number; t: number }

export function addDot(list: Dot[], kind: string, dps: number, t: number, maxStacks = 3): void {
  const same = list.filter(d => d.kind === kind);
  if (same.length < maxStacks) { list.push({ kind, dps, t }); return; }
  const weak = same.reduce((a, b) => (b.dps < a.dps ? b : a));
  if (dps > weak.dps) { weak.dps = dps; weak.t = Math.max(weak.t, t); return; }
  const short = same.reduce((a, b) => (b.t < a.t ? b : a));
  short.t = Math.max(short.t, t);
}

/** dt 만큼 흘린다 — 이번에 들어간 피해 합을 돌려준다. each(d) 는 살아 있는 겹마다(불티 · 독 방울 연출) */
export function tickDots(list: Dot[], dt: number, each?: (d: Dot) => void): number {
  let dmg = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i]; d.t -= dt;
    dmg += d.dps * dt;
    if (each) each(d);
    if (d.t <= 0) list.splice(i, 1);
  }
  return dmg;
}

/** 끝나면 처음 값으로 돌아가는 값 하나(느려짐 배수 · 표식 세기) — 겹치면 센 쪽(pick)과 긴 시간 */
export class Timed {
  declare v: number; declare t: number; declare rest: number; declare pick: 'min' | 'max';
  constructor(rest: number, pick: 'min' | 'max') { this.rest = rest; this.v = rest; this.t = 0; this.pick = pick; }
  set(v: number, t: number): void {
    this.v = this.t > 0 ? (this.pick === 'min' ? Math.min(this.v, v) : Math.max(this.v, v)) : v;
    this.t = Math.max(this.t, t);
  }
  tick(dt: number): void { if (this.t > 0) { this.t -= dt; if (this.t <= 0) { this.t = 0; this.v = this.rest; } } }
  get on(): boolean { return this.t > 0; }
}
