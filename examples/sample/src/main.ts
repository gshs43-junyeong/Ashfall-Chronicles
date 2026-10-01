/* ===== examples/sample/src/main.ts — 엔진만으로 도는 최소 예제: 타일맵 · 플레이어 · 캐기/놓기 · 빛 · 멈춤 · 저장 · 번역 · 터치 ===== */
/* 엔진이 게임을 모르고도 돈다는 증명이다 — import 는 전부 src/engine 에서만 온다(tests/sample.mjs 가 막는다).
   묶기: node tools/bundle.mjs → examples/sample/sample.js(클래식 스크립트 하나 — file:// 에서도 열린다). */
import { clamp } from '../../../src/engine/core/math.js';
import { startLoop } from '../../../src/engine/core/loop.js';
import { Entity } from '../../../src/engine/entity/entity.js';
import { createInput } from '../../../src/engine/input/actions.js';
import { bindPointer } from '../../../src/engine/input/pointer.js';
import type { PointerState } from '../../../src/engine/input/pointer.js';
import { mountTouch } from '../../../src/engine/input/touch.js';
import { fitCanvas } from '../../../src/engine/platform/viewport.js';
import { createPipeline, tileView } from '../../../src/engine/render/pipeline.js';
import { blitCell } from '../../../src/engine/render/atlas.js';
import { createScenes } from '../../../src/engine/scene/scenes.js';
import { sweepLight } from '../../../src/engine/tilemap/light.js';
import type { TileMap } from '../../../src/engine/tilemap/tilemap.js';
import { createI18n } from '../../../src/engine/i18n/i18n.js';
import { koParticle } from '../../../src/engine/i18n/ko.js';
import { createSaveStore } from '../../../src/engine/save/store.js';
import { makeSigner } from '../../../src/engine/save/seal.js';
import { upgrade } from '../../../src/engine/save/upgrade.js';
import { rleDecode, rleEncode } from '../../../src/engine/save/rle.js';
import { TS, WW, WH, T, DEFS, PLACEABLE, generate, makeAtlas } from './tiles.js';

/* ---------- 번역 — 원문(한국어)이 열쇠. ?lang=en 이나 브라우저 언어로 고른다 ---------- */
const EN: Record<string, string> = {
  '←→ 이동 · 스페이스 점프 · ↓ 발판 내려가기': '←→ move · Space jump · ↓ drop through',
  '왼쪽 클릭 캐기 · 오른쪽 클릭 놓기 · 1~4 블록 · P 멈춤 · S 저장 · L 불러오기': 'Left click dig · Right click place · 1–4 block · P pause · S save · L load',
  '{name|을} 들었다': 'Holding {name}', '저장했다': 'Saved', '불러왔다': 'Loaded', '저장된 게임이 없다': 'No saved game',
  '저장이 고쳐졌다 — 불러오지 않는다': 'Save was tampered with — not loading', '멈춤': 'Paused', '점프': 'Jump', '놓기': 'Place',
  '흙': 'Dirt', '풀': 'Grass', '돌': 'Stone', '나무 발판': 'Plank', '기반암': 'Bedrock', '횃불': 'Torch', '공기': 'Air'
};
const qs = new URLSearchParams(location.search);
const lang = qs.get('lang') || (navigator.language.startsWith('ko') ? 'ko' : 'en');
const { tr } = createI18n({ source: 'ko', lang, locales: { en: { msgs: EN } }, fallback: ['en'], hooks: { ko: koParticle } });

/* ---------- 세계 · 그림 ---------- */
let map: TileMap = generate('sample');
const atlas = makeAtlas();
const cv = document.getElementById('game') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
let view = { W: 0, H: 0 };
const zoom = () => (innerHeight > 700 ? 2 : 1.5);
const resize = () => { view = fitCanvas(cv, ctx, zoom()); };
addEventListener('resize', resize); resize();

