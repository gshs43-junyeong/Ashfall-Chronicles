// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== art/items/farm.js — 농사 · 음식 · 광석·수정 · 알·사탕 따위 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 Art. */

export const ItemPaintFarm = {
  /* ---------- 농업 ---------- */
  hoe(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .65);
        P(17, 4, 3, 22, '#6a4a28');                        // 자루
        P(17, 4, 1.2, 22, '#8f6740');
        poly([[6, 5], [19, 5], [19, 9], [10, 9], [10, 13], [6, 13]], c);   // 날
        poly([[6, 5], [19, 5], [19, 6.4], [7.4, 6.4]], lt);
        P(7, 11, 3, 2, dk);
        return;
      }
    }
  },
  seed(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        P(6, 12, 20, 14, '#7a5a3a');                       // 씨앗 봉지
        P(6, 12, 20, 2, '#9a7a52');
        poly([[6, 12], [26, 12], [23, 7], [9, 7]], '#8a6a44');
        P(13, 5, 6, 3, '#5a4028');
        for (const [x, y] of [[11, 17], [16, 20], [21, 17], [14, 24], [19, 24]]) {
          ell(x, y, 2.6, 1.8, c);
          ell(x - .7, y - .5, 1, .8, sh2(c, 1.4));
        }
        return;
      }
    }
  },
  wheatitem(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .7);
        for (const [x, tilt] of [[11, -.16], [21, .16], [16, 0]]) {
          stroke(dk, 1.8, () => { g.moveTo(x + tilt * 14, 30); g.lineTo(x - tilt * 4, 12); });
          for (let k = 0; k < 5; k++) {                    // 이삭
            const y = 11 + k * 3.4;
            P(x - 3.4 - tilt * 4, y, 7, 2.6, c);
            P(x - 3.4 - tilt * 4, y, 7, 1, lt);
          }
          P(x - 1 - tilt * 4, 7, 2, 5, dk);
        }
        return;
      }
    }
  },
  rootitem(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 20, 11, s.glow, .24);
        poly([[16, 30], [11, 16], [16, 11], [21, 16]], c);  // 뿌리
        poly([[16, 30], [11, 16], [16, 13]], sh2(c, 1.3));
        for (let k = 0; k < 3; k++) P(11 + k, 18 + k * 3.4, 10 - k * 2, 1, sh2(c, .68));
        for (const a of [-.7, 0, .7]) {                     // 잎
          poly([[16, 12], [16 + Math.sin(a) * 9, 12 - Math.cos(a) * 9],
                [16 + Math.sin(a) * 7 + 3, 12 - Math.cos(a) * 6]], '#5fa85a');
        }
        P(15, 8, 2, 5, '#4a8a48');
        return;
      }
    }
  },
  flouritem(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, dk = sh2(c, .72);
        P(8, 9, 16, 20, '#d8cbaa');                         // 종이 자루
        poly([[8, 9], [24, 9], [21, 5], [11, 5]], '#c8bb9a');
        P(8, 9, 16, 1.4, sh2('#d8cbaa', 1.2));
        P(11, 3, 10, 3, '#b8ab8a');
        P(11, 14, 10, 8, sh2('#d8cbaa', .84));              // 표지
        for (let i = 0; i < 12; i++) P(9 + (i * 7) % 14, 24 + (i % 3), 2, 1, c);   // 흘린 가루
        return;
      }
    }
  },
  compost(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        for (const [x, y, r] of [[12, 20, 6], [20, 19, 5.5], [16, 24, 5]]) {
          circ(x, y, r, c);
          circ(x - r * .3, y - r * .35, r * .4, sh2(c, 1.3));
        }
        for (const [x, y] of [[10, 15], [18, 13], [22, 16]]) {   // 삐져나온 지푸라기
          stroke('#9a8a5a', 1.4, () => { g.moveTo(x, y + 5); g.lineTo(x + 2, y); });
        }
        circ(14, 19, 1.2, '#6a8a4a'); circ(19, 22, 1, '#6a8a4a');
        return;
      }
    }
  },
  /* ---------- 음식 ---------- */
  bread(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.28), dk = sh2(c, .68);
        ell(16, 19, 12, 8.5, c);
        ell(16, 17, 11, 7, lt);
        for (let k = 0; k < 3; k++)                          // 칼집
          stroke(dk, 1.8, () => { g.moveTo(9 + k * 5, 15); g.lineTo(13 + k * 5, 11); });
        ell(16, 26, 11, 3, dk);
        return;
      }
    }
  },
  pie(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .66);
        ell(16, 25, 13, 4, dk);                              // 파이 접시
        poly([[3, 25], [29, 25], [26, 14], [6, 14]], c);
        P(6, 12, 20, 3, s.fill);                             // 속
        poly([[3, 25], [29, 25], [29, 22], [3, 22]], lt);
        for (let k = 0; k < 4; k++) P(7 + k * 5, 14, 2.4, 8, lt);   // 격자
        ell(16, 13, 10, 3, lt);
        return;
      }
    }
  },
  bowl(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .66);
        ell(16, 18, 12, 4, s.soup);                          // 국물
        ell(16, 17, 10, 3, sh2(s.soup, 1.25));
        for (const [x, y] of [[12, 17], [19, 18], [16, 16]]) ell(x, y, 2.4, 1.4, s.bits);
        poly([[4, 18], [28, 18], [24, 27], [8, 27]], c);     // 그릇
        poly([[4, 18], [28, 18], [28, 20], [4, 20]], lt);
        poly([[8, 27], [24, 27], [22, 29], [10, 29]], dk);
        stroke('#c8c8d0', 1.2, () => { g.moveTo(11, 13); g.bezierCurveTo(13, 9, 9, 8, 11, 5); });   // 김
        stroke('#c8c8d0', 1.2, () => { g.moveTo(20, 13); g.bezierCurveTo(22, 9, 18, 8, 20, 5); });
        return;
      }
    }
  },
  teacup(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, dk = sh2(c, .7);
        ell(16, 27, 11, 3, dk);                              // 받침
        poly([[8, 13], [24, 13], [21, 25], [11, 25]], c);
        ell(16, 13, 8, 3, s.tea);
        ell(16, 13, 6.4, 2.2, sh2(s.tea, 1.3));
        stroke(c, 2.4, () => { g.arc(24, 17, 4, -1.1, 1.1); });   // 손잡이
        stroke('#c8c8d0', 1.1, () => { g.moveTo(15, 9); g.bezierCurveTo(17, 6, 13, 5, 15, 2); });
        return;
      }
    }
  },
  jelly(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .68);
        poly([[7, 27], [25, 27], [22, 10], [10, 10]], c);    // 젤리 틀
        poly([[10, 10], [22, 10], [21, 14], [11, 14]], lt);
        poly([[7, 27], [25, 27], [24, 24], [8, 24]], dk);
        ell(16, 10, 6, 2.4, lt);
        P(12, 15, 2.4, 8, sh2(c, 1.6));                      // 하이라이트
        return;
      }
    }
  },
  feast(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 18, 13, s.glow, .26);
        P(3, 22, 26, 6, '#8a6a44');                          // 상
        P(3, 22, 26, 1.6, '#a88a5c');
        ell(10, 19, 6, 4, c); ell(10, 17.5, 5, 3, sh2(c, 1.25));       // 빵
        ell(22, 20, 6, 3.4, '#c8ccd4');                                 // 그릇
        ell(22, 19, 5, 2.4, '#8fd0a0');
        poly([[13, 21], [21, 21], [19, 12], [15, 12]], '#b8583c');      // 고기
        ell(17, 12, 2.4, 1.6, '#d8734c');
        P(16.4, 6, 1.2, 6, '#c8c8d0');                                  // 촛불
        ell(17, 6, 1.6, 2.4, '#ffd88a');
        return;
      }
    }
  },
  stopcore(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        // 「멈춰라」 하나만 크게 적어 넣은 물건 — 붉은 정지 표식
        const c = s.c;
        glow(16, 16, 13, c, .22);
        P(6, 6, 20, 20, '#2a2620');
        P(6, 6, 20, 2, '#4a4238');
        poly([[11, 5], [21, 5], [27, 11], [27, 21], [21, 27], [11, 27], [5, 21], [5, 11]], c);
        poly([[12, 7], [20, 7], [25, 12], [25, 20], [20, 25], [12, 25], [7, 20], [7, 12]], sh2(c, 1.25));
        P(10, 14, 12, 4, '#f0e0d0');                    // 가로줄 하나 = 정지
        for (const [x, y] of [[9, 9], [21, 9], [9, 21], [21, 21]]) circ(x, y, 1.3, '#3a2622');
        return;
      }
    }
  },
  railgun(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .6);
        if (s.glow) glow(24, 12, 11, s.glow, .26);
        P(4, 16, 22, 6, c); P(4, 16, 22, 1.6, lt); P(4, 20.4, 22, 1.6, dk);
        P(9, 10, 16, 4, c); P(9, 10, 16, 1.4, lt);          // 위쪽 레일
        P(24, 11, 6, 10, dk);                               // 총구부
        P(26, 13, 3, 6, s.glow || '#9fd8ff');
        poly([[6, 22], [12, 22], [10, 29], [5, 29]], sh2(c, .78));   // 손잡이
        P(14, 22, 3, 4, dk);
        return;
      }
    }
  },
  torchitem(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        glow(16, 9, 9, '#ffb24a', .3);
        P(14, 13, 4, 17, '#6a4a28'); P(14, 13, 1.4, 17, '#8f6740');
        g.fillStyle = '#e06a16'; g.beginPath();
        g.moveTo(16, 2); g.quadraticCurveTo(23, 9, 16, 15);
        g.quadraticCurveTo(9, 9, 16, 2); g.closePath(); g.fill();
        g.fillStyle = '#f7a92c'; g.beginPath();
        g.moveTo(16, 5); g.quadraticCurveTo(20.5, 10, 16, 13.5);
        g.quadraticCurveTo(11.5, 10, 16, 5); g.closePath(); g.fill();
        ell(16, 10, 1.6, 2.6, '#ffe98c');
        return;
      }
    }
  },
  platformitem(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        P(3, 12, 26, 6, '#8a6640');
        P(3, 12, 26, 1.4, '#b08a58'); P(3, 16.6, 26, 1.4, '#5a4028');
        P(9, 18, 2.4, 8, '#6a4a28'); P(21, 18, 2.4, 8, '#6a4a28');
        return;
      }
    }
  },
  ore(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 17, 12, c, .22);
        poly([[8, 12], [13, 6], [21, 7], [26, 14], [23, 24], [12, 25], [6, 19]], '#5d5d63');
        poly([[8, 12], [13, 6], [21, 7], [17, 15], [9, 17]], '#72727a');
        const nug = [[12, 12, 5, 4], [18, 15, 5, 4], [13, 19, 4, 3.4], [20, 20, 4, 3]];
        for (const [x, y, w, h] of nug) {
          P(x, y, w, h, c);
          P(x, y, w - 1, 1.2, sh2(c, 1.45));
          P(x + 1, y + h - 1, w - 1, 1, sh2(c, .6));
        }
        return;
      }
    }
  },
  meteorite(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {           // 운석 조각 — 둥근 검은 쇳덩이, 오목 자국 셋, 쇠 윤과 붉은 금
        const c = s.c;
        glow(16, 17, 12, '#ff7a3a', .12);
        poly([[7, 13], [12, 7], [20, 6], [26, 11], [27, 19], [22, 26], [12, 26], [6, 20]], c);
        poly([[7, 13], [12, 7], [20, 6], [26, 11], [18, 13], [10, 16]], sh2(c, 1.3));
        poly([[27, 19], [22, 26], [12, 26], [16, 21], [24, 18]], sh2(c, .65));
        for (const [x, y, r] of [[13, 14, 3], [20, 12, 2.4], [18, 20, 3.2]]) {
          circ(x, y, r, sh2(c, .6)); circ(x + .7, y + .8, r * .7, sh2(c, .8));
        }
        P(11, 9, 5, 1.2, '#c8ccd4'); P(22, 16, 2, 1, '#c8ccd4'); P(9, 20, 1.5, 1, '#9aa0aa');
        P(15, 23, 1, 1, '#ff7a3a'); P(16, 22, 1, 1, '#ff7a3a'); P(17, 22, 1, 1, '#ffb070'); P(18, 21, 1, 1, '#ff7a3a');
        return;
      }
    }
  },
  bar(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        if (s.glow) glow(16, 18, 12, c, .2);
        // 아래 잉곳
        poly([[5, 21], [27, 21], [24, 28], [8, 28]], c);
        poly([[5, 21], [27, 21], [25.5, 18.5], [6.5, 18.5]], lt);
        P(8, 24, 16, 1.2, dk);
        // 위 잉곳
        poly([[9, 12.5], [23, 12.5], [21, 18.5], [11, 18.5]], c);
        poly([[9, 12.5], [23, 12.5], [21.8, 10.5], [10.2, 10.5]], lt);
        P(12, 15, 8, 1.2, dk);
        return;
      }
    }
  },
  rock(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        poly([[8, 11], [14, 5], [23, 8], [26, 17], [20, 26], [10, 24], [5, 16]], c);
        poly([[8, 11], [14, 5], [23, 8], [18, 15], [10, 17]], sh2(c, 1.3));
        poly([[20, 26], [26, 17], [22, 16], [17, 24]], sh2(c, .7));
        P(12, 13, 2, 2, sh2(c, 1.5)); P(19, 19, 2, 2, sh2(c, 1.5));
        return;
      }
    }
  },
  shard(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 16, 12, c, .28);
        poly([[16, 2], [23, 13], [18, 30], [12, 26], [9, 12]], c);
        poly([[16, 2], [16, 30], [12, 26], [9, 12]], sh2(c, 1.4));
        P(15, 6, 1.6, 16, sh2(c, 1.75));
        return;
      }
    }
  },
  crystal(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 17, 13, c, .26);
        poly([[16, 3], [24, 11], [24, 24], [16, 30], [8, 24], [8, 11]], c);
        poly([[16, 3], [16, 30], [8, 24], [8, 11]], sh2(c, 1.35));
        poly([[16, 3], [24, 11], [16, 15], [8, 11]], sh2(c, 1.6));
        P(12, 14, 1.6, 9, sh2(c, 1.8));
        return;
      }
    }
  },
  gel(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        g.fillStyle = c; g.beginPath();
        g.moveTo(4, 24); g.quadraticCurveTo(3, 10, 16, 8);
        g.quadraticCurveTo(29, 10, 28, 24);
        g.quadraticCurveTo(16, 29, 4, 24); g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.3); g.beginPath();
        g.moveTo(7, 20); g.quadraticCurveTo(6, 12, 16, 10.5);
        g.quadraticCurveTo(20, 11, 21, 14);
        g.quadraticCurveTo(13, 14, 7, 20); g.closePath(); g.fill();
        ell(11.5, 14.5, 3, 2, 'rgba(255,255,255,.55)');
        circ(21, 21, 1.6, sh2(c, .7));
        return;
      }
    }
  },
  bone(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = '#e8e2cd', d = '#bdb59c';
        P(13, 9, 6, 15, c);
        circ(11, 9, 4, c); circ(21, 9, 4, c);
        circ(11, 24, 4, c); circ(21, 24, 4, c);
        P(13, 9, 2, 15, '#f5f1e4');
        circ(21, 9, 2, d); circ(21, 24, 2, d);
        return;
      }
    }
  },
  egg(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 18, 13, s.glow, .32);
        ell(16, 19, 8.5, 11.5, c);
        ell(13.4, 13.5, 3, 4, sh2(c, 1.4));
        circ(13, 17, 1.3, sh2(c, .6)); circ(19, 15, 1.1, sh2(c, .6));
        circ(18, 23, 1.3, sh2(c, .6)); circ(12.5, 24, 1, sh2(c, .6));
        return;
      }
    }
  },
  detector(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        /* 탐지기 — 접시 안테나 달린 손잡이 상자. */
        const c = s.c, dk = sh2(c, .5), lt = sh2(c, 1.3);
        g.fillStyle = dk; g.fillRect(10, 17, 12, 12);          // 몸통
        g.fillStyle = c; g.fillRect(11, 18, 10, 4);            // 화면
        g.fillStyle = lt; g.fillRect(12, 19, 3, 2);
        g.fillStyle = sh2(c, .34); g.fillRect(12, 24, 8, 3);   // 손잡이 홈
        stroke(dk, 2, () => { g.moveTo(16, 17); g.lineTo(16, 10); });   // 대
        // 접시 — 위로 열린 반원
        g.fillStyle = c; g.beginPath(); g.arc(16, 10, 7, Math.PI, 0); g.closePath(); g.fill();
        g.fillStyle = sh2(c, .62); g.beginPath(); g.arc(16, 10, 4.4, Math.PI, 0); g.closePath(); g.fill();
        circ(16, 6.5, 1.6, lt);                                 // 신호점
        glow(16, 6.5, 8, c, .3);
        return;
      }
    }
  },
  coconut_i(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        /* 코코넛 — 반으로 쪼갠 모양. */
        const c = s.c, husk = sh2(c, .72), meat = '#f0e8d8';
        circ(16, 17, 11, husk);
        for (let i = 0; i < 26; i++) {                      // 겉껍질 섬유결
          const a = rng.range(0, TAU), r = rng.range(6, 10.5);
          g.fillStyle = sh2(c, rng.chance(.5) ? 1.25 : .55);
          g.fillRect(16 + Math.cos(a) * r, 17 + Math.sin(a) * r, 1.4, 1.4);
        }
        circ(16, 17, 7.6, meat);                            // 속살
        circ(16, 17, 5.4, sh2('#cfc4ae', 1));               // 안쪽 그늘(물이 찬 자리)
        for (const [dx, dy] of [[-2.6, -1.6], [2.6, -1.6], [0, 2.6]])
          circ(16 + dx, 17 + dy, 1.15, sh2(c, .5));         // 씨눈 셋
        return;
      }
    }
  },
  candy(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        /* 사탕 — 가운데 알맹이에 양쪽 포장지를 꼬아 묶은 모양. */
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .62);
        g.fillStyle = dk;                                   // 포장지 (좌우 삼각)
        g.beginPath(); g.moveTo(4, 11); g.lineTo(11, 16); g.lineTo(4, 21); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(28, 11); g.lineTo(21, 16); g.lineTo(28, 21); g.closePath(); g.fill();
        circ(16, 16, 6.5, c);                               // 알맹이
        g.strokeStyle = lt; g.lineWidth = 2;                // 나선 무늬
        g.beginPath(); g.moveTo(12, 19); g.quadraticCurveTo(16, 12, 20, 15); g.stroke();
        g.lineWidth = 1;
        circ(13.6, 13.4, 1.8, sh2(c, 1.6));                 // 광택
        return;
      }
    }
  },
  wisp(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 16, 13, c, .3);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 3); g.quadraticCurveTo(24, 13, 16, 29);
        g.quadraticCurveTo(8, 13, 16, 3); g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.5); g.beginPath();
        g.moveTo(16, 7); g.quadraticCurveTo(20, 14, 16, 24);
        g.quadraticCurveTo(12, 14, 16, 7); g.closePath(); g.fill();
        circ(16, 15, 2.2, '#ffffff');
        circ(23, 8, 1.4, c); circ(9, 22, 1.2, c);
        return;
      }
    }
  },
};
Object.assign(ITEM_PAINT, ItemPaintFarm);
