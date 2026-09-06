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

  /* 페이지가 site/home/ 안에 있으므로 한 단계 올라가야 애셋 뿌리에 닿는다.
   * '../' 로 두면 주소가 /home 이든 /home/ 이든 똑같이 사이트 루트로 풀린다. */
  var BASE = '../play/assets/';

  /* 뒤에서 앞으로. speed 는 스크롤 배속, y 는 바닥에서 띄울 높이(논리 픽셀). */
  var LAYERS = [
    { file: 'bg/parallax_sky.png',     speed: 10,  y: 6,  alpha: 0.55 },
    { file: 'bg/parallax_village.png', speed: 26,  y: 0,  alpha: 0.85 },
    { file: 'bg/parallax_forest.png',  speed: 58,  y: -16, alpha: 1 }
  ];

  /* 프레임은 22x40 논리픽셀의 4배다. tools/unclip.py 로 잘린 가장자리를 되살리면서
 * 사방에 한 논리픽셀씩 여백이 붙어 80x160 -> 88x164 가 됐다. 여기 숫자가 어긋나면
 * 프레임이 밀려 사람이 옆 프레임을 물고 잘린다. */
var PLAYER = { file: 'char/player.png', fw: 88, fh: 164, walk: [2, 3, 4, 5], fps: 9 };

  /* 플레이어가 설 가로 위치(논리 폭에 대한 비율). 좁아지면 글이 폭을 다 쓰고 버튼도
   * 줄바꿈되므로 더 바깥으로 민다. resize 때마다 다시 잡는다. */
  var PLAYER_X = 0.68;

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
    PLAYER_X = rect.width < 760 ? 0.90 : 0.68;
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
    /* ★ 원본 크기 그대로 그린다.
     * 예전에는 0.92 배로 줄여 그렸다. 그러면 88x164 그림이 81x151 로 한 번 깎이고,
     * 그 결과가 다시 캔버스 변환(예: 2.25배)으로 늘어난다 — 최근접 확대·축소를 두 번
     * 겹치면 픽셀 열이 들쭉날쭉 겹치거나 빠져서, 팔과 발이 잘려 보인다.
     * 배경 능선도 원본 크기로 그리므로 사람만 따로 줄일 이유가 없다. */
    var w = PLAYER.fw, h = PLAYER.fh;
    /* 글 반대쪽. 왼쪽(0.19)에 두었더니 제목·설명 줄과 버튼 상자에 그대로 파묻혔다.
     * 히어로 글은 전부 왼쪽에 붙으므로 오른쪽 트인 자리로 옮긴다. */
    var x = W * PLAYER_X;
    /* 걷는 동안 아주 살짝 위아래로 흔들린다 — 게임의 걷기 모션과 같은 리듬 */
    var bob = Math.sin(t * PLAYER.fps * Math.PI) * 1.6;
    /* 발끝이 지면 줄에 거의 맞게. 예전에는 12px 을 더 내려 지면 아래로 밀어 넣었는데,
     * 아래쪽 페이드가 GROUND-90 에서부터 덮어 와서 다리와 신발이 통째로 먹혔다
     * (화면에서는 "플레이어가 짤려" 보였다). */
    var y = GROUND - h + 4 + bob;

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, GROUND + 2, w * 0.34, 5, 0, 0, Math.PI * 2);
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

  /* 아래쪽을 페이지 배경으로 녹인다.
   * 캔버스 바닥은 논리 y=H 이므로 그 아래까지 덮어야 한다 — GROUND+60 에서 끊으면
   * 맨 밑에 하늘 그라데이션 끝색이 띠로 남는다. */
  function drawFade() {
    var fade = ctx.createLinearGradient(0, GROUND - 16, 0, GROUND + 26);
    fade.addColorStop(0, 'rgba(13,11,10,0)');
    fade.addColorStop(1, '#0d0b0a');
    ctx.fillStyle = fade;
    ctx.fillRect(0, GROUND - 16, W, H);
    ctx.fillStyle = '#0d0b0a';
    ctx.fillRect(0, GROUND + 26, W, H);
  }

  function frame(t, dt) {
    drawSky();
    LAYERS.forEach(function (l) { drawLayer(l, t * l.speed); });
    /* ★ 페이드를 **사람보다 먼저** 칠한다.
     *
     * 여태 "플레이어가 짤려 보인다"의 진짜 원인이 이 순서였다. 사람은 발끝이
     * GROUND+4 인데 페이드는 GROUND-16 에서 시작한다. 사람을 먼저 그리고 페이드를
     * 나중에 덮으면 사람의 아래 20px(신발과 정강이)이 최대 48%까지 어두워진다 —
     * 화면에서는 다리가 뭉텅 잘려 나간 것처럼 보인다. 164px 중 20px 이라 "조금
     * 어두운" 게 아니라 발이 없어진 것으로 읽힌다.
     *
     * 앞서 두 번은 페이드의 **위치**를 옮겨서 고치려 했는데(-90 -> -16), 위치를
     * 아무리 내려도 발끝보다 위에 있는 한 같은 일이 난다. 위치가 아니라 순서 문제다.
     * 땅이 페이지 색으로 녹고, 그 위에 사람이 선다 — 그게 실제 순서이기도 하다. */
    drawFade();
    drawPlayer(t);
    drawAsh(t, dt);
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
