/* 홈 중간의 게임플레이 애니메이션 두 개.
 *
 * 히어로와 같은 원칙 — 영상 파일을 두지 않고 게임 애셋을 그대로 움직인다.
 *   지역 띠 : bg/parallax_*.png (1920x400, 가로 무한 반복) 를 흘리며 지역끼리 교차
 *   몬스터 행렬 : char/*.png (프레임 7개 · 간격 0) 의 move1·move2 를 번갈아 걷게 한다
 *
 * 캔버스가 셋이 되므로 화면 밖에 있을 때는 각자 멈춘다.
 */
(function () {
  'use strict';

  var BASE = '../play/assets/';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 좁은 화면에서는 논리 폭을 절반으로 잡는다. 캔버스는 폭에 맞춰 통째로 줄어들기 때문에,
   * 1280 을 그대로 쓰면 휴대폰에서 지형도 몬스터도 알아볼 수 없이 작아진다. */
  var narrow = window.matchMedia('(max-width:600px)').matches;

  /* ctx.filter 는 사파리 16.4 미만에서 통째로 없다. 있는지만 보고 갈라 쓴다. */
  var hasFilter = (function () {
    var c = document.createElement('canvas').getContext('2d');
    return !!c && 'filter' in c;
  })();

  function loadImages(files, done) {
    var out = {}, left = files.length;
    if (!left) return done(out);
    files.forEach(function (f) {
      var img = new Image();
      img.onload = img.onerror = function () {
        out[f] = img.naturalWidth ? img : null;
        if (--left === 0) done(out);
      };
      img.src = BASE + f;
    });
  }

  /* 캔버스 하나를 논리 좌표계로 관리한다. draw(ctx, t, dt) 만 넘기면 된다. */
  function makeStage(canvas, logicalW, logicalH, draw) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var scale = 1, visible = true, running = false, last = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      /* 폭만 보고 넘어가면 안 된다 — 높이가 0 인 채로 버퍼를 잡으면 그리기가 통째로
       * 사라지고, getImageData 같은 후속 호출도 터진다. */
      if (!rect.width || !rect.height) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      scale = canvas.width / logicalW;
      ctx.setTransform(scale, 0, 0, scale, 0, canvas.height - logicalH * scale);
      ctx.imageSmoothingEnabled = false;
    }

    function paint(t, dt) {
      draw(ctx, t, dt, logicalW, logicalH);
    }

    function loop(now) {
      if (!running) return;
      var t = now / 1000;
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      paint(t, dt);
      requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduced) return;
      running = true; last = 0;
      requestAnimationFrame(loop);
    }
    function stop() { running = false; }

    resize();
    paint(3, 0);   /* 첫 장은 rAF 를 기다리지 않는다 */
    canvas.classList.add('is-ready');

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { resize(); if (!running) paint(3, 0); }).observe(canvas);
    } else {
      window.addEventListener('resize', function () { resize(); if (!running) paint(3, 0); });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          visible = e.isIntersecting;
          if (visible) start(); else stop();
        });
      }, { rootMargin: '80px' }).observe(canvas);
    } else {
      start();
    }

    return { start: start, stop: stop };
  }

  /* ================= 지역 띠 ================= */
  /* 이름과 배경 짝은 game/js/game.js 의 zone·biome 분기, world.js 의 지역표에서 가져왔다.
   *
   * 세 번째 값은 그림에서 실제 지형이 시작하는 y(원본 1920x400 기준). 위쪽은 하늘 자리라
   * 투명하게 비어 있고, 그 여백이 지역마다 56px~200px 로 제각각이다. 예전에는 400px 를
   * 통째로 260px 띠에 얹었더니 아래 140px — 정작 봐야 할 땅바닥 — 이 잘려 나갔다.
   * 지금은 이 값을 기준으로 [지형 시작 - SKY .. 바닥] 만 잘라 띠 높이에 맞춰 늘린다.
   * 그래서 어느 지역이든 지형이 띠를 가득 채우고, 하늘은 딱 SKY 만큼만 남는다.
   *
   * 네·다섯 번째는 뒤에 깔 하늘색(위/아래). 이 그림들은 원경 실루엣이라 색이 아주 어두운데
   * (숲은 rgb(18,20,25) 수준), 게임에서는 밝은 하늘 위에 얹히기 때문에 형태가 보인다.
   * 사이트 배경(#0d0b0a)에 그대로 얹으면 검정 위 검정이 되어 아무것도 안 보였다.
   * 그래서 game.js 의 drawSky 처럼 지역마다 다른 하늘을 뒤에 깔아 윤곽을 살린다.
   *
   * 마지막은 밝기 배수. 원본이 워낙 제각각이라(사구는 거의 검고 하늘 섬은 거의 흰색)
   * 한 값으로 묶으면 어떤 띠는 안 보이고 어떤 띠는 화면을 태운다. 띠끼리 비슷한
   * 밝기로 읽히도록 지역마다 따로 잡았다. */
  var REGIONS = [
    ['잿빛 숲',      'parallax_forest',   76, '#262232', '#7d6553', 1.40],
    ['여명 마을',    'parallax_village', 120, '#2a2434', '#8d6d4f', 1.15],
    ['서리 지대',    'parallax_snow',    112, '#26313f', '#86a0b4', 1.10],
    ['메마른 사구',  'parallax_desert',  200, '#2f2536', '#a37a55', 1.55],
    ['울림 정글',    'parallax_jungle',   90, '#1d2a26', '#6c8560', 1.25],
    ['버섯 골짜기',  'parallax_glowfen', 150, '#1f2436', '#4f6a76', 1.20],
    ['부패한 땅',    'parallax_corrupt',  56, '#2b2032', '#6e4a63', 1.35],
    /* 하늘 섬만 그림이 흰 구름이라 거꾸로 — 뒤를 어둡게 깔고 밝기도 낮춰야 눈이 안 시리다 */
    ['하늘 섬',      'parallax_sky',       0, '#1c2740', '#47638c', 0.82],
    ['유적',         'parallax_ruin',      0, '#2a2530', '#8a7561', 1.10],
    ['지하 공창',    'parallax_works',     0, '#1e1c26', '#4e4b5c', 1.45],
    ['지하 심층',    'parallax_hell',    108, '#2a100b', '#8a3418', 1.15]
  ];

  var HOLD = 4.2;      /* 한 지역을 보여 주는 시간(초) */
  var FADE = 1.1;      /* 겹쳐 넘어가는 시간(초) */
  var SKY = 56;        /* 지형 위로 남겨 둘 하늘 여백(원본 px) */

  function initRegionBand() {
    var canvas = document.getElementById('regionBand');
    var label = document.getElementById('regionLabel');
    if (!canvas) return;

    var files = REGIONS.map(function (r) { return 'bg/' + r[1] + '.png'; });

    loadImages(files, function (imgs) {
      var H = narrow ? 280 : 320, W = narrow ? 640 : 1280;
      var shown = -1;

      /* 하늘 + 지형을 한 지역치씩 통째로 그린다. 넘어갈 때 하늘까지 같이 섞여야
       * 지역이 바뀌는 게 색으로도 읽힌다. */
      function drawOne(ctx, idx, offset, alpha) {
        var r = REGIONS[idx];
        var img = imgs['bg/' + r[1] + '.png'];
        if (!img) return;

        ctx.globalAlpha = alpha;

        /* 좁은 화면에서는 캔버스가 논리 높이보다 커진다. 위로 넉넉히 칠해 빈자리를 없앤다.
         * 그라디언트는 끝 색이 그대로 이어지므로 범위를 벗어나도 자연스럽다. */
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, r[3]);
        sky.addColorStop(1, r[4]);
        ctx.fillStyle = sky;
        ctx.fillRect(0, -H, W, H * 2);

        var top = Math.max(0, r[2] - SKY);
        var srcH = img.height - top;
        var s = H / srcH;                 /* 잘라낸 부분이 띠 높이를 꽉 채우도록 */
        var tileW = img.width * s;

        /* 실루엣 안쪽 결이 조금은 보이게 살짝 띄운다. filter 를 모르는 브라우저는
         * 그냥 원본대로 그린다 — 하늘을 깐 것만으로도 형태는 읽힌다. */
        if (hasFilter) ctx.filter = 'brightness(' + r[5] + ') saturate(1.15)';
        /* 이음매가 벌어지지 않게 한 픽셀 겹쳐 그린다 */
        var w = Math.ceil(tileW) + 1;
        for (var px = -(offset % tileW); px < W; px += tileW) {
          ctx.drawImage(img, 0, top, img.width, srcH, Math.round(px), 0, w, H);
        }
        if (hasFilter) ctx.filter = 'none';

        ctx.globalAlpha = 1;
      }

      makeStage(canvas, W, H, function (ctx, t) {
        ctx.fillStyle = '#0d0b0a';
        ctx.fillRect(0, -H, W, H * 2);

        var cycle = HOLD + FADE;
        var pos = t / cycle;
        var i = Math.floor(pos) % REGIONS.length;
        var next = (i + 1) % REGIONS.length;
        var into = (pos - Math.floor(pos)) * cycle;
        var mix = into <= HOLD ? 0 : (into - HOLD) / FADE;

        var scroll = t * (narrow ? 16 : 26);
        drawOne(ctx, i, scroll, 1 - mix);
        if (mix > 0) drawOne(ctx, next, scroll, mix);

        /* 좌우 끝만 살짝 녹여 잘린 느낌을 없앤다. 넓게 먹이면 지형이 가려지므로 얇게. */
        var edge = ctx.createLinearGradient(0, 0, W, 0);
        edge.addColorStop(0, '#0d0b0a');
        edge.addColorStop(0.055, 'rgba(13,11,10,0)');
        edge.addColorStop(0.945, 'rgba(13,11,10,0)');
        edge.addColorStop(1, '#0d0b0a');
        ctx.fillStyle = edge;
        ctx.fillRect(0, -H, W, H * 2);

        var current = mix > 0.5 ? next : i;
        if (label && current !== shown) {
          shown = current;
          label.textContent = REGIONS[current][0];
        }
      });
    });
  }

  /* ================= 몬스터 행렬 ================= */
  /* [파일, 프레임폭, 프레임높이] — assets/manifest.json 의 characters.sheets 값.
   * 프레임 7개(idle1 idle2 move1 move2 atk death1 death2)가 간격 없이 붙어 있어
   * move1 = 2번, move2 = 3번 프레임이다. */
  var SCALE = 4;
  var BEASTS = [
    ['slime',        26, 20], ['skeleton',     20, 40], ['bat',          22, 16],
    ['spider',       26, 18], ['zombie',       20, 40], ['imp',          24, 28],
    ['frostling',    26, 34], ['sporeling',    22, 22], ['scorpion',     28, 20],
    ['crawler',      24, 38], ['wraith',       26, 38], ['golem',        34, 48],
    ['sandmaw',      34, 26], ['vinelash',     24, 34], ['lavaslug',     32, 22],
    ['ashcrow',      24, 18], ['riveter',      24, 40], ['weldarm',      22, 30],
    ['scrapcrawler', 30, 22], ['gale',         26, 26], ['capbeast',     30, 24],
    ['archer',       20, 40]
  ];

  function initBeastBand() {
    var canvas = document.getElementById('beastBand');
    if (!canvas) return;

    var files = BEASTS.map(function (b) { return 'char/' + b[0] + '.png'; });

    loadImages(files, function (imgs) {
      var H = narrow ? 180 : 170, W = narrow ? 640 : 1280;
      var MAX_H = 104;          /* 큰 몬스터도 이 높이를 넘지 않게 줄인다 */
      var GROUND = H - 26;
      var SPEED = narrow ? 26 : 42;   /* 논리 px/초 */
      var GAP = 74;

      /* 걸어가는 줄을 미리 배치한다. total 만큼 흐르면 처음으로 되돌아온다. */
      var line = [], cursor = 0;
      BEASTS.forEach(function (b) {
        var img = imgs['char/' + b[0] + '.png'];
        if (!img) return;
        var ratio = Math.min(MAX_H / (b[2] * SCALE), 1);
        var w = b[1] * SCALE * ratio, h = b[2] * SCALE * ratio;
        line.push({ img: img, fw: b[1] * SCALE, fh: b[2] * SCALE, w: w, h: h, x: cursor });
        cursor += w + GAP;
      });
      var total = cursor;
      if (!line.length) return;

      makeStage(canvas, W, H, function (ctx, t) {
        ctx.fillStyle = '#0d0b0a';
        ctx.fillRect(0, -H, W, H * 2);

        /* 발밑 선 */
        ctx.fillStyle = '#241f1c';
        ctx.fillRect(0, GROUND + 7, W, 1);

        var shift = (t * SPEED) % total;
        var frame = 2 + (Math.floor(t * 7) % 2);   /* move1 ↔ move2 */

        line.forEach(function (m) {
          for (var pass = 0; pass < 2; pass++) {
            var x = m.x - shift + pass * total;
            if (x > W + 40 || x < -m.w - 40) continue;

            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(x + m.w / 2, GROUND + 7, m.w * 0.3, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            /* 걷는 리듬에 맞춰 아주 살짝 뜬다 */
            var bob = frame === 3 ? 1.5 : 0;
            ctx.drawImage(m.img, frame * m.fw, 0, m.fw, m.fh,
                          Math.round(x), Math.round(GROUND - m.h + bob),
                          Math.round(m.w), Math.round(m.h));
          }
        });

        var edge = ctx.createLinearGradient(0, 0, W, 0);
        edge.addColorStop(0, '#0d0b0a');
        edge.addColorStop(0.09, 'rgba(13,11,10,0)');
        edge.addColorStop(0.91, 'rgba(13,11,10,0)');
        edge.addColorStop(1, '#0d0b0a');
        ctx.fillStyle = edge;
        ctx.fillRect(0, -H, W, H * 2);
      });
    });
  }

  initRegionBand();
  initBeastBand();
})();
