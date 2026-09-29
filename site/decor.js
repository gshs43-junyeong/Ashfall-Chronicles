/* 배경 장식 — data-decor 에 적은 게임 아이템 그림(../play/assets/item/<이름>.png)을 절 양옆 여백 띠에 흩뿌린다.
   자리는 절 id 에서 뽑은 씨앗으로 정해 새로고침해도 같다. 그림이 없으면(빌드 전) 조용히 빠진다. */
(function () {
  'use strict';
  function rng(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  document.querySelectorAll('.decor[data-decor]').forEach(function (sec) {
    var names = sec.getAttribute('data-decor').split(',').filter(Boolean);
    var r = rng(sec.id || 'decor');
    var layer = document.createElement('div');
    layer.className = 'decor-layer';
    layer.setAttribute('aria-hidden', 'true');
    names.forEach(function (n, i) {
      var img = document.createElement('img');
      img.src = '../play/assets/item/' + n + '.png';
      img.alt = '';
      img.onerror = function () { img.remove(); };
      var size = 28 + Math.floor(r() * 3) * 12;                  // 28 · 40 · 52px — 원본 32px 를 정수배 가깝게
      var left = i % 2 === 0;                                      // 왼쪽 띠 · 오른쪽 띠 번갈아
      img.style.width = img.style.height = size + 'px';
      img.style.top = (4 + r() * 90).toFixed(1) + '%';
      img.style[left ? 'left' : 'right'] = (1 + r() * 4).toFixed(1) + '%';
      img.style.animationDelay = (-r() * 9).toFixed(2) + 's';
      layer.appendChild(img);
    });
    sec.insertBefore(layer, sec.firstChild);
  });
})();
