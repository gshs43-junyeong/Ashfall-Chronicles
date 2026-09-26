/* ===== util.js — 한국어 조사 · 숫자 표기 · HTML 이스케이프(수학·난수는 src/engine/core) ===== */

/** 한국어 조사 '로/으로' — 받침이 없거나 'ㄹ'이면 '로' */
export function josaRo(word) {
  const ch = word.charCodeAt(word.length - 1) - 0xAC00;
  if (ch < 0 || ch > 11171) return '로';
  const jong = ch % 28;
  return (jong === 0 || jong === 8) ? '로' : '으로';
}

/** 한국어 조사 짝 고르기 — josa('검', '이', '가') → '이'. 받침이 있으면 앞엣것. */
export function josa(word, withJong, noJong) {
  const s = String(word), ch = s.charCodeAt(s.length - 1) - 0xAC00;
  if (ch < 0 || ch > 11171) return noJong;
  return ch % 28 ? withJong : noJong;
}
export const iga = w => w + josa(w, '이', '가');
export const eulreul = w => w + josa(w, '을', '를');
export const eunneun = w => w + josa(w, '은', '는');

/** 숫자 포맷 */
/** 숫자 표기. */
export function fmt(n) {
  const v = Math.round(n);
  const a = Math.abs(v);
  if (a < 1e6) return v.toLocaleString('ko-KR');
  /* 반올림한 **표시값**으로 단위를 정한다. */
  let d = 1e6, u = 'M';
  if (a >= 1e9 || Math.abs(v / 1e6).toFixed(2) >= 1000) { d = 1e9; u = 'B'; }
  const t = (v / d).toFixed(2).replace(/\.?0+$/, '');
  return t + u;
}
export function pad2(n) { return n < 10 ? '0' + n : '' + n; }

/** 사용자 입력(플레이어 이름 등)을 innerHTML에 넣기 전에 이스케이프한다 */
export function escHtml(s) { return ('' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
