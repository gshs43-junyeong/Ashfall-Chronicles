/* 모듈 경계 — 엔진화 계획 §6-4. 소스를 읽기만 한다(브라우저 없음).
   1) 선언 안 된 이름 0 — import 를 빠뜨리면 번들은 되지만 그 줄이 돌 때 터진다. 브라우저·JS 내장 이름만 허용.
   2) 순환 0 · 엔진(src/engine)은 게임(src/legacy)을 import 하지 않는다 · 게임 모듈끼리는 main.js 의 import 순서가 층 순서
      (앞 모듈은 뒤 모듈을 모른다 — 위층 객체는 ctx.js 로 늦게 묶는다).
   3) window.<모듈 이름> 읽기 0 — 디버그 창구(main.js)는 사람·도구용이다. 게임 코드는 import 할 것.
   4) ctx 계약 — 아래층이 G·UI·Factory 의 무엇을 쓰는지 tests/baseline/ctx.json 과 대조한다. 새로 쓰면 실패:
      일부러 넓히는 것이면 node tests/modules.mjs --update 로 적고 커밋 메시지에 이유를 남길 것. */
import fs from 'node:fs';
import path from 'node:path';
import globals from 'globals';
import { BASE, UPDATE, readJSON, writeJSON, fail, ok } from './lib.mjs';
import { LEGACY, ENGINE, listModules, readModule, rel } from '../tools/srcmods.mjs';

const ALLOWED = new Set([...Object.keys(globals.browser), ...Object.keys(globals.builtin)]);
const files = listModules();
const mods = new Map(files.map(f => [f, readModule(f)]));
const inEngine = f => f.startsWith(ENGINE + path.sep);
const MAIN = path.join(LEGACY, 'main.js');

/* 게임 층 순서 = main.js 가 부르는 src/legacy 모듈 순서, ctx.js 는 그 아래. */
const LAYER = [path.join(LEGACY, 'ctx.js'), ...mods.get(MAIN).imports.map(i => i.target).filter(t => t.startsWith(LEGACY + path.sep))];
const exported = new Set();
for (const m of mods.values()) m.exports.forEach(n => exported.add(n));

let bad = 0;
const err = (f, line, msg) => { bad++; fail(`${rel(f)}${line ? ':' + line : ''} ${msg}`); };
for (const f of files) if (!inEngine(f) && f !== MAIN && !LAYER.includes(f)) err(f, 0, 'main.js 가 import 하지 않는다(묶이지 않는다)');

const ctxUse = {};
for (const [f, m] of mods) {
  // 1) 선언 안 된 이름 (.ts 는 타입을 벗긴 뒤라 줄 번호가 원문과 다르다 — 줄은 적지 않는다)
  for (const r of m.sm.globalScope.through) {
    if (!ALLOWED.has(r.identifier.name)) err(f, f.endsWith('.ts') ? 0 : r.identifier.loc.start.line, `선언 안 된 이름 '${r.identifier.name}' — import 를 빠뜨렸다`);
  }
  // 2) 경계
  for (const { target, spec, line } of m.imports) {
    if (!mods.has(target)) { err(f, line, `모르는 모듈 '${spec}'`); continue; }
    if (inEngine(f) && !inEngine(target)) err(f, line, `엔진이 게임을 import 한다 → ${rel(target)} (엔진은 게임을 모른다 — 설정·훅으로 받을 것)`);
    if (!inEngine(f) && !inEngine(target) && f !== MAIN) {
      const at = LAYER.indexOf(target), me = LAYER.indexOf(f);
      if (at >= me) err(f, line, `거꾸로 가는 import → ${rel(target)} (위층은 ctx.js 로 늦게 묶을 것)`);
    }
  }
  // 3) window.<모듈 이름>
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window'
        && exported.has(n.property.name)) err(f, n.loc.start.line, `window.${n.property.name} — 디버그 창구를 읽지 말고 import 할 것`);
    for (const k in n) {
      if (k === 'loc' || k === 'parent') continue;
      const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
    }
  })(m.ast);
  // 4) ctx 계약 — import { app as G } 로 받은 이름에서 무엇을 꺼내 쓰는가
  const ctxImp = m.ast.body.find(n => n.type === 'ImportDeclaration' && /(^|\/)ctx\.js$/.test(n.source.value));
  if (!ctxImp) continue;
  const scope = m.sm.globalScope.childScopes[0];
  for (const s of ctxImp.specifiers) {
    if (s.imported.name.startsWith('bind')) continue;
    const v = scope.variables.find(x => x.name === s.local.name);
    const used = new Set();
    for (const ref of v.references) {
      const id = ref.identifier, p = id.parent;
      used.add(p && p.type === 'MemberExpression' && p.object === id && !p.computed ? p.property.name : '(값 그대로)');
    }
    /* 나눈 조각(ui/*.js)은 부모 모듈(ui.js) 이름으로 합쳐 센다 — 쪼개도 계약은 그대로여야 한다 */
    const key = path.relative(LEGACY, f).split(path.sep).length > 1 ? path.relative(LEGACY, f).split(path.sep)[0] + '.js' : path.basename(f);
    const slot = ((ctxUse[key] ||= {})[s.local.name] ||= []);
    for (const u of used) if (!slot.includes(u)) slot.push(u);
    slot.sort();
  }
}

/* 순환 — 깊이 우선으로 돌며 돌아오는 간선을 찾는다(게임 쪽은 층 규칙이 막지만 엔진 안쪽은 층이 없어 따로 본다). */
const state = new Map(), stack = [];
function dfs(f) {
  state.set(f, 1); stack.push(f);
  for (const { target } of mods.get(f).imports) {
    if (!mods.has(target)) continue;
    if (state.get(target) === 1) { bad++; fail('순환: ' + [...stack.slice(stack.indexOf(target)), target].map(rel).join(' → ')); }
    else if (!state.get(target)) dfs(target);
  }
  stack.pop(); state.set(f, 2);
}
for (const f of files) if (!state.get(f)) dfs(f);

const CTX = path.join(BASE, 'ctx.json');
if (UPDATE || !fs.existsSync(CTX)) { writeJSON(CTX, ctxUse); ok('ctx 계약을 적었다 (tests/baseline/ctx.json)'); }
else {
  const base = readJSON(CTX);
  for (const f in ctxUse) for (const name in ctxUse[f]) {
    const was = new Set((base[f] || {})[name] || []);
    const added = ctxUse[f][name].filter(x => !was.has(x));
    if (added.length) { bad++; fail(`${f}: ${name}.${added.join(` · ${name}.`)} 를 새로 쓴다 — ctx 계약이 넓어진다(일부러면 --update)`); }
  }
}
const n = Object.values(ctxUse).reduce((a, o) => a + Object.values(o).reduce((b, l) => b + l.length, 0), 0);
const ne = files.filter(inEngine).length;
if (!bad) ok(`모듈 ${files.length}개(엔진 ${ne}) — 선언 안 된 이름 0 · 순환 0 · 역방향·엔진→게임 0 · window 창구 읽기 0 · ctx 계약 ${n}칸 그대로`);
