/* ===== lang.js — 번역 창구: tr(원문, 값) · 언어 고르기 ===== */
/* 코드의 한국어 문구는 tr('원문', { 값 }) 으로 쓴다 — 원문이 곧 열쇠이고, 한국어에서는 원문 그대로 나온다.
   값은 {이름} 자리표로, 조사는 {이름|을} 로(엔진 ko.ts). 표(아이템 이름 따위)는 id 경로로 따로 덮는다(I18N.applyTables).
   번역을 찾을 수 없는 자리(기계 상태처럼 값으로 비교하는 글)는 N_('원문') 으로 적어 두고 보여 줄 때 tr(값). */
import { fontStack } from '../engine/i18n/fonts.js';
import { createI18n } from '../engine/i18n/i18n.js';
import { koParticle } from '../engine/i18n/ko.js';

/** 언어별 번역 묶음 { msgs, tables } — 원본(ko)은 비어 있다. 번들보다 먼저 읽힌 로케일 스크립트가
    globalThis.ASHFALL_LOCALES 에 싣는다(file:// 에서는 fetch 가 막혀 JSON 을 못 읽는다). */
export const LOCALES = (typeof globalThis !== 'undefined' && globalThis.ASHFALL_LOCALES) || {};
/** 이번 실행의 언어 — index.html 이 번들보다 먼저 골라 둔다(?lang= → 설정 → 브라우저 언어 → ko) */
export const LANG = (typeof globalThis !== 'undefined' && globalThis.ASHFALL_LANG) ||
  (typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang')) || 'ko';
/** 실려 있는 언어(game/locales/list.js — tools/i18n.mjs build 가 만든다) */
export const LANGS = (typeof globalThis !== 'undefined' && globalThis.ASHFALL_LANGS) || ['ko'];
/** 언어 이름은 그 언어로 적는다 — 옮기지 않는다(자기 언어를 못 읽는 사람이 찾을 수 있게) */
export const LANG_NAMES = { ko: '한국어', en: 'English', ja: '日本語', 'zh-Hans': '简体中文', de: 'Deutsch', es: 'Español' };
/** 설정에 적는 열쇠 — index.html 의 언어 고르기가 같은 이름을 읽는다 */
export const LANG_KEY = 'ashfall.lang';
export const I18N = createI18n({ source: 'ko', lang: LANG, locales: LOCALES, fallback: ['en'], hooks: { ko: koParticle } });
export const tr = I18N.tr;
/** 원문 표시만 — 추출 도구가 원문 목록에 넣는다. 값은 그대로 돌려준다. */
export const N_ = s => s;

/** 원본 언어가 아니면 정적 HTML(index.html)의 글 마디 · 안내 속성을 원문 열쇠로 옮긴다. 옮긴 수를 돌려준다. */
export function localizeDom(root) {
  if (I18N.isSource || !root) return 0;
  let n = 0;
  const HAN = /[\uAC00-\uD7A3]/;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walk.currentNode; node; node = walk.nextNode()) {
    if (node.nodeType === 3) {
      const s = node.data, t = s.trim();
      if (!t || !HAN.test(t) || /^(SCRIPT|STYLE)$/.test(node.parentNode.nodeName)) continue;
      const i = s.indexOf(t);
      node.data = s.slice(0, i) + tr(t) + s.slice(i + t.length); n++;
    } else for (const a of ['placeholder', 'title', 'aria-label', 'alt']) {
      const v = node.getAttribute && node.getAttribute(a);
      if (v && HAN.test(v)) { node.setAttribute(a, tr(v.trim())); n++; }
    }
  }
  return n;
}

/* 숫자 표기의 로케일 — 원본(ko)은 예전 그대로 ko-KR */
const NUM_LOCALE = LANG === 'ko' ? 'ko-KR' : LANG;
/** 숫자 표기 — 백만부터 M · B 로 줄인다. */
export function fmt(n) {
  const v = Math.round(n);
  const a = Math.abs(v);
  if (a < 1e6) { try { return v.toLocaleString(NUM_LOCALE); } catch (e) { return v.toLocaleString(); } }
  /* 반올림한 **표시값**으로 단위를 정한다. */
  let d = 1e6, u = 'M';
  if (a >= 1e9 || Math.abs(v / 1e6).toFixed(2) >= 1000) { d = 1e9; u = 'B'; }
  const t = (v / d).toFixed(2).replace(/\.?0+$/, '');
  return t + u;
}

/** 캔버스 글꼴 — 원본은 예전 그대로('"Pretendard",sans-serif'), 다른 언어는 그 언어 글꼴을 앞에 */
export const FONT = fontStack(LANG, 'ko', '"Pretendard",sans-serif');
export const FONT_UI = fontStack(LANG, 'ko', 'system-ui, sans-serif');
export const FONT_PLAIN = fontStack(LANG, 'ko', 'sans-serif');

/** 언어를 바꾼다 — 글·표는 켤 때 한 번 정해지므로 새로 연다 */
export function setLang(l) {
  try { localStorage.setItem(LANG_KEY, l); } catch (e) { }
  const u = new URL(location.href);
  u.searchParams.delete('lang');
  location.replace(u.href);
}
