/* 소개 글의 숫자가 게임 표와 같은지 — README.md(영어) · README-ko.md · 사이트 홈의 숫자 칸.
   ★ 숫자는 손으로 적되 여기서 대조한다 — 아이템 수가 README 447 · 사이트 492 · 실제 494 로 세 갈래였다.
   세는 법: 아이템 = ITEMS 전부(블록 · 장식 · 펫 포함) · 몬스터 = ENEMIES 중 보스가 아닌 것 · 보스 = boss 표시 · 업적 · 기계(MACHINE) · 제작법(RECIPES) · 장(CHAPTERS).
   node tests/counts.mjs (--print 은 지금 숫자만 찍는다) */
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const src = `import { ITEMS } from './src/game/data/items.ts'; import { ENEMIES } from './src/game/data/enemies.ts';
import { ACHIEVEMENTS } from './src/game/data/achievements.ts'; import { MACHINE, RECIPES } from './src/game/data/recipes.ts';
import { CHAPTERS } from './src/game/data/story.ts';
const en = Object.values(ENEMIES);
globalThis.__counts = { items: Object.keys(ITEMS).length, mobs: en.filter(d => !d.boss).length, bosses: en.filter(d => d.boss).length,
  achievements: ACHIEVEMENTS.length, machines: Object.keys(MACHINE).length, recipes: RECIPES.length, chapters: CHAPTERS.length };`;
const out = await build({ stdin: { contents: src, resolveDir: '.', loader: 'ts' }, bundle: true, platform: 'node', write: false, format: 'esm', logLevel: 'error' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const C = globalThis.__counts;
if (process.argv.includes('--print')) { console.log(C); process.exit(0); }

/** [파일, 정규식(첫 묶음 = 숫자), 표 열쇠] — 숫자는 쉼표를 빼고 읽는다 */
const WANT = [
  ['README.md', /Items \*\*([\d,]+)\*\*/, 'items'], ['README.md', /Monsters \*\*([\d,]+)\*\*/, 'mobs'],
  ['README.md', /Bosses \*\*([\d,]+)\*\*/, 'bosses'], ['README.md', /Achievements \*\*([\d,]+)\*\*/, 'achievements'],
  ['README.md', /Machines \*\*([\d,]+)\*\*/, 'machines'], ['README.md', /Recipes \*\*([\d,]+)\*\*/, 'recipes'],
  ['README-ko.md', /아이템 \*\*([\d,]+)\*\*/, 'items'], ['README-ko.md', /몬스터 \*\*([\d,]+)\*\*/, 'mobs'],
  ['README-ko.md', /보스 \*\*([\d,]+)\*\*/, 'bosses'], ['README-ko.md', /업적 \*\*([\d,]+)\*\*/, 'achievements'],
  ['README-ko.md', /기계 \*\*([\d,]+)\*\*/, 'machines'], ['README-ko.md', /제작법 \*\*([\d,]+)\*\*/, 'recipes'],
  ['site/home/index.html', /<span class="n">(\d+)<\/span><span class="l">종의 아이템/, 'items'],
  ['site/home/index.html', /<span class="n">(\d+)<\/span><span class="l">종의 몬스터/, 'mobs'],
  ['site/home/index.html', /<span class="n">(\d+)<\/span><span class="l">종의 보스/, 'bosses'],
  ['site/home/index.html', /<span class="n">(\d+)<\/span><span class="l">개의 업적/, 'achievements'],
  ['site/home/index.html', /<span class="n">(\d+)<\/span><span class="l">종의 기계/, 'machines'],
  ['site/home/index.html', /<span class="n">(\d+)<\/span><span class="l">개의 장/, 'chapters']
];
let bad = 0;
for (const [f, re, k] of WANT) {
  const m = readFileSync(f, 'utf8').match(re);
  if (!m) { console.log(`✗ ${f}: ${k} 칸을 못 찾았다(${re})`); bad++; continue; }
  const n = +m[1].replace(/,/g, '');
  if (n !== C[k]) { console.log(`✗ ${f}: ${k} = ${n} — 게임은 ${C[k]}`); bad++; }
}
if (bad) process.exit(1);
console.log(`✓ 소개 숫자가 게임 표와 같다 — 아이템 ${C.items} · 몬스터 ${C.mobs} · 보스 ${C.bosses} · 업적 ${C.achievements} · 기계 ${C.machines} · 제작법 ${C.recipes} · 장 ${C.chapters}`);
