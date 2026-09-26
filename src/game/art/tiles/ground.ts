/* ===== art/tiles/ground.js — 땅 · 바위 · 눈·얼음 · 나무·잎 · 광석 · 판자·벽돌 · 횃불 ===== */
import { shade } from '../../../engine/core/color.js';
import { TAU, clamp } from '../../../engine/core/math.js';
import { RNG } from '../../../engine/core/rng.js';
import { TS } from '../../world.js';
import { TILE_PAINT } from '../../tileart.js';
/* tileart.js TileArt.paint 의 갈래들 — 읽히는 순간 TILE_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 TileArt. */

export const TilePaintGround: Bag = {
  soil(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 11; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(2, 6), rng.range(2, 4), rng.chance(.5) ? dk : lt);
        this._speck(g, ox, oy, rng, 26, dk2, lt);
        return;
    }
  },
  grass(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 9; i++) R(rng.range(-1, TS - 3), rng.range(4, TS - 3), rng.range(2, 6), rng.range(2, 4), rng.chance(.5) ? dk : lt);
        this._speck(g, ox, oy, rng, 18, dk2, lt);
        const g1 = s.g, g2 = shade(g1, 1.28), g3 = shade(g1, .68);
        let h = 5;
        for (let x = 0; x < TS; x++) {
          h = clamp(h + rng.range(-1.2, 1.2), 3, 8);
          R(x, 0, 1, h, g1);
          R(x, 0, 1, rng.chance(.6) ? 2 : 1, g2);
          R(x, h - 1, 1, 1, g3);
        }
        return;
      }
    }
  },
  rock(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 10), rng.range(3, 7), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {   // 균열
          let x = rng.range(2, TS - 2), y = rng.range(-2, 6);
          for (let k = 0; k < rng.int(5, 12); k++) { R(x, y, 1, 1, dk2); x += rng.range(-1.2, 1.2); y += rng.range(.7, 1.7); }
        }
        this._speck(g, ox, oy, rng, 20, dk2, lt2);
        return;
    }
  },
  sand(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        this._speck(g, ox, oy, rng, 76, dk, lt);
        for (let i = 0; i < 3; i++) {   // 잔물결
          const y = rng.range(2, TS - 3);
          for (let x = 0; x < TS; x++) if (rng.chance(.55)) R(x, y + Math.sin(x * .55 + i) * .9, 1, 1, dk);
        }
        return;
    }
  },
  strata(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        let y = rng.range(-3, 0);
        while (y < TS) { const h = rng.range(2.5, 5.5); R(0, y, TS, h, rng.chance(.5) ? dk : lt); y += h; }
        for (let i = 0; i < 4; i++) R(0, rng.range(0, TS), TS, 1, dk2);
        this._speck(g, ox, oy, rng, 22, dk2, lt2);
        return;
      }
    }
  },
  snow(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        this._speck(g, ox, oy, rng, 44, shade(base, .88), '#ffffff');
        R(0, 0, TS, 2, '#ffffff');
        for (let i = 0; i < 4; i++) R(rng.range(0, TS - 4), rng.range(3, TS - 2), rng.range(2, 5), 1, shade(base, .82));
        return;
    }
  },
  ice(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 4; i++) {   // 사선 광택
          const x = rng.range(-6, TS), len = rng.range(6, 14), st = rng.range(0, TS - 4);
          for (let k = 0; k < len; k++) R(x + k, st + k, 1, 1, rng.chance(.6) ? lt2 : lt);
        }
        for (let i = 0; i < 2; i++) {   // 균열
          let x = rng.range(3, TS - 3);
          for (let y = 0; y < TS; y++) { R(x, y, 1, 1, dk); x += rng.range(-.8, .8); }
        }
        R(0, 0, TS, 1, lt2);
        return;
    }
  },
  trunk(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const w = 16, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt);
        R(x0 + w - 2, 0, 2, TS, dk);
        for (let i = 0; i < 4; i++) {   // 나뭇결
          const x = x0 + rng.range(2, w - 3);
          for (let y = rng.range(0, 4); y < TS; y += rng.int(3, 8)) R(x, y, 1, rng.range(2, 5), dk2);
        }
        if (rng.chance(.3)) {           // 옹이
          const kx = x0 + rng.range(3, w - 6), ky = rng.range(3, TS - 7);
          R(kx, ky, 5, 4, dk2); R(kx + 1, ky + 1, 3, 2, dk);
        }
        return;
      }
    }
  },
  pine(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 소나무 잎 — 둥근 잎덩이(leaf)가 아니라 **아래로 처진 가지 줄** 위에 짧은 바늘잎을 세운다. */
        const c1 = base, c2 = shade(base, 1.3), c3 = shade(base, .72), c4 = shade(base, .52);
        const lr = new RNG('pine-' + seed);
        const Rc = (x, y, w, h, col) => { if (y + h > 0 && y < TS) R(x, Math.max(0, y), w, Math.min(h, TS - Math.max(0, y)), col); };
        for (let y = 0; y < TS; y++)
          for (let x = 0; x < TS; x++) if (!lr.chance(.06)) R(x, y, 1, 1, (x + y) % 3 ? c3 : c4);
        const off = lr.int(0, 4);
        for (let b = -1; b < 5; b++) {
          const y0 = b * 5 + off, cx = lr.range(4, TS - 4);
          for (let x = 0; x < TS; x++) {
            const y = Math.round(y0 + ((x - cx) / TS) ** 2 * 6);
            Rc(x, y, 1, 2, c1);
            if ((x + b) % 2 === 0) Rc(x, y - 2, 1, 2, c1);          // 위로 선 바늘
            if ((x + b) % 3 === 0) Rc(x, y - 3, 1, 1, c2);          // 바늘 끝 빛
            if ((x + b) % 4 === 1) Rc(x, y + 2, 1, 1, c4);          // 가지 밑 그늘
          }
        }
        for (let i = 0; i < 6; i++) R(lr.range(1, TS - 2), lr.range(1, TS - 2), 1, 1, c2);
        return;
      }
    }
  },
  leaf(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* ---------- 잎은 **가지에 붙어 있어야 한다** ---------- */
        const c1 = base, c2 = shade(base, 1.32), c3 = shade(base, .66);
        const tw = s.tw || shade(base, .40), tw2 = shade(tw, 1.4);
        const M = TS / 2 - 1;
        // 잎덩이는 칸·변형마다 고정된 씨앗으로 뽑는다 — 판을 다시 구워도 같은 그림이 나온다
        const lr = new RNG('leaf-' + seed);

        /* ---------- 빽빽할 때는 **정말 빽빽해야 한다** ---------- */
        const STEP = 4;
        for (let gy = -2; gy < TS + 2; gy += STEP) {
          for (let gx = -2; gx < TS + 2; gx += STEP) {
            if (lr.chance(.13)) continue;          // 빛이 새는 구멍
            const x = gx + lr.int(-1, 1), y = gy + lr.int(-1, 1);
            const w = lr.range(4, 7), h = lr.range(4, 6);
            const col = [c1, c1, c2, c3][lr.int(0, 3)];
            R(x + 1, y, w - 2, h, col); R(x, y + 1, w, h - 2, col);
          }
        }
        // 큰 덩이를 위에 얹어 명암 결을 만든다 — 격자만으로는 고르게 칠한 벽이 된다
        for (let i = 0; i < 9; i++) {
          const x = lr.range(-2, TS - 3), y = lr.range(-2, TS - 3);
          const w = lr.range(5, 9), h = lr.range(4, 8);
          const col = [c1, c2, c2, c3][lr.int(0, 3)];
          R(x + 1, y, w - 2, h, col); R(x, y + 1, w, h - 2, col);
        }
        for (let i = 0; i < 10; i++) R(lr.range(1, TS - 2), lr.range(1, TS - 2), 1, 1, c2);

        /* 위에 그려야 "이 잎이 저 줄기에 달려 있다"가 눈으로 읽힌다 — 사연: docs/code-history.md#h85 */
        const twig = s.noTwig ? () => {} : (x0, y0, x1, y1, th, col?) => {
          const k = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let i = 0; i <= k; i++) {
            const t = i / k;
            R(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, th, th, col || tw);
          }
        };
        if (v === 0) {
          twig(-1, M + 2, M + 3, M, 3); twig(0, M + 2, M + 2, M, 1, tw2);
          twig(M - 3, M + 1, M + 4, M - 5, 2);          // 위로 갈라진 잔가지
        }
        if (v === 1) {
          twig(TS, M - 1, M - 4, M + 1, 3); twig(TS - 1, M - 1, M - 3, M + 1, 1, tw2);
          twig(M + 2, M, M - 5, M - 5, 2);
        }
        if (v === 2) {
          twig(M, TS, M, M - 3, 3); twig(M, TS - 1, M, M - 2, 1, tw2);
          twig(M, M + 1, M - 6, M - 4, 2); twig(M + 1, M + 3, M + 6, M - 1, 2);
        }
        // 가지 끝에 잎 두 덩이를 다시 얹어 막대기처럼 안 보이게 한다
        if (!s.noTwig && v !== 3) {
          const ex = v === 0 ? M + 3 : v === 1 ? M - 4 : M;
          const ey = v === 2 ? M - 3 : M;
          R(ex - 2, ey - 3, 5, 4, c1); R(ex - 1, ey - 4, 3, 6, c2);
        }
        // 발광 잎(버섯나무 갓 조각) — 은은한 빛무리를 얹는다.
        if (s.glow) {
          g.globalAlpha = .28; g.fillStyle = shade(base, 1.6);
          g.beginPath(); g.arc(TS / 2, TS / 2, TS * .55, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
        return;
      }
    }
  },
  ebon(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {   // 갈라진 정맥
          let x = rng.range(0, TS);
          for (let y = 0; y < TS; y++) { R(x, y, rng.chance(.3) ? 2 : 1, 1, dk2); x += rng.range(-1.5, 1.5); }
        }
        for (let i = 0; i < 5; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), 2, 2, '#7d5aa8');
        this._speck(g, ox, oy, rng, 14, dk2, '#6a4a92');
        return;
    }
  },
  glass(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) {   // 유리질 사선 반사
          const x = rng.range(0, TS - 6), y = rng.range(0, TS - 6), len = rng.range(4, 10);
          for (let k = 0; k < len; k++) R(x + k, y + k, 1, 1, k < len / 2 ? lt2 : lt);
        }
        for (let i = 0; i < 4; i++) R(rng.range(0, TS - 4), rng.range(0, TS - 4), rng.range(2, 5), rng.range(2, 4), dk2);
        R(0, 0, TS, 1, lt);
        return;
    }
  },
  ore(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 돌 베이스
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        // 광석 덩이
        const o = s.o, oL = shade(o, 1.4), oD = shade(o, .58);
        /* 광상은 덩이가 칸을 거의 덮고 굵은 결이 가로지른다 — 멀리서도 보통 광맥과 가려진다 */
        if (s.rich) { R(0, TS * .35, TS, TS * .3, oD); R(0, TS * .38, TS, 2, o); }
        const n = s.rich ? rng.int(9, 12) : rng.int(4, 6);
        for (let i = 0; i < n; i++) {
          const x = rng.range(1, TS - 7), y = rng.range(1, TS - 6);
          const w = rng.range(4, 7), h = rng.range(3, 6);
          R(x, y, w, h, o);
          R(x, y, w - 1, 1, oL);
          R(x + 1, y + h - 1, w - 1, 1, oD);
          R(x + 1, y + 1, 1, 1, oL);
        }
        if (s.glow) {
          g.globalAlpha = .22; g.fillStyle = oL; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        }
        return;
      }
    }
  },
  plank(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const rows = 3, hgt = TS / rows;
        for (let i = 0; i < rows; i++) {
          const y = i * hgt;
          R(0, y, TS, hgt, i % 2 ? shade(base, .9) : shade(base, 1.07));
          R(0, y, TS, 1, lt);
          R(0, y + hgt - 1, TS, 1, dk2);
          const jx = rng.range(3, TS - 4);
          R(jx, y + 1, 1, hgt - 2, dk);
          for (let k = 0; k < 3; k++) R(rng.range(0, TS - 4), y + rng.range(1, hgt - 2), rng.range(2, 6), 1, dk);
        }
        return;
      }
    }
  },
  brick(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, shade(base, .55));
        const bh = TS / 3, bw = TS / 2;
        for (let row = 0; row < 3; row++) {
          const y = row * bh, off = row % 2 ? -bw / 2 : 0;
          for (let bx = off; bx < TS; bx += bw) {
            const col = rng.chance(.5) ? base : shade(base, 1.12);
            R(bx + 1, y + 1, bw - 2, bh - 2, col);
            R(bx + 1, y + 1, bw - 2, 1, shade(col, 1.2));
            R(bx + 1, y + bh - 2, bw - 2, 1, shade(col, .78));
          }
        }
        return;
      }
    }
  },
  torch(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        R(TS / 2 - 2, TS * .34, 4, TS * .64, '#6a4a28');
        R(TS / 2 - 2, TS * .34, 1, TS * .64, '#8f6740');
        R(TS / 2 - 3, TS * .14, 6, 8, '#e06a16');
        R(TS / 2 - 2, TS * .09, 4, 8, '#f7a92c');
        R(TS / 2 - 1, TS * .06, 2, 6, '#ffe98c');
        return;
    }
  },
};
Object.assign(TILE_PAINT, TilePaintGround);
