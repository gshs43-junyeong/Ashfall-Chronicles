/* ===== game/fish-duel.js — 낚시 겨루기: 입질 순간 무엇이 물었는지 정하고, 그 등급으로 osu! 식 판(engine/rhythm)을 짠다 ===== */
/* 게이지가 차면 잡고 바닥나면 놓친다. 등급은 화면에 안 보이고 판의 결(빠르기 · 원 크기 · 판정 창 · 변주)로만 느껴진다.
   숙련 · 낚싯대 · 미끼는 무엇이 무는지에 더해 **판을 쉽게**(판정 창 · 게이지 시작 · 새는 빠르기) 한다. 여럿이어도 낚는 사람 화면에서만 돈다. */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RhythmDuel } from '../../engine/rhythm/duel.js';
import { FONT, tr } from '../lang.js';
import { T } from '../data.js';
import { idef } from '../data/values.js';
import { UI } from '../ui.js';
import { Sfx } from '../music.js';
import { DAY_CYCLE, Game } from '../game.js';
import type { DuelDiff, DuelMods } from '../../engine/rhythm/duel.js';

/* 등급 0~4 — 잡것 · 흔한 물고기는 느린 고리 · 큰 원 · 슬라이더 위주, 위로 갈수록 빠르고 작고 촘촘하다. target = 실수 없이 칠 때 몇 초에 잡히나 */
export const FISH_DUEL: (DuelDiff & { target: number })[] = [
  { ar: 3.5, cs: 2.5, od: 2, hp: 2, bpm: 92, gap: 1.5, slider: 0.45, spinner: 0, repeat: 0.1, stream: 0, jump: 0.8, sv: 1.0, spinRps: 0.8, target: 9 },
  { ar: 5, cs: 3.2, od: 3.5, hp: 3, bpm: 104, gap: 1.25, slider: 0.4, spinner: 0.04, repeat: 0.2, stream: 0.05, jump: 1.0, sv: 1.15, spinRps: 0.9, target: 11 },
  { ar: 6.5, cs: 3.8, od: 5, hp: 4, bpm: 118, gap: 1, slider: 0.35, spinner: 0.06, repeat: 0.25, stream: 0.12, jump: 1.15, sv: 1.3, spinRps: 1.1, target: 13 },
  { ar: 8, cs: 4.3, od: 6.5, hp: 5, bpm: 132, gap: 0.85, slider: 0.3, spinner: 0.08, repeat: 0.3, stream: 0.2, jump: 1.35, sv: 1.45, spinRps: 1.3, target: 16 },
  { ar: 9, cs: 4.8, od: 7.5, hp: 6, bpm: 148, gap: 0.75, slider: 0.28, spinner: 0.1, repeat: 0.35, stream: 0.28, jump: 1.6, sv: 1.6, spinRps: 1.5, target: 19 }
];

