/* ===== game/skill-art.js — 플레이어 스킬마다 제 물건 하나(이름 = 동작) — 칼 · 벽돌 벽 · 깃발 · 화살 · 연막탄 · 얼음 결정 · 사슬 · 별 ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { Game } from '../game.js';
/* ★ 결 그림(빛 · 고리 · 불티)만 겹치면 스킬끼리 같아 보였다(사용자 지적 — "합성이 아니라 기술마다 고유하게"). 스킬마다 그 이름의 물건이
   화면에 나타나 움직이고, 결 그림(game/fx skillVfx)은 그 뒤를 받친다. 그림만 — 판정은 entity/player-combat. 세계 좌표로 담고 그릴 때 카메라를 뺀다. */

type C2 = CanvasRenderingContext2D;
type Art = { k: string; t0: number; life: number; x: number; y: number; foot: number; ang: number; f: number; [k: string]: any };
const ease = (k: number) => 1 - (1 - k) * (1 - k);
const hs = (s: number, i: number) => { const v = Math.sin(s * 127.1 + i * 311.7) * 43758.5453; return v - Math.floor(v); };

/** 큰 칼 한 자루 — (0,0) 손잡이 끝, +x 로 칼날. L 길이 */
function sword(c: C2, L: number, edge: string, body: string) {
  c.fillStyle = '#5a3a1a'; c.fillRect(0, -2, L * 0.16, 4);                       // 자루
  c.fillStyle = '#c8a050'; c.fillRect(L * 0.16, -L * 0.09, L * 0.04, L * 0.18);  // 가드
  c.fillStyle = body; c.beginPath();
  c.moveTo(L * 0.2, -L * 0.05); c.lineTo(L * 0.9, -L * 0.035); c.lineTo(L, 0); c.lineTo(L * 0.9, L * 0.035); c.lineTo(L * 0.2, L * 0.05); c.closePath(); c.fill();
  c.strokeStyle = edge; c.lineWidth = 1.5; c.beginPath(); c.moveTo(L * 0.22, -L * 0.045); c.lineTo(L * 0.9, -L * 0.03); c.lineTo(L, 0); c.stroke();
  c.strokeStyle = 'rgba(80,90,110,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(L * 0.24, 0); c.lineTo(L * 0.8, 0); c.stroke();   // 피홈
}
/** 화살 — (0,0) 촉, -x 로 깃 */
function arrow(c: C2, L: number, shaft: string, fl: string) {
  c.strokeStyle = shaft; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(-L, 0); c.stroke();
  c.fillStyle = '#d8d8e0'; c.beginPath(); c.moveTo(4, 0); c.lineTo(-4, -3.5); c.lineTo(-4, 3.5); c.closePath(); c.fill();
  c.fillStyle = fl; c.beginPath(); c.moveTo(-L + 8, 0); c.lineTo(-L, -5); c.lineTo(-L + 2, 0); c.lineTo(-L, 5); c.closePath(); c.fill();
}
function star(c: C2, x: number, y: number, R: number, r: number, rot: number) {
  c.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, d = i % 2 ? r : R; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * d, y + Math.sin(a) * d); } c.closePath();
}
function glow(c: C2, x: number, y: number, r: number, col: string, a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1;
}

