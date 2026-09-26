/* ===== engine/i18n/format.ts — 메시지 형식(ICU 부분집합) ===== */
/* {이름} 치환 · {이름|조사}(언어 문법 훅) · {n, plural, one {…} other {…}}(# = n) · {x, select, a {…} other {…}}.
   ★ 중괄호를 글자로 쓰는 법은 없다 — 원문에 { } 를 넣지 말 것(검사가 막는다). 따옴표는 그냥 글자다(영어 don't 가 깨지지 않게). */

type Node = string | { v: string; hook?: string } | { v: string; kind: 'plural' | 'select'; opts: Record<string, Node[]> };
export type Params = Record<string, unknown>;
/** 언어 문법 훅 — {값|이름} 에서 불린다. null 이면 형식 오류. */
export type Hook = (v: unknown, name: string) => string | null;

function parse(s: string, i: number, stop: boolean): [Node[], number] {
  const out: Node[] = [];
  let buf = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '}' && stop) break;
    if (c !== '{') { buf += c; i++; continue; }
    if (buf) { out.push(buf); buf = ''; }
    const end = s.indexOf('}', i), comma = s.indexOf(',', i);
    if (end < 0) throw new Error('닫는 } 가 없다: ' + s);
    if (comma < 0 || comma > end) {                 // {이름} · {이름|훅}
      const [v, hook] = s.slice(i + 1, end).split('|').map(x => x.trim());
      out.push(hook ? { v, hook } : { v });
      i = end + 1; continue;
    }
    const v = s.slice(i + 1, comma).trim();
    const k2 = s.indexOf(',', comma + 1);
    const kind = s.slice(comma + 1, k2).trim();
    if (kind !== 'plural' && kind !== 'select') throw new Error('모르는 형식 ' + kind + ': ' + s);
    const opts: Record<string, Node[]> = {};
    i = k2 + 1;
    for (;;) {
      while (/\s/.test(s[i])) i++;
      if (s[i] === '}') { i++; break; }
      const b = s.indexOf('{', i);
      if (b < 0) throw new Error('갈래가 끊겼다: ' + s);
      const key = s.slice(i, b).trim();
      const [body, j] = parse(s, b + 1, true);
      opts[key] = body; i = j + 1;
    }
    if (!opts.other) throw new Error('other 갈래가 없다: ' + s);
    out.push({ v, kind, opts });
  }
  if (buf) out.push(buf);
  return [out, i];
}

const cache = new Map<string, Node[]>();
/** 메시지를 한 번만 풀어 둔다(매 프레임 부르는 문구가 있다) */
export function compile(msg: string): Node[] {
  let n = cache.get(msg);
  if (!n) { n = parse(msg, 0, false)[0]; cache.set(msg, n); }
  return n;
}

export function render(nodes: Node[], p: Params, lang: string, hook: Hook | null, num?: number): string {
  let out = '';
  for (const n of nodes) {
    if (typeof n === 'string') { out += num === undefined ? n : n.replace(/#/g, String(num)); continue; }
    const v = p[n.v];
    if (!('kind' in n)) {
      if (n.hook) {
        const r = hook ? hook(v, n.hook) : null;
        out += r === null ? String(v) : r;
      } else out += String(v);
      continue;
    }
    if (n.kind === 'select') { out += render(n.opts[String(v)] || n.opts.other, p, lang, hook, num); continue; }
    const x = Number(v);
    const exact = n.opts['=' + x];
    const body = exact || n.opts[new Intl.PluralRules(lang).select(x)] || n.opts.other;
    out += render(body, p, lang, hook, x);
  }
  return out;
}

/** 메시지에 들어간 자리표 이름들 — 번역이 원문과 같은 자리표를 쓰는지 볼 때 */
export function placeholders(msg: string): string[] {
  const names = new Set<string>();
  (function walk(ns: Node[]) {
    for (const n of ns) {
      if (typeof n === 'string') continue;
      names.add(n.v);
      if ('kind' in n) for (const k in n.opts) walk(n.opts[k]);
    }
  })(compile(msg));
  return [...names].sort();
}
