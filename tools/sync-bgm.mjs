#!/usr/bin/env node
/* tools/sync-bgm.mjs — play/assets/bgm/ 의 배경음악 파일을 훑어 play/assets/bgm-manifest.js 를 쓴다.
   파일 이름 = 상황 키(src/game/music.ts BGM_KEYS) · 같은 키에 여럿이면 <키>_1 · <키>_2 …(틀 때마다 하나를 고른다).
   주소 끝에 내용 해시(?h=)를 단다 — 웹에서 /play/assets/* 는 1년 캐시라 같은 이름으로 곡을 바꾸면 옛 곡이 계속 나왔다.
   --check: 지금 폴더와 커밋된 매니페스트가 다르면 1 (npm run test:manifest · 배포가 막는다). */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'play/assets/bgm');
const OUT = join(ROOT, 'play/assets/bgm-manifest.js');
const EXT = ['.mp3', '.m4a', '.ogg', '.opus', '.wav'];
const BIG = 12 * 1024 * 1024;                    // 이보다 크면 경고(웹 첫 재생이 늦다)

const src = readFileSync(join(ROOT, 'src/game/music.ts'), 'utf8');
const m = /export const BGM_KEYS = \[([^\]]*)\]/.exec(src);
if (!m) { console.error('✗ src/game/music.ts 에서 BGM_KEYS 를 못 찾았다'); process.exit(1); }
const KEYS = [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map(x => x[1]);

const man = {}, errs = [], warns = [];
const files = existsSync(DIR) ? readdirSync(DIR).sort() : [];
for (const f of files) {
  const ext = extname(f).toLowerCase();
  if (!EXT.includes(ext)) continue;              // README 따위는 건너뛴다
  const stem = basename(f, extname(f));
  const mm = /^([a-z0-9]+?)(?:_(\d+))?$/.exec(stem);
  const key = mm && KEYS.includes(stem) ? stem : mm && KEYS.includes(mm[1]) ? mm[1] : null;
  if (!key) { errs.push(`${f} — 상황 키가 아니다(쓸 수 있는 이름: ${KEYS.join(' · ')}, 여럿이면 <키>_1 …)`); continue; }
  const buf = readFileSync(join(DIR, f));
  if (buf.length > BIG) warns.push(`${f} — ${(buf.length / 1048576).toFixed(1)}MB (m4a/mp3 로 줄이면 웹이 빨리 튼다)`);
  if (ext === '.wav') warns.push(`${f} — wav 는 크다. m4a(AAC 160k)나 mp3 로 바꾸길 권한다`);
  const h = createHash('md5').update(buf).digest('hex').slice(0, 8);
  (man[key] = man[key] || []).push(`assets/bgm/${f}?h=${h}`);
}

const body = KEYS.filter(k => man[k]).map(k => `  ${k}: ${JSON.stringify(man[k])}`).join(',\n');
const text = `/* assets/bgm-manifest.js — 자동 생성물. 손으로 고치지 마세요.
   원본은 assets/bgm/ 폴더(파일 이름 = 상황 키)이고 tools/sync-bgm.mjs 가 옮겨 적습니다.
   file:// 에서는 폴더를 훑을 수 없어 목록을 여기에 한 벌 둡니다. */
window.BGM_MANIFEST = {${body ? '\n' + body + '\n' : ''}};
`;

for (const w of warns) console.warn('! ' + w);
if (errs.length) { for (const e of errs) console.error('✗ ' + e); process.exit(1); }
const n = Object.values(man).reduce((a, v) => a + v.length, 0);
const have = KEYS.filter(k => man[k]), miss = KEYS.filter(k => !man[k]);
if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== text) { console.error('✗ bgm-manifest.js 가 assets/bgm/ 와 다르다 — node tools/sync-bgm.mjs 를 돌리고 커밋할 것'); process.exit(1); }
  console.log(`✓ 배경음악 목록이 폴더와 같다 — ${n}곡 · 키 ${have.length}/${KEYS.length}`);
} else {
  writeFileSync(OUT, text);
  console.log(`✓ ${OUT.slice(ROOT.length + 1)} — ${n}곡 · 키 ${have.length}/${KEYS.length}` + (miss.length ? ` (빈 키는 대체 곡: ${miss.join(' · ')})` : ''));
}
