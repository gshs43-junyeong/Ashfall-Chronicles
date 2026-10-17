/* ===== ui/emoji.js — 채팅 그림말(표정 · 신호 · 잿빛 땅) — 20×20 칸에 찍어 처음 쓸 때 장(frame) 시트로 굽는다 ===== */
/* 글에는 `:이름:` 으로 들어간다(보내는 길은 글 그대로). 그림은 우리 캔버스에서 나온 것이라 file:// 에서도 더럽혀지지 않는다.
   ★ 화면에는 <canvas class="emo"> 로 낸다 — CSS 배경 시트를 % 로 넘기면 UI 배율 · 화면 배율이 정수가 아닐 때 옆 장이 한 줄씩
   비쳐 들어와 그림 끝이 잘려 보였다. 움직이는 것은 `tickEmoji` 하나가 화면에 붙은 캔버스만 다시 그린다. */

export const EMO_PX = 20;
type Px = (x: number, y: number, w: number, h: number, c: string) => void;
type Pen = { px: Px; t: number; face: (o?: FaceOpt) => void };
type FaceOpt = { c?: string; d?: string; dy?: number; blush?: boolean };
/** g: 'face' 표정 · 'sign' 신호 · 'af' 잿빛 땅(Ashfall 고유) */
export type EmoDef = { k: string; g: 'face' | 'sign' | 'af'; f: number; dur?: number; draw: (p: Pen) => void };

const SKIN = '#ffcf5a', SKIN_D = '#e2a23a', SKIN_L = '#fff0b0', INK = '#2a1a10', BLUSH = '#f49a7a';
const TEAR = '#5ab8ff', TEAR_L = '#bfe6ff', MOUTH = '#8a2a2a', TONGUE = '#e8586a';

/** 둥근 얼굴 — 원 하나를 칸마다 재서 테두리 · 아래 그늘 · 왼쪽 위 빛을 칠한다(손으로 찍은 줄 표는 들쭉날쭉했다) */
function faceOf(px: Px, o: FaceOpt = {}) {
  const cx = 10, cy = 10.5 + (o.dy || 0), r = 8.3, c = o.c || SKIN, d = o.d || SKIN_D;
  const inside = (x: number, y: number) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;
  for (let y = 0; y < EMO_PX; y++) for (let x = 0; x < EMO_PX; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    const u = (x + 0.5 - cx) * 0.45 + (y + 0.5 - cy);           // 오른쪽 아래로 갈수록 그늘
    px(x, y, 1, 1, edge ? INK : u > 5.2 ? d : c);
  }
  const t = cy - 10.5;
  px(5, 4 + t, 3, 1, SKIN_L); px(4, 5 + t, 1, 2, SKIN_L);       // 빛
  if (o.blush) { px(3, 12 + t, 2, 1, BLUSH); px(15, 12 + t, 2, 1, BLUSH); }
}
/** 모양 칠하기 — test 가 칸 가운데에서 색을 주면 칠하고, 둘레(이웃 하나라도 비면)는 먹선 */
function blob(p: Pen, test: (x: number, y: number) => string | null) {
  const at = (x: number, y: number) => x < 0 || y < 0 || x >= EMO_PX || y >= EMO_PX ? null : test(x + 0.5, y + 0.5);
  for (let y = 0; y < EMO_PX; y++) for (let x = 0; x < EMO_PX; x++) {
    const c = at(x, y); if (!c) continue;
    p.px(x, y, 1, 1, !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1) ? INK : c);
  }
}
/** 점 눈 2×2 */
const dot = (p: Pen, x: number, y: number, c = INK) => p.px(x, y, 2, 2, c);

/* 손 흔들기 격자 — 20×20 */
const HAND_COL: Record<string, string> = { K: INK, S: SKIN, L: SKIN_L, D: SKIN_D, B: '#4a6aa8', b: '#7a9ad8' };
const WAVE_HAND = [
      '....................',
      '........KK..........',
      '.....KKKLSKKK.......',
      '....KLSKSSKLSK......',
      '....KSSKSSKSSKKK....',
      '....KSSKSSKSSKLDK...',
      '....KSSKSSKSSKSDK...',
      '....KSSKSSKSSKSDK...',
      '..KKKSSKSSKSSKSDK...',
      '.KLLKSSDSSDSSDSDK...',
      '.KSSSSSSSSSSSSSDK...',
      '.KSSSSSSSSSSSSSDK...',
      '..KSSSSSDDDDSSSDK...',
      '...KSSSSSSSSSSSDK...',
      '.....KSSSSSSSSDK....',
      '......KSSSSSSSK.....',
      '......KbbbbbbbK.....',
      '......KBBBBBBBK.....',
      '......KKKKKKKKK.....',
      '....................'
];

