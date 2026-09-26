/* tools/split.mjs — 큰 객체 리터럴 · 클래스 몸통을 절 경계에서 잘라 조각 모듈로 옮긴다(글자 그대로)
     node tools/split.mjs <spec.json>
   spec: { file, name, kind: 'object' | 'class', groups: [{ marker, file, part, title }] }
   절(속성·메서드)의 앞 주석에 marker 가 든 곳에서 조각이 시작해 다음 조각 앞까지 간다. 첫 조각 앞은 원래 자리에 남는다.
   조각 모듈은 export const <part> = { … }; 다음 줄에서 mixin(<name 또는 name.prototype>, <part>) 로 붙는다.
   ★ 쓰기 전에 확인한다 — 남은 몸통 + 조각들을 이어 붙이면 원래 몸통과 글자가 같아야 한다. import 줄은 tools/imports.mjs 로 다시 짠다. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { ROOT, LEGACY } from './srcmods.mjs';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const file = path.join(LEGACY, spec.file);
const src = fs.readFileSync(file, 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
let body = null;
for (const n of ast.body) {
  const d = n.type === 'ExportNamedDeclaration' ? n.declaration : n;
  if (!d) continue;
  if (spec.kind === 'class' && d.type === 'ClassDeclaration' && d.id.name === spec.name) body = d.body;
  if (spec.kind === 'object' && d.type === 'VariableDeclaration') for (const v of d.declarations) if (v.id.name === spec.name) body = v.init;
}
if (!body) throw new Error('찾지 못했다: ' + spec.name);
const items = spec.kind === 'class' ? body.body : body.properties;
/* 절 하나의 글 = 앞 절의 끝 다음 줄부터 이 절의 끝 줄까지(쉼표 포함) */
const lineAfter = i => src.indexOf('\n', i) + 1;
const starts = items.map((it, i) => i === 0 ? lineAfter(body.start) : lineAfter(items[i - 1].end));
const closeAt = lineAfter(items[items.length - 1].end);
if (spec.kind === 'class' && items.some(m => /\bsuper\b/.test(src.slice(m.start, m.end)))) console.log('※ super 를 쓰는 메서드는 조각으로 옮기면 안 된다 — 그런 절은 원래 자리에 남길 것');
const firstAt = spec.groups.map(g => {
  const i = items.findIndex((it, k) => src.slice(starts[k], it.start).includes(g.marker));
  if (i < 0) throw new Error('표시를 못 찾았다: ' + g.marker);
  return i;
});
for (let k = 1; k < firstAt.length; k++) if (firstAt[k] <= firstAt[k - 1]) throw new Error('조각 순서가 소스 순서와 다르다: ' + spec.groups[k].marker);
const bounds = firstAt.map((i, k) => [starts[i], k + 1 < firstAt.length ? starts[firstAt[k + 1]] : closeAt]);
const core = src.slice(0, bounds[0][0]) + src.slice(closeAt);
/* 클래스 몸통에는 쉼표가 없다 — 객체 리터럴로 옮길 때 메서드마다 끝에 쉼표를 단다(그 밖의 글은 그대로) */
function classPart(k) {
  const [a, b] = bounds[k];
  let out = '', at = a;
  for (const m of items) if (m.start >= a && m.end <= b) { out += src.slice(at, m.end) + ','; at = m.end; }
  return out + src.slice(at, b);
}
const parts = bounds.map(([a, b]) => src.slice(a, b));
/* 확인 — 이어 붙이면 원래 글 */
if (src.slice(0, bounds[0][0]) + parts.join('') + src.slice(closeAt) !== src) throw new Error('이어 붙인 글이 원래와 다르다');
for (const [k, g] of spec.groups.entries()) {
  if (spec.kind === 'class' && /\bsuper\b/.test(parts[k])) throw new Error(g.part + ': super 를 쓰는 메서드가 들어 있다');
  const target = spec.kind === 'class' ? spec.name + '.prototype' : spec.name;
  const text = `/* ===== ${g.file} — ${g.title} ===== */\n` +
    `/* ${spec.file} 의 ${spec.name} 에서 나눈 조각 — 읽히는 순간 ${target} 에 붙는다(main.js 가 ${spec.file} 다음에 읽는다). */\n\n` +
    `export const ${g.part} = {\n${spec.kind === 'class' ? classPart(k) : parts[k]}};\n` +
    `mixin(${target}, ${g.part}${spec.kind === 'class' ? ', true' : ''});\n`;
  const out = path.join(LEGACY, g.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  console.log(`✓ ${g.file}: ${text.split('\n').length}줄 (${g.part})`);
}
fs.writeFileSync(file, core);
acorn.parse(core, { ecmaVersion: 'latest', sourceType: 'module' });
console.log(`✓ ${spec.file}: ${core.split('\n').length}줄 남음`);
