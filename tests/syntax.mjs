/* 문법 — 소스 src/game 의 .ts 는 esbuild 로 옮겨 보고, 번들 · 매니페스트는 node --check 로 훑은 뒤 번들이 소스와 같은지 본다. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';
import { ROOT, GAME, fail, ok } from './lib.mjs';

const SRC = path.join(ROOT, 'src', 'game');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []);
const srcs = walk(SRC);
const outs = [path.join(GAME, 'js', 'ashfall.js'), path.join(GAME, 'assets', 'sprites-manifest.js')];
let bad = 0;
for (const f of srcs) {
  try { transformSync(fs.readFileSync(f, 'utf8'), { loader: 'ts', format: 'esm', sourcefile: f }); }
  catch (e) { bad++; fail(path.relative(ROOT, f) + '\n' + e.message); }
}
for (const f of outs) {
  if (!fs.existsSync(f)) continue;
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; fail(path.relative(ROOT, f) + '\n' + e.stderr.toString()); }
}
if (!bad) ok(`문법 ${srcs.length + outs.length}개 파일 통과`);
try { execFileSync(process.execPath, [path.join(ROOT, 'tools', 'bundle.mjs'), '--check'], { stdio: 'inherit' }); }
catch (e) { fail('번들이 소스와 다르다'); }
