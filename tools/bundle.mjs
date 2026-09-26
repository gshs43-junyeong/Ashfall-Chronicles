#!/usr/bin/env node
/* src/legacy/main.js 에서 import 를 따라 모듈을 묶어 game/js/ashfall.js (+ .map) 하나로 만든다(esbuild · IIFE).
   ★ 클래식 스크립트 하나로 낸다 — file://(zip)에서는 <script type=module> 이 막힌다.
   ★ 'use strict' 는 맨 앞에 붙인다 — 모듈은 원래 엄격 모드인데 IIFE 로 풀면 그 표시가 없어진다.
   ★ 나무 흔들기(treeShaking)는 끈다 — 쓰는 곳이 안 보여도 최상위 코드는 전부 돌아야 한다(예전 전역 스크립트와 같게).
   사용: node tools/bundle.mjs            만들기
         node tools/bundle.mjs --check    커밋된 번들이 소스와 같은지(다르면 1)
         node tools/bundle.mjs --watch    고칠 때마다 다시 만들기 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'game', 'js', 'ashfall.js');

export const OPTIONS = {
  entryPoints: [path.join(ROOT, 'src', 'legacy', 'main.js')],
  bundle: true, format: 'iife', platform: 'browser', target: 'esnext',
  outfile: OUT, sourcemap: 'linked', sourcesContent: true,
  charset: 'utf8', legalComments: 'none', treeShaking: false,
  banner: { js: "'use strict';\n/* Ashfall Chronicles — 자동 생성물(tools/bundle.mjs · esbuild). 손으로 고치지 말 것 — 원본은 src/legacy/ */" },
  absWorkingDir: ROOT, logLevel: 'warning'
};

/** 묶은 결과를 파일에 쓰지 않고 돌려준다 — { code, map }. */
export async function build() {
  const r = await esbuild.build({ ...OPTIONS, write: false });
  const pick = ext => r.outputFiles.find(f => f.path.endsWith(ext)).text;
  return { code: pick('.js'), map: pick('.js.map') };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = process.argv[2];
  if (arg === '--check') {
    const { code, map } = await build();
    const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === code
      && fs.existsSync(OUT + '.map') && fs.readFileSync(OUT + '.map', 'utf8') === map;
    if (!same) { console.error('✗ game/js/ashfall.js 가 src/legacy/ 와 다르다 — node tools/bundle.mjs 로 다시 만들어 함께 커밋할 것'); process.exit(1); }
    console.log('✓ 번들이 소스와 같다');
  } else if (arg === '--watch') {
    const report = { name: 'report', setup(b) { b.onEnd(r => { if (!r.errors.length) console.log(`↻ ${new Date().toLocaleTimeString()} ashfall.js ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`); }); } };
    const ctx = await esbuild.context({ ...OPTIONS, plugins: [report] });
    await ctx.watch();
    console.log('src/legacy/ 를 지켜본다 (Ctrl+C 로 끝)');
  } else {
    await esbuild.build(OPTIONS);
    console.log(`✓ game/js/ashfall.js ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
  }
}
