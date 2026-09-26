/* ===== art/tiles/village.js — 빛버섯 · 지붕·목재·석재·성가퀴·창·울타리 · 가로등·깃발 · 건초·모래주머니 · 밭·작물 · 풍차·방아 ===== */
import { shade } from '../../../engine/core/color.js';
import { TAU } from '../../../engine/core/math.js';
import { TS } from '../../world.js';
import { TILE_PAINT } from '../../tileart.js';
/* tileart.js TileArt.paint 의 갈래들 — 읽히는 순간 TILE_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 TileArt. */

export const TilePaintVillage: Bag = {
  glowcap(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const specs = [[TS / 2 + rng.range(-1, 1), 12, 7, 5], [7 + rng.range(-1, 1), 7, 4, 3]];
        for (const [bx, h, capW, capH] of specs) {
          R(bx - 1.6, TS - h, 3.2, h, '#dff0e8');     // 자루
          g.fillStyle = base;
          g.beginPath(); g.ellipse(ox + bx, oy + TS - h + 1, capW, capH, 0, Math.PI, 2 * Math.PI); g.fill();
          g.fillStyle = shade(base, 1.35);
          g.beginPath(); g.ellipse(ox + bx, oy + TS - h, capW * .62, capH * .6, 0, Math.PI, 2 * Math.PI); g.fill();
          R(bx - capW, TS - h + 1, capW * 2, 1.2, shade(base, .7));
        }
        g.globalAlpha = .26; g.fillStyle = base;      // 스스로 내는 빛
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 12, 10, 0, TAU); g.fill();
        g.globalAlpha = 1;
        return;
      }
    }
  },
  /* ---------- 마을 건축 ---------- */
  thatch(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 40; i++) {          // 비스듬히 눕힌 짚단
          const x = rng.range(-3, TS), y = rng.range(0, TS - 2);
          const len = rng.range(4, 9);
          const col = [base, lt, dk, shade(base, .88)][rng.int(0, 3)];
          for (let k = 0; k < len; k++) R(x + k, y + k * .32, 1, 1, col);
        }
        R(0, 0, TS, 2, lt2);                    // 처마 끝의 밝은 줄
        R(0, TS - 2, TS, 2, shade(base, .55));
        return;
      }
    }
  },
  rooftile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, dk2);
        for (let row = 0; row < 3; row++) {     // 겹쳐 얹은 기와
          const y = row * 7.5 - 1, off = (row % 2) ? 4 : 0;
          for (let x = -8; x < TS; x += 8) {
            R(x + off, y, 7, 7, base);
            R(x + off, y, 7, 1.5, lt);
            R(x + off + 6, y, 1, 7, dk2);
            R(x + off + 1, y + 6, 5, 1, shade(base, .62));
          }
        }
        return;
      }
    }
  },
  timber(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);            // 회반죽
        this._speck(g, ox, oy, rng, 20, shade(base, .9), lt2);
        const w2 = s.g, wl = shade(w2, 1.25), wd = shade(w2, .7);
        R(0, 0, TS, 3, w2); R(0, 0, TS, 1, wl);        // 상하 인방
        R(0, TS - 3, TS, 3, w2); R(0, TS - 1, TS, 1, wd);
        R(0, 0, 3, TS, w2); R(0, 0, 1, TS, wl);        // 좌우 기둥
        R(TS - 3, 0, 3, TS, w2); R(TS - 1, 0, 1, TS, wd);
        for (let k = 0; k < TS; k++) R(3 + k * .72, 3 + k * .72, 2, 2, w2);   // 빗대
        return;
      }
    }
  },
  ashlar(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);            // 다듬은 큰 돌
        const rows = [[0, 11], [11, 11]];
        for (const [y, h] of rows) {
          const off = y ? 6 : 0;
          for (let x = -11; x < TS; x += 12) {
            R(x + off + 1, y + 1, 10, h - 2, rng.chance(.5) ? lt : base);
            R(x + off + 1, y + 1, 10, 1.2, lt2);
            R(x + off + 1, y + h - 2, 10, 1.2, dk2);
          }
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        return;
      }
    }
  },
  battlement(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 흉벽: 아래는 꽉 찬 벽, 위는 이가 빠져 있다 (총안)
        R(0, 8, TS, TS - 8, base);
        R(0, 8, TS, 1.5, lt2);
        R(0, TS - 2, TS, 2, dk2);
        R(0, 0, 8, 9, base); R(0, 0, 8, 1.5, lt2);
        R(TS - 8, 0, 8, 9, base); R(TS - 8, 0, 8, 1.5, lt2);
        R(7, 0, 1.5, 9, dk2); R(TS - 8, 0, 1.5, 9, dk2);
        this._speck(g, ox, oy, rng, 14, dk2, lt);
        return;
      }
    }
  },
  windowtile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const fr = '#6a4a2a', frl = shade(fr, 1.3);
        R(0, 0, TS, TS, fr);
        R(0, 0, TS, 1.5, frl);
        R(2, 2, TS - 4, TS - 4, shade(base, .6));
        g.globalAlpha = .55; R(2, 2, TS - 4, TS - 4, base); g.globalAlpha = 1;
        R(TS / 2 - 1, 2, 2, TS - 4, fr);        // 창살
        R(2, TS / 2 - 1, TS - 4, 2, fr);
        R(4, 4, 5, 5, lt2);                     // 유리 반사
        R(TS - 8, TS - 9, 3, 4, shade(base, 1.2));
        return;
      }
    }
  },
  fencetile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(2, 6, 3, TS - 6, base);               // 기둥 둘
        R(TS - 5, 6, 3, TS - 6, base);
        R(2, 6, 1, TS - 6, lt); R(TS - 5, 6, 1, TS - 6, lt);
        R(0, 9, TS, 2.5, base); R(0, 9, TS, 1, lt);     // 가로대 둘
        R(0, 15, TS, 2.5, base); R(0, 15, TS, 1, lt);
        R(2, 5, 3, 1.5, lt2); R(TS - 5, 5, 3, 1.5, lt2);
        return;
      }
    }
  },
  lamppost(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const pole = '#4a4a52';
        R(TS / 2 - 1.5, 8, 3, TS - 8, pole);
        R(TS / 2 - 1.5, 8, 1, TS - 8, shade(pole, 1.5));
        R(TS / 2 - 5, TS - 2, 10, 2, pole);     // 받침
        R(TS / 2 - 4, 2, 8, 8, shade(pole, .8));   // 등집
        R(TS / 2 - 3, 3, 6, 6, base);
        R(TS / 2 - 2, 4, 4, 4, lt2);
        R(TS / 2 - 5, 1, 10, 2, pole);
        g.globalAlpha = .3; g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + 6, 9, 0, TAU); g.fill();
        g.globalAlpha = 1;
        return;
      }
    }
  },
  bannertile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(1, 0, TS - 2, 2.5, '#6a4a2a');        // 가로대
        R(4, 2, TS - 8, TS - 6, base);          // 천
        R(4, 2, 2, TS - 6, lt);
        R(TS - 6, 2, 2, TS - 6, dk);
        // 아래 갈라진 끝
        R(4, TS - 4, 5, 2, base); R(TS - 9, TS - 4, 5, 2, base);
        R(TS / 2 - 3, 6, 6, 6, '#e8d8a0');      // 문장 — 별 조각
        R(TS / 2 - 1, 4, 2, 10, '#e8d8a0');
        return;
      }
    }
  },
  hay(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 30; i++) {
          const x = rng.range(0, TS - 5), y = rng.range(0, TS - 1);
          R(x, y, rng.range(3, 6), 1, rng.chance(.5) ? lt : dk);
        }
        R(0, 2, TS, 1.5, '#8a6a2a'); R(0, TS - 5, TS, 1.5, '#8a6a2a');   // 묶은 끈
        R(0, 0, TS, 1.5, lt2);
        return;
      }
    }
  },
  sandbagtile(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, dk2);
        for (const [x, y, w2] of [[-2, 0, 13], [10, 0, 13], [3, 8, 13], [-4, 15, 13], [12, 15, 13]]) {
          g.fillStyle = rng.chance(.5) ? base : lt;
          g.beginPath(); g.ellipse(ox + x + w2 / 2, oy + y + 4, w2 / 2, 4, 0, 0, TAU); g.fill();
          R(x + 1, y + 1, w2 - 3, 1.4, lt2);
          R(x + w2 / 2 - .7, y, 1.4, 8, shade(base, .7));
        }
        return;
      }
    }
  },
  /* ---------- 농업 ---------- */
  farmland(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 옆에서 본 밭 — 세로 줄무늬로 그리면 울타리처럼 보여서, 위에 갈아엎은 흙두둑을 얹는다
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 12; i++)
          R(rng.range(-1, TS - 3), rng.range(4, TS - 3), rng.range(3, 7), rng.range(2, 4), rng.chance(.5) ? base : dk2);
        this._speck(g, ox, oy, rng, 22, dk2, base);
        R(0, 0, TS, 5, base);                    // 부드럽게 갈린 표층
        for (let x = 0; x < TS; x += 4) {        // 두둑
          const h = rng.range(1.5, 3);
          R(x, 5 - h, 3, h + 1, lt);
          R(x + 3, 4, 1, 2, dk2);
        }
        R(0, 0, TS, 1.2, lt2);
        this._speck(g, ox, oy, rng, 8, '#3a2a16', lt);
        return;
      }
    }
  },
  crop(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 줄기를 같은 간격·같은 높이로 세우면 울타리처럼 보인다.
        const st = s.st, kind = s.kind;
        const stalk = st === 3 ? shade(base, .68) : shade(base, .88);
        const n = [2, 3, 3, 4][st];
        const base_h = [6, 11, 15, 19][st];
        for (let i = 0; i < n; i++) {
          const x = 2.5 + i * (TS - 5) / n + rng.range(-1.6, 1.6);
          const h = base_h * rng.range(0.78, 1.1);
          const lean = rng.range(-1.2, 1.2);
          for (let k = 0; k < h; k++) R(x + lean * (k / h), TS - 1 - k, 1.8, 1, stalk);
          if (st >= 1) {                                   // 잎
            R(x - 3.4, TS - h * .55, 3.4, 1.4, shade(stalk, 1.2));
            R(x + 1.8, TS - h * .78, 3.2, 1.4, shade(stalk, .8));
          }
          if (st === 2) R(x - .6, TS - h - 1, 3, 3, base);  // 아직 여물지 않은 꽃봉오리
          if (st < 3) continue;
          const tx = x + lean, ty = TS - h;
          if (kind === 'wheat') {                          // 이삭 — 알갱이를 지그재그로
            for (let k = 0; k < 5; k++) {
              const yy = ty + k * 2.4;
              R(tx - 2.6, yy, 2.6, 2, base); R(tx + 1.2, yy + 1.2, 2.6, 2, base);
              R(tx - 2.6, yy, 2.6, .8, lt2);
            }
            R(tx + .2, ty - 3, 1, 4, lt);                  // 까끄라기
          } else if (kind === 'root') {                    // 무성한 잎 + 흙 위로 드러난 뿌리목
            for (let k = -2; k <= 2; k++) {
              const len = 5 - Math.abs(k);
              for (let j = 0; j < len; j++) R(tx + k * 2.2 + j * k * .3, ty + 1 + j * 1.1, 2, 1.6, k % 2 ? base : lt);
            }
            R(tx - 1.6, TS - 5, 4, 5, lt2);                // 뿌리목
            R(tx - 1.6, TS - 5, 4, 1.4, '#e8ffe8');
          } else if (kind === 'bean') {                    // 줄기에 매달린 꼬투리 — 아래로 늘어진다
            for (let k = 0; k < 3; k++) {
              const yy = ty + 2 + k * 4.2, sw = k % 2 ? -3 : 2.2;
              R(tx + sw, yy, 2.4, 4, base);
              R(tx + sw, yy, 1, 4, lt);
              R(tx + sw + .4, yy + 1.2, 1.4, 1, dk2);       // 콩알이 비치는 자국
            }
          } else if (kind === 'bloom') {                   // 뼈처럼 흰 꽃 — 다섯 잎이 벌어져 있다
            for (let k = 0; k < 5; k++) {
              const a = -Math.PI / 2 + (k - 2) * 0.62;
              R(tx + Math.cos(a) * 3.4 - 1.2, ty + 2 + Math.sin(a) * 3.4, 2.6, 2.6, base);
              R(tx + Math.cos(a) * 4.4 - .8, ty + 2 + Math.sin(a) * 4.4, 1.6, 1.6, lt2);
            }
            R(tx - 1, ty + 1.2, 2.2, 2.2, '#c8b060');      // 꽃심
          } else if (kind === 'herb') {                    // 서리 낀 잎 — 끝마다 얼음 알갱이
            for (let k = -2; k <= 2; k++) {
              if (!k) continue;
              const len = 4 - Math.abs(k) * 0.6;
              for (let j = 0; j < len; j++)
                R(tx + k * 1.8 + j * k * .5, ty + 1.4 + j * 1.5 + Math.abs(k), 2, 1.6, j > len - 2 ? '#e8ffff' : base);
            }
            R(tx - .8, ty - 1, 2, 2, '#ffffff');
          } else if (kind === 'pod') {                     // 벌어진 꼬투리 속에서 불씨가 보인다
            R(tx - 3.4, ty + 1, 7, 6, shade(base, .62));
            R(tx - 2.6, ty + 1.8, 5.4, 4.4, base);
            R(tx - 1.4, ty + 2.8, 3, 2.4, '#ffe08a');
            R(tx - .6, ty + 3.4, 1.6, 1.2, '#fff6d8');
            R(tx - 3.4, ty + .2, 7, 1.2, lt2);             // 벌어진 자리
          } else {                                         // 버섯 갓
            g.fillStyle = base;
            g.beginPath(); g.ellipse(ox + tx + .9, oy + ty + 3, 5, 4, 0, Math.PI, 2 * Math.PI); g.fill();
            g.fillStyle = shade(base, .72);
            R(tx - 4, ty + 2.4, 10, 1.4);
            R(tx + .2, ty + 3, 1.8, h - 4, '#e8dcc0');
            R(tx - 2, ty + .6, 1.4, 1.4, '#fff2d8');
            R(tx + 2.4, ty + 1.4, 1.2, 1.2, '#fff2d8');
          }
        }
        return;
      }
    }
  },
  /* ---------- 마을 기계 ---------- */
  mk_windmill(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(TS / 2 - 4, 9, 8, TS - 9, base);      // 탑
        R(TS / 2 - 4, 9, 2, TS - 9, lt2);
        R(TS / 2 + 2, 9, 2, TS - 9, dk);
        R(TS / 2 - 5, 8, 10, 2, shade(base, .7));
        g.save();                                // 날개 넷
        g.translate(ox + TS / 2, oy + 7);
        g.fillStyle = '#e8dcc0';
        for (let k = 0; k < 4; k++) {
          g.rotate(TAU / 4);
          g.fillRect(-1, -7, 2, 7);
          g.fillRect(-3.2, -7, 3.2, 4);
        }
        g.restore();
        g.fillStyle = '#5a4a3a';
        g.beginPath(); g.arc(ox + TS / 2, oy + 7, 2, 0, TAU); g.fill();
        return;
      }
    }
  },
  mk_mill(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = '#7a7a82';                 // 맷돌
        g.beginPath(); g.arc(ox + TS / 2, oy + 11, 7, 0, TAU); g.fill();
        g.fillStyle = '#9a9aa4';
        g.beginPath(); g.arc(ox + TS / 2, oy + 10, 6, 0, TAU); g.fill();
        g.fillStyle = '#4a4a52';
        g.beginPath(); g.arc(ox + TS / 2, oy + 10, 2, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) {            // 홈
          const a = k * TAU / 6;
          R(TS / 2 + Math.cos(a) * 3.4 - .6, 10 + Math.sin(a) * 3.4 - .6, 1.2, 1.2, '#6a6a72');
        }
        R(4, TS - 5, TS - 8, 3, '#e8dcc0');      // 쏟아진 가루
        return;
      }
    }
  },
};
Object.assign(TILE_PAINT, TilePaintVillage);