export const EMOJI: EmoDef[] = [
  /* ---- 표정 ---- */
  { k: 'smile', g: 'face', f: 1, draw: p => { p.face({ blush: true }); dot(p, 6, 8); dot(p, 12, 8);
    p.px(6, 12, 1, 1, INK); p.px(7, 13, 6, 1, INK); p.px(13, 12, 1, 1, INK); } },
  { k: 'grin', g: 'face', f: 1, draw: p => { p.face({ blush: true });
    for (const x of [5, 12]) { p.px(x, 9, 1, 1, INK); p.px(x + 1, 8, 1, 1, INK); p.px(x + 2, 9, 1, 1, INK); }   // ^ ^
    p.px(6, 11, 8, 1, INK); p.px(6, 12, 1, 1, INK); p.px(7, 12, 6, 1, '#fff'); p.px(13, 12, 1, 1, INK);
    p.px(7, 13, 1, 1, INK); p.px(8, 13, 4, 1, TONGUE); p.px(12, 13, 1, 1, INK); p.px(8, 14, 4, 1, INK); } },
  { k: 'laugh', g: 'face', f: 4, dur: 0.48, draw: p => { const dy = p.t % 2;      // 들썩이며 웃는다 · 눈물이 바깥으로 튄다
    p.face({ dy: -dy, blush: true }); const y = -dy;
    p.px(5, 7 + y, 1, 1, INK); p.px(6, 8 + y, 1, 1, INK); p.px(5, 9 + y, 1, 1, INK);               // >
    p.px(14, 7 + y, 1, 1, INK); p.px(13, 8 + y, 1, 1, INK); p.px(14, 9 + y, 1, 1, INK);            // <
    p.px(6, 11 + y, 8, 1, INK); p.px(6, 12 + y, 1, 3, INK); p.px(13, 12 + y, 1, 3, INK); p.px(7, 15 + y, 6, 1, INK);
    p.px(7, 12 + y, 6, 1, '#fff'); p.px(7, 13 + y, 6, 2, MOUTH); p.px(8, 14 + y, 4, 1, TONGUE);
    const k = p.t;                                                                                  // 눈물 — 얼굴 안쪽 칸만
    p.px(3 - (k >> 1), 7 + k, 1, 2, TEAR); p.px(16 + (k >> 1), 7 + k, 1, 2, TEAR); } },
  { k: 'sad', g: 'face', f: 1, draw: p => { p.face();
    p.px(5, 7, 2, 1, INK); p.px(7, 6, 1, 1, INK); p.px(12, 6, 1, 1, INK); p.px(13, 7, 2, 1, INK);   // 안쪽이 올라간 눈썹
    dot(p, 6, 9); dot(p, 12, 9);
    p.px(7, 14, 6, 1, INK); p.px(6, 15, 1, 1, INK); p.px(13, 15, 1, 1, INK); } },
  { k: 'cry', g: 'face', f: 4, dur: 0.6, draw: p => { p.face();
    p.px(5, 7, 2, 1, INK); p.px(7, 6, 1, 1, INK); p.px(12, 6, 1, 1, INK); p.px(13, 7, 2, 1, INK);
    p.px(5, 9, 3, 1, INK); p.px(12, 9, 3, 1, INK);                                                  // 꼭 감은 눈
    for (const x of [6, 13]) for (let y = 10; y < 16; y++) p.px(x, y, 1, 1, (y + p.t) % 3 === 0 ? TEAR_L : TEAR);   // 흐르는 눈물 줄기
    p.px(8, 14, 1, 1, INK); p.px(9, 13, 2, 1, INK); p.px(11, 14, 1, 1, INK);                       // 떨리는 입
    p.px(13, 16 + (p.t & 1), 1, 1, TEAR); } },
  { k: 'angry', g: 'face', f: 2, dur: 0.4, draw: p => {
    p.face({ c: p.t ? '#ff8a5a' : '#ff7048', d: '#d84a30' });
    p.px(5, 6, 1, 1, INK); p.px(6, 7, 2, 1, INK); p.px(8, 8, 1, 1, INK);                            // 사나운 V 눈썹
    p.px(14, 6, 1, 1, INK); p.px(12, 7, 2, 1, INK); p.px(11, 8, 1, 1, INK);
    p.px(6, 9, 2, 1, INK); p.px(12, 9, 2, 1, INK);
    p.px(6, 12, 8, 3, INK); p.px(7, 13, 6, 1, '#fff'); p.px(9, 13, 1, 1, INK); p.px(11, 13, 1, 1, INK);   // 악문 이
    const v = '#c0201a', s = p.t;                                                                   // 핏대 — 얼굴 오른쪽 위 안
    p.px(13, 3, 1, 1 + s, v); p.px(14, 3, 1 + s, 1, v); p.px(16 + s, 3, 1, 1 + s, v); p.px(15 + s, 3, 1, 1, v);
    p.px(13, 6 + s, 1, 1, v); p.px(14, 6 + s, 1, 1, v); } },
  { k: 'wow', g: 'face', f: 1, draw: p => { p.face();
    p.px(5, 5, 3, 1, INK); p.px(12, 5, 3, 1, INK);                                                  // 올라간 눈썹
    for (const x of [5, 12]) { p.px(x, 7, 3, 3, '#fff'); p.px(x, 7, 3, 1, INK); p.px(x + 1, 8, 1, 2, INK); }
    p.px(9, 12, 2, 1, INK); p.px(8, 13, 1, 2, INK); p.px(11, 13, 1, 2, INK); p.px(9, 15, 2, 1, INK); p.px(9, 13, 2, 2, MOUTH); } },
  { k: 'cool', g: 'face', f: 1, draw: p => { p.face();
    p.px(3, 7, 14, 1, INK); p.px(4, 7, 5, 3, INK); p.px(11, 7, 5, 3, INK); p.px(5, 10, 3, 1, INK); p.px(12, 10, 3, 1, INK);
    p.px(5, 8, 1, 1, '#9ad8ff'); p.px(12, 8, 1, 1, '#9ad8ff');
    p.px(8, 14, 4, 1, INK); p.px(12, 13, 1, 1, INK); } },
  { k: 'sleepy', g: 'face', f: 4, dur: 1.4, draw: p => { p.face();
    p.px(5, 9, 3, 1, INK); p.px(5, 8, 1, 1, INK); p.px(12, 9, 3, 1, INK); p.px(14, 8, 1, 1, INK);   // 내리감은 눈
    p.px(9, 13, 2, 2, INK); p.px(9, 13, 1, 1, MOUTH);
    const zy = 5 - p.t, a = ['#e8f2ff', '#cfe4ff', '#a8c8f0', '#7a9ac8'][p.t];                      // Z 가 떠오르며 옅어진다
    p.px(14, zy, 3, 1, a); p.px(15, zy + 1, 1, 1, a); p.px(14, zy + 2, 3, 1, a);
    if (p.t < 2) { p.px(17, zy + 4, 2, 1, a); p.px(17, zy + 5, 2, 1, a); } } },
  { k: 'skull', g: 'face', f: 1, draw: p => {
    const B = '#ece6d6', BD = '#b8ae98';
    p.face({ c: B, d: BD, dy: -1 });
    p.px(6, 16, 8, 3, B); p.px(5, 16, 1, 3, INK); p.px(14, 16, 1, 3, INK); p.px(6, 19, 8, 1, INK);   // 턱
    for (let x = 7; x < 14; x += 2) p.px(x, 16, 1, 3, INK);
    p.px(5, 8, 4, 4, INK); p.px(11, 8, 4, 4, INK); p.px(6, 9, 1, 1, '#ff6a4a'); p.px(12, 9, 1, 1, '#ff6a4a');
    p.px(9, 12, 2, 2, INK); } },
  /* ---- 신호 ---- */
  { k: 'heart', g: 'sign', f: 4, dur: 0.7, draw: p => {
    /* ★ 식으로 그리면 아래 끝이 뭉툭하게 잘렸다 — 줄 표(행: [시작, 끝] 칸)로 찍고 아래는 두 칸 꼭지로 모은다. 박동 장은 한 둘레 부푼 표 */
    const S: [number, number][][][] = [
      [[], [], [], [[4, 7], [12, 15]], [[3, 8], [11, 16]], [[2, 17]], [[2, 17]], [[2, 17]], [[2, 17]], [[3, 16]], [[4, 15]], [[5, 14]], [[6, 13]], [[7, 12]], [[8, 11]], [[9, 10]]],
      [[], [], [[4, 7], [12, 15]], [[3, 8], [11, 16]], [[2, 9], [10, 17]], [[1, 18]], [[1, 18]], [[1, 18]], [[1, 18]], [[2, 17]], [[3, 16]], [[4, 15]], [[5, 14]], [[6, 13]], [[7, 12]], [[8, 11]], [[9, 10]]]
    ];
    const big = p.t === 1, T = S[big ? 1 : 0], tip = T.length - 1;
    blob(p, (x, y) => {
      const r = T[Math.floor(y)]; if (!r) return null;
      return r.some(([a, b]) => x >= a && x < b + 1) ? (y > tip - 4 ? '#c22a44' : '#e8445a') : null;
    });
    const o = big ? -1 : 0; p.px(4 + o, 5 + o, 2, 2, '#ffb0c0'); p.px(3 + o, 7 + o, 1, 1, '#ffb0c0'); } },
  { k: 'thumbs', g: 'sign', f: 1, draw: p => {
    /* 옆에서 본 주먹 — 엄지는 둥근 끝으로 곧게, 네 손가락은 오른쪽으로 말린 마디, 왼쪽은 소매 */
    blob(p, (x, y) => {
      if (x >= 7 && x < 11 && y >= 4.5 && y < 10 && !(y < 5.5 && (x < 8 || x >= 10))) return x >= 9.6 ? SKIN_D : SKIN;   // 엄지 — 주먹 위로 네 칸
      if (x >= 6 && x < 16 && y >= 9 && y < 18 && !((x < 7 || x >= 15) && (y < 10 || y >= 17))) {                       // 주먹
        if (x >= 9 && x < 16 && Math.floor(y) % 2 === 0 && y >= 11 && y < 17) return SKIN_D;                             // 손가락 마디 사이
        return x >= 14 ? SKIN_D : SKIN;
      }
      if (x >= 2 && x < 6 && y >= 10 && y < 18) return y < 11 ? '#7a9ad8' : '#4a6aa8';                                   // 소매
      return null;
    });
    p.px(8, 6, 1, 2, SKIN_L); p.px(7, 11, 1, 3, SKIN_L); } },
  { k: 'wave', g: 'sign', f: 4, dur: 0.8, draw: p => {
    /* 편 손바닥 — 손으로 찍은 격자(K 먹선 · S 살 · L 빛 · D 그늘 · B/b 소매). 장마다 통째로 한 칸씩만 옮긴다.
       ★ 식으로 그리거나 기울이면 손가락 끝 · 엄지가 장마다 모양이 바뀌어 떨렸고, 칸 끝에서 잘렸다 — 좌우 한 칸 여백을 둔다 */
    const o = [-1, 0, 1, 0][p.t];
    WAVE_HAND.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = HAND_COL[r[x]]; if (c) p.px(x + o, y, 1, 1, c); } });
  } },
  { k: 'gg', g: 'sign', f: 1, draw: p => { p.px(1, 4, 18, 12, '#3a2a5a'); p.px(1, 4, 18, 1, '#6a5a9a'); p.px(1, 15, 18, 1, '#24183a');
    for (const ox of [3, 11]) { p.px(ox, 6, 5, 1, '#ffd24a'); p.px(ox, 6, 1, 8, '#ffd24a'); p.px(ox, 13, 5, 1, '#ffd24a'); p.px(ox + 4, 10, 1, 4, '#ffd24a'); p.px(ox + 2, 10, 3, 1, '#ffd24a'); } } },
  { k: 'question', g: 'sign', f: 1, draw: p => { const c = '#7ab8ff'; p.px(6, 2, 8, 2, c); p.px(4, 4, 3, 3, c); p.px(13, 4, 3, 4, c); p.px(11, 8, 3, 2, c); p.px(9, 10, 3, 3, c); p.px(9, 15, 3, 3, c); p.px(6, 2, 8, 1, '#bfe0ff'); } },
  { k: 'alert', g: 'sign', f: 1, draw: p => { p.px(8, 2, 4, 10, '#ff5a3a'); p.px(9, 12, 2, 1, '#ff5a3a'); p.px(8, 14, 4, 4, '#ff5a3a'); p.px(8, 2, 1, 10, '#ff9a7a'); } },
  { k: 'fire', g: 'sign', f: 4, dur: 0.45, draw: p => { const w = [0, 1, -1, 0][p.t];
    p.px(5, 10, 10, 8, '#ff6a2a'); p.px(6 + w, 6, 8, 4, '#ff6a2a'); p.px(8 + w, 3, 4, 3, '#ff6a2a'); p.px(10 - w, 1, 2, 2, '#ff8a3a');
    p.px(4, 13, 1, 4, '#ff6a2a'); p.px(15, 12, 1, 5, '#ff6a2a');
    p.px(7, 12, 6, 6, '#ffb84a'); p.px(8 + w, 9, 4, 3, '#ffb84a'); p.px(9, 14, 2, 4, '#fff1a8'); } },
  { k: 'star', g: 'sign', f: 4, dur: 0.8, draw: p => { const c = p.t % 2 ? '#fff1a8' : '#ffd24a';
    p.px(9, 2, 2, 16, c); p.px(2, 9, 16, 2, c); p.px(7, 6, 6, 8, c); p.px(6, 7, 8, 6, c);
    if (p.t === 1 || p.t === 2) { p.px(3, 3, 1, 1, '#fff'); p.px(16, 15, 1, 1, '#fff'); p.px(16, 3, 1, 1, '#fff'); } p.px(9, 9, 2, 2, '#fff'); } },
  { k: 'coin', g: 'sign', f: 4, dur: 0.6, draw: p => { const w = [12, 8, 2, 8][p.t], x = 10 - w / 2;
    p.px(x, 3, w, 14, '#e8b03a'); p.px(x, 3, w, 1, INK); p.px(x, 16, w, 1, INK);
    if (w > 3) { p.px(x, 4, 1, 12, INK); p.px(x + w - 1, 4, 1, 12, INK); p.px(x + 1, 4, 1, 12, '#ffe08a'); p.px(10 - (w > 8 ? 1 : 0), 7, w > 8 ? 2 : 1, 6, '#b8801a'); } } },
  { k: 'ember', g: 'sign', f: 4, dur: 0.9, draw: p => { const g = [0, 1, 2, 1][p.t], glow = ['#5ad8ff', '#8ae8ff', '#c8f6ff', '#8ae8ff'][p.t];
    if (g) p.px(9 - g, 3 - g, 2 + g * 2, 14 + g * 2, 'rgba(120,220,255,.25)');
    p.px(9, 2, 2, 2, glow); p.px(8, 4, 4, 3, glow); p.px(7, 7, 6, 4, '#3ab0e0'); p.px(8, 11, 4, 3, '#2a88b8'); p.px(9, 14, 2, 2, '#1a5a80'); p.px(9, 5, 1, 5, '#fff'); } },
  /* ---- 잿빛 땅 — 이 게임에서만 쓰는 것들 ---- */
  { k: 'starfall', g: 'af', f: 6, dur: 0.9, draw: p => {                                             // 휘어 떨어지는 별(로고 · 탭 아이콘의 별)
    const tail = [[17, 2], [16, 3], [15, 4], [14, 5], [13, 6], [12, 7], [11, 8], [10, 9], [9, 10]];
    tail.forEach(([x, y], i) => { const on = (i + p.t) % 3 === 0; p.px(x, y, 2, 1, on ? '#fff4c8' : i < 3 ? '#5a8ac8' : i < 6 ? '#8ac0f0' : '#d8ecff'); });
    const c = p.t % 3 === 0 ? '#ffffff' : '#ffe08a';
    p.px(6, 9, 1, 7, c); p.px(3, 12, 7, 1, c); p.px(5, 11, 3, 3, c); p.px(6, 12, 1, 1, '#fff');
    if (p.t % 2) { p.px(2, 9, 1, 1, '#fff4c8'); p.px(10, 15, 1, 1, '#fff4c8'); } } },
  { k: 'ashfall', g: 'af', f: 4, dur: 1.2, draw: p => {                                              // 잿빛 하늘 — 구름에서 재가 내린다
    const puffs = [[6, 5, 3.2], [10, 3.6, 3.6], [14, 5.2, 3]];
    const inC = (x: number, y: number) => y <= 7 && puffs.some(([cx, cy, r]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r);
    for (let y = 0; y < 9; y++) for (let x = 0; x < EMO_PX; x++) {
      if (!inC(x, y)) continue;
      const edge = !inC(x - 1, y) || !inC(x + 1, y) || !inC(x, y - 1) || !inC(x, y + 1);
      p.px(x, y, 1, 1, edge ? '#2a2622' : y < 4 ? '#b8b2a6' : y < 6 ? '#8e887c' : '#6a645a');
    }
    const fl = [[4, 0], [8, 2], [12, 1], [15, 3], [6, 3], [10, 0], [13, 2]];
    fl.forEach(([x, o], i) => { const y = 9 + ((p.t * 3 + o * 3) % 11); p.px(x + ((y >> 2) & 1), y, 1 + (i % 3 === 0 ? 1 : 0), 1, i % 2 ? '#d8d2c4' : '#a8a296'); });
    p.px(9, 9 + ((p.t * 3 + 5) % 11), 1, 1, '#ff8a3a'); } },                                        // 불씨 한 톨
  { k: 'pick', g: 'af', f: 1, draw: p => {                                                           // 곡괭이
    for (let i = 0; i < 11; i++) p.px(4 + i, 16 - i, 2, 2, i % 3 === 0 ? '#6a4420' : '#8a5a2a');
    p.px(3, 16, 2, 2, '#4a2e14');
    const head = [[6, 4], [7, 3], [8, 3], [9, 2], [10, 2], [11, 2], [12, 2], [13, 3], [14, 3], [15, 4], [16, 5], [17, 6], [17, 7]];
    head.forEach(([x, y]) => { p.px(x, y, 1, 2, '#a8b0b8'); p.px(x, y, 1, 1, '#e0e6ea'); });
    p.px(5, 5, 1, 2, '#a8b0b8'); p.px(17, 8, 1, 2, '#a8b0b8'); p.px(12, 4, 3, 3, '#6a7078'); } },
  { k: 'slime', g: 'af', f: 4, dur: 0.6, draw: p => {                                                // 잿빛 슬라임 — 둥근 방울이 출렁인다
    const sq = [0, 1, 2, 1][p.t], rx = 7.4 + sq * 0.8, ry = 10 - sq * 1.2, cx = 10, cy = 17;
    const inS = (x: number, y: number) => y < cy && ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
    p.px(3, 17, 14, 1, 'rgba(0,0,0,.3)');
    for (let y = 0; y < 17; y++) for (let x = 0; x < EMO_PX; x++) {
      if (!inS(x, y)) continue;
      const edge = !inS(x - 1, y) || !inS(x + 1, y) || !inS(x, y - 1) || y === 16;
      p.px(x, y, 1, 1, edge ? '#2a2e2a' : y > 14 ? '#626a62' : '#8e968c');
    }
    const top = Math.round(cy - ry);
    p.px(6, top + 2, 2, 1, '#d8dcd2'); p.px(5, top + 3, 1, 1, '#d8dcd2');
    dot(p, 7 - (sq >> 1), top + 4); dot(p, 11 + (sq >> 1), top + 4);
    p.px(7 - (sq >> 1), top + 4, 1, 1, '#fff'); p.px(11 + (sq >> 1), top + 4, 1, 1, '#fff'); } },
  { k: 'campfire', g: 'af', f: 4, dur: 0.5, draw: p => {                                             // 베이스캠프 모닥불
    const w = [0, 1, 0, -1][p.t];
    p.px(3, 16, 14, 2, '#6a4420'); p.px(5, 15, 10, 1, '#8a5a2a'); p.px(3, 16, 1, 2, INK); p.px(16, 16, 1, 2, INK);
    p.px(5, 9, 10, 6, '#ff6a2a'); p.px(7 + w, 6, 6, 3, '#ff6a2a'); p.px(9 + w, 3, 2, 3, '#ff8a3a');
    p.px(7, 10, 6, 5, '#ffb84a'); p.px(9 - w, 7, 2, 3, '#ffd06a'); p.px(9, 12, 2, 3, '#fff1a8');
    p.px(4 + p.t * 3 % 12, 2 + (p.t & 1), 1, 1, '#ff9a4a'); p.px(15 - p.t * 2, 1 + (p.t >> 1), 1, 1, '#ffd06a'); } },
  { k: 'rune', g: 'af', f: 4, dur: 1.0, draw: p => {                                                 // 유적 석판 — 맥박에 문양이 빛난다
    const g = ['#3a8aa8', '#5ac8e8', '#a8f0ff', '#5ac8e8'][p.t];
    p.px(4, 2, 12, 16, '#5a564e'); p.px(4, 2, 12, 1, '#7a766c'); p.px(3, 3, 1, 15, INK); p.px(16, 3, 1, 15, INK); p.px(4, 1, 12, 1, INK); p.px(3, 18, 14, 1, INK);
    p.px(5, 16, 10, 2, '#46423c');
    if (p.t === 2) p.px(5, 4, 10, 11, 'rgba(120,220,255,.18)');
    p.px(9, 4, 2, 10, g); p.px(6, 6, 8, 1, g); p.px(6, 11, 2, 2, g); p.px(12, 11, 2, 2, g); p.px(7, 8, 1, 2, g); p.px(12, 8, 1, 2, g); } },
  { k: 'egg', g: 'af', f: 4, dur: 0.8, draw: p => {                                                  // 용의 알 — 흔들리다 금이 간다
    const o = [0, 1, 0, -1][p.t], cx = 10 + o * 0.5, cy = 11;
    for (let y = 0; y < EMO_PX; y++) for (let x = 0; x < EMO_PX; x++) {
      const u = (x + 0.5 - cx - (y - cy) * o * 0.08) / 6, v = (y + 0.5 - cy) / (y < cy ? 8.5 : 7);
      const d = u * u + v * v; if (d > 1) continue;
      p.px(x, y, 1, 1, d > 0.82 ? INK : (x + y) % 5 === 0 && d < 0.6 ? '#e85a2a' : y > 14 ? '#a83a1a' : '#d8642a');
    }
    p.px(8, 5, 2, 2, '#ffb88a');
    if (p.t >= 2) { p.px(11, 8, 1, 2, INK); p.px(12, 10, 1, 1, INK); p.px(11, 11, 1, 2, INK); p.px(12, 9, 1, 1, '#fff1a8'); } } },
  { k: 'fish', g: 'af', f: 4, dur: 0.8, draw: p => {                                                 // 낚시 겨루기 — 물고기가 튀어 오른다
    const ys = [12, 7, 5, 9][p.t], ang = [1, 0, 0, -1][p.t];
    p.px(1, 16, 18, 3, '#2a6a98'); p.px(1, 16, 18, 1, '#6ab8e8');
    const x0 = 5;
    p.px(x0 + 2, ys, 6, 4, '#9ac8e0'); p.px(x0 + 1, ys + 1, 8, 2, '#9ac8e0'); p.px(x0 + 2, ys + 3, 6, 1, '#5a90b0');
    p.px(x0 + 9, ys + ang, 2, 1, '#5a90b0'); p.px(x0 + 9, ys + 3 - ang, 2, 1, '#5a90b0'); p.px(x0 + 9, ys + 1, 1, 2, '#5a90b0');
    p.px(x0 + 2, ys + 1, 1, 1, INK); p.px(x0 + 4, ys, 3, 1, '#d8f0ff');
    if (p.t === 0 || p.t === 3) { p.px(4, 15, 1, 1, '#d8f0ff'); p.px(15, 14, 1, 1, '#d8f0ff'); }
    else { p.px(3, 13, 1, 1, '#d8f0ff'); p.px(16, 12, 1, 1, '#d8f0ff'); } } }
];
for (const e of EMOJI) {
  const d = e.draw;
  e.draw = p => { p.face = (o?: FaceOpt) => faceOf(p.px, o); d(p); };
}
export const EMO_KEYS = new Set(EMOJI.map(e => e.k));
const emoOf = (k: string) => EMOJI.find(q => q.k === k);

