/* ===== engine/ui/toasts.ts — 알림 줄: 쌓이고 사라지는 짧은 글 ===== */
/* 같은 글이 잇달아 오면 새 줄을 늘리지 않고 그 줄에 ×N 을 붙이고 시간을 다시 잰다 — 광맥을 캘 때 "구리 광석 획득"이
   화면을 다 덮던 것. 한꺼번에 max 줄까지만 두고 오래된 것부터 걷는다. 모양은 CSS(class 'toast' + kind)가 정한다. */

export interface ToastConfig { host: () => HTMLElement | null; life?: number; fade?: number; max?: number }

export function createToasts({ host, life = 2.2, fade = 0.4, max = 6 }: ToastConfig) {
  interface Row { el: HTMLElement; msg: string; kind: string; n: number; t1: number; t2: number }
  const rows: Row[] = [];
  const drop = (r: Row) => { clearTimeout(r.t1); clearTimeout(r.t2); r.el.remove(); const i = rows.indexOf(r); if (i >= 0) rows.splice(i, 1); };
  const arm = (r: Row) => {
    clearTimeout(r.t1); clearTimeout(r.t2);
    r.el.style.transition = ''; r.el.style.opacity = '';
    r.t1 = setTimeout(() => { r.el.style.transition = `opacity ${fade}s`; r.el.style.opacity = '0'; }, life * 1000) as unknown as number;
    r.t2 = setTimeout(() => drop(r), (life + fade) * 1000) as unknown as number;
  };
  return {
    push(msg: string, kind = ''): void {
      const h = host(); if (!h) return;
      const last = rows[rows.length - 1];
      if (last && last.msg === msg && last.kind === kind) {
        last.n++; last.el.textContent = `${msg} ×${last.n}`; arm(last); return;
      }
      const el = document.createElement('div');
      el.className = 'toast' + (kind ? ' ' + kind : '');
      el.textContent = msg;
      h.appendChild(el);
      const r: Row = { el, msg, kind, n: 1, t1: 0, t2: 0 };
      rows.push(r); arm(r);
      while (rows.length > max) drop(rows[0]);
    },
    clear(): void { while (rows.length) drop(rows[0]); },
  };
}
