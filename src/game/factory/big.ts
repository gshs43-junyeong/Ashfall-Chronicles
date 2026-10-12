/* ===== factory/big.js — 여러 칸 기계 그림 — 몸체(한 번 굽는다) + 움직이는 부분(매 프레임) ===== */
/* 복잡한 기계는 1×2 · 2×1 · 2×2 칸(MACHINE.size)이고 한 칸 아틀라스 그림 대신 여기서 통째로 그린다.
   몸체는 갈래마다 한 번 캔버스에 구워 두고(_bigCache), 팔 · 램 · 흔들대 · 불 · 액체 · 충전 칸만 매 프레임 얹는다.
   좌표는 발자국 왼쪽 위가 (0,0) — 닻 칸(왼쪽 아래) 기준이 아니다. 몸체 캐시는 둘레 M 칸 여유(굴뚝 · 머리가 삐져나온다). */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { MACHINE, MRECIPES } from '../data/recipes.js';
import { TS } from '../world.js';
import { Art } from '../itemart.js';
import { Factory } from '../factory.js';

type C2 = CanvasRenderingContext2D;
const M = 12;                                                   // 몸체 캐시 여유(px)
const OUT = '#15171d', ST0 = '#2e333d', ST1 = '#4a5160', ST2 = '#6a7384', ST3 = '#9aa3b2', HI = '#c4ccd8';
const P = (c: C2, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
/** 윤곽 · 바탕 · 윗왼쪽 빛 · 아래오른쪽 그늘이 있는 판 */
function panel(c: C2, x: number, y: number, w: number, h: number, base: string, lt: string, dk: string) {
  P(c, x, y, w, h, OUT); P(c, x + 1, y + 1, w - 2, h - 2, base);
  P(c, x + 1, y + 1, w - 2, 1, lt); P(c, x + 1, y + 1, 1, h - 2, lt);
  P(c, x + 1, y + h - 2, w - 2, 1, dk); P(c, x + w - 2, y + 1, 1, h - 2, dk);
}
const rivet = (c: C2, x: number, y: number) => { P(c, x, y, 1, 1, HI); P(c, x + 1, y + 1, 1, 1, OUT); };
function hazard(c: C2, x: number, y: number, w: number, h: number) {
  P(c, x, y, w, h, '#d8b040');
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = '#22201a';
  for (let k = -h; k < w; k += 6) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); c.lineTo(x + k + h + 3, y); c.lineTo(x + k + 3, y + h); c.fill(); }
  c.restore();
}
function circ(c: C2, x: number, y: number, r: number, col: string) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function line(c: C2, x0: number, y0: number, x1: number, y1: number, col: string, w: number) {
  c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
}
function glow(c: C2, x: number, y: number, r: number, col: string, a: number) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
/** 압력 · 온도 눈금 — 바늘 v 0~1 */
function gauge(c: C2, x: number, y: number, r: number, v: number) {
  circ(c, x, y, r + 1, OUT); circ(c, x, y, r, '#d8d2c0'); P(c, x - r + 1, y, 2, 1, '#a04030');
  const a = Math.PI * (0.8 + 1.4 * clamp(v, 0, 1));
  line(c, x, y, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), '#a02a20', 1); P(c, x - 0.5, y - 0.5, 1, 1, OUT);
}

