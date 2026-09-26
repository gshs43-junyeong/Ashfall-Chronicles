// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== ctx.js — 늦게 묶는 자리: 아래층이 위층을 import 하지 않고 쓰게 한다 ===== */
/* ★ world·entity·factory·ui 가 game.js(G)·ui.js(UI)·factory.js(Factory)를 import 하면 순환이 생긴다.
   위층이 읽힐 때 제 객체를 여기 걸고(bind*), 아래층은 이름을 바꿔 가져다 쓴다 — import { app as G } from './ctx.js'.
   ★ 값은 실행 중에만 있다 — 아래층 파일의 최상위(읽히는 순간)에서 쓰면 null 이다.
   아래층이 G 의 무엇을 쓰는지는 tests/modules.mjs 가 파일마다 적어 두고(tests/baseline/ctx.json), 새로 쓰면 알린다. */
export let app = null;       // 게임 인스턴스 G (game.js)
export let ui = null;        // UI (ui.js)
export let factory = null;   // Factory (factory.js)
export function bindApp(v) { app = v; }
export function bindUI(v) { ui = v; }
export function bindFactory(v) { factory = v; }
