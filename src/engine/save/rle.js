/* ===== engine/save/rle.js — 배열 RLE(세이브의 타일·벽지·탐험) ===== */

/** 배열 RLE 압축 (저장용) */
/* ★ 세이브의 타일·벽지·탐험 배열은 **글자열** RLE 다 — 사연: docs/code-history.md#h100 */
export const RLE_V = 0x100, RLE_N = 0x1000, RLE_MAX = 0x6FFF;
export function rleEncode(arr) {
  const out = ['r1'];
  let buf = '';
  let cur = arr[0], run = 1;
  const put = () => {
    buf += String.fromCharCode(RLE_V + cur, RLE_N + run);
    if (buf.length > 8192) { out.push(buf); buf = ''; }
  };
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === cur && run < RLE_MAX) run++;
    else { put(); cur = arr[i]; run = 1; }
  }
  put();
  out.push(buf);
  return out.join('');
}
export function rleDecode(pairs, len, Ctor) {
  const out = new Ctor(len);
  let i = 0;
  if (typeof pairs === 'string') {
    for (let p = 2; p + 1 < pairs.length; p += 2) {
      const v = pairs.charCodeAt(p) - RLE_V, n = pairs.charCodeAt(p + 1) - RLE_N;
      for (let k = 0; k < n && i < len; k++) out[i++] = v;
    }
    return out;
  }
  for (let p = 0; p < pairs.length; p += 2) {
    const v = pairs[p], n = pairs[p + 1];
    for (let k = 0; k < n && i < len; k++) out[i++] = v;
  }
  return out;
}
