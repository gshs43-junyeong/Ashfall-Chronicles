#!/usr/bin/env node
/* 사이트(site/home · site/download) 번역 도구 — 게임의 tools/i18n.mjs 와 같은 흐름.
     node tools/site-i18n.mjs extract   페이지를 헤드리스로 열어 옮길 글을 모은다 → site/i18n/source.json
                                        (site/i18n.js 의 apply 가 보는 것과 **같은 함수**로 모은다 — 열쇠가 어긋날 수 없다)
     node tools/site-i18n.mjs seed      빈 칸을 게임 번역(src/game/locales)의 같은 원문으로 채운다(지역 · 장 · 보스 이름을 게임과 맞춘다)
     node tools/site-i18n.mjs build     site/i18n/<언어>.json → site/i18n/<언어>.js (<script> 로 싣는 묶음 — file:// 에서도 된다)
     node tools/site-i18n.mjs check     언어마다 빠진 것 · 남는 것 · 태그 어긋남 · 묶음이 json 과 같은지(다르면 1)
   ★ 원문(한국어)이 열쇠다 — 페이지 글을 고치면 extract → 번역 → build 를 다시 돈다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'site', 'i18n');
const LANGS = ['en', 'ja', 'zh-Hans', 'de', 'es'];
const PAGES = ['home/index.html', 'download/index.html'];
const SRC = path.join(DIR, 'source.json');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n');
const langFile = l => path.join(DIR, l + '.json');
const bundle = (l, d) => `/* tools/site-i18n.mjs build 가 만든다 — 손으로 고치지 말 것. 원본은 site/i18n/${l}.json */\nwindow.SITE_L10N = ${JSON.stringify(d)};\n`;

/** 태그 모양(속성째) — 번역이 링크 · 강조 · 키 · id 를 잃거나 바꾸지 않았는지 대조한다 */
const tags = s => (s.match(/<[^>]+>/g) || []).map(t => t.replace(/\s+/g, ' ')).sort().join('');

const cmd = process.argv[2];
fs.mkdirSync(DIR, { recursive: true });

if (cmd === 'extract') {
  const { serve, browser } = await import('../tests/lib.mjs');
  const { srv, url } = await serve(path.join(ROOT, 'site'));
  const b = await browser();
  const keys = new Set();
  for (const p of PAGES) {
    const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { } });
    await page.goto(`${url}/${p}?lang=ko`);
    await page.waitForFunction(() => window.SiteI18n && document.getElementById('siteBuild') !== undefined);
    await page.waitForTimeout(400);
    for (const k of await page.evaluate(() => Object.keys(SiteI18n.seen))) keys.add(k);
    await page.close();
  }
  await b.close(); srv.close();
  const list = [...keys].filter(k => /[가-힣]/.test(k)).sort();
  write(SRC, list);
  console.log(`✓ site/i18n/source.json — ${list.length}개`);
} else if (cmd === 'seed') {
  const src = read(SRC);
  const gsrc = read(path.join(ROOT, 'src', 'game', 'locales', 'source.json'));
  for (const l of LANGS) {
    const f = langFile(l), d = fs.existsSync(f) ? read(f) : {};
    const g = read(path.join(ROOT, 'src', 'game', 'locales', l + '.json'));
    /* 게임 원문 → 번역: 메시지는 원문 열쇠 그대로, 표는 경로 → 원문(source.json) 을 거쳐 */
    const by = new Map();
    for (const [k, v] of Object.entries(g.msgs || {})) by.set(k, v);
    for (const [pth, ko] of Object.entries(gsrc.tables || {})) if (g.tables && g.tables[pth] && !by.has(ko)) by.set(ko, g.tables[pth]);
    let n = 0;
    for (const k of src) if (d[k] === undefined && by.has(k)) { d[k] = by.get(k); n++; }
    write(f, d);
    console.log(`${l}: 게임 번역으로 ${n}개 채움 · 빈 칸 ${src.filter(k => d[k] === undefined).length}`);
  }
} else if (cmd === 'build') {
  for (const l of LANGS) {
    const f = langFile(l);
    if (!fs.existsSync(f)) continue;
    fs.writeFileSync(path.join(DIR, l + '.js'), bundle(l, read(f)));
  }
  console.log('✓ site/i18n/<언어>.js — ' + LANGS.join(' · '));
} else if (cmd === 'check') {
  const src = read(SRC), set = new Set(src);
  let bad = 0;
  for (const l of LANGS) {
    const f = langFile(l);
    const d = fs.existsSync(f) ? read(f) : {};
    const miss = src.filter(k => d[k] === undefined), extra = Object.keys(d).filter(k => !set.has(k));
    const tagBad = src.filter(k => d[k] !== undefined && tags(k) !== tags(d[k]));
    const js = path.join(DIR, l + '.js'), stale = !fs.existsSync(js) || fs.readFileSync(js, 'utf8') !== bundle(l, d);
    const okAll = !miss.length && !extra.length && !tagBad.length && !stale;
    if (!okAll) bad++;
    console.log(`${okAll ? '✓' : '✗'} ${l}: ${src.length - miss.length}/${src.length}` +
      (miss.length ? ` · 빠짐 ${miss.length}` : '') + (extra.length ? ` · 원문에 없는 열쇠 ${extra.length}` : '') +
      (tagBad.length ? ` · 태그 어긋남 ${tagBad.length}` : '') + (stale ? ' · 묶음이 json 과 다르다(build)' : ''));
    for (const k of [...miss.slice(0, 3), ...tagBad.slice(0, 3)]) console.log('    ' + k.slice(0, 110));
  }
  if (bad) process.exit(1);
} else {
  console.log('사용: node tools/site-i18n.mjs extract | seed | build | check');
  process.exit(2);
}
