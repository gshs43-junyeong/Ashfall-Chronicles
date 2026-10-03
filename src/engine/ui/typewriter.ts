/* ===== engine/ui/typewriter.ts — 한 글자씩 흘러나오는 글 ===== */
/* 대사를 한 번에 다 보이면 읽는 박자가 없다. 글 길이에 맞춘 시간(dur — 짧은 글도 너무 빨리, 긴 글도 너무 늘어지지 않게) 안에
   글자를 늘려 가되, 쉼표·마침표·줄표 뒤에서는 잠깐 숨을 쉰다(pause — 글자 몇 개 분량). 다 나오면 done() 한 번. */

export interface TypeOptions {
  msPer?: number; min?: number; max?: number;     // 글자당 ms · 한 줄 최소/최대 ms
  pause?: Record<string, number>;                 // 그 글자 뒤 숨(글자 몇 개 분량)
  onChar?(ch: string, i: number): void;           // 새 글자가 나올 때(말소리 따위)
  done(): void;
}

const DEFAULT_PAUSE: Record<string, number> = { ',': 2, '.': 4, '!': 4, '?': 4, '—': 3, '…': 5, '、': 2, '。': 4 };

/** 끝까지 펼치기 · 멈추기 · 도는 중인가 */
export interface Typing { finish(): boolean; stop(): void; readonly busy: boolean }

export function typewrite(el: HTMLElement, text: string, o: TypeOptions): Typing {
  const n = text.length, pause = o.pause || DEFAULT_PAUSE;
  /* 글자마다 "언제 나오는가"를 쌓아 둔다 — 숨 쉰 만큼 뒤로 밀린다 */
  const at = new Float32Array(n + 1);
  let acc = 0;
  for (let i = 0; i < n; i++) { at[i] = acc; acc += 1 + (pause[text[i]] || 0); }
  at[n] = acc;
  const dur = Math.max(o.min ?? 300, Math.min(o.max ?? 1100, n * (o.msPer ?? 34)));
  const unit = acc > 0 ? dur / acc : 0;
  let shown = 0, raf = 0, live = true;
  const t0 = performance.now();
  const end = () => { live = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  const tick = () => {
    if (!live) return;
    const t = (performance.now() - t0) / (unit || 1);
    let k = shown;
    while (k < n && at[k] <= t) k++;
    if (k !== shown) {
      for (let i = shown; i < k; i++) if (o.onChar && text[i] !== ' ') o.onChar(text[i], i);
      shown = k; el.textContent = text.slice(0, k);
    }
    if (shown >= n) { end(); o.done(); return; }
    raf = requestAnimationFrame(tick);
  };
  if (!n) { el.textContent = text; live = false; o.done(); }
  else { el.textContent = ''; raf = requestAnimationFrame(tick); }
  return {
    finish(): boolean { if (!live) return false; end(); el.textContent = text; o.done(); return true; },
    stop(): void { end(); },
    get busy(): boolean { return live; },
  };
}
