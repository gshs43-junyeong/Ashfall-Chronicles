/* ===== game/boss-field-art.js — 보스 기술이 남기는 바닥 · 벽 · 충격파 · 소용돌이 · 광선 · 바람의 그림 ===== */
import { TAU } from '../../engine/core/math.js';
import { glob, hs, hzGlow, iceCluster, jag, poly, rock, strokePath } from './boss-hazard-art.js';
/* 기술 이름과 그림이 같은 것을 말해야 한다 — 서리 바닥은 얼음판에 서리꽃이, 사건의 지평선은 빛을 삼키는 검은 원이,
   가시 채찍은 빛줄기가 아니라 가시 돋친 덩굴이다. fx 가 없는(예전) 위험 지대만 옛 번짐으로 그린다. */

type C2 = CanvasRenderingContext2D;

/** 서리꽃 — 여섯 갈래 결정 */
function frostFlower(c: C2, x: number, y: number, r: number) {
  c.strokeStyle = 'rgba(230,250,255,.9)'; c.lineWidth = 1.2;
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
    c.moveTo(x, y); c.lineTo(ex, ey);
    const bx = x + Math.cos(a) * r * 0.55, by = y + Math.sin(a) * r * 0.55;
    c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + 0.7) * r * 0.3, by + Math.sin(a + 0.7) * r * 0.3);
    c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - 0.7) * r * 0.3, by + Math.sin(a - 0.7) * r * 0.3);
  }
  c.stroke();
}
/** 바닥 웅덩이 — 출렁이는 테두리 */
function puddle(c: C2, sd: number, x: number, y: number, r: number, T: number, fill: string, edge: string) {
  c.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = i / 16 * TAU, rr = r * (0.85 + hs(sd, i % 16) * 0.2 + Math.sin(T * 3 + i) * 0.03);
    const px = x + Math.cos(a) * rr, py = y - 2 + Math.sin(a) * rr * 0.22;
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = edge; c.lineWidth = 1.5; c.stroke();
}