/** 기계 갈래마다 — body(굽는 몸체) · live(움직이는 부분, run = 일하는 중) */
export const BIG_ART: Record<string, { body: (c: C2, W: number, H: number) => void; live: (c: C2, m: any, t: number, run: boolean) => void }> = {
  /* 조립기 2×2 — 유리창 안에서 두 마디 팔이 부품을 집어 옮기고 용접한다 · 아래 조작판 불이 깜빡인다 */
  assembler: {
    body(c) {
      P(c, 0, 38, 44, 6, OUT); hazard(c, 1, 39, 42, 4);
      panel(c, 0, 3, 44, 36, '#4a5468', '#66728a', '#323a4a');
      P(c, 4, 7, 36, 22, OUT); P(c, 5, 8, 34, 20, '#16202a');            // 창
      P(c, 6, 9, 32, 2, '#22303c'); for (let x = 8; x < 38; x += 6) P(c, x, 11, 1, 14, '#1c2834');   // 안쪽 벽 기둥
      P(c, 5, 24, 34, 4, ST1); for (let x = 6; x < 39; x += 4) P(c, x, 25, 2, 2, ST3);   // 안쪽 작업대 롤러
      P(c, 5, 8, 34, 1, '#4a7a90');                                      // 유리 윗빛
      P(c, 21, 8, 3, 3, ST3);                                            // 팔 받침
      panel(c, 4, 30, 36, 7, '#3a4252', '#525c70', '#2a303c');           // 조작판
      P(c, 0, 18, 3, 10, OUT); P(c, 1, 19, 2, 8, '#20242c');            // 왼쪽 들이는 구멍
      P(c, 41, 18, 3, 10, OUT); P(c, 41, 19, 2, 8, '#20242c');          // 오른쪽 내보내는 구멍
      P(c, 8, 0, 28, 4, OUT); P(c, 9, 1, 26, 2, ST1); for (let x = 11; x < 34; x += 5) P(c, x, 1, 2, 2, '#2a2e36');   // 지붕 배선관
      for (const [x, y] of [[2, 5], [41, 5], [2, 35], [41, 35]]) rivet(c, x, y);
    },
    live(c, m, t, run) {
      const r = m.rec >= 0 ? MRECIPES[m.rec] : null, cyc = run ? (t * 0.55) % 1 : 0;
      /* 부품이 왼쪽에서 들어와 가운데서 붙고 오른쪽으로 나간다 — 팔은 가운데 위에서 내려와 집어 놓는다 */
      const px = run ? 6 + cyc * 30 : 20;
      if (r) Art.drawItem(c, Object.keys(r.out)[0], Math.round(px), 17, 8);
      else if (run) P(c, Math.round(px), 20, 6, 4, '#8a7a5a');
      const reach = run ? Math.sin(cyc * Math.PI) : 0.2;
      const tx = run ? px + 4 : 22, ty = 13 + reach * 6;                // 집게 끝
      const bx = 22.5, by = 10, L1 = 7, L2 = 7;
      const dx = tx - bx, dy = ty - by, d = clamp(Math.hypot(dx, dy), 1, L1 + L2 - 0.5);
      const a0 = Math.atan2(dy, dx), k = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const ex = bx + Math.cos(a0 - k) * L1, ey = by + Math.sin(a0 - k) * L1;
      line(c, bx, by, ex, ey, '#d8b46a', 2.2); line(c, ex, ey, tx, ty, '#c8a45a', 1.8);
      circ(c, ex, ey, 1.3, HI); P(c, tx - 2, ty, 1, 2, ST3); P(c, tx + 1, ty, 1, 2, ST3);
      if (run && Math.abs(cyc - 0.5) < 0.18) {                         // 용접 — 가운데에서 불꽃
        const f = (t * 40) | 0;
        glow(c, tx, ty + 3, 9, '#9fd8ff', 0.55);
        c.fillStyle = '#e8f6ff';
        for (let i = 0; i < 4; i++) { const a = (f * 1.7 + i * 1.9) % TAU; c.fillRect(tx + Math.cos(a) * (2 + i), ty + 3 + Math.sin(a) * 2 - i * 0.5, 1, 1); }
      }
      for (let i = 0; i < 6; i++) {                                     // 조작판 불
        const on = run ? ((t * 4 + i * 1.3) | 0) % 3 !== 0 : i === 0;
        P(c, 7 + i * 5, 32, 3, 2, on ? ['#5fc45f', '#e0b23c', '#5fc45f', '#8fd8ff', '#e0563c', '#5fc45f'][i] : '#2a2e36');
      }
      if (run) for (let i = 0; i < 3; i++) P(c, 0, 20 + ((t * 8 + i * 2.6) % 6) | 0, 2, 1, '#d8b46a');   // 들어가는 화살
    }
  },

  /* 가압기 2×2 — 기둥 둘과 위 들보 · 유압 실린더가 판을 천천히 내려 꽝 찍고 빠르게 올라간다 · 압력계 바늘이 튄다 */
  pressor: {
    body(c) {
      panel(c, 0, 33, 44, 11, '#3a3f4a', '#5a616e', '#252a32');          // 바닥 받침
      P(c, 2, 42, 40, 2, OUT); for (const x of [3, 39]) { rivet(c, x, 36); rivet(c, x, 40); }
      panel(c, 12, 29, 20, 5, '#5a5e66', '#8a8e99', '#3a3e46');          // 아래 틀(금형)
      panel(c, 2, 4, 7, 30, ST1, ST2, ST0); panel(c, 35, 4, 7, 30, ST1, ST2, ST0);   // 기둥
      for (let y = 8; y < 32; y += 6) { P(c, 3, y, 5, 1, ST0); P(c, 36, y, 5, 1, ST0); }
      panel(c, 0, 1, 44, 9, '#4a4f5a', '#6a7080', '#2e323a');           // 위 들보
      panel(c, 16, 0, 12, 12, '#7a3a2a', '#a05040', '#5a2a1e');         // 유압 실린더
      P(c, 18, 2, 8, 1, '#c07060');
      c.strokeStyle = '#1e1e22'; c.lineWidth = 1.5;                      // 유압 호스
      c.beginPath(); c.moveTo(16, 6); c.quadraticCurveTo(10, 8, 8, 14); c.stroke();
      c.beginPath(); c.moveTo(28, 6); c.quadraticCurveTo(34, 8, 36, 14); c.stroke();
      hazard(c, 3, 26, 5, 3); hazard(c, 36, 26, 5, 3);
    },
    live(c, m, t, run) {
      const ph = run ? (t * 0.7) % 1 : 0.95;
      /* 0~0.55 천천히 내려오고 · 0.55~0.62 눌러 멈추고 · 나머지 빠르게 올라간다 */
      const d = ph < 0.55 ? Math.pow(ph / 0.55, 1.6) : ph < 0.62 ? 1 : 1 - (ph - 0.62) / 0.38;
      const y = 11 + Math.round(d * 13), hit = run && ph >= 0.55 && ph < 0.62;
      P(c, 20, 10, 4, y - 10, '#c8ccd4'); P(c, 20, 10, 1, y - 10, '#eef0f4');   // 피스톤 막대
      panel(c, 10, y, 24, 6, '#6a6e78', '#9aa0aa', '#454850');           // 누르는 판
      const r = m.rec >= 0 ? MRECIPES[m.rec] : null;
      if (r) Art.drawItem(c, Object.keys(r.in)[0], 18, 21 + (hit ? 2 : 0), 8);
      if (hit) {
        glow(c, 22, 29, 14, '#ffd27a', 0.45);
        for (let i = 0; i < 5; i++) { const k = ((t * 30) + i * 2.3) % 6; P(c, 10 - k * 1.4, 27 - k * 0.6, 1, 1, '#a09888'); P(c, 33 + k * 1.4, 27 - k * 0.6, 1, 1, '#a09888'); }
      }
      gauge(c, 5.5, 17, 3, run ? (hit ? 0.95 : 0.25 + d * 0.5) : 0.05);
      gauge(c, 38.5, 17, 3, run ? 0.4 + Math.sin(t * 9) * 0.05 : 0.05);
    }
  },

  /* 시추 펌프 2×2 — 흔들대(머리 달린 들보)가 A 틀 위에서 끄덕이고, 왼쪽 크랭크 추가 돌며, 머리의 줄이 우물 막대를 오르내린다 */
  pump: {
    body(c) {
      panel(c, 0, 38, 44, 6, '#5a5850', '#7a786e', '#3a3a34');          // 콘크리트 받침
      c.fillStyle = OUT;                                                 // A 틀
      c.beginPath(); c.moveTo(14, 39); c.lineTo(21, 14); c.lineTo(24, 14); c.lineTo(31, 39); c.lineTo(28, 39); c.lineTo(22.5, 19); c.lineTo(17, 39); c.fill();
      c.fillStyle = '#7a6a4a';
      c.beginPath(); c.moveTo(15.5, 38); c.lineTo(21.5, 15); c.lineTo(23, 15); c.lineTo(29.5, 38); c.lineTo(28.5, 38); c.lineTo(22.3, 18); c.lineTo(16.5, 38); c.fill();
      line(c, 18, 30, 27, 30, '#5a4a32', 1.2);
      panel(c, 2, 30, 12, 9, '#4a4f5a', '#6a7080', '#2e323a');           // 감속기
      panel(c, 3, 26, 6, 5, '#3a5a3a', '#5a7a5a', '#2a3a2a');            // 전동기
      panel(c, 34, 30, 8, 9, ST1, ST2, ST0); P(c, 36, 26, 4, 5, ST2);    // 우물 머리
      circ(c, 38, 33, 2.5, '#a03a2a'); circ(c, 38, 33, 1, '#e06a5a');    // 밸브 바퀴
      P(c, 14, 40, 20, 2, '#2a2620');                                    // 송유관
    },
    live(c, m, t, run) {
      const phi = run ? t * 2.2 : 1.2, a = Math.sin(phi) * 0.26;
      const cx0 = 8, cy0 = 34, pinX = cx0 + Math.cos(phi) * 4.5, pinY = cy0 + Math.sin(phi) * 4.5;
      c.save(); c.translate(cx0, cy0); c.rotate(phi);                    // 크랭크와 추
      P(c, -1, -1, 6, 2, ST3); panel(c, 3, -3, 5, 6, '#5a5e66', '#8a8e99', '#3a3e46'); c.restore();
      const bx = 22.5, by = 14, cs = Math.cos(a), sn = Math.sin(a);
      const L = [bx - cs * 17, by - sn * 17], R = [bx + cs * 17, by + sn * 17];
      line(c, pinX, pinY, L[0], L[1] + 2, '#3a3a40', 1.6);               // 연결대
      c.save(); c.translate(bx, by); c.rotate(a);                        // 흔들대 들보 + 말머리
      P(c, -18, -2, 36, 4, OUT); P(c, -17, -1, 34, 2, '#c8a040'); P(c, -17, -1, 34, 1, '#e8c060');
      c.fillStyle = OUT; c.beginPath(); c.moveTo(16, -4); c.quadraticCurveTo(23, -2, 21, 7); c.lineTo(17, 6); c.quadraticCurveTo(18, 0, 15, -2); c.fill();
      c.fillStyle = '#b08a3a'; c.beginPath(); c.moveTo(16.5, -3); c.quadraticCurveTo(21.5, -1.5, 20, 6); c.lineTo(18, 5.5); c.quadraticCurveTo(18.5, 0, 16, -1.5); c.fill();
      c.restore();
      circ(c, bx, by, 1.6, ST3);
      const hx = R[0] + cs * 2, hy = R[1] + 7;                           // 줄 → 막대 → 우물
      line(c, hx, hy, 38, hy + 4, '#1e1e22', 1);
      P(c, 37.5, hy + 4, 1, Math.max(0, 30 - hy - 4), '#d8dce4');
      if (run && ((t * 3) | 0) % 2 === 0) for (let i = 0; i < 3; i++) P(c, 33 - ((t * 14 + i * 7) % 20), 40, 2, 1, '#1a1612');   // 기름이 관을 흐른다
    }
  },

  /* 정제기 1×2 — 증류탑의 창 셋에 원유 · 호박색 · 맑은 기름 층이 끓고, 왼쪽 굴뚝 끝에서 불꽃이 탄다 */
  refinery: {
    body(c) {
      panel(c, 0, 40, 22, 4, '#4a4a44', '#6a6a62', '#33332e');
      P(c, 1, 0, 3, 18, OUT); P(c, 2, 1, 1, 17, ST2);                  // 불꽃 굴뚝
      panel(c, 5, 4, 12, 37, '#8a8e96', '#b8bcc4', '#5a5e66');           // 탑
      c.fillStyle = OUT; c.beginPath(); c.arc(11, 5, 6, Math.PI, 0); c.fill();
      c.fillStyle = '#9a9ea6'; c.beginPath(); c.arc(11, 5, 5, Math.PI, 0); c.fill();
      for (let y = 9; y < 40; y += 6) P(c, 5, y, 12, 1, '#5a5e66');      // 단 테
      for (const y of [11, 21, 31]) { P(c, 8, y, 6, 5, OUT); P(c, 9, y + 1, 4, 3, '#1a1a1e'); }
      for (const y of [13, 23, 33]) { P(c, 17, y, 4, 2, OUT); P(c, 19, y, 2, 8, OUT); P(c, 19, y + 1, 1, 6, ST3); }   // 옆 관
      P(c, 18, 38, 3, 3, '#a03a2a');
    },
    live(c, m, t, run) {
      const cols = [['#e8d080', '#fff0b0'], ['#c88a30', '#e8b050'], ['#3a2a1a', '#5a4428']];
      [11, 21, 31].forEach((y, i) => {
        const lv = run ? 2 + Math.round(Math.sin(t * 2 + i) * 0.6) : 1;
        P(c, 9, y + 4 - lv, 4, lv, cols[i][0]);
        if (run && ((t * 6 + i * 2) | 0) % 3 === 0) P(c, 9 + ((t * 5 + i) % 3 | 0), y + 3 - lv, 1, 1, cols[i][1]);
      });
      if (run) {
        const f = 0.6 + 0.4 * Math.sin(t * 17) * Math.sin(t * 6.1);
        glow(c, 2.5, -2, 8, '#ffa040', 0.55 * f + 0.25);
        c.fillStyle = '#ffd27a'; c.beginPath(); c.moveTo(1, 0); c.quadraticCurveTo(2.5 + Math.sin(t * 13), -6 - f * 4, 4, 0); c.fill();
        c.fillStyle = '#fff0c0'; c.fillRect(2, -2, 1, 2);
        for (const y of [13, 23, 33]) P(c, 19, y + 1 + ((t * 10) % 6 | 0), 1, 1, '#e8c060');   // 관을 따라 흘러내린다
      }
    }
  },

  /* 자동 용광로 1×2 — 벽돌 화로 · 굴뚝 · 아궁이 불이 일렁이고, 녹으면 오른쪽 주둥이에서 쇳물이 틀로 흐른다 */
  smelter: {
    body(c) {
      P(c, 0, 17, 22, 27, OUT); P(c, 1, 18, 20, 25, '#8a5a3a');
      c.save(); c.beginPath(); c.rect(1, 18, 20, 25); c.clip();          // 벽돌 — 칸 밖으로 삐져나오지 않게
      for (let y = 18; y < 43; y += 4) for (let x = -2 + ((y / 4) % 2) * 3; x < 21; x += 6) { P(c, x, y, 5, 3, '#9a6a44'); P(c, x, y, 5, 1, '#b07e54'); }
      c.restore();
      P(c, 5, 0, 12, 18, OUT); P(c, 6, 1, 10, 17, '#7a4e32');            // 굴뚝
      c.save(); c.beginPath(); c.rect(6, 1, 10, 17); c.clip();
      for (let y = 1; y < 17; y += 4) for (let x = 4 + ((y / 4) % 2) * 2; x < 16; x += 5) P(c, x, y, 4, 3, '#8a5a3a');
      c.restore();
      P(c, 4, 0, 14, 3, OUT); P(c, 5, 1, 12, 1, ST2);                    // 굴뚝 테
      P(c, 4, 30, 12, 12, OUT); c.fillStyle = OUT; c.beginPath(); c.arc(10, 30, 6, Math.PI, 0); c.fill();   // 아궁이
      P(c, 5, 31, 10, 10, '#1a0e08'); c.fillStyle = '#1a0e08'; c.beginPath(); c.arc(10, 31, 5, Math.PI, 0); c.fill();
      P(c, 16, 26, 6, 2, OUT); P(c, 17, 26, 4, 1, ST2);                  // 쇳물 주둥이
      P(c, 15, 40, 7, 4, OUT); P(c, 16, 41, 5, 2, '#3a3a40');            // 틀
    },
    live(c, m, t, run) {
      const lit = run || m.fuel > 0, f = 0.55 + 0.45 * Math.sin(t * 13) * Math.sin(t * 7.3);
      if (lit) {
        glow(c, 10, 37, 14, '#ff9a3a', 0.35 + f * 0.3);
        c.fillStyle = f > 0.6 ? '#ffe08a' : '#ff9a3a';
        for (let i = 0; i < 4; i++) { const h = 3 + ((Math.sin(t * 11 + i * 2) + 1) * 2.5); c.fillRect(6 + i * 2.4, 41 - h, 2, h); }
        P(c, 7, 39, 6, 2, '#ffd27a');
      }
      if (run) {
        P(c, 19, 28, 1, 12, '#ffb040'); P(c, 19, 28 + ((t * 20) % 12 | 0), 1, 2, '#fff0b0');   // 쇳물 줄기
        P(c, 16, 41, 5, 2, '#ff8a2a'); glow(c, 19, 41, 6, '#ff8a2a', 0.5);
        for (let i = 0; i < 3; i++) {                                     // 굴뚝 연기
          const q = (t * 0.5 + i / 3) % 1;
          c.globalAlpha = (1 - q) * 0.4; circ(c, 11 + Math.sin(q * 6 + i) * 3, -2 - q * 18, 2.5 + q * 4, '#5a5a60'); c.globalAlpha = 1;
        }
      }
    }
  },

  /* 강화 축전지 1×2 — 칸 여덟이 잔량만큼 켜지고, 충전 중이면 위 단자 사이로 번개가 튄다 */
  battery_hi: {
    body(c) {
      panel(c, 0, 40, 22, 4, ST1, ST2, ST0);
      panel(c, 2, 5, 18, 36, '#2e3a3a', '#4a5a5a', '#1e2626');
      for (let y = 8; y < 38; y += 3) { P(c, 0, y, 2, 1, ST2); P(c, 20, y, 2, 1, ST2); }   // 식힘 날개
      P(c, 5, 9, 12, 30, OUT);
      for (let i = 0; i < 8; i++) P(c, 6, 10 + i * 3.6, 10, 2.6, '#1a2422');
      P(c, 4, 1, 4, 5, OUT); P(c, 5, 1, 2, 2, '#c04030');                // 단자
      P(c, 14, 1, 4, 5, OUT); P(c, 15, 1, 2, 2, '#30303a');
    },
    live(c, m, t, run) {
      const s = MACHINE[m.t], e = clamp((m.e || 0) / (s.store || 1), 0, 1), n = Math.round(e * 8);
      for (let i = 0; i < n; i++) {
        const y = 10 + (7 - i) * 3.6;
        P(c, 6, y, 10, 2.6, i >= 6 ? '#9ff0d0' : '#4ac8a0');
        if (i === n - 1 && run) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8); P(c, 6, y, 10, 2.6, '#e8fff4'); c.globalAlpha = 1; }
      }
      if (run && ((t * 9) | 0) % 3 !== 0) {                              // 단자 사이 번개
        c.strokeStyle = '#bff0ff'; c.lineWidth = 1; c.beginPath(); c.moveTo(7, 2);
        for (let x = 8; x < 15; x += 2) c.lineTo(x, 1 - ((x * 7 + ((t * 30) | 0)) % 3));
        c.lineTo(15, 2); c.stroke(); glow(c, 11, 1, 6, '#8fd8ff', 0.4);
      }
    }
  },

  /* 염수 증류기 2×1 — 왼쪽 솥이 불 위에서 끓고, 김이 오른쪽 냉각 관을 지나 물방울로 떨어져 소금판에 고인다 */
  desal: {
    body(c) {
      P(c, 0, 4, 22, 13, OUT); c.fillStyle = OUT; c.beginPath(); c.arc(5, 10.5, 6.5, 0, TAU); c.arc(17, 10.5, 6.5, 0, TAU); c.fill();
      P(c, 5, 5, 12, 11, '#6a8a9a'); circ(c, 5, 10.5, 5.5, '#6a8a9a'); circ(c, 17, 10.5, 5.5, '#6a8a9a');
      P(c, 3, 6, 16, 1, '#9ab8c8'); for (const x of [6, 11, 16]) P(c, x, 5, 1, 11, '#4a6a7a');
      P(c, 8, 9, 6, 4, OUT); P(c, 9, 10, 4, 2, '#1a2a34');               // 솥 들여다보는 창
      P(c, 2, 17, 18, 5, OUT); P(c, 3, 18, 16, 3, '#2a1a12');            // 아궁이
      P(c, 18, 1, 8, 3, OUT); P(c, 19, 2, 6, 1, ST3);                    // 김 관
      c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(25, 3);
      for (let i = 0; i < 4; i++) { c.lineTo(41, 3 + i * 3); c.lineTo(41, 4.5 + i * 3); c.lineTo(25, 4.5 + i * 3); }
      c.stroke(); c.strokeStyle = '#b87a4a'; c.lineWidth = 1.2; c.stroke();   // 구리 냉각 관
      P(c, 24, 16, 19, 6, OUT); P(c, 25, 17, 17, 4, '#4a4a50'); P(c, 26, 19, 15, 2, '#e8e4dc');   // 소금판
    },
    live(c, m, t, run) {
      if (!run) return;
      const f = 0.55 + 0.45 * Math.sin(t * 12) * Math.sin(t * 6.7);
      glow(c, 11, 20, 10, '#ff9a3a', 0.3 + f * 0.3);
      for (let i = 0; i < 4; i++) P(c, 4 + i * 4, 21 - ((Math.sin(t * 10 + i) + 1) * 1.5), 2, 2, f > 0.5 ? '#ffd27a' : '#ff8a2a');
      P(c, 9 + ((t * 7) % 4 | 0), 11 - ((t * 9) % 2 | 0), 1, 1, '#c8f0ff');   // 솥 안 거품
      for (let i = 0; i < 2; i++) { const q = (t * 0.8 + i / 2) % 1; c.globalAlpha = (1 - q) * 0.5; circ(c, 21 + q * 3, 0 - q * 8, 1.5 + q * 3, '#dce8ee'); c.globalAlpha = 1; }
      for (let i = 0; i < 3; i++) { const q = (t * 1.4 + i / 3) % 1; P(c, 29 + i * 5, 14 + q * 4, 1, 1.5, '#9fd8ff'); }   // 떨어지는 물방울
    }
  },

  /* 심층 드릴 1×2 — 철탑 안에서 윗구동기가 눌러 내리며 드릴대가 돈다(줄무늬가 흐른다) · 청록 가압판 불 */
  drill_x: {
    body(c) {
      panel(c, 0, 38, 22, 6, '#2e4a4a', '#4a6a6a', '#1e3232');
      c.strokeStyle = OUT; c.lineWidth = 2;                              // 철탑
      c.beginPath(); c.moveTo(2, 39); c.lineTo(8, 4); c.moveTo(20, 39); c.lineTo(14, 4); c.stroke();
      c.strokeStyle = '#5a7a7a'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(2.5, 38); c.lineTo(8.3, 5); c.moveTo(19.5, 38); c.lineTo(13.7, 5);
      for (let y = 10; y < 38; y += 7) { const k = (y - 4) / 35, xl = 8 - k * 6, xr = 14 + k * 6, k2 = (y + 7 - 4) / 35; c.moveTo(xl, y); c.lineTo(14 + k2 * 6, y + 7); c.moveTo(xr, y); c.lineTo(8 - k2 * 6, y + 7); }
      c.stroke();
      P(c, 6, 0, 10, 3, OUT); P(c, 7, 1, 8, 1, '#6a8a8a');               // 꼭대기 도르래 틀
      P(c, 9, 34, 4, 5, OUT); P(c, 10, 35, 2, 4, '#3a3e46');             // 우물 입구
    },
    live(c, m, t, run) {
      const bob = run ? Math.round(Math.sin(t * 3) * 1.5 + 1.5) : 0, y0 = 6 + bob;
      P(c, 10, y0 + 6, 2, 34 - y0 - 6, '#8a8e96');                       // 드릴대
      if (run) for (let y = y0 + 6 + ((t * 24) % 4); y < 34; y += 4) P(c, 10, y, 2, 1, '#c8ccd4');
      panel(c, 5, y0, 12, 7, '#2e5a5a', '#4a8a8a', '#1e3a3a');           // 윗구동기
      P(c, 7, y0 + 2, 2, 2, run ? '#7fe8e0' : '#2a4a4a'); P(c, 13, y0 + 2, 2, 2, run ? '#7fe8e0' : '#2a4a4a');
      if (run) glow(c, 11, y0 + 3, 7, '#6fe0d8', 0.3 + 0.2 * Math.sin(t * 7));
    }
  }
};

