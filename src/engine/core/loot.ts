/* ===== engine/core/loot.ts — 떨굼 표 굴리기 · 불운 보정 ===== */
/* 표 한 줄 = [무엇, 확률, 최소, 최대]. 드문 것(확률 rare 미만)은 연속으로 못 얻을수록 확률이 조금씩 오르다가(pity) 얻으면 처음으로 —
   1% 짜리를 300마리 잡고도 못 보는 일(약 5%의 사람이 겪는다)을 없앤다. 기대값은 거의 그대로다(보정은 운 나쁜 꼬리만 자른다). */

export type LootRow = [string, number, number, number];

export interface LootPity { get(key: string): number; set(key: string, misses: number): void }

export interface LootOpts {
  rare?: number;        // 이 확률 미만이 보정 대상
  step?: number;        // 한 번 놓칠 때마다 원래 확률에 더하는 비율(0.15 = 15%)
  cap?: number;         // 원래 확률의 몇 배까지
  key?: string;         // 보정 기록을 나누는 이름(몹 종류 따위)
}

/** 굴린 결과 [{ id, n }] — rand 는 0~1 난수, int(a, b) 는 정수 난수(게임의 씨앗 난수를 넘길 것) */
export function rollLoot(rows: ReadonlyArray<LootRow>, rand: () => number, int: (a: number, b: number) => number,
  pity?: LootPity | null, o: LootOpts = {}): { id: string; n: number }[] {
  const rare = o.rare ?? 0.1, step = o.step ?? 0.15, cap = o.cap ?? 4;
  const out: { id: string; n: number }[] = [];
  for (const [id, ch, a, b] of rows) {
    const pk = (o.key || '') + '|' + id;
    const miss = pity && ch < rare ? pity.get(pk) : 0;
    const p = Math.min(1, ch * Math.min(cap, 1 + miss * step));
    if (rand() >= p) { if (pity && ch < rare) pity.set(pk, miss + 1); continue; }
    if (pity && ch < rare) pity.set(pk, 0);
    out.push({ id, n: int(a, b) });
  }
  return out;
}

/** 기록을 Map 하나에 두는 보정 — 세이브에 넣지 않으면 판을 새로 열 때 처음으로 돌아간다 */
export function mapPity(m: Map<string, number> = new Map()): LootPity {
  return { get: k => m.get(k) || 0, set: (k, v) => { if (v) m.set(k, v); else m.delete(k); } };
}
