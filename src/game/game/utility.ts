/* ===== game/utility.js — 유틸리티 칸 도구를 키로 쓴다(기본 Z = 왼쪽 칸 · X = 오른쪽 칸) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { TILE_DEF } from '../data.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy, Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const UtilityPart: Bag = {
  /* 탐지 파동 — 반경 DET_R 칸을 훑어 벽 너머 광맥·몬스터를 SCAN_T 초 동안 화면에 비춘다. 미니맵에 늘 비치는 것(corpse.ts)은 그대로.
     ★ 파동이 없던 때는 미니맵을 끄면 탐지기가 하는 일이 없었다 — 화면 표시가 탐지기의 본업이다. */
  SCAN_T: 10, SCAN_CD: 8, SCAN_GROW: 0.9,
  SCAN_LIFT: 0.3,                               // 기계를 들어 올리는 동안(초) — 파동은 그 뒤에 퍼진다
  SCAN_PW: 6,                                   // 파동 한 번의 전력(배터리 하나 200 = 33번)
  utilReady: null,                              // 칸마다 다시 쓸 수 있는 G.time
  scanReady: null,                              // 갈래(ore · mob)마다 — 손에 든 것과 칸에 낀 것이 같이 식는다
  scans: null,
  /** 유틸리티 칸 i(0 = 왼쪽 · 1 = 오른쪽)의 도구를 쓴다 — 키(util1·util2)와 터치 칸이 부른다 */
  useUtil(i: number) {
    const p = this.player;
    if (!p || this.state !== 'play' || UI.dlg || UI.open) return;
    const it = p.equip['util' + (i + 1)];
    if (!it) { this.utilDeny(i); this.toast(tr('유틸리티 칸이 비어 있다'), 'bad'); return; }
    const d = idef(it);
    if (!d.act) { this.toast(tr('{item} — 끼워 두면 저절로 쓰인다', { item: d.n }), 'info'); return; }
    if (d.act === 'scan' && !this.scanPulse(d.det, it)) this.utilDeny(i);
  },
  /** 손에 든 탐지기를 우클릭 — 칸에 끼지 않아도 쓴다 */
  useHeldDetector(it: Bag) { this.scanPulse(idef(it).det, it); },
  /** 다시 쓸 때까지 남은 초 */
  utilLeft(i: number) {
    const it = this.player && this.player.equip['util' + (i + 1)];
    return it ? Math.max(0, ((this.scanReady || {})[idef(it).det || ''] || 0) - this.time) : 0;
  },
  utilDeny(i: number) {
    this.sfx('sk_deny');
    const el = document.querySelectorAll('#skillbar .usl')[i];
    if (el) { el.classList.remove('deny'); void (el as HTMLElement).offsetWidth; el.classList.add('deny'); }
  },
  /** 파동 — 식는 중 · 전력이 없으면 false */
  scanPulse(kind: string, it: Bag) { const { WW, WH } = dimsOf(this.world);
    const p = this.player, w = this.world, R = this.DET_R, R2 = R * R;
    this.scanReady = this.scanReady || {};
    if (this.time < (this.scanReady[kind] || 0)) { this.sfx('sk_deny'); return false; }
    if (!p.useCharge(this.SCAN_PW)) { this.sfx('sk_deny'); this.toast(tr('전력이 없다 — 충전된 배터리가 필요하다'), 'bad'); return false; }
    const px = Math.floor(p.cx / TS), py = Math.floor(p.cy / TS);
    const hits = [];
    if (kind === 'ore') {
      for (let y = Math.max(0, py - R); y <= Math.min(WH - 1, py + R); y++)
        for (let x = Math.max(0, px - R); x <= Math.min(WW - 1, px + R); x++) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy > R2) continue;
          const td = TILE_DEF[w.tiles[y * WW + x]];
          if (td && td.ore) hits.push({ x, y, c: td.c, r: Math.sqrt(dx * dx + dy * dy), a: Math.atan2(dy, dx) });
        }
    } else {
      for (const e of this.ents) {
        if (!(e instanceof Enemy) || e.dead) continue;
        const dx = e.cx / TS - px, dy = e.cy / TS - py;
        if (dx * dx + dy * dy <= R2) hits.push({ e, r: Math.sqrt(dx * dx + dy * dy), a: Math.atan2(dy, dx) });
      }
    }
    this.scans = (this.scans || []).filter((s: any) => s.kind !== kind);   // 같은 갈래는 새 파동이 덮는다
    const sc: Bag = { kind, t0: this.time + this.SCAN_LIFT, lift: this.time, x: p.cx, y: p.cy, hits, n: 0, id: it && it.id };
    if (kind === 'ore') {
      /* 땅울림 금 — 발밑에서 사방으로 갈라져 나가는 꺾인 선(그림만, 판 마다 다르게) */
      sc.cracks = [];
      for (let i = 0; i < 9; i++) {
        let a = (i / 9) * TAU + Math.random() * 0.5, x = 0, y = 0; const pts = [0, 0];
        for (let k = 0; k < 9; k++) { a += (Math.random() - 0.5) * 0.9; const l = 14 + Math.random() * 22; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push(x, y); }
        sc.cracks.push(pts);
      }
      /* 광맥 이음 — 같은 광석끼리 가장 가까운 이웃(4칸 안)을 잇는다: 낱칸이 아니라 '맥'으로 읽히게 */
      sc.links = [];
      const H: any[] = hits.slice(0, 400);
      for (let i = 0; i < H.length; i++) {
        let best = -1, bd = 17;
        for (let j = 0; j < H.length; j++) {
          if (i === j || H[j].c !== H[i].c) continue;
          const d2 = (H[i].x - H[j].x) ** 2 + (H[i].y - H[j].y) ** 2;
          if (d2 < bd && d2 > 1.5) { bd = d2; best = j; }       // 바로 붙은 칸은 칸 테두리로 이미 이어 보인다
        }
        if (best >= 0 && !(best < i && sc.links.some((l: any) => l[0] === H[best] && l[1] === H[i]))) sc.links.push([H[i], H[best]]);
      }
    }
    this.scans.push(sc);
    this.scanReady[kind] = this.time + this.SCAN_CD;
    this.sfx('detector');
    this.toast(kind === 'ore' ? tr('탐지 파동 — 광맥 {n}칸', { n: hits.length }) : tr('탐지 파동 — 움직이는 것 {n}', { n: hits.length }), 'info');
    return true;
  },
  /** 잡힌 것을 훑고 지날 때의 짧은 삑 — 많으면 처음 몇 개만 */
  scanBlip(s: Bag) {
    if (s.n++ >= 10 || !this.duelTone) return;
    const f = s.kind === 'ore' ? 1700 : 1150;
    this.duelTone(f + s.n * 40, f * 0.8, 0.05, 0.05, 'triangle');
  },

  /** 들어 올린 탐지기 · 안테나에서 퍼지는 전파 — 파동이 퍼지는 동안 손 앞에 */
  drawDetector(c: CanvasRenderingContext2D, s: Bag, camX: number, camY: number) {
    const p = this.player, t = this.time - s.lift, life = this.SCAN_LIFT + this.SCAN_GROW + 0.5;
    if (t > life || !p) return;
    const col = s.kind === 'ore' ? '111,227,255' : '255,107,107';
    const up = Math.min(1, t / this.SCAN_LIFT), down = Math.min(1, (life - t) / 0.3), k = Math.min(up, down);
    const face = p.facing >= 0 ? 1 : -1, hx = p.cx - camX + face * 11, hy = p.y - camY + 18 - 9 * (1 - Math.pow(1 - k, 3));
    c.save(); c.globalAlpha = k;
    c.fillStyle = '#2a3038'; c.fillRect(hx - 5, hy - 7, 10, 13);                   // 몸통
    c.fillStyle = '#4a5462'; c.fillRect(hx - 5, hy - 7, 10, 2);
    const blink = 0.55 + 0.45 * Math.sin(this.time * 24);
    c.fillStyle = `rgba(${col},${0.5 + 0.5 * blink})`; c.fillRect(hx - 3, hy - 4, 6, 5);   // 화면
    c.strokeStyle = '#8a96a6'; c.lineWidth = 1.2;                                     // 안테나
    c.beginPath(); c.moveTo(hx + 3, hy - 7); c.lineTo(hx + 5, hy - 16); c.stroke();
    c.fillStyle = `rgba(${col},${blink})`; c.beginPath(); c.arc(hx + 5, hy - 16, 1.8, 0, TAU); c.fill();
    if (t > this.SCAN_LIFT * 0.6) for (let i = 0; i < 3; i++) {                        // 전파 — 안테나 끝에서 번지는 호
      const ph = ((this.time * 2.4 + i / 3) % 1), r = 4 + ph * 16;
      c.strokeStyle = `rgba(${col},${(1 - ph) * 0.8})`; c.lineWidth = 1.5;
      c.beginPath(); c.arc(hx + 5, hy - 16, r, -Math.PI * 0.85, -Math.PI * 0.15); c.stroke();
    }
    c.restore();
  },

  /** 렌더 단계(fx) — 조명 뒤라 어둠 속에서도 보인다. 갈래마다 제 연출: 광맥 = 땅울림(금 · 벌집 물결 · 빛기둥 · 맥 이음) ·
      몬스터 = 심장 소리(맥박 치는 고리 · 겨눔 · 끈 · 화면 밖 화살) */
  rUtil(f: any) {
    if (!this.scans || !this.scans.length) return;
    const { c, camX, camY } = f;
    this.scans = this.scans.filter((s: any) => this.time - s.t0 < this.SCAN_T);
    for (const s of this.scans) {
      this.drawDetector(c, s, camX, camY);
      const age = this.time - s.t0;
      if (age < 0) continue;                                           // 아직 들어 올리는 중
      c.save();
      if (s.kind === 'ore') this.drawOreScan(c, s, age, camX, camY);
      else this.drawMobScan(c, s, age, camX, camY);
      c.restore();
    }
  },
  /** 화면 가장자리 물듦 — 파동이 터지는 순간만(화면 효과 배율을 따른다) */
  scanFlash(c: CanvasRenderingContext2D, col: string, age: number) {
    const k = Math.max(0, 1 - age / 0.55) * (this.fxScale ? this.fxScale() : 1);
    if (k <= 0) return;
    const W = this.W, H = this.H, g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.22 * k})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  },
  drawOreScan(c: CanvasRenderingContext2D, s: Bag, age: number, camX: number, camY: number) { const { WW } = dimsOf(this.world);
    const R = this.DET_R * TS, col = '111,227,255', w = this.world;
    const grow = Math.min(1, age / this.SCAN_GROW), front = grow * R, fade = Math.min(1, (this.SCAN_T - age) / 2);
    const ox = s.x - camX, oy = s.y - camY, pulse = 0.65 + 0.35 * Math.sin(this.time * 6);
    this.scanFlash(c, col, age);
    const ringA = 1 - age / (this.SCAN_GROW + 0.5);
    if (ringA > 0) {
      // 땅울림 금 — 앞머리를 따라 자라며 빛나다 식는다
      c.lineCap = 'round';
      for (const pts of s.cracks) {
        c.beginPath(); c.moveTo(ox, oy);
        for (let i = 2; i < pts.length; i += 2) {
          const d = Math.hypot(pts[i], pts[i + 1]); if (d > front * 0.55) break;
          c.lineTo(ox + pts[i], oy + pts[i + 1]);
        }
        c.strokeStyle = `rgba(${col},${0.18 * ringA})`; c.lineWidth = 5; c.stroke();
        c.strokeStyle = `rgba(220,250,255,${0.75 * ringA})`; c.lineWidth = 1.4; c.stroke();
      }
      // 벌집 물결 — 앞머리 뒤 50px 띠에만 육각 칸이 켜졌다 꺼진다
      const hs = 15, hw = hs * Math.sqrt(3), band = 56;
      c.lineWidth = 1;
      const x0 = Math.floor((-front) / hw) - 1, x1 = Math.ceil(front / hw) + 1, y0 = Math.floor(-front / (hs * 1.5)) - 1, y1 = Math.ceil(front / (hs * 1.5)) + 1;
      if (front > 10) for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
        const cx = gx * hw + (gy & 1 ? hw / 2 : 0), cy = gy * hs * 1.5, d = Math.hypot(cx, cy);
        if (d > front || d < front - band) continue;
        const a = (1 - (front - d) / band) * ringA * 0.5;
        const X = ox + cx, Y = oy + cy;
        if (X < -hs || Y < -hs || X > this.W + hs || Y > this.H + hs) continue;
        c.strokeStyle = `rgba(${col},${a})`; c.beginPath();
        for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * Math.PI / 3; const px = X + Math.cos(an) * hs * 0.92, py = Y + Math.sin(an) * hs * 0.92; k ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.closePath(); c.stroke();
      }
      // 앞머리 — 울퉁불퉁한 지진파 고리(두 겹)
      for (const [off, al, lw] of [[0, 0.75, 2.5], [-14, 0.3, 1.2]] as [number, number, number][]) {
        const rr = Math.max(4, front + off);
        c.beginPath();
        for (let k = 0; k <= 72; k++) {
          const an = k / 72 * TAU, wob = Math.sin(an * 9 + this.time * 7) * 3 + Math.sin(an * 4 - this.time * 3) * 2;
          const px = ox + Math.cos(an) * (rr + wob), py = oy + Math.sin(an) * (rr + wob);
          k ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.strokeStyle = `rgba(${col},${al * ringA})`; c.lineWidth = lw; c.stroke();
      }
      c.beginPath(); c.arc(ox, oy, Math.max(4, front), 0, TAU); c.strokeStyle = `rgba(${col},${0.12 * ringA})`; c.lineWidth = 16; c.stroke();
    }
    // 광맥 이음 — 둘 다 닿은 뒤 은은하게, 빛 한 톨이 맥을 따라 흐른다
    for (const [a, b] of s.links || []) {
      if (a.ping === undefined || b.ping === undefined) continue;
      if (!TILE_DEF[w.tiles[a.y * WW + a.x]].ore || !TILE_DEF[w.tiles[b.y * WW + b.x]].ore) continue;
      const ax = (a.x + 0.5) * TS - camX, ay = (a.y + 0.5) * TS - camY, bx = (b.x + 0.5) * TS - camX, by = (b.y + 0.5) * TS - camY;
      if (Math.max(ax, bx) < -TS || Math.min(ax, bx) > this.W + TS || Math.max(ay, by) < -TS || Math.min(ay, by) > this.H + TS) continue;
      c.globalAlpha = 0.45 * fade; c.strokeStyle = a.c; c.lineWidth = 1.2; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.setLineDash([]);
      const u = (this.time * 0.8 + a.x * 0.13) % 1;
      c.globalAlpha = 0.9 * fade; c.fillStyle = '#eafcff'; c.beginPath(); c.arc(ax + (bx - ax) * u, ay + (by - ay) * u, 1.6, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    for (const h of s.hits) {
      if (h.r * TS > front) continue;
      if (h.ping === undefined) { h.ping = this.time; this.scanBlip(s); this.oreBurst(s, h); }
      const x = h.x * TS - camX, y = h.y * TS - camY;
      if (x < -TS * 2 || y < -TS * 4 || x > this.W + TS || y > this.H + TS) continue;
      if (!TILE_DEF[w.tiles[h.y * WW + h.x]].ore) continue;          // 캐 버린 칸은 끈다
      const pa = this.time - h.ping;
      if (pa < 0.7) {                                                   // 닿은 순간 — 칸에서 솟는 빛기둥
        const k = 1 - pa / 0.7, g = c.createLinearGradient(0, y + TS, 0, y - 46 * k);
        g.addColorStop(0, h.c); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = 0.6 * k; c.fillStyle = g; c.fillRect(x + TS * 0.25, y - 46 * k, TS * 0.5, TS + 46 * k);
        c.globalAlpha = k; c.strokeStyle = '#eafcff'; c.lineWidth = 1.5; c.strokeRect(x - 3 * k, y - 3 * k, TS + 6 * k, TS + 6 * k);
      }
      // 남는 표시 — 광석 색 칸 + 숨 쉬는 테 + 위로 반짝이는 결정 점
      c.globalAlpha = 0.28 * fade * pulse; c.fillStyle = h.c; c.fillRect(x, y, TS, TS);
      c.globalAlpha = 0.9 * fade * pulse; c.strokeStyle = h.c; c.lineWidth = 1.5; c.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
      const tw = (this.time * 1.7 + h.x * 0.37 + h.y * 0.61) % 1;
      if (tw < 0.25) {
        const k = Math.sin(tw / 0.25 * Math.PI), sx = x + TS / 2, sy = y + TS / 2;
        c.globalAlpha = k * fade; c.fillStyle = '#ffffff';
        c.beginPath(); c.moveTo(sx, sy - 5 * k); c.lineTo(sx + 1.4, sy); c.lineTo(sx, sy + 5 * k); c.lineTo(sx - 1.4, sy); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(sx - 5 * k, sy); c.lineTo(sx, sy + 1.4); c.lineTo(sx + 5 * k, sy); c.lineTo(sx, sy - 1.4); c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
    }
  },
  /** 광맥에 닿은 순간 — 광석 색 조각이 튄다(화면 안 · 앞의 40칸만) */
  oreBurst(s: Bag, h: Bag) {
    s.bursts = (s.bursts || 0) + 1;
    if (s.bursts > 40) return;
    const x = (h.x + 0.5) * TS, y = (h.y + 0.5) * TS;
    for (let i = 0; i < 4; i++) this.parts.push(new Part(x, y, i ? h.c : '#eafcff', -60, 0.4, { g: 0.6, r: 0.8, spd: 0.6, glow: 1 }));
  },
  drawMobScan(c: CanvasRenderingContext2D, s: Bag, age: number, camX: number, camY: number) {
    const R = this.DET_R * TS, col = '255,107,107';
    const grow = Math.min(1, age / this.SCAN_GROW), front = grow * R, fade = Math.min(1, (this.SCAN_T - age) / 2);
    const ox = s.x - camX, oy = s.y - camY;
    /* 심장 박동(쿵-쿵 · 1초에 한 번) — 고리 · 겨눔 · 화살이 같이 뛴다 */
    const ph = this.time % 1, beat = Math.max(Math.exp(-((ph - 0.05) ** 2) / 0.002), 0.7 * Math.exp(-((ph - 0.25) ** 2) / 0.002));
    this.scanFlash(c, col, age);
    const ringA = 1 - age / (this.SCAN_GROW + 0.5);
    if (ringA > 0) {
      const sw = age / this.SCAN_GROW * TAU * 1.5;
      const g = c.createRadialGradient(ox, oy, 0, ox, oy, Math.max(6, front));
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.24 * ringA})`);
      c.fillStyle = g; c.beginPath(); c.moveTo(ox, oy); c.arc(ox, oy, Math.max(6, front), sw - 0.6, sw); c.closePath(); c.fill();
      // 맥박 고리 — 빗살 자리에서 심전도처럼 튄다
      const rr = Math.max(4, front);
      c.beginPath();
      for (let k = 0; k <= 120; k++) {
        const an = k / 120 * TAU;
        let d = an - sw; d = ((d % TAU) + TAU) % TAU; if (d > Math.PI) d -= TAU;
        const spike = Math.abs(d) < 0.25 ? Math.sin(d / 0.25 * Math.PI * 2) * 14 * (1 - Math.abs(d) / 0.25) : 0;
        const px = ox + Math.cos(an) * (rr + spike), py = oy + Math.sin(an) * (rr + spike);
        k ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.strokeStyle = `rgba(${col},${0.8 * ringA})`; c.lineWidth = 2.2; c.stroke();
      for (const q of [0.92, 0.84]) { c.beginPath(); c.arc(ox, oy, rr * q, 0, TAU); c.strokeStyle = `rgba(${col},${0.25 * ringA * q})`; c.lineWidth = 1; c.stroke(); }
    }
    for (const h of s.hits) {
      if (h.r * TS > front) continue;
      if (h.ping === undefined) { h.ping = this.time; this.scanBlip(s); }
      const e = h.e; if (e.dead) continue;
      const pa = this.time - h.ping, ex = e.cx - camX, ey = e.cy - camY;
      const off = ex < -10 || ey < -10 || ex > this.W + 10 || ey > this.H + 10;
      if (off) {                                                        // 화면 밖 — 가장자리 화살이 그쪽을 가리킨다
        const a = Math.atan2(ey - this.H / 2, ex - this.W / 2), m = 26;
        const kx = (this.W / 2 - m) / Math.max(1e-3, Math.abs(Math.cos(a))), ky = (this.H / 2 - m) / Math.max(1e-3, Math.abs(Math.sin(a)));
        const rr = Math.min(kx, ky), ax = this.W / 2 + Math.cos(a) * rr, ay = this.H / 2 + Math.sin(a) * rr, sz = 7 + beat * 3;
        c.save(); c.translate(ax, ay); c.rotate(a); c.globalAlpha = 0.85 * fade;
        c.fillStyle = `rgba(${col},1)`; c.beginPath(); c.moveTo(sz, 0); c.lineTo(-sz * 0.7, sz * 0.7); c.lineTo(-sz * 0.35, 0); c.lineTo(-sz * 0.7, -sz * 0.7); c.closePath(); c.fill();
        c.restore();
        continue;
      }
      if (pa < 1.6) {                                                   // 겨눔 끈 — 나에게서 그 몸까지
        const k = 1 - pa / 1.6;
        c.globalAlpha = 0.4 * k; c.strokeStyle = `rgba(${col},1)`; c.lineWidth = 1; c.setLineDash([2, 5]); c.lineDashOffset = -this.time * 30;
        c.beginPath(); c.moveTo(this.player.cx - camX, this.player.cy - camY); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
      }
      // 겨눔 — 크게 돌며 조여 들어와 몸에 딱 붙는다, 그 뒤는 맥박에 맞춰 숨 쉰다
      const lock = Math.min(1, pa / 0.35), ease = 1 - Math.pow(1 - lock, 3);
      const pad = 3 + (1 - ease) * 22 + beat * 2.5, rot = (1 - ease) * 1.6;
      const x = e.x - camX - pad, y = e.y - camY - pad, ew = e.w + pad * 2, eh = e.h + pad * 2, k = 6 + (1 - ease) * 4;
      c.save(); c.translate(x + ew / 2, y + eh / 2); c.rotate(rot); c.translate(-(x + ew / 2), -(y + eh / 2));
      c.globalAlpha = (0.55 + 0.45 * beat) * fade * (0.4 + 0.6 * lock); c.strokeStyle = `rgba(${col},1)`; c.lineWidth = 2;
      c.beginPath();
      for (const [ax, ay, sx, sy] of [[x, y, 1, 1], [x + ew, y, -1, 1], [x, y + eh, 1, -1], [x + ew, y + eh, -1, -1]]) {
        c.moveTo(ax, ay + sy * k); c.lineTo(ax, ay); c.lineTo(ax + sx * k, ay);
      }
      c.stroke();
      if (lock >= 1) {                                                  // 붙은 뒤 — 네 변 가운데 눈금
        c.lineWidth = 1.2; c.beginPath();
        c.moveTo(x + ew / 2, y - 3); c.lineTo(x + ew / 2, y + 3); c.moveTo(x + ew / 2, y + eh - 3); c.lineTo(x + ew / 2, y + eh + 3);
        c.moveTo(x - 3, y + eh / 2); c.lineTo(x + 3, y + eh / 2); c.moveTo(x + ew - 3, y + eh / 2); c.lineTo(x + ew + 3, y + eh / 2);
        c.stroke();
      }
      c.restore();
      if (pa < 0.45) { c.globalAlpha = 1 - pa / 0.45; c.strokeStyle = `rgba(${col},1)`; c.lineWidth = 1.5; c.beginPath(); c.arc(ex, ey, 4 + pa * 60, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }
  }
};
mixin(Game.prototype, UtilityPart, true);
