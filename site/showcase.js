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

  var BASE = 'play/assets/';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  /* 이름과 배경 짝은 game/js/game.js 의 zone·biome 분기, world.js 의 지역표에서 가져왔다. */
  var REGIONS = [
    ['잿빛 숲',      'parallax_forest',   0],
    ['여명 마을',    'parallax_village', 90],  /* 이 그림만 건물이 아래쪽에 낮게 그려져 있어 끌어올린다 */
    ['서리 지대',    'parallax_snow',     0],
    ['메마른 사구',  'parallax_desert',   0],
    ['울림 정글',    'parallax_jungle',   0],
    ['버섯 골짜기',  'parallax_glowfen',  0],
    ['부패한 땅',    'parallax_corrupt',  0],
    ['하늘 섬',      'parallax_sky',      0],
    ['유적',         'parallax_ruin',     0],
    ['지하 공창',    'parallax_works',    0],
    ['지하 심층',    'parallax_hell',     0]
  ];

  var HOLD = 4.2;      /* 한 지역을 보여 주는 시간(초) */
  var FADE = 1.1;      /* 겹쳐 넘어가는 시간(초) */

  function initRegionBand() {
    var canvas = document.getElementById('regionBand');
    var label = document.getElementById('regionLabel');
    if (!canvas) return;

    var files = REGIONS.map(function (r) { return 'bg/' + r[1] + '.png'; });

    loadImages(files, function (imgs) {
      var H = 260, W = 1280;
      var shown = -1;

      function drawOne(ctx, idx, offset, alpha) {
        var r = REGIONS[idx];
        var img = imgs['bg/' + r[1] + '.png'];
        if (!img) return;
        var h = 400, y = H - h + 150 - r[2];
        ctx.globalAlpha = alpha;
        var x = -(offset % img.width);
        for (var px = x; px < W; px += img.width) {
          ctx.drawImage(img, Math.round(px), Math.round(y), img.width, h);
        }
        ctx.globalAlpha = 1;
      }

      makeStage(canvas, W, H, function (ctx, t) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#100c0b');
        g.addColorStop(1, '#241a18');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        var cycle = HOLD + FADE;
        var pos = t / cycle;
        var i = Math.floor(pos) % REGIONS.length;
        var next = (i + 1) % REGIONS.length;
        var into = (pos - Math.floor(pos)) * cycle;
        var mix = into <= HOLD ? 0 : (into - HOLD) / FADE;

        drawOne(ctx, i, t * 30, 1 - mix);
        if (mix > 0) drawOne(ctx, next, t * 30, mix);

        /* 좌우 끝을 배경으로 녹여 잘린 느낌을 없앤다 */
        var edge = ctx.createLinearGradient(0, 0, W, 0);
        edge.addColorStop(0, '#0d0b0a');
        edge.addColorStop(0.12, 'rgba(13,11,10,0)');
        edge.addColorStop(0.88, 'rgba(13,11,10,0)');
        edge.addColorStop(1, '#0d0b0a');
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, W, H);

        var bottom = ctx.createLinearGradient(0, H - 70, 0, H);
        bottom.addColorStop(0, 'rgba(13,11,10,0)');
        bottom.addColorStop(1, '#0d0b0a');
        ctx.fillStyle = bottom;
        ctx.fillRect(0, H - 70, W, 70);

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
      var H = 170, W = 1280;
      var MAX_H = 104;          /* 큰 몬스터도 이 높이를 넘지 않게 줄인다 */
      var GROUND = H - 26;
      var SPEED = 42;           /* 논리 px/초 */
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
        ctx.fillRect(0, 0, W, H);

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
        ctx.fillRect(0, 0, W, H);
      });
    });
  }

  initRegionBand();
  initBeastBand();
})();
