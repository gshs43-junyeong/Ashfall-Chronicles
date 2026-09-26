/* ===== ui/tree.js — 특성 트리 · 생활 숙련 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { eulreul } from '../../engine/i18n/ko.js';
import { tr } from '../lang.js';
import { BRANCHES, PROFS, PROF_MAX, SKILLS, TIER_REQ, profNeed } from '../data.js';
import { Art } from '../itemart.js';
import { $, $$, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const TreeUIPart = {

  /* ---------------- 특성 트리 ---------------- */
  /* ★ 세 갈래를 **한 판**에 그린다 — 사연: docs/code-history.md#h90 */
  TREE_TOP: 14, TREE_ROW: 89, TREE_BOX: 44,
  TREE_COLS: 9,                                   // 갈래 셋 × 가로 세 칸
  _brIdx(br) { return BRANCHES.findIndex(b => b.id === br); },
  /** 가로 자리 — 갈래 순서를 앞에 얹어 아홉 칸 중 하나로 편다 */
  _nodeX(id) {
    const sk = SKILLS[id];
    return ((this._brIdx(sk.br) * 3 + sk.col + 0.5) / this.TREE_COLS * 100) + '%';
  },
  _nodeY(id) { return this.TREE_TOP + SKILLS[id].tier * this.TREE_ROW; },

  buildTree() {
    const w = $('#tree-wrap'); if (!w) return;
    w.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';

    // ① 갈래 머리글 — 아홉 칸 중 제 셋 위에 걸린다
    const head = document.createElement('div');
    head.className = 'bheads';
    for (const br of BRANCHES)
      head.innerHTML += `<div class="bhead" style="--bc:${br.c}">` +
        `<h3>${br.n}</h3><div class="btag">${br.tag}</div></div>`;
    w.appendChild(head);
    /* 규칙을 한 줄로 적어 둔다. */
    const note = document.createElement('div');
    note.className = 'bnote';
    note.innerHTML = `${tr('점선은 <b>갈래를 건너는 길</b> — 이어진 칸을 하나라도 배우면 열립니다.')} ` +
      tr('단을 여는 점수는 다른 갈래에 찍은 것도 <b>절반</b>이 쌓입니다.');
    w.appendChild(note);

    const grid = document.createElement('div');
    grid.className = 'bgrid';
    const rows = 1 + Math.max(...Object.values(SKILLS).map(s => s.tier));
    grid.style.height = (this.TREE_TOP + (rows - 1) * this.TREE_ROW + this.TREE_BOX + 36) + 'px';

    // ② 잇는 선 — 칸보다 먼저 넣어야 뒤로 깔린다.
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'blines');
    for (const id in SKILLS) for (const rq of (SKILLS[id].req || [])) {
      const cross = SKILLS[rq].br !== SKILLS[id].br;
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', this._nodeX(rq)); ln.setAttribute('y1', this._nodeY(rq) + this.TREE_BOX / 2);
      ln.setAttribute('x2', this._nodeX(id)); ln.setAttribute('y2', this._nodeY(id) + this.TREE_BOX / 2);
      ln.setAttribute('class', 'bline' + (cross ? ' cross' : ''));
      /* 선 색은 **도착하는 칸**의 갈래를 쓴다. */
      ln.style.setProperty('--bc', BRANCHES[this._brIdx(SKILLS[id].br)].c);
      ln.dataset.from = rq; ln.dataset.to = id;
      svg.appendChild(ln);
    }
    grid.appendChild(svg);

    // ③ 칸
    for (const id in SKILLS) {
      const sk = SKILLS[id];
      const n = document.createElement('div');
      n.className = 'node'; n.dataset.sk = id; n.dataset.br = sk.br;
      n.style.setProperty('--bc', BRANCHES[this._brIdx(sk.br)].c);
      n.style.left = this._nodeX(id);
      n.style.top = this._nodeY(id) + 'px';
      n.innerHTML = `<div class="nbox"><span class="nic"></span><span class="nlock">🔒</span></div>` +
        `<div class="nname">${sk.n}</div><div class="nrank"></div>`;
      this.setIcon(n.querySelector('.nic'), Art.skillUrl(id));
      n.addEventListener('click', () => this.learn(id));
      n.addEventListener('contextmenu', e => { e.preventDefault(); this.assign(id); });
      n.addEventListener('mouseenter', e => this.showSkillTip(id, e));
      n.addEventListener('mousemove', e => this.placeTip(e.clientX, e.clientY));
      n.addEventListener('mouseleave', () => this.hideTip());
      grid.appendChild(n);
    }
    w.appendChild(grid);
    this.bindSkillTabs();
  },

  /** 팝업 위쪽 두 갈래 — 특성 트리 / 생활 숙련 */
  bindSkillTabs() {
    const box = $('#panel-skill'); if (!box || box.dataset.tabBound) return;
    box.dataset.tabBound = '1';
    $$('#panel-skill .sk-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setSkillTab(btn.dataset.sktab));
    });
  },
  setSkillTab(id) {
    $$('#panel-skill .sk-tab').forEach(b => b.classList.toggle('on', b.dataset.sktab === id));
    $$('#panel-skill .sk-pane').forEach(p => p.classList.toggle('on', p.id === 'sk-pane-' + id));
    this.skillTab = id;
    if (id === 'prof') this.refreshProf();
  },

  /** 이 분기가 단을 여는 데 쓸 수 있는 점수 — 사연: docs/code-history.md#h91 */
  BR_CROSS: 0.5,
  branchPts(brId) {
    const p = G.player;
    let own = 0, other = 0;
    for (const br of BRANCHES) for (const id of br.nodes)
      (br.id === brId ? (n => own += n) : (n => other += n))(p.skills[id] || 0);
    return own + Math.floor(other * this.BR_CROSS);
  },
  /** 이어진 윗칸 중 하나라도 배웠는가. */
  reqMet(id) {
    const req = SKILLS[id].req;
    if (!req || !req.length) return true;
    const p = G.player;
    return req.some(r => (p.skills[r] || 0) > 0);
  },
  /** 이 칸이 왜 잠겨 있는지 — 잠겨 있지 않으면 빈 문자열 */
  lockReason(id) {
    const sk = SKILLS[id];
    const need = TIER_REQ[sk.tier], have = this.branchPts(sk.br);
    /* 모자란 까닭을 **내역까지** 적는다. */
    if (have < need) {
      let own = 0;
      for (const br of BRANCHES) if (br.id === sk.br)
        for (const q of br.nodes) own += G.player.skills[q] || 0;
      const lend = have - own;
      return tr('이 갈래에 {need}점 필요 (지금 {have}', { need, have }) +
        (lend > 0 ? ` ${tr('= 제 갈래 {own} + 다른 갈래 {lend}', { own, lend })}` : '') + ')';
    }
    if (!this.reqMet(id)) { const nm = sk.req.map(r => SKILLS[r].n).join(` ${tr('또는')} `); return `${tr('윗단계')} ` + eulreul(nm) + ` ${tr('먼저')}`; }
    return '';
  },
  skDesc(id, rank) {
    const sk = SKILLS[id];
    const r = Math.max(1, rank);
    let txt = sk.d;
    if (sk.v) txt = txt.replace(/%d/g, sk.v(r));
    else if (sk.b) { const b = sk.b(r); const vals = Object.values(b); let i = 0; txt = txt.replace(/%d/g, () => vals[i++] ?? 0); }
    return txt.replace(/%%/g, '%');
  },
  /** 칸 위에 올렸을 때의 설명. */
  showSkillTip(id, e) {
    const p = G.player, sk = SKILLS[id], rank = p.skills[id] || 0;
    const why = this.lockReason(id);
    const kind = sk.type === 'active' ? tr('액티브') : tr('패시브');
    let h = `<div class="tname c${rank > 0 ? 3 : 0}">${sk.n}</div>`;
    h += `<div class="tmeta">${tr('{kind} · {rank}/{max} 랭크', { kind, rank, max: sk.max })}` +
      (sk.type === 'active' ? ` ${tr('· 마나 {mana} · 재사용 {cd}초', { mana: sk.mana, cd: sk.cd })}` : '') + `</div>`;
    h += `<div class="tdesc">${this.skDesc(id, rank)}</div>`;
    if (rank > 0 && rank < sk.max)
      h += `<div class="tnext">${tr('다음 랭크 — {skDesc}', { skDesc: this.skDesc(id, rank + 1) })}</div>`;
    if (why) h += `<div class="tbad">${why}</div>`;
    else if (rank >= sk.max) h += `<div class="tdim">${tr('최대 랭크')}</div>`;
    else if (p.skillPts <= 0) h += `<div class="tbad">${tr('특성 포인트가 없다')}</div>`;
    else h += `<div class="tgood">${tr('좌클릭으로 습득{v}', { v: sk.type === 'active' ? ` ${tr('· 우클릭으로 슬롯 등록')}` : '' })}</div>`;
    this.tip.show(h, e.clientX, e.clientY);
    this.tipTarget = true;
  },

  refreshTree() {
    const p = G.player;
    /* 잠긴 칸은 열린 칸과 선으로 바로 이어진 것만 보인다 — 트리 전체를 처음부터 펼치면
       갈 길보다 못 갈 길이 더 많이 보인다. 열린 칸 = 배웠거나 지금 배울 수 있는 칸. */
    const open = {};
    for (const id in SKILLS) open[id] = (p.skills[id] || 0) > 0 || !this.lockReason(id);
    const seen = { ...open };
    for (const id in SKILLS) for (const r of (SKILLS[id].req || []))
      if (open[r] || open[id]) seen[id] = seen[r] = true;
    $$('#tree-wrap .node').forEach(el => {
      const id = el.dataset.sk, sk = SKILLS[id], rank = p.skills[id] || 0;
      const locked = !!this.lockReason(id);
      const can = !locked && rank < sk.max && p.skillPts > 0;
      el.className = 'node' + (rank > 0 ? ' learned' : '') + (rank >= sk.max ? ' maxed' : '') +
        (locked ? ' locked' : '') + (can ? ' can' : '') + (p.slots.includes(id) ? ' active' : '') +
        (seen[id] ? '' : ' unseen');
      el.querySelector('.nrank').textContent = `${rank}/${sk.max}`;
    });
    // 선 — 윗칸을 배운 순간부터 길이 열린 것으로 본다
    $$('#tree-wrap .bline').forEach(ln => {
      const a = (p.skills[ln.dataset.from] || 0) > 0, b = (p.skills[ln.dataset.to] || 0) > 0;
      ln.classList.toggle('on', a);
      ln.classList.toggle('full', a && b);
      ln.classList.toggle('unseen', !seen[ln.dataset.from] || !seen[ln.dataset.to]);
    });
    this.refreshStatAlloc();
  },

  learn(id) {
    const p = G.player, sk = SKILLS[id];
    if (p.skillPts <= 0) { this.toast(tr('특성 포인트가 없다'), 'bad'); return; }
    if ((p.skills[id] || 0) >= sk.max) { this.toast(tr('이미 최대 랭크다'), 'bad'); return; }
    const why = this.lockReason(id);
    if (why) { this.toast(why, 'bad'); return; }
    p.skillPts--; p.skills[id] = (p.skills[id] || 0) + 1;
    if (sk.type === 'active' && !p.slots.includes(id)) {
      const empty = p.slots.indexOf(null);
      if (empty >= 0) p.slots[empty] = id;
    }
    p.recalc();
    this.toast(tr('{sk} 습득 ({skills}/{max})', { sk: sk.n, skills: p.skills[id], max: sk.max }), 'good');
    G.sfx('learn');
    this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar(); this.refreshStatSheet();
    this.flashNode(id);
  },

  /** 습득 연출 — 찍은 칸이 한 번 부풀고, 그 칸에서 뻗어 나가는 선에 빛이 흐른다. */
  flashNode(id) {
    const el = $(`#tree-wrap .node[data-sk="${id}"]`);
    if (el) {
      el.classList.remove('just'); void el.offsetWidth; el.classList.add('just');
      setTimeout(() => el.classList.remove('just'), 900);
      // 칸 둘레로 튀는 불티 — 요소를 만들어 던지고 끝나면 지운다
      const box = el.querySelector('.nbox');
      for (let i = 0; i < 10; i++) {
        const sp = document.createElement('i');
        sp.className = 'nspark';
        const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 20;
        sp.style.setProperty('--dx', Math.cos(a) * d + 'px');
        sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
        sp.style.animationDelay = (Math.random() * 0.12) + 's';
        box.appendChild(sp);
        setTimeout(() => sp.remove(), 900);
      }
    }
    $$('#tree-wrap .bline').forEach(ln => {
      if (ln.dataset.from !== id && ln.dataset.to !== id) return;
      ln.classList.remove('flow'); void ln.getBoundingClientRect(); ln.classList.add('flow');
      setTimeout(() => ln.classList.remove('flow'), 900);
    });
  },

  assign(id) {
    const p = G.player, sk = SKILLS[id];
    if (sk.type !== 'active' || !(p.skills[id] > 0)) return;
    const cur = p.slots.indexOf(id);
    if (cur >= 0) { p.slots[cur] = null; }
    else { const e = p.slots.indexOf(null); p.slots[e >= 0 ? e : 0] = id; }
    this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar();
  },
  buildSkillSlots() {
    const box = $('#skill-slots'); box.innerHTML = '';
    const keys = ['Q', 'E', 'R', 'F'];
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'ss'; d.innerHTML = `<span class="key">${keys[i]}</span><span class="ic"></span>`;
      d.addEventListener('click', () => { G.player.slots[i] = null; this.refreshSkillSlots(); this.refreshTree(); this.refreshSkillbar(); });
      box.appendChild(d);
    }
  },
  refreshSkillSlots() {
    const p = G.player;
    $$('#skill-slots .ss').forEach((el, i) => {
      const id = p.slots[i];
      el.className = 'ss' + (id ? ' filled' : '');
      this.setIcon(el.querySelector('.ic'), id ? Art.skillUrl(id) : '');
    });
  },

  /* ---------------- 생활 숙련 ---------------- */
  buildProf() {
    const w = $('#prof-wrap'); if (!w) return;
    w.innerHTML = '';
    for (const k in PROFS) {
      const P = PROFS[k];
      const d = document.createElement('div');
      d.className = 'prof'; d.dataset.pf = k;
      d.style.setProperty('--pc', P.c);
      d.innerHTML =
        `<div class="phead"><span class="pic"></span>` +
        `<span class="pn">${P.n}</span><span class="plv">Lv 1</span></div>` +
        `<div class="pline">${P.line}</div>` +
        `<div class="pbar"><i></i></div><div class="pxp"></div>` +
        `<div class="plin"></div>` +
        `<div class="pperks"></div>`;
      d.querySelector('.pic').textContent = P.i;   // 그림 아이콘을 따로 굽지 않는다 — 이 둘뿐이라 글자로 충분하다
      w.appendChild(d);
    }
  },
  refreshProf() {
    const w = $('#prof-wrap'); if (!w) return;
    if (!w.firstChild) this.buildProf();
    const p = G.player;
    for (const k in PROFS) {
      const P = PROFS[k], el = w.querySelector(`.prof[data-pf="${k}"]`);
      if (!el) continue;
      const pr = (p.prof && p.prof[k]) || { lv: 1, xp: 0 };
      const capped = pr.lv >= PROF_MAX;
      const need = capped ? 1 : profNeed(pr.lv);
      el.querySelector('.plv').textContent = capped ? tr('Lv {profMax} · 끝', { profMax: PROF_MAX }) : `Lv ${pr.lv}`;
      el.querySelector('.pbar i').style.width = (capped ? 100 : Math.min(100, pr.xp / need * 100)) + '%';
      el.querySelector('.pxp').textContent = capped ? tr('더 오를 곳이 없다') : `${pr.xp} / ${need}`;
      el.querySelector('.plin').innerHTML = P.lin
        .map(([n, f]) => `<span class="pl"><b>${f(pr.lv)}</b>${n}</span>`).join('');
      el.querySelector('.pperks').innerHTML = P.perks.map(([at, n, dsc]) =>
        `<div class="perk${pr.lv >= at ? ' on' : ''}"><span class="pk">Lv ${at}</span>` +
        `<span class="pkn">${n}</span><span class="pkd">${dsc}</span></div>`).join('');
    }
  },
};
mixin(UI, TreeUIPart);
