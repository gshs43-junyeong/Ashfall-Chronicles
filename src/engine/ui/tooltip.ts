/* ===== engine/ui/tooltip.ts — 툴팁: 커서 옆에 띄우고 화면 밖으로 나가지 않게 ===== */

export function createTooltip(el: HTMLElement, { width = 280, dx = 18, dy = 14, gap = 8, top = 4 } = {}) {
  /** 커서 오른쪽 아래 — 오른쪽이 모자라면 커서 왼쪽으로, 아래가 모자라면 바닥에서 gap 위로(그래도 top 아래로는 안 올라간다) */
  const place = (x: number, y: number): void => {
    let lx = x + dx, ly = y + dy;
    if (lx + width > innerWidth) lx = x - width - gap;
    if (ly + el.offsetHeight > innerHeight) ly = innerHeight - el.offsetHeight - gap;
    el.style.left = lx + 'px'; el.style.top = Math.max(top, ly) + 'px';
  };
  return {
    el, place,
    show(html: string, x: number, y: number): void { el.innerHTML = html; el.style.display = 'block'; place(x, y); },
    hide(): void { el.style.display = 'none'; }
  };
}
export type Tooltip = ReturnType<typeof createTooltip>;
