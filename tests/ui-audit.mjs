/* 다국어 UI 전수 검사 — 언어마다 창·탭·툴팁·대화·설정을 거의 다 열어 보고, 글자가
   ① 제 칸을 넘치거나(잘림·말줄임) ② 잘라 내는 조상 밖으로 삐져나가거나 ③ 다른 글과 겹치거나 ④ 화면 밖에 있는지 잰다.
   ⑥ 단추·탭 글이 두 줄로 꺾여 단추가 두꺼워졌는지 ⑦ 이름·입력 두 열 칸(.mp-form)의 입력 칸 왼쪽·오른쪽 끝이 맞는지도 본다.
   npm run check 에는 넣지 않는다(언어 여섯 × 장면 사십여 개 — 몇 분 걸린다). 번역·UI 를 크게 바꿨을 때 돌린다:
     node tests/ui-audit.mjs                 # 여섯 언어 전부
     node tests/ui-audit.mjs en de --shots   # 몇 언어만 · tests/out/ui-audit/<언어>/ 에 장면마다 스크린샷
   ★ 수치로 못 잡는 것(그림과 글이 겹침 · 어색한 줄바꿈)이 있으니 --shots 로 눈으로도 볼 것(CLAUDE.md §5). */
import fs from 'node:fs';
import path from 'node:path';
import { devices } from 'playwright';
import { serve, browser, DETERMINISM, collectErrors, boot, settleIntro, fail, ok, OUT } from './lib.mjs';

const ARGS = process.argv.slice(2);
const SHOTS = ARGS.includes('--shots');
const LANGS = ARGS.filter(a => !a.startsWith('--'));
const ALL = ['ko', 'en', 'ja', 'zh-Hans', 'de', 'es'];
const langs = LANGS.length ? LANGS : ALL;

/* ---- 페이지 안에서 재는 것 ----
   글 조각(텍스트 노드)마다 실제 글자 사각형(Range.getClientRects)을 모아 본다 — 요소 상자가 아니라 글자 자체라 여백·줄바꿈에 속지 않는다. */
