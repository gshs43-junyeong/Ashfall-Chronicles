/* ===== art/items/goods.js — 소비 · 재료 · 기계 · 자원·부품 ===== */
import { TAU } from '../../../engine/core/math.js';
import { TILE_DEF } from '../../data.js';
import { TS } from '../../world.js';
import { TileArt } from '../../tileart.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 Art. */

export const ItemPaintGoods = {
  /* ---------- 소비 ---------- */
  potion(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const liq = s.c;
        // sz: 'sm'(작은) | undefined(보통) | 'lg'(큰) — 병 밑동(16,29)을 기준점 삼아 통째로 축소/확대한다.
        const scale = s.sz === 'sm' ? 0.72 : s.sz === 'lg' ? 1.22 : 1;
        if (scale !== 1) { g.save(); g.translate(16, 29); g.scale(scale, scale); g.translate(-16, -29); }
        P(13, 4, 6, 4, '#7a5734'); P(13, 4, 6, 1.4, '#9c7248');
        P(13.5, 8, 5, 5, '#b9cede');
        if (s.sq) {
          P(8, 13, 16, 15, '#b9cede');
          P(9.4, 17, 13.2, 9.6, liq);
          P(9.4, 17, 13.2, 1.4, sh2(liq, 1.4));
          P(10, 14, 2.4, 12, 'rgba(255,255,255,.35)');
        } else {
          circ(16, 20, 8.4, '#b9cede');
          /* 물약은 유리 안쪽 원으로 잘라 칠한다 — 네모 채움의 아래 모서리가 유리(r 8.4)보다 1.8px 밖으로 튀어나왔다 */
          g.save(); g.beginPath(); g.arc(16, 20, 7.2, 0, TAU); g.clip();
          P(8, 14.6, 16, 14, liq);
          ell(16, 14.6, 6.4, 2.2, sh2(liq, 1.35));
          g.restore();
          ell(12.4, 17.4, 2, 3, 'rgba(255,255,255,.4)');
          circ(19, 23, 1.4, sh2(liq, 1.5));
          circ(14.5, 25, 1, sh2(liq, 1.5));
        }
        // 큰 병에는 허리끈, 작은 병에는 코르크가 아니라 짧은 마개로 크기 차이를 한 번 더 강조
        if (s.sz === 'lg') P(9, 19, 14, 2, 'rgba(0,0,0,.18)');
        if (scale !== 1) g.restore();
        return;
      }
    }
  },
  stew(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        g.fillStyle = '#8a6a4a'; g.beginPath();
        g.moveTo(4, 15); g.lineTo(28, 15);
        g.quadraticCurveTo(26, 28, 16, 28);
        g.quadraticCurveTo(6, 28, 4, 15); g.closePath(); g.fill();
        ell(16, 15, 12, 3.4, '#c8763a');
        ell(16, 15, 12, 3.4, '#b8632e');
        ell(13, 14.2, 2.4, 1.2, '#e0a050'); ell(19, 15.6, 2, 1, '#8fbf5a');
        P(4, 17, 24, 1.6, '#6a4a2a');
        stroke('#c8c0b0', 1.4, () => { g.moveTo(12, 9); g.quadraticCurveTo(14, 6, 12, 3); });
        stroke('#c8c0b0', 1.4, () => { g.moveTo(19, 9); g.quadraticCurveTo(21, 6, 19, 3); });
        return;
      }
    }
  },
  /* ---------- 재료 ---------- */
  log(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.25), dk = sh2(c, .7);
        P(7, 10, 20, 13, c);
        P(7, 10, 20, 2.4, lt); P(7, 20.6, 20, 2.4, dk);
        for (let i = 0; i < 4; i++) P(10 + i * 4, 13, 1, 6, dk);
        ell(7, 16.5, 3.2, 6.5, sh2(c, 1.15));
        ell(7, 16.5, 2.1, 4.3, sh2(c, .85));
        ell(7, 16.5, 1, 2, sh2(c, 1.3));
        return;
      }
    }
  },
  /* 장식 아이템 — 타일 그림을 테두리 없이 그대로 키운다. */
  deco(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        if (TileArt.ready) g.drawImage(TileArt.atlas, 0, s.tile * TS, TS, TS, 3, 3, 26, 26);
        else P(8, 8, 16, 16, TILE_DEF[s.tile].c || '#666');
        return;
      }
    }
  },
  block(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        if (TileArt.ready) g.drawImage(TileArt.atlas, 0, s.tile * TS, TS, TS, 4, 5, 24, 24);
        else P(4, 5, 24, 24, TILE_DEF[s.tile].c || '#666');
        P(4, 5, 24, 2, 'rgba(255,255,255,.22)');
        P(4, 27, 24, 2, 'rgba(0,0,0,.3)');
        P(26, 5, 2, 24, 'rgba(0,0,0,.22)');
        return;
      }
    }
  },
  /* ---------- 기계 ---------- */
  machine(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        if (s.glow) glow(16, 15, 13, s.glow, .24);
        P(4, 26, 24, 3, '#3a3a44'); P(4, 26, 24, 1, '#5a5a66');
        if (TileArt.ready) g.drawImage(TileArt.atlas, 0, s.tile * TS, TS, TS, 5, 4, 22, 22);
        else P(5, 4, 22, 22, TILE_DEF[s.tile].c || '#666');
        P(3, 28, 26, 2, 'rgba(0,0,0,.35)');
        return;
      }
    }
  },
  /* ---------- 자원 · 부품 ---------- */
  barrel(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        P(7, 7, 18, 21, c);
        P(7, 7, 2.4, 21, lt); P(22.6, 7, 2.4, 21, dk);
        ell(16, 7, 9, 3.2, lt);
        ell(16, 7, 6.4, 2.1, s.fluid);
        P(7, 12, 18, 2, dk); P(7, 21, 18, 2, dk);
        P(11, 16, 10, 4, s.fluid);
        return;
      }
    }
  },
  bomb(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        /* 폭탄 — 둥근 몸통 + 심지. */
        const c = s.c;
        circ(15, 20, 9, sh2(c, .7));
        circ(15, 20, 8, c);
        circ(12, 17, 3, sh2(c, 1.6));                       // 광택
        P(13.5, 9, 3.5, 4, sh2(c, .55));                    // 마개
        stroke(s.fuse, 2, () => { g.moveTo(15.5, 9); g.bezierCurveTo(19, 5, 23, 7, 24, 3); });
        circ(24, 3, 2, '#ffd24a');                          // 불씨
        if (s.glow) glow(24, 3, 7, s.glow, .3);
        return;
      }
    }
  },
  pellet(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        for (const [x, y, r] of [[12, 14, 4.4], [21, 12, 3.8], [17, 21, 4.6], [10, 22, 3.4], [23, 20, 3.2]]) {
          circ(x, y, r, c);
          circ(x - r * .3, y - r * .35, r * .38, sh2(c, 1.25));
          circ(x + r * .35, y + r * .4, r * .3, sh2(c, .7));
        }
        return;
      }
    }
  },
  fuelbrick(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .6);
        poly([[5, 12], [27, 12], [27, 25], [5, 25]], c);
        poly([[5, 12], [27, 12], [24, 8], [8, 8]], lt);
        P(5, 22, 22, 3, dk);
        for (let i = 0; i < 3; i++) P(8 + i * 7, 14, 4, 7, sh2(c, .78));
        P(9, 15, 2, 2, '#e8842a'); P(23, 18, 2, 2, '#e8842a');
        return;
      }
    }
  },
  wire(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35);
        for (let i = 0; i < 3; i++) {
          const y = 9 + i * 6;
          stroke(c, 3.2, () => { g.moveTo(5, y); g.bezierCurveTo(12, y - 4, 20, y + 4, 27, y); });
          stroke(lt, 1.1, () => { g.moveTo(5, y - .8); g.bezierCurveTo(12, y - 4.8, 20, y + 3.2, 27, y - .8); });
        }
        return;
      }
    }
  },
  circuit(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, tr = s.trace;
        P(5, 6, 22, 21, sh2(c, .72));
        P(5, 6, 22, 2, sh2(c, 1.3));
        P(5, 6, 2, 21, sh2(c, 1.1));
        // 배선
        stroke(tr, 1.4, () => { g.moveTo(9, 10); g.lineTo(9, 18); g.lineTo(18, 18); g.lineTo(18, 24); });
        stroke(tr, 1.4, () => { g.moveTo(23, 10); g.lineTo(14, 10); g.lineTo(14, 14); });
        for (const [x, y] of [[9, 10], [18, 24], [23, 10], [14, 14]]) circ(x, y, 1.5, tr);
        P(19, 13, 6, 6, '#1a1a1f');                       // 칩
        P(20, 14, 4, 4, '#33333d');
        return;
      }
    }
  },
  motor(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.32), dk = sh2(c, .62);
        P(8, 9, 16, 15, c);
        P(8, 9, 16, 2, lt); P(8, 22, 16, 2, dk);
        for (let i = 0; i < 4; i++) P(10 + i * 4, 11, 1.6, 11, dk);   // 냉각 핀
        P(24, 14, 5, 5, s.trim);                                       // 축
        P(3, 14, 5, 5, sh2(c, .8));
        circ(16, 16.5, 3, sh2(c, 1.5)); circ(16, 16.5, 1.2, dk);
        return;
      }
    }
  },
  frame(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .55), dk2 = sh2(c, .35);
        // 비스듬히 세운 열린 골조 — 안이 비어 있어 "아직 뭔가 들어갈 자리"로 읽힌다
        const off = 5;
        // 뒤쪽 사각
        P(9, 4, 19, 3, dk); P(9, 21, 19, 3, dk2);
        P(9, 4, 3, 20, dk); P(25, 4, 3, 20, dk2);
        // 잇는 대각 기둥
        for (const [x, y] of [[5, 9], [22, 9], [5, 26], [22, 26]])
          stroke(dk, 2.4, () => { g.moveTo(x + 1.5, y + 1.5); g.lineTo(x + off, y - off + 1.5); });
        // 앞쪽 사각
        P(4, 9, 19, 3.4, c); P(4, 9, 19, 1.3, lt);
        P(4, 25, 19, 3.4, c); P(4, 27.4, 19, 1, dk);
        P(4, 9, 3.4, 20, c); P(4, 9, 1.3, 20, lt);
        P(19.6, 9, 3.4, 20, c); P(21.8, 9, 1.2, 20, dk);
        for (const [x, y] of [[5.7, 10.7], [21.3, 10.7], [5.7, 26.7], [21.3, 26.7]]) circ(x, y, 1.4, dk2);
        return;
      }
    }
  },
  cell(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow && s.fill) glow(16, 17, 12, s.glow, .26);
        P(13, 3, 6, 3, '#8a8a96');                          // 단자
        P(8, 6, 16, 23, sh2(c, .5));
        P(8, 6, 16, 2, sh2(c, .9));
        P(10, 9, 12, 17, '#14161a');
        if (s.fill) {
          P(11, 11, 10, 13, c);
          P(11, 11, 10, 2, sh2(c, 1.5));
          P(14, 14, 4, 7, sh2(c, 1.8));                     // 번개 표식
        } else {
          P(11, 21, 10, 3, sh2(c, 1.1));
          stroke(sh2(c, 1.3), 1.6, () => { g.moveTo(12, 13); g.lineTo(20, 19); g.moveTo(20, 13); g.lineTo(12, 19); });
        }
        return;
      }
    }
  },
  rivet(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .65);
        for (const [x, y] of [[10, 8], [21, 13], [12, 21]]) {
          ell(x, y, 4.2, 2.2, lt);
          P(x - 1.6, y, 3.2, 9, c);
          P(x - 1.6, y, 1.2, 9, lt);
          poly([[x - 1.6, y + 9], [x + 1.6, y + 9], [x, y + 12]], dk);
        }
        return;
      }
    }
  },
  sawblade(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, dk = sh2(c, .6);
        if (s.glow) glow(16, 16, 13, s.glow, .22);
        for (let k = 0; k < 12; k++) {
          const a = k * TAU / 12;
          poly([[16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13],
                [16 + Math.cos(a + .22) * 10, 16 + Math.sin(a + .22) * 10],
                [16 + Math.cos(a - .22) * 10, 16 + Math.sin(a - .22) * 10]], c);
        }
        circ(16, 16, 10.5, c);
        circ(16, 16, 9, sh2(c, 1.3));
        circ(16, 16, 4.5, dk);
        circ(16, 16, 2.4, '#1a1a1f');
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .4;
          circ(16 + Math.cos(a) * 6.6, 16 + Math.sin(a) * 6.6, 1.2, dk);
        }
        return;
      }
    }
  },
};
Object.assign(ITEM_PAINT, ItemPaintGoods);