/* ---------- 입력 — 게임은 키가 아니라 액션을 묻는다 ---------- */
const input = createInput({
  actions: [
    { id: 'left', def: ['ArrowLeft', 'KeyA'] }, { id: 'right', def: ['ArrowRight', 'KeyD'] },
    { id: 'jump', def: ['Space', 'ArrowUp', 'KeyW'] }, { id: 'down', def: ['ArrowDown'] },
    { id: 'pause', def: ['KeyP', 'Escape'] }, { id: 'save', def: ['KeyS'] }, { id: 'load', def: ['KeyL'] }
  ],
  custom: () => null
});
const ptr: PointerState = { m1: 0, m2: 0, mx: 0, my: 0 };

/* ---------- 플레이어 — 엔진 Entity 의 이동 조각(가로 → 중력 → 세로 → 경계)을 차례로 부른다 ---------- */
const GRAV = 1500, JUMP = -520, SPEED = 170, FALL_CAP = 900;
class Player extends Entity {
  declare face: number;
  constructor(x: number, y: number) { super(x, y, 10, 22); this.face = 1; }
  update(dt: number, m: TileMap, ctl: boolean): void {
    const dir = ctl ? (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0) : 0;
    this.vx = dir * SPEED; if (dir) this.face = dir;
    if (ctl && input.held('jump') && this.onGround) this.vy = JUMP;
    const nx = this.x + this.vx * dt;
    this.moveX(m, nx, TS, nx);                                   // 한 칸 턱은 걸어 오른다
    this.fall(dt, GRAV, -FALL_CAP, FALL_CAP);
    const prevBottom = this.y + this.h;
    this.moveY(m, this.y + this.vy * dt, prevBottom, !(ctl && input.held('down')));
    this.keepIn(0, WW * TS, (WH - 3) * TS);
  }
}
const spawn = () => {                                            // 가운데 위에서 떨어뜨린다 — 땅에 닿으면 선다
  let y = 0; const x = WW >> 1; while (y < WH && !map.solid(x, y)) y++;
  return new Player(x * TS + 3, (y - 3) * TS);
};
let player = spawn();
const cam = { x: 0, y: 0 };
let sel = 0, msg = '', msgT = 0;
const say = (s: string) => { msg = s; msgT = 2.5; };

/* ---------- 캐기 · 놓기 ---------- */
const dig = { x: -1, y: -1, t: 0 };
const cursorTile = () => ({ x: Math.floor((ptr.mx / zoom() + cam.x) / TS), y: Math.floor((ptr.my / zoom() + cam.y) / TS) });
const inReach = (x: number, y: number) => Math.hypot((x + 0.5) * TS - player.cx, (y + 0.5) * TS - player.cy) < TS * 6;
function place(): void {
  const { x, y } = cursorTile(), id = PLACEABLE[sel];
  if (!inReach(x, y) || map.get(x, y) !== T.AIR) return;
  map.set(x, y, id);
  if (DEFS[id].solid === 1 && map.hitSolid(player.x, player.y, player.w, player.h)) map.set(x, y, T.AIR);   // 몸속에는 못 놓는다
}
function digTick(dt: number): void {
  if (!ptr.m1) { dig.t = 0; return; }
  const { x, y } = cursorTile(), d = DEFS[map.get(x, y)];
  if (!inReach(x, y) || !d.hard) { dig.t = 0; return; }
  if (x !== dig.x || y !== dig.y) { dig.x = x; dig.y = y; dig.t = 0; }
  dig.t += dt;
  if (dig.t >= d.hard) { map.set(x, y, T.AIR); dig.t = 0; }
}

