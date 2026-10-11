/* ===== engine/rhythm/duel.ts — 박자 겨루기: osu! standard 짜임(히트 서클 · 슬라이더 · 스피너 · HP 게이지) ===== */
/* 놀이판은 osu! 좌표(512×384)를 그대로 쓴다 — AR · CS · OD · HP 공식을 옮겨 오면 "osu! 처럼" 느껴지는 감이 같이 온다.
   곡이 끝나야 이기는 것이 아니라 게이지가 기준이다(가득 = 이김 · 바닥 = 짐). 무엇을 걸고 겨루는지 · 소리 · 글은 게임이 정한다. */
import { RNG } from '../core/rng.js';

export const FIELD_W = 512, FIELD_H = 384;

/** 난이도 — osu! 의 네 값 + 박자 · 물체 짜임 */
export interface DuelDiff {
  ar: number; cs: number; od: number; hp: number;
  bpm: number;
  /** 물체 사이 박 수(작을수록 촘촘) */
  gap: number;
  /** 슬라이더 · 스피너 몫(0~1) · 되돌아오기 · 연타(1/2 박) 확률 */
  slider: number; spinner: number; repeat: number; stream: number;
  /** 물체 사이 거리 배율 · 슬라이더 빠르기(박마다 osu px /100) · 스피너 초당 바퀴 */
  jump: number; sv: number; spinRps: number;
}
/** 변주 — 판 돌기(rad/s) · 숨김 · 꿈틀(px) · 끌림(0~1, 커서가 아래로 당겨진다) */
export interface DuelMods { roll?: number; hidden?: boolean; wiggle?: number; pull?: number }
export interface DuelTheme { bg: string; edge: string; ink: string; font: string; body: string; colors: string[]; gauge: string; gaugeLow: string }
export interface DuelOpts {
  diff: DuelDiff; mods?: DuelMods; seed: string | number;
  /** 게이지 시작값 · 실수 없이 치면 몇 초에 차는가 · 첫 물체까지 · 판정 창 넓힘(초) · 게이지 새는 빠르기 배율 */
  start?: number; target?: number; lead?: number; ease?: number; drainMul?: number;
  theme?: Partial<DuelTheme>;
  onBeat?: (i: number) => void;
  onJudge?: (res: number, kind: 'c' | 's' | 'p' | 'tick' | 'break' | 'spin') => void;
}
export type DuelState = 'play' | 'win' | 'lose';

interface Obj {
  k: 'c' | 's' | 'p'; i: number; t: number; x: number; y: number; n: number; col: number;
  /** 슬라이더 — 경로(평평한 x,y) · 누적 길이 · 한 번 지나는 시간 · 되돌아오기 · 끝 시각 · 틱 시각들 */
  pts: number[]; acc: number[]; span: number; rep: number; end: number; ticks: number[]; ti: number;
  /** 스피너 — 채울 바퀴 · 돈 각도 · 마지막 각 */
  need: number; spun: number; ang: number | null; spins: number;
  done: boolean; res: number; head: boolean; headT: number; track: boolean; got: number; all: number;
}
interface Pop { x: number; y: number; t: number; s: string; c: string }

const DEF_THEME: DuelTheme = { bg: 'rgba(6,14,22,.9)', edge: 'rgba(160,210,240,.35)', ink: '#ffffff',
  font: 'sans-serif', body: '#0e1c28', colors: ['#5ec8ff', '#ffd27a', '#8fe08f', '#ff8fb8'], gauge: '#7fe0ff', gaugeLow: '#ff6a5a' };
const JUDGE_COL: Record<number, string> = { 300: '#7fd8ff', 100: '#9ef08a', 50: '#ffd06a', 0: '#ff5a4a' };

export class RhythmDuel {
  declare o: DuelOpts; declare d: DuelDiff; declare m: DuelMods; declare th: DuelTheme; declare rng: RNG;
  declare t: number; declare objs: Obj[]; declare head: number; declare mapEnd: number;
  declare r: number; declare pre: number; declare fade: number; declare w300: number; declare w100: number; declare w50: number;
  declare gauge: number; declare unit: number; declare drain: number; declare state: DuelState;
  declare combo: number; declare best: number; declare counts: Record<number, number>;
  declare cx: number; declare cy: number; declare held: Set<string>; declare beatI: number; declare beat: number;
  declare pops: Pop[]; declare trail: number[]; declare shake: number;
  /* 생성 이어 쓰기 — 다음 물체 자리 · 방향 · 콤보 */
  declare gx: number; declare gy: number; declare gh: number; declare gt: number; declare gn: number; declare gc: number; declare gLeft: number;

