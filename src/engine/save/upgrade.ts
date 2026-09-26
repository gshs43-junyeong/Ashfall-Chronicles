/* ===== engine/save/upgrade.ts — 세이브 판올림 사슬 ===== */
/* ★ steps[i] 는 판 i+1 → i+2 로 올리는 함수다. 판 번호는 steps.length + 1 — 손으로 올리지 않는다(CLAUDE.md §1-4). */

/** 옛 기록 d 를 사슬 끝 판까지 끌어올린다(d 를 고쳐서 돌려준다). */
export function upgrade<D extends { v?: number }>(d: D, steps: ReadonlyArray<(d: D) => void>): D {
  const SAVE_VERSION = steps.length + 1;
  let v = d.v || 1;
  while (v < SAVE_VERSION) { steps[v - 1](d); v++; }
  d.v = SAVE_VERSION;
  return d;
}
