// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* js/titlebg.js — 타이틀 화면 배경. */
import { Sprites } from './sprites.js';
export const TitleBG = {
  cv: null, ctx: null, layers: [], flakes: [], player: null,
  t: 0, last: 0, on: false, still: false, raf: 0, w: 0, h: 0,

  /* 뒤에서 앞으로. */
  LAYER_SPEC: [
    { key: 'parallax_sky', speed: 10, y: 6, alpha: 0.55 },
    { key: 'parallax_village', speed: 26, y: 0, alpha: 0.85 },
    { key: 'parallax_forest', speed: 58, y: -16, alpha: 1 }
  ],
  WALK: [2, 3, 4, 5],          // 캐릭터 시트의 걷기 프레임 (idle1 idle2 walk1..4 …)
  FPS: 9,

  /* 타이틀 화면이 **실제로 필요로 하는** 그림. */
  NEEDED: ['parallax_sky', 'parallax_village', 'parallax_forest', 'player_wanderer'],

  /** 필요한 그림 중 몇 장이 준비됐나 — 로딩 진행 표시와 대기 판정에 함께 쓴다 */
  artReady() {
    if (typeof Sprites === 'undefined' || !Sprites.img) return 0;
    let n = 0;
    for (const k of this.NEEDED) { const im = Sprites.img[k]; if (im && im.width) n++; }
    return n;
  },

  init() {
    this.cv = document.getElementById('title-bg');
    if (!this.cv) return;
    this.ctx = this.cv.getContext('2d');
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (let i = 0; i < 120; i++) {
      this.flakes.push({ x: Math.random(), y: Math.random(),
        r: 0.6 + Math.random() * 1.7, vy: 8 + Math.random() * 22,
        drift: 0.4 + Math.random() * 1.4, ph: Math.random() * 7, a: 0.15 + Math.random() * 0.4 });
    }
    addEventListener('resize', () => this.resize());
    this.resize();
  },

  /** 그림이 준비됐으면 능선과 사람을 얹는다 — 사연: docs/code-history.md#h89 */
  useSprites() {
    if (typeof Sprites === 'undefined' || !Sprites.img) return false;
    const got = this.LAYER_SPEC
      .map(s => Object.assign({}, s, { im: Sprites.img[s.key] }))
      .filter(l => l.im && l.im.width);
    if (!got.length) return false;              // 아직 안 왔다 — 다음에 다시 본다
    this.layers = got;
    // 옛 공용 시트(char/player.png)는 방랑자 시트와 같은 그림이라 지웠다 — 방랑자 시트를 쓴다
    const im = Sprites.img.player_wanderer;
    const m = Sprites.meta && Sprites.meta.characters && Sprites.meta.characters.sheets.player_wanderer;
    // 프레임 크기는 매니페스트에서 가져온다 — 시트를 다시 구우면 여기도 저절로 따라온다
    if (im && im.width && m) this.player = { im, fw: m.frameW * Sprites.scale, fh: m.frameH * Sprites.scale };
    if (!this.on) this.frame(0);
    return true;
  },

  resize() {
    if (!this.cv) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.w = innerWidth; this.h = innerHeight;
    this.cv.width = Math.round(this.w * dpr);
    this.cv.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.on) this.frame(0);              // 멈춰 있어도 크기가 바뀌면 다시 그린다
  },

  start() {
    if (!this.cv || this.on) return;
    this.on = true; this.last = 0;
    if (this.still) { this.frame(0); this.on = false; return; }
    this.raf = requestAnimationFrame(t => this.tick(t));
  },
  stop() {
    this.on = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  },
  tick(now) {
    if (!this.on) return;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    this.t += dt;
    this.frame(dt);
    this.raf = requestAnimationFrame(t => this.tick(t));
  },

  frame(dt) {
    const c = this.ctx; if (!c) return;
    /* 그림이 아직 안 붙었으면 0.4초마다 다시 두드린다. */
    if (!this.layers.length) {
      this._try = (this._try || 0) - (dt || 0.016);
      if (this._try <= 0) { this._try = 0.4; this.useSprites(); }
    }
    const W = this.w, H = this.h, t = this.t;
    const ground = H * 0.93;                  // 사람이 딛는 줄
    const sc = Math.max(1, (H * 0.62) / 400); // 능선 그림(400px)을 화면 높이에 맞춘 배율

    /* ---- 하늘 (site/hero.js 의 drawSky 와 같은 색) ---- */
    const sky = c.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, '#150f0d');
    sky.addColorStop(0.45, '#24191a');
    sky.addColorStop(1, '#3a2620');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);

    /* ---- 떨어진 별이 남긴 잔광 ---- */
    const gx = W * 0.74, gy = H * 0.2, gr = Math.max(W, H) * 0.42;
    const glow = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
    glow.addColorStop(0, 'rgba(249,116,73,0.30)');
    glow.addColorStop(1, 'rgba(249,116,73,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);

    /* ---- 시차 능선 — 게임이 쓰는 그림 그대로, 색은 손대지 않는다 ---- */
    c.imageSmoothingEnabled = false;
    for (const L of this.layers) {
      const im = L.im;
      const w = im.width * sc, h = 400 * sc;
      const y = ground - h + L.y * sc;
      const off = -((t * L.speed * sc) % w);
      c.globalAlpha = L.alpha;
      for (let x = off; x < W; x += w) c.drawImage(im, Math.round(x), Math.round(y), w, h);
      c.globalAlpha = 1;
    }

    /* ---- 걸어가는 사람 — 메뉴를 피해 오른쪽 트인 자리에 ---- */
    const P = this.player;
    if (P) {
      /* 원본의 정수 배로만 키운다. */
      const k = Math.max(1, Math.min(3, Math.round(H / 820)));
      const ph = P.fh * k, pw = P.fw * k;
      const fr = this.WALK[Math.floor(t * this.FPS) % this.WALK.length];
      const bob = Math.sin(t * this.FPS * Math.PI) * (ph * 0.012);
      // 칸 맨 아래 한 논리픽셀은 발 밑 여백(tools/mkplayer.py — 32×46 칸) — 그만큼 내려 발을 땅에 붙인다
      const x = W * (W < 900 ? 0.8 : 0.76), y = ground - ph + 4 * k + bob;
      c.save();                                          // 발밑 그림자
      c.globalAlpha = 0.3; c.fillStyle = '#000';
      c.beginPath();
      c.ellipse(x + pw / 2, ground + ph * 0.03, pw * 0.34, ph * 0.028, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      c.drawImage(P.im, fr * P.fw, 0, P.fw, P.fh, Math.round(x), Math.round(y), Math.round(pw), Math.round(ph));
    }
    c.imageSmoothingEnabled = true;

    /* ---- 재 — 비스듬히 내려오는 동그란 점 ---- */
    c.fillStyle = '#c9bdb0';
    for (const f of this.flakes) {
      if (!this.still && dt) {
        f.y += (f.vy / H) * dt;
        f.x -= (f.drift * f.vy * 0.5 / W) * dt;
        if (f.y > 1.01) { f.y = -0.01; f.x = Math.random(); }
        if (f.x < -0.01) f.x = 1.01;
      }
      c.globalAlpha = f.a * (0.7 + 0.3 * Math.sin(t * 1.5 + f.ph));
      c.beginPath(); c.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;

    /* ---- 아래쪽을 바탕색으로 녹인다 (홈페이지와 같은 마무리). */
    const fade = c.createLinearGradient(0, ground - H * 0.05, 0, ground + H * 0.03);
    fade.addColorStop(0, 'rgba(13,11,10,0)');
    fade.addColorStop(1, '#0d0b0a');
    c.fillStyle = fade; c.fillRect(0, ground - H * 0.05, W, H);
    c.fillStyle = '#0d0b0a'; c.fillRect(0, ground + H * 0.03, W, H);

    /* ---- 글자가 앉을 가운데를 살짝 눌러 준다 ---- */
    const vig = c.createRadialGradient(W / 2, H * 0.4, H * 0.12, W / 2, H * 0.4, H * 0.9);
    vig.addColorStop(0, 'rgba(13,11,10,0.20)');
    vig.addColorStop(0.5, 'rgba(13,11,10,0.42)');
    vig.addColorStop(1, 'rgba(13,11,10,0.80)');
    c.fillStyle = vig; c.fillRect(0, 0, W, H);
  }
};
