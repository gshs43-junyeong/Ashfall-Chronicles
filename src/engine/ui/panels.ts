/* ===== engine/ui/panels.ts — 패널: 한 번에 하나만 열리는 창 ===== */
/* 창은 게임이 HTML 로 만들어 두고, 여기서는 'open' 클래스와 지금 열린 창 이름만 쥔다.
   다른 창을 열기 전에 닫는 것(그리고 닫을 때 치울 것)은 게임이 정한다. */

export function createPanels(el: (id: string) => Element | null) {
  let cur: string | null = null;
  return {
    /** 열린 창 이름(없으면 null) */
    get current(): string | null { return cur; },
    /** 그 창을 연다 — 창이 없으면 false(아무것도 안 바뀐다) */
    show(id: string): boolean {
      const e = el(id);
      if (!e) return false;
      e.classList.add('open'); cur = id;
      return true;
    },
    /** 열린 창을 닫는다 */
    hide(): void {
      if (cur) { const e = el(cur); if (e) e.classList.remove('open'); }
      cur = null;
    }
  };
}
export type Panels = ReturnType<typeof createPanels>;
