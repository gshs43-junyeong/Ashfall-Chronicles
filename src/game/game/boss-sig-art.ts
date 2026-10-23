/* ===== game/boss-sig-art.js — 보스 고유 기술의 그림 — 잿물 팔 · 뼈 무더기 · 얼음 거울 · 어둠 장막 · 피뢰침 · 저울 · 눈 · 레일 · 덩굴 · 버섯 · 혀 · 사슬 · 밀물 · 포탑 · 도가니 · 드론 · 설계 유령 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { Game } from '../game.js';
import { STRIKE_ART, bone, cracks, glob, glyph, hs, hzGlow, jag, poly, rgba, rock, strokePath } from './boss-hazard-art.js';
import { WALL_ART, WAVE_ART } from './boss-field-art.js';
import { drawArm } from './boss-pool-art.js';
/* 고유 기술은 그 보스만의 물건을 보여야 한다 — 이름이 '광차 돌진'이면 레일과 광차가, '피뢰침'이면 꽂힌 쇠막대와 그 사이 전류가 보인다. */

type C2 = CanvasRenderingContext2D;

/** 얼음 거울 — 육각 틀(속에 마녀가 비친다) */
function mirror(c: C2, x: number, y: number, W: number, H: number, a: number) {
  c.globalAlpha = a;
  poly(c, [x, y - H / 2 - 8, x + W / 2, y - H / 2 + 5, x + W / 2, y + H / 2 - 5, x, y + H / 2 + 8, x - W / 2, y + H / 2 - 5, x - W / 2, y - H / 2 + 5]);
  const g = c.createLinearGradient(x - W / 2, y - H / 2, x + W / 2, y + H / 2);
  g.addColorStop(0, 'rgba(230,250,255,.55)'); g.addColorStop(0.5, 'rgba(150,210,240,.3)'); g.addColorStop(1, 'rgba(230,250,255,.55)');
  c.fillStyle = g; c.fill(); c.strokeStyle = '#e8fbff'; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#2f5f86'; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - W * 0.3, y - H * 0.25); c.lineTo(x - W * 0.05, y - H * 0.38); c.stroke();
  c.globalAlpha = 1;
}
/** 뾰족한 침(피뢰침) */
function rod(c: C2, x: number, y: number, hgt: number) {
  c.fillStyle = '#4a4e58'; c.fillRect(x - 2, y - hgt, 4, hgt);
  c.fillStyle = '#9aa0ac'; c.fillRect(x - 2, y - hgt, 1.5, hgt);
  poly(c, [x - 4, y - hgt, x + 4, y - hgt, x, y - hgt - 10]); c.fillStyle = '#c8ccd6'; c.fill(); c.strokeStyle = '#1e2026'; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#6a5438'; c.beginPath(); c.ellipse(x, y, 8, 3, 0, Math.PI, TAU); c.fill();
}
/** 버섯 — 자라며 갓이 부푼다 */
function shroom(c: C2, x: number, y: number, k: number, wob: number, col: string) {
  const hh = 8 + k * 20, r = 7 + k * 13;
  c.fillStyle = '#e8dcc0'; c.strokeStyle = '#4a3a28'; c.lineWidth = 1.2;
  c.beginPath(); c.rect(x - 4 - k * 2, y - hh, 8 + k * 4, hh); c.fill(); c.stroke();
  c.save(); c.translate(x, y - hh); c.scale(1 + wob, 1 - wob);
  c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r, r * 0.7, 0, Math.PI, TAU); c.closePath(); c.fill(); c.strokeStyle = '#2a1a30'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-r * 0.6 + i * r * 0.4, -r * 0.35 - (i % 2) * 2, 1.4 + (i % 2), 0, TAU); c.fill(); }
  c.restore();
}
function cart(c: C2, x: number, y: number, w: number, T: number, ore: boolean) {
  c.fillStyle = '#6a4a2a'; c.strokeStyle = '#2a1a0a'; c.lineWidth = 1.5;
  poly(c, [x - w / 2, y - 26, x + w / 2, y - 26, x + w / 2 - 4, y - 8, x - w / 2 + 4, y - 8]); c.fill(); c.stroke();
  c.fillStyle = '#8a6a40'; c.fillRect(x - w / 2 + 3, y - 24, w - 6, 3);
  if (ore) for (let i = 0; i < 4; i++) rock(c, i + 3, x - w * 0.3 + i * w * 0.2, y - 28 - (i % 2) * 3, 5);
  for (const s of [-1, 1]) {
    c.save(); c.translate(x + s * w * 0.3, y - 5); c.rotate(T * 14);
    c.fillStyle = '#3a3a40'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.strokeStyle = '#9aa0ac'; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke(); c.restore();
  }
}

