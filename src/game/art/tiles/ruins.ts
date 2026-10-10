/* ===== art/tiles/ruins.js — 화덕 · 유적 함정(다트·화염구·무너짐·분사·스위치) · 광재 · 얼음 깃발 · 유적 장식 ===== */
import { shade } from '../../../engine/core/color.js';
import { TAU } from '../../../engine/core/math.js';
import { TS } from '../../world.js';
import { TILE_PAINT } from '../../tileart.js';
/* tileart.js TileArt.paint 의 갈래들 — 읽히는 순간 TILE_PAINT 에 붙는다. H 는 paint 의 인자·도우미 묶음, this 는 TileArt. */

export const TilePaintRuins: Bag = {
  mk_oven(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(1, TS - 5, TS - 2, 5, shade(base, .6));   // 받침
        g.fillStyle = base;                          // 돔
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 9.5, Math.PI, 2 * Math.PI); g.fill();
        g.fillStyle = lt;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 9.5, Math.PI, Math.PI * 1.45); g.fill();
        for (let k = 0; k < 4; k++) R(2 + k * 5, TS - 12 + Math.abs(k - 1.5) * 1.6, 4, 1.2, dk2);
        g.fillStyle = '#1e1a16';                     // 아궁이
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 5, Math.PI, 2 * Math.PI); g.fill();
        g.fillStyle = '#e8842a';
        g.beginPath(); g.arc(ox + TS / 2, oy + TS - 5, 3.4, Math.PI, 2 * Math.PI); g.fill();
        R(TS / 2 - 1.6, TS - 8, 3.2, 3, '#ffcf6a');
        R(TS - 6, 0, 4, 6, shade(base, .7));         // 굴뚝
        return;
      }
    }
  },
  darthole(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 벽에 뚫린 구멍 셋.
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 7), rng.range(2, 5), rng.chance(.5) ? lt : dk);
        const side = s.d > 0 ? TS - 7 : 2;
        for (let k = 0; k < 3; k++) {
          R(side, 4 + k * 6, 5, 3.4, '#14120e');
          R(side + (s.d > 0 ? 3.6 : 0), 4 + k * 6, 1.4, 3.4, '#2a2620');
        }
        R(s.d > 0 ? TS - 2 : 0, 0, 2, TS, dk2);
        this._speck(g, ox, oy, rng, 12, dk2, lt);
        return;
      }
    }
  },
  flamevent(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, dk);
        for (let i = 0; i < 5; i++) R(rng.range(0, TS - 4), rng.range(3, TS - 3), rng.range(3, 6), rng.range(2, 4), rng.chance(.5) ? base : dk2);
        R(3, 0, TS - 6, 4, '#1a1410');                 // 분출구
        for (let k = 0; k < 3; k++) R(4 + k * 5, 0, 3, 3, '#e8842a');
        R(3, 3, TS - 6, 1.4, shade(base, 1.4));
        this._speck(g, ox, oy, rng, 10, '#2a1a10', '#c86a2a');
        return;
      }
    }
  },
  crumble(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 이미 금이 가 있어서 "밟으면 안 되겠다"가 보이게
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 6; i++) R(rng.range(-1, TS - 3), rng.range(-1, TS - 3), rng.range(3, 7), rng.range(2, 4), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 4; i++) {                   // 갈라진 금
          let x = rng.range(2, TS - 2), y = rng.range(-1, 3);
          for (let k = 0; k < rng.int(7, 14); k++) { R(x, y, 1, 1, '#1e1a14'); x += rng.range(-1.3, 1.3); y += rng.range(.8, 1.7); }
        }
        R(0, 0, TS, 1.4, lt2);
        R(0, TS - 2, TS, 2, dk2);
        return;
      }
    }
  },
  slag(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        this._fill(g, ox, oy, base);
        for (let i = 0; i < 7; i++) R(rng.range(-2, TS - 3), rng.range(-2, TS - 3), rng.range(4, 9), rng.range(3, 6), rng.chance(.5) ? lt : dk);
        for (let i = 0; i < 3; i++) {                   // 흘러내린 자국
          let x = rng.range(2, TS - 3);
          for (let y = 0; y < TS; y++) { R(x, y, rng.chance(.3) ? 2 : 1, 1, dk2); x += rng.range(-.5, .5); }
        }
        for (let i = 0; i < 3; i++) R(rng.range(1, TS - 3), rng.range(1, TS - 3), 2, 2, '#c8763a');
        this._speck(g, ox, oy, rng, 14, dk2, '#8a6a4a');
        return;
      }
    }
  },
  mk_dart(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 벽에 박힌 발사구 — 구멍 셋이 정면을 본다
        this._mkBody(g, ox, oy, base, R);
        R(2, 5, 18, 12, shade(base, .5));
        for (let k = 0; k < 3; k++) { R(4, 7 + k * 4, 14, 2, '#14120e'); R(15, 7 + k * 4, 3, 2, '#3a3630'); }
        R(1, 3, 20, 2, shade(base, 1.35));
        R(1, TS - 5, 20, 2, shade(base, .45));
        return;
      }
    }
  },
  mk_jet(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        // 노즐 — 안쪽에서 빛이 새어 나온다
        this._mkBody(g, ox, oy, base, R);
        g.fillStyle = '#1a1610';
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 6.5, 0, TAU); g.fill();
        g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 4.2, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.6);
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 2.2, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) {                 // 조임쇠
          const a = k * TAU / 4 + .4;
          R(TS / 2 + Math.cos(a) * 8 - 1.5, TS / 2 + Math.sin(a) * 8 - 1.5, 3, 3, shade(base, .5));
        }
        return;
      }
    }
  },
  mk_switch(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {
        R(3, 4, TS - 6, TS - 8, shade('#3a3a44', 1));
        R(3, 4, TS - 6, 2, '#5a5a66');
        g.fillStyle = base;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2, 5.5, 0, TAU); g.fill();
        g.fillStyle = shade(base, 1.5);
        g.beginPath(); g.arc(ox + TS / 2 - 1, oy + TS / 2 - 1, 2.4, 0, TAU); g.fill();
        return;
      }
    }
  },
  /* ---------- 유적 고유 장식 열 ---------- */
  banner_ice(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {          // 언 깃발 — 위에서 내려와 아래가 찢어져 있다
        R(4, 0, TS - 8, 2, shade(base, .6));                    // 걸린 가로대
        R(5, 2, TS - 10, TS - 10, base);
        R(5, 2, 2, TS - 10, lt);                                // 왼쪽에 든 빛
        R(TS - 7, 2, 2, TS - 10, dk);
        for (let i = 0; i < 3; i++) R(7 + i * 3, 5 + (i & 1), 1, 7, lt2);   // 언 결
        /* 지워서 끊는 게 아니라 **덜 그려서** 끊는다 — 투명색으로 fillRect 하면 아무 일도 안 일어난다(source-over). */
        for (let x = 5; x < TS - 5; x += 2)
          if ((x >> 1) & 1) R(x, TS - 8, 2, 2, x < TS / 2 ? lt : dk);
        R(6, TS - 6, 1, 2, lt2); R(TS - 9, TS - 7, 1, 2, lt2);  // 고드름 두 방울
        return;
      }
    }
  },
  glyph(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {               // 벽에 돋은 글자 — 서리(찬빛) / 새김(따뜻한 그늘)
        const warm = s.warm;
        this._fill(g, ox, oy, dk);
        this._speck(g, ox, oy, rng, 16, dk2, base);
        R(2, 2, TS - 4, TS - 4, warm ? shade(base, .86) : dk);  // 파 놓은 판
        const ink = warm ? dk2 : lt2;
        // 세 줄짜리 글자 — 줄마다 다른 획이라 무늬가 아니라 글로 읽힌다
        R(4, 4, 5, 2, ink); R(4, 4, 2, 6, ink); R(11, 4, 2, 6, ink); R(14, 5, 4, 2, ink);
        R(4, 10, 2, 5, ink); R(8, 10, 6, 2, ink); R(13, 12, 2, 4, ink);
        R(6, 16, 8, 2, ink); R(16, 10, 2, 6, ink);
        if (!warm) { R(5, 5, 1, 1, '#ffffff'); R(12, 11, 1, 1, '#ffffff'); }  // 서리는 반짝인다
        return;
      }
    }
  },
  canopic(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {             // 장기 단지 — 어깨가 벌어지고 뚜껑이 얹힌 항아리
        R(8, 1, 6, 2, shade(base, .74));                        // 뚜껑
        R(9, 3, 4, 2, base);
        R(6, 5, TS - 12, 3, base);                              // 벌어진 어깨
        R(5, 8, TS - 10, TS - 10, base);                        // 몸통
        R(5, 8, 2, TS - 10, lt);
        R(TS - 7, 8, 2, TS - 10, dk);
        R(7, 12, TS - 14, 2, dk2);                              // 두른 띠
        R(9, 15, 1, 3, dk2); R(12, 15, 1, 3, dk2);              // 봉인 자국
        return;
      }
    }
  },
  minelamp(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {            // 매단 갱등 — 고리에 걸려 흔들리다 멈춘 것
        R(TS / 2 - 1, 0, 2, 4, '#4a4038');                      // 매단 줄
        R(7, 4, TS - 14, 2, '#6a5c4a');                         // 손잡이
        R(6, 6, TS - 12, 2, '#5a5048');                         // 갓
        R(7, 8, TS - 14, 7, base);                              // 유리
        R(8, 9, TS - 16, 5, lt2);                               // 안의 불
        R(9, 10, 2, 3, '#fff6e0');                              // 심지
        R(6, 15, TS - 12, 2, '#5a5048');                        // 받침
        return;
      }
    }
  },
  toolpile(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {            // 버린 연장 — 곡괭이 자루와 삽날이 겹쳐 있다
        R(3, TS - 4, TS - 6, 3, shade(base, .58));              // 흙에 반쯤 묻혔다
        R(4, TS - 9, 12, 2, base);                              // 자루 하나
        R(3, TS - 11, 4, 3, shade('#8a8478', 1));               // 그 끝의 쇠
        R(9, TS - 14, 2, 6, shade(base, 1.1));                  // 세워 둔 자루
        R(7, TS - 16, 6, 2, shade('#8a8478', .9));              // 삽날
        R(13, TS - 7, 6, 2, dk);                                // 부러진 것
        R(16, TS - 10, 2, 3, shade('#8a8478', .8));
        return;
      }
    }
  },
  sac(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {                 // 알주머니 — 천장에서 늘어져 아래가 무겁다
        R(TS / 2 - 1, 0, 2, 3, shade(base, .6));                // 매달린 목
        R(7, 3, TS - 14, 4, shade(base, .86));
        R(5, 6, TS - 10, 9, base);                              // 불룩한 몸
        R(6, 15, TS - 12, 3, shade(base, .8));                  // 아래로 처진 끝
        R(6, 7, 2, 7, lt);
        // 안에서 비쳐 보이는 알 셋
        R(8, 8, 3, 3, lt2); R(12, 10, 3, 3, lt2); R(9, 13, 3, 2, lt2);
        R(9, 9, 1, 1, '#ffd0f0'); R(13, 11, 1, 1, '#ffd0f0');
        return;
      }
    }
  },
  boneheap(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {            // 삭은 뼈 — 바닥에 흩어져 겹쳐 있다
        R(2, TS - 5, TS - 4, 4, shade(base, .5));               // 아래 깔린 것
        for (const [bx, by, bw] of [[3, TS - 8, 9], [11, TS - 10, 7], [6, TS - 12, 6]]) {
          R(bx, by, bw, 2, base);                               // 긴 뼈
          R(bx - 1, by - 1, 2, 4, lt); R(bx + bw - 1, by - 1, 2, 4, lt);   // 양 끝 관절
        }
        R(14, TS - 7, 5, 5, base);                              // 굴러 나온 두개골
        R(15, TS - 5, 2, 2, dk2); R(18, TS - 5, 1, 2, dk2);      // 눈구멍
        return;
      }
    }
  },
  sporevent(H: TilePaintKit) {
    const { g, ox, oy, s, rng, v, seed, R, base, dk, dk2, lt, lt2 } = H;
    { {           // 포자 구멍 — 벽에 뚫린 구멍에서 뿜어 나온다
        this._fill(g, ox, oy, dk);
        this._speck(g, ox, oy, rng, 18, dk2, base);
        g.fillStyle = '#1a1f1c';                                // 구멍은 깊고 어둡다
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2 + 1, 6, 0, TAU); g.fill();
        g.strokeStyle = base; g.lineWidth = 2;
        g.beginPath(); g.arc(ox + TS / 2, oy + TS / 2 + 1, 5.5, 0, TAU); g.stroke();
        for (let i = 0; i < 5; i++) {   // 구멍 테두리에 돋은 갓
          const a = i * TAU / 5 + 0.4;
          R(TS / 2 + Math.cos(a) * 6.5 - 1, TS / 2 + 1 + Math.sin(a) * 6.5 - 1, 3, 2, lt2);
        }
        R(TS / 2 - 2, TS / 2 - 4, 2, 2, lt2); R(TS / 2 + 2, TS / 2 - 6, 1, 1, lt2);   // 새어 나온 가루
        return;
      }
    }
  },
  /* --- 유적마다 제 벽돌 · 장식(석판 유적 셋 · 가라앉은 유적) --- */
  vaultslate(H: TilePaintKit) {
    const { g, ox, oy, rng, R, base, dk, dk2, lt, lt2 } = H;
    this._fill(g, ox, oy, shade(base, .55));                     // 석실 판석 — 세워 박은 긴 판 둘, 서리가 핏줄처럼 번진다
    for (const [x, w] of [[0, 11], [11, 11]]) {
      R(x + 1, 0, w - 2, TS, rng.chance(.5) ? base : shade(base, 1.08));
      R(x + 1, 0, 1, TS, lt); R(x + w - 2, 0, 1, TS, dk2);
      if (rng.chance(.55)) R(x + 2, rng.int(4, TS - 6), w - 4, 1, dk);   // 판의 결
    }
    const fr = '#cfe8f5';
    let fx = rng.int(3, TS - 4), fy = 0;
    g.globalAlpha = .8;
    while (fy < TS) { R(fx, fy, 1, 2, fr); fy += 2; fx += rng.int(-1, 1); if (rng.chance(.2)) R(fx + 1, fy, 2, 1, fr); }
    g.globalAlpha = 1;
    R(0, 0, TS, 1.5, '#e8f4ff');                                 // 윗줄에 앉은 서리
    this._speck(g, ox, oy, rng, 8, dk2, lt2);
  },
  rimeurn(H: TilePaintKit) {
    const { g, ox, oy, R, base, dk, dk2, lt2 } = H;              // 서리 단지 — 낮은 항아리, 뚜껑에 서리가 소복하다
    g.fillStyle = shade(base, .62); g.beginPath(); g.ellipse(ox + TS / 2, oy + TS - 8, 8, 7, 0, 0, TAU); g.fill();
    g.fillStyle = base; g.beginPath(); g.ellipse(ox + TS / 2 - 1, oy + TS - 9, 6.5, 5.5, 0, 0, TAU); g.fill();
    R(5, TS - 2, TS - 10, 2, dk2);                               // 받침
    R(7, 4, TS - 14, 4, shade(base, .78));                       // 목
    R(5, 3, TS - 10, 2, '#f0f8ff'); R(6, 2, TS - 12, 1, '#ffffff');   // 서리 뚜껑
    for (const x of [6, 10, 14]) R(x, 8, 1, 2, '#e0f0ff');       // 흘러내린 서리
    R(8, TS - 11, 5, 1, lt2); R(9, TS - 7, 2, 3, dk);            // 새긴 무늬
  },
  mazestone(H: TilePaintKit) {
    const { g, ox, oy, rng, R, base, dk2, lt, lt2 } = H;
    this._fill(g, ox, oy, base);                                 // 미로 돌 — 청동을 박아 넣은 굽은 길(칸 경계에서 이어진다)
    R(0, 0, TS, 1, lt); R(0, TS - 1, TS, 1, dk2);
    const br = '#c8a04a', bd = '#6a5428';
    const path = [[0, 5, 6, 1], [5, 5, 1, 7], [5, 11, 11, 1], [15, 5, 1, 7], [15, 5, 7, 1], [0, 16, 22, 1], [10, 11, 1, 6]];
    for (const [x, y, w, h] of path) { R(x, y + 1, w, h, bd); R(x, y, w, h, br); }
    this._speck(g, ox, oy, rng, 10, dk2, lt2);
  },
  cogwall(H: TilePaintKit) {
    const { g, ox, oy, s, R, base } = H;
    this._fill(g, ox, oy, shade('#857a68', .9));                 // 청동 톱니 — 벽에 반쯤 묻힌 바퀴
    const cx = ox + TS / 2, cy = oy + TS / 2;
    g.fillStyle = shade(base, .5); g.beginPath();
    for (let q = 0; q < 20; q++) { const a = q / 20 * TAU, r = q % 2 ? 7.5 : 10; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.fillStyle = base; g.beginPath();
    for (let q = 0; q < 20; q++) { const a = q / 20 * TAU + 0.08, r = q % 2 ? 6.5 : 9; g.lineTo(cx - .5 + Math.cos(a) * r, cy - .5 + Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.fillStyle = shade(base, 1.35); g.beginPath(); g.arc(cx - 2, cy - 2, 3.5, Math.PI, 1.5 * Math.PI); g.lineTo(cx - 2, cy - 2); g.fill();
    g.fillStyle = shade(base, .35); g.beginPath(); g.arc(cx, cy, 2.5, 0, TAU); g.fill();
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + .4; R(TS / 2 + Math.cos(a) * 5 - .5, TS / 2 + Math.sin(a) * 5 - .5, 1.5, 1.5, shade(base, .4)); }
  },
  hollowbrick(H: TilePaintKit) {
    const { g, ox, oy, rng, R, base, dk2, lt } = H;
    this._fill(g, ox, oy, '#120e18');                            // 공허 벽돌 — 검은 벽돌 사이 줄눈이 보랏빛으로 비친다
    const bh = TS / 3, bw = TS / 2;
    for (let row = 0; row < 3; row++) {
      const y = row * bh, off = row % 2 ? -bw / 2 : 0;
      for (let bx = off; bx < TS; bx += bw) {
        R(bx + 1, y + 1, bw - 2, bh - 2, rng.chance(.5) ? base : shade(base, 1.15));
        R(bx + 1, y + 1, bw - 2, 1, lt);
      }
    }
    g.globalAlpha = .55;
    for (let row = 1; row < 3; row++) R(0, row * bh - .5, TS, 1, '#9a6ad8');
    g.globalAlpha = .3; R(0, 0, TS, 1, '#c8a0ff');
    g.globalAlpha = 1;
    if (rng.chance(.35)) { const x = rng.int(3, TS - 5); R(x, rng.int(2, TS - 6), 1, 4, '#b88fff'); }   // 갈라진 틈의 빛
    this._speck(g, ox, oy, rng, 6, dk2, shade(base, 1.4));
  },
  voidcage(H: TilePaintKit) {
    const { g, ox, oy, R, base } = H;                            // 공허 등롱 — 매단 쇠 우리 속에 떠 있는 보랏빛 구슬
    R(TS / 2 - .5, 0, 1, 4, '#3a3240');
    R(6, 4, TS - 12, 1.5, '#4a4050'); R(6, TS - 5, TS - 12, 1.5, '#4a4050');
    for (const x of [6, 10, TS - 11, TS - 7]) R(x, 4, 1, TS - 8, '#4a4050');
    const gr = g.createRadialGradient(ox + TS / 2, oy + TS / 2, 1, ox + TS / 2, oy + TS / 2, 6);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, '#d8b8ff'); gr.addColorStop(1, 'rgba(120,70,200,0)');
    g.fillStyle = gr; g.fillRect(ox + 4, oy + 5, TS - 8, TS - 10);
    R(TS / 2 - 1, TS / 2 - 1, 2, 2, '#ffffff');
    R(5, TS - 4, TS - 10, 1, shade(base, .6));
  },
  coralbrick(H: TilePaintKit) {
    const { g, ox, oy, rng, R, base, dk, dk2, lt } = H;
    this._fill(g, ox, oy, shade(base, .6));                      // 산호 벽돌 — 바다가 덮어 버린 벽돌, 산호 혹과 따개비
    const bh = TS / 2, bw = TS / 2;
    for (let row = 0; row < 2; row++) {
      const y = row * bh, off = row ? -bw / 2 : 0;
      for (let bx = off; bx < TS; bx += bw) { R(bx + 1, y + 1, bw - 2, bh - 2, rng.chance(.5) ? base : shade(base, 1.1)); R(bx + 1, y + 1, bw - 2, 1, lt); }
    }
    const corals = ['#e88a8a', '#d86a9a', '#f0b878', '#7fd0b8'];
    for (let k = 0, n = rng.int(1, 3); k < n; k++) {             // 산호 혹
      const cx = rng.int(3, TS - 4), cy = rng.int(3, TS - 4), c = corals[rng.int(0, 3)];
      g.fillStyle = shade(c, .7); g.beginPath(); g.arc(ox + cx, oy + cy + .5, 2.6, 0, TAU); g.fill();
      g.fillStyle = c; g.beginPath(); g.arc(ox + cx, oy + cy, 2.2, 0, TAU); g.fill();
      R(cx - 1, cy - 1, 1, 1, '#ffffff');
    }
    for (let k = 0; k < 4; k++) { const x = rng.int(1, TS - 3), y = rng.int(1, TS - 3); R(x, y, 2, 2, '#c8c0b0'); R(x + .5, y + .5, 1, 1, dk); }   // 따개비
    g.globalAlpha = .18; R(0, TS - 6, TS, 6, '#2a6a6a'); g.globalAlpha = 1;   // 아래에 앉은 물때
    R(0, TS - 1, TS, 1, dk2);
  },
  giantclam(H: TilePaintKit) {
    const { g, ox, oy, R, base, dk2 } = H;                       // 큰 조개 — 반쯤 벌어진 껍데기 안에 진주가 비친다
    const cx = ox + TS / 2, by = oy + TS - 3;
    g.fillStyle = shade(base, .7); g.beginPath(); g.ellipse(cx, by - 2, 10, 4.5, 0, 0, Math.PI); g.fill();
    g.fillStyle = base; g.beginPath(); g.moveTo(cx - 10, by - 3);
    g.quadraticCurveTo(cx - 9, by - 13, cx, by - 13); g.quadraticCurveTo(cx + 9, by - 13, cx + 10, by - 3); g.closePath(); g.fill();
    g.strokeStyle = shade(base, .72); g.lineWidth = 1;
    for (const dx of [-6, -2, 2, 6]) { g.beginPath(); g.moveTo(cx + dx * .5, by - 12); g.lineTo(cx + dx * 1.4, by - 3); g.stroke(); }
    R(TS / 2 - 7, TS - 6, 14, 2, '#3a2a30');                     // 벌어진 틈
    g.fillStyle = '#eef4ff'; g.beginPath(); g.arc(cx, by - 4, 2, 0, TAU); g.fill();
    R(1, TS - 1, TS - 2, 1, dk2);
  },
};
Object.assign(TILE_PAINT, TilePaintRuins);
