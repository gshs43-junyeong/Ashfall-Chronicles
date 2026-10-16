/* ===== ui/mach-scene.js — 기계 창 가동 화면 중 '가공'이 없는 것 — 전주 · 상자 · 분류 · 분기 · 컨버터 · 스위치 · 함정 · 벨트 ===== */
/* 투입 통 → 몸체 → 산출 상자 틀에 끼우면 전주처럼 넣고 꺼낼 것이 없는 기계도 공정처럼 보였다(사용자). 갈래마다 제 모습으로 그린다.
   사연: docs/code-history.md#h193 */
import { app as G } from '../ctx.js';
import { TAU, clamp, lerp } from '../../engine/core/math.js';
import { FONT, N_ } from '../lang.js';
import { MACHINE } from '../data/recipes.js';
import { TileArt } from '../tileart.js';
import { Factory } from '../factory.js';
import { drawIc, glow } from './process.js';
import { bolt, cable, chevron, ease, hash, minipole } from './mach-kit.js';

type C2 = CanvasRenderingContext2D;
/** 바닥 위를 지나는 짧은 벨트 — 물건이 실려 간다 */
function rail(c: C2, x0: number, y0: number, x1: number, y1: number, run: boolean, t: number) {
  c.save(); c.lineCap = 'round';
  c.strokeStyle = '#2a2620'; c.lineWidth = 7; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = '#3c362c'; c.lineWidth = 5; c.stroke();
  c.setLineDash([2, 5]); c.lineDashOffset = run ? -t * 26 : 0; c.strokeStyle = '#16140e'; c.lineWidth = 5; c.stroke();
  c.restore();
}
/** 물건 하나가 a → b 로 */
function ride(c: C2, id: string | null, a: number[], b: number[], k: number, s = 14) {
  if (!id) return; const e = ease(clamp(k, 0, 1)); drawIc(c, id, lerp(a[0], b[0], e) - s / 2, lerp(a[1], b[1], e) - s + 2, s);
}

