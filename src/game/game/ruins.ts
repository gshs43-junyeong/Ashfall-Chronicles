/* ===== game/ruins.js — 유적 — 지도 · 사건 · 신비 · 암호 문 · 들어섬 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { hashStr } from '../../engine/core/rng.js';
import { tr } from '../lang.js';
import { T, TILE_DEF } from '../data.js';
import { CIPHER_KIND, CIPHER_WORDS, MYSTIC, RUIN_CARD, RUIN_CIPHER, RUIN_SPEC, STORY_RUIN } from '../data/ruins.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy, Part } from '../entity.js';
import { $, UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RuinsPart: Bag = {

  /* ================= 유적 — 지도 · 고유 이벤트 · 암호문 ================= */

  /** 위치 지도를 편다. */
  useRuinMap(slot: number) {
    const p = this.player, it = p.bag[slot];
    const d = it && idef(it); if (!d || d.type !== 'map') return;
    if (!this.ruinMarks) this.ruinMarks = {};
    const r = this.world.ruins.find((q: any) => q.id === d.ruin);
    if (!r) { this.toast(tr('여기서는 쓸 수 없다'), 'bad'); return; }
    if (this.ruinMarks[d.ruin]) { this.toast(tr('이미 자리를 안다')); return; }
    this.ruinMarks[d.ruin] = 1;
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    const spec = RUIN_SPEC.find(s => s.id === d.ruin);
    this.toast(tr('{v}의 자리를 알았다 — 나침반을 보라', { v: spec ? spec.n : tr('유적') }), 'good');
    this.sfx('chapter');
    UI.refreshBag();
  },

  /** 그 유적에만 있는 방을 밟으면 한 번 터지는 일. */
  checkRuinEvent() {
    const p = this.player, evs = this.world.ruinEvents;
    if (!evs || !evs.length) return;
    if (!this.ruinEvDone) this.ruinEvDone = {};
    for (const e of evs) {
      if (this.ruinEvDone[e.ruin]) continue;
      if (p.cx < e.x || p.cx > e.x + e.w || p.cy < e.y || p.cy > e.y + e.h) continue;
      this.ruinEvDone[e.ruin] = 1;
      this.fireRuinEvent(e);
      return;
    }
  },

  /** 유적 잡몹을 플레이어 둘레에 불러낸다 — swarm·blackout·bloom 이 같이 쓴다 */
  _ruinSpawn(ruinId: any, n: number, spread: any) {
    const spec = RUIN_SPEC.find(s => s.id === ruinId);
    const pool = (spec && spec.mobs) || ['crawler', 'skeleton'];
    const p = this.player;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.4;
      const e = new Enemy(pool[i % pool.length],
        p.cx + Math.cos(a) * spread, p.cy - 20 + Math.sin(a) * spread * 0.5);
      this.ents.push(e);
      for (let k = 0; k < 8; k++) this.parts.push(new Part(e.cx, e.cy, '#a06fff', -40, .7));
    }
  },

  fireRuinEvent(e: any) {
    const p = this.player;
    if (e.ev === 'blackout') {
      /* 불이 꺼진다 — 화면이 한동안 어두워지고 서리 것들이 몰려온다. */
      this.ruinDark = 16;
      this.shake = 10; this.sfx('chapter');
      this.toast(tr('불이 한꺼번에 꺼졌다'), 'bad');
      this._ruinSpawn(e.ruin, 5, 150);
    } else if (e.ev === 'swarm') {
      this.shake = 14; this.sfx('chapter');
      this.toast(tr('둥지가 깨어났다'), 'bad');
      this._ruinSpawn(e.ruin, 8, 170);
    } else if (e.ev === 'collapse') {
      /* 갱도가 무너진다 — 발밑 바닥이 부서지는 바닥으로 바뀌고 천장에서 돌이 떨어진다 */
      const w = this.world, ty = Math.floor((p.y + p.h + 2) / TS);
      const tx = Math.floor(p.cx / TS);
      for (let x = tx - 8; x <= tx + 8; x++)
        if (TILE_DEF[w.get(x, ty)].solid === 1) w.set(x, ty, T.CRUMBLE);
      this.shake = 18; this.sfx('chapter');
      this.toast(tr('발밑이 내려앉는다'), 'bad');
      for (let i = 0; i < 40; i++)
        this.parts.push(new Part(p.cx + (Math.random() - 0.5) * 260, p.cy - 90, '#6a5a48', 40, 1.1));
      this._ruinSpawn(e.ruin, 3, 190);
    } else if (e.ev === 'bloom') {
      /* 홀씨가 터진다 — 한동안 독에 잠기고 굴의 것들이 깨어난다 */
      this.ruinSpore = 9;                     // 이 동안 홀씨에 잠긴다 (update 가 깎으며 물린다)
      this.shake = 8; this.sfx('chapter');
      this.toast(tr('홀씨가 한꺼번에 터졌다'), 'bad');
      this._ruinSpawn(e.ruin, 5, 150);
    } else if (e.ev === 'password') {
      // 무엇을 맞춰야 하는지는 그 유적의 자물쇠 갈래를 따라간다(숫자 · 글자 · 풀어 읽기)
      const c = this.ruinCipher(e.ruin), K = c && CIPHER_KIND[c.kind];
      this.toast(K ? tr('벽 너머에 빈 곳이 있다 — {K}이다', { K: K.n }) : tr('벽 너머에 빈 곳이 있다'));
      this.sfx('open');
    }
  },

  /** 신비한 방 — 한 세계에 세 곳뿐이고, 한 번 쓰면 끝난다. */
  useMystic(o: Bag) {
    const m = MYSTIC[o.mk]; if (!m) return;
    const p = this.player;
    if (o.used) { UI.openLore(m.n, [tr('한 번 쓰고 나면 아무 일도 일어나지 않는다.')], []); this.sfx('open'); return; }
    const choices = [];
    const afford = !m.cost || p.gold >= m.cost;
    choices.push({
      t: m.ask + (afford ? '' : ` ${tr('(금화가 모자란다)')}`),
      fn: () => {
        if (!afford) { this.toast(tr('금화가 모자란다'), 'bad'); UI.closeDialogue(); return; }
        if (m.cost) p.gold -= m.cost;
        o.used = 1;
        p.addBuff(m.buff);
        if (m.heal) { p.hp = p.d.maxHp; p.mp = p.d.maxMp; }
        p.addXp(Math.round(p.xpNext * 0.3));
        for (let i = 0; i < 44; i++)
          this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#bfe8ff', -34, 1.3));
        this.shake = 8;
        this.toast(m.got, 'good');
        this.sfx('chapter');
        UI.closeDialogue(); UI.refreshBag(); UI.updateHUD();
      }
    });
    UI.openLore(m.n, m.lines, choices);
    this.sfx('open');
  },

  /** 그 유적의 자물쇠 — 갈래 · 답 · 문에 새겨진 것 · 쪽지 셋. */
  ruinCipher(id: string) {
    const kind = RUIN_CIPHER[id];
    if (!kind) return null;
    this._cipherCache = this._cipherCache || {};
    const ck = this.world.seed + ':' + id;
    if (this._cipherCache[ck]) return this._cipherCache[ck];
    const h = hashStr(ck);
    const K = CIPHER_KIND[kind];
    let ans = '', shown = '', notes = [];
    const ord = [tr('첫'), tr('둘째'), tr('셋째')];
    if (kind === 'digits') {
      ans = String(100 + (h % 900));
      notes = ord.map((o, i) =>
        [tr('{o} 홈', { o }), [tr('여기 새긴 것은 문을 여는 수의 한 자리다.'),
                     tr('나머지는 다른 방에 나누어 적었다 — 한 사람이 다 알면 안 되었으므로.'),
                     '', tr('『{o} 자리는 {ans}』', { o, ans: ans[i] })]]);
    } else if (kind === 'word') {
      ans = CIPHER_WORDS[h % CIPHER_WORDS.length];
      notes = ord.map((o, i) =>
        [tr('{o} 글자', { o }), [tr('문을 여는 것은 수가 아니라 말이다. 세 글자짜리 말.'),
                      tr('우리는 그 말을 셋으로 끊어 서로 다른 방에 두었다.'),
                      '', tr('『{o} 글자는 {ans}』', { o, ans: ans[i] })]]);
    } else {
      /* 풀어 읽기 — 문에 새긴 수를 뒤에서부터 읽고 거기에 한 자리 수를 더한다. */
      const base = 141 + (h % 850);              // 141~990
      const k = 1 + ((h >> 7) % 9);              // 1~9
      ans = String(base + k);                    // 142~999 — 반드시 세 자리
      shown = String(base).split('').reverse().join('');
      notes = [
        [tr('거짓으로 새긴 것'), [tr('문설주의 수를 곧이곧대로 넣지 마라.'),
                             tr('여기 사람들은 무엇이든 거꾸로 적는 버릇이 있었다.')]],
        [tr('읽는 법'), [tr('새긴 것을 뒤에서부터 읽어라. 마지막 자리가 첫 자리다.'),
                    tr('그러면 우리가 원래 적으려 한 수가 나온다.')]],
        [tr('마지막 한 걸음'), [tr('거꾸로 읽어 낸 수가 아직 답은 아니다.'),
                          tr('거기에 {k|을} 더해야 홈이 물린다.', { k: String(k) }),
                          tr('문지기가 하루에 한 번씩 더하던 수다.')]]
      ];
    }
    return (this._cipherCache[ck] = { id, kind, ans, shown, notes, len: K.len, numeric: K.numeric });
  },

  /** 암호 쪽지 하나를 읽는다 — 그 유적 자물쇠의 세 조각 중 하나 */
  readCipherNote(o: Bag) {
    const c = this.ruinCipher(o.ruin);
    if (!c) return;
    const nt = c.notes[o.idx] || c.notes[0];
    this.cipherSeen = this.cipherSeen || {};
    (this.cipherSeen[o.ruin] = this.cipherSeen[o.ruin] || {})[o.idx] = 1;
    const seen = Object.keys(this.cipherSeen[o.ruin]).length;
    const lines = nt[1].slice();
    lines.push('', tr('— 이 유적에서 찾은 쪽지 {seen}/3', { seen }));
    UI.openLore(nt[0], lines, []);
    this.sfx('open');
  },

  /** ★ 암호는 게임 안 창(#code-screen)으로 받는다. */
  /** 그 유적의 암호 골방 문이 열렸는가 — 골방 상자의 자물쇠가 이 값을 본다 */
  ruinCodeDone(ruinId: any) {
    for (const o of (this.world.objects || []))
      if (o.type === 'codedoor' && o.ruin === ruinId) return !!o.opened;
    return true;          // 문이 아예 없으면 잠글 것도 없다
  },

  openCodeDoor(o: any) {
    if (o.opened) { this.toast(tr('이미 열려 있다')); return; }
    const el = $('#code-screen'), inp = $('#code-input'), msg = $('#code-msg');
    const c = this.ruinCipher(o.ruin);
    const K = c ? CIPHER_KIND[c.kind] : null;
    inp.value = ''; msg.textContent = ''; msg.classList.remove('ok');
    /* 자물쇠 갈래마다 문에 적힌 것이 다르다 — 숫자 홈인지 글자 홈인지, 문설주에 새겨진 수가 있는지. */
    $('#code-title').textContent = K ? K.n : tr('돌판의 홈');
    $('#code-door').textContent = K ? K.door : tr('홈이 셋.');
    const seen = ((this.cipherSeen || {})[o.ruin]) || {};
    $('#code-hint').textContent =
      tr('유적 안에 흩어진 쪽지 셋이 답을 나눠 들고 있다 (찾은 것 {keysCount}/3)', { keysCount: Object.keys(seen).length });
    const carved = $('#code-carved');
    if (c && c.shown) { carved.hidden = false; carved.textContent = tr('문설주에 새긴 것 — {shown}', { shown: c.shown }); }
    else carved.hidden = true;
    inp.maxLength = c ? c.len : 3;
    inp.placeholder = c && !c.numeric ? '○○○' : '000';
    inp.setAttribute('inputmode', c && !c.numeric ? 'text' : 'numeric');
    this.codeDoor = o;
    this.openModal('#code-screen');
    this.scenes.open('ui');
    setTimeout(() => { if (this.codeDoor === o) inp.focus(); }, 30);   // ★ 그새 닫혔으면 포커스를 가져가지 않는다(Esc·조작키를 먹었다)
    this.sfx('open');
    if (el.dataset.bound) return;              // 배선은 한 번만
    el.dataset.bound = '1';
    /* 받는 글자는 자물쇠에 따라 다르다 — 숫자 자물쇠는 숫자만, 글자 자물쇠는 글자만. */
    inp.addEventListener('input', () => {
      const cc = this.codeDoor ? this.ruinCipher(this.codeDoor.ruin) : null;
      const numeric = !cc || cc.numeric;
      const len = cc ? cc.len : 3;
      if (numeric) inp.value = inp.value.replace(/\D/g, '');
      else inp.value = inp.value.replace(/[\s0-9]/g, '');
      inp.value = inp.value.slice(0, len);
      if (inp.value.length === len && numeric) this.tryCodeDoor();
    });
    inp.addEventListener('keydown', (e: any) => {
      e.stopPropagation();                     // 게임 조작키로 새지 않게
      if (e.key === 'Enter') this.tryCodeDoor();
      if (e.key === 'Escape') this.closeCodeDoor();
    });
    $('#btn-code-ok').onclick = () => this.tryCodeDoor();
    $('#btn-code-cancel').onclick = () => this.closeCodeDoor();
    el.onclick = (e: any) => { if (e.target === el) this.closeCodeDoor(); };
  },

  closeCodeDoor() {
    $('#code-input').blur();
    this.closeModal('#code-screen');
    this.codeDoor = null;
    this.scenes.close('ui');
  },

  /** 넣은 것을 맞춰 본다 — 자물쇠 갈래와 상관없이 여기 한 군데서 본다 */
  tryCodeDoor() {
    const o = this.codeDoor; if (!o) return;
    const w = this.world, inp = $('#code-input'), msg = $('#code-msg');
    const c = this.ruinCipher(o.ruin);
    const K = c ? CIPHER_KIND[c.kind] : null;
    const got = inp.value.replace(/\s/g, '');
    if (!c) { msg.textContent = tr('이 문은 여기서 열 수 없다'); return; }
    if (got.length < c.len) {
      msg.classList.remove('ok');
      msg.textContent = tr('{ask|을} 다 넣어야 한다', { ask: K.ask });
      return;
    }
    if (got.toLowerCase() !== c.ans.toLowerCase()) {   // 라틴 글자 답(ASH)은 대소문자를 가리지 않는다
      msg.classList.remove('ok');
      msg.textContent = tr('맞지 않는다 — 홈이 그대로다');
      inp.value = ''; inp.focus();
      this.sfx('mine');
      return;
    }
    msg.classList.add('ok');
    msg.textContent = tr('맞물리는 소리가 났다');
    o.opened = true;
    if (w.openVaultAt) w.openVaultAt(o.dx, o.dy);   // 다시 봉하지 않게 표시
    w.openCodeDoorway(o.dx, o.dy);                  // 껍질 두 겹을 다 뚫는다 (world.js 의 ★)
    for (let i = 0; i < 30; i++)
      this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#ffe08a', -30, 1.1));
    this.shake = 10;
    this.toast(tr('맞물리는 소리가 났다'), 'good');
    this.sfx('chapter');
    setTimeout(() => this.closeCodeDoor(), 700);
  },

  /** 유적에 처음 발을 들였을 때 — 그 유적만의 카드를 한 번 띄운다. */
  checkRuinEntry() {
    const p = this.player, w = this.world;
    const r = w.ruinInside(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    if (!r || !r.id) return;
    if (!this.seenRuins) this.seenRuins = {};
    this.seenRuins[r.id] = 1;                  // 기록은 늘 남긴다(탐험 목표·지도가 읽는다)
    // 카드는 들어올 때마다.
    this._cardAt = this._cardAt || {};
    const key = 'ruin:' + r.id;
    if (this.time - (this._cardAt[key] || -1e9) < 90) return;
    this._cardAt[key] = this.time;
    const card = RUIN_CARD[r.id];
    const spec = RUIN_SPEC.find(s => s.id === r.id);
    // 석판 유적 셋은 RUIN_SPEC 에 없다 — STORY_RUIN 에서 이름을 가져온다
    const st = /^story(\d)$/.exec(r.id);
    const name = spec ? spec.n
      : (st && STORY_RUIN[+st[1]] && STORY_RUIN[+st[1]].n) || tr('이름 없는 유적');
    if (card) UI.chapterCard({ sub: card.sub, title: name, line: card.line });
    this.sfx('chapter');
  },
};

mixin(Game.prototype, RuinsPart, true);
