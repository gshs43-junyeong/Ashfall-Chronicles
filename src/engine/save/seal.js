/* ===== engine/save/seal.js — 세이브 서명(고쳐 쓴 기록을 가려낸다) ===== */

/** FNV-1a 32비트 두 벌 — 소금(salt)을 섞어 세이브 글자열에 서명한다. */
export function makeSigner(SAVE_SALT) {
  return function saveSign(text) {
    let a = 0x811c9dc5, b = 0x01000193;
    const t = text + SAVE_SALT;
    for (let i = 0; i < t.length; i++) {
      const c = t.charCodeAt(i);
      a ^= c; a = (a + ((a << 1) + (a << 4) + (a << 7) + (a << 8) + (a << 24))) >>> 0;
      b = ((b ^ c) * 16777619) >>> 0;
    }
    return a.toString(36) + '.' + b.toString(36) + '.' + (t.length % 1e6).toString(36);
  };
}