/** 이 갈래를 제 모습으로 그렸으면 true — 아니면 가공 기계 틀로 */
export function drawScene(c: C2, m: Bag, W: number, H: number, t: number, run: boolean): boolean {
  const s = MACHINE[m.t], fy = 132;
  const net = m.net >= 0 && G.world.nets ? G.world.nets[m.net] : null, sat = Factory.sat(G.world, m);
  const sock = (x: number, y: number) => {                                // 위 전선에서 내려오는 전기 — 작은 전주 · 콘센트
    const [, r] = minipole(c, x, 10, 30);
    cable(c, [r, [r[0] + 8, r[1] + 3], [r[0] + 8, y]], sat > 0 && run ? 1 : 0, t);
    bolt(c, r[0] + 14, y - 4, 3, sat > 0 ? '#ffe08a' : '#6a5440');
  };
  c.fillStyle = '#16140e'; c.fillRect(0, fy, W, 4);
  switch (m.t) {
    case 'pole': {                       // 전주 — 이어진 전주로 뻗은 전선 · 망의 발전과 소비
      const px = W / 2, top = 26;
      const links = (G.world.wires || []).filter((e: number[]) => (e[0] === m.x && e[1] === m.y) || (e[2] === m.x && e[3] === m.y));
      const on = net && !net.off && net.gen > 0 ? 1 : 0;
      c.fillStyle = '#6a5a40'; c.fillRect(px - 3, top, 6, fy - top); c.fillStyle = '#8a7a58'; c.fillRect(px - 3, top, 2, fy - top);
      c.fillStyle = '#4a3e2c'; c.fillRect(px - 26, top + 6, 52, 4);
      const ins = [[px - 22, top + 2], [px - 8, top + 2], [px + 8, top + 2], [px + 22, top + 2]];
      for (const [x, y] of ins) { c.fillStyle = '#b8d0e0'; c.fillRect(x - 2, y, 4, 5); c.fillStyle = '#7a98a8'; c.fillRect(x - 2, y + 4, 4, 1); }
      links.slice(0, 4).forEach((e: number[], i: number) => {             // 이웃 전주 쪽으로 — 왼쪽 · 오른쪽에 따라
        const ox = e[0] === m.x && e[1] === m.y ? e[2] : e[0], dir = ox < m.x ? -1 : 1, [ix, iy] = ins[dir < 0 ? (i % 2) : 2 + (i % 2)];
        const ex = dir < 0 ? 0 : W, ey = iy + 14 + (i % 2) * 8;
        c.strokeStyle = 'rgba(28,26,22,.95)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ix, iy); c.quadraticCurveTo((ix + ex) / 2, Math.max(iy, ey) + 10, ex, ey); c.stroke();
        if (on) for (let j = 0; j < 3; j++) { const k = (t * 0.7 + j / 3) % 1, x = lerp(ix, ex, k), y = lerp(iy, ey, k) + Math.sin(k * Math.PI) * 9; c.fillStyle = '#ffe890'; c.fillRect(x - 1, y - 1, 2, 2); }
      });
      if (on && ((t * 9) | 0) % 4 !== 3) { c.strokeStyle = '#bfe8ff'; c.lineWidth = 1; const q = (t * 9) | 0; c.beginPath(); c.moveTo(ins[q % 4][0], ins[q % 4][1]); c.lineTo(ins[q % 4][0] + 3, ins[q % 4][1] - 4); c.lineTo(ins[q % 4][0] - 1, ins[q % 4][1] - 7); c.stroke(); }
      // 덮는 반경 — 아래에 반원 점선, 그 안에 든 기계 수
      c.strokeStyle = 'rgba(143,216,255,.35)'; c.setLineDash([3, 4]); c.beginPath(); c.arc(px, fy, 92, Math.PI, 0); c.stroke(); c.setLineDash([]);
      let n = 0; for (const o of G.world.machines.values()) if (o !== m && o.t !== 'pole' && o.net === m.net && Math.abs(o.x - m.x) <= (s.reach || 5) && Math.abs(o.y - m.y) <= (s.reach || 5)) n++;
      c.font = `11px ${FONT || 'sans-serif'}`; c.textAlign = 'left'; c.fillStyle = '#d8cfb4';
      if (net) {
        const ok = net.gen >= net.dem;
        bolt(c, 14, 20, 5, '#ffe08a'); c.fillText(`${Math.round(net.gen)}`, 22, 24);
        c.fillStyle = ok ? '#8fd88f' : '#e88a5a'; c.fillText(`▼ ${Math.round(net.dem)}`, 14, 40);
        c.fillStyle = '#8fd8ff'; c.fillText(`⌂ ${n}`, W - 46, 24);
      }
      return true;
    }
    case 'crate': {                      // 상자 — 뚜껑이 열린 칸칸이 든 것, '배출'이면 앞으로 하나씩 흘린다
      const bx = W / 2 - 70, bw = 140, by = 56, bh = fy - by;
      c.fillStyle = '#5a3e22'; c.fillRect(bx, by, bw, bh); c.fillStyle = '#7a5630'; for (let y = by + 4; y < fy; y += 12) c.fillRect(bx + 2, y, bw - 4, 7);
      c.fillStyle = '#3a2814'; c.fillRect(bx, by, 4, bh); c.fillRect(bx + bw - 4, by, 4, bh);
      c.save(); c.translate(bx, by); c.rotate(-0.5); c.fillStyle = '#6a4a28'; c.fillRect(-2, -8, bw * 0.5, 6); c.restore();   // 뚜껑
      const its = (m.items || []).filter(Boolean);
      its.slice(0, 16).forEach((it: Bag, i: number) => drawIc(c, it.id, bx + 8 + (i % 8) * 16, by + 8 + Math.floor(i / 8) * 22 - (i % 3), 15));
      const used = its.length, cap = (m.items || []).length || 1;
      c.fillStyle = '#2a2a32'; c.fillRect(bx, fy + 5, bw, 3); c.fillStyle = '#d8b06a'; c.fillRect(bx, fy + 5, bw * used / cap, 3);
      if (m.feed) {
        rail(c, bx + bw, fy - 8, W - 8, fy - 8, run, t); chevron(c, bx + bw + 14, fy - 22, 1, '#e8a050', t, !!its.length);
        if (its.length) ride(c, its[0].id, [bx + bw - 6, fy - 8], [W - 14, fy - 8], (t * 0.8) % 1, 12);
      }
      return true;
    }
    case 'sorter': case 'gate_if': case 'gate_or': {   // 갈림길 — 왼쪽에서 들어와 참은 앞(오른쪽), 거짓은 옆(아래)
      const gx = W / 2, gy = fy - 46, yes = m.t === 'sorter' ? (!m.f || !m.it || m.f === m.it.id) : m.st !== N_('거짓 → 옆');
      rail(c, 10, gy, gx - 16, gy, run, t); rail(c, gx + 16, gy, W - 10, gy, run && yes, t); rail(c, gx, gy + 16, gx, fy - 2, run && !yes, t);
      c.fillStyle = '#3a3a40'; c.fillRect(gx - 16, gy - 16, 32, 32); c.fillStyle = '#4a4a52'; c.fillRect(gx - 16, gy - 16, 32, 4);
      c.save(); c.translate(gx, gy); c.rotate(yes ? 0 : Math.PI / 2);                // 갈림판
      c.fillStyle = '#c8a050'; c.fillRect(-2, -12, 4, 12); c.restore();
      c.fillStyle = yes ? '#5ac46a' : '#2e4a32'; c.beginPath(); c.arc(W - 22, gy - 14, 4, 0, TAU); c.fill();
      c.fillStyle = !yes ? '#e88c3c' : '#4a3424'; c.beginPath(); c.arc(gx + 18, fy - 14, 4, 0, TAU); c.fill();
      if (m.t === 'sorter' && m.f) { c.fillStyle = '#1a1814'; c.fillRect(gx - 9, gy - 40, 18, 18); drawIc(c, m.f, gx - 8, gy - 39, 16); }
      else { c.fillStyle = '#8a7ab8'; c.fillRect(gx - 10, gy - 34, 20, 12); c.fillStyle = '#16151a'; c.font = `bold 9px ${FONT || 'sans-serif'}`; c.textAlign = 'center'; c.fillText(m.t === 'gate_or' ? 'OR' : m.t === 'gate_if' ? 'IF' : '⇄', gx, gy - 25); }
      const id = m.it ? m.it.id : null, k = run ? (t * 0.9) % 1 : 0.3;
      if (id) { if (k < 0.5) ride(c, id, [16, gy], [gx, gy], k * 2); else if (yes) ride(c, id, [gx, gy], [W - 16, gy], k * 2 - 1); else ride(c, id, [gx, gy + 6], [gx, fy - 4], k * 2 - 1); }
      chevron(c, 22, gy - 16, 1, '#7ad08a', t, !!id);
      sock(36, gy - 16);
      return true;
    }
    case 'converter': {                  // 컨버터 — 세 줄이 한 입으로, 정한 비율 차례대로 나간다
      const mx = W / 2, my = fy - 44;
      for (const [x0, y0] of [[10, my - 30], [10, my], [10, my + 30]]) rail(c, x0, y0, mx - 14, my, run, t);
      rail(c, mx + 14, my, W - 10, my, run, t);
      c.fillStyle = '#3a3a40'; c.beginPath(); c.arc(mx, my, 16, 0, TAU); c.fill(); c.fillStyle = '#5a5a66'; c.beginPath(); c.arc(mx, my, 7, 0, TAU); c.fill();
      const seq: string[] = [];
      if (m.r && m.r.length) for (const e of m.r) for (let i = 0; i < e.n; i++) seq.push(e.id);
      else for (const k in m.in || {}) if (m.in[k] > 0) seq.push(k);
      seq.slice(0, 6).forEach((id, i, a) => ride(c, id, [mx + 12, my], [W - 12, my], run ? (t * 0.45 + i / a.length) % 1 : i / a.length, 12));
      Object.keys(m.in || {}).slice(0, 3).forEach((id, i) => ride(c, id, [10, my - 30 + i * 30], [mx - 14, my], run ? (t * 0.5 + i / 3) % 1 : 0.5, 12));
      sock(W - 44, my - 16);
      return true;
    }
    case 'switch': {                     // 정지 스위치 — 망 전체를 끊고 잇는 칼날 스위치
      const off = !!(net && net.off), cx = W / 2, cy = fy - 50;
      cable(c, [[0, cy], [cx - 26, cy]], net && net.gen > 0 ? 1 : 0, t, 2.5);
      cable(c, [[cx + 26, cy], [W, cy]], !off && net && net.gen > 0 ? 1 : 0, t, 2.5);
      c.fillStyle = '#2a2a30'; c.fillRect(cx - 30, cy - 26, 60, 52); c.strokeStyle = '#5a5a64'; c.lineWidth = 2; c.strokeRect(cx - 30, cy - 26, 60, 52);
      c.fillStyle = '#b8b0a0'; c.fillRect(cx - 24, cy - 3, 6, 6); c.fillRect(cx + 18, cy - 3, 6, 6);
      c.save(); c.translate(cx - 21, cy); c.rotate(off ? -1.1 : 0); c.fillStyle = '#c8ccd4'; c.fillRect(0, -2, 44, 4); c.fillStyle = '#c84a3a'; c.fillRect(30, -7, 8, 14); c.restore();
      if (!off && net && net.gen > 0) glow(c, cx + 21, cy, 10, '#ffe08a', 0.4);
      else if (off) { c.strokeStyle = '#bfe8ff'; c.lineWidth = 1; const k = hash(Math.floor(t * 6)); if (k > 0.6) { c.beginPath(); c.moveTo(cx + 12, cy - 8); c.lineTo(cx + 16, cy - 2); c.lineTo(cx + 19, cy - 4); c.stroke(); } }
      return true;
    }
    case 'trap': {                       // 전격 함정 — 전선으로 축전기를 채워 판 위로 방전한다
      const cx = W / 2, py = fy - 8, chg = sat > 0 ? 0.5 + 0.5 * Math.sin(t * 2) : 0;
      sock(30, py - 30);
      c.fillStyle = '#3a3a40'; c.fillRect(cx - 50, py, 100, 8); c.fillStyle = '#6a7078'; for (let x = cx - 46; x < cx + 46; x += 8) c.fillRect(x, py, 5, 2);
      c.fillStyle = '#24242a'; c.fillRect(cx + 56, py - 26, 14, 26); c.fillStyle = '#6fe0c0'; c.fillRect(cx + 58, py - 2 - 22 * chg, 10, 22 * chg);
      cable(c, [[46, py - 30], [46, py + 4], [cx - 50, py + 4]], sat, t);
      if ((m.fx || 0) > 0 || (sat > 0 && hash(Math.floor(t * 5)) > 0.85)) {
        c.strokeStyle = '#bfe8ff'; c.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) { const x0 = cx - 30 + i * 30; c.beginPath(); c.moveTo(x0, py); for (let k = 1; k <= 4; k++) c.lineTo(x0 + (hash(i * 9 + k + Math.floor(t * 20)) - 0.5) * 10, py - k * 8); c.stroke(); }
        glow(c, cx, py - 12, 40, '#8fd8ff', 0.4);
      }
      return true;
    }
    case 'dart': case 'flamejet': case 'frostjet': {   // 유적 함정 — 벽에 박힌 장치가 정면으로 쏜다(동력 없음)
      const cy = fy - 46, ph = s.cycle ? 1 - clamp((m.cd || 0) / s.cycle, 0, 1) : (t * 0.5) % 1, shot = ph > 0.75 && run;
      c.fillStyle = '#4a4440'; c.fillRect(0, cy - 40, 60, 80); c.fillStyle = '#5a544e'; for (let y = cy - 40; y < cy + 40; y += 10) c.fillRect(0, y, 60, 1);
      c.fillStyle = '#2a2622'; c.fillRect(52, cy - 8, 14, 16); c.fillStyle = '#0c0b09'; c.fillRect(62, cy - 4, 4, 8);
      if (m.t === 'dart') {                                        // 시위가 당겨지고 놓인다
        const pull = ph < 0.75 ? ph / 0.75 : 0; c.strokeStyle = '#c8b890'; c.lineWidth = 1; c.beginPath(); c.moveTo(30, cy - 16); c.lineTo(30 - pull * 14, cy); c.lineTo(30, cy + 16); c.stroke();
        if (shot) { const k = (ph - 0.75) / 0.25, x = 66 + k * (W - 80); c.strokeStyle = '#a88a60'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 16, cy); c.lineTo(x, cy); c.stroke(); c.fillStyle = '#c8ccd4'; c.beginPath(); c.moveTo(x, cy - 3); c.lineTo(x + 5, cy); c.lineTo(x, cy + 3); c.fill(); }
      } else {
        const fire = m.t === 'flamejet', col = fire ? ['#ff7a2a', '#ffd24a'] : ['#8fd0ff', '#e8f8ff'];
        c.fillStyle = fire ? '#7a3020' : '#2a4a6a'; c.fillRect(8, cy - 30, 18, 60); c.fillStyle = fire ? '#c8501a' : '#5a9ac8'; c.fillRect(10, cy + 28 - 50 * (0.5 + 0.5 * Math.cos(ph * TAU)), 14, 4);
        if (shot) { const k = (ph - 0.75) / 0.25; for (let i = 0; i < 14; i++) { const d = (i / 14) * (s.range || 6) * 14 * (0.4 + k), r = 3 + i * 0.8; c.globalAlpha = 0.7 * (1 - i / 14); c.fillStyle = col[i % 2]; c.beginPath(); c.arc(66 + d, cy + Math.sin(t * 20 + i) * i * 0.4, r, 0, TAU); c.fill(); } c.globalAlpha = 1; glow(c, 90, cy, 30, col[0], 0.5); }
      }
      return true;
    }
    case 'belt': case 'belt_fast': {     // 벨트 — 칸 몇 개를 옆에서 본 모습, 물려 있는 물건이 흘러간다
      const y = fy - 30, sc = 2;
      c.save(); c.scale(sc, sc);
      for (let i = 0; i < Math.ceil(W / (22 * sc)) + 1; i++) Factory.drawBelt(c, i * 22 - 11, y / sc - 11, m.t, 0, m.on ? (t / Factory.DWELL[m.t]) % 1 : 0);
      c.restore();
      if (m.it) ride(c, m.it.id, [10, y + 4], [W - 10, y + 4], (t / (Factory.DWELL[m.t] * 6)) % 1, 18);
      TileArt.draw(c, s.tile, 0, W - 34, 12);
      return true;
    }
  }
  return false;
}
