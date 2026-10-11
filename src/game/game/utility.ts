/* ===== game/utility.js — 유틸리티 칸 도구를 키로 쓴다(기본 Z = 왼쪽 칸 · X = 오른쪽 칸) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { TILE_DEF } from '../data.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
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
    this.scans.push({ kind, t0: this.time + this.SCAN_LIFT, lift: this.time, x: p.cx, y: p.cy, hits, n: 0, id: it && it.id });
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

  /** 렌더 단계(fx) — 조명 뒤라 어둠 속에서도 보인다 */
  rUtil(f: any) { const { WW } = dimsOf(this.world);
    if (!this.scans || !this.scans.length) return;
    const { c, camX, camY } = f, R = this.DET_R * TS, w = this.world;
    this.scans = this.scans.filter((s: any) => this.time - s.t0 < this.SCAN_T);
    const pulse = 0.65 + 0.35 * Math.sin(this.time * 6);
    for (const s of this.scans) {
      this.drawDetector(c, s, camX, camY);
      const age = this.time - s.t0, col = s.kind === 'ore' ? '111,227,255' : '255,107,107';
      if (age < 0) continue;                                           // 아직 들어 올리는 중
      const front = Math.min(1, age / this.SCAN_GROW) * R;             // 파동 앞머리(px) — 닿은 것부터 켜진다
      const fade = Math.min(1, (this.SCAN_T - age) / 2);               // 마지막 2초에 걷힌다
      const ox = s.x - camX, oy = s.y - camY;
      c.save();
      const ringA = 1 - age / (this.SCAN_GROW + 0.4);
      if (ringA > 0) {
        // 레이더 빗살 — 앞머리까지 한 바퀴 반 돌며 쓸고 간다
        const sw = age / this.SCAN_GROW * TAU * 1.5;
        const g = c.createRadialGradient(ox, oy, 0, ox, oy, Math.max(6, front));
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.22 * ringA})`);
        c.fillStyle = g; c.beginPath(); c.moveTo(ox, oy); c.arc(ox, oy, Math.max(6, front), sw - 0.55, sw); c.closePath(); c.fill();
        c.beginPath(); c.arc(ox, oy, Math.max(4, front), 0, TAU);
        c.strokeStyle = `rgba(${col},${0.16 * ringA})`; c.lineWidth = 14; c.stroke();
        c.strokeStyle = `rgba(${col},${0.6 * ringA})`; c.lineWidth = 2.5; c.stroke();
        c.strokeStyle = `rgba(${col},${0.25 * ringA})`; c.lineWidth = 1;    // 안쪽 눈금 고리
        for (const q of [0.33, 0.66]) if (front > R * q) { c.beginPath(); c.arc(ox, oy, R * q, 0, TAU); c.stroke(); }
      }
      for (const h of s.hits) {
        if (h.r * TS > front) continue;
        if (h.ping === undefined) { h.ping = this.time; this.scanBlip(s); }
        const pa = this.time - h.ping;
        if (pa < 0.5) {                                                  // 잡힌 순간 번지는 점
          const hx = h.e ? h.e.cx - camX : (h.x + 0.5) * TS - camX, hy = h.e ? h.e.cy - camY : (h.y + 0.5) * TS - camY;
          c.strokeStyle = `rgba(${col},${1 - pa * 2})`; c.lineWidth = 1.5;
          c.beginPath(); c.arc(hx, hy, 3 + pa * 26, 0, TAU); c.stroke();
        }
        if (h.e) {
          const e = h.e;
          if (e.dead) continue;
          const x = e.x - camX, y = e.y - camY, ew = e.w, eh = e.h, k = 6;
          if (x + ew < -20 || y + eh < -20 || x > this.W + 20 || y > this.H + 20) continue;
          c.strokeStyle = `rgba(${col},${0.95 * fade * pulse})`; c.lineWidth = 2;
          c.beginPath();                                               // 네 귀퉁이 꺾쇠 — 몸을 가리지 않게
          for (const [ax, ay, sx, sy] of [[x - 3, y - 3, 1, 1], [x + ew + 3, y - 3, -1, 1], [x - 3, y + eh + 3, 1, -1], [x + ew + 3, y + eh + 3, -1, -1]]) {
            c.moveTo(ax, ay + sy * k); c.lineTo(ax, ay); c.lineTo(ax + sx * k, ay);
          }
          c.stroke();
        } else {
          const x = h.x * TS - camX, y = h.y * TS - camY;
          if (x < -TS || y < -TS || x > this.W || y > this.H) continue;
          if (!TILE_DEF[w.tiles[h.y * WW + h.x]].ore) continue;          // 캐 버린 칸은 끈다
          c.globalAlpha = 0.3 * fade * pulse; c.fillStyle = h.c; c.fillRect(x, y, TS, TS);
          c.globalAlpha = 0.9 * fade * pulse; c.strokeStyle = h.c; c.lineWidth = 1.5; c.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
          c.globalAlpha = 1;
        }
      }
      c.restore();
    }
  }
};
mixin(Game.prototype, UtilityPart, true);
