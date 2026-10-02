/* ===== engine/core/loop.ts — requestAnimationFrame 루프 ===== */

export interface LoopOpts {
  /** 탭이 숨어도 돌아야 하는가(멀티플레이 방 따위) — 참이면 숨은 동안 워커 타이머로 돌린다. */
  background?: () => boolean;
  /** 숨은 동안의 틱 수(초당). */
  bgHz?: number;
}

/** 매 프레임 frame(dt, rawDt) 를 부른다. rawDt 는 실제로 흐른 시간(초), dt 는 그것을 maxDt 로 자른 것 —
    탭을 오래 비웠다 돌아와도 물리가 한 번에 튀지 않게. 첫 프레임은 0.
    ★ 숨은 탭에서는 requestAnimationFrame 이 아예 멈춘다 — 호스트가 탭을 내리면 세계(몹·공장·시계)가 통째로 서고, 참가자가 내리면
    소식이 끊겨 호스트가 내보낸다. background() 가 참이면 그동안 워커의 타이머(배경 탭에서도 덜 묶인다)로 틱을 받는다. */
export function startLoop(frame: (dt: number, rawDt: number) => void, maxDt: number, opts: LoopOpts = {}): void {
  let last = 0, bgOn = false, worker: Worker | null = null;
  const step = (now: number): void => {
    const rawDt = now - (last || now);
    last = now;
    frame(Math.min(maxDt, rawDt), rawDt);
  };
  const tick = (t: number): void => {
    requestAnimationFrame(tick);            // 먼저 다음 프레임을 건다 — frame 이 던져도 루프는 산다
    if (!bgOn) step(t / 1000);
  };
  requestAnimationFrame(tick);
  if (!opts.background || typeof document === 'undefined' || typeof Worker === 'undefined') return;
  const sync = (): void => {
    const want = document.hidden && !!opts.background && opts.background();
    if (want === bgOn) return;
    bgOn = want;
    if (want && !worker) {
      const src = 'let id=0;onmessage=e=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data)}';
      try { worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); }
      catch { bgOn = false; return; }        // 워커를 못 만드는 곳이면 예전처럼 멈춘다
      worker.onmessage = () => { if (bgOn) { try { step(performance.now() / 1000); } catch (e) { console.error(e); } } };
    }
    if (worker) worker.postMessage(want ? Math.round(1000 / (opts.bgHz || 30)) : 0);
  };
  document.addEventListener('visibilitychange', sync);
  setInterval(sync, 1000);                  // background() 가 바뀌는 것(방을 열고 닫음)도 잡는다
}