export const ZONE_ART: Record<string, (c: C2, h: Bag, x: number, y: number, f: number, T: number) => void> = {
  gel(c, h, x, y, f, T) {                                                // 끈적이는 비 — 젤 방울이 떨어져 웅덩이가 된다
    const t = h.t;
    if (t < 0.45) { const u = t / 0.45; glob(c, x, y - 200 * (1 - u * u) - 8, 8, '#8fbaff', '#1e3a7a'); }
    c.globalAlpha = f; puddle(c, h.sd, x, y, h.r * Math.min(1, t * 3), T, 'rgba(111,168,255,.55)', 'rgba(30,58,122,.8)');
    for (let i = 0; i < 4; i++) {                                        // 거품
      const u = (T * 0.7 + hs(h.sd, i)) % 1, bx = x + (hs(h.sd, i + 3) - 0.5) * h.r * 1.3;
      c.strokeStyle = 'rgba(220,235,255,.8)'; c.lineWidth = 1; c.beginPath(); c.arc(bx, y - 3 - u * 4, 1.5 + u * 2.5, 0, TAU); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x - h.r * 0.3, y - 4, h.r * 0.25, 1.5, 0, 0, TAU); c.fill();
    c.globalAlpha = 1;
  },
  frost(c, h, x, y, f, T) {                                              // 서리 바닥 · 빙하기 — 얼음판 위에 서리꽃이 핀다
    c.globalAlpha = f; puddle(c, h.sd, x, y, h.r, 0, 'rgba(200,240,255,.5)', 'rgba(120,190,230,.9)');
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) strokePath(c, jag(h.sd + i, x - h.r * 0.7 + i * h.r * 0.35, y - 1, x - h.r * 0.5 + i * h.r * 0.38, y - 4, 3, 1.5), 'rgba(255,255,255,.55)', 1);
    for (let i = 0; i < 3; i++) frostFlower(c, x + (hs(h.sd, i) - 0.5) * h.r * 1.4, y - 7 - hs(h.sd, i + 5) * 6, 4 + Math.min(1, h.t * 2) * 3);
    if (h.wallZ) iceCluster(c, h.sd, x, y, 26, 34 * Math.min(1, h.t * 4));
    c.fillStyle = 'rgba(230,250,255,.35)';
    for (let i = 0; i < 3; i++) { const u = (T * 0.4 + hs(h.sd, i + 9)) % 1; c.beginPath(); c.arc(x + (hs(h.sd, i + 2) - 0.5) * h.r * 1.6, y - 6 - u * 20, 5 + u * 6, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  },
  spore(c, h, x, y, f, T) {                                              // 포자 구름 — 낮게 깔려 뭉실뭉실 떠다닌다
    for (let i = 0; i < 9; i++) {
      const a = hs(h.sd, i) * TAU + T * 0.4 * (i % 2 ? 1 : -1), d = h.r * 0.6 * hs(h.sd, i + 3);
      const px = x + Math.cos(a) * d, py = y - 18 + Math.sin(a) * d * 0.35 + Math.sin(T * 2 + i) * 3, r = h.r * (0.28 + hs(h.sd, i + 6) * 0.2);
      const g = c.createRadialGradient(px, py, 1, px, py, r);
      g.addColorStop(0, `rgba(160,240,200,${0.5 * f})`); g.addColorStop(1, 'rgba(120,200,160,0)');
      c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
    }
    c.fillStyle = `rgba(220,255,230,${0.8 * f})`;
    for (let i = 0; i < 6; i++) { const u = (T * 0.5 + hs(h.sd, i + 11)) % 1; c.fillRect(x + (hs(h.sd, i + 12) - 0.5) * h.r * 1.6, y - 4 - u * 40, 2, 2); }
  },
  flesh(c, h, x, y, f, T) {                                              // 핏빛 웅덩이 — 핏줄이 뻗어 고동친다
    const b = 1 + Math.sin(T * 9) * 0.06;
    c.globalAlpha = f; puddle(c, h.sd, x, y, h.r * b, T, 'rgba(120,20,40,.6)', 'rgba(60,8,20,.9)');
    for (let i = 0; i < 5; i++) {
      const a = hs(h.sd, i) * Math.PI + Math.PI, L = h.r * (0.9 + hs(h.sd, i + 4) * 0.5) * b;
      strokePath(c, jag(h.sd + i, x, y - 2, x + Math.cos(a) * L, y - 2 + Math.sin(a) * L * 0.18, 4, 3), 'rgba(200,60,90,.8)', 1.6);
    }
    c.globalAlpha = 1;
  },
  bile(c, h, x, y, f, T) {                                               // 담즙 — 부글대며 김이 오른다
    c.globalAlpha = f; puddle(c, h.sd, x, y, h.r, T, 'rgba(168,200,74,.55)', 'rgba(60,80,16,.9)');
    for (let i = 0; i < 3; i++) {
      const u = (T * 0.9 + hs(h.sd, i)) % 1, bx = x + (hs(h.sd, i + 1) - 0.5) * h.r;
      c.fillStyle = 'rgba(210,230,120,.8)'; c.beginPath(); c.arc(bx, y - 3, 1 + u * 3, Math.PI, TAU); c.fill();
      c.fillStyle = `rgba(200,220,150,${0.3 * (1 - u)})`; c.beginPath(); c.arc(bx, y - 8 - u * 26, 4 + u * 6, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  },
  fire(c, h, x, y, f, T) {                                               // 쇳물 웅덩이 — 굳은 껍질 사이로 붉은 빛
    c.globalAlpha = f; puddle(c, h.sd, x, y, h.r, T, 'rgba(255,120,30,.75)', 'rgba(90,20,4,.95)');
    c.fillStyle = 'rgba(60,24,10,.85)';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x + (hs(h.sd, i) - 0.5) * h.r * 1.3, y - 2, 4 + hs(h.sd, i + 2) * 6, 1.6, 0, 0, TAU); c.fill(); }
    c.globalAlpha = 1; hzGlow(c, x, y - 3, h.r * 1.1, '#ff8a3a', 0.35 * f);
    c.fillStyle = '#ffd080';
    for (let i = 0; i < 3; i++) { const u = (T * 1.3 + hs(h.sd, i + 5)) % 1; c.globalAlpha = f * (1 - u); c.fillRect(x + (hs(h.sd, i + 6) - 0.5) * h.r, y - 4 - u * 24, 2, 2); }
    c.globalAlpha = 1;
  },
  seed(c, h, x, y, f, T) {                                               // 씨앗 폭탄 자리 — 가시덩굴이 엉킨다
    c.globalAlpha = f;
    for (let i = 0; i < 5; i++) {
      const x0 = x - h.r + hs(h.sd, i) * h.r * 0.6, x1 = x0 + h.r * (0.8 + hs(h.sd, i + 3) * 0.8);
      const p: number[] = []; for (let j = 0; j <= 6; j++) { const u = j / 6; p.push(x0 + (x1 - x0) * u, y - 2 - Math.abs(Math.sin(u * 6 + i)) * 7); }
      strokePath(c, p, '#2e4a16', 3.2); strokePath(c, p, '#6a9a3a', 1.8);
      c.fillStyle = '#e8e0b0';
      for (let j = 1; j < 6; j += 2) { poly(c, [p[j * 2], p[j * 2 + 1], p[j * 2] + 2, p[j * 2 + 1] - 5, p[j * 2] + 4, p[j * 2 + 1]]); c.fill(); }
    }
    c.globalAlpha = 1;
  }
};

/** 다가오는 벽 — 낮은 벽(뛰어넘는다) · 높은 벽(밑으로 지나보낸다) */
export const WALL_ART: Record<string, (c: C2, h: Bag, x: number, top: number, bot: number, f: number, T: number) => void> = {
  ice(c, h, x, top, bot, f) {                                            // 빙벽 — 얼음판이 깎인 면을 앞세우고 밀려온다
    const w = h.w, s = Math.sign(h.vx) || 1, p: number[] = [x - w / 2, bot, x - w / 2, top + 6];
    for (let i = 0; i <= 4; i++) p.push(x - w / 2 + w * i / 4, top + (i % 2 ? 0 : 8) + hs(h.sd, i) * 5);
    p.push(x + w / 2, bot);
    c.globalAlpha = f; poly(c, p);
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, 'rgba(150,210,240,.85)'); g.addColorStop(s > 0 ? 0.8 : 0.2, 'rgba(240,252,255,.95)'); g.addColorStop(1, 'rgba(150,210,240,.85)');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#2f5f86'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const yy = top + (bot - top) * (0.2 + i * 0.3); c.beginPath(); c.moveTo(x - w * 0.3, yy); c.lineTo(x + w * 0.2, yy + 10); c.stroke(); }
    c.globalAlpha = 1;
  },
  bolt(c, h, x, top, bot, f, T) {                                        // 천둥 벽 — 위아래를 잇는 번개 가닥
    const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = f;
    for (let i = 0; i < 3; i++) {
      const p = jag(h.sd + i * 5 + Math.floor(T * 24), x + (i - 1) * 9, top, x + (i - 1) * 9, bot, Math.max(4, Math.round((bot - top) / 24)), 7);
      strokePath(c, p, 'rgba(120,180,255,.6)', 6); strokePath(c, p, '#ffffff', 1.6);
    }
    c.globalCompositeOperation = op; c.globalAlpha = 1;
    hzGlow(c, x, bot - 4, 30, '#cfe6ff', 0.5 * f);
  },
  sand(c, h, x, top, bot, f, T) {                                        // 모래 폭풍 — 휘감아 도는 모래 띠
    for (let i = 0; i < 7; i++) {
      const yy = top + (bot - top) * (i + 0.5) / 7, ph = T * 9 + i * 1.3;
      c.fillStyle = `rgba(${200 + i * 6},${160 + i * 5},90,${0.45 * f})`;
      c.beginPath(); c.ellipse(x + Math.sin(ph) * h.w * 0.25, yy, h.w * (0.55 + 0.15 * Math.sin(ph * 0.7)), (bot - top) / 10, 0, 0, TAU); c.fill();
    }
    c.fillStyle = `rgba(250,220,150,${0.9 * f})`;
    for (let i = 0; i < 14; i++) { const u = (T * 1.5 + hs(h.sd, i)) % 1; c.fillRect(x + Math.sin(T * 7 + i) * h.w * 0.7, bot - (bot - top) * u, 2, 1.5); }
  },
  water(c, h, x, top, bot, f, T) {                                       // 역류 · 해일 — 앞머리가 말리는 물 더미
    const s = Math.sign(h.vx) || 1, w = h.w * 1.6, hh = bot - top;
    c.globalAlpha = f;
    c.beginPath(); c.moveTo(x - s * w, bot); c.lineTo(x - s * w, top + hh * 0.35);
    c.quadraticCurveTo(x - s * w * 0.2, top - 4, x + s * w * 0.35, top + hh * 0.12);
    c.quadraticCurveTo(x + s * w * 0.6, top + hh * 0.3, x + s * w * 0.25, top + hh * 0.38);   // 말린 머리
    c.quadraticCurveTo(x + s * w * 0.5, top + hh * 0.7, x + s * w * 0.5, bot); c.closePath();
    const g = c.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(170,225,255,.9)'); g.addColorStop(1, 'rgba(30,90,160,.85)');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#123a66'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)';                               // 물거품
    for (let i = 0; i < 6; i++) { const u = i / 6; c.beginPath(); c.arc(x - s * w * 0.4 + s * w * 0.75 * u, top + hh * (0.12 + Math.sin(u * 3) * 0.05) + Math.sin(T * 10 + i) * 1.5, 2.5, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  },
  metal(c, h, x, top, bot, f, T) {                                       // 전면 가동 — 리벳 박힌 철판이 밀려온다
    const w = h.w;
    c.globalAlpha = f; c.fillStyle = '#6a707c'; c.fillRect(x - w / 2, top, w, bot - top);
    c.strokeStyle = '#1e2026'; c.lineWidth = 1.5; c.strokeRect(x - w / 2 + 0.5, top + 0.5, w - 1, bot - top - 1);
    c.fillStyle = '#9aa0ac'; c.fillRect(x - w / 2 + 2, top + 2, 3, bot - top - 4);
    c.fillStyle = '#c8ccd6'; for (let yy = top + 8; yy < bot - 4; yy += 16) { c.beginPath(); c.arc(x - w * 0.25, yy, 1.6, 0, TAU); c.arc(x + w * 0.25, yy, 1.6, 0, TAU); c.fill(); }
    c.save(); c.beginPath(); c.rect(x - w / 2, bot - 8, w, 8); c.clip();
    c.fillStyle = '#f0c030'; c.fillRect(x - w / 2, bot - 8, w, 8);
    c.fillStyle = '#1e1e1e'; for (let i = -w; i < w; i += 8) { poly(c, [x + i, bot, x + i + 4, bot, x + i + 12, bot - 8, x + i + 8, bot - 8]); c.fill(); }
    c.restore();
    if (Math.sin(T * 30) > 0) { c.fillStyle = '#ffe08a'; c.fillRect(x - (Math.sign(h.vx) || 1) * w / 2, bot - 3, 2, 2); }
    c.globalAlpha = 1;
  }
};

/** 내려앉은 자리에서 양옆으로 달리는 충격파 */
export const WAVE_ART: Record<string, (c: C2, h: Bag, x: number, y: number, T: number) => void> = {
  rock(c, h, x, y) {                                                     // 땅이 들려 흙덩이가 튄다
    const s = Math.sign(h.vx) || 1;
    c.fillStyle = '#6a5438'; c.strokeStyle = '#2a2014'; c.lineWidth = 1.3;
    poly(c, [x - s * h.w, y, x - s * h.w * 0.3, y - h.hh * 0.7, x + s * h.w * 0.2, y - h.hh, x + s * h.w * 0.5, y]); c.fill(); c.stroke();
    for (let i = 0; i < 3; i++) rock(c, h.sd + i + Math.floor(h.t * 8), x - s * (i * 9), y - h.hh * (0.9 + i * 0.3), 3 + i, h.t * 9);
  },
  gel(c, h, x, y, T) {                                                   // 젤 물결
    const s = Math.sign(h.vx) || 1, hh = h.hh * (1 + Math.sin(T * 20) * 0.08);
    c.fillStyle = 'rgba(111,168,255,.8)'; c.strokeStyle = '#1e3a7a'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - s * h.w * 1.4, y); c.quadraticCurveTo(x - s * h.w * 0.3, y - hh * 1.2, x + s * h.w * 0.3, y - hh * 0.5);
    c.quadraticCurveTo(x + s * h.w * 0.6, y - hh * 0.2, x + s * h.w * 0.6, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x - s * h.w * 0.2, y - hh * 0.75, 4, 2, -s * 0.5, 0, TAU); c.fill();
  },
  water(c, h, x, y, T) {
    WALL_ART.water(c, Object.assign({}, h, { w: h.w * 0.7 }), x, y - h.hh * 1.4, y, 1, T);
  }
};

