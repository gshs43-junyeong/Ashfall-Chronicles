/* ===== art/items/weird.js — 특이한 무기 여섯: 전기 집게 · 부메랑 · 잎 검 · 프라이팬 · 낡은 우산 · 비눗방울 지팡이 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/** 꺾은선(farm.ts 의 line 과 같다 — 층 순서상 여기서는 그것을 못 가져온다) */
function line(H: ItemPaintKit, pts: any, col: string, wd: number) {
  H.stroke(col, wd, () => { H.g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) H.g.lineTo(q[0], q[1]); });
}
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. 무기는 손잡이가 아래 · 끝이 위(손에 쥐면 돌린다). */

export const ItemPaintWeird: Bag = {
  claw(H: ItemPaintKit) {                                          // 전기 집게 — 접힌 팔 마디 · 집게 · 손잡이 전지
    const { P, poly, circ, glow } = H;
    glow(16, 7, 8, '#8fd8ff', .25);
    P(13, 22, 6, 8, '#3a3f48'); P(13, 22, 6, 1, '#6a7280'); P(14, 25, 4, 2, '#ffd24a');   // 손잡이 · 전지
    line(H, [[16, 22], [11, 16], [17, 11]], '#8a96a6', 2.4);                              // 접힌 팔
    circ(11, 16, 1.6, '#c8d0da'); circ(17, 11, 1.6, '#c8d0da');
    poly([[17, 11], [12, 4], [14, 3], [18, 9]], '#b8c0cc');                               // 집게 두 날
    poly([[17, 11], [22, 4], [20, 3], [16, 9]], '#9aa4b2');
    line(H, [[13, 5], [16, 7], [15, 8], [18, 6]], '#bff0ff', 1);                         // 불꽃
  },
  boomerang(H: ItemPaintKit) {                                     // 부메랑 — 굽은 나무 날 두 갈래 · 띠 무늬
    const c = H.s.c, lt = sh2(c, 1.3), dk = sh2(c, .6);
    line(H, [[6, 26], [16, 16], [27, 9]], dk, 6.5);
    line(H, [[16, 16], [7, 6]], dk, 6.5);
    line(H, [[6, 26], [16, 16], [27, 9]], c, 4.5);
    line(H, [[16, 16], [7, 6]], c, 4.5);
    line(H, [[7, 24], [15, 16.4], [25, 10]], lt, 1.2);
    line(H, [[9, 9], [11, 7]], '#e8c060', 2); line(H, [[22, 12], [24, 10.4]], '#e8c060', 2);
  },
  leafsword(H: ItemPaintKit) {                                     // 잎 검 — 겹친 잎 날 · 줄기 손잡이
    const { poly, P } = H;
    const greens = ['#5aa04a', '#6ab85a', '#4a8a3c'];
    for (let i = 0; i < 4; i++) {
      const y = 3 + i * 4.5, c = greens[i % 3];
      poly([[16, y], [20, y + 3], [16, y + 8], [12, y + 3]], c);
      line(H, [[16, y + 1], [16, y + 7]], '#3a7030', 0.8);
    }
    P(15, 22, 2, 8, '#6a4a28'); line(H, [[11, 22], [21, 22]], '#4a8a3c', 2);
  },
  pan(H: ItemPaintKit) {                                           // 프라이팬 — 둥근 바닥 · 긴 자루
    const { ell, P } = H;
    P(14.5, 16, 3, 14, '#4a3122'); P(14.5, 16, 1, 14, '#6a4a32');
    ell(16, 9, 9, 8, '#3a3e46'); ell(16, 9, 7.4, 6.4, '#22262c'); ell(13.5, 7, 2.4, 1.6, '#5a606a');
  },
  umbrella(H: ItemPaintKit) {                                      // 낡은 우산 — 접힌 천 · 갈고리 손잡이
    const { poly, P } = H, c = H.s.c;
    poly([[16, 2], [21, 18], [16, 20], [11, 18]], c);
    poly([[16, 2], [16, 20], [11, 18]], sh2(c, 1.25));
    line(H, [[16, 4], [18, 18]], sh2(c, .65), 0.8);
    P(15.4, 19, 1.4, 8, '#5a4030');
    line(H, [[16, 27], [16, 29], [13, 30], [12, 28]], '#5a4030', 1.6);
  },
  bubblewand(H: ItemPaintKit) {                                    // 비눗방울 지팡이 — 고리 · 방울 셋
    const { P, circ, stroke, g } = H;
    P(15, 13, 2, 17, '#b87ab8'); P(15, 13, 1, 17, '#d8a0d8');
    stroke('#e0b0e8', 2, () => { g.arc(16, 9, 4.6, 0, TAU); });
    for (const [x, y, r] of [[24, 6, 3], [27, 13, 2], [22, 15, 1.6]] as const) {
      stroke('rgba(170,220,255,.9)', 1, () => { g.arc(x, y, r, 0, TAU); });
      circ(x - r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.3), '#ffffff');
    }
  }
};
Object.assign(ITEM_PAINT, ItemPaintWeird);
