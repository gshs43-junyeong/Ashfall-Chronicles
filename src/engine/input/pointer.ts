/* ===== engine/input/pointer.ts — 마우스: 두 단추 · 화면 좌표 · 휠 ===== */

/** 마우스 상태 — m1·m2 는 1(눌림)/0, mx·my 는 화면(CSS) 픽셀. 게임의 입력 칸을 그대로 넘기면 거기에 적는다. */
export interface PointerState { m1: number; m2: number; mx: number; my: number }

export interface PointerHooks {
  /** 오른쪽 단추를 누른 순간(설치·상호작용) */
  rightDown?(): void;
  /** 휠 한 칸 */
  wheel?(e: WheelEvent): void;
}

/** 누름은 캔버스에서만, 뗌·이동은 창 전체에서 받는다 — 캔버스 밖에서 떼도 풀리게. */
export function bindPointer(cv: HTMLElement, st: PointerState, hooks: PointerHooks): void {
  cv.addEventListener('mousedown', e => {
    e.preventDefault();
    if (e.button === 0) st.m1 = 1; if (e.button === 2) st.m2 = 1;
    if (e.button === 2 && hooks.rightDown) hooks.rightDown();
  });
  addEventListener('mouseup', e => { if (e.button === 0) st.m1 = 0; if (e.button === 2) st.m2 = 0; });
  addEventListener('mousemove', e => { st.mx = e.clientX; st.my = e.clientY; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { if (hooks.wheel) hooks.wheel(e); }, { passive: true });
}
