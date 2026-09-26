/* tools/i18n.mjs — 번역 도구
     node tools/i18n.mjs wrap <파일…>     코드의 한국어 문구를 tr('원문', { 값 }) 으로 감싼다
     node tools/i18n.mjs scan              아직 안 감싼 한국어 문구(함수 안) — 남으면 1
     node tools/i18n.mjs extract [--check] 원문 목록 src/legacy/locales/source.json 을 새로 쓴다(--check 는 어긋나면 1)
   ★ wrap 은 자리마다 스스로 확인한다 — 원래 식과 새 tr() 을 같은 가짜 값(받침 있는 말·없는 말·수)으로 둘 다 계산해
     글자가 하나라도 다르면 그 자리는 손대지 않고 알린다. 원본 언어(ko)에서 화면이 글자까지 같은 것은 이것으로 막는다. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { ROOT, LEGACY } from './srcmods.mjs';

const HANGUL = /[가-힣ㄱ-ㆎ]/;
const SOURCE_JSON = path.join(LEGACY, 'locales', 'source.json');

/* 엔진 형식기를 그대로 불러 쓴다(자리 확인이 게임과 같은 계산을 하도록) */
const eng = await (async () => {
  const r = esbuild.buildSync({
    stdin: { contents: "export * from './src/engine/i18n/format.ts'; export * from './src/engine/i18n/ko.ts';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', write: false, platform: 'neutral'
  });
  return import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
})();

function parse(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true, locations: true });
  (function up(n, p) {
    if (!n || typeof n.type !== 'string') return;
    n.parent = p;
    for (const k in n) {
      if (k === 'parent' || k === 'loc' || k === 'range') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(x => up(x, n)); else if (v && typeof v === 'object') up(v, n);
    }
  })(ast, null);
  return ast;
}
function walk(n, fn) {
  if (!n || typeof n.type !== 'string') return;
  fn(n);
  for (const k in n) {
    if (k === 'parent' || k === 'loc' || k === 'range') continue;
    const v = n[k];
    if (Array.isArray(v)) v.forEach(x => walk(x, fn)); else if (v && typeof v === 'object' && v.type) walk(v, fn);
  }
}
const hasHangul = n => (n.type === 'Literal' && typeof n.value === 'string' && HANGUL.test(n.value)) ||
  (n.type === 'TemplateLiteral' && n.quasis.some(q => HANGUL.test(q.value.cooked)));
const inFunction = n => { for (let p = n.parent; p; p = p.parent) if (/Function/.test(p.type)) return true; return false; };
const calleeName = c => c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && !c.computed ? c.property.name : '';

/** 감싸면 안 되는 자리 — 이유(글) 또는 '' */
function skipReason(n) {
  const p = n.parent;
  if (!inFunction(n)) return 'table';
  if (p.type === 'CallExpression' && p.arguments[0] === n && ['tr', 'N_'].includes(calleeName(p.callee))) return 'done';
  if (p.type === 'CallExpression' && p.callee.type === 'MemberExpression' && p.callee.object.name === 'console') return 'log';
  if (p.type === 'NewExpression' && /Error$/.test(calleeName(p.callee))) return 'log';
  if (p.type === 'TaggedTemplateExpression') return 'tagged';
  if (p.type === 'Property' && p.key === n) return 'key';
  if (p.type === 'MemberExpression' && p.property === n) return 'key';
  if (p.type === 'BinaryExpression' && /^[=!]==?$/.test(p.operator)) return 'compare';
  if (p.type === 'SwitchCase') return 'compare';
  if (p.type === 'CallExpression' && ['indexOf', 'includes', 'startsWith', 'endsWith', 'split', 'replace'].includes(calleeName(p.callee))) return 'compare';
  return '';
}

