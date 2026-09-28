/* 사이트 번역 — 게임과 같은 규칙으로 언어를 고른다: ?lang= → 설정(localStorage ashfall.lang, 게임과 같은 열쇠) → 브라우저 언어 → ko.
 * 원문(한국어)이 곧 열쇠다. 번역 묶음 site/i18n/<언어>.js 는 tools/site-i18n.mjs build 산출물(손으로 고치지 말 것).
 *
 * 무엇을 옮기나(apply): 한글이 든 **글 덩어리** — 자식이 전부 글 태그(strong · a · kbd · br …)뿐인 가장 바깥 요소 — 의 innerHTML 을
 * 공백을 접은 그대로 열쇠로 삼는다. 그래서 HTML 에 표시를 달 필요가 없고, 추출(tools/site-i18n.mjs extract)도 같은 함수로 모은다.
 * ★ 스크립트가 붙잡는 요소(id)가 덩어리 안에 있으면 번역에서도 그 태그 · id 를 지킬 것 — 번역이 innerHTML 을 통째로 바꾼다.
 * 스크립트가 만드는 글은 SiteI18n.t('원문') 으로 감싼다. */
(function () {
  'use strict';
  var LANGS = ['ko', 'en', 'ja', 'zh-Hans', 'de', 'es'];
  var NAMES = { ko: '한국어', en: 'English', ja: '日本語', 'zh-Hans': '简体中文', de: 'Deutsch', es: 'Español' };
  var KEY = 'ashfall.lang';

  function pick(s) {
    if (!s) return '';
    if (LANGS.indexOf(s) >= 0) return s;
    var b = String(s).toLowerCase();
    if (b.indexOf('zh') === 0) return 'zh-Hans';
    b = b.split('-')[0];
    return LANGS.indexOf(b) >= 0 ? b : '';
  }
  var q = null, st = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { }
  try { st = localStorage.getItem(KEY); } catch (e) { }
  var nav = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  var lang = pick(q) || pick(st), i;
  for (i = 0; !lang && i < nav.length; i++) lang = pick(nav[i]);
  lang = lang || 'ko';
  if (pick(q)) { try { localStorage.setItem(KEY, lang); } catch (e) { } }   // 주소로 고른 언어는 게임까지 이어지게 적어 둔다
  document.documentElement.lang = lang;

  /* 제 script 태그의 경로 · 판 번호를 물려받아 번역 묶음을 싣는다(번들보다 먼저 — 읽히는 순간에만 currentScript 가 있다) */
  var me = document.currentScript, src = me ? me.src : '';
  var base = src.replace(/i18n\.js(\?.*)?$/, ''), ver = src.split('?')[1] || '';
  if (lang !== 'ko') document.write('<script src="' + base + 'i18n/' + lang + '.js' + (ver ? '?' + ver : '') + '"><\/script>');

  var HANGUL = /[가-힣]/;
  var PHRASING = { A: 1, B: 1, STRONG: 1, EM: 1, I: 1, KBD: 1, CODE: 1, BR: 1, SPAN: 1, SMALL: 1, SUP: 1, SUB: 1, MARK: 1, ABBR: 1 };
  var seen = {};
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function dict() { return window.SITE_L10N || {}; }
  function t(s) { s = norm(s); seen[s] = 1; var d = dict()[s]; return lang === 'ko' || d === undefined ? s : d; }

  /* 글 덩어리 — 한글이 들었고 자식이 전부 글 태그뿐인 가장 바깥 요소 */
  /* data-nt = 옮기지 않는 칸(배포 때 바뀌는 판 번호 따위) — 그것을 품은 요소는 덩어리가 못 된다 */
  function isUnit(el) {
    if (!HANGUL.test(el.textContent)) return false;
    var all = el.getElementsByTagName('*');
    for (var k = 0; k < all.length; k++) if (!PHRASING[all[k].tagName] || all[k].hasAttribute('data-nt')) return false;
    return true;
  }
  /** 덩어리 요소들과, 덩어리가 못 된 요소 안에 맨몸으로 선 한글 글(텍스트 노드 — <pre> 옆 설명 따위) */
  function units(root) {
    var out = [];
    (function walk(el) {
      for (var c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { if (HANGUL.test(c.nodeValue)) out.push(c); continue; }
        if (c.nodeType !== 1 || c.hasAttribute('data-nt')) continue;
        var tag = c.tagName.toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG') continue;
        if (isUnit(c)) out.push(c); else walk(c);
      }
    })(root);
    return out;
  }
  var ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
  var METAS = 'meta[name="description"],meta[property="og:title"],meta[property="og:description"]';

  /** 페이지 글을 고른 언어로 — 원본(ko)이면 아무것도 안 바꾸고 열쇠만 모은다 */
  function apply() {
    document.title = t(document.title);
    document.querySelectorAll(METAS).forEach(function (m) { m.setAttribute('content', t(m.getAttribute('content'))); });
    units(document.body).forEach(function (el) {
      if (el.nodeType === 3) {                                   // 맨몸 글 — 앞뒤 공백은 두고 가운데만
        var raw = el.nodeValue, k0 = norm(raw), v0 = t(k0);
        if (v0 !== k0) el.nodeValue = raw.replace(raw.trim(), v0);
        return;
      }
      var k = norm(el.innerHTML), v = t(k);
      if (v !== k) el.innerHTML = v;
    });
    document.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach(function (el) {
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && HANGUL.test(v)) el.setAttribute(a, t(v)); });
    });
    mountPicker();
  }

  /* 언어 고르기 — 나브 오른쪽. 고르면 게임과 같은 열쇠에 적고 다시 연다 */
  function mountPicker() {
    var host = document.querySelector('.nav-inner');
    if (!host || host.querySelector('.lang-pick')) return;
    var sel = document.createElement('select');
    sel.className = 'lang-pick'; sel.setAttribute('aria-label', 'Language');
    LANGS.forEach(function (l) { var o = document.createElement('option'); o.value = l; o.textContent = NAMES[l]; if (l === lang) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', function () {
      try { localStorage.setItem(KEY, sel.value); } catch (e) { }
      var u = new URL(location.href); u.searchParams.set('lang', sel.value); location.href = u.toString();
    });
    host.appendChild(sel);
  }

  window.SiteI18n = { lang: lang, langs: LANGS, t: t, apply: apply, units: units, norm: norm, seen: seen,
    /** 이 언어의 숫자 모양(보스 체력 등) */
    num: function (n) { return n.toLocaleString(lang === 'zh-Hans' ? 'zh-CN' : lang); } };
})();
