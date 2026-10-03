/* ===== engine/input/gamepad.ts — 게임패드: 스틱 · 단추 · 조준 ===== */
/* 터치와 같은 길로 들어간다 — 누르는 동안 켜지는 액션은 input.virt, 한 번 누르는 액션은 press(액션), 조준과 두 단추는 마우스 칸(ptr).
   표준 배치(Standard Gamepad) 번호: 0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 8 Back · 9 Start · 10 L3 · 11 R3 · 12~15 십자 위·아래·왼·오른.
   브라우저는 패드 이벤트를 주지 않고 상태만 준다 — 매 프레임 poll() 로 읽고 바뀐 것만 알린다. */
import type { Input } from './actions.js';
import type { PointerState } from './pointer.js';

export interface PadConfig {
  input: Input;
  ptr: PointerState;
  /** 단추 번호 → 누르는 동안 켜지는 액션(virt) */
  hold: Record<number, string>;
  /** 단추 번호 → 한 번 누르는 액션(press 로 알린다) */
  tap: Record<number, string>;
  press(action: string): void;
  /** 조준의 중심(화면 CSS 픽셀) — 보통 주인공 자리 */
  anchor(): { x: number; y: number };
  /** 오른쪽 스틱을 끝까지 밀었을 때 조준이 중심에서 떨어지는 거리(px) */
  reach?: number;
  dead?: number;              // 스틱 무시 범위(0~1)
  m1?: number; m2?: number;   // 마우스 두 단추에 걸 단추(기본 RT · LT)
  rightDown?(): void;         // m2 를 누른 순간(설치 · 상호작용)
  /** 패드를 처음 만졌다 · 놓았다(안내 · 커서 숨김에) */
  active?(on: boolean): void;
}

export function createGamepad(cfg: PadConfig) {
  const dead = cfg.dead === undefined ? 0.28 : cfg.dead, reach = cfg.reach || 150;
  const m1 = cfg.m1 === undefined ? 7 : cfg.m1, m2 = cfg.m2 === undefined ? 6 : cfg.m2;
  let prev: boolean[] = [], on = false, ax = 1, ay = 0, owned: Record<string, 1> = {};
  const pressed = (b: GamepadButton | undefined) => !!b && (b.pressed || b.value > 0.5);
  const pad = {
    /** 지금 패드로 조작하고 있는가(마지막으로 만진 것이 패드) */
    get active(): boolean { return on; },
    /** 매 프레임 — 패드가 없으면 아무 일도 않는다 */
    poll(): void {
      const list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of list) if (g && g.connected) { gp = g; break; }
      const V = cfg.input.virt;
      if (!gp) {
        if (on) { for (const a in owned) V[a] = 0; owned = {}; on = false; if (cfg.active) cfg.active(false); }
        return;
      }
      const b = gp.buttons, now = b.map(pressed);
      const lx = gp.axes[0] || 0, ly = gp.axes[1] || 0, rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
      const touched = now.some(x => x) || Math.hypot(lx, ly) > dead || Math.hypot(rx, ry) > dead;
      if (touched && !on) { on = true; if (cfg.active) cfg.active(true); }
      if (!on) return;
      /* 왼쪽 스틱 · 십자 — 이동 */
      const want: Record<string, number> = {
        left: lx < -dead || now[14] ? 1 : 0, right: lx > dead || now[15] ? 1 : 0, down: ly > dead + 0.25 || now[13] ? 1 : 0,
      };
      for (const i in cfg.hold) want[cfg.hold[i]] = (want[cfg.hold[i]] || 0) | (now[+i] ? 1 : 0);
      for (const a in want) { if (want[a]) { V[a] = 1; owned[a] = 1; } else if (owned[a]) { V[a] = 0; delete owned[a]; } }
      /* 한 번 누르는 단추 — 눌린 순간만 */
      for (const i in cfg.tap) if (now[+i] && !prev[+i]) cfg.press(cfg.tap[i]);
      /* 오른쪽 스틱 — 조준(놓으면 마지막 방향을 그대로 둔다) */
      if (Math.hypot(rx, ry) > dead) { const d = Math.hypot(rx, ry); ax = rx / d; ay = ry / d; }
      const c = cfg.anchor(), k = Math.min(1, Math.max(0.35, Math.hypot(rx, ry)));
      cfg.ptr.mx = c.x + ax * reach * k; cfg.ptr.my = c.y + ay * reach * k;
      /* 두 단추 — 마우스와 같은 칸 */
      cfg.ptr.m1 = now[m1] ? 1 : 0;
      if (now[m2] && !prev[m2] && cfg.rightDown) cfg.rightDown();
      cfg.ptr.m2 = now[m2] ? 1 : 0;
      prev = now;
    },
    /** 진동(지원하는 패드만) — 세기 0~1, 길이 ms */
    rumble(strong: number, weak: number, ms: number): void {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of list) {
        const a = g && (g as unknown as { vibrationActuator?: { playEffect?(t: string, o: object): Promise<unknown> } }).vibrationActuator;
        if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
      }
    }
  };
  return pad;
}
export type PadInput = ReturnType<typeof createGamepad>;