  constructor(o: DuelOpts) {
    this.o = o; this.d = o.diff; this.m = o.mods || {}; this.th = { ...DEF_THEME, ...(o.theme || {}) };
    this.rng = new RNG(o.seed);
    const { ar, cs, od, hp } = this.d, ease = o.ease || 0;
    this.r = 54.4 - 4.48 * cs;
    this.pre = ar < 5 ? 1.2 + 0.6 * (5 - ar) / 5 : 1.2 - 0.75 * (ar - 5) / 5;
    this.fade = Math.min(0.4, this.pre * 2 / 3);
    this.w300 = (80 - 6 * od) / 1000 + ease * 0.5; this.w100 = (140 - 8 * od) / 1000 + ease * 0.75; this.w50 = (200 - 10 * od) / 1000 + ease;
    this.beat = 60 / this.d.bpm;
    this.t = 0; this.objs = []; this.head = 0; this.state = 'play';
    this.combo = 0; this.best = 0; this.counts = { 300: 0, 100: 0, 50: 0, 0: 0 };
    this.cx = FIELD_W / 2; this.cy = FIELD_H / 2; this.held = new Set(); this.beatI = -1;
    this.pops = []; this.trail = []; this.shake = 0;
    this.gx = FIELD_W / 2; this.gy = FIELD_H / 2; this.gh = this.rng.range(0, Math.PI * 2);
    this.gt = Math.ceil((o.lead === undefined ? 1.6 : o.lead) / this.beat) * this.beat; this.gn = 0; this.gc = 0; this.gLeft = 0;
    this.mapEnd = 0; const t0 = this.gt; this.gen(t0 + 40);
    /* 게이지 한 칸 — 실수 없이 치면 target 초에 가득 차게(새는 양까지 메운다) */
    const T = o.target || 14, start = o.start === undefined ? 0.45 : o.start;
    this.drain = (0.006 + 0.004 * hp) * (o.drainMul === undefined ? 1 : o.drainMul);
    const n = this.objs.filter(q => q.t < t0 + T).length;
    this.unit = (1 - start + this.drain * T) / Math.max(4, n);
    this.gauge = start;
  }

