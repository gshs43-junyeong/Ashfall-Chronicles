/* ===== engine/core/loop.ts — requestAnimationFrame 루프 ===== */

/** 매 프레임 frame(dt, rawDt) 를 부른다. rawDt 는 실제로 흐른 시간(초), dt 는 그것을 maxDt 로 자른 것 —
    탭을 오래 비웠다 돌아와도 물리가 한 번에 튀지 않게. 첫 프레임은 0. */
export function startLoop(frame: (dt: number, rawDt: number) => void, maxDt: number): void {
  let last = 0;
  const tick = (t: number): void => {
    requestAnimationFrame(tick);            // 먼저 다음 프레임을 건다 — frame 이 던져도 루프는 산다
    const now = t / 1000;
    const rawDt = now - (last || now);
    last = now;
    frame(Math.min(maxDt, rawDt), rawDt);
  };
  requestAnimationFrame(tick);
}
