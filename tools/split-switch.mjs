/* tools/split-switch.mjs — 거대한 switch 한 개로 된 메서드를 "갈래마다 함수"인 표로 바꿔 파일 여럿으로 나눈다
     node tools/split-switch.mjs <spec.json>
   spec: { file, object, method, table, groups: [{ from: '<첫 갈래 값>', file, part, title }] }
   - 메서드 몸통의 맨 위 switch 하나를 찾는다. 그 앞 문장(도우미 선언)은 const·function 이어야 한다(값을 넘겨주므로).
   - 갈래 몸통은 글자 그대로 옮기고, 그 갈래를 끝내는 break(안쪽 반복·switch 의 것이 아닌 것)만 return 으로 바꾼다.
   - 다음 갈래로 흘러내리거나(끝이 break·return·throw 가 아닌 갈래) 몸통에 메서드를 끝내는 return 이 있으면 멈춘다
     — 함수로 떼면 뜻이 바뀐다.
   - 조각 파일은 table 에 제 갈래들을 붙인다(Object.assign). 메서드는 table[값] 을 this 로 불러 H(도우미 묶음)를 넘긴다.
   ★ 조각 갈래 사이에 const 를 나눠 쓰던 것(앞 갈래에서 선언해 뒤 갈래가 쓰는 것)은 tests/modules 의 '선언 안 된 이름'이 잡는다. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { LEGACY, stripTypes } from './srcmods.mjs';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const file = path.join(LEGACY, spec.file);
const src = fs.readFileSync(file, 'utf8');
const ast = acorn.parse(stripTypes(src), { ecmaVersion: 'latest', sourceType: 'module', locations: true });
let obj = null;
for (const n of ast.body) { const d = n.type === 'ExportNamedDeclaration' ? n.declaration : n; if (d && d.type === 'VariableDeclaration') for (const v of d.declarations) if (v.id.name === spec.object) obj = v.init; }
const prop = obj.properties.find(p => p.key && p.key.name === spec.method);
const fn = prop.value, stmts = fn.body.body;
const si = stmts.findIndex(s => s.type === 'SwitchStatement');
const sw = stmts[si];
const params = fn.params.map(p => p.name);
const prelude = stmts.slice(0, si);
const names = [...params];
for (const s of prelude) {
  if (s.type === 'VariableDeclaration') { if (s.kind !== 'const') throw new Error('도우미가 const 가 아니다: ' + src.slice(s.start, s.start + 60)); s.declarations.forEach(d => names.push(d.id.name)); }
  else if (s.type === 'FunctionDeclaration') names.push(s.id.name);
  else if (s.type !== 'EmptyStatement') throw new Error('switch 앞에 선언 아닌 문장: ' + src.slice(s.start, s.start + 60));
}
const after = stmts.slice(si + 1);

/* 갈래 묶기 — 몸통이 빈 갈래는 다음 갈래와 같은 함수 */
const cases = [];
let labels = [], first = null;
for (const c of sw.cases) {
  labels.push(c.test ? src.slice(c.test.start, c.test.end) : 'default');
  if (!c.consequent.length) { first = first || c; continue; }
  cases.push({ labels, node: c, first: first || c }); labels = []; first = null;
}
if (labels.length) throw new Error('끝 갈래가 비었다');

/* 갈래를 끝내는 break · 메서드를 끝내는 return 찾기 */
function scan(n, depthLoop, inFn, out) {
  if (!n || typeof n.type !== 'string') return;
  if (/Function/.test(n.type)) inFn = true;
  if (!inFn && n.type === 'BreakStatement' && !n.label && depthLoop === 0) out.breaks.push(n);
  if (!inFn && n.type === 'ReturnStatement') out.returns.push(n);
  const loopish = /^(For|ForIn|ForOf|While|DoWhile)Statement$|^SwitchStatement$/.test(n.type);
  for (const k in n) {
    if (k === 'loc' || k === 'start' || k === 'end') continue;
    const v = n[k];
    if (Array.isArray(v)) v.forEach(x => scan(x, depthLoop + (loopish ? 1 : 0), inFn, out));
    else if (v && typeof v === 'object' && v.type) scan(v, depthLoop + (loopish ? 1 : 0), inFn, out);
  }
}
const terminal = s => ['BreakStatement', 'ReturnStatement', 'ThrowStatement'].includes(s.type) ||
  (s.type === 'BlockStatement' && s.body.length && terminal(s.body[s.body.length - 1]));
