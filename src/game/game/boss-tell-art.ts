/* ===== game/boss-tell-art.js — 기술 예고(보스 몸에 맺히는 것) · 거울 분신 · 보스 탄의 그림 ===== */
import { TAU } from '../../engine/core/math.js';
import { Sprites } from '../sprites.js';
import { bone, cracks, glob, glyph, hs, hzGlow, icicle, islet, jag, meteorRock, poly, rgba, rock, seedPod,
  strokePath } from './boss-hazard-art.js';
/* ★ 모든 기술을 같은 진(원) 하나로 예고하지 않는다 — 몸에 무엇이 맺히는지로 다음 기술을 읽는다(엠프레스 오브 라이트 · 할로우 나이트).
   얼음 창 비는 머리 위에 고드름이 자라고, 고동 파문은 고리가 몸으로 빨려 들고, 되감기는 거꾸로 도는 시계가 뜬다. */

type C2 = CanvasRenderingContext2D;
type Box = { x: number; y: number; w: number; h: number; cx: number; cy: number; feet: number; face: number };

/** 머리 위에 모이는 것 — rain · march(하늘) */
function overhead(c: C2, fx: string, b: Box, k: number, T: number, sd: number) {
  const y0 = b.y - 18 - k * 10, S = Math.max(1, Math.min(2.2, b.w / 70));   // 큰 보스는 소품도 크게
  c.save(); c.translate(b.cx, y0); c.scale(S, S); c.translate(-b.cx, -y0);
  switch (fx) {
    case 'ice': for (let i = 0; i < 3; i++) icicle(c, b.cx + (i - 1) * 16, y0 - 26, 8 + k * 18 * (i === 1 ? 1.2 : 0.9), 7); break;
    case 'bone': for (let i = 0; i < 5; i++) bone(c, b.cx + Math.cos(T * 2 + i * 1.26) * 26, y0 + Math.sin(T * 2 + i * 1.26) * 8, 12 * k + 4, T * 3 + i, 3); break;
    case 'rune': for (let i = 0; i < 4; i++) glyph(c, sd + i, b.cx + (i - 1.5) * 14, y0 - Math.sin(T * 4 + i) * 3, 5, rgba('#fff0c0', 0.5 + k * 0.5)); break;
    case 'meteor': for (let i = 0; i < 3; i++) meteorRock(c, sd + i, b.cx + (i - 1) * 40, y0 - 40 - i * 10, 3 + k * 3, 30, 60); break;
    case 'seed': seedPod(c, b.cx + b.face * b.w * 0.4, b.cy - 6, 5 + k * 5, T * 3); break;
    case 'bile': {
      const mx = b.cx + b.face * b.w * 0.35, my = b.cy - b.h * 0.1;
      glob(c, mx, my, 3 + k * 5, '#b8d050', '#3a4a10');
      for (let i = 0; i < 2; i++) { const u = (T * 1.5 + i * 0.5) % 1; glob(c, mx, my + u * 30, 2, '#b8d050', '#3a4a10'); }
    } break;
    case 'spore': for (let i = 0; i < 6; i++) { const u = (T * 0.8 + i / 6) % 1; c.fillStyle = rgba('#8ff0c8', 0.6 * (1 - u)); c.beginPath(); c.arc(b.cx + Math.sin(i * 2 + T) * b.w * 0.3, b.y - u * 40, 4 + u * 8, 0, TAU); c.fill(); } break;
    case 'fire': for (let i = 0; i < 3; i++) { glob(c, b.cx + (i - 1) * 18, y0 - 6, 3 + k * 3, '#ffb050', '#7a2a08'); hzGlow(c, b.cx + (i - 1) * 18, y0 - 6, 12, '#ff8a3a', 0.5); } break;
    case 'boulder': islet(c, sd, b.cx, b.y - 10 - b.h * 0.25 * k, b.w * 0.25 * (0.4 + k * 0.6), Math.sin(T * 3) * 0.1); break;
    case 'bolt': {
      const hx = b.cx + b.face * b.w * 0.3, hy = b.y + 4;
      for (let i = 0; i < 3; i++) strokePath(c, jag(sd + i + Math.floor(T * 20), hx, hy, hx + (hs(sd, i + Math.floor(T * 20)) - 0.5) * 30, hy - 20 - k * 20, 4, 4), 'rgba(220,240,255,.9)', 1.3);
      hzGlow(c, hx, hy, 14 + k * 10, '#cfe6ff', 0.6);
    } break;
    case 'sun': {
      const sy = b.y - 30;
      hzGlow(c, b.cx, sy, 18 + k * 18, '#ffe08a', 0.8);
      c.strokeStyle = rgba('#fff0b0', 0.6 + k * 0.4); c.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + T; c.beginPath(); c.moveTo(b.cx + Math.cos(a) * 10, sy + Math.sin(a) * 10); c.lineTo(b.cx + Math.cos(a) * (16 + k * 10), sy + Math.sin(a) * (16 + k * 10)); c.stroke(); }
    } break;
    default: hzGlow(c, b.cx, y0, 14, '#ffffff', 0.4 * k);
  }
}
/** 발밑에서 퍼지는 것 — march(땅) · wall · burrow · leap · quake */
function underfoot(c: C2, fx: string, b: Box, k: number, T: number, sd: number) {
  const y = b.feet, x = b.cx;
  switch (fx) {
    case 'flesh': for (const s of [-1, 1]) strokePath(c, jag(sd + s, x, y - 1, x + s * (b.w * 0.5 + k * 60), y - 2, 6, 2), 'rgba(200,60,90,.9)', 2.2); break;
    case 'plant': for (const s of [-1, 1]) { strokePath(c, jag(sd + s, x, y - 1, x + s * (b.w * 0.5 + k * 50), y - 3, 5, 3), '#4a2e16', 3); strokePath(c, [x + s * (b.w * 0.4 + k * 40), y - 2, x + s * (b.w * 0.42 + k * 40), y - 6 - Math.sin(T * 10) * 2], '#6aa040', 1.5); } break;
    case 'rune': for (let i = 0; i < 4; i++) glyph(c, sd + i, x + b.face * (b.w * 0.5 + i * 16 * k), y - 6, 4, rgba('#e8d8a0', 0.4 + k * 0.6)); break;
    case 'fire': for (const s of [-1, 1]) { c.fillStyle = rgba('#ff8a3a', 0.5 + k * 0.5); c.fillRect(x + s * b.w * 0.5, y - 2, s * k * 70, 2); hzGlow(c, x + s * (b.w * 0.5 + k * 70), y - 2, 10, '#ff8a3a', 0.6); } break;
    case 'metal': for (const s of [-1, 1]) { c.save(); c.translate(x + s * b.w * 0.45, y - 8); c.rotate(T * 4 * s); c.fillStyle = '#7a808c'; c.strokeStyle = '#1e2026'; for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.fillRect(-1.5, -8, 3, 3); } c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill(); c.stroke(); c.restore(); } break;
    case 'ice': for (let i = 0; i < 5; i++) icicle(c, x + (i - 2) * b.w * 0.22, y, 4 + k * 10 * hs(sd, i), 5, true); break;
    case 'sand': for (let i = 0; i < 10; i++) { const u = (T * 2 + hs(sd, i)) % 1; c.fillStyle = rgba('#e8c070', 0.7 * (1 - u)); c.fillRect(x + (hs(sd, i + 2) - 0.5) * b.w * 1.4, y - u * 30 * k, 2, 2); } break;
    case 'water': { c.fillStyle = 'rgba(120,200,255,.6)'; c.beginPath(); c.ellipse(x, y - 2, b.w * (0.5 + k * 0.4), 3 + k * 5, 0, Math.PI, TAU); c.fill(); } break;
    case 'bolt': for (let i = 0; i < 3; i++) strokePath(c, jag(sd + i + Math.floor(T * 24), x + (i - 1) * b.w * 0.3, y, x + (i - 1) * b.w * 0.3, y - 10 - k * 14, 3, 3), '#dff0ff', 1.2); break;
    default: {                                                         // 흙 — 금이 가고 돌이 들썩인다
      cracks(c, sd, x, y - 1, b.w * 0.5 + k * 30, 'rgba(40,30,20,.9)', 1, 6);
      for (let i = 0; i < 4; i++) rock(c, sd + i, x + (hs(sd, i) - 0.5) * b.w * 1.2, y - 3 - Math.abs(Math.sin(T * 12 + i)) * 6 * k, 2 + hs(sd, i + 4) * 2);
    }
  }
}

