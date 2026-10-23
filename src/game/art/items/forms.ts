/* ===== art/items/forms.ts — 무기 · 방어구의 모양 갈래(s.f) — 같은 틀에 색만 바꾼 그림이 줄지어 보이지 않게 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
import { orn } from './gear.js';
/* ★ 사용자(2026-10-23): 활 · 검 · 갑옷이 색만 다르고 모양이 똑같다 — 모양 갈래(f)로 정체성을 준다. 갈래 고르기는 itemart ISPEC.
   좌표는 32칸, 손잡이는 아래 · 끝은 위. 검 가드는 y 20 언저리(orn 장식 자리)에 둔다. */

type K = ItemPaintKit;
type Pt = number[];
const mir = (L: Pt[]) => L.map(p => [32 - p[0], p[1]]);
/** 날 — 왼 · 오른 가장자리(끝 → 밑동)를 이어 칠하고 왼쪽은 밝게 · 오른쪽은 어둡게 · 가운데 빛줄 */
function blade(H: K, L: Pt[], R: Pt[], c: string) {
  const { g, poly, stroke } = H, M = L.map((p, i) => [(p[0] + R[i][0]) / 2, (p[1] + R[i][1]) / 2]);
  poly([...L, ...R.slice().reverse()], c);
  poly([...L, ...M.slice().reverse()], sh2(c, 1.28));
  poly([...R, ...M.slice().reverse()], sh2(c, .72));
  stroke(sh2(c, 1.65), .7, () => { g.moveTo(M[0][0], M[0][1] + 1); for (const p of M.slice(1)) g.lineTo(p[0], p[1]); });
}
function grip(H: K, y: number, len: number, c: string, w = 3.2) {
  const { P } = H;
  P(16 - w / 2, y, w, len, c);
  for (let k = y + 1; k < y + len - .5; k += 2) P(16 - w / 2, k, w, .9, sh2(c, .55));   // 감은 끈
  P(16 - w / 2, y, .9, len, sh2(c, 1.3));
}
function bar(H: K, y: number, half: number, c: string, h = 2.4) {
  const { P } = H;
  P(16 - half, y, half * 2, h, c); P(16 - half, y, half * 2, .8, sh2(c, 1.35)); P(16 - half, y + h - .7, half * 2, .7, sh2(c, .65));
}
function shaft(H: K, x0: number, y0: number, x1: number, y1: number, c = '#6a4a28') {
  const { g, stroke } = H;
  stroke(c, 2.6, () => { g.moveTo(x0, y0); g.lineTo(x1, y1); });
  stroke(sh2(c, 1.35), .9, () => { g.moveTo(x0 - .7, y0); g.lineTo(x1 - .7, y1); });
}

