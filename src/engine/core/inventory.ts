/* ===== engine/core/inventory.ts — 칸 묶음(가방 · 상자 · 창고) 다루기 ===== */
/* 칸 배열의 빈 칸은 null. 물건은 { id, c(개수) } 를 가진 것이면 무엇이든 — 무엇끼리 합쳐지는지(same) · 한 칸에 몇 개까지(max)는 게임이 정한다.
   ★ 넣기는 **이미 있는 더미에 먼저** 채우고 남은 것만 빈 칸으로 — 빈 칸부터 넣으면 같은 물건이 칸마다 흩어진다. */

export interface Stack { id: string; c: number; lk?: unknown }
export interface StackRules<T extends Stack> {
  max(it: T): number;                     // 한 칸에 들어가는 수
  same(a: T, b: T): boolean;              // 같은 더미로 합쳐지는가(같은 id · 같은 등급 · 접사 없음 …)
}

/** it 를 slots 에 넣는다 — 다 들어가면 true. 일부만 들어가면 it.c 가 남은 수로 줄고 false. */
export function stackAdd<T extends Stack>(slots: (T | null)[], it: T, R: StackRules<T>): boolean {
  const ms = R.max(it);
  if (ms > 1) for (const s of slots) {
    if (!s || s.c >= ms || !R.same(s, it)) continue;
    const mv = Math.min(ms - s.c, it.c); s.c += mv; it.c -= mv;
    if (it.c <= 0) return true;
  }
  for (let i = 0; i < slots.length; i++) if (!slots[i]) { slots[i] = it; return true; }
  return false;
}

/** id 의 총 개수 */
export function countOf<T extends Stack>(slots: (T | null)[], id: string): number {
  let n = 0; for (const s of slots) if (s && s.id === id) n += s.c; return n;
}

/** id 를 n 개 꺼낸다(앞 칸부터) — 다 꺼냈으면 true. 모자라면 있는 만큼 꺼내고 false. */
export function takeOut<T extends Stack>(slots: (T | null)[], id: string, n: number): boolean {
  for (let i = 0; i < slots.length && n > 0; i++) {
    const s = slots[i];
    if (s && s.id === id) { const k = Math.min(s.c, n); s.c -= k; n -= k; if (s.c <= 0) slots[i] = null; }
  }
  return n <= 0;
}

/** 정리 — 잠근 칸(lk)은 제자리, 나머지는 같은 더미끼리 합친 뒤 cmp 순으로 앞에서부터 채운 새 배열 */
export function sortSlots<T extends Stack>(slots: (T | null)[], R: StackRules<T>, cmp: (a: T, b: T) => number): (T | null)[] {
  const out: (T | null)[] = new Array(slots.length).fill(null), loose: T[] = [];
  slots.forEach((it, i) => { if (!it) return; if (it.lk) out[i] = it; else loose.push(it); });
  const merged: T[] = [];
  for (const it of loose) {
    const same = merged.find(q => R.same(q, it) && R.max(q) > 1 && q.c < R.max(q));
    if (same) {
      const mv = Math.min(R.max(same) - same.c, it.c); same.c += mv; it.c -= mv;
      if (it.c > 0) merged.push(it);
    } else merged.push(it);
  }
  merged.sort(cmp);
  let k = 0;
  for (const it of merged) { while (k < out.length && out[k] !== null) k++; if (k >= out.length) break; out[k] = it; }
  return out;
}

/** 모두 옮기기 — from 의 물건을 to 로(keep 이 참인 것 · 잠근 것은 남긴다). 옮긴 물건 목록을 돌려준다(일부만 옮긴 더미 포함). */
export function moveAll<T extends Stack>(from: (T | null)[], to: (T | null)[], R: StackRules<T>, keep?: (it: T) => boolean): T[] {
  const moved: T[] = [];
  for (let i = 0; i < from.length; i++) {
    const it = from[i];
    if (!it || it.lk || (keep && keep(it))) continue;
    const c0 = it.c;
    if (stackAdd(to, it, R)) { from[i] = null; moved.push(it); }
    else if (it.c < c0) moved.push({ ...it, c: c0 - it.c });
  }
  return moved;
}

/** 같은 것 넣기 — to 에 이미 있는 종류만 from 에서 옮긴다(창고에 쌓아 둔 재료를 한 번에 채워 넣기) */
export function quickStack<T extends Stack>(from: (T | null)[], to: (T | null)[], R: StackRules<T>): T[] {
  const have = new Set(to.filter(Boolean).map(s => (s as T).id));
  return moveAll(from, to, R, it => !have.has(it.id));
}