/** 끌어당기는 것 — 무엇이 빨려 드는지가 이름이다 */
export const VORTEX_ART: Record<string, (c: C2, h: Bag, x: number, y: number, f: number, T: number) => void> = {
  flesh(c, h, x, y, f, T) {                                              // 흡혈 소용돌이 — 핏줄기가 나선으로 심장에 빨려 든다
    c.save(); c.translate(x, y);
    for (let i = 0; i < 5; i++) {
      c.globalAlpha = f * 0.75; c.strokeStyle = i % 2 ? '#8a1a2a' : '#d04a64'; c.lineWidth = 3.5 - i * 0.4;
      c.beginPath();
      for (let j = 0; j <= 30; j++) { const u = j / 30, a = T * 2.4 + i * TAU / 5 + u * 4, r = h.r * 0.55 * (1 - u * 0.85); const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.6; if (j) c.lineTo(px, py); else c.moveTo(px, py); }
      c.stroke();
    }
    c.restore();
    for (let i = 0; i < 22; i++) {
      const u = (T * 0.6 + hs(h.sd, i)) % 1, a = hs(h.sd, i + 3) * TAU + u * 4, d = h.r * 0.75 * (1 - u);
      c.globalAlpha = f * (0.5 + u * 0.5); c.fillStyle = '#d0304a';
      c.beginPath(); c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 3.5, 6, a + Math.PI / 2, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  },
  void(c, h, x, y, f, T) {                                               // 사건의 지평선 — 빛을 삼키는 검은 원과 도는 원반
    const R = Math.min(70, h.r * 0.18);
    c.save(); c.translate(x, y); c.globalAlpha = f;
    for (let i = 0; i < 3; i++) {
      c.save(); c.scale(1, 0.32); c.rotate(T * (1.2 + i * 0.4));
      c.strokeStyle = i ? 'rgba(200,150,255,.55)' : 'rgba(255,220,255,.9)'; c.lineWidth = 4 - i;
      c.beginPath(); c.arc(0, 0, R * (1.8 + i * 0.5), 0, TAU * 0.8); c.stroke(); c.restore();
    }
    c.fillStyle = '#05000c'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.strokeStyle = '#d8b0ff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R + 1, 0, TAU); c.stroke();
    c.restore(); c.globalAlpha = 1;
    for (let i = 0; i < 10; i++) { const u = (T * 0.5 + hs(h.sd, i)) % 1, a = hs(h.sd, i + 5) * TAU + u * 3, d = h.r * 0.7 * (1 - u) + R;
      c.fillStyle = `rgba(220,200,255,${f * u})`; c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 2, 2); }
  },
  grav(c, h, x, y, f, T) {                                               // 중력 우물 — 휘어 내려앉는 별 그물
    c.globalAlpha = f * 0.7; c.strokeStyle = '#b48aff'; c.lineWidth = 1;
    for (let i = 1; i <= 5; i++) { const r = h.r * 0.16 * i * (1 - ((T * 0.3) % 0.2)); c.beginPath(); c.ellipse(x, y + i * 3, r, r * 0.35, 0, 0, TAU); c.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * h.r * 0.8, y + Math.sin(a) * h.r * 0.28); c.quadraticCurveTo(x + Math.cos(a) * h.r * 0.3, y + 18, x, y + 16); c.stroke(); }
    for (let i = 0; i < 12; i++) { const u = (T * 0.4 + hs(h.sd, i)) % 1, a = hs(h.sd, i + 2) * TAU + u * 5, d = h.r * 0.8 * (1 - u);
      c.fillStyle = '#fff0c0'; c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.35 + u * 16, 2, 2); }
    c.globalAlpha = 1;
  },
  sand(c, h, x, y, f, T) {                                               // 유사 늪 — 바닥이 돌며 가라앉는다
    c.save(); c.translate(x, y - 2); c.scale(1, 0.25); c.globalAlpha = f;
    const g = c.createRadialGradient(0, 0, 4, 0, 0, h.r * 0.6);
    g.addColorStop(0, 'rgba(90,60,30,.9)'); g.addColorStop(1, 'rgba(232,192,112,.0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, h.r * 0.6, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(200,160,90,.8)'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, h.r * (0.12 + i * 0.12), T * 2 + i, T * 2 + i + 2.4); c.stroke(); }
    c.restore(); c.globalAlpha = 1;
  },
  maw(c, h, x, y, f, T) {                                                // 집어삼키기 — 바람줄이 아가리로 쏠린다
    c.globalAlpha = f; c.strokeStyle = 'rgba(220,200,255,.7)'; c.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const u = (T * 1.4 + hs(h.sd, i)) % 1, a = (hs(h.sd, i + 1) - 0.5) * 1.6 + (hs(h.sd, i + 7) > 0.5 ? 0 : Math.PI), d = h.r * 0.9 * (1 - u);
      const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d * 0.5;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + (x - sx) * 0.15, sy + (y - sy) * 0.15); c.stroke();
    }
    c.globalAlpha = 1;
  },
  water(c, h, x, y, f, T) {                                              // 소용돌이 · 심연의 물결 — 물 나선과 물거품
    c.save(); c.translate(x, y); c.globalAlpha = f;
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = i % 2 ? 'rgba(120,200,255,.7)' : 'rgba(230,248,255,.8)'; c.lineWidth = 3 - i * 0.5;
      c.beginPath();
      for (let j = 0; j <= 40; j++) { const u = j / 40, a = -T * 3 + i * TAU / 4 + u * 5, r = h.r * 0.75 * (1 - u * 0.9); const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.45; if (j) c.lineTo(px, py); else c.moveTo(px, py); }
      c.stroke();
    }
    c.fillStyle = 'rgba(10,30,60,.8)'; c.beginPath(); c.ellipse(0, 0, 10, 4, 0, 0, TAU); c.fill();
    c.restore(); c.globalAlpha = 1;
  },
  clock(c, h, x, y, f, T) {                                              // 원점 회귀 — 거꾸로 도는 시계판
    c.globalAlpha = f; c.strokeStyle = '#bcd8f4'; c.lineWidth = 2;
    const R = Math.min(90, h.r * 0.25);
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * R * 0.86, y + Math.sin(a) * R * 0.86); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke(); }
    c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(-T * 6) * R * 0.8, y + Math.sin(-T * 6) * R * 0.8); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(-T * 0.8) * R * 0.5, y + Math.sin(-T * 0.8) * R * 0.5); c.stroke();
    c.lineWidth = 1; c.setLineDash([3, 6]); c.beginPath(); c.arc(x, y, h.r * 0.7, -T, -T + 4); c.stroke(); c.setLineDash([]);
    c.globalAlpha = 1;
  },
  pit(c, h, x, y, f, T) {                                                // 삼키는 구멍 — 돌 부스러기가 구멍으로 빨려 든다
    c.globalAlpha = f; c.fillStyle = '#0e0a06'; c.beginPath(); c.ellipse(x, y + 4, 28, 9, 0, 0, TAU); c.fill();
    for (let i = 0; i < 12; i++) { const u = (T * 0.5 + hs(h.sd, i)) % 1, a = hs(h.sd, i + 3) * TAU + u * 3, d = h.r * 0.7 * (1 - u) + 20;
      rock(c, h.sd + i, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.35, 2 + hs(h.sd, i) * 3, u * 6); }
    c.globalAlpha = 1;
  }
};

