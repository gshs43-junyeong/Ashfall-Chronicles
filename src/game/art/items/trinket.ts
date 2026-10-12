/* ===== art/items/trinket.js — 잡동사니로 만든 도구: 귀환 구슬 · 되짚는 나침반 · 멈춘 모래시계 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';

export const ItemPaintTrinket: Bag = {
  orb(H: ItemPaintKit) {                                           // 귀환 구슬 — 잿빛 쇠 받침 · 속에서 타는 빛 · 금 간 유리
    const { g, circ, ell, glow, stroke, P } = H, c = H.s.c, core = H.s.core;
    glow(16, 14, 13, c, .35);
    P(9, 24, 14, 3, '#3a3530'); P(11, 22, 10, 2, '#5a524a'); P(9, 24, 14, 1, '#7a7068');      // 받침
    circ(16, 14, 9, sh2(c, .45));
    circ(16, 14, 8, sh2(c, .8));
    circ(16, 15, 5, c); circ(16, 16, 2.6, core);                                             // 속불
    stroke('rgba(255,255,255,.5)', 1, () => { g.moveTo(12, 9); g.lineTo(14, 12); g.lineTo(13, 15); });   // 금
    ell(13, 10, 2.4, 1.4, 'rgba(255,255,255,.75)');
    stroke(sh2(c, .35), 1, () => { g.arc(16, 14, 8.5, 0, TAU); });
  },
  compass(H: ItemPaintKit) {                                       // 되짚는 나침반 — 녹슨 놋쇠 · 비석 쪽을 가리키는 붉은 바늘
    const { g, circ, poly, stroke, P } = H;
    circ(16, 17, 11, '#5a4022'); circ(16, 17, 10, '#b08840'); circ(16, 17, 8, '#e8dcc0');
    P(14, 4, 4, 3, '#b08840'); circ(16, 4, 2, '#7a5a2a');                                    // 고리
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P(16 + Math.cos(a) * 6.5 - .5, 17 + Math.sin(a) * 6.5 - .5, 1, 1, '#7a6a50'); }
    poly([[16, 17], [21, 11], [17.4, 18.2]], '#c83a2a');                                     // 바늘(붉은 끝)
    poly([[16, 17], [11, 23], [14.6, 15.8]], '#6a6a72');
    circ(16, 17, 1.4, '#3a2a1a');
    stroke('#3a2a1a', 1, () => { g.moveTo(20, 21); g.lineTo(22, 21); g.moveTo(21, 20); g.lineTo(21, 23); });   // 비석 표
  },
  hourglass(H: ItemPaintKit) {                                     // 멈춘 모래시계 — 서리 낀 틀 · 허리에서 멈춘 모래 · 톱니
    const { g, poly, P, circ, stroke, glow } = H;
    glow(16, 16, 12, '#bfe0ff', .25);
    P(7, 3, 18, 3, '#6a5a3a'); P(7, 26, 18, 3, '#6a5a3a'); P(7, 3, 18, 1, '#a08858'); P(7, 26, 18, 1, '#a08858');
    P(8, 6, 2, 20, '#8a7448'); P(22, 6, 2, 20, '#8a7448');                                   // 기둥
    poly([[11, 6], [21, 6], [17, 16], [21, 26], [11, 26], [15, 16]], 'rgba(200,230,255,.35)');   // 유리
    poly([[12, 7], [20, 7], [16.6, 14.4], [15.4, 14.4]], '#e0c27a');                         // 위 모래(멈춤)
    poly([[13, 25], [19, 25], [17, 22], [15, 22]], '#c8a860');
    P(15.6, 14.4, .8, 3, '#e0c27a');                                                         // 허리에서 멈춘 한 줄기
    stroke('#e8f4ff', 1, () => { g.moveTo(11, 6); g.lineTo(15, 16); g.lineTo(11, 26); g.moveTo(21, 6); g.lineTo(17, 16); g.lineTo(21, 26); });
    circ(25, 9, 3, '#9aa4b2'); circ(25, 9, 1.2, '#4a525e');                                  // 미로 톱니
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P(25 + Math.cos(a) * 3.4 - .6, 9 + Math.sin(a) * 3.4 - .6, 1.2, 1.2, '#9aa4b2'); }
    P(9, 5, 3, 1, '#ffffff'); P(21, 27, 2, 1, '#ffffff');                                    // 서리 반짝
  },
};
Object.assign(ITEM_PAINT, ItemPaintTrinket);
