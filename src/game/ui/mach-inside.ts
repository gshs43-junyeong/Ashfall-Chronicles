/* ===== ui/mach-inside.js — 기계 창 들여다보는 창 속 — 기계마다 실제로 일어나는 일 ===== */
/* 좌표는 창 속 판(높이 h = 40, 너비 w ≈ 80~120). 왼쪽 벽(x = 0, y ≈ 20)이 투입구 · 오른쪽 벽이 배출구 · 위(x = PIN · w, y = 0)가
   전선이 드는 자리 — 바깥 그림(mach-view)이 같은 자리에 구멍 · 콘센트를 그리므로 들어온 것이 어디로 가서 무엇이 되어 어디로 나가는지
   한 줄로 이어진다. q = 속 공정 몫(0~1), p = 전체 진행(0~IN 들어옴 · OUT~1 나감). 사연: docs/code-history.md#h193 */
import { mixHex } from '../../engine/core/color.js';
import { TAU, clamp, lerp } from '../../engine/core/math.js';
import { drawIc, glow } from './process.js';
import { bolt, cable, ease, firebox, hash, hotCol, ik2, matCol, motor, puffs, seg, sparks } from './mach-kit.js';

type C2 = CanvasRenderingContext2D;
/** 들어감 0~IN · 속 IN~OUT · 나옴 OUT~1 */
export const IN = 0.16, OUT = 0.86;
/** 전선이 창 위로 드는 자리(너비 몫) — 바깥 콘센트도 여기에 단다 */
export const PIN: Record<string, number> = {
  press: 0.34, pressor: 0.34, mill: 0.36, refinery: 0.34, desal: 0.34, assembler: 0.62, drill: 0.42, pump: 0.36,
  battery: 0.5, turret: 0.36, sprinkler: 0.5
};
/** 투입구로 들어오는 높이 · 배출구로 나가는 높이 */
export const IN_Y = 22, OUT_Y = 26;

export type Inside = {
  m: Bag; s: Bag; w: number; h: number; q: number; p: number; run: boolean; t: number;
  inId: string | null; outId: string | null; fuelId: string | null; pw: number; flow: number;
};

/** 들어오는 물건 — p 가 IN 까지 왼쪽 벽에서 (ex, ey) 로 */
function comeIn(c: C2, o: Inside, ex: number, ey: number, s = 12) {
  if (!o.inId || !o.run || o.p >= IN) return;
  const k = ease(o.p / IN); drawIc(c, o.inId, lerp(-s, ex, k), lerp(IN_Y - s / 2, ey, k), s);
}
/** 나가는 물건 — OUT 뒤로 (sx, sy) 에서 오른쪽 벽 밖으로 */
function goOut(c: C2, o: Inside, sx: number, sy: number, s = 12) {
  if (!o.outId || !o.run || o.p <= OUT) return;
  const k = ease((o.p - OUT) / (1 - OUT)); drawIc(c, o.outId, lerp(sx, o.w + 2, k), lerp(sy, OUT_Y - s / 2, k), s);
}
/** 연료를 화실 문으로 — 몇 초마다 한 덩이 */
function feedFuel(c: C2, o: Inside, fx: number, fy: number) {
  if (!o.fuelId || !o.run) return;
  const k = (o.t * 0.35) % 1;
  if (k > 0.3) return;
  const e = ease(k / 0.3); drawIc(c, o.fuelId, lerp(-4, fx - 5, e), lerp(IN_Y - 5, fy - 10, e) + Math.sin(e * Math.PI) * -5, 10 * (1 - e * 0.4));
}
/** 위에서 드는 전선 — 창 위(PIN)에서 받는 곳까지 */
function feedPower(c: C2, o: Inside, kind: string, tx: number, ty: number) {
  const x = (PIN[kind] || 0.5) * o.w;
  cable(c, [[x, -2], [x, Math.min(ty, 4)], [tx, Math.min(ty, 4)], [tx, ty]], o.pw * (o.run ? 1 : 0.15), o.t);
}