const MEASURE = () => {
  const LAYERS = '#tip,.tip,#dialogue,.modal,.panel,#panels > *,#hud,#tabbar,#hotbar,#skillbar,#quest-tracker,#minimap,#chapter-card,#toasts,#bossbar,#touchpad,#title-screen,#settings-screen,.screen,body';
  const vw = innerWidth, vh = innerHeight;
  const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; };
  const name = el => { const p = []; for (let e = el; e && e !== document.body && p.length < 3; e = e.parentElement)
    p.unshift(e.id ? '#' + e.id : e.nodeName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : ''));
    return p.join('>'); };
  const texts = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.data.trim(); const el = n.parentElement;
    if (!t || !el || /^(SCRIPT|STYLE|OPTION|NOSCRIPT)$/.test(el.nodeName) || !vis(el)) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter(q => q.width > 1 && q.height > 1);
    if (!rects.length) continue;
    /* 보이는 부분만 — 잘라 내는 조상(overflow ≠ visible)마다 사각형을 깎는다. 스크롤로 가려진 글끼리의 '겹침'은 겹침이 아니다 */
    let clip = { left: 0, top: 0, right: vw, bottom: vh };
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.overflowX === 'visible' && acs.overflowY === 'visible') continue;
      const ar = a.getBoundingClientRect();
      clip = { left: Math.max(clip.left, ar.left), top: Math.max(clip.top, ar.top), right: Math.min(clip.right, ar.right), bottom: Math.min(clip.bottom, ar.bottom) };
    }
    const seenRects = rects.map(q => ({ left: Math.max(q.left, clip.left), top: Math.max(q.top, clip.top), right: Math.min(q.right, clip.right), bottom: Math.min(q.bottom, clip.bottom) }))
      .filter(q => q.right - q.left > 1 && q.bottom - q.top > 1);
    texts.push({ el, t: t.slice(0, 50), rects, seenRects, layer: el.closest(LAYERS) });
  }
  const out = [];
  const seen = new Set();
  const add = (kind, el, t, extra = '') => { const k = kind + name(el) + t; if (seen.has(k)) return; seen.add(k); out.push({ kind, at: name(el), t, extra }); };
  for (const x of texts) {
    const el = x.el, cs = getComputedStyle(el);
    // ① 제 칸 넘침 — 잘리는 칸(overflow 가 visible 아님) 또는 말줄임
    if ((cs.overflow !== 'visible' || cs.textOverflow === 'ellipsis') && el.childElementCount === 0) {
      if (el.scrollWidth > el.clientWidth + 1) add('넘침(가로)', el, x.t, `${el.scrollWidth}>${el.clientWidth}`);
      if (cs.overflowY !== 'visible' && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll' && el.scrollHeight > el.clientHeight + 2) add('넘침(세로)', el, x.t, `${el.scrollHeight}>${el.clientHeight}`);
    }
    // ② 잘라 내는 조상 밖 — 스크롤 칸 안에서 스크롤로 가려진 것은 봐준다
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.overflowX === 'visible' && acs.overflowY === 'visible') continue;
      if (/auto|scroll/.test(acs.overflowX + acs.overflowY)) break;
      const ar = a.getBoundingClientRect();
      if (x.rects.some(q => q.left < ar.left - 1 || q.right > ar.right + 1 || q.top < ar.top - 1 || q.bottom > ar.bottom + 1)) add('잘림', el, x.t, 'by ' + name(a));
      break;
    }
    // ④ 화면 밖 — 스크롤 칸 안이면 스크롤로 닿으니 칸 자체만 본다
    let sc = null;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (/auto|scroll/.test(acs.overflowX + acs.overflowY) && (a.scrollHeight > a.clientHeight + 1 || a.scrollWidth > a.clientWidth + 1)) { sc = a; break; }
    }
    // 창은 세로로만 스크롤한다 — 스크롤 칸 안에서도 글이 **옆으로** 칸 밖에 있으면 잘린 것이다(독일어 폰에서 능력치 숫자가 그랬다)
    if (sc) { const sr = sc.getBoundingClientRect(); if (x.rects.some(q => q.right > sr.right + 1 || q.left < sr.left - 1)) add('잘림(가로)', el, x.t, 'in ' + name(sc)); }
    const clipBox = el => { const r = el.getBoundingClientRect(); let q = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const acs = getComputedStyle(a);
        if (acs.overflowX === 'visible' && acs.overflowY === 'visible') continue; const ar = a.getBoundingClientRect();
        q = { left: Math.max(q.left, ar.left), top: Math.max(q.top, ar.top), right: Math.min(q.right, ar.right), bottom: Math.min(q.bottom, ar.bottom) }; }
      return q; };
    const box = sc ? [clipBox(sc)] : x.rects;   // 스크롤 칸이 바깥 스크롤 칸 안에 있으면 바깥이 깎은 만큼만
    if (box.some(q => q.right > vw + 1 || q.bottom > vh + 1 || q.left < -1 || q.top < -1)) add('화면 밖', sc || el, sc ? '(스크롤 칸)' : x.t);
  }
  // ③ 겹침 — 같은 층 안의 서로 다른 글 조각끼리, 넓이 8px² 넘게
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const A = texts[i], B = texts[j];
    if (A.layer !== B.layer || A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
    let hit = 0;
    const onScreen = r => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && document.elementFromPoint(Math.min(vw - 1, Math.max(0, (r.left + r.right) / 2)), Math.min(vh - 1, Math.max(0, (r.top + r.bottom) / 2))) !== null;
    for (const p of A.seenRects.filter(onScreen)) for (const q of B.seenRects.filter(onScreen)) {
      const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (w > 2 && h > 2 && w * h > 8) hit = 1;
    }
    if (hit) add('겹침', A.el, A.t, '↔ ' + name(B.el) + ' "' + B.t + '"');
  }
  // ⑤ 가림 — 열린 창(패널·모달·대화·멈춤) 위에 조작 단추(터치 · 탭 단추 줄)가 떠서 창을 가리면
  const wins = [...document.querySelectorAll('.panel, .modal.open .modal-box, #dialogue.open, #pause-screen.open .ps-inner, #death-screen.open .ds-inner')].filter(vis)
    .map(w => w.getBoundingClientRect()).filter(r => r.width > 40 && r.height > 40);
  for (const c of document.querySelectorAll('#touchpad .ti-btn, #touchpad .ti-stick, #touchpad .ti-alt, #touchpad .ti-fs, #tabbar .tb')) {
    if (!vis(c)) continue;
    const r = c.getBoundingClientRect();
    for (const w of wins) {
      const iw = Math.min(r.right, w.right) - Math.max(r.left, w.left), ih = Math.min(r.bottom, w.bottom) - Math.max(r.top, w.top);
      if (iw <= 4 || ih <= 4) continue;
      // 정말 위에 떠 있는가 — 겹친 곳 가운데에서 맨 위 요소가 이 단추여야 한다(타이틀 화면 밑에 깔린 탭 단추 줄은 가린 게 아니다)
      const top = document.elementFromPoint((Math.max(r.left, w.left) + Math.min(r.right, w.right)) / 2, (Math.max(r.top, w.top) + Math.min(r.bottom, w.bottom)) / 2);
      if (top && (top === c || c.contains(top))) { add('가림', c, (c.textContent || '').trim().slice(0, 20) || c.className, `${Math.round(iw)}×${Math.round(ih)}`); break; }
    }
  }
  // ⑥ 두 줄 — 한 줄짜리여야 하는 단추·탭의 글이 꺾였다(단추가 두꺼워진다).
  //   줄은 글 사각형을 세로로 겹치는 것끼리 묶어 센다(크기가 다른 글이 한 줄에 있어도 한 줄). 일부러 두 단으로 짠 단추(제목 + 작은 부제 ·
  //   구석의 단축키)는 칸 안의 블록·떠 있는 요소로 알아보고 — 글 조각 **하나가** 꺾였을 때만 센다.
  const ONE_LINE = 'button, .tb, .set-tab, .qtab, .sk-tab, .ng-mode, .mini-btn, .pt-row, .ps-guest span';
  const lineCount = rects => { const ls = [];
    for (const q of rects) { const m = (q.top + q.bottom) / 2; const l = ls.find(l => m > l.top && m < l.bottom);
      if (l) { l.top = Math.min(l.top, q.top); l.bottom = Math.max(l.bottom, q.bottom); } else ls.push({ top: q.top, bottom: q.bottom }); }
    return ls.length; };
  for (const el of document.querySelectorAll(ONE_LINE)) {
    if (!vis(el) || el.closest('.slot-card, .ng-char, .shop-row, .cr-row, .mach-slot')) continue;
    let structured = false; const all = [], nodes = [];
    for (const d of el.querySelectorAll('*')) { const cs = getComputedStyle(d);
      if (/^(block|flex|grid|list-item|table)$/.test(cs.display) || cs.position === 'absolute' || cs.position === 'fixed') { structured = true; break; } }
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.data.trim()) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const rs = [...r.getClientRects()].filter(q => q.width > 1 && q.height > 1);
      nodes.push(rs); all.push(...rs);
    }
    const lines = structured ? Math.max(0, ...nodes.map(lineCount)) : lineCount(all);
    if (lines > 1) add('두 줄', el, (el.textContent || '').trim().slice(0, 40), lines + '줄');
  }
  // ⑦ 정렬 — 두 열 칸의 입력 칸들은 왼쪽·오른쪽 끝이 같아야 한다
  for (const form of document.querySelectorAll('.mp-form')) {
    if (!vis(form)) continue;
    const ctl = [...form.querySelectorAll('input, select')].filter(vis).map(e => e.getBoundingClientRect()).filter(r => r.width > 0);
    if (ctl.length < 2) continue;
    const L = ctl.map(r => r.left), R = ctl.map(r => r.right);
    if (Math.max(...L) - Math.min(...L) > 1.5 || Math.max(...R) - Math.min(...R) > 1.5)
      add('정렬', form, '입력 칸 끝', `왼쪽 ${Math.round(Math.min(...L))}~${Math.round(Math.max(...L))} · 오른쪽 ${Math.round(Math.min(...R))}~${Math.round(Math.max(...R))}`);
  }
  // ⑦-2 조작키 두 열 — 같은 열의 단추는 왼쪽·오른쪽 끝이 같아야 한다
  const kb = [...document.querySelectorAll('#set-keys .keybtn')].filter(vis).map(e => e.getBoundingClientRect());
  if (kb.length > 2) {
    const mid = (Math.min(...kb.map(r => r.left)) + Math.max(...kb.map(r => r.right))) / 2;
    for (const col of [kb.filter(r => r.right < mid + 40), kb.filter(r => r.left > mid - 40)]) {
      if (col.length < 2) continue;
      const L = col.map(r => r.left), R = col.map(r => r.right);
      if (Math.max(...L) - Math.min(...L) > 1.5 || Math.max(...R) - Math.min(...R) > 1.5)
        add('정렬', document.querySelector('#set-keys'), '조작키 단추 열', `왼쪽 ${Math.round(Math.min(...L))}~${Math.round(Math.max(...L))}`);
    }
  }
  return out;
};