/* ---------- 저장 — 엔진 저장소(IndexedDB, 안 되면 localStorage) · 서명 · RLE · 판올림 ---------- */
interface SaveData { v?: number; tiles: string; px: number; py: number; sel?: number }
/* ★ STEPS[i] 는 판 i+1 → i+2. 판 1 에는 sel 이 없었다 — 판 번호는 STEPS.length + 1 로 저절로 오른다. */
const STEPS: ((d: SaveData) => void)[] = [d => { if (d.sel === undefined) d.sel = 0; }];
const sign = makeSigner('engine-sample');
const store = createSaveStore({
  dbName: 'ashfall-engine-sample', slots: 1,
  slotKey: i => 'sample_save_' + i, sigKey: i => 'sample_sig_' + i,
  sign, head: (d: SaveData) => ({ v: d.v }), sealOk: (raw, _d, sig) => sig === sign(raw)
});
async function save(): Promise<void> {
  const d: SaveData = { v: STEPS.length + 1, tiles: rleEncode(map.tiles), px: player.x, py: player.y, sel };
  const raw = JSON.stringify(d);
  await store.put(0, raw, { v: d.v }, sign(raw));
  say(tr('저장했다'));
}
async function load(): Promise<void> {
  const got = await store.get(0);
  if (!got) { say(tr('저장된 게임이 없다')); return; }
  if (got.sig !== sign(got.raw)) { say(tr('저장이 고쳐졌다 — 불러오지 않는다')); return; }
  const d = upgrade(JSON.parse(got.raw) as SaveData, STEPS);
  const m = generate('sample');
  m.tiles = rleDecode(d.tiles, WW * WH, Uint8Array);
  map = m; player = new Player(d.px, d.py); sel = d.sel || 0;
  say(tr('불러왔다'));
}

/* ---------- 씬 — 바닥 씬 하나 + 멈춤 겹(갱신·조작을 막고 그리기는 한다) ---------- */
const scenes = createScenes({
  scenes: {
    play: {
      update(dt: number): void {
        const ctl = !scenes.inputBlocked();
        player.update(dt, map, ctl);
        if (ctl) digTick(dt);
        cam.x = clamp(player.cx - view.W / 2, 0, WW * TS - view.W);
        cam.y = clamp(player.cy - view.H / 2, 0, WH * TS - view.H);
        msgT = Math.max(0, msgT - dt);
      },
      render(): void { pipe.run({ c: ctx, camX: Math.round(cam.x), camY: Math.round(cam.y), W: view.W, H: view.H }); }
    }
  },
  layers: { pause: { pause: true, input: true } },
  start: 'play'
});

input.bindKeyboard({
  down(e) {
    if (input.isKey('pause', e.code)) scenes.set('pause', !scenes.has('pause'));
    else if (input.isKey('save', e.code)) void save();
    else if (input.isKey('load', e.code)) void load();
    else if (/^Digit[1-4]$/.test(e.code)) { sel = +e.code.slice(5) - 1; say(tr('{name|을} 들었다', { name: tr(DEFS[PLACEABLE[sel]].name) })); }
  }
});
bindPointer(cv, ptr, {
  rightDown: place,
  wheel: e => { sel = (sel + (e.deltaY > 0 ? 1 : PLACEABLE.length - 1)) % PLACEABLE.length; }
});
if (qs.get('touch') === '1' || (qs.get('touch') !== '0' && matchMedia('(pointer: coarse)').matches))
  mountTouch({ input, ptr, surface: cv, buttons: [{ id: 'jump', label: tr('점프') }], altLabel: tr('놓기'), rightDown: place });

/* ---------- 그리기 — 이름 붙은 단계를 정해진 순서로 ---------- */
interface Frame { c: CanvasRenderingContext2D; camX: number; camY: number; W: number; H: number }
const pipe = createPipeline<Frame>(['sky', 'tiles', 'actors', 'light', 'hud']);

pipe.add('sky', ({ c, W, H }) => {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2b3c6b'); g.addColorStop(1, '#8a6a7a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
});

pipe.add('tiles', ({ c, camX, camY, W, H }) => {
  const v = tileView(camX, camY, W, H, TS);
  for (let y = v.ty0; y <= v.ty1; y++) for (let x = v.tx0; x <= v.tx1; x++) {
    const id = map.get(x, y);
    if (id === T.AIR) continue;
    blitCell(c, atlas, TS, (x * 7 + y * 3) & 3, id, x * TS - camX, y * TS - camY);
  }
  if (dig.t > 0) {                                               // 캐는 칸 — 진행만큼 금
    const d = DEFS[map.get(dig.x, dig.y)];
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.fillRect(dig.x * TS - camX, dig.y * TS - camY + TS * (1 - dig.t / d.hard), TS, TS * dig.t / d.hard);
  }
  const k = cursorTile();
  c.strokeStyle = inReach(k.x, k.y) ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.2)';
  c.strokeRect(k.x * TS - camX + 0.5, k.y * TS - camY + 0.5, TS - 1, TS - 1);
});

