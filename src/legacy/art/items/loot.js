/* ===== art/items/loot.js — 소환 · 2부 전용 ===== */
import { TAU } from '../../../engine/core/math.js';
import { ITEM_PAINT, sh2 } from '../../itemart.js';
/* itemart.js Art.paint 의 갈래들 — 읽히는 순간 ITEM_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 Art. */

export const ItemPaintLoot = {
  /* ---------- 소환 ---------- */
  crown(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 16, 12, s.glow, .24);
        poly([[5, 24], [5, 12], [10, 17], [16, 8], [22, 17], [27, 12], [27, 24]], c);
        poly([[5, 24], [5, 12], [10, 17], [16, 8], [16, 24]], sh2(c, 1.3));
        P(5, 22, 22, 3.4, sh2(c, .78));
        P(5, 22, 22, 1, sh2(c, 1.4));
        circ(16, 12, 2.2, s.gem); circ(8, 15, 1.6, s.gem); circ(24, 15, 1.6, s.gem);
        return;
      }
    }
  },
  skull(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = '#e8e2cd';
        circ(16, 14, 10, c);
        P(9, 18, 14, 7, c);
        poly([[11, 24], [21, 24], [20, 29], [12, 29]], c);
        circ(11.6, 13, 3.4, '#1a1620'); circ(20.4, 13, 3.4, '#1a1620');
        circ(10.8, 12.2, 1, '#c8433c'); circ(19.6, 12.2, 1, '#c8433c');
        poly([[16, 17], [18.4, 21], [13.6, 21]], '#1a1620');
        P(12, 25.5, 1.4, 3.5, '#1a1620'); P(15.3, 25.5, 1.4, 3.5, '#1a1620'); P(18.6, 25.5, 1.4, 3.5, '#1a1620');
        circ(12, 9, 3, '#f5f1e4');
        return;
      }
    }
  },
  heart(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 17, 13, c, .24);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 28);
        g.bezierCurveTo(2, 18, 6, 5, 16, 12);
        g.bezierCurveTo(26, 5, 30, 18, 16, 28);
        g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.35); g.beginPath();
        g.moveTo(16, 24);
        g.bezierCurveTo(7, 17, 9, 9, 15, 14);
        g.closePath(); g.fill();
        ell(11.5, 13.5, 2.4, 1.6, 'rgba(255,255,255,.5)');
        stroke(sh2(c, .6), 1.4, () => { g.moveTo(16, 13); g.lineTo(16, 24); });
        return;
      }
    }
  },
  drop(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        if (s.glow) glow(16, 18, 13, s.glow, .3);
        g.fillStyle = c; g.beginPath();
        g.moveTo(16, 3);
        g.bezierCurveTo(24, 15, 26, 20, 16, 29);
        g.bezierCurveTo(6, 20, 8, 15, 16, 3);
        g.closePath(); g.fill();
        g.fillStyle = sh2(c, 1.4); g.beginPath();
        g.moveTo(16, 8);
        g.bezierCurveTo(20, 16, 21, 20, 16, 25);
        g.bezierCurveTo(11, 20, 12, 16, 16, 8);
        g.closePath(); g.fill();
        ell(13, 19, 2, 3, 'rgba(255,255,255,.55)');
        return;
      }
    }
  },
  sack(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .65);
        if (s.glow) glow(16, 18, 12, s.glow, .2);
        // 몸통
        g.fillStyle = c; g.beginPath();
        g.moveTo(9, 13); g.quadraticCurveTo(6, 22, 9, 28);
        g.quadraticCurveTo(16, 31, 23, 28);
        g.quadraticCurveTo(26, 22, 23, 13);
        g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath();
        g.moveTo(10, 14); g.quadraticCurveTo(8, 21, 10, 26);
        g.quadraticCurveTo(13, 27, 15, 26);
        g.quadraticCurveTo(13, 20, 13, 14);
        g.closePath(); g.fill();
        // 덮개
        P(8, 10, 16, 6, dk);
        P(8, 10, 16, 2, s.strap);
        // 어깨끈
        stroke(s.strap, 2, () => { g.moveTo(11, 10); g.quadraticCurveTo(6, 4, 12, 2); });
        stroke(s.strap, 2, () => { g.moveTo(21, 10); g.quadraticCurveTo(26, 4, 20, 2); });
        // 버클
        P(14, 15, 4, 3, s.strap);
        return;
      }
    }
  },
  hammer(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.35), dk = sh2(c, .68);
        if (s.glow) glow(16, 11, 13, s.glow, .24);
        stroke('#6a4a28', 3.6, () => { g.moveTo(16, 30); g.lineTo(16, 16); });
        stroke('#8f6740', 1.2, () => { g.moveTo(15, 29); g.lineTo(15, 17); });
        // 망치 머리
        P(5, 5, 22, 12, c);
        P(5, 5, 22, 3, lt);
        P(5, 14, 22, 3, dk);
        P(5, 5, 3, 12, sh2(c, 1.15));
        P(24, 5, 3, 12, dk);
        for (let i = 0; i < 5; i++) P(rng.range(7, 24), rng.range(7, 14), 2, 2, rng.chance(.5) ? lt : dk);
        return;
      }
    }
  },
  /* ---------- 2부 전용 ---------- */
  feather(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, dk = sh2(c, .72), lt = sh2(c, 1.12);
        glow(16, 16, 12, c, .18);
        stroke(sh2(c, .55), 1.6, () => { g.moveTo(23, 3); g.lineTo(9, 29); });
        // 깃가지
        for (let i = 0; i < 13; i++) {
          const t = i / 12;
          const x = 23 - t * 14, y = 3 + t * 26;
          const len = Math.sin(t * Math.PI) * 8 + 1.5;
          stroke(i % 2 ? c : lt, 1.6, () => { g.moveTo(x, y); g.lineTo(x - len, y - len * .35); });
          stroke(i % 2 ? dk : c, 1.6, () => { g.moveTo(x, y); g.lineTo(x + len * .8, y + len * .3); });
        }
        return;
      }
    }
  },
  /* 나뭇잎 — 나무마다 모양이 다르다(sh). */
  leafitem(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, dk = sh2(c, .62), lt = sh2(c, 1.22), stem = s.st || sh2(c, .5);
        const blade = (pts) => { poly(pts, dk); poly(pts.map(([x, y]) => [x + (16 - x) * .12, y + (16 - y) * .12]), c); };
        if (s.sh === 'needle') {
          stroke(stem, 2, () => { g.moveTo(8, 28); g.lineTo(22, 4); });
          for (let i = 0; i < 9; i++) {
            const t = i / 8, x = 8 + t * 14, y = 28 - t * 24, L = 7 - t * 3;
            stroke(i % 2 ? c : dk, 1.5, () => { g.moveTo(x, y); g.lineTo(x - L, y - L * .45); });
            stroke(i % 2 ? dk : lt, 1.5, () => { g.moveTo(x, y); g.lineTo(x + L * .9, y + L * .2); });
          }
        } else if (s.sh === 'palm') {
          stroke(stem, 1.8, () => { g.moveTo(6, 28); g.quadraticCurveTo(14, 12, 27, 5); });
          for (let i = 1; i < 10; i++) {
            const t = i / 10, x = 6 + t * 20, y = 28 - t * 22 - Math.sin(t * 3) * 3, L = 9 - t * 5;
            stroke(i % 2 ? c : lt, 1.7, () => { g.moveTo(x, y); g.lineTo(x - L * .3, y - L); });
            stroke(i % 2 ? dk : c, 1.7, () => { g.moveTo(x, y); g.lineTo(x + L * .8, y + L * .5); });
          }
        } else if (s.sh === 'star') {
          const pts = [];
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.5 : 12; pts.push([16 + Math.cos(a) * r, 15 + Math.sin(a) * r]); }
          glow(16, 15, 12, c, .2);
          blade(pts);
          for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; stroke(lt, 1, () => { g.moveTo(16, 15); g.lineTo(16 + Math.cos(a) * 9, 15 + Math.sin(a) * 9); }); }
          stroke(stem, 1.6, () => { g.moveTo(16, 21); g.lineTo(15, 29); });
        } else {
          // 잎몸 윤곽 — 잎자루(아래 왼쪽)에서 잎끝(위 오른쪽)까지
          const W = s.sh === 'broad' ? 9.5 : s.sh === 'curl' ? 6 : 7.5;
          const pts = [];
          for (let i = 0; i <= 12; i++) {
            const t = i / 12, w = Math.sin(t * Math.PI) ** (s.sh === 'broad' ? .7 : .9) * W;
            const cx = 9 + t * 16, cy = 25 - t * 20 + (s.sh === 'curl' ? Math.sin(t * 5) * 2.5 : 0);
            pts.push([cx - w * .78, cy - w * .62]);
          }
          for (let i = 12; i >= 0; i--) {
            const t = i / 12, w = Math.sin(t * Math.PI) ** (s.sh === 'broad' ? .7 : .9) * W * (s.sh === 'curl' ? .6 : 1);
            const cx = 9 + t * 16, cy = 25 - t * 20 + (s.sh === 'curl' ? Math.sin(t * 5) * 2.5 : 0);
            pts.push([cx + w * .78, cy + w * .62]);
          }
          blade(pts);
          stroke(stem, 1.6, () => { g.moveTo(5, 29); g.lineTo(10, 24); });
          stroke(sh2(c, .78), 1.1, () => { g.moveTo(10, 24); g.lineTo(24, 6); });           // 잎맥
          for (let i = 1; i < (s.sh === 'broad' ? 6 : 4); i++) {
            const t = i / (s.sh === 'broad' ? 6 : 4), x = 10 + t * 14, y = 24 - t * 18;
            stroke(sh2(c, .8), .9, () => { g.moveTo(x, y); g.lineTo(x - 4, y - 1); });
            stroke(sh2(c, .8), .9, () => { g.moveTo(x, y); g.lineTo(x + 1, y + 4); });
          }
          stroke(lt, 1, () => { g.moveTo(9, 19); g.quadraticCurveTo(13, 11, 21, 7); });   // 윗가 빛
        }
        return;
      }
    }
  },
  wildflower(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        stroke('#4a7a34', 2, () => { g.moveTo(16, 28); g.lineTo(16, 16); });
        P(14, 22, 2, 5, sh2('#4a7a34', .8));
        for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) circ(16 + dx, 13 + dy, 3.2, c);
        circ(16, 13, 2, '#ffe58a');
        return;
      }
    }
  },
  weed_icon(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        for (let i = 0; i < 4; i++) {
          const bx = 8 + i * 5, h = 10 + (i % 2) * 6;
          stroke(sh2(s.c, .8 + i * .1), 2.2, () => { g.moveTo(bx, 28); g.quadraticCurveTo(bx + 3, 28 - h * .6, bx - 2, 28 - h); });
        }
        return;
      }
    }
  },
  cactus(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        P(13, 8, 6, 20, c);
        P(6, 14, 5, 10, c); P(21, 12, 5, 12, c);
        P(13, 8, 2, 20, sh2(c, 1.3));
        for (let i = 0; i < 5; i++) circ(13 + (i % 2) * 6, 10 + i * 4, .8, '#e8dcc0');
        return;
      }
    }
  },
  mushroom(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        P(14, 16, 4, 12, '#e8dcc0');
        g.fillStyle = c; g.beginPath(); g.ellipse(16, 14, 10, 7, 0, Math.PI, 2 * Math.PI); g.fill();
        circ(11, 11, 1.4, '#fff'); circ(19, 10, 1.6, '#fff'); circ(16, 8, 1.2, '#fff');
        return;
      }
    }
  },
  runefrag(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c;
        glow(16, 16, 11, c, .2);
        poly([[16, 3], [26, 12], [21, 27], [10, 25], [6, 11]], sh2(c, .8));
        poly([[16, 3], [16, 26], [10, 25], [6, 11]], c);
        const gl = sh2(c, 1.7);
        P(12, 10, 1.6, 10, gl); P(12, 10, 7, 1.6, gl); P(12, 15, 5, 1.6, gl);
        return;
      }
    }
  },
  key(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.4), dk = sh2(c, .7);
        if (s.glow) glow(16, 16, 12, s.glow, .22);
        stroke(dk, 4.4, () => { g.arc(16, 9, 5.6, 0, TAU); });
        stroke(c, 2.6, () => { g.arc(16, 9, 5.6, 0, TAU); });
        stroke(lt, 1.2, () => { g.arc(16, 9, 5.6, 2.4, 4.2); });
        P(14.6, 14, 2.8, 15, c);
        P(14.6, 14, 1, 15, lt);
        P(17.4, 22, 4.4, 2.4, c); P(17.4, 26, 3.2, 2.4, c);
        return;
      }
    }
  },
  horn(H) {
    const { g, s, rng, P, poly, circ, ell, stroke, glow } = H;
    { {
        const c = s.c, lt = sh2(c, 1.3), dk = sh2(c, .68);
        g.fillStyle = c; g.beginPath();
        g.moveTo(28, 6);
        g.bezierCurveTo(14, 6, 4, 14, 5, 24);
        g.bezierCurveTo(9, 26, 13, 22, 14, 17);
        g.bezierCurveTo(18, 13, 24, 12, 29, 12);
        g.closePath(); g.fill();
        g.fillStyle = lt; g.beginPath();
        g.moveTo(27, 7.5);
        g.bezierCurveTo(15, 7.5, 6.5, 15, 7, 22);
        g.bezierCurveTo(9, 21, 11, 18, 12.5, 15.5);
        g.bezierCurveTo(17, 11.5, 23, 10.5, 27, 10.5);
        g.closePath(); g.fill();
        P(26, 5, 4, 8, dk);
        stroke(dk, 1.4, () => { g.moveTo(10, 21); g.lineTo(13, 24); });
        return;
      }
    }
  },
};
Object.assign(ITEM_PAINT, ItemPaintLoot);
