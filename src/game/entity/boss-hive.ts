/* ===== entity/boss-hive.ts — 곪은 벌집 어미(둥지 뒷벽 전체가 육각 방 벌집) — 머리 내밀기(두더지 잡기) · 방 열기 · 담즙 · 침 · 둥지 개화 ===== */
import { app as G } from '../ctx.js';
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TS } from '../world.js';
import { DmgText, Enemy, Proj } from '../entity.js';
/* 벌집은 뒷벽이라 움직이지 않고 닿아도 아프지 않다(def.wall). 판정 상자는 어미 머리 — 아랫줄 방 다섯(LAIR) 가운데 하나에서 내민다.
   머리가 방으로 들어가 있는 동안은 거의 들어가지 않는다(받는 피해 ×0.12) · 나와 있으면 ×1.25 — 어디서 나올지 방이 먼저 부푼다.
   방 상태(열린 애벌레 방 hvOpen)와 머리 자리는 위험 지대(hvmove · hvbrood · hvbloom)로 참가자에게도 같다.
   ★ 방 자리는 tools/mkbossrig.py HIVE_CELLS(설계 좌표 ×4)와 같아야 한다. */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; [k: string]: any };
let hid = 0;
const nid = () => 6e6 + (hid = hid % 1e6 + 1);

/** 설계 좌표(120×90 · 1칸 4px · 바닥 88 · 가운데 x 60) — 방 열여섯, 머리가 드나드는 방(LAIR)은 아랫줄 가운데 다섯 */
export const HIVE = {
  K: 4, W: 120, H: 90, BASE: 88, R: 11,
  CELLS: [[41, 16], [60, 16], [79, 16], [31.5, 33], [50.5, 33], [69.5, 33], [88.5, 33],
    [22, 50], [41, 50], [60, 50], [79, 50], [98, 50], [31.5, 67], [50.5, 67], [69.5, 67], [88.5, 67]],
  LAIR: [8, 9, 10, 13, 14]
};
export const BROOD = HIVE.CELLS.map((_, i) => i).filter(i => !HIVE.LAIR.includes(i));
/** 벌집 기준점(가운데 · 바닥) */
export function hiveAt(e: Bag, dx: number, dy: number): [number, number] {
  return [e.hvAx + (dx - 60) * HIVE.K, e.hvAy - (HIVE.BASE - dy) * HIVE.K];
}
export const cellAt = (e: Bag, i: number) => hiveAt(e, HIVE.CELLS[i][0], HIVE.CELLS[i][1]);
/** 머리 이동의 단계 — [숨는 0~1, 숨어 있음, 나오는 0~1] */
export function moveStage(h: Bag): [number, boolean, number] {
  if (h.t < h.hide) return [h.t / h.hide, false, 0];
  if (h.t < h.hide + h.gap) return [1, true, 0];
  return [1, false, Math.min(1, (h.t - h.hide - h.gap) / h.rise)];
}

/** 담즙 줄기의 흐르는 몫 0~1 · 웅덩이 반지름(px) */
export function bileState(h: Bag): [number, number] {
  if (h.t < h.tele) return [0, 0];
  const t = h.t - h.tele, flow = t < h.flow ? 1 : Math.max(0, 1 - (t - h.flow) / 0.6);
  const fade = Math.min(1, (h.life - h.t) / 0.8);
  return [flow, h.r * Math.min(1, t / 1.2) * fade];
}

