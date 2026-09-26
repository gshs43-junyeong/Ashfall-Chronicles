/* ===== engine/i18n/fonts.ts — 언어별 글꼴 스택 ===== */
/* ★ 한중일 한자는 같은 글자라도 나라마다 자형이 다르다 — 한국어 글꼴이 앞에 있으면 일본어·중국어 한자가 한국식으로 나온다.
   그래서 언어마다 그 언어 글꼴을 앞에 둔다. 파일을 싣지 않고 운영체제 글꼴을 쓴다(오프라인 zip · 용량). */
const STACKS: Record<string, string> = {
  ja: '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP","Noto Sans CJK JP"',
  'zh-Hans': '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC","Noto Sans CJK SC"',
  latin: '-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial'
};
/** 그 언어의 글꼴 스택(끝은 sans-serif) — 원본 언어면 게임이 준 기본 스택 그대로 */
export function fontStack(lang: string, source: string, base: string): string {
  if (lang === source) return base;
  return (STACKS[lang] || STACKS.latin) + ',sans-serif';
}