export const FishDuelPart: Bag = {
  duel: null,

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
    const bpm = Math.round(base.bpm + (sea ? 4 : 0) + (DAY_CYCLE.isNight(this.dayT) ? -8 : 0) + (this.rainT > 0.5 ? 6 : 0));
    const R = this.rng, mods: DuelMods = {};
    if (tier >= 2 && R.chance(0.3 + (tier - 2) * 0.15)) mods.wiggle = 4 + tier * 1.5;
    if (tier >= 3 && R.chance(0.35)) mods.roll = (R.chance(0.5) ? 1 : -1) * (0.12 + (tier - 3) * 0.08);
    if (tier >= 3 && R.chance(0.25)) mods.hidden = true;
    if (tier >= 4 && R.chance(0.5)) mods.pull = 0.45;
    const d = new RhythmDuel({
      diff: { ...base, bpm }, mods, seed: (this.world.seed || 's') + ':' + this.time.toFixed(3) + ':' + c.id,
      target: base.target,
      start: clamp(0.45 + (rod.fishBonus || 0) * 0.5 + (flv - 1) * 0.01, 0.3, 0.7),
      ease: flv >= 3 ? 0.02 : 0,                                   // 3레벨 '가벼운 손목' — 판정 창이 넓다
      drainMul: baited ? 0.8 : 1,
      theme: { font: FONT || 'sans-serif' },
      onBeat: (i: number) => this.duelBeat(i),
      onJudge: (res: number, kind: string) => this.duelHitSfx(res, kind)
    });
    this.duel = { d, c, baited, tier, wall: performance.now(), rect: { x: 0, y: 0, w: 0, h: 0 }, el: null, ctx: null, off: null, intro: 1.6 };
    this.duelMount();
  },

  /* ---------------- 화면 겹 · 입력 ---------------- */
  duelMount() {
    const D = this.duel;
    const el = document.createElement('canvas');
    el.id = 'fishduel';
    document.body.appendChild(el);
    D.el = el; D.ctx = el.getContext('2d');
    const at = () => D.d.t + Math.min(0.05, (performance.now() - D.wall) / 1000);   // 누른 순간의 겨루기 시각
    const move = (e: PointerEvent) => { const [x, y] = D.d.toField(e.clientX, e.clientY, D.rect); D.d.move(x, y); };
    const down = (e: PointerEvent) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) { } move(e); D.d.press('p' + e.pointerId + ':' + e.button, at()); };
    const up = (e: PointerEvent) => { for (const b of [0, 1, 2]) D.d.release('p' + e.pointerId + ':' + b); };
    const key = (e: KeyboardEvent) => {
      if (/^F\d+$/.test(e.key)) return;
      e.preventDefault(); e.stopImmediatePropagation();          // 겨루는 동안 Z·X(유틸리티) · 이동 · 단축 칸이 게임에 안 간다
      if (e.repeat) return;
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
      el.remove();
    };
  },
  duelLayout() {
    const D = this.duel, el = D.el, dpr = Math.min(2, devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
    // 위 게이지(28px) · 아래 안내 줄(30px) 자리를 빼고 4:3 — 낮은 폰 가로 화면에서도 원이 손가락보다 작아지지 않게
    const h = Math.min(H - 76, H * 0.74, W * 0.66 * 0.75), w = h * 4 / 3;
    D.rect = { x: (W - w) / 2, y: (H - h) / 2 + 4, w, h };
    D.dpr = dpr;
  },

  /* ---------------- 흐름 ---------------- */
  tickDuel(dt: number) {
    const D = this.duel, p = this.player;
    const held = p.held();
    if (p.dead || !p.fish || !held || idef(held).type !== 'rod') { this.endDuel('quit'); return; }
    D.wall = performance.now();
    D.intro = Math.max(0, D.intro - dt);
    D.d.update(dt);
    this.duelDraw();
    if (D.d.state === 'win') this.endDuel('win');
    else if (D.d.state === 'lose') this.endDuel('lose');
  },
  endDuel(how: string) {
    const D = this.duel, p = this.player; if (!D) return;
    D.off(); this.duel = null;
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

  /* ---------------- 그리기 ---------------- */
  duelDraw() {
    const D = this.duel; if (!D || !D.ctx) return;
    this.duelLayout();
    const c = D.ctx, d = D.d, r = D.rect;
    c.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
    c.clearRect(0, 0, innerWidth, innerHeight);
    c.fillStyle = 'rgba(2,8,14,.5)'; c.fillRect(0, 0, innerWidth, innerHeight);
    d.draw(c, r);
    // 게이지 끝의 물고기 — 끌려오는 쪽으로 퍼덕인다
    const g = clamp(d.gauge, 0, 1), fx = r.x + r.w * g, fy = r.y - 16 + Math.sin(d.t * 18) * 1.5;
    c.save(); c.fillStyle = g < 0.25 ? '#ff8a7a' : '#dff4ff';
    c.beginPath(); c.ellipse(fx, fy, 9, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(fx - 7, fy); c.lineTo(fx - 14, fy - 5 + Math.sin(d.t * 22) * 2); c.lineTo(fx - 14, fy + 5 + Math.sin(d.t * 22) * 2); c.fill();
    c.restore();
    c.save(); c.textAlign = 'center'; c.fillStyle = 'rgba(230,240,248,.75)'; c.font = `12px ${FONT || 'sans-serif'}`;
    const touch = document.body.classList.contains('touch');
    c.fillText(touch ? tr('탭으로 치고 · 누른 채 공을 따라간다 · 스피너는 누른 채 돌린다') : tr('클릭 · Z · X 로 치고 · 누른 채 공을 따라간다 · Esc 줄을 놓는다'), r.x + r.w / 2, r.y + r.h + 26);
    if (D.intro > 0) {
      c.globalAlpha = Math.min(1, D.intro * 1.5); c.fillStyle = '#ffe8a0'; c.font = `700 22px ${FONT || 'sans-serif'}`;
      c.fillText(tr('입질이다 — 박자에 맞춰 당겨라!'), r.x + r.w / 2, r.y + r.h / 2);
    }
    c.restore();
  }
};

mixin(Game.prototype, FishDuelPart, true);