/** 스킬 갈래마다 — age 초 · k 0~1(수명 몫) · (x, y) 화면 좌표 */
export const SKILL_ART: Record<string, { life: number; draw: (c: C2, a: Art, age: number, k: number, x: number, y: number, foot: number) => void }> = {
  s_cleave: { life: 0.42, draw(c, a, age, k, x, y) {                 // 광폭 베기 — 큰 칼 한 자루가 몸을 한 바퀴 휩쓴다(잔상 넷)
    const sweep = ease(Math.min(1, age / 0.34)), a0 = a.ang - Math.PI * 0.9 * a.f, span = TAU * 0.95 * a.f;
    for (let g = 4; g >= 0; g--) {
      const u = Math.max(0, sweep - g * 0.07), an = a0 + span * u;
      c.save(); c.globalAlpha = (g ? 0.16 : 1) * (1 - Math.max(0, k - 0.7) / 0.3);
      c.translate(x, y); c.rotate(an); sword(c, 92, '#fff4d0', g ? '#ffd88a' : '#c8d0dc'); c.restore();
    }
    c.globalAlpha = 0.5 * (1 - k); c.strokeStyle = '#ffe2a0'; c.lineWidth = 6;      // 칼끝이 그은 자리
    c.beginPath(); c.arc(x, y, 90, Math.min(a0, a0 + span * sweep), Math.max(a0, a0 + span * sweep)); c.stroke(); c.globalAlpha = 1;
  } },
  s_charge: { life: 0.5, draw(c, a, age, k, x, y) {                  // 돌진 강타 — 앞장선 방패(연 모양)와 뒤로 끌리는 속도선
    const px = x + Math.cos(a.ang) * 18, py = y + Math.sin(a.ang) * 18;
    c.save(); c.globalAlpha = 1 - k;
    c.strokeStyle = 'rgba(255,236,190,.7)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const o = (i - 2.5) * 6, l = 40 + hs(a.sd, i) * 50; c.beginPath(); c.moveTo(px - Math.cos(a.ang) * 16 - Math.sin(a.ang) * o, py - Math.sin(a.ang) * 16 + Math.cos(a.ang) * o); c.lineTo(px - Math.cos(a.ang) * (16 + l) - Math.sin(a.ang) * o, py - Math.sin(a.ang) * (16 + l) + Math.cos(a.ang) * o); c.stroke(); }
    c.translate(px, py); c.rotate(a.ang);
    c.fillStyle = '#8a6a3a'; c.strokeStyle = '#ffe0a0'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(8, 0); c.quadraticCurveTo(6, -14, -4, -15); c.lineTo(-6, 0); c.lineTo(-4, 15); c.quadraticCurveTo(6, 14, 8, 0); c.fill(); c.stroke();
    c.fillStyle = '#ffd07a'; c.beginPath(); c.arc(1, 0, 3.5, 0, TAU); c.fill();                       // 방패 돌기
    c.restore();
  } },
  s_charge_hit: { life: 0.4, draw(c, a, age, k, x, y) {              // 부딪힌 순간 — 방패 자국처럼 움푹 팬 금
    c.save(); c.globalAlpha = 1 - k; c.strokeStyle = '#fff0c0'; c.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) { const an = a.ang + (i - 3) * 0.42, L = 18 + hs(a.sd, i) * 26 * ease(Math.min(1, age * 6));
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(an) * L * 0.5 + Math.sin(an) * 4, y + Math.sin(an) * L * 0.5 - Math.cos(an) * 4); c.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); c.stroke(); }
    c.restore();
  } },
  s_guard: { life: 0.9, draw(c, a, age, k, x, y, foot) {             // 철벽 — 몸 앞에 벽돌 벽이 줄줄이 솟았다 허물어진다
    const wx = x + a.f * 26, rows = 5, up = Math.min(rows, age / 0.05);
    c.save(); c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    for (let r = 0; r < Math.floor(up); r++) for (let i = 0; i < 2; i++) {
      const bx = wx - 10 + (r % 2 ? -5 : 0) + i * 10, by = foot - 8 - r * 8;
      c.fillStyle = r % 2 ? '#8a8a96' : '#9a9aa6'; c.fillRect(bx, by, 10, 8);
      c.strokeStyle = '#4a4a56'; c.lineWidth = 1; c.strokeRect(bx + 0.5, by + 0.5, 9, 7);
      c.fillStyle = 'rgba(255,240,200,.5)'; c.fillRect(bx + 1, by + 1, 8, 1);
    }
    c.restore();
  } },
  s_whirl: { life: 0.3, draw(c, a, age, k, x, y) {                   // 회오리 검무 — 칼 세 자루가 몸을 돈다
    for (let i = 0; i < 3; i++) {
      const an = a.a0 + i * TAU / 3 + age * 14;
      c.save(); c.globalAlpha = 0.9 * (1 - k); c.translate(x + Math.cos(an) * 30, y + Math.sin(an) * 14); c.rotate(an + Math.PI / 2); sword(c, 46, '#fff0c0', '#d8dce8'); c.restore();
    }
  } },
  s_quake: { life: 1.0, draw(c, a, age, k, x, y, foot) {             // 대지 가르기 — 발밑에서 양옆으로 땅판이 비스듬히 치솟는다
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const at = i * 0.06, u = clamp((age - at) / 0.18, 0, 1), dn = k > 0.6 ? (k - 0.6) / 0.4 : 0;
      if (u <= 0) continue;
      const px = x + s * (22 + i * 30), h = (14 + hs(a.sd, i + (s > 0 ? 9 : 0)) * 16) * ease(u) * (1 - dn);
      c.save(); c.translate(px, foot); c.rotate(s * (0.25 + hs(a.sd, i) * 0.3));
      c.fillStyle = '#6a5240'; c.fillRect(-9, -h, 18, h); c.fillStyle = '#8a6e52'; c.fillRect(-9, -h, 18, 3);
      c.fillStyle = '#ff9a4a'; c.globalAlpha = 0.7 * (1 - dn); c.fillRect(-1, -h * 0.8, 2, h * 0.7);   // 갈라진 틈의 열기
      c.restore();
    }
  } },
  s_warcry: { life: 1.1, draw(c, a, age, k, x, y, foot) {            // 전투 함성 — 등 뒤로 깃발이 서서 펄럭이고, 소리 물결이 양옆으로
    const up = ease(Math.min(1, age / 0.25)), fx = x - a.f * 14;
    c.save(); c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(fx, foot); c.lineTo(fx, foot - 70 * up); c.stroke();
    c.fillStyle = '#c8402a'; c.beginPath(); c.moveTo(fx, foot - 70 * up);
    for (let i = 0; i <= 8; i++) { const u = i / 8; c.lineTo(fx - a.f * 34 * u, foot - 70 * up + 4 + Math.sin(age * 14 - u * 5) * 4 * u); }
    for (let i = 8; i >= 0; i--) { const u = i / 8; c.lineTo(fx - a.f * 34 * u, foot - 70 * up + 24 + Math.sin(age * 14 - u * 5) * 4 * u); }
    c.closePath(); c.fill(); c.fillStyle = '#ffd07a'; c.beginPath(); star(c, fx - a.f * 15, foot - 70 * up + 14, 5, 2, -Math.PI / 2); c.fill();
    c.strokeStyle = '#ffd88a'; c.lineWidth = 3;
    for (let w = 0; w < 3; w++) { const r = 20 + ((age * 160 + w * 40) % 120); c.globalAlpha = 0.6 * (1 - r / 140) * (1 - k); for (const s of [-1, 1]) { c.beginPath(); c.arc(x, y - 6, r, s > 0 ? -0.5 : Math.PI - 0.5, s > 0 ? 0.5 : Math.PI + 0.5); c.stroke(); } }
    c.restore();
  } },
  s_volley: { life: 0.35, draw(c, a, age, k, x, y) {                 // 화살 세례 — 활이 시위를 놓는 모양
    c.save(); c.translate(x + Math.cos(a.ang) * 14, y - 4 + Math.sin(a.ang) * 14); c.rotate(a.ang); c.globalAlpha = 1 - k;
    c.strokeStyle = '#8a5a2a'; c.lineWidth = 3; c.beginPath(); c.arc(-6, 0, 18, -1.2, 1.2); c.stroke();
    const pull = age < 0.06 ? 10 : 10 * Math.max(0, 1 - (age - 0.06) * 12);
    c.strokeStyle = '#f0e8d0'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6 + Math.cos(-1.2) * 18, Math.sin(-1.2) * 18); c.lineTo(-6 - pull, 0); c.lineTo(-6 + Math.cos(1.2) * 18, Math.sin(1.2) * 18); c.stroke();
    for (let i = -2; i <= 2; i++) { c.save(); c.rotate(i * 0.16); c.translate(20 + age * 600, 0); arrow(c, 22, '#c8a878', '#e8e0c8'); c.restore(); }
    c.restore();
  } },
  s_pierce: { life: 0.4, draw(c, a, age, k, x, y) {                  // 꿰뚫는 화살 — 커다란 빛 화살 하나가 깃털을 흩뿌리며 꿰뚫고 간다
    const d = 40 + age * 900;
    c.save(); c.globalAlpha = 1 - k; c.translate(x, y - 4); c.rotate(a.ang);
    c.strokeStyle = 'rgba(200,255,170,.4)'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(d, 0); c.stroke();
    c.translate(d, 0); c.scale(2, 2); arrow(c, 30, '#e8ffd0', '#bff09a'); c.restore();
    for (let i = 0; i < 6; i++) { const u = hs(a.sd, i), px = x + Math.cos(a.ang) * d * u, py = y - 4 + Math.sin(a.ang) * d * u + age * 40 * (1 + u);
      c.save(); c.globalAlpha = 0.8 * (1 - k); c.translate(px, py); c.rotate(age * 6 + i); c.fillStyle = '#d8ffb0'; c.beginPath(); c.ellipse(0, 0, 4, 1.5, 0, 0, TAU); c.fill(); c.restore(); }
  } },
  s_rain: { life: 1.0, draw(c, a, age, k, x, y) {                    // 유성 화살비 — 겨눈 자리 위 하늘에 불붙은 화살 다발이 선다
    const mx = a.mx - (a.x - x), my = a.my - (a.y - y) - 300;
    c.save(); c.globalAlpha = Math.min(1, age * 5) * (1 - k);
    for (let i = 0; i < 9; i++) { const ox = (i - 4) * 14, oy = hs(a.sd, i) * 30 + Math.sin(age * 8 + i) * 3;
      c.save(); c.translate(mx + ox, my + oy); c.rotate(Math.PI / 2); arrow(c, 24, '#c8a878', '#ffb060'); c.restore();
      glow(c, mx + ox, my + oy - 26, 10, 'rgba(255,170,80,.9)', 0.6 * (1 - k)); }
    c.restore();
  } },
  s_smoke: { life: 1.6, draw(c, a, age, k, x, y) {                   // 연막탄 — 던진 알이 발치에서 터져 뭉게뭉게 부푼다
    if (age < 0.2) { const u = age / 0.2; c.fillStyle = '#3a3a3a'; c.beginPath(); c.arc(x + a.f * 20 * u, y - 10 + 20 * u * u, 4, 0, TAU); c.fill(); c.fillStyle = '#ffb04a'; c.fillRect(x + a.f * 20 * u - 1, y - 16 + 20 * u * u, 2, 3); return; }
    const u = ease(Math.min(1, (age - 0.2) / 0.6));
    for (let i = 0; i < 11; i++) { const an = hs(a.sd, i) * TAU, d = 50 * u * hs(a.sd, i + 4), r = 14 + 22 * u * (0.5 + hs(a.sd, i + 8));
      const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.6 - u * 10;
      c.globalAlpha = 0.8 * (1 - k); c.fillStyle = i % 3 ? '#8e968a' : '#a6ae9e'; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();   // 뭉게구름 — 그늘 위에 밝은 볼
      c.fillStyle = i % 3 ? '#c4ccbc' : '#dfe6d6'; c.beginPath(); c.arc(px - r * 0.2, py - r * 0.25, r * 0.72, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  } },
  s_mark: { life: 0.9, draw(c, a, age, k, x, y) {                    // 사냥꾼의 표식 — 과녁 머리 위에 붉은 삼각 낙인 + 발톱 자국
    const p = a.at && a.at(); if (!p) return;
    const tx = p[0] - (a.x - x), ty = p[1] - (a.y - y) - (a.r || 20) - 14, drop = ease(Math.min(1, age / 0.2));
    c.save(); c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; c.translate(tx, ty - 20 * (1 - drop));
    c.fillStyle = '#c8302a'; c.strokeStyle = '#ffe070'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-9, -7); c.lineTo(9, -7); c.lineTo(0, 9); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#ffe070'; c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 3 - 1.5, -4); c.lineTo(i * 3 + 1.5, 3); c.stroke(); }
    c.restore();
  } },
  s_fireball: { life: 0.35, draw(c, a, age, k, x, y) {               // 화염구 — 손끝에서 불 혀 셋이 감겨 공이 된다
    const hx = x + Math.cos(a.ang) * 18, hy = y - 4 + Math.sin(a.ang) * 18;
    c.save(); c.globalAlpha = 1 - k;
    const r = 26 * (1 - ease(Math.min(1, age / 0.25)));
    for (let i = 0; i < 3; i++) { const an = age * 16 + i * TAU / 3;           // 끝이 가는 불 혀 — 꼬리가 도는 쪽 뒤로 끌린다
      c.fillStyle = ['#ff6a2a', '#ffb04a', '#ffe08a'][i]; c.beginPath();
      c.moveTo(hx + Math.cos(an) * r, hy + Math.sin(an) * r);
      c.quadraticCurveTo(hx + Math.cos(an - 0.5) * (r + 10), hy + Math.sin(an - 0.5) * (r + 10), hx + Math.cos(an - 1.1) * (r + 6), hy + Math.sin(an - 1.1) * (r + 6));
      c.quadraticCurveTo(hx + Math.cos(an - 0.5) * (r + 2), hy + Math.sin(an - 0.5) * (r + 2), hx + Math.cos(an) * r, hy + Math.sin(an) * r); c.fill();
      c.beginPath(); c.arc(hx + Math.cos(an) * r, hy + Math.sin(an) * r, 4, 0, TAU); c.fill(); }
    glow(c, hx, hy, 22 + (26 - r) * 0.4, 'rgba(255,200,120,.95)', 0.9 * (1 - k));
    c.fillStyle = '#fff4c8'; c.beginPath(); c.arc(hx, hy, 6 * ease(Math.min(1, age / 0.25)), 0, TAU); c.fill(); c.restore();
  } },
  s_nova: { life: 1.1, draw(c, a, age, k, x, y, foot) {              // 서리 결계 — 둘레 땅에서 육각 얼음 결정이 솟는다
    for (let i = 0; i < 12; i++) {
      const s = i % 2 ? 1 : -1, d = 26 + Math.floor(i / 2) * 26, at = Math.floor(i / 2) * 0.05, u = clamp((age - at) / 0.15, 0, 1), dn = k > 0.7 ? (k - 0.7) / 0.3 : 0;
      if (u <= 0) continue;
      const h = (16 + hs(a.sd, i) * 18) * ease(u), lean = s * (0.15 + hs(a.sd, i + 3) * 0.3);
      c.save(); c.globalAlpha = 1 - dn; c.translate(x + s * d, foot); c.rotate(lean);
      c.fillStyle = 'rgba(190,235,255,.85)'; c.beginPath(); c.moveTo(-5, 0); c.lineTo(-5, -h * 0.75); c.lineTo(0, -h); c.lineTo(5, -h * 0.75); c.lineTo(5, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(-3, -h * 0.7, 2, h * 0.55);
      c.strokeStyle = 'rgba(120,190,230,.9)'; c.lineWidth = 1; c.stroke();
      c.restore();
    }
  } },
  s_heal: { life: 1.3, draw(c, a, age, k, x, y, foot) {              // 치유의 빛 — 위에서 빛 꽃잎이 내려앉아 몸에 스민다
    for (let i = 0; i < 10; i++) {
      const u = (age * 0.9 + hs(a.sd, i)) % 1, px = x + (hs(a.sd, i + 5) - 0.5) * 50 + Math.sin(age * 3 + i) * 8, py = foot - 120 + u * 110;
      c.save(); c.globalAlpha = Math.sin(u * Math.PI) * (1 - k); c.translate(px, py); c.rotate(age * 2 + i);
      c.fillStyle = '#c8ffc0'; c.beginPath(); c.ellipse(0, 0, 5, 2.4, 0, 0, TAU); c.fill(); c.fillStyle = '#ffffff'; c.fillRect(-1, -0.5, 2, 1);
      c.restore();
    }
    c.save(); c.globalAlpha = 0.7 * (1 - k); c.strokeStyle = '#e8ffe0'; c.lineWidth = 2;   // 가슴께 십자 반짝
    const s = 6 + Math.sin(age * 10) * 2; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); c.restore();
  } },
  s_barrier: { life: 0.7, draw(c, a, age, k, x, y) {                 // 비전 방벽 — 육각 판들이 날아와 몸을 감싸는 껍질로 맞물린다
    for (let i = 0; i < 10; i++) {
      const an = i / 10 * TAU, u = ease(clamp((age - i * 0.02) / 0.3, 0, 1)), R = 34 + (1 - u) * 60;
      const px = x + Math.cos(an) * R, py = y + Math.sin(an) * R * 1.1;
      c.save(); c.globalAlpha = (k > 0.7 ? (1 - k) / 0.3 : 1) * 0.85; c.translate(px, py); c.rotate(an);
      c.fillStyle = 'rgba(140,200,255,.35)'; c.strokeStyle = '#bfe0ff'; c.lineWidth = 1.2;
      c.beginPath(); for (let j = 0; j < 6; j++) { const b = j * TAU / 6; c[j ? 'lineTo' : 'moveTo'](Math.cos(b) * 8, Math.sin(b) * 8); } c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  } },
  s_wolf: { life: 1.0, draw(c, a, age, k, x, y, foot) {              // 영혼 늑대 소환 — 앉은 늑대가 고개를 젖혀 하늘을 보고 운다(옆모습 그림자)
    const wx = a.wx - (a.x - x), up = ease(Math.min(1, age / 0.35)), lift = Math.min(1, age / 0.5);
    const P = [[-16, 0], [-14, -14], [-10, -24], [-6, -30], [-4, -38 - 4 * lift], [-1, -44 - 6 * lift], [1, -38 - 4 * lift],                 // 엉덩이 · 등 · 목덜미 · 귀
      [5, -40 - 8 * lift], [10, -50 - 10 * lift], [12, -47 - 10 * lift], [8, -38 - 6 * lift], [11, -36 - 6 * lift], [7, -32 - 2 * lift],   // 치켜든 주둥이(벌린 입)
      [6, -24], [8, -10], [10, 0], [4, 0], [2, -12], [-2, -6], [-6, 0]];                                                                 // 가슴 · 앞다리
    c.save(); c.translate(wx, foot + (1 - up) * 20); c.scale(a.f, 1);
    const fade = k > 0.6 ? ((1 - k) / 0.4) ** 2 : 1;   // glow 는 globalAlpha 를 덮어쓰므로 fade 를 따로 곱한다
    c.globalAlpha = fade * up;
    glow(c, 0, -26, 40, 'rgba(200,230,255,.8)', 0.5 * up * fade);
    c.fillStyle = 'rgba(214,236,255,.82)'; c.strokeStyle = '#eaf6ff'; c.lineWidth = 1.5;
    c.beginPath(); P.forEach(([px, py], i) => c[i ? 'lineTo' : 'moveTo'](px, py)); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5ab8ff'; c.fillRect(3, -39 - 6 * lift, 2, 2);                                                            // 눈
    c.strokeStyle = 'rgba(220,240,255,.7)'; c.lineWidth = 1.5;                                                            // 울음 — 주둥이 끝에서 퍼지는 호
    for (let w = 0; w < 3; w++) { const r = 6 + ((age * 40 + w * 8) % 24); c.globalAlpha = 0.7 * (1 - r / 30) * up * fade; c.beginPath(); c.arc(12, -50 - 10 * lift, r, -1.6, -0.4); c.stroke(); }
    c.restore();
  } },
  s_chain_hop: { life: 0.35, draw(c, a, age, k, x, y) {              // 사슬 번개 — 번개 길에 쇠사슬 고리가 엮인다
    const tx = a.tx - (a.x - x), ty = a.ty - (a.y - y), fx0 = a.fx0 !== undefined ? a.fx0 - (a.x - x) : x, fy0 = a.fy0 !== undefined ? a.fy0 - (a.y - y) : y;
    const L = Math.hypot(tx - fx0, ty - fy0), n = Math.max(2, Math.floor(L / 12)), an = Math.atan2(ty - fy0, tx - fx0);
    c.save(); c.globalAlpha = 1 - k; c.strokeStyle = '#fff0a0'; c.lineWidth = 2;
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, px = fx0 + (tx - fx0) * u + Math.sin(i * 2.3 + age * 40) * 3, py = fy0 + (ty - fy0) * u + Math.cos(i * 1.7 + age * 40) * 3;
      c.save(); c.translate(px, py); c.rotate(an + (i % 2 ? Math.PI / 2 : 0) * 0.6); c.beginPath(); c.ellipse(0, 0, 6, 3, 0, 0, TAU); c.stroke(); c.restore(); }
    c.restore();
  } },
  s_blink: { life: 0.55, draw(c, a, age, k, x, y) {                  // 차원 도약 — 떠난 자리와 닿은 자리에 세로로 찢어진 틈
    const ox = a.ox - (a.x - x), oy = a.oy - (a.y - y);
    for (const [px, py, s] of [[ox, oy, 1], [x, y, 0.8]] as const) {
      const w = 10 * s * Math.sin(Math.min(1, age / 0.5) * Math.PI), h = 30 * s;
      c.save(); c.globalAlpha = 1 - k; c.fillStyle = '#1a0a2a'; c.strokeStyle = '#d8b8ff'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(px, py - h); c.quadraticCurveTo(px + w, py, px, py + h); c.quadraticCurveTo(px - w, py, px, py - h); c.fill(); c.stroke(); c.restore();
    }
  } },
  s_meteor: { life: 0.9, draw(c, a, age, k, x, y) {                  // 별의 낙하 — 떨어진 자리에 박힌 큰 별이 빛을 뿜고 식는다
    const tx = a.tx - (a.x - x), ty = a.ty - (a.y - y), s = 1 - k * 0.4;
    glow(c, tx, ty - 10, 90 * s, 'rgba(255,230,160,.9)', 0.7 * (1 - k));
    c.save(); c.globalAlpha = 1 - Math.max(0, k - 0.5) * 2; c.fillStyle = '#ffd84a'; c.strokeStyle = '#7a4e0c'; c.lineWidth = 2;
    star(c, tx, ty - 14, 26 * s, 11 * s, -Math.PI / 2 + age * 0.4); c.fill(); c.stroke();
    c.fillStyle = '#fffbe6'; star(c, tx - 2, ty - 16, 11 * s, 5 * s, -Math.PI / 2 + age * 0.4); c.fill();
    c.restore();
  } },
};

export const SkillArtPart: Bag = {
  arts: null,
  /** 스킬 물건 하나를 세운다 — skillVfx 가 결 그림 앞에 부른다(o 는 skillVfx 와 같다) */
  skillArt(id: string, o: Bag) {
    const d = SKILL_ART[id]; if (!d) return;
    (this.arts || (this.arts = [])).push({ ...o, k: id, t0: this.time, life: d.life, sd: Math.random() * 99, f: o.f || 1, ang: o.ang || 0 });
  },
  drawSkillArt(c: C2) {
    const L = this.arts; if (!L || !L.length) return;
    const cx = this.cam.x, cy = this.cam.y;
    for (let i = L.length - 1; i >= 0; i--) {
      const a = L[i], age = this.time - a.t0;
      if (age >= a.life || age < 0) { L.splice(i, 1); continue; }
      c.save();
      try { SKILL_ART[a.k].draw(c, a, age, age / a.life, a.x - cx, a.y - cy, (a.foot || a.y) - cy); } finally { c.restore(); }
    }
  },
};

mixin(Game.prototype, SkillArtPart, true);