const { srv, url } = await serve();
const b = await browser();
const found = new Map();                         // 언어 → [{scene, kind, at, t, extra}]
let errsAll = 0;

async function run(lang, { q = '', device = null, title = false, play = true }, steps) {
  const ctx = device ? await b.newContext({ ...devices[device], deviceScaleFactor: 1 }) : null;
  const page = ctx ? await ctx.newPage() : await b.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(DETERMINISM(5));
  const errs = collectErrors(page);
  await boot(page, url + '/index.html?lang=' + lang + (q ? '&' + q : ''));
  const tag = (device ? device.split(' ')[0].toLowerCase() + ' ' : '') + (q.replace(/&.*/, '') || 'play');
  const dir = path.join(OUT, 'ui-audit', lang);
  if (SHOTS) fs.mkdirSync(dir, { recursive: true });
  const note = async scene => {
    await page.evaluate(() => __step(2));
    const r = await page.evaluate(MEASURE);
    const list = found.get(lang) || []; found.set(lang, list);
    for (const x of r) if (!list.some(y => y.kind === x.kind && y.at === x.at && y.t === x.t)) list.push({ scene, ...x });
    if (SHOTS) await page.screenshot({ path: path.join(dir, scene.replace(/[^\w가-힣.-]+/g, '_') + '.png') });
  };
  if (title) {
    await note('title');
    for (const [n, fn] of steps) { await page.evaluate(fn).catch(e => errs.push(n + ': ' + e.message.split('\n')[0])); await note('title ' + n); }
  } else {
    await page.evaluate(() => G.newGame('d1', 0, 'Tester', 'wanderer', 'normal', 's'));
    for (let i = 0; i < 1200; i++) { if (await page.evaluate(() => { __step(1); return G.state === 'play' && !!G.player; })) break; await page.waitForTimeout(25); }
    await settleIntro(page);
    await page.evaluate(() => { G.player.iframe = 1e9; __step(30); });
    await note(tag);
    for (const [n, fn] of steps) {
      await page.evaluate(fn).catch(e => errs.push(n + ': ' + e.message.split('\n')[0]));
      await page.evaluate(() => __step(6));
      await note(tag + ' ' + n);
    }
  }
  if (errs.length) { errsAll += errs.length; fail(`[${lang}] ${tag}: 오류 ${errs.length} — ${errs.slice(0, 3).join(' / ')}`); }
  await (ctx ? ctx.close() : page.close());
}

