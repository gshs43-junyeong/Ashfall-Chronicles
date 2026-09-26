#!/usr/bin/env node
/* src/legacy/*.js 의 import 줄을 소스에서 다시 짠다 — 코드를 다른 모듈(엔진 포함)로 옮긴 뒤 한 번 돌린다.
   파일마다 풀이 안 된 이름을 모아, 그 이름을 export 하는 모듈에서 가져오게 적는다(ctx.js 줄은 손대지 않는다).
   ★ 위층(main.js 순서에서 뒤) 모듈의 이름이 필요하면 멈춘다 — ctx.js 로 늦게 묶을 일이다.
   사용: node tools/imports.mjs            다시 짜기
         node tools/imports.mjs --check    바뀔 파일이 있으면 1 */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';
import globals from 'globals';
import { LEGACY, ENGINE, listModules, readModule, specFor, rel } from './srcmods.mjs';

const ALLOWED = new Set([...Object.keys(globals.browser), ...Object.keys(globals.builtin)]);
const CHECK = process.argv.includes('--check');
const files = listModules();
const mods = new Map(files.map(f => [f, readModule(f)]));
const MAIN = path.join(LEGACY, 'main.js'), CTX = path.join(LEGACY, 'ctx.js');
const LAYER = [CTX, ...mods.get(MAIN).imports.map(i => i.target).filter(t => t.startsWith(LEGACY + path.sep))];
const inEngine = f => f.startsWith(ENGINE + path.sep);

const owner = new Map();
for (const [f, m] of mods) {
  if (f === MAIN) continue;
  for (const n of m.exports) {
    if (owner.has(n) && owner.get(n) !== f) { console.error(`✗ '${n}' 를 두 모듈이 export 한다: ${rel(owner.get(n))} · ${rel(f)}`); process.exit(1); }
    owner.set(n, f);
  }
}
/* 엔진 먼저(경로 순), 그다음 게임 층 순서 */
const rank = f => inEngine(f) ? files.indexOf(f) - 1e6 : LAYER.indexOf(f);

let changed = 0, bad = 0;
for (const f of LAYER) {
  if (f === CTX) continue;
  const src = fs.readFileSync(f, 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
  const imps = ast.body.filter(n => n.type === 'ImportDeclaration');
  const keep = imps.filter(n => n.source.value === './ctx.js').map(n => src.slice(n.start, n.end));
  // import 를 다 걷어 낸 몸통(ctx 줄은 남겨 둬야 G·UI 가 풀린다)
  let body = src, insertAt = null;
  for (const n of [...imps].reverse()) {
    const end = src[n.end] === '\n' ? n.end + 1 : n.end;
    body = body.slice(0, n.start) + body.slice(end);
    insertAt = n.start;
  }
  if (insertAt === null) insertAt = src.indexOf('\n', src.indexOf('*/')) + 1;   // 첫 주석(파일 머리) 다음 줄
  const probe = body.slice(0, insertAt) + keep.map(k => k + '\n').join('') + body.slice(insertAt);
  const past = acorn.parse(probe, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
  const sm = escope.analyze(past, { ecmaVersion: 2022, sourceType: 'module' });
  const need = new Map();   // 모듈 → Set(이름)
  for (const r of sm.globalScope.through) {
    const n = r.identifier.name;
    if (ALLOWED.has(n) && !owner.has(n)) continue;
    const o = owner.get(n);
    if (!o) { bad++; console.error(`✗ ${rel(f)}: '${n}' 를 export 하는 모듈이 없다`); continue; }
    if (!inEngine(o) && LAYER.indexOf(o) >= LAYER.indexOf(f)) { bad++; console.error(`✗ ${rel(f)}: '${n}' 는 위층 ${rel(o)} 것 — ctx.js 로 늦게 묶을 것`); continue; }
    (need.get(o) || need.set(o, new Set()).get(o)).add(n);
  }
  const lines = [...keep];
  for (const o of [...need.keys()].sort((a, b) => rank(a) - rank(b))) {
    const names = [...need.get(o)].sort((a, b) => a < b ? -1 : 1);
    let line = 'import { ', out = [];
    for (const n of names) {
      if ((line + n).length > 116) { out.push(line.replace(/ $/, '')); line = '  '; }
      line += n + ', ';
    }
    out.push(line.replace(/, $/, ` } from '${specFor(f, o)}';`));
    lines.push(out.join('\n'));
  }
  const next = body.slice(0, insertAt) + (lines.length ? lines.join('\n') + '\n' : '') + body.slice(insertAt);
  if (next !== src) {
    changed++;
    if (CHECK) console.error(`✗ ${rel(f)}: import 줄이 소스와 다르다`);
    else fs.writeFileSync(f, next);
  }
}
if (bad) process.exit(1);
if (CHECK && changed) { console.error('node tools/imports.mjs 로 다시 짤 것'); process.exit(1); }
console.log(CHECK ? '✓ import 줄이 소스와 맞다' : `✓ import 줄 — ${changed}개 파일을 다시 짰다`);
