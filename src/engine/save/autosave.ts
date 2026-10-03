/* ===== engine/save/autosave.ts — 저절로 저장: 시간마다 · 탭을 내릴 때 ===== */
/* 손으로 저장하는 것만 믿으면 탭을 닫거나 브라우저가 죽을 때 몇십 분이 사라진다. every 초마다, 그리고 화면이 숨겨질 때
   (탭 전환 · 창 닫기 · 폰 홈 버튼) 저장한다. 지금 저장해도 되는지(싸우는 중 · 죽는 중이면 미룬다)는 게임이 can() 으로 답한다.
   실패하면 바로 또 하지 않고 기다림을 두 배로 늘린다(용량이 찬 저장소를 매 초 두드리지 않게). */

export interface AutosaveConfig {
  every: number;                       // 초
  can(): boolean;                      // 지금 저장해도 되는가
  save(quiet: boolean): Promise<boolean> | boolean;   // quiet — 알림 없이(숨겨질 때)
  onHide?: boolean;                    // 화면이 숨겨질 때도 저장(기본 true)
}

export function createAutosave(cfg: AutosaveConfig) {
  let t = 0, wait = cfg.every, busy = false, enabled = true;
  const run = async (quiet: boolean) => {
    if (busy || !enabled || !cfg.can()) return false;
    busy = true;
    try {
      const ok = await cfg.save(quiet);
      wait = ok ? cfg.every : Math.min(cfg.every * 8, wait * 2);
      return ok;
    } catch (e) { wait = Math.min(cfg.every * 8, wait * 2); return false; }
    finally { busy = false; t = 0; }
  };
  if (cfg.onHide !== false && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.hidden) run(true); });
    addEventListener('pagehide', () => { run(true); });
  }
  return {
    /** 게임 시간으로 흘린다(멈춤 동안은 부르지 않는다) — 때가 되면 저장 */
    tick(dt: number): void { t += dt; if (t >= wait) { t = 0; run(false); } },
    /** 손으로 저장했다 — 다음 자동 저장까지 처음부터 센다 */
    reset(): void { t = 0; wait = cfg.every; },
    now(quiet = false): Promise<boolean> { return run(quiet); },
    set enabled(v: boolean) { enabled = v; },
    get enabled(): boolean { return enabled; },
    get left(): number { return Math.max(0, wait - t); },
  };
}