for (const [i, c] of cases.entries()) {
  const cons = c.node.consequent, last = cons[cons.length - 1];
  const out = { breaks: [], returns: [] };
  cons.forEach(s => scan(s, 0, false, out));
  if (out.returns.length) throw new Error(`갈래 ${c.labels} 에 return 이 있다 — 떼면 뒤 문장이 돈다`);
  if (i < cases.length - 1 && !terminal(last)) throw new Error(`갈래 ${c.labels} 가 다음 갈래로 흘러내린다`);
  c.breaks = out.breaks;
  /* 몸통 = 마지막 이름표의 ':' 다음부터 마지막 문장 끝까지(갈래 안 주석 포함) */
  const tst = c.node.test;
  const a = src.indexOf(':', tst ? tst.end : c.node.start + 'default'.length) + 1, b = last.end;
  /* 마지막 문장 뒤 ~ 다음 갈래 앞의 주석은 다음 갈래 것이다 */
  const nextStart = i + 1 < cases.length ? cases[i + 1].first.start : sw.end - 1;
  c.trail = src.slice(b, nextStart).replace(/^[ \t]*\n?/, '').replace(/\s+$/, '');
  let body = src.slice(a, b);
  for (const br of [...c.breaks].sort((x, y) => y.start - x.start)) body = body.slice(0, br.start - a) + 'return;' + body.slice(br.end - a);
  c.body = body;
}

/* 조각 나누기 */
const startAt = spec.groups.map(g => cases.findIndex(c => c.labels.includes(g.from)));
if (startAt.some(i => i < 0)) throw new Error('갈래를 못 찾았다: ' + spec.groups.filter((g, k) => startAt[k] < 0).map(g => g.from));
const H = `{ ${names.join(', ')} }`;
const key = l => /^'[^']*'$/.test(l) && /^[A-Za-z_$][\w$]*$/.test(l.slice(1, -1)) ? l.slice(1, -1) : l === 'default' ? 'default' : `[${l}]`;
for (const [k, g] of spec.groups.entries()) {
  const to = k + 1 < startAt.length ? startAt[k + 1] : cases.length;
  let text = `/* ===== ${g.file} — ${g.title} ===== */\n` +
    `/* ${spec.file} ${spec.object}.${spec.method} 의 갈래들 — 읽히는 순간 ${spec.table} 에 붙는다. H 는 ${spec.method} 의 인자·도우미 묶음, this 는 ${spec.object}. */\n\n` +
    `export const ${g.part} = {\n`;
  const alias = [];
  let carry = startAt[k] > 0 ? cases[startAt[k] - 1].trail : '';
  for (const c of cases.slice(startAt[k], to)) {
    const main = c.labels[c.labels.length - 1];
    for (const l of c.labels.slice(0, -1)) alias.push(`${g.part}${key(l).startsWith('[') ? key(l) : '.' + key(l)} = ${g.part}${key(main).startsWith('[') ? key(main) : '.' + key(main)};`);
    text += (carry ? carry.replace(/^\s*/, '  ') + '\n' : '') + `  ${key(main)}(H) {\n    const ${H} = H;\n    {${c.body}\n    }\n  },\n`;
    carry = c.trail;
  }
  if (to === cases.length && carry) text += carry.replace(/^\s*/, '  ') + '\n';
  if (alias.length) text += `};\n${alias.join('\n')}\nObject.assign(${spec.table}, ${g.part});\n`;
  else text += `};\nObject.assign(${spec.table}, ${g.part});\n`;
  const out = path.join(LEGACY, g.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  acorn.parse(stripTypes(text), { ecmaVersion: 'latest', sourceType: 'module' });
  console.log(`✓ ${g.file}: 갈래 ${to - startAt[k]}개 · ${text.split('\n').length}줄`);
}
/* 메서드 몸통: switch 자리에 표 부르기 */
const callText = `const paint = ${spec.table}[${src.slice(sw.discriminant.start, sw.discriminant.end)}]${sw.cases.some(c => !c.test) ? ` || ${spec.table}.default` : ''};\n    if (paint) paint.call(this, ${H});`;
const core = src.slice(0, sw.start) + callText + src.slice(sw.end);
fs.writeFileSync(file, core);
acorn.parse(stripTypes(core), { ecmaVersion: 'latest', sourceType: 'module' });
console.log(`✓ ${spec.file}: ${core.split('\n').length}줄 남음 · 갈래 ${cases.length}개(이름 ${sw.cases.length}개) · 넘기는 이름 ${names.length}개 · 뒤 문장 ${after.length}개`);
