/* tools/regroup.mjs — 조각 모듈(mixin 으로 붙는 객체 리터럴)의 절을 영역별로 다시 묶는다(글자 그대로)
     node tools/regroup.mjs <spec.json> [--dry]
   spec: { obj: 'G', files: { '<game/새파일.ts>': { part: 'MinePart', title: '…', names: ['leftHold', …] }, … } }
   names 에 적힌 절을 지금 있는 조각 모듈에서 찾아(앞 주석째) 그 순서대로 새 모듈에 옮긴다. 손댄 모듈의 절은
   **빠짐없이** 어딘가에 배정돼야 한다(안 그러면 멈춘다). 비게 된 모듈은 지운다.
   ★ 조각 모듈의 최상위에 조각 말고 다른 선언이 있으면 멈춘다(상수 따위는 손으로 옮길 것).
   그다음 main.ts 의 조각 import 를 고치고 node tools/imports.mjs 로 import 줄을 다시 짠다. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { LEGACY, stripTypes } from './srcmods.mjs';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const DRY = process.argv.includes('--dry');
const want = new Map();                     // 절 이름 → 새 파일
for (const [f, g] of Object.entries(spec.files)) for (const n of g.names) {
  if (want.has(n)) throw new Error(`두 번 배정됐다: ${n}`);
  want.set(n, f);
}
const lineAfter = (src, i) => src.indexOf('\n', i) + 1;

/* 조각 모듈을 모두 읽어 절마다 글을 뗀다 */
const dir = path.join(LEGACY, path.dirname(Object.keys(spec.files)[0]));
const found = new Map();                    // 절 이름 → { from, text }
const touched = new Map();                  // 모듈 → 절 이름들
for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.ts'))) {
  const file = path.join(dir, name), rf = path.relative(LEGACY, file).split(path.sep).join('/');
  const src = fs.readFileSync(file, 'utf8');
  const ast = acorn.parse(stripTypes(src), { ecmaVersion: 'latest', sourceType: 'module' });
  let obj = null, others = [];
  for (const n of ast.body) {
    if (n.type === 'ImportDeclaration') continue;
    const d = n.type === 'ExportNamedDeclaration' ? n.declaration : n;
    if (d && d.type === 'VariableDeclaration' && d.declarations.length === 1 && /Part$/.test(d.declarations[0].id.name)
      && d.declarations[0].init.type === 'ObjectExpression') { obj = d.declarations[0].init; continue; }
    if (n.type === 'ExpressionStatement' && /^mixin\(/.test(src.slice(n.start, n.end))) continue;
    others.push(src.slice(n.start, Math.min(n.end, n.start + 60)));
  }
  if (!obj) continue;
  const props = obj.properties;
  const names = props.map(p => p.key.name || p.key.value);
  if (!names.some(n => want.has(n))) continue;
  if (others.length) throw new Error(`${rf}: 조각 말고 다른 최상위 문장이 있다 — ${others.join(' | ')}`);
  const tail = src.slice(lineAfter(src, props[props.length - 1].end), obj.end - 1);
  if (tail.trim()) throw new Error(`${rf}: 마지막 절 뒤에 글이 있다 — ${tail.trim().slice(0, 60)}`);
  props.forEach((p, i) => {
    const a = i === 0 ? lineAfter(src, obj.start) : lineAfter(src, props[i - 1].end);
    let text = src.slice(a, lineAfter(src, p.end));
    /* 마지막 절은 쉼표가 없을 수 있다 — 끝 글자 뒤에 단다 */
    if (!/,\s*(\/\/[^\n]*)?\n$/.test(text) && !/,\s*$/.test(src.slice(p.end, lineAfter(src, p.end)))) {
      const at = p.end - a;
      text = text.slice(0, at) + ',' + text.slice(at);
    }
    found.set(names[i], { from: rf, text });
  });
  touched.set(rf, names);
}
for (const n of want.keys()) if (!found.has(n)) throw new Error(`찾지 못했다: ${n}`);
for (const [rf, names] of touched) for (const n of names) if (!want.has(n)) throw new Error(`${rf} 의 '${n}' 이 어디에도 배정되지 않았다`);

/* 쓰기 */
const outs = new Set(Object.keys(spec.files));
for (const [f, g] of Object.entries(spec.files)) {
  const text = `/* ===== ${f.replace(/\.ts$/, '.js')} — ${g.title} ===== */\n` +
    `/* game.js 의 ${spec.obj} 에서 나눈 조각 — 읽히는 순간 ${spec.obj} 에 붙는다(main.js 가 game.js 다음에 읽는다). */\n\n` +
    `export const ${g.part}: Bag = {\n` + g.names.map(n => found.get(n).text).join('') + `};\n\nmixin(${spec.obj}, ${g.part});\n`;
  acorn.parse(stripTypes(text), { ecmaVersion: 'latest', sourceType: 'module' });
  console.log(`✓ ${f}: ${text.split('\n').length}줄 · 절 ${g.names.length}개`);
  if (!DRY) fs.writeFileSync(path.join(LEGACY, f), text);
}
for (const rf of touched.keys()) if (!outs.has(rf)) { console.log(`✗ ${rf} 지움`); if (!DRY) fs.unlinkSync(path.join(LEGACY, rf)); }
/* 확인 — 옮긴 절의 글을 모두 이어 붙이면 원래 절 글과 같은 글자 수 */
const before = [...found.values()].reduce((s, v) => s + v.text.length, 0);
console.log(`절 ${found.size}개 · ${before}글자 옮김`);