export const ItemPaintForms: Bag = {
  /* ---------------- 검 ---------------- */
  blade(H: K) {
    const { g, s, P, poly, circ, ell, stroke, glow } = H, c = s.c, gd = s.g, gr = s.grip;
    if (s.glow) glow(16, 11, 11, s.glow, .22);
    switch (s.f) {
      case 'wood': {                                                         // 목검 — 둥근 끝 · 나뭇결 · 못 박은 가드 · 천 감은 손잡이
        ell(16, 4.5, 3, 2.8, c); P(13, 4.5, 6, 15.5, c); P(13, 4.5, 2.6, 15.5, sh2(c, 1.2)); P(17.6, 4.5, 1.4, 15.5, sh2(c, .75));
        stroke(sh2(c, .7), .6, () => { g.moveTo(15.2, 7); g.lineTo(15.6, 18); g.moveTo(17, 9); g.lineTo(16.8, 16); });
        bar(H, 20, 7, gd, 2.8); circ(10.5, 21.4, .6, '#c8c0a8'); circ(21.5, 21.4, .6, '#c8c0a8');
        grip(H, 22.8, 5.6, '#8a7a5a'); P(13.6, 28.4, 4.8, 2.4, gd);
        break;
      }
      case 'leaf': {                                                         // 잎사귀 날 — 가운데가 불룩한 청동기 칼
        const L = [[16, 1], [14, 5], [12.3, 10.5], [12.8, 15.5], [14.4, 20]];
        blade(H, L, mir(L), c);
        bar(H, 20, 5.5, gd); circ(10.5, 21.2, 1.4, gd); circ(21.5, 21.2, 1.4, gd);
        grip(H, 22.4, 5.6, gr); circ(16, 29.6, 2.2, gd); circ(15.3, 29, .7, sh2(gd, 1.5));
        break;
      }
      case 'long': {                                                         // 가늘고 긴 날 · 끝이 아래로 휜 가드 · 마름모 자루끝
        blade(H, [[16, .5], [14.5, 3.5], [14.5, 20.5]], [[16, .5], [17.5, 3.5], [17.5, 20.5]], c);
        bar(H, 20.5, 8.5, gd, 1.8); poly([[7.5, 20.5], [6, 23.5], [8.6, 22.3]], gd); poly([[24.5, 20.5], [26, 23.5], [23.4, 22.3]], gd);
        grip(H, 22.3, 6, gr, 2.8); poly([[16, 28], [18, 29.8], [16, 31.6], [14, 29.8]], gd); P(15.4, 29.2, .9, .9, '#ffffff');
        break;
      }
      case 'curve': {                                                        // 휜 외날 — 둥근 날밑 · 마름모 감은 자루
        const L = [[21.5, .5], [17.5, 5], [15, 10], [14.2, 15], [14.2, 20]], R = [[21.5, .5], [19.7, 5.6], [17.8, 10.6], [17.5, 15.2], [17.8, 20]];
        blade(H, L, R, c);
        stroke(sh2(c, 1.8), .9, () => { g.moveTo(21, 1.5); g.quadraticCurveTo(15.5, 8, 14.6, 19.5); });   // 날 선
        ell(16, 21, 5.6, 1.9, gd); ell(16, 20.6, 5.6, .7, sh2(gd, 1.35));
        P(14.3, 22.4, 3.4, 6.4, gr); for (let k = 0; k < 3; k++) poly([[16, 23 + k * 2.1], [17.4, 24 + k * 2.1], [16, 25 + k * 2.1], [14.6, 24 + k * 2.1]], sh2(gr, 1.7));
        P(14, 28.8, 4, 1.8, gd);
        break;
      }
      case 'sun': {                                                          // 넓은 날 · 햇살 날밑
        const bw = s.w || 5;
        blade(H, [[16, 1], [16 - bw, 8], [16 - bw + .5, 20]], [[16, 1], [16 + bw, 8], [16 + bw - .5, 20]], c);
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; poly([[16 + Math.cos(a) * 3.4, 21.5 + Math.sin(a) * 3.4], [16 + Math.cos(a + .16) * 7.5, 21.5 + Math.sin(a + .16) * 5.5], [16 + Math.cos(a + .32) * 3.4, 21.5 + Math.sin(a + .32) * 3.4]], gd); }
        circ(16, 21.5, 3.6, gd); circ(16, 21.5, 2.4, sh2(gd, 1.3));
        grip(H, 24.6, 4.4, gr); circ(16, 29.8, 1.8, gd);
        break;
      }
      case 'wave': {                                                         // 물결 날(플랑베르주) — 날이 뱀처럼 굽이친다
        const L: Pt[] = [[16, .5]], R: Pt[] = [[16, .5]];
        for (let y = 3; y <= 20; y += 1.7) { const w = Math.sin(y * .95) * 1.1; L.push([13 + w, y]); R.push([19 + w, y]); }
        blade(H, L, R, c);
        bar(H, 20.2, 9, gd, 2.4); poly([[7, 20.2], [5, 17.5], [8.4, 20.2]], gd); poly([[25, 20.2], [27, 17.5], [23.6, 20.2]], gd);
        grip(H, 22.6, 6, gr); circ(16, 29.8, 2, gd);
        break;
      }
      case 'dagger': {                                                       // 단검 — 짧고 넓은 날 · 위로 굽은 날밑 · 고리 자루끝
        blade(H, [[16, 7], [13.3, 12.5], [12.8, 19.6]], [[16, 7], [18.7, 12.5], [19.2, 19.6]], c);
        bar(H, 19.6, 6.5, gd, 2.2); poly([[9.5, 19.6], [8, 16.4], [10.8, 19.6]], gd); poly([[22.5, 19.6], [24, 16.4], [21.2, 19.6]], gd);
        grip(H, 21.8, 4.8, gr, 2.8);
        stroke(gd, 1.3, () => { g.arc(16, 28.6, 1.9, 0, TAU); });
        if (s.drip) { circ(17.2, 15.5, 1.1, s.drip); P(16.7, 16.4, 1, 2, s.drip); circ(17.2, 18.6, .8, s.drip); }
        if (s.ice) for (const [x, y] of [[12.4, 14], [19.6, 11.5], [12.2, 18]]) poly([[x, y], [x + (x < 16 ? -1.6 : 1.6), y + .7], [x, y + 1.6]], '#e8f8ff');
        break;
      }
      case 'kris': {                                                         // 물결 단검 — 한쪽으로 넓은 날밑 · 굽은 자루
        const L = [[16, 4.5], [14, 7.5], [15, 10.2], [13.4, 13], [14.6, 15.6], [13, 18], [13.2, 20]];
        const R = [[16, 4.5], [18.4, 7.6], [19.2, 10.4], [17.8, 13.1], [19, 15.7], [17.6, 18.1], [19, 20]];
        blade(H, L, R, c);
        poly([[11, 20], [21.5, 20], [21.5, 22], [12.5, 22.4], [10.4, 21.6]], gd);
        stroke(gr, 3, () => { g.moveTo(16, 22.4); g.quadraticCurveTo(14.6, 25.8, 16.6, 29); });
        circ(16.8, 29.6, 2, s.gem || gd); circ(16.2, 29, .7, '#ffffff');
        break;
      }
      case 'cleaver': {                                                      // 넓적한 칼 — 끝이 비스듬히 잘리고 등에 이빨
        blade(H, [[12, 5], [12, 12.5], [13.6, 20]], [[21.4, 2], [21.6, 12.5], [18.8, 20]], c);
        for (let y = 4; y < 18; y += 3) poly([[21.4, y], [23.8, y + 1.2], [21.4, y + 2.2]], '#f4efe0');
        bar(H, 20, 6.8, gd, 2.6);
        grip(H, 22.6, 6, gr, 3.4); P(13.6, 28.6, 4.8, 2, gd);
        break;
      }
      case 'arc': {                                                          // 번개 날 — 지그재그 · 노란 전류 테두리
        const L = [[17, .5], [13.6, 6], [16, 8], [13, 14], [15.6, 16], [14, 20]], R = [[17, .5], [17.6, 5], [19.2, 7.6], [17.6, 13], [19.2, 15], [18.2, 20]];
        blade(H, L, R, c);
        stroke(s.edge || '#f0e070', .8, () => { g.moveTo(L[0][0], L[0][1]); for (const p of L.slice(1)) g.lineTo(p[0], p[1]); g.moveTo(R[0][0], R[0][1]); for (const p of R.slice(1)) g.lineTo(p[0], p[1]); });
        bar(H, 20, 7.5, gd, 2.4);
        stroke(sh2(gd, 1.3), .9, () => { for (let k = 0; k < 3; k++) { g.moveTo(14.2, 23.5 + k * 1.8); g.lineTo(17.8, 22.8 + k * 1.8); } });
        grip(H, 22.4, 6, gr); circ(16, 29.6, 2, gd);
        break;
      }
      default: return ITEM_PAINT.sword(H);
    }
    if (s.orn) orn(H, 'sword', s);
  },

  /* ---------------- 활 · 쇠뇌 ---------------- */
  bowf(H: K) {
    const { g, s, P, poly, circ, stroke, glow } = H, c = s.c;
    if (s.glow) glow(14, 16, 13, s.glow, .2);
    const arrow = (x0: number) => {
      stroke('#8a6a45', 1.6, () => { g.moveTo(x0 - 1, 16); g.lineTo(27, 16); });
      poly([[30.5, 16], [25.5, 13.6], [25.5, 18.4]], s.tip || '#d0d4dc');
      poly([[x0 - 1, 16], [x0 + 3.5, 13.2], [x0 + 3.5, 18.8]], s.fl || sh2(c, 1.5));
    };
    if (s.f === 'cross') {                                                   // 쇠뇌 — 세로 개머리 · 위에 가로 활대 · 볼트
      shaft(H, 16, 30, 16, 9, s.stock || '#6a4a28'); P(14.4, 14, 3.2, 14, s.stock || '#6a4a28'); P(14.4, 14, 1, 14, sh2(s.stock || '#6a4a28', 1.35));
      stroke(c, 3, () => { g.arc(16, 23, 14, Math.PI + .52, TAU - .52); });
      stroke(sh2(c, 1.45), 1, () => { g.arc(16, 23, 13, Math.PI + .6, TAU - .8); });
      const ex = 16 - 14 * Math.cos(.52), ey = 23 - 14 * Math.sin(.52);
      stroke(s.s, 1, () => { g.moveTo(ex, ey); g.lineTo(16, 17.5); g.lineTo(32 - ex, ey); });
      P(15.2, 24.5, 1.6, 3, '#2a2a30');                                     // 방아쇠
      if (s.harpoon) {                                                       // 작살 — 미늘 · 꼬인 줄
        P(15.4, 2, 1.2, 16, '#9aa4ac'); poly([[16, .5], [18.4, 5], [16, 4], [13.6, 5]], '#c8d0d8'); poly([[16, 6], [18, 8.6], [16, 7.6]], '#c8d0d8');
        stroke('#d8c890', .7, () => { for (let y = 18; y < 27; y += 2) { g.moveTo(17.6, y); g.lineTo(19.4, y + 1); } });
      } else { P(15.4, 4, 1.2, 14, '#8a6a45'); poly([[16, 1], [18, 5], [14, 5]], s.tip || '#d0d4dc'); }
      if (s.lamp) { glow(23, 21, 8, s.lamp, .5); circ(23, 21, 2.4, '#3a3a40'); circ(23, 21, 1.5, s.lamp); }
      return;
    }
    if (s.f === 'long') {                                                    // 긴 활 — 위아래로 길고 얇다
      const R = 22, a = .78, cx = 32;
      stroke(c, 2.6, () => { g.arc(cx, 16, R, Math.PI - a, Math.PI + a); });
      stroke(sh2(c, 1.5), .9, () => { g.arc(cx, 16, R - 1, Math.PI - a * .85, Math.PI + a * .85); });
      const ex = cx - R * Math.cos(a), e1 = 16 - R * Math.sin(a), e2 = 16 + R * Math.sin(a);
      stroke(s.s, 1, () => { g.moveTo(ex, e1); g.lineTo(ex, e2); });
      P(cx - R - 1.3, 13.4, 3, 5.2, '#4a3122'); arrow(ex);
      if (s.tassel) { stroke(s.tassel, .9, () => { g.moveTo(cx - R + .5, 18.6); g.quadraticCurveTo(cx - R - 1, 24, cx - R + 1, 27); }); circ(cx - R + 1, 27.4, 1.1, s.tassel); }
      if (s.star) { glow(ex, e1, 6, '#ffe08a', .5); poly([[ex, e1 - 3], [ex + .8, e1 - .8], [ex + 3, e1], [ex + .8, e1 + .8], [ex, e1 + 3], [ex - .8, e1 + .8], [ex - 3, e1], [ex - .8, e1 - .8]], '#fff6d0'); }
      return;
    }
    const sm = s.f === 'short', a = sm ? .95 : 1.0, cx = sm ? 21 : 23, r = sm ? 11.5 : 15;
    if (s.f === 'wing') {                                                    // 날개 활 — 활대에 깃이 돋는다
      for (let i = 0; i < 7; i++) {
        const t = -a + (i + .5) / 7 * a * 2, x = cx - r * Math.cos(t), y = 16 + r * Math.sin(t), d = Math.sign(t) || 1;
        poly([[x, y], [x - 4.5, y + d * 1.6 - 1.2], [x - 3.6, y + d * 3]], i % 2 ? sh2(c, 1.25) : c);
      }
    }
    stroke(c, sm ? 3 : 3.4, () => { g.arc(cx, 16, r, Math.PI - a, Math.PI + a); });
    stroke(sh2(c, 1.45), 1.1, () => { g.arc(cx, 16, r - 1.4, Math.PI - a * .88, Math.PI + a * .88); });
    const ex = cx - r * Math.cos(a), ey1 = 16 - r * Math.sin(a), ey2 = 16 + r * Math.sin(a);
    if (s.f === 'recurve' || s.f === 'thorn' || s.f === 'feather') for (const d of [-1, 1])   // 끝이 바깥으로 젖혀진다
      stroke(c, 2.2, () => { g.moveTo(ex, d < 0 ? ey1 : ey2); g.quadraticCurveTo(ex + 1, (d < 0 ? ey1 : ey2) + d * 2.6, ex + 3.6, (d < 0 ? ey1 : ey2) + d * 2.4); });
    if (s.f === 'reed') for (let i = 1; i < 6; i++) { const t = -a + i / 6 * a * 2; P(cx - r * Math.cos(t) - 1.8, 16 + r * Math.sin(t) - .4, 3.6, .9, sh2(c, .6)); }   // 대나무 마디
    if (s.f === 'thorn') for (let i = 0; i < 6; i++) { const t = -a * .8 + i / 5 * a * 1.6; const x = cx - (r + 1.5) * Math.cos(t), y = 16 + (r + 1.5) * Math.sin(t); poly([[x, y - .8], [x - 2.4, y], [x, y + .8]], sh2(c, 1.4)); }
    if (s.f === 'feather') for (const d of [-1, 1]) { const y = d < 0 ? ey1 : ey2; poly([[ex + 3.6, y + d * 2.4], [ex + 7, y + d * 5], [ex + 2.2, y + d * 4]], '#2a2a32'); }
    if (s.f === 'void') { glow(cx - r, 16, 6, '#a06fff', .5); circ(cx - r + .6, 16, 2.4, '#1a1024'); circ(cx - r + .6, 16, 1.2, '#c49fff'); }
    stroke(s.s, 1.3, () => { g.moveTo(ex, ey1); g.lineTo(ex, ey2); });
    if (s.f !== 'void') P(cx - r - 1.4, 13, 3.4, 6, s.f === 'short' ? '#7a5a3a' : '#4a3122');
    if (s.ember) for (const y of [ey1, ey2]) { glow(ex, y, 5, '#ff8a3a', .6); circ(ex, y, 1.2, '#ffc070'); }
    arrow(ex);
  },

  /* ---------------- 창 ---------------- */
  spearf(H: K) {
    const { g, s, P, poly, circ, stroke, glow } = H, c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .7);
    if (s.glow) glow(16, 9, 11, s.glow, .22);
    if (s.f === 'lance') {                                                   // 기사의 창 — 긴 원뿔 · 손 가리개
      poly([[16, .5], [19.5, 19], [12.5, 19]], c); poly([[16, .5], [16, 19], [12.5, 19]], lt); poly([[16, .5], [19.5, 19], [17.5, 19]], dk);
      stroke(sh2(c, 1.7), .7, () => { for (let y = 5; y < 18; y += 3.5) { g.moveTo(16 - (y - .5) * .19, y); g.lineTo(16 + (y - .5) * .19, y + 1.2); } });
      g.fillStyle = sh2(c, .85); g.beginPath(); g.ellipse(16, 20, 7, 2.6, 0, 0, TAU); g.fill(); P(9, 19.2, 14, .8, lt);
      shaft(H, 16, 31, 16, 22, s.shaft || '#4a4a6a');
      return;
    }
    const sc = s.shaft || (s.f === 'reed' ? '#8a9a5a' : '#6a4a28');
    shaft(H, 16, 31, 16, 9, sc);
    if (s.f === 'reed') for (let y = 13; y < 30; y += 5) P(14.4, y, 3.2, 1, sh2(sc, .6));   // 갈대 마디
    switch (s.f) {
      case 'trident': {                                                      // 삼지창 — 가운데 날 · 양쪽으로 굽어 오른 날
        P(9, 10, 14, 2.2, dk); P(9, 10, 14, .8, lt);
        poly([[16, .5], [17.6, 5], [16.8, 10], [15.2, 10], [14.4, 5]], c);
        for (const d of [-1, 1]) { stroke(c, 1.8, () => { g.moveTo(16 + d * 6.2, 10); g.quadraticCurveTo(16 + d * 7, 6, 16 + d * 6, 2.5); }); poly([[16 + d * 6, 1], [16 + d * 7.4, 4], [16 + d * 4.8, 4]], lt); }
        break;
      }
      case 'barb': case 'harpoon': {                                         // 미늘 — 뒤로 꺾인 갈고리 · 작살엔 감긴 줄
        poly([[16, .5], [19, 7], [16, 10], [13, 7]], c); poly([[16, .5], [16, 10], [13, 7]], lt);
        poly([[13, 7], [11, 11.5], [14.4, 8.8]], dk); if (s.f === 'barb') poly([[19, 7], [21, 11.5], [17.6, 8.8]], dk);
        if (s.f === 'harpoon') { stroke('#d8c890', 1, () => { for (let y = 14; y < 26; y += 2) { g.moveTo(14.2, y); g.lineTo(17.8, y + 1); } }); stroke('#d8c890', .8, () => { g.moveTo(17.8, 25); g.quadraticCurveTo(23, 27, 22, 31); }); }
        break;
      }
      case 'bolt': {                                                         // 번개 날
        poly([[17.5, .5], [13, 6.5], [16, 6.8], [13.5, 11], [19, 4.6], [16.2, 4.5]], c);
        poly([[17.5, .5], [13, 6.5], [16, 6.8]], lt);
        glow(16, 5, 6, s.glow || c, .4);
        break;
      }
      case 'hook': {                                                         // 갈고리 날(글레이브) — 한쪽으로 굽은 큰 날
        g.fillStyle = c; g.beginPath(); g.moveTo(16, 11); g.quadraticCurveTo(11, 8, 13.5, 1); g.quadraticCurveTo(19.5, 5, 17.6, 11); g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath(); g.moveTo(15.4, 10.4); g.quadraticCurveTo(12, 8, 13.6, 2.2); g.quadraticCurveTo(14.6, 6, 16.2, 10); g.closePath(); g.fill();
        poly([[17.6, 7], [21, 6], [18.2, 9.4]], dk);
        if (s.drip) { circ(13, 10, 1, s.drip); P(12.5, 10.8, 1, 1.6, s.drip); }
        break;
      }
      default: {                                                             // 잎 날 · 끈 묶음
        poly([[16, 1], [19.4, 8], [16, 12], [12.6, 8]], c); poly([[16, 1], [16, 12], [12.6, 8]], lt);
        stroke(s.cord || '#c8b080', .9, () => { for (let y = 12; y < 15.5; y += 1.4) { g.moveTo(14.4, y); g.lineTo(17.6, y + .6); } });
      }
    }
  },

  /* ---------------- 둔기(철퇴 · 망치) ---------------- */
  mace(H: K) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H, c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .65);
    if (s.glow) glow(16, 10, 12, s.glow, .26);
    shaft(H, 16, 31, 16, 14, s.shaft || '#6a4a28');
    P(14.2, 26.5, 3.6, 4, '#3a2a1c');
    switch (s.f) {
      case 'flange': {                                                       // 날개 철퇴 — 가운데 심에 날개판 여섯
        for (const [x, y, w, h] of [[8, 7, 4, 8], [20, 7, 4, 8], [14, 1.5, 4, 5]]) { P(x, y, w, h, c); P(x, y, w, 1, lt); }
        poly([[9.5, 4], [12.5, 6], [11, 8]], c); poly([[22.5, 4], [19.5, 6], [21, 8]], c);
        circ(16, 11, 5, c); circ(14.6, 9.6, 2, lt); circ(16, 11, 2, dk); P(13, 15.5, 6, 1.6, dk);
        break;
      }
      case 'spike': {                                                        // 가시 철퇴 — 둥근 머리에 가시
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; poly([[16 + Math.cos(a - .25) * 5.2, 9.5 + Math.sin(a - .25) * 5.2], [16 + Math.cos(a) * 9.6, 9.5 + Math.sin(a) * 9.6], [16 + Math.cos(a + .25) * 5.2, 9.5 + Math.sin(a + .25) * 5.2]], i % 2 ? lt : sh2(c, 1.1)); }
        circ(16, 9.5, 6, c); circ(14.4, 8, 2.4, lt); circ(17.6, 11.4, 2.2, dk);
        break;
      }
      case 'lava': {                                                         // 용암 바위 — 울퉁불퉁한 돌 · 갈라진 틈에 불
        poly([[6, 7], [10, 3], [18, 2], [25, 5], [27, 11], [23, 16], [12, 16.5], [5.5, 13]], c);
        poly([[6, 7], [10, 3], [18, 2], [17, 7], [9, 10]], lt);
        stroke('#ffb040', 1.2, () => { g.moveTo(9, 9); g.lineTo(13, 11); g.lineTo(16, 8); g.lineTo(21, 12); g.moveTo(16, 8); g.lineTo(17.6, 4); });
        glow(15, 10, 8, '#ff7a2a', .45);
        break;
      }
      case 'bell': {                                                         // 종 철퇴 — 뒤집힌 종 머리 · 추
        g.fillStyle = c; g.beginPath(); g.moveTo(9, 15); g.quadraticCurveTo(10, 3, 16, 2.5); g.quadraticCurveTo(22, 3, 23, 15); g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath(); g.moveTo(10.5, 14); g.quadraticCurveTo(11, 4.5, 15, 4); g.lineTo(13.5, 14); g.closePath(); g.fill();
        P(8, 14, 16, 2.4, dk); P(8, 14, 16, .8, lt); circ(16, 17.6, 1.6, sh2(c, 1.5));
        stroke(sh2(c, .5), .7, () => { g.moveTo(10.6, 9); g.lineTo(21.4, 9); });
        break;
      }
      case 'ruin': {                                                         // 유적 돌덩이 — 새긴 룬이 빛난다
        P(6, 3, 20, 13, c); P(6, 3, 20, 2.4, lt); P(6, 13.6, 20, 2.4, dk); P(6, 3, 2.4, 13, sh2(c, 1.15));
        poly([[6, 3], [9, 3], [6, 6]], '#00000000'); P(23, 3, 3, 3, sh2(c, .8));            // 깨진 모서리
        stroke(s.glow || '#e8d8a0', 1, () => { g.moveTo(13, 6); g.lineTo(16, 12); g.lineTo(19, 6); g.moveTo(14.2, 9); g.lineTo(17.8, 9); });
        break;
      }
      case 'sledge': {                                                       // 큰 망치 · 뒤에 곡괭이 날
        P(5, 5, 15, 10, c); P(5, 5, 15, 2.6, lt); P(5, 12.4, 15, 2.6, dk); P(5, 5, 2.4, 10, sh2(c, 1.15));
        poly([[20, 6.5], [29.5, 9.5], [20, 13]], dk); poly([[20, 6.5], [29.5, 9.5], [20, 9]], c);
        for (let i = 0; i < 4; i++) P(rng.range(7, 18), rng.range(7, 12), 1.6, 1.6, rng.chance(.5) ? lt : dk);
        break;
      }
      case 'tide': {                                                         // 조개 망치 — 물결 무늬 머리 · 소라 끝
        P(6, 5, 20, 11, c); P(6, 5, 20, 2.4, lt); P(6, 13.6, 20, 2.4, dk);
        stroke(sh2(c, 1.6), 1, () => { for (let k = 0; k < 2; k++) { g.moveTo(7, 8 + k * 3); for (let x = 7; x <= 25; x += 3) g.quadraticCurveTo(x + 1.5, 6.5 + k * 3, x + 3, 8 + k * 3); } });
        circ(6, 10.5, 3, sh2(c, 1.2)); stroke(dk, .8, () => { g.arc(6, 10.5, 1.6, 0, 4.5); });
        break;
      }
      default: return ITEM_PAINT.hammer(H);
    }
  },

  /* ---------------- 투구 ---------------- */
  helmf(H: K) {
    const { g, s, P, poly, circ, ell, stroke, glow } = H, c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .65);
    if (s.glow) glow(16, 15, 12, s.glow, .18);
    switch (s.f) {
      case 'hood': {                                                         // 두건 — 얼굴 구멍 · 어깨로 흘러내린 자락
        g.fillStyle = c; g.beginPath(); g.moveTo(5, 27); g.quadraticCurveTo(4, 6, 16, 4); g.quadraticCurveTo(28, 6, 27, 27); g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath(); g.moveTo(6, 25); g.quadraticCurveTo(5.5, 8, 15, 5.5); g.lineTo(11, 25); g.closePath(); g.fill();
        ell(16, 17, 6, 7, '#1a1612'); ell(16, 18.5, 4, 4.5, '#2a241c');
        stroke(dk, 1, () => { g.moveTo(5, 27); g.lineTo(27, 27); });
        break;
      }
      case 'kettle': {                                                       // 챙 넓은 투구 — 둥근 정수리 · 넓은 챙 · 챙 그늘
        g.fillStyle = c; g.beginPath(); g.arc(16, 15, 8.5, Math.PI, 0); g.fill();
        g.fillStyle = lt; g.beginPath(); g.arc(16, 15, 8.5, Math.PI, Math.PI * 1.45); g.lineTo(16, 15); g.fill();
        ell(16, 15.5, 14, 3, dk); ell(16, 14.8, 14, 2.2, c); P(2.5, 14.4, 27, .8, lt);
        P(9, 17, 14, 5, '#1e1a16'); P(9, 21, 14, 1.6, dk);
        circ(16, 7, 1.4, lt);
        break;
      }
      case 'crest': case 'wing': case 'visor': {                             // 얼굴 가리개 투구(+ 깃털 장식 · 날개)
        if (s.f === 'crest') { g.fillStyle = s.crest || '#c84a3a'; g.beginPath(); g.moveTo(16, 7); g.quadraticCurveTo(14, -1, 26, 1); g.quadraticCurveTo(20, 3, 18, 8); g.closePath(); g.fill(); }
        if (s.f === 'wing') for (const d of [-1, 1]) { poly([[16 + d * 9, 14], [16 + d * 15.5, 4], [16 + d * 14, 10], [16 + d * 15.5, 9], [16 + d * 11, 17]], s.crest || '#f0e8d0'); poly([[16 + d * 9, 14], [16 + d * 15.5, 4], [16 + d * 12, 12]], sh2(s.crest || '#f0e8d0', 1.2)); }
        g.fillStyle = c; g.beginPath(); g.arc(16, 15, 9.5, Math.PI, 0); g.fill(); P(6.5, 15, 19, 9, c);
        g.fillStyle = lt; g.beginPath(); g.arc(16, 15, 9.5, Math.PI, Math.PI * 1.45); g.lineTo(16, 15); g.fill(); P(6.5, 15, 4, 9, lt);
        P(15.2, 6, 1.6, 18, sh2(c, 1.2));                                     // 가운데 마루
        P(8.5, 14.5, 15, 2.4, '#14141a'); P(8.5, 18.6, 15, 1.2, '#14141a');   // 눈 틈 · 숨구멍
        for (let x = 10; x < 23; x += 3) P(x, 20.6, 1.2, 1.2, '#14141a');
        P(6.5, 23, 19, 1.4, dk);
        break;
      }
      case 'halo': {                                                         // 영혼의 관 — 이마 띠 · 떠 있는 고리 · 가운데 보석
        stroke(sh2(s.crest || '#ffe08a', 1.2), 1.4, () => { g.ellipse(16, 5, 9, 2.4, 0, 0, TAU); }); glow(16, 5, 9, s.crest || '#ffe08a', .3);
        g.fillStyle = c; g.beginPath(); g.arc(16, 17, 9, Math.PI, 0); g.fill(); P(7, 17, 18, 6, c);
        g.fillStyle = lt; g.beginPath(); g.arc(16, 17, 9, Math.PI, Math.PI * 1.45); g.lineTo(16, 17); g.fill();
        P(7, 13, 18, 3, s.crest || '#ffe08a'); poly([[16, 11], [18.6, 14.5], [16, 18], [13.4, 14.5]], s.gem || '#c49fff'); P(15.2, 12.6, 1, 1.4, '#ffffff');
        ell(16, 20.5, 6.5, 2.4, '#1a1424');
        break;
      }
      case 'diver': {                                                        // 잠수 투구 — 둥근 머리 · 큰 둥근 유리창 · 볼트
        circ(16, 15, 11, c); circ(13, 11.5, 5, lt);
        circ(16, 16, 6.5, sh2(c, .6)); circ(16, 16, 5.2, '#2a4a5a'); circ(14.4, 14.4, 1.8, '#9fd8f0'); P(10.8, 15.6, 10.4, .8, sh2(c, .6)); P(15.6, 10.8, .8, 10.4, sh2(c, .6));
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; circ(16 + Math.cos(a) * 8.4, 16 + Math.sin(a) * 8.4, .9, sh2(c, 1.5)); }
        P(6, 25, 20, 3, dk);
        break;
      }
      default: return ITEM_PAINT.helm(H);
    }
  },

  /* ---------------- 갑옷 ---------------- */
  chestf(H: K) {
    const { g, s, P, poly, circ, ell, stroke, glow } = H, c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .66);
    if (s.glow) glow(16, 17, 13, s.glow, .18);
    const torso = () => { poly([[9, 8], [23, 8], [25, 14], [23, 27], [9, 27], [7, 14]], c); poly([[9, 8], [16, 8], [16, 27], [9, 27], [7, 14]], lt); };
    switch (s.f) {
      case 'robe': {                                                         // 옷 — 좁은 어깨 · 아래로 퍼진 자락 · 허리띠 · V 깃
        poly([[11, 6], [21, 6], [24, 13], [27, 29], [5, 29], [8, 13]], c); poly([[11, 6], [16, 6], [16, 29], [5, 29], [8, 13]], lt);
        poly([[13, 6], [19, 6], [16, 12]], dk);
        P(7.4, 17, 17.2, 2.4, s.belt || '#5a3a20'); P(14.6, 16.6, 2.8, 3.2, '#c8a050');
        stroke(dk, .7, () => { g.moveTo(11, 21); g.lineTo(9, 29); g.moveTo(21, 21); g.lineTo(23, 29); });
        if (s.rune) { glow(16, 23.5, 5, s.rune, .5); circ(16, 23.5, 1.8, s.rune); }
        break;
      }
      case 'lamellar': {                                                     // 비늘 판 줄 — 가로로 겹친 판
        torso();
        for (let y = 10; y < 27; y += 3) { P(8, y, 16, 2.4, y % 2 ? c : sh2(c, .9)); P(8, y, 16, .7, lt); for (let x = 9; x < 24; x += 3.5) P(x, y + .8, .8, .8, dk); }
        circ(8, 10, 3.4, dk); circ(24, 10, 3.4, dk);
        break;
      }
      case 'scale': {                                                        // 비늘 — 겹친 반원
        torso();
        for (let r = 0; r < 6; r++) for (let k = 0; k < 5; k++) {
          const x = 9.5 + k * 3.4 + (r % 2 ? 1.7 : 0), y = 10 + r * 3; if (x > 23) continue;
          g.fillStyle = (r + k) % 2 ? lt : sh2(c, .85); g.beginPath(); g.arc(x, y, 1.9, 0, Math.PI); g.fill();
        }
        circ(8, 10.5, 3.6, dk); circ(24, 10.5, 3.6, dk);
        break;
      }
      case 'ornate': case 'wingp': case 'spiked': {                          // 장식 판금(+ 날개 어깨 · 가시 어깨)
        torso();
        P(15.4, 9, 1.2, 18, dk); P(8, 17, 16, 1.4, dk); P(8, 22, 16, 1.4, dk);
        if (s.f === 'wingp') for (const d of [-1, 1]) { poly([[16 + d * 7, 9], [16 + d * 15.5, 4], [16 + d * 13, 9], [16 + d * 15, 9.5], [16 + d * 10, 13]], s.trim || '#f0e8d0'); }
        else if (s.f === 'spiked') for (const d of [-1, 1]) { circ(16 + d * 8, 10.5, 4, dk); for (const a of [-1.9, -1.4, -.9]) { const aa = d > 0 ? a : -Math.PI - a; poly([[16 + d * 8 + Math.cos(aa - .25) * 3.6, 10.5 + Math.sin(aa - .25) * 3.6], [16 + d * 8 + Math.cos(aa) * 7.5, 10.5 + Math.sin(aa) * 7.5], [16 + d * 8 + Math.cos(aa + .25) * 3.6, 10.5 + Math.sin(aa + .25) * 3.6]], sh2(c, 1.25)); } }
        else { circ(8, 10.5, 4, c); circ(24, 10.5, 4, sh2(c, .8)); circ(7.2, 9.4, 1.6, lt); }
        stroke(s.trim || '#ffd86a', .9, () => { g.moveTo(9, 8.4); g.lineTo(23, 8.4); g.moveTo(9.2, 26.5); g.lineTo(22.8, 26.5); });
        const gem = s.gem || s.glow || '#7fe0ff';
        if (s.f === 'spiked') { ell(16, 15, 3.4, 2, '#140a14'); circ(16, 15, 1.4, gem); glow(16, 15, 6, gem, .5); }
        else { poly([[16, 11.5], [18.4, 14.5], [16, 17.5], [13.6, 14.5]], gem); P(15, 12.8, 1, 1.4, '#ffffff'); glow(16, 14.5, 6, gem, .35); }
        break;
      }
      default: return ITEM_PAINT.chest(H);
    }
  },

  /* ---------------- 장화 ---------------- */
  bootsf(H: K) {
    const { g, s, P, poly, circ, ell, stroke, glow } = H, c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .6);
    if (s.glow) glow(16, 18, 12, s.glow, .18);
    const one = (bx: number) => {
      switch (s.f) {
        case 'shoe':                                                         // 감발 신 — 낮고 끈을 감았다
          poly([[bx, 15], [bx + 8, 15], [bx + 8, 21], [bx + 12.5, 22], [bx + 12.5, 26], [bx, 26]], c); P(bx, 15, 3.4, 11, lt);
          for (let y = 16; y < 22; y += 2) stroke(sh2(c, .5), .8, () => { g.moveTo(bx, y); g.lineTo(bx + 8, y + 1); });
          P(bx, 24.5, 12.5, 1.5, dk);
          break;
        case 'greave':                                                       // 정강이 받이 — 높고 무릎에 둥근 판
          poly([[bx, 6], [bx + 8.4, 6], [bx + 8.4, 21], [bx + 12.5, 21], [bx + 12.5, 26], [bx, 26]], c); P(bx, 6, 3.4, 20, lt);
          circ(bx + 4.2, 9, 3.4, sh2(c, 1.1)); circ(bx + 3.4, 8.2, 1.2, sh2(c, 1.6));
          P(bx, 14, 8.4, 1.2, dk); P(bx, 18, 8.4, 1.2, dk); P(bx, 24, 12.5, 2, dk);
          break;
        case 'fin':                                                          // 물갈퀴 — 발끝이 넓게 퍼진다
          poly([[bx, 10], [bx + 7.6, 10], [bx + 7.6, 20], [bx + 14, 22], [bx + 15, 27], [bx, 26]], c); P(bx, 10, 3.2, 16, lt);
          stroke(dk, .8, () => { for (let k = 0; k < 3; k++) { g.moveTo(bx + 8, 21.4 + k); g.lineTo(bx + 14.4, 23 + k * 1.6); } });
          P(bx, 13, 7.6, 1.4, dk);
          break;
        default: {                                                           // 장화(+ 발목 날개)
          poly([[bx, 9], [bx + 8, 9], [bx + 8, 21], [bx + 12, 21], [bx + 12, 26], [bx, 26]], c);
          P(bx, 9, 3.5, 17, lt); P(bx, 23.5, 12, 2.5, dk); P(bx, 12.5, 8, 1.6, dk);
          if (s.f === 'wing') { const w = s.trim || '#f0e8d0'; poly([[bx + 7, 14], [bx + 14, 7], [bx + 12, 12], [bx + 14.5, 12.5], [bx + 8, 17]], w); }
        }
      }
    };
    one(2); one(17);
  },
};
Object.assign(ITEM_PAINT, ItemPaintForms);
