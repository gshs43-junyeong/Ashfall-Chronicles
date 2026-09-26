/* 회귀 검사 공용 — 정적 서버 · 브라우저 · 결정론 주입.
   ★ 게임 코드는 건드리지 않는다. 결정론은 페이지에 **먼저** 끼우는 스크립트(initScript)로만 만든다. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GAME = process.env.GAME_DIR ? path.resolve(process.env.GAME_DIR) : path.join(ROOT, 'game');   // GAME_DIR — 다른 판의 game/ 으로 기준값을 찍을 때
export const BASE = path.join(ROOT, 'tests', 'baseline');
export const OUT = path.join(ROOT, 'tests', 'out');
export const UPDATE = process.argv.includes('--update');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/** game/ 을 비어 있는 포트로 서빙한다. */
export function serve(dir = GAME) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f = path.join(dir, u === '/' ? 'index.html' : u);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(+process.env.PORT || 0, '127.0.0.1', () => r({ srv, url: `http://127.0.0.1:${srv.address().port}` })));
}

/* Playwright 가 제 판의 브라우저를 못 찾으면(내려받기를 막은 환경) PW_CHROMIUM 이나 설치된 크로미움으로 띄운다. */
export async function browser() {
  const exe = process.env.PW_CHROMIUM || ['/opt/pw-browsers/chromium'].find(p => fs.existsSync(p));
  try { return await chromium.launch(); }
  catch (e) { if (!exe) throw e; return chromium.launch({ executablePath: exe }); }
}

/* 페이지보다 먼저 도는 결정론 장치:
   - Math.random → 씨앗 고정 난수(mulberry32)
   - requestAnimationFrame → 손으로 돌리는 프레임(__step(n), 1/60초씩)
   - performance.now · Date.now → 프레임과 같이 가는 가짜 시계
   오디오는 끈다(헤드리스에서 자동 재생 경고가 콘솔을 어지럽힌다). */
export const DETERMINISM = (seed = 1234) => `(() => {
  let s = ${seed} >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000; const t0 = 1790000000000;
  performance.now = () => now; Date.now = () => t0 + now;
  let q = [];
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n = 1) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const run = q; q = []; for (const cb of run) cb(now); } };
  window.__reseed = n => { s = n >>> 0; };   // 난수를 다시 씨앗부터 — 부팅에 걸린 프레임 수와 상관없이 같은 장면을 만들 때
  window.__deterministic = true;
  /* CSS 전이·애니메이션은 진짜 시간으로 돈다 — 첫 장에 멈춰 둔다(로딩 화면이 걷히는 0.45초에 찍히면 화면 전체가 달랐다). */
  addEventListener('DOMContentLoaded', () => { const st = document.createElement('style');
    st.textContent = '*,*::before,*::after{transition:none!important;animation-play-state:paused!important;animation-delay:0s!important}';
    document.head.appendChild(st); });
  const P = HTMLMediaElement.prototype; P.play = function () { return Promise.resolve(); };
})();`;

/** 콘솔 오류·페이지 오류를 모은다. 알려진 무해한 경고는 거른다. */
export function collectErrors(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  return errs;
}

/** 부팅(애셋 다 붙기)까지 프레임을 돌린다. */
export async function boot(page, url) {
  await page.goto(url);
  for (let i = 0; i < 600; i++) {
    const ok = await page.evaluate(() => { window.__step && window.__step(2); return typeof G !== 'undefined' && !!G.booted && !document.body.classList.contains('booting')
      && !document.querySelector('#loading').classList.contains('open'); });
    if (ok) return;
    await page.waitForTimeout(20);
  }
  throw new Error('부팅이 끝나지 않았다: ' + url);
}

/** 새 게임을 만들고 게임이 돌기 시작할 때까지 기다린다. */
export async function newGame(page, { seed = 'd1', size = 's', char = 'wanderer', mode = 'normal' } = {}) {
  await page.evaluate(([seed, size, char, mode]) => G.newGame(seed, 0, '검사', char, mode, size), [seed, size, char, mode]);
  for (let i = 0; i < 1200; i++) {
    const ok = await page.evaluate(() => { window.__step && window.__step(1); return G.state === 'play' && !!G.world && !!G.player; });
    if (ok) break;
    await page.waitForTimeout(25);
  }
  // 도입 대사·장 카드는 닫고 몇 프레임 흘려 화면을 안정시킨다
  await page.evaluate(() => { if (window.UI && UI.dlg) UI.closeDialogue(); });
}

export function writeJSON(f, v) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); }
export function readJSON(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
export function fail(msg) { console.error('✗ ' + msg); process.exitCode = 1; }
export function ok(msg) { console.log('✓ ' + msg); }