export function drawInside(c: C2, kind: string, o: Inside) {
  const { m, s, w, h, q, p, run, t, inId, outId } = o, cx = w / 2, bot = h;
  const busy = run && p >= IN && p <= OUT;
  c.fillStyle = '#121116'; c.fillRect(0, bot - 3, w, 3);                   // 바닥판
  switch (kind) {
    case 'smelter': {                    // 화실 위 도가니 — 광석이 녹아 끓고 → 기울어 붓고 → 틀에서 식어 굳는다
      firebox(c, 2, 26, w * 0.46, 12, run ? 1 : 0.15, t);
      feedFuel(c, o, w * 0.2, 30);
      c.fillStyle = '#3a3630'; c.beginPath(); c.moveTo(0, 18); c.lineTo(w * 0.13, 12); c.lineTo(w * 0.13, 14); c.lineTo(0, 20); c.fill();   // 투입 비탈
      comeIn(c, o, w * 0.1, 3, 9);
      const pour = seg(q, 0.5, 0.62) * (1 - seg(q, 0.74, 0.8)), lx = w * 0.42, ly = 11;
      const melt = seg(q, 0, 0.45), level = p < IN ? 0 : q < 0.6 ? 0.35 + melt * 0.5 : 0.85 * (1 - seg(q, 0.6, 0.76)) + 0.06;
      c.save(); c.translate(lx, ly); c.rotate(pour * 0.95);
      const cw = w * 0.26;
      c.fillStyle = '#5a524a'; c.beginPath(); c.moveTo(-cw, 0); c.lineTo(1, 0); c.lineTo(-2, 16); c.lineTo(-cw + 3, 16); c.closePath(); c.fill();
      c.save(); c.beginPath(); c.moveTo(-cw + 1.5, 1); c.lineTo(-0.5, 1); c.lineTo(-3, 15); c.lineTo(-cw + 4, 15); c.closePath(); c.clip();
      c.fillStyle = '#1a1612'; c.fillRect(-cw, 0, cw + 2, 16);
      if (p >= IN) {
        const top = 15 - 14 * level, hot = melt > 0.25;
        c.fillStyle = hot ? hotCol(0.15 + 0.1 * Math.sin(t * 6), matCol(inId)) : matCol(inId); c.fillRect(-cw, top, cw + 2, 16);
        if (hot) { c.fillStyle = 'rgba(255,250,210,.7)'; c.fillRect(-cw, top, cw + 2, 1); }
        for (let i = 0; i < 3 && melt < 1; i++) {                          // 덜 녹은 덩이 — 가라앉으며 작아진다
          const r = 3.2 * (1 - melt * 0.85); c.fillStyle = mixHex('#7a7064', '#ff9a40', melt);
          c.fillRect(-cw + 4 + i * cw * 0.27, top - r + melt * 3, r * 1.7, r * 1.5);
        }
        if (busy && melt > 0.3 && pour < 0.1) for (let i = 0; i < 3; i++) {   // 끓어 터지는 거품
          const k = (t * 1.7 + i / 3) % 1; c.strokeStyle = `rgba(255,240,180,${1 - k})`; c.lineWidth = 0.7;
          c.beginPath(); c.arc(-cw + 5 + hash(i + Math.floor(t * 1.7 + i / 3)) * (cw - 9), top, 0.6 + k * 1.8, Math.PI, 0); c.stroke();
        }
      }
      c.restore(); c.restore();
      c.strokeStyle = '#2a2622'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx, bot - 3); c.stroke();   // 회전축 받침
      // 틀 — 쇠 틀에 쇳물이 차오르고 식는다
      const mx = w * 0.56, mw = w * 0.3, my = 30, fill = seg(q, 0.53, 0.78), cool = seg(q, 0.78, 0.94), eject = seg(q, 0.94, 1);
      if (pour > 0.15) {                                                 // 붓는 줄기 — 굵기가 흔들리고 방울이 튄다
        const sx = lx + 1, sy = ly + 2, ex = mx + mw * 0.45, ey = my - 5 + (1 - fill) * 3;
        c.strokeStyle = '#ff9a30'; c.lineWidth = 2.6 + Math.sin(t * 23) * 0.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(sx, sy); c.bezierCurveTo(sx + 6, sy, ex - 1, sy + 4, ex, ey); c.stroke();
        c.strokeStyle = '#fff2b0'; c.lineWidth = 1; c.stroke();
        glow(c, ex, ey, 10, '#ff8a2a', 0.6); sparks(c, ex, ey, my - 2, 5, t, 3.5, 0, 0.5);
      }
      c.fillStyle = '#3a3a40'; c.fillRect(mx - 2, my - 4, mw + 4, 9);
      c.fillStyle = '#16151a'; c.beginPath(); c.moveTo(mx, my - 4); c.lineTo(mx + mw, my - 4); c.lineTo(mx + mw - 2, my + 2); c.lineTo(mx + 2, my + 2); c.fill();
      if (fill > 0 && eject < 0.05) {
        const col = hotCol(0.1 + cool * 0.9, matCol(outId || inId)), top = my + 2 - 6 * fill;
        c.fillStyle = col; c.fillRect(mx + 1, top, mw - 2, my + 2 - top);
        if (cool < 0.6) { c.fillStyle = `rgba(255,250,200,${0.6 * (1 - cool)})`; c.fillRect(mx + 1, top, mw - 2, 1); glow(c, mx + mw / 2, top, 10, '#ff7a2a', 0.5 * (1 - cool)); }
      }
      if (cool > 0 && cool < 1) {                                        // 물을 뿌려 식힌다 — 치익
        c.fillStyle = 'rgba(160,200,230,.8)'; for (let i = 0; i < 4; i++) c.fillRect(mx + 3 + i * mw / 4 + Math.sin(t * 30 + i) * 1, my - 13 + ((t * 40 + i * 5) % 7), 1, 2);
        c.fillStyle = '#5a6068'; c.fillRect(mx + 2, my - 16, mw - 4, 2);
        puffs(c, mx + mw / 2, my - 6, 4, t, 1.6, 14, '220,225,230', 0.55 * (1 - cool));
      }
      goOut(c, o, mx + 2, my - 8, 12);
      break;
    }
    case 'oven': {                       // 화덕 — 아치 안 쟁반에서 익어 가고, 다 되면 삽으로 꺼낸다
      firebox(c, 2, 28, w - 4, 10, run ? 1 : 0.15, t);
      feedFuel(c, o, w * 0.3, 32);
      c.strokeStyle = '#7a3a24'; c.lineWidth = 3; c.beginPath(); c.arc(cx, 28, w * 0.36, Math.PI, 0); c.stroke();   // 벽돌 아치
      c.strokeStyle = '#5a2a1a'; c.lineWidth = 1; for (let i = 1; i < 7; i++) { const a = Math.PI + i / 7 * Math.PI; c.beginPath(); c.moveTo(cx + Math.cos(a) * (w * 0.36 - 1.5), 28 + Math.sin(a) * (w * 0.36 - 1.5)); c.lineTo(cx + Math.cos(a) * (w * 0.36 + 1.5), 28 + Math.sin(a) * (w * 0.36 + 1.5)); c.stroke(); }
      c.fillStyle = '#6a6058'; c.fillRect(cx - 14, 24, 28, 2);
      comeIn(c, o, cx - 8, 10, 14);
      if (inId && p >= IN && p <= OUT) {
        drawIc(c, q < 0.85 ? inId : outId || inId, cx - 8, 9, 15);
        c.fillStyle = `rgba(70,32,10,${q * 0.3})`; c.fillRect(cx - 8, 9, 15, 15);
        if (busy) puffs(c, cx, 9, 3, t, 0.8, 12, '230,230,230', 0.5);
        glow(c, cx, 20, 18, '#ff9a4a', 0.15);
      }
      if (p > OUT) { const k = ease((p - OUT) / (1 - OUT)); c.fillStyle = '#8a6a40'; c.fillRect(lerp(cx, w, k) - 10, 24, w, 1.5); }
      goOut(c, o, cx - 8, 10, 14);
      break;
    }
    case 'press': case 'pressor': {      // 유압 — 모터가 펌프를 돌려 기름이 실린더로 → 램이 내려와 누르고 → 풀리며 김 → 밀어낸다
      const big = kind === 'pressor', down = q < 0.45 ? ease(q / 0.45) : q < 0.62 ? 1 : 1 - ease(seg(q, 0.62, 0.8));
      const on = o.pw * (run ? 1 : 0);
      motor(c, 2, 4, on, t); feedPower(c, o, kind, 8, 4);
      const cyl = big ? [cx - 18, cx + 6] : [cx];
      const hoseOn = busy && q < 0.62 ? 1 : 0;
      for (const x of cyl) cable(c, [[17, 8], [x - 4, 8], [x - 4, 2]], 0, t, 2.2);          // 기름 관
      if (hoseOn) for (const x of cyl) for (let i = 0; i < 3; i++) { const k = (t * 2 + i / 3) % 1; c.fillStyle = '#c89a3a'; c.fillRect(lerp(17, x - 4, k) - 1, 7, 2, 2); }
      const dieY = 31, ramY = lerp(9, dieY - 8 - (big ? 1 : 0), down);
      for (const x of cyl) {
        c.fillStyle = '#4a5058'; c.fillRect(x - 6, 0, 12, 10); c.fillStyle = '#6a7078'; c.fillRect(x - 6, 0, 2, 10);
        c.fillStyle = '#c8ccd4'; c.fillRect(x - 2, 10, 4, ramY - 10);
      }
      const rx0 = (big ? cx - 26 : cx - 15), rw = big ? 40 : 30;
      c.fillStyle = '#7a8088'; c.fillRect(rx0, ramY, rw, 6); c.fillStyle = '#9aa0a8'; c.fillRect(rx0, ramY, rw, 1.5);
      c.fillStyle = '#3a3a40'; c.fillRect(rx0 - 2, dieY, rw + 4, bot - 3 - dieY);
      comeIn(c, o, cx - 7, dieY - 14, 14);
      if (inId && p >= IN && p <= OUT) {
        const squash = down > 0.85 ? seg(down, 0.85, 1) : 0, prod = q > 0.62 && outId ? outId : inId;
        const sh = 14 * (1 - squash * 0.5), sw = 14 * (1 + squash * 0.35);
        c.save(); c.translate(cx - sw / 2, dieY - sh); c.scale(sw / 14, sh / 14); drawIc(c, prod, 0, 0, 14); c.restore();
        if (q > 0.4 && q < 0.62 && busy) { glow(c, cx, dieY - 2, 14, big ? '#ff9a4a' : '#ffe08a', 0.5); sparks(c, cx, dieY - 2, dieY, 6, t, 2.2, 0, 0.6); }
      }
      if (q > 0.62 && q < 0.75 && busy) puffs(c, cyl[0] + 6, 4, 3, t, 2.5, 8, '230,235,240', 0.6);   // 압 빠지는 김
      // 압력계 — 누르는 동안 바늘이 오른다
      const gx = w - 9, gy = 8; c.fillStyle = '#1a1814'; c.beginPath(); c.arc(gx, gy, 6, 0, TAU); c.fill(); c.strokeStyle = '#8a8478'; c.lineWidth = 1; c.stroke();
      const a = Math.PI * 0.8 + down * Math.PI * 1.4 + (down > 0.95 ? Math.sin(t * 40) * 0.05 : 0);
      c.strokeStyle = down > 0.9 ? '#ff5a3a' : '#e8dcc0'; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(a) * 5, gy + Math.sin(a) * 5); c.stroke();
      if (p > OUT) { const k = ease((p - OUT) / (1 - OUT)); c.fillStyle = '#5a5e66'; c.fillRect(lerp(rx0 - 8, cx - 6, k), dieY - 4, 4, 4); }   // 밀대
      goOut(c, o, cx - 7, dieY - 12, 13);
      break;
    }
    case 'mill': {                       // 모터 → 벨트 → 윗돌이 돌고, 비스듬한 나사가 낟알을 올려 돌 눈에 흘리고, 가루는 자루에
      const on = o.pw * (run ? 1 : 0), spin = on ? t * 3 : 0;
      motor(c, 2, 2, on, t); feedPower(c, o, kind, 8, 2);
      const sx = w * 0.55, sy = 21, R = w * 0.2;
      c.strokeStyle = '#1e1c18'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(17, 6); c.lineTo(sx, 4); c.moveTo(17, 3); c.lineTo(sx, 1.5); c.stroke();   // 벨트
      c.fillStyle = '#6a6458'; c.fillRect(sx - 1.5, 1, 3, sy - 6);                                                      // 축
      c.fillStyle = '#8a8478'; c.fillRect(sx - R, sy - 5, R * 2, 5);                                                    // 윗돌(돈다)
      c.fillStyle = '#5a5448'; for (let i = 0; i < 6; i++) { const k = ((spin * 0.15 + i / 6) % 1); c.fillRect(sx - R + k * R * 2, sy - 5, 1.2, 5); }
      c.fillStyle = '#7a7468'; c.fillRect(sx - R, sy, R * 2, 5);                                                        // 아랫돌
      // 비스듬한 나사 — 날개가 위로 흐른다
      const ax0 = 2, ay0 = 30, ax1 = sx - 4, ay1 = 9;
      c.strokeStyle = '#4a4438'; c.lineWidth = 4; c.beginPath(); c.moveTo(ax0, ay0); c.lineTo(ax1, ay1); c.stroke();
      c.strokeStyle = '#9a9078'; c.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const k = ((i / 8 + (on ? t * 0.6 : 0)) % 1), x = lerp(ax0, ax1, k), y = lerp(ay0, ay1, k); c.beginPath(); c.moveTo(x - 1.5, y - 2); c.lineTo(x + 1.5, y + 2); c.stroke(); }
      comeIn(c, o, 0, 26, 9);
      if (busy) {
        for (let i = 0; i < 5; i++) { const k = (t * 0.6 + i / 5) % 1; c.fillStyle = '#d8b860'; c.fillRect(lerp(ax0, ax1, k) - 1, lerp(ay0, ay1, k) - 3, 2, 2); }
        for (let i = 0; i < 6; i++) { const k = (t * 1.4 + i / 6) % 1; c.fillStyle = `rgba(240,232,212,${1 - k * 0.5})`; c.fillRect(sx + R - 2 + Math.sin(i) * 1.5, sy + 5 + k * 9, 1.5, 1.5); }
      }
      const fill = p < IN ? 0 : q;                                                                                     // 자루
      c.fillStyle = '#b8a070'; c.beginPath(); c.moveTo(sx + R - 6, 27); c.lineTo(sx + R + 4, 27); c.quadraticCurveTo(sx + R + 6 + fill * 3, bot - 3, sx + R, bot - 3); c.quadraticCurveTo(sx + R - 8 - fill * 3, bot - 3, sx + R - 6, 27); c.fill();
      c.fillStyle = '#e8e0cc'; c.fillRect(sx + R - 5, bot - 4 - fill * 9, 8, 1 + fill * 9 * 0.2);
      goOut(c, o, sx + R - 6, 26, 12);
      break;
    }
    case 'refinery': case 'desal': {     // 전열 코일이 통을 데워 끓이고 → 탑 속 판마다 김이 맺혀 → 층마다 받는 통으로
      const on = o.pw * (run ? 1 : 0), ref = kind === 'refinery';
      const bx = 3, bw = w * 0.3, top = 14;
      feedPower(c, o, kind, bx + bw / 2, 34);
      comeIn(c, o, bx + 3, top + 2, 9);
      c.fillStyle = '#3a3a40'; c.fillRect(bx, top, bw, bot - 6 - top);
      const lv = (bot - 8 - top) * (0.35 + 0.35 * (1 - q));
      c.fillStyle = ref ? '#2a2420' : '#4a7aa8'; c.fillRect(bx + 1.5, bot - 7 - lv, bw - 3, lv);
      c.strokeStyle = on > 0 ? mixHex('#5a2a1a', '#ff6a2a', 0.6 + 0.4 * Math.sin(t * 8)) : '#3a2420'; c.lineWidth = 1.5;     // 전열 코일
      c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(bx + 2 + i * (bw - 4) / 8, bot - 5 + (i % 2 ? -1.5 : 1.5)); c.stroke();
      if (on > 0) glow(c, bx + bw / 2, bot - 5, bw * 0.6, '#ff6a2a', 0.3);
      if (busy) for (let i = 0; i < 5; i++) { const k = (t * 1.3 + i / 5) % 1; c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(bx + 3 + (i * 7) % (bw - 6), bot - 7 - k * lv, 0.6 + k, 0, TAU); c.fill(); }
      const tx = w * 0.46, tw = 10;                                                                                      // 탑
      c.fillStyle = '#4a4e56'; c.fillRect(tx, 2, tw, bot - 5); c.fillStyle = '#5a5e66'; c.fillRect(tx, 2, 2, bot - 5);
      c.strokeStyle = '#2a2a2e'; c.lineWidth = 1; for (let y = 8; y < bot - 5; y += 7) { c.beginPath(); c.moveTo(tx + 1, y); c.lineTo(tx + tw - 1, y); c.stroke(); }
      cable(c, [[bx + bw / 2, top], [bx + bw / 2, top - 4], [tx, top - 4]], 0, t, 2);
      if (busy) for (let i = 0; i < 6; i++) { const k = (t * 0.9 + i / 6) % 1; c.fillStyle = `rgba(255,${ref ? 210 : 240},150,${0.7 * (1 - k)})`; c.fillRect(tx + 3 + (i % 3) * 2, bot - 8 - k * (bot - 14), 1.5, 1.5); }
      const cols = ref ? ['#e8c060', '#c88a3a', '#6a4a2a'] : ['#f0f0f0', '#d8e8f0', '#b0d0e8'];
      for (let i = 0; i < 3; i++) {                                                                                      // 곁 관 · 받는 통
        const y = 8 + i * 9, rx = w * 0.66 + i * 8;
        cable(c, [[tx + tw, y], [rx + 3, y], [rx + 3, bot - 16]], 0, t, 1.6);
        if (busy && seg(q, i * 0.25, i * 0.25 + 0.3) > 0) { const k = (t * 1.5 + i * 0.3) % 1; c.fillStyle = cols[i]; c.beginPath(); c.arc(rx + 3, lerp(bot - 15, bot - 8, k), 1, 0, TAU); c.fill(); }
        c.fillStyle = '#2a2a2e'; c.fillRect(rx, bot - 13, 7, 10); const f = clamp(q * 3 - i, 0, 1); c.fillStyle = cols[i]; c.fillRect(rx + 1, bot - 4 - 8 * f, 5, 8 * f);
      }
      goOut(c, o, w * 0.82, 20, 11);
      break;
    }
    case 'assembler': {                  // 지그에 두 부품을 물리고 → 팔 끝 토치가 이음줄을 따라 용접(아크 · 불똥 · 식는 비드) → 검사 → 내보낸다
      const on = o.pw * (run ? 1 : 0);
      const ins = m.in ? Object.keys(m.in).filter((k: string) => m.in[k] > 0) : [];
      const a = ins[0] || inId, b = ins[1] || a;
      const bed = 30, join = seg(q, 0, 0.18), weld = seg(q, 0.2, 0.74), done = q >= 0.86;
      c.fillStyle = '#2e2e34'; c.fillRect(6, bed, w - 12, 4); c.fillStyle = '#44444c'; for (let x = 8; x < w - 8; x += 6) c.fillRect(x, bed, 3, 1);   // 작업대
      const jaw = 1 - seg(q, 0.04, 0.18) + seg(q, 0.82, 0.9);                                                             // 지그 물림
      c.fillStyle = '#c8a050'; c.fillRect(cx - 24 - jaw * 4, bed - 10, 4, 10); c.fillRect(cx + 20 + jaw * 4, bed - 10, 4, 10);
      comeIn(c, o, cx - 18, bed - 12, 12);
      const seamTop = bed - 15, seamBot = bed - 1;
      if (a && p >= IN && !done) {
        drawIc(c, a, lerp(4, cx - 16, join), bed - 16, 16); if (b) drawIc(c, b, lerp(w - 20, cx, join), bed - 16, 16);
        if (weld > 0) {                                                                                                  // 비드 — 지나간 자리부터 식는다
          const n = 12, cur = weld * n;
          for (let i = 0; i < Math.min(n, cur); i++) {
            const age = (cur - i) / n + (q > 0.74 ? seg(q, 0.74, 0.86) : 0);
            c.fillStyle = hotCol(age * 1.4, '#6a6e76'); c.fillRect(cx - 1.2, lerp(seamTop, seamBot, i / n), 2.4, (seamBot - seamTop) / n + 0.4);
          }
        }
      }
      if (done && outId) drawIc(c, outId, cx - 8 + (p > OUT ? 0 : 0), bed - 16, 16);
      // 팔 — 어깨는 오른쪽 위 기둥, 토치 끝이 이음줄을 따라 내려간다
      const shX = w - 10, shY = 4;
      feedPower(c, o, kind, shX, shY);
      const tipX = weld > 0 && weld < 1 ? cx + 1.5 : q < 0.2 ? lerp(w - 24, cx + 4, join) : cx + 8;
      const tipY = weld > 0 && weld < 1 ? lerp(seamTop, seamBot, weld) - 1 : q < 0.2 ? 12 : lerp(seamBot, 10, seg(q, 0.74, 0.86));
      const [ex, ey] = ik2(shX, shY, tipX + 4, tipY - 5, 27, 24, 1);
      c.strokeStyle = '#d8a94b'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(shX, shY); c.lineTo(ex, ey); c.lineTo(tipX + 4, tipY - 5); c.stroke();
      c.strokeStyle = '#7a6a40'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#5a5e66'; c.beginPath(); c.arc(ex, ey, 2.4, 0, TAU); c.fill(); c.fillRect(shX - 4, 0, 8, shY + 2);
      c.strokeStyle = '#3a3e46'; c.lineWidth = 2; c.beginPath(); c.moveTo(tipX + 4, tipY - 5); c.lineTo(tipX, tipY); c.stroke();   // 토치 목
      if (busy && weld > 0 && weld < 1 && on > 0) {                                                                      // 아크
        const fl = 0.6 + 0.4 * hash(Math.floor(t * 30));
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.08 * fl; c.fillStyle = '#9fd8ff'; c.fillRect(0, 0, w, h); c.restore();
        glow(c, tipX, tipY, 16, '#8fd0ff', 0.7 * fl); glow(c, tipX, tipY, 6, '#ffffff', 0.9);
        c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(tipX, tipY); c.lineTo(tipX - 1 + hash(t * 60) * 2, tipY + 1.5); c.stroke();
        sparks(c, tipX - 1, tipY, bed, 10, t, 3, -0.4, 1);
        puffs(c, tipX, tipY - 3, 3, t, 0.9, 14, '160,170,180', 0.35);
      }
      if (q > 0.74 && q < 0.86) { const k = seg(q, 0.74, 0.86); c.fillStyle = 'rgba(90,208,106,.55)'; c.fillRect(cx - 16, lerp(seamTop - 4, seamBot, k), 32, 1.2); }   // 검사 빛
      goOut(c, o, cx - 8, bed - 16, 14);
      break;
    }
    case 'drill': {                      // 동력(엔진 · 전동기)이 기어를 돌려 → 굴대가 땅을 파고 → 나사 날개가 부스러기를 올려 → 배출구로
      const fuel = m.t === 'drill', on = fuel ? (run ? 1 : 0) : o.pw * (run ? 1 : 0), gy = 13;
      c.fillStyle = '#3a2c20'; c.fillRect(0, gy, w, bot - gy); c.fillStyle = '#4a3828'; for (let i = 0; i < 4; i++) c.fillRect(0, gy + 3 + i * 7, w, 3);
      const vein = outId ? matCol(outId) : '#8a7a60';
      for (let i = 0; i < 9; i++) { c.fillStyle = vein; c.fillRect(cx - 18 + hash(i) * 36, bot - 10 + hash(i + 9) * 6, 3, 2); }
      const sx = w * 0.42;
      if (fuel) {                                                                                                        // 엔진 — 피스톤이 끄덕이고 굴뚝 연기
        c.fillStyle = '#5a4a3a'; c.fillRect(sx - 12, 1, 14, 10); const pz = on ? Math.sin(t * 18) * 2 : 0;
        c.fillStyle = '#9a9080'; c.fillRect(sx - 10, 3 + pz, 3, 4); c.fillStyle = '#3a3a3e'; c.fillRect(sx - 4, -2, 3, 4);
        if (on) puffs(c, sx - 2.5, -1, 3, t, 1.2, 8, '90,90,96', 0.6);
        feedFuel(c, o, sx - 8, 10);
      } else { motor(c, sx - 14, 2, on, t); feedPower(c, o, 'drill', sx - 8, 2); }
      c.fillStyle = '#6a6458'; c.fillRect(sx + 2, 3, 8, 9);                                                              // 기어 상자
      c.save(); c.translate(sx + 6, 7.5); c.rotate(on ? t * 6 : 0); c.fillStyle = '#9a9488'; for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.fillRect(-0.8, -3.5, 1.6, 2); } c.restore();
      const depth = lerp(gy + 6, bot - 9, ease(clamp(p * 1.1, 0, 1))), dx0 = sx + 6;
      c.fillStyle = '#1a140e'; c.fillRect(dx0 - 4, gy, 8, depth - gy + 2);                                               // 판 구멍
      c.fillStyle = '#7a7e86'; c.fillRect(dx0 - 1.5, 12, 3, depth - 12);
      c.strokeStyle = '#c8ccd4'; c.lineWidth = 1;
      for (let y = 13 + (on ? (t * 24) % 4 : 0); y < depth; y += 4) { c.beginPath(); c.moveTo(dx0 - 3.5, y); c.lineTo(dx0 + 3.5, y + 2); c.stroke(); }   // 나사 날개
      c.fillStyle = '#e0e4ea'; c.beginPath(); c.moveTo(dx0 - 3.5, depth); c.lineTo(dx0, depth + 5); c.lineTo(dx0 + 3.5, depth); c.fill();
      if (on) {
        sparks(c, dx0, depth + 3, bot - 3, 5, t, 2.5, 0, 0.5);
        for (let i = 0; i < 5; i++) { const k = (t * 0.9 + i / 5) % 1; c.fillStyle = vein; c.fillRect(dx0 + (i % 2 ? 1 : -2), lerp(depth, 12, k), 1.6, 1.6); }   // 부스러기가 올라온다
      }
      c.fillStyle = '#5a5e66'; c.beginPath(); c.moveTo(dx0 + 3, 11); c.lineTo(w, OUT_Y - 6); c.lineTo(w, OUT_Y - 3); c.lineTo(dx0 + 3, 13); c.fill();   // 배출 홈
      goOut(c, o, dx0 + 2, 6, 11);
      break;
    }
    case 'pump': {                       // 전동기가 크랭크를 돌려 흔들대가 끄덕 → 막대가 관 속 원유를 길어 올려 → 관으로 오른쪽에
      const on = o.pw * (run ? 1 : 0), ang = on ? t * 2.4 : 0, gy = 28;
      c.fillStyle = '#3a2c20'; c.fillRect(0, gy, w, bot - gy); c.fillStyle = '#1a1410'; c.beginPath(); c.ellipse(w * 0.72, bot - 2, w * 0.16, 2.5, 0, 0, TAU); c.fill();
      motor(c, 2, gy - 10, on, t); feedPower(c, o, kind, 8, gy - 10);
      const ckx = w * 0.26, cky = gy - 8, cr = 5;
      c.fillStyle = '#7a6a50'; c.beginPath(); c.arc(ckx, cky, cr + 2, 0, TAU); c.fill();                                 // 크랭크 · 추
      const px = ckx + Math.cos(ang) * cr, py = cky + Math.sin(ang) * cr;
      c.fillStyle = '#4a4038'; c.save(); c.translate(ckx, cky); c.rotate(ang); c.fillRect(-2, -2, cr + 4, 4); c.restore();
      const pvx = w * 0.5, pvy = 6, nod = (py - cky) / cr * 0.22;
      c.fillStyle = '#5a5048'; c.beginPath(); c.moveTo(pvx - 6, gy); c.lineTo(pvx, pvy); c.lineTo(pvx + 6, gy); c.fill();   // 받침대
      const bl = w * 0.28, tailX = pvx - Math.cos(nod) * bl, tailY = pvy - Math.sin(nod) * bl, headX = pvx + Math.cos(nod) * bl, headY = pvy + Math.sin(nod) * bl;
      c.strokeStyle = '#d8a94b'; c.lineWidth = 3; c.beginPath(); c.moveTo(tailX, tailY); c.lineTo(headX, headY); c.stroke();   // 흔들대
      c.strokeStyle = '#6a6e76'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tailX, tailY); c.lineTo(px, py); c.stroke();     // 연결대
      c.fillStyle = '#c89a3a'; c.beginPath(); c.moveTo(headX, headY - 3); c.quadraticCurveTo(headX + 6, headY, headX, headY + 6); c.lineTo(headX - 1, headY - 3); c.fill();   // 말머리
      const rodX = headX + 2;
      c.strokeStyle = '#c8ccd4'; c.lineWidth = 1; c.beginPath(); c.moveTo(rodX, headY + 6); c.lineTo(rodX, gy + 2); c.stroke();
      c.fillStyle = '#4a4e56'; c.fillRect(rodX - 3, gy - 3, 6, 5); c.fillRect(rodX - 1, gy + 2, 2, bot - gy - 4);      // 우물머리 · 관
      cable(c, [[rodX + 3, gy - 1], [w + 2, gy - 1]], 0, t, 2.5);
      if (on) for (let i = 0; i < 4; i++) { const k = (t * 0.9 + i / 4) % 1; c.fillStyle = '#2a2018'; c.fillRect(lerp(rodX + 3, w, k), gy - 2.2, 2.5, 2.4); }
      if (on) for (let i = 0; i < 3; i++) { const k = (t * 0.7 + i / 3) % 1; c.fillStyle = '#2a2018'; c.fillRect(rodX - 0.8, lerp(bot - 3, gy, k), 1.6, 2.5); }
      goOut(c, o, rodX + 2, gy - 12, 11);
      break;
    }
    case 'gen': {                        // 연료가 화실로 → 보일러의 김이 피스톤을 밀어 → 플라이휠 → 발전자 코일 → 오른쪽 단자로 전기
      const on = run ? 1 : 0;
      firebox(c, 2, 26, w * 0.34, 12, on ? 1 : 0.1, t); feedFuel(c, o, w * 0.16, 30);
      const bx = 3, by = 10, bw = w * 0.32;
      c.fillStyle = '#6a5040'; c.fillRect(bx, by, bw, 14); c.fillStyle = '#8a6a50'; c.fillRect(bx, by, bw, 2);           // 보일러
      for (let i = 0; i < 3; i++) { c.fillStyle = '#4a3a2e'; c.fillRect(bx + 3 + i * bw / 3, by + 3, 1.5, 9); }
      const cyX = w * 0.42, cyY = 12;
      cable(c, [[bx + bw / 2, by], [bx + bw / 2, 5], [cyX + 6, 5], [cyX + 6, cyY - 3]], 0, t, 2.2);                   // 김 관
      if (on) puffs(c, bx + bw * 0.8, by - 1, 2, t, 1.4, 6, '230,230,235', 0.4);
      const ang = on ? t * 7 : 0, fx = w * 0.66, fy = 18, r = 9;
      const cxk = fx + Math.cos(ang) * 4, cyk = fy + Math.sin(ang) * 4, pist = cxk - 15;
      c.fillStyle = '#4a4e56'; c.fillRect(cyX, cyY - 3, 14, 7);                                                          // 실린더
      c.fillStyle = '#c8ccd4'; c.fillRect(cyX + 2 + clamp(pist - cyX, 0, 8), cyY - 2, 3, 5);
      c.strokeStyle = '#9aa0a8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cyX + 4 + clamp(pist - cyX, 0, 8), cyY + 0.5); c.lineTo(cxk, cyk); c.stroke();
      c.save(); c.translate(fx, fy); c.rotate(ang);                                                                       // 플라이휠
      c.strokeStyle = '#7a7e86'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
      c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(r, 0); c.stroke(); }
      c.restore();
      const gx = w * 0.8, gw = w * 0.14;
      c.fillStyle = '#3e4a56'; c.fillRect(gx, fy - 7, gw, 14);                                                           // 발전자
      c.fillStyle = on ? mixHex('#6a4020', '#ffb050', 0.5 + 0.5 * Math.sin(t * 20)) : '#4a3020';
      for (let i = 0; i < 3; i++) c.fillRect(gx + 2 + i * (gw - 4) / 3, fy - 5, (gw - 4) / 3 - 1, 10);
      if (on) { glow(c, gx + gw / 2, fy, 12, '#ffe08a', 0.35); c.strokeStyle = '#bfe8ff'; c.lineWidth = 0.8; const a2 = hash(Math.floor(t * 12)) * TAU; c.beginPath(); c.moveTo(gx + gw / 2, fy); c.lineTo(gx + gw / 2 + Math.cos(a2) * 6, fy + Math.sin(a2) * 6); c.stroke(); }
      cable(c, [[gx + gw, fy - 4], [w + 2, fy - 4]], on, t);
      bolt(c, w - 4, fy - 10, 3, on ? '#ffe08a' : '#5a5440');
      break;
    }
    case 'windmill': {                   // 날개 축(위) → 기어 상자 → 발전자 → 오른쪽 단자
      const on = run ? 1 : 0, ang = on ? t * 3 : 0;
      c.fillStyle = '#7a6a50'; c.fillRect(cx - 1.5, 0, 3, 16);
      c.save(); c.translate(cx, 18); c.rotate(ang); c.fillStyle = '#9a9488'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.fillStyle = '#6a6458'; for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.fillRect(-0.8, 4, 1.6, 2.2); } c.restore();
      c.fillStyle = '#6a6458'; c.fillRect(cx + 5, 17, w * 0.2, 2.5);
      const gx = w * 0.72; c.fillStyle = '#3e4a56'; c.fillRect(gx, 11, w * 0.16, 14);
      c.fillStyle = on ? mixHex('#6a4020', '#ffb050', 0.5 + 0.5 * Math.sin(t * 14)) : '#4a3020'; c.fillRect(gx + 2, 13, w * 0.16 - 4, 10);
      cable(c, [[gx + w * 0.16, 14], [w + 2, 14]], on, t);
      bolt(c, w - 4, 8, 3, on ? '#ffe08a' : '#5a5440');
      break;
    }
    case 'battery': {                    // 위 전선으로 받거나(충전) 내보내고(방전), 칸이 차오른다 — 화살이 흐르는 쪽이 지금 방향
      const k = s.store ? clamp((m.e || 0) / s.store, 0, 1) : q, fl = o.flow;
      const n = 5, x0 = 6, cw = (w - 12) / n;
      cable(c, [[w * 0.5, -2], [w * 0.5, 5], [x0 + 2, 5]], fl !== 0 ? 1 : 0, fl < 0 ? -t : t);
      cable(c, [[w * 0.5, 5], [w - 6, 5]], fl !== 0 ? 1 : 0, fl < 0 ? -t : t);
      for (let i = 0; i < n; i++) {
        const bx = x0 + i * cw, bw = cw - 4;
        c.fillStyle = '#5a5a64'; c.fillRect(bx + bw / 2 - 2, 6, 4, 3);
        c.fillStyle = '#24242a'; c.fillRect(bx, 9, bw, h - 14); c.strokeStyle = '#5a5a64'; c.lineWidth = 1; c.strokeRect(bx + .5, 9.5, bw - 1, h - 15);
        const f = clamp(k * n - i, 0, 1); c.fillStyle = f > 0.99 ? '#5ad06a' : '#c8e060'; c.fillRect(bx + 1, 9 + (h - 14) * (1 - f), bw - 2, (h - 14) * f);
        if (fl !== 0 && f > 0 && f < 1) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(bx + 1, 9 + (h - 14) * (1 - f), bw - 2, 1); }
      }
      c.fillStyle = fl > 0 ? '#5ad06a' : fl < 0 ? '#ff9a3a' : '#5a5a64';
      const ay = fl < 0 ? 2 : 0; c.beginPath(); c.moveTo(w * 0.5 - 3, 2 - ay); c.lineTo(w * 0.5 + 3, 2 - ay); c.lineTo(w * 0.5, fl < 0 ? -2 : 6); c.fill();
      if (inId && p >= IN) drawIc(c, inId, 2, bot - 14, 11);                                                              // 꽂아 둔 빈 배터리
      break;
    }
    case 'turret': {                     // 탄통에서 탄띠가 먹여져 → 약실 · 포신이 반동하고 → 탄피가 떨어진다
      const fire = s.cycle ? 1 - clamp((m.cd || 0) / s.cycle, 0, 1) : 0, on = o.pw * (run ? 1 : 0);
      const rec = fire > 0.9 ? (fire - 0.9) * 40 : 0, by = 18;
      motor(c, 2, 2, on, t); feedPower(c, o, kind, 8, 2);
      c.fillStyle = '#4a4030'; c.fillRect(3, 24, 16, 12); c.fillStyle = '#6a5a40'; c.fillRect(3, 24, 16, 2);            // 탄통
      for (let i = 0; i < 7; i++) { const k = ((i / 7 + (run ? t * 0.8 : 0)) % 1); c.fillStyle = '#c8a050'; c.fillRect(lerp(12, w * 0.36, k), lerp(26, by + 3, k), 2, 4); }
      c.fillStyle = '#4a4e56'; c.fillRect(w * 0.34 - rec * 0.3, by - 4, 18, 12);                                         // 약실
      c.fillStyle = '#5a5e66'; c.fillRect(w * 0.34 + 18 - rec, by - 1, w * 0.5, 5); c.fillStyle = '#7a7e86'; c.fillRect(w * 0.34 + 18 - rec, by - 1, w * 0.5, 1.2);
      if (rec > 0) { glow(c, w - 4, by + 1.5, 14, '#ffe08a', 0.9); c.fillStyle = '#c8a050'; c.fillRect(w * 0.4, by + 10 + rec, 2, 3); }
      else if (fire > 0.5) { c.fillStyle = '#a88a40'; c.fillRect(w * 0.42, bot - 5, 3, 2); }
      break;
    }
    case 'sprinkler': {                  // 양동이 물을 통에 붓고 → 펌프가 관으로 밀어 올려 → 지붕 위로 뿜는다(아침에만)
      const on = o.pw * (run ? 1 : 0);
      feedPower(c, o, kind, cx + 4, 22);
      const f = m.in && m.in.water_bucket ? clamp(m.in.water_bucket / 10, 0.15, 1) : (m.wl > 0 ? 0.15 : 0);
      c.fillStyle = '#2a2a2e'; c.fillRect(4, 10, w * 0.38, bot - 13); c.fillStyle = '#4a7aa8'; c.fillRect(6, bot - 4 - (bot - 16) * f, w * 0.38 - 4, (bot - 16) * f);
      comeIn(c, o, 6, 4, 11);
      motor(c, cx - 2, 22, on, t);
      cable(c, [[w * 0.38 + 4, bot - 6], [cx - 2, bot - 6], [cx + 14, bot - 6], [w * 0.8, bot - 6], [w * 0.8, -2]], 0, t, 2.5);
      if (on && run) for (let i = 0; i < 5; i++) { const k = (t * 1.6 + i / 5) % 1; c.fillStyle = '#a8d8ff'; c.fillRect(w * 0.8 - 1, lerp(bot - 6, 0, k), 2, 2); }
      break;
    }
    default: {                                                         // 그 밖 — 맞물린 톱니 둘
      for (const [gx, gy, r, dir] of [[cx - 8, h / 2, 10, 1], [cx + 9, h / 2 + 4, 7, -1]] as const) {
        c.save(); c.translate(gx, gy); c.rotate(run ? t * 3 * dir : 0);
        c.fillStyle = '#8a8478'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.fillStyle = '#6a6458'; for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.fillRect(-1.5, r - 1, 3, 3); }
        c.restore();
      }
    }
  }
}
