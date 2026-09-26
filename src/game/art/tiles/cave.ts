/* ===== art/tiles/cave.js — 동굴 — 이끼 · 종유 · 수정 · 금 간 자갈 · 운석 · 석회암·화강암 · 균사 ===== */
import { shade } from '../../../engine/core/color.js';
import { TAU, clamp } from '../../../engine/core/math.js';
import { TS } from '../../world.js';
import { TILE_PAINT } from '../../tileart.js';
/* tileart.js TileArt.paint 의 갈래들 — 읽히는 순간 TILE_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 TileArt. */

export const TilePaintCave: Bag = {
  mossrock(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {            // 이끼 낀 바위 — 돌결 위에 이끼가 얼룩지고 윗면이 두툼하다
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        this._speck(g, ox, oy, rng, 14, dk2, lt2);
        const m1 = s.g, m2 = shade(m1, 1.3), m3 = shade(m1, .7);
        for (let i = 0; i < 9; i++) {                           // 얼룩진 이끼
          const x = rng.range(0, TS - 4), y = rng.range(3, TS - 3);
          R(x, y, rng.range(2, 5), rng.range(1, 3), rng.chance(.6) ? m1 : m3);
        }
        let h = 4;
        for (let x = 0; x < TS; x++) {                          // 윗면 이끼
          h = clamp(h + rng.range(-1, 1), 2, 6);
          R(x, 0, 1, h, m1); R(x, 0, 1, 1, m2); R(x, h - 1, 1, 1, m3);
        }
        return;
      }
    }
  },
  hangmoss(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {            // 늘어진 이끼 — 가닥마다 길이가 다르고 끝이 가늘다
        R(0, 0, TS, 2, shade(base, .7));
        for (let x = 0; x < TS; x += 2) {
          const len = rng.int(6, TS - 1);
          R(x, 1, 2, len * .55, base);
          R(x + (rng.chance(.5) ? 0 : 1), 1 + len * .55, 1, len * .45, shade(base, .8));
          if (rng.chance(.4)) R(x, 2, 1, 2, lt2);
        }
        return;
      }
    }
  },
  dripstone(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {           // 종유석(위에 붙어 아래로) · 석순(바닥에서 위로) — 층이 진 원뿔
        const up = !!s.up;
        for (let y = 0; y < TS; y++) {
          const t = up ? (TS - y) / TS : (y + 1) / TS;           // 0(붙은 쪽) → 1(끝)
          const w = Math.max(1.2, (TS - 4) * (1 - t * 0.86));
          const col = (y % 5 === 0) ? dk : (y % 5 === 2 ? lt : base);
          R(TS / 2 - w / 2, y, w, 1, col);
          R(TS / 2 - w / 2, y, Math.max(1, w * .25), 1, lt2);    // 한쪽에 비치는 빛
        }
        if (!up) R(TS / 2 - .5, TS - 2, 1, 2, '#9fd0e8');        // 끝에 맺힌 물방울
        return;
      }
    }
  },
  geode(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {               // 수정 무리 — 바닥에서 여러 갈래로 솟은 결정
        const cols = [base, lt, lt2, shade(base, .8)];
        for (const [bx, h, w, lean] of [[6, 14, 5, -1.5], [12, 19, 6, 0.5], [17, 11, 4, 2]]) {
          g.fillStyle = cols[rng.int(0, 3)];
          g.beginPath();
          g.moveTo(ox + bx - w / 2, oy + TS); g.lineTo(ox + bx + w / 2, oy + TS);
          g.lineTo(ox + bx + w / 2 + lean, oy + TS - h + 3); g.lineTo(ox + bx + lean, oy + TS - h);
          g.lineTo(ox + bx - w / 2 + lean, oy + TS - h + 3); g.closePath(); g.fill();
          R(bx + lean - .5, TS - h + 2, 1, h - 4, '#ffffff');    // 결정 모서리의 빛
        }
        g.globalAlpha = .22; g.fillStyle = lt2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 8, 10, 0, TAU); g.fill();
        g.globalAlpha = 1;
        return;
      }
    }
  },
  fault(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {               // 금 간 자갈 — 돌 바탕에 알갱이 결이 옅게, 가는 금 하나
        /* ★ 바탕을 돌과 같은 밝기(base)로 깐다. */
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 9; i++) {
          const x = rng.range(1, TS - 5), y = rng.range(1, TS - 5), r = rng.range(1.4, 2.4);
          g.fillStyle = rng.chance(.5) ? shade(base, 1.1) : shade(base, .9);
          g.beginPath(); g.arc(ox + x + r, oy + y + r, r, 0, TAU); g.fill();
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        /* 금은 네 변형 중 하나에만, 짧게 — 칸마다 같은 자리에 금을 그었더니 자갈 덩어리가 격자 무늬로 드러났다(변형이 넷뿐이라 금 자리가 되풀이된다). */
        if (v === 1) {
          let x = rng.range(4, TS - 6), y = rng.range(2, 8);
          for (let k = 0; k < 8; k++) { R(x, y, 1, 1, dk2); x = clamp(x + rng.range(-1.2, 1.4), 1, TS - 2); y += 1.2; }
        }
        return;
      }
    }
  },
  meteorite(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {           // 운석 — 오목 자국 · 쇠 알갱이 · 식다 만 금
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 4; i++) {               // 오목 자국 — 위 가장자리는 그늘, 아래 가장자리는 빛
          const x = rng.range(3, TS - 4), y = rng.range(3, TS - 4), r = rng.range(2.2, 3.6);
          g.fillStyle = dk2; g.beginPath(); g.arc(ox + x, oy + y, r, 0, TAU); g.fill();
          g.fillStyle = dk; g.beginPath(); g.arc(ox + x + .6, oy + y + .8, r * .75, 0, TAU); g.fill();
          g.fillStyle = lt; g.beginPath(); g.arc(ox + x, oy + y, r, .3, 2.6); g.lineTo(ox + x, oy + y); g.fill();
        }
        for (let i = 0; i < 9; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), rng.chance(.4) ? 2 : 1, 1, rng.chance(.5) ? '#c8ccd4' : '#8a8e98');
        if (v === 1 || v === 3) {                   // 붉은 금 — 넷 중 둘에만, 짧게(칸마다 그으면 줄무늬가 된다)
          let x = rng.range(4, TS - 6), y = rng.range(3, 9);
          for (let k = 0; k < 6; k++) {
            R(x, y, 1, 1, '#ff7a3a'); if (k % 3 === 0) R(x + 1, y, 1, 1, '#ffb070');
            x = clamp(x + rng.range(-1.3, 1.3), 1, TS - 2); y += 1.4;
          }
        }
        this._speck(g, ox, oy, rng, 10, dk2, lt2);
        return;
      }
    }
  },
  starcrystal(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {         // 별빛 수정 — 가늘고 곧은 결정 다발, 끝에 별빛이 맺힌다
        g.globalAlpha = .2; g.fillStyle = lt2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 6, 9, 0, TAU); g.fill();
        g.globalAlpha = 1;
        const sets = [[[5, 11, 3, -2], [11, 20, 4, 0], [16, 14, 3, 2.5]],
          [[7, 17, 4, -1], [14, 12, 3, 1.5], [18, 8, 2.5, 3]],
          [[4, 9, 3, -2.5], [9, 15, 3.5, -.5], [15, 19, 4, 1]],
          [[6, 13, 3.5, -1.5], [12, 17, 3, .5], [17, 11, 3, 2]]][v & 3];
        for (const [bx, h, w, lean] of sets) {
          const tipX = ox + bx + lean, tipY = oy + TS - h;
          g.fillStyle = shade(base, .82);
          g.beginPath(); g.moveTo(ox + bx - w / 2, oy + TS); g.lineTo(ox + bx + w / 2, oy + TS);
          g.lineTo(tipX + w / 2, tipY + 3); g.lineTo(tipX, tipY); g.lineTo(tipX - w / 2, tipY + 3); g.closePath(); g.fill();
          g.fillStyle = lt2;                        // 빛 받는 쪽 면
          g.beginPath(); g.moveTo(ox + bx - w / 2, oy + TS); g.lineTo(ox + bx, oy + TS);
          g.lineTo(tipX, tipY); g.lineTo(tipX - w / 2, tipY + 3); g.closePath(); g.fill();
          R(bx + lean - .5, TS - h + 2, 1, h - 4, '#ffffff');
          R(bx + lean - 1.5, TS - h - .5, 3, 1, '#fffbe8');   // 끝의 별빛(십자)
          R(bx + lean - .5, TS - h - 1.5, 1, 3, '#fffbe8');
        }
        R(0, TS - 2, TS, 2, '#2e2a2e');             // 뿌리 — 녹아 굳은 바닥에 박힌 자리
        return;
      }
    }
  },
  fused(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {               // 녹아 굳은 돌 — 검은 유리 바탕, 흘러 굳은 결과 공기 방울, 윤
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 4; i++) {
          let x = rng.range(0, TS - 4), y = rng.range(1, TS - 2);
          for (let k = 0; k < 10; k++) { R(x, y, 2, 1, rng.chance(.5) ? dk : shade(base, 1.12)); x += 1.8; y += rng.range(-.6, .6); }
        }
        for (let i = 0; i < 5; i++) {
          const x = rng.range(2, TS - 3), y = rng.range(2, TS - 3);
          R(x, y, 2, 2, dk2); R(x, y, 1, 1, lt2);
        }
        R(rng.range(2, 8), rng.range(2, 6), rng.range(5, 9), 1, '#6a6070');   // 유리 윤
        R(rng.range(10, 16), rng.range(12, 18), rng.range(3, 6), 1, '#5a5060');
        if (v === 1) R(rng.range(3, TS - 5), rng.range(3, TS - 5), 2, 1, '#c85a2a');   // 아직 붉은 한 점
        return;
      }
    }
  },
  granite(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {             // 화강암 — 바탕 위에 밝은 알갱이·검은 알갱이가 굵게 박힌다
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 8), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 22; i++) R(rng.range(0, TS - 2), rng.range(0, TS - 2), 2, 2, rng.chance(.5) ? '#d8c8c0' : '#2a2224');
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        return;
      }
    }
  },
  hyphae(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {              // 균사 발 — 천장에서 내린 실이 아래로 갈수록 성글다
        R(0, 0, TS, 2, shade(base, .62));                       // 붙어 있는 자리
        for (let x = 1; x < TS; x += 3) {
          const len = 6 + ((x * 7) % 11);
          R(x, 2, 1, len, base);
          R(x, 2, 1, Math.min(3, len), lt2);                    // 위쪽이 굵고 밝다
          if (len > 12) R(x, 2 + len, 1, 1, lt2);               // 끝에 맺힌 것
        }
        for (const [bx, by] of [[4, 7], [13, 10], [8, 14]]) R(bx, by, 2, 2, lt2);   // 실에 걸린 포자
        return;
      }
    }
  },
};
Object.assign(TILE_PAINT, TilePaintCave);
