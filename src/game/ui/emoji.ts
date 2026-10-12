/* ===== ui/emoji.js — 채팅 그림말 스물(열은 움직인다) — 20×20 칸에 손으로 찍고 처음 쓸 때 시트(data URL)로 굽는다 ===== */
/* 글에는 `:이름:` 으로 들어간다(보내는 길은 글 그대로). 그림은 우리 캔버스에서 나온 data URL 이라 file:// 에서도 더럽혀지지 않는다.
   움직이는 것은 가로로 이은 장을 CSS steps 로 넘긴다(.emo.anim) — 크기가 달라도 %로 옮긴다. */

export const EMO_PX = 20;
type Pen = { px: (x: number, y: number, w: number, h: number, c: string) => void; face: (c?: string) => void; eye: (x: number, y: number, c?: string) => void; t: number };
type EmoDef = { k: string; f: number; dur?: number; draw: (p: Pen) => void };

const SKIN = '#ffcf5a', SKIN_D = '#d89a2a', INK = '#2a1a10';

/** 둥근 얼굴(지름 16) — 윗쪽 빛 · 아래 그늘 · 테두리 */
function faceOf(px: Pen['px'], c = SKIN) {
  const rows = [[6, 8], [4, 12], [3, 14], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [3, 14], [4, 12], [6, 8]];
  rows.forEach(([x, w], i) => px(x, 2 + i, w, 1, i > 10 ? SKIN_D : c));
  px(6, 1, 8, 1, INK); px(6, 17, 8, 1, INK);
  rows.forEach(([x, w], i) => { px(x - 1, 2 + i, 1, 1, INK); px(x + w, 2 + i, 1, 1, INK); });
  px(5, 4, 2, 1, '#fff1b8'); px(4, 5, 1, 2, '#fff1b8');
}