/* ---- 조각: 글(t) 과 식(e) ---- */
function pieces(n, src) {
  if (n.type === 'Literal') return [{ t: n.value }];
  const out = [];
  n.quasis.forEach((q, i) => {
    if (q.value.cooked) out.push({ t: q.value.cooked });
    if (i < n.expressions.length) { const e = n.expressions[i]; out.push({ e, src: src.slice(e.start, e.end) }); }
  });
  return out;
}
const norm = s => s.replace(/\s+/g, '');
/** 조사 부르기 — { arg, a, b, withVal } 또는 null */
function josaCall(e, src) {
  if (e.type !== 'CallExpression' || e.callee.type !== 'Identifier') return null;
  const f = e.callee.name, A = e.arguments;
  const argSrc = A[0] ? src.slice(A[0].start, A[0].end) : '';
  if (f === 'josa' && A.length === 3 && A[1].type === 'Literal' && A[2].type === 'Literal' &&
      eng.koParticle('각', A[1].value) !== null) return { arg: A[0], argSrc, a: A[1].value, b: A[2].value, withVal: false };
  if (f === 'josaRo' && A.length === 1) return { arg: A[0], argSrc, a: '으로', b: '로', withVal: false, ro: true };
  const V = { iga: ['이', '가'], eulreul: ['을', '를'], eunneun: ['은', '는'] }[f];
  if (V && A.length === 1) return { arg: A[0], argSrc, a: V[0], b: V[1], withVal: true };
  return null;
}

/* 자리표 이름 — 번역하는 사람이 읽을 수 있게 식에서 뽑는다 */
const GENERIC = new Set(['n', 'd', 'c', 'r', 'v', 't', 'x', 'y', 'i', 'k', 'id', 'value', 'length']);
function camel(s) { return s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function nameOf(e) {
  if (!e) return 'v';
  if (e.type === 'Identifier') return /^[A-Z0-9_]+$/.test(e.name) && e.name.length > 2 ? camel(e.name) : e.name;
  if (e.type === 'MemberExpression') {
    if (e.computed) {
      const o = e.object;
      if (o.type === 'Identifier' && /^[A-Z][A-Z0-9_]+$/.test(o.name)) {
        const c = camel(o.name);
        return c.endsWith('ies') ? c.slice(0, -3) + 'y' : c.endsWith('s') ? c.slice(0, -1) : c;
      }
      return nameOf(o);
    }
    const p = e.property.name;
    if (p === 'length') return nameOf(e.object) + 'Count';
    return GENERIC.has(p) ? nameOf(e.object) : p;
  }
  if (e.type === 'CallExpression') {
    const f = calleeName(e.callee);
    if (['fmt', 'round', 'floor', 'ceil', 'abs', 'max', 'min', 'pad2', 'escHtml', 'String', 'Number'].includes(f) && e.arguments[0]) return nameOf(e.arguments[0]);
    if (['toFixed', 'toString', 'toLocaleString', 'trim', 'toUpperCase', 'toLowerCase'].includes(f) && e.callee.type === 'MemberExpression') return nameOf(e.callee.object);
    return f || 'v';
  }
  if (e.type === 'ThisExpression') return 'self';
  if (e.type === 'Literal') return 'n';
  if (e.type === 'BinaryExpression' || e.type === 'UnaryExpression') return 'n';
  return 'v';
}
const cleanName = s => { s = String(s).replace(/[^A-Za-z0-9_]/g, ''); return !s || /^\d/.test(s) ? 'v' + s : s; };

/* ---- 나누기: 태그(코드로 남김) · 글 토막(메시지 후보) ---- */
const INLINE = /^<\/?(b|em|i|strong|u)>/;
function segment(ps) {
  const segs = []; let cur = { run: true, parts: [] }, inTag = false;
  const push = () => { if (cur.parts.length) segs.push(cur); };
  for (const p of ps) {
    if (p.e) { cur.parts.push(p); continue; }
    const s = p.t;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      /* 속성 없는 강조 태그는 문장 안에 둔다 — 쪼개면 '전력 <b>{n}</b>/틱' 이 토막 셋이 된다 */
      if (!inTag && c === '<' && /[A-Za-z\/!]/.test(s[i + 1] || '') && !INLINE.test(s.slice(i))) { push(); cur = { run: true, parts: [] }; cur.run = false; inTag = true; }
      const last = cur.parts[cur.parts.length - 1];
      if (last && last.t !== undefined) last.t += c; else cur.parts.push({ t: c });
      if (inTag && c === '>') { push(); cur = { run: true, parts: [] }; inTag = false; }
    }
  }
  push();
  return segs;
}