/** 고유 기술의 예고 — 닮은 틀 기술의 소품을 빌린다 [갈래, 결] */
const SIG_TELL: Record<string, [string, string]> = {
  slap: ['leap', 'gel'], bubbles: ['quake', ''], sink: ['leap', 'gel'], surge: ['leap', 'gel'], sweep: ['wall', 'bone'], pipes: ['ring', ''], scatter: ['blink', ''], requiem: ['ring', ''], beat: ['ring', ''], mirrors: ['clones', ''], veil: ['vortex', 'void'], rods: ['rain', 'bolt'],
  scales: ['rain', 'rune'], gaze: ['rain', 'meteor'], cart: ['wall', 'metal'], snowball: ['wall', 'ice'], grapple: ['beam', 'thorn'], dune: ['wall', 'sand'],
  garden: ['zone', 'spore'], tongue: ['rain', 'bile'], anchor: ['wall', 'water'], islet: ['rain', 'boulder'], flood: ['wall', 'water'], turrets: ['wall', 'metal'],
  pour: ['rain', 'fire'], drones: ['beam', 'laser'], project: ['beam', 'blueprint'], veins: ['quake', '']
};
/** 기술 갈래(mk) · 결(fx) 마다 예고 — 보스 몸에 맺히는 것 */
export function drawTell(c: C2, h: Bag, b: Box, k: number, T: number) {
  const sd = h.sd || 1, fx = h.fx || '', col = h.c || '#ffffff';
  if (h.mk === 'sig') { const t = SIG_TELL[h.sig]; if (t) drawTell(c, Object.assign({}, h, { mk: t[0], fx: t[1] }), b, k, T); return; }
  switch (h.mk) {
    case 'rain': overhead(c, fx, b, k, T, sd); break;
    case 'march': if (fx === 'bolt' || fx === 'sun') overhead(c, fx, b, k, T, sd); else underfoot(c, fx, b, k, T, sd); break;
    case 'quake': case 'burrow': case 'leap': underfoot(c, h.mk === 'leap' && fx === 'gel' ? 'water' : '', b, k, T, sd); break;
    case 'wall': underfoot(c, fx, b, k, T, sd); break;
    case 'beam': {                                                     // 몸 앞에 맺히는 빛 — 결마다 다른 핵
      const x = b.cx + b.face * b.w * 0.3, y = b.cy - b.h * 0.1, r = 4 + k * 10;
      if (fx === 'thorn') { const p: number[] = []; for (let i = 0; i <= 10; i++) { const a = i * 0.9 + T * 4, rr = 6 + i * 2; p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6); } strokePath(c, p, '#2e4a16', 4); strokePath(c, p, '#6a9a3a', 2.2); break; }
      if (fx === 'laser') { for (const s of [-1, 1]) { c.fillStyle = '#3a3e48'; c.fillRect(x - 5 + s * 10, y - 5, 10, 10); hzGlow(c, x + s * 10, y, 6 + k * 6, '#ff4030', 0.9); } break; }
      if (fx === 'blueprint') { c.strokeStyle = rgba('#cfefff', 0.5 + k * 0.5); c.lineWidth = 1; c.strokeRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3); c.beginPath(); c.moveTo(x - r * 2.5, y); c.lineTo(x + r * 2.5, y); c.moveTo(x, y - r * 2.5); c.lineTo(x, y + r * 2.5); c.stroke(); break; }
      const core = fx === 'void' ? '#0a0014' : fx === 'frost' ? '#e8fbff' : fx === 'fire' ? '#fff0a0' : fx === 'water' ? '#d0f0ff' : '#fff8e0';
      hzGlow(c, x, y, r * 3, col, 0.7);
      c.fillStyle = core; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      if (fx === 'void') { c.strokeStyle = '#d8b0ff'; c.lineWidth = 1.5; c.stroke(); }
      c.strokeStyle = rgba(col, 0.8); c.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + T * 2, d = (1 - ((T * 2 + i / 6) % 1)) * 50 + r; c.beginPath(); c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); c.lineTo(x + Math.cos(a) * (d - 8), y + Math.sin(a) * (d - 8)); c.stroke(); }
    } break;
    case 'ring': {                                                     // 고리가 몸으로 빨려 들며 뛴다(박동)
      const R = Math.max(b.w, b.h) * 0.7;
      for (let i = 0; i < 3; i++) { const u = (T * 1.6 + i / 3) % 1; c.strokeStyle = rgba(col, 0.7 * u); c.lineWidth = 2; c.beginPath(); c.ellipse(b.cx, b.cy, R * (1.6 - u), R * (1.6 - u) * 0.9, 0, 0, TAU); c.stroke(); }
      hzGlow(c, b.cx, b.cy, R * (0.4 + Math.abs(Math.sin(T * 8)) * 0.3), col, 0.5 * k);
    } break;
    case 'spiral': {                                                   // 탄이 몸 둘레를 돌며 늘어난다
      const n = Math.ceil(3 + k * 6), R = Math.max(b.w, b.h) * 0.6;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + T * 3; drawBossProjAt(c, h.proj || 'void', b.cx + Math.cos(a) * R, b.cy + Math.sin(a) * R * 0.7, a + Math.PI / 2, T, sd + i, col); }
    } break;
    case 'homing': {
      const n = h.cnt || 4;
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5, R = b.h * 0.5 + 10 * k; c.globalAlpha = 0.4 + k * 0.6; drawBossProjAt(c, h.proj || 'dark', b.cx + Math.cos(a) * R, b.cy + Math.sin(a) * R, a, T, sd + i, col); }
      c.globalAlpha = 1;
    } break;
    case 'dash': {                                                     // 몸을 낮추고 뒤로 바람줄 — 앞발 밑엔 흙먼지
      c.strokeStyle = rgba(col, 0.7); c.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const yy = b.y + b.h * (0.2 + i * 0.15), L = 20 + k * 30 + hs(sd, i) * 10; c.beginPath(); c.moveTo(b.cx - b.face * b.w * 0.5, yy); c.lineTo(b.cx - b.face * (b.w * 0.5 + L), yy); c.stroke(); }
      for (let i = 0; i < 4; i++) { const u = (T * 3 + i / 4) % 1; c.fillStyle = `rgba(150,130,110,${0.6 * (1 - u)})`; c.beginPath(); c.arc(b.cx - b.face * (b.w * 0.3 + u * 30), b.feet - 3 - u * 8, 3 + u * 4, 0, TAU); c.fill(); }
    } break;
    case 'blink': {
      for (let i = 0; i < 3; i++) { const p = jag(sd + i + Math.floor(T * 12), b.cx + (hs(sd, i) - 0.5) * b.w, b.y, b.cx + (hs(sd, i + 3) - 0.5) * b.w, b.feet, 5, 6); strokePath(c, p, rgba(col, 0.8), 1.5); }
    } break;
    case 'vortex': {                                                   // 알갱이가 몸으로 빨려 든다 — 무엇이 빨려 드는지는 결 그대로
      const R = Math.max(b.w, b.h) * 1.4;
      for (let i = 0; i < 14; i++) {
        const u = (T * 0.9 + hs(sd, i)) % 1, a = hs(sd, i + 4) * TAU + u * 3, d = R * (1 - u) + b.w * 0.2;
        const px = b.cx + Math.cos(a) * d, py = b.cy + Math.sin(a) * d * 0.7;
        if (fx === 'pit' || fx === 'sand') { c.fillStyle = rgba(fx === 'sand' ? '#e8c070' : '#8a7a5a', u); c.fillRect(px, py, 3, 3); }
        else if (fx === 'flesh') { c.fillStyle = rgba('#c0304a', u); c.beginPath(); c.arc(px, py, 2.5, 0, TAU); c.fill(); }
        else if (fx === 'water') { c.strokeStyle = rgba('#e8f8ff', u); c.lineWidth = 1; c.beginPath(); c.arc(px, py, 2.5, 0, TAU); c.stroke(); }
        else { c.fillStyle = rgba(col, u); c.fillRect(px, py, 2, 2); }
      }
    } break;
    case 'zone': {                                                     // 몸에서 흘러내리는 것
      for (let i = 0; i < 4; i++) {
        const u = (T * 1.2 + i / 4) % 1, px = b.cx + (hs(sd, i) - 0.5) * b.w * 0.8, py = b.y + b.h * 0.6 + u * b.h * 0.45;
        if (fx === 'gel') glob(c, px, py, 3 + k * 2, '#8fbaff', '#1e3a7a');
        else if (fx === 'spore') { c.fillStyle = rgba('#8ff0c8', 0.5 * (1 - u)); c.beginPath(); c.arc(px, b.y - u * 30, 5 + u * 8, 0, TAU); c.fill(); }
        else { c.fillStyle = rgba('#e8fbff', 0.6 * (1 - u)); c.beginPath(); c.arc(px, b.feet - u * 12, 4 + u * 6, 0, TAU); c.fill(); }
      }
    } break;
    case 'summon': {                                                   // 발치 땅에서 눈빛이 뜬다
      for (let i = 0; i < 3; i++) {
        const px = b.cx + (i - 1) * (b.w * 0.6 + 20), up = k * 8;
        c.fillStyle = '#1a140e'; c.beginPath(); c.ellipse(px, b.feet - 1, 10, 3 + up * 0.3, 0, Math.PI, TAU); c.fill();
        if (k > 0.3) { c.fillStyle = rgba(col, k); c.fillRect(px - 4, b.feet - 3 - up * 0.4, 2, 2); c.fillRect(px + 2, b.feet - 3 - up * 0.4, 2, 2); }
      }
    } break;
    case 'push': {
      if (fx === 'conveyor') { underfoot(c, 'metal', b, k, T, sd); break; }
      c.strokeStyle = rgba('#e8f4ff', 0.6); c.lineWidth = 1.5;               // 숨을 들이켜듯 바람이 몸으로 모인다
      for (let i = 0; i < 10; i++) { const u = (T * 1.5 + i / 10) % 1, a = i / 10 * TAU, d = (1 - u) * 90 + b.w * 0.4; c.beginPath(); c.arc(b.cx, b.cy, d, a, a + 0.5); c.stroke(); }
    } break;
    case 'rewind': {                                                   // 거꾸로 도는 시계
      const R = Math.max(b.w, b.h) * 0.6;
      c.strokeStyle = rgba(col, 0.8); c.lineWidth = 2; c.beginPath(); c.arc(b.cx, b.cy, R, 0, TAU); c.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(b.cx + Math.cos(a) * R * 0.88, b.cy + Math.sin(a) * R * 0.88); c.lineTo(b.cx + Math.cos(a) * R, b.cy + Math.sin(a) * R); c.stroke(); }
      c.lineWidth = 3; c.beginPath(); c.moveTo(b.cx, b.cy); c.lineTo(b.cx + Math.cos(-T * 9) * R * 0.8, b.cy + Math.sin(-T * 9) * R * 0.8); c.stroke();
    } break;
    case 'clones': {                                                   // 얼음 거울 조각이 몸 둘레에 맺힌다
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + T * 1.5, R = b.w * 0.9; mirrorShard(c, b.cx + Math.cos(a) * R, b.cy + Math.sin(a) * R * 0.5, 8 + k * 8); }
    } break;
  }
}