/* ---------- 틀 그림에 더하는 것 ---------- */
Object.assign(STRIKE_ART, {
  gel: {                                                               // 녹아드는 왕관 — 웅덩이가 부풀었다 젤 기둥으로 솟는다
    tell(c: C2, h: Bag, x: number, y: number, k: number, T: number) {
      c.fillStyle = 'rgba(111,168,255,.6)'; c.strokeStyle = '#1e3a7a'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(x, y - 1, h.r * (0.6 + k * 0.4), 4 + k * 6 + Math.sin(T * 20) * 1.5, 0, Math.PI, TAU); c.closePath(); c.fill(); c.stroke();
      for (let i = 0; i < 4; i++) { const u = (T * 2 + hs(h.sd, i)) % 1; c.strokeStyle = 'rgba(220,235,255,.8)'; c.beginPath(); c.arc(x + (hs(h.sd, i + 2) - 0.5) * h.r, y - 4 - u * 10, 2 + u * 3, 0, TAU); c.stroke(); }
    },
    hit(c: C2, h: Bag, x: number, y: number, f: number) {
      const up = Math.min(1, f * 5) * (1 - Math.max(0, f - 0.6) / 0.4), hh = 150 * up, w = h.r * 0.9;
      c.fillStyle = 'rgba(111,168,255,.85)'; c.strokeStyle = '#1e3a7a'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.3, y - hh * 0.6, x - w * 0.15, y - hh); c.quadraticCurveTo(x, y - hh - 14, x + w * 0.15, y - hh);
      c.quadraticCurveTo(x + w * 0.3, y - hh * 0.6, x + w, y); c.closePath(); c.fill(); c.stroke();
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.15 + 0.7 * hs(h.sd, i)), d = f * 90; glob(c, x + Math.cos(a) * d, y - hh + Math.sin(a) * d * 0.5 + f * f * 60, 4, '#8fbaff', '#1e3a7a'); }
    }
  },
  claw: {                                                              // 어둠 속 눈 — 두 눈빛이 다가와 할퀸다
    tell(c: C2, h: Bag, x: number, y: number, k: number, T: number) {
      const ox = (h.sx ?? h.x) - h.x + x, oy = (h.sy ?? h.y) - h.y + y - 30, u = k * k;
      const ex = ox + (x - ox) * u, ey = oy + (y - 40 - oy) * u, bl = Math.sin(T * 9 + h.sd) > 0.9 ? 0.2 : 1;
      for (const s of [-1, 1]) { hzGlow(c, ex + s * 9, ey, 10, '#c8a0ff', 0.8); c.fillStyle = `rgba(255,240,255,${bl})`; c.beginPath(); c.ellipse(ex + s * 9, ey, 4, 2.2 * bl + 0.3, 0, 0, TAU); c.fill(); }
      c.strokeStyle = rgba('#a06fff', 0.3 + k * 0.4); c.lineWidth = 1; c.setLineDash([3, 5]); c.beginPath(); c.ellipse(x, y - 1, h.r, h.r * 0.26, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    },
    hit(c: C2, h: Bag, x: number, y: number, f: number) {
      const a = 1 - f;
      for (let i = 0; i < 3; i++) { c.globalAlpha = a; strokePath(c, [x - h.r * 0.6 + i * 12, y - h.r * 1.1, x - h.r * 0.1 + i * 12, y - h.r * 0.5, x + h.r * 0.2 + i * 12, y - 4], '#e0c8ff', 4 * a + 1); }
      c.globalAlpha = 1;
    }
  },
  ore: {                                                               // 광맥 폭발 — 바닥의 광맥이 빛나다 결정이 터진다
    tell(c: C2, h: Bag, x: number, y: number, k: number, T: number) {
      cracks(c, h.sd, x, y - 1, h.r, rgba('#ffd060', 0.4 + k * 0.6), 1, 6);
      const p = Math.abs(Math.sin(T * (4 + k * 18)));
      for (let i = 0; i < 4; i++) {
        const px = x + (hs(h.sd, i) - 0.5) * h.r * 1.4, s = 3 + hs(h.sd, i + 3) * 3;
        poly(c, [px, y - 2 - s * 2, px + s, y - 2, px - s, y - 2]); c.fillStyle = i % 2 ? '#ffd060' : '#80e0ff'; c.fill(); c.strokeStyle = '#3a2a10'; c.lineWidth = 1; c.stroke();
        hzGlow(c, px, y - 4, 8 + k * 10, i % 2 ? '#ffd060' : '#80e0ff', 0.3 + p * 0.5 * k);
      }
    },
    hit(c: C2, h: Bag, x: number, y: number, f: number) {
      const a = 1 - f; hzGlow(c, x, y - 10, h.r * 1.4 * (1 - f * 0.5), '#ffd060', 0.8 * a);
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI * (0.05 + 0.9 * hs(h.sd, i)), d = f * (30 + 60 * hs(h.sd, i + 5)), s = 3 + hs(h.sd, i + 9) * 3;
        const px = x + Math.cos(ang) * d, py = y - 8 + Math.sin(ang) * d + f * f * 40;
        c.globalAlpha = a; poly(c, [px, py - s, px + s * 0.6, py, px, py + s, px - s * 0.6, py]); c.fillStyle = i % 2 ? '#ffd060' : '#80e0ff'; c.fill();
      }
      c.globalAlpha = 1;
    }
  },
  anchor: {                                                            // 닻 — 포물선으로 날아와 바닥에 박힌다
    tell(c: C2, h: Bag, x: number, y: number, k: number, T: number) {
      c.globalAlpha = 0.25 + k * 0.4; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y - 1, h.r * 0.6, h.r * 0.15, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      if (h.sx === undefined) return;
      const ox = h.sx - h.x + x, oy = h.sy - h.y + y, px = ox + (x - ox) * k, py = oy + (y - 20 - oy) * k - Math.sin(k * Math.PI) * 160;
      strokePath(c, [ox, oy, (ox + px) / 2, Math.max(oy, py) + 20, px, py], '#6a7078', 2);
      drawAnchor(c, px, py, T * 6);
    },
    hit(c: C2, h: Bag, x: number, y: number) { drawAnchor(c, x, y - 16, 0); }
  }
});
function drawAnchor(c: C2, x: number, y: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.strokeStyle = '#2a3038'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 12); c.moveTo(-7, -9); c.lineTo(7, -9); c.stroke();
  c.beginPath(); c.arc(0, 4, 11, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  c.strokeStyle = '#8a96a4'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 12); c.moveTo(-7, -9); c.lineTo(7, -9); c.stroke();
  c.beginPath(); c.arc(0, 4, 11, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  c.beginPath(); c.arc(0, -17, 3, 0, TAU); c.stroke();
  c.restore();
}
Object.assign(WAVE_ART, {
  flesh(c: C2, h: Bag, x: number, y: number, T: number) {              // 고동 — 바닥 밑 살이 부풀어 밀려간다
    const s = Math.sign(h.vx) || 1, hh = h.hh * (1 + Math.sin(T * 30) * 0.1);
    c.fillStyle = '#9a2a48'; c.strokeStyle = '#3a0c18'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - s * h.w * 1.6, y); c.quadraticCurveTo(x - s * h.w * 0.2, y - hh * 1.3, x + s * h.w * 0.6, y); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,150,180,.7)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x - s * h.w, y - 2); c.quadraticCurveTo(x - s * h.w * 0.2, y - hh * 0.8, x + s * h.w * 0.3, y - 2); c.stroke();
  },
  snowball(c: C2, h: Bag, x: number, y: number) {                      // 눈사태 — 구르며 커지는 눈덩이
    const r = h.hh / 2, s = Math.sign(h.vx) || 1, rot = h.x / Math.max(8, r) * s;
    c.save(); c.translate(x, y - r); c.rotate(rot);
    const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b8d8ec');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = '#5a7a98'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#9ab8d0'; for (let i = 0; i < 5; i++) { const a = hs(h.sd, i) * TAU; c.beginPath(); c.arc(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.12, 0, TAU); c.fill(); }
    c.restore();
    c.fillStyle = 'rgba(240,250,255,.8)'; for (let i = 0; i < 3; i++) c.fillRect(x - s * (r + 4 + i * 6), y - 3 - i * 2, 3, 3);
  },
  molten(c: C2, h: Bag, x: number, y: number, T: number) {             // 흐르는 쇳물
    const s = Math.sign(h.vx) || 1;
    c.fillStyle = '#ff8a3a'; c.beginPath(); c.moveTo(x - s * h.w * 1.8, y); c.quadraticCurveTo(x, y - h.hh * (1.1 + Math.sin(T * 20) * 0.1), x + s * h.w * 0.6, y); c.closePath(); c.fill();
    c.fillStyle = '#fff0a0'; c.beginPath(); c.ellipse(x, y - h.hh * 0.4, h.w * 0.4, 2, 0, 0, TAU); c.fill();
    hzGlow(c, x, y - 6, h.w * 1.4, '#ff8a3a', 0.6);
  }
});
Object.assign(WALL_ART, {
  cart(c: C2, h: Bag, x: number, top: number, bot: number, f: number, T: number) { c.globalAlpha = f; strokePath(c, [x - 30, bot - 1, x + 30, bot - 1], '#6a6a72', 2); cart(c, x, bot, h.w, T, true); c.globalAlpha = 1; },
  dune(c: C2, h: Bag, x: number, top: number, bot: number, f: number, T: number) {   // 사구 해일 — 모래 언덕이 굴러온다
    const s = Math.sign(h.vx) || 1, w = h.w;
    c.globalAlpha = f;
    c.beginPath(); c.moveTo(x - s * w, bot); c.quadraticCurveTo(x - s * w * 0.4, top - 6, x + s * w * 0.15, top + 4);
    c.quadraticCurveTo(x + s * w * 0.45, top + 16, x + s * w * 0.5, bot); c.closePath();
    const g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#f4d690'); g.addColorStop(1, '#b88a48');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#6a4a20'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = 'rgba(255,240,200,.6)'; c.lineWidth = 1;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - s * w * (0.8 - i * 0.2), bot - 6 - i * 8); c.quadraticCurveTo(x - s * w * 0.3, top + 8 + i * 6, x + s * w * 0.1, top + 10 + i * 8); c.stroke(); }
    c.fillStyle = `rgba(250,220,150,${0.8 * f})`; for (let i = 0; i < 8; i++) { const u = (T * 2 + hs(h.sd, i)) % 1; c.fillRect(x + s * w * 0.2 + s * u * 20, top + 4 + hs(h.sd, i + 3) * (bot - top) - u * 12, 2, 2); }
    c.globalAlpha = 1;
  }
});

