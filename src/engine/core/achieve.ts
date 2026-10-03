/* ===== engine/core/achieve.ts — 조건을 보고 한 번만 여는 것(업적 · 도감 · 숨은 칭호) ===== */
/* 표마다 check(상태) 가 참이 되는 순간 한 번만 연다 — 연 때(시각)를 done 에 적고 open(항목)을 부른다.
   검사 하나가 아직 없는 값을 읽다 터져도 나머지는 계속 본다. 자주 부르면 무거우니 부르는 쪽이 "무언가 바뀌었을 때"만 부른다. */

export interface Unlockable<S> { id: string; check?: (s: S) => unknown }

export function checkUnlocks<S, A extends Unlockable<S>>(list: ReadonlyArray<A>, done: Record<string, number>, state: S, open: (a: A) => void, now = Date.now()): number {
  let n = 0;
  for (const a of list) {
    if (done[a.id] || !a.check) continue;
    let ok = false;
    try { ok = !!a.check(state); } catch (e) { ok = false; }
    if (!ok) continue;
    done[a.id] = now; n++;
    open(a);
  }
  return n;
}

/** 몇 개를 열었나 · 전체 몇 개 */
export function unlockProgress<S>(list: ReadonlyArray<Unlockable<S>>, done: Record<string, number>): { got: number; all: number } {
  let got = 0; for (const a of list) if (done[a.id]) got++;
  return { got, all: list.length };
}
