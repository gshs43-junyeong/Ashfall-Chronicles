/* ===== art/tiles/misc.js — 발판 · 가시 · 풀꽃 · 선인장·버섯 · 덩굴 · 유리 · 수정 · 구름 · 유적 돌·봉인 · 물 · 용암 ===== */
import { shade } from '../../../engine/core/color.js';
import { TAU, clamp } from '../../../engine/core/math.js';
import { TS } from '../../world.js';
import { TILE_PAINT } from '../../tileart.js';
/* tileart.js TileArt.paint 의 갈래들 — 읽히는 순간 TILE_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 TileArt. */

export const TilePaintMisc: Bag = {
  platform(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        R(0, 0, TS, 7, base);
        R(0, 0, TS, 1, shade(base, 1.3));
        R(0, 6, TS, 1, shade(base, .55));
        R(rng.range(4, TS - 6), 1, 1, 5, shade(base, .68));
        R(rng.range(4, TS - 6), 1, 1, 5, shade(base, .68));
        return;
    }
  },
  spike(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        for (let i = 0; i < 3; i++) {
          const bx = ox + 2 + i * 6 + rng.range(-1, 1);
          g.fillStyle = shade(base, 1.15);
          g.beginPath(); g.moveTo(bx, oy + TS); g.lineTo(bx + 3, oy + TS - 12); g.lineTo(bx + 6, oy + TS); g.closePath(); g.fill();
        }
        return;
      }
    }
  },
  flower(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const fx = ox + TS / 2 + rng.range(-3, 3), fy = oy + TS - 7;
        g.strokeStyle = shade('#4a7a34', .8); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(fx, oy + TS); g.lineTo(fx, fy); g.stroke();
        g.fillStyle = base;
        for (const [ddx, ddy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) { g.beginPath(); g.arc(fx + ddx, fy + ddy, 1.8, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe58a'; g.beginPath(); g.arc(fx, fy, 1.4, 0, TAU); g.fill();
        return;
      }
    }
  },
  weed(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        for (let i = 0; i < 3; i++) {
          const bx = ox + 3 + i * 6 + rng.range(-1, 1), h = rng.int(5, 10);
          g.strokeStyle = shade(base, .9 + i * .15); g.lineWidth = 1.3;
          g.beginPath(); g.moveTo(bx, oy + TS); g.quadraticCurveTo(bx + rng.range(-2, 2), oy + TS - h * .6, bx + rng.range(-1, 1), oy + TS - h); g.stroke();
        }
        return;
      }
    }
  },
  cactusblock(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 여러 칸을 세로로 쌓았을 때 이음매 없이 이어지도록 칸 전체 높이(0~TS)를 채운다
        const w = 15, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt);
        R(x0 + w - 2, 0, 2, TS, dk);
        for (let i = 0; i < 3; i++) {   // 세로 골(리브)
          const rx = x0 + 3 + i * 4;
          R(rx, 0, 1, TS, dk2);
        }
        for (let y = rng.range(1, 4); y < TS; y += rng.int(4, 7)) {   // 가시
          R(x0 - 1, y, 1, 1, '#e8dcc0'); R(x0 + w, y + rng.int(0, 2), 1, 1, '#e8dcc0');
        }
        return;
      }
    }
  },
  cactustile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const cx = ox + TS / 2 + rng.range(-2, 2), h = rng.int(9, 14);
        g.fillStyle = base;
        g.fillRect(cx - 2, oy + TS - h, 4, h);
        if (rng.chance(.6)) g.fillRect(cx - 5, oy + TS - h * .55, 3, h * .4);
        if (rng.chance(.6)) g.fillRect(cx + 2, oy + TS - h * .7, 3, h * .45);
        g.fillStyle = shade(base, 1.3); g.fillRect(cx - 2, oy + TS - h, 1, h);
        return;
      }
    }
  },
  mushroomtile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 눈에 잘 띄게 큼직한 광대버섯 스타일(붉은 갓 + 흰 반점)로 하나, 옆에 작은 것 하나
        const specs = [[ox + TS / 2 + 1, 10, 6, 4.4], [ox + 7 + rng.range(-1, 1), 6, 3.4, 2.6]];
        for (const [bx, h, capW, capH] of specs) {
          g.fillStyle = '#e8dcc0'; g.fillRect(bx - 1.5, oy + TS - h, 3, h);
          g.fillStyle = base;
          g.beginPath(); g.ellipse(bx, oy + TS - h + 1, capW, capH, 0, Math.PI, 2 * Math.PI); g.fill();
          g.fillStyle = '#fff2d8';
          g.beginPath(); g.arc(bx - capW * .4, oy + TS - h - capH * .3, 1, 0, TAU); g.fill();
          g.beginPath(); g.arc(bx + capW * .3, oy + TS - h - capH * .1, .8, 0, TAU); g.fill();
        }
        return;
      }
    }
  },
  vine(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        let x = TS / 2;
        for (let y = 0; y < TS; y++) {
          x = clamp(x + rng.range(-.7, .7), 3, TS - 5);
          R(x, y, 2, 1, base);
          if (rng.chance(.16)) R(x + (rng.chance(.5) ? -3 : 2), y, 3, 2, shade(base, 1.25));
        }
        return;
      }
    }
  },
  /* ---------- 설계 유리 ---------- */
  draftglass(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, shade(base, .28));
        g.save();
        g.globalAlpha = .5;
        for (let x = 2; x < TS; x += 5) R(x, 0, 1, TS, shade(base, .62));
        for (let y = 2; y < TS; y += 5) R(0, y, TS, 1, shade(base, .62));
        g.globalAlpha = 1;
        // 도면 선 — 직각으로 몇 번 꺾이는 한 줄
        let px = rng.range(2, TS - 6), py = rng.range(2, TS - 6);
        for (let k = 0; k < 5; k++) {
          const len = rng.range(4, 9), horiz = k % 2 === 0;
          R(px, py, horiz ? len : 1, horiz ? 1 : len, shade(base, 1.5));
          if (horiz) px += len; else py += len;
          if (px > TS - 3) px = 2; if (py > TS - 3) py = 2;
        }
        for (let i = 0; i < 3; i++) R(rng.range(1, TS - 2), rng.range(1, TS - 2), 2, 2, '#eaffff');
        g.restore();
        return;
      }
    }
  },
  crystal(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, shade(base, .42));
        for (let i = 0; i < 4; i++) {
          const x = rng.range(0, TS - 8), y = rng.range(0, TS - 9);
          const w = rng.range(5, 9), h = rng.range(6, 12);
          g.fillStyle = shade(base, .62 + i * .16);
          g.beginPath();
          g.moveTo(ox + x + w / 2, oy + y);
          g.lineTo(ox + x + w, oy + y + h * .42);
          g.lineTo(ox + x + w / 2, oy + y + h);
          g.lineTo(ox + x, oy + y + h * .42);
          g.closePath(); g.fill();
          R(x + w / 2 - 1, y + 1, 1, h * .42, shade(base, 1.5));
        }
        return;
      }
    }
  },
  cloud(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) {
          const x = rng.range(-2, TS - 4), y = rng.range(-2, TS - 4), r = rng.range(3, 7);
          g.fillStyle = rng.chance(.5) ? lt2 : shade(base, .9);
          g.beginPath(); g.arc(x + r / 2, y + r / 2, r / 2, 0, TAU); g.fill();
        }
        R(0, 0, TS, 2, '#ffffff');
        R(0, TS - 3, TS, 3, shade(base, .82));
        return;
      }
    }
  },
  ruintile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        R(0, 0, TS, 1.4, lt); R(0, TS - 2, TS, 2, dk2);
        R(TS / 2 - .7, 0, 1.4, TS, dk);
        for (let i = 0; i < 10; i++) this._r(g, ox, oy, rng.range(0, TS - 1), rng.range(0, TS - 1), 1, 1, rng.chance(.5) ? dk2 : lt);
        return;
      }
    }
  },
  runestone(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) R(rng.range(-1, TS - 4), rng.range(-1, TS - 4), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        // 발광 룬
        const gl = '#9fe8d8';
        R(TS * .3, TS * .22, 1.6, TS * .56, gl);
        R(TS * .3, TS * .22, TS * .4, 1.6, gl);
        R(TS * .3, TS * .48, TS * .3, 1.6, gl);
        R(TS * .64, TS * .5, 1.6, TS * .28, gl);
        g.globalAlpha = .3; g.fillStyle = gl; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        return;
      }
    }
  },
  seal(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        // 사슬 문양
        g.strokeStyle = '#8a7fc0'; g.lineWidth = 2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, TS * .3, 0, TAU); g.stroke();
        g.lineWidth = 1;
        R(TS / 2 - 1, TS * .12, 2, TS * .76, '#8a7fc0');
        g.globalAlpha = .22; g.fillStyle = '#a06fff'; g.fillRect(ox, oy, TS, TS); g.globalAlpha = 1;
        return;
      }
    }
  },
  /* ---------- 동굴 물 ---------- */
  water(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        g.save();
        g.globalAlpha = s.fall ? 0.5 : 0.62;
        this._fill(g, ox, oy, base);
        g.globalAlpha = 1;
        if (s.fall) {
          // 떨어지는 물 — 세로로 길게 흐르는 줄기
          for (let i = 0; i < 5; i++) {
            const x = rng.range(0, TS - 2);
            g.globalAlpha = rng.range(.25, .6);
            R(x, rng.range(-4, 0), rng.range(1, 3), rng.range(10, TS + 4), lt2);
          }
          g.globalAlpha = .5;
          for (let i = 0; i < 10; i++) R(rng.range(0, TS - 1), rng.range(0, TS - 1), 1, rng.range(2, 5), '#eaf6ff');
        } else {
          // 고인 물 — 가로로 흔들리는 잔물결과 바닥 쪽 어둠
          g.globalAlpha = .34;
          for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 4), rng.range(0, TS - 2), rng.range(4, 11), 1, lt2);
          g.globalAlpha = .22;
          R(0, TS - 5, TS, 5, dk2);
          g.globalAlpha = .5;
          this._speck(g, ox, oy, rng, 8, lt, dk);
        }
        g.restore();
        return;
      }
    }
  },
  lava(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 8; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 8), rng.range(2, 5), rng.chance(.5) ? shade(base, 1.32) : shade(base, .72));
        R(0, 0, TS, 2, shade(base, 1.5));
        this._speck(g, ox, oy, rng, 14, '#ffd27a', shade(base, .6));
        return;
    }
  },
};
Object.assign(TILE_PAINT, TilePaintMisc);