/** 템플릿 안에 코드로 다시 쓸 글 */
const tplEsc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const strEsc = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + "'";

/** 자리 하나 바꾸기 — { code, msgs } 또는 { error } */
function transform(n, src) {
  const segs = segment(pieces(n, src));
  const names = new Map(), used = new Set();
  const nameFor = (e, s) => {
    const key = norm(s);
    if (names.has(key)) return names.get(key);
    let base = cleanName(nameOf(e)), nm = base, k = 2;
    while (used.has(nm)) nm = base + k++;
    names.set(key, nm); used.add(nm);
    return nm;
  };
  const out = [];          // { code } | { expr } | { msg, params:[[name, src]] }
  const msgs = [];
  for (const seg of segs) {
    const hangul = seg.run && seg.parts.some(p => p.t !== undefined && HANGUL.test(p.t));
    if (!hangul) {
      for (const p of seg.parts) {
        if (p.t !== undefined) { if (!seg.run && HANGUL.test(p.t)) return { error: '태그 속 한국어(속성)' }; out.push({ code: p.t }); }
        else out.push({ expr: p });
      }
      continue;
    }
    /* 앞뒤 공백은 메시지 밖(코드)으로 */
    const parts = seg.parts.map(p => ({ ...p }));
    let lead = '', trail = '';
    if (parts[0].t !== undefined) { const m = parts[0].t.match(/^\s*/)[0]; lead = m; parts[0].t = parts[0].t.slice(m.length); }
    const L = parts[parts.length - 1];
    if (L.t !== undefined) { const m = L.t.match(/\s*$/)[0]; trail = m; L.t = L.t.slice(0, L.t.length - m.length); }
    const toks = [];       // { text } | { ph, hook }
    const params = [];
    for (const p of parts) {
      if (p.t !== undefined) { if (p.t) toks.push({ text: p.t }); continue; }
      if (/[{}]/.test(p.src) && p.e.type === 'Literal') return { error: '중괄호' };
      const j = josaCall(p.e, src);
      if (j) {
        const nm = nameFor(j.arg, j.argSrc);
        if (!params.some(x => x[0] === nm)) params.push([nm, j.argSrc]);
        const prev = toks[toks.length - 1];
        if (!j.withVal && prev && prev.ph === nm && !prev.hook) prev.hook = j.a;
        else toks.push({ ph: nm, hook: (j.withVal ? '' : '-') + j.a });
        continue;
      }
      const nm = nameFor(p.e, p.src);
      if (!params.some(x => x[0] === nm)) params.push([nm, p.src]);
      toks.push({ ph: nm });
    }
    const msg = toks.map(t => t.text !== undefined ? t.text : '{' + t.ph + (t.hook ? '|' + t.hook : '') + '}').join('');
    if (/[{}]/.test(toks.filter(t => t.text).map(t => t.text).join(''))) return { error: '글에 중괄호' };
    if (lead) out.push({ code: lead });
    out.push({ msg, params });
    if (trail) out.push({ code: trail });
    msgs.push(msg);
  }
  /* 코드로 */
  const call = o => 'tr(' + strEsc(o.msg) + (o.params.length ? ', { ' + o.params.map(([k, s]) => k === s ? k : k + ': ' + s).join(', ') + ' }' : '') + ')';
  let code;
  if (out.length === 1 && out[0].msg !== undefined) code = call(out[0]);
  else code = '`' + out.map(o => o.code !== undefined ? tplEsc(o.code) : o.expr ? '${' + o.expr.src + '}' : '${' + call(o) + '}').join('') + '`';
  /* ---- 스스로 확인: 가짜 값으로 원래 식과 새 식을 계산해 대조 ---- */
  const SAMPLES = ['검', '나무', '물', 3, 12, 'Abc', '길', '돌 칼', 0, '달'];
  for (let trial = 0; trial < 5; trial++) {
    const val = new Map(); let k = trial;
    const sample = s => { const key = norm(s); if (!val.has(key)) val.set(key, SAMPLES[(k++ * 3 + trial) % SAMPLES.length]); return val.get(key); };
    const evalExpr = p => {
      const j = josaCall(p.e, src);
      if (!j) return String(sample(p.src));
      const w = sample(j.argSrc);
      if (j.ro) return eng.josaRo(String(w));
      return (j.withVal ? String(w) : '') + eng.josa(w, j.a, j.b);
    };
    const orig = pieces(n, src).map(p => p.t !== undefined ? p.t : evalExpr(p)).join('');
    const neu = out.map(o => o.code !== undefined ? o.code : o.expr ? evalExpr(o.expr) :
      eng.render(eng.compile(o.msg), Object.fromEntries(o.params.map(([nm, s]) => [nm, sample(s)])), 'ko', eng.koParticle)).join('');
    if (orig !== neu) return { error: '대조 어긋남: ' + JSON.stringify(orig) + ' ≠ ' + JSON.stringify(neu) };
  }
  return { code, msgs };
}