  /* ---------------- 판 만들기 ---------------- */
  private gen(until: number): void {
    const R = this.rng, d = this.d, r = this.r, B = this.beat;
    const pad = r + 6, inX = (x: number) => x > pad && x < FIELD_W - pad, inY = (y: number) => y > pad && y < FIELD_H - pad;
    const step = (dist: number) => {
      for (let k = 0; k < 12; k++) {
        const x = this.gx + Math.cos(this.gh) * dist, y = this.gy + Math.sin(this.gh) * dist;
        if (inX(x) && inY(y)) { this.gx = x; this.gy = y; return; }
        this.gh += R.range(1.2, 2.6);                       // 벽에 닿으면 꺾는다
      }
      this.gx = FIELD_W / 2 + R.range(-60, 60); this.gy = FIELD_H / 2 + R.range(-40, 40);
    };
    const newObj = (k: 'c' | 's' | 'p', t: number, x: number, y: number): Obj => {
      if (this.gLeft <= 0 || k === 'p') { this.gn = 0; this.gc = (this.gc + 1) % this.th.colors.length; this.gLeft = R.int(3, 6); }
      this.gLeft--; this.gn++;
      const o: Obj = { k, i: this.objs.length, t, x, y, n: this.gn, col: this.gc, pts: [], acc: [], span: 0, rep: 0, end: t, ticks: [], ti: 0,
        need: 0, spun: 0, ang: null, spins: 0, done: false, res: -1, head: false, headT: 0, track: false, got: 0, all: 0 };
      this.objs.push(o); return o;
    };
    let t = this.gt, prevSpin = true;
    while (t < until) {
      const roll = R.next();
      if (!prevSpin && this.objs.length > 3 && roll < d.spinner) {
        const beats = R.int(3, 5), o = newObj('p', t, FIELD_W / 2, FIELD_H / 2);
        o.end = t + beats * B; o.need = Math.max(1, Math.round((o.end - t) * d.spinRps * 2) / 2);
        this.gLeft = 0; prevSpin = true; t = o.end + 2 * B; continue;
      }
      prevSpin = false;
      if (roll < d.spinner + d.slider) {
        const sb = R.chance(0.6) ? 1 : 2, rep = R.chance(d.repeat) ? 1 : 0;
        const L = Math.min(260, d.sv * 100 * sb), o = newObj('s', t, this.gx, this.gy);
        let x = this.gx, y = this.gy, h = this.gh + R.range(-0.8, 0.8);
        const curve = R.chance(0.6) ? R.range(0.004, 0.012) * (R.chance(0.5) ? 1 : -1) : 0;
        o.pts.push(x, y); o.acc.push(0);
        for (let s = 4; s <= L; s += 4) {
          h += curve * 4;
          let nx = x + Math.cos(h) * 4, ny = y + Math.sin(h) * 4;
          if (!inX(nx)) { h = Math.PI - h; nx = x + Math.cos(h) * 4; }
          if (!inY(ny)) { h = -h; ny = y + Math.sin(h) * 4; }
          x = nx; y = ny; o.pts.push(x, y); o.acc.push(s);
        }
        o.span = sb * B; o.rep = rep; o.end = t + o.span * (rep + 1);
        for (let k = 1; k <= sb * (rep + 1); k++) o.ticks.push(t + k * B);   // 박마다 · 되돌아오는 점 · 끝
        o.all = o.ticks.length;
        const ex = rep ? o.pts[0] : o.pts[o.pts.length - 2], ey = rep ? o.pts[1] : o.pts[o.pts.length - 1];
        this.gx = ex; this.gy = ey; this.gh = h + (rep ? Math.PI : 0);
        const g = this.gapBeats(); t = o.end + g * B; this.gh += R.range(-2, 2); step(Math.max(r * 1.6, d.jump * g * 90)); continue;
      }
      if (R.chance(d.stream)) {                                // 연타 — 반 박 간격으로 짧게 늘어선 셋~다섯
        const n = R.int(3, 5), turn = R.range(-0.25, 0.25);
        for (let k = 0; k < n; k++) { newObj('c', t, this.gx, this.gy); t += B / 2; this.gh += turn; step(r * 1.15); }
        t += B / 2; this.gh += R.range(-2, 2); step(Math.max(r * 1.6, d.jump * 90)); continue;
      }
      newObj('c', t, this.gx, this.gy);
      const g = this.gapBeats(); t += g * B; this.gh += R.range(-2.1, 2.1); step(Math.max(r * 1.4, d.jump * g * 90));
    }
    this.gt = t; this.mapEnd = until;
  }
  /** 다음 물체까지 박 수 — gap 을 반 박 단위로 흔든다 */
  private gapBeats(): number {
    const g = this.d.gap, lo = Math.max(0.5, Math.floor(g * 2) / 2);
    return this.rng.chance((g - lo) * 2) ? lo + 0.5 : lo;
  }

