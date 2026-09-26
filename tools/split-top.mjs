/* tools/split-top.mjs — 최상위 문장(표 선언 · 그 뒤 손질 문장)을 연속 구간째 다른 모듈로 옮긴다(글자 그대로)
     node tools/split-top.mjs <spec.json> [--dry]
   spec: { file, groups: [{ from: '<이 이름을 선언하는 문장부터>', file, title }] }
   구간은 from 을 선언한 문장(그 앞 주석 포함)부터 다음 구간 앞까지. 첫 구간 앞은 원래 파일에 남는다.
   옮긴 모듈은 원래 파일 다음 층에서 차례로 읽힌다(main.js) — 원래 소스 순서 그대로 돌므로 최상위 계산 순서가 같다.
   ★ 앞 구간의 함수가 뒤 구간 이름을 부르면 거꾸로 가는 import 가 된다 — tools/imports.mjs 가 알린다. 그때는 구간을 합치거나 바꿀 것. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { LEGACY } from './srcmods.mjs';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const DRY = process.argv.includes('--dry');
const file = path.join(LEGACY, spec.file);
const src = fs.readFileSync(file, 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
const body = ast.body;
const declares = (n, name) => {
  const d = n.type === 'ExportNamedDeclaration' ? n.declaration : n;
  if (!d) return false;
  if (d.type === 'VariableDeclaration') return d.declarations.some(x => x.id.name === name);
  return (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id.name === name;
};
const lineStart = i => src.lastIndexOf('\n', i - 1) + 1;
/* 문장 i 의 시작 = 앞 문장 끝 다음 줄(그 사이 주석은 이 문장 것) */
const startOf = i => i === 0 ? 0 : src.indexOf('\n', body[i - 1].end) + 1;
const at = spec.groups.map(g => {
  const i = body.findIndex(n => declares(n, g.from));
  if (i < 0) throw new Error('선언을 못 찾았다: ' + g.from);
  return i;
});
for (let k = 1; k < at.length; k++) if (at[k] <= at[k - 1]) throw new Error('순서가 소스와 다르다: ' + spec.groups[k].from);
const cuts = at.map(startOf);
const pieces = cuts.map((c, k) => src.slice(c, k + 1 < cuts.length ? cuts[k + 1] : src.length));
const core = src.slice(0, cuts[0]);
if (core + pieces.join('') !== src) throw new Error('이어 붙인 글이 원래와 다르다');
for (const [k, g] of spec.groups.entries()) {
  const text = `/* ===== ${g.file} — ${g.title} ===== */\n/* ${spec.file} 에서 나눈 표 — ${spec.file} 다음 층에서 소스 순서대로 읽힌다 */\n\n` + pieces[k].replace(/^\n+/, '');
  acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  const lines = text.split('\n').length;
  console.log(`${lines > 2000 ? '✗' : '✓'} ${g.file}: ${lines}줄`);
  if (!DRY) { const out = path.join(LEGACY, g.file); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, text); }
}
console.log(`✓ ${spec.file}: ${core.split('\n').length}줄 남음`);
if (!DRY) fs.writeFileSync(file, core.replace(/\n+$/, '\n'));