/** 그 자리에서 tr 이 지역 이름에 가려지는가 */
function shadowed(sm, n, names) {
  for (let p = n.parent; p; p = p.parent) {
    const sc = sm.acquire(p);
    if (sc && sc.type !== 'module' && sc.type !== 'global' && sc.variables.some(v => names.includes(v.name))) return true;
  }
  return false;
}

function wrapFile(file) {
  let src = fs.readFileSync(file, 'utf8'), total = 0;
  const problems = [];
  for (let pass = 0; pass < 6; pass++) {
    const ast = parse(src);
    const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
    const sites = [];
    walk(ast, n => { if (hasHangul(n) && !skipReason(n)) sites.push(n); });
    /* 바깥 것만 — 안쪽은 다음 차례에(바깥을 바꾸면 안쪽은 자리표 값 식이 된다) */
    const outer = sites.filter(n => !sites.some(o => o !== n && o.start <= n.start && n.end <= o.end));
    const edits = [];
    for (const n of outer) {
      const line = n.loc.start.line;
      if (shadowed(sm, n, ['tr'])) { problems.push(`${line}: tr 이 지역 이름에 가려진다`); continue; }
      const r = transform(n, src);
      if (r.error) { problems.push(`${line}: ${r.error} — ${src.slice(n.start, Math.min(n.end, n.start + 90))}`); continue; }
      edits.push([n.start, n.end, r.code]);
    }
    if (!edits.length) break;
    edits.sort((a, b) => b[0] - a[0]);
    for (const [s, e, c] of edits) src = src.slice(0, s) + c + src.slice(e);
    total += edits.length;
  }
  fs.writeFileSync(file, src);
  return { total, problems: [...new Set(problems)] };
}

/** 함수 안에 남은 한국어 문구(건너뛴 이유별) */
function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8'), ast = parse(src), left = [];
  walk(ast, n => {
    if (!hasHangul(n)) return;
    const why = skipReason(n);
    if (why === 'table' || why === 'done' || why === 'log') return;
    left.push(`${path.relative(ROOT, file)}:${n.loc.start.line} [${why || '안 감쌈'}] ${src.slice(n.start, Math.min(n.end, n.start + 80)).replace(/\n/g, ' ')}`);
  });
  return left;
}

/** 표 원문 — 경로('ITEMS.wood.n') → 글. ★ 뿌리 순서는 main.js 의 applyTables 와 같다(size · data · world · factory). */
function tables() {
  const r = esbuild.buildSync({
    stdin: { contents: `import * as size from './src/legacy/size.js'; import * as data from './src/legacy/data.js';
      import * as world from './src/legacy/world.js'; import * as factory from './src/legacy/factory.js';
      import { collectTables } from './src/engine/i18n/i18n.ts';
      export default collectTables(Object.assign({}, size, data, world, factory), s => /[\\uAC00-\\uD7A3]/.test(s));`, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent'
  });
  const f = path.join(ROOT, 'tests/out/.i18n-tables.mjs');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, r.outputFiles[0].text);
  const out = execFileSync(process.execPath, ['-e', `import(${JSON.stringify('file://' + f)}).then(m => process.stdout.write(JSON.stringify(m.default)))`], { maxBuffer: 64 << 20 });
  return JSON.parse(out);
}

