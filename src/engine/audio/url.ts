/* ===== engine/audio/url.ts — 소리 주소에 판 번호(?v=) ===== */
/* ★ 번들 <script src="js/ashfall.js?v=NNN"> 의 ?v= 를 물려받는다 — 읽히는 순간에만 document.currentScript 가 있다. */
export const AUD_VER = (document.currentScript && (document.currentScript as HTMLScriptElement).src.split('?')[1]) || '';
export const aud = (src: string): string => src + (AUD_VER ? (src.includes('?') ? '&' : '?') + AUD_VER : '');