/** 광선 — 겨눔(tele) 동안은 가는 선, 그 뒤 기술마다 제 결 */
export const BEAM_ART: Record<string, (c: C2, h: Bag, x: number, y: number, len: number, w: number, fade: number, T: number) => void> = {
  frost(c, h, x, y, len, w, fade, T) {                                   // 절대 영도 — 서리 줄기를 따라 얼음이 맺힌다
    const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
    const g = c.createLinearGradient(0, -w, 0, w); g.addColorStop(0, 'rgba(160,220,255,0)'); g.addColorStop(0.5, 'rgba(230,250,255,.95)'); g.addColorStop(1, 'rgba(160,220,255,0)');
    c.fillStyle = g; c.fillRect(0, -w, len, w * 2);
    c.globalCompositeOperation = op;
    for (let s = 30; s < len; s += 46) { c.save(); c.translate(s, (hs(h.sd, s) - 0.5) * w); c.rotate(T + s); for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.fillStyle = '#e8fbff'; c.fillRect(-6, -1, 12, 2); } c.restore(); }
    c.globalAlpha = 1;
  },
  void(c, h, x, y, len, w, fade, T) {                                    // 공허 광선 — 가운데가 검고 가장자리가 보라로 탄다
    c.globalAlpha = fade;
    const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(160,100,255,.55)'; c.fillRect(0, -w * 0.9, len, w * 1.8);
    c.globalCompositeOperation = op;
    c.fillStyle = '#0a0014'; c.fillRect(0, -w * 0.45, len, w * 0.9);
    c.strokeStyle = '#e0c8ff'; c.lineWidth = 1.5; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, s * w * 0.45); for (let i = 0; i < len; i += 20) c.lineTo(i, s * w * 0.45 + Math.sin(T * 30 + i * 0.1) * 2); c.stroke(); }
    c.globalAlpha = 1;
  },
  rune(c, h, x, y, len, w, fade, T) {                                    // 파수 광선 — 금빛 줄기에 룬이 흘러간다
    const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
    const g = c.createLinearGradient(0, -w, 0, w); g.addColorStop(0, 'rgba(232,216,160,0)'); g.addColorStop(0.5, 'rgba(255,248,210,.95)'); g.addColorStop(1, 'rgba(232,216,160,0)');
    c.fillStyle = g; c.fillRect(0, -w, len, w * 2);
    c.strokeStyle = '#fff8d0'; c.lineWidth = 1.5;
    for (let s = (T * 160) % 60; s < len; s += 60) { c.beginPath(); c.moveTo(s, -w * 0.6); c.lineTo(s, w * 0.6); c.moveTo(s, -w * 0.2); c.lineTo(s + 8, -w * 0.6); c.stroke(); }
    c.globalCompositeOperation = op; c.globalAlpha = 1;
  },
  thorn(c, h, x, y, len, w, fade, T) {                                   // 가시 채찍 — 빛이 아니라 휘두르는 가시덩굴
    c.globalAlpha = fade;
    const p: number[] = []; for (let i = 0; i <= 14; i++) { const u = i / 14; p.push(len * u, Math.sin(u * 6 - T * 14) * w * 0.35 * u); }
    strokePath(c, p, '#1e3a10', w * 0.55 + 3); strokePath(c, p, '#5a9a32', w * 0.55);
    c.fillStyle = '#e8e0b0';
    for (let i = 1; i < 14; i++) { const px = p[i * 2], py = p[i * 2 + 1], s = i % 2 ? 1 : -1; poly(c, [px - 3, py + s * w * 0.2, px + 3, py + s * w * 0.2, px + 1, py + s * w * 0.55]); c.fill(); }
    c.globalAlpha = 1;
  },
  water(c, h, x, y, len, w, fade, T) {                                   // 심해 광선 — 물줄기와 거품
    c.globalAlpha = fade;
    const g = c.createLinearGradient(0, -w, 0, w); g.addColorStop(0, 'rgba(40,120,200,0)'); g.addColorStop(0.5, 'rgba(160,220,255,.9)'); g.addColorStop(1, 'rgba(40,120,200,0)');
    c.fillStyle = g; c.fillRect(0, -w, len, w * 2);
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const s = ((T * 300 + hs(h.sd, i) * len) % len); c.beginPath(); c.arc(s, (hs(h.sd, i + 1) - 0.5) * w, 2 + hs(h.sd, i + 2) * 3, 0, TAU); c.stroke(); }
    c.globalAlpha = 1;
  },
  fire(c, h, x, y, len, w, fade, T) {                                    // 최초의 불 — 혀를 날름거리는 불줄기
    const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
    for (const [col, k] of [['rgba(255,90,26,.6)', 1], ['rgba(255,160,48,.75)', 0.65], ['rgba(255,240,160,.95)', 0.3]] as [string, number][]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, -w * k);
      for (let s = 0; s <= len; s += 24) c.lineTo(s, -w * k * (0.8 + Math.sin(T * 24 + s * 0.08) * 0.25));
      for (let s = len; s >= 0; s -= 24) c.lineTo(s, w * k * (0.8 + Math.sin(T * 20 + s * 0.1) * 0.25));
      c.closePath(); c.fill();
    }
    c.globalCompositeOperation = op; c.globalAlpha = 1;
  },
  laser(c, h, x, y, len, w, fade, T) {                                   // 레이저 격자 — 가는 붉은 줄과 쏘는 눈
    const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
    c.fillStyle = 'rgba(255,40,40,.45)'; c.fillRect(0, -w * 0.5, len, w);
    c.fillStyle = '#ffe0e0'; c.fillRect(0, -1.5, len, 3);
    c.globalCompositeOperation = op;
    c.fillStyle = '#3a3e48'; c.fillRect(-10, -9, 14, 18); c.fillStyle = Math.sin(T * 30) > 0 ? '#ff4030' : '#ffd0c0'; c.fillRect(-2, -3, 5, 6);
    c.globalAlpha = 1;
  },
  blueprint(c, h, x, y, len, w, fade, T) {                               // 설계선 — 치수선 · 눈금 · 모눈
    c.globalAlpha = fade;
    c.fillStyle = 'rgba(120,200,255,.25)'; c.fillRect(0, -w * 0.5, len, w);
    c.strokeStyle = '#cfefff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(len, 0); c.stroke();
    c.lineWidth = 1;
    for (let s = 0; s < len; s += 30) { c.beginPath(); c.moveTo(s, -w * 0.5); c.lineTo(s, s % 90 === 0 ? w * 0.5 : -w * 0.15); c.stroke(); }
    for (const s of [-1, 1]) { c.setLineDash([8, 6]); c.beginPath(); c.moveTo(0, s * w * 0.5); c.lineTo(len, s * w * 0.5); c.stroke(); c.setLineDash([]); }
    c.globalAlpha = 1;
  },
  star(c, h, x, y, len, w, fade, T) {                                    // 궤도 광선 — 흰 줄기에 별빛이 반짝인다
    const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
    const g = c.createLinearGradient(0, -w, 0, w); g.addColorStop(0, 'rgba(150,190,255,0)'); g.addColorStop(0.5, 'rgba(240,248,255,.95)'); g.addColorStop(1, 'rgba(150,190,255,0)');
    c.fillStyle = g; c.fillRect(0, -w, len, w * 2);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) { const s = (hs(h.sd, i) * len + T * 80) % len, yy = (hs(h.sd, i + 3) - 0.5) * w * 1.6, r = 1 + Math.abs(Math.sin(T * 9 + i)) * 2.5;
      c.fillRect(s - r, yy - 0.5, r * 2, 1); c.fillRect(s - 0.5, yy - r, 1, r * 2); }
    c.globalCompositeOperation = op; c.globalAlpha = 1;
  }
};

