/* 모듈 경계 — 엔진화 계획 §6-4. 소스를 읽기만 한다(브라우저 없음).
   1) 선언 안 된 이름 0 — import 를 빠뜨리면 번들은 되지만 그 줄이 돌 때 터진다. 브라우저·JS 내장 이름만 허용.
   2) 순환 0 · 거꾸로 가는 import 0 — main.js 의 import 순서가 층 순서다. 앞 모듈은 뒤 모듈을 모른다(ctx.js 는 맨 아래).
   3) window.<모듈 이름> 읽기 0 — 디버그 창구(main.js)는 사람·도구용이다. 게임 코드는 import 할 것.
   4) ctx 계약 — 아래층이 G·UI·Factory 의 무엇을 쓰는지 tests/baseline/ctx.json 과 대조한다. 새로 쓰면 실패:
      일부러 넓히는 것이면 node tests/modules.mjs --update 로 적고 커밋 메시지에 이유를 남길 것. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';
import globals from 'globals';
import { ROOT, BASE, UPDATE, readJSON, writeJSON, fail, ok } from './lib.mjs';

const SRC = path.join(ROOT, 'src', 'legacy');
const ALLOWED = new Set([...Object.keys(globals.browser), ...Object.keys(globals.builtin)]);
/* escope 는 parent 를 달지 않는다 — ctx 계약(4)에서 쓰려고 단다. */
function setParents(n, p) {
  if (!n || typeof n.type !== 'string') return;
  n.parent = p;
  for (const k in n) { if (k === 'parent' || k === 'loc') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(x => setParents(x, n)); else if (v && typeof v === 'object') setParents(v, n); }
}
const parse = f => {
  const code = fs.readFileSync(path.join(SRC, f), 'utf8');
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ranges: true, locations: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  setParents(ast, null);
  return { ast, sm };
};
const importsOf = ast => ast.body.filter(n => n.type === 'ImportDeclaration').map(n => ({ from: n.source.value.replace(/^\.\//, ''), node: n }));

/* 층 순서 = main.js 의 import 순서. ctx.js 는 그 아래. */
const { ast: mainAst } = parse('main.js');
const LAYER = ['ctx.js', ...importsOf(mainAst).map(i => i.from)];
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js'));
for (const f of files) if (f !== 'main.js' && !LAYER.includes(f)) fail(`${f}: main.js 가 import 하지 않는다(묶이지 않는다)`);

const mods = {}, exported = new Set();
for (const f of LAYER) {
  mods[f] = parse(f);
  for (const n of mods[f].ast.body) if (n.type === 'ExportNamedDeclaration' && n.declaration) {
    const d = n.declaration;
    (d.declarations ? d.declarations.map(x => x.id.name) : [d.id.name]).forEach(x => exported.add(x));
  }
}

let bad = 0;
const ctxUse = {};
for (const f of LAYER) {
  const { ast, sm } = mods[f];
  // 1) 선언 안 된 이름
  const free = sm.globalScope.through.filter(r => !ALLOWED.has(r.identifier.name));
  for (const r of free) { bad++; fail(`${f}:${r.identifier.loc.start.line} 선언 안 된 이름 '${r.identifier.name}' — import 를 빠뜨렸다`); }
  // 2) 층 순서
  const me = LAYER.indexOf(f);
  for (const { from, node } of importsOf(ast)) {
    const at = LAYER.indexOf(from);
    if (at < 0) { bad++; fail(`${f}:${node.loc.start.line} 모르는 모듈 '${from}'`); }
    else if (at >= me) { bad++; fail(`${f}:${node.loc.start.line} 거꾸로 가는 import → ${from} (위층은 ctx.js 로 늦게 묶을 것)`); }
  }
  // 3) window.<모듈 이름>
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window'
        && exported.has(n.property.name)) { bad++; fail(`${f}:${n.loc.start.line} window.${n.property.name} — 디버그 창구를 읽지 말고 import 할 것`); }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && k !== 'loc' && k !== 'parent') walk(v); }
  })(ast);
  // 4) ctx 계약 — import { app as G } 로 받은 이름에서 무엇을 꺼내 쓰는가
  const ctxImp = ast.body.find(n => n.type === 'ImportDeclaration' && n.source.value === './ctx.js');
  if (!ctxImp) continue;
  const mod = sm.globalScope.childScopes[0];
  for (const s of ctxImp.specifiers) {
    if (s.imported.name.startsWith('bind')) continue;
    const v = mod.variables.find(x => x.name === s.local.name);
    const used = new Set();
    for (const ref of v.references) {
      const id = ref.identifier, p = id.parent;
      used.add(p && p.type === 'MemberExpression' && p.object === id && !p.computed ? p.property.name : '(값 그대로)');
    }
    ((ctxUse[f] ||= {})[s.local.name] = [...used].sort());
  }
}


const CTX = path.join(BASE, 'ctx.json');
if (UPDATE || !fs.existsSync(CTX)) { writeJSON(CTX, ctxUse); ok('ctx 계약을 적었다 (tests/baseline/ctx.json)'); }
else {
  const base = readJSON(CTX);
  for (const f in ctxUse) for (const name in ctxUse[f]) {
    const was = new Set((base[f] || {})[name] || []);
    const added = ctxUse[f][name].filter(m => !was.has(m));
    if (added.length) { bad++; fail(`${f}: ${name}.${added.join(` · ${name}.`)} 를 새로 쓴다 — ctx 계약이 넓어진다(일부러면 --update)`); }
  }
}
const n = Object.values(ctxUse).reduce((a, o) => a + Object.values(o).reduce((b, l) => b + l.length, 0), 0);
if (!bad) ok(`모듈 ${LAYER.length}개 — 선언 안 된 이름 0 · 순환·역방향 0 · window 창구 읽기 0 · ctx 계약 ${n}칸 그대로`);