function mirrorShard(c: C2, x: number, y: number, s: number) {
  poly(c, [x, y - s, x + s * 0.55, y - s * 0.3, x + s * 0.4, y + s, x - s * 0.5, y + s * 0.6, x - s * 0.55, y - s * 0.4]);
  const g = c.createLinearGradient(x - s, y - s, x + s, y + s); g.addColorStop(0, '#e8fbff'); g.addColorStop(0.5, '#9fd8f4'); g.addColorStop(1, '#f0fcff');
  c.fillStyle = g; c.fill(); c.strokeStyle = '#2f5f86'; c.lineWidth = 1.2; c.stroke();
}

/** 거울 분신 — 얼음 거울 틀 속 마녀(진짜는 그중 하나) */
export function drawDecoy(c: C2, h: Bag, x: number, y: number, f: number, T: number) {
  const W = Math.max(36, h.r * 0.75), H = h.r * 1.25;
  c.globalAlpha = f;
  poly(c, [x, y - H / 2 - 10, x + W / 2, y - H / 2 + 6, x + W / 2, y + H / 2 - 6, x, y + H / 2 + 10, x - W / 2, y + H / 2 - 6, x - W / 2, y - H / 2 + 6]);
  c.fillStyle = 'rgba(160,215,245,.35)'; c.fill(); c.strokeStyle = '#e8fbff'; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#2f5f86'; c.lineWidth = 1; c.stroke();
  const key = h.type && Sprites.frostSheet && Sprites.frostSheet(h.type) ? 'frost_' + h.type : h.type;
  const m = key && Sprites.meta && (Sprites.meta.bosses.sheets[key] || Sprites.meta.characters.sheets[key]);
  if (m) {
    const S = Sprites.sc(m), fw = m.frameW * S, fh = m.frameH * S;
    c.save(); c.beginPath(); c.rect(x - W / 2, y - H / 2, W, H); c.clip();
    c.globalAlpha = f * (0.55 + Math.sin(T * 6) * 0.1);
    Sprites.draw(c, key, Math.floor(T * 4) % 2, x - fw / 2, y + H / 2 - fh + 4, h.flip);
    c.restore();
  }
  c.globalAlpha = f * 0.8; c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x - W * 0.3, y - H * 0.3); c.lineTo(x - W * 0.05, y - H * 0.42); c.stroke();
  c.globalAlpha = 1;
}

