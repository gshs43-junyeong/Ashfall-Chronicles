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
  utilReady: null,                              // 칸마다 다시 쓸 수 있는 G.time
  scans: null,
  /** 유틸리티 칸 i(0 = 왼쪽 · 1 = 오른쪽)의 도구를 쓴다 — 키(util1·util2)와 터치 칸이 부른다 */
  useUtil(i: number) {
    const p = this.player;
    if (!p || this.state !== 'play' || UI.dlg || UI.open) return;
    const it = p.equip['util' + (i + 1)];
    if (!it) { this.utilDeny(i); this.toast(tr('유틸리티 칸이 비어 있다'), 'bad'); return; }
    const d = idef(it);
    if (!d.act) { this.toast(tr('{item} — 끼워 두면 저절로 쓰인다', { item: d.n }), 'info'); return; }
    this.utilReady = this.utilReady || [0, 0];
    if (this.time < this.utilReady[i]) { this.utilDeny(i); return; }
    if (d.act === 'scan') this.scanPulse(d.det, i);
  },
  /** 다시 쓸 때까지 남은 초 */
  utilLeft(i: number) { return Math.max(0, ((this.utilReady || [0, 0])[i] || 0) - this.time); },
  utilDeny(i: number) {
    this.sfx('sk_deny');
    const el = document.querySelectorAll('#skillbar .usl')[i];
    if (el) { el.classList.remove('deny'); void (el as HTMLElement).offsetWidth; el.classList.add('deny'); }
  },
  scanPulse(kind: string, i: number) { const { WW, WH } = dimsOf(this.world);
    const p = this.player, w = this.world, R = this.DET_R, R2 = R * R;
    const px = Math.floor(p.cx / TS), py = Math.floor(p.cy / TS);
    const hits = [];
    if (kind === 'ore') {
      for (let y = Math.max(0, py - R); y <= Math.min(WH - 1, py + R); y++)
        for (let x = Math.max(0, px - R); x <= Math.min(WW - 1, px + R); x++) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy > R2) continue;
          const td = TILE_DEF[w.tiles[y * WW + x]];
          if (td && td.ore) hits.push({ x, y, c: td.c, r: Math.sqrt(dx * dx + dy * dy) });
        }
    } else {
      for (const e of this.ents) {
        if (!(e instanceof Enemy) || e.dead) continue;
        const dx = e.cx / TS - px, dy = e.cy / TS - py;
        if (dx * dx + dy * dy <= R2) hits.push({ e, r: Math.sqrt(dx * dx + dy * dy) });
      }
    }
    this.scans = (this.scans || []).filter((s: any) => s.kind !== kind);   // 같은 갈래는 새 파동이 덮는다
    this.scans.push({ kind, t0: this.time, x: p.cx, y: p.cy, hits });
    this.utilReady[i] = this.time + this.SCAN_CD;
    this.sfx('detector');
    this.toast(kind === 'ore' ? tr('탐지 파동 — 광맥 {n}칸', { n: hits.length }) : tr('탐지 파동 — 움직이는 것 {n}', { n: hits.length }), 'info');
  },

  /** 렌더 단계(fx) — 조명 뒤라 어둠 속에서도 보인다 */
  rUtil(f: any) { const { WW } = dimsOf(this.world);
    if (!this.scans || !this.scans.length) return;
    const { c, camX, camY } = f, R = this.DET_R * TS, w = this.world;
    this.scans = this.scans.filter((s: any) => this.time - s.t0 < this.SCAN_T);
    const pulse = 0.65 + 0.35 * Math.sin(this.time * 6);
    for (const s of this.scans) {
      const age = this.time - s.t0, col = s.kind === 'ore' ? '111,227,255' : '255,107,107';
      const front = Math.min(1, age / this.SCAN_GROW) * R;             // 파동 앞머리(px) — 닿은 것부터 켜진다
      const fade = Math.min(1, (this.SCAN_T - age) / 2);               // 마지막 2초에 걷힌다
      c.save();
      const ringA = 1 - age / (this.SCAN_GROW + 0.4);
      if (ringA > 0) {
        c.beginPath(); c.arc(s.x - camX, s.y - camY, Math.max(4, front), 0, TAU);
        c.strokeStyle = `rgba(${col},${0.16 * ringA})`; c.lineWidth = 14; c.stroke();
        c.strokeStyle = `rgba(${col},${0.6 * ringA})`; c.lineWidth = 2.5; c.stroke();
      }
      for (const h of s.hits) {
        if (h.r * TS > front) continue;
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
