/* ===== game/ruin-map.js — 유적 지도 · 고유 이벤트 · 암호문 ===== */
import { mixHex } from '../../engine/core/color.js';
import { TAU, angleTo, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { hashStr } from '../../engine/core/rng.js';
import { tr } from '../lang.js';
import { BIOMES, HELL_Y, SURF_BASE, WW } from '../size.js';
import { BOW_HAND, CIPHER_KIND, CIPHER_WORDS, MYSTIC, RUIN_CARD, RUIN_CIPHER, RUIN_SPEC, STORY_RUIN, T, TILE_DEF,
  idef } from '../data.js';
import { TS, ZONE_CARD } from '../world.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { Enemy, Part } from '../entity.js';
import { $, UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RuinMapPart = {

  /* ================= 유적 — 지도 · 고유 이벤트 · 암호문 ================= */

  /** 위치 지도를 편다. */
  useRuinMap(slot) {
    const p = this.player, it = p.bag[slot];
    const d = it && idef(it); if (!d || d.type !== 'map') return;
    if (!this.ruinMarks) this.ruinMarks = {};
    const r = this.world.ruins.find(q => q.id === d.ruin);
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
  _ruinSpawn(ruinId, n, spread) {
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

  fireRuinEvent(e) {
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
  useMystic(o) {
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
        p.addXp(Math.round(900 * this.scale()));
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
  ruinCipher(id) {
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
  readCipherNote(o) {
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
  ruinCodeDone(ruinId) {
    for (const o of (this.world.objects || []))
      if (o.type === 'codedoor' && o.ruin === ruinId) return !!o.opened;
    return true;          // 문이 아예 없으면 잠글 것도 없다
  },

  openCodeDoor(o) {
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
    setTimeout(() => inp.focus(), 30);
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
    inp.addEventListener('keydown', e => {
      e.stopPropagation();                     // 게임 조작키로 새지 않게
      if (e.key === 'Enter') this.tryCodeDoor();
      if (e.key === 'Escape') this.closeCodeDoor();
    });
    $('#btn-code-ok').onclick = () => this.tryCodeDoor();
    $('#btn-code-cancel').onclick = () => this.closeCodeDoor();
    el.onclick = e => { if (e.target === el) this.closeCodeDoor(); };
  },

  closeCodeDoor() {
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
    if (got !== c.ans) {
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
    const r = w.ruinAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
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

  /** 바이옴에 처음 들어섰을 때 — 그 땅이 어떤 곳인지 한 번 알린다. */
  /** 지금 화면 뒤에 깔린 원경이 무엇인가 — drawParallaxArt 의 고르는 규칙과 같다. */
  bgId(camX, camY) {
    const p = this.player, w = this.world;
    if (!p || !w) return null;
    if (camY > HELL_Y * TS - 700) return 'hell';
    const zone = w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    if (zone === 'sky' || zone === 'ruin' || zone === 'village' || zone === 'camp') return zone;
    if (camY > SURF_BASE * TS + 500) return null;
    /* ★ 땅 이름은 **플레이어가 선 자리**로 정한다. */
    return w.biomeAt(clamp(Math.floor(p.cx / TS), 0, WW - 1)).id;
  },

  /** 땅·구역의 이름표. */
  checkBiomeEntry(camX, camY) {
    if (this.time < 3) return;                 // 시작 직후엔 장 카드와 겹친다
    const id = this.bgId(camX, camY);
    if (!id) return;                           // 원경이 없는 층 — 기준이 없으니 세지 않는다
    if (id === this._bgId) return;             // 배경이 그대로면 아무 일도 없다
    const first = this._bgId === undefined;
    this._bgId = id;
    if (first) return;                         // 들어온 첫 프레임은 "바뀐 것"이 아니다
    if (!this.seenBiomes) this.seenBiomes = {};
    const z = ZONE_CARD[id];
    const b = z ? null : BIOMES.find(q => q.id === id);
    const card = z ? z.card : (b && b.card);
    if (!card) return;                         // 유적·하늘 섬·지옥은 제 카드가 따로 있다
    /* ★ 기록(seenBiomes — 탐험 목표가 읽는다)은 남기되 카드는 **들어올 때마다** 띄운다. */
    this.seenBiomes[id] = 1;
    this._cardAt = this._cardAt || {};
    if (this.time - (this._cardAt[id] || -1e9) < 90) return;
    this._cardAt[id] = this.time;
    /* 소리는 내지 않는다. */
    UI.chapterCard({ sub: z ? z.sub : b.card.sub, title: z ? z.n : b.n, line: card.line });
  },

  /** 그 땅의 공기색. */
  biomeAir(camX, camY) {
    const w = this.world;
    const tx = clamp(Math.floor((camX + this.W / 2) / TS), 0, WW - 1);
    const [i, j, k] = w.biomeMix(tx);
    const A = BIOMES[i].air, B = BIOMES[j].air;
    if (!A || !B) return null;
    const ty = (camY + this.H / 2) / TS;
    // 지표 위에서는 그대로, 지옥에 가까울수록 사라진다
    const depth = 1 - clamp((ty - SURF_BASE - 60) / (HELL_Y - SURF_BASE - 60), 0, 1);
    const a = (A.a * (1 - k) + B.a * k) * (0.4 + 0.6 * depth);
    if (a < 0.004) return null;
    /* ★ 색도 채널별로 섞는다. */
    /* k 는 0(한복판)~0.5(경계 한가운데) — 경계에서 딱 반반이라는 뜻이라 그대로 쓴다. */
    return { c: mixHex(A.c, B.c, k), a };
  },

  /** 공기색을 화면에 덮는다. */
  drawAir(c, air) {
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.globalAlpha = Math.min(0.55, air.a * 2.2);
    c.fillStyle = air.c;
    c.fillRect(0, 0, this.W, this.H);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = air.a * 0.42;
    c.fillRect(0, 0, this.W, this.H);
    c.restore();
  },

  /** 다 여문 작물에 얹는 반짝임. */
  drawRipeCrops(c, camX, camY) {
    const w = this.world;
    if (!w.crops || !w.crops.size) return;
    c.save();
    c.fillStyle = '#ffe9a8';
    for (const k of w.crops) {
      const def = TILE_DEF[w.tiles[k]];
      if (!def || !def.crop || !def.crop.ripe) continue;
      const x = k % WW, y = (k / WW) | 0;
      const sx = x * TS - camX, sy = y * TS - camY;
      if (sx < -TS || sy < -TS || sx > this.W || sy > this.H) continue;
      // 칸마다 위상을 어긋나게 — 밭 전체가 한꺼번에 깜빡이면 경고등처럼 보인다
      const ph = (this.time * 0.8 + (x * 7 + y * 13) * 0.19) % 1;
      if (ph > 0.34) continue;
      c.globalAlpha = Math.sin(ph / 0.34 * Math.PI);
      const gx = sx + 4 + ((x * 5 + y * 3) % 3) * 5;
      const gy = sy + 4 + ((x * 3 + y * 7) % 3) * 4;
      c.fillRect(gx, gy - 3, 1, 7);
      c.fillRect(gx - 3, gy, 7, 1);
      c.fillRect(gx - 1, gy - 1, 3, 3);
    }
    c.restore();
  },

  /** 지금 겨누고 있는 각도 — doAttack 이 화살을 쏘는 각도와 같은 식이다. */
  aimAngle(p) {
    const i = this.input;
    if (!i || i.wx === undefined || i.wy === undefined) return p.facing > 0 ? 0 : Math.PI;
    return angleTo(p.cx, p.cy, i.wx, i.wy);
  },

  drawHeldWeapon(c, p, sx, sy, bob, hand) {
    /* 손에 그려지는 것은 "지금 실제로 쓰는 것"이어야 한다 — 핫바에 도구·낚싯대가 있으면 그것을, 아니면 장착 무기를. */
    const hi = p.held(), hd = hi && idef(hi);
    const tool = hd && (hd.type === 'tool' || hd.type === 'rod') ? hi : null;
    const wep = tool || p.equip.weapon;
    /* hand(game.js playerHand — 시트에 적힌 이 프레임의 무기 손)가 있으면 **그 손이 곧 자루 자리**다 — 사연: docs/code-history.md#h73 */
    const piv = hand ? hand.pt : [sx + 10, sy + 20 + bob];
    this._rodHand = hand ? piv : null;
    if (wep) {
      const d = idef(wep);
      c.save();
      c.translate(piv[0], piv[1]);
      if (hd && hd.type === 'rod') {
        /* 낚싯대는 아이템 그림(릴·줄·고리까지 그려진 32칸 도안)을 그대로 들면 손 옆에서 뭉개져 무엇인지 안 읽힌다. */
        const L = this.rodLook(wep.id);
        c.scale(p.facing > 0 ? 1 : -1, 1);
        c.rotate(-0.4);
        c.lineCap = 'round';
        const line = (col, w) => {
          c.strokeStyle = col; c.lineWidth = w;
          c.beginPath(); c.moveTo(-3, 0); c.lineTo(L.len, 0); c.stroke();
        };
        line('#241c14', L.w + 1.6);                                 // 어두운 심 — 배경과 안 붙게
        line(L.c, L.w);
        c.strokeStyle = L.grip; c.lineWidth = L.w + 1.2;            // 손잡이
        c.beginPath(); c.moveTo(-3, 0); c.lineTo(4, 0); c.stroke();
        c.fillStyle = L.tip;                                        // 대 끝 — 등급 표시
        c.fillRect(L.len - 4, -L.w / 2 - 1, 4, L.w + 2);
        c.lineWidth = 1; c.lineCap = 'butt';
        c.restore();
      } else if (!tool && d.wc === 'ranged') {
        /* 활·쇠뇌·총은 겨눈 쪽을 향해야 한다. */
        c.rotate(this.aimAngle(p));
        c.translate(hand ? 3 : BOW_HAND, 0);  // 팔을 뻗은 만큼 앞으로 — 손 자리면 이미 팔 끝이라 조금만
        Art.drawItem(c, wep.id, -13, -13, 26);
        c.restore();
      } else {
        if (tool && p.swing <= 0) {
          /* 도구는 **거울로 뒤집어** 그린다 — 사연: docs/code-history.md#h74 */
          c.scale(p.facing > 0 ? 1 : -1, 1);
          c.rotate(-0.4);
        } else {
          const ang = p.swing > 0
            ? (p.swingAng + (p.swingDir > 0 ? 1 : -1) * (p.swing / 0.24 - 0.5) * 2.0)
            : (p.facing > 0 ? -0.4 : Math.PI + 0.4);
          c.rotate(ang);
        }
        // 스프라이트는 위를 향하므로 90° 돌려 자루가 손에 오게 한다 — 손 자리면 자루 끝이 손을 한 칸 지나게(12)
        c.translate(hand ? 12 : 15, 0); c.rotate(Math.PI / 2);
        Art.drawItem(c, wep.id, -13, -13, 26);
        c.restore();
      }
      // 스윙 궤적 — 무기를 실제로 휘두를 때만(도구를 들고 있으면 베는 게 아니다)
      if (!tool && p.swing > 0 && d.wc === 'melee') {
        c.globalAlpha = p.swing / 0.24 * 0.32;
        c.strokeStyle = '#fff2c8'; c.lineWidth = 4;
        c.beginPath();
        c.arc(piv[0], piv[1], p.swingReach * 0.8, p.swingAng - 0.9, p.swingAng + 0.9);
        c.stroke(); c.lineWidth = 1; c.globalAlpha = 1;
      }
    }
    /* 손을 무기 **위에** 한 번 더 — 시트의 손 칸만 잘라 다시 그리면 손가락이 자루를 감싼 것처럼 보인다. */
    if (hand && wep) {
      c.save();
      c.beginPath(); c.rect(hand.box[0], hand.box[1], hand.box[2], hand.box[3]); c.clip();
      Sprites.draw(c, hand.key, hand.fr, sx, sy, hand.flip);
      c.restore();
    }
    if (p.fish) this.drawFishLine(c, p, sx, sy, bob);
    if (p.channel) {
      c.globalAlpha = .5; c.strokeStyle = '#ffcf6a'; c.lineWidth = 3;
      c.beginPath(); c.arc(sx + 10, sy + 20, 60 + Math.sin(this.time * 20) * 8, 0, TAU); c.stroke();
      c.lineWidth = 1; c.globalAlpha = 1;
    }
  },

  /** 손그림 몹 위에 얹는 것들 — 피격 섬광 · 체력 막대 · 페이즈 전환 섬광. */
  drawEnemyOverlay(c, e, sx, sy, dy, meta, dx) {
    const w = meta ? meta.frameW : e.w;
    /* 개조된 것의 화로 — 구워 둔 시트에는 고정된 불빛만 들어 있다. */
    if (e.mech) {
      const ph = this.time * 3.4 + (e.cx % 97) * 0.31;
      const a = 0.30 + Math.sin(ph) * 0.22;
      const r = 3.4 + Math.sin(ph) * 0.9;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.max(0, a);
      const gx = sx + e.w / 2, gy = sy + e.h * 0.42;
      const gr = c.createRadialGradient(gx, gy, 0, gx, gy, r * 2.6);
      gr.addColorStop(0, '#ffb45a'); gr.addColorStop(0.45, '#d85a1e'); gr.addColorStop(1, '#d85a1e00');
      c.fillStyle = gr;
      c.beginPath(); c.arc(gx, gy, r * 2.6, 0, TAU); c.fill();
      c.restore();
    }
    if (e.flash > 0) {
      /* 피격 섬광 — 판정 박스가 아니라 **실제로 그려진 그림**을 덮는다 — 사연: docs/code-history.md#h75 */
      c.save(); c.globalAlpha = Math.min(.75, e.flash * 6); c.fillStyle = '#fff';
      c.fillRect(sx + (dx || 0), sy - dy, w, e.h + dy); c.restore();
    }
    /* 페이즈가 막 넘어간 보스를 금빛으로 덮는다. */
    if (e.phaseT > 0) {
      c.save(); c.globalAlpha = Math.min(.55, e.phaseT * 0.8); c.fillStyle = '#ffe08a';
      c.fillRect(sx, sy - dy, w, e.h + dy); c.restore();
    }
    // 바다 부유물은 다치지 않아도 늘 보인다 — 막대 길이가 곧 "몇 대 쳐야 하나"(= 등급)라서
    if ((e.hp < e.maxHp || e.def.ai === 'flotsam') && !e.boss) {
      const bw = Math.max(22, e.w);
      c.fillStyle = '#000a'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw, 4);
      c.fillStyle = '#d0564c'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw * (e.hp / e.maxHp), 4);
    }
  },

  /** 바다 부유물 — 구운 그림(obj_flotsamN, tools/mkflotsam.py)을 물결 기울기(e.tilt)만큼 기울여 그린다. */
  drawFlotsam(c, e, sx, sy) {
    const m = Sprites.meta && Sprites.meta.objects && Sprites.meta.objects.files[e.type];
    const w = m ? m.w : e.w, h = m ? m.h : e.h;
    const dx = (e.w - w) / 2, dy = h - e.h;
    c.save();
    c.translate(sx + e.w / 2, sy + e.h * 0.55);
    c.rotate(clamp(e.tilt || 0, -0.35, 0.35));
    c.translate(-(sx + e.w / 2), -(sy + e.h * 0.55));
    if (e.def.tier === 3) {
      const a = 0.25 + Math.sin(this.time * 2.6) * 0.12;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = '#6fe0ff';
      c.beginPath(); c.arc(sx + e.w / 2, sy + e.h * 0.5, 9, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    if (!(this.spritesOn && Sprites.drawObj(c, 'obj_' + e.type, sx + dx, sy - dy, w, h))) {
      c.fillStyle = e.def.c; c.fillRect(sx, sy, e.w, e.h);
    }
    c.restore();
    this.drawEnemyOverlay(c, e, sx, sy, dy, null, dx);
  },
};
mixin(G, RuinMapPart);
