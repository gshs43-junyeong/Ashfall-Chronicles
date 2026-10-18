/* ===== game/fish-duel.js — 낚시 겨루기: 입질 순간 무엇이 물었는지 정하고, 그 등급으로 osu! 식 판(engine/rhythm)을 짠다 ===== */
/* 게이지가 차면 잡고 바닥나면 놓친다. 등급은 화면에 안 보이고 판의 결(빠르기 · 원 크기 · 판정 창 · 변주)로만 느껴진다.
   숙련 · 낚싯대 · 미끼는 무엇이 무는지에 더해 **판을 쉽게**(판정 창 · 게이지 시작 · 새는 빠르기) 한다. 여럿이어도 낚는 사람 화면에서만 돈다. */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RhythmDuel } from '../../engine/rhythm/duel.js';
import { FONT, tr } from '../lang.js';
import { T } from '../data.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { UI } from '../ui.js';
import { Sfx } from '../music.js';
import { DAY_CYCLE, Game } from '../game.js';
import { FISH_DUEL_ART } from './fish-duel-art.js';
import type { DuelDiff, DuelMods } from '../../engine/rhythm/duel.js';

/* 등급 0~4 — 잡것 · 흔한 물고기는 느린 큰 원 · 슬라이더 위주, 위로 갈수록 조금씩 빠르고 촘촘하다. target = 실수 없이 칠 때 몇 초에 잡히나.
   ★ 맨 위 등급도 osu! 로 치면 Normal~Hard(2~3★) 까지만 — 그 위(204bpm · 초당 5.7개 · AR9.6)는 처음 하는 사람이 거의 못 잡았다.
   흉내 낸 손(반응 시간 · 피츠 법칙 이동 · 박자 오차)으로 맞췄다: 처음 하는 사람이 등급 3 은 대개 · 4 는 셋에 하나쯤.
   사연: docs/code-history.md#h203 */
export const FISH_DUEL: (DuelDiff & { target: number })[] = [
  { ar: 3, cs: 2.0, od: 0, hp: 0, bpm: 110, gap: 1.0, slider: 0.35, spinner: 0, repeat: 0, stream: 0, jump: 0.6, sv: 1.0, spinRps: 0.6, target: 4.5 },
  { ar: 4, cs: 2.3, od: 0.5, hp: 0.5, bpm: 120, gap: 1.0, slider: 0.32, spinner: 0.03, repeat: 0.1, stream: 0, jump: 0.7, sv: 1.1, spinRps: 0.7, target: 5 },
  { ar: 5.5, cs: 2.8, od: 1.2, hp: 1, bpm: 136, gap: 0.85, slider: 0.3, spinner: 0.04, repeat: 0.15, stream: 0.04, jump: 0.9, sv: 1.2, spinRps: 0.8, target: 6 },
  { ar: 7, cs: 3.3, od: 2.2, hp: 2, bpm: 150, gap: 0.8, slider: 0.28, spinner: 0.05, repeat: 0.2, stream: 0.08, jump: 1.05, sv: 1.35, spinRps: 0.95, target: 7 },
  { ar: 7.5, cs: 3.6, od: 2.8, hp: 2.5, bpm: 160, gap: 0.75, slider: 0.25, spinner: 0.05, repeat: 0.25, stream: 0.12, jump: 1.2, sv: 1.5, spinRps: 1.1, target: 8 }
];

/* 겨루기 동안 카메라가 다가가는 배율 */
export const DUEL_ZOOM = 1.7;