  /* ---------------- 자리 ---------------- */
  /** 꿈틀 변주 — 그림과 판정이 같은 자리를 본다 */
  private wig(o: Obj): [number, number] {
    const w = this.m.wiggle || 0;
    return w ? [Math.sin(this.t * 6 + o.i * 1.7) * w, Math.cos(this.t * 5 + o.i * 2.3) * w] : [0, 0];
  }
  /** 슬라이더 공 자리(진행 0~1, 되돌아오기 포함) */
  private ballAt(o: Obj, t: number): [number, number] {
    const n = o.acc.length, L = o.acc[n - 1] || 1;
    let p = Math.max(0, t - o.t) / o.span; const lap = Math.floor(p); p -= lap;
    if (lap >= o.rep + 1) p = 1; else if (lap % 2 === 1) p = 1 - p;
    if (lap >= o.rep + 1 && o.rep % 2 === 1) p = 0;
    const s = p * L;
    let lo = 0, hi = n - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (o.acc[mid] < s) lo = mid + 1; else hi = mid; }
    const [wx, wy] = this.wig(o);
    return [o.pts[lo * 2] + wx, o.pts[lo * 2 + 1] + wy];
  }
  /** 끌림 변주 — 손이 가리킨 자리가 아래(물)로 끌려 내려간 자리 */
  cursor(): [number, number] {
    // 절반까지만 — 더 세면 놀이판 위쪽 물체를 치려고 손이 화면 밖까지 가야 했다
    const k = (this.m.pull || 0) * 0.5 * (0.55 + 0.45 * Math.sin(this.t * 1.3));
    return [this.cx + (FIELD_W / 2 - this.cx) * k * 0.4, this.cy + (FIELD_H + 90 - this.cy) * k];
  }
  /** 화면 좌표 → 놀이판 좌표(판 돌기 되돌림) — rect 는 draw 에 준 것과 같아야 한다 */
  toField(sx: number, sy: number, rect: { x: number; y: number; w: number; h: number }): [number, number] {
    const k = rect.w / FIELD_W, mx = rect.x + rect.w / 2, my = rect.y + rect.h / 2;
    let dx = (sx - mx) / k, dy = (sy - my) / k;
    const a = -(this.m.roll || 0) * this.t;
    if (a) { const c = Math.cos(a), s = Math.sin(a); [dx, dy] = [dx * c - dy * s, dx * s + dy * c]; }
    return [dx + FIELD_W / 2, dy + FIELD_H / 2];
  }

  /* ---------------- 입력 ---------------- */
  move(x: number, y: number): void { this.cx = x; this.cy = y; }
  /** 누름 — id 는 손가락 · 단추 · 키마다 다르게(둘을 번갈아 눌러 연타) · at 은 그 순간의 겨루기 시각 */
  press(id: string, at = this.t): void {
    if (this.state !== 'play') return;
    this.held.add(id);
    for (let i = this.head; i < this.objs.length; i++) {
      const o = this.objs[i];
      if (o.t - at > this.pre) break;
      if (o.done || o.k === 'p' || o.head) continue;
      const dt = at - o.t;
      if (dt < -this.w50) { if (dt > -this.w50 - 0.25 && this.near(o, this.r)) this.shake = 0.25; return; }   // 너무 일찍 — 흔들기만
      if (dt > this.w50) continue;
      if (!this.near(o, this.r)) return;
      const a = Math.abs(dt), res = a <= this.w300 ? 300 : a <= this.w100 ? 100 : 50;
      if (o.k === 'c') { o.done = true; o.res = res; this.judge(res, o.x, o.y, 'c'); }
      else { o.head = true; o.headT = at; o.track = true; this.score(res === 300 ? 0.5 : 0.25, 'tick'); this.combo++; this.best = Math.max(this.best, this.combo); }
      return;
    }
  }
  release(id: string): void { this.held.delete(id); }
  private near(o: Obj, r: number): boolean {
    const [wx, wy] = this.wig(o), [x, y] = this.cursor();
    return (x - o.x - wx) ** 2 + (y - o.y - wy) ** 2 <= r * r;
  }

  /* ---------------- 판정 · 게이지 ---------------- */
  private score(mul: number, kind: 'tick' | 'spin'): void { this.gauge = Math.min(1, this.gauge + this.unit * mul); this.o.onJudge && this.o.onJudge(300, kind); }
  /** pen — 실패 몫 배율(슬라이더는 끊김에서 이미 깎였으므로 덜 깎는다) */
  private judge(res: number, x: number, y: number, kind: 'c' | 's' | 'p', pen = 1): void {
    this.counts[res]++;
    if (res) { this.combo++; this.best = Math.max(this.best, this.combo); }
    else { this.combo = 0; this.shake = 0.3; }
    const g = res === 300 ? 1 : res === 100 ? 0.45 : res === 50 ? 0.12 : -(0.8 + 0.15 * this.d.hp) * pen;
    this.gauge = Math.max(0, Math.min(1, this.gauge + this.unit * g));
    this.pops.push({ x, y, t: 0, s: res ? String(res) : '✕', c: JUDGE_COL[res] });
    this.o.onJudge && this.o.onJudge(res, kind);
  }
  private brk(x: number, y: number): void {
    if (this.combo > 0) this.shake = 0.2;
    this.combo = 0; this.gauge = Math.max(0, this.gauge - this.unit * 0.25);
    this.pops.push({ x, y, t: 0, s: '✕', c: JUDGE_COL[0] });
    this.o.onJudge && this.o.onJudge(0, 'break');
  }

  /* ---------------- 흐름 ---------------- */
  update(dt: number): void {
    if (this.state !== 'play') return;
    this.t += dt;
    const t = this.t, B = this.beat;
    const bi = Math.floor(t / B);
    if (bi !== this.beatI) { this.beatI = bi; this.o.onBeat && this.o.onBeat(bi); }
    if (t > this.mapEnd - 8) this.gen(this.mapEnd + 30);
    if (this.objs.length && t > this.objs[0].t - 0.2) this.gauge -= this.drain * dt;   // 첫 물체 전에는 안 샌다
    const [cx, cy] = this.cursor();
    this.trail.push(cx, cy); if (this.trail.length > 16) this.trail.splice(0, 2);
    for (let i = this.head; i < this.objs.length; i++) {
      const o = this.objs[i];
      if (o.t - t > this.pre) break;
      if (o.done) { if (i === this.head) this.head++; continue; }
      if (o.k === 'c') { if (t > o.t + this.w50) { o.done = true; o.res = 0; this.judge(0, o.x, o.y, 'c'); } continue; }
      if (o.k === 's') {
        if (t < o.t) continue;
        if (!o.head && t > o.t + this.w50) { o.head = true; o.headT = -1; this.brk(o.x, o.y); }
        const [bx, by] = this.ballAt(o, t), held = this.held.size > 0;
        const rr = o.track ? this.r * 2.4 : this.r;
        o.track = held && (cx - bx) ** 2 + (cy - by) ** 2 <= rr * rr;
        while (o.ti < o.ticks.length && t >= o.ticks[o.ti] - (o.ti === o.ticks.length - 1 ? 0.036 : 0)) {
          o.ti++;
          if (o.track) { o.got++; this.combo++; this.best = Math.max(this.best, this.combo); this.score(0.12, 'tick'); }
          else this.brk(bx, by);
        }
        if (o.ti >= o.ticks.length) {
          o.done = true;
          const k = ((o.headT > 0 ? 1 : 0) + o.got) / (1 + o.all);
          const [ex, ey] = this.ballAt(o, o.end);
          o.res = k >= 1 ? 300 : k >= 0.5 ? 100 : k > 0 ? 50 : 0;
          this.judge(o.res, ex, ey, 's', 0.5);
        }
        continue;
      }
      // 스피너 — 누른 채 놀이판 가운데를 돈다
      if (t < o.t) continue;
      if (this.held.size) {
        const a = Math.atan2(cy - FIELD_H / 2, cx - FIELD_W / 2);
        if (o.ang !== null) {
          let da = a - o.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          o.spun += Math.min(Math.abs(da), Math.PI * 2 * 8 * dt);   // 한 프레임에 너무 많이 못 돈다(초당 8바퀴)
        }
        o.ang = a;
      } else o.ang = null;
      const full = Math.floor(o.spun / (Math.PI * 2));
      while (o.spins < full) { o.spins++; this.score(0.15, 'spin'); }
      if (t >= o.end) {
        o.done = true;
        const k = o.spun / (Math.PI * 2) / o.need;
        o.res = k >= 1 ? 300 : k >= 0.75 ? 100 : k >= 0.5 ? 50 : 0;
        this.judge(o.res, FIELD_W / 2, FIELD_H / 2, 'p');
      }
    }
    for (let i = this.pops.length - 1; i >= 0; i--) { this.pops[i].t += dt; if (this.pops[i].t > 0.6) this.pops.splice(i, 1); }
    this.shake = Math.max(0, this.shake - dt);
    if (this.gauge >= 1) this.state = 'win';
    else if (this.gauge <= 0) this.state = 'lose';
  }
  /** 맞힌 몫(osu! 정확도) */
  accuracy(): number {
    const c = this.counts, n = c[300] + c[100] + c[50] + c[0];
    return n ? (c[300] * 300 + c[100] * 100 + c[50] * 50) / (n * 300) : 1;
  }

  /* ---------------- 그리기 ---------------- */
  /** rect — 화면 위 놀이판 자리(가로세로 비 4:3 을 권한다) */
  draw(c: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }): void {
    const th = this.th, k = rect.w / FIELD_W, t = this.t, r = this.r;
    const sh = this.shake > 0 ? Math.sin(this.shake * 80) * this.shake * 14 : 0;
    c.save();
    c.translate(rect.x + rect.w / 2 + sh, rect.y + rect.h / 2);
    c.fillStyle = th.bg; c.strokeStyle = th.edge; c.lineWidth = 1.5;
    c.beginPath(); c.roundRect(-rect.w / 2 - 14, -rect.h / 2 - 28, rect.w + 28, rect.h + 42, 10); c.fill(); c.stroke();
    this.drawGauge(c, rect.w, rect.h);
    c.scale(k, k);
    const roll = (this.m.roll || 0) * t;
    if (roll) c.rotate(roll);
    c.translate(-FIELD_W / 2, -FIELD_H / 2);
    // 뒤에 올 것부터 — 먼저 칠 것이 위에 그려지게
    let last = this.head;
    while (last < this.objs.length && this.objs[last].t - t <= this.pre) last++;
    for (let i = last - 1; i >= this.head; i--) {
      const o = this.objs[i];
      if (o.done) continue;
      const col = th.colors[o.col];
      const appear = Math.min(1, (t - (o.t - this.pre)) / this.fade);
      let alpha = Math.max(0, appear);
      if (this.m.hidden && o.k === 'c') alpha *= Math.max(0, Math.min(1, (o.t - this.pre * 0.3 - t) / (this.pre * 0.3)));
      if (o.k === 'p') { this.drawSpinner(c, o, alpha); continue; }
      const [wx, wy] = this.wig(o);
      c.save(); c.globalAlpha = alpha; c.translate(wx, wy);
      if (o.k === 's') this.drawSlider(c, o, col);
      if (!(o.k === 's' && o.head)) this.drawCircle(c, o.x, o.y, col, String(o.n), r);
      c.restore();
      if (!this.m.hidden && t < o.t && !(o.k === 's' && o.head)) {          // 다가오는 고리
        const s = 1 + 3 * Math.max(0, (o.t - t) / this.pre);
        c.save(); c.globalAlpha = alpha * 0.9; c.strokeStyle = col; c.lineWidth = 3;
        c.beginPath(); c.arc(o.x + wx, o.y + wy, r * s, 0, Math.PI * 2); c.stroke(); c.restore();
      }
    }
    for (const p of this.pops) {
      c.save(); c.globalAlpha = 1 - p.t / 0.6; c.fillStyle = p.c; c.font = `700 ${p.s === '✕' ? 30 : 24}px ${th.font}`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.s, p.x, p.y - p.t * 30); c.restore();
    }
    // 커서 — 끌림이면 손이 가리킨 자리에서 끌린 자리까지 줄을 긋는다(낚싯줄)
    const [ex, ey] = this.cursor();
    if (this.m.pull) {
      c.strokeStyle = 'rgba(230,245,255,.35)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(this.cx, this.cy); c.lineTo(ex, ey); c.stroke();
    }
    for (let i = 0; i < this.trail.length; i += 2) {
      c.globalAlpha = (i / this.trail.length) * 0.4; c.fillStyle = th.ink;
      c.beginPath(); c.arc(this.trail[i], this.trail[i + 1], 3 + i * 0.25, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    const g = c.createRadialGradient(ex, ey, 1, ex, ey, 14);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, 'rgba(255,230,160,.9)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = g; c.beginPath(); c.arc(ex, ey, 14, 0, Math.PI * 2); c.fill();
    c.restore();
    // 콤보 — 놀이판 왼쪽 아래(돌지 않는다)
    if (this.combo > 1) {
      c.save(); c.fillStyle = th.ink; c.globalAlpha = 0.9; c.font = `700 20px ${th.font}`; c.textBaseline = 'bottom';
      c.fillText(this.combo + 'x', rect.x + 4, rect.y + rect.h + 8); c.restore();
    }
  }
  private drawGauge(c: CanvasRenderingContext2D, w: number, h: number): void {
    const th = this.th, y = -h / 2 - 20, g = Math.max(0, Math.min(1, this.gauge));
    c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.roundRect(-w / 2, y, w, 9, 4); c.fill();
    const low = g < 0.25 && Math.sin(this.t * 14) > 0;
    const grad = c.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, low ? th.gaugeLow : th.gauge); grad.addColorStop(1, '#ffffff');
    c.fillStyle = grad; c.beginPath(); c.roundRect(-w / 2 + 1, y + 1, Math.max(0, (w - 2) * g), 7, 3.5); c.fill();
  }
  private drawCircle(c: CanvasRenderingContext2D, x: number, y: number, col: string, num: string, r: number): void {
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, col); g.addColorStop(1, this.th.body);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 0.9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.12; c.beginPath(); c.arc(x, y, r * 0.92, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#ffffff'; c.font = `700 ${Math.round(r * 0.75)}px ${this.th.font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(num, x, y + 1);
  }
  private drawSlider(c: CanvasRenderingContext2D, o: Obj, col: string): void {
    const r = this.r, p = o.pts, t = this.t;
    const path = () => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    path(); c.strokeStyle = '#ffffff'; c.lineWidth = r * 2; c.stroke();
    path(); c.strokeStyle = this.th.body; c.lineWidth = r * 1.76; c.stroke();
    path(); c.strokeStyle = col; c.globalAlpha *= 0.35; c.lineWidth = r * 1.2; c.stroke(); c.globalAlpha /= 0.35;
    // 박 점 — 아직 안 지난 것만
    c.fillStyle = '#ffffff';
    for (let i = o.ti; i < o.ticks.length - 1; i++) {
      const [x, y] = this.ballAt(o, o.ticks[i]); const [wx, wy] = this.wig(o);
      c.beginPath(); c.arc(x - wx, y - wy, r * 0.13, 0, Math.PI * 2); c.fill();
    }
    // 끝 원 · 되돌아오기 화살
    const n = p.length;
    this.drawEnd(c, p[n - 2], p[n - 1], col, o.rep > 0 && t < o.t + o.span);
    if (t >= o.t) {                                           // 굴러가는 공 · 따라잡기 원
      const [bx, by] = this.ballAt(o, Math.min(t, o.end)); const [wx, wy] = this.wig(o);
      c.fillStyle = col; c.beginPath(); c.arc(bx - wx, by - wy, r * 0.82, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.stroke();
      if (o.track) { c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.beginPath(); c.arc(bx - wx, by - wy, r * 2.4, 0, Math.PI * 2); c.stroke(); }
    }
  }
  private drawEnd(c: CanvasRenderingContext2D, x: number, y: number, col: string, arrow: boolean): void {
    const r = this.r;
    c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.1; c.beginPath(); c.arc(x, y, r * 0.88, 0, Math.PI * 2); c.stroke();
    if (arrow) { c.fillStyle = '#ffffff'; c.font = `700 ${Math.round(r * 0.8)}px ${this.th.font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('↺', x, y + 1); }
    else { c.fillStyle = col; c.globalAlpha *= 0.5; c.beginPath(); c.arc(x, y, r * 0.5, 0, Math.PI * 2); c.fill(); c.globalAlpha /= 0.5; }
  }
  private drawSpinner(c: CanvasRenderingContext2D, o: Obj, alpha: number): void {
    const t = this.t, cx = FIELD_W / 2, cy = FIELD_H / 2, R = 170;
    const k = Math.min(1, o.spun / (Math.PI * 2) / o.need);
    c.save(); c.globalAlpha = alpha;
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = k >= 1 ? '#9ef08a' : this.th.colors[o.col]; c.lineWidth = 10;
    c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); c.stroke();
    if (t >= o.t) {                                           // 남은 시간 — 줄어드는 안쪽 고리
      const left = Math.max(0, (o.end - t) / (o.end - o.t));
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R * 0.95 * left + 8, 0, Math.PI * 2); c.stroke();
    }
    c.translate(cx, cy); c.rotate(o.spun);
    c.strokeStyle = '#ffffff'; c.lineWidth = 4;
    for (let i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); c.beginPath(); c.moveTo(18, 0); c.lineTo(R * 0.6, 0); c.stroke(); }
    c.rotate(-o.spun);
    c.fillStyle = '#ffffff'; c.font = `700 30px ${this.th.font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(Math.max(0, Math.ceil(o.need - o.spun / (Math.PI * 2)))), 0, 0);
    c.restore();
  }
}
