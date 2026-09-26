/* ===== engine/input/actions.ts — 키 상태와 액션 매핑 ===== */
/* 게임은 키가 아니라 **액션**(left · jump · inv …)을 묻는다 — 키는 사용자가 다시 매길 수 있고, 터치 단추는 액션을 바로 켠다(virt).
   액션 표(기본 키)와 사용자 설정 키는 게임이 넘긴다. */

export interface ActionDef { id: string; def: string[] }

export interface InputConfig {
  actions: ReadonlyArray<ActionDef>;
  /** 사용자가 다시 매긴 키(액션 → 키 목록) — 없으면 기본 키 */
  custom(): Record<string, string[] | undefined> | null | undefined;
}

export interface KeyHooks {
  /** 조작키를 다시 매기는 중이면 true 를 돌려 그 키를 삼킨다(눌림으로 치지 않는다). */
  capture?(e: KeyboardEvent): boolean;
  /** 새로 눌린 키(반복 아님) — 키 상태를 적은 뒤에 부른다. */
  down?(e: KeyboardEvent): void;
  /** 창이 포커스를 잃었다 — 키 상태는 이미 비웠다. */
  blur?(): void;
}

export function createInput({ actions, custom }: InputConfig) {
  const keys: Record<string, number> = {};       // 키 code → 1(눌림) · 0
  const virt: Record<string, number> = {};       // 액션 → 1 — 터치 단추·스틱이 켠다
  const input = {
    keys, virt,
    /** 이 액션에 걸린 키 목록. */
    keysFor(id: string): string[] {
      const c = custom(), mine = c && c[id];
      if (mine && mine.length) return mine;
      const a = actions.find(k => k.id === id);
      return a ? a.def : [];
    },
    /** 지금 눌려 있는가(키 또는 가상 입력) */
    held(id: string): boolean { return !!virt[id] || input.keysFor(id).some(c => keys[c]); },
    /** 방금 눌린 code 가 이 액션인가 */
    isKey(id: string, code: string): boolean { return input.keysFor(id).indexOf(code) >= 0; },
    /** 창에 키보드를 건다. */
    bindKeyboard(hooks: KeyHooks): void {
      addEventListener('keydown', e => {
        if (e.repeat) { keys[e.code] = 1; return; }
        if (hooks.capture && hooks.capture(e)) { e.preventDefault(); return; }
        keys[e.code] = 1;
        if (hooks.down) hooks.down(e);
      });
      addEventListener('keyup', e => { keys[e.code] = 0; });
      addEventListener('blur', () => { for (const k in keys) keys[k] = 0; if (hooks.blur) hooks.blur(); });
    }
  };
  return input;
}
export type Input = ReturnType<typeof createInput>;