export const EMOJI: EmoDef[] = [
  { k: 'smile', f: 1, draw: p => { p.face(); p.eye(7, 7); p.eye(12, 7); p.px(6, 12, 1, 1, INK); p.px(7, 13, 6, 1, INK); p.px(13, 12, 1, 1, INK); } },
  { k: 'grin', f: 1, draw: p => { p.face(); p.px(6, 7, 3, 1, INK); p.px(11, 7, 3, 1, INK); p.px(5, 11, 10, 3, INK); p.px(6, 11, 8, 1, '#fff'); p.px(7, 13, 6, 1, '#e8586a'); } },
  { k: 'laugh', f: 4, dur: 0.5, draw: p => { const dy = p.t % 2; p.face(); p.px(5, 6 + dy, 3, 1, INK); p.px(12, 6 + dy, 3, 1, INK);
    p.px(5, 10 + dy, 10, 4, INK); p.px(6, 10 + dy, 8, 1, '#fff'); p.px(7, 12 + dy, 6, 2, '#e8586a');
    p.px(2, 8 + (p.t * 2) % 6, 2, 2, '#7ad0ff'); p.px(16, 8 + ((p.t * 2 + 3) % 6), 2, 2, '#7ad0ff'); } },
  { k: 'sad', f: 1, draw: p => { p.face(); p.eye(7, 8); p.eye(12, 8); p.px(6, 6, 2, 1, INK); p.px(12, 6, 2, 1, INK); p.px(7, 13, 6, 1, INK); p.px(6, 14, 1, 1, INK); p.px(13, 14, 1, 1, INK); } },
  { k: 'cry', f: 4, dur: 0.6, draw: p => { p.face('#ffd98a'); p.px(6, 7, 3, 1, INK); p.px(11, 7, 3, 1, INK); p.px(7, 13, 6, 1, INK); p.px(6, 12, 1, 1, INK); p.px(13, 12, 1, 1, INK);
    const d = p.t * 3; p.px(7, 8 + d, 1, 2, '#5ab8ff'); p.px(12, 8 + ((d + 5) % 10), 1, 2, '#5ab8ff'); } },
  { k: 'angry', f: 2, dur: 0.4, draw: p => { p.face(p.t ? '#ff8a5a' : '#ff6a4a'); p.px(5, 6, 3, 1, INK); p.px(8, 7, 1, 1, INK); p.px(11, 7, 1, 1, INK); p.px(12, 6, 3, 1, INK);
    p.eye(7, 9); p.eye(12, 9); p.px(7, 13, 6, 1, INK); p.px(15, 1 - p.t, 2, 2, '#e04040'); p.px(17, 3 - p.t, 2, 2, '#e04040'); } },
  { k: 'wow', f: 1, draw: p => { p.face(); p.px(6, 6, 3, 3, '#fff'); p.px(7, 7, 1, 1, INK); p.px(11, 6, 3, 3, '#fff'); p.px(12, 7, 1, 1, INK); p.px(8, 11, 4, 4, INK); p.px(9, 12, 2, 2, '#8a2a2a'); } },
  { k: 'cool', f: 1, draw: p => { p.face(); p.px(4, 7, 12, 1, INK); p.px(5, 7, 4, 3, INK); p.px(11, 7, 4, 3, INK); p.px(6, 8, 1, 1, '#9ad8ff'); p.px(12, 8, 1, 1, '#9ad8ff');
    p.px(8, 13, 5, 1, INK); p.px(13, 12, 1, 1, INK); } },
  { k: 'sleepy', f: 4, dur: 1.2, draw: p => { p.face(); p.px(6, 8, 3, 1, INK); p.px(11, 8, 3, 1, INK); p.px(9, 13, 2, 2, INK);
    const z = p.t; p.px(14, 6 - z, 3, 1, '#cfe4ff'); p.px(15, 7 - z, 1, 1, '#cfe4ff'); p.px(14, 8 - z, 3, 1, '#cfe4ff'); } },
  { k: 'heart', f: 4, dur: 0.7, draw: p => { const s = [0, 1, 0, 0][p.t];
    const rows = [[4, 4, 12, 4], [3, 6, 11, 6], [2, 16], [2, 16], [3, 14], [4, 12], [5, 10], [6, 8], [7, 6], [8, 4], [9, 2]];
    rows.forEach((r, i) => { if (r.length === 4) { p.px(r[0] - s, 3 + i - s, r[1] + s, 1, '#e8445a'); p.px(r[2], 3 + i - s, r[3] + s, 1, '#e8445a'); } else p.px(r[0] - s, 4 + i, r[1] + s * 2, 1, i > 6 ? '#b82a40' : '#e8445a'); });
    p.px(5, 5, 2, 2, '#ffb0c0'); } },
  { k: 'thumbs', f: 1, draw: p => { p.px(5, 9, 10, 8, SKIN); p.px(4, 9, 1, 8, INK); p.px(15, 9, 1, 8, INK); p.px(5, 17, 10, 1, INK); p.px(8, 3, 4, 6, SKIN); p.px(7, 3, 1, 6, INK); p.px(12, 3, 1, 6, INK); p.px(8, 2, 4, 1, INK);
    p.px(6, 12, 9, 1, SKIN_D); p.px(6, 14, 9, 1, SKIN_D); p.px(2, 9, 2, 9, '#4a6aa8'); } },
  { k: 'wave', f: 4, dur: 0.6, draw: p => { const a = [0, 1, 2, 1][p.t]; p.px(6 + a, 8, 8, 9, SKIN); p.px(5 + a, 8, 1, 9, INK); p.px(14 + a, 8, 1, 9, INK);
    for (let i = 0; i < 4; i++) p.px(6 + a + i * 2, 3 + (i === 0 || i === 3 ? 1 : 0), 1, 5, SKIN_D); p.px(4 + a, 11, 2, 3, SKIN); p.px(2 + a, 6, 1, 2, '#ffe08a'); p.px(17 - a, 5, 1, 2, '#ffe08a'); } },
  { k: 'gg', f: 1, draw: p => { p.px(1, 4, 18, 12, '#3a2a5a'); p.px(1, 4, 18, 1, '#6a5a9a');
    for (const ox of [3, 11]) { p.px(ox, 6, 5, 1, '#ffd24a'); p.px(ox, 6, 1, 8, '#ffd24a'); p.px(ox, 13, 5, 1, '#ffd24a'); p.px(ox + 4, 10, 1, 4, '#ffd24a'); p.px(ox + 2, 10, 3, 1, '#ffd24a'); } } },
  { k: 'question', f: 1, draw: p => { p.px(6, 2, 8, 2, '#7ab8ff'); p.px(5, 4, 2, 3, '#7ab8ff'); p.px(13, 4, 2, 4, '#7ab8ff'); p.px(10, 8, 3, 2, '#7ab8ff'); p.px(9, 10, 2, 3, '#7ab8ff'); p.px(9, 15, 2, 2, '#7ab8ff'); } },
  { k: 'alert', f: 1, draw: p => { p.px(8, 2, 4, 10, '#ff5a3a'); p.px(9, 12, 2, 1, '#ff5a3a'); p.px(8, 14, 4, 3, '#ff5a3a'); p.px(8, 2, 1, 10, '#ff9a7a'); } },
  { k: 'skull', f: 1, draw: p => { p.face('#e8e4d8'); p.px(5, 7, 4, 4, INK); p.px(11, 7, 4, 4, INK); p.px(9, 11, 2, 2, INK); p.px(6, 14, 8, 1, INK); for (let x = 7; x < 14; x += 2) p.px(x, 13, 1, 3, INK); } },
  { k: 'fire', f: 4, dur: 0.45, draw: p => { const w = [0, 1, -1, 0][p.t]; p.px(5, 9, 10, 8, '#ff6a2a'); p.px(6 + w, 5, 8, 4, '#ff6a2a'); p.px(8 + w, 2, 4, 3, '#ff6a2a'); p.px(10 - w, 0, 2, 2, '#ff8a3a');
    p.px(7, 11, 6, 6, '#ffb84a'); p.px(8 + w, 8, 4, 3, '#ffb84a'); p.px(9, 13, 2, 4, '#fff1a8'); } },
  { k: 'star', f: 4, dur: 0.8, draw: p => { const c = p.t % 2 ? '#fff1a8' : '#ffd24a'; p.px(9, 1, 2, 18, c); p.px(1, 9, 18, 2, c); p.px(7, 5, 6, 10, c); p.px(5, 7, 10, 6, c);
    if (p.t === 1 || p.t === 2) { p.px(3, 3, 1, 1, '#fff'); p.px(16, 15, 1, 1, '#fff'); p.px(16, 3, 1, 1, '#fff'); } p.px(9, 9, 2, 2, '#fff'); } },
  { k: 'coin', f: 4, dur: 0.6, draw: p => { const w = [12, 8, 2, 8][p.t], x = 10 - w / 2;
    p.px(x, 3, w, 14, '#e8b03a'); p.px(x, 3, w, 1, INK); p.px(x, 16, w, 1, INK); if (w > 3) { p.px(x + 1, 4, 1, 12, '#ffe08a'); p.px(10 - (w > 8 ? 1 : 0), 7, w > 8 ? 2 : 1, 6, '#b8801a'); } } },
  { k: 'ember', f: 4, dur: 0.9, draw: p => { const g = [0, 1, 2, 1][p.t]; const glow = ['#5ad8ff', '#8ae8ff', '#c8f6ff', '#8ae8ff'][p.t];
    if (g) { p.px(9 - g, 3 - g, 2 + g * 2, 14 + g * 2, 'rgba(120,220,255,.25)'); }
    p.px(9, 2, 2, 2, glow); p.px(8, 4, 4, 3, glow); p.px(7, 7, 6, 4, '#3ab0e0'); p.px(8, 11, 4, 3, '#2a88b8'); p.px(9, 14, 2, 2, '#1a5a80'); p.px(9, 5, 1, 5, '#fff'); } }
];
for (const e of EMOJI) {
  const d = e.draw;
  e.draw = p => { p.face = (c?: string) => faceOf(p.px, c); p.eye = (x: number, y: number, c = INK) => p.px(x, y, 2, 2, c); d(p); };
}
export const EMO_KEYS = new Set(EMOJI.map(e => e.k));