export const BossHive: Bag & ThisType<Enemy> = {
  /** 몸놀림 — 처음 한 번 벌집 자리를 잡고, 그다음은 머리를 이 방 저 방으로 옮긴다 */
  hvAI(dt: number, world: World, p: Player) {
    this.vx = this.vy = 0;
    if (!this.anchored) {
      this.anchored = 1; this.hvOpen = this.hvOpen || 0; this.hvAx = this.cx; this.hvAy = this.cy + 200;
      const tx = Math.floor(this.cx / TS);
      for (let ty = Math.floor(this.cy / TS); ty < Math.floor(this.cy / TS) + 40; ty++)
        if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) { this.hvAy = ty * TS; break; }
      this.hvCell = 9; this.hvPlace(9); this.hvT = 2.5;
    }
    if (this.hvMoveH && this.hvMoveH.t < this.hvMoveH.life) return;
    this.hvT = (this.hvT ?? 3) - dt;
    if (this.hvT > 0) return;
    /* 가까운 쪽 방을 조금 더 자주 — 플레이어가 쫓아갈 거리가 들쭉날쭉하게 */
    const opts = HIVE.LAIR.filter(i => i !== this.hvCell);
    const near = opts.slice().sort((a, b) => Math.abs(cellAt(this, a)[0] - p.cx) - Math.abs(cellAt(this, b)[0] - p.cx));
    const to = Math.random() < 0.45 ? near[0] : opts[Math.floor(Math.random() * opts.length)];
    this.hvMove(to);
    this.hvT = 3.8 - this.pf * 1.4 + Math.random() * 1.2;
  },
  /** 판정 상자를 그 방 앞으로 */
  hvPlace(i: number) { const [x, y] = cellAt(this, i); this.x = x - this.w / 2; this.y = y - this.h / 2; },
  /** 머리를 옮긴다 — 숨고(hide) · 안에서 기어가고(gap · 갈 방이 부푼다) · 다른 방에서 내민다(rise) */
  hvMove(to: number) {
    const hide = 0.4, gap = 0.55 - this.pf * 0.15, rise = 0.45;
    this.hvMoveH = this.hz({ k: 'hvmove', id: nid(), ref: this, nid: this.nid, from: this.hvCell, to, hide, gap, rise, life: hide + gap + rise, c: '#c8e050' });
    G.sfxAt && G.sfxAt('hive_crawl', this.cx / TS, this.cy / TS);
  },
  /** 머리가 방 안에 있나 — 그동안은 거의 안 들어간다 */
  hvHidden() { const h = this.hvMoveH; if (!h || h.t >= h.life) return false; const [, hid2, out] = moveStage(h); return hid2 || h.t < h.hide || out < 0.5; },
  hvHurt(a: number) {
    if (!this.hvHidden()) return a * 1.25;
    if (Math.random() < 0.4) G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 20, this.y - 10, tr('막혔다'), '#9fb4c8', 0));
    return a * 0.12;
  },

  /** 고유 기술 — boss-signature 의 sigStart 가 넘긴다 */
  hvSig(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this;
    switch (d.sig) {
      case 'brood': {                                       // 방이 열린다 — 닫힌 애벌레 방 몇이 부풀다 깨지고 애벌레가 기어 나온다
        const shut = BROOD.filter(i => !((this.hvOpen || 0) & (1 << i))), pool = shut.length ? shut : BROOD.slice();
        const cells: number[] = [];
        while (cells.length < Math.min(d.cnt || 2, pool.length)) { const i = pool[Math.floor(Math.random() * pool.length)]; if (!cells.includes(i)) cells.push(i); }
        this.hz({ k: 'hvbrood', id: nid(), ref: this, nid: this.nid, cells, tele: 0.9, life: 0.9 + 1.0, c: K.c });
        G.sfxAt && G.sfxAt('hive_bulge', this.cx / TS, this.cy / TS);
        return { busy: 1.6 };
      }
      case 'bilefall': {                                    // 담즙이 흐른다 — 방 밑으로 담즙 줄기가 벽을 타고 내려와 바닥에 고인다
        const n = d.cnt || 2, all = HIVE.CELLS.map((_, i) => i).filter(i => HIVE.CELLS[i][1] <= (d.low ? 67 : 50));
        const picks: number[] = [];
        const near = all.slice().sort((a, b) => Math.abs(cellAt(this, a)[0] - p.cx) - Math.abs(cellAt(this, b)[0] - p.cx));
        picks.push(near[0]);
        while (picks.length < n) { const i = all[Math.floor(Math.random() * all.length)]; if (!picks.includes(i)) picks.push(i); }
        picks.forEach((i, k) => G.after(k * 0.25, () => {
          if (E.dead) return;
          const [x, y] = cellAt(E, i);
          E.hz({ k: 'hvbile', id: nid(), ref: E, nid: E.nid, cell: i, x, top: y + HIVE.R * HIVE.K * 0.6, fy: E.hvAy, tele: 0.8, flow: 2.2, life: 0.8 + (d.life || 5.5),
            w: 24, r: d.r || 76, dmg: E.dmg * m * 0.45, c: K.c, sd: Math.random() * 99 });
        }));
        G.sfxAt && G.sfxAt('hive_ooze', this.cx / TS, this.cy / TS);
        return { busy: 1.3 };
      }
      case 'spit': {                                        // 담즙 침 — 머리가 턱을 벌렸다가 플레이어 쪽으로 덩이를 뱉는다
        const n = d.cnt || 3;
        this.hz({ k: 'hvspit', id: nid(), ref: this, nid: this.nid, tele: 0.55, life: 0.55 + 0.5, n, dmg: this.dmg * m * 0.7, c: K.c });
        G.sfxAt && G.sfxAt('hive_hiss', this.cx / TS, this.cy / TS);
        return { busy: 1.1 };
      }
      case 'bloom': {                                       // 둥지 개화 — 모든 방이 한꺼번에 열린다: 애벌레 · 담즙 · 머리의 울음
        this.hz({ k: 'hvbloom', id: nid(), ref: this, nid: this.nid, tele: 1.1, life: 4.2, dmg: this.dmg * m * 0.6, c: K.c });
        [0, 4, 6, 11].forEach((i, k) => G.after(1.1 + k * 0.3, () => {
          if (E.dead) return;
          const [x, y] = cellAt(E, i);
          E.hz({ k: 'hvbile', id: nid(), ref: E, nid: E.nid, cell: i, x, top: y + HIVE.R * HIVE.K * 0.6, fy: E.hvAy, tele: 0.5, flow: 2.6, life: 0.5 + 5, w: 24, r: 70, dmg: E.dmg * m * 0.4, c: K.c, sd: Math.random() * 99 });
        }));
        for (let r = 0; r < 2; r++) G.after(1.2 + r * 1.1, () => {
          if (E.dead) return;
          const n = 22, g0 = Math.floor(Math.random() * n);
          for (let i = 0; i < n; i++) {
            if (((i - g0 + n) % n) < 3) continue;
            const a = i / n * TAU + r * 0.14, sp = 230;
            const pr = new Proj(E.cx, E.cy, Math.cos(a) * sp, Math.sin(a) * sp, E.dmg * m * 0.6, 'enemy', 'poison');
            pr.life = 3; G.projs.push(pr);
          }
        });
        G.sfxAt && G.sfxAt('hive_roar', this.cx / TS, this.cy / TS);
        return { busy: 4.4 };
      }
    }
    return { busy: 0.3 };
  },
  /** 애벌레를 방에서 내보낸다(호스트) — 둥지에 여섯까지만 */
  hvLarva(i: number) {
    if (G.ents.filter((q: any) => !q.dead && q.type === 'sacling').length >= 6) return;
    const [x, y] = cellAt(this, i);
    const e = new Enemy('sacling', x - 10, y, G.scale()); e.vy = 60; G.ents.push(e);
  },
};

mixin(Enemy.prototype, BossHive, true);