const sheets: Record<string, HTMLCanvasElement> = {};
/** 그림말 시트 — 처음 부를 때 한 번 굽는다(장을 가로로) */
export function emojiSheet(k: string) {
  if (sheets[k]) return { img: sheets[k] };
  const e = emoOf(k)!;
  const cv = document.createElement('canvas'); cv.width = EMO_PX * e.f; cv.height = EMO_PX;
  const c = cv.getContext('2d')!;
  for (let t = 0; t < e.f; t++) {
    const pen: any = { t, px: (x: number, y: number, w: number, h: number, col: string) => {
      if (w <= 0 || h <= 0) return;
      const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));                    // 칸 밖으로는 안 칠한다(옆 장 침범 방지)
      const x1 = Math.min(EMO_PX, Math.round(x + w)), y1 = Math.min(EMO_PX, Math.round(y + h));
      if (x1 > x0 && y1 > y0) { c.fillStyle = col; c.fillRect(t * EMO_PX + x0, y0, x1 - x0, y1 - y0); }
    } };
    e.draw(pen);
  }
  sheets[k] = cv;
  return { img: cv };
}
/** 지금 시각의 장 번호 */
const frameAt = (e: EmoDef, time: number) => e.f > 1 ? Math.floor(time / ((e.dur || 0.6) / e.f)) % e.f : 0;
/** HTML 한 칸 — 캔버스(장 하나 크기). 넣은 뒤 `hydrateEmoji` 가 그린다 */
export function emojiHtml(k: string, size = 20) {
  return emoOf(k) ? `<canvas class="emo" data-emo="${k}" width="${EMO_PX}" height="${EMO_PX}" title=":${k}:" style="width:${size}px;height:${size}px"></canvas>` : '';
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
/* 움직이는 그림말 캔버스 — 화면에서 떨어진 것은 다음 틱에 놓는다 */
const live = new Set<HTMLCanvasElement>();
let ticker = 0;
function paint(cv: HTMLCanvasElement, time: number) {
  const k = cv.dataset.emo!, e = emoOf(k); if (!e) return;
  const c = cv.getContext('2d')!, fr = frameAt(e, time);
  if (cv.dataset.fr === String(fr)) return;
  cv.dataset.fr = String(fr);
  c.clearRect(0, 0, EMO_PX, EMO_PX); c.drawImage(emojiSheet(k).img, fr * EMO_PX, 0, EMO_PX, EMO_PX, 0, 0, EMO_PX, EMO_PX);
}
export function tickEmoji() {
  const t = performance.now() / 1000;
  for (const cv of live) { if (!cv.isConnected) { live.delete(cv); continue; } paint(cv, t); }
  if (!live.size && ticker) { clearInterval(ticker); ticker = 0; }
}
/** 새로 넣은 그림말 캔버스를 그리고, 움직이는 것은 틱에 건다 */
export function hydrateEmoji(root: ParentNode) {
  const t = performance.now() / 1000;
  root.querySelectorAll<HTMLCanvasElement>('canvas.emo[data-emo]').forEach(cv => {
    paint(cv, t);
    const e = emoOf(cv.dataset.emo!); if (e && e.f > 1) live.add(cv);
  });
  if (live.size && !ticker) ticker = window.setInterval(tickEmoji, 50);
}
/** 캔버스에 — time 으로 장을 고른다 */
export function drawEmoji(c: CanvasRenderingContext2D, k: string, x: number, y: number, size: number, time: number) {
  const e = emoOf(k); if (!e) return;
  c.save(); c.imageSmoothingEnabled = false;
  c.drawImage(emojiSheet(k).img, frameAt(e, time) * EMO_PX, 0, EMO_PX, EMO_PX, Math.round(x), Math.round(y), size, size);
  c.restore();
}