export const FishDuelPart: Bag = {
  duel: null,
  duelZoom: 1,

  duelOn() { const s = this.settings || {}; return s.fishduel === undefined ? true : !!s.fishduel; },

  /** 입질 중에 챘다 — 무엇이 물었는지 정하고 판을 연다. tierOverride 는 시험용 */
  startDuel(tierOverride?: number) {
    const p = this.player, f = p.fish;
    if (!f || this.duel) return;
    const baited = p.removeItem('raw_meat', 1);
    const { rod, flv, fishBonus, itemChance } = this.fishOdds('reel', baited);
    const c = this.rollCatch(fishBonus, itemChance);
    this.sfx('splash'); this.fishSplash(f, 8);
    if (c.kind === 'none' && tierOverride === undefined) {        // 건드리기만 하고 간 입질 — 겨룰 것이 없다
      p.fish = null; p.addProf('fish', 1); this.giveCatch(c, baited); return;
    }
    const tier = tierOverride === undefined ? c.tier : clamp(tierOverride | 0, 0, 4);
    const base = FISH_DUEL[tier];
    /* 물 · 밤 · 날씨마다 빠르기가 조금씩 — 바다는 빠르고 밤은 느리다 */
    const sea = this.world.get(f.tx, f.ty) === T.SEAWATER;
    const bpm = Math.round(base.bpm + (sea ? 3 : 0) + (DAY_CYCLE.isNight(this.dayT) ? -6 : 0) + (this.rainT > 0.5 ? 4 : 0));
    /* 변주는 물고기 몸짓만 — 원이 꿈틀(몸부림) · 손이 물로 끌림(당김). 숨김 · 판 돌기는 osu! 고수용이라 뺐다 */
    const R = this.rng, mods: DuelMods = {};
    if (tier >= 3 && R.chance(0.25 + (tier - 3) * 0.15)) mods.wiggle = 3 + tier;
    if (tier >= 4 && R.chance(0.35)) mods.pull = 0.3;
    const d = new RhythmDuel({
      diff: { ...base, bpm }, mods, seed: (this.world.seed || 's') + ':' + this.time.toFixed(3) + ':' + c.id,
      target: base.target, lead: 2.0, hitPad: 1.15,
      tire: 2.0 + base.target * 1.8,                              // 반쯤 맞히며 늘어지면 점점 빨리 샌다 — 한 판이 15초 남짓에서 끝난다
      start: clamp(0.5 + (rod.fishBonus || 0) * 0.5 + (flv - 1) * 0.01, 0.35, 0.75),
      ease: 0.012 + (flv >= 3 ? 0.02 : 0),                        // 기본도 조금 너그럽게 · 3레벨 '가벼운 손목'은 더
      drainMul: baited ? 0.8 : 1,
      theme: { font: FONT || 'sans-serif', art: FISH_DUEL_ART, frame: false, colors: ['#d8a94b', '#c8743a', '#9aae5a', '#b88ab0'], gauge: '#d8a94b', gaugeLow: '#c8433c', ink: '#e8e3d4',
        judge: { 300: '#f0d48a', 100: '#c9c3b0', 50: '#c8743a', 0: '#c8433c' } },
      onBeat: (i: number) => this.duelBeat(i),
      onJudge: (res: number, kind: string) => this.duelHitSfx(res, kind)
    });
    this.duel = { d, c, baited, tier, wall: performance.now(), rect: { x: 0, y: 0, w: 0, h: 0 }, el: null, ctx: null, off: null, intro: 1.6, tut: !(this.settings && this.settings.fishTut) };
    this.duelMount();
    if (this.duel && this.duel.tut) this.duelTutorial();
  },

  /* ---------------- 화면 겹 · 입력 ---------------- */
  duelMount() {
    const D = this.duel;
    const el = document.createElement('canvas');
    el.id = 'fishduel';
    document.body.appendChild(el);
    document.body.classList.add('in-duel');                          // 판이 화면 전체 — 터치 단추 · 핫바 · 탭 줄은 숨긴다(style.css)
    D.el = el; D.ctx = el.getContext('2d');
    const at = () => D.d.t + Math.min(0.05, (performance.now() - D.wall) / 1000);   // 누른 순간의 겨루기 시각
    const move = (e: PointerEvent) => { const [x, y] = D.d.toField(e.clientX, e.clientY, D.rect); D.d.move(x, y); };
    const down = (e: PointerEvent) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) { } move(e); D.d.press('p' + e.pointerId + ':' + e.button, at()); };
    const up = (e: PointerEvent) => { for (const b of [0, 1, 2]) D.d.release('p' + e.pointerId + ':' + b); };
    const key = (e: KeyboardEvent) => {
      if (/^F\d+$/.test(e.key)) return;
      e.preventDefault(); e.stopImmediatePropagation();          // 겨루는 동안 Z·X(유틸리티) · 이동 · 단축 칸이 게임에 안 간다
      if (e.repeat) return;
      if (D.tut) { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyX') this.duelTutClose(); else if (e.code === 'Escape') this.endDuel('quit'); return; }
      if (e.code === 'Escape') { this.endDuel('quit'); return; }
      if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Space') D.d.press(e.code, at());
    };
    const keyUp = (e: KeyboardEvent) => { if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Space') D.d.release(e.code); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('keydown', key, true); addEventListener('keyup', keyUp, true);
    // 처음 커서 자리는 마우스가 있던 곳
    const I = this.input;
    this.duelLayout(); const [x0, y0] = D.d.toField(I.mx || innerWidth / 2, I.my || innerHeight / 2, D.rect); D.d.move(x0, y0);
    D.off = () => {
      removeEventListener('keydown', key, true); removeEventListener('keyup', keyUp, true);
      el.remove(); document.body.classList.remove('in-duel');
      if (D.tutEl) { D.tutEl.remove(); D.tutEl = null; }
    };
  },
  duelLayout() {
    const D = this.duel, el = D.el, dpr = Math.min(2, devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
    /* 판은 화면 전체 — 테두리 없이 위 게이지(40px) · 아래 안내 줄(34px)만 비우고 가장 큰 4:3 을 가운데에.
       낚시꾼 · 줄 · 찌는 어둠에 뚫린 자리(duelScrim)로 판 아래에서 보인다 */
    const h = Math.min(H - 84, (W - 24) * 0.75), w = h * 4 / 3;
    D.rect = { x: (W - w) / 2, y: 44 + (H - 84 - h) / 2, w, h };
    D.dpr = dpr;
  },

  /* ---------------- 흐름 ---------------- */
  tickDuel(dt: number) {
    const D = this.duel, p = this.player;
    const held = p.held();
    if (p.dead || !p.fish || !held || idef(held).type !== 'rod') { this.endDuel('quit'); return; }
    D.wall = performance.now();
    if (D.tut) { this.duelFrame(dt); this.duelDraw(); return; }   // 안내를 읽는 동안 판은 멈춘다
    D.intro = Math.max(0, D.intro - dt);
    this.duelFrame(dt);
    D.d.update(dt);
    this.duelDraw();
    if (D.d.state === 'win') this.endDuel('win');
    else if (D.d.state === 'lose') this.endDuel('lose');
  },
  /** 카메라 — 0.35초에 걸쳐 DUEL_ZOOM 배로 다가가고, 낚시꾼을 판 왼쪽 빈 자리 가운데에 둔다 */
  duelFrame(dt: number) {
    const D = this.duel, p = this.player;
    D.zt = Math.min(1, (D.zt || 0) + dt / 0.35);
    const k = 1 + (DUEL_ZOOM - 1) * (1 - Math.pow(1 - D.zt, 3));
    if (Math.abs(k - (this.duelZoom || 1)) > 0.002) { this.duelZoom = k; this.resize(); }
    const spot = 0.5;                                                 // 판이 화면 전체라 낚시꾼은 가운데
    this.cam.x = p.cx - this.W * spot; this.cam.y = p.cy - this.H * 0.55;
    D.spot = spot;
  },
  endDuel(how: string) {
    const D = this.duel, p = this.player; if (!D) return;
    D.off(); this.duel = null;
    this.duelZoom = 1; this.resize();
    const f = p.fish;
    if (f) { this.fishSplash(f, how === 'win' ? 16 : 8); this.sfx('splash'); }
    p.fish = null;
    p.addProf('fish', 1);
    if (how === 'win') {
      this.giveCatch(D.c, D.baited);
      const acc = Math.round(D.d.accuracy() * 1000) / 10;
      if (acc >= 95) this.toast(tr('깔끔한 손놀림 — 정확도 {acc}%', { acc }), 'good');
    } else if (how === 'lose') {
      this.toast(D.tier >= 3 ? tr('놓쳤다 — 힘이 센 놈이었다') : this.rng.chance(0.5) ? tr('줄이 끊겼다') : tr('챘지만 바늘이 빠졌다'), 'bad');
      UI.refreshBag();
    } else {
      this.toast(tr('낚싯줄을 놓았다'), 'bad');
      UI.refreshBag();
    }
  },

  /* ---------------- 소리 — 북(박) · 물방울(엇박) · 판정 ---------------- */
  duelTone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'sine') {
    const ac = this.ac; if (!ac) return;
    const v = (Sfx ? Sfx.vol : 0.5) * vol; if (v < 0.004) return;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  duelBeat(i: number) {
    if (i < 0) return;
    this.duelTone(i % 4 === 0 ? 120 : 95, 45, 0.16, i % 4 === 0 ? 0.32 : 0.2);           // 북
    if (i % 2 === 1) { const n = [784, 880, 988, 1175][(i >> 1) % 4]; this.duelTone(n * 1.5, n, 0.09, 0.07); }   // 물방울
  },
  duelHitSfx(res: number, kind: string) {
    if (kind === 'tick') this.duelTone(1600, 1400, 0.04, 0.06);
    else if (kind === 'spin') this.duelTone(520, 900, 0.08, 0.08, 'triangle');
    else if (!res || kind === 'break') this.duelTone(160, 60, 0.18, 0.25, 'triangle');
    else this.duelTone(res === 300 ? 1320 : res === 100 ? 990 : 700, res === 300 ? 1760 : 880, 0.07, 0.14, 'triangle');
  },

  /* ---------------- 처음 한 번 — 안내 ---------------- */
  /** 처음 겨루기 때만 판 위에 띄운다 — 네 가지(고리 · 슬라이더 · 스피너 · 게이지)를 움직이는 그림으로. 설정 fishTut 로 한 번만 */
  duelTutorial() {
    const D = this.duel, touch = document.body.classList.contains('touch');
    const el = document.createElement('div'); el.id = 'fishtut';
    const card = (k: string, h: string, t: string) => `<div class="ft-card"><canvas data-k="${k}" width="132" height="92"></canvas><b>${h}</b><p>${t}</p></div>`;
    el.innerHTML = `<div class="ft-box"><h2>${tr('낚시 겨루기')}</h2>
      <p class="ft-lead">${tr('물고기가 물었다! 박자에 맞춰 줄을 당겨 게이지를 끝까지 채우면 잡힌다.')}</p>
      <div class="ft-row">
        ${card('c', tr('고리'), touch ? tr('바깥 고리가 원에 닿는 순간 탭') : tr('바깥 고리가 원에 닿는 순간 클릭 · Z · X'))}
        ${card('s', tr('슬라이더'), tr('처음에 누르고, 떼지 말고 공을 따라간다'))}
        ${card('p', tr('스피너'), tr('누른 채 가운데를 빙빙 돌린다'))}
        ${card('g', tr('게이지'), tr('맞히면 물고기가 끌려오고, 놓치면 달아난다'))}
      </div>
      <button class="ft-go">${touch ? tr('시작') : tr('시작 (Space)')}</button></div>`;
    document.body.appendChild(el); D.tutEl = el;
    el.querySelector('.ft-go')!.addEventListener('click', () => this.duelTutClose());
    const cvs = [...el.querySelectorAll('canvas')] as HTMLCanvasElement[], t0 = performance.now();
    const loop = () => {
      if (!D.tutEl) return;
      const t = (performance.now() - t0) / 1000;
      for (const cv of cvs) this.duelTutArt(cv.getContext('2d')!, cv.dataset.k!, t);
      requestAnimationFrame(loop);
    };
    loop();
  },
  duelTutClose() {
    const D = this.duel; if (!D || !D.tut) return;
    D.tut = false; D.wall = performance.now();
    if (D.tutEl) { D.tutEl.remove(); D.tutEl = null; }
    this.settings.fishTut = 1; this.saveSettings();
  },
  /** 안내 그림 하나 — k: c 고리 · s 슬라이더 · p 스피너 · g 게이지. 1.6초 고리로 돈다 */
  duelTutArt(c: CanvasRenderingContext2D, k: string, t: number) {
    const W = 132, H = 92, u = (t % 1.6) / 1.6, col = '#d8a94b';
    c.clearRect(0, 0, W, H);
    const disc = (x: number, y: number, r: number) => {
      c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#e8e3d4'; c.lineWidth = 2.5; c.stroke();
    };
    const finger = (x: number, y: number, down: boolean) => {      // 누르는 손끝 — 누르면 작아지고 물결
      c.fillStyle = down ? '#ffe8a0' : 'rgba(255,232,160,.6)'; c.beginPath(); c.arc(x, y, down ? 5 : 6, 0, Math.PI * 2); c.fill();
      if (down) { c.strokeStyle = 'rgba(255,232,160,.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.stroke(); }
    };
    if (k === 'c') {
      const r = 16, ar = r + (1 - Math.min(1, u / 0.7)) * 26;
      if (u < 0.85) { disc(66, 46, r); c.strokeStyle = '#f0d48a'; c.lineWidth = 2; c.beginPath(); c.arc(66, 46, ar, 0, Math.PI * 2); c.stroke(); }
      const hit = u >= 0.68 && u < 0.85;
      if (u >= 0.7) { c.globalAlpha = 1 - (u - 0.7) / 0.3; c.fillStyle = '#ffe08a'; c.font = '700 15px sans-serif'; c.textAlign = 'center'; c.fillText('300', 66, 22 - (u - 0.7) * 30); c.globalAlpha = 1; }
      finger(84, 62, hit);
    } else if (k === 's') {
      const x0 = 24, x1 = 108, y = 46, v = Math.min(1, Math.max(0, (u - 0.15) / 0.65));
      c.strokeStyle = 'rgba(216,169,75,.28)'; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo(66, 14, x1, y); c.stroke();
      c.strokeStyle = '#e8e3d4'; c.lineWidth = 2; c.stroke();
      const q = (a: number, b: number, cc: number) => (1 - v) * (1 - v) * a + 2 * (1 - v) * v * b + v * v * cc;
      const bx = q(x0, 66, x1), by = q(y, 14, y);
      disc(bx, by, 11); finger(bx + 6, by + 8, u > 0.12 && u < 0.85);
    } else if (k === 'p') {
      c.strokeStyle = '#3b3527'; c.lineWidth = 4; c.beginPath(); c.arc(66, 46, 34, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#d8a94b'; c.lineWidth = 4; c.beginPath(); c.arc(66, 46, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); c.stroke();
      const a = t * 7; finger(66 + Math.cos(a) * 22, 46 + Math.sin(a) * 22, true);
      c.fillStyle = '#e8e3d4'; c.beginPath(); c.arc(66, 46, 4, 0, Math.PI * 2); c.fill();
    } else {
      const g = 0.25 + 0.6 * (u < 0.75 ? u / 0.75 : 1 - (u - 0.75) * 1.4), gx = 14, gw = 104, gy = 46;
      this.duelGauge(c, gx, gw, gy, g, false, 0.8);
      const fx = gx + gw * g; c.fillStyle = '#e8e3d4'; c.beginPath(); c.ellipse(fx, gy, 8, 4, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(fx - 6, gy); c.lineTo(fx - 12, gy - 5); c.lineTo(fx - 12, gy + 5); c.fill();
      c.fillStyle = u < 0.75 ? '#9aae5a' : '#c8433c'; c.font = '700 12px sans-serif'; c.textAlign = 'center';
      c.fillText(u < 0.75 ? '+' : '−', fx, gy - 12);
    }
  },

  /* ---------------- 그리기 ---------------- */
  /** 둘레를 어둡게 — 낚시꾼 · 낚싯대 · 줄은 **윤곽 그대로** 도려내고(둥근 구멍이 아니라 그림째), 찌가 앉은 물가는 둘레까지 넓게 밝힌다.
      ★ 둥근 구멍으로 두면 사람 둘레의 땅 · 하늘이 같이 떠서 무엇에 눈을 둘지 흐려졌다(사용자 지적) — 사람은 실루엣째, 물은 넓게 */
  duelScrim(c: CanvasRenderingContext2D) {
    const p = this.player, f = p.fish, z = this.viewZoom();
    const sx = (x: number) => (x - this.cam.x) * z, sy = (y: number) => (y - this.cam.y) * z;
    c.save();
    c.fillStyle = 'rgba(10,9,6,.8)'; c.fillRect(0, 0, innerWidth, innerHeight);
    c.globalCompositeOperation = 'destination-out';
    const pool = (x: number, y: number, rx: number, ry: number, a: number) => {
      c.save(); c.translate(x, y); c.scale(1, ry / rx);
      const g = c.createRadialGradient(0, 0, rx * 0.35, 0, 0, rx);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill(); c.restore();
    };
    let bx = 0, by = 0;
    if (f) {
      bx = sx((f.tx + 0.5) * TS); by = sy(f.ty * TS);
      pool(bx, by + 6 * z, 170 * z, 80 * z, 1);                 // 물가 — 수면을 따라 옆으로 넓게
    }
    /* 낚시꾼 · 낚싯대 · 줄 · 찌 — 게임이 그리는 그대로 한 번 더 그려 그 픽셀만 지운다(살짝 번진 테두리까지) */
    c.save(); c.scale(z, z);
    c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = 7 * z;
    try { this.drawRider(c, p, p.x - this.cam.x, p.y - this.cam.y); } catch (e) { pool(sx(p.cx), sy(p.cy), 40 * z, 60 * z, 1); }
    c.restore();
    c.globalCompositeOperation = 'lighter';                       // 낚시꾼에 한 겹 빛 — 새벽 · 밤 · 굴에서도 몸이 어둠에 안 묻힌다
    c.save(); c.scale(z, z); c.globalAlpha = 0.28;
    try { this.drawRider(c, p, p.x - this.cam.x, p.y - this.cam.y); } catch (e) { /* 그림이 없으면 빛만 건너뛴다 */ }
    c.restore();
    c.globalCompositeOperation = 'source-over';
    if (f) {                                                      // 물빛 — 찌 둘레 수면을 한 톤 밝힌다
      c.globalCompositeOperation = 'lighter';
      c.save(); c.translate(bx, by + 4 * z); c.scale(1, 0.4);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 120 * z);
      g.addColorStop(0, 'rgba(200,190,160,.16)'); g.addColorStop(1, 'rgba(200,190,160,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 120 * z, 0, Math.PI * 2); c.fill(); c.restore();
    }
    c.restore();
  },
  /** 게이지 — 기본 창과 같은 결(짙은 갈색 판 · 테 #3b3527 · 안쪽 검은 선)에 금빛 줄. 줄어들면 붉게 깜빡인다 */
  duelGauge(c: CanvasRenderingContext2D, x: number, w: number, y: number, g: number, low: boolean, k: number) {
    c.save();
    const bg = c.createLinearGradient(0, y - 7 * k, 0, y + 7 * k);
    bg.addColorStop(0, '#16150f'); bg.addColorStop(1, '#0e0d0a');
    c.fillStyle = bg; c.beginPath(); c.roundRect(x - 6 * k, y - 7 * k, w + 12 * k, 14 * k, 3); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#3b3527'; c.beginPath(); c.roundRect(x - 5.5 * k, y - 6.5 * k, w + 11 * k, 13 * k, 3); c.stroke();
    const gr = c.createLinearGradient(0, y - 3 * k, 0, y + 3 * k);
    gr.addColorStop(0, low ? '#e0705a' : '#f0d48a'); gr.addColorStop(0.5, low ? '#c8433c' : '#d8a94b'); gr.addColorStop(1, low ? '#7a2a22' : '#8a6a2a');
    c.fillStyle = gr; c.beginPath(); c.roundRect(x, y - 3 * k, Math.max(0, w * g), 6 * k, 1.5); c.fill();
    c.strokeStyle = 'rgba(232,227,212,.35)'; c.lineWidth = 1; c.setLineDash([2, 3]);        // 남은 줄 — 풀린 낚싯줄
    c.beginPath(); c.moveTo(x + w * g, y); c.lineTo(x + w, y); c.stroke();
    c.restore();
  },
  duelDraw() {
    const D = this.duel; if (!D || !D.ctx) return;
    this.duelLayout();
    const c = D.ctx, d = D.d, r = D.rect;
    c.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
    c.clearRect(0, 0, innerWidth, innerHeight);
    this.duelScrim(c);
    d.draw(c, r);
    // 게이지 — 화면 위 끝에서 끝까지 팽팽한 낚싯줄 · 끝의 물고기가 끌려온다
    const W = innerWidth, gx0 = Math.max(24, W * 0.08), gw = W - gx0 * 2, gy = 20, g = clamp(d.gauge, 0, 1);
    this.duelGauge(c, gx0, gw, gy, g, g < 0.25 && Math.sin(d.t * 14) > 0, 1);
    const fx = gx0 + gw * g, fy = gy + Math.sin(d.t * 18) * 1.5;
    c.save(); c.fillStyle = g < 0.25 ? '#e0705a' : '#e8e3d4';
    c.beginPath(); c.ellipse(fx, fy, 9, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(fx - 7, fy); c.lineTo(fx - 14, fy - 5 + Math.sin(d.t * 22) * 2); c.lineTo(fx - 14, fy + 5 + Math.sin(d.t * 22) * 2); c.fill();
    c.restore();
    c.save(); c.textAlign = 'center'; c.fillStyle = '#9b957f'; c.font = `12px ${FONT || 'sans-serif'}`;
    const touch = document.body.classList.contains('touch');
    c.fillText(touch ? tr('탭으로 치고 · 누른 채 공을 따라간다 · 스피너는 누른 채 돌린다') : tr('클릭 · Z · X 로 치고 · 누른 채 공을 따라간다 · Esc 줄을 놓는다'), innerWidth / 2, innerHeight - 14);
    if (D.intro > 0) {
      c.globalAlpha = Math.min(1, D.intro * 1.5); c.fillStyle = '#d8a94b'; c.font = `700 22px ${FONT || 'sans-serif'}`;
      c.fillText(tr('입질이다 — 박자에 맞춰 당겨라!'), r.x + r.w / 2, r.y + r.h / 2);
    }
    c.restore();
  }
};

mixin(Game.prototype, FishDuelPart, true);
