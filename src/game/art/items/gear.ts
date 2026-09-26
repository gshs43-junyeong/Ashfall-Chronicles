// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== art/items/gear.js — 무기 · 낚싯대·물고기 · 방어구 · 장신구 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 Art. */

export const ItemPaintGear = {
  /* ---------- 무기 ---------- */
  sword(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const bw = s.w, base = s.c, lt = sh2(base, 1.3), dk = sh2(base, .68);
        if (s.glow) glow(16, 11, 11, s.glow, .22);
        poly([[16, 1], [16 + bw, 8], [16 + bw - .5, 20], [16 - bw + .5, 20], [16 - bw, 8]], base);
        poly([[16, 2], [16, 20], [16 - bw + 1, 20], [16 - bw + 1, 8.5]], lt);
        poly([[16, 2], [16, 20], [16 + bw - 1, 20], [16 + bw - 1, 8.5]], dk);
        P(15.4, 3, 1.2, 17, sh2(base, 1.5));
        if (s.jag) for (let y = 9; y < 20; y += 3.4) {
          poly([[16 - bw, y], [16 - bw - 2, y + 1], [16 - bw, y + 2]], base);
          poly([[16 + bw, y + 1.7], [16 + bw + 2, y + 2.7], [16 + bw, y + 3.7]], base);
        }
        const gd = s.g;
        P(6.5, 20, 19, 3, gd); P(6.5, 20, 19, 1, sh2(gd, 1.35));
        poly([[6.5, 20], [4, 21.5], [6.5, 23]], gd);
        poly([[25.5, 20], [28, 21.5], [25.5, 23]], gd);
        P(14, 23, 4, 6, s.grip);
        P(14, 24.5, 4, 1, sh2(s.grip, .55)); P(14, 26.5, 4, 1, sh2(s.grip, .55));
        circ(16, 29.6, 2.3, gd); circ(15.4, 29, .8, sh2(gd, 1.4));
        return;
      }
    }
  },
  scythe(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        if (s.glow) glow(14, 14, 13, s.glow, .22);
        // 초승달 날: 바깥 호와 안쪽 호 사이를 채운다
        g.fillStyle = s.c; g.beginPath();
        g.arc(16, 20, 14, Math.PI, Math.PI * 1.61, false);
        g.arc(16, 22, 10, Math.PI * 1.61, Math.PI, true);
        g.closePath(); g.fill();
        g.fillStyle = sh2(s.c, 1.4); g.beginPath();
        g.arc(16, 20, 14, Math.PI, Math.PI * 1.61, false);
        g.arc(16, 21, 12.2, Math.PI * 1.61, Math.PI, true);
        g.closePath(); g.fill();
        // 자루
        stroke(s.shaft, 3.2, () => { g.moveTo(26, 30); g.lineTo(19.5, 8); });
        stroke(sh2(s.shaft, 2.4), 1.1, () => { g.moveTo(25.1, 29.4); g.lineTo(18.7, 8.6); });
        circ(20, 7.6, 2.4, sh2(s.shaft, 2));
        return;
      }
    }
  },
  bow(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        if (s.glow) glow(14, 16, 13, s.glow, .2);
        const a = 1.0, cxx = 23, r = 15;
        // 활대(왼쪽으로 볼록)
        stroke(s.c, 3.4, () => { g.arc(cxx, 16, r, Math.PI - a, Math.PI + a); });
        stroke(sh2(s.c, 1.45), 1.2, () => { g.arc(cxx, 16, r - 1.4, Math.PI - a * .88, Math.PI + a * .88); });
        const ex = cxx - r * Math.cos(a);
        const ey1 = 16 - r * Math.sin(a), ey2 = 16 + r * Math.sin(a);
        // 시위
        stroke(s.s, 1.3, () => { g.moveTo(ex, ey1); g.lineTo(ex, ey2); });
        circ(ex, ey1, 1.3, sh2(s.c, .7)); circ(ex, ey2, 1.3, sh2(s.c, .7));
        // 그립
        P(cxx - r - 1.4, 13, 3.4, 6, '#4a3122');
        // 메긴 화살
        stroke('#8a6a45', 1.8, () => { g.moveTo(ex - 1, 16); g.lineTo(27, 16); });
        poly([[30, 16], [25, 13.4], [25, 18.6]], '#d0d4dc');
        poly([[ex - 1, 16], [ex + 4, 12.8], [ex + 4, 19.2]], sh2(s.c, 1.5));
        return;
      }
    }
  },
  staff(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const hd = s.head;
        if (s.glow) glow(19, 8, 11, s.glow, .26);
        stroke(s.c, 3, () => { g.moveTo(11, 30); g.lineTo(18, 12); });
        stroke(sh2(s.c, 1.45), 1, () => { g.moveTo(10.3, 29.4); g.lineTo(17.3, 12.4); });
        if (s.style === 'crystal') {
          poly([[19, 2], [23, 9], [19, 15], [15, 9]], hd);
          poly([[19, 2], [19, 15], [15, 9]], sh2(hd, 1.4));
          P(18.3, 4, 1.2, 7, sh2(hd, 1.7));
        } else if (s.style === 'claw') {
          stroke(sh2(s.c, 1.6), 2, () => { g.moveTo(14, 12); g.lineTo(13, 4); });
          stroke(sh2(s.c, 1.6), 2, () => { g.moveTo(23, 11); g.lineTo(25, 4); });
          circ(19, 8, 4.6, hd); circ(19, 8, 3, sh2(hd, 1.4)); circ(17.6, 6.6, 1.2, '#ffffff');
        } else {
          circ(19, 8, 5, hd); circ(19, 8, 3.4, sh2(hd, 1.35));
          circ(17.4, 6.4, 1.4, '#ffffff');
          stroke(sh2(s.c, 1.3), 1.6, () => { g.arc(19, 8, 6.4, 2.2, 4.6); });
        }
        return;
      }
    }
  },
  spear(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .7);
        if (s.glow) glow(16, 10, 11, s.glow, .22);
        // 자루
        stroke('#6a4a28', 2.6, () => { g.moveTo(16, 31); g.lineTo(16, 10); });
        stroke('#8f6740', 1, () => { g.moveTo(15.3, 30.4); g.lineTo(15.3, 10.4); });
        // 창날 — 길고 좁은 삼각형
        poly([[16, 1], [20, 12], [16, 9], [12, 12]], c);
        poly([[16, 1], [16, 9], [12, 12]], dk);
        poly([[16, 1], [18, 8], [16, 9]], lt);
        // 날개 장식
        poly([[16, 10], [22, 13], [16, 12]], sh2(c, .85));
        poly([[16, 10], [10, 13], [16, 12]], sh2(c, .85));
        return;
      }
    }
  },
  /* ---------- 낚싯대: 대각선 장대 + 늘어진 줄과 찌 ---------- */
  fishrod(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        stroke('#6a4a28', 2.2, () => { g.moveTo(5, 29); g.lineTo(27, 4); });
        stroke('#9a7a4a', 0.8, () => { g.moveTo(6, 27.6); g.lineTo(26.2, 5.4); });
        stroke(c, 1, () => { g.moveTo(27, 4); g.quadraticCurveTo(24, 16, 17, 22); });
        circ(17, 22, 1.6, c);
        if (s.glow) glow(27, 4, 6, s.glow, .3);
        return;
      }
    }
  },
  /* ---------- 물고기: 타원 몸통 + 꼬리 삼각형 ---------- */
  fishitem(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .7);
        ell(15, 17, 9, 5.4, c);
        ell(13, 15, 4, 2.2, lt);
        poly([[24, 17], [30, 12], [30, 22]], dk);
        poly([[6.5, 17], [2, 14], [2, 20]], dk);
        circ(9, 15.5, 1, '#1a1a1a');
        if (s.glow) glow(15, 17, 10, s.glow, .25);
        return;
      }
    }
  },
  pick(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.4);
        if (s.glow) glow(16, 13, 13, s.glow, .2);
        // 자루
        stroke('#6a4a28', 3.4, () => { g.moveTo(16, 30); g.lineTo(16, 12); });
        stroke('#8f6740', 1.2, () => { g.moveTo(15, 29.2); g.lineTo(15, 13); });
        // 머리: 위로 볼록한 두꺼운 호
        stroke(c, 4.6, () => { g.arc(16, 20, 13, Math.PI + .34, TAU - .34); });
        stroke(lt, 1.7, () => { g.arc(16, 20, 14.4, Math.PI + .6, TAU - 1.0); });
        // 뾰족한 양 끝
        poly([[3.6, 14.2], [1, 17.6], [6, 17.4]], c);
        poly([[28.4, 14.2], [31, 17.6], [26, 17.4]], sh2(c, .78));
        // 자루 결합부
        P(13.4, 10.6, 5.2, 5.4, sh2(c, .82));
        P(13.4, 10.6, 5.2, 1.4, lt);
        return;
      }
    }
  },
  axe(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .72);
        // 자루
        stroke('#6a4a28', 3.4, () => { g.moveTo(20, 30); g.lineTo(20, 3); });
        stroke('#8f6740', 1.2, () => { g.moveTo(19, 29.2); g.lineTo(19, 4); });
        // 날: 왼쪽이 볼록한 날, 자루 쪽은 오목하게 파여 도끼 실루엣이 된다
        g.fillStyle = c; g.beginPath();
        g.moveTo(19.5, 7);
        g.lineTo(12, 7);
        g.quadraticCurveTo(3.5, 14.5, 10.5, 23);
        g.lineTo(19.5, 23);
        g.quadraticCurveTo(15.5, 15, 19.5, 7);
        g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath();
        g.moveTo(17.5, 9);
        g.lineTo(12.5, 9);
        g.quadraticCurveTo(6.5, 14.5, 11.5, 21);
        g.lineTo(16, 21);
        g.quadraticCurveTo(13, 15, 17.5, 9);
        g.closePath(); g.fill();
        // 날 끝 광택
        stroke(sh2(c, 1.7), 1.6, () => { g.moveTo(11.6, 7.8); g.quadraticCurveTo(4.6, 14.5, 11.2, 22.2); });
        stroke(dk, 1.2, () => { g.moveTo(19.5, 23); g.quadraticCurveTo(15.5, 15, 19.5, 7); });
        return;
      }
    }
  },
  /* ---------- 방어구 ---------- */
  helm(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        if (s.glow) glow(16, 15, 12, s.glow, .18);
        if (s.crest) { P(15, 2, 2, 6, s.crest); P(13.4, 3.5, 5.2, 2, s.crest); }
        g.fillStyle = c; g.beginPath(); g.arc(16, 16, 10, Math.PI, 0); g.fill();
        P(6, 16, 20, 6, c);
        g.fillStyle = lt; g.beginPath(); g.arc(16, 16, 10, Math.PI, Math.PI * 1.45); g.fill();
        P(6, 16, 5, 6, lt);
        if (s.soft) { P(6, 20, 20, 2, dk); P(9, 13, 14, 2.4, dk); }
        else { P(8, 13.5, 16, 3.2, '#1a1a22'); P(15.2, 13.5, 1.6, 3.2, c); P(6, 21, 20, 1.6, dk); }
        P(6, 16, 20, 1, sh2(c, 1.5));
        return;
      }
    }
  },
  chest(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        if (s.glow) glow(16, 17, 13, s.glow, .18);
        poly([[9, 8], [23, 8], [25, 14], [23, 27], [9, 27], [7, 14]], c);
        poly([[9, 8], [16, 8], [16, 27], [9, 27], [7, 14]], lt);
        circ(8, 10.5, 4, dk); circ(24, 10.5, 4, dk);
        circ(8, 10.5, 4, s.soft ? dk : c); circ(24, 10.5, 4, s.soft ? dk : sh2(c, .8));
        circ(7.2, 9.4, 1.6, lt);
        P(15.4, 9, 1.2, 18, dk);
        if (s.soft) { P(9, 20, 14, 1.6, dk); P(9, 23.5, 14, 1.6, dk); }
        else { P(8, 17, 16, 1.4, dk); P(8, 22, 16, 1.4, dk); }
        return;
      }
    }
  },
  boots(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .6);
        if (s.glow) glow(16, 18, 12, s.glow, .18);
        const boot = (bx) => {
          poly([[bx, 9], [bx + 8, 9], [bx + 8, 21], [bx + 12, 21], [bx + 12, 26], [bx, 26]], c);
          poly([[bx, 9], [bx + 3.5, 9], [bx + 3.5, 26], [bx, 26]], lt);
          P(bx, 23.5, 12, 2.5, dk);
          P(bx, 12.5, 8, 1.6, dk);
        };
        boot(2); boot(17);
        return;
      }
    }
  },
  /* ---------- 장신구 ---------- */
  ring(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        stroke(s.c, 3.4, () => { g.arc(16, 20, 8, 0, TAU); });
        stroke(sh2(s.c, 1.45), 1.2, () => { g.arc(16, 20, 8, 2.4, 4.2); });
        poly([[16, 4], [21, 9.5], [16, 15], [11, 9.5]], s.gem);
        poly([[16, 4], [16, 15], [11, 9.5]], sh2(s.gem, 1.45));
        P(14.6, 7, 1.4, 1.4, '#ffffff');
        return;
      }
    }
  },
  amulet(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        stroke(s.c, 1.6, () => { g.arc(16, 15, 10, Math.PI * 1.15, Math.PI * 1.85); });
        stroke(s.c, 1.6, () => { g.moveTo(6.4, 12.4); g.lineTo(11, 19); });
        stroke(s.c, 1.6, () => { g.moveTo(25.6, 12.4); g.lineTo(21, 19); });
        if (s.shape === 'wing') {
          poly([[16, 17], [24, 19], [16, 27], [8, 19]], s.gem);
          poly([[16, 17], [16, 27], [8, 19]], sh2(s.gem, 1.4));
        } else {
          g.fillStyle = s.gem; g.beginPath();
          g.moveTo(16, 16); g.quadraticCurveTo(23, 22, 16, 28);
          g.quadraticCurveTo(9, 22, 16, 16); g.closePath(); g.fill();
          circ(14.2, 23, 1.6, sh2(s.gem, 1.5));
        }
        P(14.8, 16.5, 2.4, 2.4, sh2(s.c, 1.2));
        return;
      }
    }
  },
  cloud(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        glow(16, 16, 12, '#cfe8ff', .18);
        circ(11, 18, 6, '#e0ecfa'); circ(20, 18, 7, '#e0ecfa'); circ(15.5, 13.5, 6.5, '#f2f7ff');
        P(6, 18, 20, 5, '#e0ecfa');
        circ(13, 12, 3, '#ffffff');
        stroke('#9fc0e8', 1.4, () => { g.moveTo(11, 25); g.lineTo(9, 29); });
        stroke('#9fc0e8', 1.4, () => { g.moveTo(21, 25); g.lineTo(23, 29); });
        return;
      }
    }
  },
  sigil(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        glow(16, 16, 11, s.c, .18);
        stroke(sh2(s.c, .7), 2, () => { g.arc(16, 16, 10, 0, TAU); });
        g.fillStyle = s.c; g.beginPath();
        g.moveTo(16, 7); g.quadraticCurveTo(23, 15, 16, 23);
        g.quadraticCurveTo(9, 15, 16, 7); g.closePath(); g.fill();
        circ(14, 16, 1.8, sh2(s.c, 1.6));
        return;
      }
    }
  },
  star(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const R = s.big ? 13 : 11, r = R * .42;
        if (s.glow) glow(16, 16, R + 3, s.glow, .3);
        g.fillStyle = s.c; g.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5;
          const x = 16 + Math.cos(a) * rad, y = 16 + Math.sin(a) * rad;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        g.fillStyle = sh2(s.c, 1.35); g.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = (i % 2 ? r : R) * .6, a = -Math.PI / 2 + i * Math.PI / 5;
          const x = 16 + Math.cos(a) * rad, y = 16 + Math.sin(a) * rad;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        return;
      }
    }
  },
};
Object.assign(ITEM_PAINT, ItemPaintGear);
