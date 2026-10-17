/* ===== game/fish-duel-art.js — 낚시 겨루기의 그림 갈래 — osu! 원 대신 별 구슬 · 낚싯줄 물길 · 물고기 공 · 릴 스피너 · 미끼 커서 ===== */
/* engine/rhythm 의 DuelArt 를 채운다. 판정 · 박자 · 크기는 엔진 그대로, 모양만 Ashfall 낚시로 —
   구슬 = 밤하늘 유리 가운데 별(기믹마다 색 — STAR_COL) · 노란 테 · 번호는 테 아래 금 표 */
import { TAU } from '../../engine/core/math.js';
import { FONT } from '../lang.js';
import type { DuelArt } from '../../engine/rhythm/duel.js';

type C2 = CanvasRenderingContext2D;
const lift = (hex: string, k: number) => {                              // 밝게(k>1) · 어둡게(k<1)
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
/** 물고기 실루엣 — (0,0) 가운데, 오른쪽을 본다 */
function fish(c: C2, L: number, col: string, flap: number) {
  c.fillStyle = col;
  c.beginPath(); c.ellipse(0, 0, L * 0.5, L * 0.22, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-L * 0.42, 0); c.lineTo(-L * 0.75, -L * 0.22 + flap); c.lineTo(-L * 0.75, L * 0.22 + flap); c.closePath(); c.fill();
}
/** 다섯 갈래 별 — R 바깥 · r 안쪽 반지름 */
function star(c: C2, x: number, y: number, R: number, r: number, rot: number, col: string) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, d = i % 2 ? r : R; if (i) c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
  c.closePath(); c.fill();
}
/** 물결 고리 — 둘레가 잔잔히 일렁인다 */
function ripple(c: C2, x: number, y: number, R: number, t: number, lobes: number, amp: number) {
  c.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = i / 48 * TAU, rr = R + Math.sin(a * lobes + t * 5) * amp;
    if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.stroke();
}

