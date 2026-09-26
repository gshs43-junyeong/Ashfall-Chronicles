/* 번역 검사 — ① 함수 안에 안 감싼 한국어 문구 0 ② 원문 목록(locales/source.json)이 소스와 같다 · game/locales 가 묶음과 같다
   · 언어마다 자리표·태그·남은 한글·형식(빠진 열쇠는 비율만 알린다)
   ③ 형식기: 자리표 · 조사 훅(엔진 josa 와 같은 결과) · plural · select · 번역 찾기 순서 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => execFileSync('node', [path.join(ROOT, 'tools/i18n.mjs'), ...args], { stdio: 'inherit' });
run(['scan']);
run(['extract', '--check']);
run(['build', '--check']);
run(['check']);

const r = esbuild.buildSync({
  stdin: { contents: "export * from './src/engine/i18n/i18n.ts'; export * from './src/engine/i18n/format.ts'; export * from './src/engine/i18n/ko.ts';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', write: false, platform: 'neutral'
});
const E = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
let bad = 0;
const eq = (got, want, what) => { if (got !== want) { bad++; console.error(`✗ ${what}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); } };

const ko = E.createI18n({ source: 'ko', lang: 'ko', locales: {}, hooks: { ko: E.koParticle } });
eq(ko.tr('가방이 가득 찼다'), '가방이 가득 찼다', '원문 그대로');
eq(ko.tr('{a} · {b}개', { a: '검', b: 3 }), '검 · 3개', '자리표');
const WORDS = ['검', '나무', '물', '길', '달', 'Abc', '3', '돌 칼', '활', '서리쑥', '강철', '별빛 수정'];
for (const w of WORDS) {
  eq(ko.tr('{w|을} 얻었다', { w }), E.eulreul(w) + ' 얻었다', '을/를 ' + w);
  eq(ko.tr('{w|가} 왔다', { w }), E.iga(w) + ' 왔다', '이/가 ' + w);
  eq(ko.tr('{w|는}', { w }), E.eunneun(w), '은/는 ' + w);
  eq(ko.tr('{w|로}', { w }), w + E.josaRo(w), '로 ' + w);
  eq(ko.tr('『{w}』{w|-이}', { w }), '『' + w + '』' + E.josa(w, '이', '가'), '조사만 ' + w);
  eq(ko.tr('{w|과}', { w }), w + E.josa(w, '과', '와'), '과/와 ' + w);
}
const en = E.createI18n({ source: 'ko', lang: 'en', locales: {
  en: { msgs: { '{n}개': '{n, plural, one {# item} other {# items}}', '{k, select, a {에이} other {기타}}': '{k, select, a {A} other {other}}', '{w|을} 얻었다': 'Got {w|을}' } },
  ja: { msgs: { '{n}개': '{n}個' } }
}, fallback: ['en'], hooks: { ko: E.koParticle } });
eq(en.tr('{n}개', { n: 1 }), '1 item', 'plural one');
eq(en.tr('{n}개', { n: 5 }), '5 items', 'plural other');
eq(en.tr('{k, select, a {에이} other {기타}}', { k: 'a' }), 'A', 'select');
eq(en.tr('{w|을} 얻었다', { w: 'Sword' }), 'Got Sword', '다른 언어의 조사 훅은 값만');
eq(en.tr('없는 문구'), '없는 문구', '없으면 원문');
const ja = E.createI18n({ source: 'ko', lang: 'ja', locales: { en: { msgs: { '가': 'A' } }, ja: { msgs: { '{n}개': '{n}個' } } }, fallback: ['en'] });
eq(ja.tr('{n}개', { n: 2 }), '2個', '그 언어');
eq(ja.tr('가'), 'A', '대체 언어(en)');
eq(E.placeholders('{a} {b, plural, one {#} other {{c}}}').join(','), 'a,b,c', '자리표 목록');
const T = { ITEMS: { wood: { n: '나무', d: '단단하다' } }, BIOMES: [{ n: '숲' }] };
eq(JSON.stringify(E.collectTables(T, s => /[가-힣]/.test(s))), '{"ITEMS.wood.n":"나무","ITEMS.wood.d":"단단하다","BIOMES.0.n":"숲"}', '표 모으기');
const tb = E.createI18n({ source: 'ko', lang: 'en', locales: { en: { tables: { 'ITEMS.wood.n': 'Wood', 'BIOMES.0.n': 'Forest', 'NOPE.x': 'x' } } } });
eq(tb.applyTables(T), 2, '표 덮기 수');
eq(T.ITEMS.wood.n + '/' + T.BIOMES[0].n + '/' + T.ITEMS.wood.d, 'Wood/Forest/단단하다', '표 덮기');
eq(ko.applyTables(T), 0, '원본 언어는 표를 안 덮는다');
if (bad) { console.error(`✗ 형식기 검사 ${bad}건 실패`); process.exit(1); }
console.log('✓ 형식기 · 조사 훅 · plural · select · 대체 순서 · 표 덮기');
