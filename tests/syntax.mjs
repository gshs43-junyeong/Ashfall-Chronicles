/* 문법 — 소스 src/legacy/*.js · 번들 game/js/ashfall.js · 매니페스트를 node --check 로 훑고, 번들이 소스와 같은지 본다. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, GAME, fail, ok } from './lib.mjs';

const SRC = path.join(ROOT, 'src', 'legacy');
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).map(f => path.join(SRC, f));
files.push(path.join(GAME, 'js', 'ashfall.js'), path.join(GAME, 'assets', 'sprites-manifest.js'));
let bad = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; fail(path.relative(ROOT, f) + '\n' + e.stderr.toString()); }
}
if (!bad) ok(`문법 ${files.length}개 파일 통과`);
try { execFileSync(process.execPath, [path.join(ROOT, 'tools', 'bundle.mjs'), '--check'], { stdio: 'inherit' }); }
catch (e) { fail('번들이 소스와 다르다'); }
