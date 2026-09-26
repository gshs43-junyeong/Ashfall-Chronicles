/* ===== engine/scene/scenes.ts — 씬 스택: 바닥 씬 하나(타이틀·플레이…) + 그 위에 얹는 겹(멈춤·창…) ===== */
/* 바닥 씬은 한 번에 하나이고, 겹은 이름으로 열고 닫는다(같은 겹을 두 번 열어도 한 겹).
   겹이 무엇을 막는지는 게임이 정한다 — pause 는 갱신을, input 은 조작을 막는다. 그리기는 막지 않는다(멈춘 화면도 그린다). */

export interface SceneDef {
  update?(dt: number): void;
  render?(): void;
}
export interface LayerDef {
  /** 열려 있으면 바닥 씬의 update 를 부르지 않는다 */
  pause?: boolean;
  /** 열려 있으면 조작(이동·점프…)을 받지 않는다 */
  input?: boolean;
}

export function createScenes<S extends string, L extends string>({ scenes, layers, start }: {
  scenes: Record<S, SceneDef>;
  layers: Record<L, LayerDef>;
  start: S;
}) {
  let cur: S = start;
  const stack: L[] = [];                      // 연 순서 — 끝이 맨 위
  const any = (k: keyof LayerDef) => stack.some(l => layers[l][k]);
  const open = (l: L) => { if (!stack.includes(l)) stack.push(l); };
  const close = (l: L) => { const i = stack.indexOf(l); if (i >= 0) stack.splice(i, 1); };
  return {
    get current(): S { return cur; },
    /** 바닥 씬을 바꾼다 — 얹힌 겹은 그대로 둔다(걷는 것은 부르는 쪽이 정한다) */
    go(s: S): void { cur = s; },
    open, close,
    set(l: L, on: boolean): void { if (on) open(l); else close(l); },
    has(l: L): boolean { return stack.includes(l); },
    top(): L | undefined { return stack[stack.length - 1]; },
    paused(): boolean { return any('pause'); },
    inputBlocked(): boolean { return any('input'); },
    /** 한 프레임 — 멈춤 겹이 없으면 갱신, 그리고 그리기 */
    frame(dt: number): void {
      const s = scenes[cur];
      if (s.update && !any('pause')) s.update(dt);
      if (s.render) s.render();
    }
  };
}
export type Scenes<S extends string, L extends string> = ReturnType<typeof createScenes<S, L>>;