/** 바람 · 컨베이어 — 화면을 지나 미는 힘이 무엇인지 */
export function drawPush(c: C2, h: Bag, camX: number, camY: number, W: number, H: number, T: number, f: number) {
  const dirAt = (px: number) => Math.sign(h.force) * Math.sign(px - h.x || 1);
  if (h.fx === 'conveyor') {                                             // 역회전 컨베이어 — 바닥에 흐르는 화살 띠
    const y = (h.fy || h.y || 0) - camY;
    c.globalAlpha = f;
    for (let sx = -40; sx < W + 40; sx += 22) {
      const wx = sx + camX, d = dirAt(wx), off = ((T * 120) % 22) * d;
      const px = sx + off;
      c.fillStyle = '#2a2a30'; c.fillRect(px - 11, y - 5, 22, 5);
      c.fillStyle = '#f0c030'; poly(c, [px - 4 * d, y - 4.5, px + 3 * d, y - 2.5, px - 4 * d, y - 0.5]); c.fill();
    }
    c.globalAlpha = 1; return;
  }
  c.strokeStyle = `rgba(230,240,255,${0.8 * f})`; c.lineWidth = 2;   // 폭풍 — 빗줄기 섞인 바람줄과 날리는 잎
  for (let i = 0; i < 26; i++) {
    const yy = hs(h.sd || 1, i) * H, u = (T * (1.4 + hs(h.sd || 1, i + 1)) + hs(h.sd || 1, i + 2)) % 1;
    const wx = camX + W / 2, d = dirAt(wx + (u - 0.5) * W), xx = d > 0 ? u * W : (1 - u) * W, L = 30 + hs(h.sd || 1, i + 3) * 40;
    c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx - d * L, yy - 3); c.stroke();
    if (i % 4 === 0) { c.fillStyle = `rgba(150,190,110,${0.8 * f})`; c.beginPath(); c.ellipse(xx + d * 6, yy + Math.sin(T * 9 + i) * 4, 3, 1.5, T * 8 + i, 0, TAU); c.fill(); }
  }
}
