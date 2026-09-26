/* ===== util.js — 숫자 표기 · HTML 이스케이프(수학·난수는 src/engine/core, 한국어 조사는 src/engine/i18n/ko) ===== */

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
