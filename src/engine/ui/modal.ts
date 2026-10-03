/* ===== engine/ui/modal.ts — 팝업: 겹쳐 여는 창 · 확인 창 ===== */
/* 창은 class 'open' 으로 열고 닫는다(모양은 CSS). 여러 겹이 열릴 수 있어(슬롯 창 위에 새 게임 창) Esc 는 **가장 위의 하나만** 닫는다 —
   목록 순서가 곧 위아래다(앞이 위). 확인 창은 브라우저 confirm 이 게임 화면 밖(전체 화면이면 안 보임)에 떠서 따로 만든다. */

type Q = (sel: string) => HTMLElement | null;
const $q: Q = sel => document.querySelector(sel) as HTMLElement | null;

export function createModalStack(order: ReadonlyArray<string>, closeHook?: Record<string, () => void>) {
  return {
    open(sel: string): void { const el = $q(sel); if (el) el.classList.add('open'); },
    close(sel: string): void { const el = $q(sel); if (el) el.classList.remove('open'); },
    isOpen(sel: string): boolean { const el = $q(sel); return !!el && el.classList.contains('open'); },
    /** 가장 위에 열린 창 하나를 닫는다 — 닫았으면 true(Esc 를 삼켰다) */
    closeTop(): boolean {
      for (const sel of order) {
        const el = $q(sel);
        if (!el || !el.classList.contains('open')) continue;
        if (closeHook && closeHook[sel]) closeHook[sel]();   // 딸린 상태까지 같이 푸는 창
        else el.classList.remove('open');
        return true;
      }
      return false;
    },
    closeAll(): void { for (const sel of order) { const el = $q(sel); if (el) el.classList.remove('open'); } },
    get any(): boolean { return order.some(sel => { const el = $q(sel); return !!el && el.classList.contains('open'); }); },
  };
}

export interface ConfirmParts { root: string; msg: string; ok: string; cancel: string }

/** 확인 창 — 확인이면 true. Esc · 바깥 누르기는 취소, Enter 는 확인. 되돌릴 수 없는 일이라 처음 초점은 취소 단추 */
export function confirmBox(p: ConfirmParts, text: string, okLabel: string, cancelLabel: string): Promise<boolean> {
  return new Promise(res => {
    const el = $q(p.root)!, okB = $q(p.ok)!, noB = $q(p.cancel)!;
    $q(p.msg)!.textContent = text;
    okB.textContent = okLabel; noB.textContent = cancelLabel;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      e.preventDefault(); e.stopPropagation(); done(e.key === 'Enter');
    };
    const done = (v: boolean) => { el.classList.remove('open'); removeEventListener('keydown', key, true); res(v); };
    okB.onclick = () => done(true); noB.onclick = () => done(false);
    el.onclick = e => { if (e.target === el) done(false); };
    addEventListener('keydown', key, true);         // 캡처 — 게임 키(Esc = 멈춤)보다 먼저 받는다
    el.classList.add('open'); (noB as HTMLButtonElement).focus();
  });
}
