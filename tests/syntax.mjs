/* 문법 — game/js/*.js 와 assets/sprites.js 를 node --check 로 훑는다(CLAUDE.md §5-2). */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GAME, fail, ok } from './lib.mjs';

const files = fs.readdirSync(path.join(GAME, 'js')).filter(f => f.endsWith('.js')).map(f => path.join(GAME, 'js', f));
files.push(path.join(GAME, 'assets', 'sprites.js'), path.join(GAME, 'assets', 'sprites-manifest.js'));
let bad = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; fail(path.relative(GAME, f) + '\n' + e.stderr.toString()); }
}
if (!bad) ok(`문법 ${files.length}개 파일 통과`);
