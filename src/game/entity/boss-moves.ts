/* ===== entity/boss-moves.js — 보스 고유 기술 — 예고 → 실행. 무엇을 쓰는지는 data/bossmoves.ts 의 그 보스 칸 ===== */
import { app as G } from '../ctx.js';
import { TAU, angleTo, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { SURGE_FLY } from '../data/skills.js';
import { BOSS_MOVES } from '../data/bossmoves.js';
import { TS } from '../world.js';
import { Enemy, Part, Proj } from '../entity.js';
/* 기술을 쓰는 동안은 몸놀림(boss-ai)이 쉰다 — 한꺼번에 둘이 겹치면 피할 자리가 사라진다.
   ★ 기술은 반드시 예고(tele)를 먼저 보인다: 보스 둘레에 진이 돌고 이름을 외친 뒤에야 움직인다. */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; t?: number; [k: string]: any };

export const BossMoves: Bag & ThisType<Enemy> = {

  /** 매 프레임(호스트) — 기술 중이면 true(몸놀림을 건너뛴다) */
  tickMoves(dt: number, world: World, p: Player, dd: number) {
    const K = BOSS_MOVES[this.type]; if (!K) return false;
    this.mvHist(dt);
    const fly = !!SURGE_FLY[this.def.ai!];
    const mv = this.mv;
    if (mv) {
      mv.t += dt;
      if (!mv.run) {                                          // 예고 — 멈춰 서서 기운을 모은다
        this.vx *= 0.82; if (fly) this.vy *= 0.82;
        this.move(dt, world, { gravMul: fly ? 0 : 1 });
        mv.cv = (mv.cv || 0) - dt;
        if (mv.cv <= 0) { mv.cv = 0.12; G.vfx.converge(this.cx, this.cy, Math.max(this.w, this.h) * 0.9, 5, K.c, 0.3); }
        if (mv.t >= mv.d.tele) mv.run = this.mvStart(mv.d, p, world, K) || { busy: 0 };
        return true;
      }
      const r: Run = mv.run; r.t = (r.t || 0) + dt;
      if (r.tick) r.tick(dt, r);
      else { this.vx *= 0.88; if (fly) this.vy *= 0.88; this.move(dt, world, { gravMul: fly ? 0 : 1 }); }
      if (r.t >= r.busy) {
        this.mv = null; this.burrowT = 0;
        this.mvCd = K.every * (1 - this.pf * 0.3) * (0.85 + Math.random() * 0.3);
      }
      return true;
    }
    if (this.mvCd === undefined) this.mvCd = K.every * 0.5;
    this.mvCd -= dt;
    if (this.mvCd > 0 || dd > 900 || p.dead || p.hp <= 0) return false;
    /* 고르기 — 마지막 마디에 들면 곧바로 필살기, 그 뒤로는 세 번에 한 번. 같은 기술을 잇달아 쓰지 않는다 */
    let d: Bag;
    this.mvN = (this.mvN || 0) + 1;
    if (K.ult && this.lastPh() && (!this.ultUsed || this.mvN % 3 === 0)) { d = K.ult; this.ultUsed = 1; }
    else {
      const pool = K.moves.filter((m: Bag) => m !== this.mvLast);
      d = pool[Math.floor(Math.random() * pool.length)] || K.moves[0];
    }
    this.mvLast = d;
    this.mv = { d, t: 0, run: null };
    G.bossHazard({ k: 'call', txt: d.n, c: K.c, life: Math.max(1.6, d.tele + 0.8), ref: this, nid: this.nid, x: this.cx, y: this.y });
    G.bossHazard({ k: 'aura', c: K.c, life: d.tele, tele: d.tele, ref: this, nid: this.nid });
    G.sfxAt && G.sfxAt(d === K.ult ? 'chapter' : 'sk_mark', this.cx / TS, this.cy / TS);
    return true;
  },
  /** 지난 자리(되감기용) — 0.2초마다 하나, 4초 치 */
  mvHist(dt: number) {
    this.histT = (this.histT || 0) - dt;
    if (this.histT > 0) return;
    this.histT = 0.2;
    (this.hist || (this.hist = [])).push([this.x, this.y]);
    if (this.hist.length > 20) this.hist.shift();
  },
  /** 그 자리 아래 바닥(px) — 없으면 조금 아래 */
  floorY(x: number, y: number) {
    const w = G.world, tx = Math.floor(x / TS);
    for (let ty = Math.floor(y / TS); ty < Math.floor(y / TS) + 40; ty++) if (w.solid(tx, ty) && !w.solid(tx, ty - 1)) return ty * TS;
    return y + 40;
  },
  hz(h: Bag) { return G.bossHazard(h); },
  strike(x: number, y: number, o: Bag, K: Bag, dm: number) {
    const fy = this.floorY(x, y - TS * 3);
    const zoneDmg = o.zone ? this.dmg * (o.zone.dps || 0) : 0;
    return this.hz({ k: 'strike', x, y: fy, r: o.r || 44, shape: o.shape || 'circle', w: o.w || 40, hh: o.h || 420, delay: o.delay || 0.8,
      life: (o.delay || 0.8) + 0.4, dmg: this.dmg * dm, c: K.c, fx: o.fx, zone: o.zone, zoneDmg, burstRing: o.burstRing });
  },

  /** 기술 실행 — 돌려준 busy 동안 보스가 묶인다(tick 이 있으면 그 동안 움직임을 그것이 맡는다) */
  mvStart(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, fly = !!SURGE_FLY[this.def.ai!], E = this;
    const extra = () => {                                         // 필살기 덧붙임 — 한 기술에 다른 결을 하나 더
      if (d.march) this.mvStart({ k: 'march', cnt: 8, gap: 60, every: 0.12, h: 130, both: 1, fx: d.fx, m: 0.8 }, p, world, K);
      if (d.wall) this.mvStart({ k: 'wall', times: 2, spd: 280, gap: 110, every: 1.4, fx: d.fx, m: 0.7 }, p, world, K);
      if (d.zones) this.mvStart({ k: 'zone', at: 'player', n2: 3, r: 60, life: 5, dps: 0.1, fx: 'flesh' }, p, world, K);
      if (d.homing) this.mvStart({ k: 'homing', cnt: d.homing, spd: 200, turn: 2, proj: 'poison', m: 0.6 }, p, world, K);
      if (d.rain) this.mvStart({ k: 'rain', form: 'trail', cnt: 6, every: 0.4, delay: 0.8, r: 50, fx: 'meteor', m: 0.8 }, p, world, K);
      if (d.summon) this.mvStart({ k: 'summon', mob: d.summon, cnt: 2 }, p, world, K);
    };
    switch (d.k) {
      case 'leap': {                                              // 높이 뛰어 겨눈 자리로 — 내려앉으면 양옆으로 충격파
        const times = d.times || 1;
        const r: Run = { busy: 99, n: 0, air: 0, wait: 0.05 };
        r.tick = (dt, r) => {
          if (r.wait > 0) { r.wait -= dt; this.vx *= 0.8; this.move(dt, world); return; }
          if (!r.air) {
            r.air = 1; r.at = 0;
            const tx = p.cx + p.vx * 0.4;
            this.vy = -860; this.vx = clamp((tx - this.cx) / 1.05, -720, 720);
            this.strike(tx, p.y + p.h, { r: 90, delay: 1.05, fx: 'rock' }, K, m * 0.9);
          }
          r.at += dt;
          this.move(dt, world);
          if (r.at > 0.3 && this.onGround) {
            r.air = 0; r.n++; r.wait = 0.35;
            G.shake = Math.max(G.shake, 12);
            const fy = this.y + this.h;
            for (let k = 0; k < (d.waves ? d.waves : 0); k++) for (const s of [-1, 1])
              this.hz({ k: 'wave', x: this.cx + s * (this.w / 2 + k * 40), y: fy, vx: s * (d.wspd || 340) * (1 - k * 0.15), w: 26, hh: 30, life: 2.6, dmg: this.dmg * m * 0.7, c: K.c });
            G.vfx.shock(this.cx, fy - 4, 140, K.c, 0.4, 10, 0.3); G.vfx.crack(this.cx, fy, -1, 120, K.c, 0.8); G.vfx.crack(this.cx, fy, 1, 120, K.c, 0.8);
            if (r.n >= times) r.busy = r.t! + 0.35;
          }
        };
        return r;
      }
      case 'rain': {
        let last = 0;
        if (d.form === 'cage') {                                  // 둘레를 기둥으로 막고 한 칸만 비운다
          const n = d.cnt || 7, gapI = Math.floor(Math.random() * n), gx = d.gapX || 46;
          for (let i = 0; i < n; i++) if (i !== gapI) this.strike(p.cx + (i - (n - 1) / 2) * gx, p.y + p.h, { shape: 'col', w: gx - 6, h: 160, delay: d.delay, fx: d.fx }, K, m);
          last = d.delay;
        } else if (d.form === 'trail') {                          // 걸음마다 쫓아온다 — 멈추면 맞는다
          for (let i = 0; i < d.cnt; i++) G.after(i * d.every, () => { if (!E.dead) E.strike(p.cx + p.vx * 0.3, p.y + p.h, d, K, m); });
          last = d.cnt * d.every;
        } else {
          for (let i = 0; i < d.cnt; i++) {
            const x = p.cx + (Math.random() - 0.5) * (d.spread || 360);
            G.after(i * 0.08, () => { if (!E.dead) E.strike(x, p.y + p.h, d, K, m); });
          }
          last = d.cnt * 0.08;
        }
        extra();
        return { busy: Math.min(1.4, last + 0.5) };
      }
      case 'quake': {                                             // 천장이 무너진다 — 흔들림 뒤 떨어지는 바위
        G.shake = Math.max(G.shake, 12);
        for (let i = 0; i < d.cnt; i++) {
          const x = p.cx + (Math.random() - 0.5) * (d.spread || 400);
          G.after(i * 0.07, () => { if (!E.dead) E.strike(x, p.y + p.h, { r: 40, delay: d.delay, fx: 'rock' }, K, m); });
        }
        extra();
        return { busy: 0.9 };
      }
      case 'march': {                                             // 보스에게서(또는 발밑에서) 다가오는 기둥 줄
        const dirs = d.both ? [-1, 1] : [Math.sign(p.cx - this.cx) || 1];
        const fromSky = d.from === 'sky';
        for (const s of dirs) for (let i = 0; i < d.cnt; i++) {
          G.after(i * d.every, () => {
            if (E.dead) return;
            const x = d.from === 'under' ? p.cx : E.cx + s * (d.gap || 56) * (i + 1);
            E.strike(x, d.from === 'under' ? p.y + p.h : E.y + E.h, { shape: 'col', w: 38, h: d.h || 120, delay: 0.45, fx: d.fx }, K, m);
          });
        }
        if (fromSky) G.shake = Math.max(G.shake, 4);
        extra();
        return { busy: Math.min(1.6, d.cnt * d.every + 0.4) };
      }
      case 'beam': {                                              // 광선 — 먼저 가는 선으로 겨누고 굵어진 뒤 쓸어 간다
        const base = angleTo(this.cx, this.cy, p.cx, p.cy), sgn = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < (d.cnt || 1); i++) {
          let x = this.cx, y = this.cy, a = base + (i - ((d.cnt || 1) - 1) / 2) * (d.spread || 0), follow = 1;
          if (d.from === 'grid') { x = p.cx + (i - 1) * 130; y = p.cy - 420; a = Math.PI / 2; follow = 0; }
          if (d.from === 'cross') { follow = 0; if (i === 0) { x = p.cx - 450; y = p.cy; a = 0; } else { x = p.cx; y = p.cy - 450; a = Math.PI / 2; } }
          this.hz({ k: 'beam', x, y, a, va: (d.sweep || 0) / (d.dur || 2) * sgn, len: d.len || 800, w: d.w || 24, tele: 0.55,
            life: 0.55 + (d.dur || 2), dmg: this.dmg * m, c: K.c, ref: follow ? this : undefined, nid: follow ? this.nid : undefined });
        }
        return { busy: 0.55 + (d.dur || 2) };
      }
      case 'ring': {                                              // 틈 있는 탄 고리 — 틈은 매번 다른 곳
        let off = Math.random() * TAU;
        for (let b = 0; b < (d.times || 1); b++) G.after(b * (d.every || 0.5), () => {
          if (E.dead) return;
          const n = d.cnt || 20, g0 = Math.floor(Math.random() * n);
          off += d.rot || 0;
          for (let i = 0; i < n; i++) {
            if (((i - g0 + n) % n) < (d.gap || 3)) continue;
            const a = off + i / n * TAU;
            G.projs.push(new Proj(E.cx, E.cy, Math.cos(a) * (d.spd || 240), Math.sin(a) * (d.spd || 240), E.dmg * m, 'enemy', d.proj || 'dark'));
          }
          G.vfx.shock(E.cx, E.cy, Math.max(E.w, E.h), K.c, 0.3, 6);
        });
        extra();
        return { busy: (d.times || 1) * (d.every || 0.5) + 0.3 };
      }
      case 'spiral': {
        const r: Run = { busy: d.dur || 4, acc: 0, spin: Math.random() * TAU };
        r.tick = (dt, r) => {
          this.vx = lerp(this.vx, Math.sign(p.cx - this.cx) * this.spd! * 0.25, dt * 2);
          if (fly) this.vy = lerp(this.vy, Math.sign(p.cy - 80 - this.cy) * this.spd! * 0.2, dt * 2);
          this.move(dt, world, { gravMul: fly ? 0 : 1 });
          r.acc -= dt; r.spin += (d.turn || 2) * dt;
          if (r.acc <= 0) {
            r.acc = d.every || 0.1;
            for (let k = 0; k < (d.arms || 4); k++) {
              const a = r.spin + k * TAU / (d.arms || 4);
              G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * (d.spd || 280), Math.sin(a) * (d.spd || 280), this.dmg * m, 'enemy', d.proj || 'void'));
            }
          }
        };
        extra();
        if (d.blink) G.after(d.dur * 0.5, () => { if (!E.dead) E.mvStart({ k: 'blink', times: 2, r: 90, m: 1 }, p, world, K); });
        return r;
      }
      case 'dash': {                                              // 겨눔 선 → 돌진, 몇 번 되풀이
        const r: Run = { busy: 99, n: 0, ph: 0, pt: 0 };
        r.tick = (dt, r) => {
          r.pt += dt;
          if (r.ph === 0) {                                        // 겨눈다
            if (!r.aimed) {
              r.aimed = 1; r.a = angleTo(this.cx, this.cy, p.cx, p.cy);
              this.hz({ k: 'line', x0: this.cx, y0: this.cy, x1: this.cx + Math.cos(r.a) * 700, y1: this.cy + Math.sin(r.a) * 700, life: 0.4, c: K.c, w: 3 });
            }
            this.vx *= 0.8; if (fly) this.vy *= 0.8;
            if (r.pt >= 0.4) { r.ph = 1; r.pt = 0; }
          } else if (r.ph === 1) {                                 // 돌진
            const sp = this.spd! * (d.spd || 3.4);
            this.vx = Math.cos(r.a) * sp; if (fly) this.vy = Math.sin(r.a) * sp;
            if (Math.random() < 0.6) G.parts.push(new Part(this.cx, this.cy, K.c, 0, .35));
            if (r.pt >= 0.38) { r.ph = 2; r.pt = 0; }
          } else {
            this.vx *= 0.8; if (fly) this.vy *= 0.8;
            if (r.pt >= 0.18) { r.n++; r.ph = 0; r.pt = 0; r.aimed = 0; if (r.n >= (d.times || 3)) r.busy = r.t! + 0.1; }
          }
          this.move(dt, world, { gravMul: fly ? 0 : 1 });
        };
        return r;
      }
      case 'blink': {                                             // 등 뒤로 건너와 벤다
        for (let i = 0; i < (d.times || 3); i++) G.after(i * 0.62, () => {
          if (E.dead) return;
          const side = p.facing > 0 ? -1 : 1;
          for (let q = 0; q < 14; q++) G.parts.push(new Part(E.cx, E.cy, K.c, -30, .6));
          E.x = clamp(p.cx + side * 80 - E.w / 2, TS * 2, G.world.dims.WW * TS - TS * 3);
          E.y = fly ? p.cy - E.h / 2 - 10 : p.y + p.h - E.h;
          E.vx = E.vy = 0;
          G.vfx.sigil(E.cx, E.cy, 50, K.c, 0.5, 6, 2, 1, 'sigil_void');
          E.hz({ k: 'strike', x: E.cx, y: E.cy + (d.r || 90) * 0.4, r: d.r || 90, shape: 'circle', delay: 0.35, life: 0.75, dmg: E.dmg * m, c: K.c });
        });
        return { busy: (d.times || 3) * 0.62 + 0.3 };
      }
      case 'vortex': {
        const at = d.floor ? { x: p.cx, y: this.floorY(p.cx, p.cy) } : null;
        this.hz({ k: 'vortex', x: at ? at.x : this.cx, y: at ? at.y : this.cy, r: d.r || 300, pull: d.pull || 280, life: d.life || 2.6,
          burst: d.burst || 0, dmg: this.dmg * m, c: K.c, floor: d.floor, fixed: !!at, follow: !at, ref: at ? undefined : this, nid: at ? undefined : this.nid });
        G.after((d.life || 2.6) + 0.05, () => {
          if (E.dead) return;
          if (d.then === 'dash') E.mv = { d: { k: 'dash', n: '', tele: 0, times: 1, spd: 4.2, m }, t: 0, run: E.mvStart({ k: 'dash', times: 1, spd: 4.2, m }, p, world, K) };
          if (d.waves) for (const s of [-1, 1]) E.hz({ k: 'wave', x: E.cx, y: E.floorY(E.cx, E.cy), vx: s * 360, w: 28, hh: 32, life: 2.4, dmg: E.dmg * 0.7, c: K.c });
          if (d.rewind) E.mvStart({ k: 'rewind', heal: 0.02 }, p, world, K);
        });
        return { busy: (d.life || 2.6) + 0.2 };
      }
      case 'zone': {
        for (let i = 0; i < (d.n2 || 3); i++) {
          const spread = d.at === 'player' ? 140 : 440, x = p.cx + (Math.random() - 0.5) * spread;
          this.hz({ k: 'zone', x, y: this.floorY(x, p.y), r: d.r || 60, life: d.life || 6, dmg: this.dmg * (d.dps || 0.1), slow: d.slow, poison: d.poison, burn: d.burn, c: K.c, fx: d.fx });
        }
        extra();
        return { busy: 0.6 };
      }
      case 'wall': {                                              // 낮은 벽(뛰어넘는다) · 높은 벽(밑에 선 채 지나보낸다)이 번갈아
        for (let i = 0; i < (d.times || 1); i++) G.after(i * (d.every || 1.4), () => {
          if (E.dead) return;
          const s = Math.sign(p.cx - E.cx) || 1, fy = E.floorY(p.cx, p.y), low = i % 2 === 0;
          E.hz({ k: 'wall', x: E.cx, vx: s * (d.spd || 280), top: low ? fy - 52 : fy - 340, bot: low ? fy : fy - 50, w: 34,
            life: 4.5, dmg: E.dmg * m, c: K.c, fx: d.fx });
        });
        extra();
        return { busy: Math.min(1.6, (d.times || 1) * (d.every || 1.4)) };
      }
      case 'summon': {
        for (let i = 0; i < (d.cnt || 2); i++) {
          const e = new Enemy(d.mob, this.cx + (Math.random() - 0.5) * 220, this.cy - 20, G.scale());
          e.vy = -260; G.ents.push(e);
          for (let q = 0; q < 10; q++) G.parts.push(new Part(e.cx, e.cy, K.c, -40, .7));
        }
        if (d.ring) for (let i = 0; i < d.ring; i++) {
          const a = i / d.ring * TAU;
          G.projs.push(new Proj(this.cx, this.cy, Math.cos(a) * 260, Math.sin(a) * 260, this.dmg * 0.5, 'enemy', 'bolt'));
        }
        G.vfx.sigil(this.cx, this.y + this.h, 80, K.c, 0.8, 6, 1, 0.3, 'sigil_beast');
        return { busy: 0.7 };
      }
      case 'push': {
        this.hz({ k: 'push', x: this.cx, force: d.force || 500, life: d.life || 3, c: K.c });
        return { busy: d.life || 3 };
      }
      case 'burrow': {                                            // 땅속으로 — 발밑을 따라오다 솟는다
        const r: Run = { busy: 99, ph: 0, pt: 0 };
        r.tick = (dt, r) => {
          r.pt += dt;
          if (r.ph === 0) {                                        // 파고든다
            this.burrowT = 1; this.guard = 1;
            for (let q = 0; q < 2; q++) G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.y + this.h, '#8a7a5a', -120, .6));
            if (r.pt > 0.35) { r.ph = 1; r.pt = 0; }
          } else if (r.ph === 1) {                                 // 쫓는다 — 땅 위로 흙먼지만 보인다
            this.x = lerp(this.x, p.cx - this.w / 2, dt * 2.2);
            this.y = this.floorY(this.cx, p.y) - this.h;
            if (Math.random() < 0.5) G.parts.push(new Part(this.cx + (Math.random() - .5) * 30, this.y + this.h, '#8a7a5a', -160, .5));
            if (r.pt > (d.under || 1.4)) {
              r.ph = 2; r.pt = 0;
              this.strike(this.cx, this.y + this.h, { r: d.r || 80, delay: 0.55, fx: 'rock' }, K, m);
            }
          } else if (r.ph === 2) {
            if (r.pt > 0.55) {                                     // 솟는다
              this.burrowT = 0; this.guard = 0; this.vy = -720;
              G.shake = Math.max(G.shake, 12);
              r.ph = 3; r.pt = 0;
            }
          } else if (r.pt > 0.5) r.busy = r.t!;
          this.move(dt, world, { gravMul: r.ph >= 3 ? 1 : 0 });
        };
        return r;
      }
      case 'rewind': {                                            // 몇 초 전 자리로 — 그 사이 입은 상처 일부를 되돌린다
        const h = this.hist && this.hist[0];
        if (h) {
          this.hz({ k: 'line', x0: this.cx, y0: this.cy, x1: h[0] + this.w / 2, y1: h[1] + this.h / 2, life: 0.6, c: K.c, w: 4 });
          for (let q = 0; q < 20; q++) G.parts.push(new Part(this.cx, this.cy, K.c, -20, .8));
          this.x = h[0]; this.y = h[1]; this.vx = this.vy = 0;
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * (d.heal || 0.025));
          G.vfx.sigil(this.cx, this.cy, Math.max(this.w, this.h) * 0.7, K.c, 0.7, 6, -2, 1, 'swirl');
        }
        return { busy: 0.6 };
      }
      case 'clones': {                                            // 분신 — 진짜는 그중 하나, 모두 쏜다
        const n = (d.cnt || 2) + 1, a0 = Math.random() * TAU, pts: number[][] = [];
        for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n; pts.push([p.cx + Math.cos(a) * 230, p.cy - 40 + Math.sin(a) * 120]); }
        const real = Math.floor(Math.random() * n);
        pts.forEach((q, i) => {
          if (i === real) { this.x = q[0] - this.w / 2; this.y = q[1] - this.h / 2; this.vx = this.vy = 0; }
          else this.hz({ k: 'decoy', x: q[0], y: q[1], r: this.h, life: 1.6, c: K.c });
          G.after(0.8, () => {
            if (E.dead) return;
            const nn = d.ring || 10;
            for (let k = 0; k < nn; k++) { const a = k / nn * TAU; G.projs.push(new Proj(q[0], q[1], Math.cos(a) * 220, Math.sin(a) * 220, E.dmg * m, 'enemy', d.proj || 'frost')); }
          });
        });
        for (let q = 0; q < 24; q++) G.parts.push(new Part(this.cx, this.cy, K.c, -20, .7));
        return { busy: 1.2 };
      }
      case 'homing': {
        for (let i = 0; i < (d.cnt || 4); i++) {
          const a = -Math.PI / 2 + (i - ((d.cnt || 4) - 1) / 2) * 0.5;
          const pr = new Proj(this.cx, this.cy, Math.cos(a) * (d.spd || 200), Math.sin(a) * (d.spd || 200), this.dmg * m, 'enemy', d.proj || 'dark');
          pr.home = d.turn || 2; pr.life = 5;
          G.projs.push(pr);
        }
        return { busy: 0.6 };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossMoves, true);
