/* js/titlebg.js — 타이틀 화면 배경.

   예전에는 별똥별 그림 한 장(bg/title_key.png)을 깔아 두기만 했다. 정지 화면이라
   처음 몇 초는 예쁘고 그 뒤로는 벽지였다. 그 그림은 이제 로딩 화면으로 옮기고,
   타이틀에는 **움직이는 풍경**을 세운다 — 홈페이지 첫 화면과 같은 결로.

   영상 파일을 새로 만들지 않는다. 게임이 실제로 쓰는 애셋을 그대로 움직인다.
     bg/parallax_*.png   1920x400, 가로로 이음매 없이 이어지고 위쪽은 투명하다
   여기에 하늘 그러데이션 · 별 · 재 · 잉걸불 노을 · 이따금 지나가는 별똥별을 얹는다.

   화면에 안 보이면 아예 돌지 않는다(멈춤 상태에서 프레임을 낭비하지 않게).
   접근성 설정에서 움직임 줄이기를 켜 두었으면 한 장만 그리고 멈춘다. */
const TitleBG = {
  cv: null, ctx: null, layers: [], flakes: [], stars: [],
  t: 0, last: 0, on: false, still: false, raf: 0,

  /* 뒤에서 앞으로. speed 는 가로로 흐르는 속도(논리픽셀/초), y 는 바닥에서 띄운 높이 */
  LAYER_SPEC: [
    { key: 'parallax_sky', speed: 5, y: 42, alpha: 0.42, tint: '#1b2340' },
    { key: 'parallax_snow', speed: 11, y: 20, alpha: 0.5, tint: '#232b46' },
    { key: 'parallax_village', speed: 22, y: 0, alpha: 0.78, tint: '#171a2a' },
    { key: 'parallax_forest', speed: 46, y: -26, alpha: 1, tint: null }
  ],

  init() {
    this.cv = document.getElementById('title-bg');
    if (!this.cv) return;
    this.ctx = this.cv.getContext('2d');
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (let i = 0; i < 150; i++) {
      this.stars.push({ x: Math.random(), y: Math.random() * 0.62,
        r: 0.5 + Math.random() * 1.3, ph: Math.random() * 7, sp: 0.5 + Math.random() * 1.6 });
    }
    for (let i = 0; i < 110; i++) {
      this.flakes.push({ x: Math.random(), y: Math.random(),
        r: 0.5 + Math.random() * 1.8, vy: 7 + Math.random() * 20,
        drift: 0.3 + Math.random() * 1.3, ph: Math.random() * 7, a: 0.12 + Math.random() * 0.36 });
    }
    addEventListener('resize', () => this.resize());
    this.resize();
  },

  /** Sprites 가 다 붙은 뒤 한 번 불러 준다 — 그때 비로소 시차 그림을 쓸 수 있다 */
  useSprites() {
    if (!window.Sprites || !Sprites.img) return;
    this.layers = this.LAYER_SPEC
      .map(s => Object.assign({}, s, { im: Sprites.img[s.key] }))
      .filter(l => l.im && l.im.width);
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
    const W = this.w, H = this.h, t = this.t;
    const ground = H * 1.03;                  // 지평선 — 능선을 화면 밖까지 내려 이음매를 없앤다

    /* ---- 하늘 ---- */
    const sky = c.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, '#05060f');
    sky.addColorStop(0.42, '#0c1024');
    sky.addColorStop(0.78, '#1d1a2c');
    sky.addColorStop(1, '#3a2418');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);

    /* ---- 별 ---- */
    for (const s of this.stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      c.globalAlpha = tw * 0.85;
      c.fillStyle = '#dfe6ff';
      c.fillRect(Math.round(s.x * W), Math.round(s.y * H), s.r, s.r);
    }
    c.globalAlpha = 1;


    /* ---- 떨어지는 별 — 7초에 한 번, 2초 동안 하늘을 가른다 ---- */
    const cyc = (t % 7.4) / 2.0;
    if (cyc < 1) {
      const sx = W * 0.08, sy = H * 0.06, ex = W * 0.74, ey = H * 0.56;
      const px = sx + (ex - sx) * cyc, py = sy + (ey - sy) * cyc;
      const tail = 0.16;
      const qx = sx + (ex - sx) * Math.max(0, cyc - tail), qy = sy + (ey - sy) * Math.max(0, cyc - tail);
      const g2 = c.createLinearGradient(qx, qy, px, py);
      g2.addColorStop(0, 'rgba(255,214,140,0)');
      g2.addColorStop(1, 'rgba(255,235,190,' + (0.75 * Math.sin(cyc * Math.PI)).toFixed(3) + ')');
      c.strokeStyle = g2; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(qx, qy); c.lineTo(px, py); c.stroke();
    }

    /* ---- 시차 능선 — 게임이 쓰는 그림 그대로.
       먼 능선 둘을 먼저 놓고, 그 위에 노을을 얹고, 가까운 능선 둘을 다시 얹는다.
       그래야 잉걸불 빛이 앞 능선을 실루엣으로 만들어 깊이가 생긴다. ---- */
    const band = (L) => {
      const im = L.im;
      const sc = Math.max(1, (H * 0.56) / im.height);         // 화면 높이에 맞춘 배율
      const w = im.width * sc, h = im.height * sc;
      const y = ground - h + L.y * sc * 0.5;
      const off = -((t * L.speed * sc) % w);
      c.globalAlpha = L.alpha;
      for (let x = off; x < W; x += w) c.drawImage(im, Math.round(x), Math.round(y), w, h);
      c.globalAlpha = 1;
      if (L.tint) {                                           // 멀수록 푸르게 가라앉힌다
        c.save();
        c.globalCompositeOperation = 'source-atop';
        c.globalAlpha = 0.42;
        c.fillStyle = L.tint;
        c.fillRect(0, y, W, h);
        c.restore();
      }
    };
    c.imageSmoothingEnabled = false;
    for (let i = 0; i < this.layers.length && i < 2; i++) band(this.layers[i]);

    /* ---- 노을 · 잉걸불 — 능선 너머에서 번지는 온기 ---- */
    const gx = W * 0.74, gy = ground - H * 0.2;
    const glow = c.createRadialGradient(gx, gy, 0, gx, gy, H * 0.62);
    glow.addColorStop(0, 'rgba(255,190,104,0.34)');
    glow.addColorStop(0.3, 'rgba(226,124,56,0.17)');
    glow.addColorStop(0.66, 'rgba(150,72,44,0.06)');
    glow.addColorStop(1, 'rgba(150,72,44,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);

    for (let i = 2; i < this.layers.length; i++) band(this.layers[i]);
    c.imageSmoothingEnabled = true;

    /* ---- 땅 — 능선 아래로 남는 자리를 메운다 ---- */
    c.fillStyle = '#08070a';
    c.fillRect(0, ground, W, H - ground + 2);

    /* ---- 재 ---- */
    for (const f of this.flakes) {
      if (!this.still) {
        f.y += (f.vy / H) * dt;
        if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
      }
      const x = f.x * W + Math.sin(t * f.drift + f.ph) * 14;
      c.globalAlpha = f.a;
      c.fillStyle = '#d8c7a8';
      c.fillRect(Math.round(x), Math.round(f.y * H), f.r, f.r);
    }
    c.globalAlpha = 1;

    /* ---- 비네트 — 글자가 앉을 가운데를 살짝 눌러 준다 ---- */
    const vig = c.createRadialGradient(W / 2, H * 0.42, H * 0.16, W / 2, H * 0.42, H * 0.92);
    vig.addColorStop(0, 'rgba(4,5,11,0.06)');
    vig.addColorStop(0.55, 'rgba(4,5,11,0.34)');
    vig.addColorStop(1, 'rgba(4,5,11,0.78)');
    c.fillStyle = vig; c.fillRect(0, 0, W, H);
  }
};
