/* ===== game/citadel.js — 부유 성채의 해금 — 궤도 닻 셋(지킴이 · 충전 · 눈금) → 빛다리 → 봉인문, 주인을 쓰러뜨리면 발사대 보관고 ===== */
import { TAU, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { T } from '../data.js';
import { TS } from '../world.js';
import { Enemy, Part } from '../entity.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

/* 닻마다 하는 일이 다르다 — 같은 조작을 셋 되풀이하지 말 것. 사연: docs/code-history.md#h179 */
const CHARGE_T = 10;          // 충전 닻 — 둘레 3.5칸 안에 머무를 시간(초)
const DIAL_P = 4.2;           // 눈금 닻 — 바늘이 한 바퀴 도는 시간(초)
const DIAL_WIN = 0.32;        // 바늘이 위(12시)에서 이만큼(라디안) 안이면 맞춘 것

export const CitadelPart: Bag = {

  /** 닻을 건드렸다 — 참가자는 호스트에게 맡긴다(세계를 바꾸는 일이라) */
  useAnchor(o: Bag) {
    const c = this.world.citadel; if (!c) return;
    if (c.anc && c.anc[o.i]) { this.toast(tr('이미 궤도에 맞춰진 닻이다'), 'good'); return; }
    if (this.net && this.net.role === 'guest') { this.netBroadcast({ k: 'anc', i: o.i, t: this.time }); return; }
    this.anchorUse(o, this.player);
  },
  /** 호스트 · 혼자 — 닻 하나를 깨운다 */
  anchorUse(o: Bag, who: any) {
    const run = this.ancRun || (this.ancRun = {});
    const r = run[o.i];
    if (o.kind === 'dial') {
      if (r && r.cd > 0) return;
      const a = ((this.time / DIAL_P) * TAU) % TAU, off = Math.min(a, TAU - a);
      if (off <= DIAL_WIN) { this.anchorDone(o); return; }
      run[o.i] = { cd: 1 };
      who.hurt(who.d.maxHp * 0.08, o.x + o.w / 2);       // 어긋나면 닻이 튕겨 낸다
      this.toast(tr('바늘이 어긋났다 — 꼭대기에 닿을 때 맞춰야 한다'), 'bad');
      for (let k = 0; k < 14; k++) this.parts.push(new Part(o.x + o.w / 2, o.y + 10, '#9fd8ff', -30, .6));
      return;
    }
    if (r) return;                                        // 이미 돌고 있다
    const cx = o.x + o.w / 2, cy = o.y + o.h;
    const mobs = (o.kind === 'guard' ? ['orbit_sentry', 'orbit_sentry', 'ballast_form'] : ['meridian_eye', 'meridian_eye'])
      .map((t, k) => { const e = new Enemy(t, cx + (k - 1) * 70, cy - 120, this.scale()); this.ents.push(e); return e; });
    run[o.i] = { kind: o.kind, mobs, t: 0 };
    this.toast(o.kind === 'guard' ? tr('닻이 깨어나며 지킴이를 불렀다 — 모두 쓰러뜨려라') : tr('닻이 빛을 모은다 — 곁에 머물러라'), 'bad');
    this.shake = Math.max(this.shake, 8);
  },
  /** 매 프레임(호스트 · 혼자) — 지킴이 · 충전 닻의 진행 */
  updateCitadel(dt: number) {
    const run = this.ancRun, w = this.world, c = w && w.citadel;
    if (!run || !c || (this.net && this.net.role === 'guest')) return;
    for (const i in run) {
      const r = run[i], o = w.objects.find((q: Bag) => q.type === 'anchor' && q.i === +i);
      if (!o) { delete run[i]; continue; }
      if (r.cd !== undefined) { r.cd -= dt; if (r.cd <= 0) delete run[i]; continue; }
      if (r.kind === 'guard') {
        if (r.mobs.every((e: any) => e.dead)) this.anchorDone(o);
      } else if (r.kind === 'charge') {
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const near = this.players.some((q: any) => !q.dead && dist(q.cx, q.cy, cx, cy) < TS * 3.5);
        r.t = Math.max(0, r.t + (near ? dt : -dt * 0.5));
        o.prog = r.t / CHARGE_T;
        if (r.t >= CHARGE_T) this.anchorDone(o);
      }
    }
  },
  /** 닻 하나가 맞춰졌다 — 다음 빛다리를 펴고, 셋 다면 봉인문을 연다 */
  anchorDone(o: Bag) {
    const w = this.world, c = w.citadel;
    c.anc = c.anc || [0, 0, 0];
    if (c.anc[o.i]) return;
    c.anc[o.i] = 1; o.done = 1; o.prog = 1;
    if (this.ancRun) delete this.ancRun[o.i];
    for (const [x, y] of (c.links && c.links[o.i]) || []) if (w.get(x, y) === T.AIR) w.set(x, y, T.LIGHTBRIDGE);
    for (let k = 0; k < 40; k++) this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#9fe8ff', -50, 1.1));
    this.sfx('chapter');
    const n = c.anc.filter(Boolean).length;
    if (n >= 3) {
      for (const [x, y] of c.gate || []) if (w.get(x, y) === T.ORBITSEAL) w.set(x, y, T.AIR);
      this.toast(tr('세 닻이 궤도에 맞춰졌다 — 성채의 봉인문이 열린다'), 'good');
      this.shake = Math.max(this.shake, 16);
    } else this.toast(tr('닻이 궤도에 맞춰졌다 ({n}/3) — 빛다리가 펴진다', { n }), 'good');
    if (this.net) this.netBroadcast({ k: 'anc', st: c.anc });
  },
  /** 성채 주인이 쓰러졌다 — 발사대 보관고가 열린다(제트팩 시제품) */
  citadelBossDown(id: string) {
    const w = this.world, c = w.citadel;
    if (id !== 'restorer' || !c || c.vaultOpen) return;
    c.vaultOpen = 1;
    for (const [x, y] of c.vault || []) if (w.get(x, y) === T.ORBITSEAL) w.set(x, y, T.AIR);
    this.toast(tr('기관이 멈추자 발사대 보관고의 봉인이 풀렸다'), 'good');
    if (this.net) this.netBroadcast({ k: 'anc', st: c.anc, v: 1 });
  },
  /** 참가자 — 호스트가 보낸 닻 상태를 받아 그림만 맞춘다(타일은 tiles 로 따로 온다) */
  netAnchor(m: Bag) {
    const c = this.world.citadel; if (!c) return;
    if (m.st) c.anc = m.st;
    if (m.v) c.vaultOpen = 1;
    for (const o of this.world.objects) if (o.type === 'anchor' && c.anc && c.anc[o.i]) { o.done = 1; o.prog = 1; }
  },

  /** 닻 그림 — 받침 · 떠 있는 고리 · 갈래마다 다른 표시(지킴이 = 칼날 셋 · 충전 = 차오르는 고리 · 눈금 = 도는 바늘) */
  drawAnchor(c: CanvasRenderingContext2D, o: Bag, sx: number, sy: number) {
    const t = this.time, cx = sx + o.w / 2, top = sy + 8, done = !!o.done;
    const col = done ? '#9fe8ff' : o.kind === 'guard' ? '#ff9a6a' : o.kind === 'charge' ? '#ffd27a' : '#c8a8ff';
    c.save();
    c.fillStyle = '#3a4250'; c.fillRect(sx + 4, sy + o.h - 8, o.w - 8, 8);         // 받침
    c.fillStyle = '#56606e'; c.fillRect(cx - 3, top + 14, 6, o.h - 30);               // 기둥
    c.globalCompositeOperation = 'lighter';
    const R = 13 + Math.sin(t * 2) * 1.2, oy = top + 8 + Math.sin(t * 1.6) * 2;
    c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = done ? .9 : .65;
    c.beginPath(); c.ellipse(cx, oy, R, R * .45, Math.sin(t * .7) * .3, 0, TAU); c.stroke();
    if (o.kind === 'charge' && !done && o.prog) {
      c.lineWidth = 3; c.globalAlpha = .95;
      c.beginPath(); c.arc(cx, oy, R + 5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, o.prog)); c.stroke();
    }
    if (o.kind === 'dial' && !done) {                     // 바늘 — 꼭대기가 맞출 때
      const a = ((t / DIAL_P) * TAU) % TAU;
      c.globalAlpha = .9; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(cx, oy); c.lineTo(cx + Math.sin(a) * (R + 6), oy - Math.cos(a) * (R + 6)); c.stroke();
      c.globalAlpha = .5; c.fillStyle = col; c.fillRect(cx - 2, oy - R - 10, 4, 4);
    }
    if (o.kind === 'guard' && !done) for (let k = 0; k < 3; k++) {
      const a = t * 1.4 + k * TAU / 3;
      c.globalAlpha = .8; c.fillStyle = col; c.fillRect(cx + Math.cos(a) * R - 1.5, oy + Math.sin(a) * R * .45 - 4, 3, 8);
    }
    c.globalAlpha = done ? .55 + Math.sin(t * 3) * .2 : .35;
    const g = c.createRadialGradient(cx, oy, 1, cx, oy, 9);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(cx - 9, oy - 9, 18, 18);
    if (done) { c.globalAlpha = .25 + Math.sin(t * 2.5) * .1; c.fillStyle = col; c.fillRect(cx - 1.5, oy - 200, 3, 190); }   // 하늘로 오르는 빛줄기
    c.restore();
  }
};

mixin(Game.prototype, CitadelPart, true);