export const BossSigArtPart: Bag = {
  /** 고유 기술 위험 지대 그림 — 그렸으면 true */
  drawSig(c: C2, h: Bag, cx0: number, cy0: number, T: number) {
    const b = this.hzBoss(h), f = Math.min(1, h.t * 4, Math.max(0, h.life - h.t) * 3);
    switch (h.k) {
      case 'parm': drawArm(c, h, b, cx0, cy0, T); return true;    // 잿물 군체의 팔(game/boss-pool-art)
      case 'bonepile': {                                               // 흩어진 뼈 — 굴러가다 다시 솟아 맞춰진다
        if (!b || h.t < 0.3) return true;
        const x = b.cx - cx0, y = b.y + b.h - cy0, up = b.burrowT > 0 ? 0 : 1;
        c.globalAlpha = f;
        for (let i = 0; i < 12; i++) {
          const a = hs(h.sd, i) * TAU, rr = 6 + hs(h.sd, i + 2) * b.w * 0.4;
          bone(c, x + Math.cos(a) * rr, y - 4 - Math.abs(Math.sin(a)) * 8 - up * 20 * hs(h.sd, i + 5), 12 + hs(h.sd, i + 7) * 8, a + T * (b.vx ? 6 : 0), 3);
        }
        c.fillStyle = '#efe6cc'; c.beginPath(); c.arc(x + Math.sin(T * 8) * 6, y - 10, 8, 0, TAU); c.fill(); c.strokeStyle = '#4a4030'; c.stroke();
        c.fillStyle = '#1a1410'; c.fillRect(x - 4 + Math.sin(T * 8) * 6, y - 12, 2.5, 2.5); c.fillRect(x + 1 + Math.sin(T * 8) * 6, y - 12, 2.5, 2.5);
        c.globalAlpha = 1; return true;
      }
      case 'pulse': {                                                  // 박동 — 뛸 때마다 심장 둘레가 확 부푼다
        if (!b) return true;
        const u = (h.t % h.every) / h.every, x = b.cx - cx0, y = b.cy - cy0, R = Math.max(b.w, b.h) * (0.55 + u * 0.6);
        c.globalAlpha = (1 - u) * 0.8; c.strokeStyle = '#ff5a7a'; c.lineWidth = 4 * (1 - u) + 1;
        c.beginPath(); c.ellipse(x, y, R, R * 0.9, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
        hzGlow(c, x, y, R * 0.7, '#c04a6a', 0.5 * (1 - u));
        return true;
      }
      case 'mirror': {
        const x = h.x - cx0, y = h.y - cy0, k = Math.min(1, h.t / h.fireAt), W = 30, H = 46;
        mirror(c, x, y, W, H, f);
        if (!h.fired) { hzGlow(c, x, y, 10 + k * 16, '#bfefff', k * 0.8); }
        return true;
      }
      case 'veil': {                                                   // 어둠 장막 — 내 둘레만 남는다
        const me = this.me; if (!me) return true;
        const x = me.cx - cx0, y = me.cy - cy0, R = 120;
        const g = c.createRadialGradient(x, y, R * 0.6, x, y, R * 1.6);
        g.addColorStop(0, 'rgba(8,0,16,0)'); g.addColorStop(1, `rgba(8,0,16,${0.92 * f})`);
        c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
        return true;
      }
      case 'rod': { const x = h.x - cx0, y = h.y - cy0, up = Math.min(1, h.t * 5); c.globalAlpha = f; rod(c, x, y, 54 * up); c.globalAlpha = 1; if (h.t > 1.0 && h.t < 1.3) hzGlow(c, x, y - 54, 24, '#cfe6ff', 0.9); return true; }
      case 'arc': {                                                    // 침과 침 사이 무릎 높이 전류 — 켜지고 꺼진다
        const on = h.t > h.on0 && (h.t - h.on0) % 0.7 < 0.38, x0 = h.x0 - cx0, y0 = h.y0 - cy0, x1 = h.x1 - cx0, y1 = h.y1 - cy0;
        if (!on) { c.globalAlpha = 0.3 * f; c.setLineDash([3, 6]); strokePath(c, [x0, y0, x1, y1], '#cfe6ff', 1); c.setLineDash([]); c.globalAlpha = 1; return true; }
        const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = f;
        for (let i = 0; i < 2; i++) { const p = jag(h.sd + i + Math.floor(T * 30), x0, y0, x1, y1, 10, 7); strokePath(c, p, 'rgba(120,180,255,.6)', 6); strokePath(c, p, '#ffffff', 1.5); }
        c.globalCompositeOperation = op; c.globalAlpha = 1; return true;
      }
      case 'scales': {                                                 // 판결의 저울 — 두 접시, 판결 뒤 한쪽이 내려앉고 룬이 꺼진다
        const x = h.x - cx0, y = h.y - cy0, k = Math.min(1, Math.max(0, (h.t - h.judge) / 0.4)), tilt = h.doom * 0.25 * k;
        const py = y - 150;
        c.globalAlpha = f;
        c.strokeStyle = '#e8d8a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, py - 40); c.lineTo(x, py + 30); c.stroke();
        c.save(); c.translate(x, py - 30); c.rotate(tilt);
        c.beginPath(); c.moveTo(-170, 0); c.lineTo(170, 0); c.stroke();
        for (const s of [-1, 1]) {
          c.lineWidth = 1; c.beginPath(); c.moveTo(s * 170, 0); c.lineTo(s * 150, 30); c.moveTo(s * 170, 0); c.lineTo(s * 190, 30); c.stroke();
          c.save(); c.translate(s * 170, 30); c.rotate(-tilt);
          c.fillStyle = '#b8a060'; c.beginPath(); c.ellipse(0, 0, 26, 6, 0, 0, Math.PI); c.fill(); c.strokeStyle = '#4a3a18'; c.stroke();
          const lit = s === h.doom ? 1 - k : 1;
          glyph(c, h.doom * s + 5, 0, -8, 6, rgba('#fff0c0', 0.2 + 0.8 * lit));
          c.restore(); c.strokeStyle = '#e8d8a0'; c.lineWidth = 3;
        }
        c.restore();
        c.strokeStyle = rgba('#e8d8a0', 0.4); c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(x, y); c.lineTo(x, py); c.stroke(); c.setLineDash([]);
        if (k > 0) { c.fillStyle = rgba('#3a1a10', 0.25 * k); c.fillRect(h.doom > 0 ? x : x - 330, y - 200, 330, 200); }
        c.globalAlpha = 1; return true;
      }
      case 'gaze': {                                                   // 응시 — 화면 위쪽에 뜬 눈(보스 체력 막대 밑)
        const x = h.ex - cx0, y = 118, op = Math.min(1, h.t * 2, (h.life - h.t) * 2);
        c.globalAlpha = op;
        c.fillStyle = '#1a0a24'; c.beginPath(); c.ellipse(x, y, 46, 20 * op, 0, 0, TAU); c.fill();
        c.fillStyle = '#e8d8ff'; c.beginPath(); c.ellipse(x, y, 40, 16 * op, 0, 0, TAU); c.fill();
        c.fillStyle = '#7a3ad8'; c.beginPath(); c.arc(x, y + 2, 11 * op, 0, TAU); c.fill();
        c.fillStyle = '#05000a'; c.beginPath(); c.ellipse(x, y + 2, 3, 9 * op, 0, 0, TAU); c.fill();
        hzGlow(c, x, y, 70, '#b48aff', 0.35);
        c.strokeStyle = 'rgba(180,138,255,.25)'; c.lineWidth = 10; c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x, h.ey - cy0); c.stroke();
        c.globalAlpha = 1; return true;
      }
      case 'rail': {                                                   // 광차 레일
        const y = h.y - cy0, x0 = h.x0 - cx0, x1 = h.x1 - cx0, n = Math.min(1, h.t * 3), xe = x0 + (x1 - x0) * n;
        c.globalAlpha = f;
        for (let xx = Math.min(x0, xe); xx < Math.max(x0, xe); xx += 14) { c.fillStyle = '#5a3a1e'; c.fillRect(xx, y - 3, 8, 3); }
        strokePath(c, [x0, y - 4, xe, y - 4], '#9aa0ac', 2);
        c.globalAlpha = 1; return true;
      }
      case 'vine': {                                                   // 갈고리 덩굴 — 보스에서 천장으로
        if (!b) return true;
        const bx = b.cx - cx0, by = b.cy - cy0, ax = h.ax - cx0, ay = h.ay - cy0, u = Math.min(1, h.t / 0.35);
        const ex = bx + (ax - bx) * u, ey = by + (ay - by) * u, p: number[] = [];
        for (let i = 0; i <= 10; i++) { const v = i / 10; p.push(bx + (ex - bx) * v + Math.sin(v * 9 + T * 6) * 4, by + (ey - by) * v); }
        c.globalAlpha = f; strokePath(c, p, '#1e3a10', 6); strokePath(c, p, '#5a9a32', 3.5);
        c.fillStyle = '#7fd06a'; for (let i = 2; i < 10; i += 2) { c.beginPath(); c.ellipse(p[i * 2] + 4, p[i * 2 + 1], 4, 2, 0.6, 0, TAU); c.fill(); }
        if (u >= 1) { for (const s of [-1, 0, 1]) strokePath(c, [ax, ay, ax + s * 8, ay - 6], '#3a5a1e', 2.5); }
        c.globalAlpha = 1; return true;
      }
      case 'shroom': {
        const x = h.x - cx0, y = h.y - cy0;
        if (h.st) { c.globalAlpha = f; c.fillStyle = '#8a7a6a'; c.beginPath(); c.ellipse(x, y - 2, 12, 3, 0, 0, TAU); c.fill(); c.globalAlpha = 1; return true; }
        const k = Math.min(1, h.t / h.pop), wob = k > 0.75 ? Math.sin(T * 40) * 0.08 * k : 0;
        if (h.boom) { hzGlow(c, x, y - 18, 40, '#8ff0c8', f); return true; }
        shroom(c, x, y, k, wob, k > 0.75 ? '#c86aa8' : '#9a5ab8');
        if (k > 0.75) hzGlow(c, x, y - 18, 22, '#8ff0c8', (k - 0.75) * 2);
        return true;
      }
      case 'tongue': {                                                 // 포식자의 혀
        if (h.px === undefined) return true;
        const mx = h.mx - cx0, my = h.my - cy0, px = h.px - cx0, py = h.py - cy0;
        c.strokeStyle = '#4a1030'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx, my); c.quadraticCurveTo((mx + px) / 2, (my + py) / 2 + 20, px, py); c.stroke();
        c.strokeStyle = '#c84a7a'; c.lineWidth = 7; c.stroke();
        c.strokeStyle = 'rgba(255,170,200,.6)'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = '#e06a9a'; c.beginPath(); c.ellipse(px, py, 9, 7, 0, 0, TAU); c.fill(); c.strokeStyle = '#4a1030'; c.lineWidth = 1.5; c.stroke();
        if (h.cut) { c.fillStyle = '#ffffff'; c.fillRect(px - 2, py - 8, 4, 16); }
        return true;
      }
      case 'chain': {                                                  // 닻 사슬 — 고리 줄
        if (!b) return true;
        const x0 = b.cx - cx0, y0 = b.cy - cy0, x1 = h.ax - cx0, y1 = h.ay - cy0, L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(L / 9));
        c.globalAlpha = f; c.strokeStyle = '#8a96a4'; c.lineWidth = 2;
        for (let i = 0; i < n; i++) { const u = i / n; c.beginPath(); c.ellipse(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 5, 3, Math.atan2(y1 - y0, x1 - x0) + (i % 2 ? Math.PI / 2 : 0), 0, TAU); c.stroke(); }
        c.globalAlpha = 1; return true;
      }
      case 'flood': {                                                  // 밀물 — 화면 너비로 차오르는 물
        if (h.lv === undefined) return true;
        const y = h.lv - cy0, bot = h.y - cy0 + 40;
        if (bot <= y) return true;
        const g = c.createLinearGradient(0, y, 0, bot); g.addColorStop(0, 'rgba(110,190,240,.55)'); g.addColorStop(1, 'rgba(20,70,130,.7)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, bot);
        for (let x = 0; x <= this.W; x += 16) c.lineTo(x, y + Math.sin(x * 0.03 + T * 3) * 3);
        c.lineTo(this.W, bot); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(235,250,255,.8)'; c.lineWidth = 2; c.beginPath();
        for (let x = 0; x <= this.W; x += 16) { const yy = y + Math.sin(x * 0.03 + T * 3) * 3; if (x) c.lineTo(x, yy); else c.moveTo(x, yy); }
        c.stroke();
        return true;
      }
      case 'turret': {                                                 // 리벳 포탑 — 박힌 받침 + 도는 포신
        const x = h.x - cx0, y = h.y - cy0, up = Math.min(1, h.t * 4), hy = y - 16 * up;
        c.globalAlpha = f;
        c.fillStyle = '#5a5e68'; c.strokeStyle = '#1e2026'; c.lineWidth = 1.5;
        poly(c, [x - 15, y, x + 15, y, x + 10, y - 12 * up, x - 10, y - 12 * up]); c.fill(); c.stroke();
        c.fillStyle = '#f0c030'; c.fillRect(x - 13, y - 4, 26, 2);
        c.save(); c.translate(x, hy); c.rotate(h.aim ?? -Math.PI / 2);
        c.fillStyle = '#7a808c'; c.fillRect(0, -3.5, 22, 7); c.strokeRect(0, -3.5, 22, 7);
        c.fillStyle = '#2a2c32'; c.fillRect(19, -2, 3, 4); c.restore();
        c.fillStyle = '#9aa0ac'; c.beginPath(); c.arc(x, hy, 9, 0, TAU); c.fill(); c.stroke();
        hzGlow(c, x, hy, 7, '#ff4030', Math.sin(T * 12) > 0 ? 0.9 : 0.3);
        c.globalAlpha = 1; return true;
      }
      case 'crucible': {                                               // 도가니 — 기울어 쇳물을 쏟는다
        const x = h.x - cx0, top = h.top - cy0, y = h.y - cy0, tilt = Math.min(1, h.t / h.pour) * 1.1;
        c.globalAlpha = f;
        strokePath(c, [x - 60, top - 40, x - 14, top - 6], '#3a3a40', 3);
        c.save(); c.translate(x - 14, top); c.rotate(tilt);
        c.fillStyle = '#4a3a30'; c.strokeStyle = '#1a1008'; c.lineWidth = 1.5;
        poly(c, [-22, -18, 22, -18, 16, 12, -16, 12]); c.fill(); c.stroke();
        c.fillStyle = '#ffb050'; c.fillRect(-18, -18, 36, 4);
        c.restore();
        if (h.t > h.pour && h.t < h.stop) {
          const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(x - 10, 0, x + 10, 0); g.addColorStop(0, 'rgba(255,120,30,0)'); g.addColorStop(0.5, 'rgba(255,230,140,1)'); g.addColorStop(1, 'rgba(255,120,30,0)');
          c.fillStyle = g; c.fillRect(x - 10, top + 6, 20, y - top - 6);
          c.globalCompositeOperation = op;
          hzGlow(c, x, y - 4, 40, '#ff8a3a', 0.8);
        } else if (h.t < h.pour) hzGlow(c, x, y - 2, 30 * (h.t / h.pour), '#ff8a3a', 0.4);
        c.globalAlpha = 1; return true;
      }
      case 'drone': {                                                  // 점검 드론 — 훑는 빛 원뿔(경보면 붉게)
        if (h.x === undefined) return true;
        const x = h.x - cx0, y = h.y - cy0, fy = h.fy - cy0, w = (fy - y) * Math.tan(0.3), al = h.alT !== undefined && h.t - h.alT < 0.8;
        c.globalAlpha = f * 0.35; c.fillStyle = al ? '#ff4030' : '#fff6c0';
        poly(c, [x, y + 6, x + w, fy, x - w, fy]); c.fill();
        c.globalAlpha = f;
        c.fillStyle = '#5a5e68'; c.strokeStyle = '#1e2026'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, 14, 7, 0, 0, TAU); c.fill(); c.stroke();
        for (const s of [-1, 1]) { c.fillStyle = 'rgba(200,210,220,.6)'; c.fillRect(x + s * 14 - 7, y - 9 + Math.sin(T * 60) * 0.5, 14, 2); }
        hzGlow(c, x, y + 4, 8, al ? '#ff4030' : '#ffe08a', 0.9);
        c.globalAlpha = 1; return true;
      }
      case 'ghost': {                                                  // 설계 유령 — 다음 자리의 윤곽 · 번호 · 치수선
        const x = h.x - cx0, y = h.y - cy0, k = Math.min(1, h.t / Math.max(0.1, h.at)), m = Sprites.meta && Sprites.meta.bosses.sheets[h.type];
        c.globalAlpha = f * (h.t > h.at ? 0.3 : 0.75);
        if (m) {
          const S = Sprites.sc(m), fw = m.frameW * S, fh = m.frameH * S;
          c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.55;
          Sprites.draw(c, h.type, 0, x - fw / 2, y - fh, h.flip); c.restore();
        }
        c.strokeStyle = '#cfefff'; c.lineWidth = 1; c.setLineDash([5, 4]);
        c.strokeRect(x - 30, y - 92, 60, 92); c.setLineDash([]);
        c.beginPath(); c.moveTo(x - 40, y + 6); c.lineTo(x + 40, y + 6); c.moveTo(x - 40, y + 2); c.lineTo(x - 40, y + 10); c.moveTo(x + 40, y + 2); c.lineTo(x + 40, y + 10); c.stroke();
        c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillStyle = '#cfefff'; c.fillText(String(h.n), x, y - 98);
        c.strokeStyle = rgba('#cfefff', k); c.lineWidth = 2; c.beginPath(); c.arc(x, y - 104, 12, -Math.PI / 2, -Math.PI / 2 + k * TAU); c.stroke();
        c.globalAlpha = 1; return true;
      }
    }
    return false;
  },
};

mixin(Game.prototype, BossSigArtPart, true);
