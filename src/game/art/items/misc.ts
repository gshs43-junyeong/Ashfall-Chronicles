/* ===== art/items/misc.js — 장비 칸 실루엣 · 설치물 · 문 · 펫 · NPC 초상 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 Art. */

export const ItemPaintMisc: Bag = {
  /* ---------- 장비 칸 실루엣 ---------- */
  slotic(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = '#6a6250', l = '#8e8672';
        switch (s.m) {
          case 'weapon':                                   // 검
            poly([[16, 3], [19, 9], [19, 21], [13, 21], [13, 9]], c);
            P(15.2, 4, 1.6, 16, l);
            P(9, 21, 14, 2.6, c);                          // 날밑
            P(15, 23.6, 2, 6, c); P(13.5, 28.5, 5, 2, c);  // 자루
            break;
          case 'helm':                                     // 투구
            poly([[7, 20], [7, 13], [10, 8], [22, 8], [25, 13], [25, 20]], c);
            poly([[9, 19], [9, 14], [11, 10], [16, 10], [16, 19]], l);
            P(15, 12, 2, 9, '#3d382d');                    // 면갑 틈
            P(7, 20, 18, 2.4, c);
            break;
          case 'chest':                                    // 흉갑
            poly([[8, 8], [24, 8], [26, 13], [23, 26], [9, 26], [6, 13]], c);
            poly([[8, 8], [16, 8], [16, 26], [9, 26], [6, 13]], l);
            P(12, 6, 8, 3, c);                             // 목깃
            P(15.2, 10, 1.6, 15, '#3d382d');
            break;
          case 'boots':                                    // 장화 두 짝
            for (const bx of [7, 17]) {
              P(bx, 8, 7, 13, c);
              P(bx, 8, 2.4, 13, l);
              poly([[bx, 21], [bx + 9, 21], [bx + 9, 25], [bx, 25]], c);
              P(bx, 24, 9, 1.6, '#3d382d');
            }
            break;
          case 'acc':                                      // 반지
            stroke(c, 3.4, () => { g.arc(16, 19, 7.5, 0, TAU); });
            stroke(l, 1.2, () => { g.arc(16, 19, 7.5, Math.PI * 1.1, Math.PI * 1.7); });
            poly([[16, 3], [20, 8], [16, 13], [12, 8]], c);   // 보석
            poly([[16, 3], [16, 13], [12, 8]], l);
            break;
          case 'bag':                                      // 배낭
            poly([[8, 11], [24, 11], [26, 27], [6, 27]], c);
            poly([[8, 11], [16, 11], [16, 27], [6, 27]], l);
            stroke(c, 2.2, () => { g.moveTo(11, 11); g.bezierCurveTo(11, 4, 21, 4, 21, 11); });   // 손잡이
            P(13, 17, 6, 5, '#3d382d');                    // 잠금쇠
            break;
          case 'util':                                     // 렌치 — '유틸리티' 칸 그 자체
            /* 여기는 앞으로 산소통 말고도 여러 도구가 들어올 자리라, 특정 물건이 아니라 *도구**를 뜻하는 그림이어야 한다. */
            P(13.5, 12, 5, 13, c);                         // 자루
            P(14.5, 13, 1.6, 11, l);                       // 빛 받는 면
            // 물림쇠 — 'ㄷ'을 옆으로 눕힌 모양.
            P(10.5, 4, 11, 3.2, c);                        // 위 턱
            P(10.5, 9.5, 11, 3.2, c);                      // 아래 턱
            P(18.5, 4, 3, 8.7, c);                         // 등
            P(19.2, 5, 1.2, 6.5, l);
            P(11.5, 5, 6, 1.2, l);                         // 위 턱 하이라이트
            circ(16, 26.5, 3.6, c);                        // 손잡이 끝
            circ(16, 26.5, 1.5, '#3d382d');                // 구멍
            break;
          case 'pet':                                      // 발자국 — 어느 칸이 펫인지
            ell(12, 20, 5.5, 6.5, c);                      // 발바닥
            for (const [tx, ty, r] of [[7, 11, 2.4], [12, 8.5, 2.6], [17.5, 10, 2.4], [21.5, 14, 2.2]])
              circ(tx, ty, r, l);                          // 발가락
            break;
        }
        return;
      }
    }
  },
  /* ---------- 손으로 놓는 설치물 ---------- */
  stationic(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        if (s.m === 'work') {                             // 작업대 — 상판 + 다리 두 개
          P(3, 9, 26, 4, '#9c7a4a');
          P(3, 13, 26, 3, '#7a5734');
          P(6, 16, 5, 12, '#7a5734'); P(21, 16, 5, 12, '#7a5734');
          P(6, 25, 20, 3, '#5c4026');
        } else if (s.m === 'forge') {                     // 용광로 — 막힌 몸통 + 불구멍
          P(4, 4, 24, 5, '#33333a');
          P(4, 9, 24, 19, '#4a4a52');
          P(6, 10, 20, 2, '#5c5c66');
          P(9, 19, 14, 7, '#ff8a3a');
          glow(16, 22, 9, '#ff8a3a', .3);
        } else {                                          // 저장 상자 — 뚜껑 띠 + 자물쇠
          const gold = s.gold;
          if (gold) glow(16, 18, 13, '#ffd85a', .26);
          P(4, 11, 24, 17, gold ? '#8a6a1a' : '#7a5326');
          P(4, 7, 24, 5, gold ? '#a8841f' : '#96683a');
          P(4, 11, 24, 3, gold ? '#ffd85a' : '#c8a04a');
          P(13, 10, 6, 7, gold ? '#ffd85a' : '#c8a04a');
          P(14.5, 13, 3, 3, '#3a2610');
        }
        return;
      }
    }
  },
  /* ---------- 문 ---------- */
  doorit(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        P(4, 2, 24, 28, '#3a2610');                     // 문틀
        P(5.5, 3.5, 21, 25, '#6f4c2c');                 // 문짝
        for (let i = 0; i < 4; i++) P(9.5 + i * 4.2, 3.5, 1, 25, '#4a3018');  // 널 이음매
        P(5.5, 9, 21, 1.6, '#4a3018'); P(5.5, 21, 21, 1.6, '#4a3018');        // 가로 띠 둘
        P(6.5, 8.4, 4.5, 2.8, '#8a8a94'); P(6.5, 20.4, 4.5, 2.8, '#8a8a94');  // 경첩 — 왼쪽
        P(21, 14, 3.4, 5, '#d8a94b');                   // 손잡이 — 오른쪽
        P(22.1, 15.6, 1.4, 2, '#3a2610');
        return;
      }
    }
  },
  /* ---------- 펫 ---------- */
  pet(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, dark = sh2(c, 0.62), lite = sh2(c, 1.3);
        const eye = '#1a1a22';
        if (s.r === 2) glow(16, 17, 13, c, 0.22);        // 영웅 등급은 은은하게 빛난다
        switch (s.form) {
          case 'moth':                                    // 나방 — 위아래 날개 두 쌍
            ell(10, 13, 6, 5, lite); ell(22, 13, 6, 5, lite);
            ell(11, 20, 4.5, 4, c); ell(21, 20, 4.5, 4, c);
            ell(16, 17, 2.6, 8, dark);                    // 몸통
            circ(16, 10, 2.6, dark);
            stroke(dark, 1.2, () => { g.moveTo(15, 8); g.lineTo(12, 4); g.moveTo(17, 8); g.lineTo(20, 4); });
            circ(15, 10, 0.9, eye); circ(17.2, 10, 0.9, eye);
            break;
          case 'bird':                                    // 새 — 몸통 + 접힌 날개 + 부리
            ell(16, 19, 7.5, 8, c);
            ell(11.5, 19, 4, 6, dark);                    // 날개
            circ(17, 11, 5.5, lite);                      // 머리
            poly([[22, 11], [28, 13], [22, 14.5]], '#e0a848');   // 부리
            circ(19, 10, 1.3, eye);
            poly([[13, 26], [19, 26], [16, 30]], dark);   // 꼬리
            break;
          case 'rock':                                    // 둥근 것 — 돌·두꺼비처럼 납작하고 넓적
            ell(16, 20, 11, 8.5, c);
            ell(16, 16.5, 8, 5, lite);
            circ(12, 16, 1.7, eye); circ(20, 16, 1.7, eye);
            P(8, 25, 5, 3, dark); P(19, 25, 5, 3, dark);  // 짧은 다리
            break;
          case 'wisp':                                    // 정령 — 핵 + 흔들리는 꼬리
            glow(16, 15, 11, c, 0.3);
            circ(16, 15, 6, lite);
            circ(16, 15, 3.4, '#fff');
            for (const [wx, wy, wr] of [[13, 23, 2.6], [18, 26, 2], [15, 29, 1.4]]) circ(wx, wy, wr, c);
            break;
          case 'drake':                                   // 새끼용 — 뿔 + 날개 + 꼬리
            ell(15, 20, 8, 7, c);
            poly([[20, 12], [29, 15], [21, 19]], dark);   // 날개
            circ(13, 13, 5.5, lite);                      // 머리
            poly([[10, 9], [12, 4], [13.5, 9]], dark);    // 뿔
            poly([[15, 9], [17, 5], [18, 9]], dark);
            circ(11.5, 13, 1.4, eye);
            stroke(dark, 2.2, () => { g.moveTo(21, 23); g.quadraticCurveTo(28, 25, 26, 30); });   // 꼬리
            break;
          default:                                        // beast — 네발 짐승
            ell(15, 20, 8.5, 6.5, c);
            circ(22, 15, 5.5, lite);                      // 머리
            poly([[19, 11], [21, 6], [23, 11]], dark);    // 귀
            poly([[23, 11], [25, 7], [26.5, 11]], dark);
            circ(23.5, 15, 1.4, eye);
            P(9, 25, 3.4, 4, dark); P(15, 25, 3.4, 4, dark); P(20, 25, 3.4, 4, dark);
            stroke(lite, 3, () => { g.moveTo(8, 19); g.quadraticCurveTo(2, 16, 5, 10); });        // 꼬리
            break;
        }
        return;
      }
    }
  },
  /* ---------- NPC 초상 ---------- */
  npc(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const p = s.p;
        P(4, 24, 24, 8, p.cloth);
        P(4, 24, 24, 1.6, sh2(p.cloth, 1.3));
        circ(16, 15, 9, p.skin);
        P(7, 15, 18, 8, p.skin);
        if (p.long) { P(4, 10, 5, 16, p.hair); P(23, 10, 5, 16, p.hair); }
        g.fillStyle = p.hair; g.beginPath(); g.arc(16, 14, 9.4, Math.PI, 0); g.fill();
        P(6.6, 11, 18.8, 3.2, p.hair);
        if (p.hat) { poly([[16, 0], [27, 12], [5, 12]], sh2(p.cloth, .7)); P(3, 11, 26, 2.6, sh2(p.cloth, .55)); }
        circ(12.6, 16.5, 1.5, '#2a2028'); circ(19.4, 16.5, 1.5, '#2a2028');
        if (p.old) { P(9, 14.6, 6, 1, '#8a8a8a'); P(17, 14.6, 6, 1, '#8a8a8a'); }
        if (p.beard) { g.fillStyle = p.hair; g.beginPath(); g.arc(16, 21, 7, 0, Math.PI); g.fill(); P(9, 20, 14, 4, p.hair); }
        else P(14, 20.5, 4, 1.2, sh2(p.skin, .72));
        return;
      }
    }
  },
};
Object.assign(ITEM_PAINT, ItemPaintMisc);
