/* ===== game/sound.js — 사운드 · 재질 파편 · 효과음 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TILE_DEF } from '../data.js';
import { MAT, MAT_DEF, mobMat, tileMat } from '../data/materials.js';
import { BOSS_DIE } from '../data/skills.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { SFX_GAP, Sfx } from '../music.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const SoundPart = {

  /* ================= 사운드 ================= */
  audioInit() {
    if (this.ac) return;
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
  },
  /** 타일 좌표에서 나는 소리 — 화면 근처가 아니면 아예 재생하지 않는다. */
  sfxAt(kind, tx, ty, rate, vol) {
    const p = this.player; if (!p) return;
    const dx = Math.abs(tx * TS - p.cx), dy = Math.abs(ty * TS - p.cy);
    if (dx > this.W * 0.6 + 120 || dy > this.H * 0.6 + 120) return;
    this.sfx(kind, rate, vol);
  },

  /* ================= 재질 파편 ================= */
  /* ★ 이름은 반드시 matBurst 다. */
  matBurst(mat, x, y, n, o) {
    const m = MAT[mat] || MAT[MAT_DEF];
    o = o || {};
    const k = n === undefined || n === null ? m.n : n;
    const spd = o.spd === undefined ? 1 : o.spd;
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU, rr = o.ring ? o.ring * (0.7 + Math.random() * 0.3) : 0;
      const pt = new Part(x + Math.cos(a) * rr, y + Math.sin(a) * rr,
        m.c[(Math.random() * m.c.length) | 0], o.vy === undefined ? -20 : o.vy,
        m.life * (o.life || 1),
        { g: m.g, sq: m.sq, glow: m.glow, spd, r: o.r || 1, drag: m.glow ? 0.90 : 0.96 });
      if (rr) {                       // 고리에서 시작하면 방향을 반지름 축으로 다시 잡는다
        const v = Math.hypot(pt.vx, pt.vy) * (o.in ? -1 : 1);
        pt.vx = Math.cos(a) * v; pt.vy = Math.sin(a) * v;
      }
      this.parts.push(pt);
    }
  },
  /** 한 획마다 다른 음높이. */
  strokeRate() { return 0.94 + Math.random() * 0.12; },

  /** 무기가 닿는 순간 — 맞은 것의 재질로 소리와 파편을 낸다. */
  hitFx(e, x, y, crit, fam) {
    const mat = mobMat(e.type, e.mech);
    this.matBurst(mat, x, y, crit ? 8 : 4, { spd: crit ? 1.15 : 0.85, life: 0.75 });
    const tx = x / TS, ty = y / TS;
    this.sfxAt(MAT[mat].hit, tx, ty, this.strokeRate());
    if (fam && mat !== 'flesh' && mat !== 'gel') this.sfxAt('hit_' + fam, tx, ty, this.strokeRate());
    /* 치명타는 계열마다 따로 굽지 않고 **한 겹을 얹는다** — 짧고 높고 금속적이라 어느 계열 위에 올려도 섞인다. */
    if (crit) this.sfxAt('hit_crit', tx, ty);
  },
  /** 한 칸이 떨어져 나가는 순간 */
  breakFx(tx, ty, id, mach) {
    const mat = tileMat(id);
    const x = (tx + .5) * TS, y = (ty + .5) * TS;
    this.matBurst(mat, x, y, mach ? 14 : undefined, { spd: mach ? 1.2 : 1 });
    if (mach) this.matBurst('ember', x, y, 6, { spd: 1.4, life: 0.6 });   // 기계는 불티가 튄다
    this.sfx(mach ? 'break_machine' : MAT[mat].brk, this.strokeRate());
    if (mach || (this.HEAVY[mat] && TILE_DEF[id].solid === 1)) this.thump(mach ? 1 : TILE_DEF[id].ore ? 0.9 : 0.7);
  },
  /* 죽을 때 — 보스는 **무엇으로 만들어졌는지**에 따라 다르게 무너진다(BOSS_DIE). */
  deathBurst(e) {
    const mat = mobMat(e.type, e.mech);
    if (!e.boss) {
      this.matBurst(mat, e.cx, e.cy, MAT[mat].n + 3, { spd: 1.15, life: 1.2 });
      return;
    }
    const d = BOSS_DIE[e.type] || { mat, n: 56, spd: 1.2, life: 1.3, shake: 20 };
    this.matBurst(d.mat || mat, e.cx, e.cy, d.n, {
      spd: d.spd, vy: d.vy, life: d.life, ring: d.ring, in: d.in, r: 1.35,
    });
    this.shake = Math.max(this.shake, d.shake || 20);
    if (!d.mat2) return;
    const x = e.cx, y = e.cy;
    this.pending.push({
      t: d.at || 0.2,
      fn: () => {
        this.matBurst(d.mat2, x, y, d.n2, {
          spd: (d.spd || 1) * 1.25, life: (d.life || 1) * 1.1, r: 1.2,
        });
        this.sfx(MAT[d.mat2].brk, 0.78 + Math.random() * 0.18);
        this.shake = Math.max(this.shake, (d.shake || 20) * 0.5);
      },
    });
  },

  /** 캐는 동안 한 획마다 — 파편 한 톨과 재질 타격음 */
  /* ★ 한 칸을 캐는 데 박자가 서넛씩 들어가고 그 박자마다 **무기 타격음과 같은 파일**이 제 음량으로 울렸다 */
  MINE_TICK_VOL: 0.18,
  MINE_TICK_RATE: 0.62,
  mineTickFx(tx, ty, id) {
    const mat = tileMat(id);
    const x = (tx + .5) * TS, y = (ty + .5) * TS;
    this.matBurst(mat, x, y, 1, { spd: 0.7, life: 0.6 });
    this.sfxAt(MAT[mat].hit, tx, ty,
      this.MINE_TICK_RATE * this.strokeRate(), this.MINE_TICK_VOL);
    if (this.HEAVY[mat] && TILE_DEF[id].solid === 1) this.thump(TILE_DEF[id].ore ? 0.5 : 0.38);
  },
  HEAVY: { stone: 1, metal: 1, glass: 1, ember: 1, ice: 1, bone: 1 },
  /** 묵직한 한 겹 — 파일 소리 위에 얹는 짧은 저음(140→48Hz)과 낮게 거른 잡음. 돌·광석·기계를 칠 때와 깰 때.
      ★ 파일(mat_stone · ore_hit · mine)의 저음 비중이 0~3%(실측, 150Hz 아래 에너지)라 곡괭이가 가볍게만 들렸다. */
  thump(power) {
    const ac = this.ac; if (!ac) return;
    const v = (Sfx ? Sfx.vol : 0.5) * power;
    if (v < 0.005) return;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.13);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.22);
    if (!this._thumpNoise) {
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.09), ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      this._thumpNoise = b;
    }
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain();
    n.buffer = this._thumpNoise; f.type = 'lowpass'; f.frequency.value = 650; ng.gain.value = v * 0.6;
    n.connect(f); f.connect(ng); ng.connect(ac.destination); n.start(t);
  },

  /* ================= 효과음 ================= */
  sfx(kind, rate, volMul) {
    if (Sfx && Sfx.play(kind, rate, volMul)) return;   // 손그림 파일이 로드돼 있으면 그걸로 대신한다
    const ac = this.ac; if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const spec = {
      swing: [220, 90, 'triangle', .05], bow: [520, 180, 'square', .04], magic: [700, 340, 'sine', .05],
      mine: [140, 90, 'square', .035], place: [300, 220, 'square', .03], die: [180, 60, 'sawtooth', .05],
      bossdie: [90, 40, 'sawtooth', .12], level: [520, 880, 'sine', .08], coin: [880, 1200, 'square', .04],
      craft: [420, 620, 'triangle', .05], equip: [340, 460, 'sine', .04], drink: [300, 520, 'sine', .05],
      dash: [600, 260, 'sine', .04], skill: [420, 760, 'triangle', .06], boss: [70, 40, 'sawtooth', .16],
      chapter: [400, 720, 'sine', .09], death: [200, 60, 'sawtooth', .12], talk: [420, 460, 'sine', .03],
      open: [260, 380, 'square', .035], learn: [600, 900, 'triangle', .06],
      // 문 — 여는 쪽은 경첩이 풀리며 올라가고, 닫는 쪽은 문설주에 부딪혀 떨어진다
      door_open: [180, 300, 'triangle', .05, .35], door_shut: [320, 120, 'square', .055, .5],
      // --- 농사 · 정지 스위치 ---
      hoe: [180, 110, 'square', .04], harvest: [500, 700, 'triangle', .05],
      power_on: [200, 500, 'square', .05], power_off: [500, 150, 'square', .05],
      splash: [560, 140, 'sine', .045],    // 낚싯줄이 물에 떨어지는 짧은 퐁당 소리
      hatch: [300, 900, 'triangle', .06],  // 껍질이 깨지고 뭔가 튀어나오는 느낌으로 올라가는 톤
      /* --- 재질별 타격 (무기가 닿는 순간) --- */
      hit_flesh: [180, 90, 'sine', .05, .55], hit_bone: [430, 200, 'square', .045, .5],
      hit_stone: [200, 120, 'square', .05, .7], hit_dirt: [140, 80, 'triangle', .045, .85],
      hit_wood: [300, 160, 'triangle', .045, .45], hit_metal: [900, 520, 'square', .045, .3],
      hit_glass: [1500, 900, 'sine', .04, .5], hit_gel: [260, 120, 'sine', .05, .3],
      hit_plant: [520, 300, 'triangle', .04, .7], hit_ember: [700, 200, 'sawtooth', .045, .8],
      hit_void: [120, 60, 'sine', .05, .45],
      /* --- 재질별 파괴 (한 칸이 떨어져 나가는 순간) --- */
      break_stone: [150, 70, 'square', .06, .9], break_dirt: [110, 60, 'triangle', .055, .95],
      break_wood: [240, 110, 'triangle', .06, .6], break_plant: [440, 200, 'triangle', .05, .85],
      break_metal: [760, 300, 'square', .06, .5], break_glass: [1800, 700, 'sine', .055, .75],
      break_ice: [1300, 500, 'sine', .055, .7], break_ember: [420, 120, 'sawtooth', .06, .9],
      break_bone: [520, 200, 'square', .055, .6], break_flesh: [200, 90, 'sine', .06, .5],
      break_void: [90, 45, 'sine', .06, .6], break_machine: [520, 140, 'sawtooth', .07, .55],
      /* --- 스킬 (열아홉 가지를 열다섯 갈래로) --- */
      sk_slash: [620, 200, 'sawtooth', .05, .55],   // 칼바람 — 빠르게 내려긋는다
      sk_whirl: [520, 260, 'sawtooth', .036, .5],   // 도는 동안 박자마다
      sk_charge: [260, 90, 'square', .06, .7],      // 부딪히며 밀고 들어간다
      sk_quake: [110, 45, 'sawtooth', .075, .95],   // 땅이 갈라진다
      sk_guard: [180, 300, 'square', .05, .35],     // 쇠가 맞물려 굳는다
      sk_shout: [300, 520, 'sawtooth', .07, .6],    // 사람 목소리처럼 올라간다
      sk_volley: [700, 400, 'square', .045, .45],   // 시위가 여러 번
      sk_pierce: [1200, 520, 'sine', .045, .3],     // 한 발이 꿰뚫는다
      sk_smoke: [420, 150, 'sine', .04, .9],        // 퍼지는 연기
      sk_mark: [900, 1350, 'sine', .04],            // 겨눈 곳에 찍히는 신호음
      sk_fire: [180, 520, 'sawtooth', .055, .75],   // 불이 붙는다
      sk_meteor: [90, 38, 'sawtooth', .1, .95],     // 떨어져 박힌다
      sk_frost: [1400, 600, 'sine', .05, .5],       // 얼음이 갈라진다
      sk_heal: [520, 880, 'sine', .05],             // 따뜻하게 올라가는 종
      sk_shield: [400, 760, 'triangle', .05, .25],  // 유리 돔이 씌워진다
      sk_bolt: [1600, 700, 'square', .05, .6],      // 전기가 튄다
      sk_blink: [900, 180, 'sine', .045, .35],      // 사라졌다 나타난다
      sk_summon: [260, 430, 'sawtooth', .055, .4],  // 부르는 소리
      sk_deny: [200, 150, 'square', .028, .25]      // 막힌 소리 — 짧고 낮게
    }[kind];
    if (!spec) return;
    /* ★ 파일이 없어 합성음으로 떨어질 때도 SFX_GAP 을 지킨다. */
    const gap = SFX_GAP && SFX_GAP[kind];
    if (gap !== undefined) {
      this._synLast = this._synLast || {};
      const now = t;
      if (now - (this._synLast[kind] || -9) < gap) return;
      this._synLast[kind] = now;
    }
    const r = rate || 1;
    const [f0, f1, type, vol, nz] = spec;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0 * r, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1 * r), t + 0.16);
    g.gain.setValueAtTime(vol * (nz ? 0.55 : 1) * (volMul === undefined ? 1 : volMul), t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.24);
    if (!nz) return;
    /* 잡음 한 줌 — 대역통과로 재질의 '거칠기'를 만든다. */
    if (!this._nzBuf) {
      const n = Math.floor(ac.sampleRate * 0.25);
      const b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this._nzBuf = b;
    }
    const src = ac.createBufferSource(); src.buffer = this._nzBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f0 * r * 1.6, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(60, f1 * r), t + 0.14);
    const ng = ac.createGain();
    ng.gain.setValueAtTime(vol * nz * 1.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.16 + nz * 0.1);
    src.connect(bp); bp.connect(ng); ng.connect(ac.destination);
    src.start(t); src.stop(t + 0.3);
  },
};
mixin(G, SoundPart);
