#!/usr/bin/env node
/* src/legacy/*.js 를 읽는 순서대로 이어 붙여 game/js/ashfall.js (+ .map) 하나로 만든다.
   ★ 감싸지 않는다(IIFE 아님) — 지금 파일들은 전역 스코프를 나눠 쓴다(const G · World · ITEMS …).
     감싸면 테스트·콘솔·index.html 안쪽 스크립트가 그 이름을 잃는다. 모듈화는 P2 의 일이다.
   ★ 'use strict' 는 맨 앞 한 번 — 파일마다 적힌 것은 중간에 오면 효력이 없는 문자열이 된다.
     엄격하지 않던 titlebg · sprites 도 엄격 모드로 돈다(엄격 모드에서 안 되는 구문·암묵 전역 없음 확인, 2026-09-26).
   사용: node tools/bundle.mjs            만들기
         node tools/bundle.mjs --check    커밋된 번들이 소스와 같은지(다르면 1)
         node tools/bundle.mjs --watch    고칠 때마다 다시 만들기 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', 'legacy');
const OUT = path.join(ROOT, 'game', 'js', 'ashfall.js');

/* 읽는 순서 — 예전 index.html 의 <script> 순서 그대로(sprites-manifest 는 번들 밖, 먼저 읽힌다). */
export const ORDER = ['util', 'data', 'world', 'tileart', 'itemart', 'titlebg', 'sprites',
  'entity', 'factory', 'ui', 'music', 'game'];

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function vlq(n) {
  let v = n < 0 ? ((-n) << 1) | 1 : n << 1, s = '';
  do { let d = v & 31; v >>>= 5; if (v) d |= 32; s += B64[d]; } while (v);
  return s;
}

export function build() {
  const head = "'use strict';\n/* Ashfall Chronicles — 자동 생성물(tools/bundle.mjs). 손으로 고치지 말 것 — 원본은 src/legacy/ */\n";
  let code = head, mappings = ';'.repeat(head.split('\n').length - 1);
  const sources = [], contents = [];
  let prevSrc = 0, prevLine = 0;
  ORDER.forEach((name, si) => {
    const text = fs.readFileSync(path.join(SRC, name + '.js'), 'utf8').replace(/\r\n/g, '\n');
    const body = text.endsWith('\n') ? text : text + '\n';
    sources.push('../../src/legacy/' + name + '.js'); contents.push(text);
    code += `// ---- src/legacy/${name}.js ----\n`; mappings += ';';
    const lines = body.split('\n'); lines.pop();
    lines.forEach((_, li) => {       // 한 줄에 한 토막: 번들 0열 → 원본 li 줄 0열
      mappings += 'A' + vlq(si - prevSrc) + vlq(li - prevLine) + 'A;';
      prevSrc = si; prevLine = li;
    });
    code += body;
  });
  code += '//# sourceMappingURL=ashfall.js.map\n';
  const map = JSON.stringify({ version: 3, file: 'ashfall.js', sources, sourcesContent: contents, names: [], mappings });
  return { code, map };
}

function write() {
  const { code, map } = build();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, code); fs.writeFileSync(OUT + '.map', map + '\n');
  return code;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = process.argv[2];
  if (arg === '--check') {
    const { code, map } = build();
    const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === code
      && fs.existsSync(OUT + '.map') && fs.readFileSync(OUT + '.map', 'utf8') === map + '\n';
    if (!same) { console.error('✗ game/js/ashfall.js 가 src/legacy/ 와 다르다 — node tools/bundle.mjs 로 다시 만들어 함께 커밋할 것'); process.exit(1); }
    console.log('✓ 번들이 소스와 같다');
  } else if (arg === '--watch') {
    let t = null;
    const go = () => { try { const c = write(); console.log(`↻ ${new Date().toLocaleTimeString()} ashfall.js ${(c.length / 1024).toFixed(0)} KB`); } catch (e) { console.error(e.message); } };
    go();
    fs.watch(SRC, () => { clearTimeout(t); t = setTimeout(go, 80); });
    console.log('src/legacy/ 를 지켜본다 (Ctrl+C 로 끝)');
  } else {
    const c = write();
    console.log(`✓ game/js/ashfall.js ${(c.length / 1024).toFixed(0)} KB · 파일 ${ORDER.length}개`);
  }
}
