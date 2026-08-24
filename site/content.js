/* 홈 화면의 챕터·보스 목록.
 * 값은 game/js/data.js 의 CHAPTERS 와 보스 정의에서 그대로 가져온 것이다.
 * 게임 데이터가 바뀌면 여기도 같이 고쳐야 한다. */
(function () {
  'use strict';

  var ART = 'play/assets/';

  /* 여기까지만 보여 주고 나머지는 ??? 로 가린다. 뒤 이야기는 직접 만나는 게 낫다.
   * 챕터는 서 장부터 제 4 장까지, 보스는 서리 마녀까지. */
  var REVEAL_CHAPTERS = 5;
  var REVEAL_BOSSES = 4;
  var MASK = '???';

  /* [id, 장 표기, 제목, 한 줄, 배경 파일] */
  var CHAPTERS = [
    [0,  '서 장',            '떨어진 별',              '별이 부서진 밤',                        'chapter_0_fallen_star'],
    [1,  '제 1 장',          '잿빛 야영지',            '혼자이지 않기를 꿈꾼 것',               'chapter_1_ash_village'],
    [2,  '제 2 장',          '뼈가 쌓인 곳',           '잠든 것들의 꿈을 대신 꾼 조각',         'chapter_2_bone_pit'],
    [3,  '제 3 장',          '부패한 숲',              '굶주림을 꿈꾼 것',                      'chapter_3_corrupt_forest'],
    [4,  '제 4 장',          '서리 왕좌',              '조각을 재우지 않은 사람',               'chapter_4_frost_throne'],
    [5,  '제 5 장',          '별이 잠든 땅',           '꿈꿀 필요가 없었던 조각',               'chapter_5_sleeping_star'],
    [6,  '제 6 장',          '구름 위의 계단',         '이 일은 처음이 아니었다',               'chapter_6_sky_stair'],
    [7,  '제 7 장',          '최초의 유적',            '우리보다 잘 하라',                      'chapter_7_first_ruin'],
    [8,  '종 장',            '별을 쫓아온 것',         '이번에는 넘기지 않는다',                'chapter_8_pursuer'],
    [9,  '세션 2 · 서 장',   '아무도 세우지 않은 도시', '손자국이 하나도 없다',                 'chapter_9_nobody_built'],
    [10, '세션 2 · 제 1 장', '지하 공창',              '멈추라고 가르친 사람이 없었다',         'chapter_10_underworks'],
    [11, '세션 2 · 제 2 장', '굴뚝이 선 마을',         '하루아침에 늘어난 것',                  'chapter_11_chimneys'],
    [12, '세션 2 · 제 3 장', '폭주로',                 '결재자 없음 — 자동 승인',               'chapter_12_runaway'],
    [13, '세션 2 · 제 4 장', '헤파',                   '멈추면 아무도 남지 않는다',             'chapter_13_hepha'],
    [14, '세션 2 · 종 장',   '벽 너머',                '남기고 간 것이 아니라, 남아 있던 것',   'chapter_14_beyond_wall']
  ];

  /* [파일, 이름, 등장하는 장, 체력, 프레임폭, 프레임높이]
   *
   * 보스 PNG는 6~7프레임짜리 가로 스프라이트 시트다. 프레임 사이 여백이 보스마다
   * 다르고(king_slime 4px, hepha 0px) 계산으로 맞추면 어긋나므로, 항상 x=0 에 있는
   * 첫 프레임만 잘라 쓴다. 폭·높이는 assets/manifest.json 의 값에 scale 4 를 곱한 것. */
  var BOSS_SCALE = 4;
  var BOSSES = [
    ['king_slime',    '슬라임 왕',        '제 1 장',          900, 82,  62],
    ['bone_lord',     '뼈의 군주',        '제 2 장',         2000, 56,  74],
    ['corrupt_heart', '부패의 심장',      '제 3 장',         3600, 62,  62],
    ['frost_witch',   '서리 마녀 실비아', '제 4 장',         5600, 34,  56],
    ['void_king',     '공허의 왕',        '제 5 장',        12000, 74,  92],
    ['storm_warden',  '폭풍의 수호자',    '제 6 장',        13000, 66,  70],
    ['first_keeper',  '최초의 파수꾼',    '제 7 장',        20000, 70,  88],
    ['pursuer',       '별을 쫓아온 것',   '종 장',          42000, 96, 104],
    ['overseer',      '공창의 관리자',    '세션 2 · 1 장',  30000, 74,  92],
    ['proliferator',  '증식체',           '세션 2 · 3 장',  46000, 72,  66],
    ['hepha',         '헤파',             '세션 2 · 4 장',  72000, 88, 110],
    ['archetype',     '원형',             '세션 2 · 종 장', 105000, 96, 116]
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---- 챕터 ---- */
  var chapterGrid = document.getElementById('chapterGrid');
  if (chapterGrid) {
    CHAPTERS.forEach(function (c, i) {
      var locked = i >= REVEAL_CHAPTERS;
      var card = el('article', 'ch reveal' + (locked ? ' ch--locked' : ''));

      var art = el('div', 'ch-art');
      /* 잠긴 장도 그림은 깔되 CSS 로 흐린다. 분위기는 남고 내용은 안 읽힌다. */
      art.style.backgroundImage = "url('" + ART + "bg/" + c[4] + ".png')";

      var body = el('div', 'ch-body');
      body.append(
        el('span', 'ch-sub', c[1]),                       /* 몇 장인지는 가리지 않는다 */
        el('h3', 'ch-title', locked ? MASK : c[2]),
        el('p', 'ch-line', locked ? '직접 도착해서 확인하세요' : c[3])
      );

      card.append(art, body);
      chapterGrid.appendChild(card);
    });
  }

  /* ---- 보스 ---- */
  var BOX_H = 78;   /* 카드 안 그림 높이(px). 원본 비율을 지키며 이 높이에 맞춘다. */

  function drawFirstFrame(canvas, file, fw, fh, silhouette) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var ratio = Math.min(BOX_H / (fh * BOSS_SCALE), 1);
    var w = Math.round(fw * BOSS_SCALE * ratio);
    var h = Math.round(fh * BOSS_SCALE * ratio);

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, fw * BOSS_SCALE, fh * BOSS_SCALE,
                    0, 0, canvas.width, canvas.height);

      /* 아직 만나지 않은 보스는 형체만 남긴다. source-atop 이라 이미 그린 픽셀
       * 위에만 칠해지고 투명한 배경은 건드리지 않는다 — 윤곽이 그대로 남는다. */
      if (silhouette) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#3a322d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
    };
    img.src = ART + 'boss/' + file + '.png';
  }

  var bossGrid = document.getElementById('bossGrid');
  if (bossGrid) {
    BOSSES.forEach(function (b, i) {
      var locked = i >= REVEAL_BOSSES;
      var card = el('article', 'boss reveal' + (locked ? ' boss--locked' : ''));

      var art = el('div', 'boss-art');
      var canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', locked ? '아직 만나지 않은 보스' : b[1]);
      art.appendChild(canvas);
      drawFirstFrame(canvas, b[0], b[4], b[5], locked);

      /* 체력은 가리지 않는다 — 이름 없이 숫자만 커지는 게 오히려 예고가 된다. */
      var meta = el('span', 'boss-ch',
        (locked ? MASK : b[2]) + ' · ' + b[3].toLocaleString('ko-KR') + ' HP');

      card.append(art, el('h3', 'boss-name', locked ? MASK : b[1]), meta);
      bossGrid.appendChild(card);
    });
  }
})();
