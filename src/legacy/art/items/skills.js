/* ===== art/items/skills.js — 스킬 아이콘 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 Art. */

export const ItemPaintSkills = {
  /* ---------- 스킬 아이콘 ---------- */
  slash(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        stroke(c, 4, () => { g.arc(16, 18, 11, -2.5, -.3); });
        stroke(sh2(c, 1.5), 1.6, () => { g.arc(16, 18, 11, -2.3, -.55); });
        stroke(sh2(c, .7), 2.4, () => { g.arc(16, 22, 9, -2.4, -.5); });
        poly([[27, 15], [30, 10], [25, 12]], sh2(c, 1.4));
        return;
      }
    }
  },
  shield(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        poly([[16, 3], [27, 8], [26, 20], [16, 29], [6, 20], [5, 8]], c);
        poly([[16, 3], [16, 29], [6, 20], [5, 8]], sh2(c, 1.3));
        poly([[16, 8], [22, 11], [21, 19], [16, 24], [11, 19], [10, 11]], sh2(c, .65));
        P(15.2, 10, 1.6, 12, sh2(c, 1.6));
        return;
      }
    }
  },
  impact(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 16, 12, c, .22);
        g.fillStyle = c; g.beginPath();
        for (let i = 0; i < 12; i++) {
          const r = i % 2 ? 5 : 14, a = -Math.PI / 2 + i * Math.PI / 6;
          const x = 16 + Math.cos(a) * r, y = 16 + Math.sin(a) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        circ(16, 16, 5, sh2(c, 1.45));
        circ(16, 16, 2.2, '#ffffff');
        return;
      }
    }
  },
  blood(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 4);
        g.bezierCurveTo(25, 16, 25, 22, 16, 28);
        g.bezierCurveTo(7, 22, 7, 16, 16, 4);
        g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.4); g.beginPath();
        g.moveTo(16, 10); g.bezierCurveTo(20, 17, 20, 21, 16, 24);
        g.bezierCurveTo(12, 21, 12, 17, 16, 10); g.closePath(); g.fill();
        ell(13, 20, 1.8, 2.6, 'rgba(255,255,255,.45)');
        return;
      }
    }
  },
  whirl(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        for (let i = 0; i < 3; i++) {
          const a0 = i * TAU / 3;
          stroke(i ? sh2(c, .8) : c, 2.6, () => { g.arc(16, 16, 6 + i * 3.6, a0, a0 + 2.1); });
        }
        circ(16, 16, 2.6, sh2(c, 1.5));
        return;
      }
    }
  },
  titan(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        poly([[8, 10], [24, 10], [26, 28], [6, 28]], c);
        poly([[8, 10], [16, 10], [16, 28], [6, 28]], sh2(c, 1.25));
        poly([[10, 4], [22, 4], [24, 10], [8, 10]], sh2(c, .75));
        circ(12, 17, 2, sh2(c, .55)); circ(20, 17, 2, sh2(c, .55));
        P(11, 23, 10, 1.6, sh2(c, .55));
        return;
      }
    }
  },
  dash(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        for (let i = 0; i < 3; i++) {
          const y = 10 + i * 6, w = 16 - i * 3;
          P(4, y, w, 2.6, i === 1 ? c : sh2(c, .72));
        }
        poly([[20, 6], [30, 16], [20, 26], [20, 20], [24, 16], [20, 12]], c);
        poly([[20, 6], [30, 16], [24, 16], [20, 12]], sh2(c, 1.35));
        return;
      }
    }
  },
  target(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        stroke(c, 2.4, () => { g.arc(16, 16, 11, 0, TAU); });
        stroke(sh2(c, .75), 2, () => { g.arc(16, 16, 6, 0, TAU); });
        circ(16, 16, 2.4, c);
        stroke(c, 2, () => { g.moveTo(16, 1); g.lineTo(16, 6); });
        stroke(c, 2, () => { g.moveTo(16, 26); g.lineTo(16, 31); });
        stroke(c, 2, () => { g.moveTo(1, 16); g.lineTo(6, 16); });
        stroke(c, 2, () => { g.moveTo(26, 16); g.lineTo(31, 16); });
        return;
      }
    }
  },
  volley(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        for (let i = -1; i <= 1; i++) {
          const a = -0.5 + i * 0.42;
          const x0 = 5, y0 = 16 - i * 2, x1 = x0 + Math.cos(a) * 22, y1 = y0 + Math.sin(a) * 22;
          stroke(i === 0 ? c : sh2(c, .75), 2, () => { g.moveTo(x0, y0); g.lineTo(x1, y1); });
          poly([[x1, y1], [x1 - 4.5, y1 + 1], [x1 - 3, y1 + 4]], sh2(c, 1.35));
        }
        return;
      }
    }
  },
  wind(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        stroke(c, 2.4, () => { g.moveTo(3, 11); g.lineTo(20, 11); g.quadraticCurveTo(26, 11, 24, 6); });
        stroke(sh2(c, .8), 2.4, () => { g.moveTo(5, 18); g.lineTo(24, 18); g.quadraticCurveTo(30, 18, 27, 24); });
        stroke(sh2(c, .65), 2.2, () => { g.moveTo(3, 25); g.lineTo(16, 25); });
        return;
      }
    }
  },
  rain(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        for (let i = 0; i < 3; i++) {
          const x = 7 + i * 9, y0 = 2 + (i % 2) * 4;
          stroke(i === 1 ? c : sh2(c, .78), 2, () => { g.moveTo(x, y0); g.lineTo(x, y0 + 16); });
          poly([[x, y0 + 18], [x - 3.2, y0 + 13], [x + 3.2, y0 + 13]], sh2(c, 1.35));
        }
        glow(16, 28, 8, c, .22);
        return;
      }
    }
  },
  eye(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        g.fillStyle = '#f2ece0'; g.beginPath();
        g.moveTo(2, 16); g.quadraticCurveTo(16, 4, 30, 16);
        g.quadraticCurveTo(16, 28, 2, 16); g.closePath(); g.fill();
        circ(16, 16, 6.4, c);
        circ(16, 16, 3, '#1a1620');
        circ(13.8, 13.6, 1.6, '#ffffff');
        stroke(sh2(c, .6), 1.6, () => { g.moveTo(2, 16); g.quadraticCurveTo(16, 4, 30, 16); });
        return;
      }
    }
  },
  flame(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 18, 12, c, .26);
        g.fillStyle = sh2(c, .8); g.beginPath();
        g.moveTo(16, 2); g.quadraticCurveTo(29, 15, 22, 25);
        g.quadraticCurveTo(16, 31, 10, 25);
        g.quadraticCurveTo(3, 15, 16, 2); g.closePath(); g.fill();
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 8); g.quadraticCurveTo(24, 17, 20, 24);
        g.quadraticCurveTo(16, 28, 12, 24);
        g.quadraticCurveTo(8, 17, 16, 8); g.closePath(); g.fill();
        ell(16, 22, 3.4, 4.4, '#ffe98c');
        return;
      }
    }
  },
  book(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        poly([[3, 8], [15, 6], [15, 26], [3, 27]], c);
        poly([[29, 8], [17, 6], [17, 26], [29, 27]], sh2(c, .78));
        P(15, 6, 2, 20, sh2(c, .5));
        for (let i = 0; i < 3; i++) { P(5, 12 + i * 4, 8, 1.2, sh2(c, 1.5)); P(19, 12 + i * 4, 8, 1.2, sh2(c, 1.3)); }
        glow(16, 8, 7, '#ffe08a', .28);
        return;
      }
    }
  },
  heal(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 16, 13, c, .28);
        P(13, 5, 6, 22, c);
        P(5, 13, 22, 6, c);
        P(14.2, 5, 1.8, 22, sh2(c, 1.4));
        P(5, 14.2, 22, 1.8, sh2(c, 1.4));
        circ(26, 6, 2, '#ffffff'); circ(6, 25, 1.5, '#ffffff');
        return;
      }
    }
  },
  snow(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 16, 12, c, .24);
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3;
          const dx = Math.cos(a) * 13, dy = Math.sin(a) * 13;
          stroke(c, 2.2, () => { g.moveTo(16 - dx, 16 - dy); g.lineTo(16 + dx, 16 + dy); });
          for (const t of [-1, 1]) {
            const bx = 16 + dx * .55 * t, by = 16 + dy * .55 * t;
            stroke(c, 1.6, () => {
              g.moveTo(bx, by);
              g.lineTo(bx + Math.cos(a + 0.9) * 5 * t, by + Math.sin(a + 0.9) * 5 * t);
            });
            stroke(c, 1.6, () => {
              g.moveTo(bx, by);
              g.lineTo(bx + Math.cos(a - 0.9) * 5 * t, by + Math.sin(a - 0.9) * 5 * t);
            });
          }
        }
        circ(16, 16, 2.4, '#ffffff');
        return;
      }
    }
  },
  wolf(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 17, 12, c, .2);
        poly([[6, 12], [8, 3], [13, 9]], c);
        poly([[26, 12], [24, 3], [19, 9]], c);
        poly([[7, 11], [25, 11], [23, 22], [16, 29], [9, 22]], c);
        poly([[7, 11], [16, 11], [16, 29], [9, 22]], sh2(c, 1.25));
        circ(12, 17, 1.8, '#1a2230'); circ(20, 17, 1.8, '#1a2230');
        poly([[16, 22], [18.4, 25], [13.6, 25]], '#1a2230');
        return;
      }
    }
  },
  rune(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 16, 13, c, .26);
        stroke(c, 2, () => { g.arc(16, 16, 12, 0, TAU); });
        stroke(sh2(c, .75), 1.4, () => { g.arc(16, 16, 8, 0, TAU); });
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6;
          P(16 + Math.cos(a) * 12 - 1.2, 16 + Math.sin(a) * 12 - 1.2, 2.4, 2.4, sh2(c, 1.4));
        }
        poly([[16, 8], [21, 16], [16, 24], [11, 16]], sh2(c, 1.3));
        circ(16, 16, 2, '#ffffff');
        return;
      }
    }
  },
  /* ---------- 스킬 아이콘 ---------- */
  bulwark(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {           // 철벽 — 벽돌을 쌓아 올린 방벽
        const c = s.c;
        glow(16, 18, 12, c, .18);
        for (let r = 0; r < 3; r++) {
          const y = 11 + r * 6, off = r % 2 ? -3 : 0;
          for (let i = -1; i <= 1; i++) P(11 + i * 7 + off, y, 6.2, 5.2, i ? sh2(c, .78) : c);
        }
        P(4, 8, 24, 2.2, sh2(c, 1.35));
        stroke(sh2(c, 1.5), 1.4, () => { g.moveTo(6, 10.4); g.lineTo(26, 10.4); });
        return;
      }
    }
  },
  quake(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {             // 대지 가르기 — 갈라진 땅과 솟는 파편
        const c = s.c;
        P(2, 20, 28, 3, sh2(c, .68));
        poly([[16, 30], [12, 21], [15, 21], [13, 14], [20, 22], [17, 22], [19, 30]], sh2(c, 1.4));
        for (const [x, h] of [[6, 6], [10, 9], [22, 9], [26, 6]])
          poly([[x, 20], [x + 2.4, 20 - h], [x + 4.8, 20]], c);
        stroke(sh2(c, 1.2), 1.6, () => { g.moveTo(3, 26); g.lineTo(9, 24); });
        stroke(sh2(c, 1.2), 1.6, () => { g.moveTo(29, 26); g.lineTo(23, 24); });
        return;
      }
    }
  },
  shout(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {             // 전투 함성 — 벌린 입에서 퍼져 나가는 파동
        const c = s.c;
        glow(11, 16, 11, c, .2);
        poly([[4, 10], [12, 10], [12, 22], [4, 22]], sh2(c, .7));
        poly([[12, 6], [12, 26], [17, 22], [17, 10]], c);
        for (let i = 0; i < 3; i++)
          stroke(sh2(c, 1 + i * .18), 2 - i * .3, () => { g.arc(17, 16, 5 + i * 5, -0.85, 0.85); });
        return;
      }
    }
  },
  lifebeat(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {          // 불굴 — 심장과 맥박선
        const c = s.c;
        glow(16, 16, 12, c, .24);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 27);
        g.bezierCurveTo(3, 18, 4, 7, 11, 7);
        g.bezierCurveTo(14, 7, 16, 10, 16, 11);
        g.bezierCurveTo(16, 10, 18, 7, 21, 7);
        g.bezierCurveTo(28, 7, 29, 18, 16, 27);
        g.closePath(); g.fill();
        stroke('#fff6e8', 2, () => {
          g.moveTo(4, 17); g.lineTo(10, 17); g.lineTo(12.5, 11.5);
          g.lineTo(16, 22); g.lineTo(19, 15); g.lineTo(21.5, 17); g.lineTo(28, 17);
        });
        return;
      }
    }
  },
  pierce(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {            // 꿰뚫는 화살 — 과녁을 지나가 버린 한 발
        const c = s.c;
        stroke(sh2(c, .55), 1.6, () => { g.arc(19, 16, 8.5, 0, TAU); });
        stroke(sh2(c, .55), 1.4, () => { g.arc(19, 16, 4, 0, TAU); });
        stroke(c, 2.6, () => { g.moveTo(2, 24); g.lineTo(25, 9); });
        poly([[30, 6], [22.5, 8], [26, 12.5]], sh2(c, 1.4));
        stroke(sh2(c, .8), 1.6, () => { g.moveTo(3, 20); g.lineTo(7, 23); });
        stroke(sh2(c, .8), 1.6, () => { g.moveTo(6, 27); g.lineTo(9, 23); });
        return;
      }
    }
  },
  smoke(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {             // 연막탄 — 터진 통에서 피어오르는 연기
        const c = s.c;
        glow(16, 13, 12, c, .16);
        ell(11, 12, 6, 4.6, sh2(c, .9));
        ell(19, 10, 7, 5.2, c);
        ell(22, 15, 5.4, 4, sh2(c, .78));
        ell(9, 17, 4.6, 3.4, sh2(c, .7));
        P(13, 21, 6, 8, sh2(c, .5));
        P(13, 21, 6, 2, sh2(c, 1.3));
        P(12, 28.4, 8, 2, sh2(c, .42));
        return;
      }
    }
  },
  mark(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {              // 사냥꾼의 표식 — 적 위에 찍히는 삼각 표식
        const c = s.c;
        glow(16, 12, 11, c, .24);
        poly([[16, 20], [8, 5], [24, 5]], c);
        poly([[16, 16], [11.5, 7.5], [20.5, 7.5]], sh2(c, 1.45));
        stroke(sh2(c, .7), 2, () => { g.arc(16, 25, 6, -2.9, -0.25); });
        P(15.2, 22, 1.6, 8, sh2(c, .65));
        return;
      }
    }
  },
  tempest(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {           // 폭풍의 시위 — 활에서 갈라져 나가는 두 발
        const c = s.c;
        stroke(c, 2.2, () => { g.arc(9, 16, 10, -1.15, 1.15); });
        stroke(sh2(c, .6), 1.2, () => { g.moveTo(13.6, 7.2); g.lineTo(13.6, 24.8); });
        for (const t of [-1, 1]) {
          const y0 = 16 + t * 4;
          stroke(t < 0 ? c : sh2(c, .78), 2, () => { g.moveTo(12, y0); g.lineTo(27, y0 + t * 4); });
          poly([[30, y0 + t * 5], [25, y0 + t * 1.6], [25.6, y0 + t * 6.4]], sh2(c, 1.4));
        }
        return;
      }
    }
  },
  barrier(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {           // 비전 방벽 — 육각 결계
        const c = s.c;
        glow(16, 16, 13, c, .26);
        const hex = (r) => { const pts = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; pts.push([16 + Math.cos(a) * r, 16 + Math.sin(a) * r]); } return pts; };
        poly(hex(13), 'rgba(120,180,255,.20)');
        stroke(c, 2.2, () => { const p = hex(13); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); });
        stroke(sh2(c, 1.35), 1.3, () => { const p = hex(7.5); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); });
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; circ(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, 1.7, '#ffffff'); }
        return;
      }
    }
  },
  chain(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {             // 사슬 번개 — 갈라져 튀는 번개
        const c = s.c;
        glow(16, 16, 13, c, .3);
        poly([[15, 2], [7, 16], [13, 16], [10, 30], [21, 13], [15, 13]], c);
        stroke(sh2(c, 1.5), 1.4, () => { g.moveTo(14, 5); g.lineTo(9.5, 14.5); });
        stroke(sh2(c, .8), 2, () => { g.moveTo(21, 6); g.lineTo(26, 11); g.lineTo(23, 13); g.lineTo(29, 18); });
        stroke(sh2(c, .8), 1.6, () => { g.moveTo(4, 8); g.lineTo(7, 11); });
        return;
      }
    }
  },
  blink(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {             // 차원 도약 — 남은 잔상과 도착한 자리
        const c = s.c;
        glow(22, 16, 12, c, .24);
        g.globalAlpha = .38;
        poly([[4, 8], [11, 8], [11, 25], [4, 25]], sh2(c, .7));
        g.globalAlpha = 1;
        poly([[19, 6], [27, 6], [27, 27], [19, 27]], c);
        poly([[19, 6], [23, 6], [23, 27], [19, 27]], sh2(c, 1.3));
        for (let i = 0; i < 3; i++) P(12.5 + i * 1.8, 13 + i * 2, 2.2, 2.2, sh2(c, 1.45));
        stroke(sh2(c, 1.5), 1.6, () => { g.moveTo(13, 16.5); g.lineTo(18, 16.5); });
        return;
      }
    }
  },
  meteor(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {            // 별의 낙하 — 꼬리를 끌며 떨어지는 별
        const c = s.c;
        glow(20, 11, 13, c, .32);
        stroke(sh2(c, .62), 3.4, () => { g.moveTo(2, 29); g.lineTo(16, 15); });
        stroke(sh2(c, .85), 1.8, () => { g.moveTo(6, 29); g.lineTo(17, 18); });
        g.fillStyle = c; g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 3.6 : 9, a = -Math.PI / 2 + i * Math.PI / 5;
          const x = 21 + Math.cos(a) * r, y = 11 + Math.sin(a) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        circ(21, 11, 3.4, '#fff2c8');
        return;
      }
    }
  },
};
Object.assign(ITEM_PAINT, ItemPaintSkills);
