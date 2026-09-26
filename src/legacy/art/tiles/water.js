/* ===== art/tiles/water.js — 고사리·난초 · 바다(해초·조개·기뢰·공기) · 야자 · 방 공기 · 연못가(수련·샘·부들·물풀·조약돌) · 포자돌 ===== */
import { shade } from '../../../engine/core/color.js';
import { TAU } from '../../../engine/core/math.js';
import { T } from '../../data.js';
import { TS } from '../../world.js';
import { ART, TILE_PAINT } from '../../tileart.js';
/* tileart.js TileArt.paint 의 갈래들 — 읽히는 순간 TILE_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 TileArt. */

export const TilePaintWater = {
  fern(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 잎 여러 장이 바닥에서 부챗살처럼 퍼진다
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.42 + rng.range(-.1, .1);
          const len = rng.range(8, 14), bx = TS / 2 + rng.range(-3, 3);
          const col = i % 2 ? base : shade(base, 1.22);
          for (let k = 0; k < len; k++) {
            const px = bx + Math.cos(a) * k, py = TS - 1 + Math.sin(a) * k;
            R(px, py, 1.6, 1.6, col);
            if (k % 3 === 1) {                        // 잔잎
              R(px - 2, py, 2, 1, shade(col, .8));
              R(px + 1.6, py, 2, 1, shade(col, .8));
            }
          }
        }
        return;
      }
    }
  },
  orchid(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        const stem = '#3f7a34';
        R(TS / 2 - 1, TS - 10, 2, 10, stem);
        R(TS / 2 - 4, TS - 6, 3, 1.4, stem); R(TS / 2 + 2, TS - 8, 3, 1.4, stem);
        const cx = TS / 2, cy = TS - 13;
        for (let k = 0; k < 5; k++) {                 // 꽃잎 다섯 장
          const a = k * TAU / 5 - Math.PI / 2;
          g.fillStyle = k % 2 ? base : lt;
          g.beginPath();
          g.ellipse(ox + cx + Math.cos(a) * 3.4, oy + cy + Math.sin(a) * 3.4, 2.6, 1.9, a, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffe08a';
        g.beginPath(); g.arc(ox + cx, oy + cy, 1.7, 0, TAU); g.fill();
        /* 판 둘레에 초록 물빛(반지름 7 원)을 옅게 깔던 것을 뺐다 — 물 위에 초록 얼룩이 칸마다 떠서 수면이 수련 칸에서만 탁해 보였다. */
        return;
      }
    }
  },
  kelpplant(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 해초 — 물속이므로 **물을 먼저 깔고** 그 위에 잎을 세운다(수련·공기 주머니와 같은 방식). */
        // 물은 game.js 가 밑에 깐다(UNDER_LIQ) — 수련과 같은 까닭
        const sway = rng.range(-2.5, 2.5);
        for (let k = 0; k < 3; k++) {
          const bx = 5 + k * 6 + rng.range(-1, 1);
          const h = TS - rng.range(3, 9);
          g.strokeStyle = k === 1 ? lt : base;
          g.lineWidth = 2.2; g.lineCap = 'round';
          g.beginPath();
          g.moveTo(ox + bx, oy + TS);
          g.quadraticCurveTo(ox + bx + sway, oy + TS - h * 0.55, ox + bx + sway * 1.8, oy + TS - h);
          g.stroke();
        }
        g.lineWidth = 1; g.lineCap = 'butt';
        return;
      }
    }
  },
  seashell(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 조개 — 모래 위에 놓인 부채꼴. */
        const cx = ox + TS / 2 + rng.range(-4, 4), by = oy + TS - 1;
        const r = rng.range(4.5, 6.5);
        g.fillStyle = '#2b2419';                                   // 어두운 테두리 — 모래와 붙지 않게
        g.beginPath(); g.moveTo(cx - r - 1, by); g.arc(cx, by, r + 1, Math.PI, 0); g.closePath(); g.fill();
        g.fillStyle = base;
        g.beginPath(); g.moveTo(cx - r, by); g.arc(cx, by, r, Math.PI, 0); g.closePath(); g.fill();
        g.strokeStyle = shade(base, .62); g.lineWidth = .8;         // 부챗살
        for (let k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(cx, by);
          g.lineTo(cx + k * r * 0.42, by - r * 0.92); g.stroke();
        }
        g.fillStyle = shade(base, 1.3);                            // 윗면 반짝임
        g.fillRect(cx - r * 0.45, by - r * 0.75, r * 0.9, 1.2);
        return;
      }
    }
  },
  tripmine(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 바닥에 박힌 원반 — 밟기 전에는 조용하다.
        R(0, TS - 8, TS, 8, shade(base, .7));
        R(2, TS - 9, TS - 4, 3, base);
        R(TS / 2 - 4, TS - 11, 8, 3, shade(base, 1.3));
        R(TS / 2 - 1, TS - 12, 2, 2, '#e0563c');
        for (let k = 0; k < 3; k++) R(3 + k * 6, TS - 4, 2, 2, shade(base, .5));
        return;
      }
    }
  },
  airpocket(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 물속에 갇힌 공기 — 사연: docs/code-history.md#h86 */
        this.paint(g, ox, oy, ART[T.WATER], rng);
        /* 덧칠은 **아주 얇게**. 0.10만 얹어도 평균 색이 물보다 27만큼 밝아져 물 한가운데 흰 자국처럼 보였다(실측). */
        R(0, 0, TS, TS, 'rgba(200,232,255,.045)');
        R(0, 0, TS, 2, 'rgba(216,242,255,.09)');             // 위쪽에 눌린 공기층
        for (let k = 0; k < 4; k++) {                        // 잔거품
          const bx = rng.int(2, TS - 4), by = rng.int(3, TS - 4);
          R(bx, by, 2, 2, 'rgba(226,244,255,.20)');
        }
        return;
      }
    }
  },
  palmwood(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 야자 줄기 — 잿빛 숲 나무(trunk)와 달리 **가늘고 마디가 굵다.** */
        const w = 9, x0 = Math.round((TS - w) / 2);
        R(x0, 0, w, TS, base);
        R(x0, 0, 2, TS, lt); R(x0 + w - 2, 0, 2, TS, dk);
        for (let y = rng.range(0, 3); y < TS; y += rng.int(4, 6))   // 마디
          R(x0, y, w, 1.5, dk2);
        return;
      }
    }
  },
  palmleaf(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 야자 잎갓 — 여러 칸이 가로로 이어져 하나의 갓이 된다 — 사연: docs/code-history.md#h87 */
        const lt2 = shade(base, 1.32), dk3 = shade(base, .58);
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 5; i++) {                       // 잎맥 — 위에서 아래로 처진다
          const x0 = rng.range(0, TS), sag = rng.range(3, 7);
          g.strokeStyle = i % 2 ? dk3 : lt2; g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(ox + x0, oy + rng.range(0, 4));
          g.quadraticCurveTo(ox + x0 + rng.range(-5, 5), oy + TS / 2, ox + x0 + rng.range(-7, 7), oy + TS - 1 - rng.range(0, sag));
          g.stroke();
        }
        this._speck(g, ox, oy, rng, 16, dk3, lt2);
        /* 아래·위 가장자리를 톱니처럼 **지운다.** — 사연: docs/code-history.md#h88 */
        for (let x = 0; x < TS; x += 2) {
          if (rng.chance(.55)) g.clearRect(ox + x, oy + TS - rng.int(2, 4), 2, 4);
          if (rng.chance(.35)) g.clearRect(ox + x, oy, 2, rng.int(1, 3));
        }
        g.clearRect(ox, oy, 2, 2); g.clearRect(ox + TS - 2, oy, 2, 2);   // 위 모서리
        return;
      }
    }
  },
  coconut(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 열매 셋이 줄기 아래 매달린다.
        for (const [dx, dy, r] of [[-3.5, 1, 3.4], [3.5, 0, 3.4], [0, 4, 3]]) {
          const cx = TS / 2 + dx, cy = TS / 2 + dy;
          g.fillStyle = base; g.beginPath(); g.arc(ox + cx, oy + cy, r, 0, TAU); g.fill();
          g.fillStyle = shade(base, 1.35);
          g.beginPath(); g.arc(ox + cx - r * .3, oy + cy - r * .3, r * .32, 0, TAU); g.fill();
          g.fillStyle = shade(base, .58); R(cx - 1, cy - r, 2, 1.5, shade(base, .58));
        }
        return;
      }
    }
  },
  roomair(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 방 안의 공기. */
        if (rng.chance(.35)) R(rng.int(3, TS - 4), rng.int(3, TS - 4), 1, 1, 'rgba(255,226,170,.13)');
        return;
      }
    }
  },
  lily(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 수면에 뜬 얇은 초록 판. */
        const cx = TS / 2, cy = 3.5;                   // 판의 중심선 (타일 위쪽)
        const rx = TS / 2 - 0.5, ry = 3;
        /* 판 밑은 물이다 — 이 칸도 물칸(liquid)이다. */
        g.fillStyle = base;
        g.beginPath(); g.ellipse(ox + cx, oy + cy, rx, ry, 0, 0, TAU); g.fill();
        // V자 노치 — 오른쪽을 물빛으로 도려내 연잎 특유의 갈라진 실루엣을 만든다
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.moveTo(ox + cx + rx + 1, oy + cy);
        g.lineTo(ox + cx + rx - 4.5, oy + cy - 2.6);
        g.lineTo(ox + cx + rx - 4.5, oy + cy + 2.6);
        g.closePath(); g.fill();
        g.restore();
        g.fillStyle = lt;                              // 윗면 하이라이트 (판이 물에 뜬 느낌)
        g.beginPath(); g.ellipse(ox + cx - 1, oy + cy - 1, rx - 3, 1, 0, 0, TAU); g.fill();
        g.fillStyle = dk;                              // 아랫면 그림자
        g.beginPath(); g.ellipse(ox + cx, oy + cy + 1.8, rx - 2, 0.9, 0, 0, TAU); g.fill();
        g.strokeStyle = dk; g.lineWidth = .7;          // 잎맥 — 가운데에서 부챗살로
        for (let k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(ox + cx, oy + cy);
          g.lineTo(ox + cx + k * 3.6, oy + cy + (k % 2 ? 2 : -2));
          g.stroke();
        }
        const fx = ox + cx - 5, fy = oy + cy - 3.2;    // 작은 연꽃 — 판 위에 얹는다
        g.fillStyle = '#f7d6ea';
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .4;
          g.beginPath();
          g.ellipse(fx + Math.cos(a) * 1.5, fy + Math.sin(a) * 1.1, 1.3, .9, a, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffe08a';
        g.beginPath(); g.arc(fx, fy, .9, 0, TAU); g.fill();
        return;
      }
    }
  },
  spring(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 샘 바위 — 돌 바탕에 젖어 검게 번진 틈 하나와 거기서 새는 물방울. */
        this.paint(g, ox, oy, ART[T.STONE], rng);
        g.globalAlpha = .45; R(0, 0, TS, TS, '#2a4a5a'); g.globalAlpha = 1;
        const cx0 = rng.range(7, TS - 8);
        for (let y = 0; y < TS; y += 2) R(cx0 + Math.sin(y * .7) * 2, y, 2, 2, '#1a2a32');   // 틈
        R(cx0 - 1, TS - 4, 5, 4, '#3f7fa8');                                                 // 고인 물기
        g.globalAlpha = .7;
        for (let k = 0; k < 4; k++) R(rng.range(2, TS - 3), rng.range(4, TS - 2), 1, rng.range(2, 4), '#8fd0f0');
        g.globalAlpha = 1;
        R(cx0, TS - 2, 2, 2, '#bfe8ff');
        return;
      }
    }
  },
  cattail(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 부들 — 가는 줄기 서너 대에 갈색 이삭. */
        for (let k = 0; k < 4; k++) {
          const bx = 4 + k * 4.5 + rng.range(-1, 1), h = rng.range(12, TS - 1), lean = rng.range(-1.5, 1.5);
          g.strokeStyle = k % 2 ? lt : base; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(ox + bx, oy + TS); g.quadraticCurveTo(ox + bx, oy + TS - h / 2, ox + bx + lean, oy + TS - h); g.stroke();
          if (k % 2 === 0) {                                  // 이삭
            g.fillStyle = '#6a4424';
            g.beginPath(); g.ellipse(ox + bx + lean, oy + TS - h + 3, 1.4, 3, 0, 0, TAU); g.fill();
          } else {                                            // 잎 — 이삭 없이 뾰족하게
            g.strokeStyle = dk; g.beginPath(); g.moveTo(ox + bx, oy + TS - 3);
            g.lineTo(ox + bx + lean * 3, oy + TS - h * .7); g.stroke();
          }
        }
        return;
      }
    }
  },
  pondweed(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 물풀 — 물속 바닥에서 올라온 가는 잎. */
        const sway = rng.range(-2, 2);
        for (let k = 0; k < 5; k++) {
          const bx = 3 + k * 4 + rng.range(-1, 1), h = rng.range(7, 15);
          g.strokeStyle = k % 2 ? lt : base; g.lineWidth = 1;
          g.beginPath(); g.moveTo(ox + bx, oy + TS);
          g.quadraticCurveTo(ox + bx + sway, oy + TS - h / 2, ox + bx + sway * 1.6, oy + TS - h); g.stroke();
          g.fillStyle = k % 2 ? base : lt;
          for (let j = 1; j < 3; j++) g.fillRect(ox + bx + sway * j * .5, oy + TS - h * j / 3, 2, 1);
        }
        return;
      }
    }
  },
  pebbles(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        /* 물가 조약돌 — 바닥에 둥글게 닳은 돌 몇 개. */
        for (let k = 0; k < 5; k++) {
          const px = rng.range(3, TS - 4), rx = rng.range(1.8, 3.4), ry = rx * rng.range(.55, .75);
          const c = [base, lt, dk, '#b8b0a4', '#7f8a8c'][k];
          g.fillStyle = c;
          g.beginPath(); g.ellipse(ox + px, oy + TS - ry, rx, ry, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(ox + px - rx * .4, oy + TS - ry * 1.6, 1.5, 1);
        }
        return;
      }
    }
  },
  sporestone(H) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++)
          R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 6; i++) {                 // 바위에 박힌 포자 알갱이
          const x = rng.range(1, TS - 3), y = rng.range(1, TS - 3);
          R(x, y, 2, 2, '#4a8a78');
          R(x, y, 1, 1, '#7fd0b8');
        }
        this._speck(g, ox, oy, rng, 16, dk2, lt2);
        return;
    }
  },
};
Object.assign(TILE_PAINT, TilePaintWater);
