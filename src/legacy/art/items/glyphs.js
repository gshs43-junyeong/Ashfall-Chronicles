/* ===== art/items/glyphs.js — 업적 글리프 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 Art. */

export const ItemPaintGlyphs = {
  gl(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const G1 = '#e8dcc0', G2 = '#c8a058', DK = '#4a4238', RD = '#d05a4a', GR = '#6fbf5a';
        const BL = '#6fa8d8', PL = '#b17fe0';
        switch (s.g) {
          case 'shard':                                    // 별 조각 — 뾰족한 마름모
            glow(16, 16, 12, G2, .3);
            poly([[16, 3], [23, 16], [16, 29], [9, 16]], G1);
            poly([[16, 3], [23, 16], [16, 16]], G2);
            break;
          case 'house':                                    // 집 — 지붕 + 몸통 + 문
            poly([[16, 5], [28, 15], [4, 15]], RD);
            g.fillStyle = G1; g.fillRect(7, 15, 18, 12);
            g.fillStyle = DK; g.fillRect(14, 19, 5, 8);
            break;
          case 'wall':                                     // 성벽 — 흉벽 이가 빠진 윗면
            g.fillStyle = G1; g.fillRect(5, 12, 22, 15);
            for (let i = 0; i < 3; i++) g.fillRect(5 + i * 8, 7, 5, 5);
            g.fillStyle = DK; g.fillRect(5, 18, 22, 1.5); g.fillRect(15, 12, 1.5, 15);
            break;
          case 'wave':                                     // 물결 셋
            for (let i = 0; i < 3; i++)
              stroke(i === 1 ? BL : sh2(BL, .78), 3, () => {
                g.moveTo(4, 11 + i * 6);
                g.quadraticCurveTo(10, 6 + i * 6, 16, 11 + i * 6);
                g.quadraticCurveTo(22, 16 + i * 6, 28, 11 + i * 6);
              });
            break;
          case 'crown':                                    // 왕관
            poly([[5, 24], [5, 10], [11, 16], [16, 7], [21, 16], [27, 10], [27, 24]], G2);
            g.fillStyle = sh2(G2, .68); g.fillRect(5, 22, 22, 3);
            circ(16, 7, 2, G1);
            break;
          case 'sword':                                    // 검 — 세로로 선 날
            poly([[16, 3], [19, 8], [19, 20], [13, 20], [13, 8]], G1);
            g.fillStyle = DK; g.fillRect(9, 20, 14, 3);
            g.fillStyle = sh2(G2, .8); g.fillRect(15, 23, 3, 6);
            break;
          case 'trophy':                                   // 우승컵
            poly([[9, 5], [23, 5], [21, 17], [11, 17]], G2);
            stroke(G2, 2, () => { g.moveTo(9, 8); g.quadraticCurveTo(4, 12, 10, 15); });
            stroke(G2, 2, () => { g.moveTo(23, 8); g.quadraticCurveTo(28, 12, 22, 15); });
            g.fillStyle = sh2(G2, .7); g.fillRect(14, 17, 4, 6); g.fillRect(9, 23, 14, 4);
            break;
          case 'field':                                    // 밭 이랑
            g.fillStyle = sh2('#7a5a34', 1); g.fillRect(3, 16, 26, 12);
            for (let i = 0; i < 4; i++) {
              g.fillStyle = sh2('#7a5a34', .72); g.fillRect(4 + i * 7, 16, 2, 12);
              stroke(GR, 2, () => { g.moveTo(7 + i * 7, 16); g.lineTo(7 + i * 7, 8); });
            }
            break;
          case 'factory':                                  // 공장 — 굴뚝 셋과 연기
            g.fillStyle = DK; g.fillRect(4, 16, 24, 12);
            for (let i = 0; i < 3; i++) g.fillStyle = sh2(G1, .74), g.fillRect(6 + i * 8, 9 + i * 2, 5, 8);
            circ(9, 6, 2.4, 'rgba(200,190,170,.5)'); circ(14, 4, 1.8, 'rgba(200,190,170,.35)');
            break;
          case 'anvil':                                    // 모루 — 한쪽 뿔
            g.fillStyle = '#5d5d68'; g.fillRect(6, 12, 20, 5);
            poly([[6, 12], [1, 14.5], [6, 17]], '#5d5d68');
            g.fillStyle = '#3a3a44'; g.fillRect(12, 17, 8, 5);
            g.fillStyle = '#4a3a26'; g.fillRect(8, 22, 16, 6);
            g.fillStyle = '#7a7a88'; g.fillRect(6, 12, 20, 1.5);
            break;
          case 'pit':                                      // 파 내려간 구덩이
            g.fillStyle = sh2('#7a5a34', .9); g.fillRect(3, 8, 26, 20);
            g.fillStyle = '#141210';
            poly([[8, 8], [24, 8], [20, 20], [16, 27], [12, 20]], '#141210');
            break;
          case 'down':                                     // 아래 화살표
            stroke(G1, 3, () => { g.moveTo(16, 5); g.lineTo(16, 21); });
            poly([[16, 28], [8, 17], [24, 17]], G1);
            break;
          case 'cloud':
            circ(11, 18, 6, G1); circ(19, 17, 7, G1); circ(24, 20, 5, G1);
            g.fillStyle = G1; g.fillRect(11, 18, 14, 6);
            break;
          case 'tablet':                                   // 석판 + 글줄
            g.fillStyle = '#7a7268'; g.fillRect(7, 4, 18, 24);
            g.fillStyle = '#5a5248'; g.fillRect(7, 4, 18, 2);
            for (let i = 0; i < 4; i++) g.fillStyle = '#a8a094', g.fillRect(10, 10 + i * 4, 12 - (i % 2) * 4, 1.5);
            break;
          case 'bubble':                                   // 물방울 셋
            circ(12, 20, 5.5, 'rgba(160,215,240,.85)'); circ(10.3, 18.3, 1.8, '#fff');
            circ(21, 13, 3.6, 'rgba(160,215,240,.7)');
            circ(17, 7, 2.2, 'rgba(160,215,240,.55)');
            break;
          case 'skull':
            circ(16, 14, 9, G1);
            g.fillStyle = G1; g.fillRect(11, 20, 10, 5);
            circ(12.5, 13, 2.6, DK); circ(19.5, 13, 2.6, DK);
            g.fillStyle = DK; g.fillRect(15, 17, 2, 3);
            for (let i = 0; i < 3; i++) g.fillStyle = DK, g.fillRect(12 + i * 3, 22, 1.5, 3);
            break;
          case 'redmoon':
            glow(16, 16, 13, RD, .38);
            circ(16, 16, 9, RD);
            circ(13, 13, 1.8, sh2(RD, .7)); circ(20, 18, 2.4, sh2(RD, .7));
            break;
          case 'key':
            circ(10, 11, 5.5, G2); circ(10, 11, 2.2, '#171410');
            stroke(G2, 3, () => { g.moveTo(13, 14); g.lineTo(24, 25); });
            stroke(G2, 3, () => { g.moveTo(20, 21); g.lineTo(24, 17); });
            break;
          case 'candle':
            g.fillStyle = G1; g.fillRect(13, 13, 6, 14);
            g.fillStyle = sh2(G1, .8); g.fillRect(11, 25, 10, 3);
            glow(16, 8, 7, '#ffd24a', .5);
            poly([[16, 3], [19, 9], [16, 12], [13, 9]], '#ffd24a');
            break;
          case 'bed':
            g.fillStyle = '#5a3c22'; g.fillRect(4, 14, 24, 4); g.fillRect(4, 10, 3, 14);
            g.fillStyle = '#e8dcc0'; g.fillRect(7, 11, 8, 4);
            g.fillStyle = '#7a5734'; g.fillRect(7, 18, 21, 5);
            g.fillStyle = '#3a2610'; g.fillRect(5, 23, 3, 5); g.fillRect(24, 23, 3, 5);
            break;
          case 'scroll':
            g.fillStyle = '#e0d4b0'; g.fillRect(8, 5, 16, 22);
            g.fillStyle = '#c0b28c'; g.fillRect(8, 5, 16, 2); g.fillRect(8, 25, 16, 2);
            for (let i = 0; i < 4; i++) g.fillStyle = '#8a7a58', g.fillRect(11, 10 + i * 4, 10 - (i % 2) * 3, 1.4);
            break;
          case 'sun':
            glow(16, 16, 13, '#ffd24a', .4);
            circ(16, 16, 6.5, '#ffd24a');
            for (let i = 0; i < 8; i++) {
              const a = i * TAU / 8;
              stroke('#ffd24a', 2, () => {
                g.moveTo(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9);
                g.lineTo(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13);
              });
            }
            break;
          case 'coin':
            circ(16, 16, 9, G2); circ(16, 16, 6.5, sh2(G2, 1.25));
            g.fillStyle = sh2(G2, .6); g.fillRect(15, 11, 2, 10);
            break;
          case 'coins':
            circ(11, 21, 7, sh2(G2, .82)); circ(21, 19, 7, sh2(G2, .9));
            circ(16, 12, 7.5, G2); circ(16, 12, 5, sh2(G2, 1.3));
            break;
          case 'paw':
            ell(16, 21, 6.5, 5.5, G1);
            circ(9.5, 13, 3, G1); circ(14, 10, 3, G1); circ(19, 10, 3, G1); circ(23, 14, 3, G1);
            break;
          case 'hands':                                    // 악수
            stroke(G1, 4, () => { g.moveTo(4, 12); g.lineTo(15, 17); });
            stroke(G2, 4, () => { g.moveTo(28, 12); g.lineTo(17, 17); });
            circ(16, 18, 4.5, G1);
            break;
          case 'receipt':
            g.fillStyle = '#e0d4b0'; g.fillRect(8, 4, 16, 22);
            poly([[8, 26], [12, 23], [16, 26], [20, 23], [24, 26], [24, 28], [8, 28]], '#171410');
            for (let i = 0; i < 4; i++) g.fillStyle = '#8a7a58', g.fillRect(11, 9 + i * 4, 10 - (i % 2) * 4, 1.4);
            break;
          case 'clock': case 'clock2': case 'clock3': {
            const rings = s.g === 'clock' ? 1 : s.g === 'clock2' ? 2 : 3;
            circ(16, 16, 11, G1); circ(16, 16, 9, '#171410');
            // 시침 각도로 1·10·100시간을 가른다 — 같은 시계가 셋이면 구분이 안 된다
            const ang = [-Math.PI / 2 + 0.5, -Math.PI / 2 + 2.6, -Math.PI / 2 + 4.7][rings - 1];
            stroke(G2, 2.4, () => { g.moveTo(16, 16); g.lineTo(16 + Math.cos(ang) * 6, 16 + Math.sin(ang) * 6); });
            stroke(G1, 2, () => { g.moveTo(16, 16); g.lineTo(16, 9); });
            for (let i = 0; i < rings; i++) circ(16, 29 - i * 0, 0, G2);
            g.fillStyle = G2;
            for (let i = 0; i < rings; i++) g.fillRect(11 + i * 5, 28, 3, 3);   // 아래 점으로 등급 표시
            break;
          }
          case 'lung':                                     // 숨 — 허파 둘과 새는 방울
            ell(11, 19, 5, 7, sh2(RD, .95)); ell(21, 19, 5, 7, sh2(RD, .95));
            g.fillStyle = sh2(RD, .7); g.fillRect(15, 8, 2, 9);
            circ(24, 8, 2.4, 'rgba(160,215,240,.8)'); circ(27, 4, 1.5, 'rgba(160,215,240,.6)');
            break;
          case 'grave':
            g.fillStyle = '#7a7268';
            poly([[8, 27], [8, 12], [16, 5], [24, 12], [24, 27]], '#7a7268');
            g.fillStyle = '#4a443c'; g.fillRect(14, 12, 4, 11); g.fillRect(11, 15, 10, 4);
            g.fillStyle = '#3a4a2a'; g.fillRect(4, 27, 24, 3);
            break;
          case 'hidden':                                   // 숨은 업적 — 물음표
            circ(16, 16, 11, 'rgba(120,112,96,.22)');
            g.fillStyle = '#8a8271'; g.font = 'bold 19px sans-serif';
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText('?', 16, 16.5);
            g.textAlign = 'start'; g.textBaseline = 'alphabetic';
            break;
          default:                                         // star
            glow(16, 16, 12, G2, .32);
            poly([[16, 3], [19.5, 12.5], [29, 12.5], [21.5, 18.5], [24.5, 28],
                  [16, 22], [7.5, 28], [10.5, 18.5], [3, 12.5], [12.5, 12.5]], G2);
        }
        return;
      }
    }
  },
};
Object.assign(ITEM_PAINT, ItemPaintGlyphs);
