/* ===== engine/ui/slots.ts — 슬롯: 아이콘 + 개수 칸 ===== */
/* 칸 모양은 <div class="slot …"><span class="ic"></span><span class="cnt">개수</span>(덧붙임)</div> 하나다.
   아이콘은 배경 그림(URL)이라 칸을 다시 만들지 않고 paintSlot 으로 고쳐 칠할 수 있다. */

export interface SlotOpts {
  /** data-* 속성 */
  data?: Record<string, string | number>;
  /** 안쪽 칸 — 주지 않으면 빈 칸(안쪽 span 도 없다) */
  fill?: { icon: string; count: string | number; extra?: string };
  /** 안쪽을 직접 적을 때(fill 대신) */
  html?: string;
  click?(e: MouseEvent): void;
  /** 누르는 순간(mousedown) — 기본 동작(글자 선택·끌기)을 막고 부른다 */
  down?(e: MouseEvent): void;
  /** 우클릭 메뉴를 막는다 */
  noMenu?: boolean;
  enter?(e: MouseEvent): void;
  leave?(e: MouseEvent): void;
}

export function setIcon(el: HTMLElement | null, url: string): void { if (el) el.style.backgroundImage = url ? `url(${url})` : ''; }

/** 칸 하나를 만든다(host 를 주면 끝에 붙인다) */
export function makeSlot(cls: string, o: SlotOpts, host?: Element): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  if (o.data) for (const k in o.data) d.dataset[k] = '' + o.data[k];
  if (o.fill) {
    d.innerHTML = `<span class="ic"></span><span class="cnt">${o.fill.count}</span>` + (o.fill.extra || '');
    setIcon(d.querySelector<HTMLElement>('.ic'), o.fill.icon);
  } else if (o.html !== undefined) d.innerHTML = o.html;
  const down = o.down;
  if (down) d.addEventListener('mousedown', e => { e.preventDefault(); down(e); });
  if (o.click) d.addEventListener('click', o.click);
  if (o.noMenu) d.addEventListener('contextmenu', e => e.preventDefault());
  if (o.enter) d.addEventListener('mouseenter', o.enter);
  if (o.leave) d.addEventListener('mouseleave', o.leave);
  if (host) host.appendChild(d);
  return d;
}

/** 이미 있는 칸을 고쳐 칠한다 — 클래스 · 아이콘 · 개수 */
export function paintSlot(el: Element, cls: string, icon: string, count: string | number): void {
  el.className = cls;
  setIcon(el.querySelector<HTMLElement>('.ic'), icon);
  el.querySelector('.cnt')!.textContent = '' + count;
}