/* 툴팁은 칸 위에 마우스를 올린 것처럼 — 화면 가운데 근처에 띄운다 */
const TIP = ids => `(() => { const P = G.player; const out = [];
  for (const id of ${JSON.stringify(ids)}) { if (!ITEMS[id]) continue; const it = ITEMS[id].slot && ITEMS[id].slot !== 'pet' ? rollGear(id, G.rng, 3) : makeItem(id, 3); out.push(it); }
  window.__tipItems = out; })()`;
const showTipN = i => `(() => { const it = window.__tipItems[${i}]; if (it) UI.showTip(it, { clientX: 700, clientY: 260 }); })()`;
const TIP_IDS = ['sword_mythril', 'staff_abyss', 'bow_storm', 'chest_exo', 'charm_star', 'det_metal', 'jetpack', 'tank_abyss', 'potion_hp_greater',
  'food_feast', 'pet_storm_falcon', 'm_assembler', 'm_drill_x', 'seed_frostherb', 'star_heart', 'bag_abyss', 'relic_sundial', 'bomb_dig'];

for (const lang of langs) {
  // 타이틀 · 슬롯 · 새 게임 · 설정 탭 넷 · 제작진
  await run(lang, { title: true }, [
    ['slots', () => $('#btn-single').click()],
    ['newgame', () => G.showNewGameForm(1)],
    ['newgame-close', () => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); }],
    ['settings', () => $('#btn-settings-title').click()],
    ['settings-hud', () => document.querySelector('.set-tab[data-tab="hud"]').click()],
    ['settings-noti', () => document.querySelector('.set-tab[data-tab="noti"]').click()],
    ['settings-keys', () => document.querySelector('.set-tab[data-tab="keys"]').click()],
    ['settings-close', () => $('#btn-settings-close').click()],
    ['credits', () => $('#btn-credits').click()],
    ['credits-close', () => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); }],
    ['multi', () => $('#btn-multi').click()],
    ['multi-new', () => { const sel = $('#mp-char'); sel.value = 'new'; sel.onchange(); }],
  ]);
  // 새 게임 — 창·탭·툴팁·대화·멈춤·쓰러짐
  const steps = [
    ['inv', () => UI.togglePanel('inv')],
    ['tips', new Function(TIP(TIP_IDS))],
    ...TIP_IDS.map((id, i) => ['tip ' + id, new Function(showTipN(i))]),
    ['tip-hide', () => UI.hideTip()],
    ['skill-tree', () => UI.togglePanel('skill')],
    ['skill-tip', () => { const n = document.querySelector('#panel-skill [data-sk]'); if (n) UI.showSkillTip(n.dataset.sk, { clientX: 640, clientY: 300 }); }],
    ['skill-prof', () => { UI.hideTip(); document.querySelector('.sk-tab[data-sktab="prof"]').click(); }],
    ['quest-journey', () => UI.togglePanel('quest')],
    ['quest-ach', () => document.querySelector('.qtab[data-qtab="ach"]').click()],
    ['quest-ruins', () => document.querySelector('.qtab[data-qtab="ruins"]').click()],
    ['craft', () => UI.togglePanel('craft')],
    ['map', () => { UI.closePanel(); UI.openFullmap(); }],
    ['map-close', () => UI.closePanel()],
    ['talk', () => G.talkTo('elara')],
    ['talk-next', () => { for (let i = 0; i < 8 && UI.dlg && UI.dlg.i < UI.dlg.lines.length - 1; i++) UI.nextLine(); UI.nextLine(); }],
    ['talk-close', () => UI.closeDialogue()],
    ['story', () => UI.storyScene(CHAPTERS[1], 'intro')],
    ['story-close', () => UI.closeDialogue()],
    ['chapter-card', () => UI.chapterCard(CHAPTERS[2])],
    ['toasts', () => { UI.toast(tr('가방이 가득 찼다'), 'bad'); UI.toast(tr('도달했다 — {to}', { to: 'X' })); UI.toast(tr('☄ 불덩이가 하늘을 가른다 — 운석이 떨어진다!')); }],
    ['pause', () => G.setPause(true)],
    ['pause-settings', () => $('#btn-settings-pause').click()],
    ['pause-keys', () => document.querySelector('.set-tab[data-tab="keys"]').click()],
    ['pause-close', () => { $('#btn-settings-close').click(); G.setPause(false); }],
    ['death', () => { G.player.iframe = 0; G.onDeath('test'); }],
    ['respawn', () => G.respawn()],
  ];
  await run(lang, {}, steps);
  // 마을 — 상인 여럿 · 회관 · 게시판 · 금고 · 재련 · 모루
  await run(lang, { q: 'debug=village&lv=4&sess=3&plv=80&gold=900000' }, [
    ...['borin', 'mira', 'tamer', 'kade', 'oreman', 'armsman', 'pedlar'].map(n => ['shop ' + n, new Function(`UI.closePanel(); if (NPCS['${n}'] && NPCS['${n}'].shop) UI.openShop('${n}')`)]),
    ['townhall', () => { UI.closePanel(); UI.openTownhall(); }],
    ['board', () => { UI.closePanel(); UI.openBoard(); }],
    ['vault', () => { UI.closePanel(); UI.openVault(); }],
    ['reforge', () => { UI.closePanel(); G.player.addItem(rollGear('sword_mythril', G.rng, 3)); UI.openReforge(); }],
    ['anvil', () => { UI.closePanel(); UI.openAnvil(); }],
    ['inn', () => { UI.closePanel(); G.talkTo('haran'); }],
  ]);
  // 공장 — 기계 창 갈래마다
  await run(lang, { q: 'debug=factory' }, ['smelter', 'assembler', 'sorter', 'crate', 'battery', 'turret', 'drill_e', 'refinery', 'gen'].map(t =>
    ['mach ' + t, new Function(`UI.closePanel(); const m = [...G.world.machines.values()].find(m => m.t === '${t}'); if (m) UI.openMachine(m);`)]));
  // 유적 · 바다 — 맥박 · 숨 · 버프
  await run(lang, { q: 'debug=ruin&id=mine&pulse=90' }, [['pulse', () => __step(200)], ['quest', () => UI.togglePanel('quest')]]);
  await run(lang, { q: 'debug=sea&sess=3&plv=80' }, [['swim', () => __step(240)], ['buffs', () => { for (const k of Object.keys(BUFFS).slice(0, 12)) G.player.addBuff ? G.player.addBuff(k, 60) : 0; __step(2); }]]);
  // 멀티플레이 — 호스트 HUD(파티 · 채팅) · 두 열 일시정지. 참가자 하나는 가짜 통로로 붙여 줄을 채운다
  const MP_FAKE = () => { G.mpHost('ABCDE'); const n = G.net; n.room = 'ABCDE';
    const rp = G.netAvatar(1, Object.assign(G.netState(G.me), { n: 'Mina', lv: 12 }));
    n.peers.set(1, { id: 1, rp, t: { send() {}, close() {} }, ping: 42 }); n.cfg.pvp = true; };
  await run(lang, { q: 'sig=tab' }, [
    ['mp-host', MP_FAKE],
    ['mp-chat', () => { G.sendChat('Meet at the mine entrance — bring torches'); G.chatLine('Mina', 'on my way'); G.openChat(); }],
    ['mp-pause', () => { G.closeChat(); G.setPause(true); }],
  ]);
  // 폰 가로 — 터치 조작과 좁은 화면
  await run(lang, { device: 'Pixel 7 landscape', q: 'sig=tab' }, [['inv', () => UI.togglePanel('inv')], ['skill', () => UI.togglePanel('skill')], ['quest', () => UI.togglePanel('quest')],
    ['craft', () => UI.togglePanel('craft')], ['pause', () => { UI.closePanel(); G.setPause(true); }], ['settings', () => $('#btn-settings-pause').click()],
    ['mp-pause', () => { $('#btn-settings-close').click(); G.setPause(false); G.mpHost('ABCDE'); const n = G.net; n.room = 'ABCDE'; const rp = G.netAvatar(1, Object.assign(G.netState(G.me), { n: 'Mina', lv: 12 })); n.peers.set(1, { id: 1, rp, t: { send() {}, close() {} }, ping: 42 }); G.setPause(true); }]]);
  const n = (found.get(lang) || []).length;
  console.log(`${n ? '✗' : '✓'} ${lang}: ${n}건`);
}
b.close(); srv.close();

fs.mkdirSync(path.join(OUT, 'ui-audit'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'ui-audit', 'report.json'), JSON.stringify(Object.fromEntries(found), null, 1));
for (const [lang, list] of found) {
  if (!list.length) continue;
  console.log(`\n── ${lang} ──`);
  for (const x of list) console.log(`  ${x.kind.padEnd(6)} [${x.scene}] ${x.at} "${x.t}" ${x.extra}`);
}
const total = [...found.values()].reduce((s, l) => s + l.length, 0);
total ? fail(`UI 문제 ${total}건 (tests/out/ui-audit/report.json)`) : ok('UI 문제 0');
if (!errsAll) ok('콘솔 오류 0');
