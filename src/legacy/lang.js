/* ===== lang.js — 번역 창구: tr(원문, 값) · 언어 고르기 ===== */
/* 코드의 한국어 문구는 tr('원문', { 값 }) 으로 쓴다 — 원문이 곧 열쇠이고, 한국어에서는 원문 그대로 나온다.
   값은 {이름} 자리표로, 조사는 {이름|을} 로(엔진 ko.ts). 표(아이템 이름 따위)는 id 경로로 따로 덮는다(I18N.applyTables).
   번역을 찾을 수 없는 자리(기계 상태처럼 값으로 비교하는 글)는 N_('원문') 으로 적어 두고 보여 줄 때 tr(값). */
import { createI18n } from '../engine/i18n/i18n.js';
import { koParticle } from '../engine/i18n/ko.js';

/** 언어별 번역 묶음 { msgs, tables } — 원본(ko)은 비어 있다. 번들보다 먼저 읽힌 로케일 스크립트가
    globalThis.ASHFALL_LOCALES 에 싣는다(file:// 에서는 fetch 가 막혀 JSON 을 못 읽는다). */
export const LOCALES = (typeof globalThis !== 'undefined' && globalThis.ASHFALL_LOCALES) || {};
export const LANG = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang')) || 'ko';
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
