/* ===== engine/i18n/i18n.ts — 번역: tr(원문, 값) ===== */
/* 원문(원본 언어 글)이 곧 열쇠다 — 원본 언어에서는 번역을 찾지 않고 원문을 그대로 형식에 넣는다(화면이 글자까지 같다).
   다른 언어는 그 언어 → 대체 언어들 → 원문 순으로 찾는다. 표(아이템 이름 따위)는 id 경로 열쇠로 덮어쓴다(applyTables). */
import { compile, render } from './format.js';
import type { Hook, Params } from './format.js';

export interface Locale {
  /** 원문 → 번역 */
  msgs?: Record<string, string>;
  /** 표 경로('ITEMS.wood.n') → 번역 */
  tables?: Record<string, string>;
}

export function createI18n({ source, lang, locales, fallback = [], hooks = {} }: {
  /** 원본 언어(원문이 쓰인 언어) */
  source: string;
  lang: string;
  locales: Record<string, Locale>;
  /** 찾지 못했을 때 차례로 볼 언어 */
  fallback?: string[];
  /** 언어별 문법 훅({값|이름}) */
  hooks?: Record<string, Hook>;
}) {
  const chain = [lang, ...fallback].filter((l, i, a) => l !== source && a.indexOf(l) === i);
  const isSource = lang === source;
  return {
    lang, source, isSource,
    tr(src: string, p?: Params): string {
      let msg = src, ml = source;
      if (!isSource) for (const l of chain) {
        const m = locales[l] && locales[l].msgs && locales[l].msgs![src];
        if (m !== undefined) { msg = m; ml = l; break; }
      }
      if (!p && msg.indexOf('{') < 0) return msg;
      return render(compile(msg), p || {}, ml, hooks[ml] || null);
    },
    /** 표의 글을 그 언어로 덮어쓴다 — roots 는 { ITEMS, ENEMIES, … }. 원본 언어면 아무것도 안 한다. 덮은 수를 돌려준다. */
    applyTables(roots: Record<string, unknown>): number {
      if (isSource) return 0;
      let n = 0;
      for (const l of [...chain].reverse()) {
        const t = locales[l] && locales[l].tables;
        if (!t) continue;
        for (const path in t) {
          const keys = path.split('.');
          let o: any = roots[keys[0]];
          for (let i = 1; i < keys.length - 1 && o; i++) o = o[keys[i]];
          const last = keys[keys.length - 1];
          if (o && typeof o[last] === 'string') { o[last] = t[path]; n++; }
        }
      }
      return n;
    }
  };
}
export type I18n = ReturnType<typeof createI18n>;

/** 표에서 번역할 글을 모은다 — 경로('ITEMS.wood.n') → 글. keep(글) 이 참인 것만(보통 원본 언어 글자가 든 것). */
export function collectTables(roots: Record<string, unknown>, keep: (s: string) => boolean): Record<string, string> {
  const out: Record<string, string> = {};
  const seen = new Set<unknown>();
  (function walk(o: any, path: string) {
    if (typeof o === 'string') { if (keep(o)) out[path] = o; return; }
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    for (const k of Object.keys(o)) {
      if (k.indexOf('.') >= 0) continue;       // 경로에 점이 들어가면 되돌릴 수 없다
      walk(o[k], path ? path + '.' + k : k);
    }
  })(roots, '');
  return out;
}
