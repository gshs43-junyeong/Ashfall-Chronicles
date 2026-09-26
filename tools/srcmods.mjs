/* src/ 의 모듈(엔진 .ts·.js + 게임 src/legacy/*.js)을 읽어 export · import · 풀이 안 된 이름을 잰다.
   tests/modules.mjs(경계 검사)와 tools/imports.mjs(import 줄 다시 짜기)가 같이 쓴다.
   ★ .ts 는 esbuild 로 타입만 벗겨 읽는다 — 타입 전용 import 는 거기서 사라지므로 그래프는 원문에서 따로 뽑는다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';
import * as esbuild from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'src');
export const LEGACY = path.join(SRC, 'legacy');
export const ENGINE = path.join(SRC, 'engine');
export const rel = f => path.relative(SRC, f).split(path.sep).join('/');

export function listModules() {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|ts)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
    }
  })(SRC);
  return out.sort();
}

/* escope 는 parent 를 달지 않는다 — 멤버 접근(G.x)을 보려고 단다. */
function setParents(n, p) {
  if (!n || typeof n.type !== 'string') return;
  n.parent = p;
  for (const k in n) {
    if (k === 'parent' || k === 'loc') continue;
    const v = n[k];
    if (Array.isArray(v)) v.forEach(x => setParents(x, n)); else if (v && typeof v === 'object') setParents(v, n);
  }
}

/** 파일 하나 — { file, src, js, ast, sm, exports:Set, imports:[{spec, target, line}] } */
export function readModule(file) {
  const src = fs.readFileSync(file, 'utf8');
  const js = file.endsWith('.ts')
    ? esbuild.transformSync(src, { loader: 'ts', format: 'esm', target: 'esnext', sourcemap: false }).code
    : src;
  const ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module', ranges: true, locations: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  setParents(ast, null);
  const exports = new Set();
  for (const n of ast.body) {
    if (n.type !== 'ExportNamedDeclaration') continue;
    if (n.declaration) {
      const d = n.declaration;
      (d.declarations ? d.declarations.map(x => x.id.name) : [d.id.name]).forEach(x => exports.add(x));
    }
    for (const s of n.specifiers || []) exports.add(s.exported.name);
  }
  /* 그래프는 원문에서 — 타입만 쓰는 import 도 층을 넘으면 안 된다. */
  const imports = [];
  const re = /^[ \t]*(?:import|export)\b[^;'"]*?(?:from\s*)?['"](\.{1,2}\/[^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split('\n').length;
    imports.push({ spec: m[1], target: resolveSpec(file, m[1]), line });
  }
  return { file, src, js, ast, sm, exports, imports };
}

/** './x.js' → 실제 파일(.ts 가 있으면 그것) */
export function resolveSpec(from, spec) {
  const p = path.resolve(path.dirname(from), spec);
  if (fs.existsSync(p)) return p;
  const ts = p.replace(/\.js$/, '.ts');
  if (fs.existsSync(ts)) return ts;
  return p;
}

/** a 에서 b 를 부를 때 쓰는 import 경로 — './x.js' · '../engine/core/math.js' */
export function specFor(from, to) {
  let r = path.relative(path.dirname(from), to).split(path.sep).join('/').replace(/\.ts$/, '.js');
  return r.startsWith('.') ? r : './' + r;
}
