/* ===== engine/i18n/ko.ts — 한국어 문법: 받침에 맞춘 조사 ===== */
/* 메시지에서는 {이름|을} 처럼 적는다 — '을(를)'처럼 둘 다 적지 않는다. 짝의 어느 쪽을 적어도 같다({이름|를} = {이름|을}). */

/** 받침이 있으면 앞엣것 — josa('검', '이', '가') → '이'. 한글이 아니면 뒤엣것. */
export function josa(word: unknown, withJong: string, noJong: string): string {
  const s = String(word), ch = s.charCodeAt(s.length - 1) - 0xAC00;
  if (ch < 0 || ch > 11171) return noJong;
  return ch % 28 ? withJong : noJong;
}
/** '로/으로' — 받침이 없거나 'ㄹ'이면 '로' */
export function josaRo(word: string): string {
  const ch = word.charCodeAt(word.length - 1) - 0xAC00;
  if (ch < 0 || ch > 11171) return '로';
  const jong = ch % 28;
  return (jong === 0 || jong === 8) ? '로' : '으로';
}
export const iga = (w: string): string => w + josa(w, '이', '가');
export const eulreul = (w: string): string => w + josa(w, '을', '를');
export const eunneun = (w: string): string => w + josa(w, '은', '는');

const PAIRS: [string, string][] = [['을', '를'], ['이', '가'], ['은', '는'], ['과', '와'], ['아', '야'], ['이나', '나'], ['이랑', '랑']];

/** {값|조사} 훅 — 값 뒤에 알맞은 조사를 붙여 돌려준다. 모르는 조사면 null(형식 오류로 친다). */
export function koParticle(v: unknown, p: string): string | null {
  const s = String(v);
  if (p === '로' || p === '으로') return s + josaRo(s);
  for (const [a, b] of PAIRS) if (p === a || p === b) return s + josa(s, a, b);
  return null;
}
