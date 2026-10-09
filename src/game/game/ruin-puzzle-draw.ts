/* ===== game/ruin-puzzle-draw.js — 봉인 방 그림 — 장치(수정 · 등불 · 거울 · 갓 · 심장 · 바퀴 · 문양) · 빛줄기 · 진행 띠 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { PUZZLE_GIVEUP } from '../data/ruins.js';
import { Sprites } from '../sprites.js';
import { Game } from '../game.js';
import { beamExit } from './ruin-puzzle.js';

const TAU = Math.PI * 2;

export const RuinPuzzleDrawPart: Bag = {

  /** 세계 위 — 장치마다 빛 · 모양. 켜진 것은 빛깔로, 꺼진 것은 어둡게 */
  drawPuzzle(c: CanvasRenderingContext2D) {
    const pz = this.puzzle; if (!pz || !pz.nodes) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, t = this.time || 0;
    c.save();
    if (pz.k === 'mirror') this.drawPuzzleBeam(c, pz, cx0, cy0, t);
    pz.nodes.forEach((v: Bag, i: number) => {
      const x = v.x - cx0, y = v.y - cy0, hit = Math.max(0, v.hit || 0);
      const lit = pz.k === 'toggle' || pz.k === 'bloom' ? v.s === 1 : pz.k === 'dial' ? v.s === v.tgt : hit > 0;
      const open = pz.k === 'bloom' && ((pz.t / v.per + v.ph) % 1) < 0.38;
      const glow = (lit ? 1 : 0.25) + hit * 1.6 + (open ? 0.5 : 0);
      const im = Sprites.vfxArt('mote', pz.c);
      if (im) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, glow * 0.7); const R = 34 + hit * 30; c.drawImage(im, x - R, y - R, R * 2, R * 2); c.globalCompositeOperation = 'source-over'; }
      c.globalAlpha = 1;
      c.save(); c.translate(x, y); c.scale(1.4, 1.4);            // 손으로 짚을 것이라 타일보다 조금 크게
      this.drawPuzzleNode(c, pz, v, 0, 0, lit, open, hit, t, i);
      c.restore();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1;                // 받침 — 바닥에 선 장치로 읽히게
      c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x, v.fy - cy0); c.stroke();
    });
    c.restore();
  },

  drawPuzzleNode(c: CanvasRenderingContext2D, pz: Bag, v: Bag, x: number, y: number, lit: boolean, open: boolean, hit: number, t: number, i: number) {
    const col = pz.c, dark = '#2a2632', k = pz.skin;
    c.lineWidth = 2; c.strokeStyle = '#141018';
    if (k === 'crystal') {
      c.fillStyle = lit ? col : '#4a5868';
      c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 8, y - 2); c.lineTo(x + 5, y + 11); c.lineTo(x - 5, y + 11); c.lineTo(x - 8, y - 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = lit ? '#ffffff' : '#7a8898'; c.globalAlpha = 0.7;
      c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + 3, y - 2); c.lineTo(x, y + 8); c.closePath(); c.fill(); c.globalAlpha = 1;
    } else if (k === 'lamp') {
      c.fillStyle = '#3a2a1c'; c.fillRect(x - 7, y - 12, 14, 3); c.fillRect(x - 6, y + 8, 12, 3);
      c.fillStyle = lit ? 'rgba(255,200,110,0.55)' : 'rgba(60,50,40,0.6)'; c.fillRect(x - 6, y - 9, 12, 17); c.strokeRect(x - 6, y - 9, 12, 17);
      if (lit) { const f = 1 + Math.sin(t * 14 + i) * 0.15; c.fillStyle = '#fff0b0'; c.beginPath(); c.ellipse(x, y + 1, 2.5 * f, 5 * f, 0, 0, TAU); c.fill(); }
    } else if (k === 'mirror') {
      c.fillStyle = dark; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = v.s === 2 ? '#6a6058' : '#fff6d8'; c.lineWidth = 3;
      c.beginPath();
      if (v.s === 0) { c.moveTo(x - 7, y + 7); c.lineTo(x + 7, y - 7); }
      else if (v.s === 1) { c.moveTo(x - 7, y - 7); c.lineTo(x + 7, y + 7); }
      else { c.arc(x, y, 2, 0, TAU); }
      c.stroke();
    } else if (k === 'cap') {
      const up = open ? 1 : 0.55, w = 10 + up * 4;
      c.fillStyle = '#d8d0b8'; c.fillRect(x - 2, y - 2, 4, 13);
      c.fillStyle = lit ? col : open ? '#8fc860' : '#4a5a38';
      c.beginPath(); c.ellipse(x, y - 2 - up * 4, w, 6 + up * 3, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      for (let q = -1; q <= 1; q++) { c.beginPath(); c.arc(x + q * 5, y - 5 - up * 5, 1.5, 0, TAU); c.fill(); }
    } else if (k === 'heart') {
      const b = 1 + (hit > 0 ? 0.35 * hit / 0.5 : 0.05 * Math.sin(t * 6 + i));
      c.fillStyle = hit > 0 ? '#ffd0d8' : '#8a2a3a';
      c.beginPath(); c.moveTo(x, y + 10 * b);
      c.bezierCurveTo(x - 14 * b, y, x - 10 * b, y - 12 * b, x, y - 5 * b);
      c.bezierCurveTo(x + 10 * b, y - 12 * b, x + 14 * b, y, x, y + 10 * b); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(40,10,20,0.6)'; c.beginPath(); c.moveTo(x - 3, y - 4); c.quadraticCurveTo(x + 2, y + 1, x - 1, y + 6); c.stroke();
    } else if (k === 'valve') {
      const a = v.s / (pz.m || 3) * TAU;
      c.strokeStyle = lit ? col : '#7a8a98'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, y, 10, 0, TAU); c.stroke();
      for (let q = 0; q < 3; q++) { const aa = a + q * TAU / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(aa) * 10, y + Math.sin(aa) * 10); c.stroke(); }
      c.fillStyle = lit ? '#ffffff' : '#c8d8e8'; c.beginPath(); c.arc(x + Math.cos(a - Math.PI / 2) * 10, y + Math.sin(a - Math.PI / 2) * 10, 2.5, 0, TAU); c.fill();
      for (let q = 0; q < (pz.m || 3); q++) {               // 위에 새긴 눈금 — 맞출 칸이 밝다
        c.fillStyle = q === v.tgt ? col : 'rgba(200,220,240,0.3)';
        c.fillRect(x - 9 + q * 7, y - 22, 5, 4);
      }
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x - 9 + v.s * 7 + 1, y - 17, 3, 2);
    } else {                                                 // rune — 문양 돌
      c.fillStyle = hit > 0 ? '#3a3050' : dark; c.fillRect(x - 9, y - 12, 18, 24); c.strokeRect(x - 9, y - 12, 18, 24);
      c.strokeStyle = hit > 0 ? '#ffffff' : col; c.lineWidth = 2;
      c.beginPath();
      if (i % 5 === 0) { c.moveTo(x - 4, y - 6); c.lineTo(x + 4, y + 6); c.moveTo(x + 4, y - 6); c.lineTo(x - 4, y + 6); }
      else if (i % 5 === 1) { c.arc(x, y, 5, 0, TAU); c.moveTo(x, y - 8); c.lineTo(x, y + 8); }
      else if (i % 5 === 2) { c.moveTo(x - 5, y + 6); c.lineTo(x, y - 7); c.lineTo(x + 5, y + 6); c.closePath(); }
      else if (i % 5 === 3) { c.moveTo(x - 5, y - 5); c.lineTo(x + 5, y - 5); c.lineTo(x - 5, y + 5); c.lineTo(x + 5, y + 5); }
      else { c.moveTo(x, y - 7); c.lineTo(x + 6, y); c.lineTo(x, y + 7); c.lineTo(x - 6, y); c.closePath(); }
      c.stroke();
    }
  },

  /** 거울 — 들어오는 해(왼쪽 아래) · 지금 빛줄기 · 이어야 할 태양 문장 */
  drawPuzzleBeam(c: CanvasRenderingContext2D, pz: Bag, cx0: number, cy0: number, t: number) {
    const N = pz.nodes, cols = pz.cols, gap = cols > 1 ? N[1].x - N[0].x : 48, dy = N[0].y - N[cols].y;
    const at = (cc: number, r: number) => [N[0].x + cc * gap - cx0, N[0].y - r * dy - cy0];
    const { out, path } = beamExit(N.map((v: Bag) => v.s), cols);
    const exitPt = (o: string) => {
      const s = o[0], n = +o.slice(1);
      if (s === 'u') return at(n, 1.8); if (s === 'd') return at(n, -0.8);
      if (s === 'r') return at(cols - 0.2, n); return at(-0.8, n);
    };
    const src = at(-0.8, 0), tg = exitPt(pz.tgt);
    const sig = Sprites.vfxArt('sigil', pz.c), im = Sprites.vfxArt('flare', '#ffe08a');
    c.globalCompositeOperation = 'lighter';
    if (sig) { c.globalAlpha = 0.85; c.save(); c.translate(tg[0], tg[1]); c.rotate(t * 0.6); c.drawImage(sig, -22, -22, 44, 44); c.restore(); }
    if (im) { c.globalAlpha = 0.9; c.drawImage(im, src[0] - 22, src[1] - 22, 44, 44); }
    const pts = [src, ...path.slice(1).map(([cc, r]) => at(cc, r)), exitPt(out)];
    for (const [lw, a] of [[9, 0.25], [3, 0.9]] as [number, number][]) {
      c.globalAlpha = a * (0.85 + 0.15 * Math.sin(t * 9)); c.strokeStyle = lw > 5 ? pz.c : '#fffbe8'; c.lineWidth = lw; c.lineCap = 'round';
      c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  },

  /** 화면 위 — 이름 · 진행 · 봉인이 풀릴 때까지 */
  drawPuzzleHud(c: CanvasRenderingContext2D) {
    const pz = this.puzzle; if (!pz || !pz.nodes) return;
    const W = 300, x = (this.W - W) / 2, y = 64;
    let prog = '';
    if (pz.k === 'toggle' || pz.k === 'bloom') prog = `${pz.nodes.filter((v: Bag) => v.s === 1).length}/${pz.nodes.length}`;
    else if (pz.k === 'dial') prog = `${pz.nodes.filter((v: Bag) => v.s === v.tgt).length}/${pz.nodes.length}`;
    else if (pz.k === 'simon') prog = pz.show > 0 ? tr('보아라…') : `${pz.step}/${pz.seq ? pz.seq.length : 0}`;
    else prog = tr('빛을 이어라');
    c.save();
    c.fillStyle = 'rgba(12,9,16,0.75)'; c.fillRect(x, y, W, 26);
    c.strokeStyle = pz.c; c.globalAlpha = 0.6; c.strokeRect(x + 0.5, y + 0.5, W - 1, 25); c.globalAlpha = 1;
    c.font = '12px ' + FONT; c.textBaseline = 'middle';
    c.textAlign = 'left'; c.fillStyle = pz.c; c.fillText(tr('봉인 방') + ' · ' + pz.n, x + 9, y + 11);
    c.textAlign = 'right'; c.fillStyle = '#e8dcc0'; c.fillText(prog, x + W - 9, y + 11);
    const left = Math.max(0, 1 - pz.t / PUZZLE_GIVEUP);
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x + 8, y + 21, W - 16, 2);
    c.fillStyle = '#b8a8ff'; c.fillRect(x + 8, y + 21, (W - 16) * left, 2);
    c.restore();
  },
};

mixin(Game.prototype, RuinPuzzleDrawPart, true);