const sheets: Record<string, { url: string; img: HTMLCanvasElement }> = {};
/** 그림말 시트 — 처음 부를 때 한 번 굽는다 */
export function emojiSheet(k: string) {
  if (sheets[k]) return sheets[k];
  const e = EMOJI.find(q => q.k === k)!;
  const cv = document.createElement('canvas'); cv.width = EMO_PX * e.f; cv.height = EMO_PX;
  const c = cv.getContext('2d')!;
  for (let t = 0; t < e.f; t++) {
    const pen: any = { t, px: (x: number, y: number, w: number, h: number, col: string) => { if (w > 0 && h > 0) { c.fillStyle = col; c.fillRect(t * EMO_PX + x, y, w, h); } } };
    c.save(); c.beginPath(); c.rect(t * EMO_PX, 0, EMO_PX, EMO_PX); c.clip(); e.draw(pen); c.restore();
  }
  return (sheets[k] = { url: cv.toDataURL(), img: cv });
}
/** HTML 한 칸 — size px(정수 배가 아니어도 pixelated) */
export function emojiHtml(k: string, size = 20) {
  const e = EMOJI.find(q => q.k === k); if (!e) return '';
  const s = emojiSheet(k);
  return `<i class="emo${e.f > 1 ? ' anim' : ''}" title=":${k}:" style="width:${size}px;height:${size}px;background-image:url(${s.url});` +
    `background-size:${e.f * 100}% 100%;--n:${e.f};--d:${e.dur || 0.6}s"></i>`;
}
/** 이미 escHtml 된 글의 `:이름:` 을 그림으로 */
export function emojify(html: string, size = 20) {
  return html.replace(/:([a-z]+):/g, (m, k) => EMO_KEYS.has(k) ? emojiHtml(k, size) : m);
}
/** 글이 그림말 하나뿐이면 그 이름 */
export function soloEmoji(s: string) {
  const m = /^\s*:([a-z]+):\s*$/.exec(s || '');
  return m && EMO_KEYS.has(m[1]) ? m[1] : null;
}
/** 캔버스에 — time 으로 장을 고른다 */
export function drawEmoji(c: CanvasRenderingContext2D, k: string, x: number, y: number, size: number, time: number) {
  const e = EMOJI.find(q => q.k === k); if (!e) return;
  const s = emojiSheet(k), fr = e.f > 1 ? Math.floor(time / ((e.dur || 0.6) / e.f)) % e.f : 0;
  c.save(); c.imageSmoothingEnabled = false;
  c.drawImage(s.img, fr * EMO_PX, 0, EMO_PX, EMO_PX, Math.round(x), Math.round(y), size, size);
  c.restore();
}
