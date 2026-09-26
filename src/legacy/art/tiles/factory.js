/* ===== art/tiles/factory.js — 유혈암 · 공장 기계(벨트 ~ 함정) · 진흙 ===== */
import { shade } from '../../../engine/core/color.js';
import { TAU } from '../../../engine/core/math.js';
import { TS } from '../../world.js';
import { TILE_PAINT } from '../../tileart.js';
/* tileart.js TileArt.paint 의 갈래들 — 읽히는 순간 TILE_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 TileArt. */

export const TilePaintFactory = {
  /* ---------- 유혈암 ---------- */
  oilshale(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        let y = rng.range(-3, 0);
        while (y < TS) { const h = rng.range(2, 4.5); R(0, y, TS, h, rng.chance(.5) ? dk : lt); y += h; }
        // 기름이 밴 광택 — 검은 얼룩 위에 무지갯빛 한 점
        for (let i = 0; i < 4; i++) {
          const x = rng.range(0, TS - 4), yy = rng.range(0, TS - 3);
          R(x, yy, rng.range(3, 6), rng.range(2, 3), '#1a1712');
          R(x + 1, yy, 1, 1, rng.chance(.5) ? '#5a7f6a' : '#7a6a8a');
        }
        this._speck(g, ox, oy, rng, 12, '#12100c', '#6a6050');
        return;
      }
    }
  },
  /* ---------- 기계 ---------- */
  mk_belt(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(0, 6, TS, TS - 10, dk2);
        R(0, 6, TS, 2, lt);
        R(0, TS - 5, TS, 1, shade(base, .4));
        for (let x = 1; x < TS; x += 4) R(x, 8, 2, TS - 14, shade(base, .92));   // 벨트 마디
        R(0, 5, 2, TS - 8, shade(base, .6)); R(TS - 2, 5, 2, TS - 8, shade(base, .6));
        return;
      }
    }
  },
  mk_drill(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        R(7, 3, 8, 4, shade(base, 1.45));                   // 모터 덮개
        for (let k = 0; k < 3; k++) R(8 + k * 2, 8 + k, 2, TS - 11 - k * 2, '#c8ccd4');   // 비트
        R(9, TS - 4, 4, 2, '#8a8e96');
        return;
      }
    }
  },
  mk_pump(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        R(4, 4, 3, TS - 8, shade(base, .5)); R(15, 4, 3, TS - 8, shade(base, .5));
        R(4, 8, 14, 3, '#2a2620');                          // 흔들대
        R(9, 10, 4, TS - 13, '#3a352c');
        R(7, TS - 5, 8, 3, shade(base, 1.3));
        return;
      }
    }
  },
  mk_furnace(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        R(5, 9, 12, 8, '#1e1a16');                          // 화구
        R(6, 12, 10, 5, '#e8842a');
        R(7, 14, 8, 3, '#ffcf6a');
        R(6, 3, 4, 4, shade(base, .5)); R(13, 3, 4, 4, shade(base, .5));   // 굴뚝
        return;
      }
    }
  },
  mk_gen(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        R(3, 12, 9, 7, '#1e1a16');                          // 화실
        R(4, 15, 7, 4, '#e8842a');
        R(5, 17, 5, 2, '#ffcf6a');
        g.fillStyle = '#c8ccd4';                            // 플라이휠 — 용광로와 구분되는 표식
        g.beginPath(); g.arc(ox + 15, oy + 10, 5, 0, TAU); g.fill();
        g.fillStyle = '#4a4a54';
        g.beginPath(); g.arc(ox + 15, oy + 10, 2.2, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .5;
          R(15 + Math.cos(a) * 5 - 1, 10 + Math.sin(a) * 5 - 1, 2, 2, '#8a8e99');
        }
        R(4, 2, 4, 4, shade(base, .45));                    // 배기구
        R(12, 3, 7, 2, '#4a4a54');                          // 축
        return;
      }
    }
  },
  mk_press(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        R(2, 2, 18, 6, '#2e2e38');                          // 프레스 헤드 (어두운 강철)
        R(2, 2, 18, 1.5, '#9aa0ad');
        R(2, 7, 18, 1.5, '#12121a');
        R(9, 8, 4, 4, '#c8ccd4');                           // 램
        R(2, TS - 8, 18, 5, '#2e2e38');                     // 모루
        R(2, TS - 8, 18, 1.5, '#9aa0ad');
        R(4, 12, 2, 5, '#12121a'); R(16, 12, 2, 5, '#12121a');   // 안내 기둥
        return;
      }
    }
  },
  mk_tank(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = shade(base, 1.35);
        g.beginPath(); g.ellipse(ox + TS / 2, oy + 11, 7, 8, 0, 0, TAU); g.fill();
        g.fillStyle = '#2e2a24';
        g.beginPath(); g.ellipse(ox + TS / 2, oy + 13, 5, 5, 0, 0, TAU); g.fill();
        R(TS / 2 - 1, 2, 2, 4, shade(base, .5));
        return;
      }
    }
  },
  mk_gear(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        const cx = ox + TS / 2, cy = oy + TS / 2;
        g.fillStyle = shade(base, 1.5);
        g.beginPath(); g.arc(cx, cy, 6.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, .45);
        g.beginPath(); g.arc(cx, cy, 2.4, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) {                        // 톱니
          const a = k * TAU / 6;
          R(TS / 2 + Math.cos(a) * 8 - 1.5, TS / 2 + Math.sin(a) * 8 - 1.5, 3, 3, shade(base, 1.5));
        }
        return;
      }
    }
  },
  mk_crate(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 나무 상자(저장 상자류)와 헷갈리지 않도록 다른 기계들과 같은 금속 뼈대(_mkBody)를 쓰고, 위쪽 투입구+아래쪽 저장 칸 표식만 얹는다 — "기계"로 한눈에 묶여 보이면서도
        // 크레이트 특유의 표식은 남긴다.
        this._mkBody(g, ox, oy, base, R);
        R(4, 3, TS - 8, 5, '#1e1a16');                       // 위쪽 투입구
        R(5, 4, TS - 10, 3, shade(base, .5));
        for (let k = 0; k < 3; k++) R(4 + k * 5, TS - 8, 3, 4, shade(base, 1.35));   // 저장 칸
        return;
      }
    }
  },
  mk_battery(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        R(6, 2, 4, 2, shade(base, 1.5)); R(13, 2, 4, 2, shade(base, 1.5));   // 단자
        R(4, 5, 15, TS - 8, '#1e2a28');
        R(5, 6, 13, 3, '#6fe0c0');                           // 잔량 눈금
        R(5, 10, 13, 3, shade('#6fe0c0', .55));
        R(5, 14, 13, 3, shade('#6fe0c0', .3));
        return;
      }
    }
  },
  mk_pole(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(TS / 2 - 2, 2, 4, TS - 3, base);
        R(TS / 2 - 2, 2, 1.5, TS - 3, lt);
        R(2, 4, TS - 4, 2, shade(base, 1.25));               // 가로대
        R(3, 3, 2, 4, '#4a4a52'); R(TS - 5, 3, 2, 4, '#4a4a52');
        R(2, 9, TS - 4, 1, shade(base, .6));
        R(TS / 2 - 4, 9, 2, 2, '#8fd8ff');
        return;
      }
    }
  },
  mk_sorter(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._mkBody(g, ox, oy, base, R);
        R(3, 9, 16, 4, '#2a2620');
        R(4, 10, 6, 2, '#8fd8ff');                           // 통과선
        R(12, 10, 6, 2, '#e0a03c');                          // 분기선
        R(11, 5, 2, 12, shade(base, 1.5));
        return;
      }
    }
  },
  mk_turret(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(2, TS - 8, 18, 6, shade(base, .8));                // 받침대
        R(2, TS - 8, 18, 1.5, shade(base, 1.5));
        R(4, TS - 3, 3, 3, '#22222a'); R(15, TS - 3, 3, 3, '#22222a');
        g.fillStyle = shade(base, 1.7);                      // 포탑 머리
        g.beginPath(); g.arc(ox + TS / 2, oy + 11, 6.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.1);
        g.beginPath(); g.arc(ox + TS / 2 + 1, oy + 12, 4.6, 0, TAU); g.fill();
        R(TS / 2 - 2, 0, 4, 12, '#1e1e26');                  // 총열
        R(TS / 2 - 2, 0, 1.4, 12, '#8a8e99');
        R(TS / 2 - 3, 0, 6, 2.5, '#d8dce4');                 // 총구
        R(TS / 2 - 6, 9, 2.5, 2.5, '#e0563c');               // 조준등
        return;
      }
    }
  },
  mk_trap(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(0, TS - 8, TS, 8, shade(base, .55));
        R(0, TS - 8, TS, 2, lt);
        for (let x = 2; x < TS - 2; x += 5) R(x, TS - 12, 2, 5, '#c8ccd4');   // 전극
        R(3, TS - 14, 2, 3, '#9fd8ff'); R(13, TS - 15, 2, 4, '#9fd8ff');
        return;
      }
    }
  },
  /* ---------- 정글 / 버섯 골짜기 ---------- */
  mud(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        // 흙과 헷갈리지 않게 더 어둡게 깔고, 물기와 뿌리를 얹어 젖은 땅으로 읽히게 한다
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 9; i++)
          R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 8), rng.range(2, 5), rng.chance(.5) ? dk2 : base);
        for (let i = 0; i < 4; i++) {                 // 고인 물기
          const x = rng.range(1, TS - 5), y = rng.range(1, TS - 3);
          R(x, y, rng.range(3, 5), 1.4, lt2);
          R(x, y + 1.4, rng.range(2, 4), 1, lt);
        }
        for (let i = 0; i < 2; i++) {                 // 파고든 잔뿌리
          let rx = rng.range(2, TS - 2), ry = rng.range(0, 4);
          for (let k = 0; k < rng.int(4, 9); k++) { R(rx, ry, 1, 1, '#2f5a28'); rx += rng.range(-1, 1); ry += rng.range(.7, 1.6); }
        }
        this._speck(g, ox, oy, rng, 22, '#241a10', lt);
        return;
    }
  },
};
Object.assign(TILE_PAINT, TilePaintFactory);