/** 제 그림이 있는 탄 */
export const BOSS_PROJ: Record<string, number> = { skull: 1, bone: 1, rivet: 1, poison: 1, cagebub: 1, web: 1, fruit: 1, gel: 1, drop: 1 };
/** 보스 탄 — 이름 그대로의 물건(울부짖는 해골 · 뼈 · 리벳 · 포자 · 거품 감옥). 그렸으면 true */
export function drawBossProjAt(c: C2, type: string, x: number, y: number, a: number, T: number, sd: number, col?: string) {
  switch (type) {
    case 'skull': {
      c.save(); c.translate(x, y); if (Math.cos(a) < 0) c.scale(-1, 1);
      const ga = c.globalAlpha;
      c.globalAlpha = ga * 0.45; c.fillStyle = '#bfe8ff';                 // 넋 꼬리
      c.beginPath(); c.moveTo(-4, -5); c.quadraticCurveTo(-18, -2 + Math.sin(T * 12 + sd) * 3, -24, 0); c.quadraticCurveTo(-18, 3, -4, 5); c.fill();
      c.globalAlpha = ga; c.fillStyle = '#efe6cc'; c.strokeStyle = '#4a4030'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(0, -1, 7, 0, TAU); c.fill(); c.stroke();
      const jaw = 2 + Math.abs(Math.sin(T * 14 + sd)) * 3;                // 울부짖는 턱
      c.beginPath(); c.rect(-4, 4, 8, jaw); c.fill(); c.stroke();
      c.fillStyle = '#1a1410'; c.beginPath(); c.arc(-2.5, -2, 2, 0, TAU); c.arc(3, -2, 2, 0, TAU); c.fill();
      c.fillStyle = '#9fe0ff'; c.fillRect(-3, -2.5, 1, 1); c.fillRect(2.5, -2.5, 1, 1);
      c.restore(); return true;
    }
    case 'bone': bone(c, x, y, 14, T * 14 + sd, 3.5); return true;
    case 'rivet': {
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = '#9aa0ac'; c.strokeStyle = '#2a2c32'; c.lineWidth = 1; c.fillRect(-7, -2, 10, 4); c.strokeRect(-7, -2, 10, 4);
      c.fillStyle = '#c8ccd6'; c.beginPath(); c.ellipse(4, 0, 3, 5, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,220,140,.8)'; c.fillRect(-14, -0.5, 6, 1);
      c.restore(); return true;
    }
    case 'poison': {                                                   // 포자 — 솜털 덩이
      for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU + T * 3; c.fillStyle = 'rgba(143,240,200,.45)'; c.beginPath(); c.arc(x + Math.cos(aa) * 4, y + Math.sin(aa) * 4, 3.5, 0, TAU); c.fill(); }
      c.fillStyle = '#c8ffe0'; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill();
      c.fillStyle = '#4a9a6a'; c.fillRect(x - 1, y - 1, 2, 2);
      return true;
    }
    case 'cagebub': {                                                  // 거품 감옥 — 맞으면 갇히는 물방울
      const r = 9 + Math.sin(T * 8 + sd) * 1;
      c.fillStyle = 'rgba(160,220,255,.25)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(20,50,90,.6)'; c.lineWidth = 2.5; c.stroke();
      c.strokeStyle = '#e8f8ff'; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = 'rgba(200,240,255,.7)'; c.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * r * 0.5, y - r * 0.85); c.lineTo(x + i * r * 0.5, y + r * 0.85); c.stroke(); }
      c.fillStyle = '#ffffff'; c.fillRect(x - r * 0.45, y - r * 0.5, 2, 2);
      return true;
    }
    case 'web': {                                                      // 거미줄 덩이 — 바퀴살 + 동심 줄, 꽁무니에 실
      c.save(); c.translate(x, y); c.rotate(T * 2 + sd);
      c.strokeStyle = 'rgba(240,242,248,.9)'; c.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(aa) * 8, Math.sin(aa) * 8); c.stroke(); }
      for (const r of [3, 6]) { c.beginPath(); for (let i = 0; i <= 6; i++) { const aa = i / 6 * TAU; c[i ? 'lineTo' : 'moveTo'](Math.cos(aa) * r, Math.sin(aa) * r); } c.stroke(); }
      c.restore();
      c.strokeStyle = 'rgba(240,242,248,.45)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(a) * 26, y - Math.sin(a) * 26); c.stroke();
      return true;
    }
    case 'gel': {                                                      // 젤리 덩이 — 출렁이며 날고 속에 기포가 돈다
      const r = 7, sq = 1 + Math.sin(T * 10 + sd) * 0.12;
      c.save(); c.translate(x, y); c.rotate(a); c.scale(sq, 2 - sq);
      c.fillStyle = 'rgba(111,168,255,.75)'; c.strokeStyle = '#1e3a78'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(220,240,255,.9)'; c.beginPath(); c.ellipse(-2.5, -2.5, 2.6, 1.6, -0.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(200,230,255,.6)'; c.beginPath(); c.arc(Math.cos(T * 4 + sd) * 3, Math.sin(T * 4 + sd) * 3, 1.5, 0, TAU); c.fill();
      c.restore(); return true;
    }
    case 'sludge': {                                                   // 잿물 덩이 — 무겁게 처진 방울 · 속에 불씨
      const sq = 1 + Math.sin(T * 9 + sd) * 0.1;
      c.save(); c.translate(x, y); c.rotate(a); c.scale(sq, 2 - sq);
      c.fillStyle = '#4a4541'; c.strokeStyle = '#1c1a18'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(9, 0); c.quadraticCurveTo(2, -8, -6, -5); c.arc(-5, 0, 5, -Math.PI / 2, Math.PI / 2, true); c.quadraticCurveTo(2, 8, 9, 0); c.fill(); c.stroke();
      c.fillStyle = 'rgba(200,190,176,.6)'; c.beginPath(); c.ellipse(-1, -3, 2.6, 1.2, -0.3, 0, TAU); c.fill();
      c.fillStyle = '#ff8a40'; c.fillRect(-3 + Math.sin(T * 5 + sd) * 1.5, 1, 2, 2);
      c.restore(); return true;
    }
    case 'note': {                                                     // 관이 낸 음 — 혼불 음표(머리 · 기둥 · 깃) · 뒤로 음파 고리
      const wob = Math.sin(T * 12 + sd) * 0.25;
      hzGlow(c, x, y, 16, '#9ff0d0', 0.55);
      c.strokeStyle = 'rgba(159,240,208,.5)'; c.lineWidth = 1.5;
      for (let i = 1; i <= 2; i++) { c.beginPath(); c.arc(x - Math.cos(a) * i * 7, y - Math.sin(a) * i * 7, 4 + i * 3, a + Math.PI - 0.8, a + Math.PI + 0.8); c.stroke(); }
      c.save(); c.translate(x, y); c.rotate(wob);
      c.fillStyle = '#e8fff4'; c.strokeStyle = '#2a5a4a'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(-2, 3, 4.4, 3.2, -0.4, 0, TAU); c.fill(); c.stroke();
      c.fillRect(1.6, -9, 1.8, 12); c.beginPath(); c.moveTo(3.4, -9); c.quadraticCurveTo(9, -6, 6, -1); c.lineTo(3.4, -5); c.closePath(); c.fill();
      c.restore(); return true;
    }
    case 'drop': {                                                     // 물방울 — 나는 쪽으로 뾰족한 방울, 뒤로 잔물방울
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = 'rgba(127,200,232,.85)'; c.strokeStyle = '#1a4a68'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(9, 0); c.quadraticCurveTo(0, -7, -5, -4); c.arc(-4, 0, 4, -Math.PI / 2, Math.PI / 2, true); c.quadraticCurveTo(0, 7, 9, 0); c.fill(); c.stroke();
      c.fillStyle = '#e8f8ff'; c.fillRect(-3, -3, 2, 2);
      c.fillStyle = 'rgba(160,220,245,.6)'; c.beginPath(); c.arc(-12, Math.sin(T * 12 + sd) * 2, 2, 0, TAU); c.fill();
      c.restore(); return true;
    }
    case 'fruit': {                                                    // 열매 — 돌며 날아간다(꼭지 잎)
      c.save(); c.translate(x, y); c.rotate(T * 9 + sd);
      c.fillStyle = '#c8641e'; c.strokeStyle = '#5a2a0a'; c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, 5.5, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#f0a050'; c.beginPath(); c.arc(-1.8, -1.8, 1.8, 0, TAU); c.fill();
      c.fillStyle = '#4a8a2a'; c.beginPath(); c.ellipse(1, -6, 3, 1.4, -0.5, 0, TAU); c.fill();
      c.restore(); return true;
    }
  }
  if (col) { hzGlow(c, x, y, 10, col, 0.6); c.fillStyle = col; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); return true; }
  return false;
}
