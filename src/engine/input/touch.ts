/* ===== engine/input/touch.ts — 터치 조작 뼈대: 가상 스틱 · 단추 · 화면 탭 ===== */
/* ★ 게임은 입력 장치를 모른다 — 스틱·단추는 액션 칸(input.virt)을 켜고, 탭은 마우스와 같은 칸(ptr: mx·my·m1·m2)에 적는다.
   모양은 뼈대다(인라인 스타일 한 벌). 크기·배치·안전 영역은 P9 에서 다듬는다.
   오른쪽 단추 높이는 CSS 변수 --ti-bottom — 게임이 제 HUD(단추 줄 등)를 비켜 올린다. */
import type { Input } from './actions.js';
import type { PointerState } from './pointer.js';

export interface TouchConfig {
  input: Input;
  ptr: PointerState;
  /** 탭·길게 누르기를 받을 면(게임 캔버스) */
  surface: HTMLElement;
  /** 단추로 둘 지속 액션(누르는 동안 켜짐) */
  buttons: ReadonlyArray<{ id: string; label: string }>;
  /** 전환 단추 이름 — 켜 두면 탭이 오른쪽 단추(설치·상호작용)가 된다 */
  altLabel: string;
  /** 오른쪽 단추를 누른 순간 — 마우스와 같은 자리 */
  rightDown?(): void;
}

const STICK_R = 56;          // 스틱 반지름(px) — 이만큼 밀면 끝
const DEAD = 18;             // 이 안쪽은 안 민 것으로 친다

const CSS = `
#touchpad{--ti-bottom:24px;position:fixed;inset:0;pointer-events:none;z-index:40;user-select:none;-webkit-user-select:none}
#touchpad .ti-stick{position:absolute;left:24px;bottom:24px;width:${STICK_R * 2 + 40}px;height:${STICK_R * 2 + 40}px;pointer-events:auto;touch-action:none}
#touchpad .ti-base{position:absolute;inset:20px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.25)}
#touchpad .ti-knob{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(255,255,255,.35)}
#touchpad .ti-btns{position:absolute;right:24px;bottom:var(--ti-bottom);display:flex;gap:14px;pointer-events:auto}
#touchpad .ti-btn{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font:600 15px system-ui,sans-serif;color:#fff;
  background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);touch-action:none}
#touchpad .ti-btn.on,#touchpad .ti-alt.on{background:rgba(255,255,255,.35)}
#touchpad .ti-alt{position:absolute;right:24px;bottom:calc(var(--ti-bottom) + 84px);width:64px;height:40px;border-radius:12px;display:grid;place-items:center;
  font:600 13px system-ui,sans-serif;color:#fff;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);pointer-events:auto;touch-action:none}
`;

/** 터치 조작을 붙인다. 떼어 낼 때는 돌려준 destroy(). */
export function mountTouch({ input, ptr, surface, buttons, altLabel, rightDown }: TouchConfig): { el: HTMLElement; destroy(): void } {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'touchpad';
  el.innerHTML = '<div class="ti-stick"><div class="ti-base"></div><div class="ti-knob"></div></div><div class="ti-btns"></div><div class="ti-alt"></div>';
  document.body.appendChild(el);
  const stick = el.querySelector('.ti-stick') as HTMLElement, knob = el.querySelector('.ti-knob') as HTMLElement;
  const V = input.virt;
  const off: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    t.addEventListener(type, fn as EventListener); off.push(() => t.removeEventListener(type, fn as EventListener));
  };

  /* ---- 스틱: 가로로 밀면 left/right, 아래로 밀면 down ---- */
  let sid = -1, cx = 0, cy = 0;
  const setStick = (dx: number, dy: number) => {
    const d = Math.hypot(dx, dy), k = d > STICK_R ? STICK_R / d : 1;
    knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    V.left = dx < -DEAD ? 1 : 0; V.right = dx > DEAD ? 1 : 0; V.down = dy > DEAD * 1.6 ? 1 : 0;
  };
  on(stick, 'pointerdown', e => {
    e.preventDefault(); sid = e.pointerId; stick.setPointerCapture(sid);
    const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    setStick(e.clientX - cx, e.clientY - cy);
  });
  on(stick, 'pointermove', e => { if (e.pointerId === sid) setStick(e.clientX - cx, e.clientY - cy); });
  const stickUp = (e: PointerEvent) => { if (e.pointerId !== sid) return; sid = -1; setStick(0, 0); };
  on(stick, 'pointerup', stickUp); on(stick, 'pointercancel', stickUp);

  /* ---- 단추: 누르는 동안 그 액션이 켜진다 ---- */
  const box = el.querySelector('.ti-btns') as HTMLElement;
  for (const b of buttons) {
    const btn = document.createElement('div'); btn.className = 'ti-btn'; btn.dataset.id = b.id; btn.textContent = b.label;
    box.appendChild(btn);
    on(btn, 'pointerdown', e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); V[b.id] = 1; btn.classList.add('on'); });
    const up = () => { V[b.id] = 0; btn.classList.remove('on'); };
    on(btn, 'pointerup', up); on(btn, 'pointercancel', up);
  }

  /* ---- 전환: 켜 두면 탭이 오른쪽 단추 ---- */
  /* ★ 길게 누르기로 오른쪽 단추를 내지 않는다 — 캐기는 오래 누르고 있어야 해서, 캐는 중에 설치로 바뀌어 버렸다. */
  const alt = el.querySelector('.ti-alt') as HTMLElement; alt.textContent = altLabel;
  let altOn = false;
  on(alt, 'pointerdown', e => { e.preventDefault(); altOn = !altOn; alt.classList.toggle('on', altOn); });

  /* ---- 화면: 탭한 자리를 겨눠 누르는 동안 왼쪽 단추(캐기·공격) — 전환이 켜져 있으면 오른쪽 단추 ---- */
  let tid = -1;
  on(surface, 'pointerdown', e => {
    if (e.pointerType === 'mouse' || tid >= 0) return;
    e.preventDefault();                                 // 뒤따르는 가짜 마우스 이벤트를 막는다
    tid = e.pointerId;
    ptr.mx = e.clientX; ptr.my = e.clientY;
    if (altOn) { ptr.m2 = 1; if (rightDown) rightDown(); } else ptr.m1 = 1;
  });
  on(surface, 'pointermove', e => { if (e.pointerId === tid) { ptr.mx = e.clientX; ptr.my = e.clientY; } });
  const tapUp = (e: PointerEvent) => {
    if (e.pointerId !== tid) return;
    tid = -1; ptr.m1 = 0; ptr.m2 = 0;
  };
  on(surface, 'pointerup', tapUp); on(surface, 'pointercancel', tapUp);
  surface.style.touchAction = 'none';

  return {
    el,
    destroy() {
      off.forEach(f => f()); el.remove(); st.remove();
      for (const b of buttons) V[b.id] = 0;
      V.left = V.right = V.down = 0;
    }
  };
}