/** 기믹마다 별 색 [테두리 · 몸 · 속빛 · 번짐] — 치는 법이 다르면 별 색이 다르다(사용자 요청). 테는 늘 금빛 그대로 */
const STAR_COL: Record<string, string[]> = {
  c: ['#7a4e0c', '#ffd84a', '#fffbe6', '255,214,100'],   // 단타 — 금
  s: ['#0c3a5a', '#6fd0ff', '#eafaff', '120,210,255'],   // 슬라이더 — 물길을 따라 끈다
  r: ['#3a1a6a', '#c39bff', '#f6eeff', '190,150,255'],   // 되돌아오는 슬라이더 — 갔다 온다
  q: ['#6a1a14', '#ff8a6a', '#fff0ea', '255,140,110']    // 연타 — 반 박 안쪽으로 몰아친다
};
export const FISH_DUEL_ART: DuelArt = {
  circle(c, x, y, col, n, r, t, kind) {
    const S = STAR_COL[kind || 'c'] || STAR_COL.c;
    /* ★ 별 구슬 — 가운데 별 · 노란 테(사용자 요청 2026-10-15). 구슬 속 빛깔만 등급색을 따르고 별 · 테는 늘 같은 금빛이라
       등급이 바뀌어도 "치는 것"이 한눈에 같다 */
    const gl = c.createRadialGradient(x, y, r * 0.55, x, y, r * 1.4);         // 금빛 번짐
    gl.addColorStop(0, `rgba(${S[3]},.45)`); gl.addColorStop(1, `rgba(${S[3]},0)`);
    c.fillStyle = gl; c.beginPath(); c.arc(x, y, r * 1.4, 0, TAU); c.fill();
    // 짙은 유리 — 가운데 등급색이 옅게 비치고 가장자리는 기본 창의 짙은 갈색
    const g = c.createRadialGradient(x, y - r * 0.1, r * 0.05, x, y, r * 0.86);
    g.addColorStop(0, lift(col, 1.25)); g.addColorStop(0.35, lift(col, 0.62)); g.addColorStop(1, '#0e0d0a');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 0.86, 0, TAU); c.fill();
    // 도는 별가루
    c.fillStyle = 'rgba(255,240,200,.8)';
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39 + t * (0.5 + (i % 3) * 0.2) + n, d = r * (0.38 + (i * 37 % 10) / 26);
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
      c.globalAlpha = 0.35 + tw * 0.55; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.025 + tw * 0.02), 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    // 노란 테 — 바깥 짙은 금 · 굵은 금 · 안쪽 빛줄, 위 왼쪽이 밝다
    c.strokeStyle = '#7a4e0c'; c.lineWidth = r * 0.2; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.stroke();
    const rg = c.createLinearGradient(x - r, y - r, x + r, y + r);
    rg.addColorStop(0, '#fff2a8'); rg.addColorStop(0.45, '#ffcf3a'); rg.addColorStop(1, '#d48a12');
    c.strokeStyle = rg; c.lineWidth = r * 0.13; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,250,220,.85)'; c.lineWidth = r * 0.035;
    c.beginPath(); c.arc(x, y, r * 0.93, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
    // 가운데 별 — 다섯 갈래 + 가는 빛살 넷, 숨 쉬듯 반짝이며 천천히 돈다
    const pulse = 1 + Math.sin(t * 5 + n) * 0.06, rot = -Math.PI / 2 + Math.sin(t * 0.8 + n) * 0.12;
    const sg = c.createRadialGradient(x, y, 0, x, y, r * 0.62);
    sg.addColorStop(0, 'rgba(255,248,230,.95)'); sg.addColorStop(1, `rgba(${S[3]},0)`);
    c.fillStyle = sg; c.beginPath(); c.arc(x, y, r * 0.62, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,246,200,.7)'; c.lineWidth = r * 0.03;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4 + rot, L = r * 0.62 * pulse;
      c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.16, y + Math.sin(a) * r * 0.16); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke();
    }
    star(c, x, y, r * 0.46 * pulse, r * 0.2 * pulse, rot, S[0]);
    star(c, x, y, r * 0.4 * pulse, r * 0.17 * pulse, rot, S[1]);
    star(c, x - r * 0.03, y - r * 0.04, r * 0.2 * pulse, r * 0.09 * pulse, rot, S[2]);
    // 번호 — 테 아래 작은 금 표
    const by = y + r * 0.9, bw = r * 0.3;
    c.fillStyle = '#2a1a06'; c.beginPath(); c.ellipse(x, by, bw, r * 0.2, 0, 0, TAU); c.fill();
    c.strokeStyle = '#ffcf3a'; c.lineWidth = Math.max(1.2, r * 0.04); c.stroke();
    c.fillStyle = '#ffe58a'; c.font = `700 ${Math.round(r * 0.27)}px ${FONT || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), x, by + r * 0.02);
  },
  end(c, x, y, r, col, arrow, t) {
    // 물길 끝 — 옅은 금 테 + 작은 별. 되돌아오는 끝이면 테를 도는 화살 둘
    c.strokeStyle = 'rgba(122,78,12,.9)'; c.lineWidth = r * 0.16; c.beginPath(); c.arc(x, y, r * 0.84, 0, TAU); c.stroke();
    c.strokeStyle = '#ffcf3a'; c.lineWidth = r * 0.09; c.beginPath(); c.arc(x, y, r * 0.84, 0, TAU); c.stroke();
    if (!arrow) { c.globalAlpha *= 0.7; star(c, x, y, r * 0.3, r * 0.13, -Math.PI / 2, STAR_COL.s[1]); c.globalAlpha /= 0.7; return; }
    c.strokeStyle = STAR_COL.r[2]; c.lineWidth = r * 0.1; c.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const a0 = t * -3 + i * Math.PI, a1 = a0 - 2.1, R = r * 0.45;
      c.beginPath(); c.arc(x, y, R, a1, a0); c.stroke();
      const hx = x + Math.cos(a1) * R, hy = y + Math.sin(a1) * R, d = a1 - Math.PI / 2;   // 화살촉 — 도는 쪽(시계 반대)
      c.fillStyle = STAR_COL.r[2]; c.beginPath();
      c.moveTo(hx + Math.cos(d) * r * 0.2, hy + Math.sin(d) * r * 0.2);
      c.lineTo(hx + Math.cos(a1) * r * 0.14, hy + Math.sin(a1) * r * 0.14); c.lineTo(hx - Math.cos(a1) * r * 0.14, hy - Math.sin(a1) * r * 0.14);
      c.closePath(); c.fill();
    }
  },
  approach(c, x, y, r, k, col, t) {
    // 다가오는 금빛 물결 둘 — 바깥은 옅고 일렁인다, 안쪽이 노란 테에 닿는 때가 칠 때
    c.strokeStyle = '#ffd24a'; c.lineWidth = 2.6;
    ripple(c, x, y, r * k, t, 6, Math.min(1.6, (k - 1) * 0.8));
    c.globalAlpha *= 0.45; c.lineWidth = 1.6;
    ripple(c, x, y, r * (1 + (k - 1) * 1.25), t + 0.4, 5, 1.2);
  },
  sliderBody(c, p, r, col, t) {
    const path = () => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    path(); c.strokeStyle = 'rgba(59,53,39,.95)'; c.lineWidth = r * 1.9; c.stroke();       // 둑 — 기본 창 테 색
    path(); c.strokeStyle = 'rgba(14,13,10,.9)'; c.lineWidth = r * 1.66; c.stroke();
    const a0 = c.globalAlpha;
    path(); c.strokeStyle = col; c.globalAlpha = a0 * 0.35; c.lineWidth = r * 1.1; c.stroke();
    c.globalAlpha = a0 * 0.5; c.strokeStyle = lift(col, 1.5); c.lineWidth = 2;               // 흐르는 물살
    c.setLineDash([6, 14]); c.lineDashOffset = -t * 60; path(); c.stroke(); c.setLineDash([]);
    c.globalAlpha = a0 * 0.9; c.strokeStyle = '#e8e3d4'; c.lineWidth = 1.2; path(); c.stroke();  // 낚싯줄
    c.globalAlpha = a0;
  },
  ball(c, x, y, r, col, ang, track, t) {
    if (track) {                                                         // 바늘에 걸렸다 — 도는 점선 고리
      c.save(); c.strokeStyle = 'rgba(232,227,212,.85)'; c.lineWidth = 2.4; c.setLineDash([8, 7]); c.lineDashOffset = -t * 40;
      c.beginPath(); c.arc(x, y, r * 2.2, 0, TAU); c.stroke(); c.restore();
    }
    c.save(); c.translate(x, y); c.rotate(ang);
    const gl = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); gl.addColorStop(0, lift(col, 1.2)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha *= 0.5; c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.2, 0, TAU); c.fill(); c.globalAlpha /= 0.5;
    const flap = Math.sin(t * 16) * r * 0.12;
    fish(c, r * 1.7, '#e8e3d4', flap);
    fish(c, r * 1.5, col, flap);
    c.fillStyle = lift(col, 0.55); c.beginPath(); c.ellipse(-r * 0.05, -r * 0.12, r * 0.55, r * 0.12, 0, 0, TAU); c.fill();   // 등
    c.fillStyle = '#081018'; c.beginPath(); c.arc(r * 0.45, -r * 0.06, r * 0.09, 0, TAU); c.fill();   // 눈
    c.restore();
  },
  spinner(c, cx, cy, R, spun, k, left, need, col, t) {
    // 릴 — 감긴 줄이 두꺼워지고, 손잡이가 돈 만큼 돈다
    c.fillStyle = 'rgba(14,13,10,.82)'; c.beginPath(); c.arc(cx, cy, R + 8, 0, TAU); c.fill();
    c.strokeStyle = '#3b3527'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    c.strokeStyle = '#c8a060'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R - 3, 0, TAU); c.stroke();
    for (let i = 0; i < 6; i++) {                                        // 테 볼트
      const a = i / 6 * TAU; c.fillStyle = '#e8d090'; c.beginPath(); c.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3, 0, TAU); c.fill();
    }
    const sp = 30 + k * 70;                                              // 감긴 줄 뭉치
    c.fillStyle = k >= 1 ? '#9aae5a' : col; c.globalAlpha *= 0.85; c.beginPath(); c.arc(cx, cy, sp, 0, TAU); c.fill(); c.globalAlpha /= 0.85;
    c.strokeStyle = 'rgba(232,227,212,.35)'; c.lineWidth = 1;
    for (let rr = 26; rr < sp; rr += 6) { c.beginPath(); c.arc(cx, cy, rr, spun, spun + 4.5); c.stroke(); }
    c.strokeStyle = 'rgba(232,227,212,.6)'; c.lineWidth = 3;             // 남은 시간 — 안쪽에서 줄어드는 물결
    ripple(c, cx, cy, Math.max(10, (R - 14) * left), t, 9, 2);
    c.save(); c.translate(cx, cy); c.rotate(spun);                       // 손잡이
    c.fillStyle = '#5a4428'; c.fillRect(-4, -R * 0.8, 8, R * 0.8);
    c.fillStyle = '#e8c070'; c.beginPath(); c.arc(0, -R * 0.8, 11, 0, TAU); c.fill();
    c.fillStyle = '#5a4428'; c.beginPath(); c.arc(0, -R * 0.8, 4, 0, TAU); c.fill();
    c.restore();
    c.fillStyle = '#2a1a0a'; c.beginPath(); c.arc(cx, cy, 20, 0, TAU); c.fill();
    c.fillStyle = '#ffe8a0'; c.font = `700 22px ${FONT || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(need), cx, cy + 1);
  },
  cursor(c, x, y, t) {
    // 미끼 바늘 — 금빛 갈고리와 빛
    const g = c.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, 'rgba(255,240,190,.9)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fill();
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * 3) * 0.15);
    c.strokeStyle = '#2a1a0a'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -11); c.lineTo(0, 4); c.arc(-4, 4, 4, 0, Math.PI * 0.95); c.stroke();
    c.strokeStyle = '#ffd27a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -11); c.lineTo(0, 4); c.arc(-4, 4, 4, 0, Math.PI * 0.95); c.stroke();
    c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(0, -12, 2.2, 0, TAU); c.fill();
    c.restore();
  },
  pop(c, x, y, res, k, t) {
    // 물방울 튐 — 잘 칠수록 많이 · 멀리, 놓치면 끊어진 줄
    c.globalAlpha = 1 - k;
    if (!res) {
      c.strokeStyle = '#c8433c'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 16, y - 4 - k * 8); c.quadraticCurveTo(x - 6, y - 12, x - 3, y - 2 + k * 10); c.stroke();
      c.beginPath(); c.moveTo(x + 16, y + 4 - k * 8); c.quadraticCurveTo(x + 6, y - 8, x + 3, y + 2 + k * 10); c.stroke();
      return;
    }
    const n = res === 300 ? 10 : res === 100 ? 7 : 4, d = (res === 300 ? 34 : 24) * (0.3 + k);
    const col = res === 300 ? '#f0d48a' : res === 100 ? '#c9c3b0' : '#9b957f';
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + res, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 + k * k * 18;
      c.beginPath(); c.ellipse(px, py, 3.2 * (1 - k * 0.5), 4.4 * (1 - k * 0.5), a + Math.PI / 2, 0, TAU); c.fill();
    }
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8 + k * 26, 0, TAU); c.stroke();
    if (res === 300) { c.fillStyle = '#fff4d0'; c.font = `700 15px ${FONT || 'sans-serif'}`; c.textAlign = 'center'; c.fillText('✦', x, y + 5 - k * 10); }
  }
};
