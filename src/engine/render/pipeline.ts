/* ===== engine/render/pipeline.ts — 렌더 파이프라인: 이름 붙은 단계를 정해진 순서로 ===== */
/* 단계 순서는 만들 때 한 번 정한다(하늘 → 원경 → 타일 → … → 화면 연출). 게임은 단계마다 그리기 함수를 건다.
   ★ 한 단계 안의 함수는 건 순서대로 돈다 — 캔버스 상태(textAlign 등)가 다음 함수로 이어지므로 순서가 곧 모양이다. */

export type Stage<F> = (frame: F) => void;

export function createPipeline<F>(names: readonly string[]) {
  const stages = names.map(name => ({ name, fns: [] as Stage<F>[] }));
  return {
    /** 그 단계 끝에 그리기 함수를 하나 건다 — 없는 단계 이름이면 바로 알린다(조용히 안 그려지는 것을 막는다). */
    add(name: string, fn: Stage<F>): void {
      const s = stages.find(x => x.name === name);
      if (!s) throw new Error('렌더 단계가 없다: ' + name);
      s.fns.push(fn);
    },
    /** 한 프레임 — 단계 순서대로 전부 */
    run(frame: F): void {
      for (const s of stages) for (const fn of s.fns) fn(frame);
    },
    names(): string[] { return stages.map(s => s.name); }
  };
}
export type Pipeline<F> = ReturnType<typeof createPipeline<F>>;

/** 카메라(좌상단 픽셀)와 시야(W×H)에서 보이는 칸 범위 — 가장자리는 반 칸이라도 걸치면 넣는다. */
export function tileView(camX: number, camY: number, W: number, H: number, ts: number) {
  return { tx0: Math.floor(camX / ts), tx1: Math.ceil((camX + W) / ts), ty0: Math.floor(camY / ts), ty1: Math.ceil((camY + H) / ts) };
}
