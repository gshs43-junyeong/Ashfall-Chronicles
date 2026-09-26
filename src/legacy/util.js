/* ===== util.js — 두 자리 수 · HTML 이스케이프(수학·난수는 src/engine/core, 조사는 engine/i18n/ko, 숫자 표기는 lang.js) ===== */

export function pad2(n) { return n < 10 ? '0' + n : '' + n; }

/** 사용자 입력(플레이어 이름 등)을 innerHTML에 넣기 전에 이스케이프한다 */
export function escHtml(s) { return ('' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