pipe.add('actors', ({ c, camX, camY }) => {
  const x = Math.round(player.x - camX), y = Math.round(player.y - camY);
  c.fillStyle = '#e8d8b0'; c.fillRect(x, y, player.w, player.h);                 // 몸
  c.fillStyle = '#c0392b'; c.fillRect(x - 1, y + 7, player.w + 2, 3);             // 목도리
  c.fillStyle = '#1a1420'; c.fillRect(x + (player.face > 0 ? 6 : 2), y + 3, 2, 2); // 눈
});

/* 빛 — 하늘이 보이는 칸은 15, 횃불은 제 세기. 막힌 칸을 지날 때 3, 빈 칸은 1 씩 준다(엔진은 번지는 법만, 무엇이 먹는지는 여기서). */
const MARGIN = 14;
let L = new Float32Array(0);
pipe.add('light', ({ c, camX, camY, W, H }) => {
  const v = tileView(camX, camY, W, H, TS);
  const x0 = v.tx0 - MARGIN, y0 = v.ty0 - MARGIN, w = v.tx1 - v.tx0 + 1 + MARGIN * 2, h = v.ty1 - v.ty0 + 1 + MARGIN * 2;
  if (L.length !== w * h) L = new Float32Array(w * h);
  for (let x = 0; x < w; x++) {
    let sky = true;
    for (let yy = Math.min(0, y0); yy < y0; yy++) if (map.solid(x0 + x, yy)) { sky = false; break; }
    for (let y = 0; y < h; y++) {
      const id = map.get(x0 + x, y0 + y);
      if (sky && DEFS[id].solid === 1) sky = false;
      L[y * w + x] = sky ? 15 : DEFS[id].light || 0;
    }
  }
  sweepLight(L, w, h, x0, y0, 2, (x, y) => (map.solid(x, y) ? 3 : 1));
  for (let y = MARGIN; y < h - MARGIN; y++) for (let x = MARGIN; x < w - MARGIN; x++) {
    const a = 1 - L[y * w + x] / 15;
    if (a <= 0.02) continue;
    c.fillStyle = `rgba(6,4,12,${a.toFixed(2)})`;
    c.fillRect((x0 + x) * TS - camX, (y0 + y) * TS - camY, TS, TS);
  }
});

pipe.add('hud', ({ c, W, H }) => {
  c.font = '8px system-ui, sans-serif'; c.textBaseline = 'top';
  c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, 24);
  c.fillStyle = '#f0e6cc';
  c.fillText(tr('←→ 이동 · 스페이스 점프 · ↓ 발판 내려가기'), 4, 3);
  c.fillText(tr('왼쪽 클릭 캐기 · 오른쪽 클릭 놓기 · 1~4 블록 · P 멈춤 · S 저장 · L 불러오기'), 4, 13);
  PLACEABLE.forEach((id, i) => {                                 // 블록 칸
    const x = 4 + i * 20, y = H - 22;
    c.fillStyle = i === sel ? 'rgba(255,220,140,.9)' : 'rgba(0,0,0,.5)'; c.fillRect(x - 2, y - 2, TS + 4, TS + 4);
    blitCell(c, atlas, TS, 0, id, x, y);
  });
  if (msgT > 0) { c.fillStyle = `rgba(255,240,200,${Math.min(1, msgT)})`; c.fillText(msg, 4, H - 36); }
  if (scenes.has('pause')) {
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 0, W, H);
    c.font = 'bold 16px system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff';
    c.fillText(tr('멈춤'), W / 2, H / 2 - 8); c.textAlign = 'left';
  }
});

/* ---------- 돌리기 — dt 는 1/20 초에서 자른다(탭을 비웠다 돌아와도 한 번에 튀지 않게) ---------- */
startLoop(dt => scenes.frame(dt), 1 / 20);
/* 헤드리스 검사(tests/sample.mjs)가 들여다보는 창구 — 게임 코드는 이것을 읽지 않는다 */
Object.assign(window, { SAMPLE: { get map() { return map; }, get player() { return player; }, input, ptr, scenes, cam, save, load } });
