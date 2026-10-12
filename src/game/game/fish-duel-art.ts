/* ===== game/fish-duel-art.js — 낚시 겨루기의 그림 갈래 — osu! 원 대신 물결 구슬 · 낚싯줄 물길 · 물고기 공 · 릴 스피너 · 미끼 커서 ===== */
/* engine/rhythm 의 DuelArt 를 채운다. 판정 · 박자 · 크기는 엔진 그대로, 모양만 Ashfall 낚시로 —
   구슬 = 물이 든 유리 구슬 안에 도는 물고기 그림자 · 테는 꼰 낚싯줄 매듭 · 번호는 아래 호박빛 찌 표 */
import { TAU } from '../../engine/core/math.js';
import { FONT } from '../lang.js';
import type { DuelArt } from '../../engine/rhythm/duel.js';

type C2 = CanvasRenderingContext2D;
const DEEP = '#08202c';
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
/** 물결 고리 — 둘레가 잔잔히 일렁인다 */
function ripple(c: C2, x: number, y: number, R: number, t: number, lobes: number, amp: number) {
  c.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = i / 48 * TAU, rr = R + Math.sin(a * lobes + t * 5) * amp;
    if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.stroke();
}

export const FISH_DUEL_ART: DuelArt = {
  circle(c, x, y, col, n, r, t) {
    // 물빛 번짐
    const gl = c.createRadialGradient(x, y, r * 0.6, x, y, r * 1.35);
    gl.addColorStop(0, lift(col, 0.8)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalAlpha *= 0.45; c.fillStyle = gl; c.beginPath(); c.arc(x, y, r * 1.35, 0, TAU); c.fill(); c.restore();
    // 유리 구슬 — 가운데 밝고 가장자리 깊은 물
    const g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.08, x, y, r * 0.88);
    g.addColorStop(0, lift(col, 1.55)); g.addColorStop(0.45, col); g.addColorStop(1, DEEP);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 0.86, 0, TAU); c.fill();
    // 안에서 도는 물고기 그림자
    c.save(); c.beginPath(); c.arc(x, y, r * 0.8, 0, TAU); c.clip();
    const a = t * 1.8 + n * 1.7;
    c.translate(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.22); c.rotate(a + Math.PI / 2);
    fish(c, r * 0.7, 'rgba(4,16,24,.55)', Math.sin(t * 12) * r * 0.05);
    c.restore();
    // 꼰 낚싯줄 매듭 테 — 열두 마디가 천천히 돈다
    c.lineWidth = r * 0.13; c.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const b = i / 12 * TAU + t * 0.6;
      c.strokeStyle = i % 2 ? '#f4fbff' : lift(col, 1.3);
      c.beginPath(); c.arc(x, y, r * 0.9, b, b + TAU / 12 * 0.78); c.stroke();
    }
    // 윗빛 초승달
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = r * 0.07;
    c.beginPath(); c.arc(x, y, r * 0.62, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
    // 번호 — 아래쪽 호박빛 찌 표
    const by = y + r * 0.62, bw = r * 0.44;
    c.fillStyle = '#e8a840'; c.beginPath(); c.ellipse(x, by, bw, r * 0.27, 0, 0, TAU); c.fill();
    c.fillStyle = '#c23a2a'; c.beginPath(); c.ellipse(x, by - r * 0.08, bw, r * 0.15, 0, Math.PI, TAU); c.fill();
    c.fillStyle = '#1a1208'; c.font = `700 ${Math.round(r * 0.36)}px ${FONT || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), x, by + r * 0.04);
  },
  approach(c, x, y, r, k, col, t) {
    // 다가오는 물결 둘 — 바깥은 옅고 일렁인다, 안쪽이 구슬에 닿는 때가 칠 때
    c.strokeStyle = col; c.lineWidth = 2.6;
    ripple(c, x, y, r * k, t, 6, Math.min(1.6, (k - 1) * 0.8));
    c.globalAlpha *= 0.45; c.lineWidth = 1.6;
    ripple(c, x, y, r * (1 + (k - 1) * 1.25), t + 0.4, 5, 1.2);
  },
  sliderBody(c, p, r, col, t) {
    const path = () => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    path(); c.strokeStyle = 'rgba(200,236,255,.55)'; c.lineWidth = r * 1.9; c.stroke();     // 물길 둑
    path(); c.strokeStyle = 'rgba(8,32,44,.88)'; c.lineWidth = r * 1.66; c.stroke();
    const a0 = c.globalAlpha;
    path(); c.strokeStyle = col; c.globalAlpha = a0 * 0.35; c.lineWidth = r * 1.1; c.stroke();
    c.globalAlpha = a0 * 0.5; c.strokeStyle = lift(col, 1.5); c.lineWidth = 2;               // 흐르는 물살
    c.setLineDash([6, 14]); c.lineDashOffset = -t * 60; path(); c.stroke(); c.setLineDash([]);
    c.globalAlpha = a0 * 0.9; c.strokeStyle = '#f4fbff'; c.lineWidth = 1.2; path(); c.stroke();  // 낚싯줄
    c.globalAlpha = a0;
  },
  ball(c, x, y, r, col, ang, track, t) {
    if (track) {                                                         // 바늘에 걸렸다 — 도는 점선 고리
      c.save(); c.strokeStyle = 'rgba(244,251,255,.85)'; c.lineWidth = 2.4; c.setLineDash([8, 7]); c.lineDashOffset = -t * 40;
      c.beginPath(); c.arc(x, y, r * 2.2, 0, TAU); c.stroke(); c.restore();
    }
    c.save(); c.translate(x, y); c.rotate(ang);
    const gl = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); gl.addColorStop(0, lift(col, 1.2)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha *= 0.5; c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.2, 0, TAU); c.fill(); c.globalAlpha /= 0.5;
    const flap = Math.sin(t * 16) * r * 0.12;
    fish(c, r * 1.7, '#f4fbff', flap);
    fish(c, r * 1.5, col, flap);
    c.fillStyle = lift(col, 0.55); c.beginPath(); c.ellipse(-r * 0.05, -r * 0.12, r * 0.55, r * 0.12, 0, 0, TAU); c.fill();   // 등
    c.fillStyle = '#081018'; c.beginPath(); c.arc(r * 0.45, -r * 0.06, r * 0.09, 0, TAU); c.fill();   // 눈
    c.restore();
  },
  spinner(c, cx, cy, R, spun, k, left, need, col, t) {
    // 릴 — 감긴 줄이 두꺼워지고, 손잡이가 돈 만큼 돈다
    c.fillStyle = 'rgba(8,24,32,.72)'; c.beginPath(); c.arc(cx, cy, R + 8, 0, TAU); c.fill();
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    c.strokeStyle = '#c8a060'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R - 3, 0, TAU); c.stroke();
    for (let i = 0; i < 6; i++) {                                        // 테 볼트
      const a = i / 6 * TAU; c.fillStyle = '#e8d090'; c.beginPath(); c.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3, 0, TAU); c.fill();
    }
    const sp = 30 + k * 70;                                              // 감긴 줄 뭉치
    c.fillStyle = k >= 1 ? '#9ef08a' : col; c.globalAlpha *= 0.85; c.beginPath(); c.arc(cx, cy, sp, 0, TAU); c.fill(); c.globalAlpha /= 0.85;
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
    for (let rr = 26; rr < sp; rr += 6) { c.beginPath(); c.arc(cx, cy, rr, spun, spun + 4.5); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3;             // 남은 시간 — 안쪽에서 줄어드는 물결
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
      c.strokeStyle = '#ff6a5a'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 16, y - 4 - k * 8); c.quadraticCurveTo(x - 6, y - 12, x - 3, y - 2 + k * 10); c.stroke();
      c.beginPath(); c.moveTo(x + 16, y + 4 - k * 8); c.quadraticCurveTo(x + 6, y - 8, x + 3, y + 2 + k * 10); c.stroke();
      return;
    }
    const n = res === 300 ? 10 : res === 100 ? 7 : 4, d = (res === 300 ? 34 : 24) * (0.3 + k);
    const col = res === 300 ? '#bfeaff' : res === 100 ? '#a8f0a0' : '#ffd890';
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + res, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 + k * k * 18;
      c.beginPath(); c.ellipse(px, py, 3.2 * (1 - k * 0.5), 4.4 * (1 - k * 0.5), a + Math.PI / 2, 0, TAU); c.fill();
    }
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8 + k * 26, 0, TAU); c.stroke();
    if (res === 300) { c.fillStyle = '#ffffff'; c.font = `700 15px ${FONT || 'sans-serif'}`; c.textAlign = 'center'; c.fillText('✦', x, y + 5 - k * 10); }
  }
};
