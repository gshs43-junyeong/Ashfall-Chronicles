/* 홈 히어로 애니메이션.
 *
 * 트레일러 영상 대신 게임이 실제로 쓰는 애셋을 그대로 움직인다.
 *   - bg/parallax_*.png  1920x400, 가로로 이음매 없이 반복되고 위쪽은 투명하다.
 *   - char/player.png    1040x160 = 20x40 프레임 13개를 4배 확대한 가로 스트립. 간격 없음.
 *
 * 그래서 영상 파일을 따로 만들 필요 없이, 게임과 같은 그림이 같은 방식으로 움직인다.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var BASE = 'play/assets/';

  /* 뒤에서 앞으로. speed 는 스크롤 배속, y 는 바닥에서 띄울 높이(논리 픽셀). */
  var LAYERS = [
    { file: 'bg/parallax_sky.png',     speed: 10,  y: 6,  alpha: 0.55 },
    { file: 'bg/parallax_village.png', speed: 26,  y: 0,  alpha: 0.85 },
    { file: 'bg/parallax_forest.png',  speed: 58,  y: -16, alpha: 1 }
  ];

  var PLAYER = { file: 'char/player.png', fw: 80, fh: 160, walk: [2, 3, 4, 5], fps: 9 };

  /* 논리 좌표계. 실제 픽셀은 DPR 만큼 더 쓰고, CSS 크기에 맞춰 늘린다. */
  var W = 1280, H = 480;
  var GROUND = 400;

  var images = {};
  var ready = false;

  function load(list, done) {
    var left = list.length;
    if (!left) return done();
    list.forEach(function (src) {
      var img = new Image();
      img.onload = img.onerror = function () {
        images[src] = img.naturalWidth ? img : null;
        if (--left === 0) done();
      };
      img.src = BASE + src;
    });
  }

  /* ---------------- 재 ---------------- */
  var flakes = [];
  for (var i = 0; i < 90; i++) {
    flakes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.6 + Math.random() * 1.7,
      vy: 8 + Math.random() * 22,
      drift: 0.4 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      a: 0.15 + Math.random() * 0.4
    });
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    /* 논리 좌표를 CSS 폭에 맞춘다 — 세로는 비율 유지, 아래를 기준으로 붙인다. */
    var scale = (rect.width * dpr) / W;
    ctx.setTransform(scale, 0, 0, scale, 0, (rect.height * dpr) - (H * scale));
    ctx.imageSmoothingEnabled = false;
  }

  function drawLayer(layer, offset) {
    var img = images[layer.file];
    if (!img) return;
    var h = 400;
    var y = GROUND - h + layer.y;
    var x = -(offset % img.width);
    ctx.globalAlpha = layer.alpha;
    for (var px = x; px < W; px += img.width) {
      ctx.drawImage(img, Math.round(px), Math.round(y), img.width, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(t) {
    var img = images[PLAYER.file];
    if (!img) return;
    var frame = PLAYER.walk[Math.floor(t * PLAYER.fps) % PLAYER.walk.length];
    var scale = 0.92;
    var w = PLAYER.fw * scale, h = PLAYER.fh * scale;
    var x = W * 0.19;
    /* 걷는 동안 아주 살짝 위아래로 흔들린다 — 게임의 걷기 모션과 같은 리듬 */
    var bob = Math.sin(t * PLAYER.fps * Math.PI) * 1.6;
    var y = GROUND - h + 12 + bob;

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, GROUND + 8, w * 0.34, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(img, frame * PLAYER.fw, 0, PLAYER.fw, PLAYER.fh,
                  Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawAsh(t, dt) {
    ctx.fillStyle = '#c9bdb0';
    flakes.forEach(function (f) {
      if (dt) {
        f.y += f.vy * dt;
        f.x -= f.drift * f.vy * dt * 0.5;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        if (f.x < -4) f.x = W + 4;
      }
      ctx.globalAlpha = f.a * (0.7 + 0.3 * Math.sin(t * 1.5 + f.phase));
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#150f0d');
    g.addColorStop(0.45, '#24191a');
    g.addColorStop(1, '#3a2620');
    ctx.fillStyle = g;
    ctx.fillRect(0, -H, W, H * 2);

    /* 떨어진 별의 잔광 */
    var glow = ctx.createRadialGradient(W * 0.74, 92, 0, W * 0.74, 92, 240);
    glow.addColorStop(0, 'rgba(249,116,73,.30)');
    glow.addColorStop(1, 'rgba(249,116,73,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, -H, W, H * 2);
  }

  function frame(t, dt) {
    drawSky();
    LAYERS.forEach(function (l) { drawLayer(l, t * l.speed); });
    drawPlayer(t);
    drawAsh(t, dt);
    /* 아래쪽을 페이지 배경으로 녹인다.
     * 캔버스 바닥은 논리 y=H 이므로 그 아래까지 덮어야 한다 — GROUND+60 에서 끊으면
     * 맨 밑에 하늘 그라데이션 끝색이 띠로 남는다. */
    var fade = ctx.createLinearGradient(0, GROUND - 90, 0, GROUND + 40);
    fade.addColorStop(0, 'rgba(13,11,10,0)');
    fade.addColorStop(1, '#0d0b0a');
    ctx.fillStyle = fade;
    ctx.fillRect(0, GROUND - 90, W, H);
  }

  var last = 0;
  function loop(now) {
    var t = now / 1000;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    frame(t, dt);
    requestAnimationFrame(loop);
  }

  load(LAYERS.map(function (l) { return l.file; }).concat(PLAYER.file), function () {
    ready = true;
    resize();
    /* 첫 장은 rAF 를 기다리지 않고 바로 그린다. 배경 탭에서 열렸거나 브라우저가
     * 콜백을 미루면 rAF 가 한동안 안 오는데, 그동안 캔버스가 까맣게 비어 보인다. */
    frame(2.6, 0);
    canvas.classList.add('is-ready');
    if (!reduced) requestAnimationFrame(loop);
  });

  function resync() {
    if (!ready) return;
    resize();
    /* 움직이는 중이면 다음 프레임이 알아서 다시 그린다. 정지 상태에서는 직접 그려야
     * 크기만 바뀌고 내용이 빈 채로 남는다. */
    if (reduced || document.hidden) frame(2.6, 0);
  }

  window.addEventListener('resize', resync);

  /* 창 크기가 그대로여도 히어로 높이는 바뀐다 — 웹폰트가 늦게 도착해 제목이 다시
   * 흐르거나, 화면 회전으로 줄 수가 달라질 때. 그때 캔버스 버퍼가 옛 크기로 남아 있으면
   * 그림이 늘어난다. 그래서 창이 아니라 캔버스 자체를 관찰한다. */
  if ('ResizeObserver' in window) {
    new ResizeObserver(resync).observe(canvas);
  } else if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(resync);
  }
})();