export const FactoryBigPart: Bag = {
  _bigCache: null as Bag | null,
  /** 여러 칸 기계인가 */
  isBig(m: any) { return (m.w || 1) * (m.h || 1) > 1 && !!BIG_ART[m.t]; },
  /** 몸체 캐시 — 갈래마다 한 번 */
  bigBody(key: string, W: number, H: number) {
    const cache = this._bigCache || (this._bigCache = {});
    if (cache[key]) return cache[key];
    const cv = document.createElement('canvas');
    cv.width = W * TS + M * 2; cv.height = H * TS + M * 2;
    const g = cv.getContext('2d')!; g.imageSmoothingEnabled = false; g.translate(M, M);
    BIG_ART[key].body(g, W, H);
    return (cache[key] = cv);
  },
  /** 그린다 — (ax, ay) 는 닻 칸(왼쪽 아래)의 화면 자리. run 이 없으면 기계 상태로 정한다(미리보기는 false) */
  drawBig(c: C2, m: any, ax: number, ay: number, time: number, run?: boolean) {
    const W = m.w || 1, H = m.h || 1, X = Math.round(ax), Y = Math.round(ay - (H - 1) * TS);
    const on = run === undefined ? !!(m.on && m.act && !m.broke) : run;
    c.drawImage(this.bigBody(m.t, W, H), X - M, Y - M);
    c.save(); c.translate(X, Y);
    BIG_ART[m.t].live(c, m, time + m.x * 0.37, on);
    c.restore();
    return [X, Y, W * TS, H * TS];
  }
};
mixin(Factory, FactoryBigPart);