/** 원문 목록 — tr('…') · N_('…') 의 첫 인자를 파일:함수 자리와 함께 */
function extract() {
  const msgs = {};
  for (const f of fs.readdirSync(LEGACY).filter(f => f.endsWith('.js')).sort()) {
    const src = fs.readFileSync(path.join(LEGACY, f), 'utf8'), ast = parse(src);
    walk(ast, n => {
      if (n.type !== 'CallExpression' || !['tr', 'N_'].includes(calleeName(n.callee))) return;
      const a = n.arguments[0];
      if (!a || a.type !== 'Literal' || typeof a.value !== 'string') return;
      let where = '';
      for (let p = n.parent; p && !where; p = p.parent) {
        if ((p.type === 'Property' || p.type === 'MethodDefinition') && p.value && /Function/.test(p.value.type) && p.key.name) where = p.key.name;
        else if (p.type === 'FunctionDeclaration' && p.id) where = p.id.name;
        else if (p.type === 'VariableDeclarator' && p.init && /Function/.test(p.init.type) && p.id.name) where = p.id.name;
      }
      const at = f.replace(/\.js$/, '') + (where ? '.' + where : '');
      (msgs[a.value] = msgs[a.value] || []).includes(at) || msgs[a.value].push(at);
    });
  }
  /* 정적 HTML — lang.js localizeDom 과 같은 규칙(글 마디는 앞뒤 공백을 뺀 것, 안내 속성 넷) */
  const raw = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  for (const m of raw.matchAll(/\btr\('([^'\\]+)'\)/g)) (msgs[m[1]] = msgs[m[1]] || []).includes('index.html') || msgs[m[1]].push('index.html');   // 인라인 스크립트
  const html = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '<x>');
  const ent = t => t.replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
  const add = (t, at) => { (msgs[t] = msgs[t] || []).includes(at) || msgs[t].push(at); };
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part[0] === '<') {
      for (const m of part.matchAll(/\b(placeholder|title|aria-label|alt)="([^"]*)"/g)) if (HANGUL.test(m[2])) add(ent(m[2]).trim(), 'index.html');
    } else { const t = ent(part).trim(); if (t && HANGUL.test(t)) add(t, 'index.html'); }
  }
  const sorted = {};
  for (const k of Object.keys(msgs).sort()) sorted[k] = msgs[k];
  return JSON.stringify({ '//': 'tools/i18n.mjs extract 가 만든다 — 손으로 고치지 말 것. msgs: 원문 → 쓰이는 자리(파일.함수) · tables: 표 경로 → 원문',
    msgs: sorted, tables: tables() }, null, 1) + '\n';
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'wrap') {
  let bad = 0;
  for (const f of args) {
    const r = wrapFile(path.resolve(f));
    console.log(`${f}: ${r.total}곳 감쌈` + (r.problems.length ? `, 못 감싼 곳 ${r.problems.length}` : ''));
    for (const p of r.problems) console.log('   ' + p);
    bad += r.problems.length;
  }
} else if (cmd === 'scan') {
  const left = fs.readdirSync(LEGACY).filter(f => f.endsWith('.js')).sort().flatMap(f => scanFile(path.join(LEGACY, f)));
  console.log(left.join('\n') || '✓ 함수 안에 안 감싼 한국어 문구 없음');
  process.exit(left.length ? 1 : 0);
} else if (cmd === 'extract') {
  const text = extract();
  if (args.includes('--check')) {
    const old = fs.existsSync(SOURCE_JSON) ? fs.readFileSync(SOURCE_JSON, 'utf8') : '';
    if (old !== text) { console.error('✗ locales/source.json 이 소스와 어긋난다 — node tools/i18n.mjs extract'); process.exit(1); }
    console.log('✓ 원문 목록이 소스와 맞다');
  } else {
    fs.mkdirSync(path.dirname(SOURCE_JSON), { recursive: true });
    fs.writeFileSync(SOURCE_JSON, text);
    console.log(`✓ 원문 ${Object.keys(JSON.parse(text).msgs).length}개 → ${path.relative(ROOT, SOURCE_JSON)}`);
  }
} else {
  console.log('node tools/i18n.mjs wrap <파일…> | scan | extract [--check]');
}
